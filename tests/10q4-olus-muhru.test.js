// Oluş Mührü (10q4) — davet ritmi, kanıt fallback'i, sınama dalları.
// Merkez kavram: kanıt kimdeyse yük ondadır. Davet tek soru sorar (kanıtı
// Wanderer sundu), sınama dört soru sorar (iddia kullanıcınındır).
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import {
  olusKanitCumlesi, olusGunHakki, olusDavetSun, olusDavetSec, olusDavetAc,
  olusSinamaBekleme, olusSinamaBeklemeSinav, olusSinamaAc, olusSinavKayitla,
  olusSinamaSorular, olusSinamaCoz, olusKanit,
  olusKapiSec, olusKapilarAc, olusKapiKanit,
} from '../js/parts/10q4-olus-muhru.js';
import { kkEsikAc, kkEsikDurum, kkMuhurle, kkHedefMuhurle, kkEnsureStyles } from '../js/parts/10q-w2-kisi-karti.js';
import { getFullDeck, getCardById, deckReady } from '../js/parts/12b-kart-destesi.js';
import { S } from '../js/state.js';

// Deste sidecar'dan async hidrate olur; stil bloğunun jsdom maliyeti kuruluma
// alınır (10q emsali — yük altında ilk törenin testini zaman aşımına düşürürdü).
beforeAll(async () => {
  await deckReady();
  kkEnsureStyles();
}, 30000);

const A = 'temel-ozsevgi-filiz';
const B = 'temel-ozsaygi-filiz';

function kur() {
  S._kisiKarti = {
    profile: { dusunceler: 0, inanclar: 0, hisler: 0, davranislar: 0, updatedAt: null },
    collection: {}, history: [], seenIntro: true, lastTick: 0,
    closest: null, hedefler: {}, esik: {}, olusGun: null,
  };
}

afterEach(() => {
  document.querySelectorAll('#olus-portal, .olus-veil, .onb-ritual').forEach(n => n.remove());
  delete S.currentUser;
  delete window.matchMedia;
});

/* Tören üç durak: KAPALI KART (sırt→flip) → kart+soru → MÜHÜR BASIMI.
   Aşağıdaki yardımcılar testlerin hangi yoldan gittiğini açık eder.

   `kisaYol()` reduced-motion'ı taklit eder: çevirme atlanır, mühür tek
   dokunuşla düşer. Jestin kendi testleri (kartı çevirme, basılı tutma, elini
   çekme) bu kısa yolu KULLANMAZ — onlar gerçek zamanlı akışı sürer. */
function kisaYol() {
  window.matchMedia = (q) => ({
    matches: /prefers-reduced-motion/.test(String(q)),
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  });
}
const bekle = (ms) => new Promise(r => setTimeout(r, ms));

/** Töreni Escape ile kapat. `_olusOpen` modül kapsamındadır ve yalnız kapanış
 *  akışında düşer — portalı silmek onu temizlemez, o yüzden sahneyi açan her
 *  test kendi kapanışını yapmalıdır (yoksa sonraki test sahneyi hiç açamaz). */
async function torenKapat(ms = 80) {
  document.querySelector('.olus-stage')
    ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await bekle(ms);
}

describe('olusKanitCumlesi — sayısal fallback', () => {
  beforeEach(kur);

  it('en güçlü iki boyuttan kanıt cümlesi kurar', () => {
    const card = getCardById(A);
    const c = olusKanitCumlesi(card, { dims: { dusunceler: 90, inanclar: 10, hisler: 70, davranislar: 0 } });
    expect(c).toContain('düşüncelerinde');
    expect(c).toContain('hislerinde');
  });

  it('tek boyut varsa tekil cümleye düşer', () => {
    const c = olusKanitCumlesi(getCardById(A), { dims: { dusunceler: 55 } });
    expect(c).toContain('düşüncelerinde');
    expect(c).not.toContain(' ve ');
  });

  it('boyut yoksa genel cümleye düşer — asla boş dönmez', () => {
    expect(olusKanitCumlesi(getCardById(A), null)).toBeTruthy();
    expect(olusKanitCumlesi(null, null)).toBeTruthy();
  });

  it('kanıt cümlesi ASLA rakam taşımaz — ölçüm kullanıcıya sızmaz', () => {
    const c = olusKanitCumlesi(getCardById(A), { dims: { dusunceler: 88, hisler: 73 } });
    expect(/\d/.test(c)).toBe(false);
  });
});

describe('davet ritmi — "her davranışa demez"', () => {
  beforeEach(kur);

  it('günde tek bakış hakkı vardır', () => {
    expect(olusGunHakki()).toBe(1);
  });

  it('boş rafta günün hakkı HARCANMAZ', async () => {
    const ok = await olusDavetSun();
    expect(ok).toBe(false);
    expect(olusGunHakki()).toBe(1);
  });

  it('hak bittiğinde davet açılmaz', async () => {
    kkEsikAc(A, { skor: 90, dims: { dusunceler: 80 } });
    S._kisiKarti.olusGun = { gun: new Date().toLocaleDateString('en-CA'), davet: 1 };
    expect(olusGunHakki()).toBe(0);
    expect(await olusDavetSun()).toBe(false);
  });

  it('gün değişince hak yenilenir (gün anahtarı yerel tarihtir)', () => {
    S._kisiKarti.olusGun = { gun: '2020-01-01', davet: 1 };
    expect(olusGunHakki()).toBe(1);
    expect(S._kisiKarti.olusGun.gun).not.toBe('2020-01-01');
  });

  it('olusDavetSec eşikteki kartı seçer; havuz boşsa null', () => {
    expect(olusDavetSec()).toBeNull();
    kkEsikAc(A, { skor: 70, dims: {} });
    expect(olusDavetSec()).toBe(A);
  });

  it('"henüz değil" denen kart dinlenmeye çekilir — aynı gün yeniden sorulmaz', () => {
    kkEsikAc(A, { skor: 70, dims: {} });
    const e = kkEsikDurum(A);
    e.red.push(new Date().toISOString());
    expect(olusDavetSec()).toBeNull();
  });

  it('reddedilen kart varken hedeflenmiş başka kart sıraya geçer', () => {
    kkEsikAc(A, { skor: 95, dims: {} });
    kkEsikDurum(A).red.push(new Date().toISOString());
    kkEsikAc(B, { skor: 40, dims: {} });
    expect(olusDavetSec()).toBe(B);
  });
});

describe('davet töreni — perde 1 ve mühür', () => {
  beforeEach(() => { kur(); kisaYol(); });

  // Çift tören guard'ı (_olusOpen) modül kapsamındadır ve yalnız kapanış
  // akışında düşer — portalı silmek onu temizlemez. Bu yüzden davet açan her
  // test kendi kapanışını yapar; aksi hâlde sonraki test sahneyi hiç açamaz.
  async function hayirDe() {
    document.querySelector('#olus-hayir')?.click();
    await new Promise(r => setTimeout(r, 1800));
  }

  it('perde 1 kanıt + soru + iki mühür gösterir; ölçüm görünmez', async () => {
    kkEsikAc(A, { skor: 88, dims: { dusunceler: 80, hisler: 70 } });
    expect(olusDavetAc(A)).toBe(true);
    expect(document.querySelector('.olus-stage')).toBeTruthy();
    const kanit = document.querySelector('.olus-kanit').textContent;
    const soru = document.querySelector('.olus-soru').textContent;
    expect(kanit.trim()).toBeTruthy();
    expect(soru).toContain(getCardById(A).name);
    expect(document.querySelectorAll('.olus-btn').length).toBe(2);
    // Ölçüm kullanıcıya sızmaz: kanıt ve soru rakamsızdır. (Kart yüzündeki
    // "015 / 112" kartın kendi kimliğidir, bir ölçüm değil — kapsam dışı.)
    expect(/\d/.test(kanit)).toBe(false);
    expect(/%|\d{2}/.test(soru)).toBe(false);
    await hayirDe();
  });

  it('"Henüz değil" kartı eşikte bırakır, reddi kaydeder', async () => {
    kkEsikAc(A, { skor: 88, dims: {} });
    expect(olusDavetAc(A)).toBe(true);
    await hayirDe();
    expect(S._kisiKarti.collection[A]).toBeUndefined();
    expect(kkEsikDurum(A).red.length).toBe(1);
  });

  it('sahipli kart için davet açılmaz — mühürlenen bir daha sorulmaz', () => {
    kkEsikAc(A, { skor: 88, dims: {} });
    kkMuhurle(A, { yol: 'davet' });
    expect(olusDavetAc(A)).toBe(false);
  });

  it('"Evet" mühür perdesini açar ama MÜHÜRLEMEZ — kart hâlâ eşikte', async () => {
    kkEsikAc(A, { skor: 88, dims: {} });
    expect(olusDavetAc(A)).toBe(true);
    document.querySelector('#olus-evet').click();
    // Karar verildi, mühür HENÜZ basılmadı: yazan tek şey kullanıcının eli.
    expect(document.querySelector('#olus-press')).toBeTruthy();
    expect(S._kisiKarti.collection[A]).toBeUndefined();
    expect(kkEsikDurum(A)).toBeTruthy();
    await torenKapat();
  });

  it('mühre dokunuş kartı mühürler — yazan kkMuhurle\'dir', async () => {
    kkEsikAc(A, { skor: 88, dims: {} });
    olusDavetAc(A);
    document.querySelector('#olus-evet').click();
    document.querySelector('#olus-press').dispatchEvent(new Event('pointerdown'));
    expect(S._kisiKarti.collection[A]).toBeTruthy();
    expect(S._kisiKarti.collection[A].muhur.yol).toBe('davet');
    expect(kkEsikDurum(A)).toBeNull();
    // Kart lapis'ten altına döner: anlam ekseni görünür olur (§1). Yüze kalıcı
    // mühür İZİ basılmaz — mühür bir andır, damga değil.
    expect(document.querySelector('.olus-stage').className).toContain('is-sealed');
    expect(document.querySelector('#olus-seal-card .olus-face--gold')).toBeTruthy();
    expect(document.querySelector('.ikv-muhur')).toBeNull();
    document.querySelector('#olus-devam')?.click();
    await bekle(50);
  });
});

// ─── Tanıma Motoru (FAZ 1) — iki ayrı soru, iki ayrı kanal:
//   • wtOverlayClose = SEGMENT (tören ne kadar sürdü) — sahnenin ömrüdür,
//     mühür jestini kapsamaz; Gözlemevi'ndeki süre metriğinin tanımı budur.
//   • wtTorenSonuc   = SONUÇ (nasıl bitti) — 13l'ye giden GERÇEK sonuçtan
//     (kkMuhurle'nin dönüşü) okunur, perde1'in Evet tıklamasından DEĞİL:
//     Evet basmak mühür basmakla aynı şey değildir.
// İkisini tek çağrıya bağlamak, sonucu beklemek için segmenti açık tutmayı
// gerektirirdi — o da süre metriğini sessizce şişirirdi. ───────────────────
describe('davet töreni — Gözlemevi segmenti ve sonuç raporu', () => {
  beforeEach(() => {
    kur(); kisaYol();
    window.wtOverlayOpen = () => {};
    window.wtOverlayClose = (name, sonuc) => { window.__wtCalls.push([name, sonuc]); };
    window.wtTorenSonuc = (ad, sonuc) => { window.__wtSonuc.push([ad, sonuc]); };
    window.__wtCalls = [];
    window.__wtSonuc = [];
  });
  afterEach(() => {
    delete window.wtOverlayOpen;
    delete window.wtOverlayClose;
    delete window.wtTorenSonuc;
    delete window.__wtCalls;
    delete window.__wtSonuc;
  });

  it('"Hayır" → olus-davet HEMEN \'kapat\' ile kapanır (mühür yolu hiç başlamadı)', async () => {
    kkEsikAc(A, { skor: 88, dims: {} });
    olusDavetAc(A);
    document.querySelector('#olus-hayir').click();
    expect(window.__wtCalls).toContainEqual(['olus-davet', 'kapat']);
    await bekle(1800);
  });

  it('perde1 Escape (henüz seçim yok) → \'kapat\'', async () => {
    kkEsikAc(A, { skor: 88, dims: {} });
    olusDavetAc(A);
    // perde1'de Escape → _perdeRed (guard'ı ancak RED_MS/reduced 500ms sonra
    // düşürür) — kısa bekleme sonraki testin sahneyi hiç açamamasına yol açar.
    await torenKapat(600);
    expect(window.__wtCalls).toContainEqual(['olus-davet', 'kapat']);
  });

  it('"Evet" segmenti kapatır ama SONUÇ yazmaz — sonuç henüz bilinmiyor', async () => {
    kkEsikAc(A, { skor: 88, dims: {} });
    olusDavetAc(A);
    document.querySelector('#olus-evet').click();
    // Segment burada biter: sahnenin ömrü doldu, mühür jesti ayrı bir andır.
    expect(window.__wtCalls).toContainEqual(['olus-davet', undefined]);
    expect(window.__wtSonuc).toEqual([]);   // sonuç perde2'yi bekler
    await torenKapat(); // perde2'de Escape → bitir() sonucu yazar
  });

  it('mühür başarıyla basılıp Devam\'a basılınca sonuç \'muhur\'', async () => {
    kkEsikAc(A, { skor: 88, dims: {} });
    olusDavetAc(A);
    document.querySelector('#olus-evet').click();
    document.querySelector('#olus-press').dispatchEvent(new Event('pointerdown'));
    expect(S._kisiKarti.collection[A]).toBeTruthy(); // mühür gerçekten basıldı
    document.querySelector('#olus-devam')?.click();
    await bekle(50);
    expect(window.__wtSonuc).toContainEqual(['olus-davet', 'muhur']);
    // Süre metriğinin tanımı korunur: mühür jesti segmenti UZATMAZ — Evet'te
    // kapanan segmentten sonra ikinci bir kapanış yazılmaz.
    expect(window.__wtCalls.filter(c => c[0] === 'olus-davet')).toHaveLength(1);
  });

  it('Evet sonrası mühür basılmadan Escape ile çıkılırsa sonuç \'kapat\' (elini çekmiş olsa bile)', async () => {
    kkEsikAc(A, { skor: 88, dims: {} });
    olusDavetAc(A);
    document.querySelector('#olus-evet').click();
    // Basıp bırakma (reduced-motion'da bile press'e dokunmadan) — mühür YOK
    await torenKapat();
    expect(S._kisiKarti.collection[A]).toBeUndefined();
    expect(window.__wtSonuc).toContainEqual(['olus-davet', 'kapat']);
  });
});

/* ═══ Emre'nin notları (2026-07-28) — paket · dokunuş · mühür jesti ═══ */
describe('kapalı kart — koleksiyonun sırtı, ambalaj değil', () => {
  beforeEach(kur);

  it('davet KAPALI KARTLA açılır; yüz ancak çevrilince gelir', async () => {
    kkEsikAc(A, { skor: 88, dims: {} });
    expect(olusDavetAc(A)).toBe(true);
    // Aşama A: kartın sırtı var, soru henüz YOK
    const flip = document.querySelector('#olus-flip');
    expect(flip).toBeTruthy();
    expect(document.querySelector('.olus-soru')).toBeNull();
    // Sırt 12c'nin TEK motorundan gelir (fener mührü + wordmark) — folyo paket,
    // barkod ve "ürün" dili yok (Tasarım Prensipleri §0/§6).
    expect(flip.querySelector('.ikv-back')).toBeTruthy();
    expect(flip.querySelector('.ikv-back-sigil')).toBeTruthy();
    expect(document.querySelector('.kk-pack')).toBeNull();
    flip.click();
    expect(flip.className).toContain('is-flipped');
    await bekle(860);
    // Aşama B: kart, kanıt, soru ve iki mühür
    expect(document.querySelector('#olus-kart')).toBeTruthy();
    expect(document.querySelector('.olus-soru').textContent).toContain(getCardById(A).name);
    document.querySelector('#olus-hayir')?.click();
    await bekle(1800);
  });

  it('reduced-motion çevirmeyi atlar — jest bekletmeye dönüşmez', async () => {
    kisaYol();
    kkEsikAc(A, { skor: 88, dims: {} });
    olusDavetAc(A);
    expect(document.querySelector('#olus-flip')).toBeNull();
    expect(document.querySelector('.olus-soru')).toBeTruthy();
    await torenKapat(1800);        // Escape perde 1'de "henüz değil" dalıdır
  });
});

describe('karta dokunuş — dört boyut + Emre\'nin gerekçesi', () => {
  beforeEach(() => { kur(); kisaYol(); });

  it('karta dokununca yaprak açılır: dört boyut + "NEDEN SEN"; tören AYNI portalda kalır', async () => {
    kkEsikAc(A, { skor: 88, dims: {} });
    olusDavetAc(A, { detay: {
      boyutlar: { dusunceler: 'Sabahları kendine daha yumuşak bakıyorsun.' },
      emre: 'Bu kişiyi sende görüyorum çünkü zor bir günde kendini bırakmadın.',
    } });
    document.querySelector('#olus-kart').click();
    const yaprak = document.querySelector('.olus-yaprak');
    expect(yaprak).toBeTruthy();
    // Tören terk edilmedi: soru sahnesi hâlâ ayakta, portal tek
    expect(document.querySelectorAll('#olus-portal').length).toBe(1);
    expect(document.querySelector('.olus-soru')).toBeTruthy();
    // Dört boyut da yazılı
    expect(yaprak.querySelectorAll('.olus-y-dim').length).toBe(4);
    // Emre'nin gerekçesi altta
    expect(yaprak.querySelector('.olus-y-emre-b').textContent).toContain('zor bir günde');
    // LLM'in o boyutta gördüğü cümle de yerinde
    expect(yaprak.querySelector('.olus-y-gordum').textContent).toContain('yumuşak');
    document.querySelector('#olus-y-geri').click();
    await bekle(320);
    expect(document.querySelector('.olus-yaprak')).toBeNull();
    document.querySelector('#olus-hayir')?.click();
    await bekle(1800);
  });

  it('LLM susmuşsa yaprak yine dolu açılır — kartın kendi maddeleri + sözlük gerekçesi', async () => {
    kkEsikAc(A, { skor: 88, dims: {} });
    olusDavetAc(A);                                  // detay YOK
    document.querySelector('#olus-kart').click();
    const yaprak = document.querySelector('.olus-yaprak');
    expect(yaprak.querySelectorAll('.olus-y-dim').length).toBe(4);
    expect(yaprak.querySelectorAll('.olus-y-dim li').length).toBeGreaterThan(0);
    expect(yaprak.querySelector('.olus-y-emre-b').textContent.trim()).toBeTruthy();
    document.querySelector('#olus-hayir')?.click();
    await bekle(1800);
  });
});

describe('mühür basımı — jest', () => {
  beforeEach(kur);

  it('basılı tutmadan mühür düşmez; elini çekince kart mühürsüz kalır', async () => {
    kkEsikAc(A, { skor: 88, dims: {} });
    olusDavetAc(A);
    document.querySelector('#olus-flip').click();
    await bekle(860);
    document.querySelector('#olus-evet').click();
    const press = document.querySelector('#olus-press');
    press.dispatchEvent(new Event('pointerdown'));
    await bekle(200);                                  // PRESS_MS'in çok altında
    press.dispatchEvent(new Event('pointerup'));
    await bekle(60);
    expect(S._kisiKarti.collection[A]).toBeUndefined(); // yazılmadı
    expect(kkEsikDurum(A)).toBeTruthy();               // kart eşikte bekliyor
    // Yargısız dil: "elini çektin", ceza yok
    expect(document.querySelector('#olus-press-hint').textContent).toContain('Acele yok');
    await torenKapat();
  }, 15000);

  it('basılı tutunca mühür oturur ve kart altına döner', async () => {
    kkEsikAc(A, { skor: 88, dims: {} });
    olusDavetAc(A);
    document.querySelector('#olus-flip').click();
    await bekle(860);
    document.querySelector('#olus-evet').click();
    document.querySelector('#olus-press').dispatchEvent(new Event('pointerdown'));
    await bekle(1300);                                 // PRESS_MS = 950
    expect(S._kisiKarti.collection[A]).toBeTruthy();
    expect(document.querySelector('.olus-stage').className).toContain('is-sealed');
    expect(document.querySelector('#olus-muhur-line').hidden).toBe(false);
    document.querySelector('#olus-devam')?.click();
    await bekle(50);
  }, 15000);
});

describe('oluş sınaması — iddia senin, kanıt da senin', () => {
  beforeEach(kur);

  it('LLM yokken sorular kartın KENDİ maddelerinden gelir — dört boyut, dört soru', async () => {
    const sorular = await olusSinamaSorular(getCardById(A));
    expect(sorular.length).toBe(4);
    expect(sorular.map(s => s.boyut)).toEqual(['dusunceler', 'inanclar', 'hisler', 'davranislar']);
    for (const s of sorular) expect(s.soru.trim().length).toBeGreaterThan(10);
  });

  it('kart maddesi kendi tırnağını taşısa da soru çift tırnak yığmaz', async () => {
    // Maddesi tırnakla başlayan gerçek bir kart varsa onunla, yoksa kurulanla
    const card = getFullDeck().find(c => (c.dusunceler || []).some(x => /"/.test(x)))
      || { ...getCardById(A), dusunceler: ['"Hayır" demek beni kötü yapmaz.'] };
    const sorular = await olusSinamaSorular(card);
    for (const s of sorular) expect(s.soru).not.toMatch(/""/);
  });

  it('boyut maddesi boşsa soru boş tırnak göstermez', async () => {
    const bos = { ...getCardById(A), dusunceler: [], inanclar: [], hisler: [], davranislar: [] };
    const sorular = await olusSinamaSorular(bos);
    expect(sorular.length).toBe(4);
    for (const s of sorular) expect(s.soru).not.toMatch(/""|「」/);
  });

  it('sınama bekleme: geçilemeyen sınav dinlenme ister, geçilen istemez', () => {
    kkEsikAc(A, { skor: 40, dims: {} });
    expect(olusSinamaBekleme(A)).toBe(0);
    kkEsikDurum(A).sinav = { at: new Date().toISOString(), gecti: false };
    expect(olusSinamaBekleme(A)).toBeGreaterThan(0);
    kkEsikDurum(A).sinav.gecti = true;
    expect(olusSinamaBekleme(A)).toBe(0);
  });

  it('eski bir sınavın beklemesi dolmuştur', () => {
    kkEsikAc(A, { skor: 40, dims: {} });
    kkEsikDurum(A).sinav = { at: new Date(Date.now() - 30 * 86400000).toISOString(), gecti: false };
    expect(olusSinamaBekleme(A)).toBe(0);
  });

  it('eşikte olmayan kart için bekleme sorulmaz (beyan yolu barajdan bağımsız)', () => {
    expect(olusSinamaBekleme('yok-boyle-kart')).toBe(0);
  });
});

/* GİRİŞ KART-TİPİNDEN BAĞIMSIZ (2026-08-10) — sınamanın çekirdeği kartın
   nereden geldiğini hiç sormuyordu; yalnız girişi katalog kartına bağlıydı.
   Geçiş Kartım'ın lapis kutbu da aynı sınamadan geçer. Bu blok iki şeyi
   birden mühürler: dış kart yolu açılıyor VE katalog yolu bozulmuyor. */
describe('olusSinavKayitla — "önce" korunur, ikinci sınav ilkini silmez', () => {
  const kayit = (at, gecti, alinti) => ({
    at, gecti, eksik: gecti ? null : 'davranis',
    alintilar: alinti ? { davranis: alinti } : null,
  });

  it('ilk sınavda tarihçe boştur ama alan vardır', () => {
    const k = olusSinavKayitla(null, kayit('2026-01-01T10:00:00Z', false, 'daha yapamadım'));
    expect(k.oncekiler).toEqual([]);
    expect(k.gecti).toBe(false);
  });

  it('ikinci sınav ilkini TARİHÇEYE alır — üzerine yazmaz', () => {
    const ilk = olusSinavKayitla(null, kayit('2026-01-01T10:00:00Z', false, 'daha yapamadım'));
    const ikinci = olusSinavKayitla(ilk, kayit('2026-02-01T10:00:00Z', true, 'artık yapıyorum'));
    expect(ikinci.gecti).toBe(true);
    expect(ikinci.oncekiler.length).toBe(1);
    expect(ikinci.oncekiler[0].at).toBe('2026-01-01T10:00:00Z');
    // İlk denemenin kendi cümlesi de duruyor: "üçüncü denemede geçtim"in kanıtı budur.
    expect(ikinci.oncekiler[0].alintilar.davranis).toBe('daha yapamadım');
  });

  it('tarihçenin tarihçesi tutulmaz — iç içe büyüme kesilir', () => {
    let k = null;
    for (let i = 1; i <= 3; i++) k = olusSinavKayitla(k, kayit(`2026-0${i}-01T10:00:00Z`, false, 'x'));
    expect(k.oncekiler.every(o => o.oncekiler === undefined)).toBe(true);
  });

  it('tarihçe kapağı: son kayıt + dört öncesi', () => {
    let k = null;
    for (let i = 1; i <= 9; i++) k = olusSinavKayitla(k, kayit(`2026-01-0${i}T10:00:00Z`, false, 'x'));
    expect(k.oncekiler.length).toBe(4);
    expect(k.oncekiler[0].at).toBe('2026-01-05T10:00:00Z');  // en eskisi düşer
    expect(k.at).toBe('2026-01-09T10:00:00Z');
  });

  it('mevcut okuyucular kırılmaz — bekleme hesabı üst düzey alanlardan okur', () => {
    const dun = new Date(Date.now() - 86400000).toISOString();
    const ilk = olusSinavKayitla(null, kayit('2026-01-01T10:00:00Z', false, 'x'));
    const son = olusSinavKayitla(ilk, kayit(dun, false, 'y'));
    expect(olusSinamaBeklemeSinav(son)).toBeGreaterThan(0);   // tarihçe bekleme hesabını bozmaz
  });
});

describe('olusSinamaAc — dış kart sözleşmesi', () => {
  beforeEach(kur);
  /* `_sinamaOpen` modül-yerel bir bayraktır ve overlay'i DOM'dan silmek onu
     sıfırlamaz: açık bırakılan bir sınama SONRAKİ testin çağrısını sessizce
     false'a düşürür (yani test yanlış nedenle geçer). Her testten sonra
     "Vazgeç" ile gerçekten kapatılır. */
  afterEach(() => { document.querySelector('#olus-sinama [data-act="iptal"]')?.click(); });

  const disKart = () => ({
    id: 'gk_x_lapis', name: 'Duran', whisper: 'sabit bakış', virtue: 'odak',
    dusunceler: ['buradan kaçmam gerekmiyor'], inanclar: [],
    hisler: ['içimde bir genişleme var'], davranislar: ['durdum'],
  });

  it('katalogda OLMAYAN kartı açar — getCardById\'ye hiç sormaz', () => {
    S.currentUser = { id: 'u1' };
    expect(olusSinamaAc(null, { card: disKart() })).toBe(true);
    expect(document.getElementById('olus-sinama')).toBeTruthy();
  });

  it('dış kart katalog eşiğine (kk.esik) yazılmaz — ontolojiler ayrı', () => {
    S.currentUser = { id: 'u1' };
    olusSinamaAc(null, { card: disKart() });
    expect(Object.keys(S._kisiKarti.esik)).toHaveLength(0);
  });

  it('beklemeyi DIŞ deftere sorar: dinlenmedeki yol açılmaz', () => {
    S.currentUser = { id: 'u1' };
    const taze = { at: new Date().toISOString(), gecti: false };
    expect(olusSinamaAc(null, { card: disKart(), defter: { oku: () => taze } })).toBe(false);
    const eski = { at: new Date(Date.now() - 30 * 86400000).toISOString(), gecti: false };
    expect(olusSinamaAc(null, { card: disKart(), defter: { oku: () => eski } })).toBe(true);
  });

  it('olusSinamaBeklemeSinav saf: defterin nerede durduğunu bilmez', () => {
    expect(olusSinamaBeklemeSinav(null)).toBe(0);
    expect(olusSinamaBeklemeSinav({ at: new Date().toISOString(), gecti: true })).toBe(0);
    expect(olusSinamaBeklemeSinav({ at: new Date().toISOString(), gecti: false })).toBe(7);
    expect(olusSinamaBeklemeSinav({ gecti: false })).toBe(0);   // tarihsiz kayıt kapı kurmaz
  });

  it('opts boşsa davranış BİREBİR eskisi — olunmuş kişi sınanmaz', () => {
    S.currentUser = { id: 'u1' };
    kkMuhurle(A, { yol: 'test' });
    expect(olusSinamaAc(A)).toBe(false);
  });
});

describe('LLM sözleşmesi', () => {
  beforeEach(kur);

  it('oturum yoksa olusKanit sessizce null döner — davet yine açılabilir', async () => {
    expect(await olusKanit(getCardById(A), { dims: {} })).toBeNull();
  });
});

/* SINAMANIN KANIT KAPISI — "model yargılar, alıntı geçirir".
   Sınamanın hükmü artık modelin `gecti` boolean'ına bağlı DEĞİL: bir boyut
   ancak model "yaşandı" derse VE gösterdiği cümle kullanıcının kendi
   cevabında birebir bulunursa sayılır (§6.10 · K4). Aşağıdaki testler tam
   olarak bu kapıyı zorlar — geçirmesi gerekeni geçiriyor, düşürmesi
   gerekeni düşürüyor mu. */
describe('olusSinamaCoz — kanıt kapısı', () => {
  const QA = [
    { boyut: 'dusunceler', cevap: 'Dün sabah aynada kendime baktım ve ilk kez kusurumu aramadım. Bunu fark ettiğimde şaşırdım.' },
    { boyut: 'inanclar', cevap: 'Bir arkadaşım geç kaldığında eskiden beni önemsemediğini düşünürdüm, bu sefer düşünmedim.' },
    { boyut: 'hisler', cevap: 'Cumartesi akşamı yorgundum ve buna kızmadım, sadece kabul ettim.' },
    { boyut: 'davranislar', cevap: 'Salı günü fazladan bir işi reddettim ve özür dilemedim.' },
  ];
  // Model dördünde de "yaşandı" der; ref'leri değişkendir.
  const model = (refler, ek = {}) => ({
    boyutlar: {
      dusunceler:  { yasandi: true, kanit_ref: refler[0], kanit: null },
      inanclar:    { yasandi: true, kanit_ref: refler[1], kanit: null },
      hisler:      { yasandi: true, kanit_ref: refler[2], kanit: null },
      davranislar: { yasandi: true, kanit_ref: refler[3], kanit: null },
    },
    soz: 'Kendi anını gösterdin.',
    ...ek,
  });

  it('dört boyut da kanıtlıysa geçer ve her boyut kullanıcının KENDİ cümlesini taşır', () => {
    const k = olusSinamaCoz(model(['S1', 'S3', 'S4', 'S5']), QA);
    expect(k.gecti).toBe(true);
    expect(k.kanitli).toBe(4);
    for (const d of ['dusunceler', 'inanclar', 'hisler', 'davranislar']) {
      expect(k.boyutlar[d].yasandi).toBe(true);
      // Alıntı kaynaktan kesilir: kullanıcının yazdığı metinde birebir geçer
      const hepsi = QA.map(x => x.cevap).join(' ');
      expect(hepsi).toContain(k.boyutlar[d].alinti.replace(/…$/, ''));
    }
  });

  it('model "yaşandı" der ama kanıtı gösteremezse boyut DÜŞER', () => {
    const k = olusSinamaCoz(model([null, null, null, null]), QA);
    expect(k.kanitli).toBe(0);
    expect(k.gecti).toBe(false);
    for (const d of ['dusunceler', 'inanclar', 'hisler', 'davranislar']) {
      expect(k.boyutlar[d].yasandi).toBe(false);
      expect(k.boyutlar[d].alinti).toBeNull();
    }
  });

  it('iki boyut kanıtlıysa eşik tutmaz — üç şarttır', () => {
    const k = olusSinamaCoz(model(['S1', 'S3', null, null]), QA);
    expect(k.kanitli).toBe(2);
    expect(k.gecti).toBe(false);
  });

  it('üç boyut kanıtlıysa geçer; dördüncü rota olarak durur', () => {
    const k = olusSinamaCoz(model(['S1', 'S3', 'S4', null]), QA);
    expect(k.gecti).toBe(true);
    expect(k.eksik).toBe('davranislar');
    expect(k.boyutlar.davranislar.alinti).toBeNull();
  });

  it('modelin UYDURDUĞU alıntı ekrana giremez — metin daima kaynaktan kesilir', () => {
    const uydurma = 'Her sabah kendime teşekkür ediyorum.';   // QA içinde YOK
    const j = model(['S1', null, null, null]);
    j.boyutlar.dusunceler.kanit = uydurma;
    const k = olusSinamaCoz(j, QA);
    expect(k.boyutlar.dusunceler.alinti).not.toContain('teşekkür');
    expect(QA[0].cevap).toContain(k.boyutlar.dusunceler.alinti.replace(/…$/, ''));
  });

  it('modelin işaret ettiği eksik boyut kanıtsızlar arasındaysa ona uyulur', () => {
    const k = olusSinamaCoz(model(['S1', null, 'S4', null], { eksik: 'davranislar' }), QA);
    expect(k.eksik).toBe('davranislar');
  });

  it('modelin eksik iddiası kanıtla çelişiyorsa yok sayılır', () => {
    // "hisler" kanıtlı geldi; eksik olarak onu göstermek tutarsızdır
    const k = olusSinamaCoz(model([null, null, 'S4', null], { eksik: 'hisler' }), QA);
    expect(k.eksik).not.toBe('hisler');
    expect(k.boyutlar[k.eksik].yasandi).toBe(false);
  });

  it('boyut nesnesi hiç gelmezse sessizce düşer, çökmez', () => {
    const k = olusSinamaCoz({ soz: 'bir şey' }, QA);
    expect(k.gecti).toBe(false);
    expect(k.kanitli).toBe(0);
  });

  it('bozuk yanıt null döner — sınama TÜKETİLMEZ', () => {
    expect(olusSinamaCoz(null, QA)).toBeNull();
    expect(olusSinamaCoz('geçti', QA)).toBeNull();
  });

  it('modelin kendi `gecti` alanı artık kapı DEĞİLDİR', () => {
    const j = model([null, null, null, null]);
    j.gecti = true;                       // model ısrar etse de kanıt yok
    expect(olusSinamaCoz(j, QA).gecti).toBe(false);
  });
});

describe('sökülen dağıtım hattı (K0)', () => {
  it('kuyruk ve tavan yüzeyleri artık yok', () => {
    expect(typeof window.kkOpenFan).toBe('undefined');
    expect(typeof window.kkMaybePresent).toBe('undefined');
  });

  it('halefi yerinde: davet + sınama window sözleşmesi', () => {
    for (const f of ['olusDavetSun', 'olusDavetAc', 'olusSinamaAc', 'olusGunHakki']) {
      expect(typeof window[f]).toBe('function');
    }
  });
});

describe('hedef önceliği — raf hedeflediklerini öne alır', () => {
  beforeEach(kur);

  it('düşük skorlu ama hedefli kart, yüksek skorlu hedefsizden önce sorulur', () => {
    kkEsikAc(A, { skor: 95, dims: {} });
    kkEsikAc(B, { skor: 30, dims: {} });
    kkHedefMuhurle(B);
    expect(olusDavetSec()).toBe(B);
  });
});

/* ÜÇ KAPI — Wanderer daraltır, açanı kullanıcı seçer. Sözleşmenin kalbi:
   açılmayan kapı SORULMAMIŞ sayılır (iz düşmez, yarın yine gelebilir). */
describe('üç kapı — seçim kullanıcınındır', () => {
  beforeEach(kur);

  const C = 'temel-ozsaygi-kok';
  const kapiKartlari = (ids) => ids.map(id => ({ card: getCardById(id), m: null, kanit: null, detay: null }));

  it('kapı seçicisi en fazla n aday döndürür, sırası rafın sırasıdır', () => {
    kkEsikAc(A, { skor: 90, dims: {} });
    kkEsikAc(B, { skor: 80, dims: {} });
    kkEsikAc(C, { skor: 70, dims: {} });
    expect(olusKapiSec(3)).toEqual([A, B, C]);
    expect(olusKapiSec(2)).toEqual([A, B]);
  });

  it('tek kart seçicisi kapı seçicisinin ilk elemanıdır — tek kaynak', () => {
    kkEsikAc(A, { skor: 90, dims: {} });
    kkEsikAc(B, { skor: 95, dims: {} });
    expect(olusDavetSec()).toBe(olusKapiSec(3)[0]);
  });

  it('boş havuzda kapı seçicisi boş dizi döner — null değil', () => {
    expect(olusKapiSec(3)).toEqual([]);
  });

  it('tek adayla kapı KURULMAZ: seçim yoksa kapı da yoktur', () => {
    kkEsikAc(A, { skor: 90, dims: {} });
    expect(olusKapilarAc(kapiKartlari([A]))).toBe(false);
    expect(document.querySelectorAll('.olus-kapi').length).toBe(0);
  });

  it('iki adayla kapı kurulur ve kartlar KAPALI durur', async () => {
    kkEsikAc(A, { skor: 90, dims: {} });
    kkEsikAc(B, { skor: 80, dims: {} });
    expect(olusKapilarAc(kapiKartlari([A, B]))).toBe(true);
    const kapilar = document.querySelectorAll('.olus-kapi');
    expect(kapilar.length).toBe(2);
    // Sırt görünür, hiçbiri çevrilmemiş: kimin beklediği henüz bilinmiyor.
    expect(document.querySelectorAll('.olus-kapi .ikv-back').length).toBe(2);
    expect(document.querySelectorAll('.olus-kapi.is-flipped').length).toBe(0);
    await torenKapat();
  });

  it('mühürlenmiş kart kapıya girmez', async () => {
    kkEsikAc(A, { skor: 90, dims: {} });
    kkEsikAc(B, { skor: 80, dims: {} });
    kkMuhurle(A, { yol: 'davet' });
    // Geriye tek aday kalır → kapı kurulmaz.
    expect(olusKapilarAc(kapiKartlari([A, B]))).toBe(false);
  });

  it('İZ YALNIZ AÇILAN KAPIYA düşer — açılmayanlar sorulmamıştır', async () => {
    [A, B, C].forEach((id, i) => kkEsikAc(id, { skor: 90 - i * 5, dims: {} }));
    olusKapilarAc(kapiKartlari([A, B, C]));
    document.querySelector('.olus-kapi[data-i="1"]').dispatchEvent(new Event('click', { bubbles: true }));

    expect(kkEsikDurum(B).davet).toBe(1);
    expect(kkEsikDurum(B).sonDavet).toBeTruthy();
    for (const id of [A, C]) {
      expect(kkEsikDurum(id).davet | 0).toBe(0);
      expect(kkEsikDurum(id).sonDavet).toBeFalsy();
    }
    // Kapı açıldıktan sonra kart sahnesi gelir; oradan çıkış "henüz değil"
    // perdesidir ve guard'ı ancak RED_MS (1600ms) sonunda bırakır — kısa
    // beklemek sonraki testi sahnesiz bırakırdı.
    await bekle(900);
    await torenKapat(1800);
  }, 10000);

  it('Escape kapıları kapatır, hiçbir ize dokunmaz ve guard\'ı bırakır', () => {
    kkEsikAc(A, { skor: 90, dims: {} });
    kkEsikAc(B, { skor: 80, dims: {} });
    expect(olusKapilarAc(kapiKartlari([A, B]))).toBe(true);
    document.querySelector('.olus-stage')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(document.querySelectorAll('.olus-kapi').length).toBe(0);
    for (const id of [A, B]) expect(kkEsikDurum(id).davet | 0).toBe(0);
    // Guard düştü: tören yeniden açılabiliyor (kilit kalmadı).
    expect(olusKapilarAc(kapiKartlari([A, B]))).toBe(true);
    document.querySelector('.olus-stage')
      ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  });
});
