/**
 * Tests for js/parts/00a-infrastructure.js
 *
 * Pure utility functions — no Supabase, no external network.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SafeStorage,
  MemCache,
  ErrorBoundary,
  EventBus,
  RateLimiter,
  debounce,
  throttle,
  escapeHTML,
  STORAGE_KEYS,
  showToast,
  hapticTap,
  zamanAgirligi,
} from '../js/parts/00a-infrastructure.js';

// ─── SafeStorage ─────────────────────────────────────────────────────────────
describe('SafeStorage', () => {
  beforeEach(() => localStorage.clear());

  it('set + get round-trips plain object', () => {
    const obj = { name: 'Emre', score: 42 };
    SafeStorage.set('test_key', obj);
    expect(SafeStorage.get('test_key')).toEqual(obj);
  });

  it('returns null for missing key (default fallback)', () => {
    expect(SafeStorage.get('nonexistent_key_xyz')).toBeNull();
  });

  it('returns custom fallback for missing key', () => {
    expect(SafeStorage.get('missing', 'default_val')).toBe('default_val');
  });

  it('remove deletes the key', () => {
    SafeStorage.set('rem_key', { x: 1 });
    SafeStorage.remove('rem_key');
    expect(SafeStorage.get('rem_key')).toBeNull();
  });

  it('setRaw + getRaw round-trips string', () => {
    SafeStorage.setRaw('raw_key', 'hello world');
    expect(SafeStorage.getRaw('raw_key')).toBe('hello world');
  });

  it('handles corrupt JSON gracefully', () => {
    localStorage.setItem('corrupt', '{bad_json');
    expect(SafeStorage.get('corrupt')).toBeNull();
  });

  it('handles localStorage quota error gracefully', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => SafeStorage.set('quota_key', { big: 'data' })).not.toThrow();
    spy.mockRestore();
  });
});

// ─── MemCache ─────────────────────────────────────────────────────────────────
// MemCache.get(key, loader) — loader is a function called when key is absent
describe('MemCache', () => {
  beforeEach(() => MemCache.clear());

  it('set + get with loader round-trips value', () => {
    MemCache.set('mc_key', { result: 'cached' });
    const val = MemCache.get('mc_key', () => null);
    expect(val).toEqual({ result: 'cached' });
  });

  it('calls loader when key is absent', () => {
    const loader = vi.fn().mockReturnValue('loaded_value');
    const val = MemCache.get('mc_missing', loader);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(val).toBe('loaded_value');
  });

  it('caches loader result — subsequent get does not call loader again', () => {
    const loader = vi.fn().mockReturnValue('once');
    MemCache.get('once_key', loader);
    MemCache.get('once_key', loader);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('clear removes all entries — next get calls loader', () => {
    MemCache.set('a', 1);
    MemCache.set('b', 2);
    MemCache.clear();
    const loaderA = vi.fn().mockReturnValue(99);
    MemCache.get('a', loaderA);
    expect(loaderA).toHaveBeenCalled();
  });

  it('invalidate removes a specific key', () => {
    MemCache.set('inv_key', 'x');
    MemCache.invalidate('inv_key');
    const loader = vi.fn().mockReturnValue('reloaded');
    expect(MemCache.get('inv_key', loader)).toBe('reloaded');
  });

  it('isDirty is true after set, false after markClean', () => {
    MemCache.set('dirty_key', 'val');
    expect(MemCache.isDirty('dirty_key')).toBe(true);
    MemCache.markClean('dirty_key');
    expect(MemCache.isDirty('dirty_key')).toBe(false);
  });

  it('flush calls saver only when dirty', () => {
    const saver = vi.fn();
    MemCache.set('flush_key', 'data');   // marks dirty
    MemCache.flush('flush_key', saver);
    expect(saver).toHaveBeenCalledWith('data');
    // After flush, no longer dirty — calling again should not call saver
    MemCache.flush('flush_key', saver);
    expect(saver).toHaveBeenCalledTimes(1);
  });
});

// ─── ErrorBoundary ────────────────────────────────────────────────────────────
// ErrorBoundary.run(label, fn) returns the fn's return value on success,
// or undefined (fallback) on error.
describe('ErrorBoundary', () => {
  it('run returns fn result on success', async () => {
    const result = await ErrorBoundary.run('test', async () => 42);
    expect(result).toBe(42);
  });

  it('run returns undefined when fn throws', async () => {
    const result = await ErrorBoundary.run('fail', async () => {
      throw new Error('boom');
    });
    expect(result).toBeUndefined();
  });

  it('run returns custom fallback on error', async () => {
    const result = await ErrorBoundary.run('fb', async () => {
      throw new Error('err');
    }, { fallback: 'safe_default' });
    expect(result).toBe('safe_default');
  });

  it('run handles sync functions', async () => {
    const result = await ErrorBoundary.run('sync', () => 'sync_value');
    expect(result).toBe('sync_value');
  });

  it('getErrors records failed runs', async () => {
    ErrorBoundary.clear();
    await ErrorBoundary.run('tracked', async () => { throw new Error('x'); });
    const errs = ErrorBoundary.getErrors();
    expect(errs.length).toBeGreaterThanOrEqual(1);
    expect(errs[errs.length - 1].label).toBe('tracked');
  });
});

// ─── EventBus ─────────────────────────────────────────────────────────────────
// EventBus.on() returns an unsubscribe function (no separate .off())
describe('EventBus', () => {
  it('on + emit calls listener with data', () => {
    const spy = vi.fn();
    const unsub = EventBus.on('test.event', spy);
    EventBus.emit('test.event', { x: 1 });
    expect(spy).toHaveBeenCalledWith({ x: 1 });
    unsub(); // clean up
  });

  it('unsubscribe from on() stops listener', () => {
    const spy = vi.fn();
    const unsub = EventBus.on('rm.event', spy);
    unsub(); // unsubscribe
    EventBus.emit('rm.event', {});
    expect(spy).not.toHaveBeenCalled();
  });

  it('multiple listeners for same event all fire', () => {
    const spy1 = vi.fn();
    const spy2 = vi.fn();
    const u1 = EventBus.on('multi', spy1);
    const u2 = EventBus.on('multi', spy2);
    EventBus.emit('multi', 'data');
    expect(spy1).toHaveBeenCalledWith('data');
    expect(spy2).toHaveBeenCalledWith('data');
    u1(); u2();
  });

  it('emit with no listeners does not throw', () => {
    expect(() => EventBus.emit('no.listeners', {})).not.toThrow();
  });

  it('once() fires only one time', () => {
    const spy = vi.fn();
    EventBus.once('once.event', spy);
    EventBus.emit('once.event', 1);
    EventBus.emit('once.event', 2);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(1);
  });
});

// ─── RateLimiter ─────────────────────────────────────────────────────────────
// RateLimiter is a singleton with canSend(), record(), reset()
describe('RateLimiter', () => {
  beforeEach(() => RateLimiter.reset());

  it('canSend returns true initially', () => {
    expect(RateLimiter.canSend()).toBe(true);
  });

  it('record + canSend within interval returns false', () => {
    RateLimiter.record(); // record a send
    // Next call is within MIN_INTERVAL_MS (1s) — should block
    expect(RateLimiter.canSend()).toBe(false);
  });

  it('remaining decreases after record', () => {
    const before = RateLimiter.remaining();
    RateLimiter.record();
    expect(RateLimiter.remaining()).toBe(before - 1);
  });

  it('reset restores full capacity', () => {
    RateLimiter.record();
    RateLimiter.reset();
    expect(RateLimiter.remaining()).toBe(15); // MAX_PER_MINUTE
  });
});

// ─── debounce ─────────────────────────────────────────────────────────────────
describe('debounce', () => {
  it('delays execution and only fires once after burst', async () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const debounced = debounce(spy, 100);

    debounced('a');
    debounced('b');
    debounced('c');

    expect(spy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('c');
    vi.useRealTimers();
  });
});

// ─── throttle ─────────────────────────────────────────────────────────────────
describe('throttle', () => {
  it('fires immediately on first call', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const throttled = throttle(spy, 100);

    throttled('first');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('first');
    vi.useRealTimers();
  });

  it('suppresses rapid calls within throttle window', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const throttled = throttle(spy, 100);

    throttled('a');
    throttled('b');
    throttled('c');
    expect(spy).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('allows call after window expires', () => {
    vi.useFakeTimers();
    const spy = vi.fn();
    const throttled = throttle(spy, 100);

    throttled('first');
    vi.advanceTimersByTime(150);
    throttled('second');
    expect(spy).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

// ─── zamanAgirligi ──────────────────────────────────────────────────────────
// Tanıma Motoru K5 (2026-08-09): 13l-kimlik-motoru.js'in erdem çürümesiyle
// (Math.pow(2, -age/HALF_LIFE)) 09i-secici.js'in ortak yardımcısı — davranış
// birebir korunmalı, bu yüzden matematiği burada doğrudan sabitliyoruz.
const GUN_MS = 24 * 60 * 60 * 1000;
describe('zamanAgirligi', () => {
  it('yaş=0 iken ağırlık tam (1)', () => {
    expect(zamanAgirligi(Date.now(), 7)).toBeCloseTo(1, 5);
  });

  it('tam bir yarı ömür geçince ağırlık 0.5', () => {
    expect(zamanAgirligi(Date.now() - 7 * GUN_MS, 7)).toBeCloseTo(0.5, 2);
  });

  it('iki yarı ömür geçince ağırlık 0.25', () => {
    expect(zamanAgirligi(Date.now() - 14 * GUN_MS, 7)).toBeCloseTo(0.25, 2);
  });

  it('ts düşerse (0/null/undefined) "az önce" sayılır — 13l\'nin eski `e.t || now` düşüşüyle aynı', () => {
    expect(zamanAgirligi(null, 7)).toBeCloseTo(1, 5);
    expect(zamanAgirligi(undefined, 7)).toBeCloseTo(1, 5);
    expect(zamanAgirligi(0, 7)).toBeCloseTo(1, 5);
  });

  it('ISO string zaman damgasını da kabul eder (13l ham sayı geçer, seçici ISO da geçebilir)', () => {
    const iso = new Date(Date.now() - 7 * GUN_MS).toISOString();
    expect(zamanAgirligi(iso, 7)).toBeCloseTo(0.5, 2);
  });

  it('yariOmurGun verilmezse/geçersizse varsayılan 7 gün kullanılır', () => {
    expect(zamanAgirligi(Date.now() - 7 * GUN_MS, undefined)).toBeCloseTo(0.5, 2);
    expect(zamanAgirligi(Date.now() - 7 * GUN_MS, -3)).toBeCloseTo(0.5, 2);
  });
});

// ─── escapeHTML ───────────────────────────────────────────────────────────────
describe('escapeHTML', () => {
  it('escapes < > & " characters', () => {
    expect(escapeHTML('<script>alert("xss")</script>'))
      .toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('escapes ampersand', () => {
    expect(escapeHTML('a & b')).toBe('a &amp; b');
  });

  it('leaves safe text unchanged', () => {
    expect(escapeHTML('Hello, World!')).toBe('Hello, World!');
  });

  it('handles empty string', () => {
    expect(escapeHTML('')).toBe('');
  });

  it('handles null/undefined gracefully', () => {
    expect(() => escapeHTML(null)).not.toThrow();
    expect(() => escapeHTML(undefined)).not.toThrow();
  });

  // ─── Tip güvenliği (denetim C1) ─────────────────────────────────────────
  // Bu blok, 22 modülün kendi `esc` ikizini yazmasına yol açan kırığın
  // bekçisidir. Eski hâl sayıda ÇÖKÜYOR, 0 ve false'u yutuyordu; ikizler
  // tam da bu yüzden vardı. Tek kaynak onları karşılayamazsa ikizler geri
  // gelir — o yüzden bu vakalar kapıdır, tören değil.
  it('sayıyı çökmeden kaçırır — eski hâli TypeError atıyordu', () => {
    expect(() => escapeHTML(123)).not.toThrow();
    expect(escapeHTML(123)).toBe('123');
  });

  it('0 ve false yok olmaz — falsy ama boş değiller', () => {
    expect(escapeHTML(0)).toBe('0');
    expect(escapeHTML(false)).toBe('false');
  });

  it('nesne ve dizi de çökmez', () => {
    expect(() => escapeHTML({ a: 1 })).not.toThrow();
    expect(escapeHTML([1, 2])).toBe('1,2');
  });

  it('tek tırnağı da kaçırır — tek-tırnaklı attribute bağlamı', () => {
    // Altı ikiz bunu yapmıyordu: title='...' içinde çıkış mümkündü.
    expect(escapeHTML("' onmouseover='alert(1)"))
      .toBe('&#39; onmouseover=&#39;alert(1)');
  });

  it('null ve undefined boş string döner', () => {
    expect(escapeHTML(null)).toBe('');
    expect(escapeHTML(undefined)).toBe('');
  });
});

// ─── STORAGE_KEYS ─────────────────────────────────────────────────────────────
describe('STORAGE_KEYS', () => {
  it('has LANG constant key', () => {
    expect(STORAGE_KEYS.LANG).toBe('etw_lang');
  });

  it('UID-based key generators return strings', () => {
    expect(typeof STORAGE_KEYS.AVATAR('uid_123')).toBe('string');
    expect(STORAGE_KEYS.AVATAR('uid_123')).toContain('uid_123');
  });

  it('EOD key takes a day argument', () => {
    const key = STORAGE_KEYS.EOD('2026-05-18');
    expect(typeof key).toBe('string');
    expect(key).toContain('2026-05-18');
  });

  it('is frozen (immutable)', () => {
    expect(Object.isFrozen(STORAGE_KEYS)).toBe(true);
  });
});

// ─── showToast ────────────────────────────────────────────────────────────────
describe('showToast', () => {
  it('does not throw when toast element is missing', () => {
    expect(() => showToast('Test message')).not.toThrow();
  });

  it('updates toast text when element exists', () => {
    const el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);

    showToast('Hello');
    expect(el.textContent).toBe('Hello');
    expect(el.classList.contains('show')).toBe(true);

    document.body.removeChild(el);
  });

  it('adds err class for error toasts', () => {
    const el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);

    showToast('Error!', true);
    expect(el.classList.contains('err')).toBe(true);

    document.body.removeChild(el);
  });

  it('normal toast does not have err class', () => {
    const el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);

    showToast('OK');
    expect(el.classList.contains('err')).toBe(false);

    document.body.removeChild(el);
  });
});

// ─── hapticTap — His Motoru (13e) delegasyonu ─────────────────────────────────
// 13e yüklüyse tüm titreşim Ayarlar'daki "Titreşim" toggle'ına saygı duymalı;
// 13e henüz yoksa (erken boot) eski ham navigator.vibrate davranışı korunur.
describe('hapticTap — fxHaptic delegasyonu', () => {
  // jsdom navigator.vibrate'i hiç tanımlamıyor — vi.spyOn var olmayan bir
  // property'yi izleyemez; önce tanımlanır, sonra izlenir/temizlenir.
  beforeEach(() => {
    Object.defineProperty(navigator, 'vibrate', { value: vi.fn(() => true), configurable: true, writable: true });
  });
  afterEach(() => { delete window.fxHaptic; delete navigator.vibrate; });

  it('window.fxHaptic varsa ona delege eder, ham vibrate ÇAĞRILMAZ', () => {
    const fxHapticSpy = vi.fn();
    window.fxHaptic = fxHapticSpy;
    hapticTap(8);
    expect(fxHapticSpy).toHaveBeenCalledWith('light');
    expect(navigator.vibrate).not.toHaveBeenCalled();
  });

  it('ms eşiğine göre light/medium/heavy seçer', () => {
    const fxHapticSpy = vi.fn();
    window.fxHaptic = fxHapticSpy;
    hapticTap(8);  expect(fxHapticSpy).toHaveBeenLastCalledWith('light');
    hapticTap(25); expect(fxHapticSpy).toHaveBeenLastCalledWith('medium');
    hapticTap(60); expect(fxHapticSpy).toHaveBeenLastCalledWith('heavy');
  });

  it('window.fxHaptic yokken ham navigator.vibrate fallback çalışır', () => {
    delete window.fxHaptic;
    hapticTap(8);
    expect(navigator.vibrate).toHaveBeenCalledWith(8);
  });
});

// ─── SafeStorage yazım kuyruğu — lifecycle flush + localStorage aynası ────────
// Sayfa kapanışında async flush yarıda ölebilir; senkron ckpt aynası bekleyen
// yazımları saklar, sonraki storageInit yetimi devralır (FAZ 1, kalıcılık).
describe('SafeStorage yazım kuyruğu lifecycle flush', () => {
  const CKPT = (uid) => `etw_wq_ckpt_${uid}`;

  function makeFakeSb({ upsertImpl } = {}) {
    const calls = { upserts: [] };
    const sb = {
      from: () => ({
        select: () => ({ eq: () => Promise.resolve({ data: [] }) }),
        upsert: (row) => {
          calls.upserts.push(row);
          return upsertImpl ? upsertImpl(row) : Promise.resolve({ error: null });
        },
        delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
      }),
    };
    return { sb, calls };
  }

  /** Modül-private kuyruk durumu için her testte taze 00a yükle. */
  async function freshInfra() {
    vi.resetModules();
    return await import('../js/parts/00a-infrastructure.js');
  }

  function setHidden(v) {
    Object.defineProperty(document, 'hidden', { value: v, configurable: true });
  }

  beforeEach(() => { localStorage.clear(); setHidden(false); });

  it('hidden olduğunda bekleyen kuyruk localStorage aynasına yazılır', async () => {
    const uid = 'wq-u1';
    const infra = await freshInfra();
    const { sb } = makeFakeSb({ upsertImpl: () => new Promise(() => {}) }); // upsert asla dönmez
    await infra.storageInit(sb, uid);
    infra.SafeStorage.set('wq_key_1', { a: 1 });
    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    const ckpt = JSON.parse(localStorage.getItem(CKPT(uid)));
    expect(ckpt.items.map(([k]) => k)).toContain('wq_key_1');
  });

  it('pagehide aynayı senkron yazar', async () => {
    const uid = 'wq-u2';
    const infra = await freshInfra();
    const { sb } = makeFakeSb({ upsertImpl: () => new Promise(() => {}) });
    await infra.storageInit(sb, uid);
    infra.SafeStorage.set('wq_key_2', { b: 2 });
    window.dispatchEvent(new Event('pagehide'));
    const ckpt = JSON.parse(localStorage.getItem(CKPT(uid)));
    expect(ckpt.items.map(([k]) => k)).toContain('wq_key_2');
  });

  it('flush başarısı aynayı temizler (bayat replay penceresi kapanır)', async () => {
    const uid = 'wq-u3';
    const infra = await freshInfra();
    const { sb } = makeFakeSb();
    await infra.storageInit(sb, uid);
    localStorage.setItem(CKPT(uid), JSON.stringify({ ts: Date.now(), items: [['eski', { value: '"x"', op: 'upsert' }]] }));
    infra.SafeStorage.set('wq_key_3', { c: 3 });
    await new Promise((r) => setTimeout(r, 25)); // setTimeout(0) flush'ı + upsert bitsin
    expect(localStorage.getItem(CKPT(uid))).toBeNull();
  });

  it('storageInit yetim aynayı kuyruğa VE önbelleğe devralıp flush eder', async () => {
    const uid = 'wq-u4';
    localStorage.setItem(CKPT(uid), JSON.stringify({
      ts: Date.now(),
      items: [['recovered_key', { value: JSON.stringify({ x: 9 }), op: 'upsert' }]],
    }));
    const infra = await freshInfra();
    const { sb, calls } = makeFakeSb();
    await infra.storageInit(sb, uid);
    expect(infra.SafeStorage.get('recovered_key')).toEqual({ x: 9 }); // bellek gerçeği
    expect(localStorage.getItem(CKPT(uid))).toBeNull();               // ckpt tüketildi
    await new Promise((r) => setTimeout(r, 25));
    expect(calls.upserts.some((u) => u.data_type === 'recovered_key')).toBe(true); // sunucuya gitti
  });

  it("48 saatten eski ayna replay edilmez (çok-cihaz guard'ı)", async () => {
    const uid = 'wq-u5';
    localStorage.setItem(CKPT(uid), JSON.stringify({
      ts: Date.now() - 49 * 3600 * 1000,
      items: [['stale_key', { value: '"eski"', op: 'upsert' }]],
    }));
    const infra = await freshInfra();
    const { sb, calls } = makeFakeSb();
    await infra.storageInit(sb, uid);
    expect(infra.SafeStorage.get('stale_key')).toBeNull();
    expect(localStorage.getItem(CKPT(uid))).toBeNull(); // bayat da olsa tüketilir
    await new Promise((r) => setTimeout(r, 25));
    expect(calls.upserts.some((u) => u.data_type === 'stale_key')).toBe(false);
  });

  it('arka plandayken enqueue aynayı ANINDA günceller (listener sırasından bağımsız)', async () => {
    const uid = 'wq-u6';
    const infra = await freshInfra();
    const { sb } = makeFakeSb({ upsertImpl: () => new Promise(() => {}) });
    await infra.storageInit(sb, uid);
    setHidden(true);
    infra.SafeStorage.set('late_key', { z: 1 }); // event YOK — salt enqueue yeter
    const ckpt = JSON.parse(localStorage.getItem(CKPT(uid)));
    expect(ckpt.items.map(([k]) => k)).toContain('late_key');
  });

  it('uçuş sırasında ezilen değer sonunda sunucuya ulaşır (kayıp güncelleme yok)', async () => {
    const uid = 'wq-u7';
    let resolveFirst; let call = 0;
    const { sb, calls } = makeFakeSb({
      upsertImpl: () => {
        call++;
        if (call === 1) return new Promise((r) => { resolveFirst = r; }); // ilk upsert askıda
        return Promise.resolve({ error: null });
      },
    });
    const infra = await freshInfra();
    await infra.storageInit(sb, uid);
    infra.SafeStorage.set('race_key', { v: 1 });
    await new Promise((r) => setTimeout(r, 5));   // flush başladı, upsert(v1) uçuşta
    infra.SafeStorage.set('race_key', { v: 2 }); // uçuş sırasında yeni değer
    resolveFirst({ error: null });
    await new Promise((r) => setTimeout(r, 25));  // kalan flush'lar bitsin
    const sent = calls.upserts.filter((u) => u.data_type === 'race_key');
    expect(sent.some((u) => u.data_json === JSON.stringify({ v: 2 }))).toBe(true);
  });
});
