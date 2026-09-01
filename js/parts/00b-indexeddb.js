/* ═══════════════════════════════════════════════════════════════
   IndexedDB KATMANI — Büyük veriler için offline cache
   chat_history, summaries, journey chapters gibi büyük verileri cache'ler.
   ═══════════════════════════════════════════════════════════════ */

const _DB_NAME    = 'etw-idb-v1';
const _DB_VERSION = 2;

// Object store isimleri
export const IDB_STORES = Object.freeze({
  CHAT_HISTORY: 'chat_history',
  SUMMARIES:    'chat_summaries',
  JOURNEY:      'journey_chapters',
  EMBEDDINGS:   'kb_embeddings',
  RECORDINGS:   'voice_recordings',   // Programlama Çalışması: olumlama/öz-diyalog ses kayıtları (blob)
});

let _db = null;

export async function idbOpen() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(_DB_NAME, _DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      // chat_history: userId + sessionId ile aranacak
      if (!db.objectStoreNames.contains(IDB_STORES.CHAT_HISTORY)) {
        const store = db.createObjectStore(IDB_STORES.CHAT_HISTORY, { keyPath: 'id' });
        store.createIndex('by_user', 'user_id', { unique: false });
        store.createIndex('by_session', 'session_id', { unique: false });
        store.createIndex('by_user_created', ['user_id', 'created_at'], { unique: false });
      }
      // chat_summaries: userId + day_key ile aranacak
      if (!db.objectStoreNames.contains(IDB_STORES.SUMMARIES)) {
        const store = db.createObjectStore(IDB_STORES.SUMMARIES, { keyPath: 'id' });
        store.createIndex('by_user', 'user_id', { unique: false });
        store.createIndex('by_user_day', ['user_id', 'day_key'], { unique: false });
      }
      // journey_chapters: userId ile aranacak
      if (!db.objectStoreNames.contains(IDB_STORES.JOURNEY)) {
        const store = db.createObjectStore(IDB_STORES.JOURNEY, { keyPath: 'id' });
        store.createIndex('by_user', 'user_id', { unique: false });
      }
      // kb_embeddings: userId + chunk_id
      if (!db.objectStoreNames.contains(IDB_STORES.EMBEDDINGS)) {
        const store = db.createObjectStore(IDB_STORES.EMBEDDINGS, { keyPath: 'id' });
        store.createIndex('by_user', 'user_id', { unique: false });
      }
      // voice_recordings: Programlama Çalışması — kullanıcının kendi sesini
      // kaydedip dinlediği ses blob'ları. key: serbest string (ör. gecis_<cardId>).
      if (!db.objectStoreNames.contains(IDB_STORES.RECORDINGS)) {
        const store = db.createObjectStore(IDB_STORES.RECORDINGS, { keyPath: 'key' });
        store.createIndex('by_user', 'user_id', { unique: false });
      }
    };

    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror   = (e) => reject(e.target.error);
  });
}

function _tx(storeName, mode = 'readonly') {
  return _db.transaction(storeName, mode).objectStore(storeName);
}

/* ── Genel CRUD yardımcıları ── */

export async function idbPut(storeName, record) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const req = _tx(storeName, 'readwrite').put(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

export async function idbPutBulk(storeName, records) {
  const db = await idbOpen();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  return new Promise((resolve, reject) => {
    records.forEach(r => store.put(r));
    tx.oncomplete = () => resolve(records.length);
    tx.onerror    = (e) => reject(e.target.error);
  });
}

export async function idbGet(storeName, key) {
  await idbOpen();
  return new Promise((resolve, reject) => {
    const req = _tx(storeName).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror   = (e) => reject(e.target.error);
  });
}

export async function idbGetByIndex(storeName, indexName, value) {
  await idbOpen();
  return new Promise((resolve, reject) => {
    const req = _tx(storeName).index(indexName).getAll(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

export async function idbDelete(storeName, key) {
  await idbOpen();
  return new Promise((resolve, reject) => {
    const req = _tx(storeName, 'readwrite').delete(key);
    req.onsuccess = () => resolve(true);
    req.onerror   = (e) => reject(e.target.error);
  });
}

/* ── Domain-specific yardımcılar ── */

export async function idbSaveChatMessages(messages) {
  if (!messages?.length) return;
  return idbPutBulk(IDB_STORES.CHAT_HISTORY, messages);
}

export async function idbGetChatByUser(userId) {
  return idbGetByIndex(IDB_STORES.CHAT_HISTORY, 'by_user', userId);
}

/* ── Ses kayıtları (Programlama Çalışması) ── */

export async function idbSaveRecording(key, blob, meta = {}) {
  if (!key || !blob) return;
  return idbPut(IDB_STORES.RECORDINGS, {
    key,
    blob,
    user_id: meta.user_id || null,
    duration: meta.duration || 0,
    mime: blob.type || 'audio/webm',
    created_at: meta.created_at || Date.now(),
  });
}

export async function idbGetRecording(key) {
  return idbGet(IDB_STORES.RECORDINGS, key);
}

export async function idbDeleteRecording(key) {
  return idbDelete(IDB_STORES.RECORDINGS, key);
}
