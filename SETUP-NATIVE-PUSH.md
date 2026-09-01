# SETUP — Native Push (APNs / FCM)

Web Push iOS WKWebView'de çalışmaz. Native (App Store / Google Play) dağıtımda
kullanıcıyı uygulama **kapalıyken** geri çağırmak için APNs (iOS) ve FCM
(Android) gerekir. Kod tarafı hazır; aşağıdaki adımlar **ELLE** yapılır.

## Kod tarafı (repoda hazır — deploy gerekir)

| Parça | Dosya | Durum |
|---|---|---|
| Native köprü (token al) | `js/parts/00e-native-push.js` | ✅ bundle'da |
| Token persist + ayarlar dalı | `js/parts/10x-w2-bildirimler.js` | ✅ bundle'da |
| DB sütunları | `migrations/000_wanderer_schema.sql` | ⬜ ELLE çalıştır |
| FCM gönderim dalı | `supabase/functions/send-push/index.ts` | ⬜ ELLE deploy |

Köprü, plugin'e **runtime** erişir (`window.Capacitor.Plugins.PushNotifications`)
— web bundle'a ESM bağımlılığı eklenmez, web'de tamamen no-op.

---

## 1. DB migration (Supabase SQL editöründe)

`migrations/000_wanderer_schema.sql` içeriğini çalıştır. `push_subscriptions`'a
`platform` + `native_token` ekler, `p256dh/auth` NOT NULL kısıtını gevşetir.

## 2. Capacitor plugin'i kur + senkronla  ✅ (yapıldı 2026-06-29)

ÖNEMLİ: Sürümü `@^8`'e SABİTLE — yoksa npm en güncel (uyumsuz) sürümü çekip
`ERESOLVE` hatası verir. Capacitor core 8 → plugin'ler de 8 olmalı.

```bash
npm i @capacitor/push-notifications@^8 @capacitor/keyboard@^8 @capacitor/status-bar@^8
npx cap sync
```

Kurulu: push-notifications 8.1.1, keyboard 8.0.5, status-bar 8.0.2. `cap sync`
8 plugin'i hem iOS (Package.swift/SPM — CocoaPods gerekmez) hem Android'de tanıdı.

## 3. Firebase projesi + FCM (iOS dahil)

1. Firebase Console → yeni proje (veya mevcut).
2. **Android app** ekle (paket: `com.emretransformation.wanderer`) →
   `google-services.json` indir → `android/app/` içine koy.
3. **iOS app** ekle (bundle id aynı) → `GoogleService-Info.plist` indir →
   Xcode'da `App` target'ına ekle.
4. Firebase → Project Settings → **Service accounts** → "Generate new private
   key" → inen JSON'u sakla (Adım 6'da secret olacak).

## 4. iOS APNs (Apple Developer)

1. Apple Developer → Keys → **+** → "Apple Push Notifications service (APNs)"
   key oluştur → `.p8` indir (Key ID + Team ID not al).
2. Firebase → Project Settings → Cloud Messaging → **Apple app configuration**
   → APNs Auth Key yükle (.p8 + Key ID + Team ID).
3. Xcode → App target → Signing & Capabilities → **Push Notifications** +
   **Background Modes → Remote notifications** capability'lerini ekle.

## 5. Android (FCM)

`google-services.json` (Adım 3) yeterli. Bildirim ikonu istersen
`android/app/src/main/res` altına `ic_stat_notify` ekle (opsiyonel —
send-push artık özel ikon adı GÖNDERMİYOR, sistem varsayılanı kullanılır).

## 6. send-push secret'ı + deploy

Firebase servis hesabı JSON'unu (Adım 3.4) tek satırlık secret olarak ekle:

```bash
supabase secrets set FCM_SERVICE_ACCOUNT="$(cat service-account.json)"
supabase functions deploy send-push
```

`FCM_SERVICE_ACCOUNT` yoksa native gönderim **sessizce atlanır** (web push
etkilenmez) — kademeli geçiş güvenli.

## 7. Doğrulama

1. Native build'i gerçek cihaza kur (`npx cap run ios` / `android`).
2. Ayarlar → Bildirimler → aç → iOS izin diyaloğu çıkmalı.
3. `push_subscriptions`'ta `platform`='ios'/'android' + `native_token` dolu satır.
4. Ayarlar → "Test bildirimi" → cihaza push düşmeli (uygulama kapalıyken de).

---

## Mimari notlar

- **Tek tablo:** native token'lar web abonelikleriyle aynı `push_subscriptions`
  tablosunda; `platform` ayırır. `send-push.sendToUser` her satırı tipine göre
  yönlendirir (native → FCM v1, web → VAPID web-push).
- **FCM → APNs köprüsü:** iOS'a ayrı APNs entegrasyonu yazmaya gerek yok; FCM
  HTTP v1 `apns` payload'ıyla Apple'a iletir.
- **Ölü token temizliği:** FCM `UNREGISTERED`/404 → satır otomatik silinir
  (web push'taki 404/410 temizliğinin ikizi).
- **Engagement/öncelik motoru** değişmez — aynı `user_engagement` + freq-cap
  + sessiz saat + kişisel LLM metni native'de de geçerli.
