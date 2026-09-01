/* ═══════════════════════════════════════════════════════════════════
   10E — GÖRDÜN · Pencereden Bakış (Üç Mühür'ün HAYAL vuruşu)
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre — Zihniyet Devrimi'ne Çağrı):
     Manifesto II: "Hayal âlemi hayal değildir" — fiziğe geçene dek
     OLMAK İSTEDİĞİN KİŞİNİN gözünden bakmayı sürdür. Yazı #151: hayalde
     dışarıdan İZLEME değil, o gözlerden YAŞAMA. GÖRDÜN, bunun günlük
     karşılığıdır: bir kontrol listesi değil, tek bir bakış anı.

   AKIŞ (tek portal, ~60-90sn):
     PENCERE (OİK kartı, lapis) → GÜNÜN PENCERESİ (kartın kendi
     maddelerinden deterministik seçilen tek düşünce/inanç/duygu/
     davranış — kota harcamaz) → BAKIŞ (nefes halkası + soru + isteğe
     bağlı tek cümle) → MÜHÜR (altın damga + usCheckHayalDay + varsa
     kilometre taşı + "Emre ile derinleş" köprüsü).

   VERİ: hiçbir yeni ledger yok — hayal ledgerinin (10u S._hayalMuhru)
   `visions` alanına yazar (usRecordVision/usGetTodayVision/
   usGetRecentVisions/usDeleteVision, 10u). Ledger merkezi doğruluk
   10u'da kalır; bu modül yalnız tören + günün penceresi mantığıdır.

   Konvansiyon: t()/i18n (gor.*), window.* TDZ-güvenli erişim, kart
   primitifleri yalnız 12c'den (ikv*), stiller css/parts/gordun.css.
═══════════════════════════════════════════════════════════════════ */

import { localISODate } from './00a-infrastructure.js';
import { ikvCardFace, ikvCardBack, ikvRing, ikvMilestoneScene, ikvEnsureStyles, ikvSeed } from './12c-kart-gorsel.js';
import { t } from './15-i18n.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CAT_KEYS = ['dusunceler', 'inanclar', 'duygular', 'davranislar'];
const _asText = (e) => (typeof e === 'string' ? e : (e && e.text) || '');

/* ════════════════════════════════════════════════════════════════════
   GÜNÜN PENCERESİ — OİK kartının kendi maddelerinden deterministik seçim
════════════════════════════════════════════════════════════════════ */
export function gorDayWindow() {
  let card = null;
  try { card = window.oikGetCard?.() || null; } catch (_) {}
  if (card && card.baslik) {
    const pool = [];
    CAT_KEYS.forEach(k => (card[k] || []).forEach(e => {
      const txt = _asText(e);
      if (txt) pool.push({ cat: k, text: txt });
    }));
    if (pool.length) {
      const rnd = ikvSeed(localISODate() + '|' + (card.id || card.baslik));
      const pick = pool[Math.floor(rnd() * pool.length)];
      return { source: 'oik', card, cat: pick.cat, catLabel: t('por.label.' + pick.cat), text: pick.text, name: card.baslik };
    }
    const fallbackText = card.whisper || card.olumlama || '';
    if (fallbackText) return { source: 'oik', card, cat: null, catLabel: '', text: fallbackText, name: card.baslik };
  }
  let desired = null;
  try { desired = window.oikGetDesired?.() || null; } catch (_) {}
  if (desired && desired.description) {
    return { source: 'desired', card: null, cat: null, catLabel: '', text: desired.description, name: desired.name };
  }
  return { source: 'empty', card: null, cat: null, catLabel: '', text: null, name: null };
}

/* ════════════════════════════════════════════════════════════════════
   SAHNE PARÇALARI
════════════════════════════════════════════════════════════════════ */
function _cardFaceHTML(win) {
  if (win.card) {
    return ikvCardFace(
      { id: 'gor_' + (win.card.id || 'kart'), name: win.name, whisper: win.card.whisper || '' },
      { palette: 'lapis', stage: 'pencere', mini: true, sub: '' }
    );
  }
  return `<div class="gor-card-fallback">${ikvCardBack({ mini: true })}</div>`;
}

function _windowBlockHTML(win) {
  if (win.source === 'empty') {
    return `
      <div class="gor-window gor-window--empty">
        <div class="gor-window-lbl">${esc(t('gor.window.lbl'))}</div>
        <div class="gor-empty-title">${esc(t('gor.window.empty_title'))}</div>
        <div class="gor-empty-body">${esc(t('gor.window.empty_body'))}</div>
        <button class="ikv-seal-btn" id="gor-design-cta" type="button">${esc(t('gor.window.empty_cta'))}</button>
      </div>`;
  }
  return `
    <div class="gor-window">
      <div class="gor-window-lbl">${esc(t('gor.window.lbl'))}</div>
      ${win.catLabel ? `<div class="gor-window-cat">${esc(win.catLabel)}</div>` : ''}
      <div class="gor-window-line">“${esc(win.text)}”</div>
    </div>`;
}

function _askHTML() {
  const ring = ikvRing(100, { size: 92, yol: true, cls: 'gor-ring', center: '<span class="gor-ring-glyph">◉</span>' });
  return `
    <div class="gor-ring-wrap">${ring}</div>
    <div class="gor-question">${esc(t('gor.question'))}</div>
    <input class="gor-input" id="gor-input" type="text" maxlength="240" placeholder="${esc(t('gor.placeholder'))}">
    <div class="gor-actions">
      <button class="ikv-seal-btn" id="gor-seal-btn" type="button">${esc(t('gor.seal_btn'))}</button>
      <button class="ikv-ghost-btn" id="gor-skip-btn" type="button">${esc(t('gor.skip_btn'))}</button>
    </div>`;
}

function _alreadyHTML(vision) {
  return `
    <div class="gor-already">
      <div class="gor-already-line">${esc(t('gor.already.line'))}</div>
      ${vision && vision.text ? `<div class="gor-already-quote">“${esc(vision.text)}”</div>` : ''}
      <button class="ikv-ghost-btn" id="gor-defter-cta" type="button">${esc(t('gor.already.cta'))}</button>
    </div>`;
}

function _sealedHTML(milestone) {
  return `
    <div class="gor-seal-stage"><div class="gor-seal-stamp" aria-hidden="true">◆</div></div>
    <div class="gor-seal-line">${esc(t('gor.sealed.line'))}</div>
    ${milestone ? `
      <div class="gor-milestone">
        <div class="gor-milestone-thumb">${ikvMilestoneScene(milestone.d, { palette: 'lapis' })}</div>
        <div class="gor-milestone-label">${esc(t('gor.sealed.milestone').replace('{d}', milestone.d).replace('{name}', milestone.name))}</div>
      </div>` : ''}
    <button class="ikv-ghost-btn" id="gor-derinles-btn" type="button">${esc(t('gor.derinles'))}</button>
    <button class="ikv-ghost-btn" id="gor-close2" type="button">${esc(t('gor.close'))}</button>`;
}

/* ════════════════════════════════════════════════════════════════════
   PORTAL — #gor-portal (fixed, --z-ceremony; oik-read-portal kalıbı)
════════════════════════════════════════════════════════════════════ */
function _closeGor(portal) {
  window.wtOverlayClose?.('bakis');   // Kullanım Nabzı (00f)
  portal.classList.remove('gor-in');
  portal.classList.add('gor-out');
  setTimeout(() => portal.remove(), 320);
}

export function gorOpen() {
  if (document.getElementById('gor-portal')) return;
  window.wtOverlayOpen?.('bakis');    // Kullanım Nabzı (00f)
  ikvEnsureStyles();
  // Saat tonu CSS'ten iner (--sky-scene, base.css) — sınıf kopyalanmaz.
  let already = null;
  try { already = window.usGetTodayVision?.() || null; } catch (_) {}
  const win = gorDayWindow();

  const portal = document.createElement('div');
  portal.id = 'gor-portal';
  portal.innerHTML = `
    <div class="gor-scene" role="dialog" aria-modal="true" aria-label="${esc(t('gor.aria.scene'))}">
      <div class="gor-sky" aria-hidden="true"></div>
      <div class="gor-grain" aria-hidden="true"></div>
      <button class="gor-close" id="gor-close" aria-label="${esc(t('gor.close'))}">✕</button>
      <div class="gor-scroll">
        <div class="gor-body ikv-cascade">
          <div class="gor-kicker" style="--i:0">${esc(t('gor.kicker'))}</div>
          <div class="gor-titleline" style="--i:1">${esc(t('gor.title'))}</div>
          <div class="gor-card" style="--i:2">${_cardFaceHTML(win)}</div>
          <div class="gor-quote" style="--i:3">${esc(t('gor.quote.manifesto'))}</div>
          <div class="gor-instruction" style="--i:4">${esc(t('gor.instruction'))}</div>
          <div class="gor-window-slot" style="--i:5">${_windowBlockHTML(win)}</div>
          <div class="gor-main-slot" style="--i:6">${
            already ? _alreadyHTML(already) : (win.source === 'empty' ? '' : _askHTML())
          }</div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(portal);
  requestAnimationFrame(() => portal.classList.add('gor-in'));

  portal.querySelector('#gor-close')?.addEventListener('click', () => _closeGor(portal));
  portal.querySelector('#gor-defter-cta')?.addEventListener('click', () => {
    _closeGor(portal);
    setTimeout(() => { try { window.usOpenDetail?.('hayal'); } catch (_) {} }, 300);
  });
  portal.querySelector('#gor-design-cta')?.addEventListener('click', () => {
    _closeGor(portal);
    setTimeout(() => { try { window.switchView?.('oik'); } catch (_) {} }, 300);
  });
  portal.querySelector('#gor-seal-btn')?.addEventListener('click', () => {
    const inp = portal.querySelector('#gor-input');
    _seal(portal, win, inp ? inp.value.trim() : '');
  });
  portal.querySelector('#gor-skip-btn')?.addEventListener('click', () => _seal(portal, win, ''));
}

/* Mühürle — visions'a yaz, hayal mührünü kontrol et, varsa kilometre taşını
   göster, altın damga + his motoru cue'su. */
function _seal(portal, win, text) {
  try { window.usRecordVision?.(text); } catch (_) {}
  let added = false;
  try { added = !!window.usCheckHayalDay?.(); } catch (_) {}
  let milestone = null;
  try {
    const st = window.usSeriesState?.('hayal');
    if (added && st && st.cards && st.cards[String(st.n)]) {
      milestone = (st.cfg.cards || []).find(c => c.d === st.n) || null;
    }
  } catch (_) {}
  try { window.fxCue?.(milestone ? ('milestone' + (milestone.tier || 2)) : 'seal'); } catch (_) {}

  const slot = portal.querySelector('.gor-main-slot');
  if (slot) slot.innerHTML = _sealedHTML(milestone);

  portal.querySelector('#gor-close2')?.addEventListener('click', () => _closeGor(portal));
  portal.querySelector('#gor-derinles-btn')?.addEventListener('click', () => _derinles(portal, win, text));
}

/* "Emre ile derinleş" — sohbete köprü (10-features-w2 wsGreetingSend kalıbı):
   kullanıcının kendi cümlesiyle ön-doldurulmuş mesaj, otomatik gönderilir. */
function _derinles(portal, win, text) {
  const tmpl = text ? t('gor.derinles.msg') : t('gor.derinles.msg_silent');
  const msg = tmpl.replace('{focus}', win.text || '').replace('{text}', text || '');
  _closeGor(portal);
  try { window.switchView?.('chat'); } catch (_) {}
  setTimeout(() => {
    const inp = document.getElementById('chat-input');
    if (inp) {
      inp.value = msg;
      try { window.autoResize?.(inp); } catch (_) {}
      try { inp.focus(); } catch (_) {}
    }
    try { window.sendMessage?.(); } catch (_) {}
  }, 320);
}

/* ── window expose (TDZ-güvenli modüller-arası erişim + inline) ── */
if (typeof window !== 'undefined') {
  window.gorOpen = gorOpen;
  window.gorDayWindow = gorDayWindow;
}
