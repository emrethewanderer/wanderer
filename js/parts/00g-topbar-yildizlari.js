/* ═══════════════════════════════════════════════════════
   00g — TOPBAR YILDIZLARI · Maybach tavanı, her ekranda
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Uygulama bir yer'dir; o yerin bir göğü olmalı. Gök yalnız
     "Bugün"ün üstünde durursa gezgin odadan odaya geçerken
     tavanı kaybeder — her eşikte başka bir binaya girmiş olur.
     Bu katman göğü bütün odalara taşır: nereye gidersen git
     başının üstünde aynı yıldızlar durur.
   MEKANİK / MİMARİ / TEK GİRİŞ:
     Desen TEK yerde (STARS) yaşar; wsTopbarStars() her
     `.ws-topbar`'a aynı katmanı serper. Yıldızlar ekrandan
     ekrana YER DEĞİŞTİRMEZ — kayan bir gök, geçişte zıplar.
     Boyama sırası CSS'in işi (.ws-topbar-stars, z-index:-1 ile
     barın zemininin üstünde ama metnin arkasında).
   Kalıcılık: Kalıcılık yok — saf görsel katman.
   Konvansiyon: window.wsTopbarStars expose; stiller
                css/parts/sentez.css (.ws-topbar'ın evi)
═══════════════════════════════════════════════════════ */

/* ─── 1. DESEN ─── */

/* Bugün'ün üst barı için elle kalibre edilen dizilim (2026-07-03) — buraya
   birebir taşındı. Sol-sağ dengeli dağılım + üç yoğunluk (1 / 1.5 / 2–2.5px)
   + asenkron süre/gecikme: hiçbir iki yıldız aynı anda parlamaz, göz bir
   "ritim" değil bir doku görür. Yüzde konum kullanılır — slim bar (68px) ve
   Bugün'ün hero barı (132px) aynı deseni kendi yüksekliğine oranlar. */
const STARS = [
  { x: '6%',  y: '22%', s: '1.5px', d: '4.2s', delay: '0.3s' },
  { x: '14%', y: '60%', s: '1px',   d: '3.6s', delay: '1.8s' },
  { x: '21%', y: '38%', s: '2px',   d: '5s',   delay: '0.9s' },
  { x: '29%', y: '74%', s: '1px',   d: '3.9s', delay: '3.1s' },
  { x: '35%', y: '18%', s: '1.5px', d: '4.6s', delay: '2.2s' },
  { x: '41%', y: '52%', s: '1px',   d: '3.4s', delay: '0.6s' },
  { x: '48%', y: '30%', s: '2.5px', d: '5.4s', delay: '1.4s' },
  { x: '54%', y: '66%', s: '1px',   d: '3.8s', delay: '2.7s' },
  { x: '60%', y: '16%', s: '1.5px', d: '4.4s', delay: '0.2s' },
  { x: '66%', y: '44%', s: '1px',   d: '3.6s', delay: '3.4s' },
  { x: '72%', y: '70%', s: '2px',   d: '5.1s', delay: '1.1s' },
  { x: '78%', y: '28%', s: '1px',   d: '3.5s', delay: '2.4s' },
  { x: '83%', y: '56%', s: '1.5px', d: '4.8s', delay: '0.8s' },
  { x: '89%', y: '20%', s: '1px',   d: '3.7s', delay: '3.6s' },
  { x: '94%', y: '62%', s: '2px',   d: '5.3s', delay: '1.6s' },
  { x: '10%', y: '82%', s: '1px',   d: '4s',   delay: '2.9s' },
  { x: '44%', y: '84%', s: '1.5px', d: '4.3s', delay: '0.5s' },
  { x: '63%', y: '86%', s: '1px',   d: '3.9s', delay: '1.9s' }
];

/* ─── 2. SERPME ─── */

function _katman() {
  const kat = document.createElement('div');
  kat.className = 'ws-topbar-stars';
  kat.setAttribute('aria-hidden', 'true');
  for (const y of STARS) {
    const s = document.createElement('span');
    // Konum/ritim custom prop'la taşınır (.ws-st-dust'la aynı yazım) — CSS
    // tek kural yazar, her yıldız kendi değerini getirir.
    s.style.cssText = `--x:${y.x};--y:${y.y};--s:${y.s};--d:${y.d};--delay:${y.delay};`;
    kat.appendChild(s);
  }
  return kat;
}

/**
 * Yıldız katmanı olmayan her `.ws-topbar`'a onu serper.
 * Tekrar çağrılabilir (idempotent): katmanı olan bar atlanır.
 * @param {ParentNode} [kok=document] - taranacak kök
 * @returns {number} yeni katman takılan bar sayısı
 */
export function wsTopbarStars(kok) {
  let n = 0;
  try {
    const kap = kok || document;
    kap.querySelectorAll('.ws-topbar').forEach(bar => {
      if (bar.querySelector(':scope > .ws-topbar-stars')) return;
      // İLK çocuk olmalı: negatif z-index'li katman, kendisinden sonra gelen
      // statik metin akışının arkasında kalır (bkz. sentez.css yorumu).
      bar.prepend(_katman());
      n++;
    });
  } catch (e) { console.warn('wsTopbarStars:', e && e.message); }
  return n;
}

/* ─── 3. BOOT (saf görsel, auth'suz → kendiliğinden) ─── */

(function _boot() {
  // Barlar `_src.html`'de statiktir; DOM hazır olur olmaz tek geçiş yeter.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => wsTopbarStars(), { once: true });
  } else {
    wsTopbarStars();
  }
})();

if (typeof window !== 'undefined') {
  window.wsTopbarStars = wsTopbarStars;
}
