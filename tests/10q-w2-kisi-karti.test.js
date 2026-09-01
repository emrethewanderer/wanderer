// Kişi Kartı motoru (10q) — saf-fonksiyon testleri
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { kkComputeProfile, kkComputeSignals, kkMatchCard, kkPartitionDeck, kkScoreAndSort, kkTick, kkOpenDetail, kkEnsureStyles, kkMuhurle, kkEsikDurum, kkEsikListe, kkOneriRafi, kkEsikNisanHTML, kkEsikAc, loadKisilerView, kkNedenAc, kkNedenGirisHTML, kkDonemHafta, _kkDetayCanli } from '../js/parts/10q-w2-kisi-karti.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';
import '../js/parts/09i-secici.js';   // window.sec* köprüsü — beyan defteri
import { getFullDeck, getCardById, getDeckStats, deckReady } from '../js/parts/12b-kart-destesi.js';
import { _saveArchetypeProgress, EMRE_ONERI } from '../js/parts/12a-archetypes.js';
import { S } from '../js/state.js';

/* 12a'nın YALNIZ kalıcılık çağrısı taklit edilir (gerisi gerçek kalır:
   deste çizimi, EMRE_ONERI, arketip verisi hepsi bu dosyada canlı kullanılıyor).
   Kirli-izleme testi eskiden `window._saveArchetypeProgress = spy` kuruyordu —
   ama o köprü üretimde HİÇ yoktu, yani test kendi kurduğu spy'ı ölçüp geçiyordu:
   10q'nun arketip ilerlemesini gerçekten kaydedip kaydetmediğine dair hiçbir şey
   söylemiyordu. Çağrı 2026-08-07'de import'a bağlandı; test de gerçeği ölçsün. */
vi.mock('../js/parts/12a-archetypes.js', async (importOriginal) => ({
  ...(await importOriginal()),
  _saveArchetypeProgress: vi.fn(),
}));

// Deste içeriği sidecar'da (12b2) — test ortamında ESM fallback ile hidrate et.
beforeAll(async () => {
  await deckReady();
  // kkEnsureStyles'ın devasa stil bloğunu jsdom'un çözümlemesi pahalıdır ve bu
  // maliyet kkOpenDetail'in İLK çağrısında, törenin kendi testinin içinde
  // ödeniyordu — yük altında o testi zaman aşımına düşürüyordu (12f-hazine
  // emsali). Isıtma kuruluma alınır; testler kendi işlerini ölçer.
  kkEnsureStyles();
}, 30000);

describe('12b deste', () => {
  // Deste 2026-08-07'de "en temel" kesitine indirildi (12b2 banner'ı): sayı
  // artık bir alt sınır değil SÖZLEŞMEDİR — kesit mekaniklere göre kurulu
  // (iki evrim hattı + sentez + iki panzehir + üç çekirdek), tek kart eksilse
  // motorlardan biri sessizce susar.
  it('yayınlanan kesit tam 12 karttır', () => {
    expect(getFullDeck().length).toBe(12);
  });

  it('her kartın geçerli bir reçetesi vardır', () => {
    for (const c of getFullDeck()) {
      expect(c.recipe).toBeTruthy();
      expect(Array.isArray(c.recipe.signals)).toBe(true);
      expect(c.recipe.signals.length).toBeGreaterThan(0);
      expect(typeof c.recipe.threshold).toBe('number');
      // 12a çiziciyle uyumlu zorunlu alanlar
      for (const f of ['id', 'name', 'glyph', 'dusunceler', 'inanclar', 'hisler', 'davranislar']) {
        expect(c[f]).toBeDefined();
      }
    }
  });

  it('kart id\'leri tekildir', () => {
    const ids = getFullDeck().map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('istatistik nadirlik+kategori dağılımı döndürür', () => {
    const st = getDeckStats();
    expect(st.total).toBe(getFullDeck().length);
    expect(st.byRarity.efsane).toBeGreaterThan(0);
  });
});

describe('kkComputeProfile', () => {
  it('tüm sinyaller yüksekken boyutlar yüksek olur', () => {
    const hi = {
      standart: 90, normal: 90, layik: 90, hak_etmek: 90, oz_sevgi: 90, oz_saygi: 90,
      oz_deger: 90, oz_guven: 90, bolluk: 90, trust: 90, vulnerability: 90,
      empoweringRatio: 90, newChoiceRatio: 90, gecisStreak: 30, reviews: 20,
      dinlenme: 20, meclisIntegrated: 8, streak: 30, selfDialogue: 20,
    };
    const p = kkComputeProfile(hi);
    for (const d of ['dusunceler', 'inanclar', 'hisler', 'davranislar']) {
      expect(p[d]).toBeGreaterThan(70);
      expect(p[d]).toBeLessThanOrEqual(100);
    }
  });

  it('sinyaller düşük/sıfırken boyutlar düşük olur', () => {
    const lo = {};
    const p = kkComputeProfile(lo);
    for (const d of ['dusunceler', 'inanclar', 'hisler', 'davranislar']) {
      expect(p[d]).toBeLessThan(30);
    }
  });
});

describe('kkMatchCard', () => {
  // Deste sidecar'dan async hidrate olur — describe toplama anında değil,
  // beforeAll'da (deckReady sonrası) oku.
  let card; // yaygin · ozsaygi
  beforeAll(async () => { await deckReady(); card = getCardById('temel-ozsaygi-filiz'); });

  it('test kartı mevcut', () => {
    expect(card).toBeTruthy();
    expect(card.rarity).toBe('yaygin');
  });

  it('koşullar sağlanınca kart kazanılır', () => {
    // Reçete sinyalleri YETMEZ: kart ancak dört boyutta birden ikna varken
    // önerilir (İKNA KAPISI). Reçetenin susduğu boyutlar canlı profilden
    // okunur, bu yüzden senaryo iç dünyayı da ayakta tutar.
    const sig = {
      oz_saygi: 85, reviews: 6, newChoiceRatio: 85, standart: 85,
      sessions: 10, gecisReadings: 5, selfDialogue: 3, dinlenme: 2,
      oz_sevgi: 78, oz_deger: 74, oz_guven: 72, layik: 76, hak_etmek: 70,
      normal: 80, trust: 70, empoweringRatio: 75, gecisStreak: 8, streak: 12,
    };
    const m = kkMatchCard(card, sig);
    expect(m.earned).toBe(true);
    expect(m.score).toBeGreaterThanOrEqual(card.recipe.threshold);
    expect(m.evidenceOk).toBe(true);
    expect(m.iknaOk).toBe(true);
    expect(m.iknaEksik).toEqual([]);
  });

  /* İKNA KAPISI (Emre, 2026-07-28) — "4 alanda da ikna olunmadan bir kart
     sunulmasın". Ölçülmüş kök sorun: davranışı güçlü / iç dünyası zayıf bir
     profilde 112 kartın 78'i öneriye düşüyordu (ölçüm o günün 112 kartlık
     destesinde; deste 2026-08-07'de 12'lik kesite indi, kapı aynı kaldı). */
  it('tek boyut güçlü, iç dünya sessizken kart ÖNERİLMEZ (ikna kapısı)', () => {
    const sig = {
      oz_saygi: 85, reviews: 6, newChoiceRatio: 85, standart: 85,
      sessions: 10, gecisReadings: 5, selfDialogue: 3, dinlenme: 2,
    };
    const m = kkMatchCard(card, sig);
    expect(m.score).toBeGreaterThanOrEqual(card.recipe.threshold); // ortalama yeter
    expect(m.evidenceOk).toBe(true);                               // yaşanmışlık yeter
    expect(m.iknaOk).toBe(false);                                  // ama dört boyut yok
    expect(m.iknaEksik.length).toBeGreaterThan(0);
    expect(m.earned).toBe(false);                                  // → kart sunulmaz
  });

  it('ikna dört boyutu birden döndürür; eşik kartın nadirliğiyle yükselir', () => {
    const sig = { oz_saygi: 60, reviews: 4, newChoiceRatio: 60, standart: 60, sessions: 8 };
    const m = kkMatchCard(card, sig);
    for (const d of ['dusunceler', 'inanclar', 'hisler', 'davranislar']) {
      expect(typeof m.ikna[d]).toBe('number');
    }
    // yaygin (threshold 58) vs efsane — efsane olmak dört boyutta daha çok ister
    const efsane = getFullDeck().find(c => c.rarity === 'efsane');
    expect(efsane).toBeTruthy();
    expect(kkMatchCard(efsane, sig).iknaEsik).toBeGreaterThan(m.iknaEsik);
  });

  it('sinyaller düşükken kazanılmaz, eksik ipuçları döner', () => {
    const sig = { oz_saygi: 10, reviews: 0, newChoiceRatio: 10, standart: 10, sessions: 0 };
    const m = kkMatchCard(card, sig);
    expect(m.earned).toBe(false);
    expect(m.missing.length).toBeGreaterThan(0);
    expect(typeof m.missing[0].hint).toBe('string');
  });

  it('eşiği geçse de yeterli kanıt yoksa kazanılmaz (minEvidence kapısı)', () => {
    const nadide = getCardById('temel-ozsaygi-tac'); // nadide · minEvidence yüksek
    const sig = { oz_saygi: 99, standart: 99, newChoiceRatio: 99 }; // skor yüksek ama aktivite 0
    const m = kkMatchCard(nadide, sig);
    expect(m.evidenceOk).toBe(false);
    expect(m.earned).toBe(false);
  });
});

// "Kişilerim" (sahipli) vs "Kişiler" (sahipsiz) bölmesinin doğruluk kaynağı
describe('kkPartitionDeck', () => {
  let deck;
  beforeAll(async () => { await deckReady(); deck = getFullDeck(); });

  it('boş koleksiyon → hepsi sahipsiz, hiçbiri sahipli', () => {
    const { owned, unowned } = kkPartitionDeck(deck, {});
    expect(owned.length).toBe(0);
    expect(unowned.length).toBe(deck.length);
  });

  it('null/undefined koleksiyon güvenli', () => {
    expect(kkPartitionDeck(deck, null).unowned.length).toBe(deck.length);
    expect(kkPartitionDeck(null, null).owned.length).toBe(0);
  });

  it('koleksiyondakiler sahipli, gerisi sahipsiz; toplam korunur; örtüşme yok', () => {
    const ids = deck.slice(0, 5).map(c => c.id);
    const coll = Object.fromEntries(ids.map(id => [id, { earnedAt: 'x' }]));
    const { owned, unowned } = kkPartitionDeck(deck, coll);
    expect(owned.map(c => c.id).sort()).toEqual([...ids].sort());
    expect(owned.length + unowned.length).toBe(deck.length);
    expect(unowned.some(c => ids.includes(c.id))).toBe(false);
  });
});

describe('kkScoreAndSort', () => {
  let deck;
  beforeAll(async () => { await deckReady(); deck = getFullDeck(); });

  it('en yakın önce — sıra ölçüsü hazirlik×niyet (Mesafe Motoru 13x)', () => {
    // Sıra artık ham `score` değil `hazirlik` üzerinden kurulur: kullanıcıya
    // gösterilen sayı odur, liste onunla çelişemez. Niyet kaynağı yokken
    // katsayı 1.0'da eşitlenir, sıra saf hazırlık olur.
    const sig = { oz_saygi: 85, reviews: 6, newChoiceRatio: 85, standart: 85, sessions: 10, gecisReadings: 5, selfDialogue: 3, dinlenme: 2 };
    const scored = kkScoreAndSort(deck, sig);
    expect(scored.length).toBe(deck.length);
    for (let i = 1; i < scored.length; i++) {
      expect(scored[i - 1].sira).toBeGreaterThanOrEqual(scored[i].sira);
    }
    expect(scored[0].card).toBeTruthy();
    expect(typeof scored[0].m.score).toBe('number');
    expect(typeof scored[0].m.hazirlik).toBe('number');
    expect(scored[0].niyet).toBe(1);
  });

  it('boş/null girdi güvenli', () => {
    expect(kkScoreAndSort([], {}).length).toBe(0);
    expect(kkScoreAndSort(null, {}).length).toBe(0);
  });
});

describe('kkOpenDetail — "Huzura Çıkış" töreni', () => {
  const cardId = 'temel-ozsaygi-filiz';

  it('sahipsiz kart: backdrop + flip + yol bölümü (ritüel çipleri) render eder, iz yok', () => {
    S._kisiKarti = { profile: {}, collection: {}, history: [], pending: [], seenIntro: true, lastTick: 0, closest: null };
    kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');
    expect(portal).toBeTruthy();
    expect(portal.querySelector('.kk-det-backdrop svg')).toBeTruthy();
    expect(portal.querySelector('#kk-det-flip')).toBeTruthy();
    expect(portal.querySelector('.kk-det-req')).toBeTruthy();
    expect(portal.querySelector('.kk-det-trace')).toBeFalsy();
    portal.innerHTML = '';
  });

  it('halka HAZIRLIK gösterir — ham skoru değil (13x sözleşmesi)', () => {
    // Kullanıcının detayda gördüğü sayı, kartın gelişiyle aynı şeyi söylemeli.
    // Eskiden burada `m.score` yazıyordu: üç kapıdan yalnız biri. İkna kapısı
    // takılıyken %85 gösterip kart vermeyen hâl buradan doğuyordu.
    S._kisiKarti = { profile: {}, collection: {}, history: [], pending: [], seenIntro: true, lastTick: 0, closest: null, hedefler: {} };
    kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');
    const pct = portal.querySelector('.kk-det-req-pct');
    expect(pct).toBeTruthy();
    const gorunen = parseInt(pct.textContent.replace(/[^\d]/g, ''), 10);

    const card = getCardById(cardId);
    const m = kkMatchCard(card, kkComputeSignals());
    expect(gorunen).toBe(m.hazirlik);
    // Ham skor farklıysa, gösterilenin gerçekten hazırlık olduğu kanıtlanır
    if (m.hazirlik !== m.score) expect(gorunen).not.toBe(m.score);
    portal.innerHTML = '';
  });

  it('"Eşiktesin" mesajı yalnız hazirlik %100 iken görünür', () => {
    // Öz-denetimde yakalandı: mesaj yalnız `missing` listesinin boşluğuna
    // bakıyordu. Reçetesi tam tutmuş ama DÖRT BOYUT ikna kapısı takılı kartta
    // halka %78 derken "✦ Eşiktesin" yazıyordu — kart ise gelmiyordu.
    S._kisiKarti = { profile: {}, collection: {}, history: [], pending: [], seenIntro: true, lastTick: 0, closest: null, hedefler: {} };
    kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');
    // Satır artık HER ZAMAN basılır (canlı tazeleme DOM kurmasın diye);
    // sorunun ölçüsü varlık değil GÖRÜNÜRLÜKTÜR.
    const esikteMsg = portal.querySelector('.kk-det-req-ok');
    expect(esikteMsg).toBeTruthy();
    const m = kkMatchCard(getCardById(cardId), kkComputeSignals());
    if (!esikteMsg.hasAttribute('hidden')) expect(m.hazirlik).toBe(100);
    else expect(m.hazirlik).toBeLessThan(100);
    portal.innerHTML = '';
  });

  it('sahipli kart: koleksiyon izi görünür, yol bölümü kalkar', () => {
    S._kisiKarti = {
      profile: {}, history: [], pending: [], seenIntro: true, lastTick: 0, closest: null,
      collection: { [cardId]: { earnedAt: '2026-01-15T10:00:00.000Z', rarity: 'yaygin', dims: {}, score: 80 } },
    };
    kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');
    expect(portal.querySelector('.kk-det-req')).toBeFalsy();
    expect(portal.querySelector('.kk-det-trace')).toBeTruthy();
    expect(portal.innerHTML).toContain('KOLEKSİYONDA');
    portal.innerHTML = '';
  });

  it('kapatma düğmesi portalı temizler', () => {
    S._kisiKarti = { profile: {}, collection: {}, history: [], pending: [], seenIntro: true, lastTick: 0, closest: null };
    kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');
    portal.querySelector('#kk-det-close').click();
    expect(portal.innerHTML).toBe('');
  });

  /* Törenden üç çıkış kapısı. Veil `pointer-events:none` olduğundan ona
     bağlanan kapanış hiç tetiklenemiyordu; dıştaki dokunuş .kk-det'in
     KENDİSİNE düşer. Gövde/kart hedefken kapanmamalı. */
  it('Escape töreni kapatır', () => {
    S._kisiKarti = { profile: {}, collection: {}, history: [], pending: [], seenIntro: true, lastTick: 0, closest: null };
    kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(portal.innerHTML).toBe('');
  });

  it('eşiğin dışına dokunuş kapatır; gövdeye/karta dokunuş kapatmaz', () => {
    S._kisiKarti = { profile: {}, collection: {}, history: [], pending: [], seenIntro: true, lastTick: 0, closest: null };
    kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');

    // gövde hedefken açık kalır
    portal.querySelector('.kk-det-body').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(portal.querySelector('.kk-det')).toBeTruthy();
    // kart hedefken açık kalır ve çevrilir
    const flip = portal.querySelector('#kk-det-flip');
    flip.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(portal.querySelector('.kk-det')).toBeTruthy();
    expect(flip.classList.contains('is-flipped')).toBe(true);
    // eşiğin dışı (.kk-det'in kendisi) hedefken kapanır
    const det = portal.querySelector('.kk-det');
    det.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(portal.innerHTML).toBe('');
  });

  it('detaydan detaya geçişte Escape dinleyicisi birikmez', () => {
    S._kisiKarti = { profile: {}, collection: {}, history: [], pending: [], seenIntro: true, lastTick: 0, closest: null };
    // portalı kapatmadan arka arkaya açmak (panzehir geçişinin yaptığı) eski
    // dinleyiciyi document'te bırakmamalı — tek Escape yetmeli.
    for (let i = 0; i < 4; i++) kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(portal.innerHTML).toBe('');
    // kapalıyken gelen Escape hata vermemeli
    expect(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))).not.toThrow();
  });

  /* Panzehir kartı detayın İÇİNDEN açılır. Salon yüzeylerinin [data-open]
     bağlayıcısı `body` üzerinde çalışır, portal onun dışında yaşar — bağ
     kurulmazsa buton sessizce ölü kalır. */
  it('panzehir butonu ışık kartının detayını açar', () => {
    const golge = getFullDeck().find(c => c.category === 'golge' && c.virtue);
    expect(golge).toBeTruthy();
    const isik = getFullDeck().find(c => c.virtue === golge.virtue && c.category !== 'golge' && c.category !== 'bilesik');
    expect(isik).toBeTruthy();
    S._kisiKarti = {
      profile: {}, history: [], pending: [], seenIntro: true, lastTick: 0, closest: null,
      collection: { [isik.id]: { earnedAt: '2026-01-15T10:00:00.000Z', rarity: isik.rarity, dims: {}, score: 80 } },
    };
    kkOpenDetail(golge.id);
    const portal = document.getElementById('kk-detail-portal');
    const pzBtn = portal.querySelector('.kk-pz-card');
    expect(pzBtn).toBeTruthy();
    pzBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // Ad artık kartın KENDİ yüzünde (12c .ikv-name) — detay ayrı bir başlık basmaz.
    expect(portal.querySelector('.kk-det-face .ikv-name').textContent).toBe(isik.name);
    portal.innerHTML = '';
  });
});

/* ═══ BOY KART — "detay bir sayfa değil, kartın kendisidir" ═══════════════
   Emre'nin kararı (2026-08-25): kişinin dört asli unsuru kartın DIŞINDA bir
   listede değil, kartın ÜSTÜNDE yazar; aradaki yol da orada ölçülür. */
describe('kkOpenDetail — boy kart ve aradaki yol', () => {
  const cardId = 'temel-ozsaygi-filiz';
  const bosKk = () => ({ profile: {}, collection: {}, history: [], pending: [], seenIntro: true, lastTick: 0, closest: null, hedefler: {} });

  it('detayın kartı BOY karttır ve sırtı da boy uyumludur', () => {
    S._kisiKarti = bosKk();
    kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');
    expect(portal.querySelector('.kk-det-face .ikv-card--boy')).toBeTruthy();
    expect(portal.querySelector('.kk-det-back .ikv-back--boy')).toBeTruthy();
    portal.innerHTML = '';
  });

  it('dört asli unsur KARTIN İÇİNDE yaşar (dışarıdaki listede değil)', () => {
    S._kisiKarti = bosKk();
    kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');
    const kutu = portal.querySelector('.kk-det-face .ikv-card .kk-det-kutu');
    expect(kutu).toBeTruthy();
    expect(kutu.querySelectorAll('.kk-det-trait').length).toBe(4);
    // gövdede (kart altında) ikinci bir unsur bloğu KALMAMALI
    expect(portal.querySelector('.kk-det-body .kk-det-traits')).toBeFalsy();
    portal.innerHTML = '';
  });

  it('kartın dört unsuru gerçekten kartın verisidir ve kaçırılarak basılır', () => {
    S._kisiKarti = bosKk();
    const card = getCardById(cardId);
    kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');
    const ilk = portal.querySelector('.kk-det-trait li');
    expect(ilk.textContent).toBe(card.dusunceler[0]);
    // esc kapısı: ham HTML basılmaz (extra ham HTML alır, kaçış üreticinindir)
    expect(portal.querySelector('.kk-det-kutu').innerHTML).not.toContain('<script');
    portal.innerHTML = '';
  });

  it('aradaki yol çizgisi HAZIRLIK ile dolar — sayı ve çubuk tek kaynaktan', () => {
    S._kisiKarti = bosKk();
    kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');
    const m = kkMatchCard(getCardById(cardId), kkComputeSignals());
    const cizgi = portal.querySelector('.kk-det-yol .ikv-ms');
    expect(cizgi).toBeTruthy();
    expect(cizgi.getAttribute('style')).toContain(`--ms-pct:${m.hazirlik}%`);
    // cümledeki sayı da AYNI ölçüyü söyler
    const pct = portal.querySelector('.kk-det-req-pct');
    expect(parseInt(pct.textContent.replace(/[^\d]/g, ''), 10)).toBe(m.hazirlik);
    portal.innerHTML = '';
  });

  it('sahipli kartta yol yürünmüştür: çizgi tam, cümle sayı konuşmaz', () => {
    S._kisiKarti = {
      profile: {}, history: [], pending: [], seenIntro: true, lastTick: 0, closest: null, hedefler: {},
      collection: { [cardId]: { earnedAt: '2026-01-15T10:00:00.000Z', rarity: 'yaygin', dims: {}, score: 80 } },
    };
    kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');
    expect(portal.querySelector('.kk-det-yol .ikv-ms').getAttribute('style')).toContain('--ms-pct:100%');
    expect(portal.querySelector('.kk-det-req-pct')).toBeFalsy();
    portal.innerHTML = '';
  });

  it('kart üstündeki düğmeye dokunmak kartı ÇEVİRMEZ (delege kapısı)', () => {
    S._kisiKarti = bosKk();
    kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');
    const flip = portal.querySelector('#kk-det-flip');
    const yolBtn = portal.querySelector('.kk-det-yol .ikv-ms--btn');
    expect(yolBtn).toBeTruthy();
    yolBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(flip.classList.contains('is-flipped')).toBe(false);
    // ipucu satırı ise gerçek kapıdır — o çevirir
    portal.querySelector('#kk-det-flip-btn').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(flip.classList.contains('is-flipped')).toBe(true);
    portal.innerHTML = '';
  });

  it('durum satırları HER ZAMAN basılır, hidden ile açılır (canlı tazeleme DOM kurmasın)', () => {
    S._kisiKarti = bosKk();
    kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');
    for (const sel of ['.kk-det-near', '.kk-det-zayif', '.kk-det-req-ok']) {
      expect(portal.querySelector(sel)).toBeTruthy();
    }
    portal.innerHTML = '';
  });
});

/* ═══ CANLI ÖLÇÜM (K6) — açık kart ölçüyü kaçırmaz ═══════════════════════
   Boy kart bir sayfa değil bir penceredir: açıkken arkadaki ölçü değişirse
   pencere de değişmeli. Yeni zamanlayıcı kurulmaz — kkTick zaten dönüyor.
   Bu blok o kancanın üç sözünü sınar: tazeler, kapalıyken susar, sahiplik
   değişince töreni yeniden kurar. */
describe('_kkDetayCanli — canlı ölçüm kancası (FAZ 3)', () => {
  const cardId = 'temel-ozsaygi-filiz';
  const bosKk = () => ({ profile: {}, collection: {}, history: [], pending: [], seenIntro: true, lastTick: 0, closest: null, hedefler: {} });

  /* Sinyalleri GERÇEK yoldan oynatır (kkComputeSignals S'in slice'larını okur).
     Uydurma bir hazirlik değeri yazmak testi kendi kurduğu sayıyı ölçer hâle
     getirirdi; burada ölçünün tek kaynağı yine kkMatchCard'dır. */
  const sinyalBesle = () => {
    S._reviews = { day: [{}, {}, {}], week: [{}], month: [], year: [] };
    S._dinlenme = { achievements: [{}, {}] };
    S._hayalAlemi = { sahneler: [{}, {}, {}] };
  };
  const sinyalSil = () => { S._reviews = {}; S._dinlenme = {}; S._hayalAlemi = {}; };

  afterEach(() => {
    sinyalSil();
    const p = document.getElementById('kk-detail-portal');
    if (p) { p.innerHTML = ''; delete p.dataset.canliKart; delete p.dataset.canliSahip; }
  });

  it('açık detayda çizgi ve yüzde tazelenir — ikisi de kkMatchCard ile aynı', () => {
    S._kisiKarti = bosKk();
    sinyalSil();
    kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');

    // Yüzeyi kasten bozuyoruz: tazeleme gerçekten YAZIYOR mu, yoksa test
    // açılıştaki doğru değeri mi okuyor? Bozmadan sorulursa ikisi ayırt edilemez.
    portal.querySelector('.kk-det-req-pct').textContent = '%0';
    portal.querySelector('.kk-det-yol .ikv-ms').style.setProperty('--ms-pct', '0%');

    sinyalBesle();
    expect(_kkDetayCanli()).toBe(true);

    const m = kkMatchCard(getCardById(cardId), kkComputeSignals());
    const pct = portal.querySelector('.kk-det-req-pct');
    expect(parseInt(pct.textContent.replace(/[^\d]/g, ''), 10)).toBe(m.hazirlik);
    expect(portal.querySelector('.kk-det-yol .ikv-ms').style.getPropertyValue('--ms-pct')).toBe(m.hazirlik + '%');
  });

  it('portal boşken ya da kart adresi yokken sessizce düşer', () => {
    S._kisiKarti = bosKk();
    kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');

    portal.innerHTML = '';                       // kapalı: içerik yok
    expect(_kkDetayCanli()).toBe(false);

    portal.innerHTML = '<div></div>';            // içerik var, adres yok
    delete portal.dataset.canliKart;
    expect(_kkDetayCanli()).toBe(false);
  });

  it('sahiplik değişirse parça yazmaz — töreni yeniden kurar', () => {
    S._kisiKarti = bosKk();
    kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');
    expect(portal.dataset.canliSahip).toBe('0');
    expect(portal.querySelector('.kk-det-req-pct')).toBeTruthy();

    // Mühür bu tick'te düştü: palet, iz ve beyan yuvaları hep birden değişir.
    S._kisiKarti.collection[cardId] = { earnedAt: '2026-01-15T10:00:00.000Z', rarity: 'yaygin', dims: {}, score: 80 };
    expect(_kkDetayCanli()).toBe(true);

    expect(portal.dataset.canliSahip).toBe('1');
    expect(portal.querySelector('.kk-det-yol .ikv-ms').getAttribute('style')).toContain('--ms-pct:100%');
    expect(portal.querySelector('.kk-det-req-pct')).toBeFalsy();   // sahipli kart sayı konuşmaz
  });

  it('sahipli kartta yazacak bir şey yoktur — yol zaten tam', () => {
    S._kisiKarti = bosKk();
    S._kisiKarti.collection[cardId] = { earnedAt: '2026-01-15T10:00:00.000Z', rarity: 'yaygin', dims: {}, score: 80 };
    kkOpenDetail(cardId);
    expect(_kkDetayCanli()).toBe(false);
  });

  it('kkTick açık detayı kendiliğinden tazeler — ayrı zamanlayıcı yok', () => {
    S._kisiKarti = bosKk();
    sinyalSil();
    kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');
    portal.querySelector('.kk-det-req-pct').textContent = '%0';

    sinyalBesle();
    kkTick({ force: true });

    const m = kkMatchCard(getCardById(cardId), kkComputeSignals());
    expect(parseInt(portal.querySelector('.kk-det-req-pct').textContent.replace(/[^\d]/g, ''), 10)).toBe(m.hazirlik);
  });

  /* close() bu iki alanı siliyordu, "Artık o kişiyim." yolu silmiyordu: portal
     boşalıyor ama kancanın adresi duruyordu. Guard (childElementCount) bugün
     no-op'a düşürüyor — temizlik yine de kendi yolunda yapılır, guard'a
     yaslanmaz. (FAZ 3 çapraz denetimi, 2026-08-26.) */
  it('Oluş CTA\'sı portalı boşaltınca kancanın adresi de silinir', () => {
    S._kisiKarti = bosKk();
    kkOpenDetail(cardId);
    const portal = document.getElementById('kk-detail-portal');
    expect(portal.dataset.canliKart).toBe(cardId);

    portal.querySelector('[data-olus-beyan]').click();

    expect(portal.dataset.canliKart).toBeUndefined();
    expect(portal.dataset.canliSahip).toBeUndefined();
    expect(_kkDetayCanli()).toBe(false);
  });
});

// ─── Tanıma Motoru (FAZ 1+2) — kart-detay oturum izi + gösterim tepkisi ──────
describe('kkOpenDetail — Tanıma Motoru izleri', () => {
  const cardId = 'temel-ozsaygi-filiz';

  afterEach(() => {
    delete window.omKaydetTepki;
    delete window.wtOverlayOpen;
    delete window.wtOverlayClose;
  });

  it('açılış S._oturumIzi.kartlar\'a kart id\'siyle iz bırakır (İ7)', () => {
    S._kisiKarti = { profile: {}, collection: {}, history: [], pending: [], seenIntro: true, lastTick: 0, closest: null };
    S._oturumIzi = { ekranlar: [], kartlar: [], skipler: [], torenler: [] };
    kkOpenDetail(cardId);
    expect(S._oturumIzi.kartlar).toEqual([expect.objectContaining({ id: cardId })]);
    document.getElementById('kk-detail-portal').innerHTML = '';
  });

  it('açılış omKaydetTepki\'yi çağırır — bugün gösterilmişse tepkisiz sayılmasın', () => {
    S._kisiKarti = { profile: {}, collection: {}, history: [], pending: [], seenIntro: true, lastTick: 0, closest: null };
    const spy = vi.fn();
    window.omKaydetTepki = spy;
    kkOpenDetail(cardId);
    expect(spy).toHaveBeenCalledWith(cardId);
    document.getElementById('kk-detail-portal').innerHTML = '';
  });

  it('×/Escape/dışa dokunuş kapanışı wtOverlayClose(\'kart-detay\',\'kapat\') çağırır', () => {
    S._kisiKarti = { profile: {}, collection: {}, history: [], pending: [], seenIntro: true, lastTick: 0, closest: null };
    const spy = vi.fn();
    window.wtOverlayClose = spy;
    kkOpenDetail(cardId);
    document.getElementById('kk-det-close').click();
    expect(spy).toHaveBeenCalledWith('kart-detay', 'kapat');
  });
});

describe('kkTick kirli-izleme (kalıcılık gating)', () => {
  it('değişiklik yoksa ardışık tick kaydetmez (gereksiz IndexedDB/Supabase yazımını önler)', () => {
    // S._kisiKarti varsayılan boş durumdan başlar
    S._kisiKarti = { profile: { dusunceler: 0, inanclar: 0, hisler: 0, davranislar: 0 }, collection: {}, history: [], pending: [], seenIntro: true, lastTick: 0, closest: null };
    _saveArchetypeProgress.mockClear();

    // 1. tick: closest null→kart olur → kirli → kaydeder
    kkTick({ force: true });
    const afterFirst = _saveArchetypeProgress.mock.calls.length;
    expect(afterFirst).toBeGreaterThan(0);

    // 2. tick: sinyaller değişmedi → kirli değil → kaydetmez
    kkTick({ force: true });
    expect(_saveArchetypeProgress.mock.calls.length).toBe(afterFirst);
  });
});

/* ── OLUŞ MÜHRÜ (K0-K2) — "kart dağıtılmaz, beyan edilir" ─────────────────
   Regresyon kökü: `minEvidence` nadirlik başına tek global kapı olduğu için
   kapı aşıldığı an skoru çoktan yeten onlarca kart aynı tick'te düşüyor ve
   hepsi doğrudan koleksiyona yazılıp bir dağıtım hattı oluşturuyordu.
   Emre'nin kararı (2026-07-27): Wanderer kart DAĞITMAZ, yalnız ÖNERİR —
   reçetesi tutan kart artık `collection`'a değil eşik havuzuna (`kk.esik`)
   düşer; koleksiyona geçiş yalnız kullanıcının beyanıyla (`kkMuhurle`)
   olur. ──────────────────────────────────────────────────────────────── */
describe('Oluş Mührü — eşik havuzu + kkMuhurle', () => {
  // yaygin · minEvidence 3 · dört sinyalli sade reçete — testte kolayca
  // tetiklenir (bkz. 12b2 VIRTUE_META.ozsevgi + RARITIES.yaygin).
  const CARD = 'temel-ozsevgi-filiz';

  function kur() {
    S._kisiKarti = {
      profile: { dusunceler: 0, inanclar: 0, hisler: 0, davranislar: 0, updatedAt: null },
      collection: {}, history: [], seenIntro: true, lastTick: 0,
      closest: null, hedefler: {}, esik: {},
    };
    // Reçetenin dört sinyalini tam doyurur (ratio=1 hepsinde) → score 100,
    // minEvidence(3) `dinlenme` tek başına karşılar (achievements.length=3).
    S._foundationsProfile = { oz_sevgi: { score: 90 } };
    S._depthProfile = { normal: { score: 90 } };
    S._relationshipDepth = { trust_score: 90 };
    S._dinlenme = { achievements: [1, 2, 3] };
  }

  afterEach(() => {
    delete S._foundationsProfile; delete S._depthProfile;
    delete S._relationshipDepth; delete S._dinlenme;
  });

  it('reçetesi tutan kart koleksiyona değil eşik havuzuna düşer — tören açılmaz', () => {
    kur();
    kkTick({ force: true });
    expect(S._kisiKarti.collection[CARD]).toBeUndefined();
    expect(kkEsikDurum(CARD)).toBeTruthy();
    expect(document.getElementById('kk-pack-portal')).toBeFalsy();
    expect(document.getElementById('kk-fan-portal')).toBeFalsy();
  });

  it('eşikteki kart "sahipli" sayılmaz — kkPartitionDeck().owned içinde YOK (collection sözleşmesi)', () => {
    kur();
    kkTick({ force: true });
    const { owned } = kkPartitionDeck(getFullDeck(), S._kisiKarti.collection);
    expect(owned.some(c => c.id === CARD)).toBe(false);
  });

  it('kkOneriRafi eşikteki kartı önerir — en fazla n', () => {
    kur();
    kkTick({ force: true });
    const raf = kkOneriRafi(3);
    expect(raf.length).toBeLessThanOrEqual(3);
    expect(raf).toContain(CARD);   // skor 100 — rafta daima ilk sırada
  });

  it('kkMuhurle eşikten koleksiyona taşır — muhur.yol işlenir, esik temizlenir', () => {
    kur();
    kkTick({ force: true });
    expect(kkEsikDurum(CARD)).toBeTruthy();

    expect(kkMuhurle(CARD, { yol: 'davet' })).toBe(true);
    expect(S._kisiKarti.collection[CARD]).toBeTruthy();
    expect(S._kisiKarti.collection[CARD].muhur).toEqual({ at: expect.any(String), yol: 'davet' });
    expect(kkEsikDurum(CARD)).toBeNull();
  });

  it('kkMuhurle idempotenttir — ikinci çağrı false döner, veri bozulmaz', () => {
    kur();
    kkTick({ force: true });
    expect(kkMuhurle(CARD, { yol: 'davet' })).toBe(true);
    const once = S._kisiKarti.collection[CARD];
    expect(kkMuhurle(CARD, { yol: 'davet' })).toBe(false);
    expect(S._kisiKarti.collection[CARD]).toBe(once);   // aynı kayıt — ezilmedi
  });

  it('collection yoksa da güvenli döner (bilinmeyen kart, boş kk)', () => {
    kur();
    expect(kkMuhurle('yok-boyle-bir-kart')).toBe(false);
    expect(kkEsikDurum('yok-boyle-bir-kart')).toBeNull();
    expect(kkEsikListe()).toEqual(expect.any(Array));
  });

  // K6 — bugüne kadar kazanılmış kartlar dokunulmazdır: `muhur` alanı OLMAYAN
  // kayıt mirastır, mühürlü sayılır ve geriye dönük soru sorulmaz.
  it('miras kayıt korunur — yeniden mühürlenmez, eşiğe geri düşmez', () => {
    kur();
    S._kisiKarti.collection[CARD] = { earnedAt: '2026-01-01T00:00:00.000Z', rarity: 'yaygin', score: 71 };
    const miras = S._kisiKarti.collection[CARD];

    expect(kkMuhurle(CARD, { yol: 'davet' })).toBe(false);
    expect(S._kisiKarti.collection[CARD]).toBe(miras);      // kayıt ezilmedi
    expect(S._kisiKarti.collection[CARD].muhur).toBeUndefined();

    kkTick({ force: true });                                 // reçete yine tutar
    expect(kkEsikDurum(CARD)).toBeNull();                    // ama havuza düşmez
  });

  it('eşik havuzuna kullanıcı da açabilir — beyan yolu barajdan bağımsızdır', () => {
    kur();
    const e = kkEsikAc(CARD, { skor: 0, kaynak: 'beyan' });  // reçete tutmadan
    expect(e).toBeTruthy();
    expect(kkEsikDurum(CARD).kaynak).toBe('beyan');
    expect(kkEsikAc(CARD, {})).toBe(kkEsikDurum(CARD));      // idempotent
  });
});

describe('Oluş Mührü — EŞİKTE nişanı ve öneri rafı yüzeyi (FAZ 4)', () => {
  const CARD = 'temel-ozsevgi-filiz';

  function kur() {
    S._kisiKarti = {
      profile: { dusunceler: 0, inanclar: 0, hisler: 0, davranislar: 0, updatedAt: null },
      collection: {}, history: [], seenIntro: true, lastTick: 0,
      closest: null, hedefler: {}, esik: {},
    };
  }

  afterEach(() => { document.body.innerHTML = ''; });

  it('nişan yalnız eşikteki kart için çizilir', () => {
    kur();
    expect(kkEsikNisanHTML(CARD)).toBe('');
    kkEsikAc(CARD, { skor: 60 });
    const html = kkEsikNisanHTML(CARD);
    expect(html).toContain('kk-esik-nisan');
    expect(html).toContain('EŞİKTE');
  });

  it('mühürlenen kartın nişanı düşer', () => {
    kur();
    kkEsikAc(CARD, { skor: 60 });
    kkMuhurle(CARD, { yol: 'sinama' });
    expect(kkEsikNisanHTML(CARD)).toBe('');
  });

  it('KİŞİLER ekranı: eşikteki kart nişan taşır, öneri bloğu rafa döner', () => {
    kur();
    document.body.innerHTML = '<div id="arketipler-body"></div>';
    kkEsikAc(CARD, { skor: 92 });
    loadKisilerView();
    const body = document.getElementById('arketipler-body');
    // Raf modu: Wanderer kendi gördüğünü söyler, Emre'nin curated imzası düşer
    const raf = body.querySelector('.kk-emre--raf');
    expect(raf).toBeTruthy();
    expect(raf.querySelector('.kk-emre-auth')).toBeNull();
    // Nişan mevcut yüzeyde yaşar (K9: yeni şerit yok)
    expect(body.querySelector('.kk-grid-cell--locked.is-esikte')).toBeTruthy();
    expect(body.querySelectorAll('.kk-esik-nisan').length).toBeGreaterThan(0);
  });

  it('havuz boşken öneri bloğu Emre\'nin curated önerisinde kalır', () => {
    kur();
    document.body.innerHTML = '<div id="arketipler-body"></div>';
    loadKisilerView();
    const body = document.getElementById('arketipler-body');
    expect(body.querySelector('.kk-emre--raf')).toBeNull();
    expect(body.querySelector('.kk-esik-nisan')).toBeNull();
  });

  /* Haftanın gündemi (K7) 2026-08-10'da öneriye YEDİRİLDİ: kendi kutusu yok,
     bloğun başlığının altında bir bağlam şeridi olarak yaşıyor. */
  it('gündem öneri bloğunun İÇİNDE bir şerittir — ayrı kutu değil', () => {
    kur();
    document.body.innerHTML = '<div id="arketipler-body"></div>';
    loadKisilerView();
    const body = document.getElementById('arketipler-body');
    const serit = body.querySelector('.kk-emre-donem');
    expect(serit).toBeTruthy();
    expect(serit.closest('.kk-emre')).toBeTruthy();            // öneri bloğunun içinde
    expect(serit.previousElementSibling.className).toBe('kk-emre-head');
    expect(serit.querySelector('.kk-emre-donem-k').textContent).toBe('BU HAFTANIN GÜNDEMİ');
    expect(serit.querySelector('.kk-emre-donem-v').textContent.trim()).toBeTruthy();
    // Eski ev (Bugün'ün destelerinin üstündeki kutu) geride kalmadı
    expect(body.querySelector('.kkb-donem')).toBeNull();
  });

  it('gündemin somut yüzü blokta zaten duruyorsa ikinci kez YAZILMAZ', () => {
    kur();
    document.body.innerHTML = '<div id="arketipler-body"></div>';
    loadKisilerView();
    const body = document.getElementById('arketipler-body');
    const blok = body.querySelector('.kk-emre');
    const gundemKart = blok.querySelector('.kk-emre-donem-c');
    if (gundemKart) {
      // Ana kart + rotanın işaretçileri: gündem bunların hiçbirini tekrar etmez
      const gorunen = [blok.querySelector('.kk-emre-main').dataset.open]
        .concat([...blok.querySelectorAll('.kk-emre-ptr')].map(b => b.dataset.open));
      expect(gorunen).not.toContain(gundemKart.dataset.open);
    }
  });

  it('gündem verisi yoksa şerit hiç çizilmez (sessiz düşüş)', () => {
    kur();
    S._kisiKarti.donem = { weekKey: kkDonemHafta(), virtue: null, cardId: null };
    document.body.innerHTML = '<div id="arketipler-body"></div>';
    loadKisilerView();
    const body = document.getElementById('arketipler-body');
    expect(body.querySelector('.kk-emre')).toBeTruthy();        // blok ayakta
    expect(body.querySelector('.kk-emre-donem')).toBeNull();    // şerit yok
  });

  // Tanıma Motoru (FAZ 2, İ2) — spotlight/Emre bloğu günde 1 gösterim kaydı.
  it('loadKisilerView render anında omKaydetGosterim çağırır (emre + spotlight)', () => {
    kur();
    document.body.innerHTML = '<div id="arketipler-body"></div>';
    const spy = vi.fn();
    window.omKaydetGosterim = spy;
    loadKisilerView();
    const turler = spy.mock.calls.map(c => c[0]);
    expect(turler).toContain('emre');
    expect(turler.length).toBeGreaterThan(0);
    delete window.omKaydetGosterim;
  });
});

/* ─── Tanıma Motoru (FAZ 5, İ4+İ5) — sıra seçiciden, kazanım/seçim K2 ─────
   Fallback (seçici tanımsız/boş) EN ÖNEMLİ senaryodur (plan ## Doğrulama
   4+8): mevcut kkOneriRafi/kkScoreAndSort sırası BİREBİR korunmalı.
   Seçici GERÇEKTEN çağrıldığında sırayı DEĞİŞTİRDİĞİ de ayrıca kanıtlanır
   (id-bazlı kontrollü mock — 09i'nin skor formülü kendi test dosyasında
   zaten kapsandı, burada yalnız 10q'nun DELEGASYONU sınanır). ───────────── */
describe('Tanıma Motoru (FAZ 5) — Emre rafı sırası seçiciden, K2 fallback', () => {
  const CARD_A = 'temel-ozsevgi-filiz';  // eşik skoru 60 — baseline'da 1.
  const CARD_B = 'temel-ozsevgi-kok';    // eşik skoru 55 — baseline'da 2.
  const CARD_C = 'temel-ozsaygi-filiz';  // eşik skoru 50 — baseline'da 3.

  function kur() {
    S._kisiKarti = {
      profile: { dusunceler: 0, inanclar: 0, hisler: 0, davranislar: 0, updatedAt: null },
      collection: {}, history: [], seenIntro: true, lastTick: 0,
      closest: null, hedefler: {}, esik: {},
    };
    kkEsikAc(CARD_A, { skor: 60 });
    kkEsikAc(CARD_B, { skor: 55 });
    kkEsikAc(CARD_C, { skor: 50 });
    document.body.innerHTML = '<div id="arketipler-body"></div>';
  }

  afterEach(() => {
    document.body.innerHTML = '';
    delete window.secGirdiTopla; delete window.secAday; delete window.secSirala;
  });

  it('seçici tanımsızken raf, kkOneriRafi\'nin kendi (skor) sırasıyla AYNI kalır (K2 fallback)', () => {
    kur();
    loadKisilerView();
    const body = document.getElementById('arketipler-body');
    const rafIds = [body.querySelector('.kk-emre-main').dataset.open,
      ...Array.from(body.querySelectorAll('.kk-emre-ptr')).map(b => b.dataset.open)];
    expect(rafIds).toEqual([CARD_A, CARD_B, CARD_C]);
  });

  it('secSirala BOŞ liste dönerse (kanıtsız kullanıcı) raf AYNEN kalır (fallback)', () => {
    kur();
    window.secGirdiTopla = (tur, id, ek) => ek;
    window.secAday = () => null;   // hiçbir aday kanıt kapısını geçemedi
    window.secSirala = () => [];
    loadKisilerView();
    const body = document.getElementById('arketipler-body');
    expect(body.querySelector('.kk-emre-main').dataset.open).toBe(CARD_A);
  });

  it('secSirala gerçek bir sıra dönerse raf o sırayı YANSITIR (delegasyon kanıtı)', () => {
    kur();
    const skorTablosu = { [CARD_A]: 1, [CARD_B]: 3, [CARD_C]: 2 };
    window.secGirdiTopla = (tur, id, ek) => ek;
    window.secAday = (tur, id, g) => ({ tur, id, skor: skorTablosu[id] });
    window.secSirala = (adaylar) => [...adaylar].sort((a, b) => b.skor - a.skor);
    loadKisilerView();
    const body = document.getElementById('arketipler-body');
    const rafIds = [body.querySelector('.kk-emre-main').dataset.open,
      ...Array.from(body.querySelectorAll('.kk-emre-ptr')).map(b => b.dataset.open)];
    expect(rafIds).toEqual([CARD_B, CARD_C, CARD_A]);   // skor 3 > 2 > 1
  });
});

describe('Tanıma Motoru (FAZ 5) — spotlight sırası seçiciden, K2 fallback', () => {
  function kur() {
    S._kisiKarti = { profile: {}, collection: {}, history: [], pending: [], seenIntro: true, lastTick: 0, closest: null, esik: {} };
    document.body.innerHTML = '<div id="arketipler-body"></div>';
  }

  afterEach(() => {
    document.body.innerHTML = '';
    delete window.secGirdiTopla; delete window.secAday; delete window.secSirala;
  });

  it('seçici tanımsızken ve gerçek bir sıra döndüğünde spotlight FARKLI bir kartı öne çıkarır', () => {
    kur();
    loadKisilerView();
    const baselineTop = document.getElementById('arketipler-body').querySelector('.kk-spot')?.dataset.open;
    expect(baselineTop).toBeTruthy();
    document.body.innerHTML = '';

    kur();
    // Baseline'ın seçmediği VE Emre curated önerisinin pickId'si OLMAYAN bir
    // hedef seç — pickId spotPool'dan zaten dışlanır, mock'lansa da göremez.
    const target = getFullDeck().map(c => c.id).find(id => id !== baselineTop && id !== EMRE_ONERI.pickId);
    window.secGirdiTopla = (tur, id, ek) => ek;
    window.secAday = (tur, id, g) => ({ tur, id, skor: id === target ? 9999 : 1 });
    window.secSirala = (adaylar) => [...adaylar].sort((a, b) => b.skor - a.skor);
    loadKisilerView();
    const mockedTop = document.getElementById('arketipler-body').querySelector('.kk-spot')?.dataset.open;

    expect(mockedTop).toBe(target);
    expect(mockedTop).not.toBe(baselineTop);
  });
});

describe('Tanıma Motoru (FAZ 6) — keşif yuvası: uğranmamış erdemin sondajı', () => {
  // Destede en çok kartı olan erdem hedef seçilir: spotlight/Emre dedup'ı bir
  // kart götürse bile havuz boşalmasın (tek kartlı erdemde yuva kaybolurdu).
  function enKalabalikErdem() {
    const sayim = {};
    for (const c of getFullDeck()) if (c.virtue) sayim[c.virtue] = (sayim[c.virtue] || 0) + 1;
    return Object.keys(sayim).sort((a, b) => (sayim[b] - sayim[a]) || a.localeCompare(b))[0];
  }
  const erdemler = () => [...new Set(getFullDeck().map(c => c.virtue).filter(Boolean))];
  /** Erdem vektörü kurucusu: `dip` erdemi verilen değerde, geri kalan hepsi doygun. */
  const vektor = (dip, deger) => Object.fromEntries(erdemler().map(v => [v, v === dip ? deger : 90]));

  function kur() {
    S._kisiKarti = { profile: {}, collection: {}, history: [], pending: [], seenIntro: true, lastTick: 0, closest: null, esik: {} };
    document.body.innerHTML = '<div id="arketipler-body"></div>';
    window.czDaily = () => () => 0;   // deterministik zar: havuzun ilk kartı
  }

  afterEach(() => {
    document.body.innerHTML = '';
    delete window.czDaily; delete window.imVirtueNow;
    vi.useRealTimers();
  });

  const yuva = () => document.getElementById('arketipler-body').querySelector('.cz-bugun-kisi');

  it('sondaj gün gün döner: aynı yüz iki gün üst üste kurcalanmaz (rotasyon)', () => {
    const hepsiSifir = Object.fromEntries(erdemler().map(v => [v, 0]));
    expect(erdemler().length).toBeGreaterThan(1);   // rotasyonun ölçülebilmesi için
    // Yalnız Date sahte: rotasyon gün indeksinden okunur, zamanlayıcılar gerçek
    // kalsın (kkTick/stil ısıtması onlara dokunur).
    vi.useFakeTimers({ toFake: ['Date'] });
    const secilen = ['2026-08-10T09:00:00', '2026-08-11T09:00:00'].map(gun => {
      vi.setSystemTime(new Date(gun));
      kur();
      window.imVirtueNow = () => hepsiSifir;
      loadKisilerView();
      const erdem = getCardById(yuva().dataset.open).virtue;
      document.body.innerHTML = '';
      return erdem;
    });
    expect(secilen[0]).not.toBe(secilen[1]);
  });

  it('havuz, erdem vektöründe eşiğin ALTINDA kalan erdemin kartlarıyla sınırlanır', () => {
    kur();
    const hedef = enKalabalikErdem();
    window.imVirtueNow = () => vektor(hedef, 0);
    loadKisilerView();
    const el = yuva();
    expect(el).toBeTruthy();
    expect(getCardById(el.dataset.open).virtue).toBe(hedef);
  });

  it('keşif modunda hazırlık çubuğu SUSAR, yerine davet gelir (K6 — yuva değer iddia etmez)', () => {
    kur();
    window.imVirtueNow = () => vektor(enKalabalikErdem(), 0);
    loadKisilerView();
    const el = yuva();
    expect(el.querySelector('.kk-spot-bar')).toBeNull();
    expect(el.querySelector('.cz-bk-davet')?.textContent.trim()).toBeTruthy();
  });

  it('davet ölçüme sadıktır: hiç uğranmamış erdemle seyrek uğranmış erdem AYNI cümleyi kurmaz', () => {
    const hedef = enKalabalikErdem();
    kur();
    window.imVirtueNow = () => vektor(hedef, 0);
    loadKisilerView();
    const hic = yuva().querySelector('.cz-bk-davet').textContent.trim();

    document.body.innerHTML = '';
    kur();
    window.imVirtueNow = () => vektor(hedef, 10);   // 0 < 10 < KESIF_ESIK
    loadKisilerView();
    const seyrek = yuva().querySelector('.cz-bk-davet').textContent.trim();

    expect(hic).not.toBe(seyrek);
    expect(hic).toBeTruthy();
    expect(seyrek).toBeTruthy();
  });

  it('13l hidre değilken yuva eski uniform hâlinde kalır — çubuk geri gelir (K2: motor yoksa regresyon yok)', () => {
    kur();
    // imVirtueNow YOK
    loadKisilerView();
    const el = yuva();
    expect(el).toBeTruthy();
    expect(el.querySelector('.kk-spot-bar')).toBeTruthy();
    expect(el.querySelector('.cz-bk-davet')).toBeNull();
  });

  it('her yüze uğranmışsa (hepsi eşik üstü) sondaj kapanır — yuva uniform moda döner', () => {
    kur();
    window.imVirtueNow = () => Object.fromEntries(erdemler().map(v => [v, 90]));
    loadKisilerView();
    const el = yuva();
    expect(el).toBeTruthy();
    expect(el.querySelector('.cz-bk-davet')).toBeNull();
    expect(el.querySelector('.kk-spot-bar')).toBeTruthy();
  });

  it('yuva gösterildiğinde 09d gösterim defterine yazılır (İ2 sözleşmesi korunur)', () => {
    kur();
    const spy = vi.fn();
    window.omKaydetGosterim = spy;
    window.imVirtueNow = () => vektor(enKalabalikErdem(), 0);
    loadKisilerView();
    const el = yuva();
    expect(spy).toHaveBeenCalledWith('bugunun_kisisi', el.dataset.open);
    delete window.omKaydetGosterim;
  });
});

/* ═══ Tanıma Motoru (FAZ 7) — "Neden bu?" şeffaflık yüzeyi ══════════════
   K7'nin kapısı davranışsal olarak burada sınanır: söylenecek bir beyan ya
   da ölçüm yoksa giriş düğmesi HİÇ çizilmez (uydurma gerekçe yasak), keşif
   yuvasında ise yokluğun kendisi gerekçedir ve giriş görünür. */
describe('Tanıma Motoru (FAZ 7) — "Neden bu?" girişi ve K7 kapısı', () => {
  const UID = 'kk-neden-test-user';
  const KEY = `etw_secici_v1_${UID}`;
  const kart = () => getFullDeck()[0];

  function kur() {
    S.currentUser = { id: UID };
    S._kisiKarti = { profile: {}, collection: {}, history: [], pending: [], seenIntro: true, lastTick: 0, closest: null, esik: {} };
    S._oturumIzi = { ekranlar: [], kartlar: [], skipler: [], torenler: [] };
    document.body.innerHTML = '<div id="arketipler-body"></div>';
  }

  afterEach(() => {
    document.body.innerHTML = '';
    try { window.secBeyanGeriAl?.(kart().id); } catch (_) {}
    try { SafeStorage.remove(KEY); } catch (_) {}
    delete window.omGunSatiri;
  });

  it('sıfır kanıtlı kartta giriş HİÇ çizilmez (K7 — kanıtsız gerekçe yok)', () => {
    kur();
    expect(kkNedenGirisHTML('spotlight', kart().id)).toBe('');
  });

  it('eşiği olan kartta giriş çizilir ve tur/id taşır (beyan bir kökendir)', () => {
    kur();
    kkEsikAc(kart().id, { skor: 60 });
    const html = kkNedenGirisHTML('spotlight', kart().id);
    expect(html).toContain('data-neden="spotlight"');
    expect(html).toContain(`data-neden-id="${kart().id}"`);
  });

  it('keşif yuvasında giriş DAİMA çizilir — orada gerekçe kanıtın yokluğudur', () => {
    kur();
    const html = kkNedenGirisHTML('bugunun_kisisi', kart().id, 'sabir');
    expect(html).toContain('data-neden-kesif="sabir"');
  });

  it('var olmayan kartta giriş çizilmez (patlamaz)', () => {
    kur();
    expect(kkNedenGirisHTML('spotlight', 'yok-boyle-bir-kart')).toBe('');
  });

  it('panel eşik satırını BEYAN olarak yazar (kullanıcının kendi kararı, altın)', () => {
    kur();
    kkEsikAc(kart().id, { skor: 60 });
    kkNedenAc('spotlight', kart().id);
    const modal = document.getElementById('kk-neden-overlay');
    expect(modal).toBeTruthy();
    expect(modal.querySelector('.kk-neden-satir--beyan')).toBeTruthy();
    modal.remove();
  });

  it('sınama alıntısı varsa panel kullanıcının KENDİ cümlesini gösterir (10q4 zinciri)', () => {
    kur();
    kkEsikAc(kart().id, { skor: 60 });
    S._kisiKarti.esik[kart().id].sinav = {
      at: new Date().toISOString(), gecti: true, eksik: null,
      alintilar: { hisler: 'O gün korktuğumu söyleyebildim.' },
    };
    kkNedenAc('spotlight', kart().id);
    const modal = document.getElementById('kk-neden-overlay');
    const q = modal.querySelector('.kk-neden-alinti-q');
    expect(q).toBeTruthy();
    expect(q.textContent).toContain('O gün korktuğumu söyleyebildim.');
    // Yorum satırı ALINTIYA bağlıdır — alıntıyla birlikte doğar
    expect(modal.querySelector('.kk-neden-yorum')).toBeTruthy();
    modal.remove();
  });

  it('alıntı yoksa yorum satırı da yoktur (yorum kanıtsız doğmaz)', () => {
    kur();
    kkEsikAc(kart().id, { skor: 60 });
    kkNedenAc('spotlight', kart().id);
    const modal = document.getElementById('kk-neden-overlay');
    expect(modal.querySelector('.kk-neden-alinti-q')).toBeNull();
    expect(modal.querySelector('.kk-neden-yorum')).toBeNull();
    modal.remove();
  });

  it('"Daha az göster" beyanı yazar; panel yeniden açılınca "Yine göster" gösterir', () => {
    kur();
    kkEsikAc(kart().id, { skor: 60 });
    kkNedenAc('spotlight', kart().id);
    document.getElementById('kk-neden-overlay').querySelector('[data-act="azalt"]').click();
    expect(window.secBeyanVar(kart().id)).toBe(true);
    expect(document.getElementById('kk-neden-overlay')).toBeNull();   // panel kapanır

    kkNedenAc('spotlight', kart().id);
    const modal = document.getElementById('kk-neden-overlay');
    expect(modal.querySelector('[data-act="geri"]')).toBeTruthy();
    expect(modal.querySelector('[data-act="azalt"]')).toBeNull();
    modal.querySelector('[data-act="geri"]').click();
    expect(window.secBeyanVar(kart().id)).toBe(false);
  });

  it('susturulan kart spotlight havuzuna girmez (beyan seçiciyi ezer)', () => {
    kur();
    loadKisilerView();
    const once = document.getElementById('arketipler-body').querySelector('.kk-spot')?.dataset.open;
    expect(once).toBeTruthy();

    window.secBeyanAzalt('spotlight', once);
    loadKisilerView();
    const sonra = document.getElementById('arketipler-body').querySelector('.kk-spot')?.dataset.open;
    expect(sonra).not.toBe(once);
    window.secBeyanGeriAl(once);
  });

  it('geri çağrı (13o) paneli kart olmadan da açılır — gerekçesi sessizliğin ölçümü', () => {
    kur();
    const html = kkNedenGirisHTML('geri-cagri', 'gc-davet');
    expect(html).toContain('data-neden="geri-cagri"');
    kkNedenAc('geri-cagri', 'gc-davet');
    const modal = document.getElementById('kk-neden-overlay');
    expect(modal.querySelectorAll('.kk-neden-satir--olcum').length).toBeGreaterThan(0);
    modal.remove();
  });
});
