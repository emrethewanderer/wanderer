/* ═══════════════════════════════════════════════════════
   13y — KÖKEN MOTORU · "Her sayının bir kaynağı vardır"
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     "Mesele Sensin" tezi bir veri kuralı da doğurur: uygulama senin
     hakkında bir şey söylüyorsa, o şeyin kaynağı SEN olmak zorundasın.
     Uydurulmuş bir "öz sevgi: 50" yalnız yanlış bir sayı değil — tezin
     ihlalidir, çünkü o an mesele sen değil, algoritmanın varsayımıdır.

     Üç köken vardır, aralarında hiyerarşi değil farklı sorumluluk:
       · beyan — senin kendi elinle koyduğun. Doğrulama istemez.
       · olcum — uygulamanın davranışından saydığı. Kanıt sayısıyla (n)
                 birlikte anlamlıdır; n eşiğin altındaysa değer YOKTUR.
       · yorum — LLM'in ürettiği. Kaynak metne bağlanamıyorsa veri
                 değildir, atılır.
     Dördüncü hâl bir köken değil, kökensizliktir: 'yok'. Bu motorun
     bütün işi o hâli GÖRÜNÜR ve ZARARSIZ kılmaktır — çünkü bugüne dek
     kökensizlik `50` ve `0.6` gibi masum sayılarla gizleniyordu.

     ALINTI KESİNDİR (2026-08-02): kökensizlik bir eşiğin ARDINDA da
     saklanamaz. "0.6'nın altı düşer" demek, 0.6'nın üstündeki uydurmayı
     kabul etmek ve altındaki gerçeği atmaktır — ikisi de kabul edilemez.
     Model artık alıntıyı YAZMAZ, numaralı söz bloğunda GÖSTERİR; metni
     kaynaktan uygulama keser. Doğrulama tahmin değil, eşleştirmedir.

   MEKANİK / MİMARİ / TEK GİRİŞ:
     Her fonksiyon aynı şekli döndürür: { v, kaynak, n }. Değer YOKSA
     `v` daima null'dur — tüketici sayıyı gizler, yerine davet gösterir.
     Tek soru kokenVar(x)'tir: UI ve prompt kapısı bunu sorar.
     Motor saftır; hiçbir şeyi saklamaz, state'e yazan daima tüketicidir.
     Alıntı akışı: kokenSozBlok (prompt) → model `kanit_ref` → kokenAlintiCoz.

     Ölçüm eşiği (n >= 3) burada İCAT EDİLMEDİ — 09b-depth-foundations
     zaten bu eşiği uyguluyordu (signals_count kapıları); bu modül onun
     dağınık hâlini tek yere topladı.
   Kalıcılık: Kalıcılık yok (saf; kalıcılaştıran tüketicidir)
   Konvansiyon: window.koken* expose; stil yok (yüzeyi tüketici çizer)
═══════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage } from './00a-infrastructure.js';

/* ─── 1. SABİTLER ─── */

/** Tek seferlik temizliğin idempotent bayrağı (per-uid).
 *  v2 (2026-08-02): kapı kesinleşince (bulanık örtüşme → birebir alt-dize)
 *  v1'in geçirdiği parafraz kanıtlar artık geçersiz. v1 bayrağı yanmış
 *  kullanıcılarda temizlik bir daha koşmayacağı için anahtar yükseltildi;
 *  v1 anahtarı okunmaz — yeni kapı eskisinin işini de yeniden yapar.
 *  v3 (2026-08-02, aynı gün): temizliğin kapsamı 09a'nın yaşam hafızasını
 *  da içine aldı. v2 bayrağı yanmış kullanıcılarda zincir bir daha
 *  koşmayacağı için anahtar yine yükseltildi — eski bayraklar okunmaz. */
const TEMIZ_KEY = (uid) => `etw_koken_temiz_v3_${uid}`;

/** Temizliğin kanıt havuzu penceresi. Üretimde 7 gün yeter (yeni yorum taze
 *  sohbetten doğar) ama temizlik AYLAR önce yazılmış kayıtları yargılar —
 *  dar pencere, doğru kanıtı havuzda bulamayıp kaydı haksızca silerdi. */
const TEMIZLIK_GUN = 365;

/** Havuz bu sayıdan az cümle taşıyorsa temizlik ERTELENİR (bayrak da
 *  yakılmaz). Yeni bir cihazda ilk açılışta geçmiş sohbetler henüz hidre
 *  olmamış olabilir; o an temizlik koşsaydı kullanıcının bütün portresini
 *  "kanıtsız" sayıp silerdi. Veri kaybı geri alınamaz — kapı bu yüzden var. */
const TEMIZLIK_MIN_SOZ = 20;

/** Ölçümün anlamlı sayılması için gereken en az kanıt adedi.
 *  Kaynak: 09b-depth-foundations.js — `signals_count < 3` olan eksen
 *  ne prompt'a ne rapora giriyordu. O eşik artık tek yerde yaşıyor. */
export const KOKEN_ESIK = 3;

/** Prompt'a girecek söz bloğunun tavanları. Numaralı blok modelin
 *  "hangi cümle" sorusuna PARMAKLA cevap verebilmesi içindir; tavanlar
 *  günlük tek çağrının bütçesini korur. */
export const SOZ_BLOK_MAX = 14;
export const SOZ_BLOK_MAX_LEN = 180;

/** Kanıt olarak saklanacak kaynak cümlenin tavanı. Kırpılırsa sonuna
 *  '…' konur — kırpma kullanıcının kendi cümlesinden yapılır, modelin
 *  hatırladığından değil. */
const ALINTI_MAX_LEN = 160;

/** Serbest metin geri düşüşünde (ref yokken) bu sayıdan az anlamlı kelime
 *  taşıyan "kanıt" değerlendirilmez. Neden: tek kelimelik bir kanıt
 *  ("yorgunum") kaynakta tesadüfen geçer ve o cümleyi haksızca iddiaya
 *  bağlardı. Ref VARSA bu kapı aranmaz — model zaten parmakla göstermiştir. */
export const ALINTI_MIN_TOKEN = 2;

/** Anlamlı kelime tabanı: ALINTI_MIN_TOKEN sayımında bundan kısa parçalar
 *  sayılmaz — "ve bu" iki kelimedir ama iki kelimelik bir kanıt değildir. */
const MIN_KELIME_UZUNLUK = 3;

/* ─── 2. KÖKEN KURUCULARI ─── */

/** Kökensiz hâl — TEK üretim noktası. `v` daima null'dur; tüketici
 *  sayıyı gizler. n korunur, çünkü "hiç kanıt yok" ile "2 kanıt var
 *  ama 3 gerekiyordu" farklı hikâyelerdir (davet metni buna bakabilir). */
function _yok(n) {
  return { v: null, kaynak: 'yok', n: Number.isFinite(n) ? n : 0 };
}

/** Kullanıcının kendi eliyle koyduğu değer. En yüksek gerçeklik: beyan
 *  kendi kanıtıdır (n=1), doğrulanmaz. Boş beyan beyan değildir. */
export function kokenBeyan(deger) {
  if (deger === null || deger === undefined || deger === '') return _yok(0);
  return { v: deger, kaynak: 'beyan', n: 1 };
}

/** Davranıştan sayılan değer. n kanıt eşiğin altındaysa değer YOKTUR —
 *  burada varsayılan bir sayıya düşmek (eski `?? 50`) tam olarak bu
 *  motorun engellemek için var olduğu şeydir. */
export function kokenOlc(deger, n, esik = KOKEN_ESIK) {
  const adet = Number.isFinite(n) ? n : 0;
  const es = Number.isFinite(esik) ? esik : KOKEN_ESIK;
  if (adet < es) return _yok(adet);
  if (typeof deger !== 'number' || !Number.isFinite(deger)) return _yok(adet);
  return { v: deger, kaynak: 'olcum', n: adet };
}

/** LLM'in ürettiği yorum. Kanıt kullanıcının gerçek metinlerine
 *  bağlanamıyorsa değer YOKTUR — model uydurmuş olabilir ve uydurulmuş
 *  bir alıntı, uygulamanın kullanıcıya söyleyebileceği en ağır yalandır
 *  ("ben bunu söylemişim" sanır). */
export function kokenYorum(deger, kanit, kaynakMetinler) {
  if (deger === null || deger === undefined || deger === '') return _yok(0);
  if (!kokenAlinti(kanit, kaynakMetinler)) return _yok(0);
  return { v: deger, kaynak: 'yorum', n: 1, kanit: String(kanit).trim() };
}

/** UI ve prompt kapısının sorduğu TEK soru. Buradan false dönen hiçbir
 *  şey ne ekrana ne LLM bağlamına girer. */
export function kokenVar(x) {
  return !!(x && x.kaynak && x.kaynak !== 'yok' && x.v !== null && x.v !== undefined);
}

/** Düz bir KAYDIN kökeni var mı?
 *
 *  `kokenVar` bu motorun `{v, kaynak, n}` şekli içindir. 09a'nın yaşam
 *  hafızası gibi kayıtlar ise değeri metin taşır ve o şekle sokulmaz —
 *  09c paneli, tekilleştirme ve digest'ler düz nesneye bağlıdır; onları
 *  sarmalamak dördüncü bir sistem doğururdu. Soru aynı sorudur, yalnız
 *  şekli farklı: damgası var mı, ve o damganın arkasında kullanıcının
 *  kendi cümlesi duruyor mu. Buradan false dönen kayıt ne ekrana ne
 *  LLM bağlamına girer. */
export function kokenKayitVar(x) {
  return !!(x && x.kaynak && x.kaynak !== 'yok' && x.kanit);
}

/* ─── 3. ALINTI KAPISI ─── */

/** TR-duyarlı normalizasyon. `toLocaleLowerCase('tr')` şart: varsayılan
 *  küçültme 'I'yı 'i'ye çevirir ve "İSTEDİM"/"istedim" eşleşmesi kayar. */
function _norm(s) {
  return String(s == null ? '' : s)
    .toLocaleLowerCase('tr')
    .replace(/[‘’ʼ`´]/g, "'")   // eğik tırnakları düzle
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')         // noktalama → boşluk
    .replace(/\s+/g, ' ')
    .trim();
}

/** Anlamlı kelime sayımı — yalnız serbest metin geri düşüşünün
 *  ALINTI_MIN_TOKEN kapısı için. Örtüşme ARTIK HESAPLANMAZ. */
function _tokenlar(s) {
  const n = _norm(s);
  if (!n) return [];
  return n.split(' ').filter(w => w.length >= MIN_KELIME_UZUNLUK);
}

/** Kesin kapının tek testi: `parca`, `kaynak`ın içinde BİREBİR geçiyor mu?
 *  Normalizasyon yalnız yazım gürültüsünü siler (büyük/küçük harf,
 *  noktalama, eğik tırnak, çoklu boşluk) — kelimeyi değiştirmez. Yani
 *  "bulanık" değil "hoşgörülü": aynı cümlenin farklı yazımı geçer,
 *  farklı cümle geçmez. */
export function kokenIcerir(kaynak, parca) {
  const k = _norm(kaynak);
  const p = _norm(parca);
  if (!k || !p) return false;
  return k.includes(p);
}
/* Dosya içi kısa ad — kesin kapının her adımı bunu çağırır. */
const _icerir = kokenIcerir;

/** Kaynak cümleyi kanıt biçimine sokar — kırpma kullanıcının kendi
 *  metninden yapılır.
 *
 *  Dışa açık (2026-08-02): 09a'nın P6 kayıtları da kanıt taşımaya başlayınca
 *  ikinci bir kırpma yardımcısı doğacaktı. Tavan (ALINTI_MAX_LEN) değişirse
 *  iki yerde değişmesin diye kural burada tek kalır. */
export function kokenKirp(s) {
  const t = String(s == null ? '' : s).trim();
  return t.length > ALINTI_MAX_LEN ? t.slice(0, ALINTI_MAX_LEN - 1).trim() + '…' : t;
}

/** Kanıt gerçekten kullanıcının ağzından mı çıkmış?
 *  kanit          — "kanıt" diye verilen metin
 *  kaynakMetinler — kullanıcının kendi cümleleri (dizi ya da tek metin)
 *
 *  NOT: token kapısı (ALINTI_MIN_TOKEN) YALNIZ bu serbest-metin yolundadır.
 *  Referansla bağlanmış bir maddenin içindeki kısa bir parçayı ("12 Mayıs")
 *  kaynakta aramak isteyen çağıran `kokenIcerir`i doğrudan kullanır — orada
 *  ref zaten parmakla gösterilmiştir, token tabanı yanlış yere kapı kurardı.
 *
 *  ARTIK EŞİK YOK (2026-08-02, Emre'nin kararı). Eskiden bu fonksiyon
 *  kelime örtüşmesini bir orana çevirip `>= 0.6` diye soruyordu; o soru
 *  yapısı gereği bir ROC eğrisinde nokta seçmekti — hangi noktayı seçersen
 *  seç iki tür hatadan birini satın alıyordun ve "kalibre" sözcüğü bu
 *  satın almayı meşru gösteriyordu. Wanderer "ara sıra doğru"ya göre
 *  inşa edilmez: soru artık "gelmiş OLABİLİR Mİ" değil, "havuzda VAR MI".
 *  Cevabı bir sayı değil, evet/hayır. */
export function kokenAlinti(kanit, kaynakMetinler) {
  if (_tokenlar(kanit).length < ALINTI_MIN_TOKEN) return false;
  const list = Array.isArray(kaynakMetinler) ? kaynakMetinler : [kaynakMetinler];
  return list.some(m => _icerir(m, kanit));
}

/* ─── 3b. REFERANSLA ALINTI — "model yazmaz, gösterir" ─── */

/** Prompt'a girecek NUMARALI söz bloğu + referans haritası.
 *
 *  Bu numaralandırma bütün mimarinin döndüğü menteşedir: model kanıtı
 *  yazmak zorunda kalırsa doğruluğu ancak TAHMİN edilebilir, ama parmakla
 *  gösterebiliyorsa doğrulama eşleştirmeye iner. `[S3]` etiketi modelin
 *  "hangi cümle" sorusuna maliyetsiz cevap vermesini sağlar.
 *
 *  Dönüş: { blok, harita } — blok prompt'a girer, harita çözümde kullanılır. */
export function kokenSozBlok(sozler, opts = {}) {
  const max = Number.isFinite(opts.max) ? opts.max : SOZ_BLOK_MAX;
  const maxLen = Number.isFinite(opts.maxLen) ? opts.maxLen : SOZ_BLOK_MAX_LEN;
  const list = (Array.isArray(sozler) ? sozler : [])
    .map(s => String(s == null ? '' : s).trim())
    .filter(Boolean)
    .slice(-max);

  const harita = {};
  const satirlar = list.map((s, i) => {
    const ref = `S${i + 1}`;
    const kesik = s.length > maxLen ? s.slice(0, maxLen) : s;
    harita[ref] = kesik;   // haritada da KESİK durur — model neyi gördüyse o
    return `[${ref}] "${kesik}"`;
  });

  return { blok: satirlar.join('\n') || '-', harita };
}

/** Referansı normalize eder: `[S3]`, `s3`, ` S3 `, `3` → `S3`. Model
 *  etiketi süsleyebilir; sözleşmeyi biçim yüzünden kırmak, doğru bir
 *  kanıtı biçim hatası yüzünden düşürmek olurdu. */
function _refNorm(ref) {
  const m = String(ref == null ? '' : ref).trim().match(/(\d+)/);
  return m ? `S${m[1]}` : '';
}

/** Modelin gösterdiği referansı GERÇEK cümleye çevirir.
 *
 *  ref     — modelin `kanit_ref` alanı ("S3")
 *  kirpma  — modelin (varsa) yazdığı alıntı parçası; ÇAPRAZ KONTROLdür,
 *            kanıt metni olarak kullanılmaz
 *  harita  — kokenSozBlok'un döndürdüğü { S1: 'cümle' }
 *  sozler  — geri düşüş için ham cümleler
 *
 *  Dönüş: { alinti, ref } | null. Her adım KESİNdir — hiçbirinde eşik yok:
 *    1) ref geçerli ve kırpma onu doğruluyor (ya da kırpma hiç yok)
 *       → o cümle kanıttır.
 *    2) kırpma ref'i doğrulamıyor → havuzda BİREBİR aranır; bulunursa
 *       bulunduğu cümle kazanır (doğrulanabilir eşleşme, ref'ten üstündür).
 *    3) hiçbir yerde birebir bulunamadı ama ref GEÇERLİ → ref'in cümlesi
 *       kanıttır. Bu, modelin alıntıyı yeniden yazdığı (parafraz) hâldir:
 *       parmağı doğru cümlededir, yalnız cümleyi kendi kelimeleriyle
 *       aktarmıştır. Kırpmayı veto hakkı saymak, ref'in kurtarmak için var
 *       olduğu tam durumu öldürürdü — eski bulanık kapının "ara sıra doğru
 *       alıntıyı düşürme" kusuru buradan geri sızardı.
 *    4) ref de yok → null; madde sessizce düşer.
 *
 *  Kanıt DAİMA kaynaktan kesilir, modelin yazdığından değil: kullanıcı
 *  ekranda kendi cümlesini görür, modelin o cümleye dair hatırladığını
 *  değil. Mimarinin verdiği söz budur — uydurulmuş bir kullanıcı cümlesi
 *  hiçbir yoldan içeri giremez. */
export function kokenAlintiCoz(ref, kirpma, harita, sozler) {
  const h = harita && typeof harita === 'object' ? harita : {};
  const list = (Array.isArray(sozler) ? sozler : []).filter(s => typeof s === 'string');
  const parca = String(kirpma == null ? '' : kirpma).trim();

  const r = _refNorm(ref);
  const refMetin = r && h[r] ? h[r] : '';

  if (refMetin && (!parca || _icerir(refMetin, parca))) {
    return { alinti: kokenKirp(refMetin), ref: r };
  }

  if (_tokenlar(parca).length >= ALINTI_MIN_TOKEN) {
    const havuzListe = list.length ? list : Object.values(h);
    const bulunan = havuzListe.find(m => _icerir(m, parca));
    if (bulunan) return { alinti: kokenKirp(bulunan), ref: '' };
  }

  if (refMetin) return { alinti: kokenKirp(refMetin), ref: r };

  return null;
}

/* ─── 4. KAYNAK HAVUZU — "kullanıcı gerçekte ne dedi" ─── */

/** Kullanıcının kendi yazdığı ham mesajlar (son `days` gün).
 *  Alıntı kapısının doğruluk ölçüsü budur: LLM'in kanıtı buraya
 *  bağlanamıyorsa uydurulmuş sayılır.
 *
 *  TEK KAYNAK: 09d bu deseni önce yazmıştı (_recentUserMsgs) ve artık
 *  buraya delege eder — iki motorun iki ayrı "kullanıcı ne dedi" tanımı
 *  olması, tam da bu mimarinin engellemek istediği şeydir.
 *
 *  Aktif seans allSessions'a henüz yazılmamış olabilir; canlı chatHistory
 *  bu yüzden ayrıca taranır (bugünün cümleleri kanıt havuzunun dışında
 *  kalırsa bugün üretilen her yorum haksız yere düşerdi). */
export function kokenKullaniciMesajlari(days = 7) {
  const cutoff = Date.now() - days * 86400000;
  const out = [];
  try {
    Object.values(S.allSessions || {}).forEach((arr) => (arr || []).forEach((m) => {
      if (m?.role !== 'user' || typeof m.content !== 'string') return;
      const ts = m.created_at ? new Date(m.created_at).getTime() : NaN;
      if (!isNaN(ts) && ts >= cutoff) out.push({ ts, text: m.content });
    }));
    (S.chatHistory || []).forEach((m) => {
      if (m?.role !== 'user' || typeof m.content !== 'string') return;
      if (!out.some((x) => x.text === m.content)) out.push({ ts: Date.now(), text: m.content });
    });
  } catch (_) {}
  out.sort((a, b) => a.ts - b.ts);
  return out;
}

/** Kanıt havuzunun düz metin hâli — kokenAlinti'ye doğrudan verilir. */
export function kokenKullaniciSozleri(days = 7) {
  return kokenKullaniciMesajlari(days).map(m => m.text);
}

/* ─── 5. TEK SEFERLİK TEMİZLİK ─── */

/** Kanıta bağlanamayan ESKİ kayıtları siler — kullanıcı başına BİR kez.
 *  Emre'nin kararı (2026-08-01): bu kayıtlar arşivlenmez, silinir.
 *
 *  Silme geri alınamaz olduğu için üç koruma var:
 *    1) kanıt penceresi bir yıl (TEMIZLIK_GUN) — dar pencere doğru kaydı da silerdi
 *    2) havuz yetersizse hiç koşmaz VE bayrağı yakmaz (TEMIZLIK_MIN_SOZ)
 *    3) ne silindiği sayılır; sayım bayrağın içinde kalıcı olarak durur
 *
 *  Modüllere window köprüsüyle ulaşılır: 09d/09e "kimse bu modülü import
 *  etmez, tüm girişler window.* üzerinden" konvansiyonunu taşır. */
export function kokenTemizlik() {
  const uid = S.currentUser?.id;
  if (!uid) return null;

  try { if (SafeStorage.get(TEMIZ_KEY(uid))) return null; } catch (_) { return null; }

  const sozler = kokenKullaniciSozleri(TEMIZLIK_GUN);
  if (sozler.length < TEMIZLIK_MIN_SOZ) return null; // ertelenir — bayrak yanmaz

  const rapor = { deger: 0, celiski: 0, kisi: 0, kornokta: 0, hipotez: 0, oruntu: 0, fact: 0, loop: 0, date: 0, lmKisi: 0 };
  try { Object.assign(rapor, window.ypKokenTemizlik?.(sozler) || {}); } catch (_) {}
  try { Object.assign(rapor, window.omKokenTemizlik?.(sozler) || {}); } catch (_) {}
  /* 09a yaşam hafızası — havuz PARAMETRESİ ALMAZ: kapısı damganın kendisidir
     (bkz. p6KokenTemizlik). Alan adları da ayrıdır (`lmKisi`): rapor tek
     nesnede birleştiği için çakışan bir ad, iki temizlikten birinin
     sayısını sessizce siler. */
  try { Object.assign(rapor, window.p6KokenTemizlik?.() || {}); } catch (_) {}

  try { SafeStorage.set(TEMIZ_KEY(uid), { at: new Date().toISOString(), rapor }); } catch (_) {}

  const toplam = Object.values(rapor).reduce((a, b) => a + (b || 0), 0);
  if (toplam) console.warn('kokenTemizlik — kanıta bağlanamayan kayıt silindi:', rapor);
  return rapor;
}

/* ─── 6. WINDOW EXPOSE (TDZ-güvenli, minify-dayanıklı) ─── */
if (typeof window !== 'undefined') {
  window.kokenBeyan = kokenBeyan;
  window.kokenOlc = kokenOlc;
  window.kokenYorum = kokenYorum;
  window.kokenVar = kokenVar;
  window.kokenKayitVar = kokenKayitVar;
  window.kokenAlinti = kokenAlinti;
  window.kokenKirp = kokenKirp;
  window.kokenIcerir = kokenIcerir;
  window.kokenSozBlok = kokenSozBlok;
  window.kokenAlintiCoz = kokenAlintiCoz;
  window.kokenKullaniciSozleri = kokenKullaniciSozleri;
  window.kokenTemizlik = kokenTemizlik;
}
