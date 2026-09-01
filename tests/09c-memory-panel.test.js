/**
 * Tests for js/parts/09c-memory-panel.js — Emre'nin Hafızası paneli.
 *
 * Kapsam: memPanelOpen/Close yaşam döngüsü (çift açılma engeli), her hafıza
 * türü için madde silme (_deleteItem — kişi/açık döngü/gerçek/önemli gün/
 * değer/öz-tanım/savunma/çalışma kağıdı/hipotez), silme sonrası kalıcılık
 * (personalizationSave çağrısı) + toast, boş durum mesajı.
 *
 * 09a/09b/13b bağımlı modüller mock'lanır — panel yalnız KENDİ silme/render
 * mantığıyla test edilir, alt motorların iç detaylarıyla değil.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../js/parts/09a-personalization-engine.js', () => ({
  personalizationSave: vi.fn(),
}));
vi.mock('../js/parts/09b-depth-foundations.js', () => ({
  dfGetWorksheetSessions: vi.fn(() => []),
  dfDeleteWorksheetSession: vi.fn(() => true),
}));
vi.mock('../js/parts/13b-calisma-kagidi.js', () => ({
  ckConceptLabel: vi.fn((c) => c || ''),
}));

import { S } from '../js/state.js';
import { memPanelOpen, memPanelClose } from '../js/parts/09c-memory-panel.js';
import { personalizationSave } from '../js/parts/09a-personalization-engine.js';
import { dfGetWorksheetSessions, dfDeleteWorksheetSession } from '../js/parts/09b-depth-foundations.js';

function resetState() {
  S._lifeMemory = { people: {}, openLoops: [], lifeFacts: [], importantDates: [] };
  S._personalityMap = { values: [], self_descriptions: [], defense_mechanisms: [] };
  S._portre = null;
  S._userProfile = null;
  S._currentLang = 'tr';
  document.body.innerHTML = '';
  personalizationSave.mockClear();
  /* mockClear çağrı defterini siler ama mockReturnValue'yu BIRAKIR: kağıt
     testinin kurduğu oturum sonraki testlerin panelinde çizilmeye devam
     ediyordu ("boş panel" iddiaları sessizce yanlış zeminde koşuyordu). */
  dfGetWorksheetSessions.mockClear();
  dfGetWorksheetSessions.mockReturnValue([]);
  dfDeleteWorksheetSession.mockClear();
  delete window.apResolveHypothesis;
  delete window.ypGetFullState;
  /* 09i köprüleri testler arası SIZMASIN: bir describe'ın kurduğu sahte
     beyan defteri, sonraki describe'ın silme testinde sessizce çağrılır ve
     o testin ne kanıtladığı bulanıklaşırdı. */
  delete window.secBeyanId; delete window.secBeyanVar;
  delete window.secBeyanAzalt; delete window.secBeyanGeriAl;
  delete window.htListe; delete window.htUnpin;
}

function clickDelete(kind, key) {
  const btn = document.querySelector(`.mem-del[data-kind="${kind}"][data-key="${key}"]`);
  expect(btn, `.mem-del[data-kind=${kind}][data-key=${key}] bulunamadı`).toBeTruthy();
  btn.click();
}

beforeEach(() => {
  resetState();
});

describe('memPanelOpen / memPanelClose — yaşam döngüsü', () => {
  it('panel DOM\'a eklenir', () => {
    memPanelOpen();
    expect(document.getElementById('mem-panel')).toBeTruthy();
  });

  it('çift açılma engellenir (ikinci open öncesini kapatıp yeniden açar, çift panel olmaz)', () => {
    memPanelOpen();
    memPanelOpen();
    expect(document.querySelectorAll('#mem-panel').length).toBe(1);
  });

  it('memPanelClose paneli kaldırır', () => {
    memPanelOpen();
    memPanelClose();
    expect(document.getElementById('mem-panel')).toBeNull();
  });

  it('panel yokken close no-op (throw etmez)', () => {
    expect(() => memPanelClose()).not.toThrow();
  });

  it('hiç hafıza yoksa boş-durum mesajı gösterilir', () => {
    memPanelOpen();
    expect(document.querySelector('.mem-empty')).toBeTruthy();
  });
});

describe('_deleteItem — kişi (person)', () => {
  it('kişi silinir ve kalıcılık tetiklenir', () => {
    S._lifeMemory.people = { anne: { name: 'Anne', mention_count: 3, kaynak: 'olcum', kanit: 'annemle konuştum' } };
    memPanelOpen();
    clickDelete('person', 'anne');
    expect(S._lifeMemory.people.anne).toBeUndefined();
    expect(personalizationSave).toHaveBeenCalledTimes(1);
  });
});

describe('_deleteItem — açık döngü (loop)', () => {
  it('id eşleşen döngü listeden çıkarılır', () => {
    S._lifeMemory.openLoops = [
      { id: 'l1', status: 'open', event: 'Sınav', kaynak: 'olcum', kanit: 'yarın sınavım var' },
      { id: 'l2', status: 'open', event: 'Görüşme', kaynak: 'olcum', kanit: 'görüşmem var' },
    ];
    memPanelOpen();
    clickDelete('loop', 'l1');
    expect(S._lifeMemory.openLoops.map(l => l.id)).toEqual(['l2']);
  });
});

describe('_deleteItem — gerçek (fact) / önemli gün (date)', () => {
  it('fact indeksle silinir', () => {
    S._lifeMemory.lifeFacts = [
      { value: 'kedisi var', kaynak: 'olcum', kanit: 'kedim uyuyor yanımda' },
      { value: 'İzmir\'de yaşıyor', kaynak: 'olcum', kanit: 'İzmir\'de yaşıyorum' },
    ];
    memPanelOpen();
    clickDelete('fact', '0');
    expect(S._lifeMemory.lifeFacts.length).toBe(1);
    expect(S._lifeMemory.lifeFacts[0].value).toBe("İzmir'de yaşıyor");
  });

  it('important date indeksle silinir', () => {
    S._lifeMemory.importantDates = [{ label: 'Doğum günü', date: '05-12', kaynak: 'yorum', kanit: 'annemin doğum günü 12 Mayıs' }];
    memPanelOpen();
    clickDelete('date', '0');
    expect(S._lifeMemory.importantDates.length).toBe(0);
  });

  /* Kanıtın yüzü (FAZ 8): kullanıcı, uygulamanın kendisi hakkında tuttuğu
     her kaydın altında KENDİ cümlesini görür — mimarinin verdiği söz
     ekranda görünür hâle gelir. */
  it('her kaydın altında kullanıcının kendi cümlesi görünür', () => {
    S._lifeMemory.lifeFacts = [{ value: 'kedisi var', kaynak: 'olcum', kanit: 'kedim uyuyor yanımda' }];
    memPanelOpen();
    const html = document.body.innerHTML;
    expect(html).toContain('mem-item-kanit');
    expect(html).toContain('kedim uyuyor yanımda');
  });

  /* Köken kapısı indeksi KAYDIRMAMALI: silme anahtarı ham liste indeksidir.
     Damgasız kayıt panelde gizlenir ama listedeki yerini korur — aksi hâlde
     kullanıcı gördüğü kaydı silerken başka bir kaydı silerdi. */
  it('damgasız kayıt gizlenir ama görünen kaydın silme indeksi kaymaz', () => {
    S._lifeMemory.lifeFacts = [
      { value: 'gizli kalmalı' },                                                   // damgasız → panelde yok
      { value: 'kedisi var', kaynak: 'olcum', kanit: 'kedim uyuyor yanımda' },      // görünen
    ];
    memPanelOpen();
    clickDelete('fact', '1');
    expect(S._lifeMemory.lifeFacts.length).toBe(1);
    expect(S._lifeMemory.lifeFacts[0].value).toBe('gizli kalmalı');
  });
});

describe('_deleteItem — değer / öz-tanım / savunma', () => {
  it('value indeksle silinir', () => {
    S._personalityMap.values = [{ value: 'dürüstlük' }, { value: 'özgürlük' }];
    memPanelOpen();
    clickDelete('value', '1');
    expect(S._personalityMap.values.length).toBe(1);
    expect(S._personalityMap.values[0].value).toBe('dürüstlük');
  });

  it('self_description indeksle silinir', () => {
    S._personalityMap.self_descriptions = ['çok çalışkanım'];
    memPanelOpen();
    clickDelete('selfdesc', '0');
    expect(S._personalityMap.self_descriptions.length).toBe(0);
  });

  it('defense_mechanism indeksle silinir', () => {
    S._personalityMap.defense_mechanisms = [{ type: 'inkar', count: 2 }];
    memPanelOpen();
    clickDelete('defense', '0');
    expect(S._personalityMap.defense_mechanisms.length).toBe(0);
  });
});

describe('_deleteItem — çalışma kağıdı (kagit) devri 09b\'ye', () => {
  it('dfDeleteWorksheetSession doğru indeksle çağrılır', () => {
    dfGetWorksheetSessions.mockReturnValue([
      { concept: 'oz-sefkat', date: '2026-01-01', step3_affirmation: null },
    ]);
    memPanelOpen();
    clickDelete('kagit', '0');
    expect(dfDeleteWorksheetSession).toHaveBeenCalledWith(0);
  });

  it('dfDeleteWorksheetSession false dönerse kalıcılık TETİKLENMEZ', () => {
    dfDeleteWorksheetSession.mockReturnValue(false);
    dfGetWorksheetSessions.mockReturnValue([{ concept: 'x', date: '2026-01-01' }]);
    memPanelOpen();
    clickDelete('kagit', '0');
    expect(personalizationSave).not.toHaveBeenCalled();
  });
});

describe('_deleteItem — hipotez (Ayna Protokolü) reddi', () => {
  it('window.apResolveHypothesis(key, "reddedildi") çağrılır', () => {
    const resolveSpy = vi.fn(() => true);
    window.apResolveHypothesis = resolveSpy;
    window.ypGetFullState = () => ({
      cekirdek: {}, degerler: [],
      hipotezler: [{ id: 'h1', durum: 'aday', metin: 'belki şusun' }],
    });
    memPanelOpen();
    clickDelete('hipotez', 'h1');
    expect(resolveSpy).toHaveBeenCalledWith('h1', 'reddedildi');
  });

  it('apResolveHypothesis false dönerse kalıcılık tetiklenmez', () => {
    window.apResolveHypothesis = vi.fn(() => false);
    window.ypGetFullState = () => ({
      cekirdek: {}, degerler: [],
      hipotezler: [{ id: 'h1', durum: 'aday', metin: 'belki şusun' }],
    });
    memPanelOpen();
    clickDelete('hipotez', 'h1');
    expect(personalizationSave).not.toHaveBeenCalled();
  });
});

/* DENETİM 2026-08-24 — mühürlü söz (09j) satırının silinmesi. Kırık şuydu:
   case bare `return;` ile çıkıyordu, yani `undefined` (falsy) — storage
   temizleniyor ama panel DOM'u yeniden çizilmiyor ve toast basılmıyordu.
   Kullanıcı ✕'e basıp hiçbir şey olmadığını görüyordu. Komşu case'ler
   (kagit/hipotez) sonucu zaten döndürüyordu; sözleşme buydu. */
describe('_deleteItem — mühürlü söz (09j) paneli', () => {
  it('htUnpin çağrılır ve satır ekrandan DÜŞER', () => {
    const liste = [{ id: 'h1', text: 'Emeğimin karşılığını alamıyorum.', dayKey: '2026-08-24' }];
    window.htListe = () => liste.slice();
    window.htUnpin = vi.fn((id) => {
      const i = liste.findIndex(x => x.id === id);
      if (i < 0) return false;
      liste.splice(i, 1);
      return true;
    });
    memPanelOpen();
    expect(document.body.textContent).toContain('Emeğimin karşılığını alamıyorum.');

    clickDelete('hatirla', 'h1');

    expect(window.htUnpin).toHaveBeenCalledWith('h1');
    expect(document.querySelector('.mem-del[data-kind="hatirla"]')).toBeNull();
    expect(document.body.textContent).not.toContain('Emeğimin karşılığını alamıyorum.');
  });

  it('htUnpin false dönerse panel yeniden çizilmez (yalancı geri bildirim yok)', () => {
    window.htListe = () => [{ id: 'h1', text: 'Bir söz.', dayKey: '2026-08-24' }];
    window.htUnpin = vi.fn(() => false);
    memPanelOpen();
    clickDelete('hatirla', 'h1');
    expect(personalizationSave).not.toHaveBeenCalled();
  });

  it('09j yüklü değilse bölüm hiç doğmaz', () => {
    delete window.htListe;
    memPanelOpen();
    expect(document.querySelector('.mem-del[data-kind="hatirla"]')).toBeNull();
  });
});

describe('Yaşayan Portre sıfırlama', () => {
  it('#mem-yp-reset-btn tıklanınca window.ypResetPortre çağrılır', () => {
    const resetSpy = vi.fn();
    window.ypResetPortre = resetSpy;
    window.ypGetFullState = () => ({
      cekirdek: { mesele: 'Kendine güvenmiyorsun' }, degerler: ['dürüstlük'],
      changelog: [], hipotezler: [],
    });
    memPanelOpen();
    document.getElementById('mem-yp-reset-btn').click();
    expect(resetSpy).toHaveBeenCalledTimes(1);
  });
});

// ─── Portrede beyan (İç Çalışma 02 · boşluk E) ──────────────────────────────

describe('Yaşayan Portre maddeleri — beyan (silme değil susturma)', () => {
  function beyanKur({ susmusIdler = [] } = {}) {
    const cagrilar = { azalt: [], geriAl: [] };
    window.secBeyanId = (tur, metin) => `${tur}:${String(metin).toLocaleLowerCase('tr').slice(0, 48)}`;
    window.secBeyanVar = (id) => susmusIdler.includes(id);
    window.secBeyanAzalt = (tur, id) => { cagrilar.azalt.push([tur, id]); return true; };
    window.secBeyanGeriAl = (id) => { cagrilar.geriAl.push(id); return true; };
    window.ypGetFullState = () => ({
      cekirdek: { mesele: 'Kendine güvenmiyorsun' },
      degerler: [{ deger: 'dürüstlük', kanit: 'yalan söylemek bana ağır geliyor' }],
      celiskiler: [{ metin: 'özgürlük istiyorsun ama izin bekliyorsun' }],
      kor_noktalar: [{ metin: 'onay arayışını göremiyorsun' }],
      changelog: [], hipotezler: [],
    });
    return cagrilar;
  }

  it('değer ve çelişki satırları "Bu ben değilim" düğmesiyle çizilir', () => {
    beyanKur();
    memPanelOpen();
    const btns = [...document.querySelectorAll('.mem-beyan')];
    expect(btns).toHaveLength(2);
    expect(btns.map(b => b.dataset.tur)).toEqual(['portre-deger', 'portre-celiski']);
    expect(document.body.textContent).toContain('Bu ben değilim');
  });

  it('KÖR NOKTALAR panelde ASLA çizilmez — yalnız Ayna Anı töreninden geçer', () => {
    beyanKur();
    memPanelOpen();
    expect(document.body.textContent).not.toContain('onay arayışını göremiyorsun');
    expect([...document.querySelectorAll('.mem-beyan')]
      .some(b => b.dataset.tur === 'portre-kornokta')).toBe(false);
  });

  it('düğmeye basınca beyan defterine tür + metin-kimliğiyle yazar', () => {
    const cagrilar = beyanKur();
    memPanelOpen();
    document.querySelector('.mem-beyan[data-tur="portre-deger"]').click();
    expect(cagrilar.azalt).toEqual([['portre-deger', 'portre-deger:dürüstlük']]);
  });

  it('susturulmuş madde silinmez — soluklaşır ve "Geri al" sunar', () => {
    const cagrilar = beyanKur({ susmusIdler: ['portre-deger:dürüstlük'] });
    memPanelOpen();
    const satir = document.querySelector('.mem-yp-madde--sus');
    expect(satir).toBeTruthy();
    expect(satir.textContent).toContain('dürüstlük');       // madde YERİNDE duruyor
    const btn = satir.querySelector('.mem-beyan');
    expect(btn.textContent).toContain('Geri al');
    btn.click();
    expect(cagrilar.geriAl).toEqual(['portre-deger:dürüstlük']);
  });

  it('kanıt satırı (kullanıcının kendi sözü) maddeyle birlikte görünür', () => {
    beyanKur();
    memPanelOpen();
    expect(document.body.textContent).toContain('yalan söylemek bana ağır geliyor');
  });

  it('09i yüklü değilse panel yine çizilir (savunmacı düşüş)', () => {
    window.ypGetFullState = () => ({
      cekirdek: { mesele: 'Kendine güvenmiyorsun' },
      degerler: [{ deger: 'dürüstlük' }], celiskiler: [], changelog: [], hipotezler: [],
    });
    delete window.secBeyanId; delete window.secBeyanVar;
    expect(() => memPanelOpen()).not.toThrow();
    expect(document.querySelectorAll('.mem-beyan')).toHaveLength(0);
  });
});

/* ─── İç Çalışma 02 · FAZ 5 — G: panelde iki dil var ve ikisi de doğru ────────
   Olgusal kayıt (kişi/gerçek/önemli gün) SİLİNİR: o veriyi yalnız kullanıcının
   beyanı doğurur, silinince geri gelmez. P1 çıkarımı (değer/öz-tanım/savunma)
   ise her mesajda yeniden hasat edilir — silmek tek başına yüzeyseldir, yanına
   beyan yazılmazsa madde ertesi gün geri döner. "Sildim ama geri geldi" bir
   arıza değil GÜVEN kaybıdır; bu testler o dönüşü kapalı tutar. */
describe('_deleteItem — P1 çıkarımı silinince beyan defterine de yazılır', () => {
  function beyanKur() {
    const azalt = [];
    window.secBeyanId = (tur, metin) => {
      const m = String(metin || '').trim().toLocaleLowerCase('tr');
      return m ? `${tur}:${m}` : '';
    };
    window.secBeyanAzalt = (tur, id) => { azalt.push([tur, id]); return true; };
    return azalt;
  }

  it('değer silinince p1-deger beyanı yazılır', () => {
    const azalt = beyanKur();
    S._personalityMap.values = [{ value: 'Kontrol' }];
    memPanelOpen();
    clickDelete('value', '0');
    expect(S._personalityMap.values).toHaveLength(0);
    expect(azalt).toEqual([['p1-deger', 'p1-deger:kontrol']]);
  });

  it('öz-tanım silinince p1-oztanim beyanı yazılır', () => {
    const azalt = beyanKur();
    S._personalityMap.self_descriptions = ['çok çalışkanım'];
    memPanelOpen();
    clickDelete('selfdesc', '0');
    expect(azalt).toEqual([['p1-oztanim', 'p1-oztanim:çok çalışkanım']]);
  });

  it('savunma silinince p1-savunma beyanı TİPİYLE yazılır (metinle değil)', () => {
    const azalt = beyanKur();
    S._personalityMap.defense_mechanisms = [{ type: 'inkar', count: 2 }];
    memPanelOpen();
    clickDelete('defense', '0');
    expect(azalt).toEqual([['p1-savunma', 'p1-savunma:inkar']]);
  });

  /* Kapsam mührü: beyan YALNIZ yeniden hasat edilen çıkarımlara yazılır.
     Olguya yazmak defteri şişirir ve "kullanıcı bunu reddetti" anlamını
     sulandırırdı — kullanıcı bir gerçeği silerken onu reddetmiş olmaz. */
  it('olgusal kayıt (gerçek) silinince beyan YAZILMAZ', () => {
    const azalt = beyanKur();
    S._lifeMemory.lifeFacts = [{ value: 'kedisi var', kaynak: 'beyan', kanit: 'kedim var' }];
    memPanelOpen();
    clickDelete('fact', '0');
    expect(S._lifeMemory.lifeFacts).toHaveLength(0);
    expect(azalt).toEqual([]);
  });

  it('09i yüklü değilse silme yine çalışır (asla bloklama)', () => {
    S._personalityMap.values = [{ value: 'dürüstlük' }];
    memPanelOpen();
    expect(() => clickDelete('value', '0')).not.toThrow();
    expect(S._personalityMap.values).toHaveLength(0);
    expect(personalizationSave).toHaveBeenCalled();
  });
});

/* ─── İç Çalışma 02 · FAZ 5 — I: boş portre sessizlik değil DAVETtir ─────────
   Kanıt kapısı (13y) kanıta bağlanamayan maddeleri düşürür; portre bir gün
   dolu, ertesi gün boş olabilirdi ve panel o bölümü hiç çizmediği için
   kullanıcı sebebini bilmezdi. Sessiz düşüş mühendislikte erdemdir, ANLAM
   katmanında kayıptır. Ayrım tek satırda: motor HİÇ konuşmadıysa "henüz" bile
   denmez (bölüm yok); bir kez konuştuysa sessizliğin kendisi anlatılır. */
describe('Boş portre — sessizlik değil davet', () => {
  const ypKur = (yp) => { window.ypGetFullState = () => yp; };

  it('portre boş ama motor bir kez konuştuysa DAVET çizilir', () => {
    ypKur({ cekirdek: {}, degerler: [], celiskiler: [],
      changelog: [{ tarih: '2026-08-17', ne_ogrendim: 'sabahları ağır kalkıyorsun' }], hipotezler: [] });
    memPanelOpen();
    expect(document.querySelector('.mem-yp-davet')).toBeTruthy();
    expect(document.querySelector('.mem-empty')).toBeFalsy();
  });

  it('davet sayaç değil davet dili konuşur — ve uydurmadığını söyler', () => {
    ypKur({ cekirdek: {}, degerler: [], celiskiler: [],
      changelog: [{ tarih: '2026-08-17', ne_ogrendim: 'x' }], hipotezler: [] });
    memPanelOpen();
    const metin = document.querySelector('.mem-yp-davet').textContent;
    expect(metin).toContain('uydurmaz');
    expect(metin).toContain('konuştukça');
    expect(metin).not.toMatch(/\d+\s*(kayıt|madde|adet)/);
  });

  it('motor hiç konuşmadıysa bölüm HİÇ çizilmez — boş kutu gösterilmez', () => {
    ypKur({ cekirdek: {}, degerler: [], celiskiler: [], changelog: [], hipotezler: [] });
    memPanelOpen();
    expect(document.querySelector('.mem-section--yp')).toBeFalsy();
    expect(document.querySelector('.mem-yp-davet')).toBeFalsy();
    expect(document.querySelector('.mem-empty')).toBeTruthy();   // panelde başka veri yok
  });

  it('portrede tek bir çelişki bile varsa davet DEĞİL portre çizilir', () => {
    ypKur({ cekirdek: {}, degerler: [],
      celiskiler: [{ metin: 'özgürlük istiyorsun ama izin bekliyorsun' }],
      changelog: [], hipotezler: [] });
    memPanelOpen();
    expect(document.querySelector('.mem-yp-davet')).toBeFalsy();
    // 09i (beyan) yüklü DEĞİL — madde yine çizilmeli, yalnız düğmesi düşmeli
    expect(document.body.textContent).toContain('izin bekliyorsun');
    expect(document.querySelectorAll('.mem-beyan')).toHaveLength(0);
  });

  it('dönüşüm yayı tek başına varsa davet DEĞİL portre çizilir', () => {
    ypKur({ cekirdek: { donusum_yayi: 'kaçmaktan kalmaya' }, degerler: [], celiskiler: [],
      changelog: [{ tarih: '2026-08-17', ne_ogrendim: 'x' }], hipotezler: [] });
    memPanelOpen();
    expect(document.querySelector('.mem-yp-davet')).toBeFalsy();
    expect(document.body.textContent).toContain('kaçmaktan kalmaya');
  });

  it('09e yüklü değilse bölüm çizilmez (davet de çizilmez — o hâl "hiç"tir)', () => {
    memPanelOpen();
    expect(document.querySelector('.mem-section--yp')).toBeFalsy();
    expect(document.querySelector('.mem-yp-davet')).toBeFalsy();
  });
});
