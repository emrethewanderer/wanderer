---
name: buyuk-harf-dil-kapisi
description: GOTCHA 2026-08-24 — sabit tr-TR ile büyütme EN metnini "THİS" diye basar; tek kaynak localeUpper, muafiyet DIL-MUAF
metadata:
  type: project
---

**Harfin kuralı dilin kuralıdır.** `toLocaleUpperCase('tr-TR')` sabit yazıldığında
İngilizce metin de Türkçe kuralla büyür: `"this path"` → **"THİS PATH"**
(noktalı İ). Kırık 13g'de yaşadı — yazı paylaşımı yolu (`_drawArticleBrand`)
dili baştan beri okuyordu, story yolu okumuyordu; yani aynı modülün iki
kolundan biri doğruydu. Bu yüzden "modül dili biliyor" varsayımı yetmez.

**Tek kaynak:** `localeUpper(s)` — `js/parts/15-i18n.js:50`, `S._currentLang`
okur. Büyük harfe çeviren her arayüz metni ESM import'uyla buna bağlanır
(`import { t, localeUpper } from './15-i18n.js'`). İkiz yardımcı yazılmaz:
FAZ 7'de `13g` kendi `_upper()`'ını kurmuştu, FAZ 8'de silinip tek kaynağa
bağlandı.

**Kapı:** `tests/dil-buyuk-harf-kapisi.test.js` repo genelini tarar
(eski adı `tests/13g-paylasim-dil.test.js`'ti — yalnız 13g'ye bakıyordu).
Kalan sabit `tr-TR` vakası satırında gerekçesiyle beyan edilir:
`/* DIL-MUAF: <gerekçe> */`. Bugün beş muaf vaka var ve hiçbiri arayüz metni
değil — ad baş harfi (`02c`, `10D`), TR durak sözcüğü eşleşmesi (`10g`),
TR deste içeriği (`12b2`), TR ünlü uyumu (`13j`).

**Why:** Ad senkronu kuralının kuzeni — tek ad, tek gerçek; burada tek dil
kaynağı. Dil bir kez okunur, her yüzey aynı kaynaktan sorar. Aksi hâlde
kırık modülün *içinde* yaşar ve i18n paritesi yeşilken bile ekrana yanlış
harf basılır: sözlük doğrudur, büyütme yanlıştır.

**How to apply:** Yeni bir arayüz metnini büyütürken `localeUpper()` çağır —
`toUpperCase()` de `toLocaleUpperCase('tr-TR')` de yazma. CSS'te
`text-transform: uppercase` aynı kırığı üretir ve kapı testi onu GÖRMEZ;
büyütülecek metin TR'de "i" içeriyorsa CSS yerine JS yolunu seç.

Bağlar: [[tr-en-i18n-tamamlama]] · [[ad-senkronu-kurali]] · [[donusum-aynasi-2]] ·
[[kitaplik-paylasim-indirme]] · [[deste-en-karari]]

**İKİNCİ YÜZEY — CSS hâli (2026-08-26).** Kural yalnız JS'te yaşamıyor:
`text-transform: uppercase` da dile bağlıdır ve tarayıcı dili **sayfanın
kökünden** okur. Gözlemevi (13q) baştan sona sabit Türkçe basar ama sayfa
`lang="en"`di — başlıklar "ZAMAN HAR**I**TASI", "SOHBET DER**I**NL**I**ĞI"
çıkıyordu, on bir başlığın hepsinde. Çare `localeUpper` değil (metin JS'te
büyütülmüyor), **elementin kendi dili**: `host.setAttribute('lang','tr')`
(`13q-gozlemevi.js` `renderGozlemeviAdmin`). Sabit dilli bir yüzey
yazıyorsan kabına `lang` ver — yoksa harfler sayfanın dilini konuşur.
Bulundu: [[esigin-nabzi]] FAZ 4 preview doğrulamasında.