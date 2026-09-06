---
name: kota-motoru
description: "13m Kota Motoru — Claude tarzı çift kota (5s pencere + hafta); mig 018+019 ELLE; premium shimmer halkası; Ultra Armağanı (Üç Mühür → +9 mesaj/gün)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7f8ebeb6-4457-4d3c-b00f-6af0e77faed7
---

13m-kota.js (2026-06-12): Wanderer ücretsiz katmanına Claude Code'un kota modeli.
**5 saatlik pencere** (ilk mesajla açılır, 5 saatte tamamen yenilenir, varsayılan 15 mesaj)
+ **haftalık tavan** (7 günde bir, varsayılan 75). Premium ([[magaza-aboneligi]]:
Studio/deneme/admin) sınırsız.

**Why:** ChatGPT free ~10/5s, Claude free ~15-40/5s + haftalık, Gemini ~30/gün (Haziran 2026).
15/5s bir derin seansa yeter; 75/hafta günlük adanmışı 5. günde Studio duvarına getirir.

**How to apply:**
- Backend: mig **018_kota_motoru.sql + 019_ultra_armagani.sql ELLE** — quota_settings
  (admin "Ayarlar": s-kota-5h/s-kota-week/s-kota-ultra) + quota_windows (TEK satır)
  + quota_status/quota_consume(p_day)/quota_bonus_grant(p_day) RPC. 019, 018'in
  quota_consume() imzasını DROP edip default parametreli tek imzayla değiştirir.
- Client: 06 sendMessage → `ktGate()`; RPC yoksa yerel günlük sayaç fallback
  (free_message_limit + ultra günde +9). Duvar: 'window' yumuşak, 'week' Emre-sesi.
  **429 → err.quota** bayrağı (04) → 06 _appendErrorWithRetry duvar çizer (chip değil).
  Geçici ağ hatası motoru KAPATMAZ (_missingFn ayrımı: 42883/PGRST202 = kalıcı fallback).
- **PREMIUM halka (2026-06-12 redesign):** çember gizlenmez — Geçmiş Günler
  shimmer dili (text-dim zemin + gezen altın/lapis parıltı, ktShimmer 8s, ch-label-shimmer
  ile aynı ritim); dokununca kt-sheet premium varyantı (∞ shimmer halkası + "Sınırsız"
  satırları). _setRingMode svg↔kt-prem değiş tokuşu; _ensureSheet(mode) dataset.mode.
- **ULTRA ARMAĞANI:** Üç Mühür ([[ultra-seri-uc-muhur]]) aynı gün → 10u _maybeUltra →
  ktGrantUltraBonus → quota_bonus_grant (idempotent/gün, dolum yenilenmez). Pencereler
  kapanınca bonus tüketilir (reason='bonus', pencere sayaçlarına dokunmaz); mini çember
  lapis kt-bonus moduna geçer; günde bir toast; awaken modalında "✶ ARMAĞAN +9" satırı;
  usRunDaily güvenlik ağı yeniden dener. Gün anahtarı = client localISODate (sunucu ±1 gün,
  yoksa Europe/Istanbul).
- Composer redesign (llm-shell.css): 22px eşik kartı, üst altın↔lapis kıl (::before,
  odakla genişler), hayalet ayak araçları, dövülmüş-altın gönder mührü.
- GOTCHA: ktInit 03-auth-shell post-auth'ta; premium'da RPC'ye hiç dokunmaz.
  quota_windows'a yazma yalnız RPC'den. Dev: `window.ktPreview({...bonus_day,bonus_left})`.
