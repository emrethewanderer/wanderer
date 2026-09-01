// Portre 2.0 — "Olunan [Ad]" evrim köprüsü + tam sentez testleri
import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from 'vitest';

// callLLM'i mock'la (KISMİ — 04'ün diğer export'ları gerçek kalsın):
// resynth ağa çıkmasın, çağrı sayısını sayabilelim
vi.mock('../js/parts/04-llm-hero-history.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    callLLM: vi.fn().mockResolvedValue(JSON.stringify({
      baslik: 'Yeniden Yazılan',
      portrait: 'Bu kişi artık kazandığı kişilerin izini taşıyor.',
    })),
  };
});

// deckReady'i KISMİ mock'la (yalnız "deste hazır değil" senaryosu için) —
// varsayılan davranış gerçek implementasyona düşer (vi.fn(actual.deckReady)),
// böylece porBackfillCollection testleri GERÇEK 12 kartlık desteyle çalışır.
vi.mock('../js/parts/12b-kart-destesi.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, deckReady: vi.fn(actual.deckReady) };
});

import { callLLM } from '../js/parts/04-llm-hero-history.js';
import { deckReady, getFullDeck } from '../js/parts/12b-kart-destesi.js';
import {
  porAddEntry, porAbsorbCard, porReleaseCard, porResynth, porCardName,
  porGetContext, porSave, porLoad, porSessionEnrich, porCardRefs,
  porBackfillCollection, porBackfillPending,
  porBackfillDavetGosterildiMi, porBackfillDavetIsaretle, porBackfillDismiss,
} from '../js/parts/02c-portre.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';
import { S } from '../js/state.js';
import { sb } from '../js/config.js';

const UID = 'test-uid-portre';

function freshCard(confirmed = true) {
  return {
    dusunceler: [], inanclar: [], duygular: [], davranislar: [],
    baslik: 'Onay Bekleyen', portrait: 'İlk portre.', confirmed,
    version: 1,
    history: [{ v: 1, at: new Date().toISOString(), baslik: 'Onay Bekleyen', portrait: 'İlk portre.', cards: [] }],
    sahne: null, created_at: null, updated_at: null,
  };
}

function fakeKart(id, over = {}) {
  return {
    id,
    name: 'SABIRLI BEKLEYEN', virtue: 'sebat', lesson: 'Bekleyen kazanır.',
    dusunceler: [`${id} düşünce bir`, `${id} düşünce iki`, `${id} düşünce üç`],
    inanclar:   [`${id} inanç bir`],
    hisler:     [`${id} his bir`, `${id} his iki`],
    davranislar:[`${id} davranış bir`],
    ...over,
  };
}

beforeEach(async () => {
  document.body.innerHTML = '';
  S.currentUser = { id: UID, user_metadata: { full_name: 'Emre Güllüce' } };
  // 12d gerçek kumEnsureSpec arka planda LLM iyileştirme çağırır — stub'la
  // (hem callLLM sayacı temiz kalır hem sahne-yenileme çağrısı doğrulanır)
  window.kumEnsureSpec = vi.fn((entity, opts) => {
    const f = (opts && opts.field) || 'sahne';
    entity[f] = { mock: true };
    return entity[f];
  });
  // Önceki testten sarkan evrim dalgasını tüket (modül-durumu paylaşımlı)
  S._portre = freshCard(true);
  await porResynth();
  S._portre = freshCard(true);
  try { SafeStorage.remove(`etw_portre_absorb_q_${UID}`); } catch (_) {}
  callLLM.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('porAbsorbCard — eşleme + sınır + dedup', () => {
  it('4 boyutu eşler: hisler → duygular; kategori başına en fazla 2 madde; src/ref doğru', () => {
    const added = porAbsorbCard(fakeKart('k1'));
    expect(added).toBe(6); // 2 düşünce (3'ten kırpıldı) + 1 inanç + 2 his + 1 davranış
    expect(S._portre.dusunceler).toHaveLength(2);
    expect(S._portre.duygular.map(e => e.text)).toEqual(['k1 his bir', 'k1 his iki']);
    expect(S._portre.duygular[0].src).toBe('kart');
    expect(S._portre.duygular[0].ref).toBe('k1');
  });

  it('aynı kart iki kez işlenmez (ref koruması)', () => {
    expect(porAbsorbCard(fakeKart('k1'))).toBe(6);
    expect(porAbsorbCard(fakeKart('k1'))).toBe(0);
    expect(S._portre.duygular).toHaveLength(2);
  });

  it('aynı erdemin ortak varsayılan maddeleri ikinci kartta dedup ile elenir', () => {
    const shared = { dusunceler: ['ortak düşünce'], inanclar: [], hisler: [], davranislar: [] };
    expect(porAbsorbCard(fakeKart('k1', shared))).toBe(1);
    expect(porAbsorbCard(fakeKart('k2', shared))).toBe(0); // metin aynı → eklenmedi
    expect(S._portre.dusunceler).toHaveLength(1);
  });

  it('history\'de kayıtlı kart yeniden işlenmez (yoğunlaştırma ref\'leri silse bile)', () => {
    S._portre.history.push({ v: 2, at: new Date().toISOString(), baslik: '', portrait: '', cards: ['k9'] });
    expect(porAbsorbCard(fakeKart('k9'))).toBe(0);
  });
});

describe('porAbsorbCard — onay-öncesi kuyruk', () => {
  it('onaysız kartta madde işlemez, id\'yi kuyruğa yazar (tekrarsız)', () => {
    S._portre = freshCard(false);
    expect(porAbsorbCard(fakeKart('k1'))).toBe(0);
    expect(porAbsorbCard(fakeKart('k1'))).toBe(0);
    expect(S._portre.dusunceler).toHaveLength(0);
    expect(SafeStorage.get(`etw_portre_absorb_q_${UID}`, [])).toEqual(['k1']);
  });
});

describe('porResynth — dalga başına tek sentez', () => {
  it('3 kazanım tek dalgada TEK LLM çağrısına düşer; version artar; history kartları yazar', async () => {
    vi.useFakeTimers();
    porAbsorbCard(fakeKart('k1'));
    porAbsorbCard(fakeKart('k2', { dusunceler: ['k2 d'], inanclar: [], hisler: [], davranislar: [] }));
    porAbsorbCard(fakeKart('k3', { dusunceler: ['k3 d'], inanclar: [], hisler: [], davranislar: [] }));
    await vi.advanceTimersByTimeAsync(1300);
    expect(callLLM).toHaveBeenCalledTimes(1);
    expect(S._portre.version).toBe(2);
    expect(S._portre.baslik).toBe('Yeniden Yazılan');
    const last = S._portre.history.at(-1);
    expect(last.v).toBe(2);
    expect(last.cards).toEqual(['k1', 'k2', 'k3']);
    // Sahne yeniden doğdu — versiyonlu seed ile (kart görsel olarak da evrilir)
    expect(window.kumEnsureSpec).toHaveBeenCalledTimes(1);
    expect(window.kumEnsureSpec.mock.calls[0][1].seed).toBe(`portre-${UID}-v2`);
  });

  it('LLM hatasında dalga kaybolmaz — sonraki çağrı yeniden dener', async () => {
    vi.useFakeTimers();
    callLLM.mockRejectedValueOnce(new Error('offline'));
    porAbsorbCard(fakeKart('k1'));
    await vi.advanceTimersByTimeAsync(1300);
    expect(S._portre.version).toBe(1); // sentez başarısız — versiyon değişmedi
    await porResynth();                  // yeniden dene (görünüm açılışı kalıbı)
    expect(callLLM).toHaveBeenCalledTimes(2);
    expect(S._portre.version).toBe(2);
  });

  it('kart_ozu YALNIZ src:kart maddelerini değiştirir — el yazısı ve Emre dokunulmaz', async () => {
    // Kategoriyi taşır: 9 kart-kaynaklı + 1 user + 1 emre madde
    for (let i = 0; i < 9; i++) porAddEntry('dusunceler', `kart madde ${i}`, 'kart', 'eski-' + i);
    porAddEntry('dusunceler', 'benim el yazım', 'user');
    porAddEntry('dusunceler', 'emre çıkarımı', 'emre');
    callLLM.mockResolvedValueOnce(JSON.stringify({
      baslik: 'Yoğunlaşan', portrait: 'P.',
      kart_ozu: { dusunceler: ['öz bir', 'öz iki'] },
    }));
    vi.useFakeTimers();
    porAbsorbCard(fakeKart('k1', { dusunceler: ['k1 d'], inanclar: [], hisler: [], davranislar: [] }));
    await vi.advanceTimersByTimeAsync(1300);
    const list = S._portre.dusunceler;
    expect(list.map(e => e.text)).toContain('benim el yazım');
    expect(list.map(e => e.text)).toContain('emre çıkarımı');
    expect(list.filter(e => e.src === 'kart').map(e => e.text)).toEqual(['öz bir', 'öz iki']);
  });
});

describe('Veri bütünlüğü — anında kayıt + dalga kalıcılığı + flush + serileştirme', () => {
  afterEach(() => {
    try { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); } catch (_) {}
  });

  it('absorb anında KV\'ye yazılır — debounce beklenmez', () => {
    porAbsorbCard(fakeKart('k1'));
    const stored = SafeStorage.get(`etw_portre_karti_${UID}`, null);
    expect(stored).not.toBeNull();
    expect(stored.duygular.map(e => e.text)).toContain('k1 his bir');
  });

  it('evrim dalgası absorb\'da KV\'ye yazılır; resynth başarısında temizlenir', async () => {
    vi.useFakeTimers();
    porAbsorbCard(fakeKart('k1'));
    expect(SafeStorage.get(`etw_portre_evrim_wave_${UID}`, [])).toEqual(['k1']);
    await vi.advanceTimersByTimeAsync(1300);
    expect(SafeStorage.get(`etw_portre_evrim_wave_${UID}`, [])).toEqual([]);
  });

  it('porLoad KV\'deki yarım kalmış dalgayı devralır (sayfa kapanması sonrası kurtarma)', async () => {
    SafeStorage.set(`etw_portre_karti_${UID}`, freshCard(true));
    SafeStorage.set(`etw_portre_evrim_wave_${UID}`, ['k1']);
    porLoad();
    await porResynth();
    expect(callLLM).toHaveBeenCalledTimes(1);
    expect(S._portre.history.at(-1).cards).toEqual(['k1']);
  });

  it('sekme gizlenince bekleyen resynth zamanlayıcısı iptal edilir — dalga KV\'de kalıp sonraki açılışa devreder', async () => {
    vi.useFakeTimers();
    // Temiz taban — önceki testlerin KV kalıntısını (history'de 'k1' olabilir) ez
    SafeStorage.set(`etw_portre_karti_${UID}`, freshCard(true));
    SafeStorage.remove(`etw_portre_evrim_wave_${UID}`);
    porLoad(); // yaşam-döngüsü dinleyicileri kurulur (install-once) + temiz kart hydrate edilir
    porAbsorbCard(fakeKart('k1'));
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(1300);
    expect(callLLM).not.toHaveBeenCalled(); // zamanlayıcı iptal edildi — sentez tetiklenmedi
    expect(SafeStorage.get(`etw_portre_evrim_wave_${UID}`, [])).toEqual(['k1']); // ama dalga duruyor
  });

  it('enrich ve resynth eşzamanlı tetiklenirse sırayla koşar — paralel çalışmaz', async () => {
    vi.useFakeTimers();
    S.chatHistory = [
      { role: 'user', content: 'mesaj bir' },
      { role: 'user', content: 'mesaj iki' },
      { role: 'user', content: 'mesaj üç' },
    ];
    const order = [];
    let call = 0;
    callLLM.mockImplementation(async () => {
      const n = ++call;
      order.push(`start${n}`);
      await Promise.resolve();
      order.push(`end${n}`);
      return n === 1
        ? JSON.stringify({ dusunceler: ['enrich madde'] })
        : JSON.stringify({ baslik: 'Zincir Sonrası', portrait: 'P.' });
    });
    porAbsorbCard(fakeKart('k1'));
    const enrichP = porSessionEnrich();
    const resynthP = porResynth();
    await Promise.all([enrichP, resynthP]);
    // Paralel çalışsaydı: start1,start2,end1,end2 — zincirleme sırayı garanti eder
    expect(order).toEqual(['start1', 'end1', 'start2', 'end2']);
    expect(S._portre.dusunceler.map(e => e.text)).toContain('enrich madde');
    expect(S._portre.version).toBe(2);
  });
});

describe('porSave — Supabase tablo dalı + 42703 fallback', () => {
  // setup.js mock'u upsert'i thenable döndürür (Promise) — bu blok o dalın
  // gerçekten yürüdüğünü ve 42703'te evrim alanlarının kalıcı olarak
  // düştüğünü kanıtlar (önceden test mock'u thenable olmadığından bu dal
  // hiç koşmuyordu).
  afterEach(() => { vi.restoreAllMocks(); });

  it('normalde version/history/sahne içerir; 42703 sonrası düşürülüp retry edilir; sonrasında hep düşük kalır', async () => {
    const upsertSpy = vi.fn();
    vi.spyOn(sb, 'from').mockReturnValue({ upsert: upsertSpy });
    porAddEntry('dusunceler', 'bir madde', 'user');

    // 1) Normal yol — evrim alanları satırda
    upsertSpy.mockResolvedValueOnce({ error: null });
    porSave();
    await vi.waitFor(() => expect(upsertSpy).toHaveBeenCalledTimes(1));
    const okRow = upsertSpy.mock.calls[0][0][0];
    expect(okRow).toHaveProperty('version');
    expect(okRow).toHaveProperty('history');
    expect(okRow).toHaveProperty('sahne');

    // 2) 42703 (undefined_column) — evrim alanları düşürülüp aynı satır retry edilir
    upsertSpy.mockResolvedValueOnce({ error: { code: '42703', message: 'column "version" does not exist' } });
    upsertSpy.mockResolvedValueOnce({ error: null });
    porSave();
    await vi.waitFor(() => expect(upsertSpy).toHaveBeenCalledTimes(3));
    const retryRow = upsertSpy.mock.calls[2][0][0];
    expect(retryRow).not.toHaveProperty('version');
    expect(retryRow).not.toHaveProperty('history');
    expect(retryRow).not.toHaveProperty('sahne');

    // 3) Sonraki çağrılarda artık tek upsert — evrim alanları hiç gönderilmez (oturum boyu kalıcı)
    upsertSpy.mockResolvedValueOnce({ error: null });
    porSave();
    await vi.waitFor(() => expect(upsertSpy).toHaveBeenCalledTimes(4));
    const laterRow = upsertSpy.mock.calls[3][0][0];
    expect(laterRow).not.toHaveProperty('version');
  });
});

describe('Dil bütünlüğü — TR olmayan kullanıcıda taşma şartsız çeviri', () => {
  afterEach(() => { S._currentLang = 'tr'; });

  it('EN kullanıcıda taşmayan kart-kategorisi de resynth kapsamına girer; madde sayısı + ref pozisyonel korunur', async () => {
    vi.useFakeTimers();
    S._currentLang = 'en';
    porAddEntry('inanclar', 'kart inanç bir', 'kart', 'k0');
    porAddEntry('inanclar', 'kart inanç iki', 'kart', 'k0');
    callLLM.mockResolvedValueOnce(JSON.stringify({
      baslik: 'Now', portrait: 'P.',
      kart_ozu: { inanclar: ['card belief one', 'card belief two'] },
    }));
    porAbsorbCard(fakeKart('k1', { dusunceler: [], inanclar: [], hisler: [], davranislar: ['k1 d'] }));
    await vi.advanceTimersByTimeAsync(1300);
    const list = S._portre.inanclar.filter(e => e.src === 'kart');
    expect(list.map(e => e.text)).toEqual(['card belief one', 'card belief two']);
    expect(list[0].ref).toBe('k0'); // sayı korundu → ref pozisyonel taşındı
    expect(list[1].ref).toBe('k0');
  });

  it('TR kullanıcıda taşmayan kategori kapsam dışı kalır — eski davranış aynen', async () => {
    vi.useFakeTimers();
    porAddEntry('inanclar', 'kart inanç bir', 'kart', 'k0');
    callLLM.mockResolvedValueOnce(JSON.stringify({ baslik: 'X', portrait: 'P.' })); // kart_ozu YOK
    porAbsorbCard(fakeKart('k1', { dusunceler: [], inanclar: [], hisler: [], davranislar: ['k1 d'] }));
    await vi.advanceTimersByTimeAsync(1300);
    const list = S._portre.inanclar.filter(e => e.src === 'kart');
    expect(list.map(e => e.text)).toContain('kart inanç bir'); // değişmedi
  });
});

describe('porCardName + porGetContext', () => {
  it('#ob-name yoksa metadata ilk isminden türetir: "Olunan Emre"', () => {
    expect(porCardName()).toBe('Olunan Emre');
  });

  it('#ob-name doluysa onu kullanır', () => {
    const el = document.createElement('span');
    el.id = 'ob-name'; el.textContent = 'Deniz';
    document.body.appendChild(el);
    expect(porCardName()).toBe('Olunan Deniz');
  });

  it('bağlam ◈ PORTRE ile başlar ve kart adı + versiyonu taşır', () => {
    porAddEntry('dusunceler', 'bir düşünce maddesi', 'user');
    const ctx = porGetContext();
    expect(ctx.startsWith('◈ PORTRE')).toBe(true);
    expect(ctx).toContain('Olunan Emre');
    expect(ctx).toContain('(v1)');
  });
});

/* ═══════════════════════════════════════════════════════════════
   AD SENKRONU GÖÇÜ (§4.3) — etw_benlik_* → etw_portre_*
   Kullanıcının cihazındaki GERÇEK verisi taşınır; eski anahtar
   kasıtlı olarak SİLİNMEZ (taşıma kanıtlanmadan veri silinmez).
═══════════════════════════════════════════════════════════════ */
describe('ad senkronu — eski storage anahtarından geri-okuma', () => {
  const ESKI = `etw_benlik_karti_${UID}`;
  const YENI = `etw_portre_karti_${UID}`;

  beforeEach(() => {
    try { SafeStorage.remove(ESKI); } catch (_) {}
    try { SafeStorage.remove(YENI); } catch (_) {}
    S._portre = null;
  });

  it('yeni anahtar boşken eski anahtardaki kart taşınır ve okunur', () => {
    const eskiKart = { ...freshCard(true), baslik: 'Benlik Döneminden' };
    SafeStorage.set(ESKI, eskiKart);
    expect(SafeStorage.get(YENI, null)).toBe(null);

    porLoad();

    expect(S._portre?.baslik).toBe('Benlik Döneminden');       // veri okundu
    expect(SafeStorage.get(YENI, null)?.baslik).toBe('Benlik Döneminden'); // yeni ada yazıldı
    expect(SafeStorage.get(ESKI, null)?.baslik).toBe('Benlik Döneminden'); // eski SİLİNMEDİ
  });

  it('yeni anahtar doluysa eski anahtar onu EZMEZ (idempotent)', () => {
    SafeStorage.set(ESKI, { ...freshCard(true), baslik: 'Eski' });
    SafeStorage.set(YENI, { ...freshCard(true), baslik: 'Yeni' });

    porLoad();

    expect(S._portre?.baslik).toBe('Yeni');
    expect(SafeStorage.get(YENI, null)?.baslik).toBe('Yeni');
  });

  it('iki anahtar da boşsa sessizce düşer, kart oluşturmaz', () => {
    porLoad();
    expect(SafeStorage.get(YENI, null)).toBe(null);
  });
});

describe('porReleaseCard — terk edilen kartın izi geri çekilir (oikReleaseCard ikizi)', () => {
  beforeEach(() => {
    S.currentUser = { id: UID };
    S._portre = freshCard(true);
  });

  it('yalnız o ref\'i taşıyan maddeleri siler', () => {
    porAbsorbCard(fakeKart('gk_k9_golden'));
    const oncesi = S._portre.dusunceler.length;
    expect(oncesi).toBeGreaterThan(0);
    const cekilen = porReleaseCard('gk_k9_golden');
    expect(cekilen).toBeGreaterThan(0);
    expect(S._portre.dusunceler.some(e => e.ref === 'gk_k9_golden')).toBe(false);
  });

  it('kullanıcının el yazısına DOKUNMAZ', () => {
    porAddEntry('dusunceler', 'Kendi el yazım', 'user');
    porAbsorbCard(fakeKart('gk_k9_golden'));
    porReleaseCard('gk_k9_golden');
    expect(S._portre.dusunceler.some(e => e.src === 'user' && e.text === 'Kendi el yazım')).toBe(true);
  });

  it('bilinmeyen ref 0 döner, portre bozulmaz', () => {
    porAbsorbCard(fakeKart('k1'));
    const snapshot = JSON.stringify(S._portre.dusunceler);
    expect(porReleaseCard('gk_yok_golden')).toBe(0);
    expect(JSON.stringify(S._portre.dusunceler)).toBe(snapshot);
  });
});

/* ═══════════════════════════════════════════════════════════════
   RETROAKTİF ABSORB — porBackfillCollection (FAZ 5, K5)
   "eskiden kazanılmış kartlar portreye işlenmez" adaletsizliğini
   kapatır. Gerçek 12 kartlık desteyle çalışır (deckReady/getFullDeck
   GERÇEK) — kkPartitionDeck'in `card.id` eşlemesi sahte id'lerle
   (fakeKart) test edilemez, koleksiyon gerçek deste kartlarıyla kurulur.
═══════════════════════════════════════════════════════════════ */
describe('porBackfillCollection — retroaktif absorb', () => {
  let deck;

  beforeAll(async () => {
    await deckReady();
    deck = getFullDeck();
  });

  beforeEach(async () => {
    S.currentUser = { id: UID, user_metadata: { full_name: 'Emre Güllüce' } };
    // Paylaşılan modül-durumu (_evrimWave) önceki describe bloklarından
    // (ör. porReleaseCard testleri, hiç zamanlayıcı ilerletmeden porAbsorbCard
    // çağırıyor) sarkmış olabilir. Dosyanın GENEL beforeEach'i bunu boşaltmayı
    // dener ama bu noktadan SONRA ("porSave" bloğunun vi.restoreAllMocks()'ü
    // callLLM'in taban mock'unu kırdığı için) o deneme SESSİZCE BAŞARISIZ olur
    // ve dalgayı TEMİZLEMEZ, GERİ YÜKLER (_resynthImpl'in catch dalı). Burada
    // callLLM'i bir kereliğine onarıp dalgayı GERÇEKTEN boşaltıyoruz; bu
    // drain'in yan etkisiyle kirlenen S._portre hemen ardından sıfırlanıyor.
    S._portre = freshCard(true);
    callLLM.mockResolvedValueOnce(JSON.stringify({ baslik: 'x', portrait: 'y' }));
    await porResynth();
    // FAKE timers — porAbsorbCard'ın _scheduleEvrim'i GERÇEK 1200ms setTimeout
    // kurar; drain sonrası kurulur ki yukarıdaki senkron porResynth çağrısı
    // zamanlayıcı modundan etkilenmesin.
    vi.useFakeTimers();
    S._portre = freshCard(true);
    S._kisiKarti = { collection: {} };
  });

  function own(...cards) {
    cards.forEach(c => { S._kisiKarti.collection[c.id] = { earnedAt: new Date().toISOString() }; });
  }

  it('sahip olunan ama işlenmemiş kartlar karta işlenir; işlenen kart sayısı döner', async () => {
    const [c1, c2] = deck;
    own(c1, c2);
    const n = await porBackfillCollection();
    expect(n).toBe(2);
    expect(porCardRefs()).toEqual(expect.arrayContaining([c1.id, c2.id]));
  });

  it('idempotans: ikinci çağrı 0 döner — porCardRefs defterindeki kartlar yeniden işlenmez', async () => {
    const [c1, c2] = deck;
    own(c1, c2);
    expect(await porBackfillCollection()).toBe(2);
    expect(await porBackfillCollection()).toBe(0);
  });

  it('history\'de kayıtlı ama madde ref\'i yoğunlaştırmada düşmüş kart yeniden işlenmez', async () => {
    const [c1] = deck;
    own(c1);
    // Yoğunlaştırma sonrası ref düşmüş gibi: yalnız history.cards'ta iz var
    S._portre.history.push({ v: 2, at: new Date().toISOString(), baslik: '', portrait: '', cards: [c1.id] });
    const n = await porBackfillCollection();
    expect(n).toBe(0);
  });

  it('deste hazır değilse 0 döner, hata atmaz', async () => {
    deckReady.mockResolvedValueOnce(false);
    const [c1] = deck;
    own(c1);
    await expect(porBackfillCollection()).resolves.toBe(0);
  });

  it('sahip olunan kart yoksa 0 döner', async () => {
    expect(await porBackfillCollection()).toBe(0);
  });

  it('dalga bütünlüğü: N kart tek porResynth turuna düşer (LLM çağrısı bir kez)', async () => {
    // NOT: mockResolvedValueOnce şart — "porSave" bloğunun afterEach'i
    // (vi.restoreAllMocks) callLLM'in TABAN mock'unu bu noktaya kadar
    // sıfırlar (spy olmayan vi.fn() da restore'da no-op'a düşer); diğer
    // bloklar (Dil bütünlüğü, kart_ozu) aynı sebeple kendi Once'unu kurar.
    callLLM.mockResolvedValueOnce(JSON.stringify({
      baslik: 'Yeniden Yazılan',
      portrait: 'Bu kişi artık kazandığı kişilerin izini taşıyor.',
    }));
    const [c1, c2, c3] = deck;
    own(c1, c2, c3);
    const n = await porBackfillCollection();
    expect(n).toBe(3);
    await vi.advanceTimersByTimeAsync(1300);
    expect(callLLM).toHaveBeenCalledTimes(1);
    expect(S._portre.history.at(-1).cards).toEqual([c1.id, c2.id, c3.id]);
  });
});

/* ── Geçmiş-işleme daveti (FAZ 6) — davetin kapıları ──
   Davet uydurulmuş bir gerekçeyle belirmez: "bekleyen kart var mı" ÖLÇÜLÜR
   (§6.10). Ret kalıcıdır — bir kez "şimdilik kalsın" diyen gezgine aynı soru
   ikinci kez sorulmaz. */
describe('porBackfillPending + davet kapıları', () => {
  let deck;
  beforeAll(async () => { await deckReady(); deck = getFullDeck(); });

  beforeEach(async () => {
    S.currentUser = { id: UID, user_metadata: { full_name: 'Emre Güllüce' } };
    S._portre = freshCard(true);
    callLLM.mockResolvedValueOnce(JSON.stringify({ baslik: 'x', portrait: 'y' }));
    await porResynth();
    vi.useFakeTimers();
    S._portre = freshCard(true);
    S._kisiKarti = { collection: {} };
    SafeStorage.remove(`etw_portre_backfill_davet_${UID}`);
  });

  it('porBackfillPending SAYAR ama işlemez — davet sunulmadan portre değişmez', async () => {
    const [c1, c2] = deck;
    [c1, c2].forEach(c => { S._kisiKarti.collection[c.id] = { earnedAt: new Date().toISOString() }; });
    expect(await porBackfillPending()).toBe(2);
    expect(porCardRefs()).toEqual([]);            // hiçbir şey işlenmedi
    expect(await porBackfillPending()).toBe(2);   // sayım idempotent
  });

  it('bekleyen kart yoksa sayı 0 — davetin kapısı açılmaz', async () => {
    expect(await porBackfillPending()).toBe(0);
  });

  it('işlendikten sonra bekleyen kalmaz', async () => {
    const [c1] = deck;
    S._kisiKarti.collection[c1.id] = { earnedAt: new Date().toISOString() };
    expect(await porBackfillPending()).toBe(1);
    await porBackfillCollection();
    expect(await porBackfillPending()).toBe(0);
  });

  it('ret KALICIDIR: "şimdilik kalsın" sonrası davet bir daha sorulmaz', () => {
    expect(porBackfillDavetGosterildiMi()).toBe(false);
    porBackfillDismiss();
    expect(porBackfillDavetGosterildiMi()).toBe(true);
  });

  it('anon oturumda davet hiç sunulmaz — uid\'siz anahtar yazılmaz', () => {
    const eski = S.currentUser;
    S.currentUser = null;
    expect(porBackfillDavetGosterildiMi()).toBe(true);   // "sorulmuş" sayılır
    porBackfillDavetIsaretle();
    expect(localStorage.getItem('etw_portre_backfill_davet_undefined')).toBe(null);
    S.currentUser = eski;
  });
});
