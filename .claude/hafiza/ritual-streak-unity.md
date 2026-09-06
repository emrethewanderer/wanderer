---
name: ritual-streak-unity
description: "Ayna/Geçiş Alanı/Hayal Seansı'nın merkez altyapıyla bütünleştirilmesi; birleşik aktivite defteri + post-auth init bug fix"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8c6ae782-764f-4acf-9705-c8b2415c2924
---

2026-06-03'te "Bugün"deki 3 ritüel (Ayna 10g, Geçiş Alanı 10j, Hayal Seansı 10i) altyapıyla bütünleştirildi.

**A — Birleşik aktivite defteri:** `00a-infrastructure.js`'e `localDayKey/getActivityDays/recordActivityDay` eklendi (anahtar `etw_activity_ledger_v1`). Her ritüel tamamlandığında `recordActivityDay()` çağrılır; `calculateStreak` (04) artık sohbet günleri + defter günlerini BİRLEŞTİRİR → ritüeller merkezî seriyi/hafta zincirini besler. `recomputeStreakUI` (04, window'a açık) ritüel sonrası seriyi anında tazeler.

**Kritik bug fix:** `wgInit`/`haInit` 14-boot'ta PRE-AUTH çalışıyordu — SafeStorage cache'i (storageInit) auth sonrası hydrate olduğu için state default'a düşüp buluttaki Elmas/sahne verisini ilk kayıtta EZİYORDU. İkisi de 03-auth-shell.js'e post-auth taşındı (gaInit ile aynı yere). Yeni ritüel modülü eklerken: hydrate gereken init'i 14-boot'a değil 03-auth-shell post-auth bloğuna koy.

**B — Koç köprüsü:** 09a `buildPersonalizationPrompt` içine `_buildRitualWorkContext()` eklendi; son hayal sahneleri + davranış kanıtları + aktif Geçiş kartı koç bağlamına girer.

**C:** `aynaEdit()` artık `gaOpenCardEditor`'a yönlenir (Geçiş Alanı = "olmak istediğin kişi"nin kanonik tasarımcısı). **D:** `renderAynaCard` saf render; günlük ödül `aynaReflectToday()`'e ayrıldı (Bugün render'ında 1 kez). **E:** 10g/10i artık per-uid anahtar (`_${uid}`) + eski global anahtarı bir kez benimser (veri kaybı yok). **F:** Hayal günlük limiti gerçekten uygulanıyor — dolduysa seans yerine harita (geçmiş) açılır.

İlgili: [[wanderer-gamification-engine]] [[personalization-engine-layers]] [[build-source-convention]]
