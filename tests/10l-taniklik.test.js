/**
 * TANIKLIK DEFTERİ (10l) — "bu dertle gelmiştin, bugün neresinde?"
 *
 * Merkez kural: uygulama "sorununu çözdük" DEMEZ. Kanıtı serer, hükmü
 * kullanıcı verir ve o hüküm tarihli bir seriye yazılır. Bu yüzden buradaki
 * her değer BEYAN kökenlidir (§6.10) — ölçüm değil, kullanıcının sözü.
 *
 * Depo yeni değil: etw_reviews_v1'in beşinci kovası. İç Çalışma 02'nin
 * dersi — yeniden üretilen bir yargıya söz hakkı verirken yeni depo açma.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// 10l tören modülüdür: LLM özeti ve Elmas zinciri testte çalışmamalı.
vi.mock('../js/parts/04-llm-hero-history.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, callLLM: vi.fn().mockResolvedValue('') };
});
vi.mock('../js/parts/10g-w2-wanderer-game.js', () => ({ awardElmas: vi.fn() }));

import { S } from '../js/state.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';
import {
  rvTanikKaydet, rvTanikSeri, rvTanikSon, rvTanikVaktiGeldi,
  rvSave, rvLoad, TANIK_DURUMLAR,
} from '../js/parts/10l-w2-degerlendirme.js';

const UID = 'tanik-test-user';

beforeEach(() => {
  S.currentUser = { id: UID };
  S._reviews = { day: [], week: [], month: [], year: [], current: null, tanik: [] };
  try { SafeStorage.remove(`etw_reviews_v1_${UID}`); } catch (_) {}
});

describe('rvTanikKaydet — hükmü kullanıcı verir', () => {
  it('üç durumu da kabul eder', () => {
    for (const d of TANIK_DURUMLAR) {
      S._reviews.tanik = [];
      expect(rvTanikKaydet(d)?.durum).toBe(d);
    }
  });

  it('tanımsız durumu REDDEDER — beyan üç kapıdan birinden geçer', () => {
    expect(rvTanikKaydet('cozuldu-galiba')).toBeNull();
    expect(rvTanikKaydet('')).toBeNull();
    expect(rvTanikSeri()).toEqual([]);
  });

  it('t0 teşhisini kaydın içinde taşır — beyan neyin hakkında verildi', () => {
    const g = rvTanikKaydet('yol', { kalip: 'erteleme', enZayif: 'oz_guven' });
    expect(g.t0).toEqual({ kalip: 'erteleme', enZayif: 'oz_guven' });
  });

  it('aynı dönemde İDEMPOTENT — son söz geçerli, kayıt çoğalmaz', () => {
    rvTanikKaydet('yerinde');
    rvTanikKaydet('yol');
    const seri = rvTanikSeri();
    expect(seri.length).toBe(1);
    expect(seri[0].durum).toBe('yol');
  });

  it('serbest not 280 karakterde kesilir, boşsa null kalır', () => {
    // NOT: kaydı değişkene al — `expect(x.not)` vitest'in negation zinciriyle
    // karışır ve matcher'a düşer (ilk yazımda buraya takıldı).
    const bos = rvTanikKaydet('yol', null, '  ');
    expect(bos.not).toBeNull();
    S._reviews.tanik = [];
    const uzun = rvTanikKaydet('yol', null, 'a'.repeat(400));
    expect(uzun.not.length).toBe(280);
  });
});

describe('rvTanikSeri / rvTanikSon — dönüşümün beyan serisi', () => {
  it('boş defterde boş dizi, son beyan null', () => {
    expect(rvTanikSeri()).toEqual([]);
    expect(rvTanikSon()).toBeNull();
  });

  it('eskiden yeniye sıralar; son beyan en yenisidir', () => {
    S._reviews.tanik = [
      { id: 'b', periodKey: '2026-06', created_at: '2026-06-01T00:00:00Z', durum: 'yol' },
      { id: 'a', periodKey: '2026-03', created_at: '2026-03-01T00:00:00Z', durum: 'yerinde' },
    ];
    expect(rvTanikSeri().map(r => r.id)).toEqual(['a', 'b']);
    expect(rvTanikSon().durum).toBe('yol');
  });
});

describe('rvTanikVaktiGeldi — soru bir alışkanlık DEĞİL', () => {
  it('hiç sorulmamışsa ilk söz hakkı beklemez', () => {
    expect(rvTanikVaktiGeldi()).toBe(true);
  });

  it('taze beyandan sonra susar — aynı soru her hafta sorulmaz', () => {
    rvTanikKaydet('yol');
    expect(rvTanikVaktiGeldi()).toBe(false);
  });

  it('bir mevsim geçince yeniden sorar', () => {
    S._reviews.tanik = [{
      id: 'x', periodKey: '2026-01', durum: 'yerinde',
      created_at: new Date(Date.now() - 100 * 86400000).toISOString(),
    }];
    expect(rvTanikVaktiGeldi()).toBe(true);
  });
});

describe('kalıcılık — beyan yenilemede kaybolmaz', () => {
  it('rvSave/rvLoad round-trip tanıklık kovasını taşır', () => {
    rvTanikKaydet('degil', { kalip: 'kacis', enZayif: 'oz_sevgi' }, 'artık kaçmıyorum');
    rvSave();
    S._reviews = { day: [], week: [], month: [], year: [], current: null, tanik: [] };
    rvLoad();
    const son = rvTanikSon();
    expect(son.durum).toBe('degil');
    expect(son.not).toBe('artık kaçmıyorum');
    expect(son.t0.kalip).toBe('kacis');
  });

  it('tanik kovası olmayan ESKİ defterden yüklenince boş diziye düşer', () => {
    SafeStorage.set(`etw_reviews_v1_${UID}`, { day: [], week: [], month: [], year: [] });
    S._reviews.tanik = [{ id: 'kirli' }];
    rvLoad();
    expect(S._reviews.tanik).toEqual([]);
  });
});

describe('sözleşme — window.rv* yüzeyi', () => {
  it('tanıklık köprüleri window\'da bağlı', () => {
    for (const k of ['rvTanikKaydet', 'rvTanikSeri', 'rvTanikSon', 'rvTanikVaktiGeldi']) {
      expect(typeof window[k]).toBe('function');
    }
  });
});
