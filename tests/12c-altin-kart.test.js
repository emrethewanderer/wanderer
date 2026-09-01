/**
 * ALTIN KART (Hearthstone K4) — "prestij güç vermez, sanat verir"
 *   - kkAltinMi: EFSANE nadirlik VEYA mertebe 5; sahiplik şart
 *   - prestij hiçbir mekaniği değiştirmez: skor/mertebe/öneri aynı kalır
 *
 * 2026-08-07 · AD GÖÇÜ: mekaniğin adı "canlı kart" idi ve ödülü sahnenin
 * canlanmasıydı. Hareket HER kartın tabiatı olunca (bkz. 12c-hareket.test.js,
 * `opts.live` emekli) o ad yalan söylemeye başladı — her kart canlı. Ölçüt
 * aynı kaldı, ödül çerçeveye taşındı: kkCanliMi → kkAltinMi.
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

import { kkAltinMi, kkMatchCard, kkComputeSignals, kkRenderCard3D, kkEnsureStyles } from '../js/parts/10q-w2-kisi-karti.js';
import { ikvScene, ikvCardFace } from '../js/parts/12c-kart-gorsel.js';
import { deckReady, getFullDeck } from '../js/parts/12b-kart-destesi.js';
import { S } from '../js/state.js';

let deck = [], efsane = null, yaygin = null;
beforeAll(async () => {
  await deckReady();
  deck = getFullDeck();
  efsane = deck.find(c => c.rarity === 'efsane');
  yaygin = deck.find(c => c.rarity === 'yaygin');
}, 30000);

beforeEach(() => {
  S._kisiKarti = {
    profile: {}, collection: {}, history: [], seenIntro: true, lastTick: 0,
    closest: null, hedefler: {}, esik: {},
  };
});

const sahiplendir = (card, mertebe = 1) => {
  S._kisiKarti.collection[card.id] = {
    earnedAt: new Date().toISOString(), rarity: card.rarity, score: 80, mertebe,
  };
};

describe('kkAltinMi — prestijin ölçütü derinliktir', () => {
  it('sahip olunmayan kart yaşamaz — henüz senin değil', () => {
    expect(kkAltinMi(efsane)).toBe(false);
  });

  it('EFSANE kart sahipliyse yaşar (nadirlik yolu)', () => {
    sahiplendir(efsane, 1);
    expect(kkAltinMi(efsane)).toBe(true);
  });

  it('yaygın kart mertebe 5\'e ulaşınca yaşar (kök derinliği yolu)', () => {
    sahiplendir(yaygin, 4);
    expect(kkAltinMi(yaygin)).toBe(false);
    sahiplendir(yaygin, 5);
    expect(kkAltinMi(yaygin)).toBe(true);
  });

  it('kart yoksa çökmez', () => {
    expect(kkAltinMi(null)).toBe(false);
    expect(kkAltinMi(undefined)).toBe(false);
  });
});

/* 2026-08-07 — `opts.live` EMEKLİ. Canlılık artık bir ödül değil, kartın
   tabiatı: her kart yaşar, kilitli/sisli kart donuk durur. Hareket
   altyapısının kendi kapısı tests/12c-hareket.test.js'tedir; burada yalnız
   ESKİ bayrağın geri sızmadığı ve sahnenin gövdesinin bayraktan
   etkilenmediği mühürlenir. `kkAltinMi` yaşamayı sürdürüyor — prestijin
   yeni yeri (foil/Altın Kart) ayrı bir iştir. */
describe('ikvScene — eski canlılık bayrağı geri sızmaz', () => {
  it('--live sınıfı hiçbir çağrıda basılmaz', () => {
    for (const opts of [{}, { live: true }, { live: true, mini: true }, { live: true, fog: true }]) {
      expect(ikvScene(efsane, opts)).not.toContain('ikv-scene-svg--live');
    }
    expect(ikvCardFace(efsane, { live: true })).not.toContain('ikv-scene-svg--live');
  });

  it('kilitli/sisli kart donuk, sahipli kart yaşar', () => {
    expect(ikvScene(efsane, { fog: true })).toContain('ikv-scene-svg--donuk');
    expect(ikvScene(efsane, { locked: true })).toContain('ikv-scene-svg--donuk');
    expect(ikvScene(efsane, {})).not.toContain('--donuk');
  });

  it('yıldızlar ve zemin ışığı CSS\'in tutunacağı sınıfları taşır', () => {
    const svg = ikvScene(efsane, {});
    expect(svg).toContain('ikv-star');
    expect(/ikv-star[^>]*--i:/.test(svg)).toBe(true);   // her yıldıza kendi gecikmesi
  });
});

/* Prestijin YENİ YERİ (K3): hareket her kartın tabiatı olunca ayrıcalık
   çerçeveye taşındı — derinlik kazanmış kartın kenarı altınla mühürlenir ve
   folyosu tavana çıkar. Ölçüt (kkAltinMi) aynı kaldı; kazandırdığı değişti. */
describe('Altın Kart — prestij çerçevede', () => {
  it('derin kart altın kenarını kazanır, folyosu tavana çıkar', () => {
    sahiplendir(efsane, 1);
    const html = kkRenderCard3D(efsane, {});
    expect(html).toContain('kk-card3d--altin');
    expect(html).toContain('--foil:1');
  });

  it('sahip olunmayan kart altın değildir', () => {
    expect(kkRenderCard3D(efsane, {})).not.toContain('kk-card3d--altin');
  });

  it('KİLİTLİ kart altın olamaz — henüz senin değil', () => {
    sahiplendir(efsane, 5);
    expect(kkRenderCard3D(efsane, { locked: true })).not.toContain('kk-card3d--altin');
  });

  it('ızgarada da görünür — koleksiyonun gururu hücrede okunur', () => {
    sahiplendir(efsane, 1);
    expect(kkRenderCard3D(efsane, { mini: true })).toContain('kk-card3d--altin');
  });

  it('sığ kart altın değildir (mertebe 5 eşiği korunur)', () => {
    sahiplendir(yaygin, 4);
    expect(kkRenderCard3D(yaygin, {})).not.toContain('kk-card3d--altin');
    sahiplendir(yaygin, 5);
    expect(kkRenderCard3D(yaygin, {})).toContain('kk-card3d--altin');
  });

  it('reduced-motion nabzı durdurur ama ALTINI bırakır — ödül kaybolmaz', () => {
    document.getElementById('kk-styles')?.remove();
    kkEnsureStyles();
    const css = [...document.querySelectorAll('style')].map(s => s.textContent).join('\n');
    const rm = css.slice(css.indexOf('prefers-reduced-motion'));
    expect(rm).toContain('.kk-card3d--altin');
    expect(rm).toContain('box-shadow');
  });
});

describe('prestij KOZMETİKTİR — hiçbir mekaniği değiştirmez', () => {
  it('aynı kartın eşleşme skoru sahne çizilmesinden etkilenmez', () => {
    sahiplendir(efsane, 5);
    const sig = kkComputeSignals();
    const a = kkMatchCard(efsane, sig);
    ikvScene(efsane, {});                        // sahneyi çiz
    const b = kkMatchCard(efsane, sig);
    expect(b.score).toBe(a.score);
  });

  it('sahnenin GÖVDESİ kilit dışında hiçbir bayraktan etkilenmez', () => {
    // uid sayacı her çağrıda artar; onu nötrleyip gövdeleri karşılaştır
    const norm = (s) => s.replace(/ikv\d+/g, 'UID');
    expect(norm(ikvScene(yaygin, { live: true }))).toBe(norm(ikvScene(yaygin, {})));
  });
});
