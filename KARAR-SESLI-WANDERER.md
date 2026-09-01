# KARAR — Sesli Wanderer (TTS + Sesli Sohbet)

> 2026-06-11'de bilinçlenerek ertelenen "Emre'nin sesi" kararının araştırma
> dosyası (2026-07-08). Kod yazılmadı — bu belge sağlayıcı/maliyet/mimari
> seçeneklerini sayılarla önüne koyar. Karar Emre'nin.

---

## 1. Bugünkü durum

- **Okuma:** 10z `speechSynthesis` (tarayıcı sesi) — bedava ama robotik,
  cihazdan cihaza değişir, marka sesi yok.
- **Dikte:** Web Speech API (10z) — çalışıyor, değişmesine gerek yok.
- **Emsal mimari:** `hayal-gorsel` Edge Function (Studio gate + secret sunucuda
  + kota). Ses için birebir aynı kalıp kullanılabilir: `ses-okuma` edge fn.

## 2. Kullanım varsayımı (maliyet hesabının tabanı)

Aktif bir kullanıcı: ~30 seans/ay × 3 okuma × ~700 karakter ≈ **63K karakter/ay**
(≈ 70 dakika ses). Türkçe UTF-8'de ~1.2 bayt/karakter (Fish fiyatı bayt bazlı).

## 3. Sağlayıcı karşılaştırması

| Sağlayıcı | Klon? | TR kalitesi | Fiyat | 1 kullanıcı/ay | 1000 kullanıcı/ay |
|---|---|---|---|---|---|
| **OpenAI gpt-4o-mini-tts** | ❌ (13 hazır ses, tonu yönlendirilebilir) | İyi (50+ dil) | ~$0.015/dk | **~$1.05** | ~$1.050 |
| **Fish Audio s2-pro** | ✅ 10 sn örnekle | Teyit gerekli (13 dil — TR listede mi test et) | ~$15/1M bayt | ~$1.15 | ~$1.150 |
| **Azure Personal Voice** | ✅ (onay gerektiren kapalı erişim) | Güçlü TR altyapısı | $24/1M kr + profil $0.6/ay | ~$1.50 | ~$1.500 |
| **ElevenLabs (Flash/Turbo)** | ✅ Professional Clone (Creator $22/ay+) | **Endüstri lideri** (29+ dil, TR dahil) | ~$50/1M kr (overage) | ~$3.15 | ~$3.150 |

Notlar:
- ElevenLabs kalite lideri ama **~3× pahalı**; klon için ayrıca Creator
  aboneliği (klonun "evi", $22/ay sabit).
- Azure Personal Voice **başvuru/onay** ister; kurumsal süreç.
- Fish Audio en ucuz klon yolu ama TR klon kalitesi **dinlenmeden karar verme**.
- **LLMAPI (mevcut sağlayıcı):** OpenAI-uyumlu — `/v1/audio/speech` proxy'liyor
  mu panelden KONTROL ET. Ediyorsa sıfır-yeni-vendor yolu (görselde
  `/v1/images/generations` emsali zaten var).

## 4. Mimari seçenekler

**A) Okuma yükseltmesi (önerilen ilk adım — düşük efor)**
Coach yanıtındaki 🔊 butonu speechSynthesis yerine `ses-okuma` edge fn'den
mp3 stream alır. Studio gate + günlük okuma kotası (13m kalıbı). Klonsuz
başlanabilir (OpenAI "warm" ses + yönlendirme: "sıcak, ağırbaşlı, yol arkadaşı
tonu"). ~1-2 günlük iş; SETUP-SES.md ELLE (secret + deploy).

**B) Sesli sohbet modu (orta efor)**
Dikte (var) → LLM (var) → A'nın stream TTS'i + otomatik okuma + "eller serbest"
UI (mikrofon halkası). A bittiyse üstüne ~2-3 gün.

**C) Gerçek zamanlı konuşma (Realtime API) — ERTELENSİN**
Kesintili konuşma/barge-in ister; ayrı sağlayıcı ekonomisi (~$0.06+/dk),
mevcut sohbet çekirdeğiyle (06 _runLLMTurn) örtüşmez. Bu tur kapsam dışı.

## 5. Önerim (iki fazlı)

1. **Faz 1 — hemen:** A mimarisi + OpenAI gpt-4o-mini-tts (ya da LLMAPI
   proxy'liyorsa o). En ucuz, en hızlı; "Emre'nin sesi" değil ama "Wanderer'ın
   sıcak sesi" olur. Kota: Studio'ya günde 10 okuma.
2. **Faz 2 — klon testi:** ElevenLabs Creator'a 1 ay gir ($22), Emre'nin
   sesinden Professional Clone çıkar, TR kalitesini Fish Audio kloner ile
   **yan yana dinle**. Kalite/maliyet kararını sese bakarak ver:
   - ElevenLabs kazanırsa: okuma başına maliyet 3× — Studio-üstü bir "Emre'nin
     Sesi" premium dokunuşu olarak sınırlı yüzeyde (ör. Günün Mührü + Mektup).
   - Fish yeterliyse: tüm okumalar klonlu, bütçe OpenAI ile aynı düzeyde.

## 6. ELLE adımlar (karar sonrası)

- [ ] LLMAPI panelinde `/v1/audio/speech` desteğini kontrol et
- [ ] Seçilen sağlayıcıda hesap + API anahtarı → Supabase secret
- [ ] (Klon yolu) Emre'den 3-5 dk temiz kayıt (Professional Clone için)
- [ ] `ses-okuma` edge fn deploy + SETUP-SES.md checklist

## Kaynaklar

- [ElevenLabs Pricing](https://elevenlabs.io/pricing/api) · [2026 plan dökümü](https://www.cekura.ai/blogs/elevenlabs-pricing) · [Voice Cloning](https://elevenlabs.io/voice-cloning)
- [OpenAI TTS fiyatlandırma](https://developers.openai.com/api/docs/pricing) · [gpt-4o-mini-tts ($0.015/dk) analizi](https://tokenmix.ai/blog/gpt-4o-mini-tts-cheapest-tts-api-2026) · [tts-1 vs gpt-4o-mini-tts](https://texttolab.com/blog/openai-tts-pricing)
- [Azure Speech pricing](https://azure.microsoft.com/en-us/pricing/details/speech/) · [Azure TTS 2026 fiyat analizi](https://texttolab.com/blog/azure-text-to-speech-pricing)
- [Fish Audio pricing](https://docs.fish.audio/developer-guide/models-pricing/pricing-and-rate-limits) · [Fish voice clone](https://fish.audio/voice-clone/) · [Professional cloning](https://fish.audio/blog/professional-voice-cloning/)
