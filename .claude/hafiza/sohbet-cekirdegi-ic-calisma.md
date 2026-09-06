---
name: sohbet-cekirdegi-ic-calisma
description: "2026-08-18 sprint — İç Çalışma 01 rev.2/rev.3 uygulandı: mesaj kimliği, dürüst kalıcılık, gönderim kuyruğu, TTFT ölçümü, bütçeli pencere, deko-ledger, sahne kuyruğu; ELLE: migration 041"
metadata: 
  node_type: memory
  type: project
  originSessionId: f5c285da-37ea-41ec-869c-efa2ee1b55d7
  modified: 2026-08-18T14:40:40.858Z
---

**Sohbet Çekirdeği İç Çalışması (2026-08-18).** İç Çalışma 01 artifact'ı
(https://claude.ai/code/artifact/276ddc35-ee6f-4415-86fc-b3b39ebed71c) bir ay
sonra koda karşı yeniden doğrulandı → rev.2 (4 yeni boşluk G–J) → aynı gün
8 faz uygulandı → rev.3. Plan: `.claude/plans/sohbet-cekirdegi-ic-calisma.md`.

**Kodda ne var (hepsi `06-summary-chat.js`, aksi yazılmadıkça):**
- `_persistMesaj(satir, {chatKaydi, sessKaydi, balon, kuyrukla})` — insert
  dönüşünü mesajın ÜÇ yüzüne birden yazar: `S.chatHistory`, `S.allSessions`,
  balonun `data-msg-id`'si. `chat_history` **zaten `id` taşıyordu** (04:457
  `select('*')`), yalnız insert onu geri istemiyordu — şema işi çıkmadı.
- Persist hatası görünür: `data-persist-failed` + `.msg-persist-warn` şeridi
  ("kaydedilmedi · yeniden dene" → `retryPersist`). **Kimliğin gelmemesi hata
  DEĞİLDİR** — SELECT izni yoksa satır yazılmıştır; sahte uyarı basılmaz.
- Gönderim kuyruğu: `wn_chat_kuyruk_<uid>`, **ham localStorage**. SafeStorage
  bilinçli reddedildi — o bellek-içi önbellek + Supabase'e kuyruklu yazmadır
  ve hidrasyonu Supabase'ten gelir; "DB'ye ulaşamayan"ı DB'ye yazan depoya
  koymak çelişki. `chatKuyrukInit` (03-auth-shell post-auth) boşaltır.
  Çift cümle koruması: aynı oturumda aynı rol+içerik var mı diye sorulur.
- `_pencereSec(gecmis, sistemUzunluk)` — pencere mesaj saymaz, yük ölçer
  (`CHAT_INPUT_BUDGET_CHARS=24000` ~6K token, üst sınır 16, taban 4).
  **System prompt'un uzunluğu bütçeden düşülür.** Rollsum sınırı
  `S._sonPencereBoyu`'ndan okunur.
- `_sahneTuru(adaylar)` — yanıt sonrası **bir turda tek davet**: mühür → ödev
  → Geçmiş Ben → ders. "İndi mi" ölçüsü `messages-area.childElementCount`
  (tüketiciler imza döndürmüyor). Araç motoru kuyruğun DIŞINDA.
- `dekoTanit/dekoYaz/dekoCiz` — süs mesajın kimliğine bağlanır; replay 04:581
  ve 11:135'te **`window.dekoCiz` köprüsüyle** (06 zaten 04'ü import ediyor,
  ters yön döngü kurar). İlk tüketici `arac` (proto saf JSON).
- `wtLogLatency` (00f) — `kind:'latency'`, `screen`=model, `duration_ms`=TTFT.
  Çağrı **04'ün streaming karesinde**, `_runLLMTurn`'de değil: `callLLM`
  fallback'te kendini yeni modelle çağırır, çağıran taraf zinciri görmez —
  süreyi yanlış model adına yazmak ölçüm değil uydurma olurdu.

**Bu sprintin dersleri:**
1. **Taslak ikizi yazıldı ve söküldü.** Faz 3'te composer taslağı için katman
   yazıldı; Faz 6'nın keşfinde `13a-arac-motoru`'nun bunu zaten yaptığı
   görüldü (`etw_draft_chat`, aynı 400ms debounce, iki input, pre-auth).
   Keşif fazdan ÖNCE yapılmalıydı — [[fable-5-calisma-tarzi]] §1.3.
2. **Bundle bütçesi 650 → 665KB** (Emre'nin kararı). Gerekçe `build.sh`'ta:
   eklenen kod ertelenebilir sözlük/veri değil, ilk turda çalışan çekirdek.
3. `tests/setup.js`'in Supabase stub'ı **zincirlenebilir** yapıldı
   (insert/delete artık `.select().single()` ve çoklu `.eq()` kaldırır) —
   düz obje döndüren eski stub bu yolları testin gözünden gizliyordu.

**ELLE bekleyen:** `migrations/041_chat_decorations.sql` — `decorations JSONB`
kolonu + `users update own chat` UPDATE politikası. Uygulanana kadar süs
yazımı sessizce düşer, ürün bugünkü gibi çalışır.

**Bilinen sınırlar:** (1) 11'in VirtualScroller yolu (40+ mesajlık gün)
deko replay kapsamı dışında. (2) D boşluğu (düzenle→dallanma) bilinçli sınır.
(3) B'nin model kararı verilmedi — ölçü kuruldu, karar dağılıma bırakıldı.

**Why:** Sohbet Wanderer'ın ocağıdır; kartlar, ritüeller ve hafıza hep
buradan ısınır. Bu sprintin ekseni tek cümleydi: *yazılan söz kaybolmaz* —
kaydın kimliği, kaydın dürüstlüğü, kaydın izi.
**How to apply:** Sohbet turuna yeni bir tüketici eklerken: davet ediyorsa
`_sahneTuru` kuyruğuna gir, yanıtın uzvuysa girme. Kalıcı iz bırakacaksa
`dekoTanit` ile tipini tanıt. Yeni bir LLM turu varyantı `_runLLMTurn`'ü
çağırır ([[sohbet-cekirdek-kontrol]]), `sendMessage`'ı kopyalamaz.
