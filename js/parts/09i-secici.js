/* ═══════════════════════════════════════════════════════
   09i — SEÇİCİ · "Tutmak için değil, tanımak için sıralar"
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Dört platformun (Meta/YouTube/TikTok/X) tavsiye motorlarının kalbinde
     bir DEĞER MODELİ vardır: her aday için düzinelerce olasılık tahmin
     edip tek skora indirir. Onların amaç fonksiyonu P(kalır) — kullanıcıyı
     ekranda tutmak. Tanıma Motoru'nun amaç fonksiyonu P(tanındı): hangi
     kartın/davetin/kapının önce görüneceği, kullanıcı hakkında GERÇEKTEN
     bilinenin ne kadar taze, ne kadar bu oturuma uygun ve ne kadar
     yorulmuş olduğuna göre belirlenir — bağımlılığa göre değil.
     "Mesele algoritma değil — Mesele Sensin": seçici asla bir şey İCAT
     ETMEZ, yalnız zaten var olan kanıtı SIRALAR.

   MEKANİK / MİMARİ / TEK GİRİŞ:
     İki katman. ÇEKİRDEK (secAday/secSirala) SAFTIR — hiçbir modülün
     state'ine dokunmaz, hiçbir yerden okuma yapmaz. secAday(tur, id,
     girdiler) çağıranın topladığı ham sinyalleri (kanıt değeri+sayısı,
     son görülme zamanı, oturum teması, davete uyma, negatif sayaç,
     yorgunluk) TEK bir skora indirger; kanıtsız girdi (kokenOlc
     kapısından geçemeyen) aday listesine HİÇ GİRMEZ — 0 alıp sonda
     durmaz, doğmaz. secSirala(adaylar) azalan skorla dizer ve çeşitlilik
     kuralını uygular (aynı tür üst üste gelmez — X'in yazar çeşitliliği
     dersi).

     Değer modelinin şekli: kanıt × (tazelik · oturum · uyulma · negatif ·
     yorgunluk). Kanıt taban, gerisi onu ağırlıklandıran çarpanlardır —
     yani hiçbir davranış sinyali kanıtın yerini ALMAZ, yalnız sırasını
     değiştirir. Kanıt yoksa çarpanların hepsi 1 olsa bile aday yoktur.

     GİRDİ TOPLAYICI (secGirdiTopla) — FAZ 3'te BİLİNÇLİ yazılmamıştı
     ("girdiler çağırandan gelir, seçici kendisi okumaz" — o kararın
     gerekçesi hâlâ geçerli olan tek kısmı ÇEKİRDEĞE ilişkindi). FAZ 3+4
     denetimi (2026-08-09) bu ayrımı GİRDİ HAZIRLAMA için tersine çevirdi:
     üç çağıran (10q, 09a, 13o) aynı üç okumayı ayrı ayrı yazarsa biri
     değişince öbürleri sessizce eskir. secGirdiTopla(tur, id, ek) o tek
     köprüdür — S._oturumIzi'yi doğrudan okur, 09d'nin gün satırını
     `window.omGunSatiri()` üzerinden okur (09d'yi kimse import etmez
     kuralı burada da geçerli), 10q'nun eşik defterini `kkEsikDurum` ile
     doğrudan okur (10q, 09i'yi import ETMEZ — döngü yok, bkz. dosya
     başındaki import notu). `ek` çağıranın KENDİ ölçtüğü, buradan asla
     türetilemeyen alanları taşır (`deger`, `n` — kart hazırlığı/kanıtı
     yalnız 10q'nun kkMatchCard/kkEvidence'ında hesaplanır). Çekirdek
     SAF kalır: secGirdiTopla'nın okuduğu her şey secAday'e sıradan bir
     girdi nesnesi olarak girer, kapıyı yine kokenOlc kurar.

     BEYAN DEFTERİ (FAZ 7) — ölçümün üstündeki kat. Seçicinin bütün
     çarpanları bir ÇIKARIMdır: "geçtin, demek ki istemedin" der ve asla
     sıfırlamaz (SEC_NEGATIF_TABAN). Kullanıcı "daha az göster" dediğinde
     ise çıkarım değil BEYAN konuşur — ve beyan çıkarımı ezer: aday hiç
     doğmaz. Ayrı bir anahtarda (`etw_secici_v1_<uid>`) durmasının sebebi
     biçimsel değil epistemik: ölçüm defteri 09d'nin cap'ine tabidir,
     beyan hiçbir cap'e tabi olamaz. Susturma SÜRESİZ ama GERİ ALINABİLİR
     (secBeyanGeriAl) — sessiz bir zaman aşımı beyanı ölçüme çevirirdi;
     kararın sahibi zaman değil kullanıcıdır. Kazanım kapılarına
     DOKUNMAZ (K2): susturulan kart yine kazanılabilir, kapı daha seyrek
     çalınır.

     Kanıt kapısı: kokenOlc (13y) — deger/n eşiği geçmezse `null`. Tazelik:
     zamanAgirligi (00a) — 13l'in erdem çürümesiyle AYNI yardımcı (K5).
   Kalıcılık: SafeStorage per-uid `etw_secici_v1_<uid>` — YALNIZ kullanıcı
     beyanları ("daha az göster"). Skor, ölçüm ve sayaç burada DURMAZ;
     çekirdek (secAday/secSirala) hâlâ saf fonksiyondur.
   Konvansiyon: window.sec* expose; i18n/DOM yok (görünür yüzeyler 10q'da —
     "Neden bu?" paneli bu modülün verisini okur, metnini kendi yazar).
═══════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { kokenOlc } from './13y-koken.js';
import { zamanAgirligi, SafeStorage, localISODate } from './00a-infrastructure.js';
import { kkEsikDurum } from './10q-w2-kisi-karti.js';
import { getCardById } from './12b-kart-destesi.js';

const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) ? v : d);

/* ─── AĞIRLIK SABİTLERİ (FAZ 4 · 🅞 kalibrasyonu, 2026-08-09) ────────────
   Hepsi ÇARPAN — toplamsal ceza bilinçli reddedildi. Gerekçe: seçici
   çok-türlü sıralar (kart, davet, kapı) ve türlerin `deger` ölçeği ortak
   değildir; "−15 puan" bir türde ölümcül, ötekinde görünmezdir. Çarpan
   ölçekten bağımsızdır ve skorun birimi `deger`in birimi olarak kalır —
   "hazırlığı 60 olan kart, iki kez görmezden gelinince etkin 21'dir"
   cümlesi okunabilir kalsın diye.

   Asimetri kasıtlıdır (X'in Heavy Ranker dersi: ceza ödülden serttir):
   bir olumlu tepki ×1.25 (+%25), bir negatif ×0.6 (−%40) — negatifin
   etkisi olumlunun 1.6 katı. Wanderer'da bunun ayrı bir gerekçesi de var:
   yanlış bir daveti tekrarlamanın bedeli, doğru bir daveti geciktirmenin
   bedelinden ağırdır. ──────────────────────────────────────────────────── */

/** NEDEN: 13l erdem vektörüyle aynı ritim (K5 mirası, zamanAgirligi ortak
 *  yardımcı) — "şu an" tanımı motorlar arasında tutarlı olsun. */
const SEC_TAZELIK_YARI_OMUR_GUN = 7;

/** NEDEN: TikTok/YouTube dersi "oturum-içi uyum en güçlü sinyaldir".
 *  1.35 seçildi çünkü ~2.5 günlük tazelik farkını telafi eder: bu oturumun
 *  konusu öne çıkar ama haftalık kanıt birikimini EZMEZ. Daha yükseği
 *  (2.0) seçiciyi anlık hevesin peşine takardı — Wanderer'ın ölçüsü oturum
 *  değil yolculuktur. */
const SEC_OTURUM_CARPANI = 1.35;

/** NEDEN: X'in en güçlü dersi — her etkileşim eşit değildir; diyalog
 *  (cevaplanan davet, uyulan tören) bakıştan onlarca kat değerlidir.
 *  FAZ 2'nin topladığı `toren.muhur` ve `davet.cevap` bu çarpandan girer.
 *  Bileşik (1.25^n) ama TAVANLI: dördüncü tepkiden sonra artış durur —
 *  yoksa bir kez tutmuş bir aday sonsuza dek listenin başını tutar ve
 *  seçici kendi geçmişinin esiri olur. */
const SEC_OLUMLU_CARPAN = 1.25;
const SEC_OLUMLU_TAVAN  = 2.0;

/** NEDEN: bir GEÇ, bir tepkisiz gösterim, kapatılan bir tören. Her biri
 *  skoru %40 düşürür; üç negatif adayı pratikte dibe indirir (0.216).
 *  TABAN 0.1 bilinçli: aday SIFIRLANMAZ, çünkü kanıt hâlâ orada ve insan
 *  fikrini değiştirir — bugün geçtiğin kapı üç ay sonra tam sırasında
 *  olabilir. Kesin susturma yalnız kullanıcının BEYANIdır (FAZ 7,
 *  "Daha az göster"), ölçümün çıkarımı değil. */
const SEC_NEGATIF_FAKTOR = 0.6;
const SEC_NEGATIF_TABAN  = 0.1;

/** NEDEN: 10q4 `_davetIzi` kalıbı — art arda sorulan bir kapı yorgunluk
 *  biriktirir. Negatiften AYRI ve daha yumuşak (0.5 ağırlık, tek davette
 *  ×0.67): sormak bir hata değildir, yalnız tekrarı bezdirir. */
const SEC_YORGUNLUK_AGIRLIGI = 0.5;

/** NEDEN: TikTok dersi "ilgi hızla bayatlar" — yorgunluk da kendi çürümeli,
 *  yoksa bir kez sorulup geçilen aday sonsuza dek gömülür. Kısa yarı ömür
 *  (tazeliğin yarısından az) bilerek: yorgunluk unutulmalı, kanıt
 *  unutulmamalı. */
const SEC_YORGUNLUK_YARI_OMUR_GUN = 3;

/** NEDEN (FAZ 18, K10-K12, plan (b)): duygu okuması (13D `dgKapi`) bir
 *  ÇIKARIMdır, ölçüm değil — çıkarım olgunun üstüne çıkamaz. Ölçekteki en
 *  yumuşak mevcut çarpan `SEC_OTURUM_CARPANI` (1.35) bir OLGUdur (bu
 *  adayın konusu bu oturumda geçti); duygu ondan daha hafif kalmalı, 1.2
 *  yakın skorları yeniden dizmeye yeter ama gerçek bir olguyu ezmez.
 *  CEZA TARAFI YOKTUR (0.x çarpan yasak) — `SEC_NEGATIF_FAKTOR` (0.6) bir
 *  ÖLÇÜMÜN (geçti/kapattı/cevapsız bıraktı) karşılığıdır; duygu okuması
 *  çıkarımdır ve çıkarımın cezalandırma yetkisi yoktur (K4, §6.10):
 *  yanlış bir okuma kanıtla hak edilmiş bir kartı geri alınamaz biçimde
 *  gömerdi. Motor yanılırsa en fazla yanlış kartı biraz öne almış olur —
 *  bedeli bir tur. */
const SEC_DUYGU_CARPANI = 1.2;

/** Eksen → boyut eşlemesi (FAZ 18, plan tablosu (a)) — FAZ 6'nın register
 *  kartuşlarının kendi cümlelerinden OKUNUR, burada yeni bir anlam kararı
 *  İCAT EDİLMEZ. `taniklik`/`tutma` bilerek burada YOK: K7'nin sessiz
 *  eşliğinin, K9'un kriz üstünlüğünün tercihi olmaz (eşleşme yok → çarpan
 *  hep 1). Boyut adı `hisler`dir — `ek.dims` `kkMatchCard`'ın DIMS'inden
 *  gelir (10q `DIMS`, satır ~29); 10D'nin `CAT_KEYS`'i AYNI boyutu
 *  `duygular` diye adlandırır ve repoda bu köprü zaten kurulu
 *  (`ABSORB_MAP`, 02c-portre.js/10D-olmak-istedigin.js: `hisler → duygular`)
 *  — burada da aynı köprü okunur, yeni bir eşleme uydurulmaz. */
const SEC_DUYGU_BOYUT = {
  berraklik: 'dusunceler',
  kutlama: 'inanclar',
  sahiplenme: 'hisler',
  yatistirma: 'davranislar',
  diriltme: 'davranislar',
};

/* ─── 1. ADAY KURUCUSU — kanıt kapısı + bileşen birleştirme ─────────────
   girdiler şeması (FAZ 1+2 denetiminin ürettiği kaynaklarla eşleşir —
   bu alanların çoğu artık aşağıdaki secGirdiTopla tarafından S._oturumIzi
   / 09d gün satırı / 10q4 eşik defterinden ÇIKARILIR; `deger`/`n` istisna,
   onlar hâlâ çağırandan gelir çünkü kart hazırlığı yalnız 10q'da bilinir):
     deger            — temel ölçüm değeri (kokenOlc'un `deger`i)
     n                — kanıt sayısı (kokenOlc'un `n`i, eşik varsayılan 3)
     ts               — son görülme zaman damgası (tazelik)
     oturumEslesme    — bool: bu adayın KONUSU bu oturumda geçti mi. Dikkat:
                        aynı öğe değil, aynı tema — az önce açıp kapattığın
                        kartı tekrar öne sürmek uyum değil ısrardır (F1 izi)
     olumlu           — sayı: bu adayın davetine kaç kez uyuldu
                        (09d row.gezinme.toren[ad].muhur, row.davet.cevap)
     negatif          — sayı: bu adaya ait negatif sinyal sayısı
                        (row.neg.arac, tepkisiz gösterim, toren.kapat)
     yorgunlukSayisi  — sayı: kaç kez davet edildi (10q4 kkEsikDurum.davet)
     yorgunlukTs      — zaman damgası: son davet (10q4 kkEsikDurum.sonDavet)

   Skor bir OLASILIK değil bir SIRALAMA ağırlığıdır — kullanıcıya sayı
   olarak asla gösterilmez (gösterilseydi §6.10 gereği kökenini taşıması
   gerekirdi; o iş FAZ 7'nin "Neden bu?" yüzeyinde kanıt cümlesiyle yapılır,
   sayıyla değil). */
export function secAday(tur, id, girdiler) {
  const g = girdiler || {};
  // Beyan Kapısı (FAZ 7) — kanıt kapısından ÖNCE: kullanıcı "daha az göster"
  // dediyse bu adayın kanıtı ne kadar güçlü olursa olsun sıraya girmez.
  // Çarpanla değil dönüşle: en sert çarpan bile bir gün adayı tekrar başa
  // taşıyabilir; beyan bir ağırlık değil, bir karardır.
  if (g.beyanAzalt) return null;
  const kanit = kokenOlc(g.deger, g.n);
  if (kanit.v === null) return null; // Gerçeklik Kapısı — kanıtsız aday hiç doğmaz

  const tazelik = zamanAgirligi(g.ts, SEC_TAZELIK_YARI_OMUR_GUN);
  const oturumCarpani = g.oturumEslesme ? SEC_OTURUM_CARPANI : 1;
  const olumluCarpan = Math.min(
    SEC_OLUMLU_TAVAN,
    Math.pow(SEC_OLUMLU_CARPAN, Math.max(0, num(g.olumlu))),
  );
  const negatifFaktor = Math.max(
    SEC_NEGATIF_TABAN,
    Math.pow(SEC_NEGATIF_FAKTOR, Math.max(0, num(g.negatif))),
  );
  // Yorgunluk kendi yarı ömründe erir: aynı sayıda davet, aradan zaman
  // geçtikçe daha az bezdirir.
  const yorgunlukEtkisi = Math.max(0, num(g.yorgunlukSayisi))
    * zamanAgirligi(g.yorgunlukTs, SEC_YORGUNLUK_YARI_OMUR_GUN);
  const yorgunlukFaktoru = 1 / (1 + yorgunlukEtkisi * SEC_YORGUNLUK_AGIRLIGI);

  // Duygu (FAZ 18, K10-K12, plan (a)+(c)) — `g.duygu` yalnız `secGirdiTopla`
  // `dgKapi('secici', …)` doluysa doğar (ehliyet/ayrışma/tanık kapıda
  // uygulanmıştır, burada TEKRARLANMAZ). Yakınlık, adayın `g.dims`'te o
  // boyutta ÖLÇÜLMÜŞ bir değer taşımasına bağlıdır — boyut değeri
  // 0/eksikse (null > 0 de false'tur) yakınlık yoktur ve çarpan 1'de
  // kalır; taniklik/tutma'da boyut eşlemesi hiç yok, çarpan yine 1'dir.
  const dgBoyut = g.duygu ? SEC_DUYGU_BOYUT[g.duygu.eksen] : null;
  const dgDeger = (dgBoyut && g.dims) ? g.dims[dgBoyut] : null;
  const dgYakin = !!(dgBoyut && typeof dgDeger === 'number' && dgDeger > 0);
  const duyguCarpani = dgYakin ? SEC_DUYGU_CARPANI : 1;

  const skor = kanit.v * tazelik * oturumCarpani
    * olumluCarpan * negatifFaktor * yorgunlukFaktoru * duyguCarpani;

  // `bilesenler` FAZ 7'nin "Neden bu?" yüzeyi için: panel skoru DEĞİL,
  // skoru kuran çarpanların hangisinin konuştuğunu okur (1'den sapan
  // çarpan = söylenecek bir ölçüm var). Sayılar kullanıcıya ham hâlde
  // gösterilmez — hangi satırın hak edildiğini belirler.
  return {
    tur, id, skor, kanit,
    bilesenler: { tazelik, oturum: oturumCarpani, olumlu: olumluCarpan,
                  negatif: negatifFaktor, yorgunluk: yorgunlukFaktoru,
                  duygu: duyguCarpani },
  };
}

/* ─── 2. SIRALAMA — azalan skor + çeşitlilik kuralı ─────────────────────
   Boş/tanımsız girişte BOŞ liste döner (Sıfır Kanıt Sınavı: kanıtsız
   kullanıcıda aday listesi hiç doğmaz). null/undefined adaylar (secAday'in
   kanıtsız dönüşü) sessizce elenir — çağıranın filtrelemesi gerekmez. */
export function secSirala(adaylar) {
  const list = (adaylar || []).filter(Boolean);
  if (!list.length) return [];

  // Azalan skor; eşitlikte id'ye göre sabit sıra (determinizm — aynı girdi
  // aynı çıktı, JS'in kararsız sort'una bırakılmaz).
  const sirali = [...list].sort((a, b) => (b.skor - a.skor) || String(a.id).localeCompare(String(b.id)));

  // Çeşitlilik (X'in "yazar çeşitliliği" dersi): aynı tür art arda gelmez.
  // Açgözlü yerleştirme — skor sırasını olabildiğince korur; bir öncekiyle
  // AYNI türdeyse listenin ilerisinden farklı türden ilk adayı öne çeker.
  // Kalan adayların hepsi aynı türdeyse (alternatif yoksa) sıra bozulmaz.
  const kalan = [...sirali];
  const sonuc = [];
  while (kalan.length) {
    const sonTur = sonuc.length ? sonuc[sonuc.length - 1].tur : null;
    let idx = 0;
    if (kalan[0].tur === sonTur) {
      const alt = kalan.findIndex((a) => a.tur !== sonTur);
      if (alt > 0) idx = alt;
    }
    sonuc.push(kalan.splice(idx, 1)[0]);
  }
  return sonuc;
}

/* ─── 3. GİRDİ TOPLAYICI — FAZ 3+4 denetiminden gelen bağlayıcı karar ────
   secGirdiTopla'nın kendisi İMPURE'dür (S._oturumIzi/09d/10q okur) — bu
   yüzden yukarıdaki ÇEKİRDEK'ten ayrı bir bölümde durur. `ek` her zaman
   SON uygulanır: çağıranın kendi ölçtüğü `deger`/`n` burada asla
   üretilmez, yalnız devralınır. */

/** Bir kartın bu oturumda AYNI TEMADAN (erdem) açılıp açılmadığı — aynı
 *  ÖĞE değil (bağlayıcı karar 2, 2026-08-09). Az önce açıp kapattığın
 *  kartı tekrar öne sürmek uyum değil ISRARDIR: adayın KENDİSİ bu
 *  oturumda açıldıysa çarpan uygulanmaz, yalnız KARDEŞ bir erdem
 *  açıldıysa uygulanır. Kart 12b'de tanımlı değilse (araç/tören adayı)
 *  sessizce false — bu alan yalnız kart adayları için anlamlıdır. */
function _oturumTemaEslesme(cardId) {
  const izKartlar = S._oturumIzi?.kartlar;
  if (!izKartlar || !izKartlar.length) return false;
  const kendi = getCardById(cardId);
  if (!kendi || !kendi.virtue) return false;
  let kendisiAcildi = false, temaAcildi = false;
  for (const k of izKartlar) {
    if (!k || !k.id) continue;
    if (k.id === cardId) { kendisiAcildi = true; continue; }
    const c = getCardById(k.id);
    if (c && c.virtue === kendi.virtue) temaAcildi = true;
  }
  return !kendisiAcildi && temaAcildi;
}

/** `dgKapi('secici', …)` TEK kapıdır — `S._dgNabiz`/`S._dgIklim` burada
 *  DOĞRUDAN okunmaz (K10). Ctx aynı `_dgTorenOkuma` (13h-aksam-toreni.js)
 *  kalıbıdır — FAZ 17'nin doğurduğu `oncekiNabiz`/`zaman` alanları burada
 *  da kullanılır, ÜSTÜNE `ayristi` eklenir (FAZ 17'nin Durak'ı, plan (c)):
 *  modelin ikinci okuyucusu (K5) uygulamanın kararıyla AYNI GÜN çelişti mi.
 *  Dünkü bir ayrışma bugünün sıralamasını susturmaz — `localISODate` ile
 *  günü eşleştirmeden bir kapatma kararı vermek ölçmediği bir şeyi
 *  cezalandırırdı ([[yerel-tarih-anahtari]]: toISOString TR'de günü
 *  kaydırır). window köprüsü 13h/02d'nin zaten kullandığı konvansiyondur —
 *  okuma yoksa sessizce düş (§5.2). Ehliyet/tanık/tazelik kapıda uygulanır,
 *  burada tekrarlanmaz. */
function _dgSeciciOkuma() {
  try {
    const son = S._dgIklim?.modelOkuma?.son || null;
    const ayristi = !!(son && son.tarih === localISODate()
                       && son.uygulama && son.model !== son.uygulama);
    return window.dgKapi?.('secici', {
      nabiz: S._dgNabiz || null,
      oncekiNabiz: S._dgOncekiNabiz || null,
      iklim: S._dgIklim || null,
      zaman: S._dgNabizZaman || null,
      akis: { yon: S._dgYay, gecmis: S._dgSonKarsilama },
      ayristi,
    });
  } catch (e) { console.warn('dgSeciciOkuma:', e && e.message); return null; }
}

/** Girdi toplama TEK YERDE (FAZ 3+4 denetimi, bağlayıcı karar 1) — SEÇİCİYE
 *  aday sıralatan HER çağıran (FAZ 5'te yalnız 10q; sonraki fazlarda yeni
 *  yüzeyler eklenirse onlar da) aynı üç okumayı kendi dosyasında ayrı ayrı
 *  yazmaz, buraya tek satır çağrı bırakır. (09a/13o'nun "bu oturumda neye
 *  bakıldı" ihtiyacı FARKLI bir şeydir — bir SIRALAMA girdisi değil, LLM'e
 *  giden bir ÖZET metindir; onu `09a _buildOturumIziContext()` üretir ve
 *  bu fonksiyonu HİÇ çağırmaz, kendi başına S._oturumIzi okur.)
 *  `tur`+`id` 09d'nin gösterim/eşik defterleriyle AYNI anahtarlarla okunur
 *  (10q `omKaydetGosterim(tur, kartId)` ile aynı `tur` sözlüğünü kullanır:
 *  'spotlight' | 'emre' | 'bugunun_kisisi'). Okuma başarısızsa (kullanıcı
 *  yok, 09d henüz hidre olmadı) girdi eksik kalır — secAday eksik alanı
 *  0/"az önce" sayar, kanıt kapısını
 *  ETKİLEMEZ (kapı yalnız deger/n'e bakar, onlar `ek`ten gelir). */
export function secGirdiTopla(tur, id, ek) {
  const g = {};
  // Beyan (FAZ 7) — ölçümlerin ÜSTÜNDE ve aşağıdaki try'ın DIŞINDA: eşik
  // defteri ya da 09d okuması patlarsa geri kalan girdiler eksik kalabilir
  // (secAday onları 0 sayar, zararsız), ama susturma sızarsa kullanıcının
  // kararı sessizce iptal olur. Türden bağımsız okunur: bir kapı
  // susturulduysa spotlight'ta da keşif yuvasında da susar.
  g.beyanAzalt = secBeyanVar(id);
  try {
    g.oturumEslesme = _oturumTemaEslesme(id);

    // Yorgunluk + tazelik (10q4 kkEsikDurum kalıbı) — kart eşik havuzunda
    // henüz hiç sorulmamışsa 0/"az önce" (ts boş → zamanAgirligi tam
    // ağırlık verir, bkz. 00a). 10q4'ün üç-kapı reddi (`red[]`) beyan
    // edilmiş bir "henüz değil"dir — 09d'nin tespit ettiği TEPKİSİZ
    // gösterimden AYRI ama aynı ailede: ikisi de sırayı düşürür, kazanımı
    // ETKİLEMEZ (K2).
    const esik = kkEsikDurum(id);
    if (esik) {
      g.yorgunlukSayisi = esik.davet || 0;
      g.yorgunlukTs = esik.sonDavet || null;
      g.ts = esik.at || null;
      g.negatif = esik.red?.length || 0;
    }

    // 09d gün satırı (F2 defteri, İ2+İ3) — `gosterim[tur][id]` ÜÇ HÂLLİDİR
    // ve üçü de ayrı şey söyler; ikisini okuyup üçüncüsünü atlamak değer
    // modelinin yarısını kör bırakır:
    //   yok    → bu kart bugün hiç gösterilmedi. Sinyal YOK (varsayım da yok).
    //   false  → gösterildi, açılmadı. Tepkisiz gösterim = negatif (İ2).
    //   true   → gösterildi ve AÇILDI (omKaydetTepki). Davete uyulmuştur —
    //            X'in dersinin bizdeki karşılığı: bakış değil, dönüş (İ3).
    // 09d'yi kimse import etmez kuralı burada da geçerli.
    const row = (typeof window !== 'undefined' && window.omGunSatiri) ? window.omGunSatiri() : null;
    const bugun = row?.neg?.gosterim?.[tur];
    if (bugun && id in bugun) {
      if (bugun[id] === true) g.olumlu = (g.olumlu || 0) + 1;
      else g.negatif = (g.negatif || 0) + 1;
    }

    // Duygu (FAZ 18, K10-K12) — TEK kapı `_dgSeciciOkuma`; ehliyet/ayrışma/
    // tanık şartı orada uygulanır. Okuma null ise `g.duygu` hiç doğmaz —
    // "ehliyet olmadan ağırlık 0" böylece MEKANİKtir, tüketicinin
    // disiplinine bırakılmaz (plan (c)).
    const dgOkuma = _dgSeciciOkuma();
    if (dgOkuma) g.duygu = dgOkuma;
  } catch (_) { /* okuma başarısızsa girdi eksik kalır — çağıranın ek'i yeterlidir */ }
  return Object.assign(g, ek || {});
}

/* ─── 4. BEYAN DEFTERİ — "daha az göster" (FAZ 7, K7) ───────────────────
   Bu modülün TEK kalıcı verisi. Ölçüm defteriyle (09d) aynı yere
   yazılmamasının sebebi State/Veri bölümünde: ölçüm cap'lidir, beyan
   değildir — bir kullanıcının kararı, defter dolduğu için budanamaz. */

const SEC_KEY = (uid) => `etw_secici_v1_${uid || 'anon'}`;

/** { v:1, azalt: { [id]: { ts, tur } } } — `tur` kararın hangi yüzeyde
 *  verildiğini saklar (panel "bunu spotlight'ta söylemiştin" diyebilsin);
 *  susturmanın KAPSAMI id'dir, tür değil. */
let _beyan = null;

function _beyanDefault() { return { v: 1, azalt: {} }; }

function _beyanYukle() {
  try {
    const d = SafeStorage.get(SEC_KEY(S.currentUser?.id), null);
    if (d && typeof d === 'object' && d.v === 1) {
      _beyan = Object.assign(_beyanDefault(), d);
      if (!_beyan.azalt || typeof _beyan.azalt !== 'object') _beyan.azalt = {};
    }
  } catch (e) { console.warn('secBeyanYukle:', e && e.message); }
}

/** Lazy hidrasyon: secInit post-auth'ta erken yükler, ama beyan anon
 *  yüzeyde de verilebilir — ilk okuma/yazma diski kendi çeker. */
function _beyanState() {
  if (!_beyan) { _beyan = _beyanDefault(); _beyanYukle(); }
  return _beyan;
}

function _beyanKaydet() {
  try { if (_beyan) SafeStorage.set(SEC_KEY(S.currentUser?.id), _beyan); } catch (_) {}
}

/** Bu öğe kullanıcı tarafından susturuldu mu? */
export function secBeyanVar(id) {
  if (!id) return false;
  return !!_beyanState().azalt[id];
}

/** "Daha az göster" — beyanı kalıcı yazar. Döner: true (yazıldı). */
export function secBeyanAzalt(tur, id) {
  if (!id) return false;
  const b = _beyanState();
  b.azalt[id] = { ts: Date.now(), tur: tur || null };
  _beyanKaydet();
  return true;
}

/** Beyanı geri al — "yine göster". Süresiz susturmanın panzehiri zaman
 *  değil kullanıcıdır (bkz. banner). Döner: true (kayıt vardı ve silindi). */
export function secBeyanGeriAl(id) {
  const b = _beyanState();
  if (!id || !b.azalt[id]) return false;
  delete b.azalt[id];
  _beyanKaydet();
  return true;
}

/** Beyan kimliği — METİNDEN türer, indeksten DEĞİL (İç Çalışma 02 · E).
 *  Portre her damıtmada yeniden yazılır: 3. sıradaki değer yarın 1. sıraya
 *  geçebilir, o yüzden `portre-deger:3` gibi bir kimlik yanlış maddeyi
 *  susturur. Metin değişirse zaten YENİ bir iddiadır ve yeniden sorulmayı
 *  hak eder — beyanın kaçması burada doğru davranıştır.
 *  Tek kaynak burasıdır: yazan (09c) ile okuyan (09e) aynı anahtarı üretmeli. */
export function secBeyanId(tur, metin) {
  const t = String(tur || '').trim();
  const m = String(metin || '').trim().toLocaleLowerCase('tr').replace(/\s+/g, ' ').slice(0, 48);
  return (t && m) ? `${t}:${m}` : '';
}

/** Bir türün susturulmuş metinleri — damıtma "bir daha üretme" derken bunu
 *  okur (09e). Defter tek, tüketici çok. */
export function secBeyanListe(tur) {
  const onEk = String(tur || '') + ':';
  try {
    return Object.keys(_beyanState().azalt)
      .filter((k) => k.startsWith(onEk))
      .map((k) => k.slice(onEk.length));
  } catch (_) { return []; }
}

/* ─── 5. "NEDEN BU?" VERİSİ — şeffaflık yüzeyinin tek okuması ───────────
   Panelin (10q) ihtiyacı üç şey: hangi ölçümler konuştu (`girdi`), aday
   kanıt kapısını geçiyor mu (`aday`), kullanıcı bu kapıyı susturmuş mu
   (`beyan`). Metni burada ÜRETMEYİZ — 09i'nin i18n/DOM'u yoktur; hangi
   satırın söylenmeye HAKKI olduğunu veri belirler, cümleyi yüzey yazar.

   `beyanAzalt` bilerek bastırılır: susturulmuş bir öğenin paneli de
   açılabilmeli (kullanıcı kararını geri alacaksa oradan alır), yoksa
   "Yine göster" düğmesi hiçbir yerde görünmezdi. */
export function secNedenVeri(tur, id, ek) {
  const girdi = secGirdiTopla(tur, id, ek);
  const aday = secAday(tur, id, Object.assign({}, girdi, { beyanAzalt: false }));
  return { girdi, aday, beyan: secBeyanVar(id) };
}

/* ─── 6. INIT — 03-auth-shell post-auth zinciri ─────────────────────────
   FAZ 3'te bu yalnız TDZ-güvenli bir guard'dı (modül veri tutmuyordu);
   FAZ 7'de gerçek hidrasyonunu kazandı: beyan defteri SafeStorage'dan
   post-auth okunur. Guard boolean DEĞİL uid'dir — hesap değişince (farklı
   kullanıcı, "Sıfırdan Başla") defter de değişmeli; boolean guard eski
   kullanıcının beyanlarını yenisinin üstünde bırakırdı. */
let _secInitedUid = null;
export function secInit() {
  const uid = S.currentUser?.id;
  if (!uid || _secInitedUid === uid) return;
  _secInitedUid = uid;
  _beyan = null;      // yeni hesap → defter sıfırdan hidre olur
  _beyanYukle();
}

/* ── window expose (dosya sonu; TDZ-güvenli, minify-dayanıklı) ── */
if (typeof window !== 'undefined') {
  window.secAday = secAday;
  window.secSirala = secSirala;
  window.secGirdiTopla = secGirdiTopla;
  window.secNedenVeri = secNedenVeri;
  window.secBeyanVar = secBeyanVar;
  window.secBeyanAzalt = secBeyanAzalt;
  window.secBeyanGeriAl = secBeyanGeriAl;
  window.secBeyanId = secBeyanId;
  window.secBeyanListe = secBeyanListe;
  window.secInit = secInit;
}
