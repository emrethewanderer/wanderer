/**
 * Tests for js/parts/02d-esik-ekrani.js — eşiğin ışığına duygu dozu
 * (FAZ 16, K10 "metin YOK, yalnız ışık"). `dgKapi('esik', …)` sunumSadece
 * döner; tüketici burada yalnız `.esik-onb`ün KENDİ iki gradyanının alfasını
 * (--esik-dg-lapis/--esik-dg-altin) oynatır, hiçbir metin üretmez. Bu dosya
 * plan FAZ 16'nın doz tablosunu ve K9'un kriz-görünmezlik emsalini mühürler:
 * kriz (`tutma`) atmosfer şeridinde olduğu gibi burada da GÖRÜNMEZ.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../js/parts/15-i18n.js', () => ({ t: (k, f) => f || k }));
vi.mock('../js/parts/12c-kart-gorsel.js', () => ({
  ikvCardFace: () => '<div class="ikv-face"></div>',
  ikvEnsureStyles: () => {},
}));
vi.mock('../js/parts/12b-kart-destesi.js', () => ({
  getCardById: () => null,
  getFullDeck: () => [{ id: 'x' }],          // deste hazır: deckReady yoluna sapma
  deckReady: () => Promise.resolve(true),
  RARITIES: {},
}));
vi.mock('../js/parts/10D-olmak-istedigin.js', () => ({
  CAT_KEYS: ['dusunceler', 'inanclar', 'duygular', 'davranislar'],
  CAT_SIGILS: { dusunceler: '☉', inanclar: '✷', duygular: '❍', davranislar: '✺' },
}));

async function freshModule() {
  vi.resetModules();
  document.body.innerHTML = '';
  const { S } = await import('../js/state.js');
  const mod = await import('../js/parts/02d-esik-ekrani.js');
  return { S, mod };
}

/** Altın kutbu doğuran en kısa yol: onaylı Portre (bkz. _goldData). */
const portreVer = (S) => { S._portre = { confirmed: true, baslik: 'Yolcu' }; };

const overlay = () => document.getElementById('esik-onb');
const dozLapis = () => overlay()?.style.getPropertyValue('--esik-dg-lapis').trim();
const dozAltin = () => overlay()?.style.getPropertyValue('--esik-dg-altin').trim();

describe('eşiğin ışığı — duygu dozu (FAZ 16)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.dgKapi = undefined;
    window.dgYanilmaKonustu = undefined;
    window.dgIklimKaydet = undefined;
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
    delete window.dgKapi;
    delete window.dgYanilmaKonustu;
    delete window.dgIklimKaydet;
  });

  it('okuma yoksa (dgKapi tanımsız) sahne bit-be-bit aynı — hiçbir özellik yazılmaz', async () => {
    const { S, mod } = await freshModule();
    portreVer(S);
    mod.esikShow();
    await vi.advanceTimersByTimeAsync(50);
    expect(overlay()).toBeTruthy();
    expect(dozLapis()).toBe('');
    expect(dozAltin()).toBe('');
  });

  it('kutlama · diriltme → lapis .34 / altın .16 (ufuk ısınır)', async () => {
    const { S, mod } = await freshModule();
    portreVer(S);
    window.dgKapi = vi.fn().mockReturnValue({ sunum: 'kutlama', metin: null });
    mod.esikShow();
    await vi.advanceTimersByTimeAsync(50);
    expect(dozLapis()).toBe('.34');
    expect(dozAltin()).toBe('.16');
  });

  it('yatistirma · sahiplenme → lapis .40 / altın .06 (sahne geri çekilir)', async () => {
    const { S, mod } = await freshModule();
    portreVer(S);
    window.dgKapi = vi.fn().mockReturnValue({ sunum: 'sahiplenme', metin: null });
    mod.esikShow();
    await vi.advanceTimersByTimeAsync(50);
    expect(dozLapis()).toBe('.40');
    expect(dozAltin()).toBe('.06');
  });

  it('taniklik · berraklik → doz DEĞİŞMEZ (tabloda yok, CSS varsayılanı kalır)', async () => {
    const { S, mod } = await freshModule();
    portreVer(S);
    window.dgKapi = vi.fn().mockReturnValue({ sunum: 'taniklik', metin: null });
    mod.esikShow();
    await vi.advanceTimersByTimeAsync(50);
    expect(dozLapis()).toBe('');
    expect(dozAltin()).toBe('');
  });

  it('KRİZ (tutma) eşiğin ışığına YANSIMAZ — doz set edilmez, varsayılanda kalır', async () => {
    const { S, mod } = await freshModule();
    portreVer(S);
    window.dgKapi = vi.fn().mockReturnValue({ sunum: 'tutma', metin: null });
    window.dgYanilmaKonustu = vi.fn((iklim) => iklim);
    window.dgIklimKaydet = vi.fn();
    mod.esikShow();
    await vi.advanceTimersByTimeAsync(50);
    expect(dozLapis()).toBe('');
    expect(dozAltin()).toBe('');
    expect(window.dgYanilmaKonustu).not.toHaveBeenCalled();
    expect(window.dgIklimKaydet).not.toHaveBeenCalled();
  });

  it('damga (K13) — doz GERÇEKTEN uygulandığında basılır', async () => {
    const { S, mod } = await freshModule();
    portreVer(S);
    const eskiIklim = { yuzeyDefter: {} };
    S._dgIklim = eskiIklim;
    window.dgKapi = vi.fn().mockReturnValue({ sunum: 'kutlama', metin: null });
    window.dgYanilmaKonustu = vi.fn((iklim, yuzey) => ({ ...iklim, _sonKonusan: yuzey }));
    window.dgIklimKaydet = vi.fn();
    mod.esikShow();
    await vi.advanceTimersByTimeAsync(50);
    expect(window.dgYanilmaKonustu).toHaveBeenCalledWith(eskiIklim, 'esik');
    expect(window.dgIklimKaydet).toHaveBeenCalledTimes(1);
  });

  /* REGRESYON (faz denetimi, 2026-08-30) — damga taniklik/berraklik'te de
     basılıyordu. O iki satırda sahne motorsuz bir kullanıcınınkiyle bit-be-bit
     aynı kalır: görünür fark yoksa teslim de yoktur ve "teslim edilmeyen söz
     verilmiş sayılmaz" (§6.10). Damgayı oraya basmak yanılma oranının
     paydasını teslim edilmemiş okumalarla dolduruyordu. */
  it('taniklik/berraklik — sahne değişmediği için damga BASILMAZ', async () => {
    for (const sunum of ['taniklik', 'berraklik']) {
      const { S, mod } = await freshModule();
      portreVer(S);
      S._dgIklim = { yuzeyDefter: {} };
      window.dgKapi = vi.fn().mockReturnValue({ sunum, metin: null });
      window.dgYanilmaKonustu = vi.fn();
      window.dgIklimKaydet = vi.fn();
      mod.esikShow();
      await vi.advanceTimersByTimeAsync(50);
      expect(dozLapis()).toBe('');
      expect(dozAltin()).toBe('');
      expect(window.dgYanilmaKonustu).not.toHaveBeenCalled();
      expect(window.dgIklimKaydet).not.toHaveBeenCalled();
    }
  });

  it('İklim henüz hidre değilse (null) damga YAZILMAZ ama doz yine uygulanır', async () => {
    const { S, mod } = await freshModule();
    portreVer(S);
    S._dgIklim = null;
    window.dgKapi = vi.fn().mockReturnValue({ sunum: 'kutlama', metin: null });
    window.dgYanilmaKonustu = vi.fn();
    window.dgIklimKaydet = vi.fn();
    mod.esikShow();
    await vi.advanceTimersByTimeAsync(50);
    expect(dozLapis()).toBe('.34');
    expect(window.dgYanilmaKonustu).not.toHaveBeenCalled();
    expect(window.dgIklimKaydet).not.toHaveBeenCalled();
  });
});

/* KADRAN 2 — ÇAĞRI DAMGAYI GEÇİRİYOR MU (inceleme turu, 2026-08-30).
   Kapının altı tüketicisinden yalnız 02d `zaman`ı geçirmiyordu ve eşiğin
   tazeliği `'gun'`: damgasız okuma orada "bugün" sayılır, yani gece boyu
   açık kalmış bir kabukta dünün nabzı bugünün ışığını yakardı. Bu testler
   ctx'in kendisini sınar — dozun ne olduğunu değil, kapıya NE verildiğini. */
describe('eşiğin çağrısı — kapıya tazelik damgası ve akış geçer', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; delete window.dgKapi; });

  it('ctx `zaman` ve `akis` taşır — kadran 2 varsayılana düşmez', async () => {
    const { S, mod } = await freshModule();
    portreVer(S);
    S._dgNabizZaman = 1735000000000;
    S._dgYay = 'yukselen';
    S._dgSonKarsilama = [{ eksen: 'taniklik' }];
    window.dgKapi = vi.fn().mockReturnValue(null);
    mod.esikShow();
    await vi.advanceTimersByTimeAsync(50);
    expect(window.dgKapi).toHaveBeenCalled();
    const ctx = window.dgKapi.mock.calls[0][1];
    expect(ctx.zaman).toBe(1735000000000);
    expect(ctx.akis).toEqual({ yon: 'yukselen', gecmis: [{ eksen: 'taniklik' }] });
  });
});
