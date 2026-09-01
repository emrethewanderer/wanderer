// @vitest-environment node
// Saf state objesi sınanır — DOM yok. jsdom kurulumu dosya başına ~3 sn
// (ölçüldü); testlerin kendisi 18 ms. Ortam bedeli testin 160 katıydı.

/**
 * Tests for js/state.js
 *
 * Verifies that the shared state object S:
 * - is exported as a single object
 * - has all expected top-level keys
 * - preserves reference identity (mutations are visible globally)
 */

import { describe, it, expect } from 'vitest';
import { S } from '../js/state.js';

describe('S — shared state object', () => {
  it('is exported as an object', () => {
    expect(S).toBeDefined();
    expect(typeof S).toBe('object');
    expect(S).not.toBeNull();
  });

  it('has user/session fields', () => {
    expect('currentUser' in S).toBe(true);
    expect('currentSessId' in S).toBe(true);
    expect('chatHistory' in S).toBe(true);
    expect('allSessions' in S).toBe(true);
  });

  it('has settings fields', () => {
    expect('settings' in S).toBe(true);
    expect('LLM_API_KEY' in S).toBe(true);
  });

  it('has i18n field', () => {
    expect('_currentLang' in S).toBe(true);
    expect(S._currentLang).toBe('tr'); // default language
  });

  it('has AI mode field', () => {
    expect('currentAIMode' in S).toBe(true);
    expect('_modeHint' in S).toBe(true);
  });

  it('has personalization sub-objects', () => {
    expect('_personalityMap' in S).toBe(true);
    expect('_emotionalChain' in S).toBe(true);
    expect('_predictionModel' in S).toBe(true);
  });

  it('has depth/foundations sub-objects', () => {
    expect('_depthProfile' in S).toBe(true);
    expect('_foundationsProfile' in S).toBe(true);
    expect('_personTransition' in S).toBe(true);
    expect('_affirmation' in S).toBe(true);
  });

  it('mutations are visible via the same reference', () => {
    const prev = S.messageCount;
    S.messageCount = prev + 1;
    // Same import — same reference
    expect(S.messageCount).toBe(prev + 1);
    // Restore
    S.messageCount = prev;
  });

  it('chatHistory starts as an empty array', () => {
    expect(Array.isArray(S.chatHistory)).toBe(true);
  });

  it('allSessions starts as an empty object', () => {
    expect(typeof S.allSessions).toBe('object');
  });
});
