/* ═══════════════════════════════════════════════════════
   13u — SÖZ DEFTERİ · verilen sözün hafızası
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Söz vermek bir andır; söz tutmak bir tarihtir. Günün Sözü'nün (10s)
     bugüne kadar hafızası yoktu — her sabah sıfırdan başlıyor, dün hangi
     sözün verildiği ve tutulup tutulmadığı sessizce kayboluyordu. Hafızası
     olmayan ritüel kullanıcıyı tanıyamaz; tanımayan ritüel "Mesele Sensin"
     diyemez. Bu defter sözün geçmişini taşır ki İhtiyaç Motoru (13v)
     yarının sözünü dünün dürüstlüğünden çıkarabilsin.
   MEKANİK / MİMARİ / TEK GİRİŞ:
     Tek yazar: 10s her glSave()'de sdSenkronla(ritus) çağırır → bugünün
     satırları idempotent yazılır. Defter gün dönmesini BEKLEMEZ; akşam
     hesabı kept alanını sonradan doldurduğunda da aynı satır güncellenir.
     Geri kalan yüzey salt-okunurdur (sdGecmis / sdTutmaOrani / sdSonSozler /
     sdSeri / sdSkipOrani / sdGunSayisi).
   Kalıcılık: SafeStorage per-uid (etw_soz_defteri_v1_<uid>) — kayan 90 gün
   ham kayıt + 24 aylık SAYIM özeti (pencereden düşen sözün metni gider,
   ölçüsü kalır: dönüşümün kıyası buradan kurulur)
   Konvansiyon: window.sd* expose; kullanıcıya görünen metin YOK (i18n gerekmez)
═══════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage, localISODate } from './00a-infrastructure.js';

const STORAGE_KEY = 'etw_soz_defteri_v1';

/* Kayan pencere: 90 gün yeter (motorun en uzun bakışı 21 gün).
   Gün başına en çok 3 satır → ~270 kayıt; sınır cömert tutuldu. */
const MAX_GUN = 90;
const MAX_KAYIT = 400;

/* AYLIK ÖZET — pencereden düşen sözün SAYIMI kalır, metni gitmesin diye değil,
   kıyas kurulabilsin diye: "ilk ayında dört sözden biri tutuluyordu, bu ay
   dördünden üçü." Ham pencereyi 400 güne çıkarmak da bir seçenekti ve
   REDDEDİLDİ: SafeStorage her yazımda tüm defteri Supabase KV'ye upsert eder,
   ~1200 kayıtlık bir defter her söz kaydında ~150KB ağ demekti. Özet 24 ay
   için ~1.5KB tutar. Sayım bir ÖLÇÜMdür (§6.10) — metin olmadan da dürüsttür. */
const MAX_AY = 24;

/* Varsayılan bakış pencereleri — motorun ölçüleri buradan okunur. */
const VARSAYILAN_PENCERE = 21;

function _key() { return `${STORAGE_KEY}_${(S.currentUser && S.currentUser.id) || 'anon'}`; }
function _default() { return { kayitlar: [], aylik: {}, updated: null }; }
function _bugun() { return localISODate(); }

/* ── Kalıcılık ── */
export function sdSave() {
  try {
    if (!S._sozDefteri) return;          // hidrasyondan önce çağrılırsa sessizce çık
    S._sozDefteri.updated = new Date().toISOString();
    SafeStorage.set(_key(), S._sozDefteri);
  } catch (e) { console.warn('sdSave:', e && e.message); }
}

export function sdLoad() {
  try {
    const data = SafeStorage.get(_key());
    if (data && typeof data === 'object' && Array.isArray(data.kayitlar)) {
      S._sozDefteri = Object.assign(_default(), data);
    }
  } catch (e) { console.warn('sdLoad:', e && e.message); }
}

export function sdInit() {
  if (!S._sozDefteri) S._sozDefteri = _default();
  sdLoad();
  // Hidrasyon sonrası bir kez buda — eski kurulumlardan taşan kayıt kalmasın.
  try { if (_buda()) sdSave(); } catch (_) {}
}

/** Aylık özeti ham kayıtlardan TÜRETİR — toplamaz, üzerine yazar.
 *
 *  İdempotens buradan gelir: aynı ham veri her koşuda aynı sayımı üretir,
 *  iki kez çağrılsa da rakam şişmez. Pencereden düşmüş ayların özeti son
 *  yazıldığı hâliyle donar (yayılma operatörü onları korur). */
function _aylikTuret(d) {
  const aylar = {};
  for (const k of d.kayitlar) {
    const ay = String((k && k.day) || '').slice(0, 7);          // YYYY-MM
    if (ay.length !== 7) continue;
    const a = aylar[ay] || (aylar[ay] = { v: 0, t: 0, a: 0 });   // verilen/tutulan/atlanan
    a.v++;
    if (k.kept === true) a.t++;
    else if (k.kept === false) a.a++;
  }
  const birlesik = { ...(d.aylik || {}), ...aylar };
  const anahtarlar = Object.keys(birlesik).sort();
  while (anahtarlar.length > MAX_AY) delete birlesik[anahtarlar.shift()];
  d.aylik = birlesik;
}

/* Kayan pencere budaması. Değişiklik yaptıysa true döner (gereksiz yazma yok). */
function _buda() {
  const d = S._sozDefteri;
  if (!d || !Array.isArray(d.kayitlar) || !d.kayitlar.length) return false;
  const onceki = d.kayitlar.length;
  const oncekiAylik = JSON.stringify(d.aylik || {});
  // Özet BUDAMADAN ÖNCE türetilir: düşecek günlerin sayımı da özete girsin.
  _aylikTuret(d);
  // Gün bazlı pencere: en yeni MAX_GUN günü tut.
  const gunler = [...new Set(d.kayitlar.map(k => k.day))].sort();
  if (gunler.length > MAX_GUN) {
    const tutulacak = new Set(gunler.slice(-MAX_GUN));
    d.kayitlar = d.kayitlar.filter(k => tutulacak.has(k.day));
  }
  // Kayıt bazlı emniyet supabı (bozuk veri gün başına onlarca satır üretmişse)
  if (d.kayitlar.length > MAX_KAYIT) d.kayitlar = d.kayitlar.slice(-MAX_KAYIT);
  return d.kayitlar.length !== onceki || JSON.stringify(d.aylik || {}) !== oncekiAylik;
}

/* ════════════════════════════════════════════════════════════════════
   YAZMA — tek giriş: 10s'in ritüel kaydı
════════════════════════════════════════════════════════════════════ */
/**
 * Bugünün ritüel kaydını deftere işler (idempotent).
 * Aynı güne ait eski satırlar silinip yenileri yazılır — akşam hesabı
 * `kept` alanını sonradan doldurduğunda satır güncellenmiş olur.
 * @param {object} ritus S._gunlukRitus biçimi: {date, pledges[], skipped}
 */
export function sdSenkronla(ritus) {
  try {
    if (!S._sozDefteri) S._sozDefteri = _default();
    const day = ritus && ritus.date;
    if (!day || typeof day !== 'string') return;

    const pledges = Array.isArray(ritus.pledges) ? ritus.pledges : [];
    const yeni = [];

    if (pledges.length) {
      pledges.forEach(p => {
        if (!p || !p.domain) return;
        yeni.push({
          day,
          domain: String(p.domain),
          key: p.key || null,                 // banka anahtarı (FAZ 1+ dolar)
          text: String(p.text || ''),
          source: p.source || 'banka',        // banka | tohum | terzi | user
          kept: (typeof p.kept === 'boolean') ? p.kept : null,
          reason: p.reason || null,           // FAZ 4: "neden tutamadım"
        });
      });
    } else if (ritus.skipped) {
      // Atlanan gün de veridir: sözden kaçınma motorun okuduğu bir sinyaldir.
      yeni.push({ day, domain: null, key: null, text: '', source: 'skip', kept: null, reason: null });
    }

    // Söz henüz verilmemiş ve atlanmamışsa yazacak bir şey yok.
    if (!yeni.length) return;

    const d = S._sozDefteri;
    d.kayitlar = d.kayitlar.filter(k => k && k.day !== day).concat(yeni);
    d.kayitlar.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
    _buda();
    sdSave();
  } catch (e) { console.warn('sdSenkronla:', e && e.message); }
}

/* ════════════════════════════════════════════════════════════════════
   OKUMA — İhtiyaç Motoru'nun (13v) beslendiği yüzey
════════════════════════════════════════════════════════════════════ */
function _kayitlar() {
  try { return (S._sozDefteri && Array.isArray(S._sozDefteri.kayitlar)) ? S._sozDefteri.kayitlar : []; }
  catch (_) { return []; }
}

/** Pencere içindeki satırlar (bugünden geriye `gun` gün). filter → yeni dizi:
 *  çağıranlar sonucu güvenle ters çevirebilir, defteri bozmaz. */
function _pencere(gun) {
  const sinir = new Date();
  sinir.setDate(sinir.getDate() - (Math.max(1, gun | 0) - 1));
  const alt = localISODate(sinir);
  return _kayitlar().filter(k => k && k.day >= alt);
}

/** Son `gun` günün kayıtları — yeniden eskiye. */
export function sdGecmis(gun = 30) {
  return _pencere(gun).reverse();
}

/**
 * Tutma oranı 0..1 — hüküm verilmiş (kept true/false) satırlar üzerinden.
 * Veri yoksa null döner; "bilmiyorum" ile "kötü" birbirine karışmasın.
 */
export function sdTutmaOrani(domain = null, gun = VARSAYILAN_PENCERE) {
  const rows = _pencere(gun).filter(k =>
    typeof k.kept === 'boolean' && (!domain || k.domain === domain));
  if (!rows.length) return null;
  return rows.filter(k => k.kept).length / rows.length;
}

/** Sözün atlandığı günlerin oranı 0..1 (kaçınma sinyali). Veri yoksa null. */
export function sdSkipOrani(gun = VARSAYILAN_PENCERE) {
  const rows = _pencere(gun);
  if (!rows.length) return null;
  const gunler = [...new Set(rows.map(k => k.day))];
  if (!gunler.length) return null;
  const skipGun = gunler.filter(g => rows.some(k => k.day === g && k.source === 'skip'));
  return skipGun.length / gunler.length;
}

/**
 * Son verilen sözler — tekrar önleme için. Skip satırları hariç.
 * @returns {{key:string|null, text:string, day:string, domain:string}[]}
 */
export function sdSonSozler(n = 14) {
  return _pencere(MAX_GUN)
    .filter(k => k.source !== 'skip' && (k.text || k.key))
    .slice(-n).reverse()
    .map(k => ({ key: k.key, text: k.text, day: k.day, domain: k.domain }));
}

/**
 * Ardışık seri — en yeni hükümden geriye. Mertebe histerezisi bunun üstüne
 * kurulur: tutulan seri yükseltir, kırık seri indirir.
 * DİKKAT: "ardışık" burada takvim günü değil, ardışık HÜKÜM demektir —
 * kullanıcı her gün söz vermek zorunda değil; söz vermediği gün seriyi
 * kırmaz, yalnız hükümler zinciri sayılır (ceza değil, ölçü).
 * @returns {{tutulan:number, kirik:number}}
 */
export function sdSeri(domain = null) {
  const rows = _pencere(MAX_GUN)
    .filter(k => typeof k.kept === 'boolean' && (!domain || k.domain === domain));
  if (!rows.length) return { tutulan: 0, kirik: 0 };

  // Gün gün geriye: aynı günde birden çok alan varsa çoğunluk hükmü geçerli.
  const gunler = [...new Set(rows.map(k => k.day))].sort().reverse();
  const hukum = g => {
    const gr = rows.filter(k => k.day === g);
    const tut = gr.filter(k => k.kept).length;
    return tut * 2 >= gr.length;   // yarısı ve fazlası tutulduysa o gün "tutuldu"
  };

  const ilk = hukum(gunler[0]);
  let sayi = 0;
  for (const g of gunler) { if (hukum(g) !== ilk) break; sayi++; }
  return ilk ? { tutulan: sayi, kirik: 0 } : { tutulan: 0, kirik: sayi };
}

/* Bir ayın oranının konuşabilmesi için gereken en az hüküm sayısı. Tek
   sözden "yüzde yüz tutuyorsun" çıkarmak ölçüm değil, gürültüdür. */
const MIN_KIYAS_HUKUM = 3;

/** İLK AY ↔ SON AY: sözün tutulma oranının kıyası — dönüşümün en somut
 *  ölçüsü. Aylık sayım özetinden okur (ham pencere 90 günde biter, özet 24
 *  ay yaşar). Kanıt yetmezse `null`: iki AYRI ay ve her birinde en az
 *  {@link MIN_KIYAS_HUKUM} hüküm aranır.
 *  @returns {{ilk:{ay,verilen,tutulan,oran}, son:{...}}|null} */
export function sdOranKiyas() {
  try {
    const aylik = (S._sozDefteri && S._sozDefteri.aylik) || {};
    const aylar = Object.keys(aylik)
      .filter(a => ((aylik[a].t || 0) + (aylik[a].a || 0)) >= MIN_KIYAS_HUKUM)
      .sort();
    if (aylar.length < 2) return null;
    const yap = (ay) => {
      const o = aylik[ay];
      const hukum = (o.t || 0) + (o.a || 0);
      return { ay, verilen: o.v || 0, tutulan: o.t || 0, oran: hukum ? (o.t || 0) / hukum : null };
    };
    return { ilk: yap(aylar[0]), son: yap(aylar[aylar.length - 1]) };
  } catch (_) { return null; }
}

/** Aylık sayım özetinin ham hâli — eskiden yeniye `[{ay, verilen, tutulan,
 *  atlanan, oran}]`. Kanıtsız aylar (hiç hüküm yok) `oran: null` taşır. */
export function sdAylikSeri() {
  try {
    const aylik = (S._sozDefteri && S._sozDefteri.aylik) || {};
    return Object.keys(aylik).sort().map(ay => {
      const o = aylik[ay];
      const hukum = (o.t || 0) + (o.a || 0);
      return {
        ay, verilen: o.v || 0, tutulan: o.t || 0, atlanan: o.a || 0,
        oran: hukum >= MIN_KIYAS_HUKUM ? (o.t || 0) / hukum : null,
      };
    });
  } catch (_) { return []; }
}

/** Defterin tuttuğu farklı gün sayısı — motorun olgunluk girdisi. */
export function sdGunSayisi() {
  return new Set(_kayitlar().map(k => k.day)).size;
}

/* ════════════════════════════════════════════════════════════════════
   MERTEBE — sözün ağırlığı
   ───────────────────────────────────────────────────────────────────
   Histerezisli: tek gün savurmaz. Üç tutulan söz yükseltir, iki kırık
   indirir. Kullanıcıya SAYAÇ DİLİYLE anlatılmaz ("3/5 tuttun" yasak) —
   mertebe sözün kendi ağırlığında görünür. Küçülmek ceza değil ölçüdür:
   "Küçük olan, tutulan olsun."
════════════════════════════════════════════════════════════════════ */
const MERTEBE_YUKSELIS = 3;
const MERTEBE_INIS = 2;
/* Günlerin yarıdan çoğunda söz atlanıyorsa söz küçülür (kaçınma sinyali). */
const KACINMA_ESIGI = 0.5;

/**
 * "Tutamadım" gerekçesi — YALNIZ en son hüküm gününde verilmişse geçerli.
 * Aksi hâlde aylar önce bir kez "fazla büyüktü" diyen kullanıcı, o günden
 * beri sözünü tutuyor olsa bile sonsuza dek küçük mertebede kalırdı.
 */
function _sonSebep(domain) {
  try {
    const rows = _pencere(MAX_GUN)
      .filter(k => typeof k.kept === 'boolean' && (!domain || k.domain === domain));
    if (!rows.length) return null;
    const sonGun = rows[rows.length - 1].day;
    const sebepli = rows.filter(k => k.day === sonGun).find(k => k.reason);
    return sebepli ? sebepli.reason : null;
  } catch (_) { return null; }
}

/**
 * @returns {'dokunus'|'adim'|'esik'} dokunuş: söz küçülür · adım: varsayılan ·
 * eşik: söz daha somut/talepkâr olur.
 */
export function sdMertebe(domain = null) {
  try {
    const seri = sdSeri(domain);
    if (seri.kirik >= MERTEBE_INIS) return 'dokunus';
    // Kullanıcı "fazla büyüktü" dediyse tek seferde de olsa küçültmeyi hak
    // eder — kendi beyanı seriden daha ağır tanıktır.
    if (_sonSebep(domain) === 'buyuk') return 'dokunus';
    // Sözü sürekli atlamak da bir cevaptır: söz ağır geliyor olabilir.
    // Kaçınma hüküm bırakmaz (kept null), bu yüzden seriye hiç yansımaz —
    // ölçüye ancak buradan girer.
    const skip = sdSkipOrani();
    if (typeof skip === 'number' && skip > KACINMA_ESIGI) return 'dokunus';
    if (seri.tutulan >= MERTEBE_YUKSELIS) return 'esik';
    return 'adim';
  } catch (_) { return 'adim'; }
}

/* ── window expose (TDZ-güvenli, minify-dayanıklı) ── */
if (typeof window !== 'undefined') {
  window.sdSenkronla = sdSenkronla;
  window.sdGecmis = sdGecmis;
  window.sdTutmaOrani = sdTutmaOrani;
  window.sdOranKiyas = sdOranKiyas;   // ilk ay ↔ son ay (Dönüşüm Aynası)
  window.sdAylikSeri = sdAylikSeri;
  window.sdSkipOrani = sdSkipOrani;
  window.sdSonSozler = sdSonSozler;
  window.sdSeri = sdSeri;
  window.sdGunSayisi = sdGunSayisi;
  window.sdMertebe = sdMertebe;
  window.sdInit = sdInit;
}
