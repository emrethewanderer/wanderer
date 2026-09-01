/**
 * Boot dil çözümü: localStorage'ta etw_lang='en' iken initI18n (modül-load)
 * dili EN olarak çözmeli. Regresyon: 00a↔15 import çemberinde STORAGE_KEYS
 * TDZ'ye düşerse çözüm sessizce TR'ye sıkışıyordu.
 * Ayrı dosya: 15-i18n modülünün İLK değerlendirmesi bu localStorage
 * durumuyla olsun diye (vitest dosya başına taze modül grafiği kurar).
 */
import { describe, it, expect } from 'vitest';

localStorage.setItem('etw_lang', 'en');
const { getCurrentLanguage, langBeyanVar } = await import('../js/parts/15-i18n.js');

describe('initI18n — EN boot', () => {
  it("localStorage etw_lang='en' iken dil EN çözülür", () => {
    expect(getCurrentLanguage()).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  /* Beyan varken kapı AÇILMAZ — "tekrar değiştirene kadar sorulmasın"
     kuralının kapısı budur. */
  it('beyan varken dil kapısı açılmaz', () => {
    expect(langBeyanVar()).toBe(true);
    expect(document.getElementById('lang-gate-overlay')).toBeNull();
  });
});
