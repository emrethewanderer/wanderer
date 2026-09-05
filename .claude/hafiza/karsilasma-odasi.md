---
name: karsilasma-odasi
description: "KARAR 2026-08-18 — Kişilerim kartları iki ana kartın ARKASINA geçti; kutba dokunmak tam ekran Karşılaşma odasını açıyor (13B): yatayda üç sayfa, dikeyde sentezden onu oluşturanlara iniş. 2026-08-23: iki ana kart artık ÇEVRİLMİYOR, detay penceresini açıyor; altlarında masaya giden buton var"
metadata:
  type: project
---

Emre'nin 2026-08-18 kararı: *"Bugün'deki Kişilerim'deki kartlar İki Ana
Kart'ın arkasında çıksın ve oraya geçildiğinde tüm ekranı kaplayan Shorts
gibi Olduğum Kişi görünsün; tıklandığında arkaya dönerek kartın içeriğini
göstersin; ekranı sola çektiğimizde Olmak İstediğin Kişi de aynı tasarımla
gelsin."*

Üç kapsam sorusu soruldu, üçü de cevaplandı:

1. **Yatay akış ÜÇ sayfadır:** `OLDUĞUN KİŞİ → GEÇİŞ KARTIM → OLMAK
   İSTEDİĞİN KİŞİ`. Yürünen yol iki kutbun fiziksel ortasında. Aktif geçiş
   kartı yoksa o sayfa **hiç doğmaz** — akış ikiye iner (§6.10).
2. **`#kk-bugun` bölümü SÖKÜLDÜ**, yerine Derin Çalışma'nın Bugün penceresi
   geldi (`#dc-bugun`, 13A `dcRenderBugun`).
3. **Dikey kaydırma destedir (gerçek Shorts):** kat 0 sentez, altındakiler
   onu OLUŞTURANLAR.

Plan: `.claude/plans/karsilasma-tam-ekran-kartlar.md` (8 faz, hepsi bitti).

## Mimari — hiçbir motor ikizlenmedi

| Katman | Nerede | Not |
|---|---|---|
| Akış çözücüsü | `13B` `karSayfalar/karAkis/karGirdiCoz` | deste KURMAZ, tüketir |
| Deste verisi | `10q2` `kkDesteAltin/kkDesteLapis` | tek kaynak |
| Deste yüzeyi | `10q2` `kkDeckHTML/Bind/Len` | **yalnız Geçiş masası (10A)** tüketir |
| Kutup malzemesi | `10f` `yolGoldPole` + **yeni** `yolLapisPole` | fallback zinciri tek yerde |
| Kart yüzü | `12c ikvCardFace` · kutupta `10A gkPoleFace` | `13B karYuz` ikisini sarar |
| Hero yığını | `10f _yiginHTML` → `window.karYuz` | yüz üretimi 13B'den gelir |

**Ad göçü (§4.3):** `kkRenderBugun` → `yolRenderHero` (15 çağrı + 3 test).
Bugün'ün kişi yüzeyi artık hero'nun yığını ve onu 10f çizer. `kkDesteKaydir`
ve köprü fonksiyonları söküldü; `kkDeckHTML` ailesi YAŞIYOR çünkü masa onu
tüketir — sökülen yalnız Bugün'e ait olan kısımdı.

## Pahalıya öğrenilenler

1. **İki eksende snap İKİ AYRI kap ister.** Dış kap `x mandatory` +
   `touch-action:pan-x`, iç kaplar `y mandatory` + `pan-y`. Eksen ayrılmazsa
   parmak birini kaydırırken ötekini sürükler. `overscroll-behavior:contain`
   her ikisinde de şart.
2. **`karKapat` portalın VARLIĞINA bağlanamaz.** İlk hâli `if (!el) return`
   ile erken dönüyordu; portal başka bir yolla DOM'dan koparsa keydown
   dinleyicisi document'te kalıyor ve ok tuşları görünmeyen bir odayı
   sürüklüyordu. Önce sök, sonra düğüme bak.
3. **`karAc` açık odada YENİDEN kurulmaz**, yalnız sayfa değiştirir — yeniden
   kurmak ikinci bir dinleyici asar ve kullanıcının bulunduğu katı siler.
   Deste değişirse oda yerinde tazelenmez; **kapanışta** `yolRenderHero`
   çağrılır (zemin güncellenir, kullanıcının katı korunur).
4. **Kart ölçüsü YÜKSEKLİKTEN türetilir.** `width` + `max-height` birlikte
   verilince 5:7 oranı ezilir ve kart yamulur:
   `width: min(90vw, calc(min(70dvh,560px) * 5/7))`. Ölçülen: 375×812'de
   338×473 — ekranın %58'i (ilk deneme %49'du).
5. **Yığın karartmayla değil ÖLÇÜYLE derinleşir.** İlk deneme 4px kayma +
   `brightness .68` idi ve yığın görünmüyordu: kart zemini (#18120B) zaten
   koyu, karartma onu zeminle kaynaştırıyor. Kayma iki katına çıktı (8px),
   karartma yarıya indi.
6. **Yığın hero'nun `overflow:hidden`ında kırpılır.** d=2'de ~16px dışa taşar.
   Yön TERS ÇEVRİLMEZ (Kişilerim'in yelpaze kararı) — çözüm kaptır:
   `.yol-row { padding-inline: 12px }`.
7. **Flip TEK 3B kabında olmalı.** 12c kartını ikinci bir `preserve-3d` kabına
   sarmak `ikvHoloAttach`in `.ikv-holo` sarmalayıcısıyla çakışır: çevirme
   KABIN, eğilme KARTIN işi.
8. **10q'nun blok başlıkları glyph'i metnin İÇİNDE taşır** (`'◉ GERÇEK
   HAYATTA'`) ve kart arkasında `◉ DÜŞÜNCELER` ile çakışır. Sözlük
   ikizlenmedi; baştaki işaret `_glyphsiz()` ile söküldü, ayrım renk ve
   ölçüyle kuruldu.
9. **Köprü ışığı sökülünce masaya açılan kapı kapanacaktı.** Kapı geçiş
   kutbunun ARKA YÜZÜNE taşındı (`.kar-masa` → `gkOpenDetail`); oda önce
   kapanır, iki tam ekran üst üste durmaz.
10. **Harness'ta dil AÇIKÇA kurulur** (`S._currentLang='tr'`), yoksa sözlük
    EN'e düşer ve görsel yargı yanlış zeminde verilir. Ayrıca `window.*`
    mock'u 10f'nin modül-içi `_goldPole`'ünü EZMEZ — harness gerçek kaynağı
    (S._portre / oikGetCard) kurmalı, yoksa hero ile oda iki ayrı kart
    gösterir (harness'ın uydurduğu bir tutarsızlık).

## 2026-08-23 — İki ana kart çevrilmez, kendi penceresini açar

Emre: *"Ana kartlardan Olunan Kişi ve Olmak İstenilen Kişi'ye tıklanınca
eskiden onlara tıklandığında açılan detay pencereleri açılsın, o kişileri
oluşturan alttaki kartlarda şu anki arka tarafları açılsın. Üstelik
aralarında bir buton olsun ve Geçiş Kartım'ın eski tasarımıyla o buton
açsın."*

**Kök teşhis: üç kapı da yaşıyordu, tüketicisi yoktu.** Portre (02c) ve
OİK (10D) ekranlarına giden tek yol `10f:_acOda`'nın fallback'iydi ve o
yalnız oda AÇILAMAZSA çalışıyor (`karAc(...) === true` değilse) — yani oda
açıldığı andan itibaren o kapılar kullanıcıya kapanmıştı. Masa
(`gkOpenDetail`) ise yalnız geçiş kutbunun ARKA YÜZÜNDEN açılabiliyordu:
önce orta sayfaya git, sonra kartı çevir, sonra "BU YOLU AÇ".

| Girdi türü | Dokunuşun anlamı |
|---|---|
| **sentez** (iki ana kart) | `switchView('portre' \| 'oik')` — `13B:_detayAc`; flip kabı HİÇ KURULMAZ |
| **kutup** (geçiş kartı) | çevrilir; arka yüzünde `.kar-masa` durmaya devam eder |
| **katalog** (oluşturanlar) | çevrilir (değişmedi) |

Sentezin altında `.kar-yol` butonu (`_yolButonHTML`) masayı doğrudan açar;
palet sayfanın kutbudur (altın sayfada `gold`, lapis sayfada `lapis`).
Kanıt kapısı: yürünen geçiş yoksa buton ÇİZİLMEZ. Sıra anlamlıdır:
kart → yol (yatay eksen) → davet (dikey eksen).

**Kap gizlenmez, KURULMAZ.** Flip kabını kurup CSS'le saklamak iki davranış
bırakırdı: klavye yine çevirir, `aria-pressed` yalan söyler. `karArkaHTML`in
sentez dalı silinmedi — kutup ve katalog için çalışıyor ve dış sözleşme
(`window.karArkaHTML` + testler); değişen yalnız odanın onu sentez için
çağırmaması. Aria da değişti: "Kartı çevir" artık yalan olurdu, yerine
"Olduğun Kişi — ayrıntıları aç".

**`oik` kanonik, `arketip` alias.** Yeni kod `oik`e gider (§4.3 tek ad);
`arketip` alias'ı sökülmedi çünkü `10f:397` fallback'i hâlâ onu çağırıyor.

**Her iki kapıda da oda ÖNCE kapanır** — `switchView` bir ekranı
değiştirirken oda üstte asılı kalırsa iki tam ekran yüzey üst üste durur.

Mühür: `tests/13B-karsilasma.test.js` +9 test (flip yok/detay var, portre,
oik, buton kanıt kapısı, iki palet, geçiş kutbu hâlâ çevrilir).

## Doğrulama

Harness: `.claude/harness/karsilasma.html` — `?hero=1` Bugün kesiti (yığın +
DÇ penceresi, hero→oda dikişi) · `?bos=1` sisli/yeni kullanıcı · `?tek=1`
davetsiz hâl · `?gecissiz=1` iki sayfa · `?odaksiz=1` DÇ daveti.
`.claude/harness/bugun-kopru.html` SİLİNDİ (köprü söküldü).

İlgili: [[kisilerim-kart-motoru]] · [[tek-deste-iki-kutup]] ·
[[gecis-ekrani-masa-destesi]] · [[uc-muhur-yol-tasarimi]] ·
[[derin-calisma-tezgahi]] · [[kart-gorsel-dili]] · [[holo-kart-motoru]] ·
[[ad-senkronu-kurali]] · [[gerceklik-mimarisi]] · [[preview-harness-anon-oturum]]
