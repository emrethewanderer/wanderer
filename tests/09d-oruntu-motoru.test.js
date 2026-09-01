/**
 * Tests for js/parts/09d-oruntu-motoru.js — Örüntü Motoru sinyal defteri.
 *
 * Covers: hidrasyon + bozuk-depo toleransı, omSessionHarvest idempotensi
 * (çift çağrı = çift sayım yok), kanıt alıntısı madenciliği (dp regex),
 * hafta agregasyonu (kimlik olay defteri → pledges/rituals, çift mühür yok),
 * defter tavanları.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Damıtma testleri için: yalnız callLLM stub'lanır — 04'ün diğer export'ları
// (renderHistory vb.) gerçek kalır, aksi halde import zinciri kırılır
vi.mock('../js/parts/04-llm-hero-history.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, callLLM: vi.fn() };
});

const UID = 'om-test-user';
const OM_KEY = `etw_oruntu_motoru_v1_${UID}`;

/** Modül-private durumu sıfırlamak için her testte taze modül yükle. */
async function freshModule() {
  vi.resetModules();
  const { S } = await import('../js/state.js');
  const infra = await import('../js/parts/00a-infrastructure.js');
  const om = await import('../js/parts/09d-oruntu-motoru.js');
  return { S, infra, om };
}

function seedUser(S) {
  S.currentUser = { id: UID };
  S.currentSessId = 'sess-1';
  S.chatHistory = [];
  S.avoidanceCount = 0;
  S.consecutiveAvoidance = 0;
  S._modeHistory = [];
  S._emotionalChain = [];
  S._kimlik = { ledger: [], base: {}, currentPersonaId: null, personaSince: null, personaHistory: [], seeded: false, lastTick: 0 };
  S._predictionModel = { trigger_sequences: [] };
  S._lifeMemory = { openLoops: [] };
  S._personalityMap = { defense_mechanisms: [] };
}

beforeEach(() => {
  vi.useRealTimers();
});

/** Debounced omSave'i deterministik boşaltmak için: Date GERÇEK kalır. */
function fakeTimers() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
}

describe('omInit + hidrasyon', () => {
  it('kullanıcı yokken sessizce çalışmaz', async () => {
    const { S, om } = await freshModule();
    S.currentUser = null;
    expect(() => om.omInit()).not.toThrow();
    expect(om.omPatternCount()).toBe(0);
  });

  it('bozuk depo verisini tolere eder (varsayılana döner)', async () => {
    const { S, infra, om } = await freshModule();
    seedUser(S);
    infra.SafeStorage.setRaw(OM_KEY, '{"v":1,"ledger":"BOZUK","distill":42}');
    expect(() => om.omInit()).not.toThrow();
    // Bozuk alanlar iskeletle değiştirilmiş olmalı — harvest patlamamalı
    S.chatHistory = [{ role: 'user', content: 'bugün kendimi iyi hissediyorum aslında' }];
    expect(() => om.omSessionHarvest()).not.toThrow();
  });
});

describe('omSessionHarvest — idempotent hasat', () => {
  it('aynı seans iki kez hasat edilirse gün toplamları katlanmaz', async () => {
    const { S, infra, om } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(OM_KEY, null);
    om.omInit();

    S.chatHistory = [
      { role: 'user', content: 'bugün işe gitmek istemedim açıkçası' },
      { role: 'assistant', content: 'anlıyorum' },
      { role: 'user', content: 'sonra bakarım dedim yine' },
    ];
    S.avoidanceCount = 2;
    S.consecutiveAvoidance = 1;
    S._modeHistory = ['soft', 'direct'];

    fakeTimers();
    om.omSessionHarvest();
    om.omSessionHarvest(); // ikinci çağrı — requestChatExit tekrar tetiklenebilir
    vi.runAllTimers(); // debounced omSave
    const st = infra.SafeStorage.get(OM_KEY);
    const row = st.ledger.days[st.ledger.days.length - 1];
    expect(row.userMsgs).toBe(2);
    expect(row.avoidance).toBe(2);
    expect(row.modeHints.soft).toBe(1);
    expect(row.modeHints.direct).toBe(1);
  });

  it('iki ayrı seansın katkıları toplanır', async () => {
    const { S, infra, om } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(OM_KEY, null);
    om.omInit();

    fakeTimers();
    S.chatHistory = [{ role: 'user', content: 'bu sabah her şey çok zor geldi' }];
    S.avoidanceCount = 1;
    om.omSessionHarvest();

    S.currentSessId = 'sess-2';
    S.chatHistory = [
      { role: 'user', content: 'akşam tekrar denedim ve konuştum' },
      { role: 'user', content: 'biraz daha iyi hissettim' },
    ];
    S.avoidanceCount = 0;
    om.omSessionHarvest();
    vi.runAllTimers();
    const st = infra.SafeStorage.get(OM_KEY);
    const row = st.ledger.days[st.ledger.days.length - 1];
    expect(row.userMsgs).toBe(3);
    expect(row.avoidance).toBe(1);
  });

  it('kanıt alıntıları dp regexleriyle sınıflanır ve günde 2 ile sınırlıdır', async () => {
    const { S, infra, om } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(OM_KEY, null);
    om.omInit();

    S.chatHistory = [
      { role: 'user', content: 'hep aynı şeyi yapıyorum ve bu döngüden çıkamıyorum' }, // awareness
      { role: 'user', content: 'yorgunum bugün, zamanım yok bunlarla uğraşmaya' },      // avoid
      { role: 'user', content: 'sanırım yine sonra bakarım diyeceğim buna' },           // avoid (3.)
    ];
    fakeTimers();
    om.omSessionHarvest();
    vi.runAllTimers();
    const st = infra.SafeStorage.get(OM_KEY);
    const row = st.ledger.days[st.ledger.days.length - 1];
    expect(row.quotes.length).toBe(2); // tavan
    expect(row.quotes[0].t).toBe('awareness');
    expect(row.quotes[1].t).toBe('avoid');
    expect(row.quotes.every((q) => q.q.length <= 120)).toBe(true);
  });
});

describe('omDailyRollup — hafta mühürleme', () => {
  it('geçen haftayı kimlik olaylarından mühürler; ikinci çağrı çiftlemez', async () => {
    const { S, infra, om } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(OM_KEY, null);

    // Geçen haftanın Çarşamba'sı (yerel) — olay damgaları
    const lastWed = new Date();
    lastWed.setDate(lastWed.getDate() - 7 - ((lastWed.getDay() + 6) % 7) + 2);
    lastWed.setHours(14, 0, 0, 0);
    const t = lastWed.getTime();
    S._kimlik.ledger = [
      { t, type: 'soz_verildi', w: 5 },
      { t: t + 1000, type: 'soz_verildi', w: 5 },
      { t: t + 2000, type: 'soz_tutuldu', w: 13 },
      { t: t + 3000, type: 'gun_muhru', w: 6 },
      { t: t + 4000, type: 'gun_muhru', w: 6 },
      { t: t + 5000, type: 'gecis_okuma', w: 12 },
    ];

    fakeTimers();
    om.omInit(); // rollup içinde
    vi.runAllTimers();
    let st = infra.SafeStorage.get(OM_KEY);
    expect(st.ledger.weeks.length).toBe(1);
    const wk = st.ledger.weeks[0];
    expect(wk.wk).toBe(om.omWeekKey(lastWed));
    expect(wk.pledges).toEqual({ given: 2, kept: 1, broken: 1 });
    expect(wk.rituals.seals).toBe(2);
    expect(wk.rituals.readings).toBe(1);
    expect(Array.isArray(wk.gaps)).toBe(true);

    om.omDailyRollup(); // idempotent
    vi.runAllTimers();
    st = infra.SafeStorage.get(OM_KEY);
    expect(st.ledger.weeks.length).toBe(1);
  });

  it('dünkü gün satırlarının _h iç haritası düşürülür ve gün tavanı 60 korunur', async () => {
    const { S, infra, om } = await freshModule();
    seedUser(S);

    // 70 sentetik gün satırı (eski → yeni), dünkünde _h izi
    const days = [];
    for (let i = 70; i >= 1; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dstr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      days.push({ d: dstr, mood: 3, userMsgs: 1, avoidance: 0, consecAvoid: 0, defenses: {}, modeHints: {}, quotes: [], _h: { s: { msgs: 1 } } });
    }
    infra.SafeStorage.set(OM_KEY, { v: 1, ledger: { days, weeks: [] }, distill: { lastWeek: null, attempts: { day: null, count: 0 }, current: null, history: [] }, ui: { lastSeenWeek: null, teaserCount: 0 } });

    fakeTimers();
    om.omInit();
    vi.runAllTimers();
    const st = infra.SafeStorage.get(OM_KEY);
    expect(st.ledger.days.length).toBeLessThanOrEqual(60);
    expect(st.ledger.days.every((r) => !r._h)).toBe(true);
    expect(st.ledger.weeks.length).toBeGreaterThanOrEqual(1); // biten haftalar mühürlendi
  });
});

describe('omMaybeDistill — haftalık damıtma', () => {
  /** Son 7 güne 6 kullanıcı mesajı seriler (asgari sinyal eşiğini aşar). */
  function seedSessions(S) {
    const mk = (daysAgo, text) => ({
      role: 'user', content: text,
      created_at: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    });
    S.allSessions = {
      s1: [mk(1, 'hep aynı şeyi yapıyorum ve yine erteledim her şeyi'),
           mk(1, 'yorgunum, zamanım yok diyorum ama aslında kaçıyorum sanki'),
           mk(2, 'bugün biraz yürüdüm ve kendimi iyi hissettim açıkçası')],
      s2: [mk(3, 'kardeşimle yine tartıştık, sonra hep suçlu hissediyorum'),
           mk(4, 'işteki sunumu yine son güne bıraktım, bu benim döngüm galiba'),
           mk(5, 'söz verdiğim halde sabah yine geç kalktım')],
    };
  }

  async function freshWithLLM() {
    const ctx = await freshModule();
    const { callLLM } = await import('../js/parts/04-llm-hero-history.js');
    callLLM.mockReset(); // mock kaydı resetModules'tan etkilenmez — sayaç sıfırla
    return { ...ctx, callLLM };
  }

  const VALID_JSON = JSON.stringify({
    ozet: 'Hafta boyunca erteleme döngüsü baskın; söz-sabah çatışması tekrar etti.',
    patterns: [
      { tip: 'kacinma', baslik: 'Son güne bırakma', kanit: 'işteki sunumu yine son güne bıraktım',
        kitap: { framework: 'Perde', itemId: 'erteleme' },
        cozum: { rituel: 'gecis_okuma', neden: 'kimlik inşası ertelemeyi kökünden çözer' }, guven: 0.85 },
      { tip: 'tetik', baslik: 'Uydurma teşhisli', kanit: 'kardeşimle yine tartıştık, sonra hep suçlu hissediyorum',
        kitap: { framework: 'Zehir', itemId: 'OLMAYAN-ID' },
        cozum: { rituel: 'GECERSIZ' }, guven: 0.7 },
      { tip: 'dongu', baslik: 'Düşük güven', kanit: 'başka cümle', kitap: null,
        cozum: { rituel: 'konusma' }, guven: 0.3 },
    ],
  });

  it('kanıtı kullanıcının cümlelerine bağlanmayan örüntü DÜŞER (13y alıntı kapısı)', async () => {
    const { S, infra, om, callLLM } = await freshWithLLM();
    seedUser(S);
    seedSessions(S);
    infra.SafeStorage.set(OM_KEY, null);
    // Model yüksek güvenle konuşuyor ama bu cümle kullanıcının ağzından çıkmadı.
    callLLM.mockResolvedValue(JSON.stringify({
      ozet: 'uydurulmuş kanıt denemesi',
      patterns: [{
        tip: 'dongu', baslik: 'Babayla çözülmemiş mesele',
        kanit: 'babamla ilişkim çocukluğumdan beri hep mesafeliydi',
        kitap: null, cozum: { rituel: 'konusma' }, guven: 0.95,
      }],
    }));

    om.omInit();
    await new Promise((r) => setTimeout(r, 700));
    expect(om.omPatternCount()).toBe(0); // aynaya taşınmadı
  });

  it('geçerli JSON → current + lastWeek + sessionPatternSummary + doğrulama budaması', async () => {
    const { S, infra, om, callLLM } = await freshWithLLM();
    seedUser(S);
    seedSessions(S);
    infra.SafeStorage.set(OM_KEY, null);
    callLLM.mockResolvedValue(VALID_JSON);

    om.omInit(); // içinde omMaybeDistill (async, await edilmez)
    await vi.waitFor(() => { expect(om.omPatternCount()).toBeGreaterThan(0); });

    expect(callLLM).toHaveBeenCalledTimes(1);
    const arg = callLLM.mock.calls[0][0];
    expect(arg.jsonMode).toBe(true);
    expect(arg.skipPersona).toBe(true);
    expect(arg.systemPrompt).toContain('örüntü'); // p() TR sözlüğü çözüldü

    // Doğrulama budaması: geçersiz itemId → kitap null + rituel fallback;
    // guven 0.3 < 0.55 → düşer
    expect(om.omPatternCount()).toBe(2);
    const top = om.omGetTopPatterns(3);
    expect(top).toContain('Son güne bırakma');
    expect(top).toContain('Perde: erteleme');
    expect(top).not.toContain('Düşük güven');
    expect(S.sessionPatternSummary).toContain('erteleme döngüsü');

    // omSave debounce'u (500ms) gerçek zamanlayıcıyla planlandı (waitFor real
    // timer'da koştu) — fakeTimers'a geçmek onu yakalamaz, gerçek zamanda bekle
    await new Promise((r) => setTimeout(r, 600));
    const st = infra.SafeStorage.get(OM_KEY);
    expect(st.distill.lastWeek).toBe(om.omWeekKey());
    const invalid = st.distill.current.patterns[1];
    expect(invalid.kitap).toBeNull();
    expect(invalid.cozum.rituel).toBe('konusma');
  });

  // FAZ 4 (.claude/plans/mod-sistemi.md): getModeEffectivenessScores() özeti
  // ledgerDigest'e girer — "bu kullanıcıda hangi kapı açılıyor" sinyali.
  it('mod etkililiği doluysa ledgerDigest\'e (LLM user prompt) satır olarak girer', async () => {
    const { S, infra, om, callLLM } = await freshWithLLM();
    seedUser(S);
    seedSessions(S);
    infra.SafeStorage.set(OM_KEY, null);
    S._adaptiveCommunication.effective_approaches = [
      { mode: 'reflective', score: 5 }, { mode: 'reflective', score: 5 },
    ];
    S._adaptiveCommunication.ineffective_approaches = [
      { mode: 'direct', score: -5 },
    ];
    callLLM.mockResolvedValue(VALID_JSON);

    om.omInit();
    await vi.waitFor(() => { expect(callLLM).toHaveBeenCalledTimes(1); });

    const userText = callLLM.mock.calls[0][0].contents[0].parts[0].text;
    expect(userText).toContain('mod etkililiği');
    expect(userText).toContain('reflective+10');
    expect(userText).toContain('direct-5');
  });

  it('mod etkililiği boşsa (tüm skorlar 0) satırı hiç eklemez', async () => {
    const { S, infra, om, callLLM } = await freshWithLLM();
    seedUser(S);
    seedSessions(S);
    infra.SafeStorage.set(OM_KEY, null);
    callLLM.mockResolvedValue(VALID_JSON);

    om.omInit();
    await vi.waitFor(() => { expect(callLLM).toHaveBeenCalledTimes(1); });

    const userText = callLLM.mock.calls[0][0].contents[0].parts[0].text;
    expect(userText).not.toContain('mod etkililiği');
  });

  it('LLM hatasında lastWeek işaretlenmez; günde 2 denemeden sonra durur', async () => {
    const { S, infra, om, callLLM } = await freshWithLLM();
    seedUser(S);
    seedSessions(S);
    infra.SafeStorage.set(OM_KEY, null);
    const err = new Error('429'); err.quota = true;
    callLLM.mockRejectedValue(err);

    om.omInit();
    await vi.waitFor(() => { expect(callLLM).toHaveBeenCalledTimes(1); });
    await om.omMaybeDistill(); // 2. deneme
    expect(callLLM).toHaveBeenCalledTimes(2);
    await om.omMaybeDistill(); // 3. deneme — günlük tavan
    expect(callLLM).toHaveBeenCalledTimes(2);

    await new Promise((r) => setTimeout(r, 600));
    const st = infra.SafeStorage.get(OM_KEY);
    expect(st.distill.lastWeek).toBeNull();
    expect(st.distill.attempts.count).toBe(2);
  });

  it('asgari sinyal yoksa (≤5 mesaj) LLM hiç çağrılmaz', async () => {
    const { S, om, callLLM } = await freshWithLLM();
    seedUser(S);
    S.allSessions = { s1: [{ role: 'user', content: 'merhaba', created_at: new Date().toISOString() }] };
    callLLM.mockResolvedValue(VALID_JSON);

    om.omInit();
    await new Promise((r) => setTimeout(r, 50));
    expect(callLLM).not.toHaveBeenCalled();
  });

  it('aynı hafta ikinci damıtma yapılmaz; taze ipucu haftada bir tüketilir', async () => {
    const { S, om, callLLM } = await freshWithLLM();
    seedUser(S);
    seedSessions(S);
    callLLM.mockResolvedValue(VALID_JSON);

    om.omInit();
    await vi.waitFor(() => { expect(om.omPatternCount()).toBeGreaterThan(0); });
    await om.omMaybeDistill();
    expect(callLLM).toHaveBeenCalledTimes(1); // lastWeek mühürlü

    const hint = om.omConsumeFreshHint();
    expect(hint).toContain('Son güne bırakma');
    expect(om.omConsumeFreshHint()).toBeNull(); // bir kez
  });
});

describe('örüntü yaşam döngüsü — _kokOf + _applyLifecycle', () => {
  it('kok: kitap teşhisi öncelikli, yoksa normalize başlık', async () => {
    const { om } = await freshModule();
    expect(om._kokOf({ kitap: { itemId: 'erteleme' }, baslik: 'Farklı Ad' })).toBe('k:erteleme');
    expect(om._kokOf({ kitap: null, baslik: 'Son Güne Bırakma!' })).toBe('b:son-güne-bırakma');
    expect(om._kokOf({ baslik: 'Çok Uzun Bir Başlık Beş Altı Yedi' })).toBe('b:çok-uzun-bir-başlık');
  });

  it('süren örüntü hafta sayar, yeni örüntü 1 başlar, sönen ≥2 hafta cozulmus olur', async () => {
    const { om } = await freshModule();
    const prev = { wk: '2026-W28', patterns: [
      { baslik: 'Son güne bırakma', tip: 'kacinma', kitap: { itemId: 'erteleme' }, hafta_sayisi: 2, ilk_wk: '2026-W27' },
      { baslik: 'Kıyas sarmalı', tip: 'dongu', kitap: { itemId: 'kiyas' }, hafta_sayisi: 3, ilk_wk: '2026-W26' },
      { baslik: 'Tek haftalık gürültü', tip: 'tetik', kitap: null, hafta_sayisi: 1, ilk_wk: '2026-W28' },
      { baslik: 'Sabah sözü tuttu', tip: 'ilerleme', kitap: null, hafta_sayisi: 2, ilk_wk: '2026-W27' },
    ] };
    const parsed = { ozet: 'x', patterns: [
      { baslik: 'Son güne bırakma', tip: 'kacinma', kitap: { itemId: 'erteleme' }, cozum: { rituel: 'konusma' }, guven: 0.8 },
      { baslik: 'Yeni bir iz', tip: 'tetik', kitap: null, cozum: { rituel: 'konusma' }, guven: 0.7 },
    ] };
    const cozulmus = om._applyLifecycle(parsed, prev, '2026-W29');

    expect(parsed.patterns[0].hafta_sayisi).toBe(3);       // süren: 2 → 3
    expect(parsed.patterns[0].ilk_wk).toBe('2026-W27');    // ilk hafta korunur
    expect(parsed.patterns[1].hafta_sayisi).toBe(1);       // yeni
    expect(parsed.patterns[1].ilk_wk).toBe('2026-W29');

    // Sönen: yalnız ≥2 hafta sürmüş, ilerleme olmayan → kiyas
    expect(cozulmus.length).toBe(1);
    expect(cozulmus[0].kok).toBe('k:kiyas');
    expect(cozulmus[0].hafta_sayisi).toBe(3);
    expect(cozulmus[0].sondu_wk).toBe('2026-W29');
  });

  it('sönen örüntü geri dönerse cozulmus listesinden düşer (ayna çelişmez)', async () => {
    const { S, infra, om, callLLM } = await (async () => {
      const ctx = await freshModule();
      const { callLLM } = await import('../js/parts/04-llm-hero-history.js');
      callLLM.mockReset();
      return { ...ctx, callLLM };
    })();
    seedUser(S);
    const mk = (daysAgo, text) => ({ role: 'user', content: text, created_at: new Date(Date.now() - daysAgo * 86400000).toISOString() });
    S.allSessions = { s1: [mk(1, 'yine son güne bıraktım her şeyi, aynı döngü'), mk(2, 'a2 uzun bir mesaj örneği burada'), mk(3, 'a3 uzun bir mesaj örneği'), mk(4, 'a4 uzun bir mesaj örneği'), mk(5, 'a5 uzun bir mesaj örneği'), mk(6, 'a6 uzun bir mesaj örneği')] };

    // Önceki durum: erteleme geçen damıtmada sönmüş görünüyor
    const lastWk = om.omWeekKey(new Date(Date.now() - 7 * 86400000));
    infra.SafeStorage.set(OM_KEY, { v: 1,
      ledger: { days: [], weeks: [] },
      distill: { lastWeek: lastWk, attempts: { day: null, count: 0 },
        current: { wk: lastWk, ozet: 'eski', patterns: [] },
        history: [],
        cozulmus: [{ kok: 'k:erteleme', baslik: 'Son güne bırakma', hafta_sayisi: 2, sondu_wk: lastWk }] },
      ui: { lastSeenWeek: null, teaserCount: 0 } });

    // Bu hafta erteleme GERİ DÖNÜYOR
    callLLM.mockResolvedValue(JSON.stringify({ ozet: 'geri döndü', patterns: [
      { tip: 'kacinma', baslik: 'Son güne bırakma', kanit: 'yine son güne bıraktım',
        kitap: { framework: 'Perde', itemId: 'erteleme' }, cozum: { rituel: 'konusma' }, guven: 0.8 },
    ] }));
    om.omInit();
    await vi.waitFor(() => { expect(om.omPatternCount()).toBe(1); });

    await new Promise((r) => setTimeout(r, 600));
    const st = infra.SafeStorage.get(OM_KEY);
    expect(st.distill.cozulmus.some((c) => c.kok === 'k:erteleme')).toBe(false); // geri dönen düştü
    expect(st.distill.current.patterns[0].hafta_sayisi).toBe(1); // seri kırıldı, 1'den başlar
  });

  it('kitapsız örüntü başlıkla eşleşir (kok fallback)', async () => {
    const { om } = await freshModule();
    const prev = { wk: '2026-W28', patterns: [
      { baslik: 'Gece kaçışı', tip: 'kacinma', kitap: null, hafta_sayisi: 1, ilk_wk: '2026-W28' },
    ] };
    const parsed = { ozet: 'x', patterns: [
      { baslik: 'Gece Kaçışı', tip: 'kacinma', kitap: null, cozum: { rituel: 'konusma' }, guven: 0.7 },
    ] };
    om._applyLifecycle(parsed, prev, '2026-W29');
    expect(parsed.patterns[0].hafta_sayisi).toBe(2); // büyük/küçük harf normalize
  });
});

describe('omWeekKey — ISO hafta kuralı (13i ile aynı)', () => {
  it('Pazartesi ve Pazar aynı haftada; hafta yıl sınırında ISO kuralına uyar', async () => {
    const { om } = await freshModule();
    expect(om.omWeekKey(new Date(2026, 5, 29))).toBe(om.omWeekKey(new Date(2026, 6, 5))); // Pzt 29 Haz — Paz 5 Tem
    expect(om.omWeekKey(new Date(2026, 0, 1))).toBe('2026-W01'); // 1 Oca 2026 Perşembe → W01
  });
});

describe('omSave lifecycle flush (FAZ 1 — kalıcılık)', () => {
  function setHidden(v) {
    Object.defineProperty(document, 'hidden', { value: v, configurable: true });
  }

  it('debounce penceresinde hidden olursa bekleyen kayıt anında yazılır', async () => {
    const { S, infra, om } = await freshModule();
    seedUser(S);
    fakeTimers();
    om.omInit();
    S.chatHistory = [{ role: 'user', content: 'bugün her şey üst üste geldi ama dayandım' }];
    om.omSessionHarvest();
    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    setHidden(false);
    const st = infra.SafeStorage.get(OM_KEY, null);
    expect(st?.ledger?.days?.length).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it('timer normal dolarsa lifecycle flush ikinci kez yazmaz', async () => {
    const { S, infra, om } = await freshModule();
    seedUser(S);
    fakeTimers();
    om.omInit();
    S.chatHistory = [{ role: 'user', content: 'bugün sakin bir gündü' }];
    om.omSessionHarvest();
    vi.runAllTimers(); // debounce doldu, kayıt yazıldı
    expect(infra.SafeStorage.get(OM_KEY, null)).toBeTruthy();
    const spy = vi.spyOn(infra.SafeStorage, 'set');
    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    setHidden(false);
    expect(spy).not.toHaveBeenCalled(); // _saveTimer null — çift kayıt yok
    spy.mockRestore();
    vi.useRealTimers();
  });
});

// ─── Tanıma Motoru FAZ 1 — GEZİNME hasadı (S._oturumIzi → gün satırı) ─────────
describe('omSessionHarvest — gezinme{} (İ1+İ7 oturum izi)', () => {
  function seedOturumIzi(S, over = {}) {
    S._oturumIzi = Object.assign(
      { ekranlar: [], kartlar: [], skipler: [], torenler: [] },
      over,
    );
  }

  it('S._oturumIzi boşsa gezinme sessizce sıfır kalır', async () => {
    const { S, infra, om } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(OM_KEY, null);
    om.omInit();
    seedOturumIzi(S);
    fakeTimers();
    om.omSessionHarvest();
    vi.runAllTimers();
    const st = infra.SafeStorage.get(OM_KEY);
    const row = st.ledger.days[st.ledger.days.length - 1];
    expect(row.gezinme).toEqual({ ekran: {}, kart: {}, skip: 0, enCokKart: null, toren: {} });
  });

  it('ekran/kart/skip/tören izleri gün satırına biner, en çok açılan kart doğru bulunur', async () => {
    const { S, infra, om } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(OM_KEY, null);
    om.omInit();
    seedOturumIzi(S, {
      ekranlar: [{ ekran: 'bugun', ts: 1 }, { ekran: 'chat', ts: 2 }, { ekran: 'bugun', ts: 3 }],
      kartlar: [{ id: 'sabir', ts: 1 }, { id: 'sabir', ts: 2 }, { id: 'cesaret', ts: 3 }],
      skipler: [{ ekran: 'kart-detay', tur: 'overlay', ts: 1 }],
      torenler: [
        { ad: 'olus-davet', sonuc: 'muhur', ts: 1 },
        { ad: 'olus-davet', sonuc: 'kapat', ts: 2 },
        { ad: 'ayna-ani', sonuc: 'kapat', ts: 3 },
      ],
    });
    fakeTimers();
    om.omSessionHarvest();
    vi.runAllTimers();
    const st = infra.SafeStorage.get(OM_KEY);
    const row = st.ledger.days[st.ledger.days.length - 1];
    expect(row.gezinme.ekran).toEqual({ bugun: 2, chat: 1 });
    expect(row.gezinme.skip).toBe(1);
    expect(row.gezinme.enCokKart).toBe('sabir');
    expect(row.gezinme.toren).toEqual({
      'olus-davet': { muhur: 1, kapat: 1 },
      'ayna-ani': { muhur: 0, kapat: 1 },
    });
  });

  it('aynı seans yeniden hasat edilirse gezinme KATLANMAZ (idempotent, _h kalıbı)', async () => {
    const { S, infra, om } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(OM_KEY, null);
    om.omInit();
    seedOturumIzi(S, { skipler: [{ ekran: 'kart-detay', tur: 'overlay', ts: 1 }] });
    fakeTimers();
    om.omSessionHarvest();
    om.omSessionHarvest(); // aynı seans — çift sayılmamalı
    vi.runAllTimers();
    const st = infra.SafeStorage.get(OM_KEY);
    const row = st.ledger.days[st.ledger.days.length - 1];
    expect(row.gezinme.skip).toBe(1);
  });

  it('iki ayrı seansın gezinmesi toplanır', async () => {
    const { S, infra, om } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(OM_KEY, null);
    om.omInit();
    seedOturumIzi(S, { ekranlar: [{ ekran: 'bugun', ts: 1 }] });
    fakeTimers();
    om.omSessionHarvest();

    S.currentSessId = 'sess-2';
    seedOturumIzi(S, { ekranlar: [{ ekran: 'bugun', ts: 2 }, { ekran: 'chat', ts: 3 }] });
    om.omSessionHarvest();
    vi.runAllTimers();
    const st = infra.SafeStorage.get(OM_KEY);
    const row = st.ledger.days[st.ledger.days.length - 1];
    expect(row.gezinme.ekran).toEqual({ bugun: 2, chat: 1 });
  });

  it('eski gün satırında gezinme alanı yoksa (göç öncesi) harvest patlamaz', async () => {
    const { S, infra, om } = await freshModule();
    seedUser(S);
    const today = infra.localISODate();
    infra.SafeStorage.set(OM_KEY, {
      v: 1,
      ledger: { days: [{ d: today, mood: null, userMsgs: 0, avoidance: 0, consecAvoid: 0, defenses: {}, modeHints: {}, quotes: [], _h: {} }], weeks: [] },
      distill: { lastWeek: null, attempts: { day: null, count: 0 }, current: null, history: [], cozulmus: [] },
      ui: { lastSeenWeek: null, teaserCount: 0 },
    });
    om.omInit();
    seedOturumIzi(S);
    fakeTimers();
    expect(() => om.omSessionHarvest()).not.toThrow();
    vi.runAllTimers();
  });
});

// ─── Tanıma Motoru FAZ 2 — Negatif Defter + Kapalı Döngü (İ2+İ3) ─────────────
describe('omKaydetAracGec / omKaydetGosterim / omKaydetTepki / omKaydetDavetSonuc', () => {
  it('omKaydetAracGec: aynı araç türü tekrar geçilirse sayaç artar', async () => {
    const { S, infra, om } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(OM_KEY, null);
    om.omInit();
    fakeTimers();
    om.omKaydetAracGec('takip');
    om.omKaydetAracGec('takip');
    om.omKaydetAracGec('kaynakca');
    vi.runAllTimers();
    const st = infra.SafeStorage.get(OM_KEY);
    const row = st.ledger.days[st.ledger.days.length - 1];
    expect(row.neg.arac).toEqual({ takip: 2, kaynakca: 1 });
  });

  it('omKaydetGosterim: günde 1 kayıt — aynı kart aynı gün tekrar düşmez', async () => {
    const { S, infra, om } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(OM_KEY, null);
    om.omInit();
    fakeTimers();
    om.omKaydetGosterim('spotlight', 'sabir');
    om.omKaydetGosterim('spotlight', 'sabir'); // aynı gün ikinci gösterim — dedup
    vi.runAllTimers();
    const st = infra.SafeStorage.get(OM_KEY);
    const row = st.ledger.days[st.ledger.days.length - 1];
    expect(row.neg.gosterim.spotlight).toEqual({ sabir: false });
  });

  it('omKaydetTepki: bugün gösterilmiş kart açılınca tepkisiz olmaktan çıkar', async () => {
    const { S, infra, om } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(OM_KEY, null);
    om.omInit();
    fakeTimers();
    om.omKaydetGosterim('emre', 'cesaret');
    om.omKaydetTepki('cesaret');
    vi.runAllTimers();
    const st = infra.SafeStorage.get(OM_KEY);
    const row = st.ledger.days[st.ledger.days.length - 1];
    expect(row.neg.gosterim.emre.cesaret).toBe(true);
  });

  it('omKaydetTepki: hiç gösterilmemiş bir kart için sessizce no-op', async () => {
    const { S, infra, om } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(OM_KEY, null);
    om.omInit();
    fakeTimers();
    expect(() => om.omKaydetTepki('hic-gosterilmemis')).not.toThrow();
    vi.runAllTimers();
  });

  it('omKaydetDavetSonuc: cevap/sessiz ayrı sayaçlarda birikir', async () => {
    const { S, infra, om } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(OM_KEY, null);
    om.omInit();
    fakeTimers();
    om.omKaydetDavetSonuc('cevap');
    om.omKaydetDavetSonuc('sessiz');
    om.omKaydetDavetSonuc('sessiz');
    vi.runAllTimers();
    const st = infra.SafeStorage.get(OM_KEY);
    const row = st.ledger.days[st.ledger.days.length - 1];
    expect(row.davet).toEqual({ cevap: 1, sessiz: 2 });
  });

  it('omKaydetDavetSonuc: geçersiz değer sessizce reddedilir', async () => {
    const { S, infra, om } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(OM_KEY, null);
    om.omInit();
    fakeTimers();
    om.omKaydetDavetSonuc('gecersiz');
    vi.runAllTimers();
    const st = infra.SafeStorage.get(OM_KEY, null);
    const row = st?.ledger?.days?.[st.ledger.days.length - 1];
    expect(row?.davet).toBeUndefined();
  });

  it('kullanıcı yokken (_omInited false) hiçbir kayıt fonksiyonu patlamaz', async () => {
    const { S, om } = await freshModule();
    S.currentUser = null;
    expect(() => om.omKaydetAracGec('takip')).not.toThrow();
    expect(() => om.omKaydetGosterim('emre', 'x')).not.toThrow();
    expect(() => om.omKaydetTepki('x')).not.toThrow();
    expect(() => om.omKaydetDavetSonuc('cevap')).not.toThrow();
  });
});
