---
name: iki-hafiza-deposu
description: .claude/hafiza/ lokal hafızanın AYNASI (disa kolu rsync --delete kullanır, oraya repo tarafından yazılan dosya silinir), .claude/memories/ ise repo tarafında koda karşı yazılan hafıza — ikisi de okunur
type: architecture
---

# Hafıza iki yerde yaşıyor ve ikisi aynı şeyi tutmuyor

2026-09-05'te hafızanın lokal kopyası (195 dosya) `.claude/hafiza/` altına
taşındı. Repoda zaten `.claude/memories/` vardı (38 dosya). İkisi yan yana
gelince ilk okuma "paralel sistem" dedi (§1.3) — ölçüm bunu **yanlışladı**.

## Ölçüm

24 ad her iki dizinde de var ve **24'ünün de içeriği farklı**. 14 ad yalnız
`memories/`de, 171 ad yalnız `hafiza/`da.

Çakışan 24'ün 19'u `memories/` tarafında kendi hakkında şunu yazar: *"bu metin
kurtarma değildir, bugünkü koddan yeniden keşifle yazıldı"* — yazıldıkları gün
özgün hafıza repoda yoktu. İlk refleks o 19'u silmekti. Ölçüm durdurdu:
**16'sı, `hafiza/`daki özgün sürümde BULUNMAYAN repo yolları taşıyor**
(`js/parts/…`, `tests/…`, `scripts/…` çapaları).

Yani ikisi aynı olayın iki kaydıdır: ayna **niçin** kararlaştırıldığını,
repo sürümü bugün kodda **nerede** durduğunu taşır. Biri ötekinin yerine
geçmez ve hiçbiri silinmedi.

**Why:** Rolleri adlandırılmamış bir ikilik, sessiz bir paralel sistemdir —
sessiz olduğu sürece kimse hangisinin gerçek olduğunu bilemez. Kusur ikiliğin
kendisi değil, **adlandırılmamış** olmasıydı.

**How to apply:**
- **Okurken iki dizine de bak.** Bir ad hangisinde bulunursa bağ sağlamdır;
  `tests/referans-butunlugu-kapisi.test.js` de `[[bağ]]` hedeflerini ikisinde
  birden çözer (`HAFIZA_DIZINLERI`). Çakışan adda ikisini de oku.
- **Yazarken uzak oturumdaysan `.claude/memories/` altına yaz.** `hafiza/`ya
  YAZMA: `scripts/hafiza-senkron.sh disa` kolu `rsync -a --delete` kullanır ve
  kaynakta karşılığı olmayan dosyayı ilk senkronda **siler**. Aynaya yazılmaz.
- **Lokaldeysen** memory aracına yaz, kapanıştan önce `disa` koştur.
- Tek depoya inme sırası ve gerekçesi `.claude/memories/README.md`'de; sıra
  bozulup önce `memories/` silinirse taşınacak metin yok olur.

Bağlam: `TASINABILIR-ZEMIN.md` (geçiş envanteri), `CLAUDE.md` madde 13.
