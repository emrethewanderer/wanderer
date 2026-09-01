/**
 * Tests for js/parts/12e-isik-nisanlari.js — Alfabe Işık (Faz 1)
 *
 *   - 10 nişan tanımlı, her biri id/ad/fisilti/hakikat/ders/icon taşır
 *   - isikWrite: yazma + Elmas ödülü + günde-bir kilidi + çift-ödül guard
 *   - 10/10 tamamlanınca bonus Elmas
 *   - localISODate gün anahtarı ile "bugün yazdın mı" kontrolü
 *   - isikCancelCeremony: yalnızca DOM overlay'ini kaldırır, durumu değiştirmez
 *   - Faz 2 ambient: isikAmbientEnabled varsayılan açık, isikSetAmbient kalıcı
 *     (tüketicisi artık yalnızca 10o kapı kazıması — sohbet filigranı kaldırıldı)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { S } from '../js/state.js';
import { SafeStorage, localISODate } from '../js/parts/00a-infrastructure.js';
import {
  NISANLAR,
  isikGetState,
  isikResetState,
  isikWrittenCount,
  isikIsWritten,
  isikWroteToday,
  isikIsComplete,
  isikWrite,
  isikCancelCeremony,
  isikAmbientEnabled,
  isikSetAmbient,
} from '../js/parts/12e-isik-nisanlari.js';
import { getElmasSayisi } from '../js/parts/10g-w2-wanderer-game.js';

const ISIK_KEY = 'etw_isik_nisan_v1';
const ISIK_AMBIENT_KEY = 'etw_isik_ambient_v1';

beforeEach(() => {
  SafeStorage.set(ISIK_KEY, null);
  SafeStorage.set(ISIK_AMBIENT_KEY, null);
  S._wandererGame = { elmas: 0 };
  document.body.innerHTML = '';
});

describe('NISANLAR veri bütünlüğü', () => {
  it('tam olarak 10 nişan tanımlı', () => {
    expect(NISANLAR.length).toBe(10);
  });

  it('her nişan gerekli alanları taşır ve örgüt adı geçmez (K5)', () => {
    const bannedTerms = /mason|illuminati|satanist|mk\s*ultra/i;
    for (const n of NISANLAR) {
      expect(n.id).toBeTruthy();
      expect(n.ad).toBeTruthy();
      expect(n.fisilti).toBeTruthy();
      expect(n.hakikat).toBeTruthy();
      expect(n.ders).toBeTruthy();
      expect(n.icon).toBeTruthy();
      expect(bannedTerms.test(n.fisilti)).toBe(false);
      expect(bannedTerms.test(n.hakikat)).toBe(false);
    }
  });

  it('id alanları tekil', () => {
    const ids = NISANLAR.map(n => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('isikWrite — yazma + ekonomi', () => {
  it('bilinmeyen id için false döner, hiçbir şey yazmaz', () => {
    const ok = isikWrite('yok-boyle-bir-nisan');
    expect(ok).toBe(false);
    expect(isikWrittenCount()).toBe(0);
  });

  it('geçerli bir nişanı yazar ve Elmas kazandırır', () => {
    const ok = isikWrite('kapali_goz');
    expect(ok).toBe(true);
    expect(isikIsWritten('kapali_goz')).toBe(true);
    expect(getElmasSayisi()).toBe(8);
  });

  it('aynı nişana ikinci yazma çift ödül vermez (bir sonraki gün bile)', () => {
    isikWrite('kapali_goz');
    // Günlük kilidi atlamak için lastWriteDate'i geçmişe al — yine de
    // written[id] zaten dolu olduğundan ikinci kez yazılamamalı.
    const state = isikGetState();
    state.lastWriteDate = '2000-01-01';
    SafeStorage.set(ISIK_KEY, state);
    const ok = isikWrite('kapali_goz');
    expect(ok).toBe(false);
    expect(getElmasSayisi()).toBe(8); // artmadı
  });

  it('günde yalnızca bir nişan yazılabilir (global gün kilidi)', () => {
    isikWrite('kapali_goz');
    expect(isikWroteToday()).toBe(true);
    const ok = isikWrite('halka');
    expect(ok).toBe(false);
    expect(isikIsWritten('halka')).toBe(false);
    expect(getElmasSayisi()).toBe(8); // yalnızca ilk yazımın ödülü
  });

  it('lastWriteDate bugünün localISODate anahtarıyla eşleşir', () => {
    isikWrite('kapali_goz');
    const state = isikGetState();
    expect(state.lastWriteDate).toBe(localISODate());
  });

  it('yarın (farklı gün anahtarı) yeni bir nişan yazılabilir', () => {
    isikWrite('kapali_goz');
    const state = isikGetState();
    state.lastWriteDate = '2000-01-01'; // "dün" simülasyonu
    SafeStorage.set(ISIK_KEY, state);
    const ok = isikWrite('halka');
    expect(ok).toBe(true);
    expect(isikIsWritten('halka')).toBe(true);
    expect(getElmasSayisi()).toBe(16);
  });

  it('10/10 tamamlanınca bonus Elmas verir', () => {
    const state = { written: {}, lastWriteDate: null };
    // İlk 9 nişanı önceki günlere yazılmış gibi doldur (günlük kilide takılmadan).
    NISANLAR.slice(0, 9).forEach((n, i) => {
      state.written[n.id] = `1999-01-${String(i + 1).padStart(2, '0')}`;
    });
    state.lastWriteDate = '1999-01-09';
    SafeStorage.set(ISIK_KEY, state);
    expect(isikWrittenCount()).toBe(9);
    expect(isikIsComplete()).toBe(false);

    const lastId = NISANLAR[9].id;
    const ok = isikWrite(lastId);
    expect(ok).toBe(true);
    expect(isikIsComplete()).toBe(true);
    expect(getElmasSayisi()).toBe(8 + 40); // yazma ödülü + tamamlama bonusu
  });
});

describe('isikResetState', () => {
  it('durumu temizler', () => {
    isikWrite('kapali_goz');
    expect(isikWrittenCount()).toBe(1);
    isikResetState();
    expect(isikWrittenCount()).toBe(0);
    expect(isikWroteToday()).toBe(false);
  });
});

describe('isikCancelCeremony', () => {
  it('yalnızca overlay DOM düğümünü kaldırır, durumu/ekonomiyi değiştirmez', () => {
    const overlay = document.createElement('div');
    overlay.id = 'isik-ceremony-overlay';
    document.body.appendChild(overlay);

    isikCancelCeremony();

    expect(document.getElementById('isik-ceremony-overlay')).toBeNull();
    expect(isikWrittenCount()).toBe(0);
    expect(isikWroteToday()).toBe(false);
    expect(getElmasSayisi()).toBe(0);
  });

  it('overlay yokken çağrılırsa sessizce hiçbir şey yapmaz', () => {
    expect(() => isikCancelCeremony()).not.toThrow();
  });
});

describe('Faz 2 — Günün Işığı (ambient tercih)', () => {
  it('varsayılan açık (hiç ayar yapılmamışsa)', () => {
    expect(isikAmbientEnabled()).toBe(true);
  });

  it('isikSetAmbient tercihi kalıcı kaydeder', () => {
    isikSetAmbient(false);
    expect(isikAmbientEnabled()).toBe(false);
    isikSetAmbient(true);
    expect(isikAmbientEnabled()).toBe(true);
  });
});
