/* ═══════════════════════════════════════════════════════════════════
   10o — FEATURE GATE · Kapı animasyonu + İlk giriş tanıtım videosu
   ───────────────────────────────────────────────────────────────────
   VİZYON (Emre): Her özelliğe girişte iki kanatlı obsidyen kapı açılır.
   Kullanıcı bir özelliğe İLK kez girdiğinde, kapının ardından o özelliği
   tanıtan bir video gösterilir (videoyu Emre sonradan ekleyecek).

     • Video sonuna kadar izlenirse → otomatik kapanır, BİR DAHA açılmaz.
     • İzlenmezse → "Teşekkür ederim Emre." butonu durur; tıklanana kadar
       video gösterilir. Tıklanınca → "Bir daha gösterilmeyecek, onaylıyor
       musun?" bilgi ekranı gelir. Onaylanırsa bir daha gösterilmez.

   Kullanım: featureEnter('feature-id', gerçekOpenFn) — main.js opener'ları
   bununla sarmalar. Kapı her girişte oynar; video yalnızca ilk girişte.
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { sb } from '../config.js';
import { SafeStorage, showToast, escapeHTML } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { NISANLAR, isikLastWritten, isikAmbientEnabled } from './12e-isik-nisanlari.js';

const SEEN_KEY = 'etw_feature_intro_seen_v1';

/* Özellik başlık/alt-başlığı i18n sözlüğünden render anında okunur (modül-yükünde
   DONMASIN); glyph/video/poster dil-bağımsız (video/poster runtime'da mutate). */
const _fTitle = (f) => (f && f.titleKey) ? t(f.titleKey) : ((f && f.title) || '');
const _fSub   = (f) => (f && f.subKey)   ? t(f.subKey)   : ((f && f.sub) || '');

/* ──────────────────────────────────────────────────────────────────
   ÖZELLİK KAYDI — Emre videoları buraya ekler.
   `video`: tanıtım videosunun URL'i (mp4/webm) — boşken "yakında" alanı
   gösterilir, akış yine de "Teşekkür ederim Emre." ile tamamlanabilir.
   `poster`: opsiyonel kapak görseli.
────────────────────────────────────────────────────────────────── */
export const FEATURE_REGISTRY = {
  'gecis-alani':       { titleKey: 'fg.feat.gecis.title',     subKey: 'fg.feat.gecis.sub',     glyph: '✦', video: '', poster: '' },
  'kendinle-konusma':  { titleKey: 'fg.feat.konusma.title',   subKey: 'fg.feat.konusma.sub',   glyph: '◐', video: '', poster: '' },
  'degerlendirme':     { titleKey: 'fg.feat.degerlendirme.title', subKey: 'fg.feat.degerlendirme.sub', glyph: '◷', video: '', poster: '' },
  'hayal-alemi':       { titleKey: 'fg.feat.hayal.title',     subKey: 'fg.feat.hayal.sub',     glyph: '◇', video: '', poster: '' },
  'engeller':          { titleKey: 'fg.feat.engeller.title',  subKey: 'fg.feat.engeller.sub',  glyph: '⛨', video: '', poster: '' },
  'gunu-kapat':        { titleKey: 'fg.feat.gunukapat.title', subKey: 'fg.feat.gunukapat.sub', glyph: '☾', video: '', poster: '' },
};

const REDUCED = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const DOOR_MS = () => (REDUCED() ? 280 : 1150);

let _built = false;
let _activeId = null;
let _activeOpen = null;
let _doorTimer = null;
let _finishTimer = null;

/* ── Persistans (kullanıcı bazlı) ─────────────────────────────── */
function _uid() { return S.currentUser?.id || 'anon'; }
function _seenMap() { return SafeStorage.get(`${SEEN_KEY}_${_uid()}`, {}) || {}; }
function _isSeen(id) { return !!_seenMap()[id]; }
function _markSeen(id) {
  const m = _seenMap();
  m[id] = { at: new Date().toISOString() };
  SafeStorage.set(`${SEEN_KEY}_${_uid()}`, m);
}

/* ── Süs SVG (kapı kanadı kazıması) ──────────────────────────── */
/* Kapı kazıması varyantı (Alfabe Işık, Faz 2): kullanıcının SON yazdığı nişan
   kapıya işlenir — nur uygulamanın dokusuna sızar. Doku > "Nur izleri"
   kapalıysa ya da hiç nişan yazılmamışsa kapı bugünkü hâlinde kalır
   (K4: her iz görünür + kapatılabilir; nur kazanılır, dayatılmaz). */
function _isikEtchNisan() {
  try {
    if (!isikAmbientEnabled()) return null;
    // "En son yazılan nişan" hesabı 12e'nin TEK kaynağıdır (isikLastWritten).
    // Burada bir zamanlar aynı sıralama elle tekrarlanıyordu — iki kopya
    // sessizce ayrışabilirdi; 2026-08-07'de tek kaynağa bağlandı.
    const last = isikLastWritten();
    return last ? (NISANLAR.find(n => n.id === last) || null) : null;
  } catch (_) { return null; }
}

function _ornamentSVG(nisan) {
  // varyant: nişan verilirse rozetin kalbindeki elmasın yerine nişan kazınır
  const core = nisan
    ? `<g style="color:var(--gold)" opacity="0.72" transform="translate(24 24) scale(0.52)">${nisan.icon}</g>`
    : `<path d="M50 34 L60 50 L50 66 L40 50 Z" stroke="var(--gold)" stroke-width="0.8" opacity="0.8"/>
    <circle cx="50" cy="50" r="2.5" fill="var(--gold)"/>`;
  return `<svg viewBox="0 0 100 100" fill="none">
    <circle cx="50" cy="50" r="38" stroke="var(--gold)" stroke-width="0.8" opacity="0.7"/>
    <circle cx="50" cy="50" r="28" stroke="var(--gold)" stroke-width="0.5" opacity="0.45"/>
    <path d="M50 14 L50 86 M14 50 L86 50" stroke="var(--gold)" stroke-width="0.5" opacity="0.4"/>
    ${core}
  </svg>`;
}

/* ── Overlay DOM'unu bir kez kur ──────────────────────────────── */
function _build() {
  if (_built) return;
  const ov = document.createElement('div');
  ov.id = 'fgate-overlay';
  ov.className = 'fgate-overlay';
  ov.innerHTML = `
    <div class="fgate-scrim"></div>
    <div class="fgate-doors">
      <div class="fgate-door fgate-door--left"><div class="fgate-door-ornament">${_ornamentSVG()}</div></div>
      <div class="fgate-door fgate-door--right"><div class="fgate-door-ornament">${_ornamentSVG()}</div></div>
      <div class="fgate-seam"></div>
    </div>
    <div class="fgate-lintel">
      <span class="fgate-lintel-glyph" id="fgate-lintel-glyph">✦</span>
      <div class="fgate-lintel-title" id="fgate-lintel-title"></div>
      <div class="fgate-lintel-sub" id="fgate-lintel-sub"></div>
    </div>

    <div class="fgate-intro" id="fgate-intro">
      <div class="fgate-card">
        <div class="fgate-eyebrow">${t('fg.eyebrow', "İlk giriş · Emre'den")}</div>
        <div class="fgate-card-title" id="fgate-intro-title"></div>
        <div class="fgate-card-sub" id="fgate-intro-sub"></div>
        <div class="fgate-video-wrap">
          <video id="fgate-video" playsinline preload="metadata"></video>
          <div class="fgate-video-empty" id="fgate-video-empty">
            <span class="fgate-video-empty-glyph">▷</span>
            <span>${t('fg.video_soon', 'Tanıtım videosu yakında burada olacak.')}</span>
          </div>
        </div>
        <div class="fgate-progress"><div class="fgate-progress-fill" id="fgate-progress-fill"></div></div>
        <button class="fgate-thanks-btn" id="fgate-thanks-btn">${t('fg.thanks', 'Teşekkür ederim Emre.')}</button>
        <div class="fgate-hint">${t('fg.hint', 'Videoyu sonuna kadar izlersen kendiliğinden kapanır.')}</div>
      </div>
    </div>

    <div class="fgate-confirm" id="fgate-confirm">
      <div class="fgate-card">
        <div class="fgate-confirm-glyph">⚑</div>
        <div class="fgate-confirm-title">${t('fg.confirm_title', 'Bir daha gösterilmeyecek')}</div>
        <div class="fgate-confirm-text" id="fgate-confirm-text">
          ${t('fg.confirm_text', 'Bu tanıtımı bir daha görmeyeceksin. Onaylıyor musun?')}
        </div>
        <div class="fgate-confirm-actions">
          <button class="fgate-btn fgate-btn--ghost" id="fgate-confirm-no">${t('fg.confirm_no', 'Hayır, izlemeye devam')}</button>
          <button class="fgate-btn fgate-btn--gold" id="fgate-confirm-yes">${t('fg.confirm_yes', 'Evet, onaylıyorum')}</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(ov);
  _built = true;
  _wire();
}

function _wire() {
  const video = document.getElementById('fgate-video');
  const fill = document.getElementById('fgate-progress-fill');

  // Video sonuna kadar izlendi → kalıcı işaretle + kapan
  video.addEventListener('ended', () => {
    if (_activeId) _markSeen(_activeId);
    _finish();
  });
  video.addEventListener('timeupdate', () => {
    if (video.duration && fill) fill.style.width = `${Math.min(100, (video.currentTime / video.duration) * 100)}%`;
  });
  video.addEventListener('error', _showVideoEmpty);

  document.getElementById('fgate-thanks-btn').addEventListener('click', _showConfirm);
  document.getElementById('fgate-confirm-yes').addEventListener('click', () => {
    if (_activeId) _markSeen(_activeId);
    _finish();
  });
  document.getElementById('fgate-confirm-no').addEventListener('click', () => {
    _setPanel('intro');
    try { video.play().catch(() => {}); } catch {}
  });
}

function _setPanel(which) {
  const intro = document.getElementById('fgate-intro');
  const confirm = document.getElementById('fgate-confirm');
  intro.classList.toggle('show', which === 'intro');
  confirm.classList.toggle('show', which === 'confirm');
  // Lintel kazıması yalnızca kapı açılırken görünür; bir panel açılınca gizle.
  // (display:none, keyframe 'forwards' fill'ini de geçersiz kılar.)
  const lintel = document.querySelector('.fgate-lintel');
  if (lintel) lintel.style.display = (which === 'none') ? '' : 'none';
}

function _showVideoEmpty() {
  const empty = document.getElementById('fgate-video-empty');
  const video = document.getElementById('fgate-video');
  if (empty) empty.classList.add('show');
  if (video) video.style.visibility = 'hidden';
}

function _showConfirm() {
  const f = FEATURE_REGISTRY[_activeId];
  const txt = document.getElementById('fgate-confirm-text');
  if (txt) txt.textContent = t('fg.confirm_text_named', '"{title}" tanıtımını bir daha görmeyeceksin. Onaylıyor musun?').replace('{title}', _fTitle(f) || t('fg.this_feature', 'Bu özellik'));
  try { document.getElementById('fgate-video')?.pause(); } catch {}
  _setPanel('confirm');
}

function _showIntro(id) {
  const f = FEATURE_REGISTRY[id] || {};
  document.getElementById('fgate-intro-title').textContent = _fTitle(f);
  document.getElementById('fgate-intro-sub').textContent = _fSub(f);
  document.getElementById('fgate-progress-fill').style.width = '0%';

  const video = document.getElementById('fgate-video');
  const empty = document.getElementById('fgate-video-empty');
  empty.classList.remove('show');
  video.style.visibility = 'visible';

  if (f.video) {
    if (f.poster) video.poster = f.poster;
    video.src = f.video;
    video.controls = true;
    try { video.load(); video.play().catch(() => {}); } catch {}
  } else {
    // Video henüz eklenmedi — yer tutucu göster, akış yine de tamamlanabilir.
    video.removeAttribute('src');
    _showVideoEmpty();
  }

  _setPanel('intro');
}

function _finish() {
  if (_doorTimer) { clearTimeout(_doorTimer); _doorTimer = null; }
  const ov = document.getElementById('fgate-overlay');
  const video = document.getElementById('fgate-video');
  try { video.pause(); video.removeAttribute('src'); video.load(); } catch {}
  ov.classList.add('fgate-dismiss');
  if (_finishTimer) clearTimeout(_finishTimer);
  _finishTimer = setTimeout(() => {
    _finishTimer = null;
    ov.style.display = 'none';
    ov.classList.remove('fgate-open', 'fgate-dismiss');
    _setPanel('none');
    const fn = _activeOpen;
    _activeOpen = null;
    _activeId = null;
    if (typeof fn === 'function') { try { fn(); } catch (e) { console.error('featureEnter open:', e); } }
  }, REDUCED() ? 120 : 380);
}

/* ──────────────────────────────────────────────────────────────────
   featureEnter — opener'ı kapı (+ ilk girişte video) ardına alır.
────────────────────────────────────────────────────────────────── */
export function featureEnter(featureId, openFn) {
  _build();
  // Önceki akış mid-flight ise (kapı/dismiss zamanlayıcıları) iptal et — yarış olmasın.
  if (_doorTimer) { clearTimeout(_doorTimer); _doorTimer = null; }
  if (_finishTimer) { clearTimeout(_finishTimer); _finishTimer = null; }
  _activeId = featureId;
  _activeOpen = openFn;

  const f = FEATURE_REGISTRY[featureId] || {};
  const ov = document.getElementById('fgate-overlay');
  ov.querySelector('#fgate-lintel-glyph').textContent = f.glyph || '✦';
  ov.querySelector('#fgate-lintel-title').textContent = _fTitle(f);
  ov.querySelector('#fgate-lintel-sub').textContent = _fSub(f);
  // kapı kazıması her açılışta tazelenir — dün yazılan nişan bugün kapıdadır
  try {
    const etch = _isikEtchNisan();
    ov.querySelectorAll('.fgate-door-ornament').forEach(o => { o.innerHTML = _ornamentSVG(etch); });
  } catch (_) {}

  _setPanel('none');
  ov.classList.remove('fgate-open', 'fgate-dismiss');
  ov.style.display = 'block';
  // Reflow → animasyonu sıfırdan tetikle (seam/lintel keyframe'leri yeniden çalışsın)
  void ov.offsetWidth;
  requestAnimationFrame(() => ov.classList.add('fgate-open'));

  if (_doorTimer) clearTimeout(_doorTimer);
  _doorTimer = setTimeout(() => {
    _doorTimer = null;
    if (_isSeen(featureId)) _finish();   // görülmüş → doğrudan özelliğe gir
    else _showIntro(featureId);          // ilk giriş → tanıtım videosu
  }, DOOR_MS());
}

/* Dev/test yardımcısı — bir özelliğin "görüldü" işaretini sıfırlar. */
export function fgateReset(featureId) {
  const m = _seenMap();
  if (featureId) delete m[featureId]; else { SafeStorage.set(`${SEEN_KEY}_${_uid()}`, {}); return; }
  SafeStorage.set(`${SEEN_KEY}_${_uid()}`, m);
}

/* ══════════════════════════════════════════════════════════════════
   SUPABASE — tanıtım video URL'leri (tüm kullanıcılar okur, admin yazar)
   Tablo: feature_videos (migrations/000_wanderer_schema.sql)
══════════════════════════════════════════════════════════════════ */

// Boot'ta herkes için: kayıtlı video URL'lerini registry'ye işle.
export async function loadFeatureVideos() {
  try {
    const { data, error } = await sb
      .from('feature_videos')
      .select('feature_id, video_url, poster_url');
    if (error) { console.warn('loadFeatureVideos:', error.message); return; }
    (data || []).forEach(row => {
      const f = FEATURE_REGISTRY[row.feature_id];
      if (!f) return;
      f.video  = row.video_url  || '';
      f.poster = row.poster_url || '';
    });
  } catch (e) { console.warn('loadFeatureVideos:', e?.message); }
}

// Admin panel sekmesi — her özellik için URL girişlerini render et.
export async function renderFeatureVideosAdmin() {
  const host = document.getElementById('feature-videos-list');
  if (!host) return;
  host.innerHTML = `<div style="color:var(--text-dim);font-size:13px;">${t('wg.admin.loading', 'Yükleniyor…')}</div>`;

  // Kayıtlı değerleri çek (admin de aynı tablodan okur)
  let saved = {};
  try {
    const { data } = await sb.from('feature_videos').select('feature_id, video_url, poster_url');
    (data || []).forEach(r => { saved[r.feature_id] = r; });
  } catch (_) {}

  host.innerHTML = Object.entries(FEATURE_REGISTRY).map(([id, f]) => {
    const row = saved[id] || {};
    const v = escapeHTML(row.video_url || '');
    const p = escapeHTML(row.poster_url || '');
    return `
      <div class="fv-admin-row" style="border:1px solid var(--border);border-radius:10px;padding:14px 14px 16px;margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
          <span style="font-size:16px;color:var(--gold);">${f.glyph || '✦'}</span>
          <span style="font-family:var(--cinzel,serif);letter-spacing:1px;color:var(--text);">${escapeHTML(_fTitle(f))}</span>
          <span style="font-size:11px;color:var(--text-dim);margin-left:auto;">${escapeHTML(_fSub(f))}</span>
        </div>
        <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px;">${t('fg.admin.video_url', 'Video URL (mp4/webm)')}</div>
        <input class="field-input" type="url" id="fv-video-${id}" value="${v}" placeholder="https://…/tanitim.mp4" style="margin-bottom:12px;">
        <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:5px;">${t('fg.admin.poster_url', 'Kapak görseli URL (opsiyonel)')}</div>
        <input class="field-input" type="url" id="fv-poster-${id}" value="${p}" placeholder="https://…/kapak.jpg">
      </div>`;
  }).join('');
}

// Admin — tüm satırları upsert et.
export async function saveFeatureVideos(btn) {
  if (btn) btn.disabled = true;
  const rows = Object.keys(FEATURE_REGISTRY).map(id => ({
    feature_id: id,
    video_url:  (document.getElementById(`fv-video-${id}`)?.value || '').trim() || null,
    poster_url: (document.getElementById(`fv-poster-${id}`)?.value || '').trim() || null,
    updated_at: new Date().toISOString(),
  }));

  // Basit URL doğrulaması
  const bad = rows.find(r => r.video_url && !/^https?:\/\//i.test(r.video_url));
  if (bad) {
    showToast(t('fg.admin.url_http', 'Video URL http(s) ile başlamalı.'), true);
    if (btn) btn.disabled = false;
    return;
  }

  try {
    const { error } = await sb.from('feature_videos').upsert(rows, { onConflict: 'feature_id' });
    if (error) {
      if (/relation .*feature_videos.* does not exist|could not find the table/i.test(error.message)) {
        showToast(t('fg.admin.no_table', 'feature_videos tablosu yok — migrations/000_wanderer_schema.sql çalıştırılmalı.'), true);
      } else {
        showToast(t('mk.admin.save_failed', 'Kaydedilemedi') + ': ' + error.message, true);
      }
      if (btn) btn.disabled = false;
      return;
    }
    // Yerel registry'yi de güncelle (anında aktif olsun)
    rows.forEach(r => {
      const f = FEATURE_REGISTRY[r.feature_id];
      if (f) { f.video = r.video_url || ''; f.poster = r.poster_url || ''; }
    });
    showToast(t('fg.admin.saved', 'Tanıtım videoları kaydedildi.'));
  } catch (e) {
    showToast(t('mk.admin.save_failed', 'Kaydedilemedi') + ': ' + (e?.message || e), true);
  } finally {
    if (btn) btn.disabled = false;
  }
}
