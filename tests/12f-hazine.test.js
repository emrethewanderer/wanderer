/**
 * Tests for js/parts/12f-hazine-paketleri.js — Hazine Destesi (FAZ 1: veri + motor)
 *
 *   - İçerik: 9 set, her set en az 1 taç kart + ≥1 satılabilir kart (Işık Kanonu hariç)
 *   - Her karta sahne reçetesi atanır (kumHeuristicSpec entegrasyonu)
 *   - hzDrawPack: taç kartlar ve satılamaz setler havuza asla girmez
 *   - Pity: HZ_PITY_NADIDE / HZ_PITY_EFSANE eşiğinde garanti kademe
 *   - hzApplyDraw: yeni kazanım / dupe→holo yükseltme / holo dupe→iade
 *   - hzDetectSetCompletion: idempotent (bir kez completedAt yazar)
 *   - hzAyetCursorNext: deterministik sıra, RNG'siz, kanon tükenince null
 *   - hzWeekKey: pazartesi tabanlı, hafta sınırında değişir
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

import {
  hazineReady, getHazineSetler, getHazineKartById, getHazineKartlarBySet, getHazineTacKart,
  hzState, hzSaveState, hzOwnedCount,
  hzWeightedRarityPick, hzDrawPack, hzApplyDraw, hzDetectSetCompletion,
  hzAyetCursorNext, hzWeekKey, hzBuyPack,
  hzSetCeremony, hzGrantSetBonus, hzRetryPendingBonuses, hzMaybeWeeklyGift,
  HZ_SET_MANIFEST, HZ_WEIGHTS, HZ_PITY_NADIDE, HZ_PITY_EFSANE, HZ_PACK_SIZE, HZ_DUPE_REFUND, HZ_PACK_COST, HZ_SET_BONUS_ELMAS,
} from '../js/parts/12f-hazine-paketleri.js';
import { ikvNormSpec } from '../js/parts/12c-kart-gorsel.js';
import { kkEnsureStyles } from '../js/parts/10q-w2-kisi-karti.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';
import { sb } from '../js/config.js';
import { S } from '../js/state.js';

beforeAll(async () => {
  await hazineReady();
  // jsdom'un CSS parse'ı pahalıdır ve kkEnsureStyles devasa bir JS-enjekte
  // stil bloğu asar. Bu maliyet hzOpenPack'in İLK çağrısında, yani ilk
  // hzBuyPack testinin içinde ödeniyordu; makine yüklüyken tek başına
  // saniyeler alıp testi zaman aşımına düşürüyordu. Ölçüm (aynı makine,
  // arka arkaya 3 koşu): ısıtmasız 5741/5368/6247 ms → ısıtmalı
  // 1183/1591/1135 ms. Isıtmayı kuruluma alıyoruz ki testler kendi işlerini
  // ölçsün, jsdom'un stil çözümleyicisini değil.
  kkEnsureStyles();
}, 30000);

beforeEach(() => {
  // Tören zamanlayıcıları GERÇEK zamanda testler arasına taşardı: hzOpenPack
  // 2600 ms'lik oto-açılışı ve flip kaskadını, hzMaybeWeeklyGift 400/1300 ms
  // gecikmeli set törenini kurar. Paralel yük altında iki test arasında bu
  // süreler dolunca sonraki testin DOM'una ve Elmas bakiyesine yazıyorlardı.
  // Sahte zamanda hiçbiri kendiliğinden ateşlenmez; afterEach hepsini atar.
  // Date BİLİNÇLİ sahtelenmez — hzWeekKey ve earnedAt gerçek takvimle çalışır.
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  // SafeStorage okur/yazar önce bellek-içi _kvCache'ten (bkz. 00a-infrastructure.js) —
  // localStorage.clear() bunu temizlemez; anahtarı doğrudan sıfırlamak gerekir
  // (12e-isik.test.js emsali).
  S.currentUser = null;
  SafeStorage.set('etw_hazine_v1_anon', null);
  SafeStorage.set('etw_wanderer_game_v1_anon', null);
  S._wandererGame = { elmas: 0 };
  // Önceki testten açık kalmış bir tören varsa gerçek "TOPLA" tıklamasıyla
  // kapat — bu, closure içindeki modül-private `_hzPackOpen` bayrağını da
  // sıfırlar (dışarıdan erişilemez; tek temiz yol gerçek kullanıcı akışı).
  document.getElementById('hz-pack-collect')?.click();
  document.getElementById('hz-pack-portal')?.remove();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

/* ── seeded, deterministic rand — sabit dizi döngüsü ─────────────────── */
function seqRand(seq) {
  let i = 0;
  return () => seq[(i++) % seq.length];
}

describe('içerik bütünlüğü', () => {
  it('9 set tanımlı, HZ_SET_MANIFEST ile aynı id kümesi', () => {
    const setler = getHazineSetler();
    expect(setler.length).toBe(9);
    expect(setler.map(s => s.id).sort()).toEqual(HZ_SET_MANIFEST.map(s => s.id).sort());
  });

  it('her set için: 1 taç kart + Işık Kanonu hariç en az 1 satılabilir kart', () => {
    for (const s of getHazineSetler()) {
      const tac = getHazineTacKart(s.id);
      expect(tac, `${s.id} taç kartı eksik`).toBeTruthy();
      expect(tac.tac).toBe(true);
      const satilabilir = getHazineKartlarBySet(s.id, { excludeTac: true });
      expect(satilabilir.length, `${s.id} satılabilir kart yok`).toBeGreaterThan(0);
    }
  });

  it('Işık Kanonu satılamaz olarak işaretli', () => {
    const isik = getHazineSetler().find(s => s.id === 'isik_kanonu');
    expect(isik.satilamaz).toBe(true);
  });

  it('tüm kart id\'leri benzersiz', () => {
    const ids = getHazineSetler().flatMap(s => getHazineKartlarBySet(s.id).map(c => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('her karta geçerli bir sahne reçetesi atanmış', () => {
    for (const s of getHazineSetler()) {
      for (const c of getHazineKartlarBySet(s.id)) {
        expect(c.sahne, `${c.id} sahnesiz`).toBeTruthy();
        expect(c.sahne).toEqual(ikvNormSpec(c.sahne));
      }
    }
  });

  it('getHazineKartById kayıtlı kartı döner, bilinmeyen id null', () => {
    const any = getHazineKartlarBySet('manifesto')[0];
    expect(getHazineKartById(any.id)).toBe(any);
    expect(getHazineKartById('yok-boyle-bir-kart')).toBeNull();
  });
});

describe('hzDrawPack — havuz sınırları', () => {
  it('taç kartlar asla çekiliş havuzuna girmez', () => {
    const cards = getHazineKartlarBySet('manifesto');
    const state = hzState();
    for (let i = 0; i < 30; i++) {
      const draw = hzDrawPack('manifesto', state, cards, Math.random);
      for (const r of draw.results) expect(r.card.tac).not.toBe(true);
    }
  });

  it('satılamaz set (Işık Kanonu) için çağıran havuzu boş geçerse boş sonuç döner', () => {
    const state = hzState();
    const draw = hzDrawPack('isik_kanonu', state, [], Math.random);
    expect(draw.results).toEqual([]);
  });

  it('her çekiliş tam HZ_PACK_SIZE kart döner', () => {
    const cards = getHazineKartlarBySet('aforizmalar');
    const draw = hzDrawPack('aforizmalar', hzState(), cards, Math.random);
    expect(draw.results.length).toBe(HZ_PACK_SIZE);
  });
});

describe('hzWeightedRarityPick — ağırlıklı dağılım', () => {
  it('rand=0 en düşük kademeyi, rand≈1 en yüksek kademeyi verir', () => {
    expect(hzWeightedRarityPick(() => 0)).toBe('yaygin');
    expect(hzWeightedRarityPick(() => 0.9999)).toBe('efsane');
  });

  it('ağırlıklar toplamı 100 (HZ_WEIGHTS sözleşmesi)', () => {
    const total = Object.values(HZ_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});

describe('pity — garanti kademe', () => {
  it(`sincePityNadide >= ${HZ_PITY_NADIDE} olduğunda ilk kart nadide+ olur`, () => {
    const cards = getHazineKartlarBySet('cerceveler');
    const state = hzState();
    state.packs.sincePityNadide = HZ_PITY_NADIDE - 1; // bu paketin 1. kartında eşiğe ulaşır
    state.packs.sincePityEfsane = 0;
    const draw = hzDrawPack('cerceveler', state, cards, () => 0); // rand=0 → normalde hep 'yaygin'
    expect(['nadide', 'efsane']).toContain(draw.results[0].card.rarity);
  });

  it(`sincePityEfsane >= ${HZ_PITY_EFSANE} olduğunda ilk kart efsane olur`, () => {
    const cards = getHazineKartlarBySet('manifesto'); // en az 1 efsane içeriyor
    const state = hzState();
    state.packs.sincePityNadide = 0;
    state.packs.sincePityEfsane = HZ_PITY_EFSANE - 1;
    const draw = hzDrawPack('manifesto', state, cards, () => 0);
    expect(draw.results[0].card.rarity).toBe('efsane');
  });

  it('nadide+ çekilince sincePityNadide sıfırlanır', () => {
    const cards = getHazineKartlarBySet('manifesto');
    const state = hzState();
    state.packs.sincePityNadide = HZ_PITY_NADIDE - 1;
    const draw = hzDrawPack('manifesto', state, cards, () => 0);
    expect(draw.pity.sincePityNadide).toBeLessThan(HZ_PITY_NADIDE);
  });

  it('regresyon: pity PAKET başına sayılır, KART başına değil (2 paket = 6 kart, eşik 5 aşılmamalı)', () => {
    // Önceki hatalı sürüm sayaçları HER KARTTA artırıyordu — 3 kartlık 2 paket
    // (6 kart) HZ_PITY_NADIDE(5) eşiğini paketin ortasında aşıp erken zorluyordu.
    // Doğru davranış: sayaç paket başına 1 artar, 2 paket (2<5) asla zorlamaz.
    const cards = getHazineKartlarBySet('aforizmalar'); // yaygin kartı var → rand=0 hep 'yaygin' seçer
    let state = hzState();
    const draw1 = hzDrawPack('aforizmalar', state, cards, () => 0);
    hzApplyDraw(state, draw1);
    hzSaveState(state);
    expect(draw1.results.every(r => r.card.rarity === 'yaygin')).toBe(true);

    state = hzState(); // taze oku — hzApplyDraw'ın kaydettiği pity sayaçlarıyla
    const draw2 = hzDrawPack('aforizmalar', state, cards, () => 0);
    expect(draw2.results.every(r => r.card.rarity === 'yaygin')).toBe(true);
    expect(draw2.pity.sincePityNadide).toBeLessThan(HZ_PITY_NADIDE);
  });
});

describe('hzApplyDraw — koleksiyon + dupe/holo/iade', () => {
  it('yeni kart: koleksiyona holo:false olarak girer, iade yok', () => {
    const card = getHazineKartlarBySet('aforizmalar', { excludeTac: true })[0];
    const state = hzState();
    const draw = { results: [{ card, isNew: true, holoUpgrade: false, refund: 0 }], pity: { sincePityNadide: 1, sincePityEfsane: 1 } };
    const refund = hzApplyDraw(state, draw);
    expect(refund).toBe(0);
    expect(state.collection[card.id]).toMatchObject({ holo: false, dupes: 0 });
  });

  it('dupe (holo değil): holo:true olur, iade yok', () => {
    const card = getHazineKartlarBySet('aforizmalar', { excludeTac: true })[0];
    const state = hzState();
    state.collection[card.id] = { earnedAt: new Date().toISOString(), holo: false, dupes: 0 };
    const draw = { results: [{ card, isNew: false, holoUpgrade: true, refund: 0 }], pity: { sincePityNadide: 1, sincePityEfsane: 1 } };
    const refund = hzApplyDraw(state, draw);
    expect(refund).toBe(0);
    expect(state.collection[card.id].holo).toBe(true);
    expect(state.collection[card.id].dupes).toBe(1);
  });

  it('holo dupe: Elmas iadesi nadirlik tablosuna göre döner', () => {
    const card = getHazineKartlarBySet('aforizmalar', { excludeTac: true }).find(c => c.rarity === 'efsane')
      || getHazineKartlarBySet('aforizmalar', { excludeTac: true })[0];
    const state = hzState();
    state.collection[card.id] = { earnedAt: new Date().toISOString(), holo: true, dupes: 1 };
    const draw = { results: [{ card, isNew: false, holoUpgrade: false, refund: HZ_DUPE_REFUND[card.rarity] }], pity: { sincePityNadide: 1, sincePityEfsane: 1 } };
    const refund = hzApplyDraw(state, draw);
    expect(refund).toBe(HZ_DUPE_REFUND[card.rarity]);
    expect(state.collection[card.id].dupes).toBe(2);
  });

  it('packs.opened her uygulamada 1 artar; pity sayaçları senkronlanır', () => {
    const cards = getHazineKartlarBySet('aforizmalar');
    const state = hzState();
    const draw = hzDrawPack('aforizmalar', state, cards, seqRand([0.99, 0.99, 0.99]));
    hzApplyDraw(state, draw);
    expect(state.packs.opened).toBe(1);
    expect(state.packs.sincePityNadide).toBe(draw.pity.sincePityNadide);
  });
});

describe('hzDetectSetCompletion — idempotent', () => {
  it('tüm satılabilir kartlar toplanmadan tamamlanmaz', () => {
    const state = hzState();
    expect(hzDetectSetCompletion(state, 'temeller')).toBe(false);
  });

  it('tüm satılabilir kartlar toplanınca bir kez true döner, tekrar false', () => {
    const state = hzState();
    for (const c of getHazineKartlarBySet('temeller', { excludeTac: true })) {
      state.collection[c.id] = { earnedAt: new Date().toISOString(), holo: false, dupes: 0 };
    }
    expect(hzDetectSetCompletion(state, 'temeller')).toBe(true);
    expect(state.sets.temeller.completedAt).toBeTruthy();
    // idempotent — ikinci çağrı false (zaten tamamlanmış)
    expect(hzDetectSetCompletion(state, 'temeller')).toBe(false);
  });

  it('taç kart eksik olsa da set tamamlanmış sayılır (taç kazanım ÜRÜNÜdür, ÖNKOŞULU değil)', () => {
    const state = hzState();
    for (const c of getHazineKartlarBySet('perdeler', { excludeTac: true })) {
      state.collection[c.id] = { earnedAt: new Date().toISOString(), holo: false, dupes: 0 };
    }
    expect(state.collection[getHazineTacKart('perdeler').id]).toBeUndefined();
    expect(hzDetectSetCompletion(state, 'perdeler')).toBe(true);
  });
});

describe('hzOwnedCount', () => {
  it('boş koleksiyonda 0 döner', () => {
    expect(hzOwnedCount(hzState(), 'zehirler')).toBe(0);
  });
  it('taç kartı saymaz (yalnız satılabilir kartlar)', () => {
    const state = hzState();
    state.collection[getHazineTacKart('zehirler').id] = { earnedAt: new Date().toISOString(), holo: false, dupes: 0 };
    expect(hzOwnedCount(state, 'zehirler')).toBe(0);
  });
});

describe('hzAyetCursorNext — Işık Kanonu deterministik sıra (K6)', () => {
  it('RNG kullanmadan kanon sırasıyla ilerler', () => {
    const state = hzState();
    const ayetler = getHazineKartlarBySet('isik_kanonu', { excludeTac: true });
    const first = hzAyetCursorNext(state);
    expect(first.id).toBe(ayetler[0].id);
    expect(state.ayetCursor).toBe(1);
    const second = hzAyetCursorNext(state);
    expect(second.id).toBe(ayetler[1].id);
  });

  it('verilen kartı koleksiyona işler', () => {
    const state = hzState();
    const card = hzAyetCursorNext(state);
    expect(state.collection[card.id]).toBeTruthy();
  });

  it('kanon tükenince null döner (bir daha ilerlemez)', () => {
    const state = hzState();
    const total = getHazineKartlarBySet('isik_kanonu', { excludeTac: true }).length;
    for (let i = 0; i < total; i++) hzAyetCursorNext(state);
    expect(state.ayetCursor).toBe(total);
    expect(hzAyetCursorNext(state)).toBeNull();
    expect(state.ayetCursor).toBe(total);
  });
});

describe('hzWeekKey — pazartesi tabanlı yerel hafta', () => {
  it('aynı hafta içindeki iki gün aynı anahtarı verir (Pzt ve Cuma)', () => {
    const monday = new Date(2026, 6, 20); // 2026-07-20 Pazartesi
    const friday = new Date(2026, 6, 24);
    expect(hzWeekKey(monday)).toBe(hzWeekKey(friday));
  });

  it('pazar, bir önceki pazartesiye bağlanır (haftanın SON günü)', () => {
    const monday = new Date(2026, 6, 20);
    const sunday = new Date(2026, 6, 26); // aynı haftanın pazarı
    expect(hzWeekKey(sunday)).toBe(hzWeekKey(monday));
  });

  it('hafta sınırını geçince anahtar değişir', () => {
    const sunday = new Date(2026, 6, 26);
    const nextMonday = new Date(2026, 6, 27);
    expect(hzWeekKey(sunday)).not.toBe(hzWeekKey(nextMonday));
  });
});

describe('hzState / hzSaveState — SafeStorage round-trip', () => {
  it('kaydedilen durum bir sonraki okumada geri gelir', () => {
    const state = hzState();
    state.packs.opened = 7;
    state.ayetCursor = 2;
    hzSaveState(state);
    const reloaded = hzState();
    expect(reloaded.packs.opened).toBe(7);
    expect(reloaded.ayetCursor).toBe(2);
  });

  it('hiç kayıt yokken varsayılan boş durum döner', () => {
    const state = hzState();
    expect(state.collection).toEqual({});
    expect(state.packs.opened).toBe(0);
    expect(state.ayetCursor).toBe(0);
  });
});

describe('hzBuyPack — satın alma guard senaryoları', () => {
  it('yeterli Elmasla: bakiye düşer, koleksiyon güncellenir, tören portalı açılır', () => {
    S._wandererGame.elmas = HZ_PACK_COST;
    hzBuyPack('aforizmalar');
    // hzBuyPack gerçek RNG (_hzRand) kullanır — aynı pakette (3 çekiliş) aynı
    // kart iki+ kez gelirse holo-dupe iadesi tetiklenebilir (en fazla efsane
    // refund'u kadar); üst sınır bu yüzden aralık, deterministik sıfır değil.
    const maxRefund = Math.max(...Object.values(HZ_DUPE_REFUND));
    expect(S._wandererGame.elmas).toBeGreaterThanOrEqual(0);
    expect(S._wandererGame.elmas).toBeLessThanOrEqual(maxRefund);
    expect(hzState().packs.opened).toBe(1);
    expect(document.getElementById('hz-pack-portal')).toBeTruthy();
    expect(document.getElementById('hz-pack-portal').innerHTML).not.toBe('');
  });

  it('yetersiz Elmasla: hiçbir şey harcanmaz, çekiliş yapılmaz', () => {
    S._wandererGame.elmas = HZ_PACK_COST - 1;
    hzBuyPack('aforizmalar');
    expect(S._wandererGame.elmas).toBe(HZ_PACK_COST - 1); // tam iade — net değişim yok
    expect(hzState().packs.opened).toBe(0);
    expect(document.getElementById('hz-pack-portal')?.innerHTML || '').toBe('');
  });

  it('sıfır Elmasla: no-op, negatife düşmez', () => {
    S._wandererGame.elmas = 0;
    hzBuyPack('aforizmalar');
    expect(S._wandererGame.elmas).toBe(0);
    expect(hzState().packs.opened).toBe(0);
  });

  it('tören açıkken ikinci satın alma çifte-harcama guard\'ına takılır', () => {
    S._wandererGame.elmas = HZ_PACK_COST * 3;
    hzBuyPack('aforizmalar');
    const afterFirst = S._wandererGame.elmas; // gerçek RNG holo-dupe iadesi verebilir — kesin değer değil
    expect(afterFirst).toBeLessThan(HZ_PACK_COST * 3); // ilk paket kesin düştü
    hzBuyPack('cerceveler'); // portal hâlâ açık — no-op
    expect(S._wandererGame.elmas).toBe(afterFirst); // ikinci kez hiç değişmedi
    expect(hzState().packs.opened).toBe(1);
  });

  it('satılamaz set (Işık Kanonu) satın alınamaz, Elmas harcanmaz', () => {
    S._wandererGame.elmas = HZ_PACK_COST * 5;
    hzBuyPack('isik_kanonu');
    expect(S._wandererGame.elmas).toBe(HZ_PACK_COST * 5);
    expect(hzState().packs.opened).toBe(0);
  });

  it('bilinmeyen set id\'si no-op', () => {
    S._wandererGame.elmas = HZ_PACK_COST;
    hzBuyPack('yok-boyle-bir-set');
    expect(S._wandererGame.elmas).toBe(HZ_PACK_COST);
  });
});

describe('hzSetCeremony — taç + ikramiye idempotent', () => {
  beforeEach(() => {
    S.currentUser = { id: 'u1' };
    SafeStorage.set('etw_hazine_v1_u1', null);
    SafeStorage.set('etw_wanderer_game_v1_u1', null);
    S._wandererGame = { elmas: 0 };
  });

  it('ilk çağrı: taç koleksiyona holo olarak girer, Elmas ikramiyesi verilir, ayet ilerler', () => {
    hzSetCeremony('temeller');
    const state = hzState();
    const tac = getHazineTacKart('temeller');
    expect(state.collection[tac.id]).toMatchObject({ holo: true });
    expect(state.sets.temeller.tacAt).toBeTruthy();
    expect(S._wandererGame.elmas).toBe(HZ_SET_BONUS_ELMAS);
    expect(state.ayetCursor).toBe(1);
  });

  it('ikinci çağrı idempotent: Elmas tekrar verilmez, ayet tekrar ilerlemez', () => {
    hzSetCeremony('temeller');
    hzSetCeremony('temeller');
    expect(S._wandererGame.elmas).toBe(HZ_SET_BONUS_ELMAS);
    expect(hzState().ayetCursor).toBe(1);
  });

  it('bilinmeyen set id\'si no-op', () => {
    hzSetCeremony('yok-boyle-bir-set');
    expect(S._wandererGame.elmas).toBe(0);
  });
});

describe('hzGrantSetBonus / hzRetryPendingBonuses — RPC ucu, sessiz düşüş', () => {
  beforeEach(() => {
    S.currentUser = { id: 'u1' };
    SafeStorage.set('etw_hazine_v1_u1', null);
    delete sb.rpc; // önceki testten kalan mock varsa temizle → varsayılan "rpc yok" davranışı
  });

  it('auth yoksa false döner ve pendingBonus\'a eklenir', async () => {
    S.currentUser = null;
    const ok = await hzGrantSetBonus('manifesto');
    expect(ok).toBe(false);
    // anon anahtarına yazıldı — kirletmeyelim
    SafeStorage.set('etw_hazine_v1_anon', null);
  });

  it('RPC (mig 038) henüz deploy edilmemişse sessizce düşer, pendingBonus\'a girer', async () => {
    const ok = await hzGrantSetBonus('manifesto');
    expect(ok).toBe(false);
    expect(hzState().pendingBonus).toContain('manifesto');
  });

  it('aynı set iki kez başarısız denense de pendingBonus\'ta tekrarlanmaz', async () => {
    await hzGrantSetBonus('manifesto');
    await hzGrantSetBonus('manifesto');
    const pending = hzState().pendingBonus.filter(s => s === 'manifesto');
    expect(pending.length).toBe(1);
  });

  it('RPC başarılıysa true döner ve pendingBonus\'tan düşer', async () => {
    sb.rpc = async () => ({ data: { ok: true }, error: null });
    const state = hzState();
    state.pendingBonus = ['manifesto'];
    hzSaveState(state);
    const ok = await hzGrantSetBonus('manifesto');
    expect(ok).toBe(true);
    expect(hzState().pendingBonus).not.toContain('manifesto');
  });

  it('hzRetryPendingBonuses: başarılı olanı kuyruktan düşürür, başarısızı bırakır', async () => {
    const state = hzState();
    state.pendingBonus = ['manifesto', 'temeller'];
    hzSaveState(state);
    sb.rpc = async (_fn, args) => args.p_set === 'manifesto'
      ? { data: { ok: true }, error: null }
      : { data: null, error: new Error('deploy edilmedi') };
    await hzRetryPendingBonuses();
    const pending = hzState().pendingBonus;
    expect(pending).not.toContain('manifesto');
    expect(pending).toContain('temeller');
  });
});

describe('hzMaybeWeeklyGift — Pro/Max haftalık armağan, idempotent', () => {
  beforeEach(() => {
    S.currentUser = { id: 'u1' };
    SafeStorage.set('etw_hazine_v1_u1', null);
    S.isPremium = false;
    S.isPremiumPlus = false;
  });

  it('premium değilse false döner, durum değişmez', () => {
    const before = hzState();
    const ok = hzMaybeWeeklyGift();
    expect(ok).toBe(false);
    expect(hzState().gift.lastWeekKey).toBe(before.gift.lastWeekKey);
  });

  it('Pro/Max: ilk çağrıda armağan verilir, lastWeekKey işaretlenir, ayet eşlik eder', () => {
    S.isPremium = true;
    const ok = hzMaybeWeeklyGift();
    expect(ok).toBe(true);
    const state = hzState();
    expect(state.gift.lastWeekKey).toBe(hzWeekKey());
    expect(state.ayetCursor).toBe(1); // Işık Kanonu her zaman eşlik eder (K6.1)
    expect(Object.keys(state.collection).length).toBeGreaterThan(0);
  });

  it('aynı hafta içinde ikinci çağrı idempotent (false, durum sabit)', () => {
    S.isPremium = true;
    hzMaybeWeeklyGift();
    const after1 = hzState();
    const ok2 = hzMaybeWeeklyGift();
    expect(ok2).toBe(false);
    expect(hzState().packs).toEqual(after1.packs);
  });

  it('Max kullanıcı için de çalışır (isPremiumPlus)', () => {
    S.isPremiumPlus = true;
    const ok = hzMaybeWeeklyGift();
    expect(ok).toBe(true);
  });
});

describe('hzSetCeremony — çifte-ayet önleme + Işık Kanonu ölü-içerik düzeltmesi', () => {
  beforeEach(() => {
    S.currentUser = { id: 'u1' };
    SafeStorage.set('etw_hazine_v1_u1', null);
    SafeStorage.set('etw_wanderer_game_v1_u1', null);
    S._wandererGame = { elmas: 0 };
    delete sb.rpc; // önceki describe'dan kalan mock varsa temizle
  });

  it('opts.skipAyet=true ile çağrılırsa taç yine verilir ama ayet İLERLEMEZ', () => {
    hzSetCeremony('temeller', { skipAyet: true });
    const state = hzState();
    expect(state.sets.temeller.tacAt).toBeTruthy();
    expect(state.ayetCursor).toBe(0);
  });

  it('opts verilmezse (normal akış) ayet normalde ilerler', () => {
    hzSetCeremony('temeller');
    expect(hzState().ayetCursor).toBe(1);
  });

  it('10. (son) ayet Işık Kanonu\'nu tamamlarsa kendi Tacı gecikmeli bir törenle verilir', () => {
    vi.useFakeTimers();
    try {
      const state = hzState();
      // hzAyetCursorNext invaryantı: cursor'dan önceki her ayet koleksiyonda
      // da bulunur — cursor'u tek başına ilerletmek (koleksiyonsuz) gerçek
      // akışta asla oluşmayan tutarsız bir durum yaratırdı.
      const ayetler = getHazineKartlarBySet('isik_kanonu', { excludeTac: true });
      for (let i = 0; i < 9; i++) {
        state.collection[ayetler[i].id] = { earnedAt: new Date().toISOString(), holo: false, dupes: 0 };
      }
      state.ayetCursor = 9; // 9'u toplandı, yalnız 1 ayet kaldı
      hzSaveState(state);

      hzSetCeremony('temeller'); // herhangi bir set — 10. ayeti bu verir

      expect(hzState().ayetCursor).toBe(10);
      // Kendi Tacı SENKRON değil — kısa gecikmeli ayrı törenle gelir (K6.3)
      expect(hzState().sets.isik_kanonu?.tacAt).toBeFalsy();

      vi.advanceTimersByTime(1000);

      const final = hzState();
      expect(final.sets.isik_kanonu.tacAt).toBeTruthy();
      const isikTac = getHazineTacKart('isik_kanonu');
      expect(final.collection[isikTac.id]).toMatchObject({ holo: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it('Işık Kanonu kendi tacını asla kendi ayet-kazanımıyla (setId==isik_kanonu) tetiklemez', () => {
    // hzSetCeremony('isik_kanonu') doğrudan çağrılırsa (kaskad değil, doğrudan)
    // kendi setinin tekrar tamamlanmasını KONTROL ETMEZ (setId!=='isik_kanonu' guard'ı) —
    // sonsuz döngü riski böyle engellenir.
    const state = hzState();
    const ayetler = getHazineKartlarBySet('isik_kanonu', { excludeTac: true });
    for (let i = 0; i < 9; i++) {
      state.collection[ayetler[i].id] = { earnedAt: new Date().toISOString(), holo: false, dupes: 0 };
    }
    state.ayetCursor = 9;
    hzSaveState(state);
    hzSetCeremony('isik_kanonu'); // doğrudan çağrı — kendi tacını verir + 10. ayeti ilerletir
    expect(hzState().ayetCursor).toBe(10);
    expect(hzState().sets.isik_kanonu.tacAt).toBeTruthy();
    // İkinci bir "kendi kendini tamamlama" döngüsü YOK — kota/elmas yalnız bir kez verildi
    expect(S._wandererGame.elmas).toBe(HZ_SET_BONUS_ELMAS);
  });
});
