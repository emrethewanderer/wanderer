---
name: olunan-ve-niyet-alinan-karari
description: Bir kart ya OLUNANdır (kazanılmış → altın → Portre 2.0) ya NİYET ALINANdır (hedef mührü → lapis → OİK); geçiş tek yönlüdür ve SIRASI kritiktir — porAbsorbCard, hedeflerden silmeden ÖNCE koşar
type: karar
---

# Olunan ve niyet alınan — iki kutup, tek yönlü geçiş, kritik sıra

> **Bu dosya hakkında.** `js/parts/10q-w2-kisi-karti.js:898` bu ada
> `[[olunan-ve-niyet-alinan-karari]] dersi` diye bağ veriyordu; hedef dosya
> `.claude/memories/` altında yoktu. Özgün dosya repoya hiç girmedi
> ([[claude-altyapisi-commit-disi]]); **bu metin kurtarma değildir**, bugünkü
> koddan yeniden keşifle yazıldı.
>
> **Adın okunuşu.** "Olunan" ve "niyet alınan", repoda iki adlandırılmış
> kutba birebir oturuyor: `por.card_name` = *"Olunan {name}"*
> (`15b-i18n-dict-core.js:1271`, Portre 2.0) ve hedef mührü —
> *"Böyle bir kişi olmak istiyorum"* (`10q-w2-kisi-karti.js:3077`), Mesafe
> Motoru'nun **niyet** ağırlığını besleyen taraf (`13x-mesafe-motoru.js`).
> Bağın düştüğü satır tam da bir kartın ikinciden birinciye geçtiği yerdir.
> Bu okuma koda dayanıyor; **özgün dosyanın adı bununla mı kastediyordu,
> kanıtlanamaz.**
>
> **Kayıp olan:** kararın alındığı tur ve tartışma. Kodda sonucu ve bir
> hata dersi var, gerekçesinin tarihçesi yok.

**Why:** Wanderer'da bir Kişi Kartı iki hâlden birinde olabilir ve ikisi
§1'in anlam eksenine bağlıdır:

| Hâl | Kullanıcının hareketi | Kutup | Nereye işlenir | Yazan |
|---|---|---|---|---|
| **Olunan** | kartı mühürledi (kazanım) | **altın** — şu an olduğun | Portre 2.0, "Olunan [Ad]" (`02c-portre.js`) | `porAbsorbCard` (`02c:564`) |
| **Niyet alınan** | hedef mührü vurdu | **lapis** — hayal/hedef | OİK, "Olmak İstediğin Kişi" (`10D-olmak-istedigin.js`) | `oikAbsorbCard` (`10D:348`) |

`10q-w2-kisi-karti.js:3084` kararı tek cümlede toplar: *"Böylece kazanım
altın tarafı (`porAbsorbCard`), mühür lapis tarafı besler — iki kutup da
kullanıcının hareketinden doğar."* İkisinin de kaynağı kullanıcıdır; uygulama
kendi başına ne olunanı ne niyeti yazar (§6.10).

**Geçiş tek yönlüdür.** *"Mühür yalnız SAHİPSİZ kartta anlamlıdır: kart zaten
kazanılmışsa o kişi OLUNMUŞTUR, hedef değildir"* (`10q:3087`). Bu yüzden
`kkGetHedefler()` koleksiyondakileri filtreler (`10q:3091`) ve mühür
mezuniyette kendiliğinden düşer.

**Ve dersin kendisi SIRA hakkındadır.** `kkMuhurle` içinde
(`10q-w2-kisi-karti.js:894-902`) iki adım art arda koşar:

```js
// SIRA KRİTİK: mezuniyetten (hedefler'den silmeden) ÖNCE
try { const n = window.porAbsorbCard?.(card) || 0; … } catch (_) {}
if (kk.hedefler && kk.hedefler[cardId]) delete kk.hedefler[cardId];
```

Ters sırada `oikCardRefs()` **bir an boşalır** ve Benlik Yapısı açıksa kartı
kaybeder. Bu bir teori değil, ikinci kez yazılmış bir derstir: aynı uyarı
`js/parts/10A-gecis-karti.js:1470`'te bağsız olarak tekrarlanıyor.

Boşluğun neden görünür olduğu zincirle doğrulanabilir: `oikCardRefs()`
`10D:700`'de tanımlı, `10D:1748`'de window'a açılıyor ve **üç tüketicisi**
var — `10q3-benlik-yapisi.js:66` (lapis kolu), `13x-mesafe-motoru.js:81`
(erdem okuması), `10f-w2-yol.js:156`. Yani liste bir an boşaldığında ekranda
açık duran Benlik Yapısı o kartı çizmez.

**How to apply:**

## 1 · Kazanım/hedef akışına dokunuyorsan sırayı bozma

`kkMuhurle` içindeki iki satırın sırası bir stil tercihi değil, bir
sözleşmedir. Araya iş eklemen gerekiyorsa **porAbsorbCard'dan sonra,
`delete kk.hedefler`den önce** ekleme yapma — o pencere zaten kırığın
yaşadığı yer.

## 2 · Yeni bir "kim olduğun" okuyucusu yazarken

İki defter ayrıdır ve **ikisi de window köprüsünden okunur**:
`porCardRefs()` (altın, 02c) ve `oikCardRefs()` (lapis, 10D). Üçüncü bir
kopya tutma — `10q3-benlik-yapisi.js:17` bunu açıkça yazar: iki kol o iki
kaynak defterden türetilir. Okuma yoksa sessizce düş (§5.2).

## 3 · "Bu kart kullanıcının mı?" sorusunun tek cevabı

`kk.collection[cardId]` — hedefte olması sahiplik DEĞİLDİR. Bir yüzey
"sahipsiz kart" mantığı kuruyorsa (Kişiler ekranı, hedef mührü butonu)
ölçü budur, `kk.hedefler` değil.

İlgili: [[olus-muhru-2-muhru-sen-basarsin]] (bu sıranın hemen öncesindeki
tören — kartı kimin verdiği) · [[kisi-kartlari]] (koleksiyonun kalıcılık
ve sosyal yüzey tarafı)
