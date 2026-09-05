/* ═══════════════════════════════════════════════════════
   13D — DUYGU MOTORU · Nabız + İklim + Karşılama
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     "Duygu söylenmez, davranılır." Uygulama bugüne dek duyguyu
     ETİKETLİYORDU — bir kelime yakalayıp köşeye "neutral" ya da sabit bir
     yoğunluk basıyordu. Ama "Mesele Sensin" bir ölçüm kuralı da doğurur:
     kanıt yoksa uygulama SESSİZ KALIR, uydurulmuş bir "nötr" duygu
     iddia etmez. Bu motorun tek işi bir turun duygusal nabzını —
     değerini (olumlu/olumsuz), kuvvetini (0..4) ve kanıtını (kullanıcının
     kendi cümlesi) — çıkarmak, kullanıcının kalıcı duygusal parmak izini
     (İklim) tutmak ve ikisinden bir KARŞILAMA kararı üretmektir: ne
     söylenmesi gerektiği artık bu motorun işidir, sözü/ritmi/bedeni
     sonraki fazlar (5-8) giydirir.

     On duygu ailesi kitaptan değil davranıştan seçildi: değer×kuvvet
     düzleminin dört bölgesini de kapsarlar. `umut` denetimde eklendi —
     eski P2 sözlüğünde vardı (`hope`) ve kitabın lapis ekseni odur;
     ailelerden düşseydi motor umudu göremez olurdu. En kritik olanı
     `donukluk`tur
     — negatif ama DÜŞÜK kuvvetli tek aile. Onu ayırt etmeyen bir sözlük
     umutsuzluğu sakinlik sanır; bu motor o hatayı taban tablosuna
     gömerek engeller.

     Yanlış okumanın maliyeti simetrik değildir: sevinci acı sanmak
     utandırır, acıyı sevinç sanmak YARALAR (K6). Bu yüzden karşılama
     tablosu belirsizlikte hep aynı yere düşer — tanıklık, hiçbir hâlde
     zarar vermeyen tek eksen. Kriz üstündür ve müzakere edilmez (K9):
     Emniyet Katmanı'nın tek satırına dokunulmaz, duygu motoru onun
     ALTINDA durur, yanında değil.

   MEKANİK / MİMARİ / TEK GİRİŞ:
     `dgNabiz(metin, opts)` tek turun ölçümüdür: sözlük eşleşmesi (aile
     başına ilk eşleşme) → olumsuzlama penceresi (iki yanda ikişer
     belirteç, KENDİ cümleciğiyle sınırlı) → pekiştirici/noktalama
     düzeltmesi → en güçlü aday baskın gelir → `opts.iklim` verilmişse
     mutlak kuvvet İklim'in kendi tabanına göre GÖRECELİ kuvvete çevrilir
     (K4). Kanıt yoksa `null` döner — asla nesne değil, asla "nötr"
     iddiası değil (§6.10). `dgYay(nabizlar)` son 3 nabzın kuvvet eğrisini
     okur (yükselen/düşen/duran).

     `dgIklim*` ailesi kullanıcının kalıcı duygusal parmak izini tutar:
     kendi tabanı (kuvvet dağılımı), lehçesi (bu kişi hangi kelimeyi hangi
     aile için kullanıyor — `dgLehceDuzelt` ile BEYANLA düzeltilir, FAZ 14),
     karşılama defteri (FAZ 10'da dolduruldu) — SafeStorage per-uid, tek
     anahtar, post-auth `dgInit()` ile hidre olur.
     `dgBeyan*` ailesi (FAZ 11) İklim'in DÖRDÜNCÜ okuma yüzeyidir: "beni
     yanlış okudun" jesti bir ekseni `iklim.beyan[eksen]='sus'` ile
     susturur — `dgKarsilama` bunu zaten okuyordu (K6 takas), burada yalnız
     YAZAN/GERİ ALAN taraf açıldı.

     `dgIsabet*` ailesi (K11, FAZ 14) motorun kendi EHLİYETİNİ ölçer: günün
     ölçülen değeri (nabzın `deger`i) kullanıcının kapanış töreninde beyan
     ettiği 1-10 skoruyla (mood_history) YÖN olarak örtüşüyor mu —
     `dgIsabetGuncelle` bu tek karşılaştırmayı `isabet:{n,uyum,son}`e online
     ortalamayla işler. Pahalı yüzeyler (`secici`, `push`) `dgIsabetYeterli`
     `false` döndüğü sürece `dgKapi` içinde YAPISAL olarak kapalı kalır —
     modelin kendi güven sayısı gibi uydurulmuş bir eşik değil (K4), kanıtı
     kullanıcının kendi rakamıdır.

     `dgKarsilama(metin, nabiz, iklim, akis)` K2'nin dokuz sıralı kuralını
     uygular (ilk tutan kazanır), K9 kriz üstünlüğünü (window.detectCrisis
     köprüsüyle — 13-extras'ı STATİK import ETMEZ, aynı döngüsel-bağımlılık
     endişesiyle o dosyanın kendi belgelediği desen, satır ~1439), İklim
     düzeltmesini (susturulmuş/negatif eksen bir sıra düşer, K6'nın en
     güvenli ekseni olan tanıklığa) ve tekrar cezasını (aynı eksen 3 tur
     üst üste → çeşitlilik dürtmesi, 13v `TEKRAR_PENCERESI` emsali) işler.

     `dgKapi(yuzey, ctx)` (FAZ 13, K10) TEK kapıdır: duyguya dokunan HER
     tüketici — sohbet dahil — buradan geçer, `dgNabiz`/`dgKarsilama`'yı
     doğrudan çağırmaz. Hata sohbette bir tur sürer ama kartta kalıcı,
     bildirimde üstelik eskimiştir — kanıt eşiği bu yüzden yüzeye göre
     değişir: tanık sayısı (aynı cümleden iki eşleşme tek tanıktır),
     tazelik yarı-ömrü (anlık/gün/90dk), ayrışma sükûtu (K5'in ikinci
     okuyucusu çelişince pahalı yüzey susar), ehliyet (K11, FAZ 14 —
     `dgIsabetYeterli` yetersizse `secici`/`push` yapısal olarak kapalı
     kalır; `ctx.ehliyetVar` açıkça verilirse onu ezer — dikiş yeri geriye
     dönük uyumlu kalsın diye) ve BEŞİNCİ kadran, yanılma (K13, FAZ 15 —
     `dgYanilmaKapali` eşiği aşan yüzeyi geri çeker; `sohbet` bu kadrana
     hiç uğramaz, erken return'de kapıdan çıkar).

     `dgYanilma*` ailesi (K13, FAZ 15) motorun kendi HATA oranını ölçer —
     K11'in isabeti "genel okuma yeteneği ne kadar doğru" sorusuna,
     `dgYanilma*` "BU yüzeyde kaç kez geri çevrildi" sorusuna bakar.
     `dgYanilmaKonustu`/`dgYanilmaDuzeltildi` saf yazıcılardır (kaydeden
     çağırandır), defter kayan penceredir (kümülatif DEĞİL — kapanmanın
     affı olmalı), `dgYanilmaOran` köken-kapılı gösterir, `dgYanilmaKapali`
     `dgKapi`nin beşinci kadranını besler.

     Saf fonksiyonlardır: state okumazlar (parametreden alırlar), hidrasyon
     ya da boot beklemezler — kalıcılaştıran/hidre eden yalnız `dgInit`,
     `dgIklimYukle`, `dgIklimKaydet`'tir.
   Kalıcılık: SafeStorage per-uid (etw_dg_iklim_v1_<uid>) — İklim; Nabız/
     Karşılama saf ve state'siz, kalıcılaştıran tüketicidir.
   Konvansiyon: dp() ile dil-duyarlı ÖLÇÜM sözlüğü (16c), p() ile dil-duyarlı
     GEREKÇE/eksen metni (16b/16e — FAZ 11'den beri); window.dg* expose; stil yok
═══════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { dp, dpTest, dpNormalizeKonum, p } from './16-i18n-prompts.js';
import { kokenKirp, kokenOlc, kokenVar } from './13y-koken.js';
import { SafeStorage, localISODate } from './00a-infrastructure.js';

/* ─── 1. TAKSONOMİ — on duygu ailesi (sözleşme, plan tablosu) ─── */

/** Değer: −2..+2 (olumsuz…olumlu). Taban kuvvet: 0..4 (mutlak, bu fazda).
 *  `donukluk` ve `huzur` bilinçli olarak taban=1 — düşük kuvvet ile
 *  negatif/pozitif değeri AYNI ANDA taşıyabildiklerini kanıtlar. */
export const DG_AILELER = {
  keder:       { deger: -1, kuvvet: 2 },
  yalnizlik:   { deger: -1, kuvvet: 2 },
  utanc_suclu: { deger: -2, kuvvet: 3 },
  ofke:        { deger: -1, kuvvet: 4 },
  kaygi:       { deger: -1, kuvvet: 4 },
  donukluk:    { deger: -1, kuvvet: 1 },
  karisiklik:  { deger:  0, kuvvet: 2 },
  sevinc:      { deger:  2, kuvvet: 3 },
  umut:        { deger:  1, kuvvet: 2 },
  huzur:       { deger:  1, kuvvet: 1 },
};

const _klamp = (n, min, max) => Math.min(max, Math.max(min, n));

/* ─── 2. ÖLÇÜM — sözlük eşleşmesi, olumsuzlama penceresi, pekiştirici ─── */

/** Basit belirteç ayıracı — morfolojik çözümleyici DEĞİL, olumsuzlama
 *  penceresi için "sonraki 3 belirteç"i çıkarır. */
function _belirtecler(s) {
  // Düz kesme işareti (') AYRAÇ DEĞİL — "don't/isn't" gibi EN kısaltmalar
  // parçalanırsa detect.olumsuzlama'nın /n't/ deseni asla eşleşmez.
  return String(s || '').split(/[\s,.;:!?…()"“”]+/).filter(Boolean);
}

/* CÜMLECİK SINIRI — olumsuzlama yalnız KENDİ cümleciğinde geçerlidir.
   Denetimde (2026-08-29) iki canlı yanlış-çevirme bulundu, ikisi de sınır
   yokluğundandı: "I'm sad, no one understands" → virgülün ötesindeki `no`
   kederi OLUMLUYA çeviriyordu; "çok mutluyum, hiç bu kadar iyi olmamıştım"
   → virgülün ötesindeki `hiç` sevinci OLUMSUZA çeviriyordu. Yanlış işaret,
   eksik işaretten kötüdür: motor susmuyor, TERSİNİ söylüyor. */
const _CUMLECIK_AYRAC = /[,;:—–]|\b(?:ama|fakat|ancak|but|though|however)\b/i;

function _cumlecik(parca, sondan) {
  const bol = String(parca || '').split(_CUMLECIK_AYRAC);
  return sondan ? bol[bol.length - 1] : bol[0];
}

/** Eşleşmenin İKİ YANINDAKİ pencere — kendi cümleciğiyle sınırlı, iki
    belirteç. Çift yönlüdür çünkü olumsuzlama dilin yapısına göre yer
    değiştirir: TR'de sonra gelir ("üzgün DEĞİLİM"), EN'de önce
    ("NOT sad"). Tek yön seçmek dillerden birini kör bırakır. */
function _pencere(metin, matchStart, matchEnd) {
  return {
    once:  _belirtecler(_cumlecik(metin.slice(0, matchStart), true)).slice(-2),
    sonra: _belirtecler(_cumlecik(metin.slice(matchEnd), false)).slice(0, 2),
  };
}

/* TR olumsuzluk eki penceresi — tam morfoloji değil, dar bir pencere:
   "-mıyor(um)/-miyor(um)/-madı(m)/-medi(m)/-maz/-mez" sonekleri. Kapsamı
   burada tut; tam çekim analizi bu fazı 🅞'ye çevirir (plan Risk 13 emsali). */
const _OLUMSUZ_EK_RE = /(mıyorum|miyorum|muyorum|müyorum|madım|medim|madı$|medi$|mam$|mem$|maz$|mez$)/i;

/** Pencerede olumsuzlama var mı? İki kanal AYRI yönlere bakar:
 *  · Sözlük (`detect.olumsuzlama`: TR değil/yok/asla · EN not/n't/never)
 *    İKİ yanda da geçerlidir — ayrı bir kelimedir, yerini dil belirler.
 *  · Türkçe olumsuzluk EKİ (`-mıyorum`, `-madım`) yalnız SONRAKİ
 *    belirteçte geçerlidir; çünkü ek fiilin kendisine yapışır ve fiil
 *    duygudan sonra gelir. Öne de bakarsa "yapamadım üzgünüm" gibi bir
 *    cümlede önceki fiilin eki kederi OLUMLUYA çevirir — denetimde
 *    (2026-08-29) bu yan etki yakalandı ve kanal ayrıldı. */
function _olumsuzMu({ once, sonra }) {
  const sozlukVar = once.concat(sonra).some(k => dpTest('detect.olumsuzlama', k));
  const ekVar = sonra.some(k => _OLUMSUZ_EK_RE.test(k));
  return sozlukVar || ekVar;
}

/** Eşleşmeyi içeren cümleyi keser — kanıt DAİMA kullanıcının kendi
 *  metninden, cümle sınırında (. ! ? veya satır başı) kırpılır. */
function _kanitKes(metin, start, end) {
  const oncesi = metin.slice(0, start);
  const sonrasi = metin.slice(end);
  const cumleBasi = Math.max(oncesi.lastIndexOf('.'), oncesi.lastIndexOf('!'), oncesi.lastIndexOf('?'), oncesi.lastIndexOf('\n'));
  const bitisAdaylari = [sonrasi.indexOf('.'), sonrasi.indexOf('!'), sonrasi.indexOf('?'), sonrasi.indexOf('\n')].filter(i => i >= 0);
  const bitis = bitisAdaylari.length ? Math.min(...bitisAdaylari) : sonrasi.length;
  const cumle = metin.slice(cumleBasi + 1, end + bitis).trim();
  return kokenKirp(cumle || metin.trim());
}

/** Her aile için İLK eşleşmeyi bulur (aile başına tek aday — plan K1: bir
 *  ailenin birden çok kelimesi aynı turda geçse de tek aday temsil eder).
 *  `lehce` verilmişse (K1, FAZ 14) paylaşılan sözlük hâlâ ADAY BULMANIN
 *  kendisidir — hangi kelimelerin duygusal kanıt sayılacağını o belirler
 *  (fallback zinciri, K1) — yalnız eşleşen kelime bu KULLANICIDA beyanla
 *  başka bir aileye taşınmışsa (`dgLehceDuzelt`) o aile burada EZER. */
function _adaylariBul(metin, lehce) {
  const adaylar = [];
  for (const aile of Object.keys(DG_AILELER)) {
    const desenler = dp('detect.duygu.' + aile);
    if (!desenler || !desenler.length) continue;
    for (const re of desenler) {
      /* Büyük-İ tuzağı (FAZ 2d): desen KONUM KORUYAN normalize üstünde
         aranır — "İçim rahat" (huzur) ve "İnancım var" (umut) bugüne dek
         hiç eşleşmiyordu. Ama pencere ve kanıt ORİJİNAL metinden kesilir:
         indeksler birebir uyar (İ→i uzunluk korur) ve kullanıcı ekranda
         kendi cümlesini görür (§6.10). */
      const m = re.exec(dpNormalizeKonum(metin));
      if (m) {
        const kelimeler = _pencere(metin, m.index, m.index + m[0].length);
        /* EŞLEŞME ADAYIN ÜSTÜNDE TAŞINIR (faz denetimi, 2026-08-29).
           Lehçenin anahtarı kullanıcının yazdığı kelime DEĞİL, sözlüğün
           eşleştirdiği PARÇADIR ("üzgünüm" yazan birinde anahtar "üzgün").
           Bu, adı konmadığında gizli bir çeviri katmanıdır (§4.3: "repoda
           'kullanıcı X der, kod Y der' diye bir çeviri katmanı bırakılmaz")
           ve FAZ 14'ün henüz yazılmamış düzeltme arayüzü sessizce yanlış
           anahtarı kaydederdi — jest kullanıcıya "tamam" der, motor hiç
           değişmezdi. Çözüm gizlemek değil GÖSTERMEK: motor kendi
           arayacağı anahtarı adayın üstünde dışarı verir, çağıran onu
           `dgLehceDuzelt`e aynen geri geçirir. */
        // Anahtar da orijinalden kesilir; Türkçe küçültmede İ→i olduğu için
        // lehçe defterinin anahtarı değişmez, ama köken kullanıcıda kalır.
        const eslesme = metin.slice(m.index, m.index + m[0].length).toLocaleLowerCase('tr');
        const lehceAile = lehce && lehce[eslesme];
        adaylar.push({
          aile: (lehceAile && DG_AILELER[lehceAile]) ? lehceAile : aile,
          eslesme,
          kanit: _kanitKes(metin, m.index, m.index + m[0].length),
          ters: _olumsuzMu(kelimeler),
        });
        break; // bu aile için ilk eşleşme yeterli
      }
    }
  }
  return adaylar;
}

/* ─── 3. NABIZ — tek turun ölçümü ─── */

/**
 * dgNabiz(metin, opts) — tek turun duygusal nabzı. Saf fonksiyon.
 * Kanıt yoksa `null` döner — ASLA "nötr" nesnesi değil (§6.10).
 *
 * opts.onceki — bir önceki nabız (ya da { kuvvet }) verilirse `yon` o
 * karşılaştırmadan hesaplanır; verilmezse `yon: null` (tek çağrıda geçmiş
 * yok — çoklu-tur eğrisi `dgYay`'in işidir).
 *
 * Dönüş: { deger: -2..+2, kuvvet: 0..4, yon,
 *          adaylar: [{aile, guc, eslesme, kanit}], kanitSayisi,
 *          kaynak: 'olcum' }
 * `eslesme` — sözlüğün eşleştirdiği ham parça (küçük harfe indirilmiş).
 * `dgLehceDuzelt`in anahtarı BUDUR; kullanıcının yazdığı tam kelime değil.
 */
export function dgNabiz(metin, opts) {
  const text = String(metin == null ? '' : metin).trim();
  if (!text) return null;

  const hamAdaylar = _adaylariBul(text, opts && opts.iklim && opts.iklim.lehce);
  if (!hamAdaylar.length) return null;

  // Pekiştirici/noktalama düzeltmesi metin genelinde bir kez hesaplanır —
  // "kuvvet ailenin taban değeri + pekiştirici/noktalama düzeltmesidir" (plan).
  const pekistiriciVar = dpTest('detect.pekistirici', text);
  const unlemVar = /!/.test(text);
  const duzeltme = (pekistiriciVar ? 1 : 0) + (unlemVar ? 1 : 0);

  /* İNKÂR, KARŞITINI İDDİA ETMEZ (denetim 2026-08-29).
     İlk yazımda olumsuzlama değeri AYNALIYORDU: "pişman değilim" utanç
     ailesinin −2'sini +2'ye çeviriyor, kuvvetini 3'te tutuyor ve
     "üzgünüm ama pişman değilim" cümlesinde kederi EZİYORDU. Oysa bir
     inkârdan karşıt duygunun tam kuvveti çıkarılamaz — bu, kanıtı olmayan
     bir değerdir (§6.10). "Mutlu değilim" diyen biri −2 şiddetinde mutsuz
     değildir; yalnız mutluluğu reddetmiştir.
     Doğru okuma: işaret döner ama BÜYÜKLÜK 1'e iner, kuvvet iki basamak
     düşer. Böylece inkâr, bir beyanı yapısal olarak bastıramaz. */
  const adaylar = hamAdaylar.map(a => {
    const taban = DG_AILELER[a.aile];
    if (a.ters && taban.deger !== 0) {
      return {
        aile: a.aile,
        guc: _klamp(taban.kuvvet - 2 + duzeltme, 0, 4),
        deger: taban.deger > 0 ? -1 : 1,
        eslesme: a.eslesme,
        kanit: a.kanit,
      };
    }
    // karisiklik (deger=0) olumsuzlansa da 0 kalır — -0 üretme.
    const guc = _klamp(taban.kuvvet + duzeltme, 0, 4);
    return { aile: a.aile, guc, deger: taban.deger, eslesme: a.eslesme, kanit: a.kanit };
  });

  // En güçlü aday baskın gelir; eşitlikte ilk bulunan (aile tablosu sırası) kazanır.
  let secili = adaylar[0];
  for (const a of adaylar) if (a.guc > secili.guc) secili = a;

  /* KUVVET MUTLAK DEĞİL, KİŞİNİN KENDİ TABANINA GÖRE (K4, FAZ 3).
     opts.iklim verilmişse mutlak kuvvet İklim'in kayan penceresine göre
     GÖRECELİ kuvvete çevrilir (percentile rank). Verilmemişse (opts yok,
     ya da İklim henüz hidre değil) mutlak kalır — dgNabiz saf fonksiyon
     kalmaya devam eder, kendisi state okumaz, İklim'i yalnız parametreden
     ALIR (§5.2). `kuvvetKaynagi` şeffaflık paneline (FAZ 11) hangi zeminden
     okunduğunu taşır. */
  let kuvvet = secili.guc;
  let kuvvetKaynagi = 'mutlak';
  if (opts && opts.iklim) {
    const goreli = _dgGoreliKuvvet(secili.guc, opts.iklim);
    kuvvet = goreli.kuvvet;
    kuvvetKaynagi = goreli.taze ? 'goreli' : 'mutlak';
  }

  let yon = null;
  const oncekiKuvvet = opts && opts.onceki && typeof opts.onceki.kuvvet === 'number' ? opts.onceki.kuvvet : null;
  if (oncekiKuvvet !== null) {
    yon = kuvvet > oncekiKuvvet ? 'yukselen' : kuvvet < oncekiKuvvet ? 'dusen' : 'duran';
  }

  return {
    deger: secili.deger,
    kuvvet,
    /* MUTLAK KUVVET ÇIKTIDA KALIR (denetim 2026-08-29). Görecelik tek
       başına bırakılsaydı sürekli yüksek gerginlikte yaşayan biri kendi
       ortalamasına normalize olur ve taşma kuralı (K2 #2, kuvvet>=3) ona
       HİÇ çalışmazdı — yani ölçüyü kişiselleştirmek, en çok yatıştırma
       gereken kişiyi görünmez kılardı. Karşılama tablosu ikisine birden
       bakar: göreli yükseliş VEYA mutlak tavan. */
    kuvvetMutlak: secili.guc,
    kuvvetKaynagi,
    yon,
    adaylar: adaylar.map(({ aile, guc, eslesme, kanit }) => ({ aile, guc, eslesme, kanit })),
    kanitSayisi: adaylar.length,
    kaynak: 'olcum',
  };
}

/* ─── 4. YAY — son 3 turun eğrisi ─── */

/**
 * dgYay(nabizlar) — son 3 nabzın kuvvet eğrisi. `nabizlar` çağıranın
 * biriktirdiği bir dizidir (bu modül state tutmaz); yalnız `{kuvvet}`
 * alanı olan, null-olmayan girdiler sayılır. 2'den az geçerli veri
 * varsa yön okunamaz → `null`.
 */
export function dgYay(nabizlar) {
  const gecerli = (Array.isArray(nabizlar) ? nabizlar : [])
    .filter(n => n && typeof n.kuvvet === 'number')
    .slice(-3);
  if (gecerli.length < 2) return null;
  const ilk = gecerli[0].kuvvet;
  const son = gecerli[gecerli.length - 1].kuvvet;
  if (son > ilk) return 'yukselen';
  if (son < ilk) return 'dusen';
  return 'duran';
}

/* ─── 5. İKLİM — kullanıcının kalıcı duygusal parmak izi (K1, FAZ 3) ───
   Üç alan: kendi tabanı (kuvvet dağılımı — bu bölümün asıl işi), kendi
   lehçesi (hangi kelime hangi aileye işaret ediyor — `dgLehceDuzelt`/
   `dgLehceUnut` ile BEYANLA doldurulur, §9 EHLİYET, FAZ 14; yeni kullanıcıda
   boş kalması hâlâ doğrudur — `tests/13D-duygu-iklimi.test.js:52` bunu şimdi
   "henüz düzeltme yok" olarak sınar, "alan hiç yok" olarak DEĞİL), karşılama
   defteri (hangi eksen bu kişide tuttu — FAZ 10'da dolduruldu). `isabet`
   de §9'da dolduruldu (K11 — motorun kendi ölçülmüş isabet oranı).
   `yuzeyDefter` hâlâ BOŞ doğar (FAZ 15'in işi); erken doldurmak kanıtsız
   bir değer üretir (§6.10) — henüz ölçülmemiş bir şeyi ölçülmüş gibi
   göstermek. */
const DG_IKLIM_KEY = 'etw_dg_iklim_v1';
/* "Son 90 ölçüm" (plan K4) — kova GERÇEK bir histogram değil, ham kuvvet
   değerlerinin kayan penceresidir: percentile hesabı için gereken tam
   dağılım budur, 5 kutulu bir sayaçtan geri türetilemez. */
const DG_IKLIM_PENCERE = 90;
/* GÖRECELİĞİN ASGARİ KANITI (denetim 2026-08-29). Percentile n=1'den
   itibaren hesaplanıyordu ve bu iki türlü yanlıştı:
   · Az veride sıralama gürültüdür — kovada tek bir 4 varken gelen gerçek
     bir 2, oran=0 ile KUVVET 0 okunuyordu. Bir ölçünün göreli olması için
     önce yeterli olması gerekir (§6.10).
   · Çıktı ölçeği beş basamaklıdır (0..4); birini beş basamağa yerleştirmek
     için basamak başına en az dört gözlem gerekir → 20.
   Eşiğin altında mutlak kuvvet AYNEN döner ve `taze:false` ile "henüz
   seni tanımıyorum" hâli işaretlenir (FAZ 14 ehliyeti bunu okuyacak). */
const DG_IKLIM_MIN_N = 20;

function _dgIklimAnahtar() {
  return `${DG_IKLIM_KEY}_${(S.currentUser && S.currentUser.id) || 'anon'}`;
}

function _dgIklimVarsayilan() {
  return {
    taban: { n: 0, kova: [], tarih: null },
    lehce: {},
    defter: {},
    beyan: {},
    isabet: { n: 0, uyum: null, son: null },
    yuzeyDefter: {},
    // modelOkuma (FAZ 9, K5): modelin İKİNCİ okuyucu olarak bastığı
    // eksenle uygulamanın kararı KAÇ kez ayrıştı — bkz. dgIklimModelOkumaEkle.
    modelOkuma: { n: 0, ayristi: 0, son: null },
    v: 1,
  };
}

/** SafeStorage'dan İklim'i okur; eksik/bozuk alanları varsayılanla tamamlar
 *  (eski/yarım bir kayıt motoru hiç çalıştırmasın diye — güvenli düşüş). */
export function dgIklimYukle() {
  try {
    const data = SafeStorage.get(_dgIklimAnahtar());
    if (data && typeof data === 'object') {
      const v = _dgIklimVarsayilan();
      return {
        taban: (data.taban && Array.isArray(data.taban.kova)) ? data.taban : v.taban,
        lehce: (data.lehce && typeof data.lehce === 'object') ? data.lehce : v.lehce,
        defter: (data.defter && typeof data.defter === 'object') ? data.defter : v.defter,
        beyan: (data.beyan && typeof data.beyan === 'object') ? data.beyan : v.beyan,
        isabet: (data.isabet && typeof data.isabet === 'object') ? data.isabet : v.isabet,
        yuzeyDefter: (data.yuzeyDefter && typeof data.yuzeyDefter === 'object') ? data.yuzeyDefter : v.yuzeyDefter,
        modelOkuma: (data.modelOkuma && typeof data.modelOkuma === 'object') ? data.modelOkuma : v.modelOkuma,
        v: 1,
      };
    }
  } catch (e) { console.warn('dgIklimYukle:', e && e.message); }
  return _dgIklimVarsayilan();
}

export function dgIklimKaydet(iklim) {
  try {
    if (!iklim) return;
    SafeStorage.set(_dgIklimAnahtar(), iklim);
  } catch (e) { console.warn('dgIklimKaydet:', e && e.message); }
}

/** Post-auth init (§5.2 çift boot ayrımı) — İklim kullanıcı-verilidir,
 *  SafeStorage hidrasyonu SONRASI çağrılmalı (03-auth-shell). `dgNabiz`
 *  hidrasyon beklemez; opts.iklim henüz null'sa mutlak kuvvete güvenli düşer. */
export function dgInit() {
  S._dgIklim = dgIklimYukle();
}

/** Yeni bir mutlak kuvveti (0..4) kayan pencereye ekler — İklim'in kendi
 *  tabanı burada büyür, bir sonraki mesajın GÖRECELİ okunacağı zemin. */
export function dgIklimTabanEkle(iklim, kuvvet) {
  if (!iklim || typeof kuvvet !== 'number' || !isFinite(kuvvet)) return iklim;
  const oncekiKova = Array.isArray(iklim.taban && iklim.taban.kova) ? iklim.taban.kova : [];
  const kova = oncekiKova.concat([_klamp(Math.round(kuvvet), 0, 4)]).slice(-DG_IKLIM_PENCERE);
  return { ...iklim, taban: { n: kova.length, kova, tarih: localISODate() } };
}

/** Modelin İKİNCİ okuyucu olarak bastığı kendi okumasını (FAZ 9, K5)
 *  İklim'e YANINA yazar — uygulamanın kararını (`uygulamaEksen`) EZMEZ.
 *  Ayrışma (`uygulamaEksen !== modelEksen`) bir hata değil SİNYALDİR: ölçüm
 *  sakin, model gergin okuyorsa örtülü bir duygunun izi olabilir; burada
 *  yalnız SAYILIR, yorumlanmaz — yorumlama sonraki bir fazın işi. `kanit`
 *  varsa `kokenAlintiCoz`'un kaynaktan kestiği cümledir (çağıranın işi);
 *  modelin kendi güven sayısı BURADA da taşınmaz (K4) — sözleşmede yok. */
export function dgIklimModelOkumaEkle(iklim, uygulamaEksen, modelEksen, kanit) {
  if (!iklim || !modelEksen) return iklim;
  const onceki = (iklim.modelOkuma && typeof iklim.modelOkuma === 'object')
    ? iklim.modelOkuma : { n: 0, ayristi: 0, son: null };
  const ayristi = !!(uygulamaEksen && modelEksen !== uygulamaEksen);
  return {
    ...iklim,
    modelOkuma: {
      n: (onceki.n || 0) + 1,
      ayristi: (onceki.ayristi || 0) + (ayristi ? 1 : 0),
      son: { uygulama: uygulamaEksen || null, model: modelEksen, kanit: kanit || null, tarih: localISODate() },
    },
  };
}

/* ─── ÖĞRENME DEFTERİ (FAZ 10) — "bu kişide ne tuttu" ───
   FAZ 4'ten beri defteri OKUYAN iki fonksiyon var (`_dgIklimIzinVeriyorMu`,
   `_dgIklimNegatifMi`) ama defter hiç dolmuyordu: hangi karşılamanın bu
   kişide işe yaradığı ölçülmüyordu, yani İklim'in üçüncü alanı boş bir
   vaatti. Burası onu dolduruyor — tahminle değil, ÖLÇÜMLE. */

/* Defterin kayan penceresi. 30: bir aylık düzenli kullanımda dolacak kadar
   küçük, tek bir kötü günün ortalamayı devirmesine izin vermeyecek kadar
   büyük. Tavana varınca en eski katkı ortalamayı koruyarak eritilir —
   böylece kişi DEĞİŞTİĞİNDE defter onu takip eder, geçmişte donup kalmaz. */
const DG_DEFTER_TAVAN = 30;

/**
 * dgKarsilamaPuani — bir karşılamanın TUTUP TUTMADIĞININ ölçüsü. Saf.
 * Kanıt yoksa `null` döner ve çağıran HİÇBİR ŞEY yazmaz (§6.10): uydurulmuş
 * bir 0 yazmak `n`'i şişirir ve eşikleri sahte biçimde ilerletir.
 *
 * Uyarılmanın yönü EKSENE bağlıdır ve tek formül bunu yanlış okur:
 * yatıştırmada kuvvetin DÜŞMESİ iyidir, diriltmede YÜKSELMESİ. Değerin
 * (olumlu/olumsuz) iyileşmesi ise evrenseldir — herkes için iyiye gitmektir.
 * Kriz (`tutma`) puanlanmaz (K9): o bir SEÇİM değildi, "tuttu mu" sorusu
 * anlamsızdır ve defteri kirletir.
 */
export function dgKarsilamaPuani(eksen, onceki, simdiki, acikGeriBildirim) {
  if (!eksen || eksen === 'tutma') return null;
  if (!onceki || !simdiki) return null;
  if (typeof onceki.deger !== 'number' || typeof simdiki.deger !== 'number') return null;

  let puan = 0;
  // Açık geri bildirim en güçlü sinyaldir — kullanıcının kendi beyanı (K3).
  if (acikGeriBildirim > 0) puan += 2;
  else if (acikGeriBildirim < 0) puan -= 2;

  const dDeger = simdiki.deger - onceki.deger;
  if (dDeger >= 1) puan += 1;
  else if (dDeger <= -1) puan -= 1;

  const dKuvvet = (simdiki.kuvvet || 0) - (onceki.kuvvet || 0);
  if (eksen === 'yatistirma') {
    if (dKuvvet <= -1) puan += 1; else if (dKuvvet >= 1) puan -= 1;
  } else if (eksen === 'diriltme') {
    if (dKuvvet >= 1) puan += 1; else if (dKuvvet <= -1) puan -= 1;
  }
  return _klamp(puan, -3, 3);
}

/** Puanı İklim defterine işler (saf). `defter[eksen] = {n, toplam}` —
 *  ortalamayı okuyucular hesaplar (`_dgIklimIzinVeriyorMu` / `Negatif`). */
export function dgIklimDefterEkle(iklim, eksen, puan) {
  if (!iklim || !eksen || typeof puan !== 'number' || !isFinite(puan)) return iklim;
  const defter = (iklim.defter && typeof iklim.defter === 'object') ? iklim.defter : {};
  const onceki = defter[eksen] || { n: 0, toplam: 0 };
  let n = onceki.n || 0;
  let toplam = onceki.toplam || 0;
  if (n >= DG_DEFTER_TAVAN) { toplam -= toplam / n; n -= 1; }
  return { ...iklim, defter: { ...defter, [eksen]: { n: n + 1, toplam: toplam + puan } } };
}

/** Mutlak kuvveti İklim'in kendi tabanına göre GÖRECELİ kuvvete çevirir
 *  (K4) — percentile rank, ortalama-sıralama yöntemiyle (kendinden küçük
 *  TAM pay, kendine eşit YARIM pay; aynı kuvveti tekrar tekrar yazan biri
 *  kendi ortalamasının ortasında sayılır, en uca itilmez). Taban boşsa
 *  (yeni kullanıcı) mutlak kuvvet AYNEN döner — bu "paylaşılan sözlük
 *  tabanı" fallback'idir (K1): DG_AILELER'in kendi taban tablosu, uydurulmuş
 *  bir topluluk istatistiği DEĞİL (§6.10). `taze:false` bu düşüşün
 *  "henüz seni tanımıyorum" hâli olduğunu işaretler — §9'un `dgIklimTaze`si
 *  AYNI eşiği dışarı açar, burada YENİDEN yazılmaz (tek kaynak). */
function _dgGoreliKuvvet(mutlakKuvvet, iklim) {
  if (!dgIklimTaze(iklim)) return { kuvvet: mutlakKuvvet, taze: false };
  const kova = iklim.taban.kova;
  let kucuk = 0, esit = 0;
  for (const k of kova) {
    if (k < mutlakKuvvet) kucuk++;
    else if (k === mutlakKuvvet) esit++;
  }
  const oran = (kucuk + esit / 2) / kova.length;
  return { kuvvet: _klamp(Math.round(oran * 4), 0, 4), taze: true };
}

/* ─── 6. KARŞILAMA — K2 tablosu, sıralı kural, ilk tutan kazanır (FAZ 4) ─── */

/** Duygu adı DEĞİL, verilecek şeyin adı (K2). Sıra plan tablosundaki sırayla
 *  aynı tutulur — kod okurken kural numarasıyla eşleşsin diye. */
/* Adlar ASCII'dir — `DG_AILELER`'in kendi kuralıyla aynı (`utanc_suclu`,
   `karisiklik`). Bunlar birer görünen ad değil, KİMLİKTİR: FAZ 5-6'da
   i18n anahtarı (`prompt.dg.karsilama.<eksen>`), FAZ 11'de kalıcı beyan
   anahtarı (`beyan: {eksen: 'sus'}`) olacaklar. Diyakritikli bir dizeyi
   storage anahtarı yapmak sonradan sökülmesi pahalı bir göç doğurur
   (§4.3). Kullanıcıya görünen Türkçe karşılıklar microcopy'nin işidir
   (FAZ 6) — burada değil. */
export const DG_KARSILAMALAR = ['taniklik', 'yatistirma', 'sahiplenme', 'berraklik', 'diriltme', 'kutlama', 'tutma'];

/* 13v-ihtiyac-motoru.js TEKRAR_PENCERESI emsali — son bu kadar turda aynı
   eksen üst üste seçildiyse çeşitlilik dürtmesi (plan FAZ 4). */
const DG_TEKRAR_PENCERESI = 3;

/* Karşılamanın BEDEN kanalı (K8 madde 3, FAZ 7) — 13e'nin mevcut 23
   cue'sundan eşleme; yeni cue sözlüğü AÇILMADI. Seçim cue'nun KENDİ adının
   anlamına dayanır, icat edilmiş bir "hangisi güzel duruyor" kararı değil:
   breath=nefes (yatıştırma), whoosh=ipleri temizleyen geçiş (berraklık),
   recall=geri çağırma/uyandırma (diriltme), tap=hafif dokunuş (sahiplenme),
   milestone1=en sade tören katmanı (kutlama). `taniklik` bilerek YOK — K7
   "sessiz eşlik"tir, huzuru/tanıklığı alkışlamak gürültüdür. `tutma` da
   YOK — K9 pazarlıksız: kriz anında cue hiç çağrılmaz (06'da ayrıca
   `eksen !== 'tutma'` bekçisiyle güvenceye alınır). Hangi cue'nun kalıcı
   doğru seçim olduğu FAZ 8'in "üründe, kulakla" kararıdır; bu tablo
   MUHAFAZAKÂR bir başlangıç noktasıdır. */
export const DG_CUE = {
  yatistirma: 'breath',
  sahiplenme: 'tap',
  berraklik:  'whoosh',
  diriltme:   'recall',
  kutlama:    'milestone1',
};

/** Nabızda birden çok aday varsa BASKIN olanı bulur — dgNabiz'in kendi
 *  "secili" mantığıyla aynı (ilk strictly-greater kazanır), çünkü nabiz
 *  yalnız değer/kuvveti taşır, hangi AİLEDEN geldiğini taşımaz. */
function _dgBaskinAday(nabiz) {
  if (!nabiz || !Array.isArray(nabiz.adaylar) || !nabiz.adaylar.length) return null;
  let secili = nabiz.adaylar[0];
  for (const a of nabiz.adaylar) if (a.guc > secili.guc) secili = a;
  return secili;
}

/* ASİMETRİ DÜZELTİLDİ (denetim 2026-08-29) — ilk yazımda TERSİNE dönmüştü:
   riskli ekseni AÇMAK için tek gözlem (n>=1) yetiyor, KAPATMAK için üç
   başarısızlık (n>=3) gerekiyordu. K6 bunun tersini söyler: "yanlış anda
   verilen diriltme şiddettir" — yani diriltme kazanılan bir izindir,
   varsayılan olarak KAPALIDIR. Tek olumlu gözlem bir örüntü değildir.
   Doğru yön: açmak için üç (n>=3), kapatmak için iki (n>=2) gözlem. */
const DG_IZIN_MIN_N = 3;
const DG_KAPAT_MIN_N = 2;

function _dgIklimIzinVeriyorMu(iklim, eksen) {
  const kayit = iklim && iklim.defter && iklim.defter[eksen];
  if (!kayit || !kayit.n || kayit.n < DG_IZIN_MIN_N) return false;
  return (kayit.toplam / kayit.n) > 0;
}

function _dgIklimSusturduMu(iklim, eksen) {
  return !!(iklim && iklim.beyan && iklim.beyan[eksen] === 'sus');
}

/* Kapatma barı açma barından DÜŞÜKTÜR (K6): bir ekseni yanlışlıkla
   susturmanın bedeli, yanlışlıkla vermenin bedelinden küçüktür —
   susturulan eksenin yerine daima tanıklık geçer, o da hiçbir hâlde
   zarar vermez. */
function _dgIklimNegatifMi(iklim, eksen) {
  const kayit = iklim && iklim.defter && iklim.defter[eksen];
  if (!kayit || kayit.n < DG_KAPAT_MIN_N) return false;
  return (kayit.toplam / kayit.n) < 0;
}

/** Sıralı tablo — plan K2, 2026-08-29 revizyonu. `nabiz` null ise (kanıt
 *  yok) doğrudan kural 9'a düşer; null OLMAYAN her nabız değer/aile
 *  üzerinden 2-8 kurallarından birine düşer (taksonomi değer×kuvvet
 *  düzleminin tamamını kapsadığı için "zayıf kanıt" ayrı bir sayısal eşik
 *  gerektirmez — bkz. rapor Duraklar). */
function _dgTabloKarar(nabiz, akisYon, iklim) {
  if (!nabiz) return { eksen: 'taniklik', kural: 9, baskin: null };
  const baskin = _dgBaskinAday(nabiz);
  const aile = baskin ? baskin.aile : null;

  if (nabiz.kuvvet >= 3 && akisYon === 'yukselen' && nabiz.deger <= 0) {
    return { eksen: 'yatistirma', kural: 2, baskin };
  }
  if (aile === 'utanc_suclu') return { eksen: 'sahiplenme', kural: 3, baskin };
  if (aile === 'karisiklik') return { eksen: 'berraklik', kural: 4, baskin };
  if (aile === 'donukluk') {
    return _dgIklimIzinVeriyorMu(iklim, 'diriltme')
      ? { eksen: 'diriltme', kural: 5, baskin }
      : { eksen: 'taniklik', kural: 5, baskin };
  }
  if (aile === 'sevinc' || aile === 'umut') return { eksen: 'kutlama', kural: 6, baskin };
  if (aile === 'huzur') return { eksen: 'taniklik', kural: 7, baskin };
  /* KURAL 7b — MUTLAK TAVAN (denetim 2026-08-29, iki kez düzeltildi).
     Görecelik tek başına bırakılsaydı sürekli yüksek gerginlikte yaşayan
     biri kendi ortalamasına normalize olur ve taşma kuralı ona HİÇ
     çalışmazdı: ölçüyü kişiselleştirmek, en çok yatıştırma gereken kişiyi
     görünmez kılardı. Ama tavan kural 2'nin yanına konduğunda AÇGÖZLÜ
     çıktı — "çok utanıyorum" (mutlak 4) sahiplenmeyi çalıp yatıştırmaya
     gidiyordu. Doğru yeri burası: aile kuralları kendi karşılamalarını
     ALDIKTAN sonra, yalnız hiçbirine düşmeyenler (kaygı/öfke gibi) için. */
  if (nabiz.deger < 0 && typeof nabiz.kuvvetMutlak === 'number' && nabiz.kuvvetMutlak >= 4) {
    return { eksen: 'yatistirma', kural: 7.5, baskin };
  }
  if (nabiz.deger < 0) return { eksen: 'taniklik', kural: 8, baskin };
  return { eksen: 'taniklik', kural: 9, baskin };
}

/** İnsan-okunabilir gerekçe — kural numarası + eksene göre. FAZ 11'den beri
 *  bu metin gerçekten kullanıcıya basılıyor (şeffaflık paneli, 06); bu yüzden
 *  artık TR-only hardcode DEĞİL, `p()` anahtarından okunur (dil-duyarlı,
 *  TR+EN parite 16b/16e'de). Kural numarası → anahtar eşlemesi: serbest
 *  metin icat edilmedi, yalnız var olan Türkçe cümleler `prompt.dg.gerekce.*`
 *  altına taşındı. */
function _dgGerekceYaz(kural, eksen, nabiz) {
  switch (kural) {
    case 2: return p('prompt.dg.gerekce.2');
    case 3: return p('prompt.dg.gerekce.3');
    case 4: return p('prompt.dg.gerekce.4');
    case 5: return eksen === 'diriltme'
      ? p('prompt.dg.gerekce.5_acik')
      : p('prompt.dg.gerekce.5_kapali');
    case 6: return p('prompt.dg.gerekce.6');
    case 7: return p('prompt.dg.gerekce.7');
    case 7.5: return p('prompt.dg.gerekce.7b');
    case 8: return p('prompt.dg.gerekce.8');
    default: return nabiz ? p('prompt.dg.gerekce.9_zayif') : p('prompt.dg.gerekce.9_yok');
  }
}

/**
 * dgKarsilama(metin, nabiz, iklim, akis) — K2 tablosu + K9 kriz üstünlüğü +
 * İklim düzeltmesi (susturma/negatif takas) + tekrar cezası (K2, FAZ 4).
 *
 * `metin` — K9 kontrolü için HAM metin. Plan imzası `(nabiz, iklim, akis)`
 * üç parametreliydi; `detectCrisis(text)` ham metin ister ve nabiz metni
 * taşımaz, bu yüzden `metin` başa eklendi (bkz. rapor Duraklar).
 * `nabiz` — dgNabiz(metin, opts) çıktısı ya da `null` (kanıt yok).
 * `iklim` — dgIklim objesi (S._dgIklim) ya da `null` (henüz hidre değil).
 * `akis` — `{ yon, gecmis }` ya da `null`: `yon` dgYay çıktısı
 *   (yukselen/dusen/duran/null), `gecmis` çağıranın tuttuğu son kararların
 *   dizisi (`{eksen}`, en eskiden en yeniye) — yalnız son
 *   DG_TEKRAR_PENCERESI kadarı okunur.
 *
 * Kriz yanarsa İklim'e hiç bakılmaz (K9) — dönüş `{ eksen:'tutma',
 * gerekce, kanit:null, ikincil:null }`.
 * Dönüş: `{ eksen, gerekce, kanit, ikincil }` — `kanit` DAİMA baskın adayın
 * kendi cümlesinden kesilmiş kanıtıdır (uydurulmuş gerekçe yasak, K7).
 */
export function dgKarsilama(metin, nabiz, iklim, akis) {
  // K9 — kriz üstündür, müzakere edilmez. Tablo çalışmaz, İklim uygulanmaz,
  // cue basılmaz. Emniyet Katmanı'nın kendisi (13-extras detectCrisis)
  // YENİDEN YAZILMAZ — window köprüsüyle çağrılır: 13-extras zaten
  // 03-auth-shell'i, o da 00-config-tracking'i (dgNabiz'i tüketen) import
  // ediyor; 13D'nin 13-extras'ı STATİK import etmesi döngü kurardı. Aynı
  // endişeyle 13-extras kendi window köprüsünü zaten belgeliyor (satır ~1439).
  /* Köprü OKUNABİLİR Mİ — bu repoda emsali var: `getCrisisContext` bir
     dönem window'a hiç bağlanmamış ve kriz enjeksiyonu BAŞTAN BERİ ölü
     kalmıştı ([[guvenlik-emniyet-katmani]]). Sessizce çalışmayan bir
     emniyet kontrolü, olmayan bir emniyet kontrolünden beterdir: kimse
     eksikliğini görmez. Okunamıyorsa motor kriz OLMADIĞINI varsaymaz —
     yalnız riskli eksenleri (kutlama/diriltme) kapatır ve tanıklığa
     düşer; tanıklık hiçbir hâlde zarar vermez (K6). */
  const krizOkunabilir = typeof window !== 'undefined' && typeof window.detectCrisis === 'function';
  if (krizOkunabilir && window.detectCrisis(String(metin || ''))) {
    return { eksen: 'tutma', gerekce: 'Kriz sinyali — İklim ve tablo devre dışı, güvenlik önde (K9).', kanit: null, ikincil: null, krizOkundu: true };
  }

  const akisYon = (akis && akis.yon) || (nabiz && nabiz.yon) || null;
  const ham = _dgTabloKarar(nabiz, akisYon, iklim);
  let secilen = ham.eksen;
  let ikincil = null;
  let takasNotu = '';

  /* Takas notları (FAZ 11'den beri kullanıcıya basılıyor — şeffaflık
     paneli) `p()` anahtarından okunur; interpolasyon `ham.eksen`in ASCII
     kimliği değil OKUNABİLİR karşılığıdır (`prompt.dg.eksen.*`) — EN'de
     "diriltme" değil "revival" gibi dil-duyarlı bir söz gösterilmeli. */
  const _okunanEksen = e => p('prompt.dg.eksen.' + e);
  if (secilen !== 'taniklik' && _dgIklimSusturduMu(iklim, secilen)) {
    ikincil = secilen;
    secilen = 'taniklik';
    takasNotu = p('prompt.dg.gerekce.takas_sus', { eksen: _okunanEksen(ham.eksen) });
  } else if (secilen !== 'taniklik' && _dgIklimNegatifMi(iklim, secilen)) {
    ikincil = secilen;
    secilen = 'taniklik';
    takasNotu = p('prompt.dg.gerekce.takas_negatif', { eksen: _okunanEksen(ham.eksen) });
  }

  const gecmis = (akis && Array.isArray(akis.gecmis)) ? akis.gecmis.slice(-DG_TEKRAR_PENCERESI) : [];
  if (secilen !== 'taniklik' && secilen !== 'tutma' && gecmis.length === DG_TEKRAR_PENCERESI && gecmis.every(g => g && g.eksen === secilen)) {
    ikincil = ikincil || secilen;
    secilen = 'taniklik';
    takasNotu = (takasNotu ? takasNotu + ' ' : '') + p('prompt.dg.gerekce.takas_tekrar', { n: DG_TEKRAR_PENCERESI });
  }

  /* Kriz okunamadıysa neşeli/harekete geçirici eksenler verilmez —
     okunmamış bir emniyet kontrolünün ardından kutlamak, en kötü anda
     en yanlış karşılamadır. */
  if (!krizOkunabilir && (secilen === 'kutlama' || secilen === 'diriltme')) {
    ikincil = ikincil || secilen;
    secilen = 'taniklik';
    takasNotu = (takasNotu ? takasNotu + ' ' : '') + p('prompt.dg.gerekce.takas_kriz_kapali');
  }

  const gerekce = takasNotu || _dgGerekceYaz(ham.kural, ham.eksen, nabiz);
  const kanit = ham.baskin ? ham.baskin.kanit : null;

  return { eksen: secilen, gerekce, kanit, ikincil, krizOkundu: krizOkunabilir };
}

/* ─── 7. ŞEFFAFLIK — beyanla düzeltme, süresiz AMA geri alınabilir (FAZ 11) ───
   "Beni yanlış okudun" jesti, kullanıcının K3 anlamında BİR BEYANIDIR: bir
   ekseni bu kişide bir daha hiç önermeyeceğimizi söylemek. Mekanizma zaten
   kuruluydu — `dgKarsilama` her turda `_dgIklimSusturduMu(iklim, secilen)`
   kontrolünü yapıyordu (FAZ 4), yalnız YAZAN bir yüzey yoktu. 09i'nin beyan
   defteri töresiyle AYNI: sessiz bir zaman aşımı yok, susturma kullanıcı
   geri alana dek sürer — bir kart eskiyip "unutulmuş" gibi susmaz. */

/** Bir eksen bu kullanıcıda hâlihazırda susturulmuş mu? Panel bu okumayla
 *  "sustur" ile "geri al" arasında hangi düğmeyi göstereceğine karar verir
 *  (`_dgIklimSusturduMu`'nun genel-erişimli aynası — dgKarsilama'nın kendi
 *  kararı özel kalır, bu yalnız DIŞARIYA açılan salt-okunur kapı). */
export function dgBeyanVar(iklim, eksen) {
  return _dgIklimSusturduMu(iklim, eksen);
}

/** "Beni yanlış okudun" → `iklim.beyan[eksen] = 'sus'`. Saf (İklim'in kalıcı
 *  hâline dokunmaz, yalnız yeni bir kopya döner) — kaydeden çağırandır
 *  (`dgIklimKaydet`), İklim'in geri kalan alan yazma fonksiyonlarıyla AYNI
 *  desen (`dgIklimTabanEkle`, `dgIklimDefterEkle`). */
export function dgBeyanSustur(iklim, eksen) {
  if (!iklim || !eksen) return iklim;
  return { ...iklim, beyan: { ...(iklim.beyan || {}), [eksen]: 'sus' } };
}

/** Susturmayı geri alır. Anahtarı `sus` YERİNE bir şeyle değiştirmek değil,
 *  SİLMEK gerekir — `_dgIklimSusturduMu` yalnız `=== 'sus'` sınar, ama bir
 *  yarım/eski değer (ör. gelecekte eklenecek başka bir beyan durumu) burada
 *  yanlışlıkla "susturulmamış" sayılabilir; en temiz hâl anahtarın hiç
 *  var olmamasıdır. */
export function dgBeyanGeriAl(iklim, eksen) {
  if (!iklim || !eksen || !iklim.beyan || !(eksen in iklim.beyan)) return iklim;
  const beyan = { ...iklim.beyan };
  delete beyan[eksen];
  return { ...iklim, beyan };
}

/* ─── 8. YANILMA KAPISI — dgKapi(yuzey), K10 tablosu (FAZ 13) ───
   Sohbette yanlış okuma bir tur sürer, kartta kalıcıdır, bildirimde
   üstelik ESKİMİŞTİR — üç saat önce ölçülen bir hâl kullanıcı artık başka
   bir yerdeyken kapısını çalar. Hata sabit değil, YÜZEYİN FONKSİYONUDUR;
   o yüzden kanıt eşiği de sabit olamaz (K10). Tek kapı: duyguya dokunan
   HER tüketici — sohbet dahil — `dgNabiz`/`dgKarsilama`'yı DOĞRUDAN
   okumaz, `dgKapi(yuzey, ctx)`'ten geçer. İki giriş bırakmak kapıyı kapı
   olmaktan çıkarır (Risk 11).

   Saf fonksiyondur (§5.2): state'i `ctx`'ten alır, `S`'yi kendisi
   OKUMAZ — çağıran (01-prompts-modes.js) S._dgNabiz/S._dgIklim/... 'i
   kendi toplar. Bu yalnız test edilebilirlik için değil: farklı yüzeyler
   (push bir bildirimde, secici bir kart listesinde) farklı ANLARDA
   çalışır, "şimdi"yi ve "hangi turun kanıtı"nı bilen yalnız çağırandır. */

/* Dört kadran, yüzey başına EŞİK tablosu:
   · tanik    — kaç bağımsız kanıt sınıfı gerekir (kadran 1). Aynı cümleden
     çıkan iki eşleşme tek tanıktır; `dgNabiz.kanitSayisi` burada SAYILMAZ,
     yalnız "bu turda ÖLÇÜM var mı" sorulur. ÖLÇÜM+BEYAN ya da iki ayrı
     turun ÖLÇÜMÜ ikisi de "2 tanık"tır — üçüncü bir tanık sınıfı yok.
   · tazelik  — 'anlik' (pencere yok) | 'gun' (localISODate eşleşmeli) |
     'dk90' (push, K10 tablosu) (kadran 2).
   · ayrisma  — true ise K5'in ikinci okuyucusu uygulamanın kararıyla
     ÇELİŞTİĞİNDE (`ctx.ayristi`) yüzey SUSAR (kadran 3). Yalnız PAHALI
     yüzeylerde: `sohbet`, `atmosfer` ve `esik`te bilerek YOK — "sohbette
     ayrışma merak sebebidir, kartta durak işaretidir" (K10). Merak
     susturmayı gerektirmez; ucuz ve kendiliğinden geri alınan bir yüzeyde
     de gerektirmez (bkz. tablonun üstündeki denetim notu).
   · sunumSadece — true ise dönüş `{ sunum, metin: null }`e indirgenir:
     kart (K12) ve eşik (K10 "metin YOK, yalnız ışık").
   · ehliyet  — true ise K11 (`dgIsabet`, §9, FAZ 14) şart: `secici`/`push`
     `ctx.iklim.isabet` yeterli ölçülmemişse (`dgIsabetYeterli` false) ya
     da taban kaymışsa (`dgIklimTaze` false) kapalı kalır. `ctx.ehliyetVar`
     açıkça verilirse (test/özel çağıran) türetmenin YERİNE geçer —
     uydurma bir varsayılan (`true` fallback'i) §6.10'un ihlali olurdu,
     o yüzden hiçbir kanıt yoksa (undefined ehliyetVar + boş/eksik iklim)
     ikisi de kapalı kalır.
   · beyanSart — push'a özgü: K10 tablosu "BEYAN + ehliyet + tazelik
     penceresi" der, tanık SAYIMI değil — ÖLÇÜM tek başına yetmez, kullanıcının
     kendi cümlesi/mood_history beyanı (`ctx.beyanKaniti`) şarttır. */
const DG_KAPI_PUSH_DK = 90; // K10 tablosu — bildirimde tazelik penceresi
/* AYRIŞMA YALNIZ PAHALI YÜZEYLERE (faz denetimi, 2026-08-29). İlk yazımda
   `ayrisma: true` yedi yüzeyin beşine konmuştu — atmosfer ve eşik dahil.
   Oysa K10 bu kadranı açıkça sınırlar: "çelişkide PAHALI yüzey susar…
   sohbette ayrışma merak sebebidir, kartta durak işaretidir". Tablonun
   kendi sütunları hangisinin pahalı olduğunu söyler: atmosfer "kendiliğinden"
   geri alınır (sohbetin "sonraki tur"undan bile ucuz), eşik ise bir İDDİA
   taşımaz (metin yok, yalnız ışık) — geri alınacak bir şey yoktur. İkisinin
   de eşik sütununda yazan tek şart "1 tanık"tır. Sohbet konuşmaya devam
   ederken en ucuz iki yüzeyi susturmak tutarsızdı ve FAZ 16'nın yüzeylerini
   büyük ölçüde atıl bırakırdı — ayrışma sık bir hâldir, nadir değil. */
/* ATMOSFERİN TAZELİĞİ 'anlik' DEĞİL 'dk90' (FAZ 19 — FAZ 16'nın açık
   Durak'ının kapanışı). `'anlik'` bu kapıda "her zaman taze" demektir ve
   gerekçesi belgede yazılıdır: o yüzeyler AYNI TURDA çağrılır. Atmosfer
   şeridi öyle değildi — `asRefresh` saatlik bir zamanlayıcıyla da koşar ve
   `S._dgNabiz` bellekte yaşadığı sürece şerit saatler önce ölçülmüş bir
   hâli göstermeye devam ediyordu; üstelik duygu dalı zincirin en üstünde
   olduğu için mod/özet/saat halkaları bir daha hiç çalışmıyordu. Kadran 2
   tam da bunu yasaklar ("okuma eskimez, YOK OLUR"). Yeni bir sayı
   uydurulmadı: motorun kendi penceresi `DG_KAPI_PUSH_DK` (90 dk) kullanıldı
   — "kullanıcının gözünün önünde olmayan bir yüzeyde okuma ne kadar
   yaşar" sorusunun bu motordaki tek yanıtı odur. Ölçüm ancak FAZ 17
   `S._dgNabizZaman`i doğurduktan sonra mümkün oldu; öncesinde bu satır
   yazılamazdı, çünkü kapının vuracağı bir damga yoktu. */
const DG_KAPI_ESIK = {
  sohbet:   { tanik: 0, tazelik: 'anlik' },
  atmosfer: { tanik: 1, tazelik: 'dk90' },
  esik:     { tanik: 1, tazelik: 'gun',   sunumSadece: true },
  toren:    { tanik: 2, tazelik: 'gun',   ayrisma: true },
  /* DAVET (FAZ 19) — 13o'nun sessizlik daveti. Kendi satırı var çünkü K10
     tablosu onu `push` ile aynı hücreye koymuştu ve bu YANLIŞTI: 13o
     kullanıcı sohbet ekranındayken, o oradayken konuşur (`_isChatActive`);
     10x ise uygulama KAPALIYKEN. İkisinin hatası aynı cinsten değil —
     davetin yanlışı bir sonraki turda düzelir, bildirimin yanlışı
     kullanıcıyı başka bir yerdeyken bulur. `push`un BEYAN şartını buraya
     uygulamak daveti pratikte kalıcı olarak susturur, `sohbet`in eşiksiz
     hattını uygulamak ise davete cevap hakkı vermeden konuşturur. Ölçü
     ortada: davet İSTENMEDEN gelir (kullanıcı susuyor, soru sormadı), o
     yüzden bir cevaptan daha çok kanıt ister — iki tanık; ve sessizlik
     penceresi dakikalarla ölçüldüğü için okuma taze olmalı (dk90).
     Ayrışma kapanır: istenmeden konuşan, çelişki varken susar. Ehliyet
     ARANMAZ — davetin hatası tek turda geri alınır (K11 pahalı ve geri
     alınamaz yüzeyler içindir). */
  davet:    { tanik: 2, tazelik: 'dk90', ayrisma: true },
  secici:   { tanik: 2, tazelik: 'gun',   ayrisma: true, ehliyet: true },
  push:     { tazelik: 'dk90', ayrisma: true, ehliyet: true, beyanSart: true },
  kart:     { tanik: 1, tazelik: 'anlik', ayrisma: true, sunumSadece: true },
};
/** Kapının tanıdığı sekiz yüzey (K10 tablosunun sırasıyla + FAZ 19'un
 *  `davet`i) — DG_KARSILAMALAR
 *  emsali: bunlar birer sabit değil KİMLİKTİR, yeni bir yüzey açan tüketici
 *  bu listeye eklenmeden `dgKapi` onu sessizce reddeder. */
export const DG_KAPI_YUZEYLER = Object.keys(DG_KAPI_ESIK);

/** İki bağımsız kanıt sınıfı mı var — ÖLÇÜM (bu turda VE/YA DA önceki
 *  turda) + BEYAN. Tavan 2: üçüncü bir tanık sınıfı yok, fazlası
 *  enflasyon olurdu (K10'un kendi "az konuşup doğru konuşmak" ölçüsü). */
function _dgKapiTanikSayisi(ctx) {
  const olcum = (ctx.nabiz ? 1 : 0) + (ctx.oncekiNabiz ? 1 : 0);
  const beyan = ctx.beyanKaniti ? 1 : 0;
  return Math.min(2, olcum + beyan);
}

/** Okumanın yaşı eşik penceresinin içinde mi? 'anlik' yüzeyler damga
 *  taşımaz (aynı turda çağrılırlar). 'gun' yüzeylerinde damgasız okuma
 *  "bugün" sayılır. 'dk90' (push) damgayı ZORUNLU kılar — gerekçesi
 *  gövdede. */
function _dgKapiTaze(tazelik, zaman, simdi) {
  if (tazelik === 'anlik') return true;
  const now = typeof simdi === 'number' ? simdi : Date.now();
  /* DAMGASIZ OKUMA TAZE SAYILMAZ (faz denetimi, 2026-08-29). `dk90` push'a
     özgüdür ve K10'un o satırı tam da ESKİMEYİ durdurmak için vardır:
     "üç saat önce ölçülen bir hâl, kullanıcı artık başka bir yerdeyken
     kapısını çalar". `zaman` eksikken "şimdi ölçülmüş" varsaymak, kapının
     tek işini sessizce iptal ederdi — FAZ 19'un çağıranı damgayı unutursa
     üç saatlik bir okuma taze diye teslim edilirdi. Kanıtın yokluğu
     tazelik kanıtı DEĞİLDİR (§6.10): damga yoksa yüzey susar.
     'gun' için varsayılan meşrudur — o yüzeyler (eşik, tören, seçici)
     okumayı aynı turda üretebilir ve "damgasız" orada "bugün" demektir. */
  if (tazelik === 'dk90') {
    if (typeof zaman !== 'number') return false;
    return (now - zaman) <= DG_KAPI_PUSH_DK * 60 * 1000;
  }
  const t = typeof zaman === 'number' ? zaman : now;
  if (tazelik === 'gun') return localISODate(new Date(t)) === localISODate(new Date(now));
  return true;
}

/**
 * dgKapi(yuzey, ctx) — K10 tablosunun TEK kapısı. Okuma döndürür ya da
 * `null`; `null` "henüz konuşacak kadar kanıtın yok" demektir (§6.10),
 * bir hata değildir.
 *
 * ctx = {
 *   metin,        // ham kullanıcı metni — K9 kriz kontrolü + dgKarsilama için
 *   nabiz,        // dgNabiz() çıktısı ya da null — BU turun ÖLÇÜMÜ
 *   oncekiNabiz,  // bir ÖNCEKİ turun dgNabiz() çıktısı ya da null — "iki
 *                 // ayrı turun ölçümü" tanığı (kadran 1)
 *   beyanKaniti,  // bool — K3'ün BEYAN sınıfı bu turda var mı (mood_history/
 *                 // açık cümle/09j pini). `dgBeyanVar` (bir eksenin
 *                 // SUSTURULMUŞ olup olmadığı) ile KARIŞTIRILMAZ — o
 *                 // ayrı bir mekanizmadır ve zaten dgKarsilama İÇİNDE okunur.
 *   iklim,        // S._dgIklim ya da null
 *   akis,         // dgKarsilama'ya AYNEN geçer: { yon, gecmis }
 *   ayristi,      // bool — bu turda modelin okuması (K5) uygulamanın
 *                 // kararıyla ÇELİŞTİ mi (S._dgIklim.modelOkuma.son'dan
 *                 // çağıranın türettiği bilgi) — kadran 3
 *   ehliyetVar,   // bool opsiyonel — verilirse (test/özel çağıran) AYNEN
 *                 // kullanılır; verilmezse (undefined) dgKapi K11'i
 *                 // `ctx.iklim.isabet` + `dgIklimTaze(ctx.iklim)` üzerinden
 *                 // KENDİSİ türetir (§9, FAZ 14) — dgKapi saf kalır, çünkü
 *                 // iklim zaten ctx'in bir parçasıdır.
 *   zaman,        // okumanın epoch ms'i — tazelik hesaplaması (kadran 2)
 *   simdi,        // "şimdi"nin epoch ms'i — testte sabitlenebilir, ver-
 *                 // ilmezse Date.now()
 * }
 *
 * Dönüş — yüzeye göre değişir:
 *   'sohbet' → dgKarsilama() çıktısı, ASLA null (K6: kanıtsızsa tanıklık;
 *              bir sohbet yanıtı her turda bir şey söylemek ZORUNDADIR).
 *   'kart'   → `{ sunum, metin: null }` ya da `null` (K12: kart METNİ
 *              üretemez, yalnız hangi kart/ışığın öne çıkacağını fısıldar).
 *   'esik'   → aynı sunum-sadece şekil (K10: "metin YOK, yalnız ışık").
 *   diğerleri → dgKarsilama() çıktısı ya da `null`.
 */
export function dgKapi(yuzey, ctx) {
  try {
    ctx = ctx || {};
    const esik = DG_KAPI_ESIK[yuzey];
    if (!esik) return null; // tanımsız yüzey — sessizce düş (§5.2)

    // Sohbet K6'nın kendisidir: kanıt eşiği yoktur, ayrışmadan etkilenmez
    // (K10: "sohbette ayrışma merak sebebidir"), tazelik anlıktır. dgKarsilama
    // zaten kanıtsızlıkta tanıklığa düşer — burada ikinci bir eşik kurmak
    // K6'yı iki kez uygulamak olurdu.
    if (yuzey === 'sohbet') return dgKarsilama(ctx.metin, ctx.nabiz, ctx.iklim, ctx.akis);

    if (esik.beyanSart) {
      if (!ctx.beyanKaniti) return null; // push: ÖLÇÜM tek başına yetmez
    } else if (_dgKapiTanikSayisi(ctx) < esik.tanik) {
      return null;
    }
    if (!_dgKapiTaze(esik.tazelik, ctx.zaman, ctx.simdi)) return null;
    if (esik.ayrisma && ctx.ayristi) return null;
    if (esik.ehliyet) {
      /* EHLİYET DİKİŞİ KAPANDI (§9, FAZ 14). `ctx.ehliyetVar` AÇIKÇA
         verilmişse (true/false) o kazanır — FAZ 13'ün testleri ve gelecek
         özel çağıranlar bunu bilerek zorlayabilsin diye. Verilmemişse
         (undefined) dgKapi K11'i kendi türetir: taban kaymışsa/yetersizse
         (`dgIklimTaze` false) VEYA isabet oranı henüz kanıtlanmamışsa
         (`dgIsabetYeterli` false) yüzey kapalı kalır — uydurma bir
         `true` varsayılanı §6.10 ihlali olurdu. */
      const ehliyetVar = typeof ctx.ehliyetVar === 'boolean'
        ? ctx.ehliyetVar
        : dgIsabetYeterli(ctx.iklim); // taze VE isabet oranı ikisi birden — §9
      if (!ehliyetVar) return null;
    }

    /* BEŞİNCİ KADRAN (K13, FAZ 15) — ehliyet kontrolünden SONRA: motor bu
       YÜZEYDE kendi hata oranını ölçmüş ve eşiği aşmışsa geri çekilir.
       Yeni bir yol açılmadı, yeni bir tüketici sözleşmesi doğmadı — tek
       satır. `sohbet` buraya hiç uğramaz (yukarıdaki erken return). */
    if (dgYanilmaKapali(ctx.iklim, yuzey)) return null;

    const okuma = dgKarsilama(ctx.metin, ctx.nabiz, ctx.iklim, ctx.akis);
    /* SUNUM-SADECE YÜZEYLER: kart (K12 — kimlik yüzeyi, metin YASAK) ve
       eşik (K10 tablosu — "metin YOK, yalnız ışık"). Faz denetimi
       (2026-08-29): eşiğin bu notu ilk yazımda tüketici disiplinine
       bırakılmıştı, oysa K12 aynı kısıtı kart için MEKANİK kılıyor.
       Disipline bırakılan kural zamanla tavsiyeye döner (§6.6); iki satır
       maliyetle eşik de kapının kendisinde kapanır — FAZ 16'nın 02d
       tüketicisi `.gerekce`/`.kanit` alanlarını görmez bile. */
    if (esik.sunumSadece) return { sunum: okuma.eksen, metin: null };
    return okuma;
  } catch (e) {
    console.warn('dgKapi:', e && e.message);
    /* 'sohbet' hiçbir hâlde null dönmez (K6) — burada da değil. Bir istisna
       yutulup null döndürülürse çağıran (01-prompts-modes.js) `karsilama.eksen`
       okurken TypeError'a çarpardı; dış try/catch'in beklediği "güvenli
       tanıklık" varsayılanı BURADA da korunmalı. */
    return yuzey === 'sohbet'
      ? { eksen: 'taniklik', gerekce: '', kanit: null, ikincil: null, krizOkundu: false }
      : null;
  }
}

/* ─── 9. EHLİYET — dgIsabet, dgIklimTaze, dgLehce* (K11, FAZ 14) ───
   Bir modelin kendi güven sayısı kapı olamaz (K4). Ama bu uygulamada gerçek
   bir etiket VAR: kullanıcı her kapanış töreninde ruh hâlini kendi eliyle
   1-10 veriyor (mood_history, 05-closure-parts.js:234). Motor kendini bu
   rakama karşı sınayabilir — günün ÖLÇÜLEN değeri (nabzın `deger`i) mi,
   kullanıcının o gün BEYAN ettiği skor mu aynı YÖNÜ (iyi/kötü) gösteriyor.
   `dgIsabet` bir korelasyon katsayısı değil, K10'un "isabet oranı" sözünün
   birebir karşılığıdır: bir TUTMA/TUTMAMA sayımı, FAZ 10'un `dgKarsilamaPuani`
   ile aynı ailede (online ortalama, kanıtsızlıkta hiçbir şey yazılmaz). */

/* K11'in kendi metninde açık sayı: "n < 7 ise ... hiç doğmaz". UYUM eşiği
   plan metninde adlandırılmadan bırakıldı; faz denetiminde (2026-08-29)
   0.6'dan 0.75'e çıkarıldı. Gerekçe sayılabilir: `uyum` bir YÖN ikilisinin
   isabet oranıdır, yani şans düzeyi 0.5'tir. n=7'de 0.6 eşiği pratikte
   "7'de 5" demektir ve yazı-tura bir motor bu kapıdan **%23 olasılıkla**
   geçer (P(X>=5 | p=0.5) = 29/128). Bu bir kapı değil, gürültüdür — üstelik
   açtığı yüzeyler geri alınamayanlardır (seçici sıralaması, bildirim).
   0.75 eşiği n=7'de "7'de 6" ister; aynı yazı-tura motorun geçme olasılığı
   %6.25'e (8/128) iner. K10'un kendi ölçüsü de bunu söylüyor: "az konuşup
   doğru konuşmak, çok konuşup sık tutturmaktan iyidir" — eşik, motorun
   kendini kanıtlamadığı sürece SUSMASI için vardır. Revize edilebilir bir
   sayıdır (DG_IZIN_MIN_N/DG_KAPAT_MIN_N emsali), ama şans düzeyinin
   altına inemez. */
const DG_ISABET_MIN_N = 7;
const DG_ISABET_UYUM_MIN = 0.75;

/** İklim'in tabanı hâlâ ölçmeye yeter mi — K11 "dağılım kayması" /
 *  "seni tanımıyorum" hâli. `_dgGoreliKuvvet`in İÇİNDE zaten hesaplanan
 *  AYNI eşiği (n >= DG_IKLIM_MIN_N) dışarı açar — plan bunu açıkça ister
 *  ("dgIklimTaze yeni bir kayma hesabı YAZMASIN… bu bayrağın üstüne bin",
 *  FAZ 13 kayıt notu): yeni bir istatistik icat edilmedi, tek kaynak burada. */
export function dgIklimTaze(iklim) {
  const kova = (iklim && Array.isArray(iklim.taban && iklim.taban.kova)) ? iklim.taban.kova : [];
  return kova.length >= DG_IKLIM_MIN_N;
}

/** Bir günün ÖLÇÜLEN değeri (nabzın `deger`i, −2..+2) ile kullanıcının o
 *  gün BEYAN ettiği skoru (mood_history, 1-10) örtüştürür — pure. Yön
 *  anlaşması ölçülür (ikisi de "iyi" ya da ikisi de "kötü" diyor mu),
 *  büyüklük değil — "isabet" adı zaten bunu söyler. Orta noktada (deger=0
 *  ya da beyanSkoru=5.5) yön BELİRSİZDİR, karşılaştırma atlanır; kanıtsız
 *  bir "tuttu" sayısı `n`'i şişirir ve K11'in eşiğini sahte ilerletirdi
 *  (dgKarsilamaPuani'nin aynı kuralı, K3/§6.10). */
export function dgIsabetGuncelle(iklim, olculenDeger, beyanSkoru) {
  if (!iklim) return iklim;
  if (typeof olculenDeger !== 'number' || !isFinite(olculenDeger)) return iklim;
  if (typeof beyanSkoru !== 'number' || !isFinite(beyanSkoru)) return iklim;

  const olculenYon = olculenDeger > 0 ? 1 : olculenDeger < 0 ? -1 : 0;
  const beyanYon = beyanSkoru > 5.5 ? 1 : beyanSkoru < 5.5 ? -1 : 0;
  if (!olculenYon || !beyanYon) return iklim; // orta nokta — yön yok, sayılmaz

  const tuttu = olculenYon === beyanYon ? 1 : 0;
  const onceki = (iklim.isabet && typeof iklim.isabet === 'object') ? iklim.isabet : { n: 0, uyum: null, son: null };
  const n = (onceki.n || 0) + 1;
  const uyum = (typeof onceki.uyum === 'number') ? (onceki.uyum * (onceki.n || 0) + tuttu) / n : tuttu;

  return {
    ...iklim,
    isabet: { n, uyum, son: { olculenDeger, beyanSkoru, tuttu: !!tuttu, tarih: localISODate() } },
  };
}

/** Şeffaflık paneli/UI için köken-kapılı gösterim (item 4, rapor talimatı):
 *  `n` görünür, eşik ALTINDAYKEN sayı GÖSTERİLMEZ — köken motorunun genel
 *  eşiği (KOKEN_ESIK=3) DEĞİL, K11'in kendi n>=7'si burada geçirilir. */
export function dgIsabetGoster(isabet) {
  return kokenOlc(isabet && isabet.uyum, isabet && isabet.n, DG_ISABET_MIN_N);
}

/** Pahalı yüzey (secici, push) EHLİYETİ — üç şart birden: taban güncel
 *  (`dgIklimTaze`), isabet sayısı yeterli VE isabet oranı yeterli
 *  (`dgIsabetGoster` + eşik). Biri eksikse motor "henüz/artık kendini
 *  kanıtlamadı" der (K11) — modelin kendi güven sayısı gibi uydurulmuş
 *  bir varsayılan DEĞİL, kanıtı kullanıcının kendi rakamıdır. */
export function dgIsabetYeterli(iklim) {
  if (!dgIklimTaze(iklim)) return false;
  const g = dgIsabetGoster(iklim && iklim.isabet);
  return kokenVar(g) && g.v >= DG_ISABET_UYUM_MIN;
}

/* LEHÇE (K1, FAZ 14) — "bu kişi hangi kelimeyi hangi hâl için kullanıyor".
   Paylaşılan sözlük (§1-2) hâlâ ADAY BULMANIN kendisidir (K1 fallback
   zinciri) — `dgLehceDuzelt` yalnız eşleşen kelimenin bu KULLANICIDA hangi
   AİLEYE ait sayılacağını değiştirir. Mekanizma FAZ 11'in "beni yanlış
   okudun" jestiyle AYNI ailedir (`dgBeyanSustur`/`GeriAl` emsali): süresiz
   ama geri alınabilir, kaydeden çağırandır (`dgIklimKaydet`). Bu kelime
   düzeltmesini kullanıcıya hangi ekranın/microcopy'nin sunacağı Ton
   Rehberi'nde yazılı değil — burada yalnız VERİ katmanı (yaz/oku/tüket)
   kuruldu, bkz. rapor Duraklar. */
/** @param kelime — `dgNabiz(...).adaylar[i].eslesme` AYNEN geçirilir.
 *  Kullanıcının yazdığı tam kelime ("üzgünüm") değil, sözlüğün eşleştirdiği
 *  parçadır ("üzgün") — motor o anahtarı arar. Düzeltme arayüzü kelimeyi
 *  kullanıcıdan değil ADAYDAN alır (faz denetimi, 2026-08-29). */
export function dgLehceDuzelt(iklim, kelime, aile) {
  if (!iklim || !kelime || !aile || !DG_AILELER[aile]) return iklim;
  const anahtar = String(kelime).toLocaleLowerCase('tr');
  return { ...iklim, lehce: { ...(iklim.lehce || {}), [anahtar]: aile } };
}

/** Kelime düzeltmesini unutur — anahtar `dgBeyanGeriAl`'daki gibi SİLİNİR,
 *  bir "yok" değeriyle değiştirilmez (en temiz hâl hiç var olmamasıdır);
 *  kelime taksonominin PAYLAŞILAN eşlemesine geri döner. */
export function dgLehceUnut(iklim, kelime) {
  if (!iklim || !kelime || !iklim.lehce) return iklim;
  const anahtar = String(kelime).toLocaleLowerCase('tr');
  if (!(anahtar in iklim.lehce)) return iklim;
  const lehce = { ...iklim.lehce };
  delete lehce[anahtar];
  return { ...iklim, lehce };
}

/* ─── 10. YANILMA DEFTERİ — dgYanilma*, kendini kapatma (K13, FAZ 15) ───
   K11 (§9) motorun GENEL okuma ehliyetini ölçer (isabet, beyanla sınanır,
   pahalı yüzeyleri AÇAR). Bu bölüm farklı bir soruya bakar: isabet yüksek
   olsa bile BİR YÜZEYDE kullanıcı motoru fiilen kaç kez geri çevirdi —
   isabet motorun genel okuma yeteneğidir, yanılma o YÜZEYDE ölçülen
   somut geri çevirmedir.

   Defter KAYAN PENCEREDİR (DG_YANILMA_PENCERE), KÜMÜLATİF DEĞİL — çünkü
   kapanmanın affı olmalı. Motor zamanla iyileşir (FAZ 6'nın register
   kartuşları, FAZ 14'ün lehçe düzeltmeleri, dolan İklim tabanı hep
   okumayı düzeltir); erken dönemin iki düzeltmesi bir yüzeyi sonsuza dek
   kapatmamalı. `isabet`in kümülatif olması meşrudur (ehliyet zamanla
   KAZANILIR); ceza kümülatif OLAMAZ — affı olmayan ceza ölçüm değil
   damgadır. Eviction tekniği `dgIklimDefterEkle` (FAZ 10) ile AYNIDIR:
   pencere dolunca en eski katkı ORANI KORUYARAK erir — yeni bir istatistik
   icat edilmedi, tek kaynak orada zaten kuruldu.

   Kapanma `dgKapi`'nin BEŞİNCİ KADRANIDIR (§8, ehliyet kontrolünden
   SONRA) — yeni bir yol açılmadı, yeni bir tüketici sözleşmesi doğmadı.

   DAMGAYI ÜRETİCİ BASMAZ, TESLİM EDEN BASAR (§6.10). `dgKapi` bir okuma
   döndürdü diye "konuştu" SAYILMAZ — tüketici yüzeyi GERÇEKTEN
   gösterdiğinde `dgYanilmaKonustu`yu çağırır (01-prompts-modes.js, sohbet
   için: karşılama gerçekten prompt'a girdiğinde). Kapıdan geçip ekrana
   çıkmayan bir okuma kullanıcının hiç görmediği bir cümledir; onu deftere
   yazmak yanılma oranını görünmeyen konuşmalarla SEYRELTİR. Aynı sebeple
   düzeltme sayısı FAZ 11'in "beni yanlış okudun" jestinden gelir
   (`dgYanilmaDuzeltildi`), motorun kendi tahmininden DEĞİL. */

/* Pencere 12 — yüzeylerin çoğu günde bir konuşur (Günün Sözü, Akşam
   Töreni, eşiğin ışığı); pencere ≈ iki haftalık yakın geçmiştir. */
const DG_YANILMA_PENCERE = 12;
/* Penceredeki konuşma sayısı bunun altındaysa oran `null` — kapanma yok,
   Gözlemevi sayı GÖSTERMEZ, davet koyar (§6.10: ölçülmemiş bir şeyi
   ölçülmüş gibi göstermek yasak). */
const DG_YANILMA_MIN_N = 5;
/* Oran bunu AŞARSA (>) yüzey susar. 1/3 ("üç kez konuşup birinde
   yanılmak") bu eşiğin anlamıdır; n=5'te pratik karşılığı 2/5=0.4'ün
   üstünde kalmaktır (1/5=0.2 kapatmaz). Sayılabilir gerekçe: gerçekte
   %10 yanılan İYİ bir yüzeyin n=5'te yanlışlıkla kapanma riski
   P(X>=2|n=5,p=0.1)=%8.1 — kabul edilebilir, çünkü tersi (yanılan bir
   yüzeyin konuşmaya devam etmesi) K10'a göre daha pahalıdır: o
   yüzeylerin hatası geri alınamaz. */
const DG_YANILMA_ESIK = 0.34;

/** Bir yüzeyin konuştuğunu — okumanın GERÇEKTEN teslim edildiğini —
 *  kaydeder. Saf, `{...iklim}` döner (§9 `dgLehceDuzelt` emsali), kaydeden
 *  çağırandır (`dgIklimKaydet`). Pencere dolunca en eski katkı ORANI
 *  KORUYARAK erir (`dgIklimDefterEkle`nin AYNI eviction tekniği, FAZ 10) —
 *  literal bir FIFO değil, kişi DEĞİŞTİĞİNDE defterin onu takip etmesini
 *  sağlayan aynı yaklaşım. */
export function dgYanilmaKonustu(iklim, yuzey) {
  if (!iklim || !yuzey) return iklim;
  const yuzeyDefter = (iklim.yuzeyDefter && typeof iklim.yuzeyDefter === 'object') ? iklim.yuzeyDefter : {};
  const onceki = yuzeyDefter[yuzey] || { konustu: 0, duzeltildi: 0 };
  let konustu = onceki.konustu || 0;
  let duzeltildi = onceki.duzeltildi || 0;
  if (konustu >= DG_YANILMA_PENCERE) {
    duzeltildi -= duzeltildi / konustu; // en eski katkı erir — dgIklimDefterEkle emsali
    konustu -= 1;
  }
  return { ...iklim, yuzeyDefter: { ...yuzeyDefter, [yuzey]: { konustu: konustu + 1, duzeltildi } } };
}

/** "Beni yanlış okudun" (FAZ 11) → bu yüzeyde bir düzeltme daha. Saf,
 *  kaydeden çağırandır. Konuşmamış bir yüzey (yuzeyDefter[yuzey] yoksa ya
 *  da konustu=0) SESSİZCE no-op döner — bir cezanın hiç sayılmamış bir
 *  "konuştu"nun üstüne binmesi `duzeltildi > konustu` gibi anlamsız bir
 *  hâle yol açardı (§6.10: kanıtsız bir sayım). */
export function dgYanilmaDuzeltildi(iklim, yuzey) {
  if (!iklim || !yuzey) return iklim;
  const yuzeyDefter = (iklim.yuzeyDefter && typeof iklim.yuzeyDefter === 'object') ? iklim.yuzeyDefter : {};
  const onceki = yuzeyDefter[yuzey];
  if (!onceki || !onceki.konustu) return iklim;
  /* TAVAN: `duzeltildi` `konustu`yu AŞAMAZ (faz denetimi, 2026-08-30).
     Sayaç tek yönlü artıyordu ve panelin "geri al → yeniden sustur"
     döngüsü aynı konuşmayı ikinci kez düzeltme sayabiliyordu; `konustu`
     ise o turda artmadığı için oran 1'i aşıyordu (12 konuşma / 14
     düzeltme → %117). Kapanma kararı bundan etkilenmezdi (eşik zaten
     0.34), ama `dgYanilmaOran` bir ORAN sunar ve Gözlemevi onu yüzde
     olarak gösterir: %100'ü aşan bir düzeltme oranı ölçülmüş bir şey
     değil, sayacın kendi artığıdır (§6.10). Kararsızlık bir düzeltmedir,
     iki değil. */
  const konustu = onceki.konustu;
  const duzeltildi = Math.min(konustu, (onceki.duzeltildi || 0) + 1);
  return { ...iklim, yuzeyDefter: { ...yuzeyDefter, [yuzey]: { konustu, duzeltildi } } };
}

/** Bu yüzeyin düzeltme ORANI — köken-kapılı gösterim (`dgIsabetGoster`
 *  emsali, §9): konuşma sayısı `DG_YANILMA_MIN_N`in altındaysa sayı YOK. */
export function dgYanilmaOran(iklim, yuzey) {
  const kayit = iklim && iklim.yuzeyDefter && iklim.yuzeyDefter[yuzey];
  const konustu = kayit && typeof kayit.konustu === 'number' ? kayit.konustu : 0;
  const duzeltildi = kayit && typeof kayit.duzeltildi === 'number' ? kayit.duzeltildi : 0;
  const oran = konustu > 0 ? duzeltildi / konustu : null;
  return kokenOlc(oran, konustu, DG_YANILMA_MIN_N);
}

/** `dgKapi`nin BEŞİNCİ KADRANI — bu yüzey kendini kapatmış mı. `sohbet`
 *  için DAİMA `false`: K6 bir sohbet yanıtının her turda bir şey söylemek
 *  ZORUNDA olduğunu, K9 krizin müzakere edilmediğini söyler; yanılma
 *  defterinin sohbeti susturması kriz karşılamasını da susturmak demektir
 *  — kabul edilemez (K13). Sohbet yine SAYILIR (defter dolar, Gözlemevi'nde
 *  görünür), yalnız KAPANMAZ. */
export function dgYanilmaKapali(iklim, yuzey) {
  if (yuzey === 'sohbet') return false;
  const g = dgYanilmaOran(iklim, yuzey);
  return kokenVar(g) && g.v > DG_YANILMA_ESIK;
}

/* ─── 11. WINDOW EXPOSE (TDZ-güvenli, minify-dayanıklı) ─── */
if (typeof window !== 'undefined') {
  window.dgNabiz = dgNabiz;
  window.dgYay = dgYay;
  window.dgInit = dgInit;
  window.dgIklimYukle = dgIklimYukle;
  window.dgIklimKaydet = dgIklimKaydet;
  window.dgIklimTabanEkle = dgIklimTabanEkle;
  window.dgIklimModelOkumaEkle = dgIklimModelOkumaEkle;
  window.dgKarsilama = dgKarsilama;
  window.DG_AILELER = DG_AILELER;
  window.DG_KARSILAMALAR = DG_KARSILAMALAR;
  window.dgKarsilamaPuani = dgKarsilamaPuani;
  window.dgIklimDefterEkle = dgIklimDefterEkle;
  window.DG_CUE = DG_CUE;
  window.dgBeyanVar = dgBeyanVar;
  window.dgBeyanSustur = dgBeyanSustur;
  window.dgBeyanGeriAl = dgBeyanGeriAl;
  window.dgKapi = dgKapi;
  window.DG_KAPI_YUZEYLER = DG_KAPI_YUZEYLER;
  window.dgIklimTaze = dgIklimTaze;
  window.dgIsabetGuncelle = dgIsabetGuncelle;
  window.dgIsabetGoster = dgIsabetGoster;
  window.dgIsabetYeterli = dgIsabetYeterli;
  window.dgLehceDuzelt = dgLehceDuzelt;
  window.dgLehceUnut = dgLehceUnut;
  window.dgYanilmaKonustu = dgYanilmaKonustu;
  window.dgYanilmaDuzeltildi = dgYanilmaDuzeltildi;
  window.dgYanilmaOran = dgYanilmaOran;
  window.dgYanilmaKapali = dgYanilmaKapali;
}
