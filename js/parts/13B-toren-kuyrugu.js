/* ═══════════════════════════════════════════════════════
   13B — TÖREN KUYRUĞU · Sahnenin sırası
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Törenin gücü seyrekliğinden gelir. Bir akşam girişinde sözün
     kapanışı, günün mührü, akşam töreni ve ultra uyanış aynı
     dakikaya düşerse dördü de tören olmaktan çıkar, bildirime
     dönüşür. "Kart değil, kaldıraç" ilkesinin tören karşılığı:
     sahne, hak ettiği sessizliğin içinde açılır.

   MEKANİK / MİMARİ / TEK GİRİŞ:
     Sahne sahibi açılmadan önce `trnIzin(ad)` sorar. Kuyruk iki şeye
     bakar: (1) DOM'da açık bir sahne var mı — TEK GERÇEK KAYNAK
     burasıdır, ayrı bir state defteri tutulmaz (state ile DOM
     ayrışırsa kuyruk kilitlenir); (2) bu oturumda davetsiz sahne
     bütçesi doldu mu. Reddedilen sahne kaybolmaz: kendi tetiğini
     korur, sıradaki fırsatta yine sorar.

     ERTELEME SESSİZDİR: reddedilen sahne kullanıcıya "yarın görüşürüz"
     demez. Görülmemiş bir törenin ertelendiğini duyurmak, törenin
     kendisinden gürültülüdür; sahne sırasını bekler, kullanıcı beklemez.

     Bu modül YENİ kural icat etmez — üç yerde elle tutulan listeyi
     (10s `_glBlockingOverlay`, 13h `_blocked`, 13z `_igBlocked`)
     tek yere toplar. Sahnelerin kendi özel koşulları (13h'nin
     "yalnız Bugün ekranında" kuralı gibi) sahiplerinde kalır:
     kuyruk ne zaman uygun olduğunu değil, SIRANIN kimde olduğunu
     bilir.

   Kalıcılık: yok — bütçe oturumluktur; gün dönerse kendini sıfırlar.
   Konvansiyon: window.trn* expose (TDZ-güvenli); i18n gerekmez (yüzeysiz).
═══════════════════════════════════════════════════════ */
import { localDayKey, localISODate, SafeStorage } from './00a-infrastructure.js';
import { S } from '../state.js';

/* ─── 1. SAHNE ENVANTERİ ─── */

/* Tören portalları — üç elle tutulan listenin BİRLEŞİMİ. Bir sahne buraya
   yazılmazsa kuyruk onu görmez ve üstüne ikinci sahne açılır; yeni tören
   eklerken portal id'si buraya da girer. */
const TRN_PORTAL = [
  'gl-portal',      // 10s  Günlük Ritüel (armağan + söz)
  'at-portal',      // 13h  Akşam Kapanış Töreni
  'sm-portal',      // 10t  Seri Mührü
  'us-portal',      // 10u  Üç Mühür / ultra uyanış
  'yol-portal',     // 10f  Yol — iki kart
  'ig-portal',      // 13z  İmge Kapısı
  'olus-portal',    // 10q4 Oluş Mührü
  'hz-pack-portal', // 12f  Hazine paketi
  'wr-portal',      // 13j  Ayın Filmi
  'mt-portal',      // 13d  Gezgine Mektup
  'gor-portal',     // 10E  Gördün — pencereden bakış
  'mpc-portal',     // 10p  Meclis
  'mr-portal',      // 10v  Manifesto okuru
  'gb-portal',      // 13t  Dönüşüm Aynası
];

/* Kabuk meşguliyeti: tören değil ama tören açılmasına da izin vermeyen
   anlar — perde iniyor, onboarding sürüyor, kapı animasyonu oynuyor. */
function _kabukMesgul() {
  try {
    if (document.getElementById('wn-splash')?.classList.contains('show')) return true;
    if (document.getElementById('onb-ritual') || document.querySelector('.sc-onb')) return true;
    if (document.querySelector('.fgate-overlay, .fgate-doors')) return true;
  } catch (_) {}
  return false;
}

/* ─── 2. BÜTÇE (oturumluk) ─── */

/* Oturum başına davetsiz sahne tavanı. İki, çünkü akşam girişinde doğal
   yığılma üç sahnedir (sözün kapanışı + günün mührü + akşam töreni) ve
   üçüncüsü tören olmaktan çıkıp bildirime dönüşür. */
const TRN_TAVAN = 2;

/* Sahne önceliği — küçük sayı önce. Sıra yargısı değil ANLAM sırası:
   taahhüt döngüsünü kapatan sahne (verilen sözün hesabı) günün özetinden
   önce gelir, çünkü özet ertesi gün de anlamlıdır; kapanmayan söz değildir.
   Listede olmayan sahne varsayılan olarak en arkaya düşer. */
const TRN_ONCELIK = {
  'gunluk-ritus': 1,   // 10s  armağan · söz · akşam hesabı
  'seri-muhru':   2,   // 10t  günü mühürleme
  'aksam-toreni': 3,   // 13h  günün özeti — ertelenebilir
  'imge-kapisi':  4,   // 13z
  'ayin-filmi':   4,   // 13j
};
const TRN_VARSAYILAN_ONCELIK = 5;

/* Bütçenin SON birimi korunur: oraya yalnız taahhüt döngüsünün sahneleri
   girer. Yoksa erken gelen bir özet, geç gelen bir hesabı kapıda bırakır —
   ve kullanıcı sözünü kapatamadan gün biter. */
const TRN_KORUMALI = 2;

/* Bütçeden MUAF ama bütçeyi TÜKETEN sahneler. Günün taşıyıcı ritüeli tavana
   takılırsa o gün armağan da söz de kullanıcıya hiç ulaşmaz — bütçenin işi
   akşam yığılmasını seyreltmek, günün omurgasını kesmek değil. Muaf sahne
   sayacı yine artırır: kendisinden sonra gelen özet, sırasını bilsin. */
const TRN_ZORUNLU = new Set(['gunluk-ritus']);

let _sayac = 0;
let _gun   = null;

/* ════════════════════════════════════════════════════════════════════
   ISRAR DOZU (İç Çalışma 10 · FAZ 17) — "✕" bir cevaptır, sessizlik değil
   ───────────────────────────────────────────────────────────────────
   Bugüne dek kuyruk yalnız AÇILIŞLARI sayıyordu: kullanıcı bir töreni üst
   üste kapatsa da, ertesi gün bütçe sıfırlanıyor ve tören yine davetsiz
   geliyordu. `wtTorenSonuc` sonucu yazıyordu ama SORAN yoktu — ölçülen ama
   kullanılmayan bir sinyal.

   SÖZLEŞMENİN ÖZÜ KORUNUR: **✕ "şimdi değil" demektir, "asla" değil.**
   Üç koruma bunu kodla garantiler:
     1. Yalnız DAVETSİZ açılış susturulur. Kullanıcı töreni KENDİ açarsa
        (`davetsiz:false`) kapı her zaman açılır — kendi kapısına kilit yok.
     2. Sessizlik SÜRELİDİR (`TRN_RET_SUS_GUN`), kalıcı değil.
     3. Tek bir kabul (`trnKabul`) sayacı ANINDA sıfırlar — bir kez katılan
        kullanıcı yeniden davet edilir.

   SAYININ GEREKÇESİ (🅞, plandan okunamaz): plan "3 ✕ → bugün sus" diyordu,
   ama `TRN_TAVAN = 2` — aynı gün üç davetsiz açılış MEKANİK OLARAK
   İMKÂNSIZ; plan bu sayıyı bütçeyi görmeden yazmış. Doğru ölçü aynı gün
   değil ARDIŞIK rettir: üç kez üst üste kapatılan bir tören, bir tercihi
   söylüyordur. Sessizlik süresi 7 gün çünkü uygulamanın hafta ritmi zaten
   kurulu (09d/09h `lastSeenWeek`) — yeni bir ritim icat edilmedi.
════════════════════════════════════════════════════════════════════ */
const TRN_RET_ESIK    = 3;   // ardışık ✕ sayısı
const TRN_RET_SUS_GUN = 7;   // eşiğe varınca davetsiz açılışın susma süresi
const _RET_KEY = 'etw_trn_ret_v1';
const _retKey = () => `${_RET_KEY}_${(S.currentUser && S.currentUser.id) || 'anon'}`;

function _retOku() {
  try { return SafeStorage.get(_retKey(), null) || {}; } catch (_) { return {}; }
}
function _retYaz(defter) {
  try { SafeStorage.set(_retKey(), defter); } catch (e) { console.warn('trnRet:', e && e.message); }
}
/* TARİH ANAHTARI TUZAĞI ([[yerel-tarih-anahtari]]): burada `localDayKey()`
   KULLANILMAZ. O anahtar `${yıl}-${getMonth()}-${gün}` üretir — ay SIFIR
   TABANLI ve padding YOK (`2026-8-6`), yani ne ayrıştırılabilir ne
   sıralanabilir; `Date.parse` onu bir ay kaydırarak okur. 00a'nın kendi
   yorumu da bunu söylüyor: günlük "bugün oldu mu" kontrolleri
   `localISODate()` kullanmalı. Kuyruğun gün BÜTÇESİ hâlâ `localDayKey`
   ile karşılaştırılır (yalnız eşitlik sorar, aritmetik yapmaz) — ısrar
   defteri ise gün FARKI hesapladığı için ISO'ya muhtaçtır.
   Bu kırığı fazın kendi testi buldu, kod değil. */
function _gunFarki(a, b) {
  const ms = Date.parse(b) - Date.parse(a);
  return Number.isFinite(ms) ? Math.floor(ms / 86400000) : 0;
}

/** Kullanıcı töreni kapattı (✕ / perde). Ardışık sayaç artar. */
export function trnRet(ad) {
  if (!ad) return;
  const d = _retOku();
  const k = d[ad] || { n: 0, son: null };
  d[ad] = { n: (k.n || 0) + 1, son: localISODate() };
  _retYaz(d);
}

/** Kullanıcı töreni TAMAMLADI ya da kendi açtı — ısrar sayacı sıfırlanır.
 *  Tek bir kabul, üç retten ağır basar: mesele ceza değil ritim. */
export function trnKabul(ad) {
  if (!ad) return;
  const d = _retOku();
  if (!d[ad]) return;
  delete d[ad];
  _retYaz(d);
}

/** Bu tören davetsiz gelebilir mi — ısrar penceresi kapalı mı? */
function _israrAcik(ad) {
  const k = _retOku()[ad];
  if (!k || (k.n || 0) < TRN_RET_ESIK) return true;
  // Süre dolduysa defter temizlenir: sessizlik biter, sayaç sıfırdan başlar.
  if (k.son && _gunFarki(k.son, localISODate()) >= TRN_RET_SUS_GUN) {
    trnKabul(ad);
    return true;
  }
  return false;
}

function _tazele() {
  const bugun = (() => { try { return localDayKey(); } catch (_) { return null; } })();
  if (_gun !== bugun) { _gun = bugun; _sayac = 0; }
}

/* ─── 3. DIŞA AÇIK YÜZEY ─── */

/** Açık tören portalının id'si — yoksa null. DOM tek gerçek kaynaktır. */
export function trnAcikSahne() {
  try {
    for (const id of TRN_PORTAL) if (document.getElementById(id)) return id;
  } catch (_) {}
  return null;
}

/** Şu an herhangi bir sahne ya da kabuk akışı ekranı tutuyor mu? */
export function trnMesgul() {
  return !!trnAcikSahne() || _kabukMesgul();
}

/**
 * Sahne açılmadan önce sıra sorulur.
 * @param {string} ad  — sahnenin adı (teşhis için; portal id'si olması şart değil)
 * @param {{davetsiz?: boolean}} opt — `davetsiz:false` kullanıcının kendi
 *   açtığı tören demektir: sıra kontrolünden geçer ama BÜTÇEDEN DÜŞMEZ.
 *   Davet edilen misafir, davetsiz gelenlerin kotasını yemez.
 * @returns {boolean} true → aç; false → bu turda açma (tetik kendinde kalsın)
 */
export function trnIzin(ad, { davetsiz = true } = {}) {
  try {
    if (trnMesgul()) return false;
    if (davetsiz) {
      // Israr dozu (FAZ 17) — yalnız DAVETSİZ açılışı susturur; kullanıcının
      // kendi açtığı kapı (`davetsiz:false`) bu satıra hiç uğramaz.
      if (!_israrAcik(ad)) return false;
      _tazele();
      if (!TRN_ZORUNLU.has(ad)) {
        if (_sayac >= TRN_TAVAN) return false;
        const onc = TRN_ONCELIK[ad] ?? TRN_VARSAYILAN_ONCELIK;
        if (_sayac === TRN_TAVAN - 1 && onc > TRN_KORUMALI) return false;
      }
      _sayac++;
    }
    return true;
  } catch (_) {
    /* Kuyruk çalışmıyorsa sahneyi ENGELLEME: bu katmanın işi törenin
       ritmini korumak, töreni öldürmek değil (§5.2 "asla bloklama"). */
    return true;
  }
}

/** Teşhis/test yüzeyi — bütçenin o anki hâli. */
export function trnDurum() {
  _tazele();
  return { sayac: _sayac, tavan: TRN_TAVAN, acik: trnAcikSahne(), ret: _retOku() };
}

/** Yalnız testler ve gün dönüşü senaryoları için. */
export function trnSifirla() {
  _sayac = 0;
  _gun = null;
  try { SafeStorage.set(_retKey(), {}); } catch (_) {}
}

if (typeof window !== 'undefined') {
  Object.assign(window, { trnIzin, trnMesgul, trnAcikSahne, trnDurum, trnSifirla, trnRet, trnKabul });
}
