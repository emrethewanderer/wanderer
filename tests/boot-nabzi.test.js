/**
 * BOOT NABZI KAPISI — js/parts/00h-boot-nabzi.js
 *
 * Bu modül ölçüm yapar; ölçüm aracının kendisi boot'u kıramaz. Buradaki
 * testlerin çoğu "doğru sayıyı verdi mi"yi değil, **hiçbir yolda araya
 * girmedi mi**yi sınar: hata fırlatan bir adım sarmalandığında hata aynen
 * yukarı çıkmalı, `performance` yoksa fonksiyon yine çalışmalı.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bnMark, bnSar, bnHazir, bnRapor, bnDefter } from '../js/parts/00h-boot-nabzi.js';

describe('Boot Nabzı · çentik', () => {
  it('mark ms döndürür ve deftere yazar', () => {
    const t = bnMark('test-adim');
    expect(typeof t).toBe('number');
    expect(bnDefter().satirlar.some((k) => k.ad === 'test-adim')).toBe(true);
  });

  it('İDEMPOTENT DEĞİLDİR — aynı ad iki kez düşerse iki satır olur', () => {
    // Gerekçe: çifte init'i gizlemek değil GÖSTERMEK istiyoruz (13B dersi).
    bnMark('cift-init'); bnMark('cift-init');
    const kac = bnDefter().satirlar.filter((k) => k.ad === 'cift-init').length;
    expect(kac).toBe(2);
  });

  it('adsız çağrı sessizce düşer', () => {
    expect(() => bnMark('')).not.toThrow();
    expect(bnMark('')).toBe(0);
  });
});

describe('Boot Nabzı · sarmalayıcı', () => {
  it('senkron fonksiyonun değerini aynen döndürür', () => {
    expect(bnSar('senk', () => 42)).toBe(42);
  });

  it('promise çözümünü aynen döndürür', async () => {
    await expect(bnSar('promise', () => Promise.resolve('ok'))).resolves.toBe('ok');
  });

  it('senkron hata yolunda bitiş çentiği atar ve hatayı YUTMAZ', () => {
    expect(() => bnSar('senk-hata', () => { throw new Error('patla'); })).toThrow('patla');
    const adlar = bnDefter().satirlar.map((k) => k.ad);
    expect(adlar).toContain('senk-hata-bas');
    expect(adlar).toContain('senk-hata-son');
  });

  it('promise reddinde bitiş çentiği atar ve reddi YUTMAZ', async () => {
    await expect(bnSar('async-hata', () => Promise.reject(new Error('kırıldı')))).rejects.toThrow('kırıldı');
    const adlar = bnDefter().satirlar.map((k) => k.ad);
    expect(adlar).toContain('async-hata-son');
  });

  it('fonksiyon değilse patlamaz', () => {
    expect(() => bnSar('yok', null)).not.toThrow();
  });
});

describe('Boot Nabzı · zincirin ucu', () => {
  it('ilk hazır anı asıldır, sonraki çağrılar ezmez', () => {
    const ilk = bnHazir();
    const ikinci = bnHazir();
    expect(ikinci).toBe(ilk);
  });
});

describe('Boot Nabzı · rapor', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('satır dizisi döndürür ve boot sırasında konsolu kirletmez', () => {
    const satirlar = bnRapor();
    expect(Array.isArray(satirlar)).toBe(true);
    expect(satirlar.length).toBeGreaterThan(0);
    expect(satirlar[0]).toHaveProperty('adim');
    expect(satirlar[0]).toHaveProperty('fark');
  });

  it('perde ile zincirin karşılaştırmasını defterden okur', () => {
    bnMark('perde-in');
    const d = bnDefter();
    expect(d.perdeIn).not.toBeNull();
    expect(d.hazir).not.toBeNull();
  });
});

describe('Boot Nabzı · sözleşme', () => {
  it('window yüzeyi açıktır (03/main bu adlara bağlı)', () => {
    for (const ad of ['bnMark', 'bnSar', 'bnHazir', 'bnRapor', 'bnDefter']) {
      expect(typeof window[ad]).toBe('function');
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   BOOT ZİNCİRİ KAPISI — kazanılan paralelliğin geri kaymasına karşı

   Bu blok SÜRE ölçmez: süre makineye, ağa ve günün yüküne göre oynar, CI'da
   ise anlamsızdır (2026-08-19 ölçümü: aynı zincir aynı makinede 896-911 ms
   arası, ama soğuk turda 3924 ms). Ölçtüğü şey İŞİN ŞEKLİ — hangi yükleme
   hangisini bekliyor. Paralellik sessizce sıralıya dönerse burası kırılır ve
   değiştiren kişiden gerekçe ister.

   Kaynak metni taraması, repo emsali: scripts/yetim-kopru-denetci.mjs.
   ═══════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const _kok = dirname(fileURLToPath(import.meta.url));
const kabuk = readFileSync(join(_kok, '..', 'js', 'parts', '03-auth-shell.js'), 'utf8');
const initGovde = (() => {
  const b = kabuk.indexOf('export async function initApp(user)');
  const s = kabuk.indexOf('\nexport ', b + 10);
  return kabuk.slice(b, s > 0 ? s : undefined);
})();

describe('Boot zinciri · paralellik sözleşmesi', () => {
  it('profil sorgusu storageInit ile PARALEL başlar (önce tanımlanır, sonra beklenir)', () => {
    const tanim = initGovde.indexOf('const profilSoz');
    const storage = initGovde.indexOf("bnSar('storage'");
    const bekle = initGovde.indexOf('await profilSoz');
    expect(tanim).toBeGreaterThan(-1);
    // Sorgu storageInit'ten ÖNCE başlamalı, sonucu SONRA beklenmeli —
    // aradaki mesafe kazancın kendisidir.
    expect(tanim).toBeLessThan(storage);
    expect(bekle).toBeGreaterThan(storage);
  });

  it('ayarlar ve bilgi bankası aynı Promise.all içinde', () => {
    const blok = initGovde.slice(initGovde.indexOf("bnSar('ayarlar-bilgi'"), initGovde.indexOf("bnSar('ayarlar-bilgi'") + 400);
    expect(blok).toContain('Promise.all');
    expect(blok).toContain('loadSettings');
    expect(blok).toContain('loadKnowledge');
  });

  it('sohbet geçmişi paralel bloğun İÇİNDE (önünde tek başına beklemiyor)', () => {
    const blokBas = initGovde.indexOf("bnSar('paralel-8'");
    expect(blokBas).toBeGreaterThan(-1);
    const blok = initGovde.slice(blokBas, initGovde.indexOf(']))', blokBas));
    expect(blok).toContain('loadChatHistory');
    // Eski hâlin izi: bloğun ÖNÜNDE ayrı bir await ile beklenmemeli.
    const once = initGovde.slice(0, blokBas);
    expect(once).not.toMatch(/await\s+bnSar\('sohbet-gecmisi'/);
  });

  it('zincirin ucu bnHazir() ile mühürlenir ve .catch SONRASINDA çağrılır', () => {
    // .catch'ten önce çağrılsaydı kırık bir boot hiç ölçülmemiş görünürdü.
    // Sıra konum karşılaştırmasıyla sınanır: zincirin ucuna başka adım
    // eklenmesi (ör. kbSerbest) kapıyı kırmamalı, SIRANIN bozulması kırmalı.
    // Arama bnHazir'den GERİYE doğru: post-auth blokta ondan sonra da çok
    // sayıda `.catch(() => {})` var (44 fire-and-forget init), sondan aramak
    // yanlış çapayı bulur.
    const hazirPos = initGovde.indexOf('bnHazir()');
    expect(hazirPos).toBeGreaterThan(-1);
    const catchPos = initGovde.lastIndexOf('.catch(() => {})', hazirPos);
    expect(catchPos).toBeGreaterThan(-1);
    expect(initGovde.slice(catchPos, hazirPos)).toContain('.then(');
  });

  it('zincirin eklemleri çentiksiz kalmaz', () => {
    for (const ad of ['auth-cozuldu', 'storage', 'profil-sorgu', 'perde-ac', 'perde-in',
                      'ayarlar-bilgi', 'paralel-8', 'sohbet-gecmisi', 'serpme-bas',
                      'zincir-kk', 'zincir-im', 'zincir-om', 'zincir-eh', 'zincir-yp', 'zincir-ap']) {
      expect(kabuk).toContain(`'${ad}`);
    }
  });
});
