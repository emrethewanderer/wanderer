/**
 * DUYGU MOTORU — NABIZ ÇEKİRDEĞİ (13D, FAZ 1)
 *
 * Bu testler tek sözleşmeyi kilitler: kanıtsız duygu bir değer DEĞİLDİR.
 * `dgNabiz` kanıt yoksa `null` döner — asla eski `'neutral'` gibi bir
 * varsayılana düşmez (§6.10). Kırmızıya dönerlerse taksonomi ya da
 * olumsuzlama penceresi bir yerde kanıtsız bir sayı üretmeye başlamış
 * demektir — .claude/plans/duygu-motoru.md'ye bak.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { S } from '../js/state.js';
import { DG_AILELER, dgNabiz, dgYay } from '../js/parts/13D-duygu-motoru.js';

// Aile başına, sözlüğün gerçekten tuttuğu tek bir TR örnek cümle.
const _ORNEK_TR = {
  keder: 'çok üzgünüm',
  yalnizlik: 'yalnızım bugün',
  utanc_suclu: 'çok utanıyorum',
  ofke: 'çok kızgınım',
  kaygi: 'kaygılıyım',
  donukluk: 'hiçbir şey hissetmiyorum',
  karisiklik: 'kafam karışık',
  sevinc: 'başardım',
  umut: 'umutluyum',
  huzur: 'rahatladım',
};

describe('window kontratı', () => {
  it('window.dgNabiz ve window.dgYay fonksiyon olarak açık', () => {
    expect(typeof window.dgNabiz).toBe('function');
    expect(typeof window.dgYay).toBe('function');
  });
});

describe('dgNabiz — on duygu ailesinin her biri tutuyor', () => {
  Object.keys(DG_AILELER).forEach(aile => {
    it(`"${_ORNEK_TR[aile]}" → ${aile} ailesini yakalar`, () => {
      const r = dgNabiz(_ORNEK_TR[aile]);
      expect(r).not.toBeNull();
      expect(r.adaylar.some(a => a.aile === aile)).toBe(true);
      expect(r.kaynak).toBe('olcum');
    });
  });
});

describe('dgNabiz — kanıt yoksa null (§6.10, eski "neutral" ölür)', () => {
  it('hiçbir aile deseni tutmayan metinde null döner', () => {
    expect(dgNabiz('tamam')).toBeNull();
  });

  it('boş / null / undefined metinde patlamadan null döner', () => {
    expect(dgNabiz('')).toBeNull();
    expect(dgNabiz(null)).toBeNull();
    expect(dgNabiz(undefined)).toBeNull();
    expect(() => dgNabiz(undefined)).not.toThrow();
  });

  it('asla eski nesne biçimine (ör. {emotion:"neutral"}) düşmez — ya nesne ya null', () => {
    const r = dgNabiz('bugün hava güzeldi');
    expect(r === null || typeof r === 'object').toBe(true);
  });
});

describe('dgNabiz — olumsuzlama penceresi (eşleşmeden sonraki 3 belirteç)', () => {
  it('"mutsuz değilim" pozitif değere döner, negatif KALMAZ', () => {
    const r = dgNabiz('mutsuz değilim');
    expect(r).not.toBeNull();
    expect(r.deger).toBeGreaterThan(0);
  });

  it('olumsuzlama yokken aynı aile normal (negatif) işaretini korur', () => {
    const r = dgNabiz('çok mutsuzum');
    expect(r).not.toBeNull();
    expect(r.deger).toBeLessThan(0);
  });

  it('deger=0 taşıyan aile (karisiklik) olumsuzlansa da -0 üretmez', () => {
    const r = dgNabiz('bilmiyorum değil');
    expect(r).not.toBeNull();
    expect(Object.is(r.deger, -0)).toBe(false);
    expect(r.deger).toBe(0);
  });
});

describe('dgNabiz — pekiştirici/noktalama kuvveti artırır', () => {
  it('"çok mutluyum!" kuvveti sade "mutluyum"dan düşük olamaz', () => {
    const sade = dgNabiz('mutluyum');
    const guclu = dgNabiz('çok mutluyum!');
    expect(sade).not.toBeNull();
    expect(guclu).not.toBeNull();
    expect(guclu.kuvvet).toBeGreaterThan(sade.kuvvet);
  });

  it('kuvvet daima 0..4 aralığında kalır (tavan taşmaz)', () => {
    const r = dgNabiz('çok ama çok kızgınım!!!');
    expect(r.kuvvet).toBeLessThanOrEqual(4);
    expect(r.kuvvet).toBeGreaterThanOrEqual(0);
  });
});

describe('dgNabiz — donukluk DÜŞÜK kuvvetle doğar, sakinlik sanılmaz', () => {
  it('"hiçbir şey hissetmiyorum" negatif değerde ama düşük kuvvette ölçülür', () => {
    const r = dgNabiz('hiçbir şey hissetmiyorum');
    expect(r).not.toBeNull();
    expect(r.deger).toBeLessThan(0); // umutsuzluk OLUMLU sayılmaz
    expect(r.kuvvet).toBeLessThanOrEqual(2); // taban 1 — YÜKSEK yoğunluk değil
  });
});

describe('dgNabiz — birden çok aday, en güçlüsü baskın gelir', () => {
  it('güçlü (ofke, taban 4) + zayıf (huzur, taban 1) aynı metinde: ofke kazanır', () => {
    const r = dgNabiz('çok kızgınım ama biraz da rahatladım');
    expect(r).not.toBeNull();
    expect(r.adaylar.length).toBeGreaterThanOrEqual(2);
    const guclu = r.adaylar.find(a => a.aile === 'ofke');
    expect(guclu).toBeTruthy();
    expect(r.kuvvet).toBe(guclu.guc);
  });
});

describe('dgNabiz — kanıt alanı kullanıcının kendi cümlesinden kesilir', () => {
  it('adaylar[].kanit boş değildir ve orijinal metinden gelir', () => {
    const r = dgNabiz('Bugün çok üzgünüm. Yarın toplantım var.');
    expect(r).not.toBeNull();
    const aday = r.adaylar.find(a => a.aile === 'keder');
    expect(aday.kanit.length).toBeGreaterThan(0);
    expect(aday.kanit.toLowerCase()).toContain('üzgün');
    // İkinci cümle (yarın toplantım var) kanıta karışmaz — cümle sınırında kırpılır.
    expect(aday.kanit).not.toContain('toplantım');
  });
});

describe('dgNabiz — yon alanı yalnız opts.onceki verildiğinde dolar', () => {
  it('opts verilmezse yon null döner (tek çağrıda geçmiş yok)', () => {
    const r = dgNabiz('çok kızgınım');
    expect(r.yon).toBeNull();
  });

  it('opts.onceki ile karşılaştırıp yukselen/dusen/duran döner', () => {
    const yukselen = dgNabiz('çok kızgınım', { onceki: { kuvvet: 1 } });
    const dusen = dgNabiz('rahatladım', { onceki: { kuvvet: 4 } });
    const duran = dgNabiz('mutluyum', { onceki: { kuvvet: 3 } });
    expect(yukselen.yon).toBe('yukselen');
    expect(dusen.yon).toBe('dusen');
    expect(duran.yon).toBe('duran');
  });
});

describe('dgNabiz — İngilizce sözlük (TR+EN paritesi, plan Risk 13)', () => {
  const oncekiLang = S._currentLang;
  beforeEach(() => { S._currentLang = 'en'; });
  afterEach(() => { S._currentLang = oncekiLang; });

  it('"I feel so anxious" kaygi ailesini EN sözlükle yakalar', () => {
    const r = dgNabiz('I feel so anxious');
    expect(r).not.toBeNull();
    expect(r.adaylar.some(a => a.aile === 'kaygi')).toBe(true);
  });

  /* DENETİM 2026-08-29 — bu test eskiden kırığı SÖZLEŞME diye kilitliyordu
     ("not sad" negatif okunur, bilinçli sınır"). Değildi: İngilizce
     olumsuzlama eşleşmeden ÖNCE gelir, tek yönlü pencere onu göremez ve
     motor tersini söyler. Yanlış işaret, eksik işaretten kötüdür. */
  it('önce-gelen "not" yakalanır — "I am not sad" kederi negatif OKUMAZ', () => {
    expect(dgNabiz('I am not sad').deger).toBeGreaterThan(0);
  });

  it('cümlecik sınırı: "I\'m sad, no one understands" keder NEGATİF kalır', () => {
    // Virgülün ötesindeki `no` bir zamanlar kederi olumluya çeviriyordu.
    expect(dgNabiz("I'm sad, no one understands").deger).toBeLessThan(0);
  });

  it('umut ailesi EN sözlükte doğar', () => {
    expect(dgNabiz('maybe i can do this').adaylar.some(a => a.aile === 'umut')).toBe(true);
  });
});

describe('alt-dize tuzakları — canlı denetimde yakalandı (2026-08-29)', () => {
  it('"umutluyum" sevinç DEĞİL umut okunur (/mutlu/ "uMUTLUyum" içinde geçiyordu)', () => {
    const r = dgNabiz('umutluyum');
    expect(r.adaylar.some(a => a.aile === 'umut')).toBe(true);
    expect(r.adaylar.some(a => a.aile === 'sevinc')).toBe(false);
  });

  it('"umutsuzum" keder DEĞİL donukluk okunur — ve kuvveti DÜŞÜK kalır', () => {
    const r = dgNabiz('umutsuzum');
    expect(r.adaylar.some(a => a.aile === 'donukluk')).toBe(true);
    expect(r.adaylar.some(a => a.aile === 'keder')).toBe(false);
    expect(r.kuvvet).toBeLessThanOrEqual(1); // umutsuzluk sakinlik sanılmasın diye AYRI aile
  });

  it('"kendimi yeterince iyi görmüyorum" öfke okunmaz (/yeter/ tuzağı)', () => {
    const r = dgNabiz('kendimi yeterince iyi görmüyorum');
    expect(r === null || !r.adaylar.some(a => a.aile === 'ofke')).toBe(true);
  });
});

describe('olumsuzlama — denetimde bulunan üç yanlış-çevirme (2026-08-29)', () => {
  it('cümlecik sınırı: "çok mutluyum, hiç bu kadar iyi olmamıştım" POZİTİF kalır', () => {
    expect(dgNabiz('çok mutluyum, hiç bu kadar iyi olmamıştım').deger).toBeGreaterThan(0);
  });

  it('ek yalnız SONRAKİ belirteçte: "yapamadım üzgünüm" NEGATİF kalır', () => {
    // Öndeki fiilin olumsuzluk eki (-madım) kederi çevirmemeli.
    expect(dgNabiz('yapamadım üzgünüm').deger).toBeLessThan(0);
  });

  it('TR sonra-gelen olumsuzlama hâlâ çalışıyor: "mutlu değilim" pozitif DEĞİL', () => {
    expect(dgNabiz('mutlu değilim').deger).toBeLessThan(0);
  });

  it('"ama" da cümlecik ayracıdır: "üzgünüm ama pişman değilim" keder kalır', () => {
    expect(dgNabiz('üzgünüm ama pişman değilim').deger).toBeLessThan(0);
  });
});

describe('dgYay — son 3 nabzın kuvvet eğrisi', () => {
  it('2\'den az geçerli veri: null döner', () => {
    expect(dgYay([])).toBeNull();
    expect(dgYay([{ kuvvet: 3 }])).toBeNull();
    expect(dgYay(null)).toBeNull();
  });

  it('kuvvet artıyorsa "yukselen"', () => {
    expect(dgYay([{ kuvvet: 1 }, { kuvvet: 2 }, { kuvvet: 4 }])).toBe('yukselen');
  });

  it('kuvvet düşüyorsa "dusen"', () => {
    expect(dgYay([{ kuvvet: 4 }, { kuvvet: 3 }, { kuvvet: 2 }])).toBe('dusen');
  });

  it('kuvvet sabitse "duran"', () => {
    expect(dgYay([{ kuvvet: 2 }, { kuvvet: 2 }])).toBe('duran');
  });

  it('yalnız SON 3 kayıt sayılır — eskisi eğriyi bozmaz', () => {
    // İlk kayıt (kuvvet 0) yok sayılmalı; son 3 = [1,2,4] → yukselen.
    expect(dgYay([{ kuvvet: 0 }, { kuvvet: 1 }, { kuvvet: 2 }, { kuvvet: 4 }])).toBe('yukselen');
  });

  it('geçersiz (null/kuvvetsiz) girdiler filtrelenir', () => {
    expect(dgYay([null, { kuvvet: 1 }, undefined, { kuvvet: 3 }])).toBe('yukselen');
  });
});
