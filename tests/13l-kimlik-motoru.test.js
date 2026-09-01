/**
 * Tests for js/parts/13l-kimlik-motoru.js — Kimlik Motoru ("Olduğun Kişi").
 *
 * Kapsam: imVirtueNow() zaman-azalmalı erdem vektörü (7 gün yarı ömür, 30 gün
 * kesme), imEvent/imObserve olay defteri + sayaç-delta gözlemcisi (ilk taban
 * SESSİZ alınır, azalış tabanı yeniler olay saymaz), imRecentMoves önem×sıklık
 * sıralaması, imResolve HİSTEREZİS çözücü (18 saat tutma + 8 puan fark şartı,
 * hidrasyon-yarışı koruması), imSetPersona/imOnCardEarned/imIsCurrentPersona.
 *
 * 10q (kkComputeSignals/kkMatchCard) ve 12b (getCardById/getFullDeck) TAM mock'lanır
 * — imResolve'un skor girdilerini test tam kontrol edebilsin diye.
 */
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

const _cards = {};
function setCard(id, card) { _cards[id] = { id, ...card }; }

vi.mock('../js/parts/10q-w2-kisi-karti.js', () => ({
  kkComputeSignals: vi.fn(() => ({})),
  kkMatchCard: vi.fn((card) => ({ score: card.__score ?? 0 })),
  kkRenderCard3D: vi.fn(() => '<div class="mock-card"></div>'),
  kkOpenDetail: vi.fn(),
  kkBindTilt: vi.fn(),
}));
vi.mock('../js/parts/12b-kart-destesi.js', () => ({
  getCardById: vi.fn((id) => _cards[id] || null),
  getFullDeck: vi.fn(() => Object.values(_cards)),
  RARITIES: {
    yaygin: { id: 'yaygin', label: 'YAYGIN', order: 0, color: '#9a8f7a' },
    nadir:  { id: 'nadir',  label: 'NADİR',  order: 1, color: '#7fb0c8' },
  },
}));

import { S } from '../js/state.js';
import {
  imEvent, imVirtueNow, imRecentMoves, imResolve, imSetPersona,
  imOnCardEarned, imIsCurrentPersona, imGetCurrent, imInit, IM_TAXONOMY,
} from '../js/parts/13l-kimlik-motoru.js';

function resetState() {
  S.currentUser = { id: 'im-test-user' };
  S._kimlik = { ledger: [], base: {}, currentPersonaId: null, personaSince: null, personaHistory: [], seeded: true, lastTick: 0 };
  S._kisiKarti = { collection: {} };
  S._currentLang = 'tr';
  for (const k of Object.keys(_cards)) delete _cards[k];
}

beforeEach(() => {
  resetState();
});

describe('imEvent — olay defteri', () => {
  it('bilinmeyen tip sessizce yok sayılır (ledger değişmez)', () => {
    imEvent('olmayan_tip');
    expect(S._kimlik.ledger.length).toBe(0);
  });

  it('tanınan tip deftere yazar (ağırlık taksonomiden gelir)', () => {
    imEvent('soz_tutuldu');
    expect(S._kimlik.ledger.length).toBe(1);
    expect(S._kimlik.ledger[0].type).toBe('soz_tutuldu');
    expect(S._kimlik.ledger[0].w).toBe(13);
  });

  it('tek seferde en fazla 3 olay yazar (sel önleyici)', () => {
    imEvent('soz_tutuldu', 10);
    expect(S._kimlik.ledger.length).toBe(3);
  });
});

describe('imVirtueNow — zaman-azalmalı erdem vektörü', () => {
  it('boş defterde tüm erdemler 0', () => {
    const v = imVirtueNow();
    expect(v.durust).toBe(0);
    expect(v.sebat).toBe(0);
  });

  it('taze bir olay ilgili erdemleri yükseltir', () => {
    // soz_tutuldu: sebat .5, durust .3, ozsaygi .2 (w=13)
    S._kimlik.ledger.push({ t: Date.now(), type: 'soz_tutuldu', w: 13 });
    const v = imVirtueNow();
    expect(v.sebat).toBeGreaterThan(0);
    expect(v.durust).toBeGreaterThan(0);
    expect(v.niyet).toBe(0); // bu olayın beslemediği erdem
  });

  it('30 günden eski olay etkisiz sayılır', () => {
    S._kimlik.ledger.push({ t: Date.now() - 31 * 86400000, type: 'soz_tutuldu', w: 13 });
    const v = imVirtueNow();
    expect(v.sebat).toBe(0);
  });

  it('7 gün önceki olay (bir yarı ömür), daha az etkili olur ama sıfır değildir', () => {
    S._kimlik.ledger.push({ t: Date.now(), type: 'soz_tutuldu', w: 13 });
    const vFresh = imVirtueNow();
    S._kimlik.ledger = [{ t: Date.now() - 7 * 86400000, type: 'soz_tutuldu', w: 13 }];
    const vAged = imVirtueNow();
    expect(vAged.sebat).toBeGreaterThan(0);
    expect(vAged.sebat).toBeLessThan(vFresh.sebat);
  });

  it('tekrarlanan olaylar erdemi birikimli artırır (doyum eğrisiyle sınırlı 0-100)', () => {
    for (let i = 0; i < 20; i++) S._kimlik.ledger.push({ t: Date.now(), type: 'soz_tutuldu', w: 13 });
    const v = imVirtueNow();
    expect(v.sebat).toBeGreaterThan(0);
    expect(v.sebat).toBeLessThanOrEqual(100);
  });

  // Tanıma Motoru K5 (2026-08-09): çürüme formülü 00a-infrastructure.js'in
  // zamanAgirligi() yardımcısına TAŞINDI (09i-secici.js de aynısını kullanır).
  // Bu ikisi KESİN sayı bekler — refaktörün davranışı birebir koruduğunu
  // "aynı girdi, aynı çıktı" ile sabitler (soz_tutuldu: w=13, sebat payı .5,
  // VIRTUE_SAT_K=20 → raw=13*decay*.5, out=round(100*raw/(raw+20))).
  it('çürüme formülü TAŞINDIKTAN SONRA da kesin aynı sayıyı üretir (davranış birebir)', () => {
    S._kimlik.ledger = [{ t: Date.now(), type: 'soz_tutuldu', w: 13 }];
    expect(imVirtueNow().sebat).toBe(25); // decay=1 → raw=6.5 → round(100*6.5/26.5)=25

    S._kimlik.ledger = [{ t: Date.now() - 7 * 86400000, type: 'soz_tutuldu', w: 13 }];
    expect(imVirtueNow().sebat).toBe(14); // decay=0.5 (bir yarı ömür) → raw=3.25 → round(100*3.25/23.25)=14
  });
});

describe('imRecentMoves — önem × sıklık sıralaması', () => {
  it('7 günden eski olaylar sayılmaz', () => {
    S._kimlik.ledger.push({ t: Date.now() - 8 * 86400000, type: 'soz_tutuldu' });
    expect(imRecentMoves(7).length).toBe(0);
  });

  it('yüksek-önem az-tekrar, düşük-önem çok-tekrarı geçebilir (w×n sıralaması)', () => {
    // butunlesme: w=14 (tier1) — tek başına; sohbet_mesaji: w=2 (tier3) — 5 kez = 10 < 14
    S._kimlik.ledger.push({ t: Date.now(), type: 'butunlesme' });
    for (let i = 0; i < 5; i++) S._kimlik.ledger.push({ t: Date.now(), type: 'sohbet_mesaji' });
    const moves = imRecentMoves(7, 4);
    expect(moves[0].type).toBe('butunlesme');
  });

  it('max parametresi sonuç sayısını sınırlar', () => {
    IM_TAXONOMY.slice(0, 5).forEach(tx => S._kimlik.ledger.push({ t: Date.now(), type: tx.type }));
    expect(imRecentMoves(7, 2).length).toBe(2);
  });
});

describe('imSetPersona / imGetCurrent / imIsCurrentPersona', () => {
  it('geçerli kart id\'siyle kimliği devreder ve geçmişe yazar', () => {
    setCard('kart-a', { name: 'Sebatkâr', virtue: 'sebat', rarity: 'yaygin', glyph: '◆' });
    imSetPersona('kart-a', 'earn');
    expect(imIsCurrentPersona('kart-a')).toBe(true);
    expect(imGetCurrent().cardId).toBe('kart-a');
    expect(S._kimlik.personaHistory.length).toBe(1);
    expect(S._kimlik.personaHistory[0].via).toBe('earn');
  });

  it('olmayan kart id\'si sessizce no-op', () => {
    imSetPersona('yok-boyle-kart', 'earn');
    expect(imGetCurrent()).toBeNull();
  });

  it('aynı kart tekrar set edilirse personaHistory\'ye ikinci kayıt eklenmez', () => {
    setCard('kart-a', { name: 'Sebatkâr', virtue: 'sebat', rarity: 'yaygin', glyph: '◆' });
    imSetPersona('kart-a', 'earn');
    imSetPersona('kart-a', 'earn');
    expect(S._kimlik.personaHistory.length).toBe(1);
  });
});

describe('imOnCardEarned — motor hazır değilken kuyruğa alma', () => {
  it('_imInited false iken (imInit hiç çağrılmadı) kazanım kaybolmadan beklemede kalır', () => {
    // Bu test dosyasında imInit() hiç çağrılmadı → _imInited=false.
    setCard('kart-b', { name: 'Test Kart', virtue: 'niyet', rarity: 'yaygin', glyph: '◆' });
    expect(() => imOnCardEarned('kart-b', false)).not.toThrow();
    // Motor başlamadığından persona hâlâ set edilmemiştir (kuyruğa alındı, kaybolmadı)
    expect(imGetCurrent()).toBeNull();
  });
});

describe('imResolve — histerezis çözücü (motor hazır değilken)', () => {
  it('_imInited false iken (imInit çağrılmadı) her zaman changed:false döner', () => {
    setCard('kart-a', { name: 'A', virtue: 'sebat', rarity: 'yaygin', glyph: '◆', __score: 90 });
    S._kisiKarti.collection = { 'kart-a': { earnedAt: new Date().toISOString() } };
    const r = imResolve();
    expect(r.changed).toBe(false);
    expect(r.current).toBeNull();
  });
});

describe('imResolve — histerezis çözücü (motor aktif)', () => {
  beforeAll(async () => {
    await imInit(); // _imInited kalıcı true olur; sonraki testler resetState ile veri sıfırlar
  });

  it('kart yoksa (sahiplik boş) changed:false', () => {
    S._kisiKarti.collection = {};
    const r = imResolve();
    expect(r.changed).toBe(false);
    expect(r.current).toBeNull();
  });

  it('deste henüz inmediyse (getFullDeck boş) hüküm vermez', () => {
    S._kisiKarti.collection = { 'kart-yok': { earnedAt: new Date().toISOString() } };
    // _cards boş bırakıldı (resetState) → getFullDeck() = []
    const r = imResolve();
    expect(r.changed).toBe(false);
  });

  it('ilk çözümde (currentPersonaId yok) en yüksek skorlu sahip kart kimlik olur', () => {
    setCard('dusuk', { name: 'Düşük', virtue: 'sebat', rarity: 'yaygin', glyph: '◆', __score: 30 });
    setCard('yuksek', { name: 'Yüksek', virtue: 'niyet', rarity: 'yaygin', glyph: '◆', __score: 80 });
    S._kisiKarti.collection = {
      dusuk:  { earnedAt: new Date().toISOString() },
      yuksek: { earnedAt: new Date().toISOString() },
    };
    const r = imResolve();
    expect(r.changed).toBe(true);
    expect(r.current.cardId).toBe('yuksek');
    expect(imGetCurrent().cardId).toBe('yuksek');
  });

  it('mevcut kimlikle aynı en iyi skor çıkarsa değişmez (changed:false)', () => {
    setCard('ayni', { name: 'Aynı', virtue: 'sebat', rarity: 'yaygin', glyph: '◆', __score: 50 });
    S._kisiKarti.collection = { ayni: { earnedAt: new Date().toISOString() } };
    S._kimlik.currentPersonaId = 'ayni';
    S._kimlik.personaSince = new Date().toISOString();
    const r = imResolve();
    expect(r.changed).toBe(false);
    expect(r.current.cardId).toBe('ayni');
  });

  it('histerezis: tutma süresi DOLMADIYSA (18 saatten az) daha yüksek skorlu rakip bile kimliği devirmez', () => {
    setCard('eski', { name: 'Eski', virtue: 'sebat', rarity: 'yaygin', glyph: '◆', __score: 50 });
    setCard('yeni', { name: 'Yeni', virtue: 'niyet', rarity: 'yaygin', glyph: '◆', __score: 90 }); // fark 40 >> 8
    S._kisiKarti.collection = {
      eski: { earnedAt: new Date().toISOString() },
      yeni: { earnedAt: new Date().toISOString() },
    };
    S._kimlik.currentPersonaId = 'eski';
    S._kimlik.personaSince = new Date().toISOString(); // az önce (< 18 saat)
    const r = imResolve();
    expect(r.changed).toBe(false);
    expect(imGetCurrent().cardId).toBe('eski');
  });

  it('histerezis: tutma süresi DOLDU ama fark 8 puandan azsa yine devirmez', () => {
    setCard('eski', { name: 'Eski', virtue: 'sebat', rarity: 'yaygin', glyph: '◆', __score: 50 });
    setCard('yakin', { name: 'Yakın', virtue: 'niyet', rarity: 'yaygin', glyph: '◆', __score: 55 }); // fark 5 < 8
    S._kisiKarti.collection = {
      eski:  { earnedAt: new Date().toISOString() },
      yakin: { earnedAt: new Date().toISOString() },
    };
    S._kimlik.currentPersonaId = 'eski';
    S._kimlik.personaSince = new Date(Date.now() - 19 * 3600000).toISOString(); // 19 saat önce
    const r = imResolve();
    expect(r.changed).toBe(false);
    expect(imGetCurrent().cardId).toBe('eski');
  });

  it('histerezis: tutma süresi DOLDU ve fark >= 8 puansa kimlik devreder', () => {
    // imNowScore = 0.45×kkMatchCard.score + 0.55×erdem + fresh — ham __score farkı
    // 0.45 ile ölçeklenir; 8 puanlık nihai farkı garantilemek için ham farkı büyük tutuyoruz.
    setCard('eski', { name: 'Eski', virtue: 'sebat', rarity: 'yaygin', glyph: '◆', __score: 20 });
    setCard('yeni', { name: 'Yeni', virtue: 'niyet', rarity: 'yaygin', glyph: '◆', __score: 80 }); // ham fark 60 → nihai fark ~27
    S._kisiKarti.collection = {
      eski: { earnedAt: new Date().toISOString() },
      yeni: { earnedAt: new Date().toISOString() },
    };
    S._kimlik.currentPersonaId = 'eski';
    S._kimlik.personaSince = new Date(Date.now() - 19 * 3600000).toISOString(); // 19 saat önce
    const r = imResolve();
    expect(r.changed).toBe(true);
    expect(r.current.cardId).toBe('yeni');
    expect(imGetCurrent().cardId).toBe('yeni');
  });

  it('hidrasyon-yarışı koruması: mevcut kimlik koleksiyonda geçersizse ve boot\'tan az önce geçtiyse çözüm ertelenir', () => {
    setCard('yeni-sahip', { name: 'Yeni Sahip', virtue: 'niyet', rarity: 'yaygin', glyph: '◆', __score: 70 });
    S._kisiKarti.collection = { 'yeni-sahip': { earnedAt: new Date().toISOString() } };
    S._kimlik.currentPersonaId = 'artik-yok'; // koleksiyonda yok → curValid=false
    // imInit beforeAll'da çok yakın zamanda çağrıldığı için _imBootAt "şimdi"ye
    // yakındır; guard curId dolu + boot<30sn koşulunu tetikler → ertelenir.
    const r = imResolve();
    expect(r.changed).toBe(false);
    expect(r.current).toBeNull();
  });
});

describe('olus_beyani — Oluş Mührü taksonomi girişi', () => {
  const tx = () => IM_TAXONOMY.find(x => x.type === 'olus_beyani');

  it('taksonomide sayaçlı bir giriş olarak yaşar (imEvent doğrudan çağrılmaz)', () => {
    const t = tx();
    expect(t).toBeTruthy();
    expect(t.tier).toBe(2);
    expect(typeof t.counter).toBe('function');
    expect(t.w).toBeGreaterThan(0);
  });

  it('erdem payları taksonominin ortak erdem kümesinden gelir ve 1.0 eder', () => {
    const bilinen = new Set(IM_TAXONOMY.flatMap(x => Object.keys(x.virtues || {})));
    const v = tx().virtues;
    for (const k of Object.keys(v)) expect(bilinen.has(k)).toBe(true);
    expect(Object.values(v).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });

  it('sayaç yalnız beyanla mühürlenen kartları görür', () => {
    S._kisiKarti.collection = {};
    expect(tx().counter()).toBe(0);
    S._kisiKarti.collection['a'] = { earnedAt: 'x', muhur: { at: 'x', yol: 'davet' } };
    S._kisiKarti.collection['b'] = { earnedAt: 'x', muhur: { at: 'x', yol: 'sinama' } };
    expect(tx().counter()).toBe(2);
  });

  it('miras kayıtlar (muhur alanı YOK) sayılmaz — geriye dönük kimlik devri olmaz', () => {
    S._kisiKarti.collection = {
      eski1: { earnedAt: '2026-01-01T00:00:00.000Z', rarity: 'yaygin' },
      eski2: { earnedAt: '2026-02-01T00:00:00.000Z', rarity: 'nadir' },
      yeni:  { earnedAt: 'x', muhur: { at: 'x', yol: 'davet' } },
    };
    expect(tx().counter()).toBe(1);
  });

  it('koleksiyon yoksa sayaç güvenle 0 döner', () => {
    delete S._kisiKarti;
    expect(tx().counter()).toBe(0);
  });
});
