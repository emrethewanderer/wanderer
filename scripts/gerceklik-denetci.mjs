#!/usr/bin/env node
/**
 * Wanderer AI — GERÇEKLİK DENETÇİSİ
 * "Uydurmayan uygulama" mimarisinin bekçisi (.claude/plans/gerceklik-mimarisi.md).
 *
 * Wanderer'ın verisi üç yerden gelir: kullanıcının BEYANI, uygulamanın ÖLÇÜMÜ,
 * LLM'in YORUMU. Bu denetçi, dördüncü hâlin — KÖKENSİZLİĞİN — sessizce bir
 * sayıya ya da bir alıntıya dönüşmesini engeller.
 *
 * Kullanım:
 *   node scripts/gerceklik-denetci.mjs           → denetle (ihlalde exit 1)
 *   node scripts/gerceklik-denetci.mjs --liste   → ihlalleri listele, exit 0
 *
 * MUAFİYET: bilinçli istisna, ihlalin geçtiği satırın kendisinde ya da bir üst
 * satırda şu yorumla beyan edilir:
 *     /* KOKEN-MUAF: gerekçe *​/
 * Gerekçesiz muafiyet de ihlaldir — muafiyetin bedeli nedenini yazmaktır.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * KAPININ GÖREMEDİĞİ (kör nokta defteri)
 *
 * Bu denetçi AVLAR: bilinen desenleri bir SÖZCÜK LİSTESİYLE arar. Gücü de
 * sınırı da buradan gelir — listede olmayan her kavram adı ona yeni bir kör
 * nokta açar. Bugüne dek iki kez elle yakalandı ve iki kez kural doğdu:
 *   · 2026-08-01 · `10q sc()` ternary ile gizlenmiş `50` → K1b doğdu
 *   · 2026-08-02 · `p6UpsertFact(…, confidence = 1)` parametre varsayılanı
 *     → K5 doğdu; ve `confidence` sözcüğü K1/K1b listesinde hiç yokmuş
 *
 * ŞU AN GÖREMEDİKLERİ — bilerek yazılıdır, çünkü bilinen bir kör nokta,
 * bilinmeyenden daha az tehlikelidir:
 *   1. Sözcük listesi dışı kavram adları. `alliance_strength = 50` ve
 *      `mood = 'parcali'` gibi kanıtsız varsayılanlar bu denetçiye HİÇ
 *      görünmedi; ikisini de davranışsal kapı buldu.
 *   2. Hesaplanmış varsayılanlar — `Math.round(x * 100)`, `(a + b) / 2`.
 *   3. Çalışma zamanında doğan değerler: DOM'dan okunan bir sayı
 *      (`getElementById('…').textContent || '0'`), takvimden türetilen bir
 *      "durum" (`Date.now() / 86400000 % n`). Bunlar statik olarak masum
 *      görünür; kanıtsızlıkları ancak KOŞARKEN belli olur.
 *
 * BU YÜZDEN İKİNCİ BİR KAPI VAR: tests/sifir-kanit-sinavi.test.js
 * O sınav avlamaz, çıktıya bakar: boş bir kullanıcıda state'in sayısal
 * varsayılanlarını, prompt yüzeylerinin sessizliğini ve kart yakınlığını
 * ölçer. Kavramın adı ne olursa olsun kanıtsız değeri yakalar.
 *
 * Buraya yeni bir kör nokta eklenirse: önce kural yazılabiliyor mu diye bak
 * (K1b ve K5 böyle doğdu), yazılamıyorsa sınava bir blok ekle. Kör noktayı
 * yalnız belgeleyip bırakmak, kapıyı gerçek olduğundan güçlü göstermektir.
 * ─────────────────────────────────────────────────────────────────────────
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, isAbsolute } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/* --dizin <yol>: kapının KENDİSİNİ sınamak için (tests/gerceklik-kapisi).
   Kapıyı test etmeyen kapı, kapı değildir. */
const _dizinArg = process.argv.indexOf('--dizin');
const TARAMA = _dizinArg >= 0 && process.argv[_dizinArg + 1]
  ? [process.argv[_dizinArg + 1]]
  : ['js/parts', 'js/state'];

const ihlaller = [];
function ihlal(dosya, satirNo, kural, satir, aciklama) {
  ihlaller.push({ dosya, satirNo, kural, satir: satir.trim().slice(0, 120), aciklama });
}

/* ─── Muafiyet ─── */
/* Gerekçe çok satırlı olabilir — kapanış `*​/` aynı satırda aranmaz. */
const MUAF_RE = /\/\*\s*KOKEN-MUAF:\s*(.+)/;
/** İhlal satırının kendisinde ya da hemen üstündeki yorum bloğunda gerekçeli
 *  muafiyet var mı? Pencere dar tutulur: uzaktaki bir muafiyet, alakasız bir
 *  ihlali sessizce örtmesin. */
const MUAF_PENCERE = 6;
function muaf(satirlar, i) {
  for (let j = Math.max(0, i - MUAF_PENCERE); j <= i; j++) {
    const m = (satirlar[j] || '').match(MUAF_RE);
    if (m && m[1] && m[1].replace(/\*\/\s*$/, '').trim().length >= 8) return true;
  }
  return false;
}
/** Gerekçesiz muafiyet denemesi (KOKEN-MUAF yazıp sebep yazmamak). */
const MUAF_BOS_RE = /\/\*\s*KOKEN-MUAF:?\s*(\*\/|$)/;

/* ─── KURAL 1 — kanıtsız sayısal varsayılan ───────────────────────────
   Bir skor/güven/seviye okunurken `?? 50` ya da `|| 0.6` ile varsayılana
   düşmek, ölçülmemiş bir şeyi ölçülmüş göstermektir. `|| 0` serbesttir:
   sıfır "yok" demektir ve eşiklerde zaten düşer. */
const K1_RE = /\b(score|guven|güven|skor|puan|level|seviye|confidence)\b[^;\n]{0,60}?(\?\?|\|\|)\s*(\d+(?:\.\d+)?)/i;

/* ─── KURAL 1b — ternary ile gizlenmiş varsayılan ─────────────────────
   `typeof o.score === 'number' ? o.score : 50` deseni K1'in kardeşidir ama
   `??`/`||` aramayan bir regex'e görünmez. Dikiş turunda tam böyle bir satır
   bulundu (10q sc()); zararsız çıktı, ama görünmez olması kabul edilemez —
   kapının kör noktası, kapının kendisinden tehlikelidir.
   `puan` bu kuralın dışında: repoda oy AĞIRLIĞI anlamında da kullanılıyor
   (`puan: alanEksen ? 0.5 : 1`) ve ternary ağırlık meşrudur — K1 onu `??`/`||`
   tarafında yine yakalar. */
const K1B_RE = /\b(score|guven|güven|skor|level|confidence)\b[^;\n]{0,70}\?[^;\n:]{0,70}:\s*(\d+(?:\.\d+)?)\s*[;,)]/i;

/* ─── KURAL 5 — atama ve parametre varsayılanı ─────────────────────────
   K1'in `??`/`||` tarafının ATAMA kardeşi. Bu delik 2026-08-02'de canlı
   yakalandı: `p6UpsertFact(category, value, confidence = 1)` aylardır
   duruyordu ve üç kural da onu görmüyordu — K1 `??`/`||` arıyor, K1b
   ternary arıyor, K2 yalnız state dosyalarına bakıyor.

   Kelime sınırı BİLEREK gevşek (`[\w$.]*…[\w$]*`): körlüğün asıl kaynağı
   `\b` idi. `optimal_challenge_level = 0.5` satırında `\blevel\b` sınır
   bulamaz (öncesinde `_` var, o da bir kelime karakteri) ve kavram gözden
   kaçar. Kural artık kavramı adın İÇİNDE de arar.

   `= 0` serbest — K1'deki gerekçeyle: sıfır "yok" demektir ve eşiklerde
   zaten düşer. `===`/`>=`/`<=` eşleşmez: aranan tek `=` işaretidir. */
const K5_RE = /[\w$.]*(score|guven|güven|skor|seviye|level|confidence)[\w$]*\s*=\s*(\d+(?:\.\d+)?)\s*[,);]/i;

/* ─── KURAL 6 — sayı bir ada saklanarak gizlenemez ─────────────────────
   `x.score ?? VARSAYILAN_SKOR` — K1 burada sayı görmez, bir tanımlayıcı
   görür ve susar. Sabitin KENDİ tanımı (`const KOKEN_ESIK = 3`) ihlal
   DEĞİLDİR: bir eşik ya da tavan, ölçünün kendisidir. İhlal olan, o sabite
   ölçüm yokluğunda DÜŞÜLMESİDİR — kural bu yüzden tanıma değil kullanıma
   bakar. (Repo bu kural yazılırken temizdi; kapı geleceği bekliyor.) */
const K6_RE = /\b(score|guven|güven|skor|level|seviye|confidence)\b[^;\n]{0,60}?(\?\?|\|\|)\s*([A-Z][A-Z0-9_]{2,})\b/i;

/* ─── KURAL 2 — state'te sabit başlangıç skoru ────────────────────────
   js/state/ içindeki bir slice `score: 50` ile doğuyorsa, "hiç ölçülmedi"
   ile "ölçüldü ve 50 çıktı" aynı değere düşer ve ayırt edilemez. */
const K2_RE = /\b(score|skor|guven|güven|puan)\s*:\s*(\d+(?:\.\d+)?)/i;

/* ─── KURAL 3 — kanıt iddiası olan yerde kapı yok ─────────────────────
   Bir modül LLM çıktısındaki `kanit` alanını okuyup kalıcılaştırıyorsa,
   o kanıtın kullanıcının gerçek cümlesine bağlandığı DOĞRULANMALIDIR.
   Aksi hâlde kullanıcı, hiç kurmadığı bir cümleyi kendi cümlesi sanır.
   Kural YALNIZ LLM çağıran modüllerde işler: `kanit` sözcüğü repoda i18n
   anahtarı ve iç etiket olarak da geçiyor ("ih.kanit.portre_alinti",
   kanit:'temel_enzayif') — onlar bir alıntı iddiası değildir. */
const K3_KANIT_RE = /\.kanit\b/;
const K3_KAPI_RE = /kokenAlinti|kokenYorum|kokenAlintiCoz/;
const K3_LLM_RE = /callLLM/;

/* ─── KURAL 4 — modelin kendi güveni kapı olamaz ───────────────────────
   (2026-08-02, Emre'nin itirazından doğdu.) Bir LLM'in JSON'a yazdığı
   `guven: 0.75` bir ÖLÇÜM değildir: kalibre edilmemiş bir öz-beyandır.
   Uydurulmuş bir iddiaya 0.9, doğru bir iddiaya 0.4 yazabilir. O sayıyı
   eşiğe vurmak kapı kurmaz — yalnız gerçek maddeleri rastgele düşürür,
   yani "ara sıra doğru" bir sistem üretir.

   Bu kural üç yerde canlıydı ve üçü de bu sprintte söküldü: 09e kör nokta
   (0.55), 09g hipotez (0.6), 09d örüntü (0.55). Denetçinin o güne dek
   göremediği hastalık buydu — K1 kanıtsız VARSAYILANI yakalıyordu ama
   kanıtsız EŞİĞİ değil.

   Doğru kapı kanıttır: `kokenAlinti` / `kokenAlintiCoz`. Bir güven sayısı
   gerçekten meşruysa (ör. kullanıcının kendi beyan ettiği kesinlik)
   satırında KOKEN-MUAF gerekçesiyle beyan edilir. */
const K4_KARS_RE = /(?<![A-Za-z0-9_çğıöşüÇĞİÖŞÜ])(guven|güven|confidence)\s*(>=|<=|>|<)/i;
const K4_SABIT_RE = /\b[A-Z][A-Z_]*(GUVEN|CONFIDENCE)_MIN\b\s*=/;

/** Blok yorumların devam satırları (`*` ile başlamayanlar dahil) belge
 *  metnidir, kod değil. Bu harita olmadan "burada bir GUVEN_MIN vardı"
 *  diye yazılmış bir açıklama satırı ihlal sayılırdı — kapı, kendi
 *  gerekçesini ihlal olarak okurdu. */
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
/* i18n sözlükleri ve prompt metinleri veri değil, metindir. */
const DICT_RE = /^js\/parts\/1[56][a-z]?-/;
/* Kanıtı kullanıcının ELİYLE yazdığı yüzeyler (beyan) bu kuralın dışındadır;
   beyan doğrulanmaz. Dosya bazında muafiyet, dosyanın ilk 40 satırındaki
   KOKEN-MUAF yorumuyla verilir. */

function jsDosyalari(dir) {
  const out = [];
  const tam = isAbsolute(dir) ? dir : join(ROOT, dir);
  let girisler = [];
  try { girisler = readdirSync(tam); } catch (_) { return out; }
  for (const ad of girisler) {
    const p = join(tam, ad);
    if (statSync(p).isDirectory()) { out.push(...jsDosyalari(join(dir, ad))); continue; }
    if (ad.endsWith('.js')) out.push(p);
  }
  return out;
}

function denetle(dosyaYolu) {
  const rel = relative(ROOT, dosyaYolu);
  const icerik = readFileSync(dosyaYolu, 'utf8');
  const satirlar = icerik.split('\n');
  const stateDosyasi = rel.includes('js/state/') || /(^|\/)state[/\\]/.test(rel);
  const baslik = satirlar.slice(0, 40).join('\n');
  const dosyaMuaf = MUAF_RE.test(baslik);

  if (DICT_RE.test(rel)) return; // sözlük dosyası — içindeki "kanit" bir anahtar adı

  // KURAL 3 — dosya düzeyinde, yalnız LLM çağıran modüllerde
  if (K3_KANIT_RE.test(icerik) && K3_LLM_RE.test(icerik) && !K3_KAPI_RE.test(icerik) && !dosyaMuaf) {
    const i = satirlar.findIndex(s => K3_KANIT_RE.test(s));
    // Muafiyet dosya başında ya da ihlalin geçtiği satırda beyan edilebilir —
    // gerekçe okunacağı yerde dursun.
    if (i >= 0 && !muaf(satirlar, i)) {
      ihlal(rel, i + 1, 'K3', satirlar[i] || '',
        'LLM kanıtı okunuyor ama kokenAlinti/kokenYorum kapısı yok — uydurulmuş alıntı kalıcılaşabilir');
    }
  }

  const yorum = yorumHaritasi(satirlar);

  satirlar.forEach((satir, i) => {
    /* Gerekçesiz muafiyet denemesi yorumun İÇİNDE yaşar — bu kontrol
       yorum atlamasından ÖNCE koşmalı, yoksa hiç görülmez. */
    if (MUAF_BOS_RE.test(satir)) {
      ihlal(rel, i + 1, 'MUAF', satir, 'KOKEN-MUAF gerekçesiz yazılmış — muafiyetin bedeli nedenini yazmaktır');
      return;
    }

    // yorum satırlarını atla (belge metni ihlal sayılmasın)
    if (yorum[i]) return;

    const m1 = satir.match(K1_RE);
    if (m1 && parseFloat(m1[3]) > 0 && !muaf(satirlar, i)) {
      ihlal(rel, i + 1, 'K1', satir,
        `kanıtsız varsayılan (${m1[2]} ${m1[3]}) — ölçüm yoksa değer null olmalı, sayıya düşmemeli`);
      return;
    }

    const m1b = satir.match(K1B_RE);
    if (m1b && parseFloat(m1b[2]) > 0 && !muaf(satirlar, i)) {
      ihlal(rel, i + 1, 'K1b', satir,
        `ternary ile gizlenmiş varsayılan (: ${m1b[2]}) — kanıt yoksa değer null olmalı`);
      return;
    }

    if (K4_KARS_RE.test(satir) && !muaf(satirlar, i)) {
      ihlal(rel, i + 1, 'K4', satir,
        'modelin kendi güven sayısı eşiğe vuruluyor — bu bir ölçüm değil öz-beyandır; kapı kanıt olmalı (kokenAlinti/kokenAlintiCoz)');
      return;
    }

    if (K4_SABIT_RE.test(satir) && !muaf(satirlar, i)) {
      ihlal(rel, i + 1, 'K4', satir,
        'güven eşiği sabiti tanımlanmış — LLM\'in yazdığı güven kapı olamaz; maddeyi kanıta bağla');
      return;
    }

    /* Sabitin KENDİ tanımı ihlal değildir (K6'daki gerekçenin aynısı): bir
       eşik ya da tavan ölçünün kendisidir, ölçümün varsayılanı değil.
       `const OLUS_SKOR_SICRAMA = 8` bir iddia üretmez — iddia, ölçüm
       yokken o sabite DÜŞÜLMESİDİR ve onu K6 yakalar. */
    const _sabitTanimi = /^\s*(?:export\s+)?const\s+[A-Z][A-Z0-9_]*\s*=/.test(satir);

    const m5 = satir.match(K5_RE);
    if (m5 && !_sabitTanimi && parseFloat(m5[2]) > 0 && !muaf(satirlar, i)) {
      ihlal(rel, i + 1, 'K5', satir,
        `atama/parametre varsayılanı (= ${m5[2]}) — ölçüm yoksa değer null olmalı, sayıya düşmemeli`);
      return;
    }

    /* Sabit gerçekten SABİT mi: regex `i` bayrağıyla koştuğu için `|| null`
       ve `|| new Date()` gibi küçük harfli sözcükleri de yakalıyordu. Bir
       tanımlayıcının sabit olduğunun ölçüsü büyük harfle yazılmasıdır. */
    const m6 = satir.match(K6_RE);
    if (m6 && m6[3] === m6[3].toUpperCase() && !muaf(satirlar, i)) {
      ihlal(rel, i + 1, 'K6', satir,
        `varsayılan bir SABİTE düşülüyor (${m6[2]} ${m6[3]}) — sayıyı bir ada saklamak onu kanıt yapmaz`);
      return;
    }

    if (stateDosyasi) {
      const m2 = satir.match(K2_RE);
      if (m2 && parseFloat(m2[2]) > 0 && !muaf(satirlar, i)) {
        ihlal(rel, i + 1, 'K2', satir,
          `state'te sabit başlangıç skoru (${m2[1]}: ${m2[2]}) — "ölçülmedi" ile "ölçüldü" ayırt edilemez hâle gelir`);
      }
    }
  });
}

/* ─── ÇALIŞTIR ─── */
const dosyalar = TARAMA.flatMap(jsDosyalari);
for (const d of dosyalar) {
  try { denetle(d); } catch (e) { console.error(`✗ okunamadı: ${d} → ${e?.message}`); process.exit(1); }
}

const liste = process.argv.includes('--liste');

if (ihlaller.length) {
  const grup = {};
  for (const x of ihlaller) (grup[x.kural] ||= []).push(x);
  console.error(`✗ gerçeklik-denetçi: ${ihlaller.length} ihlal (${dosyalar.length} dosya tarandı)\n`);
  for (const [kural, xs] of Object.entries(grup)) {
    console.error(`  ── ${kural} (${xs.length}) ──`);
    for (const x of xs) {
      console.error(`  ${x.dosya}:${x.satirNo}`);
      console.error(`      ${x.satir}`);
      console.error(`      → ${x.aciklama}`);
    }
    console.error('');
  }
  console.error('  Bilinçli istisna ise satıra /* KOKEN-MUAF: gerekçe */ yaz.');
  if (!liste) process.exit(1);
} else {
  console.log(`✓ gerçeklik-denetçi: temiz (${dosyalar.length} dosya) — kanıtsız değer üreten kod yok`);
}
