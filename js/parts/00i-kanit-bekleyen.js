/* ═══════════════════════════════════════════════════════
   00i — KANIT BEKLEYEN ALANLAR · Kanıt gelmeden konuşma
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Uygulama kullanıcı hakkında bir şey söylüyorsa kaynağı
     kullanıcı olmak zorundadır — "Mesele Sensin" tezinin
     boot'a düşen payı budur. Oysa açılışın ilk saniyesinde
     ekran "0 gün seri" diyordu: on yedi gündür gelen birine,
     bir an için, "serin yok" demek. `0` masum bir sayı değil;
     kanıtı gelmemiş bir iddianın kılığıdır (§6.10).
     Bu katman uygulamaya susmayı öğretir. Sessizlik bir
     eksiklik değil dürüstlüktür; söz geldiğinde sıçrayarak
     değil BELİREREK gelir.
   MEKANİK / MİMARİ / TEK GİRİŞ:
     `_src.html`'de kanıt bekleyen alan `data-kb="1"` taşır;
     CSS onu `visibility:hidden` yapar (yer korunur → sıçrama
     ve kayma olmaz). Kanıt İKİ yoldan gelir: ① MutationObserver
     içerik değişimini yakalar (0 → 42), ② `kbSerbest()` zincirin
     ucunda (`bnHazir`, 00h) kalanları bırakır — değeri GERÇEKTEN
     0 olan alanda mutation olmaz ve o alan sonsuza dek gizli
     kalırdı. Sessizlik ≠ kayboluş.
   Kalıcılık: Kalıcılık yok — DOM metnine ASLA dokunulmaz.
              (`10-features-w2.js:119` gibi yerler textContent'i
              `parseInt` ile veri olarak okuyor; metni değiştirmek
              NaN üretirdi. Bu katman yalnız GÖRÜNÜRLÜĞÜ yönetir.)
   Konvansiyon: window.kb* expose; stiller css/parts/base.css
                ([data-kb] + .kb-belirdi); import'suz saf yaprak
═══════════════════════════════════════════════════════ */

/* ─── 1. SABİTLER ─── */

const NITELIK = 'data-kb';
const ARIA_BIZIM = 'data-kb-aria';   // aria-hidden'ı BİZ mi ekledik?
const BELIRDI = 'kb-belirdi';

let _gozcu = null;
// Tek seferlik bir "kuruldu" bayrağı yanlıştı: sonradan DOM'a giren işaretli
// alanlar (tembel çizilen paneller) hiç izlenmezdi. Bayrak yerine ELEMENT
// bazlı iz tutulur — kbKur() böylece hem idempotent hem tekrar çağrılabilir.
const _izlenen = new WeakSet();

/* ─── 2. SERBEST BIRAKMA ─── */

function _serbest(el) {
  if (!el || !el.hasAttribute || !el.hasAttribute(NITELIK)) return false;
  el.removeAttribute(NITELIK);
  // Yalnız kendi eklediğimiz aria-hidden'ı kaldır: `cl-model-glyph` gibi
  // dekoratif alanlar zaten aria-hidden'dır, onu geri açmak yanlış olur.
  if (el.getAttribute(ARIA_BIZIM) === '1') {
    el.removeAttribute('aria-hidden');
    el.removeAttribute(ARIA_BIZIM);
  }
  el.classList.add(BELIRDI);
  return true;
}

/**
 * Kalan bütün bekleyen alanları bırakır. Zincirin ucundan (`bnHazir`)
 * çağrılır: hidrasyon bitmiştir, bundan sonra beklemek susmak değil
 * kaybolmaktır. Bırakılan alan sayısını döndürür.
 */
export function kbSerbest() {
  let n = 0;
  try {
    document.querySelectorAll('[' + NITELIK + ']').forEach((el) => { if (_serbest(el)) n++; });
  } catch (_) {}
  return n;
}

/** Hâlâ kanıt bekleyen alan sayısı — doğrulama ve test yüzeyi. */
export function kbBekleyen() {
  try { return document.querySelectorAll('[' + NITELIK + ']').length; } catch (_) { return 0; }
}

/* ─── 3. GÖZCÜ ─── */

/**
 * İçerik değişimini yakalar. `characterData` + `childList` birlikte gerekir:
 * `el.textContent = '42'` metin düğümünü DEĞİŞTİRİR (characterData) ama boş
 * bir alana ilk yazım düğümü EKLER (childList).
 */
export function kbKur() {
  if (typeof document === 'undefined') return;
  let hedefler;
  try { hedefler = document.querySelectorAll('[' + NITELIK + ']'); } catch (_) { return; }
  if (!hedefler || !hedefler.length) return;

  if (typeof MutationObserver === 'function' && !_gozcu) _gozcu = new MutationObserver((kayitlar) => {
    for (const k of kayitlar) {
      const dugum = k.target;
      const el = (dugum && dugum.nodeType === 1) ? dugum : (dugum && dugum.parentElement);
      if (!el) continue;
      // Değişim iç düğümde olmuş olabilir; işaretli atayı ara.
      const isaretli = el.hasAttribute?.(NITELIK) ? el : el.closest?.('[' + NITELIK + ']');
      if (isaretli) _serbest(isaretli);
    }
  });
  hedefler.forEach((el) => {
    if (_izlenen.has(el)) return;
    _izlenen.add(el);
    // Bekleyen alan ekran okuyucuya da okunmamalı — görsel yalanı susturup
    // sesli yalanı bırakmak yarım dürüstlüktür.
    if (!el.hasAttribute('aria-hidden')) {
      el.setAttribute('aria-hidden', 'true');
      el.setAttribute(ARIA_BIZIM, '1');
    }
    try { _gozcu?.observe(el, { childList: true, characterData: true, subtree: true }); } catch (_) {}
  });
}

/* ─── 4. BOOT (saf görsel, auth'suz → kendiliğinden) ─── */

(function _boot() {
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => kbKur(), { once: true });
  } else {
    kbKur();
  }
})();

/* ─── 5. EXPOSE ─── */

if (typeof window !== 'undefined') {
  window.kbSerbest = kbSerbest;
  window.kbBekleyen = kbBekleyen;
  window.kbKur = kbKur;
}
