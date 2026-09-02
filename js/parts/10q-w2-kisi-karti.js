// Wanderer AI — KİŞİ KARTI MOTORU & "Kişilerim" Koleksiyonu (10q)
// ════════════════════════════════════════════════════════════════════════════
// Ana oyunlaştırma mekaniği: KART TOPLAMA. Arka planda her etkileşimi analiz
// eden motor, kullanıcının canlı "Kişi Kartı"nı (Düşünceler·İnançlar·Hisler·
// Davranışlar, 0-100) hesaplar. Bu profil bir kartın reçetesini sağladığında,
// 80'ler tarzı bir paket-açma animasyonuyla kart hediye edilir ("Kişilerim").
//
// Akış:  etkileşim → kkTick() → kkComputeSignals/Profile → kkMatchCard(her kart)
//        → yeni kazanım? → kuyruk → kkOpenPack() (paket) → koleksiyon
//
// Tasarım: stiller JS-enjekte (kkEnsureStyles) → CSS-link'ten bağımsız, sağlam.
// Durum tüm kartlar için S._archetypes[id] altında paylaşılır → motor 12a'nın 12
// çekirdek arketipini de otomatik sürer (yalnızca YÜKSELTİR, asla düşürmez).
// ════════════════════════════════════════════════════════════════════════════

import { S } from '../state.js';
import { sb } from '../config.js';
import { showToast, localISODate, escapeHTML } from './00a-infrastructure.js';
import { switchViewHooks } from './03-auth-shell.js';
import { getFullDeck, getCardById, getCardsByCategory, getDeckStats, RARITIES, CATEGORIES } from './12b-kart-destesi.js';
import { EMRE_ONERI, _saveArchetypeProgress } from './12a-archetypes.js';   // wsArchFigure nudge'la birlikte emekli oldu
import { ikvCardFace, ikvCardBack, ikvRing, ikvLantern, ikvComposeBackdrop, ikvEnsureStyles, ikvMesafeCizgi, SIRTLAR } from './12c-kart-gorsel.js';
import { dfGetBeliefStats, dfGetChoiceStats } from './09b-depth-foundations.js';
import { msNiyet, msNiyetCtx, msHesapla } from './13x-mesafe-motoru.js';   // Mesafe Motoru — niyet ağırlığı + Ana Mesafe
import { awardElmas } from './10g-w2-wanderer-game.js';   // aile mührü ikramiyesi (K4)
import { t, localeUpper } from './15-i18n.js';

/* ── küçük yardımcılar ───────────────────────────────────────────────────── */
const DIMS = ['dusunceler', 'inanclar', 'hisler', 'davranislar'];
const _dimLabel = (d) => t(`kk.dim.${d}`); // boyut etiketleri i18n'den (dil donmasın)
/* Cümle içi hâl — başlık etiketi büyük harftir ("DÜŞÜNCELER"), akan metinde
   okunmaz. Mesafe Motoru'nun "en ince yerin" cümlesi bunu kullanır. */
const _dimSoft = (d) => t(`kk.dim.soft.${d}`, _dimLabel(d));
const _rarLabel = (r) => r?.id ? t(`deck.rarity.${r.id}`, r.label) : ''; // K7 köprüsü (12b RARITIES)
const _catLabel = (c) => c?.id ? t(`deck.cat.${c.id}`, c.label) : ''; // K7 köprüsü (12b CATEGORIES)
/* Boyut glyph'leri TEK kaynak: kart detayı, canlı profil ve Oluş yaprağı (10q4)
   aynı dörtlüyü kullanır — ikiz sözlük yazılmaz. */
export const DIM_GLYPH = { dusunceler: '◉', inanclar: '✦', hisler: '❖', davranislar: '⟡' };
/* Yüzde işareti dil-farkı: TR %85 · EN 85% [[tr-en-i18n-tamamlama]] */
const _pct = (n) => (S._currentLang === 'tr' ? `%${n}` : `${n}%`);
const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
const sat = (x, full) => (full <= 0 || typeof x !== 'number' || !isFinite(x) ? 0 : clamp((x / full) * 100));
const wavg = (pairs) => { let s = 0, w = 0; for (const [v, wt] of pairs) { if (typeof v !== 'number' || !isFinite(v)) continue; s += v * wt; w += wt; } return w ? Math.round(clamp(s / w)) : 0; };
const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);
/* Bu gerekçe 2026-08-01'de 112 kart üzerinde ölçülmüştü; deste 08-07'de 12'ye
   indi ve satır on iki gün bayat sayı taşıdı. Sayı bayatsa gerekçe de
   bayattır — aşağıdaki muafiyet yeniden ÖLÇÜLMEDEN güncellenmez. */
/* KOKEN-MUAF: nötr taban, ölçülmüş değer iddiası değil — kart eşleştirmesinde
   tek başına yakınlık ÜRETMEZ. Ölçüldü (2026-08-19, İç Çalışma 04 rev.2):
   hiç sinyali olmayan kullanıcıda kesitin ON İKİ kartının hepsinde
   hazirlik = 0; kkMatchCard üç kapının EN ZAYIF halkasını alır, kanıt ve
   eylem kapıları sıfırdadır. 50 bir sayıya değil boş bir eksene karşılıktır. */
const sc = (o) => (o && typeof o.score === 'number' ? o.score : 50);
/* Tek kaynak: escapeHTML (00a). Eskiden bu modülün kendi ikizi vardı;
   ikizler birbirinden de farklıydı (bir kısmı tek tırnağı kaçırmıyordu). */
const esc = escapeHTML;
function haptic(ms) {
  // His Motoru (13e) varsa native haptiğe yönlendir (iOS dahil); yoksa eski web titreşimi
  try {
    if (window.fxHaptic) {
      const total = Array.isArray(ms) ? ms.reduce((a, b) => a + b, 0) : ms;
      window.fxHaptic(total >= 60 ? 'heavy' : total >= 25 ? 'medium' : 'light');
      return;
    }
  } catch (_) {}
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) {}
}

let _packOpen = false;
let _saveTimer = null;

/* ════════════════════════════════════════════════════════════════════════
   1) SİNYAL TOPLAMA — tüm motorlardan düz sinyal sözlüğü
═══════════════════════════════════════════════════════════════════════════ */
export function kkComputeSignals() {
  const F = S._foundationsProfile || {};
  const D = S._depthProfile || {};
  const RD = S._relationshipDepth || {};
  const sur = S._suretler || [];
  const ga = S._gecisAlani || {};
  const ha = S._hayalAlemi || {};
  const sd = S._selfDialogue || {};
  const rv = S._reviews || {};
  const din = S._dinlenme || {};
  const wg = S._wandererGame || {};

  let belief = { empoweringRatio: 50, count: 0 };
  let choice = { newRatio: 50, count: 0 };
  try { belief = dfGetBeliefStats(); } catch (_) {}
  try { choice = dfGetChoiceStats(); } catch (_) {}

  const reviewsTotal = (rv.day || []).length + (rv.week || []).length + (rv.month || []).length + (rv.year || []).length;
  const dinlenmeCount = (din.achievements || []).length;
  const hayalScenes = (ha.sahneler || []).length;
  const sessions = Object.keys(S.allSessions || {}).length;

  return {
    // Temeller (0-100)
    oz_sevgi: sc(F.oz_sevgi), oz_saygi: sc(F.oz_saygi), oz_deger: sc(F.oz_deger), oz_guven: sc(F.oz_guven), bolluk: sc(F.bolluk),
    // Derinlikler (0-100)
    standart: sc(D.standart), hak_etmek: sc(D.hak_etmek), normal: sc(D.normal), layik: sc(D.layik),
    // İlişki / duygu
    trust: num(RD.trust_score, 0),
    vulnerability: clamp(num(RD.vulnerability_moments, 0) * 12),
    // Davranış sayımları
    streak: num(RD.consecutive_days, 0),
    sessions,
    gecisStreak: num(ga.readingLog && ga.readingLog.streak, 0),
    gecisReadings: num(ga.readingLog && ga.readingLog.totalReadings, 0),
    gecisCards: (ga.cards || []).length,
    selfDialogue: (sd.sessions || []).length,
    reviews: reviewsTotal,
    dinlenme: dinlenmeCount,
    hayalScenes,
    hayalReflection: num(ha.yansimaScore, 0),
    meclisNamed: sur.filter(s => s.hal === 'adlandi' || s.hal === 'butunlesti').length,
    meclisIntegrated: sur.filter(s => s.hal === 'butunlesti').length,
    elmas: num(wg.elmas, 0),
    davranisKanit: (wg.davranisKanitlari || []).length,
    // Türetilmiş
    empoweringRatio: num(belief.empoweringRatio, 50),
    beliefCount: num(belief.count, 0),
    newChoiceRatio: num(choice.newRatio, 50),
    gratitude: dinlenmeCount + hayalScenes,   // şükür/takdir pratiği proxy'si (sayım)
  };
}

/* ── 2) CANLI PROFİL — kullanıcının kendi 4-boyut "Kişi Kartı" ───────────── */
export function kkComputeProfile(sig) {
  sig = sig || kkComputeSignals();
  return {
    dusunceler: wavg([[sig.standart, 1], [sig.normal, 1], [sig.empoweringRatio, 0.6], [sat(sig.selfDialogue, 8), 0.5], [sig.hak_etmek, 0.5]]),
    inanclar:   wavg([[sig.layik, 1.1], [sig.oz_deger, 1], [sig.hak_etmek, 0.8], [sig.empoweringRatio, 0.8], [sig.oz_guven, 0.5]]),
    hisler:     wavg([[sig.oz_sevgi, 1.1], [sig.trust, 0.9], [sig.oz_saygi, 0.6], [sig.vulnerability, 0.4]]),
    davranislar:wavg([[sat(sig.gecisStreak, 10), 1], [sat(sig.reviews, 8), 0.8], [sat(sig.dinlenme, 8), 0.6], [sig.newChoiceRatio, 1], [sat(sig.meclisIntegrated, 4), 0.7], [sat(sig.streak, 14), 0.8]]),
    updatedAt: new Date().toISOString(),
  };
}

/* ── 3) EŞLEŞTİRME — kart reçetesi vs sinyaller ──────────────────────────── */
/* İpucu metinleri i18n'den render anında çözülür. Bilinmeyen sinyal → varsayılan. */
const HINT_KEYS = new Set([
  'gecisStreak', 'streak', 'reviews', 'selfDialogue', 'dinlenme', 'hayalScenes',
  'meclisNamed', 'meclisIntegrated', 'oz_sevgi', 'oz_saygi', 'oz_deger', 'oz_guven', 'bolluk',
  'standart', 'hak_etmek', 'normal', 'layik', 'trust', 'vulnerability', 'newChoiceRatio',
  'empoweringRatio', 'gratitude',
]);
function kkHint(key) { return HINT_KEYS.has(key) ? t(`kk.hint.${key}`) : t('kk.hint._default'); }

function kkEvidence(sig) {
  return num(sig.sessions) + num(sig.gecisReadings) + num(sig.reviews) + num(sig.selfDialogue) + num(sig.dinlenme) + num(sig.meclisNamed) * 3 + num(sig.hayalScenes);
}

/* ── İKNA KAPISI (Emre, 2026-07-28: "4 alanda da ikna olunmadan bir kart
   sunulmasın") ────────────────────────────────────────────────────────────
   Toplam skor bir ORTALAMADIR: tek boyuttan (çoğu zaman davranışlardan)
   beslenen bir kullanıcı eşiği geçip kart önerisi alabiliyordu. Ölçüldü
   (2026-07-28, o günün 112 kartlık destesinde) — davranışı güçlü, iç dünyası
   zayıf bir profilde 112 kartın 78'i öneriye düşüyordu. Bir kişi OLMAK dört
   boyutta birden ayakta olmayı gerektirir; ortalamanın kapattığı boşluk bu
   kapıyla açılır.

   Eşik kartın KENDİ threshold'una oranlıdır, sabit değil: efsane bir kişi
   olmak dört boyutta da daha yüksek ikna ister (58→49 · 76→65). Aynı ölçümde
   dengesiz profil 78→12 kartla (yalnız yaygın) kalır, olgun profil destenin
   tamamını görür — kapı cezalandırmaz, sırayı doğru kurar. */
const IKNA_ORAN = 0.85;

/** Boyutun ikna değeri: reçete o boyutta konuşuyorsa kendi kanıtı, SUSUYORSA
 *  kullanıcının canlı profili. Gerekçe: kartın bir boyutta sinyal istememesi
 *  eksiklik değil, o kartın VURGUSUDUR (yansıma kartı inanç sinyali taşımaz) —
 *  ama vurgu, o boyutun sıfır olabileceği anlamına gelmez. Hiçbir erdem dört
 *  boyutu birden kapsamaz (12b2 VIRTUE_META: her erdem 2-3 boyuta dokunur),
 *  bu yüzden kapı yalnız reçeteye bakarsa HER kart için tanımsız kalırdı. */
function kkIknaHesapla(dims, sig, esik) {
  // Profil kart başına değil TARAMA başına hesaplanır: kkTick destenin tamamını
  // döner, sig nesnesi tur başına tektir. Donmuş sig gelirse yazma sessizce düşer.
  let prof = sig && sig._profil;
  if (!prof) {
    prof = kkComputeProfile(sig);
    try { if (sig) sig._profil = prof; } catch (_) {}
  }
  const ikna = {};
  for (const d of DIMS) ikna[d] = dims[d] != null ? dims[d] : Math.round(num(prof[d], 0));
  const eksik = DIMS.filter(d => ikna[d] < esik);
  return { ikna, eksik, ok: eksik.length === 0 };
}

/* ── HAZIRLIK — üç kapının TEK yüzdesi (Mesafe Motoru · K1) ────────────────
   Kullanıcının gördüğü sayı, kartın gelişiyle AYNI şeyi söylemek zorundadır.
   Kart detayı yıllarca `score`u gösterdi — oysa `score` üç kapıdan yalnız
   BİRİYDİ (reçete ortalaması); kanıt ve dört-boyut ikna kapıları sayının
   dışında kalıyordu. Sonuç: kullanıcı %85 görüp kart alamıyor ya da %72'de
   alıyordu. Sayı yalan söylüyordu.

   Burada üç kapı 0-1 doluluğa çevrilir ve EN ZAYIF HALKA alınır: bir kişi
   olmak zincirin en ince yerinden kopar. Ortalama almak, bir boyutu dipte
   olan kullanıcıya "neredeyse oldun" dedirtirdi — hem yalan hem öğretici
   değil. Minimum ise gösterilen sayıyı hemen altındaki eksikler listesiyle
   aynı şeyi söylemeye zorlar: sayıyı yükseltmenin tek yolu en zayıf tarafı
   güçlendirmektir.

   SÖZLEŞME: `hazirlik === 100` ⟺ `earned === true`. Testle mühürlüdür.
   FLOOR (round DEĞİL): round(100 × 0.996) = 100 olurdu — kapı henüz açık
   değilken %100 göstermek sözleşmeyi kırardı. floor, kapı tam dolmadan
   100'e ulaşmaz; earned iken üç oran da tam 1 olduğundan 100'ü kaçırmaz. */
function kkHazirlik(score, threshold, evidence, minEvidence, ikna, iknaEsik) {
  const g1 = threshold > 0 ? clamp(score / threshold, 0, 1) : 1;
  const g2 = minEvidence > 0 ? clamp(evidence / minEvidence, 0, 1) : 1;
  let g3 = 1;
  if (iknaEsik > 0) {
    for (const d of DIMS) g3 = Math.min(g3, clamp(num(ikna[d], 0) / iknaEsik, 0, 1));
  }
  // Oranlar da dönülür: kkMatchCard bunları YENİDEN hesaplarsa iki kaynak
  // olur ve biri değişince diğeri sessizce kayar (hazırlık ile "en ince
  // yerin" teşhisi farklı kapıyı gösterirdi).
  return { pct: Math.floor(100 * Math.min(g1, g2, g3)), g1, g2, g3 };
}

/** Hazırlığı en çok kısan kapı — "en ince yerin" cümlesinin veri kaynağı.
 *  Döner: { kapi: 'recete'|'kanit'|<boyut adı>, oran } | null (hazır ise). */
export function kkEnZayifHalka(m) {
  if (!m || m.earned) return null;
  const adaylar = [{ kapi: 'recete', oran: m._g1 }, { kapi: 'kanit', oran: m._g2 }];
  for (const d of DIMS) {
    if (m.iknaEsik > 0) adaylar.push({ kapi: d, oran: clamp(num(m.ikna?.[d], 0) / m.iknaEsik, 0, 1) });
  }
  return adaylar
    .filter(a => typeof a.oran === 'number' && isFinite(a.oran))
    .sort((a, b) => a.oran - b.oran)[0] || null;
}

export function kkMatchCard(card, sig) {
  const r = card && card.recipe;
  if (!r || !r.signals || !r.signals.length) {
    return { score: 0, dims: {}, missing: [], earned: false, evidenceOk: false,
             ikna: {}, iknaOk: false, iknaEksik: DIMS.slice(), iknaEsik: 0,
             hazirlik: 0, _g1: 0, _g2: 0 };
  }
  let totalW = 0, got = 0;
  const dimContrib = { dusunceler: [], inanclar: [], hisler: [], davranislar: [] };
  const missing = [];
  for (const s of r.signals) {
    const val = num(sig[s.key], 0);
    const target = s.value || 60;
    const ratio = target <= 0 ? 1 : clamp(val / target, 0, 1);
    const w = s.weight || 1;
    totalW += w; got += ratio * w;
    if (s.dim && dimContrib[s.dim]) dimContrib[s.dim].push(ratio * 100);
    if (ratio < 0.999) missing.push({ key: s.key, need: target, have: Math.round(val), hint: kkHint(s.key) });
  }
  const score = totalW ? Math.round((got / totalW) * 100) : 0;
  const dims = {};
  for (const d of DIMS) dims[d] = dimContrib[d].length ? Math.round(dimContrib[d].reduce((a, b) => a + b, 0) / dimContrib[d].length) : null;
  const evidence = kkEvidence(sig);
  const minEvidence = r.minEvidence || 0;
  const evidenceOk = evidence >= minEvidence;
  const threshold = r.threshold || 70;
  const iknaEsik = Math.round(threshold * IKNA_ORAN);
  const { ikna, eksik: iknaEksik, ok: iknaOk } = kkIknaHesapla(dims, sig, iknaEsik);
  // Üç kapı birden: ortalama yeter mi · yeterince yaşandı mı · DÖRT boyutta
  // birden ikna var mı. Üçüncüsü olmadan kart yalnız "yakın", "olunmuş" değil.
  const earned = score >= threshold && evidenceOk && iknaOk;
  // Aynı üç kapının kullanıcıya gösterilebilir tek yüzdesi (K1) — kapıyı
  // DEĞİŞTİRMEZ, yalnız görünür kılar.
  const h = kkHazirlik(score, threshold, evidence, minEvidence, ikna, iknaEsik);
  return { score, dims, missing, earned, evidenceOk, ikna, iknaOk, iknaEksik, iknaEsik,
           hazirlik: h.pct,
           // en-zayıf-halka teşhisi için kapı oranları (kkEnZayifHalka okur) —
           // hazırlığın hesaplandığı DEĞERLERİN ta kendisi, kopyası değil
           _g1: h.g1, _g2: h.g2 };
}

/* ── deste bölme: SAHİPLİ (açılmış → "Kişilerim") vs SAHİPSİZ (olunabilecek →
   "Kişiler"). Saf fonksiyon — test edilebilir; iki koleksiyon görünümünün ortak
   doğruluk kaynağı. ─────────────────────────────────────────────────────── */
export function kkPartitionDeck(deck, collection) {
  const owned = [], unowned = [];
  const coll = collection || {};
  for (const card of (deck || [])) (coll[card.id] ? owned : unowned).push(card);
  return { owned, unowned };
}

/* ── sahipsiz kartları yakınlığa göre puanla + sırala (en yakın önce) ───────
   Sıra ölçüsü ham `score` DEĞİL `hazirlik`tir: kullanıcıya gösterilen sayı
   odur ve listenin sırası gösterilen sayıyla çelişemez (skoru yüksek ama bir
   boyutu dipte olan kart, gerçekte daha uzaktır). Üstüne niyet ağırlığı
   biner — hedeflediğin kişi öne geçer. Kartın BEDELİ değişmez, yalnız
   görülme sırası değişir (13x K2). */
export function kkScoreAndSort(cards, sig) {
  const ctx = msNiyetCtx(sig);
  return (cards || [])
    .map(card => {
      const m = kkMatchCard(card, sig);
      const niyet = msNiyet(card, ctx);
      return { card, m, niyet, sira: m.hazirlik * niyet };
    })
    .sort((a, b) => (b.sira - a.sira) || (b.m.score - a.m.score));
}

/* ════════════════════════════════════════════════════════════════════════
   EVRİM ÇİZGİLERİ + MERTEBE (K3 · Üç Usta planı)
   ─────────────────────────────────────────────────────────────────────────
   FELSEFE: Pokémon'un evrimi aynı varlığın DERİNLEŞMESİDİR — kart değişmez,
   büyür. Destede beş hat zaten kurulu (temel-<erdem>-filiz/kok/tac); burada
   mekanikleşir: üst kademe kazanılırken alt kademe sahipse paket değil
   EVRİM töreni oynar ("aynı tohum, daha derin toprak").
   Mertebe, Yu-Gi-Oh'un seviye yıldızının karşılığı — ama ATK/DEF yok:
   ölçülen şey savaş gücü değil KÖK derinliğidir. Kart kazanıldıktan sonra
   kanıt birikmeye devam eder; mertebe o birikimin görünür hâlidir ve
   YALNIZ YÜKSELİR (13l histerezis dersi: bir gün zayıf geçti diye kökün
   sığlaşmaz).
═══════════════════════════════════════════════════════════════════════════ */
const KADEME = ['filiz', 'kok', 'tac'];

// Saf fonksiyon — kart id'sinden hattı çıkarır (deste verisine meta eklenmedi:
// hat bilgisi id'de zaten var, tek kaynak orası kalsın).
export function kkEvrim(cardId) {
  const m = /^(.+)-(filiz|kok|tac)$/.exec(String(cardId || ''));
  if (!m) return null;
  const hat = m[1], i = KADEME.indexOf(m[2]);
  return {
    hat, kademe: m[2], sira: i + 1,
    onceki: i > 0 ? `${hat}-${KADEME[i - 1]}` : null,
    sonraki: i < KADEME.length - 1 ? `${hat}-${KADEME[i + 1]}` : null,
  };
}

// Kartın kökeni: "⟵ ÖZ SEVGİ · FİLİZ" (iyelik eki YOK — TR/EN'de dilbilgisi
// kırılmasın; ok işareti "buradan geldim" der).
function kkEvrimEtiketi(onceki) {
  if (!onceki) return '';
  const ev = kkEvrim(onceki);
  const prev = getCardById(onceki);
  // Deste henüz inmemişse (sidecar) yarım etiket ("⟵ FİLİZ") basmaktansa hiç
  // basma — köken bir sonraki render'da tam görünür.
  if (!ev || !prev || !prev.sub) return '';
  const kad = t(`kk.kademe.${ev.kademe}`, ev.kademe.toUpperCase());
  return `⟵ ${String(prev.sub).toLocaleUpperCase('tr')} · ${kad}`;
}

const MERTEBE_ESIK = [70, 80, 88, 96];   // 1 → 2 → 3 → 4 → 5
export function kkMertebeOf(score) {
  let m = 1;
  for (const e of MERTEBE_ESIK) { if (num(score) >= e) m++; }
  return m;
}

/** Kartın sahnesi CANLI mı çizilecek (Hearthstone'un altın kartı)?
 *  Ölçüt derinliktir, şans değil: EFSANE nadirlik ya da kökü tam dolmuş
 *  (mertebe 5) bir kart. Sahiplik şart — kilitli kart yaşamaz, henüz senin
 *  değil. Canlılık bir ÖDÜL değil bir NİŞANEDİR: hiçbir sayıyı değiştirmez. */
export function kkAltinMi(card) {
  if (!card) return false;
  const rec = S._kisiKarti?.collection?.[card.id];
  if (!rec) return false;
  return card.rarity === 'efsane' || (rec.mertebe | 0) >= 5;
}

/* ════════════════════════════════════════════════════════════════════════
   SENTEZ (K4 · Üç Usta planı) — "iki kişiyi önce tek tek ol, sonra birleştir"
   ─────────────────────────────────────────────────────────────────────────
   FELSEFE: Yu-Gi-Oh'un füzyonu malzeme ister — iki kart sahada olmadan
   üçüncüsü doğmaz. Bileşik kartlar zaten iki erdemin çifti olarak üretiliyor
   (12b2 `bilesik-<v1>-<v2>`), yani füzyon reçetesi kartın kimliğinde kayıtlı.
   Burası o kaydı MEKANİĞE çevirir: reçete tutsa bile, iki erdemin tek-tek
   kartlarına sahip olmadan bileşik kart verilmez. Anlamı kitabın kendi
   cümlesi: bileşik bir insan, iki niteliği ayrı ayrı yaşamış olandır.
═══════════════════════════════════════════════════════════════════════════ */
// Saf: bileşik kartın id'sinden iki erdemi çıkarır (tek kaynak id).
export function kkSentezMalzeme(cardId) {
  const m = /^bilesik-([a-z]+)-([a-z]+)$/.exec(String(cardId || ''));
  return m ? { v1: m[1], v2: m[2] } : null;
}

// Bir erdemin koleksiyondaki TEMSİLCİSİ: o erdeme ait sahipli kartların en
// derini (nadirlik sırası, eşitlikte mertebe). Bileşik kartlar malzeme olamaz —
// sentez sentezden değil, tek tek yaşanmış niteliklerden doğar.
export function kkErdemTemsilcisi(virtue, collection) {
  const coll = collection || {};
  let best = null, bestKey = -1;
  for (const c of getFullDeck()) {
    if (c.virtue !== virtue || c.category === 'bilesik') continue;
    const own = coll[c.id];
    if (!own) continue;
    const key = ((RARITIES[c.rarity] || {}).order || 0) * 10 + (own.mertebe || 1);
    if (key > bestKey) { bestKey = key; best = c; }
  }
  return best;
}

/* Sentez durumu — bileşik olmayan kartta null (guard'lar bu null'a bakar).
   { v1, v2, kart1, kart2, hazir, eksikErdemler[] } */
export function kkSentezDurum(card, collection) {
  const mal = kkSentezMalzeme(card && card.id);
  if (!mal) return null;
  const kart1 = kkErdemTemsilcisi(mal.v1, collection);
  const kart2 = kkErdemTemsilcisi(mal.v2, collection);
  const eksikErdemler = [];
  if (!kart1) eksikErdemler.push(mal.v1);
  if (!kart2) eksikErdemler.push(mal.v2);
  return { v1: mal.v1, v2: mal.v2, kart1, kart2, hazir: !eksikErdemler.length, eksikErdemler };
}

/* ════════════════════════════════════════════════════════════════════════
   PANZEHİR (K6 · Üç Usta planı) — "ışık kazanılır, dayatılmaz"
   ─────────────────────────────────────────────────────────────────────────
   FELSEFE: INWO'da her grubun bir hizalanması vardır ve ZIT hizalanma
   saldırıyı kolaylaştırır — kutupluluk mekaniktir. O mekaniği alıyoruz ama
   savaş dilini bırakıyoruz: gölge kartına saldırılmaz, gölgenin PANZEHRİ
   bulunur. Kitabın kendi cümlesi: "Öfke, dürüstlüğün ham hâlidir."
   EN GÜZEL KEŞİF: kutup verisi zaten destedeydi — her golge/perde/tuzak
   kartının `virtue` alanı, o gölgenin panzehri olan erdemi taşıyor
   (golge-kizginlik → durust, golge-erteleme → odak). Yeni meta yazılmadı.
   MEKANİK: gölge kartı sende + aynı erdemin gölge-olmayan bir kartı da
   sende → panzehir mührü açılır. Gölgeyi tanımak birinci adım, ona karşı
   ışığı elde tutmak ikincisi.
═══════════════════════════════════════════════════════════════════════════ */
const GOLGE_KATEGORI = new Set(['golge', 'perde', 'tuzak']);

/* { erdem, kart, acik } | null (gölge olmayan kartta null). */
export function kkPanzehir(card, collection) {
  if (!card || !GOLGE_KATEGORI.has(card.category) || !card.virtue) return null;
  const coll = collection || {};
  let best = null, bestKey = -1;
  for (const c of getFullDeck()) {
    // Panzehir başka bir gölge olamaz; sentez de panzehir sayılmaz (o zaten
    // iki erdemin bileşiği — ışık tek ve saf tutulur).
    if (c.virtue !== card.virtue || GOLGE_KATEGORI.has(c.category) || c.category === 'bilesik') continue;
    const own = coll[c.id];
    if (!own) continue;
    const key = ((RARITIES[c.rarity] || {}).order || 0) * 10 + (own.mertebe || 1);
    if (key > bestKey) { bestKey = key; best = c; }
  }
  return { erdem: card.virtue, kart: best, acik: !!best };
}

/* Yeni açılan panzehirleri mühürler; İDEMPOTENT. Mühürlenen gölge id'lerini
   döner — yalnız İKİSİ DE sahipli olduğunda (gölge tanındı + ışık elde). */
export function kkDetectPanzehir(kk) {
  if (!kk || !kk.collection) return [];
  if (!kk.panzehirler) kk.panzehirler = {};
  const yeni = [];
  for (const id of Object.keys(kk.collection)) {
    if (kk.panzehirler[id]) continue;
    const card = getCardById(id);
    const pz = card ? kkPanzehir(card, kk.collection) : null;
    if (pz && pz.acik) {
      kk.panzehirler[id] = { at: new Date().toISOString(), erdemKartId: pz.kart.id };
      yeni.push(id);
    }
  }
  return yeni;
}

/* ════════════════════════════════════════════════════════════════════════
   EMEL + DÖNEM KARTI (K7 · Üç Usta planı) — INWO'nun goal ve NWO kartları
   ─────────────────────────────────────────────────────────────────────────
   FELSEFE: INWO'da iki tür "gündem" vardır — kişisel Goal kartı (senin
   zafer koşulun) ve masada açık duran NWO kartı (o anki dünyanın kuralı).
   Bizde: EMEL bir KÜMEYE bakan kişisel hedeftir (Hedef Mührü tek karta
   bakar) — kullanıcı SEÇER, dayatılmaz. DÖNEM KARTI ise haftanın gündemi:
   en zayıf erdemin öne çıkması. Kritik sınır: dönem hiçbir REÇETEYE ya da
   sinyal ağırlığına dokunmaz — motorun matematiği kutsaldır, değişen
   yalnız GÖRÜNÜRLÜK önceliğidir.
═══════════════════════════════════════════════════════════════════════════ */
const KK_EMEL_ELMAS = 25;   // aile mührünün (40) üstüne, seçilmiş olmanın payı

/* Emelin ARA DURAKLARI (Hearthstone görev zinciri): 31 kartlık bir aile tek
   eşikle yaşamaz — yol uzunsa kilometre taşı gerekir. Eşikler TÜRETİLİR,
   sabit liste yoktur: 4 kartlık aile ile 31 kartlık aile aynı merdiveni
   paylaşamaz. Küçük ailede alt basamaklar kendiliğinden düşer. */
export function kkEmelKademeler(total) {
  const n = Math.max(0, total | 0);
  if (!n) return [];
  const set = new Set([3, Math.ceil(n / 2), n].filter(x => x >= 1 && x <= n));
  return [...set].sort((a, b) => a - b);
}

/* Emel bir aile (kitap çerçevesi) üzerinedir: 'aile:<cat>'. */
export function kkEmelDurum(cat, collection) {
  const d = kkAileDurum(collection)[cat];
  if (!d) return null;
  const kademeler = kkEmelKademeler(d.total);
  return { cat, owned: d.owned, total: d.total, tam: d.tam,
           pct: d.total ? Math.round((d.owned / d.total) * 100) : 0,
           kademeler, kademe: kademeler.filter(n => d.owned >= n).length };
}

export function kkEmelSec(cat) {
  const kk = S._kisiKarti;
  if (!kk || !CATEGORIES[cat]) return false;
  if (!kk.emeller) kk.emeller = {};
  // Tamamlanmış aile emel olamaz — emel ileriye bakar.
  const d = kkEmelDurum(cat, kk.collection);
  if (!d || d.tam) return false;
  if (kk.emeller[cat]) { delete kk.emeller[cat]; }     // ikinci dokunuş bırakır
  // Kademe emelin SEÇİLDİĞİ ANDAN sayılır: elindeki kartlarla çoktan geçilmiş
  // basamaklar kutlanmaz. Emel geriye değil ileriye bakar.
  else kk.emeller[cat] = { at: new Date().toISOString(), kademe: d.kademe | 0 };
  kkSaveDebounced();
  try { window.fxCue?.('tap'); } catch (_) {}
  return true;
}

/* Emelde yeni bir ara durak geçildi mi? Kaydı günceller, geçilenleri döndürür.
   TAM olan buraya girmez — o `kkDetectEmelCompletion`'ın işidir (çifte kutlama
   olmaz). Çağıran kutlamaya karar verir: kkTick'in ilk taraması SESSİZ işler. */
export function kkDetectEmelKademe(kk) {
  if (!kk || !kk.emeller) return [];
  const yeni = [];
  for (const cat of Object.keys(kk.emeller)) {
    const d = kkEmelDurum(cat, kk.collection);
    if (!d || d.tam) continue;
    const onceki = kk.emeller[cat].kademe | 0;
    if (d.kademe > onceki) {
      kk.emeller[cat].kademe = d.kademe;
      yeni.push({ cat, kademe: d.kademe, toplam: d.kademeler.length });
    }
  }
  return yeni;
}

/* Emel tamamlandıysa ödüllendirir; İDEMPOTENT (emel kaydı silinir). */
export function kkDetectEmelCompletion(kk) {
  if (!kk || !kk.emeller) return [];
  const yeni = [];
  for (const cat of Object.keys(kk.emeller)) {
    const d = kkEmelDurum(cat, kk.collection);
    if (d && d.tam) { delete kk.emeller[cat]; yeni.push(cat); }
  }
  return yeni;
}

/* ════════════════════════════════════════════════════════════════════════
   SIRTLAR — "destenin dışı da senin"
   ─────────────────────────────────────────────────────────────────────────
   FELSEFE: koleksiyon neyi topladığını gösterir; SIRT neyi geçtiğini. Her
   sırt bir eşiğin kaydıdır ve yalnız KAZANILIR — Elmas'la alınmaz, çünkü
   satın alınan bir iz, iz değildir. Kartın kendisi hangi sırtı taşıdığını
   bilmez: sırt destenin tamamına aittir (12c ikvCardBack tek kapı).
   Kalıcılık: S._kisiKarti.sirtlar / .sirtSecili → `yapi` JSONB blobu.
═══════════════════════════════════════════════════════════════════════════ */
const _sirtAd = (id) => t(`kk.sirt.ad.${id}`, (SIRTLAR[id] && SIRTLAR[id].ad) || id);

export function kkSirtSecili() {
  const kk = S._kisiKarti;
  const id = kk && kk.sirtSecili;
  return (id && SIRTLAR[id] && kkSirtSahip(id)) ? id : 'fener';
}

/** Fener herkeste vardır — deste sırtsız kalmaz. */
export function kkSirtSahip(id) {
  if (id === 'fener') return true;
  const kk = S._kisiKarti;
  return !!(kk && kk.sirtlar && kk.sirtlar[id]);
}

/** Sırt kazanımı — İDEMPOTENT. Törenin içinden tek satırla çağrılır;
 *  kendi töreni YOKTUR: o an zaten bir tören oynuyor (set tamamlama, mühür,
 *  kilometre) ve üstüne ikinci bir perde açmak ikisini birden ucuzlatır. */
export function kkSirtKazan(id) {
  const kk = S._kisiKarti;
  if (!kk || !SIRTLAR[id] || id === 'fener') return false;
  if (!kk.sirtlar) kk.sirtlar = {};
  if (kk.sirtlar[id]) return false;
  kk.sirtlar[id] = { at: new Date().toISOString() };
  kkSaveDebounced();
  try {
    showToast(t('kk.sirt.kazan', 'Yeni bir sırt: {ad}.').replace('{ad}', _sirtAd(id)));
    window.fxCue?.('nisan');
  } catch (_) {}
  return true;
}

export function kkSirtSec(id) {
  const kk = S._kisiKarti;
  if (!kk || !SIRTLAR[id] || !kkSirtSahip(id)) return false;
  kk.sirtSecili = id;
  kkSaveDebounced();
  try { window.fxCue?.('tap'); } catch (_) {}
  return true;
}

/* ── DÖNEM KARTI — haftanın gündemi. En zayıf erdem öne çıkar; hafta boyunca
   SABİT kalır (gündem gün içinde savrulmaz). Hafta anahtarı pazartesi-tabanlı
   ve YEREL (localISODate) — toISOString UTC'dir, TR'de günü kaydırır. ── */
export function kkDonemHafta(date) {
  const d = date !== undefined ? new Date(date) : new Date();
  const day = d.getDay();                       // 0=Pazar..6=Cumartesi
  const monday = new Date(d);
  monday.setDate(d.getDate() + ((day === 0 ? -6 : 1) - day));
  return localISODate(monday);
}

export function kkDonemErdem() {
  const kk = S._kisiKarti;
  if (!kk) return null;
  const wk = kkDonemHafta();
  if (kk.donem && kk.donem.weekKey === wk) return kk.donem;

  // Kaynak: 13l erdem vektörü — EN ZAYIF erdem haftanın gündemi olur.
  // Motor yoksa (henüz init değil) hafta numarasına göre sessiz rotasyon.
  let virtue = null;
  try {
    const vec = window.imVirtueNow?.();
    if (vec) {
      const pairs = Object.entries(vec).filter(([, v]) => typeof v === 'number');
      if (pairs.length) virtue = pairs.sort((a, b) => a[1] - b[1])[0][0];
    }
  } catch (_) {}
  if (!virtue) {
    const pool = [...new Set(getFullDeck().map(c => c.virtue).filter(Boolean))].sort();
    if (!pool.length) return null;
    const wkNum = Math.floor(new Date(wk).getTime() / (7 * 86400000));
    virtue = pool[Math.abs(wkNum) % pool.length];
  }

  // O erdemin EN YAKIN sahipsiz kartı — gündemin somut yüzü. Malzemesi
  // eksik bir bileşik kart gündem OLAMAZ: bu hafta çalışsan da kazanamazsın,
  // gündem ulaşılabilir olmalı (K4 sentez ön koşuluyla tutarlı).
  let cardId = null;
  try {
    const sig = kkComputeSignals();
    const aday = getFullDeck().filter(c => {
      if (c.virtue !== virtue || kk.collection[c.id]) return false;
      const sz = kkSentezDurum(c, kk.collection);
      return !sz || sz.hazir;
    });
    const sorted = kkScoreAndSort(aday, sig);
    cardId = sorted.length ? sorted[0].card.id : null;
  } catch (_) {}

  kk.donem = { weekKey: wk, virtue, cardId };
  kkSaveDebounced();
  return kk.donem;
}

/* ── AİLE MÜHRÜ (K4) — Yu-Gi-Oh arketipi: aynı aileden kartlar birbirini çağırır
   Aile = kategori (kitabın çerçevesi). Bir ailenin TÜM kartları sahipliyse
   mühür düşer. Tören YOK — o an zaten bir kart töreni (paket/evrim/sentez)
   oynuyor; üstüne ikinci tören yığmak töreni değersizleştirir. Mühür kalıcı
   rozet + Elmas olarak durur.  ─────────────────────────────────────────── */
const KK_AILE_ELMAS = 40;

export function kkAileDurum(collection) {
  const coll = collection || {};
  const out = {};
  for (const c of getFullDeck()) {
    const a = out[c.category] || (out[c.category] = { total: 0, owned: 0, tam: false });
    a.total++;
    if (coll[c.id]) a.owned++;
  }
  for (const k of Object.keys(out)) out[k].tam = out[k].total > 0 && out[k].owned === out[k].total;
  return out;
}

// Yeni tamamlanan aileleri mühürler; İDEMPOTENT (bir kez `at` yazılır).
// Yeni mühürlenen kategori id'lerini döner — caller Elmas'ı öder.
export function kkDetectAileCompletion(kk) {
  if (!kk || !kk.collection) return [];
  if (!kk.aileler) kk.aileler = {};
  const yeni = [];
  for (const [cat, d] of Object.entries(kkAileDurum(kk.collection))) {
    if (d.tam && !kk.aileler[cat]) {
      kk.aileler[cat] = { at: new Date().toISOString(), total: d.total };
      yeni.push(cat);
    }
  }
  return yeni;
}

/* ── durum yükseltme (asla düşürme) → 12a ekranlarını da besler ──────────── */
// 'esikte' mühürden ÖNCE gelir: reçete tuttu ama kullanıcı henüz beyan etmedi
// (Oluş Mührü). Yalnız yükselir — bir kart esikteyken bile 'reachable'a
// düşürülemez.
const STATE_RANK = { locked: 0, sis: 1, fog: 1, reachable: 2, current: 2, esikte: 3, sealed: 4 };
// durumu yükseltir; gerçekten değiştiyse true döner (kirli-izleme için)
function kkRaiseState(id, newState) {
  if (!S._archetypes) S._archetypes = {};
  if (!S._archetypes[id]) S._archetypes[id] = {};
  const cur = S._archetypes[id].state;
  if ((STATE_RANK[newState] || 0) > (STATE_RANK[cur] || 0)) { S._archetypes[id].state = newState; return true; }
  return false;
}

/* ════════════════════════════════════════════════════════════════════════
   4) TICK — yeniden hesapla, reçetesi tutan kartı EŞİK HAVUZUNA düşür
   ─────────────────────────────────────────────────────────────────────────
   Oluş Mührü (K1): kkTick artık kazanmaz, YALNIZ ÖLÇER. Reçetesi tutan kart
   `collection`'a değil `kk.esik`'e düşer — Wanderer burada "bunu önerebilirim"
   der, kartın SAHİBİ olmaz. `collection`'ın tek yazarı `kkMuhurle`dir (K2) —
   kullanıcının beyanı olmadan hiçbir kart oraya girmez.
═══════════════════════════════════════════════════════════════════════════ */
export function kkTick(opts) {
  opts = opts || {};
  const now = Date.now();
  const kk = S._kisiKarti;
  if (!kk) return;
  if (!opts.force && now - (kk.lastTick || 0) < 700) return; // debounce
  kk.lastTick = now;

  // kirli-izleme: hiçbir şey değişmediyse kalıcılığı (IndexedDB + Supabase) atla.
  // kkTick boşta-döngü (4sn), her mesaj ve görünürlük değişiminde çağrılır; koşulsuz
  // kaydetmek açık sekmede saatte yüzlerce gereksiz yazma/senkron üretiyordu.
  const prev = kk.profile || {};
  let dirty = false;

  const sig = kkComputeSignals();
  kk.profile = kkComputeProfile(sig);
  // İkna kapısının (kkIknaHesapla) reçete-susan boyutlar için okuduğu profil
  // BUDUR — memoize'ı burada doldurmak deste taramasında ikinci bir
  // profil hesabını tamamen keser.
  try { sig._profil = kk.profile; } catch (_) {}
  if (kk.profile.dusunceler !== prev.dusunceler || kk.profile.inanclar !== prev.inanclar ||
      kk.profile.hisler !== prev.hisler || kk.profile.davranislar !== prev.davranislar) dirty = true;

  const deck = getFullDeck();
  let bestUncollected = null;
  let bestSira = -1;
  // MESAFE MOTORU (13x) girdisi — yalnız SAHİPSİZ kartlar ölçülür: olunmuş
  // kişiyle arandaki mesafe kapanmıştır, ortalamayı şişirmesi yanlış olurdu.
  // Niyet bağlamı tarama başına BİR kez çözülür (13x msNiyetCtx memoize'ı).
  const msCtx = msNiyetCtx(sig);
  const msGirdi = [];

  for (const card of deck) {
    const m = kkMatchCard(card, sig);
    const already = !!kk.collection[card.id];
    const niyet = already ? 0 : msNiyet(card, msCtx);
    // "En yakın" artık ham skorla değil HAZIRLIK'la seçilir (kullanıcıya
    // gösterilen sayı odur) ve niyetle ağırlıklanır — hedeflediğin kişi,
    // rastgele yakın düştüğün kişinin önüne geçer.
    const sira = m.hazirlik * niyet;
    if (!already) msGirdi.push({ cardId: card.id, hazirlik: m.hazirlik, niyet });
    // Eşikte bekleyen kart tekrar işlenmez — beyan (kkMuhurle) ya da red
    // gelene kadar bu turdan çıkar (K3: havuz collection'a asla yazmaz).
    if (kk.esik && kk.esik[card.id]) continue;

    // K4 — SENTEZ ÖN KOŞULU: reçete tutsa bile iki malzeme sendeyken doğar.
    // Kart kaybolmaz, BEKLER: erişilebilir sayılır ve eksik malzeme near-miss
    // olarak gösterilir (kullanıcı neyi beklettiğini görür, ölü içerik olmaz).
    if (m.earned && !already) {
      const sz = kkSentezDurum(card, kk.collection);
      if (sz && !sz.hazir) {
        if (kkRaiseState(card.id, 'reachable')) dirty = true;
        if (sira > bestSira) {
          bestSira = sira;
          bestUncollected = {
            cardId: card.id, score: m.score, hazirlik: m.hazirlik, niyet,
            missing: [{ key: 'sentez', need: 2, have: 2 - sz.eksikErdemler.length, hint: t('kk.sentez.hint', 'bu iki niteliği önce tek tek yaşamalısın') }],
          };
        }
        continue;
      }
    }

    // K1 — reçete tuttu: EŞİK HAVUZUNA düşer, koleksiyona değil.
    // (Havuzda olan kart yukarıda `continue` ile elendi — burada tekrar bakılmaz.)
    if (m.earned && !already) {
      if (!kk.esik) kk.esik = {};
      kk.esik[card.id] = { at: new Date().toISOString(), skor: m.score,
                           dims: m.dims, davet: 0, sonDavet: null, red: [] };
      kkRaiseState(card.id, 'esikte');
      dirty = true;
    } else if (already) {
      // MERTEBE — kazanımdan sonra da kanıt birikir; yalnız yükselir.
      const mert = kkMertebeOf(m.score);
      if (mert > (kk.collection[card.id].mertebe || 1)) {
        kk.collection[card.id].mertebe = mert;
        dirty = true;
      }
    } else if (!already) {
      // durum yükseltme + en-yakın kart (near-miss nudge)
      if (m.score >= 60) { if (kkRaiseState(card.id, 'reachable')) dirty = true; }
      else if (m.score >= 28) { if (kkRaiseState(card.id, 'sis')) dirty = true; }
      if (sira > bestSira) {
        bestSira = sira;
        bestUncollected = { cardId: card.id, score: m.score, hazirlik: m.hazirlik, niyet,
                            missing: m.missing.slice(0, 2) };
      }
    }
  }

  // Ana Mesafe — iki kutup arasındaki tek sayı (13x). Taramanın topladığı
  // hazırlık+niyet girdilerinden doğar; ikinci bir tarama yapılmaz.
  try { msHesapla(msGirdi, sig); } catch (_) {}

  const prevClosest = kk.closest;
  if ((prevClosest && prevClosest.cardId) !== (bestUncollected && bestUncollected.cardId) ||
      (prevClosest && prevClosest.score) !== (bestUncollected && bestUncollected.score) ||
      (prevClosest && prevClosest.hazirlik) !== (bestUncollected && bestUncollected.hazirlik)) dirty = true;
  kk.closest = bestUncollected;

  if (dirty) {
    kkSaveDebounced();
    // 12a zaten import ediliyor — window köprüsü hiç kurulmamıştı, yani bu
    // çağrı sessizce hiçbir şey yapmıyordu ve arketip ilerlemesi diske
    // yazılmıyordu. Köprü kurmak yerine doğrudan çağır: bağ zaten var.
    try { _saveArchetypeProgress(); } catch (_) {}
  }

  // PANZEHİR + AİLE MÜHRÜ — İLK TARAMA dalı: legacy koleksiyonda zaten
  // tamamlanmış olanları sessizce mühürler, ÖDEME YAPMAZ (canlı mühür ödemesi
  // artık kkMuhurle'nin işi — K2). `!kk.panzehirler`/`!kk.aileler` yalnız BİR
  // KEZ true olur (Detect* fonksiyonları kendi kendine {} açar) — bu yüzden
  // bu dal ikinci tick'te bir daha çalışmaz.
  if (!kk.panzehirler) {
    const yeniPanzehir = kkDetectPanzehir(kk);
    if (yeniPanzehir.length) {
      dirty = true;
      try { kk.panzehirSayac = Object.keys(kk.panzehirler).length; } catch (_) {}
    }
  }
  if (!kk.aileler) {
    const yeniAileler = kkDetectAileCompletion(kk);
    if (yeniAileler.length) {
      dirty = true;
      kkDetectEmelCompletion(kk); // sessiz mühür — ödeme yalnız kkMuhurle'nin canlı mühründe
    }
  }
  // Emel kademeleri de SESSİZ hizalanır: başka cihazda kazanılmış kartlar
  // buraya geldiğinde kilometre taşı toast'ı patlatmamalı — kutlama yalnız
  // canlı mühürde yaşar (aile/panzehir ödemesiyle aynı gerekçe).
  try { if (kkDetectEmelKademe(kk).length) dirty = true; } catch (_) {}

  // MEZUNİYET — hedeflenen bir kişi artık OLUNDU. Mühür düşer: kart lapis
  // desteden çıkar, altın desteye geçer. Kazanımın hangi yoldan geldiğine
  // BAKMAYAN bir uzlaştırma taramasıdır: `kkMuhurle` kendi kartını anında
  // düşürür (K2), burası başka cihazda kazanılıp `kkSyncFromSupabase` ile
  // gelen ya da backfill'den dönen durumları yakalar — idempotent, YALNIZ
  // OKUR (`collection`'a asla yazmaz, K3 ihlali değildir).
  // OİK kartına işlenmiş maddeler ÇEKİLMEZ: o kişiyi hedeflerken yazdıkların
  // artık senin parçandır; geri alma yalnız mühür elle sökülünce (kkHedefSok).
  if (kk.hedefler) {
    let mezun = 0;
    for (const id of Object.keys(kk.hedefler)) {
      if (kk.collection[id]) { delete kk.hedefler[id]; mezun++; }
    }
    if (mezun) { kkSaveDebounced(); try { window.yolRenderHero?.(); } catch (_) {} }
  }

  // Kimlik Motoru (13l) — canlı kazanım devri artık burada olmaz (imOnCardEarned
  // kkMuhurle'den çağrılır); profil değiştiyse kimliği sessizce yeniden çöz.
  if (dirty) {
    try { window.imResolve && window.imResolve({ quiet: true }); } catch (_) {}
  }

  // canlı kart açıksa güncelle
  if (document.getElementById('kisilerim-body') && document.getElementById('kisilerim-view')?.classList.contains('active')) {
    try { kkRenderButunlukHeader(); } catch (_) {}
  }

  // Açık boy kartın canlı ölçümü (K6). Ayrı zamanlayıcı KURULMAZ: kkTick zaten
  // 4sn idle + visibilitychange + her kullanıcı mesajıyla dönüyor, ikinci bir
  // nabız kurmak aynı ölçümü iki kez saydırırdı. Detay kapalıysa fonksiyon
  // kendi guard'ında sessizce düşer — burada koşul aramıyoruz.
  try { _kkDetayCanli(); } catch (_) {}
}

/* ════════════════════════════════════════════════════════════════════════
   4b) OLUŞ MÜHRÜ — kazanımın TEK kapısı (K2 · "kart dağıtılmaz, beyan edilir")
   ─────────────────────────────────────────────────────────────────────────
   FELSEFE: kkTick artık yalnız ÖLÇER — reçetesi tutan kart eşik havuzuna
   düşer, Wanderer'ın ÖNERİSİ olur. Kartın SAHİBİ olma kararı burada,
   kullanıcının beyanıyla düşer. `collection`'ın repo genelinde yirmiden
   fazla tüketicisi var (owned, kkPartitionDeck, kkSentezDurum, aile/panzehir
   taramaları, porCardRefs, Benlik Yapısı, İki Kişi Bir Deste, 13l kimlik…) —
   bu yüzden `kkMuhurle` TEK YAZARDIR; eşik havuzu collection'a asla doğrudan
   yazmaz (K3).
   MEKANİK: kkTick'in eskiden `earnedThisTick` ile dağıttığı zincir (portre
   besleme, panzehir, aile+emel, mezuniyet, kimlik devri, Studio senkronu)
   tek çağrıda toplanır. `opts.yol` kartın nasıl mühürlendiğini taşır —
   'davet' (FAZ 1), 'sinama' (FAZ 3); FAZ 1 öncesi bu fazda yalnız birim
   testlerinden çağrılır (tören yüzeyi FAZ 0'ın kapsamı dışında).
═══════════════════════════════════════════════════════════════════════════ */
/** Kartı mühürle — "artık o kişisin". Kazanımın TEK yazarı; idempotent
 *  (zaten sahipse false döner). Döner: mühürlendi mi. */
export function kkMuhurle(cardId, opts) {
  opts = opts || {};
  const kk = S._kisiKarti;
  const card = getCardById(cardId);
  if (!kk || !card || kk.collection[cardId]) return false;
  const e = (kk.esik && kk.esik[cardId]) || {};

  kk.collection[cardId] = {
    earnedAt: new Date().toISOString(), rarity: card.rarity,
    dims: e.dims || {}, score: e.skor || 0,
    muhur: { at: new Date().toISOString(), yol: opts.yol || 'davet' },
  };
  kk.history.push({ cardId, at: new Date().toISOString(), rarity: card.rarity });
  kkRaiseState(cardId, 'sealed');
  if (kk.esik) delete kk.esik[cardId];

  // Portre 2.0 (02c) — kazanılan kartın bildikleri "Olunan [Ad]"a işlenir.
  // SIRA KRİTİK: mezuniyetten (hedefler'den silmeden) ÖNCE — ters sırada
  // oikCardRefs() bir an boşalır ve Benlik Yapısı açıksa kartı kaybeder
  // ([[olunan-ve-niyet-alinan-karari]] dersi).
  try { const n = window.porAbsorbCard?.(card) || 0; if (n) kk.collection[cardId].porAbsorbed = n; } catch (_) {}

  // MEZUNİYET — hedefteyse mühür ANINDA düşer (hedef → olunan). kkTick'teki
  // genel tarama bunu yine yakalar (başka cihazda/backfill'de kazanılan
  // kartlar için) — burada beklemeden düşürmek yalnız törenin sırasını erken tutar.
  if (kk.hedefler && kk.hedefler[cardId]) delete kk.hedefler[cardId];

  // PANZEHİR + AİLE + EMEL — CANLI KAZANIM anı: ödeme YALNIZ burada yapılır.
  // kkTick'in ilk-tarama dalı sessizdir (ödemesiz); ikinci cihazda tekrar
  // ödenmez çünkü mühür zaten oradan da senkronlanır (K3 aile/panzehir gerekçesi).
  try {
    const yeniPanzehir = kkDetectPanzehir(kk);
    if (yeniPanzehir.length) {
      for (const gid of yeniPanzehir) {
        const g = getCardById(gid);
        const p = kk.panzehirler[gid];
        const ilac = p && getCardById(p.erdemKartId);
        if (!g || !ilac) continue;
        try {
          showToast(`✦ ${t('kk.panzehir.toast', '{golge} gölgesinin panzehri sende: {isik}')
            .replace('{golge}', g.name).replace('{isik}', ilac.name)}`);
          window.fxCue?.('seal');
        } catch (_) {}
      }
      try { kk.panzehirSayac = Object.keys(kk.panzehirler).length; } catch (_) {}
    }
  } catch (_) {}
  // EMELİN ARA DURAKLARI — yol uzunsa kilometre taşı görünür olmalı. Kendi
  // TÖRENİ YOKTUR: bu an zaten bir tören oynuyor (davet/evrim/sentez) ve
  // üstüne ikinci bir perde açmak ikisini birden ucuzlatırdı; toast + gong
  // yeter. Elmas YOK — ödeme yalnız emelin TAMAMINDA (aşağıda).
  try {
    for (const k of kkDetectEmelKademe(kk)) {
      const CAT = CATEGORIES[k.cat] || {};
      const metin = k.kademe === 1
        ? t('kk.emel.kademe1', 'Üçü bir araya geldi.')
        : t('kk.emel.kademe2', 'Yarıyı geçtin.');
      try {
        showToast(`${CAT.glyph || '✦'} ${_catLabel(CAT)} — ${metin}`);
        window.fxCue?.('milestone2');
      } catch (_) {}
    }
  } catch (_) {}

  try {
    const yeniAileler = kkDetectAileCompletion(kk);
    if (yeniAileler.length) {
      // Sıra önemli: emel tespiti mühürden SONRA, ödeme aile ödemesiyle aynı
      // pencerede (ikinci cihazda tekrar ödenmesin — aile mührüyle aynı gerekçe).
      const tamamlananEmeller = kkDetectEmelCompletion(kk);
      for (const cat of tamamlananEmeller) {
        try { awardElmas(KK_EMEL_ELMAS, 'kart-emeli'); } catch (_) {}
      }
      for (const cat of yeniAileler) {
        try { awardElmas(KK_AILE_ELMAS, 'kart-ailesi'); } catch (_) {}
        const CAT = CATEGORIES[cat] || {};
        try {
          showToast(`${CAT.glyph || '✦'} ${t('kk.aile.sealed', '{aile} ailesi tamamlandı — mühür senin.').replace('{aile}', _catLabel(CAT))}`);
          window.fxCue?.('seal');
        } catch (_) {}
      }
    }
  } catch (_) {}

  // İlk EFSANE kart MEŞALE sırtını açar — en derin kartın kaydı destenin
  // dışına da geçer. Sırtın kendi töreni yoktur: mühür perdesi zaten açık.
  if (card.rarity === 'efsane') { try { kkSirtKazan('meshale'); } catch (_) {} }

  // Kimlik Motoru (13l) — kazanılan kart artık OLDUĞU KİŞİ olur.
  try { window.imOnCardEarned?.(cardId, false); } catch (_) {}

  // kalıcılık + yüzey senkronu
  kkSaveDebounced();
  try { window.wsSyncStudio?.(); } catch (_) {}
  try { window.yolRenderHero?.(); } catch (_) {}
  return true;
}

/* ── okuma yüzeyleri: eşik havuzu + öneri rafı (K4) ───────────────────────
   Havuz İÇSEL durumdur (78 kart orada olabilir); kullanıcıya gösterilen
   şey yalnız `kkOneriRafi` — havuz boyutu hiçbir yerde sayı olarak sızmaz. */
/** Kartı eşik havuzuna AL — reçete tutmadan da olabilir. Kullanıcı "artık o
 *  kişiyim" diyerek kartı kendi eşiğe getirir (Oluş Sınaması, 10q4): beyan
 *  yolu barajdan (minEvidence) bağımsızdır, kapı sınamadır. Zaten sahipli ya
 *  da havuzda olan kart için idempotent. Döner: eşik kaydı | null. */
export function kkEsikAc(cardId, opts) {
  opts = opts || {};
  const kk = S._kisiKarti;
  const card = getCardById(cardId);
  if (!kk || !card || kk.collection[cardId]) return null;
  if (!kk.esik) kk.esik = {};
  if (!kk.esik[cardId]) {
    kk.esik[cardId] = {
      at: new Date().toISOString(), skor: num(opts.skor, 0), dims: opts.dims || {},
      davet: 0, sonDavet: null, red: [], kaynak: opts.kaynak || 'beyan',
    };
    kkRaiseState(cardId, 'esikte');
    kkSaveDebounced();
  }
  return kk.esik[cardId];
}

/** Bir kartın eşik kaydı (yoksa null). */
export function kkEsikDurum(cardId) {
  const kk = S._kisiKarti;
  return (kk && kk.esik && kk.esik[cardId]) || null;
}

/** Eşikteki tüm kartlar, skor azalan sırayla (en yakın önce). */
export function kkEsikListe() {
  const kk = S._kisiKarti;
  const esik = (kk && kk.esik) || {};
  return Object.entries(esik)
    .map(([cardId, e]) => ({ cardId, ...e }))
    .sort((a, b) => (b.skor || 0) - (a.skor || 0));
}

/** Wanderer'ın ÖNERİ RAFI — havuzdan en güçlü `n` kart, hedeflenmiş olanlar
 *  önce (Emre: "kullanıcının hangi kişileri olmak istediğini bilir"). Skor
 *  sıralaması kkScoreAndSort'un deseniyle aynı (azalan skor); yeni bir
 *  sıralayıcı yazılmadı. */
export function kkOneriRafi(n = 3) {
  return kkEsikListe()
    .sort((a, b) => {
      const ha = kkIsHedef(a.cardId) ? 1 : 0;
      const hb = kkIsHedef(b.cardId) ? 1 : 0;
      if (ha !== hb) return hb - ha;
      return (b.skor || 0) - (a.skor || 0);
    })
    .slice(0, n)
    .map(e => e.cardId);
}

/* ── kkTyping: kullanıcı yazarken tören/davet açılmasın diye ortak guard.
   kkMaybePresent'in kuyruk mantığıyla birlikte gitti (Oluş Mührü K0) ama bu
   küçük yardımcı KALIYOR — davet ritim kapısı (10q4-olus-muhru) onu İMPORT
   eder; ikiz guard yazmak yerine tek kaynak burada durur (§1.3). ── */
export function kkTyping() {
  const a = document.activeElement;
  return a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT' || a.isContentEditable);
}

/* ── backfill: ilk yüklemede birikmiş sinyalden sessiz taban ─────────────── */
export function kkBackfill() {
  const kk = S._kisiKarti;
  if (!kk) return;
  const before = Object.keys(kk.collection).length;
  // İlk kez: mevcut nitelikleri SESSİZ ver (paket yağmuru olmasın)
  kkTick({ force: true, silent: !kk.seenIntro && before === 0 ? true : false });
  if (!kk.seenIntro) {
    const after = Object.keys(kk.collection).length;
    if (after > before) {
      // Giriş ipucu bir KOLEKSİYON (Wanderer Studio) bildirimi — boot doğrudan
      // Wanderer LLM (ön yüz) açıldığından orada gösterme; kullanıcı Studio'ya
      // geçtiğinde sun (aşağıdaki switchView after-kancası tetikler). seenIntro
      // ancak toast gerçekten sunulunca işaretlenir → bu seansta Studio'ya hiç
      // geçilmezse ipucu kaybolmaz.
      _introToastCount = after;
      kkPresentIntroToast();
    } else {
      kk.seenIntro = true;   // sunulacak ipucu yok → bir daha kontrol etme
      kkSaveDebounced();
    }
  }
}

/* ── giriş ipucu toast'u — YALNIZ Wanderer Studio (arka yüz) ekranlarında ─── */
let _introToastCount = 0;   // sunum bekleyen ipucu sayısı (ön yüzdeyken ertelenir)
function _inStudio() {
  // Ön yüz = Wanderer LLM (#chat-view). Diğer aktif view'lerin tümü Studio (arka yüz).
  const active = document.querySelector('.view.active');
  return !!active && active.id !== 'chat-view';
}
function kkPresentIntroToast() {
  if (!_introToastCount || !_inStudio()) return;   // ön yüzdeyken ertele
  const n = _introToastCount;
  _introToastCount = 0;
  const kk = S._kisiKarti;
  if (kk) { kk.seenIntro = true; kkSaveDebounced(); }
  showToast(t('kk.intro_toast').replace('{n}', n), false, () => window.switchView && window.switchView('kisilerim'));
}

/* ════════════════════════════════════════════════════════════════════════
   5) KALICILIK — IndexedDB (+ Supabase sync Faz 6'da)
═══════════════════════════════════════════════════════════════════════════ */
/* Dışa açık: 10q4 (Oluş Mührü) günlük davet sayacını `kk.olusGun`'a yazdıktan
   sonra kalıcılığı buradan tetikler — ikiz debounce kurmak yerine tek kaynak. */
export function kkSaveDebounced() { clearTimeout(_saveTimer); _saveTimer = setTimeout(kkSave, 600); }
export async function kkSave() {
  try {
    if (!window._idb || !S._kisiKarti) return;
    await window._idb.put('wanderer-kv', { key: 'kisiKarti', value: S._kisiKarti });
  } catch (_) {}
  kkSyncToSupabase();
}

/* ── Supabase senkron (migration 009) — owner-only, IndexedDB ile çift yönlü ── */
let _syncTimer = null;
// `hedefler` kolonu mig 040'ta doğdu (ELLE). Koşmadıysa 42703 (undefined_column)
// gelir; o an bu oturumda kolonu satırdan çıkarıp cihaz-yerel modda kalırız —
// hedef mühürleri IndexedDB'de yaşamaya devam eder, hiçbir şey kırılmaz.
let _hedefColOk = true;
// `yapi` kolonu Üç Usta sprintinde doğdu (ELLE migration). Yoksa aynı savunma:
// bu oturumda kolonu satırdan çıkarırız, aile/panzehir/emel/dönem cihaz-yerel
// (IndexedDB) yaşar. Kolon gelene kadar tek maliyet: ikinci cihazda mühürlerin
// yeniden hesaplanması (Elmas ödemesi zaten canlı kazanıma bağlı — tekrar ödenmez).
let _yapiColOk = true;
// `esik` kolonu Oluş Mührü'nde doğdu (ELLE migration). Yoksa aynı desen:
// havuz cihaz-yerel yaşar — ikinci cihazda kkTick zaten aynı reçeteleri
// yeniden hesaplayıp havuzu doldurur (collection bulutta olduğu için kayıp
// yok); tek maliyet reddedilmiş/davet geçmişinin o cihazda unutulması.
let _esikColOk = true;
export function kkSyncToSupabase() {
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(async () => {
    try {
      const uid = S.currentUser && S.currentUser.id;
      if (!uid || !sb || !S._kisiKarti) return;
      const kk = S._kisiKarti;
      const p = kk.profile || {};
      const profRow = {
        user_id: uid,
        dusunceler: p.dusunceler | 0, inanclar: p.inanclar | 0, hisler: p.hisler | 0, davranislar: p.davranislar | 0,
        history: (kk.history || []).slice(-300),
        updated_at: new Date().toISOString(),
      };
      if (_hedefColOk) profRow.hedefler = kk.hedefler || {};
      if (_yapiColOk) {
        profRow.yapi = {
          aileler: kk.aileler || {}, panzehirler: kk.panzehirler || {},
          emeller: kk.emeller || {}, donem: kk.donem || null,
          sirtlar: kk.sirtlar || {}, sirtSecili: kk.sirtSecili || null,
        };
      }
      if (_esikColOk) profRow.esik = kk.esik || {};
      const { error: profErr } = await sb.from('kisi_karti_profile').upsert(profRow, { onConflict: 'user_id' });
      if (profErr?.code === '42703') {
        // Hangi kolonun eksik olduğunu mesajdan ayır — biri yokken diğeri
        // yazılmaya devam etsin (üç migration bağımsız uygulanabilir).
        if (/hedefler/.test(profErr.message || '')) { _hedefColOk = false; delete profRow.hedefler; }
        if (/yapi/.test(profErr.message || '')) { _yapiColOk = false; delete profRow.yapi; }
        if (/esik/.test(profErr.message || '')) { _esikColOk = false; delete profRow.esik; }
        await sb.from('kisi_karti_profile').upsert(profRow, { onConflict: 'user_id' });
      }
      const rows = Object.entries(kk.collection || {}).map(([cardId, c]) => ({
        user_id: uid, card_id: cardId, rarity: c.rarity || 'yaygin', dims: c.dims || {}, score: c.score || 0, earned_at: c.earnedAt || new Date().toISOString(),
      }));
      if (rows.length) await sb.from('kisi_kartlari').upsert(rows, { onConflict: 'user_id,card_id' });
    } catch (_) { /* offline → IndexedDB yeter */ }
  }, 1500);
}
export async function kkSyncFromSupabase() {
  try {
    const uid = S.currentUser && S.currentUser.id;
    if (!uid || !sb) return;
    const { data: coll } = await sb.from('kisi_kartlari').select('card_id,rarity,dims,score,earned_at').eq('user_id', uid);
    if (Array.isArray(coll)) {
      for (const r of coll) {
        if (!S._kisiKarti.collection[r.card_id]) {
          S._kisiKarti.collection[r.card_id] = { earnedAt: r.earned_at, rarity: r.rarity, dims: r.dims || {}, score: r.score || 0, silent: true };
          kkRaiseState(r.card_id, 'sealed');
        }
      }
    }
    // hedefler + yapi + esik kolonları ELLE migration'la doğdu — yoksa (42703)
    // en yeniden en eskiye kademeli geri çekilinir, en kötü hâlde yalnız
    // history okunur (hedefler/yapi desenin birebir üçüncüsü).
    let prof = null;
    const q = await sb.from('kisi_karti_profile').select('history,hedefler,yapi,esik').eq('user_id', uid).maybeSingle();
    if (q.error?.code === '42703') {
      _esikColOk = false;
      const q2 = await sb.from('kisi_karti_profile').select('history,hedefler,yapi').eq('user_id', uid).maybeSingle();
      if (q2.error?.code === '42703') {
        _yapiColOk = false;
        const q3 = await sb.from('kisi_karti_profile').select('history,hedefler').eq('user_id', uid).maybeSingle();
        if (q3.error?.code === '42703') {
          _hedefColOk = false;
          prof = (await sb.from('kisi_karti_profile').select('history').eq('user_id', uid).maybeSingle()).data;
        } else {
          prof = q3.data;
        }
      } else {
        prof = q2.data;
      }
    } else {
      prof = q.data;
    }
    if (prof && Array.isArray(prof.history) && prof.history.length > (S._kisiKarti.history || []).length) {
      S._kisiKarti.history = prof.history;
    }
    // Hedefler cihazlar arası birleşir (union) — başka cihazda vurulan mühür
    // burada da geçerlidir; yerelde olan asla silinmez.
    if (prof && prof.hedefler && typeof prof.hedefler === 'object') {
      const local = S._kisiKarti.hedefler || (S._kisiKarti.hedefler = {});
      for (const [id, h] of Object.entries(prof.hedefler)) {
        if (!local[id] && !S._kisiKarti.collection[id]) local[id] = h;
      }
    }
    // Yapı (aile/panzehir/emel/dönem) da BİRLEŞİR — yerelde olan silinmez.
    // Mühürler birleştiği için ikinci cihaz onları yeniden "yeni" sanmaz;
    // Elmas ödemesi zaten canlı kazanıma bağlı, çifte ödeme buradan da kapanır.
    const y = prof && prof.yapi;
    if (y && typeof y === 'object') {
      for (const alan of ['aileler', 'panzehirler', 'emeller', 'sirtlar']) {
        if (!y[alan] || typeof y[alan] !== 'object') continue;
        const local = S._kisiKarti[alan] || (S._kisiKarti[alan] = {});
        for (const [k, v] of Object.entries(y[alan])) if (!local[k]) local[k] = v;
      }
      // Seçili sırt bir TERCİHTİR, birikim değil: yerelde seçim varsa o
      // kazanır (kullanıcı bu cihazda az önce seçmiş olabilir).
      if (y.sirtSecili && !S._kisiKarti.sirtSecili) S._kisiKarti.sirtSecili = y.sirtSecili;
      // Dönem haftalıktır: yalnız BU haftanınki devralınır, eskisi çöptür.
      if (y.donem && y.donem.weekKey === kkDonemHafta() && !S._kisiKarti.donem) {
        S._kisiKarti.donem = y.donem;
      }
    }
    // Eşik havuzu (Oluş Mührü) da BİRLEŞİR — başka cihazda düşen/reddedilen
    // kart burada da görünür. Zaten kazanılmış (collection'da) ya da yerelde
    // duran bir kayıt asla ezilmez — kkMuhurle'nin tek-yazarlığı bozulmaz (K3).
    const e = prof && prof.esik;
    if (e && typeof e === 'object') {
      const localEsik = S._kisiKarti.esik || (S._kisiKarti.esik = {});
      for (const [id, ev] of Object.entries(e)) {
        if (!localEsik[id] && !S._kisiKarti.collection[id]) localEsik[id] = ev;
      }
    }
  } catch (_) { /* offline / tablo yok → sessiz geç */ }
}
export async function kkLoad() {
  try {
    if (!window._idb) return;
    const data = await window._idb.get('wanderer-kv', 'kisiKarti');
    if (data && data.value) {
      const v = data.value;
      Object.assign(S._kisiKarti, {
        profile: v.profile || S._kisiKarti.profile,
        collection: v.collection || {},
        history: v.history || [],
        seenIntro: !!v.seenIntro,
        closest: v.closest || null,
        hedefler: v.hedefler || {},   // hedef mühürleri (mig 040 öncesi cihaz-yerel)
        // Eşik havuzu (Oluş Mührü, K1) — reçetesi tutmuş ama beyan edilmemiş
        // kartlar. Eski kayıttaki `pending`/`sunum` (dağıtım kuyruğu + günlük
        // tören tavanı) BİLİNÇLİ atlanır: tören borcu düşer, kart zaten
        // `collection`'da duruyorsa mühürlü sayılır (K6 miras).
        esik: v.esik || {},
        olusGun: v.olusGun || null,   // davet ritmi günlük sayaç (FAZ 2)
      });
      // koleksiyondaki kartların durumunu yükselt
      for (const id of Object.keys(S._kisiKarti.collection)) kkRaiseState(id, 'sealed');
      // eşikte bekleyenlerin durumunu yükselt (collection'dan ayrı, altında)
      for (const id of Object.keys(S._kisiKarti.esik)) kkRaiseState(id, 'esikte');
    }
  } catch (_) {}
}

/* ════════════════════════════════════════════════════════════════════════
   6) 80'LER PAKET-AÇMA ANİMASYONU
═══════════════════════════════════════════════════════════════════════════ */
function kkPortal(id, z) {
  let el = document.getElementById(id);
  if (!el) { el = document.createElement('div'); el.id = id; document.body.appendChild(el); }
  el.style.cssText = `position:fixed;inset:0;z-index:${z || 9300};`;
  return el;
}

/* ════════════════════════════════════════════════════════════════════════
   EVRİM TÖRENİ (K3) — "aynı tohum, daha derin toprak"
   ─────────────────────────────────────────────────────────────────────────
   Paket töreninin kardeşi ama jesti başka: folyo yırtılmaz. Eski kart
   sahnede durur, ışık içinde soluklaşır ve YENİ kart onun üstünden doğar
   (Pokémon'un evrim kartını eskisinin üstüne koyma jesti).
   Kabuk paylaşımı: portal + veil + actions 10q'nun kendi paket dilinden
   gelir; animasyon ayrımı GOTCHA'ya uyar — giriş animasyonu SARMALAYICIDA,
   dönüşüm transformu İÇ katmanda (dolan animasyon class transformunu ezer).
═══════════════════════════════════════════════════════════════════════════ */
export function kkEvolveCeremony(cardId) {
  const card = getCardById(cardId);
  const ev = kkEvrim(cardId);
  const prev = ev && ev.onceki ? getCardById(ev.onceki) : null;
  // Köken kartı bulunamazsa tören anlamsız — normal kazanıma düş (savunmacı).
  if (!card || !prev) { kkOpenPack(cardId); return; }
  kkEnsureStyles();
  _packOpen = true;
  const R = RARITIES[card.rarity] || RARITIES.yaygin;
  const portal = kkPortal('kk-pack-portal', 9300);
  const title = ev.kademe === 'tac' ? t('kk.evo.title_tac', 'Kök taca durdu.') : t('kk.evo.title_kok', 'Filiz kök saldı.');

  portal.innerHTML = `
    <div class="kk-pack-veil"></div>
    <div class="kk-ev-stage" id="kk-ev-stage">
      <div class="kk-pack-kicker">${t('kk.evo.kicker', '✦ DERİNLEŞTİN ✦')}</div>
      <div class="kk-ev-cards">
        <div class="kk-ev-old" id="kk-ev-old">${kkRenderCard3D(prev, {})}</div>
        <div class="kk-ev-new" id="kk-ev-new">${kkRenderCard3D(card, { live: true })}</div>
        <div class="kk-ev-burst" id="kk-ev-burst"></div>
      </div>
      <div class="kk-pack-caption kk-ev-cap" id="kk-ev-cap" style="opacity:0;">
        <div class="kk-ev-title">${esc(title)}</div>
        <div class="kk-pack-cap-rar" style="color:${R.color};">${_rarLabel(R)}</div>
        <div class="kk-pack-cap-name">${esc(card.name)}</div>
        <div class="kk-pack-cap-lesson">"${esc(card.lesson || card.whisper || '')}"</div>
        <div class="kk-ev-sub">${t('kk.evo.sub', 'Aynı tohum, daha derin toprak.')}</div>
      </div>
      <div class="kk-pack-actions" id="kk-ev-actions" style="display:none;">
        <button class="kk-btn-primary" id="kk-ev-collect">${t('kk.pack.collect')}</button>
        <button class="kk-btn-ghost" id="kk-ev-more">${t('kk.pack.continue')}</button>
      </div>
    </div>`;

  const stage = portal.querySelector('#kk-ev-stage');
  const cap = portal.querySelector('#kk-ev-cap');
  const actions = portal.querySelector('#kk-ev-actions');
  haptic(20);

  // Dönüşüm: eski kart soluklaşıp içe çöker, yeni kart ışıktan doğar.
  const timers = [];
  timers.push(setTimeout(() => {
    stage.classList.add('is-evolving');
    haptic([15, 40, 70]);
    try { window.fxCue?.('holo'); } catch (_) {}
  }, 620));
  timers.push(setTimeout(() => {
    cap.style.opacity = '';
    cap.classList.add('kk-fade-in');
    haptic(40);
  }, 1500));
  timers.push(setTimeout(() => {
    actions.style.display = '';
    actions.classList.add('kk-fade-in');
  }, 2000));

  const close = () => {
    timers.forEach(clearTimeout);
    portal.style.cssText = ''; portal.innerHTML = '';
    _packOpen = false;
  };
  portal.querySelector('#kk-ev-collect').addEventListener('click', () => {
    haptic(25); close();
    if (document.getElementById('kisilerim-view')?.classList.contains('active')) loadKisilerimView();
    if (document.getElementById('arketipler-view')?.classList.contains('active')) loadKisilerView();
  });
  portal.querySelector('#kk-ev-more').addEventListener('click', close);
}

/* ════════════════════════════════════════════════════════════════════════
   SENTEZ TÖRENİ (K4) — "iki kişi, bir sentez"
   ─────────────────────────────────────────────────────────────────────────
   Yu-Gi-Oh füzyonunun jesti: iki malzeme kart sahnenin iki yanından gelir,
   merkezde birleşir, üçüncü kart onlardan doğar. Malzemeler KAYBOLMAZ —
   koleksiyonda kalırlar; sentez onların üstüne doğar (kitabın dili: iki
   niteliği ayrı ayrı yaşamış olan, üçüncü bir insan olur).
   Evrim töreniyle aynı kabuk; dönüşüm class-toggle transition ile.
═══════════════════════════════════════════════════════════════════════════ */
export function kkSynthCeremony(cardId) {
  const card = getCardById(cardId);
  const kk = S._kisiKarti;
  const sz = card && kk ? kkSentezDurum(card, kk.collection) : null;
  // Malzeme bulunamazsa tören anlamsız — normal kazanıma düş (savunmacı).
  if (!card || !sz || !sz.hazir) { kkOpenPack(cardId); return; }
  kkEnsureStyles();
  _packOpen = true;
  const R = RARITIES[card.rarity] || RARITIES.yaygin;
  const portal = kkPortal('kk-pack-portal', 9300);

  portal.innerHTML = `
    <div class="kk-pack-veil"></div>
    <div class="kk-sy-stage" id="kk-sy-stage">
      <div class="kk-pack-kicker">${t('kk.sentez.kicker', '⧉ İKİ KİŞİ, BİR SENTEZ ⧉')}</div>
      <div class="kk-sy-cards">
        <div class="kk-sy-mat kk-sy-mat--l" id="kk-sy-l">${kkRenderCard3D(sz.kart1, { mini: true })}</div>
        <div class="kk-sy-mat kk-sy-mat--r" id="kk-sy-r">${kkRenderCard3D(sz.kart2, { mini: true })}</div>
        <div class="kk-sy-new" id="kk-sy-new">${kkRenderCard3D(card, { live: true })}</div>
        <div class="kk-ev-burst" id="kk-sy-burst"></div>
      </div>
      <div class="kk-pack-caption kk-ev-cap" id="kk-sy-cap" style="opacity:0;">
        <div class="kk-ev-title">${t('kk.sentez.title', 'İkisi birleşti.')}</div>
        <div class="kk-pack-cap-rar" style="color:${R.color};">${_rarLabel(R)}</div>
        <div class="kk-pack-cap-name">${esc(card.name)}</div>
        <div class="kk-pack-cap-lesson">"${esc(card.lesson || card.whisper || '')}"</div>
        <div class="kk-ev-sub">${t('kk.sentez.sub', '{a} ve {b} — ikisini ayrı ayrı yaşadın, şimdi biri oldun.')
          .replace('{a}', esc(sz.kart1.name)).replace('{b}', esc(sz.kart2.name))}</div>
      </div>
      <div class="kk-pack-actions" id="kk-sy-actions" style="display:none;">
        <button class="kk-btn-primary" id="kk-sy-collect">${t('kk.pack.collect')}</button>
        <button class="kk-btn-ghost" id="kk-sy-more">${t('kk.pack.continue')}</button>
      </div>
    </div>`;

  const stage = portal.querySelector('#kk-sy-stage');
  const cap = portal.querySelector('#kk-sy-cap');
  const actions = portal.querySelector('#kk-sy-actions');
  haptic(20);

  const timers = [];
  timers.push(setTimeout(() => {
    stage.classList.add('is-fusing');
    haptic([15, 40, 80]);
    try { window.fxCue?.('holoGrand'); } catch (_) {}
  }, 700));
  timers.push(setTimeout(() => { cap.style.opacity = ''; cap.classList.add('kk-fade-in'); haptic(40); }, 1700));
  timers.push(setTimeout(() => { actions.style.display = ''; actions.classList.add('kk-fade-in'); }, 2200));

  const close = () => {
    timers.forEach(clearTimeout);
    portal.style.cssText = ''; portal.innerHTML = '';
    _packOpen = false;
  };
  portal.querySelector('#kk-sy-collect').addEventListener('click', () => {
    haptic(25); close();
    if (document.getElementById('kisilerim-view')?.classList.contains('active')) loadKisilerimView();
    if (document.getElementById('arketipler-view')?.classList.contains('active')) loadKisilerView();
  });
  portal.querySelector('#kk-sy-more').addEventListener('click', close);
}

export function kkOpenPack(cardId) {
  const card = getCardById(cardId);
  if (!card) { _packOpen = false; return; }
  kkEnsureStyles();
  try { window.czEnsureStyles && window.czEnsureStyles(); } catch (_) {}  // Cazibe: azlık çerçevesi
  _packOpen = true;
  const R = RARITIES[card.rarity] || RARITIES.yaygin;
  const packScarce = (card.rarity === 'nadide' || card.rarity === 'efsane') ? t('kk.pack.scarce') : '';
  const portal = kkPortal('kk-pack-portal', 9300);
  const userName = esc((S.currentUser && (S.currentUser.name || S.currentUser.user_metadata?.name)) || t('kk.default_name'));
  const isFirst = Object.keys((S._kisiKarti && S._kisiKarti.collection) || {}).length <= 1;
  const kicker = isFirst ? t('kk.pack.first') : t('kk.pack.new');

  /* Koleksiyon Nabzı (00f · İç Çalışma 04 rev.2 · Y1): damgayı TÖREN basar.
     kkMatchCard'ın eşiği geçmesi kazanım değildir — kart burada teslim edilir.
     window.* üzerinden: statik import rollup IIFE sırasını bozar (TDZ). */
  try {
    const kolN = Object.keys((S._kisiKarti && S._kisiKarti.collection) || {}).length;
    window.wtLogKart?.(isFirst ? 'ilk-kart' : 'kazanim', {
      kartId:   card.id,
      nadirlik: card.rarity,
      kategori: card.category,
      n:        kolN,
    });
  } catch (_) {}

  portal.innerHTML = `
    <div class="kk-pack-veil"></div>
    <div class="kk-scanlines"></div>
    <div class="kk-pack-stage" id="kk-pack-stage">
      <div class="kk-pack-kicker" id="kk-pack-kicker">${kicker}</div>
      <!-- 80'ler folyo paketi -->
      <div class="kk-pack" id="kk-pack">
        <div class="kk-pack-foil"></div>
        <div class="kk-pack-shine"></div>
        <div class="kk-pack-top">WANDERER</div>
        <div class="kk-pack-mid">
          <div class="kk-pack-logo">◆</div>
          <div class="kk-pack-sub">${t('kk.pack.label')}</div>
          <!-- Nadirlik etiketi kabuktan indi: paket içindekini söylemez,
               nadirlik yalnız açıldıktan sonra (kk-pack-cap-rar) konuşur. -->
          <div class="kk-pack-series">${t('kk.pack.series')}</div>
        </div>
        <div class="kk-pack-barcode"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="kk-pack-rip" id="kk-pack-rip"></div>
      </div>
      <!-- Açılan kart -->
      <div class="kk-pack-reveal" id="kk-pack-reveal" style="display:none;">
        ${kkRenderCard3D(card, { reveal: true, live: true })}
        <div class="kk-pack-caption">
          <div class="kk-pack-cap-rar" style="color:${R.color};">${_rarLabel(R)}</div>
          ${packScarce ? `<div class="kk-pack-cap-scarce">◇ ${packScarce}</div>` : ''}
          <div class="kk-pack-cap-name">${esc(card.name)}</div>
          <div class="kk-pack-cap-lesson">"${esc(card.lesson || card.whisper || '')}"</div>
          ${card.portre ? `<div class="kk-pack-cap-portre">${esc(card.portre)}</div>` : ''}
          <div class="kk-pack-cap-owner">${t('kk.pack.now_part').replace('{name}', userName)}</div>
          ${(() => { try { return window.imIsCurrentPersona && window.imIsCurrentPersona(card.id) ? `<div class="kk-pack-cap-identity">${t('kk.pack.identity')}</div>` : ''; } catch (_) { return ''; } })()}
          ${(() => { try {
            const col = S._kisiKarti?.collection?.[card.id];
            return (col && col.porAbsorbed && window.porCardName)
              ? `<div class="kk-pack-cap-portre">✦ ${t('kk.pack.portre_etched').replace('{card}', esc(window.porCardName()))}</div>`
              : '';
          } catch (_) { return ''; } })()}
        </div>
      </div>
      <div class="kk-pack-hint" id="kk-pack-hint">${t('kk.pack.tap_hint')}</div>
      <div class="kk-pack-actions" id="kk-pack-actions" style="display:none;">
        <button class="kk-btn-primary" id="kk-pack-collect">${t('kk.pack.collect')}</button>
        <button class="kk-btn-ghost" id="kk-pack-share">${t('kk.pack.share')}</button>
        <button class="kk-btn-ghost" id="kk-pack-more">${t('kk.pack.continue')}</button>
      </div>
    </div>`;

  const stage = portal.querySelector('#kk-pack-stage');
  const pack = portal.querySelector('#kk-pack');
  const reveal = portal.querySelector('#kk-pack-reveal');
  const hint = portal.querySelector('#kk-pack-hint');
  const actions = portal.querySelector('#kk-pack-actions');
  let opened = false;
  haptic(20);

  const doOpen = () => {
    if (opened) return; opened = true;
    haptic([15, 30, 60]);
    try { window.fxCue?.('pack'); } catch (_) {} // His Motoru — folyo yırtma
    pack.classList.add('kk-pack--rip');
    hint.style.display = 'none';
    setTimeout(() => {
      pack.style.display = 'none';
      reveal.style.display = '';
      reveal.classList.add('kk-reveal-in');
      stage.classList.add('kk-burst');
      try { kkBindTilt(reveal); } catch (_) {}
      haptic(40);
      // His Motoru — holo parıltı; nadide/efsane görkemli açılır
      try {
        window.fxCue?.((card.rarity === 'nadide' || card.rarity === 'efsane') ? 'holoGrand' : 'holo');
      } catch (_) {}
    }, 620);
    setTimeout(() => { actions.style.display = ''; actions.classList.add('kk-fade-in'); }, 1280);
  };

  pack.addEventListener('click', doOpen);
  // otomatik aç (kullanıcı dokunmazsa) — paket gelir gelmez kısa gecikme
  const autoT = setTimeout(doOpen, 2600);

  const close = () => {
    clearTimeout(autoT);
    portal.style.cssText = ''; portal.innerHTML = '';
    _packOpen = false;
  };
  portal.querySelector('#kk-pack-collect').addEventListener('click', () => {
    haptic(25);
    close();
    // açık olan koleksiyon görünümünü yenile (kart Kişilerim'e girer / Kişiler'den düşer)
    if (document.getElementById('kisilerim-view')?.classList.contains('active')) loadKisilerimView();
    if (document.getElementById('arketipler-view')?.classList.contains('active')) loadKisilerView();
  });
  portal.querySelector('#kk-pack-more').addEventListener('click', () => { close(); });
  // PAYLAŞ (13g) — kazanılan kişiyi story görseli olarak paylaş (portal açık kalır)
  portal.querySelector('#kk-pack-share')?.addEventListener('click', () => {
    try {
      const CAT = CATEGORIES[card.category] || {};
      window.shrShareStory?.({
        kicker: `${t('kk.share_kicker')} · ${_rarLabel(R)}`,
        glyph: CAT.glyph || '✦',
        title: card.name, sub: _catLabel(CAT),
        line: card.lesson || card.whisper || '',
        accent: R.color, tier: (R.order || 0) + 1,
      });
    } catch (_) {}
  });
}

/* ════════════════════════════════════════════════════════════════════════
   7) 3B HOLOGRAFİK KART
═══════════════════════════════════════════════════════════════════════════ */
export function kkRenderCard3D(card, opts) {
  opts = opts || {};
  const R = RARITIES[card.rarity] || RARITIES.yaygin;
  const dims = (S._kisiKarti && S._kisiKarti.collection[card.id] && S._kisiKarti.collection[card.id].dims) || null;
  const sizeCls = opts.mini ? 'kk-card3d--mini' : '';
  const lockCls = opts.locked ? 'kk-card3d--locked' : '';

  const dimBars = (!opts.mini && !opts.locked && dims) ? `<div class="kk-card-dims">${DIMS.map(d => {
    const v = dims[d] == null ? 0 : dims[d];
    return `<div class="kk-card-dim"><span class="kk-card-dim-g">${DIM_GLYPH[d]}</span><div class="kk-card-dim-bar"><i style="width:${clamp(v)}%"></i></div></div>`;
  }).join('')}</div>` : '';

  // Kart dili (12c): altın = OLDUĞUN KİŞİ (mühür), lapis gece = OLMAK
  // İSTEDİĞİN KİŞİ (kapının ardındaki sen). Derin sis (fog) gizemi korur.
  const face = ikvCardFace(card, {
    palette: opts.locked ? 'lapis' : 'gold',
    kicker: opts.mini ? '' : (opts.locked ? t('kk.card.kicker_locked') : t('kk.card.kicker_owned')),
    badge: opts.locked ? t('kk.card.badge_locked') : t('kk.card.badge_owned'),
    name: opts.fog ? '? ? ?' : undefined,
    sub: opts.locked ? t('kk.card.sub_locked') : undefined,
    rarLabel: _rarLabel(R), rarColor: R.color,
    fog: !!opts.fog,
    mini: !!opts.mini,
    extra: dimBars,
    // K3 — kökleşme ve köken: mertebe yalnız SAHİPLİ kartta anlamlı (kilitli
    // kartta gösterilmez, henüz kök salmadı); köken satırı hattın kendisinden.
    mertebe: opts.locked ? 0 : ((S._kisiKarti?.collection?.[card.id]?.mertebe) || 0),
    evrimden: kkEvrimEtiketi(kkEvrim(card.id)?.onceki),
    // YAŞAYAN SAHNE (12c · K2): canlılık artık ödül değil, kartın tabiatı —
    // `live` bayrağı emekli. Buradan geçen tek şey KİLİT: kilitli ya da sisli
    // kart donuk durur, kazanılınca nefes almaya başlar. İkisi de gönderilir,
    // çünkü ızgara `locked` verip `fog` vermez.
    locked: !!opts.locked,
  });

  // kart sırtı yalnız flip gösteren bağlamda (paket açılışı) basılır — 100+
  // hücrelik ızgarada görünmez backface DOM'u taşımanın anlamı yok.
  const backface = opts.reveal ? `<div class="kk-card3d-backface">${ikvCardBack()}</div>` : '';
  // ALTIN KART (12c · K3) — hareket artık HER kartın tabiatı olduğu için
  // prestij ÇERÇEVEYE taşındı: derinlik kazanmış kartın kenarı altınla
  // mühürlenir, folyosu tavana çıkar. Ölçüt değişmedi (kkAltinMi: efsane ya
  // da mertebe 5, sahiplik şart) — değişen, ölçütün ne kazandırdığı.
  // Izgarada da görünür (koleksiyonun gururu hücrede okunur); kilitli kartta
  // asla — henüz senin değilken taşınacak bir prestij yoktur.
  const altin = !opts.locked && kkAltinMi(card);
  return `<div class="kk-card3d ${sizeCls} ${lockCls}${altin ? ' kk-card3d--altin' : ''}" data-rarity="${card.rarity}" data-card-id="${esc(card.id)}" style="--rar:${R.color};--foil:${altin ? 1 : R.foil};">
    <div class="kk-card3d-inner">
      ${backface}
      <div class="kk-card3d-face">
        ${face}
        <div class="kk-card3d-foil"></div>
        <div class="kk-card3d-glare"></div>
      </div>
    </div>
  </div>`;
}

// 3B tilt — pointer/gyro parallax
/* Eğim artık 12c holo motorundan akar (tek boru: jiroskop + imleç + yay).
   'vars' modu kartın kendi foil/glare CSS'inin okuduğu --rx/--ry/--mx/--my
   değişkenlerini sürer; buradaki eski elle-pointer kodu motora devredildi. */
export function kkBindTilt(root) {
  (root || document).querySelectorAll('.kk-card3d').forEach(el => {
    if (el._kkTilt) return; el._kkTilt = true;
    try { window.ikvHoloAttach && window.ikvHoloAttach(el, { mode: 'vars' }); } catch (_) {}
  });
}

/* ════════════════════════════════════════════════════════════════════════
   8) "KİŞİLERİM" KOLEKSİYON GÖRÜNÜMÜ
═══════════════════════════════════════════════════════════════════════════ */
// filtre durumu görünüm-başına ayrı (iki görünüm birbirinin filtresini bozmasın)
let _kkFilterOwned = 'hepsi';
// Kişilerim merceği: 'izgara' (neyi topladın) | 'yapi' (nasıl akıyor · 10q3).
// Oturum-yerel; kalıcılık yok — mercek bir bakış açısıdır, bir ayar değil.
let _kkMercek = 'izgara';
let _kkFilterUnowned = 'hepsi';

/* ── ortak: kategori filtre çipleri (yalnızca verilen alt-kümede var olan kategoriler) ── */
function kkCatChips(cards, active) {
  const cats = [{ id: 'hepsi', label: t('kk.chip.all') }].concat(
    Object.values(CATEGORIES).filter(c => cards.some(d => d.category === c.id)).map(c => ({ id: c.id, label: localeUpper(_catLabel(c)) }))
  );
  return cats.map(c => `<button class="kk-chip ${active === c.id ? 'is-active' : ''}" data-filter="${esc(c.id)}">${esc(c.label)}</button>`).join('');
}

/* ── EŞİKTE nişanı — eşik havuzundaki kartın TEK görsel imzası (K9: Bugün'e
   yeni şerit eklenmez, nişan mevcut yüzeylerde yaşar). Altın ama sönük: kapı
   aralık, mühür henüz vurulmadı — vuran kullanıcıdır. Havuzun büyüklüğü
   nişanda da sızmaz, nişan daima TEK kart hakkındadır (K4).
   `kkEnsureStyles` burada çağrılır çünkü 10q2 (Bugün) bu nişanı 10q ekranı
   hiç açılmadan çizebilir — stil orada yüklü olmayabilir. ── */
export function kkEsikNisanHTML(cardId) {
  if (!kkEsikDurum(cardId)) return '';
  kkEnsureStyles();
  return `<span class="kk-esik-nisan">◈ ${t('kk.esik.nisan', 'EŞİKTE')}</span>`;
}

/* ── ortak: kilitli (sahipsiz) ızgara hücresi — silüet + ilerleme + near-miss.
   i → kademeli süzülme indeksi (.ikv-cascade --i) ─────────────────────────── */
function kkLockedCell(card, m, i) {
  const hint = m.missing[0] ? m.missing[0].hint : '';
  const nisan = kkEsikNisanHTML(card.id);
  // Eşikteki kartta ipucu susar: "şunu yaparsan yaklaşırsın" demek anlamsız —
  // reçete zaten tuttu, kalan tek şey kullanıcının sözü.
  return `<button class="kk-grid-cell kk-grid-cell--locked${nisan ? ' is-esikte' : ''}" data-open="${esc(card.id)}" style="--i:${Math.min(num(i), 24)}">
    ${kkRenderCard3D(card, { mini: true, locked: true, fog: m.score < 28 })}
    <div class="kk-cell-prog"><div class="kk-cell-prog-bar"><i style="width:${clamp(m.score)}%"></i></div><span>${_pct(m.score)}</span></div>
    ${nisan || (hint && m.score >= 35 ? `<div class="kk-cell-hint">${esc(hint)}</div>` : '')}
  </button>`;
}

/* ── ortak: tören başlığı — mühür halkası + sayaç + not (+ nadirlik mühürleri).
   İlerleme daima halka dilinde (Tasarım Prensipleri §7); Kişiler tarafında
   halka altın→lapis "yol" degradesiyle akar (şimdiden geleceğe). ──────────── */
/* OCAK — hanın ateşi. Salonun sıcaklığı bir tema değil, dokunulabilir bir
   detaydır: alev süs gibi durur ama İŞLEVİ vardır — dokunuşu Fenerin
   Uğultusu'nu (13e ambiyans) yakar/söndürür. Ayarlar'daki toggle ile TEK
   gerçeği paylaşır (fxAmbientAcik okur, fxSyncSettingsUI geri yazar);
   ambiyans opt-in kalır, varsayılan kapalıdır. */
function kkOcakHTML() {
  let acik = false;
  try { acik = !!window.fxAmbientAcik?.(); } catch (_) {}
  return `<button type="button" class="kk-ocak${acik ? ' is-on' : ''}" id="kk-ocak"
    aria-pressed="${acik}" title="${esc(t('kk.ocak.aria', 'Ocak'))}"
    aria-label="${esc(t('kk.ocak.aria', 'Ocak'))}">
    <span class="kk-ocak-alev" aria-hidden="true"><i></i><i></i><i></i></span>
  </button>`;
}

function kkHallHead(o) {
  return `<div class="kk-hall${o.lapis ? ' kk-hall--lapis' : ''}">
    ${ikvRing(o.pct, { size: 78, yol: !!o.lapis, center: `<b class="kk-hall-num">${o.num}</b><span class="kk-hall-den">${o.den}</span>` })}
    <div class="kk-hall-txt">
      <div class="kk-hall-kicker">${o.kicker}</div>
      <div class="kk-hall-note">${o.note}</div>
      ${o.legend ? `<div class="kk-rar-legend">${o.legend}</div>` : ''}
    </div>
    ${o.ocak ? kkOcakHTML() : ''}
  </div>`;
}

/** Bir ISO damgasının YEREL ay anahtarı (YYYY-MM).
 *
 *  Defterin damgaları `toISOString()` ile yazılır, yani UTC'dir: TR'de ayın
 *  ilk gecesi (00:00-03:00) kazanılan kart bir ÖNCEKİ aya düşerdi. Gün
 *  anahtarı kuralının (`localISODate`) ay karşılığı budur — ölçünün ayı,
 *  kullanıcının yaşadığı aydır. */
function _yerelAy(iso) {
  try {
    const d = iso ? new Date(iso) : new Date();
    if (isNaN(d.getTime())) return '';
    return localISODate(d).slice(0, 7);
  } catch (_) { return ''; }
}

/** Salonun ZAMAN satırı — "bu ay üç kişi oldun".
 *
 *  Salon bugüne dek yalnız `earned/total` sayıyordu: kazanımın ne zaman
 *  olduğunu her kart `at` damgasıyla taşıdığı hâlde koleksiyonun bir zaman
 *  ekseni yoktu. Sayım `kkKazanimAylik()`ten gelir (ikinci hesap yok).
 *  Kanıt kapısı: bu ay kazanım yoksa satır HİÇ çizilmez — "bu ay 0 kişi"
 *  bir ölçü değil, bir sitemdir. */
function _kkBuAySatiri() {
  try {
    const buAy = _yerelAy();
    const kayit = (kkKazanimAylik() || []).find(a => a.ay === buAy);
    if (!kayit || !kayit.n) return '';
    return `<div class="kk-hall-ay">${esc(
      t('kk.this_month', 'Bu ay {n} kişi oldun.').replace('{n}', kayit.n))}</div>`;
  } catch (_) { return ''; }
}

/* ── "KİŞİLERİM" — yalnızca SAHİPLİ (açılmış) kartlar: dönüştüğün kişiler ──── */
export function loadKisilerimView() {
  const body = document.getElementById('kisilerim-body');
  if (!body) return;
  kkEnsureStyles();
  try { window.czEnsureStyles && window.czEnsureStyles(); } catch (_) {}  // Cazibe stilleri (iltifat satırı)
  kkTick({ force: true });

  const deck = getFullDeck();
  const kk = S._kisiKarti;
  const { owned } = kkPartitionDeck(deck, kk.collection);
  const earned = owned.length;
  const total = deck.length;
  const pct = total ? Math.round((earned / total) * 100) : 0;

  // rarity efsanesi (toplanan / toplam)
  const rar = Object.values(RARITIES).map(r => {
    const n = deck.filter(d => d.rarity === r.id).length;
    const got = owned.filter(d => d.rarity === r.id).length;
    return `<span class="kk-rar-leg"><i style="background:${r.color}"></i>${_rarLabel(r)} <b>${got}/${n}</b></span>`;
  }).join('');

  let collectionBlock;
  if (!earned) {
    // boş durum — henüz hiç kart açılmadı: fener mührü nefes alır, Kişiler'e davet
    collectionBlock = `<div class="kk-empty ikv-panel">
      <div class="kk-empty-glyph">${ikvLantern(58)}</div>
      <div class="kk-empty-title">${t('kk.empty.title_owned')}</div>
      <div class="kk-empty-text">${t('kk.empty.text_owned')}</div>
      <button class="kk-empty-cta ikv-seal-btn" data-goto="arketipler">${t('kk.empty.cta_explore')}</button>
    </div>`;
  } else if (_kkMercek === 'yapi') {
    // BENLİK YAPISI merceği (K5 · 10q3) — aynı koleksiyon, başka bir bakış:
    // ızgara "neyi topladın", yapı "bunlar sana nasıl akıyor" der.
    collectionBlock = `<div id="kk-yapi-host"></div>
      <div class="kk-foot">${t('by.foot', 'Her kart merkeze akar. Merkezde sen varsın.')}</div>`;
  } else {
    if (_kkFilterOwned !== 'hepsi' && !owned.some(d => d.category === _kkFilterOwned)) _kkFilterOwned = 'hepsi';
    const chips = kkCatChips(owned, _kkFilterOwned);
    const shown = owned.filter(d => _kkFilterOwned === 'hepsi' || d.category === _kkFilterOwned);
    const grid = shown.map((card, i) => `<button class="kk-grid-cell kk-grid-cell--owned" data-open="${esc(card.id)}" style="--i:${Math.min(i, 24)}">${kkRenderCard3D(card, { mini: true })}</button>`).join('');
    collectionBlock = `
      <div class="kk-chips">${chips}</div>
      <div class="kk-grid ikv-cascade">${grid}</div>
      <div class="kk-foot">${t('kk.foot_owned')}</div>`;
  }

  // AİLE MÜHÜRLERİ (K4) — tamamlanan kitap çerçeveleri; kazanılmış rozet olarak
  // durur (tören yerine kalıcı iz — bkz. kkDetectAileCompletion notu).
  const aileMuhurleri = Object.entries(kk.aileler || {})
    .map(([cat]) => {
      const CAT = CATEGORIES[cat];
      if (!CAT) return '';
      return `<span class="kk-aile-seal" title="${esc(_catLabel(CAT))}">${esc(CAT.glyph)}</span>`;
    }).join('');

  // EMEL (K7) — tamamlanmamış aileler seçilebilir hedeftir. Dayatılmaz:
  // dokunulunca emel olur, tekrar dokunulunca bırakılır.
  const emeller = kk.emeller || {};
  const emelCips = Object.keys(CATEGORIES).map(cat => {
    const d = kkEmelDurum(cat, kk.collection);
    if (!d || d.tam || !d.owned) return '';        // tamamlanan ya da hiç başlanmayan aile emel listesine girmez
    const on = !!emeller[cat];
    const CAT = CATEGORIES[cat];
    // Kademe noktaları: yolun kaç durağı geçildi. Sayaç dili değil — nokta
    // dolar, uzun yol gözle ölçülür.
    const noktalar = on && d.kademeler.length > 1
      ? `<span class="kk-emel-k" aria-hidden="true">${d.kademeler.map((_, i) => (i < d.kademe ? '●' : '○')).join('')}</span>`
      : '';
    return `<button class="kk-emel-chip${on ? ' is-on' : ''}" data-emel="${esc(cat)}"
      aria-pressed="${on}" title="${esc(_catLabel(CAT))}">
      <span class="kk-emel-g">${esc(CAT.glyph)}</span>
      <span class="kk-emel-n">${d.owned}/${d.total}</span>${noktalar}
    </button>`;
  }).join('');

  // SIRTLAR — yalnız BİRDEN FAZLA sırt varken görünür: tek sırtlı destede
  // "seçim" diye bir şey yoktur, boş bir raf göstermek kazanımı ucuzlatır.
  const sahipSirtlar = Object.keys(SIRTLAR).filter(kkSirtSahip);
  const seciliSirt = kkSirtSecili();
  const sirtCips = sahipSirtlar.length > 1 ? sahipSirtlar.map(id => `
    <button class="kk-sirt-chip${id === seciliSirt ? ' is-on' : ''}" data-sirt="${esc(id)}"
      aria-pressed="${id === seciliSirt}" title="${esc(_sirtAd(id))}">
      <span class="kk-sirt-mini"><i class="ikv-back ikv-back--${esc(id)}"><b class="ikv-back-lattice"></b><b class="ikv-back-ring ikv-back-ring--outer"></b></i></span>
      <span class="kk-sirt-n">${esc(_sirtAd(id))}</span>
    </button>`).join('') : '';

  const aileHtml = (aileMuhurleri || emelCips || sirtCips) ? `
    ${aileMuhurleri ? `<div class="kk-aile-row"><span class="kk-aile-lbl">${t('kk.aile.label', 'AİLE MÜHÜRLERİ')}</span>${aileMuhurleri}</div>` : ''}
    ${emelCips ? `<div class="kk-aile-row kk-emel-row"><span class="kk-aile-lbl">${t('kk.emel.label', 'EMELİN')}</span>${emelCips}</div>` : ''}
    ${sirtCips ? `<div class="kk-aile-row kk-sirt-row"><span class="kk-aile-lbl">${t('kk.sirt.label', 'SIRTLAR')}</span>${sirtCips}</div>` : ''}` : '';

  // Cazibe · Sevgi/Beğeni — hak edilmiş, spesifik iltifat (yalnız kazanım varsa görünür)
  let praiseHtml = '';
  try { const c = window.czIltifat && window.czIltifat(); if (c && earned) praiseHtml = `<div class="cz-praise-line">♥ ${esc(c)}</div>`; } catch (_) {}

  body.innerHTML = `
    <div class="kk-wrap kk-wrap--gold">
      <div id="im-identity-host"></div>
      <div id="kk-butunluk-header"></div>
      ${praiseHtml}
      ${kkHallHead({
        pct, num: earned, den: `/ ${total}`,
        kicker: t('kk.collected_label'),
        note: t('kk.pct_complete').replace('{pct}', pct),
        legend: rar,
        ocak: true,          // ocak yalnız ALTIN salonda yanar (hanın kendisi)
      })}
      ${_kkBuAySatiri()}
      ${aileHtml}
      ${earned ? `<div class="kk-mercek" role="tablist" aria-label="${esc(t('by.lens', 'Mercek'))}">
        <button class="kk-mercek-btn${_kkMercek === 'izgara' ? ' is-on' : ''}" data-mercek="izgara"
          role="tab" aria-selected="${_kkMercek === 'izgara'}">${t('by.lens.grid', 'IZGARA')}</button>
        <button class="kk-mercek-btn${_kkMercek === 'yapi' ? ' is-on' : ''}" data-mercek="yapi"
          role="tab" aria-selected="${_kkMercek === 'yapi'}">${t('by.lens.structure', 'YAPI')}</button>
      </div>` : ''}
      ${collectionBlock}
    </div>`;

  kkRenderButunlukHeader();
  try { window.imRenderIdentityBlock && window.imRenderIdentityBlock(); } catch (_) {}  // Kimlik Motoru (13l) — OLDUĞUN KİŞİ bloğu
  kkBindTilt(body);

  // Benlik Yapısı merceği (10q3) — TDZ-güvenli window erişimi: 10q3 kendi
  // window expose'unu yaptığı an çizer, yüklenmediyse alan sessizce boş kalır.
  if (_kkMercek === 'yapi') {
    try { window.byRender?.(document.getElementById('kk-yapi-host')); } catch (_) {}
  }
  body.querySelectorAll('[data-mercek]').forEach(b => b.addEventListener('click', () => {
    _kkMercek = b.dataset.mercek; loadKisilerimView();
  }));
  body.querySelectorAll('[data-emel]').forEach(b => b.addEventListener('click', () => {
    if (kkEmelSec(b.dataset.emel)) loadKisilerimView();
  }));
  body.querySelectorAll('[data-sirt]').forEach(b => b.addEventListener('click', () => {
    if (kkSirtSec(b.dataset.sirt)) loadKisilerimView();
  }));
  // OCAK — ateşi yakmak/söndürmek. Ayarlar'daki toggle da aynı gerçeği
  // gösterir, o yüzden dokunuştan sonra ORAYA da geri yazılır.
  body.querySelector('#kk-ocak')?.addEventListener('click', (e) => {
    const el = e.currentTarget;
    const yeni = !el.classList.contains('is-on');
    try { window.fxToggleAmbient?.(yeni); } catch (_) {}
    el.classList.toggle('is-on', yeni);
    el.setAttribute('aria-pressed', String(yeni));
    try { window.fxSyncSettingsUI?.(); } catch (_) {}
    try { showToast(yeni ? t('kk.ocak.on', 'Ocak yandı.') : t('kk.ocak.off', 'Ocak dinleniyor.')); } catch (_) {}
  });

  body.querySelectorAll('.kk-chip').forEach(b => b.addEventListener('click', () => { _kkFilterOwned = b.dataset.filter; loadKisilerimView(); }));
  body.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => kkOpenDetail(b.dataset.open)));
  body.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => window.switchView && window.switchView(b.dataset.goto)));
}

/* Tanıma Motoru (FAZ 5, İ4+İ5) — bir kart-id listesinin GÖRÜNME sırasını
   seçiciye devret. HANGİ kartların listeye GİRECEĞİ (kkOneriRafi'nin
   hedef+skor seçimi, kkScoreAndSort'un hazırlık sıralaması) bu fonksiyonun
   İÇİNE hiç sızmaz — burası yalnız zaten seçilmiş `ids`'i yeniden dizer.
   K2 fallback KESİNDİR: seçici yok/boş/kısmi/hata → `ids` AYNEN döner,
   çağıran seçiciyi hiç çağırmamış gibi davranmaya devam eder. */
/** Kullanıcı bu kapıyı susturdu mu (FAZ 7 beyan defteri, 09i). Seçici
 *  çağrılmadan ÖNCE sorulur: `secAday` beyanlı adaya null döner ve
 *  `_secSiraliIdler`'in "kısmi sonuç = fallback" kuralı o listeyi olduğu
 *  gibi geri verirdi — yani beyan sessizce iptal olurdu. Filtre burada,
 *  seçicinin girişinde durur. */
function _kkBeyanli(id) {
  try { return !!window.secBeyanVar?.(id); } catch (_) { return false; }
}

function _secSiraliIdler(ids, tur, sig) {
  if (!ids || ids.length < 2) return ids || [];
  try {
    const evidence = kkEvidence(sig);
    const adaylar = ids.map(id => {
      const card = getCardById(id);
      if (!card) return null;
      const m = kkMatchCard(card, sig);
      // dims (FAZ 18, K10-K12): 09i kkMatchCard'ı kendisi çağırmaz, adayın
      // boyut değerlerini yalnız `ek` üzerinden geçirebilir — duygu
      // yakınlığının kanıtı budur (m.dims[boyut] > 0).
      const girdi = window.secGirdiTopla?.(tur, id, { deger: m.hazirlik, n: evidence, dims: m.dims });
      return girdi ? window.secAday?.(tur, id, girdi) : null;
    });
    const sirali = window.secSirala?.(adaylar);
    // Kısmi sonuç da fallback sayılır: evidence TÜM adaylar için aynı
    // kaynaktan geldiği için kapı ya hepsini geçirir ya hiçbirini — kısmi
    // bir sonuç beklenmeyen bir durumdur, "sırayı değiştirmemek" en güvenlisi.
    if (!sirali || sirali.length !== ids.length) return ids;
    return sirali.map(a => a.id);
  } catch (_) { return ids; }
}

/* ── KEŞİF YUVASI — "Bugünün Kişisi"nin amaca bağlanmış rastgeleliği ──────
   (Tanıma Motoru FAZ 6 · İ8/K6, 2026-08-10)

   TikTok'un ilgi keşfinde profil kemikleşmesin diye çıkarımın DIŞINDAN
   içerik enjekte edilir. Bizdeki karşılığı uniform bir zar değil, amaçlı bir
   sondajdır: havuz, kullanıcının son zamanlarda hiç uğramadığı ERDEMLERİN
   kartlarıdır (13l'nin erdem vektörü — çürüme oradan miras, K5).

   Yuva hiçbir değer İDDİA ETMEZ (K6): keşif modunda hazırlık çubuğu susar,
   yerine bir soru gelir. Kanıtı olan sayı kart detayında konuşur; burada
   kanıt yokluğun kendisidir ve yokluk yüzdeyle anlatılmaz.

   Seçici (09i) burada BİLEREK kullanılmaz: seçicinin işi kanıtlıyı öne
   almak, keşfin işi kanıtsıza uğramaktır — aynı yüzeyde ikisi birbirini
   yer. Sıralama spotlight'ın işi kalır, yuva onun dışında durur. ─────────── */

/** NEDEN 20: `imVirtueNow` doyumlu bir orandır (raw/(raw+20)); 20 değeri ham
 *  ağırlık 5'e denk gelir — "sözünü tuttu" gibi TEK bir birinci sınıf
 *  hareketin o erdeme düşen payı. Ölçü şudur: bir yüz bir kez bile gerçekten
 *  yaşandıysa artık kurcalanacak değil beslenecek bir yüzdür; sondaj hiç
 *  dokunulmamış olana gider. */
const KESIF_ESIK = 20;

/** Bugün sondalanacak erdem — sahipsiz kartların erdemleri arasından, erdem
 *  vektöründe eşiğin ALTINDA kalanlar. Döner: `{erdem, deger}` | `null`
 *  (13l hidre değilse ya da her yüze uğranmışsa → yuva eski uniform hâlinde
 *  kalır; motor yokken davranış regresyonu olmaz, K2 ruhu).
 *
 *  Rotasyon gün indeksiyledir, zarla DEĞİL: `czDaily` aynı yüzü üst üste
 *  seçebilirdi (1/n) — tekrar eden keşif keşif olmaktan çıkar. Zar havuzun
 *  İÇİNDEKİ kartı seçmeye kalır. */
function _kesifErdemi(unowned) {
  const vnow = window.imVirtueNow?.();
  if (!vnow) return null;
  const zayif = [...new Set(unowned.map(c => c.virtue).filter(Boolean))]
    .map(v => ({ erdem: v, deger: num(vnow[v], 0) }))
    .filter(x => x.deger < KESIF_ESIK)
    .sort((a, b) => (a.deger - b.deger) || a.erdem.localeCompare(b.erdem));
  if (!zayif.length) return null;
  // Gün anahtarı DAİMA yerel (localISODate) — UTC gün kaydırması yuvayı
  // TR'de gece yarısından önce döndürürdü.
  const gun = Math.floor(new Date(`${localISODate()}T00:00:00`).getTime() / 864e5);
  return zayif[((gun % zayif.length) + zayif.length) % zayif.length];
}

/** Davet cümlesi ÖLÇÜME sadıktır: vektör sıfırsa "hiç uğramadık", değilse
 *  "seyrek uğradık" — aradaki fark kullanıcının gerçekten yaşadığı şeydir,
 *  tek cümleye indirilmez. Ölçüm kesin dilde, yorum ihtimalsel dilde
 *  (İhtimalsel Dil anayasası). */
function _kesifDavet(kesif) {
  const ad = t(`im.virtue.${kesif.erdem}`, kesif.erdem);
  return (kesif.deger > 0
    ? t('kk.kesif.davet_seyrek', '{virtue} yüzüne seyrek uğradık. Bugün oraya biraz daha yakından bakılabilir.')
    : t('kk.kesif.davet_hic', '{virtue} yüzüne son zamanlarda hiç uğramadık. Belki sırası gelmemiştir — belki de tam sırası.')
  ).replace('{virtue}', ad);
}

/** Yuvanın HTML'i — keşif modu ve (motor yokken) eski uniform mod tek
 *  yüzeyde. Dedup mevcut kalıbıyla: spotlight ve Emre'nin kartı havuzdan
 *  ÇIKARILIR (eskiden çakışma yuvayı tamamen susturuyordu; keşif havuzu dar
 *  olduğu için o kural yuvayı çoğu gün yok ederdi). */
function _kesifYuvasi(unowned, sig, spotId, emrePickId) {
  const rnd = window.czDaily && window.czDaily('kesif');
  if (!rnd) return '';                      // cazibe motoru yoksa yuva da yok (stil onun)
  const kesif = _kesifErdemi(unowned);
  // Beyan (FAZ 7) — susturulan kart keşif havuzundan da çıkar: "daha az
  // göster" bir yüzeyin değil, o kapının kararıdır.
  const havuz = unowned.filter(c => c.id !== spotId && c.id !== emrePickId && !_kkBeyanli(c.id)
    && (!kesif || c.virtue === kesif.erdem));
  if (!havuz.length) return '';
  const bk = havuz[Math.min(havuz.length - 1, Math.floor(rnd() * havuz.length))];
  if (!bk) return '';
  // Keşif modunda çubuk susar (K6); uniform modda eski davranış birebir sürer.
  const bar = kesif ? '' : `<div class="kk-spot-bar"><i style="width:${clamp(kkMatchCard(bk, sig).score)}%"></i></div>`;
  const davet = kesif ? `<div class="cz-bk-davet">${esc(_kesifDavet(kesif))}</div>` : '';
  // Tanıma Motoru (FAZ 2, İ2) — günde 1 gösterim kaydı (09d dedup'lar).
  try { window.omKaydetGosterim?.('bugunun_kisisi', bk.id); } catch (_) {}
  return `<div class="kk-neden-wrap"><button class="cz-bugun-kisi" data-open="${esc(bk.id)}">
    <div class="cz-bk-card">${kkRenderCard3D(bk, { mini: true, locked: true })}</div>
    <div class="cz-bk-txt">
      <div class="cz-bk-kicker">${t('kk.bugun_kisi')}</div>
      <div class="cz-bk-name">${esc(bk.name)}</div>
      <div class="cz-bk-lesson">"${esc(bk.lesson || bk.whisper || '')}"</div>
      ${davet}
      ${bar}
    </div>
  </button>${kkNedenGirisHTML('bugunun_kisisi', bk.id, kesif ? kesif.erdem : null)}</div>`;
}

/* ── "NEDEN BU?" — şeffaflık yüzeyi ──────────────────────────────────────
   (Tanıma Motoru FAZ 7 · İ10/K7, 2026-08-10)

   Dört platformun hiçbirinde olmayan şey: kullanıcının, kendisine bir şeyin
   NEDEN gösterildiğini sorabilmesi ve cevabı ölçümle alması. Onlarda model
   saklıdır ve kullanıcı onunla tartışamaz; burada model konuşur ve
   kullanıcının bir cümlesi onu susturur.

   Panelin epistemik sözleşmesi üç katmanlıdır (§6.10'un üç kökeni):
     · BEYAN  — kullanıcının kendi cümlesi/kararı (eşiğe alma, sınama
                alıntısı). En güçlü köken; tek başına paneli hak eder.
     · ÖLÇÜM  — olmuş olayların sayımı (bugün gösterildi/açılmadı, bu
                oturumda aynı yüze uğrandı, kaç kez soruldu). Kesin dilde.
     · YORUM  — yalnız bir ALINTIYA bağlıysa doğar ve ihtimalsel konuşur
                ("…olabilir"). Alıntı yoksa yorum satırı HİÇ yazılmaz.

   K7'nin "kanıt çözülemezse yüzey görünmez" kuralı burada şöyle okunur:
   söylenecek en az bir beyan ya da ölçüm satırı yoksa GİRİŞ DÜĞMESİ HİÇ
   ÇİZİLMEZ. Sıfır kanıtlı kullanıcıda panel var olmaz — açılıp "elimde bir
   şey yok" demek de bir tür uydurmadır (yokluğun kendisi bir gerekçe
   değildir... yuva hariç: orada YOKLUK gerekçenin ta kendisidir, FAZ 6
   notu md.5).

   Yüzde burada TEKRARLANMAZ (Ton Rehberi: "%87 eşleşme" yasak). Kart
   hazırlığını halkasıyla kart detayı söyler; bu panelin dili olaylardır.
   ─────────────────────────────────────────────────────────────────────── */

/** Panelin veri modeli. Döner: { satirlar[], alinti, kesif, beyan, kartAdi }.
 *  `satirlar` her biri {k: 'beyan'|'olcum', metin} — sıra anlamlıdır:
 *  beyan önce, ölçüm sonra (kullanıcının sesi motorun sesinden önce gelir).
 *  Metinler burada üretilir çünkü i18n yüzeyin işidir; 09i yalnız hangi
 *  sinyalin konuştuğunu söyler (secNedenVeri). */
function _nedenVeri(tur, cardId, kesifErdem) {
  if (tur === 'geri-cagri') return _nedenVeriDavet(cardId);
  if (tur === 'baslatici') return _nedenVeriBaslatici(cardId);
  const card = getCardById(cardId);
  if (!card) return null;
  const sig = kkComputeSignals();
  const m = kkMatchCard(card, sig);
  let nv = null;
  // dims (FAZ 18): duygu yakınlığının kanıtı — bkz. _secSiraliIdler'daki
  // aynı satır notu.
  try { nv = window.secNedenVeri?.(tur, cardId, { deger: m.hazirlik, n: kkEvidence(sig), dims: m.dims }) || null; } catch (_) {}
  const g = (nv && nv.girdi) || {};
  const esik = kkEsikDurum(cardId);
  const satirlar = [];

  // ── BEYAN katmanı — kullanıcının kendi kararı/cümlesi ──
  if (esik && esik.at) {
    const tarih = _kkFmtDate(esik.at);
    if (tarih) {
      satirlar.push({ k: 'beyan', metin: esik.kaynak === 'beyan'
        ? t('kk.neden.esik_beyan', '{tarih} günü bu kişiyi eşiğine sen aldın.').replace('{tarih}', tarih)
        : t('kk.neden.esik', '{tarih} gününden beri eşiğinde duruyor.').replace('{tarih}', tarih) });
    }
  }

  // Sınama alıntısı — kullanıcının GERÇEK cümlesi (kokenAlintiCoz zincirinden
  // geçmiş, 10q4 sınavında kaydedilmiş). Model yazmaz, kaynaktan kesilir.
  let alinti = null;
  const alintilar = esik?.sinav?.alintilar;
  if (alintilar && typeof alintilar === 'object') {
    const d = DIMS.find(x => alintilar[x]);
    if (d) alinti = { boyut: _dimLabel(d), metin: String(alintilar[d]) };
  }

  // ── ÖLÇÜM katmanı ──
  // Boyut satırı kanıt kapısına BAĞLI: nv.aday null ise (kokenOlc geçilmedi)
  // ortada sıralanacak bir ölçüm yok demektir — o hâlde "beliriyorsun"
  // cümlesi kanıtsız bir iddia olurdu.
  if (nv && nv.aday) {
    let enGuclu = null;
    for (const d of DIMS) {
      const v = m.dims[d];
      if (typeof v === 'number' && v > 0 && (!enGuclu || v > enGuclu.v)) enGuclu = { d, v };
    }
    if (enGuclu) {
      satirlar.push({ k: 'olcum', metin: t('kk.neden.boyut', 'Ölçüm şimdiden {boyut} tarafında beliriyor.')
        .replace('{boyut}', _dimLabel(enGuclu.d)) });
    }
    // Duygu (FAZ 18, plan (d)) — boyut satırının YANINDA durur, aynı kanıt
    // kapısına (nv.aday) bağlıdır. İKİ şart birden gerekir: yakınlık 09i'de
    // gerçekten kuruldu (bilesenler.duygu SEC_DUYGU_CARPANI'ya eşit — yalnız
    // >1 kontrolü yeterli, tam eşitlik yeni bir sayı icat eder) VE okuma
    // kullanıcının kendi cümlesini taşıyor (`kanit` dolu) — ikisi eksikse
    // "bu kart o yöne yakın duruyor" kanıtsız bir iddia olurdu (§6.10).
    // Alıntı model tarafından YAZILMAZ, dgKapi'nin kaynaktan kestiği
    // `kanit`ten olduğu gibi alınır; escapeHTML render'da (`esc(s.metin)`,
    // kkNedenAc) uygulanır, burada tekrar edilmez.
    if (g.duygu && g.duygu.kanit && nv.aday.bilesenler && nv.aday.bilesenler.duygu > 1) {
      // Değiştirici FONKSİYON olarak verilir: kullanıcının cümlesi `$&`/`$1`
      // gibi özel `.replace()` kalıpları taşıyorsa (string replacement'ta
      // İŞLENİR) kendi cümlesi bozulmadan aynen geri gösterilsin diye.
      satirlar.push({ k: 'olcum', metin: t('kk.neden.duygu', 'Bugün şunu yazmıştın: «{alinti}» — bu kart o yöne yakın duruyor.')
        .replace('{alinti}', () => g.duygu.kanit) });
    }
  }
  if (g.oturumEslesme) {
    satirlar.push({ k: 'olcum', metin: t('kk.neden.oturum', 'Bugün aynı yüzden bir kartı daha açtın.') });
  }
  if (num(g.olumlu, 0) > 0) {
    satirlar.push({ k: 'olcum', metin: t('kk.neden.olumlu', 'Bu kapıyı çaldığımda dönüp baktın.') });
  }
  if (num(g.negatif, 0) > 0) {
    satirlar.push({ k: 'olcum', metin: t('kk.neden.negatif', 'Bunu daha önce geçtin — o yüzden daha seyrek soruyorum.') });
  }
  if (num(g.yorgunlukSayisi, 0) > 0) {
    satirlar.push({ k: 'olcum', metin: t('kk.neden.yorgunluk', 'Son zamanlarda bu kapıyı çok çaldım. Bir süre geride tutuyorum.') });
  }

  return {
    satirlar, alinti, kartAdi: card.name, tur,
    kesif: kesifErdem ? t(`im.virtue.${kesifErdem}`, kesifErdem) : null,
    beyan: !!(nv && nv.beyan),
  };
}

/** Geri çağrı balonunun (13o) gerekçesi — bir kart değil bir DAVET olduğu
 *  için ayrı yol. Ölçümü sessizliğin kendisidir: balon ancak sessizlik
 *  eşiği aşıldığında düşer, yani gerekçe daima gerçektir (kanıt uydurmaya
 *  gerek kalmaz). Geçmiş davet sonuçları 09d'nin `davet{}` defterinden
 *  okunur — motorun kendi isabetsizliğini de söyler (İ3'ün şeffaf yüzü). */
function _nedenVeriDavet(id) {
  const satirlar = [{ k: 'olcum', metin: t('kk.neden.davet_sessizlik',
    'Bir süredir yazmıyordun — bu ses o sessizlikten doğdu.') }];
  try {
    const d = window.omGunSatiri?.()?.davet;
    if (num(d?.cevap, 0) > 0) satirlar.push({ k: 'olcum',
      metin: t('kk.neden.davet_cevap', 'Böyle seslendiğimde daha önce dönmüştün.') });
    if (num(d?.sessiz, 0) > 0) satirlar.push({ k: 'olcum',
      metin: t('kk.neden.davet_sessiz', 'Böyle bir sesi daha önce sessiz bıraktın — o yüzden seyrek sesleniyorum.') });
  } catch (_) {}
  let beyan = false;
  try { beyan = !!window.secBeyanVar?.(id); } catch (_) {}
  /* DUYGU (13D K10 kadran 4, FAZ 19) — davet duyguyla giydirildiyse
     gerekçesi de burada durmalı: kapının dördüncü kadranı "geri alma
     YÜZEYİN KENDİSİNDE" der ve bu panelin altındaki "Beni böyle çağırma"
     tam olarak odur — ama kullanıcı neyi geri aldığını görmeden geri
     alamaz. Alıntı modelin cümlesi DEĞİL: `dgKapi`'nin kaynaktan kestiği
     `kanit`. Okuma yoksa (davet kapıdan geçmediyse) panel bugünküyle
     bit-be-bit aynı kalır. */
  let alinti = null;
  try {
    const dg = window.gcDuyguOkuma?.();
    if (dg && dg.kanit) {
      satirlar.push({ k: 'olcum', metin: t('kk.neden.davet_duygu',
        'Bu sesi son yazdıklarına göre kurdum.') });
      alinti = {
        head: t('kk.neden.davet_duygu_head', 'Ölçüm şu cümlenden çıktı:'),
        metin: String(dg.kanit),
        yorum: t('kk.neden.davet_duygu_yorum',
          'Yanlış okumuş olabilirim — aşağıdan beni böyle çağırmamamı söyleyebilirsin.'),
      };
    }
  } catch (_) {}
  return { satirlar, alinti, kesif: null, beyan, tur: 'geri-cagri',
           kartAdi: t('kk.neden.davet_ad', 'Sessizlikten sonra') };
}

/** Ana ekran başlatıcısının (10y2) gerekçesi — bir kart değil bir SORU
 *  olduğu için ayrı yol. Gerekçesi tek ve sağlamdır: soru kullanıcının
 *  kendi cümlesinden doğdu ve o cümle `kokenAlintiCoz` zincirinden geçip
 *  KAYNAKTAN kesildi (model yazmadı). Kanıt yoksa panel de yoktur — ama
 *  10y2 kanıtsız soruyu zaten şeride koymaz, yani buraya kanıtsız bir id
 *  normalde hiç gelmez; guard yine de durur (elle kurcalanmış depo). */
function _nedenVeriBaslatici(id) {
  let v = null;
  try { v = window.bslKanit?.(id) || null; } catch (_) {}
  if (!v || !v.kanit) return null;                      // K7 — sessiz kal

  let beyan = false;
  try { beyan = !!window.secBeyanVar?.(id); } catch (_) {}

  /* Kaynak satırı bir ÖLÇÜM değil, bir olgudur: cümlenin nereden geldiği
     kesin bilinir (yaşam verisi mi, Benlik Kartı mı) — kesin konuşulur. */
  const satirlar = [{ k: 'beyan', metin: v.kaynak === 'portre'
    ? t('kk.neden.bsl_portre', 'Bu soru, Portrene kendi elinle yazdığın bir cümleden doğdu.')
    : t('kk.neden.bsl_yasam', 'Bu soru, bir yerde kendi yazdığın bir cümleden doğdu.') }];

  return {
    satirlar,
    alinti: {
      head: t('kk.neden.bsl_alinti_head', 'Şöyle yazmıştın:'),
      metin: String(v.kanit),
      /* YORUM katmanı — ihtimalsel konuşur (register anayasası §1.2):
         cümlenin bugün de geçerli olduğu bir çıkarımdır, ölçüm değil. */
      yorum: t('kk.neden.bsl_yorum', 'Orada duran şey bugün de sürüyor olabilir.'),
    },
    kesif: null,
    beyan,
    tur: 'baslatici',
    kartAdi: v.metin || t('kk.neden.bsl_ad', 'Bugünün sorusu'),
  };
}

/** Giriş düğmesi — K7 kapısı burada. Söylenecek hiçbir beyan/ölçüm satırı
 *  yoksa boş string döner ve kullanıcı hiç "Neden bu?" görmez. Buton
 *  ÇAĞIRANIN butonunun İÇİNE konmaz (iç içe <button> geçersiz HTML'dir) —
 *  kardeş olarak, sarmalayıcının içinde durur. */
export function kkNedenGirisHTML(tur, cardId, kesifErdem) {
  let v = null;
  try { v = _nedenVeri(tur, cardId, kesifErdem); } catch (_) { return ''; }
  if (!v) return '';
  if (!v.kesif && !v.satirlar.length && !v.alinti) return '';   // K7 — sessiz kal
  return `<button type="button" class="kk-neden-giris" data-neden="${esc(tur)}" data-neden-id="${esc(cardId)}"${
    kesifErdem ? ` data-neden-kesif="${esc(kesifErdem)}"` : ''
  }>${t('kk.neden.giris', 'Neden bu?')}</button>`;
}

/** Paneli aç — hs-overlay kalıbı (tören portalı DEĞİL: bu bir açıklama,
 *  bir tören değil; z-index 750, --z-ceremony kullanılmaz). */
export function kkNedenAc(tur, cardId, kesifErdem) {
  const v = _nedenVeri(tur, cardId, kesifErdem);
  if (!v) return false;
  kkEnsureStyles();
  // 12c primitifleri (ikv-panel/ikv-ghost-btn/ikv-seal-btn) stillerini KENDİ
  // enjeksiyonundan alır ve onu bugüne dek yalnız kart çizen yüzeyler
  // tetikliyordu. Bu panel kart çizmez — çağırmazsak zemin ve düğmeler
  // tarayıcı varsayılanına düşer (canlıda görüldü, 2026-08-10).
  try { ikvEnsureStyles(); } catch (_) {}
  document.getElementById('kk-neden-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.style.cssText = 'z-index:var(--z-overlay-ust);';
  overlay.id = 'kk-neden-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', t('kk.neden.aria', 'Bu neden gösterildi'));

  // Keşif yuvasının gerekçesi bir ölçüm değil, ölçümün YOKLUĞUdur — kendi
  // cümlesiyle en başta durur (FAZ 6 notu md.5).
  const kesifSatir = v.kesif
    ? `<div class="kk-neden-satir kk-neden-satir--kesif">${esc(
        t('kk.neden.kesif', '{virtue} yüzüne dair bir iz bulamadım. Seni buraya bir ölçüm değil, bir boşluk getirdi.')
          .replace('{virtue}', v.kesif))}</div>`
    : '';

  const satirlar = v.satirlar.map(s =>
    `<div class="kk-neden-satir kk-neden-satir--${s.k}">${esc(s.metin)}</div>`).join('');

  /* Alıntı bloğunun başlığı ve yorumu ÇAĞIRAN tarafından verilebilir
     (`head`/`yorum`): sınamanın "Sınamada {boyut} tarafını…" cümlesi
     başlatıcı gerekçesine uymuyordu. Verilmezse sınama metni yerinde
     kalır — mevcut iki çağıran (kart, geri-cagri) etkilenmez. */
  const alintiBlok = v.alinti ? `<div class="kk-neden-alinti">
      <div class="kk-neden-alinti-h">${esc(v.alinti.head
        || t('kk.neden.alinti_head', 'Sınamada {boyut} tarafını kendi cümlenle geçmiştin:')
             .replace('{boyut}', v.alinti.boyut))}</div>
      <blockquote class="kk-neden-alinti-q">“${esc(v.alinti.metin)}”</blockquote>
      <div class="kk-neden-yorum">${esc(v.alinti.yorum
        || t('kk.neden.yorum', 'Orada araladığın kapı hâlâ açık olabilir.'))}</div>
    </div>` : '';

  const beyanBlok = v.beyan
    ? `<div class="kk-neden-susmus">${esc(t('kk.neden.susturuldu', 'Bu kapıyı çalmıyorum — sen söyledin.'))}</div>
       <button type="button" class="ikv-seal-btn kk-neden-btn" data-act="geri">${esc(t('kk.neden.geri', 'Yine göster'))}</button>`
    : `<button type="button" class="ikv-ghost-btn kk-neden-btn" data-act="azalt">${esc(v.tur === 'geri-cagri'
        ? t('kk.neden.azalt_davet', 'Beni böyle çağırma')
        : t('kk.neden.azalt', 'Bunu daha az göster'))}</button>`;

  overlay.innerHTML = `
    <div class="modal kk-neden-modal ikv-panel ikv-panel--lapis">
      <div class="kk-neden-kicker">${esc(t('kk.neden.kicker', 'NEDEN BU?'))}</div>
      <div class="kk-neden-ad">${esc(v.kartAdi)}</div>
      <div class="kk-neden-govde">
        ${kesifSatir}
        ${satirlar}
        ${alintiBlok}
      </div>
      <div class="kk-neden-alt">${esc(t('kk.neden.alt', 'Ben yalnız sırayı kuruyorum. Kim olacağına sen karar veriyorsun.'))}</div>
      <div class="kk-neden-nav">
        ${beyanBlok}
        <button type="button" class="modal-skip kk-neden-kapat" data-act="kapat">${esc(t('kk.neden.kapat', 'Kapat'))}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  try { window.wtOverlayOpen?.('neden-bu'); } catch (_) {}   // Kullanım Nabzı (00f)

  const kapat = (sonuc) => {
    overlay.remove();
    try { window.wtOverlayClose?.('neden-bu', sonuc); } catch (_) {}
  };

  overlay.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-act]');
    if (!btn) { if (ev.target === overlay) kapat('kapat'); return; }
    const act = btn.getAttribute('data-act');
    if (act === 'kapat') { kapat('kapat'); return; }
    /* Beyandan sonra hangi yüzey tazelenir: kart panelleri Kişilerim'i,
       ana ekran başlatıcısı şeridi. Yanlış yüzeyi tazelemek susturulan
       çipin ekranda kalmasına yol açardı. */
    const tazele = () => {
      if (tur === 'baslatici') { try { window.llmRenderHome?.(); } catch (_) {} return; }
      try { loadKisilerView(); } catch (_) {}
    };
    if (act === 'azalt') {
      try { window.secBeyanAzalt?.(tur, cardId); } catch (_) {}
      /* DAVETİN DÜZELTMESİ (13D K10 kadran 4 + K13, faz denetimi 2026-08-30).
         `secBeyanAzalt` bu DAVETİ susturur — doğru ama yarım: davet duyguyla
         giydirildiyse motorun o yüzeyde YANILDIĞI da kayda geçmeli, yoksa
         `yuzeyDefter.davet.duzeltildi` sonsuza dek 0 kalır ve beşinci kadran
         (kendini kapatma) davet için yapısal olarak hiç tetiklenemez;
         Gözlemevi de davet sütununu daima temiz gösterir.
         EKSENİ SUSTURMUYORUZ (bilinçli): kullanıcı "beni böyle çağırma" der,
         "bu ekseni hiçbir yerde kullanma" demez — eksen susturması sohbetin
         kendi "Beni yanlış okudun" jestinin işidir ve orada açıkça istenir.
         Dar jestten geniş sonuç çıkarmak beyanı büyütmek olurdu (§6.10). */
      try {
        if (tur === 'geri-cagri' && window.gcDuyguOkuma?.()) {
          const ik = S._dgIklim || window.dgIklimYukle?.() || null;
          if (ik) {
            S._dgIklim = window.dgYanilmaDuzeltildi?.(ik, 'davet') || ik;
            window.dgIklimKaydet?.(S._dgIklim);
            window.wtLogDuygu?.(window.gcDuyguOkuma().eksen, { yuzey: 'davet', duzeltildi: true });
          }
        }
      } catch (e) { console.warn('davet duzeltme:', e && e.message); }
      try { showToast(t('kk.neden.azalt_toast', 'Anlaşıldı. Bu kapıyı artık çalmıyorum — sen isteyene kadar.')); } catch (_) {}
      // Beyan bir karardır: sonucu "muhur" ile mühürlenir (00f tören sonucu).
      kapat('muhur');
      tazele();
      return;
    }
    if (act === 'geri') {
      try { window.secBeyanGeriAl?.(cardId); } catch (_) {}
      try { showToast(t('kk.neden.geri_toast', 'Yeniden bakıyorum.')); } catch (_) {}
      kapat('muhur');
      tazele();
    }
  });
  return true;
}

/* ── Öneri bloğu — iki mod, TEK yüzey (K4: yeni yüzey icat edilmez).
   · RAF modu — eşik havuzunda kart varsa Wanderer kendi gördüğünü söyler:
     rafın en güçlüsü ana kart, kalan ikisi işaretçi. Emre'nin imzası bu modda
     DÜŞER — seçim curated değil, kullanıcının kendi verisinden doğdu; imzayı
     bırakmak yanlış beyan olurdu (§6.2 sahte başarı yasağının kardeşi).
   · CURATED mod — raf boşsa Emre'nin sabit önerisi + rotası (12a EMRE_ONERI).
   Her iki modda stale demo sayıları (konum, gerekce) ATLANIR; yalnız evergreen
   metin + yön + canlı ilerleme gösterilir. */
/* ── Haftanın gündemi (DÖNEM KARTI, K7) — öneri bloğunun ÇERÇEVESİ ──
   2026-08-10 (Emre): gündem kendi kutusunda yaşamayı bıraktı. Önce Bugün'ün
   iki destesinin üstünde duruyordu, oradan kalktı; ayrı bir kutu olarak da
   dönmedi — öneriye YEDİRİLDİ. Gerekçe hizalanmadadır: bu blok zaten "şimdi
   neye bakmalısın" diyor, gündem de aynı soruya haftalık cevaptır. İkisini
   ayrı iki kutuya bölmek aynı sesi iki kez söylemekti.
   Motorun matematiğine DOKUNMAZ: öneri kendi kartını kendi seçer (kkOneriRafi
   / EMRE_ONERI), gündem yalnız haftanın erdemini ve — öneriden farklıysa —
   somut yüzünü söyler. Hafta boyunca sabittir; gündem gün içinde savrulmaz. */
function _donemSerit(kk, temsilEdilen) {
  let d = null;
  try { d = kkDonemErdem(); } catch (_) {}
  if (!d || !d.virtue) return '';
  const erdem = t('im.virtue.' + d.virtue, d.virtue);
  // Somut yüz yalnız blokta HİÇ görünmeyen bir kartsa yazılır — ana kart da,
  // rotanın işaretçileri de sayılır. Aynı kartı iki kez yazmak gündemi bilgi
  // değil tekrar yapar. Sahipli kart da düşer: gündem ulaşılabilir olanı
  // işaret eder (kkDonemErdem'in kendi kuralı).
  const c = (d.cardId && !temsilEdilen.includes(d.cardId) && !kk.collection[d.cardId])
    ? getCardById(d.cardId) : null;
  return `<div class="kk-emre-donem">
    <span class="kk-emre-donem-k">${t('kk.emre.donem', 'BU HAFTANIN GÜNDEMİ')}</span>
    <b class="kk-emre-donem-v">${esc(erdem)}</b>
    ${c ? `<button type="button" class="kk-emre-donem-c" data-open="${esc(c.id)}">${esc(c.name)}</button>` : ''}
  </div>`;
}

function kkEmreBlock(kk, sig) {
  let raf = kkOneriRafi(3).filter(id => !kk.collection[id] && getCardById(id) && !_kkBeyanli(id));
  // Tanıma Motoru (FAZ 5, İ4) — rafın sırası artık seçiciden; rafa KİMİN
  // gireceği (yukarıdaki satır, kkOneriRafi'nin hedef+skor kuralı) DEĞİŞMEZ.
  raf = _secSiraliIdler(raf, 'emre', sig);
  const rafMode = raf.length > 0;
  const pick = getCardById(rafMode ? raf[0] : EMRE_ONERI.pickId);
  if (!pick || kk.collection[pick.id]) return { html: '', pickId: null };  // sahipli/yok → gizle
  const m = kkMatchCard(pick, sig);
  const hint = m.missing[0] ? m.missing[0].hint : '';
  const ptr = (card, note, far) => (card && !kk.collection[card.id])
    ? `<button class="kk-emre-ptr${far ? ' is-far' : ''}" data-open="${esc(card.id)}"><b>${far ? t('kk.emre.later') : t('kk.emre.first')}</b> ${esc(card.name)} <i>${esc(note)}</i></button>` : '';

  // Raf modunda rota yerine rafın kalanı: aynı işaretçi primitifi, eşik dili
  const rafPtr = id => {
    const c = getCardById(id);
    if (!c) return '';
    return `<button class="kk-emre-ptr" data-open="${esc(c.id)}"><b>◈ ${t('kk.esik.nisan', 'EŞİKTE')}</b> ${esc(c.name)} <i>${esc(c.lesson || c.whisper || '')}</i></button>`;
  };
  const route = rafMode
    ? raf.slice(1).map(rafPtr).join('')
    : ptr(getCardById(EMRE_ONERI.yumusakKart), EMRE_ONERI.yumusakNot, false)
      + ptr(getCardById(EMRE_ONERI.uzakDur), EMRE_ONERI.uzakNot, true);

  const head = rafMode
    ? `<span class="kk-emre-mono">◈</span> ${t('kk.olus.raf_head', 'BUGÜN SENDE BELİRENLER')}`
    : `<span class="kk-emre-mono">E</span> ${t('kk.emre.head')} <span class="kk-emre-auth">${t('kk.emre.auth')}</span>`;
  const headline = rafMode
    ? t('kk.olus.raf_line', '{ad} artık sende beliriyor.').replace('{ad}', pick.name)
    : EMRE_ONERI.headline;
  // Raf modunda ipucu yerine kararın sahibi hatırlatılır — Wanderer görür, seçen sen
  const altLine = rafMode
    ? `<div class="kk-emre-hint kk-emre-hint--raf">${esc(t('kk.olus.raf_alt', 'Karar senin. Ben yalnız gördüğümü söylüyorum.'))}</div>`
    : (hint ? `<div class="kk-emre-hint">→ ${esc(hint)}</div>` : '');

  // Blokta gözle görünen tüm kartlar — gündem şeridi bunların hiçbirini
  // tekrar etmez (ana kart + rotanın/rafın işaretçileri).
  const gorunenIdler = [pick.id].concat(rafMode
    ? raf.slice(1)
    : [EMRE_ONERI.yumusakKart, EMRE_ONERI.uzakDur]).filter(Boolean);

  const html = `<div class="kk-emre${rafMode ? ' kk-emre--raf' : ''}">
    <div class="kk-emre-head">${head}</div>
    ${_donemSerit(kk, gorunenIdler)}
    <button class="kk-emre-main" data-open="${esc(pick.id)}">
      <div class="kk-emre-card">${kkRenderCard3D(pick, { mini: true, locked: true })}</div>
      <div class="kk-emre-txt">
        <div class="kk-emre-headline">${esc(headline)}</div>
        <div class="kk-emre-bar"><i style="width:${clamp(m.score)}%"></i><span>${_pct(m.score)}</span></div>
        ${altLine}
      </div>
    </button>
    ${rafMode ? kkNedenGirisHTML('emre', pick.id) : ''}
    ${route ? `<div class="kk-emre-route">${route}</div>` : ''}
  </div>`;
  return { html, pickId: pick.id };
}

/* ── "KİŞİLER" — yalnızca SAHİPSİZ kartlar: olunabilecek kişiler. En yakın
   önce sıralı + Emre önerisi + canlı "en yakın kişi" spotlight. (Eski "Arketipler") ── */
export function loadKisilerView() {
  const body = document.getElementById('arketipler-body');
  if (!body) return;
  kkEnsureStyles();
  try { window.czEnsureStyles && window.czEnsureStyles(); } catch (_) {}  // Cazibe stilleri (proof/bugünün kişisi/pusula)
  kkTick({ force: true });

  const deck = getFullDeck();
  const kk = S._kisiKarti;
  const sig = kkComputeSignals();                 // ← bir kez (perf: kart-başına değil)
  const { owned, unowned } = kkPartitionDeck(deck, kk.collection);
  const total = deck.length;
  const pct = total ? Math.round((owned.length / total) * 100) : 0;

  // hepsi toplandıysa kutlama
  if (!unowned.length) {
    body.innerHTML = `<div class="kk-wrap kk-wrap--lapis"><div class="kk-empty ikv-panel ikv-panel--lapis">
      <div class="kk-empty-glyph">${ikvLantern(58)}</div>
      <div class="kk-empty-title">${t('kk.empty.title_unowned')}</div>
      <div class="kk-empty-text">${t('kk.empty.text_unowned').replace('{n}', total)}</div>
      <button class="kk-empty-cta ikv-seal-btn" data-goto="kisilerim">${t('kk.empty.cta_mine')}</button>
    </div></div>`;
    body.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => window.switchView && window.switchView(b.dataset.goto)));
    return;
  }

  const scored = kkScoreAndSort(unowned, sig);    // en yakın önce
  const emre = kkEmreBlock(kk, sig);              // canlı öneri rafı ya da Emre'nin curated önerisi
  // Tanıma Motoru (FAZ 2, İ2) — günde 1 gösterim kaydı (09d dedup'lar).
  if (emre.pickId) { try { window.omKaydetGosterim?.('emre', emre.pickId); } catch (_) {} }
  // Spotlight öneri bloğunun kartını tekrar etmez; kalanlar arasında eşikteki
  // kart öne geçer — raf 1.'yi aldıysa spotlight sıradaki eşik kartını taşır.
  // Beyan (FAZ 7) — susturulan kart spotlight havuzuna hiç girmez.
  const spotPool = scored.filter(s => s.card.id !== emre.pickId && !_kkBeyanli(s.card.id));
  // Tanıma Motoru (FAZ 5, İ4) — havuzun İÇİNDEKİ sıra artık seçiciden;
  // "eşikteki kart öne geçer" kuralı (aşağıdaki satır) DEĞİŞMEZ, yalnız
  // hangi eşiksiz kartın önce görüneceğini seçici belirler.
  const spotIds = _secSiraliIdler(spotPool.map(s => s.card.id), 'spotlight', sig);
  const spotById = new Map(spotPool.map(s => [s.card.id, s]));
  const spotOrdered = spotIds.map(id => spotById.get(id)).filter(Boolean);
  const top = spotOrdered.find(s => !!kkEsikDurum(s.card.id)) || spotOrdered[0] || scored[0];
  // `spotOrdered.length` şartı beyan yüzünden eklendi: havuz tamamen
  // susturulmuşsa `top` fallback olarak beyanlı bir karta düşer — o kartı
  // göstermek kullanıcının kararını çiğnemek olurdu. Havuz boşsa Wanderer
  // spotlight'ta susar.
  const showSpot = spotOrdered.length > 0 && !(emre.html && emre.pickId === top.card.id);
  const spotHint = top.m.missing[0] ? top.m.missing[0].hint : '';
  // Cazibe · Azlık — nadirlik + kayıp dürtüsü (sahte sayaç YOK, gerçek nadirlik)
  const topR = RARITIES[top.card.rarity] || RARITIES.yaygin;
  const spotScarce = (top.card.rarity === 'nadide' || top.card.rarity === 'efsane')
    ? `<div class="kk-spot-scarce">${t('kk.spot.scarce').replace('{label}', _rarLabel(topR))}</div>` : '';
  // Eşikteki kartta kayıp dürtüsü susar: beyan baskı altında verilmez, karar
  // kullanıcınındır ("Acele yok — ben bakmaya devam ediyorum.").
  const spotEsik = kkEsikNisanHTML(top.card.id);
  const spotLoss = (!spotEsik && top.m.score >= 55) ? `<div class="kk-spot-loss">${t('kk.spot.loss')}</div>` : '';
  const spotlight = showSpot ? `<div class="kk-neden-wrap"><button class="kk-spot" data-open="${esc(top.card.id)}">
    <div class="kk-spot-card">${kkRenderCard3D(top.card, { mini: true, locked: true })}</div>
    <div class="kk-spot-txt">
      <div class="kk-spot-kicker">${t('kk.spot.kicker')} · ${_pct(top.m.score)}</div>
      <div class="kk-spot-name">${esc(top.card.name)}</div>
      <div class="kk-spot-lesson">"${esc(top.card.lesson || top.card.whisper || '')}"</div>
      <div class="kk-spot-bar"><i style="width:${clamp(top.m.score)}%"></i></div>
      ${spotEsik || (spotHint ? `<div class="kk-spot-hint">→ ${esc(spotHint)}</div>` : '')}
      ${spotScarce}
      ${spotLoss}
    </div>
  </button>${kkNedenGirisHTML('spotlight', top.card.id)}</div>` : '';
  // Tanıma Motoru (FAZ 2, İ2) — günde 1 gösterim kaydı (09d dedup'lar).
  if (showSpot) { try { window.omKaydetGosterim?.('spotlight', top.card.id); } catch (_) {} }

  // Cazibe · Toplumsal Kanıt (öz-kanıt + kabile normu; uydurma sayım YOK)
  let proofHtml = '';
  try {
    const pr = window.czToplumsalKanit && window.czToplumsalKanit();
    if (pr && pr.text) proofHtml = `<div class="cz-proof"><span class="cz-proof-g">◈</span><span class="cz-proof-t">${esc(pr.text)}</span></div>`;
  } catch (_) {}

  // Cazibe · Bugünün Kişisi — Tanıma Motoru FAZ 6 (İ8/K6): günlük deterministik
  // yuva korunur, seçtiği havuz değişir (uniform zar → uğranmamış erdem sondajı).
  let bugunHtml = '';
  try { bugunHtml = _kesifYuvasi(unowned, sig, top.card.id, emre.pickId); } catch (_) {}

  if (_kkFilterUnowned !== 'hepsi' && !unowned.some(d => d.category === _kkFilterUnowned)) _kkFilterUnowned = 'hepsi';
  const chips = kkCatChips(unowned, _kkFilterUnowned);
  const shownScored = scored.filter(s => _kkFilterUnowned === 'hepsi' || s.card.category === _kkFilterUnowned);
  const grid = shownScored.map(({ card, m }, i) => kkLockedCell(card, m, i)).join('');

  body.innerHTML = `
    <div class="kk-wrap kk-wrap--lapis">
      ${kkHallHead({
        lapis: true, pct, num: unowned.length, den: t('kk.people_unit'),
        kicker: t('kk.awaiting_label'),
        note: t('kk.pct_collected').replace('{pct}', pct),
      })}
      ${proofHtml}
      ${emre.html}
      ${spotlight}
      ${bugunHtml}
      <div class="kk-chips">${chips}</div>
      <div class="kk-grid ikv-cascade">${grid}</div>
      <div class="kk-foot">${t('kk.foot_unowned')}</div>
      <button class="cz-pusula-link" id="cz-pusula-link">${t('kk.pusula_link')}</button>
    </div>`;

  kkBindTilt(body);
  body.querySelectorAll('.kk-chip').forEach(b => b.addEventListener('click', () => { _kkFilterUnowned = b.dataset.filter; loadKisilerView(); }));
  body.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => kkOpenDetail(b.dataset.open)));
  // "Neden bu?" (FAZ 7) — giriş düğmeleri kartın butonunun KARDEŞİdir;
  // stopPropagation savunmacıdır (yarın wrap'e bir dinleyici takılırsa
  // panel açmak kart detayını da açmasın).
  body.querySelectorAll('[data-neden]').forEach(b => b.addEventListener('click', (ev) => {
    ev.stopPropagation();
    try { kkNedenAc(b.dataset.neden, b.dataset.nedenId, b.dataset.nedenKesif || null); } catch (_) {}
  }));
  const pusulaBtn = body.querySelector('#cz-pusula-link');
  if (pusulaBtn) pusulaBtn.addEventListener('click', () => { try { window.czPusula && window.czPusula(); } catch (_) {} });
}

// canlı "[İsim]'in Kartı" başlığı
export function kkRenderButunlukHeader() {
  const host = document.getElementById('kk-butunluk-header');
  if (!host) return;
  const kk = S._kisiKarti;
  const p = kk.profile || { dusunceler: 0, inanclar: 0, hisler: 0, davranislar: 0 };
  const rawName = (S.currentUser && (S.currentUser.name || S.currentUser.user_metadata?.name)) || '';
  const nameLine = rawName ? t('kk.butunluk.name_card').replace('{name}', esc(rawName)) : t('kk.butunluk.your_card');
  const avg = Math.round((p.dusunceler + p.inanclar + p.hisler + p.davranislar) / 4);

  const bars = DIMS.map(d => {
    const v = clamp(p[d] || 0);
    return `<div class="kk-live-dim">
      <div class="kk-live-dim-top"><span>${DIM_GLYPH[d]} ${_dimLabel(d)}</span><b>${v}</b></div>
      <div class="kk-live-bar"><i style="width:${v}%"></i></div>
    </div>`;
  }).join('');

  host.innerHTML = `
    <div class="kk-butunluk ikv-panel">
      <div class="kk-butunluk-head">
        <div class="kk-butunluk-id">
          <div class="kk-butunluk-kicker">${t('kk.butunluk.kicker')}</div>
          <div class="kk-butunluk-name">${nameLine}</div>
        </div>
        <div class="kk-butunluk-score">
          ${ikvRing(avg, { size: 64, center: `<b class="kk-butunluk-avg">${avg}</b>` })}
          <span>${t('kk.butunluk.integrity')}</span>
        </div>
      </div>
      <div class="kk-butunluk-dims">${bars}</div>
      <div class="kk-butunluk-note">${t('kk.butunluk.note')}</div>
    </div>`;
}

// kart detayı (3B + boyut + reçete ilerlemesi)
/* Eksik sinyal → ilgili ritüel ekranı (kart toplamayı günlük pratiğe bağlar).
   Kapsamda olmayan sinyaller (temel/derinlik türetilmiş skorlar) için CTA
   yok — yalnız mevcut ipucu metni (kkHint) kalır. */
const RITUAL_ROUTE = {
  reviews: 'degerlendirme',
  selfDialogue: 'konusma',
  gecisStreak: 'oik', gecisReadings: 'oik', gecisCards: 'oik',
  dinlenme: 'dinlenme',
  hayalScenes: 'hayalseans',
  meclisNamed: 'hasimlar', meclisIntegrated: 'hasimlar',
  streak: 'bugun', sessions: 'bugun',
};

function _kkFmtDate(iso) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(S._currentLang === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long' });
  } catch (_) { return ''; }
}

/* ── Hedef mührü yuvası — detay gövdesinde tek yer, iki hâl ───────────────
   Mühür vurulunca tüm detay yeniden çizilmez (giriş animasyonu baştan
   koşardı); yalnız bu yuva takas edilir. */
function _kkHedefSlotHTML(cardId) {
  return kkIsHedef(cardId)
    ? `<div class="kk-hedef-on">
         <span class="kk-hedef-on-mark" aria-hidden="true">◆</span>
         <span class="kk-hedef-on-txt">${t('kk.hedef.already', 'Bu kişi hedefinde — olmak istediğin kişiye işlendi.')}</span>
         <button type="button" class="kk-hedef-undo" data-hedef-sok="${esc(cardId)}">${t('kk.hedef.undo', 'HEDEFTEN ÇIKAR')}</button>
       </div>`
    : `<button type="button" class="kk-hedef-btn ikv-seal-btn" data-hedef-muhurle="${esc(cardId)}">
         ${t('kk.hedef.cta', 'Böyle bir kişi olmak istiyorum.')}
       </button>`;
}

/* ── Oluş beyanı yuvası — "Artık o kişiyim." ──────────────────────────────
   Hedef mührünün ikizi ama karşı kutupta: o "olmak istiyorum" der ve kartı
   lapis desteye yazar; bu "oldum" der ve kanıtı KULLANICIDAN ister (10q4
   sınaması). Beyan barajdan bağımsızdır — kapı sınamadır, reçete değil.
   Sahipli kartta görünmez: olunmuş kişi yeniden beyan edilmez. */
function _kkOlusSlotHTML(cardId) {
  if (S._kisiKarti?.collection?.[cardId]) return '';
  let bekleme = 0;
  try { bekleme = window.olusSinamaBekleme?.(cardId) || 0; } catch (_) {}
  if (bekleme > 0) {
    return `<div class="kk-olus-bekle">${t('olus.sinama.bekleme', 'Bu kişiyi yeniden sınamak için {gun} gün var.').replace('{gun}', bekleme)}</div>`;
  }
  // Eşikteyse nişan düğmenin üstünde durur: Wanderer gördüğünü söylemiş olur,
  // cümleyi kuran yine kullanıcıdır — "Artık o kişiyim."
  return `${kkEsikNisanHTML(cardId)}
    <button type="button" class="kk-olus-btn ikv-seal-btn" data-olus-beyan="${esc(cardId)}">
      ${t('olus.sinama.cta', 'Artık o kişiyim.')}
    </button>`;
}

function _kkBindOlus(portal, cardId) {
  portal.querySelector('[data-olus-beyan]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    // Detay perdesi kapanır: sınama kendi töreninin sahnesini hak eder.
    // Kancanın adresi burada da silinir: portal boşalıyor ama dataset kalırsa
    // (close() siliyor, bu yol silmiyordu) canlı ölçüm ölü bir kimliğe bakar.
    delete portal.dataset.canliKart; delete portal.dataset.canliSahip;
    portal.style.cssText = ''; portal.innerHTML = '';
    // Tanıma Motoru (FAZ 1) — "Artık o kişiyim." CTA'sı detayın kendi ayrı kod
    // yoludur: bakıp kapatmak değil, Oluş'a yönelmek — 'muhur' bu ikisini ayırır.
    try { window.wtOverlayClose?.('kart-detay', 'muhur'); } catch (_) {}
    setTimeout(() => { try { window.olusSinamaAc?.(cardId); } catch (_) {} }, 120);
  });
}

/* Yuvayı yeniden çiz + dinleyicileri tazele (tek giriş: _kkBindHedef). */
function _kkRefreshHedefSlot(portal, cardId) {
  const slot = portal.querySelector('#kk-hedef-slot');
  if (!slot) return;
  slot.innerHTML = _kkHedefSlotHTML(cardId);
  _kkBindHedef(portal, cardId);
}

function _kkBindHedef(portal, cardId) {
  portal.querySelector('[data-hedef-muhurle]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (kkHedefMuhurle(cardId)) _kkHedefSealCeremony(portal, cardId);
  });
  portal.querySelector('[data-hedef-sok]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    kkHedefSok(cardId);
    _kkRefreshHedefSlot(portal, cardId);
  });
}

/* ── MÜHÜR TÖRENİ — "Bu kişi artık hedefinde." ────────────────────────────
   §7: önemli an bir toast değil, sahnelenmiş bir andır. Koreografi 10D'nin
   kart mühürleme anıyla (oik-seal-stamp) aynı dili konuşur: lapis perde
   (hedef = gelecek) → ALTIN mühür damgası (prensip 1: mühür daima altın) →
   altın flaş → karar cümlesi + aforizma → ~2.2 sn sonra sahne çekilir. */
function _kkHedefSealCeremony(portal, cardId) {
  const layer = document.createElement('div');
  layer.className = 'kk-hedef-seal';
  layer.setAttribute('aria-live', 'polite');
  layer.innerHTML = `
    <div class="kk-hedef-seal-veil" aria-hidden="true"></div>
    <div class="kk-hedef-seal-stars" aria-hidden="true"></div>
    <div class="kk-hedef-seal-stage">
      <div class="kk-hedef-seal-stamp" aria-hidden="true">◆</div>
      <div class="kk-hedef-seal-kicker">${t('kk.hedef.seal_kicker', 'HEDEF MÜHRÜ')}</div>
      <div class="kk-hedef-seal-line">${t('kk.hedef.seal_line', 'Bu kişi artık hedefinde.')}</div>
      <div class="kk-hedef-seal-sub">${t('kk.hedef.seal_aphorism', 'İstediğin hayatı o kişi yaşar. Şimdi ona doğru yürü.')}</div>
    </div>
    <div class="kk-hedef-seal-flash" aria-hidden="true"></div>`;
  portal.appendChild(layer);
  try { window.fxCue?.('seal'); } catch (_) {}   // His Motoru (13e) — mühür vuruşu

  const done = () => {
    layer.remove();
    _kkRefreshHedefSlot(portal, cardId);
  };
  // reduced-motion'da animasyonlar kapalı → sahneyi bekletmenin anlamı yok
  const reduced = (() => {
    try { return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches; } catch (_) { return false; }
  })();
  setTimeout(done, reduced ? 700 : 2200);
}

/* Açık detay töreninin Escape dinleyicisi — tekil (bkz. kkOpenDetail sonu). */
let _kkDetOnKey = null;

/* "En ince yerin" — hazırlığı hangi kapı kısıyor. Reçete kapısı takılıysa
   zaten eksikler listesi konuşur; burada yalnız GÖRÜNMEYEN iki kapı
   seslendirilir: dört boyut ikna ve kanıt. Bu cümle olmasa, reçetesi tutmuş
   ama ikna kapısı takılı kart için panel sessiz kalırdı.
   Ayrı fonksiyon çünkü cümlenin İKİ tüketicisi var: detayın ilk çizimi ve
   canlı tazeleme. İkisi aynı cümleyi kurmalı — kopya yazılırsa bir gün
   ayrışırlar. */
function _kkZayifCumle(m) {
  const zayif = kkEnZayifHalka(m);
  if (!zayif || m.hazirlik >= 100) return '';
  if (DIMS.includes(zayif.kapi)) {
    return t('kk.det.zayif', 'En ince yerin: {alan}. Yol oradan kısalır.').replace('{alan}', () => _dimSoft(zayif.kapi));
  }
  return zayif.kapi === 'kanit' ? t('kk.det.zayif_kanit', 'Bu kişi biraz daha zaman ister — yol günlerle örülür.') : '';
}

export function kkOpenDetail(cardId) {
  const card = getCardById(cardId);
  if (!card) return;
  window.wtOverlayOpen?.('kart-detay');   // Kullanım Nabzı (00f)
  // Tanıma Motoru (FAZ 1, İ7) — "bu oturumda en çok hangi kart açıldı" izi.
  try {
    const arr = S._oturumIzi?.kartlar;
    if (arr) { arr.push({ id: cardId, ts: Date.now() }); if (arr.length > 200) arr.splice(0, arr.length - 200); }
  } catch (_) {}
  // Tanıma Motoru (FAZ 2, İ2) — bugün gösterilmiş bir kart açıldıysa artık tepkisiz değil.
  try { window.omKaydetTepki?.(cardId); } catch (_) {}
  kkEnsureStyles();
  try { window.czEnsureStyles && window.czEnsureStyles(); } catch (_) {}  // Cazibe: otorite/azlık stilleri
  const kk = S._kisiKarti;
  const owned = !!kk.collection[cardId];
  const m = kkMatchCard(card, kkComputeSignals());
  const R = RARITIES[card.rarity] || RARITIES.yaygin;
  const scenePalette = owned ? 'gold' : 'lapis';
  const portal = kkPortal('kk-detail-portal', 'var(--z-ceremony)');
  // Canlı ölçümün adresi: kkTick açık detayı buradan tanır (_kkDetayCanli).
  // Sahiplik de yazılır — mühür düşerse yüzey artık başka bir hâli anlatır.
  portal.dataset.canliKart = cardId;
  portal.dataset.canliSahip = owned ? '1' : '0';

  /* ── KARTIN METİN KUTUSU — dört asli unsur ────────────────────────────
     Emre'nin kararı (2026-08-25): bu dördü kartın DIŞINDA duran bir liste
     değil, kartın ASLİ UNSURLARIDIR. Gerçek kartlarda özellikler kartın
     üstünde yazar; bizimkinde yazmıyordu. Artık metin kutusu kartın
     kendisindedir — detay bir sayfa değil, kartın büyük boy hâlidir. */
  const traitBlock = DIMS.map(d => {
    const items = (card[d] || []).slice(0, 4);
    return `<div class="kk-det-trait">
      <div class="kk-det-trait-h">${DIM_GLYPH[d]} ${_dimLabel(d)}</div>
      <ul>${items.map(it => `<li>${esc(it)}</li>`).join('')}</ul>
    </div>`;
  }).join('');

  /* ── ARADAKİ YOL — ölçü kartın üstünde, canlı ──────────────────────────
     Gösterilen sayı DAİMA hazırlıktır, ham skor değil (13x K1): kullanıcının
     gördüğü oran kartın gelişiyle aynı şeyi söylemek zorundadır. Çizgi, sayı
     ve cümle tek kaynaktan (m.hazirlik) beslenir — ayrışamazlar. Sayının kabı
     .kk-det-req-pct'tir; canlı tazeleme onu adresler, cümleyi yeniden kurmaz.
     Sahipli kartta yol yürünmüştür: çizgi tamdır, cümle sayı konuşmaz. */
  const pctB = `<b class="kk-det-req-pct">${_pct(m.hazirlik)}</b>`;
  const yolCumle = owned
    ? t('kk.det.yol.tam', 'Bu yol yüründü — artık bu kişisin.')
    : t('kk.det.yol.label', 'Bu kişiye {n} yakınsın — aradaki yol bugünlerden örülür.').replace('{n}', () => pctB);
  const yolBlock = `<div class="kk-det-yol">
      <div class="kk-det-yol-k">${t('kk.det.yol.kicker', 'ARADAKİ YOL')}</div>
      ${ikvMesafeCizgi(owned ? 100 : m.hazirlik, {
        label: yolCumle,
        aria: t('kk.det.yol.aria', 'Aradaki yol — sabır ve tevekkül'),
      })}
    </div>`;

  // Cazibe · Azlık — nadir kartın künyesinde rozet (kart yüzünde, nadirlik satırında)
  const scarceTag = (card.rarity === 'nadide' || card.rarity === 'efsane') ? t('kk.det.scarce_tag', ' · ◇ AZ BULUNUR') : '';

  const kartKutu = `<div class="kk-det-kutu">
    <div class="kk-det-traits-h">${owned ? t('kk.det.inner_owned', 'BU KİŞİNİN İÇ DÜNYASI') : t('kk.det.inner_unowned', 'BU KİŞİ — DÜŞÜNÜR, İNANIR, HİSSEDER, YAPAR')}</div>
    <div class="kk-det-traits">${traitBlock}</div>
    ${yolBlock}
  </div>`;

  /* BOY KART — törenin tek nesnesi. SİS DÜŞER (K5): gövde metni kartın adını
     zaten söylüyordu; tek kartta "? ? ?" kendi kendisiyle çelişirdi. Kilit
     sahnede yaşar — kilitli kart lapis kalır ve nefes almaz, ama kim olduğunu
     saklamaz. Izgaradaki sis dokunulmadan durur (orası keşif yüzeyidir). */
  const face = ikvCardFace(card, {
    boy: true,
    palette: scenePalette,
    kicker: owned ? t('kk.card.kicker_owned') : t('kk.card.kicker_locked'),
    badge: owned ? t('kk.card.badge_owned') : t('kk.card.badge_locked'),
    sub: owned ? undefined : t('kk.card.sub_locked'),
    rarLabel: _rarLabel(R) + scarceTag + (owned ? t('kk.det.in_collection', ' · KOLEKSİYONDA') : ''),
    rarColor: R.color,
    mertebe: owned ? ((kk.collection[cardId] && kk.collection[cardId].mertebe) || 0) : 0,
    evrimden: kkEvrimEtiketi(kkEvrim(card.id)?.onceki),
    locked: !owned,
    extra: kartKutu,
  });

  // yakınlık = yol halkası (altın→lapis): şimdiden bu kişiye akan ilerleme +
  // ritüel çipleri (her eksik sinyal, günlük bir pratiğe kapı açar) +
  // toplumsal kanıt (Cazibe) + eşiğe-çok-yakın vurgusu (near-miss).
  let reqBlock = '';
  if (!owned) {
    const chips = m.missing.slice(0, 4).map(x => {
      const view = RITUAL_ROUTE[x.key];
      return view
        ? `<button type="button" class="kk-det-route-chip" data-goto="${esc(view)}">${esc(x.hint)}</button>`
        : `<li>${esc(x.hint)}</li>`;
    });
    const chipBtns = chips.filter(c => c.startsWith('<button')).join('');
    const plainLis = chips.filter(c => c.startsWith('<li')).join('');
    // Eşiğe yakınlık artık HAZIRLIK cinsinden ölçülür (13x): %100 = kart
    // sunulabilir, dolayısıyla "çok yakınsın" eşiği de o ölçüde ifade edilir.
    // Eski hâl ham skora bakıyordu — kart gelmeye hazırken bile susabiliyor,
    // ikna kapısı takılıyken "çok yakınsın" diyebiliyordu.
    const nearMiss = m.hazirlik >= 85 && m.hazirlik < 100;
    const zayifTxt = _kkZayifCumle(m);
    let proofHtml = '';
    try {
      const pr = window.czToplumsalKanit && window.czToplumsalKanit();
      if (pr && pr.text) proofHtml = `<div class="cz-proof"><span class="cz-proof-g">◈</span><span class="cz-proof-t">${esc(pr.text)}</span></div>`;
    } catch (_) {}
    /* Ölçü artık burada DEĞİL — kartın üstündeki çizgide (yolBlock). Bu panel
       sayıyı tekrar etmez, yolun nasıl kısalacağını söyler: eşiğe yakınlık,
       en ince yer, hangi ritüelin kapı açtığı.
       Üç durum satırı HER ZAMAN basılır ve `hidden` ile açılır-kapanır:
       canlı tazeleme (kkTick) DOM kurmasın, yalnız görünürlük ve metin
       değiştirsin — dinleyicili düğümler yeniden doğmaz. */
    reqBlock = `<div class="kk-det-req ikv-panel--lapis">
      <div class="kk-det-req-h">${t('kk.det.req_head', 'BU KİŞİYE DÖNÜŞMEK İÇİN')}</div>
      <div class="kk-det-near"${nearMiss ? '' : ' hidden'}>${t('kk.det.near_miss', '✦ çok yakınsın')}</div>
      <div class="kk-det-zayif"${zayifTxt ? '' : ' hidden'}>${esc(zayifTxt)}</div>
      ${plainLis ? `<ul class="kk-det-req-list">${plainLis}</ul>` : ''}
      <div class="kk-det-req-ok"${(!chipBtns && !plainLis && m.hazirlik === 100) ? '' : ' hidden'}>${t('kk.det.threshold', '✦ Eşiktesin — yakında seninle.')}</div>
      ${chipBtns ? `<div class="kk-det-route">${chipBtns}</div>` : ''}
      ${proofHtml}
    </div>`;
  }

  // SENTEZ (K4) — bileşik kartın malzemeleri. Sahipliyse "bunlardan doğdun",
  // sahipsizse hangi niteliğin eksik olduğunu gösterir (kullanıcı neyi
  // beklediğini görür — bileşik kart sessizce ulaşılmaz kalmaz).
  // Erdem etiketi 13l'nin `im.virtue.*` sözlüğünden (tek kaynak reuse).
  let sentezBlock = '';
  const sz = kkSentezDurum(card, kk.collection);
  if (sz) {
    const slot = (kart, virtue) => kart
      ? `<div class="kk-sz-slot">${kkRenderCard3D(kart, { mini: true })}<span class="kk-sz-ad">${esc(kart.name)}</span></div>`
      : `<div class="kk-sz-slot kk-sz-slot--bos"><span class="kk-sz-q">?</span><span class="kk-sz-ad">${esc(t('im.virtue.' + virtue, virtue))}</span></div>`;
    sentezBlock = `<div class="kk-det-sentez ${owned ? 'ikv-panel' : 'ikv-panel ikv-panel--lapis'}">
      <div class="kk-sz-head">${owned ? t('kk.sentez.det_owned', 'BU İKİSİNDEN DOĞDUN') : t('kk.sentez.det_need', 'BU İKİSİNDEN DOĞAR')}</div>
      <div class="kk-sz-row">
        ${slot(sz.kart1, sz.v1)}<span class="kk-sz-plus">⧉</span>${slot(sz.kart2, sz.v2)}
      </div>
      ${(!owned && sz.hazir) ? `<div class="kk-sz-ready">${t('kk.sentez.det_ready', '⧉ SENTEZE HAZIR — ikisi de sende')}</div>` : ''}
    </div>`;
  }

  // PANZEHİR (K6) — gölge kartında karşıt kutup. Açıksa ışığın adı verilir,
  // kapalıysa hangi erdemin aranacağı söylenir (yol gösterir, dayatmaz).
  let panzehirBlock = '';
  const pz = kkPanzehir(card, kk.collection);
  if (pz) {
    const erdemAd = t('im.virtue.' + pz.erdem, pz.erdem);
    panzehirBlock = pz.acik
      ? `<div class="kk-det-panzehir is-open">
          <span class="kk-pz-seal">✦</span>
          <div class="kk-pz-body">
            <div class="kk-pz-h">${t('kk.panzehir.open_h', 'PANZEHİR SENDE')}</div>
            <button type="button" class="kk-pz-card" data-open="${esc(pz.kart.id)}">${esc(pz.kart.name)}</button>
          </div>
        </div>`
      : `<div class="kk-det-panzehir">
          <span class="kk-pz-seal kk-pz-seal--dim">◇</span>
          <div class="kk-pz-body">
            <div class="kk-pz-h">${t('kk.panzehir.closed_h', 'PANZEHİRİ')}</div>
            <div class="kk-pz-need">${t('kk.panzehir.closed_need', '{erdem} erdemini taşıyan bir kişi ol.').replace('{erdem}', esc(erdemAd))}</div>
          </div>
        </div>`;
  }

  // Sahiplik izleri — ne zaman bu kişi oldun + şu anki kimliğin mi
  let traceBlock = '';
  if (owned) {
    const earned = kk.collection[cardId];
    const isCurrent = !!(window.imIsCurrentPersona && window.imIsCurrentPersona(cardId));
    const dateTxt = earned?.earnedAt ? t('kk.det.earned_on', '{date} günü bu kişi oldun').replace('{date}', _kkFmtDate(earned.earnedAt)) : '';
    if (dateTxt || isCurrent) {
      traceBlock = `<div class="kk-det-trace">
        ${dateTxt ? `<span>${esc(dateTxt)}</span>` : ''}
        ${isCurrent ? `<span class="kk-det-trace-crown">${t('kk.det.is_current_persona', '✦ şu an bu kişisin')}</span>` : ''}
      </div>`;
    }
  }

  // "Bir Kişi" yüzü — portre + gerçek hayat sahnesi + dönüşüm vaadi + kök (alan yoksa gizlenir)
  const portreBlock = card.portre ? `<div class="kk-det-portre">${esc(card.portre)}</div>` : '';
  const sceneBlock  = card.gercek ? `<div class="kk-det-scene"><span class="kk-det-scene-h">${t('kk.det.real_life', '◉ GERÇEK HAYATTA')}</span>${esc(card.gercek)}</div>` : '';
  const becomeBlock = card.olunca ? `<div class="kk-det-become"><span class="kk-det-become-h">${t('kk.det.when_become', '⟡ SEN BU KİŞİ OLDUĞUNDA')}</span>${esc(card.olunca)}</div>` : '';
  // Cazibe · Otorite — kaynak künyesi (kök) otoriter çerçevelenir
  // (Azlık rozeti artık kartın KENDİ nadirlik satırında — bkz. scarceTag.)
  const kokBlock    = card.kok    ? `<div class="kk-det-kok">${t('kk.det.source', '◆ KAYNAK ·')} ${esc(card.kok)}<span class="kk-det-auth">${t('kk.det.source_auth', 'Wanderer · iki kitabın öğretisinden')}</span></div>` : '';

  // HEDEF MÜHRÜ — yalnız SAHİPSİZ kartta: "Böyle bir kişi olmak istiyorum."
  // Olunmuş kişi hedeflenmez (zaten osun), o yüzden Kişilerim'de görünmez.
  // Yeri bilinçli: "Sen Bu Kişi Olduğunda" vaadini okuduğun anın hemen altı.
  const hedefBlock = owned ? '' : _kkHedefSlotHTML(cardId);
  const olusBlock = owned ? '' : _kkOlusSlotHTML(cardId);   // "Artık o kişiyim."

  /* TÖREN "Huzura Çıkış" — kartın kendi dünyası tam ekrana taşar, ortasında
     KARTIN BÜYÜK BOY HÂLİ durur: kimliği, dört asli unsuru ve aradaki yolu
     kendi üstünde taşıyan tek nesne. Altında eşik açılır — anlatı, beyan ve
     kaynak (ikv-cascade ile kademeli). Kart bir sayfaya bölünmez; sayfa
     kartın ETEĞİDİR. */
  portal.innerHTML = `
    <div class="kk-det-backdrop" aria-hidden="true">${ikvComposeBackdrop(card, { palette: scenePalette })}</div>
    <div class="kk-det-veil"></div>
    <div class="kk-det" style="--rar:${R.color}">
      <div class="kk-det-dawn" aria-hidden="true"></div>
      <button class="kk-det-close" id="kk-det-close" aria-label="×">×</button>
      <div class="kk-det-flip" id="kk-det-flip">
        <div class="kk-det-aura" aria-hidden="true"></div>
        <div class="kk-det-flip-inner">
          <div class="kk-det-face">${face}</div>
          <div class="kk-det-back" aria-hidden="true">${ikvCardBack({ boy: true })}</div>
        </div>
      </div>
      <button type="button" class="kk-det-flip-hint" id="kk-det-flip-btn">${t('kk.det.flip_hint', 'karta dokun, sırtını gör')}</button>
      <div class="kk-det-body ikv-cascade">
        <div class="kk-det-lesson" style="--i:0">"${esc(card.lesson || card.whisper || '')}"</div>
        <div style="--i:1">${traceBlock}</div>
        <div style="--i:2">${portreBlock}</div>
        <div style="--i:3">${sceneBlock}</div>
        <div style="--i:4">${becomeBlock}</div>
        <div style="--i:5" id="kk-olus-slot">${olusBlock}</div>
        <div style="--i:5" id="kk-hedef-slot">${hedefBlock}</div>
        <div style="--i:6">${reqBlock}</div>
        <div style="--i:7">${sentezBlock}</div>
        <div style="--i:7">${panzehirBlock}</div>
        <hr class="ikv-hairline" style="--i:8" aria-hidden="true">
        <div style="--i:8">${kokBlock}</div>
      </div>
    </div>`;
  kkBindTilt(portal);
  /* Boy kart 12c'nin kendi kabuğunda (.kk-card3d yok) — eğim 'wrap' modundan
     gelir: motor kartı .ikv-holo sarmalayıcısına alır, flip kabının duruşunu
     bozmadan bileşir. Yalnız ÖN yüze takılır; sırt çevrilmeden görünmez ve
     iki yüze birden takmak tek 3B kabı kuralını kırardı (13B emsali). */
  try {
    const faceCard = portal.querySelector('.kk-det-face .ikv-card');
    if (faceCard) window.ikvHoloAttach?.(faceCard, { mode: 'wrap', max: 4 });
  } catch (_) {}
  const close = () => {
    // Tanıma Motoru (FAZ 1) — ×/Escape/dışa dokunuş: bakıp ayrılmak, Oluş'a
    // yönelmedi ('muhur' yalnız _kkBindOlus'un CTA yolunda, yukarıda).
    window.wtOverlayClose?.('kart-detay', 'kapat');
    if (_kkDetOnKey) { document.removeEventListener('keydown', _kkDetOnKey); _kkDetOnKey = null; }
    delete portal.dataset.canliKart; delete portal.dataset.canliSahip;
    portal.style.cssText = ''; portal.innerHTML = '';
  };
  // Törenden çıkış üç kapıdan: mühür (×), eşiğin dışına dokunmak, Escape.
  // Veil `pointer-events:none` (backdrop'un üstünde saf görsel katman) —
  // dıştaki dokunuş bu yüzden .kk-det'in KENDİSİNE düşer, veile değil.
  // Escape dinleyicisi MODÜL kapsamında tekil: detaydan detaya geçiş (panzehir
  // kartı) portalı kapatmadan yeniden yazar, kapanış closure'ı çağrılmaz —
  // her açılışta öncekini sökmezsek document'te dinleyici birikir.
  if (_kkDetOnKey) document.removeEventListener('keydown', _kkDetOnKey);
  _kkDetOnKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', _kkDetOnKey);
  portal.querySelector('#kk-det-close').addEventListener('click', close);
  const detEl = portal.querySelector('.kk-det');
  detEl?.addEventListener('click', (e) => { if (e.target === detEl) close(); });
  // Detay içinden detaya geçiş — panzehir kartı ("PANZEHİR SENDE"). Salon
  // yüzeylerinin [data-open] bağlayıcısı `body` üzerinde çalışır, portal onun
  // DIŞINDA yaşar; bağlamazsak buton sessizce ölü kalır.
  portal.querySelectorAll('[data-open]').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    kkOpenDetail(btn.getAttribute('data-open'));
  }));
  /* FLİP — kart artık üstünde etkileşimli öğe taşıyor (aradaki yol çizgisi
     bir kapıdır). Kartın her yerine dokunmak hâlâ çevirir, ama düğmeye
     dokunmak ÇEVİRMEZ: delege kapısı flip'i yutar. Kartın kendisi role=button
     DEĞİLDİR — içinde gerçek butonlar var, iç içe düğme erişilebilirliği
     kırardı; klavye kapısı ipucu satırının kendisidir (#kk-det-flip-btn). */
  const flipEl = portal.querySelector('#kk-det-flip');
  const toggleFlip = () => flipEl && flipEl.classList.toggle('is-flipped');
  flipEl?.addEventListener('click', (e) => {
    if (e.target.closest('button,a,[data-goto],[data-open],[data-hedef-muhurle],[data-hedef-sok],[data-olus-beyan]')) return;
    toggleFlip();
  });
  portal.querySelector('#kk-det-flip-btn')?.addEventListener('click', (e) => { e.stopPropagation(); toggleFlip(); });
  /* Aradaki yol çizgisi Sabır Kartı'na açılır: "ne kadar" kulun ölçtüğü,
     "ne zaman" Allah'ın bildiğidir. Kart 10f'te yaşar, köprü window'dan. */
  portal.querySelector('.kk-det-yol .ikv-ms--btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    try { window.yolOpenSabir?.(); } catch (_) {}
  });
  portal.querySelectorAll('[data-goto]').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const view = btn.getAttribute('data-goto');
    close();
    try { window.switchView && window.switchView(view); } catch (_) {}
  }));
  if (!owned) { _kkBindHedef(portal, cardId); _kkBindOlus(portal, cardId); }
}

/* ── ARADAKİ YOL CANLIDIR — açık detayın ölçüsünü tazeler ─────────────────
   Emre'nin isteği (2026-08-25): yüzde "gerçek zamanlı ölçülsün". Yeni bir
   zamanlayıcı KURULMAZ — kkTick zaten 4 sn'de bir, her kullanıcı mesajında
   ve sekme geri geldiğinde dönüyor; ölçü orada doğuyor. Burada yapılan tek
   şey, doğmuş ölçüyü açık yüzeye yazmak.

   Yeniden çizim YOK: tek CSS değişkeni + birkaç metin yazılır. Sebebi
   mekanik — detay dinleyicili düğümler taşır (hedef mührü, oluş beyanı,
   rota çipleri, panzehir); innerHTML tazelemek onları koparır ve kullanıcı
   tam dokunurken düğme altından kayar. Durum satırları bu yüzden ilk
   çizimde HER ZAMAN basılır, burada yalnız `hidden` açılıp kapanır.

   Eksikler listesi ve rota çipleri bilerek TAZELENMEZ: onlar dinleyicili
   ve sıraları kullanıcının okuduğu metni oynatır — bir sonraki açılışta
   yenilenirler. Yürünmüş yol da tazelenmez: sahipli kartta çizgi tamdır. */
export function _kkDetayCanli() {
  const p = document.getElementById('kk-detail-portal');
  if (!p || !p.dataset.canliKart || !p.childElementCount) return false;
  const cardId = p.dataset.canliKart;
  const card = getCardById(cardId);
  if (!card) return false;
  const owned = !!(S._kisiKarti && S._kisiKarti.collection && S._kisiKarti.collection[cardId]);
  // Sahiplik değiştiyse (mühür bu tick'te düştü ya da başka cihazdan geldi)
  // yüzeyin yarısı yanlış: palet, iz, beyan yuvaları hepsi değişir. Parça
  // yazmak yetmez — tören yeniden kurulur (panzehir geçişinin emsali).
  if (owned !== (p.dataset.canliSahip === '1')) { kkOpenDetail(cardId); return true; }
  if (owned) return false;
  const m = kkMatchCard(card, kkComputeSignals());
  const cizgi = p.querySelector('.kk-det-yol .ikv-ms');
  if (cizgi) cizgi.style.setProperty('--ms-pct', m.hazirlik + '%');
  const pct = p.querySelector('.kk-det-req-pct');
  if (pct) pct.textContent = _pct(m.hazirlik);
  const near = p.querySelector('.kk-det-near');
  if (near) near.hidden = !(m.hazirlik >= 85 && m.hazirlik < 100);
  const zayif = p.querySelector('.kk-det-zayif');
  if (zayif) {
    const cumle = _kkZayifCumle(m);
    zayif.textContent = cumle;
    zayif.hidden = !cumle;
  }
  const ok = p.querySelector('.kk-det-req-ok');
  if (ok) {
    ok.hidden = !(m.hazirlik === 100 && !p.querySelector('.kk-det-route-chip') && !p.querySelector('.kk-det-req-list'));
  }
  return true;
}

/* ── Kişilerim özeti (Studio oda sayacı + Bugün destesi tüketir) ─────────── */
export function getKisilerimStats() {
  const deck = getFullDeck();
  const kk = S._kisiKarti;
  const earned = Object.keys(kk.collection).length;
  return { total: deck.length, earned, pct: deck.length ? Math.round((earned / deck.length) * 100) : 0, closest: kk.closest };
}
/* ════════════════════════════════════════════════════════════════════════
   8b) HEDEF MÜHRÜ — "Böyle bir kişi olmak istiyorum"
   ───────────────────────────────────────────────────────────────────────
   Kişiler'de (sahipsiz kartlar) kullanıcı bir kişiyi HEDEFE koyar. Mühür
   iki yere birden düşer:
     1) S._kisiKarti.hedefler  → Bugün'ün LAPİS destesinin kaynağı
     2) OİK kartı (10D oikAbsorbCard) → o kişinin 4 boyutu hedef kimliğe işlenir
   Böylece kazanım altın tarafı (porAbsorbCard), mühür lapis tarafı besler —
   iki kutup da kullanıcının hareketinden doğar.

   Mühür yalnız SAHİPSİZ kartta anlamlıdır: kart zaten kazanılmışsa o kişi
   OLUNMUŞTUR, hedef değildir (kkTick mezuniyette mührü kendiliğinden düşürür).
═══════════════════════════════════════════════════════════════════════════ */
/** Hedef mührü vurulmuş kart id'leri — en yeni mühür başta (lapis deste sırası). */
export function kkGetHedefler() {
  const h = S._kisiKarti?.hedefler || {};
  return Object.keys(h)
    .filter(id => !S._kisiKarti.collection[id])   // kazanılmışsa artık hedef değil
    .sort((a, b) => new Date(h[b]?.at || 0) - new Date(h[a]?.at || 0));
}

/** KAZANIMIN ZAMAN EKSENİ — ay ay kaç kişi olundu.
 *
 *  Salon `earned/total` gösterir; kartların `at` damgası (kk.history, 300
 *  kayıt) hiç okunmuyordu — "bu ay üç kişi oldun" cümlesi kurulabilirken
 *  kurulmuyordu. Kanıtsızsa `[]` döner (§6.10: kazanım yoksa sayı da yok).
 *  Sıra eskiden yeniye; `kartlar` o ayın id'leridir (yüzey isterse kart
 *  gösterebilsin diye — ikinci bir okuma yolu açılmasın).
 *  @returns {{ay:string, n:number, kartlar:string[]}[]} */
export function kkKazanimAylik() {
  try {
    const hist = S._kisiKarti?.history || [];
    const aylar = new Map();
    for (const h of hist) {
      // Ay anahtarı YEREL okunur (_yerelAy): damga UTC'dir, kullanıcı değil.
      // Damga YOKSA kayıt sayıma girmez — argümansız `_yerelAy()` bugünü
      // döndürür ve tarihsiz bir kaydı bu aya yazmak ölçü uydurmaktır (§6.10).
      const ay = (h && h.at) ? _yerelAy(h.at) : '';
      if (ay.length !== 7 || !h.cardId) continue;
      const kayit = aylar.get(ay) || { ay, n: 0, kartlar: [] };
      kayit.n++;
      kayit.kartlar.push(h.cardId);
      aylar.set(ay, kayit);
    }
    return [...aylar.values()].sort((a, b) => a.ay.localeCompare(b.ay));
  } catch (_) { return []; }
}

/** Bu kart hedefte mi? */
export function kkIsHedef(cardId) {
  return !!(S._kisiKarti?.hedefler && S._kisiKarti.hedefler[cardId]);
}

/** Hedef mührünü vur. Döner: mühür DÜŞTÜ mü (kkHedefSok ile simetrik).
 *  İşlenen madde sayısı hedef kaydında (`absorbed`) yaşar — tören onu
 *  göstermez (sayaç dili yok), yalnız kararı gösterir. */
export function kkHedefMuhurle(cardId) {
  const kk = S._kisiKarti;
  const card = getCardById(cardId);
  if (!kk || !card) return false;
  if (!kk.hedefler) kk.hedefler = {};
  if (kk.collection[cardId]) return false;      // olunmuş kişi hedeflenmez
  if (kk.hedefler[cardId]) return false;        // zaten hedefte (idempotent)
  let absorbed = 0;
  try { absorbed = window.oikAbsorbCard?.(card) || 0; } catch (_) {}
  kk.hedefler[cardId] = { at: new Date().toISOString(), absorbed };
  kkSaveDebounced();
  // İlk hedef mührü UFUK sırtını açar: hayale bakmayı seçmenin kaydı (lapis).
  try { kkSirtKazan('ufuk'); } catch (_) {}
  // Kimlik Motoru (13l): olay DOĞRUDAN düşülmez — 'hedef_muhru' taksonomisinin
  // kendi sayacı var, imObserve artışı kendi turunda yakalar. Doğrudan imEvent
  // çağırmak sayaçla birlikte çifte kayıt olurdu.
  try { window.wsSyncStudio?.(); } catch (_) {}
  try { window.yolRenderHero?.(); } catch (_) {}          // Bugün lapis destesi tazelenir
  return true;
}

/** Mührü sök — OİK kartından o kartın ref izli maddeleri de çeker. */
export function kkHedefSok(cardId) {
  const kk = S._kisiKarti;
  if (!kk?.hedefler || !kk.hedefler[cardId]) return false;
  delete kk.hedefler[cardId];
  try { window.oikReleaseCard?.(cardId); } catch (_) {}
  kkSaveDebounced();
  try { window.wsSyncStudio?.(); } catch (_) {}
  try { window.yolRenderHero?.(); } catch (_) {}
  return true;
}

/* ════════════════════════════════════════════════════════════════════════
   9) INIT
═══════════════════════════════════════════════════════════════════════════ */
let _kkInited = false;
export async function kkInit() {
  if (_kkInited) return; _kkInited = true;
  kkEnsureStyles();
  // Giriş ipucu Wanderer LLM ön yüzünde ertelendiyse, kullanıcı Studio'ya
  // (chat-dışı bir ekrana) geçtiğinde sun.
  switchViewHooks.after((v) => { if (v !== 'chat') { try { kkPresentIntroToast(); } catch (_) {} } });
  await kkLoad();
  await kkSyncFromSupabase();   // bulut koleksiyonunu birleştir (cihazlar arası)
  kkBackfill();
  // idle tick — foreground'da hafif sürekli ölçüm ("her saniye" hissi)
  setInterval(() => { if (document.visibilityState === 'visible') kkTick(); }, 4000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    kkTick({ force: true });
    try { window.olusDavetSun?.(); } catch (_) {}
  });
  // Oluş Mührü (10q4) — kkMaybePresent'in kuyruk zinciri K0'da söküldü; yerini
  // bu tek çağrı aldı. Stok sunmaz: rafın en güçlü kartını GÜNDE BİR sorar,
  // kendi kapıları (gün hakkı, yazıyor mu, sekme görünür mü) 10q4'tedir.
  // TDZ-güvenli window erişimi — 10q4 bu modülü import eder, tersi olmaz.
  setTimeout(() => { try { window.olusDavetSun?.(); } catch (_) {} }, 1500);
}

/* ════════════════════════════════════════════════════════════════════════
   STİLLER (JS-enjekte) — 80'ler paket + 3B holo + koleksiyon + nudge
═══════════════════════════════════════════════════════════════════════════ */
export function kkEnsureStyles() {
  if (document.getElementById('kk-styles')) return;
  const css = `
  /* ── 80'ler paket ── */
  #kk-pack-portal,#kk-detail-portal{font-family:var(--cinzel,'Cinzel',serif);}
  .kk-pack-veil{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,rgba(40,20,60,0.5),rgba(6,6,8,0.97));backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);animation:kkFade .3s ease;}
  .kk-scanlines{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,0.04) 0 1px,transparent 1px 3px);mix-blend-mode:overlay;opacity:.5;animation:kkScan 8s linear infinite;}
  .kk-pack-stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;}
  .kk-pack-kicker{font-size:11px;letter-spacing:5px;font-weight:700;color:#ffd76a;text-shadow:0 0 12px rgba(255,180,60,.8);animation:kkBlink 1.4s steps(2) infinite;}
  /* Kabuk TEK dilde konuşur: içindekini önceden söylemez. Eskiden dört
     nadirlik gradyanı vardı ve paket daha yırtılmadan "içeride efsane var"
     diye bağırıyordu — merak açılıştan önce tükeniyordu. Nadirlik sinyali
     kartın kendisine indi (Beklenti Işığı, aşağıda). */
  .kk-pack{position:relative;width:240px;height:340px;border-radius:10px;cursor:pointer;overflow:hidden;border:2px solid rgba(255,255,255,.25);background:linear-gradient(150deg,#3a4a5a,#1a2230 60%,#0e1420);box-shadow:0 20px 60px rgba(0,0,0,.6),inset 0 0 30px rgba(255,255,255,.12);animation:kkPackIn .6s cubic-bezier(.2,1.4,.4,1) both,kkPackWobble 3.2s ease-in-out .6s infinite;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:22px 0;}
  .kk-pack-foil{position:absolute;inset:0;background:linear-gradient(115deg,transparent 20%,rgba(255,255,255,.5) 38%,rgba(120,220,255,.4) 46%,rgba(255,120,220,.4) 54%,transparent 70%);background-size:300% 300%;mix-blend-mode:screen;opacity:.85;animation:kkFoil 3.5s linear infinite;}
  .kk-pack-shine{position:absolute;top:-60%;left:-30%;width:60%;height:220%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);transform:rotate(18deg);animation:kkShine 2.6s ease-in-out infinite;}
  .kk-pack-top{font-size:18px;letter-spacing:6px;font-weight:700;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.5);z-index:2;}
  .kk-pack-mid{text-align:center;z-index:2;}
  .kk-pack-logo{font-size:46px;color:#fff;filter:drop-shadow(0 0 14px rgba(255,255,255,.7));}
  .kk-pack-sub{font-size:13px;letter-spacing:4px;color:#fff;font-weight:600;margin-top:6px;}
  .kk-pack-series{font-size:8px;letter-spacing:3px;color:rgba(255,255,255,.7);margin-top:8px;}
  .kk-pack-barcode{display:flex;gap:2px;height:26px;background:#fff;padding:4px 8px;border-radius:2px;z-index:2;}
  .kk-pack-barcode i{width:2px;height:100%;background:#111;}
  .kk-pack-barcode i:nth-child(2n){width:1px;}.kk-pack-barcode i:nth-child(3n){width:3px;}
  .kk-pack-rip{position:absolute;top:0;left:0;right:0;height:14%;border-bottom:2px dashed rgba(255,255,255,.5);}
  .kk-pack--rip{animation:kkPackRip .6s ease forwards!important;}
  .kk-pack-hint{font-size:9px;letter-spacing:3px;color:rgba(255,255,255,.6);animation:kkBlink 1.6s steps(2) infinite;}
  .kk-pack-reveal{display:flex;flex-direction:column;align-items:center;gap:14px;}
  .kk-reveal-in{animation:kkRevealIn .8s cubic-bezier(.2,1.3,.4,1) both;transform-style:preserve-3d;}
  .kk-reveal-in .kk-card3d{transform-style:preserve-3d;}
  .kk-pack-caption{text-align:center;max-width:300px;animation:kkRise .6s ease .3s both;}
  .kk-pack-cap-rar{font-size:11px;letter-spacing:4px;font-weight:700;}
  .kk-pack-cap-name{font-size:17px;letter-spacing:2px;color:#fff;font-weight:700;margin-top:4px;}
  .kk-pack-cap-lesson{font-family:var(--serif,Georgia);font-style:italic;font-size:12px;color:var(--gold,#d4af55);margin-top:8px;line-height:1.5;}
  .kk-pack-cap-portre{font-family:var(--serif,Georgia);font-size:11px;color:rgba(255,255,255,.72);margin-top:8px;line-height:1.55;}
  .kk-pack-cap-owner{font-size:9px;letter-spacing:2px;color:rgba(255,255,255,.5);margin-top:8px;}
  .kk-pack-cap-portre{font-family:var(--serif,Georgia);font-style:italic;font-size:11px;color:var(--gold,#d4af55);margin-top:8px;line-height:1.5;opacity:.9;}
  .kk-pack-actions{display:flex;gap:10px;}
  .kk-fade-in{animation:kkFade .5s ease both;}
  .kk-burst::before{content:'';position:absolute;top:42%;left:50%;width:10px;height:10px;border-radius:50%;box-shadow:0 0 0 0 rgba(255,220,140,.9);animation:kkBurst 1s ease-out both;}
  .kk-btn-primary{background:var(--gold,#d4af55);color:#1a1206;border:none;padding:12px 20px;font-family:var(--cinzel,serif);font-size:11px;letter-spacing:2px;font-weight:700;cursor:pointer;border-radius:3px;}
  .kk-btn-ghost{background:transparent;color:rgba(255,255,255,.7);border:1px solid rgba(255,255,255,.3);padding:12px 18px;font-family:var(--cinzel,serif);font-size:11px;letter-spacing:2px;cursor:pointer;border-radius:3px;}

  /* ── EVRİM TÖRENİ (K3) — eski kart soluklaşır, yeni kart ışıktan doğar ──
     Paketin folyo yırtması burada YOK: evrim koparak değil derinleşerek olur.
     İki kart üst üste; dönüşüm class-toggle ile (transition, keyframe değil →
     dolan animasyonun class transformunu ezmesi GOTCHA'sı hiç doğmaz). */
  .kk-ev-stage{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;padding:20px;max-width:min(92vw,420px);}
  .kk-ev-cards{position:relative;width:min(62vw,240px);aspect-ratio:5/7;}
  .kk-ev-old,.kk-ev-new{position:absolute;inset:0;
    transition:opacity 1.05s var(--ease-out,cubic-bezier(0.16,1,0.3,1)),transform 1.05s var(--ease-out,cubic-bezier(0.16,1,0.3,1));}
  .kk-ev-new{opacity:0;transform:scale(.84);}
  .kk-ev-stage.is-evolving .kk-ev-old{opacity:0;transform:scale(.92) translateY(-8px);}
  .kk-ev-stage.is-evolving .kk-ev-new{opacity:1;transform:scale(1);}
  .kk-ev-burst{position:absolute;inset:-16%;pointer-events:none;opacity:0;border-radius:50%;
    background:radial-gradient(circle,rgba(247,199,68,.5),transparent 62%);}
  .kk-ev-stage.is-evolving .kk-ev-burst{animation:kkEvBurst 1.5s var(--ease-out,ease-out) both;}
  @keyframes kkEvBurst{0%{opacity:0;transform:scale(.65)}36%{opacity:.85}100%{opacity:0;transform:scale(1.3)}}
  .kk-ev-title{font-family:var(--cinzel,serif);font-size:15px;letter-spacing:2.5px;color:var(--gold,#d4af55);font-weight:700;margin-bottom:6px;}
  .kk-ev-sub{font-family:var(--serif,Georgia);font-style:italic;font-size:12px;color:rgba(255,255,255,.55);margin-top:10px;}
  /* ── SENTEZ TÖRENİ (K4) — iki malzeme merkezde birleşir, üçüncü doğar ──
     Malzemeler mini kart olarak iki yandan gelir (holo soyulur: mini kart
     parlamaz), merkezde solup yerlerini senteze bırakır. */
  .kk-sy-stage{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;padding:20px;max-width:min(92vw,440px);}
  .kk-sy-cards{position:relative;width:min(66vw,260px);aspect-ratio:5/7;}
  .kk-sy-mat{position:absolute;top:18%;width:46%;
    transition:opacity .9s var(--ease-out,ease),transform .9s var(--ease-out,ease);}
  .kk-sy-mat--l{left:-6%;transform:translateX(0) rotate(-7deg);}
  .kk-sy-mat--r{right:-6%;transform:translateX(0) rotate(7deg);}
  .kk-sy-new{position:absolute;inset:0;opacity:0;transform:scale(.8);
    transition:opacity 1s var(--ease-out,ease) .25s,transform 1s var(--ease-out,ease) .25s;}
  .kk-sy-stage.is-fusing .kk-sy-mat--l{opacity:0;transform:translateX(52%) rotate(0) scale(.86);}
  .kk-sy-stage.is-fusing .kk-sy-mat--r{opacity:0;transform:translateX(-52%) rotate(0) scale(.86);}
  .kk-sy-stage.is-fusing .kk-sy-new{opacity:1;transform:scale(1);}
  .kk-sy-stage.is-fusing .kk-ev-burst{animation:kkEvBurst 1.6s var(--ease-out,ease-out) both;}

  @media (prefers-reduced-motion: reduce){
    .kk-ev-old,.kk-ev-new,.kk-sy-mat,.kk-sy-new{transition:none;}
    .kk-ev-stage.is-evolving .kk-ev-burst,.kk-sy-stage.is-fusing .kk-ev-burst{animation:none;}
  }

  /* ── 3B holo kart — yüz/sırt 12c kart dilinden; kabuk tilt+folyo verir ── */
  .kk-card3d{width:200px;aspect-ratio:5/7;perspective:800px;cursor:pointer;}
  .kk-card3d--mini{width:100%;}
  .kk-card3d-inner{position:relative;width:100%;height:100%;transform-style:preserve-3d;transform:rotateX(var(--rx,0)) rotateY(var(--ry,0));transition:transform .12s ease;box-shadow:0 0 22px color-mix(in srgb,var(--rar,#d4af55) 28%,transparent);}
  .kk-card3d-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden;}
  .kk-card3d-face .ikv-card{height:100%;}
  .kk-card3d-backface{position:absolute;inset:0;transform:rotateY(180deg);backface-visibility:hidden;-webkit-backface-visibility:hidden;overflow:hidden;}
  .kk-card3d-backface .ikv-back{height:100%;}
  .kk-card3d-foil{position:absolute;inset:0;background:conic-gradient(from calc(var(--mx,50)*1deg) at var(--mx,50%) var(--my,50%),rgba(255,80,180,.5),rgba(80,200,255,.5),rgba(120,255,180,.5),rgba(255,220,80,.5),rgba(255,80,180,.5));mix-blend-mode:color-dodge;opacity:calc(var(--foil,.3)*.18);pointer-events:none;z-index:6;}
  .kk-card3d-glare{position:absolute;inset:0;background:radial-gradient(circle at var(--mx,50%) var(--my,50%),rgba(255,255,255,.4),transparent 45%);mix-blend-mode:soft-light;pointer-events:none;z-index:7;}
  .kk-card3d--locked .kk-card3d-foil{opacity:.06;}
  /* ── ALTIN KART — prestijin yeni yeri (12c · K3) ────────────────────────
     Hearthstone'un altın kartı: aynı kart, aynı güç, başka bir muamele.
     Hareket artık herkesin olduğu için ayrıcalık ÇERÇEVEDE: kenar altınla
     mühürlenir ve yavaşça nefes alır. Mühür daima altındır (TASARIM §1) —
     bu yüzden nadirlik rengi (--rar) değil, doğrudan altın kullanılır. */
  .kk-card3d--altin .kk-card3d-face{
    box-shadow:0 0 0 1px rgba(247,199,68,.55),0 0 10px rgba(245,166,35,.18);
    animation:kkAltinNefes 5.5s ease-in-out infinite;border-radius:inherit;}
  .kk-card3d--altin.kk-card3d--mini .kk-card3d-face{animation-duration:7.5s;}
  @keyframes kkAltinNefes{
    0%,100%{box-shadow:0 0 0 1px rgba(247,199,68,.5),0 0 8px rgba(245,166,35,.14)}
    50%{box-shadow:0 0 0 1px rgba(247,199,68,.95),0 0 22px rgba(245,166,35,.42)}}
  .kk-card-dims{display:flex;gap:4px;width:100%;margin-top:2.5%;z-index:2;}
  .kk-card-dim{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;}
  .kk-card-dim-g{font-size:8px;color:var(--rar,#d4af55);}
  .kk-card-dim-bar{width:100%;height:3px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden;}
  .kk-card-dim-bar i{display:block;height:100%;background:var(--rar,#d4af55);}

  /* ── koleksiyon — SALON: atmosfer köşelerden sızar, ızgara süzülür ── */
  .kk-wrap{max-width:680px;margin:0 auto;padding:18px 14px 90px;position:relative;}
  .kk-wrap::before{content:'';position:absolute;top:-14px;left:-14px;right:-14px;height:460px;pointer-events:none;z-index:0;
    background:radial-gradient(80% 55% at 12% 0%, rgba(245,166,35,.09), transparent 60%),
               radial-gradient(70% 45% at 88% 4%, rgba(45,95,168,.07), transparent 60%);}
  .kk-wrap--lapis::before{
    background:radial-gradient(80% 55% at 88% 0%, rgba(45,95,168,.13), transparent 60%),
               radial-gradient(70% 45% at 12% 4%, rgba(245,166,35,.06), transparent 60%);}
  .kk-wrap > *{position:relative;z-index:1;}

  /* tören başlığı — halka + sayaç; altı eriyen eşik çizgisi */
  .kk-hall{display:flex;align-items:center;gap:18px;padding:6px 2px 18px;margin-bottom:18px;position:relative;}
  .kk-hall::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;
    background:linear-gradient(90deg,transparent,rgba(245,166,35,.4),transparent);}
  .kk-hall--lapis::after{background:linear-gradient(90deg,transparent,rgba(245,166,35,.35) 30%,rgba(90,138,216,.4) 70%,transparent);}
  /* ── OCAK — hanın ateşi ────────────────────────────────────────────────
     Üç alev dili farklı ritimde salınır: tek dil "ikon", üç dil ATEŞ olur.
     Sönükken kor gibi durur (görünür ama uyuyor), yanınca yükselir. Salt
     CSS ve salt transform/opacity — ateşin bedeli bir rAF değildir. */
  .kk-ocak{margin-left:auto;flex:0 0 auto;background:none;border:none;padding:8px 6px;cursor:pointer;
    line-height:0;-webkit-tap-highlight-color:transparent;opacity:.5;transition:opacity .3s ease;}
  .kk-ocak.is-on{opacity:1;}
  .kk-ocak:hover{opacity:.85;}
  .kk-ocak.is-on:hover{opacity:1;}
  .kk-ocak:focus-visible{outline:2px solid var(--gold,#F5A623);outline-offset:3px;border-radius:6px;}
  .kk-ocak-alev{position:relative;display:block;width:17px;height:24px;}
  .kk-ocak-alev i{position:absolute;left:50%;bottom:0;width:9px;height:14px;
    border-radius:50% 50% 44% 44%;transform:translateX(-50%);
    background:linear-gradient(180deg,rgba(247,199,68,.95),rgba(245,166,35,.75) 55%,rgba(180,80,20,.35));
    filter:blur(.4px);animation:kkAlev 1.9s ease-in-out infinite;}
  .kk-ocak-alev i:nth-child(2){width:6px;height:19px;opacity:.85;animation-duration:1.45s;animation-delay:-.5s;}
  .kk-ocak-alev i:nth-child(3){width:3.5px;height:23px;opacity:.7;animation-duration:2.3s;animation-delay:-1.1s;}
  /* Sönük ocak KOR'dur: alev yükselmez, yalnız derinden nefes alır. */
  .kk-ocak:not(.is-on) .kk-ocak-alev i{animation-duration:4.5s;filter:blur(1px) saturate(.6);}
  /* Gece ateş kısılır — 13e'nin gece kısıklığının görsel eşi (§2 sahne saatle yaşar). */
  .tw-night .kk-ocak-alev i{opacity:.6;}
  .tw-night .kk-ocak-alev i:nth-child(2){opacity:.5;}
  .tw-night .kk-ocak-alev i:nth-child(3){opacity:.4;}
  @keyframes kkAlev{
    0%,100%{transform:translateX(-50%) scaleY(1) skewX(0deg)}
    30%{transform:translateX(-52%) scaleY(1.16) skewX(-3deg)}
    62%{transform:translateX(-48%) scaleY(.93) skewX(2.5deg)}
  }
  .kk-hall-num{font-family:var(--cinzel,serif);font-size:21px;font-weight:700;color:var(--gold,#F5A623);line-height:1;display:block;}
  .kk-hall--lapis .kk-hall-num{color:var(--lapis-bright,#5A8AD8);}
  .kk-hall-den{font-size:8.5px;color:var(--text-dim,#585349);letter-spacing:.5px;margin-top:3px;font-family:var(--cinzel,serif);}
  .kk-hall-txt{flex:1;min-width:0;}
  .kk-hall-kicker{font-family:var(--cinzel,serif);font-size:10px;letter-spacing:3.5px;color:var(--gold,#F5A623);font-weight:600;}
  .kk-hall-note{font-family:var(--serif,Georgia);font-style:italic;font-size:12.5px;color:var(--text-mid,#95897A);margin-top:4px;line-height:1.45;}
  /* Salonun zaman satırı — sayının değil, ayın sesi: sessiz altın. */
  .kk-hall-ay{font-family:var(--sans);font-size:11px;letter-spacing:.14em;text-transform:uppercase;
    color:var(--gold-quiet,#9C7B3C);text-align:center;margin:2px 0 14px;}

  /* canlı kart sunağı — ikv-panel üstüne oturur */
  .kk-butunluk{padding:18px 18px 16px;margin-bottom:16px;}
  .kk-butunluk-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;}
  .kk-butunluk-id{flex:1;min-width:0;}
  .kk-butunluk-kicker{font-family:var(--cinzel,serif);font-size:9px;letter-spacing:3px;color:var(--gold,#F5A623);font-weight:600;}
  .kk-butunluk-name{font-family:var(--serif-display,var(--serif,Georgia));font-style:italic;font-size:24px;color:var(--text,#EAE2D6);margin-top:4px;line-height:1.18;}
  .kk-butunluk-score{display:flex;flex-direction:column;align-items:center;gap:5px;flex:none;}
  .kk-butunluk-avg{font-family:var(--cinzel,serif);font-size:17px;font-weight:700;color:var(--gold,#F5A623);}
  .kk-butunluk-score > span{font-family:var(--cinzel,serif);font-size:7.5px;letter-spacing:2px;color:var(--text-dim,#585349);}
  .kk-butunluk-dims{display:grid;grid-template-columns:1fr 1fr;gap:12px 18px;margin-top:16px;}
  .kk-live-dim-top{display:flex;justify-content:space-between;font-family:var(--cinzel,serif);font-size:8px;letter-spacing:1.5px;color:var(--text-mid,#95897A);margin-bottom:5px;}
  .kk-live-dim-top b{color:var(--gold,#F5A623);}
  .kk-live-bar{height:5px;background:rgba(234,226,214,.07);border-radius:3px;overflow:hidden;}
  .kk-live-bar i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,var(--gold,#F5A623),var(--gold-bright,#F7C744));box-shadow:0 0 8px rgba(245,166,35,.45);transition:width .8s var(--ease-out,ease);}
  .kk-butunluk-note{font-family:var(--serif,Georgia);font-style:italic;font-size:11px;color:var(--text-dim,#585349);margin-top:13px;line-height:1.55;}

  /* nadirlik mühürleri */
  .kk-rar-legend{display:flex;gap:11px;flex-wrap:wrap;margin-top:10px;}
  .kk-rar-leg{font-family:var(--cinzel,serif);font-size:8px;letter-spacing:1.5px;color:var(--text-mid,#95897A);display:flex;align-items:center;gap:5px;}
  .kk-rar-leg i{width:7px;height:7px;border-radius:50%;display:inline-block;box-shadow:0 0 5px rgba(245,166,35,.25);}
  /* mercek anahtarı (K5) — aynı koleksiyon, iki bakış: ızgara / yapı */
  .kk-mercek{display:flex;gap:6px;justify-content:center;margin:14px 0 6px;}
  .kk-mercek-btn{background:transparent;border:1px solid rgba(234,226,214,.18);border-radius:var(--radius-full,999px);
    padding:7px 16px;min-height:34px;cursor:pointer;
    font-family:var(--cinzel,serif);font-size:9px;letter-spacing:2.2px;color:var(--text-mid,#95897A);
    transition:border-color .2s ease,color .2s ease,background .2s ease;}
  .kk-mercek-btn.is-on{border-color:rgba(245,166,35,.55);color:var(--gold,#F5A623);background:rgba(245,166,35,.08);}
  .kk-mercek-btn:focus-visible{outline:2px solid var(--gold,#F5A623);outline-offset:2px;}

  /* aile mührü (K4) — tamamlanan çerçevenin glifi, dövülmüş altın iz */
  .kk-aile-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0 2px;}
  .kk-aile-lbl{font-family:var(--cinzel,serif);font-size:8px;letter-spacing:2px;color:var(--text-mid,#95897A);}
  /* emel çipi (K7) — seçilebilir aile hedefi; seçiliyse altın, değilse sessiz */
  .kk-emel-row{margin-top:6px;}
  .kk-emel-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;min-height:30px;cursor:pointer;
    background:transparent;border:1px solid rgba(234,226,214,.16);border-radius:var(--radius-full,999px);
    color:var(--text-mid,#95897A);transition:border-color .2s ease,color .2s ease,background .2s ease;}
  .kk-emel-chip.is-on{border-color:rgba(245,166,35,.6);color:var(--gold,#F5A623);background:rgba(245,166,35,.08);}
  .kk-emel-chip:focus-visible{outline:2px solid var(--gold,#F5A623);outline-offset:2px;}
  .kk-emel-g{font-size:12px;}
  .kk-emel-n{font-family:var(--cinzel,serif);font-size:8.5px;letter-spacing:1.4px;}
  /* kademe noktaları — yolun geçilen durakları (sayaç değil, gözle ölçüm) */
  .kk-emel-k{font-size:7px;letter-spacing:1.5px;opacity:.75;margin-left:1px;}
  /* sırt çipi — emel çipinin kardeşi; farkı: içinde sırtın KENDİSİ küçülür,
     etiket değil doku seçtirir (hangi sırtı taşıdığını görerek seçersin) */
  .kk-sirt-row{margin-top:6px;}
  .kk-sirt-chip{display:inline-flex;align-items:center;gap:7px;padding:4px 10px 4px 5px;min-height:30px;cursor:pointer;
    background:transparent;border:1px solid rgba(234,226,214,.16);border-radius:var(--radius-full,999px);
    color:var(--text-mid,#95897A);transition:border-color .2s ease,color .2s ease,background .2s ease;}
  .kk-sirt-chip.is-on{border-color:rgba(245,166,35,.6);color:var(--gold,#F5A623);background:rgba(245,166,35,.08);}
  .kk-sirt-chip:focus-visible{outline:2px solid var(--gold,#F5A623);outline-offset:2px;}
  .kk-sirt-n{font-family:var(--cinzel,serif);font-size:8.5px;letter-spacing:1.4px;}
  /* Mini önizleme sırtın gerçek dilini taşır (aynı --bk-ink, aynı kafes),
     yalnız ölçeği düşer; ikiz bir "sırt ikonu" çizilmez. */
  .kk-sirt-mini{display:block;width:19px;flex:0 0 19px;}
  .kk-sirt-mini .ikv-back{padding:0;border:1px solid rgba(var(--bk-ink),.45);border-radius:2px;}
  .kk-sirt-mini .ikv-back-lattice{inset:2px;}
  .kk-sirt-mini .ikv-back-ring--outer{position:absolute;top:50%;left:50%;width:52%;aspect-ratio:1;inset:auto;
    transform:translate(-50%,-50%);}

  .kk-aile-seal{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;
    border-radius:50%;border:1px solid rgba(245,166,35,.55);color:var(--gold,#F5A623);font-size:12px;
    background:radial-gradient(circle at 50% 30%,rgba(245,166,35,.18),transparent 70%);
    box-shadow:0 0 10px rgba(245,166,35,.22),inset 0 1px 0 rgba(255,255,255,.12);}
  .kk-rar-leg b{color:var(--text,#EAE2D6);}

  /* kategori çipleri — mühür pill'ler (genişletilmiş dokunma hedefi) */
  .kk-chips{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 10px;margin-bottom:14px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
  .kk-chips::-webkit-scrollbar{display:none;}
  .kk-chip{position:relative;flex:none;display:inline-flex;align-items:center;min-height:36px;
    background:rgba(29,23,18,.55);border:1px solid rgba(234,226,214,.14);color:var(--text-mid,#95897A);
    font-family:var(--cinzel,serif);font-size:9px;letter-spacing:2px;padding:0 14px;border-radius:var(--radius-full,999px);
    cursor:pointer;white-space:nowrap;transition:border-color .2s ease,color .2s ease;}
  .kk-chip::before{content:'';position:absolute;inset:-5px;border-radius:inherit;} /* 44px+ hedef */
  .kk-chip.is-active{background:linear-gradient(180deg,var(--gold-bright,#F7C744),var(--gold,#F5A623));color:#1A1206;border-color:transparent;font-weight:700;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 4px 12px rgba(245,166,35,.25);}
  .kk-chip:focus-visible{outline:2px solid var(--gold,#F5A623);outline-offset:2px;}

  /* ızgara — hücreler kalkar, ışığı derinleşir */
  .kk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:14px 12px;}
  .kk-grid-cell{position:relative;background:none;border:none;padding:0;cursor:pointer;border-radius:12px;transition:transform .3s var(--ease-out,ease);}
  .kk-grid-cell:hover{transform:translateY(-4px);}
  .kk-grid-cell:hover .kk-card3d-inner{box-shadow:0 12px 28px rgba(0,0,0,.5),0 0 24px color-mix(in srgb,var(--rar,#F5A623) 40%,transparent);}
  .kk-grid-cell:active{transform:translateY(-1px) scale(.97);}
  .kk-grid-cell:focus-visible{outline:2px solid var(--gold,#F5A623);outline-offset:3px;}
  .kk-grid-cell--locked{opacity:.96;}
  .kk-cell-prog{display:flex;align-items:center;gap:5px;margin-top:6px;}
  .kk-cell-prog-bar{flex:1;height:3px;background:rgba(234,226,214,.08);border-radius:2px;overflow:hidden;}
  .kk-cell-prog-bar i{display:block;height:100%;border-radius:2px;background:linear-gradient(90deg,var(--gold,#F5A623),var(--lapis-bright,#5A8AD8));}
  .kk-cell-prog span{font-family:var(--cinzel,serif);font-size:7.5px;letter-spacing:.5px;color:var(--text-dim,#585349);}
  .kk-cell-hint{font-family:var(--serif,Georgia);font-style:italic;font-size:9px;color:var(--gold,#F5A623);opacity:.8;margin-top:4px;line-height:1.35;}
  .kk-foot{font-family:var(--serif,Georgia);font-style:italic;font-size:11px;color:var(--text-dim,#585349);text-align:center;margin-top:28px;}

  /* ── boş durum — fener mührü nefes alır (ikv-panel üstüne) ── */
  .kk-empty{text-align:center;padding:44px 22px 34px;}
  .kk-empty-glyph{display:flex;justify-content:center;animation:ikvGlowBreath 4.4s ease-in-out infinite;}
  .kk-empty-title{font-family:var(--serif-display,var(--serif,Georgia));font-size:20px;color:var(--text,#EAE2D6);margin-top:16px;letter-spacing:.5px;}
  .kk-empty-text{font-family:var(--serif,Georgia);font-style:italic;font-size:13px;color:var(--text-mid,#95897A);line-height:1.65;max-width:340px;margin:10px auto 22px;}

  /* ── en yakın kişi — EŞİK SAHNESİ: lapis gece, alttan nefes alan altın davet ── */
  .kk-spot{position:relative;display:flex;align-items:center;gap:16px;width:100%;text-align:left;
    border:1px solid rgba(90,138,216,.28);border-radius:var(--radius-xl,24px);padding:16px;margin-bottom:16px;cursor:pointer;overflow:hidden;
    background:radial-gradient(120% 90% at 100% 0%, rgba(45,95,168,.15), transparent 55%),linear-gradient(170deg,#141A2B,#0C0F18);
    box-shadow:0 14px 40px rgba(0,0,0,.45);}
  .kk-spot::before{content:'';position:absolute;left:8%;right:8%;bottom:-26px;height:52px;border-radius:50%;pointer-events:none;
    background:radial-gradient(50% 100% at 50% 100%, rgba(245,166,35,.30), transparent 72%);
    animation:ikvBreath 4.5s ease-in-out infinite;}
  .kk-spot::after{content:'';position:absolute;inset:0;background-image:var(--grain-img);background-size:240px;opacity:.09;pointer-events:none;}
  .kk-spot > *{position:relative;z-index:1;}
  .kk-spot-card{width:86px;flex:none;perspective:600px;}
  .kk-spot-card .kk-card3d{transform:rotateY(7deg) rotateZ(-.6deg);} /* kart eşiğe döner (§8) */
  .kk-spot-txt{flex:1;min-width:0;}
  .kk-spot-kicker{font-family:var(--cinzel,serif);font-size:9px;letter-spacing:3px;color:var(--lapis-bright,#5A8AD8);font-weight:600;}
  .kk-spot-name{font-family:var(--serif-display,var(--serif,Georgia));font-style:italic;font-size:19px;color:var(--text,#EAE2D6);margin-top:3px;line-height:1.15;}
  .kk-spot-lesson{font-family:var(--serif,Georgia);font-style:italic;font-size:11.5px;color:var(--text-mid,#95897A);margin-top:5px;line-height:1.45;}
  .kk-spot-bar{height:4px;background:rgba(234,226,214,.08);border-radius:2px;overflow:hidden;margin-top:9px;}
  .kk-spot-bar i{display:block;height:100%;border-radius:2px;background:linear-gradient(90deg,var(--gold,#F5A623),var(--lapis-bright,#5A8AD8));box-shadow:0 0 8px rgba(90,138,216,.4);}
  .kk-spot-hint{font-family:var(--serif,Georgia);font-style:italic;font-size:11px;color:var(--gold,#F5A623);margin-top:7px;}

  /* ── Emre'nin önerisi — altın otorite panosu, oval monogram ── */
  .kk-emre{position:relative;border:1px solid rgba(245,166,35,.30);border-radius:var(--radius-xl,24px);padding:16px;margin-bottom:16px;overflow:hidden;
    background:radial-gradient(120% 90% at 0% 0%, rgba(245,166,35,.11), transparent 55%),linear-gradient(170deg,#1D1712,#120E09);
    box-shadow:0 14px 40px rgba(0,0,0,.45);}
  .kk-emre::after{content:'';position:absolute;inset:0;background-image:var(--grain-img);background-size:240px;opacity:.09;pointer-events:none;}
  .kk-emre > *{position:relative;z-index:1;}
  .kk-emre-head{display:flex;align-items:center;gap:9px;font-family:var(--cinzel,serif);font-size:9.5px;letter-spacing:2.5px;color:var(--gold,#F5A623);font-weight:700;}
  .kk-emre-mono{display:inline-flex;align-items:center;justify-content:center;width:21px;height:27px;border-radius:50%;
    border:1.5px solid var(--gold,#F5A623);font-size:10px;flex:none;box-shadow:0 0 10px rgba(245,166,35,.35);} /* oval çerçeve — Emre imzası */
  /* Haftanın gündemi — bloğun ÇERÇEVESİ, ikinci bir kutu değil: kendi kenarlığı
     ve zemini yok, başlığın altında ince bir bağlam şeridi olarak akar. */
  .kk-emre-donem{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 8px;margin-top:7px;}
  .kk-emre-donem-k{font-family:var(--cinzel,serif);font-size:7.5px;letter-spacing:1.8px;color:var(--text-dim,#585349);}
  .kk-emre-donem-v{font-family:var(--cinzel,serif);font-size:10px;letter-spacing:1.6px;color:var(--lapis-bright,#5A8AD8);font-weight:400;}
  .kk-emre-donem-c{padding:0;background:none;border:none;cursor:pointer;
    font-family:var(--serif,Georgia);font-style:italic;font-size:10.5px;color:var(--text-mid,#95897A);
    border-bottom:1px solid rgba(90,138,216,.35);}
  .kk-emre-donem-c:focus-visible{outline:2px solid var(--gold,#F5A623);outline-offset:2px;}
  .kk-emre-main{display:flex;align-items:center;gap:14px;width:100%;text-align:left;background:none;border:none;padding:12px 0 0;cursor:pointer;}
  .kk-emre-card{width:68px;flex:none;}
  .kk-emre-txt{flex:1;min-width:0;}
  .kk-emre-headline{font-family:var(--serif,Georgia);font-style:italic;font-size:13.5px;color:var(--text,#EAE2D6);line-height:1.5;}
  .kk-emre-bar{position:relative;height:5px;background:rgba(234,226,214,.08);border-radius:3px;overflow:hidden;margin-top:16px;}
  .kk-emre-bar i{display:block;height:100%;border-radius:3px;background:linear-gradient(90deg,var(--gold,#F5A623),var(--lapis-bright,#5A8AD8));box-shadow:0 0 8px rgba(245,166,35,.4);}
  .kk-emre-bar span{position:absolute;right:1px;top:-13px;font-family:var(--cinzel,serif);font-size:8px;letter-spacing:1px;color:var(--text-dim,#585349);}
  .kk-emre-hint{font-family:var(--serif,Georgia);font-style:italic;font-size:11px;color:var(--gold,#F5A623);margin-top:7px;}
  .kk-emre-route{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px;padding-top:12px;position:relative;}
  .kk-emre-route::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(245,166,35,.3),transparent);}
  .kk-emre-ptr{background:rgba(245,166,35,.05);border:1px solid rgba(234,226,214,.10);border-radius:14px;padding:9px 11px;text-align:left;cursor:pointer;font-family:var(--serif,Georgia);font-size:10.5px;color:var(--text,#EAE2D6);line-height:1.35;transition:border-color .2s ease;}
  .kk-emre-ptr:hover{border-color:rgba(245,166,35,.35);}
  .kk-emre-ptr b{display:block;font-family:var(--cinzel,serif);font-size:7px;letter-spacing:1.5px;color:var(--gold,#F5A623);font-weight:700;margin-bottom:3px;}
  .kk-emre-ptr.is-far b{color:var(--text-dim,#585349);}
  .kk-emre-ptr i{display:block;font-style:italic;font-size:9.5px;color:var(--text-mid,#95897A);margin-top:3px;line-height:1.4;}

  /* ── detay "HUZURA ÇIKIŞ" — kartın kendi dünyası tam ekrana taşar ──────
     backdrop (12d reçetesi) → hafif veil → eşikte süzülen kart (dokunca
     sırtını gösterir) → kademeli süzülen anlatı (ikv-cascade). ──────── */
  .kk-det{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;overflow-y:auto;overscroll-behavior:contain;padding:54px 18px 64px;}
  .kk-det-backdrop{position:absolute;inset:0;overflow:hidden;pointer-events:none;animation:kkFade .6s ease;}
  .kk-det-backdrop svg{width:100%;height:100%;display:block;}
  .kk-det-veil{position:absolute;inset:0;pointer-events:none;
    background:radial-gradient(120% 68% at 50% 6%, rgba(6,6,8,.22), rgba(6,6,8,.7) 55%, rgba(6,6,8,.95) 100%);
    animation:kkFade .4s ease;}
  .kk-det-dawn{position:fixed;left:0;right:0;bottom:0;height:34vh;pointer-events:none;
    background:radial-gradient(70% 100% at 50% 100%, rgba(245,166,35,.16), rgba(255,170,120,.05) 45%, transparent 72%);
    animation:ikvBreath 5s ease-in-out infinite;}
  .kk-det-close{position:fixed;top:calc(var(--safe-t,0px) + 12px);right:14px;width:44px;height:44px;border-radius:50%;
    background:rgba(12,9,6,.6);border:1px solid rgba(234,226,214,.18);color:var(--text,#EAE2D6);font-size:22px;cursor:pointer;z-index:3;
    backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);transition:border-color .2s ease;}
  .kk-det-close:hover{border-color:rgba(245,166,35,.5);}
  .kk-det-close:focus-visible{outline:2px solid var(--gold,#F5A623);outline-offset:2px;}
  /* BOY KART KABI — kartın kendisi sahnedir. Genişlik 13B'nin tam ekran
     ölçüsünden (min(90vw,420px)); yükseklik İÇERİKTEN gelir, o yüzden iki yüz
     grid ile üst üste yığılır: ön yüz ölçüyü kurar, sırt onu doldurur.
     (Eski hâl .kk-card3d'nin mutlak konumlu yüzlerine dayanıyordu — orada
     yükseklik dışarıdan verilmek zorundaydı, boy kartta yüz çökerdi.) */
  .kk-det-flip{position:relative;width:min(90vw,420px);margin-bottom:10px;perspective:1600px;cursor:pointer;
    animation:kkDetIn .7s var(--ease-out,ease) both;}
  /* grid-template-columns:100% ŞARTTIR. Track auto kalırsa genişlik içerikten
     ölçülür; holo motorunun sardığı .ikv-holo ise width:100% ister — ikisi
     birbirini bekler, döngü çözülemez ve kart 2px'e çöker (canlı yakalandı).
     Yükseklik içerikten gelmeye devam eder: boy kartın kuralı odur. */
  .kk-det-flip-inner{position:relative;display:grid;grid-template-columns:100%;transform-style:preserve-3d;
    transition:transform .7s var(--ease-out,cubic-bezier(.16,1,.3,1));}
  .kk-det-face,.kk-det-back{grid-area:1/1;width:100%;backface-visibility:hidden;-webkit-backface-visibility:hidden;}
  .kk-det-back{transform:rotateY(180deg);}
  .kk-det-flip.is-flipped .kk-det-flip-inner{transform:rotateY(180deg);}
  .kk-det-flip-hint{display:block;margin:0 auto 18px;padding:6px 12px;background:none;border:0;cursor:pointer;
    font-family:var(--cinzel,serif);font-size:8px;letter-spacing:2px;color:var(--text-dim,#585349);opacity:.7;}
  .kk-det-flip-hint:hover{color:var(--text-mid,#95897A);}
  .kk-det-flip-hint:focus-visible{outline:2px solid var(--gold,#F5A623);outline-offset:2px;border-radius:var(--radius-full,999px);}

  /* ── KARTIN METİN KUTUSU — dört asli unsur + aradaki yol ──────────────
     Kartın İÇİNDE yaşar: ölçüler cqw'dur, yani kart büyüdükçe yazı da büyür
     (12c'nin container-query sözleşmesi). Üstündeki altın hairline sahneyi
     metinden ayırır — Pokémon'un yetenek kutusu, Wanderer'ın diliyle. */
  .kk-det-kutu{width:100%;margin-top:3.5cqw;padding-top:3.4cqw;text-align:left;position:relative;}
  .kk-det-kutu::before{content:'';position:absolute;top:0;left:6%;right:6%;height:1px;
    background:linear-gradient(90deg,transparent,rgba(245,166,35,.32),transparent);}
  .kk-det-aura{position:absolute;inset:-14% -22%;pointer-events:none;border-radius:50%;filter:blur(8px);
    background:radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--rar,#F5A623) 26%, transparent), transparent 70%);
    animation:ikvBreath 4.6s ease-in-out infinite;}
  .kk-det-body{max-width:440px;text-align:center;position:relative;z-index:1;}
  .kk-det-trace{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin:0 0 12px;
    font-family:var(--cinzel,serif);font-size:8.5px;letter-spacing:1.5px;color:var(--text-dim,#585349);}
  .kk-det-trace-crown{color:var(--gold,#F5A623);}
  /* panzehir (K6) — gölgenin karşıt kutbu; açıkken altın mühür, kapalıyken yol */
  .kk-det-panzehir{display:flex;align-items:flex-start;gap:11px;margin:12px 0;padding:12px 14px;
    border-radius:var(--radius-lg,16px);border:1px solid rgba(203,216,240,.16);background:rgba(24,46,92,.16);}
  .kk-det-panzehir.is-open{border-color:rgba(245,166,35,.45);background:rgba(245,166,35,.07);}
  .kk-pz-seal{flex:none;display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;
    border:1px solid rgba(245,166,35,.6);color:var(--gold,#F5A623);font-size:12px;
    box-shadow:0 0 12px rgba(245,166,35,.25);}
  .kk-pz-seal--dim{border-color:rgba(203,216,240,.3);color:rgba(203,216,240,.55);box-shadow:none;}
  .kk-pz-h{font-family:var(--cinzel,serif);font-size:8.5px;letter-spacing:2.4px;color:var(--text-mid,#95897A);}
  .kk-det-panzehir.is-open .kk-pz-h{color:var(--gold,#F5A623);}
  .kk-pz-card{margin-top:4px;background:none;border:none;padding:0;cursor:pointer;text-align:left;
    font-family:var(--cinzel,serif);font-size:12.5px;letter-spacing:1.2px;color:var(--text,#EAE2D6);
    border-bottom:1px solid rgba(245,166,35,.35);}
  .kk-pz-card:focus-visible{outline:2px solid var(--gold,#F5A623);outline-offset:2px;}
  .kk-pz-need{margin-top:4px;font-family:var(--serif,Georgia);font-style:italic;font-size:11.5px;
    color:var(--text-mid,#95897A);line-height:1.45;}

  /* sentez malzemeleri (K4) — iki temsilci kart, aralarında füzyon glifi */
  .kk-det-sentez{padding:14px 12px;margin:12px 0;}
  .kk-sz-head{font-family:var(--cinzel,serif);font-size:9px;letter-spacing:2.5px;color:var(--text-mid,#95897A);text-align:center;margin-bottom:12px;}
  .kk-sz-row{display:flex;align-items:center;justify-content:center;gap:10px;}
  .kk-sz-slot{width:84px;display:flex;flex-direction:column;align-items:center;gap:6px;}
  .kk-sz-slot--bos{aspect-ratio:auto;}
  .kk-sz-slot--bos .kk-sz-q{display:flex;align-items:center;justify-content:center;width:84px;aspect-ratio:5/7;
    border:1px dashed rgba(203,216,240,.28);border-radius:4px;color:rgba(203,216,240,.45);
    font-family:var(--cinzel,serif);font-size:22px;}
  .kk-sz-ad{font-family:var(--cinzel,serif);font-size:8px;letter-spacing:1.2px;line-height:1.3;
    color:var(--text-mid,#95897A);text-align:center;}
  .kk-sz-plus{color:var(--gold,#F5A623);font-size:15px;flex:none;opacity:.75;}
  .kk-sz-ready{margin-top:12px;text-align:center;font-family:var(--cinzel,serif);font-size:9.5px;
    letter-spacing:2px;color:var(--gold,#F5A623);}
  /* Ad artık kartın KENDİ yüzünde (12c .ikv-name) — burada tekrarlanmaz.
     Kartın altında kalan ilk ses dersin kendisidir: kartın söylediği cümle. */
  .kk-det-lesson{font-family:var(--serif,Georgia);font-style:italic;font-size:14.5px;color:var(--gold,#F5A623);margin:4px auto 18px;line-height:1.55;max-width:340px;}
  .kk-det-portre{font-family:var(--serif,Georgia);font-size:13.5px;line-height:1.75;color:var(--text,#EAE2D6);margin:0 0 16px;text-align:left;}
  .kk-det-portre::first-letter{float:left;font-family:var(--cinzel,serif);font-size:34px;line-height:.9;color:var(--gold,#F5A623);padding:3px 8px 0 0;} /* tezhipli ilk harf */
  .kk-det-scene{border-left:2px solid var(--rar,#F5A623);border-radius:0 14px 14px 0;padding:8px 12px 8px 14px;margin:0 0 14px;text-align:left;
    font-family:var(--serif,Georgia);font-size:12.5px;line-height:1.7;color:var(--text-mid,#95897A);background:linear-gradient(90deg,color-mix(in srgb,var(--rar,#F5A623) 7%,transparent),transparent 70%);}
  .kk-det-become{border:1px solid rgba(245,166,35,.26);border-radius:var(--radius-lg,20px);padding:14px 16px;margin:0 0 16px;text-align:left;
    background:radial-gradient(120% 100% at 0% 0%, rgba(245,166,35,.10), transparent 60%),rgba(18,14,9,.55);
    font-family:var(--serif,Georgia);font-size:12.5px;line-height:1.7;color:var(--text,#EAE2D6);}
  .kk-det-scene-h,.kk-det-become-h{display:block;font-family:var(--cinzel,serif);font-size:8px;letter-spacing:2.5px;color:var(--gold,#F5A623);margin-bottom:6px;}
  .kk-det-traits-h{font-family:var(--cinzel,serif);font-size:8.5px;letter-spacing:2.5px;color:var(--gold,#F5A623);text-align:center;margin:6px 0 10px;opacity:.9;}
  .kk-det-kok{font-family:var(--cinzel,serif);font-size:8px;letter-spacing:1.5px;color:var(--text-dim,#585349);margin-top:22px;padding-top:14px;text-align:center;opacity:.9;position:relative;}
  .kk-det-kok::before{content:'';position:absolute;top:0;left:20%;right:20%;height:1px;background:linear-gradient(90deg,transparent,rgba(245,166,35,.3),transparent);}
  /* ── HEDEF MÜHRÜ — "Böyle bir kişi olmak istiyorum" ──
     Buton ALTIN (eylem+mühür), vurulmuş hâl LAPİS (hedef=gelecek). */
  .kk-hedef-btn{display:block;width:100%;margin:0 0 16px;font-size:12px;letter-spacing:1.6px;line-height:1.45;}
  /* EŞİKTE nişanı — reçete tuttu, mühür kullanıcıda. Altın ama sönük: mühürlü
     kartın parlaklığını taşımaz, çünkü henüz mühürlenmedi. */
  .kk-esik-nisan{display:inline-block;margin-top:5px;padding:3px 9px;
    border-radius:var(--radius-full,999px);border:1px solid rgba(245,166,35,.32);
    background:rgba(245,166,35,.08);font-family:var(--cinzel,serif);
    font-size:7.5px;letter-spacing:1.8px;color:var(--gold,#F5A623);white-space:nowrap;}
  .kk-grid-cell--locked.is-esikte .kk-card3d-inner{box-shadow:0 0 18px rgba(245,166,35,.22);}
  .kk-spot .kk-esik-nisan{margin-top:8px;}

  /* ── "Neden bu?" — şeffaflık yüzeyi (FAZ 7) ─────────────────────────
     Giriş düğmesi bilerek SESSİZ: alçak kontrast, ince harf, altın değil
     kısık altın. Öne çıkan şey kartın kendisi olmalı; bu düğme bir davet
     değil, bir haktır — arayan bulur, aramayan görmez. */
  .kk-neden-wrap{position:relative;}
  .kk-neden-giris{display:block;margin:7px 0 0 auto;padding:4px 10px;
    background:none;border:1px solid rgba(234,226,214,.10);border-radius:var(--radius-full,999px);
    font-family:var(--serif,Georgia);font-style:italic;font-size:10.5px;
    color:var(--text-dim,#6E6558);cursor:pointer;transition:color .2s var(--ease-out,ease),border-color .2s var(--ease-out,ease);}
  .kk-neden-giris:hover{color:var(--text-mid,#95897A);border-color:rgba(234,226,214,.2);}

  .kk-neden-modal{max-width:420px;padding:26px 22px 20px;text-align:left;}
  .kk-neden-kicker{font-family:var(--cinzel,serif);font-size:9px;letter-spacing:3px;
    color:var(--lapis-bright,#5A8AD8);font-weight:600;}
  .kk-neden-ad{font-family:var(--serif-display,var(--serif,Georgia));font-style:italic;
    font-size:22px;color:var(--text,#EAE2D6);margin-top:5px;line-height:1.15;}
  .kk-neden-govde{margin-top:16px;display:flex;flex-direction:column;gap:9px;}
  /* Beyan ALTIN (kullanıcının kendi sesi — "olduğun" ekseni), ölçüm kısık
     (motorun sesi). Hiyerarşi renkle kurulur: §TASARIM-PRENSIPLERI. */
  .kk-neden-satir{font-family:var(--serif,Georgia);font-size:13px;line-height:1.55;
    color:var(--text-mid,#95897A);padding-left:13px;position:relative;}
  .kk-neden-satir::before{content:'·';position:absolute;left:2px;color:var(--text-dim,#6E6558);}
  .kk-neden-satir--beyan{color:var(--gold,#F5A623);}
  .kk-neden-satir--beyan::before{color:var(--gold,#F5A623);}
  .kk-neden-satir--kesif{color:var(--lapis-bright,#5A8AD8);font-style:italic;}
  .kk-neden-satir--kesif::before{color:var(--lapis-bright,#5A8AD8);}

  .kk-neden-alinti{margin-top:15px;padding:13px 14px;border-radius:var(--radius,14px);
    border:1px solid rgba(245,166,35,.18);background:rgba(245,166,35,.05);}
  .kk-neden-alinti-h{font-family:var(--cinzel,serif);font-size:8px;letter-spacing:1.8px;
    color:var(--gold,#F5A623);text-transform:uppercase;}
  .kk-neden-alinti-q{margin:8px 0 0;font-family:var(--serif,Georgia);font-style:italic;
    font-size:14px;line-height:1.6;color:var(--text,#EAE2D6);}
  /* Yorum İHTİMALSEL konuşur ve yalnız alıntıyla birlikte var olur —
     kısık renk bunu görsel olarak da söyler (iddia değil, ihtimal). */
  .kk-neden-yorum{margin-top:9px;font-family:var(--serif,Georgia);font-size:11.5px;
    font-style:italic;color:var(--text-dim,#6E6558);line-height:1.5;}

  .kk-neden-alt{margin-top:18px;padding-top:13px;border-top:1px solid rgba(234,226,214,.07);
    font-family:var(--serif,Georgia);font-style:italic;font-size:11.5px;
    color:var(--text-dim,#6E6558);line-height:1.5;}
  .kk-neden-susmus{font-family:var(--serif,Georgia);font-style:italic;font-size:11.5px;
    color:var(--gold,#F5A623);margin-bottom:10px;}
  .kk-neden-nav{margin-top:15px;display:flex;flex-direction:column;gap:9px;}
  .kk-neden-btn{width:100%;}
  .kk-neden-kapat{width:100%;}
  #kk-olus-slot .kk-esik-nisan{margin:0 0 8px;}
  /* Raf modunda alt satır Wanderer'ın alçak sesidir — bir ipucu değil,
     kararın kimde olduğunun hatırlatması: altın vurguyu bırakır, sessizleşir. */
  .kk-emre-hint--raf{color:var(--text-mid,#95897A);opacity:.9;}
  /* Oluş beyanı — hedef mührünün karşı kutbu: "oldum" der, kanıtı sınama ister */
  .kk-olus-btn{display:block;width:100%;margin:0 0 10px;font-size:12px;letter-spacing:1.6px;line-height:1.45;}
  .kk-olus-bekle{margin:0 0 12px;padding:10px 14px;text-align:left;
    border:1px solid rgba(148,140,128,.22);border-radius:var(--radius-lg,20px);
    font-family:var(--serif,Georgia);font-style:italic;font-size:12.5px;color:var(--text-dim,#585349);}
  .kk-hedef-on{display:flex;align-items:center;flex-wrap:wrap;gap:10px;margin:0 0 16px;padding:12px 14px;text-align:left;
    border:1px solid rgba(90,138,216,.3);border-radius:var(--radius-lg,20px);
    background:radial-gradient(120% 100% at 0% 0%, rgba(45,95,168,.14), transparent 62%),rgba(10,12,18,.5);}
  .kk-hedef-on-mark{color:var(--gold,#F5A623);font-size:13px;text-shadow:0 0 10px rgba(245,166,35,.55);}
  .kk-hedef-on-txt{flex:1 1 auto;font-family:var(--serif,Georgia);font-style:italic;font-size:12.5px;color:var(--lapis-bright,#5A8AD8);}
  .kk-hedef-undo{flex:0 0 auto;min-height:34px;padding:0 12px;border-radius:var(--radius-full,999px);cursor:pointer;
    border:1px solid rgba(148,140,128,.28);background:transparent;color:var(--text-dim,#585349);
    font-family:var(--cinzel,serif);font-size:8.5px;letter-spacing:1.8px;transition:color .2s ease,border-color .2s ease;}
  .kk-hedef-undo:hover{color:var(--text-mid,#95897A);border-color:rgba(148,140,128,.5);}

  /* Tören sahnesi — lapis perde + ALTIN damga (prensip 1: mühür daima altın) */
  .kk-hedef-seal{position:absolute;inset:0;z-index:3;display:flex;align-items:center;justify-content:center;pointer-events:none;}
  .kk-hedef-seal-veil{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,rgba(26,44,84,.72),rgba(6,8,14,.94));
    backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);animation:kkFade .45s ease both;}
  .kk-hedef-seal-stars{position:absolute;inset:0;opacity:.5;
    background-image:radial-gradient(1.4px 1.4px at 18% 24%,rgba(200,220,255,.9),transparent),
      radial-gradient(1.2px 1.2px at 72% 18%,rgba(200,220,255,.75),transparent),
      radial-gradient(1.6px 1.6px at 38% 68%,rgba(200,220,255,.8),transparent),
      radial-gradient(1.2px 1.2px at 84% 62%,rgba(200,220,255,.7),transparent),
      radial-gradient(1.3px 1.3px at 56% 86%,rgba(200,220,255,.65),transparent);
    animation:kkFade .8s ease .25s both;}
  .kk-hedef-seal-stage{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;padding:0 26px;text-align:center;}
  .kk-hedef-seal-stamp{width:74px;height:74px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    font-size:30px;color:#1A1206;
    background:radial-gradient(circle at 38% 30%,var(--gold-bright,#F7C744),var(--gold,#F5A623) 58%,#D98F1B);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 0 34px rgba(245,166,35,.65),0 6px 18px rgba(0,0,0,.5);
    animation:kkHedefStamp .7s var(--ease-spring,cubic-bezier(.34,1.56,.64,1)) .35s both;}
  .kk-hedef-seal-kicker{font-family:var(--cinzel,serif);font-size:9px;letter-spacing:3.4px;color:var(--gold,#F5A623);
    animation:kkHedefIn .55s var(--ease-out,ease) 1s both;}
  .kk-hedef-seal-line{font-family:var(--serif,Georgia);font-style:italic;font-size:17px;color:var(--text,#EAE2D6);max-width:30ch;line-height:1.5;
    animation:kkHedefIn .55s var(--ease-out,ease) 1.15s both;}
  .kk-hedef-seal-sub{font-family:var(--serif,Georgia);font-size:13px;color:var(--text-mid,#95897A);max-width:34ch;line-height:1.6;
    animation:kkHedefIn .55s var(--ease-out,ease) 1.4s both;}
  .kk-hedef-seal-flash{position:absolute;inset:0;pointer-events:none;
    background:radial-gradient(60% 50% at 50% 46%,rgba(245,166,35,.30),transparent 70%);
    animation:kkHedefFlash 1s ease-out .9s both;}
  @keyframes kkHedefStamp{0%{opacity:0;transform:scale(2.1) rotate(-16deg);}60%{opacity:1;}100%{opacity:1;transform:scale(1) rotate(0);}}
  @keyframes kkHedefIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
  @keyframes kkHedefFlash{0%{opacity:0;}30%{opacity:1;}100%{opacity:0;}}
  @media (prefers-reduced-motion:reduce){
    .kk-hedef-seal-veil,.kk-hedef-seal-stars,.kk-hedef-seal-stamp,.kk-hedef-seal-kicker,
    .kk-hedef-seal-line,.kk-hedef-seal-sub,.kk-hedef-seal-flash{animation:none;opacity:1;transform:none;}
    .kk-hedef-seal-flash{opacity:0;}
  }
  .kk-det-req{border:1px solid rgba(90,138,216,.25);border-radius:var(--radius-lg,20px);padding:14px 16px;margin-bottom:16px;text-align:left;
    background:radial-gradient(120% 100% at 100% 0%, rgba(45,95,168,.13), transparent 60%),rgba(10,12,18,.55);}
  .kk-det-req-h{font-family:var(--cinzel,serif);font-size:9px;letter-spacing:2.5px;color:var(--lapis-bright,#5A8AD8);line-height:1.5;margin-bottom:8px;}
  .kk-det-req-list{margin:8px 0 0;padding:0;list-style:none;}
  .kk-det-req-list li{font-family:var(--serif,Georgia);font-style:italic;font-size:12.5px;color:var(--text-mid,#95897A);margin-bottom:6px;padding-left:17px;position:relative;line-height:1.5;}
  .kk-det-req-list li::before{content:'→';position:absolute;left:0;color:var(--gold,#F5A623);font-style:normal;}
  .kk-det-req-ok{font-family:var(--serif,Georgia);font-style:italic;font-size:12.5px;color:var(--gold,#F5A623);}
  .kk-det-near{font-family:var(--cinzel,serif);font-size:9px;letter-spacing:2px;color:var(--gold,#F5A623);margin:2px 0 8px;}
  /* "En ince yerin" — hazırlığı kısan boyutun adı. Sayaç değil yön cümlesi:
     serif+italik, eksikler listesinin üstünde durur (13x). */
  .kk-det-zayif{font-family:var(--serif,Georgia);font-style:italic;font-size:11.5px;
    color:var(--text-mid,#a89f8e);line-height:1.5;margin:2px 0 9px;}
  .kk-det-route{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}
  .kk-det-route-chip{display:inline-flex;align-items:center;min-height:36px;padding:0 14px;border-radius:var(--radius-full,999px);
    border:1px solid rgba(90,138,216,.35);background:rgba(45,95,168,.10);color:var(--lapis-bright,#5A8AD8);
    font-family:var(--serif,Georgia);font-style:italic;font-size:11.5px;cursor:pointer;
    transition:border-color .2s ease,background .2s ease;}
  .kk-det-route-chip:hover{border-color:rgba(90,138,216,.6);background:rgba(45,95,168,.18);}
  .kk-det-route-chip:focus-visible{outline:2px solid var(--lapis-bright,#5A8AD8);outline-offset:2px;}
  /* Dört asli unsur — kartın içinde 2×2. Ölçüler cqw: 420px kartta rahat,
     337px kartta sıkışmadan küçülür. Çok dar kartta ızgara tek kolona iner
     (iki kolon 130px'in altında kelime kırar). */
  .kk-det-traits{display:grid;grid-template-columns:1fr 1fr;gap:3.4cqw 4.5cqw;text-align:left;position:relative;}
  .kk-det-traits::before{content:'';position:absolute;top:3%;bottom:3%;left:50%;width:1px;background:linear-gradient(180deg,transparent,rgba(245,166,35,.22),transparent);}
  .kk-det-trait-h{font-family:var(--cinzel,serif);font-size:9px;font-size:3.4cqw;letter-spacing:1.2px;color:var(--gold,#F5A623);margin-bottom:1.6cqw;line-height:1.3;}
  .kk-det-trait ul{margin:0;padding:0;list-style:none;}
  .kk-det-trait li{font-family:var(--serif,Georgia);font-style:italic;font-size:11px;font-size:4.2cqw;
    color:var(--text-mid,#95897A);margin-bottom:1.7cqw;padding-left:3.2cqw;position:relative;line-height:1.45;}
  .kk-det-trait li:before{content:'·';position:absolute;left:0;color:var(--gold,#F5A623);}
  .kk-det-lapis .kk-det-trait-h,.ikv-card--lapis .kk-det-trait-h{color:var(--lapis-bright,#5A8AD8);}
  .ikv-card--lapis .kk-det-trait li:before{color:var(--lapis-bright,#5A8AD8);}
  .ikv-card--lapis .kk-det-kutu::before{background:linear-gradient(90deg,transparent,rgba(90,138,216,.32),transparent);}
  @container (max-width: 330px){
    .kk-det-traits{grid-template-columns:1fr;}
    .kk-det-traits::before{display:none;}
  }

  /* Aradaki yol — metin kutusunun kapanışı: unsurlardan sonra ÖLÇÜ gelir */
  .kk-det-yol{margin-top:4cqw;padding-top:3.2cqw;position:relative;}
  .kk-det-yol::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:rgba(234,226,214,.08);}
  .kk-det-yol-k{font-family:var(--cinzel,serif);font-size:8px;font-size:3.1cqw;letter-spacing:2.2px;
    color:var(--text-dim,#585349);margin-bottom:2.6cqw;}
  .kk-det-yol .ikv-ms-label{font-size:11px;font-size:4cqw;margin-top:2.6cqw;line-height:1.5;}
  .kk-det-yol .ikv-ms-label b{color:var(--gold,#F5A623);font-weight:700;font-family:var(--cinzel,serif);font-size:.92em;letter-spacing:.5px;}

  /* pack butonları — dövülmüş altın mühür + hayalet (12c mühür diliyle aynı) */
  .kk-btn-primary{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 26px;border:none;border-radius:var(--radius-full,999px);cursor:pointer;
    font-family:var(--cinzel,serif);font-size:11px;letter-spacing:2.5px;font-weight:700;color:#1A1206;
    background:linear-gradient(180deg,var(--gold-bright,#F7C744),var(--gold,#F5A623) 55%,#D98F1B);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.38),0 6px 18px rgba(245,166,35,.28),0 2px 6px rgba(0,0,0,.4);
    transition:transform .15s var(--ease-out,ease);}
  .kk-btn-primary:active{transform:scale(.93);}
  .kk-btn-ghost{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 20px;background:transparent;
    border:1px solid rgba(234,226,214,.28);border-radius:var(--radius-full,999px);cursor:pointer;
    font-family:var(--cinzel,serif);font-size:10.5px;letter-spacing:2px;color:rgba(234,226,214,.75);transition:border-color .2s ease;}
  .kk-btn-ghost:hover{border-color:rgba(245,166,35,.45);}
  .kk-btn-primary:focus-visible,.kk-btn-ghost:focus-visible{outline:2px solid var(--gold,#F5A623);outline-offset:2px;}

  /* ── keyframes ── */
  @keyframes kkFade{from{opacity:0}to{opacity:1}}
  @keyframes kkRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes kkDetIn{from{opacity:0;transform:translateY(26px) scale(.94)}to{opacity:1;transform:translateY(0) scale(1)}}
  @keyframes kkBlink{0%,49%{opacity:1}50%,100%{opacity:.25}}
  @keyframes kkScan{from{background-position:0 0}to{background-position:0 100px}}
  @keyframes kkPackIn{from{opacity:0;transform:scale(.6) rotate(-8deg)}to{opacity:1;transform:scale(1) rotate(0)}}
  @keyframes kkPackWobble{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}
  @keyframes kkFoil{0%{background-position:0% 50%}100%{background-position:300% 50%}}
  @keyframes kkShine{0%{left:-30%}60%,100%{left:130%}}
  @keyframes kkPackRip{0%{transform:rotate(0) scale(1)}30%{transform:rotate(-3deg) translateY(-6px)}100%{transform:translateY(-40px) scale(1.1);opacity:0;filter:blur(4px)}}
  @keyframes kkRevealIn{from{opacity:0;transform:translateY(30px) rotateY(180deg) scale(.8)}to{opacity:1;transform:translateY(0) rotateY(0) scale(1)}}
  @keyframes kkBurst{0%{box-shadow:0 0 0 0 rgba(255,220,140,.9),0 0 0 0 rgba(255,180,80,.6)}100%{box-shadow:0 0 0 220px rgba(255,220,140,0),0 0 0 360px rgba(255,180,80,0)}}
  /* ── ÇOK KARTLI TÖREN (yelpaze) — kk-pack kabuğunun rip-sonrası katmanı.
     TEK TÜKETİCİ: 12f hzOpenPack (hazine paketi, çok kartlı çekiliş). 10q'nun
     kendi kkOpenFan'ı Oluş Mührü sökümünde (K0) gitti — kart artık DAĞITILMAZ,
     tek tek beyan edilir; stiller sınıf-nötr kk- önekini korur çünkü 12f'nin
     tek tüketiciliği bu adı miras aldı, yeniden adlandırmak 12f'yi de değiştirirdi.
     Giriş animasyonu OUTER'da (.kk-fan-card), flip transformu INNER'da
     (.kk-fan-inner) — ikisi aynı elementte çakışırsa dolan keyframe transform'u
     class-toggle transform'unu ezer (12d nested-flip gotcha'sı). ── */
  .kk-fan{display:flex;gap:12px;justify-content:center;align-items:flex-start;flex-wrap:wrap;padding:0 8px;perspective:1200px;}
  .kk-fan-card{position:relative;width:120px;max-width:30vw;opacity:0;transform:translateY(24px);animation:kkFanIn .5s var(--ease-out) both;animation-delay:calc(var(--i,0) * 140ms);cursor:pointer;}
  @keyframes kkFanIn{to{opacity:1;transform:translateY(0)}}
  /* ── BEKLENTİ IŞIĞI — nadirlik flip'ten ÖNCE fısıldar ────────────────────
     Kart daha çevrilmeden sırtının çevresi kendi nadirlik rengiyle (--rar,
     12b RARITIES) nefes alır: yaygın sessizdir, yukarı çıktıkça ışık büyür
     ve hızlanır. Kart çevrilince ışık söner — beklenti bitti, gerçek geldi;
     bundan sonra konuşan kartın kendi folyosudur (12c RAR_FOIL).
     Katman OUTER'ın ::after'ıdır: .kk-fan-inner flip transformunu, kart
     gövdesi de backface-visibility'yi taşır — ışığı oraya asmak 3D bağlamı
     kirletirdi (12d nested-flip gotcha'sının kardeşi). */
  .kk-fan-card::after{content:'';position:absolute;inset:-26%;border-radius:50%;pointer-events:none;
    background:radial-gradient(ellipse at center,var(--rar,transparent) 18%,transparent 72%);filter:blur(9px);opacity:0;
    transition:opacity .45s var(--ease-out);}
  .kk-fan-card[data-rarity=nadir]{--bekle-min:.16;--bekle-max:.38;}
  .kk-fan-card[data-rarity=nadide]{--bekle-min:.24;--bekle-max:.58;}
  .kk-fan-card[data-rarity=efsane]{--bekle-min:.34;--bekle-max:.8;}
  .kk-fan-card[data-rarity=nadir]::after,
  .kk-fan-card[data-rarity=nadide]::after{animation:kkBekle 2.4s ease-in-out infinite;}
  .kk-fan-card[data-rarity=efsane]::after{animation:kkBekle 1.5s ease-in-out infinite;}
  .kk-fan-card.is-flipped::after{animation:none!important;opacity:0!important;}
  @keyframes kkBekle{
    0%,100%{opacity:var(--bekle-min,0);transform:scale(.93)}
    50%{opacity:var(--bekle-max,0);transform:scale(1.07)}
  }
  /* z-index:1 — beklenti ışığı (::after) kartın ARKASINDA kalsın. Negatif
     z-index yerine bu: reduced-motion'da .kk-fan-card'ın transformu silinir,
     stacking context'i düşer ve -1 ışığı tüm sahnenin arkasına atardı. */
  .kk-fan-inner{position:relative;z-index:1;transform-style:preserve-3d;transition:transform .6s var(--ease-spring);}
  .kk-fan-card.is-flipped .kk-fan-inner{transform:rotateY(180deg);}
  .kk-fan-back,.kk-fan-front{backface-visibility:hidden;-webkit-backface-visibility:hidden;}
  .kk-fan-front{position:absolute;inset:0;transform:rotateY(180deg);}
  .kk-fan-badge{position:absolute;top:6px;right:6px;font-family:var(--cinzel);font-size:8px;letter-spacing:1.5px;padding:3px 7px;border-radius:999px;background:var(--gold);color:var(--gold-ink);}
  .kk-fan-badge--holo{background:var(--lapis-bright);color:#fff;}
  .kk-fan-badge--refund{background:rgba(255,255,255,0.14);color:var(--text);}
  @media (prefers-reduced-motion: reduce){
    .kk-pack,.kk-pack-foil,.kk-pack-shine,.kk-scanlines,.kk-pack-kicker,.kk-pack-hint,
    .kk-reveal-in,.kk-pack-caption,.kk-fade-in,.kk-burst::before,
    .kk-det-flip,.kk-det-backdrop,.kk-det-veil,.kk-det-body > *,.kk-det-aura,.kk-det-dawn,.kk-spot::before,
    .kk-empty-glyph{animation:none!important}
    /* Altın kartın nabzı durur ama ALTINI kalır: prestij bir animasyon
       değil, bir mühürdür — hareketi kapatan kullanıcı ödülünü kaybetmez. */
    .kk-card3d--altin .kk-card3d-face{animation:none!important;
      box-shadow:0 0 0 1px rgba(247,199,68,.9),0 0 16px rgba(245,166,35,.32);}
    .kk-grid-cell,.kk-card3d-inner,.kk-btn-primary,.kk-det-flip-inner,.kk-det-route-chip,.kk-fan-inner{transition:none!important}
    /* Yelpaze kartının açılış durumu animasyonun İÇİNDE (opacity:0 → 1).
       Yalnız animation:none dersek fill-mode ile birlikte o son kare de
       gider ve kart görünmez donar — bitiş durumu elle verilmeli. */
    .kk-fan-card{animation:none!important;opacity:1;transform:none;}
    /* Beklenti ışığı nefes almaz ama SUSMAZ: nabız yerine sabit ışık —
       nadirlik ipucu hareketsiz kullanıcıdan da esirgenmemeli. */
    .kk-fan-card::after{animation:none!important;transform:none!important;opacity:var(--bekle-max,0);}
  }
  `;
  const style = document.createElement('style');
  style.id = 'kk-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

/* ── Yapı merceğinden ızgaraya dönüş köprüsü (10q3 "+N" düğümü çağırır).
   Mercek state'i 10q'nun içinde yaşadığı için anahtar burada. ─────────── */
if (typeof window !== 'undefined') {
  window.byShowGrid = () => { _kkMercek = 'izgara'; try { loadKisilerimView(); } catch (_) {} };
  // Dönem Kartı (K7) — 10q2 Bugün rafı buradan okur (TDZ-güvenli window erişimi).
  window.kkDonemErdem = kkDonemErdem;
  // SIRTLAR — kkSirtSecili 12c'nin TEK köprüsüdür (12c 10q'yu import edemez,
  // döngü olurdu); kkSirtKazan'ı 12f ve 10t tören içinden çağırır.
  window.kkSirtSecili = kkSirtSecili;
  window.kkSirtKazan = kkSirtKazan;
  window.kkSirtSec = kkSirtSec;
  window.kkSirtSahip = kkSirtSahip;
  // "Neden bu?" (FAZ 7) — 13o gibi 10q'yu import edemeyen yüzeyler paneli
  // buradan açar; giriş düğmesinin HTML'ini de aynı köprüden alırlar ki
  // K7 kapısı (kanıtsızsa giriş yok) tek yerde kalsın.
  window.kkNedenAc = kkNedenAc;
  window.kkNedenGirisHTML = kkNedenGirisHTML;
  // Kazanımın zaman ekseni — Dönüşüm Aynası ve salon başlığı buradan okur.
  window.kkKazanimAylik = kkKazanimAylik;
  // Canlı ölçüm (K6) — private, ama preview'da elle doğrulanabilsin diye
  // köprüde: konsoldan sinyal besleyip `_kkDetayCanli()` çağrıldığında çizgi
  // ve yüzde tazelenmeli. Ürün kodu bunu çağırmaz, kkTick çağırır.
  window._kkDetayCanli = _kkDetayCanli;
}
