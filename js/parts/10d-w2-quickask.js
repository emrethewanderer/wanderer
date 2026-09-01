/* ═══════════════════════════════════════════════════════════════
   10d — W2 QUICK-ASK + DAILY THOUGHT
   Emre'ye Sor (Calendly takvim) + günlük düşünce.
   10-features-w2.js'ten extract edildi.
═══════════════════════════════════════════════════════════════ */
import { S } from '../state.js';
import { t } from './15-i18n.js';

/* ═══ EMRE'YE SOR — 1-1 RANDEVU TAKVİMİ ═══
   Admin panelinden girilen Calendly linki ile takvim gömülür.
   Calendly script'i CDN'den lazy olarak yüklenir. Başarısız olursa yeni sekmede açılır.
*/
let _calendlyScriptLoaded = false;
let _calendlyScriptLoading = null;

function _loadCalendlyScript() {
  if (_calendlyScriptLoaded) return Promise.resolve(true);
  if (_calendlyScriptLoading) return _calendlyScriptLoading;

  _calendlyScriptLoading = new Promise((resolve) => {
    // CSS
    if (!document.querySelector('link[data-calendly]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://assets.calendly.com/assets/external/widget.css';
      link.setAttribute('data-calendly', '1');
      document.head.appendChild(link);
    }
    // JS
    const existing = document.querySelector('script[data-calendly]');
    if (existing) {
      if (window.Calendly) { _calendlyScriptLoaded = true; resolve(true); return; }
      existing.addEventListener('load', () => { _calendlyScriptLoaded = true; resolve(true); });
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://assets.calendly.com/assets/external/widget.js';
    s.async = true;
    s.setAttribute('data-calendly', '1');
    s.onload = () => { _calendlyScriptLoaded = true; resolve(true); };
    s.onerror = () => resolve(false);
    document.head.appendChild(s);

    setTimeout(() => { if (!_calendlyScriptLoaded) resolve(false); }, 6000);
  });
  return _calendlyScriptLoading;
}

function _calendlyShowState(state) {
  const ids = {
    loading:      'quickask-loading',
    unconfigured: 'quickask-unconfigured',
    embedded:     'quickask-calendly-wrap',
    external:     'quickask-external'
  };
  Object.entries(ids).forEach(([k, id]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = (k === state) ? (k === 'embedded' ? 'block' : (k === 'loading' ? 'flex' : 'block')) : 'none';
  });
}

export async function openQuickAsk() {
  const menu = document.getElementById('global-menu');
  if (menu) menu.classList.remove('open');
  document.getElementById('quickask-overlay')?.classList.add('open');
  _calendlyShowState('loading');

  const url = (S.settings && S.settings.calendly_url) ? String(S.settings.calendly_url).trim() : '';

  if (!url || !/calendly\.com/i.test(url)) {
    _calendlyShowState('unconfigured');
    return;
  }

  const extLink = document.getElementById('quickask-external-link');
  if (extLink) extLink.href = url;

  const loaded = await _loadCalendlyScript();

  if (!loaded || !window.Calendly) {
    _calendlyShowState('external');
    return;
  }

  const wrap = document.getElementById('quickask-calendly-wrap');
  if (!wrap) { _calendlyShowState('external'); return; }
  wrap.innerHTML = '';

  try {
    window.Calendly.initInlineWidget({
      url: url,
      parentElement: wrap,
      prefill: {
        name: (S.currentUser && (S.currentUser.user_metadata?.full_name || S.currentUser.email?.split('@')[0])) || undefined,
        email: (S.currentUser && S.currentUser.email) || undefined
      },
      utm: {}
    });
    _calendlyShowState('embedded');
  } catch (e) {
    console.warn('Calendly embed hatası:', e.message);
    _calendlyShowState('external');
  }
}

/* ═══ EMRE'NİN GÜNLÜK DÜŞÜNCESİ ═══
   14 aforizma; içerik dict'te daily.thought.0..13 (TR+EN paralel). */
const DAILY_THOUGHTS_COUNT = 14;
const _dailyThought = (i) => t(`daily.thought.${i}`);

export function showDailyThought() {
  const dayIndex = Math.floor(Date.now() / 86400000) % DAILY_THOUGHTS_COUNT;
  const text = _dailyThought(dayIndex);
  const el = document.getElementById('daily-thought-text');
  if (el) el.textContent = text;
  const el2 = document.getElementById('drawer-daily-thought');
  if (el2) el2.textContent = text;
  const el3 = document.getElementById('admin-daily-thought');   // yönetim gömülü stüdyo plaketi
  if (el3) el3.textContent = text;
}
