/**
 * Tests for js/parts/16c-i18n-detect-dict.js — DESEN SINIRI KAPISI.
 *
 * Duygu Motoru'nun (13D) ölçümü bu sözlükten çıkar: `dgNabiz` her ailenin
 * desenlerini metne uygular, en yüksek KUVVETLİ aday baskın olur. Bu yüzden
 * bir ailenin deseni başka bir ailenin kelimesinin İÇİNDE eşleşirse hata
 * sessiz değil, TERSİNE dönmüş bir okuma olur — üstelik kuvvet farkı
 * yüzünden çoğu zaman yanlış aile kazanır.
 *
 * Dikiş turunda (2026-08-30) ölçülen gerçek vaka: çıplak `/happy/i` deseni
 * "un**happy**" içinde eşleşiyordu; sevinç ailesinin kuvveti (3) kederinkini
 * (2) yendiği için "i'm unhappy" cümlesi **kutlama** karşılaması alıyor ve
 * kanıt olarak kullanıcının kendi "i'm unhappy" cümlesi gösteriliyordu.
 * TR tarafı bu dersi çoktan öğrenmişti (`(?<![a-zçğıöşü])mutlu` — "umutlu"
 * tuzağı, `huzur(?!suz)`, sınırlanmış `yeter`); EN tarafı öğrenmemişti.
 *
 * Bu dosya o dersi KAPIYA çevirir: kapısı olmayan kural zamanla tavsiyeye
 * döner (§6.6). Yeni bir dil bloğu eklendiğinde tuzak listesi büyütülür.
 */
import { describe, it, expect } from 'vitest';
import { DETECT_I18N } from '../js/parts/16c-i18n-detect-dict.js';

/** Bir ailenin desenlerinden herhangi biri metni tutuyor mu? */
const tutuyorMu = (dil, aile, metin) =>
  (DETECT_I18N[dil]['detect.duygu.' + aile] || []).some(r => r.test(metin));

/* Her satır: [dil, tutMAMAsı gereken aile, metin, neden].
   "Tutmalı" karşılıkları da yanında sınanır — sınır konurken kelimenin
   KENDİSİNİN kaybolmadığını kanıtlamak şart (aşırı daraltma da bir kırıktır). */
const TUZAKLAR = [
  ['en', 'sevinc',   "i'm unhappy",            'happy ⊂ unhappy — keder kutlamaya dönüyordu'],
  ['en', 'donukluk', 'i called the number',    'numb ⊂ number'],
  ['en', 'donukluk', 'there were many numbers', 'numb ⊂ numbers'],
  ['tr', 'sevinc',   'umutluyum',              'mutlu ⊂ umutlu'],
  ['tr', 'huzur',    'umutsuzum',              'huzur ⊂ huzursuz değil ama desen sızmamalı'],
  ['tr', 'ofke',     'kendimi yeterince iyi görmüyorum', 'yeter ⊂ yeterince'],
];

const TUTMALI = [
  ['en', 'sevinc',   "i'm happy today"],
  ['en', 'donukluk', 'i feel numb'],
  ['en', 'keder',    "i'm unhappy"],
  ['tr', 'sevinc',   'çok mutluyum'],
  ['tr', 'umut',     'umutluyum'],
  ['tr', 'ofke',     'artık yeter'],
];

describe('desen sınırı — bir ailenin deseni başka ailenin kelimesinde yaşamaz', () => {
  TUZAKLAR.forEach(([dil, aile, metin, neden]) => {
    it(`${dil}/${aile} "${metin}" tutMAMALI — ${neden}`, () => {
      expect(tutuyorMu(dil, aile, metin)).toBe(false);
    });
  });
});

describe('sınır kelimenin kendisini yutmadı (aşırı daraltma kontrolü)', () => {
  TUTMALI.forEach(([dil, aile, metin]) => {
    it(`${dil}/${aile} "${metin}" tutMALI`, () => {
      expect(tutuyorMu(dil, aile, metin)).toBe(true);
    });
  });
});

describe('iki dil de aynı on aileyi tanır (parite)', () => {
  it('tr ve en aynı detect.duygu.* anahtarlarını taşır', () => {
    const aileler = (dil) => Object.keys(DETECT_I18N[dil])
      .filter(k => k.startsWith('detect.duygu.')).sort();
    expect(aileler('en')).toEqual(aileler('tr'));
  });
});
