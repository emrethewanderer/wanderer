/**
 * SIRTLAR (Hearthstone K3) — "destenin dışı da senin"
 *   - fener herkeste vardır: deste asla sırtsız kalmaz
 *   - kazanım İDEMPOTENT; sırt satın alınmaz, yalnız kazanılır
 *   - sahip olunmayan sırt seçilemez; seçim düşerse fener'e dönülür
 *   - ikvCardBack TEK kapıdır: seçilen sırt tüm tüketici yüzeylere yayılır
 *   - katalog dışı bir dize asla sınıf adına geçmez (doğrulama)
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
  kkSirtSecili, kkSirtSahip, kkSirtKazan, kkSirtSec, kkHedefMuhurle, kkMuhurle,
} from '../js/parts/10q-w2-kisi-karti.js';
import { ikvCardBack, SIRTLAR } from '../js/parts/12c-kart-gorsel.js';
import { deckReady, getFullDeck } from '../js/parts/12b-kart-destesi.js';
import { S } from '../js/state.js';

let deck = [];
beforeAll(async () => { await deckReady(); deck = getFullDeck(); }, 30000);

beforeEach(() => {
  S._kisiKarti = {
    profile: {}, collection: {}, history: [], seenIntro: true, lastTick: 0,
    closest: null, hedefler: {}, esik: {}, sirtlar: {}, sirtSecili: null,
  };
});

const sinifi = (html) => (String(html).match(/ikv-back--[a-z]+/) || ['(yok)'])[0];

describe('sahiplik — fener herkeste, gerisi kazanılır', () => {
  it('fener başlangıç sırtıdır ve kazanılmasına gerek yoktur', () => {
    expect(kkSirtSahip('fener')).toBe(true);
    expect(kkSirtSecili()).toBe('fener');
  });

  it('kazanılmamış sırta sahip olunmaz', () => {
    expect(kkSirtSahip('meshale')).toBe(false);
  });

  it('kazanım idempotenttir — ikinci kez kazanılmaz', () => {
    expect(kkSirtKazan('tac')).toBe(true);
    expect(kkSirtKazan('tac')).toBe(false);
    expect(kkSirtSahip('tac')).toBe(true);
  });

  it('fener "kazanılamaz" — zaten herkeste', () => {
    expect(kkSirtKazan('fener')).toBe(false);
  });

  it('katalogda olmayan sırt kazanılamaz', () => {
    expect(kkSirtKazan('yok-boyle-bir-sirt')).toBe(false);
    expect(kkSirtKazan('<script>')).toBe(false);
  });
});

describe('seçim — sahip olmadan seçilmez', () => {
  it('sahip olunmayan sırt seçilemez', () => {
    expect(kkSirtSec('yol')).toBe(false);
    expect(kkSirtSecili()).toBe('fener');
  });

  it('kazanılmış sırt seçilir ve okunur', () => {
    kkSirtKazan('yol');
    expect(kkSirtSec('yol')).toBe(true);
    expect(kkSirtSecili()).toBe('yol');
  });

  it('seçili sırtın sahipliği düşerse fener\'e dönülür — deste sırtsız kalmaz', () => {
    kkSirtKazan('ufuk');
    kkSirtSec('ufuk');
    delete S._kisiKarti.sirtlar.ufuk;              // (senkron kazası taklidi)
    expect(kkSirtSecili()).toBe('fener');
  });
});

describe('ikvCardBack — tek kapı', () => {
  it('opts\'suz çağrı bugünkü sırtı verir (geri uyumluluk)', () => {
    expect(sinifi(ikvCardBack())).toBe('ikv-back--fener');
  });

  it('seçilen sırt çağıran hiç değişmeden yayılır', () => {
    kkSirtKazan('meshale');
    kkSirtSec('meshale');
    expect(sinifi(ikvCardBack())).toBe('ikv-back--meshale');
  });

  it('çağıranın açık isteği seçimi ezer (galeri/önizleme yolu)', () => {
    kkSirtKazan('tac'); kkSirtSec('tac');
    expect(sinifi(ikvCardBack({ back: 'yol' }))).toBe('ikv-back--yol');
  });

  it('katalog dışı dize sınıf adına GEÇMEZ — fener\'e düşer', () => {
    expect(sinifi(ikvCardBack({ back: 'x" onload="alert(1)' }))).toBe('ikv-back--fener');
  });

  it('taç sırtı üçüncü halkayı taşır, diğerleri taşımaz', () => {
    expect(ikvCardBack({ back: 'tac' })).toContain('ikv-back-ring--tac');
    expect(ikvCardBack({ back: 'fener' })).not.toContain('ikv-back-ring--tac');
  });

  it('nişan kazıması sırttan BAĞIMSIZ katmandır — her sırtın üstünde durur', () => {
    for (const id of Object.keys(SIRTLAR)) {
      expect(ikvCardBack({ back: id, etch: '<path d="M0 0"/>' })).toContain('ikv-back-etch');
    }
  });
});

describe('kazanım kancaları — sırt bir eşiğin kaydıdır', () => {
  it('ilk hedef mührü UFUK sırtını açar', () => {
    const hedef = deck.find(c => !S._kisiKarti.collection[c.id]);
    expect(kkSirtSahip('ufuk')).toBe(false);
    kkHedefMuhurle(hedef.id);
    expect(kkSirtSahip('ufuk')).toBe(true);
  });

  it('ilk EFSANE kart MEŞALE sırtını açar; yaygın kart açmaz', () => {
    const yaygin = deck.find(c => c.rarity === 'yaygin');
    const efsane = deck.find(c => c.rarity === 'efsane');
    kkMuhurle(yaygin.id, { yol: 'davet' });
    expect(kkSirtSahip('meshale')).toBe(false);
    kkMuhurle(efsane.id, { yol: 'davet' });
    expect(kkSirtSahip('meshale')).toBe(true);
  });
});
