// Lapis evrim köprüsü (10D) — "Niyet Alınan [Ad]" da CANLIDIR.
// Emre'nin kararı (2026-07-27): sentez mezuniyete ertelenemez; kişi sürekli
// hangi kişi olmak istediğini görmeli. Altın tarafın (02c) deseni burada
// lapis tarafa kuruldu: absorb/release → dalga (1200ms) → tek LLM sentezi
// → epitet + fısıltı tazelenir, MADDELERE DOKUNULMAZ.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { S } from '../js/state.js';

// callLLM KISMİ mock (02c-portre-evrim.test.js deseni) — 04'ün diğer
// export'ları gerçek kalmalı, yoksa 03-auth-shell zinciri çöker.
vi.mock('../js/parts/04-llm-hero-history.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    callLLM: vi.fn().mockResolvedValue(JSON.stringify({
      baslik: 'Sükûnetle Duran', whisper: 'fırtınada sabit',
    })),
  };
});

import { callLLM } from '../js/parts/04-llm-hero-history.js';
import {
  oikAbsorbCard, oikReleaseCard, oikResynth, oikResynthPending, oikCardName, oikGetCard,
} from '../js/parts/10D-olmak-istedigin.js';

/* Dalga → timer → _oikSerial zinciri: sahte zamanı ilerlet, SONRA zincirin
   mikrotask'larını boşalt. Yoksa sentez bir sonraki teste taşar. */
const settle = async (ms = 1300) => {
  await vi.advanceTimersByTimeAsync(ms);
  await vi.advanceTimersByTimeAsync(0);
  await vi.advanceTimersByTimeAsync(0);
};

const kisiKarti = (id = 'k_sabir') => ({
  id, name: 'Sabırla Bekleyen', virtue: 'sabir',
  dusunceler: ['Acele bir tuzaktır'], inanclar: ['Vakit Allah\'ındır'],
  hisler: ['İçimde genişleyen sükûnet'], davranislar: ['Üç nefes alıp cevap veriyorum'],
});

const aktifKart = () => ({
  id: 'oik_1', baslik: 'Cesaretle Duran', whisper: 'korkuya rağmen',
  dusunceler: [{ text: 'Kendi el yazım', src: 'user', at: '2026-07-01T00:00:00.000Z' }],
  inanclar: [], duygular: [], davranislar: [],
  state: 'active', created_at: '2026-07-01T00:00:00.000Z', updated_at: '2026-07-01T00:00:00.000Z',
});

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '';
  S.currentUser = { id: 'u1', user_metadata: { full_name: 'Emre Güllüce' } };
  S._oik = { cards: [aktifKart()], activeCardId: 'oik_1', readingLog: {}, crystalMilestone: 0, seedHint: null };
  S._personTransition = { desired: { description: '' }, last_updated: null };
  S._gecisKartlari = [];
  callLLM.mockClear();
  callLLM.mockResolvedValue(JSON.stringify({ baslik: 'Sükûnetle Duran', whisper: 'fırtınada sabit' }));
});

afterEach(() => {
  vi.useRealTimers();
  delete window.gkRefResolve;
  delete window.yolRenderHero;
  delete window.kkRenderBugun;
});

describe('oikCardName — kart adı kullanıcınındır', () => {
  it('"Niyet Alınan [Ad]" döner (auth metadata ilk isminden)', () => {
    expect(oikCardName()).toBe('Niyet Alınan Emre');
  });

  it('#ob-name varsa onu tercih eder (uygulama konvansiyonu)', () => {
    document.body.innerHTML = '<span id="ob-name">Deniz</span>';
    expect(oikCardName()).toBe('Niyet Alınan Deniz');
  });

  it('ad hiç yoksa Gezgin\'e düşer — uydurma isim yok', () => {
    S.currentUser = { id: 'u1', user_metadata: {} };
    expect(oikCardName()).toBe('Niyet Alınan Gezgin');
  });
});

describe('oikResynth — niyet beyanı kartın YÜZÜNÜ tazeler', () => {
  it('absorb sonrası dalga 1200ms\'de tek sentez tetikler', async () => {
    oikAbsorbCard(kisiKarti());
    expect(callLLM).not.toHaveBeenCalled();      // debounce penceresi
    await settle();
    expect(callLLM).toHaveBeenCalledTimes(1);
    expect(oikGetCard().baslik).toBe('Sükûnetle Duran');
    expect(oikGetCard().whisper).toBe('fırtınada sabit');
  });

  it('arka arkaya üç niyet TEK çağrıda birleşir (kota koruması debounce\'tur)', async () => {
    oikAbsorbCard(kisiKarti('k1'));
    oikAbsorbCard(kisiKarti('k2'));
    oikAbsorbCard(kisiKarti('k3'));
    await settle();
    expect(callLLM).toHaveBeenCalledTimes(1);
  });

  it('kullanıcının el yazısına DOKUNMAZ — yalnız yüz değişir', async () => {
    oikAbsorbCard(kisiKarti());
    await settle();
    const el = oikGetCard().dusunceler.find(e => e.src === 'user');
    expect(el.text).toBe('Kendi el yazım');
  });

  it('Atölye kutbu (gk_ ref) da dalgaya girer — katalog dışı kişi kaybolmaz', async () => {
    // gkPoleAsCard'ın ürettiği kart: id = gk_<id>_lapis, name = kutup başlığı.
    // Sentez adı DALGADAN okur; katalog destesine hiç sormaz.
    oikAbsorbCard({
      id: 'gk_x_lapis', name: 'Sükûnetle Duran', virtue: 'odak',
      dusunceler: ['Cevap vermemek de cevaptır'],
    });
    await settle();
    expect(callLLM).toHaveBeenCalledTimes(1);
    const usr = callLLM.mock.calls[0][0].contents[0].parts[0].text;
    expect(usr).toContain('Sükûnetle Duran');
  });

  it('niyetten vazgeçmek (release) de yüzü tazeler', async () => {
    oikAbsorbCard(kisiKarti());
    await settle();
    callLLM.mockClear();
    oikReleaseCard('k_sabir');
    await settle();
    expect(callLLM).toHaveBeenCalledTimes(1);
  });

  it('sentez sonrası Bugün\'ün lapis kutbu beklemeden tazelenir', async () => {
    const hero = vi.fn();
    window.yolRenderHero = hero;
    oikAbsorbCard(kisiKarti());
    await settle();
    expect(hero).toHaveBeenCalled();
  });
});

describe('oikResynth — hata hâlinde niyet kaybolmaz (asla bloklama)', () => {
  it('LLM düşerse kart ESKİ yüzüyle kalır ve dalga geri konur', async () => {
    callLLM.mockImplementation(async () => { throw new Error('503'); });
    oikAbsorbCard(kisiKarti());
    await settle();
    expect(oikGetCard().baslik).toBe('Cesaretle Duran');   // eski yüz durur
    expect(oikResynthPending()).toBe(true);
    // madde yerinde: sentez başarısız oldu diye beyan silinmedi
    expect(oikGetCard().dusunceler.some(e => e.ref === 'k_sabir')).toBe(true);
  });

  it('bozuk JSON de kartı bozmaz', async () => {
    callLLM.mockImplementation(async () => 'düz metin, JSON değil');
    oikAbsorbCard(kisiKarti());
    await settle();
    expect(oikGetCard().baslik).toBe('Cesaretle Duran');
  });

  it('aktif kart yokken sentez sessizce düşer (tasarım töreni beklenir)', async () => {
    S._oik.activeCardId = null;
    S._oik.cards = [];
    await oikResynth();
    expect(callLLM).not.toHaveBeenCalled();
  });
});
