---
name: yerel-tarih-anahtari
description: localISODate() yerel saat diliminde padding'li YYYY-MM-DD üretir; toISOString().slice(0,10) UTC'dir ve TR'de (UTC+3) gece yarısı ile 03:00 arası bir önceki günü verir — gün anahtarı karşılaştırmaları ve testleri bu farktan kırılır
type: gotcha
---

# Yerel tarih anahtarı — `toISOString()` UTC'dir, TR'de günü kaydırır

> **Bu dosya hakkında.** `tests/13m-kota.test.js:18`, `js/parts/09i-secici.js:298`
> ve `tests/05-closure-parts.test.js:28` bu ada `[[yerel-tarih-anahtari]]`
> diye bağ veriyordu; hedef dosya `.claude/memories/` altında YOKTU (kapı:
> `tests/referans-butunlugu-kapisi.test.js` TABAN'ı, `hafiza:yerel-tarih-anahtari`).
> Aynı isimli özgün dosya repoya hiç girmedi — `git log --all -- .claude/memories/yerel-tarih-anahtari.md`
> boş döner ([[claude-altyapisi-commit-disi]]). **Bu dosya kurtarma değildir**;
> içeriği bugünkü koddan (`js/parts/00a-infrastructure.js`,
> `js/parts/09i-secici.js`, `js/parts/05-closure-parts.js`) yeniden keşifle
> yazıldı — her cümle bir `dosya:satır` taşır. Emsal: `boot-nabzi`,
> `olu-kod-temizlikleri`.
>
> **Kayıp olan:** bu tuzağın hangi ÜRÜN hatasıyla ilk fark edildiği (hangi
> ekranda, hangi saatte bir kullanıcının "dün" ile "bugün" gördüğü) —
> yalnız bugünkü kodun çaresi (`localISODate`) ve onun test tarafındaki izi
> repodan okunabiliyor.

**Why:** `js/parts/00a-infrastructure.js` iki ayrı "yerel gün anahtarı"
fonksiyonu tanımlar ve ikisi FARKLI amaçlar için vardır:

- `localDayKey(d)` (`:317-320`) — `${yıl}-${ay0}-${gün}` formatı, **padding
  YOK**, ay 0-indeksli. Birleşik aktivite defterinin (`ACTIVITY_LEDGER_KEY`,
  `:313`) anahtarıdır; repoda 10 dosyada 21 kez kullanılır.
- `localISODate(d)` (`:327-330`) — `YYYY-MM-DD`, **padding'li**, ay
  1-indeksli. Fonksiyonun kendi yorumu nedenini söylüyor: *"localDayKey
  aksine padding'li olduğu için lexical karşılaştırma (`<`, `===`)
  güvenlidir… (`toISOString().slice(0,10)` UTC olduğundan UTC+3'te gün
  sınırını gece yarısı yerine 03:00'e kaydırır)"* — repoda 47 dosyada 160
  kez kullanılır, bu ikisinin AÇIK ARA yaygın olanıdır.

Tuzağın kaynağı `Date.prototype.toISOString()`nin UTC döndürmesidir.
Türkiye UTC+3'te olduğu için, yerel saat 00:00–03:00 arasında
`new Date().toISOString().slice(0,10)` hâlâ BİR ÖNCEKİ günü verir. Bir
"bugün yapıldı mı?" kontrolü bu ifadeyle yazılırsa, gece yarısından sonraki
üç saatte YANLIŞ gün üzerinden karar verir — kodda görünür bir hata olmadan.

Bu tuzak iki ayrı yüzeyde AYRI AYRI bulunmuş ve aynı çareyle kapatılmış:

- **Test tarafı** (`tests/13m-kota.test.js:15-18`): *"13m `bonus_day`i
  `localISODate()` ile yazar, test `toISOString()` ile kuruyordu — TR'de
  gece yarısı ile 03:00 arası UTC bir önceki günü verir ve süit o saatlerde
  kendiliğinden kırmızıya dönerdi (kodda hata yokken)."* — testin KENDİSİ
  yanlış fonksiyonu kullandığı için süit saatsel olarak flaky oluyordu.
- **Ürün tarafı** (`js/parts/09i-secici.js:296-298`, JSDoc bloğu `:291-301`,
  fonksiyon `_dgSeciciOkuma` `:302`'de başlar): Seçici motorunun
  ikinci okuyucusunun (model) uygulamanın kararıyla AYNI GÜN çelişip
  çelişmediğini soran `_dgSeciciOkuma`, günü `localISODate()` ile
  eşleştirir — yorum: *"`localISODate` ile günü eşleştirmeden bir kapatma
  kararı vermek ölçmediği bir şeyi cezalandırırdı."* Yani burada tuzak bir
  test kırılması değil, YANLIŞ GÜNE ait bir modelin susturma kararı
  vermesiydi.

**How to apply:**

1. "Bugün yapıldı mı?", "aynı gün mü?" gibi bir karşılaştırma yazarken
   `toISOString().slice(0,10)` KULLANMA — bu her zaman UTC'dir.
   `localISODate()`u (`js/parts/00a-infrastructure.js`) import et.
2. Testte de AYNI fonksiyonu kullan — beklenen değeri `toISOString()` ile,
   üretilen değeri `localISODate()` ile kurarsan test yalnız gece
   yarısı-03:00 penceresinde kırmızı olur; bu "flaky" gibi görünür ama
   flaky DEĞİLDİR, TR saat dilimine göre DETERMİNİSTİKTİR.
3. `localDayKey` ile `localISODate`i KARIŞTIRMA — biri (`localDayKey`)
   yalnız aktivite defteri anahtarı için, padding'siz; öteki
   (`localISODate`) sıralanabilir/karşılaştırılabilir günlük anahtar için,
   padding'li. Yeni bir "gün anahtarı" ihtiyacı çıkarsa hangi ikisinin
   sözleşmesine uyduğunu önce belirle.
4. Yeni bir "aynı gün mü" kontrolü eklerken grep'le mevcut deseni doğrula:
   `grep -rn "localISODate" js/` (160 kullanım, 47 dosya) zaten baskın
   konvansiyondur — paralel bir tarih biçimi icat etme.

İlgili: [[claude-altyapisi-commit-disi]] (kayıp beyanının kök sebebi) ·
[[olu-kod-temizlikleri]] (kayıp içerikle başa çıkmanın emsali)
