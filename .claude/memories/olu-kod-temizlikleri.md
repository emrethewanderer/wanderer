---
name: olu-kod-temizlikleri
description: Ekran/özellik silmeden önce izlenecek prosedür — yetim kontrolü, sözleşme yüzeyi taraması, mevcut iki denetçinin rolü ve sınırı; tarihsel KORUNANLAR listesi bu snapshot'ta kayıp
type: prosedür
---

# Ölü kod temizliği — silmeden önce dört yüzeyi tara

> **Bu dosya hakkında.** `PROTOKOL-FABLE.md` §6 madde 9 şunu söylüyor:
> *"Ekran/özellik silerken `olu-kod-temizlikleri` hafızasındaki KORUNANLAR
> listesine ve kontrol listesine bak."* Bu dosya hiç var olmamıştı —
> `git log --all -- .claude/memories/` bu adı hiç döndürmüyor, repo'nun ilk
> commit'inden (`91468bc`/`95b50d8`) beri yok. **Tarihsel KORUNANLAR
> listesi — hangi ekranın ne zaman, hangi gerekçeyle silindiği, o silme
> turunda "bunu SİLME" diye işaretlenmiş adların tam listesi — kalıcı
> olarak kayıptır ve hatırlanamaz.** Uydurmak `PROTOKOL-FABLE.md`'nin kendi
> gerçeklik kuralına (§6 madde 10) aykırı olurdu — bu yüzden dosya o listeyi
> yeniden ÜRETMEZ, onun YERİNE bir PROSEDÜR yazar: bugünkü repoda ölü kod
> nasıl güvenle bulunur ve silinir. Elde tarihsel bir KORUNANLAR listesi
> varsa (eski bir oturumun kaydı, bir yedek) bu dosyaya EKLENMELİDİR —
> aşağıdaki "Kayıp liste" bölümüne bakın.

**Why:** Bu repoda "ölü" görünen bir ad üç farklı biçimde YALANCI
çıkabilir — grep'in KAÇIRDIĞI bir çağıran (dinamik ad kurma, native köprü,
kalıcı veri), ya da tersine, gerçekten yetim ama SESSİZCE yetim (build
kırılmaz, konsol kızarmaz, özellik yalnızca çalışmaz). §3.1'in tek satırlık
kuralı ("Silmeden önce yetim kontrolü: `grep -rn` ile repo genelinde
çağıran kalmadığını kanıtla. Ölü kod ancak kanıtla ölür.") doğru ama
YETERSİZDİR tek başına — çıplak `grep -rn` dört sözleşme yüzeyinden
(§5.2: `window.*` köprüsü, DOM id, storage anahtarı, i18n anahtarı) İKİSİNİ
kolayca kaçırır (aşağıya bakın). Bu prosedür o boşluğu kapatır.

**How to apply:**

## 1 · Önce sözleşme yüzeyini adlandır

Silmeyi düşündüğün ad hangi kategoride, ona göre ara:

| Yüzey | Nerede yaşar | Naif `grep -rn "<ad>"` yeterli mi? |
|---|---|---|
| Yerel fonksiyon/değişken | tek modül içi | Evet — modül sınırını aşmaz |
| Modül-arası `import`/`export` | iki modül arası | Evet — ad literal geçer |
| **`window.*` köprüsü** | çağıran `window.foo?.()` yazar, karşı uç `window.foo = foo` ile expose eder | **Kısmen** — literal ad grep'te görünür ama karşılıksız çağrı SESSİZCE yutulur; bkz. §2 |
| **DOM id** (`#fx-sound-toggle`) | HTML/CSS/JS üçünde de aynı string | Evet ama ÜÇ dosya türünde ayrı ayrı aranmalı — `_src.html`, `css/parts/*.css`, `js/parts/*.js` |
| **Storage anahtarı** | `SafeStorage`/`localStorage` — kullanıcının CİHAZINDA gerçek veri | **Hayır tek başına** — anahtar kod içinde `${KEY}_${uid}` gibi kurulur, üstelik kullanıcının cihazındaki eski veri kod silinince de KALIR; bkz. §3 |
| **i18n anahtarı** | `t('mode.' + mode)` gibi DİNAMİK kurulan çağrılar | **Hayır** — literal anahtar hiçbir satırda geçmeyebilir; bkz. §4 |
| **Supabase tablo/kolon** | migration + edge function, bazen repo dışında deploy edilmiş | **Hayır** — repo migration dosyasını taşır ama gerçek şema ELLE deploy edilmiştir, repo tek kaynak değildir |

## 2 · `window.*` köprüsü — iki otomatik denetçi var, kullan

Bu iki script tam bu sınıfı arıyor; silmeden ÖNCE ve silme SONRASI ikisini
de koştur (`node scripts/<ad>.mjs`, ya da hedefli süitte
`tests/yetim-kopru-kapisi.test.js` + `tests/bagsiz-ad-kapisi.test.js`):

- **`scripts/yetim-kopru-denetci.mjs`** — iki sınıf arar: (1) `window.foo?.()`
  çağrısı var ama `foo` hiçbir dosyada `window.foo = …` ile expose
  edilmemiş (2) köprü hiç kurulmadan `foo()` çıplak çağrılmış — build
  bunu YAKALAMAZ (Rollup'ın IIFE'i global sanar), çalışma zamanında
  `ReferenceError`, çağıranın `try/catch`'i onu yutar. **Sınırı** (dosyanın
  kendi cümlesi): yalnız ADIN varlığını sorar, doğru zamanda mı asıldığını
  (post-auth mı boot mu) sormaz — o ancak davranışsal doğrulamayla bulunur.
- **`scripts/bagsiz-ad-denetci.mjs`** — TERS yönü sorar: `foo()` çağıran
  modülde `foo` diye bir BAĞ (import/tanım) var mı? Vite'ın IIFE build'i
  tüm modülleri tek scope'a düzleştirdiği için bağsız bir ad bundle'da
  TESADÜFEN çözülür, ürün çalışıyor GÖRÜNÜR — ama kaynak ES modülü olarak
  (vitest, dev) koştuğunda `ReferenceError`'dır. Gerçek scope analizini
  TypeScript yapar (`tsconfig.bagsiz-ad.json`, `checkJs: true`); elle
  regex bu işi çözmez.

**Bir modül veya fonksiyon silerken bu iki denetçiyi silme ÖNCESİ ve
SONRASI koşturmanın anlamı farklıdır:** öncesi, sildiğin şeyin gerçekten
yetim olduğunu (kimse çağırmıyor) KANITLAMAZ — bu ayrı bir sorudur,
`grep -rn` ile cevaplanır (§3.1). Sonrası ise, silme işleminin YENİ bir
yetim/bağsız köprü YARATMADIĞINI kanıtlar — ör. sildiğin fonksiyon başka
bir modülün TEK expose noktasıysa, geride `window.foo?.()` diye çağıran
ama artık karşılıksız kalan bir satır bırakmış olabilirsin.

## 3 · Storage anahtarı — kod silinse de veri kalır

Bir özelliği silmek, o özelliğin `SafeStorage`/`localStorage` anahtarını
OTOMATİK silmez — kullanıcının cihazında veri kalıcı olarak durur. §4.3'ün
ad göçü kuralı burada da geçerli mantıkla işler: anahtarı okuyan/yazan kod
gidince, o veri artık HİÇBİR modülün ilgi alanında değildir ama CİHAZDA
durmaya devam eder. Silmeden önce sor: bu veri gizlilik/depolama açısından
temizlenmeli mi (bir "son kullanımda sil" adımı gerekir mi), yoksa
zararsızca terk mi edilebilir? Karar plana yazılır, sessizce atlanmaz.

## 4 · i18n / dinamik anahtar — literal grep yanıltır

Bazı `t()` çağrıları anahtarı ÇALIŞMA ZAMANINDA kurar:
`t('mode.' + mode)`, `` t(`onb.domain.${dKey}.${field}`) `` (örnekler:
`js/parts/00-config-tracking.js:619`, `js/parts/02b-onboarding-ritual.js:99-104`).
Silinecek anahtar `mode.sakin` gibi bir SONUÇ ise, `grep -rn "mode.sakin"`
KAÇIRIR — kaynak satır `'mode.' + mode` yazar, `sakin` bir DEĞİŞKENİN
çalışma zamanı değeridir. Bu sınıfta silmeden önce anahtarın **kök
önekini** (`mode.`, `onb.domain.`) ve değişkenin alabileceği TÜM değerleri
(genelde bir sabit dizi/enum) bulman gerekir — tek bir literal grep yetmez.

## 5 · Dışa açık ad — native kabuk, widget, push payload

§4.3'ün "GEÇİCİ ALIAS" kuralı ölü kod temizliğinde de geçerlidir: bir ad
`js/parts/00d-native-shell.js`, `00e-native-push.js` gibi bir Capacitor
köprüsünden ya da push payload'undan DIŞARIYA açıksa, repo içi grep onu
"kullanılmıyor" gösterebilir çünkü çağıran taraf repo DIŞINDADIR (native
kabuk kodu, üçüncü parti widget, sunucudan gelen push mesajı şeması). Bu
sınıfı elle kontrol et: `00d-native-shell.js` / `00e-native-push.js` /
`08-trends-payment.js` içindeki `Capacitor.*` çağrılarını ve varsa bir
`window.*` köprüsünün DIŞ dünyaya (değil repo içine) açık olup olmadığını
sor. Silinecekse önce köprü `// GEÇİCİ ALIAS — <neden>, kaldırma tarihi`
yorumuyla bir sprint tutulur, sonra kaldırılır.

## 6 · Silme sonrası kapı

```
grep -rn "<silinen ad>" .                              # repo genelinde sıfır kalan çağıran
node scripts/yetim-kopru-denetci.mjs                    # yeni yetim köprü yok
node scripts/bagsiz-ad-denetci.mjs                       # yeni bağsız ad yok (2-3 dk sürer, tsc soğuk başlar)
./build.sh 2>&1 | tail -20                               # yeşil
npx vitest run tests/yetim-kopru-kapisi.test.js tests/bagsiz-ad-kapisi.test.js
```

Kaynak kod değişmediyse (yalnız belge/hafıza) bu kapı §3.3'e göre
gerekçeli geçilir — ama BU dosyanın konusu tam olarak KOD silmek olduğu
için, gerçek bir silme turunda kapı pazarlıksızdır.

## Bu iki denetçinin GÖRMEDİĞİ — dürüstçe

`yetim-kopru-denetci.mjs` ve `bagsiz-ad-denetci.mjs` KORUNANLAR listesinin
işlevini KISMEN görür, TAMAMEN değil. İkisi de aynı yöne bakar: **silinen
bir şeyin ardında karşılıksız bir ÇAĞIRAN kalıp kalmadığını** sorar (yani
"bir şeyi yanlışlıkla yarım sildin mi"). KORUNANLAR listesinin klasik işi
bunun TERSİdir — "bu ad grep'te yetim görünüyor ama SİLME, çünkü ‑" gibi
önden bilinen bir istisna kaydı tutmaktı. Bu repoda böyle bir istisna
kaydı yok; §5'teki dışa-açık-ad kontrolü ve §2-4'teki dört yüzey taraması
bu boşluğu KISMEN karşılar (bilinen sınıfları listeler) ama repoya özgü,
elle biriktirilmiş bir istisna kaydı değildir.

## Kayıp liste — eklenmesi gereken

Bu dosya ilk yazıldığında (2026-09-02) hiçbir tarihsel KORUNANLAR maddesi
yoktu. Bir sonraki oturum ya da Emre'nin elinde eski bir kayıt/yedek
çıkarsa, madde madde buraya eklenir: `<ad> — neden korunuyor — hangi dışa
açık yüzeyden (native/widget/push/storage) geliyor`.

İlgili: [[kapi-tarama-yarisi]] (bu iki denetçi de `js/` gezdiği için aynı
tarama-yarışı riskini taşır, ikisi de dayanıklı yazılmıştır) ·
`tests/yetim-kopru-kapisi.test.js` + `tests/bagsiz-ad-kapisi.test.js`
(denetçilerin vitest sarmalayıcıları) · `.claude/plans/gerceklik-mimarisi.md`
(benzer bir "statik + davranışsal iki katman" deseni, farklı bir gerçeklik
sorunu için)
