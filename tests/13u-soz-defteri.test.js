/**
 * Tests for js/parts/13u-soz-defteri.js — Söz Defteri (verilen sözün hafızası).
 *
 * Kapsam: sdSenkronla'nın idempotentliği (aynı gün iki kez yazılınca satır
 * çoğalmaz; akşam hesabı `kept`i sonradan doldurunca aynı satır tazelenir),
 * atlanan günün `source:'skip'` satırı, henüz söz verilmemiş günde YAZMAMA,
 * okuma yüzeyi (sdTutmaOrani'nin "veri yok = null" sözleşmesi, sdSkipOrani,
 * sdSonSozler tekrar-önleme listesi, sdSeri'nin çoğunluk hükmü + histerezis
 * girdisi, sdGunSayisi) ve 90 günlük kayan pencere budaması.
 *
 * SafeStorage mock'lanmaz — gerçek round-trip doğrulanır (per-uid anahtar
 * sözleşmesi de böylece test edilir). GOTCHA: SafeStorage localStorage değil
 * bellek-içi _kvCache üzerinde çalışır, `localStorage.clear()` onu TEMİZLEMEZ —
 * testler arası izolasyon `SafeStorage.remove(key)` ile sağlanır.
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { S } from '../js/state.js';
import { localISODate, SafeStorage } from '../js/parts/00a-infrastructure.js';
import {
  sdSenkronla, sdGecmis, sdTutmaOrani, sdSkipOrani, sdSonSozler,
  sdSeri, sdGunSayisi, sdMertebe, sdInit, sdSave, sdLoad,
} from '../js/parts/13u-soz-defteri.js';

/** offset gün önce/sonra (negatif = geçmiş) — defterin gün anahtarı formatında. */
function gun(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return localISODate(d);
}

/** Tek satırlık ritüel kaydı kurar. */
function ritus(day, pledges, skipped = false) {
  return { date: day, pledges, skipped, finished: true, reckoned: false };
}

const TEST_UIDS = ['sd-test-user', 'baska-user'];

function resetState() {
  S.currentUser = { id: 'sd-test-user' };
  S._sozDefteri = { kayitlar: [], updated: null };
  // Depoyu da sıfırla: aksi hâlde bir önceki testin sdSave'i _kvCache'te
  // kalır ve sdLoad/sdInit testleri o veriyi geri okur.
  TEST_UIDS.forEach(uid => { try { SafeStorage.remove(`etw_soz_defteri_v1_${uid}`); } catch (_) {} });
}

beforeEach(() => {
  resetState();
});

describe('sdSenkronla — yazma sözleşmesi', () => {
  it('pledges satırlara çevrilir; alanlar korunur', () => {
    sdSenkronla(ritus(gun(0), [
      { domain: 'bireysel', text: 'Bugün üç nefes alacağım.', key: 'gl.soz.bireysel.default.0' },
      { domain: 'is', text: 'Bugün tek zor adımı atacağım.' },
    ]));

    const k = S._sozDefteri.kayitlar;
    expect(k).toHaveLength(2);
    expect(k[0]).toMatchObject({
      day: gun(0), domain: 'bireysel', key: 'gl.soz.bireysel.default.0',
      text: 'Bugün üç nefes alacağım.', source: 'banka', kept: null, reason: null,
    });
    // key verilmemişse null'a düşer, source varsayılanı 'banka' kalır
    expect(k[1].key).toBeNull();
    expect(k[1].source).toBe('banka');
  });

  it('aynı gün iki kez yazılınca satır ÇOĞALMAZ (idempotent)', () => {
    const r = ritus(gun(0), [{ domain: 'bireysel', text: 'A' }]);
    sdSenkronla(r);
    sdSenkronla(r);
    sdSenkronla(r);
    expect(S._sozDefteri.kayitlar).toHaveLength(1);
  });

  it('akşam hesabı kept doldurunca AYNI satır tazelenir', () => {
    const pledges = [{ domain: 'bireysel', text: 'A' }];
    sdSenkronla(ritus(gun(0), pledges));
    expect(S._sozDefteri.kayitlar[0].kept).toBeNull();

    pledges[0].kept = true;                       // 10s glConfirmReckoning'in yaptığı
    sdSenkronla(ritus(gun(0), pledges));

    expect(S._sozDefteri.kayitlar).toHaveLength(1);
    expect(S._sozDefteri.kayitlar[0].kept).toBe(true);
  });

  it('atlanan gün source:"skip" satırı olarak kaydedilir', () => {
    sdSenkronla(ritus(gun(0), [], true));
    expect(S._sozDefteri.kayitlar).toHaveLength(1);
    expect(S._sozDefteri.kayitlar[0]).toMatchObject({ source: 'skip', domain: null, kept: null });
  });

  it('söz henüz verilmemiş gün (ne pledge ne skip) YAZILMAZ', () => {
    sdSenkronla(ritus(gun(0), [], false));
    expect(S._sozDefteri.kayitlar).toHaveLength(0);
  });

  it('bozuk/eksik girdide sessizce düşer, defteri bozmaz', () => {
    sdSenkronla(null);
    sdSenkronla(undefined);
    sdSenkronla({ pledges: [{ domain: 'bireysel', text: 'A' }] });   // date yok
    sdSenkronla(ritus(gun(0), [{ text: 'domainsiz' }]));             // domain yok
    expect(S._sozDefteri.kayitlar).toHaveLength(0);
  });

  it('kayıtlar gün sırasına dizilir', () => {
    sdSenkronla(ritus(gun(-1), [{ domain: 'bireysel', text: 'dün' }]));
    sdSenkronla(ritus(gun(-3), [{ domain: 'bireysel', text: 'evvelsi' }]));
    sdSenkronla(ritus(gun(0), [{ domain: 'bireysel', text: 'bugün' }]));
    expect(S._sozDefteri.kayitlar.map(k => k.text)).toEqual(['evvelsi', 'dün', 'bugün']);
  });
});

describe('sdTutmaOrani — "veri yok" ile "kötü" karışmaz', () => {
  it('hiç hüküm yoksa null döner', () => {
    sdSenkronla(ritus(gun(0), [{ domain: 'bireysel', text: 'A' }]));   // kept: null
    expect(sdTutmaOrani()).toBeNull();
    expect(sdTutmaOrani('bireysel')).toBeNull();
  });

  it('tutulan/hüküm oranını verir', () => {
    sdSenkronla(ritus(gun(-2), [{ domain: 'bireysel', text: 'A', kept: true }]));
    sdSenkronla(ritus(gun(-1), [{ domain: 'bireysel', text: 'B', kept: false }]));
    sdSenkronla(ritus(gun(0), [{ domain: 'bireysel', text: 'C', kept: true }]));
    expect(sdTutmaOrani('bireysel')).toBeCloseTo(2 / 3, 5);
  });

  it('domain filtresi uygulanır', () => {
    sdSenkronla(ritus(gun(0), [
      { domain: 'bireysel', text: 'A', kept: true },
      { domain: 'is', text: 'B', kept: false },
    ]));
    expect(sdTutmaOrani('bireysel')).toBe(1);
    expect(sdTutmaOrani('is')).toBe(0);
    expect(sdTutmaOrani()).toBe(0.5);
  });

  it('pencere dışındaki günler sayılmaz', () => {
    sdSenkronla(ritus(gun(-40), [{ domain: 'bireysel', text: 'eski', kept: false }]));
    sdSenkronla(ritus(gun(0), [{ domain: 'bireysel', text: 'yeni', kept: true }]));
    expect(sdTutmaOrani('bireysel', 21)).toBe(1);      // 40 gün öncesi pencere dışı
    expect(sdTutmaOrani('bireysel', 90)).toBe(0.5);    // geniş pencerede ikisi de
  });
});

describe('sdSkipOrani — kaçınma sinyali', () => {
  it('kayıt yoksa null', () => {
    expect(sdSkipOrani()).toBeNull();
  });

  it('atlanan günlerin oranını gün bazında verir', () => {
    sdSenkronla(ritus(gun(-2), [], true));
    sdSenkronla(ritus(gun(-1), [{ domain: 'bireysel', text: 'A' }]));
    sdSenkronla(ritus(gun(0), [{ domain: 'is', text: 'B' }]));
    expect(sdSkipOrani()).toBeCloseTo(1 / 3, 5);
  });
});

describe('sdSonSozler — tekrar önleme listesi', () => {
  it('skip satırları hariç tutulur, yeniden eskiye sıralanır', () => {
    sdSenkronla(ritus(gun(-2), [{ domain: 'bireysel', text: 'eski', key: 'k1' }]));
    sdSenkronla(ritus(gun(-1), [], true));
    sdSenkronla(ritus(gun(0), [{ domain: 'is', text: 'yeni', key: 'k2' }]));

    const son = sdSonSozler(10);
    expect(son.map(s => s.text)).toEqual(['yeni', 'eski']);
    expect(son[0]).toMatchObject({ key: 'k2', domain: 'is', day: gun(0) });
  });

  it('n sınırına uyar', () => {
    for (let i = 5; i >= 0; i--) {
      sdSenkronla(ritus(gun(-i), [{ domain: 'bireysel', text: `s${i}` }]));
    }
    expect(sdSonSozler(3)).toHaveLength(3);
  });
});

describe('sdSeri — histerezisin girdisi', () => {
  it('kayıt yoksa sıfır seri', () => {
    expect(sdSeri()).toEqual({ tutulan: 0, kirik: 0 });
  });

  it('ardışık tutulan günleri sayar', () => {
    sdSenkronla(ritus(gun(-2), [{ domain: 'bireysel', text: 'A', kept: true }]));
    sdSenkronla(ritus(gun(-1), [{ domain: 'bireysel', text: 'B', kept: true }]));
    sdSenkronla(ritus(gun(0), [{ domain: 'bireysel', text: 'C', kept: true }]));
    expect(sdSeri()).toEqual({ tutulan: 3, kirik: 0 });
  });

  it('en yeni hüküm kırıksa kırık seriyi sayar', () => {
    sdSenkronla(ritus(gun(-2), [{ domain: 'bireysel', text: 'A', kept: true }]));
    sdSenkronla(ritus(gun(-1), [{ domain: 'bireysel', text: 'B', kept: false }]));
    sdSenkronla(ritus(gun(0), [{ domain: 'bireysel', text: 'C', kept: false }]));
    expect(sdSeri()).toEqual({ tutulan: 0, kirik: 2 });
  });

  it('aynı günde çoğunluk hükmü geçerlidir (2/3 tutuldu → o gün tutuldu)', () => {
    sdSenkronla(ritus(gun(0), [
      { domain: 'bireysel', text: 'A', kept: true },
      { domain: 'iliski', text: 'B', kept: true },
      { domain: 'is', text: 'C', kept: false },
    ]));
    expect(sdSeri()).toEqual({ tutulan: 1, kirik: 0 });
  });

  it('domain filtresiyle o alanın kendi serisi okunur', () => {
    sdSenkronla(ritus(gun(-1), [
      { domain: 'bireysel', text: 'A', kept: true },
      { domain: 'is', text: 'B', kept: false },
    ]));
    sdSenkronla(ritus(gun(0), [
      { domain: 'bireysel', text: 'C', kept: true },
      { domain: 'is', text: 'D', kept: false },
    ]));
    expect(sdSeri('bireysel')).toEqual({ tutulan: 2, kirik: 0 });
    expect(sdSeri('is')).toEqual({ tutulan: 0, kirik: 2 });
  });
});

describe('sdGunSayisi + kayan pencere', () => {
  it('farklı gün sayısını verir (aynı günün üç sözü tek gün sayılır)', () => {
    sdSenkronla(ritus(gun(-1), [{ domain: 'bireysel', text: 'A' }]));
    sdSenkronla(ritus(gun(0), [
      { domain: 'bireysel', text: 'B' },
      { domain: 'is', text: 'C' },
    ]));
    expect(sdGunSayisi()).toBe(2);
  });

  it('90 günden eski kayıtlar budanır', () => {
    for (let i = 120; i >= 0; i--) {
      sdSenkronla(ritus(gun(-i), [{ domain: 'bireysel', text: `s${i}` }]));
    }
    expect(sdGunSayisi()).toBe(90);
    // En eski tutulan gün 89 gün öncesi olmalı; 120 gün öncesi düşmüş olmalı
    const gunler = S._sozDefteri.kayitlar.map(k => k.day);
    expect(gunler).toContain(gun(-89));
    expect(gunler).not.toContain(gun(-120));
  });
});

describe('aylık özet — pencereden düşen sözün SAYIMI kalır', () => {
  const ay = (offset) => gun(offset).slice(0, 7);

  it('ham kayıtlardan verilen/tutulan/atlanan sayımını türetir', () => {
    sdSenkronla(ritus(gun(0), [
      { domain: 'bireysel', text: 'A', kept: true },
      { domain: 'is', text: 'B', kept: false },
      { domain: 'iliski', text: 'C' },              // henüz hesaplanmadı
    ]));
    expect(S._sozDefteri.aylik[ay(0)]).toEqual({ v: 3, t: 1, a: 1 });
  });

  it('İDEMPOTENT — aynı gün üç kez yazılınca sayım şişmez', () => {
    const r = ritus(gun(0), [{ domain: 'bireysel', text: 'A', kept: true }]);
    sdSenkronla(r);
    sdSenkronla(r);
    sdSenkronla(r);
    expect(S._sozDefteri.aylik[ay(0)]).toEqual({ v: 1, t: 1, a: 0 });
  });

  it('90 günlük pencereden düşen ayın sayımı DONAR — kıyasın "önce"si budur', () => {
    /* Eski gün, aşağıdaki 96 günlük döngünün DOKUNMADIĞI bir ayda olmalı.
       Donma sözleşmesi ayın PENCEREDEN TAMAMEN düşmesiyle kurulur
       (`_aylikTuret`: "pencereden düşmüş ayların özeti son yazıldığı hâliyle
       donar"); ay kısmen penceredeyse kalan günlerden yeniden türetilmesi
       tasarımın kendisidir.
       ⚠ Burada -120 yazılıydı ve test 2026-08-28'e kadar geçti: o gün
       `ay(-120)` Nisan'dı, döngünün en eskisi (`gun(-95)`) Mayıs'tı. 29
       Ağustos'ta -120 Mayıs'a kaydı, döngüyle aynı aya düştü ve test
       kırıldı — kırık koda değil, testin TARİH VARSAYIMINA aitti.
       -200 ile döngünün en eskisi arasında ~105 gün var; ikisi hiçbir
       takvimde aynı aya düşemez. */
    const ESKI = -200;
    sdSenkronla(ritus(gun(ESKI), [
      { domain: 'bireysel', text: 'eski-1', kept: true },
      { domain: 'is', text: 'eski-2', kept: false },
    ]));
    const eskiAy = ay(ESKI);
    expect(eskiAy).not.toBe(ay(-95));           // varsayımın kendisi de sınanır
    expect(S._sozDefteri.aylik[eskiAy]).toEqual({ v: 2, t: 1, a: 1 });
    // Pencereyi doldur — eski gün ham kayıtlardan düşer, sayımı kalır
    for (let i = 95; i >= 0; i--) {
      sdSenkronla(ritus(gun(-i), [{ domain: 'bireysel', text: `s${i}`, kept: true }]));
    }
    expect(S._sozDefteri.kayitlar.some(k => k.day === gun(ESKI))).toBe(false);
    expect(S._sozDefteri.aylik[eskiAy]).toEqual({ v: 2, t: 1, a: 1 });
  });

  it('özet round-trip: kalıcılıktan geri okunur', () => {
    sdSenkronla(ritus(gun(0), [{ domain: 'bireysel', text: 'A', kept: true }]));
    sdSave();
    S._sozDefteri = null;
    sdInit();
    expect(S._sozDefteri.aylik[ay(0)]).toEqual({ v: 1, t: 1, a: 0 });
  });

  it('aylik alanı OLMAYAN eski defterle de çalışır (savunmacı hidrasyon)', () => {
    S._sozDefteri = { kayitlar: [], updated: null };      // v1 şekli
    sdSenkronla(ritus(gun(0), [{ domain: 'bireysel', text: 'A', kept: true }]));
    expect(S._sozDefteri.aylik[ay(0)]).toEqual({ v: 1, t: 1, a: 0 });
  });
});

describe('sdGecmis — okuma yönü', () => {
  it('yeniden eskiye döner', () => {
    sdSenkronla(ritus(gun(-1), [{ domain: 'bireysel', text: 'dün' }]));
    sdSenkronla(ritus(gun(0), [{ domain: 'bireysel', text: 'bugün' }]));
    expect(sdGecmis(30).map(k => k.text)).toEqual(['bugün', 'dün']);
  });
});

describe('Kalıcılık — per-uid round trip', () => {
  it('sdSave/sdLoad defteri geri getirir', () => {
    sdSenkronla(ritus(gun(0), [{ domain: 'bireysel', text: 'kalıcı', kept: true }]));
    sdSave();

    S._sozDefteri = { kayitlar: [], updated: null };
    sdLoad();

    expect(S._sozDefteri.kayitlar).toHaveLength(1);
    expect(S._sozDefteri.kayitlar[0].text).toBe('kalıcı');
  });

  it('başka uid başka defter okur (sızma yok)', () => {
    sdSenkronla(ritus(gun(0), [{ domain: 'bireysel', text: 'emre' }]));
    sdSave();

    S.currentUser = { id: 'baska-user' };
    S._sozDefteri = { kayitlar: [], updated: null };
    sdLoad();
    expect(S._sozDefteri.kayitlar).toHaveLength(0);
  });

  it('sdInit boş state üstünde güvenle koşar', () => {
    S._sozDefteri = null;
    expect(() => sdInit()).not.toThrow();
    expect(S._sozDefteri).toMatchObject({ kayitlar: [] });
  });
});

describe('sdMertebe — sözün ağırlığı (histerezis)', () => {
  it('geçmiş yoksa varsayılan adım', () => {
    expect(sdMertebe()).toBe('adim');
  });

  it('tek kırık söz mertebeyi DÜŞÜRMEZ (tek gün savurmaz)', () => {
    sdSenkronla(ritus(gun(0), [{ domain: 'bireysel', text: 'A', kept: false }]));
    expect(sdMertebe()).toBe('adim');
  });

  it('iki ardışık kırık söz dokunuş mertebesine indirir', () => {
    sdSenkronla(ritus(gun(-1), [{ domain: 'bireysel', text: 'A', kept: false }]));
    sdSenkronla(ritus(gun(0), [{ domain: 'bireysel', text: 'B', kept: false }]));
    expect(sdMertebe()).toBe('dokunus');
  });

  it('iki tutulan söz henüz yükseltmez', () => {
    sdSenkronla(ritus(gun(-1), [{ domain: 'bireysel', text: 'A', kept: true }]));
    sdSenkronla(ritus(gun(0), [{ domain: 'bireysel', text: 'B', kept: true }]));
    expect(sdMertebe()).toBe('adim');
  });

  it('üç ardışık tutulan söz eşik mertebesine yükseltir', () => {
    for (let i = 2; i >= 0; i--) {
      sdSenkronla(ritus(gun(-i), [{ domain: 'bireysel', text: `s${i}`, kept: true }]));
    }
    expect(sdMertebe()).toBe('esik');
  });

  it('"fazla büyüktü" beyanı tek seferde küçültür — kendi sözü seriden ağır basar', () => {
    for (let i = 3; i >= 1; i--) {
      sdSenkronla(ritus(gun(-i), [{ domain: 'bireysel', text: `s${i}`, kept: true }]));
    }
    expect(sdMertebe()).toBe('esik');
    sdSenkronla(ritus(gun(0), [{ domain: 'bireysel', text: 'zor', kept: false, reason: 'buyuk' }]));
    expect(sdMertebe()).toBe('dokunus');
  });

  it('"unuttum" gerekçesi tek başına mertebeyi düşürmez', () => {
    sdSenkronla(ritus(gun(0), [{ domain: 'bireysel', text: 'A', kept: false, reason: 'unuttum' }]));
    expect(sdMertebe()).toBe('adim');
  });

  it('mertebe alan bazında ayrı hesaplanır', () => {
    sdSenkronla(ritus(gun(-1), [
      { domain: 'bireysel', text: 'A', kept: false },
      { domain: 'is', text: 'B', kept: true },
    ]));
    sdSenkronla(ritus(gun(0), [
      { domain: 'bireysel', text: 'C', kept: false },
      { domain: 'is', text: 'D', kept: true },
    ]));
    expect(sdMertebe('bireysel')).toBe('dokunus');
    expect(sdMertebe('is')).toBe('adim');
  });

  it('sebep kayda geçer ve okunabilir', () => {
    sdSenkronla(ritus(gun(0), [{ domain: 'is', text: 'A', kept: false, reason: 'gun' }]));
    expect(sdGecmis(7)[0].reason).toBe('gun');
  });
});

describe('sdMertebe — eski gerekçe süresiz hüküm sürmez', () => {
  it('geçmişte kalan "fazla büyüktü", sonraki tutulan sözlerle geçerliliğini yitirir', () => {
    // 10 gün önce zorlandı ve "fazla büyüktü" dedi
    sdSenkronla(ritus(gun(-10), [{ domain: 'bireysel', text: 'zor', kept: false, reason: 'buyuk' }]));
    expect(sdMertebe('bireysel')).toBe('dokunus');

    // Sonrasında üç gün üst üste sözünü tuttu → mertebe geri yükselmeli
    for (let i = 3; i >= 1; i--) {
      sdSenkronla(ritus(gun(-i), [{ domain: 'bireysel', text: `s${i}`, kept: true }]));
    }
    expect(sdMertebe('bireysel')).toBe('esik');
  });

  it('gerekçe yalnız EN SON hüküm gününde okunur', () => {
    sdSenkronla(ritus(gun(-2), [{ domain: 'is', text: 'A', kept: false, reason: 'buyuk' }]));
    sdSenkronla(ritus(gun(-1), [{ domain: 'is', text: 'B', kept: true }]));
    sdSenkronla(ritus(gun(0), [{ domain: 'is', text: 'C', kept: true }]));
    expect(sdMertebe('is')).toBe('adim');    // ne dokunuş (eski sebep) ne eşik (2 tutulan)
  });
});

describe('sdMertebe — kaçınma da bir cevaptır', () => {
  it('günlerin çoğunda söz atlanıyorsa söz küçülür', () => {
    sdSenkronla(ritus(gun(-2), [], true));
    sdSenkronla(ritus(gun(-1), [], true));
    sdSenkronla(ritus(gun(0), [{ domain: 'bireysel', text: 'A' }]));
    expect(sdSkipOrani()).toBeGreaterThan(0.5);
    expect(sdMertebe()).toBe('dokunus');
  });

  it('ara sıra atlamak mertebeyi düşürmez', () => {
    sdSenkronla(ritus(gun(-2), [], true));
    sdSenkronla(ritus(gun(-1), [{ domain: 'bireysel', text: 'A' }]));
    sdSenkronla(ritus(gun(0), [{ domain: 'bireysel', text: 'B' }]));
    expect(sdMertebe()).toBe('adim');
  });

  it('kaçınma, tutulan seriyi geçersiz kılmaz (üç tutulan varsa eşik kalır)', () => {
    for (let i = 3; i >= 1; i--) {
      sdSenkronla(ritus(gun(-i), [{ domain: 'bireysel', text: `s${i}`, kept: true }]));
    }
    sdSenkronla(ritus(gun(0), [{ domain: 'bireysel', text: 'C', kept: true }]));
    expect(sdMertebe()).toBe('esik');
  });
});
