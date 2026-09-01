// Geçiş Kartım (10A · iç ad gecis-karti) — saf-mantık + masa testleri
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import {
  _migrateIfV1, _addEntry, _normalizePole,
  emptyKart, gkGetContext,
  _needsLapisRefresh, _rowFromKart, _kartFromRow, gkLoad,
  gkActiveCards, gkCompletedCards, gkPoleFace, gkRingSVG, gkOpenDetail,
  gkSinamaAc, gkSinanabilir,
} from '../js/parts/10A-gecis-karti.js';
// Masa (FAZ 1C) Kişilerim'in TEK deste motorunu tüketir; testte de GERÇEĞİ
// yüklenir — sahte bir deste yüzeyi "ikinci motor yazılmadı"yı kanıtlamaz.
import { kkDeckHTML } from '../js/parts/10q2-kisilerim-bugun.js';
import { deckReady, getFullDeck } from '../js/parts/12b-kart-destesi.js';
import { ikvEnsureStyles } from '../js/parts/12c-kart-gorsel.js';
import { S } from '../js/state.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';

// jsdom rAF güvencesi — _completionCeremony requestAnimationFrame çağırır
beforeEach(() => {
  if (typeof globalThis.requestAnimationFrame !== 'function') {
    globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
  }
  document.body.innerHTML = '';
  S._gecisKartlari = [];
  S._gecisKartiAktif = null;
});

describe('_migrateIfV1', () => {
  it('v1 tek-kutuplu kartı v2 "completed"e göçürür (lapis yok)', () => {
    const v1 = {
      id: 'old1', ihtiyac: 'yarınki sunum',
      baslik: 'Korkuyla Bekleyen', whisper: 'titreyen el',
      dusunceler: ['başaramam'], inanclar: [], duygular: ['kaygı'], davranislar: [],
      sealed: false,
    };
    const v2 = _migrateIfV1(v1);
    expect(v2.golden.baslik).toBe('Korkuyla Bekleyen');
    expect(v2.golden.dusunceler).toEqual(['başaramam']);
    expect(v2.lapis).toBeNull();
    expect(v2.state).toBe('completed'); // lapis yoksa kullanılamaz → tamamlanmış say
    expect(v2.strikes).toEqual({ gordun: false, yurudun: false, oldum: false });
  });

  it('zaten v2 olan kartı (golden var) olduğu gibi döndürür', () => {
    const v2in = { id: 'x', golden: { baslik: 'A' }, lapis: { baslik: 'B' }, state: 'active' };
    expect(_migrateIfV1(v2in)).toBe(v2in);
  });
});

describe('_addEntry', () => {
  it('geçerli maddeyi ekler', () => {
    const pole = emptyKart('x').golden;
    expect(_addEntry(pole, 'duygular', 'içimde bir sıkışma var')).toBe(true);
    expect(pole.duygular).toHaveLength(1);
    expect(pole.duygular[0].src).toBe('user');
  });

  it('TR-duyarlı + noktalama-duyarsız tekrarı reddeder', () => {
    const pole = emptyKart('x').golden;
    _addEntry(pole, 'duygular', 'İçimde Korku');
    expect(_addEntry(pole, 'duygular', 'içimde korku.')).toBe(false); // büyük/küçük + nokta
    expect(pole.duygular).toHaveLength(1);
  });

  it('çok kısa metni ve bilinmeyen kategoriyi reddeder', () => {
    const pole = emptyKart('x').golden;
    expect(_addEntry(pole, 'duygular', 'a')).toBe(false);
    expect(_addEntry(pole, 'bilinmeyen', 'geçerli uzun metin')).toBe(false);
  });

  it('200 karaktere kırpar', () => {
    const pole = emptyKart('x').golden;
    _addEntry(pole, 'dusunceler', 'x'.repeat(400));
    expect(pole.dusunceler[0].text.length).toBe(200);
  });
});

describe('_normalizePole', () => {
  it('dizileri 6 maddeye, metinleri 200 karaktere indirger; kısa olanları atar', () => {
    const out = _normalizePole({
      baslik: 'B'.repeat(80),
      dusunceler: ['ok bir madde', 'a', 'x'.repeat(300), '1', '2', '3', '4', '5', '6'],
    }, 'Varsayılan');
    expect(out.baslik.length).toBe(60);
    expect(out.dusunceler.length).toBeLessThanOrEqual(6);
    expect(out.dusunceler).not.toContain('a'); // <2 karakter atıldı
    expect(out.dusunceler.some(s => s.length === 200)).toBe(true);
    expect(out.inanclar).toEqual([]);
  });

  it('baslik boşsa fallback kullanır', () => {
    expect(_normalizePole({}, 'Olman Gereken').baslik).toBe('Olman Gereken');
  });
});

describe('emptyKart', () => {
  it('aktif, iki-kutuplu bir iskelet üretir', () => {
    const k = emptyKart('bu öfke');
    expect(k.state).toBe('active');
    expect(k.ihtiyac).toBe('bu öfke');
    expect(k.golden.dusunceler).toEqual([]);
    expect(k.lapis.davranislar).toEqual([]);
  });
});

/* VURUŞ SÖKÜMÜ (2026-08-10) — üç tık bir kimlik beyanıydı ve kanıt
   sormuyordu (§6.10). Mühür artık sınamayla düşer; bu blok kapının
   gerçekten kapandığını mühürler — regresyonda geri gelmesin. */
describe('vuruş zinciri söküldü — mühür tıklamayla düşmez', () => {
  it('gkStrike / gkSeal dış sözleşmede YOKTUR', () => {
    expect(typeof window.gkStrike).toBe('undefined');
    expect(typeof window.gkSeal).toBe('undefined');
    expect(typeof window.gkStrikeDefs).toBe('undefined');
    expect(typeof window.gkHeroLabel).toBe('undefined');
    expect(typeof window.gkRehberDurum).toBe('undefined');
    expect(typeof window.gkRehberOk).toBe('undefined');
  });

  it('gkRingSVG tek yay çizer; sınav yoksa yay yanmaz', () => {
    const bos = gkRingSVG(null);
    expect((bos.match(/gk-ring-arc /g) || []).length).toBe(1);
    expect(bos).not.toContain('gk-ring-arc--on');
    expect(bos).toContain('gk-ring-track');
  });

  it('gkRingSVG geçilmiş sınamada halkayı KAPATIR (yüzde yok)', () => {
    const gecti = gkRingSVG({ at: '2026-08-10T00:00:00.000Z', gecti: true });
    expect(gecti).toContain('gk-ring-arc--on');
    expect(gecti).toContain('stroke-dashoffset="0.00"');
  });

  it('k.strikes SİLİNMEZ — eski kayıt gidiş-dönüşte korunur (§4.3 madde 4)', () => {
    const row = _rowFromKart({ id: 'gk_x', strikes: { gordun: true, yurudun: false, oldum: false } }, 'u1');
    expect(row.strikes).toEqual({ gordun: true, yurudun: false, oldum: false });
    expect(_kartFromRow(row).strikes.gordun).toBe(true);
  });

  it('LLM bağlamına vuruş sayısı GİRMEZ (kanıtsız değer)', () => {
    const k = emptyKart('sunum');
    k.golden.baslik = 'Korkuyla Bekleyen';
    k.lapis.baslik = 'Cesaretle Olan';
    k.strikes.gordun = true; k.strikes.yurudun = true;
    S._gecisKartlari = [k];
    S._gecisKartiAktif = k.id;
    const ctx = gkGetContext();
    expect(ctx).toContain('Cesaretle Olan');
    expect(ctx).not.toMatch(/vuruş/i);
    expect(ctx).not.toMatch(/\d\s*\/\s*3/);
  });
});

/* KİŞİLERİM köprüsünün malzemesi — 10q2 bunları window.gk* üzerinden okur.
   Yüzey 10A'dan çıkınca (2026-07-26) bu kapılar modülün dış sözleşmesi oldu. */
describe('köprü malzemesi — 10q2 sözleşmesi', () => {
  function seed(state = 'active') {
    const k = emptyKart('yarınki sunum');
    k.state = state;
    k.golden.baslik = 'Korkuyla Bekleyen';
    k.lapis.baslik  = 'Cesaretle Olan';
    S._gecisKartlari = [k];
    return k;
  }

  it('gkActiveCards yalnız yürünen yolları, gkCompletedCards yalnız mezunları verir', () => {
    const a = seed();
    const b = emptyKart('ikinci'); b.state = 'completed'; b.lapis.baslik = 'Mezun';
    S._gecisKartlari = [a, b];
    expect(gkActiveCards().map(k => k.id)).toEqual([a.id]);
    expect(gkCompletedCards().map(k => k.id)).toEqual([b.id]);
  });

  it('gkRingSVG argümansız çağrıda da çizer (köprü sınavsız kartla çağırır)', () => {
    const svg = gkRingSVG(undefined);
    expect(svg).toContain('class="gk-ring"');
    expect(svg).toContain('gk-ring-track');
  });

  it('gkPoleFace bilinmeyen kartta sessizce boş döner', () => {
    seed();
    expect(gkPoleFace('yok-boyle-bir-kart', 'golden')).toBe('');
  });
});

describe('gkOpenDetail — iki kutup sahnesi', () => {
  it('halkasıyla birlikte açılır (köprü göçünde kırılan yol)', () => {
    const k = emptyKart('detay');
    k.golden.baslik = 'Korkuyla Bekleyen';
    k.lapis.baslik  = 'Cesaretle Olan';
    S._gecisKartlari = [k];

    expect(() => gkOpenDetail('gold', k.id)).not.toThrow();
    const ring = document.querySelector('.atl-detail-ring .gk-ring');
    expect(ring).toBeTruthy();
    // Sınama geçilmemiş — yay çizilir ama yanmaz
    expect(ring.querySelectorAll('.gk-ring-arc--on')).toHaveLength(0);
  });

  it('aktif kart düzenlenebilir gelir — ekleme formu ve "bu yolu bırak" yerinde', () => {
    const k = emptyKart('aktif');
    k.golden.baslik = 'Korkuyla Bekleyen';
    k.lapis.baslik  = 'Cesaretle Olan';
    S._gecisKartlari = [k];

    gkOpenDetail('gold', k.id);
    const ov = document.querySelector('.gk-detail');
    expect(ov.querySelector('.atl-add-form')).toBeTruthy();
    expect(ov.querySelector('.atl-release')).toBeTruthy();
  });

  it('MEZUN kart da açılır ve salt-okunur gelir (kapı sessizce düşmez)', () => {
    const k = emptyKart('mezun');
    k.golden.baslik = 'Korkuyla Bekleyen';
    k.lapis.baslik  = 'Cesaretle Olan';
    _addEntry(k.lapis, 'duygular', 'içimde bir genişleme var');
    k.state = 'completed';
    S._gecisKartlari = [k];

    gkOpenDetail('lapis', k.id);           // destedeki mezun yüz bu paletle çağırır
    const ov = document.querySelector('.gk-detail');
    expect(ov).toBeTruthy();
    expect(ov.querySelector('.atl-detail-name').textContent).toBe('Cesaretle Olan');
    expect(ov.querySelector('.atl-line-txt').textContent).toContain('genişleme');
    // Geçmiş düzenlenmez
    expect(ov.querySelector('.atl-add-form')).toBeNull();
    expect(ov.querySelector('.atl-line-x')).toBeNull();
    expect(ov.querySelector('.atl-release')).toBeNull();
    // Mezunda lapis kutup ALTIN yüzle görünür — su (lapis) katmanı açılmaz
    expect(ov.classList.contains('atl-onb--su')).toBe(false);
  });

  it('mezun kartta silme tıklaması maddeyi düşürmez (salt-okunur kapısı)', () => {
    const k = emptyKart('mezun2');
    k.golden.baslik = 'Kaçan';
    k.lapis.baslik  = 'Duran';
    _addEntry(k.lapis, 'dusunceler', 'buradan kaçmam gerekmiyor');
    k.state = 'completed';
    S._gecisKartlari = [k];

    gkOpenDetail('lapis', k.id);
    const ov = document.querySelector('.gk-detail');
    // Buton DOM'da yok; elle enjekte edip tıklasak bile handler geçirmez
    const li = ov.querySelector('.atl-line');
    const x = document.createElement('button');
    x.className = 'atl-line-x';
    x.dataset.cat = 'dusunceler';
    x.dataset.i = '0';
    li.appendChild(x);
    x.click();
    expect(k.lapis.dusunceler).toHaveLength(1);
  });

  it('lapis kutbu olmayan (v1 göçü) kartta var olan kutba düşer', () => {
    const k = emptyKart('v1');
    k.golden.baslik = 'Yalnız Kalan';
    k.lapis = null;
    k.state = 'completed';
    S._gecisKartlari = [k];

    expect(() => gkOpenDetail('lapis', k.id)).not.toThrow();
    const ov = document.querySelector('.gk-detail');
    expect(ov.querySelector('.atl-detail-name').textContent).toBe('Yalnız Kalan');
  });
});

/* ── MASA (FAZ 1C) — ekranın üstü iki DESTE, altı öne gelen kart ──
   Deste yüzeyi Kişilerim'in TEK motorudur; bu blok gerçek 10q2'yi yükler.
   Paralel bir deste yazılmadığının kanıtı, masada 10q2'nin kendi
   sınıflarının (.kkb-stack, .kkb-count) çizilmesidir. */
describe('gkOpenDetail — masa destesi', () => {
  let DECK = [];
  beforeAll(async () => {
    await deckReady();
    DECK = getFullDeck();
    try { ikvEnsureStyles(); } catch (_) {}   // jsdom stil ısınması (bkz. 10q2 süiti)
  }, 30000);

  beforeEach(() => {
    S.currentUser = { id: 'u-masa' };
    S._kisiKarti = {
      profile: {}, collection: {}, history: [], pending: [],
      seenIntro: true, lastTick: 0, closest: null, hedefler: {},
    };
    ['imGetCurrent', 'imIsCurrentPersona', 'kkGetHedefler', 'kkEsikNisanHTML']
      .forEach(x => { delete window[x]; });
  });

  const aktifKart = (ihtiyac = 'masa') => {
    const k = emptyKart(ihtiyac);
    k.golden.baslik = 'Korkuyla Bekleyen';
    k.lapis.baslik  = 'Cesaretle Olan';
    return k;
  };
  const kazan = id => { S._kisiKarti.collection[id] = { earnedAt: '2026-01-01T00:00:00.000Z', rarity: 'yaygin' }; };
  const ov   = () => document.querySelector('.gk-detail');
  const ad   = () => ov().querySelector('.atl-detail-name').textContent;
  const ileri = kind => ov().querySelector(`.atl-masa-deste--${kind} [data-kkb-kaydir="${kind}:1"]`).click();

  it('iki desteyi Kişilerim\'in yüzeyiyle çizer; açılış kutbu öne gelir', () => {
    const k = aktifKart();
    S._gecisKartlari = [k];
    gkOpenDetail('gold', k.id);

    expect(ov().querySelector('.atl-masa-deste--altin .kkb-stack')).toBeTruthy();
    expect(ov().querySelector('.atl-masa-deste--lapis .kkb-stack')).toBeTruthy();
    expect(ov().querySelector('.atl-masa-deste--altin').classList.contains('is-active')).toBe(true);
    expect(ad()).toBe('Korkuyla Bekleyen');
  });

  it('lapis kutbuyla açılınca masa LAPİS desteden başlar', () => {
    const k = aktifKart();
    S._gecisKartlari = [k];
    gkOpenDetail('lapis', k.id);

    expect(ov().querySelector('.atl-masa-deste--lapis').classList.contains('is-active')).toBe(true);
    expect(ad()).toBe('Cesaretle Olan');
  });

  it('mezun kartın lapis kutbu ALTIN destede aranır — palet desteyi seçmez', () => {
    const k = aktifKart('mezun');
    k.state = 'completed';
    k.sealed_at = '2026-07-20T00:00:00.000Z';
    S._gecisKartlari = [k];
    gkOpenDetail('lapis', k.id);

    expect(ov().querySelector('.atl-masa-deste--altin').classList.contains('is-active')).toBe(true);
    expect(ad()).toBe('Cesaretle Olan');
    expect(ov().querySelector('.atl-add-form')).toBeNull();   // mezun salt-okunur
  });

  it('deste kaydırılınca ekranın ALTI da o karta geçer', () => {
    const k = aktifKart();
    S._gecisKartlari = [k];
    kazan(DECK[0].id);
    gkOpenDetail('gold', k.id);
    expect(ad()).toBe('Korkuyla Bekleyen');

    ileri('altin');
    expect(ad()).toBe(DECK[0].name);
  });

  it('masanın imleci DIŞ imleçtir — imleçsiz çizimi kaydırmaz', () => {
    const k = aktifKart();
    S._gecisKartlari = [k];
    kazan(DECK[0].id);
    // Bugün'ün kendi imleci 2026-08-18'de bölümle birlikte kalktı; imleçsiz
    // çizim yüzeyin varsayılanıdır ve masanın gezinmesinden etkilenmemeli.
    const sayacsiz = () => {
      const kap = document.createElement('div');
      kap.innerHTML = kkDeckHTML('altin');
      return kap.querySelector('.kkb-deste--altin .kkb-count b').textContent;
    };
    expect(sayacsiz()).toBe('1');

    gkOpenDetail('gold', k.id);
    ileri('altin');

    expect(ov().querySelector('.atl-masa-deste--altin .kkb-count b').textContent).toBe('2');
    expect(sayacsiz()).toBe('1');
  });

  it('katalog kartı salt-okunur gelir; ihtiyaç sözcüğü ÇİZİLMEZ (§6.10)', () => {
    const k = aktifKart();
    S._gecisKartlari = [k];
    kazan(DECK[0].id);
    gkOpenDetail('gold', k.id);
    expect(ov().querySelector('.atl-ore-note')).toBeTruthy();   // geçiş kutbunun ihtiyacı VAR

    ileri('altin');
    expect(ov().querySelector('.atl-ore-note')).toBeNull();     // katalog kartının YOK
    expect(ov().querySelector('.atl-add-form')).toBeNull();
    expect(ov().querySelector('.atl-line-x')).toBeNull();
    expect(ov().querySelector('.atl-release')).toBeNull();
  });

  it('salt-okunur hâl kendini söyler — form\'un yokluğu sessiz kalmaz', () => {
    const k = aktifKart();
    S._gecisKartlari = [k];
    kazan(DECK[0].id);
    gkOpenDetail('gold', k.id);
    expect(ov().querySelector('.atl-masa-not')).toBeNull();      // yazılabilir kutupta susar

    ileri('altin');                                              // → katalog kartı
    const not = ov().querySelector('.atl-masa-not');
    expect(not).toBeTruthy();
    expect(not.textContent.trim()).toBe('Bu kart burada okunur, yazılmaz.');
  });

  it('mezun yolda hüküm yola aittir, karta değil', () => {
    const k = aktifKart('mezun2');
    k.state = 'completed';
    k.sealed_at = '2026-07-20T00:00:00.000Z';
    S._gecisKartlari = [k];
    gkOpenDetail('lapis', k.id);

    expect(ov().querySelector('.atl-masa-not').textContent.trim())
      .toBe('Yürünmüş yol geri yazılmaz.');
  });

  it('katalog kartının hisleri kutbun duygular yuvasında görünür (çeviri tek yerde)', () => {
    const c = DECK.find(x => Array.isArray(x.hisler) && x.hisler.length);
    expect(c).toBeTruthy();
    const k = aktifKart();
    S._gecisKartlari = [k];
    kazan(c.id);
    gkOpenDetail('gold', k.id);
    ileri('altin');

    // CATS sırası: dusunceler ☉ · inanclar ✷ · duygular ❍ · davranislar ✺
    const duygular = ov().querySelectorAll('.atl-group')[2];
    expect(duygular.querySelectorAll('.atl-line-txt')).toHaveLength(c.hisler.length);
    expect(duygular.querySelector('.atl-line-txt').textContent).toBe(c.hisler[0]);
  });

  /* SINAMA KAPISI (FAZ 5) — mühür tıklamayla değil kanıtla düşer. Kapı bir
     iddiadır ve iddia hedefe bakarak edilir: yalnız LAPİS kutup öndeyken. */
  const kapi = () => ov().querySelector('[data-act="sinama"]');

  it('kapı LAPİS kutup öndeyken çizilir, altın kutupta çizilmez', () => {
    const k = aktifKart();
    S._gecisKartlari = [k];
    gkOpenDetail('lapis', k.id);
    expect(kapi()).toBeTruthy();
    // `_kapat` overlay'i 320 ms sonra kaldırır; ikinci açılış ona takılmasın
    // diye sahne doğrudan sökülür (guard: `.gk-detail` varsa açmaz).
    ov().remove();

    gkOpenDetail('gold', k.id);
    expect(kapi()).toBeFalsy();
  });

  it('mezun kartta kapı YOKTUR — yürünmüş yol yeniden sınanmaz', () => {
    const k = aktifKart();
    k.state = 'completed';
    k.sealed_at = '2026-07-20T00:00:00.000Z';
    S._gecisKartlari = [k];
    gkOpenDetail('lapis', k.id);
    expect(kapi()).toBeFalsy();
  });

  it('dinlenmedeki yolda kapı yerine hâl cümlesi durur — gün SAYISI yazmaz', () => {
    window.olusSinamaBeklemeSinav = (s) => (s && !s.gecti ? 5 : 0);
    const k = aktifKart();
    k.sinav = { at: new Date().toISOString(), gecti: false };
    S._gecisKartlari = [k];
    gkOpenDetail('lapis', k.id);
    expect(kapi()).toBeFalsy();
    const not = ov().querySelector('.atl-sinama-bekle');
    expect(not).toBeTruthy();
    expect(not.textContent).not.toMatch(/\d/);
    delete window.olusSinamaBeklemeSinav;
  });

  it('kapı sınamayı LAPİS kutupla, kartın KENDİ defteriyle açar', async () => {
    const k = aktifKart();
    k.golden.dusunceler = [{ text: 'kaçmalıyım', src: 'user' }];
    k.lapis.duygular = [{ text: 'içimde bir genişleme var', src: 'user' }];
    S._gecisKartlari = [k];
    let gelen = null;
    window.olusSinamaAc = (id, opts) => { gelen = { id, opts }; return true; };

    gkOpenDetail('lapis', k.id);
    kapi().click();
    await new Promise(r => setTimeout(r, 420));      // masa kapanır, sınama açılır

    expect(gelen).toBeTruthy();
    expect(gelen.id).toBeNull();                     // katalog id'si YOK
    expect(gelen.opts.card.name).toBe('Cesaretle Olan');
    // Kutup 'duygular' der, sınama 'hisler' — çeviri gkPoleAsCard'da
    expect(gelen.opts.card.hisler).toEqual(['içimde bir genişleme var']);
    expect(gelen.opts.goldPole.card.name).toBe('Korkuyla Bekleyen');

    // Defter kartın kendi kaydıdır — kk.esik'e yazılmaz
    gelen.opts.defter.yaz({ at: '2026-08-10T00:00:00.000Z', gecti: false });
    expect(k.sinav.gecti).toBe(false);
    expect(gelen.opts.defter.oku()).toBe(k.sinav);
    expect(S._kisiKarti.esik).toBeUndefined();

    delete window.olusSinamaAc;
  });

  it('sınama geçince tamamlanma töreni açılır ve kanıtlı davranış deftere düşer', async () => {
    const k = aktifKart();
    S._gecisKartlari = [k];
    S._gecisKartiAktif = k.id;
    const olaylar = [];
    window.imEvent = (t) => olaylar.push(t);
    let onGecti = null;
    window.olusSinamaAc = (id, opts) => { onGecti = opts.onGecti; return true; };

    gkOpenDetail('lapis', k.id);
    kapi().click();
    await new Promise(r => setTimeout(r, 420));

    onGecti({ gecti: true, kanitli: 3, boyutlar: { davranislar: { yasandi: true, alinti: 'durdum' } } });
    expect(document.querySelector('.gk-completion')).toBeTruthy();
    expect(olaylar).toContain('davranis_kaniti');

    delete window.olusSinamaAc;
    delete window.imEvent;
  });

  it('kanıtsız davranış boyutu davranış kanıtı ÜRETMEZ (§6.10)', async () => {
    const k = aktifKart();
    S._gecisKartlari = [k];
    const olaylar = [];
    window.imEvent = (t) => olaylar.push(t);
    let onGecti = null;
    window.olusSinamaAc = (id, opts) => { onGecti = opts.onGecti; return true; };

    gkOpenDetail('lapis', k.id);
    kapi().click();
    await new Promise(r => setTimeout(r, 420));

    onGecti({ gecti: true, kanitli: 3, boyutlar: { davranislar: { yasandi: false, alinti: null } } });
    expect(olaylar).not.toContain('davranis_kaniti');

    delete window.olusSinamaAc;
    delete window.imEvent;
  });

  it('sınav kaydı gidiş-dönüşte korunur (tablo kolonu + KV aynası)', () => {
    const kayit = { at: '2026-08-10T00:00:00.000Z', gecti: false, eksik: 'davranislar', alintilar: null };
    const row = _rowFromKart({ id: 'gk_s', sinav: kayit }, 'u1');
    expect(row.sinav).toEqual(kayit);
    expect(_kartFromRow(row).sinav).toEqual(kayit);
    // Kolon henüz yokken tablo sınavsız döner — çözücü sessizce null verir
    expect(_kartFromRow({ id: 'gk_s', state: 'active' }).sinav).toBeNull();
  });

  it('v1 göçü kartı (lapis YOK) sınanmaz — tören k.lapis okur', () => {
    const k = aktifKart();
    k.lapis = null;
    S._gecisKartlari = [k];
    expect(gkSinanabilir(k)).toBe(false);
    expect(gkSinamaAc(k.id)).toBe(false);
  });
});

describe('gkGetContext', () => {
  it('aktif kart yoksa boş döner', () => {
    expect(gkGetContext()).toBe('');
  });

  it('aktif kartta iki kutbu birden içerir', () => {
    const k = emptyKart('anneme dönüş');
    k.golden.baslik = 'Affetmeyen Yargıç';
    k.lapis.baslik = 'Bağışlayan Tanık';
    S._gecisKartlari = [k];
    S._gecisKartiAktif = k.id;
    const ctx = gkGetContext();
    expect(ctx).toContain('Affetmeyen Yargıç');
    expect(ctx).toContain('Bağışlayan Tanık');
  });
});

describe('_needsLapisRefresh — Tek Nefes bayatlık eşiği', () => {
  const proposed = {
    baslik: 'Korkuyla Bekleyen', whisper: 'titreyen el',
    dusunceler: ['başaramam', 'geç kaldım'], inanclar: [],
    duygular: ['kaygı'], davranislar: ['erteliyorum'],
  };

  it('hiç değişiklik yoksa false — lapis anında sunulur', () => {
    const confirmed = {
      baslik: 'Korkuyla Bekleyen',
      dusunceler: ['başaramam', 'geç kaldım'], inanclar: [],
      duygular: ['kaygı'], davranislar: ['erteliyorum'],
    };
    expect(_needsLapisRefresh(confirmed, proposed)).toBe(false);
  });

  it('yalnız büyük/küçük + noktalama farkı değişiklik SAYILMAZ', () => {
    const confirmed = {
      baslik: 'korkuyla bekleyen',
      dusunceler: ['Başaramam.', 'geç kaldım'], inanclar: [],
      duygular: ['KAYGI'], davranislar: ['erteliyorum'],
    };
    expect(_needsLapisRefresh(confirmed, proposed)).toBe(false);
  });

  it('başlık değişince true', () => {
    const confirmed = { ...proposed, baslik: 'Affetmeyen Yargıç' };
    expect(_needsLapisRefresh(confirmed, proposed)).toBe(true);
  });

  it('madde çıkarılınca / eklenince true', () => {
    expect(_needsLapisRefresh({ ...proposed, dusunceler: ['başaramam'] }, proposed)).toBe(true);
    expect(_needsLapisRefresh(
      { ...proposed, duygular: ['kaygı', 'öfke'] }, proposed)).toBe(true);
  });

  it('öneri hiç yoksa (dual lapis üretemedi) true', () => {
    expect(_needsLapisRefresh(proposed, null)).toBe(true);
  });
});

describe('_rowFromKart / _kartFromRow — gecis_kartlarim gidiş-dönüş', () => {
  it('kart → satır → kart kayıpsız döner (omurga alanları)', () => {
    const k = emptyKart('yarınki sunum', 'sohbet');
    k.golden.baslik = 'Korkuyla Bekleyen';
    k.lapis.baslik = 'Cesaretle Olan';
    k.strikes.gordun = true;
    const row = _rowFromKart(k, 'uid-123');
    expect(row.user_id).toBe('uid-123');
    expect(row.source).toBe('sohbet');
    const back = _kartFromRow(row);
    expect(back.id).toBe(k.id);
    expect(back.golden.baslik).toBe('Korkuyla Bekleyen');
    expect(back.lapis.baslik).toBe('Cesaretle Olan');
    expect(back.strikes).toEqual({ gordun: true, yurudun: false, oldum: false });
    expect(back.state).toBe('active');
    expect(back.shared).toBe(false);
  });

  it('bozuk satır alanlarını güvenli varsayılanlara çeker', () => {
    const back = _kartFromRow({ id: 'ak_x', state: 'garip', strikes: null });
    expect(back.state).toBe('completed'); // bilinmeyen state görünmez sınıfa düşmesin
    expect(back.strikes).toEqual({ gordun: false, yurudun: false, oldum: false });
    expect(back.golden).toBeNull();
  });

  it('ihtiyacı 280 karaktere kırpar (DB sözleşmesi)', () => {
    const k = emptyKart('x'.repeat(500));
    expect(_rowFromKart(k, 'u').ihtiyac.length).toBeLessThanOrEqual(280);
  });
});

/* ═══════════════════════════════════════════════════════════════
   AD SENKRONU GÖÇÜ (§4.3) — etw_an_kartlari_v2 → etw_gecis_kartlari_v1
   Zincir üç halkalı: yeni ad → "Benim Kartım" dönemi v2 → tek-kutuplu v1.
═══════════════════════════════════════════════════════════════ */
describe('ad senkronu — eski storage anahtarlarından geri-okuma', () => {
  const UID = 'test-uid-gecis';
  const YENI = `etw_gecis_kartlari_v1_${UID}`;
  const V2   = `etw_an_kartlari_v2_${UID}`;
  const V1   = `etw_an_kartlari_v1_${UID}`;

  beforeEach(() => {
    S.currentUser = { id: UID };
    [YENI, V2, V1].forEach(k => { try { SafeStorage.remove(k); } catch (_) {} });
    S._gecisKartlari = [];
  });

  it('v2 ("Benim Kartım" dönemi) anahtarındaki kartlar taşınır', () => {
    const kart = { ...emptyKart(), id: 'gk_x', golden: { baslik: 'Eski Kutup' } };
    SafeStorage.setRaw(V2, JSON.stringify({ kartlar: [kart], aktif: null }));

    gkLoad();

    expect(S._gecisKartlari.length).toBe(1);
    expect(S._gecisKartlari[0].golden.baslik).toBe('Eski Kutup');
    expect(SafeStorage.getRaw(YENI)).not.toBe(null);   // yeni ada yazıldı
    expect(SafeStorage.getRaw(V2)).not.toBe(null);     // eski SİLİNMEDİ
  });

  it('yeni anahtar doluysa eski adlar onu EZMEZ', () => {
    SafeStorage.setRaw(YENI, JSON.stringify({
      kartlar: [{ ...emptyKart(), id: 'gk_yeni', golden: { baslik: 'Yeni' } }], aktif: null,
    }));
    SafeStorage.setRaw(V2, JSON.stringify({
      kartlar: [{ ...emptyKart(), id: 'gk_eski', golden: { baslik: 'Eski' } }], aktif: null,
    }));

    gkLoad();

    expect(S._gecisKartlari[0].golden.baslik).toBe('Yeni');
  });

  it('hiçbir anahtar yoksa sessizce düşer', () => {
    gkLoad();
    expect(S._gecisKartlari).toEqual([]);
  });
});
