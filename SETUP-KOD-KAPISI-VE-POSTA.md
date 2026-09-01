# Kod Kapısı + Posta Defteri — Kurulum

Eşik artık tek anahtarla açılıyor: e-posta adresi ve ona gelen kod. Aynı
adres, kayıt anında bülten için de kullanılıyor — bu belge her ikisinin de
ELLE (Supabase Dashboard'dan) yapılması gereken adımlarını taşır.

**Not (2026-08-28):** bu zemin artık tek kapı değil — Google ve Apple
kestirmeleri de eklendi (`#auth-adres` panelinin altında). Onların ELLE
kurulumu (Cloud Console, Apple Developer, Supabase Providers) ayrı belgede:
`SETUP-SOSYAL-KAPILAR.md`.

**Sıra önemli.** Madde 1'i atlayıp doğrudan 3'e geçme — kapı Supabase'in
paylaşımlı posta servisiyle de çalışır ama hem yavaştır hem itibar riski
taşır (aşağıda gerekçesi var).

---

## 1) Özel SMTP (Resend) bağla — ACİL, İLK MADDE

**Neden acil:** Supabase'in yerleşik posta servisi (`smtp.supabase.co`)
**paylaşımlıdır** — üretim trafiği için tasarlanmadı, saatte birkaç postayı
kaldıracak şekilde sınırlıdır ve sekme oranı ayrıcalığı kısar. Bu bir
tahmin değil, ölçülmüş bir olgu:

- **2026-08-27'da**, eşiği doğrularken uydurma test adreslerine (`emre@ornek.com`
  gibi var olmayan kutular) üç gerçek kod postası gönderildi → hard bounce →
  Supabase panelinden **"Email Sending Privileges at risk due to Bounce
  Backs"** uyarısı geldi.
- Aynı gün ölçülen **tek `signInWithOtp` çağrısı 12.1 saniye sürdü** —
  kodun değil, yerleşik posta servisinin gecikmesi. Kullanıcı "kod gönder"e
  bastığında 12 saniye kilitli bir buton görüyor.

Özel SMTP bağlanmadan bu proje üretime çıkmamalı.

**Adımlar:**

1. [resend.com](https://resend.com) hesabı aç (zaten varsa atla — Gezgine
   Mektup ve Kullanıcı Mektubu zaten Resend kullanıyor).
2. Domain'ini Resend'de doğrula (DNS kayıtları — Resend paneli adım adım
   gösterir).
3. Supabase Dashboard → **Project Settings → Auth → SMTP Settings** →
   "Enable Custom SMTP" aç:
   - Host: `smtp.resend.com`
   - Port: `465` (SSL) ya da `587` (TLS)
   - Username: `resend`
   - Password: Resend API anahtarın (aşağıdaki `RESEND_API_KEY` ile AYNI
     anahtar kullanılabilir)
   - Sender email: doğruladığın domain üzerinden bir adres (örn.
     `postaci@wanderer.app`)
4. Kaydet. Bir sonraki kod isteği artık Resend üzerinden, saniyenin
   altında gitmeli.

---

## 2) E-posta şablonları — `{{ .Token }}` (ELLE, kritik · İKİ ŞABLON)

Supabase'in varsayılan e-posta şablonları bir **bağ** gönderir
(`{{ .ConfirmationURL }}`). Kod kapısı bir **altı haneli kod** bekliyor —
şablon değiştirilmezse kullanıcı bir bağ alır, uygulama hiçbir zaman
gelmeyen bir kodu beklemeye devam eder.

Kural tek cümledir: **şablonda `{{ .ConfirmationURL }}` varsa bağ gider,
`{{ .Token }}` varsa kod gider.** İkisi birden duruyorsa posta ikisini de
taşır ve kullanıcı elinin altındaki bağa basar — kodu hiç görmez. Bu yüzden
`{{ .Token }}` eklemek YETMEZ, `{{ .ConfirmationURL }}` satırı **kaldırılır**.

**İki şablon düzeltilir, biri değil.** `signInWithOtp({email})` hangi
şablonu kullanacağını adrese göre seçer:

| Adres | Devreye giren şablon |
|---|---|
| Daha önce girmiş kullanıcı | **Magic Link** |
| İlk kez gelen adres (kayıt) | **Confirm signup** |

Yalnız Magic Link düzeltilirse mevcut kullanıcı kod alır, **yeni kullanıcı
bağ alır** — yani kapı tam da ilk izlenimde kırılır. Giriş ile kayıt bizde
ayrılmadığı için (bkz. `03-auth-shell.js` "KOD KAPISI") bu ayrımı kullanıcı
değil Supabase yapar, ve iki şablonda da aynı düzeltme gerekir.

Supabase Dashboard → **Authentication → Email Templates**, sırayla
**Magic Link** ve **Confirm signup** sekmeleri için:

- Gövdeden `{{ .ConfirmationURL }}` içeren satırı/bağı **kaldır**.
- Yerine `{{ .Token }}` koy (örnek: `Kodun: {{ .Token }}`).
- **Her sekmeyi ayrı kaydet** — Dashboard şablonları tek tek kaydeder,
  bir sekmede yapılan değişiklik ötekine geçmez.

**Doğrulama:** hiç kullanılmamış bir adresle kod iste (Confirm signup yolu),
sonra aynı adresle bir kez daha iste (Magic Link yolu). İkisinde de altı
haneli kod gelmelidir.

---

## 3) Migration 047 (ELLE)

Supabase SQL editöründe çalıştır:

```
migrations/047_telefon_kimlik_ve_posta.sql
```

Şunları kurar (idempotent — tekrar çalıştırmak güvenli):

- `profiles`'a kimlik + rıza alanları: `username`, `email`, `bulten_izin*`
  (GENERATED — kökeni olmayan izin şemada doğamaz), `bulten_cikis*`,
  `email_sekme*`
- `eposta_kampanyalari` · `eposta_akislari` (iki tohum satırla: `hos_geldin`,
  `geri_cagri` — ikisi de `aktif=false` doğar, metni yazılmadan açılmaz) ·
  `eposta_gonderimleri` (idempotent gönderim defteri)
- RPC'ler: `username_musait()` · `bulten_ozet()`
- Rızanın mührü: `bulten_rizasi_muhru()` trigger'ı (anı/kaynağı sunucuda
  damgalar — client'ın saatine güvenilmez)

Migration `public.profiles IS NULL` kapısından geçer — tablo yoksa
sessizce atlar, hata vermez.

---

## 4) Üç edge fonksiyonu deploy et

```bash
supabase functions deploy eposta-gonder
supabase functions deploy bulten-cikis --no-verify-jwt
supabase functions deploy eposta-sekme --no-verify-jwt
```

`bulten-cikis` ve `eposta-sekme` `--no-verify-jwt` ile deploy edilir —
ikisi de kendi doğrulamasını taşır (biri HMAC imzasıyla, biri Resend'in
svix imzasıyla); Supabase'in kendi JWT kapısı devrede olursa oturumsuz
tıklanan çıkış bağı ve sunucudan gelen webhook 401 alır.

`eposta-gonder` normal deploy edilir — admin JWT kontrolünü kendi içinde
yapıyor ama Supabase'in JWT doğrulaması ilk kapı olarak da faydalı
(anonim istekleri fonksiyona hiç girmeden reddeder).

---

## 5) Secrets (Supabase → Edge Functions → Settings → Secrets)

| Secret | Değer | Not |
|---|---|---|
| `RESEND_API_KEY` | Resend API anahtarı | zaten varsa aynısı kullanılabilir |
| `RESEND_FROM` | örn. `Wanderer <postaci@wanderer.app>` | Resend'de doğrulanmış domain |
| `BULTEN_CIKIS_SECRET` | uzun rastgele bir dize (örn. `openssl rand -hex 32`) | çıkış bağının HMAC anahtarı — **eposta-gonder VE bulten-cikis'te AYNI değer** olmalı |
| `RESEND_WEBHOOK_SECRET` | Resend panelinden — aşağıdaki madde 6 | biçimi `whsec_...` |
| `LIST_UNSUB_MAILTO` | *(opsiyonel)* örn. `bulten-cikis@wanderer.app` | RFC 8058 başlığının ikinci kanalı; verilmezse varsayılan kullanılır. Bu adrese gelen postayı okumana gerek yok — bazı e-posta istemcileri yalnız bu kanalı okuduğu için var. |

`RESEND_API_KEY` tanımlı değilse `eposta-gonder` alıcıları yine de deftere
"kuyrukta" olarak yazar (niyet kaybolmaz) ama gerçek gönderim yapmadan hata
döner — secret eklenince bir sonraki koşu kaldığı yerden gönderir.

---

## 6) Resend webhook'unu `eposta-sekme`'ye bağla

1. [resend.com/webhooks](https://resend.com/webhooks) → **Add Webhook**.
2. Endpoint URL:
   ```
   https://<PROJE-REF>.supabase.co/functions/v1/eposta-sekme
   ```
3. Dinlenecek olaylar (yalnız bunlar gerekli):
   - `email.bounced`
   - `email.complained`
   - `email.delivered`
4. Kaydettikten sonra Resend sana bir **Signing Secret** gösterir
   (`whsec_...` ile başlar) — bunu `RESEND_WEBHOOK_SECRET` olarak madde
   5'teki secrets listesine ekle.

İmzasız/hatalı imzalı her istek `eposta-sekme` tarafından **401** ile
reddedilir — aksi hâlde herkes istediği adresi bülten listesinden
düşürebilirdi.

---

## 7) Kullanıcı silme (Emre'nin eli — geri alınamaz)

Eski kapıların sökümüyle (bu planın FAZ 5'i) birlikte `auth.users`'daki
e-posta+şifre ile açılmış hiçbir hesap otomatik silinmiyor — "silebilirsin"
kararı yalnız kapının kaldırılması için, hesapların kendisi için değil.
Aktif e-posta+şifre hesabı yoksa (Emre'nin 2026-08-27 teyidi) bu madde
boş kalabilir; varsa Supabase Dashboard → Authentication → Users'tan elle
silinir.

---

## Doğrulama (sen yapınca)

- SQL editöründe: `SELECT public.bulten_ozet();` — admin oturumunda JSONB
  sayaçlar dönmeli.
- Bir test kampanyası oluştur (admin panel, FAZ 7 sonrası), kendine
  `sinama` gönder — Resend panelinde gönderim görünmeli, e-posta gelmeli.
- Postanın altındaki "Bültenden çık" bağına tıkla — obsidyen "Çıktın."
  sayfası açılmalı, `profiles.bulten_cikis_at` dolmalı.
- Resend panelinden test bir bounce tetikle (ya da gerçek bir hard bounce
  bekle) — `profiles.email_sekme_at` dolmalı, `eposta_gonderimleri` satırı
  `durum='sekti'` olmalı.
