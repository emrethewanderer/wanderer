/**
 * Tests for js/parts/00c-html-safe.js
 *
 * DOMPurify is mocked globally as passthrough, so these tests verify:
 * - API surface (functions exported & callable)
 * - Null/undefined handling
 * - DOM mutations are applied
 * Real XSS sanitization is verified in production via DOMPurify itself.
 */

import { describe, it, expect } from 'vitest';
import { safeHTML, setHTML, setText, safeMarkdownHTML } from '../js/parts/00c-html-safe.js';

describe('safeHTML(html, opts)', () => {
  it('returns empty string for null/undefined', () => {
    expect(safeHTML(null)).toBe('');
    expect(safeHTML(undefined)).toBe('');
  });

  it('coerces non-string input to string', () => {
    expect(typeof safeHTML(42)).toBe('string');
    expect(typeof safeHTML({})).toBe('string');
  });

  it('passes through safe content (mock)', () => {
    // With mock DOMPurify (passthrough): output ≈ input
    expect(safeHTML('<p>hello</p>')).toContain('hello');
  });
});

describe('setHTML(el, html)', () => {
  it('no-ops when el is null', () => {
    expect(() => setHTML(null, '<p>x</p>')).not.toThrow();
  });

  it('sets innerHTML on a real DOM element', () => {
    const div = document.createElement('div');
    setHTML(div, '<span>hi</span>');
    expect(div.innerHTML).toContain('hi');
  });

  it('handles null html by clearing innerHTML', () => {
    const div = document.createElement('div');
    div.innerHTML = 'existing';
    setHTML(div, null);
    expect(div.innerHTML).toBe('');
  });
});

describe('setText(el, str)', () => {
  it('sets textContent without HTML interpretation', () => {
    const div = document.createElement('div');
    setText(div, '<script>alert(1)</script>');
    expect(div.textContent).toBe('<script>alert(1)</script>');
    expect(div.querySelector('script')).toBeNull();
  });

  it('handles null/undefined as empty string', () => {
    const div = document.createElement('div');
    div.textContent = 'old';
    setText(div, null);
    expect(div.textContent).toBe('');
  });

  it('no-ops when el is null', () => {
    expect(() => setText(null, 'x')).not.toThrow();
  });
});

describe('safeMarkdownHTML(html)', () => {
  it('is callable with string', () => {
    expect(typeof safeMarkdownHTML('<p>md</p>')).toBe('string');
  });

  it('handles null input', () => {
    expect(safeMarkdownHTML(null)).toBe('');
  });
});
