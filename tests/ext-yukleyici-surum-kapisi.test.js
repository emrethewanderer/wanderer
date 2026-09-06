/**
 * SIDECAR SÜRÜM KAPISI — "iki katmanlı cache, tek damga"
 *
 * FAZ 15 teşhisi (oda 13 · "SW dil pürüzü") kökü buldu: sidecar'lar
 * (`assets/ext-*.js`, ör. EN dil paketi) vite'ın bağımlılık grafiğinin
 * DIŞINDA, ayrı bir esbuild çağrısıyla derlenir. Ana bundle hash'i onların
 * İÇERİĞİNİ izlemez — yalnız bir sidecar'ın DEĞERİ değişirse (yeni anahtar
 * eklemeyen bir EN çeviri düzeltmesi gibi) hash kıpırdamaz.
 *
 * FAZIN İLK HÂLİ YARIM KALMIŞTI ve faz denetiminde (parent) bulundu: SW'nin
 * `CACHE` adını döndürmek yalnız BİRİNCİ katmanı kurtarır. İKİNCİ katman
 * tarayıcının kendi HTTP cache'idir ve `staleWhileRevalidate` (sw.js) düz
 * `fetch(req)` kullandığı için TAZELEME isteği de oradan karşılanabilir —
 * URL (`?v=<bundle_hash>`) byte-aynı kaldığı sürece eski sözlük süresiz
 * servis edilir. `build.sh` bu yüzden aynı özeti `index.html`e de
 * `data-ext-v` olarak basar ve yükleyici onu URL'e katar.
 *
 * Bu dosya YÜKLEYİCİ tarafını ölçer; `build.sh` tarafı
 * `tests/sw-damga-kapisi.test.js`'te. İkisi tek kırığın iki ucudur.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

async function tazeYukleyici() {
  vi.resetModules();
  return import('../js/parts/00-ext-loader.js');
}

/** Ana bundle script etiketini kurar; `extV` verilirse damgayı da basar. */
function kurBundle(extV) {
  document.head.innerHTML = '';
  const s = document.createElement('script');
  s.setAttribute('src', '/assets/_src-ABC123.js');
  if (extV !== undefined) s.setAttribute('data-ext-v', extV);
  document.head.appendChild(s);
}

/** Enjekte edilen sidecar script'inin src'si — onload elle tetiklenir. */
function enjekteEdilenSrc() {
  const el = [...document.head.querySelectorAll('script')]
    .find((x) => (x.getAttribute('src') || '').includes('ext-'));
  return el ? el.getAttribute('src') : null;
}

describe('loadExtScript — sidecar sürümü iki damgayı da taşır', () => {
  beforeEach(() => { document.head.innerHTML = ''; });

  it('data-ext-v VARSA URL bundle hash + sidecar özetini taşır', async () => {
    kurBundle('19a0405839');
    const { loadExtScript } = await tazeYukleyici();
    loadExtScript('ext-i18n-en.js');
    expect(enjekteEdilenSrc()).toBe('/assets/ext-i18n-en.js?v=ABC123-19a0405839');
  });

  /* Kırığın kendisi: sidecar içeriği değişip bundle hash SABİT kalınca URL
     DEĞİŞMELİ. Eski kod burada iki kez aynı URL'i üretiyordu. */
  it('sidecar özeti değişince URL de değişir — bundle hash aynı kalsa BİLE', async () => {
    kurBundle('aaaaaaaaaa');
    const { loadExtScript } = await tazeYukleyici();
    loadExtScript('ext-i18n-en.js');
    const once = enjekteEdilenSrc();

    kurBundle('bbbbbbbbbb');                 // yalnız sidecar değişti
    const { loadExtScript: yeni } = await tazeYukleyici();
    yeni('ext-i18n-en.js');
    const sonra = enjekteEdilenSrc();

    expect(once).not.toBe(sonra);
    expect(once).toContain('ABC123-aaaaaaaaaa');
    expect(sonra).toContain('ABC123-bbbbbbbbbb');
  });

  it('data-ext-v YOKSA eski davranışa düşer — geriye uyumlu', async () => {
    kurBundle(undefined);
    const { loadExtScript } = await tazeYukleyici();
    loadExtScript('ext-i18n-en.js');
    expect(enjekteEdilenSrc()).toBe('/assets/ext-i18n-en.js?v=ABC123');
  });

  it('boş data-ext-v de eski davranışa düşer (kırık damga URL kirletmez)', async () => {
    kurBundle('   ');
    const { loadExtScript } = await tazeYukleyici();
    loadExtScript('ext-i18n-en.js');
    expect(enjekteEdilenSrc()).toBe('/assets/ext-i18n-en.js?v=ABC123');
  });

  it('built bundle hiç yoksa reddeder (dev/vitest) — sessizce yüklemez', async () => {
    document.head.innerHTML = '';
    const { loadExtScript } = await tazeYukleyici();
    await expect(loadExtScript('ext-i18n-en.js')).rejects.toThrow(/built bundle yok/);
  });
});

describe('üretilmiş ağaç — iki damga AYNI özeti taşıyor', () => {
  it('index.html data-ext-v ile sw.js CACHE aynı sidecar özetini gösterir', async () => {
    const { readFileSync, existsSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
    const idx = join(ROOT, 'index.html');
    if (!existsSync(idx)) return;                       // build alınmamışsa sessiz geç
    const extV = (readFileSync(idx, 'utf8').match(/data-ext-v="([^"]+)"/) || [])[1];
    if (!extV) return;                                  // sidecar'sız kurulum
    const cache = readFileSync(join(ROOT, 'sw.js'), 'utf8')
      .split('\n').find((l) => l.startsWith('const CACHE'));
    expect(cache, `sw.js CACHE index.html'in damgasını (${extV}) taşımıyor`).toContain(extV);
  });
});
