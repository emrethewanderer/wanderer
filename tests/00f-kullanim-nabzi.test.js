/**
 * Tests for js/parts/00f-kullanim-nabzi.js — Tanıma Motoru FAZ 1 (Oturum İzi).
 *
 * Kapsam: wtOverlayClose'un yeni `sonuc` argümanı (geri uyumlu + S._oturumIzi
 * yazımı), <1.5sn segment kapanışlarının skip izine düşmesi, _openView'in
 * ekran izi biriktirmesi. Sunucuya giden usage_events tarafı (mig 033) bu
 * dosyanın kapsamı DEĞİL — orada davranış değişmedi.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

async function freshModule() {
  vi.resetModules();
  const { S } = await import('../js/state.js');
  const { switchViewHooks } = await import('../js/parts/03-auth-shell.js');
  const wt = await import('../js/parts/00f-kullanim-nabzi.js');
  return { S, wt, switchViewHooks };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('wtOverlayClose(name, sonuc) — geri uyumluluk + oturum izi', () => {
  it('tek argümanlı çağrı hâlâ çalışır (20 mevcut çağrının sözleşmesi)', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = { id: 'u1' };
    vi.useFakeTimers();
    wt.wtInit();
    wt.wtOverlayOpen('bir-toren');
    vi.advanceTimersByTime(2000);
    expect(() => wt.wtOverlayClose('bir-toren')).not.toThrow();
    // sonuc verilmedi → torenler'e hiçbir şey düşmemeli (undefined = bilinmiyor)
    expect(S._oturumIzi.torenler).toEqual([]);
  });

  it("sonuc='muhur' verilince S._oturumIzi.torenler'e kaydeder", async () => {
    const { S, wt } = await freshModule();
    S.currentUser = { id: 'u1' };
    vi.useFakeTimers();
    wt.wtInit();
    wt.wtOverlayOpen('olus-davet');
    vi.advanceTimersByTime(2000);
    wt.wtOverlayClose('olus-davet', 'muhur');
    expect(S._oturumIzi.torenler).toEqual([
      expect.objectContaining({ ad: 'olus-davet', sonuc: 'muhur' }),
    ]);
  });

  it("sonuc='kapat' verilince de kaydeder — kapalı küme muhur|kapat", async () => {
    const { S, wt } = await freshModule();
    S.currentUser = { id: 'u1' };
    vi.useFakeTimers();
    wt.wtInit();
    wt.wtOverlayOpen('ayna-ani');
    vi.advanceTimersByTime(2000);
    wt.wtOverlayClose('ayna-ani', 'kapat');
    expect(S._oturumIzi.torenler).toEqual([
      expect.objectContaining({ ad: 'ayna-ani', sonuc: 'kapat' }),
    ]);
  });

  it('başka törenin adıyla kapatma denemesi mevcut overlay\'i etkilemez', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = { id: 'u1' };
    vi.useFakeTimers();
    wt.wtInit();
    wt.wtOverlayOpen('gunluk-ritus');
    wt.wtOverlayClose('baska-toren', 'muhur');  // isim uyuşmuyor — no-op
    expect(S._oturumIzi.torenler).toEqual([]);
    vi.advanceTimersByTime(2000);
    wt.wtOverlayClose('gunluk-ritus', 'muhur'); // doğru isim — şimdi kapanır
    expect(S._oturumIzi.torenler.length).toBe(1);
  });
});

describe('<1.5sn kapanış — I1 kör noktası kapandı', () => {
  it('kısa overlay kapanışı S._oturumIzi.skipler\'e düşer, sunucuya GİTMEZ', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = { id: 'u1' };
    vi.useFakeTimers();
    wt.wtInit();
    wt.wtOverlayOpen('kart-detay');
    vi.advanceTimersByTime(400); // < WT_MIN_MS (1500)
    wt.wtOverlayClose('kart-detay');
    expect(S._oturumIzi.skipler).toEqual([
      expect.objectContaining({ ekran: 'kart-detay', tur: 'overlay' }),
    ]);
    // Kısa kapanışta sonuc verilse bile skip'e düşer (K3 disiplini bozulmaz)
    expect(S._oturumIzi.torenler).toEqual([]);
  });

  it('1.5sn ve üzeri kapanış skip SAYILMAZ', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = { id: 'u1' };
    vi.useFakeTimers();
    wt.wtInit();
    wt.wtOverlayOpen('kart-detay');
    vi.advanceTimersByTime(1600);
    wt.wtOverlayClose('kart-detay');
    expect(S._oturumIzi.skipler).toEqual([]);
  });
});

describe('_openView (switchViewHooks üzerinden) — ekran izi', () => {
  it('ekran değişimi S._oturumIzi.ekranlar\'a düşer', async () => {
    const { S, wt, switchViewHooks } = await freshModule();
    S.currentUser = { id: 'u1' };
    wt.wtInit();
    switchViewHooks.runAfter('bugun');
    expect(S._oturumIzi.ekranlar).toEqual([
      expect.objectContaining({ ekran: 'bugun' }),
    ]);
  });

  it('aynı ekrana tekrar girmek yeni kayıt eklemez (segment sürer)', async () => {
    const { S, wt, switchViewHooks } = await freshModule();
    S.currentUser = { id: 'u1' };
    wt.wtInit();
    switchViewHooks.runAfter('chat');
    switchViewHooks.runAfter('chat');
    expect(S._oturumIzi.ekranlar.length).toBe(1);
  });
});
