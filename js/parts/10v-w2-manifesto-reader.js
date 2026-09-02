/* ═══════════════════════════════════════════════════════════════════
   10v — MANİFESTO OKUMA RİTÜELİ
   ───────────────────────────────────────────────────────────────────
   Hayal serisi için günlük Zihniyet Devrimi Manifestosu okuma ritüeli.
   12 maddeyi sırayla oku → her madde mühürlenir → Hayal kontrol
   listesi tamamlanır.

   YÜZEYLER:
     • OKUYUCU: tam-ekran slayt portalı (12 madde sırayla).
     • MÜHRÜM > 12 MÜHÜR: sealed sayısı toplam okuma günü sayısından
       alınır (mrTotalReadings). Her yeni tam okuma bir mühür açar.
     • HAYAL kontrol listesi: manifesto maddesi en başa eklenir;
       "Ayna" dan önce gelir.

   Kalıcılık: SafeStorage per-uid (etw_manifesto_reader_v1_<uid>).
   Konvansiyon: hardcoded TR string. TDZ güvenliği: window.mr* expose.
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage, showToast, localISODate, escapeHTML } from './00a-infrastructure.js';
import { t } from './15-i18n.js';

const MR_KEY = 'etw_manifesto_reader_v1';

/* Tek kaynak: escapeHTML (00a). Eskiden bu modülün kendi ikizi vardı;
   ikizler birbirinden de farklıydı (bir kısmı tek tırnağı kaçırmıyordu). */
const esc = escapeHTML;

function mrDayKey() {
  return localISODate();
}

function _uid() { return (S.currentUser && S.currentUser.id) || 'anon'; }
function _lkey() { return `${MR_KEY}_${_uid()}`; }
function _defLedger() { return { days: [], lastReadDay: null }; }

function _mrLoad() {
  try {
    const d = SafeStorage.get(_lkey());
    if (d && typeof d === 'object') {
      if (!S._manifestoReader) S._manifestoReader = _defLedger();
      Object.assign(S._manifestoReader, d);
    }
  } catch (_) {}
}

function _mrSave() {
  try { SafeStorage.set(_lkey(), S._manifestoReader); } catch (_) {}
}

export function mrDoneToday() {
  if (!S._manifestoReader) _mrLoad();
  return !!(S._manifestoReader && S._manifestoReader.lastReadDay === mrDayKey());
}

export function mrTotalReadings() {
  if (!S._manifestoReader) _mrLoad();
  return (S._manifestoReader && S._manifestoReader.days && S._manifestoReader.days.length) || 0;
}

function _completeToday() {
  if (!S._manifestoReader) S._manifestoReader = _defLedger();
  const key = mrDayKey();
  S._manifestoReader.lastReadDay = key;
  if (!S._manifestoReader.days.includes(key)) {
    S._manifestoReader.days.push(key);
    if (S._manifestoReader.days.length > 400) S._manifestoReader.days = S._manifestoReader.days.slice(-400);
  }
  _mrSave();
  try { window.usCheckHayalDay?.(); } catch (_) {}
}

/* ══════════════════════════════════════════════════════════════════
   12 MANİFESTO MADDESİ — Zihniyet Devrimi'ne Çağrı
   Her özet: konunun özünü ifade eden 2-3 cümle.
   Yapısal iskelet (roman + sigil) dil-bağımsız; ad/başlık/özet i18n
   sözlüğünden (mr.item.N.*) RENDER ANINDA okunur — modül-yükünde DONMASIN.
   İçerik = kitap "Mesele Sensin" tezi + İslami register (XII) korunur.
══════════════════════════════════════════════════════════════════ */
const MANIFESTO_META = [
  { roman: 'I',    sigil: 'truth'   },
  { roman: 'II',   sigil: 'niyet'   },
  { roman: 'III',  sigil: 'cross'   },
  { roman: 'IV',   sigil: 'mirror'  },
  { roman: 'V',    sigil: 'spiral'  },
  { roman: 'VI',   sigil: 'oath'    },
  { roman: 'VII',  sigil: 'shadow'  },
  { roman: 'VIII', sigil: 'rune'    },
  { roman: 'IX',   sigil: 'courage' },
  { roman: 'X',    sigil: 'elmas'   },
  { roman: 'XI',   sigil: 'silence' },
  { roman: 'XII',  sigil: 'void'    },
];

/* Dil-duyarlı 12 madde — her erişimde geçerli dilde yeniden kurulur */
export function manifesto12() {
  return MANIFESTO_META.map((m, i) => ({
    roman: m.roman,
    sigil: m.sigil,
    name:    t(`mr.item.${i}.name`),
    title:   t(`mr.item.${i}.title`),
    summary: t(`mr.item.${i}.summary`),
  }));
}

/* ══════════════════════════════════════════════════════════════════
   SİGİL SVG — aynı semboller (10-features-w2.js ile tutarlı)
══════════════════════════════════════════════════════════════════ */
function _sigilSVG(kind, size) {
  const c = 'var(--gold)'; const sw = 1.2;
  const defs = {
    oath:    `<circle cx="50" cy="50" r="36" fill="none" stroke="${c}" stroke-width="${sw}"/><circle cx="50" cy="50" r="28" fill="none" stroke="${c}" stroke-width="${sw*0.5}" opacity="0.5"/><path d="M50 22 L50 78 M22 50 L78 50" stroke="${c}" stroke-width="${sw*0.7}"/><path d="M50 36 L58 50 L50 64 L42 50 Z" fill="none" stroke="${c}" stroke-width="${sw}"/><circle cx="50" cy="50" r="3" fill="${c}"/>`,
    truth:   `<polygon points="50,18 80,68 20,68" fill="none" stroke="${c}" stroke-width="${sw}"/><circle cx="50" cy="52" r="6" fill="none" stroke="${c}" stroke-width="${sw}"/><line x1="50" y1="52" x2="50" y2="68" stroke="${c}" stroke-width="${sw}"/>`,
    shadow:  `<circle cx="50" cy="50" r="32" fill="none" stroke="${c}" stroke-width="${sw}"/><path d="M50 18 A32 32 0 0 0 50 82 Z" fill="${c}" opacity="0.7"/><circle cx="50" cy="50" r="4" fill="var(--bg)" stroke="${c}" stroke-width="${sw*0.7}"/>`,
    courage: `<path d="M50 14 L62 38 L86 42 L68 60 L74 86 L50 72 L26 86 L32 60 L14 42 L38 38 Z" fill="none" stroke="${c}" stroke-width="${sw}"/><circle cx="50" cy="50" r="4" fill="${c}"/>`,
    silence: `<circle cx="50" cy="50" r="34" fill="none" stroke="${c}" stroke-width="${sw}"/><line x1="30" y1="50" x2="70" y2="50" stroke="${c}" stroke-width="${sw}"/><line x1="20" y1="35" x2="80" y2="35" stroke="${c}" stroke-width="${sw*0.4}" opacity="0.6"/><line x1="20" y1="65" x2="80" y2="65" stroke="${c}" stroke-width="${sw*0.4}" opacity="0.6"/>`,
    mirror:  `<ellipse cx="50" cy="50" rx="28" ry="36" fill="none" stroke="${c}" stroke-width="${sw}"/><ellipse cx="50" cy="50" rx="14" ry="20" fill="none" stroke="${c}" stroke-width="${sw*0.6}" opacity="0.5"/><path d="M40 20 L60 20" stroke="${c}" stroke-width="${sw}"/>`,
    void:    `<circle cx="50" cy="50" r="34" fill="none" stroke="${c}" stroke-width="${sw}"/><circle cx="50" cy="50" r="20" fill="${c}" opacity="0.85"/>`,
    rune:    `<path d="M30 20 L30 80 M30 20 L60 50 M30 50 L60 80" fill="none" stroke="${c}" stroke-width="${sw}"/><circle cx="70" cy="35" r="3" fill="${c}"/>`,
    spiral:  `<path d="M50 50 m-30 0 a30 30 0 1 1 30 30 a22 22 0 1 1 -22 -22 a14 14 0 1 1 14 14 a6 6 0 1 1 -6 -6" fill="none" stroke="${c}" stroke-width="${sw}"/>`,
    cross:   `<path d="M50 18 L50 82 M18 50 L82 50" stroke="${c}" stroke-width="${sw}"/><circle cx="50" cy="50" r="14" fill="none" stroke="${c}" stroke-width="${sw}"/><circle cx="50" cy="50" r="3" fill="${c}"/>`,
    niyet:   `<path d="M14 50 Q50 22 86 50 Q50 78 14 50 Z" fill="none" stroke="${c}" stroke-width="${sw}"/><circle cx="50" cy="50" r="10" fill="none" stroke="${c}" stroke-width="${sw}"/><circle cx="50" cy="50" r="3" fill="${c}"/>`,
    elmas:   `<path d="M50 18 L74 38 L60 78 L40 78 L26 38 Z" fill="none" stroke="${c}" stroke-width="${sw}"/><path d="M26 38 L74 38 M50 18 L50 78 M40 78 L26 38 L50 18 L74 38 L60 78" fill="none" stroke="${c}" stroke-width="${sw*0.5}" opacity="0.55"/>`,
  };
  return `<svg class="mr-sigil-bg" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true">${defs[kind] || defs.oath}</svg>`;
}

/* ══════════════════════════════════════════════════════════════════
   READER PORTAL
══════════════════════════════════════════════════════════════════ */
let _mrIdx = 0;

export function mrOpenReader() {
  if (!S._manifestoReader) { S._manifestoReader = _defLedger(); _mrLoad(); }
  const existing = document.getElementById('mr-portal');
  if (existing) existing.remove();
  _mrIdx = 0;

  const portal = document.createElement('div');
  portal.id = 'mr-portal';
  portal.className = 'mr-portal';
  document.body.appendChild(portal);

  _mrRenderSlide(portal, false);
}

function _mrClose(portal) {
  portal.classList.add('mr-portal--out');
  setTimeout(() => { try { portal.remove(); } catch (_) {} }, 300);
}

function _mrRenderSlide(portal, animate) {
  const idx = _mrIdx;
  const item = manifesto12()[idx];
  const isLast = idx === MANIFESTO_META.length - 1;

  const dots = MANIFESTO_META.map((_, i) =>
    `<span class="mr-dot${i < idx ? ' mr-dot--done' : i === idx ? ' mr-dot--cur' : ''}"></span>`
  ).join('');

  portal.innerHTML = `
    <div class="mr-scene${animate ? ' mr-scene--in' : ''}" role="dialog" aria-modal="true" aria-label="Manifesto Okuma">
      <div class="mr-grain" aria-hidden="true"></div>

      <button class="mr-close" id="mr-close" aria-label="Kapat">✕</button>
      <div class="mr-kicker">${t('mr.call', 'ZİHNİYET DEVRİMİNE ÇAĞRI')} · ${idx + 1} / 12</div>

      <div class="mr-card${animate ? ' mr-card--in' : ''}" id="mr-card">
        ${_sigilSVG(item.sigil, 90)}
        <div class="mr-roman">${esc(item.roman)}</div>
        <div class="mr-title">${esc(item.title)}</div>
        <div class="mr-divider" aria-hidden="true"></div>
        <div class="mr-summary">${esc(item.summary)}</div>
      </div>

      <div class="mr-dots" aria-label="İlerleme">${dots}</div>

      <div class="mr-actions">
        ${isLast ? `
          <button class="mr-cta mr-cta--seal" id="mr-complete" type="button">${t('mr.complete', 'TAMAMLA · MÜHÜRLE')}</button>
          <button class="mr-link" id="mr-goto-full" type="button">${t('mr.goto_full', 'Tam Manifestoyu Oku → 12 Mühür')}</button>
        ` : `
          <button class="mr-cta" id="mr-next" type="button">${t('mr.next', 'İLERİ →')}</button>
        `}
      </div>
    </div>`;

  document.getElementById('mr-close')?.addEventListener('click', () => _mrClose(portal));

  document.getElementById('mr-next')?.addEventListener('click', () => {
    const card = document.getElementById('mr-card');
    if (card) {
      card.classList.add('mr-card--out');
      setTimeout(() => { _mrIdx++; _mrRenderSlide(portal, true); }, 200);
    } else { _mrIdx++; _mrRenderSlide(portal, false); }
  });

  document.getElementById('mr-complete')?.addEventListener('click', () => {
    const already = mrDoneToday();
    _mrClose(portal);
    setTimeout(() => {
      _completeToday();
      if (!already) showToast(t('mr.toast', 'Manifesto okundu · Hayal Mührü beslendi ◉'));
    }, 260);
  });

  document.getElementById('mr-goto-full')?.addEventListener('click', () => {
    _mrClose(portal);
    setTimeout(() => {
      try {
        if (window.switchView) window.switchView('muhrum');
        setTimeout(() => {
          const tab = document.querySelector('[data-tab="muhrum-manifesto"]');
          if (tab && window.wsTab) window.wsTab(tab, 'muhrum');
          else if (tab) tab.click();
        }, 320);
      } catch (_) {}
    }, 280);
  });
}

/* ══════════════════════════════════════════════════════════════════
   MÜHÜR DETAY — belirli bir manifesto maddesini açar (tüm mühürler)
══════════════════════════════════════════════════════════════════ */
export function mrOpenDetail(startIdx) {
  document.getElementById('mr-portal')?.remove();
  let _idx = Math.max(0, Math.min(MANIFESTO_META.length - 1, startIdx || 0));

  const portal = document.createElement('div');
  portal.id = 'mr-portal';
  portal.className = 'mr-portal';
  document.body.appendChild(portal);

  _mrRenderDetail(portal, _idx, false);
}

function _mrRenderDetail(portal, idx, animate) {
  const item = manifesto12()[idx];
  const totalRead = mrTotalReadings();
  const sealedCount = Math.min(12, totalRead);
  const isSealed = idx < sealedCount;
  const hasPrev = idx > 0;
  const hasNext = idx < MANIFESTO_META.length - 1;

  const sealBadge = isSealed
    ? `<span class="mr-detail-badge">✦ ${t('mr.sealed', 'MÜHÜRLÜ')}</span>`
    : `<span class="mr-detail-badge mr-detail-badge--open">${t('mr.open_seal', 'AÇIK MÜHÜR')}</span>`;

  portal.innerHTML = `
    <div class="mr-scene${animate ? ' mr-scene--in' : ''}" role="dialog" aria-modal="true" aria-label="${esc(item.title)}">
      <div class="mr-grain" aria-hidden="true"></div>
      <button class="mr-close" id="mr-close" aria-label="Kapat">✕</button>
      <div class="mr-kicker">${t('mr.call', 'ZİHNİYET DEVRİMİNE ÇAĞRI')} · ${idx + 1} / 12</div>

      <div class="mr-card${animate ? ' mr-card--in' : ''}" id="mr-card">
        ${_sigilSVG(item.sigil, 90)}
        <div class="mr-roman">${esc(item.roman)}</div>
        <div class="mr-name-label">${esc(item.name)}</div>
        <div class="mr-title">${esc(item.title)}</div>
        <div class="mr-divider" aria-hidden="true"></div>
        <div class="mr-summary">${esc(item.summary)}</div>
        <div class="mr-detail-seal-row">${sealBadge}</div>
      </div>

      <div class="mr-detail-nav">
        <button class="mr-nav-btn${hasPrev ? '' : ' mr-nav-btn--disabled'}" id="mr-dprev" ${hasPrev ? '' : 'disabled aria-disabled="true"'}>← ${t('mr.prev', 'ÖNCEKİ')}</button>
        <span class="mr-nav-pos">${esc(item.roman)}</span>
        <button class="mr-nav-btn${hasNext ? '' : ' mr-nav-btn--disabled'}" id="mr-dnext" ${hasNext ? '' : 'disabled aria-disabled="true"'}>${t('mr.next_nav', 'SONRAKİ')} →</button>
      </div>
    </div>`;

  document.getElementById('mr-close')?.addEventListener('click', () => _mrClose(portal));

  function _goTo(newIdx) {
    const card = document.getElementById('mr-card');
    const dir = newIdx > idx ? 1 : -1;
    if (card) {
      card.style.cssText = `opacity:0;transform:translateX(${dir * 18}px);transition:opacity .17s,transform .17s;`;
      setTimeout(() => _mrRenderDetail(portal, newIdx, true), 180);
    } else {
      _mrRenderDetail(portal, newIdx, false);
    }
  }

  document.getElementById('mr-dprev')?.addEventListener('click', () => { if (hasPrev) _goTo(idx - 1); });
  document.getElementById('mr-dnext')?.addEventListener('click', () => { if (hasNext) _goTo(idx + 1); });
}

/* ── window expose (TDZ-güvenli modüller-arası erişim) ── */
if (typeof window !== 'undefined') {
  window.mrOpenReader    = mrOpenReader;
  window.mrOpenDetail    = mrOpenDetail;
  window.mrDoneToday     = mrDoneToday;
  window.mrTotalReadings = mrTotalReadings;
  // MANIFESTO_12 her okumada geçerli dilde yeniden kurulur (10-features-w2.js
  // "12 Mühür" ızgarası window üzerinden okur; dil getter ile akar)
  Object.defineProperty(window, 'MANIFESTO_12', { get: manifesto12, configurable: true });
  window.mrSealedDays    = () => {
    if (!S._manifestoReader) _mrLoad();
    return [...((S._manifestoReader && S._manifestoReader.days) || [])];
  };
}
