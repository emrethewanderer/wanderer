---
name: dis-origin-kapiyi-kirmaz
description: Bir kapı kırmızıya dönünce ilk soru "kırık kimin" — dış servis kesintisi kapıyı kırmaz ama sessizce de geçmez
type: gotcha
---

# Kırık kimin? — üç kova her kapının kuralıdır

Doğrulama tarayıcısı 2026-09-02'de üç kovayla doğdu (§3.3): **İHLAL** kapıyı
kırar · **DIŞ ORIGIN** kırmaz ama raporda adıyla görünür · **GÜRÜLTÜ** sayılmaz
ama `--json`'da tam listelenir. O gün bu ayrım tarayıcıya özel sanılmıştı.

**Değilmiş.** 2026-09-03'te CI aynı kırıktan kırmızı bastı:

    Test Files  171 passed (171)
    Tests      3857 passed (3857)
    ...
    npm warn audit 503 Service Unavailable - POST https://registry.npmjs.org/...
    npm error audit endpoint returned an error
    ##[error]Process completed with exit code 1

**Why:** `npm audit --omit=dev --audit-level=high` tek satırdı ve **iki farklı
sebeple** exit 1 veriyordu, ayırt etmeden:
1. gerçek bir açık bulundu → bakılacak haber, kapı kırılmalı
2. registry cevap vermedi → bizim ağacımızla ilgisiz, kapı kırılmamalı

Aynı commit'in push koşusu (#63) bir saat önce yeşildi. **Fark ağaçta değil
zamandaydı** — ve Emre'ye "merge kırmızı" diye ulaştı.

**İkinci kırık aynı olayda:** `concurrency` grubu `github.ref` idi, yani push
(`refs/heads/<dal>`) ile PR (`refs/pull/N/merge`) AYRI gruplara düşüyor ve
PARALEL koşuyordu. "Ağaç kimliği" adımı dal koşusunun check-run'ını arıyor ama
o daha bitmemiş oluyordu → kanıt yok → aynı ağaç ikinci kez koşuyor → ikincisi
503'e denk geliyor. Grup artık **head sha**: ikisi aynı gruba düşer, PR koşusu
dal koşusunun ardından kuyruklanır ve kanıtı bulup atlar.

**How to apply:** bir kapı kırmızıya döndüğünde ilk soru *"ne kırıldı"* değil,
**"kırık kimin"**dir.
- Ağacın kırığı → kapı kırılır.
- Dış servisin kesintisi → kapı kırılmaz, **ama sessizce de geçmez**:
  `::warning` ile adıyla raporlanır ve "temiz" DENMEZ, "bakılamadı" denir
  (§6.10 — kanıtı olmayan değer yoktur).
- Tanınmayan çıktı → üçüncü hâl, o da adlandırılır.

Kapı: `tests/kapi-workflow.test.js` — adımın metnini değil **davranışını**
sınar: betik YAML'dan çıkarılıp sahte bir `npm` ile gerçekten koşturulur, altı
senaryoda çıkış kodu okunur. "Doğru görünmek" ile "doğru davranmak" ayrı
şeylerdir.

Bağlar: [[kirmizi-kapi-okunmali]] · [[kapi-yoklanir-beklenmez]] ·
[[repo-geneli-kapilar]] · [[dogrulama-tarayicisi]]
