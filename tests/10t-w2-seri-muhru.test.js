/**
 * Tests for js/parts/10t-w2-seri-muhru.js — Seri Mührü (günü mühürleme + 8 kilometre kartı).
 *
 * Kapsam: smSealToday() varyant çözümü (start/continue/milestone), 8 kilometre
 * eşiği (7/15/30/60/120/180/240/365) kart kazanımı + idempotentlik, bestStreak
 * asla düşmez, hedef (goal) ulaşılınca goalReachedAt mühürlenir, smChooseGoal/
 * smSetGoal, smRunDaily gating (_applicable/_blocked).
 *
 * 12c-kart-gorsel.js (ikvCardFace/ikvMilestoneScene) mock'lanır — kart görsel
 * render'ı bu testin kapsamı dışında, yalnız VERİ doğruluğu (kart/tier/gün) hedef.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../js/parts/12c-kart-gorsel.js', () => ({
  ikvCardFace: vi.fn(() => '<div class="mock-card-face"></div>'),
  ikvMilestoneScene: vi.fn(() => ({})),
}));

import { S } from '../js/state.js';
import {
  smSealToday, smRunDaily, smChooseGoal, smSetGoal,
} from '../js/parts/10t-w2-seri-muhru.js';

window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

function resetState(streak) {
  S.currentUser = { id: 'sm-test-user' };
  S._seriMuhru = { lastSealedDay: null, goal: null, goalReachedAt: null, cards: {}, bestStreak: 0, totalSeals: 0 };
  S._gunlukRitus = null;
  document.body.innerHTML = '<div id="app-screen" style="display:block;"><div class="view active" id="bugun-view"></div></div>';
  window.recomputeStreakUI = vi.fn(() => streak);
}

beforeEach(() => {
  vi.useFakeTimers();
  resetState(1);
});
afterEach(() => {
  // _renderSealCeremony (smSealToday çağırır) spark/count-up/gong için gerçek
  // setTimeout zamanlıyor; sahte zamanlayıcı olmadan bunlar test ortamı
  // kapandıktan SONRA ateşleyip "window is not defined" hatası veriyordu.
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe('smSealToday — varyant çözümü', () => {
  it('n=1 (ilk gün, eşik yok) → start varyantı', () => {
    resetState(1);
    smSealToday();
    expect(S._seriMuhru.totalSeals).toBe(1);
    expect(S._seriMuhru.bestStreak).toBe(1);
  });

  it('n=5 (eşik dışı) → continue varyantı, kart kazanılmaz', () => {
    resetState(5);
    smSealToday();
    expect(Object.keys(S._seriMuhru.cards).length).toBe(0);
  });

  it('n=7 (ilk kilometre eşiği) → kart kazanılır', () => {
    resetState(7);
    smSealToday();
    expect(S._seriMuhru.cards['7']).toBeTruthy();
    expect(S._seriMuhru.cards['7'].at).toBeTruthy();
  });
});

describe('smSealToday — 8 kilometre eşiği tam listesi', () => {
  it.each([7, 15, 30, 60, 120, 180, 240, 365])('n=%i eşiğinde kart kazanılır', (n) => {
    resetState(n);
    smSealToday();
    expect(S._seriMuhru.cards[String(n)]).toBeTruthy();
  });

  it('eşik olmayan bir sayıda (n=8) kart kazanılmaz', () => {
    resetState(8);
    smSealToday();
    expect(Object.keys(S._seriMuhru.cards).length).toBe(0);
  });
});

describe('smSealToday — idempotentlik + bestStreak', () => {
  it('aynı eşikte ikinci kez mühürlenirse kart TEKRAR verilmez (zaten var)', () => {
    resetState(7);
    smSealToday();
    const firstAt = S._seriMuhru.cards['7'].at;
    smSealToday(); // aynı gün/eşik tekrar
    expect(S._seriMuhru.cards['7'].at).toBe(firstAt);
    expect(Object.keys(S._seriMuhru.cards).length).toBe(1);
  });

  it('bestStreak yükselince güncellenir', () => {
    resetState(10);
    smSealToday();
    expect(S._seriMuhru.bestStreak).toBe(10);
  });

  it('seri düşse bile bestStreak ASLA düşmez', () => {
    resetState(10);
    smSealToday();
    expect(S._seriMuhru.bestStreak).toBe(10);
    resetState(3); // resetState kartları da sıfırlar — yalnız bestStreak'i taşıyoruz
    S._seriMuhru.bestStreak = 10; // gerçek senaryo: bestStreak kalıcı, streak düşmüş
    smSealToday();
    expect(S._seriMuhru.bestStreak).toBe(10); // 3 < 10, düşmedi
  });
});

describe('smSealToday — hedef (goal) ulaşımı', () => {
  it('hedef belirlenmişse ve n >= goal ise goalReachedAt mühürlenir', () => {
    resetState(7);
    S._seriMuhru.goal = 7;
    smSealToday();
    expect(S._seriMuhru.goalReachedAt).toBeTruthy();
  });

  it('n < goal ise goalReachedAt set edilmez', () => {
    resetState(5);
    S._seriMuhru.goal = 7;
    smSealToday();
    expect(S._seriMuhru.goalReachedAt).toBeNull();
  });

  it('goalReachedAt zaten varsa üzerine yazılmaz (ilk ulaşım anı korunur)', () => {
    resetState(10);
    S._seriMuhru.goal = 7;
    S._seriMuhru.goalReachedAt = '2020-01-01';
    smSealToday();
    expect(S._seriMuhru.goalReachedAt).toBe('2020-01-01');
  });
});

describe('smChooseGoal / smSetGoal', () => {
  it('smChooseGoal hedefi kaydeder', () => {
    smChooseGoal(30);
    expect(S._seriMuhru.goal).toBe(30);
  });

  it('smSetGoal hedefi temizleyebilir (null)', () => {
    S._seriMuhru.goal = 30;
    smSetGoal(null);
    expect(S._seriMuhru.goal).toBeNull();
  });

  it('smSetGoal: mevcut seri zaten hedefi geçmişse goalReachedAt anında mühürlenir', () => {
    resetState(10);
    smSetGoal(7);
    expect(S._seriMuhru.goal).toBe(7);
    expect(S._seriMuhru.goalReachedAt).toBeTruthy();
  });
});

describe('smRunDaily — gating', () => {
  it('app-screen gizliyse hiçbir şey yapmaz', () => {
    document.getElementById('app-screen').style.display = 'none';
    smRunDaily();
    expect(S._seriMuhru.totalSeals).toBe(0);
  });

  it('bugün zaten mühürlenmişse (lastSealedDay=bugün) tekrar mühürlemez', () => {
    const d = new Date();
    const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    S._seriMuhru.lastSealedDay = todayKey;
    smRunDaily();
    expect(S._seriMuhru.totalSeals).toBe(0);
  });

  it('Bugün ekranında değilse (bloklayıcı) ertelenir, hemen mühürlemez', () => {
    document.getElementById('bugun-view').classList.remove('active');
    smRunDaily();
    expect(S._seriMuhru.totalSeals).toBe(0);
  });

  it('uygun ve bloklanmamışsa mühürler', () => {
    smRunDaily();
    expect(S._seriMuhru.totalSeals).toBe(1);
  });

  it('force=true iken blok kontrolünü atlar', () => {
    document.getElementById('bugun-view').classList.remove('active');
    smRunDaily(true);
    expect(S._seriMuhru.totalSeals).toBe(1);
  });
});

// Tanıma Motoru (FAZ 1) — bu törende mühür DAİMA gerçek: seri kaydı portal
// açılmadan ÖNCE smSealToday() içinde yazılır, kutlama sahnesi yalnız gösterir.
describe('Tanıma Motoru — Gözlemevi sonuç raporu (00f wtOverlayClose)', () => {
  afterEach(() => { delete window.wtOverlayClose; });

  it("kutlama kapanışı wtOverlayClose('seri-muhru', 'muhur') çağırır", () => {
    const spy = vi.fn();
    window.wtOverlayClose = spy;
    resetState(5); // eşik dışı → 'continue' varyantı, #sm-cta ile kapanır
    smSealToday();
    document.getElementById('sm-cta')?.click();
    vi.runOnlyPendingTimers(); // _closeCeremony → setTimeout(_closePortal, 280)
    expect(spy).toHaveBeenCalledWith('seri-muhru', 'muhur');
  });
});
