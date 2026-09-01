#!/bin/bash
# Wanderer AI — PREVIEW BAŞLATICI (idempotent)
#
# NEDEN AYRI BİR BAŞLATICI VAR:
#   preview aracı dev sunucusunu kendi sandbox'ında başlatır ve o sandbox
#   repo içindeki bir .mjs dosyasını AÇAMIYOR (EPERM, node ESM loader).
#   python3 -m http.server geçebiliyordu çünkü çalıştırdığı kod /usr/bin'de;
#   bizim sunucumuz repoda yaşıyor. Bu yüzden sunucuyu kabuk başlatır,
#   preview aracı yalnızca AYAKTA olana bağlanır (.claude/launch.json'daki
#   "url" alanı — komutsuz girdi = attach).
#
#   Bedeli tek satırlık bir ön adımdır; kazancı, önbelleği kapatan sunucunun
#   preview'ın sandbox'ına hiç bağımlı olmaması.
#
# Kullanım:
#   ./scripts/preview-baslat.sh              → repo kökü, :3030
#   ./scripts/preview-baslat.sh 3031 dist    → dist kökü, :3031
#   npm run preview:temiz                    → aynısı (kök, :3030)
#
# Zaten ayaktaysa hiçbir şey yapmaz — YENİ PORT AÇMAZ. Tek origin kuralı
# (PROTOKOL-FABLE.md §3.3) bu betiğin var oluş sebebidir.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${1:-3030}"
KOK="${2:-.}"
LOG="/tmp/wanderer-preview-${PORT}.log"

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Zaten ayakta → http://localhost:${PORT}  (log: ${LOG})"
  exit 0
fi

nohup node scripts/preview-server.mjs --port "$PORT" --kok "$KOK" > "$LOG" 2>&1 &
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Başladı → http://localhost:${PORT}  (kök: ${KOK}, log: ${LOG})"
    exit 0
  fi
  sleep 0.3
done

echo "Sunucu ${PORT} portunda ayağa kalkmadı — log:" >&2
cat "$LOG" >&2
exit 1
