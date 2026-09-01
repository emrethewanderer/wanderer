#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
#  Wanderer · Edge Functions deploy
#  Tüm Supabase fonksiyonlarını doğru verify-jwt bayraklarıyla yükler.
#  ÖNCE: supabase login  (veya SUPABASE_ACCESS_TOKEN ortam değişkeni)
#  Çalıştır:  ./scripts/deploy-functions.sh
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

REF="utfphfifkgfrrsifrzjc"   # Wanderer prod proje ref'i

# Giriş kontrolü — dürüst hata, sessiz başarısızlık yok.
if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  supabase projects list >/dev/null 2>&1 || {
    echo "✗ Giriş yok. Önce:  supabase login   (veya export SUPABASE_ACCESS_TOKEN=...)"
    exit 1
  }
fi

deploy() {
  echo "→ $1 ${2:-}"
  supabase functions deploy "$1" --project-ref "$REF" ${2:-}
}

# Kullanıcı çağrılı (JWT'yi kendileri doğrular, varsayılan kapı yeterli)
deploy delete-user
deploy hayal-gorsel
deploy send-user-letter

# Dış/cron çağrılı — kapıda JWT yok, kendi sırrını kontrol eder
deploy revenuecat-webhook --no-verify-jwt    # RevenueCat webhook JWT göndermez
deploy send-push          --no-verify-jwt    # pg_cron yalnız x-cron-secret yollar

echo "✓ Bitti. Liste:  supabase functions list --project-ref $REF"
