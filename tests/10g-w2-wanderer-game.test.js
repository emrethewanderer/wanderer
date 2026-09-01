/**
 * Tests for js/parts/10g-w2-wanderer-game.js
 *
 * Wanderer Oyunu — Eşsiz oyunlaştırma katmanı
 *   - Elmas ekonomisi
 *   - Vasıta Tuzağı heuristic
 *   - Davranış Kanıtı akışı
 *   - Geçiş skoru hesabı
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../js/state.js';
import {
  wgInit,
  wgSave,
  awardElmas,
  getElmasSayisi,
  computeTransitionScore,
  libGununAlintisi,
  libGununAlintisiHazirla,
} from '../js/parts/10g-w2-wanderer-game.js';

function resetGame() {
  S._wandererGame = {
    elmas: 0,
    davranisKanitlari: [],
    ayna: {
      lastViewed: null,
      todayReflectedAt: null,
      transitionSpark: 0,
    },
    tanikMode: { lastShown: null },
  };
  S._depthProfile = {
    standart:  { score: 0, direction: 'flat', signals_count: 0, evidence: [] },
    hak_etmek: { score: 0, direction: 'flat', signals_count: 0, evidence: [] },
    normal:    { score: 0, direction: 'flat', signals_count: 0, evidence: [] },
    layik:     { score: 0, direction: 'flat', signals_count: 0, evidence: [] },
  };
  S._foundationsProfile = {
    oz_sevgi: { score: 0, direction: 'flat', signals_count: 0, evidence: [] },
    oz_saygi: { score: 0, direction: 'flat', signals_count: 0, evidence: [] },
    oz_deger: { score: 0, direction: 'flat', signals_count: 0, evidence: [] },
    oz_guven: { score: 0, direction: 'flat', signals_count: 0, evidence: [] },
    bolluk:   { score: 0, direction: 'flat', signals_count: 0, evidence: [] },
  };
  S._personTransition = {
    current: { description: '', confidence: 0 },
    desired: { description: '', confidence: 0 },
    daily_steps: [],
  };
  S._choiceTracking = { recent_choices: [] };
  S.allSessions = {};
}

describe('Wanderer Oyunu (10g)', () => {
  beforeEach(() => { resetGame(); });

  describe('Elmas ekonomisi', () => {
    it('awardElmas verilen miktarı ekler', () => {
      awardElmas(5, 'test');
      expect(getElmasSayisi()).toBe(5);
      awardElmas(3, 'test');
      expect(getElmasSayisi()).toBe(8);
    });

    it('negatif veya sıfır miktarı reddeder', () => {
      awardElmas(-5, 'test');
      awardElmas(0, 'test');
      expect(getElmasSayisi()).toBe(0);
    });
  });

  describe('Geçiş skoru', () => {
    it('hiç sinyal yoksa 0 döner', () => {
      expect(computeTransitionScore()).toBe(0);
    });

    it('derinlik + temeller skorlarının ortalamasını hesaplar', () => {
      S._depthProfile.standart.score = 60;
      S._depthProfile.standart.signals_count = 3;
      S._depthProfile.normal.score = 80;
      S._depthProfile.normal.signals_count = 2;
      S._foundationsProfile.oz_sevgi.score = 40;
      S._foundationsProfile.oz_sevgi.signals_count = 1;
      // (60 + 80 + 40) / 3 = 60
      expect(computeTransitionScore()).toBe(60);
    });

    it('signals_count=0 olan girdileri atlar', () => {
      S._depthProfile.standart.score = 100;
      S._depthProfile.standart.signals_count = 0; // atlanmalı
      S._depthProfile.normal.score = 50;
      S._depthProfile.normal.signals_count = 1;
      expect(computeTransitionScore()).toBe(50);
    });
  });

  describe('Persistence', () => {
    it('wgSave/wgInit roundtrip — elmas miktarı korunur', () => {
      awardElmas(42, 'test');
      wgSave();
      // Reset in-memory; wgInit reads from storage
      S._wandererGame.elmas = 0;
      wgInit();
      expect(S._wandererGame.elmas).toBe(42);
    });
  });
});

/* ═══════════════════════════════════════════════════════
   GÜNÜN ALINTISI — Kitaplık okurunun üstündeki şerit
   ───────────────────────────────────────────────────────
   Şerit preview'da (anon oturum) doğrulanamaz: S.knowledgeItems
   Supabase'den gelir. Seçim, cache ve HESAP SAHİPLİĞİ burada kapanır.
═══════════════════════════════════════════════════════ */
describe('Günün Alıntısı', () => {
  const YAZI = {
    title: 'İlişki Denklemi',
    created_at: '2026-08-01T10:00:00Z',
    content: 'Sevgi bir duygu değil, bir karardır. Sınır koymak kendine saygının haritasıdır.',
  };

  beforeEach(() => {
    S.currentUser = { id: 'alinti-user-1' };
    S.knowledgeItems = [];
    S._userProfile = {};
    S._foundationsProfile = {};
    S._onboardingRecommendation = null;
    // Cache'i sahip değiştirerek düşür (modül-private state test arası taşınır).
    S.currentUser = { id: 'alinti-reset' };
    libGununAlintisiHazirla();
    S.currentUser = { id: 'alinti-user-1' };
  });

  it('Kitaplık boşken alıntı seçilmez — boş şerit doğmaz', () => {
    S.knowledgeItems = [];
    expect(libGununAlintisiHazirla()).toBeNull();
    expect(libGununAlintisi()).toBeNull();
  });

  it('Kitaplık doluyken yazı indeksi ve cümle döner', () => {
    S.knowledgeItems = [YAZI];
    const pick = libGununAlintisiHazirla();
    expect(pick).toBeTruthy();
    expect(pick.idx).toBe(0);
    expect(pick.title).toBe('İlişki Denklemi');
    // Cümle yazının GÖVDESİNDEN kesilir — uydurulmaz.
    expect(YAZI.content).toContain(pick.soz.replace(/…$/, ''));
  });

  it('ikinci çağrı aynı alıntıyı verir (cache, idempotent)', () => {
    S.knowledgeItems = [YAZI];
    const a = libGununAlintisiHazirla();
    const b = libGununAlintisiHazirla();
    expect(b).toEqual(a);
    expect(libGununAlintisi()).toEqual(a);
  });

  it('hesap değişince cache düşer — önceki kullanıcının alıntısı taşınmaz', () => {
    S.knowledgeItems = [YAZI];
    const ilk = libGununAlintisiHazirla();
    expect(ilk).toBeTruthy();

    S.currentUser = { id: 'alinti-user-2' };
    S.knowledgeItems = [];              // yeni hesabın Kitaplığı henüz yüklenmedi
    expect(libGununAlintisiHazirla()).toBeNull();
    expect(libGununAlintisi()).toBeNull();
  });
});
