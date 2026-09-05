---
name: emek-sayar-bakis-saymaz
description: "KARAR 2026-08-19: merkezî seri defterini tamamlanan her ritüel besler; pasif ekran açılışı (10g aynaya bakma) defterden çıkarıldı"
metadata:
  type: project
---

**Emre'nin kararı (19 Ağustos 2026, İç Çalışma 05 rev.3):** merkezî aktivite
defterini (`etw_activity_ledger_v1`) **tamamlanan her ritüel** besler — Günlük
Ritüel (10s), Kendinle Konuşmak (10k), dönem değerlendirmesi (10l), Engel
Atlası (10m), Dinlenme/Başarı Günlüğü (10n), Derin Çalışma (13A), Kitaplık
meydan okuması (10h) dahil. Buna karşılık `10g`'deki pasif "aynaya bakma"
çağrısı defterden **çıkarıldı**: Bugün ekranını açmak emek değildir.

**Why:** `calculateStreak` yalnız `getActivityDays()` okur
(`04-llm-hero-history.js:214`). 19 Ağustos taramasında defteri altı yüzey
besliyordu, yedi yüzey beslemiyordu — ve beslemeyenlerin başında uygulamanın
ana günlük ritüeli (Armağan + Söz) vardı. Yani sözünü veren kullanıcının günü
sayılmıyor, ekranı açıp hiçbir şey yapmayanınki sayılıyordu. Seri, emeğin
kaydı olmalı; giriş kaydı değil.

**How to apply:** yeni bir ritüel yüzeyi eklerken tamamlanma anında
`recordActivityDay()` çağır (state kaydeden `xxSave()`'de değil — mühür/bitiş
anında, §6.10). Otomatik/pasif tetiklere (render, ekran açılışı, günlük
kontrol) defter çağrısı KOYMA. Geçmiş defter satırları silinmez; karar
bugünden ileri işler.

İlgili: [[ritual-streak-unity]] · [[wanderer-gamification-engine]] ·
[[gun-serisi-vs-uc-muhur]] · [[seri-muhru-toreni]]
