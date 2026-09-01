/**
 * DUYGU MOTORU — İKLİM (13D, FAZ 3)
 *
 * Bu testler K4'ü kilitler: kuvvet mutlak değil, kullanıcının kendi
 * tabanına göre GÖRECELİDİR. Aynı cümle iki farklı İklim'de farklı kuvvet
 * vermeli; taban boşken (yeni kullanıcı) mutlak kuvvete güvenli düşmeli —
 * uydurulmuş bir topluluk ortalaması DEĞİL, motorun kendi taban tablosu
 * (§6.10). Kırmızıya dönerlerse .claude/plans/duygu-motoru.md'ye bak.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { S } from '../js/state.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';
import {
  dgNabiz,
  dgIklimYukle,
  dgIklimKaydet,
  dgIklimTabanEkle,
  dgIklimModelOkumaEkle,
  dgKarsilamaPuani,
  dgIklimDefterEkle,
  dgLehceDuzelt,
} from '../js/parts/13D-duygu-motoru.js';

const TEST_UIDS = ['dg-iklim-test-a', 'dg-iklim-test-b'];

function _temizle() {
  // SafeStorage bellek-içi _kvCache üzerinde çalışır — localStorage.clear()
  // izolasyon SAĞLAMAZ (bkz. [[safestorage-testlerde-kvcache]]).
  TEST_UIDS.forEach(uid => {
    try { SafeStorage.remove(`etw_dg_iklim_v1_${uid}`); } catch (_) {}
  });
  try { SafeStorage.remove('etw_dg_iklim_v1_anon'); } catch (_) {}
}

describe('window kontratı', () => {
  it('window.dgInit / dgIklimYukle / dgIklimKaydet / dgIklimTabanEkle fonksiyon', () => {
    expect(typeof window.dgInit).toBe('function');
    expect(typeof window.dgIklimYukle).toBe('function');
    expect(typeof window.dgIklimKaydet).toBe('function');
    expect(typeof window.dgIklimTabanEkle).toBe('function');
  });
});

describe('dgIklimYukle — yeni kullanıcıda varsayılan (boş) İklim', () => {
  beforeEach(_temizle);
  afterEach(_temizle);

  it('kayıt yoksa taban/lehce/defter/beyan hepsi boş, v:1', () => {
    S.currentUser = { id: 'dg-iklim-test-a' };
    const iklim = dgIklimYukle();
    expect(iklim.taban.kova).toEqual([]);
    expect(iklim.taban.n).toBe(0);
    /* FAZ 14'te lehçe DOLDU (dgLehceDuzelt/Unut, aşağıdaki describe bloğu) —
       burada hâlâ boş beklenmesi "alan uygulanmadı" DEĞİL, "bu kullanıcı
       henüz hiçbir kelime düzeltmedi" gerçek bir sözleşmedir. */
    expect(iklim.lehce).toEqual({});
    expect(iklim.defter).toEqual({});
    expect(iklim.beyan).toEqual({});
    expect(iklim.isabet).toEqual({ n: 0, uyum: null, son: null });
    expect(iklim.yuzeyDefter).toEqual({});
    expect(iklim.v).toBe(1);
  });

  it('bozuk kayıt (taban eksik) varsayılana güvenli düşer', () => {
    S.currentUser = { id: 'dg-iklim-test-a' };
    SafeStorage.set('etw_dg_iklim_v1_dg-iklim-test-a', { defter: { keder: { n: 1, toplam: -1 } } });
    const iklim = dgIklimYukle();
    expect(iklim.taban.kova).toEqual([]);
    expect(iklim.defter.keder).toEqual({ n: 1, toplam: -1 }); // geçerli alan korunur
  });
});

describe('dgIklimKaydet + dgIklimYukle — round-trip', () => {
  beforeEach(_temizle);
  afterEach(_temizle);

  it('kaydedilen İklim aynı uid ile geri okunur', () => {
    S.currentUser = { id: 'dg-iklim-test-a' };
    let iklim = dgIklimYukle();
    iklim = dgIklimTabanEkle(iklim, 3);
    dgIklimKaydet(iklim);
    const geri = dgIklimYukle();
    expect(geri.taban.kova).toEqual([3]);
    expect(geri.taban.n).toBe(1);
  });

  it('per-uid izolasyon — başka uid kendi boş İklim\'ini görür', () => {
    S.currentUser = { id: 'dg-iklim-test-a' };
    let iklimA = dgIklimTabanEkle(dgIklimYukle(), 4);
    dgIklimKaydet(iklimA);

    S.currentUser = { id: 'dg-iklim-test-b' };
    const iklimB = dgIklimYukle();
    expect(iklimB.taban.kova).toEqual([]);
  });
});

describe('dgIklimTabanEkle — kayan pencere', () => {
  it('her ölçüm kovaya eklenir, n büyür', () => {
    let iklim = { taban: { n: 0, kova: [], tarih: null }, lehce: {}, defter: {}, beyan: {}, isabet: {n:0,uyum:null,son:null}, yuzeyDefter: {}, v: 1 };
    iklim = dgIklimTabanEkle(iklim, 2);
    iklim = dgIklimTabanEkle(iklim, 4);
    expect(iklim.taban.kova).toEqual([2, 4]);
    expect(iklim.taban.n).toBe(2);
  });

  it('pencere 90\'ı aşınca en eskiden düşer (FIFO)', () => {
    let iklim = { taban: { n: 0, kova: [], tarih: null }, lehce: {}, defter: {}, beyan: {}, isabet: {n:0,uyum:null,son:null}, yuzeyDefter: {}, v: 1 };
    for (let i = 0; i < 91; i++) iklim = dgIklimTabanEkle(iklim, 0);
    iklim = dgIklimTabanEkle(iklim, 4); // 92. ölçüm
    expect(iklim.taban.kova.length).toBe(90);
    expect(iklim.taban.kova[iklim.taban.kova.length - 1]).toBe(4);
  });

  it('geçersiz girdide (null iklim ya da NaN kuvvet) değişmeden döner', () => {
    expect(dgIklimTabanEkle(null, 3)).toBeNull();
    const iklim = { taban: { n: 0, kova: [1], tarih: null } };
    expect(dgIklimTabanEkle(iklim, NaN)).toBe(iklim);
  });
});

describe('dgNabiz(metin, {iklim}) — K4: kuvvet mutlak değil GÖRECELİ', () => {
  it('taban boşken (yeni kullanıcı) mutlak kuvvete güvenli düşer, kuvvetKaynagi:"mutlak"', () => {
    const bosIklim = { taban: { n: 0, kova: [], tarih: null } };
    const r = dgNabiz('çok kızgınım!', { iklim: bosIklim });
    expect(r.kuvvetKaynagi).toBe('mutlak');
    expect(r.kuvvet).toBe(dgNabiz('çok kızgınım!').kuvvet); // opts.iklim'siz ile AYNI
  });

  it('aynı cümle iki farklı İklim\'de farklı kuvvet verir (K4 asıl sözleşme)', () => {
    // A: bu kişide "kızgın" mesajları hep DÜŞÜK kuvvette geçmiş — yeni mesaj
    //    onun tabanına göre YÜKSEK bir uç sayılır.
    // Kova en az DG_IKLIM_MIN_N (20) olmalı — altında görecelik DEVREYE
    // GİRMEZ (denetim 2026-08-29: az veriden çıkarılan sıralama gürültüdür).
    const dusukTabanli = { taban: { n: 24, kova: Array(24).fill(0), tarih: null } };
    // B: bu kişide hep YÜKSEK kuvvette geçmiş — aynı mesaj onun için sıradan.
    const yuksekTabanli = { taban: { n: 24, kova: Array(24).fill(4), tarih: null } };

    const rA = dgNabiz('çok kızgınım!', { iklim: dusukTabanli });
    const rB = dgNabiz('çok kızgınım!', { iklim: yuksekTabanli });

    expect(rA.kuvvetKaynagi).toBe('goreli');
    expect(rB.kuvvetKaynagi).toBe('goreli');
    expect(rA.kuvvet).toBeGreaterThan(rB.kuvvet);
  });

  /* GÖRECELİĞİN ASGARİ KANITI (denetim 2026-08-29) — ilk yazımda percentile
     n=1'den itibaren hesaplanıyordu: kovada tek bir 4 varken gelen gerçek
     bir 2, oran=0 ile KUVVET 0 okunuyordu. Bir ölçünün göreli olabilmesi
     için önce yeterli olması gerekir (§6.10). */
  it('20 gözlemin ALTINDA görecelik devreye girmez — mutlak kalır', () => {
    const azVeri = { taban: { n: 19, kova: Array(19).fill(4), tarih: null } };
    const r = dgNabiz('çok üzgünüm', { iklim: azVeri });
    expect(r.kuvvetKaynagi).toBe('mutlak');
    expect(r.kuvvet).toBe(dgNabiz('çok üzgünüm').kuvvet);
  });

  it('mutlak kuvvet göreli okumadan SONRA da çıktıda kalır (emniyet kuralı körleşmesin)', () => {
    const yuksekTabanli = { taban: { n: 24, kova: Array(24).fill(4), tarih: null } };
    const r = dgNabiz('çok kızgınım!', { iklim: yuksekTabanli });
    expect(r.kuvvetKaynagi).toBe('goreli');
    expect(r.kuvvet).toBeLessThan(4);     // kendi ölçeğinde sıradan
    expect(r.kuvvetMutlak).toBe(4);       // ama mutlak tavanda — 7b bunu görür
  });

  it('opts.iklim verilmezse davranış FAZ 1 ile birebir aynı (mutlak)', () => {
    const r = dgNabiz('çok üzgünüm');
    expect(r.kuvvetKaynagi).toBe('mutlak');
    expect(typeof r.kuvvet).toBe('number');
  });
});

/* FAZ 9 (K5 "iki okuyucu, tek satır") — modelin kendi okuması uygulamanın
   kararını EZMEZ, İklim'e YANINA yazılır. Ayrışma bir hata değil sinyaldir:
   burada yalnız SAYILIR (n, ayristi), yorumlanmaz. */
describe('dgIklimModelOkumaEkle — modelin ikinci okuyucusu (FAZ 9)', () => {
  function _bosIklim() {
    return dgIklimYukle(); // varsayılan iskelet — modelOkuma dahil
  }

  it('window kontratı', () => {
    expect(typeof window.dgIklimModelOkumaEkle).toBe('function');
  });

  it('varsayılan İklim modelOkuma: {n:0, ayristi:0, son:null} taşır', () => {
    const iklim = _bosIklim();
    expect(iklim.modelOkuma).toEqual({ n: 0, ayristi: 0, son: null });
  });

  it('uygulama ve model AYNI ekseni okuduysa ayristi artmaz', () => {
    let iklim = dgIklimModelOkumaEkle(_bosIklim(), 'yatistirma', 'yatistirma', null);
    expect(iklim.modelOkuma.n).toBe(1);
    expect(iklim.modelOkuma.ayristi).toBe(0);
    expect(iklim.modelOkuma.son).toEqual({ uygulama: 'yatistirma', model: 'yatistirma', kanit: null, tarih: expect.any(String) });
  });

  it('uygulama ve model FARKLI eksen okuduysa ayrışma sayılır — bu bir HATA değil sinyaldir', () => {
    let iklim = dgIklimModelOkumaEkle(_bosIklim(), 'taniklik', 'sahiplenme', 'kendi sözünden kesilmiş cümle');
    expect(iklim.modelOkuma.n).toBe(1);
    expect(iklim.modelOkuma.ayristi).toBe(1);
    expect(iklim.modelOkuma.son.uygulama).toBe('taniklik');
    expect(iklim.modelOkuma.son.model).toBe('sahiplenme');
    expect(iklim.modelOkuma.son.kanit).toBe('kendi sözünden kesilmiş cümle');
  });

  it('sayaçlar BİRİKİR — ayrı bir turda sıfırlanmaz', () => {
    let iklim = _bosIklim();
    iklim = dgIklimModelOkumaEkle(iklim, 'taniklik', 'taniklik', null);
    iklim = dgIklimModelOkumaEkle(iklim, 'taniklik', 'yatistirma', null);
    iklim = dgIklimModelOkumaEkle(iklim, 'kutlama', 'kutlama', null);
    expect(iklim.modelOkuma.n).toBe(3);
    expect(iklim.modelOkuma.ayristi).toBe(1);
  });

  it('uygulama ekseni null ise (kriz üstü/erken tur) ayrışma sayılmaz, yalnız n artar', () => {
    const iklim = dgIklimModelOkumaEkle(_bosIklim(), null, 'kutlama', null);
    expect(iklim.modelOkuma.n).toBe(1);
    expect(iklim.modelOkuma.ayristi).toBe(0);
    expect(iklim.modelOkuma.son.uygulama).toBeNull();
  });

  it('modelEksen yoksa (DG: hiç gelmedi) İklim değişmeden döner', () => {
    const iklim = _bosIklim();
    expect(dgIklimModelOkumaEkle(iklim, 'taniklik', null, null)).toBe(iklim);
  });

  it('iklim null ise güvenli düşer', () => {
    expect(dgIklimModelOkumaEkle(null, 'taniklik', 'kutlama', null)).toBeNull();
  });

  it('`guven`/`confidence` gibi bir alan asla üretmez (K4)', () => {
    const iklim = dgIklimModelOkumaEkle(_bosIklim(), 'taniklik', 'kutlama', null);
    expect(iklim.modelOkuma).not.toHaveProperty('guven');
    expect(iklim.modelOkuma.son).not.toHaveProperty('guven');
    expect(iklim.modelOkuma.son).not.toHaveProperty('confidence');
  });

  it('kaydet+yükle round-trip — modelOkuma alanı korunur (yeni alan whitelist\'ten düşmez)', () => {
    S.currentUser = { id: 'dg-iklim-test-a' };
    let iklim = dgIklimModelOkumaEkle(dgIklimYukle(), 'taniklik', 'sahiplenme', 'kanıt cümlesi');
    dgIklimKaydet(iklim);
    const geri = dgIklimYukle();
    expect(geri.modelOkuma).toEqual(iklim.modelOkuma);
    try { SafeStorage.remove('etw_dg_iklim_v1_dg-iklim-test-a'); } catch (_) {}
  });
});

/* ÖĞRENME DEFTERİ (FAZ 10) — FAZ 4'ten beri defteri OKUYAN iki fonksiyon
   vardı ama defter hiç dolmuyordu. Bu testler doldurmanın iki kuralını
   kilitler: kanıtsızlıkta HİÇBİR ŞEY yazılmaz (uydurulmuş bir 0, n'i
   şişirip FAZ 4'ün eşiklerini sahte biçimde ilerletir) ve uyarılmanın
   yönü EKSENE bağlıdır (yatıştırmada düşmek iyidir, diriltmede yükselmek). */
describe('dgKarsilamaPuani — karşılama tuttu mu (FAZ 10)', () => {
  const nabiz = (deger, kuvvet) => ({ deger, kuvvet });

  it('kriz (tutma) PUANLANMAZ — bir seçim değildi (K9)', () => {
    expect(dgKarsilamaPuani('tutma', nabiz(-2, 4), nabiz(0, 1), 0)).toBeNull();
  });

  it('kanıt eksikse null — uydurulmuş 0 yazılmaz (§6.10)', () => {
    expect(dgKarsilamaPuani('taniklik', null, nabiz(0, 1), 0)).toBeNull();
    expect(dgKarsilamaPuani('taniklik', nabiz(-1, 3), null, 0)).toBeNull();
    expect(dgKarsilamaPuani(null, nabiz(-1, 3), nabiz(0, 1), 0)).toBeNull();
  });

  it('değerin iyileşmesi EVRENSEL olarak olumlu sayılır', () => {
    expect(dgKarsilamaPuani('taniklik', nabiz(-2, 3), nabiz(0, 3), 0)).toBeGreaterThan(0);
    expect(dgKarsilamaPuani('taniklik', nabiz(0, 3), nabiz(-2, 3), 0)).toBeLessThan(0);
  });

  it('yatıştırmada kuvvetin DÜŞMESİ iyidir', () => {
    expect(dgKarsilamaPuani('yatistirma', nabiz(-1, 4), nabiz(-1, 1), 0)).toBeGreaterThan(0);
    expect(dgKarsilamaPuani('yatistirma', nabiz(-1, 1), nabiz(-1, 4), 0)).toBeLessThan(0);
  });

  it('diriltmede kuvvetin YÜKSELMESİ iyidir — tek formül bunu ters okurdu', () => {
    expect(dgKarsilamaPuani('diriltme', nabiz(-1, 1), nabiz(-1, 3), 0)).toBeGreaterThan(0);
    expect(dgKarsilamaPuani('diriltme', nabiz(-1, 3), nabiz(-1, 1), 0)).toBeLessThan(0);
  });

  it('açık geri bildirim en güçlü sinyaldir (kullanıcının kendi beyanı)', () => {
    const notr = dgKarsilamaPuani('taniklik', nabiz(-1, 2), nabiz(-1, 2), 0);
    const olumlu = dgKarsilamaPuani('taniklik', nabiz(-1, 2), nabiz(-1, 2), 5);
    const olumsuz = dgKarsilamaPuani('taniklik', nabiz(-1, 2), nabiz(-1, 2), -5);
    expect(notr).toBe(0);
    expect(olumlu).toBeGreaterThan(notr);
    expect(olumsuz).toBeLessThan(notr);
  });
});

describe('dgIklimDefterEkle — defterin yazımı (FAZ 10)', () => {
  const bos = () => ({ defter: {} });

  it('puan defterde birikiyor', () => {
    let ik = dgIklimDefterEkle(bos(), 'taniklik', 2);
    ik = dgIklimDefterEkle(ik, 'taniklik', 1);
    expect(ik.defter.taniklik).toEqual({ n: 2, toplam: 3 });
  });

  it('eksenler birbirine karışmıyor', () => {
    let ik = dgIklimDefterEkle(bos(), 'taniklik', 2);
    ik = dgIklimDefterEkle(ik, 'kutlama', -1);
    expect(ik.defter.taniklik.n).toBe(1);
    expect(ik.defter.kutlama.toplam).toBe(-1);
  });

  it('geçersiz girdi defteri BOZMAZ', () => {
    const ik = bos();
    expect(dgIklimDefterEkle(ik, 'taniklik', null)).toBe(ik);
    expect(dgIklimDefterEkle(ik, null, 2)).toBe(ik);
    expect(dgIklimDefterEkle(null, 'taniklik', 2)).toBeNull();
  });

  it('kayan pencere: n tavanda kalır, kişi DEĞİŞİRSE defter onu takip eder', () => {
    let ik = bos();
    for (let i = 0; i < 40; i++) ik = dgIklimDefterEkle(ik, 'diriltme', -1);
    expect(ik.defter.diriltme.n).toBeLessThanOrEqual(30);
    const eskiOrt = ik.defter.diriltme.toplam / ik.defter.diriltme.n;
    expect(eskiOrt).toBeLessThan(0);
    // kişi değişti: artık diriltme tutuyor
    for (let i = 0; i < 40; i++) ik = dgIklimDefterEkle(ik, 'diriltme', 3);
    expect(ik.defter.diriltme.toplam / ik.defter.diriltme.n).toBeGreaterThan(0);
  });
});

/* ÖLÇEK KAPISI (çapraz denetim, 2026-08-29) — öğrenme defteri iki nabzı
   ÇIKARARAK puan üretir; ikisi farklı ölçekten gelirse (biri göreli, öteki
   mutlak) fark gerçek değişimi değil ÖLÇEK KAYMASINI ölçer. Kırık tam da
   İklim'i olgunlaşmış kullanıcıda doğar — yani en güvenilir olması gereken
   yerde. Kapı: aynı metin, aynı İklim → aynı kuvvet, hangi yoldan gelirse. */
describe('öğrenme defteri — iki nabız AYNI ölçekten okunmalı', () => {
  const olgunIklim = () => ({
    taban: { n: 24, kova: Array(24).fill(4), tarih: null },
    lehce: {}, defter: {}, beyan: {},
    isabet: { n: 0, uyum: null, son: null }, yuzeyDefter: {}, v: 1,
  });

  it('İklim geçilen ve geçilmeyen çağrı FARKLI kuvvet verir — karıştırılamaz', () => {
    const ik = olgunIklim();
    const goreli = dgNabiz('çok kaygılıyım, panik atıyorum!', { iklim: ik });
    const mutlak = dgNabiz('çok kaygılıyım, panik atıyorum!');
    expect(goreli.kuvvetKaynagi).toBe('goreli');
    expect(mutlak.kuvvetKaynagi).toBe('mutlak');
    expect(goreli.kuvvet).not.toBe(mutlak.kuvvet); // ölçekler gerçekten ayrışıyor
  });

  it('aynı İklim geçildiğinde iki çağrı AYNI kuvveti verir (defterin dayanağı)', () => {
    const ik = olgunIklim();
    const a = dgNabiz('çok kaygılıyım, panik atıyorum!', { iklim: ik });
    const b = dgNabiz('çok kaygılıyım, panik atıyorum!', { iklim: ik });
    expect(a.kuvvet).toBe(b.kuvvet);
    expect(a.kuvvetKaynagi).toBe(b.kuvvetKaynagi);
  });
});

/* LEHÇE — kayıt round-trip (FAZ 14, K1). Yazma/okuma/eşleme mekaniğinin
   TAMAMI tests/13D-ehliyet.test.js'te sınanır (§9 ile aynı grupta); burada
   yalnız SafeStorage'a giden yolun (dgIklimKaydet/Yukle) bu yeni alanı da
   diğerleri gibi taşıdığı doğrulanır — modelOkuma round-trip testiyle AYNI
   desen. */
describe('lehçe — kaydet+yükle round-trip (FAZ 14)', () => {
  beforeEach(_temizle);
  afterEach(_temizle);

  it('dgLehceDuzelt ile yazılan düzeltme SafeStorage round-trip\'inde korunur', () => {
    S.currentUser = { id: 'dg-iklim-test-a' };
    let iklim = dgLehceDuzelt(dgIklimYukle(), 'üzgün', 'donukluk');
    dgIklimKaydet(iklim);
    const geri = dgIklimYukle();
    expect(geri.lehce).toEqual({ üzgün: 'donukluk' });
  });
});
