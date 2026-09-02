/* ═══════════════════════════════════════════════════════════════════
   10D — OLMAK İSTEDİĞİN KİŞİ (OİK)
   ───────────────────────────────────────────────────────────────────
   FELSEFE (Zihniyet Devrimi'ne Çağrı · Manifesto VIII + s.103-107):
     "Olmak istediğin kişi" statik bir arketip DEĞİL — SENİN TASARLADIĞIN
     kişidir. İstediğin hayatı O kişi yaşar; taktiği değil, kişiyi tasarla.
     Yeni Bir Kişiye Geçiş Yapısı: hayalde o kişinin GÖZÜNDEN bak →
     düşünce+inançları → his+davranışları → seçimleri. Wanderer (LLM) ile
     ko-tasarım — kitabın md.6 AI-yardım mandatı.

     Bu kart Portrenin ("Olduğun Kişi", 02c) LAPİS İKİZİ; Kimlik
     Motoru'nun (13l) hedef kutbu. Geçiş Protokolü ritüeli de burada:
     her sabah + her gece sesli oku, sesini kaydet ve dinle, o kişinin
     gözlerinin içinden hayal et. Eski Geçiş Alanı (10j) ekranının halefi.

   TEK KAYNAK: "olmak istediğin kişi"nin tek doğruluğu bu moduldür.
     Eşik (02d), Ayna (10g), Yol (10f), Hayal (10i), Emre bağlamı (09a) —
     hepsi oikGetDesired()/oikGetContext() üzerinden buradan beslenir.
     Geriye uyum için S._personTransition.desired.description +
     S._affirmation "ayna" olarak yazılmaya devam eder (eski okuyucular
     kırılmaz).

   Görsel dil → TASARIM-PRENSIPLERI.md · kart motoru 12c (ikvCardFace).
   Faz 1: omurga (state + KV persist + 10j göçü + ayna + API). UI Faz 3+.
   ═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { sb, SUMMARY_MODEL } from '../config.js';
import { NISANLAR } from './12e-isik-nisanlari.js';
import { SafeStorage, showToast, localISODate, recordActivityDay, escapeHTML } from './00a-infrastructure.js';
import { idbSaveRecording, idbGetRecording, idbDeleteRecording } from './00b-indexeddb.js';
import { dfSave } from './09b-depth-foundations.js';
import { awardElmas, getElmasSayisi } from './10g-w2-wanderer-game.js';
import { showGraduation } from './10b-w2-gamification.js';
import { t } from './15-i18n.js';
import { p } from './16-i18n-prompts.js';
import { callLLM } from './04-llm-hero-history.js';
import { kumEnsureSpec } from './12d-kart-uretim.js';

/* ── Sabitler ─────────────────────────────────────────────────────── */
const KV_KEY    = 'etw_oik_v1';
const _oikKey   = () => `${KV_KEY}_${S.currentUser?.id || 'anon'}`;
const GECIS_KEY = 'etw_gecis_alani_v1';                 // göç kaynağı (10j)
const _gecisKey = () => `${GECIS_KEY}_${S.currentUser?.id || 'anon'}`;

const NOW   = () => new Date().toISOString();
const TODAY = () => localISODate();
const NEWID = () => 'oik_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* Portre (02c) ile birebir aynı 4 kategori. */
export const CAT_KEYS = ['dusunceler', 'inanclar', 'duygular', 'davranislar'];

/* Dört boyutun mühür dili — 02c onboarding kategorilerinin AYNI dört işareti.
   Kanonik listeyle (CAT_KEYS) yan yana durur ki tüketici boyutun adını bir
   yerden, işaretini başka yerden okumak zorunda kalmasın: Eşik köprüsü (02d)
   bunu içer, kendi kopyasını yazmaz. */
export const CAT_SIGILS = {
  dusunceler: '☉', inanclar: '✷', duygular: '❍', davranislar: '✺',
};

const _norm = s => String(s || '').toLocaleLowerCase('tr').replace(/[.,!?;:"'…]/g, '').replace(/\s+/g, ' ').trim();
const _asText = e => (typeof e === 'string' ? e : (e && e.text) || '');

/* Tek kaynak: escapeHTML (00a). Eskiden bu modülün kendi ikizi vardı;
   ikizler birbirinden de farklıydı (bir kısmı tek tırnağı kaçırmıyordu). */
const esc = escapeHTML;

/* ══════════════════════════════════════════════════════════════
   KALICILIK — çift yazım: KV ayna (hep) + oik_kartlari satırı (kirli olan)
   ───────────────────────────────────────────────────────────
   oikSave(changed) — changed verilirse o kart "kirli" işaretlenir ve
   debounce'la tabloya upsert edilir. changed verilmezse yalnız KV aynası
   yazılır (hydrate sonrası ayna tazeleme — remote'a dokunmaz).
══════════════════════════════════════════════════════════════ */
export function oikSave(changed) {
  try { SafeStorage.set(_oikKey(), S._oik); }
  catch (e) { console.warn('oikSave:', e?.message); }
  if (changed && changed.id) {
    _oikDirty.add(changed.id);
    _oikScheduleFlush();
  }
}

export function oikLoad() {
  try {
    const data = SafeStorage.get(_oikKey());
    if (data && typeof data === 'object') {
      Object.assign(S._oik, data);
      if (!Array.isArray(S._oik.cards)) S._oik.cards = [];
      if (!S._oik.readingLog) {
        S._oik.readingLog = { lastMorning: null, lastNight: null, lastDayKey: null, streak: 0, totalReadings: 0 };
      }
    }
  } catch (e) { console.warn('oikLoad:', e?.message); }
}

/* ══════════════════════════════════════════════════════════════
   SUNUCU OMURGASI — oik_kartlari (mig 029)
   ───────────────────────────────────────────────────────────
   10A (an_kartlari) çift-yazım kalıbının ikizi: kirli-takip → 800ms
   debounce upsert; tablo yoksa (42P01) sessiz KV modu. Post-auth
   _oikHydrateRemote tablo-birincil okur; tablo boş + KV dolu → tek
   seferlik göç. readingLog/seri tabloya GİTMEZ (yalnız KV — bkz mig 029).
══════════════════════════════════════════════════════════════ */
const OIK_TABLE = 'oik_kartlari';
const _oikDirty = new Set();
let _oikRemoteOk = true;
let _oikFlushTimer = null;
// `sahne` kolonu mig 031'de eklendi (ELLE) — koşmadıysa 42703 (undefined_column)
// gelir; o an bu oturumda `sahne`'yi satırlardan çıkarıp KV-only bırakırız.
let _oikSahneColOk = true;

function _oikRemoteErr(error) {
  if (error?.code === '42P01') _oikRemoteOk = false;   // tablo yok → KV modu
  if (error?.code === '42703' && /sahne/.test(error?.message || '')) _oikSahneColOk = false;
  console.warn('oikRemote:', error?.message || error);
}
const _stripSahne = rows => rows.map(r => { const { sahne, ...rest } = r; return rest; });

const _cleanEntries = a => (Array.isArray(a) ? a : []).map(e => {
  const row = {
    text: String(_asText(e)).slice(0, 200),
    src:  (e && e.src) || 'user',
    at:   (e && e.at) || NOW(),
  };
  // ref = maddeyi doğuran Kişi Kartı (hedef mührü, aşağıdaki HEDEF KÖPRÜSÜ).
  // Sunucu turunda düşerse mühür sökme izini kaybeder ve madde kartta yetim
  // kalır — bu yüzden jsonb'ye yazılan satırda da taşınır (kolon şeması aynı).
  if (e && e.ref) row.ref = String(e.ref).slice(0, 64);
  return row;
}).filter(e => e.text);

export function _rowFromCard(k, uid) {
  return {
    id: k.id, user_id: uid,
    baslik:  String(k.baslik || '').slice(0, 60),
    whisper: String(k.whisper || '').slice(0, 140),
    dusunceler:  _cleanEntries(k.dusunceler),
    inanclar:    _cleanEntries(k.inanclar),
    duygular:    _cleanEntries(k.duygular),
    davranislar: _cleanEntries(k.davranislar),
    olumlama:       String(k.olumlama || ''),
    olumlama_duygu: String(k.olumlama_duygu || '').slice(0, 200),
    source:  k.source || 'tasarim',
    version: Number.isFinite(k.version) ? k.version : 1,
    parent_id: k.parent_id || null,
    state:   k.state === 'archived' ? 'archived' : 'active',
    has_recording: !!k.has_recording,
    sahne: k.sahne || null,   // Kart Üretim Motoru reçetesi (mig 031 — kolon yoksa flush ayıklar)
    created_at: k.created_at || NOW(),
    updated_at: k.updated_at || NOW(),
    sealed_at:  k.sealed_at || null,
  };
}

export function _cardFromRow(r) {
  return {
    id: r.id,
    baslik:  r.baslik || '',
    whisper: r.whisper || '',
    dusunceler:  _cleanEntries(r.dusunceler),
    inanclar:    _cleanEntries(r.inanclar),
    duygular:    _cleanEntries(r.duygular),
    davranislar: _cleanEntries(r.davranislar),
    olumlama:       r.olumlama || '',
    olumlama_duygu: r.olumlama_duygu || '',
    source:  r.source || 'tasarim',
    version: Number.isFinite(r.version) ? r.version : 1,
    parent_id: r.parent_id || null,
    state:   r.state === 'archived' ? 'archived' : 'active',
    has_recording: !!r.has_recording,
    sahne: r.sahne || null,
    created_at: r.created_at || NOW(),
    updated_at: r.updated_at || NOW(),
    sealed_at:  r.sealed_at || null,
  };
}

function _oikScheduleFlush() {
  if (!_oikRemoteOk) return;
  clearTimeout(_oikFlushTimer);
  _oikFlushTimer = setTimeout(() => { _oikFlushDirty(); }, 800);
}

async function _oikFlushDirty() {
  const uid = S.currentUser?.id;
  if (!sb || !uid || !_oikRemoteOk || !_oikDirty.size) return;
  const rows = (S._oik.cards || [])
    .filter(k => k && _oikDirty.has(k.id))
    .map(k => _rowFromCard(k, uid));
  if (!rows.length) { _oikDirty.clear(); return; }
  try {
    let { error } = await sb.from(OIK_TABLE).upsert(_oikSahneColOk ? rows : _stripSahne(rows));
    if (error?.code === '42703' && /sahne/.test(error?.message || '')) {
      _oikSahneColOk = false;
      ({ error } = await sb.from(OIK_TABLE).upsert(_stripSahne(rows)));
    }
    if (error) { _oikRemoteErr(error); return; }
    rows.forEach(r => _oikDirty.delete(r.id));
  } catch (e) { console.warn('oikFlush:', e?.message); }
}

/* Post-auth hidrasyon: tablo birincil; tablo boş + KV dolu → tek seferlik göç.
   true dönerse bellek tablodan tazelendi (render'lar yenilenmeli). */
export async function _oikHydrateRemote() {
  const uid = S.currentUser?.id;
  if (!sb || !uid || !_oikRemoteOk) return false;
  try {
    const { data, error } = await sb.from(OIK_TABLE)
      .select('*').eq('user_id', uid)
      .order('created_at', { ascending: true });
    if (error) { _oikRemoteErr(error); return false; }

    if (Array.isArray(data) && data.length) {
      S._oik.cards = data.map(_cardFromRow);
      // Aktif işaretçi: KV'deki id tabloda hâlâ aktifse koru; değilse en yeni aktif
      const actives = S._oik.cards.filter(k => k.state === 'active');
      if (!actives.some(k => k.id === S._oik.activeCardId)) {
        S._oik.activeCardId = actives.length ? actives[actives.length - 1].id : null;
      }
      oikSave();          // KV aynasını tazele (arg yok → remote'a geri yazmaz)
      return true;
    }

    // Tablo boş — KV'de kart varsa yeni omurgaya göç (idempotent: PK upsert)
    if (Array.isArray(S._oik.cards) && S._oik.cards.length) {
      const rows = S._oik.cards.map(k => _rowFromCard(k, uid));
      let { error: e2 } = await sb.from(OIK_TABLE).upsert(_oikSahneColOk ? rows : _stripSahne(rows));
      if (e2?.code === '42703' && /sahne/.test(e2?.message || '')) {
        _oikSahneColOk = false;
        ({ error: e2 } = await sb.from(OIK_TABLE).upsert(_stripSahne(rows)));
      }
      if (e2) _oikRemoteErr(e2);
    }
    return false;
  } catch (e) { console.warn('oikHydrate:', e?.message); return false; }
}

/* ══════════════════════════════════════════════════════════════
   KART YARDIMCILARI
══════════════════════════════════════════════════════════════ */
export function emptyCard(source = 'tasarim') {
  return {
    id: NEWID(), baslik: '', whisper: '',
    dusunceler: [], inanclar: [], duygular: [], davranislar: [],
    olumlama: '', olumlama_duygu: '',
    nisan: null,   // Yolunun Nişanı (Alfabe Işık Faz 4) — kart sırtına kazınır
    source, version: 1, parent_id: null,
    state: 'active', has_recording: false,
    created_at: NOW(), updated_at: NOW(), sealed_at: null,
  };
}

/** Şu an yaşayan (state:'active') kart | null. */
export function _getActiveCard() {
  const o = S._oik;
  if (!o || !Array.isArray(o.cards)) return null;
  if (o.activeCardId) {
    const found = o.cards.find(c => c && c.id === o.activeCardId && c.state === 'active');
    if (found) return found;
  }
  return o.cards.find(c => c && c.state === 'active') || null;
}

/** Aynı/çok-benzer madde varsa eklemez. ref verilirse maddeyi doğuran
 *  Kişi Kartı'nın izi maddede taşınır (hedef mührü geri alınabilsin diye). */
export function _addEntry(card, cat, text, src = 'user', ref = null) {
  if (!card || !CAT_KEYS.includes(cat)) return false;
  const clean = String(text || '').trim().replace(/\s+/g, ' ').slice(0, 200);
  if (clean.length < 2) return false;
  if (!Array.isArray(card[cat])) card[cat] = [];
  if (card[cat].some(e => _norm(_asText(e)) === _norm(clean))) return false;
  const entry = { text: clean, src, at: NOW() };
  if (ref) entry.ref = String(ref);
  card[cat].push(entry);
  return true;
}

/** Dış modüllerden (Meclis dönüşüm mührü) tek madde ekleme yolu — kartın
 *  kendi _addEntry+oikSave zincirini kullanır, yeni bir yazma yolu icat
 *  etmez. Döner: eklenen maddenin izleme kimliği (idempotens için) | null. */
export function oikAddMadde(kategori, text, src = 'user') {
  const card = _getActiveCard();
  if (!card) return null;
  const ok = _addEntry(card, kategori, text, src);
  if (!ok) return null;
  oikSave(card);
  return `${card.id}:${kategori}:${card[kategori].length - 1}`;
}

/** İnanç + düşünce satırlarından olumlama metni türet (10j _syncAffirmation kalıbı). */
export function _composeOlumlama(card) {
  if (!card) return '';
  const lines = [...(card.inanclar || []), ...(card.dusunceler || [])]
    .map(_asText).filter(Boolean);
  return lines.join(' ');
}

/* ══════════════════════════════════════════════════════════════
   HEDEF KÖPRÜSÜ — "Böyle bir kişi olmak istiyorum"
   ───────────────────────────────────────────────────────────
   Portrenin evrim köprüsünün (02c porAbsorbCard) LAPİS İKİZİ.
   Orada KAZANILAN kart olduğun kişiye işlenir; burada HEDEFLENEN
   kart olmak istediğin kişiye. Kişiler'de sahipsiz bir karta mühür
   vurulunca 10q kkHedefMuhurle buraya akıtır: kartın 4 boyutu
   maddelere döner (12b `hisler` → buradaki `duygular`; kategori
   başına en fazla 2, dedup'lu, src:'kart' + ref).

   Mühür asla boşa gitmez: aktif kart henüz yoksa kart id'si kuyruğa
   yazılır, tasarım töreni kartı mühürleyince (_commitCard) drene edilir.
   Kullanıcının el yazısı (src:'user') ve LLM rafinesi DOKUNULMAZ —
   geri alma yalnız o kartın ref izini taşıyan maddeleri çeker.
══════════════════════════════════════════════════════════════ */
/* Kart boyutu → OİK kategorisi. Tek fark `hisler ↔ duygular`; iki taraf da
   aynı dört ekseni konuşur. Mesafe Motoru (13x) bu haritayı TERS yönde okur
   (niyetin en yoğun kategorisi hangi kart boyutuna denk düşüyor) — ikiz bir
   sözlük yazmasın diye dışa açıktır. */
export const ABSORB_MAP = { dusunceler: 'dusunceler', inanclar: 'inanclar', hisler: 'duygular', davranislar: 'davranislar' };
const ABSORB_PER_CAT = 2;                                   // kart başına kategori başına madde
const ABSORB_Q_KEY = uid => `etw_oik_absorb_q_${uid}`;

function _oikAbsorbEnqueue(cardId) {
  const uid = S.currentUser?.id;
  if (!uid) return;
  try {
    const arr = SafeStorage.get(ABSORB_Q_KEY(uid), []);
    const q = Array.isArray(arr) ? arr : [];
    if (!q.includes(cardId)) { q.push(cardId); SafeStorage.set(ABSORB_Q_KEY(uid), q); }
  } catch (_) {}
}

function _oikAbsorbDequeue(cardId) {
  const uid = S.currentUser?.id;
  if (!uid) return;
  try {
    const arr = SafeStorage.get(ABSORB_Q_KEY(uid), []);
    if (!Array.isArray(arr) || !arr.includes(cardId)) return;
    const q = arr.filter(id => id !== cardId);
    if (q.length) SafeStorage.set(ABSORB_Q_KEY(uid), q);
    else SafeStorage.remove(ABSORB_Q_KEY(uid));
  } catch (_) {}
}

/** Hedeflenen Kişi Kartı'nın 4 boyutunu aktif OİK kartına işle.
 *  Döner: eklenen madde sayısı. Aktif kart yoksa 0 döner ama mühür
 *  geçersiz DEĞİLDİR — kart id'si kuyruğa alınır (10q hedefi kendi
 *  state'inde ayrıca tutar). */
export function oikAbsorbCard(card) {
  if (!card || !card.id) return 0;
  const k = _getActiveCard();
  if (!k) { _oikAbsorbEnqueue(card.id); return 0; }
  // Aynı kart iki kez işlenmez (kuyruk drenajı + canlı mühür çakışması)
  if (CAT_KEYS.some(cat => (k[cat] || []).some(e => e && e.ref === card.id))) return 0;
  let added = 0;
  Object.entries(ABSORB_MAP).forEach(([from, to]) => {
    (Array.isArray(card[from]) ? card[from] : []).slice(0, ABSORB_PER_CAT).forEach(txt => {
      if (_addEntry(k, to, txt, 'kart', card.id)) added++;
    });
  });
  if (added) {
    k.updated_at = NOW();
    oikSave(k);
    _syncLegacyMirror();
  }
  // Madde eklenmese de (hepsi dedup'landı) niyet bir evrimdir — yüz tazelenir.
  // Ad BURADA yakalanır: sentez anında kart nesnesi elde olmayabilir.
  _oikWaveAdd(card.id, card.name, card.virtue);
  return added;
}

/* ══════════════════════════════════════════════════════════════
   EVRİM KÖPRÜSÜ — "Niyet Alınan [Ad]" da CANLIDIR
   ───────────────────────────────────────────────────────────
   FELSEFE (Emre, 2026-07-27): "Kişi sürekli hangi kişi olduğunu ve
   hangi kişi olmak istediğini görsün." Altın tarafın evrim köprüsü
   (02c: absorb → dalga → porResynth) yıllardır çalışıyordu; lapis
   tarafta YOKTU — niyet mührü vurulan kişi kartın İÇİNE giriyor ama
   YÜZÜNÜ değiştirmiyordu. Bu blok o asimetriyi kapatır.
   MEKANİK: absorb/release → dalga (1200 ms debounce) → tek LLM sentezi
   → epitet + fısıltı yeniden yazılır. Maddelere DOKUNULMAZ: kullanıcının
   el yazısı da, kart izli maddeler de yerinde kalır (yalnız yüz tazelenir).
   Kalıcılık: dalga SafeStorage per-uid (etw_oik_evrim_wave_<uid>) — sayfa
   LLM penceresinde kapansa bile niyet kaybolmaz.
══════════════════════════════════════════════════════════════ */
const OIK_WAVE_KEY = uid => `etw_oik_evrim_wave_${uid}`;
const OIK_EVRIM_MS = 1200;        // 02c _scheduleEvrim ile aynı pencere
const OIK_WAVE_MAX = 40;          // kart yokken absorb birikirse dalga şişmesin

let _oikWave = [];                // bu dalgada işlenen kart id'leri
let _oikTimer = null;
let _oikResynthBusy = false;
let _oikResynthPending = false;   // LLM hata/offline — görünüm açılışında yeniden dene
let _oikChain = Promise.resolve();

/* Tasarım töreni ve resynth aynı karta yazar — sıraya sok (düşürme, ertele). */
function _oikSerial(fn) {
  const run = _oikChain.then(fn, fn);
  _oikChain = run.catch(() => {});
  return run;
}

function _oikWaveSave() {
  const uid = S.currentUser?.id;
  if (!uid) return;
  try {
    if (_oikWave.length) SafeStorage.set(OIK_WAVE_KEY(uid), _oikWave);
    else SafeStorage.remove(OIK_WAVE_KEY(uid));
  } catch (_) {}
}

/** Bekleyen dalgayı diskten geri al (oikInit çağırır). */
export function _oikWaveHydrate() {
  const uid = S.currentUser?.id;
  if (!uid) return;
  try {
    const q = SafeStorage.get(OIK_WAVE_KEY(uid), []);
    if (Array.isArray(q) && q.length) {
      _oikWave = q.slice(0, OIK_WAVE_MAX)
        .map(w => (typeof w === 'string' ? { id: w, name: '', virtue: '' } : w))
        .filter(w => w && w.id);
      if (_oikWave.length) _oikScheduleEvrim();
    }
  } catch (_) {}
}

/** Dalgaya bir kişi kat ve sentezi zamanla. Fonksiyon bildirimi olarak durur
 *  (hoisted): absorb/release bu bloktan ÖNCE tanımlıdır, TDZ'ye düşmesin. */
function _oikWaveAdd(id, name, virtue) {
  if (!id) return;
  _oikWave.push({ id, name: name || '', virtue: virtue || '' });
  if (_oikWave.length > OIK_WAVE_MAX) _oikWave = _oikWave.slice(-OIK_WAVE_MAX);
  _oikWaveSave();
  _oikScheduleEvrim();
}

/** Dalga başına TEK sentez — arka arkaya işlenen kartlar tek çağrıda birleşir. */
function _oikScheduleEvrim() {
  if (_oikTimer) clearTimeout(_oikTimer);
  _oikTimer = setTimeout(() => { _oikTimer = null; oikResynth(); }, OIK_EVRIM_MS);
}

/** Niyet tazelenmesi bekliyor mu? (Yüzeyler açılışta yeniden deneyebilsin.) */
export function oikResynthPending() { return _oikResynthPending; }

/** Kartın yüzünü (epitet + fısıltı) dalgadaki niyetlerin ışığında yeniden yaz.
 *  Maddelere dokunmaz. Hata hâlinde kart eski yüzüyle kalır — asla bloklamaz. */
export function oikResynth() { return _oikSerial(_oikResynthImpl); }

async function _oikResynthImpl() {
  const card = _getActiveCard();
  if (_oikResynthBusy || !S.currentUser?.id || !card || !card.baslik) return 0;
  const wave = _oikWave.splice(0);
  _oikWaveSave();
  if (!wave.length) return 0;
  _oikResynthBusy = true;
  _oikResynthPending = false;
  try {
    // Dalgadaki kişilerin adı absorb ANINDA yakalanmıştır — kart nesnesi
    // zaten elimizdeydi. Burada yeniden çözmek (deste import'u / gkRefResolve)
    // hem gereksiz hem de sentezi kartın o anki hâline bağımlı kılardı.
    const kisiler = wave
      .filter(w => w && w.name)
      .map(w => `- ${w.name}${w.virtue ? ` (erdem: ${w.virtue})` : ''}`);
    const catText = CAT_KEYS.map(k => {
      const items = (card[k] || []).map(e => {
        const txt = _asText(e);
        return e && e.src === 'kart' ? `[KART] ${txt}` : txt;
      }).filter(Boolean);
      return items.length ? `${_catLabel(k)}:\n` + items.map(s => `  · ${s}`).join('\n') : '';
    }).filter(Boolean).join('\n');

    const usr = [
      'MEVCUT KART ("Niyet Alınan" — kullanıcının olmak istediği kişi):',
      `Epitet: "${card.baslik}"`,
      card.whisper ? `Fısıltı: "${card.whisper}"` : '',
      '',
      catText,
      '',
      kisiler.length ? 'YENİ NİYET EDİLEN KİŞİLER (kullanıcı "böyle biri olmak istiyorum" dedi):' : '',
      ...kisiler,
      '',
      'Kartın YÜZÜNÜ bu niyetlerin ışığında yeniden yaz. Şu JSON şemasını döndür:',
      '{',
      '  "baslik": "2-4 kelimelik güncel şiirsel epitet — olmak İSTEDİĞİ kişi",',
      '  "whisper": "tek cümlelik italik fısıltı"',
      '}',
    ].filter(Boolean).join('\n');

    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: usr }] }],
      systemPrompt: p('prompt.oik.resynth_system'),
      maxTokens: 300, temperature: 0.5, jsonMode: true,
      model: SUMMARY_MODEL, skipPersona: true,
    });
    const obj = JSON.parse(raw);
    let changed = 0;
    if (obj.baslik)  { card.baslik  = String(obj.baslik).slice(0, 60);  changed++; }
    if (obj.whisper) { card.whisper = String(obj.whisper).slice(0, 200); changed++; }
    if (changed) {
      card.updated_at = NOW();
      oikSave(card);
      _syncLegacyMirror();
      // Yüzeyler beklemez: Bugün'ün lapis kutbu ve OİK ekranı yeni yüzü alır
      try { window.yolRenderHero?.(); } catch (_) {}
      try { oikRenderHub(); } catch (_) {}          // OİK ekranı açıksa tazelenir
      try { window.yolRenderHero?.(); } catch (_) {} // hero yığını (Karşılaşma'nın kaynağı)
    }
    return changed;
  } catch (e) {
    // Sentez düşerse niyet kaybolmaz — dalga geri konur, açılışta yeniden denenir
    _oikWave = wave.concat(_oikWave).slice(0, OIK_WAVE_MAX);
    _oikWaveSave();
    _oikResynthPending = true;
    console.warn('oikResynth:', e && e.message);
    return 0;
  } finally { _oikResynthBusy = false; }
}

/** Mühür sökülünce: o kartın ref izini taşıyan maddeleri geri çek.
 *  Döner: çıkarılan madde sayısı. */
export function oikReleaseCard(cardId) {
  if (!cardId) return 0;
  _oikAbsorbDequeue(cardId);
  const k = _getActiveCard();
  if (!k) return 0;
  let removed = 0;
  CAT_KEYS.forEach(cat => {
    if (!Array.isArray(k[cat])) return;
    const kept = k[cat].filter(e => !(e && e.ref === cardId));
    removed += k[cat].length - kept.length;
    k[cat] = kept;
  });
  if (removed) {
    k.updated_at = NOW();
    oikSave(k);
    _syncLegacyMirror();
    // Niyetten vazgeçmek de bir evrimdir — yüz o kişiyi artık anlatmasın
    _oikWaveAdd(cardId);
    // Niyetten vazgeçmek de bir kimlik hareketidir ve sayılır: kaç gezgin
    // tasarladığı kişiden geri döndü — kadranın en dürüst sorusu budur.
    try { window.wtLogKimlik?.('oik-serbest', { n: removed }); } catch (_) {}
  }
  return removed;
}

/** Kart mühürlenince bekleyen hedefleri işle. Deste 12b'den DİNAMİK
 *  import'la çözülür — statik kenar rollup sırasını kaydırıp TDZ açabilir
 *  ([[kisilerim-kart-motoru]] tuzağı), wsSyncStudio ile aynı kalıp. */
export function oikDrainAbsorbQueue() {
  const uid = S.currentUser?.id;
  if (!uid) return Promise.resolve(0);
  let q = [];
  try {
    const arr = SafeStorage.get(ABSORB_Q_KEY(uid), []);
    q = Array.isArray(arr) ? arr : [];
  } catch (_) {}
  if (!q.length) return Promise.resolve(0);
  return import('./12b-kart-destesi.js').then(async m => {
    const ready = await m.deckReady?.();
    let added = 0;
    q.forEach(id => {
      // Atölye kutbu katalogda YOKTUR — deste "bilmiyorum" dediğinde id
      // geçersiz sayılıp SİLİNİYORDU; önce geçiş kartına sorulur (10A).
      let c = null;
      try { c = window.gkPoleAsCardRef?.(id) || null; } catch (_) {}
      if (!c) c = m.getCardById?.(id) || null;
      if (c) { added += oikAbsorbCard(c); _oikAbsorbDequeue(id); }
      // Deste HAZIRKEN bulunamayan id geçersizdir (silinmiş/yeniden adlandırılmış
      // kart) — kuyrukta bırakılırsa her mühürde boşuna drenaj tetikler.
      else if (ready) _oikAbsorbDequeue(id);
    });
    return added;
  }).catch(e => { console.warn('oikDrainAbsorbQueue:', e?.message); return 0; });
}

/* ══════════════════════════════════════════════════════════════
   GÖÇ — 10j Geçiş Alanı KV'sinden tek seferlik, idempotent
   ───────────────────────────────────────────────────────────
   10j kart şeması: { id, created_at, olmakIstenenKisi, dusunceInanc[],
   duygu[], davranis[], source, hasRecording }. readingLog +
   crystalMilestone 1:1 kopyalanır → 13l delta-gözlemcisi sayı eşitken
   hayalet olay üretmez. 10j KV'si SİLİNMEZ (rollback güvencesi).
══════════════════════════════════════════════════════════════ */
/** Saf eşleyici (test edilebilir). id = 'oik_ga_<eskiId>' → ses kaydı göçü deterministik. */
export function _cardFromLegacyGecis(gc, isActive) {
  const mk = arr => (Array.isArray(arr) ? arr : [])
    .map(_asText).filter(Boolean)
    .map(text => ({ text: String(text).slice(0, 200), src: 'legacy', at: gc?.created_at || NOW() }));
  const inanclar = mk(gc?.dusunceInanc);
  return {
    id: 'oik_ga_' + String(gc?.id || NEWID()),
    baslik: String(gc?.olmakIstenenKisi || '').slice(0, 60),
    whisper: '',
    dusunceler: [],
    inanclar,
    duygular: mk(gc?.duygu),
    davranislar: mk(gc?.davranis),
    olumlama: inanclar.map(e => e.text).join(' '),
    olumlama_duygu: '',
    source: 'legacy_gecis',
    version: 1, parent_id: null,
    state: isActive ? 'active' : 'archived',
    has_recording: !!gc?.hasRecording,
    created_at: gc?.created_at || NOW(),
    updated_at: NOW(),
    sealed_at: null,
  };
}

function _migrateFromGecis() {
  const o = S._oik;
  if (o.migratedFromGecis) return false;
  o.migratedFromGecis = true;                 // idempotent — bir kez dene

  // Kullanıcı yeni omurgada zaten ilerlediyse dokunma
  if (Array.isArray(o.cards) && o.cards.length) { oikSave(); return false; }

  let legacy = null;
  try { legacy = SafeStorage.get(_gecisKey()); } catch (_) {}
  if (!legacy || typeof legacy !== 'object' || !Array.isArray(legacy.cards) || !legacy.cards.length) {
    oikSave(); return false;
  }

  const activeId = legacy.activeCardId;
  o.cards = legacy.cards.map((gc, i) =>
    _cardFromLegacyGecis(gc, activeId ? gc.id === activeId : i === 0));
  o.activeCardId = (o.cards.find(c => c.state === 'active') || o.cards[0] || {}).id || null;

  if (legacy.readingLog) o.readingLog = { ...o.readingLog, ...legacy.readingLog };
  if (typeof legacy.crystalMilestone === 'number') o.crystalMilestone = legacy.crystalMilestone;
  oikSave();

  // Ses kaydı göçü — deterministik id sayesinde eski anahtar türetilir (best-effort)
  o.cards.forEach(c => {
    if (!c.has_recording || !c.id.startsWith('oik_ga_')) return;
    _migrateRecording(c.id.slice('oik_ga_'.length), c.id);
  });
  return true;
}

async function _migrateRecording(oldGecisId, newId) {
  try {
    const rec = await idbGetRecording(`gecis_${oldGecisId}`);
    if (rec?.blob) {
      await idbSaveRecording(`oik_${newId}`, rec.blob, { user_id: S.currentUser?.id, duration: rec.duration });
    }
  } catch (_) {}
}

/* ══════════════════════════════════════════════════════════════
   LEGACY AYNA — eski okuyucular kırılmasın (geriye uyum)
   S._personTransition.desired.description + S._affirmation, dfSave().
══════════════════════════════════════════════════════════════ */
export function _syncLegacyMirror() {
  const card = _getActiveCard();
  if (!card) return;
  if (S._personTransition?.desired) {
    S._personTransition.desired.description = card.baslik || '';
    S._personTransition.last_updated = NOW();
  }
  if (S._affirmation) {
    const text = card.olumlama || _composeOlumlama(card);
    if (text) {
      S._affirmation.text = text;
      S._affirmation.source = 'oik';
      S._affirmation.created_at = S._affirmation.created_at || NOW();
    }
  }
  try { dfSave(); } catch (_) {}
}

/* ══════════════════════════════════════════════════════════════
   TEK KAYNAK API — tüm tüketiciler buradan beslenir
══════════════════════════════════════════════════════════════ */
/** Aktif "olmak istediğin kişi" kartı | null. */
export function oikGetCard() { return _getActiveCard(); }

/** Kartın görünen adı: "Niyet Alınan {ad}" — `porCardName`'in (02c) lapis
 *  ikizi, ad kaynağı da aynı konvansiyon: #ob-name → auth metadata → Gezgin.
 *  NEDEN: iki kutbun adı da kullanıcının KENDİ adını taşır — altın "olunan"
 *  hâli, lapis "niyet alınan" hâli. LLM'in yazdığı `baslik` artık ad değil
 *  EPİTETTİR (kart yüzünde italik alt satır). */
export function oikCardName() {
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
  return t('oik.card_name', 'Niyet Alınan {name}').replace('{name}', name);
}

/** OİK kartını BESLEYEN kart id'leri — hangi kişiler hedef mührüyle işlendi.
 *  Kaynak: maddelerin `ref` izi (oikAbsorbCard'ın bıraktığı; mühür sökme de
 *  aynı izden bulur). Benlik Yapısı (10q3) lapis kolu bundan çizilir. */
export function oikCardRefs() {
  const card = _getActiveCard();
  if (!card) return [];
  const ids = new Set();
  for (const k of CAT_KEYS) for (const e of (card[k] || [])) if (e && e.ref) ids.add(e.ref);
  return [...ids];
}

/** { name, whisper, description } | null. Kart yoksa legacy desired aynasından. */
export function oikGetDesired() {
  const card = _getActiveCard();
  if (card && card.baslik) {
    return { name: card.baslik, whisper: card.whisper || '', description: card.baslik };
  }
  const desc = S._personTransition?.desired?.description?.trim();
  if (desc) return { name: desc, whisper: '', description: desc };
  return null;
}

/** Aktif kartın Yolunun Nişanı (Alfabe Işık Faz 4) — NISANLAR kaydı | null.
 *  02d eşik köprüsü ve kart sırtı kazıması bu tek kaynaktan okur. */
export function oikActiveNisan() {
  try {
    const card = _getActiveCard();
    if (!card || !card.nisan) return null;
    return NISANLAR.find(n => n.id === card.nisan) || null;
  } catch (_) { return null; }
}

/** İstatistik — getGecisAlaniStats sözleşmesiyle uyumlu (streak/totalReadings/crystalTier). */
export function oikGetStats() {
  const o = S._oik || {};
  const rl = o.readingLog || {};
  return {
    cards: Array.isArray(o.cards) ? o.cards.length : 0,
    streak: rl.streak || 0,
    totalReadings: rl.totalReadings || 0,
    crystalTier: oikCrystalTierIndex(),
  };
}

/** 09a Emre bağlamı bloğu (aktif kart varsa). TR skeleton — dil kilidi getLangInstruction'da. */
export function oikGetContext() {
  const card = _getActiveCard();
  if (!card || !card.baslik) return '';
  const cat = k => (card[k] || []).map(_asText).filter(Boolean).slice(-4).join('; ');
  const lines = [
    '◈ OLMAK İSTEDİĞİN KİŞİ · kullanıcının kendi tasarladığı hedef kimlik (Geçiş Yapısı)',
    `Ad: "${card.baslik}"${card.whisper ? ' — ' + card.whisper : ''}`,
  ];
  const d = cat('dusunceler');  if (d) lines.push(`Düşünceleri: ${d}`);
  const i = cat('inanclar');    if (i) lines.push(`İnançları: ${i}`);
  const u = cat('duygular');    if (u) lines.push(`Duyguları: ${u}`);
  const v = cat('davranislar'); if (v) lines.push(`Davranışları: ${v}`);
  const rl = S._oik?.readingLog;
  if (rl?.streak) lines.push(`Geçiş okuması serisi: ${rl.streak} gün.`);
  // Son bakışlar — Gördün mührünün (10E) Gördüklerin Defteri; Emre kullanıcının
  // o gözlerden bugüne dek ne gördüğünü bilsin.
  try {
    const visions = (window.usGetRecentVisions?.(3) || []).filter(v => v.text);
    if (visions.length) lines.push(`Son bakışlar: ${visions.map(v => `"${v.text}"`).join(' · ')}`);
  } catch (_) {}
  return lines.join('\n');
}

/**
 * Programatik taslak tohumu — 13-extras/10k'nın kırılgan "switchView +
 * setTimeout + DOM input set" köprülerinin yerine. Tasarım töreni bunu ön-doldurur.
 */
export function oikSeedDraft(seed) {
  if (!seed || typeof seed !== 'object') return;
  const arr = v => (Array.isArray(v) ? v.map(_asText).filter(Boolean) : []);
  S._oik.seedHint = {
    baslik:      String(seed.baslik || seed.olmakIstenenKisi || '').slice(0, 120),
    inanclar:    arr(seed.inanclar || seed.dusunceInanc),
    duygular:    arr(seed.duygular || seed.duygu),
    davranislar: arr(seed.davranislar || seed.davranis),
    at: NOW(),
  };
}

/* ══════════════════════════════════════════════════════════════
   INIT — post-auth (03-auth-shell)
══════════════════════════════════════════════════════════════ */
export function oikInit() {
  oikLoad();                 // KV senkron — ekran beklemeden çizilir
  _oikWaveHydrate();         // yarım kalmış niyet dalgası — yüz tazelenmeden kapanmışsa
  _migrateFromGecis();       // 10j Geçiş Alanı verisi tek seferlik göçer
  _syncLegacyMirror();       // desired/affirmation aynası
  // Sunucu omurgası (mig 029) — tablo doğruluğuyla tazele; tablo boşsa KV'den
  // tek seferlik göç. Tablo yoksa sessiz KV modu (hiçbir şey kırılmaz).
  _oikHydrateRemote().then(refreshed => {
    S._oikHydrated = true;
    if (refreshed) {
      _syncLegacyMirror();
      try { window.oikRenderHub?.(); } catch (_) {}   // Faz 3 render kancası
    }
  }).catch(() => { S._oikHydrated = true; });
}

/* ══════════════════════════════════════════════════════════════
   EKRAN — Hub (dolu/boş durum). Ritüel okuma sahnesi Faz 4'te.
══════════════════════════════════════════════════════════════ */
const _catLabel = k => t('por.label.' + k);   // REUSE — Portre kategori etiketleri

function _oikCardTexts(card) {
  const flat = k => (Array.isArray(card?.[k]) ? card[k] : []).map(_asText).filter(Boolean);
  return [card?.baslik, card?.whisper,
    ...flat('dusunceler'), ...flat('inanclar'), ...flat('duygular'), ...flat('davranislar')].filter(Boolean);
}

function _lapisCardHTML(card) {
  const ikvCardFace = window.ikvCardFace;
  if (typeof ikvCardFace === 'function') {
    const sahne = kumEnsureSpec(card, {
      seed: card.id, virtue: 'odak', texts: _oikCardTexts(card),
      persist: () => oikSave(card),
    });
    return ikvCardFace(
      // yuz: altın ikizinin aynası — aynı yüz, lapis ışıkta (12g)
      { id: 'oik_' + (card.baslik || 'kart'), name: oikCardName(),
        whisper: card.baslik || card.whisper || '', virtue: 'odak', yuz: true },
      { palette: 'lapis', sahne, kicker: t('oik.hub.card_kicker') }
    );
  }
  return `<div class="oik-card-fallback">
    <div class="oik-cf-kicker">${esc(t('oik.hub.card_kicker'))}</div>
    <div class="oik-cf-name">${esc(oikCardName())}</div>
    <div class="oik-cf-whisper">${esc(card.baslik || card.whisper || '')}</div>
  </div>`;
}

/* Hub'da bir boyut panelinde en çok kaç madde görünür — gerisi "…" olur.
   Panel bir VİTRİN, defterin kendisi değil: kullanıcı o boyuta madde ekledikçe
   sayfa uzamasın, dört boyut ekranda yan yana durabilsin. Tümü pencerede
   açılır (oikOpenDimPanel). */
const DIM_PREVIEW = 3;

function _dimPanelHTML(card, k, i) {
  const items = (card[k] || []);
  if (!items.length) return '';
  const shown = items.slice(0, DIM_PREVIEW);
  const rest = items.length - shown.length;
  const rows = shown.map(e => `<li class="oik-dim-row">${esc(_asText(e))}</li>`).join('');
  // "…" bir madde değil, devamın işareti — okuyucudan gizlenir
  const more = rest > 0 ? `<li class="oik-dim-row oik-dim-more" aria-hidden="true">…</li>` : '';
  // Açma düğmesi paneli KAPLAR (stretched button): <button> içine <ul> koymak
  // geçersiz HTML'dir; panel div kalır, düğme üstüne serilir — klavye ve odak
  // gerçek buton semantiğiyle çalışır.
  return `<div class="oik-dim ikv-panel ikv-panel--lapis" id="oik-dim-${k}" style="--i:${i};">
    <div class="oik-dim-label">${esc(_catLabel(k))}${rest > 0 ? `<span class="oik-dim-count">${items.length}</span>` : ''}</div>
    <hr class="ikv-hairline ikv-hairline--lapis" aria-hidden="true">
    <ul class="oik-dim-list">${rows}${more}</ul>
    <button type="button" class="oik-dim-open" onclick="oikOpenDimPanel('${k}')"
      aria-label="${esc(t('oik.dim.open_aria').replace('{cat}', _catLabel(k)))}"></button>
  </div>`;
}

/* Sahne katmanları — hub/boş durum ortak zemin (prensip 2/3/8). */
function _stageWrapHTML(inner) {
  return `<div class="oik-stage">
    <div class="oik-sky" aria-hidden="true"></div>
    <div class="oik-grain" aria-hidden="true"></div>
    <div class="oik-spine" aria-hidden="true"></div>
    ${inner}
  </div>`;
}

function _emptyHubHTML() {
  const ikvCardBack = window.ikvCardBack;
  const back = typeof ikvCardBack === 'function'
    ? `<div class="oik-empty-back">${ikvCardBack()}<div class="oik-esik-light" aria-hidden="true"></div></div>`
    : '';
  return _stageWrapHTML(`
    <div class="oik-empty">
      ${back}
      <div class="oik-kicker">${esc(t('oik.hub.empty_kicker'))}</div>
      <div class="oik-empty-title">${esc(t('oik.hub.empty_title'))}</div>
      <div class="oik-empty-body">${esc(t('oik.hub.empty_body'))}</div>
      <button class="ikv-seal-btn" onclick="oikOpenDesign()">${esc(t('oik.hub.empty_cta'))}</button>
    </div>`);
}

/* İki okuma vuruşu (K4) — sabah/gece; ortada halka "günün geçişi". */
function _strikesHTML(log, today) {
  const sabahDone = log.lastMorning === today;
  const geceDone = log.lastNight === today;
  const streak = log.streak || 0;
  const pct = ((sabahDone ? 1 : 0) + (geceDone ? 1 : 0)) / 2 * 100;
  const glyph = (sabahDone && geceDone) ? '✦' : ((sabahDone || geceDone) ? '◐' : '·');
  const ikvRing = window.ikvRing;
  const ring = typeof ikvRing === 'function'
    ? ikvRing(pct, { size: 52, yol: true, center: `<span class="oik-ring-glyph">${glyph}</span>` })
    : `<span class="oik-ring-glyph">${glyph}</span>`;
  return `
    <div class="oik-strikes">
      <button type="button" class="oik-strike${sabahDone ? ' done' : ''}" onclick="window.oikOpenReading&&window.oikOpenReading()">
        <span class="oik-strike-glyph" aria-hidden="true">✦</span>
        <span class="oik-strike-label">${esc(t('oik.hub.morning'))}</span>
      </button>
      ${ring}
      <button type="button" class="oik-strike${geceDone ? ' done' : ''}" onclick="window.oikOpenReading&&window.oikOpenReading()">
        <span class="oik-strike-glyph" aria-hidden="true">☽</span>
        <span class="oik-strike-label">${esc(t('oik.hub.night'))}</span>
      </button>
    </div>
    ${streak > 0 ? `<div class="oik-streak">${esc(t('oik.hub.streak').replace('{n}', streak))}</div>` : ''}
    <div class="oik-strike-hint">${esc(t('oik.hub.strike_hint'))}</div>`;
}

function _hubHTML(card) {
  const log = S._oik.readingLog || {};
  const today = TODAY();
  const dims = CAT_KEYS.map((k, i) => _dimPanelHTML(card, k, i)).filter(Boolean).join('');
  const archived = (S._oik.cards || []).filter(c => c.state === 'archived');

  const affirm = card.olumlama
    ? `<div class="oik-affirm ikv-panel">
         <div class="oik-affirm-label">${esc(t('oik.hub.affirm_label'))}</div>
         <div class="oik-affirm-text">${esc(card.olumlama)}</div>
         ${card.olumlama_duygu ? `<div class="oik-affirm-feeling">${esc(t('oik.hub.affirm_feeling'))}: ${esc(card.olumlama_duygu)}</div>` : ''}
       </div>`
    : '';

  const justSealed = !!S._oik._justSealed;
  if (justSealed) S._oik._justSealed = false;   // tek seferlik nabız (K5)

  return _stageWrapHTML(`
    <div class="oik-hub">
      <div class="oik-hero">
        <div class="oik-kicker">${esc(t('oik.hub.kicker'))}</div>
        <div class="oik-halo" aria-hidden="true"></div>
        <div class="oik-hero-card${justSealed ? ' oik-pulse' : ''}">${_lapisCardHTML(card)}</div>
        ${card.whisper ? `<div class="oik-hero-whisper"><em>${esc(card.whisper)}</em></div>` : ''}
      </div>

      ${_strikesHTML(log, today)}

      <button class="ikv-seal-btn oik-read-cta" onclick="window.oikOpenReading&&window.oikOpenReading()">${esc(t('oik.hub.read_cta'))}</button>

      ${dims ? `<div class="oik-dims ikv-cascade">${dims}</div>` : ''}
      ${affirm}

      <div class="oik-actions-foot">
        <button class="ikv-ghost-btn" onclick="oikOpenDesign()">${esc(t('oik.hub.redesign'))}</button>
      </div>
      ${archived.length ? `<div class="oik-versions">${esc(t('oik.hub.versions'))} · ${archived.length}</div>` : ''}
      <div class="oik-aphorism"><em>${esc(t('oik.hub.aphorism'))}</em></div>
    </div>`);
}

export function loadOikView() {
  const body = document.getElementById('oik-body');
  if (!body) return;
  const card = _getActiveCard();
  body.innerHTML = card ? _hubHTML(card) : _emptyHubHTML();
  // holo: pencerenin ardındaki kart ışığa tutulmuş gibi eğimi izler (12c)
  try { window.ikvHoloScan && window.ikvHoloScan(body); } catch (_) {}
}

/** oikInit hydrate kancası — hub açıksa tazele. */
export function oikRenderHub() {
  const view = document.getElementById('oik-view');
  if (view && view.classList.contains('active')) loadOikView();
}

/* ── Boyut penceresi — bir boyutun TAMAMI ──
   Hub'daki panel yalnız ilk DIM_PREVIEW maddeyi gösterir; defterin tamamı
   burada açılır. Pencere DOM çapasına değil STATE'e bakar (_getActiveCard):
   önceki tasarım hub'da render edilmiş `#oik-dim-*` düğümüne kaydırmaya
   çalışıyordu ve canlıda ölçüldü ki o düğüm henüz yokken çağrı boşa düşüyordu.
   Pencere o bağı tamamen koparır — hub render edilmiş olsun ya da olmasın açılır. */
let _dimPortalEl = null;
let _dimPortalOpener = null;   // odak nereden geldiyse oraya döner (aria-modal sözü)
function _dimPortalKey(e) { if (e.key === 'Escape') oikCloseDimPanel(); }

export function oikOpenDimPanel(cat) {
  if (!CAT_KEYS.includes(cat)) return;
  const card = _getActiveCard();
  // Kart hiç yoksa önce o kişiyi tasarla — oikOpenReading'in aynı kapısı.
  if (!card) { showToast(t('oik.toast.create_first')); oikOpenDesign(); return; }
  // Çift-overlay guard'ı — ama bayrağa DEĞİL DOM'a güven: portal başka bir
  // yolla koparıldıysa (view sıfırlama, navigasyon) asılı kalan bayrak
  // pencereyi bir daha hiç açtırmazdı. 02d'nin `_esikOpen || getElementById`
  // kalıbının aynısı.
  if (_dimPortalEl && _dimPortalEl.isConnected) return;
  _dimPortalEl = null;
  const items = (card[cat] || []).map(_asText).filter(Boolean);

  const portal = document.createElement('div');
  portal.id = 'oik-dim-portal';
  portal.setAttribute('role', 'dialog');
  portal.setAttribute('aria-modal', 'true');
  portal.setAttribute('aria-label', _catLabel(cat));
  const body = items.length
    ? `<ul class="oik-dp-list">${items.map(x => `<li class="oik-dim-row">${esc(x)}</li>`).join('')}</ul>`
    // Eşik'ten boş bir boyuta gelinebilir (hub'da o panel hiç çizilmez) —
    // burada kapı kapanmaz, davete dönüşür.
    : `<div class="oik-dp-empty">${esc(t('oik.dim.portal_empty'))}
         <button type="button" class="ikv-seal-btn oik-dp-cta" onclick="oikCloseDimPanel();oikOpenDesign()">${esc(t('oik.dim.portal_cta'))}</button>
       </div>`;
  portal.innerHTML = `
    <div class="oik-dp-veil" aria-hidden="true"></div>
    <div class="oik-dp-sheet">
      <button type="button" class="oik-dp-close" onclick="oikCloseDimPanel()" aria-label="${esc(t('oik.read.close'))}">✕</button>
      <div class="oik-dp-kicker">${esc(t('oik.dim.portal_kicker'))}</div>
      <div class="oik-dp-title">${esc(_catLabel(cat))}</div>
      <hr class="ikv-hairline ikv-hairline--lapis" aria-hidden="true">
      ${body}
    </div>`;
  document.body.appendChild(portal);
  _dimPortalEl = portal;
  requestAnimationFrame(() => portal.classList.add('oik-dp-in'));
  portal.querySelector('.oik-dp-veil')?.addEventListener('click', oikCloseDimPanel);
  document.addEventListener('keydown', _dimPortalKey);
  try {
    _dimPortalOpener = document.activeElement;
    portal.querySelector('.oik-dp-close')?.focus();
  } catch (_) {}
}

export function oikCloseDimPanel() {
  if (!_dimPortalEl) return;
  const el = _dimPortalEl;
  _dimPortalEl = null;
  document.removeEventListener('keydown', _dimPortalKey);
  // Odak geldiği yere döner; panel hâlâ DOM'daysa (hub yeniden çizilmediyse)
  // klavye kullanıcısı listenin başına savrulmaz.
  const opener = _dimPortalOpener;
  _dimPortalOpener = null;
  try { if (opener && opener.isConnected) opener.focus(); } catch (_) {}
  el.classList.remove('oik-dp-in');
  el.classList.add('oik-dp-out');
  setTimeout(() => el.remove(), 320);
}

/* Eşiğin köprüsünden derin bağlantı (02d): OİK'i aç ve o boyutun penceresini
   doğrudan aç. Gecikme yalnız TÖRENSEL — pencere hub render'ına bağlı değil,
   view geçişi göze görünsün diye bir nefes beklenir. */
export function oikOpenDim(cat) {
  try { window.switchView?.('oik'); } catch (_) {}
  setTimeout(() => { try { oikOpenDimPanel(cat); } catch (_) {} }, 380);
}

/* ══════════════════════════════════════════════════════════════
   TASARIM TÖRENİ — Yeni Bir Kişiye Geçiş Yapısı (4 adım + sunum)
   ───────────────────────────────────────────────────────────
   1) O kişinin gözünden bak   2) Düşünce+İnançları
   3) His+Davranışları         4) Seçimleri → Sentez → Sunum
══════════════════════════════════════════════════════════════ */
let _tOverlayOpen = false;

/** Yeniden tasarımda önceki karttan taşınan maddeler.
 *
 *  Metin taşınır, YAZIM TARİHİ de taşınır. Eski hâl hepsini `NOW()` ile
 *  yeniden damgalıyordu: sürüm artıyor ama her maddenin yaşı sıfırlanıyordu —
 *  "Şubat'ta 'sınır koyarım' yazmıştın" cümlesi kurulamaz hâle geliyordu.
 *  Dönüşümün kanıtı maddenin ne kadar süredir orada durduğudur.
 *
 *  `src` bilinçli olarak 'user' kalır: kullanıcı maddeyi yeni kartına kendi
 *  eliyle taşıdı — sahiplendi; ayrıca resynth 'user' maddelerini ezmez. */
export function _oikTasinanMaddeler(liste) {
  return (liste || []).map(e => ({
    text: _asText(e),
    src: 'user',
    at: (e && typeof e === 'object' && e.at) ? e.at : NOW(),
  }));
}

export function oikOpenDesign() {
  if (_tOverlayOpen) return;
  if (!document.body) return;
  _tOverlayOpen = true;

  // Yeniden tasarımda mevcut aktif karttan tohumla; yoksa seedHint
  const base = _getActiveCard();
  const seed = S._oik.seedHint || null;
  const draft = emptyCard('tasarim');
  if (base) {
    draft.parent_id = base.id;
    draft.version = (base.version || 1) + 1;
    draft.baslik = base.baslik; draft.whisper = base.whisper;
    CAT_KEYS.forEach(k => { draft[k] = _oikTasinanMaddeler(base[k]); });
    draft.olumlama = base.olumlama; draft.olumlama_duygu = base.olumlama_duygu;
  } else if (seed) {
    draft.baslik = seed.baslik || '';
    (seed.inanclar || []).forEach(x => _addEntry(draft, 'inanclar', x, 'user'));
    (seed.duygular || []).forEach(x => _addEntry(draft, 'duygular', x, 'user'));
    (seed.davranislar || []).forEach(x => _addEntry(draft, 'davranislar', x, 'user'));
  }
  const st = { step: 1, gaze: seed?.baslik || base?.baslik || '' };
  let synth = null;

  const overlay = document.createElement('div');
  overlay.className = 'onb-ritual sc-onb oik-onb';
  overlay.id = 'oik-onb';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('onb-open'));   // K1 fix — 02c/02d kalıbı, aksi hâlde perde görünmez kalır

  function close() {
    overlay.classList.remove('onb-open');
    overlay.classList.add('onb-closing');
    try { window.llmHomeCascade?.(); } catch (_) {}
    _tOverlayOpen = false;
    setTimeout(() => { overlay.remove(); }, 320);
  }

  /* Adım halkası — "· N/4" metni yerine altın→lapis yay (Tasarım Prensipleri §7). */
  function _tRing(step) {
    const ikvRing = window.ikvRing;
    if (typeof ikvRing !== 'function') return '';
    const pct = Math.round((step / 4) * 100);
    return `<div class="oik-t-ring">${ikvRing(pct, { size: 50, yol: true, center: `<span class="oik-ring-glyph">${step}</span>` })}</div>`;
  }

  /* ── Chip grubu (toplama sahneleri) ── */
  function chipGroup(catKey) {
    const items = draft[catKey] || [];
    const chips = items.map((e, i) => `
      <span class="oik-chip">
        <span class="oik-chip-txt">${esc(_asText(e))}</span>
        <button type="button" class="oik-chip-x" data-rm="${catKey}" data-i="${i}" aria-label="${esc(t('oik.design.remove'))}">×</button>
      </span>`).join('');
    return `
      <div class="oik-group ikv-panel ikv-panel--lapis">
        <div class="oik-group-label">${esc(_catLabel(catKey))}</div>
        <hr class="ikv-hairline ikv-hairline--lapis" aria-hidden="true">
        <div class="oik-chips">${chips}</div>
        <div class="oik-input-row">
          <input type="text" class="oik-input" data-cat="${catKey}" placeholder="${esc(t('oik.design.ph_' + catKey))}" />
          <button type="button" class="oik-add" data-add="${catKey}">${esc(t('oik.design.add'))}</button>
        </div>
      </div>`;
  }

  function countAll() { return CAT_KEYS.reduce((n, k) => n + (draft[k] || []).length, 0); }

  function render() {
    if (st.step === 1) {
      overlay.innerHTML = `
        <div class="onb-scene oik-scene">
          <div class="oik-kicker">${esc(t('oik.design.kicker'))}</div>
          ${_tRing(1)}
          <div class="oik-scene-title">${esc(t('oik.design.s1_title'))}</div>
          <div class="oik-scene-body">${esc(t('oik.design.s1_body'))}</div>
          <textarea class="oik-gaze" id="oik-gaze" rows="4" placeholder="${esc(t('oik.design.s1_ph'))}">${esc(st.gaze)}</textarea>
          <div class="oik-aph"><em>${esc(t('oik.design.s1_aph'))}</em></div>
          <div class="oik-nav">
            <button class="ikv-ghost-btn" data-act="cancel">${esc(t('oik.design.cancel'))}</button>
            <button class="ikv-seal-btn" data-act="next">${esc(t('oik.design.next'))}</button>
          </div>
        </div>`;
    } else if (st.step === 2 || st.step === 3) {
      const groups = st.step === 2 ? ['dusunceler', 'inanclar'] : ['duygular', 'davranislar'];
      const title = st.step === 2 ? t('oik.design.s2_title') : t('oik.design.s3_title');
      const bodyTxt = st.step === 2 ? t('oik.design.s2_body') : t('oik.design.s3_body');
      const aph = st.step === 2 ? t('oik.design.s2_aph') : t('oik.design.s3_aph');
      overlay.innerHTML = `
        <div class="onb-scene oik-scene">
          <div class="oik-kicker">${esc(t('oik.design.kicker'))}</div>
          ${_tRing(st.step)}
          <div class="oik-scene-title">${esc(title)}</div>
          <div class="oik-scene-body">${esc(bodyTxt)}</div>
          ${groups.map(chipGroup).join('')}
          <div class="oik-aph"><em>${esc(aph)}</em></div>
          <div class="oik-nav">
            <button class="ikv-ghost-btn" data-act="back">${esc(t('oik.design.back'))}</button>
            <button class="ikv-seal-btn" data-act="next">${esc(t('oik.design.next'))}</button>
          </div>
        </div>`;
    } else if (st.step === 4) {
      const ikvLantern = window.ikvLantern;
      overlay.innerHTML = `
        <div class="onb-scene oik-scene oik-scene--load">
          <div class="oik-kicker">${esc(t('oik.design.kicker'))}</div>
          ${_tRing(4)}
          <div class="oik-lantern" aria-hidden="true">
            ${typeof ikvLantern === 'function' ? ikvLantern(64) : ''}
            <div class="oik-lantern-orbit"><i></i><i></i><i></i></div>
          </div>
          <div class="oik-scene-title oik-load-title">${esc(t('oik.design.s4_loading'))}</div>
        </div>`;
      _runDesign();
    } else if (st.step === 5) {
      const card = synth;
      const ikvCardBack = window.ikvCardBack;
      const sumLines = CAT_KEYS.map(k => {
        const its = (card[k] || []).slice(0, 2).map(_asText).filter(Boolean).join(' · ');
        return its ? `<li class="oik-present-row"><span class="oik-present-cat">${esc(_catLabel(k))}</span><span>${esc(its)}</span></li>` : '';
      }).filter(Boolean).join('');
      // Yolunun Nişanı (Alfabe Işık Faz 4) — isteğe bağlı; seçilirse kart
      // sırtına kazınır. Yazılı nişanlar altın, yazılmamışlar kontur.
      const selNisan = card.nisan ? NISANLAR.find(n => n.id === card.nisan) : null;
      const nisanRow = NISANLAR.map(n => `
        <button type="button" class="oik-nisan-opt${card.nisan === n.id ? ' is-sel' : ''}${window.isikIsWritten?.(n.id) ? ' is-yazili' : ''}"
                data-nisan="${esc(n.id)}" aria-label="${esc(n.ad)}" title="${esc(n.ad)}">
          <svg viewBox="0 0 100 100" aria-hidden="true">${n.icon}</svg>
        </button>`).join('');
      overlay.innerHTML = `
        <div class="onb-scene oik-scene oik-scene--present">
          <div class="oik-kicker">${esc(t('oik.design.present_kicker'))}</div>
          <div class="oik-flip">
            <div class="oik-flip-inner">
              <div class="oik-flip-back">${typeof ikvCardBack === 'function' ? ikvCardBack(selNisan ? { etch: selNisan.icon } : {}) : ''}</div>
              <div class="oik-flip-face">${_lapisCardHTML(card)}</div>
            </div>
          </div>
          <div class="oik-present-verdict oik-flip-reveal">${esc(t('oik.design.reveal'))}</div>
          <div class="oik-present-rest">
            ${sumLines ? `<ul class="oik-present-sum ikv-panel ikv-panel--lapis">${sumLines}</ul>` : ''}
            <div class="oik-present-affirm ikv-panel">
              <div class="oik-affirm-label">${esc(t('oik.hub.affirm_label'))}</div>
              <textarea class="oik-affirm-edit" id="oik-affirm-edit" rows="4">${esc(card.olumlama || '')}</textarea>
              ${card.olumlama_duygu ? `<div class="oik-affirm-feeling">${esc(t('oik.hub.affirm_feeling'))}: ${esc(card.olumlama_duygu)}</div>` : ''}
              <button type="button" class="oik-example" data-act="example">${esc(t('oik.design.load_example'))}</button>
            </div>
            <div class="oik-nisan ikv-panel ikv-panel--lapis">
              <div class="oik-affirm-label">${esc(t('oik.design.nisan_label', 'Yolunun Nişanı · isteğe bağlı'))}</div>
              <div class="oik-nisan-row">${nisanRow}</div>
              <div class="oik-nisan-hint"><em>${esc(selNisan ? selNisan.hakikat : t('oik.design.nisan_hint', 'Bu yolda sana eşlik edecek nişanı seç — kartının sırtına kazınır.'))}</em></div>
            </div>
            <div class="oik-nav">
              <button class="ikv-ghost-btn" data-act="back-present">${esc(t('oik.design.back'))}</button>
              <button class="ikv-seal-btn" data-act="seal">${esc(t('oik.design.seal'))}</button>
            </div>
          </div>
        </div>`;
    } else if (st.step === 6) {
      const card = synth;
      overlay.innerHTML = `
        <div class="onb-scene oik-scene oik-scene--seal">
          <div class="oik-kicker oik-kicker--gold">${esc(t('oik.seal.kicker'))}</div>
          <div class="oik-seal-stage">
            ${_lapisCardHTML(card)}
            <div class="oik-seal-stamp" aria-hidden="true">◆</div>
          </div>
          <div class="oik-seal-flash" aria-hidden="true"></div>
          <div class="oik-seal-line"><em>${esc(t('oik.seal.line'))}</em></div>
          <div class="oik-seal-sub">${esc(t('oik.toast.sealed'))}</div>
        </div>`;
      setTimeout(() => {
        close();
        try { window.switchView?.('oik'); } catch (_) {}
      }, 2200);
    }
  }

  async function _runDesign() {
    try {
      synth = await _oikDesignLLM(draft, st.gaze);
    } catch (_) {
      synth = _oikDesignFallback(draft, st.gaze);
    }
    st.step = 5;
    render();
  }

  // Event delegation
  overlay.addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    const addCat = e.target.closest('[data-add]')?.dataset.add;
    const rm = e.target.closest('[data-rm]');

    if (addCat) { _commitInput(addCat); return; }
    if (rm) {
      const cat = rm.dataset.rm; const i = +rm.dataset.i;
      if (Array.isArray(draft[cat])) { draft[cat].splice(i, 1); render(); }
      return;
    }
    if (!act) return;
    if (act === 'cancel') { close(); return; }
    if (act === 'back') { st.step = Math.max(1, st.step - 1); render(); return; }
    if (act === 'back-present') { st.step = 3; render(); return; }
    if (act === 'next') {
      if (st.step === 1) {
        st.gaze = (document.getElementById('oik-gaze')?.value || '').trim();
        st.step = 2; render(); return;
      }
      if (st.step === 2 || st.step === 3) {
        // Aktif input'ta yazılı kalan metni de al
        overlay.querySelectorAll('.oik-input').forEach(inp => { if (inp.value.trim()) _addEntry(draft, inp.dataset.cat, inp.value, 'user'); });
        if (st.step === 3 && countAll() < 3) { showToast(t('oik.design.need_more')); return; }
        st.step += 1; render(); return;
      }
    }
    if (act === 'example') {
      const ta = document.getElementById('oik-affirm-edit');
      if (ta) { ta.value = t('oik.canonical_affirmation'); if (synth) synth.olumlama_duygu = t('oik.canonical_feeling'); }
      return;
    }
    // Yolunun Nişanı seçimi (Faz 4) — toggle; re-render öncesi olumlama korunur
    const nisanBtn = e.target.closest('[data-nisan]');
    if (nisanBtn && synth) {
      const ta = document.getElementById('oik-affirm-edit');
      if (ta) synth.olumlama = ta.value;
      const id = nisanBtn.dataset.nisan;
      synth.nisan = synth.nisan === id ? null : id;
      render();
      return;
    }
    if (act === 'seal') {
      const ta = document.getElementById('oik-affirm-edit');
      if (ta && synth) synth.olumlama = ta.value.trim();
      _commitCard(synth, base);
      S._oik._justSealed = true;   // hub'da bir kez kart nabzı (K5)
      st.step = 6; render();
      return;
    }
  });

  overlay.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.classList?.contains('oik-input')) {
      e.preventDefault(); _commitInput(e.target.dataset.cat);
    }
  });

  function _commitInput(cat) {
    const inp = overlay.querySelector(`.oik-input[data-cat="${cat}"]`);
    if (!inp) return;
    const val = inp.value.trim();
    if (val && _addEntry(draft, cat, val, 'user')) { inp.value = ''; render(); inp.blur(); }
  }

  render();
}

/* Kartı koleksiyona mühürle (yeni ya da yeniden-tasarım). */
function _commitCard(card, base) {
  if (!card) return;
  const now = NOW();
  card.updated_at = now; card.sealed_at = now;
  card.state = 'active';
  if (base) {                                     // yeniden tasarım — eskiyi arşivle
    base.state = 'archived'; base.updated_at = now;
    oikSave(base);
  }
  if (!Array.isArray(S._oik.cards)) S._oik.cards = [];
  S._oik.cards.push(card);
  S._oik.activeCardId = card.id;
  S._oik.seedHint = null;
  oikSave(card);
  _syncLegacyMirror();
  try { window.imEvent?.('gecis_karti'); } catch (_) {}   // Kimlik Motoru olay defteri (13l)
  // Kimlik Üçgeninin Nabzı (İç Çalışma 07 rev.2 · boşluk D): lapis köşe
  // ancak kart 'active' olduğunda doğar — tasarım töreninin açılışı değil,
  // mührü sayılır. `base` doluysa bu bir YENİDEN tasarımdır: eski kart
  // arşive gitti, gezgin olmak istediği kişiyi bir kez daha yazdı.
  try {
    window.wtLogKimlik?.('oik-dogus', {
      kaynak: base ? 'yeniden' : 'ilk',
      n: CAT_KEYS.reduce((s, k) => s + ((card[k] || []).length), 0),
    });
  } catch (_) {}
  loadOikView();
  // Kart yokken vurulmuş hedef mühürleri şimdi bu karta işlenir — kullanıcı
  // Kişiler'de "böyle biri olmak istiyorum" dediyse o seçim beklemiştir.
  oikDrainAbsorbQueue().then(n => { if (n) loadOikView(); });
}

/* LLM ko-tasarım — kullanıcı maddelerini rafine eder (10A _llmJSON kalıbı). */
async function _oikDesignLLM(draft, gaze) {
  const cat = k => (draft[k] || []).map(_asText).filter(Boolean).join(' · ') || '—';
  const portre = (S._portre?.confirmed && S._portre?.baslik)
    ? `Kullanıcı kendini "${S._portre.baslik}" olarak tanıyor (şu anki hâli).` : '';
  const seedTxt = [
    gaze ? `O KİŞİNİN GÖZÜNDEN (kullanıcı yazdı): "${String(gaze).slice(0, 500)}"` : '',
    `Düşünceler: ${cat('dusunceler')}`,
    `İnançlar: ${cat('inanclar')}`,
    `Duygular: ${cat('duygular')}`,
    `Davranışlar: ${cat('davranislar')}`,
    portre,
  ].filter(Boolean).join('\n');

  const controller = new AbortController();
  const ms = 22000;
  const timer = setTimeout(() => { try { controller.abort(); } catch (_) {} }, ms);
  try {
    const raw = await Promise.race([
      callLLM({
        contents: [{ role: 'user', parts: [{ text: p('prompt.oik.design', { seed: seedTxt }) }] }],
        systemPrompt: '', maxTokens: 900, temperature: 0.6, jsonMode: true,
        model: SUMMARY_MODEL, skipPersona: true, signal: controller.signal,
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('oik-timeout')), ms)),
    ]);
    const obj = JSON.parse(raw);
    return _normalizeDesign(obj, draft);
  } finally { clearTimeout(timer); try { controller.abort(); } catch (_) {} }
}

/* LLM çıktısını karta indir; kullanıcının kendi maddeleri korunur (birleşim). */
export function _normalizeDesign(obj, draft) {
  const card = draft || emptyCard('tasarim');
  const arr = a => (Array.isArray(a) ? a : []).map(s => String(s || '').trim().slice(0, 200)).filter(s => s.length >= 2).slice(0, 6);
  card.baslik = String(obj?.baslik || card.baslik || t('oik.fallback.name')).slice(0, 60);
  card.whisper = String(obj?.whisper || card.whisper || '').slice(0, 140);
  CAT_KEYS.forEach(k => { arr(obj?.[k]).forEach(txt => _addEntry(card, k, txt, 'emre')); });
  card.olumlama = String(obj?.olumlama || card.olumlama || _composeOlumlama(card)).slice(0, 1200);
  card.olumlama_duygu = String(obj?.olumlama_duygu || card.olumlama_duygu || '').slice(0, 200);
  return card;
}

/* Fallback — kullanıcının kendi satırları aynen kart olur (LLM erişilemezse). */
export function _oikDesignFallback(draft, gaze) {
  const card = draft || emptyCard('tasarim');
  if (!card.baslik) card.baslik = String(gaze || '').slice(0, 60) || t('oik.fallback.name');
  if (!card.olumlama) card.olumlama = _composeOlumlama(card);
  return card;
}

/* ══════════════════════════════════════════════════════════════
   KRİSTALLEŞME EŞİKLERİ — Elmas "sıcaklık ve basınç altında oluşur"
   (10j Geçiş Alanı'ndan taşındı; eşikler + tören aynen korundu)
══════════════════════════════════════════════════════════════ */
const CRYSTAL_TIERS = [
  { at: 0,   glyph: '·' },
  { at: 50,  glyph: '◦' },
  { at: 150, glyph: '◆' },
  { at: 350, glyph: '◈' },
  { at: 700, glyph: '✦' },
];
const _crystalName = i => t('oik.crystal.' + i + '.name');
const _crystalDesc = i => t('oik.crystal.' + i + '.desc');

export function oikCrystalTierIndex(elmas = getElmasSayisi()) {
  let idx = 0;
  for (let i = 0; i < CRYSTAL_TIERS.length; i++) if (elmas >= CRYSTAL_TIERS[i].at) idx = i;
  return idx;
}

export function oikCrystalProgress(elmas = getElmasSayisi()) {
  const idx = oikCrystalTierIndex(elmas);
  const cur = CRYSTAL_TIERS[idx], next = CRYSTAL_TIERS[idx + 1];
  const tier = { at: cur.at, glyph: cur.glyph, name: _crystalName(idx), desc: _crystalDesc(idx) };
  if (!next) return { tier, idx, next: null, pct: 100 };
  const span = next.at - cur.at;
  const pct = Math.min(100, Math.round(((elmas - cur.at) / span) * 100));
  return { tier, idx, next, pct };
}

export function oikCheckCrystal() {
  const idx = oikCrystalTierIndex();
  const o = S._oik;
  if (idx > (o.crystalMilestone || 0)) {
    o.crystalMilestone = idx;
    oikSave();
    try { showGraduation(`${CRYSTAL_TIERS[idx].glyph} ${_crystalName(idx)}`, _crystalDesc(idx)); } catch (_) {}
  }
}
const _checkCrystalMilestone = oikCheckCrystal;   // iç ad korundu

/* ══════════════════════════════════════════════════════════════
   OKUMA RİTÜELİ — Sabah & Gece (sesli oku + ses kaydı + hayal et)
   Geçiş Protokolü: her sabah + her gece; öncesinde SES KAYDI yap ve
   dinle; okurken o kişinin GÖZLERİNİN İÇİNDEN bak (yazı #151).
══════════════════════════════════════════════════════════════ */
function _currentSlot() {
  const h = new Date().getHours();
  return h >= 18 || h < 5 ? 'gece' : 'sabah';
}

let _mediaRecorder = null, _recChunks = [], _recStream = null, _lastBlobURL = null, _recStartTs = 0;
let _readPortalEl = null;
let _readOpenTs = 0;   // huninin başlangıç anı — mühürsüz kapanış "birakti" sayılır

function _readingHTML(card, slot, lines) {
  const slotLabel = slot === 'sabah' ? t('oik.read.slot_morning') : t('oik.read.slot_night');
  const lineHTML = lines.map((l, i) => `<div class="oik-read-line" style="--i:${i};">${esc(l)}</div>`).join('');
  const feel = (card.duygular || []).map(_asText).filter(Boolean).join(' · ') || '—';
  const act = (card.davranislar || []).map(_asText).filter(Boolean).join(' · ') || '—';
  return `
    <div class="oik-kicker">${esc(slotLabel)}</div>
    <div class="oik-rp-name">${esc(oikCardName())}</div>
    <div class="oik-rp-epitet">${esc(card.baslik || '')}</div>
    <div class="oik-rp-emre"><em>${esc(t('oik.read.emre'))}</em></div>
    <div class="oik-rp-lines ikv-panel ikv-cascade">${lineHTML}</div>
    <div class="oik-read-remind">
      <span class="oik-read-remind-cat">${esc(_catLabel('duygular'))}:</span> ${esc(feel)}<br>
      <span class="oik-read-remind-cat">${esc(_catLabel('davranislar'))}:</span> ${esc(act)}
    </div>
    <div class="oik-rec">
      <button class="oik-rec-btn" id="oik-rec-btn" onclick="oikToggleRecord()">
        <span class="oik-rec-dot" aria-hidden="true"></span><span class="oik-rec-label">${esc(t('oik.record'))}</span>
      </button>
      <button class="ikv-ghost-btn" id="oik-play-btn" onclick="oikPlayRecording()" style="display:none;">${esc(t('oik.read.listen'))}</button>
      <button class="ikv-ghost-btn" id="oik-delete-btn" onclick="oikDeleteRecording()" style="display:none;">${esc(t('oik.recording_delete', 'KAYDI SİL'))}</button>
      <div class="oik-rec-status" id="oik-rec-status"></div>
      <div class="oik-rec-status">${esc(t('oik.rec.local_only', 'Bu kayıt yalnız bu cihazda kalır — sunucuya gönderilmez.'))}</div>
      <audio id="oik-audio" style="display:none;"></audio>
    </div>
    <div class="oik-read-play-emre"><em>${esc(t('oik.play_emre'))}</em></div>
    <div class="oik-read-status">
      <span id="oik-status-sabah"></span>
      <span id="oik-status-gece"></span>
      <span id="oik-status-streak" class="oik-streak"></span>
    </div>
    <div class="oik-nav">
      <button class="ikv-ghost-btn" onclick="oikCloseReading()">${esc(t('oik.read.close'))}</button>
      <button class="ikv-seal-btn" onclick="oikCompleteReading()">${esc(t('oik.read.seal'))}</button>
    </div>`;
}

export async function oikOpenReading() {
  const card = _getActiveCard();
  if (!card) { showToast(t('oik.toast.create_first')); oikOpenDesign(); return; }
  try { window.switchView?.('oik'); } catch (_) {}
  if (_readPortalEl) return;   // zaten açık
  const slot = _currentSlot();
  const lines = [card.olumlama, ...(card.inanclar || []).map(_asText)].filter(Boolean);
  const portal = document.createElement('div');
  portal.id = 'oik-read-portal';
  portal.className = `oik-rp--${slot}`;
  portal.innerHTML = `
    <div class="oik-rp-sky" aria-hidden="true"></div>
    <div class="oik-rp-grain" aria-hidden="true"></div>
    <button type="button" class="oik-rp-close" onclick="oikCloseReading()" aria-label="${esc(t('oik.read.close'))}">✕</button>
    <div class="oik-rp-scroll">
      <div class="oik-rp-body">${_readingHTML(card, slot, lines)}</div>
    </div>`;
  document.body.appendChild(portal);
  _readPortalEl = portal;
  requestAnimationFrame(() => portal.classList.add('oik-rp-in'));
  _resetRecUI();
  const rec = await idbGetRecording(`oik_${card.id}`).catch(() => null);
  const playBtn = document.getElementById('oik-play-btn');
  if (playBtn) playBtn.style.display = rec ? '' : 'none';
  const deleteBtn = document.getElementById('oik-delete-btn');
  if (deleteBtn) deleteBtn.style.display = rec ? '' : 'none';
  _updateReadingStatus();

  // Ritüel hunisi (İç Çalışma 07 rev.2 · boşluk D): bugün o slot ZATEN
  // mühürlüyse huni açılmaz — tekrar bakmak yeni bir deneme değildir, ve
  // sayılırsa kapanışta haksız bir "birakti" doğar.
  const _log = (S._oik && S._oik.readingLog) || {};
  const _bugun = TODAY();
  const _zatenMuhurlu = (slot === 'sabah' && _log.lastMorning === _bugun) ||
                        (slot === 'gece'  && _log.lastNight   === _bugun);
  if (!_zatenMuhurlu) {
    _readOpenTs = Date.now();
    try { window.wtLogRitus?.('oik-okuma', 'basladi', { adim: slot === 'sabah' ? 1 : 2 }); } catch (_) {}
  }
}

export function oikCloseReading() {
  _stopRecording(true);
  if (!_readPortalEl) return;
  // Mühürsüz kapanış terktir: kullanıcı okumaya başladı, sonuna gitmedi.
  // `_readOpenTs` mühür anında sıfırlandığı için tamamlanan seans burada
  // ikinci kez sayılmaz (çift sayım yasağı).
  if (_readOpenTs) {
    try {
      window.wtLogRitus?.('oik-okuma', 'birakti', {
        adim:   _currentSlot() === 'sabah' ? 1 : 2,
        sureMs: Date.now() - _readOpenTs,
      });
    } catch (_) {}
    _readOpenTs = 0;
  }
  const el = _readPortalEl;
  _readPortalEl = null;
  el.classList.remove('oik-rp-in');
  el.classList.add('oik-rp-out');
  setTimeout(() => { el.remove(); loadOikView(); }, 460);
}

function _resetRecUI() {
  const recBtn = document.getElementById('oik-rec-btn');
  if (recBtn) { recBtn.classList.remove('recording'); const l = recBtn.querySelector('.oik-rec-label'); if (l) l.textContent = t('oik.record'); }
  const statusEl = document.getElementById('oik-rec-status');
  if (statusEl) statusEl.textContent = '';
}

export async function oikToggleRecord() {
  if (_mediaRecorder && _mediaRecorder.state === 'recording') { _stopRecording(false); return; }
  const card = _getActiveCard();
  if (!card) return;
  const statusEl = document.getElementById('oik-rec-status');
  try {
    _recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _recChunks = [];
    _mediaRecorder = new MediaRecorder(_recStream);
    _recStartTs = Date.now();
    _mediaRecorder.ondataavailable = e => { if (e.data?.size) _recChunks.push(e.data); };
    _mediaRecorder.onstop = async () => {
      const blob = new Blob(_recChunks, { type: _mediaRecorder?.mimeType || 'audio/webm' });
      _recChunks = [];
      _stopStream();
      if (blob.size > 0) {
        const duration = Math.round((Date.now() - _recStartTs) / 1000);
        await idbSaveRecording(`oik_${card.id}`, blob, { user_id: S.currentUser?.id, duration }).catch(() => {});
        card.has_recording = true;
        oikSave(card);
        const playBtn = document.getElementById('oik-play-btn');
        if (playBtn) playBtn.style.display = '';
        const deleteBtn = document.getElementById('oik-delete-btn');
        if (deleteBtn) deleteBtn.style.display = '';
        if (statusEl) statusEl.textContent = t('oik.recorded').replace('{n}', duration);
      }
    };
    _mediaRecorder.start();
    const recBtn = document.getElementById('oik-rec-btn');
    if (recBtn) { recBtn.classList.add('recording'); const l = recBtn.querySelector('.oik-rec-label'); if (l) l.textContent = t('oik.stop_record'); }
    if (statusEl) statusEl.textContent = t('oik.recording');
  } catch (e) {
    console.warn('oikToggleRecord:', e?.message);
    if (statusEl) statusEl.textContent = t('oik.no_mic');
  }
}

function _stopRecording(silent) {
  try {
    if (_mediaRecorder && _mediaRecorder.state === 'recording') {
      if (silent) _mediaRecorder.onstop = () => { _stopStream(); };
      _mediaRecorder.stop();
    } else { _stopStream(); }
  } catch (_) { _stopStream(); }
  const recBtn = document.getElementById('oik-rec-btn');
  if (recBtn) { recBtn.classList.remove('recording'); const l = recBtn.querySelector('.oik-rec-label'); if (l) l.textContent = t('oik.record'); }
}

function _stopStream() {
  try { _recStream?.getTracks().forEach(trk => trk.stop()); } catch (_) {}
  _recStream = null; _mediaRecorder = null;
}

export async function oikPlayRecording() {
  const card = _getActiveCard();
  if (!card) return;
  const rec = await idbGetRecording(`oik_${card.id}`).catch(() => null);
  if (!rec?.blob) { showToast(t('oik.no_recording')); return; }
  const audio = document.getElementById('oik-audio');
  if (!audio) return;
  if (_lastBlobURL) { try { URL.revokeObjectURL(_lastBlobURL); } catch (_) {} }
  _lastBlobURL = URL.createObjectURL(rec.blob);
  audio.src = _lastBlobURL;
  audio.play().catch(() => {});
}

/* Kayıtlı sesi sil — idbDeleteRecording zaten altyapıda vardı, hiçbir UI
   çağırmıyordu (Geçiş Motoru F6 keşfi). Kullanıcı beğenmediği bir kaydı
   silip yeniden kaydedebilsin diye okuma portalına bağlandı. */
export async function oikDeleteRecording() {
  const card = _getActiveCard();
  if (!card) return;
  try { await idbDeleteRecording(`oik_${card.id}`); } catch (_) {}
  card.has_recording = false;
  oikSave(card);
  const playBtn = document.getElementById('oik-play-btn');
  if (playBtn) playBtn.style.display = 'none';
  const deleteBtn = document.getElementById('oik-delete-btn');
  if (deleteBtn) deleteBtn.style.display = 'none';
  showToast(t('oik.recording_deleted', 'Kayıt silindi.'));
}

/* Bu okumayı mühürle — slot tamamlandı, elmas + seri (10j gaCompleteReading ikizi). */
export function oikCompleteReading() {
  _stopRecording(true);
  const log = S._oik.readingLog;
  const today = TODAY();
  const slot = _currentSlot();

  const already = (slot === 'sabah' && log.lastMorning === today) ||
                  (slot === 'gece' && log.lastNight === today);
  if (already) {
    showToast(slot === 'sabah' ? t('oik.already_morning') : t('oik.already_night'));
    _updateReadingStatus();
    return;
  }

  if (slot === 'sabah') log.lastMorning = today; else log.lastNight = today;
  log.totalReadings = (log.totalReadings || 0) + 1;

  let award = 4;
  let msg = slot === 'sabah' ? t('oik.sealed_morning') : t('oik.sealed_night');
  let dayDone = false;

  // İki okuma da bugün tamamlandıysa: tam-gün mührü + seri + bonus
  if (log.lastMorning === today && log.lastNight === today && log.lastDayKey !== today) {
    const yesterday = localISODate(new Date(Date.now() - 86400000));
    log.streak = (log.lastDayKey === yesterday) ? (log.streak || 0) + 1 : 1;
    log.lastDayKey = today;
    award += 8;
    msg = t('oik.ritual_done').replace('{n}', log.streak);
    dayDone = true;
  }

  awardElmas(award, 'gecis');
  recordActivityDay();                          // merkezî seriyi besle (ritüel-seri bütünlüğü)
  try { window.usCheckHayalDay?.(); } catch (_) {}   // Hayal Mührü serisini besle
  oikSave();
  _checkCrystalMilestone();
  _updateReadingStatus();
  _flashStrike(dayDone);
  // Damgayı teslim eden basar (§6.10): "tamam" ancak mühür gerçekten
  // vurulduğunda yazılır — yukarıdaki `already` dalı buraya hiç düşmez.
  // adim: 1=sabah · 2=gece · 3=günün tamamı (iki okuma da bitti).
  try {
    window.wtLogRitus?.('oik-okuma', 'tamam', {
      adim:   dayDone ? 3 : (slot === 'sabah' ? 1 : 2),
      sureMs: _readOpenTs ? Date.now() - _readOpenTs : 0,
      n:      dayDone ? (log.streak || 0) : 0,
    });
  } catch (_) {}
  _readOpenTs = 0;
  showToast(t('oik.award').replace('{n}', award).replace('{msg}', msg));
}

/* Vuruş anı — altın flaş her mühürde; iki okuma da bittiyse günün geçişi anı. */
function _flashStrike(dayDone) {
  const portal = _readPortalEl;
  if (!portal) return;
  const flash = document.createElement('div');
  flash.className = 'oik-rp-flash';
  flash.setAttribute('aria-hidden', 'true');
  portal.appendChild(flash);
  flash.addEventListener('animationend', () => flash.remove(), { once: true });

  if (!dayDone) return;
  const day = document.createElement('div');
  day.className = 'oik-rp-day';
  day.innerHTML = `<div class="oik-kicker oik-kicker--gold">${esc(t('oik.seal.kicker'))}</div>
    <div class="oik-rp-day-text"><em>${esc(t('oik.read.day_sealed'))}</em></div>`;
  portal.appendChild(day);
  setTimeout(() => day.remove(), 2200);
}

function _updateReadingStatus() {
  const log = S._oik.readingLog;
  const today = TODAY();
  const sabahDone = log.lastMorning === today;
  const geceDone = log.lastNight === today;
  const sEl = document.getElementById('oik-status-sabah');
  const gEl = document.getElementById('oik-status-gece');
  if (sEl) { sEl.textContent = (sabahDone ? '✓ ' : '○ ') + t('oik.morning'); sEl.classList.toggle('done', sabahDone); }
  if (gEl) { gEl.textContent = (geceDone ? '✓ ' : '○ ') + t('oik.night'); gEl.classList.toggle('done', geceDone); }
  const stEl = document.getElementById('oik-status-streak');
  if (stEl) stEl.textContent = (log.streak || 0) > 0 ? t('oik.streak_days').replace('{n}', log.streak) : '';
}

/* ── TDZ-güvenli global erişim ─────────────────────────────────────── */
if (typeof window !== 'undefined') {
  window.oikGetCard    = oikGetCard;
  window.oikCardName   = oikCardName;         // "Niyet Alınan [Ad]" — 10f/02d okur
  window.oikGetDesired = oikGetDesired;
  window.oikGetContext = oikGetContext;
  window.oikGetStats   = oikGetStats;
  window.oikCardRefs   = oikCardRefs;        // Mesafe Motoru (13x) erdemleri buradan okur
  window.oikAddMadde   = oikAddMadde;
  window.oikAbsorbCard = oikAbsorbCard;      // hedef mührü → lapis besleme (10q)
  window.oikResynth    = oikResynth;         // niyet dalgası → kartın yüzü tazelenir
  window.oikReleaseCard = oikReleaseCard;    // mühür sökülünce ref'li maddeleri çek
  window.oikActiveNisan = oikActiveNisan;
  window.oikSeedDraft  = oikSeedDraft;
  window.oikInit       = oikInit;
  window.oikSave       = oikSave;
  window.oikLoad       = oikLoad;
  window.loadOikView       = loadOikView;
  window.oikRenderHub      = oikRenderHub;
  window.oikOpenDim        = oikOpenDim;         // Eşik köprüsü (02d) → boyut penceresi
  window.oikOpenDimPanel   = oikOpenDimPanel;    // hub paneli → boyutun tamamı
  window.oikCloseDimPanel  = oikCloseDimPanel;
  window.oikOpenDesign     = oikOpenDesign;
  window.oikOpenReading    = oikOpenReading;
  window.oikCloseReading   = oikCloseReading;
  window.oikCompleteReading = oikCompleteReading;
  window.oikToggleRecord   = oikToggleRecord;
  window.oikPlayRecording  = oikPlayRecording;
  window.oikDeleteRecording = oikDeleteRecording;
  window.oikCheckCrystal   = oikCheckCrystal;
}
