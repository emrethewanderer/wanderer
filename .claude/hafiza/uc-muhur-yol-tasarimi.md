---
name: uc-muhur-yol-tasarimi
description: "Üç Mühür tam yeniden tasarımı — 'İki Kart Arasındaki Yol' (10f); altın↔lapis kimlik ekseni, vuruş dili, Bugün O Kişiydin"
metadata: 
  node_type: memory
  type: project
  originSessionId: fb387b67-767d-45af-b1eb-933a187b4631
  modified: 2026-08-17T13:45:32.046Z
---

**Üç Mühür yeniden tasarlandı (2026-06-13)** — sayaç sisteminden **kimlik dövme** sistemine. Yeni metafor: olduğun kişi (ALTIN) ↔ olmak istediğin kişi (LAPİS) arasında her gün **bir halka** dövülür; üç mühür = o halkayı döven üç vuruş: **SERİ=GELDİN · HAYAL=GÖRDÜN · SÖZ=YAPTIN**. 3/3 → "BUGÜN O KİŞİYDİN" (ultra). Ledger altyapısı ([[ultra-seri-uc-muhur]] anahtarları) AYNEN korundu, üstündeki yüzeyler yenilendi (veri göçü yok).

**YENİ modül `10f-w2-yol.js` + `css/parts/yol.css`** (window.yol* expose; main.js 10u sonrası import; 03-auth-shell post-auth usInit'ten SONRA yolInit). Fonksiyonlar: `yolRenderHero` (Bugün hero), `yolOpen` (Yol ekranı), `yolOpenStation(d)`, `yolScore` (=`S._kisiKarti.closest.score`, 02d ile AYNI; yoksa seri pct fallback), `yolDayRings(n)` (28 günü üç ledger'dan türetir — seri=localDayKey pad'siz, hayal/söz=padded), `yolPoles` (altın/lapis kart yüzleri, tek kaynak).

**Yüzeyler:**
- **Bugün hero** `#yol-hero` (_src.html bugun-view'da eski `.bk-strip`/Geçiş Şeridi'nin yerine): mini altın kart ↔ 3-yaylı halka (✦seri/◉hayal/◆söz, dolu=renkli) ↔ mini lapis kart + %yakınlık yolu + kıvılcım izi. Kutuplar→benlik/arketip, halka→yolOpen.
- **Yol ekranı** `#yol-portal` (z-index 9655; `_blocked`'a eklendi): AŞAĞIDAN yukarı dikey yol — altta altın kapı (olduğun) → halka defteri (28 gün ring-ızgara) → BUGÜNÜN HALKASI (3 vuruş eylem satırı: GELDİN→smRunDaily / GÖRDÜN→usOpenDetail('hayal') / YAPTIN→glGiveSozNow) → 8 istasyon (ikvMilestoneScene thumb + 3 pip + hedef ⚑ bayrağı) → üstte lapis kapı. İstasyona tık→`yolOpenStation` (o eşikte üç mührün kartı yan yana). Paylaş→shrShareStory. tw-* saat tonu sahne göğüne.

**Devralma zinciri (KRİTİK):** `usRenderBugunCard` artık gövdesiz → `window.yolRenderHero()` delege. `smRenderBugunCard` (10t) ve `smOpenCollection` (10t) de delege oldu (smOpenCollection→yolOpen; ad korundu → Drawer "ÜÇ MÜHÜR" + #bugun-moon onclick="smOpenCollection()" değişmedi). Tüm dış sözleşmeler (usCheckHayalDay/usCheckSozDay/usOnSeriSealed/usRunDaily/usIsUltraToday) AYNEN; 13m kota (`ktGrantUltraBonus`/`S._ultraMeta`) + 06 fallback dokunulmadı.

**Tören (10t `_renderSealCeremony`):** "vuruş" dili — kicker "HALKAYA İLK VURUŞ"/"BUGÜNÜN VURUŞU", mühür sahnesi 3-yaylı halka (`_strikeRingSVG`/`_strikeStates`; seri segmenti `sm-strike-arc--struck` draw-in). `_pulseSlice` artık `.yol-glyph--<id>` hedefler. GOTCHA-FIX: seri-muhru.css'te DUPLICATE `@keyframes smGlow` (sm-tri'deki opacity sürümü) sm-seal-glyph'in text-shadow sürümünü EZİYORDU — sm-tri bloğu silinince düzeldi.

**Ultra (10u `_renderUltraAwaken`):** "Bugün O Kişiydin" — lapis kart altın kartın üstüne biner (`us-awaken-merge`, yolPoles'tan) + fxCue('holoGrand') + armağan satırı (grantP.then korundu).

**Detay sayfaları (10u `usOpenDetail`):** tepeye "YOLUN NERESİNDESİN" mini-yolu (`_yolPosHTML`: buradasın → sonraki istasyon ikvMilestoneScene thumb). Korunan sözleşmeler: `#gl-verdigin-soz` host + glRenderVerdiginSoz, `.us-scene--soz` seçici, switchView hedefleri, us-portal id.

**Detay sahnesi SİL-BAŞTAN (2026-08-17 · derin-calisma.md FAZ 9):** sahne kendi
dünyasını kuruyordu (Roma sütunları, mor bahçe, mermer) ve uygulamayla akraba
değildi. Yeni dosya `css/parts/uc-muhur.css`; zemin Yol'un zemini
(`--sky-scene`/`--sky-stars`/`--grain-img` tek kaynak, saatle yaşar).
`ultra-seri.css` 262→70 satır, **yalnız Ultra Uyanış töreni** kaldı ve
keyframe'leri `usAwaken*`'a ayrıldı (iki dosya `usSceneIn`/`usHeroRise` adını
sessizce paylaşıyordu — duplicate keyframe).
- **Kart yüzleri 12c'de:** hero = elde edilmiş EN SON kilometre taşının kartı
  (`ikvCardFace` + `ikvMilestoneScene`), taş yoksa **destenin sırtı**
  (`ikvCardBack`). Galeride kazanılan yüz / kazanılmayan sırt; **🔒 emoji yok**.
  Nadirlik taşın mertebesinden (`TIER_RAR` tier2→nadir, 3→nadide, 4→efsane).
  Galeri **3 sütun** — 4 sütunda kart 78px'e düşüp 12c'nin 96px container-query
  eşiğini kaybediyordu.
- **Gün sayısı kartın DIŞINDA:** kart imgedir, sayı ölçümdür.
- **Palet artık `_scenePalette`: hayal→lapis, seri VE söz→altın** (söz bugünün
  eylemidir); söz'ün bronzu sahne aksanında (`--us-accent`), kart yüzünde
  değil — 12c'ye üçüncü palet EKLENMEZ.
- **Dikiş dersi:** dekor sökülürken microcopy onu anlatmaya devam ediyordu
  ("bahçe çiçeklenir", "mermere kazınır"). `us.series.*.scene_title` düştü,
  `scene_line` üçü de yeniden yazıldı. İhtimalsel dil kapısı ilk yazımı kırdı
  (`-dır` eki; sözlükte taban 0) — muafiyet yazılmadan geniş zamana çekildi.
- Escape + `wtOverlayOpen/Close('uc-muhur-<tri>')` eklendi; `usRefreshRing`
  (6 çağıran + expose), `#us-act-soz` dinleyicisi ve kart `glyph` alanları
  kanıtla söküldü. Harness: `.claude/harness/uc-muhur.html`.
- **`13h` GÖRDÜN dolambacı kalktı:** artık doğrudan `gorOpen()` (istatistik
  sayfasına uğramıyor); `gorOpen` bugünkü bakışı zaten tanıyor.
- **ÖLÇÜLDÜ — TR İ tuzağı gerçek:** `lang="tr"` doğru kurulu olsa bile tarayıcı
  `text-transform:uppercase` ile küçük "i"yi **noktasız "I"** yapıyor ("Sevgi" →
  "SEVGI"). `yol.css .yol-feed` ve `gordun.css .gor-window-cat` uppercase'i bu
  yüzden kalktı. Yeni yüzeyde CSS uppercase'e güvenme — metni sözlükte büyük yaz.

**Emekli/silinen:** 10-features `_renderBkGecisStridi`+`_bkTarotFace` (bk-strip); 10t `_weekStripHTML`+`_SM_DAY_ABBR`+smRenderBugunCard/smOpenCollection eski gövdeleri; ultra-seri.css us-card/us-slice (çapraz kart); seri-muhru.css sm-bugun*/sm-mini*/sm-week*/sm-tri*/sm-gallery*/sm-goalbar*/sm-close.

İlgili: [[ultra-seri-uc-muhur]] (eski tasarım — bu onun halefi) [[seri-muhru-toreni]] [[esik-ekrani]] (altın↔lapis dil kaynağı) [[kart-gorsel-dili]] [[kimlik-motoru]] [[build-source-convention]].

**Kutup şeridi — "bu kart kimlerden oldu" (2026-08-03):** hero'da her kutup
kartının ALTINDA, o kartı besleyen kartların adları **4 sn'de bir devreder**
(`yolFeedNames` → `window.byGetYapi()`, yani 10q3 Benlik Yapısı'nın izleri —
`porCardRefs` + `oikCardRefs` + bekleyen hedef mühürleri; İKİNCİ defter
tutulmaz, mezun kart lapis koldan düşer). Gerekçe: iki kutup da SENTEZDİR;
malzemesi görünmezse kart bir iddiadan ibaret kalır. Görsel dil
`.yol-pole-tag`'in ikizi (Cinzel 7px, uppercase, kutup rengi, opacity .66);
yükseklik SABİT 21px / 2 satır clamp — 101px sütunda 26 karakter sığar,
destedeki 100 adın 92'si altında. Şerit İKİ tarafa da basılır (biri boşken
hiza bozulmasın), ikisi de boşsa hiç basılmaz. Sayaç TEK (`_feedStart` her
render'da öncekini durdurur), `document.hidden`'da sıra ilerlemez,
`prefers-reduced-motion` ve tek-ad hâlinde dönmez (WCAG 2.2.2).
**GOTCHA:** preview pane'inde `document.visibilityState` DAİMA `hidden` —
şerit orada dönmez; canlı doğrulama için `document.hidden` geçici override
edilir, yoksa çalışan kod ölü sanılır.

**Çizginin nefesi Eşik'ten alındı (2026-08-03, Emre'nin isteği):** hero'daki
yol çizgisi ile altındaki mesafe cümlesi arasındaki boşluk, Eşik Ekranı'ndaki
ikizinin (`.esik-path` / `.esik-path-label`) ölçüsüne oturtuldu — çizgi altı
**12.5px**, çizgi üstü **16px** margin, cümlede `line-height:normal`. Taşınan
şey margin sayısı değil GÖRSEL boşluktur: 1.45 satır yüksekliği metnin üstüne
half-leading ekleyip aynı 8px'i göze farklı gösterdiği için satır kutusu da
Eşik'ten alındı (`--serif`in doğal satırı 16px). Asıl fark tasarımdan değil,
`.yol-path`'in `<button>` olmasından geliyordu → [[dokunma-hedefi-gorsel-bosluk]].
Ultra ve ilk-halka cümleleri bu ölçüye girmez (`.yol-label` 8px/1.45): onlar
çizginin değil kartın altyazısıdır.

**GÖRDÜN vuruşu sil-baştan (2026-07-04) →** HAYAL mührünün 6-ritüel checklist'i tek "Bakış" anına indirgendi; yeni tasarım [[gordun-pencereden-bakis]]'te. `usOpenDetail('hayal')` HÂLÂ geçerli (Gördüklerin Defteri + 2 derin kapı), yalnız içeriği değişti.

---

> **HERO'YA YIĞIN GELDİ (2026-08-18).** İki kutup düğmesinin içine, kartın
> ARKASINA, Kişilerim destesinin ilk iki kişisi diziliyor (`_yiginHTML` →
> `window.karYuz`, yüz üretimi 13B'nin tek kaynağından). Kutba dokunmak
> artık `switchView('portre'/'arketip')` değil `karAc('altin'/'lapis')` —
> oda açılamıyorsa eski kapı devralır. `.yol-row` yığın taşmasın diye
> `padding-inline:12px` aldı. Ayrıntı: [[karsilasma-odasi]].

---

> **SAHNE TERS ÇEVRİLDİ + TAŞLAR TEK KARTA GİRDİ (2026-08-23, Emre'nin
> isteği: "bu kartları tek kart içinde kartlar olarak yapıp alttakileri üstte
> alalım").** Yol ekranının sırası artık YUKARIDAN aşağı: lapis kapı → üç mühür
> şeridi → halka defteri → BUGÜNÜN HALKASI → altın kapı → iki koleksiyon
> paneli. Sekiz kilometre taşı tam-genişlik satırlardı (`.yolp-st` /
> `.yolp-track`) ve tek başına iki ekran yiyordu; artık **tek kartın içinde
> sekiz mini kart** (`.yolp-coll` kabuğu + `.yolp-cell`), **yakından uzağa**
> okunuyor (geçilmiş taşlar önde) — yol ekseniyle ters yönde, çünkü defter
> yolun kendisi değil, toplamıdır.
>
> Aynı kabuğun İKİNCİ tüketicisi: **"BU KARTI KURANLAR"** (`_goldCollHTML`) —
> altın kutbu kuran kartların ızgara hâli; kaynağı yine `window.byGetYapi()`
> (yukarıdaki kutup şeridiyle aynı defter, ikinci türetme yok), taşma
> `+N kart daha →` ile `byShowGrid()`'e gider. Kabuk `_collHTML` ile tek
> yerde durur — ikinci panel ikiz bir kabuk doğurmadı.
>
> İki kırık kapandı: (1) yol çizgisi kaydırma kabının kendisine asılıydı,
> ilk ekranın sonunda bitiyordu → `.yolp-body-in` sarmalı; bu kırığın sekiz
> kardeşi aynı gün bulundu → [[gren-kaydirma-sarmali]]. (2) Hedef bayrağı
> istasyon `<button>`'unun İÇİNDEydi; iç içe buton ayrıştırıcıda dıştakini
> kapatıyor, dört bayrak hücreden kaçıp yolun ortasında yetim kutular olarak
> duruyordu → bayrak artık kardeş, hücrenin köşesine iğneli (`min-height:0`
> + `::after` ile 36px dokunma hedefi).
>
> Emekli: `.yolp-st`, `.yolp-track`, `.yolp-st-thumb/-info/-name/-day/-pips`
> (repo genelinde çağıran kalmadığı `grep` ile kanıtlandı; taş DETAY modalinin
> `.yolp-st-modal/-box/-cards` adları ayrı şeydir, duruyor).
> Harness: `.claude/harness/yol.html?n=<gün>` — karışık defter kurar
> (geçilmiş + ilerideki taşlar), oturum gerektirmez.
>
> **GOTCHA — 12c'nin mini kademesi hücre kurallarını eziyor:** `.yolp-cell
> .ikv-name` (0,2,0) ile 12c'nin runtime enjekte ettiği `.ikv-card--mini
> .ikv-name` (0,2,0) aynı ağırlıkta; sonra gelen kazandığı için hücrenin kendi
> tipografi kuralları ÖLÜYDÜ (iddia 8.5px, gerçek 5.50px; kicker 2.81px'te
> okunmuyordu). Bir seviye derin seçici gerekir (`.yolp-cell .ikv-card--mini
> .ikv-kicker`). Ada dokunulmadı: 8.5px denendi, uzun ad dört satıra çıkıp
> 100px'lik kartta sahneyi 14px'e düşürdü — kart pencere olmaktan çıkıyor.
