---
name: llm-saglayici-llmapi
description: LLM sağlayıcı = LLMAPI (OpenAI-uyumlu); base api.llmapi.ai; her yerde deepseek-v4-flash; secret LLM_API_KEY
metadata: 
  node_type: memory
  type: project
  originSessionId: 930a58aa-5927-47c5-bf6d-fd184a6cc826
---

Wanderer'ın LLM sağlayıcısı **OpenRouter DEĞİL, LLMAPI** (https://llmapi.ai, OpenAI-API uyumlu).

- **Base:** `https://api.llmapi.ai` (llm-chat fonksiyonunda `LLMAPI_BASE`).
- **Sohbet ucu:** `https://api.llmapi.ai/v1/chat/completions`.
- **Görsel ucu (hayal-gorsel):** UCA-DUYARLI dual-format (2026-06-21). URL `/images/generations` içeriyorsa OpenAI biçimi (`{prompt}`→`data[].b64_json`), `/chat/completions` ise OpenRouter biçimi (`{modalities}`→`message.images[]`); yanıt iki biçimden de okunur. Anahtar uca göre seçilir (OpenRouter ucu→OPENROUTER_API_KEY, LLMAPI ucu→LLM_API_KEY; IMAGE_API_KEY ezer). **ŞU AN:** `google/gemini-3-pro-image` yalnız OpenRouter'da → IMAGE_API_URL=OpenRouter chat + OPENROUTER_API_KEY secret. LLMAPI'ye gelince **IMAGE_API_URL secret'ını sil** → LLMAPI default'una düşer, yeniden deploy YOK.
- **Anahtar secret adı = `LLM_API_KEY`** (Emre 18 Nisan'da ekledi). send-push + hayal-gorsel artık önce `LLM_API_KEY`'i, yoksa `OPENROUTER_API_KEY`'i okur. `LLM_API_URL` secret'ı da varsa otomatik kullanılır (proje geneli ortak havuz).
- **Model: her yerde `deepseek-v4-flash`** (Emre kararı 2026-06-21). config.js CHAT_MODEL + SUMMARY_MODEL, send-push LLM_MODEL default hepsi buna çekildi. DeepSeek v4 artık **native vision** destekliyor → llm-chat'te görselde gemini'ye geçişe gerek yok (SETUP-LLM-CHAT.md güncellendi).
- **Görsel modeli** ayrı (DeepSeek görsel ÜRETMEZ): `IMAGE_MODEL` default `google/gemini-3-pro-image`.

Edge function deploy: Docker gerekmez, Emre web editöründen yapıştırıp deploy ediyor; verify-jwt KAPALI olması gerekenler revenuecat-webhook + send-push. [[persona-server-side]] [[sohbet-reasoning-fix]] [[web-push-bildirim-motoru]] [[hayal-gorsel-widget]]
