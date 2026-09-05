---
name: magaza-aboneligi
description: "ESKİ tek-tier model (2026-06-11) — entitlement 'studio', 30g otomatik trial; 2026-07-04 [[fiyatlandirma-plani-v2]] ile GEÇERSİZ (Free/Pro/Max, otomatik trial kaldırıldı). Capacitor/RevenueCat/build.sh temel bilgisi hâlâ geçerli"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3416e288-f925-4124-8520-caab10e2f076
---

Mağaza aboneliği mimarisi (2026-06-11, [[wanderer-studio-marka]] modelinin uygulaması):

- **Shopier KALDIRILDI.** Ödeme yalnız App Store/Google Play: Capacitor 8 (`android/` + `ios/` klasörleri oluşturuldu, iOS SPM — CocoaPods yok) + `@revenuecat/purchases-capacitor`. Entitlement id: **`studio`**; ürün: `studio_monthly`.
- **Akış:** native `startPayment()` → `Purchases.purchasePackage` → RevenueCat webhook'u → `supabase/functions/revenuecat-webhook` (deploy `--no-verify-jwt`, secret `REVENUECAT_WEBHOOK_SECRET`) → `profiles.is_premium/premium_until/store_platform` → mevcut `startPremiumWatch` Realtime'ı client'a düşürür. Web'de `startPayment` mağaza-yönlendirme modalını açar (payment-overlay) — web'de satış yok.
- **Trial:** `profiles.trial_ends_at` DB default `now()+30 gün` (mig **014**, ELLE uygula; `billing_events` audit tablosu dahil). Client: `S.isStudioSub` (gerçek abonelik) + `S.isTrial` ayrı; `S.isPremium = sub || trial || admin` (03 initApp). premium-indicator deneme gün sayacı gösterir.
- **Günlük mesaj limiti:** 06 sendMessage artık kümülatif `message_count` değil `etw_daily_msgs_{localISODate()}` SafeStorage sayacı (varsayılan 20/gün, `settings.free_message_limit` ile ezilir) — "Claude free" modeli.
- **Doldurulacak placeholder'lar:** `RC_API_KEY_APPLE/GOOGLE` (08), `STORE_URL_APPSTORE` + payment-overlay'deki App Store linki (app id). Tüm manuel adımlar **SETUP-STORE-BILLING.md**'de.
- 03↔08 dairesel bağımlılık konvansiyonu: 03, 08'e `window.initStoreBilling?.()` ile erişir; `initPricing` artık main.js'te expose (eskiden eksikti — FX fiyat hiç çalışmıyordu).
- appId: `com.emretransformation.wanderer`. Bu Mac (macOS 12) App Store teslimi için eski kalabilir; Android engelsiz.
