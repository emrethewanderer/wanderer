/**
 * DUYGU MOTORU — EHLİYET (13D §9, FAZ 14, K11)
 *
 * `dgIsabet*` motorun kendi ölçülmüş isabet oranını tutar: günün ÖLÇÜLEN
 * değeri (nabzın `deger`i) kullanıcının kapanış töreninde BEYAN ettiği
 * skoru (mood_history, 1-10) yön olarak doğruluyor mu. `dgIklimTaze`
 * dağılım kaymasını görür — `_dgGoreliKuvvet`in İÇİNDE zaten hesaplanan
 * AYNI eşiği (n>=20) dışarı açar, yeni bir kayma hesabı YAZMAZ.
 *
 * Kırmızıya dönerlerse .claude/plans/duygu-motoru.md § FAZ 14'e bak.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  dgNabiz,
  dgKapi,
  dgIklimTaze,
  dgIsabetGuncelle,
  dgIsabetGoster,
  dgIsabetYeterli,
  dgLehceDuzelt,
  dgLehceUnut,
} from '../js/parts/13D-duygu-motoru.js';

const _oncekiDetectCrisis = window.detectCrisis;
beforeEach(() => { window.detectCrisis = () => false; });
afterEach(() => { window.detectCrisis = _oncekiDetectCrisis; });

describe('window kontratı', () => {
  it('§9 fonksiyonlarının hepsi window\'da', () => {
    expect(typeof window.dgIklimTaze).toBe('function');
    expect(typeof window.dgIsabetGuncelle).toBe('function');
    expect(typeof window.dgIsabetGoster).toBe('function');
    expect(typeof window.dgIsabetYeterli).toBe('function');
    expect(typeof window.dgLehceDuzelt).toBe('function');
    expect(typeof window.dgLehceUnut).toBe('function');
  });
});

describe('dgIklimTaze — dağılım kayması (K11)', () => {
  it('iklim yoksa ya da taban boşsa taze DEĞİL', () => {
    expect(dgIklimTaze(null)).toBe(false);
    expect(dgIklimTaze({ taban: { n: 0, kova: [] } })).toBe(false);
  });
  it('19 gözlem — hâlâ yetersiz (_dgGoreliKuvvet ile AYNI eşik)', () => {
    expect(dgIklimTaze({ taban: { kova: Array(19).fill(2) } })).toBe(false);
  });
  it('20 gözlem — taze', () => {
    expect(dgIklimTaze({ taban: { kova: Array(20).fill(2) } })).toBe(true);
  });
});

describe('dgIsabetGuncelle — günün ölçümü ↔ beyan skoru (K11)', () => {
  const bos = () => ({ isabet: { n: 0, uyum: null, son: null } });

  it('geçersiz girdide değişmeden döner (§6.10 — kanıtsız yazılmaz)', () => {
    expect(dgIsabetGuncelle(null, 8, 8)).toBeNull();
    const ik = bos();
    expect(dgIsabetGuncelle(ik, null, 8)).toBe(ik);
    expect(dgIsabetGuncelle(ik, 8, null)).toBe(ik);
    expect(dgIsabetGuncelle(ik, NaN, 8)).toBe(ik);
  });

  it('orta noktada (deger=0 ya da beyan=5.5) yön belirsizdir — sayılmaz', () => {
    const ik = bos();
    expect(dgIsabetGuncelle(ik, 0, 8)).toBe(ik);
    expect(dgIsabetGuncelle(ik, 1, 5.5)).toBe(ik);
  });

  it('ikisi de OLUMLU yön gösterirse TUTTU — n:1, uyum:1', () => {
    const ik = dgIsabetGuncelle(bos(), 1.5, 8);
    expect(ik.isabet).toEqual({ n: 1, uyum: 1, son: { olculenDeger: 1.5, beyanSkoru: 8, tuttu: true, tarih: expect.any(String) } });
  });

  it('ölçüm olumlu ama beyan olumsuzsa TUTMADI — uyum:0', () => {
    const ik = dgIsabetGuncelle(bos(), 1.5, 2);
    expect(ik.isabet.n).toBe(1);
    expect(ik.isabet.uyum).toBe(0);
    expect(ik.isabet.son.tuttu).toBe(false);
  });

  it('koşan ortalama birikir — üç tuttu bir tutmadı → uyum 0.75', () => {
    let ik = bos();
    ik = dgIsabetGuncelle(ik, 1, 8);   // tuttu
    ik = dgIsabetGuncelle(ik, -1, 2);  // tuttu (ikisi de olumsuz)
    ik = dgIsabetGuncelle(ik, 1, 8);   // tuttu
    ik = dgIsabetGuncelle(ik, 1, 2);   // tutmadı
    expect(ik.isabet.n).toBe(4);
    expect(ik.isabet.uyum).toBeCloseTo(0.75, 5);
  });
});

describe('dgIsabetGoster — köken kapılı gösterim (kokenOlc, item 4)', () => {
  it('n < 7 iken sayı GÖSTERİLMEZ (v:null, kaynak:yok)', () => {
    const g = dgIsabetGoster({ n: 3, uyum: 0.9 });
    expect(g.v).toBeNull();
    expect(g.kaynak).toBe('yok');
    expect(g.n).toBe(3); // n her hâlükârda görünür kalır
  });
  it('n >= 7 iken değer görünür', () => {
    const g = dgIsabetGoster({ n: 9, uyum: 0.7 });
    expect(g.v).toBe(0.7);
    expect(g.kaynak).toBe('olcum');
  });
});

describe('dgIsabetYeterli — pahalı yüzey ehliyeti (K11)', () => {
  const tazeTaban = () => ({ kova: Array(24).fill(2) });

  it('taban kaymışsa/yetersizse (dgIklimTaze false) isabet ne olursa olsun kapalı', () => {
    const iklim = { taban: { kova: Array(5).fill(2) }, isabet: { n: 20, uyum: 0.9 } };
    expect(dgIsabetYeterli(iklim)).toBe(false);
  });

  it('n < 7 iken kapalı (isabet.n = 3 örneği, doğrulama maddesi 14)', () => {
    const iklim = { taban: tazeTaban(), isabet: { n: 3, uyum: 0.9 } };
    expect(dgIsabetYeterli(iklim)).toBe(false);
  });

  it('n yeterli ama uyum düşükse kapalı — "uyum düşerse yüzeyler geri kapanır"', () => {
    const iklim = { taban: tazeTaban(), isabet: { n: 9, uyum: 0.4 } };
    expect(dgIsabetYeterli(iklim)).toBe(false);
  });

  it('n=9 + uyum yeterli + taban taze → açık (doğrulama maddesi 14)', () => {
    const iklim = { taban: tazeTaban(), isabet: { n: 9, uyum: 0.8 } };
    expect(dgIsabetYeterli(iklim)).toBe(true);
  });

  it('iklim/isabet yoksa güvenli kapalı', () => {
    expect(dgIsabetYeterli(null)).toBe(false);
    expect(dgIsabetYeterli({ taban: tazeTaban() })).toBe(false);
  });

  it('ŞANS DÜZEYİ eşiği geçemez: n=7 uyum=0.71 (7\'de 5) kapalı kalır (faz denetimi)', () => {
    // `uyum` bir YÖN ikilisinin isabet oranıdır — şans düzeyi 0.5. Eşik 0.6
    // olsaydı "7'de 5" geçerdi ve yazı-tura bir motor bu kapıdan %23
    // olasılıkla geçerdi (P(X>=5 | p=0.5) = 29/128). Açtığı yüzeyler geri
    // alınamaz (seçici sıralaması, bildirim) — kapı gürültü olamaz.
    const iklim = { taban: tazeTaban(), isabet: { n: 7, uyum: 5 / 7 } };
    expect(dgIsabetYeterli(iklim)).toBe(false);
  });

  it('n=7 uyum=0.86 (7\'de 6) açılır — eşik ulaşılabilir, imkânsız değil', () => {
    const iklim = { taban: tazeTaban(), isabet: { n: 7, uyum: 6 / 7 } };
    expect(dgIsabetYeterli(iklim)).toBe(true);
  });
});

describe('dgKapi("secici"/"push") — ehliyet dikiş yeri KAPANDI (doğrulama maddesi 14)', () => {
  const NABIZ_KIZGIN = () => dgNabiz('çok kızgınım!');
  const tazeTaban = () => ({ kova: Array(24).fill(2) });

  it('isabet.n = 3 iken seçici ağırlığı 0 (ctx.ehliyetVar verilmeden)', () => {
    const iklim = { taban: tazeTaban(), isabet: { n: 3, uyum: 0.9 } };
    const r = dgKapi('secici', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), oncekiNabiz: NABIZ_KIZGIN(), iklim,
    });
    expect(r).toBeNull();
  });

  it('n = 9 + uyum yeterli + taban taze olunca doğar', () => {
    const iklim = { taban: tazeTaban(), isabet: { n: 9, uyum: 0.8 } };
    const r = dgKapi('secici', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), oncekiNabiz: NABIZ_KIZGIN(), iklim,
    });
    expect(r).not.toBeNull();
  });

  it('kaymada (dgIklimTaze false) n/uyum iyi olsa bile yeniden 0\'a düşer', () => {
    const iklim = { taban: { kova: Array(5).fill(2) }, isabet: { n: 9, uyum: 0.9 } };
    const r = dgKapi('secici', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), oncekiNabiz: NABIZ_KIZGIN(), iklim,
    });
    expect(r).toBeNull();
  });

  it('ctx.ehliyetVar AÇIKÇA verilirse türetmenin YERİNE geçer (FAZ 13 geriye uyum)', () => {
    // iklim hiç yok / yetersiz ama ehliyetVar:true zorluyor.
    const r = dgKapi('secici', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), oncekiNabiz: NABIZ_KIZGIN(), ehliyetVar: true,
    });
    expect(r).not.toBeNull();
  });

  it('push — BEYAN + taze ehliyet + tazelik penceresi birlikte açar', () => {
    const iklim = { taban: tazeTaban(), isabet: { n: 12, uyum: 0.75 } };
    const simdi = Date.now();
    const r = dgKapi('push', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), beyanKaniti: true, iklim,
      zaman: simdi - 10 * 60 * 1000, simdi,
    });
    expect(r).not.toBeNull();
  });

  it('push — ehliyet yoksa BEYAN + tazelik olsa bile null', () => {
    const iklim = { taban: tazeTaban(), isabet: { n: 2, uyum: 0.9 } };
    const simdi = Date.now();
    const r = dgKapi('push', {
      metin: 'çok kızgınım!', nabiz: NABIZ_KIZGIN(), beyanKaniti: true, iklim,
      zaman: simdi - 10 * 60 * 1000, simdi,
    });
    expect(r).toBeNull();
  });
});

describe('dgLehceDuzelt / dgLehceUnut — beyanla düzeltilen kelime (K1, FAZ 14)', () => {
  const bos = () => ({ lehce: {} });

  it('geçerli düzeltme lehçeye yazılır (küçük harfe TR-duyarlı çevrilir)', () => {
    const ik = dgLehceDuzelt(bos(), 'ÜZGÜN', 'donukluk');
    expect(ik.lehce['üzgün']).toBe('donukluk');
  });

  it('bilinmeyen aile reddedilir — taksonomi burada İCAT EDİLMEZ', () => {
    const ik = bos();
    expect(dgLehceDuzelt(ik, 'üzgün', 'uydurma-aile')).toBe(ik);
  });

  it('geçersiz girdi (iklim/kelime/aile eksik) değişmeden döner', () => {
    expect(dgLehceDuzelt(null, 'x', 'keder')).toBeNull();
    const ik = bos();
    expect(dgLehceDuzelt(ik, '', 'keder')).toBe(ik);
    expect(dgLehceDuzelt(ik, 'x', '')).toBe(ik);
  });

  it('dgLehceUnut anahtarı SİLER, "yok" değeriyle değiştirmez', () => {
    let ik = dgLehceDuzelt(bos(), 'üzgün', 'donukluk');
    ik = dgLehceUnut(ik, 'üzgün');
    expect('üzgün' in ik.lehce).toBe(false);
  });

  it('olmayan bir düzeltmeyi unutmak İklim\'i değiştirmez', () => {
    const ik = bos();
    expect(dgLehceUnut(ik, 'hiç-yok')).toBe(ik);
  });

  it('dgNabiz lehçe düzeltmesini OKUR — kelime artık düzeltilmiş aileye düşer', () => {
    // "üzgün" taksonomide `keder`dir; bu kullanıcı için `donukluk`a taşınmış olsun.
    const dumduzIklim = dgLehceDuzelt({ taban: { n: 0, kova: [] }, lehce: {} }, 'üzgün', 'donukluk');
    const r = dgNabiz('çok üzgünüm', { iklim: dumduzIklim });
    expect(r.adaylar.some(a => a.aile === 'donukluk')).toBe(true);
  });
});

/* ─── ÖLÇEK SÖZLEŞMESİ — faz denetimi, 2026-08-29 ─────────────────────────
   FAZ 10 denetimi "öğrenme defteri iki farklı ölçekten besleniyordu" diye
   bir kırık bulmuştu; FAZ 14'te AYNI SINIF tekrarladı. `dgIsabetGunuKapat`
   ölçülen `deger`i (−2..+2) 1..10'a çevirip geçiriyordu, oysa
   `dgIsabetGuncelle` ölçülen tarafın orta noktasını 0 kabul eder. Çevrilmiş
   bir skor DAİMA > 0 olduğu için ölçümün yönü her gün "iyi" okunuyordu:
   sınama motorun isabetini değil, yalnız kullanıcının 5.5 üstü verip
   vermediğini sayardı — ehliyet ölçülmemiş bir kesinliğe dönerdi. */
describe('ölçek sözleşmesi — karşılaştırmanın iki yanı kendi orta noktasında', () => {
  const bos = () => ({ isabet: { n: 0, uyum: null, son: null } });

  it('ölçülen taraf −2..+2\'dir: negatif ölçüm + olumlu beyan TUTMAZ', () => {
    const ik = dgIsabetGuncelle(bos(), -2, 8);
    expect(ik.isabet.n).toBe(1);
    expect(ik.isabet.son.tuttu).toBe(false);
  });

  it('1-10 ölçeğinden geçirilen bir sayı yönü DAİMA +1 okutur — bu yüzden çağıran ham deger geçirir', () => {
    // −2 değeri 1..10'a çevrilseydi 1 olurdu; 1 > 0 olduğu için ölçüm
    // "iyi" okunur ve olumlu beyanla YANLIŞLIKLA tutardı. Bu test o
    // dönüşümün neden yasaklandığını kanıtla tutar.
    const yanlis = dgIsabetGuncelle(bos(), 1, 8);
    expect(yanlis.isabet.son.tuttu).toBe(true);
    const dogru = dgIsabetGuncelle(bos(), -2, 8);
    expect(dogru.isabet.son.tuttu).toBe(false);
  });

  it('dgIsabetGunuKapat ham deger geçirir — negatif nabız + olumlu beyan MISS yazar', async () => {
    const { S } = await import('../js/state.js');
    const mod = await import('../js/parts/09-reports-tracks.js');
    S.currentUser = { id: 'ehliyet-olcek-test' };
    S._dgIklim = { taban: { n: 0, kova: [], tarih: null }, lehce: {}, defter: {}, beyan: {},
                   isabet: { n: 0, uyum: null, son: null }, yuzeyDefter: {},
                   modelOkuma: { n: 0, ayristi: 0, son: null }, v: 1 };
    S._dgNabiz = { deger: -2, kuvvet: 4 };
    mod.dgIsabetGunuKapat(9); // kullanıcı "9" dedi, motor "çok kötü" ölçtü
    expect(S._dgIklim.isabet.n).toBe(1);
    expect(S._dgIklim.isabet.son.tuttu).toBe(false);
    expect(S._dgIklim.isabet.son.olculenDeger).toBe(-2); // ham, çevrilmemiş
  });
});

/* ─── LEHÇE ANAHTARI GÖRÜNÜR — faz denetimi, 2026-08-29 ───────────────────
   Lehçenin anahtarı kullanıcının yazdığı kelime değil, sözlüğün eşleştirdiği
   parçadır: "bugün çok üzgünüm" cümlesinde anahtar "üzgün"dür, "üzgünüm"
   değil. Adı konmadığında bu gizli bir çeviri katmanıdır (§4.3) ve
   FAZ 14'ün henüz yazılmamış düzeltme arayüzü sessizce yanlış anahtarı
   kaydederdi — kullanıcı "düzelttim" sanır, motor hiç değişmez. */
describe('lehçe anahtarı — motor kendi aradığı anahtarı dışarı verir', () => {
  const bosIklim = () => ({ taban: { n: 0, kova: [], tarih: null }, lehce: {}, defter: {}, beyan: {},
                            isabet: { n: 0, uyum: null, son: null }, yuzeyDefter: {},
                            modelOkuma: { n: 0, ayristi: 0, son: null }, v: 1 });

  it('aday `eslesme` taşır ve o, kullanıcının tam kelimesinden FARKLI olabilir', () => {
    const n = dgNabiz('bugün çok üzgünüm');
    const aday = n.adaylar.find(a => a.aile === 'keder');
    expect(aday.eslesme).toBe('üzgün');
    expect(aday.eslesme).not.toBe('üzgünüm');
  });

  it('adayın `eslesme`si dgLehceDuzelt\'e aynen geçince düzeltme TUTAR', () => {
    const aday = dgNabiz('bugün çok üzgünüm').adaylar.find(a => a.aile === 'keder');
    const ik = dgLehceDuzelt(bosIklim(), aday.eslesme, 'donukluk');
    const sonra = dgNabiz('bugün çok üzgünüm', { iklim: ik });
    expect(sonra.adaylar.find(a => a.eslesme === 'üzgün').aile).toBe('donukluk');
  });

  it('kullanıcının tam kelimesi anahtar olarak geçirilirse düzeltme TUTMAZ — arayüz adaydan okumalı', () => {
    const ik = dgLehceDuzelt(bosIklim(), 'üzgünüm', 'donukluk');
    const sonra = dgNabiz('bugün çok üzgünüm', { iklim: ik });
    expect(sonra.adaylar.find(a => a.eslesme === 'üzgün').aile).toBe('keder');
  });

  it('dgLehceUnut aynı anahtarla geri alır', () => {
    const aday = dgNabiz('bugün çok üzgünüm').adaylar.find(a => a.aile === 'keder');
    let ik = dgLehceDuzelt(bosIklim(), aday.eslesme, 'donukluk');
    ik = dgLehceUnut(ik, aday.eslesme);
    expect(dgNabiz('bugün çok üzgünüm', { iklim: ik }).adaylar[0].aile).toBe('keder');
  });
});
