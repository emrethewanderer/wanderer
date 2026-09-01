/**
 * Tests for js/parts/10o-w2-feature-gate.js — KAPI KAZIMASI (Alfabe Işık, Faz 2)
 *
 * Kullanıcının SON yazdığı nişan kapı kanadına kazınır. Sözleşme (K4):
 * her iz görünür + Doku "Nur izleri" anahtarından kapatılabilir; hiç nişan
 * yazılmamışsa kapı bugünkü hâlinde kalır (varsayılan elmas rozeti).
 * _ornamentSVG imzası korunur — varyant opsiyonel parametredir.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { featureEnter } from '../js/parts/10o-w2-feature-gate.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';
import { NISANLAR } from '../js/parts/12e-isik-nisanlari.js';

const ISIK_KEY = 'etw_isik_nisan_v1';
const AMBIENT_KEY = 'etw_isik_ambient_v1';
const DEFAULT_CORE = 'M50 34 L60 50';   // varsayılan elmas rozetinin imzası

function ornamentHTML() {
  return document.querySelector('.fgate-door-ornament')?.innerHTML || '';
}

beforeEach(() => {
  vi.useFakeTimers();
  SafeStorage.set(ISIK_KEY, { written: {}, lastWriteDate: null });
  SafeStorage.set(AMBIENT_KEY, true);
});

afterEach(() => {
  vi.useRealTimers();
  // NOT: overlay DOM'dan sökülmez — modülün _built bayrağı yaşadığı sürece
  // featureEnter mevcut overlay'i yeniden kullanır (prod davranışı da bu).
});

describe('kapı kazıması — nişan varyantı', () => {
  it('hiç nişan yazılmamışsa varsayılan elmas rozeti kalır', () => {
    featureEnter('gecis-alani', vi.fn());
    expect(ornamentHTML()).toContain(DEFAULT_CORE);
  });

  it('son yazılan nişan kapıya kazınır (tarihçe sıralı)', () => {
    const eski = NISANLAR[0], yeni = NISANLAR[1];
    SafeStorage.set(ISIK_KEY, {
      written: { [yeni.id]: '2026-07-05', [eski.id]: '2026-07-01' },
      lastWriteDate: '2026-07-05',
    });
    featureEnter('gecis-alani', vi.fn());
    const html = ornamentHTML();
    expect(html).not.toContain(DEFAULT_CORE);
    // ikonun ayırt edici ilk parçası kazımada olmalı
    const marker = (yeni.icon.match(/d="([^"]{12})/) || yeni.icon.match(/cx="\d+" cy="\d+" r="\d+"/))[0];
    expect(html).toContain(marker.slice(0, 12));
  });

  it('Doku "Nur izleri" kapalıysa kazıma geri çekilir (K4)', () => {
    SafeStorage.set(ISIK_KEY, {
      written: { [NISANLAR[0].id]: '2026-07-01' }, lastWriteDate: '2026-07-01',
    });
    SafeStorage.set(AMBIENT_KEY, false);
    featureEnter('gecis-alani', vi.fn());
    expect(ornamentHTML()).toContain(DEFAULT_CORE);
  });

  it('her açılışta tazelenir — yeni yazım sonraki kapıda görünür', () => {
    featureEnter('gecis-alani', vi.fn());
    expect(ornamentHTML()).toContain(DEFAULT_CORE);
    SafeStorage.set(ISIK_KEY, {
      written: { [NISANLAR[2].id]: '2026-07-06' }, lastWriteDate: '2026-07-06',
    });
    featureEnter('hayal-alemi', vi.fn());
    expect(ornamentHTML()).not.toContain(DEFAULT_CORE);
  });
});
