---
name: wanderer-gamification-engine
description: "Wanderer AI gamification layer — modules, philosophy mapping, TR-string convention, the 4 ritual pillars added 2026-05"
metadata: 
  node_type: memory
  type: project
  originSessionId: ccac6340-257a-4931-9666-a079248f160f
---

Wanderer AI implements emre the wanderer's two books — **Wanderer İlişki Felsefesi** (relationship philosophy: "Mesele sensin", 4 Derinlik [Standart·Hak Etmek·Normal·Layık] + 5 Temel [Öz Sevgi·Saygı·Değer·Güven·Bolluk], Hayal Alemi, Elmas-as-diamond) and **Zihniyet Devrimi'ne Çağrı** (12-madde Manifesto + 152 essays; core practice = **Geçiş Alanı**: Olmak İstenilen Kişi → Düşünce&İnanç/Duygu/Davranış, read aloud morning+night, record voice & listen, imagine through their eyes; method = **Kendinle Konuşmak**; frameworks: Ko-Zo, Süper Odak, 6 Perde, 6 Zehir, 7 Tuzak, period reviews, daily %1=37×/yr).

The deep LLM context engine `09b-depth-foundations.js` already detects nearly every book concept and injects coaching.

~~Game-layer modules use hardcoded Turkish strings~~ — **YANLIŞLANDI (2026-08-19).** Dalga 3-4 sprintleri katmanı tamamen `t()`'ye göçürdü; 19 Ağustos sayımı: 10g 58 · 10s 54 · 13A 105 `t()` çağrısı. Yeni UI string'i DAİMA `t(key, fallback)` ile yazılır (§6.8).

**10j gecis-alani SİLİNDİ** — Geçiş Alanı'nın işini 10D (Olmak İstediğin Kişi) ve 10A (Geçiş Kartı) devraldı; aşağıdaki 10j maddesi tarihsel kayıttır.
- 10g wanderer-game (Ayna, Vasıta Tuzağı, Davranış Kanıtı, `awardElmas`/`getElmasSayisi`)
- 10i hayal-alemi — 4-aşamalı metin seansı (kavram→LLM soru→sahne yaz→mühürle+Elmas). **Üretken görsel (2026-05-30):** `haGenerateDreamArt(scene)` = harici AI YOK, prosedürel/deterministik SVG (seed=hash(id|concept|text)→mulberry32; yıldız alanı+yörünge+halo + 9 kavrama özgü merkez motifi). `haDreamCard(scene,'full'|'mini')` = Arketip tarot kartının (12a `wsArchCard`) hayalsi muadili. Harita kartları tıklanınca `hayalAcKart(sceneId)` → tam ekran overlay: üstte görsel + altta kullanıcının kendi cümleleri (budamadan). `sahne.artSeed` stabilite için saklanır. CSS: hayal-alemi.css; testler determinizmi doğrular.
- **10j gecis-alani** (Pillar A): Olmak İstediğin Kişi cards + sabah/gece reading ritual w/ MediaRecorder voice (IndexedDB `RECORDINGS` store, DB v2) + Elmas KRİSTALLEŞME tiers (CRYSTAL_TIERS, `gaCheckCrystalMilestone` → showGraduation). Syncs active card to `S._affirmation.text` + `S._personTransition.desired`.
- **10k kendinle-konusma** (Pillar B): 4 guided self-dialogue sets (İnanç Kazma/Sabah Sorusu/Amaç Bulma/Serbest) + voice + AI reflection → bridge to Geçiş Alanı card.
- **10l degerlendirme** (Pillar C): Gün/Hafta/Ay/Yıl review ceremonies (book question sets) + %1 compound SVG viz + AI summary. ISO-week keys.
- **10m engeller** (Pillar D): ENGELLER data (6 Perde/6 Zehir/7 Tuzak w/ panzehir) lives in `10h`; öz-tanı ranks via depth/foundations + resistanceLog; bridges to Sefer (`startSeferForBoss`) + Geçiş Alanı card (personSeed).
- **10n siginak** (Başarı Günlüğü / "Dinlenme Alanı", added 2026-05-30): full `.view#siginak-view`, calm achievement journal where the user writes past wins date-by-date and re-reads them. Entry = `{id,date,title,text,impact,created_at}`; date-grouped list (newest→oldest) w/ TR calendar chips; "zengin" stat strip = real data: `streak` pulled from `window.getGecisAlaniStats()`, plus total mühür + distinct days derived from entries. **Etki Puanı** (1–5, "olayın hayatındaki yeri"): `IMPACT_LABELS` {1 Küçük an…5 Hayatımı değiştirdi}, form picker via `sgSetImpact(n)` (module var `_pendingImpact`, default 3), `_impactMeter()` renders ◆ meter per entry; `awardElmas(2+impact,'siginak')` so high-impact memories pay more. **Mum/alev SVG** (lifted from user's "Sığınak/Dinlenme" design export, radialGradient id renamed per-instance: `sg-flame-grad`/`-sm`) in hero glyph + mini on Bugün card; `.sg-flame-outer/-inner` get CSS `sg-flicker` animation (respects prefers-reduced-motion). Funcs `sgAdd/sgDelete/sgSetImpact/getSiginakStats/loadSiginakView`. switchView uses `window.loadSiginakView?.()` (NOT a static import, to avoid circular dep). Entry point: `.ws-siginak-card` on Bugün view (before Günün Düşüncesi). CSS `css/parts/siginak.css`. NOTE: pre-auth, SafeStorage writes go to an in-memory cache only (persists to localStorage post-auth) — verifying via preview shows entries surviving in JS memory but no `etw_siginak_v1_*` localStorage key until logged in.
State: `js/state/w2.js` (`_gecisAlani`, `_selfDialogue`, `_reviews`, `_siginak`). Init hooks (gaInit/skInit/rvInit/sgInit) in `03-auth-shell.js` after `personalizationLoad()`. Entry points: Bugün view (ga-bugun-card + ws-ritual-row + ws-siginak-card) and Hasımlar view (eng-entry-btn). See [[build-source-convention]].
