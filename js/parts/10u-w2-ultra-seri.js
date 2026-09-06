/* ═══════════════════════════════════════════════════════════════════
   10u — ULTRA SERİ · Üç Mühürlü Seri Sistemi
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Tek bir zincir değil, ÜÇ ayrı zincir bir kimlik inşa eder:
       • SERİ MÜHRÜ  — günlük gelmek (merkezî aktivite defteri / 10t).
       • HAYAL MÜHRÜ — "GÖRDÜN": günde bir kez Pencereden Bakış (10E gorOpen)
                       — olmak istediğin kişinin gözünden bak. OKU (Geçiş
                       Protokolü, 10D) ve Hayal Seansı (10i) da bu seriyi
                       besleyen derin kapılardır; hiçbiri şart değil.
       • SÖZ MÜHRÜ   — o gün en az bir söz veren kişi için ayrı seri.
     Üçü de aynı gün canlıysa ULTRA SERİ uyanır; kart "harika görünüme"
     kavuşur. Çekirdek tez: "Mesele Sensin."

   YÜZEYLER:
     • BUGÜN: Yol hero'su (10f yolRenderHero — altın↔lapis kutuplar +
       bugünün halkası). usRenderBugunCard ona delege eder.
     • Üç tam-ekran sürükleyici detay (yol dili + "yolun neresindesin").
     • Ultra anı: "Bugün O Kişiydin" kart bindirmesi (10u _renderUltraAwaken).

   Kalıcılık: SafeStorage per-uid. Konvansiyon: hardcoded TR string.
   TDZ güvenliği: modüller-arası erişim window.* üzerinden.
   Stiller: detay sahnesi css/parts/uc-muhur.css · uyanış töreni
   css/parts/ultra-seri.css. Kart YÜZLERİ bu modülün işi değildir —
   tek motor 12c (ikvCardFace / ikvCardBack / ikvMilestoneScene).
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage, localDayKey, getActivityDays, showToast, localISODate, parseDayKey, escapeHTML } from './00a-infrastructure.js';
import { ikvMilestoneScene, ikvCardFace, ikvCardBack } from './12c-kart-gorsel.js';
import { t } from './15-i18n.js';

const HAYAL_KEY = 'etw_hayal_muhru_v1';
const SOZ_KEY   = 'etw_soz_muhru_v1';
const META_KEY  = 'etw_ultra_meta_v1';

/* Dile duyarlı locale (toLocaleX için) */
const _locale = () => (S._currentLang === 'tr' ? 'tr-TR' : 'en-US');

/* Tek kaynak: escapeHTML (00a). Eskiden bu modülün kendi ikizi vardı;
   ikizler birbirinden de farklıydı (bir kısmı tek tırnağı kaçırmıyordu). */
const esc = escapeHTML;

/* ── Gün anahtarları ──────────────────────────────────────────────────
   İkisi de 00a'nın `localISODate`'idir; yerel adlar çağrı yerlerinin
   OKUNURLUĞU için korunur (usDayKey = bu modülün defter anahtarı,
   todayISO = 10g/10i/10j/10k'nın sakladığı format). Formül 2026-08-17'de
   tek kaynağa bağlandı — beş modül aynı satırı kopyalamıştı.
   Gün anahtarı ikiliğinin haritası: `10f` yolDayRings başlığı. */
function usDayKey() { return localISODate(); }
const todayISO = () => localISODate();

/* ════════════════════════════════════════════════════════════════════
   KİLOMETRE TAŞI KARTLARI — seri başına (kitap-köklü TR metin)
════════════════════════════════════════════════════════════════════ */
/* Yapı (gün/tier) sabit; ad/alt/söz i18n'den render anında çözülür. Kartın
   görseli glife değil kilometre taşı sahnesine bağlıdır (12c
   ikvMilestoneScene) — glyph alanları 2026-08-17'de düştü.
   Seri kartları 10t Seri Mührü ile aynı → sm.card.* anahtarları paylaşılır. */
const SERI_CARDS  = [{ d: 7, tier: 1 }, { d: 15, tier: 1 }, { d: 30, tier: 2 }, { d: 60, tier: 2 }, { d: 120, tier: 3 }, { d: 180, tier: 3 }, { d: 240, tier: 4 }, { d: 365, tier: 4 }];
const HAYAL_CARDS = [{ d: 7, tier: 1 }, { d: 15, tier: 1 }, { d: 30, tier: 2 }, { d: 60, tier: 2 }, { d: 120, tier: 3 }, { d: 180, tier: 3 }, { d: 240, tier: 4 }, { d: 365, tier: 4 }];
const SOZ_CARDS   = [{ d: 7, tier: 1 }, { d: 15, tier: 1 }, { d: 30, tier: 2 }, { d: 60, tier: 2 }, { d: 120, tier: 3 }, { d: 180, tier: 3 }, { d: 240, tier: 4 }, { d: 365, tier: 4 }];

/* Kart metnini i18n önekinden çöz (render anında) */
function _resolveCards(arr, prefix) {
  return arr.map(c => ({ ...c, name: t(`${prefix}.${c.d}.name`), sub: t(`${prefix}.${c.d}.sub`), line: t(`${prefix}.${c.d}.line`) }));
}
/* Hedef ön ayarları — seri-aromalı etiket (sm.card adları) + N gün/days */
function _seriGoals() {
  return [7, 30, 180, 365].map(d => ({ d, label: t(`sm.card.${d}.name`), sub: t('us.ndays').replace('{n}', d) }));
}

/* ════════════════════════════════════════════════════════════════════
   SERİ KONFİGÜRASYONU — tek motor, üç seri (metin render anında çözülür)
════════════════════════════════════════════════════════════════════ */
const SERIES_META = {
  seri:  { id: 'seri',  scene: 'seri',  cards: SERI_CARDS,  cardPrefix: 'sm.card' },
  hayal: { id: 'hayal', scene: 'hayal', cards: HAYAL_CARDS, cardPrefix: 'us.hcard' },
  soz:   { id: 'soz',   scene: 'soz',   cards: SOZ_CARDS,   cardPrefix: 'us.zcard' },
};
function _series(id) {
  const m = SERIES_META[id];
  if (!m) return null;
  return {
    ...m,
    title: t(`us.series.${id}.title`),
    kicker: t(`us.series.${id}.kicker`),
    // sceneTitle (yer adı: "Sütunların Avlusu" vb.) 2026-08-17'de düştü —
    // sahnenin artık kendi yeri yok, Yol'un göğü altında duruyor.
    sceneLine: t(`us.series.${id}.scene_line`),
    cards: _resolveCards(m.cards, m.cardPrefix),
    goals: _seriGoals(),
  };
}
const ORDER = ['seri', 'hayal', 'soz'];

/* ════════════════════════════════════════════════════════════════════
   PERSİSTANS — Hayal & Söz defterleri + Ultra meta
════════════════════════════════════════════════════════════════════ */
function _defLedger() { return { days: [], goal: null, goalReachedAt: null, cards: {}, bestStreak: 0, visions: {} }; }
function _defMeta() { return { lastUltraDay: null, ultraDays: [] }; }
function _uid() { return (S.currentUser && S.currentUser.id) || 'anon'; }
function _lkey(base) { return `${base}_${_uid()}`; }

function usSaveAll() {
  try { SafeStorage.set(_lkey(HAYAL_KEY), S._hayalMuhru); } catch (_) {}
  try { SafeStorage.set(_lkey(SOZ_KEY), S._sozMuhru); } catch (_) {}
  try { SafeStorage.set(_lkey(META_KEY), S._ultraMeta); } catch (_) {}
}
function usLoad() {
  try {
    const h = SafeStorage.get(_lkey(HAYAL_KEY));
    if (h && typeof h === 'object') S._hayalMuhru = Object.assign(_defLedger(), h);
    const z = SafeStorage.get(_lkey(SOZ_KEY));
    if (z && typeof z === 'object') S._sozMuhru = Object.assign(_defLedger(), z);
    const m = SafeStorage.get(_lkey(META_KEY));
    if (m && typeof m === 'object') S._ultraMeta = Object.assign(_defMeta(), m);
  } catch (e) { console.warn('usLoad:', e && e.message); }
}
function _ledgerFor(id) {
  if (id === 'hayal') return S._hayalMuhru;
  if (id === 'soz') return S._sozMuhru;
  return null; // seri merkezî defterden okunur
}

/* ════════════════════════════════════════════════════════════════════
   SERİ HESABI — ardışık gün zinciri
   usStreakFromDays: girdi gün-anahtarı dizisi (usDayKey formatı: 1-indeksli
   ay, padding'li). calculateStreak ile birebir mantık.
════════════════════════════════════════════════════════════════════ */
function usStreakFromDays(daysArr) {
  const set = new Set(daysArr || []);
  if (!set.size) return 0;
  // Seri defteri usDayKey biçimindedir (1-tabanlı ay, padded) — 00a'nın tek
  // okuyucusu, biçim `taban0` varsayılanında (false) duruyor. Çözülemeyen
  // anahtar `null` döner ve zincirden DÜŞER; eskiden `|| 1` ile 1 Ocak'a
  // kayıyordu ve bozuk bir satır seriyi sessizce uzatabilirdi.
  const sorted = Array.from(set).map(k => parseDayKey(k)).filter(Boolean)
    .sort((a, b) => b - a);
  if (!sorted.length) return 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const last = sorted[0];
  const sinceLast = Math.round((today - last) / 86400000);
  if (sinceLast > 1) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = Math.round((sorted[i - 1] - sorted[i]) / 86400000);
    if (gap === 1) streak++; else break;
  }
  return streak;
}

/* Merkezî seri (Seri Mührü) — sohbet + ritüel defteri */
function _seriStreak() {
  try { if (window.recomputeStreakUI) return window.recomputeStreakUI() | 0; } catch (_) {}
  return 0;
}
function _seriDays() { try { return getActivityDays(); } catch (_) { return []; } }
function _seriActiveToday() {
  try { return _seriDays().includes(localDayKey()); } catch (_) { return false; }
}

/* ── Seri durumu (üç seri için tek yüzey) ── */
function usSeriesState(id) {
  const cfg = _series(id);
  let n, activeToday, goal, goalReachedAt, cards, bestStreak, totalSeals;
  if (id === 'seri') {
    n = _seriStreak();
    activeToday = _seriActiveToday();
    const st = S._seriMuhru || {};
    goal = st.goal || null; goalReachedAt = st.goalReachedAt || null;
    cards = st.cards || {}; bestStreak = (st.bestStreak | 0) || n;
    // Zincir kopar, emek kalır: 10t her mühürde `totalSeals`'i sayar. Yalnız
    // "seri" defteri tutar — hayal/söz ledger'ında karşılığı yok.
    totalSeals = st.totalSeals | 0;
  } else {
    const L = _ledgerFor(id) || _defLedger();
    n = usStreakFromDays(L.days);
    activeToday = (L.days || []).includes(usDayKey());
    goal = L.goal || null; goalReachedAt = L.goalReachedAt || null;
    cards = L.cards || {}; bestStreak = (L.bestStreak | 0) || n;
  }
  const nm = cfg.cards.find(c => c.d > n) || null;
  const target = goal || (nm ? nm.d : Math.max(7, n));
  const pct = Math.max(3, Math.min(100, Math.round((n / target) * 100)));
  const owned = cfg.cards.filter(c => cards && cards[String(c.d)]).length;
  return { id, cfg, n, activeToday, goal, goalReachedAt, cards, bestStreak, totalSeals: totalSeals | 0, nm, target, pct, owned };
}

function usActiveCount() { return ORDER.filter(id => usSeriesState(id).activeToday).length; }
function usIsUltraToday() { return usActiveCount() === 3; }

/* ════════════════════════════════════════════════════════════════════
   DETEKTÖRLER — "bugün yapıldı mı?" (her modülün kendi formatında okunur)
════════════════════════════════════════════════════════════════════ */
/* Bakış — Pencereden Bakış (10E gorOpen) günü mühürledi mi? Sessiz bakış
   da (cümlesiz) sayılır; anahtarın varlığı yeterli. */
export function _bakisDone() {
  try { return !!(S._hayalMuhru && S._hayalMuhru.visions && S._hayalMuhru.visions[usDayKey()]); } catch (_) { return false; }
}
export function _gecisDone() {
  // Geçiş okuması: yeni omurga (10D S._oik) birincil; eski Geçiş Alanı (10j) OR'lanır
  // (geçiş dönemi — hiçbir okuma kaybolmasın).
  try {
    const t = todayISO();
    const chk = l => !!l && (l.lastMorning === t || l.lastNight === t || l.lastDayKey === t);
    return chk(S._oik?.readingLog) || chk(S._gecisAlani?.readingLog);
  } catch (_) { return false; }
}
export function _hayalSeansDone() { try { return !!S._hayalAlemi?.lastSessionAt && localISODate(new Date(S._hayalAlemi.lastSessionAt)) === todayISO(); } catch (_) { return false; }}

/* Hayal günü — Bakış (kanonik eylem) YA DA iki derin kapıdan biri (Geçiş
   Protokolü okuması, Hayal Seansı) bugün tamamlandıysa mühürlenir. */
export function _hayalAllDone() {
  return _bakisDone() || _gecisDone() || _hayalSeansDone();
}

/* ════════════════════════════════════════════════════════════════════
   GÜN KAYDI — idempotent; yeni günse hafif kutlama + ultra kontrolü
════════════════════════════════════════════════════════════════════ */
function _recordDay(id, opts) {
  const L = _ledgerFor(id);
  if (!L) return false;
  const key = usDayKey();
  if (L.days.includes(key)) return false;
  L.days.push(key);
  if (L.days.length > 400) L.days = L.days.slice(-400);
  const n = usStreakFromDays(L.days);
  if (n > (L.bestStreak | 0)) L.bestStreak = n;
  // Kilometre taşı kartı kazanıldı mı? (yapısal — metin gerekmez)
  const card = SERIES_META[id].cards.find(c => c.d === n);
  if (card && !L.cards[String(n)]) L.cards[String(n)] = { at: key };
  if (L.goal && n >= L.goal && !L.goalReachedAt) L.goalReachedAt = key;
  usSaveAll();
  if (!opts || !opts.silent) {
    try { showToast(t('us.toast.sealed').replace('{title}', _series(id).title).replace('{n}', n)); } catch (_) {}
    _pulseSlice(id);
  }
  return true;
}

/* ════════════════════════════════════════════════════════════════════
   BAKIŞ DEFTERİ — "Gördüklerin Defteri" (10E gorOpen yazar/okur)
   Anahtar = usDayKey (hayal ledgeriyle aynı format); text null olabilir
   (sessiz bakış da mühürler — bkz. _bakisDone).
════════════════════════════════════════════════════════════════════ */
function _ensureHayalLedger() {
  if (!S._hayalMuhru) S._hayalMuhru = _defLedger();
  if (!S._hayalMuhru.visions) S._hayalMuhru.visions = {};
  return S._hayalMuhru;
}
export function usRecordVision(text) {
  const L = _ensureHayalLedger();
  const key = usDayKey();
  const clean = String(text || '').trim().slice(0, 240);
  L.visions[key] = { text: clean || null };
  usSaveAll();
  try { window.wkSync?.(); } catch (_) {} // Widget köprüsü (13k) — GÖRDÜN mührü ana ekranda
  return key;
}
export function usGetTodayVision() {
  return _ensureHayalLedger().visions[usDayKey()] || null;
}
export function usGetRecentVisions(n) {
  const v = _ensureHayalLedger().visions;
  return Object.keys(v).sort().reverse().slice(0, n || 28).map(k => ({ date: k, text: (v[k] && v[k].text) || null }));
}
export function usDeleteVision(date) {
  const v = _ensureHayalLedger().visions;
  if (date && v[date]) { delete v[date]; usSaveAll(); }
}

export function usCheckHayalDay(opts) {
  if (!S._hayalMuhru) usLoad();
  let added = false;
  if (_hayalAllDone()) added = _recordDay('hayal', opts);
  usRenderBugunCard();
  if (added && (!opts || !opts.silent)) _maybeUltra();
  return added;
}
export function usCheckSozDay(opts) {
  if (!S._sozMuhru) usLoad();
  let added = false;
  try {
    const r = S._gunlukRitus;
    const given = !!(r && r.date === usDayKey() && Array.isArray(r.pledges) && r.pledges.length);
    if (given) added = _recordDay('soz', opts);
  } catch (_) {}
  usRenderBugunCard();
  // Söz detayı açıksa tam tazele — Günün Mührü oraya taşındı; içeriden söz
  // verilince seri sayısı/hafta şeridi de güncellensin.
  try {
    const p = document.getElementById('us-portal');
    if (p && p.querySelector('.us-scene--soz') && !document.getElementById('gl-portal')) usOpenDetail('soz');
  } catch (_) {}
  if (added && (!opts || !opts.silent)) _maybeUltra();
  return added;
}
/* Seri Mührü mühürlendiğinde (10t) çağrılır — hero'yu tazeler, ultra bakar */
export function usOnSeriSealed() {
  usRenderBugunCard();
  _maybeUltra();
}

/* Üçü de bugün canlıysa, günde bir kez ULTRA uyanış anı — Üç Mühür Studio'ya
   has olduğundan yalnız Bugün ekranında uyanır (boot zamanlayıcısı chat-view'de
   yakalarsa sessizce erteler; lastUltraDay burada yazılmadığından bir sonraki
   Bugün ziyaretinde/ritüel tamamlanışında yeniden denenir). */
function _maybeUltra() {
  if (!usIsUltraToday()) return;
  const active = document.querySelector('.view.active');
  if (!active || active.id !== 'bugun-view') return;
  if (!S._ultraMeta) S._ultraMeta = _defMeta();
  const key = usDayKey();
  if (S._ultraMeta.lastUltraDay === key) return;
  S._ultraMeta.lastUltraDay = key;
  if (!S._ultraMeta.ultraDays.includes(key)) S._ultraMeta.ultraDays.push(key);
  if (S._ultraMeta.ultraDays.length > 400) S._ultraMeta.ultraDays = S._ultraMeta.ultraDays.slice(-400);
  usSaveAll();
  // ULTRA ARMAĞANI — Üç Mühür gününde sohbete +9 mesaj (13m kota motoru;
  // motor yoksa 06'nın yerel günlük sayacı usIsUltraToday ile +9 uygular)
  let grantP = null;
  try { grantP = window.ktGrantUltraBonus?.(); } catch (_) {}
  _renderUltraAwaken(grantP);
}

/* ════════════════════════════════════════════════════════════════════
   BUGÜN YÜZEYİ — artık Yol hero'su (10f yolRenderHero). Eski çapraz
   üçe bölünmüş kart emekli; ad korunur ki tüm eski çağıranlar
   (loadBugunView, 10s/10t, smRenderBugunCard devralması) yeni hero'yu
   tazelesin.
════════════════════════════════════════════════════════════════════ */
export function usRenderBugunCard() {
  if (!S._hayalMuhru || !S._sozMuhru) usLoad();
  try { window.yolRenderHero?.(); } catch (_) {}
}

/* Yeni vuruş nabzı — hero'daki mühür glifini titreştirir (10f yüzeyi) */
function _pulseSlice(id) {
  const el = document.querySelector(`.yol-glyph--${id}`);
  if (!el) return;
  el.classList.remove('yol-pulse');
  void el.offsetWidth;
  el.classList.add('yol-pulse');
}

/* ════════════════════════════════════════════════════════════════════
   PORTAL — tam-ekran detay sahnesi (Yol'un göğü altında)
════════════════════════════════════════════════════════════════════ */
function _mountPortal() {
  let p = document.getElementById('us-portal');
  if (!p) { p = document.createElement('div'); p.id = 'us-portal'; document.body.appendChild(p); }
  p.className = 'us-portal';
  return p;
}

/* Açık sahnenin kimliği — Kullanım Nabzı (00f) ve Escape temizliği için.
   usOpenDetail kendini yeniden çağırır (hedef seçimi, defter silme); aynı
   sahne yeniden basıldığında telemetriye ikinci bir "açıldı" düşmemeli. */
let _openTri = null;
let _usOnKey = null;

function _telemetryOpen(id) {
  if (_openTri === id) return;
  if (_openTri) { try { window.wtOverlayClose?.('uc-muhur-' + _openTri); } catch (_) {} }
  _openTri = id;
  try { window.wtOverlayOpen?.('uc-muhur-' + id); } catch (_) {}
}

function _closePortal() {
  const p = document.getElementById('us-portal');
  let fadingOut = false;
  if (p) {
    const sc = p.querySelector('.us-scene');
    if (sc) { sc.classList.add('us-scene--out'); fadingOut = true; setTimeout(() => p.remove(), 280); }
    else p.remove();
  }
  if (_usOnKey) { document.removeEventListener('keydown', _usOnKey); _usOnKey = null; }
  if (_openTri) { try { window.wtOverlayClose?.('uc-muhur-' + _openTri); } catch (_) {} _openTri = null; }
  try { window.glSyncElmasBar?.(window.glActiveViewName ? window.glActiveViewName() : ''); } catch (_) {}
  // Yarım kalan ritüel zinciri (akşam at-hayal köprüsü buradan döner) — idempotent.
  const reassert = () => {
    try { window.atRun?.(false); } catch (_) {}
    try { window.glRunDailyRitual?.(false); } catch (_) {}
  };
  setTimeout(reassert, fadingOut ? 320 : 0);
}

/* ── "Yolun neresindesin" mini-yolu — son 7 gün + sonraki istasyon ──
   Detay sayfasının tepesinde: bu serinin son halkaları + ilerideki
   kilometre taşının görseli (ikvMilestoneScene). */
/* Kart paleti anlam ekseninden okunur (12c iki palet bilir): hayal geleceğe
   bakar → lapis; gelmek ve söz vermek bugünün eylemidir → altın. Söz'ün
   bronzu sahne aksanında yaşar (uc-muhur.css --us-accent), kart yüzünde
   değil — üç renk anayasasına yeni bir kart paleti eklenmez. */
function _scenePalette(id) { return id === 'hayal' ? 'lapis' : 'gold'; }

/* Nadirlik kilometre taşının mertebesinden gelir: taş yükseldikçe kart
   folyo kazanır (12c dokunuş merdiveni). Mini kartta folyo zaten kapalı. */
const TIER_RAR = { 1: null, 2: 'nadir', 3: 'nadide', 4: 'efsane' };
function _yolPosHTML(st, id) {
  const nm = st.nm;
  const remaining = nm ? Math.max(0, nm.d - st.n) : 0;
  const pal = _scenePalette(id);
  if (!nm) {
    return `
      <div class="us-yolpos us-yolpos--end">
        <div class="us-yolpos-lbl">${t('us.yolpos.lbl')}</div>
        <div class="us-yolpos-end">${t('us.yolpos.end')}</div>
      </div>`;
  }
  return `
    <div class="us-yolpos">
      <div class="us-yolpos-lbl">${t('us.yolpos.lbl')}</div>
      <div class="us-yolpos-row">
        <div class="us-yolpos-now">
          <span class="us-yolpos-now-n">${st.n}</span>
          <span class="us-yolpos-now-t">${t('us.yolpos.here')}</span>
        </div>
        <div class="us-yolpos-line"><span class="us-yolpos-fill" style="width:${st.pct}%"></span></div>
        <div class="us-yolpos-next">
          <div class="us-yolpos-thumb">${ikvMilestoneScene(nm.d, { palette: pal })}</div>
          <span class="us-yolpos-next-n">${nm.d}</span>
          <span class="us-yolpos-next-t">${esc(nm.name)}</span>
        </div>
      </div>
      <div class="us-yolpos-note">${t('us.yolpos.note').replace('{r}', remaining).replace('{name}', `<b>${esc(nm.name)}</b>`).replace('{sub}', esc(nm.sub))}</div>
    </div>`;
}

function _weekStripHTML(id) {
  const ABBR = t('us.week.abbr').split(',');
  let days;
  if (id === 'seri') { try { days = new Set(_seriDays()); } catch (_) { days = new Set(); } }
  else { days = new Set((_ledgerFor(id) || _defLedger()).days || []); }
  const today = new Date();
  let cells = '';
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    // Gün anahtarı ikiliği: seri defteri pad'siz, hayal/söz padded (10f
    // yolDayRings başlığındaki harita). Yanlış anahtar sessizce boş döner.
    const key = (id === 'seri') ? localDayKey(d) : localISODate(d);
    const on = days.has(key);
    cells += `<span class="us-week-cell${on ? ' us-week-cell--on' : ''}${i === 0 ? ' us-week-cell--today' : ''}">
      <span class="us-week-dot"></span><span class="us-week-lbl">${ABBR[d.getDay()]}</span></span>`;
  }
  return `<div class="us-week" aria-label="${esc(t('us.week.aria'))}">${cells}</div>`;
}

/* Seriye özel "bugün" eylem bloğu */
function _todayBlockHTML(st) {
  const id = st.id;
  if (id === 'seri') {
    return st.activeToday
      ? `<div class="us-today us-today--done">${t('us.today.seri_done')}${st.nm ? t('us.today.next_stone').replace('{d}', st.nm.d) : ''}</div>`
      : `<button class="us-today-btn" id="us-act-seri" type="button">${t('us.today.seal_btn')}</button>`;
  }
  if (id === 'soz') {
    // GÜNÜN MÜHRÜ (Verdiğin Söz) buraya taşındı — host'u bas; içeriği
    // usOpenDetail sonunda window.glRenderVerdiginSoz() doldurur. Bu kart
    // hem söz verme davetini, hem verilen sözü, hem akşam hesabını yönetir.
    return `<div class="us-soz-today" id="us-soz-today"><div id="gl-verdigin-soz"></div></div>`;
  }
  // hayal — Bakış (kanonik eylem) + iki derin kapı + Gördüklerin Defteri
  const todayVision = usGetTodayVision();
  const recent = usGetRecentVisions(28).filter(v => v.text);
  const todayHTML = st.activeToday
    ? `<div class="us-today us-today--done">${t('us.today.hayal_done')}${todayVision && todayVision.text ? `<div class="us-hayal-line">“${esc(todayVision.text)}”</div>` : ''}</div>`
    : `<button class="us-today-btn" id="us-act-hayal" type="button">${t('us.today.hayal_open')}</button>`;
  const gatesHTML = `
    <div class="us-gates">
      <button class="us-gate" data-view="oik" type="button">${t('us.gate.oik')}</button>
      <button class="us-gate" data-view="hayalseans" type="button">${t('us.gate.hayalseans')}</button>
    </div>`;
  const defterHTML = recent.length
    ? `<div class="us-defter">
        <div class="us-defter-lbl">${t('us.defter.lbl')}</div>
        ${recent.map(v => `
          <div class="us-defter-row">
            <span class="us-defter-date">${esc(v.date)}</span>
            <span class="us-defter-line">“${esc(v.text)}”</span>
            <button class="us-defter-del" data-date="${esc(v.date)}" type="button" aria-label="${esc(t('us.defter.del_aria'))}">✕</button>
          </div>`).join('')}
      </div>`
    : `<div class="us-defter us-defter--empty">${t('us.defter.empty')}</div>`;
  return `${todayHTML}${gatesHTML}${defterHTML}`;
}

/* HERO — serinin bugünkü yüzü: elde edilmiş EN SON kilometre taşının kartı.
   Hiç taş yoksa kart sırtı basılır (12c ikvCardBack) — deste henüz açılmadı;
   emoji kilit kullanılmaz. Gün sayısı kartın DIŞINDA durur: kart imgedir,
   sayı ölçümdür. */
function _heroHTML(st, id) {
  const cfg = st.cfg;
  const pal = _scenePalette(id);
  const last = [...cfg.cards].reverse().find(c => st.cards && st.cards[String(c.d)]) || null;
  const face = last
    ? ikvCardFace({}, {
        palette: pal,
        kicker: cfg.kicker,
        name: last.name,
        sub: last.line || last.sub || '',
        rarity: TIER_RAR[last.tier] || undefined,
        scene: ikvMilestoneScene(last.d, { palette: pal }),
      })
    : ikvCardBack({});
  return `
    <div class="us-hero">
      <div class="us-hero-card">${face}</div>
      <div class="us-hero-count">
        <span class="us-hero-n">${st.n}</span>
        <span class="us-hero-day">${t('us.day')}</span>
      </div>
      <div class="us-hero-scene-line">${esc(cfg.sceneLine)}</div>
    </div>`;
}

export function usOpenDetail(id) {
  if (!SERIES_META[id]) id = 'seri';
  if (document.getElementById('us-portal')) document.getElementById('us-portal').remove();
  const st = usSeriesState(id);
  const cfg = st.cfg;
  const pal = _scenePalette(id);
  const portal = _mountPortal();
  _telemetryOpen(id);

  const goalsHTML = cfg.goals.map(g =>
    `<button class="us-goal-opt${st.goal === g.d ? ' us-goal-opt--on' : ''}" data-goal="${g.d}" type="button" title="${esc(g.label)}">${g.d}</button>`
  ).join('');

  // Galeri — kazanılan taş kartın YÜZÜ, kazanılmayan destenin SIRTI.
  const gallery = cfg.cards.map(c => {
    const rec = st.cards && st.cards[String(c.d)];
    const owned = !!rec;
    const face = owned
      ? ikvCardFace({}, {
          palette: pal, mini: true,
          kicker: t('us.ndays').replace('{n}', c.d),
          name: c.name, sub: '',
          scene: ikvMilestoneScene(c.d, { palette: pal, mini: true }),
        })
      : ikvCardBack({ mini: true });
    const foot = owned
      ? (rec.at ? `<div class="us-mcard-when">${esc(rec.at)}</div>` : '')
      : `<div class="us-mcard-need">${t('us.ndays').replace('{n}', c.d)}</div>`;
    return `<div class="us-mcard">${face}${foot}</div>`;
  }).join('');

  portal.innerHTML = `
    <div class="us-scene us-scene--${cfg.scene}" role="dialog" aria-modal="true" aria-label="${esc(cfg.title)}">
      <div class="us-scene-sky" aria-hidden="true"></div>
      <div class="us-scene-grain" aria-hidden="true"></div>
      <button class="us-scene-close" id="us-close" type="button" aria-label="${esc(t('us.close'))}">✕</button>

      <div class="us-scene-body">
        ${_heroHTML(st, id)}

        ${_yolPosHTML(st, id)}

        ${_weekStripHTML(id)}
        ${_todayBlockHTML(st)}

        <div class="us-goalbar">
          <span class="us-goalbar-lbl">${st.goal ? t('us.goalbar.set').replace('{goal}', st.goal) : t('us.goalbar.unset')}</span>
          <span class="us-goalbar-opts">${goalsHTML}</span>
        </div>

        <div class="us-gallery-stat">${t('us.gallery.stat').replace('{owned}', st.owned).replace('{total}', cfg.cards.length)}${
          /* Zincir kanıtsızken SUSAR: hiç mühür yokken "en uzun zincir 0 gün"
             bir ölçüm değil, boş bir sayaçtır (§6.10 — kanıtı olmayan değer
             yoktur). Taşlar kalır: "0 / 8 kilometre taşı" defterin gerçek
             hâlidir, sıfırı da kanıtlıdır. */
          st.bestStreak > 0
            ? t('us.gallery.chain', ' · en uzun zincir {best} gün').replace('{best}', st.bestStreak)
            : ''}${
          /* Toplam emek yalnız zincirden FAZLAYSA konuşur: seri hiç kopmadıysa
             "en uzun zincir" ile aynı sayıyı iki kez söylemiş olurduk. */
          st.totalSeals > st.bestStreak
            ? t('us.gallery.seals', ' · toplamda {n} gün mühürledin').replace('{n}', st.totalSeals)
            : ''}</div>
        <div class="us-gallery">${gallery}</div>
      </div>
    </div>`;

  // Kapatma — üç çıkış: düğme, gövdenin dışı, Escape. Repo genelinde her
  // tören kapısının kuralı (10f:446): kart yalnız fareyle kapanan bir tuzak
  // olamaz. Dinleyici _closePortal'da sökülür, sahne yeniden basılırsa
  // ikinci bir kopya birikmesin diye önce eskisi kaldırılır.
  document.getElementById('us-close')?.addEventListener('click', _closePortal);
  portal.querySelector('.us-scene-sky')?.addEventListener('click', _closePortal);
  if (_usOnKey) document.removeEventListener('keydown', _usOnKey);
  _usOnKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); _closePortal(); } };
  document.addEventListener('keydown', _usOnKey);

  // Hedef seçimi (toggle)
  portal.querySelectorAll('.us-goal-opt').forEach(b => b.addEventListener('click', () => {
    usSetGoal(id, st.goal === parseInt(b.dataset.goal, 10) ? null : parseInt(b.dataset.goal, 10));
    usOpenDetail(id);
  }));

  // Bugün eylemleri
  document.getElementById('us-act-seri')?.addEventListener('click', () => { _closePortal(); setTimeout(() => { try { window.smRunDaily?.(true); } catch (_) {} }, 280); });
  // Söz'ün eylemi #us-act-soz düğmesi DEĞİL, Günün Mührü kartıdır
  // (glRenderVerdiginSoz, aşağıda) — o id hiç render edilmiyordu.
  document.getElementById('us-act-hayal')?.addEventListener('click', () => { _closePortal(); setTimeout(() => { try { window.gorOpen?.(); } catch (_) {} }, 280); });
  portal.querySelectorAll('.us-gate[data-view]').forEach(b => b.addEventListener('click', () => {
    const view = b.dataset.view;
    _closePortal();
    setTimeout(() => { try { window.switchView?.(view); } catch (_) {} }, 280);
  }));
  portal.querySelectorAll('.us-defter-del[data-date]').forEach(b => b.addEventListener('click', () => {
    try { window.usDeleteVision?.(b.dataset.date); } catch (_) {}
    usOpenDetail('hayal');
  }));

  // Söz detayı: Günün Mührü (Verdiğin Söz) kartını #gl-verdigin-soz host'una bas.
  if (id === 'soz') { try { window.glRenderVerdiginSoz?.(); } catch (_) {} }
}

export function usSetGoal(id, goal) {
  if (id === 'seri') { try { window.smSetGoal?.(goal); } catch (_) {} return; }
  const L = _ledgerFor(id);
  if (!L) return;
  L.goal = goal || null;
  if (goal && usStreakFromDays(L.days) >= goal && !L.goalReachedAt) L.goalReachedAt = usDayKey();
  usSaveAll();
  usRenderBugunCard();
}

/* ── ULTRA UYANIŞ ANI — üçü de bugün tamamlandığında bir kez ──
   grantP: ktGrantUltraBonus promise'i — çözülünce armağan sayısı modalda
   güncellenir (admin ultra_bonus'u değiştirmiş olabilir; varsayılan 9). */
function _renderUltraAwaken(grantP) {
  if (document.getElementById('us-awaken')) return;
  const ultraStreak = usStreakFromDays((S._ultraMeta && S._ultraMeta.ultraDays) || []);
  // Studio'da duvar yok → armağan satırı yalnız ücretsiz katmanda anlamlı
  const bonusLine = S.isPremium ? '' : `
      <div class="us-awaken-bonus">${t('us.awaken.bonus')}</div>`;
  // İki kart bindirme — lapis (olmak istediğin) altın (olduğun) üstüne biner:
  // "bugün o kişiydin, iki kart aynı adı taşıdı". Kutuplar tek kaynaktan (10f).
  let poles = null;
  try { poles = window.yolPoles?.(); } catch (_) {}
  const mergeHTML = poles ? `
      <div class="us-awaken-merge" aria-hidden="true">
        <div class="us-awaken-card us-awaken-card--gold">${poles.goldFace}</div>
        <div class="us-awaken-card us-awaken-card--lapis">${poles.lapisFace}</div>
        <div class="us-awaken-merge-glow"></div>
      </div>` : '<div class="us-awaken-crest">✶</div>';
  const el = document.createElement('div');
  el.id = 'us-awaken'; el.className = 'us-awaken';
  el.innerHTML = `
    <div class="us-awaken-veil"></div>
    <div class="us-awaken-modal" role="dialog" aria-modal="true" aria-label="${esc(t('us.awaken.title'))}">
      <div class="us-awaken-rays" aria-hidden="true"></div>
      ${mergeHTML}
      <div class="us-awaken-kicker">${t('us.awaken.kicker')}</div>
      <div class="us-awaken-title">${t('us.awaken.title')}</div>
      <div class="us-awaken-body">${t('us.awaken.body')} ${ultraStreak > 1 ? t('us.awaken.streak').replace('{n}', ultraStreak) : ''}</div>${bonusLine}
      <button class="us-awaken-cta" id="us-awaken-cta">${t('us.awaken.cta')}</button>
    </div>`;
  document.body.appendChild(el);
  // His Motoru (13e) — nadide/efsane açılış tınısı (kart bindirme anı)
  try { window.fxCue?.('holoGrand'); } catch (_) {}
  if (grantP && typeof grantP.then === 'function') {
    grantP.then((n) => {
      if (!n) return;
      const numEl = document.getElementById('us-awaken-bonus-n');
      if (numEl) numEl.textContent = `+${n}`;
    }).catch(() => {});
  }
  const close = () => { el.classList.add('us-awaken--out'); setTimeout(() => el.remove(), 300); };
  el.querySelector('#us-awaken-cta')?.addEventListener('click', close);
  el.querySelector('.us-awaken-veil')?.addEventListener('click', close);
  usRenderBugunCard();
}

/* ════════════════════════════════════════════════════════════════════
   ULTRA SERİ ÇEMBERİ — KALDIRILDI (2026-06-10)
   Topbar'daki #us-ring artık yok; Üç Mühür erişimi Drawer "ÜÇ MÜHÜR"
   üzerinden. Çemberi tazeleyen usRefreshRing no-op olarak bir süre
   korunmuştu; çağıran yerlerle birlikte söküldü (2026-08-17).
════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════════════════════
   INIT / GÜNLÜK ÇALIŞMA
════════════════════════════════════════════════════════════════════ */
export function usInit() {
  if (!S._hayalMuhru) S._hayalMuhru = _defLedger();
  if (!S._sozMuhru) S._sozMuhru = _defLedger();
  if (!S._ultraMeta) S._ultraMeta = _defMeta();
  usLoad();
  // Bugün zaten yapılmış ritüelleri/sözü sessizce yakala (kutlama yok)
  try { usCheckHayalDay({ silent: true }); } catch (_) {}
  try { usCheckSozDay({ silent: true }); } catch (_) {}
  // Seri Mührü kart render'ını devral → mevcut çağıranlar yeni kartı tazeler
  try { window.smRenderBugunCard = usRenderBugunCard; } catch (_) {}
  try { usRenderBugunCard(); } catch (_) {}
}

/* Günde bir kez: detektörleri çalıştır + ultra kontrolü (boot timer'ından) */
export function usRunDaily() {
  if (!S._hayalMuhru) usLoad();
  try { usCheckHayalDay({ silent: true }); } catch (_) {}
  try { usCheckSozDay({ silent: true }); } catch (_) {}
  usRenderBugunCard();
  if (usIsUltraToday()) _maybeUltra();
  // Armağan güvenlik ağı: ultra anı bugün YAKALANMIŞTI ama sunucu armağanı
  // (13m) o an işlenememiş olabilir (çevrimdışı). quota_bonus_grant idempotent,
  // client tarafında da "bugün verildi" guard'ı var — tekrar çağrı ucuzdur.
  try {
    if (usIsUltraToday() && S._ultraMeta && S._ultraMeta.lastUltraDay === usDayKey()) {
      window.ktGrantUltraBonus?.();
    }
  } catch (_) {}
}

/* ── window expose (TDZ-güvenli modüller-arası erişim + inline) ── */
if (typeof window !== 'undefined') {
  window.usInit = usInit;
  window.usRunDaily = usRunDaily;
  window.usCheckHayalDay = usCheckHayalDay;
  window.usCheckSozDay = usCheckSozDay;
  window.usOnSeriSealed = usOnSeriSealed;
  window.usRenderBugunCard = usRenderBugunCard;
  window.usOpenDetail = usOpenDetail;
  window.usSeriesState = usSeriesState;
  window.usSetGoal = usSetGoal;
  window.usRecordVision = usRecordVision;
  window.usGetTodayVision = usGetTodayVision;
  window.usGetRecentVisions = usGetRecentVisions;
  window.usDeleteVision = usDeleteVision;
  // 06 yerel kota fallback'i + 13m armağan köprüsü "bugün ultra mı?" diye sorar
  window.usIsUltraToday = usIsUltraToday;
}
