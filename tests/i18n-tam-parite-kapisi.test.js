/**
 * TR/EN TAM PARİTE KAPISI — "her yeni UI string iki sözlüğe de girer".
 *
 * Denetim B5 (2026-09-01): parite bugün kusursuzdu (3.520 = 3.520, iki yönde
 * sıfır boşluk) ama onu koruyan kapı YOKTU. `tests/15-i18n-aria.test.js`
 * yalnız `aria.*` önekini karşılaştırıyor, `tests/i18n-parity-kapisi.test.js` ise
 * DIŞ diller için yazılmış ve tr/en core dosyalarda yaşadığı için dürüstçe
 * "kapı boşta bekliyor" diyor. Yani 3.520 anahtarın kusursuz paritesi
 * tesadüfe emanetti: bir sonraki eklemede sessizce bozulabilirdi.
 *
 * Protokol §6.8: her yeni UI string TR+EN sözlüğe girer. Bu dosya o kuralı
 * kapıya çevirir — kural kapısız kalırsa zamanla tavsiyeye döner.
 */
import { describe, it, expect } from 'vitest';
import { I18N_CORE } from '../js/parts/15b-i18n-dict-core.js';
import { I18N_EN } from '../js/parts/15e-i18n-dict-en.js';

const trAnahtarlar = Object.keys(I18N_CORE.tr);
const enAnahtarlar = Object.keys(I18N_EN);

/* ─── Saf karşılaştırma mantığı — gerçek sözlükten ayrı, iki kez çağrılır ───
 * Bugüne dek TR/EN 3.520=3.520 olduğu için kapı hep yeşildi; mantığın
 * GERÇEKTEN bir kırığı yakalayabildiği hiç kanıtlanmamıştı (bkz.
 * .claude/plans/kapi-saglamlastirma.md FAZ 4c). Fonksiyonları sözlükten
 * ayırmak, aşağıdaki "kapının kendisi" bloğunun sentetik (eksik/tam)
 * sözlüklerle aynı mantığı sınamasını sağlar — gerçek sözlük karşılaştırması
 * (aşağıdaki ilk describe) davranışça değişmez, yalnız çağrı biçimi değişti. */
function eksikAnahtarlar(kaynakAnahtarlar, hedefKume) {
  return kaynakAnahtarlar.filter(k => !hedefKume.has(k));
}

function bosCeviriler(anahtarlar, sozluk) {
  return anahtarlar.filter(k => {
    const v = sozluk[k];
    return typeof v === 'string' && v.trim() === '';
  });
}

describe('i18n tam parite — TR ve EN sözlükleri aynı anahtar kümesini taşır', () => {
  it('EN sözlüğünde eksik anahtar yok', () => {
    const enKume = new Set(enAnahtarlar);
    const eksik = eksikAnahtarlar(trAnahtarlar, enKume);
    if (eksik.length) {
      throw new Error(
        `EN sözlüğünde ${eksik.length} anahtar eksik — yeni string eklerken ikisine birden yazılmalı:\n` +
        eksik.slice(0, 20).map(k => '  ' + k).join('\n') +
        (eksik.length > 20 ? `\n  … +${eksik.length - 20} tane daha` : '')
      );
    }
    expect(eksik).toEqual([]);
  });

  it('TR sözlüğünde karşılığı olmayan EN anahtarı yok', () => {
    const trKume = new Set(trAnahtarlar);
    const fazla = eksikAnahtarlar(enAnahtarlar, trKume);
    if (fazla.length) {
      throw new Error(
        `EN'de olup TR'de olmayan ${fazla.length} anahtar — ya TR'ye eklenmeli ya EN'den kaldırılmalı:\n` +
        fazla.slice(0, 20).map(k => '  ' + k).join('\n')
      );
    }
    expect(fazla).toEqual([]);
  });

  it('boş çeviri yok — anahtar var ama metin yoksa kullanıcı boşluk görür', () => {
    const bos = bosCeviriler(enAnahtarlar, I18N_EN);
    expect(bos).toEqual([]);
  });

  it('sözlükler boş değil — kapı gerçekten bir şey ölçüyor', () => {
    expect(trAnahtarlar.length).toBeGreaterThan(3000);
    expect(enAnahtarlar.length).toBe(trAnahtarlar.length);
  });
});

describe('i18n tam parite kapısı — kapının kendisi çalışıyor (sentetik sözlükler)', () => {
  it('eksik anahtarlı sentetik hedefte kırığı yakalar', () => {
    const kaynak = ['a', 'b', 'c'];
    const hedefKume = new Set(['a', 'c']); // 'b' hedefte yok
    expect(eksikAnahtarlar(kaynak, hedefKume)).toEqual(['b']);
  });

  it('tam sentetik hedefte kırık üretmez', () => {
    const kaynak = ['a', 'b', 'c'];
    const hedefKume = new Set(['a', 'b', 'c']);
    expect(eksikAnahtarlar(kaynak, hedefKume)).toEqual([]);
  });

  it('boş çevirili sentetik sözlükte kırığı yakalar', () => {
    const anahtarlar = ['x', 'y'];
    const sozluk = { x: 'değer', y: '   ' }; // yalnız boşluktan ibaret çeviri
    expect(bosCeviriler(anahtarlar, sozluk)).toEqual(['y']);
  });

  it('dolu sentetik sözlükte boş çeviri üretmez', () => {
    const anahtarlar = ['x', 'y'];
    const sozluk = { x: 'değer', y: 'diğer değer' };
    expect(bosCeviriler(anahtarlar, sozluk)).toEqual([]);
  });
});
