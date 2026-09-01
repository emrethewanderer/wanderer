/**
 * ÖDEV DEFTERİ — geçmiş DB'de duruyordu, getter'ı yoktu (2026-08-23)
 *
 * `loadRoadmap` post-auth turda `homework` tablosundan son on satırı yıllardır
 * çekiyor, içinden yalnız `pending` olanı `_activeHomework`'e alıp GERİSİNİ
 * ATIYORDU. Kullanıcının kendine verdiği eski sözler veritabanında duruyor,
 * hiçbir yüzeyden görünmüyordu ([[odev-zinciri-ve-cipi]]: "panel istenirse
 * yeniden yazılır").
 *
 * Bu test defterin sözleşmesini tutar: kanıt kapısı (kayıt yoksa boş dizi,
 * uydurma satır yok), `superseded` eleme, sessiz düşüş (ağ giderse ekran
 * boşalmaz) ve çip ile defterin AYNI bekleyen ödevi göstermesi.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const UID = 'odev-test-user';

/** config.js'in sb'sini kontrollü bir sorgu zinciriyle değiştirir.
 *  `sonuc` bir fonksiyondur: her çağrıda ne döneceğini test belirler
 *  (ikinci turda patlatmak, boş dönmek gibi). */
async function mockSb(sonuc) {
  vi.doMock('../js/config.js', async (importOriginal) => {
    const actual = await importOriginal();
    const zincir = () => {
      const z = {
        select: () => z, eq: () => z, order: () => z,
        limit: () => Promise.resolve(sonuc()),
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        single: () => Promise.resolve({ data: null, error: null }),
        then: (ok, hata) => Promise.resolve(sonuc()).then(ok, hata),
      };
      return z;
    };
    return { ...actual, sb: { from: () => zincir() } };
  });
}

/** Modül-private defteri sıfırlamak için her testte taze modül. */
async function freshModule(sonuc = () => ({ data: [], error: null })) {
  vi.resetModules();
  await mockSb(sonuc);
  const { S } = await import('../js/state.js');
  const mod = await import('../js/parts/09-reports-tracks.js');
  S.currentUser = { id: UID };
  return { S, mod };
}

const satir = (task, status, gunOnce = 0) => ({
  id: `hw_${task}`, task, status,
  created_at: new Date(Date.now() - gunOnce * 86400000).toISOString(),
});

beforeEach(() => { vi.doUnmock('../js/config.js'); });

describe('ödev defteri — kanıt kapısı', () => {
  it('kayıt yokken BOŞ döner — panel sayı basmaz, davet gösterir', async () => {
    const { mod } = await freshModule();
    expect(mod.getHomeworkHistory()).toEqual([]);
  });

  it('kullanıcı yokken ağa çıkmaz, boş defter döner', async () => {
    vi.resetModules();
    await mockSb(() => { throw new Error('ağa çıkılmamalıydı'); });
    const { S } = await import('../js/state.js');
    const mod = await import('../js/parts/09-reports-tracks.js');
    S.currentUser = null;
    await expect(mod.loadHomeworkHistory()).resolves.toEqual([]);
  });
});

describe('ödev defteri — neyi taşır, neyi elemez', () => {
  it('superseded satırlar deftere girmez (motorun üzerine yazdığı kayıt, kullanıcının sözü değil)', async () => {
    const { mod } = await freshModule(() => ({
      data: [
        satir('Bugün bir kişiye teşekkür et.', 'pending'),
        satir('Eski söz', 'superseded', 3),
        satir('Tutulmuş söz', 'done', 5),
      ], error: null,
    }));
    const defter = await mod.loadHomeworkHistory();
    expect(defter.map(h => h.task)).toEqual(['Bugün bir kişiye teşekkür et.', 'Tutulmuş söz']);
  });

  it('metni olmayan satır deftere girmez', async () => {
    const { mod } = await freshModule(() => ({
      data: [satir('', 'done'), { id: 'x', status: 'done' }, satir('Gerçek söz', 'done')],
      error: null,
    }));
    const defter = await mod.loadHomeworkHistory();
    expect(defter.map(h => h.task)).toEqual(['Gerçek söz']);
  });

  it('bekleyen ödevi de tazeler — çip ile defter aynı satırı gösterir', async () => {
    const { mod } = await freshModule(() => ({
      data: [satir('Bekleyen', 'pending'), satir('Bitmiş', 'done', 2)], error: null,
    }));
    await mod.loadHomeworkHistory();
    expect(mod.getActiveHomework()?.task).toBe('Bekleyen');
  });
});

describe('ödev defteri — sessiz düşüş', () => {
  it('sorgu patlarsa elimizdeki defter KALIR, ekran boşalmaz', async () => {
    let tur = 0;
    const { mod } = await freshModule(() => {
      tur++;
      if (tur === 1) return { data: [satir('İlk turda gelen', 'done')], error: null };
      throw new Error('ağ gitti');
    });
    await mod.loadHomeworkHistory();
    expect(mod.getHomeworkHistory().map(h => h.task)).toEqual(['İlk turda gelen']);
    // İkinci tur patlar — defter sıfırlanmamalı.
    await expect(mod.loadHomeworkHistory()).resolves.toEqual([
      expect.objectContaining({ task: 'İlk turda gelen' }),
    ]);
  });
});

describe('ödev defteri — kaydırma kilidi paylaşılan kaynaktır', () => {
  it('hwdKapat kendi paneli yokken body kilidine DOKUNMAZ', async () => {
    const { mod } = await freshModule();
    // Sahnede başka bir panel var ve kilidi o koymuş:
    document.body.style.overflow = 'hidden';
    mod.hwdKapat();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('kendi panelini kapatınca kilidi geri verir', async () => {
    const { mod } = await freshModule();
    mod.hwdAc();
    expect(document.getElementById('hwd-panel')).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
    mod.hwdKapat();
    expect(document.getElementById('hwd-panel')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });
});

describe('ödev defteri — Kullanım Nabzı segmenti (00f)', () => {
  it('açılış wtOverlayOpen, KAPANIŞ wtOverlayClose çağırır — segment açık kalmaz', async () => {
    const { mod } = await freshModule();
    const olay = [];
    window.wtOverlayOpen  = (n) => olay.push(['ac', n]);
    window.wtOverlayClose = (n) => olay.push(['kapat', n]);
    try {
      mod.hwdAc();
      mod.hwdKapat();
      expect(olay).toEqual([['ac', 'odev-defteri'], ['kapat', 'odev-defteri']]);
    } finally {
      delete window.wtOverlayOpen; delete window.wtOverlayClose;
    }
  });

  it('panel yokken kapanış segmenti KAPATMAZ — başkasının segmentini çalmaz', async () => {
    const { mod } = await freshModule();
    const olay = [];
    window.wtOverlayClose = (n) => olay.push(n);
    try {
      mod.hwdKapat();              // açık panel yok
      expect(olay).toEqual([]);
    } finally { delete window.wtOverlayClose; }
  });
});
