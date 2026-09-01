/**
 * Tests for js/parts/10p-w2-meclis.js — İç Meclis · Suretler (Faz 1)
 *
 *   - invisible_face çıktısından suret taslağı üretimi + slug tekilleştirme
 *   - reddedilen (dismissed) suretlerin filtrelenmesi
 *   - adlandırma akışı: sezilen → adlandi hal geçişi + Elmas ödülü
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// 13-extras'ın tüm grafiğini yüklememek için sadece ihtiyacımız olan export'u mock'la.
const mockGenerate = vi.fn();
vi.mock('../js/parts/13-extras.js', () => ({
  generateInvisibleFaceProfile: (...a) => mockGenerate(...a),
}));

import { S } from '../js/state.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';
import {
  ensureSuretDrafts,
  getSuretler,
  saveSuretAd,
  dismissSuret,
  meclisYuzlesme,
  meclisStartSefer,
  meclisSealSeferDay,
  meclisDialogReward,
  meclisButunles,
  computeButunluk,
  meclisSaveKanit,
  parseDepthLevel,
  computeDepthDeltas,
  canRemeasure,
  meclisRemeasure,
  resolveEngelId,
  seferPerde,
  _aynaName,
  meclisSealToOik,
} from '../js/parts/10p-w2-meclis.js';
import { getElmasSayisi } from '../js/parts/10g-w2-wanderer-game.js';

const SAMPLE_PROFILE = {
  hayattaki_sen_baslik: 'Sürekli Erteleyen',
  suretler: [
    { slug: 'erteleyen', unvan: 'Acıyı yarına atan', koken_oruntu: 'İşleri son ana bırakır',
      ses: 'Yarın daha hazır olacağım', niyet: 'Başarısızlık acısından korur',
      korku: 'Yetersiz görünmek', kor_nokta: 'Ertelemenin de bir seçim olduğu',
      zirh: 'Bahaneler', kokler: ['oz_guven'], ayna: 'Anında başlayan biri' },
    { slug: 'onay-dilenci', unvan: 'Başkasının gözünden var olan', koken_oruntu: 'Onay arar',
      ses: 'Beni sevsinler yeter', niyet: 'Reddedilmekten korur', korku: 'Dışlanmak',
      kor_nokta: 'Kendi onayının yettiği', zirh: 'Memnun etme', kokler: ['oz_saygi'], ayna: 'Hayır diyebilen' },
    // Aynı slug tekrar — tekilleştirilmeli
    { slug: 'Erteleyen', unvan: 'Kopya', koken_oruntu: 'x', kokler: [] },
  ],
};

beforeEach(() => {
  mockGenerate.mockReset();
  S.currentUser = { id: 'user-1' };
  S._suretDrafts = [];
  S._suretler = [];
  S._wandererGame = { elmas: 0 };
  // SafeStorage bellek cache'i localStorage.clear()'tan etkilenmediği için elle sıfırla
  SafeStorage.set('etw_meclis_dismissed_user-1', []);
});

describe('ensureSuretDrafts', () => {
  it('invisible_face suretlerini taslağa çevirir ve slug tekilleştirir', async () => {
    mockGenerate.mockResolvedValue(SAMPLE_PROFILE);
    const drafts = await ensureSuretDrafts();
    expect(drafts).toHaveLength(2); // 'erteleyen' + 'onay-dilenci' (kopya elendi)
    expect(drafts.map(d => d.slug)).toEqual(['erteleyen', 'onay-dilenci']);
    expect(drafts.every(d => d.hal === 'sezilen')).toBe(true);
    expect(drafts[0].niyet).toBe('Başarısızlık acısından korur');
  });

  it('reddedilen suretleri taslaktan çıkarır', async () => {
    SafeStorage.set('etw_meclis_dismissed_user-1', ['onay-dilenci']);
    mockGenerate.mockResolvedValue(SAMPLE_PROFILE);
    const drafts = await ensureSuretDrafts();
    expect(drafts.map(d => d.slug)).toEqual(['erteleyen']);
  });

  it('profil yoksa boş dizi döner', async () => {
    mockGenerate.mockResolvedValue(null);
    const drafts = await ensureSuretDrafts();
    expect(drafts).toEqual([]);
  });
});

describe('getSuretler', () => {
  it('DB boşken yalnızca taslakları döndürür', async () => {
    mockGenerate.mockResolvedValue(SAMPLE_PROFILE);
    await ensureSuretDrafts();
    const merged = await getSuretler();
    expect(merged).toHaveLength(2);
    expect(S._suretler).toBe(merged);
  });
});

describe('saveSuretAd', () => {
  beforeEach(async () => {
    mockGenerate.mockResolvedValue(SAMPLE_PROFILE);
    await ensureSuretDrafts();
    await getSuretler();
    // adlandırma input'u DOM'da olmalı
    document.body.innerHTML = '<input id="meclis-ad-input" value="Yarıncı" />';
  });

  it('sureti adlandırır: hal=adlandi, ad yazılır, Elmas verilir, taslak düşer', async () => {
    await saveSuretAd('erteleyen');
    const s = S._suretler.find(x => x.slug === 'erteleyen');
    expect(s.hal).toBe('adlandi');
    expect(s.ad).toBe('Yarıncı');
    expect(s.named_at).toBeTruthy();
    expect(getElmasSayisi()).toBe(15);
    expect((S._suretDrafts || []).some(d => d.slug === 'erteleyen')).toBe(false);
  });

  it('boş ad ile kaydetmez', async () => {
    document.getElementById('meclis-ad-input').value = '   ';
    await saveSuretAd('erteleyen');
    const s = S._suretler.find(x => x.slug === 'erteleyen');
    expect(s.hal).toBe('sezilen');
    expect(getElmasSayisi()).toBe(0);
  });
});

describe('Faz 2 — Meydan Okuma (bağ / yüzleşme / sefer)', () => {
  function namedSuret(over = {}) {
    return {
      slug: 'erteleyen', ad: 'Yarıncı', unvan: 'Acıyı yarına atan', hal: 'adlandi',
      ayna: 'Anında başlayan biri', bag_seviyesi: 0,
      son_yuzlesme: null, yuzlesme_sayisi: 0,
      sefer_gun: 0, sefer_son_muhur: null, sefer_baslangic: null, ...over,
    };
  }

  it('yüzleşme bağı 6 artırır, Elmas verir; aynı gün tekrar etmez', async () => {
    const s = namedSuret();
    S._suretler = [s];
    await meclisYuzlesme('erteleyen');
    expect(s.bag_seviyesi).toBe(6);
    expect(s.yuzlesme_sayisi).toBe(1);
    expect(s.son_yuzlesme).toBeTruthy();
    expect(getElmasSayisi()).toBe(5);
    // aynı gün ikinci kez — değişmez
    await meclisYuzlesme('erteleyen');
    expect(s.bag_seviyesi).toBe(6);
    expect(getElmasSayisi()).toBe(5);
  });

  it('sefer başlatır ve aktif olur', async () => {
    const s = namedSuret();
    S._suretler = [s];
    await meclisStartSefer('erteleyen');
    expect(s.sefer_baslangic).toBeTruthy();
    expect(s.sefer_gun).toBe(0);
  });

  it('sefer günü mühürler: gün +1, bağ +5; aynı gün tekrar mühürlemez', async () => {
    const s = namedSuret({ sefer_baslangic: new Date().toISOString(), sefer_gun: 0 });
    S._suretler = [s];
    await meclisSealSeferDay('erteleyen');
    expect(s.sefer_gun).toBe(1);
    expect(s.bag_seviyesi).toBe(5);
    expect(getElmasSayisi()).toBe(3);
    await meclisSealSeferDay('erteleyen'); // aynı gün
    expect(s.sefer_gun).toBe(1);
  });

  it('21. gün mühürlenince sefer tamamlanır: bağ=100, tamamlama Elması', async () => {
    const s = namedSuret({ sefer_baslangic: new Date().toISOString(), sefer_gun: 20, bag_seviyesi: 95 });
    S._suretler = [s];
    await meclisSealSeferDay('erteleyen');
    expect(s.sefer_gun).toBe(21);
    expect(s.bag_seviyesi).toBe(100);
    expect(getElmasSayisi()).toBe(25);
  });
});

describe('Faz 3 — Diyalog & Bütünleşme', () => {
  function namedSuret(over = {}) {
    return {
      slug: 'erteleyen', ad: 'Yarıncı', unvan: 'Acıyı yarına atan', hal: 'adlandi',
      ayna: 'Anında başlayan biri', kokler: ['oz_guven'], bag_seviyesi: 0,
      son_diyalog: null, diyalog_sayisi: 0, ...over,
    };
  }

  it('diyalog ödülü: ilk diyalog bağ +4 / Elmas +2; aynı gün ikinci sadece sayacı artırır', async () => {
    const s = namedSuret();
    S._suretler = [s];
    await meclisDialogReward('erteleyen');
    expect(s.bag_seviyesi).toBe(4);
    expect(s.diyalog_sayisi).toBe(1);
    expect(s.son_diyalog).toBeTruthy();
    expect(getElmasSayisi()).toBe(2);
    await meclisDialogReward('erteleyen');
    expect(s.bag_seviyesi).toBe(4);      // bağ değişmez
    expect(s.diyalog_sayisi).toBe(2);    // sayaç artar
    expect(getElmasSayisi()).toBe(2);    // Elmas değişmez
  });

  it('bütünleşme: bağ<100 ise reddeder', async () => {
    const s = namedSuret({ bag_seviyesi: 80 });
    S._suretler = [s];
    await meclisButunles('erteleyen');
    expect(s.hal).toBe('adlandi');
    expect(getElmasSayisi()).toBe(0);
  });

  it('bütünleşme: bağ=100 ise hal=butunlesti, butunlesti_at set, büyük Elmas', async () => {
    const s = namedSuret({ bag_seviyesi: 100 });
    S._suretler = [s];
    await meclisButunles('erteleyen');
    expect(s.hal).toBe('butunlesti');
    expect(s.butunlesti_at).toBeTruthy();
    expect(getElmasSayisi()).toBe(50);
    // tören overlay'i temizle
    document.getElementById('meclis-butunles-overlay')?.remove();
  });
});

describe('Faz 4 — Bütünlük Skoru & Kanıt', () => {
  it('computeButunluk: yalnızca tanınan yüzlerin ortalaması, sezilen sayılmaz', () => {
    const suretler = [
      { hal: 'sezilen', bag_seviyesi: 0 },
      { hal: 'adlandi', bag_seviyesi: 40 },
      { hal: 'butunlesti', bag_seviyesi: 100 },
    ];
    // (40 + 100) / 2 = 70
    expect(computeButunluk(suretler)).toBe(70);
  });

  it('computeButunluk: tanınan yüz yoksa 0', () => {
    expect(computeButunluk([{ hal: 'sezilen' }])).toBe(0);
    expect(computeButunluk([])).toBe(0);
  });

  it('kanıt: diziye eklenir, ilk kanıt bağ +5 / Elmas +4, aynı gün ikincisi bağ artırmaz', async () => {
    const s = { slug: 'erteleyen', ad: 'Yarıncı', hal: 'adlandi', bag_seviyesi: 0, kanitlar: [], son_kanit: null };
    S._suretler = [s];
    document.body.innerHTML = '<input id="meclis-kanit-input" value="Ertelemeden başladım" />';
    await meclisSaveKanit('erteleyen');
    expect(s.kanitlar).toHaveLength(1);
    expect(s.kanitlar[0].t).toBe('Ertelemeden başladım');
    expect(s.bag_seviyesi).toBe(5);
    expect(getElmasSayisi()).toBe(4);
    // aynı gün ikinci kanıt — diziye eklenir ama bağ/Elmas değişmez
    document.body.innerHTML = '<input id="meclis-kanit-input" value="Yine başladım" />';
    await meclisSaveKanit('erteleyen');
    expect(s.kanitlar).toHaveLength(2);
    expect(s.bag_seviyesi).toBe(5);
    expect(getElmasSayisi()).toBe(4);
  });

  it('kanıt: boş metin kaydetmez', async () => {
    const s = { slug: 'erteleyen', ad: 'Yarıncı', hal: 'adlandi', bag_seviyesi: 0, kanitlar: [], son_kanit: null };
    S._suretler = [s];
    document.body.innerHTML = '<input id="meclis-kanit-input" value="   " />';
    await meclisSaveKanit('erteleyen');
    expect(s.kanitlar).toHaveLength(0);
    expect(getElmasSayisi()).toBe(0);
  });
});

describe('Faz 5 — Derinlik Aynası', () => {
  it('parseDepthLevel: TR/EN seviye kelimelerini 0/1/2, bilinmeyeni -1 verir', () => {
    expect(parseDepthLevel('Zayıf — açıklama')).toBe(0);
    expect(parseDepthLevel('Orta')).toBe(1);
    expect(parseDepthLevel('Güçlü — x')).toBe(2);
    expect(parseDepthLevel('Strong reason')).toBe(2);
    expect(parseDepthLevel('Weak')).toBe(0);
    expect(parseDepthLevel('')).toBe(-1);
  });

  it('computeDepthDeltas: yön (up/down/flat) doğru hesaplanır', () => {
    const baseline = { derinlik_haritasi: { standart: 'Zayıf', hak_etmek: 'Orta', normal: 'Güçlü', layik: 'Zayıf' } };
    const latest   = { derinlik_haritasi: { standart: 'Orta',  hak_etmek: 'Orta', normal: 'Orta',  layik: 'Güçlü' } };
    const d = computeDepthDeltas(baseline, latest);
    const by = Object.fromEntries(d.map(x => [x.key, x.dir]));
    expect(by.standart).toBe('up');    // 0→1
    expect(by.hak_etmek).toBe('flat'); // 1→1
    expect(by.normal).toBe('down');    // 2→1
    expect(by.layik).toBe('up');       // 0→2
  });

  it('canRemeasure: baz yoksa kapalı; bütünleşmiş suret varsa açık', () => {
    expect(canRemeasure(null, [])).toBe(false);
    const recentBaseline = { baseline_at: new Date().toISOString() };
    expect(canRemeasure(recentBaseline, [{ hal: 'adlandi' }])).toBe(false);
    expect(canRemeasure(recentBaseline, [{ hal: 'butunlesti' }])).toBe(true);
  });

  it('canRemeasure: 21 günden eski baz açar', () => {
    const old = { baseline_at: new Date(Date.now() - 22 * 86400000).toISOString() };
    expect(canRemeasure(old, [])).toBe(true);
  });

  it('meclisRemeasure: latest snapshot kaydeder, baz korunur, Elmas verir', async () => {
    S._meclisDerinlik = {
      user_id: 'user-1',
      baseline: { derinlik_haritasi: { standart: 'Zayıf', hak_etmek: 'Zayıf', normal: 'Zayıf', layik: 'Zayıf' } },
      baseline_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    };
    mockGenerate.mockResolvedValue({
      derinlik_haritasi: { standart: 'Güçlü', hak_etmek: 'Orta', normal: 'Orta', layik: 'Güçlü' },
      zayif_temeller: [],
    });
    await meclisRemeasure();
    expect(S._meclisDerinlik.latest).toBeTruthy();
    expect(S._meclisDerinlik.latest.derinlik_haritasi.standart).toBe('Güçlü');
    expect(S._meclisDerinlik.baseline.derinlik_haritasi.standart).toBe('Zayıf'); // baz değişmedi
    expect(getElmasSayisi()).toBe(20);
    document.getElementById('meclis-derinlik-overlay')?.remove();
  });
});

describe('dismissSuret', () => {
  it('sureti listeden ve taslaktan çıkarır, reddedilenlere ekler', async () => {
    mockGenerate.mockResolvedValue(SAMPLE_PROFILE);
    await ensureSuretDrafts();
    await getSuretler();
    dismissSuret('erteleyen');
    expect(S._suretler.some(x => x.slug === 'erteleyen')).toBe(false);
    const dismissed = SafeStorage.get('etw_meclis_dismissed_user-1') || [];
    expect(dismissed).toContain('erteleyen');
  });
});

describe('İç Meclis 2.0 — resolveEngelId / seferPerde / _aynaName', () => {
  it('resolveEngelId: temaya uyan metinden deterministik bir engel_id döner', () => {
    const id1 = resolveEngelId(['sürekli erteliyorum, işleri son ana bırakıyorum'], 'erteleyen');
    const id2 = resolveEngelId(['sürekli erteliyorum, işleri son ana bırakıyorum'], 'erteleyen');
    expect(id1).toBe(id2);
    expect(typeof id1).toBe('string');
    expect(id1.length).toBeGreaterThan(0);
  });

  it('resolveEngelId: eşleşme yoksa bile tohumlu bir engel_id döner (asla boş değil)', () => {
    const id = resolveEngelId([], 'herhangi-bir-tohum');
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('seferPerde: gün 0-6 tani, 7-13 kok, 14-20 gecis', () => {
    expect(seferPerde(0)).toBe('tani');
    expect(seferPerde(6)).toBe('tani');
    expect(seferPerde(7)).toBe('kok');
    expect(seferPerde(13)).toBe('kok');
    expect(seferPerde(14)).toBe('gecis');
    expect(seferPerde(20)).toBe('gecis');
  });

  it('_aynaName: suretin kendi aynası varsa onu kullanır', () => {
    expect(_aynaName({ ayna: 'Anında başlayan biri' })).toBe('Anında başlayan biri');
  });

  it('_aynaName: ayna boşsa OİK\'in tek kaynağına (oikGetDesired) hizalanır', () => {
    window.oikGetDesired = () => ({ name: 'Sakin ve kararlı biri' });
    expect(_aynaName({ ayna: '' })).toBe('Sakin ve kararlı biri');
    delete window.oikGetDesired;
  });

  it('_aynaName: ne ayna ne OİK varsa nazik jenerik düşüşe iner', () => {
    S._currentLang = 'tr';
    expect(_aynaName({ ayna: '' })).toBe('olmak istediğin kişi');
  });
});

describe('İç Meclis 2.0 — çok kaynaklı seziş (yp/ap)', () => {
  beforeEach(() => {
    S._suretDrafts = [];
    S._suretler = [];
    SafeStorage.set('etw_meclis_dismissed_user-1', []);
  });

  it('ypGetFullState kör noktaları LLM\'siz taslağa çevirir (kaynak yp)', async () => {
    window.ypGetFullState = () => ({
      kor_noktalar: [{ metin: 'Sürekli onay arayan bir yanın var', guven: 0.7 }],
      celiskiler: [],
    });
    const drafts = await ensureSuretDrafts();
    expect(drafts.length).toBe(1);
    expect(drafts[0].kaynak).toBe('yp');
    expect(drafts[0].hal).toBe('sezilen');
    expect(drafts[0].kor_nokta).toBe('Sürekli onay arayan bir yanın var');
    expect(mockGenerate).not.toHaveBeenCalled(); // legacy profil ÇAĞRILMADI (yp doluyken)
    delete window.ypGetFullState;
  });

  it('yp boşsa legacy invisible_face profiline düşer (geriye uyum)', async () => {
    mockGenerate.mockResolvedValue(SAMPLE_PROFILE);
    const drafts = await ensureSuretDrafts();
    expect(drafts.length).toBe(2);
    expect(drafts.every(d => d.kaynak === 'profil')).toBe(true);
  });

  it('doğrulanmış (dogrulandi) hipotez var olan yp taslağını ap_confirmed işaretler, hal\'i ATLAMAZ', async () => {
    window.ypGetFullState = () => ({
      kor_noktalar: [{ metin: 'Sürekli onay arayan bir yanın var', guven: 0.7 }],
      celiskiler: [],
    });
    window.ypGetHipotezler = () => ([
      { id: 'ap-1', metin: 'Sürekli onay arayan bir yanın var', durum: 'dogrulandi', guven: 0.8 },
    ]);
    const drafts = await ensureSuretDrafts();
    expect(drafts.length).toBe(1); // yeni bir suret AÇILMADI — mevcut zenginleşti
    expect(drafts[0].kaynak).toBe('ap');
    expect(drafts[0].ap_confirmed).toBe(true);
    expect(drafts[0].hal).toBe('sezilen'); // adlandırma töreni atlanmadı
    delete window.ypGetFullState;
    delete window.ypGetHipotezler;
  });

  it('doğrulanmış hipotez yp taslağıyla eşleşmiyorsa kendi taslağını açar', async () => {
    window.ypGetFullState = () => ({ kor_noktalar: [], celiskiler: [] });
    window.ypGetHipotezler = () => ([
      { id: 'ap-2', metin: 'Kendini sürekli başkalarıyla kıyaslıyorsun', durum: 'dogrulandi', guven: 0.9 },
    ]);
    const drafts = await ensureSuretDrafts();
    expect(drafts.length).toBe(1);
    expect(drafts[0].kaynak).toBe('ap');
    expect(drafts[0].ap_confirmed).toBe(true);
    delete window.ypGetFullState;
    delete window.ypGetHipotezler;
  });

  it('henüz "aday" olan (doğrulanmamış) hipotezler taslak üretmez', async () => {
    window.ypGetFullState = () => ({ kor_noktalar: [], celiskiler: [] });
    window.ypGetHipotezler = () => ([
      { id: 'ap-3', metin: 'Kararsızlık gösteren bir yanın var', durum: 'aday', guven: 0.9 },
    ]);
    const drafts = await ensureSuretDrafts();
    expect(drafts.length).toBe(0);
    delete window.ypGetFullState;
    delete window.ypGetHipotezler;
  });
});

describe('İç Meclis 2.0 — OİK mührü (meclisSealToOik)', () => {
  function integratedSuret(over = {}) {
    return {
      slug: 'erteleyen', ad: 'Yarıncı', unvan: 'Acıyı yarına atan', hal: 'butunlesti',
      ayna: 'Anında başlayan biri', oik_madde_id: null, ...over,
    };
  }

  it('oikAddMadde ile kartı işler ve oik_madde_id izini bırakır', async () => {
    window.oikAddMadde = vi.fn(() => 'oik-card-1:davranislar:0');
    const s = integratedSuret();
    S._suretler = [s];
    await meclisSealToOik('erteleyen');
    expect(window.oikAddMadde).toHaveBeenCalledTimes(1);
    expect(s.oik_madde_id).toBe('oik-card-1:davranislar:0');
    delete window.oikAddMadde;
  });

  it('oik_madde_id zaten doluysa tekrar çalışmaz (idempotent)', async () => {
    window.oikAddMadde = vi.fn(() => 'oik-card-1:davranislar:0');
    const s = integratedSuret({ oik_madde_id: 'oik-card-1:davranislar:0' });
    S._suretler = [s];
    await meclisSealToOik('erteleyen');
    expect(window.oikAddMadde).not.toHaveBeenCalled();
    delete window.oikAddMadde;
  });

  it('hal butunlesti değilse çalışmaz', async () => {
    window.oikAddMadde = vi.fn(() => 'x');
    const s = integratedSuret({ hal: 'adlandi' });
    S._suretler = [s];
    await meclisSealToOik('erteleyen');
    expect(window.oikAddMadde).not.toHaveBeenCalled();
    delete window.oikAddMadde;
  });

  it('oikAddMadde yoksa/başarısızsa sessizce hata vermez', async () => {
    const s = integratedSuret();
    S._suretler = [s];
    await expect(meclisSealToOik('erteleyen')).resolves.not.toThrow();
    expect(s.oik_madde_id).toBeFalsy();
  });
});
