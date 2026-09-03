---
name: i18n-bundle-bolme
description: Dış dil sözlükleri ana bundle'a girmez, sidecar'dadır (ext-i18n-<lang>.js) — ensureLangDict() yükler, `_tCache`'i boşaltır ve applyTranslations() ile DOM'u YENİDEN boyar; cache temizliği ya da re-apply çağrısı atlanırsa ekran o dilde kalıcı TR gösterir çünkü t() cache-hit'i sözlük gelişinden ÖNCE oluşmuş olabilir
type: gotcha
---

# i18n bundle bölme — sidecar sözlük gelince cache + DOM ikisi de tazelenmeli

> **Bu dosya hakkında.** `js/parts/15-i18n.js:69`'daki yorum bu ada
> `[[i18n-bundle-bolme]]` diye bağ veriyordu; hedef `.claude/memories/`
> altında YOKTU (kapı: `tests/referans-butunlugu.test.js` TABAN'ı). Aynı
> isimli bir özgün dosya repoya hiç girmedi — `git log --all -- .claude/memories/`
> bu adı hiç döndürmüyor ([[claude-altyapisi-commit-disi]]). **Bu dosya o
> özgün metnin kurtarılmış hâli DEĞİLDİR.** İçeriği bugünkü repodan
> (`15-i18n.js`, `00-ext-loader.js`, `build.sh`, `js/ext/i18n-en.js`)
> yeniden keşifle yazıldı; her cümlenin bir `dosya:satır` karşılığı var.
> Emsal: `[[olu-kod-temizlikleri]]`.
>
> **Kayıp olan:** "kanıtlanmış ders" ifadesinin (`15-i18n.js:69`) işaret
> ettiği GERÇEK olay — ekranın hangi turda, hangi dilde kalıcı TR gösterdiği,
> nasıl fark edildiği. Elde yalnız yorumun bıraktığı SONUÇ cümlesi var, olayın
> kendisi yeniden üretilemez.

**Why:** Bu repo `iife` + `inlineDynamicImports` ile derlenir
([[boot-nabzi]]) — normal bir dinamik `import()` bile ana bundle'a GÖMÜLÜR,
byte kazandırmaz. Dil sözlükleri bu yüzden farklı bir mekanizmayla
ayrılır: `build.sh`'in "SIDECAR'LAR" adımı `js/ext/*.js` girişlerini
Vite'tan BAĞIMSIZ, esbuild ile ayrı minified IIFE dosyalarına derler
(`build.sh:31-42`, `NODE_ENV=production npx esbuild "$src" --bundle
--minify --format=iife --global-name="$gname" --outfile=".../ext-${base}.js"`)
ve bu dosyalar yalnız `00-ext-loader.js`'in `loadExtScript()`'i script-tag
enjeksiyonuyla çağırdığında iner — TR kullanan bir kullanıcı EN sözlüğünü
hiç indirmez. `js/ext/i18n-en.js` bu sidecar'ın kaynağıdır:

```
export { I18N_EN } from '../parts/15e-i18n-dict-en.js';
export { PROMPT_I18N_EN } from '../parts/16e-i18n-prompt-dict-en.js';
```
build çıktısı `assets/ext-i18n-en.js` → global `window.__EXT_I18N_EN__`
(sözleşme: `<ad>` → `__EXT_<AD>__`, `-`→`_`, büyük harf).

**How to apply:**

## 1 · Yükleme zinciri — `ensureLangDict`

```js
const _langDictP = new Map(); // lang → promise
export function ensureLangDict(lang = S._currentLang) {
  if (lang === 'tr' || _I18N[lang]) return Promise.resolve(true);
  if (_langDictP.has(lang)) return _langDictP.get(lang);
  const p = ensureExt('i18n-' + lang).then(ns => {
    const dict = ns?.I18N_LANG || ns?.['I18N_' + lang.toUpperCase()];
    if (!dict) throw new Error(`i18n dil paketi boş: ${lang}`);
    _I18N[lang] = dict;
    _tCache = Object.create(null);
    applyTranslations();
    window.dispatchEvent(new CustomEvent('i18ndictloaded', { detail: { lang } }));
    return true;
  }).catch(e => {
    _langDictP.delete(lang); // geçici ağ hatası kalıcı olmasın — sonraki çağrı yeniden dener
    console.error(`${lang} dil paketi yüklenemedi:`, e);
    return false;
  });
  _langDictP.set(lang, p);
  return p;
}
```
(`15-i18n.js:72-89`) `tr` her zaman `_I18N` içinde hazırdır
(`I18N_CORE`, `15-i18n.js:60`), sidecar yalnız TR-DIŞI diller için devreye
girer. `_langDictP` per-dil promise cache'idir — aynı dil için ikinci
çağrı yeni bir ağ isteği AÇMAZ, aynı promise'i döner.

## 2 · İki ayrı tazeleme, İKİSİ de gerekli — cache VE DOM

`t(key, fallback)` (`15-i18n.js:90-97`) cache-first çalışır: `cacheKey =
lang + '\x00' + key`; `cacheKey in _tCache` ise DOĞRUDAN o değeri döner —
sözlük araması hiç yapılmaz. Sözlük henüz gelmemişken `t('x', fb)` bir kez
çağrılırsa (`_I18N[lang]` yok → `_I18N.tr` fallback'i kullanılır, `:93-95`)
o TR değeri `cacheKey` altında KALICI olarak saklanır. Sözlük geldiğinde
`ensureLangDict` bu yüzden İKİ ayrı adım atar:

1. `_tCache = Object.create(null)` — ÖNCEKİ TR-fallback girdilerini SİLER;
   silinmezse aynı `cacheKey` için `t()` sonsuza kadar eski TR değerini
   döner (cache-hit dictionary lookup'tan ÖNCE gelir).
2. `applyTranslations()` — `[data-i18n]`/`[data-i18n-html]`/`[data-i18n-ph]`/
   `[data-i18n-aria]` taşıyan HER elemanı YENİDEN boyar (`15-i18n.js:205-224`).
   Cache boşalsa BİLE bu adım atlanırsa, DAHA ÖNCE render edilmiş DOM
   elemanları eski (TR) metni GÖSTERMEYE devam eder — bir sonraki `t()`
   çağrısı doğru değeri dönse de kimse o elemana yeniden yazmaz.

**Yorumun cümlesi** ("bu re-apply atlanırsa ekran kalıcı TR kalır",
`15-i18n.js:69`) bu iki adımın BİRLİKTE zorunlu olduğunu söyler — cache
temizliği tek başına yeterli değildir (DOM güncellenmez), `applyTranslations()`
tek başına da yeterli değildir (cache hâlâ eski TR değerini döner). Yeni bir
dil sözlüğü yükleme yolu eklerken bu iki satır BİRLİKTE taşınır.

## 3 · Export adı geriye uyumu — `I18N_LANG` vs `I18N_<DİL>`

`ns?.I18N_LANG || ns?.['I18N_' + lang.toUpperCase()]` (`:76`) iki farklı
export adını kabul eder: EN paketi eski adını (`I18N_EN`) korur (`js/ext/i18n-en.js`
→ `export { I18N_EN } from '../parts/15e-i18n-dict-en.js'`), K3
genellemesiyle SONRA eklenen diller tekdüze `I18N_LANG` adıyla export
eder. Yeni bir dil eklerken hangi adı kullanacağını `.claude/plans/tum-diller-native-2.md`
belirler (I18N_LANGS'a dil eklenmesi "dalga kapısına" bağlıdır, `15-i18n.js:14-18`).

## 4 · Dokunmadan önce

- `_I18N[lang]` bir kez dolunca `ensureLangDict` erken döner
  (`lang === 'tr' || _I18N[lang]) return Promise.resolve(true)`, `:73`) —
  sözlük bir daha İNDİRİLMEZ, oturum boyunca bellekte kalır.
- Test kapsamı: `tests/15-i18n.test.js:36` `ensureLangDict('en')`'i ESM
  fallback ile (sidecar dosyası testte yok, `00-ext-loader.js`'in
  computed-string `import()` yolu devreye girer) doğrudan çağırır —
  ama cache-temizlik + DOM re-apply'ın BİRLİKTE çalıştığını iddia eden
  ayrı bir regresyon testi bu grep'te bulunamadı; bu alanda değişiklik
  yapan biri iki adımı ayırmadığından davranışsal doğrulamayla emin olur.

İlgili: [[boot-nabzi]] (aynı "byte değil ağ turu" mantığı — `iife` +
`inlineDynamicImports` sidecar'ı ZORUNLU kılan aynı build modu) ·
[[claude-altyapisi-commit-disi]] (bu dosyanın neden eksik olduğu) ·
[[olu-kod-temizlikleri]] (kayıp içerikle başa çıkmanın emsali)
