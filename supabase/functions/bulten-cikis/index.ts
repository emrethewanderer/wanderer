// Supabase Edge Function: bulten-cikis
// Deploy: supabase functions deploy bulten-cikis --no-verify-jwt
//
// Çıkış (K6) — OTURUMSUZ, İKİ YÜZEY. Her postanın dibindeki bağ:
//
//   <SUPABASE_URL>/functions/v1/bulten-cikis?u=<user_id>&s=<hmac>
//
// s = HMAC-SHA256(user_id, BULTEN_CIKIS_SECRET). Kullanıcı e-postayı açtığı
// cihazda uygulamaya giriş yapmış olmayabilir — oturum, JWT, giriş İSTEMEZ.
// İmza yalnız bağın uydurulmasını engeller: rastgele bir user_id ile
// buraya gelen biri, secret'ı bilmediği için doğru s üretemez.
//
// Yazan taraf yalnız bu fonksiyondur (service_role) — profiles UPDATE'i
// bulten_rizasi_muhru() trigger'ının "client" dalını (047 §1.1) HİÇ
// tetiklemez: service_role bu triggerdan muaftır, o yüzden anı BURADA,
// edge fonksiyonunun kendi now()'ıyla yazılır (istemcinin saati değil).
//
// Yanıt: obsidyen zeminli, document.css (doc-*) diliyle tek sayfa HTML —
// harici CSS/font yükleyemez (self-contained <style>), Ton Rehberi'nin
// çıkış metniyle: "Çıktın." / "Bir daha bülten göndermeyeceğiz. İstediğin
// an ayarlardan geri dönebilirsin."
//
// İmza tutmazsa REDDEDİLİR — geçersiz/eksik parametrede de aynı nötr
// hata sayfası döner (hesap var mı yok mu sızdırılmaz).
//
// ── NEDEN İKİ YÜZEY (GET onaylar, POST uygular) ───────────────────────────
// İlk tasarım GET'te doğrudan çıkarıyordu. Kırık: kurumsal e-posta güvenlik
// tarayıcıları (Microsoft Safe Links, Barracuda…) gelen postadaki her bağı
// KULLANICI TIKLAMADAN GET ile açar — yani abone, haberi bile olmadan
// listeden düşerdi. Bu yüzden:
//   GET  → onay sayfası (tek düğme, POST eder). Tarayıcı botu buraya
//          uğrasa da hiçbir şey değişmez.
//   POST → çıkışı uygular. İki çağıran var: onay sayfasının düğmesi ve
//          RFC 8058 (List-Unsubscribe-Post) ile e-posta uygulamasının
//          KENDİ "abonelikten çık" düğmesi — o gerçekten tek tıktır.
// RFC 8058 başlığı ayrıca teslimat için de şarttır: Gmail ve Yahoo toplu
// gönderenlerden tek-tık çıkışı ZORUNLU tutar; yoksa postalar spam'e düşer.
// Başlıkları eposta-gonder basar, bu uç onları karşılar.
//
// Env: BULTEN_CIKIS_SECRET · SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE        = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BULTEN_CIKIS_SECRET = Deno.env.get('BULTEN_CIKIS_SECRET') || '';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

/* ─── HMAC — eposta-gonder'daki ikizi ─── */
async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Sabit-zamanlı karşılaştırma — imza kontrolünü zamanlama saldırısına açmaz. */
function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function sayfa(baslik: string, govde: string, status = 200): Response {
  const html = `<!doctype html>
<html lang="tr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${baslik} · Wanderer</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: #0F0C08; padding: 32px 20px;
    font-family: 'EB Garamond', Georgia, serif;
  }
  .card {
    max-width: 460px; width: 100%; text-align: center;
    background: #16110C; border: 1px solid #281F16; border-radius: 16px;
    padding: 44px 32px;
  }
  .eyebrow {
    font-family: 'Barlow', sans-serif; font-size: 11px; letter-spacing: 0.28em;
    text-transform: uppercase; color: #C9A66B; margin-bottom: 18px;
  }
  h1 {
    font-family: 'Fraunces', 'EB Garamond', Georgia, serif; font-weight: 500;
    font-size: 26px; color: #EAE2D6; margin: 0 0 14px;
  }
  .govde { font-size: 15px; line-height: 1.7; color: #95897A; }
  /* Onay düğmesi — altın=eylem (TASARIM-PRENSIPLERI §1). Sayfa harici CSS
     yükleyemediği için doc-* primitifleri buraya elle taşınır. */
  .dc-btn {
    display: inline-block; width: 100%; padding: 16px 22px; cursor: pointer;
    background: #C9A66B; color: #14100B; border: none; border-radius: 10px;
    font-family: 'Barlow', sans-serif; font-size: 11px; font-weight: 600;
    letter-spacing: 0.22em; text-transform: uppercase;
  }
  .dc-btn:hover, .dc-btn:focus-visible { background: #D9B87C; }
</style>
</head><body>
  <div class="card">
    <div class="eyebrow">Wanderer</div>
    <h1>${baslik}</h1>
    <div class="govde">${govde}</div>
  </div>
</body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

const GECERSIZ = ['Bu bağ geçerli değil.', 'İstediğin an ayarlardan bülten tercihini değiştirebilirsin.'] as const;

/* Onay sayfası: tek düğme, POST eder. Bağ ve imza gizli alanlarda taşınır. */
function onaySayfasi(u: string, s: string): Response {
  return sayfa(
    'Bültenden çıkmak üzeresin.',
    `Aşağıdaki düğmeye bas, bir daha bülten göndermeyelim. Giriş kodun ve hesap bildirimlerin gelmeye devam eder.
     <form method="POST" style="margin-top:26px;">
       <input type="hidden" name="u" value="${u.replace(/"/g, '&quot;')}">
       <input type="hidden" name="s" value="${s.replace(/"/g, '&quot;')}">
       <button type="submit" class="dc-btn">Bültenden çık</button>
     </form>`,
  );
}

/** İmzayı doğrula; geçerliyse user_id döner, değilse null. */
async function kimlikCoz(u: string, s: string): Promise<string | null> {
  if (!u || !s || !BULTEN_CIKIS_SECRET) return null;
  const beklenen = await hmacHex(BULTEN_CIKIS_SECRET, u);
  return safeEq(beklenen, s.toLowerCase()) ? u : null;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const u = url.searchParams.get('u') || '';
    const s = url.searchParams.get('s') || '';
    // Onay sayfası imzayı ÖNCE doğrular: geçersiz bağ için boş bir form
    // göstermenin anlamı yok.
    const uid = await kimlikCoz(u, s);
    if (!uid) return sayfa(GECERSIZ[0], GECERSIZ[1], 400);
    return onaySayfasi(u, s);
  }

  if (req.method !== 'POST') {
    return sayfa(GECERSIZ[0], GECERSIZ[1], 405);
  }

  // POST iki yerden gelir: onay sayfasının formu (gövdede) ve RFC 8058'in
  // tek-tık çıkışı (e-posta uygulaması sorgu dizesindeki bağı POST'lar,
  // gövdesi `List-Unsubscribe=One-Click`tir). İkisini de karşılarız.
  let u = url.searchParams.get('u') || '';
  let s = url.searchParams.get('s') || '';
  if (!u || !s) {
    try {
      const form = await req.formData();
      u = String(form.get('u') || '');
      s = String(form.get('s') || '');
    } catch (_) { /* gövde form değil — sorgu dizesi zaten denendi */ }
  }

  const uid = await kimlikCoz(u, s);
  if (!uid) return sayfa(GECERSIZ[0], GECERSIZ[1], 400);

  // İmza doğru — çıkışı damgala. Kaç satır etkilendiğine bakılmaz: bağ iki
  // kez kullanılsa da aynı nötr başarı sayfası döner (idempotent).
  try {
    await admin.from('profiles').update({
      bulten_cikis_at: new Date().toISOString(),
      bulten_cikis_kaynak: 'tek_tik',
    }).eq('id', uid);
  } catch (e) {
    console.warn('bulten-cikis update:', e instanceof Error ? e.message : String(e));
  }

  return sayfa('Çıktın.', 'Bir daha bülten göndermeyeceğiz. İstediğin an ayarlardan geri dönebilirsin.');
});
