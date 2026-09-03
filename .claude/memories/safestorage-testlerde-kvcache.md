---
name: safestorage-testlerde-kvcache
description: SafeStorage senkron okuma/yazma için bellek-içi _kvCache (Map) tutar; localStorage.clear() bu Map'e dokunmaz — aynı test dosyası içindeki it()'ler arasında sızan state'in kaynağı budur
type: gotcha
---

# SafeStorage testlerde — `_kvCache` bellek-içi, `localStorage.clear()` onu görmez

> **Bu dosya hakkında.** `tests/06-summary-chat.test.js`, `tests/13D-duygu-iklimi.test.js`
> ve `tests/13A-bugun-penceresi.test.js` bu ada `[[safestorage-testlerde-kvcache]]`
> diye bağ veriyordu; hedef dosya `.claude/memories/` altında YOKTU (kapı:
> `tests/referans-butunlugu.test.js` TABAN'ı, `hafiza:safestorage-testlerde-kvcache`).
> Aynı isimli özgün dosya yalnız Emre'nin lokal diskinde kaldı ve repoya hiç
> girmedi — `git log --all -- .claude/memories/safestorage-testlerde-kvcache.md`
> boş döner ([[claude-altyapisi-commit-disi]]). **Bu dosya o özgün metnin
> kurtarılmış hâli DEĞİLDİR ve öyle sunulmaz.** İçeriği bugünkü repodan yeniden
> keşifle yazıldı (§3.1): mekanizmanın kendisi (`js/parts/00a-infrastructure.js`)
> ve onu doğrulayan üç test dosyası repoda duruyor, yani buradaki her cümlenin
> bir `dosya:satır` karşılığı var. Emsal: `boot-nabzi`, `olu-kod-temizlikleri`
> — kayıp içerik uydurulmaz, yerine bugünkü koddan doğrulanabilir olan yazılır.
>
> **Kayıp olan:** bu tuzağın İLK bulunduğu oturum — hangi testin, hangi sırada
> koşulduğunda kırıldığı, teşhis için harcanan süre. Elde yalnız bugünkü üç
> test dosyasının **sonucu** (temizleme çağrıları + kısa gerekçe yorumları)
> var; olayın kendisi kayıp.

**Why:** `SafeStorage` Supabase-backed bir key-value mağaza gibi görünür ama
senkron `get`/`set`/`remove` hiçbir zaman ağa dokunmaz — hepsi doğrudan
modül-seviyesi bir `Map` üzerinde çalışır: `const _kvCache = new Map();`
(`js/parts/00a-infrastructure.js:46`). `get` bu Map'ten okur (`:257-263`),
`set`/`setRaw` bu Map'e yazar VE ayrıca `_persistToSupabase` ile async
kuyruğa ekler (`:264-271`, `:276-282`), `remove` yalnız bu Map'ten siler
(`:283-286`). Gerçek ağ isteği yalnız arka planda, gecikmeli olarak gider —
testler onu hiç beklemez.

`localStorage.clear()` (birçok testin `beforeEach`'inde standart temizlik
adımı) bu Map'e **dokunmaz** — ayrı bir depodur. Bir `it()` içinde
`SafeStorage.set('etw_dg_iklim_v1_anon', ...)` yazılırsa, o anahtar
`_kvCache`'te durmaya devam eder; sonraki `it()` `localStorage.clear()`
çağırsa bile `SafeStorage.get(aynıAnahtar)` hâlâ eski değeri döndürür.

**Sınırı — sızıntı DOSYA İÇİNDEDİR, dosyalar ARASI DEĞİL.** `vite.config.js:66-83`
`pool: 'threads'` + `isolate: true` (varsayılan) kullanır ve bu BİLİNÇLİ
korunuyor: aynı dosyada `isolate:false` denenip REDDEDİLMİŞ, çünkü modül
state'inin dosyalar arası paylaşılması "10q2'nin boş deste testi önceki
dosyadan sızan kartı görüp kırıldı" sonucunu vermiş (`vite.config.js:77-80`).
Yani her test DOSYASI kendi taze `00a-infrastructure.js` modülünü (dolayısıyla
taze bir `_kvCache`'i) alır — sızıntı yalnız AYNI dosyanın `it()`/`describe`
blokları arasında olur.

Üç test dosyası aynı deseni bağımsız olarak keşfedip aynı çareyi yazmış:
- `tests/06-summary-chat.test.js:438` — `afterEach`'te
  `SafeStorage.remove('etw_dg_iklim_v1_anon')`, yorum: "_kvCache bellek-içi,
  temizlenmezse sonraki testte/dosyada sızar."
- `tests/13D-duygu-iklimi.test.js:24-30` — ayrı bir `_temizle()` fonksiyonu,
  `TEST_UIDS` için elle `SafeStorage.remove` çağırır; yorum:
  "`localStorage.clear()` izolasyon SAĞLAMAZ."
- `tests/13A-bugun-penceresi.test.js:21-23` — `beforeEach`'te iki anahtarı
  elle `SafeStorage.remove` ile siler.

**How to apply:**

1. Yeni bir testte `SafeStorage.set`/`setRaw` çağıran bir kod yolu
   sınıyorsan, kullandığın anahtarı `afterEach` (ya da bir sonraki
   `beforeEach`) içinde `SafeStorage.remove(key)` ile elle temizle —
   `localStorage.clear()` bunun YERİNE GEÇMEZ.
2. Alternatif çare `vi.resetModules()`dür (`tests/13m-kota.test.js` kalıbı,
   farklı bir modül için) — modülü yeniden import ettirir, taze bir
   `_kvCache` doğurur; ama her testte modül grafiğini yeniden kurduğu için
   maliyetlidir ve modülü testin İÇİNDE dinamik `await import()` ile
   yeniden almayı gerektirir.
3. Aynı anahtarı FARKLI test dosyalarında kullanmak GÜVENLİDİR —
   `isolate: true` dosyalar arası paylaşımı zaten engelliyor
   (`vite.config.js:81-82`).
4. Belirti tanısı: bir test **yalnız süitin tamamı koşunca** kırılıp **tek
   başına koşunca geçiyorsa**, bu sınıfın klasik izidir — aynı dosyadaki
   önceki bir `it()`nin `_kvCache`'e bıraktığı bir anahtar okunuyordur.

İlgili: [[boot-nabzi]] (aynı `00a-infrastructure.js` dosyası, farklı
sözleşme — SAF YAPRAK kuralı) · [[claude-altyapisi-commit-disi]] (kayıp
beyanının kök sebebi) · [[olu-kod-temizlikleri]] (kayıp içerikle başa
çıkmanın emsali)
