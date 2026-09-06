---
name: ses-katmani-dikte-okuma
description: "Faz 3.1+3.2 — 10z ses katmanı: dikte (Web Speech) + sesli okuma (speechSynthesis); vision (3.3) bekliyor"
metadata: 
  node_type: memory
  type: project
  originSessionId: ea075900-ba7a-4fde-b0b6-c86724e50dec
---

LLM-boşluk sprinti Faz 3.1+3.2 (2026-06-10) tamamlandı; **10z-w2-ses.js** yeni modül, tamamen client-side (sunucu değişikliği yok).

- **Dikte**: `sesMicToggle(targetInputId, btn)` — composer (`#cl-mic-btn`→`chat-input`) + Ritüel Kartı (`#ic-mic-btn`→`ic-textarea`). Web Speech API (`webkitSpeechRecognition`), `continuous+interim`, dil `_BCP47[getCurrentLanguage()]`; interim metin canlı input'a akar (`_baseText` + final + interim). Desteklenmeyen tarayıcıda `.ws-mic-btn` boot'ta gizlenir. `sendMessageHooks.before` → gönderimde dikte otomatik durur (taban metin bayatlaması).
- **Sesli okuma**: coach footer hoparlörü (06 buildMsgFooterHTML, Kopyala'dan sonra) → `sesSpeakMessage(btn)`; markdown soyulur (`_plainForSpeech`), dil-uyumlu voice seçimi, rate 0.95/pitch 0.92 (Wanderer temposu); aynı butona ikinci dokunuş durdurur. v2 fikri: premium gerçek "Wanderer sesi" (ElevenLabs/OpenAI TTS edge function) — yapılmadı.
- CSS chat.css `?v=24`: `.ws-mic-btn` + `.listening`/`.speaking` micPulse; composer'da mic `margin-left:auto` ile gönder butonuna komşu (`+ .send-btn { margin-left:0 }`).
- Expose modül içinde: `window.ses*`. main.js'te side-effect import (09c'den sonra).
- **Faz 3.3 (vision/görsel ekleme) YAPILMADI** — llm-chat edge function değişikliği gerektirir (kaynak repo'da değil, elle deploy); plan: composer + butonu → Supabase Storage → `images[]` parametresi → vision modeli; vision yönergesi persona gibi sunucuda. Sonraki sprint: Faz 4 (tool-use + Çalışma Kağıdı artifact + kitap kaynakçası) veya 3.3.
- Gözlem: boot'ta Benlik Kartı onboarding kapısı bazen yeniden beliriyor (confirmed=false olabilir; mig 011 uygulanmış mı kontrol edilmeli).
