# Sosyal Kapılar (Google · Apple) — Kurulum

Eşik artık üç kapı taşıyor: e-posta+kod (zemin) ve altında Google ile Apple
(kestirme). Kod tarafı **TAM** — `doOAuth('google'|'apple')` çalışıyor,
dönüş yolu (`authHandleOAuthUrl`, native deep-link) yazılı, tanışma paneli ve
bülten rızası OAuth ile gelen kullanıcıyı da mevcut kapıdan geçiriyor
([[kod-kapisi-ve-posta]], `.claude/plans/sosyal-kapilar.md` FAZ 1–3, hepsi
✅ bitti + denetlendi). **Eksik olan tek şey bu belgedeki adımlar** —
Google ve Apple sağlayıcıları Supabase Dashboard'da açılmadan kapılara
basıldığında hata döner, sessizce değil.

**Sıra önemli — ikisi BİRLİKTE açılmalı, yalnız Google değil.** Gerekçesi
madde 5'te (App Store 4.8): Google eklenip Apple kapalı bırakılırsa hem
Apple kapısı ekranda görünüp hata döner, hem de mağaza incelemesi riske
girer. Aşağıdaki 1 ve 2'yi aynı oturumda bitir.

---

## 1) Google — Cloud Console + Supabase

**a) Google Cloud Console'da OAuth istemcisi oluştur**

1. [console.cloud.google.com](https://console.cloud.google.com) → bir proje
   seç (veya yeni proje aç).
2. **APIs & Services → OAuth consent screen** — henüz kurulmadıysa: User
   type "External", uygulama adı "Wanderer", destek e-postası kendi
   adresin. Kaydet.
3. **APIs & Services → Credentials → + Create Credentials → OAuth client ID**.
4. Application type: **Web application**.
5. **Authorized JavaScript origins** — ikisini de ekle:
   - `http://localhost:3030` (preview/geliştirme origin'i)
   - üretim web origin'in (uygulamayı hangi domain'de yayınlıyorsan — bu
     repoda sabit bir prod domain tanımlı değil, kendi deploy adresini yaz)
6. **Authorized redirect URIs** — Supabase'in sabit callback adresi:
   ```
   https://utfphfifkgfrrsifrzjc.supabase.co/auth/v1/callback
   ```
   (bu adres `js/config.js:14`'teki `SUPABASE_URL`'den türer, proje
   değişmedikçe sabittir — Google konsoluna başka bir adres yazma.)
7. Oluştur → **Client ID** ve **Client Secret** görünür, kopyala.

**b) Supabase Dashboard'a gir**

Supabase Dashboard → **Authentication → Providers → Google**:

- Aç (toggle).
- **Client ID** ve **Client Secret**'ı 1a'dan yapıştır.
- Kaydet.

---

## 2) Apple — Developer hesabı + Supabase

Apple tarafı Google'dan bir katman fazla: önce bir **Services ID**
oluşturulur, sonra ona bağlı bir **key** üretilir.

**a) Apple Developer'da Services ID**

1. [developer.apple.com/account](https://developer.apple.com/account) →
   **Certificates, IDs & Profiles → Identifiers → +**.
2. Tür: **Services IDs** → devam.
3. Description: "Wanderer" · Identifier: benzersiz bir ters-domain kimliği
   (örn. `com.emretransformation.wanderer.signin` — uygulamanın kendi
   App ID'sinden **farklı** olmalı, `com.emretransformation.wanderer`
   zaten `capacitor.config.json`'daki `appId`).
4. Kaydet, sonra listeden aç → **Sign in with Apple** kutusunu işaretle →
   **Configure**.
5. Açılan pencerede:
   - **Primary App ID**: uygulamanın App ID'si (`com.emretransformation.wanderer`).
   - **Domains and Subdomains**: `utfphfifkgfrrsifrzjc.supabase.co`
   - **Return URLs**:
     ```
     https://utfphfifkgfrrsifrzjc.supabase.co/auth/v1/callback
     ```
6. Kaydet.

**b) Key oluştur**

1. **Certificates, IDs & Profiles → Keys → +**.
2. Key Name: "Wanderer Sign in with Apple" → **Sign in with Apple**
   kutusunu işaretle → Configure → yukarıdaki Services ID'yi (Primary App
   ID olarak `com.emretransformation.wanderer`) seç → Save.
3. **Continue → Register**. İnen `.p8` dosyasını sakla (**bir daha
   indirilemez**). Sayfada gösterilen **Key ID**'yi not al.
4. Sayfanın üstünde (ya da Membership sekmesinde) **Team ID**'ni de not al.

**c) Supabase Dashboard'a gir**

Supabase Dashboard → **Authentication → Providers → Apple**:

- Aç (toggle).
- **Client ID (Services ID)**: 2a'da oluşturduğun Services ID
  (`com.emretransformation.wanderer.signin` gibi).
- **Team ID**: 2b'de not aldığın.
- **Key ID**: 2b'de not aldığın.
- **Private Key**: `.p8` dosyasının içeriği (tamamı, `-----BEGIN PRIVATE
  KEY-----` satırları dahil).
- Kaydet.

**Panzehir zaten kodda — burada elle iş yok.** Kullanıcı Apple'da
"Adresimi Gizle" seçerse Supabase'e `…@privaterelay.appleid.com` gelir; bu
adres uygulamanın gerçek adresinden farklı olduğu için **yeni bir hesap**
doğar (K3, `.claude/plans/sosyal-kapilar.md`). Bunu engelleyen bir ayar
yok — kullanıcı Apple'ın kendi seçimi. Eşikte bunu anlatan mikro-metin
zaten yazılı (`_src.html:173`, `auth.gate.apple.gizli`): *"Apple'da
adresini gizlersen Wanderer seni o gizli adresten tanır."*

---

## 3) Redirect URL listesi (Supabase URL Configuration)

Supabase Dashboard → **Authentication → URL Configuration → Redirect URLs**
listesine ekle (madde 1/2'deki "Authorized redirect URI" ile KARIŞTIRMA —
o Google/Apple'ın kendi konsoluna girilen tek, sabit Supabase callback'i;
bu liste Supabase'in **kullanıcıyı OAuth sonrası nereye döndüreceğini**
belirler):

- üretim web origin'in (kendi deploy adresin)
- `http://localhost:3030` (preview/geliştirme)
- `com.emretransformation.wanderer://auth-callback` (native dönüş şeması —
  `js/parts/03-auth-shell.js:377`'deki `NATIVE_OAUTH_REDIRECT` sabiti)

Bu liste boşsa ya da eksikse Supabase dönüşte "requested path is invalid"
hatası verir — kapı Google/Apple tarafında açılır ama geri dönemez.

---

## 4) Native kabuk (Capacitor) — bu adımlar ZATEN YAPILMIŞ

Sıradaki iki dosya genelde ELLE eklenir, ama bu repoda **önceden
eklenmiş** — kontrol ettim, dokunmana gerek yok:

- iOS `ios/App/App/Info.plist:26-36` — `CFBundleURLTypes` altında
  `com.emretransformation.wanderer` şeması kayıtlı.
- Android `android/app/src/main/AndroidManifest.xml:20-33` — OAuth dönüşü
  için `android:scheme="com.emretransformation.wanderer"` taşıyan
  `intent-filter` kayıtlı (yorumda "OAuth dönüş şeması" diye açıkça
  belirtilmiş).

Bu, `capacitor.config.json`'daki `appId` (`com.emretransformation.wanderer`)
ile `NATIVE_OAUTH_REDIRECT` sabitinin (`03-auth-shell.js:377`) şemasıyla
birebir aynı — üçü tutarlı. **Değiştirmen gereken tek durum:** ileride şema
(`appId`) değişirse, bu iki dosya + Supabase Redirect URLs (madde 3) +
Google/Apple konsollarındaki redirect URI (madde 1/2) **dördü birden**
güncellenmeli — biri unutulursa native dönüş sessizce kopar.

Google/Apple plugin bağımlılığı gerekmiyor: `doOAuth` sistem tarayıcısını
Capacitor'ün `Browser` plugin'i ile açıyor (`_openExternal`,
`03-auth-shell.js:392`), ayrı bir "Google Sign-In SDK" kurulumu YOK —
web OAuth akışı native'de de aynı yoldan gidiyor.

---

## 5) App Store notu (K4 — bilgi, elle bir işlem gerektirmiyor)

Apple'ın App Store İnceleme Kuralı 4.8: üçüncü taraf/sosyal giriş sunan
uygulama eşdeğer bir seçenek de sunmalıdır. Bugün (tek kapı — yalnız
e-posta+kod) bu kural **tetiklenmiyordu**, muaftı. Google eklenince
tetiklenir. **Sign in with Apple bunu karşılar** — zorunlu değildir,
üç kriteri (yalnız ad+e-posta talep etme, adresi gizli tutabilme, izinsiz
reklam takibi yapmama) karşılayan başka bir yöntem de olur ve bizim
e-posta+kod kapımız zaten bu üç kriteri karşılıyor. Riski gerçekten sıfıra
indiren, madde 1+2'yi **birlikte** açmaktır — yorum inceleme kuruluna
kaldığı için tartışmaya hiç girmemek en ucuz yol.

---

## Doğrulama (sen yapınca)

1. Eşikte **"Google ile devam et"** kapısına bas → Google'ın kendi giriş
   ekranı açılır (uygulama içi değil, gerçek Google sayfası) → hesap seç →
   Wanderer'a döner.
   - Bu e-postayla **daha önce hiç girmediysen**: tanışma paneli açılır
     (kullanıcı adı + doğum yılı sorar) — kapandığında içeri girersin.
   - Bu e-postayla **daha önce kod kapısından girdiysen**: tanışma paneli
     AÇILMAZ, doğrudan içeri düşersin — Supabase aynı doğrulanmış adresi
     mevcut hesabına bağladığı için (K2/K3). Bu, Google kapısının doğru
     kurulduğunun en güvenilir kanıtıdır: yeni bir hesap DOĞMAMALI.
2. Aynı adımı **"Apple ile devam et"** için tekrarla. "Adresimi Gizle"
   seçersen (K3 gereği) bu sefer İKİNCİ bir hesap doğar — bu beklenen
   davranıştır, hata değil.
3. Konsol temiz. **`Network` sekmesinde bir `signInWithOAuth` isteği ARAMA**
   — web'de o çağrı ağ isteği atmaz, tarayıcıyı doğrudan sağlayıcıya
   yönlendirir; göremediğin şey arıza belirtisi değildir. Kapının çalıştığının
   kanıtı dönüşün kendisidir: uygulama açılıyor ve **Ayarlar → Hesap**'ta
   adres, Google/Apple'da seçtiğin adresle aynı görünüyor.

---

## Sorun giderme

| Belirti | Sebep | Çözüm |
|---|---|---|
| Kapıya basınca anında kırmızı hata metni (Google/Apple sayfası hiç açılmıyor) | Sağlayıcı Supabase'de kapalı | Madde 1b / 2c — Provider toggle'ı aç |
| Google/Apple sayfası açılıyor, hesap seçiliyor ama dönüşte "requested path is invalid" | Redirect URL listesi eksik | Madde 3 — çalıştığın origin (localhost:3030 / prod) listede mi kontrol et |
| Google/Apple konsolunda "redirect_uri_mismatch" | Google/Apple'a girilen callback adresi Supabase'inkiyle birebir eşleşmiyor | Madde 1a-6 / 2a-5 — `https://utfphfifkgfrrsifrzjc.supabase.co/auth/v1/callback` harfiyen aynı olmalı, sonda `/` fazlalığı bile kırar |
| Native (Capacitor) uygulamada sağlayıcı sayfası açılıyor ama sistem tarayıcısı geri dönmüyor | Şema tutarsızlığı — madde 4'teki dört yerden biri eski `appId` taşıyor | `grep -rn com.emretransformation.wanderer` ile `capacitor.config.json`, `Info.plist`, `AndroidManifest.xml`, `03-auth-shell.js` dördünü karşılaştır |

---

İlgili belgeler: `SETUP-KOD-KAPISI-VE-POSTA.md` (eşiğin zemini — e-posta +
kod kapısı ve posta motoru) · `.claude/plans/sosyal-kapilar.md` (bu işin
planı, kararların gerekçesi).
