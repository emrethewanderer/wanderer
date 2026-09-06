---
name: gunluk-ritus-armagan-soz
description: "Günlük ilk-giriş ritüeli (10s) — Armağan + Söz pop-up'ları, Elmas Barı, Verdiğin Söz; eski Bugün-gömülü Cazibe hediye/söz taşındı"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3c4a7680-c91e-463c-bdcb-1511683fc6d5
---

Günün Armağanı + Günün Sözü artık Bugün'e gömülü Cazibe (10r) kartları DEĞİL; günün
ilk girişinde bir kez açılan pop-up ritüeli. Yeni modül: `js/parts/10s-w2-gunluk-ritus.js`
(+ `css/parts/gunluk.css`).

**Akış:** Armağan pop-up → Söz pop-up → uygulama. Sıra/gün anahtarı `glDayKey()` (cz ile aynı).
Günde bir kez; `S._gunlukRitus.finished` Supabase-destekli SafeStorage'a yazılır
(`etw_gunluk_ritus_v1_<uid>`), aynı gün tekrar açılmaz.

**Ekonomi (dengeli):** Armağan +3 elmas; Söz 1/2/3 alan = +5/+12/+20; Söz atla = −3
(`spendElmas`, 10g'ye eklendi). `awardElmas` artık `window.glElmasBarUpdate()` çağırıyor.

**Kişiselleştirme:** en zayıf temel (`S._foundationsProfile`) + Yol Ayini
(`S._onboardingRecommendation.domainRecs[bireysel/iliski/is]`) → içerik bankaları
`GL_SOZLER` (domain×temel) ve `GL_GIFTS` (temel→quotes/paragraf/article). Günlük tohum
zayıf temelle harmanlanır → profil değişince içerik değişir. Onboarding yoksa `default`'a düşer.

**Söz pop-up:** 3 başlık = "Bireysel Hayat / İlişki Hayatı / İş Hayatı" (eski Niyet/Cesaret
etiketleri kaldırıldı). ≥1 alan seç; seçilen sözü **harfiyen** yaz (`_normalize`: tr-locale
lowercase + noktalama toleransı) → eşleşince MÜHÜRLE aktif.

**Verdiğin Söz = "Günün Mührü":** Bugün host `#gl-verdigin-soz`, **kimlik kartının
hemen altına** taşındı (kimlik kartına bağ: gold sol-kenar aksanı). 1 söz statik; >1 söz
`setInterval` ~4.2sn crossfade (reduced-motion'da hepsi listelenir). **DAİMA görünür**:
söz yoksa "GÜNÜN MÜHRÜ · BUGÜN" davet kartı (`gl-vs-card--invite`) → tık → `glGiveSozNow()`
söz pop-up'ını doğrudan açar. KRİTİK FIX: `glInit` (async hidrasyon) artık sonunda
`glRenderVerdiginSoz()` çağırıyor — yoksa loadBugunView ondan önce koşup kartı boş bırakıyordu.

**Elmas = "Elmas Halkası":** seri çemberinin (ws-vesper-ring) İKİZİ — aynı 38px halka +
Cinzel gold yazı. `#gl-elmas-bar` artık `#app-screen`'e **absolute** (fixed DEĞİL; app
max-width:501px relative kolon → masaüstünde de hizalı), `top:safe-t+15px; right:58px`
(vesper'ın hemen solu). Sayı solda + ◆ halka sağda, vesper'la y=15'te hizalı.
`glSyncElmasBar(view)` switchView sonrası çağrılır: SADECE ws-topbar kabuk view'lerinde
gösterilir (`bugun/dinlenme/atlas/hasimlar/muhrum/defterim/arketip/arketipler/kisilerim`);
w2-topbar (chat) gibi kendi sağ-üst kümesi olan view'lerde **gizlenir** (çakışma önlenir).

**KRİTİK Z-INDEX TUZAĞI (çözüldü 2026-06-03):** "Elmas çemberi kayboldu" şikâyetinin
kök nedeni → `#gl-elmas-bar` `z-index:30` iken `.ws-topbar` `position:absolute; z-index:40`
+ ~opak arka plan (`rgba(11,11,11,.95)`, 68px). Elmas barı app-screen'in çocuğu = topbar'ın
KARDEŞİ; daha düşük z-index → topbar arka planı barı örter (seri çemberi topbar'ın ÇOCUĞU
olduğu için görünür kalır). **Çözüm: `z-index:45`** (topbar 40'ın üstü, ama global-menu
500/drawer 520/portal 9600+ altı → drawer açılınca doğru kapanır). Layout testlerinde (display/
rect) görünmez — sadece BOYAMA sırası sorunu; ekran görüntüsüyle teşhis edildi.
Ayrıca hardening: `_closePortal` (10s + 10t) kapanışta `glSyncElmasBar(glActiveViewName())`
ile barı yeniden assert eder; Seri Mührü töreni artık yalnız `bugun-view` aktifken oto-dövülür
(Armağan'daki "İlgili Yazı"→Kütüphane'ye geçince törenin oraya düşmesi engellendi; manuel mühür açık).

**Tetik/guard:** `03-auth-shell` initApp ~1500ms sonra `window.glRunDailyRitual()`.
`glShouldRunToday()` + retry: `#cinematic-intro.ci-visible` / `#onb-ritual` / `.fgate-*`
açıkken bekler (24×1500ms retry), bittiğinde açar. KRİTİK: intro guard'ı olmazsa pop-up
sinematik girişin arkasında kalır.

**AKŞAM HESABI · "Sözünü tuttun mu?" (eklendi 2026-06-03 — Tutarlılık döngüsünü kapatır):**
Sabah verilen söz gün sonunda dürüstçe hesaplanır. `glRunEveningReckoning()` pop-up:
her söz için Tuttum/Tutamadım → `pledge.kept` + `r.reckoned=true`. Tutulan söz başına
`KEPT_REWARD=4` elmas (`awardElmas('gunluk-soz-tuttu')`); tutamamak **cezasız** (dürüstlük
teşviki). `glReckoningAvailable()` = bugün söz var & reckoned değil. Verdiğin Söz kartı:
reckoned değilse "Akşam Hesabı →" butonu (`#gl-vs-reckon`), reckoned ise "N/M söz tutuldu"
özeti + söz başına ✓tuttun/tutamadın işareti (`.gl-vs-mark`). `_default()`'a `reckoned` eklendi.

**SÖZ↔MÜHÜR KENETLENMESİ + BİRLEŞİK SABAH AYİNİ (2026-06-03):** Mühür töreni (10t) bugünün
sözünü tanır → söz varsa "söz halesi" (güçlü mühür); yoksa "söz ver →" daveti. `glConfirmSoz`/
`glSkipSoz` artık `_chainSeal()` ile söz biter bitmez Seri Mührü törenini akıtır (360ms; 2200ms
boot timer'ını beklemeden tek sürekli deneyim) — guard'lar (lastSealedDay/sm-portal/bugun) çift
tetiği engeller. `glConfirmReckoning` `smRenderBugunCard()` çağırır (mühür kartı söz durumunu yansıtsın).

**GÖRSEL YENİDEN TASARIM (2026-06-16 — Tasarım-Prensipleri'ne tam uyum):** Tüm tören
(`css/parts/gunluk.css` baştan yazıldı) Akşam Kapanışı'nın (aksam.css) **altın-şafak İKİZİ**
oldu — "akşam lapis-gece kapatır, sabah altın-şafak açar." Aynı sahne idiyomları, kutup ters:
sıcak radial veil (saf siyah değil); modal `--dawn-amber/peach/rose` köşe-radial + obsidyen taban
→ **sahnesi saatle yaşar** (html.tw-* token'larını otomatik çözer); kâğıt greni (`::before` +
isolation, mix-blend yok); **dövülmüş altın mühür CTA** (`.gl-cta`: gold-bright→gold gradient +
inset üst-ışık + glow + active scale(.93)); Cinzel kicker → **Fraunces başlık** (`gl-gift-title`/
`gl-soz-title`/`gl-reckon-title`, 10s JS'e eklendi) → EB Garamond italik lead (§4 kalıbı); ✦ sabah
yıldızı + ◈ mühür glyph'i **nefes alır** (`glStarBreath`); uçta-eriyen kıl çizgiler (border-image
linear-gradient transparent→glow→transparent). **ANLAMLI RENK EKSENİ:** Armağan=**altın** (şimdi/
eylem), Söz/yemin=**bronz** (`--bronze #C9A24B`, base.css'e EKLENDİ — söz alanları/onay/Verdiğin Söz
kartı sol-aksanı; ESKİ gold aksan→bronz oldu), içsel dokunuş (♥/☽)=**lapis** (içsel derinlik);
**mühür DAİMA altın** (§1, MÜHÜRLE/HESABI MÜHÜRLE gold kalır). Akşam Hesabı: kept=yeşil/broke=
terrakota (kırmızı değil — dürüstlük teşviki). Tam `prefers-reduced-motion` bloğu + 44px hedef +
altın focus-visible + 16px input (iOS). Akış/mekanik/ID'ler/handler'lar AYNEN korundu (sadece görsel
katman + 3 başlık satırı). 4 ekran preview'de doğrulandı, konsol temiz.

**AKŞAM AK­IŞI = "GÜN KAPANIYOR" (2026-06-16 routing kararı):** Akşam iki katman: **13h
`atRun` "Gün kapanıyor"** ANA tören (GELDİN/GÖRDÜN/YAPTIN + Yarına Niyet, lapis-gece/aksam.css,
21:00–00:00 oto + visibilitychange nabzı) ⇒ içindeki **YAPTIN "Hesapla →"** zaten 10s
`glRunEveningReckoning()` ("Akşam Hesabı" çıplak söz muhasebesi, Bireysel/İş Hayatı kept/broke)
alt-adımına köprü. Emre "çıplak Akşam Hesabı'nı değil Gün Kapanıyor'u görmek istiyorum" dedi →
**Bugün kartı reckon footer'ı (`#gl-vs-reckon`) artık `window.atRun(true)` açıyor** (force =
saat/gün-kapandı guard'larını atlar; atRun yoksa eski reckoning'e düşer). Etiketler: footer
"Gün Kapanıyor · Sözünü tuttun mu? →", done "Gün kapandı · N/M söz tutuldu". Çıplak reckoning'e
TEK doğrudan giriş artık 13h YAPTIN köprüsü. 13h/aksam.css'e DOKUNULMADI (zaten anayasaya uygun
lapis-gece ikizi). `atRun(force)`: force=true → _applicable/_blocked atlanır, yalnız at-portal
çift-açılışı engellenir.

**SAHNE STUDIO'YA TAŞINDI (KARAR 2026-08-20, Emre):** "Günün Armağanı / Günün Sözü"
töreni artık YALNIZ Bugün ekranında (`#bugun-view`) açılır. Kök neden bir boot
sırasıydı: `03-auth-shell` initApp `switchView('chat')` ile açıyor, günlük ritüel
timer'ı 1500ms sonra ateşleniyordu — yani tören pratikte HER ZAMAN Wanderer LLM
ön-yüzünde doğuyordu. 2026-07-12'de seri sistemi ikiye ayrılırken (Üç Mühür=Studio,
Gün Serisi=LLM) 10t/13h/10u Bugün'e çekilmişti; 10s'in töreni o turda atlanmıştı —
kapatılmamış son kapı buydu.

Mekanik: `_glStudioSahnesinde()` (`.view.active`?.id === 'bugun-view') →
`glShouldRunToday()` sözleşmesine ve `glRunDailyRitual()`'a girdi. **Sahne dışında
retry nabzı KURULMAZ ve `_glRetries` tüketilmez** (10t'nin retry'lı `_blocked()`
deseninden bilinçli sapma): sohbette geçen süre bir "bekleme" değil kullanıcının
kararıdır; 36 saniyelik bütçe orada harcanırsa Bugün'e dönüldüğünde tören için pay
kalmaz. Dönüşü iki kurtarma noktası yakalar — `switchView` kancası (03-auth-shell,
600ms) ve Eşik Ekranı'nın kapanışı (02d, `onBugun` zaten aktifken çağırır).
`force=true` sahneyi atlar → 10t/02d/10u köprüleri kırılmaz.

**Emre'nin kapsam kararı (aynı tur):** sohbetin BAĞLAMSAL söz köprüleri kapının
DIŞINDA kalır — 13a `[ARAC:soz]` "SÖZ VER" çipi ve 13b Çalışma Kağıdı'nın "Bunu
bugünün sözü yap →" düğmesi Wanderer LLM'de çalışmaya devam eder (`glGiveSozNow`
doğrudan çağrılır, sahne kapısı YOK). Taşınan yalnız **sabah töreni**dir.
Yan etki: Armağan'ın "İlgili Yazı" köprüsüyle Kitaplık'a sapan kullanıcıda tören
artık okurun üstünde açılmaz — Bugün'e dönüşte devam eder (kasıtlı).

Kapı testle mühürlü: `tests/10s-w2-gunluk-ritus.test.js` → "Studio kapısı" bloğu
(8 test; sahne yokken de susar). Canlı doğrulama harness'ı:
`.claude/harness/gunluk-ritus-sahne.html` (iki sahneyi ardışık kurar, VERDICT basar).
LLM ön-yüzünde kalan tek seri mekaniği 13r Gün Serisi → [[gun-serisi-vs-uc-muhur]].

10r `czRenderBugun()` artık no-op (hediye/söz çağrıları çıkarıldı); `czRenderHediye/czRenderSoz`
fonksiyonları geri-uyum için duruyor. İlgili: [[cazibe-motoru-cialdini]] [[onboarding-yol-ayini]]
[[wanderer-gamification-engine]] [[build-source-convention]] [[seri-muhru-toreni]].
