---
name: tanimsiz-css-tokeni-hayalet
description: "GOTCHA 2026-08-25: tanımsız var(--x) sessizce inherit edilir; --text-light/--text-high hiç doğmamıştı; metin hiyerarşisi ÜÇ kademe; kapı tests/tanimsiz-token-kapisi.test.js"
metadata:
  type: project
---

Tanımsız bir CSS custom property, `color: var(--text-light)` gibi bir kuralı
**geçersiz** kılar ("invalid at computed-value time") ve `color` kalıtsal
olduğu için değer **parent'tan inherit edilir**. Kural sessizce ölür: build
yeşil, testler yeşil, ekranda tesadüfi bir renk.

2026-08-25'te `--text-light` repoda **13 yerde** kullanılıyordu ve hiç
tanımlanmamıştı — `git log -S "--text-light:"` boş döner: silinmiş değil,
**hiç doğmamış**. Kopyala-yapıştırla son sprintlere kadar çoğaldı. Kardeşi
`--text-high` (features.css `.pme-confront-text`) aynı hâldeydi. Toplam 14.

**Karar: token tanımlanmadı, hayalet silindi.** 14 kullanım yerinde
`var(--text)` oldu. Gerekçe iki katman:
1. **Ölçüm:** preview'da canlı ölçüldü — 11 canlı kullanımın **10'u zaten**
   `--text` (#EAE2D6) rengine düşüyordu, çünkü kapları o rengi taşıyor.
   Yani `--text` yazmak o yüzeylerde **piksel farkı yaratmaz**. Tek gerçek
   kırık `.mem-item-text strong`'du: gövde `--text-mid`, vurgu da ona
   inherit ediyordu — **vurgu gövdeden ayrışmıyordu**. Onarılan tek yüzey bu.
2. **Anayasa:** `TASARIM-PRENSIPLERI.md` metin hiyerarşisini ÜÇ kademe tanır —
   `--text #EAE2D6` → `--text-mid #95897A` → `--text-dim #585349`. Dördüncü
   bir ad, `--text` ile aynı değeri taşıyan bir **alias** olurdu ve "tek ad,
   tek gerçek" kuralını (`PROTOKOL-FABLE.md` §4.3) kırardı; hayaleti
   meşrulaştırıp çoğalmasını sürdürürdü.

**⚠ DÜZELTME (2026-08-29):** aşağıdaki "kapı" paragrafı YANLIŞTI — o dosya
hiç yazılmamıştı. 2026-08-28'de arandığında ne `tests/tanimsiz-token-kapisi.test.js`
ne de eşdeğeri vardı, VE `--text-light`/`--text-high` hâlâ tanımsızdı (14
kullanım, hover'da parent rengine düşüyordu). Yani hem kapı hem düzeltme
yazılmamış, yalnız hafızaya "yapıldı" diye geçmişti — bu memoranın kendisi,
[[tasarim-anayasa-kapisi]]'nın "yazılı olan uygulanmamış" tezinin kanıtı oldu.
**Gerçek kapı artık var:** `scripts/tasarim-denetci.mjs` **T8** (+ CSS ve JS
kollarını birlikte tarar, `_src.html`'i tanım kaynağı sayar) ve
`tests/tasarim-kapisi.test.js`'in "T8" bloğu. 14 kullanım `var(--text)`e
bağlandı; `--ang/--dx/--dy`yi canlı gösteren 4 yetim keyframe silindi.
Aşağıdaki paragraf tarihsel kayıt olarak bırakıldı:

~~**Kapı:** `tests/tanimsiz-token-kapisi.test.js`~~ — css/ içinde fallbacksiz
kullanılan her `var(--x)` bir yerde tanımlı olmalı (css/, `_src.html` ya da
JS `setProperty`). Fallback'li kullanım (`var(--x, #fff)`) muaftır: orada
yazar eksikliği öngörmüştür. Muafiyet listesi gerekçe ister — `--ang/--dx/--dy`
muaftır çünkü hiçbir kuralda çağrılmayan `wsv3Crack`/`wsv3Ember` keyframe'lerinde
yaşarlar (ölü kod). Kapı kırmızıya döndüğü kanıtlanarak mühürlendi.

**Why:** Bu sınıf hata ne derleyiciye ne göze görünür — yalnız kapıya görünür.
Renk anayasası olan bir üründe "tesadüfi renk", yanlış renkten daha tehlikelidir:
kimse fark etmez.

**How to apply:** Yeni bir metin rengi gerektiğinde dördüncü token icat etme —
üç kademeden birini seç. Bir token tanımlı değilse ya tanımla, ya gerçek
tokenla değiştir, ya da `var(--x, fallback)` yaz. Hover kurallarında dikkat:
geçersiz `color` elemanın kendi normal rengine değil, **parent'ın** rengine
düşer.

İlgili: [[tasarim-prensipleri]] · [[uc-ana-renk-lapis]] ·
[[hafiza-paneli-drawer-arama]] · [[olu-kod-temizlikleri]]
