/* PAYLAŞIM TÜRÜ KIRILIMI — İç Çalışma 12 boşluk C / FAZ 3.
 *
 * `wtLogPaylasim`'in `meta.tur` alanı (kart/rapor/film) çoğu satırda null
 * kalıyordu çünkü `_shareCanvas` paylaşılan şeyin türünü bilmiyordu; ve
 * indirme dalı (`13g:301`) SABİT `tur: 'kart'` yazıyordu — Wrapped (film)
 * ya da Yol (rapor) paylaşımı indirilince de kart sayılıyordu (§6.10 ihlali).
 *
 * Bu dosya kaynak taramasıyla sınar (canvas 2D context jsdom'da yok —
 * `shrShareStory`'yi uçtan uca koşturmak `_drawStory`'de çöker); desen
 * dosya adına değil ÇAĞRIYA bağlıdır: her assert, ilgili çağrının kendi
 * kod bloğunu (benzersiz komşu satırlarla) çevreler, dosyada "kart" geçen
 * herhangi bir yeri değil.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const KOK = process.cwd();
const oku = (rel) => readFileSync(join(KOK, rel), 'utf8');

describe('13g — _shareCanvas / shrShareStory tur zinciri', () => {
  const src = oku('js/parts/13g-paylasim.js');

  it('_shareCanvas üçüncü parametre olarak tur alır', () => {
    expect(src).toContain('async function _shareCanvas(cv, title, tur) {');
  });

  it('native ve web-share dallarındaki story olayları tur taşır', () => {
    // İki dal da aynı satırı üretir; ikisinin de mevcudiyeti sayımla sınanır —
    // tek bir occurrence sızıntı olurdu (biri unutulmuş demektir).
    const adet = src.split("window.wtLogPaylasim?.('story', { tur });").length - 1;
    expect(adet).toBe(2);
  });

  it('asıl bulgu — indirme dalı artık SABİT kart yazmıyor, tur\'a devreder', () => {
    expect(src).not.toContain("wtLogPaylasim?.('indir', { tur: 'kart' })");
    expect(src).toContain("window.wtLogPaylasim?.('indir', { tur });");
  });

  it('shrShareStory kendi tur\'unu icat etmez — params.tur\'u olduğu gibi geçirir', () => {
    expect(src).toContain(
      'const ok = await _shareCanvas(cv, params && params.title, params && params.tur);'
    );
    // Uydurulmuş varsayılan yasak (§6.10): `params.tur || 'kart'` gibi bir
    // düşüş burada YOK — tur verilmezse `undefined` gider, 00f onu null'a çevirir.
    expect(src).not.toMatch(/params\.tur\s*\|\|\s*['"]/);
  });

  it('_shareCanvases (yazı paylaşımı) indirme dalı BİLEREK dokunulmadı — tek çağıranı hep rapor', () => {
    // 13g:616 — shrShareArticle'ın tek düşüşü; _shareCanvas'ın aksine birden
    // çok tür taşıyan bir çağıran yok, sabit DOĞRU (plan FAZ 3 notu).
    expect(src).toContain("window.wtLogPaylasim?.('indir', { tur: 'rapor' });");
  });
});

describe('00f — _PAY_TUR kapalı kümesi genişlemedi', () => {
  const src = oku('js/parts/00f-kullanim-nabzi.js');

  it('küme hâlâ tam üç değer: kart · rapor · film', () => {
    expect(src).toContain("const _PAY_TUR  = new Set(['kart', 'rapor', 'film']);");
  });
});

describe('Yedi çağıran — planın eşleme tablosu', () => {
  // Her giriş: [dosya, çağrıyı tekilleştiren komşu satır, beklenen tur].
  const cagiranlar = [
    [
      'js/parts/13t-donusum-aynasi.js',
      "// Uygulamanın en uzun eşiği: doksan gün. Işıltı o mertebeyi taşır.\n    tier: 4,",
      'kart',
      // gbPaylasimKarti tek çağıranı (_bagliPaylas) döndürdüğü nesneyi
      // doğrudan shrShareStory'ye geçiriyor — tur bu yüzden ÜRETİCİDE (kaynakta).
    ],
    [
      'js/parts/10q-w2-kisi-karti.js',
      "accent: R.color, tier: (R.order || 0) + 1,",
      'kart',
    ],
    [
      'js/parts/10t-w2-seri-muhru.js',
      "note: (note || '').slice(0, 140), tier: card.tier,",
      'kart',
    ],
    [
      'js/parts/12f-hazine-paketleri.js',
      "accent: set.satilamaz ? 'var(--lapis-bright)' : 'var(--gold)',\n        tier: 4,",
      'kart',
    ],
    [
      'js/parts/10q4-olus-muhru.js',
      "accent: 'var(--gold, #F5A623)', tier: 3,",
      'kart',
    ],
    [
      'js/parts/10f-w2-yol.js',
      "accent: ultra ? '#F7C744' : 'gold', tier: ultra ? 4 : 2,",
      'rapor',
    ],
    [
      'js/parts/13j-wrapped.js',
      "line: bits.length ? bits.join(' · ') : t('wr.share.fallback', 'Yeni ay, yeni halka.'),\n        tier: 3,",
      'film',
    ],
  ];

  it.each(cagiranlar)('%s → tur: %s', (dosya, komsuSatir, beklenenTur) => {
    const src = oku(dosya);
    const konum = src.indexOf(komsuSatir);
    expect(konum, `${dosya}: bekleyen komşu satır bulunamadı — kod kalıbı değişmiş olabilir`).toBeGreaterThan(-1);
    // Komşu satırdan sonraki dar bir pencere `});` kapanışına kadar olan
    // alanı temsil eder — tur oraya mı, başka bir çağrıya mı ait karışmasın
    // diye pencere dosyanın tamamı değil, çağrının kendisiyle sınırlı tutulur.
    const pencere = src.slice(konum, konum + komsuSatir.length + 220);
    expect(pencere).toContain(`tur: '${beklenenTur}'`);
  });
});

/* ═══ DAVRANIŞSAL KAPI — zinciri gerçekten koştur ═══════════════════════
   Yukarıdaki bloklar KAYNAĞA bakar ve kırılgandır: bir biçimlendirme
   değişikliği onları sahte kırmızıya çevirir, ve hiçbiri zincirin
   GERÇEKTEN çalıştığını kanıtlamaz (§3.5 — asıl kırıklar davranışsaldır).
   Faz denetiminde (parent · Opus) bu blok eklendi: canvas 2D bağlamı bir
   Proxy ile taklit edilir, `shrShareStory` uçtan uca koşar ve
   `wtLogPaylasim`'e ne yazdığı ölçülür. Yani düzeltmenin kendisi değil
   SONUCU sınanır — eski kod bu bloğu kırmızıya çevirirdi. */
describe('13g — davranışsal: zincir tur\'u gerçekten taşıyor', () => {
  let shrShareStory;
  const cagrilar = [];

  beforeAll(async () => {
    // jsdom'da canvas 2D yok; `_drawStory` yüzlerce çizim çağrısı yapar ve
    // hiçbirinin dönüşü tur zincirini etkilemez — no-op Proxy yeter.
    const ctx = new Proxy({}, {
      get: (_t, k) => {
        if (k === 'canvas') return null;
        if (k === 'measureText') return () => ({ width: 10 });
        if (k === 'createLinearGradient' || k === 'createRadialGradient') {
          return () => ({ addColorStop() {} });
        }
        return () => {};
      },
      set: () => true,
    });
    HTMLCanvasElement.prototype.getContext = () => ctx;
    HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,AA==';
    HTMLCanvasElement.prototype.toBlob = (cb) => cb(null);
    window.wtLogPaylasim = (olay, meta) => cagrilar.push([olay, meta]);
    window.showToast = () => {};
    ({ shrShareStory } = await import('../js/parts/13g-paylasim.js'));
  });

  it('film paylaşımı indirmeye düşse bile film sayılır (eski kod kart yazardı)', async () => {
    cagrilar.length = 0;
    await shrShareStory({ title: 'Yolculuğun', tur: 'film' });
    expect(cagrilar).toEqual([['indir', { tur: 'film' }]]);
  });

  it('rapor paylaşımı rapor sayılır', async () => {
    cagrilar.length = 0;
    await shrShareStory({ title: 'Yol', tur: 'rapor' });
    expect(cagrilar).toEqual([['indir', { tur: 'rapor' }]]);
  });

  it('tur verilmezse UYDURULMAZ — undefined gider, 00f onu null yazar (§6.10)', async () => {
    cagrilar.length = 0;
    await shrShareStory({ title: 'türsüz' });
    expect(cagrilar).toHaveLength(1);
    expect(cagrilar[0][0]).toBe('indir');
    expect(cagrilar[0][1].tur).toBeUndefined();
  });
});

describe('shrShareStory params sözleşmesi bozulmadı (korunan)', () => {
  it('TEK GİRİŞ imzası hâlâ tek parametre — tur params içine girdi, imza değişmedi', () => {
    const src = oku('js/parts/13g-paylasim.js');
    expect(src).toContain('TEK GİRİŞ: window.shrShareStory(params)');
    expect(src).toContain('export async function shrShareStory(params) {');
  });
});
