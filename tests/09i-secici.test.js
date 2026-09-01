/**
 * Tests for js/parts/09i-secici.js — Tanıma Motoru · Seçici (FAZ 3 iskeleti
 * + FAZ 5 girdi toplayıcı).
 *
 * Kapsam: secAday (kanıt kapısı + bileşen birleştirme: tazelik, oturum
 * bağlamı, negatif ceza, yorgunluk), secSirala (determinizm + çeşitlilik
 * kuralı), secGirdiTopla (FAZ 5 — S._oturumIzi/09d/kkEsikDurum okuma
 * köprüsü), ve K2 regresyonu — seçici kkMatchCard/kkScoreAndSort'un `earned`
 * kümesine ASLA dokunmaz (seçici yalnız SIRALAR, kazanım kapısı değildir).
 *
 * Ağırlık sabitleri (SEC_*) FAZ 4'te (🅞) kalibre edilecek yer tutuculardır;
 * burada test edilen şey ORANLAR ve DAVRANIŞ (determinizm, kapı, çeşitlilik),
 * mutlak sayı değerleri değil.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { S } from '../js/state.js';
import {
  secAday, secSirala, secInit, secGirdiTopla,
  secNedenVeri, secBeyanVar, secBeyanAzalt, secBeyanGeriAl,
  secBeyanId, secBeyanListe,
} from '../js/parts/09i-secici.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';
import { deckReady, getFullDeck } from '../js/parts/12b-kart-destesi.js';
import { kkEsikAc } from '../js/parts/10q-w2-kisi-karti.js';

const GUN_MS = 24 * 60 * 60 * 1000;
/* FAZ 7 blokları için dosya kapsamlı kart kimliği (describe-içi OZSEVGI_A'nın
   kardeşi — o sabit kendi bloğuna ait, buraya sızdırılmaz). */
const KART_A = 'temel-ozsevgi-filiz';

beforeAll(async () => { await deckReady(); }, 30000);

describe('secAday — Gerçeklik Kapısı (kanıtsız aday hiç doğmaz)', () => {
  it('n eşiğin altındaysa null döner (varsayılan eşik 3)', () => {
    expect(secAday('kart', 'a', { deger: 80, n: 2, ts: Date.now() })).toBeNull();
  });

  it('n hiç verilmemişse null döner', () => {
    expect(secAday('kart', 'a', {})).toBeNull();
    expect(secAday('kart', 'a', undefined)).toBeNull();
  });

  it('deger sayı değilse null döner (n yeterli olsa da)', () => {
    expect(secAday('kart', 'a', { deger: null, n: 10 })).toBeNull();
  });

  it('n eşiği geçer ve deger geçerliyse aday doğar', () => {
    const a = secAday('kart', 'a', { deger: 80, n: 5, ts: Date.now() });
    expect(a).not.toBeNull();
    expect(a.tur).toBe('kart');
    expect(a.id).toBe('a');
    expect(typeof a.skor).toBe('number');
    expect(Number.isFinite(a.skor)).toBe(true);
  });
});

describe('secAday — tazelik (zamanAgirligi, 00a ortak yardımcı)', () => {
  it('taze girdi (ts=şimdi) tam ağırlık taşır', () => {
    const a = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now() });
    // oturum çarpanı yok (1), negatif/yorgunluk yok → skor ≈ deger * 1
    expect(a.skor).toBeCloseTo(100, 0);
  });

  it('bir yarı ömür önceki girdi (7 gün) skoru yaklaşık yarıya düşürür', () => {
    const a = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now() - 7 * GUN_MS });
    expect(a.skor).toBeCloseTo(50, 0);
  });

  it('ts verilmezse "az önce" sayılır (13l\'in eski `e.t || now` düşüşüyle aynı)', () => {
    const a = secAday('kart', 'a', { deger: 100, n: 5 });
    expect(a.skor).toBeCloseTo(100, 0);
  });
});

describe('secAday — oturum bağlamı eşleşmesi (F1 izi)', () => {
  it('oturumEslesme true olan aday, olmayana göre daha yüksek skor taşır', () => {
    const yok = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now() });
    const var_ = secAday('kart', 'b', { deger: 100, n: 5, ts: Date.now(), oturumEslesme: true });
    expect(var_.skor).toBeGreaterThan(yok.skor);
  });
});

describe('secAday — negatif faktör (F2 defteri)', () => {
  it('her negatif sinyal skoru %40 düşürür (bileşik: 0.6^n)', () => {
    const temiz = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now() });
    const bir   = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now(), negatif: 1 });
    const iki   = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now(), negatif: 2 });
    expect(bir.skor).toBeCloseTo(60, 0);
    expect(iki.skor).toBeCloseTo(36, 0);
  });

  it('aday SIFIRLANMAZ — taban 0.1 (kanıt durur, insan fikrini değiştirir)', () => {
    const cok = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now(), negatif: 20 });
    expect(cok.skor).toBeCloseTo(10, 0);
    expect(cok.skor).toBeGreaterThan(0);
  });

  it('negatif eksi/NaN verilse de skor bozulmaz (savunmacı)', () => {
    const a = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now(), negatif: -5 });
    expect(Number.isFinite(a.skor)).toBe(true);
    expect(a.skor).toBeCloseTo(100, 0); // negatif faktör negatif sayı yüzünden ARTMAZ (Math.max(0, ..))
  });
});

/* FAZ 4'ün merkez kararı — X'in Heavy Ranker dersi: ceza ödülden serttir.
   Bu asimetri kasıtlıdır ve kalibrasyonun kendisidir; kırılırsa değer
   modelinin yönü değişmiş demektir. */
describe('secAday — davete uyma çarpanı ve ceza/ödül asimetrisi', () => {
  it('davete uyma skoru yükseltir (bileşik, 1.25^n)', () => {
    const notr   = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now() });
    const uyulan = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now(), olumlu: 2 });
    expect(uyulan.skor).toBeGreaterThan(notr.skor);
    expect(uyulan.skor).toBeCloseTo(156.25, 0);
  });

  it('olumlu çarpan TAVANLIDIR — geçmişi tutan aday listeyi sonsuza dek tutmaz', () => {
    const cok = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now(), olumlu: 50 });
    expect(cok.skor).toBeCloseTo(200, 0);
  });

  it('bir negatifin düşürdüğü, bir olumlunun yükselttiğinden FAZLADIR', () => {
    const notr  = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now() });
    const arti  = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now(), olumlu: 1 });
    const eksi  = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now(), negatif: 1 });
    expect(arti.skor - notr.skor).toBeCloseTo(25, 0);
    expect(notr.skor - eksi.skor).toBeCloseTo(40, 0);
    expect(notr.skor - eksi.skor).toBeGreaterThan(arti.skor - notr.skor);
  });
});

describe('secAday — yorgunluk (10q4 _davetIzi kalıbı)', () => {
  it('taze bir davet skoru ~üçte bir düşürür (×0.67), negatiften yumuşak', () => {
    const dinlenmis = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now() });
    const yorgun = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now(), yorgunlukSayisi: 1, yorgunlukTs: Date.now() });
    expect(yorgun.skor).toBeCloseTo(66.7, 0);
    // Sormak bir hata değildir: yorgunluk cezası negatif sinyalden hafif olmalı.
    const negatifli = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now(), negatif: 1 });
    expect(yorgun.skor).toBeGreaterThan(negatifli.skor);
  });

  it('eski bir davetin yorgunluğu kendi yarı ömründe (3 gün) erir', () => {
    const yakinDavet = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now(), yorgunlukSayisi: 1, yorgunlukTs: Date.now() });
    const eskiDavet = secAday('kart', 'a', { deger: 100, n: 5, ts: Date.now(), yorgunlukSayisi: 1, yorgunlukTs: Date.now() - 3 * GUN_MS });
    expect(eskiDavet.skor).toBeGreaterThan(yakinDavet.skor);
  });
});

describe('secSirala — determinizm', () => {
  it('aynı girdiyle iki çağrı aynı sırayı üretir', () => {
    const adaylar = [
      secAday('kart', 'c', { deger: 60, n: 4, ts: Date.now() }),
      secAday('kart', 'a', { deger: 90, n: 4, ts: Date.now() }),
      secAday('kart', 'b', { deger: 90, n: 4, ts: Date.now() }), // c ile eşit skor — id tie-break
    ];
    const s1 = secSirala(adaylar).map((x) => x.id);
    const s2 = secSirala(adaylar).map((x) => x.id);
    expect(s1).toEqual(s2);
  });

  it('eşit skorda id alfabetik sıraya düşer (kararlı tie-break)', () => {
    const adaylar = [
      secAday('kart', 'z', { deger: 50, n: 3, ts: Date.now() }),
      secAday('kart', 'a', { deger: 50, n: 3, ts: Date.now() }),
    ];
    const sirali = secSirala(adaylar).map((x) => x.id);
    expect(sirali).toEqual(['a', 'z']);
  });
});

describe('secSirala — null yolu (kanıtsız aday listeye giremez)', () => {
  it('boş dizi/undefined girişte BOŞ liste döner', () => {
    expect(secSirala([])).toEqual([]);
    expect(secSirala(undefined)).toEqual([]);
  });

  it('null/undefined elemanlar (secAday\'in kanıtsız dönüşü) sessizce elenir', () => {
    const kanitsiz = secAday('kart', 'x', {}); // null
    const kanitli = secAday('kart', 'y', { deger: 70, n: 5, ts: Date.now() });
    const sirali = secSirala([kanitsiz, kanitli, null, undefined]);
    expect(sirali.map((x) => x.id)).toEqual(['y']);
  });
});

describe('secSirala — çeşitlilik kuralı (X\'in yazar çeşitliliği dersi)', () => {
  it('aynı tür art arda gelmez — skor sırası mümkün olduğunca korunur', () => {
    const A = secAday('spotlight', 'A', { deger: 90, n: 5, ts: Date.now() });
    const B = secAday('spotlight', 'B', { deger: 80, n: 5, ts: Date.now() });
    const C = secAday('kesif', 'C', { deger: 70, n: 5, ts: Date.now() });
    // Skor sırası A > B > C, A ve B aynı tür ('spotlight') — çeşitlilik C'yi B'nin önüne çeker.
    const sirali = secSirala([A, B, C]).map((x) => x.id);
    expect(sirali).toEqual(['A', 'C', 'B']);
  });

  it('tüm adaylar aynı türdeyse (alternatif yok) skor sırası bozulmaz', () => {
    const A = secAday('kart', 'A', { deger: 90, n: 5, ts: Date.now() });
    const B = secAday('kart', 'B', { deger: 80, n: 5, ts: Date.now() });
    const C = secAday('kart', 'C', { deger: 70, n: 5, ts: Date.now() });
    expect(secSirala([A, B, C]).map((x) => x.id)).toEqual(['A', 'B', 'C']);
  });
});

describe('K2 — seçici kazanım kapılarına dokunmaz (earned kümesi birebir aynı)', () => {
  it('kkMatchCard/kkScoreAndSort seçiciden ÖNCE ve SONRA aynı earned kümesini üretir', async () => {
    const { kkScoreAndSort } = await import('../js/parts/10q-w2-kisi-karti.js');
    const deste = await import('../js/parts/12b-kart-destesi.js');
    await deste.deckReady();
    const cards = deste.getFullDeck();
    const sig = {
      sessions: 80, gecisReadings: 30, reviews: 20, selfDialogue: 20,
      dinlenme: 10, meclisNamed: 5, hayalScenes: 10,
    };

    const once = kkScoreAndSort(cards, sig);
    const earnedOnce = once.filter((x) => x.m.earned).map((x) => x.card.id).sort();

    // Seçiciyi gerçek kart verisiyle çalıştır (FAZ 5'in yapacağı gibi) —
    // secAday/secSirala kkMatchCard'ı import bile etmez, ama regresyon net
    // olsun diye burada aynı akışı gerçek kullanımla taklit ediyoruz.
    const adaylar = once.map((x) => secAday('kart', x.card.id, { deger: x.m.hazirlik, n: 5, ts: Date.now() })).filter(Boolean);
    secSirala(adaylar);

    const tekrar = kkScoreAndSort(cards, sig);
    const earnedTekrar = tekrar.filter((x) => x.m.earned).map((x) => x.card.id).sort();

    expect(earnedTekrar).toEqual(earnedOnce);
  });
});

/* FAZ 5 bağlayıcı karar 1 (2026-08-09) — girdi hazırlama TEK YERDE.
   secGirdiTopla saf DEĞİLDİR (S._oturumIzi/kkEsikDurum/window.omGunSatiri
   okur); bu testler onun okuma köprüsünü sınar, secAday'in skor
   formülünü DEĞİL (o zaten yukarıda kapsandı). */
describe('secGirdiTopla — girdi toplayıcı (FAZ 5)', () => {
  const OZSEVGI_A = 'temel-ozsevgi-filiz';
  const OZSEVGI_B = 'temel-ozsevgi-kok';   // OZSEVGI_A ile AYNI erdem — "kardeş" kart
  const OZSAYGI   = 'temel-ozsaygi-filiz'; // FARKLI erdem — eşleşmemeli

  afterEach(() => {
    delete S._oturumIzi;
    delete S._kisiKarti;
    delete window.omGunSatiri;
  });

  it('oturum izinde hiç kart yoksa oturumEslesme false', () => {
    S._oturumIzi = { ekranlar: [], kartlar: [], skipler: [], torenler: [] };
    const g = secGirdiTopla('kart', OZSEVGI_A, {});
    expect(g.oturumEslesme).toBe(false);
  });

  it('bağlayıcı karar 2: AYNI kart bu oturumda açıldıysa çarpan uygulanmaz (kendisi != tema)', () => {
    S._oturumIzi = { ekranlar: [], kartlar: [{ id: OZSEVGI_A, ts: Date.now() }], skipler: [], torenler: [] };
    const g = secGirdiTopla('kart', OZSEVGI_A, {});
    expect(g.oturumEslesme).toBe(false);
  });

  it('bağlayıcı karar 2: KARDEŞ bir erdem (aynı tema, farklı öğe) açıldıysa true', () => {
    S._oturumIzi = { ekranlar: [], kartlar: [{ id: OZSEVGI_B, ts: Date.now() }], skipler: [], torenler: [] };
    const g = secGirdiTopla('kart', OZSEVGI_A, {});
    expect(g.oturumEslesme).toBe(true);
  });

  it('farklı erdemden bir kart açılması eşleşme SAYILMAZ', () => {
    S._oturumIzi = { ekranlar: [], kartlar: [{ id: OZSAYGI, ts: Date.now() }], skipler: [], torenler: [] };
    const g = secGirdiTopla('kart', OZSEVGI_A, {});
    expect(g.oturumEslesme).toBe(false);
  });

  it('kkEsikDurum varsa yorgunluk + tazelik + red[] negatifi oradan gelir', () => {
    S._oturumIzi = { ekranlar: [], kartlar: [], skipler: [], torenler: [] };
    S._kisiKarti = { collection: {}, esik: {} };
    const atTs = new Date(Date.now() - GUN_MS).toISOString();
    kkEsikAc(OZSEVGI_A, { skor: 60 });
    S._kisiKarti.esik[OZSEVGI_A].at = atTs;
    S._kisiKarti.esik[OZSEVGI_A].davet = 2;
    S._kisiKarti.esik[OZSEVGI_A].sonDavet = atTs;
    S._kisiKarti.esik[OZSEVGI_A].red = ['a', 'b'];

    const g = secGirdiTopla('kart', OZSEVGI_A, {});
    expect(g.yorgunlukSayisi).toBe(2);
    expect(g.yorgunlukTs).toBe(atTs);
    expect(g.ts).toBe(atTs);
    expect(g.negatif).toBe(2);
  });

  it('kkEsikDurum yoksa yorgunluk/ts alanları eksik kalır (secAday "az önce" sayar)', () => {
    S._oturumIzi = { ekranlar: [], kartlar: [], skipler: [], torenler: [] };
    S._kisiKarti = { collection: {}, esik: {} };
    const g = secGirdiTopla('kart', OZSEVGI_A, {});
    expect(g.yorgunlukSayisi).toBeUndefined();
    expect(g.ts).toBeUndefined();
  });

  it('window.omGunSatiri\'nin tepkisiz gösterimi (false) bir negatif sinyal ekler', () => {
    S._oturumIzi = { ekranlar: [], kartlar: [], skipler: [], torenler: [] };
    window.omGunSatiri = () => ({ gezinme: null, neg: { gosterim: { spotlight: { [OZSEVGI_A]: false } }, arac: {} }, davet: null });
    const g = secGirdiTopla('spotlight', OZSEVGI_A, {});
    expect(g.negatif).toBe(1);
  });

  /* Gösterim kaydı ÜÇ HÂLLİ: yok / false (tepkisiz) / true (açıldı).
     Üçüncü hâli atlamak değer modelinin olumlu yarısını kör bırakır —
     FAZ 5 denetiminde bulundu (2026-08-09). */
  it('window.omGunSatiri\'nin TEPKİLİ gösterimi (true) OLUMLU sinyaldir, negatif değil', () => {
    S._oturumIzi = { ekranlar: [], kartlar: [], skipler: [], torenler: [] };
    window.omGunSatiri = () => ({ gezinme: null, neg: { gosterim: { spotlight: { [OZSEVGI_A]: true } }, arac: {} }, davet: null });
    const g = secGirdiTopla('spotlight', OZSEVGI_A, {});
    expect(g.negatif).toBeUndefined();
    expect(g.olumlu).toBe(1);
  });

  it('hiç gösterilmemiş kart ne olumlu ne negatif taşır (varsayım yok)', () => {
    S._oturumIzi = { ekranlar: [], kartlar: [], skipler: [], torenler: [] };
    window.omGunSatiri = () => ({ gezinme: null, neg: { gosterim: { spotlight: {} }, arac: {} }, davet: null });
    const g = secGirdiTopla('spotlight', OZSEVGI_A, {});
    expect(g.olumlu).toBeUndefined();
    expect(g.negatif).toBeUndefined();
  });

  it('açılan kart, tepkisiz kalandan ÖNCE sıralanır (uçtan uca)', () => {
    S._oturumIzi = { ekranlar: [], kartlar: [], skipler: [], torenler: [] };
    window.omGunSatiri = () => ({
      gezinme: null,
      neg: { gosterim: { spotlight: { acilan: true, tepkisiz: false } }, arac: {} },
      davet: null,
    });
    const ek = { deger: 70, n: 5, ts: Date.now() };
    const adaylar = [
      secAday('kart', 'tepkisiz', secGirdiTopla('spotlight', 'tepkisiz', ek)),
      secAday('kart', 'acilan', secGirdiTopla('spotlight', 'acilan', ek)),
    ];
    expect(secSirala(adaylar).map((x) => x.id)).toEqual(['acilan', 'tepkisiz']);
  });

  it('`ek` her zaman kazanır — deger/n çağırandan gelir, buradan asla türetilmez', () => {
    S._oturumIzi = { ekranlar: [], kartlar: [], skipler: [], torenler: [] };
    const g = secGirdiTopla('kart', OZSEVGI_A, { deger: 77, n: 9 });
    expect(g.deger).toBe(77);
    expect(g.n).toBe(9);
  });

  it('S._oturumIzi hiç yoksa (auth öncesi) patlamaz, boş girdi + ek döner', () => {
    delete S._oturumIzi;
    expect(() => secGirdiTopla('kart', OZSEVGI_A, { deger: 50, n: 5 })).not.toThrow();
    const g = secGirdiTopla('kart', OZSEVGI_A, { deger: 50, n: 5 });
    expect(g.deger).toBe(50);
  });

  it('secGirdiTopla\'nın çıktısı doğrudan secAday\'e beslenebilir (uçtan uca)', () => {
    S._oturumIzi = { ekranlar: [], kartlar: [{ id: OZSEVGI_B, ts: Date.now() }], skipler: [], torenler: [] };
    const g = secGirdiTopla('kart', OZSEVGI_A, { deger: 100, n: 5, ts: Date.now() });
    const aday = secAday('kart', OZSEVGI_A, g);
    expect(aday).not.toBeNull();
    // oturumEslesme true → SEC_OTURUM_CARPANI (1.35) skoru yükseltir
    expect(aday.skor).toBeGreaterThan(100);
  });
});

describe('secInit — TDZ-güvenli guard', () => {
  it('kullanıcı yokken çağrılması patlamaz', () => {
    S.currentUser = null;
    expect(() => secInit()).not.toThrow();
  });

  it('kullanıcı varken çağrılması patlamaz (idempotent)', () => {
    S.currentUser = { id: 'sec-test-user' };
    expect(() => secInit()).not.toThrow();
    expect(() => secInit()).not.toThrow();
  });
});

describe('window.sec* sözleşmesi', () => {
  it('secAday/secSirala/secGirdiTopla/secInit window\'a açılmış fonksiyonlardır', () => {
    expect(typeof window.secAday).toBe('function');
    expect(typeof window.secSirala).toBe('function');
    expect(typeof window.secGirdiTopla).toBe('function');
    expect(typeof window.secInit).toBe('function');
  });

  it('FAZ 7 beyan yüzeyi de window\'da (secNedenVeri/secBeyan*)', () => {
    expect(typeof window.secNedenVeri).toBe('function');
    expect(typeof window.secBeyanVar).toBe('function');
    expect(typeof window.secBeyanAzalt).toBe('function');
    expect(typeof window.secBeyanGeriAl).toBe('function');
  });
});

/* ═══ FAZ 7 — BEYAN DEFTERİ ("daha az göster") ═══════════════════════════
   Beyanın ölçümden farkı: ölçüm bir çıkarımdır ve tabanı vardır
   (SEC_NEGATIF_TABAN), beyan bir karardır ve adayı hiç doğurmaz. */
describe('secBeyanAzalt / secBeyanVar / secBeyanGeriAl', () => {
  const UID = 'sec-beyan-test-user';
  const KEY = `etw_secici_v1_${UID}`;

  beforeEach(() => {
    S.currentUser = { id: UID };
    // SafeStorage'ın bellek-içi _kvCache'i testler arası sızar — remove() şart.
    SafeStorage.remove(KEY);
    secInit();
    secBeyanGeriAl('kart-x');
  });

  afterEach(() => { SafeStorage.remove(KEY); });

  it('beyan verilmemişken secBeyanVar false döner', () => {
    expect(secBeyanVar('kart-x')).toBe(false);
  });

  it('secBeyanAzalt beyanı yazar, secBeyanVar onu görür', () => {
    expect(secBeyanAzalt('spotlight', 'kart-x')).toBe(true);
    expect(secBeyanVar('kart-x')).toBe(true);
  });

  it('beyan SafeStorage\'a kalıcı yazılır (per-uid anahtar)', () => {
    secBeyanAzalt('spotlight', 'kart-x');
    const disk = SafeStorage.get(KEY, null);
    expect(disk).toBeTruthy();
    expect(disk.azalt['kart-x']).toBeTruthy();
    expect(disk.azalt['kart-x'].tur).toBe('spotlight');
  });

  it('secBeyanGeriAl beyanı siler — susturma süresiz AMA geri alınabilir', () => {
    secBeyanAzalt('spotlight', 'kart-x');
    expect(secBeyanGeriAl('kart-x')).toBe(true);
    expect(secBeyanVar('kart-x')).toBe(false);
    expect(secBeyanGeriAl('kart-x')).toBe(false);   // ikinci kez: silinecek şey yok
  });

  it('susturma TÜRDEN bağımsızdır: spotlight\'ta susturulan kart keşif yuvasında da susar', () => {
    secBeyanAzalt('spotlight', 'kart-x');
    const g = secGirdiTopla('bugunun_kisisi', 'kart-x', { deger: 90, n: 9 });
    expect(g.beyanAzalt).toBe(true);
  });

  it('id yoksa yazmaz/patlamaz', () => {
    expect(secBeyanAzalt('spotlight', '')).toBe(false);
    expect(secBeyanVar('')).toBe(false);
  });
});

describe('Beyan Kapısı — beyan ölçümü EZER', () => {
  const UID = 'sec-beyan-kapi-user';
  const KEY = `etw_secici_v1_${UID}`;

  beforeEach(() => {
    S.currentUser = { id: UID };
    SafeStorage.remove(KEY);
    secInit();
  });
  afterEach(() => { SafeStorage.remove(KEY); });

  it('beyanAzalt girdisi varsa kanıt ne kadar güçlü olursa olsun aday doğmaz', () => {
    const guclu = { deger: 100, n: 50, ts: Date.now() };
    expect(secAday('kart', 'a', guclu)).not.toBeNull();
    expect(secAday('kart', 'a', { ...guclu, beyanAzalt: true })).toBeNull();
  });

  it('beyan kapısı kanıt kapısından ÖNCEDİR (kanıtsız + beyanlı da null)', () => {
    expect(secAday('kart', 'a', { deger: 10, n: 1, beyanAzalt: true })).toBeNull();
  });

  it('secGirdiTopla beyanı okur → uçtan uca aday düşer', () => {
    S._oturumIzi = { ekranlar: [], kartlar: [], skipler: [], torenler: [] };
    S._kisiKarti = { collection: {}, esik: {} };
    secBeyanAzalt('spotlight', KART_A);
    const g = secGirdiTopla('spotlight', KART_A, { deger: 100, n: 20 });
    expect(secAday('spotlight', KART_A, g)).toBeNull();
  });

  it('beyan okuması diğer okumalar patlasa DA yapılır (susturma sızmaz)', () => {
    S._oturumIzi = { ekranlar: [], kartlar: [], skipler: [], torenler: [] };
    S._kisiKarti = { collection: {}, esik: {} };
    secBeyanAzalt('spotlight', KART_A);
    const eski = window.omGunSatiri;
    window.omGunSatiri = () => { throw new Error('09d patladı'); };
    try {
      const g = secGirdiTopla('spotlight', KART_A, { deger: 100, n: 20 });
      expect(g.beyanAzalt).toBe(true);
      expect(secAday('spotlight', KART_A, g)).toBeNull();
    } finally { window.omGunSatiri = eski; }
  });

  it('K2 — beyan kazanım kapısına DOKUNMAZ: susturulan kart yine earned olabilir', async () => {
    const { kkMatchCard } = await import('../js/parts/10q-w2-kisi-karti.js');
    const cards = getFullDeck();
    const sig = {
      sessions: 80, gecisReadings: 30, reviews: 20, selfDialogue: 20,
      dinlenme: 10, meclisNamed: 5, hayalScenes: 10,
      oz_sevgi: 95, oz_saygi: 95, oz_deger: 95, oz_guven: 95, bolluk: 95,
      standart: 95, hak_etmek: 95, normal: 95, layik: 95,
      trust: 90, vulnerability: 90, streak: 30, gecisStreak: 30, gecisCards: 10,
      meclisIntegrated: 5, elmas: 100, davranisKanit: 10,
      empoweringRatio: 95, beliefCount: 30, newChoiceRatio: 95, gratitude: 20,
      hayalReflection: 90,
    };
    const kart = cards[0];
    const onceEarned = kkMatchCard(kart, sig).earned;
    secBeyanAzalt('spotlight', kart.id);
    expect(secBeyanVar(kart.id)).toBe(true);
    expect(kkMatchCard(kart, sig).earned).toBe(onceEarned);
  });
});

describe('secNedenVeri — "Neden bu?" yüzeyinin okuması', () => {
  const UID = 'sec-neden-user';
  const KEY = `etw_secici_v1_${UID}`;

  beforeEach(() => {
    S.currentUser = { id: UID };
    S._oturumIzi = { ekranlar: [], kartlar: [], skipler: [], torenler: [] };
    S._kisiKarti = { collection: {}, esik: {} };
    SafeStorage.remove(KEY);
    secInit();
  });
  afterEach(() => { SafeStorage.remove(KEY); });

  it('girdi + aday + beyan üçlüsünü döndürür', () => {
    const v = secNedenVeri('spotlight', KART_A, { deger: 80, n: 10 });
    expect(v.girdi.deger).toBe(80);
    expect(v.aday).not.toBeNull();
    expect(v.beyan).toBe(false);
  });

  it('kanıtsız öğede aday null olur (panel ölçüm satırı üretemez)', () => {
    const v = secNedenVeri('spotlight', KART_A, { deger: 80, n: 1 });
    expect(v.aday).toBeNull();
  });

  it('BEYANLI öğede bile aday üretilir — panel açılabilmeli ki karar geri alınabilsin', () => {
    secBeyanAzalt('spotlight', KART_A);
    const v = secNedenVeri('spotlight', KART_A, { deger: 80, n: 10 });
    expect(v.beyan).toBe(true);
    expect(v.aday).not.toBeNull();      // beyanAzalt bastırıldı (bilinçli)
  });

  it('aday bileşenleri panel için okunabilir (hangi sinyal konuştu)', () => {
    const v = secNedenVeri('spotlight', KART_A, { deger: 80, n: 10 });
    expect(v.aday.bilesenler).toBeTruthy();
    expect(typeof v.aday.bilesenler.tazelik).toBe('number');
    expect(typeof v.aday.bilesenler.negatif).toBe('number');
  });
});

// ─── Beyan kimliği + liste (İç Çalışma 02 · portre tüketicisi) ──────────────

describe('secBeyanId — kimlik METİNDEN türer, indeksten değil', () => {
  it('aynı metin aynı kimliği verir (determinizm)', () => {
    expect(secBeyanId('portre-deger', 'Dürüstlük')).toBe(secBeyanId('portre-deger', 'dürüstlük'));
  });

  it('tür kimliğin parçasıdır — aynı metin farklı türde farklı kimliktir', () => {
    expect(secBeyanId('portre-deger', 'özgürlük')).not.toBe(secBeyanId('portre-celiski', 'özgürlük'));
  });

  it('boşluk normalize edilir, uzun metin kırpılır', () => {
    expect(secBeyanId('portre-deger', '  iki   boşluk ')).toBe('portre-deger:iki boşluk');
    expect(secBeyanId('portre-deger', 'x'.repeat(80))).toBe('portre-deger:' + 'x'.repeat(48));
  });

  it('eksik girdide boş döner — boş kimlikle beyan yazılamaz', () => {
    expect(secBeyanId('', 'metin')).toBe('');
    expect(secBeyanId('portre-deger', '')).toBe('');
    expect(secBeyanAzalt('portre-deger', secBeyanId('portre-deger', ''))).toBe(false);
  });
});

describe('secBeyanListe — damıtmanın okuduğu susturulmuş metinler', () => {
  it('yalnız istenen türü döndürür ve öneki soyar', () => {
    S.currentUser = { id: 'beyan-liste-user' };
    secBeyanAzalt('portre-deger', secBeyanId('portre-deger', 'dürüstlük'));
    secBeyanAzalt('portre-celiski', secBeyanId('portre-celiski', 'özgürlük istiyorsun'));
    secBeyanAzalt('kart', 'bir-kart-id');
    expect(secBeyanListe('portre-deger')).toEqual(['dürüstlük']);
    expect(secBeyanListe('portre-celiski')).toEqual(['özgürlük istiyorsun']);
  });

  it('geri alınan beyan listeden düşer', () => {
    S.currentUser = { id: 'beyan-liste-user-2' };
    const id = secBeyanId('portre-deger', 'sadakat');
    secBeyanAzalt('portre-deger', id);
    expect(secBeyanListe('portre-deger')).toContain('sadakat');
    secBeyanGeriAl(id);
    expect(secBeyanListe('portre-deger')).not.toContain('sadakat');
  });
});
