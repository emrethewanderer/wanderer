/**
 * Tests for js/parts/12c-kart-gorsel.js — YAŞAYAN SAHNE (hareket altyapısı)
 *
 * "Kart bir resim değil, bir pencere": sahne durmadan kıpırdar ve bu bir ÖDÜL
 * değil, kartın tabiatıdır (`opts.live` 2026-08-07'de emekli oldu). Bu dosya
 * altyapının üç sözleşmesini mühürler:
 *   1. Sınıf DAİMA dış sarmalayıcıya basılır — motifin kendi düğümüne asla.
 *      Sebep bir gotcha: SVG'de CSS transform, elemanın `transform`
 *      presentation attribute'unu EZER; sınıfı motifin kendisine koymak
 *      translate/scale taşıyan her motifi kartın köşesine fırlatırdı.
 *   2. K2'nin üç hâli: donuk (kilitli/sisli) · kısık (ızgara) · tam.
 *      Kilit İKİ yoldan gelir (fog ve locked) — ızgara `locked` verip `fog`
 *      vermez, ikisi de kapıya bağlı değilse kilitli kart yaşar.
 *   3. Haritada olmayan motif donuktur: zincir (esaret) ve kapan (tuzak)
 *      kıpırdamaz — sessizlik de bir karardır.
 */

import { describe, it, expect } from 'vitest';
import { ikvScene, ikvCardFace, ikvEnsureStyles, ikvMotionScan, ikvComposeBackdrop } from '../js/parts/12c-kart-gorsel.js';

const KART = { id: 'temel-ozsevgi-kok', name: 'Kendi Dostu Olan', category: 'temel', virtue: 'ozsevgi', glyph: 'wanderer' };

// Motiflerin hepsi tek sahnede: gök (bulut→suzul), nesne (terazi→salin,
// pusula→donen), orta (agac→salin), bitki, figür.
const SAHNE = {
  cerceve: 'dik', gok: 'bulut', uzak: ['deniz'], orta: ['agac'],
  nesne: ['terazi', 'pusula'], bitki: 'filiz', yildiz: 6,
};

const sahneli = (opts = {}) => ikvScene(KART, { sahne: SAHNE, ...opts });

describe('hareket sınıfı DAİMA sarmalayıcıda (transform ezme gotcha\'sı)', () => {
  it('motifin kendi transform taşıyan düğümü hareket sınıfı almaz', () => {
    const svg = sahneli();
    // agac ve figür kendi <g transform="translate(...) scale(...)"> ile gelir.
    // Aynı düğümde hem transform attribute'u hem ikv-mv sınıfı OLMAMALI.
    const kirik = /<g[^>]*class="[^"]*ikv-mv[^"]*"[^>]*transform=/.test(svg)
      || /<g[^>]*transform=[^>]*class="[^"]*ikv-mv[^"]*"/.test(svg);
    expect(kirik, 'ikv-mv sınıfı transform taşıyan düğüme basılmış').toBe(false);
  });

  it('sarmalayıcı gerçekten basılır — sahne canlı', () => {
    const svg = sahneli();
    expect(svg).toContain('ikv-mv--suzul');   // bulut
    expect(svg).toContain('ikv-mv--salin');   // agac + terazi + bitki
    expect(svg).toContain('ikv-mv--donen');   // pusula
    expect(svg).toContain('ikv-mv--nefes');   // figür
    expect(svg).toContain('ikv-mv--dalga');   // deniz
  });

  it('haritada olmayan motif sarmalanmaz — zincir ve kapan kıpırdamaz', () => {
    const svg = ikvScene(KART, { sahne: { cerceve: 'dik', orta: ['kapan'], nesne: ['zincir'], fig: { mod: 'yok' }, yildiz: 0 } });
    expect(svg).not.toContain('ikv-mv--');
  });
});

describe('ışık nabzı — motifin tamamı değil, ışık veren parçası yanar', () => {
  const isikli = (orta) => ikvScene(KART, { sahne: { cerceve: 'dik', orta: [orta], fig: { mod: 'yok' }, yildiz: 0 } });

  it('fenerin ALEVİ yanar, direği durmaz — sınıf ışık düğümünde', () => {
    const svg = isikli('fener');
    expect(svg).toContain('ikv-isik');
    // fenerin gövde path'i (stroke-width 7) ışık sınıfı ALMAZ
    expect(/stroke-width="7"[^>]*ikv-isik/.test(svg)).toBe(false);
  });

  it('her ışık kendi tabanını korur (--o) — sahnenin derinliği düzleşmez', () => {
    expect(isikli('kapi')).toContain('--o:0.35');     // eşik ışığı sönük
    expect(isikli('fener')).toContain('--o:1');       // alev tam
  });

  it('titrek ışık yalnız ateş/fenerde — kapı eşiği düzgün nefes alır', () => {
    expect(isikli('fener')).toContain('ikv-isik--titrek');
    expect(isikli('kapi')).not.toContain('ikv-isik--titrek');
  });

  it('kilitli kartta ışık da söner', () => {
    const svg = ikvScene(KART, { sahne: { orta: ['fener'] }, locked: true });
    expect(svg).toContain('ikv-scene-svg--donuk');    // CSS kapısı ışığı da durdurur
  });

  it('aynı motifin iki ışığı senkron yanmaz (şehir "flaşör" olmaz)', () => {
    const svg = ikvScene(KART, { sahne: { uzak: ['sehir'], fig: { mod: 'yok' } } });
    const gecikmeler = [...svg.matchAll(/animation-delay:(-?[\d.]+)s/g)].map(m => m[1]);
    expect(new Set(gecikmeler).size).toBeGreaterThan(1);
  });
});

describe('K2 — üç canlılık hâli', () => {
  it('tam sahne: hâl sınıfı yok, her şey yaşar', () => {
    const svg = sahneli();
    expect(svg).toContain('class="ikv-scene-svg"');
    expect(svg).not.toContain('--donuk');
    expect(svg).not.toContain('--kisik');
  });

  it('sisli kart donuktur', () => {
    expect(sahneli({ fog: true })).toContain('ikv-scene-svg--donuk');
  });

  it('KİLİTLİ kart da donuktur — ızgara locked verir, fog vermez', () => {
    expect(sahneli({ locked: true })).toContain('ikv-scene-svg--donuk');
  });

  it('ızgara hücresi kısıktır ve motif sınıfı hiç basılmaz (gök hariç)', () => {
    const svg = sahneli({ mini: true });
    expect(svg).toContain('ikv-scene-svg--kisik');
    expect(svg).toContain('ikv-mv--suzul');        // gök yaşar
    expect(svg).not.toContain('ikv-mv--salin');    // orta/bitki susar
    expect(svg).not.toContain('ikv-mv--nefes');    // figür susar
  });

  it('ikvCardFace kilidi sahneye geçirir (10q köprüsü kopmasın)', () => {
    expect(ikvCardFace(KART, { locked: true, sahne: SAHNE })).toContain('ikv-scene-svg--donuk');
    expect(ikvCardFace(KART, { sahne: SAHNE })).not.toContain('ikv-scene-svg--donuk');
  });
});

// Her render kendi <defs> id'sini alır (uid sayacı) — karşılaştırmadan önce
// o tek farkı normalize et, yoksa aynı sahne kendine eşit çıkmaz.
const norm = (s) => s.replace(/ikv\d+/g, 'UID');

describe('opts.live emekli oldu — canlılık ödül değil, tabiat', () => {
  it('live:true sahneyi DEĞİŞTİRMEZ (eski çağıran kırılmaz, ayrıcalık da doğmaz)', () => {
    expect(norm(sahneli({ live: true }))).toBe(norm(sahneli()));
    expect(norm(sahneli({ live: false }))).toBe(norm(sahneli()));
  });

  it('eski --live sınıfı artık hiçbir yerde basılmaz', () => {
    expect(sahneli({ live: true })).not.toContain('ikv-scene-svg--live');
  });
});

describe('detay arka planı da yaşar', () => {
  it('ikvComposeBackdrop hareket taşır — kartın dünyası donmuş bir duvar değil', () => {
    const bd = ikvComposeBackdrop({ ...KART, sahne: SAHNE });
    expect(bd).toContain('ikv-mv--');
  });
});

describe('stil sözleşmesi', () => {
  it('reduced-motion bloğu tüm hareket sınıflarını durdurur (§5 istisnasız kural)', () => {
    document.getElementById('ikv-styles')?.remove();
    ikvEnsureStyles();
    const css = document.getElementById('ikv-styles').textContent;
    expect(css).toContain('prefers-reduced-motion');
    const rm = css.slice(css.indexOf('prefers-reduced-motion'));
    expect(rm).toContain('.ikv-mv');
    expect(rm).toContain('animation:none!important');
  });

  it('fill-box olmadan motifler kartın ortasından döner — kural CSS\'te', () => {
    document.getElementById('ikv-styles')?.remove();
    ikvEnsureStyles();
    const css = document.getElementById('ikv-styles').textContent;
    expect(css).toContain('transform-box:fill-box');
  });

  it('ekran dışı sahne duraklatılır', () => {
    document.getElementById('ikv-styles')?.remove();
    ikvEnsureStyles();
    expect(document.getElementById('ikv-styles').textContent).toContain('animation-play-state:paused');
  });
});

describe('ikvMotionScan — görünmeyen sahne oynamaz', () => {
  it('sahneleri izlemeye alır ve aynı düğümü iki kez gözlemez', () => {
    const host = document.createElement('div');
    host.innerHTML = sahneli() + sahneli();
    document.body.appendChild(host);
    const ilk = ikvMotionScan(host);
    const ikinci = ikvMotionScan(host);
    // Ortam IntersectionObserver taşımıyorsa fonksiyon 0 döner (savunmacı) —
    // taşıyorsa ilk tarama iki sahneyi alır, ikincisi hiçbirini.
    if (ilk > 0) { expect(ilk).toBe(2); expect(ikinci).toBe(0); }
    expect(ikinci).toBe(0);
    host.remove();
  });

  it('kap yoksa/DOM bozuksa patlamaz — sessizce düşer', () => {
    expect(() => ikvMotionScan(null)).not.toThrow();
  });

  /* Tarama ÇAĞIRANA bırakılmaz: sahneler onlarca yüzeyden basılıyor ve her
     birine "taramayı unutma" borcu yüklemek er geç unutulan bir yüzeydir.
     Planlayıcı requestAnimationFrame KULLANMAMALI — rAF görünmeyen sekmede
     hiç ateşlenmez ve sahneler izlemeye hiç alınmaz (bu tam olarak yaşandı:
     panel gizliyken hiçbir sahne izlenmiyordu). */
  it('sahne üretimi taramayı KENDİ planlar — gizli sekmede de', async () => {
    const gozlenen = [];
    const eski = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = class {
      constructor(cb) { this.cb = cb; }
      observe(el) { gozlenen.push(el); }
      disconnect() {}
    };
    try {
      const host = document.createElement('div');
      document.body.appendChild(host);
      host.innerHTML = sahneli();            // hiç kimse ikvMotionScan çağırmıyor
      await new Promise(r => setTimeout(r, 10));
      expect(gozlenen.length).toBeGreaterThan(0);
      host.remove();
    } finally {
      if (eski) globalThis.IntersectionObserver = eski; else delete globalThis.IntersectionObserver;
    }
  });
});
