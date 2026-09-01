// Portre — onboarding uçtan uca akışı + tohumlama + test boşlukları
// (persistOnboardingSeed, porDrainAbsorbQueue, taslak kurtarma, porLoad
// backfill, buildPortreContext, porSessionEnrich, synthesizePerson/
// normalizeSynth/fallbackSynth). tests/02c-portre-evrim.test.js'in mock
// desenini yeniden kullanır; private'lar export edilmez, hepsi public akıştan.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../js/parts/04-llm-hero-history.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, callLLM: vi.fn() };
});

vi.mock('../js/parts/12b-kart-destesi.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getCardById: vi.fn(() => null) };
});

import { callLLM } from '../js/parts/04-llm-hero-history.js';
import { getCardById } from '../js/parts/12b-kart-destesi.js';
import {
  runPortreOnboarding, porAbsorbCard, porLoad,
  porSessionEnrich, buildPortreContext, synthesizePerson,
} from '../js/parts/02c-portre.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';
import { S } from '../js/state.js';

const UID = 'test-uid-onboarding';

function fakeKart(id, over = {}) {
  return {
    id, name: 'SABIRLI BEKLEYEN', virtue: 'sebat', lesson: 'Bekleyen kazanır.',
    dusunceler: [`${id} düşünce`], inanclar: [`${id} inanç`],
    hisler: [`${id} his`], davranislar: [`${id} davranış`],
    ...over,
  };
}

const SYNTH_JSON = JSON.stringify({
  baslik: 'Cesur Kâşif', portrait: 'Bu kişi şu an cesaretini arıyor.',
  dusunceler_ozet: 'd', inanclar_ozet: 'i', duygular_ozet: 'h', davranislar_ozet: 'b',
  foundations: { oz_sevgi: 60, oz_saygi: 60, oz_deger: 60, oz_guven: 20, bolluk: 60 },
  pattern: 'çekingenlik', oneri: 'Cesur adımlar atan biri',
});

function fillCategory(overlay) {
  for (let i = 0; i < 6; i++) {
    const inp = overlay.querySelector('.sc-input');
    inp.value = `madde ${i}`;
    overlay.querySelector('[data-act="add"]').click();
  }
}

beforeEach(() => {
  document.body.innerHTML = '';
  S.currentUser = { id: UID, user_metadata: { full_name: 'Test Kullanıcı' } };
  S._portre = null;
  S._archetypes.cesur = { state: 'locked', name: 'Cesur' };
  callLLM.mockReset();
  getCardById.mockReset().mockReturnValue(null);
  try { SafeStorage.remove(`etw_portre_draft_${UID}`); } catch (_) {}
  try { SafeStorage.remove(`etw_portre_absorb_q_${UID}`); } catch (_) {}
  try { SafeStorage.remove(`etw_portre_karti_${UID}`); } catch (_) {}
});

afterEach(() => {
  vi.useRealTimers();
});

describe('runPortreOnboarding — uçtan uca akış', () => {
  it('4 kategori × 6 madde → sentez → onay: tohum + drain + taslak temizliği', async () => {
    vi.useFakeTimers();
    callLLM.mockResolvedValue(SYNTH_JSON);
    getCardById.mockImplementation(id => (id === 'q1' ? fakeKart('q1') : null));

    const p = runPortreOnboarding();
    // Onboarding sürerken (kart henüz onaysız) bir kazanım geliyor — kuyruğa yazılmalı
    porAbsorbCard(fakeKart('q1'));
    expect(SafeStorage.get(`etw_portre_absorb_q_${UID}`, [])).toEqual(['q1']);

    const overlay = document.getElementById('sc-onb');
    overlay.querySelector('[data-act="begin"]').click();
    for (let c = 0; c < 4; c++) {
      fillCategory(overlay);
      overlay.querySelector('[data-act="next"]').click();
    }
    await vi.advanceTimersByTimeAsync(1600); // runSynth min-1500ms + LLM
    overlay.querySelector('[data-act="confirm"]').click();
    await vi.advanceTimersByTimeAsync(400); // close() 320ms
    const synth = await p;

    expect(synth.baslik).toBe('Cesur Kâşif');
    expect(S._portre.confirmed).toBe(true);
    expect(S._portre.baslik).toBe('Cesur Kâşif');

    // persistOnboardingSeed etkileri
    expect(S._foundationsProfile.oz_guven.score).toBe(20);
    expect(S._foundationsProfile.oz_guven.direction).toBe('down');
    expect(S._archetypes.cesur.state).toBe('reachable'); // en zayıf temel oz_guven → 'cesur'
    expect(S._onboardingRecommendation.oneri).toBe('Cesur adımlar atan biri');
    expect(S._personTransition.desired.description).toBe('Cesur adımlar atan biri');

    // porDrainAbsorbQueue — onay-öncesi kazanım şimdi işlendi
    expect(S._portre.dusunceler.some(e => e.ref === 'q1')).toBe(true);
    expect(SafeStorage.get(`etw_portre_absorb_q_${UID}`, ['kalıntı'])).toEqual(['kalıntı']); // anahtar silindi → fallback döner

    // taslak temizlendi + overlay kaldırıldı
    expect(SafeStorage.get(`etw_portre_draft_${UID}`, 'kalıntı')).toBe('kalıntı'); // remove sonrası fallback döner
    expect(document.getElementById('sc-onb')).toBeNull();
  });

  it('"Şimdilik atla" taslakla birlikte kapatır, null resolve eder', async () => {
    vi.useFakeTimers();
    const p = runPortreOnboarding();
    const overlay = document.getElementById('sc-onb');
    overlay.querySelector('[data-act="skip"]').click();
    await vi.advanceTimersByTimeAsync(400);
    const result = await p;
    expect(result).toBeNull();
    expect(document.getElementById('sc-onb')).toBeNull();
  });

  it('kategori ortasında kesilen taslak sonraki çağrıda devralınır (terk edilmiş oturum kurtarma)', () => {
    const p1 = runPortreOnboarding();
    const overlay1 = document.getElementById('sc-onb');
    overlay1.querySelector('[data-act="begin"]').click();
    for (let i = 0; i < 3; i++) { // 6'dan az — kategori tamamlanmadan kes
      const inp = overlay1.querySelector('.sc-input');
      inp.value = `madde ${i}`;
      overlay1.querySelector('[data-act="add"]').click();
    }
    // Sayfa "kapanıyor" — overlay elle kaldırılır, state sıfırlanır (p1 kasıtlı askıda kalır)
    overlay1.remove();
    S._portre = null;

    runPortreOnboarding(); // taslağı SafeStorage'dan devralmalı
    expect(S._portre.dusunceler).toHaveLength(3);
    void p1;
  });
});

describe('Onboarding erişilebilirlik — Escape', () => {
  it('Escape yalnız sahne 0\'da (giriş) kapatır', async () => {
    vi.useFakeTimers();
    const p = runPortreOnboarding();
    const overlay = document.getElementById('sc-onb');
    overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.advanceTimersByTimeAsync(400);
    const result = await p;
    expect(result).toBeNull();
    expect(document.getElementById('sc-onb')).toBeNull();
  });

  it('Escape sahne 1\'de (veri girişi) yutulur — kazara kapanmaz', () => {
    const p = runPortreOnboarding();
    const overlay = document.getElementById('sc-onb');
    overlay.querySelector('[data-act="begin"]').click();
    overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.getElementById('sc-onb')).not.toBeNull(); // hâlâ açık
    void p;
  });
});

/* ─── Eşiğin Nabzı (FAZ 2 — İç Çalışma 06 rev.2): sekiz çağrı yerinden altısı
   bu dosyada yaşayan runPortreOnboarding akışına aittir. Damgayı teslim eden
   basar (K2): "basladi" ilk çizimde, "kategori" Devam'da, "sentez" bittiğinde,
   "dogus" mühürde, "atladi" terkte. */
describe('Eşiğin Nabzı (FAZ 2) — wtLogEsik çağrı yerleri', () => {
  beforeEach(() => {
    window.wtLogEsik = vi.fn();
  });
  afterEach(() => {
    delete window.wtLogEsik;
  });

  it('overlay ilk çizimde basladi olayı n=0 (taze taslak) ile yazılır', () => {
    const p = runPortreOnboarding();
    expect(window.wtLogEsik).toHaveBeenCalledWith('basladi', { n: 0 });
    document.getElementById('sc-onb')?.remove();
    void p;
  });

  it('devralınan taslakta basladi devralınan madde sayısıyla yazılır', () => {
    SafeStorage.set(`etw_portre_draft_${UID}`, {
      dusunceler: [{ text: 'a', src: 'user' }, { text: 'b', src: 'user' }],
      inanclar: [], duygular: [], davranislar: [],
    });
    const p = runPortreOnboarding();
    expect(window.wtLogEsik).toHaveBeenCalledWith('basladi', { n: 2 });
    document.getElementById('sc-onb')?.remove();
    void p;
  });

  it('"Devam" tıklanınca kategori TAMAMLANDI dal/adim/n ile yazılır', () => {
    const p = runPortreOnboarding();
    const overlay = document.getElementById('sc-onb');
    overlay.querySelector('[data-act="begin"]').click();
    fillCategory(overlay); // 6 madde — ilk kategori (dusunceler) tamamlanır
    overlay.querySelector('[data-act="next"]').click();

    expect(window.wtLogEsik).toHaveBeenCalledWith('kategori', {
      dal: 'dusunceler', adim: 1, n: 6,
    });
    overlay.remove();
    void p;
  });

  it('sentez LLM hatasında (fallback) dal:"fallback" yazılır — bayrak kalıcı state\'e sızmaz', async () => {
    vi.useFakeTimers();
    callLLM.mockRejectedValue(new Error('offline'));
    const p = runPortreOnboarding();
    const overlay = document.getElementById('sc-onb');
    overlay.querySelector('[data-act="begin"]').click();
    for (let c = 0; c < 4; c++) {
      fillCategory(overlay);
      overlay.querySelector('[data-act="next"]').click();
    }
    await vi.advanceTimersByTimeAsync(1600); // runSynth min-1500ms + LLM

    const call = window.wtLogEsik.mock.calls.find(c => c[0] === 'sentez');
    expect(call[1].dal).toBe('fallback');
    expect(typeof call[1].sureMs).toBe('number');

    overlay.querySelector('[data-act="confirm"]').click();
    await vi.advanceTimersByTimeAsync(400);
    await p;
    // persistOnboardingSeed'e giden synth'te bayrak yaşamıyor (§6.10 — sahte başarı yasak)
    expect(S._onboardingRecommendation._fallback).toBeUndefined();
  });

  it('sentez başarıyla dönünce dal:"ok" yazılır', async () => {
    vi.useFakeTimers();
    callLLM.mockResolvedValue(SYNTH_JSON);
    const p = runPortreOnboarding();
    const overlay = document.getElementById('sc-onb');
    overlay.querySelector('[data-act="begin"]').click();
    for (let c = 0; c < 4; c++) {
      fillCategory(overlay);
      overlay.querySelector('[data-act="next"]').click();
    }
    await vi.advanceTimersByTimeAsync(1600);

    const call = window.wtLogEsik.mock.calls.find(c => c[0] === 'sentez');
    expect(call[1].dal).toBe('ok');

    overlay.querySelector('[data-act="confirm"]').click();
    await vi.advanceTimersByTimeAsync(400);
    await p;
  });

  it('"Bu Kart Benim" mühründe dogus olayı toplam madde sayısıyla yazılır', async () => {
    vi.useFakeTimers();
    callLLM.mockResolvedValue(SYNTH_JSON);
    const p = runPortreOnboarding();
    const overlay = document.getElementById('sc-onb');
    overlay.querySelector('[data-act="begin"]').click();
    for (let c = 0; c < 4; c++) {
      fillCategory(overlay);
      overlay.querySelector('[data-act="next"]').click();
    }
    await vi.advanceTimersByTimeAsync(1600);
    overlay.querySelector('[data-act="confirm"]').click();

    expect(window.wtLogEsik).toHaveBeenCalledWith('dogus', { n: 24 }); // 4×6

    await vi.advanceTimersByTimeAsync(400);
    await p;
  });

  it('"Şimdilik atla" adim=terk edilen sahne (giriş, 0) ile yazılır', () => {
    const p = runPortreOnboarding();
    const overlay = document.getElementById('sc-onb');
    overlay.querySelector('[data-act="skip"]').click();
    expect(window.wtLogEsik).toHaveBeenCalledWith('atladi', { adim: 0 });
    void p;
  });

  it('Escape (yalnız sahne 0) atladi olayını sahne numarasıyla yazar', async () => {
    vi.useFakeTimers();
    const p = runPortreOnboarding();
    const overlay = document.getElementById('sc-onb');
    overlay.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(window.wtLogEsik).toHaveBeenCalledWith('atladi', { adim: 0 });
    await vi.advanceTimersByTimeAsync(400);
    await p;
  });
});

describe('buildPortreContext', () => {
  it('sentez sonucundan LLM bağlamı üretir', () => {
    const synth = {
      baslik: 'Cesur', portrait: 'P.',
      ozet: { dusunceler: 'd', inanclar: 'i', duygular: 'h', davranislar: 'b' },
      foundations: { oz_sevgi: 60, oz_saygi: 60, oz_deger: 60, oz_guven: 20, bolluk: 60 },
      pattern: 'çekingenlik', oneri: 'Cesur adımlar atan biri',
    };
    const ctx = buildPortreContext(synth);
    expect(ctx).toContain('[PORTRE');
    expect(ctx).toContain('Cesur');
    expect(ctx).toContain('Cesur adımlar atan biri');
  });

  it('synth yoksa boş string döner', () => {
    expect(buildPortreContext(null)).toBe('');
  });
});

describe('porSessionEnrich', () => {
  beforeEach(() => {
    S._portre = {
      dusunceler: [], inanclar: [], duygular: [], davranislar: [],
      confirmed: true, version: 1, history: [], baslik: '', portrait: '',
    };
  });

  it('3 mesajdan az ise çalışmaz', async () => {
    S.chatHistory = [{ role: 'user', content: 'a' }, { role: 'user', content: 'b' }];
    await porSessionEnrich();
    expect(callLLM).not.toHaveBeenCalled();
  });

  it('onaysız kartta çalışmaz', async () => {
    S._portre.confirmed = false;
    S.chatHistory = [{ role: 'user', content: 'a' }, { role: 'user', content: 'b' }, { role: 'user', content: 'c' }];
    await porSessionEnrich();
    expect(callLLM).not.toHaveBeenCalled();
  });

  it('yeni madde bulunca "emre" kaynaklı ekler ve kaydeder', async () => {
    S.chatHistory = [{ role: 'user', content: 'a' }, { role: 'user', content: 'b' }, { role: 'user', content: 'c' }];
    callLLM.mockResolvedValueOnce(JSON.stringify({
      dusunceler: ['yeni düşünce'], inanclar: [], duygular: [], davranislar: [],
    }));
    await porSessionEnrich();
    expect(S._portre.dusunceler.map(e => e.text)).toContain('yeni düşünce');
    expect(S._portre.dusunceler[0].src).toBe('emre');
    expect(SafeStorage.get(`etw_portre_karti_${UID}`, null)?.dusunceler?.length).toBe(1);
  });

  it('LLM hatasında sessizce düşer, madde eklenmez', async () => {
    S.chatHistory = [{ role: 'user', content: 'a' }, { role: 'user', content: 'b' }, { role: 'user', content: 'c' }];
    callLLM.mockRejectedValueOnce(new Error('offline'));
    await porSessionEnrich();
    expect(S._portre.dusunceler).toHaveLength(0);
  });
});

describe('synthesizePerson — normalize + fallback', () => {
  it('geçerli JSON → skorlar 2-98 aralığına kırpılır, başlık 60 karaktere kısalır', async () => {
    callLLM.mockResolvedValueOnce(JSON.stringify({
      baslik: 'X'.repeat(100), portrait: 'P',
      foundations: { oz_sevgi: 150, oz_saygi: -10, oz_deger: 50, oz_guven: 50, bolluk: 50 },
      dusunceler_ozet: 'd', inanclar_ozet: 'i', duygular_ozet: 'h', davranislar_ozet: 'b',
      pattern: 'p', oneri: 'o',
    }));
    const result = await synthesizePerson({ dusunceler: [], inanclar: [], duygular: [], davranislar: [] });
    expect(result.baslik.length).toBe(60);
    expect(result.foundations.oz_sevgi).toBe(98);
    expect(result.foundations.oz_saygi).toBe(2);
  });

  it('bozuk JSON → deterministik fallback (kartın ilk maddelerinden)', async () => {
    callLLM.mockResolvedValueOnce('not json{{{');
    const card = { dusunceler: [{ text: 'ilk düşünce' }], inanclar: [], duygular: [], davranislar: [] };
    const result = await synthesizePerson(card);
    expect(result.ozet.dusunceler).toBe('ilk düşünce');
    expect(result.foundations.oz_sevgi).toBe(45);
  });
});

describe('porLoad — eski kayıt backfill', () => {
  it('dizisiz/versionsuz eski KV kaydını garanti alanlarla tamamlar', () => {
    SafeStorage.set(`etw_portre_karti_${UID}`, { baslik: 'Eski', portrait: 'P', confirmed: true });
    porLoad();
    expect(Array.isArray(S._portre.dusunceler)).toBe(true);
    expect(S._portre.version).toBe(1);
    expect(Array.isArray(S._portre.history)).toBe(true);
    expect(S._portre.confirmed).toBe(true);
  });
});

/* ─── Onboarding'in İLK adımı: dil ───
   Emre'nin kararı (2026-08-19): dil yeni üye olana onboarding'de, en başta
   sorulur — bundan sonraki her cümle (yönlendirmeler, kategori adları, doğan
   kartın kendisi) o dilde söylenecektir. Beyan varsa kapı hiç açılmaz. */
describe('Onboarding — dil beyanı ilk kapıdır', () => {
  beforeEach(() => {
    document.getElementById('lang-gate-overlay')?.remove();
    document.getElementById('sc-onb')?.remove();
    S.currentUser = { id: UID };
    S._portre = null;
  });

  afterEach(() => {
    document.getElementById('lang-gate-overlay')?.remove();
    document.getElementById('sc-onb')?.remove();
    try { localStorage.setItem('etw_lang', 'tr'); } catch (_) {}
  });

  it('beyan yoksa dil kapısı açılır ve portre ritüeli HENÜZ kurulmaz', () => {
    localStorage.removeItem('etw_lang');
    runPortreOnboarding();
    expect(document.getElementById('lang-gate-overlay')).toBeTruthy();
    expect(document.getElementById('sc-onb')).toBeNull();
  });

  it('beyan yoksa dil-kapisi olayı yazılır', () => {
    localStorage.removeItem('etw_lang');
    window.wtLogEsik = vi.fn();
    runPortreOnboarding();
    expect(window.wtLogEsik).toHaveBeenCalledWith('dil-kapisi');
    delete window.wtLogEsik;
  });

  it('beyan verilince onboarding o dille kurulur', () => {
    localStorage.removeItem('etw_lang');
    runPortreOnboarding();
    document.querySelector('.lang-gate-btn[data-lang="tr"]').click();
    expect(localStorage.getItem('etw_lang')).toBe('tr');
    expect(document.getElementById('sc-onb')).toBeTruthy();   // ritüel beyandan SONRA
  });

  it('beyan varsa kapı hiç açılmaz — soru bir kez sorulur', () => {
    localStorage.setItem('etw_lang', 'tr');
    runPortreOnboarding();
    expect(document.getElementById('lang-gate-overlay')).toBeNull();
    expect(document.getElementById('sc-onb')).toBeTruthy();
  });
});
