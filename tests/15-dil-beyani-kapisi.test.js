/**
 * DİL BEYANI KAPISI — "tahmin boyar, beyan kalır"
 *
 * Emre'nin şikâyeti (2026-08-19): *"Dilin EN görünüyor."* Kök, dilin hiç
 * SORULMAMIŞ olmasıydı: `navigator.language` her açılışta yeniden tahmin
 * ediliyordu ve bu tahmin hiçbir yere yazılmıyordu — yani kullanıcının
 * seçimi diye bir şey yoktu, her boot cihaza soruyordu.
 *
 * Kural (§6.10): cihazın dili kullanıcı hakkında bir KANIT değildir. Tahmin
 * yalnız ilk boyamayı yapar ve ASLA kaydedilmez; kalıcı olan tek şey
 * kullanıcının beyanıdır. Beyan bir kez alınır, kullanıcı değiştirene kadar
 * hiçbir şey ezmez.
 *
 * YERİ (Emre'nin kararı, 2026-08-19 ikinci tur): kapı boot'ta değil,
 * ONBOARDING'in ilk adımında açılır — soru yeni üye olana sorulur.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

localStorage.removeItem('etw_lang');
const { getCurrentLanguage, langBeyanVar, openLangGate } = await import('../js/parts/15-i18n.js');
/* Ölçüm import ANINDA alınır: tests/setup.js'in beforeEach'i her testten önce
   test dilini ('tr') geri yazar. Sorulan soru "initI18n tahmini kaydetti mi"
   — cevabı yalnız burada okunabilir. */
const _beyanImportSonrasi = localStorage.getItem('etw_lang');

describe('Dil beyanı — tahmin kaydedilmez', () => {
  it('boot tarayıcı tahminini beyana çevirmez', () => {
    expect(_beyanImportSonrasi).toBeFalsy();
    expect(getCurrentLanguage()).toBe('en');   // tahmin BOYADI (jsdom navigator en-US)
  });

  it('boot kapıyı KENDİLİĞİNDEN açmaz — kapının yeri onboarding', () => {
    expect(document.getElementById('lang-gate-overlay')).toBeNull();
  });
});

describe('Dil beyanı kapısı', () => {
  beforeEach(() => {
    document.getElementById('lang-gate-overlay')?.remove();
    localStorage.removeItem('etw_lang');
  });

  it('açılınca iki dilde sorar ve seçenekleri kendi dillerinde yazar', () => {
    openLangGate();
    const modal = document.getElementById('lang-gate-modal');
    expect(modal).toBeTruthy();
    expect(modal.textContent).toContain('Hangi dilde');
    expect(modal.textContent).toContain('Which language');
    const btns = [...document.querySelectorAll('.lang-gate-btn')];
    expect(btns.length).toBeGreaterThanOrEqual(2);
    expect(btns.map(b => b.dataset.lang)).toContain('tr');
    expect(btns.map(b => b.dataset.lang)).toContain('en');
  });

  it('ayarlardan değiştirilebileceğini söyler', () => {
    openLangGate();
    const foot = document.getElementById('lang-gate-foot').textContent;
    expect(foot).toContain('ayarlardan');
    expect(foot).toContain('settings');
  });

  it('seçim beyanı yazar, dili uygular, kapıyı kapatır ve akışı sürdürür', () => {
    const devam = vi.fn();
    openLangGate({ onSecim: devam });
    document.querySelector('.lang-gate-btn[data-lang="en"]').click();
    expect(localStorage.getItem('etw_lang')).toBe('en');
    expect(langBeyanVar()).toBe(true);
    expect(getCurrentLanguage()).toBe('en');
    expect(document.getElementById('lang-gate-overlay').classList.contains('open')).toBe(false);
    expect(devam).toHaveBeenCalledWith('en');   // onboarding beyandan SONRA başlar
  });
});
