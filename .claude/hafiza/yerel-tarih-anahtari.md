---
name: yerel-tarih-anahtari
description: "Günlük \"bugün yapıldı mı\" anahtarları için localISODate() kullan; toISOString().slice(0,10) UTC olduğu için TR'de gün sınırını kaydırır"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 7933b7c9-09a1-4bb1-ba15-ee3c93f675ed
  modified: 2026-08-17T13:45:42.434Z
---

Günlük özelliklerde ("bugün yapıldı mı", seri, günlük gruplama) tarih anahtarı üretirken **`localISODate(d)`** (00a-infrastructure.js) kullan — `YYYY-MM-DD` formatında ama YEREL saatte, lexical sıralanabilir.

**Why:** `new Date().toISOString().slice(0,10)` UTC verir; UTC+3 (İstanbul) kullanıcısında gece yarısı–03:00 arası günü bir gün geriye kaydırır → "bugün yapıldı" yanlış sıfırlanır. Ayrıca `localDayKey()` (00a) var ama o 0-indeksli/padding'siz (`2026-5-9`) — Set/Date parse için OK, ama string `<` karşılaştırmasında YANLIŞ sıralar; günlük karşılaştırmalarda `localISODate` kullan.

**Tuzağın test tarafı (2026-08-10):** kural TESTLER için de geçerli. `tests/13m-kota.test.js` `bonus_day`i `toISOString().slice(0,10)` ile kuruyordu, kod (`13m-kota.js:194`) `localISODate()` ile okuyordu — süit TR saatiyle gece yarısı–03:00 arasında **kodda hiçbir hata yokken** kendiliğinden kırmızıya dönüyordu. Gün-anahtarı kuran her fixture kodun kullandığı yardımcıyı import etsin; "test zaten sabit bir tarih yazıyor" sanılan yerlerde bile.

**Sekiz kopya tek kaynağa bağlandı (2026-08-17):** `localISODate`'in formülü
sekiz modülde elle kopyalanmıştı (10r `czDayKey` · 10t `smDayKey` · 10s
`glDayKey` · 10u `usDayKey` · 10f `_paddedKey` · 13h `_dayKey` · 13k `_dayKey`
· 10v `mrDayKey` · 10p `_todayISO`) ve dördü birbirine `window.czDayKey`
köprüsünden bağlıydı. Hepsi 00a'ya bağlandı; **yerel adlar korundu** (çağrı
yerlerinin okunurluğu), yalnız gövde tek satır oldu. `window.czDayKey`'in artık
sıfır okuyucusu var. Kalan kopyalar farklı bağlamda: `11:1129` session id'sine
gömülü, `12`/`13j`/`10l` AY anahtarı.

**İKİLİK haritası — `10f yolDayRings` başlığında yazılı ve 4 testle mühürlü:**
seri defteri `localDayKey` (pad'siz `2026-7-17`), hayal/söz defterleri
`localISODate` (padded `2026-08-17`). Yanlış anahtarla sorgulanan defter **hata
vermez, sessizce boş döner** — halka sönük kalır, kimse fark etmez. Tuzak bu
olduğu için dikkate değil teste emanet edildi.

**How to apply:** Yeni günlük-anahtar kodunda `toISOString().slice(0,10)`/`.substring(0,10)` YAZMA. Tam ISO timestamp (olay zaman damgası) gerekiyorsa `new Date().toISOString()` bırak — sadece tarih-only anahtarları localISODate'e çevir. 2026-06 düzeltmesi: 09b/05/09/10g/10i/10j/10l/10u hepsi geçirildi; 01-prompts:483 (created_at → session_id) kasıtlı UTC bırakıldı. İlişkili: [[ritual-streak-unity]], [[build-source-convention]].
