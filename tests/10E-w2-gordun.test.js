// Gördün (10E) — Günün Penceresi determinizm + geri-çekilme (fallback) zinciri testleri
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { gorDayWindow } from '../js/parts/10E-w2-gordun.js';

function card(overrides) {
  return {
    id: 'oik_test', baslik: 'Cesur Olan', whisper: 'sessiz güç',
    dusunceler: [], inanclar: [], duygular: [], davranislar: [],
    ...overrides,
  };
}

beforeEach(() => {
  delete window.oikGetCard;
  delete window.oikGetDesired;
});
afterEach(() => {
  delete window.oikGetCard;
  delete window.oikGetDesired;
});

describe('gorDayWindow — kart maddelerinden deterministik seçim', () => {
  it('kartın maddeleri arasından bir madde seçer (source: oik)', () => {
    window.oikGetCard = () => card({
      inanclar: [{ text: 'Ben cesurum' }, { text: 'Korku bir işarettir' }],
      duygular: [{ text: 'huzur' }],
    });
    const win = gorDayWindow();
    expect(win.source).toBe('oik');
    expect(win.name).toBe('Cesur Olan');
    expect(['Ben cesurum', 'Korku bir işarettir', 'huzur']).toContain(win.text);
    expect(win.catLabel).toBeTruthy();
  });

  it('aynı gün + aynı kart → aynı madde (deterministik)', () => {
    window.oikGetCard = () => card({
      inanclar: [{ text: 'A' }, { text: 'B' }, { text: 'C' }],
      duygular: [{ text: 'D' }], davranislar: [{ text: 'E' }], dusunceler: [{ text: 'F' }],
    });
    const a = gorDayWindow();
    const b = gorDayWindow();
    expect(a.text).toBe(b.text);
    expect(a.cat).toBe(b.cat);
  });

  it('madde yoksa fısıltı/olumlamaya geri çekilir', () => {
    window.oikGetCard = () => card({ whisper: 'bir fısıltı', olumlama: 'Ben huzurluyum' });
    const win = gorDayWindow();
    expect(win.source).toBe('oik');
    expect(win.cat).toBeNull();
    expect(win.text).toBe('bir fısıltı');
  });

  it('kart hiç yoksa oikGetDesired açıklamasına geri çekilir', () => {
    window.oikGetDesired = () => ({ name: 'Sabırlı Kişi', description: 'Sabırlı ve dingin biri' });
    const win = gorDayWindow();
    expect(win.source).toBe('desired');
    expect(win.text).toBe('Sabırlı ve dingin biri');
    expect(win.name).toBe('Sabırlı Kişi');
  });

  it('hiçbiri yoksa boş pencere (source: empty, text: null)', () => {
    const win = gorDayWindow();
    expect(win.source).toBe('empty');
    expect(win.text).toBeNull();
  });
});
