# Kapı Sağlamlaştırma — "yeşil dediğin ağaç, commit ettiğin ağaç olmalı"

## Bağlam

CI kapısı (`.github/workflows/kapi.yml`) 2026-09-02'de kuruldu ve ilk 23
koşusunda iki kez kırmızıya döndü. Emre iki bildirim e-postası aldı, oturum
raporlarında ise "merged" ve "tam süit yeşil" yazıyordu. Çelişki gerçekti:

| Koşu | Commit | Kırık | Commit mesajının iddiası |
|---|---|---|---|
| #1 · 00:32 UTC | `1bd4aca` | `xss-kapisi` → `audit-innerhtml.mjs` ENOENT | "tam süit 158 dosya / 3.645 test ✅" |
| #15 · 09:18 UTC | `65eceae` | `referans-butunlugu-kapisi` → `[[ad]]` yanlış pozitif | "Sprintin tek tam süit koşusu: sıfır kırık" |

İkisi de sonradan düzeltildi (`58b645a` ve FAZ 7d), `main` bugün yeşil. Ama
**örüntü** ikisinde de aynı: *kapının koştuğu ağaç, commit'lenen ağaç değildi.*

- #1'de koşu **deterministik değildi**: T7 sınavı repo içine geçici bir modül
  yazıyor, vitest paralel koşarken başka bir denetçi `js/` altını tam o anda
  gezerse ENOENT ile çöküyor. Lokalde zamanlama hiç tutmamış; CI'ın farklı
  çekirdek sayısı yakalamış.
- #15'te **sıra yanlıştı**: `git log -S'[[ad]]'` o satırın tam da o commit'te
  doğduğunu gösteriyor. Süit koşuldu → sonra plan dosyasına satır yazıldı →
  commit. Sınanan ağaç commit'lenen ağaç değil.

### Onaylanan kararlar (Emre, 2026-09-02)

1. Sprint kapanışına kural: tam süit **commit'lenecek ağacın son hâlinde**
   koşulur.
2. Kırmızı Kapı bir bildirim değil **iştir** — oturum içinde görüldüğü an
   fazın devamı durur.
3. T7 yarışına **kalıcı** çözüm: semptomu (ENOENT-güvenli okuma) değil sebebi
   (repoya yazan test) kaldır.
4. Üstüne repo geneli teknik denetim: aynı iki örüntünün başka örnekleri.

### Merkez kavram

Bir kapı iki şeyi birden kanıtlamalıdır: **ihlali yakaladığını** ve
**yakaladığı şeyin gerçek olduğunu**. Birincisi kapının kendi testidir
(bu repoda zaten var). İkincisi taramanın *saflığıdır*: kapı, sınanan
ağacın dışına taşmamalı — ne yazarak (T7 yarışı), ne de kendi belgesini
gerçek sanarak (`[[ad]]` yanlış pozitifi). Kapı sınadığı dünyanın içinde
kalmalı.

## Ana Tasarım Kararları

### K1 — Denetçi, ROOT'a değil TARAMA KÖKÜNE göre görelileşir

`scripts/tasarim-denetci.mjs` göreli yolu iki yerde üretiyor
(`tasarim-denetci.mjs:315` ve `:394`), ikisi de `relative(ROOT, dosyaTam)`.
Bu yüzden `--dizin /tmp/x` ile çağrıldığında `rel` = `../../tmp/x/sinav.js`
oluyor ve **T7'nin yol deseni** (`tasarim-denetci.mjs:405`,
`/^js\/parts\/[^/]+\.js$/`) hiç tutmuyor. Testin repoya yazmasının tek sebebi
budur — dosyanın kendi yorumu da bunu itiraf ediyor
(`tests/tasarim-kapisi.test.js:141`: *"T7 gerçek repo yollarına bakar, bu
yüzden --dizin ile sınanamaz"*).

Ölçüldü: `rel` **karar** için yalnız tek yerde kullanılıyor (satır 405);
diğer 14 kullanımın hepsi raporlama (`ihlal(rel, …)`, `t8Topla`'nın
`dosya: rel` alanı). Yani göreliliğin kökünü değiştirmek yalnız T7'yi
etkiler — tam da istenen. Gerçek repo koşusunda `REL_KOK === ROOT` olduğu
için davranış birebir korunur.

Fallback zinciri: `--dizin` yoksa `REL_KOK = ROOT` (bugünkü davranış).

### K2 — ENOENT savunması KALIR, ama tek savunma olmaktan çıkar

`58b645a` dört denetçide 9 okuma noktasını ENOENT-güvenli yaptı. Bu katman
sökülmez: repo taraması sırasında bir dosyanın silinmesi (editör, git
checkout, başka bir araç) her zaman mümkündür ve savunmacı stil §5.2'nin
kuralıdır. K1 yarışın **kaynağını** kaldırır, ENOENT katmanı **sonucuna**
karşı durur. İkisi farklı katman; biri diğerinin yerine geçmez.

### K3 — Kural metni kapıya bağlanamıyorsa protokole yazılır

"Tam süit commit'lenecek ağaçta koşulur" bir insan disiplinidir; bir test
onu ölçemez (test, kendi koşusunun ardından ne olacağını bilemez). §6.6'nın
kendi cümlesi gereği ölçülemeyen kural belgenin yargı listesine yazılır —
ama görünür bir yere: hem `PROTOKOL-FABLE.md` §3.5'e hem `CLAUDE.md`'nin
import'suz yedek çekirdeğine.

## Fazlar (her biri bağımsız ship edilebilir)

### FAZ 1 — T7 yarışının kökü · 🅢 · ~1 oturum
**Değişen:** `scripts/tasarim-denetci.mjs`, `tests/tasarim-kapisi.test.js`

`REL_KOK` sabiti eklenir, iki `relative()` çağrısı ona bağlanır. T7
describe'ı `mkdtempSync` fixture'ına taşınır: fixture içinde `js/parts/`
ağacı kurulur, denetçi `--dizin <fixture>` ile çağrılır. Repoya yazma
tamamen kalkar. Üçüncü `it` (taban çizgisi) gerçek repoya bakmaya devam
eder — o zaten okuma, yazma değil.

Kabul ölçütü: `grep -rn "join(ROOT" tests/*.test.js | grep writeFileSync`
boş döner.

### FAZ 2 — Kapı sözleşmesi · 🅞 · ~1 oturum
**Değişen:** `PROTOKOL-FABLE.md`, `CLAUDE.md`

Devir: 🅞 — kural metninin nereye gireceği, hangi sesle yazılacağı ve
mevcut hangi maddeyi genişleteceği yargıdır; protokolün kendi register'ı
(§2.3) ancak ürüne bakarak tutturulur.

### FAZ 3 — CI sertleştirme · 🅢 · ~1 oturum
**Değişen:** `.github/workflows/kapi.yml`

`cancel-in-progress` main'de kapatılır (kayıt koşusu iptal edilmemeli),
action sürümleri Node 20 deprecation uyarısından çıkarılır.

### FAZ 4 — Repo geneli denetim (Explore raporu, 2026-09-02)

Tarama sekiz bulgu verdi. Beşi işlenir, biri ölçülür, ikisi bilgi notudur.

#### FAZ 4a — ENOENT savunması testlere de yayılır · 🅢 · ~1 oturum
**Değişen:** `tests/13D-iki-defter-kapisi.test.js`, `tests/00f-esik-nabzi.test.js`,
`tests/sifir-kanit-sinavi.test.js`, `tests/12g-yuz-cizgisi.test.js`,
`tests/13D-yanilma-kapisi.test.js`, `tests/13s-gecis-yolu.test.js`,
`tests/dil-buyuk-harf-kapisi.test.js`

`58b645a` savunmayı yalnız dört `scripts/*.mjs`'e koydu; gerçek `js/` ağacını
`readdirSync` ile gezip try/catch'siz okuyan **yedi test dosyası** korumasız
kaldı. FAZ 1 yazıcıyı kaldırdığı için risk bugün uykuda — ama savunma
asimetrik kalmamalı (K2) ve bu repo aynı deseni iki kez üretti. En kritiği
`13D-iki-defter-kapisi.test.js:25`: okuma **modül üst seviyesinde**, orada
patlarsa dosyanın bütün testleri collect aşamasında ölür.

#### FAZ 4b — Referans kapısına muafiyet beyanı · 🅢 · ~1 oturum
**Değişen:** `tests/referans-butunlugu-kapisi.test.js`

Bugünkü tek savunma iki kelimelik bir denylist (`SABLON_ADLAR = {'name','ad'}`,
`tests/referans-butunlugu-kapisi.test.js:128`). Yeni bir jenerik yer-tutucu
(`key`, `id`, `slug`…) bir belgede biçim örneği olarak geçtiği gün aynı
yanlış pozitif üçüncü kez doğar.

**Ölçülen ve ÇÜRÜTÜLEN alternatif:** "backtick içindeki `[[…]]` şablondur"
kuralı denendi ve ölçümle düştü — repoda backtick'li 23 referansın çoğu
GERÇEK bağ (`.claude/plans/devir-altyapisi.md:181-183`,
`.claude/plans/kapi-saglamlastirma.md:147-149`). Biçim, niyeti ayırt etmiyor.

**Karar:** repoda zaten olan muafiyet kalıbı buraya getirilir —
`TASARIM-MUAF:` (`scripts/tasarim-denetci.mjs`) ve `KOKEN-MUAF:`
(`scripts/gerceklik-denetci.mjs`) ile aynı biçim: satırda
`REFERANS-MUAF: <gerekçe>` varsa o satırdaki referanslar taranmaz.
Gerekçesiz muafiyet de ihlaldir (§6.10). Denylist KALDIRILMAZ — jenerik
yer-tutucular için kapalı ve küçük bir küme olarak kalır; muafiyet beyanı
onun yerine değil, YANINA gelir: biri bilinen kelimeleri, öteki öngörülemeyen
durumu karşılar. Yeni bir vaka artık kod değişikliği değil, bir satırlık
beyan gerektirir.

#### FAZ 4c — Üç kapıya self-test, bir kapıya nabız · 🅢 · ~1-2 oturum
**Değişen:** `tests/bundle-kapisi.test.js`, `tests/native-senkron-kapisi.test.js`,
`tests/i18n-tam-parite-kapisi.test.js`, `tests/i18n-parity-kapisi.test.js`

Protokolün kendi cümlesi: *"yakalamayan bir kapı, kapı değildir."* Üç kapı
yalnız gerçek repoya bakıyor, ihlali yakaladığını hiç kanıtlamıyor — yani
bugün yeşiller ama yeşilliklerinin anlamı ölçülmemiş. Dördüncüsü
(`i18n-parity-kapisi.test.js:26-30`) daha ağır: `EXTERNAL_LANGS` boş olduğu için
kapı bir no-op'a düşüyor, `i18n-validate.mjs` hiç koşmuyor.

#### FAZ 4d — `devir-notu.sh` tarih çağrısı iki kabukta da çalışır · 🅢 · ~1 oturum
**Değişen:** `scripts/devir-notu.sh`

`scripts/devir-notu.sh:55` `date -r <dosya>` kullanıyor — GNU'da mtime basar,
BSD/macOS'ta argümanı epoch sanır ve hata verir; `2>/dev/null` onu yutunca
satır sessizce tarihsiz kalır. Aynı dosyanın 92. satırı doğru deseni zaten
kullanıyor (`date -v-14d … || date -d '14 days ago' …`). `build.sh`'ın
`sed -i` kırığıyla (denetim A1) aynı hata sınıfı, aynı repoda tekrarlanmış.

#### FAZ 4e — `bagsiz-ad-denetci` sessiz-geç hipotezi ÖLÇÜLÜR · 🅢 · ~1 oturum
**Değişen:** ölçüm sonucuna göre `scripts/bagsiz-ad-denetci.mjs`

Hipotez (Explore, düşük güven): glob genişlemesinden sonra bir dosya
silinirse `tsc` `TS6053` verir, desen yalnız `TS2304`/`TS2552` saydığı için
hata sessizce yutulur ve denetçi yanlışlıkla exit 0 basabilir. **Önce ölçülür**
— doğrulanmadan düzeltme yazılmaz (§6.10).

#### İşlenmeyenler (gerekçeli)
- **C2 · `maxWorkers: 3`** — yerel makineye kalibre edilmiş, CI'da
  doğrulanmamış. Bir doğruluk riski değil; ölçüm yapılmadan değiştirmek
  kalibrasyonu kanıtsız bir sayıyla değiştirmek olur (§6.10). Bilgi notu.
- **`process.cwd()` tabanlı yol varsayımı (5 dosya)** — bugün her koşu repo
  kökünden başlıyor, kırık üretmiyor; `__dirname` kalıbıyla tutarsızlık
  kozmetik.

## Riskler / Dikkat

1. `REL_KOK` değişimi `--dizin` kipinde **rapor yollarını** değiştirir
   (`../../tmp/…` → `sinav.js`). Mevcut testler çıktıda yol değil kural
   kodu (`T1`, `T7`) ve dosya adı arıyor — kontrol edilmeli.
2. T7 fixture'ında kullanılacak modül adı `tasarim-taban.json`'daki 42
   bannersiz dosyadan biriyle çakışmamalı; `zz-` öneki korunur.
3. `--taban-yaz` kipi `_dizinArg < 0` ile korunuyor; fixture koşusu tabanı
   yazmamalı — bu koruma bozulmamalı.
4. CI'da `cancel-in-progress` kapatmak main'de kuyruk oluşturabilir; push
   sıklığı düşük olduğu için kabul edilebilir.

## Doğrulama (her faz sonunda)

1. `./build.sh` exit 0.
2. Hedefli süit: `npx vitest run tests/tasarim-kapisi.test.js tests/xss-kapisi.test.js`
3. **Yarışın gerçekten öldüğünün kanıtı:** tam süit koşarken `js/parts/`
   altında geçici dosya doğmadığını ölç — koşu sırasında dizini izle.
4. Preview: bu oturumda yok (§10.4) — kaynak kod (`js/`, `css/`, `_src.html`)
   değişmediği için kapı gerekçeli geçilir.

## Kritik Dosyalar

**Yeniden kullanılan (yeni yazma — bunlar zaten var):**
- `mkdtempSync(join(tmpdir(), …))` deseni — on kapıda zaten kullanılıyor
  (`xss-kapisi`, `bagsiz-ad-kapisi`, `gerceklik-kapisi`, `yetim-kopru`,
  `ihtimalsel-dil`, `referans-butunlugu-kapisi`, `devir-nabzi`, `tasarim-kapisi`'nin
  `sina()` yardımcısı). T7 bu desenin dışında kalan TEK istisnaydı.
- `--dizin` bayrağı — `tasarim-denetci.mjs:68` zaten var, T7 kullanamıyordu.
- ENOENT-güvenli `gez()`/`dosyalar()` — dört denetçide mevcut.

**Yerinde evrim:** `scripts/tasarim-denetci.mjs`, `tests/tasarim-kapisi.test.js`,
`.github/workflows/kapi.yml`, `PROTOKOL-FABLE.md`, `CLAUDE.md`

## Hafıza bağları

- `[[kapi-tarama-yarisi]]` — bu sprintin doğrudan konusu; FAZ 1 onu kapatır
- `[[xss-kapisi]]` — TABAN kalıbının emsali
- `[[claude-altyapisi-commit-disi]]` — uzak oturum / lokal disk ayrımı, FAZ 2

## Durum

- FAZ 1 · ✅ uygulandı (Sonnet), denetlendi (Opus). Denetim bulgusu: yarış
  öldü ama sekiz yorum hâlâ var olduğunu anlatıyordu — hepsi gerçeğe çekildi.
- FAZ 2 · ✅ uygulandı (Opus), çapraz denetimde (Sonnet)
- FAZ 3 · ✅ uygulandı (Sonnet), denetlendi (Opus) — bulgu yok.
  **Açık Durak:** `cancel-in-progress: ${{ … }}` ifadesinin GitHub tarafında
  geçerliliği bu ortamdan doğrulanamadı (`docs.github.com` proxy'de kapalı).
  Kanıt ilk gerçek koşudur — push sonrası Actions izlenecek.
- FAZ 4a · ✅ uygulandı (Sonnet), denetlendi (Opus) — yedi dosyada ENOENT
  savunması; örneklem denetimi: `throw e` korunmuş (körlük değil), bağlar
  hedefli. Bulgu yok.
- FAZ 4b · ✅ ikinci denemede uygulandı — ilk ajan kota sınırında öldü,
  hiçbir şey yazamadan kesilmişti
- FAZ 4c · ✅ dört kapıya self-test. Denetim iki iddiayı bağımsız doğruladı:
  bütçe gerçekten 3300 KB (`scripts/check-bundle-size.mjs:28`) ve
  `bundleHash`'in imza değişimi dışarıda çağıran bırakmamış. Bulgu yok.
- FAZ 4d · ✅ uygulandı (Sonnet), **denetim bir kırık buldu ve düzeltti**:
  ajan `||` zincirini BSD-önce dizmişti; GNU'da bu, `stat -f %m`'in
  stdout'unu `date`'e besliyordu — bugün hata verip düşüyor, yarın kazara
  ayrıştırılsa sessizce yanlış tarih basardı. Zincir GNU-önce'ye çevrildi;
  ölçüm: `2026-09-02 12:07` = gerçek mtime ✅. BSD dalı bu ortamda
  koşturulamadı, yorumda **doğrulanmamış** olarak işaretlendi.
- FAZ 4e · ✅ hipotez ÖLÇÜLDÜ ve **doğrulandı**, ama denetim ajanın
  düzeltmesini fazla geniş buldu ve daralttı — aşağıya bak.

### FAZ 4e'nin denetim notu — bir kapı, kırığı görme yeteneğini de korumalı

Ajan hipotezi doğru ölçtü (tarama bozulduğunda denetçi sessizce "✓ Bağsız ad
yok" basıyordu) ama düzeltmesi **her** `error TS\d+` satırını "tarama
güvenilmez" saydı. Ölçüm bunu çürüttü: bu tsconfig bugün **2.208 semantik
hata** üretiyor (2.042'si TS2339) ve hepsi bilinen, bu denetçinin konusu
değil — yani kapı her koşuda kırmızı yanardı. Hedefli süit bunu yakaladı.

Sınır ölçülmüş kategoriye daraltıldı: yalnız **TS6xxx** (dosya/girdi) ve
**TS18xxx** (yapılandırma) — taramanın KENDİSİNE dair olanlar. Ölçülen iki
örnek: `TS18003` (girdi bulunamadı — ve dikkat, **exit 0** ile gelir, yani
tsc'nin çıkış kodu bile uyarmaz) ve `TS6504`. Ayrıca kapıya kendi self-testi
yazıldı: tarama hiç girdi bulamazsa exit 1 + gerekçe, ve asla "Bağsız ad yok"
demez.

Ders, FAZ 7d'nin dersinin simetriğidir: *spekülatif genişletme kapıyı kırar,
spekülatif daraltma körleştirir.* İkisinin arasındaki tek hakem ölçümdür.

### SAPMA — Sonnet oturum limiti (2026-09-02, 14:50 UTC)

FAZ 4a/4b/4c/4d/4e'yi yürüten üç `uygulayici` çağrısı da API kota sınırında
(HTTP 429) yarıda kesildi. Diskte doğrulanmamış değişiklikler kaldı; parent
(Opus) hepsini kapıdan geçirdi, iki kırık buldu (FAZ 4d sıralaması, FAZ 4e
kapsamı) ve düzeltti. FAZ 2'nin çapraz denetçisi de aynı sınırda öldü ve
**bildirim üretmedi** — yani sessizce kayboldu; parent bunu `ListAgents` ile
fark edip denetimi yeniden açtı.

Ders: bir ajanın sessizce ölmesi, işinin bittiği anlamına gelmez. Devredilen
her fazın kapısı parent'ta koşulmadan faz kapanmaz (§4.4) — bu sprintte o
kural iki gerçek kırık yakaladı.

**İlk hamle.** İki ajan da dönünce (FAZ 4b + i18n-tam-parite, FAZ 2 denetimi)
bulgularını karara bağla, sonra sprint kapanışı: dikiş turu → **tam süit**
(§3.5 madde 2: koşulan ağaç commit'lenen ağaç olmalı — süitten sonra hiçbir
dosyaya dokunma) → commit → push → **Kapı koşusunu izle** (§10.4).
`cancel-in-progress: ${{ … }}` ifadesinin geçerliliği ilk koşuda görülecek.
