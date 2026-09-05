---
name: yetim-kopru-denetcisi
description: scripts/yetim-kopru-denetci.mjs "sessizce hiçbir şey yapmayan çağrı" sınıfının bekçisi — window.foo?.() karşılıksız köprü + bare foo() çağrısı; üçüncü bir sınıf (bare identifier OKUMA) kapsamı DIŞINDA kalır
type: mimari
---

# Yetim köprü denetçisi — iki sınıfı yakalar, üçüncü sınıf (OKUMA) dışarıda kalır

> **Bu dosya hakkında.** `tests/11-gecmis-gunler.test.js:245` bu ada
> `[[yetim-kopru-denetcisi]]` diye bağ veriyordu; hedef dosya
> `.claude/memories/` altında YOKTU (kapı: `tests/referans-butunlugu-kapisi.test.js`
> TABAN'ı, `hafiza:yetim-kopru-denetcisi`). Aynı isimli özgün dosya repoya
> hiç girmedi — `git log --all -- .claude/memories/yetim-kopru-denetcisi.md`
> boş döner ([[claude-altyapisi-commit-disi]]). **Bu dosya kurtarma
> değildir**; içeriği bugünkü koddan (`scripts/yetim-kopru-denetci.mjs`'in
> kendi banner'ı ve tarama mantığı, `scripts/bagsiz-ad-denetci.mjs`,
> `tests/11-gecmis-gunler.test.js`) yeniden keşifle yazıldı. Emsal:
> `boot-nabzi`, `olu-kod-temizlikleri`.
>
> **Kayıp olan:** denetçinin kuruluşuna yol açan orijinal olay örgüsü —
> 2026-08-07 ve 2026-08-19 denetimlerinin tam raporu, kaç saat sürdüğü,
> hangi sırayla bulgular çıktığı. Elde yalnız script'in kendi banner'ında
> KAYITLI özet sayılar var (altı vaka, iki ağır / altı vaka, dördü canlı
> yolda); bu sayılar aşağıda **kayıt** olarak aktarılır, bugün yeniden
> koşulup doğrulanmış ölçümler DEĞİLDİR.

**Why:** Bu repoda modüller arası köprü `window.*` üzerinden kurulur (§5.2)
— çağıran taraf `window.foo?.()` yazar, karşı uç `window.foo = foo` ile
expose eder. Optional chaining'in bedeli şudur: karşı uç HİÇ expose
edilmemişse çağrı sessizce `undefined` döner, ne konsol kızarır ne test
kırılır — özellik yalnızca sessizce çalışmaz. `scripts/yetim-kopru-denetci.mjs`
bu sınıfın statik bekçisidir ve kendi banner'ında (`:12-29`) İKİ sınıfı
açıkça ayırır:

- **Birinci sınıf** — `window.foo?.()` yazılmış ama `foo` hiçbir dosyada
  `window.foo = …` ile expose edilmemiş. Tarama iki adımdır: önce tüm
  expose adları toplanır (`window.foo = …` VE `Object.assign(window, {…})`
  hub'ı, brace-derinliği sayarak — `:86-110`), sonra karşılıksız
  `window.foo(` çağrıları bu kümeye karşı test edilir (`:112-134`,
  regex `:123`). Script'in kendi kaydına göre 2026-08-07'de altı vaka
  bulunmuş, ikisi ağır: `getHesapGunuContext`/`getWellnessContradictionContext`
  hiç kurulmamış olduğu için LLM bağlamı HER ZAMAN boş gidiyordu.
- **İkinci sınıf** (2026-08-19 eklendi) — köprü hiç kurulmadan `foo()`
  ÇIPLAK çağrılmış; ne import ne window köprüsü. Build bunu yakalamaz
  (Rollup'ın IIFE'i adı global sanar), runtime'da `ReferenceError`. Tarama
  önce dosyayı yorum/string'den arındırır (`govde()`, `:157-163`) — ama
  TEMPLATE LITERAL'LERİ BİLEREK SİLMEZ: eski regex `${...}` içindeki iç içe
  süslü/backtick'i yanlış eşleştirip 06-summary-chat'in %83'ünü,
  11-w2-chat-cal'ın %84'ünü denetçiye görünmez kılıyordu (`:146-156`,
  2026-08-19 ölçümü) — kaçırdığı gerçek yetimler arasında
  `applySessionPartDots` ve `getUserFirstName` vardı.

**Kardeş denetçi, TERS yön:** `scripts/bagsiz-ad-denetci.mjs:6-9` kendi
rolünü açıkça bu script'e göre tanımlar: *"[[yetim-kopru-denetcisi]]'nin
kardeşi. O, köprünün KARŞI UCUNU sorar (`window.foo?.()` yazıldı ama foo hiç
expose edilmiş mi?). Bu ise ÇAĞIRAN TARAFI sorar: `foo()` yazan modülde
`foo` diye bir bağ var mı — import edilmiş mi, tanımlanmış mı?"* Yöntemi de
farklıdır — elle regex değil, gerçek `tsc` scope analizi
(`tsconfig.bagsiz-ad.json`, `checkJs: true`), TS2304/TS2552 "Cannot find
name" çıktısını ayrıştırır. İkisi birlikte AYNI köprünün iki ucunu (hedef +
kaynak) kapatır; biri diğerinin yerine geçmez.

**Üçüncü sınıf — çağrı değil, OKUMA (kapsam dışı).**
`tests/11-gecmis-gunler.test.js:241-246`, `chDrawerOpenDay`'in bir zamanlar
bare `_currentLang` OKUDUĞUNU (çağırmadığını — atama/karşılaştırma amaçlı
bir değişken referansı) belgeler: *"O fonksiyon çıplak `_currentLang`
okuyordu — modülde ne tanım ne import vardı, yani her tıklama
ReferenceError ile ölüyor, panel hiç açılmıyordu (inline onclick hatası
kullanıcıya sessiz görünür). [[yetim-kopru-denetcisi]] üçüncü sınıfı: çağrı
değil, OKUMA."* Bugünkü kod bu bulguyu doğrular biçimde DÜZELTİLMİŞ hâldedir
— `js/parts/11-w2-chat-cal.js:759`: `const _lang = S._currentLang || 'tr';`
(doğru, `S.` önekiyle); repo genelinde bare `_currentLang` (önekiz) hiçbir
yerde bir tanım/değişken olarak yoktur, yalnız `js/state/settings.js:13`de
bir state ALANI adı olarak geçer.

Bu üçüncü sınıf `yetim-kopru-denetci.mjs`'in KENDİ iki deseninden de
YAPISAL olarak kaçar — ikisi de bir açılış parantezi arar
(`window\.(\w+)\s*(?:\?\.)?\(` `:123`, ve bare-çağrı deseni
`([a-zA-Z_$][\w$]*)\s*\(` `:218`); `_currentLang` gibi parantezsiz bir OKUMA
hiçbirine uymaz. **Kardeş denetçinin (`bagsiz-ad-denetci.mjs`) bu sınıfı
teorik olarak yakalayıp yakalayamayacağı** ayrı bir sorudur: TypeScript'in
"Cannot find name" (TS2304) kontrolü çağrı/okuma ayrımı yapmaz — aynı
biçimde her ikisini de bağsız adlarda tetikler (bu genel TS davranışı,
minimal bir örnekle bu turda doğrulandı, repoya özgü bir kanıt değildir).
Ama bu, `bagsiz-ad-denetci.mjs`'in söz konusu tarihsel vakayı FİİLEN
yakalayıp yakalamadığını KANITLAMAZ — repo git geçmişi tek bir `initial`
commit'e sıkıştığı için bu sıra bilinmiyor. Dürüst durum: üçüncü sınıf
bugün YALNIZCA davranışsal testle (`tests/11-gecmis-gunler.test.js`)
korunuyor, iki statik denetçiden hiçbiri onu KENDİ BANNER'INDA bir hedef
olarak tanımlamıyor.

**How to apply:**

1. "Özellik sessizce hiçbir şey yapmıyor" tipi bir bulguda İKİ denetçiyi de
   çalıştır — farklı yönlere bakarlar: `node scripts/yetim-kopru-denetci.mjs`
   (hedef boş mu) ve `node scripts/bagsiz-ad-denetci.mjs` (kaynak bağlı mı).
2. `inline onclick="…"` gibi HTML'den çağrılan fonksiyonlarda dikkatli ol —
   içindeki bir `ReferenceError` kullanıcıya SESSİZCE görünür (tıklama hiçbir
   şey yapmaz), konsola bile bazen düşmez çünkü olay işleyicisinin kendi
   hata yutma zinciri araya girer.
3. Yeni bir statik kural eklerken (üçüncü sınıfı `yetim-kopru-denetci.mjs`'e
   taşımak gibi) 2026-08-19'un dersini tekrarlama: gövde temizliği için
   template literal'leri silme regex'i yazma — ölçülmeden eklenen bir
   "temizlik" adımı, denetçinin gördüğü kod yüzeyini sessizce küçültebilir.
4. Bu sınıfın (bare okuma) GERÇEKTEN yakalanıp yakalanmadığından emin
   olmak istiyorsan varsayımla yetinme — küçük, izole bir `tsc` denemesiyle
   (bu dosyanın kendisinin yazılmasında yapıldığı gibi) ölç.

İlgili: [[claude-altyapisi-commit-disi]] (kayıp beyanının kök sebebi) ·
[[olu-kod-temizlikleri]] (§2'si bu iki denetçiyi "silmeden önce" prosedürünün
bir parçası olarak zaten kullanır) · [[kapi-tarama-yarisi]] (bu iki denetçi
de `js/`'i kendi `readdirSync`iyle gezdiği için aynı tarama-yarışı riskini
taşır — `yetim-kopru-denetci.mjs:93-97` ve `:115-119` bunun için ENOENT
yutar)
