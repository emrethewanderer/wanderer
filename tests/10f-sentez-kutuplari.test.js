// Üç Mühür kutupları SENTEZDİR (10f)
//   ALTIN = olunan herkesin toplamı  → Portre (02c)
//   LAPİS = olunmak istenen herkesin özeti → OİK aktif kartı (10D)
// Tekil kişiler Bugün'ün iki destesinde yaşar (10q2) — burada toplam durur.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { yolPoles, yolRenderHero, yolOpenSabir, yolFeedNames, yolDayRings } from '../js/parts/10f-w2-yol.js';
import { t } from '../js/parts/15-i18n.js';
import { S } from '../js/state.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';

const bosPortre = () => ({
  dusunceler: [], inanclar: [], duygular: [], davranislar: [],
  baslik: '', portrait: '', confirmed: false, version: 1, history: [], sahne: null,
});

beforeEach(() => {
  document.body.innerHTML = '';
  S._portre = bosPortre();
  S._oik = { cards: [], activeCardId: null, readingLog: {}, crystalMilestone: 0, seedHint: null };
  S._kisiKarti = { profile: {}, collection: {}, history: [], pending: [], closest: null, hedefler: {} };
  S._personTransition = { desired: { description: '' }, last_updated: null };
  delete window.imGetCurrent;
  delete window.oikGetCard;
  delete window.oikGetDesired;
  delete window.oikCardName;
  delete window.porCardName;
  delete window.byGetYapi;
  delete window.usSeriesState;
});

afterEach(() => {
  delete window.usSeriesState;
  delete window.imGetCurrent;
  delete window.oikGetCard;
  delete window.oikGetDesired;
  delete window.oikCardName;
  delete window.porCardName;
  delete window.byGetYapi;
  delete window.msAnaMesafe;
  document.getElementById('ys-modal')?.remove();
  // Şerit sayacı sahte zaman kullanan testlerden gerçek zamana sızmasın
  vi.useRealTimers();
});

/* Sözlükteki cümlenin ekranda görünecek hâli — etiketler sökülür, çünkü
   textContent HTML taşımaz. Beklenen metni testin içine ELLE yazmak
   sözleşmeyi kopyalamak olurdu; kaynak tektir. */
const trMetin = (key, n) => t(key).replace('{n}', n).replace(/<\/?b>/g, '');

/* Hero'yu ölçülü/ölçüsüz çizmenin ortak kurulumu */
const heroCiz = (pct) => {
  document.body.innerHTML = '<div id="yol-hero"></div>';
  if (pct == null) delete window.msAnaMesafe;
  else window.msAnaMesafe = () => pct;
  yolRenderHero();
};

describe('ALTIN kutup — olunanların toplamı', () => {
  it('onaylı Portre varsa SENTEZ kartı gelir, tekil kimlik kartı DEĞİL', () => {
    S._portre.confirmed = true;
    S._portre.baslik = 'Sözünü Tutan';
    window.porCardName = () => 'Olunan Emre';
    window.imGetCurrent = () => ({ cardId: 'x', card: { id: 'x', name: 'TEKİL KART' } });

    expect(yolPoles().goldName).toBe('Olunan Emre');
  });

  it('Portre henüz onaylanmadıysa Kimlik Motoru kartı vekâlet eder', () => {
    window.imGetCurrent = () => ({ cardId: 'x', card: { id: 'x', name: 'TEKİL KART' } });
    expect(yolPoles().goldName).toBe('TEKİL KART');
  });

  it('hiçbiri yoksa davet kartına düşer (uydurma isim yok)', () => {
    expect(typeof yolPoles().goldName).toBe('string');
    expect(yolPoles().goldFace).toContain('<');
  });

  it('Portrenin sahnesi kart yüzüne geçer (12d reçetesi kaybolmaz)', () => {
    S._portre.confirmed = true;
    S._portre.baslik = 'Sözünü Tutan';
    S._portre.sahne = { motif: 'kapi', bitki: 'kok' };
    expect(() => yolPoles()).not.toThrow();
    expect(yolPoles().goldFace).toBeTruthy();
  });
});

describe('LAPİS kutup — olunmak istenenlerin özeti', () => {
  it('OİK aktif kartı varsa o gelir — "en yakın kart" ONU EZMEZ', () => {
    window.oikGetCard = () => ({ id: 'oik_1', baslik: 'Cesaretle Duran', whisper: 'korkuya rağmen' });
    S._kisiKarti.closest = { cardId: 'gercek-bireysel-ozsaygi', score: 88 };
    expect(yolPoles().lapisName).toBeTruthy();
  });

  it('kartın ADI kullanıcınındır ("Niyet Alınan [Ad]"), LLM başlığı epitete iner', () => {
    window.oikGetCard = () => ({ id: 'oik_1', baslik: 'Cesaretle Duran', whisper: 'korkuya rağmen' });
    window.oikCardName = () => 'Niyet Alınan Emre';
    // Hero'da mini kart basılır — epitet (ikv-sub) mini yüzde bilerek gizlidir
    // (12c prensip 6). Ad kutbun yüzü, epitet detay ekranlarının işi.
    expect(yolPoles().lapisName).toBe('Niyet Alınan Emre');
    expect(yolPoles().lapisFace).toContain('Niyet Alınan Emre');
  });

  it('oikCardName yoksa epitet ada vekâlet eder (eski davranış korunur)', () => {
    window.oikGetCard = () => ({ id: 'oik_1', baslik: 'Cesaretle Duran', whisper: '' });
    expect(yolPoles().lapisName).toBe('Cesaretle Duran');
  });

  it('OİK kartı yoksa legacy desired aynasına düşer', () => {
    window.oikGetCard = () => null;
    window.oikGetDesired = () => ({ description: 'Sakin Olan' });
    const name = yolPoles().lapisName;
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });

  it('başlıksız OİK kartı kutbu ele geçirmez', () => {
    window.oikGetCard = () => ({ id: 'oik_bos', baslik: '', whisper: '' });
    expect(yolPoles().lapisName).not.toBe('');
  });
});

describe('sözleşme — yolPoles çıktı biçimi korunur (10u ultra anı okur)', () => {
  it('dört alan da döner', () => {
    const p = yolPoles();
    expect(Object.keys(p).sort()).toEqual(['goldFace', 'goldName', 'lapisFace', 'lapisName']);
  });
});

/* Hero çizgisi "ne kadar"ı söyler, "ne zaman"ı Sabır Kartı'na bırakır.
   Sayı ile dolgunun tek kaynaktan (13x msAnaMesafe → --ms-pct) beslenmesi
   sözleşmedir: ayrışırlarsa çubuk bir şey, cümle başka şey söyler.
   Sayıyı taşıyan yüzey çizginin ucundaki çıplak rakam DEĞİL, çizginin
   altındaki cümledir — Eşik Ekranı'yla paylaşılan tek metin
   (esik.path.label). Anahtar kopyalanırsa iki ekran ayrışır. */
describe('Bugün hero — mesafe cümlesi', () => {
  it('ölçü yokken sayı da dolgu da HİÇ basılmaz ("%0 yakınsın" ilk cümle olamaz)', () => {
    heroCiz(null);
    expect(document.querySelector('.yol-label b')).toBeNull();
    expect(document.querySelector('.yol-label--mesafe')).toBeNull();
    expect(document.querySelector('.yol-fill')).toBeNull();
    expect(document.getElementById('yol-path-btn').getAttribute('style')).toBeNull();
  });

  it('ölçü varsa cümle ve dolgu aynı sayıyı taşır', () => {
    heroCiz(67);
    const b = document.querySelector('.yol-label b');
    expect(b).not.toBeNull();
    expect(b.textContent).toContain('67');
    expect(document.getElementById('yol-path-btn').style.getPropertyValue('--ms-pct')).toBe('67%');
    expect(document.querySelector('.yol-fill')).not.toBeNull();
  });

  it('cümle Eşik Ekranı ile AYNI metindir — anahtar kopyalanmadı', () => {
    heroCiz(67);
    const label = document.querySelector('.yol-label').textContent;
    expect(label).toBe(trMetin('esik.path.label', 67));
    expect(label).not.toContain('{n}');   // yer tutucu ekranda kalmasın
  });

  it('çizgi cümleye yaslanır — mesafe konuşurken ayrı bir hizası vardır', () => {
    heroCiz(67);
    expect(document.querySelector('.yol-label').className).toContain('yol-label--mesafe');
  });

  it('sayı ekran okuyucuya iki kez okunmaz — cümle söyler, buton susar', () => {
    heroCiz(42);
    const aria = document.getElementById('yol-path-btn').getAttribute('aria-label');
    expect(aria).not.toContain('42');
    expect(document.querySelector('.yol-label').textContent).toContain('42');
  });

  it('ultra günü sayı konuşmaz — mesafe o gün kapanmıştır', () => {
    window.usSeriesState = () => ({ n: 3, activeToday: true, pct: 100, target: 7 });
    heroCiz(67);
    delete window.usSeriesState;
    expect(document.querySelector('.yol-label').className).not.toContain('yol-label--mesafe');
    expect(document.querySelector('.yol-label b')).toBeNull();
  });

  it('çizgi Sabır Kartı\'nın kapısıdır — sayıya dokunmak "ne zaman"a götürür', () => {
    heroCiz(42);
    document.getElementById('yol-path-btn').click();
    expect(document.getElementById('ys-modal')).not.toBeNull();
  });
});

describe('Sabır Kartı — çıkışlar ve odak', () => {
  it('çift açılış tek kopya bırakır', () => {
    yolOpenSabir();
    yolOpenSabir();
    expect(document.querySelectorAll('#ys-modal').length).toBe(1);
  });

  it('Escape kartı kapatır', () => {
    yolOpenSabir();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.getElementById('ys-modal').className).toContain('ys-modal--out');
  });

  it('Escape dinleyicisi kart kapanınca sökülür (kartsız Escape patlamaz)', () => {
    yolOpenSabir();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    document.getElementById('ys-modal')?.remove();
    expect(() => document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))).not.toThrow();
  });

  it('odak kartı açan düğüme geri döner', () => {
    heroCiz(42);
    const cizgi = document.getElementById('yol-path-btn');
    cizgi.focus();
    cizgi.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.activeElement).toBe(cizgi);
  });
});

/* KUTBU KURAN KARTLAR — şerit ikinci bir defter TUTMAZ; Benlik Yapısı'nın
   (10q3 byGetYapi) okuduğu izleri okur. İki ekran farklı liste gösterirse
   kullanıcı hangisinin kendi kartını kurduğunu bilemez. */
describe('kutup şeridi — bu kartı kimler kurdu', () => {
  const yapi = (altin, lapis) => { window.byGetYapi = () => ({ altin, lapis }); };
  const ad = (n) => ({ id: 'k' + n, name: 'Kart ' + n });

  it('kaynak yoksa şerit sessizdir — uydurma ad basılmaz', () => {
    delete window.byGetYapi;
    expect(yolFeedNames()).toEqual({ gold: [], lapis: [] });
  });

  it('adlar tek kaynaktan gelir, byGetYapi sırasını korur (en yeni önce)', () => {
    yapi([{ id: 'a', name: 'Sözünü Tutan' }, { id: 'b', name: 'Sabırla Duran' }],
         [{ id: 'c', name: 'Cesaretle Bakan' }]);
    expect(yolFeedNames()).toEqual({
      gold: ['Sözünü Tutan', 'Sabırla Duran'],
      lapis: ['Cesaretle Bakan'],
    });
  });

  it('adsız düğüm şeride boş satır sokmaz', () => {
    yapi([{ id: 'a' }, { id: 'b', name: 'Adı Olan' }], []);
    expect(yolFeedNames().gold).toEqual(['Adı Olan']);
  });

  it('şerit en yeni 6 adla sınırlı — büyüyen koleksiyon hero\'yu boğmaz', () => {
    yapi(Array.from({ length: 40 }, (_, i) => ad(i)), []);
    const g = yolFeedNames().gold;
    expect(g.length).toBe(6);
    expect(g[0]).toBe('Kart 0');
  });

  it('her iki kutbun altına da basılır — biri boşken hiza bozulmaz', () => {
    yapi([{ id: 'a', name: 'Sözünü Tutan' }], []);
    heroCiz(50);
    expect(document.querySelectorAll('.yol-feed').length).toBe(2);
    expect(document.querySelector('.yol-pole--gold .yol-feed-item').textContent).toBe('Sözünü Tutan');
    expect(document.querySelector('.yol-pole--lapis .yol-feed-item').textContent).toBe('');
  });

  it('iki kutup da boşsa şerit hiç açılmaz — boş satırın söyleyeceği bir şey yok', () => {
    yapi([], []);
    heroCiz(50);
    expect(document.querySelectorAll('.yol-feed').length).toBe(0);
  });

  it('şerit 4 saniyede bir devreder ve başa sarar', () => {
    vi.useFakeTimers();
    yapi([ad(0), ad(1)], []);
    heroCiz(50);
    const goren = () => document.querySelector('.yol-pole--gold .yol-feed-item').textContent;
    expect(goren()).toBe('Kart 0');
    vi.advanceTimersByTime(4000);
    expect(goren()).toBe('Kart 1');
    vi.advanceTimersByTime(4000);
    expect(goren()).toBe('Kart 0');
  });

  it('tek adlı kutup dönmez — devir bir haber değil, tekrar olurdu', () => {
    vi.useFakeTimers();
    yapi([ad(0), ad(1)], [{ id: 'z', name: 'Tek Hedef' }]);
    heroCiz(50);
    vi.advanceTimersByTime(12000);
    expect(document.querySelector('.yol-pole--lapis .yol-feed-item').textContent).toBe('Tek Hedef');
  });

  it('hero yeniden çizilince TEK sayaç kalır — adlar hızlanmaz', () => {
    vi.useFakeTimers();
    yapi([ad(0), ad(1), ad(2)], []);
    heroCiz(50); heroCiz(50); heroCiz(50);   // üç render, üç sayaç OLMAMALI
    vi.advanceTimersByTime(4000);
    // Üç sayaç kalsaydı indeks 3 artar, üç adlı liste başa sarardı (Kart 0)
    expect(document.querySelector('.yol-pole--gold .yol-feed-item').textContent).toBe('Kart 1');
  });

  it('hero DOM\'dan düşünce sayaç kendini toplar', () => {
    vi.useFakeTimers();
    yapi([ad(0), ad(1)], []);
    heroCiz(50);
    document.body.innerHTML = '';           // görünüm değişti
    expect(() => vi.advanceTimersByTime(8000)).not.toThrow();
  });
});

/* ════════════════════════════════════════════════════════════════════
   GÜN ANAHTARI İKİLİĞİ (FAZ 10)
   Seri defteri pad'siz (`2026-7-17`), hayal/söz defterleri padded
   (`2026-08-17`). Yanlış anahtarla sorgulanan defter hata VERMEZ,
   sessizce boş döner — o yüzden tuzağı test tutar, dikkat değil.
════════════════════════════════════════════════════════════════════ */
describe('yolDayRings — iki gün anahtarı formatı yan yana okunur', () => {
  const bugun = new Date();
  const padsiz = `${bugun.getFullYear()}-${bugun.getMonth()}-${bugun.getDate()}`;
  const padded = `${bugun.getFullYear()}-${String(bugun.getMonth() + 1).padStart(2, '0')}-${String(bugun.getDate()).padStart(2, '0')}`;

  beforeEach(() => {
    // SafeStorage bellek-içi _kvCache paylaşır — defteri her testte temizle
    SafeStorage.remove('etw_activity_ledger_v1');
    S._hayalMuhru = { days: [] };
    S._sozMuhru = { days: [] };
  });

  it('seri defteri PAD\'SİZ anahtarla yanar', () => {
    SafeStorage.set('etw_activity_ledger_v1', [padsiz]);
    expect(yolDayRings(3).at(-1).seri).toBe(true);
  });

  it('seri defterine PADDED anahtar yazılırsa gün SESSİZCE sönük kalır', () => {
    SafeStorage.set('etw_activity_ledger_v1', [padded]);
    // Hata yok, uyarı yok — yalnız yanmayan bir halka. Tuzak tam burada.
    expect(yolDayRings(3).at(-1).seri).toBe(false);
  });

  it('hayal/söz defterleri PADDED anahtarla yanar', () => {
    S._hayalMuhru = { days: [padded] };
    S._sozMuhru = { days: [padded] };
    const g = yolDayRings(3).at(-1);
    expect(g.isToday).toBe(true);
    expect(g.hayal).toBe(true);
    expect(g.soz).toBe(true);
  });

  it('hayal defterine PAD\'SİZ anahtar yazılırsa gün SESSİZCE sönük kalır', () => {
    S._hayalMuhru = { days: [padsiz] };
    expect(yolDayRings(3).at(-1).hayal).toBe(false);
  });
});

/* ═══ HERO YIĞINI — kişiler iki ana kartın ARKASINDA (2026-08-18) ═══
   Bugün'ün ayrı deste bölümü söküldü; Kişilerim'in kartları artık kutupların
   arkasındaki yığında görünür ve kutba dokunmak Karşılaşma odasını açar. */
describe('Hero yığını — kutbun arkasındaki deste', () => {
  beforeEach(() => {
    delete window.karYiginGirdileri; delete window.karYuz; delete window.karAc;
    delete window.switchView;
  });

  it('13B yüklenmemişse yığın çizilmez — kutup tek kart olarak yaşar', () => {
    heroCiz(null);
    expect(document.querySelector('.yol-yigin-k')).toBeNull();
    expect(document.querySelector('.yol-yigin-on .ikv-card')).toBeTruthy();
  });

  it('deste doluysa kutbun arkasına yüzler dizilir (en fazla iki)', () => {
    window.karYiginGirdileri = (kind, n) =>
      (kind === 'altin' ? [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }] : [{ id: 'l1' }]).slice(0, n);
    window.karYuz = (g, kind, o) =>
      `<div class="ikv-card" data-id="${g.id}" data-mini="${!!(o && o.mini)}"></div>`;
    heroCiz(null);
    const altin = document.querySelectorAll('.yol-pole--gold .yol-yigin-k');
    const lapis = document.querySelectorAll('.yol-pole--lapis .yol-yigin-k');
    expect(altin).toHaveLength(2);
    expect(lapis).toHaveLength(1);
    // Yığın yüzleri MİNİ ister — hero'daki kart 116px'dir
    expect([...altin].every(el => el.querySelector('.ikv-card').dataset.mini === 'true')).toBe(true);
    // Derinlik sırası: DOM'da önce en arkadaki
    expect([...altin].map(el => el.style.getPropertyValue('--d'))).toEqual(['2', '1']);
  });

  it('yığın ekran okuyucudan gizlidir — okunan kart ÖN yüzdür', () => {
    window.karYiginGirdileri = () => [{ id: 'a1' }];
    window.karYuz = () => '<div class="ikv-card"></div>';
    heroCiz(null);
    expect(document.querySelector('.yol-yigin-k').getAttribute('aria-hidden')).toBe('true');
  });

  it('kutba dokunmak Karşılaşma odasını açar', () => {
    const acilan = [];
    window.karAc = (kind) => { acilan.push(kind); return true; };
    window.switchView = (v) => acilan.push('view:' + v);
    heroCiz(null);
    document.getElementById('yol-pole-gold').click();
    document.getElementById('yol-pole-lapis').click();
    expect(acilan).toEqual(['altin', 'lapis']);
  });

  it('oda açılamıyorsa eski kapı devralır — kimseden bir yol geri alınmaz', () => {
    const gidilen = [];
    window.karAc = () => false;                       // gösterilecek kart yok
    window.switchView = (v) => gidilen.push(v);
    heroCiz(null);
    document.getElementById('yol-pole-gold').click();
    document.getElementById('yol-pole-lapis').click();
    expect(gidilen).toEqual(['portre', 'arketip']);
  });

  it('13B hiç yokken de dokunuş bir yere gider (sessiz düşüş)', () => {
    const gidilen = [];
    window.switchView = (v) => gidilen.push(v);
    heroCiz(null);
    document.getElementById('yol-pole-gold').click();
    expect(gidilen).toEqual(['portre']);
  });
});
