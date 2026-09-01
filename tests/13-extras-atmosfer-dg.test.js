/**
 * Tests for js/parts/13-extras.js — Atmosfer şeridinin duygu okuması
 * (FAZ 16, K10). `asRefresh` zincirine duygu EN ÜSTE eklendi: okuma varsa
 * mod tonu → özet tonu → saat-varsayılanı zincirinin geri kalanına hiç
 * uğranmaz; okuma yoksa (`null`) hiçbir fallback SÖKÜLMEDİ, zincir bugünkü
 * gibi çalışır. Kriz (`tutma`) K9 gereği sohbete verilir dekora değil — bu
 * dosya iki sözleşmeyi mühürler: (1) kriz turunda şerit hiç etkilenmez —
 * dgKapi hiç okuma döndürmemiş gibi davranır, (2) damga yalnız okuma
 * GERÇEKTEN gösterildiğinde basılır (kapıdan geçmek tek başına yetmez, K13).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockDgKapi = vi.fn();
const mockDgYanilmaKonustu = vi.fn((iklim, yuzey) => ({ ...(iklim || {}), _sonKonusan: yuzey }));
const mockDgIklimKaydet = vi.fn();
vi.mock('../js/parts/13D-duygu-motoru.js', () => ({
  dgKapi: (...a) => mockDgKapi(...a),
  dgYanilmaKonustu: (...a) => mockDgYanilmaKonustu(...a),
  dgIklimKaydet: (...a) => mockDgIklimKaydet(...a),
}));

vi.mock('../js/parts/15-i18n.js', () => ({ t: (k, f) => f || k, getCurrentLanguage: () => 'tr' }));
vi.mock('../js/parts/16-i18n-prompts.js', () => ({ dp: () => [], dpAll: () => [], p: (k) => k }));
vi.mock('../js/parts/03-auth-shell.js', () => ({ switchViewHooks: { before: () => {}, after: () => {} } }));
vi.mock('../js/parts/06-summary-chat.js', () => ({
  appendMsgHooks: { after: () => {} },
  sendMessageHooks: { before: () => {} },
  startStreamingFinalizeHooks: { after: () => {} },
  sendMessage: () => {},
}));
vi.mock('../js/parts/00-config-tracking.js', () => ({
  updateModeBadge: () => {},
  nowTR: () => new Date('2026-08-30T10:00:00'),
  onModeBadgeUpdate: () => {},
  resolveCommitment: () => null,
  getCleanCommitments: () => [],
  getAllMessages: () => [],
}));
vi.mock('../js/parts/10g-w2-wanderer-game.js', () => ({ awardElmas: () => {} }));
vi.mock('../js/parts/09-reports-tracks.js', () => ({ showMicroOnboardingHooks: { after: () => {} } }));
vi.mock('../js/parts/11-w2-chat-cal.js', () => ({ w2RenderInfiniteChatHooks: { after: () => {} } }));
vi.mock('../js/parts/04-llm-hero-history.js', () => ({ callLLM: () => Promise.resolve('') }));
vi.mock('../js/parts/05-closure-parts.js', () => ({
  isClosureDoneToday: () => false,
  appendEODClosureCard: () => {},
  startDayClosedCountdown: () => {},
  stopDayClosedCountdown: () => {},
}));
vi.mock('../js/parts/02-features-onboarding.js', () => ({ loadYolculukHaritasi: () => {} }));
vi.mock('../js/parts/12-w3-journey.js', () => ({ w3GetDayKey: () => '2026-08-30' }));
vi.mock('../js/parts/12a-archetypes.js', () => ({ getSuggestedArchetype: () => null, wsArchFigure: () => null }));
vi.mock('../js/parts/08-trends-payment.js', () => ({ autoResize: () => {} }));

async function freshModule() {
  vi.resetModules();
  mockDgKapi.mockReset();
  mockDgYanilmaKonustu.mockClear();
  mockDgIklimKaydet.mockClear();
  document.body.innerHTML = '<div id="as-aktif-kelime"></div>';
  const { S } = await import('../js/state.js');
  const mod = await import('../js/parts/13-extras.js');
  S.currentAIMode = undefined; // asModedenTon yolu kapalı — duygu zincirin ÜSTÜNDE mi diye net görülsün
  return { S, mod };
}

describe('asRefresh — duygu okuması zincirin EN ÜSTÜNDE (FAZ 16, K10)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

  it('okuma varsa dgKapi("atmosfer", …) ile çağrılır ve kelimesi şeride yazılır', async () => {
    const { mod } = await freshModule();
    mockDgKapi.mockReturnValue({ eksen: 'kutlama', gerekce: '', kanit: 'kullanıcının cümlesi', ikincil: null, krizOkundu: false });
    await mod.asRefresh();
    await vi.advanceTimersByTimeAsync(700);
    expect(mockDgKapi).toHaveBeenCalledWith('atmosfer', expect.objectContaining({ }));
    expect(document.getElementById('as-aktif-kelime').textContent.trim()).toBe('aydınlık'); // atmo.dg.kutlama
  });

  it('eksen kelimesiyle BİREBİR aynı değildir — berraklik "bulanıklık" yazar', async () => {
    const { mod } = await freshModule();
    mockDgKapi.mockReturnValue({ eksen: 'berraklik', gerekce: '', kanit: 'x', ikincil: null, krizOkundu: false });
    await mod.asRefresh();
    await vi.advanceTimersByTimeAsync(700);
    expect(document.getElementById('as-aktif-kelime').textContent.trim()).toBe('bulanıklık');
  });

  it('damga (K13) — okuma GERÇEKTEN gösterildiğinde dgYanilmaKonustu + dgIklimKaydet çağrılır', async () => {
    const { S, mod } = await freshModule();
    const eskiIklim = { yuzeyDefter: {} };
    S._dgIklim = eskiIklim;
    mockDgKapi.mockReturnValue({ eksen: 'diriltme', gerekce: '', kanit: 'x', ikincil: null, krizOkundu: false });
    await mod.asRefresh();
    // Çağrı ANINDAKİ iklim: dgYanilmaKonustu çağrıldıktan sonra S._dgIklim
    // yeni bir objeye ATANIR — burada ESKİ referansa karşı doğrulanır.
    expect(mockDgYanilmaKonustu).toHaveBeenCalledWith(eskiIklim, 'atmosfer');
    expect(mockDgIklimKaydet).toHaveBeenCalledTimes(1);
  });

  /* REGRESYON (faz denetimi, 2026-08-30) — damga koşulsuz basılıyordu.
     `asRefresh` saatte bir, her mod rozeti güncellemesinde ve her akış
     bitişinde koşar; `asGuncelle` aynı kelimede ekrana hiç dokunmaz. Damga
     o hâlde teslimi değil TAZELEMEYİ sayıyordu (§6.10). */
  it('aynı okuma ikinci kez tazelendiğinde damga TEKRAR basılmaz', async () => {
    const { S, mod } = await freshModule();
    S._dgIklim = { yuzeyDefter: {} };
    mockDgKapi.mockReturnValue({ eksen: 'kutlama', gerekce: '', kanit: 'x', ikincil: null, krizOkundu: false });
    await mod.asRefresh();
    await vi.advanceTimersByTimeAsync(700);
    expect(mockDgIklimKaydet).toHaveBeenCalledTimes(1);
    // İkinci tazeleme: kelime aynı → ekran değişmez, defter de artmaz.
    await mod.asRefresh();
    await vi.advanceTimersByTimeAsync(700);
    expect(mockDgIklimKaydet).toHaveBeenCalledTimes(1);
    expect(document.getElementById('as-aktif-kelime').textContent.trim()).toBe('aydınlık');
    // Okuma DEĞİŞİRSE yeni teslim vardır — damga yeniden basılır.
    mockDgKapi.mockReturnValue({ eksen: 'sahiplenme', gerekce: '', kanit: 'x', ikincil: null, krizOkundu: false });
    await mod.asRefresh();
    await vi.advanceTimersByTimeAsync(700);
    expect(mockDgIklimKaydet).toHaveBeenCalledTimes(2);
    expect(document.getElementById('as-aktif-kelime').textContent.trim()).toBe('ağırlık');
  });

  it('İklim henüz hidre değilse (null) damga YAZILMAZ ama kelime yine de gösterilir', async () => {
    const { S, mod } = await freshModule();
    S._dgIklim = null;
    mockDgKapi.mockReturnValue({ eksen: 'sahiplenme', gerekce: '', kanit: 'x', ikincil: null, krizOkundu: false });
    await mod.asRefresh();
    await vi.advanceTimersByTimeAsync(700);
    expect(document.getElementById('as-aktif-kelime').textContent.trim()).toBe('ağırlık');
    expect(mockDgYanilmaKonustu).not.toHaveBeenCalled();
    expect(mockDgIklimKaydet).not.toHaveBeenCalled();
  });

  it('KRİZ (tutma) atmosfere YANSIMAZ — dgKapi hiç okuma döndürmemiş gibi davranır', async () => {
    // Kontrol turu: dgKapi null döndüğünde zincir mod→özet→saat'e düşer.
    const { S: sNull, mod: modNull } = await freshModule();
    mockDgKapi.mockReturnValue(null);
    await modNull.asRefresh();
    await vi.advanceTimersByTimeAsync(700);
    const kanitsizKelime = document.getElementById('as-aktif-kelime').textContent.trim();

    // Sınanan tur: dgKapi 'tutma' döndürüyor — K9 kriz sohbete verilir,
    // dekora değil; sonuç KONTROL TURUYLA AYNI olmalı (kriz görünmez).
    const { mod: modKriz } = await freshModule();
    mockDgKapi.mockReturnValue({ eksen: 'tutma', gerekce: 'Kriz sinyali', kanit: null, ikincil: null, krizOkundu: true });
    await modKriz.asRefresh();
    await vi.advanceTimersByTimeAsync(700);
    const krizKelime = document.getElementById('as-aktif-kelime').textContent.trim();

    expect(krizKelime).toBe(kanitsizKelime);
    expect(mockDgYanilmaKonustu).not.toHaveBeenCalled();
    expect(mockDgIklimKaydet).not.toHaveBeenCalled();
  });
});
