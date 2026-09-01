/**
 * DUYGU MOTORU — ŞEFFAFLIK (13D, FAZ 11)
 *
 * İki şey kilitlenir:
 * 1. `dgBeyan*` üçlüsü — "beni yanlış okudun" jestinin YAZAN/OKUYAN/GERİ
 *    ALAN tarafı. Mekanizma (`iklim.beyan[eksen]='sus'`) FAZ 4'ten beri
 *    vardı ve `dgKarsilama` onu zaten okuyordu; burada yalnız dışa açık
 *    yazma/okuma yüzeyi test edilir — süresiz AMA geri alınabilir (09i
 *    secBeyanAzalt/GeriAl emsali, sessiz zaman aşımı YOK).
 * 2. `_dgGerekceYaz`nin i18n göçü — `dgKarsilama().gerekce` artık `p()`
 *    anahtarından okunur, TR+EN parite var ve mevcut `/susturul/i`
 *    sözleşmesi (13D-karsilama-tablosu.test.js) hâlâ tutar.
 *
 * Kırmızıya dönerlerse .claude/plans/duygu-motoru.md § FAZ 11'e bak.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { S } from '../js/state.js';
import {
  dgKarsilama,
  dgBeyanVar,
  dgBeyanSustur,
  dgBeyanGeriAl,
} from '../js/parts/13D-duygu-motoru.js';
import { ensurePromptLang } from '../js/parts/16-i18n-prompts.js';
// EN core bundle'da yok (sidecar, bundle diyeti) — 16d-emre-sesi.test.js
// emsali: p() dil sözlüğünü SENKRON okur, testte ensurePromptLang('en')
// açıkça await edilmeden EN metni GELMEZ (TR fallback'e düşer).
import { PROMPT_I18N_EN } from '../js/parts/16e-i18n-prompt-dict-en.js';

const _oncekiDetectCrisis = window.detectCrisis;
beforeEach(() => { window.detectCrisis = () => false; });
afterEach(() => { window.detectCrisis = _oncekiDetectCrisis; });

describe('window kontratı', () => {
  it('window.dgBeyanVar / dgBeyanSustur / dgBeyanGeriAl fonksiyon', () => {
    expect(typeof window.dgBeyanVar).toBe('function');
    expect(typeof window.dgBeyanSustur).toBe('function');
    expect(typeof window.dgBeyanGeriAl).toBe('function');
  });
});

describe('dgBeyanVar — okuma', () => {
  it('beyan alanı boşken false', () => {
    expect(dgBeyanVar({ beyan: {} }, 'diriltme')).toBe(false);
  });
  it('iklim null/undefined iken false (savunmacı — bloklamaz)', () => {
    expect(dgBeyanVar(null, 'diriltme')).toBe(false);
    expect(dgBeyanVar(undefined, 'diriltme')).toBe(false);
  });
  it('beyan[eksen]==="sus" iken true', () => {
    expect(dgBeyanVar({ beyan: { diriltme: 'sus' } }, 'diriltme')).toBe(true);
  });
  it('başka bir eksenin susturulması bu ekseni etkilemez', () => {
    expect(dgBeyanVar({ beyan: { kutlama: 'sus' } }, 'diriltme')).toBe(false);
  });
});

describe('dgBeyanSustur — saf yazma', () => {
  it('yeni bir kopya döner, orijinali MUTASYONA UĞRATMAZ', () => {
    const eski = { beyan: {}, taban: { n: 0, kova: [] } };
    const yeni = dgBeyanSustur(eski, 'kutlama');
    expect(eski.beyan).toEqual({}); // orijinal el değmemiş
    expect(yeni.beyan).toEqual({ kutlama: 'sus' });
    expect(yeni.taban).toBe(eski.taban); // dokunulmayan alanlar aynı referans
  });
  it('iklim/eksen yoksa iklim aynen döner (savunmacı)', () => {
    const iklim = { beyan: {} };
    expect(dgBeyanSustur(null, 'kutlama')).toBe(null);
    expect(dgBeyanSustur(iklim, null)).toBe(iklim);
  });
  it('var olan bir beyanı EZER (tekrar sustur → yine sus)', () => {
    const yeni = dgBeyanSustur({ beyan: { kutlama: 'sus' } }, 'kutlama');
    expect(yeni.beyan.kutlama).toBe('sus');
  });
});

describe('dgBeyanGeriAl — süresiz AMA geri alınabilir', () => {
  it('susturulmuş ekseni siler — sessiz zaman aşımı YOK, yalnız EL YAZMASI kaldırır', () => {
    const susmus = { beyan: { diriltme: 'sus', kutlama: 'sus' } };
    const geri = dgBeyanGeriAl(susmus, 'diriltme');
    expect(geri.beyan).toEqual({ kutlama: 'sus' });
    expect(susmus.beyan).toEqual({ diriltme: 'sus', kutlama: 'sus' }); // orijinal dokunulmadı
  });
  it('susturulmamış bir ekseni geri almak no-op (aynı referans)', () => {
    const iklim = { beyan: {} };
    expect(dgBeyanGeriAl(iklim, 'diriltme')).toBe(iklim);
  });
  it('iklim/eksen yoksa savunmacı düşer', () => {
    expect(dgBeyanGeriAl(null, 'diriltme')).toBe(null);
    const iklim = { beyan: { diriltme: 'sus' } };
    expect(dgBeyanGeriAl(iklim, null)).toBe(iklim);
  });
});

describe('uçtan uca — dgBeyanSustur yazdığını dgKarsilama gerçekten okur', () => {
  // K6 asimetrisi: donukluk + izin YOKSA zaten tanıklık verir (kural 5,
  // ikincil atanmaz — düzeltilecek bir şey yok). O yüzden burada "izinli"
  // bir eksen kurup SONRA beyanla kapatıyoruz — takas GÖRÜNÜR olsun diye.
  function _izinliDefter() {
    return { diriltme: { n: 5, toplam: 5 } }; // ortalama +1 → izin VAR
  }

  it('sustur → dgKarsilama secilen=taniklik, ikincil=orijinal eksen döner', () => {
    const susturulmamis = { beyan: {}, defter: _izinliDefter() };
    const nabiz = { deger: -1, kuvvet: 1, kuvvetMutlak: 1, yon: null,
      adaylar: [{ aile: 'donukluk', guc: 1, kanit: 'boşluk hissediyorum' }],
      kanitSayisi: 1, kaynak: 'olcum' };
    const acik = dgKarsilama('boşluk hissediyorum', nabiz, susturulmamis, null);
    expect(acik.eksen).toBe('diriltme'); // beyan yokken izin var → gerçekten diriltme

    const susturulmus = dgBeyanSustur(susturulmamis, 'diriltme');
    const kapali = dgKarsilama('boşluk hissediyorum', nabiz, susturulmus, null);
    expect(kapali.eksen).toBe('taniklik');
    expect(kapali.ikincil).toBe('diriltme');
    expect(kapali.gerekce).toMatch(/susturul/i); // mevcut sözleşme (13D-karsilama-tablosu) korunuyor

    const geriAlinmis = dgBeyanGeriAl(susturulmus, 'diriltme');
    const yenidenAcik = dgKarsilama('boşluk hissediyorum', nabiz, geriAlinmis, null);
    expect(yenidenAcik.eksen).toBe('diriltme'); // geri alınca eski davranış AYNEN döner
  });
});

describe('gerekçe i18n (FAZ 11) — TR+EN parite, sözleşme korunuyor', () => {
  const oncekiLang = S._currentLang;
  afterEach(() => { S._currentLang = oncekiLang; });

  function _nabizSahiplenme() {
    return { deger: -2, kuvvet: 3, kuvvetMutlak: 3, yon: null,
      adaylar: [{ aile: 'utanc_suclu', guc: 3, kanit: 'çok utanıyorum' }],
      kanitSayisi: 1, kaynak: 'olcum' };
  }

  it('TR: kural 3 (sahiplenme) gerekçesi eski Türkçe metinle AYNI', () => {
    S._currentLang = 'tr';
    const r = dgKarsilama('çok utanıyorum', _nabizSahiplenme(), { beyan: {}, defter: {} }, null);
    expect(r.eksen).toBe('sahiplenme');
    expect(r.gerekce).toBe('Baskın aile utanç/suçluluk — hakkı teslim edilir.');
  });

  it('EN: aynı karar için gerekçe İngilizce, TR metinden FARKLI (dil-duyarlı)', async () => {
    S._currentLang = 'en';
    await ensurePromptLang('en'); // 16d-emre-sesi.test.js emsali — sidecar'ı senkronlar
    const r = dgKarsilama('çok utanıyorum', _nabizSahiplenme(), { beyan: {}, defter: {} }, null);
    expect(r.eksen).toBe('sahiplenme');
    expect(r.gerekce).toBe(PROMPT_I18N_EN['prompt.dg.gerekce.3']);
    expect(r.gerekce).not.toBe('Baskın aile utanç/suçluluk — hakkı teslim edilir.');
  });

  it('gerekce her zaman ÇÖZÜLMÜŞ metindir — çözülemeyen bir i18n anahtarı (prompt.dg.gerekce.…) DEĞİL', () => {
    S._currentLang = 'tr';
    const r = dgKarsilama('çok utanıyorum', _nabizSahiplenme(), { beyan: {}, defter: {} }, null);
    expect(r.gerekce.startsWith('prompt.')).toBe(false);
  });
});
