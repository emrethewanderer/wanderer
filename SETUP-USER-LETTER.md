# Kullanıcı Mektubu — Kurulum

Studio kullanıcısı, Mektup sayfasının sol-alt köşesindeki
**"Benim de sana bir mektubum var!"** butonundan **ayda 1 kez**
sana mektup yazıp gönderebilir. Mektup her zaman veritabanına yazılır
(admin paneli "Kullanıcı Mektupları" sekmesinde okunur); hedef e-posta
ve Resend anahtarı kuruluysa o adrese de e-posta olarak iletilir.

## 1) Migration (ELLE)

Supabase SQL editöründe:

```
migrations/000_wanderer_schema.sql
```

Şunları yaratır:

- `user_letters` tablosu (kullanıcı kendi mektubunu okur, admin hepsini okur,
  INSERT/UPDATE yalnız service_role ile yapılır — edge function)
- `user_letter_settings` tek satır tablosu (hedef e-posta; admin okur+yazar)
- `user_letter_status()` RPC — UI etkin/pasif kararı için

## 2) Edge Function

```bash
supabase functions deploy send-user-letter
```

Secrets (Supabase → Edge Functions → Settings → Secrets):

- `RESEND_API_KEY` — [resend.com](https://resend.com) API anahtarı.
  Yoksa mektup yalnız DB'ye yazılır (admin panelden okursun);
  konuldukça arkadan e-posta da iletilmeye başlar.
- `RESEND_FROM` (vars. `Wanderer <postaci@wanderer.app>`) — Resend'de
  doğrulanmış domain üzerinden bir gönderici. Mektubun `reply-to`'su
  otomatik olarak kullanıcının kendi e-postası olur, "Yanıtla" senin için
  doğrudan kullanıcıya yazar.

## 3) Admin Paneli

Wanderer Studio → Yönetim → **MEKTUPLAR** kutusu:

- **Hedef E-Posta** — mektupların geleceği adres (örn. `emre@…`).
  Boş bırakırsan yalnız listede tutulur.
- Alttaki liste — gelen mektuplar (son 100). Her satır kullanıcı adı +
  e-postası + tarih + mektup gövdesi. Sağ üstte ileti durumu:
  - `E-POSTA İLETİLDİ` — Resend'e başarıyla bırakıldı
  - `YALNIZ DB` — e-posta gönderilemedi (sebep: tooltip)

## 4) Kullanıcı Akışı

1. Studio üyesi profil satırına dokunur → Gezgine Mektup açılır
2. Sayfanın sol-alt köşesinde `📬 Benim de sana bir mektubum var! · ayda 1`
3. Tıklayınca ikiz panel: kullanıcı portresi (yoksa baş harf, lapis ova) →
   altın ok → Emre portresi → metin alanı + **GÖNDER**
4. Edge function: Studio kontrolü + aylık 1 kontrolü + insert + Resend
5. Toast: "Mektubun Emre'ye yola çıktı."
6. Bir sonraki ay 1'inde hak yeniden açılır

## 5) Limitler

- **Studio gerekli** (server-side `profiles.is_premium` veya `is_admin`)
- **Ayda 1** (calendar-month, server-side)
- **20 – 6000 karakter** arası gövde
