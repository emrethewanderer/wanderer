/* ═══════════════════════════════════════════════════════
   13v — İHTİYAÇ MOTORU · "sana verilen söz, senin sözün olsun"
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Günün Sözü bugüne dek tek bir sinyale — en zayıf temele — bakıyordu;
     doğru yere değiyordu ama kimseye ait değildi. Oysa uygulama kullanıcıyı
     zaten tanıyor: portresini, kişilerini, örüntülerini, hedefini ve artık
     tuttuğu/tutamadığı sözleri (13u). Bu motor o dağınık tanıklığı tek bir
     ihtiyaca damıtır ki söz "herkese uyan bir cümle" değil, o kişinin bugün
     durduğu yerin sözü olsun. Soğuk başlangıçta bile başkalarının ortalaması
     sunulmaz — kullanıcının kendi ilk portresi tohumdur. Mesele Sensin.
   MEKANİK / MİMARİ / TEK GİRİŞ:
     Kaynaklar OY verir, motor sayar: her kaynak bir eksen adayı + ağırlık
     bildirir (_oyPortre/_oyTemel/_oyDefter/_oyKisi), ağırlıklar OLGUNLUĞA
     göre değişir (tohum→portre baskın, tanıdık→defter baskın). En çok oyu
     alan eksen kazanır. Tüketiciler: 10s Günün Sözü + Günün Armağanı.
   Kalıcılık: YOK — motor saf okuyucudur, her çağrıda taze hesaplar.
   Konvansiyon: window.ih* expose; kaynak yoksa sessizce düşer (asla bloklama)
═══════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { kkComputeSignals } from './10q-w2-kisi-karti.js';
import { dpTest } from './16-i18n-prompts.js';

/* ─── 1. EKSENLER VE ALANLAR ─── */

/** İhtiyaç ekseni = kitabın beş temeli. Söz bankası da bu eksende yazılıdır
 *  (gl.soz.<alan>.<eksen>.<n>) — motor bankayla aynı dili konuşur. */
export const IH_EKSENLER = ['oz_sevgi', 'oz_saygi', 'oz_deger', 'oz_guven', 'bolluk'];
/* Bir temelin "ölçülmüş" sayılması için gereken en az sinyal — 09b'nin
   dfGetActiveFoundationTarget eşiğiyle aynı. Altındaki temel oy kullanamaz. */
const IH_TEMEL_MIN_SINYAL = 2;
const IH_ALANLAR = ['bireysel', 'iliski', 'is'];

/** Kaynak ağırlıkları — olgunluk kademesine göre. Tohum hâlinde kullanıcının
 *  kendi portresi konuşur; tanıdıkça kendi davranışı (defter) öne geçer. */
const AGIRLIK = {
  tohum:    { portre: 3.0, temel: 1.5, defter: 0.0, kisi: 0.5 },
  tanisma:  { portre: 2.0, temel: 2.0, defter: 1.5, kisi: 1.0 },
  tanidik:  { portre: 1.0, temel: 2.0, defter: 3.0, kisi: 2.0 },
};

/** Derinlik/sinyal → temel eşlemesi (10q kkComputeSignals çıktısı için).
 *  Kitap kökü: "standart/hak etmek" değer ekseni, "layık" sevgi ekseni. */
const SINYAL_EKSEN = {
  standart:        'oz_deger',
  hak_etmek:       'oz_deger',
  normal:          'oz_saygi',
  layik:           'oz_sevgi',
  empoweringRatio: 'oz_guven',
  newChoiceRatio:  'oz_guven',
};

/* Bir alanın söz tutma oranı bunun altındaysa "burada zorlanıyor" sayılır. */
const ZORLANMA_ESIGI = 0.5;
/* Son bu kadar sözde geçen eksen çeşitlilik için hafifçe cezalandırılır. */
const TEKRAR_PENCERESI = 3;
/* Bu ağırlıklı puana ulaşan ihtiyaç "tam kanıtlı" sayılır (guc kuvvet bileşeni). */
const DOYGUNLUK_PUANI = 4;

/* ─── 2. OLGUNLUK ─── */

function _sayi(v, d = 0) { return (typeof v === 'number' && isFinite(v)) ? v : d; }

/** Motorun kullanıcıyı ne kadar tanıdığı. Ağırlıkları bu belirler. */
export function ihOlgunluk() {
  let defterGun = 0, kisi = 0, oruntu = 0, hedef = 0;
  try { defterGun = window.sdGunSayisi?.() || 0; } catch (_) {}
  try { kisi = Object.keys(S._lifeMemory?.people || {}).length; } catch (_) {}
  try { oruntu = window.omPatternCount?.() || 0; } catch (_) {}
  try { hedef = window.oikGetCard?.() ? 1 : 0; } catch (_) {}

  const sinyal = (kisi >= 2 ? 1 : 0) + (oruntu >= 1 ? 1 : 0) + hedef;
  if (defterGun >= 10 || sinyal >= 3) return 'tanidik';
  if (defterGun >= 3 || sinyal >= 1) return 'tanisma';
  return 'tohum';
}

/* ─── 3. OY VEREN KAYNAKLAR ───
   Her biri [{ eksen, puan, kanit }] döner. Kaynak yoksa boş dizi — motor
   eksik kaynağa tahammüllüdür, kimse bloklamaz. */

/** Portre (02c) — kullanıcının onboarding'de kurduğu ilk kart: hem sentezin
 *  ekseni (weakestKey/domainRecs) hem kartın KENDİ cümleleri (_oyPortreKart). */
function _oyPortre(alan) {
  const oylar = [];
  try {
    const rec = S._onboardingRecommendation;
    const alanEksen = rec?.domainRecs?.[alan]?.foundationKey;
    if (alanEksen && IH_EKSENLER.includes(alanEksen)) {
      oylar.push({ eksen: alanEksen, puan: 1, kanit: 'portre_alan' });
    }
    const genel = rec?.weakestKey;
    if (genel && IH_EKSENLER.includes(genel)) {
      oylar.push({ eksen: genel, puan: alanEksen ? 0.5 : 1, kanit: 'portre_genel' });
    }
  } catch (_) {}
  return oylar.concat(_oyPortreKart());
}

/**
 * Portrenin KENDİ CÜMLELERİ — tohumun asıl kaynağı.
 * Kullanıcının onboarding'de yazdığı dört kategori taranır; kullanıcının
 * el yazısı (src:'user') tam ağırlık, Emre çıkarımı / karttan gelen madde
 * yarım ağırlık taşır — kendi cümlen senin hakkındaki en ağır tanıktır.
 */
function _oyPortreKart() {
  const oylar = [];
  try {
    const kart = S._portre;
    if (!kart) return oylar;
    ['dusunceler', 'inanclar', 'duygular', 'davranislar'].forEach(kategori => {
      const liste = Array.isArray(kart[kategori]) ? kart[kategori] : [];
      liste.forEach(madde => {
        const metin = _maddeMetni(madde);
        if (!metin) return;
        const agirlik = (!madde || !madde.src || madde.src === 'user') ? 1 : 0.5;
        IH_EKSENLER.forEach(eksen => {
          if (!_eksenEslesir(metin, eksen)) return;
          oylar.push({ eksen, puan: agirlik, kanit: 'portre_alinti', alinti: _kisalt(metin) });
        });
      });
    });
  } catch (_) {}
  return oylar;
}

/** Portre maddesi {text, src} objesidir; eski/serbest biçimlere de tahammül. */
function _maddeMetni(madde) {
  if (!madde) return '';
  if (typeof madde === 'string') return madde.trim();
  return String(madde.text || '').trim();
}

/** Metin bu ekseni çağırıyor mu? Desenler dile duyarlı (16c DETECT_I18N). */
function _eksenEslesir(metin, eksen) {
  try { return dpTest(`detect.eksen.${eksen}`, metin); } catch (_) { return false; }
}

/** Alıntıyı kelime sınırında kırp — kanıt cümlesi taşmasın. */
function _kisalt(s, n = 52) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  const kesik = t.slice(0, n);
  const bosluk = kesik.lastIndexOf(' ');
  return (bosluk > n * 0.6 ? kesik.slice(0, bosluk) : kesik) + '…';
}

/** Temeller (09b) — canlı beş temel puanı; en zayıf iki temel oy verir. */
function _oyTemel() {
  const oylar = [];
  try {
    const fp = S._foundationsProfile;
    if (!fp) return oylar;
    /* Kanıtsız temel OY KULLANAMAZ. Eskiden hiç sinyal gelmemiş eksenler de
       50 puanla yarışıp günün sözünü belirleyebiliyordu — söz, ölçülmemiş bir
       zayıflıktan doğuyordu. */
    const skorlar = IH_EKSENLER
      .filter(k => (fp[k]?.signals_count || 0) >= IH_TEMEL_MIN_SINYAL)
      .map(k => ({ eksen: k, skor: _sayi(fp[k]?.score, 50) }))
      .sort((a, b) => a.skor - b.skor);
    // En zayıf tam puan, ikinci yarım — tek bir temele saplanıp kalmasın.
    if (skorlar[0]) oylar.push({ eksen: skorlar[0].eksen, puan: 1, kanit: 'temel_enzayif' });
    if (skorlar[1] && skorlar[1].skor < 60) {
      oylar.push({ eksen: skorlar[1].eksen, puan: 0.5, kanit: 'temel_ikinci' });
    }
  } catch (_) {}
  return oylar;
}

/** Söz Defteri (13u) — kullanıcının KENDİ davranışı. En ağır kanıt budur:
 *  tutulamayan eksende iş bitmemiştir (oy artar), tutulan eksende görülmüştür
 *  (oy düşer). Son günlerin ekseni çeşitlilik için hafifçe cezalandırılır. */
function _oyDefter(alan) {
  const oylar = [];
  try {
    const gecmis = window.sdGecmis?.(21) || [];
    // ERKEN ÇIKIŞ YOK: 21 günlük pencere boş olsa da çeşitlilik cezası
    // uygulanmalı — sdSonSozler 90 güne bakar, biri boşken diğeri dolu olabilir.

    // Eksen bazında hüküm sayımı (eksen, satırın banka anahtarından okunur).
    // Alanın KENDİ geçmişi ayrı sayılır: eksen kişinin geneli olsa da ihtiyaç
    // alan alan ölçülmeli — yoksa bir alandaki zorlanma üç alanı birden aynı
    // güçle boyar ve ihNeedTop alanları ayırt edemez.
    const sayim = {};
    gecmis.forEach(k => {
      const eksen = _eksenOf(k);
      if (!eksen) return;
      if (!sayim[eksen]) sayim[eksen] = { tutulan: 0, kirik: 0, alanTutulan: 0, alanKirik: 0 };
      const s = sayim[eksen];
      const kendi = (k.domain === alan);
      if (k.kept === true) { s.tutulan++; if (kendi) s.alanTutulan++; }
      else if (k.kept === false) { s.kirik++; if (kendi) s.alanKirik++; }
    });

    Object.keys(sayim).forEach(eksen => {
      const s = sayim[eksen];
      if (s.alanKirik > s.alanTutulan) {
        oylar.push({ eksen, puan: 1, kanit: 'defter_tutunmadi' });
      } else if (s.alanTutulan >= 2 && s.alanKirik === 0) {
        oylar.push({ eksen, puan: -0.75, kanit: 'defter_tutuluyor' });
      } else if (s.kirik > s.tutulan) {
        // Başka alanda zorlanıyor — aynı eksen buraya da yarım oyla taşınır.
        oylar.push({ eksen, puan: 0.5, kanit: 'defter_baska_alan' });
      } else if (s.tutulan >= 2 && s.kirik === 0) {
        oylar.push({ eksen, puan: -0.4, kanit: 'defter_tutuluyor_hafif' });
      }
    });

    // Alanın genel zorlanması: kırıklar birden çok eksene dağıldıysa hiçbiri
    // tek başına çoğunluk olmayabilir — o zaman alanın EN ÇOK kırılan ekseni
    // yine de çağrılır. Oy yalnız kırığı olan eksene gider; "son sözün ekseni"
    // ölçüsü kullanılmaz, çünkü o eksen tutulmuş bile olabilirdi.
    const oran = window.sdTutmaOrani?.(alan, 21);
    if (typeof oran === 'number' && oran < ZORLANMA_ESIGI) {
      const enCokKirilan = Object.keys(sayim)
        .filter(e => sayim[e].alanKirik > 0)
        .sort((a, b) => sayim[b].alanKirik - sayim[a].alanKirik)[0];
      if (enCokKirilan) {
        oylar.push({ eksen: enCokKirilan, puan: 0.5, kanit: 'defter_alan_zorladi' });
      }
    }

    // Çeşitlilik: son birkaç sözün ekseni üst üste gelmesin — AMA iki kayıtla:
    // (1) tutunmamış eksen CEZALANMAZ, çünkü orada iş bitmemiştir; tekrar cezası
    //     asıl ihtiyacı bastırırsa motor kullanıcıyı en çok zorlandığı yerde
    //     yalnız bırakır. (2) Ceza eksen başına bir kez sayılır; aynı eksenden
    //     üç kayıt üst üste gelince ceza defter oyunu tümden silmesin.
    const cezali = new Set();
    (window.sdSonSozler?.(TEKRAR_PENCERESI) || []).forEach(s => {
      const eksen = _eksenOf(s);
      if (!eksen || cezali.has(eksen)) return;
      const durum = sayim[eksen];
      if (durum && durum.alanKirik > durum.alanTutulan) return;   // tutunmamış → dokunma
      cezali.add(eksen);
      oylar.push({ eksen, puan: -0.4, kanit: 'defter_yakinda' });
    });
  } catch (_) {}
  return oylar;
}

/** Kişi sinyalleri (10q) — derinlikler ve inanç oranları temele çevrilir. */
function _oyKisi() {
  const oylar = [];
  try {
    const sig = kkComputeSignals();
    if (!sig) return oylar;
    Object.keys(SINYAL_EKSEN).forEach(alanAdi => {
      /* Sinyal yoksa nötr 50: eşik 45 olduğu için kanıtsız alan OY VERMEZ —
         varsayılan burada bir ölçüm iddiası değil, sessizlik anlamına gelir. */
      const skor = _sayi(sig[alanAdi], 50);
      if (skor < 45) {
        oylar.push({
          eksen: SINYAL_EKSEN[alanAdi],
          /* KOKEN-MUAF: oyun AĞIRLIĞI (ne kadar güçlü oy), ölçülen değer değil */
          puan: skor < 30 ? 1 : 0.5,
          kanit: 'kisi_derinlik',
        });
      }
    });
    // Şükür pratiği hiç yoksa bolluk ekseni sessizce çağrılır.
    if (_sayi(sig.gratitude, 0) === 0) {
      oylar.push({ eksen: 'bolluk', puan: 0.5, kanit: 'kisi_sukur' });
    }
  } catch (_) {}
  return oylar;
}

/**
 * Defter satırından ekseni çöz.
 * ANAHTAR SÖZLEŞMESİ — üç ailenin de 4. parçası EKSENDİR; 10s yeni bir söz
 * kaynağı eklerse bu düzene uymak zorundadır, yoksa defter öğrenmeyi sessizce
 * kaybeder (hata vermez, sadece kör olur):
 *   gl.soz.<alan>.<eksen>.<n>   düz banka
 *   gl.sozk.<alan>.<eksen>      kişi yuvalı · gl.sozo.<alan>.<eksen> olay yuvalı
 *   gl.terzi.<alan>.<eksen>     gece dokuması (13w)
 * Kullanıcının kendi yazdığı sözde anahtar YOKTUR (source:'user') — orada
 * eksen iddiası da olmaz, satır sessizce atlanır.
 */
function _eksenOf(kayit) {
  try {
    const key = kayit && kayit.key;
    if (!key || typeof key !== 'string') return null;
    const parca = key.split('.');
    const eksen = parca[3];
    return IH_EKSENLER.includes(eksen) ? eksen : null;
  } catch (_) { return null; }
}

/* ─── 4. SAYIM — ihtiyaç buradan doğar ─── */

/**
 * Bir alanın bugünkü ihtiyacı.
 * @param {'bireysel'|'iliski'|'is'} alan
 * @returns {{eksen:string, alan:string, guc:number, kanit:string, kaynak:string, olgunluk:string}}
 */
export function ihNeed(alan) {
  const olgunluk = ihOlgunluk();
  const w = AGIRLIK[olgunluk] || AGIRLIK.tanisma;

  const kutu = {};   // eksen → { puan, kanit, kaynak }
  const topla = (oylar, agirlik, kaynak) => {
    if (!agirlik) return;
    oylar.forEach(o => {
      if (!o || !IH_EKSENLER.includes(o.eksen)) return;
      if (!kutu[o.eksen]) kutu[o.eksen] = { puan: 0, kanit: '', kaynak: '', alinti: '' };
      const katki = o.puan * agirlik;
      kutu[o.eksen].puan += katki;
      // Kanıt, en çok katkı yapan oydan alınır — kullanıcıya/Terzi'ye
      // gösterilecek gerekçe en güçlü tanık olsun.
      if (katki > 0 && katki >= (kutu[o.eksen]._enBuyuk || 0)) {
        kutu[o.eksen]._enBuyuk = katki;
        kutu[o.eksen].kanit = o.kanit;
        kutu[o.eksen].kaynak = kaynak;
        kutu[o.eksen].alinti = o.alinti || '';
      }
    });
  };

  topla(_oyPortre(alan), w.portre, 'portre');
  topla(_oyTemel(), w.temel, 'temel');
  topla(_oyDefter(alan), w.defter, 'defter');
  topla(_oyKisi(), w.kisi, 'kisi');

  const adaylar = Object.keys(kutu)
    .map(eksen => ({ eksen, ...kutu[eksen] }))
    .filter(a => a.puan > 0)
    .sort((a, b) => b.puan - a.puan);

  // Hiç oy çıkmadıysa mevcut davranışa düş: en zayıf temel / 'default'.
  if (!adaylar.length) {
    return {
      eksen: _varsayilanEksen(), alan, guc: 0.2,
      kanit: 'varsayilan', alinti: '', kaynak: 'varsayilan', olgunluk,
    };
  }

  const kazanan = adaylar[0];
  /* KOKEN-MUAF: sıfıra bölünme koruması — bu bir payda, ölçüm değil */
  const toplam = adaylar.reduce((t, a) => t + a.puan, 0) || 1;
  // Güç iki şeyi birden söylemeli: kazanan ne kadar NET ayrıştı (pay) ve
  // arkasında ne kadar KANIT var (kuvvet). Yalnız pay kullanılırsa tek adaylı
  // zayıf bir sinyal de 1.0 görünür — Armağan'ın alan seçimi (ihNeedTop) buna
  // bakar, o yüzden mutlak kanıt miktarı da hesaba girer.
  const pay = kazanan.puan / toplam;
  const kuvvet = Math.min(1, kazanan.puan / DOYGUNLUK_PUANI);
  return {
    eksen: kazanan.eksen,
    alan,
    guc: Math.round((0.5 * pay + 0.5 * kuvvet) * 100) / 100,
    kanit: kazanan.kanit || '',
    alinti: kazanan.alinti || '',
    kaynak: kazanan.kaynak || 'temel',
    olgunluk,
  };
}

/** Motor sussa bile bir eksen dönmeli — 10s'in eski davranışıyla aynı. */
function _varsayilanEksen() {
  try {
    const fp = S._foundationsProfile;
    if (fp) {
      let wk = null, ws = Infinity;
      IH_EKSENLER.forEach(k => {
        if ((fp[k]?.signals_count || 0) < IH_TEMEL_MIN_SINYAL) return; // kanıtsız
        const sc = fp[k]?.score;
        if (typeof sc !== 'number' || !isFinite(sc)) return;
        if (sc < ws) { ws = sc; wk = k; }
      });
      if (wk) return wk;
    }
  } catch (_) {}
  try {
    const w = S._onboardingRecommendation?.weakestKey;
    if (w && IH_EKSENLER.includes(w)) return w;
  } catch (_) {}
  return 'default';
}

/* ─── 5. AD VE OLAY — sözün gerçek hayata değdiği yer ───
   Söz "bir yakınıma" değil "Ayşe ile" dediğinde kişiselleşir. Kaynak: p6
   yaşam belleği (09a). İki sert kısıt var:
   1) Söz HARFİYEN yazılarak mühürlenir → ad/olay kısa olmalı, yoksa tören
      eziyete döner; uzun olan eleme dışıdır (düz bankaya düşülür).
   2) TÜRKÇE EK UYUMU: yuva daima EKSİZ kullanılır ("{kisi} ile", "{kisi}
      için", "{olay} için"). "{kisi}'ye" yazılamaz — Ayşe'ye/Mehmet'e/Oğuz'a
      ünlü uyumu gerektirir ve şablonla doğru üretilemez. */

const AD_MAX = 16;      // "Ayşe" ~4, "Abdurrahman" 11 — 16 cömert ama yazılabilir
const OLAY_MAX = 24;    // "sunum", "iş görüşmesi" — cümleyi taşırmayacak kadar

/** Alanın hangi kişi rollerini konuştuğu (p6 _PERSON_ROLE_CUES rolleri). */
const ALAN_ROLLER = {
  iliski: ['partner', 'mother', 'father', 'sibling', 'child', 'friend', 'unknown'],
  is: ['boss'],
};

/** Bu alanda sözün içine girebilecek kişi adı — en çok anılan kazanır. */
export function ihKisi(alan) {
  try {
    const roller = ALAN_ROLLER[alan];
    if (!roller) return null;
    const people = S._lifeMemory?.people || {};
    const adaylar = Object.values(people)
      .filter(p => p && typeof p.name === 'string')
      .filter(p => p.name.trim().length >= 2 && p.name.trim().length <= AD_MAX)
      .filter(p => roller.includes(p.role || 'unknown'))
      .sort((a, b) => _sayi(b.mention_count, 0) - _sayi(a.mention_count, 0));
    return adaylar.length ? adaylar[0].name.trim() : null;
  } catch (_) { return null; }
}

/** Bu alanda sözün içine girebilecek yaklaşan olay — en yeni açık döngü. */
export function ihOlay(alan) {
  try {
    if (alan === 'iliski') return null;               // ilişki alanı adla konuşur
    const loops = S._lifeMemory?.openLoops || [];
    const acik = loops.filter(l => l && l.status === 'open' && (l.event || l.text));
    // İş alanı yalnız iş konulu döngüyü alır; bireysel alan hepsini.
    const uygun = (alan === 'is') ? acik.filter(l => l.topic === 'work') : acik;
    for (let i = uygun.length - 1; i >= 0; i--) {
      const ham = String(uygun[i].event || uygun[i].text || '').replace(/\s+/g, ' ').trim();
      if (ham && ham.length <= OLAY_MAX) return ham;   // uzun olan sessizce elenir
    }
    return null;
  } catch (_) { return null; }
}

/** Üç alanın en güçlü ihtiyacı — Günün Armağanı bunu tüketir (FAZ 7). */
export function ihNeedTop() {
  const hepsi = IH_ALANLAR.map(a => ihNeed(a));
  return hepsi.sort((x, y) => y.guc - x.guc)[0];
}

/** Üç alanın ihtiyacı birden — Günün Sözü üç kapı açar. */
export function ihNeedAll() {
  const out = {};
  IH_ALANLAR.forEach(a => { out[a] = ihNeed(a); });
  return out;
}

/* ── window expose (TDZ-güvenli, minify-dayanıklı) ── */
if (typeof window !== 'undefined') {
  window.ihNeed = ihNeed;
  window.ihNeedTop = ihNeedTop;
  window.ihNeedAll = ihNeedAll;
  window.ihOlgunluk = ihOlgunluk;
  window.ihKisi = ihKisi;
  window.ihOlay = ihOlay;
}
