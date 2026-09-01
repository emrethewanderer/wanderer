// @vitest-environment node
/**
 * PREVIEW SUNUCUSU KAPISI — scripts/preview-server.mjs
 *
 * Bu sunucunun tek işi var: diskteki gerçeği tarayıcıya bayatlatmadan
 * ulaştırmak. Kırıldığında sessizce kırılır — build yeşil, testler yeşil,
 * ekranda eski kod. "Sahte yeşil" sınıfının kapısı bu yüzden testtir.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { previewSunucusuKur } from '../scripts/preview-server.mjs';

let sunucu, taban, kok;

/**
 * Traversal'ı `fetch` ile sınamak yanıltıcıdır: WHATWG URL ayrıştırıcısı
 * `..` ve `%2e%2e` dizilerini İSTEMCİDE normalize eder, sunucuya zaten
 * zararsız bir yol gider ve test yeşil yanar — sunucunun kapısına hiç
 * dokunmadan. Ham `http.request` yolu olduğu gibi gönderir.
 */
function hamIstek(adres, yol) {
  const u = new URL(adres);
  return new Promise((coz, red) => {
    const istek = http.request(
      { host: u.hostname, port: u.port, path: yol, method: 'GET' },
      (y) => {
        let govde = '';
        y.on('data', (p) => { govde += p; });
        y.on('end', () => coz({ status: y.statusCode, govde }));
      }
    );
    istek.on('error', red);
    istek.end();
  });
}

async function ayagaKaldir(secenekler) {
  const s = previewSunucusuKur({ kok, sessiz: true, ...secenekler });
  await new Promise((r) => s.listen(0, '127.0.0.1', r));
  return { s, adres: `http://127.0.0.1:${s.address().port}` };
}

// `close()` tek başına açık keep-alive bağlantıların zaman aşımını bekler —
// fetch'in havuzu yüzünden her kapanış ~3 sn'ye mal oluyordu. Süit hız
// kalibrasyonuna bedava saniye eklemeyelim: bağlantıları da düşür.
async function kapat(s) {
  s.closeAllConnections?.();
  await new Promise((r) => s.close(r));
}

beforeAll(async () => {
  kok = fs.mkdtempSync(path.join(os.tmpdir(), 'wprev-'));
  fs.writeFileSync(path.join(kok, 'index.html'), '<!doctype html><title>kok</title>');
  fs.writeFileSync(path.join(kok, 'sw.js'), '/* GERCEK-SW-DOSYASI */');
  fs.mkdirSync(path.join(kok, 'js'));
  fs.writeFileSync(path.join(kok, 'js', 'state.js'), 'export const S = 1;');
  const kurulum = await ayagaKaldir();
  sunucu = kurulum.s;
  taban = kurulum.adres;
});

afterAll(async () => {
  await kapat(sunucu);
  fs.rmSync(kok, { recursive: true, force: true });
});

describe('önbellek başlıkları', () => {
  it('her yanıt no-store taşır', async () => {
    for (const yol of ['/index.html', '/js/state.js', '/']) {
      const y = await fetch(taban + yol);
      expect(y.status, yol).toBe(200);
      expect(y.headers.get('cache-control'), yol).toContain('no-store');
    }
  });

  it('ETag ve Last-Modified GÖNDERİLMEZ — 304 ve sezgisel tazelik imkânsız', async () => {
    // Kökün kökü burası: python http.server Last-Modified gönderiyordu ve
    // tarayıcı ondan sezgisel ömür (yaş × 0.1) türetip sunucuya hiç sormuyordu.
    const y = await fetch(taban + '/js/state.js');
    expect(y.headers.get('etag')).toBeNull();
    expect(y.headers.get('last-modified')).toBeNull();
  });

  it('diskte değişen dosya aynı origin\'den TAZE gelir', async () => {
    const dosya = path.join(kok, 'js', 'state.js');
    expect(await (await fetch(taban + '/js/state.js')).text()).toContain('S = 1');
    fs.writeFileSync(dosya, 'export const S = 2;');
    expect(await (await fetch(taban + '/js/state.js')).text()).toContain('S = 2');
  });
});

describe('service worker', () => {
  it('/sw.js kill-switch servis eder, gerçek dosyayı DEĞİL', async () => {
    const g = await (await fetch(taban + '/sw.js')).text();
    expect(g).toContain('unregister');
    expect(g).toContain('caches.delete');
    expect(g).not.toContain('GERCEK-SW-DOSYASI');
  });

  it('--sw (swGercek) verilirse diskteki sw.js servis edilir', async () => {
    const { s, adres } = await ayagaKaldir({ swGercek: true });
    try {
      expect(await (await fetch(adres + '/sw.js')).text()).toContain('GERCEK-SW-DOSYASI');
    } finally {
      await kapat(s);
    }
  });
});

describe('yol çözümü', () => {
  it('dizin isteği index.html\'e düşer; dizin LİSTESİ yok', async () => {
    const y = await fetch(taban + '/');
    expect(y.headers.get('content-type')).toContain('text/html');
    expect(await y.text()).toContain('<title>kok</title>');
  });

  // Traversal'a karşı iki katman var ve ikisi de sınanır:
  //  ① WHATWG URL ayrıştırıcısı `..` ve `%2e%2e` segmentlerini kendisi
  //    normalize eder — istek kökün dışına hiç çıkmaz, kök içinde arar.
  //  ② Kodlanmış slash (`%2f`) segment sınırı sayılmadığı için ①'i atlar;
  //    orada `path.resolve` tabanlı kök kontrolü devreye girer.
  it('ham ve kodlanmış nokta dizileri kökün dışına ÇIKAMAZ', async () => {
    for (const yol of ['/../../../etc/passwd', '/js/%2e%2e/%2e%2e/%2e%2e/etc/passwd']) {
      const y = await hamIstek(taban, yol);
      expect(y.status, yol).toBe(404);
      expect(y.govde, yol).not.toContain('root:');
    }
  });

  it('kodlanmış slash (%2f) bypass\'ı kök kontrolüne takılır — 403', async () => {
    const y = await hamIstek(taban, '/..%2f..%2f..%2fetc/passwd');
    expect(y.status).toBe(403);
    expect(y.govde).not.toContain('root:');
  });

  it('olmayan dosya 404', async () => {
    expect((await fetch(taban + '/yok.js')).status).toBe(404);
  });

  it('.git ve .env kökün altında olsa da servis EDİLMEZ', async () => {
    fs.mkdirSync(path.join(kok, '.git'));
    fs.writeFileSync(path.join(kok, '.git', 'config'), '[remote "origin"]');
    fs.writeFileSync(path.join(kok, '.env'), 'SUPABASE_KEY=gizli');
    for (const yol of ['/.git/config', '/.env']) {
      const y = await fetch(taban + yol);
      expect(y.status, yol).toBe(403);
      expect(await y.text(), yol).not.toContain('gizli');
    }
    // `.claude/` kapatılmaz — harness'lar oradan servis edilir.
    fs.mkdirSync(path.join(kok, '.claude'));
    fs.writeFileSync(path.join(kok, '.claude', 'h.html'), 'harness');
    expect((await fetch(taban + '/.claude/h.html')).status).toBe(200);
  });
});
