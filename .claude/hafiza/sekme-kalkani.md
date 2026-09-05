---
name: sekme-kalkani
description: "GOTCHA 2026-08-27: doğrulama sırasında uydurma adreslere gerçek kod postası gitti → hard bounce → Supabase gönderim ayrıcalığı uyarısı. Üç kural + kalıcı kalkan katmanı"
metadata:
  type: feedback
---

**Ne oldu.** Kod kapısının başarı yolu preview'da doğrulanırken `emre@ornek.com`
ve `gecerli.adres@ornek.com` adreslerine üç **gerçek** kod postası gönderildi.
İkisi de var olmayan kutuydu → hard bounce. Supabase'in yerleşik posta servisi
paylaşımlı bir altyapıdır ve sekme oranı yükselince gönderim ayrıcalığını kısar:
*"Email Sending Privileges at risk due to Bounce Backs"* uyarısı geldi. Yani
kapı doğrulanırken kapının itibarı harcandı — ve bunu fark eden ben değil Emre
oldu.

**Why:** Teslimat itibarı bir kez harcanır ve geri kazanılması pahalıdır.
Aynı risk bültende çok daha büyüktür: sekmiş adreslere toplu posta göndermek
bir alan adının itibarını topluca yakar.

**How to apply:**

1. **Doğrulama GERÇEK GÖNDERİM TETİKLEMEZ.** Ağ sınırına kadar doğrula, orada
   dur. Birim testi stub'la koşar; preview'da `authKodIste`'yi gerçek adresle
   çağırma. Başarı yolu sınanacaksa Emre'nin KENDİ kutusuyla, bir kez.
   Uydurma adres güvenli değildir — `ornek.com` gerçek bir alan adıdır,
   RFC-ayrılmış `example.com` bile bounce üretir.
2. **Yerleşik posta servisi üretim değildir.** Paylaşımlıdır, saatte birkaç
   postayla sınırlıdır ve ölçüldü: tek `signInWithOtp` çağrısı **12.1 sn**.
   Özel SMTP (Resend) ELLE listesinin BİRİNCİ maddesidir.
3. **Sekme kalıcı bir olgudur, listede yaşar.** `profiles.email_sekme_*`
   (047 §1.1) + `eposta-sekme` webhook'u + gönderim sorgusunun ÜÇÜNCÜ koşulu
   (`email_sekme_at IS NULL`, indeksin içinde). Soft bounce kalkan DEĞİLDİR —
   üçüncü sekmeye kadar `email_sekme_at` boş kalır; şikâyet hard'dan da kesindir.

**Riza ≠ teslim edilebilirlik.** İkisi ayrı köken (§6.10): izin kullanıcının
BEYANI, sekme sağlayıcının ÖLÇÜMÜ. Kullanıcı razı olabilir ve adresi yine de
ölü olabilir. Bu yüzden ayrı alanlar, ayrı sayaç (`izinli` vs `gonderilebilir`)
ve `bulten_rizasi_muhru()` trigger'ında sekme alanları client'a KAPALI —
ölçümü beyana çevirmek kalkanı deler.

**Eşikteki ucuz ön kapı:** `_authAdresSupheli(adres)` — `gmial.com`,
`hotmial.com`, `.con` gibi yaygın yazım hatalarını yakalar ama **ENGELLEMEZ,
SORAR** ("Şunu mu demek istedin: …"). İkinci basış onaydır. Engellemek yanlış
olurdu: liste asla tam değildir ve gerçek bir adresi reddetmek, sekmiş bir
adresten pahalıdır. Soru eki `Şunu`ya bağlanır — `{oneri} mi` yazılsaydı
uzantıya göre ünlü uyumu bozulurdu (.com→mu, .net→mi).

**RFC 8058 — tek-tık çıkış BAŞLIĞI teslimatın parçasıdır.** Gmail ve Yahoo
toplu gönderenden bunu ZORUNLU tutar. Ayrıca çıkış zorlaşırsa kullanıcı "spam
bildir"e basar ve şikâyet hard bounce'tan ağır bir sinyaldir.
**GOTCHA:** çıkış bağı GET'te doğrudan çıkarmamalı — kurumsal e-posta
tarayıcıları (Microsoft Safe Links) bağları kullanıcı tıklamadan GET'ler ve
aboneler haberi olmadan listeden düşer. Doğru tasarım: **GET onay sayfası
gösterir, POST uygular.**

İlgili: [[kod-kapisi-ve-posta]] · [[kullanici-mektubu]] (Resend deseni) ·
[[gerceklik-mimarisi]] · [[hukuki-cerceve]]
