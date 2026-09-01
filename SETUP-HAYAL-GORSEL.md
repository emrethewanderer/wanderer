# SETUP — Hayalini Resmet (üretken görsel)

Hayal Âlemi sahnesini gerçek bir tabloya çeviren özellik. **Elle yapılacaklar:**

## 1. Edge function deploy

```bash
supabase functions deploy hayal-gorsel
```

## 2. Secrets (Supabase Dashboard → Edge Functions → Secrets)

| Secret | Değer | Not |
|---|---|---|
| `OPENROUTER_API_KEY` | `sk-or-...` | send-push ile AYNI anahtar kullanılabilir; zaten tanımlıysa atla |
| `IMAGE_MODEL` | (opsiyonel) | vars. `google/gemini-2.5-flash-image-preview`; değiştirmek istersen OpenRouter'da görüntü üreten herhangi bir model |
| `ALLOWED_ORIGIN` | (opsiyonel) | vars. `*` |

## 3. Bucket

Yeni bucket GEREKMEZ — görseller mevcut **`chat-images`** bucket'ına
(`hayal/<uid>/<sceneId>.jpg`) yüklenir (SETUP-LLM-CHAT.md'de kurulmuştu).
O kurulum yapılmadıysa önce onu yap.

## 4. Davranış / maliyet

- Buton yalnız **Studio** (S.isPremium) kullanıcılarında çalışır; değilse spotlight açılır.
- Sahne başına **1 görsel** (image_url doluysa buton görünmez).
- Edge tarafında kullanıcı başına **günde 2** üretim freni var (instance-local, kaba).
- Görsel client'ta 896px JPEG'e küçültülüp bucket'a yazılır; SafeStorage'a base64 yazılmaz.

## 5. Test

1. Studio hesabıyla bir Hayal Seansı mühürle → Hayal Âlemi haritasından sahneyi aç.
2. "HAYALİNİ RESMET" → ~5-15 sn → kart görselle yeniden çizilir.
3. Hata durumunda toast mesajı + console'da `haResmet:` logu.
