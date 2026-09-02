// Supabase Edge Function: eposta-sekme
// Deploy: supabase functions deploy eposta-sekme --no-verify-jwt
//
// Resend webhook ucu — Sekme Kalkanı'nın (K9) yazan tarafı. 2026-08-27'da
// uydurma adreslere gönderilen üç kod postası hard bounce'a düşünce
// Supabase "Email Sending Privileges at risk" uyarısı gönderdi; bu
// fonksiyon o günün dersidir: TESLİM EDİLEBİLİRLİK rızadan (bulten_izin)
// AYRI bir olgudur ve burada, sağlayıcının kendi ölçümünden yazılır.
//
// Doğrulama: Resend'in svix imza başlıkları (svix-id · svix-timestamp ·
// svix-signature) RESEND_WEBHOOK_SECRET (biçim: whsec_<base64>) ile
// HMAC-SHA256'dan geçirilir — Svix imzalama şeması:
//   imzalanan = "{svix-id}.{svix-timestamp}.{ham gövde}"
//   beklenen  = base64(HMAC-SHA256(base64decode(secret), imzalanan))
// svix-signature birden çok "v1,<imza>" değeri taşıyabilir (anahtar
// rotasyonu) — herhangi biri eşleşirse geçerlidir. İMZASIZ/HATALI İSTEK
// REDDEDİLİR (aksi hâlde herkes istediği adresi listeden düşürebilir).
// Zaman damgası 5 dakikadan eskiyse de reddedilir (replay'e karşı).
//
// Olay eşlemesi:
//   email.bounced    → tip 'hard' (kalıcı) / 'soft' (geçici)
//   email.complained → tip 'sikayet' — bulten_cikis_at da damgalanır
//   email.delivered  → gönderim satırı 'gonderildi' olarak mühürlenir
//
// Soft bounce KALKAN DEĞİLDİR (K9 madde 3) — geçicidir. email_sekme_tip
// yazılır ama email_sekme_at yalnız ÜÇÜNCÜ soft sekmede damgalanır (tek
// dolu kutu yüzünden aboneyi kaybetmeyiz). Hard/soft ayrımını saklayacak
// ayrı bir kolon eposta_gonderimleri'nde yok — bu faz migration'a
// dokunmuyor (Değişen: listesi dışı) — bu yüzden alt-tip o satırın `hata`
// metninde "soft: …" / "hard: …" öneki olarak taşınır; soft sayacı bu
// önekle eşleşen önceki satırları sayar. Emre'ye Duraklar'da bildirildi.
//
// Env: RESEND_WEBHOOK_SECRET · SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE          = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET') || '';

const SOFT_ESIK = 3;            // üçüncü soft sekmede kalkan iner
const ZAMAN_TOLERANS_SN = 300;  // 5 dk — replay penceresi

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/* ─── 1. SVIX İMZA DOĞRULAMA ─── */

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
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

async function svixDogrula(id: string, timestamp: string, signatureHeader: string, gövde: string): Promise<boolean> {
  if (!RESEND_WEBHOOK_SECRET || !id || !timestamp || !signatureHeader) return false;

  // Zaman toleransı — çok eski/gelecek bir istek reddedilir.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > ZAMAN_TOLERANS_SN) return false;

  const secretB64 = RESEND_WEBHOOK_SECRET.startsWith('whsec_')
    ? RESEND_WEBHOOK_SECRET.slice('whsec_'.length)
    : RESEND_WEBHOOK_SECRET;
  let keyBytes: Uint8Array;
  try { keyBytes = b64ToBytes(secretB64); } catch (_) { return false; }

  const imzalanan = `${id}.${timestamp}.${gövde}`;
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(imzalanan));
  const beklenen = bytesToB64(new Uint8Array(sigBuf));

  // "v1,<b64>" biçiminde bir ya da birden çok değer (boşlukla ayrılmış).
  const adaylar = signatureHeader.split(' ').map(s => s.split(',')[1]).filter(Boolean);
  return adaylar.some(a => safeEq(a, beklenen));
}

/* ─── 2. OLAY YARDIMCILARI ─── */

/** Resend'in bounce alt-tipini best-effort okur — dokümantasyona göre alan
 *  adı değişebilir, bu yüzden birkaç olası yol denenir; hiçbiri net değilse
 *  güvenli varsayılan 'soft' (kalıcı olmayan, ikinci şansı olan taraf). */
function bounceTipi(data: Record<string, unknown>): 'hard' | 'soft' {
  const aday = String(
    (data?.bounce as Record<string, unknown> | undefined)?.bounce_type
    ?? (data?.bounce as Record<string, unknown> | undefined)?.type
    ?? data?.bounce_type
    ?? data?.type
    ?? '',
  ).toLowerCase();
  if (aday.includes('hard') || aday.includes('permanent')) return 'hard';
  return 'soft';
}

function bounceDetay(data: Record<string, unknown>): string {
  const b = data?.bounce as Record<string, unknown> | undefined;
  return String(b?.message ?? b?.diagnostic ?? data?.reason ?? '').slice(0, 300) || 'detay yok';
}

/* ─── 3. TEK GİRİŞ ─── */

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const gövde = await req.text();
  const id = req.headers.get('svix-id') || '';
  const timestamp = req.headers.get('svix-timestamp') || '';
  const signature = req.headers.get('svix-signature') || '';

  const gecerli = await svixDogrula(id, timestamp, signature, gövde);
  if (!gecerli) {
    console.warn('eposta-sekme: imza doğrulanamadı');
    return json({ error: 'invalid_signature' }, 401);
  }

  let event: Record<string, unknown>;
  try { event = JSON.parse(gövde); } catch (_) { return json({ error: 'bad_json' }, 400); }

  const type = String(event.type || '');
  const data = (event.data || {}) as Record<string, unknown>;
  const emailId = String(data.email_id || data.id || '');
  if (!emailId) return json({ ok: true, skipped: 'no_email_id' });

  // Gönderim satırını sağlayıcı kimliğinden bul — 047'nin
  // idx_eposta_gonderim_saglayici indeksi bunun için var.
  const { data: satir } = await admin.from('eposta_gonderimleri')
    .select('id, user_id, email, durum').eq('saglayici_id', emailId).maybeSingle();
  if (!satir) {
    console.warn('eposta-sekme: gönderim satırı bulunamadı, email_id=', emailId);
    return json({ ok: true, skipped: 'row_not_found' });
  }

  if (type === 'email.delivered') {
    // Damga zaten gönderim anında yazılmıştı (§6.10); burada yalnız
    // teslim onayını mühürleriz — sekmişse (webhook sırası ters gelirse)
    // dokunmayız.
    if (satir.durum !== 'sekti') {
      await admin.from('eposta_gonderimleri')
        .update({ durum: 'gonderildi' }).eq('id', satir.id);
    }
    return json({ ok: true, handled: 'delivered' });
  }

  if (type === 'email.complained') {
    await admin.from('eposta_gonderimleri')
      .update({ durum: 'sekti', hata: 'sikayet' }).eq('id', satir.id);
    await admin.from('profiles').update({
      email_sekme_at: new Date().toISOString(),
      email_sekme_tip: 'sikayet',
      email_sekme_sebep: 'spam şikayeti (Resend webhook)',
      bulten_cikis_at: new Date().toISOString(),
      bulten_cikis_kaynak: 'sikayet_webhook',
    }).eq('id', satir.user_id);
    return json({ ok: true, handled: 'complained' });
  }

  if (type === 'email.bounced') {
    const tip = bounceTipi(data);
    const detay = bounceDetay(data);
    await admin.from('eposta_gonderimleri')
      .update({ durum: 'sekti', hata: `${tip}: ${detay}` }).eq('id', satir.id);

    if (tip === 'hard') {
      await admin.from('profiles').update({
        email_sekme_at: new Date().toISOString(),
        email_sekme_tip: 'hard',
        email_sekme_sebep: detay,
      }).eq('id', satir.user_id);
      return json({ ok: true, handled: 'bounced_hard' });
    }

    // Soft — kalıcı değil. Üçüncü sekmeye kadar kalkan inmez.
    const { count } = await admin.from('eposta_gonderimleri')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', satir.user_id).eq('durum', 'sekti').like('hata', 'soft:%');
    const soft_sayisi = (count || 0); // bu satır dahil (yukarıda zaten 'sekti' olarak yazıldı)
    const update: Record<string, unknown> = { email_sekme_tip: 'soft' };
    if (soft_sayisi >= SOFT_ESIK) {
      update.email_sekme_at = new Date().toISOString();
      update.email_sekme_sebep = `${soft_sayisi}. soft bounce`;
    }
    await admin.from('profiles').update(update).eq('id', satir.user_id);
    return json({ ok: true, handled: 'bounced_soft', soft_sayisi });
  }

  // Tanınmayan olay tipi — sessizce kabul (Resend'in tekrar denemesine gerek yok).
  return json({ ok: true, skipped: type || 'unknown_type' });
});
