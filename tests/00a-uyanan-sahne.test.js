/**
 * UYANAN SAHNE (.wn-reveal) — kaydırmaya bağlı kademeli giriş.
 *
 * Motor: `js/parts/00a-infrastructure.js` §16 (wnRevealInit / wnRevealScan).
 *
 * Neden burada sınanıyor: bu motorun davranışı preview'da doğrulanamaz.
 * Tarayıcı, sayfa `visibilityState === 'hidden'` iken IntersectionObserver
 * callback'lerini HİÇ çalıştırmaz — Browser pane arka plandayken ham bir IO
 * bile tetiklenmedi (2026-08-29 ölçümü). Kodla ilgisi yok, ortamla ilgili;
 * bu yüzden gözlemci burada sahte bir IO ile sürülür ve mantık doğrudan
 * ölçülür. Preview yalnız CSS tarafını (opaklık/geçiş) doğrular.
 *
 * Sınanan sözleşmeler:
 *   1. Gizleme YALNIZ ekran dışında olur — görünen içerik bir kare bile
 *      solmaz. (İlk yazımda sınıf tarama anında takılıyordu; ekrandaki
 *      bölüm önce kayboluyor sonra geri geliyordu.)
 *   2. Bir kez uyanan sönmez: `.wn-seen` kalıcı, gözlem düşer — yol geriye
 *      akmaz (§0.1 Yolculuk).
 *   3. reduced-motion'da motor HİÇ açılmaz; `wn-reveal-on` takılmadığı için
 *      CSS de gizlemeye başlamaz.
 *   4. IntersectionObserver yoksa motor sessizce düşer, içerik görünür
 *      kalır (§5.2 "asla bloklama").
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/* ─── Sahte IntersectionObserver — callback'i testin elinde tutar ─── */
let _sonGozlemci = null;
class SahteIO {
  constructor(cb, opts) {
    this.cb = cb; this.opts = opts;
    this.gozlenen = new Set();
    _sonGozlemci = this;
  }
  observe(el) { this.gozlenen.add(el); }
  unobserve(el) { this.gozlenen.delete(el); }
  disconnect() { this.gozlenen.clear(); }
  /** Testin sürücüsü: bir öğeyi görünür/görünmez ilan et. */
  tetikle(el, gorunur) { this.cb([{ target: el, isIntersecting: gorunur }]); }
}

async function motoruYukle({ reduced = false, ioVar = true } = {}) {
  vi.resetModules();
  _sonGozlemci = null;
  document.documentElement.className = '';
  document.body.innerHTML = '';
  window.matchMedia = (q) => ({
    matches: reduced && /reduce/.test(q),
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  });
  if (ioVar) { global.IntersectionObserver = SahteIO; window.IntersectionObserver = SahteIO; }
  else { delete global.IntersectionObserver; delete window.IntersectionObserver; }
  return import('../js/parts/00a-infrastructure.js');
}

function bolum(id, attr = 'data-reveal') {
  const el = document.createElement('div');
  el.id = id;
  if (attr === 'data-reveal') el.setAttribute('data-reveal', '');
  else el.className = attr;
  document.body.appendChild(el);
  return el;
}

describe('uyanan sahne — gizleme yalnız ekran dışında olur', () => {
  it('tarama sınıf TAKMAZ: görünen içerik bir kare bile solmaz', async () => {
    const mod = await motoruYukle();
    const el = bolum('a');
    mod.wnRevealInit();
    mod.wnRevealScan(document);
    // Gözleme alındı ama henüz hiçbir sınıf yok — kritik sözleşme.
    expect(el.classList.contains('wn-reveal')).toBe(false);
    expect(el.classList.contains('wn-seen')).toBe(false);
    expect(_sonGozlemci.gozlenen.has(el)).toBe(true);
  });

  it('ekran dışındaki öğe gizlenir', async () => {
    const mod = await motoruYukle();
    const el = bolum('a');
    mod.wnRevealInit(); mod.wnRevealScan(document);
    _sonGozlemci.tetikle(el, false);
    expect(el.classList.contains('wn-reveal')).toBe(true);
    expect(el.classList.contains('wn-seen')).toBe(false);
  });

  it('ilk ekranda doğan öğe hiç gizlenmeden uyanır', async () => {
    const mod = await motoruYukle();
    const el = bolum('a');
    mod.wnRevealInit(); mod.wnRevealScan(document);
    _sonGozlemci.tetikle(el, true);          // hiç ekran dışı olmadı
    expect(el.classList.contains('wn-seen')).toBe(true);
    expect(el.classList.contains('wn-reveal')).toBe(false);
  });

  it('gizlenen öğe görününce uyanır ve gözlemden düşer', async () => {
    const mod = await motoruYukle();
    const el = bolum('a');
    mod.wnRevealInit(); mod.wnRevealScan(document);
    _sonGozlemci.tetikle(el, false);
    _sonGozlemci.tetikle(el, true);
    expect(el.classList.contains('wn-reveal')).toBe(true);   // sınıf kalır
    expect(el.classList.contains('wn-seen')).toBe(true);     // ama açılmış
    expect(_sonGozlemci.gozlenen.has(el)).toBe(false);
  });
});

describe('uyanan sahne — yol geriye akmaz', () => {
  it('uyanan öğe tekrar ekran dışına çıkınca SÖNMEZ', async () => {
    const mod = await motoruYukle();
    const el = bolum('a');
    mod.wnRevealInit(); mod.wnRevealScan(document);
    _sonGozlemci.tetikle(el, true);
    // Gözlemden düştüğü için gerçekte bu çağrı hiç gelmez; yine de
    // gelseydi bile `.wn-seen` korunmalı — sözleşme sınıfta, gözlemde değil.
    _sonGozlemci.tetikle(el, false);
    expect(el.classList.contains('wn-seen')).toBe(true);
  });
});

describe('uyanan sahne — tarama sözleşmesi', () => {
  it('.doc-section da gözlenir: belge katmanı tek satırla kapsanır', async () => {
    const mod = await motoruYukle();
    const el = bolum('a', 'doc-section');
    mod.wnRevealInit();
    expect(mod.wnRevealScan(document)).toBe(1);
    expect(_sonGozlemci.gozlenen.has(el)).toBe(true);
  });

  it('ikinci tarama aynı öğeyi tekrar gözlemez', async () => {
    const mod = await motoruYukle();
    bolum('a'); bolum('b');
    mod.wnRevealInit();
    expect(mod.wnRevealScan(document)).toBe(2);
    expect(mod.wnRevealScan(document)).toBe(0);
  });

  it('sonradan gelen içerik taranınca gözleme girer', async () => {
    const mod = await motoruYukle();
    mod.wnRevealInit(); mod.wnRevealScan(document);
    const yeni = bolum('sonradan');
    expect(mod.wnRevealScan(document)).toBe(1);
    expect(_sonGozlemci.gozlenen.has(yeni)).toBe(true);
  });
});

describe('uyanan sahne — asla bloklama (§5.2)', () => {
  it('reduced-motion: motor hiç açılmaz, kapı sınıfı takılmaz', async () => {
    const mod = await motoruYukle({ reduced: true });
    const el = bolum('a');
    mod.wnRevealInit();
    expect(document.documentElement.classList.contains('wn-reveal-on')).toBe(false);
    expect(mod.wnRevealScan(document)).toBe(0);
    expect(el.classList.contains('wn-reveal')).toBe(false);
  });

  it('IntersectionObserver yoksa motor sessizce düşer', async () => {
    const mod = await motoruYukle({ ioVar: false });
    const el = bolum('a');
    expect(() => mod.wnRevealInit()).not.toThrow();
    expect(document.documentElement.classList.contains('wn-reveal-on')).toBe(false);
    expect(mod.wnRevealScan(document)).toBe(0);
    expect(el.classList.contains('wn-reveal')).toBe(false);
  });

  it('motor kendiliğinden boot eder — çağrı beklemez (§5.2)', async () => {
    // Saf görsel ve auth'suz olduğu için modül yüklenirken IIFE ile açılır;
    // elle wnRevealInit() çağırmak gerekmez. (Bu test ilk yazımda "init
    // edilmeden tarama 0 döner" diye kurulmuştu ve kırıldı — varsayım
    // yanlıştı, davranış doğruydu.)
    const mod = await motoruYukle();
    const el = bolum('a');
    expect(document.documentElement.classList.contains('wn-reveal-on')).toBe(true);
    expect(mod.wnRevealScan(document)).toBe(1);
    expect(_sonGozlemci.gozlenen.has(el)).toBe(true);
  });

  it('ikinci wnRevealInit çağrısı gözlemciyi sıfırlamaz', async () => {
    const mod = await motoruYukle();
    const ilk = _sonGozlemci;
    mod.wnRevealInit();
    expect(_sonGozlemci).toBe(ilk);
  });

  it('window.wnReveal* köprüleri açık (10C bunları çağırıyor)', async () => {
    await motoruYukle();
    expect(typeof window.wnRevealInit).toBe('function');
    expect(typeof window.wnRevealScan).toBe('function');
  });
});
