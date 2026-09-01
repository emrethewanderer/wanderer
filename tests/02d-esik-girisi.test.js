/**
 * Tests for esikShowOnce — Bugünün Eşiği'nin GİRİŞ kapısı (2026-08-26).
 *
 * Eşik Studio flip'inden alınıp uygulamaya girişe taşındı: her girişte bir
 * kez, dil modelinin ön yüzünde. Bu dosya o taşımanın iki sözleşmesini
 * mühürler:
 *
 *   1. TEK GÖSTERİM — kapı GÜN değil GİRİŞTİR. Sayfa ömrü boyunca ikinci
 *      çağrı hiçbir şey açmaz (uygulamayı kapatmadan Sohbet ↔ Studio gezinen
 *      kullanıcı Eşik'i bir daha görmez); yeni gösterim yeni boot ister.
 *   2. KUTUP BEKLEMESİ — esikShow'un "gösterecek kutup yok" kapısı overlay'den
 *      ÖNCE çalışır. Boot'ta kkInit/imInit hidrasyonu (~2sn) gelmeden çağrı
 *      yapılırsa Eşik SESSİZCE hiç açılmaz; bu, taşımanın en kolay kaçırılan
 *      kırığıdır ve testin asıl varlık sebebidir.
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

describe('esikShowOnce — girişin kapısı', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

  it('kutup hazırsa Eşik açılır', async () => {
    const { S, mod } = await freshModule();
    portreVer(S);
    mod.esikShowOnce();
    await vi.advanceTimersByTimeAsync(50);
    expect(overlay()).toBeTruthy();
  });

  it('ikinci çağrı AÇMAZ — kapı gün değil giriştir', async () => {
    const { S, mod } = await freshModule();
    portreVer(S);
    mod.esikShowOnce();
    await vi.advanceTimersByTimeAsync(50);
    expect(overlay()).toBeTruthy();
    document.body.innerHTML = '';               // kullanıcı Eşik'i kapattı

    const ikinci = await mod.esikShowOnce();    // Sohbet → Studio → Sohbet…
    await vi.advanceTimersByTimeAsync(1000);
    expect(ikinci).toBeNull();
    expect(overlay()).toBeNull();
  });

  it('kutuplar boot\'ta geç hidre olursa BEKLER, sonra açar', async () => {
    const { S, mod } = await freshModule();
    mod.esikShowOnce();                         // henüz kkInit/imInit gelmedi
    await vi.advanceTimersByTimeAsync(600);
    expect(overlay()).toBeNull();               // sessizce düşmedi — bekliyor

    portreVer(S);                               // hidrasyon geldi
    await vi.advanceTimersByTimeAsync(400);
    expect(overlay()).toBeTruthy();
  });

  it('gerçekten taze hesapta (kutup hiç doğmazsa) tavanda sessiz geçer', async () => {
    const { mod } = await freshModule();
    const sonuc = mod.esikShowOnce();
    await vi.advanceTimersByTimeAsync(9000);
    expect(await sonuc).toBeNull();
    expect(overlay()).toBeNull();
  });
});
