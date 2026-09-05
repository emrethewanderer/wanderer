---
name: karar-emre-sesi-sonra
description: "Karar (2026-06-11) — gerçek ses (Emre klonu TTS) ertelendi; 2026-07-08 ARAŞTIRMA TAMAM: KARAR-SESLI-WANDERER.md repoda, sayılarla 2-fazlı öneri Emre'nin kararını bekliyor"
metadata:
  node_type: memory
  type: project
  originSessionId: 5d56cf54-236f-4e19-a917-d1850797c86a
---

2026-06-11 kararı: "Cool paketi" planından **gerçek ses** maddesi hariç tutuldu — Emre kendi sesini (klon TTS) Wanderer'ın sesi yapmak istiyor ama SONRA. Basılı-tut-konuş sesli sohbet modu da TTS'e bağımlı olduğu için bekliyor.

**2026-07-08 güncelleme (cool sprinti):** Araştırma yapıldı → repo kökünde **`KARAR-SESLI-WANDERER.md`**. Özet: OpenAI gpt-4o-mini-tts ~$0.015/dk (klonsuz, en ucuz/hızlı) · Fish Audio ~$15/1M bayt (10 sn örnekle klon, TR kalitesi TEST edilmeli) · ElevenLabs kalite lideri ama ~3× pahalı + Creator $22/ay · Azure Personal Voice onaylı-kapalı erişim. Önerilen: Faz 1 = `ses-okuma` edge fn + OpenAI "sıcak ses" (hayal-gorsel emsali, Studio gate + kota) · Faz 2 = ElevenLabs vs Fish klonu YAN YANA DİNLEYEREK karar. LLMAPI'nin `/v1/audio/speech` proxy'leyip proxy'lemediği panelden kontrol edilecek (ederse sıfır-yeni-vendor).

**Why:** Wanderer'ın imza sesi Emre'nin sesi olacak — kişisel marka + Studio'ya gate'lenebilir somut değer. [[wanderer-studio-marka]]

**How to apply:** Konu açıldığında önce KARAR-SESLI-WANDERER.md'yi aç. 10z ([[ses-katmani-dikte-okuma]]) hâlâ speechSynthesis; yükseltme Edge Function üzerinden ([[persona-server-side]] ile aynı gerekçe: secret sunucuda). Kota için 13m kalıbı ([[kota-motoru]]).
