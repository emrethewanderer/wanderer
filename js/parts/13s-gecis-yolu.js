/* ═══════════════════════════════════════════════════════════════════
   13s — GEÇİŞ YOLU · 21 günlük yolculuk pusulası
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     "Yeni Bir Kişiye Geçiş Yapısı" (Zihniyet Devrimi, Manifesto VIII):
     hayalde o kişinin GÖZÜNDEN bak → düşünce+inançları → his+davranışları
     → seçimleri. Bu yapının TASARIM anı zaten 10D'de var (oikOpenDesign,
     4 adımlı sihirbaz) ve OKUMA ritüeli zaten 10D'de var (oikOpenReading,
     sabah/gece + ses kaydı). Bu modülün var oluş nedeni FARKLI: kitaptaki
     yapı BİR OTURUMLUK değil, GÜNLERCE SÜRDÜRÜLEN bir alışkanlıktır — ve
     bugün hiçbir şey kullanıcıya "bugün hangi organa gitmelisin" demiyor.

     13s bir ORGAN DEĞİL, bir PUSULADIR (K1: orkestra, organ değil). Yeni
     seans/tasarım/okuma mekaniği YAZMAZ — 21 gün boyunca, kitabın 4
     perdesine göre, HER GÜN mevcut organlardan birini işaret eder:
       • Perde 1 HAYAL        (gün 1-5)   → 10D tasarım/okuma + 10i hayal
       • Perde 2 DÜŞÜNCE/İNANÇ (gün 6-10)  → 10k Kendinle Konuşma (inanç seti)
       • Perde 3 HİS/DAVRANIŞ  (gün 11-15) → 10D okuma + 10i hayal
       • Perde 4 SEÇİM         (gün 16-21) → 10f Yol (söz/halka)
     Çekirdek tez: "Mesele Sensin" — kısa yol arama, o kişi ol.

   MEKANİK: SafeStorage'da tek durum (startDate + localISODate gün farkı
   = güncel gün). gyOpenToday() ilgili organ fonksiyonunu ÇAĞIRIR — LLM
   çağrısı, yeni ekran, yeni state YOK. 21. gün tamamlanınca "completed".

   Kalıcılık: SafeStorage per-uid (etw_gecis_v1_<uid>). Supabase YOK.
   Konvansiyon: hardcoded TR string + t() getter. TDZ güvenliği: window.*.
   Studio-only (Wanderer Studio kararı, 2026-07-19) — Wanderer (LLM) ücretsiz
   yüzünde yolculuk başlatılmaz.
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage, localISODate } from './00a-infrastructure.js';
import { t } from './15-i18n.js';

const STORAGE_KEY = 'etw_gecis_v1';
const TOTAL_DAYS = 21;

// Perde tanımı — kitabın 4 perdesi. organ: gyOpenToday'in çağıracağı window
// fonksiyon adı(ları); birden fazlaysa gün paritesine göre dönüşümlü.
const PERDELER = [
  { key: 'hayal',       ad: () => t('gy.perde.hayal', 'HAYAL'),               gunA: 1,  gunB: 5,  organlar: ['oikOpenReading', 'hayalAcSeans'] },
  { key: 'inanc',       ad: () => t('gy.perde.inanc', 'DÜŞÜNCE ve İNANÇ'),    gunA: 6,  gunB: 10, organlar: ['skOpen'] },
  { key: 'his',         ad: () => t('gy.perde.his', 'HİS ve DAVRANIŞ'),      gunA: 11, gunB: 15, organlar: ['oikOpenReading', 'hayalAcSeans'] },
  { key: 'secim',       ad: () => t('gy.perde.secim', 'SEÇİM'),              gunA: 16, gunB: 21, organlar: ['yolOpen'] },
];

function _key() { return `${STORAGE_KEY}_${(S.currentUser && S.currentUser.id) || 'anon'}`; }
function _default() { return { active: false, startDate: null, lastOpenDate: null, completed: false }; }

export function gySave() {
  try { SafeStorage.set(_key(), S._gecisYolu); } catch (e) { console.warn('gySave:', e && e.message); }
}
export function gyLoad() {
  try {
    const data = SafeStorage.get(_key());
    if (data && typeof data === 'object') S._gecisYolu = Object.assign(_default(), data);
  } catch (e) { console.warn('gyLoad:', e && e.message); }
}
export function gyInit() {
  if (!S._gecisYolu) S._gecisYolu = _default();
  gyLoad();
}

function _daysBetween(fromISO, toISO) {
  const a = Date.parse(fromISO + 'T00:00:00Z');
  const b = Date.parse(toISO + 'T00:00:00Z');
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.round((b - a) / 86400000);
}

export function gyIsActive() {
  return !!(S._gecisYolu && S._gecisYolu.active && !S._gecisYolu.completed);
}

/** Güncel gün (1-tabanlı). Yolculuk aktif değilse 0 döner. */
export function gyCurrentDay() {
  if (!gyIsActive()) return 0;
  const diff = _daysBetween(S._gecisYolu.startDate, localISODate());
  return Math.min(TOTAL_DAYS, Math.max(1, diff + 1));
}

export function gyPerdeForDay(day) {
  return PERDELER.find(p => day >= p.gunA && day <= p.gunB) || PERDELER[PERDELER.length - 1];
}

/** UI için tam durum özeti — Studio oda alt-satırı + bugün ekranı bunu okur. */
export function gyGetState() {
  if (!gyIsActive()) {
    return { active: false, completed: !!(S._gecisYolu && S._gecisYolu.completed), day: 0, totalDays: TOTAL_DAYS, perde: null };
  }
  const day = gyCurrentDay();
  const perde = gyPerdeForDay(day);
  return { active: true, completed: false, day, totalDays: TOTAL_DAYS, perde: perde.key, perdeAd: perde.ad() };
}

/** Yolculuğu bugünden başlat — zaten aktifse no-op. */
export function gyStart() {
  if (!S.currentUser || gyIsActive()) return;
  S._gecisYolu = { active: true, startDate: localISODate(), lastOpenDate: null, completed: false };
  gySave();
}

function _openOrgan(organName, day) {
  const fn = window[organName];
  if (typeof fn === 'function') { fn(); return true; }
  return false;
}

/** Bugünün organını aç — perde içinde birden fazla organ varsa gün paritesine
    göre dönüşümlü (aynı perdede hep aynı organa sıkışmasın). 21. günü aşınca
    yolculuğu "completed" kapatır. */
export function gyOpenToday() {
  if (!S.currentUser) return false;
  if (!gyIsActive()) { gyStart(); }
  const day = gyCurrentDay();
  if (day >= TOTAL_DAYS) {
    S._gecisYolu.completed = true;
    S._gecisYolu.active = false;
    gySave();
  }
  const perde = gyPerdeForDay(day);
  const organlar = perde.organlar;
  const organ = organlar[day % organlar.length] || organlar[0];
  S._gecisYolu.lastOpenDate = localISODate();
  gySave();
  return _openOrgan(organ, day);
}

/** Studio oda alt-satırı — wsSyncStudio çağırır (10s/10q kalıbı). */
export function gySyncRoomSub() {
  const el = document.getElementById('studio-gecisyolu-sub');
  if (!el) return;
  const st = gyGetState();
  if (st.completed) { el.textContent = t('gy.sub_completed', 'yol tamamlandı'); return; }
  if (!st.active) { el.textContent = t('gy.sub_invite', '21 günlük yolculuk'); return; }
  el.textContent = t('gy.sub_progress', 'gün {day}/{total} · {perde}')
    .replace('{day}', st.day).replace('{total}', st.totalDays).replace('{perde}', st.perdeAd);
}

/* ── window expose (TDZ-güvenli, main.js import + init bağlar) ── */
if (typeof window !== 'undefined') {
  window.gyInit = gyInit;
  window.gyStart = gyStart;
  window.gyOpenToday = gyOpenToday;
  window.gyIsActive = gyIsActive;
  window.gyGetState = gyGetState;
  window.gySyncRoomSub = gySyncRoomSub;
}
