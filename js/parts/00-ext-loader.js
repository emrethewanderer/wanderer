/* ═══════════════════════════════════════════════════════════════
   EXT LOADER — Sidecar Yükleyici
   FELSEFE: Ana bundle IIFE + inlineDynamicImports (file:// zorunluluğu)
   kod bölemez; kullanıcının belki hiç açmayacağı ağır parçalar ilk
   yüklemeye binmemeli. Çözüm: build.sh vite'tan sonra js/ext/*.js
   girişlerini esbuild ile AYRI minified IIFE global'lere derler
   (assets/ext-<ad>.js). Bu modül onları ihtiyaç anında script-tag
   enjeksiyonuyla yükler — script-tag file://-güvenlidir, ESM import
   orada CORS'a takılır.

   SÖZLEŞME (build.sh ile el sıkışma):
     js/ext/<ad>.js  →  assets/ext-<ad>.js  →  window.__EXT_<AD>__
     (<AD> = ad büyük harf, '-' → '_')

   Dev/vitest'te sidecar dosyası yoktur → computed-string import()
   ESM fallback'i devreye girer. DİKKAT: import() argümanı asla
   literal string olamaz — vite inlineDynamicImports onu bundle'a
   GÖMER ve bütün kazanç boşa çıkar (bkz. .claude/plans/bundle-diyet.md).

   Hiçbir şeyi import etmeyen bağımsız yaprak modül — herkes
   (15-i18n dahil) döngü korkusu olmadan buradan içe aktarabilir.
═══════════════════════════════════════════════════════════════ */

const _extCache = new Map(); // fileName → Promise<boolean>

/* Sidecar script'ini enjekte eder. URL ana bundle script'inden türetilir:
   aynı klasör + ?v=<bundlehash> cache-bust (yeni build → yeni hash → SW ve
   tarayıcı cache'i tazelenir). Built bundle yoksa (dev/vitest) reject. */
export function loadExtScript(fileName) {
  if (_extCache.has(fileName)) return _extCache.get(fileName);
  const p = new Promise((resolve, reject) => {
    try {
      const main = document.querySelector('script[src*="_src-"]');
      const src = main && main.getAttribute('src');
      if (!src) { reject(new Error('built bundle yok (dev?)')); return; }
      const dir = src.slice(0, src.lastIndexOf('/') + 1);
      const hash = (src.match(/_src-([A-Za-z0-9_-]+)\.js/) || [])[1] || 'dev';
      /* SIDECAR DAMGASI (FAZ 15 denetimi) — `hash` yalnız ANA bundle'ı izler;
         sidecar'lar vite'ın grafiğinin dışında, ayrı esbuild ile derlenir.
         Yalnız bir sidecar'ın DEĞERİ değişirse (yeni anahtar eklemeyen bir EN
         çeviri düzeltmesi gibi) `hash` kıpırdamaz, URL byte-aynı kalır ve
         tarayıcının HTTP cache'i eski dosyayı verir — SW'nin CACHE adını
         döndürmek bunu KURTARMAZ, çünkü `staleWhileRevalidate`'in tazeleme
         `fetch`'i de o cache'ten karşılanabilir. build.sh sidecar içeriğinin
         özetini `data-ext-v` olarak bu etikete basar. Yoksa (eski build ya da
         sidecar'sız kurulum) eski davranışa düşülür — geriye uyumlu. */
      const extV = (main.getAttribute('data-ext-v') || '').trim();
      const surum = extV ? `${hash}-${extV}` : hash;
      const el = document.createElement('script');
      el.src = `${dir}${fileName}?v=${surum}`;
      el.onload = () => resolve(true);
      el.onerror = () => { el.remove(); reject(new Error(`ext yüklenemedi: ${fileName}`)); };
      document.head.appendChild(el);
    } catch (e) { reject(e); }
  });
  // Geçici ağ hatası kalıcı olmasın: başarısız promise cache'ten düşer.
  p.catch(() => { if (_extCache.get(fileName) === p) _extCache.delete(fileName); });
  _extCache.set(fileName, p);
  return p;
}

/* Tek kapı: sidecar'ı (prod) ya da ESM fallback'i (dev/vitest) yükleyip
   export namespace'ini döndürür. Çağıran: const { Chart } = await ensureExt('chart') */
export async function ensureExt(name) {
  const gname = `__EXT_${name.toUpperCase().replace(/-/g, '_')}__`;
  try {
    await loadExtScript(`ext-${name}.js`);
    const ns = (typeof window !== 'undefined') && window[gname];
    if (ns) return ns;
    throw new Error(`sidecar global boş: ${gname}`);
  } catch (_) {
    // Computed string: vite bunu çözümleyemez → bundle'a gömmez (bilinçli).
    const spec = `../ext/${name}.js`;
    return import(/* @vite-ignore */ spec);
  }
}
