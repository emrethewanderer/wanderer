/**
 * Emel + Dönem Kartı (K7 · Üç Usta planı FAZ 6) — INWO goal + NWO kartı
 *   - kkEmelSec: kullanıcı SEÇER (dayatılmaz); ikinci dokunuş bırakır
 *   - Tamamlanmış aile emel olamaz — emel ileriye bakar
 *   - kkDetectEmelCompletion: idempotent (kayıt silinir, iki kez ödenmez)
 *   - kkDonemHafta: pazartesi-tabanlı YEREL anahtar (UTC gün kaydırmaz)
 *   - kkDonemErdem: hafta boyunca SABİT; motorun reçetesine dokunmaz
 */
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

vi.mock('../js/parts/04-llm-hero-history.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, callLLM: vi.fn().mockResolvedValue('{}') };
});
vi.mock('../js/parts/00b-indexeddb.js', () => ({
  idbSaveRecording: vi.fn().mockResolvedValue(true),
  idbGetRecording: vi.fn().mockResolvedValue(null),
  idbDeleteRecording: vi.fn().mockResolvedValue(true),
}));

import {
  kkEmelSec, kkEmelDurum, kkDetectEmelCompletion, kkDonemHafta, kkDonemErdem,
  kkEmelKademeler, kkDetectEmelKademe,
} from '../js/parts/10q-w2-kisi-karti.js';
import { deckReady, getFullDeck } from '../js/parts/12b-kart-destesi.js';
import { S } from '../js/state.js';

let deck = [];
beforeAll(async () => { await deckReady(); deck = getFullDeck(); });

beforeEach(() => {
  document.body.innerHTML = '';
  S.currentUser = { id: 'u-emel-1' };
  S._kisiKarti = { profile: {}, collection: {}, history: [], pending: [], seenIntro: true,
                   closest: null, lastTick: 0, hedefler: {}, emeller: {} };
});

const enKucukAile = () => {
  const say = {};
  for (const c of deck) say[c.category] = (say[c.category] || 0) + 1;
  return Object.entries(say).sort((a, b) => a[1] - b[1])[0][0];
};
const aileyiDoldur = (cat, hepsi = true) => {
  const k = deck.filter(c => c.category === cat);
  const alinacak = hepsi ? k : k.slice(0, -1);
  for (const c of alinacak) S._kisiKarti.collection[c.id] = { earnedAt: 'x', rarity: c.rarity };
  return k;
};

describe('kkEmelSec — kullanıcı seçer, dayatılmaz', () => {
  it('yarım aile emel olarak seçilir ve ikinci dokunuşta bırakılır', () => {
    const cat = enKucukAile();
    aileyiDoldur(cat, false);
    expect(kkEmelSec(cat)).toBe(true);
    expect(S._kisiKarti.emeller[cat]).toBeTruthy();
    expect(kkEmelSec(cat)).toBe(true);
    expect(S._kisiKarti.emeller[cat]).toBeUndefined();
  });

  it('TAMAMLANMIŞ aile emel olamaz — emel ileriye bakar', () => {
    const cat = enKucukAile();
    aileyiDoldur(cat, true);
    expect(kkEmelSec(cat)).toBe(false);
    expect(S._kisiKarti.emeller[cat]).toBeUndefined();
  });

  it('bilinmeyen kategori sessizce reddedilir', () => {
    expect(kkEmelSec('boyle-bir-aile-yok')).toBe(false);
  });
});

describe('kkEmelDurum — ilerleme', () => {
  it('sahiplenilen kart sayısını ve yüzdeyi verir', () => {
    const cat = enKucukAile();
    const kartlar = aileyiDoldur(cat, false);
    const d = kkEmelDurum(cat, S._kisiKarti.collection);
    expect(d.total).toBe(kartlar.length);
    expect(d.owned).toBe(kartlar.length - 1);
    expect(d.tam).toBe(false);
    expect(d.pct).toBe(Math.round(((kartlar.length - 1) / kartlar.length) * 100));
  });
});

describe('kkDetectEmelCompletion — idempotent ödül', () => {
  it('emel tamamlanınca bir kez döner, kaydı silinir (Elmas iki kez ödenmez)', () => {
    const cat = enKucukAile();
    aileyiDoldur(cat, false);
    kkEmelSec(cat);
    expect(kkDetectEmelCompletion(S._kisiKarti)).toEqual([]);   // henüz tam değil
    aileyiDoldur(cat, true);
    expect(kkDetectEmelCompletion(S._kisiKarti)).toEqual([cat]);
    expect(S._kisiKarti.emeller[cat]).toBeUndefined();
    expect(kkDetectEmelCompletion(S._kisiKarti)).toEqual([]);
  });

  it('emel seçilmemişse tamamlanan aile ödül üretmez', () => {
    const cat = enKucukAile();
    aileyiDoldur(cat, true);
    expect(kkDetectEmelCompletion(S._kisiKarti)).toEqual([]);
  });

  it('bozuk durumda sessizce boş döner', () => {
    expect(kkDetectEmelCompletion(null)).toEqual([]);
    expect(kkDetectEmelCompletion({})).toEqual([]);
  });
});

describe('kkDonemHafta — pazartesi-tabanlı YEREL anahtar', () => {
  it('haftanın her günü aynı pazartesiye düşer', () => {
    // 2026-07-20 pazartesi … 2026-07-26 pazar
    const pzt = kkDonemHafta(new Date(2026, 6, 20, 12));
    for (const gun of [20, 21, 22, 23, 24, 25, 26]) {
      expect(kkDonemHafta(new Date(2026, 6, gun, 12)), String(gun)).toBe(pzt);
    }
    expect(pzt).toBe('2026-07-20');
  });

  it('pazar gününü ÖNCEKİ pazartesiye bağlar (hafta pazar biter)', () => {
    expect(kkDonemHafta(new Date(2026, 6, 26, 23))).toBe('2026-07-20');
    expect(kkDonemHafta(new Date(2026, 6, 27, 0))).toBe('2026-07-27');
  });

  it('gece yarısına yakın saatlerde gün kaymaz (yerel tarih, UTC değil)', () => {
    expect(kkDonemHafta(new Date(2026, 6, 22, 0, 5))).toBe('2026-07-20');
    expect(kkDonemHafta(new Date(2026, 6, 22, 23, 55))).toBe('2026-07-20');
  });
});

describe('kkDonemErdem — haftanın gündemi', () => {
  it('bir erdem ve o haftanın anahtarını üretir, hafta boyunca SABİT kalır', () => {
    const d1 = kkDonemErdem();
    expect(d1).toBeTruthy();
    expect(d1.weekKey).toBe(kkDonemHafta());
    expect(typeof d1.virtue).toBe('string');
    const d2 = kkDonemErdem();
    expect(d2.virtue).toBe(d1.virtue);      // gündem gün içinde savrulmaz
    expect(d2.weekKey).toBe(d1.weekKey);
  });

  it('gündem kartı SAHİPSİZ bir karttır (kazanılmış kişi gündem olmaz)', () => {
    const d = kkDonemErdem();
    if (d && d.cardId) expect(S._kisiKarti.collection[d.cardId]).toBeUndefined();
  });

  it('gündem kartı ULAŞILABİLİR olmalı — malzemesiz bileşik kart gündem olamaz', () => {
    const d = kkDonemErdem();
    if (!d || !d.cardId) return;
    const c = deck.find(x => x.id === d.cardId);
    // Koleksiyon boş olduğu için hiçbir bileşik kartın malzemesi hazır değil
    expect(c.category).not.toBe('bilesik');
  });

  it('hafta dönünce gündem yenilenir', () => {
    const d1 = kkDonemErdem();
    S._kisiKarti.donem = { ...d1, weekKey: '2000-01-03' };   // eski hafta
    const d2 = kkDonemErdem();
    expect(d2.weekKey).toBe(kkDonemHafta());
  });

  it('durum yoksa çökmez', () => {
    S._kisiKarti = null;
    expect(() => kkDonemErdem()).not.toThrow();
    expect(kkDonemErdem()).toBeNull();
  });
});

/* KADEMELİ EMEL (Hearthstone K6) — uzun yol ara duraklarla yaşar.
   Kural: kademe emelin SEÇİLDİĞİ andan sayılır; kutlama yalnız canlı
   kazanımda; TAM olan kademe değil COMPLETION'dır (çifte kutlama yok). */
describe('kkEmelKademeler — eşikler ailenin boyundan türetilir', () => {
  it('uzun ailede üç durak: üç kart · yarı · tamamı', () => {
    expect(kkEmelKademeler(15)).toEqual([3, 8, 15]);
    expect(kkEmelKademeler(31)).toEqual([3, 16, 31]);
  });

  it('kısa ailede alt basamaklar kendiliğinden düşer — tekrar üretilmez', () => {
    expect(kkEmelKademeler(3)).toEqual([2, 3]);
    expect(kkEmelKademeler(2)).toEqual([1, 2]);
    expect(kkEmelKademeler(1)).toEqual([1]);
  });

  it('boş aile eşik üretmez', () => {
    expect(kkEmelKademeler(0)).toEqual([]);
  });

  it('eşikler ARTAN ve BENZERSİZDİR', () => {
    for (let n = 1; n <= 40; n++) {
      const k = kkEmelKademeler(n);
      expect(new Set(k).size).toBe(k.length);
      expect([...k].sort((a, b) => a - b)).toEqual(k);
      expect(k[k.length - 1]).toBe(n);
    }
  });
});

describe('kademe ilerlemesi — kutlama yalnız ileriye bakar', () => {
  const buyukAile = () => {
    const say = {};
    for (const c of deck) say[c.category] = (say[c.category] || 0) + 1;
    return Object.entries(say).sort((a, b) => b[1] - a[1])[0][0];
  };
  const kartAl = (cat, n) => {
    const k = deck.filter(c => c.category === cat).slice(0, n);
    for (const c of k) S._kisiKarti.collection[c.id] = { earnedAt: 'x', rarity: c.rarity };
    return k;
  };

  it('emel seçilirken ELDEKİ kademe baz alınır — geçmiş kutlanmaz', () => {
    const cat = buyukAile();
    kartAl(cat, 5);                                   // üç eşiği çoktan geçmiş
    kkEmelSec(cat);
    expect(S._kisiKarti.emeller[cat].kademe).toBe(1);
    expect(kkDetectEmelKademe(S._kisiKarti)).toEqual([]);   // kutlanacak bir şey yok
  });

  it('yeni durak geçilince bildirilir ve kayıt ilerler', () => {
    const cat = buyukAile();
    const toplam = deck.filter(c => c.category === cat).length;
    kkEmelSec(cat);                                   // 0 kartla başla
    expect(S._kisiKarti.emeller[cat].kademe).toBe(0);

    kartAl(cat, 3);
    const ilk = kkDetectEmelKademe(S._kisiKarti);
    expect(ilk).toEqual([{ cat, kademe: 1, toplam: kkEmelKademeler(toplam).length }]);
    expect(S._kisiKarti.emeller[cat].kademe).toBe(1);

    // Aynı durak ikinci kez bildirilmez (idempotent).
    expect(kkDetectEmelKademe(S._kisiKarti)).toEqual([]);

    // Son durak ailenin TAMAMINA denk düşer; orayı kademe DEĞİL completion
    // mühürler (kkDetectEmelKademe `d.tam` olanı atlar). 12'lik kesitte en
    // büyük aile 6 karttır — durakları [3, 6], yani ara durak yoktur.
    kartAl(cat, toplam);
    expect(kkDetectEmelKademe(S._kisiKarti)).toEqual([]);
    expect(kkDetectEmelCompletion(S._kisiKarti)).toEqual([cat]);
  });

  it('TAM olan aile kademe olarak bildirilmez — o completion\'ın işidir', () => {
    const cat = (() => {
      const say = {};
      for (const c of deck) say[c.category] = (say[c.category] || 0) + 1;
      return Object.entries(say).sort((a, b) => a[1] - b[1])[0][0];
    })();
    kkEmelSec(cat);
    kartAl(cat, deck.filter(c => c.category === cat).length);   // tamamını al
    expect(kkDetectEmelKademe(S._kisiKarti)).toEqual([]);
    expect(kkDetectEmelCompletion(S._kisiKarti)).toEqual([cat]);
  });

  it('emel seçilmemişse kademe hesaplanmaz', () => {
    expect(kkDetectEmelKademe(S._kisiKarti)).toEqual([]);
    expect(kkDetectEmelKademe(null)).toEqual([]);
  });

  it('kkEmelDurum kademe bilgisini taşır', () => {
    const cat = buyukAile();
    kartAl(cat, 3);
    const d = kkEmelDurum(cat, S._kisiKarti.collection);
    expect(d.kademe).toBe(1);
    expect(d.kademeler[0]).toBe(3);
    expect(d.kademeler[d.kademeler.length - 1]).toBe(d.total);
  });
});
