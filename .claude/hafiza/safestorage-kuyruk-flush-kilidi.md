---
name: safestorage-kuyruk-flush-kilidi
description: "SafeStorage yazım kuyruğu — eşzamanlı flush retry bütçesini çift tüketiyordu; \"Veri kaydedilemedi\" toast fırtınasının mekanizması ve teşhis yolu"
metadata: 
  node_type: memory
  type: project
  originSessionId: f5783a45-d08a-4d74-90bf-50c4e89ca46c
  modified: 2026-07-25T17:44:51.421Z
---

`js/parts/00a-infrastructure.js` — SafeStorage yazımları `user_analytics`
tablosuna bir retry kuyruğu üzerinden gider (`MAX_RETRIES=5`, backoff
2/4/8/16 sn). 2026-07-25'te sohbet ekranında ard arda gelen
"Veri kaydedilemedi: etw_..._<uid>" toast'larının ardında iki ayrı kusur vardı:

1. **Eşzamanlı flush (gerçek bug, düzeltildi).** `_flushQueue` bir `await`
   içindeyken yeni bir `SafeStorage.set` ikinci bir flush başlatabiliyordu
   (`_scheduleFlush` guard'ı yalnız `_flushTimer`e bakıyor, çalışan flush'a
   değil). İki tur AYNI `item` nesnesini deniyor → `item.retries` çift artıyor
   → 5'lik bütçe 2-3 gerçek denemede tükeniyor. Sohbet turu en yoğun yazma anı
   olduğu için hata tam orada görünüyordu. Çözüm: `_flushing` / `_flushPending`
   kilidi + gövde `_flushQueueRun`'a ayrıldı; kilit yüzünden atlanan istek
   `finally`de yeniden schedule edilir (backoff timer'ı ezilmez).

2. **Toast teşhis edilemezdi.** Her başarısız anahtar ayrı toast basıyor,
   kullanıcıya ham anahtar + kendi uid'si gösteriliyor, asıl SEBEP hiç
   görünmüyordu. Ayrıca metin hardcoded Türkçeydi (i18n ihlali). Çözüm:
   `_reportPersistFailure` 1.5 sn penceresinde biriktirip TEK toast basar,
   `t('toast.persist_fail')` ile TR+EN, sebep (`code · message`) görünür.

**Şema sağlam — orayı tekrar araştırma.** 2026-07-25'te PostgREST üzerinden
doğrulandı: `user_analytics` tablosu var; `user_id`/`data_type`/`data_json`/
`updated_at` kolonları var; `(user_id, data_type)` unique constraint çalışıyor
(`on_conflict` 42P10 değil 42501 RLS hatası döndürüyor — yani constraint eşleşti).

**Teşhis yolu:** kalıcı yazım hatasında konsola
`[Storage] kalıcı yazım hatası:` satırı düşer ve `{code, status, message,
details, hint}` taşır. Supabase kodları: 42501=RLS, 42P01=tablo yok,
23502=NOT NULL, PGRST204=şema cache, 23514=check constraint.

**Why:** Kök sebep hata koduna bakmadan bulunamaz; şemayı yeniden kurcalamak
boşa emek. Toast'ın kendisi sebebi gizlediği için kusur uzun süre görünmez kaldı.

**How to apply:** Bu toast tekrar görülürse önce konsoldaki `[Storage]` satırının
`code` alanını oku, tabloyu değil o kodu kovala. Kuyruk mantığına dokunurken
`tests/00a-infrastructure.test.js` (55 test, lifecycle/ayna senaryoları dahil)
regresyon kapısıdır. İlgili: [[cekirdek-omurga-haritasi]], [[yerel-tarih-anahtari]].
