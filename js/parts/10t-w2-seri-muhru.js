/* ═══════════════════════════════════════════════════════════════════
   10t — SERİ MÜHRÜ · Günü Mühürleme Töreni + Kilometre Taşı Kartları
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Zincir bir liste değil, bir kimlik inşasıdır. "Bu Hafta · Zincir"
     tablosu Bugün ekranından kalktı; yerine her yeni güne BAŞLADIĞINDA
     bir kez beliren bir MÜHÜRLEME TÖRENİ geldi. Gelmek = bugünün
     halkasını dövmek. Çekirdek tez: "Mesele Sensin" — üst üste gelen
     küçük günler, olmak istediğin kişiyi gerçek kılar.

   ÜÇ TÖREN (zorlukla orantılı):
     • BAŞLANGIÇ  — zincirin ilk halkası (n===1). İlk kez ise HEDEF sorulur.
     • SÜRDÜRME   — günü mühürle, sayı artar, hedefe ilerleme.
     • KİLOMETRE  — 7/15/30/60/120/180/240/365. Görkem tier'a göre büyür;
                    o güne özel KART kazanılır ve koleksiyona eklenir.

   KART DESTESİ: 8 kilometre taşı kartı; her biri ayrı ad/sigil/söz/tier.
     Gerçekleştiğinde bir kez verilir, Bugün'deki Seri Mührü kartından
     açılan koleksiyonda kalıcı saklanır.

   Kalıcılık: SafeStorage per-uid (etw_seri_muhru_v1_<uid>). Supabase YOK.
   Konvansiyon: hardcoded TR string. TDZ güvenliği: modüller-arası erişim
   window.* üzerinden. Stiller: css/parts/seri-muhru.css (link ile).
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage, recordActivityDay, localISODate } from './00a-infrastructure.js';
import { ikvCardFace, ikvMilestoneScene } from './12c-kart-gorsel.js';
import { t } from './15-i18n.js';

const STORAGE_KEY = 'etw_seri_muhru_v1';

/* Dile duyarlı locale (toLocaleX için) */
const _locale = () => (S._currentLang === 'tr' ? 'tr-TR' : 'en-US');

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ── Gün anahtarı — 00a tek kaynağı (padded). Bu defter hayal/söz ile aynı
      formatı kullanır; SERİ defteri pad'siz `localDayKey`'dir (10f
      yolDayRings başlığındaki harita). ── */
function smDayKey() {
  return localISODate();
}

/* ════════════════════════════════════════════════════════════════════
   KİLOMETRE TAŞI KARTLARI (kitap-köklü: Mesele Sensin · tutarlılık)
   tier 1→4: zorlukla orantılı görkem (animasyon yoğunluğu + kart sınıfı)
════════════════════════════════════════════════════════════════════ */
/* Yapı (gün/glyph/tier) sabit; ad/alt/söz i18n'den render anında çözülür
   (yük-anında t() çağırma → dil donar). */
const SM_CARDS = [
  { d: 7,   glyph: '☽', tier: 1 },
  { d: 15,  glyph: '✦', tier: 1 },
  { d: 30,  glyph: '◈', tier: 2 },
  { d: 60,  glyph: '❖', tier: 2 },
  { d: 120, glyph: '✶', tier: 3 },
  { d: 180, glyph: '❂', tier: 3 },
  { d: 240, glyph: '⟡', tier: 4 },
  { d: 365, glyph: '☼', tier: 4 },
];

const _cardName = (d) => t(`sm.card.${d}.name`);
const _cardSub  = (d) => t(`sm.card.${d}.sub`);
const _cardLine = (d) => t(`sm.card.${d}.line`);
function _resolveCard(c) {
  return c ? { ...c, name: _cardName(c.d), sub: _cardSub(c.d), line: _cardLine(c.d) } : null;
}
function _cardFor(n) { return _resolveCard(SM_CARDS.find(c => c.d === n)); }
function _nextMilestone(n) { return _resolveCard(SM_CARDS.find(c => c.d > n)); }

/* ── Hedef ön ayarları (kilometre taşlarıyla hizalı) — render anında çözülür ── */
function _smGoals() {
  return [7, 30, 180, 365].map(d => ({
    d, label: _cardName(d), sub: t('sm.ndays').replace('{n}', d),
  }));
}

/* ════════════════════════════════════════════════════════════════════
   PERSİSTANS
════════════════════════════════════════════════════════════════════ */
function _default() {
  return { lastSealedDay: null, goal: null, goalReachedAt: null, cards: {}, bestStreak: 0, totalSeals: 0 };
}
function _key() { return `${STORAGE_KEY}_${(S.currentUser && S.currentUser.id) || 'anon'}`; }

export function smSave() {
  try { SafeStorage.set(_key(), S._seriMuhru); } catch (e) { console.warn('smSave:', e && e.message); }
}
export function smLoad() {
  try {
    const data = SafeStorage.get(_key());
    if (data && typeof data === 'object') S._seriMuhru = Object.assign(_default(), data);
  } catch (e) { console.warn('smLoad:', e && e.message); }
}
export function smInit() {
  if (!S._seriMuhru) S._seriMuhru = _default();
  smLoad();
  try { smRenderBugunCard(); } catch (_) {}
}

/* ── Mevcut seri (merkezî defter — sohbet + ritüel) ── */
function _currentStreak() {
  try { if (window.recomputeStreakUI) return window.recomputeStreakUI() | 0; } catch (_) {}
  try { return parseInt(document.getElementById('streak-val')?.textContent || '0', 10) || 0; } catch (_) {}
  return 0;
}

function _userName() {
  const u = S.currentUser;
  return (u && (u.name || (u.user_metadata && u.user_metadata.name))) || t('sm.gezgin');
}

/* ── Bugünün sözü (10s · Günlük Ritüel ile kenetlenme) ────────────────
   "Gelmek = halka dövmek" + "söz vermek" tek kimlik inşasıdır. Mühür,
   o gün verilen sözü tanır: söz varsa daha güçlü dövülür. ── */
function _todaysPledgeInfo() {
  try {
    const r = S._gunlukRitus;
    if (r && r.date === smDayKey() && Array.isArray(r.pledges)) {
      const kept = r.pledges.filter(p => p && p.kept).length;
      return { count: r.pledges.length, kept, reckoned: !!r.reckoned, skipped: !!r.skipped };
    }
    return { count: 0, kept: 0, reckoned: false, skipped: !!(r && r.date === smDayKey() && r.skipped) };
  } catch (_) {}
  return { count: 0, kept: 0, reckoned: false, skipped: false };
}

/* ── Bugünün üç vuruşu (10u'dan; tören "örs üstünde halka" sahnesi için) ──
   Seri vuruşu O AN dövülüyor → halkanın ✦ segmenti çiziliyor olarak işaretlenir;
   hayal/söz segmentleri o günkü durumlarına göre canlı/sönük. 10u yoksa yalnız
   seri segmenti görünür. */
function _strikeStates() {
  const DEF = [
    { id: 'seri',  glyph: '✦' },
    { id: 'hayal', glyph: '◉' },
    { id: 'soz',   glyph: '◆' },
  ];
  return DEF.map(d => {
    let on = d.id === 'seri'; // seri bu an dövülüyor
    try { const st = window.usSeriesState?.(d.id); if (st) on = d.id === 'seri' ? true : !!st.activeToday; } catch (_) {}
    return { ...d, on };
  });
}
/* Üç yay segmentli halka SVG — seri segmenti "draw-in" ile dövülür */
function _strikeRingSVG(strikes) {
  const SEG = 84, GAP = 205;
  return strikes.map((s, i) => `
    <circle class="sm-strike-arc sm-strike-arc--${s.id}${s.on ? ' sm-strike-arc--on' : ''}${s.id === 'seri' ? ' sm-strike-arc--struck' : ''}"
            cx="60" cy="60" r="46"
            stroke-dasharray="${SEG} ${GAP}"
            transform="rotate(${-84 + i * 120} 60 60)"/>`).join('');
}

/* ════════════════════════════════════════════════════════════════════
   PORTAL
════════════════════════════════════════════════════════════════════ */
function _mountPortal() {
  let portal = document.getElementById('sm-portal');
  if (!portal) { portal = document.createElement('div'); portal.id = 'sm-portal'; document.body.appendChild(portal); }
  portal.className = 'sm-portal';
  window.wtOverlayOpen?.('seri-muhru');   // Kullanım Nabzı (00f) — tören süresi
  return portal;
}
function _closePortal() {
  // Tanıma Motoru (FAZ 1) — bu törende mühür DAİMA 'muhur'dur: seri kaydı
  // smSealToday() içinde portal açılmadan ÖNCE zaten yazılmıştır (bu portal
  // yalnız kutlama sahnesidir); geri dönüşsüz Escape/vazgeç yolu yok.
  window.wtOverlayClose?.('seri-muhru', 'muhur');
  const p = document.getElementById('sm-portal');
  if (p) p.remove();
  // Tören/koleksiyon portalı kapanırken elmas barını mevcut view'e göre yeniden
  // assert et (10s sahibi); böylece bar hiçbir koşulda "kaybolmuş" kalmaz.
  try { window.glSyncElmasBar?.(window.glActiveViewName ? window.glActiveViewName() : ''); } catch (_) {}
  // Yarım kalan ritüel zinciri: bu portal akşam (at-seal) veya sabah armağan
  // köprüsünden gelmiş olabilir; kapanışta her ikisini de idempotent yokla —
  // self-gating, uygun değilse sessizce çıkar.
  try { window.atRun?.(false); } catch (_) {}
  try { window.glRunDailyRitual?.(false); } catch (_) {}
}

/* ── Tören uygun mu? + bloklayıcı overlay var mı? ── */
function _applicable() {
  const app = document.getElementById('app-screen');
  if (!app || app.style.display === 'none') return false;
  if (!S._seriMuhru) return false;
  return true;
}
function _blocked() {
  // Günlük Armağan/Söz akışı, kapı, intro, onboarding, açılış perdesi bitene kadar bekle.
  if (document.getElementById('gl-portal')) return true;
  if (document.getElementById('yol-portal')) return true; // Yol açıkken tören beklesin
  if (document.getElementById('gor-portal')) return true; // Bakış (Gördün) açıkken tören beklesin
  if (document.getElementById('ig-portal')) return true;  // İmge Kapısı (13z) açıkken beklesin
  if (document.getElementById('wn-splash')?.classList.contains('show')) return true;
  if (document.getElementById('onb-ritual') || document.querySelector('.sc-onb')) return true;
  if (document.querySelector('.fgate-overlay, .fgate-doors')) return true;
  // Tören Wanderer Studio'ya has: yalnız Bugün ekranında (#bugun-view) dövülür.
  // Wanderer LLM ön-yüzü (#chat-view) kendi bağımsız serisini taşır (13r Gün
  // Serisi). Armağan'ın "İlgili Yazı"sıyla Kütüphane'ye ya da başka bir view'e
  // geçilmişse oraya düşmesin; kullanıcı Bugün'e dönene dek ertelenir.
  const active = document.querySelector('.view.active');
  const onBugun = active && active.id === 'bugun-view';
  if (!onBugun) return true;
  return false;
}

/* ════════════════════════════════════════════════════════════════════
   GÜNLÜK TÖREN — günde bir kez
════════════════════════════════════════════════════════════════════ */
let _smRetries = 0;
const _SM_MAX_RETRIES = 30; // ~30 × 1500ms: günlük armağan/söz + intro bitene kadar

export function smRunDaily(force) {
  if (!_applicable()) return;
  if (S._seriMuhru.lastSealedDay === smDayKey() && !force) { smRenderBugunCard(); return; }
  if (!force && _blocked()) {
    if (_smRetries++ < _SM_MAX_RETRIES) setTimeout(() => smRunDaily(false), 1500);
    return;
  }
  if (document.getElementById('sm-portal')) return; // zaten açık
  /* Günün mührü davetsiz gelir: oturum bütçesine tabidir (13B). Kullanıcı
     Bugün kartından kendi tıklarsa force=true ile gelir ve sıra sorulmaz —
     davet edilen misafir kotadan düşmez. */
  if (window.trnIzin?.('seri-muhru') === false) return;
  _smRetries = 0;
  smSealToday();
}

/** Bugünü mühürle: aktiviteyi işle, seriyi al, töreni belirle ve göster. */
export function smSealToday() {
  // Gelmek = bugünün halkasını dövmek → merkezî deftere işle (seriyi besler).
  try { recordActivityDay(); } catch (_) {}
  try { window.wtLogRitus?.('seri-muhru', 'tamam'); } catch (_) {}
  const n = Math.max(1, _currentStreak());

  const st = S._seriMuhru;
  const firstEver = !st.goal && !Object.keys(st.cards || {}).length && (st.bestStreak | 0) === 0;

  // Kazanılacak kilometre taşı kartı (henüz verilmemiş)?
  const card = _cardFor(n);
  const newCard = card && !(st.cards && st.cards[String(n)]);

  let variant = 'continue';
  if (newCard) variant = 'milestone';
  else if (n === 1) variant = 'start';

  // Durum güncelle
  st.lastSealedDay = smDayKey();
  st.totalSeals = (st.totalSeals | 0) + 1;
  if (n > (st.bestStreak | 0)) st.bestStreak = n;
  if (newCard) st.cards[String(n)] = { at: smDayKey() };
  if (st.goal && n >= st.goal && !st.goalReachedAt) st.goalReachedAt = smDayKey();
  smSave();

  // İlk kilometre taşı YOL sırtını açar — serinin izi destenin dışına geçer
  // (10q kkSirtKazan idempotent; sırtın kendi töreni yok, bu perde yeter).
  if (newCard) { try { window.kkSirtKazan?.('yol'); } catch (_) {} }

  _renderSealCeremony({ variant, n, card: newCard ? card : null, firstEver, pledge: _todaysPledgeInfo() });
  try { smRenderBugunCard(); } catch (_) {}
  try { window.usOnSeriSealed?.(); } catch (_) {} // Ultra: seri canlandı → çember/ultra tazele
  try { window.wkSync?.(); } catch (_) {} // Widget köprüsü (13k) — ana ekran tazele
}

/* ── Parçacık/ışın enjeksiyonu (tier yoğunluğuyla orantılı) ── */
function _spawnSparks(host, count, spread) {
  if (!host) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (reduce) return;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'sm-spark';
    const ang = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = (spread * (0.55 + Math.random() * 0.55)) | 0;
    s.style.setProperty('--tx', `${Math.cos(ang) * dist}px`);
    s.style.setProperty('--ty', `${Math.sin(ang) * dist}px`);
    s.style.setProperty('--dl', `${(Math.random() * 0.35).toFixed(2)}s`);
    s.style.setProperty('--sz', `${(2 + Math.random() * 3).toFixed(1)}px`);
    frag.appendChild(s);
  }
  host.appendChild(frag);
}

/* ── Sayı say (n-1 → n) ── */
function _countUp(el, to, dur) {
  if (!el) return;
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const from = Math.max(0, to - 1);
  if (reduce || dur <= 0) { el.textContent = to; return; }
  const t0 = performance.now();
  function step(t) {
    const p = Math.min(1, (t - t0) / dur);
    el.textContent = Math.round(from + (to - from) * p);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ════════════════════════════════════════════════════════════════════
   TÖREN RENDER
════════════════════════════════════════════════════════════════════ */
function _renderSealCeremony({ variant, n, card, firstEver, pledge }) {
  const portal = _mountPortal();
  const tier = card ? card.tier : (variant === 'start' ? 1 : 1);
  const glyph = card ? card.glyph : (variant === 'start' ? '◈' : '✦');
  const name = esc(_userName()).toLocaleUpperCase(_locale());
  const p = pledge || { count: 0, kept: 0, reckoned: false, skipped: false };
  const sworn = p.count > 0;

  let kicker, title, body, ctaLabel, milestoneHTML = '', goalHTML = '';

  if (variant === 'milestone') {
    kicker = t('sm.kicker.milestone').replace('{d}', card.d);
    title = `${esc(card.name)}`;
    body = esc(card.line);
    ctaLabel = t('sm.cta.claim');
    milestoneHTML = `
      <div class="sm-card sm-card--t${card.tier}" id="sm-card-reveal">
        <div class="sm-card-shine"></div>
        ${ikvCardFace({ id: 'sm-' + card.d, name: card.name }, {
          palette: 'gold',
          kicker: t('sm.brand'),
          badge: t('sm.badge.days').replace('{d}', card.d),
          sub: card.sub,
          scene: ikvMilestoneScene(card.d),
        })}
      </div>
      <div class="sm-reflect">
        <label class="sm-reflect-q" for="sm-note">${t('sm.reflect.q')} <span>${t('sm.optional')}</span></label>
        <input class="sm-reflect-input" id="sm-note" type="text" maxlength="140"
               placeholder="${esc(t('sm.reflect.ph'))}" autocomplete="off">
      </div>`;
  } else if (variant === 'start') {
    kicker = (firstEver ? t('sm.kicker.first') : t('sm.kicker.restart')).replace('{name}', name);
    title = t('sm.start.title');
    body = firstEver ? t('sm.start.body.first') : t('sm.start.body.restart');
    ctaLabel = firstEver ? null : t('sm.cta.started');
    if (firstEver) {
      goalHTML = `
        <div class="sm-goal" id="sm-goal">
          <div class="sm-goal-q">${t('sm.goal.q')}</div>
          <div class="sm-goal-grid">
            ${_smGoals().map(g => `
              <button class="sm-goal-opt" data-goal="${g.d}">
                <span class="sm-goal-label">${esc(g.label)}</span>
                <span class="sm-goal-sub">${esc(g.sub)}</span>
              </button>`).join('')}
          </div>
        </div>`;
    }
  } else {
    const nm = _nextMilestone(n);
    const goal = S._seriMuhru.goal;
    kicker = t('sm.kicker.today').replace('{name}', name);
    title = t('sm.continue.title');
    body = t('sm.continue.body');
    ctaLabel = t('sm.cta.continue');
    const target = goal || (nm ? nm.d : n);
    const pct = Math.max(4, Math.min(100, Math.round((n / target) * 100)));
    goalHTML = `
      <div class="sm-prog">
        <div class="sm-prog-bar"><div class="sm-prog-fill" style="width:${pct}%"></div></div>
        <div class="sm-prog-meta">
          <span>${t('sm.ndays').replace('{n}', n)}</span>
          <span>${nm ? t('sm.next').replace('{name}', nm.name).replace('{d}', nm.d) : (goal ? t('sm.goal.label').replace('{goal}', goal) : '')}</span>
        </div>
      </div>`;
  }

  // Söz farkındalığı — mührün altında ince bir satır (kenetlenme).
  const sozHTML = sworn
    ? `<div class="sm-sworn sm-sworn--on">${t('sm.sworn.on').replace('{count}', p.count)}</div>`
    : (variant !== 'start' || !firstEver)
      ? `<div class="sm-sworn sm-sworn--off">${t('sm.sworn.off')} <button class="sm-sworn-link" id="sm-sworn-link" type="button">${t('sm.sworn.link')}</button></div>`
      : '';

  portal.innerHTML = `
    <div class="sm-veil"></div>
    <div class="sm-modal sm-tier-${tier} ${variant === 'milestone' ? 'sm-modal--grand' : ''} ${sworn ? 'sm-modal--sworn' : ''}" role="dialog" aria-modal="true" aria-label="${esc(t('sm.aria.seal'))}"><div class="wn-grain">
      <div class="sm-kicker">${kicker}</div>

      <div class="sm-stage">
        <div class="sm-rays" aria-hidden="true"></div>
        <div class="sm-shock" aria-hidden="true"></div>
        <div class="sm-seal">
          <svg class="sm-seal-ring sm-seal-ring--strikes" viewBox="0 0 120 120" aria-hidden="true">
            ${_strikeRingSVG(_strikeStates())}
          </svg>
          <div class="sm-seal-glyph">${glyph}</div>
          <div class="sm-seal-count" id="sm-seal-count">${n}</div>
        </div>
        <div class="sm-sparks" id="sm-sparks" aria-hidden="true"></div>
      </div>

      <div class="sm-title">${esc(title)}</div>
      <div class="sm-body">${body}</div>
      ${sozHTML}
      ${milestoneHTML}
      ${goalHTML}
      ${ctaLabel ? `<button class="sm-cta" id="sm-cta">${ctaLabel}</button>` : ''}
      ${variant === 'milestone' ? `<button class="sm-share" id="sm-share" type="button">${t('sm.share.card')}</button>` : ''}
    </div></div>`;

  // holo: kilometre kartı elde tutulmuş gibi ışığı izler (12c motoru)
  if (variant === 'milestone') { try { window.ikvHoloScan && window.ikvHoloScan(portal); } catch (_) {} }

  // Parçacık yoğunluğu tier ile
  const sparkHost = document.getElementById('sm-sparks');
  const sparkCount = [10, 14, 20, 30][tier - 1] || 14;
  const spread = [70, 90, 120, 150][tier - 1] || 90;
  setTimeout(() => _spawnSparks(sparkHost, sparkCount, spread), 260);

  // His Motoru (13e) — mühür "tok" düşer; kilometre taşında tier gongu
  setTimeout(() => {
    try { window.fxCue?.(variant === 'milestone' ? `milestone${tier}` : 'seal'); } catch (_) {}
  }, 280);

  // Sayı say-up
  const countEl = document.getElementById('sm-seal-count');
  setTimeout(() => _countUp(countEl, n, 700), 320);

  // Hedef seçimi
  if (variant === 'start' && firstEver) {
    portal.querySelectorAll('.sm-goal-opt').forEach(btn => {
      btn.addEventListener('click', () => smChooseGoal(parseInt(btn.dataset.goal, 10)));
    });
  }
  // CTA — milestone'da yansıma notunu kartla birlikte sakla
  const cta = document.getElementById('sm-cta');
  if (cta && variant === 'milestone') {
    cta.addEventListener('click', () => {
      const note = (document.getElementById('sm-note')?.value || '').trim();
      const rec = S._seriMuhru && S._seriMuhru.cards && S._seriMuhru.cards[String(n)];
      if (note && rec) { rec.note = note.slice(0, 140); smSave(); }
      _closeCeremony();
    });
  } else if (cta) {
    cta.addEventListener('click', _closeCeremony);
  }
  // "Söz ver →" — mühürden doğrudan Günün Sözü akışına (kenetlenme)
  const sozLink = document.getElementById('sm-sworn-link');
  if (sozLink) sozLink.addEventListener('click', () => {
    _closeCeremony();
    setTimeout(() => { try { window.glGiveSozNow?.(); } catch (_) {} }, 300);
  });
  // PAYLAŞ (13g) — kartı story görseline çevirip paylaş; tören açık kalır,
  // yansıma notu yazıldıysa görsele de işlenir.
  const share = document.getElementById('sm-share');
  if (share && variant === 'milestone' && card) {
    share.addEventListener('click', () => {
      const note = (document.getElementById('sm-note')?.value || '').trim();
      smShareCard(card, note);
    });
  }
}

/** Kilometre taşı kartını story görseli olarak paylaş (13g Paylaşım Motoru). */
export function smShareCard(card, note) {
  if (!card) return;
  try {
    window.shrShareStory?.({
      kicker: t('sm.share.kicker'),
      glyph: card.glyph, big: card.d, bigLabel: t('sm.share.daylabel'),
      title: card.name, sub: card.sub, line: card.line,
      note: (note || '').slice(0, 140), tier: card.tier,
    });
  } catch (_) {}
}

export function smChooseGoal(goal) {
  if (!S._seriMuhru) return;
  S._seriMuhru.goal = goal;
  smSave();
  _closeCeremony();
  try { smRenderBugunCard(); } catch (_) {}
}

function _closeCeremony() {
  const modal = document.querySelector('#sm-portal .sm-modal');
  if (modal) {
    modal.classList.add('sm-modal--out');
    setTimeout(_closePortal, 280);
  } else { _closePortal(); }
}

/* ════════════════════════════════════════════════════════════════════
   BUGÜN YÜZEYİ — artık Yol hero'su (10f). Ad korunur: smSealToday +
   tüm dış çağıranlar bunu çağırır; 10u usRenderBugunCard'ı devralır
   (yolRenderHero'ya delege). Eski #sm-bugun-card kartı emekli.
════════════════════════════════════════════════════════════════════ */
export function smRenderBugunCard() {
  if (typeof window !== 'undefined' && window.usRenderBugunCard && window.usRenderBugunCard !== smRenderBugunCard) {
    try { window.usRenderBugunCard(); } catch (_) {}
  }
}

/* ════════════════════════════════════════════════════════════════════
   ÜÇ MÜHÜR MERKEZİ → YOL (10f)
   Eski tri-card + galeri modalı emekli oldu; tüm giriş noktaları
   (Drawer "ÜÇ MÜHÜR", Bugün Ay butonu, hero halkası) artık Yol
   ekranına çıkar. Ad korunur — _src.html onclick'leri değişmedi.
════════════════════════════════════════════════════════════════════ */
export function smOpenCollection() {
  try { window.yolOpen?.(); } catch (_) {}
}

/** Hedefi ayarla/temizle — galeri ve tören dışından da çağrılabilir (portal kapatmaz). */
export function smSetGoal(goal) {
  if (!S._seriMuhru) return;
  S._seriMuhru.goal = goal || null;
  if (goal && _currentStreak() >= goal && !S._seriMuhru.goalReachedAt) S._seriMuhru.goalReachedAt = smDayKey();
  smSave();
  try { smRenderBugunCard(); } catch (_) {}
}

/* ── window expose (HTML/inline + TDZ-güvenli modüller-arası erişim) ── */
if (typeof window !== 'undefined') {
  window.smInit = smInit;
  window.smRunDaily = smRunDaily;
  window.smSealToday = smSealToday;
  window.smChooseGoal = smChooseGoal;
  window.smRenderBugunCard = smRenderBugunCard;
  window.smOpenCollection = smOpenCollection;
  window.smSetGoal = smSetGoal;
  window.smShareCard = smShareCard;
}
