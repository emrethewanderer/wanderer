// Derin Çalışma (13A) — Max kapısı ve tezgâhın KANIT KAPISI testleri.
// Kritik olan ikinci grup: kanıtı üç sinyalden az olan kavramda ekranda SAYI
// GÖRÜNMEMELİ (§6.10 · plan K6). Bu testler o kuralı mühürler.
import { describe, it, expect, beforeEach, vi } from 'vitest';

/* 00b testte gerçek bir IndexedDB'ye gitmez. Mock'un asıl işi: arşivden bir
   kağıt silinince SESİN de silindiğini gözlemek — blob cihazda kalırsa
   kullanıcının sildiği çalışmanın izi arkada yaşamaya devam eder. */
vi.mock('../js/parts/00b-indexeddb.js', () => ({
  IDB_STORES: Object.freeze({ CHAT: 'chat', RECORDINGS: 'recordings' }),
  idbOpen: vi.fn(async () => null),
  idbPut: vi.fn(async () => {}),
  idbPutBulk: vi.fn(async () => {}),
  idbGet: vi.fn(async () => null),
  idbGetByIndex: vi.fn(async () => []),
  idbDelete: vi.fn(async () => {}),
  idbSaveChatMessages: vi.fn(async () => {}),
  idbGetChatByUser: vi.fn(async () => []),
  idbSaveRecording: vi.fn(async () => {}),
  idbGetRecording: vi.fn(async () => null),
  idbDeleteRecording: vi.fn(async () => {}),
}));

import { S } from '../js/state.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';
import { idbDeleteRecording, idbGetRecording } from '../js/parts/00b-indexeddb.js';
import { dfRecordWorksheet, dfGetWorksheetSessions } from '../js/parts/09b-depth-foundations.js';
import {
  dcInit, dcIsMax, dcCanWork, dcGuardWork, dcTatUsed, dcLoadView, dcSyncRoomSub,
  dcOnKagitMuhurlendi, dcOpenKagit, dcShowLock, dcOpen,
  dcKozoListe, dcKozoEkle, dcKozoToggle, dcKozoSil,
  dcKazanmaListe, dcKazanmaKaydet, dcKazanmaSil,
  dcOdakGet, dcOdakKaydet, dcOdakSil,
  dcHatCikar, dcUseTat,
} from '../js/parts/13A-derin-calisma.js';
import { ckRenderCard, ckSeal } from '../js/parts/13b-calisma-kagidi.js';

/* Alanın kabuğu normalde _src.html'de duruyor; testte yalnız gövde host'u
   ile oda alt-satırı gerekiyor. */
function kabukKur() {
  document.body.innerHTML = `
    <div id="studio-dc-sub"></div>
    <div id="derincalisma-view"><div id="dc-body"></div></div>`;
}

function bosProfil() {
  return {
    standart:  { score: null, evidence: [], direction: 'flat', signals_count: 0 },
    hak_etmek: { score: null, evidence: [], direction: 'flat', signals_count: 0 },
    normal:    { score: null, evidence: [], direction: 'flat', signals_count: 0 },
    layik:     { score: null, evidence: [], direction: 'flat', signals_count: 0 },
  };
}
function bosTemeller() {
  return {
    oz_sevgi: { score: null, evidence: [], direction: 'flat', signals_count: 0 },
    oz_saygi: { score: null, evidence: [], direction: 'flat', signals_count: 0 },
    oz_deger: { score: null, evidence: [], direction: 'flat', signals_count: 0 },
    oz_guven: { score: null, evidence: [], direction: 'flat', signals_count: 0 },
    bolluk:   { score: null, evidence: [], direction: 'flat', signals_count: 0 },
  };
}

describe('Derin Çalışma — Max kapısı', () => {
  beforeEach(() => {
    // SafeStorage bellek-içi _kvCache paylaşır: her testte benzersiz uid şart.
    S.currentUser = { id: 'test-uid-dc-' + Date.now() + '-' + Math.random() };
    S.isPremiumPlus = false;
    S._kota = null;
    S._derinCalisma = undefined;
    dcInit();
    kabukKur();
  });

  it('Max olmayan kullanıcıda dcIsMax() false döner', () => {
    expect(dcIsMax()).toBe(false);
  });

  it('sunucu kotası tier=max derse istemci bayrağı olmadan da Max sayılır', () => {
    S._kota = { tier: 'max' };
    expect(dcIsMax()).toBe(true);
  });

  it('Max olmayan bir kez tadar, ikinci kez kilide çarpar', () => {
    const spotlight = vi.fn();
    window.showPremiumFeatureSpotlight = spotlight;

    expect(dcCanWork()).toBe(true);
    expect(dcGuardWork()).toBe(true);      // tat harcanır
    expect(dcTatUsed()).toBe(true);
    expect(spotlight).not.toHaveBeenCalled();

    expect(dcGuardWork()).toBe(false);     // kilit
    expect(spotlight).toHaveBeenCalledWith('derin-calisma');
  });

  it('Max kullanıcıda tat hiç harcanmaz ve kapı hep açıktır', () => {
    S.isPremiumPlus = true;
    expect(dcGuardWork()).toBe(true);
    expect(dcGuardWork()).toBe(true);
    expect(dcTatUsed()).toBe(false);
  });

  it('oda alt-satırı kapı durumunu yansıtır', () => {
    dcSyncRoomSub();
    const el = () => document.getElementById('studio-dc-sub').textContent;
    expect(el()).toBe('bir çalışma seni bekliyor');
    dcGuardWork();
    dcSyncRoomSub();
    expect(el()).toBe('Max ile açılır');
    S.isPremiumPlus = true;
    dcSyncRoomSub();
    expect(el()).toBe('tezgâh açık');
  });
});

describe('Derin Çalışma — tezgâhın kanıt kapısı (K6)', () => {
  beforeEach(() => {
    S.currentUser = { id: 'test-uid-dck-' + Date.now() + '-' + Math.random() };
    S.isPremiumPlus = true;
    S._kota = null;
    S._derinCalisma = undefined;
    S._depthProfile = bosProfil();
    S._foundationsProfile = bosTemeller();
    dcInit();
    kabukKur();
  });

  it('dokuz kavramın tamamı tezgâhta listelenir', () => {
    dcLoadView();
    const kartlar = document.querySelectorAll('.dc-kavram');
    expect(kartlar.length).toBe(9);
  });

  it('kanıtsız kavramda SAYI yoktur, davet vardır', () => {
    dcLoadView();
    const kart = document.querySelector('.dc-kavram[data-kavram="standart"]');
    // Davet kartta artık yalnız ekran okuyucu için durur (sr-only) — göze
    // grubun başındaki tek cümle söyler.
    const davet = kart.querySelector('.dc-kavram-davet');
    expect(davet).not.toBeNull();
    expect(davet.classList.contains('sr-only')).toBe(true);
    expect(kart.querySelector('.dc-kavram-mertebe')).toBeNull();
    // Kartın hiçbir yerinde rakam görünmemeli
    expect(kart.textContent).not.toMatch(/\d/);
  });

  it('davet dokuz kez değil, sessiz kartı olan her grupta BİR kez basılır', () => {
    dcLoadView();
    // İki grup da tamamen sessiz → iki davet satırı, dokuz değil
    expect(document.querySelectorAll('.dc-grup-davet').length).toBe(2);

    // Bir grubun tamamı kanıtlanınca o grubun daveti düşer
    for (const key of ['standart', 'hak_etmek', 'normal', 'layik']) {
      S._depthProfile[key] = {
        score: 72, direction: 'up', signals_count: 4,
        evidence: [{ text: 'bunu hak ediyorum', type: 'high', ts: 1 }],
      };
    }
    dcLoadView();
    expect(document.querySelectorAll('.dc-grup-davet').length).toBe(1);
  });

  it('halkanın izi kanıtsızda dövülmemiş, kanıtlıda mertebesinde durur', () => {
    S._depthProfile.standart = {
      score: 82, direction: 'up', signals_count: 5,
      evidence: [{ text: 'standardımı yükselttim', type: 'high', ts: 1 }],
    };
    dcLoadView();
    const kanitli = document.querySelector('.dc-kavram[data-kavram="standart"]');
    const sessiz  = document.querySelector('.dc-kavram[data-kavram="normal"]');
    expect(kanitli.querySelector('.dc-halka--guclu')).not.toBeNull();
    expect(sessiz.querySelector('.dc-halka--yok')).not.toBeNull();
    // Halka bir SAYI değildir: kademe sınıfı dışında rakam sızmaz
    expect(sessiz.textContent).not.toMatch(/\d/);
  });

  it('mühürlenen kağıt, kavram kartına çalışıldı izi düşürür (tezgâh silinmez)', () => {
    dcLoadView();
    const kart = () => document.querySelector('.dc-kavram[data-kavram="layik"]');
    expect(kart().querySelector('.dc-kavram-iz')).toBeNull();

    // Kağıt tezgâhın içinde açık dururken mühür basılıyor
    const host = document.getElementById('dc-kagit-host');
    host.innerHTML = '<div class="ck-card" data-nisan="test"></div>';
    dcOnKagitMuhurlendi('layik');

    expect(kart().querySelector('.dc-kavram-iz')).not.toBeNull();
    // Mühür anının ortasında kağıt YOK EDİLMEZ
    expect(document.querySelector('#dc-kagit-host .ck-card')).not.toBeNull();
  });

  it('iki sinyal HÂLÂ yetmez — kapı üçtür', () => {
    S._depthProfile.standart = {
      score: 38, direction: 'down', signals_count: 2,
      evidence: [{ text: 'buna alışkınım', type: 'low', ts: Date.now() }],
    };
    dcLoadView();
    const kart = document.querySelector('.dc-kavram[data-kavram="standart"]');
    expect(kart.querySelector('.dc-kavram-mertebe')).toBeNull();
    expect(kart.textContent).not.toContain('buna alışkınım');
  });

  it('üç sinyalde mertebe açılır ve kanıt KULLANICININ cümlesidir', () => {
    S._depthProfile.standart = {
      score: 26, direction: 'down', signals_count: 3,
      evidence: [
        { text: 'eski cümle', type: 'low', ts: 1 },
        { text: 'daha iyisini bekleyemem', type: 'low', ts: 2 },
      ],
    };
    dcLoadView();
    const kart = document.querySelector('.dc-kavram[data-kavram="standart"]');
    expect(kart.querySelector('.dc-kavram-mertebe').textContent).toContain('İNCE');
    // En SON kanıt gösterilir ve metni birebir kaynaktan gelir
    expect(kart.textContent).toContain('daha iyisini bekleyemem');
    expect(kart.textContent).not.toContain('eski cümle');
    // Mertebe etiketi gösterilir ama ham skor (26) ekrana YAZILMAZ
    expect(kart.textContent).not.toContain('26');
  });

  it('"en ince halka" önerisi yalnız kanıtlı kavramlar arasından seçilir', () => {
    // Kanıtsız ama çok düşük skorlu bir kavram öneriyi ELE GEÇİRMEMELİ
    S._depthProfile.layik = {
      score: 7, direction: 'down', signals_count: 1,
      evidence: [{ text: 'layık değilim', type: 'low', ts: 1 }],
    };
    S._foundationsProfile.oz_guven = {
      score: 44, direction: 'flat', signals_count: 4,
      evidence: [{ text: 'kendime güvenmiyorum', type: 'low', ts: 2 }],
    };
    dcLoadView();
    const oneri = document.querySelector('.dc-oneri-btn');
    expect(oneri).not.toBeNull();
    expect(oneri.dataset.kavram).toBe('oz_guven');
  });

  it('hiç kanıt yoksa öneri satırı hiç basılmaz', () => {
    dcLoadView();
    expect(document.querySelector('.dc-oneri')).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════
   KO-ZO TEZGÂHI (Kitap 2 · #59)
   Burada ölçüm yok, beyan var: testler veri bütünlüğünü ve kapının
   doğru yerde durduğunu tutar — madde EKLEMEK yeni bir çalışmadır
   (kapılı), kendi maddesini işaretlemek ve silmek değildir (kapısız).
══════════════════════════════════════════════════════════════ */
describe('Derin Çalışma — Ko-Zo tezgâhı', () => {
  beforeEach(() => {
    S.currentUser = { id: 'test-uid-kz-' + Date.now() + '-' + Math.random() };
    S.isPremiumPlus = true;          // kapı ayrı testte sınanır
    S._kota = null;
    S._derinCalisma = undefined;
    S._depthProfile = bosProfil();
    S._foundationsProfile = bosTemeller();
    dcInit();
    kabukKur();
  });

  it('madde ekler ve iki sütunu ayrı tutar', () => {
    expect(dcKozoEkle('ko', 'Kitabı masanın üstüne koy')).toBe(true);
    expect(dcKozoEkle('zo', 'Şarj aletini salonda bırak')).toBe(true);
    expect(dcKozoListe('ko').length).toBe(1);
    expect(dcKozoListe('zo').length).toBe(1);
    expect(dcKozoListe('ko')[0].metin).toBe('Kitabı masanın üstüne koy');
  });

  it('boş ya da yalnız boşluktan ibaret madde eklenmez', () => {
    expect(dcKozoEkle('ko', '   ')).toBe(false);
    expect(dcKozoEkle('ko', '')).toBe(false);
    expect(dcKozoEkle('ko', null)).toBe(false);
    expect(dcKozoListe('ko').length).toBe(0);
  });

  it('tanımsız sütuna yazılmaz', () => {
    expect(dcKozoEkle('xx', 'bir şey')).toBe(false);
    expect(dcKozoListe('xx')).toEqual([]);
  });

  it('işaretleme iki yönlü çalışır ve kalıcıdır', () => {
    dcKozoEkle('ko', 'Sayfayı güne böl');
    const id = dcKozoListe('ko')[0].id;
    expect(dcKozoToggle('ko', id)).toBe(true);
    expect(dcKozoListe('ko')[0].done).toBe(true);
    dcKozoToggle('ko', id);
    expect(dcKozoListe('ko')[0].done).toBe(false);
  });

  it('silme yalnız hedef maddeyi düşürür', () => {
    dcKozoEkle('ko', 'bir');
    dcKozoEkle('ko', 'iki');
    const id = dcKozoListe('ko')[0].id;
    expect(dcKozoSil('ko', id)).toBe(true);
    expect(dcKozoListe('ko').length).toBe(1);
    expect(dcKozoListe('ko')[0].metin).toBe('iki');
    expect(dcKozoSil('ko', 'olmayan-id')).toBe(false);
  });

  it('sütun tavanı aşılmaz (tezgâh yapılacaklar listesine dönmesin)', () => {
    for (let i = 0; i < 12; i++) expect(dcKozoEkle('ko', 'madde ' + i)).toBe(true);
    expect(dcKozoEkle('ko', 'on üçüncü')).toBe(false);
    expect(dcKozoListe('ko').length).toBe(12);
  });

  it('eski kayıtta kozo alanı yoksa yerinde onarılır, veri düşmez', () => {
    S._derinCalisma = { lastRoom: 'ayna' };          // FAZ 5 öncesi kayıt şekli
    expect(dcKozoListe('ko')).toEqual([]);
    expect(dcKozoEkle('zo', 'gece ekranı odadan çıkar')).toBe(true);
    expect(S._derinCalisma.lastRoom).toBe('ayna');   // eski alan korundu
  });

  it('yüzeyde iki sütun ve kitap örnekleri boş durumda görünür', () => {
    dcLoadView();
    expect(document.querySelectorAll('.dc-kozo-sutun').length).toBe(2);
    expect(document.querySelectorAll('.dc-kozo-bos').length).toBe(2);
    dcKozoEkle('ko', 'Spor çantasını kapının yanına bırak');
    dcLoadView();
    expect(document.querySelectorAll('.dc-kozo-madde').length).toBe(1);
    // Madde varken o sütunun boş-durum örnekleri artık basılmaz
    expect(document.querySelectorAll('.dc-kozo-bos').length).toBe(1);
  });

  it('Max olmayan: ilk madde tadı harcar, ikincisi kilide çarpar', () => {
    S.isPremiumPlus = false;
    const spotlight = vi.fn();
    window.showPremiumFeatureSpotlight = spotlight;
    expect(dcKozoEkle('ko', 'ilk hamle')).toBe(true);
    expect(dcTatUsed()).toBe(true);
    expect(dcKozoEkle('ko', 'ikinci hamle')).toBe(false);
    expect(spotlight).toHaveBeenCalledWith('derin-calisma');
    expect(dcKozoListe('ko').length).toBe(1);
    delete window.showPremiumFeatureSpotlight;
  });

  it('kendi maddesini işaretlemek/silmek kapıya takılmaz (tat harcanmış olsa bile)', () => {
    dcKozoEkle('ko', 'kurulacak düzenek');
    const id = dcKozoListe('ko')[0].id;
    S.isPremiumPlus = false;
    window.showPremiumFeatureSpotlight = vi.fn();
    expect(dcKozoToggle('ko', id)).toBe(true);
    expect(dcKozoSil('ko', id)).toBe(true);
    expect(window.showPremiumFeatureSpotlight).not.toHaveBeenCalled();
    delete window.showPremiumFeatureSpotlight;
  });
});

/* ══════════════════════════════════════════════════════════════
   KAZANMA YÖNTEMİ (Kitap 2 · #52)
   K6'nın buradaki hâli: damıtılmış örüntü YOKSA tezgâh bir sonuç
   uydurmaz — ne başlık, ne kanıt, ne sayı. Sessiz davet basar.
══════════════════════════════════════════════════════════════ */
describe('Derin Çalışma — Kazanma Yöntemi', () => {
  beforeEach(() => {
    S.currentUser = { id: 'test-uid-ky-' + Date.now() + '-' + Math.random() };
    S.isPremiumPlus = true;
    S._kota = null;
    S._derinCalisma = undefined;
    S._depthProfile = bosProfil();
    S._foundationsProfile = bosTemeller();
    dcInit();
    kabukKur();
    delete window.omGetDirencliOruntuler;
  });

  it('KANIT KAPISI: örüntü yokken sayı/başlık değil, davet basılır', () => {
    dcLoadView();
    expect(document.querySelector('.dc-ky-sessiz')).not.toBeNull();
    expect(document.querySelector('.dc-ky-oruntu')).toBeNull();
    const ky = document.getElementById('dc-kazanma');
    expect(/\d/.test(ky.querySelector('.dc-ky-sessiz').textContent)).toBe(false);
  });

  it('damıtılmış örüntü varsa başlık + kullanıcının kendi cümlesi görünür', () => {
    window.omGetDirencliOruntuler = () => ([{
      id: 'p1', baslik: 'Onay arayışı', tip: 'dongu',
      kanit: 'yine herkese sordum, kendi kararımı veremedim', hafta_sayisi: 3,
    }]);
    dcLoadView();
    const kart = document.querySelector('.dc-ky-oruntu');
    expect(kart).not.toBeNull();
    expect(kart.textContent).toContain('Onay arayışı');
    expect(kart.textContent).toContain('yine herkese sordum');
    expect(document.querySelector('.dc-ky-sessiz')).toBeNull();
  });

  it('09d yoksa ya da patlarsa tezgâh sessizce davete düşer (asla bloklama)', () => {
    window.omGetDirencliOruntuler = () => { throw new Error('09d yüklenmedi'); };
    expect(() => dcLoadView()).not.toThrow();
    expect(document.querySelector('.dc-ky-sessiz')).not.toBeNull();
  });

  it('ilk iki soru boşken mühür düşmez', () => {
    expect(dcKazanmaKaydet({ s1: '', s2: 'bir yöntem', secim: 'yontem' })).toBe(false);
    expect(dcKazanmaKaydet({ s1: 'bir sonuç', s2: '  ', secim: 'yontem' })).toBe(false);
    expect(dcKazanmaListe().length).toBe(0);
  });

  it('yol seçilmeden mühür düşmez — karar kullanıcınındır', () => {
    expect(dcKazanmaKaydet({ s1: 'sonuç', s2: 'yöntem' })).toBe(false);
    expect(dcKazanmaKaydet({ s1: 'sonuç', s2: 'yöntem', secim: 'baska' })).toBe(false);
    expect(dcKazanmaListe().length).toBe(0);
  });

  it('üç cevap tamamsa kayıt düşer ve mühür sesi çalınır', () => {
    const cue = vi.fn();
    window.fxCue = cue;
    expect(dcKazanmaKaydet({
      s1: 'hep aynı yerde tıkanıyorum', s2: 'daha çok çalışmak',
      secim: 'yontem', neden: 'çabam değil yolum yanlış', oruntuBaslik: 'Onay arayışı',
    })).toBe(true);
    const k = dcKazanmaListe()[0];
    expect(k.s1).toBe('hep aynı yerde tıkanıyorum');
    expect(k.secim).toBe('yontem');
    expect(k.oruntuBaslik).toBe('Onay arayışı');
    expect(cue).toHaveBeenCalledWith('seal');
    delete window.fxCue;
  });

  it('kayıt silinebilir — kullanıcı kendi çalışmasının sahibidir', () => {
    dcKazanmaKaydet({ s1: 'a', s2: 'b', secim: 'hedef' });
    const id = dcKazanmaListe()[0].id;
    expect(dcKazanmaSil(id)).toBe(true);
    expect(dcKazanmaListe().length).toBe(0);
    expect(dcKazanmaSil('yok')).toBe(false);
  });

  /* REGRESYON (öz-denetimde yakalandı): form açılışı da mühür de kapı
     çağırırsa, Max olmayan kullanıcı formu açarken tadını harcar ve
     DOLDURDUKTAN SONRA kendi kilidine çarpar — yazdığı çöpe gider. Tat yalnız
     mühürde harcanır; açılış izni tat tüketmeden sorulur. */
  it('form açmak tadı HARCAMAZ — tat mühürde harcanır, yazdığı çöpe gitmez', () => {
    S.isPremiumPlus = false;
    window.showPremiumFeatureSpotlight = vi.fn();
    dcLoadView();
    document.querySelector('.dc-ky-ac').click();
    expect(document.querySelector('.dc-ky-form')).not.toBeNull();
    expect(dcTatUsed()).toBe(false);            // açılış tadı yemedi
    expect(window.showPremiumFeatureSpotlight).not.toHaveBeenCalled();

    // Kullanıcı doldurur ve mührü basar — çalışma GERÇEKTEN kaydolmalı
    document.querySelector('#dc-ky-s1').value = 'hep aynı sonuç';
    document.querySelector('#dc-ky-s2').value = 'aynı yöntem';
    document.querySelector('[data-ky-sec="yontem"]').click();
    document.querySelector('[data-ky-muhur]').click();
    expect(dcKazanmaListe().length).toBe(1);
    expect(dcTatUsed()).toBe(true);             // tat burada harcandı
    delete window.showPremiumFeatureSpotlight;
  });

  it('tat harcanmışsa form hiç açılmaz — dolduramayacağı forma oturtulmaz', () => {
    S.isPremiumPlus = false;
    const spotlight = vi.fn();
    window.showPremiumFeatureSpotlight = spotlight;
    dcGuardWork();                               // tadı başka bir tezgâh harcadı
    dcLoadView();
    document.querySelector('.dc-ky-ac').click();
    expect(document.querySelector('.dc-ky-form')).toBeNull();
    expect(spotlight).toHaveBeenCalledWith('derin-calisma');
    delete window.showPremiumFeatureSpotlight;
  });

  it('Max olmayan: yol haritası kaydı da tek seferlik tadın içindedir', () => {
    S.isPremiumPlus = false;
    window.showPremiumFeatureSpotlight = vi.fn();
    expect(dcKazanmaKaydet({ s1: 'a', s2: 'b', secim: 'hedef' })).toBe(true);
    expect(dcKazanmaKaydet({ s1: 'c', s2: 'd', secim: 'yontem' })).toBe(false);
    expect(window.showPremiumFeatureSpotlight).toHaveBeenCalledWith('derin-calisma');
    expect(dcKazanmaListe().length).toBe(1);
    delete window.showPremiumFeatureSpotlight;
  });
});

/* ══════════════════════════════════════════════════════════════
   SÜPER ODAK (Kitap 2 · #134)
   Kitabın kapısı burada bir `&&`: kalp ve zihin AYNI hedefi
   göstermeden odak kurulmuş sayılmaz. Tek onayla geçilirse tezgâh
   kitabın söylemediği bir şeyi söylemiş olur — testler onu tutar.
   İkinci kural gerçeklik: OİK yan yana GÖSTERİLİR, uyum SKORU
   üretilmez (§6.10).
══════════════════════════════════════════════════════════════ */
describe('Derin Çalışma — Süper Odak', () => {
  beforeEach(() => {
    S.currentUser = { id: 'test-uid-odak-' + Date.now() + '-' + Math.random() };
    S.isPremiumPlus = true;
    S._kota = null;
    S._derinCalisma = undefined;
    S._depthProfile = bosProfil();
    S._foundationsProfile = bosTemeller();
    dcInit();
    kabukKur();
    delete window.oikGetDesired;
  });

  it('başlangıçta odak yok — alan sessiz durur, davet basılır', () => {
    expect(dcOdakGet()).toBeNull();
    dcLoadView();
    expect(document.querySelector('.dc-odak-ac')).not.toBeNull();
    expect(document.querySelector('.dc-odak-kart')).toBeNull();
  });

  it('KİTABIN KAPISI: tek onayla odak kurulmaz', () => {
    expect(dcOdakKaydet({ hedef: 'kitabımı bitirmek', zihin: true, kalp: false })).toBe(false);
    expect(dcOdakKaydet({ hedef: 'kitabımı bitirmek', zihin: false, kalp: true })).toBe(false);
    expect(dcOdakKaydet({ hedef: 'kitabımı bitirmek', zihin: false, kalp: false })).toBe(false);
    expect(dcOdakGet()).toBeNull();
  });

  it('hedef boşken iki onay da dolu olsa odak kurulmaz', () => {
    expect(dcOdakKaydet({ hedef: '   ', zihin: true, kalp: true })).toBe(false);
    expect(dcOdakGet()).toBeNull();
  });

  it('ikisi birden geldiğinde odak kurulur ve mühür sesi çalınır', () => {
    const cue = vi.fn();
    window.fxCue = cue;
    expect(dcOdakKaydet({ hedef: 'kitabımı bitirmek', zihin: true, kalp: true })).toBe(true);
    const o = dcOdakGet();
    expect(o.hedef).toBe('kitabımı bitirmek');
    expect(o.zihin).toBe(true);
    expect(o.kalp).toBe(true);
    expect(cue).toHaveBeenCalledWith('seal');
    delete window.fxCue;
  });

  it('TEK hedef: yeni odak eskisinin yerine geçer, liste birikmez', () => {
    dcOdakKaydet({ hedef: 'ilk hedef', zihin: true, kalp: true });
    dcOdakKaydet({ hedef: 'ikinci hedef', zihin: true, kalp: true });
    expect(dcOdakGet().hedef).toBe('ikinci hedef');
    expect(Array.isArray(S._derinCalisma.odak)).toBe(false);
  });

  it('kurulu odak yüzeyde izleriyle görünür ve silinebilir', () => {
    dcOdakKaydet({ hedef: 'kitabımı bitirmek', zihin: true, kalp: true });
    dcLoadView();
    const kart = document.querySelector('.dc-odak-kart');
    expect(kart).not.toBeNull();
    expect(kart.textContent).toContain('kitabımı bitirmek');
    expect(document.querySelectorAll('.dc-odak-iz').length).toBe(2);
    expect(dcOdakSil()).toBe(true);
    expect(dcOdakGet()).toBeNull();
    expect(dcOdakSil()).toBe(false);
  });

  /* Öz-denetim bulgusu: `dcOdakSil` yazılıydı ve window'daydı ama yüzeyde
     karşılığı yoktu — oysa Ko-Zo, arşiv ve yol haritasının hepsinde kullanıcı
     kendi kaydını kaldırabiliyor. Kaldırma kapıya da takılmaz. */
  it('kurulu odak yüzeyden kaldırılabilir ve kaldırma kapıya takılmaz', () => {
    dcOdakKaydet({ hedef: 'her sabah yazmak', zihin: true, kalp: true });
    dcLoadView();
    expect(document.querySelector('[data-odak-kaldir]')).not.toBeNull();
    S.isPremiumPlus = false;                      // tat çoktan harcandı
    window.showPremiumFeatureSpotlight = vi.fn();
    document.querySelector('[data-odak-kaldir]').click();
    expect(dcOdakGet()).toBeNull();
    expect(document.querySelector('.dc-odak-ac')).not.toBeNull();   // davete döndü
    expect(window.showPremiumFeatureSpotlight).not.toHaveBeenCalled();
    delete window.showPremiumFeatureSpotlight;
  });

  it('GERÇEKLİK: OİK varsa adı gösterilir, uyum SKORU üretilmez', () => {
    window.oikGetDesired = () => ({ name: 'Sözünü Tutan', whisper: '', description: 'Sözünü Tutan' });
    dcLoadView();
    document.querySelector('.dc-odak-ac').click();
    const oik = document.querySelector('.dc-odak-oik');
    expect(oik).not.toBeNull();
    expect(oik.textContent).toContain('Sözünü Tutan');
    // Hiçbir yüzde/puan/uyum sayısı basılmamalı — karşılaştırmayı kullanıcı yapar
    expect(/%|\d+\s*\/\s*\d+/.test(document.getElementById('dc-odak').textContent)).toBe(false);
    delete window.oikGetDesired;
  });

  it('OİK yoksa (ya da patlarsa) satır hiç basılmaz, form yine açılır', () => {
    window.oikGetDesired = () => { throw new Error('10D yüklenmedi'); };
    dcLoadView();
    expect(() => document.querySelector('.dc-odak-ac').click()).not.toThrow();
    expect(document.querySelector('.dc-odak-oik')).toBeNull();
    expect(document.querySelector('.dc-odak-form')).not.toBeNull();
    delete window.oikGetDesired;
  });

  it('onaylar formda sıfırdan gelir — eski onay kullanıcı adına taşınmaz', () => {
    dcOdakKaydet({ hedef: 'ilk hedef', zihin: true, kalp: true });
    dcLoadView();
    document.querySelector('[data-odak-degistir]').click();
    // Hedef alanı dolu gelir (yazdığını kaybetmesin) ama onaylar boş
    expect(document.querySelector('#dc-odak-hedef').value).toBe('ilk hedef');
    [...document.querySelectorAll('[data-odak-onay]')].forEach(b => {
      expect(b.getAttribute('aria-pressed')).toBe('false');
    });
    // Onaysız mühür düşmez: hedef hâlâ eski kayıt
    document.querySelector('[data-odak-muhur]').click();
    expect(dcOdakGet().hedef).toBe('ilk hedef');
  });

  it('yüzeyde çift onay → mühür akışı uçtan uca yürür', () => {
    dcLoadView();
    document.querySelector('.dc-odak-ac').click();
    document.querySelector('#dc-odak-hedef').value = 'her sabah yazmak';
    document.querySelector('[data-odak-onay="zihin"]').click();
    document.querySelector('[data-odak-muhur]').click();
    expect(dcOdakGet()).toBeNull();                 // tek onay yetmedi
    document.querySelector('[data-odak-onay="kalp"]').click();
    document.querySelector('[data-odak-muhur]').click();
    expect(dcOdakGet().hedef).toBe('her sabah yazmak');
    expect(document.querySelector('.dc-odak-kart')).not.toBeNull();
  });

  it('Max olmayan: form açılışı tadı harcamaz, mühür harcar', () => {
    S.isPremiumPlus = false;
    window.showPremiumFeatureSpotlight = vi.fn();
    dcLoadView();
    document.querySelector('.dc-odak-ac').click();
    expect(dcTatUsed()).toBe(false);
    document.querySelector('#dc-odak-hedef').value = 'her sabah yazmak';
    document.querySelector('[data-odak-onay="zihin"]').click();
    document.querySelector('[data-odak-onay="kalp"]').click();
    document.querySelector('[data-odak-muhur]').click();
    expect(dcOdakGet()).not.toBeNull();
    expect(dcTatUsed()).toBe(true);
    delete window.showPremiumFeatureSpotlight;
  });
});

/* ══════════════════════════════════════════════════════════════
   DÖNÜŞÜM HATTI (FAZ 8) — yorum ile kanıtın ayrımı.
   Hat, 12'nin `w3GetChapters` okuyucusundan gelir; 13A onu window
   üzerinden okur. İki kural mühürlenir: ① bölüm başlığı MODELİN
   YORUMUDUR ve öyle etiketlenir, altındaki satırlar kullanıcının
   kendi gün başlıklarıdır; ② gün satırı TIKLANMAZ — gün özeti
   okuyucusunun kabuğu DOM'da yok, götüreceği yer olmayan satır bir
   yere götürür gibi durmaz.
══════════════════════════════════════════════════════════════ */
describe('Derin Çalışma — Dönüşüm Hattı', () => {
  const HAT = {
    chapters: {
      intro: 'Üç haftada iki eşikten geçtin.',
      chapters: [
        { title: 'Sessiz Başlangıç', description: 'İlk günler tanışmayla geçti.', day_indices: [0, 1] },
        { title: 'İlk Söz', description: 'Bir söz verildi ve tutuldu.', day_indices: [2] },
      ],
    },
    gunler: [
      { dk: '2026-7-1', at: '2026-08-01T09:00:00Z', baslik: 'Tanışma', ton: 'sakin' },
      { dk: '2026-7-2', at: '2026-08-02T09:00:00Z', baslik: 'Eski tartışma', ton: 'gergin' },
      { dk: '2026-7-3', at: '2026-08-03T09:00:00Z', baslik: 'Verilen söz', ton: 'kararlı' },
    ],
  };

  beforeEach(() => {
    S.currentUser = { id: 'test-uid-hat-' + Date.now() + '-' + Math.random() };
    S.isPremiumPlus = true;
    S._kota = null;
    S._derinCalisma = undefined;
    S._depthProfile = bosProfil();
    S._foundationsProfile = bosTemeller();
    S._activeChallenge = null;
    S._completedSeferler = [];
    dcInit();
    kabukKur();
    delete window.w3GetChapters;
    delete window.w3GetChaptersCached;
    delete window.loadChallenges;
  });

  it('hat yoksa davet basılır, üretim düğmesi durur', () => {
    dcLoadView();
    const host = document.getElementById('dc-hat');
    expect(host.querySelector('[data-hat-cikar]')).not.toBeNull();
    expect(host.querySelector('.dc-hat-bolum')).toBeNull();
  });

  it('12 hiç yüklenmemişse alan patlamaz, hat sessizce davete düşer', async () => {
    dcLoadView();
    await expect(dcHatCikar()).resolves.toBe(false);
    expect(document.getElementById('dc-hat').querySelector('.dc-hat-bolum')).toBeNull();
  });

  it('cache varsa bölümler ANINDA basılır — okumak kapıya takılmaz', () => {
    S.isPremiumPlus = false;
    window.w3GetChaptersCached = () => HAT;
    dcLoadView();
    const host = document.getElementById('dc-hat');
    expect(host.querySelectorAll('.dc-hat-bolum').length).toBe(2);
    expect(host.textContent).toContain('Sessiz Başlangıç');
    expect(dcTatUsed()).toBe(false);          // okumak tat harcamaz
  });

  it('YORUM etiketlenir ve kullanıcının KENDİ gün başlıkları altında durur', () => {
    window.w3GetChaptersCached = () => HAT;
    dcLoadView();
    const host = document.getElementById('dc-hat');
    expect(host.querySelector('.dc-hat-okuma')).not.toBeNull();   // "bu bir okuma"
    const gunler = host.querySelectorAll('.dc-hat-gun-baslik');
    expect(gunler.length).toBe(3);
    expect([...gunler].map(g => g.textContent)).toContain('Eski tartışma');
  });

  it('gün satırı TIKLANMAZ — götüreceği yer olmayan satır kapı gibi durmaz', () => {
    window.w3GetChaptersCached = () => HAT;
    dcLoadView();
    const gunler = document.getElementById('dc-hat').querySelector('.dc-hat-gunler');
    expect(gunler.querySelector('button')).toBeNull();
    expect(gunler.querySelector('[onclick]')).toBeNull();
  });

  it('KANIT KAPISI: gün yetmiyorsa hat üretilmez — sayı YOK, davet var', async () => {
    window.w3GetChapters = vi.fn(async () => ({ ok: false, sebep: 'az_gun' }));
    dcLoadView();
    await dcHatCikar();
    const host = document.getElementById('dc-hat');
    expect(host.querySelector('.dc-hat-sessiz')).not.toBeNull();
    expect(host.querySelector('.dc-hat-bolum')).toBeNull();
    // Eşik de dahil hiçbir rakam ekrana yazılmaz
    expect(/\d/.test(host.textContent)).toBe(false);
  });

  it('SAHTE BAŞARI YOK: üretim düşerse bunu söyler ve yol açık kalır', async () => {
    window.w3GetChapters = vi.fn(async () => ({ ok: false, sebep: 'uretilemedi', hata: 'model sustu' }));
    dcLoadView();
    await dcHatCikar();
    const host = document.getElementById('dc-hat');
    expect(host.querySelector('.dc-hat-bolum')).toBeNull();
    expect(host.querySelector('[data-hat-cikar]')).not.toBeNull();   // yeniden dene
  });

  it('üretim başarılıysa bölümler basılır', async () => {
    window.w3GetChapters = vi.fn(async () => ({ ok: true, chapters: HAT.chapters, gunler: HAT.gunler, taze: true }));
    dcLoadView();
    await dcHatCikar();
    expect(document.getElementById('dc-hat').querySelectorAll('.dc-hat-bolum').length).toBe(2);
  });

  it('Max olmayanda ÜRETMEK tadı harcar (LLM çağrısı gerçek bir çalışmadır)', async () => {
    S.isPremiumPlus = false;
    window.showPremiumFeatureSpotlight = vi.fn();
    window.w3GetChapters = vi.fn(async () => ({ ok: true, chapters: HAT.chapters, gunler: HAT.gunler }));
    dcLoadView();
    await dcHatCikar();
    expect(window.w3GetChapters).toHaveBeenCalledTimes(1);
    expect(dcTatUsed()).toBe(true);
    // Tat harcandı: ikinci üretim kilide çarpar, LLM'e ikinci kez gidilmez
    await dcHatCikar({ force: true });
    expect(window.w3GetChapters).toHaveBeenCalledTimes(1);
    expect(window.showPremiumFeatureSpotlight).toHaveBeenCalled();
    delete window.showPremiumFeatureSpotlight;
  });

  it('tazeleme cache\'i atlayarak ister (force)', async () => {
    window.w3GetChaptersCached = () => HAT;
    window.w3GetChapters = vi.fn(async () => ({ ok: true, chapters: HAT.chapters, gunler: HAT.gunler }));
    dcLoadView();
    document.querySelector('[data-hat-tazele]').click();
    await Promise.resolve(); await Promise.resolve();
    expect(window.w3GetChapters).toHaveBeenCalledWith({ force: true });
  });
});

/* ══════════════════════════════════════════════════════════════
   SEFER (FAZ 8) — 21 gün, aynı yere dönmek.
   Sefer Engeller/Örüntü'den başlar; buraya yalnız GÖRÜNÜR olmaya
   gelir. Üç kural mühürlenir: ① kapı YOK (yol başka kapılardan
   başladı, DC_ROOMS'un gate:false gerekçesi), ② yüzeyde nefes gibi
   uydurulmuş bir ölçü GÖRÜNMEZ (§6.10), ③ gün mühürlüyse düğme
   yerine iz durur.
══════════════════════════════════════════════════════════════ */
describe('Derin Çalışma — Sefer takibi', () => {
  const SEFER = {
    id: 'ch-1', challenge_id: 'sefer_erteleme_1', boss_id: 'erteleme',
    challenge_name: 'Erteleme Seferi', current_day: 5, status: 'active',
    nefes_at_start: 45, nefes_now: 30,
    challenge_tasks: Array.from({ length: 21 }, (_, i) => 'Gün ' + (i + 1) + ' adımı'),
  };

  beforeEach(() => {
    S.currentUser = { id: 'test-uid-sefer-' + Date.now() + '-' + Math.random() };
    S.isPremiumPlus = false;      // kapı OLMADIĞI kanıtlansın diye Max DEĞİL
    S._kota = null;
    S._derinCalisma = undefined;
    S._depthProfile = bosProfil();
    S._foundationsProfile = bosTemeller();
    S._activeChallenge = null;
    S._completedSeferler = [];
    dcInit();
    kabukKur();
    delete window.loadChallenges;
    delete window.completeChallengeDay;
    delete window.seferBugunMuhurlendi;
    delete window.seferGorevleri;
    delete window.getSeferPrompt;
    delete window.w3GetChaptersCached;
  });

  it('sefer yoksa davet + Engeller kapısı basılır', () => {
    dcLoadView();
    const host = document.getElementById('dc-sefer');
    expect(host.querySelector('.dc-sefer-kart')).toBeNull();
    expect(host.querySelector('[data-sefer-basla]')).not.toBeNull();
  });

  it('Engeller düğmesi hasımlar ekranını açar', () => {
    const nav = vi.fn();
    window.switchView = nav;
    dcLoadView();
    document.querySelector('[data-sefer-basla]').click();
    expect(nav).toHaveBeenCalledWith('hasimlar');
    delete window.switchView;
  });

  it('aktif sefer: ad, 21 iz, mühürlenen gün kadarı dolu', () => {
    S._activeChallenge = SEFER;
    window.seferGorevleri = ch => ch.challenge_tasks;
    dcLoadView();
    const host = document.getElementById('dc-sefer');
    expect(host.textContent).toContain('Erteleme Seferi');
    expect(host.querySelectorAll('.dc-sefer-iz').length).toBe(21);
    expect(host.querySelectorAll('.dc-sefer-iz--dolu').length).toBe(5);
  });

  it('bugünün adımı sefer görevlerinden okunur (gün indeksiyle)', () => {
    S._activeChallenge = SEFER;
    window.seferGorevleri = ch => ch.challenge_tasks;
    dcLoadView();
    expect(document.querySelector('.dc-sefer-gorev').textContent).toBe('Gün 6 adımı');
  });

  it('GERÇEKLİK: nefes yüzeye ÇIKMAZ (rastgele düşen bir sayı ölçüm değildir)', () => {
    S._activeChallenge = SEFER;
    window.seferGorevleri = ch => ch.challenge_tasks;
    dcLoadView();
    const metin = document.getElementById('dc-sefer').textContent;
    expect(metin).not.toContain('nefes');
    expect(metin).not.toContain('45');
    expect(metin).not.toContain('30');
  });

  it('kalıbın kitaptan gelen sözü kartta durur', () => {
    S._activeChallenge = SEFER;
    window.getSeferPrompt = () => '"Erteleme bir çözüm değil."';
    dcLoadView();
    expect(document.querySelector('.dc-sefer-soz').textContent).toContain('Erteleme bir çözüm değil');
  });

  it('KAPI YOK: tat harcanmış olsa bile gün mühürlenir', async () => {
    S._activeChallenge = SEFER;
    dcUseTat();
    const muhur = vi.fn(async () => true);
    window.completeChallengeDay = muhur;
    window.showPremiumFeatureSpotlight = vi.fn();
    dcLoadView();
    document.querySelector('[data-sefer-muhur]').click();
    await Promise.resolve(); await Promise.resolve();
    expect(muhur).toHaveBeenCalled();
    expect(window.showPremiumFeatureSpotlight).not.toHaveBeenCalled();
    delete window.showPremiumFeatureSpotlight;
  });

  it('gün mühürlüyse düğme değil İZ durur — ikinci mühre davet edilmez', () => {
    S._activeChallenge = SEFER;
    window.seferBugunMuhurlendi = () => true;
    dcLoadView();
    const host = document.getElementById('dc-sefer');
    expect(host.querySelector('[data-sefer-muhur]')).toBeNull();
    expect(host.querySelector('.dc-sefer-muhurlu')).not.toBeNull();
  });

  it('10h köprüsü hiç yoksa bölüm patlamaz (asla bloklama)', () => {
    S._activeChallenge = SEFER;
    expect(() => dcLoadView()).not.toThrow();
    expect(document.querySelector('.dc-sefer-kart')).not.toBeNull();
  });

  it('tamamlanan seferler sessiz bir satırda anılır', () => {
    S._completedSeferler = [{ challenge_name: 'Onay Seferi' }, { challenge_name: 'Kıyas Seferi' }];
    dcLoadView();
    expect(document.querySelector('.dc-sefer-biten').textContent).toContain('Onay Seferi');
  });

  it('alan açılınca sefer durumu ağdan tazelenir ve kart yerinde güncellenir', async () => {
    window.loadChallenges = vi.fn(async () => { S._activeChallenge = SEFER; return SEFER; });
    dcLoadView();
    expect(document.querySelector('.dc-sefer-kart')).toBeNull();   // henüz boş
    await new Promise(r => setTimeout(r, 0));
    expect(window.loadChallenges).toHaveBeenCalled();
    expect(document.querySelector('.dc-sefer-kart')).not.toBeNull();
  });
});

/* ─── DENETİM FAZ 1 — kapı doğru ana taşındı, emek korunur ───
   Dört bulgunun dördü de DAVRANIŞSALDI: build ve testler yeşilken kullanıcının
   akışında yaşıyorlardı. Kağıt açılışta tadı harcıyordu (bakıp vazgeçen hakkını
   yakıyordu) · form açıkken eski kayıt silmek yazılanları siliyordu · sefer
   mührü patladığında kullanıcı mühürlemiş sanıyordu (§6.2) · `dcShowLock`'un
   fallback'i `?.()` yüzünden hiç çalışmıyordu. Testler bu dördünü mühürler. */
describe('Derin Çalışma — kapı sırası ve emek koruması (denetim FAZ 1)', () => {
  beforeEach(() => {
    S.currentUser = { id: 'test-uid-kapi-' + Date.now() + '-' + Math.random() };
    S.isPremiumPlus = false;
    S._kota = null;
    S._derinCalisma = undefined;
    S._depthProfile = bosProfil();
    S._foundationsProfile = bosTemeller();
    S._activeChallenge = null;
    S._completedSeferler = [];
    dcInit();
    kabukKur();
    // showToast bir #toast düğümü olmadan sessizce döner — hata GÖRÜLSÜN diye.
    document.body.insertAdjacentHTML('beforeend', '<div id="toast"></div>');
    window.showPremiumFeatureSpotlight = vi.fn();
    delete window.completeChallengeDay;
    delete window.loadChallenges;
  });

  it('kağıdı AÇMAK tadı harcamaz — bakıp vazgeçen hakkını kaybetmez', () => {
    dcLoadView();
    dcOpenKagit('layik');
    expect(document.querySelector('#dc-kagit-host .ck-card')).not.toBeNull();
    expect(dcTatUsed()).toBe(false);
    expect(window.showPremiumFeatureSpotlight).not.toHaveBeenCalled();

    // Vazgeçip başka bir kavrama bakmak da hakkı yakmaz
    dcOpenKagit('normal');
    expect(document.querySelector('#dc-kagit-host .ck-card')).not.toBeNull();
    expect(dcTatUsed()).toBe(false);
  });

  it('tadı başka tezgâh harcadıysa kağıt hiç açılmaz, spotlight gelir', () => {
    dcUseTat();
    dcLoadView();
    dcOpenKagit('layik');
    expect(document.querySelector('#dc-kagit-host .ck-card')).toBeNull();
    expect(window.showPremiumFeatureSpotlight).toHaveBeenCalledWith('derin-calisma');
  });

  it('tat MÜHÜRDE harcanır — dört adım yazıldıktan sonra kilit gelmez', () => {
    dcLoadView();
    dcOpenKagit('layik');
    const kart = document.querySelector('#dc-kagit-host .ck-card');
    kart.querySelector('.ck-input[data-step="1"]').value = 'kendi cümlem';
    ckSeal(kart.querySelector('.ck-save'));
    expect(kart.classList.contains('sealed')).toBe(true);
    expect(dcTatUsed()).toBe(true);
  });

  it('sohbetten gelen kağıt (host DIŞI) kapıya TAKILMAZ — ücretsiz akış kilitlenmez', () => {
    dcUseTat();                       // alanın kilidi kapalı
    document.body.insertAdjacentHTML('beforeend', '<div id="sohbet-host"></div>');
    ckRenderCard(document.getElementById('sohbet-host'), 'layik');
    const kart = document.querySelector('#sohbet-host .ck-card');
    kart.querySelector('.ck-input[data-step="1"]').value = 'sohbette yazdım';
    ckSeal(kart.querySelector('.ck-save'));
    expect(kart.classList.contains('sealed')).toBe(true);
  });

  it('Kazanma Yöntemi: form açıkken eski kayıt silinince yazılanlar DURUR', () => {
    S.isPremiumPlus = true;
    dcKazanmaKaydet({ s1: 'eski sonuç', s2: 'eski yöntem', secim: 'yontem', neden: 'eski neden' });
    dcLoadView();
    document.querySelector('[data-ky-ac]').click();
    document.querySelector('#dc-ky-s1').value = 'yarım kalmış cevabım';

    document.querySelector('[data-ky-sil]').click();

    expect(document.querySelector('#dc-ky-s1')).not.toBeNull();
    expect(document.querySelector('#dc-ky-s1').value).toBe('yarım kalmış cevabım');
    expect(dcKazanmaListe().length).toBe(0);
    expect(document.querySelector('.dc-ky-kayit')).toBeNull();
  });

  it('geçmişte üçten fazla kayıt varsa silinen satırın yerine eskisi gelir', () => {
    S.isPremiumPlus = true;
    for (let i = 1; i <= 4; i++) {
      dcKazanmaKaydet({ s1: 'sonuç ' + i, s2: 'yöntem ' + i, secim: 'yontem', neden: 'neden ' + i });
    }
    dcLoadView();
    expect(document.querySelectorAll('.dc-ky-kayit').length).toBe(3);
    document.querySelector('[data-ky-sil]').click();
    // Liste yeniden dokunur: 3 kayıt kalır (4 → 3), satır koparılıp bırakılmaz
    expect(document.querySelectorAll('.dc-ky-kayit').length).toBe(3);
    expect(dcKazanmaListe().length).toBe(3);
  });

  it('Sefer mührü patlarsa SESSİZ kalmaz — hata söylenir, düğme yerinde durur', async () => {
    S._activeChallenge = { id: 'ch-1', challenge_name: 'Erteleme Seferi', current_day: 3 };
    window.completeChallengeDay = vi.fn(async () => { throw new Error('ağ yok'); });
    dcLoadView();
    document.querySelector('[data-sefer-muhur]').click();
    await new Promise(r => setTimeout(r, 0));

    const btn = document.querySelector('[data-sefer-muhur]');
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(false);
    expect(document.getElementById('toast').textContent).toContain('mühürlenemedi');
    delete window.completeChallengeDay;
  });

  it('10h köprüsü hiç yoksa da sessizlik değil, hata söylenir', () => {
    S._activeChallenge = { id: 'ch-1', challenge_name: 'Erteleme Seferi', current_day: 3 };
    dcLoadView();
    document.querySelector('[data-sefer-muhur]').click();
    expect(document.getElementById('toast').textContent).toContain('mühürlenemedi');
  });

  it('dcShowLock: spotlight yoksa fallback GERÇEKTEN çalışır (?.() sessizce yutmaz)', () => {
    delete window.showPremiumFeatureSpotlight;
    const nav = vi.fn();
    window.switchView = nav;
    dcShowLock();
    expect(nav).toHaveBeenCalledWith('sub');
    delete window.switchView;
  });
});

/* ─── DENETİM FAZ 2 — köprüler karşı kıyıya varıyor ───
   Harcanan emeğin gittiği yer: Ko-Zo'nun sözü cümlesini taşımıyordu, en son
   girilen oda yazılıp hiç okunmuyordu, alanın kendi açıcısı devre dışıydı ve
   silinen kağıdın sesi cihazda kalıyordu. */
describe('Derin Çalışma — köprüler (denetim FAZ 2)', () => {
  beforeEach(() => {
    S.currentUser = { id: 'test-uid-koprü-' + Date.now() + '-' + Math.random() };
    S.isPremiumPlus = true;
    S._kota = null;
    S._derinCalisma = undefined;
    S._depthProfile = bosProfil();
    S._foundationsProfile = bosTemeller();
    S._activeChallenge = null;
    S._completedSeferler = [];
    dcInit();
    kabukKur();
    document.body.insertAdjacentHTML('beforeend', '<div id="toast"></div>');
    idbDeleteRecording.mockClear();
  });

  it('Ko-Zo ✦ söz DAVETİ maddenin cümlesini taşır (baştan yazdırmaz)', () => {
    const soz = vi.fn();
    window.glGiveSozNow = soz;
    dcKozoEkle('zo', 'Geceleyin şarj aletini salonda bırak');
    dcLoadView();

    document.querySelector('[data-kz-soz]').click();

    expect(soz).toHaveBeenCalledWith('Geceleyin şarj aletini salonda bırak');
    delete window.glGiveSozNow;
  });

  it('söz mührü kullanıcıda kalır — davet sözü arka planda YAZMAZ', () => {
    window.glGiveSozNow = vi.fn();
    dcKozoEkle('ko', 'Kitabı masanın üstüne koy');
    dcLoadView();
    document.querySelector('[data-kz-soz]').click();
    // Madde kendi listesinde durur; "verilmiş söz" diye bir işaret kazanmaz
    expect(dcKozoListe('ko')[0].done).toBe(false);
    delete window.glGiveSozNow;
  });

  it('en son girilen oda kartında iz bırakır (yazılan artık OKUNUYOR)', () => {
    window.switchView = vi.fn();
    dcLoadView();
    expect(document.querySelector('.dc-room--son')).toBeNull();

    document.querySelector('.dc-room[data-room="ayna"]').click();
    expect(S._derinCalisma.lastRoom).toBe('ayna');

    dcLoadView();                                   // alan yeniden açılır
    const isli = document.querySelectorAll('.dc-room--son');
    expect(isli.length).toBe(1);
    expect(isli[0].dataset.room).toBe('ayna');
    expect(isli[0].textContent).toContain('En son burada çalıştın');
    delete window.switchView;
  });

  it('dcOpen alanın tek açıcısıdır (Studio kartının inline çağrısı)', () => {
    const nav = vi.fn();
    window.switchView = nav;
    dcOpen();
    expect(nav).toHaveBeenCalledWith('derincalisma');
    delete window.switchView;
  });

  it('arşivden kağıt silinince SESİ de silinir — blob cihazda yetim kalmaz', () => {
    /* 09b'nin oturum geçmişi modül seviyesindedir ve dosya içindeki önceki
       testlerden kağıt taşıyabilir — bu yüzden "arşiv boşaldı" değil, "bu
       kayıt gitti" iddia edilir. */
    dfRecordWorksheet('layik', 'birinci cevabım', 'hayalim', 'olumlamam',
      { sesId: 'ck_ses_test_123', davranis: 'bu hafta bir kez hayır diyeceğim' });
    const oncekiSayi = dfGetWorksheetSessions().length;
    dcLoadView();

    document.querySelector('.dc-arsiv-sil').click();   // en üstteki = en son eklenen

    expect(idbDeleteRecording).toHaveBeenCalledWith('ck_ses_test_123');
    const kalan = dfGetWorksheetSessions();
    expect(kalan.length).toBe(oncekiSayi - 1);
    expect(kalan.some(k => k.ses_id === 'ck_ses_test_123')).toBe(false);
  });

  it('sesi olmayan kağıt silinince ses katmanı hiç çağrılmaz', () => {
    dfRecordWorksheet('normal', 'sessiz cevap', '', 'olumlama', {});
    dcLoadView();
    document.querySelector('.dc-arsiv-sil').click();
    expect(idbDeleteRecording).not.toHaveBeenCalled();
  });
});

/* ─── DENETİM FAZ 3 — arşiv geri açılır: dört adım + kendi sesin ───
   Kitabın 3. adımı dokuz kez "kaydet ve DİNLE" der; kayıt çalışıyor ve `ses_id`
   saklanıyordu ama arşiv onu hiç kullanmıyordu — kullanıcı kendi sesini bir kez
   duyup bir daha asla duyamıyordu. Dört adımın da yalnız biri, o da ilk 70
   karakteri görünüyordu. */
describe('Derin Çalışma — arşiv defteri (denetim FAZ 3)', () => {
  const KAYIT = {
    concept: 'layik',
    s1: 'hep sıranın bana gelmesini bekliyorum',
    s2: 'sırayı bekleyen değil, sırayı kuran biri olarak görüyorum kendimi',
    s3: 'Ben layığım; istediğimi istemek haddim değil, hakkım.',
    davranis: 'bu hafta bir toplantıda ilk sözü ben alacağım',
  };

  beforeEach(() => {
    S.currentUser = { id: 'test-uid-arsiv-' + Date.now() + '-' + Math.random() };
    S.isPremiumPlus = true;
    S._kota = null;
    S._derinCalisma = undefined;
    S._depthProfile = bosProfil();
    S._foundationsProfile = bosTemeller();
    S._activeChallenge = null;
    S._completedSeferler = [];
    dcInit();
    kabukKur();
    document.body.insertAdjacentHTML('beforeend', '<div id="toast"></div>');
    idbGetRecording.mockReset();
    idbGetRecording.mockResolvedValue(null);
  });

  it('satır kapalı doğar — defter kendiliğinden açılmaz', () => {
    dfRecordWorksheet(KAYIT.concept, KAYIT.s1, KAYIT.s2, KAYIT.s3, { davranis: KAYIT.davranis });
    dcLoadView();
    const ac = document.querySelector('.dc-arsiv-ac');
    expect(ac.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('.dc-arsiv-detay').hidden).toBe(true);
    expect(document.querySelector('.dc-arsiv-adim')).toBeNull();
  });

  it('açılınca DÖRT adım da kaydın kendisinden AYNEN kesilir', () => {
    dfRecordWorksheet(KAYIT.concept, KAYIT.s1, KAYIT.s2, KAYIT.s3, { davranis: KAYIT.davranis });
    dcLoadView();
    document.querySelector('.dc-arsiv-ac').click();

    const detay = document.querySelector('.dc-arsiv-detay');
    expect(detay.hidden).toBe(false);
    expect(document.querySelector('.dc-arsiv-ac').getAttribute('aria-expanded')).toBe('true');
    expect(detay.querySelectorAll('.dc-arsiv-adim').length).toBe(4);
    expect(detay.textContent).toContain(KAYIT.s1);
    expect(detay.textContent).toContain(KAYIT.s2);
    expect(detay.textContent).toContain(KAYIT.s3);
    expect(detay.textContent).toContain(KAYIT.davranis);
  });

  it('adım etiketleri KAĞIDIN sözlüğünden okunur — ikinci bir metin yazılmaz', () => {
    dfRecordWorksheet(KAYIT.concept, KAYIT.s1, '', '', {});
    dcLoadView();
    document.querySelector('.dc-arsiv-ac').click();
    expect(document.querySelector('.dc-arsiv-adim-ad').textContent).toBe('YAZ — dışa çıkar');
  });

  it('GERÇEKLİK: boş bırakılan adım satır ÜRETMEZ (doldurma cümlesi yok)', () => {
    dfRecordWorksheet('normal', 'yalnız ilk adımı yazdım', '', '', {});
    dcLoadView();
    document.querySelector('.dc-arsiv-ac').click();

    const detay = document.querySelector('.dc-arsiv-detay');
    expect(detay.querySelectorAll('.dc-arsiv-adim').length).toBe(1);
    expect(detay.textContent).not.toMatch(/belirtilmemiş|yok|boş/i);
  });

  it('ikinci tık defteri kapatır ve içeriği bırakır', () => {
    dfRecordWorksheet(KAYIT.concept, KAYIT.s1, '', '', {});
    dcLoadView();
    const ac = document.querySelector('.dc-arsiv-ac');
    ac.click();
    ac.click();
    expect(ac.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('.dc-arsiv-detay').hidden).toBe(true);
    expect(document.querySelector('.dc-arsiv-adim')).toBeNull();
  });

  it('AKORDEON: ikinci defter açılınca ilki kapanır', () => {
    dfRecordWorksheet('layik', 'birinci kağıt', '', '', {});
    dfRecordWorksheet('normal', 'ikinci kağıt', '', '', {});
    dcLoadView();
    const kapilar = document.querySelectorAll('.dc-arsiv-ac');
    kapilar[0].click();
    kapilar[1].click();
    expect(document.querySelectorAll('.dc-arsiv-satir--acik').length).toBe(1);
    expect(kapilar[0].getAttribute('aria-expanded')).toBe('false');
    expect(kapilar[1].getAttribute('aria-expanded')).toBe('true');
  });

  it('ses YOKSA dinle düğmesi hiç basılmaz — ses katmanı bile sorgulanmaz', async () => {
    dfRecordWorksheet(KAYIT.concept, KAYIT.s1, '', '', {});
    dcLoadView();
    document.querySelector('.dc-arsiv-ac').click();
    await new Promise(r => setTimeout(r, 0));
    expect(idbGetRecording).not.toHaveBeenCalled();
    expect(document.querySelector('.dc-arsiv-ses-btn')).toBeNull();
  });

  it('ses_id VAR ama blob gitmişse düğme yine basılmaz (olmayan ses vaat edilmez)', async () => {
    idbGetRecording.mockResolvedValue(null);
    dfRecordWorksheet(KAYIT.concept, KAYIT.s1, '', '', { sesId: 'ck_ses_kayip' });
    dcLoadView();
    document.querySelector('.dc-arsiv-ac').click();
    await new Promise(r => setTimeout(r, 0));
    expect(idbGetRecording).toHaveBeenCalledWith('ck_ses_kayip');
    expect(document.querySelector('.dc-arsiv-ses-btn')).toBeNull();
  });

  it('blob GERÇEKTEN varsa "kendi sesinden dinle" düğmesi düşer', async () => {
    idbGetRecording.mockResolvedValue({ blob: new Blob(['ses'], { type: 'audio/webm' }) });
    dfRecordWorksheet(KAYIT.concept, KAYIT.s1, '', KAYIT.s3, { sesId: 'ck_ses_var' });
    dcLoadView();
    document.querySelector('.dc-arsiv-ac').click();
    await new Promise(r => setTimeout(r, 0));

    const btn = document.querySelector('.dc-arsiv-ses-btn');
    expect(btn).not.toBeNull();
    expect(btn.textContent).toContain('Kendi sesinden dinle');
  });

  /* KAYNAK AYRIMI (§6.10 · FAZ 4): olumlama kullanıcının beyanı değil, kitabın
     şablonudur (`tmpl.affirmation`). Dört cümle yan yana dururken hangisinin
     kime ait olduğu görünmezse uygulama kullanıcıya kendi sözü diye kitabın
     sözünü göstermiş olur. Repo ayrımı zaten konuşuyor: «…» kullanıcının,
     “…” kitabın. */
  it('KAYNAK: olumlama kitabın cümlesi olarak işaretlenir, üçü kullanıcınındır', () => {
    dfRecordWorksheet(KAYIT.concept, KAYIT.s1, KAYIT.s2, KAYIT.s3, { davranis: KAYIT.davranis });
    dcLoadView();
    document.querySelector('.dc-arsiv-ac').click();

    const kitap = document.querySelectorAll('.dc-arsiv-adim--kitap');
    expect(kitap.length).toBe(1);                       // yalnız olumlama
    expect(kitap[0].textContent).toContain(KAYIT.s3);
    expect(kitap[0].textContent).toContain('kitaptan');
    expect(kitap[0].querySelector('.dc-arsiv-adim-metin').textContent).toBe(`“${KAYIT.s3}”`);

    // Kullanıcının cümleleri kitap işareti de tırnak da ALMAZ
    const kullanici = [...document.querySelectorAll('.dc-arsiv-adim')]
      .filter(e => !e.classList.contains('dc-arsiv-adim--kitap'));
    expect(kullanici.length).toBe(3);
    kullanici.forEach(e => {
      expect(e.textContent).not.toContain('kitaptan');
      expect(e.querySelector('.dc-arsiv-adim-metin').textContent).not.toMatch(/[“”«»]/);
    });
  });

  it('ses düğmesi OLUMLAMANIN altına düşer — kitabın tarifi ikiye bölünmez', async () => {
    idbGetRecording.mockResolvedValue({ blob: new Blob(['ses'], { type: 'audio/webm' }) });
    dfRecordWorksheet(KAYIT.concept, KAYIT.s1, '', KAYIT.s3, { sesId: 'ck_ses_yer' });
    dcLoadView();
    document.querySelector('.dc-arsiv-ac').click();
    await new Promise(r => setTimeout(r, 0));

    const kitap = document.querySelector('.dc-arsiv-adim--kitap');
    expect(kitap.querySelector('.dc-arsiv-ses-btn')).not.toBeNull();
  });

  it('olumlama yoksa ses panelin sonuna iner (yerini kaybetmez)', async () => {
    idbGetRecording.mockResolvedValue({ blob: new Blob(['ses'], { type: 'audio/webm' }) });
    dfRecordWorksheet('normal', 'olumlamasız kağıt', '', '', { sesId: 'ck_ses_yalniz' });
    dcLoadView();
    document.querySelector('.dc-arsiv-ac').click();
    await new Promise(r => setTimeout(r, 0));

    expect(document.querySelector('.dc-arsiv-adim--kitap')).toBeNull();
    const btn = document.querySelector('.dc-arsiv-ses-btn');
    expect(btn).not.toBeNull();
    expect(btn.closest('.dc-arsiv-detay')).not.toBeNull();
  });

  it('panel kapandıysa geç gelen ses düğmesi hayalet satır bırakmaz', async () => {
    let coz;
    idbGetRecording.mockReturnValue(new Promise(r => { coz = r; }));
    dfRecordWorksheet(KAYIT.concept, KAYIT.s1, '', '', { sesId: 'ck_ses_gec' });
    dcLoadView();
    const ac = document.querySelector('.dc-arsiv-ac');
    ac.click();
    ac.click();                                        // cevap gelmeden kapandı
    coz({ blob: new Blob(['ses'], { type: 'audio/webm' }) });
    await new Promise(r => setTimeout(r, 0));
    expect(document.querySelector('.dc-arsiv-ses-btn')).toBeNull();
  });
});
