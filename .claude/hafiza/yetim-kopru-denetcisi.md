---
name: yetim-kopru-denetcisi
description: "2026-08-07 — `window.foo?.()` karşılığı expose edilmemişse optional chaining hatayı yutar, özellik sessizce yapılmaz (altı vaka, kalıcı kapı). 2026-08-19 İKİNCİ SINIF: importsuz bare `foo()` — build geçer, runtime ReferenceError, try/catch yutar; altı vaka, dördü canlı yolda. 08-21: ÜÇÜNCÜ SINIF boşluğu [[bagsiz-ad-kapisi]] ile KAPANDI"
metadata: 
  node_type: memory
  type: project
  originSessionId: b0e9cefc-2a2e-4fbd-a6ef-186c65f14258
  modified: 2026-08-07T16:39:11.428Z
---

Modüller arası köprü bu repoda `window.*` üzerinden kurulur (§5.2 — TDZ
güvenli, minify dayanıklı). Bedeli şudur: çağıran `window.foo?.()` yazar,
karşı uç hiç expose edilmemişse **optional chaining hatayı yutar**. Ne konsol
kızarır, ne test kırılır — özellik yalnızca sessizce yapılmaz. Bu, "sahte
yeşil"in en sinsi biçimidir.

## 2026-08-07 denetiminde bulunan altı vaka

| Köprü | Sonucu |
|---|---|
| `getHesapGunuContext` | LLM'e giden `hesap` bağlamı HER ZAMAN boş; üstelik `commitment` kapısı (`hesapCtx ? '' : …`) hiç kapanmıyordu |
| `getWellnessContradictionContext` | `wellness` bağlamı hiç gitmiyordu |
| `oikCardRefs` | Mesafe Motoru (13x) erdemleri boş listeden okuyordu |
| `ktInit` | Abonelik değişince kota yeniden kurulmuyordu (08 → 13m) |
| `_saveArchetypeProgress` | Arketip ilerlemesi diske yazılmıyordu (10q → 12a) |
| `loadTransformationCards` | Zaten ölü: `#cards-view`/`#cards-grid-wrap` DOM'da hiç doğmuyor → route söküldü |

**Çözüm biçimi tek değil.** İki taraf zaten `import` ile bağlıysa köprü
kurmak yanlış — doğrudan çağır (10q→12a böyle çözüldü). Import yoksa
(06→13-extras, döngüsel bağımlılık riski) window köprüsü doğru kalıptır.

## Kapı

```
node scripts/yetim-kopru-denetci.mjs          # ihlalde exit 1
node scripts/yetim-kopru-denetci.mjs --liste  # listele, exit 0
```

`tests/yetim-kopru-kapisi.test.js` onu koşar (ihlalde vitest kırmızı) ve
ikinci bloğu **kapının kendisini** sınar — yakalamayan kapı, kapı değildir.
Bilinçli istisna satıra `/* YETIM-MUAF: gerekçe */` ile beyan edilir.

**Denetçi yazarken iki tuzağa düşüldü, ikisi de kapıya işlendi:**
1. `Object.assign(window, { a, b })` **tek satırlık** biçimi (00f deseni)
   `\n});` aramasıyla kaçıyordu → o dosyanın TÜM expose'ları yetim göründü
   (22 çağrılık yanlış alarm). Süslü parantez sayarak kesilir.
2. main.js hub'ında bir satırda onlarca ad var; satır başı regex'i yalnız
   ilkini alıyordu. Gövdedeki her tanımlayıcı sayılır.

## İkinci sınıf: importsuz **bare** çağrı (2026-08-19)

Yukarıdaki sınıf `window.foo?.()` yazıp karşılığı bulamamaktı. Kardeşi daha
sinsi: **köprü hiç kurulmamış, ad doğrudan çağrılmış.**

```js
const userName = getUserFirstName();   // ne import var, ne window.*
```

`getUserFirstName` yalnız `00-config-tracking.js`'te export'tu. Bare
identifier olduğu için **build sessizce geçer** (Vite/Rollup onu global
sanar), çalışma anında `ReferenceError` fırlar. Fark: burada optional
chaining yok — hata GERÇEKTEN fırlar, ama çağıran taraftaki `try/catch`
onu yutar. Sonuç aynı: sessiz kırık.

**Bulunan altı vaka, dördü canlı yolda:**

| Dosya | Ad | Sonucu |
|---|---|---|
| `12-w3-journey.js:62` | `getUserFirstName` | `w3GenerateDeepSummary` HER çağrıda ölüyordu → hiç gün özeti yazılmadı |
| `12-w3-journey.js` | `p` | aynı fonksiyonun ikinci yüzü (prompt sözlüğü) |
| `06-summary-chat.js:63` | `saveAnalyticsToSupabase` | **en ağırı** — bkz. aşağıdaki tuzak |
| `02-features-onboarding.js:22` | `detectMessageTone` | Yolculuk Haritası'nın ton sayımı |
| `02-features-onboarding.js:419` | `renderHistory` | kapanış kartı sonrası geçmiş çizilmiyordu |
| `12-w3-journey.js:287` | `loadRemainingHistory` | w3 migrasyon akışı |

### Tuzak: `.catch` argümanı korumaz

```js
Promise.resolve(saveAnalyticsToSupabase()).catch(e => console.warn(e));
```

`ReferenceError` **argüman değerlendirmesinde** fırlar — `Promise.resolve`
daha çağrılmamıştır, `.catch` hiç kurulmamıştır. Hata senkron yayılır ve
`requestChatExit`'in **altındaki dört arka plan işi** (profil güncelleme,
ödev üretimi, ilerleme, derin analiz) hiç çalışmaz. Bir satırın yetimliği
beş işi birden öldürüyordu.

### Nasıl bulunur

Regex ile "tanımsız çağrı" aramak gürültülüdür (360 şüpheli, çoğu yorum ve
i18n dizesi). Filtreyi bu sınıfa daraltmak keskinleştirir:

> **başka bir modülde `export` edilmiş** + bu dosyada çağrılmış +
> ne import ne yerel tanım ne `window.*` köprüsü

Bu filtre 11 sonuç verdi; 6'sı gerçek, 4'ü `window` köprülü (çalışıyor),
1'i false positive (çok satırlı destructuring parametresi —
`buildDeckData({ getAllArchetypeData, … })`). Mevcut kapı bu sınıfı
**görmez**: o `window.` önekli çağrılara bakar, bare identifier'a değil.

## Sınırı (dürüstçe)

Yalnız **adın varlığını** sorar; imzayı ya da **çağrı zamanını** değil.
"`window.foo` doğru anda mı asılıyor (post-auth mı, boot mu)" sorusunu
cevaplayamaz — onu ancak davranışsal doğrulama bulur. Nitekim aynı turdaki
kardeş kırık ([[yuz-cizgisi-motoru]] tazeleme listesi) bu denetçiye
görünmezdi: orada köprü vardı, **çağıran** eksikti.

**Why:** Sessiz kırık, kırmızı testten tehlikelidir — build yeşil, konsol
temiz, özellik yok. Elle bulunan şey ikinci kez elle bulunmasın.

**How to apply:** Yeni bir `window.x?.()` çağrısı yazarken karşı ucun expose
edildiğini aynı turda doğrula. Kapı zaten koşuyor; kırmızıysa ya expose et,
ya çağrıyı kaldır, ya muafiyeti gerekçesiyle beyan et.

Bkz. [[cekirdek-omurga-haritasi]] · [[fable-5-kod-parmak-izi]] ·
[[gerceklik-mimarisi]] · [[olu-kod-temizlikleri]]

## ÜÇÜNCÜ SINIF ve kör alan (2026-08-19)

**Üçüncü sınıf: çağrı değil OKUMA.** `11-w2-chat-cal.js`'in altı satırı
`_currentLang` diye tanımsız bir ad okuyordu (doğrusu `S._currentLang`).
`chDrawerOpenDay` içindeki satır her tıklamada `ReferenceError` atıyor, inline
`onclick` yutuyordu — Geçmiş Günler listesi dolu ama tıklanmaz haldeydi.
Denetçi bunu YAKALAMAZ: kapsamı `ad(` desenidir. Okuma sınıfı için ölçüm
yapıldı; `_`-önekli tanımsız okumaları taramak 14 şüpheli veriyor, çoğu çoklu
`let a = 1, b = 2` tanımından. Kapı o gün kurulmadı — **2026-08-21'de kuruldu**
ve okuma/atama sınıflarını da kapsıyor: [[bagsiz-ad-kapisi]] (tsc `checkJs`,
TS2304). O kapı bu denetçinin göremediğini görür: **çağıran modülün kendi
import kümesini** sorar. Kanıt — bu denetçi 08-19'da `06:requestChatExit`
içindeki `saveAnalyticsToSupabase`'i buldu ama **aynı satırların üç komşusunu**
(`saveSessionPatterns`, `generateHomework`, `updateTrackProgress`) kaçırdı;
üçü de export'luydu, üçü de import'suzdu. İkisi kardeştir, biri diğerinin
yerine geçmez: bu denetçi `window.*` köprüsünün karşı ucunu sorar, o ise
çağıranın scope'unu.

**Kör alan — ölçüldü ve KAPATILDI.** `govde()` template literal'leri
`` `(?:\.|\$\{[^}]*\}|[^`\])*` `` ile siliyordu; iç içe `${...}` gördüğü her
yerde yanlış eşleşip devasa blokları tek dize sayıyordu. Ölçüm:
**06-summary-chat'in %83'ü, 11-w2-chat-cal'ın %84'ü hiç taranmıyordu.** O kör
alanda üç gerçek yetim yaşıyordu: `applySessionPartDots` (her geçmiş seans
açılışında), `getUserFirstName` (her kullanıcı mesajı çiziminde), `_createMsgEl`.

Düzeltme: template'ler artık **silinmez** — içindeki `${foo()}` gerçek bir
çağrıdır ve onu görmek denetçinin işidir. Tanımlar **ham kaynaktan** toplanır:
gövde temizliği tanımı yutarsa denetçi kendi tanımlı adını yetim sanar (113
yanlış alarm ölçüldü, ham kaynağa geçince 14'e düştü). Bedel: repo genelinde
tek ek şüpheli — o da gerçek yetim çıktı. Taranan export adı **795 → 962**.
Kapı: `tests/yetim-kopru-kapisi.test.js` son üç test.

Ayrıntı: [[gecmis-gunler-tiklanabilir]]
