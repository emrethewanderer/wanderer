#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
# devir-notu.sh — turun sonunda MEKANİK devir fotoğrafı
# ───────────────────────────────────────────────────────
# NEDEN: PROTOKOL-FABLE.md §3.6'nın devir noktası yalnız "kota uyarısını
# gördüğünde" tetikleniyordu — uyarı gelmezse ya da oturum bir anda kesilirse
# hiç çalışmıyordu (2026-08-10'da tam bu oldu: yeni oturum TaskList'i boş,
# hafızayı yazılmamış buldu). Bu kanca modele güvenmez: her tur sonunda diskte
# okunabilir bir kayıt noktası bırakır.
#
# Kapsam: MEKANİK olan her şey (commit, çalışma ağacı, plan). Yargı gerektiren
# "İlk hamle" satırını bu script YAZAMAZ — onu faz kapanışında model yazar.
# İkisi birlikte §3.6'yı oluşturur.
# ═══════════════════════════════════════════════════════
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO" || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0   # repo değilse sessizce çık

OUT="$REPO/.claude/DEVIR.md"
PLAN="$(ls -t "$REPO"/.claude/plans/*.md 2>/dev/null | head -1)"

{
  echo "# DEVİR — mekanik kayıt noktası"
  echo
  echo "> Bu dosyayı Stop kancası (\`scripts/devir-notu.sh\`) her tur sonunda"
  echo "> yeniden yazar; elle düzenlenmez. Yargı gerektiren \"İlk hamle\" satırı"
  echo "> burada YOKTUR — onu faz kapanışında model, plan dosyasına yazar."
  echo
  echo "**Yazıldığı an:** $(date '+%Y-%m-%d %H:%M')  ·  **Dal:** $(git rev-parse --abbrev-ref HEAD 2>/dev/null)"
  echo
  echo "## Son commit"
  echo '```'
  git log -1 --format='%h  %ad  %s' --date=format:'%Y-%m-%d %H:%M' 2>/dev/null
  echo '```'
  echo
  echo "## Çalışma ağacı"
  echo '```'
  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    git status --short 2>/dev/null
  else
    echo "temiz — commit edilmemiş değişiklik yok"
  fi
  echo '```'
  echo
  echo "## Son commitler"
  echo '```'
  git log --oneline -6 2>/dev/null
  echo '```'
  echo
  if [ -n "$PLAN" ]; then
    echo "## En son dokunulan plan"
    echo
    echo "\`${PLAN#$REPO/}\` — $(date -r "$PLAN" '+%Y-%m-%d %H:%M' 2>/dev/null)"
    echo
    echo '```'
    grep -n '^### FAZ' "$PLAN" 2>/dev/null | head -20
    echo '```'
  else
    echo "## Plan"
    echo
    echo "\`.claude/plans/\` boş."
  fi

  # ─── Devir nabzı ───────────────────────────────────────
  # NEDEN: §4.4'ün devir kuralı 2026-07-27'de kondu ve 08-11'de sessizce
  # öldü — 08-25 ölçümünde 149 🅢 faza karşı 11 `uygulayici` çağrısı çıktı,
  # 12 Ağustos sonrası 85 🅢 faza karşı 1. Kural kağıtta doğruydu; kimse
  # ölçmediği için kimse ölmüş olduğunu görmedi. Bu blok kuralı zorlamaz,
  # yalnız GÖRÜNÜR kılar: yeni oturumun ilk okuduğu dosya bu.
  echo
  echo "## Devir nabzı (§4.4 devir kapısı)"
  echo
  S_FAZ=0
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    n=$(grep '^### FAZ' "$f" 2>/dev/null | grep -c '🅢')
    S_FAZ=$((S_FAZ + n))
  done < <(find "$REPO/.claude/plans" -name '*.md' -mtime -14 2>/dev/null)

  # GOTCHA: proje dizini adında boşluk var ("Wanderer AI") — Claude Code
  # slug'ında boşluk da tireye döner. Yalnız '/' çevirmek dizini bulamaz ve
  # sayaç sessizce 0 basar; yani kapı kapalıymış gibi görünür (2026-08-25).
  PROJ_SLUG="$(echo "$REPO" | sed 's|[/ ]|-|g')"
  JSONL_DIR="$HOME/.claude/projects/$PROJ_SLUG"
  CAGRI=0
  if [ -d "$JSONL_DIR" ]; then
    # Dosyanın mtime'ı değil, ÇAĞRININ kendi timestamp'i sayılır: eski bir
    # çağrıyı taşıyan dosya bugün dokunulduğunda nabzı şişirir ve uyarı hiç
    # basmaz — ölçüm yine körleşirdi.
    CUTOFF="$(date -v-14d '+%Y-%m-%d' 2>/dev/null || date -d '14 days ago' '+%Y-%m-%d' 2>/dev/null)"
    # GOTCHA (2026-09-02): bir Agent çağrısı hata dönse bile (ör. "Agent type
    # 'uygulayici' not found") istek transkripte YAZILIR — yalnız satır grep'i
    # bu denemeyi de "devir yapıldı" sayardı. Bu sprintte tam bu oldu: nabız
    # 2 çağrı bastı, ikisi de başarısız denemeydi. Ayırt edici imza: harness
    # başarısız çağrının tool_result'ına `"is_error":true` basıyor — id
    # eşleşmesiyle o çağrılar dışlanır. Node'la ayrıştırıyoruz çünkü proje
    # zaten node'a bağımlı (build.sh, vitest — yeni bağımlılık değil); id'yi
    # regex'le eşleştirmek tool çıktısının içinde tesadüfen geçen bir
    # "is_error":true alıntısına yakalanabilirdi.
    CAGRI=$(find "$JSONL_DIR" -name '*.jsonl' -mtime -14 2>/dev/null \
      | NABIZ_CUTOFF="$CUTOFF" node -e '
          const fs = require("fs");
          const cutoff = process.env.NABIZ_CUTOFF || "0000-00-00";
          const dosyalar = fs.readFileSync(0, "utf8").split("\n").filter(Boolean);
          const basarisiz = new Set();
          const cagrilar = [];
          for (const dosya of dosyalar) {
            let icerik;
            try { icerik = fs.readFileSync(dosya, "utf8"); } catch (_) { continue; }
            for (const satir of icerik.split("\n")) {
              if (!satir) continue;
              let obj;
              try { obj = JSON.parse(satir); } catch (_) { continue; }
              const parcalar = obj && obj.message && obj.message.content;
              if (!Array.isArray(parcalar)) continue;
              for (const p of parcalar) {
                if (!p || typeof p !== "object") continue;
                if (p.type === "tool_result" && p.is_error === true && p.tool_use_id) {
                  basarisiz.add(p.tool_use_id);
                }
                if (p.type === "tool_use" && p.input && p.input.subagent_type === "uygulayici") {
                  cagrilar.push({ id: p.id, tarih: String(obj.timestamp || "").slice(0, 10) });
                }
              }
            }
          }
          let n = 0;
          for (const c of cagrilar) {
            if (c.tarih >= cutoff && !basarisiz.has(c.id)) n++;
          }
          process.stdout.write(String(n));
        ' 2>/dev/null)
    CAGRI="${CAGRI:-0}"
  fi

  echo "Son 14 gün — planlarda yazılan **🅢 faz: ${S_FAZ}** · \`uygulayici\` çağrısı: **${CAGRI}**"
  echo
  # Eşik ORANDIR, sıfır değil: §4.4 ardışık 🅢 fazları tek çağrıda
  # birleştirmeye izin verdiği için çağrı sayısı faz sayısından azdır —
  # ama %20'nin altı birleştirme değil, terk edilmiş kapıdır.
  if [ "${S_FAZ:-0}" -gt 0 ] && [ $(( ${CAGRI:-0} * 5 )) -lt "${S_FAZ:-0}" ]; then
    echo "> ⚠️ **Devir kapısı kapalı.** ${S_FAZ} 🅢 faza karşı ${CAGRI} çağrı."
    echo "> §4.4: 🅢 faz DEVREDİLİR — kendin uyguluyorsan gerekçe plana"
    echo "> \`Devir dışı:\` satırıyla yazılır. Kural 2026-08-11 → 08-25"
    echo "> arasında tam olarak böyle öldü: 85 🅢 faza karşı 1 çağrı."
  fi
} > "$OUT" 2>/dev/null

exit 0
