import { S } from '../state.js';
import { SafeStorage, STORAGE_KEYS } from './00a-infrastructure.js';
import { w2CloseDrawer } from './10-features-w2.js';
import { appendMsg } from './06-summary-chat.js';
import { I18N_CORE } from './15b-i18n-dict-core.js';
import { ensureExt } from './00-ext-loader.js';

/* ═══════════════════════════════════════
   I18N — TR / EN
   t(key) → çeviriyi döndürür
   setLanguage(code) → dili değiştirir + UI günceller
   applyTranslations() → data-i18n / -html / -ph / -aria elementlerini günceller

   NOT (2026-07-13): Uygulama şu an TR/EN yayında (I18N_LANGS). Yükleyici
   (ensureLangDict) K3 ile GENELLEŞTİ — herhangi bir dil `ensureExt('i18n-'+lang)`
   üzerinden aynı zincirle yüklenir; `I18N_LANGS`'a dil eklenmesi dalga
   kapısına bağlıdır (bkz. .claude/plans/tum-diller-native-2.md §0.5). v1'de
   11 dile yarım-parite (~%13 anahtar) ile genişleme denenmiş ve geri
   alınmıştı — v2 "dil-dil tam native" modeliyle bunu yapısal olarak
   imkânsız kılar (tests/i18n-parity-kapisi.test.js kapısı).
═══════════════════════════════════════ */

export const I18N_LANGS = {
  tr: { name: 'Türkçe',  flag: '🇹🇷', dir: 'ltr' },
  en: { name: 'English', flag: '🇬🇧', dir: 'ltr' },
};

/* LLM'e [LANGUAGE] talimatında verilecek ad — I18N_LANGS.name UI'daki (native)
   ad olduğundan (ör. 中文（繁體）) burada ayrı bir İngilizce-okunur harita tutulur.
   K8'de tanımlı dalga dilleri şimdiden hazır; yayına giren her dil burada da olmalı. */
const LANG_INSTRUCTION_NAMES = {
  en: 'English', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian',
  nl: 'Dutch', pt: 'Brazilian Portuguese', ja: 'Japanese', ko: 'Korean',
  ru: 'Russian', zh: 'Traditional Chinese', ar: 'Arabic',
};

export function getCurrentLanguage() { return S._currentLang; }

/** Büyük harf — kullanıcının BEYAN ETTİĞİ dilin kuralıyla.
 *
 *  `tr-TR` locale'i küçük "i"yi noktalı "İ"ye çevirir. Locale sabit
 *  yazıldığında İngilizce arayüzde kategori çipi "FOUNDATİONS", paylaşım
 *  kartı "THİS PATH" diye basılıyordu — büyütmenin locale'i her sabitlendiği
 *  yerde kırık yeniden doğar, o yüzden tek kapı burasıdır.
 *
 *  YALNIZ ARAYÜZ METNİ için: kaynağı `t()` olan, dili bilinen metin. Kullanıcı
 *  verisi (kişinin adı) ve TR yazılmış içerik (deste kart adları) bu kapıdan
 *  GEÇMEZ — onların dili arayüz diliyle değişmez; oralarda sabit `tr-TR`
 *  doğrudur ve satırda `DIL-MUAF` ile beyan edilir. */
export function localeUpper(s) {
  return String(s == null ? '' : s).toLocaleUpperCase(S._currentLang || 'tr');
}

export function getLangInstruction() {
  if (S._currentLang === 'tr') return '';
  const name = LANG_INSTRUCTION_NAMES[S._currentLang] || I18N_LANGS[S._currentLang]?.name || S._currentLang;
  return `\n\n[LANGUAGE]: Respond entirely in ${name}. All your messages must be in ${name}.`;
}

/* ═══ ÇEVİRİ SÖZLÜĞÜ ═══ */

const _I18N = I18N_CORE;
let _tCache = Object.create(null);

/* Dış dil sözlükleri sidecar'dadır (ext-i18n-<lang>.js) — ana bundle'a girmez,
   yalnız o dil aktifken iner (bkz. .claude/plans/bundle-diyet.md). Yüklenene dek
   t() TR fallback verir; sözlük gelince cache boşaltılıp UI YENİDEN boyanır —
   bu re-apply atlanırsa ekran kalıcı TR kalır (kanıtlanmış ders,
   [[i18n-bundle-bolme]]). EN paketi eski export adını (I18N_EN) korur; K3
   genellemesiyle gelen diller export'u tekdüze I18N_LANG adıyla verir. */
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

export function t(key, fallback) {
  const lang = S._currentLang;
  const cacheKey = lang + '\x00' + key;
  if (cacheKey in _tCache) return _tCache[cacheKey];
  const dict = _I18N[lang] || _I18N.tr;
  const val = dict?.[key];
  if (val !== undefined && val !== '') return (_tCache[cacheKey] = val);
  const trVal = _I18N.tr?.[key];
  if (trVal !== undefined && trVal !== '') return (_tCache[cacheKey] = trVal);
  return (_tCache[cacheKey] = fallback || key);
}

/* Hedef dilden çeviri oku (mevcut dilden bağımsız) */
function _tInLang(lang, key) {
  const dict = _I18N[lang] || _I18N.tr;
  const val = dict?.[key];
  if (val !== undefined && val !== '') return val;
  const trVal = _I18N.tr?.[key];
  return (trVal !== undefined && trVal !== '') ? trVal : key;
}

/* Dil değişimini onay isteyerek başlat — onaydan sonra sayfa yenilenir */
export function requestLangChange(lang) {
  if (!I18N_LANGS[lang]) return;
  closeLangPicker();
  if (lang === S._currentLang) return;
  _openLangConfirm(lang);
}

function _openLangConfirm(lang) {
  let overlay = document.getElementById('lang-confirm-overlay');
  if (overlay) overlay.remove();

  const dir = I18N_LANGS[lang].dir || 'ltr';
  overlay = document.createElement('div');
  overlay.id = 'lang-confirm-overlay';
  overlay.dir = dir;
  overlay.innerHTML = `
    <div id="lang-confirm-modal">
      <div id="lang-confirm-flag">${I18N_LANGS[lang].flag}</div>
      <div id="lang-confirm-title">${_tInLang(lang, 'lang.confirm_title')}</div>
      <div id="lang-confirm-body">${_tInLang(lang, 'lang.confirm_body')}</div>
      <div id="lang-confirm-actions">
        <button type="button" class="lang-confirm-btn lang-confirm-no">${_tInLang(lang, 'lang.confirm_no')}</button>
        <button type="button" class="lang-confirm-btn lang-confirm-yes">${_tInLang(lang, 'lang.confirm_yes')}</button>
      </div>
    </div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeLangConfirm(); });
  overlay.querySelector('.lang-confirm-no').addEventListener('click', closeLangConfirm);
  overlay.querySelector('.lang-confirm-yes').addEventListener('click', () => _confirmLangChange(lang));
  document.body.appendChild(overlay);
  void overlay.offsetWidth; // reflow zorla — geçiş animasyonu güvenilir tetiklensin
  overlay.classList.add('open');
}

export function closeLangConfirm() {
  const overlay = document.getElementById('lang-confirm-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  setTimeout(() => overlay.remove(), 260);
}

/* Onaylandı — dili kaydet ve uygulamayı "Bugün" ekranından yeniden başlat.
   localStorage'a yazılır: SafeStorage in-memory + Supabase'tir, reload sonrası
   önyükleme anında (auth/hydrate öncesi) dil yalnızca localStorage'tan okunabilir. */
function _confirmLangChange(lang) {
  try { localStorage.setItem(STORAGE_KEYS.LANG, lang); } catch (_) {}
  try { SafeStorage.setRaw(STORAGE_KEYS.LANG, lang); } catch (_) {}
  closeLangConfirm();
  window.location.reload();
}

export function setLanguage(lang) {
  if (!I18N_LANGS[lang]) return;
  const prevLang = S._currentLang;
  S._currentLang = lang;
  _tCache = Object.create(null); // invalidate translation cache on lang switch
  try { localStorage.setItem(STORAGE_KEYS.LANG, lang); } catch (_) {}
  SafeStorage.setRaw(STORAGE_KEYS.LANG, lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = I18N_LANGS[lang].dir || 'ltr';
  ensureLangDict(lang); // fire-and-forget: sözlük gelince applyTranslations'ı kendisi yineler
  applyTranslations();
  const langBtn = document.getElementById('w2-lang-btn');
  if (langBtn) langBtn.title = I18N_LANGS[lang].name;
  window.dispatchEvent(new CustomEvent('i18nchange', { detail: { lang } }));
  if (S._i18nReady && prevLang !== lang) {
    _sendLangGreeting(lang);
  }
}

function _sendLangGreeting(lang) {
  const area = document.getElementById('messages-area');
  if (!area) return;
  const authScreen = document.getElementById('auth-screen');
  if (authScreen && authScreen.style.display !== 'none') return;
  const greeting = (_I18N[lang] || _I18N.tr)?.['lang.greeting'];
  if (!greeting) return;
  appendMsg('emre', greeting, 'lang-change');
}

function updateWeekdayLabels() {
  const locale = S._currentLang;
  const monday = new Date(2023, 0, 2);
  document.querySelectorAll('[data-dow-index]').forEach(el => {
    const idx = parseInt(el.dataset.dowIndex, 10);
    if (isNaN(idx) || idx < 0 || idx > 6) return;
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    el.textContent = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d);
  });
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.getAttribute('data-i18n-html'));
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-ph'));
  });
  // Erişilebilirlik katmanı — ekran okuyucu etiketleri de dil değişiminde
  // döner; görünen metin İngilizce'yken aria-label'ın Türkçe kalması karma
  // dilli bir okuma üretiyordu.
  // GOTCHA: JS'in runtime'da setAttribute ettiği aria-label'lara (kota
  // halkası [data-kt-ring] · model pili #cl-model-pill / #ic-models-toggle ·
  // gönder butonu #send-btn) bu öznitelik TAKILMAZ — takılsaydı dil
  // değişiminde statik metin canlı durumu (Durdur / "Model: X — değiştir")
  // ezerdi. O elemanlar kendi t() çağrılarıyla çevrilir.
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria')));
  });
  updateWeekdayLabels();
}

function initI18n() {
  try {
    // Önyükleme: localStorage tek kalıcı kaynaktır (SafeStorage hydrate'i auth
    // SONRASI dolar — boot anında hep boştu, fallback işlevsizdi).
    // DİKKAT: Burada STORAGE_KEYS/SafeStorage (00a) KULLANILMAZ. initI18n
    // modül-load'ta çalışır ve 00a↔15 import çemberinde built IIFE
    // sıralamasında 00a henüz TDZ'de olabiliyor; erişim dış catch'e düşüp
    // dil çözümünü SESSİZCE öldürüyordu (EN boot TR açılıyordu).
    let saved = null;
    try { saved = localStorage.getItem('etw_lang'); } catch (_) {} // = STORAGE_KEYS.LANG
    if (saved && I18N_LANGS[saved]) {
      S._currentLang = saved;
    } else {
      /* Tahmin yalnız İLK BOYAMAYI yapar ve ASLA kaydedilmez. Cihazın dili
         kullanıcının seçimi hakkında bir kanıt değildir (§6.10) — telefonu
         İngilizce kurulmuş biri Türkçe konuşuyor olabilir. Kaydedilseydi
         tahmin beyana dönüşür, kapı bir daha hiç açılmazdı. */
      const raw = (navigator.languages?.[0] || navigator.language || '').split('-')[0].toLowerCase();
      if (raw && I18N_LANGS[raw]) S._currentLang = raw;
    }
  } catch (_) {}

  document.documentElement.lang = S._currentLang;
  document.documentElement.dir = I18N_LANGS[S._currentLang]?.dir || 'ltr';

  // EN kullanıcı: sidecar'ı hemen iste — ilk boyama TR fallback'le çıkar,
  // paket gelince (tipik <1sn) re-apply EN'e çevirir.
  if (S._currentLang !== 'tr') ensureLangDict();

  const _hazir = () => {
    applyTranslations();
    setTimeout(() => { S._i18nReady = true; }, 300);
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _hazir);
  } else {
    _hazir();
  }
}

/* ═══ DİL BEYANI KAPISI ═══
   Dil bir tahmin değil BEYANDIR. `navigator.language` uygulamanın ÖLÇÜMÜ bile
   değil, cihazın kurulum tercihidir; kullanıcı hakkında bir şey söylemez.
   O yüzden zincir tek yönlüdür: tahmin boyar, beyan kalır. Beyan bir kez
   alınır ve kullanıcı kendisi değiştirene kadar hiçbir şey onu ezmez —
   ne yeniden açılış, ne cihaz değişimi, ne sunucu.
   Kapı yalnız beyan YOKKEN açılır; kapanışı tek yoldan olur: seçim.

   YERİ: onboarding'in İLK adımı (02c `runPortreOnboarding`). Boot'ta değil —
   çünkü soru yeni üye olana sorulur ve sorulduğu anda anlamlı olması gerekir:
   bundan sonraki her cümle o dilde söylenecektir. Onboarding'i çoktan geçmiş
   bir kullanıcı dilini ayarlardan değiştirir (`openLangPicker`). */
export function langBeyanVar() {
  try { return !!localStorage.getItem('etw_lang'); } catch (_) { return false; }
}

let _langGateOnSecim = null;

export function openLangGate({ onSecim } = {}) {
  /* Guard'lar ATAMADAN önce: kapı zaten açıksa onu ilk açanın akışı bekliyor
     demektir — callback'i ezmek o akışı sessizce düşürürdü. */
  if (document.getElementById('lang-gate-overlay')) return;
  if (!document.body) return;
  _langGateOnSecim = typeof onSecim === 'function' ? onSecim : null;

  const overlay = document.createElement('div');
  overlay.id = 'lang-gate-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  /* Başlık İKİ dilde durur: hangi dili bildiğini bilmediğimiz birine tek
     dilde soru sormak, sorunun kendisini bir engele çevirir. Seçenekler
     her zaman kendi dillerinde yazılır (I18N_LANGS.name native addır). */
  overlay.innerHTML = `
    <div id="lang-gate-modal">
      <div id="lang-gate-mark" aria-hidden="true">✦</div>
      <div id="lang-gate-title">Hangi dilde konuşalım?</div>
      <div id="lang-gate-title-alt">Which language shall we speak?</div>
      <div id="lang-gate-list">
        ${Object.entries(I18N_LANGS).map(([code, info]) => `
          <button type="button" class="lang-gate-btn" data-lang="${code}" lang="${code}">
            <span class="lang-gate-flag" aria-hidden="true">${info.flag}</span>
            <span class="lang-gate-name">${info.name}</span>
          </button>`).join('')}
      </div>
      <div id="lang-gate-foot">Sonra ayarlardan değiştirebilirsin · You can change this later in settings</div>
    </div>`;

  overlay.querySelectorAll('.lang-gate-btn').forEach(btn => {
    btn.addEventListener('click', () => _langGateSec(btn.dataset.lang));
  });

  document.body.appendChild(overlay);
  void overlay.offsetWidth; // reflow zorla — geçiş animasyonu güvenilir tetiklensin
  overlay.classList.add('open');
  try { overlay.querySelector('.lang-gate-btn')?.focus(); } catch (_) {}
}

function _langGateSec(lang) {
  if (!I18N_LANGS[lang]) return;
  /* Beyan iki yere birden yazılır: ham localStorage boot'ta (auth/hydrate
     ÖNCESİ) okunabilen tek kaynaktır, SafeStorage ise hesapla birlikte
     taşınır. Yazma patlarsa dil yine uygulanır — kapı kullanıcıyı içeride
     kilitlemez. */
  try { localStorage.setItem(STORAGE_KEYS.LANG, lang); } catch (_) {}
  try { SafeStorage.setRaw(STORAGE_KEYS.LANG, lang); } catch (_) {}

  const overlay = document.getElementById('lang-gate-overlay');
  if (overlay) {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 240);
  }
  setLanguage(lang);

  /* Beyan alındı — akış devam edebilir. Callback SONRA koşar ki onboarding
     taze sözlükle kurulsun (dil değişimi `applyTranslations`'ı tetikler). */
  const devam = _langGateOnSecim;
  _langGateOnSecim = null;
  if (devam) { try { devam(lang); } catch (e) { console.warn('langGate devam:', e && e.message); } }
}

/* ═══ DİL SEÇİCİ MODAL ═══ */

export function openLangPicker() {
  w2CloseDrawer();
  const overlay = document.getElementById('lang-picker-overlay');
  const list    = document.getElementById('lang-picker-list');
  if (!overlay || !list) return;

  list.innerHTML = Object.entries(I18N_LANGS).map(([code, info]) => `
    <button
      class="lang-opt-btn${code === S._currentLang ? ' active' : ''}"
      onclick="requestLangChange('${code}')"
      aria-label="${info.name}"
    >
      <span class="lang-opt-flag">${info.flag}</span>
      <span class="lang-opt-name">${info.name}</span>
      ${code === S._currentLang ? '<span class="lang-opt-check">✓</span>' : ''}
    </button>`).join('');

  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('open'));
}

export function closeLangPicker() {
  const overlay = document.getElementById('lang-picker-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  setTimeout(() => { overlay.style.display = 'none'; }, 260);
}

/* Boot */
initI18n();
