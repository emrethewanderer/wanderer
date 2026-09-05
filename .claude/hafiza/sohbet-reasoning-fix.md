---
name: sohbet-reasoning-fix
description: "deepseek-v4-flash reasoning modeli — boş yanıt kökü, token payı + boş-yanıt fallback'i, ~25 sn gecikme"
metadata: 
  node_type: memory
  type: project
  originSessionId: 606280d7-3a2a-457e-886a-6bf00a3f49b9
---

llm-chat edge function'ının (repoda YOK) primary modeli `deepseek-v4-flash` bir REASONING modeli (2026-06-12 itibarıyla): görünmez `reasoning_content` token'ları `max_tokens` bütçesinden düşer. Mod limitleri (TOKEN_LIMITS 280–700) reasoning bitmeden dolunca `content` hiç gelmiyordu → Sohbet'te boş asistan balonu + DB'ye boş satır.

**Why:** Edge fn repoda olmadığından bu davranış koddan görülemez; client sondasıyla doğrulandı (kısa istemde 300 token bile yetiyor, gerçek persona+bağlam prompt'unda reasoning uzayıp bütçeyi yiyor). Yanıt gecikmesi ~25 sn — modelin doğası.

**How to apply:** 04-llm-hero-history callLLM: (1) `/deepseek/i` modelde `max_tokens += 1500` (tavan 4000) reasoning payı; (2) stream/non-stream boş content → `_retryEmpty` ile LLM_FALLBACK_CHAIN'deki sonraki modele (gemini-2.0-flash) otomatik geçiş; (3) 06 _runLLMTurn: boş reply mühürlenmez/persist edilmez, hata fırlatır (tekrar dene chip'i). Model değişirse bu yamalar zararsız kalır. Gecikme şikâyeti gelirse primary'yi reasoning'siz hızlı modele almak asıl çözüm — [[odak-modelleri]] Stüdyo max_tokens ayarı da bütçeyi ezebilir (fmActiveParams).
