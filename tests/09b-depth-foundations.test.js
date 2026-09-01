/**
 * Tests for js/parts/09b-depth-foundations.js
 *
 * Covers pure logic: signal detection, score updates, label generation,
 * person transition extraction.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../js/state.js';
import {
  dfAnalyzeDepthSignals,
  dfAnalyzeFoundationSignals,
  dfExtractPersonTransition,
  _dfScoreLabel,
} from '../js/parts/09b-depth-foundations.js';

function resetDepthProfile() {
  const makeEntry = () => ({
    score: 50, direction: 'flat', signals_count: 0, evidence: []
  });
  S._depthProfile = {
    standart:  makeEntry(),
    hak_etmek: makeEntry(),
    normal:    makeEntry(),
    layik:     makeEntry(),
  };
  S._foundationsProfile = {
    oz_sevgi: makeEntry(),
    oz_saygi: makeEntry(),
    oz_deger: makeEntry(),
    oz_guven: makeEntry(),
    bolluk:   makeEntry(),
  };
  S._personTransition = {
    current: { description: '', confidence: 0 },
    desired: { description: '', confidence: 0 },
    unwanted: { description: '' },
    domains: {
      bireysel: { current: '', desired: '' },
      iliski:   { current: '', desired: '' },
      is:       { current: '', desired: '' },
    },
    last_updated: null,
  };
}

// ─── _dfScoreLabel ────────────────────────────────────────────────────────────

describe('_dfScoreLabel()', () => {
  it('returns DÜŞÜK for score < 30', () => {
    expect(_dfScoreLabel(0)).toBe('DÜŞÜK');
    expect(_dfScoreLabel(15)).toBe('DÜŞÜK');
    expect(_dfScoreLabel(29)).toBe('DÜŞÜK');
  });

  it('returns ORTA-DÜŞÜK for score 30-49', () => {
    expect(_dfScoreLabel(30)).toBe('ORTA-DÜŞÜK');
    expect(_dfScoreLabel(40)).toBe('ORTA-DÜŞÜK');
    expect(_dfScoreLabel(49)).toBe('ORTA-DÜŞÜK');
  });

  it('returns ORTA for score 50-69', () => {
    expect(_dfScoreLabel(50)).toBe('ORTA');
    expect(_dfScoreLabel(60)).toBe('ORTA');
    expect(_dfScoreLabel(69)).toBe('ORTA');
  });

  it('returns GÜÇLÜ for score >= 70', () => {
    expect(_dfScoreLabel(70)).toBe('GÜÇLÜ');
    expect(_dfScoreLabel(85)).toBe('GÜÇLÜ');
    expect(_dfScoreLabel(100)).toBe('GÜÇLÜ');
  });
});

// ─── dfAnalyzeDepthSignals ────────────────────────────────────────────────────

describe('dfAnalyzeDepthSignals()', () => {
  beforeEach(resetDepthProfile);

  it('decreases standart score on low signal', () => {
    const before = S._depthProfile.standart.score;
    dfAnalyzeDepthSignals('buna alıştım artık, hep böyle oldu');
    expect(S._depthProfile.standart.score).toBeLessThan(before);
  });

  it('increases standart score on high signal', () => {
    const before = S._depthProfile.standart.score;
    dfAnalyzeDepthSignals('bunu kabul etmeyeceğim, sınırım bu');
    expect(S._depthProfile.standart.score).toBeGreaterThan(before);
  });

  it('decreases hak_etmek score on low signal', () => {
    const before = S._depthProfile.hak_etmek.score;
    dfAnalyzeDepthSignals('zaten beni kim sever, bunu hak etmiyorum');
    expect(S._depthProfile.hak_etmek.score).toBeLessThan(before);
  });

  it('increases hak_etmek score on high signal', () => {
    const before = S._depthProfile.hak_etmek.score;
    dfAnalyzeDepthSignals('bunu hak ediyorum, değerimi biliyorum');
    expect(S._depthProfile.hak_etmek.score).toBeGreaterThan(before);
  });

  it('does not change score for neutral text', () => {
    const beforeStandart = S._depthProfile.standart.score;
    const beforeHak = S._depthProfile.hak_etmek.score;
    dfAnalyzeDepthSignals('bugün hava güzeldi, dışarı çıktım');
    expect(S._depthProfile.standart.score).toBe(beforeStandart);
    expect(S._depthProfile.hak_etmek.score).toBe(beforeHak);
  });

  it('caps score at 95 (does not exceed)', () => {
    S._depthProfile.standart.score = 93;
    dfAnalyzeDepthSignals('bunu kabul etmeyeceğim');
    expect(S._depthProfile.standart.score).toBeLessThanOrEqual(95);
  });

  it('floors score at 5 (does not go below)', () => {
    S._depthProfile.hak_etmek.score = 7;
    dfAnalyzeDepthSignals('zaten beni kim sever ki, beni kim ister ki');
    expect(S._depthProfile.hak_etmek.score).toBeGreaterThanOrEqual(5);
  });

  it('updates direction to "down" on low signal', () => {
    dfAnalyzeDepthSignals('buna alıştım, hep böyle oldu');
    expect(S._depthProfile.standart.direction).toBe('down');
  });

  it('updates direction to "up" on high signal', () => {
    dfAnalyzeDepthSignals('bunu kabul etmeyeceğim');
    expect(S._depthProfile.standart.direction).toBe('up');
  });

  it('records evidence entry', () => {
    dfAnalyzeDepthSignals('buna alıştım artık');
    expect(S._depthProfile.standart.evidence.length).toBeGreaterThan(0);
    expect(S._depthProfile.standart.evidence[0]).toHaveProperty('type', 'low');
    expect(S._depthProfile.standart.evidence[0]).toHaveProperty('text');
    expect(S._depthProfile.standart.evidence[0]).toHaveProperty('ts');
  });

  it('keeps evidence list at max 5 entries (FIFO)', () => {
    for (let i = 0; i < 7; i++) {
      dfAnalyzeDepthSignals('buna alıştım artık');
    }
    expect(S._depthProfile.standart.evidence.length).toBeLessThanOrEqual(5);
  });

  it('increments signals_count', () => {
    dfAnalyzeDepthSignals('bunu kabul etmeyeceğim');
    expect(S._depthProfile.standart.signals_count).toBe(1);
  });
});

// ─── dfAnalyzeFoundationSignals ───────────────────────────────────────────────

describe('dfAnalyzeFoundationSignals()', () => {
  beforeEach(resetDepthProfile);

  it('changes bolluk score on low signal', () => {
    const before = S._foundationsProfile.bolluk.score;
    dfAnalyzeFoundationSignals('o olmadan yapamam, tek o var, bir daha bulamam');
    expect(S._foundationsProfile.bolluk.score).not.toBe(before);
  });

  it('does not crash on empty text', () => {
    expect(() => dfAnalyzeFoundationSignals('')).not.toThrow();
  });

  it('does not crash on very long text', () => {
    const long = 'normal text '.repeat(200);
    expect(() => dfAnalyzeFoundationSignals(long)).not.toThrow();
  });
});

// ─── dfExtractPersonTransition ────────────────────────────────────────────────

describe('dfExtractPersonTransition()', () => {
  beforeEach(resetDepthProfile);

  it('extracts current description from matching pattern', () => {
    dfExtractPersonTransition('Ben şu an çok kaygılı ve kendini sorgulayan birisiyim');
    expect(S._personTransition.current.description.length).toBeGreaterThan(0);
  });

  it('extracts desired description from matching pattern', () => {
    dfExtractPersonTransition('olmak istiyorum daha sakin ve güvenli biri gibi hisseden');
    expect(S._personTransition.desired.description.length).toBeGreaterThan(0);
  });

  it('extracts unwanted description', () => {
    dfExtractPersonTransition('olmak istemiyorum sürekli korkan ve kaçan biri gibi');
    expect(S._personTransition.unwanted.description.length).toBeGreaterThan(0);
  });

  it('does not overwrite existing unwanted description', () => {
    dfExtractPersonTransition('olmak istemiyorum sürekli korkan biri');
    const first = S._personTransition.unwanted.description;
    dfExtractPersonTransition('olmak istemiyorum farklı biri olmak');
    expect(S._personTransition.unwanted.description).toBe(first);
  });

  it('sets last_updated timestamp on change', () => {
    dfExtractPersonTransition('Ben şu an çok kaygılı birisiyim');
    expect(S._personTransition.last_updated).not.toBeNull();
  });

  it('does not throw for text with no transition pattern', () => {
    expect(() =>
      dfExtractPersonTransition('Bugün hava çok güzeldi')
    ).not.toThrow();
    expect(S._personTransition.current.description).toBe('');
  });
});
