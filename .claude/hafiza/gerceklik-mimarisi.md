---
name: gerceklik-mimarisi
description: "KARAR 2026-08-01: Wanderer sahte veri üretmez — köken motoru (13y), kanıtsız değer null, sert denetçi kapısı"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3aa49183-74fd-408d-a9d9-eebca3f262fd
  modified: 2026-08-01T17:42:51.318Z
---

Wanderer'daki her veri parçası kökenini taşır: **beyan** (kullanıcının kendi
eliyle koyduğu) · **olcum** (davranıştan sayılan, `n` kanıtla anlamlı) ·
**yorum** (LLM'in ürettiği, kaynak metne bağlanamazsa atılır). Dördüncü hâl
köken değil kökensizliktir: **yok**. Bugün bu hâl `score: 50`, `guven: 0.6`
gibi masum sayılarla temsil ediliyordu.

Emre'nin üç kararı (2026-08-01):
1. **Kanıtsız değer gösterilmez** — sayı `null`'a düşer, yerini davet alır;
   LLM bağlamına da hiç girmez.
2. **Geçmiş kanıtsız kayıtlar tek seferlik temizlikle SİLİNİR** (arşiv yok;
   silmeden önce sayım raporlanır).
3. **Sert kapı** — `scripts/gerceklik-denetci.mjs` + vitest; ihlalde kırmızı.
   Muafiyet yalnız `/* KOKEN-MUAF: gerekçe */` ile, gerekçesiz muafiyet ihlal.

Kökeni icat etmedik: `13x-mesafe-motoru.js:163` zaten `hesap:{kaynak,n}`
yazıyordu ve `js/state/w2.js:57` bunu "sayının neyden doğduğu" diye
belgeliyordu. Eşik de icat değil — `09b-depth-foundations.js:513,534`'ün
uyguladığı `signals_count >= 3`.

Bulunan sızıntılar (tarama ile doğrulandı): `10-features-w2.js:489` kanıtsız
`?? 50` → ortalama → **1. mertebe bedava** (en ağırı) · `09e:218`
`Number(guven) || 0.6` uydurulmuş güven · `09e` kanıtsız madde kabul ederken
`09d` etmiyordu (iki motor iki sıkılıkta) · LLM'in `kanit` alanı hiçbir yerde
doğrulanmıyordu · `09g:189` + `09a:1281` damgayı üretimde basıyordu (hayalet
olay).

**Why:** "Mesele Sensin" tezi, uygulamanın kullanıcı hakkında söylediği her
şeyin kaynağının kullanıcı olmasını gerektirir. Uydurulmuş bir skor yalnız
yanlış veri değil, tezin ihlalidir — mesele artık kullanıcı değil,
algoritmanın varsayımıdır.

Dikiş turunda ölçülen (yanlış alarm, kayıt için): `10q-w2-kisi-karti.js:45`
`sc()` kanıtsız temeli 50 sayıyor ama bu SAHTE YAKINLIK ÜRETMİYOR — hiç
sinyali olmayan kullanıcıda 112 kartın hepsinde `hazirlik = 0` çıkıyor, çünkü
`kkMatchCard` üç kapının en zayıf halkasını alır. Aynı şüpheye bir daha
düşersen ölçümü tekrarlama, muafiyet yorumu satırın üstünde duruyor.

**How to apply:** Yeni bir sayı/yargı üreten HER özellikte önce sor: kanıtı
nedir, kaç tane, kullanıcı mı koydu? Kanıt yoksa değer yoktur — `null` döndür,
UI davet göstersin. LLM çıktısını kaydetmeden önce `kokenAlinti` ile kaynağa
bağla. Kotayı harcayan/"gösterildi" diyen damgayı üretici basmaz, teslim eden
basar. Plan: `.claude/plans/gerceklik-mimarisi.md`.
İlgili: [[mesafe-motoru]] · [[oruntu-motoru]] · [[taniyan-ayna-kisisellestirme-3]] ·
[[olus-muhru-karari]] · [[personalization-engine-layers]]
