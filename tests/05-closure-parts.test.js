/**
 * Tests for js/parts/05-closure-parts.js
 *
 * Covers pure utility functions: closureDayKey, closureLocalKey,
 * isClosureDoneToday, markClosureDone, getRegionLabels, getSensationLabels.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  closureDayKey,
  closureLocalKey,
  isClosureDoneToday,
} from '../js/parts/05-closure-parts.js';
import { SafeStorage, localISODate } from '../js/parts/00a-infrastructure.js';
import { toTR } from '../js/parts/00-config-tracking.js';

// ─── closureDayKey ────────────────────────────────────────────────────────────

describe('closureDayKey()', () => {
  it('returns a string in YYYY-MM-DD format', () => {
    const key = closureDayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('uses current date by default', () => {
    // closureDayKey() TR-yerel tarihi kullanır (localISODate∘toTR). UTC tabanlı
    // toISOString() gece yarısı–03:00 arasında dünün anahtarına düşer, bu yüzden
    // beklenen değeri de aynı yerel mantıkla üretiyoruz (yerel-tarih-anahtari).
    const today = localISODate(toTR(new Date()));
    expect(closureDayKey()).toBe(today);
  });

  it('uses the provided date argument', () => {
    const specificDate = new Date('2025-03-15');
    expect(closureDayKey(specificDate)).toBe('2025-03-15');
  });

  it('handles month edge cases (single digit months with zero-padding)', () => {
    const jan = new Date('2025-01-05');
    expect(closureDayKey(jan)).toBe('2025-01-05');
  });
});

// ─── closureLocalKey ─────────────────────────────────────────────────────────

describe('closureLocalKey()', () => {
  it('returns a string starting with etw_closure_', () => {
    const key = closureLocalKey();
    expect(key).toMatch(/^etw_closure_\d{4}-\d{2}-\d{2}$/);
  });

  it('includes the day key in the result', () => {
    const date = new Date('2025-06-20');
    expect(closureLocalKey(date)).toBe('etw_closure_2025-06-20');
  });
});

// ─── isClosureDoneToday ───────────────────────────────────────────────────────

describe('isClosureDoneToday()', () => {
  beforeEach(() => {
    localStorage.clear();
    SafeStorage.remove(closureLocalKey());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    SafeStorage.remove(closureLocalKey(yesterday));
  });

  it('returns false when no closure entry exists', () => {
    expect(isClosureDoneToday()).toBe(false);
  });

  it('returns true when closure is marked via SafeStorage', () => {
    SafeStorage.setRaw(closureLocalKey(), '1');
    expect(isClosureDoneToday()).toBe(true);
  });

  it('returns false if closure was marked on a different day', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    SafeStorage.setRaw(closureLocalKey(yesterday), '1');
    expect(isClosureDoneToday()).toBe(false);
  });

  it('returns false for any value other than "1"', () => {
    const key = closureLocalKey();
    SafeStorage.setRaw(key, 'true');
    expect(isClosureDoneToday()).toBe(false);

    SafeStorage.setRaw(key, '');
    expect(isClosureDoneToday()).toBe(false);
  });
});
