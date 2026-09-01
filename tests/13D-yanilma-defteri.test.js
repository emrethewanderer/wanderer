/**
 * DUYGU MOTORU — YANILMA DEFTERİ (13D §10, FAZ 15, K13)
 *
 * `dgYanilma*` motorun kendi HATA oranını ölçer: her yüzey için kaç kez
 * konuştu, kaç kez düzeltildi ("beni yanlış okudun"). Defter kayan
 * penceredir (DG_YANILMA_PENCERE=12), kümülatif DEĞİL — kapanmanın affı
 * olmalı. Oran `DG_YANILMA_MIN_N=5` altında `null` (§6.10), `DG_YANILMA_
 * ESIK=0.34`'ü AŞARSA yüzey kapanır — `sohbet` hariç: K6/K9 gereği sohbet
 * hiçbir hâlde kapanmaz.
 *
 * Kırmızıya dönerlerse .claude/plans/duygu-motoru.md § FAZ 15'e (K13) bak.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  dgNabiz,
  dgKapi,
  dgYanilmaKonustu,
  dgYanilmaDuzeltildi,
  dgYanilmaOran,
  dgYanilmaKapali,
} from '../js/parts/13D-duygu-motoru.js';

const _oncekiDetectCrisis = window.detectCrisis;
beforeEach(() => { window.detectCrisis = () => false; });
afterEach(() => { window.detectCrisis = _oncekiDetectCrisis; });

describe('window kontratı', () => {
  it('§10 fonksiyonlarının hepsi window\'da', () => {
    expect(typeof window.dgYanilmaKonustu).toBe('function');
    expect(typeof window.dgYanilmaDuzeltildi).toBe('function');
    expect(typeof window.dgYanilmaOran).toBe('function');
    expect(typeof window.dgYanilmaKapali).toBe('function');
  });
});

describe('dgYanilmaKonustu — saf yazma + kayan pencere', () => {
  it('boş İklim\'de ilk konuşma konustu:1, duzeltildi:0 yazar', () => {
    const ik = dgYanilmaKonustu({ yuzeyDefter: {} }, 'secici');
    expect(ik.yuzeyDefter.secici).toEqual({ konustu: 1, duzeltildi: 0 });
  });

  it('iklim/yuzey yoksa AYNEN döner (saf no-op)', () => {
    expect(dgYanilmaKonustu(null, 'secici')).toBe(null);
    const ik = { yuzeyDefter: {} };
    expect(dgYanilmaKonustu(ik, null)).toBe(ik);
  });

  it('kaynağı DEĞİŞTİRMEZ — yeni bir kopya döner (dgLehceDuzelt emsali)', () => {
    const ik = { yuzeyDefter: {} };
    const yeni = dgYanilmaKonustu(ik, 'secici');
    expect(yeni).not.toBe(ik);
    expect(ik.yuzeyDefter).toEqual({});
  });

  it('yuzeyDefter yoksa (eski/yarım kayıt) bile güvenli düşer', () => {
    const ik = dgYanilmaKonustu({}, 'toren');
    expect(ik.yuzeyDefter.toren.konustu).toBe(1);
  });

  it('12 konuşmadan sonra pencere dolar — 13. konuşma en eskiyi ORANI KORUYARAK eritir', () => {
    let ik = { yuzeyDefter: {} };
    // 12 konuşma, 3'ü düzeltilmiş (oran 0.25)
    for (let i = 0; i < 12; i++) ik = dgYanilmaKonustu(ik, 'push');
    for (let i = 0; i < 3; i++) ik = dgYanilmaDuzeltildi(ik, 'push');
    expect(ik.yuzeyDefter.push.konustu).toBe(12);
    expect(ik.yuzeyDefter.push.duzeltildi).toBe(3);

    ik = dgYanilmaKonustu(ik, 'push'); // 13. konuşma — eviction devrede
    expect(ik.yuzeyDefter.push.konustu).toBe(12); // pencere TAVANDA kalır
    // eviction oranı korur: 3/12 eski katkı erir, yeni konuşma oranı DÜŞÜRÜR
    expect(ik.yuzeyDefter.push.duzeltildi).toBeCloseTo(3 - 3 / 12, 5);
  });
});

describe('dgYanilmaDuzeltildi — güvenli düşüş + saf yazma', () => {
  it('konuşmamış bir yüzeyde (konustu=0) SESSİZCE no-op döner', () => {
    const ik = { yuzeyDefter: {} };
    expect(dgYanilmaDuzeltildi(ik, 'secici')).toBe(ik);
  });

  it('konuşmuş bir yüzeyde duzeltildi 1 artar', () => {
    let ik = dgYanilmaKonustu({ yuzeyDefter: {} }, 'secici');
    ik = dgYanilmaDuzeltildi(ik, 'secici');
    expect(ik.yuzeyDefter.secici).toEqual({ konustu: 1, duzeltildi: 1 });
  });

  it('iklim/yuzey yoksa AYNEN döner', () => {
    expect(dgYanilmaDuzeltildi(null, 'secici')).toBe(null);
    const ik = { yuzeyDefter: { secici: { konustu: 2, duzeltildi: 0 } } };
    expect(dgYanilmaDuzeltildi(ik, null)).toBe(ik);
  });
});

/* TAVAN — faz denetimi 2026-08-30. `duzeltildi` tek yönlü artıyordu ve
   şeffaflık panelinin "geri al → yeniden sustur" döngüsü aynı konuşmayı
   ikinci kez düzeltme sayabiliyordu; `konustu` o turda artmadığı için oran
   1'i aşıyordu. Kapanma kararı bundan etkilenmez (eşik 0.34) ama
   `dgYanilmaOran` bir ORAN sunar — %100'ü aşan bir düzeltme oranı ölçüm
   değil sayacın artığıdır (§6.10). Kararsızlık bir düzeltmedir, iki değil. */
describe('dgYanilmaDuzeltildi — tavan: duzeltildi konustu\'yu AŞAMAZ', () => {
  it('doymuş defterde (konustu=duzeltildi) yeni düzeltme sayacı BÜYÜTMEZ', () => {
    const ik = { yuzeyDefter: { secici: { konustu: 2, duzeltildi: 2 } } };
    const sonra = dgYanilmaDuzeltildi(ik, 'secici');
    expect(sonra.yuzeyDefter.secici).toEqual({ konustu: 2, duzeltildi: 2 });
  });

  it('tekrar tekrar susturma oranı 1\'in ÜSTÜNE çıkaramaz', () => {
    let ik = { yuzeyDefter: {} };
    for (let i = 0; i < 5; i++) ik = dgYanilmaKonustu(ik, 'secici');
    for (let i = 0; i < 8; i++) ik = dgYanilmaDuzeltildi(ik, 'secici');
    const g = dgYanilmaOran(ik, 'secici');
    expect(g.v).toBe(1);
    expect(g.n).toBe(5);
  });
});

describe('dgYanilmaOran — köken-kapılı gösterim (§6.10, dgIsabetGoster emsali)', () => {
  it('n < 5 iken (DG_YANILMA_MIN_N) sayı YOK', () => {
    const ik = { yuzeyDefter: { secici: { konustu: 4, duzeltildi: 4 } } };
    const g = dgYanilmaOran(ik, 'secici');
    expect(g.v).toBeNull();
    expect(g.n).toBe(4);
  });

  it('n >= 5 iken gerçek oranı döner', () => {
    const ik = { yuzeyDefter: { secici: { konustu: 5, duzeltildi: 2 } } };
    const g = dgYanilmaOran(ik, 'secici');
    expect(g.v).toBeCloseTo(0.4, 5);
    expect(g.n).toBe(5);
  });

  it('hiç konuşulmamış yüzeyde de sessizce yok döner (patlamaz)', () => {
    expect(dgYanilmaOran({ yuzeyDefter: {} }, 'push').v).toBeNull();
    expect(dgYanilmaOran(null, 'push').v).toBeNull();
  });
});

describe('dgYanilmaKapali — beşinci kadran (K13)', () => {
  it('sohbet DAİMA false — veri ne olursa olsun (K6+K9)', () => {
    const ik = { yuzeyDefter: { sohbet: { konustu: 20, duzeltildi: 18 } } };
    expect(dgYanilmaKapali(ik, 'sohbet')).toBe(false);
    expect(dgYanilmaKapali(null, 'sohbet')).toBe(false);
  });

  it('n < 5 iken kapanmaz — kanıt yetersiz', () => {
    const ik = { yuzeyDefter: { secici: { konustu: 4, duzeltildi: 4 } } };
    expect(dgYanilmaKapali(ik, 'secici')).toBe(false);
  });

  it('oran eşiği (0.34) AŞMAZSA açık kalır — 1/5=0.2', () => {
    const ik = { yuzeyDefter: { secici: { konustu: 5, duzeltildi: 1 } } };
    expect(dgYanilmaKapali(ik, 'secici')).toBe(false);
  });

  it('oran eşiği AŞARSA kapanır — 2/5=0.4 > 0.34', () => {
    const ik = { yuzeyDefter: { secici: { konustu: 5, duzeltildi: 2 } } };
    expect(dgYanilmaKapali(ik, 'secici')).toBe(true);
  });

  it('veri yoksa (yeni yüzey) kapanmaz — kanıtsız kapanma yok', () => {
    expect(dgYanilmaKapali({ yuzeyDefter: {} }, 'kart')).toBe(false);
    expect(dgYanilmaKapali(null, 'kart')).toBe(false);
  });
});

describe('dgKapi("secici"/"push"/"kart") — BEŞİNCİ kadran gerçekten kapatır', () => {
  const NABIZ_KIZGIN = () => dgNabiz('çok kızgınım!');
  const tazeTaban = () => ({ kova: Array(24).fill(2) });

  it('diğer kadranlar (tanık/tazelik/ehliyet) geçse bile yanılma eşiği AŞILMIŞSA null', () => {
    const iklim = {
      taban: tazeTaban(),
      isabet: { n: 9, uyum: 0.9 },
      yuzeyDefter: { secici: { konustu: 5, duzeltildi: 2 } }, // %40 > %34
    };
    const r = dgKapi('secici', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), oncekiNabiz: NABIZ_KIZGIN(), iklim,
    });
    expect(r).toBeNull();
  });

  it('yanılma eşiği altındaysa öteki kadranlar açıkken dolar', () => {
    const iklim = {
      taban: tazeTaban(),
      isabet: { n: 9, uyum: 0.9 },
      yuzeyDefter: { secici: { konustu: 5, duzeltildi: 1 } }, // %20 < %34
    };
    const r = dgKapi('secici', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), oncekiNabiz: NABIZ_KIZGIN(), iklim,
    });
    expect(r).not.toBeNull();
  });

  it('push da aynı beşinci kadrandan geçer', () => {
    const iklim = {
      taban: tazeTaban(),
      isabet: { n: 12, uyum: 0.8 },
      yuzeyDefter: { push: { konustu: 6, duzeltildi: 3 } }, // %50 > %34
    };
    const simdi = Date.now();
    const r = dgKapi('push', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), beyanKaniti: true, iklim,
      zaman: simdi - 10 * 60 * 1000, simdi,
    });
    expect(r).toBeNull();
  });

  it('kart (sunum-sadece) da yanılma eşiği aşınca null döner', () => {
    const iklim = { yuzeyDefter: { kart: { konustu: 8, duzeltildi: 6 } } }; // %75
    const r = dgKapi('kart', { metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), iklim });
    expect(r).toBeNull();
  });

  it('sohbet — yuzeyDefter\'de aynı yüksek oran olsa bile ASLA null (K13 sohbet istisnası)', () => {
    const iklim = { yuzeyDefter: { sohbet: { konustu: 20, duzeltildi: 18 } } };
    const r = dgKapi('sohbet', { metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), iklim, akis: null });
    expect(r).not.toBeNull();
    expect(r.eksen).toBeTruthy();
  });
});
