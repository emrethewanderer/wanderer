---
name: saf-yesil-cagri-olu
description: "GOTCHA 2026-08-30 (+08-31 dördüncü üye): çağrı sözleşmeye uyar ama yine de ölüdür — alan adı ayrıştığı için (Duygu yayı) ya da çağrı motorun init'inden ÖNCE koştuğu için (İç Çalışma 08 dus olayı); birim testi göremez, kapı ÇAĞRIDA olmalı"
metadata:
  type: reference
---

**Saf fonksiyon kendi sözleşmesini doğru uygular, birim testi yeşil geçer, ve
davranış yine de ÖLÜDÜR — çünkü kırık fonksiyonda değil, ona geçirilen
alandadır.**

## Ölçülen vaka (Duygu Motoru, 2026-08-30 inceleme turu)

`dgYay(nabizlar)` `{kuvvet}` alanı taşıyan girdileri sayar; ölçüm defteri
`S._emotionalFlow` **aynı sayıyı** `intensity` adıyla tutar
(`00-config-tracking.js:~92` → `const intensity = nabiz.kuvvet`). İki ad
ayrıştığı için filtre hiçbir girdiyi geçirmiyor, `dgYay` **daima `null`**
dönüyordu. İki tüketicisi de ölüydü ve sonuç zincirleme büyüdü:

- `S._dgYay` hep null → `dgKarsilama`'nın `akisYon`u hep null (nabzın kendi
  `yon`u da yoktu, çağrı `opts.onceki` geçmiyordu) → **K2'nin ikinci kuralı
  (yükselen yoğunlukta yatıştırma) FAZ 4'ten beri hiç tetiklenmedi.**
- `getEmotionalFlowInsight`'ın iki okuması (sakin→yoğun, yoğun→sakin) hiç
  doğmadı — üstelik üstündeki yorum *"dgYay artık gerçek tüketici"* diyordu.

`tests/13D-duygu-nabzi.test.js` `dgYay([{kuvvet:1},{kuvvet:3}])` ile sınıyordu
ve **doğru** sonuç veriyordu. 3561 testlik yeşil süit bunu göremezdi.

## Dördüncü hâl: alanlar doğru, ama ÇAĞRI ANI motordan önce (2026-08-31)

İç Çalışma 08'de aynı sessizlik başka bir kökten doğdu. `fmInit`, "kayıtlı
eksen sessizce Öz'e düştü" olayını `window.wtLogModel?.('dus', …)` ile
yazıyordu — alan adları doğru, köprü asılı, `?.` yerinde. Yine de satır HİÇ
doğmadı: `03-auth-shell` fmInit'i **:1376**'da, nabzın `wtInit`'ini
**:1393**'te başlatır (nabız bilinçli olarak "EN SONDA"dır) ve iki modül de
`main.js`'te STATİK import edilmiştir (105 · 451) — yani `import()` **anında**
çözülür ve `.then` geri çağrıları çağrı sırasıyla, aynı mikrotask turunda
koşar. `wtLogModel`'in ilk satırı `if (!_inited …) return;` olduğu için olay
sessizce düştü. Ve düşen şey sprintin ASIL bulgusuydu: sessiz kaybın kaydı
sessizce kayboldu.

Birim testleri yeşildi çünkü harness `wtInit()`'i **önce** çağırır
(`tests/00f-model-nabzi.test.js:28`). Kapı `tests/10w-dus-cagrisi.test.js`
ile çağrıya taşındı: stub, nabzın fmInit'ten SONRA açıldığı gerçek sırayı
taklit eder. Düzeltme `setTimeout(…, 0)` — makro görev bütün mikrotask
turundan sonra koşar.

**Ders:** `window.foo?.()` bir ad kapısıdır, **zaman kapısı değildir.** Bir
motorun `_inited` guard'ı varsa, ona init sırasında yazan her çağrı için
"benim çağrım motordan sonra mı?" sorusu ayrıca sorulur. Sıra `03-auth-shell`
post-auth bloğundaki **satır numarasıyla** okunur, sezgiyle değil.

## Ailesi

Bu, reponun tanıdığı sessiz-kayıp sınıfının üyesi:
[[yetim-kopru-denetcisi]] (çağrı var, bağ yok) · [[bagsiz-ad-kapisi]] (ad var,
bağ yok) · **alan ayrışması** (ad da bağ da var, ALAN adı ayrışmış) ·
**init sırası** (her şey doğru, çağrı motordan ÖNCE koşuyor —
[[ic-calisma-8-uc-sesin-nabzi]]). Dördünün ortak yanı:
`try/catch`siz bile patlamazlar, yalnız `null`a düşerler — §5.2'nin "asla
bloklama" refleksi kırığı görünmez kılar.

**Why:** §6.10'un aynası. Kanıtsız değer üretmek yasak; ama **kanıt üretebilen
bir yolun sessizce hiç üretmemesi** de bir ölçüm kaybıdır ve daha sinsidir —
kimse eksikliğini görmez, üstelik yorumlar orada bir mekanizma varmış gibi
durmaya devam eder ve doğrulanmadan inanılır.

**How to apply:**
1. Bir saf fonksiyonun sözleşmesi bir ALAN ADI içeriyorsa (`{kuvvet}`,
   `{intensity}`, `{deger}`), birim testi o sözleşmeyi kanıtlar — **entegrasyonu
   kanıtlamaz.** Kapı ÇAĞRININ kendisinde olmalı: "iki tur sonra `S._dgYay`
   okunur" gibi, davranışı sınayan bir test.
2. Şüphelendiğinde canlıda iki biçimi yan yana koy:
   `dgYay([{kuvvet:1},{kuvvet:3}])` vs `dgYay([{intensity:1},{intensity:3}])`.
   Biri sonuç, öteki `null` veriyorsa kırık bulundu.
3. Dönüştürmeyi İKİ yerde tekrarlama — tek kaynağa (`_yayGirdisi`) bağla;
   ad göçü geldiğinde silinecek tek satır orasıdır.
4. Aynı sınıftan kardeş: **aynı olguyu iki defter sayıyorsa ikisi de aynı dalda
   dolmalı.** Duygu Motoru'nda `dgYanilmaKonustu` (kullanıcının İklim'i) ve
   `wtLogDuygu` (Gözlemevi) ayrışmıştı; sonuç admin kadranında `0 · 1✕` —
   sıfır konuşmanın üstünde duran bir düzeltme. Kapı:
   `tests/13D-iki-defter-kapisi.test.js`.

İlgili: [[duygu-motoru-plani]] · [[gerceklik-mimarisi]] · [[bagsiz-ad-kapisi]] ·
[[yetim-kopru-denetcisi]] · [[gecmis-gunler-ozet-zinciri]]
