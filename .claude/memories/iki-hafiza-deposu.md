---
name: iki-hafiza-deposu
description: .claude/hafiza/ lokal hafızanın AYNASI, .claude/memories/ repo tarafında koda karşı yazılan hafıza — ikisi de okunur; disa kolu artık aynada fazladan kalanı sessizce silmez, durur ve gösterir
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
  YAZMA: aynanın kaynağı repo değildir, oraya yazdığın dosyanın kaynakta
  karşılığı yoktur. Eskiden `disa` kolu onu `rsync -a --delete` ile
  **sessizce siliyordu**; 2026-09-05'te düzeltildi — betik artık durur,
  silinecekleri gösterir ve doğru yeri söyler; silmek `--sil` ile bilinçli
  bir eylemdir. Yine de aynaya yazılmaz: ilk senkron üzerine yazar.
- **Lokaldeysen** memory aracına yaz, kapanıştan önce `disa` koştur.
- **Tek depoya inmek için yapılacak bir iş yok.** İkilik bir borç değil,
  senkronun doğru çalışmasının sonucudur. İhlal olan tek şey birebir kopyadır
  (aynı ad, aynı içerik, iki depo) — kapısı `tests/hafiza-senkron-kapisi.test.js`.

Bağlam: `TASINABILIR-ZEMIN.md` (geçiş envanteri), `CLAUDE.md` madde 13.
