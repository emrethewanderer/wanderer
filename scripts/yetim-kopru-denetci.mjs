#!/usr/bin/env node
/**
 * Wanderer AI — YETİM KÖPRÜ DENETÇİSİ
 * "Sessizce hiçbir şey yapmayan çağrı" sınıfının bekçisi.
 *
 * Modüller arası köprü bu repoda `window.*` üzerinden kurulur (§5.2 — TDZ
 * güvenli, minify dayanıklı). Köprünün bedeli şudur: çağıran taraf
 * `window.foo?.()` yazar ve karşı uç HİÇ expose edilmemişse optional chaining
 * hatayı yutar. Ne konsol kızarır, ne test kırılır — özellik yalnızca
 * sessizce yapılmaz.
 *
 * Bu sınıf 2026-08-07 denetiminde altı kez bulundu; ikisi ağırdı:
 *   · `window.getHesapGunuContext` / `window.getWellnessContradictionContext`
 *     hiç kurulmamıştı → LLM'e giden `hesap` ve `wellness` bağlamları HER
 *     ZAMAN boş gidiyordu (üstelik `commitment` kapısı da hiç kapanmıyordu).
 *   · `window.oikCardRefs` yoktu → Mesafe Motoru (13x) erdemleri boş
 *     listeden okuyordu.
 *
 * Kullanım:
 *   node scripts/yetim-kopru-denetci.mjs            → denetle (ihlalde exit 1)
 *   node scripts/yetim-kopru-denetci.mjs --liste    → listele, exit 0
 *   node scripts/yetim-kopru-denetci.mjs --dizin X  → başka bir kökü tara
 *
 * İKİNCİ SINIF (2026-08-19): köprü hiç kurulmamış, ad DOĞRUDAN çağrılmış —
 * `getUserFirstName()` gibi. Bare identifier olduğu için build sessizce geçer
 * (Rollup onu global sanar), çalışma anında ReferenceError fırlar; çağıranın
 * try/catch'i onu yutunca sonuç aynıdır: özellik sessizce yapılmaz. Altı vaka
 * bulundu, dördü canlı yolda — en ağırı `w3GenerateDeepSummary`'yi HER çağrıda
 * öldürüyordu (hiç gün özeti yazılmadı, Geçmiş Günler ebediyen boştu).
 *
 * SINIRI (dürüstçe): bu denetçi yalnız ADIN varlığını sorar, imzayı ya da
 * çağrı zamanını değil. `window.foo` doğru zamanda mı asılıyor (post-auth mı,
 * boot mu) sorusunu cevaplayamaz — onu ancak davranışsal doğrulama bulur.
 * İkinci sınıfta da kapsam dardır: yalnız BAŞKA modülde export edilmiş adları
 * sorar. Hiçbir yerde tanımlı olmayan bir uydurma ad (`foo()`) buradan geçer —
 * onu ancak testin kendisi ya da tarayıcı yakalar.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KOK = join(__dirname, '..');

const _dizinArg = process.argv.indexOf('--dizin');
const TARAMA_KOK = _dizinArg >= 0 && process.argv[_dizinArg + 1]
  ? process.argv[_dizinArg + 1]
  : join(KOK, 'js');

/* Tarayıcının kendi window API'leri — bunları biz expose etmeyiz.
   Liste eksikse denetçi yanlış alarm verir; fazlaysa gerçek bir yetimi
   susturur. Yeni bir ad eklerken sor: bunu tarayıcı mı veriyor, biz mi? */
const YERLESIK = new Set([
  'location', 'caches', 'navigator', 'document', 'console', 'localStorage',
  'sessionStorage', 'matchMedia', 'getComputedStyle', 'getSelection', 'focus', 'blur',
  'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout',
  'setInterval', 'clearInterval', 'addEventListener', 'removeEventListener',
  'dispatchEvent', 'scrollTo', 'scrollBy', 'open', 'close', 'print', 'alert',
  'confirm', 'prompt', 'fetch', 'crypto', 'performance', 'innerWidth', 'innerHeight',
  'scrollX', 'scrollY', 'devicePixelRatio', 'visualViewport', 'speechSynthesis',
  'SpeechRecognition', 'webkitSpeechRecognition', 'AudioContext', 'webkitAudioContext',
  'IntersectionObserver', 'ResizeObserver', 'MutationObserver', 'indexedDB',
  'IDBKeyRange', 'Notification', 'Image', 'Blob', 'URL', 'FileReader', 'FormData',
  'AbortController', 'CustomEvent', 'Event', 'DOMParser', 'XMLSerializer',
  'btoa', 'atob', 'structuredClone', 'queueMicrotask', 'reportError',
  'requestIdleCallback', 'cancelIdleCallback',
  // Dış kütüphaneler (sidecar ya da CDN ile gelir, bizim expose'umuz değil)
  'Capacitor', 'supabase', 'html2canvas', 'Chart', 'gtag', 'dataLayer', 'plausible',
]);

function jsDosyalari(kok) {
  const out = [];
  const gez = (d) => {
    for (const ad of readdirSync(d, { withFileTypes: true })) {
      const yol = join(d, ad.name);
      if (ad.isDirectory()) { if (ad.name !== 'node_modules') gez(yol); }
      else if (ad.name.endsWith('.js')) out.push(yol);
    }
  };
  if (existsSync(kok)) gez(kok);
  return out;
}

const dosyalar = jsDosyalari(TARAMA_KOK);

/* ── 1. Expose edilen adları topla ────────────────────────────────
   İki biçim de sayılır: doğrudan `window.foo = …` ve toplu
   `Object.assign(window, { … })` hub'ı (main.js'in dev listesi, 00f'nin tek
   satırlık bloğu). Süslü parantez sayarak kesilir — tek satırlık blokları
   `\n});` araması kaçırıyor ve o dosyanın TÜM expose'ları yetim görünüyordu. */
const expose = new Set();
for (const yol of dosyalar) {
  // Tarama yarışı: dosya listelendikten sonra silinmiş olabilir (vitest
  // paralel koşarken tasarim-kapisi T7 sınavı repo'ya geçici bir modül
  // yazıp siliyor). Var olmayan dosya repo'nun kalıcı parçası değildir.
  let src;
  try { src = readFileSync(yol, 'utf8'); } catch (e) { if (e && e.code === 'ENOENT') continue; throw e; }
  for (const m of src.matchAll(/window\.(\w+)\s*(?:=[^=]|\|\|=|\?\?=)/g)) expose.add(m[1]);
  for (const m of src.matchAll(/Object\.assign\(\s*window\s*,\s*\{/g)) {
    let derinlik = 1, j = m.index + m[0].length;
    while (j < src.length && derinlik > 0) {
      if (src[j] === '{') derinlik++;
      else if (src[j] === '}') derinlik--;
      j++;
    }
    for (const k of src.slice(m.index + m[0].length, j).matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
      expose.add(k[1]);
    }
  }
}

/* ── 2. Karşılıksız çağrıları topla ──────────────────────────────── */
const ihlaller = [];
for (const yol of dosyalar) {
  // Tarama yarışı: dosya listelendikten sonra silinmiş olabilir (vitest
  // paralel koşarken tasarim-kapisi T7 sınavı repo'ya geçici bir modül
  // yazıp siliyor). Var olmayan dosya repo'nun kalıcı parçası değildir.
  let src;
  try { src = readFileSync(yol, 'utf8'); } catch (e) { if (e && e.code === 'ENOENT') continue; throw e; }
  src.split('\n').forEach((satir, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(satir)) return;              // yorum satırı
    if (/YETIM-MUAF/.test(satir)) return;                       // beyan edilmiş istisna
    for (const m of satir.matchAll(/window\.(\w+)\s*(?:\?\.)?\(/g)) {
      const ad = m[1];
      if (YERLESIK.has(ad) || expose.has(ad)) continue;
      ihlaller.push({
        dosya: yol.replace(KOK + '/', ''),
        satir: i + 1,
        ad,
        metin: satir.trim().slice(0, 120),
      });
    }
  });
}

/* ── 3. İkinci sınıf: importsuz BARE çağrı ────────────────────────
   `getUserFirstName()` — ne import, ne yerel tanım, ne window köprüsü. Build
   geçer, runtime ReferenceError. Kapsam bilinçli olarak dardır: yalnız BAŞKA
   bir modülde `export` edilmiş adlar sorulur; böylece yorum metinleri, i18n
   dizeleri ve uydurma adlar gürültü yapmaz (ham regex taraması 360 şüpheli
   veriyordu, bu filtre 11'e indiriyor). */

/* Yorumları ve dizeleri düşür — "detectMessageTone(" geçen bir yorum ihlal
   değildir.

   TEMPLATE LITERAL'LER SİLİNMEZ (2026-08-19 ölçümü). Eskiden şu satır vardı:
       .replace(/`(?:\\.|\$\{[^}]*\}|[^`\\])*`/g, '``')
   `${...}` içinde iç içe süslü/backtick geçen her yerde yanlış eşleşiyor ve
   devasa blokları tek "dize" sanıyordu: 06-summary-chat'in %83'ü,
   11-w2-chat-cal'ın %84'ü denetçiye HİÇ görünmüyordu. Kaçırdığı gerçek
   yetimler bir turda üç taneydi — `applySessionPartDots` (her geçmiş seans
   açılışında ReferenceError) ve `getUserFirstName` (her kullanıcı mesajı
   çiziminde) canlı yollardaydı.
   Template içindeki `${foo()}` zaten GERÇEK bir çağrıdır; onu görmek
   denetçinin işidir. Silmemenin bedeli ölçüldü: repo genelinde tek bir ek
   şüpheli — o da gerçek bir yetim çıktı. */
function govde(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1 ')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

// Repo genelinde export edilen fonksiyon adları → tanımlandığı dosya
const exportlar = new Map();
for (const yol of dosyalar) {
  // Tarama yarışı: dosya listelendikten sonra silinmiş olabilir (vitest
  // paralel koşarken tasarim-kapisi T7 sınavı repo'ya geçici bir modül
  // yazıp siliyor). Var olmayan dosya repo'nun kalıcı parçası değildir.
  let k;
  try { k = govde(readFileSync(yol, 'utf8')); } catch (e) { if (e && e.code === 'ENOENT') continue; throw e; }
  for (const m of k.matchAll(/export\s+(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/g)) {
    if (!exportlar.has(m[1])) exportlar.set(m[1], yol);
  }
  for (const m of k.matchAll(/export\s+(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\(|function)/g)) {
    if (!exportlar.has(m[1])) exportlar.set(m[1], yol);
  }
}

const bareIhlaller = [];
for (const yol of dosyalar) {
  // Tarama yarışı: dosya listelendikten sonra silinmiş olabilir (vitest
  // paralel koşarken tasarim-kapisi T7 sınavı repo'ya geçici bir modül
  // yazıp siliyor). Var olmayan dosya repo'nun kalıcı parçası değildir.
  let ham;
  try { ham = readFileSync(yol, 'utf8'); } catch (e) { if (e && e.code === 'ENOENT') continue; throw e; }
  const k = govde(ham);
  /* Erişilebilir adlar HAM kaynaktan toplanır. Gövde temizliği yalnız
     KULLANIMI aramak içindir; tanımı yutarsa denetçi kendi tanımlı adını
     yetim sanar. Dizede geçen sahte bir "tanım" en fazla bir yetimi
     susturur — yanlış alarmın bedeli daha ağırdır. */

  /* Bu dosyada erişilebilir adlar: tanımlar, importlar, parametreler.
     Destructuring parametre `({ a, b })` biçiminde geldiği için süslü
     parantezler temizlenir — aksi halde `buildDeckData({ getAllArchetypeData })`
     deseni yanlış alarm verir (12b2'de bulundu). */
  const erisilebilir = new Set();
  for (const m of k.matchAll(/\b(?:function\s*\*?|class)\s+([A-Za-z_$][\w$]*)/g)) erisilebilir.add(m[1]);
  for (const m of k.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) erisilebilir.add(m[1]);
  for (const m of k.matchAll(/(?:const|let|var|import)\s*\{([^}]*)\}/g)) {
    for (const parca of m[1].split(',')) {
      const ad = parca.trim().split(/\s+as\s+|:/).pop().trim();
      if (/^[A-Za-z_$][\w$]*$/.test(ad)) erisilebilir.add(ad);
    }
  }
  for (const m of k.matchAll(/import\s+([A-Za-z_$][\w$]*)\s*(?:,|from)/g)) erisilebilir.add(m[1]);
  for (const m of k.matchAll(/\(([^()]*)\)\s*(?:=>|\{)/g)) {
    for (const parca of m[1].split(',')) {
      const ad = parca.replace(/[{}]/g, ' ').trim()
        .replace(/=.*$/, '').replace(/^\.\.\./, '').split(':').pop().trim();
      if (/^[A-Za-z_$][\w$]*$/.test(ad)) erisilebilir.add(ad);
    }
  }
  for (const m of k.matchAll(/([A-Za-z_$][\w$]*)\s*=>/g)) erisilebilir.add(m[1]);

  const gorulen = new Set();
  for (const m of k.matchAll(/(^|[^\w$.?])([a-zA-Z_$][\w$]*)\s*\(/gm)) {
    const ad = m[2];
    if (erisilebilir.has(ad) || gorulen.has(ad)) continue;
    if (!exportlar.has(ad) || exportlar.get(ad) === yol) continue;
    if (expose.has(ad)) continue;                    // window köprüsü var → 1. sınıfın işi
    const satirNo = k.slice(0, m.index).split('\n').length;
    const satirMetin = (ham.split('\n')[satirNo - 1] || '').trim();
    if (/YETIM-MUAF/.test(satirMetin)) continue;
    gorulen.add(ad);
    bareIhlaller.push({
      dosya: yol.replace(KOK + '/', ''),
      satir: satirNo,
      ad,
      tanim: exportlar.get(ad).replace(KOK + '/', ''),
      metin: satirMetin.slice(0, 120),
    });
  }
}

const liste = process.argv.includes('--liste');

if (!ihlaller.length && !bareIhlaller.length) {
  console.log(`✓ Yetim köprü yok — ${dosyalar.length} dosya, ${expose.size} expose adı, ${exportlar.size} export adı tarandı.`);
  process.exit(0);
}

if (ihlaller.length) console.log(`✗ ${ihlaller.length} karşılıksız window.* çağrısı:\n`);
const grup = {};
for (const b of ihlaller) (grup[b.ad] ||= []).push(b);
for (const [ad, lst] of Object.entries(grup).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`window.${ad}  — hiçbir yerde expose edilmiyor (${lst.length} çağrı)`);
  for (const b of lst) console.log(`   ${b.dosya}:${b.satir}  ${b.metin}`);
  console.log('');
}
if (ihlaller.length) {
  console.log('Çözüm: ya karşı ucu expose et (§5.2 window bloğu), ya çağrıyı kaldır,');
  console.log('ya da bilinçli istisnaysa satıra /* YETIM-MUAF: gerekçe */ yaz.\n');
}

if (bareIhlaller.length) {
  console.log(`✗ ${bareIhlaller.length} importsuz bare çağrı (runtime ReferenceError):\n`);
  for (const b of bareIhlaller) {
    console.log(`${b.ad}()  — ${b.dosya}:${b.satir}`);
    console.log(`   tanım: ${b.tanim} · ne import ne window köprüsü`);
    console.log(`   ${b.metin}`);
    console.log('');
  }
  console.log('Çözüm: adı import et (aynı dosyadaki mevcut import satırına ekle),');
  console.log('ya da §5.2 window köprüsü kur. Build bu hatayı YAKALAMAZ.');
}

if (!liste) process.exit(1);
