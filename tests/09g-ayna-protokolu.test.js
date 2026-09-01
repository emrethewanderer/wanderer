/**
 * Tests for js/parts/09g-ayna-protokolu.js — Ayna Protokolü hipotez üretimi.
 *
 * Covers: hidrasyon + bozuk-depo toleransı, apMaybeGenerate (sinyal-yok atlama,
 * guven budaması + cap 3, aynı hafta ikinci çağrı yok, LLM hatasında günlük
 * deneme tavanı, zaten yanıtlanmış hipotezlerin korunması/tekrar sorulmaması),
 * apGetHintContext (haftada ≤2 tüketim, hafta değişince sıfırlanma),
 * apResolveHypothesis (ypUpdateHipotezDurum'a delege + _lastShownHint temizliği).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../js/parts/04-llm-hero-history.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, callLLM: vi.fn() };
});

const UID = 'ap-test-user';
const AP_KEY = `etw_ap_meta_${UID}`;

async function freshModule() {
  vi.resetModules();
  const { S } = await import('../js/state.js');
  const infra = await import('../js/parts/00a-infrastructure.js');
  const ap = await import('../js/parts/09g-ayna-protokolu.js');
  return { S, infra, ap };
}

async function freshWithLLM() {
  const ctx = await freshModule();
  const { callLLM } = await import('../js/parts/04-llm-hero-history.js');
  callLLM.mockReset();
  return { ...ctx, callLLM };
}

function seedUser(S) {
  S.currentUser = { id: UID };
}

/** window.yp… ve window.im… köprülerini her testte taze stub'lar. */
function stubBridges({ ypFullState = null, hipotezler = [], imCtx = '-' } = {}) {
  window.ypGetFullState = vi.fn(() => ypFullState);
  window.ypGetHipotezler = vi.fn(() => hipotezler);
  window.ypSetHipotezler = vi.fn();
  window.ypUpdateHipotezDurum = vi.fn(() => true);
  window.imGetContext = vi.fn(() => imCtx);
}

/* Kaynaklar KANITLIDIR: 09e artık kör noktayı da kullanıcının kendi
   cümlesine bağlıyor, hipotez de o cümleyi devralıyor. */
const RICH_YP = {
  cekirdek: { mesele: 'Yalnız kalmaktan korktuğun için ilişkilerinde onay arıyorsun.' },
  kor_noktalar: [{ metin: 'Zor konular açılınca espriyle geçiştiriyorsun.', kanit: 'ciddileşince şaka yapıp konuyu değiştiriyorum' }],
  celiskiler: [{ metin: 'Bağımsızlık istiyor ama onay arıyor', kanit: 'herkes ne der diye düşünüyorum' }],
  hipotezler: [],
};

beforeEach(() => {
  vi.useRealTimers();
  delete window.ypGetFullState;
  delete window.ypGetHipotezler;
  delete window.ypSetHipotezler;
  delete window.ypUpdateHipotezDurum;
  delete window.imGetContext;
});

describe('apInit + hidrasyon', () => {
  it('kullanıcı yokken sessizce çalışmaz', async () => {
    const { S, ap } = await freshModule();
    S.currentUser = null;
    expect(() => ap.apInit()).not.toThrow();
  });

  it('bozuk depo verisini tolere eder (varsayılana döner)', async () => {
    const { S, infra, ap } = await freshModule();
    seedUser(S);
    infra.SafeStorage.setRaw(AP_KEY, '{"attempts":"BOZUK"}');
    expect(() => ap.apInit()).not.toThrow();
  });
});

describe('apMaybeGenerate', () => {
  const VALID_JSON = JSON.stringify({
    hipotezler: [
      { metin: 'Zor konular açılınca espriyle geçiştiriyorsun çünkü kırılganlığını saklıyorsun.', dayanak: ['K1'] },
      { metin: 'Dayanaksız hipotez', dayanak: [] }, // etiket yok — düşmeli
      { metin: 'GEÇERSİZ_UZUN_METIN_'.repeat(15), dayanak: ['C1'] },
    ],
  });

  it('portrede kör nokta/çelişki yoksa LLM hiç çağrılmaz', async () => {
    const { S, ap, callLLM } = await freshWithLLM();
    seedUser(S);
    stubBridges({ ypFullState: { cekirdek: {}, kor_noktalar: [], celiskiler: [], hipotezler: [] } });
    ap.apInit();
    await new Promise((r) => setTimeout(r, 30));
    expect(callLLM).not.toHaveBeenCalled();
  });

  it('gerekçesiz (kanıtsız) hipotez sorulmaz — dayanaksız yargı veri değildir', async () => {
    const { S, ap, callLLM } = await freshWithLLM();
    seedUser(S);
    stubBridges({ ypFullState: RICH_YP });
    callLLM.mockResolvedValue(JSON.stringify({
      hipotezler: [{ metin: 'Dayanağını gösteremediğim bir yargı.', dayanak: [] }],
    }));

    ap.apInit();
    await new Promise((r) => setTimeout(r, 60));
    const calls = window.ypSetHipotezler.mock.calls;
    expect(calls.length === 0 || calls[0][0].length === 0).toBe(true);
  });

  it('geçerli JSON → dayanaksız budanır, cap 3, kanıt KAYNAKTAN devralınır', async () => {
    const { S, ap, callLLM } = await freshWithLLM();
    seedUser(S);
    stubBridges({ ypFullState: RICH_YP });
    callLLM.mockResolvedValue(VALID_JSON);

    ap.apInit();
    await vi.waitFor(() => { expect(window.ypSetHipotezler).toHaveBeenCalled(); });

    const arg = callLLM.mock.calls[0][0];
    expect(arg.jsonMode).toBe(true);
    expect(arg.skipPersona).toBe(true);

    const written = window.ypSetHipotezler.mock.calls[0][0];
    // Dayanaksız hipotez elenir; kalan 2'si (biri normal, biri aşırı-uzun
    // metin) 200 karaktere kırpılarak geçer — 09e'nin degerler kırpma
    // kalıbıyla tutarlı (reddetmek değil, kırpmak).
    expect(written.length).toBe(2);
    expect(written.some((h) => h.metin.includes('Dayanaksız'))).toBe(false);
    expect(written[0].metin).toContain('espriyle geçiştiriyorsun');
    expect(written.every((h) => h.metin.length <= 200)).toBe(true);
    expect(written[0].durum).toBe('aday');
    /* Kanıt modelin gerekçesi DEĞİL, kaynağın altındaki kullanıcı cümlesidir —
       09h bunu kullanıcıya tırnak içinde gösterecek. */
    expect(written[0].kanit).toEqual(['ciddileşince şaka yapıp konuyu değiştiriyorum']);
    expect(written[1].kanit).toEqual(['herkes ne der diye düşünüyorum']);
  });

  it('zaten yanıtlanmış (aday olmayan) hipotez metni tekrar önerilirse aynen korunur', async () => {
    const { S, ap, callLLM } = await freshWithLLM();
    seedUser(S);
    const already = { id: 'ap-old-1', metin: 'Zor konular açılınca espriyle geçiştiriyorsun çünkü kırılganlığını saklıyorsun.', kanit: [], guven: 0.7, durum: 'dogrulandi' };
    stubBridges({ ypFullState: RICH_YP, hipotezler: [already] });
    callLLM.mockResolvedValue(VALID_JSON);

    ap.apInit();
    await vi.waitFor(() => { expect(window.ypSetHipotezler).toHaveBeenCalled(); });
    const written = window.ypSetHipotezler.mock.calls[0][0];
    expect(written[0]).toEqual(already); // aynen korunmuş, 'aday'a döndürülmemiş
  });

  it('aynı hafta ikinci çağrı LLM tetiklemez', async () => {
    const { S, ap, callLLM } = await freshWithLLM();
    seedUser(S);
    stubBridges({ ypFullState: RICH_YP });
    callLLM.mockResolvedValue(VALID_JSON);

    ap.apInit();
    await vi.waitFor(() => { expect(callLLM).toHaveBeenCalledTimes(1); });
    await ap.apMaybeGenerate();
    expect(callLLM).toHaveBeenCalledTimes(1);
  });

  it('LLM hatasında günde 2 denemeden sonra durur, lastWeek işaretlenmez', async () => {
    const { S, infra, ap, callLLM } = await freshWithLLM();
    seedUser(S);
    stubBridges({ ypFullState: RICH_YP });
    const err = new Error('429'); err.quota = true;
    callLLM.mockRejectedValue(err);

    ap.apInit();
    await vi.waitFor(() => { expect(callLLM).toHaveBeenCalledTimes(1); });
    await ap.apMaybeGenerate(); // 2. deneme
    expect(callLLM).toHaveBeenCalledTimes(2);
    await ap.apMaybeGenerate(); // 3. deneme — günlük tavan
    expect(callLLM).toHaveBeenCalledTimes(2);
    expect(window.ypSetHipotezler).not.toHaveBeenCalled();

    await new Promise((r) => setTimeout(r, 50));
    const saved = infra.SafeStorage.get(AP_KEY);
    expect(saved.lastWeek).toBeNull();
    expect(saved.attempts.count).toBe(2);
  });
});

describe('apGetHintContext — haftada ≤2 tüketim, mühür TESLİMDE', () => {
  it('aday hipotez yoksa null döner', async () => {
    const { S, ap } = await freshModule();
    seedUser(S);
    stubBridges({ hipotezler: [] });
    ap.apInit();
    expect(ap.apGetHintContext()).toBeNull();
  });

  it('MÜHÜRLENMEDEN kota harcanmaz ve "soruldu" damgası basılmaz', async () => {
    /* Hayalet olayın kapısı: tur iptal edilir/hata verirse muhurle() hiç
       çağrılmaz — kullanıcının görmediği soru sorulmuş sayılmamalı. */
    const { S, ap } = await freshModule();
    seedUser(S);
    const aday = { id: 'ap-1', metin: 'Test hipotezi.', kanit: ['x'], guven: 0.7, durum: 'aday' };
    stubBridges({ hipotezler: [aday] });
    ap.apInit();

    for (let i = 0; i < 5; i++) {
      const h = ap.apGetHintContext();
      expect(h.metin).toContain('Test hipotezi.'); // kota tükenmedi
    }
    expect(ap.apGetLastShownHint()).toBeNull();    // damga basılmadı
  });

  it('mühürlenince 2 kez döner, 3. çağrıda null; _lastShownHint set edilir', async () => {
    const { S, ap } = await freshModule();
    seedUser(S);
    const aday = { id: 'ap-1', metin: 'Test hipotezi.', kanit: ['x'], guven: 0.7, durum: 'aday' };
    stubBridges({ hipotezler: [aday] });
    ap.apInit();

    const h1 = ap.apGetHintContext();
    expect(h1.metin).toContain('Test hipotezi.');
    h1.muhurle();
    expect(ap.apGetLastShownHint()).toEqual({ id: 'ap-1', metin: 'Test hipotezi.' });

    const h2 = ap.apGetHintContext();
    expect(h2.metin).toContain('Test hipotezi.');
    h2.muhurle();

    expect(ap.apGetHintContext()).toBeNull(); // haftalık tavan (2) doldu
  });

  it('aynı ipucu iki kez mühürlenemez (çift sayım yok)', async () => {
    const { S, ap } = await freshModule();
    seedUser(S);
    const aday = { id: 'ap-1', metin: 'Test hipotezi.', kanit: ['x'], guven: 0.7, durum: 'aday' };
    stubBridges({ hipotezler: [aday] });
    ap.apInit();

    const h = ap.apGetHintContext();
    expect(h.muhurle()).toBe(true);
    expect(h.muhurle()).toBe(false);
    expect(ap.apGetHintContext()).not.toBeNull(); // kotadan yalnız 1 gitti
  });
});

describe('apResolveHypothesis', () => {
  it('ypUpdateHipotezDurum\'a delege eder ve eşleşen _lastShownHint\'i temizler', async () => {
    const { S, ap } = await freshModule();
    seedUser(S);
    const aday = { id: 'ap-1', metin: 'Test hipotezi.', kanit: [], guven: 0.7, durum: 'aday' };
    stubBridges({ hipotezler: [aday] });
    ap.apInit();
    ap.apGetHintContext()?.muhurle(); // teslim mührü → _lastShownHint set

    const ok = ap.apResolveHypothesis('ap-1', 'dogrulandi');
    expect(ok).toBe(true);
    expect(window.ypUpdateHipotezDurum).toHaveBeenCalledWith('ap-1', 'dogrulandi');
    expect(ap.apGetLastShownHint()).toBeNull();
  });

  it('geçersiz durum değeri reddedilir', async () => {
    const { S, ap } = await freshModule();
    seedUser(S);
    stubBridges({});
    ap.apInit();
    expect(ap.apResolveHypothesis('ap-1', 'gecersiz')).toBe(false);
  });
});
