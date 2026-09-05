---
name: buyuk-harf-dil-kapisi
description: "tr-TR" locale'i küçük "i"yi noktalı "İ"ye çevirir — büyütmenin locale'i sabit yazıldığı her yerde EN arayüzde "THİS PATH" doğar; JS kolu localeUpper() (15-i18n), CSS kolu text-transform:uppercase'in kaynağı elementin lang'idir
type: gotcha
---

# Büyük harf kapısı — harfin kuralı dilin kuralıdır

> **Bu dosya hakkında.** `PROTOKOL-FABLE.md` ve `tests/`/`js/` altındaki
> yorumlar bu ada `[[buyuk-harf-dil-kapisi]]` diye bağ veriyordu; hedef dosya
> `.claude/memories/` altında YOKTU (kapı: `tests/referans-butunlugu-kapisi.test.js`
> TABAN'ı). Aynı isimli özgün dosya yalnız Emre'nin lokal diskinde kaldı ve
> repoya hiç girmedi ([[claude-altyapisi-commit-disi]]). **Bu dosya o özgün
> metnin kurtarılmış hâli DEĞİLDİR.** İçeriği bugünkü repodan yeniden
> keşifle yazıldı: kapının kendisi (`tests/dil-buyuk-harf-kapisi.test.js`),
> motor (`js/parts/15-i18n.js`) ve iki gerçek çağıran (`13g-paylasim.js`,
> `10q-w2-kisi-karti.js`) repoda duruyor. Emsal: `boot-nabzi` /
> `olu-kod-temizlikleri`.
>
> **Kayıp olan:** kırığın ilk yakalandığı oturumun ham dökümü — hangi ekran
> görüntüsü, hangi kullanıcı raporu. Elde yalnız kapının kendi kod yorumunda
> yazan tarih ve bağlam kalıyor (`tests/dil-buyuk-harf-kapisi.test.js:6-8`):
> *"FAZ 7'nin çapraz denetiminde yakalandı: yeni EN metni ('5 people on this
> path') kırığı tetikledi, ama kaynağı 13g'ydi ve modülün kendi
> yazı-paylaşımı yolu dili baştan beri doğru okuyordu — tutarsızlık
> içerideydi."* Bu bir **kayıt** olarak
> aktarılır, doğrulanmış bir olay örgüsü olarak değil.

**Why:** `'foundations'.toLocaleUpperCase('tr-TR')` `'FOUNDATİONS'` döner —
Türkçe locale küçük "i"yi noktalı büyük "İ"ye çevirir
(`tests/dil-buyuk-harf-kapisi.test.js:44`). Locale sabit `'tr-TR'` yazıldığı
HER yerde bu kırık yeniden doğar: İngilizce arayüzde kategori çipi
"FOUNDATİONS", paylaşım kartı "THİS PATH" basılır — kelimenin ortasındaki
"İ" harfi İngilizce okuyucuya bir yazım hatası gibi görünür. Kapının kendi
başlığı bunu tek cümlede özetler: *"harfin kuralı dilin kuralıdır."*

Kırık İKİ ayrı yüzeyde yaşar ve ikisinin de KENDİ kapısı var:

**How to apply:**

## 1 · JS kolu — `localeUpper()`, tek motor

Arayüz metnini (kaynağı `t()`, dili bilinen) büyütürken `String.prototype
.toLocaleUpperCase()` DOĞRUDAN çağrılmaz — `js/parts/15-i18n.js:50`'deki
`localeUpper(s)` çağrılır:

```js
export function localeUpper(s) {
  return String(s == null ? '' : s).toLocaleUpperCase(S._currentLang || 'tr');
}
```

Dili sabit yazmaz, `S._currentLang`'tan okur — kullanıcı EN'deyse `'en'`
locale'iyle büyütür, `'FOUNDATIONS'` çıkar (noktasız I).

**Kapının ayırt ettiği ikinci sınır** (`tests/dil-buyuk-harf-kapisi.test.js:11-14`,
kapının kendi banner'ı): bu motor YALNIZ arayüz metni içindir. Kullanıcı
verisi (kişinin adı) ve TR yazılmış içerik (deste kart adları — bkz.
[[ad-senkronu-kurali]]) bu kapıdan GEÇMEZ; onların dili arayüz diliyle
değişmez, sabit `tr-TR` DOĞRUdur ve satırda `DIL-MUAF` yorumuyla beyan
edilir. Kapı (`tests/dil-buyuk-harf-kapisi.test.js:39,56-72`) repoda sabit
`tr-TR`/`tr-TR` ile `toLocaleUpperCase`/`toLocaleLowerCase` arayan bir regex
tarar; `DIL-MUAF` beyanı olmayan her eşleşme kırığı kırar.

Bugünkü iki gerçek çağıran (`js/parts/15-i18n.js:50` tanımının tüketicileri,
`grep -rn localeUpper js/` ile doğrulanır):
- `js/parts/13g-paylasim.js` — story kartının dört alanı (`kicker`,
  `bigLabel`, `sub`, `dateLabel`), hepsi `localeUpper(...)` üzerinden geçer
  (`tests/dil-buyuk-harf-kapisi.test.js:74-81`).
- `js/parts/10q-w2-kisi-karti.js:1633` — kategori çipi:
  `localeUpper(_catLabel(c))` (kapı: `tests/dil-buyuk-harf-kapisi.test.js:84`).

## 2 · CSS kolu — `text-transform: uppercase`, kaynak elementin `lang`i

`localeUpper()` yalnız JS'te üretilen metni korur. CSS'te büyütülen metin
`localeUpper`'dan GEÇMEZ — geçmesine gerek yok, çünkü tarayıcı CSS
büyütmesinin locale'ini **sayfanın kökünden** okur
(`tests/dil-buyuk-harf-kapisi.test.js:95-112`, "İKİNCİ YÜZEY" bloğu). Yani bu
yüzeylerin doğruluğu tek bir şeye bağlıdır: `<html lang>` arayüz diliyle
senkron mu?

**Sayı hakkında dürüst not.** Kapının kendi yorumu *"Repoda 215
`text-transform: uppercase` var"* der; bu **2026-08-28 tarihli bir kayıttır**,
bugünün ölçümü değil. Bugün (2026-09-03) `grep -rn 'text-transform:\s*uppercase'`
`css/` altında **216**, `js/`+`_src.html` ile birlikte **275** eşleşme
veriyor. Sayının büyümesi kapının gerekçesini zayıflatmaz, güçlendirir —
korunan yüzey sayısı artıyor. Bu dosyadaki sayıyı bir daha alıntılarken
**yeniden ölç** (§7: hafıza geçmişin fotoğrafıdır).

`js/parts/15-i18n.js` dili değiştiren VE hidrasyonda okuyan iki yolda da
`document.documentElement.lang`'i yazar (`:171` dil değişince, `:251`
hidrasyonda) — kapı bunun en az iki kez yazıldığını sayar
(`tests/dil-buyuk-harf-kapisi.test.js:120-126`).

**Sabit dilli yüzey — 13q Gözlemevi emsali.** Bir yüzey metnini `t()`'den
ALMIYORSA (admin paneli gibi, doğrudan Türkçe yazıyorsa) sayfanın diline
teslim EDİLEMEZ — kabına kendi `lang`ini vermek zorundadır. `13q-gozlemevi.js`
bunu `renderGozlemeviAdmin()` içinde `host.setAttribute('lang', 'tr')`
(`js/parts/13q-gozlemevi.js:146`) ile yapar; modülün kendi yorumu (`:140-145`)
kırığın tam görünüşünü kaydeder: *"lang='en' altında 'Eşiğin' → 'EŞIĞIN',
'gezgin' → 'GEZGIN' (noktasız I)"* — yani host bir kez `lang="tr"` alır ve
paneldeki `.gz-sec` başlıklarının tümünü kapsar. Kapı bu satırı regex'le
sınar (`tests/dil-buyuk-harf-kapisi.test.js:132-136`).

## 3 · Yeni bir yüzey eklerken

- Metnin kaynağı `t()`'yse ve büyütülecekse → `localeUpper()`, asla çıplak
  `toLocaleUpperCase('tr-TR')` YAZMA.
- Metin sabit TR ise (kullanıcı verisi, deste kart adı) ve büyütme JS'te
  oluyorsa → `DIL-MUAF: <gerekçe>` ile beyan et.
- Yeni bir sabit-dilli (i18n'e hiç girmeyen) panel yazıyorsan ve CSS'te
  `uppercase` kullanıyorsan → kabına `lang` ver, 13q emsalini izle.

İlgili: [[tr-en-i18n-tamamlama]] (aynı 15-i18n motorunun komşu tuzağı — dil
donması) · [[ad-senkronu-kurali]] (`DIL-MUAF`in kapsam dışı bıraktığı sabit
TR içerik, deste kart adları) · [[claude-altyapisi-commit-disi]] (bu dosyanın
neden eksik olduğu)
