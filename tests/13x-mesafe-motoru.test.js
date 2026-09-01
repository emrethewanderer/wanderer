// Mesafe Motoru (13x) — "aradaki yol" ölçümünün saf-fonksiyon testleri
// ════════════════════════════════════════════════════════════════════════════
// Bu dosyanın koruduğu TEK sözleşme: kullanıcının gördüğü sayı, kartın
// gelişiyle aynı şeyi söyler. `hazirlik === 100` ⟺ `earned === true`.
// Kırılırsa kullanıcı %100 görüp kart alamaz (ya da tersi) — güvenin
// kaybedildiği tam nokta orasıdır.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { kkMatchCard, kkEnZayifHalka } from '../js/parts/10q-w2-kisi-karti.js';
import { msNiyet, msNiyetBaglam, msNiyetCtx, msHesapla, msAnaMesafe, msIz, msIzFark } from '../js/parts/13x-mesafe-motoru.js';
import { getFullDeck, getCardById, deckReady } from '../js/parts/12b-kart-destesi.js';
import { SafeStorage, localISODate } from '../js/parts/00a-infrastructure.js';
import { S } from '../js/state.js';

beforeAll(async () => { await deckReady(); }, 30000);

/* Niyet testleri gerçek OİK modülünü değil, onun window yüzeyini kullanır
   (13x tüketicileri de öyle okur: window.oikGetCard / window.oikCardRefs). */
afterEach(() => {
  delete window.oikGetCard;
  delete window.oikCardRefs;
  if (S._kisiKarti) S._kisiKarti.hedefler = {};
});

/* Deterministik sözde-rastgele — testin kararlı kalması için seed'li (Mulberry32) */
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Reçetelerin okuduğu tüm sinyal anahtarları + kanıt bileşenleri */
const SIG_KEYS = [
  'oz_sevgi', 'oz_saygi', 'oz_deger', 'oz_guven', 'bolluk',
  'standart', 'hak_etmek', 'normal', 'layik',
  'trust', 'vulnerability', 'empoweringRatio', 'newChoiceRatio', 'gratitude',
  'streak', 'sessions', 'gecisStreak', 'gecisReadings', 'gecisCards',
  'selfDialogue', 'reviews', 'dinlenme', 'hayalScenes', 'hayalReflection',
  'meclisNamed', 'meclisIntegrated', 'elmas', 'davranisKanit', 'beliefCount',
];

/** Sıfırdan tavana kadar her yerde olabilen rastgele bir kullanıcı profili. */
function randomSig(rand) {
  const sig = {};
  // Profil "olgunluğu": bazı turlar taze hesap, bazıları olgun kullanıcı olsun —
  // eşiğin iki yakasında da örnek üretilsin diye.
  const olgunluk = rand();
  for (const k of SIG_KEYS) sig[k] = Math.round(rand() * 100 * olgunluk);
  return sig;
}

describe('hazirlik — üç kapının tek yüzdesi (K1)', () => {
  it('SÖZLEŞME: hazirlik === 100 ⟺ earned === true (60 profil × tüm deste)', () => {
    const rand = rng(20260801);
    const deck = getFullDeck();
    expect(deck.length).toBe(12);

    let earnedGoruldu = 0, yuzGoruldu = 0;
    for (let i = 0; i < 60; i++) {
      const sig = randomSig(rand);
      for (const card of deck) {
        const m = kkMatchCard(card, sig);
        // Çift yönlü sözleşme — tek yön geçse bile diğeri kırık olabilir
        expect(m.hazirlik === 100).toBe(m.earned === true);
        if (m.earned) earnedGoruldu++;
        if (m.hazirlik === 100) yuzGoruldu++;
      }
    }
    // Tarama gerçekten iki yakayı da gördü mü — hepsi false olsaydı test
    // hiçbir şey kanıtlamazdı (boş-doğru tuzağı).
    expect(earnedGoruldu).toBeGreaterThan(0);
    expect(yuzGoruldu).toBe(earnedGoruldu);
  });

  it('hazirlik daima 0-100 aralığında bir tam sayıdır', () => {
    const rand = rng(7);
    for (let i = 0; i < 20; i++) {
      const sig = randomSig(rand);
      for (const card of getFullDeck()) {
        const h = kkMatchCard(card, sig).hazirlik;
        expect(Number.isInteger(h)).toBe(true);
        expect(h).toBeGreaterThanOrEqual(0);
        expect(h).toBeLessThanOrEqual(100);
      }
    }
  });

  it('boş profilde hiçbir kart %100 göstermez', () => {
    const bos = {};
    for (const card of getFullDeck()) {
      const m = kkMatchCard(card, bos);
      expect(m.hazirlik).toBeLessThan(100);
      expect(m.earned).toBe(false);
    }
  });

  it('reçetesiz kartta hazirlik 0 döner, patlamaz', () => {
    const m = kkMatchCard({ id: 'yok', name: 'Reçetesiz' }, {});
    expect(m.hazirlik).toBe(0);
    expect(m.earned).toBe(false);
  });

  it('minEvidence 0 olan kartta kanıt kapısı hazırlığı kısmaz', () => {
    // Kanıt bileşenleri sıfır, diğer her şey tavan: kanıt kapısı 1 sayılmalı
    const sig = {};
    for (const k of SIG_KEYS) sig[k] = 100;
    for (const k of ['sessions', 'gecisReadings', 'reviews', 'selfDialogue', 'dinlenme', 'meclisNamed', 'hayalScenes']) sig[k] = 0;
    const kart = { id: 't', recipe: { threshold: 70, minEvidence: 0, signals: [{ key: 'oz_sevgi', value: 60, weight: 1, dim: 'hisler' }] } };
    const m = kkMatchCard(kart, sig);
    expect(m._g2).toBe(1);
    expect(m.evidenceOk).toBe(true);
  });

  it('tek boyut dipteyken hazirlik o boyutun elinde kalır (en zayıf halka)', () => {
    // İki sinyalli kart: biri tavan, diğeri dip → hazırlık dipteki tarafı yansıtır
    const kart = {
      id: 't2',
      recipe: {
        threshold: 70, minEvidence: 0,
        signals: [
          { key: 'oz_sevgi', value: 80, weight: 1, dim: 'hisler' },
          { key: 'layik', value: 80, weight: 1, dim: 'inanclar' },
        ],
      },
    };
    const m = kkMatchCard(kart, { oz_sevgi: 80, layik: 8 });
    expect(m.earned).toBe(false);
    // Ortalama ~%54 olurdu; en zayıf halka kuralı bunun altında tutmalı
    expect(m.hazirlik).toBeLessThan(m.score);
  });
});

describe('kkEnZayifHalka — "en ince yerin" teşhisi', () => {
  it('hazır kartta null döner', () => {
    const kart = { id: 't3', recipe: { threshold: 10, minEvidence: 0, signals: [{ key: 'oz_sevgi', value: 5, weight: 1, dim: 'hisler' }] } };
    const sig = {};
    for (const k of SIG_KEYS) sig[k] = 100;
    const m = kkMatchCard(kart, sig);
    expect(m.earned).toBe(true);
    expect(kkEnZayifHalka(m)).toBeNull();
  });

  it('en düşük oranlı kapıyı adlandırır', () => {
    const kart = {
      id: 't4',
      recipe: {
        threshold: 70, minEvidence: 0,
        signals: [
          { key: 'oz_sevgi', value: 80, weight: 1, dim: 'hisler' },
          { key: 'layik', value: 80, weight: 1, dim: 'inanclar' },
        ],
      },
    };
    // Reçetenin SUSTUĞU boyutlar (düşünceler/davranışlar) canlı profilden
    // okunur (10q kkIknaHesapla) — onları tavana çekmezsek en zayıf halka
    // reçeteyle ilgisiz bir boyut çıkar. Burada sınanan şey inanç kapısı.
    const sig = {};
    for (const k of SIG_KEYS) sig[k] = 100;
    sig.oz_sevgi = 80;
    sig.layik = 4;             // tek dip: inançlar
    const z = kkEnZayifHalka(kkMatchCard(kart, sig));
    expect(z).toBeTruthy();
    expect(z.kapi).toBe('inanclar');   // dipteki boyut
    expect(z.oran).toBeLessThan(0.5);
  });

  it('_g1/_g2 hazırlığın hesaplandığı oranlardır — ikinci bir hesap değil', () => {
    // Öz-denetimde yakalandı: oranlar bir kez kkHazirlik içinde, bir kez de
    // dönüş nesnesinde hesaplanıyordu. İki kaynak birbirinden kayarsa
    // gösterilen yüzde ile "en ince yerin" teşhisi farklı kapıyı gösterir.
    const rand = rng(99);
    for (let i = 0; i < 15; i++) {
      const sig = randomSig(rand);
      for (const card of getFullDeck().slice(0, 25)) {
        const m = kkMatchCard(card, sig);
        expect(m.hazirlik).toBeLessThanOrEqual(Math.floor(100 * Math.min(m._g1, m._g2)));
      }
    }
  });

  it('kanıt eksikse kanıt kapısını işaret eder', () => {
    const sig = {};
    for (const k of SIG_KEYS) sig[k] = 100;
    for (const k of ['sessions', 'gecisReadings', 'reviews', 'selfDialogue', 'dinlenme', 'meclisNamed', 'hayalScenes']) sig[k] = 0;
    const kart = { id: 't5', recipe: { threshold: 10, minEvidence: 200, signals: [{ key: 'oz_sevgi', value: 5, weight: 1, dim: 'hisler' }] } };
    const m = kkMatchCard(kart, sig);
    expect(m.evidenceOk).toBe(false);
    expect(kkEnZayifHalka(m).kapi).toBe('kanit');
  });
});

describe('msNiyet — niyet sırayı kurar, kapıyı satın almaz (K2)', () => {
  it('niyet kaynağı yokken tüm kartlar 1.0 ile eşitlenir', () => {
    const ctx = msNiyetBaglam();
    expect(ctx.hedefler.size).toBe(0);
    expect(ctx.agirBoyut).toBeNull();
    for (const card of getFullDeck().slice(0, 30)) {
      expect(msNiyet(card, ctx)).toBe(1);
    }
  });

  it('hedef mührü vurulmuş kart en büyük payı alır', () => {
    const card = getFullDeck()[0];
    S._kisiKarti.hedefler = { [card.id]: { at: new Date().toISOString(), absorbed: 2 } };
    const ctx = msNiyetBaglam();
    expect(msNiyet(card, ctx)).toBe(3);                      // 1.0 taban + 2.0 hedef
    expect(msNiyet(getFullDeck()[1], ctx)).toBeLessThan(3);  // komşu kart etkilenmez
  });

  it('OİK\'i besleyen kartların erdemi örtüşen kartlara pay verir', () => {
    const kaynak = getFullDeck().find(c => c.virtue);
    window.oikCardRefs = () => [kaynak.id];
    const ctx = msNiyetBaglam();
    expect(ctx.erdemler.has(kaynak.virtue)).toBe(true);
    // Aynı erdemi taşıyan başka bir kart da payı alır (erdem örtüşmesi, kimlik değil)
    const kardes = getFullDeck().find(c => c.virtue === kaynak.virtue && c.id !== kaynak.id);
    if (kardes) expect(msNiyet(kardes, ctx)).toBeGreaterThan(1);
  });

  it('OİK\'in en yoğun kategorisi o boyutta konuşan kartlara pay verir', () => {
    // Niyetin ağırlık merkezi "davranışlar": kullanıcı en çok oraya yazmış
    window.oikGetCard = () => ({
      baslik: 'Niyet', dusunceler: [{ text: 'a' }], inanclar: [],
      duygular: [], davranislar: [{ text: 'b' }, { text: 'c' }, { text: 'd' }],
    });
    const ctx = msNiyetBaglam();
    expect(ctx.agirBoyut).toBe('davranislar');
    const davranisKarti = getFullDeck().find(c => {
      const s = c.recipe?.signals || [];
      const w = {};
      for (const x of s) if (x.dim) w[x.dim] = (w[x.dim] || 0) + (x.weight || 1);
      return Object.entries(w).sort((a, b) => b[1] - a[1])[0]?.[0] === 'davranislar';
    });
    expect(davranisKarti).toBeTruthy();
    expect(msNiyet(davranisKarti, ctx)).toBeGreaterThan(1);
  });

  it('niyet tavanı 4.0\'ı aşmaz', () => {
    const card = getFullDeck().find(c => c.virtue && c.recipe?.signals?.length);
    S._kisiKarti.hedefler = { [card.id]: { at: new Date().toISOString() } };
    window.oikCardRefs = () => [card.id];
    const baskin = (() => {
      const w = {};
      for (const x of (card.recipe.signals || [])) if (x.dim) w[x.dim] = (w[x.dim] || 0) + (x.weight || 1);
      return Object.entries(w).sort((a, b) => b[1] - a[1])[0]?.[0];
    })();
    window.oikGetCard = () => ({ baslik: 'Niyet', dusunceler: [], inanclar: [], duygular: [], davranislar: [], [baskin === 'hisler' ? 'duygular' : baskin]: [{ text: 'x' }] });
    const n = msNiyet(card, msNiyetBaglam());
    expect(n).toBeGreaterThan(3);
    expect(n).toBeLessThanOrEqual(4);
  });

  it('SÖZLEŞME: niyet earned kapısını DEĞİŞTİRMEZ', () => {
    const sig = {};
    for (const k of SIG_KEYS) sig[k] = 55;
    const deck = getFullDeck();
    const once = deck.map(c => kkMatchCard(c, { ...sig }).earned);
    // Tüm desteyi hedefle — niyet tavana çıksın
    S._kisiKarti.hedefler = {};
    for (const c of deck) S._kisiKarti.hedefler[c.id] = { at: new Date().toISOString() };
    window.oikCardRefs = () => deck.map(c => c.id);
    const sonra = deck.map(c => kkMatchCard(c, { ...sig }).earned);
    expect(sonra).toEqual(once);
  });

  it('msNiyetCtx bağlamı tur başına bir kez çözer (memoize)', () => {
    const sig = {};
    const a = msNiyetCtx(sig);
    const b = msNiyetCtx(sig);
    expect(a).toBe(b);              // aynı nesne — ikinci hesap yapılmadı
    expect(sig._niyet).toBe(a);
    expect(msNiyetCtx({})).not.toBe(a);  // yeni tur, yeni bağlam
  });

  it('donmuş sig gelirse patlamaz', () => {
    const donuk = Object.freeze({});
    expect(() => msNiyetCtx(donuk)).not.toThrow();
    expect(msNiyetCtx(donuk).hedefler instanceof Set).toBe(true);
  });
});

describe('msHesapla / msAnaMesafe — iki kutup arasındaki tek sayı (K3)', () => {
  afterEach(() => {
    S._mesafe = { ana: null, hesap: null, updatedAt: null };
    try { SafeStorage.remove(`etw_mesafe_iz_v1_${S.currentUser?.id || 'anon'}`); } catch (_) {}
    S.currentUser = null;
  });

  it('hedef mührü varsa ortalama YALNIZ hedeflenenlerden doğar', () => {
    S._kisiKarti.hedefler = { a: { at: 'x' } };
    const ana = msHesapla([
      { cardId: 'a', hazirlik: 40, niyet: 3 },     // hedefli
      { cardId: 'b', hazirlik: 90, niyet: 1 },     // hedefsiz — girmemeli
    ], {});
    expect(ana).toBe(40);
    expect(S._mesafe.hesap.kaynak).toBe('hedef');
    expect(S._mesafe.hesap.n).toBe(1);
  });

  it('hedef yoksa en yakın 3 karttan doğar', () => {
    const ana = msHesapla([
      { cardId: 'a', hazirlik: 90, niyet: 1 },
      { cardId: 'b', hazirlik: 80, niyet: 1 },
      { cardId: 'c', hazirlik: 70, niyet: 1 },
      { cardId: 'd', hazirlik: 10, niyet: 1 },   // dördüncü — ortalamaya girmez
    ], {});
    expect(ana).toBe(80);                         // (90+80+70)/3
    expect(S._mesafe.hesap.kaynak).toBe('yakin');
    expect(S._mesafe.hesap.n).toBe(3);
  });

  it('ortalama niyet-ağırlıklıdır — çok istediğin kişi daha çok söz sahibi', () => {
    S._kisiKarti.hedefler = { a: { at: 'x' }, b: { at: 'x' } };
    const ana = msHesapla([
      { cardId: 'a', hazirlik: 100, niyet: 3 },
      { cardId: 'b', hazirlik: 20, niyet: 1 },
    ], {});
    expect(ana).toBe(80);                         // (100*3 + 20*1) / 4
  });

  it('ölçecek kart yoksa null döner — sayı gizlenir', () => {
    expect(msHesapla([], {})).toBeNull();
    expect(S._mesafe.ana).toBeNull();
    expect(S._mesafe.hesap).toBeNull();
    expect(msAnaMesafe()).toBeNull();
  });

  it('msAnaMesafe ucuz getter — S._mesafe okur, tarama yapmaz', () => {
    msHesapla([{ cardId: 'a', hazirlik: 55, niyet: 1 }], {});
    expect(msAnaMesafe()).toBe(55);
    S._mesafe.ana = null;
    expect(msAnaMesafe()).toBeNull();
  });

  it('bozuk girdi motoru düşürmez', () => {
    expect(() => msHesapla(null, {})).not.toThrow();
    expect(() => msHesapla([null, undefined, { cardId: 'x' }], {})).not.toThrow();
    expect(msHesapla([{ cardId: 'x' }], {})).toBeNull();   // hazirlik yok → elenir
  });
});

describe('sözleşme — window.ms* yüzeyi', () => {
  it('motor window\'a açılır: tüketiciler (02d, 10f) import değil köprü kullanır', () => {
    for (const k of ['msNiyet', 'msNiyetBaglam', 'msNiyetCtx', 'msHesapla', 'msAnaMesafe', 'msIz', 'msIzFark']) {
      expect(typeof window[k]).toBe('function');
    }
  });

  it('kkMatchCard dönüşü hazirlik taşır — eski alanların HİÇBİRİ kaybolmadı', () => {
    const m = kkMatchCard(getFullDeck()[0], {});
    for (const alan of ['score', 'dims', 'missing', 'earned', 'evidenceOk', 'ikna', 'iknaOk', 'iknaEksik', 'iknaEsik']) {
      expect(m[alan]).toBeDefined();
    }
    expect(typeof m.hazirlik).toBe('number');
  });
});

describe('msIz — "aradaki yol bugünlerden örülür"', () => {
  /** N gün önceki YEREL gün anahtarı — motorun ize yazdığı biçimin aynısı. */
  const gunKey = (once) => {
    const d = new Date(Date.now() - once * 86400000);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  afterEach(() => {
    try { SafeStorage.remove(`etw_mesafe_iz_v1_${S.currentUser?.id || 'anon'}`); } catch (_) {}
    S.currentUser = null;
  });

  it('oturum yokken iz yazılmaz (anon kirletmez)', () => {
    S.currentUser = null;
    msHesapla([{ cardId: 'a', hazirlik: 50, niyet: 1 }], {});
    expect(msIz()).toEqual([]);
  });

  it('oturum varken bugünün mesafesi ize düşer', () => {
    S.currentUser = { id: 'test-uid-iz' };
    SafeStorage.remove('etw_mesafe_iz_v1_test-uid-iz');
    msHesapla([{ cardId: 'a', hazirlik: 63, niyet: 1 }], {});
    const iz = msIz();
    expect(iz.length).toBe(1);
    expect(iz[0].gun).toBe(localISODate());   // UTC değil YEREL gün
    expect(iz[0].pct).toBe(63);
  });

  it('dünün kaydı yoksa fark null, varsa yön verir', () => {
    S.currentUser = { id: 'test-uid-fark' };
    const key = 'etw_mesafe_iz_v1_test-uid-fark';
    SafeStorage.remove(key);
    msHesapla([{ cardId: 'a', hazirlik: 70, niyet: 1 }], {});
    expect(msIzFark()).toBeNull();            // tek gün var
    // Düne elle bir kayıt koy — motorun okuduğu şekil bu
    const iz = SafeStorage.get(key, {});
    iz.d[gunKey(1)] = 61;
    SafeStorage.set(key, iz);
    expect(msIzFark()).toBe(9);               // 70 - 61
  });

  it('kayıt boşluğu bir gün DEĞİLDİR — beş gün önceki kayda "dün" denmez', () => {
    // Regresyon: msIzFark eskiden son iki KAYDI kıyaslıyordu, son iki GÜNÜ
    // değil. Beş gün ara veren kullanıcı döndüğünde "Dünden bugüne yol
    // kısaldı" cümlesi beş gün öncesini "dün" diye gösteriyordu.
    S.currentUser = { id: 'test-uid-bosluk' };
    const key = 'etw_mesafe_iz_v1_test-uid-bosluk';
    SafeStorage.remove(key);
    msHesapla([{ cardId: 'a', hazirlik: 70, niyet: 1 }], {});
    const iz = SafeStorage.get(key, {});
    iz.d[gunKey(5)] = 61;
    SafeStorage.set(key, iz);
    expect(msIzFark()).toBeNull();            // boşluk konuşmaz
  });

  it('v1 düz objesi v2 şekline TAŞINIR — eski kullanıcının yolu kaybolmaz', () => {
    S.currentUser = { id: 'test-uid-gocv1' };
    const key = 'etw_mesafe_iz_v1_test-uid-gocv1';
    SafeStorage.remove(key);
    // v1: sürüm damgası olmayan düz obje (yalnız günlük anahtarlar)
    SafeStorage.set(key, { [gunKey(3)]: 40, [gunKey(2)]: 45, [gunKey(1)]: 50 });
    const seri = msIz();
    expect(seri.map(x => x.pct)).toEqual([40, 45, 50]);
    expect(seri[2].gun).toBe(gunKey(1));
  });

  it('30 günü aşan gün HAFTALIK kovaya iner — yol kesilmez, seyrelir', () => {
    S.currentUser = { id: 'test-uid-hafta' };
    const key = 'etw_mesafe_iz_v1_test-uid-hafta';
    SafeStorage.remove(key);
    const ham = {};
    for (let i = 60; i >= 1; i--) ham[gunKey(i)] = 100 - i;   // 60 günlük v1 izi
    SafeStorage.set(key, ham);
    msHesapla([{ cardId: 'a', hazirlik: 99, niyet: 1 }], {});  // yazım taşımayı tetikler
    const kaydedilen = SafeStorage.get(key, {});
    expect(kaydedilen.v).toBe(2);
    expect(Object.keys(kaydedilen.d).length).toBeLessThanOrEqual(30);
    expect(Object.keys(kaydedilen.h).length).toBeGreaterThan(0);
    // Haftalık kova anahtarları PAZARTESİdir (gün anahtarıyla aynı biçim)
    for (const k of Object.keys(kaydedilen.h)) {
      expect(new Date(`${k}T00:00:00Z`).getUTCDay()).toBe(1);
    }
  });

  it('taşıma İDEMPOTENTTİR — iki kez koşmak veriyi bozmaz', () => {
    S.currentUser = { id: 'test-uid-idem' };
    const key = 'etw_mesafe_iz_v1_test-uid-idem';
    SafeStorage.remove(key);
    const ham = {};
    for (let i = 45; i >= 1; i--) ham[gunKey(i)] = 50 + (i % 7);
    SafeStorage.set(key, ham);
    msHesapla([{ cardId: 'a', hazirlik: 77, niyet: 1 }], {});
    const birinci = JSON.stringify(SafeStorage.get(key, {}));
    // İkinci yazım: aynı gün, aynı değer → yeniden normalize edilir
    msHesapla([{ cardId: 'a', hazirlik: 77, niyet: 1 }], {});
    expect(JSON.stringify(SafeStorage.get(key, {}))).toBe(birinci);
  });

  it('boşluktan sonra ardışık iki gün gelirse yine konuşur', () => {
    S.currentUser = { id: 'test-uid-bosluk2' };
    const key = 'etw_mesafe_iz_v1_test-uid-bosluk2';
    SafeStorage.remove(key);
    msHesapla([{ cardId: 'a', hazirlik: 70, niyet: 1 }], {});
    const iz = SafeStorage.get(key, {});
    iz.d[gunKey(9)] = 40;                     // eski, ilgisiz kayıt
    iz.d[gunKey(1)] = 66;                     // dün
    SafeStorage.set(key, iz);
    expect(msIzFark()).toBe(4);               // 70 - 66, son İKİ kayıt ardışık
  });
});
