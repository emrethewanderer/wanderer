/**
 * DUYGU MOTORU — KARŞILAMA KARARI (13D, FAZ 4)
 *
 * Plan K2'nin dokuz sıralı kuralı (ilk tutan kazanır), K9 kriz üstünlüğü,
 * İklim düzeltmesi ve tekrar cezası. Her satır kırmızı-önce yazıldı —
 * kırmızıya dönerlerse .claude/plans/duygu-motoru.md § FAZ 4'e bak.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { dgNabiz, dgKarsilama, DG_KARSILAMALAR, DG_CUE, dgIklimDefterEkle } from '../js/parts/13D-duygu-motoru.js';

const _oncekiDetectCrisis = window.detectCrisis;
afterEach(() => { window.detectCrisis = _oncekiDetectCrisis; });
beforeEach(() => { window.detectCrisis = () => false; });

describe('window kontratı', () => {
  it('window.dgKarsilama fonksiyon, DG_KARSILAMALAR yedi eksen', () => {
    expect(typeof window.dgKarsilama).toBe('function');
    expect(DG_KARSILAMALAR).toEqual(['taniklik', 'yatistirma', 'sahiplenme', 'berraklik', 'diriltme', 'kutlama', 'tutma']);
  });

  it('window.DG_CUE aynı referans, fonksiyon değil tablo', () => {
    expect(window.DG_CUE).toBe(DG_CUE);
  });
});

/* DG_CUE — K8 beden kanalı (FAZ 7). K7/K9'un yapısal dışlaması: tanıklık
   ("sessiz eşlik") ve tutma (kriz, pazarlıksız) hiçbir cue'ya bağlanmaz. */
describe('DG_CUE — karşılamanın beden kanalı (FAZ 7)', () => {
  it('tanıklık ve tutma tabloda YOK (K7 sessiz eşlik + K9 kriz üstünlüğü)', () => {
    expect(DG_CUE.taniklik).toBeUndefined();
    expect(DG_CUE.tutma).toBeUndefined();
  });

  it('geri kalan beş eksenin her biri gerçek bir cue adına eşlenir', () => {
    const gercekCueler = ['tap', 'seal', 'milestone1', 'milestone2', 'milestone3', 'milestone4',
      'pack', 'holo', 'holoGrand', 'gift', 'soz', 'elmas', 'whoosh', 'breath', 'esikGold',
      'esikLapis', 'cardBirth', 'nisan', 'streak', 'sendTick', 'replyBreath', 'flip', 'recall'];
    ['yatistirma', 'sahiplenme', 'berraklik', 'diriltme', 'kutlama'].forEach(eksen => {
      expect(gercekCueler).toContain(DG_CUE[eksen]);
    });
  });
});

describe('kural 1 — K9 kriz üstünlüğü, tablo çalışmaz', () => {
  it('kriz sinyali varsa eksen tutma; İklim ve tablo devre dışı', () => {
    window.detectCrisis = () => true;
    const nabiz = dgNabiz('bugün çok başardım'); // aksi hâlde kutlama olurdu
    const r = dgKarsilama('herhangi bir metin', nabiz, { defter: { kutlama: { n: 5, toplam: 5 } } }, null);
    expect(r.eksen).toBe('tutma');
    expect(r.kanit).toBeNull();
    expect(r.ikincil).toBeNull();
  });

  it('kriz kontrolü HAM metne bakar, nabza değil', () => {
    let gorulenMetin = null;
    window.detectCrisis = (t) => { gorulenMetin = t; return false; };
    dgKarsilama('kendime zarar vermek istiyorum', null, null, null);
    expect(gorulenMetin).toBe('kendime zarar vermek istiyorum');
  });
});

describe('kural 2 — kuvvet≥3 ∧ yön yükselen ∧ değer≤0 → yatıştırma (taşma)', () => {
  it('ofke baskın + yükselen akış → yatıştırma, sahiplenme DEĞİL', () => {
    const nabiz = dgNabiz('çok kızgınım!'); // ofke, taban kuvvet 4
    expect(nabiz.kuvvet).toBeGreaterThanOrEqual(3);
    const r = dgKarsilama('çok kızgınım!', nabiz, null, { yon: 'yukselen' });
    expect(r.eksen).toBe('yatistirma');
  });

  /* Yön koşulunu MUTLAK TAVANIN ALTINDA kalan bir aileyle sınamak gerekir:
     öfke zaten tavandadır (taban 4) ve kural 7b onu yön olmadan da haklı
     olarak yatıştırmaya alır. Keder tabanı 2'dir — pekiştiriciyle 3'e
     çıkar, tavana değmez; yönün tek başına belirleyici olduğu yer burası. */
  it('yön yükselen DEĞİLSE kural 2 tetiklenmez (tavana değmeyen aileyle)', () => {
    const nabiz = dgNabiz('çok üzgünüm'); // keder: 2 + pekiştirici = 3, tavan DEĞİL
    expect(nabiz.kuvvet).toBe(3);
    expect(nabiz.kuvvetMutlak).toBeLessThan(4);
    const r = dgKarsilama('çok üzgünüm', nabiz, null, { yon: 'duran' });
    expect(r.eksen).toBe('taniklik');
  });

  /* KURAL 7b — göreliliğin yuttuğu taşma (denetim 2026-08-29). */
  it('mutlak tavandaki olumsuz kuvvet, yön olmasa da yatıştırma alır', () => {
    const nabiz = dgNabiz('çok kızgınım!');
    expect(nabiz.kuvvetMutlak).toBe(4);
    const r = dgKarsilama('çok kızgınım!', nabiz, null, { yon: 'duran' });
    expect(r.eksen).toBe('yatistirma');
  });

  it('ama utanç mutlak tavanda OLSA BİLE sahiplenmeyi kaybetmez (7b açgözlü değil)', () => {
    const nabiz = dgNabiz('çok utanıyorum');
    expect(nabiz.kuvvetMutlak).toBe(4);
    expect(dgKarsilama('çok utanıyorum', nabiz, null, null).eksen).toBe('sahiplenme');
  });
});

describe('kural 3 — utanç/suçluluk baskın → sahiplenme', () => {
  it('"çok utanıyorum bugün" → sahiplenme, kanit kullanıcının cümlesi', () => {
    const nabiz = dgNabiz('çok utanıyorum bugün');
    const r = dgKarsilama('çok utanıyorum bugün', nabiz, null, null);
    expect(r.eksen).toBe('sahiplenme');
    expect(r.kanit).toMatch(/utan/i);
  });
});

describe('kural 4 — karışıklık baskın → berraklık (kuvvet koşulu yok)', () => {
  it('"kafam karışık" → berraklık', () => {
    const nabiz = dgNabiz('kafam karışık');
    const r = dgKarsilama('kafam karışık', nabiz, null, null);
    expect(r.eksen).toBe('berraklik');
  });
});

describe('kural 5 — donukluk baskın, İklim izniyle koşullu', () => {
  it('İklim diriltmeye izin veriyorsa (defter ortalaması pozitif) → diriltme', () => {
    const nabiz = dgNabiz('hiçbir şey hissetmiyorum');
    const iklim = { defter: { diriltme: { n: 4, toplam: 4 } }, beyan: {} };
    const r = dgKarsilama('hiçbir şey hissetmiyorum', nabiz, iklim, null);
    expect(r.eksen).toBe('diriltme');
  });

  it('İklim yok/kayıtsızsa (henüz tutmadığı bilinmiyor) → tanıklık, diriltme AÇILMAZ', () => {
    const nabiz = dgNabiz('hiçbir şey hissetmiyorum');
    const r = dgKarsilama('hiçbir şey hissetmiyorum', nabiz, null, null);
    expect(r.eksen).toBe('taniklik');
  });
});

describe('kural 6 — sevinç/umut baskın → kutlama', () => {
  it('sevinç: "bugün çok başardım" → kutlama', () => {
    const nabiz = dgNabiz('bugün çok başardım');
    const r = dgKarsilama('bugün çok başardım', nabiz, null, null);
    expect(r.eksen).toBe('kutlama');
  });

  it('umut: "umutluyum" → kutlama (diriltme DEĞİL — kıvılcım zaten yanıyor)', () => {
    const nabiz = dgNabiz('umutluyum');
    const r = dgKarsilama('umutluyum', nabiz, null, null);
    expect(r.eksen).toBe('kutlama');
  });
});

describe('kural 7 — huzur baskın → tanıklık (alkış gürültüdür)', () => {
  it('"rahatladım" → tanıklık, kutlama DEĞİL', () => {
    const nabiz = dgNabiz('rahatladım');
    const r = dgKarsilama('rahatladım', nabiz, null, null);
    expect(r.eksen).toBe('taniklik');
  });
});

describe('kural 8 — değer<0, spesifik kural yok → tanıklık', () => {
  it('"çok üzgünüm" (keder) → tanıklık', () => {
    const nabiz = dgNabiz('çok üzgünüm');
    const r = dgKarsilama('çok üzgünüm', nabiz, null, null);
    expect(r.eksen).toBe('taniklik');
  });
});

describe('kural 9 — kanıt yok ya da zayıf → tanıklık (K6)', () => {
  it('nabiz null → tanıklık, kanit null, gerekce string', () => {
    const r = dgKarsilama('tamam', null, null, null);
    expect(r.eksen).toBe('taniklik');
    expect(r.kanit).toBeNull();
    expect(typeof r.gerekce).toBe('string');
    expect(r.gerekce.length).toBeGreaterThan(0);
  });
});

describe('İklim düzeltmesi — susturulmuş eksen atlanır', () => {
  it('beyanla susturulmuş eksen tanıklığa düşer, orijinal eksen ikincilde görünür', () => {
    const nabiz = dgNabiz('bugün çok başardım'); // → kutlama
    const iklim = { defter: {}, beyan: { kutlama: 'sus' } };
    const r = dgKarsilama('bugün çok başardım', nabiz, iklim, null);
    expect(r.eksen).toBe('taniklik');
    expect(r.ikincil).toBe('kutlama');
    expect(r.gerekce).toMatch(/susturul/i);
  });
});

describe('İklim düzeltmesi — defterde n≥2 ve ortalama<0 olan eksen bir sıra düşer', () => {
  it('n=5, ortalama negatif → takas olur, gerekçeye yazılır', () => {
    const nabiz = dgNabiz('bugün çok başardım');
    const iklim = { defter: { kutlama: { n: 5, toplam: -10 } }, beyan: {} };
    const r = dgKarsilama('bugün çok başardım', nabiz, iklim, null);
    expect(r.eksen).toBe('taniklik');
    expect(r.ikincil).toBe('kutlama');
  });

  it('n<2 iken negatif ortalama görmezden gelinir (tek nokta trend değil gürültü)', () => {
    const nabiz = dgNabiz('bugün çok başardım');
    const iklim = { defter: { kutlama: { n: 1, toplam: -2 } }, beyan: {} };
    const r = dgKarsilama('bugün çok başardım', nabiz, iklim, null);
    expect(r.eksen).toBe('kutlama');
  });
});

describe('tekrar cezası — 13v TEKRAR_PENCERESI emsali, aynı eksen 3 tur üst üste', () => {
  it('3 tur üst üste aynı eksen → çeşitlilik için tanıklığa düşer', () => {
    const nabiz = dgNabiz('bugün çok başardım');
    const akis = { gecmis: [{ eksen: 'kutlama' }, { eksen: 'kutlama' }, { eksen: 'kutlama' }] };
    const r = dgKarsilama('bugün çok başardım', nabiz, null, akis);
    expect(r.eksen).toBe('taniklik');
    expect(r.ikincil).toBe('kutlama');
  });

  it('2 tur üst üste yeterli DEĞİL — pencere tam 3', () => {
    const nabiz = dgNabiz('bugün çok başardım');
    const akis = { gecmis: [{ eksen: 'kutlama' }, { eksen: 'kutlama' }] };
    const r = dgKarsilama('bugün çok başardım', nabiz, null, akis);
    expect(r.eksen).toBe('kutlama');
  });

  it('tanıklık zaten seçiliyken tekrar cezası UYGULANMAZ (zaten en güvenli eksen)', () => {
    const nabiz = dgNabiz('çok üzgünüm'); // → tanıklık (kural 8)
    const akis = { gecmis: [{ eksen: 'taniklik' }, { eksen: 'taniklik' }, { eksen: 'taniklik' }] };
    const r = dgKarsilama('çok üzgünüm', nabiz, null, akis);
    expect(r.eksen).toBe('taniklik');
    expect(r.ikincil).toBeNull();
  });
});

describe('gerekçe ve kanıt — K7 uydurulmuş gerekçe yasağı', () => {
  it('kanit DAİMA baskın adayın kendi cümlesinden gelir', () => {
    const metin = 'kafam karışık bugün';
    const nabiz = dgNabiz(metin);
    const r = dgKarsilama(metin, nabiz, null, null);
    expect(r.kanit).toBe(nabiz.adaylar.find(a => a.aile === 'karisiklik').kanit);
  });
});

/* DÖNGÜ KAPANIYOR MU (FAZ 10) — defterin dolması DAVRANIŞI değiştirmeli,
   yoksa öğrenme yalnız kağıt üstünde kalır. Diriltme K6'nın riskli
   eksenidir: varsayılan olarak KAPALIDIR ve ancak bu kişide tuttuğu
   ÖLÇÜLDÜĞÜNDE açılır (DG_IZIN_MIN_N = 3). */
describe('öğrenme döngüsü — defter dolunca karar değişiyor (FAZ 10)', () => {
  const donukNabiz = () => dgNabiz('hiçbir şey hissetmiyorum');

  it('defter BOŞken donukluk diriltme DEĞİL tanıklık alır (kazanılmamış izin)', () => {
    const r = dgKarsilama('hiçbir şey hissetmiyorum', donukNabiz(), { defter: {}, beyan: {} }, null);
    expect(r.eksen).toBe('taniklik');
  });

  it('iki olumlu kayıt YETMEZ — eşik üç (açmak zordur, K6)', () => {
    let ik = { defter: {}, beyan: {} };
    ik = dgIklimDefterEkle(ik, 'diriltme', 2);
    ik = dgIklimDefterEkle(ik, 'diriltme', 2);
    expect(dgKarsilama('hiçbir şey hissetmiyorum', donukNabiz(), ik, null).eksen).toBe('taniklik');
  });

  it('ÜÇ olumlu kayıttan sonra diriltme açılıyor — izin ölçümle kazanıldı', () => {
    let ik = { defter: {}, beyan: {} };
    for (let i = 0; i < 3; i++) ik = dgIklimDefterEkle(ik, 'diriltme', 2);
    expect(dgKarsilama('hiçbir şey hissetmiyorum', donukNabiz(), ik, null).eksen).toBe('diriltme');
  });

  it('sonradan tutmazsa geri kapanıyor — defter kişiyi takip ediyor', () => {
    let ik = { defter: {}, beyan: {} };
    for (let i = 0; i < 3; i++) ik = dgIklimDefterEkle(ik, 'diriltme', 2);
    expect(dgKarsilama('hiçbir şey hissetmiyorum', donukNabiz(), ik, null).eksen).toBe('diriltme');
    for (let i = 0; i < 6; i++) ik = dgIklimDefterEkle(ik, 'diriltme', -3);
    expect(dgKarsilama('hiçbir şey hissetmiyorum', donukNabiz(), ik, null).eksen).toBe('taniklik');
  });
});
