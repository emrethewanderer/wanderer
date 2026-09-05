---
name: sohbet-cekirdek-kontrol
description: "Faz 1+2.1 — durdur/yeniden üret/tekrar dene + kayan bağlam özeti (06 refactor, _runLLMTurn çekirdeği)"
metadata: 
  node_type: memory
  type: project
  originSessionId: ea075900-ba7a-4fde-b0b6-c86724e50dec
---

LLM-boşluk analizi sprinti Faz 1+2.1 (2026-06-10) tamamlandı; sohbet çekirdeği yeniden yapılandırıldı.

- **_runLLMTurn(text, {contradictionMsg})** (06-summary-chat.js): sendMessage/regenerateMessage/retryLastTurn ortak LLM turu çekirdeği. Kullanıcı mesajı persist edildikten SONRA çağrılır; hata fırlatır, çağıran hata balonu + chip basar.
- **Durdur**: `S._llmStreaming` + `S._llmAbort` (AbortController) → #send-btn `stop-mode` sınıfıyla kare ikona döner; sendMessage başında streaming ise stopGeneration'a sapar. Kısmi yanıt korunur (`_streamedRaw`), hiç chunk yoksa balon silinir. callLLM artık `signal` parametresi alır (04); abort fallback zincirini tetiklemez.
- **Yeniden üret**: coach footer'da ↻ (buildMsgFooterHTML, Kopyala'dan sonra). Yalnız son yanıt; fmswitch `role:'system'` satırları atlanarak son asistan kaydı splice edilir. Eski yanıt DB'den `delete().eq(content)` ile düşürülür — **chat_history'de client DELETE RLS politikası yoksa sessizce kalır, Supabase'de kontrol edilmeli** (tablo migrationlarda yok, dashboard'da kurulu).
- **Tekrar dene**: hata balonları `data-llm-error` ile işaretli; `#llm-retry-chip` → retryLastTurn (kullanıcı mesajı yeniden insert edilmez).
- **Kayan bağlam özeti**: `CHAT_CONTEXT_WINDOW = 16` (eski 6); pencereden çıkan ≥6 mesaj birikince SUMMARY_MODEL ile arka planda sıkıştırılır → `S._rollSum` (sessId-anahtarlı, kendi kendine sıfırlanır) → buildContextPrompt `<session_memory>` bölümü (01; extras.sessionMemory). Prompt anahtarları: `prompt.rollsum.system/user/ctx_header` (16b core, TR+EN).
- window expose'lar 06 içinde: regenerateMessage/retryLastTurn/stopGeneration (main.js'e dokunulmadı). CSS: chat.css `?v=22` (stop-mode + llm-retry-chip).

**Why:** 6 mesajlık pencere "gerçek zihin" yanılsamasını kırıyordu; durdur/yeniden üret modern LLM ürün refleksleri.
**How to apply:** Yeni LLM-turu varyantları (ör. tool-use, sesli giriş) _runLLMTurn'ü çağırmalı, sendMessage'ı kopyalamamalı. Sonraki fazlar: [[llm-bosluk-analizi-plani]].

**GÜNCELLEME (2026-08-18):** Çekirdek bu tarihte sekiz fazlık bir iç
çalışmadan geçti — mesaj kimliği, dürüst kalıcılık, gönderim kuyruğu, TTFT
ölçümü, bütçeli pencere, deko-ledger, sahne kuyruğu. `CHAT_CONTEXT_WINDOW`
artık sabit değil ÜST SINIR (bkz. `_pencereSec`). Ayrıntı:
[[sohbet-cekirdegi-ic-calisma]].
