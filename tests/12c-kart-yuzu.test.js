/**
 * Tests for js/parts/12c-kart-gorsel.js — KART YÜZÜ: ÇERÇEVE LEHÇESİ + DOKUNUŞ MERDİVENİ
 *
 * K1 (Yu-Gi-Oh çerçeve dili): kartın türü ilk bakışta okunur — golge/perde/tuzak
 * obsidyenin soğuk ucunda (.ikv-card--golge), diğerleri altın/lapis paletinde.
 * K2 (Pokémon nadirlik muamelesi): nadirlik etikette değil yüzeyde — folyo
 * katmanı nadirlikle güçlenir, künye koleksiyon numarasını + kök kredisini taşır.
 * Eski sözleşme: kilitli (fog) ve mini kart PARLAMAZ, mini'de künye yok.
 */

import { describe, it, expect } from 'vitest';
import { ikvCardFace } from '../js/parts/12c-kart-gorsel.js';

const CARD = {
  id: 'temel-ozsaygi-tac', name: 'Saygısı Tartışılmayan', category: 'temel',
  rarity: 'nadide', whisper: 'sınırın artık sessiz',
  kok: 'İlişki Felsefesi · Temeller — Öz Saygı (taç)',
  no: 7, noTotal: 12, catGlyph: '❖',
};
const GOLGE = { ...CARD, id: 'golge-onay', category: 'golge', rarity: 'nadir' };

describe('K1 — çerçeve lehçesi', () => {
  it('golge/perde/tuzak kartına gölge lehçesi sınıfı basar', () => {
    for (const cat of ['golge', 'perde', 'tuzak']) {
      expect(ikvCardFace({ ...CARD, category: cat })).toContain('ikv-card--golge');
    }
  });

  it('diğer kategoriler lehçe sınıfı almaz — altın/lapis dili bozulmaz', () => {
    for (const cat of ['temel', 'manifesto', 'gercek', 'bilesik', 'cekirdek']) {
      expect(ikvCardFace({ ...CARD, category: cat })).not.toContain('ikv-card--golge');
    }
  });

  it('lehçe altın ve lapis paletinin ÜSTÜNE biner (ikisini de ezmez)', () => {
    expect(ikvCardFace(GOLGE, { palette: 'gold' })).toContain('ikv-card--gold');
    expect(ikvCardFace(GOLGE, { palette: 'gold' })).toContain('ikv-card--golge');
    expect(ikvCardFace(GOLGE, { palette: 'lapis' })).toContain('ikv-card--lapis');
    expect(ikvCardFace(GOLGE, { palette: 'lapis' })).toContain('ikv-card--golge');
  });

  it('opts.frame ile bilinçli olarak ezilebilir', () => {
    expect(ikvCardFace(GOLGE, { frame: '' })).not.toContain('ikv-card--golge');
  });
});

describe('K2 — dokunuş merdiveni', () => {
  it('nadirliği yüzeye sınıf olarak yazar', () => {
    for (const r of ['yaygin', 'nadir', 'nadide', 'efsane']) {
      expect(ikvCardFace({ ...CARD, rarity: r })).toContain(`ikv-card--r-${r}`);
    }
  });

  it('folyo katmanı nadirlikle güçlenir; yaygın kart mat kalır', () => {
    expect(ikvCardFace({ ...CARD, rarity: 'yaygin' })).not.toContain('ikv-foil');
    const nadir = ikvCardFace({ ...CARD, rarity: 'nadir' });
    const efsane = ikvCardFace({ ...CARD, rarity: 'efsane' });
    expect(nadir).toContain('--ikv-foil:0.5');
    expect(efsane).toContain('--ikv-foil:1');
  });

  it('SÖZLEŞME: kilitli (fog) ve mini kart parlamaz', () => {
    expect(ikvCardFace(CARD, { fog: true })).not.toContain('ikv-foil');
    expect(ikvCardFace(CARD, { mini: true })).not.toContain('ikv-foil');
  });
});

describe('K3 — mertebe ve köken', () => {
  it('mertebe yıldız dilinde basılır (sayaç dili yok)', () => {
    expect(ikvCardFace(CARD, { mertebe: 3 })).toContain('✦✦✦');
    expect(ikvCardFace(CARD, { mertebe: 5 })).toContain('✦✦✦✦✦');
  });

  it('1. mertebe yıldız BASMAZ — kazanım anı zaten kökün kendisidir', () => {
    expect(ikvCardFace(CARD, { mertebe: 1 })).not.toContain('ikv-rank');
    expect(ikvCardFace(CARD, { mertebe: 0 })).not.toContain('ikv-rank');
  });

  it('mertebe 5\'te doyar, taşan değer kartı bozmaz', () => {
    const html = ikvCardFace(CARD, { mertebe: 9 });
    expect(html).toContain('✦✦✦✦✦');
    expect(html).not.toContain('✦✦✦✦✦✦');
  });

  it('kilitli/mini kartta mertebe ve köken gizlidir', () => {
    expect(ikvCardFace(CARD, { mertebe: 4, fog: true })).not.toContain('ikv-rank');
    expect(ikvCardFace(CARD, { mertebe: 4, mini: true })).not.toContain('ikv-rank');
    expect(ikvCardFace(CARD, { evrimden: '⟵ ÖZ SEVGİ · KÖK', mini: true })).not.toContain('ikv-evo');
  });

  it('köken satırı adın ÜSTÜNDE durur (Pokémon yerleşimi)', () => {
    const html = ikvCardFace(CARD, { evrimden: '⟵ ÖZ SEVGİ · KÖK' });
    expect(html).toContain('ikv-evo');
    expect(html.indexOf('ikv-evo')).toBeLessThan(html.indexOf('ikv-name'));
  });
});

describe('K2 — künye', () => {
  it('koleksiyon numarasını üç haneli, glifli ve toplamlı basar', () => {
    const html = ikvCardFace(CARD);
    expect(html).toContain('ikv-foot');
    expect(html).toContain('007 / 12');
    expect(html).toContain('❖');
  });

  it('kök kredisi kitabın adına indirgenir (ilk parça)', () => {
    expect(ikvCardFace(CARD)).toContain('İlişki Felsefesi');
    expect(ikvCardFace(CARD)).not.toContain('Öz Saygı (taç)');
  });

  it('sisli kartta kaynak saklanır, numara kalır', () => {
    const html = ikvCardFace(CARD, { fog: true });
    expect(html).toContain('007 / 12');
    expect(html).not.toContain('İlişki Felsefesi');
  });

  it('mini kartta künye hiç basılmaz (ızgara gürültüsü yok)', () => {
    expect(ikvCardFace(CARD, { mini: true })).not.toContain('ikv-foot');
  });

  it('numarasız kart (deste dışı tören kartı) künye olmadan çizilir', () => {
    const html = ikvCardFace({ id: 'sm-30', name: 'Karaktere Dönüş' });
    expect(html).not.toContain('ikv-foot');
    expect(html).toContain('ikv-card');
  });
});
