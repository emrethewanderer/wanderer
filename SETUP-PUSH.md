# Web Push Kurulumu — "Her An Geri Çekme" Motoru (10x)

Bu özellik **gerçek Web Push**: uygulama kapalıyken bile kullanıcıyı akıllı bir
tetik merdiveni + kişisel LLM metniyle geri çağırır. Repo tarafı hazır; aşağıdaki
**4 adımı Supabase'de elle** yapman gerekiyor (proje konvansiyonu: migration'lar elle).

> VAPID public key zaten `js/config.js` içinde (`VAPID_PUBLIC`). **PRIVATE key** asla
> repoya konmaz — sohbette sana ayrıca verildi, onu sadece Supabase secret'ına gir.

---

## 1) Migration'ı uygula
Supabase → SQL Editor → `migrations/000_wanderer_schema.sql` içeriğini çalıştır.
Tablolar: `push_subscriptions`, `user_engagement`, `notification_log` (hepsi RLS'li).

## 2) Edge Function secret'larını gir
Supabase → Edge Functions → **Secrets**:

| Secret | Değer |
|---|---|
| `VAPID_PUBLIC_KEY` | `js/config.js`'teki `VAPID_PUBLIC` ile **aynı** değer |
| `VAPID_PRIVATE_KEY` | (sohbette verilen private key) |
| `VAPID_SUBJECT` | `mailto:admin@emrekocluk.com` |
| `CRON_SECRET` | rastgele uzun bir dize (cron çağrısını doğrular) |
| `OPENROUTER_API_KEY` | LLM kişiselleştirme için (llm-chat ile aynı sağlayıcı anahtarı). Boş bırakırsan deterministik şablon metin kullanılır. |
| `LLM_MODEL` | (ops.) varsayılan `google/gemini-2.0-flash-001` |
| `LLM_API_URL` | (ops.) varsayılan OpenRouter chat completions |

`SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` otomatik mevcuttur.

## 3) Fonksiyonu deploy et
```bash
supabase functions deploy send-push
```

## 4) pg_cron ile motoru zamanla (30 dakikada bir)
Supabase → SQL Editor (extension'lar kapalıysa önce aç):
```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 30 dakikada bir motoru çağır. <PROJECT_REF> ve <CRON_SECRET> değerlerini doldur.
select cron.schedule(
  'send-push-engine',
  '*/30 * * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body    := jsonb_build_object('mode', 'engine')
  );
  $$
);
```
İptal/değiştirme: `select cron.unschedule('send-push-engine');`

---

## Doğrulama
1. **Abonelik:** Uygulamada (HTTPS) Ayarlar → Bildirimler → "Bildirimleri aç" → izin ver.
   `push_subscriptions` tablosunda satır oluşmalı.
2. **Uçtan uca test:** Ayarlar → "Bildirimi Test Et" → cihazına gerçek push düşmeli.
3. **Motor:** `mode:'engine'` çağrısını cron'la (veya elle, x-cron-secret header'ıyla)
   tetikle; `notification_log`'a kayıt + teslim gözle.
4. **Admin toplu bildirim:** Yönetim → Bildirimler sekmesi → başlık/metin → gönder.

## Notlar
- **iOS:** Web push yalnızca **Ana Ekrana eklenmiş** PWA'da çalışır (banner zaten var).
  Android/Masaüstü Chrome·Edge·Firefox'ta doğrudan çalışır.
- **Sıklık:** Motor "Dengeli·Akıllı" — günde max 1-2, öncelik merdiveni
  (geri-çağırma > seri-riski > söz > kilometre > sabah), sessiz saat (varsayılan 23–08),
  min 4 saat aralık, aynı tip 24 saatte bir.
- **VAPID çiftini yenilersen** hem `config.js`'teki public'i hem secret'ları güncelle;
  eski aboneliklerin yenilenmesi gerekir.
