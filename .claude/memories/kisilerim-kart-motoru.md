---
name: kisilerim-kart-motoru
description: "Kişilerim" (10q) destesinin veri kaynağı 12b-kart-destesi.js pek çok modülde STATİK import edilir, ama modül-10 ailesinin erken yüklenen iki üyesi (10-features-w2, 10D-olmak-istedigin) ona bilerek DİNAMİK import'la bağlanır — statik bir kenar eklemenin rollup çıktı sırasını kaydırıp TDZ açabileceği gerekçesiyle
type: gotcha
---

# Kişilerim kart motoru — 12b'ye modül-10'dan DİNAMİK bağlanma kalıbı

> **Bu dosya hakkında.** `js/parts/10D-olmak-istedigin.js:548`'deki yorum bu
> ada `[[kisilerim-kart-motoru]]` diye bağ veriyordu; hedef
> `.claude/memories/` altında YOKTU (kapı: `tests/referans-butunlugu.test.js`
> TABAN'ı). Aynı isimli bir özgün dosya repoya hiç girmedi —
> `git log --all -- .claude/memories/` bu adı hiç döndürmüyor
> ([[claude-altyapisi-commit-disi]]). **Bu dosya o özgün metnin kurtarılmış
> hâli DEĞİLDİR.** İçeriği bugünkü repodan (10D, 10-features-w2, main.js
> import sırası, vite.config.js build modu) yeniden keşifle yazıldı; her
> cümlenin bir `dosya:satır` karşılığı var. Emsal: `[[olu-kod-temizlikleri]]`.
>
> **Kayıp olan:** TDZ hatasının GERÇEKTEN yaşandığı ilk oturumun ayrıntısı —
> hangi build, hangi hata mesajı, hangi commit'te geri alındı. Elde yalnız
> iki kod yorumunun bıraktığı "bunu böyle yapma" talimatı var, olayın
> kendisi (ne zaman, nasıl fark edildi) yeniden üretilemez.

**Why:** `12b-kart-destesi.js` — "Kart Destesi (Kişilerim koleksiyonunun veri
kaynağı)" (dosyanın kendi başlığı) — 12 modül tarafından STATİK import
edilir: `02c-portre`, `02d-esik-ekrani`, `09a-personalization-engine`,
`09i-secici`, `10f-w2-yol`, `10q-w2-kisi-karti`, `10q2-kisilerim-bugun`,
`10q3-benlik-yapisi`, `10q4-olus-muhru`, `12f-hazine-paketleri`,
`13l-kimlik-motoru`, `13x-mesafe-motoru`. Buna rağmen `10-features-w2.js`
(main.js:74) ve `10D-olmak-istedigin.js` (main.js:78) — main.js'te
`13l-kimlik-motoru.js`'den (main.js:69, 12b'yi zaten statik çeken bir dosya)
SONRA gelen iki dosya — 12b'ye YALNIZ dinamik `import()` ile bağlanır.
Gerekçe iki ayrı yorumda YAZILIDIR:

```
// Ağır modüller (10q/12b/12c/10g) dinamik import — modül-10 erken
// yüklenir, TDZ/döngü riskine girmeyiz.
```
(`10-features-w2.js:261`)
```
/** Kart mühürlenince bekleyen hedefleri işle. Deste 12b'den DİNAMİK
 *  import'la çözülür — statik kenar rollup sırasını kaydırıp TDZ açabilir
 *  ([[kisilerim-kart-motoru]] tuzağı), wsSyncStudio ile aynı kalıp. */
```
(`10D-olmak-istedigin.js:546-548`)

**How to apply:**

## 1 · Kalıbın kendisi — `import(...).then(...).catch(...)`

```js
return import('./12b-kart-destesi.js').then(async m => {
  const ready = await m.deckReady?.();
  ...
}).catch(e => { console.warn('oikDrainAbsorbQueue:', e?.message); return 0; });
```
(`10D-olmak-istedigin.js:554-565`, fonksiyon `oikDrainAbsorbQueue`) — aynı
kalıp `10-features-w2.js`'nin `wsSyncStudio()` fonksiyonunda tekrarlanır
(`:253` çağıran, `:262` tanım, `:264-` gövde), orada 12b'nin yanında
`10p-w2-meclis.js` (`getSuretler`) ve `10g-w2-wanderer-game.js` da aynı
dinamik-import kalıbıyla çekilir. İkisi de `.catch()` ile SESSİZCE düşer
(§5.2 "asla bloklama") — bir ağ/parse hatası ekranı kilitlemez, yalnız o
turun senkronunu atlar.

## 2 · Nüans — statik kenar zaten var, tuzak YİNE DE geçerli

Bugünkü grafik gösteriyor ki main.js import sırasında `13l-kimlik-motoru.js`
(satır 69) 12b'yi 10-features-w2/10D'den (satır 74/78) ÖNCE zaten statik
çekiyor — yani 10D'nin 12b'ye YENİ bir statik kenar eklemesi kâğıt üzerinde
bir DÖNGÜ doğurmaz (12b zaten yüklenmiş olur). Yorumun iddiası daha ince bir
risktir: bu repo `iife` + `inlineDynamicImports` ile derleniyor
(`vite.config.js:34-35`, [[boot-nabzi]]) — Rollup tüm modülleri TEK dosyada
topolojik sıraya dizer ve 10D/10-features-w2 gibi büyük, çapraz-bağımlı
dosyalarda YENİ bir statik `import` eklemek bu sıralamayı kaydırabilir; bir
modülün üst-seviye kodu, henüz initialize olmamış bir `export`a erişirse
TDZ (`ReferenceError`) doğar. Bu iddia kod yorumunda YAZILI bir tasarım
gerekçesidir — Rollup'ın gerçek topolojik çıktısı bu dosyada YENİDEN
ÜRETİLMEDİ, doğrulaması ancak `./build.sh` + `node scripts/dogrula.mjs` ile
yapılır (K1 sınırı: yorumda kayıtlı bir gerekçe, bu dosyada aktarılır ama
bağımsız olarak kanıtlanmaz).

## 3 · Dokunmadan önce

Bu iki dosyada (`10D-olmak-istedigin.js`, `10-features-w2.js`) 12b'den yeni
bir export'a ihtiyaç duyulursa, dinamik `import()`'u statik `import`'a
çevirmeden önce `./build.sh` + `node scripts/dogrula.mjs` ile TDZ regresyonu
sınanır — "sadece bir import satırı" gibi görünen bir değişiklik bu
dosyalarda geçmişte tam bu yüzden dinamiğe çevrilmiştir (yorumun kendisi
bunu "tuzak" diye adlandırır). Kalıbı bozmadan yeni bir tüketici eklemek
istiyorsan aynı `import(...).then().catch()` şablonunu izle, `wsSyncStudio`
ikizini kopyala.

İlgili: [[boot-nabzi]] (aynı derleme modu — `iife` + `inlineDynamicImports`,
aynı "byte değil ağ turu" ölçütü farklı bir bağlamda) ·
[[claude-altyapisi-commit-disi]] (bu dosyanın neden eksik olduğu) ·
[[olu-kod-temizlikleri]] (kayıp içerikle başa çıkmanın emsali)
