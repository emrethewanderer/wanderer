/* ═══════════════════════════════════════════════════════════════════
   12f — HAZİNE DESTESİ · Paket Motoru ("Kimlik kazanılır, bilgelik toplanır")
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Kişi Kartları (10q/12b) "olduğun kişi"yi anlatır — davranışla kazanılır,
     asla satın alınmaz. Hazine kartları kitabın bilgeliğini (manifesto,
     derinlikler, temeller, panzehirler, çerçeveler, aforizmalar, Işık
     Kanonu) taşır — Elmas'la açılan paketlerden çıkar. Elmas'ın birikip
     hiç harcanmadığı boşluğu (10g awardElmas/spendElmas) doldurur; Işık
     Kanonu bilinçli olarak satılamaz — ayet asla şansa bağlanmaz (K6).
   MEKANİK / TEK GİRİŞ:
     İçerik sidecar'dan (bundle diyeti — 12b/12b2 deseninin ikizi):
     `hazineReady()` → `ensureExt('hazine')` → 12f1'in `buildHazineData`
     fabrikası. API sözleşmesi SYNC kalır: veri gelmeden getHazineSetler()=[]
     — tüketiciler savunmacı. Durum 12e deseninin ikizi: S'e YAZILMAZ,
     her çağrıda SafeStorage'dan okunur/yazılır (satın alma seyrek bir
     kullanıcı eylemi — kkTick gibi sık tick'e ihtiyaç yok).
     Akış: hzBuyPack → spendElmas → hzDrawPack (saf RNG+pity) →
     hzApplyDraw (koleksiyona işle + dupe→holo→iade) → hzDetectSetCompletion.
   Kalıcılık: SafeStorage per-uid (etw_hazine_v1_<uid>) — otomatik Supabase
     user_analytics KV senkronu (yeni tablo YOK, [[kisi-kartlari]] örneğinin
     aksine hazine sosyal yüzeye çıkmıyor).
   Konvansiyon: i18n t(); window.hz* expose; stiller css/parts/hazine.css.
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { sb } from '../config.js';
import { SafeStorage, localISODate, escapeHTML, showToast } from './00a-infrastructure.js';
import { ensureExt } from './00-ext-loader.js';
import { kumHeuristicSpec } from './12d-kart-uretim.js';
import { RARITIES } from './12b-kart-destesi.js';
import { ikvCardFace, ikvCardBack, ikvRing } from './12c-kart-gorsel.js';
import { kkEnsureStyles } from './10q-w2-kisi-karti.js';
import { awardElmas, spendElmas } from './10g-w2-wanderer-game.js';
import { t } from './15-i18n.js';

/* ── Hafif manifest (ANA BUNDLE'da) — içerik gelmeden raf iskeleti çizilebilsin.
   Gerçek sayılar/palet 12f1'den doğrulanır; burada yalnız UI'nin ilk boyaması
   için kopya tutulur (K1). ─────────────────────────────────────────────── */
export const HZ_SET_MANIFEST = [
  { id: 'manifesto',   ad: 'Manifesto',   glyph: '⟡', count: 12, palette: 'gold' },
  { id: 'derinlikler', ad: 'Derinlikler', glyph: '◈', count: 8,  palette: 'gold' },
  { id: 'temeller',    ad: 'Temeller',    glyph: '❖', count: 6,  palette: 'gold' },
  { id: 'perdeler',    ad: 'Perdeler',    glyph: '◇', count: 6,  palette: 'gold' },
  { id: 'zehirler',    ad: 'Zehirler',    glyph: '◐', count: 6,  palette: 'gold' },
  { id: 'tuzaklar',    ad: 'Tuzaklar',    glyph: '⊘', count: 7,  palette: 'gold' },
  { id: 'cerceveler',  ad: 'Çerçeveler',  glyph: '✦', count: 10, palette: 'gold' },
  { id: 'aforizmalar', ad: 'Aforizmalar', glyph: '❋', count: 12, palette: 'gold' },
  { id: 'isik_kanonu', ad: 'Işık Kanonu', glyph: '☀', count: 10, palette: 'lapis', satilamaz: true },
];

export const HZ_WEIGHTS = { yaygin: 50, nadir: 30, nadide: 15, efsane: 5 };
export const HZ_PITY_NADIDE = 5;   // N pakette en az 1 nadide+ garanti
export const HZ_PITY_EFSANE = 24;  // N pakette efsane garanti
export const HZ_PACK_SIZE = 3;
export const HZ_PACK_COST = 30;
export const HZ_SET_BONUS_ELMAS = 40;
export const HZ_DUPE_REFUND = { yaygin: 2, nadir: 3, nadide: 5, efsane: 8 };

/* ════════════════════════════════════════════════════════════════════════
   1) İÇERİK — sidecar hidrasyonu (12b deckReady() deseninin ikizi)
═══════════════════════════════════════════════════════════════════════════ */
let _setler = null;
let _kartlar = null;
let _byId = null;
let _bySet = null;
let _hzP = null;

export function hazineReady() {
  if (_kartlar) return Promise.resolve(true);
  if (_hzP) return _hzP;
  _hzP = ensureExt('hazine').then(ns => {
    if (typeof ns?.buildHazineData !== 'function') throw new Error('hazine namespace boş');
    if (!_kartlar) {
      const data = ns.buildHazineData({ kumHeuristicSpec });
      _setler = data.setler;
      _kartlar = data.kartlar;
      _byId = new Map(_kartlar.map(c => [c.id, c]));
      _bySet = new Map();
      for (const c of _kartlar) {
        if (!_bySet.has(c.set)) _bySet.set(c.set, []);
        _bySet.get(c.set).push(c);
      }
    }
    return true;
  }).catch(e => {
    _hzP = null; // geçici ağ hatası kalıcı olmasın
    console.error('hazine sidecar yüklenemedi:', e);
    return false;
  });
  return _hzP;
}

// Boot'ta hemen iste — ilk tüketici (Hazine Odası) geldiğinde çoktan hazır.
if (typeof window !== 'undefined') hazineReady();

export function getHazineSetler() { return _setler || HZ_SET_MANIFEST; }
export function getHazineKartById(id) { return _byId ? (_byId.get(id) || null) : null; }
export function getHazineKartlarBySet(setId, opts) {
  const list = (_bySet && _bySet.get(setId)) || [];
  return opts && opts.excludeTac ? list.filter(c => !c.tac) : list;
}
export function getHazineTacKart(setId) {
  return (getHazineKartlarBySet(setId) || []).find(c => c.tac) || null;
}

/* ════════════════════════════════════════════════════════════════════════
   2) DURUM — SafeStorage per-uid (12e _isikState() deseninin ikizi; S'e
   yazılmaz — satın alma seyrek bir eylem, sık tick gerekmiyor).
═══════════════════════════════════════════════════════════════════════════ */
const HZ_KEY = 'etw_hazine_v1';
function _hzKey() { return `${HZ_KEY}_${(S.currentUser && S.currentUser.id) || 'anon'}`; }

function _hzDefaultState() {
  return {
    collection: {},   // { [cardId]: { earnedAt, holo, dupes } }
    sets: {},         // { [setId]: { completedAt, tacAt, bonusAt } }
    packs: { opened: 0, sincePityNadide: 0, sincePityEfsane: 0 },
    gift: { lastWeekKey: null },
    ayetCursor: 0,
    pendingBonus: [],
    history: [],
  };
}

export function hzState() {
  const raw = SafeStorage.get(_hzKey(), null);
  const st = Object.assign(_hzDefaultState(), raw || {});
  st.packs = Object.assign({ opened: 0, sincePityNadide: 0, sincePityEfsane: 0 }, st.packs || {});
  st.gift = Object.assign({ lastWeekKey: null }, st.gift || {});
  return st;
}
export function hzSaveState(state) { try { SafeStorage.set(_hzKey(), state); } catch (_) {} }

export function hzOwnedCount(state, setId) {
  const members = getHazineKartlarBySet(setId, { excludeTac: true });
  return members.filter(c => state.collection[c.id]).length;
}

/* ════════════════════════════════════════════════════════════════════════
   3) RNG + PITY — saf fonksiyon, `rand` enjekte edilir (test edilebilir)
═══════════════════════════════════════════════════════════════════════════ */
const RARITY_TIERS = ['yaygin', 'nadir', 'nadide', 'efsane'];
const FALLBACK_ORDER = ['nadir', 'yaygin', 'nadide', 'efsane'];

export function hzWeightedRarityPick(rand) {
  const total = RARITY_TIERS.reduce((a, t) => a + HZ_WEIGHTS[t], 0);
  let r = rand() * total;
  for (const t of RARITY_TIERS) { if (r < HZ_WEIGHTS[t]) return t; r -= HZ_WEIGHTS[t]; }
  return RARITY_TIERS[RARITY_TIERS.length - 1];
}

/** Saf çekiliş: verilen `cards` havuzundan (bir setin taç-hariç kartları)
 *  HZ_PACK_SIZE kart çeker. Taç kartlar ve satılamaz setler ÇAĞIRAN
 *  tarafından zaten dışlanmış olmalı (bkz. hzBuyPack, FAZ3). Mutasyon
 *  YAPMAZ — sonucu hzApplyDraw uygular.
 *  Pity PAKET başına sayılır (kart başına DEĞİL) — HZ_PITY_NADIDE/EFSANE
 *  "N pakette garanti" anlamına gelir; sayaç yalnız paketin İLK kartında
 *  zorlanır, diğer iki kart her zaman normal ağırlıklı RNG ile çekilir
 *  (standart gacha-pity deseni: eşiğe ulaşan paket başına 1 garanti yeter). */
export function hzDrawPack(setId, state, cards, rand = Math.random) {
  const pool = (cards || []).filter(c => c.set === setId && !c.tac);
  if (!pool.length) return { results: [], pity: { sincePityNadide: 0, sincePityEfsane: 0 } };

  const byRarity = { yaygin: [], nadir: [], nadide: [], efsane: [] };
  for (const c of pool) (byRarity[c.rarity] || byRarity.yaygin).push(c);

  const localColl = { ...(state.collection || {}) };
  let sinceNadide = ((state.packs && state.packs.sincePityNadide) || 0) + 1;
  let sinceEfsane = ((state.packs && state.packs.sincePityEfsane) || 0) + 1;
  const results = [];

  for (let i = 0; i < HZ_PACK_SIZE; i++) {
    let tier;
    if (i === 0 && sinceEfsane >= HZ_PITY_EFSANE && byRarity.efsane.length) {
      tier = 'efsane';
    } else if (i === 0 && sinceNadide >= HZ_PITY_NADIDE && (byRarity.nadide.length || byRarity.efsane.length)) {
      tier = byRarity.nadide.length ? 'nadide' : 'efsane';
    } else {
      tier = hzWeightedRarityPick(rand);
      if (!byRarity[tier].length) tier = FALLBACK_ORDER.find(t => byRarity[t].length) || tier;
    }
    const bucket = byRarity[tier].length ? byRarity[tier] : pool;
    const card = bucket[Math.floor(rand() * bucket.length)];

    if (card.rarity === 'nadide' || card.rarity === 'efsane') sinceNadide = 0;
    if (card.rarity === 'efsane') sinceEfsane = 0;

    const already = localColl[card.id];
    const isNew = !already;
    const holoUpgrade = !isNew && !already.holo;
    const refund = (!isNew && already.holo) ? (HZ_DUPE_REFUND[card.rarity] || 0) : 0;
    results.push({ card, isNew, holoUpgrade, refund });

    if (isNew) localColl[card.id] = { holo: false };
    else if (holoUpgrade) localColl[card.id] = { ...already, holo: true };
  }
  return { results, pity: { sincePityNadide: sinceNadide, sincePityEfsane: sinceEfsane } };
}

/** Çekiliş sonucunu duruma işler — koleksiyon + dupe/holo/iade + pity sayaçları.
 *  Toplam iade (Elmas) döner; caller (hzBuyPack) awardElmas ile öder. */
export function hzApplyDraw(state, draw) {
  let elmasRefund = 0;
  for (const r of draw.results) {
    const id = r.card.id;
    const cur = state.collection[id];
    if (r.isNew) {
      state.collection[id] = { earnedAt: new Date().toISOString(), holo: false, dupes: 0 };
    } else if (r.holoUpgrade) {
      state.collection[id] = { ...cur, holo: true, dupes: (cur.dupes || 0) + 1 };
    } else {
      state.collection[id] = { ...cur, dupes: (cur.dupes || 0) + 1 };
      elmasRefund += r.refund;
    }
    state.history.push({ cardId: id, at: new Date().toISOString(), rarity: r.card.rarity });
  }
  if (state.history.length > 200) state.history = state.history.slice(-200);
  state.packs.opened = (state.packs.opened || 0) + 1;
  state.packs.sincePityNadide = draw.pity.sincePityNadide;
  state.packs.sincePityEfsane = draw.pity.sincePityEfsane;
  return elmasRefund;
}

/* ════════════════════════════════════════════════════════════════════════
   4) SET TAMAMLAMA — idempotent (bir kez completedAt yazılır)
═══════════════════════════════════════════════════════════════════════════ */
export function hzDetectSetCompletion(state, setId) {
  if (state.sets[setId] && state.sets[setId].completedAt) return false;
  const members = getHazineKartlarBySet(setId, { excludeTac: true });
  if (!members.length) return false;
  const allOwned = members.every(c => state.collection[c.id]);
  if (!allOwned) return false;
  if (!state.sets[setId]) state.sets[setId] = {};
  state.sets[setId].completedAt = new Date().toISOString();
  return true;
}

/* ════════════════════════════════════════════════════════════════════════
   5) IŞIK KANONU — deterministik imleç (K6: RNG'ye asla girmez)
═══════════════════════════════════════════════════════════════════════════ */
export function hzAyetCursorNext(state) {
  const ayetler = getHazineKartlarBySet('isik_kanonu', { excludeTac: true });
  if (!ayetler.length) return null;
  const idx = state.ayetCursor || 0;
  if (idx >= ayetler.length) return null; // kanon tükendi
  const card = ayetler[idx];
  state.ayetCursor = idx + 1;
  if (!state.collection[card.id]) state.collection[card.id] = { earnedAt: new Date().toISOString(), holo: false, dupes: 0 };
  return card;
}

/* ════════════════════════════════════════════════════════════════════════
   6) HAFTALIK ARMAĞAN ANAHTARI — pazartesi tabanlı yerel hafta (K8)
═══════════════════════════════════════════════════════════════════════════ */
export function hzWeekKey(date) {
  const d = date !== undefined ? new Date(date) : new Date();
  const day = d.getDay(); // 0=Pazar..6=Cumartesi
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  return localISODate(monday);
}

/* ════════════════════════════════════════════════════════════════════════
   7) HAZİNE ODASI — görünüm (FAZ2: yalnız görüntüleme; satın alma FAZ3'te
   `window.hzBuyPack` bağlanınca çalışır hâle gelir — buton şimdiden render
   edilir, sözleşme önden kurulur).
═══════════════════════════════════════════════════════════════════════════ */
function hazineContentReady() { return !!_kartlar; }
function _hzRarLabel(r) { return r?.id ? t(`deck.rarity.${r.id}`, r.label) : ''; }

function _hzSetProgress(setId, state) {
  const total = getHazineKartlarBySet(setId, { excludeTac: true }).length;
  const owned = hzOwnedCount(state, setId);
  return { owned, total, pct: total ? Math.round((owned / total) * 100) : 0 };
}

function _hzMiniCard(card, state) {
  const palette = card.set === 'isik_kanonu' ? 'lapis' : 'gold';
  const owned = state.collection[card.id];
  if (card.tac) {
    return owned
      ? `<div class="hz-tac-slot hz-tac-slot--owned" data-hz-open="${escapeHTML(card.id)}">${ikvCardFace(card, { palette, mini: true, sub: card.sub, badge: t('hz.tac.title', 'TAÇ') })}</div>`
      : `<div class="hz-tac-slot hz-tac-slot--locked" title="${escapeHTML(t('hz.tac.locked', 'Seti tamamlayınca açılır'))}">${ikvCardBack({ mini: true })}<span class="hz-tac-badge">${escapeHTML(t('hz.tac.title', 'TAÇ'))}</span></div>`;
  }
  if (!owned) {
    return `<div class="hz-mini-cell hz-mini-cell--locked">${ikvCardFace(card, { palette, mini: true, fog: true, name: '? ? ?' })}</div>`;
  }
  const R = RARITIES[card.rarity] || RARITIES.yaygin;
  return `<button class="hz-mini-cell hz-mini-cell--owned${owned.holo ? ' is-holo' : ''}" data-hz-open="${escapeHTML(card.id)}">${ikvCardFace(card, { palette, mini: true, sub: card.sub, rarLabel: _hzRarLabel(R), rarColor: R.color })}</button>`;
}

function _hzRenderSetCard(set, i, state) {
  const { owned, total, pct } = _hzSetProgress(set.id, state);
  const cards = getHazineKartlarBySet(set.id, { excludeTac: true });
  const tac = getHazineTacKart(set.id);
  const complete = !!(state.sets[set.id] && state.sets[set.id].completedAt);
  const grid = cards.map(c => _hzMiniCard(c, state)).join('') + (tac ? _hzMiniCard(tac, state) : '');
  const buyBtn = set.satilamaz
    ? `<div class="hz-set-locked-note">${escapeHTML(t('hz.set.locked_note', 'Bu set satın alınamaz — armağan paketinde ya da bir seti tamamladığında gelir.'))}</div>`
    : `<button class="hz-buy-btn ikv-seal-btn" data-hz-buy="${escapeHTML(set.id)}">${escapeHTML(t('hz.pack.cta', 'PAKET AÇ · {cost} ◆').replace('{cost}', HZ_PACK_COST))}</button>`;
  return `<div class="ikv-panel hz-set-card${set.palette === 'lapis' ? ' hz-set-card--lapis' : ''}" style="--i:${Math.min(i, 12)}">
    <div class="hz-set-head">
      ${ikvRing(pct, { size: 56, yol: true, center: `<b>${owned}</b><span>/${total}</span>` })}
      <div class="hz-set-headtxt">
        <div class="hz-set-name">${escapeHTML(set.glyph)} ${escapeHTML(set.ad)}</div>
        ${complete ? `<div class="hz-set-badge">${escapeHTML(t('hz.set.complete_badge', 'TAMAMLANDI'))}</div>` : ''}
      </div>
    </div>
    <div class="hz-set-grid">${grid}</div>
    ${buyBtn}
  </div>`;
}

function _hzRenderView(body) {
  const setler = getHazineSetler();
  const state = hzState();
  body.innerHTML = `
    <div class="hz-wrap">
      <div class="ikv-panel hz-hero">
        <div class="hz-hero-title serif">${escapeHTML(t('hz.hero_title', 'Hazine Odası'))}</div>
        <div class="hz-hero-sub">${escapeHTML(t('hz.hero_sub', 'Kimlik kazanılır, bilgelik toplanır.'))}</div>
      </div>
      <div class="hz-sets ikv-cascade">${setler.map((s, i) => _hzRenderSetCard(s, i, state)).join('')}</div>
    </div>`;
  body.querySelectorAll('[data-hz-open]').forEach(el => el.addEventListener('click', () => hzOpenCardDetail(el.dataset.hzOpen)));
  body.querySelectorAll('[data-hz-buy]').forEach(el => el.addEventListener('click', () => { try { window.hzBuyPack?.(el.dataset.hzBuy); } catch (_) {} }));
  try { window.ikvHoloScan && window.ikvHoloScan(body); } catch (_) {}
}

function _hzRenderSkeleton(body) {
  body.innerHTML = `<div class="hz-wrap"><div class="ikv-panel hz-hero"><div class="hz-hero-title serif">${escapeHTML(t('hz.hero_title', 'Hazine Odası'))}</div><div class="hz-hero-sub">${escapeHTML(t('hz.loading', 'Hazine getiriliyor…'))}</div></div></div>`;
}

export function loadHazineView() {
  const body = document.getElementById('hazine-body');
  if (!body) return;
  if (!hazineContentReady()) {
    _hzRenderSkeleton(body);
    hazineReady().then(() => {
      if (document.getElementById('hazine-view')?.classList.contains('active')) {
        _hzRenderView(body);
        setTimeout(() => { try { hzMaybeWeeklyGift(); } catch (_) {} }, 500);
      }
    });
    return;
  }
  _hzRenderView(body);
  // Odaya her girişte bir kez kontrol edilir — o hafta zaten alındıysa no-op
  // (hzWeekKey idempotency); kullanıcı odayı görsün diye kısa bir gecikme.
  setTimeout(() => { try { hzMaybeWeeklyGift(); } catch (_) {} }, 500);
}

/** Sahipli bir hazine kartının detayını (tam yüz + alıntı + kaynak) açar.
 *  Kilitli kartlar henüz tıklanabilir değil — satın alma FAZ3'te gelir. */
export function hzOpenCardDetail(cardId) {
  const card = getHazineKartById(cardId);
  if (!card) return;
  const state = hzState();
  if (!state.collection[card.id]) return;
  const R = RARITIES[card.rarity] || RARITIES.yaygin;
  const palette = card.set === 'isik_kanonu' ? 'lapis' : 'gold';
  document.getElementById('hz-detail-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.id = 'hz-detail-overlay';
  overlay.style.zIndex = 'var(--z-ceremony)';
  overlay.innerHTML = `
    <div class="modal hz-detail-modal">
      <div class="hz-detail-card">${ikvCardFace(card, { palette, sub: card.sub, rarLabel: _hzRarLabel(R), rarColor: R.color })}</div>
      <div class="hz-detail-quote">${escapeHTML('"' + card.quote + '"')}</div>
      <div class="hz-detail-source">${escapeHTML(card.source)}</div>
      <button class="hz-detail-close ikv-ghost-btn" onclick="this.closest('.overlay').remove()">${escapeHTML(t('hz.card.close', 'KAPAT'))}</button>
    </div>`;
  document.body.appendChild(overlay);
  try { window.ikvHoloScan && window.ikvHoloScan(overlay); } catch (_) {}
}

/* ════════════════════════════════════════════════════════════════════════
   8) SATIN ALMA — Elmas harca → çekiliş → koleksiyona işle → tören aç
═══════════════════════════════════════════════════════════════════════════ */
function _hzRand() {
  try { return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296; } catch (_) { return Math.random(); }
}

let _hzPackOpen = false;

/** Bir set için paket satın alır. Çifte-harcama guard'ı: tören açıkken yeni
 *  satın alma başlamaz (`_hzPackOpen`); `spendElmas` yetersiz bakiyede KISMİ
 *  harcayabilir — bu durumda harcanan tam iade edilir, çekiliş hiç yapılmaz. */
export function hzBuyPack(setId) {
  if (_hzPackOpen) return;
  if (!hazineContentReady()) return;
  const set = getHazineSetler().find(s => s.id === setId);
  if (!set || set.satilamaz) return;
  const cards = getHazineKartlarBySet(setId);
  if (!cards.length) return;

  const spent = spendElmas(HZ_PACK_COST, 'hazine-paket');
  if (spent < HZ_PACK_COST) {
    if (spent > 0) awardElmas(spent, 'hazine-iade');
    try { showToast(t('hz.pack.insufficient', 'Yeterli Elmasın yok.')); } catch (_) {}
    return;
  }

  const state = hzState();
  const draw = hzDrawPack(setId, state, cards, _hzRand);
  const refund = hzApplyDraw(state, draw);
  if (refund > 0) awardElmas(refund, 'hazine-iade');
  const setCompleted = hzDetectSetCompletion(state, setId);
  hzSaveState(state);

  hzOpenPack(set, draw.results, { setCompleted });

  /* Koleksiyon Nabzı (00f · İç Çalışma 04 rev.2 · Y1): ekonominin İKİ yönü
     aynı kanalda — maliyet negatif, iade/bonus pozitif. Paket başına tek
     satır (kart başına değil): tampon tavanı WT_BUF_CAP'i beş kartlık bir
     açılış tek başına yiyemesin. Nadirlik alanına paketin EN YÜKSEĞİ yazılır;
     pity eşiği ancak bu dağılım okunarak ayarlanabilir. */
  try {
    const sira = ['yaygin', 'nadir', 'nadide', 'efsane'];
    const enYuksek = draw.results.reduce((en, r) =>
      sira.indexOf(r.card.rarity) > sira.indexOf(en) ? r.card.rarity : en, 'yaygin');
    const yeniSayi = draw.results.filter(r => r.isNew).length;
    window.wtLogKart?.('paket', {
      kartId: setId, kategori: 'hazine', nadirlik: enYuksek,
      n: draw.results.length, elmas: -HZ_PACK_COST,
    });
    if (refund > 0) {
      window.wtLogKart?.('dupe-iade', {
        kartId: setId, kategori: 'hazine',
        n: draw.results.length - yeniSayi, elmas: refund,
      });
    }
  } catch (_) {}
}

/* ════════════════════════════════════════════════════════════════════════
   9) ÇOK KARTLI TÖREN — 10q kkOpenPack'in 80'ler folyo kabuğunu (kk-pack-*
   sınıfları) REUSE eder (K2); rip sonrası kendi katmanı devralır: `.kk-fan`
   3 kart kapalı sırtla açılır, dokununca ya da 900ms arayla oto-kaskad
   flip olur. `.kk-fan*` stilleri 10q'nun kkEnsureStyles'ında yaşamaya devam
   eder, hazine.css'te değil — 10q'nun kendi kkOpenFan'ı Oluş Mührü sökümünde
   (2026-07-27, K0) gitti ama stiller KORUNDU: bu modül artık TEK tüketici.
   kkOpenPack'e HİÇ dokunulmaz; kimlik devri (imOnCardEarned)
   tetiklenmez — hazine kazanımı yalnız bilgelik taşır, kimlik taşımaz.

   BEKLENTİ IŞIĞI (2026-07-29): kabuk artık nadirlik SÖYLEMEZ. Eskiden
   `data-rarity` paketin en yüksek nadirliğini taşıyordu ve kabuğun gradyanı
   daha yırtılmadan "içeride efsane var" diye bağırıyordu — merak açılıştan
   önce tükeniyordu. Sinyal kabuktan KARTA indi: her `.kk-fan-card` kendi
   nadirliğini ve rengini (`--rar`) taşır, sırtın çevresi çevrilmeden önce
   o renkle ışır, flip anında söner. Beklenti kartın kendisinde birikir.
═══════════════════════════════════════════════════════════════════════════ */
function _hzPortal(id) {
  let el = document.getElementById(id);
  if (!el) { el = document.createElement('div'); el.id = id; document.body.appendChild(el); }
  el.style.cssText = 'position:fixed;inset:0;z-index:var(--z-ceremony);';
  return el;
}

function _hzResultBadge(r) {
  if (r.isNew) return t('hz.result.new', 'YENİ');
  if (r.holoUpgrade) return t('hz.result.holo', 'HOLO');
  return t('hz.result.refund', '+{n} ◆').replace('{n}', r.refund);
}

/** Çok kartlı hazine paketi töreni. `results` — hzDrawPack çıktısı
 *  (hzBuyPack tarafından zaten uygulanmış/kaydedilmiş olmalı). */
export function hzOpenPack(set, results, opts) {
  opts = opts || {};
  kkEnsureStyles();
  _hzPackOpen = true;
  const portal = _hzPortal('hz-pack-portal');

  portal.innerHTML = `
    <div class="kk-pack-veil"></div>
    <div class="kk-scanlines"></div>
    <div class="kk-pack-stage" id="hz-pack-stage">
      <div class="kk-pack-kicker">${escapeHTML(t('hz.pack.kicker', 'HAZİNE PAKETİ'))}</div>
      <div class="kk-pack" id="hz-pack">
        <div class="kk-pack-foil"></div>
        <div class="kk-pack-shine"></div>
        <div class="kk-pack-top">WANDERER</div>
        <div class="kk-pack-mid">
          <div class="kk-pack-logo">◆</div>
          <div class="kk-pack-sub">${escapeHTML(t('hz.pack.label', 'HAZİNE'))}</div>
          <div class="kk-pack-series">${escapeHTML(t('hz.pack.label', 'HAZİNE'))} · ${escapeHTML(set.ad)}</div>
        </div>
        <div class="kk-pack-barcode"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="kk-pack-rip" id="hz-pack-rip"></div>
      </div>
      <div class="kk-fan" id="hz-fan" style="display:none;">
        ${results.map((r, i) => {
          const R = RARITIES[r.card.rarity] || RARITIES.yaygin;
          const palette = r.card.set === 'isik_kanonu' ? 'lapis' : 'gold';
          return `<div class="kk-fan-card" data-i="${i}" data-rarity="${r.card.rarity}" style="--i:${i};--rar:${R.color};">
            <div class="kk-fan-inner">
              <div class="kk-fan-back">${ikvCardBack()}</div>
              <div class="kk-fan-front">
                ${ikvCardFace(r.card, { palette, sub: r.card.sub, rarLabel: _hzRarLabel(R), rarColor: R.color })}
                <div class="kk-fan-badge kk-fan-badge--${r.isNew ? 'new' : (r.holoUpgrade ? 'holo' : 'refund')}">${escapeHTML(_hzResultBadge(r))}</div>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="kk-pack-hint" id="hz-pack-hint">${escapeHTML(t('kk.pack.tap_hint', 'Açmak için dokun'))}</div>
      <div class="kk-pack-actions" id="hz-pack-actions" style="display:none;">
        <button class="kk-btn-primary" id="hz-pack-collect">${escapeHTML(t('hz.pack.collect', 'TOPLA'))}</button>
      </div>
    </div>`;

  const stage = portal.querySelector('#hz-pack-stage');
  const pack = portal.querySelector('#hz-pack');
  const fan = portal.querySelector('#hz-fan');
  const hint = portal.querySelector('#hz-pack-hint');
  const actions = portal.querySelector('#hz-pack-actions');
  let opened = false;

  // Törenin BÜTÜN zamanlayıcıları burada toplanır: kapanış tek tek id
  // kovalamak zorunda kalmasın. Kapanmış bir tören arkada tik atan bir
  // zamanlayıcı bırakırsa, sökülmüş DOM'a yazmaya ve flip kaskadının
  // fxCue'sunu çalmaya devam eder — portal gitmişken gelen holo sesi.
  const timers = [];
  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

  const flipCard = (i) => {
    const el = fan.querySelector(`.kk-fan-card[data-i="${i}"]`);
    if (!el || el.classList.contains('is-flipped')) return;
    el.classList.add('is-flipped');
    const r = results[i];
    try { window.fxCue?.((r.card.rarity === 'nadide' || r.card.rarity === 'efsane') ? 'holoGrand' : 'holo'); } catch (_) {}
  };

  const doOpen = () => {
    if (opened) return; opened = true;
    try { window.fxCue?.('pack'); } catch (_) {}
    pack.classList.add('kk-pack--rip');
    hint.style.display = 'none';
    later(() => {
      pack.style.display = 'none';
      fan.style.display = 'flex';
      stage.classList.add('kk-burst');
      results.forEach((_, i) => later(() => flipCard(i), 900 * (i + 1)));
    }, 620);
    later(() => { actions.style.display = ''; actions.classList.add('kk-fade-in'); }, 620 + 900 * (results.length + 1));
  };

  pack.addEventListener('click', doOpen);
  later(doOpen, 2600);
  fan.addEventListener('click', (e) => {
    const cardEl = e.target.closest('.kk-fan-card');
    if (cardEl) flipCard(Number(cardEl.dataset.i));
  });

  const close = () => {
    timers.forEach(clearTimeout); timers.length = 0;
    portal.style.cssText = ''; portal.innerHTML = '';
    _hzPackOpen = false;
    if (opts.setCompleted) { try { hzSetCeremony(set.id); } catch (_) {} }
    if (document.getElementById('hazine-view')?.classList.contains('active')) loadHazineView();
    try { window.wsSyncStudio?.(); } catch (_) {}
  };
  portal.querySelector('#hz-pack-collect').addEventListener('click', close);
}

/* ════════════════════════════════════════════════════════════════════════
   10) SET TÖRENİ — halka uyanışı → Taç (paketten asla çıkmaz, daimi holo) →
   +40 Elmas → kota armağanı (RPC, ELLE deploy'a bağlı) → (varsa) Işık
   Kanonu ilerlemesi (K6: her set tamamlama emeğin mührüdür).
═══════════════════════════════════════════════════════════════════════════ */
/** `opts.skipAyet` — çağıran (hzMaybeWeeklyGift) AYNI olay içinde zaten
 *  kendi ayet eşliğini vermişse, burada İKİNCİ bir ayet kazandırılmaz
 *  (K6.1 lütuf ve K6.2 emeğin mührü AYRI tetikler — aynı ana denk
 *  gelince toplanmaz, tek ayet verilir). */
export function hzSetCeremony(setId, opts) {
  opts = opts || {};
  const set = getHazineSetler().find(s => s.id === setId);
  const tac = getHazineTacKart(setId);
  if (!set || !tac) return;
  const state = hzState();
  if (state.sets[setId] && state.sets[setId].tacAt) return; // idempotent

  if (!state.collection[tac.id]) {
    state.collection[tac.id] = { earnedAt: new Date().toISOString(), holo: true, dupes: 0 };
  }
  if (!state.sets[setId]) state.sets[setId] = {};
  state.sets[setId].tacAt = new Date().toISOString();
  // İlk set tamamlama TAÇ sırtını açar (10q kkSirtKazan idempotent).
  try { window.kkSirtKazan?.('tac'); } catch (_) {}
  const ayet = opts.skipAyet ? null : hzAyetCursorNext(state); // set tamamlama = ayet kazanım yolu (K6.2)
  // Işık Kanonu'nun KENDİ seti de tamamlanabilir — bu ayet onu tamamladıysa
  // kendi Tacı ayrı (küçük gecikmeli) bir törenle verilir; aksi hâlde
  // hz_tac_isik_kanonu asla kazanılamayan ölü içerik olarak kalırdı.
  const isikCompleted = ayet && setId !== 'isik_kanonu' && hzDetectSetCompletion(state, 'isik_kanonu');
  hzSaveState(state);

  awardElmas(HZ_SET_BONUS_ELMAS, 'hazine-set');

  /* Koleksiyon Nabzı (00f · Y1): set-tamam damgası BURADA basılır, hzBuyPack'te
     değil. Set hzBuyPack'te tespit edilir ama +40 Elmas tören KAPANINCA verilir
     (close → hzSetCeremony); tespit anında yazmak, ödenmemiş bir bonusu ödenmiş
     göstermek olurdu — üretici damga basmaz, teslim eden basar (§6.10). */
  try {
    window.wtLogKart?.('set-tamam', {
      kartId: setId, kategori: 'hazine',
      n: Object.keys(hzState().collection || {}).length, elmas: HZ_SET_BONUS_ELMAS,
    });
  } catch (_) {}
  hzGrantSetBonus(setId); // async — RPC yoksa sessiz düşer, pendingBonus'a girer

  _hzSetCeremonyPortal(set, tac, ayet);
  if (isikCompleted) setTimeout(() => { try { hzSetCeremony('isik_kanonu', { skipAyet: true }); } catch (_) {} }, 900);
}

function _hzSetCeremonyPortal(set, tac, ayet) {
  document.getElementById('hz-set-ceremony-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.id = 'hz-set-ceremony-overlay';
  overlay.style.zIndex = 'var(--z-ceremony)';
  overlay.innerHTML = `
    <div class="modal hz-set-modal">
      <div class="hz-set-ring">${ikvRing(100, { size: 84, yol: true, center: '<span class="hz-set-ring-glyph">✦</span>' })}</div>
      <div class="hz-set-modal-title serif">${escapeHTML(t('hz.set.ceremony_title', 'Set Tamamlandı'))}</div>
      <div class="hz-set-modal-sub">${escapeHTML(t('hz.set.ceremony_sub', '{set} setini tamamladın.').replace('{set}', set.ad))}</div>
      <div class="hz-set-tac">${ikvCardFace(tac, { palette: set.satilamaz ? 'lapis' : 'gold', sub: tac.sub, badge: t('hz.tac.title', 'TAÇ') })}</div>
      <div class="hz-set-quote">${escapeHTML('"' + tac.quote + '"')}</div>
      <div class="hz-set-rewards">
        <div class="hz-set-reward-line">◆ +${HZ_SET_BONUS_ELMAS} · ${escapeHTML(t('wg.elmas.hazine-set', 'set tamamlandı'))}</div>
        <div class="hz-set-reward-line">${escapeHTML(t('hz.set.bonus_line', 'Tamamladığın set seni taşıyor — dokuz mesajlık yol armağanı.'))}</div>
        ${ayet ? `<div class="hz-set-reward-line hz-set-reward-line--ayet">☀ ${escapeHTML(t('hz.isik.gift_line', 'Bu bir çekiliş değil, bir emanettir. Işık sırayla iner.'))}</div>` : ''}
      </div>
      <div class="hz-set-actions">
        <button class="hz-set-close ikv-seal-btn" id="hz-set-close-btn">${escapeHTML(t('weekly.ok', 'Tamam'))}</button>
        <button class="hz-set-share ikv-ghost-btn" id="hz-set-share-btn">${escapeHTML(t('hz.set.share', 'PAYLAŞ'))}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#hz-set-close-btn').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#hz-set-share-btn').addEventListener('click', () => {
    try {
      window.shrShareStory?.({
        kicker: `${t('hz.pack.label', 'HAZİNE')} · ${set.ad}`,
        glyph: set.glyph || '✦',
        title: tac.name, sub: t('hz.tac.title', 'TAÇ'),
        line: tac.quote || '',
        accent: set.satilamaz ? 'var(--lapis-bright)' : 'var(--gold)',
        tier: 4,
        tur: 'kart',
      });
    } catch (_) {}
  });
  try { window.ikvHoloScan && window.ikvHoloScan(overlay); } catch (_) {}
  try { window.fxCue?.('holoGrand'); } catch (_) {}
}

/* ════════════════════════════════════════════════════════════════════════
   11) KOTA ARMAĞANI RPC — 13m ktGrantUltraBonus deseninin ikizi (idempotent
   grant + sessiz düşüş + retry kuyruğu). Mig 038 uygulanmamışsa RPC 404/42883
   döner → yakalanır, setId `pendingBonus`'a girer, sonraki hzInit'te denenir.
═══════════════════════════════════════════════════════════════════════════ */
export async function hzGrantSetBonus(setId) {
  try {
    const uid = S.currentUser && S.currentUser.id;
    if (!uid || !sb) throw new Error('no-auth');
    const { error } = await sb.rpc('quota_set_bonus_grant', { p_set: setId });
    if (error) throw error;
    // Durum `await`'ten SONRA taze okunur — önce okuyup sonra beklemek,
    // await sırasında başka bir yazım (ör. hzSetCeremony/hzBuyPack) olursa
    // burada eski durumun üzerine yazıp onu kaybettirirdi (lost-update).
    const state = hzState();
    const idx = state.pendingBonus.indexOf(setId);
    if (idx !== -1) { state.pendingBonus.splice(idx, 1); hzSaveState(state); }
    return true;
  } catch (_) {
    const state = hzState();
    if (!state.pendingBonus.includes(setId)) {
      state.pendingBonus.push(setId);
      hzSaveState(state);
    }
    return false;
  }
}

export async function hzRetryPendingBonuses() {
  const state = hzState();
  for (const setId of [...state.pendingBonus]) { await hzGrantSetBonus(setId); }
}

/* ════════════════════════════════════════════════════════════════════════
   12) HAFTALIK ARMAĞAN — Pro/Max'e haftada 1 paket (K8: client-side yeterli,
   armağan yalnız kozmetik içerik verir). Işık Kanonu HER ZAMAN eşlik eder
   (K6.1) — armağan lütuftur, çekiliş değil.
═══════════════════════════════════════════════════════════════════════════ */
export function hzMaybeWeeklyGift() {
  try {
    if (!(S.isPremium || S.isPremiumPlus)) return false;
    if (!hazineContentReady()) return false;
    const state = hzState();
    const wk = hzWeekKey();
    if (state.gift.lastWeekKey === wk) return false;

    const setler = getHazineSetler().filter(s => !s.satilamaz);
    if (!setler.length) return false;
    const set = setler[Math.floor(_hzRand() * setler.length)];
    const cards = getHazineKartlarBySet(set.id);
    if (!cards.length) return false;

    const draw = hzDrawPack(set.id, state, cards, _hzRand);
    hzApplyDraw(state, draw);
    const setCompleted = hzDetectSetCompletion(state, set.id);
    const ayet = hzAyetCursorNext(state); // armağan paketi her zaman ayet eşliğiyle gelir (K6.1)
    // Bu ayet Işık Kanonu'nun kendisini de tamamlamış olabilir — kendi Tacı ayrı verilir.
    const isikCompleted = ayet && hzDetectSetCompletion(state, 'isik_kanonu');
    state.gift.lastWeekKey = wk;
    hzSaveState(state);

    _hzWeeklyGiftPortal(set, draw.results, ayet);
    // skipAyet:true — ayet zaten yukarıda armağanın kendi eşliğiyle verildi;
    // set töreni (ve varsa Işık Kanonu töreni) İKİNCİ bir ayet kazandırmaz.
    if (setCompleted) setTimeout(() => { try { hzSetCeremony(set.id, { skipAyet: true }); } catch (_) {} }, 400);
    if (isikCompleted) setTimeout(() => { try { hzSetCeremony('isik_kanonu', { skipAyet: true }); } catch (_) {} }, setCompleted ? 1300 : 400);
    return true;
  } catch (_) { return false; }
}

function _hzWeeklyGiftPortal(set, results, ayet) {
  document.getElementById('hz-gift-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.id = 'hz-gift-overlay';
  overlay.style.zIndex = 'var(--z-ceremony)';
  const cardsHtml = results.map(r => {
    const R = RARITIES[r.card.rarity] || RARITIES.yaygin;
    return `<div class="hz-gift-card">${ikvCardFace(r.card, { palette: 'gold', sub: r.card.sub, rarLabel: _hzRarLabel(R), rarColor: R.color })}</div>`;
  }).join('');
  const ayetHtml = ayet ? `
    <div class="hz-gift-ayet">
      <div class="hz-gift-ayet-card">${ikvCardFace(ayet, { palette: 'lapis', sub: ayet.sub })}</div>
      <div class="hz-gift-ayet-line">${escapeHTML(t('hz.isik.gift_line', 'Bu bir çekiliş değil, bir emanettir. Işık sırayla iner.'))}</div>
    </div>` : '';
  overlay.innerHTML = `
    <div class="modal hz-gift-modal">
      <div class="hz-gift-title serif">${escapeHTML(t('hz.gift.title', 'Haftalık Armağan'))}</div>
      <div class="hz-gift-sub">${escapeHTML(t('hz.gift.sub', '{set} setinden bir armağan.').replace('{set}', set.ad))}</div>
      <div class="hz-gift-cards">${cardsHtml}</div>
      ${ayetHtml}
      <button class="hz-gift-close ikv-seal-btn" onclick="this.closest('.overlay').remove()">${escapeHTML(t('weekly.ok', 'Tamam'))}</button>
    </div>`;
  document.body.appendChild(overlay);
  try { window.ikvHoloScan && window.ikvHoloScan(overlay); } catch (_) {}
  try { window.fxCue?.('holo'); } catch (_) {}
}

/* ── INIT — 03-auth-shell post-auth, kkReady sonrası (deste+koleksiyon
   hazır olsun diye zincire bağlanır; hazine kendi sidecar'ını boot'ta
   zaten istemişti — burada yalnız o promise'i post-auth akışa bağlar). */
export function hzInit() {
  return hazineReady().then(() => {
    try { hzRetryPendingBonuses(); } catch (_) {}
    return true;
  });
}
