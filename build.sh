#!/bin/bash
# Wanderer AI — build & deploy
# Bundle IIFE format'tadır (vite.config.js: format='iife'). type="module" gereksiz
# ve file:// protokolünde browser'lar ESM script'leri CORS ile reddeder. Strip edilir.
# CSP korunur (PWA HTTPS'te ve file://'da çalışır — 'unsafe-inline' style izinli).
#
# ATOMİK BUILD: vite dist/ dizinini build başında BOŞALTIR ve transform ~15-18s sürer.
# Eskiden bu süre boyunca dist/ yarım kalıyordu → preview sunucusu (python http.server)
# index.html bulamayıp DİZİN LİSTESİ veya bundle'sız _src.html servis ediyor, "stilsiz
# ham ekran" çıkıyordu. Çözüm: geçici dizine kur, bitince yerine TAKAS et. dist/ artık
# yalnızca mikrosaniyelik bir pencerede değişir; preview hiçbir zaman yarım dist görmez.
set -euo pipefail
cd "$(dirname "$0")"

# --- Eşzamanlı build kilidi ---
# Stop hook'u önceki build bitmeden tekrar tetiklenirse iki build dist'i bozabilir
# (paylaşılan dist.tmp + mv yarışı). mkdir atomik kilittir: ikinci build sessizce çıkar.
LOCK="dist.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "Build zaten sürüyor (dist.lock) — atlanıyor."
  exit 0
fi
trap 'rm -rf "$LOCK" dist.tmp' EXIT

echo "Building..."
TMP="dist.tmp"
rm -rf "$TMP"
NODE_ENV=production npx vite build --outDir "$TMP" --emptyOutDir

# ---- SIDECAR'LAR ----
# js/ext/*.js → assets/ext-<ad>.js: ana bundle'a GİRMEYEN, ihtiyaç anında
# 00-ext-loader.loadExtScript ile yüklenen ayrı minified IIFE global'ler.
# Sözleşme: <ad> → global __EXT_<AD>__ (büyük harf, '-' → '_').
# Atomik takastan ÖNCE $TMP'ye yazılır; dist'e asla doğrudan yazılmaz.
if [ -d js/ext ]; then
  for src in js/ext/*.js; do
    [ -e "$src" ] || continue
    base="$(basename "$src" .js)"
    gname="__EXT_$(echo "$base" | tr 'a-z-' 'A-Z_')__"
    NODE_ENV=production npx esbuild "$src" --bundle --minify --format=iife \
      --global-name="$gname" --outfile="$TMP/assets/ext-${base}.js" --log-level=warning
  done
fi

# Vite entry adını normalize et
mv "$TMP/_src.html" "$TMP/index.html"

# IIFE format: type="module" ve crossorigin attribute'larını strip et.
# Bu olmazsa file:// protokolünde ESM yükleme CORS ile reddedilir, app boot olmaz.
# NOT: `-i ''` yerine `-i.bak` — BSD (macOS) sed boş uzantıyı ayrı argüman
# olarak ister, GNU sed ise onu DOSYA ADI sanıp exit 2 ile ölür (denetim A1).
# `-i.bak` her ikisinde de yedek üretir; yedeği hemen siliyoruz.
sed -i.bak 's/<script type="module" crossorigin/<script/' "$TMP/index.html" && rm -f "$TMP/index.html.bak"

# Aynı gerekçe stylesheet için: cssCodeSplit:false ile CSS artık ayrı asset
# (assets/style-<hash>.css) ve vite link'e crossorigin basıyor. file://'da
# crossorigin'li stylesheet CORS'a takılıp STİLSİZ ekran bırakır — native
# kabuk (Capacitor webDir=dist) tam bu yolda çalışır. Google Fonts link'i
# farklı biçimde (href önce, rel sonra) olduğundan bu desen ona dokunmaz.
sed -i.bak 's/<link rel="stylesheet" crossorigin href=/<link rel="stylesheet" href=/' "$TMP/index.html" && rm -f "$TMP/index.html.bak"

# Sessiz başarısızlık kapısı: yukarıdaki iki sed desene bağlıdır — vite çıktı
# biçimini değiştirirse ikisi de sessizce BOŞA düşer, build yeşil görünür ve
# hata ancak native kabukta stilsiz/boot'suz ekran olarak ortaya çıkar.
# O yüzden asset etiketlerinde kalan crossorigin build'i kırar. Fontların
# `<link rel="preconnect" … crossorigin>`'i meşrudur ve `assets/` içermediği
# için bu süzgece takılmaz.
leftover="$(grep -o '<[^>]*crossorigin[^>]*>' "$TMP/index.html" | grep 'assets/' || true)"
if [ -n "$leftover" ]; then
  echo "✗ Asset etiketinde crossorigin kaldı — sed desenleri vite çıktısıyla uyuşmuyor:"
  echo "$leftover"
  exit 1
fi

# Yönetim paneli — AYNI bundle, AYRI sayfa. Boot, location.pathname'in
# admin.html ile bitmesinden anlar (js/config.js IS_ADMIN_PAGE) ve app kabuğunu
# açmadan doğrudan admin görünümüne iner. Tek fark: sayfa başlığı.
sed 's#<title>[^<]*</title>#<title>Wanderer Studio · Yönetim</title>#' "$TMP/index.html" > "$TMP/admin.html"

# SW cache versiyonunu bu build'in bundle hash'iyle damgala. Deterministik:
# bundle içeriği değişmezse hash (ve sw.js) aynı kalır → gereksiz diff yok.
# Yeni hash → activate handler eski cache girdilerini otomatik temizler.
if [ -f sw.js ]; then
  bundle_hash="$(grep -oE 'assets/_src-[A-Za-z0-9_-]+\.js' "$TMP/index.html" | head -1 | sed -E 's#.*_src-([A-Za-z0-9_-]+)\.js#\1#')"
  if [ -n "$bundle_hash" ]; then
    sed -i.bak -E "s/const CACHE = '[^']*';/const CACHE = 'etw-${bundle_hash}';/" sw.js && rm -f sw.js.bak
    # Sessiz başarısızlık kapısı — index.html'deki kardeşinin (yukarısı) SW
    # tarafındaki eşi. sed hiçbir şey değiştirmezse de 0 döner: `const CACHE`
    # satırının biçimi bir gün değişirse (örn. boşluksuz `const CACHE='x';`)
    # damga sessizce boşa düşer, build YEŞİL görünür ama Service Worker eski
    # hash'te kalır — kullanıcı yeni bundle'ı almaz. Damganın gerçekten
    # oturduğunu doğrulamak bu yüzden kapıdır, tören değil.
    if ! grep -q "const CACHE = 'etw-${bundle_hash}';" sw.js; then
      echo "✗ sw.js damgası oturmadı — 'const CACHE' satırının biçimi sed desenine uymuyor."
      echo "  beklenen: const CACHE = 'etw-${bundle_hash}';"
      echo "  bulunan : $(grep -n "^const CACHE" sw.js | head -1)"
      exit 1
    fi
  fi
fi

# sw.js'i (damgalı haliyle) TMP'ye kopyala — SW root scope'ta register ediliyor.
[ -f sw.js ] && cp sw.js "$TMP/sw.js"

# ---- ATOMİK TAKAS ----
# Eski dist tamamen geçerli kalır (geçerli index.html + eşleşen assets) ta ki yeni dist
# hazır olana dek. Sonra iki mv ile mikrosaniyede yer değiştirir.
rm -rf dist.old
[ -d dist ] && mv dist dist.old
mv "$TMP" dist
rm -rf dist.old

# Kök kopyalar — statik hosting & SW scope için. Preview bunları SERVİS ETMEZ
# (preview dist/ servis eder), ama PWA/native dağıtım kökü kullanır.
cp dist/index.html index.html
cp dist/admin.html admin.html
rm -rf assets
cp -r dist/assets assets
# PWA kök varlıkları (public/ → dist kökü) — manifest ikonları + apple-touch-icon
# + Emre portresi (EMRE_IMG, js/config.js) root static-hosting yolunda da çözülsün.
# dist (capacitor/preview) zaten içeriyor.
cp dist/icon-192.png dist/icon-512.png dist/emre-portre.png . 2>/dev/null || true

# ---- BÜTÇE KAPISI ----
# İlk yükleme = yalnız ana bundle (sidecar'lar ihtiyaç anında iner).
# Mod ayrımlı: Stop hook'un otomatik build'i (AUTO_BUILD=1 — scripts/auto-build.sh
# geçirir) her tur sonunda çalıştığından aşımda yalnız UYARIR, zinciri kırmaz.
# ELLE `./build.sh` çalıştırıldığında (AUTO_BUILD boşsa) aşım build'i KIRAR (exit 1) —
# diyet ihmal edilip bütçe sessizce şişmesin diye kasıtlı sert kapı.
# 2026-08-18: 650 → 665. Emre'nin bilinçli kararı. Sohbet Çekirdeği iç
# çalışmasının eklediği kod (mesaj kimliği, dürüst kalıcılık, taslak/kuyruk,
# TTFT ölçümü) sidecar'a uygun DEĞİL: ertelenebilir bir sözlük/veri değil,
# ilk turda çalışan işlevsel çekirdek. Diyet ayrı bir iş olarak duruyor —
# .claude/plans/bundle-diyet.md adaylarının tamamı zaten uygulanmış durumda.
#
# 2026-08-19: 665 → 1024 (1 MB gzip). Emre'nin kararı ("sorun yaşamıyorsak
# sınıra kadar artır"), ama sayı ÖLÇÜMLE seçildi — 2.15 MB ham bundle'ın V8
# derlemesi 79 ms (medyan, `node vm.Script`, exec yok) + gunzip 13 ms; o günkü
# gerçek boot 7929 ms ölçüldüğünde derlemenin payı %1.2 çıktı. Marjinal maliyet
# +1 KB gzip = 0.118 ms. Sert teknik tavan yok: native kabukta bundle
# uygulamanın İÇİNDE (indirme yok), tek gerçek maliyet web/PWA'da ~+0.25 sn.
# 2026-08-19 (ikinci tur): bu satır hafızada "uygulandı" yazıyordu ama diskte
# 665 duruyordu — kapı, kararın gerisinde kalmıştı. Boot Nabzı sprinti bunu
# fark edip diske geçirdi. KURAL: bu sayı değişirse scripts/check-bundle-size.mjs
# AYNI turda değişir (08-18'de unutuldu ve CI bir gün sessizce kırmızı kaldı).
BUDGET_KB=1024
echo "Done! Bundle size:"
main_js="$(ls dist/assets/_src-*.js 2>/dev/null | head -1)"
if [ -n "$main_js" ]; then
  # Karşılaştırma BYTE'ta yapılır: `$((x/1024))` AŞAĞI yuvarlar ve 665 KB
  # bütçede 681983 byte'a kadar her aşımı `✓` diye raporlardı (fiilî bütçe
  # 666 KB). Yuvarlanmış birim aşımı gizler.
  main_gz_bytes=$(gzip -c "$main_js" | wc -c | tr -d ' ')
  main_gz=$(( main_gz_bytes / 1024 ))
  BUDGET_BYTES=$(( BUDGET_KB * 1024 ))
  if [ "$main_gz_bytes" -gt "$BUDGET_BYTES" ]; then
    if [ "${AUTO_BUILD:-}" = "1" ]; then
      echo "  ana bundle: ${main_gz}KB gzip (${main_gz_bytes} byte) — ⚠️ BÜTÇE AŞIMI (bütçe ${BUDGET_KB}KB = ${BUDGET_BYTES} byte; adaylar: .claude/plans/bundle-diyet.md)"
    else
      echo "  ana bundle: ${main_gz}KB gzip (${main_gz_bytes} byte) — ✗ BÜTÇE AŞIMI (bütçe ${BUDGET_KB}KB = ${BUDGET_BYTES} byte; adaylar: .claude/plans/bundle-diyet.md)"
      echo "  Elle build bütçe aşımında KIRILIR — diyet uygula ya da BUDGET_KB'yi bilinçli artır."
      exit 1
    fi
  else
    echo "  ana bundle: ${main_gz}KB gzip (${main_gz_bytes} byte) ✓ (bütçe ${BUDGET_KB}KB)"
  fi
fi
for f in dist/assets/ext-*.js; do
  [ -e "$f" ] || continue
  echo "  sidecar $(basename "$f"): $(( $(gzip -c "$f" | wc -c) / 1024 ))KB gzip"
done
# CSS artık ayrı asset (cssCodeSplit:false) → BUDGET_KB'nin dışında kaldı.
# Ölçülmeyen şey sessizce şişer: kapı değil ama görünürlük satırı olarak raporlanır.
for f in dist/assets/style-*.css; do
  [ -e "$f" ] || continue
  echo "  stylesheet $(basename "$f"): $(( $(gzip -c "$f" | wc -c) / 1024 ))KB gzip (bütçe dışı)"
done

# ---- NATİF KABUK SENKRONU ----
# Denetim D1: android/ ve ios/ altındaki web varlıkları dist'ten 283 KB ve bir
# bundle hash geride kalmıştı — `cap copy` elle koşulan bir adımdı ve bir gün
# koşulmamıştı. Kopyalar repo'da commit'li olduğu için fark sessizce taşınıyor,
# mağazaya giden uygulama web'den geri kalıyordu. Build artık kendi senkronunu
# yapar: türetilmiş çıktı elle senkronlanmaz.
# Kabuk yoksa (yalnız web dağıtımı) adım sessizce atlanır.
if [ -d android ] || [ -d ios ]; then
  if npx --no-install cap copy >/dev/null 2>&1; then
    echo "  natif kabuklar senkronlandı (cap copy)"
  else
    echo "  ⚠ cap copy koşturulamadı — natif kabuklar dist'ten geride kalmış olabilir."
    echo "    Elle: npx cap copy   (kapı: tests/native-senkron-kapisi.test.js)"
  fi
fi
