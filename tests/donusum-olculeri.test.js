/**
 * DÖNÜŞÜM ÖLÇÜLERİ — Dönüşüm Aynası'nın (13t) okuduğu metrik omurgası.
 *
 * Kapsam: M1 msIzSeri (mesafe eğrisi) · M2 sdOranKiyas/sdAylikSeri (söz
 * tutma kıyası) · M3 omCozulmusArsiv (sönen örüntü arşivi) · M5
 * kkKazanimAylik (kazanımın zaman ekseni) · M8 p1TemporalYapisal (profil
 * evrimi).
 *
 * İki sözleşme her getter'da sınanır:
 *   1. KANIT KAPISI — ölçüsü olmayan değer üretilmez (§6.10). Boş defterde
 *      `[]`/`null` döner; asla 0, %0 ya da NaN.
 *   2. UI GÜVENLİĞİ — dönen şey YAPILANDIRILMIŞ nesnedir, prompt metni
 *      değil. LLM'e yazılmış satırlar ("yeri gelirse kutla", "teşhis: …")
 *      bir UI'ya basılamaz; 13t'de tam bu sızıntı yaşandı.
 *
 * SafeStorage mock'lanmaz — gerçek round-trip. GOTCHA: bellek-içi _kvCache
 * localStorage.clear() ile temizlenmez, izolasyon SafeStorage.remove() ile.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S } from '../js/state.js';
import { SafeStorage, localISODate } from '../js/parts/00a-infrastructure.js';
import { msIzSeri, msHesapla } from '../js/parts/13x-mesafe-motoru.js';
import { sdSenkronla, sdOranKiyas, sdAylikSeri } from '../js/parts/13u-soz-defteri.js';
import { kkKazanimAylik } from '../js/parts/10q-w2-kisi-karti.js';
import { p1TemporalYapisal } from '../js/parts/09a-personalization-engine.js';

const gunKey = (once) => {
  const d = new Date(Date.now() - once * 86400000);
  return localISODate(d);
};

beforeEach(() => {
  S.currentUser = { id: 'olcu-test-' + Math.random().toString(36).slice(2, 8) };
  S._sozDefteri = { kayitlar: [], aylik: {}, updated: null };
  S._kisiKarti = { collection: {}, history: [], esik: {}, hedefler: {} };
});

describe('M1 · msIzSeri — mesafenin zaman eğrisi', () => {
  it('kanıt yokken BOŞ döner (çizilecek eğri yoksa davet gösterilir)', () => {
    expect(msIzSeri()).toEqual([]);
  });

  it('günlük ve haftalık katmanı TEK dizide, eskiden yeniye verir', () => {
    const key = `etw_mesafe_iz_v1_${S.currentUser.id}`;
    SafeStorage.remove(key);
    const ham = {};
    for (let i = 50; i >= 1; i--) ham[gunKey(i)] = 40 + (50 - i);
    SafeStorage.set(key, ham);
    msHesapla([{ cardId: 'a', hazirlik: 95, niyet: 1 }], {});   // taşımayı tetikle
    const seri = msIzSeri();
    expect(seri.length).toBeGreaterThan(30);
    // Sıra kronolojik
    const gunler = seri.map(x => x.gun);
    expect([...gunler].sort()).toEqual(gunler);
    // İki çözünürlük de var ve her nokta aynı şekli taşır
    expect(seri.some(x => x.tur === 'hafta')).toBe(true);
    expect(seri.some(x => x.tur === 'gun')).toBe(true);
    for (const n of seri) {
      expect(typeof n.gun).toBe('string');
      expect(typeof n.pct).toBe('number');
    }
  });
});

describe('M2 · sdOranKiyas — söz tutmanın ilk ay ↔ son ay kıyası', () => {
  const ritus = (day, pledges) => ({ date: day, pledges, skipped: false, finished: true });

  it('tek ay varken null döner — kıyas iki uç ister', () => {
    sdSenkronla(ritus(gunKey(0), [{ domain: 'bireysel', text: 'A', kept: true }]));
    expect(sdOranKiyas()).toBeNull();
  });

  it('hüküm sayısı eşiğin altındaysa o ay kıyasa girmez (tek sözden oran çıkmaz)', () => {
    S._sozDefteri.aylik = {
      '2026-01': { v: 1, t: 1, a: 0 },     // tek hüküm — gürültü
      '2026-06': { v: 9, t: 6, a: 3 },
    };
    expect(sdOranKiyas()).toBeNull();
  });

  it('iki kanıtlı ay varsa ilk ↔ son oranını verir', () => {
    S._sozDefteri.aylik = {
      '2026-01': { v: 8, t: 2, a: 6 },
      '2026-03': { v: 5, t: 3, a: 2 },
      '2026-06': { v: 8, t: 6, a: 2 },
    };
    const k = sdOranKiyas();
    expect(k.ilk.ay).toBe('2026-01');
    expect(k.ilk.oran).toBeCloseTo(0.25);
    expect(k.son.ay).toBe('2026-06');
    expect(k.son.oran).toBeCloseTo(0.75);
  });

  it('sdAylikSeri kanıtsız ayda oran YERİNE null taşır (sayı gizlenir, satır kalır)', () => {
    S._sozDefteri.aylik = { '2026-01': { v: 2, t: 1, a: 0 }, '2026-02': { v: 6, t: 4, a: 2 } };
    const seri = sdAylikSeri();
    expect(seri[0].oran).toBeNull();
    expect(seri[1].oran).toBeCloseTo(4 / 6);
  });
});

describe('M3 · omCozulmusArsiv — "artık sende olmayanlar"', () => {
  /* 09d'nin durumu modül-yereldir (_om) ve omInit() `_omInited` bayrağıyla
     BİR KEZ hidre olur — testler arası izolasyon ancak taze modülle sağlanır
     (09d testinin freshModule kalıbı). */
  const tohumla = async (cozulmus) => {
    vi.resetModules();
    const { S: S2 } = await import('../js/state.js');
    const infra = await import('../js/parts/00a-infrastructure.js');
    const om = await import('../js/parts/09d-oruntu-motoru.js');
    S2.currentUser = { id: 'om-arsiv-test' };
    infra.SafeStorage.set('etw_oruntu_motoru_v1_om-arsiv-test', {
      v: 1,
      ledger: { days: [], weeks: [] },
      distill: { lastWeek: null, attempts: { day: null, count: 0 }, current: null, history: [], cozulmus },
    });
    om.omInit();
    return om;
  };

  it('kanıt yokken boş döner', async () => {
    const om = await tohumla([]);
    expect(om.omCozulmusArsiv()).toEqual([]);
  });

  it('YAPILANDIRILMIŞ nesne döner — prompt metni DEĞİL', async () => {
    const om = await tohumla([
      { kok: 'erteleme', baslik: 'Erteleme', hafta_sayisi: 3, sondu_wk: '2026-W20' },
      { kok: 'kacis', baslik: 'Kaçış', hafta_sayisi: 2, sondu_wk: '2026-W33' },
    ]);
    const arsiv = om.omCozulmusArsiv();
    expect(arsiv.length).toBe(2);
    // En yeni sönen önce
    expect(arsiv[0].kok).toBe('kacis');
    // UI güvenliği: prompt talimatı sızmaz
    expect(JSON.stringify(arsiv)).not.toMatch(/yeri gelirse kutla|teşhis:|yol:/);
    expect(Object.keys(arsiv[0]).sort()).toEqual(['baslik', 'hafta_sayisi', 'kok', 'sondu_wk']);
  });

  it('SÖNDÜĞÜ HAFTAYA bakmaksızın tümünü verir — kazanılan savaş bir hafta sonra silinmez', async () => {
    const om = await tohumla([{ kok: 'eski', baslik: 'Çok Eski', hafta_sayisi: 4, sondu_wk: '2025-W02' }]);
    expect(om.omCozulmusArsiv().length).toBe(1);
  });
});

describe('M5 · kkKazanimAylik — kazanımın zaman ekseni', () => {
  it('kanıt yokken boş döner', () => {
    expect(kkKazanimAylik()).toEqual([]);
  });

  it('ay ay sayar, eskiden yeniye sıralar, kart id\'lerini taşır', () => {
    S._kisiKarti.history = [
      { cardId: 'a', at: '2026-03-04T10:00:00Z', rarity: 'yaygin' },
      { cardId: 'b', at: '2026-05-11T10:00:00Z', rarity: 'nadir' },
      { cardId: 'c', at: '2026-05-27T10:00:00Z', rarity: 'yaygin' },
    ];
    const aylik = kkKazanimAylik();
    expect(aylik.map(x => x.ay)).toEqual(['2026-03', '2026-05']);
    expect(aylik[1].n).toBe(2);
    expect(aylik[1].kartlar).toEqual(['b', 'c']);
  });

  it('tarihsiz/bozuk kayıt sayıma girmez', () => {
    S._kisiKarti.history = [{ cardId: 'x' }, { at: '2026-05-01T00:00:00Z' }];
    expect(kkKazanimAylik()).toEqual([]);
  });

  it('ay anahtarı YEREL okunur — UTC damgası ayı kaydırmaz', () => {
    // Damgalar toISOString() ile yazılır (UTC). TR'de 31 Temmuz 21:30Z,
    // kullanıcının takviminde 1 Ağustos 00:30'dur: kart AĞUSTOS'ta kazanıldı.
    // Eski hâl damgayı düz kesiyordu (`.slice(0,7)`) ve onu Temmuz'a yazardı.
    // Beklenen değer testin kendi diliminden türetilir — süit hangi TZ'de
    // koşarsa koşsun sözleşme aynı kalır: ay, kullanıcının yaşadığı aydır.
    const iso = '2026-07-31T21:30:00.000Z';
    const d = new Date(iso);
    const yerelAy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    S._kisiKarti.history = [{ cardId: 'a', at: iso, rarity: 'yaygin' }];
    expect(kkKazanimAylik()[0].ay).toBe(yerelAy);
  });
});

describe('M8 · p1TemporalYapisal — profil evrimi (UI-güvenli)', () => {
  it('iki snapshot yoksa null (ölçülmemiş evrim yoktur)', () => {
    S._personalityMap = { temporal_snapshots: [], communication: { avg_msg_length: 0, style: 'unknown' }, values: [] };
    expect(p1TemporalYapisal()).toBeNull();
  });

  it('ilk snapshot ↔ bugün: üslup, uzunluk ve değerlerin farkını ham verir', () => {
    S._personalityMap = {
      temporal_snapshots: [
        { date: '2026-01-01T00:00:00Z', style: 'kisa', avg_msg_length: 40, top_values: ['guven', 'duzen'] },
        { date: '2026-06-01T00:00:00Z', style: 'detayli', avg_msg_length: 90, top_values: ['guven'] },
      ],
      communication: { avg_msg_length: 96, style: 'detayli' },
      values: [{ value: 'guven', strength: 9 }, { value: 'cesaret', strength: 7 }],
    };
    const y = p1TemporalYapisal();
    expect(y.uslup).toEqual({ once: 'kisa', simdi: 'detayli' });
    expect(y.mesajUzunlugu).toEqual({ once: 40, simdi: 96 });
    expect(y.degerler.yeni).toEqual(['cesaret']);
    expect(y.degerler.solan).toEqual(['duzen']);
    // Prompt metni değil, ham nesne
    expect(typeof y).toBe('object');
    expect(JSON.stringify(y)).not.toMatch(/prompt\./);
  });
});

describe('FAZ 6 · kılcallar — kıyas kanıtsızsa konuşmaz', () => {
  it('wrOncekiAyKiyas: geçen ayda hiç aktivite yoksa null (ilk ay kıyas etmez)', async () => {
    const wr = await import('../js/parts/13j-wrapped.js');
    S._activityLedger = undefined;
    S._seriMuhru = { cards: {} };
    S._kisiKarti = { collection: {}, history: [] };
    expect(wr.wrOncekiAyKiyas('2026-08')).toBeNull();
  });

  it('wrOncekiAyKiyas: ay anahtarını yıl sınırında doğru geriye alır', async () => {
    const wr = await import('../js/parts/13j-wrapped.js');
    // Ocak'ın öncesi bir önceki yılın Aralık'ıdır — kıyas kanıtsız olduğu
    // için null döner, ama hesap patlamamalı (UTC kurulumu).
    expect(() => wr.wrOncekiAyKiyas('2026-01')).not.toThrow();
  });
});

describe('FAZ 6 · Ayna paneli arşivi — kazanılan savaş bir hafta sonra silinmez', () => {
  /* Panel render'ı 09d'nin modül-yerel durumundan besleniyor; taze modül
     kalıbı (freshModule) ile hidre edilir. */
  const panelKur = async (cozulmus, curWk) => {
    vi.resetModules();
    const { S: S2 } = await import('../js/state.js');
    const infra = await import('../js/parts/00a-infrastructure.js');
    const om = await import('../js/parts/09d-oruntu-motoru.js');
    S2.currentUser = { id: 'om-panel-test' };
    S2.isPremium = true;
    infra.SafeStorage.set('etw_oruntu_motoru_v1_om-panel-test', {
      v: 1,
      ledger: { days: [], weeks: [] },
      distill: {
        lastWeek: curWk, attempts: { day: null, count: 0 },
        current: { wk: curWk, ozet: 'özet', patterns: [] },
        history: [], cozulmus,
      },
    });
    om.omInit();
    return om;
  };

  it('ESKİ haftada sönen örüntü de listelenir (eski filtre onu siliyordu)', async () => {
    const om = await panelKur([
      { kok: 'eski', baslik: 'Sabahı akşama bırakmak', hafta_sayisi: 5, sondu_wk: '2026-W12' },
    ], '2026-W34');
    const arsiv = om.omCozulmusArsiv();
    expect(arsiv.length).toBe(1);
    expect(arsiv[0].baslik).toBe('Sabahı akşama bırakmak');
  });

  it('taze sönen ile arşiv birlikte döner, en yeni önce', async () => {
    const om = await panelKur([
      { kok: 'eski', baslik: 'Eski', hafta_sayisi: 5, sondu_wk: '2026-W12' },
      { kok: 'taze', baslik: 'Taze', hafta_sayisi: 2, sondu_wk: '2026-W34' },
    ], '2026-W34');
    expect(om.omCozulmusArsiv().map(c => c.baslik)).toEqual(['Taze', 'Eski']);
  });
});

describe('sözleşme — window.* yüzeyi (yeni yüzey kırılmasın)', () => {
  it('ölçü getter\'ları window\'da bağlı', async () => {
    await import('../js/parts/13x-mesafe-motoru.js');
    await import('../js/parts/13u-soz-defteri.js');
    await import('../js/parts/09d-oruntu-motoru.js');   // omCozulmusArsiv
    await import('../js/parts/10q-w2-kisi-karti.js');
    await import('../js/parts/09a-personalization-engine.js');
    for (const k of ['msIzSeri', 'sdOranKiyas', 'sdAylikSeri', 'omCozulmusArsiv',
                     'kkKazanimAylik', 'p1TemporalYapisal']) {
      expect(typeof window[k]).toBe('function');
    }
  });
});
