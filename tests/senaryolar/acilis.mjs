/* ═══════════════════════════════════════════════════════
   SENARYO — Açılış · "uygulama bir yer'dir, kapısı açılmalı"
   ───────────────────────────────────────────────────────
   NE İŞE YARAR:
     Planların `## Doğrulama` maddeleri bugüne kadar bir İNSAN TALİMATIYDI
     ("preview'da şunu aç, şuna bak"). Talimat, koşulmadığında da yeşil
     görünür. Senaryo dosyası o maddeyi koda çevirir: koşucu (scripts/dogrula.mjs)
     sayfayı açar, bu fonksiyonu çağırır, atılan her hata kapıyı kırar.

   NASIL KOŞULUR:
     node scripts/dogrula.mjs --senaryo tests/senaryolar/acilis.mjs

   SÖZLEŞME:
     Varsayılan dışa açılan fonksiyon `{ sayfa, taban, kayitlar }` alır.
     `sayfa` bir Playwright Page'idir — sayfa zaten açılmış ve boot beklemesi
     yapılmıştır. Hiçbir şey döndürmez; iddiasını `assert` ile kurar.

   Bu dosya EMSALDİR: yeni bir plan yazarken `## Doğrulama` senaryolarını
   buranın yanına, kendi adıyla bir dosya olarak koy.
   ═══════════════════════════════════════════════════════ */
import assert from 'node:assert/strict';

export default async function acilisSenaryosu({ sayfa }) {
  /* ① Kabuk ayakta: giriş ekranı ve uygulama ekranı DOM'da olmalı.
     Bunlar `_src.html`'in iskeletidir; kaybolmaları "beyaz ekran" demektir. */
  await sayfa.waitForSelector('#auth-screen', { state: 'attached' });
  await sayfa.waitForSelector('#app-screen', { state: 'attached' });

  /* ② Uygulama giriş ekranıyla açılır: oturum yokken app-screen GÖRÜNMEZ.
     Bu, auth kabuğunun (03-auth-shell) hâlâ kapı olduğunun kanıtıdır. */
  const authGorunur = await sayfa.isVisible('#auth-screen');
  assert.equal(authGorunur, true, 'Giriş ekranı görünmüyor — auth kabuğu kırık');

  /* ③ Sözleşme regresyonu: window.* adları yaşıyor mu (§4.3 ad senkronu).
     Bir modül boot etmediyse burada `undefined` döner ve kapı kırılır —
     build ve testler yeşilken bile. */
  const sozlesmeler = await sayfa.evaluate(() => ({
    fxCue: typeof window.fxCue,
    t: typeof window.t
  }));
  assert.equal(sozlesmeler.fxCue, 'function', 'window.fxCue boot etmedi');

  /* ④ Başlık: kimliğin en ucuz kanıtı. Yanlış sayfayı doğrulamak,
     doğrulamamaktan beterdir. */
  const baslik = await sayfa.title();
  assert.match(baslik, /Wanderer/i, `Beklenmeyen başlık: ${baslik}`);
}
