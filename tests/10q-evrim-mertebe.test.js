/**
 * Evrim Çizgileri + Mertebe (K3 · Üç Usta planı FAZ 2)
 *   - kkEvrim: kart id'sinden hat/kademe/önceki/sonraki (tek kaynak id'nin kendisi)
 *   - kkMertebeOf: kanıt skoru → kök derinliği (1-5)
 *   - kkTick: sahipli kartta mertebe YALNIZ YÜKSELİR (histerezis dersi)
 *   - Evrim ayrımı: alt kademe sahipse paket değil evrim töreni oynar
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../js/parts/04-llm-hero-history.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, callLLM: vi.fn().mockResolvedValue('{}') };
});
vi.mock('../js/parts/00b-indexeddb.js', () => ({
  idbSaveRecording: vi.fn().mockResolvedValue(true),
  idbGetRecording: vi.fn().mockResolvedValue(null),
  idbDeleteRecording: vi.fn().mockResolvedValue(true),
}));

import { kkEvrim, kkMertebeOf } from '../js/parts/10q-w2-kisi-karti.js';
import { S } from '../js/state.js';

beforeEach(() => {
  document.body.innerHTML = '';
  S.currentUser = { id: 'u-evrim-1' };
});

describe('kkEvrim — hat, kademe, komşular', () => {
  it('filiz hattın başıdır: öncesi yok, sonrası kök', () => {
    const ev = kkEvrim('temel-ozsevgi-filiz');
    expect(ev).toMatchObject({ hat: 'temel-ozsevgi', kademe: 'filiz', sira: 1, onceki: null, sonraki: 'temel-ozsevgi-kok' });
  });

  it('kök ortadadır: iki komşusu da vardır', () => {
    expect(kkEvrim('temel-ozsaygi-kok')).toMatchObject({
      sira: 2, onceki: 'temel-ozsaygi-filiz', sonraki: 'temel-ozsaygi-tac',
    });
  });

  it('taç hattın sonudur: sonrası yok', () => {
    expect(kkEvrim('temel-bolluk-tac')).toMatchObject({ sira: 3, onceki: 'temel-bolluk-kok', sonraki: null });
  });

  it('hat üyesi olmayan kart null döner (deste kartlarının çoğu)', () => {
    expect(kkEvrim('manifesto-1')).toBeNull();
    expect(kkEvrim('golge-kibir')).toBeNull();
    expect(kkEvrim('')).toBeNull();
    expect(kkEvrim(undefined)).toBeNull();
  });

  it('kademe soneki kartın id\'sinin SONUNDA olmalı — ortada geçen kelime hat açmaz', () => {
    expect(kkEvrim('gercek-filiz-veren-kisi')).toBeNull();
  });
});

describe('kkMertebeOf — kök derinliği', () => {
  it('kazanım anı 1. mertebedir; eşikler sırayla yükseltir', () => {
    expect(kkMertebeOf(0)).toBe(1);
    expect(kkMertebeOf(58)).toBe(1);
    expect(kkMertebeOf(69)).toBe(1);
    expect(kkMertebeOf(70)).toBe(2);
    expect(kkMertebeOf(80)).toBe(3);
    expect(kkMertebeOf(88)).toBe(4);
    expect(kkMertebeOf(96)).toBe(5);
    expect(kkMertebeOf(100)).toBe(5);
  });

  it('geçersiz skor 1. mertebeye düşer (savunmacı)', () => {
    expect(kkMertebeOf(undefined)).toBe(1);
    expect(kkMertebeOf(NaN)).toBe(1);
    expect(kkMertebeOf(null)).toBe(1);
  });

  it('mertebe hiçbir skorda 5\'i geçmez', () => {
    for (const s of [96, 99, 100, 140]) expect(kkMertebeOf(s)).toBeLessThanOrEqual(5);
  });
});
