#!/bin/bash
# auto-build.sh — Claude Code Stop hook'u için.
# Kaynak dosyalar (js/, css/, _src.html) son build'den sonra değiştiyse build.sh'i
# çalıştırır ve sonucu kullanıcıya GÖRÜNÜR bir mesaj olarak bildirir.
#
# Çıktı sözleşmesi: stdout YALNIZCA tek satır JSON olmalı (Claude Code bunu okur).
#   - başarı  → {"systemMessage": "✓ Build tamam …"}
#   - hata    → {"systemMessage": "✗ Build HATASI …"}
#   - atlama  → {"suppressOutput": true}   (değişiklik yok, sessiz)
# build.sh'in kendi çıktısı stdout'u kirletmesin diye log dosyasına yönlendirilir.
set -u
cd "$(dirname "$0")/.." || exit 0

# JSON'u güvenli üret (özel karakterler mesajı bozmasın)
emit() { python3 -c 'import json,sys; print(json.dumps(json.loads(sys.argv[1])))' "$1" 2>/dev/null \
         || printf '%s\n' "$1"; }
msg()  { python3 -c 'import json,sys; print(json.dumps({"systemMessage": sys.argv[1]}))' "$1"; }

# Değişiklik yoksa sessizce çık
if [ -f dist/index.html ] && [ -z "$(find _src.html js css -type f -newer dist/index.html 2>/dev/null)" ]; then
  emit '{"suppressOutput": true}'
  exit 0
fi

log="$(mktemp)"
start="$(date +%s)"
# AUTO_BUILD=1: build.sh'in bütçe kapısı aşımda yalnız UYARIR, exit 1 vermez —
# Stop hook zinciri bu tur sonunda asla bütçe yüzünden kırılmasın diye.
if AUTO_BUILD=1 bash build.sh >"$log" 2>&1; then
  dur=$(( $(date +%s) - start ))
  size="$(du -sh assets 2>/dev/null | awk '{print $1}')"
  rm -f "$log"
  msg "✓ Build tamam — production güncellendi (${dur}s · assets ${size})"
else
  tail_out="$(tail -n 3 "$log")"
  rm -f "$log"
  msg "✗ Build HATASI — düzeltilmeli. Son satırlar: ${tail_out}"
fi
