/* ═══════════════════════════════════════════════════════════════
   13p — HUKUKİ ÇERÇEVE (Kullanım Koşulları · Gizlilik · Fikri Mülkiyet)
   FELSEFE: Wanderer bir "yer"dir; bu yerin kapısındaki sözleşme de aynı
   dili konuşur — ama içerik endüstri standardıdır: AI feragatnamesi,
   KVKK+GDPR hakları, mağaza aboneliği, IP koruması.
   - Belgeler TR + EN tam metin BU modülde yaşar (dict'e girmez; 11 ext
     dilde EN belge + dil notu gösterilir — hukuki metinde çeviri riski
     alınmaz, i18n dict parite bozulmaz).
   - hkOpen(kind) → sekmeli tören paneli (mektup-sheet estetiği, .hk-*)
   - mountHukukUI() → Ayarlar'a "Hukuki Çerçeve" bölümü (gdpr-section altı)
   - Auth ekranı bağları _src.html'de statiktir (kayıt onay satırı + footer).
═══════════════════════════════════════════════════════════════ */
import { S } from '../state.js';
import { t } from './15-i18n.js';
import { escapeHTML } from './00a-infrastructure.js';
import { ensureExt } from './00-ext-loader.js';

// export: tanışma paneli (03-auth-shell) bülten rızasının kaynak sürümünü
// (bulten_izin_surum) buradan okur — ikinci bir sürüm sabiti TANIMLANMAZ,
// tek gerçek burasıdır (Anayasa §1.3).
export const HK_VERSION = '1.3'; // 1.3: Kod kapısı — şifresiz giriş, kullanıcı adı, e-posta iletileri + bülten rızası ve teslimat kayıtları
const HK_EFFECTIVE = '2026-08-27'; // yürürlük tarihi (ISO) — metin güncellenince artır
const HK_CONTACT   = 'emre.gulluce.eg@gmail.com';

/* ─────────────────────────────────────────────────────────────
   BELGELER — markdown-lite format:
   "## Başlık" → bölüm başlığı · "- " → madde · boş satır → paragraf
───────────────────────────────────────────────────────────── */

/* Belge metinleri 13p2-hukuk-metin.js'te (sidecar — bundle diyeti):
   panel ilk açıldığında ext-hukuk.js iner, sabitler buradan enjekte edilir. */
let _hkDocsCache = null; // { tr: {...}, en: {...} }
let _hkP = null;

function _hkEnsureDocs() {
  if (_hkDocsCache) return Promise.resolve(true);
  if (_hkP) return _hkP;
  _hkP = ensureExt('hukuk').then(ns => {
    if (typeof ns?.buildHukukDocs !== 'function') throw new Error('hukuk namespace boş');
    _hkDocsCache = ns.buildHukukDocs({ HK_CONTACT, HK_EFFECTIVE });
    return true;
  }).catch(e => {
    _hkP = null; // geçici ağ hatası kalıcı olmasın
    console.error('hukuk sidecar yüklenemedi:', e);
    return false;
  });
  return _hkP;
}

/* Dış-dil hukuk paketi (K3) — tr/en'den FARKLI şema: sidecar doğrudan
   {terms,privacy,ip} döndürür ({tr,en} sarmalı yok, çünkü her dil kendi
   ülke-hukuku modülüyle tek başına native). Paket inene dek _hkDocs() EN'e düşer. */
const _hkLangCache = Object.create(null); // { [lang]: {terms,privacy,ip} }
const _hkLangP = new Map(); // lang → promise

function _hkEnsureLangDocs(lang) {
  if (lang === 'tr' || lang === 'en') return Promise.resolve(true);
  if (_hkLangCache[lang]) return Promise.resolve(true);
  if (_hkLangP.has(lang)) return _hkLangP.get(lang);
  const p = ensureExt('hukuk-' + lang).then(ns => {
    if (typeof ns?.buildHukukDocs !== 'function') throw new Error(`hukuk-${lang} namespace boş`);
    _hkLangCache[lang] = ns.buildHukukDocs({ HK_CONTACT, HK_EFFECTIVE });
    return true;
  }).catch(e => {
    _hkLangP.delete(lang); // geçici ağ hatası kalıcı olmasın
    console.error(`hukuk-${lang} sidecar yüklenemedi:`, e);
    return false;
  });
  _hkLangP.set(lang, p);
  return p;
}

/* Tek kapı: aktif dile göre ihtiyaç duyulan hukuk paket(ler)ini ensure eder. */
function _hkEnsureActive() {
  return Promise.all([_hkEnsureDocs(), _hkEnsureLangDocs(S._currentLang)]);
}

/* ─────────────────────────────────────────────────────────────
   RENDER — markdown-lite → HTML (escape sonrası; XSS-güvenli)
───────────────────────────────────────────────────────────── */

const HK_KINDS = ['terms', 'privacy', 'ip'];

function _hkDocs() {
  const lang = S._currentLang;
  const docs = _hkDocsCache || { tr: {}, en: {} };
  if (lang === 'tr') return docs.tr;
  if (lang === 'en') return docs.en;
  return _hkLangCache[lang] || docs.en; // native paket inene dek EN
}

function _hkInline(txt) {
  return escapeHTML(txt).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function _hkBodyHTML(body) {
  const out = [];
  let list = null;
  const flushList = () => { if (list) { out.push(`<ul>${list.join('')}</ul>`); list = null; } };
  for (const raw of String(body).split('\n')) {
    const line = raw.trim();
    if (!line) { flushList(); continue; }
    if (line.startsWith('## ')) {
      flushList();
      out.push(`<h2>${_hkInline(line.slice(3))}</h2>`);
    } else if (line.startsWith('- ')) {
      (list = list || []).push(`<li>${_hkInline(line.slice(2))}</li>`);
    } else {
      flushList();
      out.push(`<p>${_hkInline(line)}</p>`);
    }
  }
  flushList();
  return out.join('');
}

function _hkEffectiveStr() {
  try {
    return new Date(HK_EFFECTIVE + 'T00:00:00').toLocaleDateString(
      S._currentLang || 'tr', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (_) { return HK_EFFECTIVE; }
}

function _hkRenderDoc(kind) {
  const scroll = document.querySelector('#hk-panel .hk-scroll');
  if (!scroll) return;
  const doc = _hkDocs()[kind] || _hkDocs().terms;
  if (!doc) return; // sidecar henüz inmedi — hkOpen ensure sonrası yeniden çağırır
  scroll.innerHTML = `
    <div class="hk-eyebrow">${escapeHTML(t('hk.eyebrow', 'WANDERER · HUKUKİ ÇERÇEVE'))}</div>
    <h1 class="hk-title">${escapeHTML(doc.title)}</h1>
    <div class="hk-meta">${escapeHTML(t('hk.version', 'Sürüm {v} · Yürürlük: {d}').replace('{v}', HK_VERSION).replace('{d}', _hkEffectiveStr()))}</div>
    <div class="hk-divider" aria-hidden="true">✦</div>
    <div class="hk-body">${_hkBodyHTML(doc.body)}</div>
    <div class="hk-foot">© ${new Date(HK_EFFECTIVE).getFullYear()} Emre Güllüce · Wanderer Movement</div>`;
  scroll.scrollTop = 0;
  // Aktif sekmeyi işaretle
  document.querySelectorAll('#hk-panel .hk-tab').forEach(b => {
    b.classList.toggle('active', b.dataset.kind === kind);
    b.setAttribute('aria-selected', b.dataset.kind === kind ? 'true' : 'false');
  });
}

/* ─────────────────────────────────────────────────────────────
   PANEL — mektup-sheet estetiğinde sekmeli tören paneli
───────────────────────────────────────────────────────────── */

export function hkOpen(kind = 'terms') {
  hkClose();
  if (!HK_KINDS.includes(kind)) kind = 'terms';
  const panel = document.createElement('div');
  panel.id = 'hk-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', t('hk.eyebrow', 'WANDERER · HUKUKİ ÇERÇEVE'));
  panel.innerHTML = `
    <div class="hk-backdrop"></div>
    <div class="hk-sheet">
      <button class="hk-close" aria-label="${escapeHTML(t('common.close', 'Kapat'))}">✕</button>
      <div class="hk-tabs" role="tablist">
        <button class="hk-tab" role="tab" data-kind="terms">${escapeHTML(t('hk.terms', 'Kullanım Koşulları'))}</button>
        <button class="hk-tab" role="tab" data-kind="privacy">${escapeHTML(t('hk.privacy', 'Gizlilik Politikası'))}</button>
        <button class="hk-tab" role="tab" data-kind="ip">${escapeHTML(t('hk.ip', 'Fikri Mülkiyet'))}</button>
      </div>
      <div class="hk-scroll" tabindex="0"></div>
    </div>`;
  document.body.appendChild(panel);

  panel.querySelector('.hk-backdrop').addEventListener('click', hkClose);
  panel.querySelector('.hk-close').addEventListener('click', hkClose);
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') hkClose(); });
  panel.querySelectorAll('.hk-tab').forEach(b =>
    b.addEventListener('click', () =>
      _hkEnsureActive().then(() => _hkRenderDoc(b.dataset.kind))));

  // Panel anında açılır (sekmeler görünür); belge gövdesi sidecar inince dolar.
  _hkEnsureActive().then(() => _hkRenderDoc(kind));
  requestAnimationFrame(() => panel.classList.add('open'));
  document.body.style.overflow = 'hidden';
  panel.querySelector('.hk-close').focus({ preventScroll: true });
}

export function hkClose() {
  const panel = document.getElementById('hk-panel');
  if (!panel) return;
  panel.remove();
  // Mektup paneli gibi başka bir overlay açıksa scroll kilidini ona bırak
  if (!document.getElementById('mektup-panel') && !document.getElementById('km-panel')) {
    document.body.style.overflow = '';
  }
}

/* ─────────────────────────────────────────────────────────────
   AYARLAR — "Hukuki Çerçeve" bölümü (gdpr-section'ın hemen altı)
───────────────────────────────────────────────────────────── */

export function mountHukukUI() {
  const settingsContainer =
    document.getElementById('settings-form') ||
    document.querySelector('#settings-view .settings-content') ||
    document.querySelector('#settings-view');
  if (!settingsContainer) return;
  if (document.getElementById('hukuk-section')) return; // zaten mounted

  const section = document.createElement('div');
  section.id = 'hukuk-section';
  section.style.cssText = 'margin-top:32px;padding-top:24px;border-top:1px solid var(--border);';
  const rows = [
    ['terms',   t('hk.terms',   'Kullanım Koşulları')],
    ['privacy', t('hk.privacy', 'Gizlilik Politikası')],
    ['ip',      t('hk.ip',      'Fikri Mülkiyet')],
  ].map(([kind, label]) => `
    <button type="button" class="hk-settings-row" data-kind="${kind}">
      <span>${escapeHTML(label)}</span>
      <span class="hk-settings-arrow" aria-hidden="true">→</span>
    </button>`).join('');
  section.innerHTML = `
    <h3 style="font-family:var(--serif);font-size:16px;color:var(--text-mid);letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">
      ${escapeHTML(t('hk.section', 'Hukuki Çerçeve'))}
    </h3>
    <p style="font-size:12px;color:var(--text-dim);line-height:1.6;margin-bottom:16px;">
      ${escapeHTML(t('hk.section_desc', 'Wanderer ile aranızdaki sözleşme, verinin nasıl korunduğu ve eserin hakları.'))}
    </p>
    ${rows}
    <p style="font-size:11px;color:var(--text-dim);line-height:1.6;margin-top:10px;">
      ${escapeHTML(t('hk.version', 'Sürüm {v} · Yürürlük: {d}').replace('{v}', HK_VERSION).replace('{d}', _hkEffectiveStr()))}
    </p>`;

  // GDPR bölümünün hemen altına — "Verim & Hesabım"ın hukuki ikizi
  const gdpr = document.getElementById('gdpr-section');
  if (gdpr && gdpr.parentNode === settingsContainer) {
    gdpr.after(section);
  } else {
    settingsContainer.appendChild(section);
  }
  section.querySelectorAll('.hk-settings-row').forEach(b =>
    b.addEventListener('click', () => hkOpen(b.dataset.kind)));
}

/* Inline onclick erişimi — minify'a dayanıklı */
window.hkOpen  = hkOpen;
window.hkClose = hkClose;
window.mountHukukUI = mountHukukUI;
