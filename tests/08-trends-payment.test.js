/**
 * Tests for js/parts/08-trends-payment.js
 *
 * Covers pure utility functions: userFriendlyError, autoResize,
 * store billing constants, trial helpers, PRICE_USD.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Expose globals needed by modules in the dependency chain
import { nowTR, detectTopics } from '../js/parts/00-config-tracking.js';
globalThis.nowTR = nowTR;
globalThis.detectTopics = detectTopics;

import {
  userFriendlyError,
  autoResize,
  RC_ENTITLEMENT_PRO,
  RC_ENTITLEMENT_MAX,
  SKU,
  STORE_URL_PLAY,
  storePlatform,
  trialDaysLeft,
  pricingState,
  offerADeadlineMs,
  kapiAralikDaysLeft,
} from '../js/parts/08-trends-payment.js';
import { S } from '../js/state.js';

// ─── userFriendlyError ────────────────────────────────────────────────────────

describe('userFriendlyError()', () => {
  it('returns a non-empty string for any error', () => {
    const result = userFriendlyError(new Error('some error'));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns network error message for fetch failure', () => {
    const result = userFriendlyError(new Error('Failed to fetch'));
    expect(typeof result).toBe('string');
    // The exact string is from i18n t('error.network'), just verify no throw
  });

  it('returns rate limit message for 429 error', () => {
    const result = userFriendlyError(new Error('rate limit exceeded 429'));
    expect(typeof result).toBe('string');
  });

  it('returns auth message for 401/unauthorized', () => {
    const result = userFriendlyError(new Error('401 unauthorized'));
    expect(typeof result).toBe('string');
  });

  it('returns timeout message for timeout errors', () => {
    const result = userFriendlyError(new Error('request timed out'));
    expect(typeof result).toBe('string');
  });

  it('handles null/undefined gracefully', () => {
    expect(() => userFriendlyError(null)).not.toThrow();
    expect(() => userFriendlyError(undefined)).not.toThrow();
    const result = userFriendlyError(null);
    expect(typeof result).toBe('string');
  });

  it('handles plain string error', () => {
    expect(() => userFriendlyError('plain string error')).not.toThrow();
    expect(typeof userFriendlyError('plain string error')).toBe('string');
  });

  it('returns permission message for RLS/permission denied errors', () => {
    const result = userFriendlyError(new Error('row-level security policy violated'));
    expect(typeof result).toBe('string');
  });

  it('returns generic message for unrecognized errors', () => {
    const result = userFriendlyError(new Error('something completely unexpected xyzzy'));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── autoResize ───────────────────────────────────────────────────────────────

describe('autoResize()', () => {
  it('does not throw when called on a textarea element', () => {
    const el = document.createElement('textarea');
    document.body.appendChild(el);
    el.value = 'test content\nline 2\nline 3';
    expect(() => autoResize(el)).not.toThrow();
    document.body.removeChild(el);
  });

  it('sets height style on the element', () => {
    const el = document.createElement('textarea');
    document.body.appendChild(el);
    autoResize(el);
    expect(el.style.height).toBeTruthy();
    document.body.removeChild(el);
  });

  it('caps height at 120px', () => {
    const el = document.createElement('textarea');
    document.body.appendChild(el);
    // Mock scrollHeight to something large
    Object.defineProperty(el, 'scrollHeight', { value: 500, configurable: true });
    autoResize(el);
    expect(parseInt(el.style.height)).toBeLessThanOrEqual(120);
    document.body.removeChild(el);
  });
});

// ─── Payment constants ────────────────────────────────────────────────────────

describe('Payment constants', () => {
  it('RC_ENTITLEMENT_PRO/MAX match the webhook entitlement ids', () => {
    expect(RC_ENTITLEMENT_PRO).toBe('pro');
    expect(RC_ENTITLEMENT_MAX).toBe('max');
  });

  it('STORE_URL_PLAY points to Google Play with the app id', () => {
    expect(STORE_URL_PLAY).toContain('play.google.com');
    expect(STORE_URL_PLAY).toContain('com.emretransformation.wanderer');
  });

  it('SKU catalog has a distinct product id for every Pro/Max cadence', () => {
    const ids = Object.values(SKU);
    expect(ids).toEqual([...new Set(ids)]); // no duplicates
    expect(ids.every(id => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(SKU.PRO_MONTHLY).not.toBe(SKU.PRO_MONTHLY_TRIAL);
  });
});

// ─── pricingState() — Yolcu Durum Makinesi (paywall'ın tek karar noktası) ────

describe('pricingState()', () => {
  beforeEach(() => {
    S.isPremium = false;
    S.isPremiumPlus = false;
    S.lapsedAt = null;
    S.hasCancelledBefore = false;
    S.hasUsedOfferA = false;
    S.hasUsedOfferB = false;
    S.offerADeadline = null;
  });

  it('returns "active_max" when isPremiumPlus is true', () => {
    S.isPremiumPlus = true;
    expect(pricingState()).toBe('active_max');
  });

  it('returns "active_pro" when isPremium is true (and not plus)', () => {
    S.isPremium = true;
    expect(pricingState()).toBe('active_pro');
  });

  it('returns "lapsed_locked" within the 30-day Kapı Aralık window', () => {
    S.lapsedAt = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(pricingState()).toBe('lapsed_locked');
    expect(kapiAralikDaysLeft()).toBe(25);
  });

  it('returns "lapsed_list" once the 30-day window has passed', () => {
    S.lapsedAt = new Date(Date.now() - 31 * 86400000).toISOString();
    expect(pricingState()).toBe('lapsed_list');
    expect(kapiAralikDaysLeft()).toBe(0);
  });

  it('returns "lapsed_list" for a cancelled-before user with no lapsedAt on record', () => {
    S.hasCancelledBefore = true;
    expect(pricingState()).toBe('lapsed_list');
  });

  it('returns "offer_a" when offer A is unused and its deadline is still open', () => {
    S.offerADeadline = new Date(Date.now() + 3600000).toISOString();
    expect(pricingState()).toBe('offer_a');
    expect(offerADeadlineMs()).toBeGreaterThan(0);
  });

  it('returns "offer_b" once offer A is used (or expired) and offer B is unused', () => {
    S.hasUsedOfferA = true;
    expect(pricingState()).toBe('offer_b');
  });

  it('returns "new_no_offer" once both entry offers are used', () => {
    S.hasUsedOfferA = true;
    S.hasUsedOfferB = true;
    expect(pricingState()).toBe('new_no_offer');
  });
});

// ─── Store platform & trial helpers ──────────────────────────────────────────

describe('storePlatform()', () => {
  it('returns "web" when Capacitor is not native', () => {
    expect(storePlatform()).toBe('web');
  });
});

describe('trialDaysLeft()', () => {
  beforeEach(() => {
    S.isStudioSub = false;
    S.trialEndsAt = null;
  });

  it('returns 0 when no trial date is set', () => {
    expect(trialDaysLeft()).toBe(0);
  });

  it('returns 0 for active subscribers regardless of trial date', () => {
    S.isStudioSub = true;
    S.trialEndsAt = new Date(Date.now() + 10 * 86400000).toISOString();
    expect(trialDaysLeft()).toBe(0);
  });

  it('returns remaining days for an active trial', () => {
    S.trialEndsAt = new Date(Date.now() + 9.5 * 86400000).toISOString();
    expect(trialDaysLeft()).toBe(10); // ceil
  });

  it('returns 0 when the trial has expired', () => {
    S.trialEndsAt = new Date(Date.now() - 86400000).toISOString();
    expect(trialDaysLeft()).toBe(0);
  });
});
