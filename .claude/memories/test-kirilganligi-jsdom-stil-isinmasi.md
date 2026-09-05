---
name: test-kirilganligi-jsdom-stil-isinmasi
description: jsdom'un devasa bir stil bloğunu ilk kez çözümlemesi pahalıdır; maliyet testin ilk gerçek çağrısında ödenirse yük altında zaman aşımına düşer — çare beforeAll'da AYRI, YÜKSEK bir timeout'la önceden ısıtmaktır
type: gotcha
---

# jsdom stil ısınması — devasa CSS bloğunun ilk çözümlenmesi pahalıdır

> **Bu dosya hakkında.** `tests/10q-hedef-muhru.test.js:165` bu ada
> `[[test-kirilganligi-jsdom-stil-isinmasi]]` diye bağ veriyordu; hedef dosya
> `.claude/memories/` altında YOKTU (kapı: `tests/referans-butunlugu-kapisi.test.js`
> TABAN'ı, `hafiza:test-kirilganligi-jsdom-stil-isinmasi`). Aynı isimli özgün
> dosya repoya hiç girmedi — `git log --all -- .claude/memories/test-kirilganligi-jsdom-stil-isinmasi.md`
> boş döner ([[claude-altyapisi-commit-disi]]). **Bu dosya kurtarma değildir**;
> içeriği bugünkü koddan (`js/parts/10q-w2-kisi-karti.js`, `vite.config.js`,
> repo genelindeki `beforeAll` kalıpları) yeniden keşifle yazıldı — her cümle
> bir `dosya:satır` taşır. Emsal: `boot-nabzi`, `olu-kod-temizlikleri`.
>
> **Kayıp olan:** bu tuzağın ilk yakalandığı ölçüm — kaç saniye sürdüğü, kaç
> testin bundan etkilendiği, ilk defa hangi CI/lokal koşuda kırmızı bastığı.
> Elde yalnız BUGÜNKÜ çarenin kod izi var (30000 ms'lik `beforeAll`); olayın
> kendisi (ilk kırılma) kayıp.

**Why:** `js/parts/10q-w2-kisi-karti.js:3196-3857`'deki `kkEnsureStyles()`
fonksiyonu, `#kk-styles` id'li bir `<style>` etiketi henüz yoksa
(`:3197` guard) tek bir template literal içinde **653 satırlık** CSS'i
(`:3199-3851`, backtick sınırları `:3198` ve `:3852`) DOM'a enjekte eder —
80'ler paketi, mühür töreni, evrim
sahnesi, sentez töreni gibi çok sayıda ekranın tüm görsel dilini taşıyan tek
bir blok. jsdom bu bloğu İLK kez gördüğünde parse/kurulum maliyeti öder;
maliyet testin ilk **gerçek** çağrısında (`kkOpenDetail` gibi) ödenirse, o
belirli test CPU baskısı altında (paralel worker'lar, yavaş makine) zaman
aşımına düşer — kodda bir hata OLMADAN.

Bu, repo genelinde bilinen ve zaten bir kez telafi edilmiş bir sınıf:
`vite.config.js:57-63` global `testTimeout`u 5000 ms'lik varsayılandan
20000 ms'e çıkarırken tam bu isimle üç modülü sayar — *"jsdom'da ağır modül
grafiğini ısıtan ilk testler (02c onboarding, 09d örüntü, 09e portre,
**10q kart töreni**, 12f hazine)"*. `tests/10q-hedef-muhru.test.js:166`nın
kendi `beforeAll`ı yükseltilmiş global 20000 ms'e bile GÜVENMEYİP AÇIKÇA
kendi `beforeAll`ında 30000 ms'lik bir üçüncü argüman kullanıyor. Bu tek
dosyaya özgü bir karar değil — repo genelinde `deckReady()` (kart destesi
yükleme) ısıtan HER `beforeAll` (14 ayrı test dosyasında, 17 yerde) AYNI
`, 30000)` desenini taşır; ne sebep gösterildiği (yalnız 20000'in ölçülüp
yetersiz bulunduğu mu, yoksa bu deseni ilk yazanın 30000'i baştan tercih
ettiği mi) repodan okunamıyor — yalnız desenin KENDİSİ tutarlı. Tek fark
`10q-hedef-muhru.test.js:166`da: orada İKİ ağır maliyet ÜST ÜSTE biniyor —
`deckReady()` VE `kkEnsureStyles()` (yukarıdaki 653 satırlık blok) AYNI
`beforeAll` içinde birleşiyor. Bu birleşimi yapan tek yer burasıdır —
repodaki diğer 13 dosya yalnız `deckReady()`yi ısıtır, `kkEnsureStyles()`i
hiç çağırmaz.

**How to apply:**

1. Bir test dosyası, birinci `it()`sinde HENÜZ ısıtılmamış ağır bir
   grafiği (deste yükleme, stil enjeksiyonu, ilk render) tetikleyen bir
   fonksiyonu çağırıyorsa, o maliyeti `describe` bloğunun `beforeAll`ına
   TAŞI — ilk gerçek testin üzerine binmesin.
2. `beforeAll` çağrısına global `testTimeout` (20000 ms, `vite.config.js:63`)
   yetmiyorsa AÇIKÇA daha yüksek bir sayı ver — repo konvansiyonu üçüncü
   argüman: `beforeAll(async () => { … }, 30000)`. Sessizce global sınıra
   güvenme; birleşen maliyet (deste + stil gibi) global sınırı aşabilir.
3. **Belirti tanısı:** bir testin yalnız CI'da / paralel koşuda / yavaş
   makinede zaman aşımına düşüp lokal tek-dosya koşusunda geçmesi bu
   sınıfın klasik izidir — kodda hata değil, ısınma maliyetinin YANLIŞ
   teste düşmesi.
4. Yeni bir "ısıtılması gereken" fonksiyon eklerken önce grep'le sor:
   `grep -rn "beforeAll(async.*=>.*,\s*[0-9]\{4,\}" tests/` — aynı kalıp
   zaten var mı, tek başına mı yoksa (bu dosyadaki gibi) birleşik mi
   gerekiyor.

İlgili: [[claude-altyapisi-commit-disi]] (kayıp beyanının kök sebebi) ·
[[olu-kod-temizlikleri]] (kayıp içerikle başa çıkmanın emsali)
