---
name: gelistirme-hesabi-preview-oturumu
description: "Preview'da geliştirme hesabıyla (emrethewanderertr@gmail.com) açılmış GERÇEK oturum kalıcıdır; parola hiçbir yere yazılmaz, oturum düşerse girişi Emre yapar"
metadata:
  type: project
---

Emre 2026-08-21'de geliştirmeye ayrı bir hesap açtı: **emrethewanderertr@gmail.com**
(uid `23e1419e-1e25-4b04-9bb9-c0d4774dafd8`). Preview (`localhost:3030`,
bkz. [[preview-sw-bayat-modul]]) bu hesapla **giriş yapılmış** durumdadır ve
oturum `localStorage`'daki `sb-utfphfifkgfrrsifrzjc-auth-token` anahtarında
kalıcıdır — reload oturumu düşürmez, `supabase-js` erişim jetonunu kendi
yeniler.

**Parola kuralı — pazarlıksız.** Parolayı bir forma, koda, teste, hafızaya ya
da commit'e YAZMAM; Emre sohbette verdiyse de yazmam. Oturum bir gün düşerse
(refresh token süresi dolar, `sb-*` anahtarı silinir) giriş **Emre'nin
elidir**: preview penceresinde `#login-email` + `#login-password` alanlarını o
doldurur, `doLogin()` çalışır, oturum yine kalıcı olur. Bu bir engel değil,
tek seferlik bir adımdır — sonrasında bütün sprint o oturumla doğrulanır.

**How to apply:** Oturumun canlı olduğunu doğrulamak için preview'da
`localStorage.getItem('sb-utfphfifkgfrrsifrzjc-auth-token')` içindeki
`user.email` ve `expires_at`'e bak (jetonun kendisini loglama, dışarı
gönderme). Hesabın **yeni** olduğunu unutma: tablolarda satır çoğu yerde
henüz yok, yani boş desteler ve boş defterler kırık değil **veri yokluğudur**
— [[kanit-bekleyen-alanlar]]'ın davet dili tam da burada sınanır. Veri
gerektiren doğrulamada ya uygulamayı kullanarak gerçek veri üret ya da
[[preview-harness-anon-oturum]]'daki harness'la tohumla.

İlgili: [[preview-harness-anon-oturum]] · [[preview-sw-bayat-modul]] ·
[[kanit-bekleyen-alanlar]]
