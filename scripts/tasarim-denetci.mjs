#!/usr/bin/env node
/**
 * Wanderer AI — TASARIM DENETÇİSİ
 * `TASARIM-PRENSIPLERI.md`'nin ölçülebilir maddelerinin bekçisi.
 *
 * Bu kapı 2026-08-28'de, bir ölçümün sonucunda doğdu. Resend'in yüzeyi
 * incelenip "onlardan ne alalım?" diye bakıldığında çıkan cevap şuydu: en çok
 * işe yarayacak üç tekniğin üçü de anayasada ZATEN YAZILIYDI ve uygulanmamıştı.
 *   · §3 "çizgiler kenarlara doğru erir" → mask-image kullanımı: 0
 *   · §5 "prefers-reduced-motion zorunludur, istisnasız" → 6 dosya korumasız
 *   · §8 "z-index daima token'dan" → 27 çıplak global katman sayısı
 *
 * Kök neden dikkatsizlik değil, YAPISALDI: repoda çalışan altı kapı vardı
 * (gerceklik, ihtimalsel, bagsiz-ad, yetim-kopru, dil-buyuk-harf,
 * gren-kaydirma) — hepsi bir kurala bağlı, hepsi vitest'i kırıyor. Tasarım
 * anayasası hiçbirine bağlı değildi. **Kapısı olmayan kural, zamanla
 * tavsiyeye döner.** Bu dosya o boşluğu kapatır.
 *
 * Kullanım:
 *   node scripts/tasarim-denetci.mjs           → denetle (ihlalde exit 1)
 *   node scripts/tasarim-denetci.mjs --liste   → ihlalleri listele, exit 0
 *   node scripts/tasarim-denetci.mjs --taban-yaz → T7 taban çizgisini
 *       bugünkü hâle çek (banner yazıldıkça liste küçülür)
 *
 * MUAFİYET: bilinçli istisna, ihlalin geçtiği satırda ya da en fazla 6 satır
 * yukarıdaki yorumda beyan edilir:
 *     /* TASARIM-MUAF: gerekçe *​/
 * Gerekçesiz muafiyet de ihlaldir — muafiyetin bedeli nedenini yazmaktır.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * KAPININ GÖREMEDİĞİ (kör nokta defteri)
 *
 * Bu denetçi CSS KAYNAĞINI ve JS içindeki stil üretimini okur, sözdizimsel
 * desen arar. Sınırları:
 *
 *   1. ~~JS içine gömülü stiller~~ → 2026-08-28'de KAPATILDI. Denetçi artık
 *      `js/` altını da tarar: şablon dizesindeki CSS (`kkEnsureStyles`
 *      deseni), `style.cssText` atamaları ve `style.zIndex` property'si.
 *      Orada T1/T2/T3 koşar. T4 ve T5 CSS'e özeldir — şablon dizesinde ve
 *      tek satırlık `cssText`te blok sınırı güvenilmez, blok bazlı bir
 *      kuralı oraya taşımak yanlış pozitif üretir.
 *   2. ~~§4 Türkçe büyük harf~~ → 2026-08-28'de KAPATILDI, ama sanılan yerden
 *      değil: 215 `text-transform: uppercase`ın tek tek denetlenmesi gerekmiyor
 *      çünkü büyütmenin locale'i **kökten** gelir. Korunacak tek şey
 *      `<html lang>` senkronu — `dil-buyuk-harf-kapisi.test.js` "CSS kolu".
 *   3. Anlam yargısının KENDİSİ — metaforun DOĞRU seçilip seçilmediği, yüzeyin
 *      "düz kalıp kalmadığı", bir anın toast mı tören mi olduğu. Bunlar
 *      avlanamaz. Ama VARLIK ölçülebilir ve T7 onu ölçer: banner'ın olup
 *      olmadığına bakar, banner'da yazanın doğruluğuna değil.
 *   4. Inline `style="…"` öznitelikleri (_src.html'in kendi öznitelikleri).
 *   5. Bir kuralın DAVRANIŞI. T2 "dosyada reduced-motion bloğu var mı" diye
 *      bakar; o bloğun doğru animasyonu durdurup durdurmadığına bakmaz.
 *
 * Buraya yeni bir kör nokta eklenirse: önce kural yazılabiliyor mu diye bak,
 * yazılamıyorsa "yargıya bırakıldı" diye anayasaya yaz. Kör noktayı yalnız
 * belgeleyip bırakmak, kapıyı gerçek olduğundan güçlü göstermektir.
 * ─────────────────────────────────────────────────────────────────────────
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, isAbsolute } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/* --dizin <yol>: kapının KENDİSİNİ sınamak için (tests/tasarim-kapisi).
   Kapıyı test etmeyen kapı, kapı değildir. */
const _dizinArg = process.argv.indexOf('--dizin');
const TARAMA = _dizinArg >= 0 && process.argv[_dizinArg + 1]
  ? [process.argv[_dizinArg + 1]]
  : ['css', 'js'];

const ihlaller = [];
function ihlal(dosya, satirNo, kural, satir, aciklama) {
  ihlaller.push({ dosya, satirNo, kural, satir: String(satir).trim().slice(0, 120), aciklama });
}

/** Uzantıya göre dosya toplar. `.css` ve `.js` ayrı denetim kollarına gider:
 *  CSS'te beş kural da koşar, JS'te yalnız T1/T2/T3 (bkz. kör nokta 1). */
function dosyalar(dir, uzanti) {
  /* --dizin ile gelen geçici yol MUTLAKTIR; join() onu göreli sayıp ROOT'un
     altına gömerdi ve kapının kendi testi hiçbir dosya bulamazdı. */
  const tam = isAbsolute(dir) ? dir : join(ROOT, dir);
  let st; try { st = statSync(tam); } catch (_) { return []; }
  if (st.isFile()) return tam.endsWith(uzanti) ? [tam] : [];
  return readdirSync(tam).flatMap(ad => {
    const p = join(tam, ad);
    let s; try { s = statSync(p); } catch (_) { return []; }
    if (s.isDirectory()) return dosyalar(join(dir, ad), uzanti);
    return ad.endsWith(uzanti) ? [p] : [];
  });
}

/* ─── Muafiyet ─── */
/* Gerekçe çok satırlı olabilir — kapanış `*​/` aynı satırda aranmaz. */
const MUAF_RE = /\/\*\s*TASARIM-MUAF:\s*(.+)/;
/** Pencere dar tutulur: uzaktaki bir muafiyet, alakasız bir ihlali sessizce
 *  örtmesin. Emsal ve gerekçe: gerceklik-denetci.mjs (6 satır). */
const MUAF_PENCERE = 6;
function muaf(satirlar, i) {
  for (let j = Math.max(0, i - MUAF_PENCERE); j <= i; j++) {
    const m = (satirlar[j] || '').match(MUAF_RE);
    if (m && m[1] && m[1].replace(/\*\/\s*$/, '').trim().length >= 8) return true;
  }
  return false;
}

/** Blok yorumların satır haritası. Bu harita olmadan kapı KENDİ gerekçesini
 *  ihlal olarak okurdu: "burada z-index 9658 vardı" diye yazılmış bir
 *  açıklama satırı T1'i tetiklerdi.
 *  `satirYorumu` yalnız JS kolunda açılır — CSS'te `//` bir yorum değildir. */
function yorumHaritasi(satirlar, satirYorumu = false) {
  const out = new Array(satirlar.length).fill(false);
  let blok = false;
  satirlar.forEach((s, i) => {
    const t = s.trim();
    if (blok) { out[i] = true; if (t.includes('*/')) blok = false; return; }
    if (satirYorumu && t.startsWith('//')) { out[i] = true; return; }
    if (t.startsWith('/*') || t.startsWith('*')) {
      out[i] = true; if (t.startsWith('/*') && !t.includes('*/')) blok = true;
    }
  });
  return out;
}

/* ═══════════════════════════════════════════════════════════════════════
   T1 — z-index daima token'dan (§8)
   ───────────────────────────────────────────────────────────────────────
   Katman sırası tek yerden yönetilir; `base.css`'te 20 basamaklı bir
   `--z-*` merdiveni zaten var. Çıplak bir sayı o merdivenin dışına kaçar
   ve iki ekran birbirinin üstüne biner — repoda `--z-ceremony` (9650) ile
   `--z-toast` (9999) arasına elle serpilmiş 9655/9658/9660/9670/9700/9710
   tam olarak bu kaçışın izidir.

   EŞİK 20: yerel stacking context'teki küçük sayılar (repoda 100+ kullanım)
   ihlal sayılmaz — bir kartın kendi içindeki `z-index: 2`, bir modalın
   kapatma butonundaki `z-index: 10` global katman savaşı değil, komşu iki
   çocuğun sırasıdır. Ölçü merdivenin kendisinden alındı: ilk GLOBAL basamak
   `--z-topbar: 40`; altındaki her şey bir kabın iç sırası sayılır.
   (İlk koşuda eşik 10'du ve 5 yerel vaka gürültü olarak geldi — kapı
   gürültü üretirse töreve döner, o yüzden daraltıldı.)
   Negatif değerler de serbest (zeminin altı). */
const T1_RE = /z-index\s*:\s*(-?\d+)/;
const T1_ESIK = 20;

/* ═══════════════════════════════════════════════════════════════════════
   T2 — prefers-reduced-motion zorunludur (§5, "istisnasız")
   ───────────────────────────────────────────────────────────────────────
   Vestibüler duyarlılığı olan bir kullanıcı için hareket bir tercih değil,
   bir engeldir. Kural dosya düzeyinde ölçülür: bir CSS dosyası `@keyframes`
   tanımlıyorsa, o dosyada en az bir `prefers-reduced-motion` bloğu olmalı.

   Bu ölçü kaba — animasyonun BAŞKA dosyada korunmuş olması mümkün (kör
   nokta 5). Yanlış pozitif çıkarsa `TASARIM-MUAF` ile gerekçesi yazılır;
   gerekçe yazmak, korumayı unutmaktan ucuzdur. */
const T2_KF_RE = /@keyframes\s+([\w-]+)/;
const T2_KORUMA_RE = /prefers-reduced-motion/;

/* ═══════════════════════════════════════════════════════════════════════
   T3 — ev eğrisi token'dır, kopyalanmaz (§5)
   ───────────────────────────────────────────────────────────────────────
   `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)` tüm giriş/geçiş hareketinin
   standart dilidir ve repoda 316 yerde doğru kullanılıyor. Aynı eğriyi elle
   yazmak token'ı ikizler: eğri bir gün ayarlanırsa kopyalar eski değerde
   kalır ve uygulama iki ayrı hızda hareket etmeye başlar.

   Kural YALNIZ ev eğrisinin BİREBİR kopyasını yakalar. Başka bir eğri
   (spring, ease-in-back) meşru olabilir — onu yasaklamak tasarım kararını
   kapıya devretmek olurdu.

   İKİ MUAFİYET, ikisi de ilk koşuda öğrenildi (14 ihlalin 13'ü yanlış
   pozitifti — kapı gürültü üretirse töreve döner):
     1. `var(--ease-out, cubic-bezier(.16,1,.3,1))` bir FALLBACK'tir, kopya
        değil. Token asıldır; eğri yalnız token düşerse devreye girer ve
        §5.2'nin savunmacı stil kuralının ta kendisidir.
     2. Token'ın KENDİ tanımı (`--ease-out: cubic-bezier(…)`) ihlal olamaz —
        kaynağın kendisi kopyası sayılırsa kapı kendi zeminini yer.
        (Emsal: gerceklik-denetci.mjs'in `_sabitTanimi` muafiyeti.) */
const T3_RE = /cubic-bezier\(\s*0?\.16\s*,\s*1\s*,\s*0?\.3\s*,\s*1\s*\)/;
/* Satır başına bağlanamaz: token tanımı `:root { --ease-out: … }` biçiminde
   tek satırda da yazılır ve `^` orada eşleşmez (ilk koşuda yakalandı). */
const T3_MESRU_RE = /var\(\s*--ease|--[\w-]*ease[\w-]*\s*:\s*cubic-bezier/;

/* ═══════════════════════════════════════════════════════════════════════
   T4 — altın/lapis zeminin mürekkebi token'dır (§1)
   ───────────────────────────────────────────────────────────────────────
   Metin hiyerarşisi "sıcak fildişi → sıcak gri" kademeleridir, asla nötr
   değil; altın yüzey ÜZERİNDEKİ koyu mürekkep için `--gold-ink: #1A1206`
   token'ı zaten tanımlı. Saf `#000` o sıcak skalanın dışına düşer — altın
   üstünde mürekkep gibi değil, delik gibi okunur.

   Blok bazlı kural: aynı kural bloğunda hem altın/lapis dolgu hem çıplak
   siyah metin varsa ihlal. */
const T4_DOLGU_RE = /background(-color)?\s*:[^;]*var\(--(gold|lapis|bronze)/;
const T4_MUREKKEP_RE = /(^|[^-\w])color\s*:\s*#0{3,6}\b/;

/* ═══════════════════════════════════════════════════════════════════════
   T5 — display serif sıkılaşır (§4)
   ───────────────────────────────────────────────────────────────────────
   Fraunces optik boyutlu bir display serifidir: 28px üstünde nötr harf
   aralığıyla dizildiğinde "büyütülmüş gövde metni" gibi okunur, başlık
   gibi değil. Bu kural 2026-08-28'de elle taranarak bulundu (5 başlık, biri
   POZİTİF .2px aralıkla diziliydi); kapı, aynı taramanın bir daha elle
   yapılmaması için var.

   Ölçü: blokta `--serif-display` + `font-size ≥28px` varsa `letter-spacing`
   de olmalı. Değeri kapı denetlemez — bir tören başlığının bilinçli olarak
   geniş dizilmesi meşrudur; denetlenen şey KARARIN VERİLMİŞ olmasıdır. */
const T5_FONT_RE = /--serif-display/;
const T5_BOYUT_RE = /font-size\s*:\s*([^;]+)/;
const T5_ARALIK_RE = /letter-spacing\s*:/;
const T5_ESIK = 28;

/* ═══════════════════════════════════════════════════════════════════════
   T7 — modül banner'ı: yüzey adlandırılmadan doğmaz (§5.1 + §0.1)
   ───────────────────────────────────────────────────────────────────────
   §0.1 der ki: "yeni yüzey açarken hangi derin metaforu konuştuğunu modül
   banner'ının FELSEFE satırına yaz — adlandıramıyorsan yüzey henüz
   tasarlanmamıştır." Bu, belgenin "yargıya bırakılan" maddelerinden biriydi;
   metaforun DOĞRULUĞU gerçekten yargıdır ve avlanamaz. Ama VARLIĞI değil:
   bir modülün banner'ı ya vardır ya yoktur.

   Ölçüm (2026-08-28): 122 modülün 80'inde FELSEFE satırı var, 42'sinde yok.
   O 42'yi bir gecede yazmak bu sprintin işi değil — ve olsaydı da yazılan
   şey tören olurdu, yüzeyi tasarlayan kişinin cümlesi değil. Bu yüzden kapı
   BORCU KAPATMAZ, BÜYÜMESİNİ DURDURUR: taban listesi bugünkü 42'yi tolere
   eder, 43'üncüsüne izin vermez.

   Emsal: ihtimalsel-denetci.mjs'in taban çizgisi (K7). Listeden bir dosya
   çıkarmak (banner yazmak) serbesttir; `--taban-yaz` onu kayda geçirir.
   Liste boşaldığında kapı kendiliğinden sert kapıya döner. */
const T7_BANNER_RE = /FELSEFE/;
const T7_TABAN_YOL = join(ROOT, 'scripts/tasarim-taban.json');
let t7Taban = new Set();
try {
  t7Taban = new Set(JSON.parse(readFileSync(T7_TABAN_YOL, 'utf8')).bannersiz || []);
} catch (_) { /* taban yoksa (kapının kendi testi) boş küme = sert kapı */ }
const t7Bulunan = [];

/* ═══════════════════════════════════════════════════════════════════════
   T8 — tanımsız token yoktur (hayalet avı)
   ───────────────────────────────────────────────────────────────────────
   Tanımsız bir `var(--x)` HATA VERMEZ: CSS onu geçersiz sayar ve özellik
   ya inherit edilir ya başlangıç değerine düşer. Yani yanlış renk değil,
   TESADÜFİ renk üretir — ve renk anayasası olan bir üründe tesadüf,
   yanlıştan tehlikelidir çünkü kimse fark etmez. Hover kurallarında
   özellikle sinsi: geçersiz `color` elemanın kendi normal rengine değil,
   PARENT'ın rengine düşer.

   Bu kural iki kez ödendi:
     · 2026-08-25 · `--text-light` / `--text-high` hiç doğmamıştı (14 kullanım).
       O gün hafızaya "kapı eklendi" diye yazıldı — ama kapı hiç yazılmamıştı
       ve token'lar 2026-08-28'de HÂLÂ tanımsızdı. Yazılı olan uygulanmamıştı;
       bu denetçinin varlık sebebinin ta kendisi.
     · 2026-08-28 · bu denetçiyi yazan tur, `--z-meclis-toren`'i tanımlamadan
       kullandı. Kapı kendi yazarını da yakalar.

   Kural YALNIZ fallbacksiz kullanımı arar: `var(--x, #fff)` yazan biri
   eksikliği zaten öngörmüştür — orada tesadüf yok, karar var.
   Tanım üç yerde olabilir ve üçü de sayılır: CSS bildirimi, JS'in
   `setProperty('--x', …)` çağrısı, ve şablon/inline stildeki `--x:`. */
const T8_KULLANIM_RE = /var\(\s*(--[a-zA-Z0-9_-]+)\s*\)/g;
const T8_TANIM_RE = /(--[a-zA-Z0-9_-]+)\s*:/g;
const T8_SETPROP_RE = /setProperty\(\s*['"`](--[a-zA-Z0-9_-]+)['"`]/g;
const t8Kullanim = new Map();   /* token → {dosya, satirNo, satir} ilk görülen */
const t8Tanim = new Set();

function t8Topla(rel, satirlar, yorum) {
  satirlar.forEach((satir, i) => {
    if (yorum[i]) return;
    for (const m of satir.matchAll(T8_TANIM_RE)) t8Tanim.add(m[1]);
    for (const m of satir.matchAll(T8_SETPROP_RE)) t8Tanim.add(m[1]);
    for (const m of satir.matchAll(T8_KULLANIM_RE)) {
      if (!t8Kullanim.has(m[1]) && !muaf(satirlar, i)) {
        t8Kullanim.set(m[1], { dosya: rel, satirNo: i + 1, satir });
      }
    }
  });
}

/** `font-size` değerinden en büyük px'i çıkarır. `clamp(22px, 4vw, 30px)`
 *  → 30: clamp'in üst sınırı, başlığın geniş ekranda alacağı boydur ve
 *  sıkılaşma asıl orada gerekir. */
function enBuyukPx(deger) {
  const hits = [...String(deger).matchAll(/(\d+(?:\.\d+)?)px/g)].map(m => parseFloat(m[1]));
  return hits.length ? Math.max(...hits) : 0;
}

/** CSS'i kaba biçimde bloklara ayırır: her `{ … }` bir blok, satır
 *  numaralarıyla. Gerçek bir CSS parser değildir ve olmasına gerek yok —
 *  aranan desenler tek kural bloğunun içinde yaşar. At-rule blokları
 *  (`@media`) kendi deklarasyonu olmadığı için doğal olarak boş geçer. */
function bloklar(satirlar, yorum) {
  const out = [];
  const yigin = [];   /* iç içe bloklar: @media > kural > … */
  satirlar.forEach((ham, i) => {
    if (yorum[i]) return;
    const s = ham.replace(/\/\*.*?\*\//g, '');
    /* Satırı süslü parantezlerden BÖLEREK gez: tek satırlık bir kuralda
       (`.a { color: #000; }`) blok aynı satırda açılıp kapanır ve satır-sonu
       toplama yapan bir döngü onu BOŞ bırakırdı — ilk koşuda T4/T5 hiçbir
       şey yakalayamamasının sebebi buydu. */
    for (const p of s.split(/([{}])/)) {
      if (p === '{') { yigin.push({ bas: i, satirlar: [] }); continue; }
      if (p === '}') { const b = yigin.pop(); if (b) out.push(b); continue; }
      const mevcut = yigin[yigin.length - 1];
      if (mevcut && p.trim()) mevcut.satirlar.push({ no: i, metin: p });
    }
  });
  while (yigin.length) out.push(yigin.pop());
  return out;
}

function denetle(dosyaTam) {
  const rel = relative(ROOT, dosyaTam);
  const kaynak = readFileSync(dosyaTam, 'utf8');
  const satirlar = kaynak.split('\n');
  const yorum = yorumHaritasi(satirlar);
  t8Topla(rel, satirlar, yorum);

  /* ── T2: dosya düzeyi ── */
  const kfSatir = satirlar.findIndex((s, i) => !yorum[i] && T2_KF_RE.test(s));
  if (kfSatir >= 0 && !T2_KORUMA_RE.test(kaynak) && !muaf(satirlar, kfSatir)) {
    const adet = satirlar.filter((s, i) => !yorum[i] && T2_KF_RE.test(s)).length;
    ihlal(rel, kfSatir + 1, 'T2', satirlar[kfSatir],
      `dosyada ${adet} @keyframes var ama prefers-reduced-motion bloğu yok — §5 bu kuralı "istisnasız" yazar`);
  }

  /* ── T1 / T3: satır düzeyi ── */
  satirlar.forEach((satir, i) => {
    if (yorum[i]) return;

    const m1 = satir.match(T1_RE);
    if (m1 && !/var\(--z/.test(satir)) {
      const v = parseInt(m1[1], 10);
      if (v >= T1_ESIK && !muaf(satirlar, i)) {
        ihlal(rel, i + 1, 'T1', satir,
          `z-index ${v} çıplak — katman sırası tek yerden yönetilir; base.css'teki --z-* merdivenine bir basamak ekle ve onu iç`);
      }
    }

    if (T3_RE.test(satir) && !T3_MESRU_RE.test(satir) && !muaf(satirlar, i)) {
      ihlal(rel, i + 1, 'T3', satir,
        'ev eğrisi elle yazılmış — var(--ease-out) kullan; kopya, token bir gün ayarlanınca eski hızda kalır');
    }
  });

  /* ── T4 / T5: blok düzeyi ── */
  for (const blok of bloklar(satirlar, yorum)) {
    const metin = blok.satirlar.map(x => x.metin).join('\n');

    if (T4_DOLGU_RE.test(metin) && T4_MUREKKEP_RE.test(metin)) {
      const hedef = blok.satirlar.find(x => T4_MUREKKEP_RE.test(x.metin));
      if (hedef && !muaf(satirlar, hedef.no)) {
        ihlal(rel, hedef.no + 1, 'T4', hedef.metin,
          'altın/lapis dolgunun üstünde çıplak #000 — sıcak skalada delik gibi okunur; var(--gold-ink) kullan');
      }
    }

    if (T5_FONT_RE.test(metin) && !T5_ARALIK_RE.test(metin)) {
      const mb = metin.match(T5_BOYUT_RE);
      const px = mb ? enBuyukPx(mb[1]) : 0;
      if (px >= T5_ESIK) {
        const hedef = blok.satirlar.find(x => T5_BOYUT_RE.test(x.metin)) || blok.satirlar[0];
        if (hedef && !muaf(satirlar, hedef.no)) {
          ihlal(rel, hedef.no + 1, 'T5', hedef.metin,
            `display serif ${px}px ama letter-spacing kararı yok — var(--ls-display) ver (bilinçli genişse onu yaz)`);
        }
      }
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   JS KOLU — stil, CSS dosyasında bitmez
   ───────────────────────────────────────────────────────────────────────
   14 modül stilini JS'te üretir (`kkEnsureStyles` deseni: şablon dizesinde
   CSS + `<style>` enjeksiyonu), bir kısmı da katmanı doğrudan property'den
   verir (`overlay.style.zIndex = '775'`). İlk yazımda bu kol yoktu ve
   defterde "kör nokta 1" olarak duruyordu; 2026-08-28'de ölçüldüğünde
   orada 25 çıplak katman değeri çıktı — kapının göremediği yer, kuralın
   en çok delindiği yerdi.

   Burada T1/T2/T3 koşar. T4 ve T5 blok bazlıdır ve CSS'e özel kalır:
   tek satırlık bir `cssText` atamasında blok sınırı yoktur, blok kuralını
   oraya taşımak yanlış pozitif üretir. */
const T1_JS_PROP_RE = /\.zIndex\s*=\s*['"`]?(-?\d+)/;

function denetleJs(dosyaTam) {
  const rel = relative(ROOT, dosyaTam);
  const kaynak = readFileSync(dosyaTam, 'utf8');
  const satirlar = kaynak.split('\n');
  const yorum = yorumHaritasi(satirlar, true);
  t8Topla(rel, satirlar, yorum);

  /* T7 — yalnız js/parts modülleri; alt klasörler ve kök dosyalar hariç. */
  if (/^js\/parts\/[^/]+\.js$/.test(rel)) {
    if (!T7_BANNER_RE.test(kaynak)) {
      t7Bulunan.push(rel);
      if (!t7Taban.has(rel) && !muaf(satirlar, 0)) {
        ihlal(rel, 1, 'T7', satirlar[0] || rel,
          "modül banner'ında FELSEFE satırı yok — §0.1: yüzeyin hangi derin metaforu konuştuğu banner'a yazılır; adlandıramıyorsan yüzey henüz tasarlanmamıştır");
      }
    }
  }

  /* T2 — dosya, stil ÜRETİYORSA (yalnız `@keyframes` yazan bir modül) o
     stilin koruması da aynı dosyada olmalı. */
  const kfSatir = satirlar.findIndex((s, i) => !yorum[i] && T2_KF_RE.test(s));
  if (kfSatir >= 0 && !T2_KORUMA_RE.test(kaynak) && !muaf(satirlar, kfSatir)) {
    const adet = satirlar.filter((s, i) => !yorum[i] && T2_KF_RE.test(s)).length;
    ihlal(rel, kfSatir + 1, 'T2', satirlar[kfSatir],
      `JS'te üretilen stilde ${adet} @keyframes var ama prefers-reduced-motion yok — §5 "istisnasız"`);
  }

  satirlar.forEach((satir, i) => {
    if (yorum[i]) return;

    /* T1 — iki varyant: CSS metnindeki `z-index:NNN` ve property ataması. */
    for (const re of [T1_RE, T1_JS_PROP_RE]) {
      const m = satir.match(re);
      if (!m || /var\(--z/.test(satir)) continue;
      const v = parseInt(m[1], 10);
      if (v >= T1_ESIK && !muaf(satirlar, i)) {
        ihlal(rel, i + 1, 'T1', satir,
          `z-index ${v} çıplak (JS'te üretilen stil) — base.css'teki --z-* merdivenine bir basamak ekle ve onu iç`);
      }
      break;
    }

    if (T3_RE.test(satir) && !T3_MESRU_RE.test(satir) && !muaf(satirlar, i)) {
      ihlal(rel, i + 1, 'T3', satir,
        'ev eğrisi elle yazılmış (JS\'te üretilen stil) — var(--ease-out) kullan');
    }
  });
}

/* ─── ÇALIŞTIR ─── */
const cssler = TARAMA.flatMap(d => dosyalar(d, '.css'));
const jsler = TARAMA.flatMap(d => dosyalar(d, '.js'));
for (const d of cssler) {
  try { denetle(d); } catch (e) { console.error(`✗ okunamadı: ${d} → ${e?.message}`); process.exit(1); }
}
for (const d of jsler) {
  try { denetleJs(d); } catch (e) { console.error(`✗ okunamadı: ${d} → ${e?.message}`); process.exit(1); }
}
/* _src.html inline stilleri de bir TANIM kaynağıdır (T8) — build çıktısı
   index.html değil, kaynağın kendisi okunur (§6.1).
   ⚠ Yalnız TAM repo taramasında: `--dizin` modunda (kapının kendi testi)
   geçici dizinin dışına çıkmak, _src.html'in kullandığı ama o dizinde
   tanımlanmamış her token'ı sahte ihlal olarak sayardı — ilk koşuda tek
   satırlık bir sınav 12 ihlal döndürdü. */
if (_dizinArg < 0) {
  try {
    const src = readFileSync(join(ROOT, '_src.html'), 'utf8').split('\n');
    t8Topla('_src.html', src, yorumHaritasi(src, false));
  } catch (_) { /* _src.html yoksa sessizce geç */ }
}

/* ── T7 taban yazma kipi ── */
if (process.argv.includes('--taban-yaz') && _dizinArg < 0) {
  const doc = JSON.parse(readFileSync(T7_TABAN_YOL, 'utf8'));
  doc.bannersiz = t7Bulunan.sort();
  writeFileSync(T7_TABAN_YOL, JSON.stringify(doc, null, 2) + '\n');
  console.log(`✓ T7 tabanı güncellendi: ${t7Bulunan.length} bannersiz modül`);
  process.exit(0);
}

/* ── T8: repo geneli, iki geçişten sonra ── */
for (const [token, yer] of t8Kullanim) {
  if (t8Tanim.has(token)) continue;
  ihlal(yer.dosya, yer.satirNo, 'T8', yer.satir,
    `var(${token}) tanımsız — CSS bunu sessizce geçersiz sayar ve değer inherit edilir (hover'da PARENT'ın rengine düşer). Ya tanımla, ya gerçek token'la değiştir, ya da var(${token}, fallback) yaz`);
}

const taranan = cssler.length + jsler.length;

const liste = process.argv.includes('--liste');

if (ihlaller.length) {
  const grup = {};
  for (const x of ihlaller) (grup[x.kural] ||= []).push(x);
  console.error(`✗ tasarım-denetçi: ${ihlaller.length} ihlal (${taranan} dosya tarandı)\n`);
  for (const [kural, xs] of Object.entries(grup).sort()) {
    console.error(`  ── ${kural} (${xs.length}) ──`);
    for (const x of xs) {
      console.error(`  ${x.dosya}:${x.satirNo}`);
      console.error(`      ${x.satir}`);
      console.error(`      → ${x.aciklama}`);
    }
    console.error('');
  }
  console.error('  Bilinçli istisna ise satıra /* TASARIM-MUAF: gerekçe */ yaz.');
  if (!liste) process.exit(1);
} else {
  console.log(`✓ tasarım-denetçi: temiz (${taranan} dosya) — anayasanın ölçülebilir maddeleri yerinde`);
}
