/**
 * Tests for js/parts/09f-epizodik-hafiza.js — Epizodik Hafıza (anlamsal geri-getirme).
 *
 * Covers: hidrasyon + bozuk-depo toleransı, ehIngestDay idempotensi (aynı gün
 * iki kez embed edilmez, içerik yoksa atlanır), ehIngestMoment günlük tavanı,
 * ehMaybeBackfill batch/cursor/tamamlanma, _shouldRecall gate (embed hiç
 * çağrılmaz), ehRecall 3 yollu davranış (remote başarı / remote hata →
 * yerel fallback / remote zaman aşımı → yerel fallback / fallback da yoksa boş).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// getEmbedding stub'lanır — 07'nin diğer export'ları gerçek kalır (import
// zinciri kırılmasın diye importOriginal).
vi.mock('../js/parts/07-settings-knowledge.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getEmbedding: vi.fn() };
});

// detectTopics deterministik hâle getirilir — gerçek dp() sözlüğüne bağımlı
// olmadan fallback örtüşmesini kontrollü test etmek için.
vi.mock('../js/parts/00-config-tracking.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    detectTopics: vi.fn((text) => (String(text || '').includes('ORTAK_KONU') ? ['ortak_konu'] : [])),
  };
});

const UID = 'eh-test-user';
const EH_KEY = `etw_eh_meta_${UID}`;

/** Modül-private durumu sıfırlamak için her testte taze modül yükle. */
async function freshModule() {
  vi.resetModules();
  const { S } = await import('../js/state.js');
  const infra = await import('../js/parts/00a-infrastructure.js');
  const { getEmbedding } = await import('../js/parts/07-settings-knowledge.js');
  const eh = await import('../js/parts/09f-epizodik-hafiza.js');
  getEmbedding.mockReset();
  return { S, infra, eh, getEmbedding };
}

/** config.js'in sb'sini mock'lu from/rpc ile değiştirir — her testte taze. */
async function mockSb() {
  vi.doMock('../js/config.js', async (importOriginal) => {
    const actual = await importOriginal();
    const insert = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    return { ...actual, sb: { from: vi.fn(() => ({ insert })), rpc } };
  });
  const { sb } = await import('../js/config.js');
  return sb;
}

function seedUser(S) {
  S.currentUser = { id: UID };
  S._narrativeMemory = [];
  S._emotionalFlow = [];
}

beforeEach(() => {
  vi.useRealTimers();
  vi.doUnmock('../js/config.js');
});

describe('ehInit + hidrasyon', () => {
  it('kullanıcı yokken sessizce çalışmaz', async () => {
    const { S, eh } = await freshModule();
    S.currentUser = null;
    expect(() => eh.ehInit()).not.toThrow();
  });

  it('bozuk depo verisini tolere eder (varsayılana döner)', async () => {
    const { S, infra, eh } = await freshModule();
    seedUser(S);
    infra.SafeStorage.setRaw(EH_KEY, '{"momentCount":"BOZUK","backfillCursor":"x"}');
    expect(() => eh.ehInit()).not.toThrow();
  });
});

describe('ehIngestDay', () => {
  it('içerik varsa embed edip yazar; aynı gün ikinci çağrı atlanır', async () => {
    await mockSb();
    const { S, eh, getEmbedding } = await freshModule();
    seedUser(S);
    getEmbedding.mockResolvedValue(new Array(1536).fill(0.01));
    const { sb } = await import('../js/config.js');

    eh.ehInit();
    await eh.ehIngestDay('2026-01-05', { portrait: 'Bugün zor ama umutlu bir gündü.' });
    expect(getEmbedding).toHaveBeenCalledTimes(1);
    expect(sb.from).toHaveBeenCalledWith('user_memories');

    await eh.ehIngestDay('2026-01-05', { portrait: 'Farklı bir portre metni bile olsa aynı gün.' });
    expect(getEmbedding).toHaveBeenCalledTimes(1); // ikinci çağrı yok — idempotent
  });

  it('portrait/theme/insight/pattern hepsi boşsa embed hiç çağrılmaz', async () => {
    await mockSb();
    const { S, eh, getEmbedding } = await freshModule();
    seedUser(S);
    eh.ehInit();
    await eh.ehIngestDay('2026-01-06', { portrait: '', theme: '', insight: '', pattern: '' });
    expect(getEmbedding).not.toHaveBeenCalled();
  });
});

describe('ehIngestMoment — günlük tavan', () => {
  it('günde 10 andan fazlası embed edilmez', async () => {
    await mockSb();
    const { S, eh, getEmbedding } = await freshModule();
    seedUser(S);
    getEmbedding.mockResolvedValue(new Array(1536).fill(0.01));
    eh.ehInit();

    for (let i = 0; i < 12; i++) {
      await eh.ehIngestMoment(`an ${i}`, { intensity: 4 });
    }
    expect(getEmbedding).toHaveBeenCalledTimes(10); // tavan
  });
});

describe('ehMaybeBackfill', () => {
  it('narrativeMemory yoksa hemen backfillDone işaretlenir', async () => {
    await mockSb();
    const { S, infra, eh, getEmbedding } = await freshModule();
    seedUser(S);
    eh.ehInit();
    await new Promise((r) => setTimeout(r, 20));
    expect(getEmbedding).not.toHaveBeenCalled();
    const saved = infra.SafeStorage.get(EH_KEY);
    expect(saved.backfillDone).toBe(true);
  });

  it('10\'arlık gruplar halinde işler, cursor ilerler, hepsi bitince backfillDone olur', async () => {
    await mockSb();
    const { S, infra, eh, getEmbedding } = await freshModule();
    seedUser(S);
    getEmbedding.mockResolvedValue(new Array(1536).fill(0.01));
    S._narrativeMemory = Array.from({ length: 15 }, (_, i) => ({
      date: `${i + 1} Ocak`, note: `gün ${i} özeti`, session_id: `day_2026-01-${String(i + 1).padStart(2, '0')}`,
    }));

    eh.ehInit(); // 1. backfill turu — ilk 10
    await new Promise((r) => setTimeout(r, 30));
    expect(getEmbedding).toHaveBeenCalledTimes(10);
    let saved = infra.SafeStorage.get(EH_KEY);
    expect(saved.backfillCursor).toBe(10);
    expect(saved.backfillDone).toBe(false);

    await eh.ehMaybeBackfill(); // 2. tur — kalan 5
    expect(getEmbedding).toHaveBeenCalledTimes(15);
    saved = infra.SafeStorage.get(EH_KEY);
    expect(saved.backfillCursor).toBe(15);
    expect(saved.backfillDone).toBe(true);

    await eh.ehMaybeBackfill(); // 3. tur — no-op
    expect(getEmbedding).toHaveBeenCalledTimes(15);
  });
});

describe('ehRecall — _shouldRecall gate', () => {
  it('kısa metinde embed hiç çağrılmaz, boş döner', async () => {
    await mockSb();
    const { S, eh, getEmbedding } = await freshModule();
    seedUser(S);
    eh.ehInit();
    const result = await eh.ehRecall('evet');
    expect(result).toBe('');
    expect(getEmbedding).not.toHaveBeenCalled();
  });

  it('geçmişe atıf sinyali yoksa ve yoğunluk düşükse çağrılmaz', async () => {
    await mockSb();
    const { S, eh, getEmbedding } = await freshModule();
    seedUser(S);
    S._emotionalFlow = [{ intensity: 2 }];
    eh.ehInit();
    const result = await eh.ehRecall('bugün işe gittim ve toplantım vardı normal bir gündü');
    expect(result).toBe('');
    expect(getEmbedding).not.toHaveBeenCalled();
  });

  it('yüksek yoğunlukta (>=4) geçmişe atıf olmasa da tetiklenir', async () => {
    await mockSb();
    const { S, eh, getEmbedding } = await freshModule();
    seedUser(S);
    getEmbedding.mockResolvedValue(new Array(1536).fill(0.01));
    S._emotionalFlow = [{ intensity: 4 }];
    eh.ehInit();
    await eh.ehRecall('bugün her şey çok ağır geldi, dayanamıyorum sanki');
    expect(getEmbedding).toHaveBeenCalledTimes(1);
  });
});

describe('ehRecall — remote başarı', () => {
  it('RPC sonuçlarını başlık + madde satırlarına biçimlendirir', async () => {
    const sb = await mockSb();
    const { S, eh, getEmbedding } = await freshModule();
    seedUser(S);
    getEmbedding.mockResolvedValue(new Array(1536).fill(0.01));
    sb.rpc.mockResolvedValue({
      data: [{ id: 1, content: 'Geçen ay da böyle hissetmiştin.', created_at: '2026-01-01T10:00:00.000Z', similarity: 0.9 }],
      error: null,
    });
    eh.ehInit();
    const result = await eh.ehRecall('yine aynı şeyi hissediyorum bu hafta');
    expect(sb.rpc).toHaveBeenCalledWith('match_user_memories', expect.objectContaining({ p_match_count: 3 }));
    expect(result).toContain('Geçen ay da böyle hissetmiştin.');
  });
});

describe('ehRecall — fallback zinciri', () => {
  it('RPC hata dönerse yerel konu-örtüşmesi fallback\'ine düşer', async () => {
    const sb = await mockSb();
    const { S, eh, getEmbedding } = await freshModule();
    seedUser(S);
    getEmbedding.mockResolvedValue(new Array(1536).fill(0.01));
    sb.rpc.mockResolvedValue({ data: null, error: new Error('rpc yok (mig 034 ELLE)') });
    S._narrativeMemory = [{ date: '3 Ocak', note: 'ORTAK_KONU üzerine zor bir gün geçirmiştin.', session_id: 'day_x' }];
    eh.ehInit();

    const result = await eh.ehRecall('ORTAK_KONU ile ilgili şeyi tekrar yaşadım');
    expect(result).toContain('ORTAK_KONU üzerine zor bir gün geçirmiştin.');
  });

  it('remote zaman aşımına uğrarsa yerel fallback kullanılır', async () => {
    const sb = await mockSb();
    const { S, eh, getEmbedding } = await freshModule();
    seedUser(S);
    getEmbedding.mockReturnValue(new Promise(() => {})); // asla resolve olmaz
    S._narrativeMemory = [{ date: '3 Ocak', note: 'ORTAK_KONU üzerine zor bir gün geçirmiştin.', session_id: 'day_x' }];
    eh.ehInit();

    vi.useFakeTimers();
    const pending = eh.ehRecall('ORTAK_KONU ile ilgili şeyi tekrar yaşadım');
    await vi.advanceTimersByTimeAsync(850);
    const result = await pending;
    vi.useRealTimers();

    expect(result).toContain('ORTAK_KONU üzerine zor bir gün geçirmiştin.');
    expect(sb.rpc).not.toHaveBeenCalled(); // getEmbedding hiç dönmediği için RPC'ye ulaşılmadı
  });

  it('fallback için de örtüşme yoksa boş döner', async () => {
    const sb = await mockSb();
    const { S, eh, getEmbedding } = await freshModule();
    seedUser(S);
    getEmbedding.mockResolvedValue(new Array(1536).fill(0.01));
    sb.rpc.mockResolvedValue({ data: null, error: new Error('rpc yok') });
    S._narrativeMemory = [{ date: '3 Ocak', note: 'Alakasız bir gün özeti.', session_id: 'day_x' }];
    eh.ehInit();

    const result = await eh.ehRecall('ORTAK_KONU ile ilgili şeyi tekrar yaşadım');
    expect(result).toBe('');
  });

  it('RPC hatasız ama BOŞ DİZİ dönerse yerel fallback\'e düşer (FAZ 5 — data:[] dalı)', async () => {
    const sb = await mockSb();
    const { S, eh, getEmbedding } = await freshModule();
    seedUser(S);
    getEmbedding.mockResolvedValue(new Array(1536).fill(0.01));
    sb.rpc.mockResolvedValue({ data: [], error: null }); // hatasız ama örtüşme yok
    S._narrativeMemory = [{ date: '3 Ocak', note: 'ORTAK_KONU üzerine zor bir gün geçirmiştin.', session_id: 'day_x' }];
    eh.ehInit();

    const result = await eh.ehRecall('ORTAK_KONU ile ilgili şeyi tekrar yaşadım');
    expect(sb.rpc).toHaveBeenCalled();
    expect(result).toContain('ORTAK_KONU üzerine zor bir gün geçirmiştin.');
  });
});

describe('_insertMemory hata yolu (FAZ 5)', () => {
  it('insert error dönerse ehIngestDay lastIngestDay SET ETMEZ (sonraki gün yeniden dener)', async () => {
    const sb = await mockSb();
    const { S, eh, getEmbedding } = await freshModule();
    seedUser(S);
    getEmbedding.mockResolvedValue(new Array(1536).fill(0.01));
    const { sb: cfgSb } = await import('../js/config.js');
    cfgSb.from = vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: new Error('tablo yok') }) }));
    eh.ehInit();

    await eh.ehIngestDay('2026-02-01', { portrait: 'Bugün zor bir gündü.' });
    // lastIngestDay set edilmediyse aynı gün TEKRAR denenebilir olmalı:
    await eh.ehIngestDay('2026-02-01', { portrait: 'Bugün zor bir gündü, ikinci deneme.' });
    expect(cfgSb.from).toHaveBeenCalledTimes(2); // iki deneme de insert'e ulaştı — idempotent guard hiç kapanmadı
  });
});

// ─── ehPrefetch — oturumun sıcak anısı (İç Çalışma 02 · boşluk C) ────────────

describe('ehPrefetch — kanıtsız sorgu yok', () => {
  it('anlatı hafızası boşsa hiç çalışmaz (uydurulmuş sorgu yok)', async () => {
    await mockSb();
    const { S, eh, getEmbedding } = await freshModule();
    seedUser(S);
    eh.ehInit();
    await eh.ehPrefetch();
    expect(getEmbedding).not.toHaveBeenCalled();
  });

  it('kaynak çok kısaysa çalışmaz (20 karakter eşiği)', async () => {
    const sb = await mockSb();
    const { S, infra, eh } = await freshModule();
    seedUser(S);
    // Backfill de aynı havuzdan embed harcar; prefetch'i yalıtmak için kapalı doğ.
    infra.SafeStorage.setRaw(EH_KEY, JSON.stringify({ backfillDone: true }));
    S._narrativeMemory = [{ note: 'kısa not', date: '2026-08-01' }];
    eh.ehInit();
    await eh.ehPrefetch();
    expect(sb.rpc).not.toHaveBeenCalled();   // prefetch'in imzası match_user_memories'tir
  });

  it('eşzamanlı iki çağrı tek embed harcar (uçuş kilidi)', async () => {
    const sb = await mockSb();
    const { S, infra, eh, getEmbedding } = await freshModule();
    seedUser(S);
    infra.SafeStorage.setRaw(EH_KEY, JSON.stringify({ backfillDone: true }));
    S._narrativeMemory = [{ note: 'Dün eşikte durup geri adım attığını yazmıştın.', date: '2026-08-17' }];
    getEmbedding.mockResolvedValue(new Array(1536).fill(0.01));
    sb.rpc.mockResolvedValue({ data: [{ content: 'Geçen ay da aynı eşikteydin.', created_at: '2026-07-10T09:00:00.000Z' }], error: null });
    eh.ehInit();                    // ateşle-unut prefetch burada başlar
    await Promise.all([eh.ehPrefetch(), eh.ehPrefetch()]);
    expect(getEmbedding).toHaveBeenCalledTimes(1);
  });

  it('kaynağın kendisi sonuçtan elenir — yankı hatırlama değildir', async () => {
    const sb = await mockSb();
    const { S, infra, eh, getEmbedding } = await freshModule();
    seedUser(S);
    infra.SafeStorage.setRaw(EH_KEY, JSON.stringify({ backfillDone: true }));
    const kaynak = 'Dün eşikte durup geri adım attığını yazmıştın.';
    S._narrativeMemory = [{ note: kaynak, date: '2026-08-17' }];
    getEmbedding.mockResolvedValue(new Array(1536).fill(0.01));
    sb.rpc.mockResolvedValue({ data: [{ content: kaynak, created_at: '2026-08-17T09:00:00.000Z' }], error: null });
    eh.ehInit();
    await eh.ehPrefetch();
    // tek sonuç kaynağın kendisiydi → sıcak anı doğmaz, ilk tur boş döner
    expect(await eh.ehRecall('bugün nasılım bilmiyorum')).toBe('');
  });
});

describe('ehRecall — sıcak yol (prefetch tüketimi)', () => {
  async function sicakKur() {
    const sb = await mockSb();
    const mod = await freshModule();
    seedUser(mod.S);
    mod.infra.SafeStorage.setRaw(EH_KEY, JSON.stringify({ backfillDone: true }));
    mod.S._narrativeMemory = [{ note: 'Dün eşikte durup geri adım attığını yazmıştın.', date: '2026-08-17' }];
    mod.getEmbedding.mockResolvedValue(new Array(1536).fill(0.01));
    sb.rpc.mockResolvedValue({ data: [{ content: 'Geçen ay da aynı eşikteydin.', created_at: '2026-07-10T09:00:00.000Z' }], error: null });
    mod.eh.ehInit();
    await mod.eh.ehPrefetch();
    return { ...mod, sb };
  }

  it('oturumun ilk turunda kapı sorulmadan bağlama girer', async () => {
    const { eh } = await sicakKur();
    // "bugün nasılsın" _shouldRecall'dan geçmez — sıcak anı yine de gelir
    const result = await eh.ehRecall('bugün biraz dağınık hissediyorum galiba');
    expect(result).toContain('Geçen ay da aynı eşikteydin.');
  });

  it('sıcak anı bir kez tüketilir — ikinci turda kapı geri gelir', async () => {
    const { eh, getEmbedding } = await sicakKur();
    await eh.ehRecall('bugün biraz dağınık hissediyorum galiba');
    const cagriOnce = getEmbedding.mock.calls.length;
    const ikinci = await eh.ehRecall('bugün biraz dağınık hissediyorum galiba');
    expect(ikinci).toBe('');                                   // kapı kapalı
    expect(getEmbedding.mock.calls.length).toBe(cagriOnce);    // yeni embed yok
  });

  it('sıcak anı tükendikten sonra güçlü sinyal normal yolu açar', async () => {
    const { eh, sb } = await sicakKur();
    await eh.ehRecall('bugün biraz dağınık hissediyorum galiba');   // sıcak tüketildi
    const rpcOnce = sb.rpc.mock.calls.length;
    const result = await eh.ehRecall('geçen hafta da aynı şeyi yaşamıştım sanki');
    expect(sb.rpc.mock.calls.length).toBe(rpcOnce + 1);             // bu tur yeniden sordu
    expect(result).toContain('Geçen ay da aynı eşikteydin.');
  });
});
