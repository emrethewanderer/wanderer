/* ═══════════════════════════════════════════════════════════════════
   09f — EPİZODİK HAFIZA · "Bunu daha önce de yaşamıştın"
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     09a/09e ne bildiğini biriktirir; bu motor NE ZAMAN yaşandığını
     hatırlar. Kullanıcı "yine aynı şey oldu" dediğinde motor gerçekten
     hangi günü, hangi cümleyi kastettiğini bulur — anahtar kelime
     eşleşmesi değil, ANLAM yakınlığı (pgvector cosine).

   MİMARİ: sunucuda pgvector (mig 034, user_memories + match_user_memories
     RPC) + llm-embed edge fn (artık kullanıcı kapsamında, kotalı).
     İstemci iki ucu birleştirir:
     • INGEST — gün özeti (12-w3-journey hook, günde 1) + yüksek-yoğunluk
       anlar (09a p2RecordEmotionalMoment hook, günde ≤10) embed edilip yazılır.
     • RECALL — mesaj gönderiminde SADECE "geçmişe atıf" sinyali olan
       metinlerde (_shouldRecall — buildSmartRagQuery'nin shouldRAG'ıyla aynı
       ruh: her mesajı embed etmek gereksiz maliyet+gecikme) embed + RPC
       top-3 (eşik 0.75) → <recalled_memories>. 800ms TAVAN: gecikirse
       sessizce boş döner, sohbeti ASLA bekletmez.
     • FALLBACK ZİNCİRİ: embed/RPC hatası ya da zaman aşımı →
       S._narrativeMemory üzerinde genelleştirilmiş konu-kelime skoru
       (p2FindSimilarEmotionalMoment deseninin basit hâli) → hâlâ yoksa boş.

   Kalıcılık: sunucu-taraflı (user_memories, mig 034 ELLE); istemci yalnız
     günlük ingest sayaçlarını + backfill imlecini SafeStorage'da tutar
     (`etw_eh_meta_<uid>`).
   Konvansiyon: kimse bu modülü import etmez — girişler window.eh*
     (06/09a/12, TDZ-güvenli). Prompt metinleri p() (16b); getEmbedding 07'den
     ödünç alınır (aynı edge fn, artık kullanıcı kapsamında).
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { sb } from '../config.js';
import { SafeStorage, localISODate } from './00a-infrastructure.js';
import { p } from './16-i18n-prompts.js';
import { getEmbedding } from './07-settings-knowledge.js';
import { detectTopics } from './00-config-tracking.js';

const EH_META_KEY = (uid) => `etw_eh_meta_${uid}`;

const RECALL_TIMEOUT_MS = 800;
const RECALL_THRESHOLD = 0.75;
const RECALL_COUNT = 3;
const MOMENT_INGEST_DAILY_CAP = 10;
const BACKFILL_BATCH = 10;

let _ehInited = false;
let _meta = null;

/* ════════════════════════════════════════════════════════════════════
   DURUM + KALICILIK
════════════════════════════════════════════════════════════════════ */
function _default() {
  return { lastIngestDay: null, momentCount: { day: null, n: 0 }, backfillCursor: 0, backfillDone: false };
}

function ehState() {
  if (!_meta) _meta = _default();
  return _meta;
}

function _ehLoad() {
  const uid = S.currentUser?.id;
  if (!uid) return;
  try {
    const data = SafeStorage.get(EH_META_KEY(uid), null);
    if (data && typeof data === 'object') {
      _meta = Object.assign(_default(), data);
      if (!_meta.momentCount || typeof _meta.momentCount !== 'object') _meta.momentCount = { day: null, n: 0 };
    }
  } catch (e) { console.warn('ehLoad:', e?.message); }
}

function ehSave() {
  try {
    const uid = S.currentUser?.id;
    if (!uid || !_meta) return;
    SafeStorage.set(EH_META_KEY(uid), _meta);
  } catch (_) {}
}

/* Hafıza Nabzı köprüsü (00f · İç Çalışma 02 boşluk A) — bu motorun canlı mı
   yoksa hep yerel fallback'te mi olduğu ancak ÖLÇÜLÜRSE görünür; şema ELLE iş
   olduğu için "sessizce çalışmıyor olma" hâli gerçek bir ihtimaldir. 00f
   yüklü değilse sessizce düşer (asla bloklama). Metin ASLA geçmez — yalnız
   tur, yol, süre, adet. */
function _nabiz(tur, yol, t0, sayi) {
  try { window.wtLogMemory?.(tur, { yol, ms: Date.now() - t0, sayi }); } catch (_) {}
}

/* ════════════════════════════════════════════════════════════════════
   INGEST — embed + yaz (mig 034 yoksa sessizce no-op)
════════════════════════════════════════════════════════════════════ */
async function _insertMemory(kind, content, meta) {
  const uid = S.currentUser?.id;
  const text = (content || '').trim();
  if (!uid || !sb || !text) return false;
  const t0 = Date.now();
  /* Nabızda backfill AYRI sayılır: tek seferlik dolgu, günlük akışla aynı
     kutuya girerse Gözlemevi'nde "motor çalışıyor" izlenimini geçmiş üretir. */
  const tur = meta?.backfill ? 'backfill' : 'ingest';
  try {
    const embedding = await getEmbedding(text.slice(0, 2000));
    const embStr = Array.isArray(embedding) ? JSON.stringify(embedding) : embedding;
    const { error } = await sb.from('user_memories').insert([{
      user_id: uid, kind, content: text.slice(0, 2000), meta: meta || {}, embedding: embStr,
    }]);
    // Beklenen durum (mig 034 yoksa) — warn prod'da düşer, bilinçli sessizlik.
    // Sessiz olan LOG'dur, ölçüm değil: nabız tam da bu hâli görünür kılmak için var.
    if (error) {
      console.warn('ehInsert (tablo yoksa normal, mig 034 ELLE):', error.message);
      _nabiz(tur, 'hata', t0, 0);
      return false;
    }
    _nabiz(tur, 'uzak', t0, 1);
    return true;
  } catch (e) { console.warn('ehInsert:', e?.message); _nabiz(tur, 'hata', t0, 0); return false; }
}

/** Gün özeti sonrası — 12-w3-journey w3GenerateDeepSummary başarı yolundan çağrılır. */
export async function ehIngestDay(dayKey, normalized) {
  if (!_ehInited || !S.currentUser?.id) return;
  const st = ehState();
  if (st.lastIngestDay === dayKey) return; // aynı gün iki kez embed edilmez
  const content = (normalized?.portrait || '').trim() ||
    [normalized?.theme, normalized?.insight, normalized?.pattern].filter(Boolean).join('. ');
  if (!content) return;
  const ok = await _insertMemory('day_summary', content, {
    day_key: dayKey, theme: normalized?.theme || '', tone: normalized?.tone || '',
  });
  if (ok) { st.lastIngestDay = dayKey; ehSave(); }
}

/** Yüksek-yoğunluk an — 09a p2RecordEmotionalMoment'ten (yalnız significant anlar). */
export async function ehIngestMoment(text, momentMeta) {
  if (!_ehInited || !S.currentUser?.id) return;
  const st = ehState();
  const today = localISODate();
  if (st.momentCount.day !== today) st.momentCount = { day: today, n: 0 };
  if (st.momentCount.n >= MOMENT_INGEST_DAILY_CAP) return;
  st.momentCount.n++;
  ehSave();
  await _insertMemory('emotional_moment', text, momentMeta || {});
}

/** İlk açılışta son ~60 gün özetini (S._narrativeMemory, zaten hidre) tembel
 *  arka-plana embed eder — oturum başına ≤10 kayıt, imleç kalıcı. */
export async function ehMaybeBackfill() {
  if (!_ehInited || !S.currentUser?.id) return;
  const st = ehState();
  if (st.backfillDone) return;
  const pool = S._narrativeMemory || [];
  if (!pool.length) { st.backfillDone = true; ehSave(); return; }
  const start = st.backfillCursor || 0;
  const batch = pool.slice(start, start + BACKFILL_BATCH);
  if (!batch.length) { st.backfillDone = true; ehSave(); return; }
  for (const m of batch) {
    if (m?.note) {
      const dayKey = (m.session_id || '').replace(/^day_/, '') || null;
      await _insertMemory('day_summary', m.note, { day_key: dayKey, backfill: true });
    }
  }
  st.backfillCursor = start + batch.length;
  if (st.backfillCursor >= pool.length) st.backfillDone = true;
  ehSave();
}

/* ════════════════════════════════════════════════════════════════════
   PREFETCH — oturumun sıcak anısı (İç Çalışma 02 · boşluk C)
   ─────────────────────────────────────────────────────────────────────
   NEDEN: bugünkü recall yalnız kullanıcı geçmişe ATIF yaptığında uyanır
   (_shouldRecall). Oysa en dokunaklı an, kullanıcı hiç sormadan "geçen ay da
   böyle bir eşikteydin" diyebilmektir. Kapıyı gevşetmek pahalıdır (her mesaj
   bir embed); onun yerine oturumda BİR kez, son gün özetinin vektörüyle üç anı
   önden getirilir ve ilk turda bağlamda hazır bekler. Kota etkisi: +1 embed.

   KANITSIZ SORGU YOK (§6.10): anlatı hafızası boşsa prefetch HİÇ çalışmaz.
   Uydurulmuş bir sorgudan doğan hatırlama, hatırlama değildir.
════════════════════════════════════════════════════════════════════ */
let _sicak = null;          // { anilar: [...] } — oturumda bir kez dolar
let _sicakTuketildi = false;
/* Uçuştaki çağrının sözü. ehInit prefetch'i ateşle-unut başlatır; aynı anda
   window.ehPrefetch() çağıran ikinci bir yer olursa `_sicak` henüz dolmadığı
   için İKİNCİ bir embed harcanırdı — kotayı iki kez ödemenin sessiz yolu.
   (Aynı ders: SafeStorage kuyruk flush kilidi.) */
let _sicakSoz = null;

export async function ehPrefetch() {
  if (!_ehInited || !S.currentUser?.id || _sicak) return;
  if (_sicakSoz) return _sicakSoz;
  const kaynak = ((S._narrativeMemory || [])[0]?.note || '').trim();
  if (kaynak.length < 20) return;              // kanıt yok → sorgu yok
  _sicakSoz = _prefetchCalis(kaynak);
  return _sicakSoz;
}

async function _prefetchCalis(kaynak) {
  const t0 = Date.now();
  try {
    const anilar = await _remoteRecall(kaynak);
    /* Kaynağın kendisi sonuçta dönebilir (en yakın vektör kendisidir):
       "dün ne yazdıysan onu hatırlattım" bir hatırlama değil YANKIdır. */
    const suzulmus = (anilar || []).filter(
      (m) => (m.content || '').slice(0, 60) !== kaynak.slice(0, 60)
    );
    if (suzulmus.length) {
      _sicak = { anilar: suzulmus };
      _nabiz('prefetch', 'uzak', t0, suzulmus.length);
    } else {
      _nabiz('prefetch', 'bos', t0, 0);
    }
  } catch (e) {
    console.warn('ehPrefetch:', e?.message);
    _nabiz('prefetch', 'hata', t0, 0);
  } finally {
    _sicakSoz = null;   // sonuç ne olursa olsun kilit düşer (boş dönen oturum tekrar denenebilir)
  }
}

/* ════════════════════════════════════════════════════════════════════
   RECALL — yalnız "geçmişe atıf" sinyali olan mesajlarda tetiklenir
════════════════════════════════════════════════════════════════════ */
const _PAST_REFERENCE_MARKERS = [
  /geçen\s+(hafta|ay|sefer|gün)/i, /önceki/i, /daha\s+önce/i, /yine\s+aynı/i, /hep\s+böyle/i,
  /tekrar\s+(oldu|yaşadım|başladı)/i, /eskiden/i, /geçmişte/i, /bu\s+sefer\s+de/i,
  /\bagain\b/i, /\bbefore\b/i, /last\s+(week|month|time)/i, /used\s+to/i, /as\s+usual/i,
];

/** Embed maliyetini/gecikmesini gereksiz yere büyütmemek için gate — RAG'in
 *  shouldRAG'ıyla aynı ruh: yalnız gerçekten "hatırlama" isteyen anlarda çalış. */
function _shouldRecall(text) {
  if (!text || text.length < 15) return false;
  if (_PAST_REFERENCE_MARKERS.some((r) => r.test(text))) return true;
  const intensity = S._emotionalFlow?.length ? S._emotionalFlow[S._emotionalFlow.length - 1].intensity : 0;
  return intensity >= 4;
}

function _timeout(ms) {
  return new Promise((resolve) => setTimeout(() => resolve(null), ms));
}

/** Yerel fallback — embed/RPC yoksa S._narrativeMemory üzerinde konu-kelime
 *  örtüşmesi (p2FindSimilarEmotionalMoment'in basitleştirilmiş hâli). */
function _localFallback(text) {
  try {
    const topics = detectTopics(text);
    if (!topics.length || !S._narrativeMemory?.length) return null;
    let best = null, bestScore = 0;
    S._narrativeMemory.forEach((m) => {
      const noteTopics = detectTopics(m.note || '');
      const overlap = noteTopics.filter((t) => topics.includes(t)).length;
      if (overlap > bestScore) { bestScore = overlap; best = m; }
    });
    if (!best || bestScore < 1) return null;
    return [{ content: best.note, dateLabel: best.date }];
  } catch (_) { return null; }
}

async function _remoteRecall(text) {
  const embedding = await getEmbedding(text.slice(0, 2000));
  const embStr = Array.isArray(embedding) ? JSON.stringify(embedding) : embedding;
  const { data, error } = await sb.rpc('match_user_memories', {
    p_query_embedding: embStr, p_match_threshold: RECALL_THRESHOLD, p_match_count: RECALL_COUNT,
  });
  if (error) throw error;
  return (data || []).map((r) => ({ content: r.content, created_at: r.created_at }));
}

function _fmtLine(m) {
  const when = m.dateLabel || (m.created_at
    ? new Date(m.created_at).toLocaleDateString(S._currentLang || 'tr', { day: 'numeric', month: 'long' })
    : '');
  return `• [${when}] ${m.content}`;
}

/** Sohbet bağlamına eklenecek anlamsal anı bölümü. 800ms TAVAN — gecikirse
 *  sessizce boş döner, sohbeti asla bekletmez. Fallback zinciri: remote →
 *  (zaman aşımı/hata) → yerel konu skoru → boş. */
export async function ehRecall(userText) {
  if (!_ehInited || !S.currentUser?.id) return '';
  /* Sıcak anı oturumun İLK turunda kapı sorulmadan girer: bedeli prefetch'te
     zaten ödendi, ikinci kez ödemeden bir kez kullanılır. Sonraki turlarda
     bugünkü kapı (_shouldRecall) aynen geçerlidir — "her mesajı embed et"
     yoluna girilmiyor. */
  if (_sicak && !_sicakTuketildi) {
    _sicakTuketildi = true;
    const sicakAnilar = _sicak.anilar;
    _nabiz('recall', 'sicak', Date.now(), sicakAnilar.length);   // süre prefetch'te ölçüldü
    return p('prompt.eh.header') + '\n' + sicakAnilar.slice(0, RECALL_COUNT).map(_fmtLine).join('\n');
  }
  if (!_shouldRecall(userText)) return '';
  const t0 = Date.now();
  let uzakHata = false;
  // Geç dönen/hata veren remote çağrı race kaybetse bile unhandled rejection
  // bırakmasın diye burada yakalanır — race sonucu null olur, fallback devreye girer.
  const remotePromise = _remoteRecall(userText).catch((e) => {
    console.warn('ehRecall remote:', e?.message);
    uzakHata = true;
    return null;
  });
  try {
    const remote = await Promise.race([remotePromise, _timeout(RECALL_TIMEOUT_MS)]);
    const uzak = !!(remote && remote.length);
    const memories = uzak ? remote : _localFallback(userText);
    if (!memories?.length) { _nabiz('recall', uzakHata ? 'hata' : 'bos', t0, 0); return ''; }
    _nabiz('recall', uzak ? 'uzak' : 'yerel', t0, memories.length);
    return p('prompt.eh.header') + '\n' + memories.slice(0, RECALL_COUNT).map(_fmtLine).join('\n');
  } catch (_) { _nabiz('recall', 'hata', t0, 0); return ''; }
}

/* ════════════════════════════════════════════════════════════════════
   INIT — 03-auth-shell ready zinciri: omReady→ehInit (loadNarrativeMemory sonrası)
════════════════════════════════════════════════════════════════════ */
export function ehInit() {
  if (_ehInited || !S.currentUser?.id) return;
  _ehLoad();
  _ehInited = true;
  // Sıra bilinçli: prefetch ilk TURA yetişmek zorunda, backfill'in acelesi yok.
  try { ehPrefetch(); } catch (_) {}
  try { ehMaybeBackfill(); } catch (_) {}
}

/* ── window expose (06/09a/12 buradan çağırır — import kenarı yok) ── */
if (typeof window !== 'undefined') {
  window.ehInit = ehInit;
  window.ehIngestDay = ehIngestDay;
  window.ehIngestMoment = ehIngestMoment;
  window.ehRecall = ehRecall;
  window.ehPrefetch = ehPrefetch;
}
