/* ═══════════════════════════════════════════════════════════════════
   10n — DİNLENME · BAŞARI GÜNLÜĞÜ
   ───────────────────────────────────────────────────────────────────
   FELSEFE:
     Yol uzun. Yorulduğunda savaşa değil, kendi kanıtlarına dönersin.
     Dinlenme; kullanıcının geçmiş başarılarını TARİH TARİH yazıp
     istediği an girip okuyabildiği dingin bir mühür defteridir.
     "Ne kadar yol aldığını unuttuğunda, buraya çekilirsin."

   Drawer'dan ya da Bugün ekranındaki karttan açılır (dinlenme-view).
   Üstte gerçek verilerle beslenen dingin bir şerit (gün serisi /
   mühürlenen başarı / dolu gün), altında tarih bazlı başarı günlüğü.

   başarı = { id, date(YYYY-MM-DD), title, text, created_at }
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage, showToast, recordActivityDay } from './00a-infrastructure.js';
import { awardElmas } from './10g-w2-wanderer-game.js';
import { t } from './15-i18n.js';

const STORAGE_KEY = 'etw_dinlenme_v1';
const LEGACY_STORAGE_KEY = 'etw_siginak_v1'; // eski "Sığınak" adından göç
const NOW = () => new Date().toISOString();
const UID = () => 'dn_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const MAX = 500;
const PHOTO_MAX_PX = 900;
const PHOTO_QUALITY = 0.8;

const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Etki puanı — olayın kullanıcının hayatındaki yeri (1–5); etiketler i18n'den
   render anında çözülür (dil donmasın). [[tr-en-i18n-tamamlama]] */
const _impactLabel = (n) => t(`dn.impact.${Math.max(1, Math.min(5, +n || 3))}`);
let _pendingImpact = 3; // form için seçili etki (varsayılan: Önemli)
let _pendingPhotoData = null; // base64 data URL — form'a eklenen fotoğraf

function _todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/* "2026-05-30" → { day:"30", month:"MAYIS", dow:"Cuma", full:"30 Mayıs 2026" }
   Ay/gün adları aktif dile göre Intl ile lokalize edilir. */
function _fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return { day: '', month: '', dow: '', full: iso || '' };
  const y = +m[1], mo = +m[2] - 1, da = +m[3];
  const d = new Date(y, mo, da);
  const loc = S._currentLang || 'tr';
  return {
    day: String(da),
    month: new Intl.DateTimeFormat(loc, { month: 'long' }).format(d).toLocaleUpperCase(loc),
    dow: new Intl.DateTimeFormat(loc, { weekday: 'long' }).format(d),
    full: new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'long', year: 'numeric' }).format(d),
  };
}

/* Etki ölçeri — dolu/boş elmaslar + erişilebilir etiket */
function _impactMeter(n) {
  const v = Math.max(1, Math.min(5, +n || 3));
  const label = _impactLabel(v);
  let dots = '';
  for (let i = 1; i <= 5; i++) {
    dots += `<span class="dn-meter-dot${i <= v ? ' is-on' : ''}">◆</span>`;
  }
  return `<div class="dn-entry-impact" title="${_esc(label)}" aria-label="${_esc(t('dn.impact_aria_prefix'))} ${_esc(label)}">${dots}<span class="dn-entry-impact-label">${_esc(label)}</span></div>`;
}

/* ══════════════════════════════════════════════════════════════
   PERSİSTANS
══════════════════════════════════════════════════════════════ */
export function dnSave() {
  try {
    const uid = S.currentUser?.id || 'anon';
    SafeStorage.set(`${STORAGE_KEY}_${uid}`, {
      achievements: S._dinlenme.achievements,
      lastReadDay: S._dinlenme.lastReadDay || null,
      onboarded: !!S._dinlenme.onboarded,
    });
  } catch (e) { console.warn('dnSave:', e?.message); }
}

export function dnLoad() {
  try {
    const uid = S.currentUser?.id || 'anon';
    let data = SafeStorage.get(`${STORAGE_KEY}_${uid}`);
    // Eski "Sığınak" anahtarından tek seferlik göç
    if (!(data && Array.isArray(data.achievements))) {
      const legacy = SafeStorage.get(`${LEGACY_STORAGE_KEY}_${uid}`);
      if (legacy && Array.isArray(legacy.achievements)) {
        data = legacy;
        S._dinlenme.achievements = legacy.achievements;
        dnSave(); // yeni anahtara taşı
        return;
      }
    }
    if (data && Array.isArray(data.achievements)) {
      S._dinlenme.achievements = data.achievements;
      S._dinlenme.lastReadDay = data.lastReadDay || null;
      // 'onboarded' yeni bir alan. Kaydedilmemişse (eski kullanıcı): zaten
      // başarısı varsa rehberi atla — yeni üye değil. Boş defterse rehberi göster.
      S._dinlenme.onboarded = (typeof data.onboarded === 'boolean')
        ? data.onboarded
        : data.achievements.length > 0;
    }
  } catch (e) { console.warn('dnLoad:', e?.message); }
}

export function dnInit() {
  dnLoad();
  if (typeof window !== 'undefined') window.dnReadDoneToday = dnReadDoneToday;
}

/* ══════════════════════════════════════════════════════════════
   GÜNLÜK OKUMA — Dinlenme'yi günde bir kez okumak Hayal Mührü'nü besler.
   "Yorulduğunda savaşa değil kanıtlarına dönersin": her gün buraya çekilmek,
   bütün ritüelin (Hayal) dinlenme ayağıdır.
══════════════════════════════════════════════════════════════ */
export function dnReadDoneToday() {
  try { return (S._dinlenme?.lastReadDay || '') === _todayISO(); } catch (_) { return false; }
}

/* Görünüm açıldığında bugünü "okundu" mühürle; yeni günse Hayal'i tazele. */
function _markReadToday() {
  const today = _todayISO();
  if (S._dinlenme.lastReadDay === today) return false;
  S._dinlenme.lastReadDay = today;
  dnSave();
  try { window.usCheckHayalDay?.({ silent: true }); } catch (_) {}
  return true;
}

/* ══════════════════════════════════════════════════════════════
   FOTOĞRAF — form yardımcıları
══════════════════════════════════════════════════════════════ */
export function dnPickPhoto() {
  document.getElementById('dn-photo-input')?.click();
}

export function dnPhotoSelected(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast(t('dn.toast.pick_image')); return; }
  const reader = new FileReader();
  reader.onload = (e) => _resizeImage(e.target.result, PHOTO_MAX_PX, (data) => {
    _pendingPhotoData = data;
    _renderPhotoPreview();
  });
  reader.readAsDataURL(file);
}

function _resizeImage(dataUrl, maxPx, cb) {
  const img = new Image();
  img.onload = () => {
    let w = img.width, h = img.height;
    if (w > maxPx || h > maxPx) {
      if (w >= h) { h = Math.round(h * maxPx / w); w = maxPx; }
      else { w = Math.round(w * maxPx / h); h = maxPx; }
    }
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(img, 0, 0, w, h);
    cb(cv.toDataURL('image/jpeg', PHOTO_QUALITY));
  };
  img.src = dataUrl;
}

function _renderPhotoPreview() {
  const wrap = document.getElementById('dn-form-photo-wrap');
  if (!wrap) return;
  if (_pendingPhotoData) {
    wrap.innerHTML = `
      <div class="dn-form-photo-preview">
        <img src="${_pendingPhotoData}" class="dn-form-photo-img" alt="${_esc(t('dn.preview'))}">
        <button class="dn-form-photo-remove" onclick="dnRemovePendingPhoto()" aria-label="${_esc(t('dn.remove_photo'))}">×</button>
      </div>`;
  } else {
    wrap.innerHTML = '';
  }
}

export function dnRemovePendingPhoto() {
  _pendingPhotoData = null;
  _renderPhotoPreview();
  const inp = document.getElementById('dn-photo-input');
  if (inp) inp.value = '';
}

/* ══════════════════════════════════════════════════════════════
   İSTATİSTİK — gerçek verilerle beslenen dingin şerit
══════════════════════════════════════════════════════════════ */
export function getDinlenmeStats() {
  const list = S._dinlenme.achievements || [];
  const days = new Set(list.map(a => a.date));
  // Gün serisi: Geçiş Alanı ritüel streak'i (varsa) — yoldaki ardışık gün
  let streak = 0;
  try { streak = window.oikGetStats?.()?.streak || 0; } catch (_) {}
  return { total: list.length, days: days.size, streak };
}

/* ══════════════════════════════════════════════════════════════
   GÖRÜNÜM
══════════════════════════════════════════════════════════════ */
export function loadDinlenmeView() {
  _renderHero();
  _renderList();
  // Form tarih alanını bugüne ayarla (boşsa)
  const dateEl = document.getElementById('dn-date');
  if (dateEl && !dateEl.value) dateEl.value = _todayISO();
  _renderImpactPicker();
  // Günde bir kez okumak Hayal Mührü'nü besler
  _markReadToday();
  // Üyeliğin ilk açılışında: geçmiş başarıları toplayan rehberli giriş (bir kez)
  if (!S._dinlenme.onboarded) setTimeout(dnOpenOnboarding, 220);
}

/* Form içindeki etki seçicisini güncelle (seçili değer + etiket) */
function _renderImpactPicker() {
  const dots = document.querySelectorAll('#dn-impact-dots .dn-impact-dot');
  dots.forEach(d => {
    const v = +d.dataset.val;
    d.classList.toggle('is-on', v <= _pendingImpact);
    d.setAttribute('aria-checked', v === _pendingImpact ? 'true' : 'false');
  });
  const nameEl = document.getElementById('dn-impact-name');
  if (nameEl) nameEl.textContent = _impactLabel(_pendingImpact);
}

export function dnSetImpact(n) {
  _pendingImpact = Math.max(1, Math.min(5, +n || 3));
  _renderImpactPicker();
}

function _renderHero() {
  const st = getDinlenmeStats();
  const sub = document.getElementById('dn-hero-sub');
  if (sub) {
    sub.textContent = st.total > 0
      ? t('dn.hero.sub').replace('{n}', st.total).replace('{d}', st.days)
      : t('dn.hero.empty');
  }
  const map = { 'dn-stat-streak': st.streak, 'dn-stat-total': st.total, 'dn-stat-days': st.days };
  for (const [id, val] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val);
  }
}

function _renderList() {
  const wrap = document.getElementById('dn-list');
  const empty = document.getElementById('dn-empty');
  if (!wrap) return;

  const list = (S._dinlenme.achievements || []).slice();
  if (list.length === 0) {
    wrap.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  // Tarihe göre grupla (yeni → eski), grup içinde son eklenen üstte
  const groups = {};
  for (const a of list) (groups[a.date] = groups[a.date] || []).push(a);
  const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  wrap.innerHTML = dates.map(date => {
    const f = _fmtDate(date);
    const items = groups[date].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    const rows = items.map(a => `
      <div class="dn-entry${a.photo ? ' has-photo' : ''}" id="dn-entry-${_esc(a.id)}" onclick="dnOpenEntry('${_esc(a.id)}')" role="button" tabindex="0" aria-label="${_esc(t('dn.victory_detail'))}">
        <div class="dn-entry-mark">✦</div>
        <div class="dn-entry-body">
          ${a.title ? `<div class="dn-entry-title">${_esc(a.title)}</div>` : ''}
          <div class="dn-entry-text">${_esc(a.text)}</div>
          ${_impactMeter(a.impact)}
        </div>
        ${a.photo ? `<div class="dn-entry-cameo"><img src="${a.photo}" alt="${_esc(t('dn.victory_photo'))}" loading="lazy"></div>` : ''}
        <button class="dn-entry-del" onclick="event.stopPropagation();dnDelete('${_esc(a.id)}')" aria-label="${_esc(t('dn.delete'))}" title="${_esc(t('dn.delete'))}">×</button>
      </div>`).join('');
    return `
      <div class="dn-day-group">
        <div class="dn-day-head">
          <div class="dn-day-cal">
            <div class="dn-day-cal-month">${_esc(f.month)}</div>
            <div class="dn-day-cal-num">${_esc(f.day)}</div>
          </div>
          <div class="dn-day-meta">
            <div class="dn-day-full">${_esc(f.full)}</div>
            <div class="dn-day-dow">${_esc(f.dow)} · ${t('dn.seals_count').replace('{n}', items.length)}</div>
          </div>
        </div>
        <div class="dn-day-entries">${rows}</div>
      </div>`;
  }).join('');
}

/* ══════════════════════════════════════════════════════════════
   AKSİYONLAR
══════════════════════════════════════════════════════════════ */
/* Tek bir başarıyı deftere mühürle (form + rehber paylaşır) → eklenen kayıt */
function _pushAchievement({ date, title, text, impact, photo }) {
  const entry = {
    id: UID(),
    date,
    title: title || '',
    text,
    impact: Math.max(1, Math.min(5, impact || 3)),
    photo: photo || null,
    created_at: NOW(),
  };
  S._dinlenme.achievements.push(entry);
  if (S._dinlenme.achievements.length > MAX) S._dinlenme.achievements.shift();
  dnSave();
  // Yüksek etkili anılar biraz daha fazla Elmas getirir (hayatındaki yeri ölçüsünde)
  try { awardElmas(2 + entry.impact, 'dinlenme'); } catch (_) {}
  return entry;
}

export function dnAdd() {
  const dateEl = document.getElementById('dn-date');
  const titleEl = document.getElementById('dn-title');
  const textEl = document.getElementById('dn-text');

  const date = (dateEl?.value || _todayISO()).trim();
  const title = (titleEl?.value || '').trim().slice(0, 120);
  const text = (textEl?.value || '').trim().slice(0, 2000);

  if (!text) { showToast(t('dn.toast.write_achievement')); textEl?.focus(); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { showToast(t('dn.toast.valid_date')); return; }

  const impact = Math.max(1, Math.min(5, _pendingImpact || 3));
  const photo = _pendingPhotoData || null;
  _pushAchievement({ date, title, text, impact, photo });

  // Formu temizle ama tarihi koru (aynı güne birden çok başarı eklenebilir)
  if (titleEl) titleEl.value = '';
  if (textEl) textEl.value = '';
  _pendingImpact = 3;
  _pendingPhotoData = null;
  _renderImpactPicker();
  _renderPhotoPreview();
  const inp = document.getElementById('dn-photo-input');
  if (inp) inp.value = '';
  _renderHero();
  _renderList();
  recordActivityDay();  // emek sayar: yazılan başarı günü seriye yazar
  try { window.wtLogRitus?.('dinlenme', 'tamam', { n: impact }); } catch (_) {}
  showToast(t('dn.toast.sealed'));
}

export function dnDelete(id) {
  const before = S._dinlenme.achievements.length;
  S._dinlenme.achievements = S._dinlenme.achievements.filter(a => a.id !== id);
  if (S._dinlenme.achievements.length === before) return;
  dnSave();
  _renderHero();
  _renderList();
}

/* ══════════════════════════════════════════════════════════════
   LİGHTBOX — zafer kartı büyütme
══════════════════════════════════════════════════════════════ */
export function dnOpenEntry(id) {
  const a = (S._dinlenme.achievements || []).find(x => x.id === id);
  if (!a) return;
  if (document.getElementById('dn-lightbox')) return; // zaten açık

  const f = _fmtDate(a.date);
  const cameoHtml = a.photo ? `
    <div class="dn-lbox-cameo" onclick="event.stopPropagation();dnOpenPhotoZoom('${a.photo.replace(/'/g,'%27')}')" title="${_esc(t('dn.zoom_hint'))}">
      <img src="${a.photo}" alt="${_esc(t('dn.victory_photo'))}">
    </div>` : '';

  document.body.insertAdjacentHTML('beforeend', `
    <div class="dn-lightbox" id="dn-lightbox" role="dialog" aria-modal="true" aria-label="${_esc(t('dn.victory_detail'))}">
      <div class="dn-lbox-card">
        <div class="dn-lbox-header">
          <div class="dn-lbox-date-row">
            <div class="dn-lbox-cal">
              <div class="dn-lbox-cal-month">${_esc(f.month)}</div>
              <div class="dn-lbox-cal-num">${_esc(f.day)}</div>
            </div>
            <div class="dn-lbox-meta">
              <div class="dn-lbox-full">${_esc(f.full)}</div>
              <div class="dn-lbox-dow">${_esc(f.dow)}</div>
            </div>
          </div>
          ${cameoHtml}
        </div>
        ${a.title ? `<div class="dn-lbox-title">${_esc(a.title)}</div>` : ''}
        <div class="dn-lbox-text">${_esc(a.text)}</div>
        ${_impactMeter(a.impact)}
        <button class="dn-lbox-close" onclick="dnCloseLightbox()" aria-label="${_esc(t('dn.close'))}">×</button>
      </div>
      <div class="dn-lbox-backdrop" onclick="dnCloseLightbox()"></div>
    </div>`);

  // ESC ile kapat
  const _onKey = (e) => { if (e.key === 'Escape') { dnCloseLightbox(); document.removeEventListener('keydown', _onKey); } };
  document.addEventListener('keydown', _onKey);
  document.getElementById('dn-lightbox')?.querySelector('.dn-lbox-card')?.focus();
}

export function dnCloseLightbox() {
  document.getElementById('dn-lightbox')?.remove();
}

/* ── Fotoğraf tam ekran zoom ── */
export function dnOpenPhotoZoom(src) {
  if (document.getElementById('dn-photo-zoom')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="dn-photo-zoom" id="dn-photo-zoom" onclick="dnClosePhotoZoom()">
      <img src="${src}" class="dn-photo-zoom-img" onclick="event.stopPropagation()" alt="${_esc(t('dn.victory_photo'))}">
      <button class="dn-photo-zoom-close" onclick="dnClosePhotoZoom()" aria-label="${_esc(t('dn.close'))}">×</button>
    </div>`);
  const _onKey = (e) => { if (e.key === 'Escape') { dnClosePhotoZoom(); document.removeEventListener('keydown', _onKey); } };
  document.addEventListener('keydown', _onKey);
}

export function dnClosePhotoZoom() {
  document.getElementById('dn-photo-zoom')?.remove();
}

/* ══════════════════════════════════════════════════════════════
   REHBERLİ İLK GİRİŞ — "Geçmişini Mühürle"
   ───────────────────────────────────────────────────────────────
   FELSEFE ("Mesele Sensin"): savaşa başlamadan önce, buraya gelene
   kadar kazandığın şeyleri hatırla. Yol yorucu; ilk günden bir
   kanıt destesi kurarsan, yorulduğunda dönecek bir yerin olur.
   İstasyon istasyon (Bireysel · İlişki · İş · Aklına Gelen) geçmiş
   zaferleri toplar; her biri BUGÜN mühürlenir. Bir kez yapılınca
   (onboarded=true) bir daha açılmaz — kullanıcı kendi başına ekler.
══════════════════════════════════════════════════════════════ */
/* İstasyon iskeleti — sayı sabit; metinler i18n'den render anında çözülür. */
const OB_STATION_COUNT = 4;
const _obStation = (i) => ({ tag: t(`dn.ob.st${i}.tag`), prompt: t(`dn.ob.st${i}.prompt`), ph: t(`dn.ob.st${i}.ph`) });
let _obStep = 0;     // 0=giriş · 1..N=istasyon · N+1=kapanış
let _obImpact = 3;
let _obSealed = 0;

export function dnOpenOnboarding() {
  if (S._dinlenme.onboarded) return;
  if (document.getElementById('dn-onboard')) return;
  _obStep = 0; _obImpact = 3; _obSealed = 0;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="dn-ob" id="dn-onboard" role="dialog" aria-modal="true" aria-label="${_esc(t('dn.ob.aria'))}">
      <div class="dn-ob-backdrop"></div>
      <div class="dn-ob-card" id="dn-ob-card"></div>
    </div>`);
  _obRender();
  const _onKey = (e) => {
    if (e.key === 'Escape') { _obFinish(); document.removeEventListener('keydown', _onKey); }
  };
  document.addEventListener('keydown', _onKey);
}

const _MINI_FLAME = `
  <svg class="dn-flame dn-flame--mini" viewBox="0 0 120 140" width="52" height="60" aria-hidden="true">
    <defs><radialGradient id="dn-ob-flame-grad" cx="50%" cy="70%">
      <stop offset="0%" stop-color="#F7C744" stop-opacity="0.95"/>
      <stop offset="40%" stop-color="#B8953C" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#B8953C" stop-opacity="0"/>
    </radialGradient></defs>
    <ellipse cx="60" cy="98" rx="55" ry="14" fill="url(#dn-ob-flame-grad)"/>
    <path class="dn-flame-outer" d="M60 20 C 45 50 35 70 40 90 Q 50 105 60 96 Q 70 105 80 90 C 85 70 75 50 60 20 Z" fill="url(#dn-ob-flame-grad)" opacity="0.85"/>
    <path class="dn-flame-inner" d="M60 40 C 52 55 47 70 52 86 Q 58 96 60 90 Q 62 96 68 86 C 73 70 68 55 60 40 Z" fill="#F7C744" opacity="0.75"/>
  </svg>`;

function _obDots(active) {
  return Array.from({ length: OB_STATION_COUNT }, (_, i) =>
    `<span class="dn-ob-dot${i + 1 < active ? ' is-done' : ''}${i + 1 === active ? ' is-now' : ''}"></span>`
  ).join('');
}

function _obImpactPicker() {
  let dots = '';
  for (let i = 1; i <= 5; i++) {
    dots += `<button type="button" class="dn-impact-dot${i <= _obImpact ? ' is-on' : ''}" data-val="${i}" aria-label="Etki ${i}">◆</button>`;
  }
  return `
    <div class="dn-impact-pick dn-ob-impact">
      <div class="dn-impact-head">
        <span class="dn-impact-title">${_esc(t('dn.impact_title'))}</span>
        <span class="dn-impact-name" id="dn-ob-impact-name">${_esc(_impactLabel(_obImpact))}</span>
      </div>
      <div class="dn-impact-dots" id="dn-ob-impact-dots" role="radiogroup" aria-label="${_esc(t('dn.impact_aria'))}">${dots}</div>
    </div>`;
}

function _obRender() {
  const card = document.getElementById('dn-ob-card');
  if (!card) return;

  // ── GİRİŞ ──
  if (_obStep === 0) {
    card.innerHTML = `
      <div class="dn-ob-glyph">${_MINI_FLAME}</div>
      <div class="dn-ob-kicker">${_esc(t('dn.ob.kicker1'))}</div>
      <h2 class="dn-ob-title">${_esc(t('dn.ob.title1'))}</h2>
      <p class="dn-ob-lead">${_esc(t('dn.ob.lead1'))}</p>
      <p class="dn-ob-note">${_esc(t('dn.ob.note1'))}</p>
      <div class="dn-ob-actions">
        <button class="dn-add-btn dn-ob-start" type="button">${_esc(t('dn.ob.start'))}</button>
      </div>
      <button class="dn-ob-skip" type="button">${_esc(t('dn.ob.skip'))}</button>`;
    card.querySelector('.dn-ob-start')?.addEventListener('click', () => { _obStep = 1; _obImpact = 3; _obRender(); });
    card.querySelector('.dn-ob-skip')?.addEventListener('click', _obFinish);
    return;
  }

  // ── KAPANIŞ ──
  if (_obStep > OB_STATION_COUNT) {
    const line = _obSealed > 0
      ? t('dn.ob.closing_sealed').replace('{n}', _obSealed)
      : t('dn.ob.closing_empty');
    card.innerHTML = `
      <div class="dn-ob-glyph">${_MINI_FLAME}</div>
      <div class="dn-ob-kicker">${_esc(t('dn.ob.kicker_done'))}</div>
      <h2 class="dn-ob-title">${_esc(t('dn.ob.title_done'))}</h2>
      <p class="dn-ob-lead">${_esc(line)}</p>
      <p class="dn-ob-note">${_esc(t('dn.ob.note_done'))}</p>
      <div class="dn-ob-actions">
        <button class="dn-add-btn dn-ob-done" type="button">${_esc(t('dn.ob.enter'))}</button>
      </div>`;
    card.querySelector('.dn-ob-done')?.addEventListener('click', _obFinish);
    return;
  }

  // ── İSTASYON ──
  const st = _obStation(_obStep - 1);
  card.innerHTML = `
    <div class="dn-ob-progress">${_obDots(_obStep)}</div>
    <div class="dn-ob-station-tag">${_esc(st.tag)}</div>
    <p class="dn-ob-prompt">${_esc(st.prompt)}</p>
    <input type="text" class="dn-input dn-ob-input" id="dn-ob-title" placeholder="${_esc(t('dn.title_ph'))}" maxlength="120">
    <textarea class="dn-textarea dn-ob-textarea" id="dn-ob-text" placeholder="${_esc(st.ph)}" maxlength="2000"></textarea>
    ${_obImpactPicker()}
    <div class="dn-ob-actions dn-ob-actions--row">
      <button class="dn-ob-secondary" type="button" id="dn-ob-skip-station">${_esc(_obSealed > 0 ? t('dn.ob.skip_more') : t('dn.ob.skip_station'))}</button>
      <button class="dn-add-btn dn-ob-seal" type="button" id="dn-ob-seal">${_esc(t('dn.ob.seal_next'))}</button>
    </div>
    ${_obSealed > 0 ? `<div class="dn-ob-count">${_esc(t('dn.ob.sealed_count').replace('{n}', _obSealed))}</div>` : ''}`;

  card.querySelectorAll('#dn-ob-impact-dots .dn-impact-dot').forEach(d =>
    d.addEventListener('click', () => {
      _obImpact = Math.max(1, Math.min(5, +d.dataset.val || 3));
      card.querySelectorAll('#dn-ob-impact-dots .dn-impact-dot').forEach(x =>
        x.classList.toggle('is-on', (+x.dataset.val) <= _obImpact));
      const nameEl = document.getElementById('dn-ob-impact-name');
      if (nameEl) nameEl.textContent = _impactLabel(_obImpact);
    }));
  document.getElementById('dn-ob-seal')?.addEventListener('click', () => _obSeal());
  document.getElementById('dn-ob-skip-station')?.addEventListener('click', () => _obAdvance());
}

function _obSeal() {
  const ti = document.getElementById('dn-ob-title');
  const ta = document.getElementById('dn-ob-text');
  const text = (ta?.value || '').trim().slice(0, 2000);
  if (!text) { showToast(t('dn.toast.write_or_skip')); ta?.focus(); return; }
  _pushAchievement({ date: _todayISO(), title: (ti?.value || '').trim().slice(0, 120), text, impact: _obImpact });
  _obSealed++;
  _obAdvance();
}

function _obAdvance() {
  _obStep++;
  _obImpact = 3;
  _obRender();
}

function _obFinish() {
  S._dinlenme.onboarded = true;
  dnSave();
  document.getElementById('dn-onboard')?.remove();
  // Mühürlenen geçmiş zaferler hemen görünsün
  _renderHero();
  _renderList();
  // Hayal halkasını sessizce tazele — Dinlenme okundu, yeni başarılar eklendi
  try { window.usCheckHayalDay?.({ silent: true }); } catch (_) {}
  if (_obSealed > 0) showToast(t('dn.toast.past_sealed'));
}
