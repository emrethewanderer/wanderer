// Supabase Edge Function: eposta-gonder
// Deploy: supabase functions deploy eposta-gonder
//
// Posta motorunun TEK giriş kapısı — üç modu var, üçü de aynı defteri
// (eposta_gonderimleri) kullanır:
//
//   mod: 'kampanya' → bir bülten sayısını (eposta_kampanyalari) hak eden
//                      alıcılara kuyruklar ve gönderir
//   mod: 'akis'     → otomatik akışların (eposta_akislari) hak edenlerini
//                      bulur ve gönderir; anahtar verilmezse TÜM aktif
//                      akışlar işlenir
//   mod: 'sinama'   → tek adrese deneme gönderimi (admin önizlemesi);
//                      deftere YAZMAZ — UNIQUE kısıtı kirlenmesin
//
// send-user-letter'ın Resend deseni yeniden kullanılır: aynı
// RESEND_API_KEY / RESEND_FROM secret'ları, aynı CORS + json() yardımcısı.
// Şablon burada document.css (doc-*) estetiğinde — kampanya/akış e-postaları
// kullanıcı mektubunun sıcak/krem tonundan değil, Wanderer'ın obsidyen +
// sessiz altın diliyle çıkar (Anayasa §6.6).
//
// GERÇEKLİK KURALI (§6.10) burada da geçerli: durum='gonderildi' damgasını
// ÜRETİCİ değil TESLİM EDEN basar — yalnız Resend 200 döndüğünde yazılır.
// RESEND_API_KEY yoksa fonksiyon HATA döner ama alıcıları yine de
// 'kuyrukta' olarak deftere yazar (kuyruk gerçek niyeti taşır) — secret
// tanımlandığında bir sonraki koşu kaldığı yerden gönderir.
//
// Alıcı sorgusunun ÜÇ koşulu (047'nin idx_profiles_bulten_alici'siyle
// birebir aynı): email IS NOT NULL AND bulten_izin = true AND
// email_sekme_at IS NULL. Üçüncüsü unutulursa Sekme Kalkanı (K9) yoktur.
//
// Akış hak edişi (mod:'akis') — anahtar admin'den EKLENEMEZ, tetikleyicisi
// burada kodda yaşar (K7):
//   hos_geldin — tanışma tamamlandıktan N saat sonra. Tanışma tamamlanma
//     anının kendi kolonu yok; ama rıza (bulten_izin_at) TAM O ANDA,
//     aynı yazımda kaydedilir (FAZ 3 · K4) — güvenilir, trigger'ın
//     sunucuda damgaladığı bir zaman damgası. Yeni kolon eklemeden
//     mevcut olanı yeniden kullanmak §1.3'ün kuralı.
//   geri_cagri — N gün sessizlikten sonra. Sessizlik ölçümü zaten
//     user_engagement.last_active_date'te var (send-push'ın okuduğu
//     aynı tablo) — 13o'nun e-posta ayağı yeni bir "kim sessiz" motoru
//     yazmaz, onu okur.
//
// Env (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY        (yoksa: enqueue olur, gönderim HATA döner)
//   RESEND_FROM            vars. "Wanderer <postaci@wanderer.app>"
//   BULTEN_CIKIS_SECRET    tek-tık çıkış bağının HMAC anahtarı (K6)
//   ALLOWED_ORIGIN          vars. *
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY otomatik mevcut.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE         = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY') || '';
const RESEND_FROM          = Deno.env.get('RESEND_FROM') || 'Wanderer <postaci@wanderer.app>';
const LIST_UNSUB_MAILTO = Deno.env.get('LIST_UNSUB_MAILTO') || 'bulten-cikis@wanderer.app';
const BULTEN_CIKIS_SECRET  = Deno.env.get('BULTEN_CIKIS_SECRET') || '';
const ALLOWED_ORIGIN       = Deno.env.get('ALLOWED_ORIGIN') || '*';

const CIKIS_URL_BASE = `${SUPABASE_URL}/functions/v1/bulten-cikis`;

// Resend'in batch ucu 100 alıcı/çağrı kabul eder.
const RESEND_BATCH_SIZE = 100;
// Tek koşuda işlenecek üst sınır — bugünkü ölçekte (K9: "Daha aktif
// kullanıcı yok") yeterli; büyürse burası sayfalamaya döner.
const ALICI_LIMIT = 5000;

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

/* ─── 1. YARDIMCILAR ─── */

function escapeHTML(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Düz metni paragraflara böler — eposta_kampanyalari.govde'nin biçimi
 *  (boş satır = yeni paragraf), 000'ın diğer edge fonksiyonlarındaki
 *  bodyToHtml deseniyle aynı mantık. */
function govdeParagraflari(govde: string): string {
  return govde
    .split(/\n{2,}/)
    .map(par => `<p style="margin:0 0 1.3em;font-family:'EB Garamond',Georgia,serif;font-size:15px;line-height:1.75;color:#EAE2D6;">${escapeHTML(par.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** HMAC-SHA256 hex — bulten-cikis'in doğrulayacağı aynı imza. Fonksiyon
 *  ikiz dosyada tekrarlanır (edge fonksiyonları bu repoda kendi içine
 *  kapalı yazılır — send-user-letter deseni), _shared'e taşımak bu
 *  fazın kapsamı dışında. */
async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Obsidyen zeminli, document.css (doc-*) diline sadık e-posta gövdesi.
 *  Web fontları e-posta istemcilerinde çoğu zaman süzülür — bu yüzden
 *  font-family zincirleri her zaman Georgia/serif'e düşer; renk paleti
 *  base.css'in ham hex değerleridir (CSS değişkeni e-postada çalışmaz). */
/** Çıkış bağı TEK yerden üretilir: gövdedeki bağ ile List-Unsubscribe
 *  başlığındaki bağ AYNI olmak zorundadır — ikisi ayrışırsa e-posta
 *  uygulamasının tek-tık düğmesi başka bir imzayla gelir ve reddedilir. */
async function cikisBagiUret(userId: string | null): Promise<string | null> {
  if (!userId || !BULTEN_CIKIS_SECRET) return null;
  return `${CIKIS_URL_BASE}?u=${encodeURIComponent(userId)}&s=${await hmacHex(BULTEN_CIKIS_SECRET, userId)}`;
}

async function wnEmailHtml(opts: { konu: string; govde: string; userId: string | null }): Promise<string> {
  const cikisLink = await cikisBagiUret(opts.userId);
  return `
    <div style="background:#0F0C08;padding:32px 16px;font-family:'EB Garamond',Georgia,serif;">
      <div style="max-width:560px;margin:0 auto;">
        <div style="font-family:'Barlow',sans-serif;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#C9A66B;margin-bottom:14px;">Wanderer</div>
        <div style="background:#16110C;border:1px solid #281F16;border-radius:14px;padding:32px 28px;">
          <h1 style="margin:0 0 20px;font-family:'Fraunces','EB Garamond',Georgia,serif;font-weight:500;font-size:22px;line-height:1.3;color:#EAE2D6;">${escapeHTML(opts.konu)}</h1>
          ${govdeParagraflari(opts.govde)}
        </div>
        <div style="text-align:center;margin-top:22px;font-family:'Barlow',sans-serif;font-size:11px;color:#585349;line-height:1.7;">
          Bu mektup sana geldi çünkü eşikte adresini bıraktın.
          ${cikisLink ? `<br><a href="${cikisLink}" style="color:#C9A66B;text-decoration:none;">Bültenden çık</a>` : ''}
        </div>
      </div>
    </div>`;
}

type BatchItem = { to: string; subject: string; html: string; cikisBagi?: string };

/* ─── RFC 8058 · tek-tık abonelikten çıkış başlıkları ───
   İki sebeple ZORUNLU, ikisi de bu turda öğrenildi:
   1) TESLİMAT — Gmail ve Yahoo, toplu gönderenlerden tek-tık çıkışı şart
      koşar. Başlıksız gönderen spam klasörüne düşer. Sekme uyarısı almış
      bir hesap için bu, kalan itibarı da harcamak demektir.
   2) ŞİKÂYET — çıkış kolay olmazsa kullanıcı "spam bildir"e basar; şikâyet
      hard bounce'tan da ağır bir sinyaldir (eposta-sekme onu 'sikayet'
      olarak damgalar ve aboneyi kalıcı olarak listeden düşürür).
   Karşılayan uç bulten-cikis'in POST yüzeyidir. mailto YEDEĞİ değil ikinci
   kanaldır: bazı istemciler yalnız onu okur. */
function cikisBasliklari(cikisBagi?: string): Record<string, string> | undefined {
  if (!cikisBagi) return undefined;
  return {
    'List-Unsubscribe': `<${cikisBagi}>, <mailto:${LIST_UNSUB_MAILTO}?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
type BatchResult = { ok: true; ids: (string | null)[] } | { ok: false; error: string };

/** Resend batch ucu — 100'e kadar alıcıyı tek çağrıda gönderir. */
async function sendResendBatch(items: BatchItem[]): Promise<BatchResult> {
  if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY yok' };
  try {
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(items.map(it => {
        const gonderim: Record<string, unknown> = {
          from: RESEND_FROM, to: [it.to], subject: it.subject, html: it.html,
        };
        const h = cikisBasliklari(it.cikisBagi);
        if (h) gonderim.headers = h;
        return gonderim;
      })),
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `resend ${res.status}: ${t.slice(0, 300)}` };
    }
    const j = await res.json().catch(() => null);
    const data = Array.isArray(j?.data) ? j.data : null;
    const ids = items.map((_, i) => (data && data[i]?.id) ? String(data[i].id) : null);
    return { ok: true, ids };
  } catch (e) {
    return { ok: false, error: 'resend network: ' + (e instanceof Error ? e.message : String(e)) };
  }
}

/** Tek adrese deneme gönderimi (sinama modu) — deftere yazmaz. */
async function sendResendSingle(to: string, konu: string, html: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!RESEND_API_KEY) return { ok: false, error: 'RESEND_API_KEY yok' };
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM, to: [to], subject: konu, html }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `resend ${res.status}: ${t.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'resend network: ' + (e instanceof Error ? e.message : String(e)) };
  }
}

/* ─── 2. KUYRUK İŞLEME (kampanya ve akış ortak) ───────────────────────
   Bir kolon-değer çiftini (kampanya_id=X ya da akis_anahtar=X) alır,
   durum IN ('kuyrukta','hata') satırlarını okur (kesintiden dönen de
   buraya düşer), Resend batch'iyle gönderir, her satırı teslim
   durumuna göre mühürler. */

type KuyrukSonuc = { kuyruklanan: number; gonderildi: number; hata: number };

async function kuyrugu_isle(kolon: 'kampanya_id' | 'akis_anahtar', deger: number | string, konu: string, govde: string): Promise<KuyrukSonuc> {
  const { data: rows, error } = await admin
    .from('eposta_gonderimleri')
    .select('id, user_id, email')
    .eq(kolon, deger)
    .in('durum', ['kuyrukta', 'hata'])
    .limit(ALICI_LIMIT);
  if (error || !rows) return { kuyruklanan: 0, gonderildi: 0, hata: 0 };

  // Secret yoksa hiç denemeyiz — satırlar oldukları durumda ('kuyrukta' ya
  // da önceki 'hata') kalır. Config eksikliği yüzünden 'kuyrukta' satırları
  // 'hata'ya çevirmek yanıltıcı olurdu: sorun teslimatta değil, kurulumda.
  if (!RESEND_API_KEY) return { kuyruklanan: rows.length, gonderildi: 0, hata: 0 };

  let gonderildi = 0, hataSayisi = 0;
  for (let i = 0; i < rows.length; i += RESEND_BATCH_SIZE) {
    const chunk = rows.slice(i, i + RESEND_BATCH_SIZE);
    const items: BatchItem[] = [];
    for (const r of chunk) {
      items.push({
        to: r.email,
        subject: konu,
        html: await wnEmailHtml({ konu, govde, userId: r.user_id }),
        cikisBagi: (await cikisBagiUret(r.user_id)) || undefined,
      });
    }
    const sonuc = await sendResendBatch(items);
    const now = new Date().toISOString();
    if (!sonuc.ok) {
      // Damgayı üretici basmaz — Resend 200 dönmedi, satır 'hata' kalır ve
      // bir sonraki koşuda yeniden denenir (§6.10).
      hataSayisi += chunk.length;
      await Promise.all(chunk.map(r =>
        admin.from('eposta_gonderimleri').update({ durum: 'hata', hata: sonuc.error }).eq('id', r.id)
      ));
      continue;
    }
    await Promise.all(chunk.map((r, j) => {
      const id = sonuc.ids[j];
      if (id) {
        gonderildi++;
        return admin.from('eposta_gonderimleri')
          .update({ durum: 'gonderildi', saglayici_id: id, sent_at: now, hata: null })
          .eq('id', r.id);
      }
      hataSayisi++;
      return admin.from('eposta_gonderimleri')
        .update({ durum: 'hata', hata: 'resend batch: id dönmedi' })
        .eq('id', r.id);
    }));
  }
  return { kuyruklanan: rows.length, gonderildi, hata: hataSayisi };
}

/* ─── 3. ALICI SEÇİMİ ─── */

/** 047'nin idx_profiles_bulten_alici indeksiyle birebir aynı üç koşul +
 *  kampanyanın hedef filtresi. */
async function aliciAdaylari(hedef: 'tumu' | 'studio' | 'ucretsiz') {
  let q = admin.from('profiles').select('id, email, is_premium')
    .not('email', 'is', null)
    .eq('bulten_izin', true)
    .is('email_sekme_at', null)
    .limit(ALICI_LIMIT);
  if (hedef === 'studio') q = q.eq('is_premium', true);
  if (hedef === 'ucretsiz') q = q.eq('is_premium', false);
  const { data, error } = await q;
  return { data: data || [], error };
}

/** Bir akış anahtarı için hak eden YENİ alıcılar. Anahtar kod dışından
 *  eklenemez (K7) — her dal burada elle tanımlıdır. */
async function akisHakEdenler(anahtar: string, gecikmeSaat: number) {
  const kesim = new Date(Date.now() - gecikmeSaat * 3600_000).toISOString();

  if (anahtar === 'hos_geldin') {
    // Tanışma tamamlanma anının kendi kolonu yok; rıza (bulten_izin_at)
    // FAZ 3'te AYNI yazımda, sunucu tarafından damgalanır — güvenilir bir
    // "tanışma tamamlandı" vekili (bkz. dosya başı yorum).
    const { data, error } = await admin.from('profiles')
      .select('id, email, is_premium')
      .not('email', 'is', null)
      .eq('bulten_izin', true)
      .is('email_sekme_at', null)
      .not('bulten_izin_at', 'is', null)
      .lte('bulten_izin_at', kesim)
      .limit(ALICI_LIMIT);
    return { data: data || [], error };
  }

  if (anahtar === 'geri_cagri') {
    // Sessizlik ölçümü zaten user_engagement'ta (send-push'ın okuduğu
    // aynı tablo) — yeni bir "kim sessiz" motoru yazılmaz (K7).
    const kesimGun = new Date(Date.now() - gecikmeSaat * 3600_000).toISOString().slice(0, 10);
    const { data: sessizler, error: e1 } = await admin.from('user_engagement')
      .select('user_id, last_active_date')
      .not('last_active_date', 'is', null)
      .lte('last_active_date', kesimGun)
      .limit(ALICI_LIMIT);
    if (e1 || !sessizler?.length) return { data: [], error: e1 };
    const ids = sessizler.map(s => s.user_id);
    // .in() tek çağrıda binlerce UUID'yi URL'e gömerdi — 200'lük
    // parçalara bölünür (bugünkü ölçekte tek parça yeter, ama sessiz
    // biçimde URL sınırına çarpmamak için hazır).
    const sonuclar: { id: string; email: string; is_premium: boolean }[] = [];
    for (let i = 0; i < ids.length; i += 200) {
      const parca = ids.slice(i, i + 200);
      const { data, error } = await admin.from('profiles')
        .select('id, email, is_premium')
        .in('id', parca)
        .not('email', 'is', null)
        .eq('bulten_izin', true)
        .is('email_sekme_at', null);
      if (error) return { data: sonuclar, error };
      if (data) sonuclar.push(...data);
    }
    return { data: sonuclar, error: null };
  }

  // Bilinmeyen anahtar — kodda tanımlı değil, sessizce atlanır (asla bloklama).
  return { data: [], error: null };
}

/* ─── 4. KAYIT EDİLMEMİŞ ALICILARI KUYRUKLA ─── */

async function yeniAlicilariKuyrukla(
  kolon: 'kampanya_id' | 'akis_anahtar',
  deger: number | string,
  adaylar: { id: string; email: string }[],
) {
  if (!adaylar.length) return;
  const { data: mevcut } = await admin.from('eposta_gonderimleri')
    .select('user_id').eq(kolon, deger).limit(ALICI_LIMIT);
  const zatenVar = new Set((mevcut || []).map(r => r.user_id));
  const yeni = adaylar.filter(a => !zatenVar.has(a.id));
  if (!yeni.length) return;
  const rows = yeni.map(a => ({
    [kolon]: deger,
    user_id: a.id,
    email: a.email,
    durum: 'kuyrukta',
  }));
  // Çakışma HATA sayılmaz, atlanır — UNIQUE kısıt zaten çifte gönderimi
  // şemada engelliyor (K5). Toplu insert'te bir satır çakışırsa tekil
  // denemeye düşülür ki geri kalanlar kaybolmasın.
  const { error } = await admin.from('eposta_gonderimleri').insert(rows);
  if (error) {
    for (const r of rows) {
      await admin.from('eposta_gonderimleri').insert(r).then(({ error: e2 }) => {
        if (e2 && !/duplicate|unique/i.test(e2.message)) {
          console.warn('eposta-gonder kuyruklama:', e2.message);
        }
      });
    }
  }
}

/* ─── 5. TEK GİRİŞ ─── */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  // ── Admin JWT kapısı ──
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'unauthorized' }, 401);
  const { data: { user }, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !user) return json({ error: 'invalid_token' }, 401);
  const { data: prof } = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!prof?.is_admin) return json({ error: 'admin_required' }, 403);

  let payload: Record<string, unknown> = {};
  try { payload = await req.json(); } catch (_) { /* */ }
  const mod = String(payload.mod || '');

  /* ── mod: sinama — deftere yazmaz ── */
  if (mod === 'sinama') {
    // Sınama DAİMA çağıranın KENDİ adresine gider — istemcinin gönderdiği
    // hedef_email yok sayılır. İstemci zaten böyle davranıyor (13C
    // pstSinamaGonder: serbest metin alanı yok); sunucu da aynı şeyi
    // söylemeli, yoksa sözleşme yalnız arayüzde durur ve elle atılan bir
    // çağrı onu delebilirdi. Sekme uyarısı almış bir hesapta uydurma bir
    // adrese giden tek bir sınama postası bile pahalıdır ([[sekme-kalkani]]).
    const hedefEmail = String(user.email || '').trim();
    if (!hedefEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hedefEmail)) {
      return json({ error: 'gecersiz_email', message: 'Oturumun e-posta adresi yok — sınama gönderilemez.' }, 400);
    }
    let konu = String(payload.konu || '').trim();
    let govde = String(payload.govde || '').trim();
    if (!konu || !govde) {
      if (payload.kampanya_id) {
        const { data: k } = await admin.from('eposta_kampanyalari')
          .select('konu, govde').eq('id', payload.kampanya_id).maybeSingle();
        if (k) { konu = konu || k.konu; govde = govde || k.govde; }
      } else if (payload.akis_anahtar) {
        const { data: a } = await admin.from('eposta_akislari')
          .select('konu, govde').eq('anahtar', payload.akis_anahtar).maybeSingle();
        if (a) { konu = konu || a.konu; govde = govde || a.govde; }
      }
    }
    if (!konu || !govde) return json({ error: 'icerik_yok', message: 'Konu ve gövde boş — kampanya_id/akis_anahtar ya da konu+govde ver.' }, 400);
    const html = await wnEmailHtml({ konu, govde, userId: null }); // sinama e-postasında çıkış bağı yok — deftere hiç girmeyen kişiye çıkış anlamsız
    const sonuc = await sendResendSingle(hedefEmail, `[SINAMA] ${konu}`, html);
    if (!sonuc.ok) return json({ ok: false, mod: 'sinama', error: sonuc.error }, 502);
    return json({ ok: true, mod: 'sinama', gonderildi: true });
  }

  /* ── mod: kampanya ── */
  if (mod === 'kampanya') {
    const kampanyaId = payload.kampanya_id;
    if (!kampanyaId) return json({ error: 'kampanya_id_gerekli' }, 400);
    const { data: kampanya, error: kErr } = await admin.from('eposta_kampanyalari')
      .select('*').eq('id', kampanyaId).maybeSingle();
    if (kErr) return json({ error: 'db', message: kErr.message }, 500);
    if (!kampanya) return json({ error: 'bulunamadi' }, 404);
    if (kampanya.durum === 'gonderildi') {
      return json({ ok: true, mod: 'kampanya', kampanya_id: kampanyaId, already_sent: true, message: 'Bu kampanya zaten gönderildi.' });
    }

    const { data: adaylar, error: aErr } = await aliciAdaylari(kampanya.hedef);
    if (aErr) return json({ error: 'db', message: aErr.message }, 500);
    await yeniAlicilariKuyrukla('kampanya_id', kampanyaId as number, adaylar);

    await admin.from('eposta_kampanyalari').update({
      durum: 'gonderiliyor',
      gonderim_basladi_at: kampanya.gonderim_basladi_at || new Date().toISOString(),
    }).eq('id', kampanyaId);

    const sonuc = await kuyrugu_isle('kampanya_id', kampanyaId as number, kampanya.konu, kampanya.govde);

    // Kuyrukta/hata kalan satır yoksa kampanya tamamlanmıştır.
    const { count: kalanCount } = await admin.from('eposta_gonderimleri')
      .select('id', { count: 'exact', head: true })
      .eq('kampanya_id', kampanyaId).in('durum', ['kuyrukta', 'hata']);
    if ((kalanCount || 0) === 0) {
      const { count: gonderilenCount } = await admin.from('eposta_gonderimleri')
        .select('id', { count: 'exact', head: true }).eq('kampanya_id', kampanyaId).eq('durum', 'gonderildi');
      await admin.from('eposta_kampanyalari').update({
        durum: 'gonderildi',
        gonderim_bitti_at: new Date().toISOString(),
        alici_sayisi: gonderilenCount || 0,
      }).eq('id', kampanyaId);
    }

    if (!RESEND_API_KEY) {
      return json({ ok: false, mod: 'kampanya', kampanya_id: kampanyaId, error: 'RESEND_API_KEY yok', ...sonuc }, 503);
    }
    return json({ ok: true, mod: 'kampanya', kampanya_id: kampanyaId, ...sonuc });
  }

  /* ── mod: akis ── */
  if (mod === 'akis') {
    const anahtarIstenen = payload.anahtar ? String(payload.anahtar) : null;
    let q = admin.from('eposta_akislari').select('*').eq('aktif', true);
    if (anahtarIstenen) q = admin.from('eposta_akislari').select('*').eq('anahtar', anahtarIstenen);
    const { data: akislar, error: akErr } = await q;
    if (akErr) return json({ error: 'db', message: akErr.message }, 500);
    if (!akislar || !akislar.length) {
      return json({ ok: true, mod: 'akis', sonuclar: [] });
    }

    const sonuclar: Record<string, unknown>[] = [];
    for (const akis of akislar) {
      if (!akis.aktif) {
        sonuclar.push({ anahtar: akis.anahtar, atlandi: true, sebep: 'pasif' });
        continue;
      }
      if (!akis.govde || !akis.govde.trim() || !akis.konu || !akis.konu.trim()) {
        sonuclar.push({ anahtar: akis.anahtar, atlandi: true, sebep: 'metin_bos' });
        continue;
      }
      const { data: adaylar, error: aErr } = await akisHakEdenler(akis.anahtar, akis.gecikme_saat);
      if (aErr) {
        sonuclar.push({ anahtar: akis.anahtar, atlandi: true, sebep: 'db_hata: ' + aErr.message });
        continue;
      }
      await yeniAlicilariKuyrukla('akis_anahtar', akis.anahtar, adaylar);
      const sonuc = await kuyrugu_isle('akis_anahtar', akis.anahtar, akis.konu, akis.govde);
      sonuclar.push({ anahtar: akis.anahtar, ...sonuc });
    }

    if (!RESEND_API_KEY) {
      return json({ ok: false, mod: 'akis', error: 'RESEND_API_KEY yok', sonuclar }, 503);
    }
    return json({ ok: true, mod: 'akis', sonuclar });
  }

  return json({ error: 'gecersiz_mod' }, 400);
});
