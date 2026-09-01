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

export function pArray(prefix, vars) {
  const count = parseInt(p(prefix + '_count'), 10) || 0;
  const arr = [];
  for (let i = 0; i < count; i++) {
    arr.push(p(prefix + '_' + i, vars));
  }
  return arr;
}
