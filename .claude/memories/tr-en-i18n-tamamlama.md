---
name: tr-en-i18n-tamamlama
description: EN paritesinin imza tuzağı DİL DONMASIDIR — metin modül yükünde çözülürse dil o anki değerde donar; iskelet sabit, metin render anında t()'den çözülür. İkinci tuzak kelime taşıyan hata mesajları, üçüncüsü yüzde işareti gibi dil-farkları
type: gotcha
---

# TR→EN i18n tamamlama — dil donması, kelime taşıyan anahtarlar, dil-farkları

> **Bu dosya hakkında.** Bu ada yedi yerden bağ veriliyordu
> (`13C-postane.js:58` · `15e-i18n-dict-en.js:6` · `10q-w2-kisi-karti.js:39` ·
> `10i:40` · `10k:31` · `10l:25` · `10n:35`); hedef dosya `.claude/memories/`
> altında yoktu. Özgün dosya repoya hiç girmedi
> ([[claude-altyapisi-commit-disi]]); **bu metin kurtarma değildir**, bugünkü
> koddan yeniden keşifle yazıldı.
>
> **Kayıp olan:** "tamamlama"nın kendisi — hangi turda hangi ekranların EN'e
> geçirildiği, kaç anahtarın eklendiği. Denetçinin banner'ı kaynağı
> `.claude/plans/tum-diller-native-2.md` diye gösteriyor ama **o plan da
> repoda yok** (`tests/referans-butunlugu.test.js` TABAN'ında donmuş bir
> borç). Bu dosya planın yerine geçmez; **tuzakları** belgeler.

**Why:** EN paritesi bir çeviri işi değil, bir **zamanlama** işidir. Repodaki
yedi atıfın dördü tek bir cümlenin dört kopyasıdır ve tuzağın adı odur:

> *"…iskeleti — glyph + soru sayısı sabit; metinler i18n'den **render anında**
> çözülür (**modül-yükünde dil donmasın**). [[tr-en-i18n-tamamlama]]"*
> — `10k-w2-kendinle-konusma.js:30-31`; aynısı `10l:24-25`, `10i:39-40`,
> `10n:34-35`.

**Dil donması** şudur: bir modülün tepesinde `const LABEL = t('x')` yazarsan
metin **modül yüklendiği anda** çözülür ve o anki dile kilitlenir. Kullanıcı
sonradan dili değiştirse bile o sabit değişmez — ekranın bir kısmı TR kalır.
Çare kalıptır: **iskelet sabit** (anahtar, glyph, soru sayısı — dilden
bağımsız), **metin fonksiyonda** (`const _impactLabel = (n) => t(...)`,
`10n:35`). Yani `t()` çağrısı render zamanına ertelenir.

Aynı tuzağın sidecar tarafı için bkz. [[i18n-bundle-bolme]]: dış dil sözlüğü
sonradan indiğinde `_tCache` boşaltılıp UI yeniden boyanmazsa ekran yine
kalıcı TR kalır. İkisi farklı sebeplerle **aynı** semptomu üretir.

**İkinci tuzak — anahtar seçilir, kelime taşınmaz.** `13C-postane.js:52-58`:

> *"Tür bir ANAHTAR seçer, kelime taşımaz: kelime taşısaydı Türkçe metin
> İngilizce cümlenin ortasına düşerdi."*

Yani `_pstHataMesaj(error, ad, tur)` fonksiyonu `tur`'e göre `'pst.no_rpc'`
ya da `'pst.no_table'` anahtarını seçer; `tur` değişkeni asla ekrana giden
bir kelime taşımaz. Parametrelenmiş bir cümlenin içine dil-bağımlı bir
sözcüğü değişken olarak sokmak, EN arayüzde yarı Türkçe bir cümle üretir.

**Üçüncü tuzak — dil farkı bir çeviri değildir.** Bazı biçimler sözlüğe
girmez, kodda dallanır: `10q-w2-kisi-karti.js:39`

```js
/* Yüzde işareti dil-farkı: TR %85 · EN 85% [[tr-en-i18n-tamamlama]] */
const _pct = (n) => (S._currentLang === 'tr' ? `%${n}` : `${n}%`);
```

**Sözlüğün kendisi.** EN sözlüğü ana bundle'a girmez, sidecar'dır
(`15e-i18n-dict-en.js:2-6`, `js/ext/i18n-en.js` üzerinden `ext-i18n-en.js`)
ve sözleşmesi tek cümledir: *"Anahtar seti 15b `tr:` ile **paritede**
tutulmalı."*

**Kapısı yapıyı sınar, kaliteyi değil.** `scripts/i18n-validate.mjs`
banner'ının kendi ifadesiyle: *"Çevirinin KALİTESİNİ değil YAPISINI
denetler — transcreation kalitesi yürütücü modelin kendi işidir."* İki
kullanımı var: `--lang <xx>` tek dilin yapısal doğrulaması, **`--gaps`** ise
TR core'a **sonradan eklenen** anahtarların dil-dil raporu — yani paritenin
zamanla açılan yarığını gösteren araç budur.

Deste overlay'inde ayrıca bir **DONUK SÖZLEŞME** var (`en-deste.js:25-27`):
`id / category / rarity / recipe / virtue / glyph / sigil / roman` **asla
çevrilmez** — mekanik dilden bağımsızdır ve kapı bunu sınar.

**How to apply:**

## 1 · Modül tepesinde `t()` çağırma

Sabit bir `const` içinde `t()` çözme. İskeleti (anahtar/glyph/sayı) sabit
tut, metni fonksiyona al. Dört modül bu kalıbı taşıyor; beşincisini yazarken
aynı yorumu da yaz — bu repoda kalıbın kendisi belgeyle korunuyor.

## 2 · Yeni bir UI string'i eklerken

§6 madde 8: TR **ve** EN sözlüğe girer, `t('anahtar', 'inline fallback')`
kalıbıyla. Sonra `node scripts/i18n-validate.mjs --gaps` koş — parite
yarığını erken görürsün.

## 3 · Bir cümleyi parametrelendirirken

Parametre bir **anahtar** ya da bir **sayı** olsun; dil-bağımlı bir sözcük
olmasın. Sözcük gerekiyorsa iki ayrı anahtar yaz (13C emsali).

## 4 · Biçim farklarını sözlüğe gömmeye çalışma

Yüzde işareti, tarih sırası, binlik ayracı gibi şeyler çeviri değil
**biçimlendirmedir**; kodda dallanır ya da `Intl` ile çözülür. Büyük harf
biçimlendirmesi ayrı bir kapıya bağlıdır — bkz. [[buyuk-harf-dil-kapisi]].

İlgili: [[buyuk-harf-dil-kapisi]] (aynı 15-i18n motorunun büyütme tarafı) ·
[[i18n-bundle-bolme]] (sidecar sözlük gelince cache + DOM tazeleme) ·
[[ihtimalsel-dil-devrimi]] (EN transcreation'ının register kuralı) ·
[[ad-senkronu-kurali]] (kitap adları uydurulmaz)
