---
name: personalization-engine-layers
description: "Wanderer personalization engine = 6 layers (09a), uses p() i18n NOT hardcoded-TR; Layer 6 Life Memory added 2026-05; 2026-07-08 4 new layers on top → [[taniyan-ayna-kisiselestirme-3]]"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5b003f76-2a05-4565-8004-2a6ad259ff7a
---

**2026-07-08 güncelleme:** P1-P6 (aşağıda) aynen korunuyor, HİÇBİRİ değişmedi.
Üzerine 4 yeni katman eklendi — Yaşayan Portre (09e, günlük tek kanonik sentez),
Epizodik Hafıza (09f, pgvector anlamsal geri-getirme), Ayna Protokolü (09g,
haftalık hipotez), Ayna Anı töreni (09h). Detay → [[taniyan-ayna-kisiselestirme-3]].

Wanderer AI's personalization engine lives in `js/parts/09a-personalization-engine.js` (+ `09b-depth-foundations.js` for book philosophy). It now has **6 layers**:
- P1 personality map, P2 emotional memory chain, P3 prediction, P4 adaptive communication, P5 relationship depth (trust/alliance/vulnerability), **P6 Yaşam Hafızası (Life Memory)** — added 2026-05.

**P6 = "ebeveyn/en yakın dost" somut hatırlama** (`p6*` fns in 09a, state `S._lifeMemory` in `js/state/personalization.js`):
- `people{}` — named-person extraction (regex role-cues like "eşim Ayşe" + apostrophe proper-nouns + "X ile"), role-tagged, sentiment-tracked.
- `openLoops[]` — future events ("yarın sınav") via `_FUTURE_MARKERS`+`_OPEN_LOOP_EVENTS`, `p6ResolveDueDate` → ISO; `p6GetProactiveCheckin` follows up next session ("nasıl geçti?").
- `lifeFacts[]` (occupation/pet/goal/health), `importantDates[]`.
- Wired: `personalizationAnalyze` (regex realtime) → `buildPersonalizationPrompt` (chat ctx) → `personalizationDeepAnalysis` (session-end LLM enrich/merge) → greeting via `w2GetTodayGreetingText` in `10-features-w2.js`. Persist key `etw_p_lifememory_${uid}`.

**Gotcha:** unlike the game layer (10g–10m hardcoded TR per [[wanderer-gamification-engine]]), the personalization engine uses **`p()` i18n** — new prompt strings go in BOTH `tr` and `en` blocks of `16b-i18n-prompt-dict-core.js` (`prompt.p6.*`). Also: JS `\b` is ASCII-only, so it does NOT bound Turkish-letter words (ö/ğ/ı/ş) — drop `\b` for TR regexes (matches existing `_VALUE_INDICATORS` convention). Tests in `tests/09a-personalization-engine.test.js`. See [[build-source-convention]].
