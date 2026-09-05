---
name: fiyatlandirma-plani-v2
description: "Fiyatlandırma v2 \"Kapılar ve Kilitler\" TAM UYGULANDI (2026-07-04, kod tarafı); ELLE adımlar SETUP-STORE-BILLING.md'de, henüz Emre tarafından deploy edilmedi"
metadata: 
  node_type: memory
  type: project
  originSessionId: d7f5a6ad-265e-4509-ac50-c834196383a1
---

Emre'nin fiyatlandırma planı (Wanderer Work/Wanderer Fiyatlandırma Planı.pages) Influence
temelli geliştirilip **"Wanderer Fiyatlandırma Planı v2.md"** yazıldı (2026-07-03),
sonra "Yapalım" onayıyla **koda tam uygulandı** (2026-07-04). Kod tarafı bitti;
mağaza/RC/migration deploy'u Emre'nin ELLE yapması gerekiyor — [[magaza-aboneligi]]
memory'sinin yerini bu alıyor (o eski tek-tier `studio` modelini anlatıyordu).

**Mimari karar — yeni tier enum yok:** mevcut `profiles.is_premium` (Pro-veya-üstü)
ve `is_premium_plus` (yalnız Max) bayrakları (017'den beri var, `requirePremium`/
`requirePremiumPlus`/`initDrawerPremiumGates`/kota motorunda zaten okunuyordu)
üstüne inşa edildi — Studio kapıları/drawer gate'leri hiç değişmedi.

**Kritik keşif:** 017_profiles_hardening.sql'deki `protect_profile_privileges_ins()`
trigger'ı `trial_ends_at`'ı HARDCODE `now()+30 gün` yazıyordu — yalnız kolon
default'unu kaldırmak yetmezdi, trigger'ın kendisi mig030'da güncellendi (yeni
alanlar da aynı korumaya eklendi: offer_a_deadline/has_used_offer_a/b/
has_cancelled_before/lapsed_at — yalnız service_role/webhook yazabilir).

Değişen dosyalar:
- `migrations/030_fiyatlandirma_v2.sql` (ELLE) — profiles alanları + trigger güncellemesi
  + quota_settings pro_daily_limit/pro_weekly_limit + quota_status/consume/bonus_grant
  tier-aware rewrite (_quota_tier: max/pro/free)
- `supabase/functions/revenuecat-webhook/index.ts` (ELLE deploy) — entitlement_ids→
  is_premium/is_premium_plus, has_used_offer_a/b, has_cancelled_before, lapsed_at
- `js/parts/13m-kota.js` — _isPrem artık Max-only; Pro capped kotadan geçer (aynı
  free kod yolu, sunucudan farklı sayılar); sheet 3 mod (free/pro/premium)
- `js/parts/08-trends-payment.js` — TAMAMEN yeniden yazıldı: pricingState() state
  machine, SKU kataloğu, startOfferA/B, openGateOverlay/openCancelIntent, eski
  $9 FX-tahmin sistemi (fetchPricingData/PRICE_USD) SÖKÜLDÜ (TRY sabit fiyat)
- `js/parts/03-auth-shell.js` initApp — yeni hesap artık FREE başlar (eski
  otomatik 30-gün-premium grant KALDIRILDI)
- `js/parts/10w-w2-odak-modelleri.js` — Free yalnız Öz (fmGetActiveId/fmSelectModel gate)
- `js/parts/10i-w2-hayal-alemi.js` — Pro 3/gün, Max 15/gün Hayal Görseli (localStorage sayaç)
- `_src.html` — #sub-view tamamen yeniden (Free/Pro/Max kart + Sadakat Kilidi +
  Kapı Aralık banner), yeni #gate-overlay (Kapı A/B) + #cancel-intent-overlay (Ayrılık Eşiği)
- `css/parts/shell.css` — yeni stiller (.sub-kapi-banner/.sub-lock-note/.sub-yearly-link/.gate-*)
- `js/parts/15b-i18n-dict-core.js` — TR+EN yeni t() anahtarları (sub.*/gate.*/kt.pro_sub vb.)
- `SETUP-STORE-BILLING.md` — v2 için tam yeniden yazıldı, ELLE checklist bu dosyada

**p() (Emre'nin Sesi) NOT kullanılmadı:** paywall metinleri t() (statik UI kopyası),
p() yalnız LLM koçun system prompt'una giden davranış talimatları için — llm-chat
edge function bu repoda değil, o yüzden dokunulamadı (mevcut açık risk, [[sistem-saglik-taramasi]]).

**Why:** Uygulama isteği ("Yapalım") üzerine tam sprint; Explore ajanı + kendi
recon'umla mevcut altyapı (is_premium_plus scaffolding, kota motoru, i18n zinciri)
haritalandı, sıfırdan yazmak yerine üzerine inşa edildi.
**How to apply:** Emre "deploy edelim" derse SETUP-STORE-BILLING.md'yi adım adım
takip et (mig030 SQL Editor'da, webhook deploy, RC entitlement/offering kurulumu,
App Store/Play ürün kataloğu). Kod tarafına DOKUNMA — hazır ve preview'da doğrulandı
(production build temiz, sub-view/gate-overlay/cancel-intent/model-lock görsel test edildi).
