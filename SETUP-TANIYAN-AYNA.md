# Tanıyan Ayna Kurulumu — Kişiselleştirme Motoru 3.0

Bu, motoru üç yeni katmanla genişletir: **Yaşayan Portre** (09e, günlük tek
kanonik "X çünkü Y" sentezi), **Epizodik Hafıza** (09f, pgvector'la anlamsal
geri-getirme), **Ayna Protokolü + Ayna Anı** (09g/09h, haftalık hipotez +
yüzleşme töreni). Repo tarafı tamamen hazır ve **554 → 620 vitest yeşil**,
build temiz. Aşağıdaki adımları **Supabase'de elle** yapman gerekiyor
(proje konvansiyonu: migration'lar + edge fn deploy elle).

Yaşayan Portre + Ayna Protokolü **hiçbir ELLE adım gerektirmez** — tamamen
SafeStorage/`user_analytics` üzerinden çalışır, otomatik senkron olur. Yalnız
**Epizodik Hafıza (FAZ 2)** yeni bir tablo + edge fonksiyon istiyor.

---

## 1) Migration'ı uygula
Supabase → SQL Editor → `migrations/000_wanderer_schema.sql` içeriğini çalıştır.

Bu migration:
- `vector` extension'ını garantiye alır (zaten `knowledge_chunks` için etkin olmalı).
- `user_memories` tablosunu kurar (owner-only RLS, `error_logs`/`usage_events` kalıbı).
- `match_user_memories(p_query_embedding, p_match_threshold, p_match_count)` RPC'sini
  kurar — cosine benzerliğiyle kullanıcının KENDİ anılarında arar.

## 2) `llm-embed` edge fonksiyonunu gözden geçir ve deploy et

> ⚠️ **ÖNEMLİ:** `llm-embed` şu an muhtemelen **zaten deployed** ve sadece admin'e
> açık (07-settings-knowledge.js bilgi tabanı yüklemesi bunu kullanıyor). Bu repodaki
> `supabase/functions/llm-embed/index.ts` dosyası, admin-only kapıyı kaldırıp
> kullanıcı-bazlı günlük kotaya (60/gün) çeviren YENİ bir referans implementasyonu.
> **Deploy etmeden önce mevcut prod fonksiyonunu** (`supabase functions download
> llm-embed` ya da dashboard'dan) bu dosyayla karşılaştır — env var isimlerin
> (`EMBED_API_URL`, `EMBED_MODEL`, `LLM_API_KEY`) mevcut kurulumunla eşleştiğinden
> emin ol. Admin akışı (07) davranışsal olarak DEĞİŞMEDİ, sadece artık admin
> olmayanlar da (kotalı) çağırabiliyor.

```bash
supabase functions deploy llm-embed
```

Secrets (muhtemelen zaten mevcut, diğer LLMAPI kullanan fonksiyonlarla ortak):

| Secret | Değer |
|---|---|
| `LLM_API_KEY` | LLMAPI anahtarı (llm-chat/hayal-gorsel ile aynı) |
| `EMBED_API_URL` | (ops.) varsayılan `https://api.llmapi.ai/v1/embeddings` |
| `EMBED_MODEL` | (ops.) varsayılan `text-embedding-3-small` — **1536 boyut**, migration'daki `VECTOR(1536)` ile eşleşmeli. Farklı bir embedding modeli kullanacaksan hem migration'ı hem bu secret'ı güncelle. |

## 3) `delete-user` + `reset-user` + `send-push` redeploy et
Bu üç fonksiyona kod değişikliği yapıldı (`user_memories` temizliği +
Yaşayan Portre'nin çekirdek okumasının push kopyasına eklenmesi):

```bash
supabase functions deploy delete-user
supabase functions deploy reset-user
supabase functions deploy send-push
```

---

## Doğrulama

1. **Epizodik ingest:** Bir gün özeti (chat_summaries) üretildikten sonra
   `user_memories` tablosunda o kullanıcı için bir `day_summary` satırı oluşmalı.
2. **Epizodik recall:** Sohbette "yine aynı şeyi yaşıyorum" gibi geçmişe atıf
   içeren bir mesaj yaz — yanıt bağlamında `<recalled_memories>` bölümü dolmalı
   (sunucu logunda ya da network isteğinde görülebilir).
3. **Yaşayan Portre:** Birkaç günlük sohbetten sonra Emre'nin Hafızası paneli
   (drawer → EMRE'NİN HAFIZASI) → "EMRE'NİN GÖZÜNDEN SEN" bölümü dolmalı.
4. **Ayna Protokolü + Ayna Anı:** Portrede kör nokta/çelişki birikince (birkaç
   gün), Stüdyo → İÇ DÜNYA → "AYNA ANI" kapısı bir hipotez göstermeli. "Bu Benim"
   → mühür animasyonu + panelde "Doğruladın: ..." satırı; "Bu Ben Değilim" →
   panelde "Yanılmışım: ..." satırı.
5. **Gizlilik:** Ayarlar → hesabı sıfırla/sil → `user_memories`'in de silindiğini
   doğrula (delete-user/reset-user redeploy sonrası).

## Notlar
- Epizodik Hafıza **gerekli değildir** — migration/deploy yapılmazsa `user_memories`
  insert/RPC çağrıları sessizce hata verir (`console.warn`), motor geri kalanı
  (Portre, Ayna) etkilenmeden çalışmaya devam eder.
- `EMBED_DAILY_LIMIT` (60/gün) artık **kalıcı** sayaçla tutulur:
  `supabase/functions/llm-embed/index.ts` → `fn_quota_consume` RPC (kanonik gün
  Europe/Istanbul, `migrations/000_wanderer_schema.sql` içinde). Instance-local
  Map yalnız RPC'ye ulaşılamadığında devreye giren yedek frendir. Admin bilgi
  tabanı yüklemesi (07) kotasız geçer.
- Yeni migration numarası **034** — bu, plan yazıldığı sıradaki varsayılan
  numaraydı (032); araya Benlik Kartı 2.0 (032) ve Kullanım Nabzı (033) girdiği
  için kaydırıldı.
