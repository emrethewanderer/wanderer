---
name: kod-kapisi-ve-posta
description: Eşikte adres hem anahtar hem adrestir — e-posta+kod (signInWithOtp/verifyOtp) şifre istemez ve aynı hamlede DOĞRULANMIŞ bir posta adresi kazandırır; Google/Apple kestirmeleri aynı tanışma kapısına düşer, ikisi de ELLE kuruluma bağlıdır
type: karar
---

# Kod Kapısı ve Posta — "adres hem anahtar hem adres"

> **Bu dosya hakkında.** `SETUP-SOSYAL-KAPILAR.md:7` bu ada
> `[[kod-kapisi-ve-posta]]` diye bağ veriyordu; hedef dosya
> `.claude/memories/` altında yoktu. Özgün dosya repoya hiç girmedi
> ([[claude-altyapisi-commit-disi]]); **bu metin kurtarma değildir**, bugünkü
> koddan yeniden keşifle yazıldı. Kararın kendisi
> `js/parts/03-auth-shell.js:34-68` banner'ında Emre'nin ağzından duruyor —
> aktarılan şey çıkarım değil alıntıdır (K3).
>
> **Not:** kurulum adımları burada TEKRARLANMAZ — onlar
> `SETUP-KOD-KAPISI-VE-POSTA.md` ve `SETUP-SOSYAL-KAPILAR.md`'de yaşıyor ve
> ikisi de repoda mevcut. Bu dosya **kararı** ve tuzaklarını tutar.
>
> **Kayıp olan:** kararın alındığı tur; şifreli girişin ne zaman ve nasıl
> elendiği repodan okunamıyor.

**Why:** Eşiğin tasarımı iki kazancı tek hamlede alır. Banner'ın kendi
sözleriyle:

> *"Eşik kimlik ödünç almaz ve hatırlanacak bir şey istemez. Google'ın kimliği
> Google'ın, Apple'ınki Apple'ın; şifre ise unutulur ve 'şifremi unuttum' her
> seferinde bir kayıp kapısı açar. Kullanıcı yalnız adresini bırakır, kod
> gelir, içeri girer."*

**İkinci kazanç asıl olandır** ve adın "posta" yarısı buradan gelir:

> *"Wanderer'ın kullanıcıya uygulamanın DIŞINDAN da yazabilmesi için zaten bir
> adrese ihtiyacı vardı; adresi kayıt formunda ayrı bir alan olarak sormak
> DOĞRULANMAMIŞ bir adres toplamaktı — yanlış yazan bülteni hiç almaz, kimse
> de fark etmezdi. Burada adres kimliğin KENDİSİDİR: içeri giren herkesin
> adresi, girdiği anda doğrulanmış olur. **Tek adres, tek gerçek.**"*

**Mekanik:** `signInWithOtp({email})` → kod postası → `verifyOtp({email,
token})` → oturum (`03-auth-shell.js:200`, `:326`). **Giriş ile kayıt
ayrılmaz** — Supabase var olan adresi tanır, olmayanı yaratır; *"'Yeni misin?'
sorusunu kullanıcı değil uygulama cevaplar"*: profilde ad yoksa tanışma paneli
açılır. Kestirmeler (`doOAuth(provider)`, `:401`) farklı bir yol değil, aynı
kapıya çıkan ikinci bir giriştir — dönüşü web'de 14-boot'un `getSession`'ı,
native'de `authHandleOAuthUrl` (`:429`) devralır ve *"ikisi de aynı
DOĞRULANMIŞ adres üstünden yukarıdaki tanışma kapısına düşer."*

**How to apply:**

## 1 · Bu kapı ELLE kuruluma bağlıdır — kod hazır olması "çalışıyor" demek değil (§6.5)

Banner üç ELLE maddesi sayar ve üçü de sessiz değil **gürültülü** başarısız
olur:

- **Magic Link şablonu `{{ .Token }}` içermelidir** — Supabase'in varsayılan
  şablonu **BAĞ** gönderir, kod değil. Şablon düzeltilmezse kullanıcı kod
  panelinde bekler, eline kod hiç geçmez.
- **Yerleşik e-posta servisi üretim için değildir** (saatte birkaç posta);
  özel SMTP bağlanmadan kapı hız sınırına toslar.
- **OAuth sağlayıcıları** Supabase Dashboard'da açılmadan (ve Apple için
  Developer'da Services ID + Return URL kurulmadan) `doOAuth` **hata döner**.

`SETUP-SOSYAL-KAPILAR.md:11-15` bir sıra kuralı daha koyar: **Google ve Apple
BİRLİKTE açılmalı.** Yalnız Google açılırsa Apple kapısı ekranda görünüp hata
döner ve App Store İnceleme Kuralı 4.8 riske girer.

## 2 · Adres alanına ikinci bir kaynak açma

"Tek adres, tek gerçek" bir slogan değil bir kısıttır: bülten/posta için ayrı
bir e-posta alanı eklemek, doğrulanmamış bir adres havuzu üretir ve kararın
tam olarak engellediği şeydir. Adres `auth.users.email`de yaşar; `_adres`
yalnız kod paneli açıkken bellekte durur (`03-auth-shell.js:79`).

## 3 · Doğrulama, kodu İSTEYEN adrese karşı yapılır

`verifyOtp` çağrısı `_adres`i kullanır, ekrandaki güncel alanı değil —
*"kullanıcı arada alanı değiştirse bile doğrulama, kodun gerçekten
gönderildiği adrese karşı yapılmalıdır"* (`:76-78`). Kod paneline dokunan
her değişiklikte bu ayrımı koru.

## 4 · Bekleme sayacı bir nezaket değil, bir tampon

`KOD_BEKLEME_SN = 60` sağlayıcının kendi hız sınırının önünde durur:
*"kullanıcıyı o duvara TOSLAMADAN önce durdurur — hata mesajı yemek yerine ne
kadar bekleyeceğini görür."*

İlgili: [[ilham-kartlari-sosyal-feed]] (aynı oturumun anonim rumuzu — sosyal
yüzeyde adres asla görünmez)
