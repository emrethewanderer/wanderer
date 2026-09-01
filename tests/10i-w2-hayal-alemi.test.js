/**
 * Tests for js/parts/10i-w2-hayal-alemi.js
 *
 * Hayal Alemi — Imagination Engine
 *   - Sahne mühürleme akışı
 *   - Yansıma skoru (Hayal ↔ Fiziksel köprüsü)
 *   - Persistence
 *   - Kavram listesi bütünlüğü
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S } from '../js/state.js';
import { I18N_CORE } from '../js/parts/15b-i18n-dict-core.js';
// EN artık sidecar'da (15e) — core'da yalnız tr: var (bundle diyeti).
import { I18N_EN } from '../js/parts/15e-i18n-dict-en.js';

const DICTS = { tr: I18N_CORE.tr, en: I18N_EN };

// callLLM mock — gerçek API çağrısı yapmasın. importOriginal ile diğer export'lar
// (renderHistory vb. — 15-i18n → 03-auth-shell → 11-w2-chat-cal zinciri için) korunur.
vi.mock('../js/parts/04-llm-hero-history.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, callLLM: vi.fn().mockResolvedValue('Hayal et: Kendini güvenen bir kişi olarak gör.') };
});

import {
  HAYAL_KAVRAMLAR,
  haInit,
  haSave,
  haLoad,
  recomputeYansimaScore,
  getHayalStats,
  haGenerateDreamArt,
  haDreamCard,
} from '../js/parts/10i-w2-hayal-alemi.js';

function resetHayal() {
  S._currentLang = 'tr'; // i18n etiketleri Türkçe çözülsün (test içerikleri TR)
  S._hayalAlemi = {
    sahneler: [],
    lastSessionAt: null,
    sessionsCount: 0,
    yansimaScore: 0,
    currentSession: null,
  };
  S._wandererGame = {
    elmas: 0,
    davranisKanitlari: [],
    vasitaTrap: { score: 0, acknowledgedToday: false, lastWarningDate: null, warningCount: 0 },
    ayna: { todayReflectedAt: null, transitionSpark: 0 },
    tanikMode: { lastShown: null },
  };
}

describe('Hayal Alemi (10i)', () => {
  beforeEach(() => { resetHayal(); });

  describe('Kavram listesi', () => {
    it('9 kavram içerir (4 derinlik + 5 temel)', () => {
      expect(HAYAL_KAVRAMLAR).toHaveLength(9);
      const derinlik = HAYAL_KAVRAMLAR.filter(k => k.category === 'derinlik');
      const temel = HAYAL_KAVRAMLAR.filter(k => k.category === 'temel');
      expect(derinlik).toHaveLength(4);
      expect(temel).toHaveLength(5);
    });

    it('her kavram zorunlu yapısal alanlara sahip', () => {
      for (const k of HAYAL_KAVRAMLAR) {
        expect(k.key).toBeTruthy();
        expect(['derinlik', 'temel']).toContain(k.category);
        expect(k.glyph).toBeTruthy();
      }
    });

    it('her kavramın label+seed çevirisi i18n sözlüğünde var (tr+en)', () => {
      for (const k of HAYAL_KAVRAMLAR) {
        for (const lang of ['tr', 'en']) {
          expect(DICTS[lang][`ha.kavram.${k.key}.label`]).toBeTruthy();
          expect(DICTS[lang][`ha.kavram.${k.key}.seed`]).toBeTruthy();
        }
      }
    });

    it('felsefenin tüm 9 kavramını kapsar', () => {
      const keys = HAYAL_KAVRAMLAR.map(k => k.key);
      expect(keys).toEqual(expect.arrayContaining([
        'standart', 'hak_etmek', 'normal', 'layik',
        'oz_sevgi', 'oz_saygi', 'oz_deger', 'oz_guven', 'bolluk',
      ]));
    });
  });

  describe('Yansıma Skoru', () => {
    it('sahne yoksa 0 döner', () => {
      expect(recomputeYansimaScore()).toBe(0);
    });

    it('1:1 oran %100 yansıma', () => {
      S._hayalAlemi.sahneler = [
        { id: 'a', concept: 'standart' },
        { id: 'b', concept: 'oz_sevgi' },
      ];
      S._wandererGame.davranisKanitlari = [
        { date: '2025-01-01', behavior: 'x' },
        { date: '2025-01-02', behavior: 'y' },
      ];
      expect(recomputeYansimaScore()).toBe(100);
    });

    it('kanıt sayısı sahneden az ise oranlanır', () => {
      S._hayalAlemi.sahneler = Array.from({ length: 4 }, (_, i) => ({ id: `s${i}` }));
      S._wandererGame.davranisKanitlari = [{ date: '2025-01-01', behavior: 'x' }];
      expect(recomputeYansimaScore()).toBe(25);
    });

    it('kanıt sahneden çok olsa bile %100 üst sınır', () => {
      S._hayalAlemi.sahneler = [{ id: 's1' }];
      S._wandererGame.davranisKanitlari = Array(10).fill({ date: '2025-01-01', behavior: 'x' });
      expect(recomputeYansimaScore()).toBe(100);
    });
  });

  describe('getHayalStats', () => {
    it('boş durumda 0\'ları döner', () => {
      const s = getHayalStats();
      expect(s.total).toBe(0);
      expect(s.sessionsCount).toBe(0);
      expect(s.yansimaScore).toBe(0);
      expect(s.lastSessionAt).toBeNull();
    });

    it('sahneler ve oturum sayısını yansıtır', () => {
      S._hayalAlemi.sahneler = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
      S._hayalAlemi.sessionsCount = 3;
      S._hayalAlemi.lastSessionAt = '2025-05-26T10:00:00Z';
      const s = getHayalStats();
      expect(s.total).toBe(3);
      expect(s.sessionsCount).toBe(3);
      expect(s.lastSessionAt).toBe('2025-05-26T10:00:00Z');
    });
  });

  describe('Üretken Hayal Görseli', () => {
    const scene = { id: 'h_abc', concept: 'oz_guven', scene_text: 'Sakin ve güvenli bir limanda duruyorum.' };

    it('geçerli bir SVG döner', () => {
      const svg = haGenerateDreamArt(scene);
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain('</svg>');
      expect(svg).toContain('viewBox="0 0 200 200"');
    });

    it('determinizm: aynı sahne → aynı görsel', () => {
      expect(haGenerateDreamArt(scene)).toBe(haGenerateDreamArt(scene));
    });

    it('farklı sahneler → farklı görseller', () => {
      const a = haGenerateDreamArt(scene);
      const b = haGenerateDreamArt({ ...scene, id: 'h_xyz', scene_text: 'Bambaşka bir hayal.' });
      expect(a).not.toBe(b);
    });

    it('artSeed verilmişse id/metin değişse de görsel stabil kalır', () => {
      const s1 = { id: 'h_1', concept: 'standart', scene_text: 'metin A', artSeed: 123456 };
      const s2 = { id: 'h_2', concept: 'standart', scene_text: 'metin B', artSeed: 123456 };
      expect(haGenerateDreamArt(s1)).toBe(haGenerateDreamArt(s2));
    });

    it('haDreamCard kavram etiketini ve görseli içerir', () => {
      const html = haDreamCard(scene, 'full');
      expect(html).toContain('hayal-dream-card');
      expect(html).toContain('ÖZ GÜVEN');
      expect(html).toContain('<svg');
    });

    it('tüm 9 kavram için motif üretir (hata fırlatmaz)', () => {
      for (const k of HAYAL_KAVRAMLAR) {
        const svg = haGenerateDreamArt({ id: 'h_' + k.key, concept: k.key, scene_text: 't' });
        expect(svg).toContain('<svg');
      }
    });
  });

  describe('Persistence', () => {
    it('haSave/haInit roundtrip sahneleri korur', () => {
      S._hayalAlemi.sahneler = [
        { id: 'x', concept: 'normal', scene_text: 'Test sahnesi', sealed: true },
      ];
      S._hayalAlemi.sessionsCount = 1;
      haSave();

      // In-memory sıfırla
      S._hayalAlemi = {
        sahneler: [], lastSessionAt: null, sessionsCount: 0,
        yansimaScore: 0, currentSession: null,
      };
      haInit();
      expect(S._hayalAlemi.sahneler).toHaveLength(1);
      expect(S._hayalAlemi.sahneler[0].scene_text).toBe('Test sahnesi');
      expect(S._hayalAlemi.sessionsCount).toBe(1);
    });

    it('haInit sonrası currentSession her zaman null', () => {
      S._hayalAlemi.currentSession = { id: 'should-clear', concept: 'standart' };
      haSave();
      S._hayalAlemi.currentSession = null;
      haInit();
      // currentSession sayfa yenilemede sıfırlanmalı
      expect(S._hayalAlemi.currentSession).toBeNull();
    });
  });
});
