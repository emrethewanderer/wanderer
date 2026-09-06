---
name: mod-sistemi-plani
description: 2026-07-12 mod sistemi analizi + UYGULAMA TAMAM (FAZ 0-5); Omurga+Kartuş mimarisi + Mod Nabzı telemetri + Mod Pusulası UI; 719 vitest
metadata: 
  node_type: memory
  type: project
  originSessionId: 32c4ccd0-df4b-4be1-bcaa-72a4ddbc4020
---

Mod sisteminin uçtan uca analizi yapıldı VE 6 fazın tamamı aynı oturumda uygulandı (2026-07-12, Fable 5). Karar: sıfırdan kurguya gerek yoktu — hibrit mimari (regex hint → LLM `[MOD:xxx]` kararı → streaming parse → rozet/flash/aura/balon → etkililik geri beslemesi → %80 denge) sağlamdı, evrimsel plan izlendi. Plan dosyası: `.claude/plans/mod-sistemi.md` — **TÜM FAZLAR TAMAM**, 719 vitest yeşil, build temiz.

**Sistemin haritası (değişmeyen omurga):** 6 mod `AI_MODES` (config.js) = soft/direct/reflective/celebrate/pattern/depth. Karar zinciri: `updateAIMode` (00-config-tracking.js, öncelik explicit>pattern≥4msg>depth≥2>celebrate>soft>direct>reflective) → `buildModeSelectionGuide` → LLM tag → `createModeAwareChunkHandler` → `applyLLMMode`.

**Neler değişti (FAZ 0-5):**
- **FAZ 0-1:** ölü kod temizliği (parseModeFromResponse, MODE_INSTRUCTIONS, eski mode-pills) + gerçek bug fix'leri: TOKEN_LIMITS.depth/pattern artık gerçekten kullanılıyor (max ile ctx_mode), tag gelmezse `applyLLMMode(S._modeHint)` fallback (rozet bayat kalmıyor), `_modeHistory` artık 03-auth-shell boot hydrasyonunda geri kuruluyor (reload'da kaybolmuyor), `MODE_TEMPS` tablosu, soft yanıtlar da mode class alıyor.
- **FAZ 2:** tests/00-mode-system.test.js (49 test) + 01-prompts-modes.test.js'e +24 test — mod çekirdeği artık sıfır değil, tam kapsamlı.
- **FAZ 3 (en büyük değişiklik):** `prompt.mode.guide` (tek ~15.5K char TR belge) → `prompt.identity.core` + `prompt.mode.protocol` + 6× `prompt.mode.card.<mode>` (12 yeni TR+EN anahtar, Node script ile programatik/verbatim bölündü). `buildModeSelectionGuide` artık yalnız hint+aktif mod kartuşunu (≤2) enjekte ediyor. PROMPT_VERSION 4.0.0. **Gerçek ölçüm düzeltmesi:** ilk tahmin "%45-55 toplam azalma" yanlıştı — identity.core guide'ın ~%70'i ve sabit kalıyor; asıl kazanç mod-talimatı diliminde ~%52 (tek-kart tipik durumda). ⚠️ **ELLE KRİTİK:** Supabase persona_directives'te eski `prompt.mode.guide` override'ı varsa artık okunmuyor — Emre kontrol etmeli.
- **FAZ 4:** Mod Nabzı telemetrisi — 00f `wtLogMode()` (usage_events'e kind='mode' satırı) + 13q Gözlemevi'nde yeni kart (mod dağılımı, hint↔LLM uyum%, tag-kayıp uyarısı) + 09d haftalık damıtmaya `getModeEffectivenessScores()` özeti. **Düzeltme:** "yeni migration YOK" tahmini de yanlıştı — admin cross-user aggregate yalnız RPC'den okunabiliyor (RLS owner-only), migrations/033'e `mode_pulse` eklendi. ⚠️ **ELLE:** Emre migrations/033'ü SQL editöründe yeniden çalıştırmalı (CREATE OR REPLACE, idempotent).
- **FAZ 5:** Mod Pusulası — rozet tıklaması artık showToast değil, tören-kalitesinde mini sheet (`.mpc-portal/.mpc-sheet`, announce-sheet ailesi): 6 mod nokta-halkası (5 önceden hiç kullanılmamış `--mode-*-color` CSS değişkenine ilk gerçek görevi verildi) + yolculuk çizgisi. Sohbet içi `.mode-switch-divider` yalnız büyük geçişlerde (↔direct, →depth, →pattern), görsel-yalnız (kalıcı değil). Test yazarken gerçek bug yakalandı: kullanıcıya görünen metinde yanlışlıkla küçük-harf LLM-ipucu etiketi kullanılmıştı, büyük-harf UI etiketiyle (`t('mode.X')`) düzeltildi.

**Yan bulgu:** modes.css'te `.mp-*` önekli tamamen ölü (referanssız) eski bir "kapı" ekranı CSS'i bulundu — yeni Mod Pusulası `.mpc-*` önekiyle çakışmadan kuruldu; temizlik ayrı arka plan görevi olarak flagled (task_1bd600d0).

İlgili: [[gozlemevi-kullanim-nabzi]] (Mod Nabzı kartı buraya eklendi), [[emre-sesi-yonlendirme]] (16d ES_FEATURED 8 yeni odaklı anahtar), [[tum-diller-native-plani]] (kartuş mimarisi çeviri birimlerini küçültür), [[yuzlesme-kacis-kaldirma]] (sunucu llm-chat personası hâlâ eski — K3 kimliği bilinçli client'ta tuttu).
