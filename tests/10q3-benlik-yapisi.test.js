/**
 * Benlik Yapısı (K5 · Üç Usta planı FAZ 4) — INWO güç yapısının kitap diline çevirisi
 *   - byGetYapi: iki kol, kaynak defterlerden (porCardRefs / oikCardRefs) türetilir
 *   - Kol düğümleri: altın = portreyi besleyen kazanımlar, lapis = hedef mührü
 *   - byRender: iki kutup + düğümler + besleme okları; boş durumda çökmez
 *   - Merkezde SEN varsın: ok kontrol etmez, besler (yön kart → kutup)
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

import { byGetYapi, byRender, byEnsureStyles } from '../js/parts/10q3-benlik-yapisi.js';
import { deckReady, getFullDeck } from '../js/parts/12b-kart-destesi.js';
import { S } from '../js/state.js';

let deck = [];
beforeAll(async () => { await deckReady(); deck = getFullDeck(); byEnsureStyles(); });

const bosPortre = () => ({ confirmed: true, dusunceler: [], inanclar: [], duygular: [], davranislar: [], history: [] });

beforeEach(() => {
  document.body.innerHTML = '';
  S.currentUser = { id: 'u-yapi-1' };
  S._kisiKarti = { profile: {}, collection: {}, history: [], pending: [], seenIntro: true, closest: null, lastTick: 0, hedefler: {} };
  S._portre = bosPortre();
  S._oik = { cards: [], activeCardId: null, readingLog: {}, crystalMilestone: 0, seedHint: null, migratedFromGecis: false };
});

const sahiplen = (n) => deck.slice(0, n).map(c => {
  S._kisiKarti.collection[c.id] = { earnedAt: new Date(2026, 0, 1 + n).toISOString(), rarity: c.rarity };
  return c;
});

describe('byGetYapi — yapı kaynak defterlerden türetilir', () => {
  it('boş durumda iki kol da boş (kalıcı defter tutulmaz)', () => {
    const y = byGetYapi();
    expect(y.altin).toEqual([]);
    expect(y.lapis).toEqual([]);
  });

  it('altın kol portreyi BESLEYEN kartlardan gelir (ref izi)', () => {
    const [a, b] = sahiplen(2);
    S._portre.dusunceler.push({ text: 'x', src: 'kart', ref: a.id });
    const y = byGetYapi();
    expect(y.altin.map(c => c.id)).toEqual([a.id]);        // b henüz portreye işlenmedi
    expect(y.altin.map(c => c.id)).not.toContain(b.id);
  });

  it('portre izi yoksa koleksiyonun kendisi altın koldur (absorb kuyrukta bekliyor olabilir)', () => {
    const kartlar = sahiplen(3);
    S._portre = null;
    const y = byGetYapi();
    expect(y.altin.map(c => c.id).sort()).toEqual(kartlar.map(c => c.id).sort());
  });

  it('SAHİPSİZ kart altın kola giremez — yapı yalnız olunanı taşır', () => {
    const yabanci = deck.find(c => !S._kisiKarti.collection[c.id]);
    S._portre.inanclar.push({ text: 'x', src: 'kart', ref: yabanci.id });
    expect(byGetYapi().altin).toEqual([]);
  });

  it('lapis kol hedef mühürlerinden gelir (OİK kartı henüz yokken bile)', () => {
    const hedef = deck.find(c => !S._kisiKarti.collection[c.id]);
    S._kisiKarti.hedefler[hedef.id] = { at: new Date().toISOString(), absorbed: 0 };
    const y = byGetYapi();
    expect(y.lapis.map(c => c.id)).toEqual([hedef.id]);
  });

  it('MEZUNİYET: hedeflenen kart kazanıldıysa lapis koldan düşer, altın kolda görünür', () => {
    const kart = deck[0];
    // Önce hedeflendi ve OİK'e işlendi (ref izi kalıcı), SONRA kazanıldı
    S._oik.cards = [{ id: 'c1', baslik: 'Hedef', dusunceler: [{ text: 'x', src: 'kart', ref: kart.id }],
                      inanclar: [], duygular: [], davranislar: [] }];
    S._oik.activeCardId = 'c1';
    S._kisiKarti.collection[kart.id] = { earnedAt: new Date().toISOString(), rarity: kart.rarity };
    S._portre.dusunceler.push({ text: 'y', src: 'kart', ref: kart.id });
    const y = byGetYapi();
    expect(y.lapis.map(c => c.id)).not.toContain(kart.id);
    expect(y.altin.map(c => c.id)).toContain(kart.id);
  });

  it('bilinmeyen id sessizce düşer (deste değişirse yapı kırılmaz)', () => {
    sahiplen(1);
    S._kisiKarti.hedefler['artik-olmayan-kart'] = { at: new Date().toISOString() };
    expect(() => byGetYapi()).not.toThrow();
    expect(byGetYapi().lapis).toEqual([]);
  });
});

describe('byRender — iki kutup, düğümler, besleme okları', () => {
  it('boş koleksiyonda çökmez; iki kutup ve davetkâr boş durum çizilir', () => {
    const host = document.createElement('div');
    byRender(host);
    expect(host.querySelectorAll('.by-pole').length).toBe(2);
    expect(host.querySelectorAll('.by-empty').length).toBe(2);
    expect(host.querySelectorAll('.by-node').length).toBe(0);
  });

  it('kartlar düğüm olarak çizilir ve detaya köprü kurar', () => {
    const [a] = sahiplen(3);
    S._portre.dusunceler.push({ text: 'x', src: 'kart', ref: a.id });
    const host = document.createElement('div');
    byRender(host);
    const nodes = host.querySelectorAll('#by-row-gold .by-node');
    expect(nodes.length).toBe(1);
    expect(nodes[0].dataset.byOpen).toBe(a.id);
  });

  it('bir koldaki düğüm sayısı sınırlanır, kalanı "+N" düğümünde toplanır', () => {
    const kartlar = sahiplen(11);
    for (const c of kartlar) S._portre.davranislar.push({ text: 'x', src: 'kart', ref: c.id });
    const host = document.createElement('div');
    byRender(host);
    const more = host.querySelector('#by-row-gold .by-node--more .by-more-n');
    expect(host.querySelectorAll('#by-row-gold [data-by-open]').length).toBe(6);
    expect(more.textContent).toBe('+5');
  });

  it('host null ise sessizce döner (savunmacı)', () => {
    expect(() => byRender(null)).not.toThrow();
  });

  it('yeniden çizim düğümleri ÇOĞALTMAZ (mercek geçişi idempotent)', () => {
    const [a] = sahiplen(2);
    S._portre.inanclar.push({ text: 'x', src: 'kart', ref: a.id });
    const host = document.createElement('div');
    byRender(host); byRender(host);
    expect(host.querySelectorAll('.by-wrap').length).toBe(1);
    expect(host.querySelectorAll('#by-row-gold [data-by-open]').length).toBe(1);
  });
});
