/* ═══════════════════════════════════════════════════════════════════
   10i — HAYAL ALEMİ (Imagination Engine)
   ───────────────────────────────────────────────────────────────────
   FELSEFE: "Hayal aleminde kendini, istediğin gibi bir ilişkiyi
             standartı olan bir kişi olarak görüp o kişinin
             gözlerinden o kişinin hayatına ve ilişki hayatına
             bakabilirsin." — Wanderer İlişki Felsefesi (s.29)

   İki dünya metaforu:
     • HAYAL ALEMİ   → biriken sahneler
     • FİZİKSEL ALEM → davranış kanıtlarıyla yansıma

   4 aşamalı seans:
     1) Kavram seç (9 kavram: 4 derinlik + 5 temel)
     2) LLM rehberli soru (Emre persona ile)
     3) Kullanıcı sahneyi kendi sözleriyle betimle
     4) Mühürle → Hayal Alemi'ne ekle + Elmas ödülü
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { sb } from '../config.js';
import { SafeStorage, showToast, recordActivityDay, localISODate, stableHash, seededRng } from './00a-infrastructure.js';
import { callLLM } from './04-llm-hero-history.js';
import { awardElmas } from './10g-w2-wanderer-game.js';
import { t } from './15-i18n.js';
import { p } from './16-i18n-prompts.js';

const STORAGE_KEY = 'etw_hayal_alemi_v1';
// Konvansiyon: per-uid anahtar (10g/10j ile aynı). Eski global anahtar
// bir kez benimsenir, sonra per-uid'e yazılır.
const _haKey = () => `${STORAGE_KEY}_${S.currentUser?.id || 'anon'}`;
const TODAY = () => localISODate();
const NOW = () => new Date().toISOString();
const UID = () => 'h_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/* ══════════════════════════════════════════════════════════════
   KAVRAMLAR — Felsefenin temel 9 kavramı
══════════════════════════════════════════════════════════════ */
/* Kavram iskeleti — key/category/glyph sabit; label+seed i18n'den render anında
   çözülür (modül-yükünde dil donmasın). [[tr-en-i18n-tamamlama]] */
/* Bir kavramın skorunun gösterilebilmesi için gereken en az sinyal —
   09b'nin kanıt eşiğiyle aynı sayı. */
const HA_MIN_SINYAL = 2;

export const HAYAL_KAVRAMLAR = [
  { key: 'standart',  category: 'derinlik', glyph: '◆' },
  { key: 'hak_etmek', category: 'derinlik', glyph: '◇' },
  { key: 'normal',    category: 'derinlik', glyph: '◆' },
  { key: 'layik',     category: 'derinlik', glyph: '◇' },
  { key: 'oz_sevgi',  category: 'temel',    glyph: '✦' },
  { key: 'oz_saygi',  category: 'temel',    glyph: '✦' },
  { key: 'oz_deger',  category: 'temel',    glyph: '✦' },
  { key: 'oz_guven',  category: 'temel',    glyph: '✦' },
  { key: 'bolluk',    category: 'temel',    glyph: '✧' },
];

const KAVRAM_BASE = Object.fromEntries(HAYAL_KAVRAMLAR.map(k => [k.key, k]));
const KAVRAM_ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX'];
const KAVRAM_INDEX = Object.fromEntries(HAYAL_KAVRAMLAR.map((k, i) => [k.key, i]));

/* Kavramı i18n-çözümlü olarak döndür (label+seed dahil) */
function _kavram(key) {
  const b = KAVRAM_BASE[key];
  if (!b) return null;
  return { ...b, label: t(`ha.kavram.${key}.label`), seed: t(`ha.kavram.${key}.seed`) };
}
const _catLabel = (cat) => t(`ha.cat.${cat}`);

/* ══════════════════════════════════════════════════════════════
   ÜRETKEN GÖRSEL MOTORU — "Hayal Görseli"
   ───────────────────────────────────────────────────────────
   Arketiplerdeki prosedürel SVG line-art felsefesinin hayalsi,
   üretken (generative) muadili. Harici AI/görsel modeli YOK —
   her şey client-side SVG. Sahneye özgü deterministik bir seed,
   yıldız/parçacık/yörünge yerleşimini sürer; kavram ise merkezdeki
   imza motifini belirler. Aynı hayal → aynı görsel (stabil),
   farklı hayal → farklı kompozisyon.
══════════════════════════════════════════════════════════════ */

// Hayalsi palet
const DREAM_GOLD   = '#D4A745';   // gold-bright
const DREAM_GOLD_D = '#B8953C';   // gold
const DREAM_VIOLET = '#8E78D6';   // ışıklı menekşe
const DREAM_INDIGO = '#3C285A';   // derin indigo

// Deterministik seed → 00a tek kaynağı (aynı FNV-1a + mulberry32; sahne
// görselleri bit-bit aynı kalır). Yerel adlar korunur, çağrı yerleri değişmez.
const _haHash = stableHash;
const _haRng  = seededRng;

// Bir sahne için stabil seed (artSeed varsa onu kullan)
function _haSeedFor(scene) {
  if (scene?.artSeed != null) return scene.artSeed >>> 0;
  return _haHash(`${scene?.id || ''}|${scene?.concept || ''}|${scene?.scene_text || ''}`);
}

// Kavram merkez motifi (sigil dili) — center (100,100), ~r38
function _haMotif(concept, c, sw) {
  const motifs = {
    elmas:       `<path d="M100 60 L138 100 L100 152 L62 100 Z" fill="none" stroke="${c}" stroke-width="${sw}"/><path d="M62 100 L138 100 M100 60 L100 152" stroke="${c}" stroke-width="${sw*0.5}" opacity="0.6"/>`,
    openDiamond: `<path d="M100 64 L136 100 L100 150 L64 100 Z" fill="none" stroke="${c}" stroke-width="${sw}" stroke-dasharray="4 4"/><path d="M100 52 L100 36 M92 44 L100 36 L108 44" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>`,
    gem:         `<path d="M76 72 L124 72 L142 100 L100 150 L58 100 Z" fill="none" stroke="${c}" stroke-width="${sw}"/><path d="M58 100 L142 100 M76 72 L100 100 L124 72 M100 100 L100 150" stroke="${c}" stroke-width="${sw*0.5}" opacity="0.55"/>`,
    crown:       `<path d="M64 122 L72 78 L88 102 L100 70 L112 102 L128 78 L136 122 Z" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round"/><path d="M62 128 L138 128" stroke="${c}" stroke-width="${sw}"/><circle cx="72" cy="74" r="2.4" fill="${c}"/><circle cx="100" cy="66" r="2.8" fill="${c}"/><circle cx="128" cy="74" r="2.4" fill="${c}"/>`,
    heart:       `<path d="M100 142 C68 118 60 92 76 80 C90 70 100 82 100 92 C100 82 110 70 124 80 C140 92 132 118 100 142 Z" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round"/>`,
    pillar:      `<path d="M70 72 L130 72 M68 132 L132 132" stroke="${c}" stroke-width="${sw}"/><path d="M80 72 L80 132 M120 72 L120 132" stroke="${c}" stroke-width="${sw}"/><path d="M100 76 L100 128" stroke="${c}" stroke-width="${sw*0.5}" opacity="0.55"/>`,
    shield:      `<path d="M100 60 L138 74 L138 104 Q138 138 100 152 Q62 138 62 104 L62 74 Z" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linejoin="round"/><path d="M82 102 L96 116 L120 86" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`,
    spiral:      `<path d="M100 100 m-32 0 a32 32 0 1 1 32 32 a24 24 0 1 1 -24 -24 a16 16 0 1 1 16 16 a8 8 0 1 1 -8 -8" fill="none" stroke="${c}" stroke-width="${sw}"/>`,
  };
  const map = {
    standart: 'elmas', normal: 'elmas', hak_etmek: 'openDiamond', layik: 'crown',
    oz_sevgi: 'heart', oz_saygi: 'pillar', oz_deger: 'gem', oz_guven: 'shield', bolluk: 'spiral',
  };
  return motifs[map[concept] || 'elmas'] || motifs.elmas;
}

/**
 * haGenerateDreamArt — sahneye özgü üretken hayal görseli (SVG string).
 * @param {object} scene  { id, concept, scene_text, artSeed? }
 * @param {number} size   px (kare)
 */
export function haGenerateDreamArt(scene, size = 180) {
  const seed = _haSeedFor(scene);
  const rng = _haRng(seed);
  const gid = 'hd' + seed.toString(36);
  const concept = scene?.concept || 'standart';

  // Yörünge halkaları (2-3 adet)
  const ringCount = 2 + Math.floor(rng() * 2);
  let rings = '';
  for (let i = 0; i < ringCount; i++) {
    const rx = 46 + rng() * 36;
    const ry = rx * (0.5 + rng() * 0.45);
    const rot = Math.floor(rng() * 180);
    const op = (0.10 + rng() * 0.18).toFixed(2);
    rings += `<ellipse cx="100" cy="100" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="none" stroke="${DREAM_GOLD_D}" stroke-width="0.6" opacity="${op}" transform="rotate(${rot} 100 100)"/>`;
  }

  // Parçacıklar / yıldızlar
  const starCount = 9 + Math.floor(rng() * 8);
  const pts = [];
  let stars = '';
  for (let i = 0; i < starCount; i++) {
    const ang = rng() * Math.PI * 2;
    const dist = 30 + rng() * 66;
    const x = 100 + Math.cos(ang) * dist;
    const y = 100 + Math.sin(ang) * dist * 0.92;
    pts.push([x, y]);
    const r = (0.7 + rng() * 1.8).toFixed(2);
    const delay = (rng() * 4).toFixed(2);
    const dur = (2.6 + rng() * 2.4).toFixed(2);
    const sparkle = rng() > 0.7;
    if (sparkle) {
      const s = 3 + rng() * 3;
      stars += `<g class="hayal-art-twinkle" style="--d:${delay}s;--t:${dur}s;transform-origin:${x.toFixed(1)}px ${y.toFixed(1)}px;"><path d="M${x.toFixed(1)} ${(y-s).toFixed(1)} L${(x+s*0.28).toFixed(1)} ${y.toFixed(1)} L${x.toFixed(1)} ${(y+s).toFixed(1)} L${(x-s*0.28).toFixed(1)} ${y.toFixed(1)} Z M${(x-s).toFixed(1)} ${y.toFixed(1)} L${x.toFixed(1)} ${(y-s*0.28).toFixed(1)} L${(x+s).toFixed(1)} ${y.toFixed(1)} L${x.toFixed(1)} ${(y+s*0.28).toFixed(1)} Z" fill="${DREAM_GOLD}" opacity="0.85"/></g>`;
    } else {
      stars += `<circle class="hayal-art-twinkle" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${rng() > 0.5 ? DREAM_GOLD : DREAM_VIOLET}" style="--d:${delay}s;--t:${dur}s;transform-origin:${x.toFixed(1)}px ${y.toFixed(1)}px;"/>`;
    }
  }

  // Takımyıldız çizgileri — birkaç ardışık parçacığı bağla
  let constell = '';
  const linkN = Math.min(pts.length - 1, 3 + Math.floor(rng() * 3));
  for (let i = 0; i < linkN; i++) {
    const a = pts[i], b = pts[i + 1];
    if (!a || !b) continue;
    constell += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${DREAM_GOLD_D}" stroke-width="0.5" opacity="0.28"/>`;
  }

  const motif = _haMotif(concept, DREAM_GOLD, 1.6);

  return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" style="overflow:visible;display:block;">
    <defs>
      <radialGradient id="${gid}-mist" cx="50%" cy="46%" r="60%">
        <stop offset="0%" stop-color="${DREAM_VIOLET}" stop-opacity="0.30"/>
        <stop offset="45%" stop-color="${DREAM_INDIGO}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#08070a" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${gid}-halo" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${DREAM_GOLD}" stop-opacity="0.55"/>
        <stop offset="40%" stop-color="${DREAM_GOLD_D}" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="${DREAM_GOLD_D}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="200" height="200" fill="url(#${gid}-mist)"/>
    ${rings}
    ${constell}
    ${stars}
    <circle class="hayal-art-breathe" cx="100" cy="100" r="56" fill="url(#${gid}-halo)"/>
    <g class="hayal-art-motif">${motif}</g>
  </svg>`;
}

/* ══════════════════════════════════════════════════════════════
   HAYAL KARTI — Arketip tarot kartının hayalsi muadili
══════════════════════════════════════════════════════════════ */
export function haDreamCard(scene, size = 'full') {
  const dims = {
    full: { w: 260, pad: 16, roman: 11, romanLS: 4, fig: 170, name: 15, nameLS: 3, whisper: 11, showWhisper: true },
    mini: { w: 96,  pad: 7,  roman: 7,  romanLS: 2, fig: 64,  name: 8,  nameLS: 1, whisper: 0,  showWhisper: false },
  }[size] || {};
  const kavram = _kavram(scene.concept) || { label: scene.concept, glyph: '◇', seed: '', category: 'temel' };
  const roman = KAVRAM_ROMAN[KAVRAM_INDEX[scene.concept] ?? 0] || '◇';
  const date = scene.created_at
    ? new Date(scene.created_at).toLocaleDateString(S._currentLang || 'tr', { day: 'numeric', month: 'short' })
    : '';
  const cornerSize = size === 'mini' ? 8 : 12;
  const corners = [
    { p: 'M0 6 L0 0 L6 0',    t: `top:${dims.pad-8}px;left:${dims.pad-8}px` },
    { p: 'M14 6 L14 0 L8 0',  t: `top:${dims.pad-8}px;right:${dims.pad-8}px` },
    { p: 'M0 8 L0 14 L6 14',  t: `bottom:${dims.pad-8}px;left:${dims.pad-8}px` },
    { p: 'M14 8 L14 14 L8 14',t: `bottom:${dims.pad-8}px;right:${dims.pad-8}px` },
  ];
  const whisperHtml = dims.showWhisper && kavram.seed ? `
    <div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:6px;">
      <div style="width:18px;height:1px;background:${DREAM_GOLD_D};opacity:0.5;"></div>
      <span style="font-family:var(--serif);font-style:italic;font-size:${dims.whisper}px;color:${DREAM_GOLD};letter-spacing:0.4px;line-height:1.3;">${kavram.glyph} ${_catLabel(kavram.category)}</span>
      <div style="width:18px;height:1px;background:${DREAM_GOLD_D};opacity:0.5;"></div>
    </div>` : '';

  return `<div class="hayal-dream-card" style="width:${dims.w}px;aspect-ratio:5/7;padding:${dims.pad}px;position:relative;display:flex;flex-direction:column;align-items:stretch;text-align:center;">
    ${corners.map(cp => `<svg width="${cornerSize}" height="${cornerSize}" viewBox="0 0 14 14" style="position:absolute;${cp.t};"><path d="${cp.p}" fill="none" stroke="${DREAM_GOLD_D}" stroke-width="1"/></svg>`).join('')}
    <div style="font-family:var(--cinzel);font-size:${dims.roman}px;letter-spacing:${dims.romanLS}px;color:${DREAM_GOLD};font-weight:600;">${roman}</div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;min-height:0;">
      ${scene.image_url
        ? `<img src="${String(scene.image_url).replace(/"/g, '&quot;')}" alt="" loading="lazy"
               style="width:100%;height:100%;object-fit:cover;border-radius:8px;border:1px solid rgba(212,175,85,0.3);">`
        : haGenerateDreamArt(scene, dims.fig)}
    </div>
    <div>
      <div style="font-family:var(--cinzel);font-size:${dims.name}px;font-weight:700;letter-spacing:${dims.nameLS}px;color:var(--text-bright,#E8E6E0);line-height:1.15;">${(kavram.label || '').toUpperCase()}</div>
      ${whisperHtml}
      ${size !== 'mini' && date ? `<div style="font-family:var(--cinzel);font-size:8px;letter-spacing:2px;color:var(--text-mid,#8A887F);margin-top:6px;">${date}</div>` : ''}
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════════════
   HAYAL KARTI DETAY — görsel + kullanıcının kendi cümleleri
══════════════════════════════════════════════════════════════ */
export function hayalAcKart(sceneId) {
  const scene = (S._hayalAlemi?.sahneler || []).find(s => s.id === sceneId);
  const body = document.getElementById('hayal-kart-body');
  if (!scene || !body) return;

  const kavram = _kavram(scene.concept) || { label: scene.concept };
  const date = scene.created_at
    ? new Date(scene.created_at).toLocaleDateString(S._currentLang || 'tr', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const safeText = (scene.scene_text || '').replace(/</g, '&lt;');
  const safePrompt = (scene.prompt || '').replace(/</g, '&lt;');

  body.innerHTML = `
    <div class="hayal-kart-card-wrap">${haDreamCard(scene, 'full')}</div>
    ${!scene.image_url ? `
      <button class="hayal-resmet-btn" id="hayal-resmet-btn" type="button">
        <span class="hayal-resmet-ic">✦</span>
        <span class="hayal-resmet-txt">
          <span class="hayal-resmet-title">${t('ha.resmet_title')}</span>
          <span class="hayal-resmet-sub">${t('ha.resmet_sub')}</span>
        </span>
      </button>` : ''}
    <div class="hayal-kart-detail">
      ${safePrompt ? `<div class="hayal-kart-prompt">${safePrompt}</div>` : ''}
      <div class="hayal-kart-words-label">${t('ha.your_dream_label')}</div>
      <div class="hayal-kart-words">${safeText}</div>
      <div class="hayal-kart-foot">
        <span>${kavram.glyph || '◇'} ${kavram.label || ''}</span>
        <span>${date}</span>
      </div>
    </div>`;

  _haShowSection('kart'); // kart detay bölümünü göster (sayfa içi)
  body.scrollTop = 0;

  // Üretken görsel (hayal-gorsel edge function) — sahne başına bir kez
  document.getElementById('hayal-resmet-btn')?.addEventListener('click', () => haResmet(sceneId));

  const section = document.getElementById('hayal-kart-section');
  if (section && !section._haEscBound) {
    section._haEscBound = true;
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && section.style.display !== 'none') hayalKapatKart();
    });
  }
}

export function hayalKapatKart() {
  _haShowSection('harita'); // haritaya dön (sayfada kal)
}

/* ══════════════════════════════════════════════════════════════
   HAYALİNİ RESMET — üretken görsel (hayal-gorsel edge function)
   Sahne betimi → görüntü modeli → küçült → 'chat-images' bucket
   (13c kalıbı) → scene.image_url. Studio'ya özel; sahne başına 1.
══════════════════════════════════════════════════════════════ */
async function _haShrinkDataUrl(dataUrl, maxW) {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUrl; });
  const scale = Math.min(1, maxW / (img.naturalWidth || maxW));
  const cv = document.createElement('canvas');
  cv.width = Math.round((img.naturalWidth || maxW) * scale);
  cv.height = Math.round((img.naturalHeight || maxW) * scale);
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  return new Promise(res => cv.toBlob(res, 'image/jpeg', 0.85));
}

/* Günlük Hayal Görseli tavanı — Pro cömert, Max çok daha cömert (plan v2 md.3).
   DB'siz sayaç (localStorage), diğer "günde bir" kalıplarıyla aynı yapı. */
function _haImgDailyCap() { return S.isPremiumPlus ? 15 : 3; }

export async function haResmet(sceneId) {
  const scene = (S._hayalAlemi?.sahneler || []).find(s => s.id === sceneId);
  if (!scene || scene.image_url) return;
  if (!S.isPremium) {
    showToast(t('ha.toast.studio_gate'), true);
    try { window.showPremiumFeatureSpotlight?.('hayal-gorsel'); } catch (_) {}
    return;
  }
  const today = localISODate();
  if (S._hayalAlemi.imgGenDay !== today) { S._hayalAlemi.imgGenDay = today; S._hayalAlemi.imgGenCount = 0; }
  if ((S._hayalAlemi.imgGenCount || 0) >= _haImgDailyCap()) {
    showToast(t('ha.toast.img_cap', 'Bugünlük Hayal Görseli hakkın doldu — yarın devam eder.'), true);
    return;
  }
  const btn = document.getElementById('hayal-resmet-btn');
  if (btn) {
    if (btn.dataset.busy) return;
    btn.dataset.busy = '1';
    btn.classList.add('hayal-resmet-btn--busy');
    const tEl = btn.querySelector('.hayal-resmet-title');
    if (tEl) tEl.textContent = t('ha.painting');
  }
  try {
    const kavram = _kavram(scene.concept) || { label: scene.concept };
    const { data, error } = await sb.functions.invoke('hayal-gorsel', {
      body: { scene_text: scene.scene_text || '', concept: kavram.label || '' },
    });
    if (error || !data || !data.image) {
      const msg = (data && data.message) || t('ha.toast.img_failed');
      showToast(msg, true);
      return;
    }
    // Küçült + bucket'a yükle (public URL; SafeStorage'a base64 YAZMA — kota)
    const blob = await _haShrinkDataUrl(data.image, 896);
    const uid = (S.currentUser && S.currentUser.id) || 'anon';
    const path = `hayal/${uid}/${sceneId}.jpg`;
    const { error: upErr } = await sb.storage.from('chat-images')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
    if (upErr) { showToast(t('ha.toast.img_save_failed'), true); return; }
    const { data: pub } = sb.storage.from('chat-images').getPublicUrl(path);
    scene.image_url = pub.publicUrl;
    S._hayalAlemi.imgGenCount = (S._hayalAlemi.imgGenCount || 0) + 1;
    haSave();
    try { window.fxCue?.('holoGrand'); } catch (_) {}
    showToast(t('ha.toast.img_done'));
    hayalAcKart(sceneId); // kartı görselle yeniden çiz
  } catch (e) {
    console.warn('haResmet:', e?.message);
    showToast(t('ha.toast.img_failed'), true);
  } finally {
    const b = document.getElementById('hayal-resmet-btn');
    if (b) {
      delete b.dataset.busy;
      b.classList.remove('hayal-resmet-btn--busy');
      const tEl = b.querySelector('.hayal-resmet-title');
      if (tEl) tEl.textContent = t('ha.resmet_title');
    }
  }
}

if (typeof window !== 'undefined') {
  window.haResmet = haResmet;
}

/* ══════════════════════════════════════════════════════════════
   PERSISTENCE
══════════════════════════════════════════════════════════════ */
export function haSave() {
  try {
    SafeStorage.setRaw(_haKey(), JSON.stringify(S._hayalAlemi));
  } catch (e) { console.warn('haSave:', e?.message); }
}

export function haLoad() {
  try {
    const raw = SafeStorage.getRaw(_haKey()) || SafeStorage.getRaw(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      Object.assign(S._hayalAlemi, parsed);
      // currentSession sayfa yenilemede sıfırlanır
      S._hayalAlemi.currentSession = null;
    }
  } catch (e) { console.warn('haLoad:', e?.message); }
}

export function haInit() {
  haLoad();
  recomputeYansimaScore();
}

/* ══════════════════════════════════════════════════════════════
   SEANS AKIŞI — 4 aşama
══════════════════════════════════════════════════════════════ */

// Hayal Seansı sayfasında (popup yok) bölümler arası geçiş: seans | harita | kart.
function _haShowSection(which) {
  const map = { seans: 'hayal-seans-wrap', harita: 'hayal-harita-section', kart: 'hayal-kart-section' };
  for (const [key, id] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (el) el.style.display = (key === which) ? '' : 'none';
  }
}

export function hayalAcSeans() {
  // Ayrı sayfa: Hayal Seansı view'ına geç.
  if (typeof window.switchView === 'function') window.switchView('hayalseans');

  // Günde 1 ücretsiz seans (premium yoksa)
  const today = TODAY();
  const last = S._hayalAlemi.lastSessionAt
    ? localISODate(new Date(S._hayalAlemi.lastSessionAt))
    : null;
  const usedToday = last === today;

  if (usedToday && !S.isPremium) {
    // Günde 1 ücretsiz seans — limit dolduysa yeni seans açma,
    // bunun yerine biriken sahneleri (Hayal Alemi haritası) göster.
    showToast(t('ha.toast.daily_done'));
    hayalAcHarita();
    return;
  }

  // Aşama 1 — kavram seçimi
  _hayalShowStep(1);
  _renderKavramGrid();
  _haShowSection('seans');
}

export function hayalKapatSeans() {
  S._hayalAlemi.currentSession = null;
  // Sayfadan çık → Bugün'e dön.
  if (typeof window.switchView === 'function') window.switchView('bugun');
}

/* Hayal Seansı sayfası (#hayalseans-view) açılırken: 1. adım + seans bölümü. */
export function loadHayalSeansView() {
  // Seans ekranı gerçekten çizildi — huninin giriş ucu (terk noktası ölçümü)
  try { window.wtLogRitus?.('hayal', 'basladi', { adim: 1 }); } catch (_) {}
  _hayalShowStep(1);
  _renderKavramGrid();
  _haShowSection('seans');
}

function _hayalShowStep(n) {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`hayal-step-${i}`);
    if (el) el.style.display = (i === n) ? '' : 'none';
  }
  const counter = document.getElementById('hayal-step-counter');
  if (counter) counter.textContent = `${n} / 4`;
}

function _renderKavramGrid() {
  const grid = document.getElementById('hayal-kavram-grid');
  if (!grid) return;
  // Düşük skorlu kavramı yukarıda öner
  const dp = S._depthProfile || {};
  const fp = S._foundationsProfile || {};
  /* Kanıtsız kavramın skoru YOKTUR. Eskiden `?? 50` ile hiç sinyal gelmemiş
     kavramlar da 50'yle sıralamaya giriyor ve kartın üstünde "50" rozeti gibi
     duruyordu. Ölçülmemişler listenin SONUNA düşer, etiketleri "—" kalır —
     sıra da bir iddiadır, uydurma sayıyla kurulmaz. */
  const _kavramSkor = (key) => {
    const o = dp[key] || fp[key];
    if (!o || typeof o.score !== 'number' || !isFinite(o.score)) return null;
    if ((o.signals_count || 0) < HA_MIN_SINYAL) return null;
    return o.score;
  };
  const sorted = [...HAYAL_KAVRAMLAR].sort((a, b) => {
    const sa = _kavramSkor(a.key), sb = _kavramSkor(b.key);
    if (sa == null && sb == null) return 0;
    if (sa == null) return 1;
    if (sb == null) return -1;
    return sa - sb;
  });
  grid.innerHTML = sorted.map(k => {
    const score = _kavramSkor(k.key);
    const scoreTxt = (score != null) ? `${score}` : '—';
    const cat = _catLabel(k.category);
    return `<button class="hayal-kavram-btn" data-key="${k.key}" onclick="hayalSecKavram('${k.key}')">
      <span class="hayal-kavram-glyph">${k.glyph}</span>
      <span class="hayal-kavram-label">${t(`ha.kavram.${k.key}.label`)}</span>
      <span class="hayal-kavram-meta">${cat} · ${scoreTxt}</span>
    </button>`;
  }).join('');
}

export async function hayalSecKavram(key) {
  const kavram = _kavram(key);
  if (!kavram) return;

  S._hayalAlemi.currentSession = {
    id: UID(),
    started_at: NOW(),
    concept: key,
    prompt: null,
    scene_text: null,
  };

  _hayalShowStep(2);
  const titleEl = document.getElementById('hayal-step2-kavram');
  if (titleEl) titleEl.textContent = `${kavram.glyph} ${kavram.label}`;
  const promptEl = document.getElementById('hayal-step2-prompt');
  if (promptEl) promptEl.textContent = t('ha.preparing_q');

  // LLM ile rehberli soru üret
  try {
    const personName = window.oikGetDesired?.()?.name || S._personTransition?.desired?.description?.trim() || kavram.seed;
    // Yönlendirme sözlükte (16b) — canlı hâli admin "Emre'nin Sesi" odasından gelebilir.
    const llmPrompt = p('prompt.hayal_alemi.visualization', {
      label: kavram.label,
      category: _catLabel(kavram.category),
      seed: kavram.seed,
      person: personName,
    });

    const response = await callLLM({
      contents: [{ role: 'user', parts: [{ text: llmPrompt }] }],
      systemPrompt: '',
      maxTokens: 200,
      temperature: 0.85,
      skipPersona: true,
    });

    const cleaned = (response || '').trim().replace(/^["']|["']$/g, '');
    const fallback = t('ha.fallback_q').replace('{seed}', kavram.seed.toLowerCase());
    const finalPrompt = cleaned || fallback;

    S._hayalAlemi.currentSession.prompt = finalPrompt;
    if (promptEl) promptEl.textContent = finalPrompt;
  } catch (e) {
    console.warn('hayal LLM:', e?.message);
    const fallback = t('ha.fallback_q').replace('{seed}', kavram.seed.toLowerCase());
    S._hayalAlemi.currentSession.prompt = fallback;
    if (promptEl) promptEl.textContent = fallback;
  }
}

export function hayalGecAdim3() {
  _hayalShowStep(3);
  const ta = document.getElementById('hayal-scene-input');
  if (ta) {
    ta.value = '';
    setTimeout(() => ta.focus(), 150);
  }
  // Soru'yu üst kısımda göster
  const reminderEl = document.getElementById('hayal-step3-reminder');
  if (reminderEl && S._hayalAlemi.currentSession?.prompt) {
    reminderEl.textContent = S._hayalAlemi.currentSession.prompt;
  }
}

export function hayalMuhurleSahne() {
  const ta = document.getElementById('hayal-scene-input');
  const text = (ta?.value || '').trim();
  if (text.length < 12) {
    showToast(t('ha.toast.describe_more'));
    return;
  }

  const cur = S._hayalAlemi.currentSession;
  if (!cur) {
    showToast(t('ha.toast.no_session'));
    return;
  }

  const sceneText = text.slice(0, 2000);
  const sahne = {
    id: cur.id,
    created_at: NOW(),
    concept: cur.concept,
    prompt: cur.prompt,
    scene_text: sceneText,
    archetypeId: S._currentArchetype?.id || null,
    sealed: true,
    yansima_count: 0,
    // Üretken hayal görseli için stabil seed
    artSeed: _haHash(`${cur.id}|${cur.concept}|${sceneText}`),
  };

  S._hayalAlemi.sahneler.push(sahne);
  S._hayalAlemi.lastSessionAt = NOW();
  S._hayalAlemi.sessionsCount = (S._hayalAlemi.sessionsCount || 0) + 1;
  S._hayalAlemi.currentSession = null;

  // Elmas ödülü: 15 baz + sahne uzunluğuna göre bonus
  const lenBonus = Math.min(10, Math.floor(text.length / 80));
  const total = 15 + lenBonus;
  awardElmas(total, 'hayal-seansi');
  recordActivityDay(); // hayal seansı = merkezî seriyi besleyen ritüel
  // Ritüellerin Nabzı (00f) — sahne mühürlendi: seans sonuna kadar gidildi
  try { window.wtLogRitus?.('hayal', 'tamam', { adim: 4 }); } catch (_) {}
  try { window.usCheckHayalDay?.(); } catch (_) {} // Hayal Mührü serisini besle

  recomputeYansimaScore();
  haSave();

  // Aşama 4 — mühürleme sahnesi
  _hayalShowStep(4);
  const artEl = document.getElementById('hayal-step4-art');
  if (artEl) artEl.innerHTML = haDreamCard(sahne, 'full');
  const successEl = document.getElementById('hayal-step4-elmas');
  if (successEl) successEl.textContent = t('ha.elmas_plus').replace('{n}', total);
  const countEl = document.getElementById('hayal-step4-count');
  if (countEl) countEl.textContent = t('ha.scene_growing').replace('{n}', S._hayalAlemi.sahneler.length);

  // Anasayfayı tazele
  setTimeout(() => {
    try {
      if (typeof window.renderAynaCard === 'function') window.renderAynaCard();
    } catch (_) {}
  }, 100);
}

/* ══════════════════════════════════════════════════════════════
   YANSIMA SKORU — Hayal Alemi ↔ Fiziksel Alem köprüsü
   ───────────────────────────────────────────────────────────
   Kullanıcının davranış kanıtlarının, hayal sahneleriyle
   ne kadar örtüştüğü. Şimdilik basit oran (kanıt/sahne).
══════════════════════════════════════════════════════════════ */

export function recomputeYansimaScore() {
  const sahneler = S._hayalAlemi?.sahneler?.length || 0;
  const kanitlar = S._wandererGame?.davranisKanitlari?.length || 0;
  if (sahneler === 0) {
    S._hayalAlemi.yansimaScore = 0;
    return 0;
  }
  // 1:1 ideal — her sahneye 1 kanıt
  const ratio = Math.min(1, kanitlar / sahneler);
  const score = Math.round(ratio * 100);
  S._hayalAlemi.yansimaScore = score;
  return score;
}

/* ══════════════════════════════════════════════════════════════
   HAYAL ALEMİ HARİTASI — biriken sahneler
══════════════════════════════════════════════════════════════ */

export function hayalAcHarita() {
  // Ayrı sayfa: Hayal Seansı view'ında harita bölümünü göster.
  if (typeof window.switchView === 'function') window.switchView('hayalseans');
  _renderHaritaList();
  _haShowSection('harita');
}

export function hayalKapatHarita() {
  _haShowSection('seans'); // seans akışına dön (sayfada kal)
}

function _renderHaritaList() {
  const listEl = document.getElementById('hayal-harita-list');
  const countEl = document.getElementById('hayal-harita-count');
  const yansEl = document.getElementById('hayal-harita-yansima');
  if (!listEl) return;

  const sahneler = (S._hayalAlemi.sahneler || []).slice().reverse();
  if (countEl) countEl.textContent = t('ha.scene_count').replace('{n}', sahneler.length);
  if (yansEl) {
    const score = recomputeYansimaScore();
    yansEl.textContent = t('ha.reflection_pct').replace('{n}', score);
  }

  if (sahneler.length === 0) {
    listEl.innerHTML = `
      <div class="hayal-empty">
        <div class="hayal-empty-glyph">◇</div>
        <div class="hayal-empty-text">${t('ha.empty_text')}</div>
        <button class="ws-ayna-btn ws-ayna-btn--gold" onclick="hayalKapatHarita(); hayalAcSeans();">${t('ha.start_session')}</button>
      </div>`;
    return;
  }

  listEl.innerHTML = sahneler.map(s => {
    const kavram = _kavram(s.concept) || { label: s.concept, glyph: '◆' };
    const date = new Date(s.created_at).toLocaleDateString(S._currentLang || 'tr', { day: 'numeric', month: 'short', year: 'numeric' });
    const safeText = (s.scene_text || '').replace(/</g, '&lt;');
    const excerpt = safeText.length > 180 ? safeText.slice(0, 180) + '…' : safeText;
    return `<button class="hayal-sahne-card" data-scene-id="${s.id}" onclick="hayalAcKart('${s.id}')">
      <div class="hayal-sahne-thumb">${haDreamCard(s, 'mini')}</div>
      <div class="hayal-sahne-body">
        <div class="hayal-sahne-head">
          <span class="hayal-sahne-glyph">${kavram.glyph}</span>
          <span class="hayal-sahne-kavram">${kavram.label}</span>
          <span style="flex:1;"></span>
          <span class="hayal-sahne-date">${date}</span>
        </div>
        <div class="hayal-sahne-text">${excerpt}</div>
      </div>
    </button>`;
  }).join('');
}

/* ══════════════════════════════════════════════════════════════
   YARDIMCILAR (export)
══════════════════════════════════════════════════════════════ */

export function getHayalStats() {
  return {
    total: S._hayalAlemi?.sahneler?.length || 0,
    sessionsCount: S._hayalAlemi?.sessionsCount || 0,
    yansimaScore: S._hayalAlemi?.yansimaScore || 0,
    lastSessionAt: S._hayalAlemi?.lastSessionAt || null,
  };
}
