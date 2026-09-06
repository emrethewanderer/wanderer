---
name: esik-ekrani
description: 02d Eşik Ekranı — 2026-08-27'de Studio'dan alınıp UYGULAMAYA GİRİŞE döndü (esikShowOnce); kapı gün değil GİRİŞ; görsel kabuk Fable 5'in ilk hâline döndürüldü
metadata:
  node_type: memory
  type: project
  originSessionId: 231bd89d-3c5f-4c95-974b-20369674008d
  modified: 2026-08-07T20:03:50.974Z
---

**KARAR 2026-07-26 ("Eşiği Kaydırmak" sprinti, plan: `.claude/plans/federated-hatching-graham.md`):** Eşik Ekranı artık boot'ta/splash'te AÇILMIYOR — Wanderer LLM ön yüzü bir dil modeli, tören ona ait değil; kart karşılaması Studio'nun ("hayatını oluşturduğun alan") kendi eşiğine taşındı. Eski davranış (splash inerken boot'ta bir kez, geri dönen kullanıcıda) YANLIŞLANDI.

**Yeni tetik:** `js/parts/10y-w2-llm-shell.js` — flip motorunun `_flip(v)` fonksiyonu ön yüzden arka yüze geçerken (`toBack===true`) modül-seviye `_crossedToBack=true` bayrağını set eder (reduced-motion dahil, animasyonsuz yolda da). `switchViewHooks.after` bayrağı **her turda, nereye varılırsa varılsın TÜKETİR**; `_maybeEsik()` yalnız `v==='bugun'` dalında çağrılır — 360ms gecikmeli dinamik `import('./02d-esik-ekrani.js')` (flip'in in-animasyonuyla örtüşsün diye).

**2026-07-31 DENETİM BULGUSU (düzeltildi):** tüketim ilk yazımda yalnız `bugun` dalının içindeydi. Ön yüzden Bugün DIŞINDA bir arka-yüz ekranına (Kütüphane) girildiğinde bayrak **asılı kalıyor**, sonraki Studio İÇİ gezinme (Kütüphane → `← Bugün`, flip yok) Eşik'i haksız yere açıyordu — yani aşağıdaki "kritik ayrım" pratikte delinmişti. Tüketim `after` hook'unun başına alındı (`const crossed = _crossedToBack; _crossedToBack = false;`), regresyon testi: `tests/10y-w2-llm-shell.test.js` "ön yüzden Kütüphane'ye flip → sonraki Studio içi Bugün gezinmesi Eşik'i AÇMAZ". **Bilinçli sınır:** Kütüphane'ye doğrudan girişte Eşik hiç açılmaz (02d Bugün töreni olarak yazılı); bunu genişletmek ayrı bir karar.

**Kritik ayrım — "Studio'ya giriş" ≠ "Studio içi gezinme":** Kütüphane→`← Bugün` gibi arka-yüz-içi geçişler `_flip()`'i hiç tetiklemez (before-hook'ta `_isFront(cur)===_isFront(v)` ise flip yok, direkt switchView) → `_crossedToBack` hiç set edilmez → Eşik açılmaz. Bu ayrım ekstra kod gerektirmedi, flip motorunun MEVCUT ön/arka sınır tanımını doğrudan kullanır.

**Sıklık kararı:** Eşik **her** Studio girişinde açılır — günde-bir kapısı YOK (eski davranış boot'ta zaten günde-bir'di ama artık "eşikten geçmek" her girişte tazedir, kullanıcı kararı).

**02d'nin bağlam-duyarlılığı:**
- `_goldData`/`_lapisData`/render mantığı DOKUNULMADI — hâlâ [[kart-adlari-yeniden-adlandirma]] altın=Portre/persona, lapis=en yakın sahipsiz kart.
- Perde beklemesi (`waitCurtain`, eski adı `waitSplash`) artık HEM `#wn-splash.show` HEM `#ws-flip-title.show` (flip başlığı, ~1.15s) bekler — Studio yolunda üstte flip başlığı var, boot yolunda (savunmacı, artık pratikte olmuyor) splash.
- Kapanış cascade'i bağlama göre dallanır: `#bugun-view.active` ise `window.wsCascadeBugun?.()` (Bugün'ü kademele), değilse `window.llmHomeCascade?.()` (savunmacı fallback). `wsCascadeBugun` main.js'e YENİ expose edildi (önceden export edilip hiç window'a bağlanmamıştı).

**Değişmeyen sözleşmeler:** `window.esikShow` imzası, `_esikOpen`/`#esik-onb` çift-overlay guard'ı, `.sc-onb` sınıfı → 10s/10t ritüelleri hâlâ bunu okuyup erteler, kapanışta `glRunDailyRitual`/`smRunDaily` yeniden tetiklenir (idempotent).

**2026-08-02 — iki değişiklik (Emre):**

1. **Zemin artık Yol'un göğü.** `.esik-onb`'nin kendi degradesi (saatsiz,
   yıldızsız bir ikiz) söküldü → `var(--sky-stars), var(--sky-scene)` + fixed
   gren. Ayrıntı ve gren-konumu tuzağı: [[sahne-gogu-tek-kaynak]].

2. **Köprü ("O KİŞİ İÇİN BUGÜN") üç değişken satırdan DÖRT SABİT BOYUTA döndü.**
   `_bridgeActions` (bugünün sözleri + en yakın kartın eksik adımları + ritüel
   doldurucuları, en çok 3) SİLİNDİ; yerine `_bridgeDims()` — kitabın dört
   boyutu: Düşünce · İnanç · Duygu · Davranış, altlarında "O kişi gibi düşün/
   inan/hisset/davran." Gerekçe: eşiğin sorusu her gün aynıdır; değişen liste
   değil, kullanıcının o boyutu ne kadar doldurduğudur.
   - Ad + mühür işareti **10D'den içilir** (`CAT_KEYS` + YENİ `CAT_SIGILS` —
     02c'nin onboarding sigilleriyle aynı dört işaret ☉ ✷ ❍ ✺); 02d artık
     10D'den statik import eder (döngü yok, bundle IIFE olduğu için maliyetsiz).
   - Her satır bir `<button data-dim>` — tıklayınca eşik kapanır, 300ms sonra
     `window.oikOpenDim(cat)` OİK'te o boyutun **penceresini** açar
     (bkz [[olmak-istedigin-kisi-2-pencere-tasarimi]]).
   - Ölen anahtarlar: `esik.act.*` (TR+EN) — tek çağıranı `_bridgeActions`'tı.
     Yeni: `esik.dim.<cat>.title/note`. `lapis.missing` payload'ı da tüketicisiz
     kaldığı için `_lapisData`'dan çıkarıldı.

**2026-08-07 — dikey sığma + alıntının gerçek kaynağı (Emre):**

1. **Kartların altındaki altyazılar SÖKÜLDÜ** ("Kendi kaleminle yazdığın kişi." /
   "Adın bu kartta da yazabilir."). `.esik-card-cap` ve `gold.caption` üretim
   zinciri gitti; ölen anahtarlar (TR+EN): `esik.gold.portre_cap`,
   `persona_cap`, `persona_cap_today`, `days_since`, `today`, `esik.lapis.cap`
   ve yetim `gold.from_portre`. `DAY_MS` de yetim kaldı, silindi.

2. **Dikey ölçü artık İKİ eksenli.** Eşiğin boyu eskiden yalnız genişliğe
   bakardı (kart 46%/200px, boşluklar sabit px) — dar telefonda kartlar
   küçüldüğü için sahne tesadüfen sığıyordu, ama geniş-ama-KISA pencerede
   (ölçüldü: 672×814) kartlar 200px'e büyüyüp sahne 844px'e çıkıyor ve
   "YOLA DEVAM ET" ekranın altından düşüyordu. Kart `max-width:min(200px,23vh)`,
   dikey ritim clamp'lerle vh'ye bağlandı (üst uçlar eski sabitler = uzun
   ekranda tasarım aynı).

3. **Dört kapının dizilimi ÖLÇÜMLE seçilir** (`_fitBridge`, media query DEĞİL —
   sahnenin boyu ekrandan değil İÇERİKTEN gelir). **Alt alta liste ASIL
   dizilimdir**; yalnız `overlay.scrollHeight > clientHeight+1` ise
   `.esik-bridge--kare` takılır (2 sütun, 252→~130px). Sınıf her ölçümde önce
   sökülür → pencere ferahlayınca listeye döner; `resize` dinleyicisi close()'ta
   kaldırılır. **Emre'nin kararı: kare bir tercih değil KURTARMA dizilimidir.**

4. **Kapılara iki kartlık istif** (`.esik-act-deste`, okun hemen solunda):
   ARKADA altın (sol, −14° çapraz, alttan yukarı), ÖNDE lapis (dik, üstünde iki
   ince satır). Eşiğin iki kutbunun minyatürü; hover/active/focus'ta deste açılır.

5. **"— kendi cümlen" bloğunun kaynağı DÜZELTİLDİ (kırıktı).** `oikGetDesired()`
   kart varken `description`a kartın BAŞLIĞINI koyar, üstelik 10D aynı başlığı
   `_personTransition.desired.description`'a da yazar — yani iki "kaynak" tek ve
   aynı addı, blok üstündeki lapis kartın adını tırnak içinde ikinci kez
   söylüyordu. Yeni asıl kaynak `_kartinTazeCumlesi(oik)`: OİK kartının dört
   boyutundaki maddeler (`{text, src, at}`), en TAZE olan konuşur. İmza kökene
   göre değişir — `src:'emre'` ise YENİ anahtar `esik.desired_src_emre`
   ("Emre'nin o boyuta yazdığı" / "what Emre wrote there"), değilse
   `esik.desired_src`. Kartın adını tekrar eden hiçbir metin alıntı sayılmaz
   (`_cumleMi` kapısı). Bkz. [[gerceklik-mimarisi]] §6.10 — imza kökeni
   yansıtmak zorundadır.

**AÇIK İŞ (Emre'nin vizyonu, 2026-08-07):** alıntı bloğu nihayetinde
"Emre kullanıcının **aha moment**'ını yakalasın ve orada yazsın" olacak —
sohbetten aydınlanma anını çıkarıp `kanit_ref` ile kullanıcının gerçek
cümlesine bağlamak. Bugünkü hâl o vizyonun ilk basamağı (Emre'nin karta yazdığı
madde artık görünüyor); tam hâli ayrı sprint. Bkz. [[kesin-alinti-mimarisi]].

**02c-portre.js** `showEntryCards`'ın geri-dönen-kullanıcı dalından `esikShow()` çağrısı SÖKÜLDÜ — artık yalnız ilk-giriş onboarding dalı kaldı.

İlgili: [[acilis-perdesi]] (aynı sprint, perde 3 kademeye çıktı), [[dil-modeli-kabugu]] (flip motoru, `_isFront`/`FRONT_VIEWS`), [[kart-adlari-yeniden-adlandirma]].

---

## 2026-08-27 — İKİ KARAR (Emre): tetik girişe döndü, görsel kabuk ilk hâline

### 1) Tetik: Studio flip'i → uygulamaya giriş

**Eşik artık girişin eşiğidir, Studio'nun değil.** 07-26'nın kararı
(yukarıdaki "Yeni tetik" bölümü) YANLIŞLANDI: `_maybeEsik`, `_crossedToBack`
ve bunları besleyen `_flip`/`after`-hook satırları `10y-w2-llm-shell.js`'ten
**tamamen söküldü** (yetim kalmadı, `grep` ile doğrulandı).

- **Yeni tetik:** `03-auth-shell.js` `initApp` kuyruğu — `switchView('chat')`
  ve composer odağından hemen sonra, dinamik `import('./02d-esik-ekrani.js')`
  → `esikShowOnce()`. Fire-and-forget: perdeyi ve hidrasyonu 02d kendi bekler.
- **Kapı GÜN değil GİRİŞ.** `esikShowOnce` modül-seviye `_bootAcildi`
  bayrağıyla sayfa ömrü boyunca TEK gösterim yapar. Uygulamayı kapatmadan
  Sohbet ↔ Studio arasında gezinen kullanıcı Eşik'i ikinci kez görmez;
  yeni gösterim yeni boot ister (reload / uygulamayı kapatıp açma).
  Günde-bir kapısı YOK — ölçü giriştir.
- **KRİTİK YARIŞ (kaçırılması en kolay kırık):** `esikShow`'un "gösterecek
  kutup yok" kapısı overlay'den ÖNCE çalışır ve `_goldData`/`_lapisData`
  `window.imGetCurrent` (13l) ile `S._kisiKarti` (10q) hidrasyonuna bağlıdır
  (~2 sn). Boot'ta doğrudan çağrılsaydı Eşik **sessizce hiç açılmazdı**.
  `esikShowOnce` bu yüzden `_kutupBekle()` ile 200 ms turlarla bekler,
  tavan `KUTUP_TAVAN = 8000`; tavan dolarsa (gerçekten taze hesap) sessiz
  geçer. Kapı: `tests/02d-esik-girisi.test.js` (4 test).
- 10y'nin eski kapı testi TERSİNE çevrildi: "Studio flip'i artık tetiklemez"
  (`tests/10y-w2-llm-shell.test.js`).
- Ad senkronu: 13q Gözlemevi'ndeki "Studio eşiği" satırı → **"Giriş eşiği"**.
- `main.js`: `esikShowOnce` import + window expose (`esikShow` yanında).

### 2) Görsel kabuk Fable 5'in ilk hâline döndürüldü (kapsam: Emre seçti)

Emre "tasarımını Fable 5'in yaptığı ilk hâline döndür" dedi; kapsam
`AskUserQuestion` ile soruldu ve **"yalnız görsel kabuk"** seçildi — yani
ad senkronu, Mesafe Motoru ölçüsü, Yüz Çizgisi ve Eşiğin Nabzı KALDI.

Geri gelenler (ilk hâl = `bf29a06`, 19 Tem, 379 satır):
- **Zemin:** `--sky-stars`/`--sky-scene` (Yol'un ortak göğü) SÖKÜLDÜ →
  eşiğin kendi degradesi (üstte lapis gece, altta altın ufuk) + `--bg`.
  `::after` fixed **gren de söküldü** (`gren-kaydirma-kapisi` yeşil kalır).
  → [[sahne-gogu-tek-kaynak]] kararının 02d ayağı bilinçli olarak geri alındı.
- **Ölçü:** clamp/vh'ye bağlı dikey ritim → sabit px; kart `46%/200px`
  (tek kutup `60%/220px`). 08-07'nin iki eksenli ölçüsü kalktı; kısa
  pencerede taşmayı `_fitBridge`'in **kare dizilimi KORUNDU** (kurtarma
  katmanı, ölçüyü her ekranda kısmanın alternatifi).
- **Kart altyazıları geri:** `.esik-card-cap` + `_goldData().caption`
  zinciri + `DAY_MS`. Silinmiş 6 i18n anahtarı TR+EN geri eklendi
  (`esik.gold.portre_cap/persona_cap/persona_cap_today/days_since/today`,
  `esik.lapis.cap`). Yetim `esik.gold.from_portre` geri GETİRİLMEDİ.
- **Yol çubuğu:** `esikFill` (soldan sağa dolma animasyonu) tamamen söküldü —
  Emre'nin gözlemi: ilk hâlde çubuk sahnede olduğu gibi durur, hareket eden
  tek şey üstünden geçen parıltıydı. `esikSpark` keyframe'i ilk hâline döndü
  (uçtan uca: `left:0%→100%`). **clip-path korundu** — çubuk yürünen yolu
  üstündeki `%{n}` sayısıyla aynı şeyi söylemek zorunda (§6.10, 13x).

### 3) Kapı istifi — üç turda kalibre edildi (Emre'nin gözüyle)

Kapıların (`.esik-act`) yanındaki iki kartlık minyatür:
- **Konum:** satırın sonundan **başına** alındı (Claude'un satır ikonu gibi);
  mühür işareti (`CAT_SIGILS`) satır başından **başlığın önüne** inline geçti.
- **Duruş (nihai):** iki kart **yan yana**, aralarında 2px, ve
  **BİRBİRİNE BAKAR** — solda altın `rotateY(7deg) rotateZ(-.7deg)`, sağda
  lapis `rotateY(-7deg) rotateZ(.7deg)`, `perspective:50px`. Bu duruş
  kopyalanmadı: yukarıdaki iki BÜYÜK kartın (`.esik-card--gold/--lapis`)
  kuralının aynısıdır, perspektif oranı da korunur (900/200 ≈ 50/11).
  İstif = sahnenin minyatürü.
- Reddedilen iki ara tur (Emre): üst üste kaymış düz kartlar ("yan yana
  yapıyorsun"), ve tabandan çapraz kalkan yelpaze ("olmuyor"). Kayıt için:
  aranan şey bir deste ikonu değil, **eşiğin kendisinin küçük hâliydi**.

**Denetim notu (dürüstlük):** bu turun çapraz-model faz denetimi (§3.3)
KOŞULMADI — oturum harness'ı Agent çağrısını kullanıcı istemeden yasaklıyor.
Yerine öz-denetim + davranışsal preview doğrulaması yapıldı.
