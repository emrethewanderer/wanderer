---
name: olu-kod-temizlikleri
description: Ölü kod temizlikleri (2026-06-15 fonksiyon taraması + 2026-07-02 İçsel Durum panosu sökümü) — KORUNANLAR listesi + ekran-kaldırma kontrol listesi
metadata: 
  node_type: memory
  type: project
  originSessionId: 17af45ed-c474-4593-8386-af979662a232
  modified: 2026-08-17T08:34:00.228Z
---

İki büyük temizlik tek kayıtta (eski [[olu-kod-temizligi-2026-06-15]] + [[olu-kod-pano-temizligi]] birleşimi).

## 2026-06-15 — fonksiyon taraması
Statik analizle 30 birinci-derece ölü fonksiyon + ölü PME zinciri (09: showPatternMemoryReport→aggregateWeeklyPatterns, ~157 satır) kaldırıldı. Vasıta Tuzağı heuristik+testleri Emre onayıyla silindi (10g artık 3 mekanik: Ayna/Duyuru/Davranış Kanıtı).
**KORUNANLAR (diriltme/yeniden-silme tuzağına düşme):** 02b-onboarding-ritual.js (09-reports'ta runSelfCardOnboarding yoksa kasıtlı fallback); IDB_STORES.SUMMARIES/JOURNEY store tanımları (silmek DB migration ister); sinyal dizileri _KENDINI_BALTALA/_KAFAYA_TAKMA/_OLUMSUZ/_STRES (dfGetPracticalConceptsContext canlı); generateInvisibleFaceProfile (10p kullanıyor).

## 2026-07-02 — İçsel Durum panosu sökümü
Eski `dashboard` view'ının kalıntı makinesi söküldü: 04 chain/mood zinciri, 08 avoidance/transformation renderer'ları, 09b kişi-kartı/olumlama editör UI beşlisi, 02 Söz Defteri viewer, switchView 'dashboard' dalı, 13 dilde ~800 dict satırı, dashboard.css 516→~180.
**KORUNANLAR:** dfGetBeliefStats/dfGetChoiceStats (10q+13l), S._affirmation + S._personTransition STATE'i (10j yazar; 10f/10g/13 okur), COMMITMENTS motoru (00).
**Onarım:** 01 generatePreSessionContext streak'i ölü #streak-val yerine `window.recomputeStreakUI()`'dan okur.

## 2026-08-17 — route + ölü kapı turu (Derin Çalışma FAZ 5/8)
`switchView`'ın DOM'suz dokuz dalı + `ALLOWED_VIEWS`'taki 13 ölü hedef düştü
(bkz. [[route-kapisi-bos-ekran]]); `requirePremium`/`requirePremiumPlus`
(0 çağıran, `types/*.d.ts` onları `window.*` diye YANLIŞ beyan ediyordu),
`10c-w2-manifesto.js` (62 satır) ve `filterHistory` söküldü.
**KORUNANLAR (yeniden "ölü" sanma):** `10v-w2-manifesto-reader.js` — 10c'yle
KARIŞTIRMA, canlı.

## 2026-08-17 (ikinci tur) — FAZ 8 takası TAMAMLANDI
Yukarıda "yeni yüzeyle birlikte takas edilmeli" diye bekletilenler takas
edildi: `w3LoadJourney`/`w3RenderChapters`/`w3ToggleChapter`/`w3RebuildJourney`
→ yerine DOM'suz `w3GetChapters`/`w3GetChaptersCached` (13A `#dc-hat` tüketir);
`loadLibrary` + AI challenge zinciri altı fonksiyon (`loadAIChallengeRecommendation`
`renderAIChallengeRec` `renderActiveChallenge` `startPersonalChallenge`
`refreshChallengeRecommendation` `recoverChallengeTasks` + `challengeCacheKey`)
SÖKÜLDÜ; `loadChallenges` çizmeyi bırakıp saf veri okuyucusu oldu (13A
`#dc-sefer` çizer). 10h 458→283 satır. 27 dict anahtarı TR+EN birlikte düştü.
**KORUNANLAR:** `startSeferForBoss` · `challengeTasksKey`/`challengeInfoKey` ·
`resolveSeferTasks` · `calcBossNefes` · `HASIM_BOSSES`/`ENGELLER` · `toRoman` ·
`getSeferPrompt` (artık gerçek tüketicisi var) · `markLibrarySeen` (10g'de üç
canlı çağıranı var, `loadLibrary`'siz de yaşar).
**Ölü sanılmasın diye:** `10h-w2-library-challenges.js` dosya adında artık
"library" YOK ama ad göçü yapılmadı — `09d:811` dinamik `import()` string'i
taşıyor, rename tek elden yapılmalı.
**Bu turda bulunan İKİ SESSİZ KIRIK (aynı sınıf, ayrı ders):**
`completeChallengeDay`'in sıfır çağıranı vardı → başlatılan 21 günlük sefer
ilk günde donuyordu; `w2ExtractToneFromSummary` 12'de üç yerde çağrılıp hiç
import edilmemişti (`s.tone || …` kısa devresi hatayı tonu dolu satırlarda
gizliyordu). Ders: "ölü" teşhisi kadar **"çağıranı yok ama olması gerekiyordu"**
teşhisi de aranmalı — ilki silinir, ikincisi BAĞLANIR.
**Bundle dersi:** ölü modül silmek bundle'ı düşürmez — hiçbir yerden import
edilmeyen dosya zaten girmiyordu (tree-shaking). Pay isteyen sidecar'a bakar.

**How to apply — ekran kaldırma kontrol listesi:** render fn → çağrıcılar (03 switchView dalı + i18nchange + boot) → main.js expose → dict anahtarları → CSS evi → `#element-id` okuyan uzak tüketiciler (01 prompt bağlamı gibi). Ölü teşhisi = "hedef id'yi üreten var mı" grep'i; `t()` fallback'i UI'ı yaşatıp ölümü gizler.

---

## 2026-08-18 — Bugün'ün deste bölümü söküldü (Karşılaşma sprinti)

Silinenler (hepsi grep ile kanıtlandı):
- `10q2`: `kkRenderBugun`, `kkDesteKaydir`, köprü çizimi (`_kopruHTML`,
  `_kopruKartId`, `_gkKart`) ve `[data-kkb-isik]` bağlaması
- `_src.html`: `#kk-bugun` bölümü · `kisilerim.css`: 261 → 146 satır
  (`.kkb` kabuğu, `.kkb-head*`, `.kkb-body` ızgarası, `.kkb-kopru*`,
  `.kkb-isik*`)
- `.claude/harness/bugun-kopru.html` (sınadığı köprü kalmadı)
- `13B`: `karSayfaIndex` (yazıldı ama üretimde çağıranı olmadı)

**KORUNANLAR:** `kkDeckHTML/kkDeckBind/kkDeckLen` (Geçiş masası tüketir) ·
`kkDesteAltin/kkDesteLapis` (oda ve hero yığını tüketir) · `_gkEntry` kutup
üyeliği · `.kkb-deste/-stack/-card/-nav/-all/-crown/-esik` sınıfları (masa
çizer). Ayrıntı: [[karsilasma-odasi]].


---

## 2026-08-21 — erişilemez takvim yüzeyi + ölü ödev paneli

**Takvim (11-w2-chat-cal.js, 303 satır).** `#w2-calendar-container`,
`#w2-summary-page-container`, `#history-view`, `#w2-cal-grid`, `#w2-sp-*`,
`#w2-full-chat-*` kaplarının **hiçbiri** `_src.html`'de yoktu. Söküldü:
`w2RenderCalendar` · `w2CalPrev`/`w2CalNext` · `w2OpenDaySummary` (hem 11'in
hem 12'nin v3 override'ı) · `w2BackToCalendar` · `w2OpenFullChat` ·
`w2BackToSummaryPage` · `w2FilterHistory` · `w2InvalidateAndRerender` +
`_origRenderHistory` · `TR_MONTHS`. Ayrıca 6 dict anahtarı (TR+EN) ve 144
satır CSS (`.w2-cal-*`, `.w2-summary-*`, `.hw-*`).

Diriltmek değil sökmek doğruydu: karşılığı **Sohbetler kenar çubuğudur** ve
kapsamı üstündür — `chDrawerOpenDay` + `renderDaySummaryHTML` özeti OLMAYAN
günü de açar, `chDrawerViewFull` tam sohbete gider, `_chRunSearch` mesaj içi
arar (eski `w2FilterHistory` yalnız başlık/özet tarıyordu). Diriltmek ikinci
bir motor kurmak olurdu (§1.3).

**KORUNANLAR (yeniden "ölü" sanma):** `w2LoadSummariesCache` ·
`w2GetSummariesByDay` · `w2ExtractToneFromSummary` · `w2GenerateDaySummary` ·
`w2CheckAndSummarizeYesterday` · `w2NotifyDaySummaryReady` ·
`w2ScheduleMidnightSummary` · `w2RenderInfiniteChat` — hepsi veri katmanı ya
da Drawer'ın beslediği canlı yol. `.history-item`/`.h-date`/`.h-title`/
`.h-preview`/`.empty-state` CSS'i de canlı (başka tüketicileri var).

**Ödev paneli.** `renderHomework` + `_homeworkHistory` + 13 dict anahtarı;
ayrıntı [[odev-zinciri-ve-cipi]]. Çip KORUNUR — tek görünür yüzey odur.

**Bu turun dersi (yine aynı):** ölü teşhisi kadar **"çağıranı yok ama olması
gerekiyordu"** teşhisi de arandı. Takvim silindi, ödev çipi BAĞLANDI. Ayırt
edici soru: yüzeyin karşılığı başka yerde var mı (sil) yoksa özellik yüzeysiz
mi kaldı (bağla)?
