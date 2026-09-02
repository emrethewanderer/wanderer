/**
 * 12g — YÜZ ÇİZGİSİ sözleşmesi
 *
 * İki ana kartın (Olunan / Niyet Alınan) çizimi kullanıcının kendi
 * fotoğrafından ölçülür. Burada sınanan üç şey:
 *   1. GERÇEKLİK KAPISI — iz yoksa çizim doğmaz, kart eski sahnesinde kalır;
 *      ui-avatars vekili (baş harflerden üretilen yer tutucu) YÜZ SAYILMAZ.
 *   2. 12c dalı — `card.yuz` gövdeyi 12g'den alır, göğü/yıldızı/çerçeveyi
 *      kart dilinden kurar; gövde boşsa sessizce bugünkü sahneye düşer.
 *   3. Çizim SAF VEKTÖRDÜR — sahneye <image> girmez (13g paylaşım tuvali ve
 *      SVG→raster yolları kirlenmesin).
 *
 * jsdom'da canvas 2D bağlamı yok → gerçek ölçüm (yzEnsure→_izCikar) burada
 * koşturulmaz; ölçümün ÇIKTISI window.yzKonturGovde ile taklit edilir.
 * Ölçümün kendisi tarayıcıda doğrulanır (yuz-test.html).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ikvScene, ikvCardFace } from '../js/parts/12c-kart-gorsel.js';
import { yzVar, yzKonturGovde, yzEnsure, yzUnut } from '../js/parts/12g-yuz-cizgisi.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PARTS = join(__dirname, '..', 'js/parts');

const SAHTE_GOVDE = '<path d="M30 40 L170 40 L170 42 L30 42 Z" fill="#F5A623" opacity="0.95"/>';

describe('12g · gerçeklik kapısı', () => {
  beforeEach(() => { yzUnut(); delete window.yzKonturGovde; });
  afterEach(() => { yzUnut(); delete window.yzKonturGovde; });

  it('iz yokken yzVar false ve gövde boştur', () => {
    expect(yzVar()).toBe(false);
    expect(yzKonturGovde({ palette: 'gold' })).toBe('');
  });

  it('ui-avatars vekili bir yüz değildir — ölçüme hiç girilmez', async () => {
    const ok = await yzEnsure('https://ui-avatars.com/api/?name=Emre');
    expect(ok).toBe(false);
    expect(yzVar()).toBe(false);
  });

  it('boş adres ölçüme girmez', async () => {
    expect(await yzEnsure('')).toBe(false);
    expect(yzVar()).toBe(false);
  });
});

describe('12c · yuz dalı', () => {
  beforeEach(() => { delete window.yzKonturGovde; });
  afterEach(() => { delete window.yzKonturGovde; });

  it('iz yokken card.yuz sahneyi DEĞİŞTİRMEZ (eski sahneye düşüş)', () => {
    const yuzlu = ikvScene({ id: 'portre-olunan', category: 'cekirdek', yuz: true }, { palette: 'gold' });
    const yuzsuz = ikvScene({ id: 'portre-olunan', category: 'cekirdek' }, { palette: 'gold' });
    // uid sayacı her çağrıda artar → id'leri normalleştirip karşılaştır
    const norm = s => s.replace(/ikv\d+/g, 'UID');
    expect(norm(yuzlu)).toBe(norm(yuzsuz));
  });

  it('iz varken gövdeyi 12g\'den alır, göğü ve çerçeveyi kart dilinden kurar', () => {
    window.yzKonturGovde = () => SAHTE_GOVDE;
    const s = ikvScene({ id: 'portre-olunan', category: 'cekirdek', yuz: true }, { palette: 'gold' });
    expect(s).toContain(SAHTE_GOVDE);
    expect(s).toContain('viewBox="0 0 200 250"');
    expect(s).toMatch(/<ellipse cx="100" cy="130" rx="76" ry="94" fill="url/);  // oval gök
    expect(s).toContain('<circle');                                            // yıldız tarlası
  });

  it('altın ve lapis AYNI yüzü ister, yalnız paleti değişir', () => {
    const gorulen = [];
    window.yzKonturGovde = (o) => { gorulen.push(o.palette); return SAHTE_GOVDE; };
    ikvScene({ id: 'portre-olunan', category: 'cekirdek', yuz: true }, { palette: 'gold' });
    ikvScene({ id: 'oik_x', category: 'cekirdek', yuz: true }, { palette: 'lapis' });
    expect(gorulen).toEqual(['gold', 'lapis']);
  });

  it('kilitli (fog) kartta yüz çizilmez — sis sözleşmesi korunur', () => {
    window.yzKonturGovde = () => SAHTE_GOVDE;
    const s = ikvScene({ id: 'portre-olunan', category: 'cekirdek', yuz: true }, { palette: 'gold', fog: true });
    expect(s).not.toContain(SAHTE_GOVDE);
  });

  it('mini kartta LOD bayrağı 12g\'ye geçer', () => {
    let mini = null;
    window.yzKonturGovde = (o) => { mini = o.mini; return SAHTE_GOVDE; };
    ikvScene({ id: 'portre-olunan', category: 'cekirdek', yuz: true }, { palette: 'gold', mini: true });
    expect(mini).toBe(true);
  });

  it('çerçeve OVALDİR — çift altın hat, lapis kartta da altın (Emre 08-04)', () => {
    window.yzKonturGovde = () => SAHTE_GOVDE;
    const a = ikvScene({ id: 'portre-olunan', category: 'cekirdek', yuz: true }, { palette: 'gold' });
    const b = ikvScene({ id: 'oik_hedef', category: 'cekirdek', yuz: true }, { palette: 'lapis' });
    for (const s of [a, b]) {
      expect(s).toMatch(/<ellipse cx="100" cy="130" rx="76" ry="94" fill="none" stroke="#F5A623"/);
      expect(s).toMatch(/<ellipse cx="100" cy="130" rx="69" ry="86" fill="none" stroke="#F5A623"/);
      // Dikdörtgen gök ve dikdörtgen çerçeve bu iki kartta YOK
      expect(s).not.toMatch(/<rect[^>]*width="156"/);
    }
  });

  it('gök ovalin içini doldurur, içerik ovale KIRPILIR', () => {
    window.yzKonturGovde = () => SAHTE_GOVDE;
    const s = ikvScene({ id: 'portre-olunan', category: 'cekirdek', yuz: true }, { palette: 'gold' });
    expect(s).toMatch(/<ellipse cx="100" cy="130" rx="76" ry="94" fill="url\(#ikv\d+s\)"\/>/);
    expect(s).toMatch(/<clipPath id="ikv\d+c"><ellipse cx="100" cy="130" rx="76" ry="94"\/><\/clipPath>/);
    // Gövde o kırpmanın İÇİNDE durur — dışarıda kalan bir kopya olmamalı
    const grup = s.match(/<g clip-path="url\(#ikv\d+c\)">([\s\S]*?)<\/g>\s*<ellipse/);
    expect(grup && grup[1]).toContain(SAHTE_GOVDE);
    expect(s.split(SAHTE_GOVDE).length - 1).toBe(1);
  });

  it('yıldızlar yüzün ÜSTÜNE düşmez — madalyon ölçüsü tarlayı seyreltir', () => {
    window.yzKonturGovde = () => SAHTE_GOVDE;
    window.yzMadalyon = () => ({ cx: 100, cy: 127, rx: 40, ry: 55 });
    const s = ikvScene({ id: 'portre-olunan', category: 'cekirdek', yuz: true }, { palette: 'lapis' });
    const yildizlar = [...s.matchAll(/<circle class="ikv-star"[^>]*cx="([\d.]+)" cy="([\d.]+)"/g)];
    expect(yildizlar.length).toBeGreaterThan(0);
    for (const [, cx, cy] of yildizlar) {
      const d = ((+cx - 100) / (40 * 1.06)) ** 2 + ((+cy - 127) / (55 * 1.06)) ** 2;
      expect(d).toBeGreaterThanOrEqual(1);
    }
    delete window.yzMadalyon;
  });

  it('madalyon ölçüsü yoksa tarla seyrelmez ama sahne yine kurulur', () => {
    window.yzKonturGovde = () => SAHTE_GOVDE;
    delete window.yzMadalyon;
    const s = ikvScene({ id: 'portre-olunan', category: 'cekirdek', yuz: true }, { palette: 'gold' });
    expect(s).toContain(SAHTE_GOVDE);
    expect(s).toContain('<circle class="ikv-star"');
  });

  it('yüz kartında iç dikdörtgen çerçeve çekilir — oval tek çerçevedir', () => {
    window.yzKonturGovde = () => SAHTE_GOVDE;
    const face = ikvCardFace({ id: 'portre-olunan', name: 'Olunan Emre', category: 'cekirdek', yuz: true }, { palette: 'gold' });
    expect(face).toContain('ikv-card--yuz');
    // Kilitli kartta yüz zaten çizilmez → dikdörtgen çerçeve yerinde kalır
    const sisli = ikvCardFace({ id: 'portre-olunan', name: 'Olunan Emre', category: 'cekirdek', yuz: true }, { palette: 'gold', fog: true });
    expect(sisli).not.toContain('ikv-card--yuz');
  });

  it('iz yokken kart kendi dikdörtgen çerçevesini korur', () => {
    delete window.yzKonturGovde;
    const face = ikvCardFace({ id: 'portre-olunan', name: 'Olunan Emre', category: 'cekirdek', yuz: true }, { palette: 'gold' });
    expect(face).not.toContain('ikv-card--yuz');
  });

  it('DIŞARIDAN verilen sahnede oval yoktur — kart çerçevesiz kalmaz', () => {
    // 10f/10t kartlarını kendi sahnesiyle basar (opts.scene). Karar sahnenin
    // kendisinden okunmasaydı bu kart hem ovalsiz hem çerçevesiz kalırdı.
    window.yzKonturGovde = () => SAHTE_GOVDE;
    const face = ikvCardFace({ id: 'portre-olunan', name: 'Olunan Emre', category: 'cekirdek', yuz: true },
      { palette: 'gold', scene: '<svg viewBox="0 0 200 250" class="ikv-scene-svg"></svg>' });
    expect(face).not.toContain('ikv-card--yuz');
    expect(face).toContain('ikv-frame');
  });

  it('12g gövde üretemezse (hata/boş) kart çökmez, eski sahnede kalır', () => {
    window.yzKonturGovde = () => { throw new Error('ölçüm yok'); };
    const s = ikvScene({ id: 'portre-olunan', category: 'cekirdek', yuz: true }, { palette: 'gold' });
    expect(s).toContain('viewBox="0 0 200 250"');
    expect(s).not.toContain(SAHTE_GOVDE);
  });

  it('çizim saf vektördür — sahneye <image> girmez', () => {
    window.yzKonturGovde = () => SAHTE_GOVDE;
    const face = ikvCardFace({ id: 'portre-olunan', name: 'Olunan Emre', category: 'cekirdek', yuz: true }, { palette: 'gold' });
    expect(face).toContain(SAHTE_GOVDE);
    expect(face).not.toMatch(/<image\b/);
    expect(face).not.toMatch(/xlink:href/);
  });
});

/* ═══════════════════════════════════════════════════════
   TAZELEME SÖZLEŞMESİ — bayrak listesi ile tazeleme listesi EŞ olmalı
═══════════════════════════════════════════════════════ */

describe('12g · tazeleme listesi bayrak listesiyle eş', () => {
  /* Bu kırık bir kez yaşandı ve SESSİZDİ: `yuz:true` dört yüzeye takılıyken
     ölçüm bitince yalnız ikisi tazeleniyordu. Bugün'ün iki ana kartı
     (#yol-hero) ölçüm bitmeden çizilip yüzsüz — dolayısıyla ovalsiz — donuyor,
     build de testler de yeşil kalıyordu. Ölçüm jsdom'da koşmadığı için davranış
     birim testiyle yakalanamaz; sözleşme KAYNAKTA sınanır (emsal:
     tests/gerceklik-kapisi.test.js — kaynak tarayan kapı deseni). */

  /** Yüzey → ölçüm bitince onu yeniden çizen, dışa açık fonksiyon.
   *  null = bilinçli istisna, gerekçesi yanında durur. */
  const TAZELEYICI = {
    '02c-portre.js': 'loadPortreView',
    '10D-olmak-istedigin.js': 'oikRenderHub',
    '10f-w2-yol.js': 'yolRenderHero',
    // Eşik bir TÖRENDİR: render'ı animasyonu baştan oynatır, tazelemek
    // kartları geri sarardı. Açılırken ölçüm bitmişse yüzü zaten alır.
    '02d-esik-ekrani.js': null,
  };

  const kaynak12g = readFileSync(join(PARTS, '12g-yuz-cizgisi.js'), 'utf8');

  /** Bayrağı YORUMDA anmak takmak değildir — 12g'nin kendi açıklaması
   *  (`yuz:true` bayrağının takıldığı yüzeyler…) motoru kendi tüketicisi
   *  gibi göstermişti. Yorum satırları taramanın dışında kalır. */
  const bayrakTakili = (src) => src.split('\n')
    .filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .some(l => /\byuz:\s*true\b/.test(l));

  const bayrakli = readdirSync(PARTS)
    .filter(f => f.endsWith('.js') && f !== '12g-yuz-cizgisi.js')
    .filter(f => {
      // Liste alındıktan SONRA dosya silinmiş olabilir (paralel koşu) —
      // silinmiş dosya bayrak taşımıyor sayılır, tarama çökmez.
      let src;
      try { src = readFileSync(join(PARTS, f), 'utf8'); } catch (e) { if (e && e.code === 'ENOENT') return false; throw e; }
      return bayrakTakili(src);
    });

  /** Expose iki yoldan olur: modülün kendi `window.x =` bloğu ya da
   *  main.js'in `Object.assign(window, {…})` hub'ı (02c/10D bu yoldan
   *  geçer). Yalnız birini aramak çalışan sözleşmeyi kırık gösterir. */
  const mainSrc = readFileSync(join(PARTS, '..', 'main.js'), 'utf8');
  const hubBasi = mainSrc.indexOf('Object.assign(window, {');
  const HUB = hubBasi >= 0 ? mainSrc.slice(hubBasi, mainSrc.indexOf('\n});', hubBasi)) : '';

  it('bayrak gerçekten takılı — tarama boşa düşmedi', () => {
    // Regex bir gün yazım değişikliğiyle kaçarsa aşağıdaki iki test boş
    // döngüyle yeşil kalırdı. Kapı, kapı olduğunu önce kendisi kanıtlar.
    expect(bayrakli.length).toBeGreaterThanOrEqual(4);
  });

  it('yuz:true takan her yüzey tazeleme haritasında tanımlıdır', () => {
    for (const f of bayrakli) {
      expect(TAZELEYICI, `${f} yuz:true takıyor ama tazeleme haritasında yok`)
        .toHaveProperty(f);
    }
  });

  it('istisna dışındaki her yüzey ölçüm bitince tazelenir', () => {
    for (const f of bayrakli) {
      const fn = TAZELEYICI[f];
      if (!fn) continue;
      expect(kaynak12g, `12g ölçüm bitince ${f} yüzeyini (${fn}) tazelemiyor`)
        .toContain(`window.${fn}?.()`);
    }
  });

  it('haritadaki her tazeleyici gerçekten dışa açıktır', () => {
    // Sözleşmenin öbür ucu: `window.x?.()` çağrısı, karşılığı expose
    // edilmemişse HATA VERMEZ — optional chaining sessizce yutar ve yüzey
    // yine tazelenmez. Tek taraflı sınanan sözleşme sözleşme değildir.
    for (const [dosya, fn] of Object.entries(TAZELEYICI)) {
      if (!fn) continue;
      const kendi = new RegExp(`window\\.${fn}\\s*=`)
        .test(readFileSync(join(PARTS, dosya), 'utf8'));
      const hubda = new RegExp(`\\b${fn}\\b`).test(HUB);
      expect(kendi || hubda, `${fn} ne ${dosya}'de ne main.js hub'ında expose ediliyor`)
        .toBe(true);
    }
  });
});
