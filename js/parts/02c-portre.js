// Wanderer AI — PORTRE 2.0 / "Olunan [Ad]"
// =====================================================================
// Uygulamanın İLK onboarding deneyimi. Kullanıcı kendi kartını yazar:
// her kategoride (Düşünceler · İnançlar · Duygular · Davranışlar) en az
// 6 madde. Yönlendirmelerle yardım edilir. Cevaplar bitince arkada LLM
// sentezi çalışır ve "Olunan [Ad]" kartı doğar — kullanıcı mühürler.
//
// FELSEFE: bu kart kullanıcının TEK CANLI KİMLİK KARTI'dır. Yolculuk
// boyunca üç damardan beslenir: (1) kullanıcının el yazısı, (2) Emre'nin
// seans-sonu çıkarımları, (3) EVRİM KÖPRÜSÜ — kazanılan her Kişi Kartı'nın
// (10q/12b) bildikleri karta işlenir ve LLM portreyi yeniden yazar.
// Sen değiştikçe kartın değişir — çünkü mesele sensin.
//
// Eski "Yol Ayini" (02b) ritüelinin YERİNE geçer:
//   • S._foundationsProfile        ← sentezden tahmin temel puanları
//   • S._personTransition          ← "olman gereken kişi"
//   • S._onboardingRecommendation  ← sentez sonucu
//   • S._portre               ← kullanıcı kartı (+ Emre eklemeleri)
//
// Metinler i18n t() üzerinden (TR/EN). LLM sentez çıktısı kullanıcının diline
// uyar (getLangInstruction callLLM'de eklenir — dil-kilidi kaldırıldı).
// =====================================================================

import { S } from '../state.js';
import { sb, SUMMARY_MODEL } from '../config.js';
import { SafeStorage, showToast, A11y } from './00a-infrastructure.js';
import { t, langBeyanVar, openLangGate } from './15-i18n.js';
import { p } from './16-i18n-prompts.js';
import { callLLM } from './04-llm-hero-history.js';
import { dfSave } from './09b-depth-foundations.js';
import { getArchetypeById } from './12a-archetypes.js';
import { getCardById, deckReady, getFullDeck } from './12b-kart-destesi.js';
import { ikvCardFace, ikvCardBack, ikvEnsureStyles, ikvHoloScan } from './12c-kart-gorsel.js';
// Yalnız retroaktif absorb (porBackfillCollection) için: "sahipli/sahipsiz"
// bölme mantığı 10q'nun tek doğruluk kaynağıdır — ikinci bir bölücü YAZILMAZ.
// Döngü riski yok: 10q-w2-kisi-karti.js 02c-portre.js'i statik import ETMEZ
// (canlı kazanımda `window.porAbsorbCard?.()` köprüsünü kullanır).
import { kkPartitionDeck } from './10q-w2-kisi-karti.js';

/* ══════════════════════════════════════════════════════════════
   KATEGORİLER — yapısal iskelet; metinler i18n'den (modül-yükünde
   DONMASIN diye çözücüler fonksiyon, render anında t() çağırır)
══════════════════════════════════════════════════════════════ */
const CATS = [
  { key: 'dusunceler',  sigil: '☉', sparkCount: 6 },
  { key: 'inanclar',    sigil: '✷', sparkCount: 6 },
  { key: 'duygular',    sigil: '❍', sparkCount: 6 },
  { key: 'davranislar', sigil: '✺', sparkCount: 6 },
];

const CAT_ORDER = ['dusunceler', 'inanclar', 'duygular', 'davranislar'];
const MIN_PER_CAT = 6;
const FOUND_KEYS = ['oz_sevgi', 'oz_saygi', 'oz_deger', 'oz_guven', 'bolluk'];

/* i18n çözücüler — dil değişiminde taze kalsın diye fonksiyon (const değil) */
const catLabel   = k => t('por.label.' + k);
const foundLabel = k => t('por.found.' + k);
const catBadge   = k => t('por.cat.' + k + '.badge');
const catTitle   = k => t('por.cat.' + k + '.title');
const catDesc    = k => t('por.cat.' + k + '.desc');
const catDiff    = k => t('por.cat.' + k + '.diff');
const catPh      = k => t('por.cat.' + k + '.ph');
const catSpark   = (k, i) => t('por.cat.' + k + '.spark' + i);

// Zayıf temel → arketip (02b foundationArch ile aynı harita)
const FOUNDATION_ARCH = {
  oz_deger: 'hak-eden', oz_guven: 'cesur', bolluk: 'sukreden',
  oz_saygi: 'sinir', oz_sevgi: 'yansiyan',
};

/* ══════════════════════════════════════════════════════════════
   KALICILIK — SafeStorage (Emre hafızası KV) + portre tablosu
   ───────────────────────────────────────────────────────────
   Ad senkronu (§4.3): anahtarlar da "Portrem" adını taşır. Kullanıcının
   cihazında eski "Benlik Kartı" dönemi anahtarları duruyor olabilir —
   _porMigrateKeys() ilk okumadan önce tek seferlik geri-okuma yapar;
   eski anahtar KASITLI olarak silinmez (veri kaybı kabul edilemez).
══════════════════════════════════════════════════════════════ */
const PORTRE_KEY = uid => `etw_portre_karti_${uid}`;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function emptyCard() {
  return {
    dusunceler: [], inanclar: [], duygular: [], davranislar: [],
    baslik: '', portrait: '', confirmed: false,
    version: 1, history: [], sahne: null,
    created_at: null, updated_at: null,
  };
}

/** Onboarding sürerken ara kayıt (tarayıcı kapanırsa veri kaybolmasın) */
const DRAFT_KEY = uid => `etw_portre_draft_${uid}`;

/** Kartın kullanıcıya en son gösterilen versiyonu (evrim nabzı için). */
const SEEN_V_KEY = uid => `etw_portre_seen_v_${uid}`;

/** Ad senkronu göçü — [yeni, eski] çiftleri. Eski adlar "Benlik Kartı"
 *  döneminden kalma; yalnız geri-okuma için burada duruyorlar. */
const _PORTRE_KEY_GOC = uid => ([
  [PORTRE_KEY(uid),     `etw_benlik_karti_${uid}`],
  [DRAFT_KEY(uid),      `etw_benlik_draft_${uid}`],
  [ABSORB_Q_KEY(uid),   `etw_benlik_absorb_q_${uid}`],
  [EVRIM_WAVE_KEY(uid), `etw_benlik_evrim_wave_${uid}`],
  [SEEN_V_KEY(uid),     `etw_benlik_seen_v_${uid}`],
]);

/** Tek seferlik ad göçü — her okumadan ÖNCE koşar, idempotenttir
 *  (yeni anahtar doluysa hiçbir şey yapmaz). */
function _porMigrateKeys(uid) {
  if (!uid) return;
  try { _PORTRE_KEY_GOC(uid).forEach(([yeni, eski]) => SafeStorage.migrateKey(yeni, eski)); }
  catch (_) {}
}

let _lifecycleFlushInstalled = false;

/** Sekme gizlenirken/gerçek navigasyonda bekleyen evrim kaydı varsa hemen
 *  yaz — 00f-kullanim-nabzi.js'teki visibilitychange(hidden)+pagehide
 *  kalıbı birebir (iOS/Capacitor'da güvenilir tek sinyal hidden'dır).
 *  Yeniden LLM/resynth TETİKLEMEZ — arka plana geçince ağ çağrısı iOS'ta
 *  ölür; dalga zaten KV'ye yazılıdır (_waveSave), sonraki açılışta işlenir. */
function _installLifecycleFlush() {
  if (_lifecycleFlushInstalled || typeof document === 'undefined') return;
  _lifecycleFlushInstalled = true;
  const flush = () => {
    if (_evrimTimer) { clearTimeout(_evrimTimer); _evrimTimer = null; porSave(); }
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  window.addEventListener('pagehide', flush);
}

export function porLoad() {
  if (!S.currentUser?.id) return;
  _porMigrateKeys(S.currentUser.id);   // ad senkronu: etw_benlik_* → etw_portre_*
  try {
    const stored = SafeStorage.get(PORTRE_KEY(S.currentUser.id), null);
    if (stored && typeof stored === 'object') {
      S._portre = { ...emptyCard(), ...stored };
      // dizileri + evrim alanlarını garanti altına al (eski KV kayıtları alansız)
      CAT_ORDER.forEach(k => { if (!Array.isArray(S._portre[k])) S._portre[k] = []; });
      if (!Number.isFinite(S._portre.version) || S._portre.version < 1) S._portre.version = 1;
      if (!Array.isArray(S._portre.history)) S._portre.history = [];
    }
    // Yarım kalmış evrim dalgası — önceki oturum debounce penceresinde
    // kapandıysa kaybolmasın diye kalıcılaştırılmıştı; devral.
    const wave = SafeStorage.get(EVRIM_WAVE_KEY(S.currentUser.id), []);
    if (Array.isArray(wave) && wave.length) {
      _evrimWave = wave;
      _resynthPending = true;
    }
  } catch (e) { console.warn('porLoad:', e?.message); }
  _installLifecycleFlush();
}

// mig 031 (sahne) + mig 032 (version/history) kolonları — koşmadıysa 42703
// (undefined_column) gelir; o oturumda evrim alanlarını satırdan çıkarıp
// KV-only bırakırız (10D _oikSahneColOk kalıbı). Hiçbir akış kırılmaz.
let _portreEvrimColsOk = true;

/* Ad senkronu (§4.3) — tablo da yeni adı taşır. mig 039 ELLE iştir ve
   deploy edilmiş VARSAYILMAZ: yeni ad 42P01 (undefined_table) dönerse
   oturum boyu eski ada düşülür (10A _gkTable kalıbı). */
const PORTRE_TABLE = 'portre';
const PORTRE_TABLE_LEGACY = 'benlik_karti'; // mig 039 koşmadıysa
let _portreTable = PORTRE_TABLE;

/** Tipli tabloya best-effort upsert — iki ayrı düşüş zinciri:
 *  42P01 (tablo yok, mig 039 koşmadı)  → eski tablo adına düş, oturum boyu
 *  42703 (kolon yok, mig 031/032 koşmadı) → evrim alanlarını çıkarıp yeniden dene
 *  Hiçbiri tutmazsa sessizce KV-only kalınır; akış kırılmaz. */
function _portreUpsert(row) {
  const dene = (tablo, satir) =>
    sb.from(tablo).upsert([satir], { onConflict: 'user_id' }).then(({ error }) => {
      if (!error) return;
      if (error.code === '42P01' && tablo !== PORTRE_TABLE_LEGACY) {
        _portreTable = PORTRE_TABLE_LEGACY;
        return dene(PORTRE_TABLE_LEGACY, satir);
      }
      if (error.code === '42703' && _portreEvrimColsOk) {
        _portreEvrimColsOk = false;
        const { version, history, sahne, ...rest } = satir;
        return dene(tablo, rest);
      }
      console.warn('portre upsert:', error.message);
    });
  return dene(_portreTable, row);
}

/** Kalıcılık: SafeStorage KV = OKUMA kaynağı (porLoad buradan okur;
 *  login sonrası storageInit ile server-hydrate). `portre` tablosu
 *  yazma-yönlü tipli bir projeksiyondur (SQL/analitik/admin erişimi +
 *  felaket yedeği) — repo hiçbir yerde bu tablodan okumaz, dolayısıyla
 *  client için asla KV'den taze olamaz. Felaket restorasyonu bilinçli
 *  olarak manueldir (satır → KV anahtarına elle kopyalanır). */
export function porSave() {
  if (!S.currentUser?.id) return;
  const card = S._portre;
  if (!card) return;
  card.updated_at = new Date().toISOString();
  if (!card.created_at) card.created_at = card.updated_at;
  try { SafeStorage.set(PORTRE_KEY(S.currentUser.id), card); }
  catch (e) { console.warn('porSave (KV):', e?.message); }
  // Tipli tablo — best-effort senkron (cihazlar arası / yapısal erişim)
  try {
    const row = {
      user_id:     S.currentUser.id,
      dusunceler:  card.dusunceler,
      inanclar:    card.inanclar,
      duygular:    card.duygular,
      davranislar: card.davranislar,
      baslik:      card.baslik || '',
      portrait:    card.portrait || '',
      confirmed:   !!card.confirmed,
      updated_at:  card.updated_at,
    };
    if (_portreEvrimColsOk) {
      row.version = card.version || 1;
      row.history = card.history || [];
      row.sahne   = card.sahne || null;
    }
    _portreUpsert(row);
  } catch (_) {}
}

/** Bir madde ekle. src: 'user' (kullanıcı) | 'emre' (çıkarım) | 'kart' (kazanılan kart).
 *  ref: madde bir Kişi Kartı'ndan geldiyse kart id'si (rozet + tekrar-koruması).
 *  Aynı/çok-benzer madde varsa eklemez. Döner: eklendi mi. */
export function porAddEntry(cat, text, src = 'user', ref = null) {
  if (!CAT_ORDER.includes(cat)) return false;
  if (!S._portre) S._portre = emptyCard();
  const clean = String(text || '').trim().replace(/\s+/g, ' ').slice(0, 180);
  if (clean.length < 2) return false;
  if (!Array.isArray(S._portre[cat])) S._portre[cat] = [];
  const list = S._portre[cat];
  const norm = s => s.toLocaleLowerCase('tr').replace(/[.,!?;:"'…]/g, '').trim();
  if (list.some(e => norm(e.text) === norm(clean))) return false;
  const entry = { text: clean, src, at: new Date().toISOString() };
  if (ref) entry.ref = ref;
  list.push(entry);
  return true;
}

export function porRemoveEntry(cat, idx) {
  const list = S._portre?.[cat];
  if (Array.isArray(list) && idx >= 0 && idx < list.length) {
    list.splice(idx, 1);
    porSave();
    if (document.getElementById('portre-root')) loadPortreView();
  }
}

/* ══════════════════════════════════════════════════════════════
   LLM SENTEZİ — "OLDUĞUN KİŞİ" + temel tahmini
══════════════════════════════════════════════════════════════ */
/** marks:true ise madde kaynağını [KART]/[EMRE] işaretiyle gösterir
 *  (resynth'in LLM'e verdiği liste) — varsayılan sade liste (synthPrompt). */
function cardListText(card, { marks = false } = {}) {
  return CAT_ORDER.map(k =>
    `${catLabel(k)}:\n` + (card[k] || []).map(e =>
      `- ${e.text}${marks && e.src === 'kart' ? ' [KART]' : marks && e.src === 'emre' ? ' [EMRE]' : ''}`
    ).join('\n')
  ).join('\n\n');
}

// Yönlendirme sözlükte (16b) — canlı hâli admin "Emre'nin Sesi" odasından gelebilir.
const SYNTH_SYSTEM = () => p('prompt.portre.synth_system');

function synthPrompt(card) {
  return [
    'Aşağıda kullanıcının kendi yazdığı kartı var.',
    '',
    cardListText(card),
    '',
    'Bu maddelere bakarak ŞU AN olduğu kişiyi sentezle. Kullanıcının diliyle, "sen" diliyle, sıcak ve dürüst.',
    'Şu JSON şemasını döndür:',
    '{',
    '  "baslik": "2-4 kelimelik şiirsel kimlik başlığı (örn. \'Onay Bekleyen Kâşif\')",',
    '  "portrait": "2-3 cümle: bu kişi şu an kim. Yargısız, ayna gibi, umut bırakan.",',
    '  "dusunceler_ozet": "düşüncelerinin tek cümlelik örüntüsü",',
    '  "inanclar_ozet": "inançlarının tek cümlelik örüntüsü",',
    '  "duygular_ozet": "duygularının tek cümlelik örüntüsü",',
    '  "davranislar_ozet": "davranışlarının tek cümlelik örüntüsü",',
    '  "foundations": { "oz_sevgi": 0-100, "oz_saygi": 0-100, "oz_deger": 0-100, "oz_guven": 0-100, "bolluk": 0-100 },',
    '  "pattern": "seni en çok durduran kalıbın kısa adı (1-3 kelime)",',
    '  "oneri": "hedefine ulaşman için olman gereken kişiyi anlatan tek cümle"',
    '}',
  ].join('\n');
}

export async function synthesizePerson(card) {
  try {
    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: synthPrompt(card) }] }],
      systemPrompt: SYNTH_SYSTEM(),
      maxTokens: 700, temperature: 0.55, jsonMode: true,
      model: SUMMARY_MODEL, skipPersona: true,
    });
    const obj = JSON.parse(raw);
    return normalizeSynth(obj);
  } catch (e) {
    console.warn('synthesizePerson:', e?.message);
    // Eşiğin nabzı: çağıran taraf (runSynth) başarıyı hatadan ayırt
    // edemiyordu — bayrak yalnız burada eklenir, okunduğu yerde silinir
    // (kalıcı karta sızmaz, sahte başarı yasak §6.10).
    const fb = fallbackSynth(card);
    fb._fallback = true;
    return fb;
  }
}

function clampScore(v) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(2, Math.min(98, n)) : 50;
}

function normalizeSynth(obj) {
  const f = obj.foundations || {};
  const foundations = {};
  FOUND_KEYS.forEach(k => { foundations[k] = clampScore(f[k]); });
  return {
    baslik:   String(obj.baslik || t('por.synth.default_baslik')).slice(0, 60),
    portrait: String(obj.portrait || '').slice(0, 600),
    ozet: {
      dusunceler:  String(obj.dusunceler_ozet || '').slice(0, 200),
      inanclar:    String(obj.inanclar_ozet || '').slice(0, 200),
      duygular:    String(obj.duygular_ozet || '').slice(0, 200),
      davranislar: String(obj.davranislar_ozet || '').slice(0, 200),
    },
    foundations,
    pattern: String(obj.pattern || '').slice(0, 40),
    oneri:   String(obj.oneri || '').slice(0, 200),
  };
}

// LLM erişilemezse: kullanıcı kartından deterministik bir özet
function fallbackSynth(card) {
  const foundations = {};
  FOUND_KEYS.forEach(k => { foundations[k] = 45; });
  const first = k => (card[k] || [])[0]?.text || '';
  return {
    baslik: t('por.synth.default_baslik'),
    portrait: t('por.synth.fallback_portrait'),
    ozet: {
      dusunceler:  first('dusunceler'),
      inanclar:    first('inanclar'),
      duygular:    first('duygular'),
      davranislar: first('davranislar'),
    },
    foundations,
    pattern: '',
    oneri: t('por.synth.fallback_oneri'),
  };
}

/* ══════════════════════════════════════════════════════════════
   TOHUMLAMA — Yol Ayini'nin beslediği downstream state'i üret
══════════════════════════════════════════════════════════════ */
function persistOnboardingSeed(synth) {
  try {
    // 1) Temel puanları
    Object.entries(synth.foundations).forEach(([k, score]) => {
      const obj = S._foundationsProfile?.[k];
      if (!obj) return;
      obj.score = score;
      obj.signals_count = Math.max(obj.signals_count || 0, 3);
      obj.direction = score < 50 ? 'down' : score > 50 ? 'up' : 'flat';
      obj.evidence = obj.evidence || [];
      obj.evidence.push({ text: t('por.evidence_label'), date: new Date().toISOString() });
    });

    // 2) En zayıf temel → önerilen arketip (ilk mühür)
    const fkeys = FOUND_KEYS;
    let weakestKey = fkeys[0];
    fkeys.forEach(k => { if (synth.foundations[k] < synth.foundations[weakestKey]) weakestKey = k; });
    const archId = FOUNDATION_ARCH[weakestKey] || 'sozunu-tutan';
    const arch = getArchetypeById(archId) || {};
    synth.weakestKey = weakestKey;
    synth.weakestLabel = foundLabel(weakestKey);
    synth.firstSeal = { archId, name: arch.name || '', lesson: arch.lesson || '', foundationLabel: foundLabel(weakestKey) };

    // 3) Kişi geçişi
    const pt = S._personTransition;
    if (pt) {
      if (pt.desired) pt.desired.description = String(synth.oneri || '').slice(0, 120);
      pt.last_updated = new Date().toISOString();
    }
    // OİK (10D) — henüz kart yoksa tasarım törenini bu öneriyle tohumla (kart varsa ezme)
    try {
      if (!window.oikGetCard?.()) window.oikSeedDraft?.({ baslik: String(synth.oneri || '').slice(0, 120) });
    } catch (_) {}

    // 4) İlk mührü ulaşılabilir yap
    if (S._archetypes && S._archetypes[archId] && S._archetypes[archId].state === 'locked') {
      S._archetypes[archId].state = 'reachable';
    }

    // 5) Öneri sonucunu state'e koy
    S._onboardingRecommendation = synth;

    dfSave();
  } catch (e) { console.error('portre seed:', e?.message); }
}

/* ══════════════════════════════════════════════════════════════
   LLM BAĞLAMI — Emre ilk mesajdan itibaren bu kişiyi tanısın
══════════════════════════════════════════════════════════════ */
export function buildPortreContext(synth) {
  if (!synth) return '';
  const f = synth.foundations || {};
  const foundLine = FOUND_KEYS.map(k => `${foundLabel(k)} ${f[k]}`).join(' · ');
  return [
    '[PORTRE — kullanıcının kendi yazdığı ilk kart]',
    synth.baslik ? `Olduğu kişi: "${synth.baslik}".` : '',
    synth.portrait ? `Portre: ${synth.portrait}` : '',
    `Düşünceler: ${synth.ozet?.dusunceler || '—'}`,
    `İnançlar: ${synth.ozet?.inanclar || '—'}`,
    `Duygular: ${synth.ozet?.duygular || '—'}`,
    `Davranışlar: ${synth.ozet?.davranislar || '—'}`,
    `Temeller (0-100): ${foundLine}`,
    synth.pattern ? `Seni durduran kalıp: ${synth.pattern}.` : '',
    synth.oneri ? `Olman gereken kişi: ${synth.oneri}` : '',
    p('prompt.portre.emre_directive'),
  ].filter(Boolean).join('\n');
}

/** Kişiselleştirme motorunun (09a) çağırdığı kısa kart bağlamı. */
export function porGetContext() {
  const c = S._portre;
  if (!c || !c.confirmed) return ''; // onaylanmamış kartı Emre'ye verme
  const total = CAT_ORDER.reduce((n, k) => n + (c[k]?.length || 0), 0);
  if (!total) return '';
  // son 4 maddeyi al; emre/kart eklemelerini işaretle
  const pick = k => (c[k] || []).slice(-4).map(e =>
    e.src === 'emre' ? `${e.text} (Emre)` : e.src === 'kart' ? `${e.text} (Kart)` : e.text
  ).join('; ');
  const lines = ['◈ PORTRE (kullanıcının kendi tanımı — kutsal hafıza):'];
  lines.push(`Kartın adı: "${porCardName()}" (v${c.version || 1}) — kazanılan Kişi Kartları'yla evrilen canlı kimlik.`);
  if (c.baslik) lines.push(`Olduğu kişi: "${c.baslik}".`);
  CAT_ORDER.forEach(k => { if (c[k]?.length) lines.push(`${catLabel(k)}: ${pick(k)}`); });
  const lastEv = (c.history || []).slice(-1)[0];
  if (lastEv?.cards?.length) {
    const names = lastEv.cards.map(id => getCardById(id)?.name).filter(Boolean).join(', ');
    if (names) lines.push(`Son evrim: ${names} kartı(ları) benliğe işlendi (${String(lastEv.at || '').slice(0, 10)}).`);
  }
  lines.push(p('prompt.portre.mirror_directive'));
  return lines.join('\n');
}

/* ══════════════════════════════════════════════════════════════
   SEANS SONU ZENGİNLEŞTİRME — Emre kartı sınırsız doldurur
══════════════════════════════════════════════════════════════ */
let _enrichBusy = false;
// Seans-sonu enrich (fire-and-forget, 06-summary-chat) ile kazanım-tetikli
// resynth aynı karta yazar — _portreSerial (aşağıda) ikisini sıraya sokar.
export function porSessionEnrich() {
  return _portreSerial(_enrichImpl);
}
async function _enrichImpl() {
  // Sadece onaylanmış kartları zenginleştir
  if (_enrichBusy || !S.currentUser?.id || !S._portre?.confirmed) return;
  const userMsgs = (S.chatHistory || []).filter(m => m.role === 'user');
  if (userMsgs.length < 3) return;
  _enrichBusy = true;
  try {
    const convo = userMsgs.map(m => m.content.slice(0, 200)).join('\n');
    const existing = cardListText(S._portre);
    const sys = p('prompt.portre.enrich_system');
    const usr = [
      'MEVCUT KART:', existing, '',
      'BU SEANSTAKİ KULLANICI MESAJLARI:', convo, '',
      'Yeni maddeleri şu şemada döndür (her dizi 0-4 madde, yoksa boş):',
      '{ "dusunceler": [], "inanclar": [], "duygular": [], "davranislar": [] }',
    ].join('\n');
    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: usr }] }],
      systemPrompt: sys, maxTokens: 400, temperature: 0.2, jsonMode: true,
      model: SUMMARY_MODEL, skipPersona: true,
    });
    const obj = JSON.parse(raw);
    let added = 0;
    CAT_ORDER.forEach(k => {
      (Array.isArray(obj[k]) ? obj[k] : []).slice(0, 4).forEach(txt => {
        if (porAddEntry(k, txt, 'emre')) added++;
      });
    });
    if (added > 0) porSave();
  } catch (e) {
    console.warn('porSessionEnrich:', e?.message);
  } finally {
    _enrichBusy = false;
  }
}

/* ══════════════════════════════════════════════════════════════
   EVRİM KÖPRÜSÜ — "Olunan [Ad]": kazandığın her kişi, sana işlenir
   ───────────────────────────────────────────────────────────
   10q kkTick her kazanımda window.porAbsorbCard(card) çağırır:
   kartın 4 boyutu maddelere akar (12b `hisler` → buradaki `duygular`;
   kategori başına en fazla 2, dedup'lu, src:'kart' + ref). Ardından
   kazanım DALGASI başına TEK LLM sentezi (porResynth) epiteti ve
   portreyi yeniden yazar, versiyonu artırır, sahneyi yeniden doğurur.
   Kullanıcının el yazısı (src:'user') ve Emre çıkarımları (src:'emre')
   DOKUNULMAZDIR — sentez yalnız taşan kart-maddelerini yoğunlaştırır.
══════════════════════════════════════════════════════════════ */
const ABSORB_MAP = { dusunceler: 'dusunceler', inanclar: 'inanclar', hisler: 'duygular', davranislar: 'davranislar' };
const ABSORB_PER_CAT = 2;    // kazanılan kart başına kategori başına madde
const KART_CAP_PER_CAT = 8;  // kategori başına kart-kaynaklı madde tavanı (aşınca sentez yoğunlaştırır)
const HISTORY_MAX = 40;      // evrim defteri derinliği
const ABSORB_Q_KEY = uid => `etw_portre_absorb_q_${uid}`;
const EVRIM_WAVE_KEY = uid => `etw_portre_evrim_wave_${uid}`;

/** Kartın görünen adı: "Olunan {ad}" — ad DB'de değil, canlı türetilir.
 *  Ad kaynağı uygulama konvansiyonu: #ob-name (03-auth-shell doldurur) →
 *  auth metadata ilk isim → "Gezgin". */
export function porCardName() {
  let name = '';
  try { name = document.getElementById('ob-name')?.textContent?.trim() || ''; } catch (_) {}
  if (!name) {
    const full = S.currentUser?.user_metadata?.full_name || '';
    name = String(full).trim().split(/\s+/)[0] || '';
    // DIL-MUAF: kullanıcının ADI bir veridir, arayüz metni değil — dili
    // arayüz diliyle değişmez. "irem" TR kuralıyla "İrem" olur.
    if (name) name = name.charAt(0).toLocaleUpperCase('tr-TR') + name.slice(1);
  }
  if (!name) name = t('por.card_fallback_name', 'Gezgin');
  return t('por.card_name', 'Olunan {name}').replace('{name}', name);
}

/** Portre'yi BESLEYEN kart id'leri — hangi kişiler bu portreye işlendi.
 *  Kaynak: maddelerin `ref` izi (porAddEntry(..., 'kart', card.id)) + evrim
 *  geçmişi. Benlik Yapısı ekranı (10q3) altın kolu bundan çizer; yapı için
 *  ayrı bir defter tutulmaz — iz zaten maddelerin içinde. */
export function porCardRefs() {
  const c = S._portre;
  if (!c) return [];
  const ids = new Set();
  for (const k of CAT_ORDER) for (const e of (c[k] || [])) if (e && e.ref) ids.add(e.ref);
  for (const h of (c.history || [])) for (const id of (h.cards || [])) if (id) ids.add(id);
  return [...ids];
}

let _evrimWave = [];          // bu dalgada işlenen kart id'leri (sentez girdisi)
let _evrimTimer = null;
let _resynthBusy = false;
let _resynthPending = false;  // LLM hata/offline — görünüm açılışında yeniden dene

/** Bekleyen evrim dalgasını KV'ye yaz (boşsa anahtarı sil). Sayfa
 *  debounce/LLM penceresinde kapansa bile dalga kaybolmasın diye. */
function _waveSave() {
  if (!S.currentUser?.id) return;
  try {
    const key = EVRIM_WAVE_KEY(S.currentUser.id);
    if (_evrimWave.length) SafeStorage.set(key, _evrimWave);
    else SafeStorage.remove(key);
  } catch (_) {}
}

/** Kazanılan Kişi Kartı'nın 4 boyutunu Portrene işle.
 *  Döner: eklenen madde sayısı (dedup sonrası). Kart onaylı değilse id
 *  kuyruğa alınır — onboarding onayı kuyruğu dreyne eder. */
export function porAbsorbCard(card, opts = {}) {
  if (!card || !card.id || !S.currentUser?.id) return 0;
  const c = S._portre;
  if (!c?.confirmed) { _absorbEnqueue(card.id); return 0; }
  // Aynı kart iki kez işlenmez (kuyruk drenajı + canlı kazanım çakışması)
  const seen = CAT_ORDER.some(k => (c[k] || []).some(e => e.ref === card.id)) ||
               (c.history || []).some(h => (h.cards || []).includes(card.id));
  if (seen) return 0;
  let added = 0;
  Object.entries(ABSORB_MAP).forEach(([from, to]) => {
    (Array.isArray(card[from]) ? card[from] : []).slice(0, ABSORB_PER_CAT).forEach(txt => {
      if (porAddEntry(to, txt, 'kart', card.id)) added++;
    });
  });
  // Madde eklenmese de (hepsi dedup'landı) kazanım bir evrimdir — sentez portreyi tazeler
  _evrimWave.push(card.id);
  _waveSave();   // dalga KV'ye anında kalıcılaşır
  porSave();  // madde(ler) anında yazılır — debounce artık yalnız sentezi erteler
  _scheduleEvrim();
  return added;
}

/** Bir kartın izini Portre'den geri çek — 10D `oikReleaseCard`'ın altın ikizi.
 *  Kullanım: Atölye kartı terk edilince ("bu yolu bırak") o kartın kutbundan
 *  gelen maddeler portrede yaşamaya devam etmesin. Kullanıcının el yazısı
 *  (src:'user') ve Emre çıkarımları DOKUNULMAZ — yalnız `ref` izli maddeler.
 *  Döner: çıkarılan madde sayısı. */
export function porReleaseCard(cardId) {
  if (!cardId) return 0;
  const c = S._portre;
  if (!c) return 0;
  let removed = 0;
  CAT_ORDER.forEach(cat => {
    if (!Array.isArray(c[cat])) return;
    const kept = c[cat].filter(e => !(e && e.ref === cardId));
    removed += c[cat].length - kept.length;
    c[cat] = kept;
  });
  // Dalgada bekliyorsa oradan da düşsün — terk edilen kart sentezi beslemez
  const i = _evrimWave.indexOf(cardId);
  if (i >= 0) { _evrimWave.splice(i, 1); _waveSave(); }
  if (removed) porSave();
  return removed;
}

function _absorbEnqueue(cardId) {
  try {
    const key = ABSORB_Q_KEY(S.currentUser.id);
    const q = SafeStorage.get(key, []);
    const arr = Array.isArray(q) ? q : [];
    if (!arr.includes(cardId)) { arr.push(cardId); SafeStorage.set(key, arr); }
  } catch (_) {}
}

/** Onboarding onayı sonrası: onay-öncesi kazanılmış kartları işle. */
function porDrainAbsorbQueue() {
  try {
    const key = ABSORB_Q_KEY(S.currentUser.id);
    const q = SafeStorage.get(key, []);
    SafeStorage.remove(key);
    (Array.isArray(q) ? q : []).forEach(id => {
      // Atölye kutbu katalogda YOKTUR — önce geçiş kartına sorulur (10A),
      // yoksa beyan onboarding onayında sessizce kaybolurdu.
      let card = null;
      try { card = window.gkPoleAsCardRef?.(id) || null; } catch (_) {}
      if (!card) card = getCardById(id);
      if (card) porAbsorbCard(card, { silent: true });
    });
  } catch (_) {}
}

/* ══════════════════════════════════════════════════════════════
   RETROAKTİF ABSORB (K5, İç Çalışma 06 rev.2 FAZ 5) — "eskiden
   kazanılmış kartlar portreye işlenmez" adaletsizliğini kapatır:
   en sadık gezginlerin (en büyük koleksiyon) en fakir portreye sahip
   olması ters bir ödüldü. Bu MOTORDUR — kullanıcıya sunulan davet
   (kelimeler, ne zaman sorulacağı) FAZ 6'nın işidir; burada yalnız
   davetin bir kez gösterildiğini bilen bayrak yaşar.
══════════════════════════════════════════════════════════════ */
const BACKFILL_DAVET_KEY = uid => `etw_portre_backfill_davet_${uid}`;

/** Geçmiş-işleme daveti daha önce gösterildi mi — FAZ 6'nın tekrar
 *  sorup sormayacağına karar verdiği tek kapı. */
export function porBackfillDavetGosterildiMi() {
  // uid yoksa "gösterilmiş" say: anon oturumda davet zaten sunulmaz, ve
  // uid'siz anahtar (…_undefined) hesaplar arası sızabilecek bir çöp bırakır.
  if (!S.currentUser?.id) return true;
  try { return !!SafeStorage.get(BACKFILL_DAVET_KEY(S.currentUser.id), false); }
  catch (_) { return false; }
}

/** Daveti "gösterildi" işaretle — bir daha sorulmaz. */
export function porBackfillDavetIsaretle() {
  try { if (S.currentUser?.id) SafeStorage.set(BACKFILL_DAVET_KEY(S.currentUser.id), true); }
  catch (_) {}
}

/** Sahip olunan ama HİÇ Portre'ye işlenmemiş kartları bulur ve mevcut
 *  absorb/resynth motoruna toplu besler. Döner: işlenen kart sayısı.
 *  Yeni bir "işlendi" bayrağı İCAT ETMEZ — porCardRefs defteri (madde
 *  ref'leri + history.cards) zaten kanıttır; porAbsorbCard'ın kendi
 *  ref/history guard'ı ikinci savunma katmanıdır. Yalnız ÇAĞRILDIĞINDA
 *  koşar — boot'ta/porLoad'da OTOMATİK tetiklenmez, daveti sunmak (ne
 *  zaman, kaç kez) FAZ 6'nın kararıdır. */
async function _backfillEksik() {
  if (!S.currentUser?.id) return [];
  let ready = false;
  try { ready = await deckReady(); } catch (_) { ready = false; }
  if (!ready) return [];
  try {
    const deck = getFullDeck();
    if (!deck.length) return [];
    const collection = (S._kisiKarti && S._kisiKarti.collection) || {};
    const { owned } = kkPartitionDeck(deck, collection);
    if (!owned.length) return [];
    const isli = new Set(porCardRefs());
    return owned.filter(card => !isli.has(card.id));
  } catch (e) {
    console.warn('_backfillEksik:', e?.message);
    return [];
  }
}

/** Davetin kapısı: işlenmeyi bekleyen kart SAYISI — hiçbir şey işlemez.
 *  FAZ 6 daveti bu sayı 0'dan büyükse sunar; sayı EKRANDA gösterilmez
 *  (davet bir çağrıdır, bildirim değil) ama varlığı ölçülmüş bir
 *  olgudur — davet uydurulmuş bir gerekçeyle belirmez (§6.10). */
export async function porBackfillPending() {
  return (await _backfillEksik()).length;
}

export async function porBackfillCollection() {
  const eksik = await _backfillEksik();
  if (!eksik.length) return 0;
  // SENKRON döngü: kartlar arasında await YOK — hepsi aynı dalgaya
  // (_evrimWave) düşer, _scheduleEvrim'in 1200ms debounce'ı her
  // çağrıda sıfırlanır (dalga başına TEK resynth, N kart değil).
  eksik.forEach(card => porAbsorbCard(card));
  return eksik.length;
}

/** Dalga başına TEK sentez (backfill'de çağrı patlamasın). Kayıt artık
 *  absorb anında olur (porAbsorbCard) — burada yalnız sentez ertelenir. */
function _scheduleEvrim() {
  if (_evrimTimer) clearTimeout(_evrimTimer);
  _evrimTimer = setTimeout(() => {
    _evrimTimer = null;
    porResynth();
  }, 1200);
}

// enrich (seans-sonu, fire-and-forget) ve resynth (kazanım evrimi) aynı
// karta yazar — eşzamanlı koşarlarsa son-yazan-kazanır riski taşır. Bu
// zincir ikisini sıraya sokar (düşürmez, yalnız erteler).
let _portreChain = Promise.resolve();
function _portreSerial(fn) {
  const run = _portreChain.then(fn, fn);
  _portreChain = run.catch(() => {});
  return run;
}

/** Sahne güvencesi — resynth (koşulsuz, sahne her evrimde yeniden doğar) ve
 *  loadPortreView (koşullu, yalnız sahne yoksa) aynı iskeleti paylaşır;
 *  extraTexts resynth'in kategori-madde özetlerini ekler (12d, TDZ-güvenli). */
function _portreEnsureSahne(c, extraTexts = []) {
  try {
    window.kumEnsureSpec?.(c, {
      field: 'sahne',
      seed: `portre-${S.currentUser?.id || 'x'}-v${c.version || 1}`,
      virtue: 'yansima',
      texts: [c.baslik, c.portrait, ...extraTexts].filter(Boolean),
      persist: () => porSave(),
      onRefined: () => { if (document.getElementById('portre-root')) loadPortreView(); },
    });
  } catch (_) {}
}

/** Tam sentez — epitet + portre yeniden yazılır, versiyon artar, sahne
 *  yeniden doğar. Taşan kategorilerde kart-kaynaklı maddeler yoğunlaştırılır;
 *  TR olmayan kullanıcıda taşmayan kart-kategorileri de yalnız çeviri için
 *  kapsama girer (madde sayısı korunur, ref'ler pozisyonel taşınır). */
export function porResynth() {
  return _portreSerial(_resynthImpl);
}
async function _resynthImpl() {
  const c = S._portre;
  if (_resynthBusy || !S.currentUser?.id || !c?.confirmed) return;
  const wave = _evrimWave.splice(0);
  if (!wave.length) return;
  _resynthBusy = true;
  _resynthPending = false;
  try {
    // Dalgada katalog kartı da Atölye kutbu da olabilir. `gk_<id>_<which>`
    // id'sini katalog destesi BİLMEZ — çözülmezse sentez, kişiyi görmeden
    // portreyi yeniden yazardı (öz-denetimde yakalandı, 2026-07-27).
    const cardsInfo = wave
      .map(id => {
        try { const g = window.gkRefResolve?.(id); if (g) return g; } catch (_) {}
        return getCardById(id);
      })
      .filter(Boolean).map(k =>
        `- ${k.name}${k.virtue ? ` (erdem: ${k.virtue})` : ''}${k.lesson ? ` — ${k.lesson}` : ''}`);
    const overflow = CAT_ORDER.filter(k =>
      (c[k] || []).filter(e => e.src === 'kart').length > KART_CAP_PER_CAT);
    // 12b kart destesi TR kaynaklı — TR olmayan kullanıcıda absorb edilen
    // [KART] maddeleri taşma olmadan da ham TR kalabilir. Kullanıcı dili
    // TR değilse taşma şartı aranmadan TÜM kart-kaynaklı kategoriler
    // kapsama girer (yalnız ÇEVİRİ — madde sayısı korunur, bkz. aşağı).
    const leakFix = !!S._currentLang && S._currentLang !== 'tr';
    const translateOnly = leakFix
      ? CAT_ORDER.filter(k => !overflow.includes(k) && (c[k] || []).some(e => e.src === 'kart'))
      : [];
    const scope = overflow.concat(translateOnly);
    const listText = cardListText(c, { marks: true });
    const usr = [
      'MEVCUT KART (kullanıcının canlı Portre):',
      `Epitet: "${c.baslik}"`,
      `Portre: ${c.portrait}`,
      '',
      listText,
      '',
      cardsInfo.length ? 'YENİ İŞLENEN KİŞİ KARTLARI (kullanıcı böyle davranarak kazandı):' : '',
      ...cardsInfo,
      '',
      'Kartı bu kazanımların ışığında YENİDEN sentezle. Şu JSON şemasını döndür:',
      '{',
      '  "baslik": "2-4 kelimelik güncel şiirsel kimlik epiteti",',
      '  "portrait": "2-3 cümle: bu kişi ŞU AN kim — evrimi hissettir, yargısız, umut bırakan"' + (scope.length ? ',' : ''),
      ...(scope.length
        ? ['  "kart_ozu": { ' + scope.map(k => overflow.includes(k)
            ? `"${k}": ["en fazla ${KART_CAP_PER_CAT} yoğunlaştırılmış madde"]`
            : `"${k}": ["madde SAYISINI koru — yalnız kullanıcının diline çevir, anlamı değiştirme"]`
          ).join(', ') + ' }']
        : []),
      '}',
    ].filter(Boolean).join('\n');

    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: usr }] }],
      systemPrompt: p('prompt.portre.resynth_system'),
      maxTokens: 700, temperature: 0.5, jsonMode: true,
      model: SUMMARY_MODEL, skipPersona: true,
    });
    const obj = JSON.parse(raw);
    if (obj.baslik)   c.baslik   = String(obj.baslik).slice(0, 60);
    if (obj.portrait) c.portrait = String(obj.portrait).slice(0, 600);
    // Taşan kategorilerde YALNIZ src:'kart' maddeleri yoğunlaştırılmışla değişir;
    // dil-modu kategorilerinde (leakFix) yalnız çeviri — sayı korunursa ref'ler
    // pozisyonel taşınır (view'daki kart-adı rozeti yaşamaya devam eder).
    scope.forEach(k => {
      const oz = obj.kart_ozu?.[k];
      if (!Array.isArray(oz) || !oz.length) return;
      const oldKart = (c[k] || []).filter(e => e.src === 'kart');
      const kept = (c[k] || []).filter(e => e.src !== 'kart');
      const now = new Date().toISOString();
      const cap = overflow.includes(k) ? KART_CAP_PER_CAT : oz.length;
      const texts = oz.slice(0, cap)
        .map(txt => String(txt || '').trim().replace(/\s+/g, ' ').slice(0, 180))
        .filter(txt => txt.length >= 2);
      const refPreserved = texts.length === oldKart.length;
      const condensed = texts.map((txt, i) => {
        const entry = { text: txt, src: 'kart', at: now };
        if (refPreserved && oldKart[i]?.ref) entry.ref = oldKart[i].ref;
        return entry;
      });
      if (condensed.length) c[k] = kept.concat(condensed);
    });
    c.version = (c.version || 1) + 1;
    c.history = (c.history || []).concat([{
      v: c.version, at: new Date().toISOString(),
      baslik: c.baslik, portrait: c.portrait, cards: wave,
    }]).slice(-HISTORY_MAX);
    // Sahne yeniden doğar — kart görsel olarak da evrilir (12d, TDZ-güvenli)
    c.sahne = null;
    _portreEnsureSahne(c, CAT_ORDER.map(k => (c[k] || []).slice(-2).map(e => e.text).join(' · ')));
    porSave();
    _waveSave(); // dalga işlendi — KV'deki bekleyen kayıt temizlenir (veya sonraki dalga yazılır)
    if (document.getElementById('portre-root')) loadPortreView();
  } catch (e) {
    console.warn('porResynth:', e?.message);
    _evrimWave = wave.concat(_evrimWave); // dalga kaybolmasın — sonraki fırsatta yeniden
    _waveSave();
    _resynthPending = true;
  } finally {
    _resynthBusy = false;
  }
}

/* ══════════════════════════════════════════════════════════════
   ONBOARDING EKRANI — sinematik overlay (event-delegation)
══════════════════════════════════════════════════════════════ */
export function runPortreOnboarding() {
  return new Promise((resolve) => {
    // Kart zaten onaylanmışsa onboarding'i atla
    if (S._portre?.confirmed) { resolve(S._portre); return; }

    /* ONBOARDING'İN İLK ADIMI: DİL.
       Bundan sonraki her cümle — yönlendirmeler, kategori adları, doğan
       kartın kendisi — o dilde söylenecek; o yüzden soru en başta sorulur.
       Beyan alınınca akış BAŞTAN kurulur: sözlük değişti, metinler yeniden
       okunmalı (rekürsiyon tek seviyedir — ikinci turda beyan vardır).
       Kullanıcı dilini sonra ayarlardan değiştirebilir; kapı bunu söyler. */
    if (!langBeyanVar()) {
      try { window.wtLogEsik?.('dil-kapisi'); } catch (_) {}
      openLangGate({ onSecim: () => { runPortreOnboarding().then(resolve); } });
      return;
    }

    // Taze kart: onboarding taslağı varsa onu kullan (terk edilmiş oturum kurtarma)
    let existingDraft = null;
    try {
      if (S.currentUser?.id) {
        existingDraft = SafeStorage.get(DRAFT_KEY(S.currentUser.id), null);
      }
    } catch (_) {}

    S._portre = existingDraft
      ? { ...emptyCard(), ...existingDraft }
      : emptyCard();
    CAT_ORDER.forEach(k => { if (!Array.isArray(S._portre[k])) S._portre[k] = []; });
    const card = S._portre;

    const state = { scene: 0, catIdx: 0, sparkIdx: 0 };
    let synth = null;
    let birthSahne = null; // doğuş sahnesi — senkron sezgisel (12d), onayda karta işlenir

    const overlay = document.createElement('div');
    overlay.className = 'onb-ritual sc-onb';
    overlay.id = 'sc-onb';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    document.body.appendChild(overlay);

    // Odak yakalama: DOM her render()'da yeniden kurulduğundan (innerHTML)
    // trap her seferinde tazelenir; kapanışta odak çağrıyı yapan elemana döner.
    const previouslyFocused = document.activeElement;
    let untrapFocus = () => {};

    function close(payload) {
      untrapFocus();
      overlay.classList.add('onb-closing');
      // Onboarding perdesi çıkarken ana ekranı kademeli süzdür (Eşik'le aynı kalıp:
      // .onb-closing eklendiği için 10y llmHomeCascade'in .sc-onb ertelemesi geçer).
      try { window.llmHomeCascade?.(); } catch (_) {}
      // Taslağı temizle
      try { if (S.currentUser?.id) SafeStorage.remove(DRAFT_KEY(S.currentUser.id)); } catch (_) {}
      setTimeout(() => {
        overlay.remove();
        try { previouslyFocused?.focus?.(); } catch (_) {}
        resolve(payload);
      }, 320);
    }

    function totalCount() {
      return CAT_ORDER.reduce((n, k) => n + card[k].length, 0);
    }

    /** Taslak kaydet — tarayıcı kapanırsa veri korunsun */
    function saveDraft() {
      try {
        if (S.currentUser?.id) SafeStorage.set(DRAFT_KEY(S.currentUser.id), card);
      } catch (_) {}
    }

    /* ── Sahne: kategori toplama ── */
    function catSceneHTML(cat) {
      const list = card[cat.key];
      const n = list.length;
      const done = n >= MIN_PER_CAT;
      const chips = list.map((e, i) => `
        <span class="sc-chip">
          <span class="sc-chip-txt">${esc(e.text)}</span>
          <button type="button" class="sc-chip-x" data-act="rm" data-i="${i}" aria-label="${t('por.aria_remove')}">×</button>
        </span>`).join('');

      // Tamamlanan kategorilerin ilerleme durumu
      const progressDots = CAT_ORDER.map((k, idx) => {
        const cnt = card[k].length;
        const isDone = cnt >= MIN_PER_CAT;
        const isCurrent = idx === state.catIdx;
        return `<span class="sc-progress-dot ${isDone ? 'sc-pdot-done' : ''} ${isCurrent ? 'sc-pdot-current' : ''}" title="${catLabel(k)} (${cnt})"></span>`;
      }).join('');

      return `
        <div class="onb-scene sc-scene-cat">
          <div class="sc-progress-dots">${progressDots}</div>
          <div class="sc-cat-sigil">${cat.sigil}</div>
          <div class="onb-badge">${catBadge(cat.key)}</div>
          <h2 class="onb-h2">${catTitle(cat.key)}</h2>
          <p class="onb-lead">${catDesc(cat.key)}</p>
          <div class="sc-diff">${catDiff(cat.key)}</div>

          <div class="sc-spark" data-act="spark">
            <span class="sc-spark-q">${catSpark(cat.key, state.sparkIdx % cat.sparkCount)}</span>
            <span class="sc-spark-hint">↻ ${t('por.spark_hint')}</span>
          </div>

          <div class="sc-input-row">
            <input type="text" class="sc-input" data-act="inp" placeholder="${catPh(cat.key)}"
              autocomplete="off" maxlength="180" />
            <button type="button" class="sc-add" data-act="add" aria-label="${t('por.aria_add')}">+</button>
          </div>

          <div class="sc-counter ${done ? 'sc-counter-done' : ''}">
            <span class="sc-counter-num">${n}</span> / ${MIN_PER_CAT}
            ${done ? ' ✦ ' + t('por.counter_done') : ' ' + t('por.counter_need').replace('{n}', MIN_PER_CAT)}
          </div>

          <div class="sc-chips">${chips || `<span class="sc-chips-empty">${t('por.chips_empty')}</span>`}</div>

          <button type="button" class="onb-next ${done ? '' : 'onb-disabled'}"
            data-act="next" ${done ? '' : 'disabled'}>
            ${state.catIdx < CAT_ORDER.length - 1 ? t('por.next_more') : t('por.next_finish')}
          </button>
          <div class="onb-hint">${t('por.cat_hint')}</div>
        </div>`;
    }

    function render() {
      untrapFocus(); // eski DOM'un Tab-döngü dinleyicisi — innerHTML'den önce temizlenir
      let html = '';
      if (state.scene === 0) {
        // Kurtarılmış taslak varsa bunu göster
        const draftTotal = totalCount();
        const draftNote = draftTotal > 0
          ? `<div class="sc-draft-note">${t('por.draft_note').replace('{n}', draftTotal)}</div>`
          : '';
        html = `
          <div class="onb-scene onb-scene-intro">
            <div class="onb-sigil">✶</div>
            <div class="onb-badge">${t('por.intro_badge')}</div>
            <h1 class="onb-h1">${t('por.intro_h1')}</h1>
            <p class="onb-lead">${t('por.intro_lead')}</p>
            ${draftNote}
            <button type="button" class="onb-next" data-act="begin">
              ${draftTotal > 0 ? t('por.intro_continue') : t('por.intro_begin')}
            </button>
            <button type="button" class="onb-skip" data-act="skip">${t('por.intro_skip')}</button>
          </div>`;
      } else if (state.scene === 1) {
        html = catSceneHTML(CATS[state.catIdx]);
      } else if (state.scene === 2) {
        // İŞLEME — arkada sentez
        html = `
          <div class="onb-scene sc-scene-proc">
            <div class="sc-orbit">
              <span class="sc-orbit-core">✦</span>
              <span class="sc-orbit-ring sc-orbit-r1"></span>
              <span class="sc-orbit-ring sc-orbit-r2"></span>
              <span class="sc-orbit-ring sc-orbit-r3"></span>
            </div>
            <div class="onb-badge">${t('por.proc_badge')}</div>
            <h2 class="onb-h2">${t('por.proc_h2')}</h2>
            <p class="onb-lead sc-proc-line">${t('por.proc_line').replace('{n}', totalCount())}</p>
          </div>`;
      } else {
        // DOĞUŞ — "Olunan [Ad]" kartı sırtından dönerek doğar
        try { ikvEnsureStyles(); } catch (_) {}
        const row = (k) => `
          <div class="sc-decide-row">
            <div class="sc-decide-cat">${catLabel(k)}</div>
            <div class="sc-decide-val">${esc(synth.ozet?.[k] || (card[k][0]?.text || '—'))}</div>
          </div>`;
        let face = '';
        try {
          face = ikvCardFace(
            // yuz: DOĞUŞ anındaki kart, hero'da duran kartın ta kendisidir
            // (aynı id). Bayrak yalnız hero'ya takılıysa kart doğarken
            // dikdörtgen, ertesi gün oval görünür — tek kart, iki yüz olmaz.
            { id: 'portre-olunan', name: porCardName(), whisper: synth.baslik || '', virtue: 'yansima', category: 'cekirdek', yuz: true },
            { palette: 'gold', kicker: t('por.card_kicker'), badge: '✦ v1', sub: synth.baslik || '', sahne: birthSahne || undefined }
          );
        } catch (_) {}
        html = `
          <div class="onb-scene sc-scene-decide">
            <div class="onb-badge">${t('por.decide_badge')}</div>
            <div class="sc-birth" aria-hidden="true">
              <div class="sc-birth-inner">
                <div class="sc-birth-face sc-birth-back">${(() => { try { return ikvCardBack(); } catch (_) { return ''; } })()}</div>
                <div class="sc-birth-face sc-birth-front">${face}</div>
              </div>
            </div>
            <h2 class="onb-h2 sc-birth-name">${esc(porCardName())}</h2>
            <div class="sc-birth-epitet">${esc(synth.baslik)}</div>
            <p class="onb-lead sc-portrait">${esc(synth.portrait)}</p>
            <div class="sc-decide-card">
              ${row('dusunceler')}
              ${row('inanclar')}
              ${row('duygular')}
              ${row('davranislar')}
            </div>
            ${synth.oneri ? `<div class="sc-oneri"><span class="sc-oneri-lbl">${t('por.oneri_label')}</span>${esc(synth.oneri)}</div>` : ''}
            <div class="sc-decide-q">${t('por.birth_line')}</div>
            <button type="button" class="onb-next" data-act="confirm">${t('por.birth_confirm')}</button>
            <button type="button" class="onb-skip" data-act="back">${t('por.decide_back')}</button>
          </div>`;
      }
      overlay.innerHTML = `<div class="onb-stage">${html}</div>`;
      if (state.scene === 1) {
        const inp = overlay.querySelector('.sc-input');
        if (inp) setTimeout(() => inp.focus(), 60);
      }
      if (state.scene === 3) {
        // Kart sırtı bir nefes durur, sonra döner — doğum anı
        const b = overlay.querySelector('.sc-birth');
        if (b) setTimeout(() => b.classList.add('is-flipped'), 700);
        try { ikvHoloScan(overlay.querySelector('.sc-birth-front')); } catch (_) {}
      }
      untrapFocus = A11y.trapFocus(overlay); // taze DOM üzerinde Tab döngüsü kur
    }

    function tryAdd() {
      const inp = overlay.querySelector('.sc-input');
      if (!inp) return;
      const cat = CATS[state.catIdx];
      if (porAddEntry(cat.key, inp.value, 'user')) {
        inp.value = '';
        render();
        saveDraft(); // her madde eklemede — kategori ortasında kapanış artık kaybetmez
      } else {
        inp.classList.add('sc-input-shake');
        setTimeout(() => inp.classList.remove('sc-input-shake'), 400);
      }
    }

    async function runSynth() {
      state.scene = 2; render();
      saveDraft(); // son ara kayıt
      const _synthT0 = Date.now();
      // Minimum 1500ms animasyon + LLM paralel — hızlı yanıt gelirse orbit ekranı gösterilsin
      const [result] = await Promise.all([
        synthesizePerson(card),
        new Promise(r => setTimeout(r, 1500)),
      ]);
      synth = result;
      // Eşiğin nabzı (K2): sentez BURADA bitti — fallback'e düştüyse gerçeği
      // söyle (sahte başarı yasak §6.10). Bayrak yalnız bu satırda okunur ve
      // hemen silinir: persistOnboardingSeed → S._onboardingRecommendation'a
      // (kalıcı state) sızmasın diye — çağrı anı işaretidir, veri alanı değil.
      try {
        window.wtLogEsik?.('sentez', {
          dal: synth._fallback ? 'fallback' : 'ok',
          sureMs: Date.now() - _synthT0,
        });
      } catch (_) {}
      delete synth._fallback;
      // Kartın doğuş sahnesi — ağsız, senkron, asla bekletmez (12d sezgisel besteci)
      try {
        birthSahne = window.kumHeuristicSpec?.({
          seed: `portre-${S.currentUser?.id || 'x'}-v1`,
          virtue: 'yansima',
          texts: [synth.baslik, synth.portrait].filter(Boolean),
        }) || null;
      } catch (_) {}
      state.scene = 3; render();
      try { window.fxCue?.('cardBirth'); } catch (_) {}
    }

    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.classList?.contains('sc-input')) {
        e.preventDefault(); tryAdd();
      } else if (e.key === 'Escape' && state.scene === 0) {
        // Yalnız giriş sahnesinde kapatır — veri girişi sahnelerinde (1-3)
        // kazara Esc'le kaybolmasın (taslak zaten saveDraft ile korunuyor).
        e.preventDefault();
        try { window.wtLogEsik?.('atladi', { adim: state.scene }); } catch (_) {}
        close(null);
      }
    });

    overlay.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el) return;
      const act = el.dataset.act;

      if (act === 'skip') {
        // Eşiğin nabzı: "Şimdilik atla" — adim=terk edilen sahne (0-3)
        try { window.wtLogEsik?.('atladi', { adim: state.scene }); } catch (_) {}
        close(null); return;
      }
      if (act === 'begin') {
        // Taslak varsa oradan devam et — ilk tamamlanmamış kategoriye git
        if (totalCount() > 0) {
          const firstUnfinished = CAT_ORDER.findIndex(k => card[k].length < MIN_PER_CAT);
          state.catIdx = firstUnfinished >= 0 ? firstUnfinished : 0;
        } else {
          state.catIdx = 0;
        }
        state.scene = 1; state.sparkIdx = 0; render();
        return;
      }
      if (act === 'spark') {
        state.sparkIdx++;
        const q = overlay.querySelector('.sc-spark-q');
        if (q) q.textContent = catSpark(CATS[state.catIdx].key, state.sparkIdx % CATS[state.catIdx].sparkCount);
        return;
      }
      if (act === 'add') { tryAdd(); return; }
      if (act === 'rm') {
        const i = Number(el.dataset.i);
        card[CATS[state.catIdx].key].splice(i, 1);
        render();
        return;
      }
      if (act === 'next') {
        const cat = CATS[state.catIdx];
        if (card[cat.key].length < MIN_PER_CAT) return;
        saveDraft(); // Kategori tamamlandığında taslak kaydet
        // Eşiğin nabzı (K2): "Devam" tıklandı — kategori burada TAMAMLANDI
        // (kutuya yazıldığında değil). dal=biten kategori, adim=kaçıncı (1-4).
        try {
          window.wtLogEsik?.('kategori', {
            dal: cat.key, adim: state.catIdx + 1, n: card[cat.key].length,
          });
        } catch (_) {}
        if (state.catIdx < CAT_ORDER.length - 1) {
          state.catIdx++; state.sparkIdx = 0; render();
        } else {
          runSynth();
        }
        return;
      }
      if (act === 'back') {
        // Tamamlanmamış ilk kategoriye geri dön
        const firstUnfinished = CAT_ORDER.findIndex(k => card[k].length < MIN_PER_CAT);
        state.catIdx = firstUnfinished >= 0 ? firstUnfinished : 0;
        state.scene = 1; render();
        return;
      }
      if (act === 'confirm') {
        card.baslik = synth.baslik;
        card.portrait = synth.portrait;
        card.confirmed = true;
        if (birthSahne) card.sahne = birthSahne; // doğuş sahnesi kalıcılaşır
        // Evrim defterinin ilk sayfası — kart bugün doğdu
        card.version = card.version || 1;
        card.history = [{
          v: card.version, at: new Date().toISOString(),
          baslik: card.baslik, portrait: card.portrait, cards: [],
        }];
        porSave();
        // Eşiğin nabzı (K2 · damgayı teslim eden basar): mühür TIKLANDIĞINDA
        // değil, kart gerçekten yazıldıktan sonra basılır — porSave'den önce
        // yazsaydık kaydı patlayan bir turda huni "doğdu" derdi, kart yokken.
        // Emsal: 10s-w2-gunluk-ritus.js:716 (glSave sonrası).
        try { window.wtLogEsik?.('dogus', { n: totalCount() }); } catch (_) {}
        persistOnboardingSeed(synth);
        porDrainAbsorbQueue(); // onay-öncesi kazanılan kartlar şimdi işlenir
        close(synth);
        return;
      }
    });

    // Eşiğin nabzı: overlay ilk çizim — n=devralınan taslaktaki toplam madde
    // (taze taslakta 0), henüz hiçbir sahne gezilmemişken ölçülür.
    try { window.wtLogEsik?.('basladi', { n: totalCount() }); } catch (_) {}
    render();
    requestAnimationFrame(() => overlay.classList.add('onb-open'));
  });
}

/* ══════════════════════════════════════════════════════════════
   GİRİŞ AKIŞI — Portre + Olmak İstediği Kişi
   • Gerçekten yeni kullanıcı (0 seans VE onaysız kart) → tam onboarding
   • Geri dönen kullanıcı → HİÇBİR overlay: karşılama açılış ekranıdır
     (wn-splash, 03-auth-shell) ve o da bir dil modeli gibi sessizce
     kalkar. Eşik Ekranı (02d, iki kutup kartı) artık boot'ta DEĞİL —
     Wanderer Studio'ya (Bugün) her girişte 10y'nin flip after-hook'undan
     açılır (bkz. 10y-w2-llm-shell.js _maybeEsik). Onaysız kart Portrem
     görünümünden ve seans-sonu kancadan dolmaya devam eder.
══════════════════════════════════════════════════════════════ */
export async function showEntryCards(totalSessions) {
  // İlk giriş: kart onaysızsa tam onboarding açılır; onaylıysa
  // runPortreOnboarding overlay'siz anında çözülür (sentez geri döner).
  if (totalSessions === 0) {
    return runPortreOnboarding();
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════
   GÖRÜNÜM — "Portrem" (Emre Beni Tanıyor'un yeni sürümü)
══════════════════════════════════════════════════════════════ */
export function loadPortreView() {
  const root = document.getElementById('portre-root');
  if (!root) return;
  // Yarım kalmış evrim dalgası varsa (LLM hata/offline) burada yeniden dene
  if (_resynthPending) { try { porResynth(); } catch (_) {} }
  const c = S._portre || emptyCard();
  const total = CAT_ORDER.reduce((n, k) => n + (c[k]?.length || 0), 0);

  // Kart boş veya onaylanmamış — gözlemlenen kimlik (13l) varsa yine de göster:
  // yazılı kart boşken bile hareketlerin söylediği kişi görünür olsun
  if (!total || !c.confirmed) {
    const inProgress = total > 0 && !c.confirmed;
    let imBannerEmpty = '';
    try { imBannerEmpty = window.imPortreBanner ? window.imPortreBanner() : ''; } catch (_) {}
    root.innerHTML = imBannerEmpty + `
      <div class="portre-empty">
        <div class="portre-empty-sigil">✶</div>
        <div class="portre-empty-title">${inProgress ? t('por.empty_inprogress_title') : t('por.empty_title')}</div>
        <div class="portre-empty-desc">${inProgress
          ? t('por.empty_inprogress_desc').replace('{n}', total)
          : t('por.empty_desc')
        }</div>
        ${inProgress
          ? `<button type="button" class="portre-empty-cta" onclick="runPortreOnboarding().then(()=>loadPortreView())">${t('por.intro_continue')}</button>`
          : ''
        }
      </div>`;
    return;
  }

  // ── HERO: gerçek 12c kartı — "Olunan [Ad]" ──
  // Sahne güvencesi: yoksa senkron sezgisel doğar, arka planda LLM inceltir.
  if (!c.sahne) _portreEnsureSahne(c);
  try { ikvEnsureStyles(); } catch (_) {}
  let heroCard = '';
  try {
    heroCard = ikvCardFace(
      // yuz: bu kartın çizimi kullanıcının kendi yüzüdür (12g) — iz yoksa
      // 12c sessizce bugünkü sahneye düşer
      { id: 'portre-olunan', name: porCardName(), whisper: c.baslik || '', virtue: 'yansima', category: 'cekirdek', yuz: true },
      { palette: 'gold', kicker: t('por.card_kicker'), badge: '✦ v' + (c.version || 1), sub: c.baslik || '', sahne: c.sahne || undefined }
    );
  } catch (_) {}

  const head = `
    <div class="portre-hero">
      <div class="portre-hero-card">${heroCard}</div>
      <div class="portre-hero-side">
        <div class="portre-portrait-badge">${t('por.decide_badge')}</div>
        ${c.baslik ? `<div class="portre-portrait-title serif">${esc(c.baslik)}</div>` : ''}
        ${c.portrait ? `<div class="portre-portrait-text">${esc(c.portrait)}</div>` : ''}
        <div class="portre-portrait-meta">
          ${c.updated_at ? `<span>${t('por.last_update')} · ${new Date(c.updated_at).toLocaleDateString(S._currentLang === 'tr' ? 'tr-TR' : 'en-US')}</span>` : ''}
          <span>· ${total} ${t('por.items_word')}</span>
        </div>
      </div>
    </div>`;

  // ── NABIZ: yeni evrim ilk kez görülüyorsa sessiz tek satır ──
  let pulse = '';
  try {
    const seenKey = SEEN_V_KEY(S.currentUser?.id);
    const seen = Number(SafeStorage.get(seenKey, 1)) || 1;
    if ((c.version || 1) > seen) {
      pulse = `<div class="portre-pulse">✦ ${esc(t('por.evrim_pulse').replace('{card}', porCardName()))}</div>`;
    }
    SafeStorage.set(seenKey, c.version || 1);
  } catch (_) {}

  const sigilMap = { dusunceler: '☉', inanclar: '✷', duygular: '❍', davranislar: '✺' };
  const srcBadge = (e) => {
    if (e.src === 'emre') return `<span class="portre-item-src portre-src-emre">${t('por.src_emre')}</span>`;
    if (e.src === 'kart') {
      const kn = e.ref ? (getCardById(e.ref)?.name || '') : '';
      return `<span class="portre-item-src portre-src-kart"${kn ? ` title="${esc(kn)}"` : ''}>${esc(kn || t('por.src_kart'))}</span>`;
    }
    return `<span class="portre-item-src portre-src-user">${t('por.src_you')}</span>`;
  };
  const sections = CAT_ORDER.map(k => {
    const list = c[k] || [];
    const emreCount = list.filter(e => e.src === 'emre').length;
    const kartCount = list.filter(e => e.src === 'kart').length;
    const items = list.map((e, i) => `
      <div class="portre-item">
        <span class="portre-item-txt">${esc(e.text)}</span>
        ${srcBadge(e)}
        <button type="button" class="portre-item-x" onclick="porRemoveEntry('${k}',${i})" aria-label="${t('por.aria_remove')}">×</button>
      </div>`).join('') || `<div class="portre-sec-empty">${t('por.sec_empty')}</div>`;
    return `
      <div class="portre-sec">
        <div class="portre-sec-head">
          <span class="portre-sec-sigil">${sigilMap[k]}</span>
          <span class="portre-sec-title">${catLabel(k)}</span>
          <span class="portre-sec-count">${list.length}</span>
          ${emreCount > 0 ? `<span class="portre-sec-emre-badge">${emreCount} ${t('por.src_emre')}</span>` : ''}
          ${kartCount > 0 ? `<span class="portre-sec-kart-badge">${kartCount} ${t('por.src_kart')}</span>` : ''}
        </div>
        <div class="portre-items">${items}</div>
        <div class="portre-add-row">
          <input type="text" class="portre-add-input" id="portre-add-${k}" maxlength="180"
            placeholder="${t('por.add_ph').replace('{cat}', catLabel(k).toLocaleLowerCase(S._currentLang === 'tr' ? 'tr' : 'en'))}"
            onkeydown="if(event.key==='Enter'){porAddFromView('${k}')}" autocomplete="off" />
          <button type="button" class="portre-add-btn" onclick="porAddFromView('${k}')">${t('por.add_btn')}</button>
        </div>
      </div>`;
  }).join('');

  // Kimlik Motoru (13l) — hareketlerle olunan güncel kişi afişi (ilk portre yolun
  // başlangıcı olarak altta kalır; canlı kimlik üstte görünür)
  let imBanner = '';
  try { imBanner = window.imPortreBanner ? window.imPortreBanner() : ''; } catch (_) {}

  root.innerHTML = imBanner + head + pulse + '<div id="portre-backfill-yuva"></div>'
    + _portreEvrimHTML(c) + `<div class="portre-secs">${sections}</div>`;
  _maybeBackfillDavet();
  // Hero kart jiroskop/imleçle eğilsin (holo motoru — varsa)
  try { ikvHoloScan(root.querySelector('.portre-hero-card')); } catch (_) {}
}

/* ── Evrim şeridi — kartın yolu: hangi kazanım neyi değiştirdi ── */
function _relTime(at) {
  try {
    const days = Math.floor((Date.now() - new Date(at).getTime()) / 86400000);
    if (days <= 0) return t('por.time_today');
    if (days === 1) return t('por.time_yesterday');
    return t('por.time_days').replace('{n}', days);
  } catch (_) { return ''; }
}

function _portreEvrimHTML(c) {
  const hist = (c.history || []).slice(-8).reverse();
  if (!hist.length) return '';
  const rows = hist.map(h => {
    const names = (h.cards || []).map(id => getCardById(id)?.name).filter(Boolean);
    const what = names.length
      ? t('por.evrim_from').replace('{cards}', names.join(', '))
      : t('por.evrim_birth');
    return `
      <button type="button" class="portre-evrim-row" onclick="porToggleEvrim(this)">
        <span class="portre-evrim-v">v${Number(h.v) || 1}</span>
        <span class="portre-evrim-what">${esc(what)}</span>
        <span class="portre-evrim-when">${_relTime(h.at)}</span>
      </button>
      <div class="portre-evrim-detail" hidden>
        ${h.baslik ? `<div class="portre-evrim-epitet serif">${esc(h.baslik)}</div>` : ''}
        ${h.portrait ? `<div class="portre-evrim-portrait">${esc(h.portrait)}</div>` : ''}
      </div>`;
  }).join('');
  return `
    <div class="portre-evrim">
      <div class="portre-evrim-head">${t('por.evrim_title')}</div>
      ${rows}
    </div>`;
}

/* ── Geçmiş-işleme daveti (FAZ 6) — üç kapı birlikte açılır:
   kart onaylı · işlenmeyi bekleyen kart GERÇEKTEN var (ölçülür, uydurulmaz)
   · daha önce sorulmamış. Töreni kesen bir pop-up değildir: portresine bakan
   gezgin, kartının eksik kaldığı yeri kendi sayfasında görür. Sayı yazılmaz —
   "47 kartın işlenmedi" bir bildirimdir, davet değil. ── */
async function _maybeBackfillDavet() {
  const yuva = document.getElementById('portre-backfill-yuva');
  if (!yuva) return;
  if (!S._portre?.confirmed) return;
  if (porBackfillDavetGosterildiMi()) return;
  let bekleyen = 0;
  try { bekleyen = await porBackfillPending(); } catch (_) { return; }
  if (!bekleyen) return;
  // Görünüm bu arada değişmiş olabilir (async) — yuva hâlâ ayakta mı?
  const hedef = document.getElementById('portre-backfill-yuva');
  if (!hedef) return;
  hedef.innerHTML = `
    <div class="portre-backfill">
      <div class="portre-backfill-title serif">${t('por.backfill_title')}</div>
      <div class="portre-backfill-body">${t('por.backfill_body')}</div>
      <div class="portre-backfill-actions">
        <button type="button" class="portre-backfill-yes" onclick="porBackfillAccept(this)">${t('por.backfill_yes')}</button>
        <button type="button" class="portre-backfill-no" onclick="porBackfillDismiss()">${t('por.backfill_no')}</button>
      </div>
    </div>`;
}

/** "İşlensin" — motoru çağırır, daveti mühürler, görünümü tazeler.
 *  Buton işlem boyunca kilitlenir: iki tık iki dalga açardı. */
export async function porBackfillAccept(btn) {
  if (btn) { btn.disabled = true; btn.textContent = t('por.backfill_working'); }
  porBackfillDavetIsaretle();
  let n = 0;
  try { n = await porBackfillCollection(); } catch (_) {}
  if (n > 0) showToast(t('por.backfill_done'));
  if (document.getElementById('portre-root')) loadPortreView();
}

/** "Şimdilik kalsın" — ret kalıcıdır, bir daha sorulmaz. */
export function porBackfillDismiss() {
  porBackfillDavetIsaretle();
  const yuva = document.getElementById('portre-backfill-yuva');
  if (yuva) yuva.innerHTML = '';
}

/** Evrim satırı detayını aç/kapa (o versiyonun epitet + portresi). */
export function porToggleEvrim(btn) {
  const d = btn?.nextElementSibling;
  if (!d) return;
  d.hidden = !d.hidden;
  btn.classList.toggle('is-open', !d.hidden);
}

/** Görünümdeki "Ekle" — input'tan okur, ekler, kaydeder, yeniden çizer. */
export function porAddFromView(cat) {
  const inp = document.getElementById('portre-add-' + cat);
  if (!inp) return;
  if (porAddEntry(cat, inp.value, 'user')) {
    inp.value = '';
    porSave();
    loadPortreView();
  } else {
    showToast(t('por.toast_add_fail'), true);
  }
}
