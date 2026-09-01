/**
 * Tests for js/parts/13o-geri-cagri.js — DAVETİN DUYGUSU (13D K10, FAZ 19).
 *
 * Bu fazın kararı "hangi kelime" değil **"sussun mu"**dur. Davet İSTENMEDEN
 * gelir (kullanıcı susuyor, soru sormadı), o yüzden `dgKapi`'nin kendi
 * `davet` satırından geçer — `sohbet`in eşiksiz hattı burada yanlış olurdu,
 * çünkü o hat "bir yanıt her turda bir şey söylemek ZORUNDADIR" diye
 * eşiksizdir; davetin böyle bir zorunluluğu yoktur.
 *
 * Mühürlenen sözleşmeler:
 *   1. Kapı null dönerse prompt BUGÜNKÜYLE bit-be-bit aynı (hiçbir fallback
 *      sökülmedi, hiçbir blok eklenmedi).
 *   2. Kriz (`tutma`) daveti giydirmez — K9: kriz sohbetin işidir.
 *   3. Kanıtsız okuma daveti giydirmez (§6.10) — sohbet K6 gereği
 *      tanıklığa düşebilir çünkü yanıtlamak zorundadır; davet zorunda değil.
 *   4. Damga (K13) yalnız blok prompt'a GERÇEKTEN girdiğinde basılır.
 *   5. `gcDuyguOkuma()` 10q'nun "Neden bu?" paneline okumayı taşır —
 *      kapı susmuşsa `null` (panel de bugünküyle aynı kalır).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../js/parts/04-llm-hero-history.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, callLLM: vi.fn().mockResolvedValue('Bir süredir sessizsin — nasılsın?') };
});
vi.mock('../js/parts/09a-personalization-engine.js', () => ({
  buildPersonalizationPrompt: () => '[PERSONA]',
}));
vi.mock('../js/parts/16-i18n-prompts.js', () => ({
  p: (k, v) => (v && v.eksen ? `${k}:${v.eksen}` : (v && v.kanit ? `${k}:${v.kanit}` : k)),
  dp: () => [],
}));

async function freshModule() {
  vi.resetModules();
  const { S } = await import('../js/state.js');
  const gc = await import('../js/parts/13o-geri-cagri.js');
  const llm = await import('../js/parts/04-llm-hero-history.js');
  /* Casuslar import'tan SONRA kurulur: 13D'nin kendi `window.*` expose
     bloğu modül yüklenirken çalışır ve beforeEach'te kurulan casusu
     sessizce ezerdi (gerçek fonksiyon geri gelir, "is not a spy"). */
  window.dgYanilmaKonustu = vi.fn((iklim, yuzey) => ({ ...(iklim || {}), _son: yuzey }));
  window.dgIklimKaydet = vi.fn();
  return { S, gc, llm };
}

function seedFirable(S) {
  S.currentUser = { id: 'gc-dg-user' };
  S.currentSessId = 'sess-dg';
  S.chatHistory = [{ role: 'user', content: 'çok kızgınım bugün' }];
  S._crisisDayKey = null;
  S._crisisMsgLeft = 0;
  S._llmStreaming = false;
  S._gcLastFireMs = 0;
  S._gcLastFireSessId = null;
  S._gcSessFires = 0;
  S._gcPendingAt = 0;
  S._dgNabiz = { kuvvet: 3, deger: -1 };
  S._dgOncekiNabiz = { kuvvet: 2, deger: -1 };
  S._dgNabizZaman = Date.now();
  S._dgIklim = { yuzeyDefter: {} };
  document.body.innerHTML = '<div id="chat-view" class="active"></div><textarea id="chat-input"></textarea><div id="messages-area"></div>';
}

const OKUMA = (over) => Object.assign(
  { eksen: 'yatistirma', gerekce: '', kanit: 'çok kızgınım', ikincil: null, krizOkundu: true },
  over || {},
);

/** gcFire'ı koşturup callLLM'e giden systemPrompt'u döndürür. */
async function promptAl(S, gc, llm) {
  await gc.gcFire();
  const cagri = llm.callLLM.mock.calls.at(-1);
  return cagri ? cagri[0].systemPrompt : null;
}

beforeEach(() => {
  window.dgKapi = undefined; // her test kendi kapısını kurar (freshModule sonrası)
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
  delete window.dgKapi;
  delete window.dgYanilmaKonustu;
  delete window.dgIklimKaydet;
});

describe('davetin duygusu — kapı (FAZ 19)', () => {
  it('kapı null dönerse prompt bugünküyle BİT-BE-BİT aynı, damga da yok', async () => {
    const { S, gc, llm } = await freshModule();
    seedFirable(S);
    window.dgKapi = vi.fn().mockReturnValue(null);
    const prompt = await promptAl(S, gc, llm);
    expect(prompt).toBeTruthy();
    expect(prompt).not.toMatch(/prompt\.dg\./);
    expect(window.dgYanilmaKonustu).not.toHaveBeenCalled();
    expect(window.dgIklimKaydet).not.toHaveBeenCalled();
    expect(gc.gcDuyguOkuma()).toBeNull();
  });

  it('okuma varsa kartuş bloğu prompt\'a girer — YENİ anahtar yok, sohbetin kartuşları', async () => {
    const { S, gc, llm } = await freshModule();
    seedFirable(S);
    window.dgKapi = vi.fn().mockReturnValue(OKUMA());
    const prompt = await promptAl(S, gc, llm);
    expect(window.dgKapi).toHaveBeenCalledWith('davet', expect.objectContaining({
      oncekiNabiz: expect.anything(),   // kadran 1 — iki tanık
      zaman: expect.any(Number),        // kadran 2 — dk90 damgası
    }));
    expect(prompt).toContain('prompt.dg.kartus.yatistirma');
    expect(prompt).toContain('prompt.dg.yasak');
    expect(prompt).toContain('prompt.dg.kanit_satiri:çok kızgınım');
  });

  it('KRİZ (tutma) daveti giydirmez — K9: kriz sohbetin işidir', async () => {
    const { S, gc, llm } = await freshModule();
    seedFirable(S);
    window.dgKapi = vi.fn().mockReturnValue(OKUMA({ eksen: 'tutma', kanit: null }));
    const prompt = await promptAl(S, gc, llm);
    expect(prompt).not.toMatch(/prompt\.dg\./);
    expect(window.dgIklimKaydet).not.toHaveBeenCalled();
    expect(gc.gcDuyguOkuma()).toBeNull();
  });

  it('kanıtsız okuma daveti giydirmez — davetin yanıtlama zorunluluğu yok (§6.10)', async () => {
    const { S, gc, llm } = await freshModule();
    seedFirable(S);
    window.dgKapi = vi.fn().mockReturnValue(OKUMA({ eksen: 'taniklik', kanit: null }));
    const prompt = await promptAl(S, gc, llm);
    expect(prompt).not.toMatch(/prompt\.dg\./);
    expect(window.dgIklimKaydet).not.toHaveBeenCalled();
  });

  it('damga (K13) yalnız blok GERÇEKTEN girdiğinde basılır', async () => {
    const { S, gc, llm } = await freshModule();
    seedFirable(S);
    const eskiIklim = S._dgIklim;
    window.dgKapi = vi.fn().mockReturnValue(OKUMA());
    await promptAl(S, gc, llm);
    expect(window.dgYanilmaKonustu).toHaveBeenCalledWith(eskiIklim, 'davet');
    expect(window.dgIklimKaydet).toHaveBeenCalledTimes(1);
  });

  it('İklim hidre değilse damga yazılmaz ama davet yine giydirilir', async () => {
    const { S, gc, llm } = await freshModule();
    seedFirable(S);
    S._dgIklim = null;
    window.dgKapi = vi.fn().mockReturnValue(OKUMA());
    const prompt = await promptAl(S, gc, llm);
    expect(prompt).toContain('prompt.dg.kartus.yatistirma');
    expect(window.dgYanilmaKonustu).not.toHaveBeenCalled();
    expect(window.dgIklimKaydet).not.toHaveBeenCalled();
  });

  it('gcDuyguOkuma() okumayı 10q panelinin okuyabileceği yerde tutar (kadran 4)', async () => {
    const { S, gc, llm } = await freshModule();
    seedFirable(S);
    window.dgKapi = vi.fn().mockReturnValue(OKUMA());
    await promptAl(S, gc, llm);
    const okuma = gc.gcDuyguOkuma();
    expect(okuma).toBeTruthy();
    expect(okuma.kanit).toBe('çok kızgınım'); // kullanıcının KENDİ cümlesi
    expect(typeof window.gcDuyguOkuma).toBe('function');
  });
});
