/**
 * Tests for İç Çalışma 02 · FAZ 1 — ölçüm katmanı (nabzın yazılması).
 *
 * Kapsam iki damar:
 *   1) Bağlam Nabzı — buildContextPrompt (01) kanal→bayt defterini S._ctxOlcum'a
 *      yazar; ölçü KIRPILMIŞ hâli sayar (kırpmanın yapıldığı tek yerde alınır),
 *      09a'dan gelen `p_*` alt kırılımı birleşir ve tüketilir.
 *   2) Gizlilik mührü — wtLogCtx'e yalnız SAYI girer: anahtar deseni tutmayan
 *      ya da değeri sayı olmayan her giriş sessizce düşer. usage_events.meta'nın
 *      "metin içerik YASAK" sözleşmesi burada KODLA kanıtlanır, şemayla değil.
 *   3) Hafıza Nabzı — wtLogMemory satırının biçimi (tur/yol/süre/adet).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S } from '../js/state.js';
import { nowTR, detectTopics } from '../js/parts/00-config-tracking.js';

globalThis.nowTR = nowTR;
globalThis.detectTopics = detectTopics;

import { buildContextPrompt, invalidateContextCache } from '../js/parts/01-prompts-modes.js';

const CASUAL = 'selam nasılsın';

function resetFlow(intensity = 0) {
  S._emotionalFlow = intensity > 0 ? [{ intensity, direction: 'neutral', ts: Date.now() }] : [];
}

// ─── 1. Bağlam Nabzı — kanal→bayt defteri ────────────────────────────────────

describe('buildContextPrompt → S._ctxOlcum (bağlam nabzı defteri)', () => {
  beforeEach(() => {
    resetFlow();
    S._modeHint = 'soft';
    S._modeHistory = [];
    S._modeExplicitRequest = null;
    S._ctxOlcum = undefined;
    S._ctxOlcumP = null;
    invalidateContextCache();
  });

  it('her turda kanal defterini ve toplamı yazar', () => {
    const result = buildContextPrompt('', { _userText: CASUAL });
    expect(S._ctxOlcum).toBeTruthy();
    expect(S._ctxOlcum.toplam).toBe(result.length);
    expect(S._ctxOlcum.ctxMode).toBe(S._lastContextMode);
    expect(Object.keys(S._ctxOlcum.kanallar).length).toBeGreaterThan(0);
  });

  it('ölçü KIRPILMIŞ hâli sayar — bütçe tavanı ölçüme yansır', () => {
    resetFlow(1);
    // casual modda personalization tavanı 400 (_CONTEXT_BUDGETS); 1000 karakter girer
    buildContextPrompt('', { _userText: CASUAL, personalization: 'x'.repeat(1000) });
    expect(S._lastContextMode).toBe('casual');
    // _truncateSection: slice(0,400) + '…' → 401
    expect(S._ctxOlcum.kanallar.personalization).toBe(401);
  });

  it('bütçesi 0 olan kanal deftere HİÇ girmez (yazılmayan bayt sayılmaz)', () => {
    // kriz modunda recalled_memories bütçesi 0 — bölüm üretilmez
    buildContextPrompt('', { _userText: 'yardım', crisis: 'kriz notu', recalledMemories: 'eski bir anı' });
    expect(S._lastContextMode).toBe('crisis');
    expect(S._ctxOlcum.kanallar.recalled_memories).toBeUndefined();
  });

  it('09a alt kırılımı (p_*) deftere birleşir ve tüketilir', () => {
    S._ctxOlcumP = { p_kimlik: 120, p_calisma: 44 };
    buildContextPrompt('', { _userText: CASUAL });
    expect(S._ctxOlcum.kanallar.p_kimlik).toBe(120);
    expect(S._ctxOlcum.kanallar.p_calisma).toBe(44);
    expect(S._ctxOlcumP).toBeNull();   // bir sonraki tura sızmaz
  });

  it('defter her turda tazelenir — önceki turun kanalı taşınmaz', () => {
    buildContextPrompt('', { _userText: CASUAL, mirrorHypothesis: 'bir okuma' });
    expect(S._ctxOlcum.kanallar.mirror_hypothesis).toBeGreaterThan(0);
    buildContextPrompt('', { _userText: CASUAL });
    expect(S._ctxOlcum.kanallar.mirror_hypothesis).toBeUndefined();
  });
});

// ─── 2 + 3. Nabız yazımı (00f) ───────────────────────────────────────────────

const UID = 'ctx-olcum-user';

/** config.js'in sb'sini mock'lu insert ile değiştirir — 09f testindeki desen. */
async function mockSb() {
  vi.doMock('../js/config.js', async (importOriginal) => {
    const actual = await importOriginal();
    const insert = vi.fn().mockResolvedValue({ error: null });
    return { ...actual, sb: { from: vi.fn(() => ({ insert })), rpc: vi.fn() } };
  });
  const { sb } = await import('../js/config.js');
  return sb;
}

/** Kuyruğu boşaltıp sunucuya giden ham satırları döndürür. */
async function flushRows(sb) {
  await vi.advanceTimersByTimeAsync(60000);   // WT_FLUSH_MS
  const insert = sb.from.mock.results[0]?.value?.insert;
  return insert ? insert.mock.calls.flatMap((c) => c[0]) : [];
}

async function freshNabiz() {
  vi.resetModules();
  const sb = await mockSb();
  const { S: st } = await import('../js/state.js');
  const wt = await import('../js/parts/00f-kullanim-nabzi.js');
  st.currentUser = { id: UID };
  vi.useFakeTimers();
  wt.wtInit();
  return { sb, wt, st };
}

describe('wtLogCtx — gizlilik mührü (yalnız sayı geçer)', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.doUnmock('../js/config.js');
    document.body.innerHTML = '';
  });

  it('geçerli kanalları kind:"ctx" satırı olarak yazar', async () => {
    const { sb, wt } = await freshNabiz();
    wt.wtLogCtx({ personalization: 900, user_profile: 120 }, { mode: 'soft', ctxMode: 'standard', toplam: 1400 });
    const rows = await flushRows(sb);
    const ctx = rows.filter((r) => r.kind === 'ctx');
    expect(ctx).toHaveLength(1);
    expect(ctx[0].screen).toBe('standard');
    expect(ctx[0].prev_screen).toBe('soft');
    expect(ctx[0].duration_ms).toBe(0);
    expect(ctx[0].meta.kanallar).toEqual({ personalization: 900, user_profile: 120 });
    expect(ctx[0].meta.toplam).toBe(1400);
  });

  it('metin taşıyan değeri ve desen dışı anahtarı DÜŞÜRÜR', async () => {
    const { sb, wt } = await freshNabiz();
    wt.wtLogCtx({
      user_profile: 100,
      'kullanıcı mesajı': 50,                 // desen dışı anahtar (boşluk + TR harf)
      sizinti: 'bugün çok yorgunum',          // metin değer
      negatif: -5,                            // anlamsız ölçü
      bos: 0,                                 // yazılmayan bayt
    }, { ctxMode: 'casual' });
    const rows = await flushRows(sb);
    const ctx = rows.filter((r) => r.kind === 'ctx');
    expect(ctx[0].meta.kanallar).toEqual({ user_profile: 100 });
    // Hiçbir satırın meta'sı serbest metin taşımamalı — sözleşmenin kendisi
    const duz = JSON.stringify(rows);
    expect(duz).not.toContain('yorgunum');
    expect(duz).not.toContain('kullanıcı mesajı');
  });

  it('geçerli tek kanal bile yoksa satır YAZILMAZ', async () => {
    const { sb, wt } = await freshNabiz();
    wt.wtLogCtx({ 'Kullanıcı': 'metin' }, { ctxMode: 'standard' });
    const rows = await flushRows(sb);
    expect(rows.filter((r) => r.kind === 'ctx')).toHaveLength(0);
  });

  it('toplam verilmezse kanalların toplamına düşer', async () => {
    const { sb, wt } = await freshNabiz();
    wt.wtLogCtx({ a_kanal: 10, b_kanal: 32 }, { ctxMode: 'standard' });
    const rows = await flushRows(sb);
    expect(rows.find((r) => r.kind === 'ctx').meta.toplam).toBe(42);
  });
});

describe('wtLogMemory — hafıza nabzı satırı', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.doUnmock('../js/config.js');
    document.body.innerHTML = '';
  });

  it('recall satırını tur/yol/süre/adet ile yazar', async () => {
    const { sb, wt } = await freshNabiz();
    wt.wtLogMemory('recall', { yol: 'uzak', ms: 310, sayi: 3 });
    const rows = await flushRows(sb);
    const mem = rows.filter((r) => r.kind === 'memory');
    expect(mem).toHaveLength(1);
    expect(mem[0].screen).toBe('recall');
    expect(mem[0].prev_screen).toBe('uzak');       // uzak-yol yüzdesi SQL'de buradan
    expect(mem[0].duration_ms).toBe(310);
    expect(mem[0].meta).toEqual({ sayi: 3 });
  });

  it('boş/hatalı yolu da yazar — motorun çalışmadığı hâl de bir ölçümdür', async () => {
    const { sb, wt } = await freshNabiz();
    wt.wtLogMemory('ingest', { yol: 'hata', ms: 0, sayi: 0 });
    const rows = await flushRows(sb);
    const mem = rows.find((r) => r.kind === 'memory');
    expect(mem.prev_screen).toBe('hata');
    expect(mem.duration_ms).toBe(0);
    expect(mem.meta.sayi).toBe(0);
  });

  it('tur adı yoksa satır yazılmaz', async () => {
    const { sb, wt } = await freshNabiz();
    wt.wtLogMemory('', { yol: 'uzak', ms: 10, sayi: 1 });
    const rows = await flushRows(sb);
    expect(rows.filter((r) => r.kind === 'memory')).toHaveLength(0);
  });
});
