/**
 * Tests for js/parts/13v-ihtiyac-motoru.js — İhtiyaç Motoru.
 *
 * Kapsam: ihOlgunluk kademeleri (tohum/tanisma/tanidik eşikleri ve sinyal
 * sayımı), ağırlıkların olgunlukla yer değiştirmesi (tohumda portre baskın,
 * tanıdıkta defter baskın), _oyDefter'in öğrenme kuralı (tutulamayan eksen
 * öne çıkar, tutulan eksen geri çekilir, yakın günlerin ekseni çeşitlilik
 * için cezalanır), hiç kaynak yokken varsayılan eksene düşüş ve guc'ün 0..1
 * sözleşmesi.
 *
 * 10q (kkComputeSignals) mock'lanır; 13u'nun window.sd* yüzeyi test içinde
 * stub'lanır — motor saf okuyucu olduğu için girdiler tam kontrol edilebilir.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../js/parts/10q-w2-kisi-karti.js', () => ({
  kkComputeSignals: vi.fn(() => ({})),
}));

import { S } from '../js/state.js';
import { kkComputeSignals } from '../js/parts/10q-w2-kisi-karti.js';
import { ihNeed, ihNeedTop, ihNeedAll, ihOlgunluk, ihKisi, ihOlay, IH_EKSENLER } from '../js/parts/13v-ihtiyac-motoru.js';

/** Nötr kişi sinyalleri — hiçbir eksene oy vermez (hepsi 50, şükür açık). */
const NOTR_SINYAL = {
  standart: 50, hak_etmek: 50, normal: 50, layik: 50,
  empoweringRatio: 50, newChoiceRatio: 50, gratitude: 5,
};

/** Defter satırı üretici — eksen banka anahtarından okunur. */
function satir(alan, eksen, kept, idx = 0) {
  return { day: '2026-07-30', domain: alan, key: `gl.soz.${alan}.${eksen}.${idx}`, text: 'x', source: 'banka', kept, reason: null };
}

function resetState() {
  S.currentUser = { id: 'ih-test-user' };
  S._currentLang = 'tr';
  S._foundationsProfile = null;
  S._onboardingRecommendation = null;
  S._portre = null;
  S._lifeMemory = { people: {}, openLoops: [] };

  // 13u yüzeyi — varsayılan: defter bomboş
  window.sdGunSayisi = () => 0;
  window.sdGecmis = () => [];
  window.sdSonSozler = () => [];
  window.sdTutmaOrani = () => null;
  // Diğer kaynaklar — varsayılan: sinyal yok
  window.omPatternCount = () => 0;
  window.oikGetCard = () => null;

  kkComputeSignals.mockReturnValue({ ...NOTR_SINYAL });
}

beforeEach(() => {
  resetState();
});

describe('ihOlgunluk — motorun kullanıcıyı ne kadar tanıdığı', () => {
  it('hiçbir veri yokken tohum', () => {
    expect(ihOlgunluk()).toBe('tohum');
  });

  it('defterde 3 gün birikince tanışma', () => {
    window.sdGunSayisi = () => 3;
    expect(ihOlgunluk()).toBe('tanisma');
  });

  it('defterde 10 gün birikince tanıdık', () => {
    window.sdGunSayisi = () => 10;
    expect(ihOlgunluk()).toBe('tanidik');
  });

  it('defter boş olsa da üç sinyal birleşince tanıdık', () => {
    S._lifeMemory = { people: { ayse: {}, mehmet: {} }, openLoops: [] };
    window.omPatternCount = () => 2;
    window.oikGetCard = () => ({ baslik: 'Sözünü Tutan' });
    expect(ihOlgunluk()).toBe('tanidik');
  });

  it('tek sinyal tanışmaya yeter', () => {
    window.oikGetCard = () => ({ baslik: 'Hedef' });
    expect(ihOlgunluk()).toBe('tanisma');
  });
});

describe('ihNeed — kaynak yokken düşüş', () => {
  it('hiç kaynak yoksa varsayılan eksene düşer, güç düşük kalır', () => {
    const n = ihNeed('bireysel');
    expect(n.kaynak).toBe('varsayilan');
    expect(n.eksen).toBe('default');
    expect(n.guc).toBeLessThan(0.5);
    expect(n.alan).toBe('bireysel');
    expect(n.olgunluk).toBe('tohum');
  });

  it('kkComputeSignals patlasa bile motor çalışır', () => {
    kkComputeSignals.mockImplementation(() => { throw new Error('10q yok'); });
    S._foundationsProfile = { oz_guven: { score: 10, signals_count: 3 }, oz_sevgi: { score: 90, signals_count: 3 } };
    expect(() => ihNeed('is')).not.toThrow();
    expect(ihNeed('is').eksen).toBe('oz_guven');
  });
});

describe('Temeller — en zayıf temel oy verir', () => {
  it('en düşük puanlı temel kazanır', () => {
    S._foundationsProfile = {
      oz_sevgi: { score: 80, signals_count: 3 }, oz_saygi: { score: 75, signals_count: 3 }, oz_deger: { score: 20, signals_count: 3 },
      oz_guven: { score: 70, signals_count: 3 }, bolluk: { score: 90, signals_count: 3 },
    };
    const n = ihNeed('bireysel');
    expect(n.eksen).toBe('oz_deger');
    expect(n.kaynak).toBe('temel');
    expect(n.guc).toBeGreaterThan(0);
    expect(n.guc).toBeLessThanOrEqual(1);
  });
});

describe('Portre tohumu — soğuk başlangıçta baskın', () => {
  it('tohum hâlinde portrenin alan önerisi temeli yener', () => {
    S._onboardingRecommendation = {
      weakestKey: 'oz_sevgi',
      domainRecs: { iliski: { foundationKey: 'oz_saygi' } },
    };
    // Temel başka bir ekseni işaret etse de tohumda portre ağırlığı (3.0)
    // temel ağırlığını (1.5) geçer.
    S._foundationsProfile = { oz_guven: { score: 5, signals_count: 3 }, oz_saygi: { score: 90, signals_count: 3 } };
    const n = ihNeed('iliski');
    expect(n.eksen).toBe('oz_saygi');
    expect(n.kaynak).toBe('portre');
  });

  it('tanıdık hâlinde portre geri çekilir, defter öne geçer', () => {
    S._onboardingRecommendation = { domainRecs: { is: { foundationKey: 'oz_saygi' } } };
    window.sdGunSayisi = () => 12;                       // → tanidik
    window.sdGecmis = () => [
      satir('is', 'oz_guven', false), satir('is', 'oz_guven', false),
    ];
    const n = ihNeed('is');
    expect(n.olgunluk).toBe('tanidik');
    expect(n.eksen).toBe('oz_guven');
    expect(n.kaynak).toBe('defter');
  });
});

describe('Portrenin kendi cümleleri — tohumun asıl kaynağı', () => {
  it('kullanıcının cümlesi ekseni çağırır ve kanıtta alıntılanır', () => {
    S._portre = {
      dusunceler: [{ text: 'Sürekli erteliyorum, bir türlü cesaret edemiyorum.', src: 'user' }],
      inanclar: [], duygular: [], davranislar: [],
    };
    const n = ihNeed('bireysel');
    expect(n.eksen).toBe('oz_guven');
    expect(n.kaynak).toBe('portre');
    expect(n.kanit).toBe('portre_alinti');
    expect(n.alinti).toContain('erteliyorum');
  });

  it('dört kategorinin hepsi taranır', () => {
    S._portre = {
      dusunceler: [], inanclar: [], duygular: [],
      davranislar: [{ text: 'Kimseye hayır diyemiyorum.', src: 'user' }],
    };
    expect(ihNeed('iliski').eksen).toBe('oz_saygi');
  });

  it('kullanıcının el yazısı, Emre çıkarımından ağır basar', () => {
    S._portre = {
      dusunceler: [{ text: 'Kendimi sevmiyorum.', src: 'emre' }],       // 0.5
      inanclar: [{ text: 'Hep erteliyorum, cesaret edemiyorum.', src: 'user' }], // 1.0
      duygular: [], davranislar: [],
    };
    expect(ihNeed('bireysel').eksen).toBe('oz_guven');
  });

  it('uzun cümle kelime sınırında kısaltılır', () => {
    S._portre = {
      dusunceler: [{ text: 'Sürekli erteliyorum çünkü bir işe başladığımda onu bitiremeyeceğimden korkuyorum ve bu yüzden hiç başlamıyorum.', src: 'user' }],
      inanclar: [], duygular: [], davranislar: [],
    };
    const n = ihNeed('bireysel');
    expect(n.alinti.length).toBeLessThanOrEqual(53);
    expect(n.alinti.endsWith('…')).toBe(true);
  });

  it('boş, bozuk veya metinsiz maddeler sessizce atlanır', () => {
    S._portre = {
      dusunceler: [null, undefined, {}, { text: '   ', src: 'user' }],
      inanclar: [], duygular: [], davranislar: [],
    };
    expect(() => ihNeed('bireysel')).not.toThrow();
    expect(ihNeed('bireysel').kaynak).toBe('varsayilan');
  });

  it('düz string madde biçimi de okunur (eski kayıtlar)', () => {
    S._portre = { dusunceler: ['Hiçbir zaman yeterince iyi değilim.'], inanclar: [], duygular: [], davranislar: [] };
    expect(ihNeed('bireysel').eksen).toBe('oz_deger');
  });

  it('tanıdık hâlinde portre alıntısı defterin önüne geçemez', () => {
    S._portre = {
      dusunceler: [{ text: 'Hep erteliyorum, cesaret edemiyorum.', src: 'user' }],
      inanclar: [], duygular: [], davranislar: [],
    };
    window.sdGunSayisi = () => 12;
    window.sdGecmis = () => [
      satir('bireysel', 'oz_saygi', false), satir('bireysel', 'oz_saygi', false),
    ];
    const n = ihNeed('bireysel');
    expect(n.eksen).toBe('oz_saygi');
    expect(n.kaynak).toBe('defter');
  });
});

describe('Söz Defteri — öğrenme kuralı', () => {
  beforeEach(() => { window.sdGunSayisi = () => 12; });   // tanidik

  it('tutulamayan eksen öne çıkar (iş bitmedi)', () => {
    window.sdGecmis = () => [
      satir('bireysel', 'oz_saygi', false),
      satir('bireysel', 'oz_saygi', false),
      satir('bireysel', 'oz_sevgi', true),
    ];
    const n = ihNeed('bireysel');
    expect(n.eksen).toBe('oz_saygi');
    expect(n.kanit).toBe('defter_tutunmadi');
  });

  it('istikrarla tutulan eksen geri çekilir (sıra başka yerde)', () => {
    S._foundationsProfile = {
      oz_sevgi: { score: 10, signals_count: 3 },        // temel bu ekseni çağırıyor
      oz_saygi: { score: 55, signals_count: 3 }, oz_deger: { score: 60, signals_count: 3 }, oz_guven: { score: 65, signals_count: 3 }, bolluk: { score: 70, signals_count: 3 },
    };
    window.sdGecmis = () => [
      satir('bireysel', 'oz_sevgi', true), satir('bireysel', 'oz_sevgi', true),
      satir('bireysel', 'oz_sevgi', true),
    ];
    // Defter ağırlığı (3.0) tutulan ekseni −0.75 ile bastırır → temelin
    // ikinci adayı (oz_saygi) öne geçer.
    const n = ihNeed('bireysel');
    expect(n.eksen).not.toBe('oz_sevgi');
  });

  it('yakın günlerde çalışılan eksen çeşitlilik için cezalanır', () => {
    S._foundationsProfile = {
      oz_deger: { score: 30, signals_count: 3 }, oz_saygi: { score: 32, signals_count: 3 },
      oz_sevgi: { score: 80, signals_count: 3 }, oz_guven: { score: 85, signals_count: 3 }, bolluk: { score: 90, signals_count: 3 },
    };
    const ilk = ihNeed('bireysel').eksen;
    expect(ilk).toBe('oz_deger');

    // Aynı eksen son sözlerde geçiyorsa bir sonraki gün geri çekilir.
    window.sdSonSozler = () => [
      { key: 'gl.soz.bireysel.oz_deger.0', domain: 'bireysel', text: 'x', day: '2026-07-30' },
      { key: 'gl.soz.bireysel.oz_deger.1', domain: 'bireysel', text: 'y', day: '2026-07-29' },
      { key: 'gl.soz.bireysel.oz_deger.0', domain: 'bireysel', text: 'z', day: '2026-07-28' },
    ];
    expect(ihNeed('bireysel').eksen).toBe('oz_saygi');
  });

  it('anahtarsız (eski) kayıtlar sessizce atlanır', () => {
    window.sdGecmis = () => [
      { day: '2026-07-30', domain: 'bireysel', key: null, text: 'eski kayıt', source: 'banka', kept: false },
    ];
    S._foundationsProfile = { oz_guven: { score: 15, signals_count: 3 }, oz_sevgi: { score: 80, signals_count: 3 } };
    expect(ihNeed('bireysel').eksen).toBe('oz_guven');
  });
});

describe('Kişi sinyalleri — derinlik temele çevrilir', () => {
  it('düşük "layık" ölçümü öz-sevgi eksenini çağırır', () => {
    window.sdGunSayisi = () => 12;    // tanidik → kisi ağırlığı 2.0
    kkComputeSignals.mockReturnValue({ ...NOTR_SINYAL, layik: 20 });
    const n = ihNeed('iliski');
    expect(n.eksen).toBe('oz_sevgi');
    expect(n.kaynak).toBe('kisi');
  });

  it('şükür pratiği hiç yoksa bolluk ekseni sessizce çağrılır', () => {
    kkComputeSignals.mockReturnValue({ ...NOTR_SINYAL, gratitude: 0 });
    const n = ihNeed('bireysel');
    expect(n.eksen).toBe('bolluk');
  });
});

describe('ihKisi — sözün içine girecek gerçek ad', () => {
  it('ilişki alanında en çok anılan kişi kazanır', () => {
    S._lifeMemory.people = {
      ayse: { name: 'Ayşe', role: 'partner', mention_count: 9 },
      mehmet: { name: 'Mehmet', role: 'friend', mention_count: 3 },
    };
    expect(ihKisi('iliski')).toBe('Ayşe');
  });

  it('iş alanı yalnız patron rolünü konuşur', () => {
    S._lifeMemory.people = {
      ayse: { name: 'Ayşe', role: 'partner', mention_count: 20 },
      kemal: { name: 'Kemal', role: 'boss', mention_count: 2 },
    };
    expect(ihKisi('is')).toBe('Kemal');
  });

  it('bireysel alan adla konuşmaz', () => {
    S._lifeMemory.people = { ayse: { name: 'Ayşe', role: 'partner', mention_count: 9 } };
    expect(ihKisi('bireysel')).toBeNull();
  });

  it('yazılamayacak kadar uzun ad elenir (söz harfiyen yazılır)', () => {
    S._lifeMemory.people = {
      uzun: { name: 'Abdurrahmanoğlu Muhammed', role: 'friend', mention_count: 50 },
      kisa: { name: 'Ali', role: 'friend', mention_count: 1 },
    };
    expect(ihKisi('iliski')).toBe('Ali');
  });

  it('kişi yoksa null döner', () => {
    S._lifeMemory.people = {};
    expect(ihKisi('iliski')).toBeNull();
  });

  it('bozuk kayıtlar sessizce atlanır', () => {
    S._lifeMemory.people = { a: null, b: { name: '' }, c: { role: 'friend' }, d: { name: 'Zeynep', role: 'friend', mention_count: 1 } };
    expect(ihKisi('iliski')).toBe('Zeynep');
  });
});

describe('ihOlay — sözün içine girecek yaklaşan olay', () => {
  it('en yeni açık döngüyü verir', () => {
    S._lifeMemory.openLoops = [
      { id: 1, event: 'sınav', status: 'open' },
      { id: 2, event: 'sunum', status: 'open' },
    ];
    expect(ihOlay('bireysel')).toBe('sunum');
  });

  it('kapanmış döngü alınmaz', () => {
    S._lifeMemory.openLoops = [
      { id: 1, event: 'sınav', status: 'open' },
      { id: 2, event: 'sunum', status: 'closed' },
    ];
    expect(ihOlay('bireysel')).toBe('sınav');
  });

  it('iş alanı yalnız iş konulu döngüyü alır', () => {
    S._lifeMemory.openLoops = [
      { id: 1, event: 'toplantı', status: 'open', topic: 'work' },
      { id: 2, event: 'doktor randevusu', status: 'open', topic: 'health' },
    ];
    expect(ihOlay('is')).toBe('toplantı');
    expect(ihOlay('bireysel')).toBe('doktor randevusu');
  });

  it('ilişki alanı olayla değil adla konuşur', () => {
    S._lifeMemory.openLoops = [{ id: 1, event: 'buluşma', status: 'open' }];
    expect(ihOlay('iliski')).toBeNull();
  });

  it('cümleyi taşıracak kadar uzun olay elenir, kısa olana düşülür', () => {
    S._lifeMemory.openLoops = [
      { id: 1, event: 'sınav', status: 'open' },
      { id: 2, text: 'önümüzdeki hafta yapılacak olan çok kapsamlı yıllık değerlendirme toplantısı', status: 'open' },
    ];
    expect(ihOlay('bireysel')).toBe('sınav');
  });

  it('açık döngü yoksa null', () => {
    S._lifeMemory.openLoops = [];
    expect(ihOlay('bireysel')).toBeNull();
  });
});

describe('ihNeedTop / ihNeedAll', () => {
  it('ihNeedAll üç alanı da döndürür', () => {
    const hepsi = ihNeedAll();
    expect(Object.keys(hepsi).sort()).toEqual(['bireysel', 'iliski', 'is']);
    Object.values(hepsi).forEach(n => {
      expect(IH_EKSENLER.concat('default')).toContain(n.eksen);
      expect(n.guc).toBeGreaterThanOrEqual(0);
      expect(n.guc).toBeLessThanOrEqual(1);
    });
  });

  it('bir alandaki zorlanma o alanı öne çıkarır (alan ayrımı)', () => {
    window.sdGunSayisi = () => 12;
    window.sdGecmis = () => [
      satir('is', 'oz_guven', false), satir('is', 'oz_guven', false),
      satir('is', 'oz_guven', false),
    ];
    const top = ihNeedTop();
    expect(top.alan).toBe('is');
    expect(top.eksen).toBe('oz_guven');
    // Aynı eksen diğer alanlara yalnız yarım oyla taşınır → güçleri eşit olmaz
    expect(ihNeed('is').guc).toBeGreaterThan(ihNeed('bireysel').guc);
  });

  it('ihNeedTop en güçlü ihtiyacı seçer', () => {
    S._onboardingRecommendation = {
      weakestKey: 'oz_guven',
      domainRecs: { is: { foundationKey: 'oz_guven' } },   // is alanında iki oy birleşir
    };
    const top = ihNeedTop();
    expect(top.alan).toBe('is');
    expect(top.eksen).toBe('oz_guven');
  });
});
