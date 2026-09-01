/**
 * Tests for js/parts/04-llm-hero-history.js
 *
 * Pure logic: calculateStreak
 * Network-dependent: callLLM (fetch mocked via globalThis.fetch)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Static imports — module is already cached via setup.js mocks
import { calculateStreak, callLLM, _nextFallbackModel, _heroCollapseKarar } from '../js/parts/04-llm-hero-history.js';
import { recordActivityDay, SafeStorage } from '../js/parts/00a-infrastructure.js';
import { sb, CHAT_MODEL, SUMMARY_MODEL, LLM_FALLBACK_CHAIN } from '../js/config.js';

// ─── calculateStreak ─────────────────────────────────────────────────────────
// Wanderer Studio'ya has (13r Gün Serisi ayrımından sonra): yalnız ritüel
// aktivite defterini (recordActivityDay/getActivityDays) okur. Sohbet mesaj
// geçmişi (historyData parametresi) artık okunmuyor — geriye dönük uyumluluk
// için parametre duruyor ama etkisiz.

describe('calculateStreak()', () => {
  beforeEach(() => {
    localStorage.clear();
    // SafeStorage önbelleği (_kvCache) module-level Map — localStorage.clear()
    // bunu temizlemez; test izolasyonu için ledger anahtarını elle sil.
    SafeStorage.remove('etw_activity_ledger_v1');
  });

  it('returns 0 for empty input', () => {
    expect(calculateStreak([])).toBe(0);
    expect(calculateStreak(null)).toBe(0);
    expect(calculateStreak(undefined)).toBe(0);
  });

  it('ignores chat message history entirely — only the ritual ledger counts', () => {
    const data = [
      { role: 'user', content: 'Hi', created_at: new Date().toISOString() }
    ];
    expect(calculateStreak(data)).toBe(0);
  });

  it('returns 1 for a single ledger day today', () => {
    recordActivityDay(new Date());
    expect(calculateStreak([])).toBe(1);
  });

  it('returns 1 for a single ledger day yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    recordActivityDay(yesterday);
    expect(calculateStreak([])).toBe(1);
  });

  it('returns 0 for a ledger day 2 days ago (streak broken)', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    recordActivityDay(twoDaysAgo);
    expect(calculateStreak([])).toBe(0);
  });

  it('counts 3 consecutive ledger days correctly', () => {
    [0, 1, 2].forEach(offset => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      recordActivityDay(d);
    });
    expect(calculateStreak([])).toBe(3);
  });

  it('stops counting at a gap in consecutive ledger days', () => {
    // Today, yesterday, then a gap → 3 days ago
    [0, 1, 3].forEach(offset => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      recordActivityDay(d);
    });
    expect(calculateStreak([])).toBe(2);
  });

  it('deduplicates repeated recordActivityDay calls on the same day', () => {
    const today = new Date();
    recordActivityDay(today);
    recordActivityDay(today);
    recordActivityDay(today);
    expect(calculateStreak([])).toBe(1);
  });

  it('does not throw on malformed historyData', () => {
    const data = [{ role: 'user', content: 'no timestamp' }, null, undefined];
    expect(() => calculateStreak(data)).not.toThrow();
    expect(calculateStreak(data)).toBe(0);
  });
});

// ─── callLLM error handling ───────────────────────────────────────────────────

describe('callLLM() error handling', () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
    // Reset getSession to default (no session)
    vi.mocked(sb.auth.getSession).mockResolvedValue({
      data: { session: null }, error: null
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('throws when no session token is available', async () => {
    await expect(
      callLLM({ contents: [{ role: 'user', parts: [{ text: 'test' }] }] })
    ).rejects.toThrow('Oturum yok');
  });

  it('throws rate limit message on 429', async () => {
    vi.mocked(sb.auth.getSession).mockResolvedValueOnce({
      data: { session: { access_token: 'tok' } }, error: null
    });
    fetchSpy.mockResolvedValueOnce({
      ok: false, status: 429,
      text: async () => 'rate limit'
    });

    await expect(
      callLLM({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] })
    ).rejects.toThrow('Mesaj limitin doldu');
  });

  it('throws session expired message on persistent 401', async () => {
    vi.mocked(sb.auth.getSession).mockResolvedValueOnce({
      data: { session: { access_token: 'tok' } }, error: null
    });
    vi.mocked(sb.auth.refreshSession).mockResolvedValueOnce({
      data: { session: null }
    });
    // Both initial + retry return 401
    fetchSpy.mockResolvedValue({
      ok: false, status: 401,
      text: async () => ''
    });

    await expect(
      callLLM({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] })
    ).rejects.toThrow('Oturumun süresi doldu');
  });

  it('returns text content on successful non-streaming response', async () => {
    vi.mocked(sb.auth.getSession).mockResolvedValueOnce({
      data: { session: { access_token: 'tok' } }, error: null
    });
    fetchSpy.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({
        choices: [{ message: { content: 'Merhaba!' } }]
      })
    });

    const result = await callLLM({
      contents: [{ role: 'user', parts: [{ text: 'merhaba' }] }]
    });
    expect(result).toBe('Merhaba!');
  });

  it('throws when API returns empty choices array', async () => {
    vi.mocked(sb.auth.getSession).mockResolvedValueOnce({
      data: { session: { access_token: 'tok' } }, error: null
    });
    fetchSpy.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ choices: [] })
    });

    await expect(
      callLLM({ contents: [{ role: 'user', parts: [{ text: 'test' }] }] })
    ).rejects.toThrow('API yanıt döndürmedi');
  });

  it('throws generic API error with status code on unknown error', async () => {
    /* Zincirin TAMAMI denenir: primary → secondary → tertiary, hepsi 503.
       (Eskiden yalnız iki model deneniyordu — `find(m => m !== model)`
       üçüncü halkayı hiç görmüyordu; _nextFallbackModel bunu düzeltti.) */
    vi.mocked(sb.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'tok' } }, error: null
    });
    fetchSpy.mockResolvedValue({ ok: false, status: 503, text: async () => 'Service Unavailable' });

    await expect(
      callLLM({ contents: [{ role: 'user', parts: [{ text: 'test' }] }] })
    ).rejects.toThrow('API hatası (503)');
    expect(fetchSpy).toHaveBeenCalledTimes(LLM_FALLBACK_CHAIN.length);
  });
});

/* Yedek zincirinin kapısı — SUMMARY_MODEL ile CHAT_MODEL bugün aynı sabiti
   gösteriyor; bu test o tesadüf bozulduğunda (özetleyici ayrı bir modele
   alınırsa) sohbet dışı çağrıların sessizce yedeksiz kalmasını engeller. */
describe('_nextFallbackModel() — zincir sırayla ilerler, döngüye girmez', () => {
  it('zincirin HER halkası sırayla denenir — sonuncu hariç', () => {
    for (let i = 0; i < LLM_FALLBACK_CHAIN.length - 1; i++) {
      expect(_nextFallbackModel(LLM_FALLBACK_CHAIN[i])).toBe(LLM_FALLBACK_CHAIN[i + 1]);
    }
  });

  it('üçüncü halka ölü kalmaz — ikinciden sonra gelir', () => {
    // Eski `find(m => m !== model)` daima ikinciyi döndürüyordu: zincirin
    // son modeli hiç denenmiyordu.
    expect(LLM_FALLBACK_CHAIN.length).toBeGreaterThanOrEqual(3);
    expect(_nextFallbackModel(LLM_FALLBACK_CHAIN[1])).toBe(LLM_FALLBACK_CHAIN[2]);
  });

  it('zincirin sonunda durur — sonsuz döngü yok', () => {
    const son = LLM_FALLBACK_CHAIN[LLM_FALLBACK_CHAIN.length - 1];
    expect(_nextFallbackModel(son)).toBeNull();
  });

  it('hiçbir model kendine düşmez (her adım ileri)', () => {
    LLM_FALLBACK_CHAIN.forEach(m => {
      const next = _nextFallbackModel(m);
      if (next !== null) expect(next).not.toBe(m);
    });
  });

  it('sohbet ve özet modelleri yedek alır (ikisi ayrılsa bile)', () => {
    expect(_nextFallbackModel(CHAT_MODEL)).not.toBeNull();
    expect(_nextFallbackModel(SUMMARY_MODEL)).not.toBeNull();
  });

  it('tanınmayan model yedek almaz', () => {
    expect(_nextFallbackModel('bilinmeyen/model-x')).toBeNull();
    expect(_nextFallbackModel('')).toBeNull();
  });
});

// ─── _heroCollapseKarar — üst barın histerezisi ──────────────────────────────
// Bar çökünce .chat-area 35px uzar (57px → 22px), yani HER durum değişimi bir
// layout sıçramasıdır. Bu yüzden bandın KARARLI olması şart: gizleme eşiği
// gösterme eşiğinin üstünde durmalı. Eskiden ters kuruluydu (gizle 60, göster
// 400) ve 60–400 arası kararsız banda dönüşüyordu — kullanıcının her yön
// değişimi barı açıp kapatıyor, ekran titriyordu.

describe('_heroCollapseKarar() — bar histerezisi', () => {
  // Bir kaydırma dizisini baştan sona koşturup durum değişimlerini sayar
  const kostur = (konumlar, { hidden = false, lastTop = 0, mesaj = 14 } = {}) => {
    let toggle = 0;
    for (const top of konumlar) {
      const yeni = _heroCollapseKarar(top, lastTop, hidden, mesaj);
      if (yeni !== hidden) toggle++;
      hidden = yeni;
      lastTop = top;
    }
    return { toggle, hidden };
  };

  it('tepedeyken (top=0) bar daima açık', () => {
    expect(_heroCollapseKarar(0, 200, true, 14)).toBe(false);
  });

  it('5 mesajın altında bar gizlenmez', () => {
    expect(_heroCollapseKarar(300, 0, false, 4)).toBe(false);
  });

  it('aşağı kaydırınca gizleme eşiğini geçince çöker', () => {
    expect(_heroCollapseKarar(61, 0, false, 14)).toBe(true);
    expect(_heroCollapseKarar(59, 0, false, 14)).toBe(false); // eşik altı: dokunma
  });

  it('tepe bölgesine dönünce (top < 24) geri gelir', () => {
    expect(_heroCollapseKarar(20, 100, true, 14)).toBe(false);
  });

  it('KARARLI BANT: 24–60 arasında yön değişimi durumu bozmaz', () => {
    // Bar çökük; kullanıcı bandın içinde ileri-geri oynuyor
    const { toggle, hidden } = kostur([40, 30, 45, 28, 50, 35], { hidden: true, lastTop: 100 });
    expect(toggle).toBe(0);
    expect(hidden).toBe(true);
  });

  it('TİTREME YOK: tabanda ±12px parmak oynaması tek bir toggle bile üretmez', () => {
    // Kaydın gösterdiği senaryo — eski eşikle (SHOW_BELOW=400) burası 8 toggle üretiyordu
    const inis = kostur([50, 100, 175, 250, 275]);
    expect(inis.hidden).toBe(true); // yolda çöktü

    const oynama = kostur([263, 275, 263, 275, 263, 275, 263, 275],
                          { hidden: inis.hidden, lastTop: 275 });
    expect(oynama.toggle).toBe(0);
    expect(oynama.hidden).toBe(true);
  });

  it('uzun sohbette yukarı kaydırırken bar yolda erken açılmaz', () => {
    // 800px'den tepeye dönüş: bar yalnız SON adımda (tepe bölgesi) açılmalı
    const { toggle, hidden } = kostur([700, 500, 300, 150, 60, 30, 10],
                                      { hidden: true, lastTop: 800 });
    expect(toggle).toBe(1);
    expect(hidden).toBe(false);
  });
});

/* ─── İlk-token ölçümü (İç Çalışma 01 · boşluk B) ────────────────────────────
   Bekleyişin süresi, GERÇEKTEN yanıtlayan modelin adıyla birlikte yazılmalı:
   callLLM fallback'te kendini yeni modelle çağırdığı için ölçüm ancak
   streaming karesinde doğru olabilir. Bu testler ölçümün bir kez ve doğru
   modelle alındığını mühürler. */
describe('callLLM() streaming — ilk-token (TTFT) nabzı', () => {
  let fetchSpy;

  function sseYanit(parcalar) {
    const kodla = new TextEncoder();
    let i = 0;
    return {
      ok: true, status: 200,
      body: { getReader: () => ({
        read: async () => (i >= parcalar.length)
          ? { done: true, value: undefined }
          : { done: false, value: kodla.encode(parcalar[i++]) },
      }) },
    };
  }

  beforeEach(() => {
    fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
    window.wtLogLatency = vi.fn();
    vi.mocked(sb.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'tok' } }, error: null
    });
  });

  afterEach(() => {
    delete window.wtLogLatency;
    vi.restoreAllMocks();
  });

  it('ilk delta geldiğinde TTFT bir kez yazılır — yanıtlayan modelin adıyla', async () => {
    fetchSpy.mockResolvedValue(sseYanit([
      'data: {"choices":[{"delta":{"content":"Mer"}}]}\n',
      'data: {"choices":[{"delta":{"content":"haba"}}]}\n',
      'data: [DONE]\n',
    ]));

    const yanit = await callLLM({
      contents: [{ role: 'user', parts: [{ text: 'selam' }] }],
      stream: true, onChunk: () => {},
    });

    expect(yanit).toBe('Merhaba');
    expect(window.wtLogLatency).toHaveBeenCalledTimes(1);   // iki delta, tek ölçüm
    const [model, ms, baglam] = window.wtLogLatency.mock.calls[0];
    expect(model).toBe('deepseek-v4-flash');                 // CHAT_MODEL
    expect(ms).toBeGreaterThanOrEqual(0);
    expect(baglam).toHaveProperty('mode');
    expect(baglam).toHaveProperty('ctxMode');
  });

  it('hiç içerik akmazsa ölçüm yazılmaz — olmayan bekleyiş kaydedilmez', async () => {
    // Yalnız reasoning akıyor, görünür harf yok → _retryEmpty devreye girer
    fetchSpy.mockResolvedValue(sseYanit(['data: {"choices":[{"delta":{}}]}\n', 'data: [DONE]\n']));
    await callLLM({
      contents: [{ role: 'user', parts: [{ text: 'selam' }] }],
      stream: true, onChunk: () => {},
    }).catch(() => {});
    expect(window.wtLogLatency).not.toHaveBeenCalled();
  });

  it('nabız motoru yoksa akış bozulmaz (opsiyonel köprü)', async () => {
    delete window.wtLogLatency;
    fetchSpy.mockResolvedValue(sseYanit([
      'data: {"choices":[{"delta":{"content":"tamam"}}]}\n', 'data: [DONE]\n',
    ]));
    await expect(callLLM({
      contents: [{ role: 'user', parts: [{ text: 'selam' }] }],
      stream: true, onChunk: () => {},
    })).resolves.toBe('tamam');
  });
});
