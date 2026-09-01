/**
 * Sentez (K4 · Üç Usta planı FAZ 3) — Yu-Gi-Oh füzyonunun kitap diline çevirisi
 *   - kkSentezMalzeme: bileşik id'sinden iki erdem (tek kaynak id'nin kendisi)
 *   - kkErdemTemsilcisi: erdemin sahipli EN DERİN kartı; bileşik malzeme olamaz
 *   - kkSentezDurum: hazır / eksik erdemler
 *   - Ön koşul: reçete tutsa bile malzemesiz bileşik kart VERİLMEZ, bekler
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
  kkSentezMalzeme, kkErdemTemsilcisi, kkSentezDurum,
  kkAileDurum, kkDetectAileCompletion,
} from '../js/parts/10q-w2-kisi-karti.js';
import { deckReady, getFullDeck } from '../js/parts/12b-kart-destesi.js';
import { S } from '../js/state.js';

let deck = [];
beforeAll(async () => { await deckReady(); deck = getFullDeck(); });

beforeEach(() => {
  document.body.innerHTML = '';
  S.currentUser = { id: 'u-sentez-1' };
});

// Bir erdemin bileşik OLMAYAN kartlarını nadirliğe göre bul (test yardımcısı)
const kartlarOf = (v) => deck.filter(c => c.virtue === v && c.category !== 'bilesik');

describe('kkSentezMalzeme — füzyon reçetesi kartın kimliğinde', () => {
  it('bileşik id\'sinden iki erdemi çıkarır', () => {
    expect(kkSentezMalzeme('bilesik-niyet-ozdeger')).toEqual({ v1: 'niyet', v2: 'ozdeger' });
    expect(kkSentezMalzeme('bilesik-sukur-bolluk')).toEqual({ v1: 'sukur', v2: 'bolluk' });
  });

  it('bileşik olmayan kartta null döner (guard\'lar buna bakar)', () => {
    expect(kkSentezMalzeme('temel-ozsevgi-kok')).toBeNull();
    expect(kkSentezMalzeme('golge-kibir')).toBeNull();
    expect(kkSentezMalzeme('')).toBeNull();
    expect(kkSentezMalzeme(undefined)).toBeNull();
  });

  it('destedeki TÜM bileşik kartların malzemesi çözülebilir (ölü içerik yok)', () => {
    const bilesikler = deck.filter(c => c.category === 'bilesik');
    expect(bilesikler.length).toBeGreaterThan(0);
    for (const c of bilesikler) {
      const mal = kkSentezMalzeme(c.id);
      expect(mal, c.id).not.toBeNull();
      // İki erdemin de destede gerçek kartı olmalı — yoksa kart asla doğmaz
      expect(kartlarOf(mal.v1).length, `${c.id} → ${mal.v1}`).toBeGreaterThan(0);
      expect(kartlarOf(mal.v2).length, `${c.id} → ${mal.v2}`).toBeGreaterThan(0);
    }
  });
});

describe('kkErdemTemsilcisi — erdemin en derin sahipli kartı', () => {
  it('koleksiyon boşsa temsilci yok', () => {
    expect(kkErdemTemsilcisi('niyet', {})).toBeNull();
  });

  it('sahipli kartlar arasından en NADİR olanı seçer', () => {
    const kartlar = kartlarOf('niyet');
    const enNadir = [...kartlar].sort((a, b) =>
      ({ yaygin: 0, nadir: 1, nadide: 2, efsane: 3 })[b.rarity] - ({ yaygin: 0, nadir: 1, nadide: 2, efsane: 3 })[a.rarity])[0];
    const coll = {};
    for (const c of kartlar) coll[c.id] = { earnedAt: 'x' };
    expect(kkErdemTemsilcisi('niyet', coll).rarity).toBe(enNadir.rarity);
  });

  it('bileşik kart malzeme OLAMAZ — sentez sentezden doğmaz', () => {
    const bilesik = deck.find(c => c.category === 'bilesik');
    const coll = { [bilesik.id]: { earnedAt: 'x' } };
    expect(kkErdemTemsilcisi(bilesik.virtue, coll)).toBeNull();
  });

  it('eşit nadirlikte daha yüksek MERTEBE kazanır', () => {
    const kartlar = kartlarOf('sebat').filter(c => c.rarity === kartlarOf('sebat')[0].rarity);
    if (kartlar.length < 2) return;             // bu erdemde eş-nadirlikli çift yok
    const coll = {
      [kartlar[0].id]: { earnedAt: 'x', mertebe: 1 },
      [kartlar[1].id]: { earnedAt: 'x', mertebe: 4 },
    };
    expect(kkErdemTemsilcisi('sebat', coll).id).toBe(kartlar[1].id);
  });
});

describe('kkSentezDurum — malzeme ön koşulu', () => {
  const bilesik = () => deck.find(c => c.id === 'bilesik-sukur-bolluk') || deck.find(c => c.category === 'bilesik');

  it('bileşik olmayan kartta null (ön koşul hiç uygulanmaz)', () => {
    expect(kkSentezDurum(deck.find(c => c.category === 'manifesto'), {})).toBeNull();
  });

  it('malzeme yokken hazır DEĞİL ve iki erdem de eksik listelenir', () => {
    const c = bilesik();
    const sz = kkSentezDurum(c, {});
    expect(sz.hazir).toBe(false);
    expect(sz.eksikErdemler).toEqual([sz.v1, sz.v2]);
  });

  it('tek malzeme yetmez — yarım sentez yok', () => {
    const c = bilesik();
    const mal = kkSentezMalzeme(c.id);
    const coll = { [kartlarOf(mal.v1)[0].id]: { earnedAt: 'x' } };
    const sz = kkSentezDurum(c, coll);
    expect(sz.hazir).toBe(false);
    expect(sz.eksikErdemler).toEqual([mal.v2]);
    expect(sz.kart1).not.toBeNull();
    expect(sz.kart2).toBeNull();
  });

  it('iki malzeme sendeyse sentez hazırdır', () => {
    const c = bilesik();
    const mal = kkSentezMalzeme(c.id);
    const coll = {
      [kartlarOf(mal.v1)[0].id]: { earnedAt: 'x' },
      [kartlarOf(mal.v2)[0].id]: { earnedAt: 'x' },
    };
    const sz = kkSentezDurum(c, coll);
    expect(sz.hazir).toBe(true);
    expect(sz.eksikErdemler).toEqual([]);
    expect(sz.kart1.virtue).toBe(mal.v1);
    expect(sz.kart2.virtue).toBe(mal.v2);
  });
});

describe('kkAileDurum + kkDetectAileCompletion — aile mührü (K4)', () => {
  // En küçük aileyi seç: test tam koleksiyonu ucuza kursun
  const enKucukAile = () => {
    const say = {};
    for (const c of deck) say[c.category] = (say[c.category] || 0) + 1;
    return Object.entries(say).sort((a, b) => a[1] - b[1])[0][0];
  };

  it('boş koleksiyonda hiçbir aile tam değil', () => {
    const d = kkAileDurum({});
    expect(Object.keys(d).length).toBeGreaterThan(0);
    for (const v of Object.values(d)) { expect(v.owned).toBe(0); expect(v.tam).toBe(false); }
  });

  it('bir ailenin TÜM kartları sahipse tam sayılır, eksikse sayılmaz', () => {
    const cat = enKucukAile();
    const kartlar = deck.filter(c => c.category === cat);
    const coll = {};
    for (const c of kartlar.slice(0, -1)) coll[c.id] = { earnedAt: 'x' };
    expect(kkAileDurum(coll)[cat].tam).toBe(false);       // son kart eksik
    coll[kartlar[kartlar.length - 1].id] = { earnedAt: 'x' };
    expect(kkAileDurum(coll)[cat].tam).toBe(true);
  });

  it('mühür İDEMPOTENT — ikinci tarama aynı aileyi tekrar mühürlemez', () => {
    const cat = enKucukAile();
    const kk = { collection: {} };
    for (const c of deck.filter(x => x.category === cat)) kk.collection[c.id] = { earnedAt: 'x' };
    expect(kkDetectAileCompletion(kk)).toEqual([cat]);
    expect(kk.aileler[cat].at).toBeTruthy();
    expect(kkDetectAileCompletion(kk)).toEqual([]);        // Elmas iki kez ödenmez
  });

  it('koleksiyonsuz/bozuk durum sessizce boş döner (savunmacı)', () => {
    expect(kkDetectAileCompletion(null)).toEqual([]);
    expect(kkDetectAileCompletion({})).toEqual([]);
  });
});
