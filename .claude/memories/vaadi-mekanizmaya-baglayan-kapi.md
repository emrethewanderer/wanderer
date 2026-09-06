---
name: vaadi-mekanizmaya-baglayan-kapi
description: Bir plan cümlesi 8b'nin kilidini "çözüldü" ilan etti, kod o çağrıyı hiç almadı — ve gizlilik metnine yazılacak "90 gün sonra silinir" cümlesi ölçülebilir bir yalan olacaktı; kapı artık VAADİ mekanizmaya bağlıyor
type: karar
---

# Vaadi mekanizmaya bağlayan kapı — kullanıcıya verilen söz, koda bağlanır

Ölçüldü: **2026-09-06**, İç Çalışma FAZ 8b.

## Olay

Zincir üç fazdı ve her biri kendi içinde doğruydu:

- **FAZ 6** `usage_events_prune(90)` fonksiyonunu yazdı — çağrılabilir,
  `SECURITY DEFINER`, `service_role`'a açık.
- **FAZ 8a** gizlilik metnine saklama cümlesini yazmayı REDDETTİ, çünkü
  fonksiyonu çağıran hiçbir yer yoktu: *silen bir şey yok.*
- **2026-09-06** planı kilidin *"çözüldüğünü"* yazdı — `send-push` zaten
  pg_cron ile 30 dakikada bir koşuyor, motorun kendisi prune'u çağırsın.

Üçüncü adım **bir karardı, bir kod değildi.** Cümle geçmiş zamanda
yazılmıştı ("motorun kendisi günde bir kez çağırır"), ve `send-push`'ta o
çağrı hiç yoktu. Plan ile kod ayrıştı; kimse yalan söylemedi
([[rapor-bayatligi]]).

## Why — bedeli neden ağır

Öteki plan/kod ayrışmaları bir işi geciktirir. Bu ayrışmanın bedeli
**kullanıcıya söylenen bir yalandı**: bir sonraki tur planı okuyup 8b'yi
açsaydı, gizlilik politikasına *"kullanım ölçümleri 90 gün sonra silinir"*
yazılacak, silen hiçbir şey koşmayacaktı. Bir gizlilik politikası bir
taahhüttür; tutulmayan taahhüt bir metin hatası değil bir **uyum
açığıdır** (§6.2 · §6.5).

Ve tam olarak bu sınıf ölçülemiyordu: metni yazan test, mekanizmayı
sormuyordu.

## Karar

**Kapı, vaadi mekanizmaya bağlar.** `tests/saklama-vaadi-kapisi.test.js`
üç şeyi BİRLİKTE tutar — biri düşerse öteki ikisi anlamsızdır:

1. `usage_events_prune` `service_role`'a açık (motorun kimliği),
2. `send-push` onu GERÇEKTEN çağırıyor (mekanizma),
3. **gizlilik metni saklama süresi vaat ediyorsa (1) ve (2) ŞART.**

Üçüncüsü kapının kalbidir: cümle yazılmadan kapı sessizdir (vaat yoksa
tutulacak bir şey de yok), cümle yazıldığı an mekanizmayı zorunlu kılar.
**FAZ 8b'yi mekanizmasız açmak artık mümkün değil.**

Kapının değeri ölçüldü: düzeltmeden önceki ağaca karşı koşuldu, kırmızı
bastı.

## How to apply

- **Uygulamanın kullanıcıya verdiği her SÜRELİ ya da MUTLAK söz** ("silinir",
  "paylaşılmaz", "yalnız sen görürsün") bir mekanizmaya sahiptir; o
  mekanizmayı arayan bir test yaz ve **sözün metnini teste kilitle**.
  Desen, cümlenin harfini değil **iddiasını** aramalı (biçim değişince
  sahte kırmızı verme).
- **Bir plan cümlesi geçmiş zamanda yazılıysa, koda karşı grep'le.**
  "Çözüldü / yapıldı / eklendi" diyen her satır bir kanıt ister; planın
  durum satırı olduğu gibi kullanılmaz (§3.7 madde 1).
- **Sıra kısıtı ELLE defterine yazılır.** Burada yön tersine döndü: artık
  vaat ağaçta, mekanizma deploy bekliyor — `send-push` redeploy edilmeden
  uygulama yayınlanırsa aynı yalan, yalnız öbür yönden çıkar.

## İz

`supabase/functions/send-push/index.ts` → `pruneGunluk()`, `runEngine`'in
ilk adımı, saat 04 penceresi (cron kayarsa dar bir pencere hiç tutmayabilir;
fonksiyon idempotent olduğu için iki çağrı zararsız). Yeni cron, yeni sır,
yeni kurulum YOK — var olan motor yeniden kullanıldı (§1.3).

Bağlar: [[rapor-bayatligi]] · [[kapinin-kendisi-yalan-soyleyebilir]]
