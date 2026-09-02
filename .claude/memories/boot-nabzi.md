---
name: boot-nabzi
description: Boot'un darboğazı bundle boyutu değil SIRALI AĞ TURLARIDIR; 00h Boot Nabzı bunu ölçülebilir kılar (bnMark/bnSar), 03-auth-shell'in paralellik sözleşmesi kapıyla korunur
type: gotcha
---

# Boot Nabzı — darboğaz bundle değil, sıralı ağ turları

> **Bu dosya hakkında.** `PROTOKOL-FABLE.md` ve `js/`/`tests/` altındaki
> yorumlar bu ada `[[boot-nabzi]]` diye bağ veriyordu; hedef dosya
> `.claude/memories/` altında YOKTU (kapı: `tests/referans-butunlugu.test.js`
> TABAN'ı). Aynı isimli özgün dosya yalnız Emre'nin lokal diskinde kaldı ve
> repoya hiç girmedi — `git log --all -- .claude/memories/` onu hiç
> döndürmüyor ([[claude-altyapisi-commit-disi]]). **Bu dosya o özgün metnin
> kurtarılmış hâli DEĞİLDİR ve öyle sunulmaz.** İçeriği bugünkü repodan
> yeniden keşifle yazıldı (§3.1): motorun kendisi (`js/parts/00h-boot-nabzi.js`),
> onu çağıran zincir (`js/parts/03-auth-shell.js`) ve sözleşmesini mühürleyen
> test (`tests/boot-nabzi.test.js`) repoda duruyor, yani buradaki her cümlenin
> bir `dosya:satır` karşılığı var. Emsal: `olu-kod-temizlikleri` — kayıp
> tarihsel içerik uydurulmaz, yerine bugünkü koddan doğrulanabilir olan yazılır
> ve kaybın kendisi beyan edilir (§6.10).
>
> **Kayıp olan:** ölçümün ham oturumu — hangi cihaz, hangi ağ, kaç tur. Elde
> `1331→905 ms` yalnız iki kod yorumunda kayıtlıdır
> (`js/parts/03-auth-shell.js:1014` ve `:1409`). Sayı bu yüzden bir **kayıt**
> olarak aktarılır, yeniden üretilmiş bir ölçüm olarak değil.

**Why:** Boot yavaşlığı bu projede yıllarca **tahminle** konuşuldu — "boot
yavaş" dendi, sayı üretilmedi; bir kez üretildi ve tek turluk olduğu için
yanılttı. Bu, §6.10'un (gerçeklik kuralı) boot'a düşen payıdır: kanıtı olmayan
değer yoktur, *"yavaş"* da bir değerdir. `00h-boot-nabzi.js` ölçümü kalıcı
kılar (modülün kendi banner'ı bu gerekçeyi yazar).

Ölçüm bir kez yapılınca teşhis değişti ve **sezginin tersi** çıktı:

- Darboğaz **bundle boyutu değil, SIRALI AĞ TURLARIYDI** — kayıtlı zincir
  `1331→905 ms` (`03-auth-shell.js:1014`).
- Bu repo `iife` + `inlineDynamicImports` ile derleniyor
  (`vite.config.js:33-36`), yani **dinamik import de tek bundle'a gömülür**.
  Bir modülü `import()` ile geciktirmek BYTE kazandırmaz — kazanç, o modülün
  atacağı **ağ turudur**. Emsal: 13C Postane statik yazılsa da dinamik yazılsa
  da aynı dosyanın içindedir; `pstInit`'in attığı `bulten_ozet()` RPC'si ise
  admin olmayan her kullanıcıda boşa giderdi, kapı `S.isAdmin`'dir
  (`03-auth-shell.js:1403-1412`).
- Doğru hamle sırayı değiştirmek değil, **yalnız bekleme noktasını**
  eklemektir: `profilSoz` ve `storageSoz` art arda TANIMLANIR (ikisi birlikte
  koşar), `await` yalnız gereken yere konur (`03-auth-shell.js:1017-1021`).

**How to apply:**

## 1 · Zincire dokunuyorsan çentiği koru

`initApp` zincirinin eklemleri çentiklidir ve **çentiksiz kalmaları kapıyı
kırar** (`tests/boot-nabzi.test.js:160`, "zincirin eklemleri çentiksiz
kalmaz"). Bugünkü çentikler:

| Çentik | Yer |
|---|---|
| `exec-bas` | `00h-boot-nabzi.js` modül gövdesi — bundle exec'inin gerçek başı |
| `exec-son` | `js/main.js:726` — 120 modülün IIFE maliyeti bu aralıktır |
| `perde-in` / `perde-ac` | `03-auth-shell.js:974`, `:1078`, `:1084` |
| `profil-sorgu` · `storage` | `:1018`, `:1021` — paralel çift |
| `auth-cozuldu` | `:1038` |
| `ayarlar-bilgi` · `paralel-8` · `sohbet-gecmisi` | `:1178`, `:1222`, `:1223` |
| `serpme-bas` / `serpme-son` | `:1251`, `:1396` |
| `zincir-kk/hz/im/om/eh/yp/ap` | `:1321`–`:1346` — sıralı ağır motor zinciri |
| `hazir` (`bnHazir`) | `:1356` — zincirin ucu, `.catch` SONRASINDA |

Süre isteyen adım `bnSar(ad, fn)` ile sarmalanır (senkron da promise de aynı
kapıdan geçer, hata yolunda bile bitiş çentiği atılır); noktasal an
`bnMark(ad)` ile çentiklenir.

## 2 · Motorun üç sözleşmesi — bozma

1. **SAF YAPRAK.** `00h` hiçbir şey import etmez (`S`/`00a` dahil).
   Gerekçe modülün banner'ında: `main.js`'in ilk satırından çağrılabilsin
   diye — 00a'ya bağlanmak dairesel import riskidir.
2. **İDEMPOTENT DEĞİL.** Aynı ad iki kez düşerse defterde iki satır belirir;
   bu kasıtlıdır — çifte init'i **gizlemek değil GÖSTERMEK** istiyoruz
   (`tests/boot-nabzi.test.js:18`).
3. **ASLA BLOKLAMA.** `performance.mark` yoksa her çağrı sessizce düşer ve
   `fn` yine çalışır (§5.2). Ölçüm yüzünden boot'un kırılması, ölçümün
   kendisinden pahalıdır.

## 3 · Ölçmek istersen

Üretimde `bnRapor()` çağıran YOKTUR ve olmamalıdır — `console.table` ölçtüğü
şeyi bozar. Rapor `window.bn*` üzerinden **konsoldan** çağrılır; makine-okunur
hâli `bnDefter()`'dir (`{ satirlar, hazir, perdeIn, perdeAc }`). Kadranın var
oluş sebebi tek bir hükümdür: *perde inerken zincir bitmiş mi?* — bitmemişse
kullanıcı yarı kurulmuş bir ekrana çıkar.

## 4 · Yeni bir "hızlandırma" önerirken

Önce sor: **bu bir byte sorunu mu, bir tur sorunu mu?** Bu bundle'da (iife +
inlineDynamicImports) byte'ı dinamik import çözmez. Kazanç ya bir ağ turunu
kaldırmaktan, ya sıralı iki turu paralelleştirmekten gelir. Paralelleştirme
yaparken sırayı değil **bekleme noktasını** taşı — ve `tests/boot-nabzi.test.js`
içindeki "paralellik sözleşmesi" bloğu (`:117`) bunu kilitler: profil sorgusu
storage ile paralel başlar, sohbet geçmişi paralel bloğun İÇİNDEdir, zincirin
ucu `bnHazir()` ile mühürlenir.

İlgili: [[safestorage-kuyruk-flush-kilidi]] (aynı `initApp` turunda, tanışma
kapısı yarıda kesilirse ikinci `storageInit`'in yarıştığı yer) ·
[[claude-altyapisi-commit-disi]] (bu dosyanın neden eksik olduğu) ·
[[olu-kod-temizlikleri]] (kayıp içerikle başa çıkmanın emsali)
