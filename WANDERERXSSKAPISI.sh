#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  WANDERER — XSS KAPISI PAKETİ  ·  5 Eylül 2026
#  Lokalde commit edilmemiş kalan güvenlik işini GitHub'a taşır.
# ───────────────────────────────────────────────────────────────
#  NE TAŞIR (12 dosya, git patch olarak):
#    scripts/audit-innerhtml.mjs   HTML lavabo denetçisi v2 — satır-bazlıdan
#                                  deyim-bazlıya yeniden yazım (+401/-34).
#                                  innerHTML/outerHTML/insertAdjacentHTML
#                                  lavabolarını kanıt zinciriyle sınıflar.
#    tests/xss-kapisi.test.js      o denetçinin vitest bekçisi (YENİ, 129 satır).
#                                  Kapının KENDİSİNİ de sınar: yakalaması
#                                  gerekeni yakalıyor mu, geçirmesi gerekeni
#                                  geçiriyor mu. Yakalamayan kapı, kapı değildir.
#    js/parts/*.js (9 dosya)       INNERHTML-MUAF gerekçe beyanları
#    CODEMOD.md                    denetim belgesinin güncel hâli
#
#  NE TAŞIMAZ — bilinçli:
#    index.html · admin.html · sw.js · assets/*  → bunlar BUILD ÇIKTISIDIR.
#    ./build.sh yeniden üretir; taşımak yalnız çakışma doğurur.
#
#  NEDEN PATCH (tam dosya değil):
#    GitHub'daki repo bu makineden ileride. Tam dosya kopyalamak orada
#    sonradan yapılmış düzenlemeleri EZERDİ. Patch, çakışmayı git'in
#    kendisine tespit ettirir — ezmez, uyarır.
#
#  KULLANIM (repo kökünde):
#      bash WANDERER-XSS-KAPISI.sh --prova    # yalnız sınar, yazmaz
#      bash WANDERER-XSS-KAPISI.sh            # uygular
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

KENDI="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"

PROVA=0
[ "${1:-}" = "--prova" ] || [ "${1:-}" = "--dry-run" ] && PROVA=1

say()  { printf '%s\n' "$*"; }
ok()   { printf '  [+] %s\n' "$*"; }
skip() { printf '  [.] %s\n' "$*"; }
warn() { printf '  [!] %s\n' "$*"; }

KOK="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$KOK" ]; then
  KOK="$(cd "$(dirname "$KENDI")" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null || true)"
fi
if [ -z "$KOK" ]; then
  say "✗ Git deposu bulunamadı. Paketi Wanderer repo kökünden çalıştır."
  exit 1
fi
cd "$KOK"
[ -f "PROTOKOL-FABLE.md" ] || { say "✗ Bu Wanderer reposu değil: $KOK"; exit 1; }

say ""
say "═══ XSS KAPISI PAKETİ ═══"
say "Repo: $KOK"
[ "$PROVA" = "1" ] && say "Mod:  KURU PROVA — hiçbir dosya yazılmayacak"
say ""

b64coz() { base64 -d 2>/dev/null || base64 -D; }
YAMA="$(mktemp)"
trap 'rm -f "$YAMA"' EXIT
sed -n '/^__YAMA__$/,$p' "$KENDI" | tail -n +2 | b64coz | gunzip > "$YAMA"
say "Yama: $(grep -c '^diff --git' "$YAMA") dosya, $(wc -l < "$YAMA" | tr -d ' ') satır"
say ""

# ── 1. Zaten uygulanmış mı ───────────────────────────────────
say "1) Durum"
if git apply --check --reverse "$YAMA" 2>/dev/null; then
  ok "bu iş bu repoda ZATEN VAR — yapılacak bir şey yok"
  say ""
  say "Doğrulamak istersen:  npx vitest run tests/xss-kapisi.test.js"
  exit 0
fi
skip "iş henüz burada değil"

# ── 2. Temiz uygulanır mı ────────────────────────────────────
YONTEM=""
if git apply --check "$YAMA" 2>/dev/null; then
  YONTEM="duz"
  ok "yama temiz uygulanıyor (çakışma yok)"
elif git apply --3way --check "$YAMA" 2>/dev/null; then
  YONTEM="3way"
  warn "düz uygulanmıyor; 3-yollu birleştirme gerekecek"
else
  YONTEM="kirik"
  warn "yama bu ağaca uymuyor — dosyalar burada değişmiş olabilir"
fi
say ""

# ── 3. Uygula ────────────────────────────────────────────────
say "2) Uygulama"
if [ "$PROVA" = "1" ]; then
  case "$YONTEM" in
    duz)   skip "git apply ile uygulanacak" ;;
    3way)  skip "git apply --3way ile uygulanacak (çakışma işaretlenebilir)" ;;
    kirik) skip "yama diske bırakılacak, birleştirme elle yapılacak" ;;
  esac
  say ""
  say "Kuru prova bitti. Uygulamak için:  bash WANDERER-XSS-KAPISI.sh"
  exit 0
fi

case "$YONTEM" in
  duz)
    git apply "$YAMA"
    ok "12 dosya uygulandı"
    ;;
  3way)
    if git apply --3way "$YAMA"; then
      ok "3-yollu birleştirmeyle uygulandı"
    else
      # Çakışan dosyalar conflict marker'larıyla ağaçta duruyor; yamanın
      # kopyası da kullanıcıda kalmalı ki tek tek ayıklayabilsin.
      cp "$YAMA" "$KOK/xss-kapisi.patch"
      warn "bir kısmı çakıştı — çakışan dosyalar 'git status'ta U ile işaretli"
      say ""
      say "  Çakışmayı çözmenin iki yolu:"
      say "    a) Dosyayı aç, <<<<<<< işaretli yerleri elle birleştir."
      say "    b) O dosyadaki değişikliği bırak, geri kalanı koru:"
      say "         git checkout --ours <dosya>     # cloud'daki hâli kalsın"
      say ""
      say "  Yamanın kopyası: xss-kapisi.patch (tek dosya ayıklamak için"
      say "  git apply --include='<yol>' xss-kapisi.patch)"
    fi
    ;;
  kirik)
    cp "$YAMA" "$KOK/xss-kapisi.patch"
    warn "yama uygulanamadı; xss-kapisi.patch olarak bırakıldı"
    say ""
    say "  Muhtemel sebep: bu dosyalar GitHub tarafında da değişmiş."
    say "  Elle denemek için:"
    say "      git apply --3way --reject xss-kapisi.patch"
    say "      # sonra .rej dosyalarını gözden geçir"
    say ""
    say "  Ya da en önemli iki parçayı ayıkla — denetçi ve testi:"
    say "      git apply --include='scripts/audit-innerhtml.mjs' \\"
    say "                --include='tests/xss-kapisi.test.js' xss-kapisi.patch"
    exit 2
    ;;
esac
say ""

# ── 4. Kapıyı koştur ─────────────────────────────────────────
say "3) Kapı sınaması"
if command -v npx >/dev/null 2>&1 && [ -d node_modules ]; then
  if npx vitest run tests/xss-kapisi.test.js 2>&1 | tail -6; then
    ok "kapı koşturuldu (yukarıdaki çıktıya bak — 4 test yeşil olmalı)"
  else
    warn "test koşulamadı ya da kırmızı — yukarıya bak"
  fi
else
  skip "node_modules yok — testi sen koştur: npx vitest run tests/xss-kapisi.test.js"
fi
say ""

say "═══ ÖZET ═══"
say "Kaynak işi yerinde. Build çıktısı taşınmadı — gerekirse ./build.sh üretir."
say ""
cat <<'KOMUT'
git add scripts/audit-innerhtml.mjs tests/xss-kapisi.test.js CODEMOD.md js/parts/
rm -f WANDERER-XSS-KAPISI.sh
git commit -m "XSS kapısı · Lavabo denetçisi v2 — yakalamayan kapı, kapı değildir" \
           -m "audit-innerhtml.mjs satır-bazlıydı: çok satırlı template'lerin içindeki
escapeHTML'i, yerel esc takma adlarını ve insertAdjacentHTML lavabolarını
göremiyordu; 105 risky'nin neredeyse tamamı yanlış pozitifti. v2 deyimi
BÜTÜNÜYLE toplar ve kesişimleri kanıt zinciriyle doğrular.

- scripts/audit-innerhtml.mjs — v2 denetçi (+401/-34)
- tests/xss-kapisi.test.js — vitest bekçisi; kapının KENDİSİNİ de sınar
  (yakalaması gerekeni yakalıyor mu, geçirmesi gerekeni geçiriyor mu)
- js/parts/*.js — INNERHTML-MUAF gerekçe beyanları (9 dosya)
- CODEMOD.md — denetim belgesi güncellendi

Build çıktısı (index.html, admin.html, sw.js, assets/) bilinçli olarak
taşınmadı — ./build.sh yeniden üretir."
KOMUT
say ""
exit 0

__YAMA__
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
pJbAzhfLrS8zMv43IW0Got+oAAA=
