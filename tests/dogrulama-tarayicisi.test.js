// @vitest-environment node
/**
 * DOĞRULAMA TARAYICISI KAPISI — scripts/dogrula.mjs
 *
 * Ölçen aletin kendisi ölçülmezse ölçüm bir teselli olur
 * (PROTOKOL-FABLE.md §10.5 — devir nabzının dersi).
 *
 * Bu koşucu bir fazın kapanma cümlesini ("Konsol temiz.") üretir. Sessizce
 * kırılırsa ne olur: her koşu yeşil yanar, hiçbir şey doğrulanmaz ve kapı
 * bir törene döner. Bu yüzden burada TARAYICI BAŞLATILMAZ — sınanan şey
 * koşucunun yargısıdır: neyi ihlal sayar, neyi yutar, hangi cümleyi kurar.
 * Tarayıcının gerçekten açıldığı yer koşunun kendisidir (npm run dogrula).
 */
import { describe, it, expect } from 'vitest';
import http from 'node:http';
import {
  argAyristir, VARSAYILAN, chromiumYoluCoz, CHROMIUM_ADAYLARI,
  kendiOrigin, kovaSec, kovala, raporYaz, sunucuHazirla
} from '../scripts/dogrula.mjs';

describe('argüman ayrıştırma', () => {
  it('bayraksız çağrı varsayılanları verir', () => {
    const s = argAyristir([]);
    expect(s.port).toBe(VARSAYILAN.port);
    expect(s.yollar).toEqual(['/']);
    expect(s.gevsek).toBe(false);
  });

  it('--yol varsayılan "/" yerine GEÇER, tekrarlanınca birikir', () => {
    // Ezme kasıtlı: yoksa harness sınarken ana sayfa da her koşuda açılır ve
    // ilgisiz bir sayfanın konsolu fazın kapısını kırar.
    const s = argAyristir(['--yol', '/kart-test.html', '--yol', '/yuz-test.html']);
    expect(s.yollar).toEqual(['/kart-test.html', '/yuz-test.html']);
  });

  it('--eval, --senaryo, --izin tekrarlanabilir; sayısal alanlar sayıya döner', () => {
    const s = argAyristir([
      '--eval', 'typeof window.fxCue', '--eval', 'document.title',
      '--senaryo', 'tests/senaryolar/acilis.mjs',
      '--izin', 'bilinen-gurultu',
      '--port', '3031', '--sure', '0', '--zaman-asimi', '9000'
    ]);
    expect(s.evaller).toHaveLength(2);
    expect(s.senaryolar).toEqual(['tests/senaryolar/acilis.mjs']);
    expect(s.izinler).toEqual(['bilinen-gurultu']);
    expect(s.port).toBe(3031);
    expect(s.sure).toBe(0);
    expect(s.zamanAsimi).toBe(9000);
  });

  it('bilinmeyen bayrak koşuyu DURDURMAZ', () => {
    // Koşucu bir kapıdır: tanımadığı bir bayrak yüzünden hiç koşmaması,
    // kapıyı atlamanın en kolay yolu olurdu.
    expect(() => argAyristir(['--olmayan', '--gevsek'])).not.toThrow();
    expect(argAyristir(['--olmayan', '--gevsek']).gevsek).toBe(true);
  });
});

describe('chromium çözümü', () => {
  it('WANDERER_CHROMIUM her adaydan önce gelir', () => {
    const y = chromiumYoluCoz({
      env: { WANDERER_CHROMIUM: '/elle/verilen/chrome' },
      varMi: () => true
    });
    expect(y).toBe('/elle/verilen/chrome');
  });

  it('aday sırası korunur — uzak oturumun Chromium\'u sistemden önce gelir', () => {
    expect(CHROMIUM_ADAYLARI[0]).toBe('/opt/pw-browsers/chromium');
    const y = chromiumYoluCoz({
      env: {},
      varMi: (p) => p === '/opt/pw-browsers/chromium' || p === '/usr/bin/google-chrome'
    });
    expect(y).toBe('/opt/pw-browsers/chromium');
  });

  it('sabit adaylar yoksa PLAYWRIGHT_BROWSERS_PATH altındaki sürümlü dizin bulunur', () => {
    // Sürüm numarası SABİTLENMEZ: Playwright her yükseltmede değiştirir ve
    // sabitlenmiş bir yol sessizce ölür — en yüksek sürüm seçilir.
    const y = chromiumYoluCoz({
      env: { PLAYWRIGHT_BROWSERS_PATH: '/opt/pw' },
      varMi: (p) => p === '/opt/pw' || p === '/opt/pw/chromium-1194/chrome-linux/chrome',
      dizinListe: () => ['chromium-1180', 'chromium-1194', 'ffmpeg-1011']
    });
    expect(y).toBe('/opt/pw/chromium-1194/chrome-linux/chrome');
  });

  it('hiçbir tarayıcı yoksa null döner — koşucu bunu HATAYA çevirir', () => {
    // null "sorun yok" demek değildir; dogrula() bunu görünce fırlatır.
    // Tarayıcısız bir ortamda kapı ATLANMAZ, kırmızı kapanır (§6.2).
    expect(chromiumYoluCoz({ env: {}, varMi: () => false })).toBeNull();
  });
});

describe('üç kova: ihlal / dış origin / gürültü', () => {
  const taban = '127.0.0.1:3030';

  it('pageerror ve console.error İHLALDİR', () => {
    expect(kovaSec({ tur: 'pageerror', metin: 'x is not a function', url: 'http://127.0.0.1:3030/' }, { taban })).toBe('ihlal');
    expect(kovaSec({ tur: 'error', metin: 'kırık', url: 'http://127.0.0.1:3030/js/x.js' }, { taban })).toBe('ihlal');
  });

  it('kendi origin\'imizden 4xx/5xx ve düşen istek İHLALDİR', () => {
    expect(kovaSec({ tur: 'yanit', metin: 'HTTP 404', url: 'http://127.0.0.1:3030/js/yok.js' }, { taban })).toBe('ihlal');
    expect(kovaSec({ tur: 'istek', metin: 'istek düştü', url: 'http://127.0.0.1:3030/css/yok.css' }, { taban })).toBe('ihlal');
  });

  it('dış origin kapıyı KIRMAZ ama sayılır', () => {
    // Uzak oturumda dış ağ proxy arkasındadır. Onun sessizliğini uygulamanın
    // kırığı saymak kapıyı gürültüye boğar; sessizce yutmak sahte yeşil üretir.
    const k = kovaSec({ tur: 'istek', metin: 'istek düştü', url: 'https://fonts.googleapis.com/css2' }, { taban });
    expect(k).toBe('dis');
  });

  it('uyarı VARSAYILAN OLARAK ihlaldir, --gevsek ile gürültü', () => {
    // Bu repoda `console.warn` bir hata kanalıdır (§5.2: catch → warn; js/
    // altında 305 kullanım). Uyarıyı yutan kapı, uygulamanın kendi hata
    // kanalını kör eder — koşucunun ilk hâli tam olarak bunu yapıyordu ve
    // ilk harness taraması yutulan gerçek bir hatayı ortaya çıkardı.
    const uyari = { tur: 'warning', metin: 'kumComposeFromText: sb.auth.getSession is not a function', url: 'http://127.0.0.1:3030/js/parts/12d-kart-uretim.js' };
    expect(kovaSec(uyari, { taban })).toBe('ihlal');
    expect(kovaSec(uyari, { taban, gevsek: true })).toBe('gurultu');
  });

  it('favicon 404 bilinen gürültüdür', () => {
    expect(kovaSec({ tur: 'error', metin: 'Failed to load resource: 404', url: 'http://127.0.0.1:3030/favicon.ico' }, { taban })).toBe('gurultu');
  });

  it('kullanıcı jesti politikası gürültüdür — ama gerçek titreşim hatası İHLAL kalır', () => {
    // Koşucu tıklamaz; Chrome'un "hasn't tapped" mesajı her otomatik koşuda
    // basılır. Desen dar tutulur: politika mesajını yutar, kodun hatasını değil.
    expect(kovaSec({
      tur: 'error',
      metin: "Blocked call to navigator.vibrate because user hasn't tapped on the frame",
      url: 'http://127.0.0.1:3030/js/parts/13e-his-motoru.js'
    }, { taban })).toBe('gurultu');
    expect(kovaSec({
      tur: 'pageerror',
      metin: 'navigator.vibrate is not a function',
      url: 'http://127.0.0.1:3030/js/parts/13e-his-motoru.js'
    }, { taban })).toBe('ihlal');
  });

  it('--izin deseni ihlali gürültüye indirir; BOZUK desen koşuyu çökertmez', () => {
    const kayit = { tur: 'error', metin: 'bilinen kırık', url: 'http://127.0.0.1:3030/' };
    expect(kovaSec(kayit, { taban, izinler: ['bilinen kırık'] })).toBe('gurultu');
    expect(kovaSec(kayit, { taban, izinler: ['('] })).toBe('ihlal');
  });

  it('URL taşımayan mesaj sayfanın kendi konsolu sayılır', () => {
    expect(kendiOrigin('', taban)).toBe(true);
    expect(kendiOrigin('düz metin uyarı', taban)).toBe(true);
    expect(kendiOrigin('https://supabase.co/rest/v1', taban)).toBe(false);
  });

  it('kovala hepsini ayırır', () => {
    const kova = kovala([
      { tur: 'pageerror', metin: 'a', url: 'http://127.0.0.1:3030/' },
      { tur: 'istek', metin: 'b', url: 'https://cdn.example.com/x.js' },
      { tur: 'log', metin: 'c', url: 'http://127.0.0.1:3030/' }
    ], { taban });
    expect(kova.ihlal).toHaveLength(1);
    expect(kova.dis).toHaveLength(1);
    expect(kova.gurultu).toHaveLength(1);
  });
});

describe('rapor — "Konsol temiz." bir KANIT iddiasıdır', () => {
  const bos = { ihlal: [], dis: [], gurultu: [] };

  it('ihlal yokken ve koşu tamamlandıysa cümle kurulur', () => {
    expect(raporYaz(bos)).toContain('Konsol temiz.');
  });

  it('ihlal varken cümle KURULMAZ', () => {
    const r = raporYaz({ ...bos, ihlal: [{ tur: 'pageerror', metin: 'x', url: '' }] });
    expect(r).not.toContain('Konsol temiz.');
    expect(r).toContain('İHLAL');
  });

  it('koşu çöktüyse konsol boş olsa da cümle KURULMAZ', () => {
    // Regresyon: koşucunun ilk hâli senaryo hatasıyla düşerken bile
    // "Konsol temiz." basıyordu — sahte başarının ta kendisi (§6.2).
    const r = raporYaz(bos, { hata: new Error('senaryo düştü') });
    expect(r).not.toContain('Konsol temiz.');
    expect(r).toContain('doğrulama DEĞİLDİR');
  });

  it('gürültü satırı TÜR DAĞILIMINI basar — CI logunda kovanın içi görünsün', () => {
    const r = raporYaz({ ihlal: [], dis: [], gurultu: [
      { tur: 'info', metin: 'a' }, { tur: 'info', metin: 'b' }, { tur: 'verbose', metin: 'c' }
    ] });
    expect(r).toContain('info×2');
    expect(r).toContain('verbose×1');
  });

  it('json raporu ihlalleri, dış origin\'i ve gürültünün TAMAMINI taşır', () => {
    // Yutulan şey denetlenemiyorsa filtre bir kapı değil bir perdedir.
    const j = JSON.parse(raporYaz({
      ihlal: [{ tur: 'error', metin: 'a' }],
      dis: [{ tur: 'istek', metin: 'b' }],
      gurultu: [{ tur: 'log', metin: 'c' }]
    }, { json: true }));
    expect(j.temiz).toBe(false);
    expect(j.gurultu).toHaveLength(1);
    expect(j.gurultuSayisi).toBe(1);
  });
});

describe('tek origin — sunucuHazirla', () => {
  it('port boşsa sunucuyu kurar, kapat() onu kapatır', async () => {
    const s = await sunucuHazirla({ port: 3137, kok: '.', sw: false });
    expect(s.disarida).toBe(false);
    expect((await fetch(s.taban + '/package.json')).status).toBe(200);
    await s.kapat();
    await expect(fetch(s.taban + '/package.json')).rejects.toThrow();
  });

  it('port DOLUYSA ona bağlanır ve kapat() dışarıdakine DOKUNMAZ', async () => {
    // Tek origin kuralının mekaniği (§3.3): önbellek şüphesinde yeni port
    // açmak bu repoda yasaktır — koşucu da bu yasağa uyar.
    const disarida = http.createServer((_q, y) => { y.writeHead(200); y.end('dis'); });
    await new Promise((r) => disarida.listen(3138, '127.0.0.1', r));
    try {
      const s = await sunucuHazirla({ port: 3138, kok: '.', sw: false });
      expect(s.disarida).toBe(true);
      await s.kapat();
      expect(await (await fetch('http://127.0.0.1:3138/')).text()).toBe('dis');
    } finally {
      disarida.closeAllConnections?.();
      await new Promise((r) => disarida.close(r));
    }
  });
});
