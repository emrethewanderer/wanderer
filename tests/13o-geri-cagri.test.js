/**
 * Tests for js/parts/13o-geri-cagri.js — Tanıma Motoru FAZ 2 (İ3, kapalı döngü).
 *
 * Kapsam SADECE yeni davranış: gcFire() sonrası bekleyen bir ölçüm penceresi
 * açılır (S._gcPendingAt); pencere içinde bir mesaj gelirse gcResolvePending()
 * 'cevap' yazar, pencere dolarsa kendi zamanlayıcısı 'sessiz' yazar — ikisi asla
 * ÇİFT sayılmaz. Balon üretiminin kendisi (LLM çağrısı, bağlam montajı) bu
 * dosyanın kapsamı DEĞİL, mevcut davranış zaten prod'da çalışıyor.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../js/parts/04-llm-hero-history.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, callLLM: vi.fn().mockResolvedValue('Bir süredir sessizsin — nasılsın?') };
});

async function freshModule() {
  vi.resetModules();
  const { S } = await import('../js/state.js');
  const gc = await import('../js/parts/13o-geri-cagri.js');
  const llm = await import('../js/parts/04-llm-hero-history.js');
  return { S, gc, llm };
}

function seedFirable(S) {
  S.currentUser = { id: 'gc-test-user' };
  S.currentSessId = 'sess-1';
  S.chatHistory = [{ role: 'user', content: 'merhaba' }];
  S._crisisDayKey = null;
  S._crisisMsgLeft = 0;
  S._llmStreaming = false;
  S._gcLastFireMs = 0;
  S._gcLastFireSessId = null;
  S._gcSessFires = 0;
  S._gcPendingAt = 0;
  document.body.innerHTML = '<div id="chat-view" class="active"></div><textarea id="chat-input"></textarea><div id="messages-area"></div>';
}

beforeEach(() => {
  window.GC_SILENCE_MS = 1000; // testte gerçek 2.5dk beklenmesin
});

afterEach(() => {
  vi.useRealTimers();
  delete window.GC_SILENCE_MS;
  delete window.omKaydetDavetSonuc;
});

describe('gcResolvePending — bekleyen davet çözümü', () => {
  it('bekleyen yoksa sessizce no-op', async () => {
    const { S, gc } = await freshModule();
    S._gcPendingAt = 0;
    const spy = vi.fn();
    window.omKaydetDavetSonuc = spy;
    gc.gcResolvePending();
    expect(spy).not.toHaveBeenCalled();
  });

  it('pencere içinde (≤10dk) çağrılırsa cevap yazar ve pending temizlenir', async () => {
    const { S, gc } = await freshModule();
    vi.useFakeTimers();
    const spy = vi.fn();
    window.omKaydetDavetSonuc = spy;
    S._gcPendingAt = Date.now();
    vi.advanceTimersByTime(3 * 60000); // 3 dk sonra cevap geldi
    gc.gcResolvePending();
    expect(spy).toHaveBeenCalledWith('cevap');
    expect(S._gcPendingAt).toBe(0);
  });

  it('pencere dolduktan sonra (geç gelen mesaj) sessizce hiçbir şey yazmaz — çift sayım yok', async () => {
    const { S, gc } = await freshModule();
    vi.useFakeTimers();
    const spy = vi.fn();
    window.omKaydetDavetSonuc = spy;
    S._gcPendingAt = Date.now();
    vi.advanceTimersByTime(11 * 60000); // pencere zaten geçti
    gc.gcResolvePending();
    expect(spy).not.toHaveBeenCalledWith('cevap');
  });
});

describe('gcFire — kapalı döngü zamanlayıcısı (İ3)', () => {
  it('başarılı fire sonrası S._gcPendingAt set edilir', async () => {
    const { S, gc } = await freshModule();
    seedFirable(S);
    await gc.gcFire();
    expect(S._gcPendingAt).toBeGreaterThan(0);
  });

  it('10 dk boyunca cevap gelmezse zamanlayıcı kendi \'sessiz\'ini yazar', async () => {
    const { S, gc } = await freshModule();
    seedFirable(S);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const spy = vi.fn();
    window.omKaydetDavetSonuc = spy;
    await gc.gcFire();
    expect(S._gcPendingAt).toBeGreaterThan(0);
    await vi.advanceTimersByTimeAsync(10 * 60000 + 1000);
    expect(spy).toHaveBeenCalledWith('sessiz');
    expect(S._gcPendingAt).toBe(0);
  });

  it('pencere içinde gcResolvePending çağrılırsa sonraki zamanlayıcı sessiz olarak İKİNCİ kez yazmaz', async () => {
    const { S, gc } = await freshModule();
    seedFirable(S);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const spy = vi.fn();
    window.omKaydetDavetSonuc = spy;
    await gc.gcFire();
    await vi.advanceTimersByTimeAsync(2 * 60000); // 2 dk sonra kullanıcı yazdı
    gc.gcResolvePending();
    expect(spy).toHaveBeenCalledWith('cevap');
    spy.mockClear();
    await vi.advanceTimersByTimeAsync(9 * 60000); // eski zamanlayıcı burada dolar
    expect(spy).not.toHaveBeenCalled(); // firedAt artık S._gcPendingAt ile eşleşmiyor
  });
});
