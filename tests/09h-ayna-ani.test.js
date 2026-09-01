/**
 * Tests for js/parts/09h-ayna-ani.js — Ayna Anı töreni (görünür yüzey).
 *
 * jsdom ortamında gerçek DOM manipülasyonu test edilir: teaser/empty/hipotez
 * dalları, üçlü seçim butonlarının doğru köprüyü çağırması, mühür/ret sonuç
 * ekranı, oda alt-satırı senkronu.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

async function freshModule() {
  vi.resetModules();
  const { S } = await import('../js/state.js');
  const ay = await import('../js/parts/09h-ayna-ani.js');
  return { S, ay };
}

function stubBridges({ hipotezler = [], premium = true } = {}) {
  window.ypGetHipotezler = vi.fn(() => hipotezler);
  window.apResolveHypothesis = vi.fn(() => true);
  window.wtOverlayOpen = vi.fn();
  window.wtOverlayClose = vi.fn();
  window.fxCue = vi.fn();
  window.showPremiumFeatureSpotlight = vi.fn();
  return premium;
}

beforeEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
  delete window.ypGetHipotezler;
  delete window.apResolveHypothesis;
  delete window.wtOverlayOpen;
  delete window.wtOverlayClose;
  delete window.fxCue;
  delete window.showPremiumFeatureSpotlight;
});

describe('ayOpen — dallar', () => {
  it('çift açılmayı önler', async () => {
    const { S, ay } = await freshModule();
    S.isPremium = true;
    stubBridges({ hipotezler: [] });
    ay.ayOpen();
    ay.ayOpen();
    expect(document.querySelectorAll('#ay-overlay').length).toBe(1);
  });

  it('premium değilse teaser gösterir, wtOverlayOpen çağrılır', async () => {
    const { S, ay } = await freshModule();
    S.isPremium = false;
    stubBridges({ hipotezler: [{ id: 'ap-1', metin: 'Test', kanit: [], guven: 0.7, durum: 'aday' }] });
    ay.ayOpen();
    expect(window.wtOverlayOpen).toHaveBeenCalledWith('ayna-ani');
    expect(document.querySelector('.ay-teaser')).toBeTruthy();
    expect(document.getElementById('ay-teaser-cta')).toBeTruthy();
  });

  it('premium ve aday hipotez yoksa boş durum gösterir', async () => {
    const { S, ay } = await freshModule();
    S.isPremium = true;
    stubBridges({ hipotezler: [] });
    ay.ayOpen();
    expect(document.querySelector('.ay-empty')).toBeTruthy();
  });

  it('premium ve aday hipotez varsa metni + kanıtları + üç butonu render eder', async () => {
    const { S, ay } = await freshModule();
    S.isPremium = true;
    stubBridges({ hipotezler: [{ id: 'ap-1', metin: 'Zor konularda espriye sarılıyorsun.', kanit: ['kanıt 1', 'kanıt 2'], guven: 0.7, durum: 'aday' }] });
    ay.ayOpen();
    expect(document.querySelector('.ay-hipotez').textContent).toContain('espriye sarılıyorsun');
    expect(document.querySelectorAll('.ay-kanit-item').length).toBe(2);
    expect(document.getElementById('ay-confirm')).toBeTruthy();
    expect(document.getElementById('ay-reject')).toBeTruthy();
    expect(document.getElementById('ay-unsure')).toBeTruthy();
  });

  it('yalnız ilk \'aday\' hipotezi gösterir, doğrulanmış olanı atlar', async () => {
    const { S, ay } = await freshModule();
    S.isPremium = true;
    stubBridges({ hipotezler: [
      { id: 'ap-0', metin: 'Zaten doğrulanmış.', kanit: [], guven: 0.7, durum: 'dogrulandi' },
      { id: 'ap-1', metin: 'Hâlâ aday olan.', kanit: [], guven: 0.7, durum: 'aday' },
    ] });
    ay.ayOpen();
    expect(document.querySelector('.ay-hipotez').textContent).toContain('Hâlâ aday olan');
  });
});

describe('ayOpen — üçlü seçim', () => {
  const CANDIDATE = { id: 'ap-1', metin: 'Test hipotezi.', kanit: ['kanıt'], guven: 0.7, durum: 'aday' };

  it('"Bu Benim" → apResolveHypothesis(dogrulandi) + fxCue(seal) + altın sonuç ekranı', async () => {
    const { S, ay } = await freshModule();
    S.isPremium = true;
    stubBridges({ hipotezler: [CANDIDATE] });
    ay.ayOpen();
    document.getElementById('ay-confirm').click();

    expect(window.apResolveHypothesis).toHaveBeenCalledWith('ap-1', 'dogrulandi');
    expect(window.fxCue).toHaveBeenCalledWith('seal');
    const result = document.querySelector('.ay-result');
    expect(result).toBeTruthy();
    expect(result.classList.contains('ay-result--reject')).toBe(false);
    expect(document.querySelector('.ay-result-text').textContent).toContain('artık biliyorum');
  });

  it('"Bu Ben Değilim" → apResolveHypothesis(reddedildi), fxCue ÇAĞRILMAZ, nötr sonuç ekranı', async () => {
    const { S, ay } = await freshModule();
    S.isPremium = true;
    stubBridges({ hipotezler: [CANDIDATE] });
    ay.ayOpen();
    document.getElementById('ay-reject').click();

    expect(window.apResolveHypothesis).toHaveBeenCalledWith('ap-1', 'reddedildi');
    expect(window.fxCue).not.toHaveBeenCalled();
    const result = document.querySelector('.ay-result');
    expect(result.classList.contains('ay-result--reject')).toBe(true);
    expect(document.querySelector('.ay-result-text').textContent).toContain('yanlış tutmuşum');
  });

  it('"Emin değilim" → hipotez durumu değişmeden overlay kapanır', async () => {
    const { S, ay } = await freshModule();
    S.isPremium = true;
    stubBridges({ hipotezler: [CANDIDATE] });
    ay.ayOpen();
    document.getElementById('ay-unsure').click();

    expect(window.apResolveHypothesis).not.toHaveBeenCalled();
    expect(document.getElementById('ay-overlay')).toBeNull();
    // Tanıma Motoru (FAZ 1) — karar verilmedi, kararsız çıkış: 'kapat'.
    expect(window.wtOverlayClose).toHaveBeenCalledWith('ayna-ani', 'kapat');
  });

  // DENETİM 2026-07-31 — sonuç ekranı 2.2sn duruyor; butonlar ayakta kalırsa
  // kullanıcı o pencerede ikinci ve TERS kararı da bastırabiliyordu.
  it('karar verildikten sonra üçlü seçim sökülür — ikinci karar mümkün değil', async () => {
    const { S, ay } = await freshModule();
    S.isPremium = true;
    stubBridges({ hipotezler: [CANDIDATE] });
    ay.ayOpen();
    document.getElementById('ay-confirm').click();

    expect(document.getElementById('ay-confirm')).toBeNull();
    expect(document.getElementById('ay-reject')).toBeNull();
    expect(document.getElementById('ay-unsure')).toBeNull();
    expect(window.apResolveHypothesis).toHaveBeenCalledTimes(1);
  });

  it('mühür sonrası bir süre sonra overlay kendiliğinden kapanır — sonuc muhur', async () => {
    const { S, ay } = await freshModule();
    S.isPremium = true;
    stubBridges({ hipotezler: [CANDIDATE] });
    vi.useFakeTimers();
    ay.ayOpen();
    document.getElementById('ay-confirm').click();
    expect(document.getElementById('ay-overlay')).toBeTruthy();
    vi.advanceTimersByTime(2300);
    expect(document.getElementById('ay-overlay')).toBeNull();
    // Tanıma Motoru (FAZ 1) — karar verildi (Bu Benim ya da Bu Ben Değilim
    // ikisi de sayılır): 'muhur'.
    expect(window.wtOverlayClose).toHaveBeenCalledWith('ayna-ani', 'muhur');
    vi.useRealTimers();
  });

  it('"Bu Ben Değilim" sonrası da sonuc muhur taşır (karar verildi, ret de bir karardır)', async () => {
    const { S, ay } = await freshModule();
    S.isPremium = true;
    stubBridges({ hipotezler: [CANDIDATE] });
    vi.useFakeTimers();
    ay.ayOpen();
    document.getElementById('ay-reject').click();
    vi.advanceTimersByTime(2300);
    expect(window.wtOverlayClose).toHaveBeenCalledWith('ayna-ani', 'muhur');
    vi.useRealTimers();
  });
});

describe('ayRefreshRoomSub', () => {
  it('aday hipotez varsa "sana bir sorum var" + pulse active', async () => {
    const { ay } = await freshModule();
    document.body.innerHTML = '<div id="studio-ayna-sub"></div><span id="ws-ay-pulse"></span>';
    stubBridges({ hipotezler: [{ id: 'ap-1', metin: 'x', kanit: [], guven: 0.7, durum: 'aday' }] });
    ay.ayRefreshRoomSub();
    expect(document.getElementById('studio-ayna-sub').textContent).toContain('sorum var');
    expect(document.getElementById('ws-ay-pulse').classList.contains('active')).toBe(true);
  });

  it('aday hipotez yoksa varsayılan metin + pulse pasif', async () => {
    const { ay } = await freshModule();
    document.body.innerHTML = '<div id="studio-ayna-sub"></div><span id="ws-ay-pulse" class="active"></span>';
    stubBridges({ hipotezler: [] });
    ay.ayRefreshRoomSub();
    expect(document.getElementById('studio-ayna-sub').textContent).toContain('gösteriyor');
    expect(document.getElementById('ws-ay-pulse').classList.contains('active')).toBe(false);
  });
});

// ─── Kapanış yolları (FAZ 2) ─────────────────────────────────────────────────
// Eski kod teaser/empty dallarında foot.innerHTML='' ile Kapat'ı siliyordu —
// overlay kapatılamıyor, Gözlemevi'nde wtOverlayOpen yetim kalıyordu.
describe('kapanış yolları (FAZ 2 — kapanamayan overlay onarımı)', () => {
  const KAPAT = '#ay-foot .btn-outline-gold';

  it("ücretsiz + aday YOK: Kapat foot'ta durur ve kapatır", async () => {
    const { S, ay } = await freshModule();
    S.isPremium = false;
    stubBridges({ hipotezler: [] });
    ay.ayOpen();
    expect(document.querySelector('.ay-teaser')).toBeTruthy();
    const kapat = document.querySelector(KAPAT);
    expect(kapat).toBeTruthy();
    kapat.click();
    expect(document.getElementById('ay-overlay')).toBeNull();
    expect(window.wtOverlayClose).toHaveBeenCalledWith('ayna-ani', 'kapat');
  });

  it('ücretsiz + aday VAR: hem CTA hem Kapat mevcut', async () => {
    const { S, ay } = await freshModule();
    S.isPremium = false;
    stubBridges({ hipotezler: [{ id: 'ap-1', metin: 'Test', kanit: [], guven: 0.7, durum: 'aday' }] });
    ay.ayOpen();
    expect(document.getElementById('ay-teaser-cta')).toBeTruthy();
    expect(document.querySelector(KAPAT)).toBeTruthy();
  });

  it('premium + aday YOK (.ay-empty): Kapat çalışır', async () => {
    const { S, ay } = await freshModule();
    S.isPremium = true;
    stubBridges({ hipotezler: [] });
    ay.ayOpen();
    expect(document.querySelector('.ay-empty')).toBeTruthy();
    const kapat = document.querySelector(KAPAT);
    expect(kapat).toBeTruthy();
    kapat.click();
    expect(document.getElementById('ay-overlay')).toBeNull();
    expect(window.wtOverlayClose).toHaveBeenCalledWith('ayna-ani', 'kapat');
  });

  it('backdrop tıklaması kapatır ve wtOverlayClose çağrılır', async () => {
    const { S, ay } = await freshModule();
    S.isPremium = true;
    stubBridges({ hipotezler: [] });
    ay.ayOpen();
    document.getElementById('ay-overlay').click(); // e.target === overlay
    expect(document.getElementById('ay-overlay')).toBeNull();
    expect(window.wtOverlayClose).toHaveBeenCalledWith('ayna-ani', 'kapat');
  });
});
