# Mağaza Aboneliği Kurulumu v2 — "Kapılar ve Kilitler" (App Store & Google Play / RevenueCat)

İş modeli (bkz. `Wanderer Work/Wanderer Fiyatlandırma Planı v2.md`):
**Free** (yalnız Öz, sınırlı kota) · **Pro** 299₺/ay·2999₺/yıl (Sadakat Kilidi; liste 499₺)
· **Max** 999₺/ay·9999₺/yıl (Sadakat Kilidi; liste 1499₺). Giriş kapıları: İlk Kapı
(1₺ ilk ay, yalnız hesap açılışından 72 saat) ve Yedi Eşik (7 gün ücretsiz, hesap
başına 1 kez). Ödeme YALNIZ mağazalar üzerinden alınır. Tek doğruluk kaynağı:
RevenueCat webhook → `profiles.is_premium` (Pro-veya-üstü) / `is_premium_plus` (Max).

Kod tarafı TAMAMEN hazır (migration, webhook, client, paywall UI). Bu doküman
yalnız senin ELLE yapman gereken adımları listeler.

---

## 1) Veritabanı — ELLE uygula

Supabase SQL Editor'da sırasıyla:
1. `migrations/030_fiyatlandirma_v2.sql` (017 ve 018/019'un üzerine biner —
   önce onlar uygulanmış olmalı, zaten uygulanmışsa sorun yok)

Bu migration şunu yapar:
- `profiles`: `offer_a_deadline`, `has_used_offer_a`, `has_used_offer_b`,
  `has_cancelled_before`, `lapsed_at` kolonları
- `trial_ends_at`'ın eski "+30 gün otomatik" davranışı **kapatılır** — hem
  kolon default'u hem de 017'nin INSERT trigger'ı güncellenir. **Yeni hesaplar
  artık FREE başlar**, otomatik deneme almaz. Mevcut deneme süresi olan
  kullanıcılar süresi bitene dek onurlandırılır (dokunulmaz).
- `offer_a_deadline` yeni hesaplara INSERT trigger'ı tarafından otomatik
  `now()+72 saat` yazılır (tamper-proof — client bu alanı değiştiremez).
- `quota_settings`: `pro_daily_limit` (varsayılan 50), `pro_weekly_limit` (350);
  Free varsayılanları 15/75 → 10/40'a çekilir (yalnız hiç değiştirmemişsen).
- Kota RPC'leri (`quota_status`/`quota_consume`/`quota_bonus_grant`) tier'a
  göre davranır: Free 5s pencere, Pro 24s pencere, Max sınırsız.

**Grandfather kararı (ELLE, senin onayın gerekir):** Migration sonrası, şu an
`is_premium=true` olan TÜM mevcut aboneler otomatik **Pro** muamelesi görür
(`is_premium_plus=false`). Gerçekte Max seviyesinde olması gereken biri varsa:
```sql
update public.profiles set is_premium_plus = true where id = '<uid>';
```

## 2) Mağaza konsolları — ürün kataloğu

Aynı ürün ID'lerini HEM App Store Connect HEM Google Play'de oluştur:

| Ürün ID | Rol | Fiyat | Süre |
|---|---|---|---|
| `pro_monthly` | Pro aylık (kilit) — **İlk Kapı'nın SKU'su** | 299₺ | Aylık |
| `pro_monthly_t` | Pro aylık (kilit) — **Yedi Eşik'in SKU'su** | 299₺ | Aylık |
| `pro_monthly_list` | Pro aylık (liste) | 499₺ | Aylık |
| `pro_yearly` | Pro yıllık (herkese, kilit) | 2999₺ | Yıllık |
| `max_monthly` | Max aylık (kilit) | 999₺ | Aylık |
| `max_monthly_list` | Max aylık (liste) | 1499₺ | Aylık |
| `max_yearly` | Max yıllık (herkese, kilit) | 9999₺ | Yıllık |

**Neden iki Pro-aylık SKU'su (`pro_monthly` / `pro_monthly_t`)?** Apple/Google
bir ürüne yalnız TEK bir intro offer (deneme YA DA indirimli fiyat, ikisi
birden değil) bağlatır. 1₺ ilk-ay teklifiyle 7-gün-ücretsiz teklifi bu yüzden
ayrı SKU'lara ihtiyaç duyar — ikisi de aynı fiyata (299₺) satar, aynı `pro`
entitlement'ına bağlanır, kullanıcı ikisinden yalnızca BİRİNİ (hesap başına)
kullanabilir.

### App Store Connect
1. Uygulama oluştur — Bundle ID: `com.emretransformation.wanderer`
2. **Tek abonelik grubu** oluştur (ör. "Wanderer") — içine hem Pro hem Max
   ürünlerini ekle, Max'i üst sıraya koy (upgrade/downgrade akışı doğru işler)
3. Yukarıdaki 7 ürünü ekle (Auto-Renewable)
4. `pro_monthly` ürününe **Introductory Offer**: Pay-as-you-go, 1 ay, 1₺
   (Türkiye fiyat kademelerinde birebir 1₺ yoksa en yakın kademeyi seç —
   client metinleri gerçek tutarı gösterir, hardcode "1₺" DEĞİL)
5. `pro_monthly_t` ürününe **Free Trial**: 7 gün
6. Paid Apps sözleşmesini imzala (Agreements, Tax, and Banking)
7. App-Specific Shared Secret oluştur (RevenueCat'e girilecek)

### Google Play Console
1. Uygulama oluştur — paket adı: `com.emretransformation.wanderer`
2. Monetize → Subscriptions → yukarıdaki 7 ürünü ekle
3. `pro_monthly`'ye **Introductory price**: 1 ay, 1₺ (acquisition offer —
   "hiç sahip olmamış" hedef kitlesiyle sınırla)
4. `pro_monthly_t`'ye **Free trial**: 7 gün
5. API erişimi: Google Cloud service account oluştur, Play Console'a bağla
6. İlk yüklemeyi Internal Testing'e gönder (billing test için şart)

## 3) RevenueCat

1. https://app.revenuecat.com → proje oluştur: **Wanderer**
2. App ekle: iOS (Bundle ID + Shared Secret) ve Android (paket adı + service credentials JSON)
3. **İki entitlement** oluştur: **`pro`** ve **`max`**
   (client `RC_ENTITLEMENT_PRO`/`RC_ENTITLEMENT_MAX` ile birebir aynı olmalı)
4. Product bağlama:
   - `pro_monthly`, `pro_monthly_t`, `pro_monthly_list`, `pro_yearly` → yalnız `pro`
   - `max_monthly`, `max_monthly_list`, `max_yearly` → **HEM `pro` HEM `max`**
     (Max abonesi otomatik Pro'nun da sahibi olsun diye — webhook bunu böyle bekler)
5. **Offering'ler** (paywall durumuna göre client farklı offering ister —
   `js/parts/08-trends-payment.js`'teki `_findPackageForSku` isabet etmezse
   `current` offering'e düşer, tek offering'le de çalışır ama ayrımlı kurmak önerilir):
   - `gate_a`: `pro_monthly` (+intro), `pro_yearly`
   - `gate_b`: `pro_monthly_t`, `pro_yearly`
   - `active_upsell`: `max_monthly`, `pro_yearly`, `max_yearly`
   - `winback_locked`: `pro_monthly`, `pro_yearly`, `max_monthly`, `max_yearly`
   - `winback_list`: `pro_monthly_list`, `max_monthly_list`, `pro_yearly`, `max_yearly`
6. Grace period aç: Apple 16 gün / Play 14 gün (ödeme aksamasında erişimi
   kısa süre koru — dunning için)
7. **API Keys** → Public app-specific keys:
   - Apple key (`appl_...`) → `js/parts/08-trends-payment.js` → `RC_API_KEY_APPLE`
   - Google key (`goog_...`) → `RC_API_KEY_GOOGLE`

## 4) Webhook (Supabase Edge Function)

```bash
supabase secrets set REVENUECAT_WEBHOOK_SECRET="<uzun-rastgele-deger>"
supabase functions deploy revenuecat-webhook --no-verify-jwt
```

RevenueCat → Project Settings → Integrations → **Webhooks**:
- URL: `https://<PROJE-REF>.supabase.co/functions/v1/revenuecat-webhook`
- Authorization header: yukarıdaki secret ile birebir aynı değer

İşlenen event'ler (v2 — `supabase/functions/revenuecat-webhook/index.ts`):
- **ACTIVATE** (INITIAL_PURCHASE/RENEWAL/UNCANCELLATION/PRODUCT_CHANGE/…) →
  `entitlement_ids`'e göre `is_premium`/`is_premium_plus` yazar; `pro_monthly`
  ile aktifleşmişse `has_used_offer_a=true`, `pro_monthly_t` ile ise
  `has_used_offer_b=true`; `lapsed_at` temizlenir.
- **CANCELLATION** → no-op (erişim dönem sonuna kadar sürer), yalnız
  `has_cancelled_before=true` damgalanır (Sadakat Kilidi'nin geri dönüş
  kuralı için).
- **EXPIRATION** → `is_premium`/`is_premium_plus=false`, `lapsed_at=now()`
  (Kapı Aralık'ın 30 günlük sayacı burada başlar).
- **TRANSFER** → eski hesap kapanır, yeni hesap açılır.
- **BILLING_ISSUE** → no-op (grace period içinde erişim sürer; dunning
  bildirimi henüz kod tarafında YOK — istersen 00e/push motoruna eklenebilir,
  ayrı bir iş).

Tüm event'ler `billing_events`'e loglanır.

## 5) Client placeholder'ları doldur

`js/parts/08-trends-payment.js`:
- `RC_API_KEY_APPLE`, `RC_API_KEY_GOOGLE`
- `STORE_URL_APPSTORE` (App Store'daki gerçek app id ile)

`_src.html` → `payment-overlay` içindeki App Store linki (aynı app id).

## 6) Native build

```bash
bash build.sh          # dist/ üret (index.html normalize edilir)
npx cap sync           # dist → native projelere kopyala + plugin sync
npx cap open android   # Android Studio (AAB üret → Play Console)
npx cap open ios       # Xcode (Archive → App Store Connect)
```

- iOS: Capacitor 8 SPM kullanır. Xcode'da Signing & Capabilities →
  **In-App Purchase** capability ekle.
- Android: `com.android.vending.BILLING` iznini Play Billing kütüphanesi
  otomatik ekler.
- Not: Bu Mac'te (macOS 12 / Darwin 21.6) güncel App Store teslimi için Xcode
  sürümü yetersiz kalabilir — Ventura+ / güncel Xcode'lu bir makine gerekebilir.

## 7) Akışın özeti (kim neyi yazar)

| Adım | Ne olur |
|---|---|
| İlk giriş | `profiles` satırı FREE açılır; `offer_a_deadline=now()+72s` (trigger yazar) |
| İlk 72 saat | Benlik Kartı sonrası İlk Kapı (1₺) gösterilir (`openGateOverlay`) |
| 72 saat geçti | Yedi Eşik (7 gün ücretsiz) gösterilir — hesap başına 1 kez |
| Satın alma (native) | `startOfferA()`/`startOfferB()`/`startPayment(tier,cadence)` → mağaza ekranı |
| Kalıcılık | RevenueCat webhook → `profiles.is_premium`/`is_premium_plus` → Realtime client'a düşer |
| Web kullanıcısı | Satın alma fonksiyonları mağaza yönlendirme modalını açar (web'de satış yok) |
| İptal niyeti | Ayrılık Eşiği (`openCancelIntent`) → kişisel veriyle retention → onaylanırsa mağaza |
| İptal (gerçek) | Mağazadan; CANCELLATION → `has_cancelled_before=true`; EXPIRATION → erişim kapanır, `lapsed_at` başlar |
| Kapı Aralık (≤30g) | `lapsed_locked` durumu — kilit fiyatıyla (299/999) dönüş |
| Kapı Aralık sonrası | `lapsed_list` durumu — liste fiyatı (499/1499); yıllık hep kilit fiyatında |
| Cihaz değişimi | Abonelik sayfasındaki "Satın alımları geri yükle" |

## 8) Test

- Sandbox: iOS → Sandbox tester hesabı; Android → Internal testing + License
  testers. Webhook event'leri `environment=SANDBOX` ile gelir.
- İntro/trial hakkı Apple'da **abonelik grubu başınadır** — aynı sandbox
  hesabıyla iki teklifi art arda test edemezsin (gerçek kullanıcı davranışıyla
  aynı — bu kısıtlama bilerek bırakıldı, plan md.5'in "hesap başına 1 teklif"
  kuralını Apple zaten zorunlu kılıyor).
- Kapı Aralık'ı test etmek için SQL:
  `update public.profiles set lapsed_at = now() - interval '10 days', is_premium = false, is_premium_plus = false, has_cancelled_before = true where id = '<uid>';`
- İlk Kapı'nın süresini test etmek için SQL:
  `update public.profiles set offer_a_deadline = now() + interval '2 hours' where id = '<uid>';`
