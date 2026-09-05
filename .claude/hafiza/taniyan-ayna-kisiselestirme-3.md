---
name: taniyan-ayna-kisiselestirme-3
description: "Tanıyan Ayna — Kişiselleştirme Motoru 3.0 (2026-07-08, Fable→Sonnet 5): 5 fazın hepsi TAM — Yaşayan Portre (09e) + Epizodik Hafıza (09f) + Ayna Protokolü (09g) + Ayna Anı töreni (09h) + sinyal nehri köprüleri; mig 034 ELLE"
metadata:
  node_type: memory
  type: project
  originSessionId: 76d461c5-9fe6-485f-bbbb-44d3fb7d01ac
  modified: 2026-07-31T16:43:30.424Z
---

**Tanıyan Ayna** (2026-07-08) — Emre'nin "Kişiselleştirme Motoru'nu world-class'a çıkaralım, kullanıcıyı kendinden iyi tanısın" isteğiyle başladı. Plan `.claude/plans/starry-foraging-wave.md` (EnterPlanMode + Explore keşfi + AskUserQuestion: tam anlamsal hafıza + görünür Ayna Anı töreni onaylandı). Model ortasında Sonnet 5'e geçti, aynı planın devamı olarak uygulandı. 5 faz da TAM: 554→620 vitest yeşil (66 yeni test, 4 yeni test dosyası), build temiz (203→213 modül).

## Mimari — 4 yeni katman + [[personalization-engine-layers]] (P1-P6, değişmedi)

1. **Yaşayan Portre (09e)** — günlük tek kanonik "X çünkü Y" sentezi. `omMaybeDistill`
   kalıbı (09d) ama GÜNLÜK: önceki portre + dünün gün özeti (`S._narrativeMemory[0]`)
   + P1/P5/P6 dijesti + `imGetContext` + `omGetTopPatterns` → callLLM(jsonMode,
   skipPersona) → TAM sentez (replace, append değil) + changelog satırı. Alanlar:
   `cekirdek{mesele,donusum_yayi}`, `degerler[]`, `celiskiler[]`, `kor_noktalar[]`
   (Ayna'nın hipotez havuzu — sohbete BASILMAZ, bilinçli), `dil_haritasi`, `kisiler{}`
   (P6 notes[] NİHAYET kullanılıyor), `rituel_iliskisi`, `changelog[]`, `hipotezler[]`.
   `buildPersonalizationPrompt` başına (oik'ten sonra) `window.ypGetContext()` enjekte;
   portre konsolide olduysa P1 self_desc satırı kısılır (`ypHasCore()`). Kalıcılık
   `etw_yp_dosya_<uid>` (SafeStorage). 09c panelde "EMRE'NİN GÖZÜNDEN SEN" + changelog
   + "Portreyi sıfırla" butonu (bütün silme, tekil değil).

2. **Epizodik Hafıza (09f)** — anlamsal geri-getirme. Mig 034 (`user_memories` +
   `match_user_memories` RPC, pgvector zaten prod'da etkin). `llm-embed` edge fn
   YENİDEN yazıldı (admin-only → kullanıcı-kapsamlı + 60/gün kota; ⚠️ deploy öncesi
   mevcut prod'la karşılaştırılmalı, SETUP dosyasında not var). INGEST: gün özeti
   (12-w3-journey `w3GenerateDeepSummary` hook) + yüksek-yoğunluk anlar (09a
   `p2RecordEmotionalMoment`, intensity≥4, günde ≤10) + backfill (S._narrativeMemory,
   ≤10/init). RECALL: `_shouldRecall` gate (geçmişe-atıf regex VEYA intensity≥4 —
   her mesajı embed etmemek için, RAG'in shouldRAG'ıyla aynı ruh) → 800ms
   `Promise.race` tavanı → remote (embed+RPC) yoksa/geç kalırsa `S._narrativeMemory`
   üzerinde konu-kelime fallback → hâlâ yoksa boş. 01'de `<recalled_memories>`
   bölümü (kriz/bilgi-arama modunda 0 bütçe).

3. **Ayna Protokolü (09g)** — haftalık hipotez üretimi. 09e'nin kor_noktalar+
   celiskiler'ini 13l kimlik bağlamıyla çapraz kontrol eder → ≤3 hipotez
   (guven≥0.6, 09e'nin 0.55'inden bilinçli yüksek). Zaten yanıtlanmış (durum≠'aday')
   hipotez metni tekrar önerilirse AYNEN korunur (LLM'in "aday"a geri döndürmesi
   engellenir). İçerik 09e'nin yp dosyasına yazılır (`ypSetHipotezler`) — 09g kendi
   `etw_ap_meta_<uid>`'sinde yalnız lastWeek/attempts/hintWeek/hintCount tutar (çift
   yazan iki dosya yok). Sohbette `<mirror_hypothesis>` haftada ≤2 tüketim
   (`apGetHintContext`); doğrulama `personalizationDeepAnalysis`'in (09a) JSON'una
   eklenen `mirror_response:{confirmed}` alanından — bunun için 09g oturum-ömürlü
   `_lastShownHint` tutar (kalıcı değil).

4. **Ayna Anı töreni (09h)** — görünür yüzleşme. İÇ DÜNYA odası, Örüntü Aynası
   yanına yeni kapı (SVG sigil: dairesel ayna + dikey çizgi). Kapı→hipotez kartı
   (kanıt satırları `--gi` stagger, gal-shelf kalıbı)→üçlü seçim ("Bu Benim" altın /
   "Bu Ben Değilim" outline / "Emin değilim" dismiss)→mühür (`ikvRing(100)` + 12c +
   `fxCue('seal')`) ya da nötr ret ekranı→`apResolveHypothesis`. css/parts/ayna-ani.css
   (oruntu.css kalıbı, `.overlay`/`.modal` reuse). **Gözlemevi enstrümantasyonu**
   (`wtOverlayOpen/Close('ayna-ani')`) eklendi — 09d bunu YAPMIYOR (Gözlemevi'nden
   önce yazılmıştı), yeni törenler için bu artık güncel best-practice.

## Sinyal nehri köprüleri (FAZ 5)
`p6GetLifeMemoryContext` artık kişi `notes[]`'i basıyor (önceden toplanıp hiç
gösterilmiyordu) · `w2GetTodayGreetingText` üçüncü öncelik: `ypGetGreetingSeed()`
(donusum_yayi, p3/p6'dan sonra) · 13o geri çağrı `ypGetGcLine()` (om'un gc_line
kalıbı) · `send-push` `loadContext`'e `user_analytics` KV'den yp_mesele okuma
(data_json JSON-string olarak saklanır, parse gerekir) · 13h akşam niyeti
`ypAddEveningIntentNote` ile ANINDA changelog'a işlenir (LLM beklemeden).

## Kod parmak izi + gotcha'lar
- **main.js static import ZORUNLU**: 09d/13e gibi eski window-bridge modülleri hem
  main.js'de statik import edilir (boot'ta window.* açılır) HEM 03-auth-shell'de
  dinamik import edilir (Init çağrısı gecikmeli). 09e/09f/09g/09h yazılırken ilk
  turda main.js'e eklenmemişti — sonradan fark edilip 4 satır eklendi (line ~41
  civarı, 09d'den hemen sonra). Yeni window-bridge modülü yazarken İKİSİNİ DE yap.
- 03-auth-shell init zinciri slotları: om=2400 · **eh=2600** (yesterday-check'ten
  ÖNCE olmalı) · **yp=2800** · w2CheckYesterday=3000 (var olan) · **ap=3200** ·
  hesapGunu=3500 (var olan). Yeni slot eklerken mevcut 3000/3500'e çarpma.
- Migration numarası **034** (plan yazılırken 032 varsayılmıştı; Benlik Kartı 2.0
  032 + Kullanım Nabzı 033 araya girdi → kaydırıldı, bkz. [[benlik-karti-2-olunan-ad]]
  [[gozlemevi-kullanim-nabzi]]).
- Test kalıbı: `vi.mock('../js/parts/04-llm-hero-history.js', importOriginal)` +
  `vi.doMock('../js/config.js', importOriginal)` (sb.rpc/from stub) + jsdom
  `window.xyz = vi.fn()` stub'ları per-test — global `tests/setup.js` sb mock'unda
  `.rpc()` YOK, RPC kullanan modül testi kendi sb mock'unu kurmalı.
- `getEmbedding` (07-settings-knowledge.js) reuse edildi, yeni embed client
  yazılmadı. Vektör insert/RPC param'ı `JSON.stringify(embedding)` string olarak
  geçilir (mevcut knowledge_chunks kalıbı).

## Opus denetimi (2026-07-31) — sandviçin denetim ekmeği

Sonnet 5 ile uygulanan sprint baştan sona yeniden okundu. Mimari SAĞLAM çıktı
(köprüler tam, i18n/p() paritesi tam, migration + 3 edge fn hazır, 09h CSS/DOM
eksiksiz). Dört gerçek kırık bulundu ve düzeltildi:

1. **Ayna ipucu bütçe sızıntısı (en ağırı).** `06:_runLLMTurn` her turda
   `apGetHintContext()` ve `ehRecall()` çağırıyordu; oysa `_CONTEXT_BUDGETS`
   bu iki bölümü kriz/derin-duygu/bilgi-arayışı modunda 0'la ATIYOR. Sonuç:
   haftalık 2'lik ipucu kotası görünmeden yanıyor VE `_lastShownHint`
   damgalanıyordu → 09a seans-sonu analizi kullanıcının HİÇ GÖRMEDİĞİ bir
   soruya "onay/ret" çıkarıp portrenin changelog'una "Doğruladın: …" yazabiliyordu.
   Sahte veri. Çözüm: 06 modu `_determineContextMode` + `_CONTEXT_BUDGETS` ile
   ÖNCE çözüyor, bütçesi 0 ise tüketiciyi hiç çağırmıyor. Ders: **bütçesi 0
   olan bir bağlam bölümünün tüketicisi yan etkiliyse, kapı üretim yerinde
   olmalı — atma yerinde değil.**
2. **09h çifte karar.** Sonuç ekranı 2.2sn duruyor ama üçlü seçim ayakta
   kalıyordu → ikinci, TERS karar changelog'a çelişkili satır yazıyordu.
   Çözüm iki katmanlı: `_renderResult` foot'u söküyor + `ypUpdateHipotezDurum`
   yanıtlanmış hipotezi reddediyor (yazarda tek gerçek).
3. **`PREMIUM_FEATURES.ayna` kaydı hiç yazılmamış.** 09h teaser CTA'sı
   `showPremiumFeatureSpotlight('ayna')` çağırıyor, kayıt yok → sessizce
   `switchView('sub')`, kullanıcı ne teklif edildiğini görmeden paywall'a
   çarpıyordu. Kayıt + `premium.ayna.*` TR/EN eklendi.
4. **Premium spotlight modalında 3 sabit Türkçe string** (rozet/CTA/skip) —
   EN kullanıcı karma dil görüyordu. `premium.badge/cta/skip` ile kapatıldı.
   (Tanıyan Ayna'nın değil, 03'ün eski açığı; teaser oraya indiği için kapandı.)

Gerçek OLMAYAN alarmlar (denetimde kanıtlanıp elenen): `ehMaybeBackfill`
havuzu boş bulmuyor (`loadNarrativeMemory` paralel blokta await ediliyor,
03:747) · `_localFallback`'in `best.date` alanı gerçek · `_shouldRecall` ile
mod çözücü aynı `S._emotionalFlow` girdisini okuyor (`trackEmotionalFlow`
`sendMessage`'da, `_runLLMTurn`'den önce).

Açık kalan küçük gözlem: `#studio-ayna-sub` hem `data-i18n` taşıyor hem JS ile
yazılıyor → `applyTranslations()` "sana bir sorum var"ı ezer. 09d'nin
`#studio-oruntu-sub`'ında da AYNI şekilde var (ortak kalıp), pulse noktası
sinyali taşımaya devam ediyor ve sonraki Bugün girişinde kendini onarıyor —
bilinçli olarak dokunulmadı.

İlgili: [[personalization-engine-layers]] (P1-P6 temel, değişmedi) ·
[[oruntu-motoru]] (09d — tembel-haftalık + hs-overlay kalıbının kaynağı) ·
[[kimlik-motoru]] (13l — davranış kanıtı kaynağı) · [[kart-salon-dili]] (12c
primitifleri) · [[his-doku-paylasim]] (fxCue) · [[emre-yonlendirme-hardcode-yasak]]
(tüm LLM metinleri p(), tüm UI metinleri t()) · [[hafiza-paneli-drawer-arama]] (09c).

Plan dosyası `.claude/plans/starry-foraging-wave.md` REPODA YOK (2026-07-31'de
arandı) — tek referans bu hafıza dosyası + `SETUP-TANIYAN-AYNA.md`.

ELLE kalan (SETUP-TANIYAN-AYNA.md): şema `migrations/000_wanderer_schema.sql`
içinde konsolide (bkz. [[migration-konsolidasyonu]]; user_memories §4.20 +
match_user_memories) + llm-embed deploy (⚠️ mevcut prod'la karşılaştır) +
delete-user/reset-user/send-push redeploy. `llm-embed` kotası artık
instance-local Map DEĞİL: `fn_quota_consume` RPC (yedek fren olarak Map kaldı) —
SETUP notu 07-31'de güncellendi.
