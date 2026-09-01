#!/usr/bin/env node
/**
 * Wanderer AI — İHTİMALSEL DİL DENETÇİSİ
 * "Wanderer bilir gibi değil, görebiliyor gibi konuşur" mimarisinin bekçisi
 * (.claude/plans/ihtimalsel-dil-devrimi.md · scripts/i18n-style/tr.md).
 *
 * Uygulamanın bildiği (ölçüm, beyan, olgu) kesin dilde kalır; uygulamanın
 * çıkardığı anlam (yorum, atıf, tahmin, buyruk) ihtimalsel dile geçmelidir.
 * Bu denetçi, kesinlik kalıplarının (buyruk kipi, kesin gelecek, kesin
 * yargı eki) beş sözlük dosyasına sessizce sızmasını — ya da geri
 * sızmasını — engeller.
 *
 * Emsal: scripts/gerceklik-denetci.mjs (banner, muafiyet penceresi, çıktı
 * biçimi) — ikiz motor yazılmadı, aynı iskelet yeni bir kural setiyle
 * dolduruldu.
 *
 * Kullanım:
 *   node scripts/ihtimalsel-denetci.mjs                → taban çizgisiyle
 *       karşılaştır (K7). Hiçbir dosyada sayı ARTMAMIŞSA exit 0.
 *   node scripts/ihtimalsel-denetci.mjs --liste         → tüm ihlalleri
 *       dosya:satır + anahtar + kalıp adıyla listele, exit 0.
 *   node scripts/ihtimalsel-denetci.mjs --taban-yaz     → bugünkü ihlal
 *       sayısını scripts/ihtimalsel-taban.json'a yaz (fazlar ilerledikçe
 *       taban düşürülür).
 *   node scripts/ihtimalsel-denetci.mjs --dizin X       → beş dosyayı X
 *       kökünde ara (yalnız kapının KENDİSİNİ test etmek için).
 *
 * MUAFİYET: bilinçli istisna, ihlalin geçtiği satırın kendisinde ya da bir
 * üst satırda şu yorumla beyan edilir:
 *     /* IHTIMAL-MUAF: gerekçe *​/
 * Gerekçesiz muafiyet de ihlaldir — muafiyetin bedeli nedenini yazmaktır.
 *
 * Muaf KATEGORİLER (kanon/hukuk/kriz/hata/söz/etiket) dosya ve
 * anahtar-öneki bazında burada tanımlıdır — anayasa §3, K2.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * KAPININ GÖREMEDİĞİ (kör nokta defteri)
 *
 * Bu denetçi de AVLAR — gerceklik-denetci gibi bilinen desenleri bir
 * SÖZCÜK/KALIP LİSTESİYLE arar. Bilerek yazılı sınırları:
 *   1. "Çıplak emir fiili cümle sonunda" (§1.2) Türkçede evrensel bir ek
 *      DEĞİL — bir fiil KÖKÜ (yaz, sil, başla…). Regex bunu ancak elle
 *      derlenmiş bir fiil listesiyle yakalayabilir; listede olmayan bir
 *      emir fiili (ör. nadir kullanılan bir fiil) görünmez kalır.
 *   2. EN "is/are ile kurulan çıplak yargı" (§1.2) yalnız "you are/you're"
 *      ikinci-tekil kalıbına daraltıldı — "This is…"/"That means…" gibi
 *      üçüncü şahıs yargılar bu sürümde görünmez.
 *   3. Anahtar tespiti satır içindeki HER `sözcük:` konumunu anahtar sanır —
 *      bir değerin İÇİNDE "Not: bu önemli" gibi gerçek bir cümle-içi iki
 *      nokta üst üste geçerse (bu beş dosyada hiç görülmedi), o nokta yanlış
 *      bir segment sınırı açabilir. Düşük risk: yanlış segmentin anahtarı
 *      rastlantıyla muaf listesindeyse (id/label/lesson…) bir ihlal
 *      SESSİZCE kaçabilir.
 *   4. Kaçış dizileri (ör. şablon içinde kaçırılmış bir ters tırnak) ARANMAZ
 *      — bu beş dosyada hiç kullanılmıyor, ama kullanılırsa şablon sınırı
 *      erken kapanmış görünebilir.
 *   5. Bir satırda backtick açılışından SONRAKİ anahtarlar (varsa) o satırda
 *      taranmaz (bkz. denetle() içindeki `break`) — bu beş dosyada backtick
 *      her zaman satırın TEK içeriği olduğu için pratikte hiç tetiklenmedi.
 *   6. YARGI-EKI (-tır/-tir/-tur/-tür) Türkçenin ETTİRGEN fiil çekimiyle
 *      (ör. "oluştur.", "etkinleştir.") harf düzeyinde ÇAKIŞIR — bu fiiller
 *      aslında BUYRUK-CIPLAK'tır, kesin yargı eki değil. Canlı örnek:
 *      "Önce günün özetini oluştur." YARGI-EKI'ye düşer. Zararsız: her iki
 *      durumda da cümle §2'nin ihtimalsellik araçlarıyla yumuşatılmalıdır —
 *      yalnız RAPORLANAN kural adı yanlıştır, ihlalin kendisi gerçektir.
 * Bu sınırlar FAZ 6a/6b'nin (🅞) yargı işiyle daraltılacak; FAZ 1'in görevi
 * mekanik gövdeyi kurmak, kusursuz bir dilbilgisi ayrıştırıcısı yazmak
 * değil (bkz. gerceklik-denetci'nin aynı gerekçesi).
 * ─────────────────────────────────────────────────────────────────────────
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/* ─── Taranan beş dosya (§ görev tanımı) — dizin taraması DEĞİL, sabit
   liste: bu iş yalnız bu beş sözlüğün DEĞER katmanındadır. ─── */
/* 16b/16e (prompt sözlükleri) BİLİNÇLİ OLARAK TARANMAZ — gerekçe (K5):
   oradaki her değer `prompt.*`tır, yani MODELE VERİLEN TALİMATtır; kullanıcıya
   giden metin değildir. Talimatı ihtimalselleştirmek ("bunu kullanabilirsin")
   modelin davranışını gevşetir — istenen tam tersidir. Modelin ÇIKTISININ
   register'ı ayrı bir yerde, `prompt.identity.core` XI. KONUŞMA TARZI
   bloğunda kurulur (FAZ 6a): kesin↔ihtimalsel ayrımı, beş kip aracı ve
   kriz istisnası oraya yazılıdır.
   İkinci gerekçe pratiktir: bu iki dosya uzun template literal'lerden oluşur;
   satır-bazlı anahtar takibi orada kayıyor ve gövde içindeki AYET
   göndermelerini (Mülk 67/2) sahte ihlal olarak raporluyordu — kapının
   kanona bekçilik etmesi gerekirken kanonu hedef göstermesi kabul edilemez.
   BEDELİ: modelin ağzına konan örnek cümlelerin ("…diyebilirsin") register
   triyajı ELLE yapılır (FAZ 6b) — kör nokta #7. */
/* 07b (MERHABA, EMRE ANAYASASI) da TARANMAZ — ama gerekçesi 16b/16e ile
   AYNI DEĞİL, ve bu ayrım 2026-08-19'a kadar hiç yazılmamıştı (kör nokta #8).

   Teknik gerekçe aynı: 07b uzun template literal'lerden oluşur ve gövdesinde
   ayet göndermeleri (Mülk 67/2, Ra'd 13/11, İnşirah 94/6) yaşar — kapı
   burada da kanonu hedef gösterirdi.

   AMA farkı şudur: 16b'nin değerleri modele TALİMATtır; 07b'nin değerleri
   modelin SESİDİR ve içindeki tırnaklı cümleler doğrudan kullanıcıya
   söylenecek örneklerdir. Yani 07b'de elle triyaj 16b'dekinden daha
   gereklidir — ve 2026-08-11 devrimi kapanırken bu triyaj HİÇ yapılmadı:
   anayasa kapsam haritasında adı bile geçmedi.

   Bedeli 2026-08-19'da görüldü: bölüm 3 ("Ton, Ses ve Dil Kişiliği") kesin
   tanı retoriğini emrederken (\"İlişkilerinde başarısız çünkü…\"), aynı turda
   giden prompt.identity.core kesin hükmü yasaklıyordu. İki system mesajı
   birbiriyle çelişiyordu. Triyaj yapıldı (persona-ic-calisma FAZ 2): kitap
   örnekleri verbatim korundu, üstüne sahiplik kuralı yazıldı.

   Bu kör noktanın bekçisi bir regex değil, bir SÖZLEŞME TESTİdir:
   tests/anayasa-register.test.js — sahiplik kuralı silinirse kırmızı yanar.
   Anayasaya yeni bölüm/örnek eklendiğinde triyaj yine ELLEdir. */
const TARAMA_DOSYALARI = [
  'js/parts/15b-i18n-dict-core.js',
  'js/parts/15e-i18n-dict-en.js',
  'js/parts/12b2-deste-icerik.js',
];
const DIL = {
  'js/parts/15b-i18n-dict-core.js': 'tr',
  'js/parts/15e-i18n-dict-en.js': 'en',
  'js/parts/12b2-deste-icerik.js': 'tr',
  'js/parts/16b-i18n-prompt-dict-core.js': 'tr',
  'js/parts/16e-i18n-prompt-dict-en.js': 'en',
};

/* --dizin <yol>: kapının KENDİSİNİ sınamak için (tests/ihtimalsel-dil-kapisi).
   Beş kanonik dosya adı bu kökte aranır; test yalnız ihtiyacı olanı yazar. */
const _dizinArg = process.argv.indexOf('--dizin');
const DIZIN = _dizinArg >= 0 && process.argv[_dizinArg + 1] ? process.argv[_dizinArg + 1] : null;
/* --dizin verildiğinde taban da O KÖKE yazılır — testin kendi taban-yaz
   denemesi gerçek scripts/ihtimalsel-taban.json'u ASLA ezmemeli. */
const TABAN_YOLU = DIZIN ? join(DIZIN, 'ihtimalsel-taban.json') : join(__dirname, 'ihtimalsel-taban.json');

function dosyaListesi() {
  const out = [];
  for (const rel of TARAMA_DOSYALARI) {
    const tam = DIZIN ? join(DIZIN, basename(rel)) : join(ROOT, rel);
    if (!existsSync(tam)) continue;
    out.push({ rel, tam, dil: DIL[rel] });
  }
  return out;
}

/* ─── Muafiyet (satır beyanı) — emsal: KOKEN-MUAF ─── */
const MUAF_RE = /\/\*\s*IHTIMAL-MUAF:\s*(.+)/;
const MUAF_PENCERE = 6;
function satirMuaf(satirlar, i) {
  for (let j = Math.max(0, i - MUAF_PENCERE); j <= i; j++) {
    const m = (satirlar[j] || '').match(MUAF_RE);
    if (m && m[1] && m[1].replace(/\*\/\s*$/, '').trim().length >= 8) return true;
  }
  return false;
}
const MUAF_BOS_RE = /\/\*\s*IHTIMAL-MUAF:?\s*(\*\/|$)/;

/* ─── Muaf KATEGORİLER — anahtar öneki / alan adı bazında (anayasa §3) ───
   Görev listesi + anayasanın açıkça adlandırdığı tek ek: prompt.identity.core
   (16b/16e) — 12 ilke bloğu + tez cümleleri + ayet göndermesi tek gövde
   hâlinde bu anahtarın İÇİNDE yaşıyor (anayasa §3.1: "16b prompt.identity.core
   içindeki 12 ilke bloğu"); satır bazında ayrıştırmak (kanon/talimat) FAZ 6a'nın
   (🅞) yargı işi, burada tek anahtar MUAF edilir. */
function anahtarMuaf(key) {
  if (!key) return false;
  if (/^gl\.soz/.test(key)) return true;                          // §3.4 kullanıcının kendi sözü
  if (/err|error|hata|fail/i.test(key)) return true;               // §3.5 hata mesajları
  // §3.1 Manifesto — başlık VE açıklama. `summary` 2026-08-11'e dek muaf DEĞİLDİ ve
  // bir tur boyunca tez yumuşatıldı ("içindedir" → "içinde olabilir"). Manifesto'nun
  // 12 ilkesi kitabın TEZİdir (protokol §6.3, verbatim); uygulamanın kullanıcı
  // hakkındaki hükmü değildir — ihtimalsel dil ona dokunmaz.
  if (/^mr\.item\./.test(key)) return true;
  if (key === 'prompt.identity.core') return true;                 // §3.1 kanon — Manifesto 12 + tez + ayet gövdesi
  if (['lesson', 'dusunceler', 'inanclar', 'hisler', 'davranislar'].includes(key)) return true; // §3.1/§3.7
  // §4 kart rejim tablosu — TANIM alanları KESİN kalır, ihtimalselleştirilmez.
  // `portre`/`gercek` kartı 3. tekilde tarif eder ("…öğrenen kişidir"); kullanıcı
  // hakkında iddia DEĞİLdir (§4.0). Bunları yumuşatmak kartın tanımını çözer —
  // yani burada kapının görevi ihlali bulmak değil, TANIMI KORUMAKtır.
  if (['portre', 'gercek'].includes(key)) return true;
  if (['sub', 'whisper', 'name', 'kok'].includes(key)) return true; // §3.6/§4 etiket · ad · kaynak atfı
  if (['id', 'signals', 'label'].includes(key)) return true;       // donuk sözleşme
  return false;
}

/* ─── KURALLAR — anayasa §1.2 ─── */
const KURALLAR_TR = [
  {
    kod: 'BUYRUK-MALI',
    ad: 'buyruk kipi (-malısın/-melisin)',
    re: /mal[ıi]s[ıi]n|melisin/i,
  },
  {
    kod: 'BUYRUK-CIPLAK',
    ad: 'çıplak emir fiili cümle sonunda',
    // Elle derlenmiş yaygın 2. tekil şahıs emir fiilleri — kör nokta #1.
    // 2026-08-11'de genişletildi: ilk liste elle derlenmişti ve 54 kaçak bıraktı
    // (`dene.` ×17, `ver.` ×8, `seç.` ×8, `izle.` ×4 …). Kör nokta #1'in canlı
    // kanıtıydı — liste bakım ister, tamamlanmış sayılmaz.
    // GOTCHA — `\b` KULLANMA. JS'te `\b` ASCII sınırıdır; Türkçe harfler ASCII
    // olmadığı için "açık." içinde "a|çık" arasında sahte bir sınır üretir ve
    // `\bçık\.` eşleşir. Bu, repoda daha önce de yanılmış bir tuzaktır
    // (bkz. hafıza: personalization-engine TR regex \b gotcha). Doğru sınır,
    // önünde Türkçe dâhil hiçbir harf OLMAMASIDIR:
    re: /(?<![a-zA-ZçğıöşüÇĞİIÖŞÜâîû])(yaz|sor|başla|sil|geç|aç|bitir|al|yakala|bırak|koy|kaldır|dur|bekle|dinle|anlat|oku|düşün|hisset|seç|gör|bak|deme|yapma|atla|ekle|çıkar|indir|kapat|unutma|hatırla|paylaş|cevapla|yanıtla|gönder|kaydet|mühürle|işaretle|kabullen|kabul et|itiraf et|karar ver|devam et|dene|ver|izle|yürü|çık|kal|dön|gel|taşı|tanı|bul|sorgula|listele|kutla|odaklan|tut|kur|söyle|söyleme|bağırma|geciktirme|not al|fark et|dikkat et|başlat|durdur|uygula|tekrarla|değiştir|koru|sakla|iste|çalış)\.(?=["')\s]|$)/i,
  },
  {
    kod: 'GELECEK-SIN',
    ad: 'kesin gelecek (-acaksın/-eceksin)',
    re: /acaksın|eceksin/i,
  },
  {
    kod: 'GELECEK-CIPLAK',
    ad: 'kesin gelecek, çıplak (-acak./-ecek.)',
    re: /(acak|ecek)\.(?=["')\s]|$)/i,
  },
  {
    kod: 'YARGI-EKI',
    ad: 'kesin yargı eki cümle sonunda (-dır/-dir/-dur/-dür/-tır/-tir/-tur/-tür)',
    re: /(dır|dir|dur|dür|tır|tir|tur|tür)\.(?=["')\s]|$)/i,
  },
];
const KURALLAR_EN = [
  { kod: 'EN-WILL', ad: 'kesin gelecek (will)', re: /\bwill\b/i },
  { kod: 'EN-MUST', ad: 'buyruk (must)', re: /\bmust\b/i },
  { kod: 'EN-HAVETO', ad: 'buyruk (have to)', re: /\bhave to\b/i },
  {
    kod: 'EN-BARE-ASSERT',
    ad: 'is/are ile kurulan çıplak yargı (you are/you\'re)',
    // Kör nokta #2: yalnız 2. tekil şahıs — "This is…" görünmez.
    re: /\byou'?re\b|\byou are\b/i,
  },
];

/* ─── Değer çıkarımı ───
   Satır, ardışık `anahtar:` konumlarına göre SEGMENTLERE bölünür — her
   segment bir sonraki anahtara kadar (ya da satır sonuna kadar) o anahtarın
   ham içeriğidir. Bu, 12b2'nin `dusunceler: ['a…', 'b…', 'c…'],` gibi
   DİZİ değerlerini (köşeli parantezle açılıp aynı satırda kapanan) doğru
   anahtara bağlar — önceki sürümde `KV_RE` yalnız köşeli parantezsiz
   `anahtar: 'değer'` çiftlerini yakalıyordu ve bir dizi satırı hiç
   eşleşmeyince değerler bir ÖNCEKİ anahtarın bağlamına sızıyordu (dusunceler
   → 'lesson' gibi muaf olmayan bir anahtarın altına düşüp yanlış ihlal
   üretebilirdi). 12b2'nin çıplak alan adları (`lesson: '...'`) ile
   15b/16b'nin tırnaklı i18n anahtarları (`'kk.sentez.hint': '...'`) AYNI
   ayrıştırıcıdan geçer — ikisi de `anahtar:` ile başlar, yalnız anahtarın
   tırnağı farklıdır. */
const ANAHTAR_KONUM_RE = /(?:'([^']+)'|([A-Za-z_][\w]*))\s*:/g;
const TIRNAK_RE = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g;

function tekBacktickSayisi(s) {
  let n = 0;
  for (const ch of s) if (ch === '`') n++;
  return n;
}

/* Yorum satırlarını atla — gerceklik-denetci'nin yorumHaritasi'nın aynısı
   (şablon içi hariç: içerik metindir, yorum değil). */
function yorumHaritasi(satirlar) {
  const out = new Array(satirlar.length).fill(false);
  let blok = false;
  satirlar.forEach((s, i) => {
    const t = s.trim();
    if (blok) { out[i] = true; if (t.includes('*/')) blok = false; return; }
    if (t.startsWith('//')) { out[i] = true; return; }
    if (t.startsWith('/*')) { out[i] = true; if (!t.includes('*/')) blok = true; }
  });
  return out;
}

const ihlaller = [];
function ihlalEkle(dosya, satirNo, kural, anahtar, deger, aciklama) {
  ihlaller.push({
    dosya, satirNo, kural, anahtar,
    ornek: deger.trim().slice(0, 100),
    aciklama,
  });
}

/** Bir değeri (§3.6: 25+ karakter, boşluklu) kurallara karşı sınar; ilk
 *  eşleşen kuralda durur (aynı cümle iki kez sayılmaz — emsalin `return`
 *  disiplini). */
function degerDenetle(dosya, satirNo, anahtar, deger, kurallar, satirlar, i) {
  const d = deger.trim();
  if (d.length < 25 || !/\s/.test(d)) return; // §3.6 etiket eşiği
  if (anahtarMuaf(anahtar)) return;
  if (satirMuaf(satirlar, i)) return;
  for (const k of kurallar) {
    if (k.re.test(d)) {
      ihlalEkle(dosya, satirNo, k.kod, anahtar, d, k.ad);
      return;
    }
  }
}

function denetle({ rel, tam, dil }) {
  const icerik = readFileSync(tam, 'utf8');
  const satirlar = icerik.split('\n');
  const yorum = yorumHaritasi(satirlar);
  const kurallar = dil === 'en' ? KURALLAR_EN : KURALLAR_TR;

  let currentKey = null;
  let inTemplate = false;
  let templateMuaf = false;

  satirlar.forEach((satir, i) => {
    /* Gerekçesiz muafiyet denemesi — yorum atlamasından ÖNCE koşmalı. */
    if (MUAF_BOS_RE.test(satir)) {
      ihlalEkle(rel, i + 1, 'MUAF', currentKey || '(bilinmiyor)', satir,
        'IHTIMAL-MUAF gerekçesiz yazılmış — muafiyetin bedeli nedenini yazmaktır');
      return;
    }

    if (inTemplate) {
      const kapanisIdx = satir.indexOf('`');
      if (kapanisIdx >= 0) {
        const oncesi = satir.slice(0, kapanisIdx);
        if (!templateMuaf) degerDenetle(rel, i + 1, currentKey, oncesi, kurallar, satirlar, i);
        inTemplate = false;
      } else if (!templateMuaf) {
        degerDenetle(rel, i + 1, currentKey, satir, kurallar, satirlar, i);
      }
      return;
    }

    if (yorum[i]) return; // şablon dışı yorum satırı — belge metni, kod değil

    const anahtarlar = [...satir.matchAll(ANAHTAR_KONUM_RE)];

    if (!anahtarlar.length) {
      // anahtarsız devam satırı (ör. çok satırlı dizi elemanı) — son
      // bilinen anahtarın bağlamında tırnaklı parçaları tara.
      if (currentKey && !anahtarMuaf(currentKey)) {
        for (const m of satir.matchAll(TIRNAK_RE)) {
          degerDenetle(rel, i + 1, currentKey, m[0].slice(1, -1), kurallar, satirlar, i);
        }
      }
      return;
    }

    // Satırı ardışık anahtar konumlarına göre segmentlere böl; her segment
    // bir SONRAKİ anahtara (ya da satır sonuna) kadar o anahtarın ham
    // içeriğidir — dizi (`[...]`), nesne (`{...}`) ya da düz tırnaklı değer
    // fark etmeksizin aynı mantıkla taranır.
    for (let idx = 0; idx < anahtarlar.length; idx++) {
      const m = anahtarlar[idx];
      const key = m[1] ?? m[2];
      currentKey = key;
      const basIdx = m.index + m[0].length;
      const bitIdx = idx + 1 < anahtarlar.length ? anahtarlar[idx + 1].index : satir.length;
      const segment = satir.slice(basIdx, bitIdx);

      const ilkBacktick = segment.indexOf('`');
      if (ilkBacktick >= 0 && tekBacktickSayisi(segment) % 2 === 1) {
        // segment içinde AÇILIP KAPANMAYAN backtick — çok satırlı şablonun
        // başlangıcı. Bu satırdaki SONRAKİ anahtarlar (varsa) yoksayılır —
        // kör nokta #3, banner'da belgeli.
        templateMuaf = anahtarMuaf(key);
        inTemplate = true;
        const oncesi = segment.slice(ilkBacktick + 1);
        if (!templateMuaf) degerDenetle(rel, i + 1, key, oncesi, kurallar, satirlar, i);
        break;
      }

      if (anahtarMuaf(key)) continue;
      for (const tm of segment.matchAll(TIRNAK_RE)) {
        degerDenetle(rel, i + 1, key, tm[0].slice(1, -1), kurallar, satirlar, i);
      }
    }
  });
}

/* ─── ÇALIŞTIR ─── */
const dosyalar = dosyaListesi();
for (const d of dosyalar) {
  try { denetle(d); } catch (e) { console.error(`✗ okunamadı: ${d.tam} → ${e?.message}`); process.exit(1); }
}

const modListe = process.argv.includes('--liste');
const modTabanYaz = process.argv.includes('--taban-yaz');

/* Dosya başına sayım — K7'nin taban çizgisi birimidir. */
const sayim = {};
for (const d of dosyalar) sayim[d.rel] = 0;
for (const x of ihlaller) sayim[x.dosya] = (sayim[x.dosya] || 0) + 1;

if (modTabanYaz) {
  const yeni = {
    _aciklama: 'İhtimalsel dil denetçisinin taban çizgisi (K7) — dosya başına ' +
      'bugünkü ihlal sayısı. Kapı bu sayının ARTMASINI yasaklar; azalması ' +
      'serbesttir ve her faz kendi dosyalarının tabanını --taban-yaz ile ' +
      'düşürür. Tümü 0 olduğunda kapı kendiliğinden sert 0-tolerans kapısına ' +
      'döner (K7).',
    ...sayim,
  };
  writeFileSync(TABAN_YOLU, JSON.stringify(yeni, null, 2) + '\n');
  console.log(`✓ taban yazıldı: ${TABAN_YOLU}`);
  for (const [dosya, n] of Object.entries(sayim)) console.log(`  ${dosya}: ${n}`);
  process.exit(0);
}

if (modListe) {
  if (!ihlaller.length) {
    console.log(`✓ ihtimalsel-denetçi: 0 ihlal (${dosyalar.length} dosya tarandı)`);
    process.exit(0);
  }
  const grup = {};
  for (const x of ihlaller) (grup[x.kural] ||= []).push(x);
  console.log(`${ihlaller.length} ihlal (${dosyalar.length} dosya tarandı):\n`);
  for (const [kural, xs] of Object.entries(grup)) {
    console.log(`  ── ${kural} (${xs.length}) ──`);
    for (const x of xs) {
      console.log(`  ${x.dosya}:${x.satirNo}  [${x.anahtar}]`);
      console.log(`      ${x.ornek}`);
      console.log(`      → ${x.aciklama}`);
    }
    console.log('');
  }
  process.exit(0);
}

/* ─── Varsayılan mod: TABAN ÇİZGİSİYLE karşılaştır (K7 regresyon kapısı) ───
   Taban dosyası yoksa ya da bir dosya orada hiç yoksa varsayılan 0'dır —
   bu, K7'nin "taban sıfırlandığında sert kapıya döner" kuralının kod
   karşılığıdır: eksik/0 taban = o dosyada HİÇBİR yeni ihlale izin yok. */
let taban = {};
try { taban = JSON.parse(readFileSync(TABAN_YOLU, 'utf8')); } catch (_) { /* taban henüz yok */ }

const regresyon = [];
for (const d of dosyalar) {
  const simdi = sayim[d.rel] || 0;
  const eski = taban[d.rel] ?? 0;
  if (simdi > eski) regresyon.push({ dosya: d.rel, eski, simdi });
}

if (regresyon.length) {
  console.error(`✗ ihtimalsel-denetçi: ${regresyon.length} dosyada taban çizgisi aşıldı\n`);
  for (const r of regresyon) {
    console.error(`  ${r.dosya}: taban ${r.eski} → şimdi ${r.simdi} (+${r.simdi - r.eski})`);
  }
  console.error('\n  Yeni bir kesinlik kalıbı mı yazıldı, yoksa bilinçli bir istisna mı?');
  console.error('  İstisnaysa satıra /* IHTIMAL-MUAF: gerekçe */ yaz, değilse cümleyi');
  console.error('  scripts/i18n-style/tr.md §2 ihtimalsellik araçlarıyla yumuşat.');
  console.error('  Ayrıntı için --liste bayrağını kullan.');
  process.exit(1);
} else {
  const toplam = Object.values(sayim).reduce((a, b) => a + b, 0);
  console.log(`✓ ihtimalsel-denetçi: temiz (${dosyalar.length} dosya, toplam ${toplam} ihlal, taban aşılmadı)`);
}
