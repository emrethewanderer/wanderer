/**
 * GREN KAYDIRMA KAPISI — "kaydırınca düzleşen yüzey"in vitest bekçisi.
 *
 * Kırık sınıfı: bir kaydırma kabına (`overflow-y: auto|scroll`) doğrudan
 * asılan mutlak konumlu gren süsü (`::before/::after` + `var(--grain-img)`)
 * içeriğin değil GÖRÜNEN kutunun boyunu ölçer ve kaydırma ile birlikte
 * yukarı kayar. İki ekranlık bir modalde ikinci ekran grensiz kalır,
 * üçüncüde doku bütünüyle ekran dışındadır — yüzey kaydırıldıkça düzleşir
 * (TASARIM-PRENSIPLERI §3: hiçbir yüzey düz değildir).
 *
 * 2026-08-23'te sekiz yüzeyde birden bulundu (at/gl/ig/sm modalleri, mpc ve
 * announce yaprakları, oluş yaprağı, closure ritüeli). Ölçüm: 617px'lik
 * kapta 166px grensiz; kaydırınca gren -114'e çıkıyor. Çare `.wn-grain`
 * sarmalıdır (css/parts/base.css) — gren kabın değil, içeriğin boyundaki
 * sarmalın üstüne asılır.
 *
 * Ne konsolu kızartır ne başka bir testi kırar: yalnız gözle, o da ancak
 * yan yana konursa görülür. Elle bulunan şey ikinci kez elle bulunmasın.
 *
 * Son describe bloğu kapının KENDİSİNİ sınar: yeşil kalmak için ihlali
 * yakalayabildiğini de kanıtlamalı. Yakalamayan bir kapı, kapı değildir.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSS_DIZIN = join(__dirname, '..', 'css', 'parts');

/** Bilinçli istisna: satırın kendisinde ya da bir üstünde beyan edilir. */
const MUAF = /GREN-MUAF:/;

/** Bir CSS metnini kural listesine ayırır. */
function kurallariCoz(css) {
  const kurallar = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const ham = m[1].trim();
    kurallar.push({
      sel: ham.split('\n').pop().trim(),
      govde: m[2],
      satir: css.slice(0, m.index).split('\n').length,
      muaf: MUAF.test(ham) || MUAF.test(m[2]),
    });
  }
  return kurallar;
}

/**
 * İhlalleri döndürür: hem kaydırma kabı olan hem de gren süsünü DOĞRUDAN
 * kendi pseudo'suna asan selektörler.
 *
 * Girdi bir DOSYA LİSTESİDİR, tek metin değil: kap kuralı ile süs kuralı ayrı
 * dosyalarda durabilir (kapsayıcı kendi parçasında, gren paylaşılan bir
 * dosyada). Dosya dosya bakan bir kapı o vakayı sessizce geçirirdi — kaydıran
 * seçicilerin seti bu yüzden REPO GENELİNDEN kurulur.
 */
export function grenIhlalleri(dosyalar) {
  const cozulmus = dosyalar.map(({ ad, metin }) => ({ ad, kurallar: kurallariCoz(metin) }));

  const kaydiranlar = new Set();
  const donusenler = new Set();   // transform/animation taşıyan seçiciler
  for (const { kurallar } of cozulmus) {
    for (const { sel, govde } of kurallar) {
      const kaydirir = /overflow(-y)?\s*:\s*(auto|scroll)/.test(govde);
      const doner = /(^|[;\s])(transform|animation)\s*:\s*(?!none)/.test(govde);
      if (!kaydirir && !doner) continue;
      for (const ham of sel.split(',')) {
        const tek = ham.trim();
        if (kaydirir) kaydiranlar.add(tek);
        if (doner) donusenler.add(tek);
      }
    }
  }

  const ihlaller = [];
  for (const { ad, kurallar } of cozulmus) {
    for (const { sel, govde, satir, muaf } of kurallar) {
      if (muaf) continue;
      if (!/var\(--grain-img\)/.test(govde)) continue;
      const sabit = /position\s*:\s*fixed/.test(govde);
      if (!sabit && !/position\s*:\s*absolute/.test(govde)) continue;
      const taban = sel.replace(/::?(before|after)\s*$/, '').trim();
      if (taban === sel) continue;               // pseudo değil, süs değil
      if (!kaydiranlar.has(taban)) continue;     // kap kaydırmıyor — kırık yok
      // `fixed` kendiliğinden kırık DEĞİLDİR: containing block'u viewport'sa
      // süs ekrana sabitlenir, kaydırma onu taşımaz (emsal: #auth-screen).
      // Kırık, kabın transform/animation ile kendini containing block yapması
      // hâlinde doğar — o zaman fixed öğe de scroll offsetini yer
      // (2026-08-23'te ölçüldü: 20 → -680).
      if (sabit && !donusenler.has(taban)) continue;
      ihlaller.push({ dosya: ad, satir, selektor: sel });
    }
  }
  return ihlaller;
}

function tumCss() {
  return readdirSync(CSS_DIZIN)
    .filter(f => f.endsWith('.css'))
    .map(f => ({ ad: `css/parts/${f}`, metin: readFileSync(join(CSS_DIZIN, f), 'utf8') }));
}

describe('Gren kaydırma kapısı — kaydırılan yüzeyde doku bitmez', () => {
  it('hiçbir kaydırma kabı greni doğrudan kendi pseudo\'suna asmıyor', () => {
    const bulgular = grenIhlalleri(tumCss());
    const rapor = bulgular.map(b => `${b.dosya}:${b.satir}  ${b.selektor}`).join('\n');
    expect(bulgular, `Gren kaydırma kabına asılı — .wn-grain sarmalına taşı:\n${rapor}`).toEqual([]);
  });

  it('gren sarmalı (.wn-grain) base.css\'te tanımlı ve dozu değişkenden okuyor', () => {
    const base = readFileSync(join(CSS_DIZIN, 'base.css'), 'utf8');
    expect(base).toMatch(/\.wn-grain\s*\{[^}]*position:\s*relative/);
    expect(base).toMatch(/\.wn-grain\s*\{[^}]*display:\s*flow-root/);
    expect(base).toMatch(/\.wn-grain::before\s*\{[^}]*var\(--grain-img\)/);
    expect(base).toMatch(/\.wn-grain::before\s*\{[^}]*opacity:\s*var\(--grain-op/);
  });

  it('sarmalı kullanan her yüzey kendi dozunu (--grain-op) söylüyor', () => {
    const eksik = [];
    for (const { ad, metin } of tumCss()) {
      // Kap gerçek bir seçici olmalı: yorum kuyruğu ("… */") değil.
      for (const m of metin.matchAll(/^([.#][^{}\n]*?)\s+\.wn-grain\s*\{/gm)) {
        const kap = m[1].trim();
        if (!kap || kap.includes('*/')) continue;
        const kural = new RegExp(`^${kap.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{[^}]*--grain-op\\s*:`, 'm');
        if (!kural.test(metin)) eksik.push(`${ad}  ${kap}`);
      }
    }
    expect(eksik, `Sarmalı olan ama dozu olmayan yüzey:\n${eksik.join('\n')}`).toEqual([]);
  });
});

describe('Kapının kendisi — ihlali gerçekten yakalıyor mu', () => {
  const IHLAL = `
.ornek-yaprak {
  max-height: 80dvh; overflow-y: auto;
  background: linear-gradient(#111, #000);
}
.ornek-yaprak::before {
  content: ''; position: absolute; inset: 0;
  background-image: var(--grain-img); opacity: .12;
}`;

  const tek = metin => grenIhlalleri([{ ad: '(bellek)', metin }]);

  it('kaydırma kabına asılı greni yakalar', () => {
    expect(tek(IHLAL)).toHaveLength(1);
  });

  it('kaydırmayan kaptaki greni yakalamaz — orada kırık yok', () => {
    expect(tek(IHLAL.replace('overflow-y: auto;', ''))).toEqual([]);
  });

  it('sarmala taşınmış greni yakalamaz', () => {
    const duzeltilmis = IHLAL.replace('.ornek-yaprak::before', '.ornek-yaprak .wn-grain::before');
    expect(tek(duzeltilmis)).toEqual([]);
  });

  it('beyan edilmiş muafiyeti (GREN-MUAF) geçirir', () => {
    const muaf = IHLAL.replace(
      '.ornek-yaprak::before {',
      '.ornek-yaprak::before {  /* GREN-MUAF: kap yalnız yatay kaydırır */',
    );
    expect(tek(muaf)).toEqual([]);
  });

  it('transform\'lu kapta `position: fixed` süsü de yakalanır — fixed kaçış değil', () => {
    const fixedli = IHLAL
      .replace('position: absolute', 'position: fixed')
      .replace('max-height: 80dvh;', 'max-height: 80dvh; transform: translate(-50%, -50%);');
    expect(tek(fixedli)).toHaveLength(1);
  });

  it('transform\'suz kapta `fixed` süs kırık değildir — viewport\'a sabitlenir', () => {
    // Emsal: #auth-screen — kap kaydırır ama kendini containing block yapmaz,
    // gren ekrana yapışır ve kaydırma onu taşımaz.
    expect(tek(IHLAL.replace('position: absolute', 'position: fixed'))).toEqual([]);
  });

  it('kap bir dosyada, süs BAŞKA dosyadayken de yakalar', () => {
    const kapDosyasi = `.ornek-yaprak { max-height: 80dvh; overflow-y: auto; }`;
    const susDosyasi = `.ornek-yaprak::before {
      content: ''; position: absolute; inset: 0;
      background-image: var(--grain-img); opacity: .12;
    }`;
    const bulgu = grenIhlalleri([
      { ad: 'a.css', metin: kapDosyasi },
      { ad: 'b.css', metin: susDosyasi },
    ]);
    expect(bulgu).toHaveLength(1);
    expect(bulgu[0].dosya).toBe('b.css');
  });
});
