// Hedef Mührü — "Böyle bir kişi olmak istiyorum" (10q ↔ 10D lapis köprüsü)
//   - oikAbsorbCard: 4 boyut → OİK kartı (hisler→duygular, kat başına 2, dedup, ref)
//   - oikReleaseCard: ref izli maddeler geri çekilir, el yazısı DOKUNULMAZ
//   - aktif kart yokken kuyruk + tasarım töreni sonrası drenaj
//   - _addEntry ref parametresi + _cleanEntries ref'i sunucu turunda korur
import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from 'vitest';

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
  oikAbsorbCard, oikReleaseCard, oikDrainAbsorbQueue,
  _addEntry, _rowFromCard, _cardFromRow, emptyCard,
} from '../js/parts/10D-olmak-istedigin.js';
import {
  kkOpenDetail, kkEnsureStyles, kkHedefMuhurle, kkHedefSok, kkGetHedefler, kkIsHedef, kkTick,
} from '../js/parts/10q-w2-kisi-karti.js';
import { deckReady } from '../js/parts/12b-kart-destesi.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';
import { S } from '../js/state.js';

/* 12b Kişi Kartı biçimi: boyutlar DÜZ STRING dizisi, `hisler` adıyla. */
const kisiKarti = (id = 'k_cesur') => ({
  id,
  name: 'Cesaretle Duran',
  dusunceler: ['Korku bir işarettir', 'Yapabilirim', 'Üçüncü düşünce'],
  inanclar: ['Değerliyim'],
  hisler: ['huzur', 'kararlılık'],
  davranislar: ['derin nefes al'],
});

const UID = 'u-test-1';
const QKEY = `etw_oik_absorb_q_${UID}`;

function seedActiveCard() {
  const c = emptyCard('tasarim');
  c.baslik = 'Hedef Kişi';
  S._oik.cards = [c];
  S._oik.activeCardId = c.id;
  return c;
}

beforeEach(() => {
  document.body.innerHTML = '';
  S.currentUser = { id: UID };
  S._oik = {
    cards: [], activeCardId: null,
    readingLog: { lastMorning: null, lastNight: null, lastDayKey: null, streak: 0, totalReadings: 0 },
    crystalMilestone: 0, seedHint: null, migratedFromGecis: false,
  };
  S._personTransition = { desired: { description: '' }, last_updated: null };
  S._affirmation = { text: '', source: '', created_at: null };
  SafeStorage.remove(QKEY);
});

describe('_addEntry — ref izi', () => {
  it('ref verilince maddede taşınır, verilmeyince alan hiç doğmaz', () => {
    const c = emptyCard();
    _addEntry(c, 'dusunceler', 'Kartlı madde', 'kart', 'k_cesur');
    _addEntry(c, 'dusunceler', 'El yazısı', 'user');
    expect(c.dusunceler[0].ref).toBe('k_cesur');
    expect('ref' in c.dusunceler[1]).toBe(false);
  });
});

describe('_cleanEntries — sunucu turu ref\'i düşürmez', () => {
  it('kart↔satır round-trip ref izini korur (mühür sökme buna bağlı)', () => {
    const c = seedActiveCard();
    _addEntry(c, 'inanclar', 'Değerliyim', 'kart', 'k_cesur');
    const back = _cardFromRow(_rowFromCard(c, UID));
    expect(back.inanclar[0].ref).toBe('k_cesur');
    expect(back.inanclar[0].src).toBe('kart');
  });
});

describe('oikAbsorbCard — hedeflenen kart lapis kutbu besler', () => {
  it('hisler → duygular eşlenir, kategori başına en fazla 2 madde girer', () => {
    const c = seedActiveCard();
    const added = oikAbsorbCard(kisiKarti());
    expect(added).toBe(6);                              // 2 + 1 + 2 + 1
    expect(c.dusunceler.map(e => e.text)).toEqual(['Korku bir işarettir', 'Yapabilirim']);
    expect(c.duygular.map(e => e.text)).toEqual(['huzur', 'kararlılık']);
    expect(c.davranislar.map(e => e.text)).toEqual(['derin nefes al']);
    expect(c.dusunceler.every(e => e.src === 'kart' && e.ref === 'k_cesur')).toBe(true);
  });

  it('aynı kart iki kez işlenmez (idempotent)', () => {
    seedActiveCard();
    expect(oikAbsorbCard(kisiKarti())).toBe(6);
    expect(oikAbsorbCard(kisiKarti())).toBe(0);
  });

  it('kullanıcının zaten yazdığı madde dedup edilir', () => {
    const c = seedActiveCard();
    _addEntry(c, 'duygular', 'huzur', 'user');
    oikAbsorbCard(kisiKarti());
    expect(c.duygular.filter(e => e.text === 'huzur')).toHaveLength(1);
    expect(c.duygular[0].src).toBe('user');            // el yazısı kazanır
  });

  it('olumlama aynası absorbe edilen inançtan tazelenir', () => {
    seedActiveCard();
    oikAbsorbCard(kisiKarti());
    expect(S._affirmation.text).toContain('Değerliyim');
    expect(S._affirmation.source).toBe('oik');
  });
});

describe('oikReleaseCard — mühür sökülünce iz geri alınır', () => {
  it('yalnız o kartın ref izli maddelerini çeker, el yazısına dokunmaz', () => {
    const c = seedActiveCard();
    _addEntry(c, 'dusunceler', 'Benim kendi cümlem', 'user');
    oikAbsorbCard(kisiKarti());
    oikAbsorbCard({ id: 'k_diger', dusunceler: ['Başka kartın maddesi'] });

    const removed = oikReleaseCard('k_cesur');
    expect(removed).toBe(6);
    expect(c.dusunceler.map(e => e.text)).toEqual(['Benim kendi cümlem', 'Başka kartın maddesi']);
    expect(c.duygular).toHaveLength(0);
  });

  it('hedefte olmayan kart için sıfır döner', () => {
    seedActiveCard();
    expect(oikReleaseCard('k_yok')).toBe(0);
  });
});

describe('kuyruk — OİK kartı yokken vurulan mühür kaybolmaz', () => {
  it('aktif kart yoksa kart id kuyruğa yazılır', () => {
    expect(oikAbsorbCard(kisiKarti())).toBe(0);
    expect(SafeStorage.get(QKEY, [])).toEqual(['k_cesur']);
  });

  it('aynı kart kuyrukta iki kez birikmez', () => {
    oikAbsorbCard(kisiKarti());
    oikAbsorbCard(kisiKarti());
    expect(SafeStorage.get(QKEY, [])).toEqual(['k_cesur']);
  });

  it('mühür sökülünce kuyruktan da düşer', () => {
    oikAbsorbCard(kisiKarti());
    oikReleaseCard('k_cesur');
    expect(SafeStorage.get(QKEY, [])).toEqual([]);
  });

  it('kuyruk boşken drenaj deste modülünü hiç yüklemez', async () => {
    await expect(oikDrainAbsorbQueue()).resolves.toBe(0);
  });
});

/* ── UI: buton yalnız SAHİPSİZ kartta (Kişiler), mühür töreni ────────────── */
describe('kkOpenDetail — hedef mührü yuvası', () => {
  const CARD = 'temel-ozsaygi-filiz';

  // Deste sidecar'ı + kkEnsureStyles ısıtması: jsdom'un devasa stil bloğunu
  // çözümlemesi pahalı; maliyet ilk kkOpenDetail çağrısında ödenirse yük
  // altında o test zaman aşımına düşer ([[test-kirilganligi-jsdom-stil-isinmasi]]).
  beforeAll(async () => { await deckReady(); kkEnsureStyles(); }, 30000);

  const freshKk = (collection = {}) => {
    S._kisiKarti = {
      profile: {}, collection, history: [], pending: [],
      seenIntro: true, lastTick: 0, closest: null, hedefler: {},
    };
  };

  beforeEach(() => {
    freshKk();
    // Gerçek lapis köprüsü — 10q window üzerinden 10D'ye ulaşır
    window.oikAbsorbCard = oikAbsorbCard;
    window.oikReleaseCard = oikReleaseCard;
  });

  afterEach(() => {
    const portal = document.getElementById('kk-detail-portal');
    if (portal) portal.innerHTML = '';
    vi.useRealTimers();
  });

  it('SAHİPSİZ kartta "Böyle bir kişi olmak istiyorum." butonu görünür', () => {
    kkOpenDetail(CARD);
    const portal = document.getElementById('kk-detail-portal');
    expect(portal.querySelector('[data-hedef-muhurle]')).toBeTruthy();
    expect(portal.innerHTML).toContain('Böyle bir kişi olmak istiyorum.');
  });

  it('SAHİPLİ kartta buton YOKTUR — olunmuş kişi hedeflenmez', () => {
    freshKk({ [CARD]: { earnedAt: '2026-01-15T10:00:00.000Z', rarity: 'yaygin', dims: {}, score: 80 } });
    kkOpenDetail(CARD);
    const portal = document.getElementById('kk-detail-portal');
    expect(portal.querySelector('#kk-hedef-slot').innerHTML.trim()).toBe('');
    expect(portal.querySelector('[data-hedef-muhurle]')).toBeFalsy();
  });

  it('butona basınca tören sahnelenir, yuva "hedefte" hâline döner, OİK beslenir', () => {
    vi.useFakeTimers();
    seedActiveCard();
    kkOpenDetail(CARD);
    const portal = document.getElementById('kk-detail-portal');
    portal.querySelector('[data-hedef-muhurle]').click();

    // tören sahnede: ALTIN damga + karar cümlesi
    const seal = portal.querySelector('.kk-hedef-seal');
    expect(seal).toBeTruthy();
    expect(seal.querySelector('.kk-hedef-seal-stamp')).toBeTruthy();
    expect(seal.textContent).toContain('Bu kişi artık hedefinde.');

    // veri iki yere birden düştü
    expect(kkIsHedef(CARD)).toBe(true);
    expect(kkGetHedefler()).toEqual([CARD]);
    const oikCard = S._oik.cards[0];
    const refli = [...oikCard.dusunceler, ...oikCard.inanclar, ...oikCard.duygular, ...oikCard.davranislar]
      .filter(e => e.ref === CARD);
    expect(refli.length).toBeGreaterThan(0);

    // sahne çekilir, yuva geri-alma hâline döner
    vi.advanceTimersByTime(2300);
    expect(portal.querySelector('.kk-hedef-seal')).toBeFalsy();
    expect(portal.querySelector('[data-hedef-sok]')).toBeTruthy();
  });

  it('"Hedeften çıkar" mührü söker ve OİK kartındaki izleri geri çeker', () => {
    seedActiveCard();
    kkHedefMuhurle(CARD);
    const oikCard = S._oik.cards[0];
    const before = oikCard.dusunceler.length;
    expect(before).toBeGreaterThan(0);

    kkOpenDetail(CARD);
    const portal = document.getElementById('kk-detail-portal');
    portal.querySelector('[data-hedef-sok]').click();

    expect(kkIsHedef(CARD)).toBe(false);
    expect(oikCard.dusunceler.filter(e => e.ref === CARD)).toHaveLength(0);
    expect(portal.querySelector('[data-hedef-muhurle]')).toBeTruthy();   // yuva geri döndü
  });

  it('kazanılan kart hedef listesinden düşer (mezuniyet okuması)', () => {
    seedActiveCard();
    kkHedefMuhurle(CARD);
    expect(kkGetHedefler()).toEqual([CARD]);
    S._kisiKarti.collection[CARD] = { earnedAt: '2026-07-25T00:00:00.000Z', rarity: 'yaygin' };
    expect(kkGetHedefler()).toEqual([]);
  });

  it('mühür idempotenttir — ikinci kez düşmez', () => {
    seedActiveCard();
    expect(kkHedefMuhurle(CARD)).toBe(true);
    expect(kkHedefMuhurle(CARD)).toBe(false);
    expect(kkHedefSok(CARD)).toBe(true);
    expect(kkHedefSok(CARD)).toBe(false);
  });

  it('kazanılmış kişi hedeflenemez — buton da mühür de reddeder', () => {
    freshKk({ [CARD]: { earnedAt: '2026-01-15T10:00:00.000Z', rarity: 'yaygin' } });
    seedActiveCard();
    expect(kkHedefMuhurle(CARD)).toBe(false);
    expect(kkIsHedef(CARD)).toBe(false);
  });
});

/* ── Mezuniyet: hedeflenen kişi kazanılınca mühür düşer ──────────────────── */
describe('mezuniyet — hedef → olunan', () => {
  const CARD = 'temel-ozsaygi-filiz';

  beforeAll(async () => { await deckReady(); }, 30000);

  beforeEach(() => {
    S._kisiKarti = {
      profile: {}, collection: {}, history: [], pending: [],
      seenIntro: true, lastTick: 0, closest: null, hedefler: {},
    };
    window.oikAbsorbCard = oikAbsorbCard;
  });

  it('kart kazanılınca hedefler sözlüğünden silinir', () => {
    seedActiveCard();
    kkHedefMuhurle(CARD);
    expect(S._kisiKarti.hedefler[CARD]).toBeTruthy();

    // kkTick'in kazanım yolunun yaptığı iş (mezuniyet bloğu)
    S._kisiKarti.collection[CARD] = { earnedAt: new Date().toISOString(), rarity: 'yaygin' };
    kkTick({ force: true, silent: true });

    expect(S._kisiKarti.hedefler[CARD]).toBeUndefined();
    expect(kkGetHedefler()).toEqual([]);
  });

  it('mezuniyet OİK kartındaki maddeleri ÇEKMEZ — o kişi artık senin parçan', () => {
    const oikCard = seedActiveCard();
    kkHedefMuhurle(CARD);
    const refliOnce = oikCard.dusunceler.filter(e => e.ref === CARD).length;
    expect(refliOnce).toBeGreaterThan(0);

    S._kisiKarti.collection[CARD] = { earnedAt: new Date().toISOString(), rarity: 'yaygin' };
    kkTick({ force: true, silent: true });

    expect(oikCard.dusunceler.filter(e => e.ref === CARD)).toHaveLength(refliOnce);
  });
});
