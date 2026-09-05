---
name: kullanici-mektubu
description: "\"Benim de sana bir mektubum var!\" — Gezgine Mektup'a eklenen ikiz panel; Studio kullanıcısı Emre'ye ayda 1 mektup yazar; e-posta + admin inbox"
metadata: 
  node_type: memory
  type: project
  originSessionId: 39a44bc6-5e92-470d-8c1a-657fa0fbf495
---

Studio kullanıcısına Gezgine Mektup ([[gezgine-mektup]]) sayfasının sol-alt köşesinde "Benim de sana bir mektubum var!" CTA'sı; tıklayınca **ikiz panel** açılır (`kmOpen`): kullanıcının lapis oval portresi (avatar yoksa baş harfler) → altın ok → Emre'nin altın oval portresi → metin alanı + GÖNDER.

**Why:** Mektup tek yönlü değil; kullanıcının Emre'ye doğrudan dönüş kanalı. Studio'ya somut bir armağan eklemek + samimi ilişkinin iki-yönlü olduğunu görsel olarak göstermek.

**How to apply:**
- Modül: `13d-mektup.js` (mevcut dosyaya eklendi — yeni dosya değil, ortak cache/Studio kontrolü için)
- Edge function: `supabase/functions/send-user-letter/index.ts` — JWT + `is_premium` + aylık 1 kontrolü + insert + Resend ileti (best-effort)
- Migration: `migrations/022_user_letters.sql` ELLE — `user_letters`, `user_letter_settings`, `user_letter_status()` RPC
- Admin sekmesi: VİTRİN bloğunda "MEKTUPLAR" (`switchAdmin('user-letters')`); hedef e-posta alanı + son 100 mektup listesi (gönderim durumu badge'i)
- Kurulum belgesi: `SETUP-USER-LETTER.md` (RESEND_API_KEY + RESEND_FROM secret + migration + admin hedef e-posta)
- Limitler: server-side ayda 1 (calendar-month); 20–6000 karakter; Studio şartı (server'da `profiles.is_premium`/`is_admin`)
- CSS: `.mektup-reply-btn` (sol-alt, altın kontur, scroll'a +96px padding) + `.km-*` ikiz panel (z:10600, mektup'tan üstte)
