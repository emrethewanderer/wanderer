#!/bin/bash
# ═══════════════════════════════════════════════════════
#  hafiza-senkron.sh — HAFIZA KÖPRÜSÜ · lokal ↔ repo
# ───────────────────────────────────────────────────────
#  FELSEFE (Emre):
#    Protokol repoda yaşadığı için GitHub'a taşındı ve orada çalıştı.
#    Hafıza repo dışında yaşadığı için taşınmadı — model kuralları
#    devraldı ama geçmişi devralmadı. Bu script o boşluğu kapatır.
#
#  MEKANİK / TEK KAYNAK:
#    Gerçek kaynak DAİMA ~/.claude/projects/<slug>/memory/'dir —
#    Claude'un memory aracı oraya yazar. `.claude/hafiza/` onun
#    TÜREVİDİR, ikinci kaynak değil (ad-senkronu kuralının ruhu:
#    tek ad, tek gerçek). `disa` türevi tazeler, `ice` yeni bir
#    makinede kaynağı türevden kurar.
#
#  Kalıcılık: repo (.claude/hafiza/) — git takipli
#  Konvansiyon: idempotent; hiçbir kolda sessiz silme yok
# ═══════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="$(pwd)"

# Claude Code hafıza yolunu proje dizininden türetir: / ve boşluk → '-'
SLUG="$(printf '%s' "$REPO" | sed 's|[/ ]|-|g')"
KAYNAK="$HOME/.claude/projects/$SLUG/memory"
TUREV="$REPO/.claude/hafiza"

KOMUT="${1:-fark}"

case "$KOMUT" in
  disa)
    # lokal hafıza → repo türevi (commit öncesi çalıştırılır)
    [ -d "$KAYNAK" ] || { echo "✗ Kaynak hafıza yok: $KAYNAK"; exit 1; }
    mkdir -p "$TUREV"
    # --delete: kaynakta silinen hafıza türevde de ölür
    # (yanlışlanan hafıza silinir — §7 hafıza disiplini)
    rsync -a --delete --include='*.md' --include='*/' --exclude='*' "$KAYNAK/" "$TUREV/"
    echo "✓ dışa: $(ls "$TUREV"/*.md 2>/dev/null | wc -l | tr -d ' ') dosya → .claude/hafiza/"
    ;;
  ice)
    # repo türevi → lokal hafıza (yeni makine / cloud sonrası)
    [ -d "$TUREV" ] || { echo "✗ Repo türevi yok: $TUREV"; exit 1; }
    mkdir -p "$KAYNAK"
    # --delete YOK: içe alırken lokalde yeni yazılmış hafızayı EZMEYİZ
    rsync -a --include='*.md' --include='*/' --exclude='*' "$TUREV/" "$KAYNAK/"
    echo "✓ içe: .claude/hafiza/ → $KAYNAK"
    echo "  (silme yapılmadı — lokalde yeni yazılmış hafıza korunur)"
    ;;
  fark)
    # yazmadan karşılaştır — kapı olarak kullanılabilir
    [ -d "$KAYNAK" ] || { echo "✗ Kaynak hafıza yok: $KAYNAK"; exit 1; }
    [ -d "$TUREV" ]  || { echo "⚠ Repo türevi henüz yok — './scripts/hafiza-senkron.sh disa' çalıştır"; exit 1; }
    FARKDOSYA="$(mktemp)"
    if diff -rq --exclude='.DS_Store' "$KAYNAK" "$TUREV" > "$FARKDOSYA" 2>&1; then
      echo "✓ temiz — lokal hafıza ile repo türevi aynı ($(ls "$TUREV"/*.md | wc -l | tr -d ' ') dosya)"
      rm -f "$FARKDOSYA"
    else
      echo "⚠ FARK VAR:"
      sed 's|'"$KAYNAK"'|<lokal>|g; s|'"$TUREV"'|<repo>|g' "$FARKDOSYA"
      rm -f "$FARKDOSYA"
      exit 1
    fi
    ;;
  *)
    echo "Kullanım: ./scripts/hafiza-senkron.sh {disa|ice|fark}"
    echo "  disa  lokal hafıza → repo türevi   (commit öncesi)"
    echo "  ice   repo türevi → lokal hafıza   (yeni makinede)"
    echo "  fark  karşılaştır, yazma           (kapı)"
    exit 2
    ;;
esac
