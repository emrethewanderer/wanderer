---
name: tasarim-anayasa-kapisi
description: 2026-08-28 — tasarım anayasasının ölçülebilir maddeleri kapıya bağlandı (T1–T5); kapısı olmayan kural tavsiyeye döner
metadata: 
  node_type: memory
  type: project
  originSessionId: 929b955b-eebe-4b08-b493-44b2cca1acc7
  modified: 2026-08-28T17:47:34.331Z
---

**Kapısı olmayan kural, zamanla tavsiyeye döner.** 2026-08-28'de ölçüldü ve
kapatıldı: `TASARIM-PRENSIPLERI.md`'nin üç maddesi yazılı olduğu hâlde
uygulanmamıştı — §3'ün "kenarlara doğru erir"i içeriğe hiç değmemişti
(`mask-image` kullanımı **0**, 5 kaydırma kabı kesik bitiyordu), §5'in
"istisnasız" dediği `prefers-reduced-motion` **6 dosyada** yoktu, §8'in
z-index kuralı **38 yerde** delinmişti.

Kök neden dikkatsizlik değil **yapısaldı**: repoda çalışan altı kapı vardı
(gerceklik, ihtimalsel, bagsiz-ad, yetim-kopru, dil-buyuk-harf,
gren-kaydirma) ve tasarım anayasası hiçbirine bağlı değildi.

**Yedinci kapı:** `scripts/tasarim-denetci.mjs` + `tests/tasarim-kapisi.test.js`
(`gerceklik-denetci` deseninin ikinci kullanımı: `--liste` / `--dizin` /
6 satırlık MUAF penceresi / kör nokta defteri). Muafiyet:
`/* TASARIM-MUAF: gerekçe */` — gerekçesiz muafiyet de ihlaldir.

| Kural | § | Ne denetler | Kapanan ihlal |
|---|---|---|---|
| T1 | §8 | `z-index` ≥20 çıplak yazılamaz | 38 |
| T2 | §5 | `@keyframes` olan dosyada reduced-motion bloğu | 6 dosya |
| T3 | §5 | Ev eğrisinin çıplak kopyası (fallback muaf) | 0 |
| T4 | §1 | Altın/lapis dolgu üstünde çıplak `#000` | 8 |
| T5 | §4 | Display serif ≥28px'te `letter-spacing` kararı | 6 |

**Kapı, elle sayımı üç kuralda düzeltti** — kapının gerekçesinin kendi kanıtı:
T1 27→38 (grep tek biçim arıyordu), T4 6→8, T5 elle tarama bir 96px başlığı
kaçırmıştı. T3 ise 13→**0**: hepsi `var(--ease-out, cubic-bezier(…))`
fallback'iymiş.

**Why:** Anayasanın maddesi ancak koşulabilir olduğunda kuraldır. Üç madde
yazıldıkları gün ölmeye başlamıştı; kimse kuralı reddetmedi, kimse de
uygulamadı.

**How to apply:**
1. Görsel iş bitince `node scripts/tasarim-denetci.mjs` koş.
2. **Belgeye yeni görsel kural yazdıysan iş bitmemiştir:** ölçülebiliyorsa
   denetçiye kural + kapıya üç test (yakalıyor mu · doğru yerde susuyor mu ·
   muafiyet çalışıyor mu) ekle ve maddeye 🔒 rozeti koy; ölçülemiyorsa
   belgenin "yargıya bırakılanlar" listesine yaz.
3. **Kapı gürültü üretirse töreve döner** — yanlış pozitif, açıktan hızlı
   öldürür. T3 ilk koşuda 14 bulgunun 13'ü meşru çıktı ve aynı gün daraltıldı;
   T1 eşiği 10→20 yapıldı (ilk global basamak `--z-topbar: 40`).
4. **T1 düzeltmesinin kuralı: sayıyı kaydırma, katmana ad ver.** 25 yeni
   `--z-*` token mevcut değerleri birebir taşıyor. Tören sırası CANLI
   bağımlılıktır — Gördün (9658) Yol'un (9655) üstünde açılmak zorunda.
5. **T2 tuzağı:** görünürlüğünü animasyondan alan öğede (`opacity: 0` +
   `animation … both`) hareketi kesmek onu görünmez bırakır — opaklığı elle
   geri ver (`.mt-row`). Akış `animationend`'e bağlıysa önce JS'in `reduce`'u
   bildiğini doğrula.
6. **T5 sayıya uygulanmaz** — harf aralığı iki harf arasında yaşar; `.wr-big`,
   `.kt-ring-num`, `.om-teaser-num`, `.kt-prem-hero-inf` gerekçeli muaf.

Aynı turda §3'ün içerik hâli de yazıldı: `--mask-fade-x` / `--mask-fade-b`
token motoru (4 tüketici; yardımcı sınıf seti öz-denetimde ölü çıktı ve
söküldü — maskelenecek şeritlerin hepsi başka modülün selector'ında yaşıyor), `--sp-1..7`/`--sp-section` ritim merdiveni (152 token
vardı, boşluğun token'ı yoktu) ve `--ls-display`. Kaynak: Resend'in yüzey
ölçümü — ama alınan şey görsel dili değil **kenar disiplini**; saf siyah zemin,
neon vurgu, sans display ve SaaS vitrin ritmi anayasayla çarpıştığı için
bilinçle elendi.

## İkinci sprint (2026-08-29) — açık maddelerin kapatılması

Üç "kapsam dışı" madde de kapandı ve üçü de **sanılandan küçük** çıktı; asıl
ders ölçmeden kapsam tahmin etmemekti:

- **JS-gömülü stiller** (kör nokta 1) → denetçi artık `js/`yi de tarar:
  şablon dizesi CSS'i, `style.cssText`, `style.zIndex`. Kapının GÖREMEDİĞİ
  yer, kuralın en çok delindiği yer çıktı: **22 çıplak katman** oradaydı.
  14 yeni token (748–1000 overlay yığını). ⚠ `el.style.zIndex = 'var(…)'`
  ÇALIŞMAZ (property hesaplanmış sayı bekler) →
  `el.style.setProperty('z-index', 'var(--…)')`; preview'da 770 çözülerek
  doğrulandı.
- **§4 Türkçe büyük harf** → 215 `uppercase`ın tek tek denetlenmesi
  GEREKMİYOR: büyütmenin locale'i **kökten** gelir ve `<html lang>` zaten
  dinamik. Korunan tek şey o senkron (T6, `dil-buyuk-harf-kapisi` CSS kolu)
  + sabit dilli yüzeyin kendi `lang`i (13q emsali).
- **Yargı maddeleri** → ölçülemeyen şey metaforun DOĞRULUĞU; VARLIĞI değil.
  **T7**: yeni `js/parts` modülü banner'sız doğamaz. 122 modülün 42'sinde
  banner yoktu; kapı borcu KAPATMAZ, BÜYÜMESİNİ durdurur
  (`scripts/tasarim-taban.json`, `--taban-yaz`; emsal: ihtimalsel taban).
- **T8** (hayalet token) bu sprintte doğdu — bkz. yukarıdaki tablo.

**Uyanan sahne (`.wn-reveal`)** — §5'in kademeli girişi artık kaydırırken de
sürüyor (motor: `00a-infrastructure` §16, işaret `data-reveal` +
`.doc-section`). Üç sözleşme:
1. **Gizleme yalnız EKRAN DIŞINDA.** Görünen öğeye sınıf takmak onu bir kare
   soldurup geri açar — kullanıcı yanıp söndüğünü görür. İlk yazımda kırık
   tam buydu; gözlemcinin `else` kolu bunun için var.
2. **Bir kez uyanan sönmez** — yol geriye akmaz (Yolculuk metaforu).
3. **Gizleme `html.wn-reveal-on` kapısına asılı**: JS düşerse içerik görünür
   kalır (§5.2 asla bloklama).
⚠ Bu motor **preview'da doğrulanamaz**: sayfa `visibilityState: 'hidden'`
iken tarayıcı IntersectionObserver'ı hiç çalıştırmaz (ham bir IO bile
tetiklenmedi). Davranış `tests/00a-uyanan-sahne.test.js`'te sahte gözlemciyle
sürülür; preview yalnız CSS tarafını doğrular.

**Yan bulgu — tarihe bağlı kırılgan test.** `13u-soz-defteri` testi 28→29
Ağustos geçişinde kırıldı: `gun(-120)` o gün 96 günlük döngüyle AYNI aya
düştü. Kod doğruydu (`_aylikTuret` ayı kısmen penceredeyken türetir, donma
ay TAMAMEN düşünce kurulur); kırık testin tarih varsayımındaydı. Önce kodu
"düzeltmeye" kalkıştım ve geri aldım — kanıtsız davranış değişikliği
bırakılmaz. `-200` ile düzeltildi, varsayımın kendisi de teste yazıldı.

Plan: `.claude/plans/tasarim-anayasa-kapisi.md`.
İlgili: [[tasarim-prensipleri]] [[gerceklik-mimarisi]]
[[gerceklik-denetci-muafiyet-penceresi]] [[gren-kaydirma-sarmali]]
[[gordun-pencereden-bakis]] [[claude-tarzi-gorsel-dil]] [[uc-ana-renk-lapis]]
