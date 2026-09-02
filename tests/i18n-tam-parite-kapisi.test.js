/**
 * TR/EN TAM PARİTE KAPISI — "her yeni UI string iki sözlüğe de girer".
 *
 * Denetim B5 (2026-09-01): parite bugün kusursuzdu (3.520 = 3.520, iki yönde
 * sıfır boşluk) ama onu koruyan kapı YOKTU. `tests/15-i18n-aria.test.js`
 * yalnız `aria.*` önekini karşılaştırıyor, `tests/i18n-parity.test.js` ise
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

describe('i18n tam parite — TR ve EN sözlükleri aynı anahtar kümesini taşır', () => {
  it('EN sözlüğünde eksik anahtar yok', () => {
    const enKume = new Set(enAnahtarlar);
    const eksik = trAnahtarlar.filter(k => !enKume.has(k));
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
    const fazla = enAnahtarlar.filter(k => !trKume.has(k));
    if (fazla.length) {
      throw new Error(
        `EN'de olup TR'de olmayan ${fazla.length} anahtar — ya TR'ye eklenmeli ya EN'den kaldırılmalı:\n` +
        fazla.slice(0, 20).map(k => '  ' + k).join('\n')
      );
    }
    expect(fazla).toEqual([]);
  });

  it('boş çeviri yok — anahtar var ama metin yoksa kullanıcı boşluk görür', () => {
    const bos = enAnahtarlar.filter(k => {
      const v = I18N_EN[k];
      return typeof v === 'string' && v.trim() === '';
    });
    expect(bos).toEqual([]);
  });

  it('sözlükler boş değil — kapı gerçekten bir şey ölçüyor', () => {
    expect(trAnahtarlar.length).toBeGreaterThan(3000);
    expect(enAnahtarlar.length).toBe(trAnahtarlar.length);
  });
});
