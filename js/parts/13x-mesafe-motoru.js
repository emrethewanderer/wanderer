/* ═══════════════════════════════════════════════════════
   13x — MESAFE MOTORU · "Aradaki Yol"
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Uygulama iki kutbu her yerde çiziyor: ALTIN = olduğun kişi,
     LAPİS = olmak istediğin kişi. Ama aradaki mesafeyi hiçbir yerde
     dürüstçe ölçmüyordu — Eşik Ekranı'ndaki çubuk sabit gradyandı,
     kart detayındaki yüzde üç kapıdan yalnız birini sayıyordu.
     "Mesele Sensin": ölçülen şey kartın zorluğu değil, SENİN o kişiye
     ne kadar kaldığındır. Bu motor tek soruyu cevaplar — "bugünkü sen
     ile o kişi arasında ne kaldı?" — ve cevabı asla süslemez.

     İki ölçü ayrı durur, ikisi de dürüsttür:
       · HAZIRLIK (10q kkMatchCard) — kart-nesnel: üç kapının en zayıf
         halkası. %100 tam olarak "kart sana sunulabilir" demektir.
       · NİYET — kişisel: senin kendi yazdığın hedef (OİK maddeleri) ve
         hedef mührü vurduğun kişiler. Niyet SIRAYI kurar, kapıyı
         SATIN ALMAZ — hedeflediğin kart daha önce görünür, daha ucuza
         gelmez. Kartın bedeli herkes için aynıdır.

   MEKANİK / MİMARİ / TEK GİRİŞ:
     msNiyetBaglam() bir kez niyet bağlamını çıkarır (hedefler + OİK'i
     besleyen erdemler + en yoğun kategori); msNiyet(card, ctx) her kart
     için 1.0–4.0 arası katsayı döndürür. Ölçümün kendisi burada YAPILMAZ:
     hazırlık 10q'nun kkMatchCard'ından okunur — ikiz ölçüm motoru yoktur.
   Kalıcılık: Kalıcılık yok (türetilmiş; niyet her tarama turunda taze okunur)
   Konvansiyon: i18n t(); window.ms* expose; stil yok (tüketiciler kendi yüzeyini çizer)
═══════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { ABSORB_MAP } from './10D-olmak-istedigin.js';
import { getCardById } from './12b-kart-destesi.js';
import { SafeStorage, localISODate } from './00a-infrastructure.js';

/* ─── 1. SABİTLER ─── */

/* Niyet katkıları. Toplam tavan 4.0 (1.0 taban + 3.0 katkı).
   Hedef mührü baskın olsun diye ağırlığı diğer ikisinin toplamının iki
   katı: kullanıcının ELİYLE seçtiği kişi, algoritmanın çıkardığı
   örtüşmeden daha güçlü bir niyet beyanıdır. */
const NIYET_HEDEF = 2.0;
const NIYET_ERDEM = 0.6;
const NIYET_BOYUT = 0.4;

/* OİK kategorisi → kart boyutu (ABSORB_MAP'in tersi; tek fark duygular↔hisler) */
const CAT_TO_DIM = Object.fromEntries(Object.entries(ABSORB_MAP).map(([dim, cat]) => [cat, dim]));

/* ─── 2. NİYET BAĞLAMI — tur başına BİR kez ─── */

/** Kartın en çok konuştuğu boyut: reçetedeki sinyallerin dim başına ağırlık
 *  toplamı en yüksek olanı. Reçete susuyorsa null (örtüşme aranmaz). */
function _kartBaskinBoyut(card) {
  const sigs = card?.recipe?.signals;
  if (!Array.isArray(sigs) || !sigs.length) return null;
  const agirlik = {};
  for (const s of sigs) {
    if (!s || !s.dim) continue;
    agirlik[s.dim] = (agirlik[s.dim] || 0) + (s.weight || 1);
  }
  let en = null, enW = 0;
  for (const [d, w] of Object.entries(agirlik)) if (w > enW) { en = d; enW = w; }
  return en;
}

/** Niyetin ağırlık merkezi. Üç kaynaktan okunur, hiçbiri zorunlu değil:
 *    hedefler — kullanıcının hedef mührü vurduğu kartlar (10q kk.hedefler)
 *    erdemler — OİK kartını BESLEYEN kartların erdemleri (10D oikCardRefs)
 *    agirBoyut — OİK'te en çok madde yazılmış kategorinin kart boyutu karşılığı
 *  OİK yoksa/boşsa bağlam boş döner ve tüm niyetler 1.0'da eşitlenir —
 *  motor sessizce nötrleşir, hiçbir kartı cezalandırmaz. */
export function msNiyetBaglam() {
  const ctx = { hedefler: new Set(), erdemler: new Set(), agirBoyut: null };

  try {
    const h = S._kisiKarti?.hedefler;
    if (h) for (const id of Object.keys(h)) ctx.hedefler.add(id);
  } catch (_) {}

  // OİK'i besleyen kartların erdemleri — "hangi türden kişiler olmak istiyorsun"
  try {
    const refs = window.oikCardRefs?.() || [];
    for (const id of refs) {
      const c = getCardById(id);
      if (c?.virtue) ctx.erdemler.add(c.virtue);
    }
  } catch (_) {}

  // En yoğun kategori — kullanıcı niyetini en çok hangi eksende yazmış
  try {
    const k = window.oikGetCard?.();
    if (k) {
      let enCat = null, enN = 0;
      for (const cat of Object.values(ABSORB_MAP)) {
        const n = Array.isArray(k[cat]) ? k[cat].length : 0;
        if (n > enN) { enCat = cat; enN = n; }
      }
      if (enCat) ctx.agirBoyut = CAT_TO_DIM[enCat] || null;
    }
  } catch (_) {}

  return ctx;
}

/** Bağlamı tarama turu başına bir kez çözer. kkTick destenin HER kartını
 *  dönerken kart başına OİK okumak 4 saniyelik döngüyü ısıtırdı (ölçüldüğünde
 *  deste 112 karttı; kesit 12'ye indi ama desen ölçekten bağımsız doğru) — 10q'nun `sig._profil`
 *  memoize'ıyla (kkIknaHesapla) aynı desen. Donmuş sig gelirse sessizce
 *  yeniden hesaplanır, yazma denemesi düşer. */
export function msNiyetCtx(sig) {
  if (sig && sig._niyet) return sig._niyet;
  const ctx = msNiyetBaglam();
  try { if (sig) sig._niyet = ctx; } catch (_) {}
  return ctx;
}

/* ─── 3. NİYET KATSAYISI ─── */

/** Bu kişi olmayı ne kadar istiyorsun: 1.0 (nötr) … 4.0 (elinle seçilmiş).
 *  KAPIYI ETKİLEMEZ — yalnız sıralamada ve Ana Mesafe ortalamasında ağırlık
 *  taşır. `earned` bu sayıyı hiçbir zaman görmez (10q kkMatchCard). */
export function msNiyet(card, ctx) {
  if (!card || !card.id) return 1;
  const c = ctx || msNiyetBaglam();
  let n = 1;
  if (c.hedefler?.has(card.id)) n += NIYET_HEDEF;
  if (card.virtue && c.erdemler?.has(card.virtue)) n += NIYET_ERDEM;
  if (c.agirBoyut && _kartBaskinBoyut(card) === c.agirBoyut) n += NIYET_BOYUT;
  return n;
}

/* ─── 4. ANA MESAFE — iki kutup arasındaki tek sayı ─── */

const YAKIN_N = 3;              // hedef yokken ortalamaya giren kart sayısı
const IZ_GUN = 30;              // günlük izin tutulduğu pencere
const IZ_HAFTA = 52;            // haftalık örneklemenin penceresi (~1 yıl)

/** Ana Mesafe'yi tarama girdilerinden hesaplar ve `S._mesafe`ye yazar.
 *  Girdi: kkTick'in taramada topladığı [{ cardId, hazirlik, niyet }] —
 *  SAHİPSİZ kartlar (olunmuş kişi ölçülmez, o mesafe kapanmıştır).
 *
 *  Kaynak önceliği:
 *    1) hedef mührü vurulmuş kartlar — kullanıcının ELİYLE seçtiği kişiler
 *    2) yoksa en yakın 3 kart — henüz hedef seçmemiş kullanıcı da bir yol görür
 *    3) hiç sahipsiz kart yoksa null — sayı gizlenir, davet metni kalır
 *
 *  Ortalama niyet-ağırlıklıdır: çok istediğin kişiye olan mesafen, öylesine
 *  yakın olduğun kişininkinden daha çok söz sahibidir. */
export function msHesapla(girdiler, sig) {
  const ctx = msNiyetCtx(sig);
  const list = Array.isArray(girdiler) ? girdiler.filter(g => g && typeof g.hazirlik === 'number') : [];
  let kaynak = list.filter(g => ctx.hedefler?.has(g.cardId));
  let tur = 'hedef';
  if (!kaynak.length) {
    tur = 'yakin';
    kaynak = list.slice().sort((a, b) => (b.hazirlik * b.niyet) - (a.hazirlik * a.niyet)).slice(0, YAKIN_N);
  }

  let ana = null;
  if (kaynak.length) {
    let top = 0, agirlik = 0;
    for (const g of kaynak) { const w = g.niyet || 1; top += g.hazirlik * w; agirlik += w; }
    if (agirlik > 0) ana = Math.max(0, Math.min(100, Math.round(top / agirlik)));
  }

  S._mesafe = { ana, hesap: ana == null ? null : { kaynak: tur, n: kaynak.length }, updatedAt: new Date().toISOString() };
  _izYaz(ana);
  return ana;
}

/** Bugünkü Ana Mesafe: 0-100 | null. Tüketiciler (02d, 10f) BUNU okur —
 *  ucuz getter, tarama yapmaz; hesabın yazarı kkTick'tir. */
export function msAnaMesafe() {
  const v = S._mesafe?.ana;
  return typeof v === 'number' && isFinite(v) ? v : null;
}

/* ─── 5. İLERLEME İZİ — "aradaki yol bugünlerden örülür" ─── */

const IZ_KEY = uid => `etw_mesafe_iz_v1_${uid || 'anon'}`;
let _sonIz = null;   // `uid:gün:değer` — aynı tick'te tekrar yazmayı keser

/** Bir günün ait olduğu haftanın PAZARTESİ anahtarı.
 *  Gün anahtarıyla AYNI biçimdedir (YYYY-MM-DD) — böylece günlük ve haftalık
 *  katman tek eksende, tek tip noktayla çizilebilir; okuyucu iki ayrı şekil
 *  öğrenmez. ISO hafta string'i ('2026-W34') bunu yapamazdı. */
function _haftaKovasi(gun) {
  const d = new Date(`${gun}T00:00:00Z`);
  if (isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));   // Pazartesi = 0
  return d.toISOString().slice(0, 10);
}

/** İzi v2 şekline getirir: `{ v:2, d:{gün→pct}, h:{haftaPazartesi→pct} }`.
 *
 *  v1 düz bir objeydi (`{gün→pct}`) ve 30 günde kesiliyordu: kullanıcı
 *  dördüncü ayında "nereden geldim" diye sorduğunda cevap yoktu. v2 son 30
 *  günü GÜN GÜN, öncesini HAFTA HAFTA tutar — bir yıllık yol, birkaç yüz
 *  bayt. Haftanın değeri o haftanın SON kaydıdır ("o haftayı nerede
 *  bitirdin"); ortalama, iyi bir günü kötü bir haftaya yedirirdi.
 *
 *  Taşıma İDEMPOTENTTİR: `user_analytics` KV'si sürümsüz bir snapshot'tır
 *  (son hâl eskiyi ezer, geri alma yok) — iki kez koşan bir göç veriyi
 *  bozarsa kaybı telafi edilemez. */
function _izNormalize(ham) {
  const kaynak = ham && typeof ham === 'object' ? ham : {};
  const iz = kaynak.v === 2
    ? { v: 2, d: { ...(kaynak.d || {}) }, h: { ...(kaynak.h || {}) } }
    : { v: 2, d: { ...kaynak }, h: {} };     // v1 düz obje → günlük katmana

  // Günlük pencereyi aşanlar haftalık kovaya iner (aynı haftada son kayıt kazanır).
  const gunler = Object.keys(iz.d).sort();
  while (gunler.length > IZ_GUN) {
    const eski = gunler.shift();
    const kova = _haftaKovasi(eski);
    if (kova) iz.h[kova] = iz.d[eski];
    delete iz.d[eski];
  }
  const haftalar = Object.keys(iz.h).sort();
  while (haftalar.length > IZ_HAFTA) delete iz.h[haftalar.shift()];
  return iz;
}

/** Günün mesafesini ize işler. kkTick 4 saniyede bir döner; her turda
 *  SafeStorage'a yazmak israftır — gün ya da değer değişmediyse sessizce
 *  düşer. Gün anahtarı localISODate(): toISOString() UTC'dir, TR'de günü
 *  kaydırır ve izin bir günü iki kez yazılır. */
function _izYaz(pct) {
  if (pct == null) return;
  const uid = S.currentUser?.id;
  if (!uid) return;
  const gun = localISODate();
  // İmza UID taşır: iz per-uid bir defterdir. Yalnız `gün:pct` olsaydı, aynı
  // gün hesap değiştiren (ya da çıkıp giren) ikinci kullanıcının aynı
  // yüzdedeki ilk kaydı "zaten yazıldı" sanılıp düşerdi — testte yakalandı.
  const imza = `${uid}:${gun}:${pct}`;
  if (imza === _sonIz) return;
  _sonIz = imza;
  try {
    const iz = _izNormalize(SafeStorage.get(IZ_KEY(uid), {}));
    iz.d[gun] = pct;
    SafeStorage.set(IZ_KEY(uid), _izNormalize(iz));
  } catch (_) {}
}

/** Son N GÜNÜN mesafe izi: [{ gun, pct }] eskiden yeniye. Boşsa [].
 *  Yalnız günlük katmanı okur — sözleşmesi v1'deki gibidir. Uzun yolu
 *  görmek isteyen `msIzSeri()` okur. */
export function msIz(n = IZ_GUN) {
  try {
    const iz = _izNormalize(SafeStorage.get(IZ_KEY(S.currentUser?.id), {}));
    return Object.keys(iz.d).sort().slice(-n).map(gun => ({ gun, pct: iz.d[gun] }));
  } catch (_) { return []; }
}

/** İki `YYYY-MM-DD` anahtarı arasındaki gün farkı. Her iki anahtar da aynı
 *  biçimde (UTC gece yarısı) çözülür — fark bu yüzden kaymaz; anahtarların
 *  KENDİSİ zaten localISODate() ile yazılmıştır. */
function _gunFarki(a, b) {
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  if (isNaN(ta) || isNaN(tb)) return NaN;
  return Math.round((tb - ta) / 86400000);
}

/** UZUN YOL — haftalık örneklem + günlük kayıtlar, tek dizide eskiden yeniye:
 *  `[{ gun, pct, tur: 'hafta'|'gun' }]`. Kanıt yoksa `[]` (§6.10: ölçüsü
 *  olmayan bir eğri çizilmez, davet gösterilir).
 *
 *  İki katman TEK dizide döner çünkü çizen yüzeyin iki şekil öğrenmesi
 *  gerekmez: `gun` alanı ikisinde de aynı biçimdedir (YYYY-MM-DD), `tur`
 *  yalnız noktanın ÇÖZÜNÜRLÜĞÜNÜ söyler — haftalık nokta "o haftanın son
 *  ölçüsü"dür, günlük nokta o günün. */
export function msIzSeri() {
  try {
    const iz = _izNormalize(SafeStorage.get(IZ_KEY(S.currentUser?.id), {}));
    const h = Object.keys(iz.h).sort().map(gun => ({ gun, pct: iz.h[gun], tur: 'hafta' }));
    const d = Object.keys(iz.d).sort().map(gun => ({ gun, pct: iz.d[gun], tur: 'gun' }));
    return [...h, ...d];
  } catch (_) { return []; }
}

/** Dünden bugüne fark: +n / -n / 0 / null (dünün kaydı yoksa). Yolun
 *  "bugünlerden örüldüğünü" gösteren tek sayı — sayaç değil, yön.
 *
 *  GÜN ANLAMLIDIR: son iki KAYIT ardışık GÜNLER değilse null döner. Eskiden
 *  yalnız son iki kayıt kıyaslanıyordu; beş gün ara veren kullanıcı
 *  döndüğünde "Dünden bugüne yol kısaldı" cümlesi beş gün öncesini "dün"
 *  diye gösteriyordu. Kayıt boşluğu bir gün değildir. */
export function msIzFark() {
  const iz = msIz(2);
  if (iz.length < 2) return null;
  if (_gunFarki(iz[0].gun, iz[1].gun) !== 1) return null;
  return iz[1].pct - iz[0].pct;
}

/* ─── 6. WINDOW EXPOSE (TDZ-güvenli, minify-dayanıklı) ─── */
if (typeof window !== 'undefined') {
  window.msNiyet = msNiyet;
  window.msNiyetBaglam = msNiyetBaglam;
  window.msNiyetCtx = msNiyetCtx;
  window.msHesapla = msHesapla;
  window.msAnaMesafe = msAnaMesafe;
  window.msIz = msIz;
  window.msIzSeri = msIzSeri;
  window.msIzFark = msIzFark;
}
