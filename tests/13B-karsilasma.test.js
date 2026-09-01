// Karşılaşma · akış çözücüsü (13B)
//   - sayfa sırası ANLAMDIR: olduğun → yürüdüğün yol → olmak istediğin
//   - kartı olmayan sayfa DOĞMAZ (§6.10: boş sayfa uydurulmaz)
//   - sentez akışın başında durur; altındakiler onu OLUŞTURANLAR
//   - hiçbir deste burada kurulmaz: 10q2 ve 10f tüketilir (ikiz motor yok)
import { describe, it, expect, beforeEach } from 'vitest';

import {
  karSayfalar, karAkis, karGirdiCoz, karSayfaAdi, KAR_KINDS,
} from '../js/parts/13B-karsilasma.js';

/** Geçiş kutbu, 10q2'nin deste elemanı kılığında (aynı `_gk` izi). */
const kutup = (kartId, which, mezun = false) => ({
  id: 'gk_' + kartId + '_' + which,
  name: which === 'golden' ? 'Korkuyla Bekleyen' : 'Adım Atan',
  _gk: { kartId, which, mezun },
});

const katalog = (id, name) => ({ id, name, category: 'temel', rarity: 'yaygin' });

/** 10f'nin kutup çözücüleri — salon yalnız MALZEME ister. */
function mockKutuplar(gold = { name: 'Olunan Emre' }, lapis = { name: 'Niyet Alınan Emre' }) {
  window.yolGoldPole  = () => (gold ? { card: gold, empty: !!gold._empty, sahne: gold._sahne || null } : null);
  window.yolLapisPole = () => (lapis ? { card: lapis, empty: !!lapis._empty, sahne: lapis._sahne || null } : null);
}

function mockDeste(altin = [], lapis = []) {
  window.kkDesteAltin = () => altin;
  window.kkDesteLapis = () => lapis;
}

beforeEach(() => {
  ['yolGoldPole', 'yolLapisPole', 'kkDesteAltin', 'kkDesteLapis', 'gkActiveCards']
    .forEach(k => { delete window[k]; });
});

describe('karSayfalar — akışın sırası', () => {
  it('yürünen yol yokken akış İKİ sayfadır (boş sayfa uydurulmaz)', () => {
    mockKutuplar(); mockDeste();
    const s = karSayfalar();
    expect(s.map(x => x.kind)).toEqual(['altin', 'lapis']);
  });

  it('yürünen yol varken sıra olduğun → geçiş → olmak istediğin', () => {
    mockKutuplar();
    mockDeste([kutup('k1', 'golden')], [kutup('k1', 'lapis')]);
    window.gkActiveCards = () => [{ id: 'k1' }];
    expect(karSayfalar().map(x => x.kind)).toEqual(['altin', 'gecis', 'lapis']);
  });

  it('hiçbir motor yüklenmemişse sessizce boş döner (patlamaz)', () => {
    expect(() => karSayfalar()).not.toThrow();
    expect(karSayfalar()).toEqual([]);
  });

  it('sentez çözülemese de deste varsa sayfa yaşar', () => {
    mockDeste([katalog('c1', 'Sabreden')], []);
    const s = karSayfalar();
    expect(s.map(x => x.kind)).toEqual(['altin']);
    expect(s[0].akis).toHaveLength(1);
  });
});

describe('karAkis — dikey akış', () => {
  it('index 0 sentezdir, altındakiler onu oluşturanlardır', () => {
    mockKutuplar();
    mockDeste([katalog('c1', 'Sabreden'), katalog('c2', 'Duran')], []);
    const a = karAkis('altin');
    expect(a).toHaveLength(3);
    expect(a[0]._sentez).toBeTruthy();
    expect(a[0].name).toBe('Olunan Emre');
    expect(a.slice(1).map(x => x.id)).toEqual(['c1', 'c2']);
  });

  it('yürünen geçişin kutupları kutup sayfalarında İKİNCİ kez görünmez', () => {
    mockKutuplar();
    mockDeste([kutup('k1', 'golden'), katalog('c1', 'Sabreden')], [kutup('k1', 'lapis')]);
    window.gkActiveCards = () => [{ id: 'k1' }];
    expect(karAkis('altin').map(x => x.id)).toEqual(['kar_sentez_altin', 'c1']);
    expect(karAkis('lapis').map(x => x.id)).toEqual(['kar_sentez_lapis']);
  });

  it('mezun geçişin kutbu altın akışta KALIR — artık o kişisin', () => {
    mockKutuplar();
    mockDeste([kutup('k0', 'lapis', true), katalog('c1', 'Sabreden')], []);
    expect(karAkis('altin').map(x => x.id))
      .toEqual(['kar_sentez_altin', 'gk_k0_lapis', 'c1']);
  });

  it('geçiş sayfası iki kutup + mezun yollardır', () => {
    mockKutuplar();
    mockDeste([kutup('k1', 'golden'), kutup('k0', 'lapis', true)], [kutup('k1', 'lapis')]);
    window.gkActiveCards = () => [{ id: 'k1' }];
    expect(karAkis('gecis').map(x => x.id))
      .toEqual(['gk_k1_golden', 'gk_k1_lapis', 'gk_k0_lapis']);
  });

  it('İKİNCİ aktif geçişin kutupları elenmez — orta sayfa yalnız ilkini konu eder', () => {
    mockKutuplar();
    mockDeste([kutup('k1', 'golden'), kutup('k2', 'golden')],
              [kutup('k1', 'lapis'), kutup('k2', 'lapis')]);
    window.gkActiveCards = () => [{ id: 'k1' }, { id: 'k2' }];
    // k1 ortada konuşur; k2 hiçbir yerde kaybolmamalı
    expect(karAkis('altin').map(x => x.id)).toContain('gk_k2_golden');
    expect(karAkis('lapis').map(x => x.id)).toContain('gk_k2_lapis');
    expect(karAkis('altin').map(x => x.id)).not.toContain('gk_k1_golden');
  });

  it('yürünen yol yoksa geçiş akışı boştur', () => {
    mockKutuplar(); mockDeste();
    expect(karAkis('gecis')).toEqual([]);
  });

  it('mezun kartın lapis kutbu ALTIN destede aranır (paletten deste tahmin edilmez)', () => {
    mockKutuplar();
    // k1'in lapis kutbu ALTIN destede duruyor (mezun kalıbı) — çözücü onu bulmalı
    mockDeste([kutup('k1', 'golden'), kutup('k1', 'lapis', true)], []);
    window.gkActiveCards = () => [{ id: 'k1' }];
    const ids = karAkis('gecis').map(x => x.id);
    expect(ids).toContain('gk_k1_lapis');
  });
});

describe('karGirdiCoz — tür ve palet', () => {
  it('sentez: paleti kendi kutbundan alır', () => {
    mockKutuplar();
    const g = karGirdiCoz(karAkis('altin')[0], 'altin');
    expect(g.tur).toBe('sentez');
    expect(g.palette).toBe('gold');
    const l = karGirdiCoz(karAkis('lapis')[0], 'lapis');
    expect(l.palette).toBe('lapis');
  });

  it('kutup: paleti `which`ten okunur, sayfanın paletinden DEĞİL', () => {
    const c = karGirdiCoz(kutup('k0', 'lapis', true), 'altin');
    expect(c.tur).toBe('kutup');
    expect(c.palette).toBe('lapis');
    expect(c.gk.mezun).toBe(true);
  });

  it('katalog: paleti sayfadan gelir', () => {
    expect(karGirdiCoz(katalog('c1', 'Sabreden'), 'altin').palette).toBe('gold');
    expect(karGirdiCoz(katalog('c1', 'Sabreden'), 'lapis').palette).toBe('lapis');
  });

  it('boş girdi sessizce null döner', () => {
    expect(karGirdiCoz(null, 'altin')).toBeNull();
  });

  it('sisli sentez `empty` izini taşır (davet kartı — uydurma ad yok)', () => {
    mockKutuplar({ name: 'Sen', _empty: true }, null);
    const g = karGirdiCoz(karAkis('altin')[0], 'altin');
    expect(g.empty).toBe(true);
  });
});

describe('karSayfaAdi', () => {
  it('sayfa adlarında sayaç dili yoktur', () => {
    KAR_KINDS.forEach(k => expect(karSayfaAdi(k)).not.toMatch(/\d/));
  });
});

/* ═══ KABUK — odanın kendisi ═══ */

import { karAc, karKapat, karAcikMi, karKaydir } from '../js/parts/13B-karsilasma.js';

/** 12c/10A yüz motorları — kabuk onları window'dan okur, sahtesi yeter. */
function mockYuz() {
  window.ikvCardFace = (card, o = {}) =>
    `<div class="ikv-card" data-id="${card && card.id}" data-mini="${!!o.mini}" data-fog="${!!o.fog}"></div>`;
  window.ikvCardBack = () => '<div class="ikv-back"></div>';
  window.ikvEnsureStyles = () => {};
  window.gkPoleFace = (kid, which, o = {}) =>
    `<div class="ikv-card" data-kid="${kid}" data-which="${which}" data-tam="${!!o.tam}"></div>`;
}

describe('karAc / karKapat — oda', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.documentElement.className = '';
    karKapat();
    mockYuz();
  });

  it('gösterilecek kart yoksa oda AÇILMAZ (boş sahne kurulmaz)', () => {
    expect(karAc('altin')).toBe(false);
    expect(document.getElementById('kar-portal')).toBeNull();
  });

  it('üç sayfa varsa üçünü de çizer, sırayı korur', () => {
    mockKutuplar();
    mockDeste([kutup('k1', 'golden'), katalog('c1', 'Sabreden')], [kutup('k1', 'lapis')]);
    window.gkActiveCards = () => [{ id: 'k1' }];
    expect(karAc('altin')).toBe(true);
    const sayfalar = [...document.querySelectorAll('.kar-sayfa')].map(s => s.dataset.karSayfa);
    expect(sayfalar).toEqual(['altin', 'gecis', 'lapis']);
  });

  it('ilk katta sayfa etiketi vardır, altındakilerde YOKTUR', () => {
    mockKutuplar();
    mockDeste([katalog('c1', 'Sabreden'), katalog('c2', 'Duran')], []);
    karAc('altin');
    const altin = document.querySelector('.kar-sayfa[data-kar-sayfa="altin"]');
    expect(altin.querySelectorAll('.kar-kat')).toHaveLength(3);
    expect(altin.querySelectorAll('.kar-etiket')).toHaveLength(1);
    expect(altin.querySelector('.kar-etiket').textContent.trim()).toBe('OLDUĞUN KİŞİ');
  });

  it('davet yalnız aşağıda biri VARKEN çizilir (boş vaadin düğmesi olmaz)', () => {
    mockKutuplar();
    mockDeste([], []);                                   // yalnız sentez
    karAc('altin');
    expect(document.querySelector('.kar-davet')).toBeNull();
    karKapat();
    mockDeste([katalog('c1', 'Sabreden')], []);
    karAc('altin');
    expect(document.querySelector('.kar-sayfa[data-kar-sayfa="altin"] .kar-davet')).toBeTruthy();
  });

  it('kutup yüzü 10A\'dan TAM boy istenir (mini kart folyoyu soyar)', () => {
    mockKutuplar();
    mockDeste([kutup('k1', 'golden')], [kutup('k1', 'lapis')]);
    window.gkActiveCards = () => [{ id: 'k1' }];
    karAc('gecis');
    const yuz = document.querySelector('.kar-sayfa[data-kar-sayfa="gecis"] .ikv-card');
    expect(yuz.dataset.tam).toBe('true');
  });

  it('katalog kartı da TAM boydur — mini bayrağı düşer', () => {
    mockKutuplar();
    mockDeste([katalog('c1', 'Sabreden')], []);
    karAc('altin');
    const yuzler = [...document.querySelectorAll('.kar-kart .ikv-card')];
    expect(yuzler.every(y => y.dataset.mini === 'false')).toBe(true);
  });

  it('sisli sentez fog ile çizilir — uydurma ad basılmaz', () => {
    mockKutuplar({ name: 'SEN', _empty: true }, null);
    mockDeste([], []);
    karAc('altin');
    expect(document.querySelector('.kar-kart .ikv-card').dataset.fog).toBe('true');
  });

  it('oda açıkken arkadaki ekran kilitlenir, kapanınca çözülür', () => {
    mockKutuplar(); mockDeste();
    karAc('altin');
    expect(document.documentElement.classList.contains('kar-kilit')).toBe(true);
    karKapat();
    expect(document.documentElement.classList.contains('kar-kilit')).toBe(false);
    expect(karAcikMi()).toBe(false);
  });

  it('Escape odayı kapatır ve dinleyici geride kalmaz', () => {
    mockKutuplar(); mockDeste();
    karAc('altin');
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
    expect(karAcikMi()).toBe(false);
    // Kapandıktan sonra tuşlar sessizdir (dinleyici söküldü)
    expect(() => document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' })))
      .not.toThrow();
  });

  it('kapat düğmesi odayı kapatır', () => {
    mockKutuplar(); mockDeste();
    karAc('altin');
    document.querySelector('[data-kar-kapat]').click();
    expect(karAcikMi()).toBe(false);
  });

  it('oda kapalıyken kaydırma sessizdir', () => {
    expect(() => karKaydir(1)).not.toThrow();
  });

  it('dialog rolü ve erişilebilir adı vardır', () => {
    mockKutuplar(); mockDeste();
    karAc('altin');
    const el = document.getElementById('kar-portal');
    expect(el.getAttribute('role')).toBe('dialog');
    expect(el.getAttribute('aria-modal')).toBe('true');
  });
});

describe('karAc — ikinci çağrı', () => {
  beforeEach(() => { document.body.innerHTML = ''; karKapat(); mockYuz(); });

  it('oda açıkken yeniden açmak dinleyici SIZDIRMAZ, yalnız sayfa değiştirir', () => {
    mockKutuplar();
    mockDeste([kutup('k1', 'golden')], [kutup('k1', 'lapis')]);
    window.gkActiveCards = () => [{ id: 'k1' }];
    karAc('altin');
    const ilkPortal = document.getElementById('kar-portal');
    karAc('lapis');
    expect(document.getElementById('kar-portal')).toBe(ilkPortal);   // aynı düğüm
    expect(document.querySelectorAll('#kar-portal').length).toBe(1);
    // Tek Escape yeter — ikinci dinleyici asılsaydı kapanış iki kez koşardı
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
    expect(karAcikMi()).toBe(false);
  });
});

describe('Sayfa konumu — nokta göstergesi', () => {
  beforeEach(() => { document.body.innerHTML = ''; karKapat(); mockYuz(); });

  it('üç sayfada üç nokta çizilir; açılan sayfanınki yanar', () => {
    mockKutuplar();
    mockDeste([kutup('k1', 'golden')], [kutup('k1', 'lapis')]);
    window.gkActiveCards = () => [{ id: 'k1' }];
    karAc('gecis');
    const n = [...document.querySelectorAll('.kar-nokta')];
    expect(n.map(x => x.dataset.karNokta)).toEqual(['altin', 'gecis', 'lapis']);
    expect(n.filter(x => x.classList.contains('is-on')).map(x => x.dataset.karNokta)).toEqual(['gecis']);
  });

  it('yanan nokta klavyeyle de taşınır (tek yakıcıdan geçer)', () => {
    mockKutuplar();
    mockDeste([kutup('k1', 'golden')], [kutup('k1', 'lapis')]);
    window.gkActiveCards = () => [{ id: 'k1' }];
    karAc('altin');
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(document.querySelector('.kar-nokta.is-on').dataset.karNokta).toBe('gecis');
  });

  it('tek sayfada gösterge ÇİZİLMEZ — gezinecek yer yokken konum bilgisi süstür', () => {
    mockKutuplar(null, null);
    mockDeste([katalog('c1', 'Sabreden')], []);
    karAc('altin');
    expect(document.querySelectorAll('.kar-sayfa')).toHaveLength(1);
    expect(document.querySelector('.kar-noktalar')).toBeNull();
  });
});

describe('karKapat — dinleyici sızıntısı', () => {
  it('portal DOM\'dan başka yolla koparsa da tuş dinleyicisi sökülür', () => {
    mockYuz(); mockKutuplar();
    mockDeste([kutup('k1', 'golden')], [kutup('k1', 'lapis')]);
    window.gkActiveCards = () => [{ id: 'k1' }];
    karAc('altin');
    document.body.innerHTML = '';          // kabuk dışarıdan temizlendi
    karKapat();                            // erken dönüş dinleyiciyi bırakmamalı
    expect(document.documentElement.classList.contains('kar-kilit')).toBe(false);

    // Oda yeniden açılır; TEK bir ok bir sayfa ilerletmeli (iki dinleyici olsaydı ikisi)
    karAc('altin');
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(document.querySelector('.kar-nokta.is-on').dataset.karNokta).toBe('gecis');
    karKapat();
  });
});

/* ═══ ARKA YÜZ — kart döndüğünde ne yazıyor ═══ */

import { karArkaHTML, karCevir } from '../js/parts/13B-karsilasma.js';
import { S } from '../js/state.js';

const zenginKart = () => ({
  id: 'c9', name: 'Sabreden', whisper: 'acele etmeyen',
  portre: 'Beklemeyi bilen biri.',
  gercek: 'Trafikte kornaya basmaz.',
  olunca: 'Zaman senin düşmanın olmaktan çıkar.',
  kok: 'İlişki Felsefesi · Sabır',
  dusunceler: ['acelem yok'], inanclar: ['her şeyin vakti var'],
  hisler: ['dinginlik'], davranislar: ['bekler'],
});

describe('karArkaHTML — içerik', () => {
  beforeEach(() => { S._portre = null; delete window.oikGetCard; delete window.gkActiveCards; delete window.gkCompletedCards; });

  it('katalog kartı: portre · gerçek hayat · olunca · kök · dört boyut', () => {
    const h = karArkaHTML(zenginKart(), 'altin');
    expect(h).toContain('Beklemeyi bilen biri.');
    expect(h).toContain('GERÇEK HAYATTA');
    expect(h).toContain('Trafikte kornaya basmaz.');
    expect(h).toContain('SEN BU KİŞİ OLDUĞUNDA');
    expect(h).toContain('İlişki Felsefesi · Sabır');
    expect(h).toContain('acelem yok');
    expect(h).toContain('dinginlik');
  });

  it('olmayan alan ÇİZİLMEZ — boş bölüm uydurulmaz', () => {
    const h = karArkaHTML({ id: 'c1', name: 'Yalın', dusunceler: ['bir madde'] }, 'altin');
    expect(h).not.toContain('GERÇEK HAYATTA');
    expect(h).not.toContain('KAYNAK');
    expect(h).toContain('bir madde');
  });

  it('kullanıcının cümlesi «…» ile durur, kitabınki tırnaksız', () => {
    window.gkActiveCards = () => [{
      id: 'k1',
      golden: { baslik: 'Kaçan', whisper: 'kısılmış ses',
                dusunceler: [{ text: 'buradan gitmeliyim', src: 'user' },
                             { text: 'model önerisi', src: 'llm' }] },
    }];
    const h = karArkaHTML(kutup('k1', 'golden'), 'gecis');
    expect(h).toContain('«buradan gitmeliyim»');
    expect(h).toContain('model önerisi');
    expect(h).not.toContain('«model önerisi»');
    expect(h).toContain('kar-benim');
  });

  it('sentez altın yüzü PORTREden okur (ikinci kaynak kurulmaz)', () => {
    mockKutuplar();
    S._portre = { baslik: 'Olunan Emre', duygular: [{ text: 'genişlik', src: 'user' }] };
    const h = karArkaHTML(karAkis('altin')[0], 'altin');
    expect(h).toContain('«genişlik»');
  });

  it('sentez lapis yüzü OİK kartından okur', () => {
    mockKutuplar();
    window.oikGetCard = () => ({ baslik: 'Niyet Alınan Emre', davranislar: [{ text: 'erken kalkarım', src: 'user' }] });
    const h = karArkaHTML(karAkis('lapis')[0], 'lapis');
    expect(h).toContain('«erken kalkarım»');
    expect(h).toContain('kar-arka--lapis');
  });

  it('malzemesi olmayan arka yüz DAVET eder, uydurma madde basmaz', () => {
    mockKutuplar();
    const h = karArkaHTML(karAkis('altin')[0], 'altin');
    expect(h).toContain('kar-arka-bos');
    expect(h).not.toMatch(/<li/);
  });

  it('boş girdi sessizdir', () => {
    expect(karArkaHTML(null, 'altin')).toBe('');
  });
});

describe('karCevir — flip', () => {
  beforeEach(() => { document.body.innerHTML = ''; karKapat(); mockYuz(); S._portre = null; });

  it('her katta iki yüz vardır; arka yüz başta ekran okuyucudan gizlidir', () => {
    mockKutuplar();
    mockDeste([zenginKart()], []);
    karAc('altin');
    const flip = document.querySelector('.kar-flip');
    expect(flip.querySelector('.kar-yuz--on')).toBeTruthy();
    expect(flip.querySelector('.kar-yuz--arka').getAttribute('aria-hidden')).toBe('true');
    expect(flip.getAttribute('aria-pressed')).toBe('false');
  });

  it('karta dokunmak onu çevirir ve okunacak yüzü takas eder', () => {
    mockKutuplar();
    mockDeste([zenginKart()], []);
    karAc('altin');
    // Hedef AÇIKÇA altın sayfasının katalog katı: querySelectorAll(...).pop()
    // lapis sayfasının sentezini seçer ve test başka kartı sınar.
    const flip = document.querySelector(
      '.kar-sayfa[data-kar-sayfa="altin"] .kar-kat[data-kar-kat="1"] .kar-flip');
    flip.click();
    expect(flip.classList.contains('is-arka')).toBe(true);
    expect(flip.getAttribute('aria-pressed')).toBe('true');
    expect(flip.querySelector('.kar-yuz--arka').getAttribute('aria-hidden')).toBe('false');
    expect(flip.querySelector('.kar-yuz--on').getAttribute('aria-hidden')).toBe('true');
    flip.click();
    expect(flip.classList.contains('is-arka')).toBe(false);
  });

  it('Enter kartı çevirir; ok tuşları gezinmede kalır', () => {
    mockKutuplar();
    mockDeste([zenginKart(), katalog('c2', 'Duran')], []);
    karAc('altin');
    const flip = document.querySelector('.kar-flip');
    flip.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(flip.classList.contains('is-arka')).toBe(true);
  });

  it('arka yüz kartın kendi içeriğini taşır — ön yüzle aynı kişi', () => {
    mockKutuplar();
    mockDeste([zenginKart()], []);
    karAc('altin');
    const arka = document.querySelector(
      '.kar-sayfa[data-kar-sayfa="altin"] .kar-kat[data-kar-kat="1"] .kar-yuz--arka');
    expect(arka.textContent).toContain('Sabreden');
    expect(arka.textContent).toContain('Beklemeyi bilen biri.');
  });
});

describe('Register — kaynak ayrımı ve glyph', () => {
  // Kendi zemini: açık kalmış bir portal devralınırsa karAc yalnız sayfa
  // değiştirir (bilinçli davranış) ve test eski içeriği ölçer.
  beforeEach(() => { karKapat(); document.body.innerHTML = ''; });

  it('blok başlıkları ile boyut başlıkları aynı glyph\'i taşımaz', () => {
    const h = karArkaHTML(zenginKart(), 'altin');
    const blok = [...h.matchAll(/class="kar-blok-h">([^<]+)</g)].map(m => m[1]);
    const boyut = [...h.matchAll(/class="kar-boyut-h">([\s\S]*?)<\/div>/g)].map(m => m[1]);
    // Blok başlıkları glyph'siz: 10q'nun anahtarı '◉ GERÇEK HAYATTA' getirir
    expect(blok.every(x => !/^[^\p{L}\p{N}]/u.test(x.trim()))).toBe(true);
    expect(blok.join(' ')).toContain('GERÇEK HAYATTA');
    // Boyut başlıkları glyph'ini KORUR — ayrım orada anlamlı
    expect(boyut.join(' ')).toContain('◉');
  });

  it('kaynak satırı da glyph\'siz durur', () => {
    const h = karArkaHTML(zenginKart(), 'altin');
    expect(h).toMatch(/class="kar-kok">\s*KAYNAK/);
  });

  it('davet metinleri üç sayfada üç ayrı cümledir, sayaç dili yok', () => {
    mockYuz(); mockKutuplar();
    mockDeste([kutup('k1', 'golden'), katalog('c1', 'Sabreden')], [kutup('k1', 'lapis'), katalog('c2', 'Duran')]);
    window.gkActiveCards = () => [{ id: 'k1' }];
    karAc('altin');
    const davet = [...document.querySelectorAll('.kar-davet')].map(b => b.textContent.trim().replace(/\s+/g, ' '));
    expect(davet).toHaveLength(3);
    expect(new Set(davet).size).toBe(3);
    davet.forEach(d => expect(d).not.toMatch(/\d/));
    expect(davet[0]).toContain('OLUŞTURANLARI GÖR');
    karKapat();
  });
});

describe('Masa kapısı — köprü ışığının halefi', () => {
  beforeEach(() => { karKapat(); document.body.innerHTML = ''; mockYuz(); delete window.gkOpenDetail; });

  it('geçiş kutbunun arkasında masaya açılan kapı vardır', () => {
    window.gkActiveCards = () => [{ id: 'k1', golden: { baslik: 'Kaçan' }, lapis: { baslik: 'Duran' } }];
    const h = karArkaHTML(kutup('k1', 'golden'), 'gecis');
    expect(h).toContain('data-kar-masa="k1"');
    expect(h).toContain('BU YOLU AÇ');
  });

  it('katalog kartının arkasında masa kapısı YOKTUR (onun masası yok)', () => {
    expect(karArkaHTML(zenginKart(), 'altin')).not.toContain('data-kar-masa');
  });

  it('kapıya dokunmak odayı kapatır ve masayı o kutupla açar', () => {
    mockKutuplar();
    window.gkActiveCards = () => [{ id: 'k1', golden: { baslik: 'Kaçan' }, lapis: { baslik: 'Duran' } }];
    mockDeste([kutup('k1', 'golden')], [kutup('k1', 'lapis')]);
    const cagri = [];
    window.gkOpenDetail = (pal, id) => cagri.push([pal, id]);
    karAc('gecis');
    const btn = document.querySelector('.kar-sayfa[data-kar-sayfa="gecis"] [data-kar-masa]');
    btn.click();
    expect(cagri).toEqual([['gold', 'k1']]);
    expect(karAcikMi()).toBe(false);          // iki tam ekran üst üste durmaz
  });

  it('kapıya dokunmak kartı ÇEVİRMEZ — o başka bir jest', () => {
    mockKutuplar();
    window.gkActiveCards = () => [{ id: 'k1', golden: { baslik: 'Kaçan' }, lapis: { baslik: 'Duran' } }];
    mockDeste([kutup('k1', 'golden')], [kutup('k1', 'lapis')]);
    window.gkOpenDetail = () => {};
    karAc('gecis');
    const flip = document.querySelector('.kar-sayfa[data-kar-sayfa="gecis"] .kar-flip');
    flip.classList.add('is-arka');
    document.querySelector('[data-kar-masa]').click();
    // Oda kapandı; flip düğümü DOM'dan gitti — çevrilme durumu taşınmadı
    expect(document.querySelector('.kar-flip')).toBeNull();
  });
});

describe('Dikiş — oda ile Bugün arasındaki bağ', () => {
  beforeEach(() => { karKapat(); document.body.innerHTML = ''; mockYuz(); delete window.yolRenderHero; });

  it('oda kapanınca Bugün\'ün yığını tazelenir (oda açıkken kart kazanılmış olabilir)', () => {
    let tazelendi = 0;
    window.yolRenderHero = () => { tazelendi++; };
    mockKutuplar(); mockDeste([katalog('c1', 'Sabreden')], []);
    karAc('altin');
    expect(tazelendi).toBe(0);
    karKapat();
    expect(tazelendi).toBe(1);
  });

  it('hero yüklenmemişse kapanış yine de sessizdir', () => {
    mockKutuplar(); mockDeste();
    karAc('altin');
    expect(() => karKapat()).not.toThrow();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   İKİ ANA KART ÇEVRİLMEZ — DETAY AÇAR (Emre, 2026-08-23)
   ───────────────────────────────────────────────────────────────────
   Portre ve OİK ekranları yaşıyordu ama odaya giden yol açılınca onlara
   giden yol kapanmıştı: 10f'nin `_acOda` fallback'i o kapıları yalnız oda
   AÇILAMAZSA çağırıyor. Sentez kartına dokunmak artık doğrudan detayı
   açar; onu OLUŞTURAN alt kartlar eskisi gibi çevrilir.
   Masa (gkOpenDetail) da kartın arka yüzünden çıkıp iki kutbun arasındaki
   butona taşındı — kanıt kapılı: yürünen yol yoksa buton çizilmez.
═══════════════════════════════════════════════════════════════════ */
describe('odanın kapıları — sentez detay açar, alt kartlar çevrilir', () => {
  beforeEach(() => {
    karKapat(); document.body.innerHTML = ''; mockYuz();
    delete window.switchView; delete window.gkOpenDetail; delete window.yolRenderHero;
  });

  const sentezKati = () => document.querySelector('#kar-portal [data-kar-sayfa="altin"] [data-kar-kat="0"]');
  const altKat     = () => document.querySelector('#kar-portal [data-kar-sayfa="altin"] [data-kar-kat="1"]');

  it('sentez katı ÇEVRİLMEZ: flip kabı hiç kurulmaz, detay çapası taşır', () => {
    mockKutuplar(); mockDeste([katalog('c1', 'Sabreden')], []);
    karAc('altin');
    const kat = sentezKati();
    expect(kat.querySelector('[data-kar-flip]')).toBeNull();
    expect(kat.querySelector('[data-kar-detay]')).toBeTruthy();
    // Kap kurulup gizlenseydi klavye yine çevirir, aria yalan söylerdi.
    expect(kat.querySelector('[aria-pressed]')).toBeNull();
    expect(kat.querySelector('.kar-yuz--arka')).toBeNull();
  });

  it('onu OLUŞTURAN alt kartlar eskisi gibi çevrilir', () => {
    mockKutuplar(); mockDeste([katalog('c1', 'Sabreden')], []);
    karAc('altin');
    const kat = altKat();
    expect(kat.querySelector('[data-kar-flip]')).toBeTruthy();
    expect(kat.querySelector('.kar-yuz--arka')).toBeTruthy();
  });

  it('altın sentezine dokunmak Portre\'yi açar ve odayı KAPATIR', () => {
    const gidilen = [];
    window.switchView = (v) => gidilen.push(v);
    mockKutuplar(); mockDeste([katalog('c1', 'Sabreden')], []);
    karAc('altin');
    sentezKati().querySelector('[data-kar-detay]').click();
    expect(gidilen).toEqual(['portre']);
    expect(karAcikMi()).toBe(false);   // iki tam ekran üst üste durmaz
  });

  it('lapis sentezi kanonik `oik`e gider — eski `arketip` alias\'ı kullanılmaz', () => {
    const gidilen = [];
    window.switchView = (v) => gidilen.push(v);
    mockKutuplar(); mockDeste([], [katalog('c2', 'Adım Atan')]);
    karAc('lapis');
    document.querySelector('#kar-portal [data-kar-sayfa="lapis"] [data-kar-detay]').click();
    expect(gidilen).toEqual(['oik']);
  });

  it('switchView yüklenmemişse sessizce düşer, oda yine kapanır', () => {
    mockKutuplar(); mockDeste([katalog('c1', 'Sabreden')], []);
    karAc('altin');
    expect(() => sentezKati().querySelector('[data-kar-detay]').click()).not.toThrow();
    expect(karAcikMi()).toBe(false);
  });
});

describe('aradaki yol — masaya açılan buton', () => {
  beforeEach(() => {
    karKapat(); document.body.innerHTML = ''; mockYuz();
    delete window.gkOpenDetail; delete window.gkActiveCards; delete window.yolRenderHero;
  });

  it('yürünen yol YOKSA buton çizilmez (olmayan yolun düğmesi olmaz)', () => {
    mockKutuplar(); mockDeste([katalog('c1', 'Sabreden')], []);
    karAc('altin');
    expect(document.querySelector('#kar-portal .kar-yol')).toBeNull();
  });

  it('yürünen yol varsa sentezin altında durur ve masayı SAYFANIN kutbuyla açar', () => {
    const acilan = [];
    window.gkOpenDetail = (pal, id) => acilan.push([pal, id]);
    window.gkActiveCards = () => [{ id: 'k1' }];
    mockKutuplar();
    mockDeste([kutup('k1', 'golden'), katalog('c1', 'Sabreden')], [kutup('k1', 'lapis')]);
    karAc('lapis');
    const btn = document.querySelector('#kar-portal [data-kar-sayfa="lapis"] .kar-yol');
    expect(btn).toBeTruthy();
    btn.click();
    expect(acilan).toEqual([['lapis', 'k1']]);
    expect(karAcikMi()).toBe(false);   // masa odanın üstünde açılmaz
  });

  it('altın sayfasında aynı yol altın kutupla açılır', () => {
    const acilan = [];
    window.gkOpenDetail = (pal, id) => acilan.push([pal, id]);
    window.gkActiveCards = () => [{ id: 'k1' }];
    mockKutuplar();
    mockDeste([kutup('k1', 'golden'), katalog('c1', 'Sabreden')], [kutup('k1', 'lapis')]);
    karAc('altin');
    document.querySelector('#kar-portal [data-kar-sayfa="altin"] .kar-yol').click();
    expect(acilan).toEqual([['gold', 'k1']]);
  });

  it('geçiş SAYFASININ kutup kartı hâlâ çevrilir — buton onun yerine geçmez', () => {
    window.gkActiveCards = () => [{ id: 'k1' }];
    mockKutuplar();
    mockDeste([kutup('k1', 'golden')], [kutup('k1', 'lapis')]);
    karAc('gecis');
    const kat = document.querySelector('#kar-portal [data-kar-sayfa="gecis"] [data-kar-kat="0"]');
    expect(kat.querySelector('[data-kar-flip]')).toBeTruthy();
    expect(kat.querySelector('.kar-yol')).toBeNull();
  });
});
