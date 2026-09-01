// Kişilerim · Deste Yüzeyi (10q2)
//   NOT (2026-08-18): Bugün'ün iki deste BÖLÜMÜ söküldü — kartlar iki ana
//   kartın arkasına (10f yığını) ve tam ekran odaya (13B) taşındı. Bu dosya
//   artık geriye kalan iki sözleşmeyi sınar: DESTE KAYNAĞI (kkDesteAltin/
//   Lapis — 13B ve 10f tüketir) ve DESTE YÜZEYİ (kkDeckHTML/Bind/Len —
//   Geçiş masası tüketir). Çizim testleri masanın çağırdığı yoldan geçer.
//   - deste kaynakları: ALTIN kazanılanlar (şu anki kimlik önde), LAPİS hedefler
//   - yelpaze: en fazla MAX_FACES yüz + kalan rozeti + sayaç
//   - gezinme: kaydırma sınırları, ön kartın değişmesi
//   - boş durum: kart sırtı + davet, uydurma kart yok
//   - erişilebilirlik: yalnız ön kart okunur/tıklanır
//   - KÖPRÜ (2026-07-26): geçiş kutupları destelerin başında, üç vuruş ortada
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

import {
  kkDesteAltin, kkDesteLapis,
  kkDeckHTML, kkDeckBind, kkDeckLen,
} from '../js/parts/10q2-kisilerim-bugun.js';
import { deckReady, getFullDeck } from '../js/parts/12b-kart-destesi.js';
import { S } from '../js/state.js';

let DECK = [];
const id = i => DECK[i].id;

beforeAll(async () => { await deckReady(); DECK = getFullDeck(); }, 30000);

/** Masanın kabı (10A `gkOpenDetail` içindeki iki kap kalıbı). */
function mountHost() {
  document.body.innerHTML = '<div id="masa"></div>';
}

/** Destenin çizimi — masanın çağırdığı yol. Bugün'ün `kkRenderBugun`'u
 *  2026-08-18'de söküldü; yüzeyi sınayan tek giriş artık `kkDeckHTML`. */
function ciz(idxAltin = 0, idxLapis = 0) {
  const host = document.getElementById('masa');
  host.innerHTML =
    kkDeckHTML('altin', { idx: idxAltin }) + kkDeckHTML('lapis', { idx: idxLapis });
  kkDeckBind(host, {});
  return host;
}

/** Aktif bir geçiş kartı (10A şeması — yalnız destenin okuduğu alanlar). */
const gkKart = (id, sinav = null, state = 'active') => ({
  id, state, sinav,
  golden: { baslik: 'Korkuyla Bekleyen' },
  lapis:  { baslik: 'Adım Atan' },
  sealed_at: state === 'completed' ? '2026-07-20T00:00:00.000Z' : null,
});

/** 10A'nın köprü malzemesi — 10q2 window üzerinden okur, sahtesi yeter. */
function mockGk(aktif = [], mezun = []) {
  window.gkActiveCards    = () => aktif;
  window.gkCompletedCards = () => mezun;
  window.gkPoleFace = (kid, which, o) =>
    `<div class="ikv-card" data-kid="${kid}" data-which="${which}" data-mezun="${!!(o && o.mezun)}"></div>`;
  // Köprünün ışığı feneri 12c'den alır — sahtesi yüzeyi sınamaya yeter.
  window.ikvLantern = (n) => `<svg class="ikv-lantern" data-size="${n}"></svg>`;
}

const earn = (ids, base = 0) => Object.fromEntries(
  ids.map((cid, i) => [cid, { earnedAt: new Date(2026, 0, base + i + 1).toISOString(), rarity: 'yaygin' }])
);

beforeEach(() => {
  mountHost();
  S.currentUser = { id: 'u-deste' };
  S._kisiKarti = {
    profile: {}, collection: {}, history: [], pending: [],
    seenIntro: true, lastTick: 0, closest: null, hedefler: {},
  };
  delete window.imGetCurrent;
  delete window.imIsCurrentPersona;
  // Geçiş kartı malzemesi varsayılan olarak YOK — desteler yalnız katalogtan
  ['gkActiveCards', 'gkCompletedCards', 'gkPoleFace', 'ikvLantern',
   'gkOpenDetail'].forEach(k => { delete window[k]; });
  // Hedef listesi 10q'nun tek kaynağından okunur — testte doğrudan besleriz
  window.kkGetHedefler = () => Object.keys(S._kisiKarti.hedefler)
    .filter(x => !S._kisiKarti.collection[x])
    .sort((a, b) => new Date(S._kisiKarti.hedefler[b].at) - new Date(S._kisiKarti.hedefler[a].at));
});

describe('kkDesteAltin — olduğun kişiler', () => {
  it('en yeni kazanım önde gelir', () => {
    S._kisiKarti.collection = earn([id(0), id(1), id(2)]);
    expect(kkDesteAltin().map(c => c.id)).toEqual([id(2), id(1), id(0)]);
  });

  it('şu anki kimlik (13l) daima en öne alınır', () => {
    S._kisiKarti.collection = earn([id(0), id(1), id(2)]);
    window.imGetCurrent = () => ({ cardId: id(0) });
    expect(kkDesteAltin().map(c => c.id)).toEqual([id(0), id(2), id(1)]);
  });

  it('koleksiyon boşken deste boştur (uydurma kart yok)', () => {
    expect(kkDesteAltin()).toEqual([]);
  });
});

describe('kkDesteLapis — olmak istediklerin', () => {
  it('hedef mührü vurulanları en yeni önce verir', () => {
    S._kisiKarti.hedefler = {
      [id(3)]: { at: '2026-07-01T00:00:00.000Z' },
      [id(4)]: { at: '2026-07-20T00:00:00.000Z' },
    };
    expect(kkDesteLapis().map(c => c.id)).toEqual([id(4), id(3)]);
  });

  it('kazanılan kart hedef destesinden düşer (mezuniyet)', () => {
    S._kisiKarti.hedefler = { [id(3)]: { at: '2026-07-01T00:00:00.000Z' } };
    S._kisiKarti.collection = earn([id(3)]);
    expect(kkDesteLapis()).toEqual([]);
  });
});

describe('Deste yüzeyi — yelpaze', () => {
  it('boş durumda iki deste de kart sırtı + davet gösterir', () => {
    ciz();
    const body = document.getElementById('masa');
    expect(body.querySelectorAll('.kkb-deste--bos')).toHaveLength(2);
    expect(body.querySelectorAll('.kkb-empty-line')).toHaveLength(2);
    expect(body.querySelector('[data-kkb-open]')).toBeFalsy();   // tıklanır kart yok
  });

  it('8 kartta en fazla 6 yüz çizer, kalanı rozetle temsil eder', () => {
    S._kisiKarti.collection = earn(DECK.slice(0, 8).map(c => c.id));
    ciz();
    const altin = document.querySelector('.kkb-deste--altin');
    expect(altin.querySelectorAll('.kkb-card')).toHaveLength(6);
    expect(altin.querySelector('.kkb-rest').textContent).toBe('+2');
    expect(altin.querySelector('.kkb-count').textContent.replace(/\s/g, '')).toBe('1/8');
  });

  it('yalnız ÖN kart tıklanır ve okunur; arkadakiler gizli', () => {
    S._kisiKarti.collection = earn([id(0), id(1), id(2)]);
    ciz();
    const altin = document.querySelector('.kkb-deste--altin');
    const acilir = altin.querySelectorAll('[data-kkb-open]');
    expect(acilir).toHaveLength(1);
    expect(acilir[0].classList.contains('is-front')).toBe(true);
    altin.querySelectorAll('.kkb-card:not(.is-front)').forEach(c => {
      expect(c.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('ön kart 12c kart yüzünü taşır (paralel kart stili yok)', () => {
    S._kisiKarti.collection = earn([id(0)]);
    ciz();
    expect(document.querySelector('.kkb-card.is-front .ikv-card')).toBeTruthy();
  });

  it('şu anki kimlik ön karta taç takar', () => {
    S._kisiKarti.collection = earn([id(0), id(1)]);
    window.imGetCurrent = () => ({ cardId: id(0) });
    window.imIsCurrentPersona = (cid) => cid === id(0);
    ciz();
    const front = document.querySelector('.kkb-deste--altin .kkb-card.is-front');
    expect(front.querySelector('.kkb-crown')).toBeTruthy();
  });

  it('bilinmeyen deste adı boş döner (sessiz düşüş)', () => {
    expect(kkDeckHTML('yok', { idx: 0 })).toBe('');
    expect(kkDeckLen('yok')).toBe(0);
    expect(() => kkDeckBind(null, {})).not.toThrow();
  });

  /* Haftanın gündemi (K7) 2026-08-10'da buradan kalktı ve Kişiler ekranındaki
     "Emre'nin Önerisi" bloğuna yedirildi. Veri kaynağı yerinde dursa bile
     Bugün onu ARTIK ÇİZMEZ — bu bölüm bir vitrindir. */
  it('haftanın gündemi Bugün\'de ÇİZİLMEZ — öneri bloğuna yedirildi', () => {
    window.kkDonemErdem = () => ({ weekKey: '2026-08-10', virtue: 'sebat', cardId: id(0) });
    S._kisiKarti.collection = earn([id(0)]);
    ciz();
    const body = document.getElementById('masa');
    expect(body.querySelector('.kkb-donem')).toBeNull();
    expect(body.innerHTML).not.toContain('GÜNDEM');
    delete window.kkDonemErdem;
  });
});

describe('Geçiş kutupları destede', () => {
  it('aktif geçişin iki kutbu iki destenin başına girer', () => {
    S._kisiKarti.collection = earn([id(0), id(1)]);
    mockGk([gkKart('g1')]);
    expect(kkDesteAltin()[0]._gk).toEqual({ kartId: 'g1', which: 'golden', mezun: false });
    expect(kkDesteLapis()[0]._gk).toEqual({ kartId: 'g1', which: 'lapis', mezun: false });
    expect(kkDesteAltin()).toHaveLength(3);            // kutup + 2 katalog kartı
  });

  it('mezun geçişin LAPİS kutbu ALTIN desteye geçer — artık o kişisin', () => {
    mockGk([], [gkKart('g2', { gordun: true, yurudun: true, oldum: true }, 'completed')]);
    const altin = kkDesteAltin();
    expect(altin[0]._gk).toEqual({ kartId: 'g2', which: 'lapis', mezun: true });
    expect(kkDesteLapis()).toEqual([]);                 // lapis tarafta iz kalmaz
  });

  it('kutup yüzünü 10A çizer, taç takmaz (o bir katalog kartı değil)', () => {
    mockGk([gkKart('g1')]);
    window.imIsCurrentPersona = () => true;             // taç mantığı geçişe uygulanmaz
    ciz();
    const front = document.querySelector('.kkb-deste--altin .kkb-card.is-front');
    expect(front.querySelector('[data-kid="g1"][data-which="golden"]')).toBeTruthy();
    expect(front.querySelector('.kkb-crown')).toBeFalsy();
    expect(front.dataset.kkbGkopen).toBe('g1');
    expect(front.dataset.kkbPal).toBe('gold');
  });
});

describe('Deste — 10A köprüsü (yüzeyde kalanlar)', () => {
  it('geçiş kutbuna dokunmak gkOpenDetail(palet, kartId) çağırır', () => {
    mockGk([gkKart('k1')]);
    const cagri = [];
    window.gkOpenDetail = (pal, id) => cagri.push([pal, id]);
    ciz();
    document.querySelector('.kkb-deste--lapis .kkb-card.is-front').click();
    expect(cagri).toEqual([['lapis', 'k1']]);
  });

  it('10A yüklenmemişse deste yalnız katalogtan çizilir (sessiz düşüş)', () => {
    S._kisiKarti.collection = earn([id(0)]);
    expect(() => ciz()).not.toThrow();                      // window.gk* tanımsız
    expect(document.querySelectorAll('.kkb-deste--altin .kkb-card')).toHaveLength(1);
  });
});

describe('kkDeckHTML / kkDeckBind — dışa açık deste yüzeyi', () => {
  it('dış imleç öne başka kartı alır ve Bugün\'ün imlecini KAYDIRMAZ', () => {
    S._kisiKarti.collection = earn([id(0), id(1), id(2)]);   // sıra: 2,1,0
    ciz();
    const bugunOn = document.querySelector('.kkb-deste--altin .kkb-card.is-front');
    const bugunAd = bugunOn.getAttribute('aria-label');

    const host = document.createElement('div');
    host.innerHTML = kkDeckHTML('altin', { idx: 1 });
    expect(host.querySelector('.kkb-card.is-front').getAttribute('aria-label'))
      .not.toBe(bugunAd);                                    // masa ikinci kartta

    ciz();                                         // Bugün yeniden çizilir
    expect(document.querySelector('.kkb-deste--altin .kkb-card.is-front')
      .getAttribute('aria-label')).toBe(bugunAd);            // imleci kaymadı
  });

  it('dar modda "HEPSİNİ GÖR" çizilmez (masa zaten destenin içindedir)', () => {
    S._kisiKarti.collection = earn([id(0)]);
    const host = document.createElement('div');
    host.innerHTML = kkDeckHTML('altin', { dar: true });
    expect(host.querySelector('.kkb-all')).toBeFalsy();
    host.innerHTML = kkDeckHTML('altin');
    expect(host.querySelector('.kkb-all')).toBeTruthy();
  });

  it('onSelect verilince katalog kartı kendi ekranını AÇMAZ, dışarı haber verir', () => {
    S._kisiKarti.collection = earn([id(0)]);
    window.kkOpenDetail = vi.fn();
    const onSelect = vi.fn();
    const host = document.createElement('div');
    host.innerHTML = kkDeckHTML('altin', { dar: true });
    document.body.appendChild(host);
    kkDeckBind(host, { onSelect });
    host.querySelector('.kkb-card.is-front').click();
    expect(onSelect).toHaveBeenCalledWith({ tip: 'kart', id: id(0) });
    expect(window.kkOpenDetail).not.toHaveBeenCalled();
    delete window.kkOpenDetail;
  });

  it('onSelect verilince geçiş kutbu gkOpenDetail\'i ÇAĞIRMAZ', () => {
    mockGk([gkKart('g1')]);
    window.gkOpenDetail = vi.fn();
    const onSelect = vi.fn();
    const host = document.createElement('div');
    host.innerHTML = kkDeckHTML('lapis', { dar: true });
    document.body.appendChild(host);
    kkDeckBind(host, { onSelect });
    host.querySelector('.kkb-card.is-front').click();
    expect(onSelect).toHaveBeenCalledWith({ tip: 'gk', kartId: 'g1', pal: 'lapis' });
    expect(window.gkOpenDetail).not.toHaveBeenCalled();
  });

  it('onKaydir verilince Bugün yeniden çizilmez — masa kendi kabını tazeler', () => {
    S._kisiKarti.collection = earn([id(0), id(1)]);
    ciz();
    const oncekiOn = document.querySelector('.kkb-deste--altin .kkb-card.is-front')
      .getAttribute('aria-label');
    const onKaydir = vi.fn();
    const host = document.createElement('div');
    host.innerHTML = kkDeckHTML('altin', { idx: 0, dar: true });
    document.body.appendChild(host);
    kkDeckBind(host, { onKaydir });
    host.querySelector('[data-kkb-kaydir="altin:1"]').click();
    expect(onKaydir).toHaveBeenCalledWith('altin', 1);
    expect(document.querySelector('.kkb-deste--altin .kkb-card.is-front')
      .getAttribute('aria-label')).toBe(oncekiOn);
  });

  it('kkDeckLen deste uzunluğunu verir; bilinmeyen tür 0', () => {
    S._kisiKarti.collection = earn([id(0), id(1)]);
    expect(kkDeckLen('altin')).toBe(2);
    expect(kkDeckLen('yok')).toBe(0);
    expect(kkDeckHTML('yok')).toBe('');
  });
});
