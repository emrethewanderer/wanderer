import { S } from '../state.js';
import { getCurrentLanguage } from './15-i18n.js';
import { PROMPT_I18N_CORE } from './16b-i18n-prompt-dict-core.js';
import { DETECT_I18N } from './16c-i18n-detect-dict.js';
import { ensureExt } from './00-ext-loader.js';

/* ═══════════════════════════════════════
   I18N PROMPTS — LLM Prompt Çevirileri (TR/EN)
   p(key, vars)  → çevrilmiş prompt metni
   dp(key)       → algılama regex dizisi
   pArray(prefix, vars) → çevrilmiş dizi
═══════════════════════════════════════ */

const _PROMPT = PROMPT_I18N_CORE;

/* Dış dil prompt sözlükleri sidecar'dadır (ext-i18n-<lang>.js, 15 ile aynı paket) —
   ana bundle'a girmez. p() sync kalır: paket gelene dek zincir TR fallback
   verir; LLM turu başlamadan _runLLMTurn (06) ensurePromptLang'i await eder,
   bu yüzden aktif dilin promptu pratikte hep o dilde gider. EN paketi eski
   export adını (PROMPT_I18N_EN) korur; K3 genellemesiyle gelen diller
   export'u tekdüze PROMPT_I18N_LANG adıyla verir. Paket DETECT_LANG da
   taşıyorsa (xx-detect.js) DETECT_I18N[lang]'a bağlanır — dp() zinciri
   kendiliğinden çalışır (16c'deki hazır kriz-stub'ı MERGE ile korunur). */
const _promptLangP = new Map(); // lang → promise
export function ensurePromptLang(lang = S._currentLang) {
  if (lang === 'tr' || _PROMPT[lang]) return Promise.resolve(true);
  if (_promptLangP.has(lang)) return _promptLangP.get(lang);
  const p = ensureExt('i18n-' + lang).then(ns => {
    const dict = ns?.PROMPT_I18N_LANG || ns?.['PROMPT_I18N_' + lang.toUpperCase()];
    if (!dict) throw new Error(`prompt dil paketi boş: ${lang}`);
    _PROMPT[lang] = dict;
    if (ns?.DETECT_LANG) DETECT_I18N[lang] = { ...(DETECT_I18N[lang] || {}), ...ns.DETECT_LANG };
    return true;
  }).catch(e => {
    _promptLangP.delete(lang);
    console.error(`${lang} prompt paketi yüklenemedi:`, e);
    return false;
  });
  _promptLangP.set(lang, p);
  return p;
}

/* Ön-ısıtma: dil çözüldükten SONRA (module-init'te değil — 00-config-tracking
   p'yi erken import eder, o anda dil hâlâ TR görünebilirdi; eski ext-dil dersi).
   15 bu modülden önce init olur (16 onu import eder), yine de i18nchange
   dinleyicisi ikinci ağdır. */
if (typeof window !== 'undefined') {
  if (S._currentLang && S._currentLang !== 'tr') ensurePromptLang();
  window.addEventListener('i18nchange', e => ensurePromptLang(e.detail?.lang));
}

/* ── Canlı Yönlendirme Katmanı (Emre'nin Sesi) ──
   persona_directives tablosundan (mig 026) gelen admin düzenlemeleri.
   p() önce buraya bakar; satır yoksa sözlük varsayılanı kullanılır.
   Böylece TÜM Emre yönlendirmeleri kod değişmeden panelden değişir.
   Yükleme/cache: 16d-emre-sesi.js (boot'ta setPromptOverrides çağırır). */
let _OVERRIDES = {}; // { tr: { key: content }, en: { key: content } }

export function setPromptOverrides(map) {
  _OVERRIDES = (map && typeof map === 'object') ? map : {};
}

/** Yürürlükteki override haritası — prova sahnesi (16g) taslak bindirmeden
 *  önce canlı hâli buradan alır ve `finally` içinde aynen geri yazar.
 *  Set'in simetriği; kopya döner ki çağıran yanlışlıkla canlıyı düzenlemesin. */
export function getPromptOverrides() {
  const kopya = {};
  for (const [lang, satirlar] of Object.entries(_OVERRIDES || {})) {
    kopya[lang] = { ...(satirlar || {}) };
  }
  return kopya;
}

/** Sözlükteki (DB'siz) varsayılan metin — admin odası "Varsayılan" gösterimi için. */
export function getPromptDefault(key, lang) {
  const dict = _PROMPT[lang] || _PROMPT.tr;
  return dict?.[key] !== undefined ? dict[key] : (_PROMPT.tr?.[key] ?? '');
}

/* ── Erişim Fonksiyonları ── */

export function p(key, vars) {
  const lang = S._currentLang;
  // Çözüm zinciri: dil-override → dil-sözlüğü → TR-override → TR-sözlüğü → key.
  const langDict = _PROMPT[lang];
  const ovLang = _OVERRIDES[lang]?.[key];
  let text;
  if (ovLang !== undefined) text = ovLang;
  else if (langDict && langDict[key] !== undefined) text = langDict[key];
  else {
    const ovTr = _OVERRIDES.tr?.[key];
    text = ovTr !== undefined ? ovTr
      : (_PROMPT.tr?.[key] !== undefined ? _PROMPT.tr[key] : key);
  }
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll('{{' + k + '}}', v ?? '');
    }
  }
  return text;
}

export function dp(key) {
  const dict = DETECT_I18N[S._currentLang] || DETECT_I18N.tr;
  const val = dict?.[key] || DETECT_I18N.tr?.[key] || [];
  if (val instanceof RegExp) return [val];
  return val;
}

/* Dil-BAĞIMSIZ tarama: TÜM dillerdeki desenlerin birleşimi.
   Güvenlik taramaları (kriz) aktif dile bağlanamaz — kullanıcı arayüzü
   TR/EN olsa da mesajını başka dilde yazabilir (Emniyet Katmanı, Faz 1). */
export function dpAll(key) {
  const out = [];
  for (const lang of Object.keys(DETECT_I18N)) {
    const val = DETECT_I18N[lang]?.[key];
    if (!val) continue;
    if (val instanceof RegExp) out.push(val);
    else out.push(...val);
  }
  return out;
}

/* TÜRKÇE BÜYÜK-İ TUZAĞI — desenler küçük harfle yazılıdır ve `/i` bayrağı
   Türkçenin noktalı İ'sini KATLAMAZ: JS'in canonicalize'ı toUpperCase
   kullanır, 'İ'(U+0130).toUpperCase() yine 'İ' iken 'i'.toUpperCase() 'I'
   verir — ikisi eşleşmez. Türkçede cümle başındaki her `i` sözcüğü büyük
   İ ile yazıldığı için /intihar/i "İntihar etmeyi düşünüyorum" cümlesini,
   /ilk kez/i ise "İlk kez cesaret ettim" cümlesini KAÇIRIYORDU — yalnız
   kriz yolunda değil, `dp()`/`dpAll()` sonucunu `.test()` ile kullanan HER
   yerde (FAZ 2c denetimi, 2026-09-04: on iki ayrı `detect.*` anahtarı canlı
   regex koşusuyla doğrulandı). Kırığı `tests/kriz-eval.test.js` korpusu
   buldu — desene bakarak değil, cümleye bakarak. Düzeltme TEK NOKTADA
   toplandı (§1.3): `dpTest`/`dpAllTest` metni bir kez normalize eder,
   çağrı yerleri kendi kopyasını yazmaz.
   toLowerCase() tek başına yetmez: 'İ'.toLowerCase() 'i'+U+0307 (birleşen
   nokta) döndürür ve desen yine tutmaz; NFD ile ayrışmış "i + U+0307" biçimi
   de aynı sebeple kaçar, o yüzden ikinci adım onu birleştirir.
   Yalnız U+0130'a dokunulur — ASCII 'I' zaten 'i'ye katlanıyor, ona
   dokunmak İngilizce desenleri bozardı.
   İkinci adım KONUM-BAĞLI yazıldı (çapraz denetim bulgusu, Sonnet):
   U+0307'yi metnin her yerinden silmek, desteklenen on üç dilin dışında
   NFD ile ayrışmış başka bir harfi (ör. Lehçe ż, Litvanyaca ė) sessizce
   hedef harfe indirgerdi. Bugünkü dillerde çakışma yok — ama bir normalize
   ancak hedeflediğini değiştirdiğinde normalizedir.
   Lookbehind kullanılmadı: yakalama grubu aynı işi görür ve eski iOS
   Safari'de (Capacitor kabuğu) desteklenmeme riski taşımaz.
   (Taşındı: eskiden `13-extras.js`'te `krizMetniNormalize` adıyla yalnız
   kriz yolunu korurdu; 13-extras artık bu fonksiyonu buradan re-export
   ediyor — ikinci bir kopya yazılmadı.) */
export function dpNormalize(text) {
  return String(text == null ? '' : text)
    .replace(/İ/g, 'i')
    .replace(/([iI])\u0307/g, '$1');
}

/* KONUM KORUYAN NORMALİZE — eşleşmenin YERİ lazım olduğunda (FAZ 2d).
   `dpNormalize` iki adımlıdır ve ikinci adımı (NFD "i+U+0307" → "i") metni
   KISALTIR: eşleşme indeksleri orijinal metne artık uymaz. Kanıt alıntısını
   `m.index` ile ORİJİNAL metinden kesen tüketiciler (13D `_adaylariBul`,
   00-config `captureCommitments`) bu yüzden onu kullanamaz.
   Bu sürüm yalnız U+0130 → 'i' yapar ve bu dönüşüm UZUNLUK KORUR — ikisi de
   tek UTF-16 kod birimidir. Böylece desen normalize metinde eşleşir, kanıt
   ORİJİNAL metinden kesilir: kullanıcı ekranda kendi yazdığı cümleyi görür,
   motorun onu nasıl okuduğunu değil (§6.10 — kanıt kullanıcının kendi
   cümlesidir). NFD hâli bu yolda kapsanmaz; kapsamak konum kaydırmak
   demektir ve alıntıyı bozmak, bir eşleşmeyi kaçırmaktan pahalıdır. */
export function dpNormalizeKonum(text) {
  return String(text == null ? '' : text).replace(/İ/g, 'i');
}

/* TEK EŞLEŞTİRİCİ — desen nerede yaşarsa yaşasın (FAZ 2e).
   Büyük-İ tuzağı `dp()` sözlüğüne özgü değil: `09a`, `09b`, `10-features-w2`
   gibi modüller KENDİ Türkçe desen listelerini taşıyor ve onlar da
   `liste.some(r => r.test(metin))` kalıbıyla çalışıyor — yani aynı tuzak,
   aynı biçim, başka bir sözlük. Sözlükleri birleştirmek ayrı ve büyük bir
   karardır (§1.3, plana taşındı); ama EŞLEŞTİRMEYİ birleştirmek bugün
   yapılabilir ve tuzağı kökten kapatır.
   Kazancı ikinci ve daha kalıcı: kural artık KARARI VERİLEBİLİR bir kapıya
   bağlanabiliyor. "Türkçe desenler İ-duyarlı olmalı" cümlesi statik olarak
   sınanamaz (bir desenin kullanıcı metnine mi CSS sınıfına mı baktığını
   kaynak söylemez); ama "ham `.some(r => r.test(...))` kullanılmaz" cümlesi
   sınanır. Kapı: `tests/i-tuzagi-kapisi.test.js`.
   `lastIndex` sıfırlanır: `/g` bayraklı bir desende `.test()` durum taşır ve
   ikinci çağrı sessizce false döner — eski çağrı yerlerinde de vardı, burada
   kapanıyor. */
export function reTest(desenler, text) {
  if (!desenler) return false;
  const liste = Array.isArray(desenler) ? desenler : [desenler];
  const t = dpNormalize(text);
  return liste.some(r => {
    try {
      if (r.global || r.sticky) r.lastIndex = 0;
      return r.test(t);
    } catch (_) { return false; }
  });
}

/** dp(key) desenlerinden biri (aktif dilin sözlüğü) normalize edilmiş
 *  metinle eşleşiyor mu — bkz. dpNormalize'in üstündeki büyük-İ notu. */
export function dpTest(key, text) {
  return reTest(dp(key), text);
}

/** dpAll(key) desenlerinden biri (dil-BAĞIMSIZ birleşim) normalize edilmiş
 *  metinle eşleşiyor mu — güvenlik taramaları için, bkz. dpAll(). */
export function dpAllTest(key, text) {
  return reTest(dpAll(key), text);
}

export function pArray(prefix, vars) {
  const count = parseInt(p(prefix + '_count'), 10) || 0;
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push(p(prefix + '_' + i, vars));
  }
  return arr;
}
