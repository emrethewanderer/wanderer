---
name: geri-cagri-motoru
description: 13o Geri Çağrı Motoru — eski silence.pressure UI özelliğinin (rastgele 4 cümle) yerini alan in-session re-engagement; Kişiselleştirme Motoru (P1-P6) + bugünkü konuşmayı LLM ile tek kişisel davete dönüştürür. Push tarafına recent_thread ithafı ekledi.
metadata: 
  node_type: memory
  type: project
  originSessionId: 7fb9d8b1-3c7b-4105-95d6-0d377201383f
---

Eski `silence.hint_*` chip + `silence.pressure_*` rastgele 4 cümle özelliği TAMAMEN söküldü (DOM #silence-hint, CSS features.css/llm-shell.css kuralları, 13-extras silenceHint* fonksiyonları, 02-features-onboarding rastgele üretim bloğu, 15b TR core + ext tüm dillerde silence.hint_X/silence.pressure_X anahtarları). silence.night_* (Gece Nöbeti, 05-closure-parts) ve `prompt.silence.insight` (P-katmanı topic-avoidance analizi) AYRI özellikler, dokunulmadı.

**Yeni: 13o-geri-cagri.js (window.gc*)**
- Tetik: chat-view aktif (llm-home değil) + son turdan ≥150 sn (GC_SILENCE_MS override) + composer'da taslak yok + LLM stream yok + bu oturumda kullanıcı yazmış + 4 dk cooldown + oturum başına 2 fire tavanı.
- Bağlam: `buildPersonalizationPrompt('')` (Benlik/An/Kimlik + P1-P6 + Geçiş çalışması + Derinlik/Temeller) + S.chatHistory son 6 turn; bugün < 2 user mesajıysa S.allSessions'tan en yeni önceki gün eklenir (öncelik [[personalization-engine-layers]]).
- Çağrı: `callLLM` stream:false, max_tokens 120, temp 0.85; server persona + kitap RAG ekler. İtalik coach balonu (`_${text}_`, modeClass `mode-direct gc-reengage`, altın damar CSS aksanı). chat_history'ye persist eder. **messageCount'a SAYILMAZ**; kota duvarına çarpsa sessiz susar (sayaç tüketildiği için tekrar denemez).
- State: `_gcSilenceTimer`, `_gcLastFireMs`, `_gcLastFireSessId`, `_gcSessFires` (state/chat.js).
- Hook entegrasyonu: `02-features-onboarding#resetSilencePressure` thin wrapper → `window.gcSchedule()`; 13-extras chat hooks (appendMsg after / sendMessage before / streamFinalize / switchView) gc* delegate; chat-input focus+input → gcCancel.

**Push motoru zenginleştirmesi (send-push edge):**
- `loadContext()` artık `chat_history` son ~8 mesajı (son 10 gün) çekiyor → `ctx.recent_thread` (kronolojik string).
- `generateCopy()` `who` bloğuna "Son konuştuklarınız:" eklendi; instruction "generic 'bir süredir yoktun' yerine son konuya somut ithaf" kuralı. Quiet hours/freq-cap/fallback aynen korundu.
- **ELLE deploy:** `supabase functions deploy send-push` (Emre'nin sözleşmesi, [[web-push-bildirim-motoru]]).

Bağlantılı: [[personalization-engine-layers]], [[web-push-bildirim-motoru]], [[sohbet-cekirdek-kontrol]], [[kota-motoru]].
