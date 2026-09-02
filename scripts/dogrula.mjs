#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════
   DOĞRULAMA TARAYICISI — Playwright · "gözün yerine geçen kapı"
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Bu repoda bir fazın kapanma cümlesi "Konsol temiz."dir (PROTOKOL §3.3).
     O cümle bir tören değil, bir KANIT iddiasıdır: build yeşil ve testler
     yeşilken bile uygulama ekranda kırık olabilir — asıl kırıklar
     davranışsaldır. Cümleyi söyleyebilmek için birinin sayfayı gerçekten
     açması, DOM'a gerçekten bakması, konsolu gerçekten okuması gerekir.

     O iş 2026-09-02'ye kadar `preview_start` aracıyla yapılıyordu ve o araç
     lokal makinede vardı, uzak oturumda YOKTU. Kapı da ortamla birlikte
     kayboluyordu: §10.4 "preview bu oturumda yok, sınanamadı" demeyi meşru
     kılıyordu ve meşru bir atlama, tekrarlandıkça bir alışkanlığa dönüşür.
     Ölçüldü: kapısı olmayan kural zamanla tavsiyeye döner (§6.6).

     Bu koşucu o boşluğu kapatır. Tarayıcıyı araca değil REPOYA bağlar:
     Playwright her iki ortamda da kurulur, her iki ortamda da aynı cümleyi
     kanıtlar. Artık "preview yok" bir gerekçe değildir.

   MEKANİK / MİMARİ / TEK GİRİŞ:
     preview sunucusu (scripts/preview-server.mjs) → Chromium (Playwright)
     → sayfa açılır, konsol/pageerror/başarısız istek toplanır → isteğe bağlı
     canlı DOM/state sorgusu (--eval) ve senaryo dosyası (--senaryo) koşar
     → rapor basılır; İHLAL varsa exit 1.

     Sunucu TEK ORIGIN kuralına sadıktır: :3030 ayaktaysa ONA BAĞLANIR, yeni
     port açmaz; değilse aynı sunucuyu süreç içinde kurar ve koşu bitince
     kapatır. Önbellek kapalıdır (no-store, ETag/Last-Modified yok), `/sw.js`
     kill-switch'tir — yani "diskte doğru, ekranda eski" sınıfı burada da
     imkânsızdır.

     Üç kova ayrımı bu koşucunun omurgasıdır ve dürüstlük için vardır:
       İHLAL     → kapıyı kırar (pageerror, console.error, 4xx/5xx, kırık
                   istek — hepsi kendi origin'imizden)
       DIŞ ORIGIN→ kırmaz ama SAYILIR ve raporda adı geçer (Supabase, CDN:
                   uzak oturumda dış ağ proxy arkasındadır; onun sessizliğini
                   uygulamanın kırığı saymak kapıyı gürültüye boğar,
                   sessizce yutmak ise sahte yeşil üretir — ortası: göster)
       GÜRÜLTÜ   → geri kalan: bilinen dar desenler (bkz. GURULTU) ve ağır
                   sayılmayan türler (log/info/debug/verbose). `warning` bu
                   kovada DEĞİLDİR — bu repoda uyarı bir hata kanalıdır

   Kalıcılık: yok — koşucu durum yazmaz, yalnız okur ve rapor eder.
   Konvansiyon: Türkçe CLI; saf yardımcılar dışa açık (kapı:
                tests/dogrulama-tarayicisi.test.js)
   ═══════════════════════════════════════════════════════

   Kullanım:
     node scripts/dogrula.mjs                          → / açılır, konsol kapısı
     node scripts/dogrula.mjs --yol /kart-test.html    → başka sayfa (tekrarlanır)
     node scripts/dogrula.mjs --eval "typeof window.fxCue"   → canlı sözleşme sorgusu
     node scripts/dogrula.mjs --senaryo tests/senaryolar/x.mjs
     node scripts/dogrula.mjs --ss /tmp/kare.png       → ekran görüntüsü
     node scripts/dogrula.mjs --kok dist --port 3031   → build çıktısını sına
     node scripts/dogrula.mjs --gevsek                 → uyarıları gürültüye indirir
     node scripts/dogrula.mjs --json                   → makine okunur rapor
     npm run dogrula                                    → aynısı (varsayılan)
*/
import { chromium } from 'playwright-core';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { previewSunucusuKur } from './preview-server.mjs';

const REPO_KOKU = path.resolve(import.meta.dirname, '..');

/* ─── 1. ARGÜMAN AYRIŞTIRMA ─── */

export const VARSAYILAN = {
  port: 3030,
  kok: '.',
  yollar: ['/'],
  evaller: [],
  senaryolar: [],
  izinler: [],
  bekle: null,      // CSS seçici
  sure: 1500,       // boot/animasyon için ek bekleme (ms)
  zamanAsimi: 30000,
  ss: null,
  gevsek: false,   // --gevsek: uyarıları gürültüye indirir (bkz. kovaSec)
  json: false,
  sw: false         // gerçek sw.js servis edilsin mi (varsayılan: kill-switch)
};

/**
 * Argümanları ayrıştırır. Saf fonksiyon — kapısı testtedir.
 * Tekrarlanabilirler (`--yol`, `--eval`, `--senaryo`, `--izin`) diziye biner;
 * ilk `--yol` varsayılan `/`yi EZER (yoksa her koşu ana sayfayı da açardı).
 */
export function argAyristir(argv = []) {
  const s = { ...VARSAYILAN, yollar: [], evaller: [], senaryolar: [], izinler: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const deger = () => argv[++i];
    switch (a) {
      case '--port': s.port = Number(deger()); break;
      case '--kok': s.kok = deger(); break;
      case '--yol': s.yollar.push(deger()); break;
      case '--eval': s.evaller.push(deger()); break;
      case '--senaryo': s.senaryolar.push(deger()); break;
      case '--izin': s.izinler.push(deger()); break;
      case '--bekle': s.bekle = deger(); break;
      case '--sure': s.sure = Number(deger()); break;
      case '--zaman-asimi': s.zamanAsimi = Number(deger()); break;
      case '--ss': s.ss = deger(); break;
      case '--gevsek': s.gevsek = true; break;
      case '--json': s.json = true; break;
      case '--sw': s.sw = true; break;
      default: break; // bilinmeyen bayrak sessizce düşer — koşuyu durdurmaz
    }
  }
  if (!s.yollar.length) s.yollar = [...VARSAYILAN.yollar];
  return s;
}

/* ─── 2. CHROMIUM ÇÖZÜMÜ ─── */

/**
 * Tarayıcı ikilisi ortamdan ortama başka yerde durur ve `playwright-core`
 * indirme yapmaz — yolu BİZ veririz. Zincir bilinçli sıradadır: elle verilen
 * yol → uzak oturumun hazır Chromium'u → sistemin kendi tarayıcısı.
 *
 * `varMi` enjekte edilebilir çünkü bu zincirin kapısı testtedir: gerçek diske
 * bağlı bir sıra iddiası, CI'da başka türlü doğrulanamaz.
 */
export const CHROMIUM_ADAYLARI = [
  // Uzak oturum (Claude Code on the web): PLAYWRIGHT_BROWSERS_PATH altında hazır.
  '/opt/pw-browsers/chromium',
  // GitHub Actions ubuntu-latest imajı: Chrome ve Chromium kurulu gelir.
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  // macOS (Emre'nin lokal makinesi)
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium'
];

export function chromiumYoluCoz({ env = {}, varMi = existsSync, dizinListe = null } = {}) {
  if (env.WANDERER_CHROMIUM && varMi(env.WANDERER_CHROMIUM)) return env.WANDERER_CHROMIUM;
  for (const aday of CHROMIUM_ADAYLARI) if (varMi(aday)) return aday;

  // Son çare: PLAYWRIGHT_BROWSERS_PATH altındaki sürümlü dizinler
  // (chromium-1194/chrome-linux/chrome). Sürüm numarasını sabitlemeyiz —
  // Playwright her yükseltmede değiştirir, sabitlenen yol sessizce ölür.
  const taban = env.PLAYWRIGHT_BROWSERS_PATH;
  if (taban && varMi(taban)) {
    let girdiler = [];
    try { girdiler = (dizinListe || readdirSync)(taban); } catch (_) { girdiler = []; }
    for (const g of girdiler.filter((x) => String(x).startsWith('chromium')).sort().reverse()) {
      const y = path.join(taban, String(g), 'chrome-linux', 'chrome');
      if (varMi(y)) return y;
    }
  }
  return null;
}

/* ─── 3. ÜÇ KOVA: İHLAL / DIŞ ORIGIN / GÜRÜLTÜ ─── */

/**
 * Bilinen zararsızlar. Liste DAR tutulur ve her desen gerekçesini yanında
 * taşır: geniş bir gürültü listesi, kapıyı kapatmanın kibar yoludur.
 */
export const GURULTU = [
  // Tarayıcı favicon'u kendiliğinden ister; uygulamada yoksa 404 basar.
  { desen: /favicon\.ico/, neden: 'tarayıcının kendi isteği' },
  // DevTools protokolünün kendi gürültüsü — sayfanın kodundan gelmez.
  { desen: /Autofill\.(enable|setAddresses)/, neden: 'CDP iç mesajı' },
  // Preview sunucusunun kill-switch SW'si kendini söker; sökülme sırasında
  // tarayıcı bir kez "worker unregistered" gürültüsü basabilir.
  { desen: /ServiceWorker.*unregister/i, neden: 'preview kill-switch beklenen davranışı' },
  // Kullanıcı jesti politikası: Chrome, sayfaya dokunulmadan yapılan
  // `navigator.vibrate`/autoplay çağrısını bloke eder ve konsola error basar.
  // Koşucu tıklamaz — bu mesaj OTOMATİK bir doğrulamada kaçınılmazdır ve
  // uygulamanın kırığı değil tarayıcının politikasıdır. Desen bilerek dardır:
  // yalnız "jest yok" hâlini yutar, gerçek bir titreşim/ses hatasını değil.
  // (Harness taramasında ölçüldü, 2026-09-02: `13e-his-motoru.js` boot'ta
  // titreşim deniyor; savunmacı çağrı zaten sessizce düşüyor.)
  { desen: /Blocked call to navigator\.vibrate|hasn't tapped on the frame/, neden: 'kullanıcı jesti politikası — otomatik koşuda kaçınılmaz' }
];

/** Kendi origin'imiz mi? Dış origin'in sessizliği ihlal sayılmaz (bkz. banner). */
export function kendiOrigin(metin, taban) {
  if (!metin) return true;                     // origin okunamıyorsa sayfanın kendisi sayılır
  if (!/https?:\/\//.test(metin)) return true; // URL taşımayan mesaj sayfanın kendi konsolu
  return metin.includes(taban);
}

/**
 * Tek bir kaydı kovasına yerleştirir.
 * kayit: { tur, metin, url }  ·  tur: 'error' | 'warning' | 'pageerror' | 'istek' | 'yanit' | 'log' …
 */
export function kovaSec(kayit, { taban = 'localhost', izinler = [], gevsek = false } = {}) {
  const metin = `${kayit.metin || ''} ${kayit.url || ''}`;
  for (const g of GURULTU) if (g.desen.test(metin)) return 'gurultu';
  for (const kalip of izinler) {
    try { if (new RegExp(kalip).test(metin)) return 'gurultu'; } catch (_) {}
  }
  if (!kendiOrigin(kayit.url || metin, taban)) return 'dis';

  // `warning` VARSAYILAN OLARAK İHLALDİR. Sebep bu repoya özgüdür: §5.2'nin
  // savunmacı stili yakalanan hatayı `catch (e) { console.warn('fxSave:', …) }`
  // ile loglar — `js/` altında 305 gerçek kullanım. Uyarıyı yutan bir kapı,
  // uygulamanın kendi hata kanalını kör eder: build ve süit yeşilken sessizce
  // düşen bir Supabase kaydı tam olarak oraya yazılır. (Ölçüldü, 2026-09-02:
  // ilk harness taramasında `kumComposeFromText: sb.auth.getSession is not a
  // function` bu kanaldan çıktı ve koşucunun ilk hâli onu yutuyordu.)
  const agir = kayit.tur === 'pageerror' || kayit.tur === 'error'
    || kayit.tur === 'istek' || kayit.tur === 'yanit'
    || (kayit.tur === 'warning' && !gevsek);
  return agir ? 'ihlal' : 'gurultu';
}

export function kovala(kayitlar, secenekler) {
  const kova = { ihlal: [], dis: [], gurultu: [] };
  for (const k of kayitlar) kova[kovaSec(k, secenekler)].push(k);
  return kova;
}

/* ─── 4. RAPOR ─── */

export function raporYaz(kova, { json = false, hata = null } = {}) {
  // Gürültü kovası JSON'da TAM listelenir. Yutulan şey denetlenemiyorsa,
  // filtre bir kapı değil bir perdedir: kovanın içi her zaman açılabilir olmalı.
  if (json) return JSON.stringify({
    ihlal: kova.ihlal, dis: kova.dis,
    gurultu: kova.gurultu, gurultuSayisi: kova.gurultu.length,
    hata: hata ? (hata.message || String(hata)) : null,
    temiz: !hata && kova.ihlal.length === 0
  }, null, 2);

  const satirlar = [];
  if (kova.ihlal.length) {
    satirlar.push(`İHLAL (${kova.ihlal.length}) — konsol TEMİZ DEĞİL:`);
    for (const k of kova.ihlal) satirlar.push(`  ✗ [${k.tur}] ${k.metin}${k.url ? '  ← ' + k.url : ''}`);
  } else if (hata) {
    // "Konsol temiz." bu repoda bir fazın kapanma cümlesidir (§3.3). Koşunun
    // kendisi çöktüyse konsolun temizliği bir şey KANITLAMAZ — cümle basılmaz.
    satirlar.push('Konsol kaydında ihlal yok — ama koşu tamamlanmadı, bu bir doğrulama DEĞİLDİR.');
  } else {
    satirlar.push('Konsol temiz.');
  }
  if (kova.dis.length) {
    satirlar.push(`Dış origin (${kova.dis.length}) — kapıyı kırmaz, ortamın kendisidir:`);
    for (const k of [...new Set(kova.dis.map((k) => k.url || k.metin))].slice(0, 6)) {
      satirlar.push(`  · ${k}`);
    }
  }
  if (kova.gurultu.length) {
    // Yalnız sayı basmak, kovanın içini CI logunda görünmez kılıyordu: bir
    // regresyonun hangi kanala düştüğü ancak `--json` ile görülebiliyordu.
    // Tür dağılımı ucuz ve yeterli bir denetlenebilirliktir.
    const dagilim = kova.gurultu.reduce((a, k) => (a[k.tur] = (a[k.tur] || 0) + 1, a), {});
    const ozet = Object.entries(dagilim).map(([t, n]) => `${t}×${n}`).join(' · ');
    satirlar.push(`Gürültü: ${kova.gurultu.length} kayıt (${ozet}) — tamamı için --json`);
  }
  return satirlar.join('\n');
}

/* ─── 5. SUNUCU: TEK ORIGIN ─── */

/**
 * :PORT ayaktaysa ONA BAĞLANIR — yeni port açmak bu repoda yasaktır
 * (§3.3: 22 girdilik launch.json ve 5176–5194 port aralığı böyle doğdu).
 * Değilse aynı sunucuyu süreç içinde kurar; `kapat` çağrısı bizimkini kapatır,
 * dışarıdakine dokunmaz.
 */
export async function sunucuHazirla({ port, kok, sw }) {
  const taban = `http://127.0.0.1:${port}`;
  try {
    const y = await fetch(taban + '/', { method: 'HEAD' });
    if (y.ok || y.status === 404) return { taban, kapat: async () => {}, disarida: true };
  } catch (_) { /* ayakta değil — biz kuracağız */ }

  const sunucu = previewSunucusuKur({
    kok: path.resolve(REPO_KOKU, kok), swGercek: sw, sessiz: true
  });
  await new Promise((coz, red) => {
    sunucu.once('error', red);
    sunucu.listen(port, '127.0.0.1', coz);
  });
  return {
    taban,
    disarida: false,
    kapat: async () => {
      sunucu.closeAllConnections?.();
      await new Promise((r) => sunucu.close(r));
    }
  };
}

/* ─── 6. KOŞU ─── */

export async function dogrula(secenekler = {}) {
  const s = { ...VARSAYILAN, ...secenekler };
  const exe = chromiumYoluCoz({ env: process.env });
  if (!exe) {
    // Sahte başarı yasak (§6.2): tarayıcı yoksa "doğruladım" denmez, ortam
    // adlandırılır ve kapı KIRMIZI kapanır — atlanmış bir kapı yeşil olamaz.
    throw new Error(
      'Chromium bulunamadı. Ya WANDERER_CHROMIUM=<yol> ver, ya da kur:\n' +
      '  npx playwright install chromium   (veya sistem Chrome/Chromium)'
    );
  }

  const sunucu = await sunucuHazirla(s);
  const tarayici = await chromium.launch({
    executablePath: exe,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  const kayitlar = [];
  const evalSonuclari = [];
  const senaryoSonuclari = [];
  let hata = null;

  try {
    const baglam = await tarayici.newContext({ viewport: { width: 430, height: 932 } });
    baglam.setDefaultTimeout(s.zamanAsimi);
    const sayfa = await baglam.newPage();

    sayfa.on('console', (m) => kayitlar.push({
      tur: m.type(), metin: m.text(), url: m.location()?.url || ''
    }));
    sayfa.on('pageerror', (e) => kayitlar.push({
      tur: 'pageerror', metin: (e && e.message) || String(e), url: sayfa.url()
    }));
    sayfa.on('requestfailed', (r) => kayitlar.push({
      tur: 'istek', metin: `istek düştü: ${r.failure()?.errorText || 'bilinmiyor'}`, url: r.url()
    }));
    sayfa.on('response', (r) => {
      if (r.status() >= 400) kayitlar.push({ tur: 'yanit', metin: `HTTP ${r.status()}`, url: r.url() });
    });

    for (const yol of s.yollar) {
      await sayfa.goto(sunucu.taban + yol, { waitUntil: 'domcontentloaded' });
      if (s.bekle) await sayfa.waitForSelector(s.bekle);
      // Wanderer'ın boot'u asenkrondur (03-auth-shell post-auth zinciri):
      // `load` olayı, modüllerin kendini kurduğu anı GÖSTERMEZ.
      if (s.sure > 0) await sayfa.waitForTimeout(s.sure);

      for (const ifade of s.evaller) {
        // İfade sayfa BAĞLAMINDA değil, CDP üzerinden değerlendirilir: sayfanın
        // CSP'si `unsafe-eval` vermese de bu yol çalışır — sorgunun kendisi
        // uygulamanın güvenlik başlıklarını gevşetmeyi gerektirmemeli.
        let sonuc;
        try {
          const d = await sayfa.evaluate(`(${ifade})`);
          sonuc = { deger: JSON.stringify(d) ?? 'undefined' };
        } catch (e) {
          sonuc = { hata: (e && e.message) || String(e) };
        }
        evalSonuclari.push({ yol, ifade, ...sonuc });
      }

      for (const senaryoYolu of s.senaryolar) {
        const mod = await import(pathToFileURL(path.resolve(REPO_KOKU, senaryoYolu)).href);
        const calistir = mod.default || mod.senaryo;
        if (typeof calistir !== 'function') {
          throw new Error(`Senaryo dosyası varsayılan fonksiyon dışa açmıyor: ${senaryoYolu}`);
        }
        // Senaryonun attığı hata kapıyı kırar: planın `## Doğrulama`
        // maddeleri burada koda dönüşür, "gözle baktım"ın yerine geçer.
        await calistir({ sayfa, page: sayfa, taban: sunucu.taban, kayitlar });
        senaryoSonuclari.push({ yol, senaryo: senaryoYolu, durum: 'geçti' });
      }
    }

    if (s.ss) await sayfa.screenshot({ path: s.ss, fullPage: true });
  } catch (e) {
    hata = e;
  } finally {
    await tarayici.close();
    await sunucu.kapat();
  }

  const kova = kovala(kayitlar, {
    taban: `127.0.0.1:${s.port}`, izinler: s.izinler, gevsek: s.gevsek
  });
  return { kova, evalSonuclari, senaryoSonuclari, hata, taban: sunucu.taban, chromium: exe };
}

/* ─── 7. CLI ─── */

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const s = argAyristir(process.argv.slice(2));
  const sonuc = await dogrula(s).catch((e) => ({ hata: e }));

  if (sonuc.hata && !sonuc.kova) {
    console.error('DOĞRULAMA KOŞMADI —', sonuc.hata.message);
    process.exit(1);
  }

  if (s.json) {
    console.log(JSON.stringify({
      chromium: sonuc.chromium,
      taban: sonuc.taban,
      eval: sonuc.evalSonuclari,
      senaryo: sonuc.senaryoSonuclari,
      ihlal: sonuc.kova.ihlal,
      dis: sonuc.kova.dis,
      gurultu: sonuc.kova.gurultu,
      gurultuSayisi: sonuc.kova.gurultu.length,
      hata: sonuc.hata ? sonuc.hata.message : null,
      temiz: !sonuc.hata && sonuc.kova.ihlal.length === 0
    }, null, 2));
  } else {
    console.log(`Chromium: ${sonuc.chromium}`);
    console.log(`Origin:   ${sonuc.taban}  (yol: ${s.yollar.join(', ')})`);
    for (const e of sonuc.evalSonuclari) {
      console.log(`eval ${e.ifade}  →  ${e.hata ? 'HATA: ' + e.hata : e.deger}`);
    }
    for (const s2 of sonuc.senaryoSonuclari) console.log(`senaryo ${s2.senaryo} → ${s2.durum}`);
    console.log(raporYaz(sonuc.kova, { hata: sonuc.hata }));
    // Koşu hatası SON satırdır ve stderr'e gider: `| tail -N` ile kırpılan bir
    // çıktıda bile kırmızının görünmesi gerekir (bu satır bir kez kayboldu).
    if (sonuc.hata) console.error(`KOŞU HATASI: ${sonuc.hata.message}`);
  }

  process.exit(sonuc.hata || sonuc.kova.ihlal.length ? 1 : 0);
}
