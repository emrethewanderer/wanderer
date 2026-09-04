/* ═══════════════════════════════════════════════════════════════════
   09d — ÖRÜNTÜ MOTORU · "Gördüğün şey sensin"
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Kitabın tanı retoriği ("X yapıyorsun çünkü Y") veriyle konuşmalı.
     Bu motor kullanıcının haftasını üç sesle aynaya koyar:
       KANIT  — kendi sözleriyle, verbatim alıntı
       TEŞHİS — kitabın çerçevesi (6 Perde / 6 Zehir / 7 Tuzak)
       YOL    — uygulamadaki gerçek bir ritüele derin bağlantı
     Altın = olan (örüntü) · lapis = yol (çözüm).

   ÜÇ KATMAN:
     1) SİNYAL DEFTERİ (bu dosya, deterministik): gün satırları + hafta
        agregaları. Seans buharlaşmadan (P2/P3 yalnız chat-çıkışında
        kaydedilir) kimsenin toplamadığı sinyalleri kalıcılaştırır.
     2) HAFTALIK DAMITMA (LLM, 13i meclis kalıbıyla tembel): defter +
        sohbet kanıtı + ENGELLER kataloğu → yapılandırılmış örüntüler.
        Başarıda user_patterns'e 'pme_weekly_' satırı yazar → mevcut
        loadSessionPatterns okuyucusu (01) SIFIR değişiklikle canlanır.
     3) SUNUM: Pattern modu beslemesi (01 · 8b bölümü), Örüntü Aynası
        paneli (İÇ DÜNYA), Gün Özeti satırı, geri-çağrı/push ithafı.

   Kalıcılık: SafeStorage `etw_oruntu_motoru_v1_<uid>` (user_analytics
     KV'sine otomatik senkron → reset/delete listeleri değişmeden kapsar).
   Konvansiyon: kimse bu modülü import etmez — tüm girişler window.om*
     (06/01/10/13o, TDZ-güvenli). Prompt metinleri p() (16b, admin'den
     düzenlenebilir); UI metinleri t() (15b, TR+EN).
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { sb, SUMMARY_MODEL } from '../config.js';
import { SafeStorage, localISODate, localDayKey, getActivityDays, escapeHTML } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { p, dpTest } from './16-i18n-prompts.js';
import { callLLM } from './04-llm-hero-history.js';
import { getModeEffectivenessScores } from './00-config-tracking.js';
import { kokenAlinti, kokenSozBlok, kokenAlintiCoz, kokenKullaniciMesajlari } from './13y-koken.js';

/* ── sabitler: defter tavanları — KV satırı küçük kalsın ── */
const DAYS_CAP = 60;
const WEEKS_CAP = 12;
const QUOTES_PER_DAY = 2;
const QUOTE_MAX_LEN = 120;
const SESSIONS_PER_DAY = 8;   // _h iç haritası (idempotent hasat) tavanı

/* ── damıtma sabitleri ── */
const DISTILL_MAX_PATTERNS = 4;
/* NOT (2026-08-02): burada `DISTILL_GUVEN_MIN = 0.55` vardı. Bu dosyada
   ZATEN gerçek bir kapı var — alıntı kapısı. Güven filtresi onun üstüne
   binen ikinci ve SAHTE bir kapıydı: alıntısı doğrulanmış, kullanıcının
   kendi cümlesine dayanan bir örüntüyü, modelin kendi yazdığı `0.4`
   yüzünden düşürüyordu. "Ara sıra doğruyu düşürmek" tam olarak budur. */
const DISTILL_TRIES_PER_DAY = 2;  // 429/parse hatasında günü hammering'den koru
const DISTILL_MIN_MSGS = 5;       // asgari sinyal — boş haftada LLM'i yakma
const EVIDENCE_MAX_QUOTES = 12;
const HISTORY_CAP = 8;            // önceki haftaların damıtmaları
/** Çözüm reçetesi enum'u → Ayna derin bağlantıları (FAZ 3) bu adları çözer. */
const COZUM_RITUELS = ['konusma', 'degerlendirme', 'meclis', 'gecis_okuma', 'benim_kartim', 'sefer'];

const OM_KEY = (uid) => `etw_oruntu_motoru_v1_${uid}`;

let _omInited = false;
let _om = null;
let _saveTimer = null;

/* ════════════════════════════════════════════════════════════════════
   DURUM + KALICILIK
════════════════════════════════════════════════════════════════════ */
function omDefault() {
  return {
    v: 1,
    ledger: { days: [], weeks: [] },
    distill: { lastWeek: null, attempts: { day: null, count: 0 }, current: null, history: [], cozulmus: [] },
    ui: { lastSeenWeek: null, teaserCount: 0 },
  };
}

function omState() {
  if (!_om) _om = omDefault();
  return _om;
}

function _omLoad() {
  const uid = S.currentUser?.id;
  if (!uid) return;
  try {
    const data = SafeStorage.get(OM_KEY(uid), null);
    if (data && typeof data === 'object' && data.v === 1) {
      _om = Object.assign(omDefault(), data);
      // Bozuk depoya tolerans: iskelet alanları güvence altına al
      if (!_om.ledger || typeof _om.ledger !== 'object') _om.ledger = { days: [], weeks: [] };
      if (!Array.isArray(_om.ledger.days)) _om.ledger.days = [];
      if (!Array.isArray(_om.ledger.weeks)) _om.ledger.weeks = [];
      if (!_om.distill || typeof _om.distill !== 'object') _om.distill = omDefault().distill;
      if (!Array.isArray(_om.distill.history)) _om.distill.history = [];
      if (!Array.isArray(_om.distill.cozulmus)) _om.distill.cozulmus = [];
    }
  } catch (e) { console.warn('omLoad:', e?.message); }
}

function _omSaveNow() {
  try {
    const uid = S.currentUser?.id;
    if (!uid || !_om) return;
    _om.ledger.days = _om.ledger.days.slice(-DAYS_CAP);
    _om.ledger.weeks = _om.ledger.weeks.slice(-WEEKS_CAP);
    SafeStorage.set(OM_KEY(uid), _om);
  } catch (_) {}
}

function omSave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => { _saveTimer = null; _omSaveNow(); }, 500);
}

/* Sekme gizlenirken bekleyen debounce varsa hemen yaz — 02c/00f kalıbı
   (iOS/Capacitor'da güvenilir tek sinyal hidden'dır; timer'ı sıfırlamak
   çift-kayıt penceresini kapatır). */
let _lifecycleFlushInstalled = false;
function _installLifecycleFlush() {
  if (_lifecycleFlushInstalled || typeof document === 'undefined') return;
  _lifecycleFlushInstalled = true;
  const flush = () => {
    if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; _omSaveNow(); }
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  window.addEventListener('pagehide', flush);
}

/* ── ISO hafta anahtarı (13i _weekKey ile aynı kural — Pzt başlar) ── */
export function omWeekKey(d) {
  const x = d ? new Date(d) : new Date();
  const t = new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const day = (t.getDay() + 6) % 7; // Pzt=0
  t.setDate(t.getDate() - day + 3); // haftanın Perşembe'si
  const jan4 = new Date(t.getFullYear(), 0, 4);
  const week = 1 + Math.round(((t - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
  return `${t.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Haftanın Pazartesi'si (yerel gece yarısı) — hafta içi gün turları için. */
function _weekMonday(d) {
  const x = d ? new Date(d) : new Date();
  const t = new Date(x.getFullYear(), x.getMonth(), x.getDate());
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7));
  return t;
}

/* ════════════════════════════════════════════════════════════════════
   GÜN SATIRI — seans hasadı (06 requestChatExit → window.omSessionHarvest)
════════════════════════════════════════════════════════════════════ */
function _dayRow(dstr) {
  const st = omState();
  let row = st.ledger.days.find((r) => r.d === dstr);
  if (!row) {
    row = { d: dstr, mood: null, userMsgs: 0, avoidance: 0, consecAvoid: 0, defenses: {}, modeHints: {}, quotes: [], _h: {} };
    st.ledger.days.push(row);
    st.ledger.days.sort((a, b) => (a.d < b.d ? -1 : 1));
  }
  if (!row._h || typeof row._h !== 'object') row._h = {};
  return row;
}

/** Bugünün duygusal anlarından ortalama yoğunluk (1-5) — idempotent. */
function _todayMood(today) {
  try {
    const moments = (S._emotionalChain || []).filter((m) => {
      if (!m?.date) return false;
      const d = new Date(m.date);
      return !isNaN(d) && localISODate(d) === today;
    });
    if (!moments.length) return null;
    const sum = moments.reduce((a, m) => a + (Number(m.intensity) || 0), 0);
    return Math.round((sum / moments.length) * 10) / 10;
  } catch (_) { return null; }
}

/** dp() regex listesine güvenli isabet testi — büyük-İ normalize'i dpTest
 *  üzerinden gelir (FAZ 2c: kendi kopyasını yazmak yeni bir ikiz açardı). */
function _hits(dpKey, text) {
  try { return dpTest(dpKey, text); } catch (_) { return false; }
}

/** Bu seansın kullanıcı cümlelerinden kanıt alıntıları (≤2/gün, ≤120 kr). */
function _mineQuotes(row) {
  const msgs = (S.chatHistory || []).filter((m) => m.role === 'user' && typeof m.content === 'string');
  for (const m of msgs) {
    if (row.quotes.length >= QUOTES_PER_DAY) break;
    const text = m.content.trim();
    if (text.length < 12) continue; // tek kelimelik mesaj kanıt taşımaz
    let tip = null;
    if (_hits('detect.pattern_awareness', text)) tip = 'awareness';
    else if (_hits('detect.avoidance', text)) tip = 'avoid';
    if (!tip) continue;
    const q = text.slice(0, QUOTE_MAX_LEN);
    if (row.quotes.some((x) => x.q === q)) continue; // aynı cümleyi iki kez alma
    row.quotes.push({ t: tip, q });
  }
}

/* ════════════════════════════════════════════════════════════════════
   TANIMA MOTORU — GEZİNME (FAZ 1, İ1+İ7): örtük mikro-sinyal hasadı.
   00f-kullanim-nabzi.js bu seans boyunca S._oturumIzi'yi doldurur (ekran
   girişleri, kart-detay açılışları, <1.5sn skipler, sonuç bildiren
   törenler); burada bugünün satırına _h[sessId] kalıbıyla İDEMPOTENT
   biner — aynı seans yeniden hasat edilirse çift saymaz, en güncel
   anlık görüntü yazılır (mevcut userMsgs/avoidance ile aynı disiplin).
════════════════════════════════════════════════════════════════════ */
function _gezinmeSnapshot() {
  const oi = S._oturumIzi || {};
  const ekran = {};
  (oi.ekranlar || []).forEach((e) => { if (e && e.ekran) ekran[e.ekran] = (ekran[e.ekran] || 0) + 1; });
  const kart = {};
  (oi.kartlar || []).forEach((k) => { if (k && k.id) kart[k.id] = (kart[k.id] || 0) + 1; });
  const toren = {};
  (oi.torenler || []).forEach((tr) => {
    if (!tr || !tr.ad || (tr.sonuc !== 'muhur' && tr.sonuc !== 'kapat')) return;
    toren[tr.ad] = toren[tr.ad] || { muhur: 0, kapat: 0 };
    toren[tr.ad][tr.sonuc]++;
  });
  return { ekran, kart, skip: (oi.skipler || []).length, toren };
}

/** counts nesnesinde en sık geçen anahtar (kart id'si) — eşitlikte ilk
 *  görülen kazanır (deterministik: Object.entries sırası ekleniş sırasıdır). */
function _mostFrequent(counts) {
  let best = null, bestN = 0;
  Object.entries(counts || {}).forEach(([k, n]) => { if (n > bestN) { best = k; bestN = n; } });
  return best;
}

function _recomputeGezinme(row) {
  const acc = { ekran: {}, kart: {}, skip: 0, toren: {} };
  Object.values(row._h).forEach((h) => {
    const g = h && h.gezinme;
    if (!g) return;
    Object.entries(g.ekran || {}).forEach(([k, n]) => { acc.ekran[k] = (acc.ekran[k] || 0) + n; });
    Object.entries(g.kart || {}).forEach(([k, n]) => { acc.kart[k] = (acc.kart[k] || 0) + n; });
    acc.skip += g.skip || 0;
    Object.entries(g.toren || {}).forEach(([ad, ob]) => {
      acc.toren[ad] = acc.toren[ad] || { muhur: 0, kapat: 0 };
      acc.toren[ad].muhur += ob.muhur || 0;
      acc.toren[ad].kapat += ob.kapat || 0;
    });
  });
  row.gezinme = { ekran: acc.ekran, kart: acc.kart, skip: acc.skip, enCokKart: _mostFrequent(acc.kart), toren: acc.toren };
}

/**
 * Seans kapanışında bugünün satırını güncelle. Aynı seans için tekrar
 * çağrılmak İDEMPOTENT: seans katkıları _h[sessId]'de tutulur, gün
 * toplamları her seferinde _h'den yeniden hesaplanır (çift sayım yok).
 */
export function omSessionHarvest() {
  if (!_omInited || !S.currentUser?.id) return;
  try {
    const today = localISODate();
    const row = _dayRow(today);
    const sessId = S.currentSessId || 'anon';

    const userMsgCount = (S.chatHistory || []).filter((m) => m.role === 'user').length;
    row._h[sessId] = {
      msgs: userMsgCount,
      avoid: Number(S.avoidanceCount) || 0,
      consec: Number(S.consecutiveAvoidance) || 0,
      modes: {},
    };
    (S._modeHistory || []).forEach((mode) => {
      if (typeof mode !== 'string') return;
      row._h[sessId].modes[mode] = (row._h[sessId].modes[mode] || 0) + 1;
    });
    // Tanıma Motoru (FAZ 1) — bu seansın örtük mikro-sinyal izi (00f'in
    // biriktirdiği S._oturumIzi) aynı _h[sessId] anlık görüntüsüne biner.
    row._h[sessId].gezinme = _gezinmeSnapshot();

    // _h tavanı: günde en fazla 8 seans izi (en eskiler düşer)
    const sessKeys = Object.keys(row._h);
    if (sessKeys.length > SESSIONS_PER_DAY) {
      sessKeys.slice(0, sessKeys.length - SESSIONS_PER_DAY).forEach((k) => delete row._h[k]);
    }

    // Gün toplamları = _h katkılarının toplamı (yeniden hesap → idempotent)
    row.userMsgs = 0; row.avoidance = 0; row.consecAvoid = 0; row.modeHints = {};
    Object.values(row._h).forEach((h) => {
      row.userMsgs += h.msgs || 0;
      row.avoidance += h.avoid || 0;
      row.consecAvoid = Math.max(row.consecAvoid, h.consec || 0);
      Object.entries(h.modes || {}).forEach(([k, v]) => { row.modeHints[k] = (row.modeHints[k] || 0) + v; });
    });
    _recomputeGezinme(row);

    row.mood = _todayMood(today);

    // Savunma mekanizmaları: kümülatif sayaçların anlık fotoğrafı (top 5).
    // Seans deltası çıkarmak kırılgan — damıtma için mutlak sayı yeterli.
    try {
      const defs = (S._personalityMap?.defense_mechanisms || [])
        .slice().sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 5);
      row.defenses = {};
      defs.forEach((d) => { if (d?.type) row.defenses[d.type] = d.count || 0; });
    } catch (_) {}

    _mineQuotes(row);
    omSave();
  } catch (e) { console.warn('omSessionHarvest:', e?.message); }
}

/* ════════════════════════════════════════════════════════════════════
   NEGATİF DEFTER + KAPALI DÖNGÜ (Tanıma Motoru FAZ 2, İ2+İ3) — bugünün
   satırına DOĞRUDAN yazılır. `_h[sessId]` snapshot kalıbı kümülatif S
   sayaçlarını (avoidance vb.) yeniden türetmek için var; burada her
   çağrı tek bir GERÇEK kullanıcı eylemidir (bir GEÇ tıklaması, bir
   gösterim, bir davet sonucu) — snapshot'a değil doğrudan artışa/dedup'a
   ihtiyaç var, ikisi de kendiliğinden idempotenttir.
════════════════════════════════════════════════════════════════════ */
function _negRow() {
  const row = _dayRow(localISODate());
  if (!row.neg || typeof row.neg !== 'object') row.neg = { arac: {}, gosterim: {} };
  if (!row.neg.arac || typeof row.neg.arac !== 'object') row.neg.arac = {};
  if (!row.neg.gosterim || typeof row.neg.gosterim !== 'object') row.neg.gosterim = {};
  return row;
}

/** Araç önerisi çipinde "GEÇ" — 13a aracDismiss çağırır. */
export function omKaydetAracGec(tool) {
  if (!_omInited || !S.currentUser?.id || !tool) return;
  try {
    const row = _negRow();
    row.neg.arac[tool] = (row.neg.arac[tool] || 0) + 1;
    omSave();
  } catch (e) { console.warn('omKaydetAracGec:', e?.message); }
}

/** Bir kart bugün spotlight/Emre bloğu/Bugünün Kişisi'nde gösterildi —
 *  günde 1 kayıt (aynı tür+kart aynı gün tekrar düşmez, "tepkisiz" varsayımıyla
 *  başlar). 10q loadKisilerView render anında çağırır. */
export function omKaydetGosterim(tur, kartId) {
  if (!_omInited || !S.currentUser?.id || !tur || !kartId) return;
  try {
    const row = _negRow();
    if (!row.neg.gosterim[tur] || typeof row.neg.gosterim[tur] !== 'object') row.neg.gosterim[tur] = {};
    if (!(kartId in row.neg.gosterim[tur])) row.neg.gosterim[tur][kartId] = false;
    omSave();
  } catch (e) { console.warn('omKaydetGosterim:', e?.message); }
}

/** Bugün gösterilmiş bir kart açıldı (kkOpenDetail çağırır) — o kart artık
 *  hangi rafta gösterilmiş olursa olsun tepkisiz sayılmaz. */
export function omKaydetTepki(kartId) {
  if (!_omInited || !S.currentUser?.id || !kartId) return;
  try {
    const row = _negRow();
    let degisti = false;
    Object.values(row.neg.gosterim).forEach((bucket) => {
      if (bucket && kartId in bucket && bucket[kartId] !== true) { bucket[kartId] = true; degisti = true; }
    });
    if (degisti) omSave();
  } catch (e) { console.warn('omKaydetTepki:', e?.message); }
}

/** Geri Çağrı balonu (13o) sonrası kapalı döngü ölçümü — bir sonraki
 *  kullanıcı mesajı ≤10 dk içinde geldiyse 'cevap', geçtiyse 'sessiz'. */
export function omKaydetDavetSonuc(sonuc) {
  if (!_omInited || !S.currentUser?.id || (sonuc !== 'cevap' && sonuc !== 'sessiz')) return;
  try {
    const row = _dayRow(localISODate());
    if (!row.davet || typeof row.davet !== 'object') row.davet = { cevap: 0, sessiz: 0 };
    row.davet[sonuc] = (row.davet[sonuc] || 0) + 1;
    omSave();
  } catch (e) { console.warn('omKaydetDavetSonuc:', e?.message); }
}

/** Tanıma Motoru (FAZ 5) — bugünün satırının OKUMA yüzeyi. "Kimse bu
 *  modülü import etmez" kuralı (bkz. dosya başı) girdi TOPLAYICILAR için
 *  de geçerli: 09i-secici.js `secGirdiTopla` bu getter'ı `window.*`
 *  üzerinden çağırır, 09d'yi import etmez. `_dayRow` gibi satırı
 *  YARATMAZ — bugün hiç hasat edilmediyse `null` döner (secGirdiTopla
 *  eksik alanı 0/"az önce" sayar, kanıt kapısını etkilemez). Döndürülen
 *  nesne bir KOPYADIR: çağıran alanları okur, iç defteri mutasyona
 *  UĞRATAMAZ — tek yazan kalır (_dayRow'un kendisi). */
export function omGunSatiri() {
  if (!_omInited || !S.currentUser?.id) return null;
  try {
    const today = localISODate();
    const row = omState().ledger.days.find((r) => r.d === today);
    if (!row) return null;
    return JSON.parse(JSON.stringify({
      gezinme: row.gezinme || null,
      neg: row.neg || null,
      davet: row.davet || null,
    }));
  } catch (_) { return null; }
}

/* ════════════════════════════════════════════════════════════════════
   HAFTA AGREGASYONU — açılışta biten haftaları mühürle
════════════════════════════════════════════════════════════════════ */
/** Kimlik Motoru olay defterinden (13l) hafta içi olay sayıları.
 *  Defter S._kimlik.ledger'da hidre — 13l'e import kenarı gerekmez. */
function _kimlikWeekCounts(wk) {
  const counts = {};
  try {
    (S._kimlik?.ledger || []).forEach((ev) => {
      if (!ev?.t || !ev.type) return;
      if (omWeekKey(new Date(ev.t)) !== wk) return;
      counts[ev.type] = (counts[ev.type] || 0) + 1;
    });
  } catch (_) {}
  return counts;
}

/** Haftanın 7 gününden aktivite defterinde (00a) olmayanlar → boşluklar. */
function _weekGaps(monday) {
  const gaps = [];
  try {
    const active = new Set(getActivityDays());
    const today = new Date(); today.setHours(23, 59, 59);
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      if (d > today) break; // gelecek gün boşluk sayılmaz
      if (!active.has(localDayKey(d))) gaps.push(localISODate(d));
    }
  } catch (_) {}
  return gaps;
}

function _aggregateWeek(wk, monday) {
  const st = omState();
  const ev = _kimlikWeekCounts(wk);
  const given = ev.soz_verildi || 0;
  const kept = ev.soz_tutuldu || 0;

  // O haftanın gün satırları → ruh hali eğrisi (Pzt=0 … Paz=6)
  const moodByDay = Array(7).fill(null);
  st.ledger.days.forEach((row) => {
    const d = new Date(row.d + 'T12:00:00'); // öğlen: DST/parse kaymalarına karşı
    if (isNaN(d) || omWeekKey(d) !== wk) return;
    moodByDay[(d.getDay() + 6) % 7] = row.mood;
  });

  // Tetik dizileri: bu haftaya düşenlerin "öncül→duygu" sıklığı (top 3)
  const seqTally = {};
  try {
    (S._predictionModel?.trigger_sequences || []).forEach((s) => {
      if (!s?.date || !s.antecedent) return;
      const d = new Date(s.date);
      if (isNaN(d) || omWeekKey(d) !== wk) return;
      const key = `${s.antecedent}→${s.consequent || '?'}`;
      seqTally[key] = (seqTally[key] || 0) + 1;
    });
  } catch (_) {}
  const triggerSeqTop = Object.entries(seqTally)
    .sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([k, n]) => `${k}×${n}`);

  // Açık döngüler: hâlâ kapanmamış olayların yaşı (en eski 5)
  const openLoopsAging = [];
  try {
    (S._lifeMemory?.openLoops || []).forEach((l) => {
      if (l?.status !== 'open' || !l.created) return;
      const days = Math.floor((Date.now() - new Date(l.created).getTime()) / 86400000);
      if (days > 0) openLoopsAging.push({ event: String(l.event || l.text || '').slice(0, 60), days });
    });
    openLoopsAging.sort((a, b) => b.days - a.days).splice(5);
  } catch (_) {}

  // Erdem fotoğrafı (13l) + önceki haftaya göre fark
  let virtue = null, virtueDelta = null;
  try {
    virtue = window.imVirtueNow?.() || null;
    const prev = st.ledger.weeks[st.ledger.weeks.length - 1];
    if (virtue && prev?.virtue) {
      virtueDelta = {};
      Object.keys(virtue).forEach((k) => {
        const dlt = (virtue[k] || 0) - (prev.virtue[k] || 0);
        if (Math.abs(dlt) >= 3) virtueDelta[k] = dlt; // gürültüyü değil kaymayı kaydet
      });
    }
  } catch (_) {}

  return {
    wk,
    pledges: { given, kept, broken: Math.max(0, given - kept) },
    rituals: {
      seals: ev.gun_muhru || 0,
      readings: ev.gecis_okuma || 0,
      reviews: ev.degerlendirme || 0,
      selfTalk: ev.kendinle_konusma || 0,
      hayal: ev.hayal_sahnesi || 0,
      kanit: ev.davranis_kaniti || 0,
    },
    gaps: _weekGaps(monday),
    virtue, virtueDelta,
    moodByDay, triggerSeqTop, openLoopsAging,
  };
}

/**
 * Açılış turu: biten ISO haftalarını mühürle + eski gün satırlarının
 * _h iç haritasını düşür (KV küçük kalsın). İdempotent — her açılışta
 * güvenle çağrılır; yavaş cihazda eksik kalan alanlar sonraki açılışta
 * tamamlanır.
 */
export function omDailyRollup() {
  if (!_omInited || !S.currentUser?.id) return;
  try {
    const st = omState();
    const today = localISODate();
    const thisWeek = omWeekKey();

    // Dünün ve öncesinin _h izleri artık büyümez → at
    st.ledger.days.forEach((row) => { if (row.d < today && row._h) delete row._h; });

    // Gün satırlarında görülen ama henüz mühürlenmemiş BİTMİŞ haftalar
    const sealed = new Set(st.ledger.weeks.map((w) => w.wk));
    const candidates = new Map(); // wk → Pazartesi
    st.ledger.days.forEach((row) => {
      const d = new Date(row.d + 'T12:00:00');
      if (isNaN(d)) return;
      const wk = omWeekKey(d);
      if (wk !== thisWeek && !sealed.has(wk)) candidates.set(wk, _weekMonday(d));
    });
    // Gün satırı hiç yoksa bile geçen haftayı mühürle (kimlik/aktivite
    // defterleri sohbetsiz haftada da sinyal taşır)
    const lastMon = _weekMonday(); lastMon.setDate(lastMon.getDate() - 7);
    const lastWk = omWeekKey(lastMon);
    if (lastWk !== thisWeek && !sealed.has(lastWk)) candidates.set(lastWk, lastMon);

    [...candidates.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .forEach(([wk, monday]) => { st.ledger.weeks.push(_aggregateWeek(wk, monday)); });

    if (candidates.size) omSave();
  } catch (e) { console.warn('omDailyRollup:', e?.message); }
}

/* ════════════════════════════════════════════════════════════════════
   HAFTALIK DAMITMA — sinyal defteri + sohbet kanıtı + kitap kataloğu → LLM
   (13i meclis kalıbı: tembel, haftada bir; edge fn yok, cron yok)
════════════════════════════════════════════════════════════════════ */
let _distillBusy = false;

/** Son 7 günün kullanıcı mesajları (S.allSessions init'te hidre — DB sorgusu yok).
 *  Tanım 13y'ye taşındı: "kullanıcı gerçekte ne dedi" sorusunun tek bir cevabı
 *  olmalı — alıntı kapısı da aynı havuzu ölçüyor. */
function _recentUserMsgs(days = 7) {
  return kokenKullaniciMesajlari(days);
}

/** Kanıt alıntıları: farkındalık/kaçınma isabetleri öncelikli, gün etiketli
 *  ve NUMARALI. Numara (`[S1]`) modelin kanıtı yazmak yerine göstermesini
 *  sağlar; kırpma ve referans haritası 13y'nin kokenSozBlok'undan gelir —
 *  ikinci bir "söz bloğu" tanımı yazmak, kapının iki ayrı gerçeği olması
 *  demekti. Gün/tip etiketleri 09d'ye özgü olduğu için satırlar burada
 *  bezenir, ama metnin kendisi motorun kestiği metindir. */
function _chatEvidence() {
  const msgs = _recentUserMsgs();
  const scored = msgs.map((m) => {
    let tip = null;
    const text = m.text.trim();
    if (text.length >= 12) {
      if (_hits('detect.pattern_awareness', text)) tip = 'awareness';
      else if (_hits('detect.avoidance', text)) tip = 'avoid';
    }
    return { ...m, tip };
  });
  const pick = [
    ...scored.filter((m) => m.tip === 'awareness'),
    ...scored.filter((m) => m.tip === 'avoid'),
    ...scored.filter((m) => !m.tip && m.text.length > 60), // uzun mesaj = bağlam taşır
  ].slice(0, EVIDENCE_MAX_QUOTES);
  const { harita } = kokenSozBlok(pick.map((m) => m.text),
    { max: EVIDENCE_MAX_QUOTES, maxLen: QUOTE_MAX_LEN });
  const lines = pick.map((m, i) =>
    `[S${i + 1} · ${localISODate(new Date(m.ts))}${m.tip ? ' · ' + m.tip : ''}] "${harita[`S${i + 1}`] || ''}"`);
  return { lines, harita, msgCount: msgs.length };
}

/** Defter özeti — LLM'e giden kompakt metin (≤ ~1500 karakter hedefi). */
function _ledgerDigest() {
  const st = omState();
  const parts = [];
  const lastWeeks = st.ledger.weeks.slice(-3);
  lastWeeks.forEach((w) => {
    const seq = w.triggerSeqTop?.length ? ` tetikler: ${w.triggerSeqTop.join(', ')}` : '';
    const gaps = w.gaps?.length ? ` boş günler: ${w.gaps.length}` : '';
    const vd = w.virtueDelta && Object.keys(w.virtueDelta).length
      ? ` erdem kayması: ${Object.entries(w.virtueDelta).map(([k, v]) => `${k}${v > 0 ? '+' : ''}${v}`).join(', ')}` : '';
    parts.push(`${w.wk}: söz ${w.pledges.kept}/${w.pledges.given} tutuldu · ritüel(mühür ${w.rituals.seals}, okuma ${w.rituals.readings}, değerlendirme ${w.rituals.reviews}, öz-diyalog ${w.rituals.selfTalk})${gaps}${seq}${vd}`);
    if (w.openLoopsAging?.length) {
      parts.push(`  açık döngüler: ${w.openLoopsAging.map((l) => `${l.event} (${l.days} gün)`).join('; ')}`);
    }
  });
  const cutoff = localISODate(new Date(Date.now() - 7 * 86400000));
  st.ledger.days.filter((r) => r.d >= cutoff).forEach((r) => {
    const modes = Object.entries(r.modeHints || {}).map(([k, v]) => `${k}×${v}`).join(',');
    const defs = Object.entries(r.defenses || {}).map(([k, v]) => `${k}×${v}`).join(',');
    parts.push(`${r.d}: mesaj ${r.userMsgs}, kaçınma ${r.avoidance}${r.mood != null ? `, yoğunluk ${r.mood}` : ''}${modes ? `, mod ${modes}` : ''}${defs ? `, savunma ${defs}` : ''}`);
    (r.quotes || []).forEach((q) => parts.push(`  "${q.q}" (${q.t})`));
  });

  // Mod etkililiği (FAZ 4, mod-sistemi.md): modeHints yalnız SIKLIĞI gösterir —
  // bu satır hangi modun kullanıcıda gerçekten İŞE YARADIĞINI ekler (09a P4:
  // sonraki mesajın uzunluğu/duygusu + açık geri bildirimden türetilen skor).
  // "Bu kullanıcıda hangi kapı açılıyor" sinyali — damıtma LLM'i buna göre
  // çözüm ritüeli/tonu seçebilir.
  try {
    const eff = getModeEffectivenessScores();
    const nonZero = Object.entries(eff).filter(([, v]) => v).sort((a, b) => b[1] - a[1]);
    if (nonZero.length) {
      parts.push(`mod etkililiği (+ işe yarıyor, - yaramıyor): ${nonZero.map(([k, v]) => `${k}${v > 0 ? '+' : ''}${v}`).join(', ')}`);
    }
  } catch (_) {}

  // Akşam niyetleri (13h) — "yarın X yapacağım" ile ertesi günün gerçeği
  // arasındaki açı, örüntünün en çıplak kanıtıdır (söz-eylem makası).
  try {
    const intents = S._aksamToreni?.intentions || {};
    const lines = Object.keys(intents).filter((d) => d >= cutoff).sort()
      .map((d) => `${d}: "${String(intents[d]).slice(0, 100)}"`);
    if (lines.length) parts.push('akşam niyetleri (ertesi günle kıyasla):\n  ' + lines.join('\n  '));
  } catch (_) {}

  // Yaşayan Portre çekirdeği (09e) — damıtma kullanıcının ana meselesini ve
  // yakalanmış çelişkilerini bilerek teşhis koysun (window.*, TDZ-güvenli).
  try {
    const yp = window.ypGetFullState?.();
    if (yp?.cekirdek?.mesele) parts.push(`portre · ana mesele: ${yp.cekirdek.mesele}`);
    if (yp?.celiskiler?.length) {
      parts.push(`portre · çelişkiler: ${yp.celiskiler.slice(0, 3).map((c) => c.metin).join('; ')}`);
    }
  } catch (_) {}

  return parts.join('\n').slice(0, 2600);
}

/** Önceki haftanın örüntüleri — süreklilik için LLM'e verilen liste.
 *  Sönenler de eklenir ki LLM "geçen hafta vardı, bu hafta yok" durumunu
 *  İLERLEME olarak onurlandırabilsin. */
function _prevPatternsDigest() {
  const st = omState();
  const parts = [];
  (st.distill.current?.patterns || []).forEach((pt) => {
    parts.push(`- ${pt.baslik} [${pt.tip}${pt.hafta_sayisi > 1 ? ` · ${pt.hafta_sayisi} haftadır` : ''}]${pt.kitap ? ` (${pt.kitap.itemId})` : ''}`);
  });
  (st.distill.cozulmus || []).slice(-3).forEach((c) => {
    parts.push(`- SÖNDÜ: ${c.baslik} (${c.hafta_sayisi} hafta sürmüştü, ${c.sondu_wk}'de görünmedi)`);
  });
  return parts.join('\n');
}

/* ════════════════════════════════════════════════════════════════════
   ÖRÜNTÜ YAŞAM DÖNGÜSÜ — haftalar arası kimlik
   Bir örüntü tek haftalık fotoğraf değil, izlenen bir izdir: aynı kök
   (kitap teşhisi ya da normalize başlık) sonraki hafta yine damıtılırsa
   hafta_sayisi artar ("3 haftadır tekrarlıyor"); damıtılmazsa SÖNER —
   ve sönüş, kitabın diliyle bir ilerleme kanıtıdır.
════════════════════════════════════════════════════════════════════ */
const COZULMUS_CAP = 6;

/** Örüntünün haftalar-arası kimliği: kitap teşhisi varsa o (en sağlam),
 *  yoksa normalize başlık. LLM'e "süren örüntüde başlığı koru" kuralı
 *  distill_system'de verilir — kok bu sözleşmenin güvenlik ağıdır. */
export function _kokOf(pt) {
  if (pt?.kitap?.itemId) return 'k:' + pt.kitap.itemId;
  return 'b:' + String(pt?.baslik || '')
    .toLocaleLowerCase('tr')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(/\s+/).slice(0, 4).join('-');
}

/**
 * Yeni damıtmayı önceki haftalarla eşle:
 *  - süren örüntü → hafta_sayisi = önceki + 1, ilk_wk korunur
 *  - yeni örüntü  → hafta_sayisi = 1, ilk_wk = bu hafta
 *  - sönen örüntü → önceki current'ta ≥2 haftadır süren ama bu hafta
 *    görünmeyen (ilerleme tipi hariç) → cozulmus listesine düşer.
 * Saf fonksiyon — test edilebilirlik için dışa açık (_önekli, 09a kalıbı).
 */
export function _applyLifecycle(parsed, prevCurrent, wk) {
  const prevByKok = new Map();
  (prevCurrent?.patterns || []).forEach((pt) => { prevByKok.set(_kokOf(pt), pt); });

  const newKoks = new Set();
  parsed.patterns.forEach((pt) => {
    const kok = _kokOf(pt);
    newKoks.add(kok);
    const prev = prevByKok.get(kok);
    pt.kok = kok;
    pt.hafta_sayisi = prev ? (prev.hafta_sayisi || 1) + 1 : 1;
    pt.ilk_wk = prev?.ilk_wk || wk;
  });

  // Sönenler: ilerleme örüntüsü "sönmez" (zaten kutlamadır); tek haftalık
  // örüntünün kaybolması gürültü olabilir — ≥2 hafta sürmüş olan anlamlıdır.
  const cozulmus = [];
  (prevCurrent?.patterns || []).forEach((pt) => {
    if (pt.tip === 'ilerleme') return;
    if ((pt.hafta_sayisi || 1) < 2) return;
    if (newKoks.has(_kokOf(pt))) return;
    cozulmus.push({ kok: _kokOf(pt), baslik: pt.baslik, hafta_sayisi: pt.hafta_sayisi || 1, sondu_wk: wk });
  });
  return cozulmus;
}

/** GERÇEKLİK TEMİZLİĞİ (13y · tek seferlik göç) — kanıtı kullanıcının
 *  cümlelerine bağlanamayan örüntüleri hem güncel damıtmadan hem geçmişten
 *  siler. Kapı canlı üretimdekiyle aynı fonksiyondur (kokenAlinti). */
export function omKokenTemizlik(sozler) {
  const rapor = { oruntu: 0 };
  try {
    const st = omState();
    const suz = (arr) => (arr || []).filter((pt) => {
      if (pt && kokenAlinti(pt.kanit, sozler)) return true;
      rapor.oruntu++;
      return false;
    });
    if (st.distill?.current) st.distill.current.patterns = suz(st.distill.current.patterns);
    if (Array.isArray(st.distill?.history)) {
      st.distill.history = st.distill.history.map((h) => (h ? { ...h, patterns: suz(h.patterns) } : h));
    }
    if (rapor.oruntu) omSave();
  } catch (_) {}
  return rapor;
}

/** LLM çıktısını doğrula/buda — sapmayı aynaya taşıma.
 *  `harita` modelin gördüğü NUMARALI söz bloğudur (`{S1: '…'}`), `sozler`
 *  ham cümlelerin tamamı. Model kanıtı `kanit_ref` ile gösterir; hiçbir
 *  yoldan gerçek bir cümleye bağlanamayan örüntü DÜŞER. Buranın kapısı
 *  artık bir orana değil, eşleşmeye bakar (13y · kokenAlintiCoz). */
function _parseDistill(raw, validIds, sozler, harita) {
  let obj = null;
  try { obj = JSON.parse(raw); } catch (_) {
    // jsonMode'a rağmen sarmalanmış yanıt — ilk {...} bloğunu dene (06 kalıbı)
    try { const m = String(raw).match(/\{[\s\S]*\}/); if (m) obj = JSON.parse(m[0]); } catch (_) {}
  }
  if (!obj || typeof obj !== 'object') return null;
  const ozet = typeof obj.ozet === 'string' ? obj.ozet.trim().slice(0, 400) : '';
  const patterns = (Array.isArray(obj.patterns) ? obj.patterns : [])
    .map((pt, i) => {
      if (!pt || typeof pt !== 'object') return null;
      const baslik = String(pt.baslik || '').trim().slice(0, 60);
      if (!baslik) return null;
      /* Alıntı kapısı: kullanıcının ağzından çıkmamış bir "kanıt" aynaya
         taşınmaz — kullanıcı onu kendi cümlesi sanır, bu en ağır yalandır.
         Model `kanit_ref` ile gösterir, metni kaynaktan biz keseriz. */
      const coz = kokenAlintiCoz(pt.kanit_ref, pt.kanit, harita, sozler);
      if (!coz) return null;
      const kanit = coz.alinti;
      const tip = ['dongu', 'tetik', 'kacinma', 'direnc', 'ilerleme'].includes(pt.tip) ? pt.tip : 'dongu';
      let kitap = null;
      if (pt.kitap && typeof pt.kitap === 'object' && validIds.has(pt.kitap.itemId)) {
        kitap = { framework: String(pt.kitap.framework || ''), itemId: pt.kitap.itemId };
      }
      const rituel = COZUM_RITUELS.includes(pt.cozum?.rituel) ? pt.cozum.rituel : 'konusma';
      const neden = String(pt.cozum?.neden || '').trim().slice(0, 160);
      return { id: `om-${Date.now()}-${i}`, tip, baslik, kanit, kitap, cozum: { rituel, neden } };
    })
    .filter(Boolean)
    .slice(0, DISTILL_MAX_PATTERNS);
  if (!ozet && !patterns.length) return null;
  return { ozet, patterns };
}

/** Mevcut loadSessionPatterns okuyucusunun (01) beklediği satırı yaz.
 *  Okuyucuya DOKUNULMAZ — 'pme_weekly_' öneki korunan sözleşmedir. */
async function _upsertPmeRow(wk, ozet) {
  try {
    const uid = S.currentUser?.id;
    if (!uid || !sb || !ozet) return;
    const cutoff = localISODate(new Date(Date.now() - 7 * 86400000));
    const weekAvoid = omState().ledger.days
      .filter((r) => r.d >= cutoff)
      .reduce((a, r) => a + (r.avoidance || 0), 0);
    const { error } = await sb.from('user_patterns').upsert([{
      user_id: uid,
      session_id: `pme_weekly_${wk}`,
      avoidance_count: weekAvoid,
      pattern_note: ozet,
      created_at: new Date().toISOString(),
    }], { onConflict: 'session_id' });
    if (error) console.warn('om pme kaydı (tablo yoksa normal):', error.message);
  } catch (_) {}
}

/** Haftada bir: defteri + kanıtı + kitap kataloğunu damıt. Başarısızlıkta
 *  lastWeek İŞARETLENMEZ (bir sonraki açılış yeniden dener, günde en çok 2). */
export async function omMaybeDistill() {
  if (!_omInited || !S.currentUser?.id || _distillBusy) return;
  const st = omState();
  const wk = omWeekKey();
  if (st.distill.lastWeek === wk) return;

  const today = localISODate();
  if (st.distill.attempts.day !== today) st.distill.attempts = { day: today, count: 0 };
  if (st.distill.attempts.count >= DISTILL_TRIES_PER_DAY) return;

  const evidence = _chatEvidence();
  if (evidence.msgCount < DISTILL_MIN_MSGS) return; // sinyal yok — sessizce bekle

  _distillBusy = true;
  st.distill.attempts.count++;
  omSave();
  try {
    // Katalog: kitabın engel çerçeveleri (10h) — tembel import, oyun katmanına
    // statik kenar açmadan. name getter'ı t() üzerinden yerelleşir.
    const { ENGELLER } = await import('./10h-w2-library-challenges.js');
    const items = [...ENGELLER.perde, ...ENGELLER.zehir, ...ENGELLER.tuzak];
    const validIds = new Set(items.map((x) => x.id));
    const catalog = items.map((x) => `${x.id} | ${x.framework} | ${x.name}`).join('\n');

    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: p('prompt.oruntu.distill_user', {
        ledgerDigest: _ledgerDigest() || '-',
        chatEvidence: evidence.lines.join('\n') || '-',
        catalog,
        prevOzet: st.distill.current?.ozet || '-',
        prevPatterns: _prevPatternsDigest() || '-',
      }) }] }],
      systemPrompt: p('prompt.oruntu.distill_system'),
      maxTokens: 700, temperature: 0.2, jsonMode: true, model: SUMMARY_MODEL, skipPersona: true,
    });

    // LLM dönerken başka bir akış (paralel çağrı / diğer sekmenin senkronu)
    // haftayı mühürlemiş olabilir — üzerine yazma, sessizce çekil.
    if (st.distill.lastWeek === wk) return;

    const parsed = _parseDistill(raw, validIds, _recentUserMsgs().map((m) => m.text), evidence.harita);
    if (!parsed) { console.warn('omMaybeDistill: geçersiz LLM çıktısı'); return; }

    // Yaşam döngüsü: haftalar arası kimlik + sönen örüntüler (ilerleme kanıtı)
    const cozulmus = _applyLifecycle(parsed, st.distill.current, wk);

    if (st.distill.current) {
      st.distill.history.push(st.distill.current);
      st.distill.history = st.distill.history.slice(-HISTORY_CAP);
    }
    st.distill.current = { wk, ozet: parsed.ozet, patterns: parsed.patterns };
    // Geri dönen örüntü "sönen" listesinden düşer — ayna kendisiyle çelişmesin
    const activeKoks = new Set(parsed.patterns.map((pt) => pt.kok));
    st.distill.cozulmus = [...(st.distill.cozulmus || []).filter((c) => !activeKoks.has(c.kok)), ...cozulmus]
      .slice(-COZULMUS_CAP);
    st.distill.lastWeek = wk; // YALNIZ başarıda
    if (parsed.ozet) S.sessionPatternSummary = parsed.ozet;
    omSave();
    _upsertPmeRow(wk, parsed.ozet);
    try { omRefreshRoomSub(); } catch (_) {}
  } catch (e) {
    // 429 (err.quota) dahil — sessiz: kullanıcıya duvar yok, sonraki açılış dener
    console.warn('omMaybeDistill:', e?.message);
  } finally { _distillBusy = false; }
}

/* ════════════════════════════════════════════════════════════════════
   OKUYUCULAR — sunum katmanlarının tek kapısı
════════════════════════════════════════════════════════════════════ */
/** Bu haftanın damıtılmış örüntü sayısı (Ayna teaser + oda alt-satırı). */
export function omPatternCount() {
  try { return omState().distill.current?.patterns?.length || 0; } catch (_) { return 0; }
}

/** Pattern modu 8b bölümü: ilk n örüntü, kanıt + teşhis + yol tek satırda.
 *  Tekrar bilgisi ("3 haftadır") koçun elindeki en ağır kanıttır — eklenir;
 *  sönen örüntüler de kutlama malzemesi olarak tek satırda verilir. */
export function omGetTopPatterns(n = 3) {
  try {
    const st = omState();
    const pts = st.distill.current?.patterns || [];
    if (!pts.length) return null;
    const lines = pts.slice(0, n).map((pt) => {
      const teshis = pt.kitap ? `${pt.kitap.framework}: ${pt.kitap.itemId}` : '-';
      const tekrar = (pt.hafta_sayisi || 1) > 1 ? ` · ${pt.hafta_sayisi} HAFTADIR sürüyor` : '';
      return `• ${pt.baslik} [${pt.tip}${tekrar}] — kanıt: "${pt.kanit}" — teşhis: ${teshis} — yol: ${pt.cozum.rituel}${pt.cozum.neden ? ` (${pt.cozum.neden})` : ''}`;
    });
    (st.distill.cozulmus || []).slice(-2).forEach((c) => {
      lines.push(`• SÖNEN ÖRÜNTÜ (ilerleme — yeri gelirse kutla): ${c.baslik}, ${c.hafta_sayisi} hafta sürmüştü, artık görünmüyor`);
    });
    return lines.join('\n');
  } catch (_) { return null; }
}

/** SÖNEN ÖRÜNTÜLERİN ARŞİVİ — "artık sende olmayanlar".
 *
 *  UI-güvenli ham nesneler döner; `omGetTopPatterns`ın dokuduğu satır LLM'e
 *  yazılmış bir TALİMATTIR ("yeri gelirse kutla") ve bir UI ona bakamaz —
 *  `omGetDirencliOruntuler` ile aynı sözleşme, aynı tek kaynak.
 *
 *  Ayna paneli bugüne dek yalnız BU HAFTA sönenleri çiziyordu
 *  (`sondu_wk === curWk`): üç hafta önce kazanılmış bir savaş diskte duruyor,
 *  ekranda yoktu. Kullanıcının kazandığı savaşların listesi onun kanıtıdır.
 *  Sıra: en yeni sönen önce.
 *  @returns {{kok,baslik,hafta_sayisi,sondu_wk}[]} */
export function omCozulmusArsiv(n = COZULMUS_CAP) {
  try {
    return (omState().distill.cozulmus || [])
      .slice()
      .sort((a, b) => String(b.sondu_wk || '').localeCompare(String(a.sondu_wk || '')))
      .slice(0, n)
      .map(c => ({
        kok: c.kok,
        baslik: c.baslik || '',
        hafta_sayisi: c.hafta_sayisi || 1,
        sondu_wk: c.sondu_wk || null,
      }));
  } catch (_) { return []; }
}

/** Derin Çalışma'nın Kazanma Yöntemi tezgâhı (13A) için HAM örüntü nesneleri.
 *  `omGetTopPatterns` prompt için tek string dokur — bir UI ona bakamaz; ikinci
 *  bir okuma yolu açmak yerine aynı kaynağın ham hâli verilir (tek kaynak).
 *  Sıra hafta_sayisi'na göre azalan: kitabın "sürekli aynı sonucu alıyorsan"
 *  cümlesi en dirençli örüntüyü işaret eder, en yenisini değil.
 *  Kanıt alanı damıtmanın kendi `kanit`ıdır — Ayna panelinin gösterdiğiyle
 *  aynı veri, aynı köken temizliğinden (omKokenTemizlik) geçmiş hâli. */
export function omGetDirencliOruntuler(n = 3) {
  try {
    const pts = omState().distill.current?.patterns || [];
    return pts.slice()
      .sort((a, b) => (b.hafta_sayisi || 1) - (a.hafta_sayisi || 1))
      .slice(0, n)
      .map(pt => ({
        id: pt.id,
        baslik: pt.baslik || '',
        tip: pt.tip || '',
        kanit: pt.kanit || '',
        hafta_sayisi: pt.hafta_sayisi || 1,
      }));
  } catch (_) { return []; }
}

/** Geri Çağrı Motoru (13o) daveti için: en dirençli (en çok haftadır süren)
 *  örüntünün başlığına somut ithaf — davet en derin ize dokunsun. */
export function omGetGcLine() {
  try {
    const pts = omState().distill.current?.patterns || [];
    if (!pts.length) return null;
    const pt = pts.slice().sort((a, b) => (b.hafta_sayisi || 1) - (a.hafta_sayisi || 1))[0];
    if (!pt?.baslik) return null;
    return p('prompt.oruntu.gc_line', { baslik: pt.baslik });
  } catch (_) { return null; }
}

/** Taze damıtmanın İLK seansında bir kez tüketilen yumuşak davet ipucu.
 *  01 buildContextPrompt çağırır; haftada bir tetiklenir, dayatmaz. */
export function omConsumeFreshHint() {
  try {
    const st = omState();
    const cur = st.distill.current;
    if (!cur?.patterns?.length) return null;
    if (st.ui.hintWeek === cur.wk) return null; // bu hafta zaten verildi
    st.ui.hintWeek = cur.wk;
    omSave();
    return p('prompt.oruntu.fresh_hint', { baslik: cur.patterns[0].baslik });
  } catch (_) { return null; }
}

/* ════════════════════════════════════════════════════════════════════
   ÖRÜNTÜ AYNASI — İÇ DÜNYA odası + panel (FAZ 3)
   Tören portalı DEĞİL (--z-ceremony yok) — hs-overlay (13-extras) kalıbıyla
   aynı katman: basit modal, z-index 750, own css (oruntu.css).
════════════════════════════════════════════════════════════════════ */
let _engCache = null;
async function _engMap() {
  if (_engCache) return _engCache;
  try {
    const { ENGELLER } = await import('./10h-w2-library-challenges.js');
    const items = [...(ENGELLER.perde || []), ...(ENGELLER.zehir || []), ...(ENGELLER.tuzak || [])];
    _engCache = {};
    items.forEach((x) => { _engCache[x.id] = x; });
  } catch (_) { _engCache = {}; }
  return _engCache;
}

const _COZUM_LABELS = {
  konusma: () => t('om.rituel.konusma', 'Kendinle Konuş'),
  degerlendirme: () => t('om.rituel.degerlendirme', 'Değerlendir'),
  meclis: () => t('om.rituel.meclis', 'İç Meclis\'e Git'),
  gecis_okuma: () => t('om.rituel.gecis_okuma', 'Geçiş Okuması Yap'),
  benim_kartim: () => t('om.rituel.benim_kartim', 'Geçiş Kartıma Bak'),
  sefer: () => t('om.rituel.sefer', 'Sefere Çık'),
};

/** Çözüm reçetesi → gerçek ritüele derin bağlantı (window.*, TDZ-güvenli). */
function _cozumAction(pt, engMap) {
  const r = pt?.cozum?.rituel;
  switch (r) {
    case 'konusma':       return () => window.switchView?.('konusma');
    case 'degerlendirme': return () => window.switchView?.('degerlendirme');
    case 'meclis':        return () => window.switchView?.('hasimlar');
    case 'gecis_okuma':   return () => window.oikOpenReading?.();
    case 'benim_kartim':  return () => window.switchView?.('kk-mine');
    case 'sefer': {
      const bossId = pt?.kitap?.itemId ? engMap[pt.kitap.itemId]?.bossId : null;
      return () => (bossId ? window.startSeferForBoss?.(bossId) : window.switchView?.('kk-mine'));
    }
    default: return () => window.switchView?.('konusma');
  }
}

function _renderPatternCard(pt, engMap) {
  const tipLabel = t('om.tip.' + pt.tip, pt.tip);
  // Tekrar rozeti: ≥2 haftadır süren örüntü — aynanın en ağır cümlesi
  const tekrarBadge = (pt.hafta_sayisi || 1) > 1
    ? `<span class="om-tekrar">${escapeHTML(t('om.tekrar', '{n} haftadır').replace('{n}', pt.hafta_sayisi))}</span>`
    : '';
  const engItem = pt.kitap?.itemId ? engMap[pt.kitap.itemId] : null;
  const teshis = engItem
    ? `<div class="om-teshis"><span class="om-teshis-fw">${escapeHTML(pt.kitap.framework || '')}</span> ${escapeHTML(engItem.name || '')}
        ${engItem.panzehir ? `<span class="om-teshis-panzehir">— ${escapeHTML(engItem.panzehir)}</span>` : ''}</div>`
    : '';
  // Alfabe Işık çıpası (12e Faz 3): örüntüye yankılanan nişan, çözüm
  // ritüelinin görsel mührü olur — yazılıysa hakikatini hatırlatır,
  // yazılı değilse salona davet eder (nur kazanılır, dayatılmaz).
  let isikAnchor = '';
  try {
    const nis = window.isikMatchNisan?.(`${pt.baslik || ''} ${pt.kanit || ''} ${pt.cozum?.neden || ''}`);
    if (nis) {
      const yazili = !!window.isikIsWritten?.(nis.id);
      isikAnchor = `<button type="button" class="om-isik${yazili ? ' om-isik--yazili' : ''}" data-isik-id="${escapeHTML(nis.id)}">
        <span class="om-isik-icon" aria-hidden="true"><svg viewBox="0 0 100 100">${nis.icon}</svg></span>
        <span class="om-isik-txt">
          <span class="om-isik-kicker">${escapeHTML(yazili ? t('om.isik.yazili', 'ALFABENDEKİ NİŞAN') : t('om.isik.davet', 'BU FISILTININ NİŞANI VAR'))}</span>
          <span class="om-isik-line">${escapeHTML(yazili ? nis.hakikat : t('om.isik.davet_line', '{ad} — salonda seni bekliyor.').replace('{ad}', nis.ad))}</span>
        </span>
      </button>`;
    }
  } catch (_) {}
  return `<div class="om-pattern">
    <div class="om-pattern-tip">${escapeHTML(tipLabel)}${tekrarBadge}</div>
    <div class="om-pattern-title">${escapeHTML(pt.baslik)}</div>
    <div class="om-kanit">“${escapeHTML(pt.kanit)}”</div>
    ${teshis}
    ${isikAnchor}
    <div class="om-cozum">
      ${pt.cozum?.neden ? `<div class="om-cozum-neden">${escapeHTML(pt.cozum.neden)}</div>` : ''}
      <button type="button" class="om-cozum-btn" data-pt-id="${escapeHTML(pt.id)}">${escapeHTML((_COZUM_LABELS[pt.cozum?.rituel] || _COZUM_LABELS.konusma)())} →</button>
    </div>
  </div>`;
}

/** Paneli tek kapıdan kapat — telemetri segmenti (00f) tutarlı kapansın. */
function _ayClose(overlay) {
  try { window.wtOverlayClose?.('oruntu-ayna'); } catch (_) {}
  overlay?.remove();
}

/** Ayna panelini aç: premium → kanıt+teşhis+reçete; ücretsiz → sayılı teaser. */
export async function omOpenAyna() {
  if (document.getElementById('om-overlay')) return; // zaten açık
  const patterns = omState().distill.current?.patterns || [];
  try { window.wtOverlayOpen?.('oruntu-ayna'); } catch (_) {} // Kullanım Nabzı (00f)

  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.style.cssText = 'z-index:var(--z-overlay-ust);';
  overlay.id = 'om-overlay';
  overlay.innerHTML = `
    <div class="modal om-modal">
      <div class="om-head">
        <div class="om-kicker">${t('om.kicker', 'AYNAYA BAK')}</div>
        <div class="om-title">${t('om.title', 'Örüntülerin')}</div>
        <div class="om-epigraf">${t('om.epigraf', 'Gördüğün şey sensin. Mesele de bu.')}</div>
      </div>
      <div class="om-scroll" id="om-content"></div>
      <div class="om-foot">
        <button class="btn-outline-gold" style="flex:1;" id="om-close-btn">${t('om.close', 'Kapat')}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#om-close-btn')?.addEventListener('click', () => _ayClose(overlay));

  const content = overlay.querySelector('#om-content');
  if (!S.isPremium) {
    const n = patterns.length;
    content.innerHTML = `<div class="om-teaser">
      <div class="om-teaser-num">${n}</div>
      <div class="om-teaser-lock">🔒</div>
      <div class="om-teaser-text">${n
        ? t('om.teaser', '{n} örüntü tespit edildi — Ayna, Studio\'da seni bekliyor.').replace('{n}', n)
        : t('om.teaser_empty', 'Aynanın sırrı doluyor — birkaç gün daha konuş, örüntüler belirsin.')}</div>
      ${n ? `<button type="button" class="om-teaser-cta" id="om-teaser-cta">${t('om.teaser_cta', 'Aynayı Aç')}</button>` : ''}
    </div>`;
    content.querySelector('#om-teaser-cta')?.addEventListener('click', () => {
      _ayClose(overlay);
      try { window.showPremiumFeatureSpotlight?.('oruntu'); } catch (_) {}
    });
    return;
  }

  if (!patterns.length) {
    content.innerHTML = `<div class="om-empty">${t('om.empty', 'Henüz damıtılmış bir örüntü yok. Birkaç gün daha konuş — Emre haftalık aynayı hazırlasın.')}</div>`;
    return;
  }

  const engMap = await _engMap();
  // Sönen örüntüler — ≥2 hafta sürüp artık görünmeyenler: kitabın diliyle
  // birer zafer izi. Liste ARŞİVdir: eskiden yalnız `sondu_wk === curWk`
  // gösteriliyordu, yani üç hafta önce kazanılmış bir savaş diskte durup
  // ekrandan siliniyordu. Kullanıcının kazandığı savaşlar bir hafta sonra
  // yok sayılmaz — taze olanı yine de kendi cümlesiyle kutlanır.
  const curWk = omState().distill.current?.wk;
  const cozulmus = omCozulmusArsiv();
  const sonenHTML = cozulmus.length ? `
    <div class="om-sonen">
      <div class="om-sonen-tag">${escapeHTML(t('om.sonen_tag', 'ARTIK SENDE OLMAYANLAR'))}</div>
      ${cozulmus.map((c) => `<div class="om-sonen-row">
        <span class="om-sonen-glyph" aria-hidden="true">✦</span>
        <span class="om-sonen-txt">${escapeHTML(
          (c.sondu_wk === curWk
            ? t('om.sonen_line', '{baslik} — {n} hafta sürmüştü. Bu hafta aynada görünmedi.')
            : t('om.sonen_line_arsiv', '{baslik} — {n} hafta sürmüştü; artık görünmüyor.'))
          .replace('{baslik}', c.baslik).replace('{n}', c.hafta_sayisi))}</span>
      </div>`).join('')}
    </div>` : '';
  content.innerHTML = patterns.map((pt) => _renderPatternCard(pt, engMap)).join('') + sonenHTML;
  content.querySelectorAll('.om-cozum-btn').forEach((btn) => {
    const pt = patterns.find((x) => x.id === btn.dataset.ptId);
    if (!pt) return;
    btn.addEventListener('click', () => { _ayClose(overlay); try { _cozumAction(pt, engMap)(); } catch (_) {} });
  });
  // Nişan çıpası → Alfabe Işık mini töreni (12e)
  content.querySelectorAll('.om-isik').forEach((btn) => {
    btn.addEventListener('click', () => {
      _ayClose(overlay);
      try { window.isikOpenNisan?.(btn.dataset.isikId); } catch (_) {}
    });
  });

  // Bu haftanın örüntüsü görüldü — oda köşesindeki taze nokta söner
  try {
    const st = omState();
    if (st.ui.lastSeenWeek !== st.distill.current?.wk) {
      st.ui.lastSeenWeek = st.distill.current?.wk;
      omSave();
      omRefreshRoomSub();
    }
  } catch (_) {}
}

/** İÇ DÜNYA oda alt-satırı + taze nokta — wsSyncStudio (10) her Bugün
 *  girişinde çağırır; window köprüsüyle (TDZ-güvenli, 09d import edilmez). */
export function omRefreshRoomSub() {
  try {
    const st = omState();
    const sub = document.getElementById('studio-oruntu-sub');
    const pulse = document.getElementById('ws-om-pulse');
    const cur = st.distill.current;
    const n = cur?.patterns?.length || 0;
    const isFresh = !!cur && st.ui.lastSeenWeek !== cur.wk;
    if (sub) {
      sub.textContent = !cur
        ? t('studio.room.oruntu_sub', 'aynanın sırrı doluyor')
        : (isFresh
          ? t('om.sub_fresh', 'bu hafta bir örüntü belirdi')
          : (n ? t('om.sub_count', '{n} örüntü').replace('{n}', n) : t('studio.room.oruntu_sub', 'aynanın sırrı doluyor')));
    }
    if (pulse) pulse.classList.toggle('active', isFresh);
  } catch (_) {}
}

/* ════════════════════════════════════════════════════════════════════
   INIT — 03-auth-shell ready zinciri: imReady→omInit (13l'den sonra)
════════════════════════════════════════════════════════════════════ */
export function omInit() {
  if (_omInited || !S.currentUser?.id) return;
  _omLoad();
  _installLifecycleFlush();
  _omInited = true;
  omDailyRollup();

  // Çapraz-seans özetini SafeStorage'dan hidre et — loadSessionPatterns'in
  // limit(10) penceresinden bağımsız birincil yol (okuyucu fallback kalır).
  // omInit ready zincirinde okuyucudan sonra koşar → son yazan kazanır.
  try {
    const ozet = omState().distill.current?.ozet;
    if (ozet) S.sessionPatternSummary = ozet;
  } catch (_) {}

  // Haftalık damıtma — tembel tetik (13i kalıbı); await edilmez, UI bloklanmaz
  try { omMaybeDistill(); } catch (_) {}
}

/* ── window expose (06/01/10/13o buradan çağırır — import kenarı yok) ── */
if (typeof window !== 'undefined') {
  window.omInit = omInit;
  window.omSessionHarvest = omSessionHarvest;
  window.omDailyRollup = omDailyRollup;
  window.omMaybeDistill = omMaybeDistill;
  window.omPatternCount = omPatternCount;
  window.omKokenTemizlik = omKokenTemizlik;
  window.omGetTopPatterns = omGetTopPatterns;
  window.omGetDirencliOruntuler = omGetDirencliOruntuler;   // 13A Kazanma Yöntemi
  window.omCozulmusArsiv = omCozulmusArsiv;                 // "artık sende olmayanlar"
  window.omConsumeFreshHint = omConsumeFreshHint;
  window.omOpenAyna = omOpenAyna;
  window.omRefreshRoomSub = omRefreshRoomSub;
  window.omGetGcLine = omGetGcLine;
  // Tanıma Motoru FAZ 2 — negatif defter + kapalı döngü (13a/10q/13o çağırır)
  window.omKaydetAracGec = omKaydetAracGec;
  window.omKaydetGosterim = omKaydetGosterim;
  window.omKaydetTepki = omKaydetTepki;
  window.omKaydetDavetSonuc = omKaydetDavetSonuc;
  // Tanıma Motoru FAZ 5 — girdi toplayıcının (09i secGirdiTopla) okuma yüzeyi
  window.omGunSatiri = omGunSatiri;
}
