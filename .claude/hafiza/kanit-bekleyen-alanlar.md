---
name: kanit-bekleyen-alanlar
description: "2026-08-19: açılışta 24 alan kanıtsız değerle doğuyordu (0 Elmas, 0 gün seri, 'İyi geceler.', 'Wanderer · Kişisel Dönüşüm'). LLM ana ekranındaki 'kişiselleşmemiş → kişiselleşmiş donuk sıçrama' AYNI kökün yüzüydü. 00i-kanit-bekleyen.js: data-kb + visibility; DOM METNİ değişmez (parseInt okuyucuları var); serbest bırakma İKİ yoldan (MutationObserver + bnHazir)."
metadata:
  type: project
---

**Kanıtı gelmemiş alan konuşmaz.** [[boot-nabzi]] boot'u ölçerken buldu:
`_src.html`'de 24 alan statik değerle doğuyordu — `gl-elmas-count = 0`,
`bugun-streak = 0`, `w2-profile-level = 1`, `bugun-salutation = "İyi geceler."`
(saat kaç olursa olsun!), `llm-greeting-sub = "Wanderer · Kişisel Dönüşüm"`,
`cl-model-name = "Öz"`, `ws-drawer-identity-name = "Gezgin"`. Yani 17 günlük
serisi olan birine, açılışın ilk saniyesinde, "serin yok" deniyordu. §6.10'un
tam olarak yasakladığı şey: kanıtsız değer, `0` gibi masum sayılara gizlenemez.

**Emre'nin "LLM ekranı önce kişiselleşmemiş gelip sonra donuk sıçruyor"
şikâyeti AYNI köktü — kanıtlandı.** `llmRenderHome()`
(`10y-w2-llm-shell.js:245`) selamı, alt satırı, composer placeholder'ını ve
başlatıcı çiplerini hep birlikte yazar ama ancak `fmInit` (10w) hidre olunca
çağrılır; o ana dek statik doğuş durur, sonra hepsi tek karede takas edilir.

**Çözüm: metin değil GÖRÜNÜRLÜK kanıta bağlanır.**
`js/parts/00i-kanit-bekleyen.js` (önek `kb`, saf yaprak). İşaretli alan
`data-kb="1"` taşır → CSS `visibility:hidden` (yer korunur, layout kaymaz) +
`aria-hidden` (görsel yalanı susturup sesli yalanı bırakmak yarım dürüstlük).
Kanıt gelince `.kb-belirdi` ile kısa fade — tempo `.casc` ailesinden
([[giris-kademelenmesi-casc]]), yeni görsel dil icat edilmedi.

**KRİTİK — DOM metnine ASLA dokunulmaz.** Sebep keşifte çıktı:
`10-features-w2.js:119` `topbar-streak-count`'un `textContent`'ini `parseInt`
ile **veri olarak okuyor** (aynı desen `02-features-onboarding.js:29,158` ve
`09a:804`'te `streak-val` için de var — ve `streak-val` `_src.html`'de HİÇ
doğmuyor, yani o üç okuyucu ölü DOM'a bakıyor). Metni `—` yapmak NaN üretirdi.

**Serbest bırakmanın İKİ yolu vardır, biri yetmez:**
① `MutationObserver` içerik değişimini yakalar (0 → 42) — alanların çoğu böyle
dolar. ② `kbSerbest()` zincirin ucunda ([[boot-nabzi]]'nin `bnHazir`'i)
kalanları bırakır — değeri GERÇEKTEN 0 olan yeni kullanıcıda mutation hiç
olmaz ve alan sonsuza dek gizli kalırdı. **Sessizlik ≠ kayboluş.**
GOTCHA: `kbKur()` element bazlı `WeakSet` ile iz tutar; tek seferlik bir
"kuruldu" bayrağı kullanılırsa sonradan DOM'a giren işaretli alanlar hiç
izlenmez (bu kusur testte yakalandı).

**Perdeye DOKUNULMADI.** Perde bir eşik törenidir, yükleme göstergesi değil;
`bnHazir`'e bağlamak onu spinner'a çevirir ve register'ı sekülerleştirirdi
([[acilis-perdesi]]). Emre bu ayrımı onayladı.

**Kapı:** `tests/kanit-bekleyen.test.js` — repo taraması. Statik sayıyla doğan
+ `getElementById` ile yazılan + işaretsiz bir alan kalırsa kırmızı yanar.
Muafiyet gerekçesiyle yazılır (`session-ring-count`: yeni oturumda 0 doğru
başlangıç; `kapi-aralik-days`: sabit 30 günlük pencere).

**Why:** Uygulama kullanıcı hakkında bir şey söylüyorsa kaynağı kullanıcı
olmak zorundadır — "Mesele Sensin"in boot'a düşen payı. Sıçrama bir animasyon
kusuru değil, kanıtsız konuşmanın görünen yüzüydü; süsleyerek değil susarak
çözülür.
**How to apply:** `_src.html`'e sayı/kimlik gösteren yeni bir alan eklerken
statik değerle doğuruyorsan `data-kb="1"` koy — ya da kapıya gerekçeli
muafiyet yaz. Hidrasyon yazıcısına dokunmana gerek yok, gözcü yakalar.
Plan: `.claude/plans/kanit-bekleyen-alanlar.md`
Bağlar: [[gerceklik-mimarisi]] · [[boot-nabzi]] · [[dil-modeli-kabugu]] ·
[[emek-sayar-bakis-saymaz]] · [[kisisel-baslaticilar-gunun-alintisi]]
