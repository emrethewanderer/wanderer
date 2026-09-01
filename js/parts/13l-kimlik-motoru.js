// Wanderer AI — KİMLİK MOTORU · "Olduğun Kişi" (13l)
// ════════════════════════════════════════════════════════════════════════════
// Kitabın çekirdek tezi: Olduğun Kişi'yi belirle → Olmak İstediğin Kişi'yi
// belirle → onun düşünceleri/inançları/hisleri/davranışlarıyla kendini yeniden
// inşa et. Kullanıcı NASIL BİR KİŞİYE DÖNÜŞTÜĞÜNÜ kendisi göremeyebilir —
// ona gösteren biziz.
//
// Bu motor üç şey yapar:
//   1) OLAY DEFTERİ — kullanıcının uygulamadaki tüm hareketlerini, önem
//      sırasına dizilmiş bir taksonomiyle (Tier 1-4) zaman damgalı olaylara
//      çevirir. Hiçbir modüle dokunmadan çalışır: sayaç-delta gözlemcisi
//      mevcut state'i izler, artış = olay. (+ EventBus 'navigate' ziyaretleri)
//   2) ŞİMDİKİ KİŞİ — olaylar zaman-azalmalı (yarı ömür 7 gün) bir ERDEM
//      VEKTÖRÜNE damıtılır. Sahipli kartlar arasında "şu an en çok kim
//      olduğu" çözülür: birikimli reçete skoru (10q) + güncel erdem yakınlığı.
//      Histerezis ile kararlı: kimlik 18 saatten önce ve +8 puan fark
//      olmadan el değiştirmez.
//   3) KİMLİK DEVRİ — Kişiler'deki bir kart KAZANILDIĞI an o kart artık
//      OLDUĞU KİŞİ'dir (10q paket töreni "ARTIK OLDUĞUN KİŞİ" mührünü basar).
//      Kazanımlar arasında kimlik, sahipli kartlar içinde davranışla kayar
//      ve sessiz bir kurdele ile bildirilir. Yol, kimlik şeridinde ve Emre
//      bağlamında görünür.
//
// ÖNEM SIRASI (taksonomi, ağır → hafif):
//   T1 kimlik beyanı : bütünleşme, davranış kanıtı, söz tutma, geçiş okuması,
//                      hayal sahnesi, portre maddesi
//   T2 ritüel pratiği: değerlendirme, kendinle konuşma, başarı günlüğü,
//                      geçiş kartı, suret tanıma, gün mührü, söz verme
//   T3 sohbet derinliği: kırılganlık, inanç kurma, sohbet mesajı
//   T4 yönelim       : Kişiler/ritüel ziyaretleri
//
// Konvansiyon: hardcoded TR; window.im* expose; stiller JS-enjekte;
// SafeStorage (kullanıcı-anahtarlı) + Supabase kimlik_yolculugu (mig 016).
// ════════════════════════════════════════════════════════════════════════════

import { S } from '../state.js';
import { sb } from '../config.js';
import { SafeStorage, EventBus, getActivityDays, zamanAgirligi } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { p } from './16-i18n-prompts.js';
import { kkComputeSignals, kkMatchCard, kkRenderCard3D, kkOpenDetail, kkBindTilt } from './10q-w2-kisi-karti.js';
import { getCardById, getFullDeck, RARITIES } from './12b-kart-destesi.js';
import { wsArchFigure } from './12a-archetypes.js';
import { dfGetBeliefStats } from './09b-depth-foundations.js';

/* ── küçük yardımcılar ───────────────────────────────────────────────────── */
const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
const _rarLabel = (r) => r?.id ? t(`deck.rarity.${r.id}`, r.label) : ''; // K7 köprüsü (12b RARITIES)
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

const DAY_MS = 24 * 60 * 60 * 1000;
const HALF_LIFE_MS = 7 * DAY_MS;     // erdem vektörü yarı ömrü — "şu an" ≈ son hafta
const HOLD_MS = 18 * 60 * 60 * 1000; // kimlik en az bu kadar tutulur (çırpınma önleyici)
const SWITCH_MARGIN = 8;             // kayma için gereken puan farkı
const LEDGER_CAP = 600;
const VIRTUE_SAT_K = 20;             // erdem skorunun doyum sabiti (raw/(raw+K))

/* ── 11 erdem (12b VIRTUE_META anahtarlarıyla bire bir) ──────────────────── */
const VIRTUES = ['sebat', 'bolluk', 'ozsaygi', 'durust', 'ozguven', 'ozdeger',
  'ozsevgi', 'niyet', 'sukur', 'yansima', 'odak'];
/* Etiket render anında i18n sözlüğünden (im.virtue.*) — modül-yükünde DONMASIN */
const _virtueLabel = (v) => t('im.virtue.' + v, v);

/* ════════════════════════════════════════════════════════════════════════
   1) TAKSONOMİ — izlenen tüm hareketler, ÖNEM SIRASINA dizilmiş
   w: olay ağırlığı · virtues: hangi erdemleri hangi payla besler
   counter: delta-gözlemcinin okuduğu sayaç (artış = olay)
═══════════════════════════════════════════════════════════════════════════ */
export const IM_TAXONOMY = [
  /* ── TIER 1 — kimlik beyanı: "olmak istediğin kişi gibi davrandın" ── */
  { type: 'butunlesme',       tier: 1, w: 14, label: 'Suret bütünleşmesi',
    virtues: { durust: .4, ozsevgi: .3, yansima: .3 },
    counter: () => (S._suretler || []).filter(x => x.hal === 'butunlesti').length },
  { type: 'davranis_kaniti',  tier: 1, w: 14, label: 'Davranış kanıtı',
    virtues: { ozguven: .4, niyet: .3, sebat: .3 },
    counter: () => ((S._wandererGame || {}).davranisKanitlari || []).length },
  { type: 'soz_tutuldu',      tier: 1, w: 13, label: 'Verdiği sözü tuttu',
    virtues: { sebat: .5, durust: .3, ozsaygi: .2 },
    counter: () => ((S._gunlukRitus || {}).pledges || []).filter(p => p.kept === true).length },
  { type: 'gecis_okuma',      tier: 1, w: 12, label: 'Geçiş okuması',
    virtues: { niyet: .5, sebat: .3, odak: .2 },
    counter: () => Math.max(num(S._oik?.readingLog?.totalReadings), num(S._gecisAlani?.readingLog?.totalReadings)) },
  { type: 'hayal_sahnesi',    tier: 1, w: 11, label: 'Hayal sahnesi mühürledi',
    virtues: { niyet: .4, bolluk: .3, ozdeger: .3 },
    counter: () => ((S._hayalAlemi || {}).sahneler || []).length },
  { type: 'portre_maddesi',   tier: 1, w: 10, label: 'Portre\'na madde yazdı',
    virtues: { durust: .5, yansima: .5 },
    counter: () => ['dusunceler', 'inanclar', 'duygular', 'davranislar']
      .reduce((n, k) => n + ((S._portre?.[k] || []).length), 0) },

  /* ── TIER 2 — ritüel pratiği: dönüşümün günlük zanaatı ── */
  // Oluş beyanı (Oluş Mührü): kart artık dağıtılmaz, kullanıcı "artık o
  // kişiyim" dediğinde mühürlenir. Sayaç yalnız `muhur` alanı taşıyan kayıtları
  // görür — K6 mirası (alan YOK) sayılmaz, yani eski koleksiyon kimlik devrini
  // geriye dönük tetiklemez. imEvent DOĞRUDAN çağrılmaz: sayaç + çağrı çifte
  // kayıt olurdu (aynı gerekçe kkMuhurle'de, 10q).
  { type: 'olus_beyani',      tier: 2, w: 8, label: 'Bir kişi olduğunu beyan etti',
    virtues: { ozdeger: .5, durust: .3, niyet: .2 },
    counter: () => Object.values((S._kisiKarti || {}).collection || {})
      .filter(c => c && c.muhur).length },
  { type: 'degerlendirme',    tier: 2, w: 8, label: 'Değerlendirme yaptı',
    virtues: { yansima: .6, sukur: .2, durust: .2 },
    counter: () => ['day', 'week', 'month', 'year'].reduce((n, k) => n + ((S._reviews?.[k] || []).length), 0) },
  { type: 'kendinle_konusma', tier: 2, w: 8, label: 'Kendinle Konuşmak seansı',
    virtues: { durust: .5, yansima: .3, ozsevgi: .2 },
    counter: () => ((S._selfDialogue || {}).sessions || []).length },
  { type: 'dinlenme_basari',  tier: 2, w: 7, label: 'Başarı günlüğüne yazdı',
    virtues: { ozsevgi: .5, sukur: .3, ozdeger: .2 },
    counter: () => ((S._dinlenme || {}).achievements || []).length },
  { type: 'gecis_karti',      tier: 2, w: 7, label: 'Olmak İstediği Kişi kartı yazdı',
    virtues: { niyet: .6, ozdeger: .2, odak: .2 },
    counter: () => Math.max(((S._oik || {}).cards || []).length, ((S._gecisAlani || {}).cards || []).length) },
  { type: 'hedef_muhru',      tier: 2, w: 6, label: 'Bir kişiyi hedefine koydu',
    virtues: { niyet: .6, odak: .2, ozdeger: .2 },
    counter: () => Object.keys((S._kisiKarti || {}).hedefler || {}).length },
  // Panzehir (K6): gölgeyi tanıdı VE ona karşı ışığı elde tutuyor. Erdem payı
  // gölgenin kendi erdemine değil, o işi mümkün kılan niteliklere yazılır —
  // dürüstlük (gölgeye bakmak) ve yansıma (onu tanımak).
  { type: 'panzehir',         tier: 2, w: 7, label: 'Bir gölgenin panzehrini buldu',
    virtues: { durust: .45, yansima: .35, ozsaygi: .2 },
    counter: () => Object.keys((S._kisiKarti || {}).panzehirler || {}).length },
  { type: 'suret_tanima',     tier: 2, w: 6, label: 'Bir suretini tanıdı',
    virtues: { durust: .4, yansima: .4, ozguven: .2 },
    counter: () => (S._suretler || []).filter(x => x.hal === 'adlandi' || x.hal === 'butunlesti').length },
  { type: 'gun_muhru',        tier: 2, w: 6, label: 'Günü mühürledi',
    virtues: { sebat: .7, odak: .3 },
    counter: () => { try { return getActivityDays().length; } catch (_) { return 0; } } },
  { type: 'soz_verildi',      tier: 2, w: 5, label: 'Söz verdi',
    virtues: { niyet: .6, ozguven: .2, sebat: .2 },
    counter: () => ((S._gunlukRitus || {}).pledges || []).length },

  /* ── TIER 3 — sohbet derinliği: kelimelerle yapılan iş ── */
  { type: 'kirilganlik',      tier: 3, w: 4, label: 'Kırılganlığını paylaştı',
    virtues: { durust: .5, ozsevgi: .3, ozguven: .2 },
    counter: () => num(S._relationshipDepth?.vulnerability_moments) },
  { type: 'inanc_kurma',      tier: 3, w: 3, label: 'İnanç çalışması yaptı',
    virtues: { ozdeger: .4, bolluk: .3, ozguven: .3 },
    counter: () => { try { return num(dfGetBeliefStats().count); } catch (_) { return 0; } } },
  { type: 'sohbet_mesaji',    tier: 3, w: 2, label: 'Sohbette derinleşti',
    virtues: { yansima: .5, durust: .25, ozsevgi: .25 },
    counter: () => (S.chatHistory || []).filter(m => m.role === 'user').length },

  /* ── TIER 4 — yönelim: dikkatin döndüğü yer (ziyaretler; sayaç yok,
        EventBus 'navigate' üzerinden olay düşer) ── */
  { type: 'kisiler_ziyaret',  tier: 4, w: 1, label: 'Kişiler\'e baktı',
    virtues: { niyet: .4, odak: .3, ozdeger: .3 }, counter: null },
  { type: 'rituel_ziyaret',   tier: 4, w: 1, label: 'Ritüel alanına girdi',
    virtues: { niyet: .5, odak: .5 }, counter: null },
];
const TAXO_BY_TYPE = Object.fromEntries(IM_TAXONOMY.map(e => [e.type, e]));

/* Olay etiketi render anında i18n sözlüğünden (im.move.*); const'taki TR label
   fallback olarak kalır — modül-yükünde DONMASIN. */
const _txLabel = (tx) => tx ? t('im.move.' + tx.type, tx.label) : '';

// EventBus 'navigate' → T4 ziyaret olayları (görünüm → olay tipi)
const VISIT_EVENTS = {
  arketipler: 'kisiler_ziyaret', kisilerim: 'kisiler_ziyaret',
  gecis: 'rituel_ziyaret', kendinle: 'rituel_ziyaret', degerlendirme: 'rituel_ziyaret',
  hayal: 'rituel_ziyaret', dinlenme: 'rituel_ziyaret', meclis: 'rituel_ziyaret',
};

/* ════════════════════════════════════════════════════════════════════════
   2) DURUM + KALICILIK
═══════════════════════════════════════════════════════════════════════════ */
function imDefault() {
  return { ledger: [], base: {}, currentPersonaId: null, personaSince: null, personaHistory: [], seeded: false, lastTick: 0 };
}
const IM_KEY = uid => `etw_kimlik_motoru_v1_${uid}`;

function imState() {
  if (!S._kimlik) S._kimlik = imDefault();
  return S._kimlik;
}

export function imLoad() {
  if (!S.currentUser?.id) return;
  try {
    const data = SafeStorage.get(IM_KEY(S.currentUser.id), null);
    if (data && typeof data === 'object') {
      S._kimlik = Object.assign(imDefault(), data);
      if (!Array.isArray(S._kimlik.ledger)) S._kimlik.ledger = [];
      if (!Array.isArray(S._kimlik.personaHistory)) S._kimlik.personaHistory = [];
      if (!S._kimlik.base || typeof S._kimlik.base !== 'object') S._kimlik.base = {};
    }
  } catch (e) { console.warn('imLoad:', e?.message); }
}

let _imSaveTimer = null;
export function imSave() {
  clearTimeout(_imSaveTimer);
  _imSaveTimer = setTimeout(() => {
    try {
      if (!S.currentUser?.id) return;
      const im = imState();
      im.ledger = im.ledger.slice(-LEDGER_CAP);
      im.personaHistory = im.personaHistory.slice(-60);
      SafeStorage.set(IM_KEY(S.currentUser.id), im);
    } catch (_) {}
    imSyncToSupabase();
  }, 500);
}

/* ── Supabase senkron (migration 016 — ELLE uygulanır) — best-effort ─────── */
let _imSyncTimer = null;
function imSyncToSupabase() {
  clearTimeout(_imSyncTimer);
  _imSyncTimer = setTimeout(async () => {
    try {
      const uid = S.currentUser?.id;
      if (!uid || !sb) return;
      const im = imState();
      await sb.from('kimlik_yolculugu').upsert({
        user_id: uid,
        current_persona: im.currentPersonaId,
        persona_since: im.personaSince,
        persona_history: (im.personaHistory || []).slice(-60),
        virtue_now: imVirtueNow(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch (_) { /* offline / tablo yok → SafeStorage yeter */ }
  }, 1800);
}

async function imSyncFromSupabase() {
  try {
    const uid = S.currentUser?.id;
    if (!uid || !sb) return;
    const { data } = await sb.from('kimlik_yolculugu')
      .select('current_persona,persona_since,persona_history').eq('user_id', uid).maybeSingle();
    if (!data) return;
    const im = imState();
    // Uzak geçmiş daha uzunsa (başka cihazda yaşanmış yol) → birleştir
    if (Array.isArray(data.persona_history) && data.persona_history.length > im.personaHistory.length) {
      im.personaHistory = data.persona_history;
    }
    if (!im.currentPersonaId && data.current_persona) {
      im.currentPersonaId = data.current_persona;
      im.personaSince = data.persona_since || new Date().toISOString();
    }
  } catch (_) { /* sessiz */ }
}

/* ════════════════════════════════════════════════════════════════════════
   3) OLAY DEFTERİ — delta-gözlemci + açık API
═══════════════════════════════════════════════════════════════════════════ */
/** Deftere olay yaz (gelecekte modüller doğrudan da çağırabilir). */
export function imEvent(type, count = 1) {
  const tx = TAXO_BY_TYPE[type];
  if (!tx) return;
  const im = imState();
  const n = Math.min(Math.max(1, count | 0), 3); // tek seferde en çok 3 (sel önleyici)
  const now = Date.now();
  for (let i = 0; i < n; i++) im.ledger.push({ t: now, type, w: tx.w });
  if (im.ledger.length > LEDGER_CAP) im.ledger = im.ledger.slice(-LEDGER_CAP);
  imSave();
}

/** Sayaçları tara; artış = olay. İlk çalıştırmada sessiz taban alınır
 *  (geçmiş birikim olay sayılmaz — kkBackfill ile aynı ilke).
 *  Azalış = sıfırlama (günlük sayaçlar) → taban yenilenir, olay düşmez. */
function imObserve() {
  const im = imState();
  const silent = !im.seeded;
  for (const tx of IM_TAXONOMY) {
    if (!tx.counter) continue;
    let cur = 0;
    try { cur = num(tx.counter()); } catch (_) { continue; }
    const prev = im.base[tx.type];
    if (typeof prev !== 'number' || cur < prev) {
      im.base[tx.type] = cur;             // ilk taban / sayaç sıfırlandı
      continue;
    }
    if (cur > prev) {
      im.base[tx.type] = cur;
      if (!silent) imEvent(tx.type, cur - prev);
    }
  }
  if (silent) { im.seeded = true; imSave(); }
}

/* ════════════════════════════════════════════════════════════════════════
   4) ERDEM VEKTÖRÜ — zaman-azalmalı "şu an kimsin" damıtması
═══════════════════════════════════════════════════════════════════════════ */
export function imVirtueNow() {
  const im = imState();
  const now = Date.now();
  const raw = {};
  for (const v of VIRTUES) raw[v] = 0;
  for (const e of im.ledger) {
    const tx = TAXO_BY_TYPE[e.type];
    if (!tx) continue;
    const age = now - (e.t || now);
    if (age > 30 * DAY_MS) continue;                       // 30 günden eski → etkisiz
    // Çürüme formülü 00a-infrastructure.js → zamanAgirligi'ye TAŞINDI (Tanıma
    // Motoru K5, 09i-secici.js de aynı yardımcıyı kullanır); davranış birebir
    // — yarı ömür burada hâlâ 7 gün (HALF_LIFE_MS/DAY_MS), test sabitler.
    const decay = zamanAgirligi(e.t, HALF_LIFE_MS / DAY_MS);
    const w = (e.w || tx.w) * decay;
    for (const [v, share] of Object.entries(tx.virtues)) raw[v] = (raw[v] || 0) + w * share;
  }
  const out = {};
  for (const v of VIRTUES) out[v] = Math.round(100 * raw[v] / (raw[v] + VIRTUE_SAT_K));
  return out;
}

/** Son 7 günün olay dökümü — UI "seni bu kişi yapan hareketler" + Emre bağlamı. */
export function imRecentMoves(days = 7, max = 4) {
  const im = imState();
  const since = Date.now() - days * DAY_MS;
  const counts = {};
  for (const e of im.ledger) {
    if ((e.t || 0) < since) continue;
    counts[e.type] = (counts[e.type] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([type, n]) => ({ type, n, tx: TAXO_BY_TYPE[type] }))
    .filter(x => x.tx)
    .sort((a, b) => (b.tx.w * b.n) - (a.tx.w * a.n))   // önem × sıklık
    .slice(0, max);
}

/* ════════════════════════════════════════════════════════════════════════
   5) ÇÖZÜCÜ — sahipli kartlar arasında "şu an olduğu kişi"
═══════════════════════════════════════════════════════════════════════════ */
/** Bir kartın "şu an bu kişisin" skoru:
 *  %45 birikimli reçete eşleşmesi (10q — bu kişi olabilmiş mi) +
 *  %55 güncel erdem yakınlığı (son günlerde bu kişinin erdemini yaşıyor mu) +
 *  tazelik bonusu (yeni kazanılan kart = en taze "oldun" anı). */
function imNowScore(card, sig, vnow, coll) {
  const m = kkMatchCard(card, sig);
  const recent = num(vnow[card.virtue], 0);
  let fresh = 0;
  const earnedAt = coll[card.id] && Date.parse(coll[card.id].earnedAt || 0);
  if (earnedAt) {
    const age = Date.now() - earnedAt;
    if (age < 2 * DAY_MS) fresh = 10;
    else if (age < 7 * DAY_MS) fresh = 4;
  }
  return Math.round(clamp(0.45 * m.score + 0.55 * recent + fresh));
}

/** Kimliği çöz. Dönen: { changed, current } — current = { cardId, score } | null */
export function imResolve(opts) {
  opts = opts || {};
  // Motor hazır değilken (imLoad çalışmadan) çözme: hidre edilmemiş varsayılan
  // durum üstüne persona yazılır, imLoad sonra üstüne gelirdi.
  if (!_imInited) return { changed: false, current: null };
  const im = imState();
  const coll = (S._kisiKarti && S._kisiKarti.collection) || {};
  const ownedIds = Object.keys(coll);
  // Kart yok → kimlik Portre başlığında kalır. Persona ASLA silinmez:
  // kartlar geri alınmaz; boş koleksiyon = henüz hidrate olmamış olabilir.
  if (!ownedIds.length) return { changed: false, current: null };
  // Deste sidecar'ı henüz inmediyse hüküm verme: getCardById=null görüp
  // mevcut kimliği geçersiz sayardık — sonraki tick'te deste hazır olur.
  if (!getFullDeck().length) return { changed: false, current: null };

  const sig = kkComputeSignals();
  const vnow = imVirtueNow();
  let best = null;
  for (const id of ownedIds) {
    const card = getCardById(id);
    if (!card) continue;
    const score = imNowScore(card, sig, vnow, coll);
    if (!best || score > best.score) best = { cardId: id, score };
  }
  if (!best) return { changed: false, current: null };

  const curId = im.currentPersonaId;
  // Mevcut kimlik geçerli mi (kart koleksiyonda yok / desteden kalkmış olabilir)
  const curValid = curId && coll[curId] && getCardById(curId);

  if (!curValid) {
    // HİDRASYON YARIŞI KORUMASI: açılıştan kısa süre sonra koleksiyon henüz
    // kısmen yüklü olabilir → persona'yı devirme, sonraki tick'te yeniden bak.
    if (curId && Date.now() - _imBootAt < 30000) return { changed: false, current: null };
    imSetPersona(best.cardId, 'resolve', { quiet: true });
    return { changed: true, current: best };
  }
  if (best.cardId === curId) return { changed: false, current: best };

  // Histerezis: yeterince uzun tutuldu mu + fark anlamlı mı
  const heldMs = Date.now() - (Date.parse(im.personaSince || 0) || 0);
  const curCard = getCardById(curId);
  const curScore = imNowScore(curCard, sig, vnow, coll);
  if (heldMs >= HOLD_MS && best.score >= curScore + SWITCH_MARGIN) {
    imSetPersona(best.cardId, 'resolve', { quiet: !!opts.quiet });
    return { changed: true, current: best };
  }
  return { changed: false, current: { cardId: curId, score: curScore } };
}

/** Kimliği devret. via: 'earn' (kart kazanımı) | 'resolve' (davranış kayması) */
export function imSetPersona(cardId, via, opts) {
  opts = opts || {};
  const card = getCardById(cardId);
  if (!card) return;
  const im = imState();
  if (im.currentPersonaId === cardId) return;
  // Devir ölçüsü: önceki kimliğin ne kadar tutulduğunu üstüne yazmadan ÖNCE
  // al — aşağıdaki telemetri bu sayıyı taşır.
  const _oncekiSince = Date.parse(im.personaSince || 0) || 0;
  im.currentPersonaId = cardId;
  im.personaSince = new Date().toISOString();
  im.personaHistory.push({ cardId, name: card.name, at: im.personaSince, via: via || 'resolve' });
  imSave();
  // Kimlik Üçgeninin Nabzı (İç Çalışma 07 rev.2 · boşluk D). Buraya
  // yalnızca kimlik GERÇEKTEN el değiştirdiğinde gelinir: yukarıdaki
  // "aynı kart" dalı erken döner. İki kaynak ayrı sayılır — 'earn' kart
  // kazanımıyla gelen devir, 'resolve' davranışla çözülen kayma.
  try {
    window.wtLogKimlik?.(via === 'earn' ? 'devir' : 'kayma', {
      kaynak: via === 'earn' ? 'earn' : 'resolve',
      gun: _oncekiSince ? Math.round((Date.now() - _oncekiSince) / DAY_MS) : 0,
      n:   Object.keys((S._kisiKarti && S._kisiKarti.collection) || {}).length,
    });
  } catch (_) {}
  // açık görünümleri tazele
  try { imRenderIdentityBlock(); } catch (_) {}
  try { if (document.getElementById('portre-root')) window.loadPortreView?.(); } catch (_) {}
  // davranış kayması → sessiz kurdele (kazanımın töreni 10q paketinde)
  if (via === 'resolve' && !opts.quiet) imShiftRibbon(card);
}

/** 10q çağırır: kart kazanıldı → kimlik devri. silent = backfill (sessiz).
 *  Motor henüz başlamadıysa (kkInit +1200ms, imInit +1800ms) kazanım kuyruğa
 *  alınır; imInit hidrasyon sonrası işler — devir kaybolmaz. */
let _imPendingEarn = null;
export function imOnCardEarned(cardId, silent) {
  if (!_imInited) { if (!silent && cardId) _imPendingEarn = cardId; return; }
  if (silent) { imResolve({ quiet: true }); return; }
  imSetPersona(cardId, 'earn');
}

/** Paket töreni sorar: bu kart şu an kimlik mi? ("ARTIK OLDUĞUN KİŞİ" mührü) */
export function imIsCurrentPersona(cardId) {
  return imState().currentPersonaId === cardId;
}

export function imGetCurrent() {
  const im = imState();
  if (!im.currentPersonaId) return null;
  const card = getCardById(im.currentPersonaId);
  if (!card) return null;
  return { cardId: im.currentPersonaId, card, since: im.personaSince };
}

/* ════════════════════════════════════════════════════════════════════════
   6) EMRE BAĞLAMI — 09a buildPersonalizationPrompt enjekte eder
═══════════════════════════════════════════════════════════════════════════ */
export function imGetContext() {
  const im = imState();
  const cur = imGetCurrent();
  const lines = [];
  if (cur) {
    const days = Math.max(0, Math.floor((Date.now() - (Date.parse(cur.since || 0) || Date.now())) / DAY_MS));
    const vl = _virtueLabel(cur.card.virtue) || cur.card.virtue;
    lines.push(`Şu an olduğu kişi (gözlemlenen davranıştan): "${cur.card.name}" — ${vl} erdemi${days > 0 ? `, ${days} gündür` : ', bugün oldu'}.`);
  }
  const vnow = imVirtueNow();
  const top = VIRTUES.map(v => [v, vnow[v]]).filter(x => x[1] >= 25)
    .sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (top.length) lines.push(`Son 7 günün baskın erdemleri: ${top.map(([v, s]) => `${_virtueLabel(v)} (${s})`).join(', ')}.`);
  const moves = imRecentMoves(7, 3);
  if (moves.length) lines.push(`Bunu yapan hareketleri: ${moves.map(m => `${m.n}× ${_txLabel(m.tx).toLocaleLowerCase(S._currentLang || 'tr')}`).join(', ')}.`);
  const hist = (im.personaHistory || []).slice(-3);
  if (hist.length >= 2) lines.push(`Kimlik yolu: ${hist.map(h => h.name).join(' → ')}.`);
  if (!lines.length) return '';
  return '◈ OLDUĞU KİŞİ (Kimlik Motoru — uygulamadaki hareketlerinden çözülür):\n' + lines.join('\n') +
    '\n' + p('prompt.kimlik_motoru.reveal_directive');
}

/* ════════════════════════════════════════════════════════════════════════
   7) UI — kimlik bloğu (Kişilerim) + Portre afişi + kayma kurdelesi
═══════════════════════════════════════════════════════════════════════════ */
function fmtSince(iso) {
  const ts = Date.parse(iso || 0);
  if (!ts) return '';
  const days = Math.floor((Date.now() - ts) / DAY_MS);
  if (days <= 0) return t('im.since.today', 'bugün oldun');
  if (days === 1) return t('im.since.yesterday', 'dünden beri');
  return t('im.since.days', '{n} gündür').replace('{n}', days);
}

/** Kişilerim görünümündeki "OLDUĞUN KİŞİ" bloğu (#im-identity-host). */
export function imRenderIdentityBlock() {
  const host = document.getElementById('im-identity-host');
  if (!host) return;
  imEnsureStyles();
  const cur = imGetCurrent();
  const im = imState();

  if (!cur) {
    // Henüz kart yok → "Olunan [Ad]" (Portre 2.0) kimliktir; epitet alt satırda
    const baslik = S._portre?.confirmed && S._portre.baslik;
    let seedName = baslik;
    try { if (baslik && window.porCardName) seedName = window.porCardName(); } catch (_) {}
    host.innerHTML = baslik ? `
      <div class="im-block im-block--seed">
        <div class="im-kicker">${t('im.kicker_who', 'OLDUĞUN KİŞİ')}</div>
        <div class="im-name">${esc(seedName)}</div>
        ${seedName !== baslik ? `<div class="im-virtue">${esc(baslik)}</div>` : ''}
        <div class="im-note">${t('im.seed_note', "Portrenden. Hareketlerin ilk kartını çağırdığında, olduğun kişi burada değişecek.")}</div>
      </div>` : '';
    return;
  }

  const R = RARITIES[cur.card.rarity] || RARITIES.yaygin;
  const vl = _virtueLabel(cur.card.virtue) || '';
  const moves = imRecentMoves(7, 3);
  const movesHtml = moves.length ? `
    <div class="im-moves">
      <div class="im-moves-h">${t('im.moves_h', 'SENİ BU KİŞİ YAPAN HAREKETLER · son 7 gün')}</div>
      ${moves.map(m => `<div class="im-move"><b>${m.n}×</b> ${esc(_txLabel(m.tx))}</div>`).join('')}
    </div>` : '';

  // kimlik yolculuğu şeridi (son 4 durak)
  const hist = (im.personaHistory || []).slice(-4);
  const pathHtml = hist.length >= 2 ? `
    <div class="im-path">${hist.map((h, i) =>
      `<span class="im-path-stop ${i === hist.length - 1 ? 'is-now' : ''}">${esc(h.name)}</span>`
    ).join('<span class="im-path-arrow">→</span>')}</div>` : '';

  host.innerHTML = `
    <div class="im-block" data-open="${esc(cur.cardId)}">
      <div class="im-card">${kkRenderCard3D(cur.card, { mini: true })}</div>
      <div class="im-txt">
        <div class="im-kicker">✦ ${t('im.kicker_who', 'OLDUĞUN KİŞİ')} · ${fmtSince(cur.since)}</div>
        <div class="im-name">${esc(cur.card.name)}</div>
        <div class="im-virtue" style="color:${R.color}">${esc(vl)} · ${_rarLabel(R)}</div>
        ${movesHtml}
      </div>
    </div>
    ${pathHtml}`;

  kkBindTilt(host);
  host.querySelector('[data-open]')?.addEventListener('click', () => kkOpenDetail(cur.cardId));
}

/** Portre görünümü afişi — 02c loadPortreView üstüne basar. */
export function imPortreBanner() {
  const cur = imGetCurrent();
  if (!cur) return '';
  imEnsureStyles();
  const R = RARITIES[cur.card.rarity] || RARITIES.yaygin;
  return `
    <div class="im-portre" onclick="window.kkOpenDetail&&window.kkOpenDetail('${esc(cur.cardId)}')">
      <div class="im-portre-fig">${wsArchFigure(cur.card.glyph, 40, R.color, 1, true)}</div>
      <div class="im-portre-txt">
        <div class="im-kicker">✦ ${t('im.kicker_who_now', 'OLDUĞUN KİŞİ ŞİMDİ')} · ${fmtSince(cur.since)}</div>
        <div class="im-portre-name">${esc(cur.card.name)}</div>
        <div class="im-note">${t('im.portre_note', 'Hareketlerin konuştu — bu kişiye evrildin. Aşağıdaki ilk hâlin, yolun başlangıcı olarak kalır.')}</div>
        <div class="im-kicker">${t('im.kaynak_rozet', 'HAREKETLERİNDEN ÇÖZÜLDÜ')}</div>
        <div class="im-note">${t('im.ucgen_harita', 'Portrende kendini nasıl tanıdığın yazar; burada hareketlerinin ne söylediği. İkisi arasındaki mesafe — mesele orası.')}</div>
      </div>
    </div>`;
}

/** Giriş ekranı (02c showEntryCards) çipi — "OLDUĞUN KİŞİ" sahnesine eklenir. */
export function imEntryChip() {
  const cur = imGetCurrent();
  if (!cur) return '';
  imEnsureStyles();
  return `<div class="im-entry-chip">${t('im.entry_chip', '✦ Şu an: {name} — hareketlerinle bu kişi oldun').replace('{name}', `<b>${esc(cur.card.name)}</b>`)}</div>`;
}

/* ── davranış kayması kurdelesi — sessiz, kibirli değil ──────────────────── */
let _ribbonLast = 0;
function imShiftRibbon(card) {
  try {
    if (document.visibilityState !== 'visible') return;
    const a = document.activeElement;
    if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT' || a.isContentEditable)) return;
    if (Date.now() - _ribbonLast < 6 * 60 * 60 * 1000) return;  // en çok 6 saatte bir
    _ribbonLast = Date.now();
    imEnsureStyles();
    const R = RARITIES[card.rarity] || RARITIES.yaygin;
    const el = document.createElement('div');
    el.className = 'im-ribbon';
    el.innerHTML = `
      <div class="im-ribbon-fig">${wsArchFigure(card.glyph, 34, R.color, 1, true)}</div>
      <div class="im-ribbon-txt">
        <div class="im-kicker">${t('im.ribbon_kicker', 'HAREKETLERİN KONUŞTU')}</div>
        <div class="im-ribbon-name">${t('im.ribbon_name', "Artık {name}'sın").replace('{name}', `<b>${esc(card.name)}</b>`)}</div>
      </div>`;
    el.addEventListener('click', () => { try { kkOpenDetail(card.id); } catch (_) {} el.remove(); });
    document.body.appendChild(el);
    try { window.fxCue?.('holo'); } catch (_) {}
    setTimeout(() => el.classList.add('show'), 30);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 450); }, 7000);
  } catch (_) {}
}

/* ════════════════════════════════════════════════════════════════════════
   8) INIT — gözlemci döngüsü + ziyaret aboneliği
═══════════════════════════════════════════════════════════════════════════ */
let _imInited = false;
let _imBootAt = 0;   // hidrasyon yarışı koruması (imResolve) için açılış anı
export async function imInit() {
  if (_imInited) return; _imInited = true;
  _imBootAt = Date.now();
  imState();
  imEnsureStyles();   // paket töreni mührü (kk-pack-cap-identity) her an hazır olsun
  imLoad();
  await imSyncFromSupabase();
  imObserve();                 // ilk taban (sessiz) ya da kaldığı yerden delta
  if (_imPendingEarn) {        // init öncesi (kkBackfill) kazanım → devri şimdi yap
    imSetPersona(_imPendingEarn, 'earn');
    _imPendingEarn = null;
  } else {
    imResolve({ quiet: true });  // açılışta kimliği sessizce çöz
  }

  // T4 — ziyaret olayları (görünüm başına günde bir; defteri şişirmesin)
  const visitedToday = new Set();
  EventBus.on('navigate', ({ view }) => {
    const type = VISIT_EVENTS[view];
    if (!type) return;
    const key = `${view}:${new Date().toDateString()}`;
    if (visitedToday.has(key)) return;
    visitedToday.add(key);
    const im = imState();
    if (im.seeded) imEvent(type, 1);
  });

  // gözlemci döngüsü — 10q tick'inden (4 sn) kasıtlı seyrek
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    const im = imState();
    if (Date.now() - (im.lastTick || 0) < 11000) return;
    im.lastTick = Date.now();
    imObserve();
    imResolve();
  }, 12000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') { imObserve(); imResolve({ quiet: true }); }
  });
}

/* ════════════════════════════════════════════════════════════════════════
   STİLLER (JS-enjekte)
═══════════════════════════════════════════════════════════════════════════ */
function imEnsureStyles() {
  if (document.getElementById('im-styles')) return;
  const css = `
  /* OLDUĞUN KİŞİ sunağı — salon dili: köşeden altın sızıntısı + kâğıt greni */
  .im-block{position:relative;display:flex;align-items:flex-start;gap:14px;overflow:hidden;
    border:1px solid rgba(245,166,35,.30);border-radius:var(--radius-xl,24px);padding:17px;margin-bottom:14px;cursor:pointer;
    background:radial-gradient(120% 90% at 0% 0%, rgba(245,166,35,.11), transparent 55%),linear-gradient(170deg,#1D1712,#120E09);
    box-shadow:0 14px 40px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.04);}
  .im-block::after{content:'';position:absolute;inset:0;background-image:var(--grain-img);background-size:240px;opacity:.10;pointer-events:none;}
  .im-block > *{position:relative;z-index:1;}
  .im-block--seed{display:block;cursor:default;}
  .im-card{width:92px;flex:none;}
  .im-txt{flex:1;min-width:0;}
  .im-kicker{font-family:var(--cinzel,serif);font-size:8.5px;letter-spacing:2.5px;color:var(--gold,#F5A623);font-weight:700;}
  .im-name{font-family:var(--serif-display,var(--serif,Georgia));font-style:italic;font-size:21px;color:var(--text,#EAE2D6);margin-top:4px;line-height:1.15;}
  .im-virtue{font-family:var(--cinzel,serif);font-size:9px;letter-spacing:2px;margin-top:5px;}
  .im-note{font-family:var(--serif,Georgia);font-style:italic;font-size:11.5px;color:var(--text-mid,#95897A);margin-top:8px;line-height:1.55;}
  .im-moves{margin-top:11px;padding-top:9px;position:relative;}
  .im-moves::before{content:'';position:absolute;top:0;left:0;right:20%;height:1px;background:linear-gradient(90deg,rgba(245,166,35,.3),transparent);}
  .im-moves-h{font-family:var(--cinzel,serif);font-size:7px;letter-spacing:2px;color:var(--text-dim,#585349);margin-bottom:5px;}
  .im-move{font-family:var(--serif,Georgia);font-size:11.5px;color:var(--text-mid,#95897A);margin-bottom:3px;}
  .im-move b{color:var(--gold,#F5A623);font-family:var(--cinzel,serif);font-size:10px;}
  /* kimlik yolculuğu şeridi — duraklar geçmişten şimdiye ısınır */
  .im-path{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:-4px 2px 16px;}
  .im-path-stop{font-family:var(--cinzel,serif);font-size:8px;letter-spacing:1.5px;color:var(--text-dim,#585349);}
  .im-path-stop.is-now{color:var(--gold,#F5A623);font-weight:700;text-shadow:0 0 8px rgba(245,166,35,.4);}
  .im-path-arrow{font-size:9px;color:var(--text-dim,#585349);opacity:.7;}
  .im-portre{position:relative;display:flex;align-items:center;gap:12px;overflow:hidden;
    border:1px solid rgba(245,166,35,.28);border-radius:var(--radius-lg,20px);padding:14px 15px;margin-bottom:16px;cursor:pointer;
    background:radial-gradient(120% 100% at 0% 0%, rgba(245,166,35,.10), transparent 60%),linear-gradient(170deg,#1D1712,#120E09);}
  .im-portre-fig{flex:none;}
  .im-portre-txt{flex:1;min-width:0;}
  .im-portre-name{font-family:var(--serif-display,var(--serif,Georgia));font-style:italic;font-size:17px;color:var(--text,#EAE2D6);margin-top:3px;}
  .im-entry-chip{display:inline-block;border:1px solid rgba(245,166,35,.45);border-radius:var(--radius-full,999px);background:rgba(245,166,35,.10);color:var(--gold,#F5A623);font-family:var(--cinzel,serif);font-size:10px;letter-spacing:1.5px;padding:10px 16px;margin:10px auto 2px;}
  .im-entry-chip b{font-weight:700;}
  .im-ribbon{position:fixed;left:50%;bottom:96px;transform:translate(-50%,24px);display:flex;align-items:center;gap:12px;
    background:linear-gradient(180deg,#221A10,#120E09);border:1px solid rgba(245,166,35,.65);border-radius:var(--radius-lg,20px);padding:13px 18px;
    z-index:var(--z-toast,9400);opacity:0;transition:.45s var(--ease-out,ease);box-shadow:0 14px 40px rgba(0,0,0,.55),0 0 22px rgba(245,166,35,.14);cursor:pointer;max-width:88vw;}
  .im-ribbon.show{opacity:1;transform:translate(-50%,0);}
  .im-ribbon-name{font-family:var(--serif,Georgia);font-style:italic;font-size:14px;color:var(--text,#EAE2D6);margin-top:2px;}
  .im-ribbon-name b{color:var(--gold,#F5A623);font-style:normal;}
  /* 10q paket töreni — kimlik devri mührü */
  .kk-pack-cap-identity{font-family:var(--cinzel,serif);font-size:10px;letter-spacing:3px;font-weight:700;color:#ffd76a;text-shadow:0 0 14px rgba(255,180,60,.8);margin-top:10px;animation:imIdentityIn .8s ease .2s both;}
  @keyframes imIdentityIn{from{opacity:0;letter-spacing:8px}to{opacity:1;letter-spacing:3px}}
  @media (prefers-reduced-motion: reduce){
    .kk-pack-cap-identity{animation:none!important}
    .im-ribbon{transition:none!important}
  }
  `;
  const style = document.createElement('style');
  style.id = 'im-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

/* ── window expose (TDZ-güvenli erişim: 10q/02c/09a window.im* çağırır) ──── */
if (typeof window !== 'undefined') {
  window.imInit = imInit;
  window.imEvent = imEvent;
  window.imResolve = imResolve;
  window.imOnCardEarned = imOnCardEarned;
  window.imIsCurrentPersona = imIsCurrentPersona;
  window.imGetCurrent = imGetCurrent;
  window.imGetContext = imGetContext;
  window.imVirtueNow = imVirtueNow;
  window.imRecentMoves = imRecentMoves;
  window.imRenderIdentityBlock = imRenderIdentityBlock;
  window.imPortreBanner = imPortreBanner;
  window.imEntryChip = imEntryChip;
}
