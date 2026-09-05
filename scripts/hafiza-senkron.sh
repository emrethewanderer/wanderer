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
#  SESSİZ SİLME YOK — ve bu satır artık kodda da geçerli:
#    `disa` eskiden `rsync --delete` ile sessizce siliyordu; banner bunu
#    yasaklarken kod yapıyordu ve hiçbir şey ikisini karşılaştırmıyordu.
#    Ölçüldü (2026-09-05): türeve repo tarafından yazılan bir hafıza
#    dosyası, ilk senkronda iz bırakmadan ölüyordu. Artık silinecekler
#    ÖNCE gösterilir ve komut durur; silmek bilinçli bir eylemdir:
#    `disa --sil`. Yanlışlanan hafıza yine silinir (§7) — ama görülerek.
#
#  NEDEN rsync YOK:
#    Köprü, olmayabilecek bir araca yaslanmaz. rsync bu repoda kapıyı
#    koşturan ortamlardan birinde (uzak oturum kabı) YOKTU ve betik
#    `command not found` ile düştü — üstelik yoklama `|| true` ile
#    yutulduğu için "silinecek yok" sanılıp yıkıcı kola devam ediliyordu.
#    §10.4'ün dersi: kapı ortama değil repoya bağlı olmalı. find/cp her
#    yerde vardır; silme listesi de artık kendi kodumuzun ürettiği,
#    ekranda gösterilen bir listedir — dışarıdan gelen bir yan etki değil.
#
#  Kalıcılık: repo (.claude/hafiza/) — git takipli
#  Konvansiyon: idempotent; hiçbir kolda sessiz silme yok
#  Kapı: tests/hafiza-senkron-kapisi.test.js (ölçen alet de ölçülür, §10.5)
# ═══════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="$(pwd)"

# Claude Code hafıza yolunu proje dizininden türetir: / ve boşluk → '-'
SLUG="$(printf '%s' "$REPO" | sed 's|[/ ]|-|g')"
# Env override'ları KAPI İÇİNDİR: kapı gerçek hafızaya dokunmadan koşsun
# diye (kalıp: PROTOKOL §3.3'ün WANDERER_CHROMIUM zinciri). Günlük
# kullanımda ikisi de boştur, yollar varsayılandan çözülür.
KAYNAK="${WANDERER_HAFIZA_KAYNAK:-$HOME/.claude/projects/$SLUG/memory}"
TUREV="${WANDERER_HAFIZA_TUREV:-$REPO/.claude/hafiza}"

KOMUT="${1:-fark}"
SIL=0
[ "${2:-}" = "--sil" ] && SIL=1

# ── Yardımcılar ─────────────────────────────────────────
# Bir dizindeki .md dosyalarını köke göreli yollarla listeler.
listele() { ( cd "$1" && find . -type f -name '*.md' | sed 's|^\./||' | LC_ALL=C sort ); }

# $1 → $2 kopyalar (dizin yapısını koruyarak). Silme YAPMAZ.
kopyala() {
  local kay="$1" hed="$2" yol
  while IFS= read -r yol; do
    [ -n "$yol" ] || continue
    mkdir -p "$hed/$(dirname "$yol")"
    cp -p "$kay/$yol" "$hed/$yol"
  done < <(listele "$kay")
}

# $2'de olup $1'de olmayan .md yolları.
fazlalik() {
  local kay="$1" hed="$2" yol
  while IFS= read -r yol; do
    [ -n "$yol" ] || continue
    [ -f "$kay/$yol" ] || printf '%s\n' "$yol"
  done < <(listele "$hed")
}

sayi() { find "$1" -type f -name '*.md' 2>/dev/null | wc -l | tr -d ' '; }

case "$KOMUT" in
  disa)
    # lokal hafıza → repo türevi (commit öncesi çalıştırılır)
    [ -d "$KAYNAK" ] || { echo "✗ Kaynak hafıza yok: $KAYNAK"; exit 1; }
    mkdir -p "$TUREV"

    SILINECEK="$(fazlalik "$KAYNAK" "$TUREV")"

    if [ -n "$SILINECEK" ] && [ "$SIL" = "0" ]; then
      echo "⚠ DURDUM — bu $(printf '%s\n' "$SILINECEK" | grep -c .) dosya türevde var, kaynakta YOK:"
      printf '%s\n' "$SILINECEK" | sed 's|^|    |'
      echo ""
      echo "  Sessizce silmiyorum. İki ihtimal var ve cevapları farklı:"
      echo ""
      echo "  1) Repo tarafında yazıldılar (uzak oturum). Yerleri burası DEĞİL —"
      echo "     .claude/memories/ altına taşı; orası senkronun dokunmadığı"
      echo "     depodur (bkz. .claude/memories/README.md)."
      echo ""
      echo "  2) Hafıza gerçekten yanlışlandı ve silinmeli (§7). Bilerek sil:"
      echo "       ./scripts/hafiza-senkron.sh disa --sil"
      exit 1
    fi

    kopyala "$KAYNAK" "$TUREV"

    if [ -n "$SILINECEK" ]; then
      while IFS= read -r yol; do [ -n "$yol" ] && rm -f "$TUREV/$yol"; done <<< "$SILINECEK"
      echo "✓ dışa: $(sayi "$TUREV") dosya → .claude/hafiza/  (--sil ile $(printf '%s\n' "$SILINECEK" | grep -c .) dosya silindi)"
    else
      echo "✓ dışa: $(sayi "$TUREV") dosya → .claude/hafiza/"
    fi
    ;;
  ice)
    # repo türevi → lokal hafıza (yeni makine / cloud sonrası)
    [ -d "$TUREV" ] || { echo "✗ Repo türevi yok: $TUREV"; exit 1; }
    mkdir -p "$KAYNAK"
    # Silme YOK: içe alırken lokalde yeni yazılmış hafızayı EZMEYİZ.
    kopyala "$TUREV" "$KAYNAK"
    echo "✓ içe: .claude/hafiza/ → $KAYNAK"
    echo "  (silme yapılmadı — lokalde yeni yazılmış hafıza korunur)"
    ;;
  fark)
    # yazmadan karşılaştır — kapı olarak kullanılabilir
    [ -d "$KAYNAK" ] || { echo "✗ Kaynak hafıza yok: $KAYNAK"; exit 1; }
    [ -d "$TUREV" ]  || { echo "⚠ Repo türevi henüz yok — './scripts/hafiza-senkron.sh disa' çalıştır"; exit 1; }
    FARKDOSYA="$(mktemp)"
    if diff -rq --exclude='.DS_Store' "$KAYNAK" "$TUREV" > "$FARKDOSYA" 2>&1; then
      echo "✓ temiz — lokal hafıza ile repo türevi aynı ($(sayi "$TUREV") dosya)"
      rm -f "$FARKDOSYA"
    else
      echo "⚠ FARK VAR:"
      sed 's|'"$KAYNAK"'|<lokal>|g; s|'"$TUREV"'|<repo>|g' "$FARKDOSYA"
      rm -f "$FARKDOSYA"
      exit 1
    fi
    ;;
  *)
    echo "Kullanım: ./scripts/hafiza-senkron.sh {disa|ice|fark} [--sil]"
    echo "  disa        lokal hafıza → repo türevi   (commit öncesi)"
    echo "  disa --sil  aynısı, ama kaynakta olmayanı SİLEREK"
    echo "  ice         repo türevi → lokal hafıza   (yeni makinede)"
    echo "  fark        karşılaştır, yazma           (kapı)"
    exit 2
    ;;
esac
