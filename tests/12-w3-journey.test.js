/**
 * Tests for js/parts/12-w3-journey.js
 *
 * Covers pure utility functions: w3GetDaySessionId, w3GetDayKey,
 * w3DayKeyToDate, w3ParseFallback, toRoman.
 */

import { describe, it, expect } from 'vitest';
import {
  w3GetDaySessionId,
  w3GetDayKey,
  w3DayKeyToDate,
  w3ParseFallback,
  toRoman,
} from '../js/parts/12-w3-journey.js';

// ─── w3GetDaySessionId ────────────────────────────────────────────────────────

describe('w3GetDaySessionId()', () => {
  it('returns a string starting with "day_"', () => {
    const result = w3GetDaySessionId(new Date());
    expect(result).toMatch(/^day_\d{4}-\d{2}-\d{2}$/);
  });

  it('uses today when no argument provided', () => {
    const today = new Date();
    const expected = `day_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(w3GetDaySessionId()).toBe(expected);
  });

  it('formats a specific date correctly', () => {
    const date = new Date(2025, 2, 5); // March 5, 2025
    expect(w3GetDaySessionId(date)).toBe('day_2025-03-05');
  });

  it('zero-pads single-digit months and days', () => {
    const date = new Date(2025, 0, 7); // Jan 7
    expect(w3GetDaySessionId(date)).toBe('day_2025-01-07');
  });
});

// ─── w3GetDayKey ─────────────────────────────────────────────────────────────

describe('w3GetDayKey()', () => {
  it('accepts a Date object', () => {
    const date = new Date(2025, 3, 15); // April 15
    const key = w3GetDayKey(date);
    expect(typeof key).toBe('string');
    expect(key).toContain('2025');
  });

  it('accepts an ISO string', () => {
    const key = w3GetDayKey('2025-06-20T10:00:00.000Z');
    expect(typeof key).toBe('string');
    expect(key.length).toBeGreaterThan(0);
  });

  it('returns consistent key format (Y-M-D with raw month index)', () => {
    const date = new Date(2025, 5, 20); // June (month=5), 20
    const key = w3GetDayKey(date);
    // Format is "year-monthIndex-day" (note: no zero-padding, uses getMonth())
    expect(key).toBe(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
  });
});

// ─── w3DayKeyToDate ───────────────────────────────────────────────────────────

describe('w3DayKeyToDate()', () => {
  it('converts "2025-5-20" back to a Date', () => {
    const date = w3DayKeyToDate('2025-5-20');
    expect(date).toBeInstanceOf(Date);
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(5);  // June (0-indexed)
    expect(date.getDate()).toBe(20);
  });

  it('round-trips through w3GetDayKey', () => {
    const original = new Date(2025, 3, 10); // April 10
    const key = w3GetDayKey(original);
    const restored = w3DayKeyToDate(key);
    expect(restored.getFullYear()).toBe(original.getFullYear());
    expect(restored.getMonth()).toBe(original.getMonth());
    expect(restored.getDate()).toBe(original.getDate());
  });
});

// ─── w3ParseFallback ──────────────────────────────────────────────────────────

describe('w3ParseFallback()', () => {
  it('returns null for null/undefined/empty', () => {
    expect(w3ParseFallback(null)).toBeNull();
    expect(w3ParseFallback('')).toBeNull();
    expect(w3ParseFallback(undefined)).toBeNull();
  });

  it('extracts JSON object from markdown code block', () => {
    const raw = 'Some text before\n```\n{"title":"Test","tone":"calm"}\n```\nAfter';
    const result = w3ParseFallback(raw);
    expect(result).not.toBeNull();
    expect(result.title).toBe('Test');
    expect(result.tone).toBe('calm');
  });

  it('extracts inline JSON object', () => {
    const raw = 'Here is the result: {"key": "value", "num": 42}';
    const result = w3ParseFallback(raw);
    expect(result).not.toBeNull();
    expect(result.key).toBe('value');
    expect(result.num).toBe(42);
  });

  it('returns null for text with no JSON object', () => {
    const raw = 'This has no JSON object at all.';
    expect(w3ParseFallback(raw)).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    const raw = '{bad json: not valid}';
    expect(w3ParseFallback(raw)).toBeNull();
  });

  it('handles nested JSON objects', () => {
    const raw = '{"outer": {"inner": "value"}}';
    const result = w3ParseFallback(raw);
    expect(result).not.toBeNull();
    expect(result.outer.inner).toBe('value');
  });
});

// ─── toRoman ─────────────────────────────────────────────────────────────────

describe('toRoman()', () => {
  it('converts 1 to I', () => {
    expect(toRoman(1)).toBe('I');
  });

  it('converts 4 to IV', () => {
    expect(toRoman(4)).toBe('IV');
  });

  it('converts 9 to IX', () => {
    expect(toRoman(9)).toBe('IX');
  });

  it('converts 10 to X', () => {
    expect(toRoman(10)).toBe('X');
  });

  it('converts 14 to XIV', () => {
    expect(toRoman(14)).toBe('XIV');
  });

  it('converts 40 to XL', () => {
    expect(toRoman(40)).toBe('XL');
  });

  it('converts 50 to L', () => {
    expect(toRoman(50)).toBe('L');
  });

  it('converts 100 to C', () => {
    expect(toRoman(100)).toBe('C');
  });

  it('returns a string', () => {
    expect(typeof toRoman(5)).toBe('string');
  });
});
