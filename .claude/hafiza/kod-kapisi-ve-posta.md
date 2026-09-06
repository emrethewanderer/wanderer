---
name: kod-kapisi-ve-posta
description: "Eşik: e-posta + tek kullanımlık kod ZEMİN (şifre yok, 08-27); 08-28 araştırmasıyla Google+Apple kestirmeleri zeminin ALTINA geri geldi; adres hem anahtar hem adres; tanışmada benzersiz kullanıcı adı; posta defteri + Sekme Kalkanı"
metadata:
  type: project
---

**KARAR (Emre, 2026-08-28) — TEK KAPI GENİŞLEDİ: zemin kaldı, kestirme açıldı.**
Sahadaki giriş yöntemleri ölçüldü (Claude · ChatGPT · Character.AI · Replika
birinci elden; sosyal giriş kayıt dönüşümünü %20–35 artırıyor, sosyal
girişlerin ~%75'i Google, Türkiye'de Android >%85). Bulgu: **e-posta zemin
doğruydu, tek kapı yanlıştı** — akrabaların hiçbiri tek kapıda değil ve
hepsinde e-posta kapısı var. Google ve Apple `#auth-adres` panelinin ALTINA,
"ya da" ayracının ardına geri geliyor; **kapı seçim ekranı geri GELMEZ**,
**şifre geri GELMEZ** (parolasız akış kayıt tamamlamada %22–38 önde).
Passkey ertelendi: Supabase desteği 2026-05'te geldi ama beta ve
supabase-js v2.105+ istiyor (repoda ^2.49.1).
Plan: `.claude/plans/sosyal-kapilar.md`.
**Zemin bozulmuyor:** Supabase OAuth kimliğini aynı DOĞRULANMIŞ adresi taşıyan
mevcut kullanıcıya kendi bağlar — Google'da "tek adres tek gerçek" korunur.
**Apple tuzağı:** "Adresimi Gizle" `…@privaterelay.appleid.com` verir, eşleşmez,
İKİNCİ HESAP doğar. **App Store 4.8:** tek kapı muaftı; sosyal kapı eklenince
eşdeğer seçenek şart olur — Sign in with Apple yeterlidir ama zorunlu değildir
(kod kapımız üç kriteri karşılar), yorum inceleme kuruluna kaldığı için Apple
kapısı riski sıfırlar.

**Mimari (sosyal kapılar · `.claude/plans/sosyal-kapilar.md`, 4 faz TAM):**
- Kapılar `#auth-adres` panelinin **İÇİNDE**, `#auth-adres-btn` ile
  `auth.adres.legal` ARASINDA, "ya da" ayracının ardında. Üç kazanç: kod
  paneline geçince kendiliğinden kaybolurlar, tören tek blok oynar ve
  **hukuki cümle üçünü birden kapsar** — rızanın kökeni tek yerde (§6.10).
- **GOTCHA — tören kademesi çocuk sayısına bağlıdır.**
  `#auth-screen.auth-entering #auth-adres > :nth-child(N)` gecikmeleri
  5 çocuğa kadar tanımlıydı; panel 7'ye çıkınca gecikmesiz kalan kapılar
  perde ORTADAYKEN beliriyordu. Kademe 7'ye uzatıldı (…2.16 · 2.24 · 2.34s),
  künye 2.34→**2.44s**'e itildi. Panele doğrudan çocuk eklerken bu tablo da
  güncellenir; `.auth-gates` İÇİNE eklenen öge (Apple dipnotu gibi) sayıyı
  değiştirmez.
- **Ölçü:** eşik 375×812'de zaten 812/812 doluydu; kestirmeler ~175px ekledi.
  Kapılar 577–691 → katlanmanın ÜSTÜNDE. Kısma YALNIZ `.auth-panel-esik`'te
  (kod/tanışma panellerinin nefesi korundu). Taşma kaydırılır, künye erişilir.
- **Tanışma ve rıza için YENİ KOD YAZILMADI** — `_tanismaGerekli` provider'a
  değil PROFİLE bakar, `authTanismaGonder` damgayı zaten basar. FAZ 3 kod
  değil KANIT üretti (`03-auth-shell.js` diff'i sıfır).
- **Native deep-link şeması ZATEN kayıtlı** — `ios/App/App/Info.plist`
  (`CFBundleURLSchemes`) ve `android/…/AndroidManifest.xml` (intent-filter)
  ilk commit'ten beri `com.emretransformation.wanderer` taşıyor. ELLE
  listesine "şemayı ekle" YAZMA; kurulacak olan yalnız sağlayıcı tarafıdır.
- **GOTCHA (08-28 dikiş turu):** söküp geri getirdiğin bir yüzeyde asıl
  kırık KOD değil YORUM olur. 08-27'nin "Google, Apple ve şifre kapıları
  kalktı" yorumları kapılar geri geldikten sonra da duruyordu
  (`_src.html:122`, `03-auth-shell.js:551`) — yanlış yorum sonraki oturumu
  yanlış yönlendirir. Söküm turunda `js + html + css` taranıyordu; geri
  getirme turunda **yorumlar da taranmalı**.
- **GOTCHA:** EN metinlerde `will` ihtimalsel dil kapısına (K7) takılır.
  "Wanderer **will** know you…" → "knows" (TR "tanır" ile örtüşür). Hedefli
  süit bunu görmez, tam süit görür — [[ihtimalsel-dil-devrimi]].
- ELLE bekleyen: Google Cloud Console istemcisi + Apple Services ID +
  Supabase Providers/URL Configuration → `SETUP-SOSYAL-KAPILAR.md`.

**KARAR (Emre, 2026-08-27):** Eşik tek anahtarla açılır. Google, Apple ve
e-posta+şifre kapıları **söküldü**; kapı seçim ekranı da söküldü (tek kapıyı
seçtiren ekran anlamsız). Perde iniyor, altında doğrudan adres soruluyor.

**Kanal değişiminin hikâyesi — önce TELEFON+SMS planlandı.** İki faz o plana
göre yazıldı (`migrations/047`, OTP gövdesi). Sonra sorun görüldü: SMS mesaj
başına ücretlidir ve Türkiye'de ayrıca A2P/başlık kaydı ister. Emre kanalı
e-postaya çevirdi. **Kazanç yalnız maliyet değildi:** telefon planında e-posta
kayıt formunda ayrı ve DOĞRULANMAMIŞ bir alandı — yanlış yazan bülteni hiç
almazdı. Şimdi adres kimliğin kendisi: içeri giren herkesin adresi girdiği anda
doğrulanmış olur. **Tek adres, tek gerçek.**

**Mekanik (`js/parts/03-auth-shell.js` · "KOD KAPISI" bölümü):**
`signInWithOtp({email})` → kod postası → `verifyOtp({email, token, type:'email'})`.
**Giriş ile kayıt AYRILMAZ** — Supabase var olan adresi tanır, olmayanı yaratır;
"yeni misin?" sorusunu kullanıcı değil uygulama cevaplar. Ayrım tek yerdedir:
`initApp`'in `_tanismaGerekli(user, prof)` kapısı (profilde `username` yoksa
ya da `birth_year` yoksa → **Tanışma paneli**: kullanıcı adı + doğum yılı).
E-posta tanışmada SORULMAZ, oturumdan yazılır.

**Ad göçü (§4.3, eski adlar repoda YOK):**
`_authTelE164`→`_authAdresNormal` · `authTelefonAc`→`authAdresAc` ·
`authNumaraDegistir`→`authAdresDegistir` · `authBackToGates`→`authEsigeDon` ·
`_needsAgeGate`→`_tanismaGerekli` · `#auth-tel`→`#auth-adres` ·
`auth.tel.*`→`auth.adres.*` · `#auth-age`→`#auth-tanisma`.
**Ölenler:** `doLogin` `doRegister` `doOAuth` `authHandleOAuthUrl`
`authNativeDeepLinkInit` `NATIVE_OAUTH_REDIRECT` `_openExternal` `_capPlugin`
`_isNativeShell` `doForgotPassword` `sendPasswordReset` `setAuthTab`
`fillAdmin` · 02'nin `trAuthErr` ikizi · 28 i18n anahtarı · `SETUP-NATIVE-OAUTH.md`.

**Kullanıcı adı = GÖRÜNEN AD (K2).** İki ayrı alan yapmak repoda "kullanıcı X
der, kod Y der" çeviri katmanı doğururdu. Benzersizlik büyük/küçük harf
DUYARSIZ (`UNIQUE (lower(btrim(username)))`), ama ad yazıldığı gibi saklanır
ve gösterilir. `user_metadata.full_name` AYNI değerle yazılır — böylece beş
mevcut tüketici (`00-config-tracking:21`, `10-features-w2:809`, `02c-portre:524`,
`10D:686`, `13d-mektup:97`) tek satır değişmeden çalışır.

**Şema `migrations/047_telefon_kimlik_ve_posta.sql` (ELLE bekliyor):**
- `profiles`: `username` · `email` · `bulten_izin_*` (at/kaynak/surum) ·
  `bulten_cikis_*` · `email_sekme_*` (at/tip/sebep)
- `bulten_izin` **GENERATED**'dır — yazılamaz, kökeninden türer. Kökensiz izin
  şemada doğamaz (§6.10). Damgayı client basmaz: `bulten_rizasi_muhru()`
  trigger'ı (adı `z_` ile başlar ki `trg_protect_profile_privileges`'tan SONRA
  koşsun — BEFORE trigger'ları ad sırasıyla koşar).
- `eposta_kampanyalari` · `eposta_akislari` · `eposta_gonderimleri`
- Çifte gönderim KODUN dikkatinde değil ŞEMADA: iki kısmi UNIQUE indeks
  (`kampanya_id,user_id` ve `user_id,akis_anahtar`).
- RPC: `username_musait(p_ad)` (anon, yalnız boolean — sızıntı yok, Türkçe
  harfler regex'te AÇIKÇA yazılı çünkü `[[:alnum:]]` ctype'a bağlıdır) ·
  `bulten_ozet()` (admin sayaçları).

**Motor:** `eposta-gonder` (3 mod: kampanya/akis/sinama) · `bulten-cikis`
(GET onaylar, POST uygular) · `eposta-sekme` (Resend webhook).
Kurulum: `SETUP-KOD-KAPISI-VE-POSTA.md`.


**Admin: iki oda (`js/parts/13C-postane.js`, önek `pst`).**
`switchAdmin('bulten')` — abone kadranı + sayı yaz + önizle + kendine sınama +
GÖNDER (confirm'siz asla) + geçmiş sayılar + gönderim tablosu.
`switchAdmin('posta-akis')` — akış metni/gecikmesi/aç-kapa + "şimdi işlet".
**Yeni akış anahtarı EKLENEMEZ** ve panel bunu söyler: tetikleyici kodda
yaşar, olmayan bir yeteneği göstermek sahte başarıdır.
Kadranda `izinli` ile `gonderilebilir` AYRI durur ve sebebi ekranda yazılıdır.
Modül admin-verili iştir: `pstInit()` 03'ten **`S.isAdmin` kapısıyla** çağrılır
— kapı ithalatın ÖNÜNDEDİR, yoksa admin olmayan herkeste bir `bulten_ozet()`
turu boşa giderdi.
**GOTCHA:** bu repo `iife + inlineDynamicImports` ile derlenir
(`vite.config.js:34`) — dinamik import bundle'ı BÖLMEZ, her şey tek dosyadadır.
Yani statik/dinamik import seçimi byte kazandırmaz; kazanç yalnız ağ turudur.

**Ayarlar > Hesap (07):** adres (salt okunur, kimliğin kendisi), kullanıcı adı,
bülten anahtarı ve sekmiş adres uyarısı. Anahtar `bulten_cikis_at`'a yalnız
YÖN yazar; ekrandaki durum sunucunun döndürdüğü `bulten_izin`'dir — istemci
kendi iyimser değerini yansıtmaz (canlı kanıtlandı: sunucu "izin yok" derken
kullanıcı açmış olsa bile anahtar kapanır).

**Preview harness:** `.claude/harness/hesap-koprusu.html` — Ayarlar>Hesap
oturum gerektirdiği ve K9 gereği preview'da gerçek gönderim yasak olduğu için
supabase-stub üzerinden GERÇEK CSS'le çizer.

İlgili: [[sekme-kalkani]] · [[esik-anon-giris-kapilari]] · [[hukuki-cerceve]] ·
[[gerceklik-mimarisi]] · [[ad-senkronu-kurali]] · [[boot-nabzi]]
