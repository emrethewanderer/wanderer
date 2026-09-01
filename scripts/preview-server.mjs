#!/usr/bin/env node
/**
 * Wanderer AI — PREVIEW SUNUCUSU
 * "Tek origin, hiç önbellek." Bayat modül sınıfının kökünü kesen sunucu.
 *
 * NEDEN VAR:
 *   Preview `python3 -m http.server` ile servis ediliyordu ve o sunucu
 *   `Cache-Control` HİÇ göndermez, yalnız `Last-Modified` gönderir. Bu
 *   kombinasyonda tarayıcı sezgisel (heuristic) tazelik uygular:
 *   ömür ≈ (şimdi − Last-Modified) × 0.1. Yani üç gün önce dokunulmuş
 *   `js/state.js` yaklaşık yedi saat boyunca "taze" sayılır ve Edit ile
 *   diske yazdığım değişiklikten sonra tarayıcı SUNUCUYA SORMADAN disk
 *   kopyasını verir. Kaynak modüller hash'siz olduğu için (harness'lar
 *   `/js/parts/*.js`'i doğrudan import eder) kaçış yolu da yoktur.
 *
 *   İkinci katman Service Worker'dı: 14-boot localhost'ta SW'yi söker, ama
 *   o söküm yalnız ANA UYGULAMA boot ederse çalışır — harness sayfaları
 *   14-boot'u import etmez. Bir kez o kökte kayıt olmuş SW, harness'ta
 *   sonsuza kadar bayat servis eder.
 *
 *   İkisinin bileşimi "diskte doğru, ekranda eski" durumunu üretti ve
 *   çare diye her seferinde YENİ BİR PORT açıldı (temiz origin = temiz
 *   önbellek). `.claude/launch.json` 22 girdiye, portlar 5176–5194
 *   aralığına şişti; her yeni origin yeni bir preview penceresi demekti.
 *   Kaçmak çözüm değildi — önbelleğin kendisi kapatılmalıydı.
 *
 * MEKANİK:
 *   ① Her yanıt `Cache-Control: no-store` taşır; `ETag` ve `Last-Modified`
 *     HİÇ gönderilmez → tarayıcının elinde doğrulayacak bir şey kalmaz,
 *     304 imkânsızlaşır, sezgisel tazelik hesabı hiç kurulmaz.
 *   ② `/sw.js` gerçek Service Worker yerine KILL-SWITCH servis eder:
 *     kayıtlı SW kendini söker, tüm cache'leri siler, kontrol ettiği
 *     sekmeleri bir kez tazeler. Diskteki `sw.js` üretimde olduğu gibi
 *     kalır — yalnız preview'da servis edilmez. `--sw` bayrağı gerçek
 *     dosyayı servis eder (SW davranışını bilerek sınamak için).
 *   ③ Dizin isteği `index.html`'e düşer; dizin LİSTESİ yoktur — yarım
 *     build'de listeye düşüp "stilsiz ham ekran" üreten tuzak (build.sh
 *     başlığındaki atomik takas notu) bir daha kurulmasın.
 *
 * Kullanım:
 *   node scripts/preview-server.mjs                 → repo kökü, :3030
 *   node scripts/preview-server.mjs --kok dist --port 3031
 *   node scripts/preview-server.mjs --sw            → gerçek sw.js servis et
 *
 * Kapı: tests/preview-sunucusu.test.js
 */
import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const REPO_KOKU = path.resolve(import.meta.dirname, '..');

/* ─── 1. ÖNBELLEK YOK ─── */

// `no-store` tek başına yeter, ötekiler eski/aracı önbellekler için sigorta.
// Kritik olan bu listede OLMAYAN'lar: ETag ve Last-Modified gönderilmez ki
// tarayıcının elinde ne doğrulama koşulu ne de sezgisel tazelik girdisi olsun.
const ONBELLEKSIZ = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0'
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8'
};

/* ─── 2. SW KILL-SWITCH ─── */

// fetch dinleyicisi YOKTUR — bu SW hiçbir isteğe cevap vermez, yalnız kendini
// ve arkasında bıraktığı cache'leri siler. `clients.claim()` + navigate ile
// bayat sayfayı tek turda tazeler; olmazsa bir sonraki yenilemede zaten temiz.
const SW_KILL = `/* Wanderer preview — SW kill-switch (üretim sw.js DEĞİL) */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch (_) {}
  try { await self.registration.unregister(); } catch (_) {}
  try {
    const cs = await self.clients.matchAll({ type: 'window' });
    cs.forEach(c => { try { c.navigate(c.url); } catch (_) {} });
  } catch (_) {}
})()));
`;

/* ─── 3. SUNUCU ─── */

function yanit(res, kod, tip, govde) {
  res.writeHead(kod, { ...ONBELLEKSIZ, 'Content-Type': tip });
  res.end(govde);
}

/**
 * Dinlemeye BAŞLAMAMIŞ bir http.Server döndürür — çağıran `listen` eder.
 * Testler port 0 ile bağlayabilsin diye kurulum ve dinleme ayrıldı.
 */
export function previewSunucusuKur({ kok = REPO_KOKU, swGercek = false, sessiz = false } = {}) {
  const kokMutlak = path.resolve(kok);

  return createServer((req, res) => {
    const log = (kod, yol) => { if (!sessiz) console.log(`${kod} ${req.method} ${yol}`); };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      log(405, req.url);
      return yanit(res, 405, 'text/plain; charset=utf-8', 'Yalnız GET/HEAD');
    }

    let yol;
    try {
      yol = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch (_) {
      log(400, req.url);
      return yanit(res, 400, 'text/plain; charset=utf-8', 'Bozuk URL');
    }

    // Gerçek SW yalnız `--sw` ile servis edilir; varsayılan kill-switch'tir.
    // `endsWith` kasıtlı: kökteki `sw.js` de `dist/sw.js` de aynı üretim
    // worker'ıdır, hangi yoldan istenirse istensin preview'da servis edilmez.
    if (!swGercek && yol.endsWith('/sw.js')) {
      log(200, yol + ' (kill-switch)');
      return yanit(res, 200, MIME['.js'], req.method === 'HEAD' ? '' : SW_KILL);
    }

    // Traversal: çözülmüş yol kökün DIŞINA çıkıyorsa hiç dosyaya bakma.
    const tam = path.resolve(kokMutlak, '.' + yol);
    if (tam !== kokMutlak && !tam.startsWith(kokMutlak + path.sep)) {
      log(403, yol);
      return yanit(res, 403, 'text/plain; charset=utf-8', 'Kökün dışı');
    }

    // Sunucu repo KÖKÜNÜ servis eder — `.git` ve `.env` de o kökün altındadır.
    // Yerel bir sunucuda bile bunları açık bırakmak gereksiz bir yüzeydir:
    // `/.git/config` uzak URL'i, bir `.env` ise anahtarları verir. `.claude/`
    // kapatılamaz, harness'lar oradan servis edilir — bu yüzden nokta ile
    // başlayan her şey değil, yalnız bu ikisi reddedilir.
    const segmentler = yol.split('/').filter(Boolean);
    if (segmentler.some((s) => s === '.git' || s === '.env' || s.startsWith('.env.'))) {
      log(403, yol);
      return yanit(res, 403, 'text/plain; charset=utf-8', 'Kapalı yol');
    }

    let hedef = tam;
    let durum;
    try {
      durum = statSync(hedef);
      if (durum.isDirectory()) {
        // Dizin listesi YOK: yarım build'de listeye düşmek "stilsiz ham ekran"
        // teşhisini yıllarca zorlaştıran tuzaktı (bkz. build.sh atomik takas).
        hedef = path.join(hedef, 'index.html');
        durum = statSync(hedef);
      }
    } catch (_) {
      log(404, yol);
      return yanit(res, 404, 'text/plain; charset=utf-8', 'Bulunamadı');
    }

    res.writeHead(200, {
      ...ONBELLEKSIZ,
      'Content-Type': MIME[path.extname(hedef).toLowerCase()] || 'application/octet-stream',
      'Content-Length': durum.size
    });
    log(200, yol);
    if (req.method === 'HEAD') return res.end();
    createReadStream(hedef).on('error', () => res.end()).pipe(res);
  });
}

/* ─── 4. CLI ─── */

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (ad, varsayilan) => {
    const i = process.argv.indexOf(ad);
    return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : varsayilan;
  };
  const kok = path.resolve(REPO_KOKU, arg('--kok', '.'));
  const port = Number(arg('--port', '3030'));
  const swGercek = process.argv.includes('--sw');

  const sunucu = previewSunucusuKur({ kok, swGercek });
  sunucu.on('error', (e) => {
    if (e && e.code === 'EADDRINUSE') {
      // Yeni port açmak bu sunucunun var olma sebebini yok eder: origin
      // değişince önbellek de oturum da sıfırlanır ve pencereler birikir.
      console.error(`Port ${port} dolu. YENİ PORT AÇMA — dolduran süreç bu sunucuysa`);
      console.error(`onu kullan, değilse kapat:  lsof -nP -iTCP:${port} -sTCP:LISTEN`);
      process.exit(1);
    }
    console.error('preview sunucusu:', e && e.message);
    process.exit(1);
  });
  sunucu.listen(port, () => {
    console.log(`Wanderer preview → http://localhost:${port}  (kök: ${kok})`);
    console.log(`Önbellek: no-store · ETag/Last-Modified yok · sw.js: ${swGercek ? 'GERÇEK' : 'kill-switch'}`);
  });
}
