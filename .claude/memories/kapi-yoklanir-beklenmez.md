---
name: kapi-yoklanir-beklenmez
description: CI koşusu yoklanır, beklenmez; uzak oturumda doğrudan GitHub API 403 döner ve tavansız until sessizce sonsuza gider
type: gotcha
---

# Kapı yoklanır, beklenmez — ve hiçbir döngü tavansız kurulmaz

2026-09-03'te bir arka plan komutu **40 dakika** boyunca zaten yeşil bitmiş bir
CI koşusunu bekledi. Emre fark edip durdurdu; kendi kendine hiç bitmeyecekti.

    # KURMA — bu komut sonsuza gider
    until [ "$(curl -sS -H "Authorization: Bearer $GITHUB_TOKEN" \
      "https://api.github.com/repos/.../actions/runs/$ID" \
      | python3 -c "...print(d.get('status',''))")" = "completed" ]; do
      sleep 20
    done

**Why — iki kırık birleşti ve ikisi de sessizdi:**

1. **Uzak oturumda `GITHUB_TOKEN` bir yer tutucudur** — değeri
   `"proxy-injected"`, 14 karakter. `api.github.com` **403** döner:
   *"GitHub access is not enabled for this session. An org admin must connect
   the Claude GitHub App."* Sistem talimatı zaten söyler: erişim yalnız
   `mcp__github__*` araçlarındadır, `gh` CLI de yoktur.
2. **Döngünün tavanı yoktu.** 403 gövdesinde `status` alanı olmadığı için
   `.get('status','')` boş string verdi ve `'' != "completed"` sonsuza kadar
   doğru kaldı. Ne hata basıldı, ne döngü kırıldı.

Üstelik ölçüm şunu gösterdi: **koşu 4 dakikada yeşil bitmişti.** Bekleyen
sorgu bunu asla göremedi — çünkü bakamıyordu. Sonsuzluk koşudan değil
sorgudan geliyordu.

Ders §6.2'nin kardeşidir: *sahte başarı yasaktır* — sessiz bir sonsuz döngü
hiçbir şeyi yanlış RAPORLAMAZ, yalnız hiç bitmez. **Dürüstlük yalnız çıktının
değil, durmanın da sözleşmesidir.**

**How to apply:**

- CI koşusunu **yokla, bekleme**: `mcp__github__actions_get`. `in_progress`
  ise işe devam et; bir sonraki doğal duraksamada tekrar yokla. Kapı dört
  dakika sürer — onu beklemek kazandığından çoğunu geri verir.
- Bir bekleme döngüsü gerçekten gerekiyorsa **tavanı olsun** (deneme sayacı,
  `--max-time`, `SECONDS`) ve tavan dolunca **gürültülü** bitsin.
- Kabuktan GitHub'a hiç gitme. `gh` yok, API 403.

Kapı: `tests/bekleme-dongusu-kapisi.test.js` — `scripts/`, `.github/`,
`.claude/hooks/` altında iki deseni de arar; tabanı **sıfır**, büyümesi yasak.
Kendi ihlalini de sınar. Protokol: §10.6.

Bağlar: [[kirmizi-kapi-okunmali]] · [[repo-geneli-kapilar]] · [[kapi-sessiz-gec]]
