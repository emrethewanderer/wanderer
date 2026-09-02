// Supabase Edge Function: revenuecat-webhook (v2 — Fiyatlandırma "Kapılar ve Kilitler")
// Deploy: supabase functions deploy revenuecat-webhook --no-verify-jwt
//
// RevenueCat webhook'larını alır → profiles.is_premium / is_premium_plus /
// premium_until / lapsed_at / has_cancelled_before günceller.
// App Store + Google Play aboneliklerinin tek doğruluk kaynağı bu fonksiyondur;
// client satın alma sonrası iyimser açar, kalıcı durum buradan yazılır.
//
// Tier sözleşmesi (bkz. migrations/030_fiyatlandirma_v2.sql):
//   is_premium      = true → Pro VEYA Max (RC entitlement 'pro')
//   is_premium_plus = true → yalnız Max  (RC entitlement 'max' — Max ürünleri
//                            RevenueCat'te HEM 'pro' HEM 'max' entitlement'ına
//                            bağlanmalı, böylece Max'ta is_premium da true olur)
//
// Güvenlik: RevenueCat panelinde Authorization header değeri ayarlanır,
// buradaki REVENUECAT_WEBHOOK_SECRET ile birebir karşılaştırılır.
//   supabase secrets set REVENUECAT_WEBHOOK_SECRET="Bearer <uzun-rastgele-deger>"
//
// app_user_id = Supabase auth user id (client Purchases.configure'da set eder).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') || '';

// Aboneliği AÇAN / SÜRDÜREN event'ler
const ACTIVATE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
  'SUBSCRIPTION_EXTENDED',
  'PRODUCT_CHANGE',
]);

// Erişimi fiilen bitiren event. CANCELLATION = yalnız otomatik yenileme
// kapandı demektir, erişim dönem sonuna kadar sürer → ayrı ele alınır
// (has_cancelled_before işaretlenir ama is_premium dokunulmaz).
const DEACTIVATE_EVENTS = new Set(['EXPIRATION']);

// product_id → entitlement fallback'i (RC payload'ında entitlement_ids
// gelmezse — nadir — kullanılır). RC panelinde Max ürünleri HEM pro HEM
// max entitlement'ına bağlıysa event.entitlement_ids zaten ikisini de
// içerir ve bu tabloya hiç ihtiyaç kalmaz.
const MAX_PRODUCTS = new Set(['max_monthly', 'max_monthly_list', 'max_yearly']);
const PRO_PRODUCTS = new Set(['pro_monthly', 'pro_monthly_t', 'pro_monthly_list', 'pro_yearly']);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function resolveUserId(event: Record<string, unknown>): string | null {
  // app_user_id anonim olabilir ($RCAnonymousID:...) — aliases içinde gerçek
  // Supabase uid'i ara.
  const candidates: string[] = [];
  if (typeof event.app_user_id === 'string') candidates.push(event.app_user_id);
  if (Array.isArray(event.aliases)) {
    for (const a of event.aliases) if (typeof a === 'string') candidates.push(a);
  }
  return candidates.find((c) => UUID_RE.test(c)) || null;
}

// Bu event'in hangi entitlement'ları etkilediğini çöz: önce RC'nin kendi
// entitlement_ids alanı, yoksa product_id eşlemesine düş.
function resolveEntitlements(event: Record<string, unknown>): { hasPro: boolean; hasMax: boolean } {
  const ids = Array.isArray(event.entitlement_ids) ? event.entitlement_ids : null;
  if (ids && ids.length) {
    const hasMax = ids.includes('max');
    const hasPro = hasMax || ids.includes('pro');
    return { hasPro, hasMax };
  }
  const productId = String(event.product_id || '');
  const hasMax = MAX_PRODUCTS.has(productId);
  const hasPro = hasMax || PRO_PRODUCTS.has(productId);
  return { hasPro, hasMax };
}

/* Sabit zamanlı karşılaştırma — `===` ilk farklı bayta gelince döner ve
   sızdırdığı süre farkı sırrı bayt bayt tahmin etmeye yarayabilir.
   İkizi bulten-cikis/index.ts:61'dedir; aynı işi iki yerde ayrı yazmak
   yerine aynı kalıp kullanıldı. */
function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // ── Secret doğrulama ──
  const auth = req.headers.get('Authorization') || '';
  if (!WEBHOOK_SECRET || (!safeEq(auth, WEBHOOK_SECRET) && !safeEq(auth, `Bearer ${WEBHOOK_SECRET}`))) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  const event = (body?.event ?? {}) as Record<string, unknown>;
  const type = String(event.type || '');
  const store = String(event.store || '');           // APP_STORE | PLAY_STORE | ...
  const environment = String(event.environment || ''); // SANDBOX | PRODUCTION
  const userId = resolveUserId(event);

  const db = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Audit kaydı — kullanıcı çözülemese bile logla (debug için)
  try {
    await db.from('billing_events').insert({
      user_id: userId,
      event_type: type,
      store,
      environment,
      payload: event,
    });
  } catch (e) {
    console.error('billing_events insert hatası:', e);
  }

  if (!userId) {
    // Anonim/eşleşmeyen kullanıcı — RC tekrar denemesin diye 200 dön
    console.warn('revenuecat-webhook: kullanıcı çözülemedi, event:', type);
    return new Response(JSON.stringify({ ok: true, skipped: 'no_user' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const expirationMs = Number(event.expiration_at_ms || 0);
  const premiumUntil = expirationMs ? new Date(expirationMs).toISOString() : null;
  const platform = store === 'APP_STORE' ? 'ios' : store === 'PLAY_STORE' ? 'android' : store.toLowerCase();

  let update: Record<string, unknown> | null = null;

  if (ACTIVATE_EVENTS.has(type)) {
    const { hasPro, hasMax } = resolveEntitlements(event);
    const productId = String(event.product_id || '');
    update = {
      is_premium: hasPro,
      is_premium_plus: hasMax,
      premium_until: premiumUntil,
      store_platform: platform,
      lapsed_at: null, // aktifleşti — Kapı Aralık artık uygulanmaz
    };
    // Giriş teklifi kullanıldı damgası — yalnız burada (service_role) yazılabilir;
    // profiles hardening trigger'ı (017/030) client'ın bu alanı değiştirmesini engeller.
    if (productId === 'pro_monthly') update.has_used_offer_a = true;
    if (productId === 'pro_monthly_t') update.has_used_offer_b = true;
  } else if (type === 'CANCELLATION') {
    // Otomatik yenileme kapandı — erişim dönem sonuna (premium_until) kadar
    // sürer, is_premium'a DOKUNULMAZ. Yalnız "bu hesap en az bir kez ayrıldı"
    // damgası kalıcı basılır (Sadakat Kilidi'nin geri dönüşünde giriş
    // tekliflerinin bir daha gösterilmemesini sağlar — bkz. plan md.5 kural 3).
    update = { has_cancelled_before: true };
  } else if (DEACTIVATE_EVENTS.has(type)) {
    // Erişim fiilen bitti — Kapı Aralık (30 gün) sayacı burada başlar.
    update = {
      is_premium: false,
      is_premium_plus: false,
      premium_until: premiumUntil,
      lapsed_at: new Date().toISOString(),
      has_cancelled_before: true,
    };
  } else if (type === 'TRANSFER') {
    // Abonelik başka hesaba taşındı — transferred_from'daki uid'leri kapat
    const from = Array.isArray(event.transferred_from) ? event.transferred_from : [];
    for (const old of from) {
      if (typeof old === 'string' && UUID_RE.test(old)) {
        await db.from('profiles').update({
          is_premium: false,
          is_premium_plus: false,
          lapsed_at: new Date().toISOString(),
        }).eq('id', old);
      }
    }
    const { hasPro, hasMax } = resolveEntitlements(event);
    update = {
      is_premium: hasPro,
      is_premium_plus: hasMax,
      premium_until: premiumUntil,
      store_platform: platform,
      lapsed_at: null,
    };
  }
  // BILLING_ISSUE / TEST → no-op (erişim premium_until'a kadar sürer;
  // dunning bildirimi ayrı bir push akışının işi — bkz. SETUP-STORE-BILLING.md)

  if (update) {
    const { error } = await db.from('profiles').update(update).eq('id', userId);
    if (error) {
      console.error('profiles update hatası:', error.message);
      // 500 dön → RevenueCat tekrar dener
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, handled: !!update }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
