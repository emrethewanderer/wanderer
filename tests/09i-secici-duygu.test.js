/**
 * Tests for js/parts/09i-secici.js — FAZ 18 "Pahalı yüzey: seçici ağırlığı"
 * (.claude/plans/duygu-motoru.md § FAZ 18, K10-K12).
 *
 * Kapsam: `secAday`in duygu çarpanı (SEC_DUYGU_CARPANI/SEC_DUYGU_BOYUT —
 * yakınlık, ceza yokluğu, taniklik/tutma istisnası, kanıt yoksa regresyonsuzluk)
 * ve `secGirdiTopla`nın `dgKapi('secici', …)` köprüsü (okuma yoksa alan
 * doğmaz, ayrışma türetmesi FAZ 17'nin Durak'ını kapatır). `dgKapi`nin KENDİ
 * kapı mantığı (tanık/tazelik/ehliyet) burada YENİDEN sınanmaz —
 * tests/13D-yanilma-kapisi.test.js ve tests/13D-ehliyet.test.js'in işidir;
 * burada `window.dgKapi` kontrollü bir bağımlılık olarak ele alınır (aynı
 * dosyanın `window.omGunSatiri` mock deseni).
 *
 * Kırmızıya dönerlerse .claude/plans/duygu-motoru.md § FAZ 18'e bak.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { S } from '../js/state.js';
import { secAday, secGirdiTopla } from '../js/parts/09i-secici.js';
import { localISODate } from '../js/parts/00a-infrastructure.js';
import { deckReady } from '../js/parts/12b-kart-destesi.js';

const KART_A = 'temel-ozsevgi-filiz';
const GUN_MS = 24 * 60 * 60 * 1000;

beforeAll(async () => { await deckReady(); }, 30000);

/* ═══ secAday — duygu çarpanı (SEC_DUYGU_CARPANI/SEC_DUYGU_BOYUT) ═══════ */

describe('secAday — duygu girdisi YOKSA regresyon yok (mühür 1)', () => {
  it('g.duygu hiç yoksa bilesenler.duygu tam 1 ve skor eski formülle BİT-BE-BİT aynıdır', () => {
    const girdi = {
      deger: 90, n: 6, ts: Date.now(), oturumEslesme: true,
      olumlu: 1, negatif: 1, yorgunlukSayisi: 1, yorgunlukTs: Date.now(),
    };
    const a = secAday('kart', 'a', girdi);
    expect(a.bilesenler.duygu).toBe(1);
    // `x * 1 === x` IEEE754'te kesindir — çarpanın eklenmesi ÖNCEKİ
    // formülün ürettiği skoru bit-be-bit korur (regresyon testi).
    const beklenenSkor = a.kanit.v * a.bilesenler.tazelik * a.bilesenler.oturum
      * a.bilesenler.olumlu * a.bilesenler.negatif * a.bilesenler.yorgunluk;
    expect(a.skor).toBe(beklenenSkor);
  });

  it('dims verilse bile g.duygu yoksa çarpan yine 1 (yakınlık kontrolü duygu şartına bağlı)', () => {
    const a = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now(), dims: { hisler: 90 } });
    expect(a.bilesenler.duygu).toBe(1);
  });
});

describe('secAday — yakınlık varsa çarpan TAM 1.2 (mühür 2)', () => {
  it('eksen boyutu kanıtlı bir değer taşıyorsa çarpan 1.2', () => {
    const a = secAday('kart', 'a', {
      deger: 100, n: 5, ts: Date.now(),
      duygu: { eksen: 'sahiplenme', kanit: 'kendimi hep suçlu hissediyorum' },
      dims: { hisler: 40 },
    });
    expect(a.bilesenler.duygu).toBe(1.2);
    expect(a.skor).toBeCloseTo(120, 5);
  });

  it('beş eşleşen eksenin HEPSİ (a) tablosundaki boyutla doğru eşleşir', () => {
    const eslesme = [
      ['berraklik', 'dusunceler'],
      ['kutlama', 'inanclar'],
      ['sahiplenme', 'hisler'],
      ['yatistirma', 'davranislar'],
      ['diriltme', 'davranislar'],
    ];
    for (const [eksen, boyut] of eslesme) {
      const a = secAday('kart', 'a', {
        deger: 100, n: 5, ts: Date.now(),
        duygu: { eksen, kanit: 'x' },
        dims: { [boyut]: 50 },
      });
      expect(a.bilesenler.duygu).toBe(1.2);
    }
  });
});

describe('secAday — boyut değeri 0/eksikse çarpan 1, yakınlık YOK (mühür 3)', () => {
  it('boyut değeri 0 ise (ölçülmüş ama sıfır) çarpan 1', () => {
    const a = secAday('kart', 'a', {
      deger: 100, n: 5, ts: Date.now(),
      duygu: { eksen: 'sahiplenme', kanit: 'x' }, dims: { hisler: 0 },
    });
    expect(a.bilesenler.duygu).toBe(1);
  });

  it('boyut değeri null ise (kkMatchCard\'ın "hiç katkı yok" dönüşü) çarpan 1', () => {
    const a = secAday('kart', 'a', {
      deger: 100, n: 5, ts: Date.now(),
      duygu: { eksen: 'sahiplenme', kanit: 'x' }, dims: { hisler: null, dusunceler: 80 },
    });
    expect(a.bilesenler.duygu).toBe(1);
  });

  it('dims hiç yoksa çarpan 1', () => {
    const a = secAday('kart', 'a', {
      deger: 100, n: 5, ts: Date.now(), duygu: { eksen: 'sahiplenme', kanit: 'x' },
    });
    expect(a.bilesenler.duygu).toBe(1);
  });
});

describe('secAday — taniklik/tutma boyut eşlemesi YOK, çarpan hep 1 (mühür 4)', () => {
  it('taniklik — K7 sessiz eşliğin tercihi olmaz, dims ne kadar güçlü olursa olsun 1', () => {
    const a = secAday('kart', 'a', {
      deger: 100, n: 5, ts: Date.now(),
      duygu: { eksen: 'taniklik', kanit: 'x' },
      dims: { dusunceler: 90, inanclar: 90, hisler: 90, davranislar: 90 },
    });
    expect(a.bilesenler.duygu).toBe(1);
  });

  it('tutma — K9 kriz üstünlüğü sıralamaya karışmaz, çarpan 1', () => {
    const a = secAday('kart', 'a', {
      deger: 100, n: 5, ts: Date.now(),
      duygu: { eksen: 'tutma', kanit: null },
      dims: { dusunceler: 90, inanclar: 90, hisler: 90, davranislar: 90 },
    });
    expect(a.bilesenler.duygu).toBe(1);
  });
});

describe('secAday — ceza YOK: hiçbir girdi çarpanı 1\'in altına indiremez (mühür 5)', () => {
  it('bilinen/uydurma eksen × çeşitli dims kombinasyonlarının HİÇBİRİ çarpanı <1 yapmaz', () => {
    const eksenler = ['berraklik', 'kutlama', 'sahiplenme', 'yatistirma', 'diriltme', 'taniklik', 'tutma', 'uydurma-eksen'];
    const dimsKombin = [
      undefined, {}, { hisler: 0 }, { hisler: null },
      { dusunceler: 0, inanclar: 0, hisler: 0, davranislar: 0 },
      { dusunceler: -5, inanclar: -1, hisler: -9, davranislar: -3 }, // savunmacı: negatif de <1 üretmez
    ];
    for (const eksen of eksenler) {
      for (const dims of dimsKombin) {
        const a = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now(), duygu: { eksen, kanit: 'x' }, dims });
        expect(a.bilesenler.duygu).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('kanit boş/null olsa bile (dgKarsilama\'nın kanıtsız dönüşü) çarpan asla 1\'in altına inmez', () => {
    const a = secAday('kart', 'a', {
      deger: 100, n: 5, ts: Date.now(),
      duygu: { eksen: 'sahiplenme', kanit: null }, dims: { hisler: 60 },
    });
    expect(a.bilesenler.duygu).toBeGreaterThanOrEqual(1);
  });
});

/* ═══ secGirdiTopla — dgKapi('secici', …) köprüsü ═══════════════════════ */

describe('secGirdiTopla — dgKapi köprüsü (FAZ 18(c))', () => {
  beforeEach(() => {
    S.currentUser = { id: 'sec-duygu-kopru-user' };
    S._oturumIzi = { ekranlar: [], kartlar: [], skipler: [], torenler: [] };
  });
  afterEach(() => {
    delete window.dgKapi;
    delete S._dgNabiz; delete S._dgOncekiNabiz; delete S._dgIklim;
    delete S._dgNabizZaman; delete S._dgYay; delete S._dgSonKarsilama;
  });

  it('window.dgKapi tanımsızsa g.duygu hiç doğmaz (§5.2 — asla bloklama)', () => {
    const g = secGirdiTopla('spotlight', KART_A, {});
    expect(g.duygu).toBeUndefined();
  });

  it('dgKapi null dönerse g.duygu hiç doğmaz', () => {
    window.dgKapi = () => null;
    const g = secGirdiTopla('spotlight', KART_A, {});
    expect(g.duygu).toBeUndefined();
  });

  it('dgKapi okuma dönerse g.duygu onu AYNEN taşır', () => {
    const okuma = { eksen: 'sahiplenme', gerekce: 'x', kanit: 'kendi cümlem', ikincil: null };
    window.dgKapi = (yuzey) => (yuzey === 'secici' ? okuma : null);
    const g = secGirdiTopla('spotlight', KART_A, {});
    expect(g.duygu).toEqual(okuma);
  });

  it('dgKapi\'ye geçirilen ctx doğru kurulur: nabiz/oncekiNabiz/iklim/zaman/akis', () => {
    let received = null;
    window.dgKapi = (yuzey, ctx) => { received = ctx; return null; };
    S._dgNabiz = { deger: -1, kuvvet: 2 };
    S._dgOncekiNabiz = { deger: -1, kuvvet: 2 };
    S._dgIklim = { taban: { kova: [] } };
    S._dgNabizZaman = 12345;
    S._dgYay = 'dusen';
    S._dgSonKarsilama = [{ eksen: 'sahiplenme' }];
    secGirdiTopla('spotlight', KART_A, {});
    expect(received.nabiz).toBe(S._dgNabiz);
    expect(received.oncekiNabiz).toBe(S._dgOncekiNabiz);
    expect(received.iklim).toBe(S._dgIklim);
    expect(received.zaman).toBe(12345);
    expect(received.akis).toEqual({ yon: 'dusen', gecmis: S._dgSonKarsilama });
  });

  it('dgKapi patlarsa (savunmacı) girdi eksik kalır, secGirdiTopla patlamaz', () => {
    window.dgKapi = () => { throw new Error('dgKapi patladı'); };
    expect(() => secGirdiTopla('spotlight', KART_A, {})).not.toThrow();
    const g = secGirdiTopla('spotlight', KART_A, {});
    expect(g.duygu).toBeUndefined();
  });
});

/* ═══ ayrışma türetmesi — FAZ 17'nin Durak'ının kapanışı (mühür 6) ═══════
   `dgKapi`nin kendisi ayrışmada null döndüğünü zaten kanıtlıyor
   (tests/13D-yanilma-kapisi.test.js "doğrulama maddesi 13"); burada yalnız
   09i'nin `ctx.ayristi`yi DOĞRU türettiği — ve bu türetmenin gerçek bir
   susturma/susturmama sonucuna yol açtığı — sınanır. Mock dgKapi, gerçek
   `dgKapi`nin ayrışma kadranını (esik.ayrisma && ctx.ayristi → null) BİREBİR
   taklit eder; motorun kendisi burada yeniden yazılmaz. */
describe('secGirdiTopla — ayrışma türetmesi (FAZ 18(c), FAZ 17 Durak kapanışı)', () => {
  beforeEach(() => {
    S.currentUser = { id: 'sec-ayrisma-user' };
    S._oturumIzi = { ekranlar: [], kartlar: [], skipler: [], torenler: [] };
    window.dgKapi = (yuzey, ctx) => (yuzey === 'secici' && !ctx.ayristi)
      ? { eksen: 'sahiplenme', kanit: 'test cümlesi' } : null;
  });
  afterEach(() => { delete window.dgKapi; delete S._dgIklim; });

  it('DÜNKÜ ayrışma bugünü SUSTURMAZ — g.duygu doğar', () => {
    const dun = localISODate(new Date(Date.now() - GUN_MS));
    S._dgIklim = { modelOkuma: { son: { tarih: dun, uygulama: 'sahiplenme', model: 'yatistirma' } } };
    const g = secGirdiTopla('spotlight', KART_A, {});
    expect(g.duygu).toBeTruthy();
  });

  it('BUGÜNKÜ ayrışma SUSTURUR — g.duygu hiç doğmaz', () => {
    S._dgIklim = { modelOkuma: { son: { tarih: localISODate(), uygulama: 'sahiplenme', model: 'yatistirma' } } };
    const g = secGirdiTopla('spotlight', KART_A, {});
    expect(g.duygu).toBeUndefined();
  });

  it('model === uygulama ise (gerçek bir ayrışma yok) bugün olsa bile susturmaz', () => {
    S._dgIklim = { modelOkuma: { son: { tarih: localISODate(), uygulama: 'sahiplenme', model: 'sahiplenme' } } };
    const g = secGirdiTopla('spotlight', KART_A, {});
    expect(g.duygu).toBeTruthy();
  });

  it('modelOkuma.son hiç yoksa ayristi false sayılır — susturmaz', () => {
    S._dgIklim = { modelOkuma: { son: null } };
    const g = secGirdiTopla('spotlight', KART_A, {});
    expect(g.duygu).toBeTruthy();
  });

  it('S._dgIklim hiç yoksa (henüz hidre değil) patlamaz ve susturmaz', () => {
    delete S._dgIklim;
    expect(() => secGirdiTopla('spotlight', KART_A, {})).not.toThrow();
    const g = secGirdiTopla('spotlight', KART_A, {});
    expect(g.duygu).toBeTruthy();
  });
});
