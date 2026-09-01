/* ═══════════════════════════════════════════════════════════════════
   13f — ZAMAN DOKUSU · Saate duyarlı yüzey sıcaklığı (canlı uygulama)
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Uygulama bir "yer"dir; yerin ışığı saatle değişir. Obsidyen taban
     sabit kalır — yalnızca ambient şafak token'ları (--dawn-*) günün
     evresine göre ince bir ısı kayması yapar: sabah serin gül/indigo,
     gündüz dengeli, akşam kehribar ısınır, gece indigo derinleşir.
     Selamlama ("İyi geceler.") zaten saate duyarlı — yüzey de ona katılır.

   MEKANİK: <html> elementine tw-morning|tw-day|tw-evening|tw-night
     sınıfı takılır; CSS tarafı base.css "ZAMAN DOKUSU" bloğunda.
     10 dakikada bir + görünürlük değişiminde yeniden sınıflanır.
   Kalıcılık yok (saf görsel). Konvansiyon: window.tw* expose.
═══════════════════════════════════════════════════════════════════ */

const _CLASSES = ['tw-morning', 'tw-day', 'tw-evening', 'tw-night'];

function _phase(h) {
  if (h >= 5 && h < 11) return 'tw-morning';
  if (h >= 11 && h < 17) return 'tw-day';
  if (h >= 17 && h < 22) return 'tw-evening';
  return 'tw-night';
}

export function twSync() {
  try {
    const cls = _phase(new Date().getHours());
    const root = document.documentElement;
    if (root.classList.contains(cls)) return cls;
    _CLASSES.forEach(c => root.classList.remove(c));
    root.classList.add(cls);
    return cls;
  } catch (_) { return null; }
}

export function twInit() {
  twSync();
  // 10 dakikada bir evre kontrolü + sekme geri görünür olunca tazele
  setInterval(twSync, 10 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) twSync(); });
}

// Saf görsel, auth'a bağımlı değil — modül yüklenir yüklenmez uygula
// (bundle <head> içinde senkron koşar; documentElement her zaman var).
twInit();

/* ── window expose ── */
if (typeof window !== 'undefined') {
  window.twSync = twSync;
}
