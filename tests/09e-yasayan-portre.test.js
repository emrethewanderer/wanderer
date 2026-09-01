/**
 * Tests for js/parts/09e-yasayan-portre.js — Yaşayan Portre günlük konsolidasyon.
 *
 * Covers: hidrasyon + bozuk-depo toleransı, günde-bir konsolidasyon gate'i,
 * LLM çıktısı doğrulama/budama (kor_noktalar guven eşiği, cap'ler), 429/parse
 * hatasında lastConsolidated işaretlenmemesi + günlük deneme tavanı, asgari
 * sinyal yokken LLM'in hiç çağrılmaması, ypGetContext/ypHasCore okuyucuları,
 * ypResetPortre.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Yalnız callLLM stub'lanır — 04'ün diğer export'ları gerçek kalır
vi.mock('../js/parts/04-llm-hero-history.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, callLLM: vi.fn() };
});

const UID = 'yp-test-user';
const YP_KEY = `etw_yp_dosya_${UID}`;

/** Modül-private durumu sıfırlamak için her testte taze modül yükle. */
async function freshModule() {
  vi.resetModules();
  const { S } = await import('../js/state.js');
  const infra = await import('../js/parts/00a-infrastructure.js');
  const yp = await import('../js/parts/09e-yasayan-portre.js');
  return { S, infra, yp };
}

async function freshWithLLM() {
  const ctx = await freshModule();
  const { callLLM } = await import('../js/parts/04-llm-hero-history.js');
  callLLM.mockReset();
  return { ...ctx, callLLM };
}

function seedUser(S) {
  S.currentUser = { id: UID };
  S._narrativeMemory = [];
  S._personalityMap = {
    communication: { style: 'unknown', avg_msg_length: 0, msg_lengths: [] },
    values: [], self_descriptions: [], defense_mechanisms: [],
  };
  S._relationshipDepth = { total_messages: 0, trust_score: 0, alliance_strength: 50, vulnerability_depth: 0, breakthroughs_count: 0 };
  S._lifeMemory = { people: {}, openLoops: [], lifeFacts: [] };
  /* Kanıt havuzu (13y alıntı kapısı): portrenin "kanit" alanları bu GERÇEK
     cümlelere bağlanır. Havuz boşken her yorum haklı olarak düşer — kanıtsız
     portre maddesi kaydedilmez (bkz. .claude/plans/gerceklik-mimarisi.md). */
  S.allSessions = {};
  S.chatHistory = [
    { role: 'user', content: 'Kendi yolumu çizmek istiyorum ama nereden başlayacağımı bilmiyorum.' },
    { role: 'user', content: 'Herkes ne der diye düşünüyorum sürekli.' },
    { role: 'user', content: 'Ayşe ile yine gerginlik yaşadık bu hafta.' },
  ];
}

/** Konsolidasyonu tetiklemeye yetecek asgari ömür-boyu sinyal. */
function seedMinSignal(S) {
  S._personalityMap.communication.msg_lengths = [10, 20, 30, 40];
}

beforeEach(() => {
  vi.useRealTimers();
});

describe('ypInit + hidrasyon', () => {
  it('kullanıcı yokken sessizce çalışmaz', async () => {
    const { S, yp } = await freshModule();
    S.currentUser = null;
    expect(() => yp.ypInit()).not.toThrow();
    expect(yp.ypHasCore()).toBe(false);
  });

  it('bozuk depo verisini tolere eder (varsayılana döner)', async () => {
    const { S, infra, yp } = await freshModule();
    seedUser(S);
    infra.SafeStorage.setRaw(YP_KEY, '{"v":1,"cekirdek":"BOZUK","degerler":42,"kisiler":null}');
    expect(() => yp.ypInit()).not.toThrow();
    expect(yp.ypGetContext()).toBe('');
  });
});

describe('ypMaybeConsolidate — günlük konsolidasyon', () => {
  const VALID_JSON = JSON.stringify({
    mesele: 'Kendini yorgun hissediyorsun çünkü sınırlarını hep sonraya erteliyorsun.',
    donusum_yayi: 'Kaçınmadan yüzleşmeye doğru ilerliyorsun.',
    degerler: [
      { deger: 'özgürlük', kanit_ref: 'S1' },
      { deger: 'GEÇERSİZ_UZUN_'.repeat(10), kanit_ref: 'S1' },
    ],
    celiskiler: [{ metin: 'bağımsızlık istiyor ama onay arıyor', kanit_ref: 'S2' }],
    kor_noktalar: [
      { metin: 'zor konuları espriyle geçiştiriyor', kanit_ref: 'S3' },
      { metin: 'kanıtını gösteremediğim tahmin' }, // kanit_ref YOK — düşmeli
    ],
    dil_haritasi: { metaforlar: ['bir duvar gibi'], kelimeler: ['aslında', 'yani'], hitap: 'sen' },
    kisiler: [{ key: 'Ayşe', hikaye: 'Eşi Ayşe ile gerginlik yaşıyor.', son_durum: 'barışma sürecinde' }],
    rituel_iliskisi: 'Günlük ritüellere sadık ama derin çalışmadan kaçınıyor.',
    ne_ogrendim: 'Bugün ilk kez eşiyle yaşadığı gerginliği açıkça anlattı.',
  });

  it('kanıtı uydurulmuş değer/çelişki kaydedilmez; uydurma kişi adı düşer (13y kapısı)', async () => {
    const { S, infra, yp, callLLM } = await freshWithLLM();
    seedUser(S);
    seedMinSignal(S);
    infra.SafeStorage.set(YP_KEY, null);
    callLLM.mockResolvedValue(JSON.stringify({
      mesele: 'Bir şeyden kaçıyorsun çünkü yüzleşmek pahalı.',
      degerler: [{ deger: 'sadakat', kanit: 'babaannemin köyünde geçen yazları özlüyorum', guven: 0.9 }],
      celiskiler: [{ metin: 'x ama y', kanit: 'işimden ayrılmayı düşünüyorum uzun zamandır' }],
      kisiler: [{ key: 'Mehmet', hikaye: 'Mehmet ile çalışıyor.', son_durum: 'iyi' }],
      ne_ogrendim: 'Bugün yeni bir şey öğrendim.',
    }));

    yp.ypInit();
    await vi.waitFor(() => { expect(yp.ypHasCore()).toBe(true); });

    const st = yp.ypGetFullState();
    expect(st.degerler.length).toBe(0);    // kanıt kullanıcının cümlesi değil
    expect(st.celiskiler.length).toBe(0);
    expect(st.kisiler.mehmet).toBeUndefined(); // hiç bahsedilmemiş ad
  });

  it('model kanıtı PARAFRAZ etse bile kanit_ref sayesinde madde KAYBOLMAZ', async () => {
    /* Emre'nin 2026-08-02 itirazının regresyon testi. Eski bulanık kapı
       (eşik 0.6) "ara sıra doğru bir alıntıyı düşürüyor" diye savunuluyordu;
       bu senaryo tam o düşüşün yaşandığı hâldir. Model cümleyi kendi
       kelimeleriyle aktarmış ama parmağı doğru cümlededir — madde kalır ve
       kanıt olarak KULLANICININ cümlesi saklanır, modelinki değil. */
    const { S, infra, yp, callLLM } = await freshWithLLM();
    seedUser(S);
    seedMinSignal(S);
    infra.SafeStorage.set(YP_KEY, null);
    callLLM.mockResolvedValue(JSON.stringify({
      mesele: 'Onay aradığın için kendi yolunu erteliyorsun.',
      degerler: [{ deger: 'özerklik', kanit_ref: 'S1', kanit: 'kendi rotasını çizme arzusundan söz ediyor' }],
      ne_ogrendim: 'Bugün yeni bir şey öğrendim.',
    }));

    yp.ypInit();
    await vi.waitFor(() => { expect(yp.ypHasCore()).toBe(true); });

    const st = yp.ypGetFullState();
    expect(st.degerler.length).toBe(1);
    expect(st.degerler[0].kanit).toBe('Kendi yolumu çizmek istiyorum ama nereden başlayacağımı bilmiyorum.');
  });

  it('geçerli JSON → merge + changelog + lastConsolidated + doğrulama budaması', async () => {
    const { S, infra, yp, callLLM } = await freshWithLLM();
    seedUser(S);
    seedMinSignal(S);
    infra.SafeStorage.set(YP_KEY, null);
    callLLM.mockResolvedValue(VALID_JSON);

    yp.ypInit(); // içinde ypMaybeConsolidate (async, await edilmez)
    await vi.waitFor(() => { expect(yp.ypHasCore()).toBe(true); });

    expect(callLLM).toHaveBeenCalledTimes(1);
    const arg = callLLM.mock.calls[0][0];
    expect(arg.jsonMode).toBe(true);
    expect(arg.skipPersona).toBe(true);
    expect(arg.model).toBeDefined();

    const st = yp.ypGetFullState();
    expect(st.cekirdek.mesele).toContain('sınırlarını');
    // Uzunluk cap'i: 60 karaktere kırpılmış olmalı
    expect(st.degerler.some((d) => d.deger.length > 60)).toBe(false);
    /* Kanıtsız kör nokta düşer — eski kapı burada modelin `guven` sayısına
       bakıyordu; artık kanıt gösterilmeyen kör nokta hiç doğmaz. */
    expect(st.kor_noktalar.length).toBe(1);
    expect(st.kor_noktalar[0].metin).toContain('espriyle');
    // Kanıt KAYNAKTAN kesilir: kullanıcının kendi cümlesi, modelin özeti değil
    expect(st.kor_noktalar[0].kanit).toBe('Ayşe ile yine gerginlik yaşadık bu hafta.');
    expect(st.degerler[0].kanit).toContain('Kendi yolumu çizmek istiyorum');
    // Kişi anahtarı küçük harfe normalize edilir
    expect(st.kisiler.ayşe).toBeDefined();
    expect(st.kisiler.ayşe.hikaye).toContain('Ayşe');
    expect(st.changelog.length).toBe(1);
    expect(st.changelog[0].ne_ogrendim).toContain('gerginliği');

    await new Promise((r) => setTimeout(r, 600)); // debounced ypSave
    const saved = infra.SafeStorage.get(YP_KEY);
    expect(saved.lastConsolidated).toBe(st.lastConsolidated);
  });

  it('aynı gün ikinci çağrı LLM tetiklemez', async () => {
    const { S, yp, callLLM } = await freshWithLLM();
    seedUser(S);
    seedMinSignal(S);
    callLLM.mockResolvedValue(VALID_JSON);

    yp.ypInit();
    await vi.waitFor(() => { expect(callLLM).toHaveBeenCalledTimes(1); });
    await yp.ypMaybeConsolidate();
    expect(callLLM).toHaveBeenCalledTimes(1); // günde bir — ikinci çağrı yok
  });

  it('LLM hatasında lastConsolidated işaretlenmez; günde 2 denemeden sonra durur', async () => {
    const { S, infra, yp, callLLM } = await freshWithLLM();
    seedUser(S);
    seedMinSignal(S);
    infra.SafeStorage.set(YP_KEY, null);
    const err = new Error('429'); err.quota = true;
    callLLM.mockRejectedValue(err);

    yp.ypInit();
    await vi.waitFor(() => { expect(callLLM).toHaveBeenCalledTimes(1); });
    await yp.ypMaybeConsolidate(); // 2. deneme
    expect(callLLM).toHaveBeenCalledTimes(2);
    await yp.ypMaybeConsolidate(); // 3. deneme — günlük tavan
    expect(callLLM).toHaveBeenCalledTimes(2);

    await new Promise((r) => setTimeout(r, 600));
    const st = infra.SafeStorage.get(YP_KEY);
    expect(st.lastConsolidated).toBeNull();
    expect(st.attempts.count).toBe(2);
  });

  it('bozuk/anlamsız JSON döndüğünde sessizce atlanır, konsolide edilmiş sayılmaz', async () => {
    const { S, yp, callLLM } = await freshWithLLM();
    seedUser(S);
    seedMinSignal(S);
    callLLM.mockResolvedValue('{"mesele":"","degerler":[],"ne_ogrendim":""}');

    yp.ypInit();
    await new Promise((r) => setTimeout(r, 50));
    expect(yp.ypHasCore()).toBe(false);
  });

  it('asgari sinyal yokken (yeni kullanıcı) LLM hiç çağrılmaz', async () => {
    const { S, yp, callLLM } = await freshWithLLM();
    seedUser(S); // msg_lengths boş, narrativeMemory boş
    callLLM.mockResolvedValue(VALID_JSON);

    yp.ypInit();
    await new Promise((r) => setTimeout(r, 50));
    expect(callLLM).not.toHaveBeenCalled();
  });

  it('dünün gün özeti varsa (narrativeMemory) asgari mesaj sayısı olmadan da tetiklenir', async () => {
    const { S, yp, callLLM } = await freshWithLLM();
    seedUser(S);
    S._narrativeMemory = [{ date: '1 Ocak', note: 'Zor bir gün geçirdi ama umutluydu.', session_id: 'day_x' }];
    callLLM.mockResolvedValue(VALID_JSON);

    yp.ypInit();
    await vi.waitFor(() => { expect(callLLM).toHaveBeenCalledTimes(1); });
    const arg = callLLM.mock.calls[0][0];
    expect(arg.contents[0].parts[0].text).toContain('Zor bir gün geçirdi');
  });
});

describe('ypGetContext / ypHasCore', () => {
  it('portre boşken boş string döner', async () => {
    const { S, yp } = await freshModule();
    seedUser(S);
    yp.ypInit();
    expect(yp.ypGetContext()).toBe('');
    expect(yp.ypHasCore()).toBe(false);
  });

  it('portre doluysa mesele/değerler/kişiler bölümlerini basar, kör noktaları BASMAZ', async () => {
    const { S, infra, yp } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(YP_KEY, {
      v: 1,
      cekirdek: { mesele: 'Test meselesi çünkü test nedeni.', donusum_yayi: 'A dan B ye' },
      degerler: [{ deger: 'dürüstlük', kanit: '', guven: 0.9 }],
      celiskiler: [],
      kor_noktalar: [{ metin: 'GİZLİ KÖR NOKTA METNİ', guven: 0.8 }],
      dil_haritasi: { metaforlar: [], kelimeler: [], hitap: '' },
      kisiler: { ayse: { hikaye: 'Ayşe hikayesi burada.', son_durum: '' } },
      rituel_iliskisi: '',
      changelog: [],
      hipotezler: [],
      lastConsolidated: '2026-01-01',
      attempts: { day: null, count: 0 },
    });
    yp.ypInit();
    const ctx = yp.ypGetContext();
    expect(ctx).toContain('Test meselesi');
    expect(ctx).toContain('dürüstlük');
    expect(ctx).toContain('Ayşe hikayesi');
    expect(ctx).not.toContain('GİZLİ KÖR NOKTA METNİ');
    expect(yp.ypHasCore()).toBe(true);
  });
});

describe('ypResetPortre', () => {
  it('portreyi varsayılana döndürür ve kalıcı depoyu günceller', async () => {
    const { S, infra, yp } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(YP_KEY, {
      v: 1, cekirdek: { mesele: 'eski mesele', donusum_yayi: '' },
      degerler: [], celiskiler: [], kor_noktalar: [],
      dil_haritasi: { metaforlar: [], kelimeler: [], hitap: '' },
      kisiler: {}, rituel_iliskisi: '', changelog: [], hipotezler: [],
      lastConsolidated: '2026-01-01', attempts: { day: null, count: 0 },
    });
    yp.ypInit();
    expect(yp.ypHasCore()).toBe(true);

    yp.ypResetPortre();
    expect(yp.ypHasCore()).toBe(false);
    expect(yp.ypGetContext()).toBe('');
    const saved = infra.SafeStorage.get(YP_KEY);
    expect(saved.cekirdek.mesele).toBe('');
  });
});

describe('ypGetGreetingSeed — FAZ 5 tüketici köprüsü', () => {
  it('donusum_yayi yoksa boş döner', async () => {
    const { S, yp } = await freshModule();
    seedUser(S);
    yp.ypInit();
    expect(yp.ypGetGreetingSeed()).toBe('');
  });

  it('donusum_yayi varsa aynen döner', async () => {
    const { S, infra, yp } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(YP_KEY, {
      v: 1, cekirdek: { mesele: 'x', donusum_yayi: 'Kaçınmadan yüzleşmeye doğru ilerliyorsun.' },
      degerler: [], celiskiler: [], kor_noktalar: [],
      dil_haritasi: { metaforlar: [], kelimeler: [], hitap: '' },
      kisiler: {}, rituel_iliskisi: '', changelog: [], hipotezler: [],
      lastConsolidated: '2026-01-01', attempts: { day: null, count: 0 },
    });
    yp.ypInit();
    expect(yp.ypGetGreetingSeed()).toBe('Kaçınmadan yüzleşmeye doğru ilerliyorsun.');
  });
});

describe('ypGetGcLine — FAZ 5 tüketici köprüsü', () => {
  it('mesele yoksa null döner', async () => {
    const { S, yp } = await freshModule();
    seedUser(S);
    yp.ypInit();
    expect(yp.ypGetGcLine()).toBeNull();
  });

  it('mesele varsa çekirdek okumayı içeren ithaf satırı döner', async () => {
    const { S, infra, yp } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(YP_KEY, {
      v: 1, cekirdek: { mesele: 'Onay aradığın için sınır koyamıyorsun.', donusum_yayi: '' },
      degerler: [], celiskiler: [], kor_noktalar: [],
      dil_haritasi: { metaforlar: [], kelimeler: [], hitap: '' },
      kisiler: {}, rituel_iliskisi: '', changelog: [], hipotezler: [],
      lastConsolidated: '2026-01-01', attempts: { day: null, count: 0 },
    });
    yp.ypInit();
    expect(yp.ypGetGcLine()).toContain('Onay aradığın için sınır koyamıyorsun.');
  });
});

describe('ypAddEveningIntentNote — FAZ 5 tüketici köprüsü (13h)', () => {
  it('boş metin sessizce yok sayılır', async () => {
    const { S, infra, yp } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(YP_KEY, null);
    yp.ypInit();
    yp.ypAddEveningIntentNote('   ');
    expect(yp.ypGetFullState().changelog.length).toBe(0);
  });

  it('kullanıcının niyetini anında changelog\'a işler', async () => {
    const { S, infra, yp } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(YP_KEY, null);
    yp.ypInit();
    yp.ypAddEveningIntentNote('Yarın erken kalkıp yürüyüşe çıkacağım.');
    const st = yp.ypGetFullState();
    expect(st.changelog.length).toBe(1);
    expect(st.changelog[0].ne_ogrendim).toContain('Yarın erken kalkıp yürüyüşe çıkacağım.');

    await new Promise((r) => setTimeout(r, 600));
    const saved = infra.SafeStorage.get(YP_KEY);
    expect(saved.changelog.length).toBe(1);
  });
});

describe('ypSave lifecycle flush (FAZ 1 — kalıcılık)', () => {
  function setHidden(v) {
    Object.defineProperty(document, 'hidden', { value: v, configurable: true });
  }

  it('debounce penceresinde hidden olursa bekleyen kayıt anında yazılır', async () => {
    const { S, infra, yp } = await freshModule();
    seedUser(S);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    yp.ypInit();
    yp.ypAddEveningIntentNote('Akşam niyeti flush testi');
    expect(infra.SafeStorage.get(YP_KEY, null)).toBeNull(); // debounce henüz yazmadı
    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    setHidden(false);
    const stored = infra.SafeStorage.get(YP_KEY, null);
    expect(stored?.changelog?.some((c) => String(c.ne_ogrendim).includes('Akşam niyeti flush testi'))).toBe(true);
    vi.useRealTimers();
  });

  it('timer normal dolarsa lifecycle flush ikinci kez yazmaz', async () => {
    const { S, infra, yp } = await freshModule();
    seedUser(S);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    yp.ypInit();
    yp.ypAddEveningIntentNote('tek kayıt');
    vi.runAllTimers(); // debounce doldu, kayıt yazıldı
    expect(infra.SafeStorage.get(YP_KEY, null)).toBeTruthy();
    const spy = vi.spyOn(infra.SafeStorage, 'set');
    setHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    setHidden(false);
    expect(spy).not.toHaveBeenCalled(); // _saveTimer null — çift kayıt yok
    spy.mockRestore();
    vi.useRealTimers();
  });
});

// ─── dil_haritasi tüketimi (FAZ 3 — K5) ──────────────────────────────────────
// LLM'e ürettirilen ama hiç okunmayan alan artık ypGetContext'te basılıyor.
describe('ypGetContext dil_haritasi tüketimi (FAZ 3)', () => {
  function storedYp(dil) {
    return {
      v: 1,
      cekirdek: { mesele: 'Erteliyorsun çünkü mükemmel anı bekliyorsun', donusum_yayi: '' },
      degerler: [], celiskiler: [], kor_noktalar: [],
      dil_haritasi: dil,
      kisiler: {}, rituel_iliskisi: '', changelog: [], hipotezler: [],
      lastConsolidated: null, attempts: { day: null, count: 0 },
    };
  }

  it('metafor/kelime doluysa dil satırı basılır (cap: 3 metafor, 5 kelime)', async () => {
    const { S, infra, yp } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(YP_KEY, storedYp({
      metaforlar: ['nehir', 'köprü', 'dağ', 'dordüncü-metafor'],
      kelimeler: ['yorgun'], hitap: 'sen',
    }));
    yp.ypInit();
    const ctx = yp.ypGetContext();
    expect(ctx).toContain('nehir');
    expect(ctx).toContain('yorgun');
    expect(ctx).not.toContain('dordüncü-metafor'); // cap 3
    expect(ctx).not.toContain('hitap');            // bilinçli dışarıda
  });

  it('dil_haritasi boşsa satır yok (mevcut çıktı korunur)', async () => {
    const { S, infra, yp } = await freshModule();
    seedUser(S);
    infra.SafeStorage.set(YP_KEY, storedYp({ metaforlar: [], kelimeler: [], hitap: '' }));
    yp.ypInit();
    const ctx = yp.ypGetContext();
    expect(ctx).toContain('ÇEKİRDEK OKUMA');
    expect(ctx).not.toContain('KENDİ DİLİ');
  });
});

// ─── Hipotez durum makinesi — GERÇEK gövde, stub'suz (FAZ 5) ────────────────
// 09g testleri ypUpdateHipotezDurum'u vi.fn ile stub'lıyordu; bu describe
// 09e'nin kendi ypSetHipotezler/ypGetHipotezler/ypUpdateHipotezDurum'unu
// doğrudan çalıştırır, sonra 09g ile gerçek iki-modül entegrasyonunu dener.
describe('hipotez durum makinesi (FAZ 5 — stub\'suz gerçek gövde)', () => {
  it('ypSetHipotezler cap 6 uygular ve kalıcılaştırır', async () => {
    const { S, infra, yp } = await freshModule();
    seedUser(S);
    yp.ypInit();
    const list = Array.from({ length: 9 }, (_, i) => ({ id: `h${i}`, metin: `hipotez ${i}`, durum: 'aday', kanit: [], guven: 0.7 }));
    yp.ypSetHipotezler(list);
    expect(yp.ypGetHipotezler().length).toBe(6);
    await new Promise((r) => setTimeout(r, 600));
    expect(infra.SafeStorage.get(YP_KEY, null)?.hipotezler?.length).toBe(6);
  });

  it('geçersiz durum veya bilinmeyen id → false, state değişmez', async () => {
    const { S, yp } = await freshModule();
    seedUser(S);
    yp.ypInit();
    yp.ypSetHipotezler([{ id: 'h1', metin: 'test', durum: 'aday', kanit: [], guven: 0.7 }]);
    expect(yp.ypUpdateHipotezDurum('h1', 'gecersiz-durum')).toBe(false);
    expect(yp.ypUpdateHipotezDurum('yok-boyle-id', 'dogrulandi')).toBe(false);
    expect(yp.ypGetHipotezler()[0].durum).toBe('aday');
  });

  it('dogrulandi → changelog\'a confirmed satırı işlenir, true döner', async () => {
    const { S, yp } = await freshModule();
    seedUser(S);
    yp.ypInit();
    yp.ypSetHipotezler([{ id: 'h1', metin: 'erteliyor çünkü korkuyor', durum: 'aday', kanit: [], guven: 0.7 }]);
    expect(yp.ypUpdateHipotezDurum('h1', 'dogrulandi')).toBe(true);
    expect(yp.ypGetHipotezler()[0].durum).toBe('dogrulandi');
    const st = yp.ypGetFullState();
    expect(st.changelog[0].ne_ogrendim).toContain('Doğruladın');
    expect(st.changelog[0].ne_ogrendim).toContain('erteliyor çünkü korkuyor');
  });

  it('reddedildi → changelog\'a rejected satırı işlenir', async () => {
    const { S, yp } = await freshModule();
    seedUser(S);
    yp.ypInit();
    yp.ypSetHipotezler([{ id: 'h1', metin: 'yanlış okuma', durum: 'aday', kanit: [], guven: 0.7 }]);
    expect(yp.ypUpdateHipotezDurum('h1', 'reddedildi')).toBe(true);
    const st = yp.ypGetFullState();
    expect(st.changelog[0].ne_ogrendim).toContain('Yanılmışım');
  });

  // DENETİM 2026-07-31 — hipotez BİR KEZ yanıtlanır. Eskiden ikinci ve TERS
  // bir karar hem durumu çeviriyor hem changelog'a çelişkili ikinci satırı
  // yazıyordu ("Doğruladın: X" + "Yanılmışım: X" yan yana).
  it('yanıtlanmış hipotez ikinci kez çözülemez — changelog\'a ters satır düşmez', async () => {
    const { S, yp } = await freshModule();
    seedUser(S);
    yp.ypInit();
    yp.ypSetHipotezler([{ id: 'h1', metin: 'tek karar', durum: 'aday', kanit: [], guven: 0.7 }]);

    expect(yp.ypUpdateHipotezDurum('h1', 'dogrulandi')).toBe(true);
    expect(yp.ypUpdateHipotezDurum('h1', 'reddedildi')).toBe(false);

    expect(yp.ypGetHipotezler()[0].durum).toBe('dogrulandi');
    const st = yp.ypGetFullState();
    expect(st.changelog.length).toBe(1);
    expect(st.changelog[0].ne_ogrendim).toContain('Doğruladın');
  });

  it('durum alanı hiç olmayan eski kayıt \'aday\' sayılır — bir kez çözülebilir', async () => {
    const { S, yp } = await freshModule();
    seedUser(S);
    yp.ypInit();
    yp.ypSetHipotezler([{ id: 'legacy', metin: 'durumsuz kayıt', kanit: [], guven: 0.7 }]);
    expect(yp.ypUpdateHipotezDurum('legacy', 'dogrulandi')).toBe(true);
    expect(yp.ypUpdateHipotezDurum('legacy', 'dogrulandi')).toBe(false);
  });

  it('09g→09e GERÇEK köprü: apResolveHypothesis yp dosyasına yazar (iki modül birlikte)', async () => {
    vi.resetModules();
    const { S } = await import('../js/state.js');
    const infra = await import('../js/parts/00a-infrastructure.js');
    const yp = await import('../js/parts/09e-yasayan-portre.js');
    const ap = await import('../js/parts/09g-ayna-protokolu.js');
    seedUser(S);
    yp.ypInit();
    ap.apInit();
    yp.ypSetHipotezler([{ id: 'cross-1', metin: 'gerçek entegrasyon', durum: 'aday', kanit: [], guven: 0.7 }]);

    const ok = ap.apResolveHypothesis('cross-1', 'dogrulandi'); // 09g → window.ypUpdateHipotezDurum (GERÇEK 09e)
    expect(ok).toBe(true);
    expect(yp.ypGetHipotezler()[0].durum).toBe('dogrulandi');
    await new Promise((r) => setTimeout(r, 600));
    expect(infra.SafeStorage.get(YP_KEY, null)?.hipotezler?.[0]?.durum).toBe('dogrulandi');
  });
});

// ─── _beyanSuz — kullanıcının reddettiği okuma geri gelmez (İç Çalışma 02 · E)

describe('_beyanSuz — beyan iki katmanlı korumanın ikincisidir', () => {
  const kur = (susmus) => {
    window.secBeyanId = (tur, metin) => `${tur}:${String(metin).toLocaleLowerCase('tr').slice(0, 48)}`;
    window.secBeyanVar = (id) => susmus.includes(id);
  };

  it('susturulmuş değeri model yine üretse bile süzer', async () => {
    kur(['portre-deger:dürüstlük']);
    const { _beyanSuz } = await import('../js/parts/09e-yasayan-portre.js');
    const out = _beyanSuz({
      degerler: [{ deger: 'dürüstlük' }, { deger: 'cesaret' }],
      celiskiler: [],
    });
    expect(out.degerler.map(d => d.deger)).toEqual(['cesaret']);
  });

  it('susturulmuş çelişkiyi de süzer', async () => {
    kur(['portre-celiski:özgürlük istiyorsun ama izin bekliyorsun']);
    const { _beyanSuz } = await import('../js/parts/09e-yasayan-portre.js');
    const out = _beyanSuz({
      degerler: [],
      celiskiler: [{ metin: 'özgürlük istiyorsun ama izin bekliyorsun' }, { metin: 'başka bir çelişki' }],
    });
    expect(out.celiskiler.map(c => c.metin)).toEqual(['başka bir çelişki']);
  });

  it('09i yüklü değilse hiçbir şey süzülmez (savunmacı düşüş)', async () => {
    delete window.secBeyanId; delete window.secBeyanVar;
    const { _beyanSuz } = await import('../js/parts/09e-yasayan-portre.js');
    const out = _beyanSuz({ degerler: [{ deger: 'dürüstlük' }], celiskiler: [] });
    expect(out.degerler).toHaveLength(1);
  });
});
