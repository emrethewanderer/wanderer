/* ═══════════════════════════════════════════════════════════════
   WANDERER INFRASTRUCTURE — Mimari Altyapı Modülü
   Tüm dosyalar bu modülün üzerine inşa edilir.
   Yükleme sırası: 00a (bu) → 00-config → ... → 16-i18n-prompts
   NOT: 15-i18n.js hiçbir şeyi import etmeyen bağımsız yaprak modül —
   buradan t() içe aktarmak döngüsel bağımlılık yaratmaz.
═══════════════════════════════════════════════════════════════ */
import { t } from './15-i18n.js';

/* ── 1. STORAGE KEYS — Tek kaynak, typo koruması ── */
export const STORAGE_KEYS = Object.freeze({
  AVATAR:           uid => `etw_avatar_${uid}`,
  RESISTANCE:       uid => `etw_resistance_${uid}`,
  SILENCE_TOPICS:   uid => `etw_silence_topics_${uid}`,
  COMMITMENTS:      uid => `etw_commitments_${uid}`,
  CONSISTENCY:      uid => `etw_consistency_${uid}`,
  WELLNESS:         uid => `etw_wellness_${uid}`,
  NOTES:            uid => `etw_notes_${uid}`,
  PME_DEPTH:        uid => `etw_pme_depth_${uid}`,
  DF_BELIEFS:       uid => `etw_df_beliefs_${uid}`,
  DF_CHOICES:       uid => `etw_df_choices_${uid}`,
  DF_HAYAL:         uid => `etw_df_hayal_${uid}`,
  DF_WORKSHEETS:    uid => `etw_df_worksheets_${uid}`,
  DAILY_PRACTICE:   uid => `etw_daily_practice_${uid}`,
  OPENER_DISMISSED: key => `etw_opener_dismissed_${key}`,
  PRE_CTX:          (uid, day) => `etw_pre_ctx_${uid}_${day}`,
  EOD:              day => `etw_eod_${day}`,
  PME_REPORT:       day => `etw_pme_report_${day}`,
  CLOSURE:          key => `etw_closure_${key}`,
  ANALYTICS:        uid => `etw_analytics_${uid}`,
  INSTALL_DISMISSED:'etw_install_dismissed',
  LANG:             'etw_lang',
  W3_JOURNEY:       uid => `w3_journey_${uid}`,
  W3_JOURNEY_VER:   uid => `w3_journey_ver_${uid}`,
  W3_MIGRATION:     uid => `w3_migration_done_${uid}`,
  SUMMARIES_CACHE:  uid => `etw_summaries_cache_${uid}`,
  CHALLENGE:        uid => `etw_challenge_${uid}`,
  MANIFESTO:        uid => `etw_manifesto_${uid}`,
  LIBRARY_RECS:     uid => `etw_library_recs_${uid}`,
});

/* ── 2. SAFE STORAGE — Supabase-backed key-value store ──
   In-memory cache for synchronous reads; all writes go to Supabase.
   storageInit(sb, uid) must be called once after login to hydrate cache. */

const _kvCache = new Map();
let _sbRef = null;
let _uidRef = null;
let _storageReady = false;

// Retry kuyruğu — offline/hata durumunda write'lar kaybolmasın.
const _writeQueue = new Map(); // key -> { value, op: 'upsert'|'delete', retries: n }
let _flushTimer = null;
let _onlineListenerInstalled = false;
const MAX_RETRIES = 5;
const BACKOFF_BASE_MS = 2000;

function _scheduleFlush(delayMs = 0) {
  if (_flushTimer) return;
  _flushTimer = setTimeout(async () => {
    _flushTimer = null;
    await _flushQueue();
  }, delayMs);
}

function _installOnlineListener() {
  if (_onlineListenerInstalled || typeof window === 'undefined') return;
  _onlineListenerInstalled = true;
  window.addEventListener('online', () => _scheduleFlush(0));
}

/* ── Kuyruk aynası — kapanış güvencesi ──
   Async flush pagehide'da yarıda ölebilir; senkron localStorage checkpoint'i
   bekleyen yazımları saklar, sonraki storageInit yetimi kuyruğa devralır.
   sendBeacon BİLİNÇLİ yok: Supabase REST apikey+Authorization header ister,
   sendBeacon header taşıyamaz. Ckpt HAM localStorage'tadır — SafeStorage'a
   yazmak, kuyruğu kuyrukla kurtarmaya çalışan bir döngü olurdu. */
const WQ_CKPT_KEY = (uid) => `etw_wq_ckpt_${uid}`;
const WQ_CKPT_MAX_AGE_MS = 48 * 3600 * 1000; // bayat replay guard'ı (çok-cihaz riski)

function _writeQueueCkpt() {
  try {
    if (!_uidRef || typeof localStorage === 'undefined') return;
    if (!_writeQueue.size) { localStorage.removeItem(WQ_CKPT_KEY(_uidRef)); return; }
    localStorage.setItem(WQ_CKPT_KEY(_uidRef), JSON.stringify({
      ts: Date.now(),
      items: Array.from(_writeQueue.entries()).map(([k, it]) => [k, { value: it.value, op: it.op }]),
    }));
  } catch (_) {}
}

let _lifecycleFlushInstalled = false;
function _installLifecycleFlush() {
  if (_lifecycleFlushInstalled || typeof document === 'undefined') return;
  _lifecycleFlushInstalled = true;
  // hidden = birincil ağ yolu (sayfa canlıyken flush genelde yetişir);
  // pagehide = yalnız checkpoint — kalanı sonraki açılış devralır (00f kalıbı).
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null; }
    _flushQueue();
    _writeQueueCkpt();
  });
  window.addEventListener('pagehide', _writeQueueCkpt);
}

/* ── Kalıcı yazım hatası bildirimi ──
   Eskiden her başarısız anahtar AYRI toast basardı; bir sohbet turu 3+ anahtar
   yazdığı için ekran toast fırtınasına dönüyordu. Üstelik kullanıcı ham anahtar
   adını + kendi uid'sini görüyor, asıl SEBEBİ göremiyordu — teşhis imkânsızdı.
   Artık pencere içinde biriken hatalar tek toast'ta ve sebep görünür. */
const _persistFails = new Map(); // key -> okunabilir sebep
let _persistFailTimer = null;
function _reportPersistFailure(key, err) {
  const code = (err && (err.code || err.status)) || '';
  const msg  = (err && (err.message || err.msg)) || String(err || '');
  _persistFails.set(key, (code ? code + ' · ' : '') + msg);
  if (_persistFailTimer) return;
  _persistFailTimer = setTimeout(() => {
    _persistFailTimer = null;
    const n = _persistFails.size;
    // Hepsi neredeyse daima aynı kökten gelir (RLS, ağ, kota) — ilki temsil eder.
    const reason = (_persistFails.values().next().value || '').slice(0, 90);
    _persistFails.clear();
    if (typeof showToast !== 'function') return;
    try {
      showToast(
        t('toast.persist_fail', 'Değişikliklerin sunucuya kaydedilemedi ({n} kayıt) — {reason}')
          .replace('{n}', String(n)).replace('{reason}', reason),
        true
      );
    } catch (_) {}
  }, 1500);
}

/* Eşzamanlı flush kilidi — _flushQueue await'teyken yeni bir SafeStorage.set
   ikinci bir flush başlatabiliyordu; iki tur AYNI item nesnesini denediği için
   item.retries çift artıyor, 5'lik retry bütçesi 2-3 gerçek denemede tükeniyordu.
   Sonuç: geçici ağ hatası kalıcı hata gibi görünüp boşuna toast basıyordu. */
let _flushing = false;
let _flushPending = false;

async function _flushQueue() {
  if (_flushing) { _flushPending = true; return; }
  _flushing = true;
  try {
    await _flushQueueRun();
  } finally {
    _flushing = false;
    // Kilit yüzünden atlanan istek varsa kuyruk boş kalmasın.
    if (_flushPending) { _flushPending = false; if (_writeQueue.size) _scheduleFlush(0); }
  }
}

async function _flushQueueRun() {
  if (!_sbRef || !_uidRef || !_writeQueue.size) return;
  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (isOffline) { _scheduleFlush(5000); return; }

  const entries = Array.from(_writeQueue.entries());
  for (const [key, item] of entries) {
    try {
      let resp;
      if (item.op === 'delete') {
        resp = await _sbRef.from('user_analytics').delete()
          .eq('user_id', _uidRef).eq('data_type', key);
      } else {
        resp = await _sbRef.from('user_analytics').upsert({
          user_id: _uidRef,
          data_type: key,
          data_json: item.value,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,data_type' });
      }
      if (resp.error) throw resp.error;
      // Uçuş sırasında aynı anahtara YENİ değer yazıldıysa onu düşürme —
      // snapshot'taki eski item referansıyla karşılaştır; yeni yazım sonraki
      // flush'ta gider (kayıp-güncelleme penceresi kapalı).
      if (_writeQueue.get(key) === item) _writeQueue.delete(key);
    } catch (e) {
      item.retries = (item.retries || 0) + 1;
      if (item.retries >= MAX_RETRIES) {
        // Supabase hataları asıl teşhisi `code`/`details`/`hint`te taşır
        // (42501=RLS, 42P01=tablo yok, 23502=NOT NULL, PGRST204=şema cache);
        // yalnız message loglamak çoğu vakada boş satır bırakıyordu.
        console.error('[Storage] kalıcı yazım hatası:', key, {
          code: e?.code, status: e?.status, message: e?.message,
          details: e?.details, hint: e?.hint,
        });
        if (_writeQueue.get(key) === item) _writeQueue.delete(key);
        ErrorBoundary?.run('storage.persist', () => { throw e; }, { silent: true });
        _reportPersistFailure(key, e);
      } else {
        const delay = BACKOFF_BASE_MS * Math.pow(2, item.retries - 1);
        _scheduleFlush(delay);
        _writeQueueCkpt(); // ayna kalan kuyruğu yansıtsın
        return; // tek hata sonrası bekle, queue'da kalan diğerleri sonra
      }
    }
  }
  _writeQueueCkpt(); // kuyruk boşaldıysa aynayı sil — bayat replay penceresi kapanır
}

export async function storageInit(sbClient, uid) {
  _sbRef = sbClient;
  _uidRef = uid;
  _installOnlineListener();
  try {
    const { data } = await sbClient.from('user_analytics')
      .select('data_type, data_json')
      .eq('user_id', uid);
    if (data) {
      data.forEach(row => _kvCache.set(row.data_type, row.data_json));
    }
  } catch (e) {
    console.warn('[Storage] Supabase hydration error:', e.message);
  }
  // Yetim checkpoint kurtarma — önceki oturumun unload'da yetişmeyen yazımları.
  // Hem kuyruğa (sunucuya gidecek) hem _kvCache'e (bellek gerçeği) uygulanır;
  // 48 saatten eski ckpt replay edilmez (başka cihazın yeni yazımını ezmesin).
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(WQ_CKPT_KEY(uid));
      if (raw) {
        const ckpt = JSON.parse(raw);
        if (ckpt && typeof ckpt.ts === 'number' && (Date.now() - ckpt.ts) < WQ_CKPT_MAX_AGE_MS) {
          (ckpt.items || []).forEach(([k, it]) => {
            if (!it || !it.op || _writeQueue.has(k)) return;
            _writeQueue.set(k, { value: it.value, op: it.op, retries: 0 });
            if (it.op === 'delete') _kvCache.delete(k); else _kvCache.set(k, it.value);
          });
        }
        localStorage.removeItem(WQ_CKPT_KEY(uid));
      }
    }
  } catch (_) {}
  _installLifecycleFlush();
  _storageReady = true;
  if (_writeQueue.size) _scheduleFlush(0);
}

function _persistToSupabase(key, value) {
  _writeQueue.set(key, { value, op: 'upsert', retries: 0 });
  if (_sbRef && _uidRef) _scheduleFlush(0);
  // Arka plandayken enqueue aynayı ANINDA günceller — 00a'nın hidden handler'ı
  // 09* modül flush'larından önce koşar; sıra bağımsızlığını bu satır sağlar.
  if (typeof document !== 'undefined' && document.hidden) _writeQueueCkpt();
}

function _deleteFromSupabase(key) {
  _writeQueue.set(key, { value: null, op: 'delete', retries: 0 });
  if (_sbRef && _uidRef) _scheduleFlush(0);
  if (typeof document !== 'undefined' && document.hidden) _writeQueueCkpt();
}

export const SafeStorage = {
  get(key, fallback = null) {
    try {
      const raw = _kvCache.get(key);
      if (raw === undefined || raw === null) return fallback;
      return JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, value) {
    try {
      const json = JSON.stringify(value);
      _kvCache.set(key, json);
      _persistToSupabase(key, json);
      return true;
    } catch { return false; }
  },
  getRaw(key, fallback = null) {
    const val = _kvCache.get(key);
    return (val !== undefined && val !== null) ? val : fallback;
  },
  setRaw(key, value) {
    try {
      _kvCache.set(key, value);
      _persistToSupabase(key, value);
      return true;
    } catch { return false; }
  },
  remove(key) {
    _kvCache.delete(key);
    _deleteFromSupabase(key);
  },
  /** Ad senkronu göçü (§4.3) — bir yüzeyin adı değiştiğinde onun KV anahtarı
   *  da değişir; kullanıcının cihazındaki veri kaybolmasın diye tek seferlik
   *  geri-okuma yapılır: yeni anahtar BOŞSA eskiden oku, yeni ada yaz.
   *  Eski anahtar KASITLI olarak silinmez — taşıma kanıtlanmadan veri
   *  silinmez; süpürme ayrı ve sonraki bir sprintin işidir.
   *  Yeni anahtar doluysa hiçbir şey yapmaz (idempotent, her boot'ta güvenli). */
  migrateKey(newKey, oldKey) {
    try {
      if (!newKey || !oldKey || newKey === oldKey) return false;
      if (_kvCache.get(newKey) != null) return false;   // yeni ad zaten dolu
      const old = _kvCache.get(oldKey);
      if (old == null) return false;                    // taşınacak veri yok
      SafeStorage.setRaw(newKey, old);
      return true;
    } catch { return false; }
  },
  /** Hydrate edilmiş tüm anahtarlar — eski biçim göçü/süpürme için. */
  keys() {
    return Array.from(_kvCache.keys());
  }
};

/* ── 2b. BİRLEŞİK AKTİVİTE DEFTERİ — merkezî "seri" için tek kaynak ──
   Sohbet günleri + ritüel tamamlama günleri (Geçiş Alanı okuması,
   Hayal Seansı, Davranış Kanıtı) burada birleşir. calculateStreak ve
   hafta zinciri bu defteri okur → ritüeller artık seriyi besler. */
const ACTIVITY_LEDGER_KEY = 'etw_activity_ledger_v1';

/** Yerel (kullanıcı saat dilimi) gün anahtarı — sohbet seri mantığıyla
 *  aynı format: `${yıl}-${ay0}-${gün}` (ay 0-indeksli, padding yok). */
export function localDayKey(d = new Date()) {
  const x = (d instanceof Date) ? d : new Date(d);
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
}

/** Yerel (kullanıcı saat dilimi) SIRALANABİLİR tarih anahtarı — `YYYY-MM-DD`
 *  formatı ama UTC değil yerel saat. localDayKey aksine padding'li olduğu için
 *  lexical karşılaştırma (`<`, `===`) güvenlidir. Günlük "bugün yapıldı mı?"
 *  kontrolleri bunu kullanmalı (toISOString().slice(0,10) UTC olduğundan
 *  UTC+3'te gün sınırını gece yarısı yerine 03:00'e kaydırır). */
export function localISODate(d = new Date()) {
  const x = (d instanceof Date) ? d : new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

/** ZAMAN AĞIRLIĞI — üstel çürüme yardımcısı (Tanıma Motoru K5, 2026-08-09).
 *  "En son ne zamandı" sorusunu 0-1 ağırlığa çevirir: `2^(-yaş/yarıÖmür)`.
 *  Kaynak formül `13l-kimlik-motoru.js`'in erdem vektöründeydi
 *  (`Math.pow(2, -age/HALF_LIFE_MS)`, yarı ömür 7 gün); buraya TAŞINDI ki
 *  09i-secici.js (Tanıma Motoru) aynı çürümeyi kullansın — 13l davranışını
 *  BİREBİR koruyarak kendi sabitiyle bu fonksiyonu çağırır (test sabitler).
 *  `ts` düşerse (0/null/undefined) "az önce" sayılır — yaş=0, ağırlık=1;
 *  13l'nin eski `e.t || now` düşüşüyle aynı sessiz varsayılan. `ts` sayı
 *  (epoch ms), ISO string ya da Date olabilir — geçersizse yine "az önce". */
export function zamanAgirligi(ts, yariOmurGun) {
  const now = Date.now();
  let t = now;
  if (ts) {
    const parsed = (ts instanceof Date) ? ts.getTime() : (typeof ts === 'number' ? ts : new Date(ts).getTime());
    if (Number.isFinite(parsed)) t = parsed;
  }
  const age = now - t;
  const gun = (Number.isFinite(yariOmurGun) && yariOmurGun > 0) ? yariOmurGun : 7;
  const yariOmurMs = gun * 24 * 60 * 60 * 1000;
  return Math.pow(2, -age / yariOmurMs);
}

export function getActivityDays() {
  const arr = SafeStorage.get(ACTIVITY_LEDGER_KEY, []);
  return Array.isArray(arr) ? arr : [];
}

/** Bir günü aktivite olarak işaretle. Yeni günse true döner. */
export function recordActivityDay(d = new Date()) {
  const key = localDayKey(d);
  const arr = getActivityDays();
  if (arr.includes(key)) return false;
  arr.push(key);
  SafeStorage.set(ACTIVITY_LEDGER_KEY, arr.slice(-400)); // son ~400 gün
  // Merkezî seri UI'ını tazele (decoupled — 04 expose eder)
  try { window.recomputeStreakUI && window.recomputeStreakUI(); } catch (_) {}
  // Widget köprüsü (13k) — GELDİN mührü + seri ana ekranda anında tazelensin
  try { window.wkSync?.(); } catch (_) {}
  return true;
}

/* ── 3. IN-MEMORY CACHE — pahalı parse işlemlerini önler ── */
export const MemCache = (() => {
  const _store = new Map();
  const _dirty = new Map();

  return {
    get(key, loader) {
      if (_store.has(key)) return _store.get(key);
      const val = loader();
      _store.set(key, val);
      _dirty.set(key, false);
      return val;
    },
    set(key, value) {
      _store.set(key, value);
      _dirty.set(key, true);
    },
    isDirty(key) { return _dirty.get(key) === true; },
    markClean(key) { _dirty.set(key, false); },
    flush(key, saver) {
      if (!_dirty.get(key)) return;
      saver(_store.get(key));
      _dirty.set(key, false);
    },
    invalidate(key) { _store.delete(key); _dirty.delete(key); },
    clear() { _store.clear(); _dirty.clear(); },
  };
})();

/* ── 4. ERROR BOUNDARY — Hata aggregation, kullanıcı bildirimi, telemetri hook ── */
export const ErrorBoundary = (() => {
  const _errors = [];
  let _toastFn = null;
  let _telemetryFn = null;  // (error, ctx) => void — Sentry vb.

  function setToastFn(fn) { _toastFn = fn; }
  /** Telemetri hook'u (Sentry/PostHog/custom). 14-boot.js'te set edilir. */
  function setTelemetryHook(fn) { _telemetryFn = typeof fn === 'function' ? fn : null; }

  function _report(label, error, opts = {}) {
    if (!_telemetryFn) return;
    try {
      _telemetryFn(error, { label, severity: opts.severity || 'warning', ts: Date.now() });
    } catch (e) {
      console.warn('[telemetry hook]', e.message || e);
    }
  }

  async function run(label, fn, opts = {}) {
    const { silent = false, fallback = undefined } = opts;
    try {
      return await fn();
    } catch (e) {
      _errors.push({ label, error: e, time: Date.now() });
      if (!silent) console.warn(`[${label}]`, e.message || e);
      _report(label, e, opts);
      return fallback;
    }
  }

  async function runAll(tasks) {
    const results = await Promise.allSettled(tasks.map(t => run(t.label, t.fn, t.opts)));
    const failures = results
      .map((r, i) => r.status === 'rejected' ? tasks[i].label : null)
      .filter(Boolean);
    if (failures.length && _toastFn) {
      _toastFn(t('ui.components_failed', '{n} bileşen yüklenemedi').replace('{n}', failures.length), true);
    }
    return { results, failures };
  }

  function getErrors() { return [..._errors]; }
  function clear() { _errors.length = 0; }

  return { run, runAll, setToastFn, setTelemetryHook, getErrors, clear, _report };
})();

/** Global error handler — window.onerror + unhandledrejection.
 *  ErrorBoundary'in telemetri hook'una gönderir. */
export function installGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;
  if (window.__etwErrorHandlersInstalled) return;
  window.__etwErrorHandlersInstalled = true;

  window.addEventListener('error', (e) => {
    const err = e.error || new Error(e.message || 'Unknown error');
    ErrorBoundary._report('window.onerror', err, { severity: 'error' });
  });

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason instanceof Error ? e.reason : new Error(String(e.reason));
    ErrorBoundary._report('unhandledrejection', reason, { severity: 'error' });
  });
}

/* ── 5. EVENT BUS — Modüller arası gevşek bağlantı ── */
export const EventBus = (() => {
  const _listeners = {};

  return {
    on(event, fn) {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(fn);
      return () => { _listeners[event] = _listeners[event].filter(f => f !== fn); };
    },
    emit(event, data) {
      (_listeners[event] || []).forEach(fn => {
        try { fn(data); } catch (e) { console.warn(`EventBus [${event}]:`, e.message); }
      });
    },
    once(event, fn) {
      const unsub = EventBus.on(event, (data) => { unsub(); fn(data); });
      return unsub;
    }
  };
})();

/* ── 6. RATE LIMITER — Client-side mesaj gönderim koruması ── */
export const RateLimiter = (() => {
  const _timestamps = [];
  const MAX_PER_MINUTE = 15;
  const MIN_INTERVAL_MS = 1000;

  return {
    canSend() {
      const now = Date.now();
      if (_timestamps.length && now - _timestamps[_timestamps.length - 1] < MIN_INTERVAL_MS) return false;
      const recent = _timestamps.filter(t => now - t < 60000);
      return recent.length < MAX_PER_MINUTE;
    },
    record() {
      const now = Date.now();
      // 60 saniyeden eski timestamp'leri temizle — sınırsız büyümeyi önler
      const cutoff = now - 60000;
      const firstRecent = _timestamps.findIndex(t => t >= cutoff);
      if (firstRecent > 0) _timestamps.splice(0, firstRecent);
      _timestamps.push(now);
    },
    reset() { _timestamps.length = 0; },
    remaining() {
      const now = Date.now();
      const recent = _timestamps.filter(t => now - t < 60000);
      return Math.max(0, MAX_PER_MINUTE - recent.length);
    }
  };
})();

/* ── 7. VIRTUAL SCROLLER — IntersectionObserver tabanlı lazy render ── */
export const VirtualScroller = (() => {
  let _obs = null, _ct = null, _items = [], _fn = null;
  let _batch = 20, _pos = 0, _rev = false;

  function init(container, items, renderFn, batchSize = 20, opts = {}) {
    destroy();
    _ct = container; _items = items; _fn = renderFn;
    _batch = batchSize; _rev = !!opts.reverse;

    if (!items.length) return;

    const sentinel = document.createElement('div');
    sentinel.className = 'vs-sentinel';
    sentinel.style.height = '1px';

    _obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) _load();
    }, { root: container, rootMargin: '200px' });

    if (_rev) {
      const start = Math.max(0, items.length - batchSize);
      _pos = items.length - start;
      _renderSlice(start, items.length);
      container.insertBefore(sentinel, container.firstChild);
    } else {
      _pos = Math.min(batchSize, items.length);
      _renderSlice(0, _pos);
      container.appendChild(sentinel);
    }

    if (_pos < items.length) _obs.observe(sentinel);
    else sentinel.remove();
  }

  function _renderSlice(start, end) {
    const frag = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      const el = _fn(_items[i], i);
      if (el) frag.appendChild(el);
    }
    if (_rev) {
      const s = _ct.querySelector('.vs-sentinel');
      if (s) s.after(frag);
      else _ct.prepend(frag);
    } else {
      const s = _ct.querySelector('.vs-sentinel');
      if (s) _ct.insertBefore(frag, s);
      else _ct.appendChild(frag);
    }
  }

  function _load() {
    if (_pos >= _items.length) return;
    if (_rev) {
      const curEnd = _items.length - _pos;
      const start = Math.max(0, curEnd - _batch);
      const sh = _ct.scrollHeight;
      _renderSlice(start, curEnd);
      _ct.scrollTop += (_ct.scrollHeight - sh);
      _pos += (curEnd - start);
    } else {
      const start = _pos;
      const end = Math.min(start + _batch, _items.length);
      _renderSlice(start, end);
      _pos = end;
    }
    if (_pos >= _items.length) {
      const s = _ct.querySelector('.vs-sentinel');
      if (s) { _obs?.unobserve(s); s.remove(); }
    }
  }

  function destroy() {
    if (_obs) { _obs.disconnect(); _obs = null; }
    _ct = null; _items = []; _pos = 0; _rev = false;
  }

  return { init, destroy };
})();

/* ── 8. CRYPTO — Senkron obfüskasyon + Async AES-GCM ── */

// Senkron (eski çağrılar için): daha güçlü key türetme + XOR gizleme
export const CryptoLite = (() => {
  // 32-bit FNV-1a hash — basit hash'ten çok daha dağılmış
  function _fnv1a(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
  }

  function _deriveKey(userId) {
    const seed = 'etw-v2:' + userId;
    const h1 = _fnv1a(seed);
    const h2 = _fnv1a(seed.split('').reverse().join(''));
    return (h1 ^ (h2 << 16)).toString(36) + (h2 ^ (h1 >> 8)).toString(36);
  }

  function encrypt(data, userId) {
    const key   = _deriveKey(userId);
    const json  = JSON.stringify(data);
    const chars = Array.from(json).map((c, i) =>
      String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join('');
    return 'v2:' + btoa(unescape(encodeURIComponent(chars)));
  }

  function decrypt(cipher, userId) {
    try {
      const key  = _deriveKey(userId);
      // v2 format (XOR)
      if (cipher.startsWith('v2:')) {
        const chars = decodeURIComponent(escape(atob(cipher.slice(3))));
        const json  = Array.from(chars).map((c, i) =>
          String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))
        ).join('');
        return JSON.parse(json);
      }
      // v1 legacy format (Base64 obfüskasyon — geçiş için)
      const body = cipher.slice(4, -4);
      const json = decodeURIComponent(escape(atob(body)));
      return JSON.parse(json);
    } catch { return null; }
  }

  return { encrypt, decrypt };
})();

/* ── 8b. SECURE STORAGE — CryptoLite (senkron) + Supabase-backed ── */
export const SecureStorage = {
  get(key, uid, fallback = null) {
    try {
      const raw = _kvCache.get(key);
      if (raw === undefined || raw === null) return fallback;
      const decrypted = CryptoLite.decrypt(raw, uid);
      if (decrypted !== null) return decrypted;
      return JSON.parse(raw);
    } catch { return fallback; }
  },
  set(key, uid, value) {
    try {
      const encrypted = CryptoLite.encrypt(value, uid);
      _kvCache.set(key, encrypted);
      _persistToSupabase(key, encrypted);
      return true;
    } catch { return false; }
  },
  remove(key) {
    _kvCache.delete(key);
    _deleteFromSupabase(key);
  }
};

/* ── 9. Z-INDEX LAYER SYSTEM ── */
export const Z_LAYERS = Object.freeze({
  CHAT_BG:            0,
  BASE:               1,
  AMBIENT:            2,
  CHAT_AREA:          3,
  TOP_NAV:           10,
  TOPBAR:            40,
  GLOBAL_MENU:      500,
  DRAWER_BACKDROP:  510,
  DRAWER:           520,
  PROFILE_PANEL:    520,
  OVERLAY:          600,
  MODE_PICKER:      650,
  MODAL:            700,
  PREMIUM_SPOTLIGHT:720,
  FLASH:            800,
  INPUT_CARD:       900,
  TOAST:           9999,
  CINEMATIC:       9999,
});

/* ── 10. ACCESSIBILITY HELPERS ── */
export const A11y = {
  announceToSR(message) {
    let region = document.getElementById('sr-announcer');
    if (!region) {
      region = document.createElement('div');
      region.id = 'sr-announcer';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'true');
      region.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);';
      document.body.appendChild(region);
    }
    region.textContent = message;
  },
  trapFocus(container) {
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return () => {};
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    function handler(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    container.addEventListener('keydown', handler);
    first.focus();
    return () => container.removeEventListener('keydown', handler);
  }
};

/* ── 11. ANIMATION UTILS — prefers-reduced-motion aware ── */
export const AnimUtils = {
  prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
  safeAnimate(el, keyframes, options) {
    if (!el?.animate) return null;
    if (this.prefersReducedMotion()) {
      if (keyframes.length) {
        const last = keyframes[keyframes.length - 1];
        Object.assign(el.style, last);
      }
      return null;
    }
    return el.animate(keyframes, options);
  }
};

/* ── 12. DEBOUNCE / THROTTLE ── */
export function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}
export function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  };
}

/* ── 12b. DETERMİNİSTİK SEED — "aynı girdi, aynı görüntü" ──
   Aynı kullanıcıya aynı kartı/motifi/rotasyonu her açtığında birebir aynı
   göstermek için: FNV-1a hash → mulberry32 üreteci. Math.random() burada
   kullanılamaz — kart görselinin her açılışta değişmesi "bu kart BENİM"
   hissini bozar.
   NOT: aynı desen 10i (_haHash/_haRng) ve 10r (_hash/_rng) içinde bit-bit
   aynı biçimde iki kez yazılmıştı; üçüncü tüketici (13z) gelince tek kaynağa
   çekildi. Yeni bir deterministik üreteç gerekirse buraya bağlan, kopyalama. */
export function stableHash(str) {
  let h = 2166136261 >>> 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function seededRng(seed) {
  let a = (typeof seed === 'number' ? seed : stableHash(seed)) >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── 13. INPUT SANITIZATION ── */
export function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ── 13b. HOOK REGISTRY — modüller arası before/after hook pattern ──
   Eskiden 13-extras.js orijinal fonksiyonları wrap edip monkey-patch yapıyordu.
   Bunun yerine her modül kendi public fonksiyonu için hookRegistry export eder;
   13-extras gibi modüller hook'lara listener ekler. TDZ riski yok çünkü
   registrasyon 14-boot.js'te (app boot zamanında) yapılır. */
export function createHookRegistry() {
  const _before = [];
  const _after  = [];
  return {
    before(fn) { if (typeof fn === 'function') _before.push(fn); },
    after(fn)  { if (typeof fn === 'function') _after.push(fn); },
    runBefore(...args) {
      for (const f of _before) {
        try { f(...args); } catch (e) { console.warn('[hook before]', e.message || e); }
      }
    },
    runAfter(...args) {
      for (const f of _after) {
        try { f(...args); } catch (e) { console.warn('[hook after]', e.message || e); }
      }
    },
  };
}

/* ── 14. TOAST — Evrensel UI bildirimi (zero deps, DOM'dan başka bağımlılık yok) ──
   onClick verilirse toast tıklanabilir olur (imleç + tıklayınca callback + erken kapanış);
   aksiyonlu toast'lar okunmaya zaman tanısın diye süresi 6sn'ye uzar (kk.intro_toast mirası). */
let _tt;
let _toastClickHandler = null;
export function showToast(msg, isErr = false, onClick = null) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show' + (isErr ? ' err' : '');
  clearTimeout(_tt);
  if (_toastClickHandler) { el.removeEventListener('click', _toastClickHandler); _toastClickHandler = null; }
  el.style.cursor = onClick ? 'pointer' : '';
  if (onClick) {
    _toastClickHandler = () => { onClick(); el.classList.remove('show'); };
    el.addEventListener('click', _toastClickHandler, { once: true });
  }
  _tt = setTimeout(() => el.classList.remove('show'), onClick ? 6000 : 3000);
}

/* ── 15. HAPTİK — tutarlı fiziksel dokunuş dili ──
   Tüm birincil dokunma hedeflerinde tek tip 8ms titreşim (yay hareket
   dilinin dokunsal ikizi). Delegasyon tek listener'da; yalnız gerçek
   parmak dokunuşunda çalışır (mouse/kalem hariç), 90ms içinde tekrar
   tetiklenmez. Modüller özel anlar için hapticTap(ms) çağırabilir. */
export function hapticTap(ms = 8) {
  // His Motoru (13e) varsa native haptiğe yönlendir (Titreşim ayarına saygı
  // duyar); yoksa eski ham web titreşimi — 10q'daki haptic() ile aynı eşik.
  try {
    if (window.fxHaptic) { window.fxHaptic(ms >= 60 ? 'heavy' : ms >= 25 ? 'medium' : 'light'); return; }
  } catch (_) {}
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (_) {}
}
(() => {
  let last = 0;
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    if (!e.target?.closest?.('button, [role="button"], .nav-btn, .gm-link, .llm-starter, .history-item, .mood-btn')) return;
    const now = Date.now();
    if (now - last < 90) return;
    last = now;
    hapticTap(8);
  }, { capture: true, passive: true });
})();

/* ── 16. UYANAN SAHNE (.wn-reveal) — kademeli giriş, kaydırmaya bağlı ──
   FELSEFE (Emre):
     §5 der ki "kademeli giriş: öğeler aynı anda değil, sırayla süzülür."
     Bu kural repoda yalnız ekran AÇILIŞINDA yaşıyordu (`.casc`, 21 tetik);
     kaydırırken hiçbir şey uyanmıyordu. Oysa uygulama bir YER'dir (§0) ve
     uzun bir yüzeyde aşağı inmek o yerde YÜRÜMEKTİR. Konuştuğu derin
     metafor **Yolculuk**: her bölüm yolun bir durağıdır, oraya varınca
     uyanır. Bu yüzden bir kez uyanan bir daha sönmez — yol geriye akmaz;
     geri kaydırınca bölümlerin yeniden kaybolması yürüyüşü değil, bir
     efekti anlatırdı (§0: "anlamı olmayan süs eklenmez").
     Tören katmanının (§7) küçük kardeşidir: tören ekranı DURDURUP anı
     işaretler, bu katman durdurmaz — yalnız varışı işaretler.
   MEKANİK / TEK GİRİŞ:
     `wnRevealInit()` boot'ta bir kez koşar, `<html>`e `wn-reveal-on` takar;
     `[data-reveal]` taşıyan her öğe gözlenir, göründüğünde `.wn-seen` alır
     ve gözlemden düşer. Yeni gelen içerik için `wnRevealScan(kok)`.
   ⚠ GİZLEME KAPIYA ASILI: CSS başlangıç opaklığını `html.wn-reveal-on`
     olmadan vermez. JS düşerse, IntersectionObserver yoksa ya da motor hiç
     init edilmezse içerik GÖRÜNÜR kalır — §5.2'nin "asla bloklama" kuralı.
     Bir giriş animasyonunun bedeli, içeriğin kaybolma riski olamaz.
   Kalıcılık yok. Konvansiyon: stiller css/parts/base.css (.wn-reveal). */
let _wnRevealObs = null;

/* Gözlenecek yüzeyler. `[data-reveal]` bilinçli işarettir; `.doc-section`
   ise yapısal olarak zaten "uzun, kaydırılan, bölümlü" tanımına uyar ve tek
   satırla bütün belge katmanına yayılır (Hukuki, GDPR, Ayarlar, Ayna,
   Hafıza — [[belge-katmani-doc-primitifleri]]). `.doc-rise` ile çakışmaz:
   o KAPSAYICIYA takılır, bu iç bölümlere — kapsayıcı gelir, bölümler
   yürüdükçe uyanır. */
const WN_REVEAL_SEC = '[data-reveal]:not(.wn-seen), .doc-section:not(.wn-seen)';

export function wnRevealScan(kok) {
  if (!_wnRevealObs) return 0;
  const kap = kok || document;
  let n = 0;
  try {
    kap.querySelectorAll(WN_REVEAL_SEC).forEach((el) => {
      if (el.dataset.wnRevealOn === '1') return;   // çift gözlem yok
      el.dataset.wnRevealOn = '1';
      /* Sınıf BURADA takılmaz — bkz. gözlemcinin `else` kolu. Görünen bir
         öğeye `.wn-reveal` takmak onu bir kare için soldurur (opacity 1→0),
         sonra `.wn-seen` geri açar: kullanıcı içeriğin yanıp söndüğünü
         görür. Gizleme yalnız EKRAN DIŞINDA yapılır. */
      _wnRevealObs.observe(el);
      n++;
    });
  } catch (_) {}
  return n;
}

export function wnRevealInit() {
  if (_wnRevealObs) return;
  /* reduced-motion'da motor HİÇ açılmaz: `wn-reveal-on` takılmadığı için
     CSS de gizlemeye başlamaz — kullanıcı her şeyi olduğu yerde görür. */
  try { if (AnimUtils.prefersReducedMotion()) return; } catch (_) {}
  if (typeof IntersectionObserver === 'undefined') return;

  _wnRevealObs = new IntersectionObserver((girisler) => {
    for (const g of girisler) {
      if (g.isIntersecting) {
        /* Görünür. İki hâl de buraya düşer ve ikisi de doğrudur:
           · ekran dışındayken gizlenmişti → `.wn-seen` onu süzülerek açar;
           · hiç gizlenmemişti (ilk ekranda doğdu) → sınıf zaten yok, hiçbir
             şey olmaz. İlk ekranın içeriği animasyon beklemez. */
        g.target.classList.add('wn-seen');
        _wnRevealObs.unobserve(g.target);   // bir kez uyanır; yol geriye akmaz
      } else if (!g.target.classList.contains('wn-seen')) {
        /* Ekran DIŞINDA: gizlemenin görüleceği bir göz yok, şimdi güvenli.
           Bunu tarama anında yapmak görünen içeriği bir kare soldururdu. */
        g.target.classList.add('wn-reveal');
      }
    }
  }, {
    /* Alt kenardan %8 içeride tetiklenir: öğe tam görünmeden BAŞLAR, böylece
       kaydırma sırasında hareket "geç kalmış" değil "karşılayan" hissedilir. */
    rootMargin: '0px 0px -8% 0px',
    threshold: 0.05,
  });

  document.documentElement.classList.add('wn-reveal-on');
  wnRevealScan(document);
}

if (typeof window !== 'undefined') {
  window.wnRevealInit = wnRevealInit;
  window.wnRevealScan = wnRevealScan;
}

/* Saf görsel ve auth'suz — kendiliğinden boot eder (§5.2 çift boot ayrımı). */
(() => {
  const basla = () => { try { wnRevealInit(); } catch (_) {} };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', basla, { once: true });
  } else {
    basla();
  }
})();

/* ── Altyapı hazır ── */
console.info('[Wanderer] Infrastructure loaded');
