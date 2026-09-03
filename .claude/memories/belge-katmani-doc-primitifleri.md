---
name: belge-katmani-doc-primitifleri
description: css/parts/document.css'in `.doc-*` primitifleri (eyebrow/section/title/lead/seal/tablebox/pill/card/phase/note) editoryal yüzeylerin tek dili — 00a-infrastructure.js'in `.wn-reveal` motoru `.doc-section`'ı otomatik kapsar; `.doc-rise` KAPSAYICIYA, `.doc-section` İÇ BÖLÜMLERE takılır, ikisi çakışmaz
type: mimari
---

# Belge katmanı (doc-*) — editoryal yüzeylerin tek primitif ailesi

> **Bu dosya hakkında.** `js/parts/00a-infrastructure.js:900`'deki yorum bu
> ada `[[belge-katmani-doc-primitifleri]]` diye bağ veriyordu; hedef
> `.claude/memories/` altında YOKTU (kapı: `tests/referans-butunlugu.test.js`
> TABAN'ı). Aynı isimli bir özgün dosya repoya hiç girmedi —
> `git log --all -- .claude/memories/` bu adı hiç döndürmüyor
> ([[claude-altyapisi-commit-disi]]). **Bu dosya o özgün metnin kurtarılmış
> hâli DEĞİLDİR.** İçeriği bugünkü repodan (`css/parts/document.css`,
> `00a-infrastructure.js`'in `.wn-reveal` motoru, `TASARIM-PRENSIPLERI.md`
> ve fiilî tüketici dosyaları) yeniden keşifle yazıldı; her cümlenin bir
> `dosya:satır` karşılığı var. Emsal: `[[olu-kod-temizlikleri]]`.
>
> **Kayıp olan:** primitif ailesinin İLK kurulduğu oturumun kararları — kaç
> ekran plana girdi, hangileri bilinçli DIŞARIDA bırakıldı. Elde yalnız
> bugünkü `document.css` dosyasının kendi başlık yorumu var ("Kaynak: Emniyet
> Katmanı raporunun onaylanan editoryal estetiği"); o raporun kendisi ve
> ilk kapsam kararı bu dosyaya taşınamadı.

**Why:** `css/parts/document.css`'in kendi başlık yorumu kapsamı ÇİZER:

```
BELGE KATMANI (doc-) — editoryal/bilgi yüzeyi primitifleri
Kart motoru (12c-kart-gorsel.js) ve tören sahneleri (mühür, kilometre
taşı, flip, Mektuplar, Manifesto Reader) bu dosyanın KAPSAMI DIŞINDADIR
— onlar kendi dilinde kalır.
Dört sesli koro korunur: Cinzel-kicker = tören/ritüel (dokunulmaz),
Barlow-eyebrow (sessiz altın) = belge/bilgi — bu dosyanın sesi.
```
(`document.css:1-9`) Yani `doc-*` bilinçli bir AYRIMDIR: kart/tören
yüzeyleri kendi görsel dilini korur (Cinzel, mühür fiziği), belge/rapor
yüzeyleri (editoryal, bilgi aktaran) ayrı ve tek bir primitif ailesi
paylaşır — `TASARIM-PRENSIPLERI.md`'nin "Dört sesli koro" maddesi
(`:153-160`) bu ayrımı Cinzel/Fraunces/Garamond/Barlow dörtlüsüyle
genel kural olarak da yazar.

**How to apply:**

## 1 · Primitif ailesi (`css/parts/document.css`)

| Sınıf | Rol |
|---|---|
| `.doc-eyebrow` (+ `--crit`) | Numaralı bölüm kickeri — Barlow, altın/kırmızı |
| `.doc-section` | Numaralı bölüm bloğu, `margin-top: 64px` |
| `.doc-title` / `.doc-lead` | Başlık (Fraunces) / açıklayıcı satır (EB Garamond) |
| `.doc-rise` + `@keyframes docRise` | Giriş animasyonu — ev eğrisi, reduced-motion'da `none` |
| `.doc-seal` | Kritik bulgu kutusu (kırmızı çerçeve/degrade) |
| `.doc-fixed-badge` | "✓ düzeltildi" rozeti |
| `.doc-tablebox` | Tablo kabı — `TASARIM-PRENSIPLERI.md:147`'nin mask-fade
  eleme örneği (tam-ekran `scroll-snap` sayfa kaydırıcılarına asılmaz) |
| `.doc-pill` (+ `--crit/--high/--mid/--ok`) | Durum etiketi |
| `.doc-cards` / `.doc-card` / `.doc-card-k` | Kart ızgarası |
| `.doc-phase` / `.doc-phase-item` (+ `.done`) | Aşama/zaman çizelgesi |
| `.doc-note` (+ `--gold`) / `.doc-foot` | Dipnot / alt bilgi |

(satır numaraları `document.css`'in kendi grep'inde: `.doc-eyebrow:15`,
`.doc-section:26`, `.doc-title:30`, `.doc-lead:40`, `.doc-rise:51`,
`.doc-seal:61`, `.doc-fixed-badge:82`, `.doc-tablebox:99`, `.doc-pill:130`,
`.doc-cards/.doc-card:149-176`, `.doc-phase:187-212`, `.doc-note/.doc-foot:221-238`)

## 2 · `.wn-reveal` motoru `.doc-section`'ı OTOMATİK kapsar

```
/* Gözlenecek yüzeyler. `[data-reveal]` bilinçli işarettir; `.doc-section`
   ise yapısal olarak zaten "uzun, kaydırılan, bölümlü" tanımına uyar ve tek
   satırla bütün belge katmanına yayılır (Hukuki, GDPR, Ayarlar, Ayna,
   Hafıza — [[belge-katmani-doc-primitifleri]]). `.doc-rise` ile çakışmaz:
   o KAPSAYICIYA takılır, bu iç bölümlere — kapsayıcı gelir, bölümler
   yürüdükçe uyanır. */
const WN_REVEAL_SEC = '[data-reveal]:not(.wn-seen), .doc-section:not(.wn-seen)';
```
(`00a-infrastructure.js:897-903`) Yeni bir `.doc-section` eklemek EK bir
`data-reveal` işaretine gerek DUYMAZ — `wnRevealScan()` seçiciyi otomatik
tarar. `.doc-rise` ile `.wn-reveal`/`.wn-seen` (motorun kendi sınıfları,
`css/parts/base.css:455-468`) İKİ AYRI hareket katmanıdır: `.doc-rise` bir
KAP açılırken bir kerelik oynar (ör. panel mount), `.wn-reveal` kaydırma
sırasında her `.doc-section` kendi sırasında uyanır — aynı öğeye ikisi
birden takılmaz.

## 3 · Fiilî tüketiciler — yorumun listesiyle bugünkü kod ayrışıyor

`00a-infrastructure.js:900`'ün yorumu belge katmanını "Hukuki, GDPR,
Ayarlar, Ayna, Hafıza" diye örnekler. Bugünkü `grep -rc "doc-" js/parts/*.js`
şunu gösteriyor:

| Dosya | `doc-` sayısı | Yorumdaki karşılığı |
|---|---|---|
| `gdpr.js` | 3 | GDPR ✓ |
| `07-settings-knowledge.js` | 1 (`.doc-tablebox`) | Ayarlar ✓ (kısmi) |
| `13t-donusum-aynasi.js` | 31 | Ayna — bkz. not aşağıda |
| `13p-hukuk.js` | **0** | Hukuki listede ama KULLANMIYOR |
| `09c-memory-panel.js` | **0** | Hafıza listede ama KULLANMIYOR |
| `13C-postane.js` | 12 | listede YOK ama kullanıyor |
| `10y-w2-llm-shell.js` | 4 | listede YOK ama kullanıyor |
| `10C-sosyal-feed.js` | 2 (`.doc-pill`) | listede YOK ama kullanıyor |

**"Ayna" belirsiz — repoda o adla birden çok yüzey var.** `09g-ayna-protokolu.js`
(Ayna Protokolü), `09h-ayna-ani.js` (Ayna Anı) ve `10g-w2-wanderer-game.js`'in
`loadAynaView()`'i (`#ayna-view`, Davranış Kanıtı hub'ı) `doc-` sınıfı HİÇ
kullanmıyor (üçünde de grep sıfır); yalnız `13t-donusum-aynasi.js`
("Dönüşüm Aynası") kullanıyor. Yorumun hangi "Ayna"yı kastettiği koddan
KESİN olarak belirlenemez — bu yüzden burada iddia edilmiyor, yalnız
gözlem kaydediliyor.

**Bu bir ayrışmadır ve doğru olan KODDUR (§6.10/K1 sınırı):** yorum beş
örnek isim verir, ama en az iki isim (Hukuki, Hafıza) bugün hiç `.doc-`
sınıfı taşımıyor; iki dosya (Postane, LLM kabuğu ana kartı) listede
YOKKEN yoğun biçimde kullanıyor. Yorum ya yazıldığı andan sonra Hukuki/
Hafıza ekranları başka bir görsel dile geçti, ya da liste baştan
aspiratifti (planlanan ama hiç uygulanmayan kapsam) — hangisi olduğu bu
koddan ÇIKARILAMAZ, bu yüzden iddia edilmiyor. Yeni bir editoryal ekran
eklerken kaynak `document.css`'in kendisi ve bu tablo esas alınır, yorumun
beş-isim listesi değil.

İlgili: [[claude-altyapisi-commit-disi]] (bu dosyanın neden eksik olduğu) ·
[[olu-kod-temizlikleri]] (kayıp içerikle başa çıkmanın emsali) ·
[[boot-nabzi]] (`.wn-reveal` de aynı "asla bloklama" savunmacı stilini
paylaşır — motor düşerse içerik görünür kalır)
