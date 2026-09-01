/**
 * Panzehir (K6 · Üç Usta planı FAZ 5) — INWO zıt-hizalanmasının kitap diline çevirisi
 *   - kkPanzehir: gölge kartının `virtue` alanı zaten panzehir erdemini taşır
 *   - Panzehir başka bir gölge OLAMAZ; bileşik de sayılmaz (ışık saf tutulur)
 *   - kkDetectPanzehir: idempotent mühür; yalnız İKİSİ de sahipliyken açılır
 */
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

vi.mock('../js/parts/04-llm-hero-history.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, callLLM: vi.fn().mockResolvedValue('{}') };
});
vi.mock('../js/parts/00b-indexeddb.js', () => ({
  idbSaveRecording: vi.fn().mockResolvedValue(true),
  idbGetRecording: vi.fn().mockResolvedValue(null),
  idbDeleteRecording: vi.fn().mockResolvedValue(true),
}));

import { kkPanzehir, kkDetectPanzehir } from '../js/parts/10q-w2-kisi-karti.js';
import { deckReady, getFullDeck } from '../js/parts/12b-kart-destesi.js';
import { S } from '../js/state.js';

let deck = [];
const GOLGE = new Set(['golge', 'perde', 'tuzak']);
beforeAll(async () => { await deckReady(); deck = getFullDeck(); });

beforeEach(() => {
  document.body.innerHTML = '';
  S.currentUser = { id: 'u-pz-1' };
});

const golgeler = () => deck.filter(c => GOLGE.has(c.category));
const isikOf = (v) => deck.find(c => c.virtue === v && !GOLGE.has(c.category) && c.category !== 'bilesik');

describe('kkPanzehir — kutup verisi zaten destede', () => {
  it('gölge olmayan kartta null (guard buna bakar)', () => {
    expect(kkPanzehir(deck.find(c => c.category === 'temel'), {})).toBeNull();
    expect(kkPanzehir(null, {})).toBeNull();
  });

  it('her gölge/perde/tuzak kartının bir panzehir erdemi vardır', () => {
    const g = golgeler();
    expect(g.length).toBe(2);                        // tuzak-kusursuz + golge-onay
    // Kesit iki KATEGORİDEN birer kart taşır (tuzak · golge) — GOLGE_KATEGORI
    // setinin tek kategoriye daralmadığı da böyle sınanmış olur.
    expect(new Set(g.map(c => c.category)).size).toBe(2);
    for (const c of g) {
      const pz = kkPanzehir(c, {});
      expect(pz, c.id).not.toBeNull();
      expect(pz.erdem, c.id).toBeTruthy();
    }
  });

  it('HER gölgenin panzehri destede gerçekten bulunabilir (ölü kutup yok)', () => {
    for (const c of golgeler()) {
      const pz = kkPanzehir(c, {});
      expect(isikOf(pz.erdem), `${c.id} → ${pz.erdem}`).toBeTruthy();
    }
  });

  it('ışık kartı yoksa kapalıdır, sahipse açılır', () => {
    const g = golgeler()[0];
    const erdem = kkPanzehir(g, {}).erdem;
    expect(kkPanzehir(g, {}).acik).toBe(false);
    const isik = isikOf(erdem);
    const pz = kkPanzehir(g, { [isik.id]: { earnedAt: 'x' } });
    expect(pz.acik).toBe(true);
    expect(pz.kart.id).toBe(isik.id);
  });

  it('panzehir başka bir GÖLGE olamaz — karanlık karanlığı iyileştirmez', () => {
    const g = golgeler()[0];
    const erdem = kkPanzehir(g, {}).erdem;
    const golgeIkiz = golgeler().find(c => c.virtue === erdem && c.id !== g.id);
    if (!golgeIkiz) return;                          // bu erdemde ikinci gölge yok
    expect(kkPanzehir(g, { [golgeIkiz.id]: { earnedAt: 'x' } }).acik).toBe(false);
  });

  it('bileşik kart panzehir sayılmaz (ışık tek ve saf tutulur)', () => {
    const bilesik = deck.find(c => c.category === 'bilesik');
    const g = golgeler().find(c => c.virtue === bilesik.virtue);
    if (!g) return;
    expect(kkPanzehir(g, { [bilesik.id]: { earnedAt: 'x' } }).acik).toBe(false);
  });
});

describe('kkDetectPanzehir — mühür', () => {
  it('gölge sahipli değilse mühür açılmaz (önce tanıyacaksın)', () => {
    const g = golgeler()[0];
    const isik = isikOf(kkPanzehir(g, {}).erdem);
    const kk = { collection: { [isik.id]: { earnedAt: 'x' } } };
    expect(kkDetectPanzehir(kk)).toEqual([]);
  });

  it('gölge + ışık ikisi de sendeyse mühürlenir ve ışığın izi tutulur', () => {
    const g = golgeler()[0];
    const isik = isikOf(kkPanzehir(g, {}).erdem);
    const kk = { collection: { [g.id]: { earnedAt: 'x' }, [isik.id]: { earnedAt: 'x' } } };
    expect(kkDetectPanzehir(kk)).toEqual([g.id]);
    expect(kk.panzehirler[g.id].erdemKartId).toBe(isik.id);
  });

  it('İDEMPOTENT — ikinci tarama aynı gölgeyi tekrar mühürlemez', () => {
    const g = golgeler()[0];
    const isik = isikOf(kkPanzehir(g, {}).erdem);
    const kk = { collection: { [g.id]: { earnedAt: 'x' }, [isik.id]: { earnedAt: 'x' } } };
    kkDetectPanzehir(kk);
    expect(kkDetectPanzehir(kk)).toEqual([]);
  });

  it('bozuk durumda sessizce boş döner (savunmacı)', () => {
    expect(kkDetectPanzehir(null)).toEqual([]);
    expect(kkDetectPanzehir({})).toEqual([]);
  });
});
