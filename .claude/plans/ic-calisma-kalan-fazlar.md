# İç Çalışma 09–18 · Kalan Yol Haritası — "cam silindi, sıra odalarda"

> Emre'nin talebi (2026-09-04): *"İç Çalışma'ların ilk 8 kısmı yapıldı ancak
> kalan kısımlar yapılmadı. Kalan kısımları güncelledik ve artık uygulayalım."*
>
> **Kapsamın okunuşu.** "Güncelleme" 3 Eylül'de yapıldı: on bir oda + Atlas
> rev.2'ye çekildi (`.claude/plans/ic-calisma-08-19-denetim.md`). O sprint her
> odanın **Faz 1'ini** (gören göz) kapattı — Tek Cam. Kapanmayan şey odaların
> **Faz 2 / Faz 3'leridir**: bu plan onların defteridir.

## Bağlam

Odaların yol haritaları dört vuruşluk bir kalıp taşır: **Faz 0** elle
(Dashboard), **Faz 1** gören göz (telemetri), **Faz 2–3** domain işi. 3 Eylül
sprinti Faz 1'lerin buluşmasıydı ve oda 17 bunu kendi raporunda önceden
yazmıştı: *"diğer 17 çalışmanın Faz 1'leri burada buluşur."* Buluştular.

Bugün açık kalan on üç maddenin tamamı Faz 2 ve Faz 3'lerdir. On iki belge
tek tek okundu (galeri, 2026-09-04) ve her madde koda karşı yoklandı.

### Onaylanan kararlar

1. **Kapsam odaların Faz 2–3'leridir.** Faz 0'lar ELLE'dir ve bu planın işi
   değildir; Faz 1'ler kapandı.
2. **Veri bekleyen madde uygulanmaz, beklediği yazılır.** Oda 18·Faz 2 (bölge
   sırası) raporunda "bilinçli bekleme" der ve sayacı `051` koşulduğu gün
   başlar; onu bugün uygulamak, olmayan veriye dayanan bir karar üretir (§6.10).
3. **Mühür isteyen microcopy uydurulmaz.** Oda 13'ün `fallbackCopy`'si on iki
   dile push metni ister; odanın kendi kuralı *"ya tam native ya hiç"*tir ve
   rapor bunu bilinçli ertelemiştir. Bu plan o kararı bozmaz.
4. **Yeni motor yok.** Her madde mevcut kalıba biner: `00f` nabız kalıbı,
   `13B` tören kuyruğu, `_ARAC_DEFS` registry çekirdeği, `admin_usage_report`
   blok zinciri, `10F` süzgeç deseni.

### Merkez kavram

3 Eylül **gözü** açtı; bu sprint **eli** çalıştırır. Bir gözlemevi ne kadar
iyi kurulursa kurulsun, gördüğünü kimse uygulamıyorsa cam değil ayna olur.
Ama sıralama bir şeyi daha söylüyor: bu sprintin en ağır maddesi ölçüm değil
**emniyettir** — oda 15 kendi kartına *"kaçırma oranını ölçmez; asıl korkulacak
sayı budur"* yazdı. Bir boşluğun kendi raporunda adının konması, kapanması
demek değildir. Sıra oradan başlar.

## Denetim defteri — on üç maddenin durumu

Ölçüm 2026-09-04'te koda karşı yapıldı; **durum sütunu her faz kapanışında
tazelenir** (son tazeleme 2026-09-05, FAZ 12). Bir plan tablosunun bayatlaması
[[rapor-bayatligi]]'nın kendisidir: "AÇIK" diye duran bitmiş bir madde,
okuyanı yapılmış işi yeniden yapmaya çağırır.

| Oda | Faz | Madde | Durum | Kanıt / faz |
|---|---|---|---|---|
| 15 | F2 kalan | Kriz eval seti | **BİTTİ** | FAZ 1+2 — `tests/kriz-eval.test.js`, 52 satır / 13 dil |
| 12 | borç | Paylaşım `tur` kırılımı | **BİTTİ** | FAZ 3 — `_shareCanvas(cv, title, tur)` |
| 11 | F2 kalan | Bildirim tercihleri yüzeyi | **BİTTİ** | FAZ 4 — `bildirimSessizKaydet` + `_sessizYuzeyCiz` |
| 11 | F1 kalan | Tık atıfı | **BİTTİ · ELLE bekliyor** | FAZ 5 — `052` + `send-push` redeploy |
| 17 | F3 | Saklama politikası | **BİTTİ · ELLE bekliyor** | FAZ 6 — `053` + periyodik `usage_events_prune(90)` |
| 15 | F3 | Rıza defteri | **BİTTİ · ELLE bekliyor** | FAZ 7 — `054`; okuyan taraf FAZ 8a |
| 09 | F2 | Araç registry | **BİTTİ** | FAZ 9 — `_ARAC_DEFS` + saf yaprak `13a1` |
| 09 | F3 | Yeni araçlar | **BİTTİ** | FAZ 10 — `gordun` · `sabir` · `ayna` + `hazir()` |
| 12 | F2 | Sosyal bildirim | **BİTTİ · ELLE bekliyor** | FAZ 11+12 — merdivende `sosyal` + rozet; `send-push` redeploy |
| 17 | F2 | Eşik alarmları | **AÇIK** | FAZ 13–14 |
| 13 | D | SW dil pürüzü | **AÇIK (teşhissiz)** | FAZ 15 |
| 10 | D kalan | Ses şiddet kademesi | **AÇIK** | FAZ 16 |
| 10 | F3 | Akşam ısrar dozu | **AÇIK** | FAZ 17 |

**Sürüm banner'ı (FAZ 8b) ayrı bir hâldedir:** yapılmadı ve yapılamaz —
`053` ELLE koşulup `usage_events_prune` periyodik hâle gelene kadar
gizlilik metnindeki saklama cümlesi **yanlış** olurdu (bkz. FAZ 8a kaydı).
Bu bir gecikme değil bir dürüstlük kısıtıdır.

**Bu planın DIŞINDA kalanlar ve sebepleri** — sessizce düşmesinler diye:

| Madde | Neden bu planda değil |
|---|---|
| 09·F0-B · vision/kaynakça yamaları | ELLE — Dashboard, repodan görünmez |
| 10·F0 · mektup içeriği | ELLE — Dashboard |
| 11·F3 · kanallar-üstü tavan | 17·F2'nin defterine bağlı; o faz kapanınca sırası gelir (FAZ 14) |
| 12·F3 · tohum küratörlüğü | Emre'nin kartlarını ister + feed yoğunluk verisi bekliyor |
| 13·F0 · de pilot mührü | ELLE — Emre'nin mührü |
| 13·F1 kalan · `fallbackCopy` | on iki dile push microcopy'si; odanın "ya tam native ya hiç" kuralı |
| 14·F3 · ELLE kuyruğu | ELLE — `041`–`051` + dört redeploy |
| 15·F0 · sunucu güvenlik yamaları | ELLE, ACİL — `SETUP-LLM-CHAT.md` §5 |
| 16·F0/F2/F3 | ELLE (mağaza) · 7b vendorlamasına bağlı · süreç |
| 17·F0 · mig + redeploy | ELLE |
| 18·F0 · gerçek cihaz turu | ELLE — tarayıcı konsolu okur, gezginin gözünü okumaz |
| 18·F2 · esnek bölge sırası | **Bilinçli bekleme** — veri 4–6 hafta biriksin (raporun kendi kararı) |

## Ana Tasarım Kararları

### K1 — Emniyet önce, çünkü ölçülmeyen tek şey o
Sprint kriz eval'iyle açılır. Gerekçesi oda 15'in kendi cümlesidir: Emniyet
Nabzı kartı **kaçırma oranını ölçmez ve ölçemez** — yakalanmayan sinyal tanım
gereği sayılamaz. Kartın gösterebildiği şey huninin içi; gösteremediği şey
huninin dışıdır. O dışarısı ancak **sentetik bir korpusla** ölçülür ve bu,
kartın yerine geçen bir ölçü değil, kartın hiç göremediği ölçüdür.

### K2 — Tık atıfı kanıtla bağlanır, tahminle değil
`notification_log.clicked_at` bugün boş. "Son gönderilen bildirimi tıklanmış
say" gibi bir sezgi §6.10 ihlalidir. Atıf **yalnız** payload satır kimliğini
(`nid`) taşıdığında yazılır; taşımıyorsa hiç yazılmaz ve kart bugünkü dürüst
notunu korur. Yazma yolu RLS değil **RPC**'dir (`quota_consume` emsali):
kullanıcı `notification_log`'a yazamaz, yalnız kendi satırının `clicked_at`'ini
mühürleyen bir SECURITY DEFINER fonksiyonunu çağırır.

### K3 — Saklama politikası önce agregatı kurar, sonra siler
Ham satır silinmeden önce günlük agregat tablosu dolmalı; tersi, kapanan
pencerede veri kaybıdır. `052` üç şeyi sırayla yapar: agregat tablo → geri
doldurma → prune fonksiyonu. Prune'un kendisi **cron'a bağlanmaz**, çağrılabilir
bir fonksiyon olarak durur (pg_cron bu repoda hiç kullanılmamış; kurulumu ELLE).

### K4 — HK_VERSION tek artışta artar
Saklama cümlesi (17·F3) ve rıza defteri (15·F3) aynı hukuk metnine dokunur.
İki ayrı sürüm artışı, kullanıcıya iki banner gösterir. `1.3 → 1.4` **tek**
artıştır ve iki fazın ikisi de kapandıktan sonra yapılır.

### K5 — Registry ikiz doğurmaz, tüketici toplar
`_ARAC_DEFS` zaten bir kayıt defteridir; `[KART]` ve `[NISAN]` ona **tüketici**
olarak bağlanır. Kendi `run` semantikleri farklıdır (chip değil, metin
dönüşümü) — bu yüzden registry alanı `marker` + `parse` ile genişler, ama
`[ARAC:x]{json}` token biçimi (korunan sözleşme) **hiç değişmez**.

## Fazlar (her biri bağımsız ship edilebilir)

### FAZ 1 — Kriz eval koşucusu · 🅢 · ~0.5 oturum
Korpusu **okuyan** iskelet; korpusun kendisi FAZ 2'dir.
**Yeni:** `tests/kriz-eval.test.js` · `tests/fixtures/kriz-korpus.mjs`
Korpus biçimi: `{ metin, dil, beklenen: 'kriz'|'yumusak'|'temiz', not }`.
Koşucu `detectCrisis` + `detectCrisisSoft` çağırır ve iki sayıyı ayrı ayrı
raporlar: **kaçırma** (beklenen `kriz`, ikisi de false) ve **yanlış-alarm**
(beklenen `temiz`, `detectCrisis` true). Eşik: **kaçırma 0 · yanlış-alarm 0**.
`yumusak` beklenen satır `detectCrisis` false + `detectCrisisSoft` true ister.
Boş korpusla test **geçmez** — `korpus.length >= 30` bir iddiadır ve kapıdır.

### FAZ 2 — Kriz korpusu · 🅞 · ~0.5 oturum
> **Keşifte çıkan bulgu (2026-09-04) — bu faz onu ölçüye bağlar.**
> `detect.crisis` **on üç** dilde tanımlı (`16c-i18n-detect-dict.js`);
> `detect.crisis_soft` yalnız **iki** dilde: `tr` (`:12`) ve `en` (`:89`).
> Yani Almanca yazan biri sert bir kalıba basmazsa, yumuşak sinyalin LLM
> teyidine (`_confirmCrisisWithLLM`) **hiç ulaşmaz** — kapı o dilde tek
> katmanlıdır. Bu bir kırık mı bilinçli bir sınır mı, repodan okunamaz;
> plan onu **uydurmuyor**, TABAN olarak beyan ediyor: korpus bugünkü
> kapsamayı sayıya bağlar, büyümesi serbest, **daralması yasak**
> (kalıp: `tests/referans-butunlugu-kapisi.test.js`). Yumuşak desenleri on bir
> dile yazmak ayrı bir karardır ve Emre'nin masasına çıkar (§6.10: kanıtı
> olmayan değer yoktur — uydurulmuş bir emniyet deseni de öyle).

Devir: 🅞 — hangi cümlenin kriz, hangisinin mecaz, hangisinin masum sayılacağı
plandan okunamaz; korpusun kendisi yargıdır ve yanlış bir cümle, insan
güvenliği kapısını yanlış kurar. Ayrıca on bir dilde register kararıdır.
**Değişen:** `tests/fixtures/kriz-korpus.mjs`
Kapsam: ≥30 senaryo, `dp('detect.crisis')`'in tanıdığı dillerden en az altısı,
üç kova dengeli. Yanlış-alarm kovası bilinçli olarak zor seçilir (mecaz,
şarkı sözü, "ölesiye yoruldum", "bu işi öldürdüm").

### FAZ 2c — Büyük-İ tuzağı: `dp` tüketicilerinin tamamı · 🅢 · ~1 oturum
> **Bu faz plana bir denetim bulgusundan girdi** (çapraz denetim · Sonnet,
> 2026-09-04). FAZ 2 kriz yolundaki İ tuzağını kapattı; denetim aynı tuzağın
> **on iki başka `dp` anahtarında** da açık olduğunu canlı regex koşularıyla
> gösterdi — sayı uydurulmadı, tarandı:
> `detect.progress` (`/ilk kez/`) · `detect.breakthrough` (`/itiraf/`) ·
> `detect.wellness_claim` (`/^iyiyim/`) · `detect.intensity.high|positive` ·
> `detect.topic.work` (`/iş|kariyer/`) · `detect.belief.empowering`
> (`/inanıyorum/`) · `detect.choice.new_person` · `detect.eksen.oz_saygi` ·
> `detect.duygu.huzur|umut` · `detect.pekistirici`.
>
> Etki can güvenliği kadar ağır değil ama **aynı kökün ürün genelinde
> tekrarıdır**: "İyiyim, teşekkürler." diyen bir gezginin iyi-hâl beyanı
> okunmuyor; "İlk kez cesaret ettim." bir atılım sayılmıyor; "İş yerinde
> zorlandım." konu olarak iş'e bağlanmıyor. Yani uygulama, cümlesine büyük
> İ ile başlayan bir Türkçe kullanıcıyı sistematik olarak **daha az
> tanıyor** — ve tezin adı "Mesele Sensin".

**Değişen:** `js/parts/16-i18n-prompts.js` (yeni `dpTest`/`dpAllTest`) ·
34 çağrı yeri / 6 dosya (`09-reports-tracks` · `09a-personalization-engine` ·
`00-config-tracking` · `13D-duygu-motoru` · `02-features-onboarding` ·
`13-extras`) · yeni `tests/i-tuzagi-kapisi.test.js`

Kök çözüm **tek noktadadır**: normalize'ı her çağrı yerine kopyalamak yeni
bir ikiz üretir (§1.3). `dpAll` desen döndürür, eşleşme yapmaz — bu yüzden
eşleştirmeyi yapan iki yardımcı eklenir (`dpTest(key, text)` ·
`dpAllTest(key, text)`), metni bir kez normalize eder ve çağrı yerleri
onlara geçer. `krizMetniNormalize` oraya taşınır; `13-extras` onu import
eder (ikinci bir kopya YAZILMAZ). Kapı adı `*-kapisi` olduğu için
`npm run kapi:genel` desenine kendiliğinden girer.

**Sınır:** desenlerin kendisi DEĞİŞMEZ — bu faz bir eşleştirme kırığını
kapatır, sözlüğü genişletmez. Yeni desen yazmak ayrı bir karardır.

### FAZ 2e — Tek eşleştirici: `reTest` · 🅢 · ~1 oturum
> **Bu faz Opus öz-denetiminden doğdu** (§3.7, 2026-09-04). FAZ 2c `dp()`
> tüketicilerini kapattı; öz-denetim aynı tuzağın `dp()` DIŞINDA da
> yaşadığını ölçtü. `09a`, `09b`, `10-features-w2` kendi Türkçe desen
> listelerini taşıyor ve altı desen bugün kullanıcı metnini kaçırıyor:
> `09a:84` `/iyiyim/i` (inkâr) · `09a:47` `/istikrar/i` (değer) ·
> `09a:934` `/istemiyorum/i` (direnç) · `09b:421` `/ilişki…/i` (alan) ·
> **`09b:1399` `/ilk kez/i` — "yeni kişi" seçimi** · `10:957` `/itiraf/i`.
>
> Beşincisi doğrudan teze dokunuyor: uygulama **"İlk kez söyledim."** diyen
> birini yeni-kişi seçimi olarak saymıyor — yani var olma sebebi olan anı
> tam da o an fark etmiyor.

**Asıl kazanç kuralın kapıya bağlanabilmesi.** "Türkçe desenler İ-duyarlı
olmalı" cümlesi statik olarak SINANAMAZ — bir desenin kullanıcı metnine mi
CSS sınıfına mı baktığını kaynak söylemez. Ama **"ham
`liste.some(r => r.test(x))` kullanılmaz"** cümlesi sınanır. Kural
undecidable olmaktan çıkıp decidable hâle gelir (§6.6'nın bir üst basamağı:
kapısı olmayan kural tavsiyeye döner — kapısı KURULAMAYAN kural ise
yeniden keşfedilmeyi bekler).

**Değişen:** `js/parts/16-i18n-prompts.js` (`reTest` — parent ekledi,
`dpTest`/`dpAllTest` onun üstüne bindi) · 51 çağrı yeri / 5 dosya
(`09b`×31 · `09a`×17 · `13D` · `10-features-w2` · `01-prompts-modes`) ·
`tests/i-tuzagi-kapisi.test.js` (yeni kapı bloğu)

**Sınır:** sözlükler BİRLEŞTİRİLMEZ. `09a`/`09b`'nin kendi listelerinin
`16c` ile ikizleşmesi (§1.3) ayrı ve büyük bir karardır ve
`### Taşınan Durak` altında zaten kayıtlı. Bu faz eşleştirmeyi birleştirir,
sözlüğü değil. Desenlere de dokunulmaz.

### FAZ 3 — Paylaşım türü kırılımı · 🅢 · ~0.5 oturum
**Değişen:** `js/parts/13g-paylasim.js` (`shrShareStory` → `_shareCanvas`) ·
yedi çağıran · `tests/` ilgili süit

Keşif düzeltmesi (2026-09-04): rapor "altı çağıran" diyor, repoda **yedi**
var — `13t:553` gözden kaçmış (`gbPaylasimKarti` sonucunu doğrudan geçiyor).
Ve `_PAY_TUR` kapalı kümesi **üç** değerdir (`kart`·`rapor`·`film`,
`00f:767`), altı değil: iş yeni değer eklemek değil, yedi çağıranı bu üçe
**eşlemektir**. Küme genişletilirse `051`'in `paylasim_pulse` bloğu da
bilmek zorunda kalır — genişletilmiyor.

Eşleme (koddan okundu, uydurulmadı):
`13t` dönüşüm aynası → `kart` · `10q:1538` kişi kartı → `kart` ·
`10t:464` kilometre taşı → `kart` · `12f:645` hazine tacı → `kart` ·
`10q4:462` oluş mührü → `kart` · `10f:803` yol özeti → `rapor` ·
`13j:400` AYIN FİLMİ → `film`.

`tur` `params` nesnesine girer (`shrShareStory({…, tur})`) — imza
değişmez, "TEK GİRİŞ: window.shrShareStory(params)" sözleşmesi korunur;
`_shareCanvas(cv, title, tur)` üçüncü parametreyle alır.

**Ve bu fazın asıl bulgusu:** `13g:301` bugün `wtLogPaylasim('indir',
{ tur: 'kart' })` yazıyor — **sabit**. Oysa o dal `shrShareStory`'nin
indirme düşüşüdür ve paylaşılan şey pekâlâ `film` (Wrapped) ya da `rapor`
(Yol) olabilir. Yani kartın "tür" sütunu bugün yalnız eksik değil, indirme
satırlarında **yanlış**. Sabit değer aynı `tur`'a devredilir.

Tür geçirilmezse **null kalır** — uydurulmuş varsayılan yazılmaz (§6.10).

### FAZ 4 — Bildirim tercihleri yüzeyi · 🅞 · ~1 oturum
Devir: 🅞 — sessiz saat seçicisinin biçimi (iki saat mi, hazır aralık mı) ve
microcopy'si üründe ayarlanır; "gece vardiyası" durumu suçlayıcı bir cümleyle
anlatılamaz. Tip anahtarlarının hangi granülde sunulacağı da yargıdır.
**Değişen:** `_src.html` (Ayarlar → Bildirimler grubu, `push-status`'ın
altı) · `js/parts/10x-w2-bildirimler.js` (`bildirimRenderSettings` + yazan
fonksiyon) · `js/parts/15b-i18n-dict-core.js` + `js/parts/15e-i18n-dict-en.js`
`_sessizSaatTercihi()` **zaten okuyor** (`10x:409`, anahtar
`etw_sessiz_saat_v1_<uid>`, biçim `{start, end}` 0–23 tamsayı) — bu faz
yalnız yazan yüzeyi kurar. Kapı: tercih yokken payload'da `quiet_*`
anahtarı hiç bulunmaz (bugünkü davranış korunur).

**KAPSAM DARALTILDI — keşif kararı (2026-09-04).** Rapor "sessiz saat
aralığı **+ tip anahtarları**" diyor. Sessiz saat yapılabilir: şema onu
zaten taşıyor (`user_engagement.quiet_start/quiet_end`, `000:1032-1033`).
**Tip anahtarları yapılamaz** ve sebebi kolon eksikliğinden ağırdır:
merdiven (winback · seri riski · söz · kilometre · sabah) **sunucuda**
koşar ve `user_engagement`'ı okur; o tabloda tip kolonu yoktur. Tercihi
yalnız cihazda tutmak, kullanıcının kapattığı bildirimin yine de
gelmesi demektir — yani **çalışmayan bir düğme**, ve bu §6.2'nin
tanımıdır (sahte başarı yalnız raporda değil, arayüzde de olur).
Tip anahtarları bir migration + `send-push` dalı ister; ayrı bir iştir ve
`## Taşınanlar` altına yazılır.

**🅞 kararları (plandan okunamayanlar):** (a) seçicinin biçimi — hazır
aralık listesi mi iki saat seçici mi; hazır liste "gece vardiyası"nı dışarıda
bırakır ve boşluğun kendisi bu vakadan doğmuştu, (b) cümlenin sesi: bu bir
ayar tablosu değil bir **rica** — "bildirim penceresi" değil, *"Gece kaçtan
sonra sana dokunmayalım?"*

### FAZ 5 — Tık atıfı · 🅢 · ~1 oturum
**Yeni:** `migrations/052_tik_atifi.sql` (RPC bloğu)
**Değişen:** `supabase/functions/send-push/index.ts` (payload'a `nid`) ·
`sw.js` (postMessage'a `nid`) · `js/parts/14-boot.js` veya mesaj dinleyicisi ·
`js/parts/13q-gozlemevi.js` (Davetin Nabzı'nın notu)
K2'ye birebir uyulur: `nid` yoksa hiçbir şey yazılmaz. Kartın "bu sıfır bir
sonuç değil, bir boşluk" cümlesi **kaldırılmaz** — yerine koşullu hâle gelir:
veri geldiğinde sütun konuşur, gelmediğinde not durur.

**Keşif kararı — SIRA TERSİNE ÇEVRİLİR (2026-09-04).** `send-push:452-455`
bugün önce gönderiyor, sonra logluyor: `sendToUser(...)` → `if (sent > 0)`
→ `notification_log.insert(...)`. Yani payload hazırlanırken **satırın
kimliği henüz yok** ve `nid` oraya konamaz.
Doğru sıra: **insert → id al → `nid`'li payload ile gönder → `sent === 0`
ise satırı SİL.** Silme adımı süs değil sözleşme koruması: bugünkü kod
yalnız teslim edilen bildirimi logluyor, yani `notification_log`'un satır
sayısı "denendi" değil "gönderildi" demek. Sırayı çevirip silmezsek o
sözleşme sessizce değişir ve **Davetin Nabzı'nın gönderim sütunu şişer** —
kartı düzeltirken kartı bozmuş oluruz.

**RPC sözleşmesi:** `notif_mark_clicked(p_id bigint)` SECURITY DEFINER;
`UPDATE notification_log SET clicked_at = now() WHERE id = p_id AND
user_id = auth.uid() AND clicked_at IS NULL`. Üç koşul da gerekli:
`user_id` başkasının satırını mühürlemeyi keser, `IS NULL` ise **ilk tık
kazanır** — ikinci açılış "yeni bir tık" değildir ve saydırılmaz.
Kullanıcıya `notification_log` üzerinde UPDATE yetkisi VERİLMEZ; RLS
bugünkü hâliyle (yalnız SELECT) kalır, yazma tek kapıdan geçer
(`quota_consume` emsali).

### FAZ 6 — Saklama politikası · 🅢 · ~1 oturum
**Yeni:** `migrations/053_saklama_politikasi.sql` (agregat + prune) ·
**Değişen:** `migrations/README.md`
> **Numara kararı (FAZ 5 Durak 1, 2026-09-04):** plan üç fazı tek `052`'de
> topluyordu; FAZ 5 ayrı ve odaklı bir dosya açtı. Karar bu yönde
> kesinleşti — **her faz kendi migration'ını alır** (`052` tık atıfı ·
> `053` saklama · `054` rıza defteri). Gerekçe defterin kendisidir:
> `migrations/README.md` ELLE kuyruğunu dosya dosya sayar ve sıra
> pazarlıksızdır; üç işi tek dosyaya koymak, birini koşup ikisini
> koşmamayı imkânsız kılardı — oysa üçünün aciliyeti farklı.
K3'ün sırası: `usage_events_daily` (user_id, gun, screen, kind, adet,
toplam_ms) → geri doldurma → `usage_events_prune(p_gun int default 90)`.
Cron'a bağlanmaz. `admin_usage_report`'a **dokunulmaz** (blok taşıma kuralı
`051`'de mühürlü; `052` rapora hiç girmiyorsa taşıma borcu doğmaz).

### FAZ 7 — Rıza defteri · 🅢 · ~1 oturum
**Yeni:** `migrations/054_riza_defteri.sql` (`hukuk_kabul` tablosu + RLS) ·
**Değişen:** `js/parts/03-auth-shell.js` (kayıt anında yazım) · `js/parts/13p-hukuk.js`
`hukuk_kabul(user_id, surum, kabul_at)`; kullanıcı yalnız kendi satırını
okur/yazar. Mevcut `bulten_izin_surum` **korunur** — o ayrı bir rızadır ve
bu defter onun yerine geçmez.

### FAZ 8 — Sürüm-değişim banner'ı + HK 1.4 · 🅞 · ~0.5 oturum
> **BÖLÜNDÜ (2026-09-04):** `8a` defteri okuyan taraf — **bitti**.
> `8b` saklama cümlesi + `HK_VERSION` `1.4` + uygulama-geneli banner —
> **ELLE'ye bağlı**: `053` koşulup `usage_events_prune(90)` periyodik hâle
> gelmeden metin yanlış olur ve sürüm artışı, işlemeyen bir vaadi kullanıcıya
> "okumuş" saydırır. Ayrıntı `## Durum` kaydında.
Devir: 🅞 — banner'ın tonu yargıdır: "yeniden onayla" bir kapı kurar, oysa
doğru cümle "değişeni oku"dur; ve saklama süresi cümlesinin hukuk metnindeki
yeri ile dili (KVKK "gerekli süre kadar" beklentisi) mühür ister.
**Değişen:** `js/parts/13p-hukuk.js` (`HK_VERSION` → `1.4` + saklama cümlesi
+ banner) · sözlükler
K4: sürüm **burada** artar, FAZ 6 ve FAZ 7 kapandıktan sonra.

### FAZ 9 — Araç registry · 🅢 · ~1 oturum
**Değişen:** `js/parts/13a-arac-motoru.js` · `js/parts/10B-ilham-karti.js` ·
`js/parts/12e-isik-nisanlari.js`
K5: `_ARAC_DEFS` kayıtları `{ marker, parse, label, cta, run }`'a genişler;
`[KART]` ve `[NISAN]` kendi regex'lerini registry'ye **taşır**, parser'ları
tek yerden derlenir. `[ARAC:x]{json}` biçimi ve `aracExtract`/`aracAfterReply`/
`aracPromptGuide` imzaları dokunulmaz (korunan sözleşme). Rehber cümleleri
(`aracPromptGuide`) registry'den derlenir.

### FAZ 10 — Yeni araçlar · 🅞 · ~1 oturum
Devir: 🅞 — uygulamanın ritüel evreninden **hangi** üçünün LLM'in eline
verileceği ve chip cümlelerinin kitap-köklü hâli üründe bulunur; fazla araç,
sohbeti bir menüye çevirir.
**Değişen:** `js/parts/13a-arac-motoru.js` · sözlükler
Sınır (korunan): onay-chip'i ilkesi gevşetilmez — LLM önerir, kullanıcı mühürler.

### FAZ 11 — Sosyal bildirim altyapısı · 🅢 · ~1 oturum
**Değişen:** `supabase/functions/send-push/index.ts` (merdivene `sosyal`) ·
`js/parts/10C-sosyal-feed.js` (in-app rozet) · gerekirse yeni migration
Freq-cap'e tabi; merdivende winback'ten **önce** gelir (raporun kararı).
Rozet, `13B` tören kuyruğuna sormaz — rozet bir sahne değil, bir işarettir.

### FAZ 12 — Sosyal bildirim microcopy'si · 🅞 · ~0.5 oturum
Devir: 🅞 — "Kartına yorum geldi" cümlesinin kitap-köklü hâli ve rozet
metni üründe bulunur; sayaç dili ("3 yeni yorum!") bu ürüne girmez.

### FAZ 13 — Eşik alarmı altyapısı · 🅢 · ~1 oturum
**Değişen:** `js/parts/13q-gozlemevi.js` (eşik okuma + alarm satırı) ·
`supabase/functions/send-push/index.ts` (`admin` tipi) · gerekirse yeni migration
Kartların **zaten** yazdığı teşhis cümleleri (oda 17: "her kart eşiği aşınca
kendi tanısını yazıyor") tek yerde toplanır ve bir alarm listesine dönüşür.
Yeni bir teşhis motoru yazılmaz — var olan cümleler toplanır.

### FAZ 14 — Eşik değerleri + kanallar-üstü tavan · 🅞 · ~1 oturum
Devir: 🅞 — hangi sayı bir alarmı hak eder ve günde kaç dokunuş çoktur;
ikisi de üründe ayarlanır. 11·F3 buraya biner: tavan, 13B'nin oturum
bütçesiyle aynı deftere yazılır.

### FAZ 15 — SW dil pürüzü teşhisi · 🅢 · ~0.5 oturum
**Değişen:** `js/parts/16c-*.js` (dil algılama) veya `14-boot` boot sırası
Önce **teşhis**: dil tercihi hangi sırayla okunuyor, SW hangi varlığı cache'liyor.
Kök bulunmadan yama yazılmaz — rapor bu maddeyi "teşhissiz" diye işaretlemiş.
Bulgu bir kırık değilse **yanlışlanır** ve rapora öyle yazılır.

### FAZ 16 — Ses şiddet kademesi · 🅞 · ~0.5 oturum
Devir: 🅞 — "kısık"ın dozu (gain çarpanı) kulakla ayarlanır, plandan okunmaz.

### FAZ 17 — Akşam ısrar dozu · 🅞 · ~0.5 oturum
Devir: 🅞 — "3 ✕ → bugün sus" eşiğinin sayısı ve sözleşmenin özünü
(✕ "şimdi değil"dir) bozmayacak biçimi üründe kararlaşır. Ölçüm tarafı
(Gözlemevi sorgusu) veriye bağlıdır; kural tarafı bugün yazılabilir.

### FAZ 18 — Ölü import temizliği + kapısı · 🅢 · ~1 oturum
Opus öz-denetiminde (2026-09-05) ÖLÇÜLDÜ: `js/parts` altında 123 ölü named
import / 21 dosya. **Merge sonrası yeniden ölçüldü (2026-09-06): 121 / 20** —
PR #13 ve #14 ikisini kendiliğinden temizlemiş. Sayı bir ALT SINIRDIR ve
yönü bilinçlidir: tarayıcı ölü bir importu kaçırabilir, ama canlı olanı ölü
SANMAZ (kör nokta defteri betikte yazılı). Şişmez, eksilir.

**Tarayıcı yazıldı:** `scripts/olu-import-denetci.mjs` — `--liste` /
`--taban-yaz` / `--dizin` kolları, emsal `scripts/ihtimalsel-denetci.mjs`.
Bedelin ne olduğu da orada yazılı ve bundle DEĞİL: rollup zaten tree-shake
ediyor. Bedel OKUMADIR — `13a` `etiketCoz`'u import edip kullanmıyordu, yani
dosyayı açan herkes "burada etiket çözülüyor" sanıyordu; oysa o iş FAZ 9'da
saf yaprağa taşınmıştı. **Ölü import bir performans borcu değil, yanlış bir
haritadır.**
**Yeni:** `tests/olu-import-kapisi.test.js` (adı `*-kapisi` olduğu için
`kapi:genel` desenine kendiliğinden girer) + tarama motoru.
**Değişen:** 21 dosyanın import satırları.
TUZAK — mekanik değil: bir modülden gelen adların **tamamı** ölüyse import
SATIRI silinir ve o modülün **yan etkisi** de gider. Yan etkisi olan modüller
(`00a-infrastructure` boot logu gibi) için satır kalır, yalnız ad çıkarılır.
Her dosya build + hedefli süitle ayrı doğrulanır.
Taban çizgisi kalıbı: `tests/referans-butunlugu.test.js`. Sıfırlanana kadar
TABAN düşürülür; sıfırda kapı sert 0-toleransa döner.

**Etiket sayımı:** 🅢 **12** (1·2c·2e·3·5·6·7·9·11·13·15·18) · 🅞 **8**
(2·4·8·10·12·14·16·17) — oran kapısı (§4.4) geçildi: 🅞 ≤ 🅢. Beş faz
bölünerek bu orana getirildi: gövde 🅢 önce gider, yargı çekirdeği 🅞 üstüne
biner (1/2 · 7/8 · 9/10 · 11/12 · 13/14).

## State / Veri

- **Değişmeyen:** `usage_events` şeması · `notification_log` kolonları ·
  `[ARAC:x]{json}` token biçimi · `is_premium/is_premium_plus` · `HK_VERSION`
  okuma noktaları.
- **Yeni tablo:** `usage_events_daily` (agregat) · `hukuk_kabul` (rıza defteri).
- **Yeni RPC:** `notif_mark_clicked(p_id)` · `usage_events_prune(p_gun)`.
- **Yeni storage:** sessiz saat tercihi — SafeStorage per-uid (`10x`'in
  `_sessizSaatTercihi()` beklediği anahtar; ikinci anahtar yazılmaz).
- **Tuzak:** `052` `admin_usage_report`'a **dokunmaz**; dokunursa `051`'in on
  yedi bloğunu taşımak zorunda kalır (`tests/migration-blok-tasima.test.js`).

## Ton Rehberi (kitap-köklü TR)

Sessiz saat yüzeyi bir ayar tablosu değil bir **rica** dilidir: *"Gece kaçtan
sonra sana dokunmayalım?"* — "bildirim penceresi" değil. Sürüm banner'ı
onay istemez, **haber verir**: *"Sözleşmemizin bir cümlesi değişti."*
Sosyal rozet sayı bağırmaz: *"Kartına biri yazmış."* Kriz korpusu kullanıcıya
hiç görünmez — orada ton değil **doğruluk** ölçülür.

## Riskler / Dikkat

1. **Kriz korpusu bir ürün metni değil bir sınav kâğıdıdır** — cümleleri
   kullanıcıya asla gösterilmez, ama yanlış etiketlenmiş bir satır kapıyı
   yanlış yere kurar. Şüpheli satır korpusa girmez.
2. `052`'nin `admin_usage_report`'a dokunmaması **kasıtlıdır** (K3 notu).
3. Tık atıfı `send-push` redeploy'una bağlıdır — kod yazılır, canlanması ELLE.
4. HK_VERSION artışı `bulten_izin_surum` yazımını da etkiler (`03:715`);
   FAZ 8'de o satırın davranışı kontrol edilir.
5. Registry göçünde üç parser'ın sözleşmeleri farklıdır: `[ARAC]` chip üretir,
   `[KART]` metinden **gizlenir**, `[NISAN]` Emre mesajında işlenir. Tek
   `run` semantiğine zorlamak üçünü de bozar.
6. Ses kademesi `_master.gain` üstünden geçmeli — cue'ların kendi gain'leri
   ayrı (`13e:79-82`), ikisini birden çarpmak sesi iki kez kısar.

## Doğrulama (dogrula.mjs, her faz sonunda)

1. `npx vitest run tests/kriz-eval.test.js` → kaçırma 0 · yanlış-alarm 0 ·
   korpus ≥30 (FAZ 1–2).
2. `node scripts/dogrula.mjs --eval "typeof window.wtLogPaylasim"` →
   `"function"` (FAZ 3 regresyonu).
3. `node scripts/dogrula.mjs --eval "typeof window.bildirimRenderSettings"` →
   `"function"` (FAZ 4).
4. `grep -c "admin_usage_report" migrations/05[234]_*.sql` → **0** (K3/risk 2).
5. `node scripts/dogrula.mjs --eval "typeof window.aracExtract"` →
   `"function"` (FAZ 9 sözleşme regresyonu).
6. `node scripts/dogrula.mjs --eval "window.aracExtract('[ARAC:gordun]').tools[0].tool"`
   → `"gordun"` ve `--eval "['gordun','sabir','ayna'].filter(x => window.aracPromptGuide().includes('[ARAC:'+x+']')).join(',')"`
   → `"gordun,sabir,ayna"` (FAZ 10: registry ve rehber AYNI üç adı taşır —
   biri ötekisiz kalırsa model olmayan bir araç önerir ya da var olan araç
   hiç önerilmez; ikisi de sessizdir).
7. `npx vitest run tests/tik-atifi.test.js` → merdivenin KOŞULSUZ seçebildiği
   her tetiğin `fallbackCopy`'de bir `case`i var (FAZ 11–12). Bu kapı bir
   üslup değil bir DAVRANIŞ kilidi: metni olmayan bir tetik merdivende
   koşulsuz durursa yalnız kendini değil **altındaki her basamağı** susturur
   — `sosyal` tam bunu yaptı ve denetimde yakalandı. FAZ 13'ün `admin` tipi
   aynı tuzağa açıktır: metni yazılmadan `METNI_HAZIR`'a eklenmez.
8. Her fazda: `./build.sh` → hedefli süit → **`npm run kapi:genel`** → tarayıcı.

## Kritik Dosyalar

- **YENİ:** `tests/kriz-eval.test.js` · `tests/fixtures/kriz-korpus.mjs` ·
  `migrations/052_tik_atifi.sql` · `053_saklama_politikasi.sql` · `054_riza_defteri.sql`
- **Yerinde evrim:** `js/parts/13a-arac-motoru.js` · `10x-w2-bildirimler.js` ·
  `13p-hukuk.js` · `13q-gozlemevi.js` · `10B-ilham-karti.js` ·
  `12e-isik-nisanlari.js` · `13g` paylaşım motoru · `10C-sosyal-feed.js` ·
  `03-auth-shell.js` · `sw.js` · `supabase/functions/send-push/index.ts`
- **Yeniden kullanılan (keşifte bulundu — ikizini yazma):**
  - `_ARAC_DEFS` (`13a:75`) — registry'nin çekirdeği ZATEN var, dört araçlı
  - `_sessizSaatTercihi()` (`10x:403`) — okuyan taraf ZATEN yazılmış, yüzey yok
  - `notification_log.clicked_at` (`000:1059`) — kolon ZATEN var
  - `000:1228` — 90 günlük prune cümlesi ZATEN yorumda duruyor
  - `detectCrisis`/`detectCrisisSoft` (`13-extras:816/822`) — eval'in ölçtüğü motor
  - `bildirimRenderSettings` (`07:24` çağırıyor) — ayarlar kancası ZATEN bağlı
  - `13B` `trnIzin` — kanallar-üstü tavanın doğal evi
  - `10F` `sz*` — süzgeç deseni, yeni bir moderasyon motoru yazılmaz

## Hafıza bağları

`[[rapor-bayatligi]]` · `[[kapi-sessiz-gec]]` · `[[artifact-galerisi]]` ·
`[[yerel-tarih-anahtari]]` · `[[boot-nabzi]]` · `[[olu-kod-temizlikleri]]`

## Durum

- Plan kuruldu (2026-09-04).

- **FAZ 1+2 · BİTTİ** (2026-09-04, commit `d2d4733`). Koşucu `uygulayici`da
  (🅢), korpus parent'ta (🅞). Sonuç 52 satır · 13 dil · beş kova · 17 test.

  **Faz denetimi (parent · Opus, devredilen FAZ 1 için) — iki kırık:**
  (a) `kriz` kovası `detectCrisisSoft`'un yakalamasına razı oluyordu; oysa
  soft sinyal kriz KARTINI açmaz, yalnız sessiz LLM teyidine gider — sert
  bir cümle soft'a düşerse kullanıcı 112'yi GÖRMEZ. Eşik sertleştirildi.
  (b) Tanımsız bir `beklenen` değeri sessizce düşüyordu ve yorumu "korpus
  kapısında fark edilir" diyordu — oysa hiçbir test kovaların toplamını
  korpus uzunluğuna bağlamıyordu. **Olmayan bir kapıyı var sayan cümle,
  boşluğun kendisinden kötüdür** (§6.6). Bölme iddiası teste bağlandı.

  **Ve korpusun ilk koşusu bir ÜRÜN kırığı buldu — bu fazın asıl kazancı:**
  JS'in `/i` bayrağı Türkçenin noktalı İ'sini (U+0130) katlamıyor
  (`'İ'.toUpperCase()` → `'İ'`, `'i'.toUpperCase()` → `'I'`). Yani
  `/intihar/i` **"İntihar etmeyi düşünüyorum."** cümlesini, `/ilaç.*fazla
  al/i` ise **"İlaçları fazla aldım."** cümlesini kaçırıyordu — ve Türkçede
  cümle başındaki her `i` sözcüğü büyük İ ile yazılır. Kriz kartı
  açılmıyordu. Düzeltme `krizMetniNormalize` (`13-extras`): yalnız U+0130 ve
  birleşen nokta (U+0307); ASCII `I`'ya dokunulmadı, İngilizce desenler
  bozulmadı. Kapısı korpustan **bağımsız** durur — korpus satırı silinse
  bile regresyon kilidi ayakta kalır.

  **Kova kararı (§3.3'ün üç kovasının korpustaki karşılığı):** iki kova bir
  kusuru saklamıyor, **mühürlüyor** — `bilinen_sinir` desenin bugün yanlış
  alarm verdiği masum cümleleri (alıntı · deyim · üçüncü şahıs),
  `bilinen_kacirma` ise bir insanın kriz sayacağı ama desenin saymadığı
  cümleleri adıyla tutar. İkisi de desen değişince kırmızıya döner. Oda
  15'in *"kaçırma oranı ölçülemez"* cümlesinin elle tutulan cevabı budur:
  ölçülemeyen şey oran, **ölçülebilen şey örnektir**.

  Kapı: build ✅ · hedefli süit ✅ 147/147 · `kapi:genel` ✅ 302/302 ·
  `dogrula` ✅ exit 0 "Konsol temiz." · CI Kapı #70 ✅ (önceki commit).
  Çapraz denetim (`denetci` · Sonnet) koşuldu — bulguları aşağıda.

- **FAZ 2c+2d · BİTTİ** (2026-09-04). 2c `uygulayici`da (🅢), 2d parent'ta.
  `Devir dışı (2d):` bu faz 2c'nin **Duraklar** listesinden doğdu ve kararı
  bir tasarım yargısıydı — kanıt alıntısının kullanıcının kendi cümlesi
  kalması (§6.10) için normalize'ın konum koruması gerekiyordu; ajan o
  kararı veremezdi, tam da onu Durak olarak geri döndürdü.

  Kök çözüm tek noktada: `dpTest`/`dpAllTest` (16-i18n-prompts) metni bir
  kez normalize eder; `krizMetniNormalize` oraya taşındı, `13-extras` onu
  **re-export** ediyor — ikinci kopya yazılmadı (§1.3). 17 çağrı yeri /
  8 dosya geçti. Kapı `tests/i-tuzagi-kapisi.test.js`: kapsam listesi
  **sözlükten türetiliyor**, elle yazılmıyor — yeni bir desen eklendiğinde
  kapı kendiliğinden büyür (§3.3'ün "liste değil desen" dersi).

  **2d — konum koruyan normalize.** İki tüketici deseni değişkene alıp
  `.exec()`/`.match()` çağırıyor ve eşleşmenin YERİNİ kullanıyor:
  `13D _adaylariBul` kanıt alıntısını, `00-config captureCommitments` sözün
  metnini o indeksle ORİJİNAL metinden kesiyor. `dpNormalize`'ın ikinci
  adımı (NFD birleştirme) metni kısaltır, yani indeksleri bozardı.
  `dpNormalizeKonum` yalnız U+0130 → `i` yapar ve bu **uzunluk korur** —
  ikisi de tek UTF-16 kod birimi. Böylece desen normalize metinde eşleşir,
  kanıt orijinalden kesilir: kullanıcı ekranda **kendi cümlesini** görür.
  Ayrım gerçekti: `detect.duygu.huzur`'da `/içim rahat/`, `umut`'ta
  `/inancım var/` var — "İçim rahat." yazan biri bugüne dek hiç
  tanınmıyordu. `captureCommitments` ise **gizli** bir risktir (bugünkü
  dört desenin hiçbiri `i` ile başlamıyor); dikiş yine de atıldı.

  **Denetim (parent · Opus) — üç Durak da doğrulandı, üçü de karara bağlandı:**
  ikisi bu turda düzeltildi (yukarıda), üçüncüsü aşağıya taşındı. Ayrıca
  parent'ın kendi ilk davranışsal testi **yanlıştı ve kendini yakaladı**:
  `dgNabiz`'in dönüş şekli `{adaylar:[…]}`, `{aile}` değil; ve seçtiğim
  cümle (`"İçim rahat, yük kalktı üstümden."`) `/yük kalktı/` üstünden
  eşleşiyordu — yani kapı yeşil yanarken İ'yi hiç sınamıyordu. Cümleler
  tek desenli hâle getirildi: **sınav, sınadığını sınamalıdır.**

  Kapı: build ✅ · hedefli süit ✅ **1796/1796** (64 dosya — paylaşılan motor
  değiştiği için tüketicileri de girdi) · `kapi:genel` ✅ 329/329 ·
  `dogrula` ✅ exit 0 "Konsol temiz."

### Taşınan Durak — `09b`'nin paralel sözlüğü · plana yazıldı, uygulanmadı
`js/parts/09b-depth-foundations.js:1237,1389` kendi `_BELIEF_PATTERNS` ve
`_CHOICE_PATTERNS` sözlüklerini taşıyor ve `dp()`'den tamamen bağımsız
çalışıyor. Doğrulandı: `detect.belief.*` / `detect.choice.*` anahtarlarını
`dp()`/`dpAll()` ile çağıran **hiçbir yer yok** — yani `16c`'deki o
girdiler bugün **ölü**, gerçek tüketici 09b'nin kendi kopyası.

Bu iki bulguyu birden taşır: (1) aynı büyük-İ tuzağı orada da açık,
(2) **tek-kaynak motorun ikizi çoktan doğmuş** (§1.3). İkincisi
birincisinden ağırdır ve düzeltmesi bir birleştirme kararıdır: 09b'nin
sözlüğü `16c`'ye mi taşınacak, yoksa `16c`'nin ölü girdileri mi silinecek?
İkisi de kanıt ister (`grep -rn` ile yetim kontrolü, §3.1) ve ikisi de bu
sprintin kapsamı değil. Sessizce düşmesin diye burada duruyor.

### Taşınan bulgu — OİK bağlam başlığı yerelleşmiyor · plana yazıldı, uygulanmadı
`10D-olmak-istedigin.js:747` bağlam bloğunu **hardcoded Türkçe** başlıkla
kuruyor (`'◈ OLMAK İSTEDİĞİN KİŞİ · …'`), oysa İMGE bağlamı aynı işi
`p('prompt.imge.baglam_header')` ile **yerelleştirerek** yapıyor
(`09a:1685`). Yani EN kullanıcının modeli, İngilizce bağlamın ortasında
Türkçe bir başlık okuyor.

FAZ 10 bunu bir kırık olarak değil bir **kısıt** olarak kabul etti ve EN
rehber cümlesi işarete adıyla bakıyor (*"an 'OLMAK İSTEDİĞİN KİŞİ' block
appears above — that header stays Turkish in every language"*). Doğru
çözüm başlığı `p()`'ye taşımaktır; ama bu 16b/16e'ye yeni bir prompt
anahtarı eklemek demek ve FAZ 10'un kapsamı değil. Sessizce düşmesin diye
burada duruyor.

- **FAZ 3 · BİTTİ** (2026-09-04). `uygulayici`da (🅢), Durak yok.
  `_shareCanvas(cv, title, tur)`; yedi çağıran planın eşleme tablosuyla
  geçti; `_PAY_TUR` kümesi genişlemedi. Asıl bulgu kapandı: `13g:301`'in
  sabit `tur:'kart'`'ı `tur`'a devredildi — indirilen bir Wrapped artık
  kart değil **film** sayılıyor. `shrShareArticle` yolundaki `'rapor'`
  sabitine bilerek dokunulmadı ve **neden dokunulmadığı** yorumda yazılı
  (tek çağıranı hep rapor paylaşır).

  **Denetim (parent · Opus) — bir eksik bulundu ve kapatıldı.** Ajanın
  testi tümüyle KAYNAK TARAMASIYDI ve gerekçesi geçerliydi (jsdom'da canvas
  2D yok, `_drawStory` çöker). Ama kaynak taraması iki yönden zayıftır:
  biçim değişince sahte kırmızı verir, ve zincirin gerçekten çalıştığını
  hiç kanıtlamaz (§3.5 — asıl kırıklar davranışsaldır). Canvas bağlamı bir
  no-op Proxy ile taklit edilebiliyormuş: `shrShareStory` uçtan uca koşuyor
  ve üç davranışsal test eklendi. En değerlisi doğrudan eski kırığı ölçüyor:
  `shrShareStory({tur:'film'})` → `['indir', {tur:'film'}]`. Eski kod aynı
  çağrıda `kart` yazardı, yani **bu test dün kırmızı olurdu** — bir kapının
  değerini gösteren tek ölçü budur.

  Kapı: build ✅ · hedefli süit ✅ 289/289 (7 dosya) ·
  `kapi:genel` ✅ 329/329 · `dogrula` ✅ exit 0 "Konsol temiz."

- **FAZ 4 · BİTTİ** (2026-09-04). 🅞, parent'ta.
  `Devir dışı:` gerekmedi — 🅞 fazlar zaten devredilmez.
  Yüzey `_src.html`'de Ayarlar → Bildirimler grubuna girdi; `10x`'e
  `bildirimSessizKaydet` + `_sessizYuzeyCiz` eklendi; `main.js` bağladı;
  TR+EN sözlük girdileri parite kapısından geçti.

  **Üç yargı ve gerekçeleri:**
  (a) **İki saat seçici, hazır aralık listesi değil.** Bu boşluk gece
  vardiyasında çalışan biri düşünülerek açılmıştı ("07:00 sabah daveti
  rahatsızlıktır ve tek çıkışı izni tamamen kapatmak olmamalı") — hazır
  bir liste tam o vakayı dışarıda bırakırdı.
  (b) **Ses bir rica, bir ayar tablosu değil:** *"Gece kaçtan sonra sana
  dokunmayalım?"* — "bildirim penceresi" değil.
  (c) **Tercih yokken not satırı bunun bir VARSAYILAN olduğunu söylüyor.**
  Seçicilerde 23:00/08:00 görünüyor çünkü davranış gerçekten o; ama seçili
  görünen bir değeri "senin seçimin" diye sunmak kanıtı olmayan bir
  iddiadır (§6.10). Kartlar ne ölçmediğini söylüyorsa, bir ayar da neyi
  henüz bilmediğini söyler.

  Tercih sunucuya da taşınıyor (`bildirimSyncEngagement`) — motor cihazı
  değil `user_engagement`'ı okur; yalnız SafeStorage'a yazmak seçimi bir
  sonraki senkrona kadar hükümsüz bırakırdı.

  Kapı: build ✅ · hedefli süit ✅ 38/38 (i18n paritesi + aria dahil) ·
  `kapi:genel` ✅ 329/329 · `dogrula` ✅ exit 0 "Konsol temiz."

- **FAZ 4 denetimi (Sonnet) · KAPANDI** (2026-09-04). İlk deneme kota
  duvarına çarpıp yarıda öldü (§3.3'ün yeni "denetim borcu" maddesi tam bu
  vakadan doğdu); ikinci deneme tamamlandı. Dört iddia canlı koşuldu ve
  dördü de temiz: geçersiz girdi altı kenar durumda hiçbir şey yazmıyor ·
  seçenekler üç render'da katlanmıyor · varsayılan şemayla birebir ·
  ve en önemlisi **kapsam daraltmasının gerekçesi kaynağa karşı doğru**
  (`send-push:439,445` `user_engagement`'ı okuyor, tip kolonu yok). Bir işi
  YAPMAMAK için verilen gerekçe yanlış olsaydı, işi sessizce düşürmekten
  kötü olurdu.
  **Tek bulgu — register:** EN `bld.quiet.lead` *"leave you alone"* TR'nin
  *"sana dokunmayalım"* sıcaklığını taşımıyordu; deyim uygulamanın hiçbir
  yerinde kullanılmıyor (kurulu bir ses değil) ve İngilizcede çoğunlukla
  itici bir bağlamda duyuluyor. Ayrıca TR'nin **"Gece"**si EN'de hiç yoktu.
  **Düzeltildi:** *"At night, after what hour should we let you be?"*

- **FAZ 2e · BİTTİ** (2026-09-04). `uygulayici`da (🅢) + parent'ın denetimi.
  51 çağrının 50'si `reTest`'e geçti (`09b`×31 · `09a`×17 · `10-features-w2` ·
  `01-prompts-modes`); kapı `tests/i-tuzagi-kapisi.test.js`'e girdi ve
  tarayıcı **geri-referanslı** yazıldı — `X.some(ad => ad.test(` kalıbını
  ararken `ad`'ın aynı olmasını şart koşuyor.

  **Denetim (parent · Opus) — üç Durak, üçü de karara bağlandı:**
  1. `13D:173` `sonra.some(k => _OLUMSUZ_EK_RE.test(k))` **bilerek
     bırakıldı ve doğru bırakıldı**: roller ters (tek desen, çok belirteç),
     `reTest`'in imzası uymuyor. Ayrıca `_OLUMSUZ_EK_RE`'nin bütün
     alternatifleri `m` ile başlıyor — orada İ tuzağı zaten yok. Kapı onu
     ihlal SAYMAYAN bir testle mühürledi. Benim ilk gevşek grep'im bu satırı
     ihlal sanmıştı; ajanın tarayıcısı benden isabetliydi.
  2. **ÜÇÜNCÜ KALIP bulundu ve bu turda kapatıldı.** Planın kendi tez
     örneği — `/ilk kez/i`, "yeni kişi" seçimi — bu fazla düzelmiyordu:
     gerçek tüketici `.some()` değil `for (const pat of …) { if (pat.test(…)) }`
     kullanıyor. Yani **planın giriş paragrafı fazla söz vermişti** ve ajan
     bunu Durak olarak geri döndürdü. Üç fonksiyon düzeltildi
     (`dfAnalyzeBeliefs` · `dfAnalyzeChoices` · `dfAnalyzeFinancialAbundance`):
     döngü bozulmadı, **hedef** normalize edildi, kaydedilen kanıt orijinal
     kaldı. Kapı davranışsal — kaynak taramasıyla güvenilir yakalanamaz.
  3. Aşağıdaki süreç hatası.

  Kapı: build ✅ · hedefli süit ✅ 561/561 (17 dosya) ·
  `kapi:genel` ✅ 339/339 · `dogrula` ✅ exit 0 "Konsol temiz."

## Opus öz-denetimi — 2026-09-04 · sprint ortası (Emre'nin talebi)

Emre *"buraya kadar yaptıklarını analiz edip sorunları giderip geliştirmeleri
yapıp üstelik çalışmayı en iyileyip continue"* dedi; §3.7 bu hâlde tek başına
koşar ve kapsamı Emre'nin adlandırdığı iştir — bu oturumun tamamı.
**Plan KAPANMADI**, kapanış kaydı ayrıca yazılacak.

**Plana karşı.** On dokuz fazın altısı teslim edildi (1 · 2 · 2c · 2d · 3 · 4),
biri bu denetimden doğdu ve teslim edildi (2e). Her fazın **Yeni:/Değişen:**
listesi ağaca karşı okundu. Sapmalar: (a) FAZ 4'ün denetimi kotayla yarıda
kaldı, borç işaretlendi ve kapandı; (b) FAZ 2d parent'ta uygulandı,
`Devir dışı:` gerekçesi yazılı; (c) FAZ 4'ün kapsamı daraltıldı, gerekçesi
denetimde kaynağa karşı doğrulandı; (d) **planın FAZ 2e giriş paragrafı
fazla söz verdi** — düzeltilmeyecek bir örneği düzelecek gibi gösterdi;
ajan yakaladı, örnek bu turda gerçekten düzeltildi.

**Koda karşı.** Kapıların görmediği yer gerçekten vardı ve iki kez bulundu:
büyük-İ tuzağı `dp()` dışında da yaşıyordu (FAZ 2e), ve `.some()` dışında
üçüncü bir kod şekli daha vardı (2e denetimi). Tarama 16 aday döndürdü,
onu yanlış pozitifti (CSS sınıfı, İngilizce sözcük) ve sayı şişirilmedi.
Tek-kaynak motorun ikizi konusu **büyüdü ve kayıtta**: `09a`/`09b` kendi
sözlüklerini taşıyor, `16c`'deki karşılıkları ölü. Bu turda birleştirilmedi
— eşleştirme birleştirildi, sözlük değil.

**Vizyona karşı.** Bu sprintin teze en yakın işi bir özellik değil bir
**düzeltme**: uygulama, cümlesine büyük İ ile başlayan Türkçe kullanıcıyı
sistematik olarak daha az tanıyordu — iyi-hâl beyanını okumuyor, atılımını
saymıyor, ve en ağırı, **"İlk kez söyledim." diyen birini yeni-kişi seçimi
saymıyordu.** Uygulamanın var olma sebebi tam da o anı görmek. Kart değil
kaldıraç ölçüsü burada net. Register korundu; tek kayma EN'de bulundu ve
düzeltildi (yukarıda). Sayaç dili yok, manevi register sekülerleşmedi.

**Sürece karşı.** İki kural boşluğu bulundu, ikisi de **protokole** yazıldı:
§6.6'ya **üçüncü basamak** (kapıya bağlanamayan kural yeniden keşfedilmeyi
bekler; çıkış yolu kodun biçimini kapı kurulabilecek hâle getirmek) ve
§3.3'e **denetim borcu** (karşı model erişilemezse denetim atlanmaz,
ertelenir ve işaretlenir; ve önce mekanizmayı yokla). Ayrıca §3.7'nin
dördüncü ekseni artık üç soruyla başlıyor.

**Bulgular.** 6 — düzeltildi 5 · plana taşındı 1 · reddedildi 0
- `js/parts/16c…` üstünden 12 `dp` anahtarı — İ tuzağı — **düzeltildi** (FAZ 2c)
- `13D` · `00-config` konum-duyarlı tüketiciler — kanıt kayması riski — **düzeltildi** (FAZ 2d)
- `09a`/`09b`/`10-features-w2` 50 çağrı — İ tuzağı, `.some()` biçimi — **düzeltildi** (FAZ 2e)
- `09b:1306,1416,1775` — İ tuzağı, `for…of` biçimi — **düzeltildi** (2e denetimi)
- `js/parts/15e-i18n-dict-en.js:2959` — register kayması — **düzeltildi**
- `09a`/`09b` paralel sözlükleri (`16c` karşılıkları ölü) — §1.3 ikiz motor — **plana taşındı** (`### Taşınan Durak`)

**Sürecin kendi hatası — ve bu turun en dürüst kaydı.** `157a372` commit'i
"Protokole üçüncü basamak…" başlığını taşıyor ama **FAZ 2e'nin 108 satırlık
kaynak göçünü de içeriyor**: `git add -A` çalışırken ajan aynı ağaca
yazıyordu ve commit onu sessizce süpürdü. Üç ayrı kırık: (1) commit mesajı
taşıdığı işi anlatmıyor, (2) o mesajdaki "kapı yeşil" iddiası göçü
içermeyen bir ağaçta koşulmuştu, (3) ajanın işi bitmeden commit'lendi.
Kayıtla gerçek ayrıştı (§6.2) — ve bunu Emre'ye bir mesaj önce hatırlattığım
kuralın (§3.5 madde 2: *koşulan ağaç, commit'lenen ağaç olmalı*) kendisiydi.
Geçmiş yeniden yazılmadı: dal push'lu ve CI o commit'te yeşil koştu; kayıt
düzeltmesi silmekle değil **söylemekle** yapılır.
**Kuralı:** bir ajan koşarken `git add -A` yapılmaz. Ya ajan biter, ya
yalnız kendi dosyalarını `git add <yol>` ile stage'lersin. Bu, kapısı
kurulabilir bir kural değil (commit anında hangi ajanın koştuğunu test
göremez) — ama §6.6'nın üçüncü basamağının kendi sınırıdır ve o sınır da
yazılı olmalı: her kural ölçülemez, ölçülemeyen kural belgeye yazılır ve
**yargıya bırakılanlar** listesine girer.

**Bakılmayan.** Prod durumu (Supabase Dashboard) hiçbir eksende ölçülmedi ve
ölçülemez. `09a`/`09b`'nin sözlüklerinin `16c` ile ne kadar örtüştüğü
sayılmadı — ikiz motor bulgusu adlandırıldı, boyu ölçülmedi. FAZ 5–17
henüz açılmadı; bu kayıt onları kapsamaz.

- **FAZ 5 · BİTTİ** (2026-09-04). `uygulayici`da (🅢) + parent'ın denetimi.
  `052` RPC üç koşullu (`id` · `user_id = auth.uid()` · `clicked_at IS NULL`
  — ilk tık kazanır), `send-push` sırası tersine çevrildi ve `sent === 0`
  dalı satırı **siliyor** (sözleşme korundu: satır sayısı hâlâ "gönderildi"
  demek), `VERSION` ilerletildi, `sw.js` `nid`'i hem postMessage'a hem soğuk
  açılış hash'ine taşıyor, `10x._markNotifClicked` K2'yi mühürlüyor.
  Ajan XSS kapısını da kendi turunda kırmızı bulup düzeltmiş (`notAlt` bare
  değişken olarak TABAN'ı büyütüyordu → `kose` deseninde fonksiyon çağrısı).

  **Denetim (parent · Opus) — iki kırık bulundu ve kapatıldı:**
  1. **Native yol hiç atıf yazmıyordu.** Web tarafı (`sw.js`) kuruluydu ama
     `00e:56` dokunuşta yalnız `data.type` okuyor, FCM payload'ı da (`:378`)
     yalnız `url` ve `type` taşıyordu. Wanderer bir **Capacitor
     uygulaması**: yalnız web'i saymak, "tık oranı" gibi görünen ama
     gerçekte **web-only** bir oran üretirdi — kartın kaçınmak için
     düzeltildiği hatanın ta kendisi. Üç halka da kapatıldı ve `00e`'nin
     kendi **sorumluluk sınırı korundu**: DB'ye o modül yazmaz, olayı
     duyurur (`wndr-native-notif-click`), yazan taraf `10x`'tir —
     `wndr-native-push-token` köprüsünün birebir aynı kalıbı.
  2. **Kartın sıfır dalındaki cümle bayattı.** *"sw.js notificationclick
     atıfı takılı değil"* diyordu — bu fazda **yanlış hâle geldi**. Kod
     içinde `[[rapor-bayatligi]]`: bir teşhis, teşhis ettiği kırık
     kapandığında kendini güncellemez. Yeni cümle iki durumu ayırt
     edemediğini söylüyor (zincir daha koşmadı / koştu ve kimse tıklamadı)
     ve ELLE bekleyen iki adımı adıyla anıyor.
  Durak 2 (RPC dönüş tipi) mekanik, kabul. Durak 3 (panel teşhis cümlesi):
  Gözlemevi admin-only ve zaten `t()`'siz düz teknik Türkçe taşıyor —
  register uygun, kabul; ama cümlenin kendisi yukarıdaki (2) ile tazelendi.

  Kapı: build ✅ · hedefli süit ✅ · `kapi:genel` ✅ · `dogrula` ✅ exit 0.
  **ELLE bekleyen:** `052` migration + `send-push` redeploy. İkisi
  yapılmadan hiçbir şey yazılmaz ve kart bugünkü dürüst notunu korur.

- **FAZ 6 · BİTTİ** (2026-09-04). `uygulayici`da (🅢), Durak yok.
  `053` üç adımı K3'ün sırasıyla taşıyor: agregat tablo → geri doldurma →
  `usage_events_prune(90)` (önce taşır, sonra siler, aynı transaction).
  Cron'a bağlanmadı ve bunun ELLE bir karar olduğu dosyada yazılı.
  `admin_usage_report` adı dosyada hiç geçmiyor — kapı bunu ölçüyor.

  **Ajanın kendi keşfi (planda yoktu, iyi bir mühendislik kararı):** cutoff
  **saat değil GÜN** bazlı. Saat bazlı bir cutoff bir günü iki `prune()`
  çağrısı arasında bölebilir ve REPLACE semantiği ilk yarının sayısını
  sessizce silerdi. Gün bazlı filtre bunu yapısal olarak imkânsız kılıyor:
  bir gün ya tamamen altındadır ya tamamen üstünde.

  **Denetim (parent · Opus) — bir kırık bulundu ve kapatıldı.** Geri
  doldurma **bugünü de** kapsıyor, yani agregat yakın günler için bir satır
  yazıyor ama o gün henüz bitmemiş: akşam gelen olaylar oraya yansımıyor ve
  satır ancak o gün cutoff'un altına düştüğünde düzeliyor. Aradaki pencerede
  satır **durur ama eksiktir**. Bu bir kırık değil bir sözleşme — kırık,
  sözleşmenin **yazılmamış** olmasıydı: yazılmasa bir gün biri o satırı
  "günün toplamı" diye okur ve **ölçülmüş görünen eksik bir sayı** basardı,
  §6.10'un en sinsi hâli. Dosyaya `OKUMA SÖZLEŞMESİ` bloğu girdi (ham satırı
  duran gün için `usage_events`, durmayan gün için agregat; çakışmada otorite
  ham taraf) ve iki test onu kilitledi.
  Küçük bir yan bulgu: kendi yorumum `admin_usage_report` adını anınca kapı
  kırmızıya döndü — kapı haklıydı ve dosyanın zaten bir dili vardı
  ("Gözlemevi'nin 051'de kurulan rapor RPC'si"); yoruma değil, kapıya uydum.

  Kapı: build ✅ · hedefli süit ✅ 19/19 · `kapi:genel` ✅ 339/339 ·
  tarayıcı **gerekçeli** geçildi (`js/`/`css/`/`_src.html` değişmedi).
  **ELLE bekleyen:** `053` migration'ı + periyodik `usage_events_prune(90)`
  koşumu (pg_cron kurulu değil, bilinçli sınır).

- **FAZ 7 · BİTTİ** (2026-09-04). `uygulayici`da (🅢), bir Durak.
  `054` `hukuk_kabul(user_id, surum, kabul_at)`; PK `(user_id, surum)` —
  sürüm artınca **yeni satır doğar, eskisi silinmez**. UPDATE/DELETE
  politikası **bilerek yazılmadı** ve gerekçesi dosyada: *bir rıza kaydı
  düzeltilmez, yenisi eklenir.* `bulten_izin_surum` dokunulmadan duruyor —
  o ayrı bir rıza, defter onun yanına geldi. `HK_VERSION` hâlâ `1.3` (K4).

  **Ajanın gerekçeli kararı, denetimde doğrulandı:** `hkKabulYaz` oturumu
  `S.currentUser?.id` yerine `sb.auth.getSession()` ile okuyor. Sebebi sıra:
  çağrı `initApp`'ten ÖNCE koşuyor ve `S.currentUser` orada henüz boş —
  `S`'ye baksaydı defter kayıt anında **hiç yazılmazdı**. Doğru karar.

  **Durak — karara bağlandı: deftere satır eklendi.** Ajan
  `migrations/README.md`'ye dokunmadı çünkü görev tanımında geçmiyordu ve
  plan-dışı dosyaya dokunmak sözleşmesine aykırı; doğru davrandı ve Durak
  olarak geri döndürdü. Ama 052/053 emsali nettir: **defterde olmayan ELLE
  işi görünmez olur** — ve görünmeyen bir borç, olmayan bir borç gibi
  okunur (`[[rapor-bayatligi]]`'nin ELLE kuyruğundaki hâli). `054` satırı
  eklendi, sayaç "on üç" → "on dört".

  Denetimde bir yanlış rapor da düzeltildi: ajan bundle'ı "735.78 KB gzip"
  diye yazmış; gerçek ölçü **715KB gzip** (733142 byte) — ham boyutu gzip
  sanmış. Regresyon yok.

  Kapı: build ✅ 715KB · hedefli süit ✅ 109/109 · `kapi:genel` ✅ 339/339 ·
  `dogrula` ✅ exit 0 "Konsol temiz."
  **ELLE bekleyen:** `054` migration'ı (redeploy gerekmiyor).

- **FAZ 8a · BİTTİ · FAZ 8b · ELLE'YE BAĞLI** (2026-09-04). 🅞, parent'ta.
  **Faz ikiye bölündü ve sebebi bir dürüstlük kısıtıdır, bir gecikme değil.**

  **8b (yapılmadı):** saklama süresi cümlesi + `HK_VERSION` `1.3 → 1.4`.
  Gizlilik metnine *"kullanım ölçümleri 90 gün sonra silinir"* yazmak,
  bugün **yanlış bir cümledir**. Gerekçenin dili çapraz denetimde
  keskinleşti: `053`'ün koşulup koşulmadığı **repodan görünmez**
  (`migrations/README.md:38`), yani "koşulmadı" bir gözlem değil §6.5'in
  varsayımıdır. Ama sonuç varsayımdan bağımsız olarak sağlam: `053` bugün
  koşulmuş OLSA BİLE cümle yanlış kalırdı, çünkü `usage_events_prune`'u
  çağıran hiçbir yer yok — `pg_cron` kurulu değil ve fonksiyon periyodik
  değil. Yani silen bir şey yok.
  Bir gizlilik politikası bir taahhüttür; tutulmayan taahhüt bir metin
  hatası değil bir uyum açığıdır (§6.2 · §6.5: deploy edilmiş varsayılmaz).
  Üstelik sürüm artışı yeniden-bildirimi tetikler: kullanıcı, işlemeyen bir
  vaadi okumuş sayılırdı. **Tek adımlık kilit:** Emre `053`'ü koşup
  `usage_events_prune(90)`'ı periyodik hâle getirdiği gün cümle doğru olur
  ve 8b açılır.

  **8a (yapıldı) — defteri OKUYAN taraf.** `hkKabulVarMi(surum)` eklendi ve
  tek kararı taşıyor: **bilinmeyen, "kabul etmedi" değildir.** `054` ELLE
  beklediği için tablo yokken sorgu hata döner; o hatayı `false`'a çevirmek
  defteri hiç okunmamış HER kullanıcıyı "bu sürümü kabul etmedi" diye
  damgalardı — ölçülmemiş bir şeyi ölçülmüş gibi göstermek (§6.10). Üç hâl
  var, iki değil: `true` · `false` (tablo var, satır yok) · `null`
  (bilmiyoruz). Ayarlar satırı `null`'da **susuyor** — FAZ 4'ün varsayılan
  notuyla aynı ilke, aynı sebep.

  **Uygulama-geneli banner YAZILMADI ve bu bilinçli.** Tetiği `HK_VERSION`
  artışıdır ve o artış 8b'de; şimdi yazmak, gösterecek hiçbir şeyi olmayan
  yeni bir sahne yüzeyi kurmak olurdu (§1.1 "kart değil kaldıraç"). Rıza
  durumu bunun yerine **var olan** Ayarlar → Hukuki Çerçeve bölümünde,
  sürüm satırının altında görünüyor. Banner 8b ile birlikte gelir ve
  sözleşmesi şudur: **onay kapısı değil, "değişeni oku" haberi.**

  Kapı: build ✅ 716KB · hedefli süit ✅ 34/34 (i18n paritesi dahil) ·
  `kapi:genel` ✅ 339/339 · `dogrula` ✅ exit 0 "Konsol temiz."

- **FAZ 8a denetimi kapandı** (çapraz · Sonnet). Üç bulgu, üçü de düzeltildi.
  En ağırı **kodda değil KOPYADAYDI**: "yok" dalı *"bu sürüm sen okuduktan
  sonra güncellendi"* diyordu — yani olmayan bir okuma geçmişini iddia
  ediyordu. Defteri yazan tek yer kayıt akışıdır (`03:732`) ve bugün hesabı
  olan herkes o satır eklenmeden geçti; onlarda `kabul:false` "eskisini
  okudun" değil **"hiç kayıt yok"** demek. Fazın kendi gerekçesinin
  kopyadaki tekrarı (§6.10). Metin artık yalnız bildiğimizi söylüyor ve üç
  test cümlenin **harfini değil iddiasını** tutuyor (geçmiş anlatamaz,
  suçlayıcı olamaz). İkinci bulgu: planda "`053` koşulmadı" demişim, oysa
  `README.md:38` *"repodan görünmez"* diyor — gözlem değil §6.5 varsayımı;
  dil düzeltildi (sonuç değişmedi: prune periyodik olmadığı için cümle
  yine yanlış olurdu). Üçüncüsü: `### FAZ 8` başlığı 8a/8b bölünmesini
  göstermiyordu, işlendi.

- **FAZ 9 · BİTTİ** (2026-09-04). `uygulayici`da (🅢) + parent'ın denetimi.
  `_ARAC_DEFS` `{ marker, parse, label?, cta?, run? }`'a genişledi; dört
  `[ARAC]` aracının davranışı birebir korundu; `kart`/`nisan` kayıtları
  chip üretmiyor (`run` taşımıyor) ve `aracRunTool`/`_renderToolChip`
  guard'ları `!def?.run`'a çevrildi — model yanlışlıkla `[ARAC:kart]`
  üretirse eskiden `def.label(...)` patlardı.

  **Ajanın keşfi:** tüketicileri `13a`'ya statik bağlamak gerçek bir import
  DÖNGÜSÜ açıyor (`13a → 06/13-extras → 03 → 10B/12e → 13a`) ve iki test
  kırılıyor. Doğru teşhis; çözümü `window.arac*` köprüsüne geçmek oldu.

  **Denetim (parent · Opus) — o çözümün sessiz bedeli bulundu ve kapatıldı.**
  Köprü boşsa `_extractKartTag` null döner, `_kartRe` undefined olur ve
  **`[KART: …]` artığı EKRANDA KALIR.** Oda 09'un Korunanlar'ı ise tek
  cümle: *protokol blokları finalize/history/DB'den DAİMA sıyrılır.*
  "Daima" bir koşul kabul etmez — köprü, o sözleşmeyi "13a yüklendiyse"ye
  çeviriyordu. Yani döngü kapanırken korunan bir sözleşme delinmişti.

  Doğru kesme yeri **saf yapraktı**: `js/parts/13a1-arac-etiketleri.js`
  hiçbir şey import etmez, bu yüzden onu import etmek döngü doğurmaz.
  Tüketiciler yaprağı **statik** alır ve garanti çalışma zamanına değil
  **derleme zamanına** bağlanır. Yan kazanç: ajanın test dosyalarına
  eklemek zorunda kaldığı iki yan-etki importu (`## Duraklar` maddesi 2)
  gereksizleşti, kaldırıldı. Yetim kalan `window.aracEtiketCoz/Regex`
  köprüleri ve yetim `aracEtiketRegex` export'u da silindi — durmaları
  `window` yolunun hâlâ desteklendiğini ima eder ve bir sonraki tüketiciyi
  aynı kırılgan yola davet ederdi (§3.5/3).
  Kapı: **`tests/etiket-siyirma-kapisi.test.js`** — sıyırma yolunun
  `window`'a bağlanmasını, yaprağın yaprak kalmasını ve tüketicilerde ikiz
  regex doğmasını yasaklar; adı `*-kapisi` olduğu için `kapi:genel`
  desenine kendiliğinden girdi (22 → 23 dosya).
  Durak 1 (`aracPromptGuide`) gerekçeli, kabul: `[KART]`/`[NISAN]`
  rehberleri bugün de orada değil; taşımak yeni cümle icadı ya da plan dışı
  sözlük değişikliği isterdi.

  Kapı: build ✅ 716KB · hedefli süit ✅ 337/337 · `kapi:genel` ✅ 346/346 ·
  `dogrula` ✅ exit 0 "Konsol temiz."

- **FAZ 10 · BİTTİ** (2026-09-05). 🅞, parent'ta (Opus); çapraz denetim
  (Sonnet) dört bulgu döndürdü, dördü de kapandı — **biri fazın kapsamını
  daralttı.**

  **Seçim ölçüsü "hangi ritüel güzel" değil, HANGİ AN BOŞTA idi.** Mevcut dört
  araç (soz · not · gecis · imge) istisnasız TEK ANLIKtır: bir söz, bir not, bir
  okuma, bir imge. Faz üç yeni an hedefledi; **ikisi ship edildi:**

  | Araç | Ritüel | An |
  |---|---|---|
  | `inanc` | 10k Kendinle Konuşma · İnanç Kazma | kendini baltalayan inanç — "ben zaten hep böyleyim" |
  | `engel` | 10m Engel Atlası (6 Perde·6 Zehir·7 Tuzak) | TEKRAR EDEN engel — "hep aynı yerde takılıyorum" |

  **Üçüncüsü (`yol` → 13s Geçiş Yolu) yazıldı, denetimde GERİ ALINDI.**
  `13s:27-29` bir sözleşme taşıyor ve keşifte kaçırıldı (dosyanın ilk 22
  satırına bakılmıştı, kısıt 27'de): *"Studio-only (Wanderer Studio kararı,
  2026-07-19) — Wanderer (LLM) ücretsiz yüzünde yolculuk başlatılmaz."* Mesele
  abonelik değil **yüzey**: yolculuk Studio odasından başlar, sohbetten değil.
  Chip tam bu kısıtı deliyordu. `gyStart` (13s:97) kendi başına yüzey kontrolü
  TAŞIMAZ — kısıt yalnız çağıranın disiplinidir, yani kod onu durdurmazdı.
  Kısıt Emre'nin kararıdır; tersine çevirmek de onun kararıdır, bu fazın değil.
  **Emre'ye açık çatal:** kısıt gevşetilirse `yol` chip'i hazırdır (tek kayıt +
  iki sözlük satırı); korunursa iki araçla kapanır. Kapı kondu:
  `tests/13a-arac-motoru.test.js` → *"yol: chip olarak YOKTUR"* — bir sonraki
  tur sessizce geri koyarsa kırmızı basar.

  **Elenenler gerekçeli:** Ayna Anı (09h) ve Derin Çalışma (13A) premium
  kapılıdır — ücretsiz kullanıcıya önerilen bir chip paywall'a çıkarsa o bir
  kaldıraç değil huni olur (§1.1). Gezgine Mektup (13d) statiktir. Gördün (10E)
  ile `[ARAC:gecis]` aynı OİK tabanında durur; model ikisini karıştırırdı — tam
  da planın uyardığı "menü" hâli.

  **Fazın asıl kazancı bir SAHTE BAŞARI sınıfının kapanması oldu.** Mevcut üç
  araç (`soz`/`gecis`/`imge`) açıcıyı `?.()` ile çağırıp koşulsuz `true`
  dönüyordu: ritüel yüklü değilse chip kapanıyor, hiçbir şey açılmıyor,
  kullanıcı "oldu" sanıyordu (§6.2). Sözleşme dürüst hâli ZATEN bekliyordu —
  `aracRunTool` `false`'u `arac.fail` toast'ına çevirir (13a:156); kimse
  döndürmüyordu. Hepsi `_acRitual()` köprüsüne bağlandı.
  **Denetim aynı kırığın ikinci katmanını buldu:** iki adımlı bir araçta İLK
  köprü varken İKİNCİsi eksikse ritüel YARIM açılıyor ve chip yine "oldu"
  diyordu (`yol`'da `gyOpenToday`, `inanc`'ta `skSelectSet`). `inanc` artık her
  iki köprüyü de ÖNCEDEN sınar — yarım açılan bir ritüel de sahte başarıdır.
  Kapının kendi kör noktası da aynı bulguyla kapandı: `it.each` her iki köprüyü
  birden sildiği için doğru sonucu YANLIŞ sebeple veriyordu; ayrı bir test
  eklendi.

  **İki yorum gerekçesi çürütüldü ve düzeltildi.** Window köprüsü için "13a →
  10k → 03 → 13a döngüsü doğar" yazılmıştı; denetim şüpheye aldı, grep
  yanlışladı — 10k `03`'ü import etmez. Gerçek gerekçe registry'nin kurulu
  kalıbıdır. Uydurulmuş bir zincir kapısız bir kuraldan beterdir: sonraki tur
  onu arar, bulamaz (§6.10).

  **Kapının kendi kırığı:** sahte-başarı testi ilk yazımda altı testte de
  kırmızı bastı — `showToast` `#toast` elementini arar ve yoksa SESSİZCE döner
  (00a); testte host kurulmamıştı. Kırık koddaymış gibi görünen şey ölçen
  aletteydi (§10.5).

  **ELLE bekleyen — yeni ve sessiz:** `prompt.arac.guide` bir
  `persona_directives` anahtarıdır ve `p()` zinciri override'ı sözlüğün ÜSTÜNE
  koyar (`16-i18n-prompts.js:86`). Anahtar `000`'da tohumlanmamıştır — satır
  yalnız panelden "Yayınla" denince doğar, ama doğduysa koddaki yeni araç
  satırları MODELE HİÇ GİTMEZ: chip'ler kodda durur, LLM onları asla önermez,
  hiçbir yerde hata görünmez. Tuzak `16d`'nin panel açıklamasına yazıldı.

  Kapı: build ✅ 716KB · hedefli süit ✅ (13a 44/44 · nabız+etiket · i18n parite
  36/36 · 13s/ritüel 51/51 · 16d 33/33) · `kapi:genel` ✅ 346/346 ·
  `dogrula` ✅ exit 0 "Konsol temiz."

**İlk hamle (FAZ 11):** sosyal bildirim altyapısı — 🅢, `uygulayici`ya devredilir.
`send-push` merdivenine `sosyal` tipi + `10C-sosyal-feed.js` in-app rozeti.
Freq-cap'e tabi, merdivende winback'ten ÖNCE gelir; rozet `13B` tören kuyruğuna
sormaz — rozet bir sahne değil, bir işarettir.

**Eski İlk hamle (FAZ 10, tamamlandı):** registry üzerinde yeni araçlar — 🅞. Hangi üç
ritüelin LLM'in eline verileceği ve chip cümlelerinin kitap-köklü hâli
üründe bulunur. Onay-chip'i ilkesi gevşetilmez.

### Birleşme — iki paralel FAZ 10 (2026-09-06)

Aynı faz iki dalda bağımsız uygulandı: **PR #13** (main'e alındı) ve **PR #12**
(bu dal). Aşağıda İKİ kayıt da duruyor çünkü ikisi de gerçek — ve ikisinin
**ölçüleri farklıydı**, ki asıl kazanç budur:

| | Sorusu | Seçtiği |
|---|---|---|
| PR #13 | *hangi AN boşta?* | `inanc` · `engel` (+ `yol` denetimde geri alındı) |
| PR #12 | *anlam ekseni nerede eksik?* | `gordun` · `sabir` (+ `ayna`, birleşmede düştü) |

**Birleşmenin kararları ve gerekçeleri:**

1. **`ayna` DÜŞTÜ — birleşmenin tek geri alınan kararı.** PR #12 onu bilerek
   `S.isPremium`'a bağlamamıştı; gerekçesi *"cümle ücretsiz kullanıcı için de
   doğrudur, teaser bunu dürüstçe söyler"* idi. Gerekçe dürüsttü, **ölçüsü
   yanlıştı**: §1.1'in ölçüsü dürüstlük değil, kart mı kaldıraç mı olduğudur.
   PR #13'ün aynı fazda bağımsızca vardığı kural geçerlidir: *ücretsiz
   kullanıcıya önerilen bir chip paywall'a çıkarsa o bir kaldıraç değil
   HUNİ olur.* `09h:17-18` Studio-gate'i kendi başlığında yazıyor. Kapı kondu.
2. **`_ac` ↔ `_acRitual` ikizi teke indi.** İki oturum aynı sahte-başarı
   kırığını bağımsız buldu ve aynı gerekçeyle düzeltti — bu, bulgunun
   sağlamlığının kanıtıdır. `_acRitual` kaldı (main'de birleşmişti, argüman
   da geçirebiliyor); `_ac` silindi (§1.3).
3. **`hazir()` korundu** — main tarafında karşılığı yoktu ve `gordun` onsuz
   boş bir pencereye davet ederdi. `_acRitual` köprünün VARLIĞINI, `hazir()`
   odanın DOLULUĞUNU yoklar: ayrı sorular, ikisi de gerekli.
4. **Test yaklaşımında main'inki benimkinin yerine geçti.** PR #12 `showToast`'ı
   mock'luyordu; PR #13 gerçek DOM'dan okuyor ve gerekçesi doğru: *mock'lamak
   kapının kendisini kör ederdi* (§10.5). Mock kaldırıldı.
5. **`_ARAC_ARAC` birleşik kümeye çekildi.** Main `inanc`/`engel` eklerken
   Araç Nabzı'nın kapalı kümesini güncellememişti — PR #12'nin çapraz
   denetiminde bulunan kırığın aynısı. `tests/arac-kumesi-kapisi.test.js`
   birleşmede bunu kırmızı yaktı ve haklıydı; küme sekiz ada çekildi.

**AÇIK ÇATAL — Emre'ye:** PR #13 `gordun`'u bilerek elemişti, gerekçesi
*"Gördün (10E) ile `[ARAC:gecis]` aynı OİK tabanında durur; model ikisini
karıştırırdı"*. Risk gerçek ama ikisi **ikame değil**: `gecis` bir OKUMA açar
(Geçiş Protokolü, 10D), `gordun` günün **HAYAL mührünü** bastırır (10E) ve
`hazir()` sayesinde yalnız o mühür bugün DÜŞMEMİŞKEN önerilir. Araç korundu ve
karışma riski mekanizmayla kapatıldı: rehber cümlesi ikisini ayırıyor ve aynı
yanıtta ikisinin birden önerilmesini yasaklıyor. **Emre bunu fazla bulursa
`gordun` tek kayıt + iki sözlük satırı silinerek geri alınır** — `yol` için
PR #13'ün bıraktığı çatalın aynısı, ters yönde.

**Araç sayısı sekize çıktı** (soz · not · gecis · imge · inanc · engel ·
gordun · sabir) ve planın kendi uyarısı burada geçerlidir: *fazla araç,
sohbeti bir menüye çevirir.* Karşı önlem rehberdedir ve birleşmede
güçlendirildi: en fazla BİR blok, ve *"hiçbiri bu ana tam oturmuyorsa
HİÇBİRİNİ ekleme"*.

- **FAZ 10 · BİTTİ** (2026-09-05). 🅞, parent'ta (Opus).
  `Devir dışı:` gerekmedi — 🅞 fazlar zaten devredilmez.

  **Yargı — hangi üç ritüel?** Soru tekti: *bugün sohbette geçen hangi anın
  arkasında kapısı olmayan bir oda var?* 48 aday ad tarandı (desen
  `window.*(Open|Ac|Baslat|Start|Kapi)`); bir kısmı desenin yanlış
  pozitifiydi — `karAcikMi`, `gyIsActive`, `gbAccountAgeDays`, `dgKapi` gibi
  açan değil **yoklayan** adlar. Seçimin omurgası tercih değil **anlam
  ekseni** oldu: `soz` zaten **bronz**dur (10u'nun SÖZ mührü) ve eksenin
  kalan iki ucu LLM'in elinde değildi.
  - `gordun` → `gorOpen` (10E) — **lapis**: Üç Mühür'ün HAYAL mührü,
    *"İzleme — o gözlerden yaşa."* Bugüne dek yalnız kendi yüzeyinden (Yol
    hero) açılıyordu; özlemini sohbette söyleyen kullanıcı için kapısı yoktu.
  - `sabir` → `yolOpenSabir` (10f) — **yol**: *"«ne kadar» kulun ölçtüğü,
    «ne zaman» Allah'ın bildiğidir."* Sabırsızlık sohbetin en sık
    anlarından biri ve doğru cevabı bir sayı değil bir duraktır.
  - `ayna` → `ayOpen` (09h) — **altın**: *"bende biriken sen."*

  **Reddedilenler — sessizce düşmesinler diye:**
  - `olusSinamaAc` (10q4): an mükemmeldi ("Artık o kişiyim." sohbette
    söylenen bir cümledir) ama çağrı bir `cardId` ister ve LLM onu bilemez —
    uydurulmuş bir kart kimliği §6.10 ihlalidir. İki mevcut yüzey (10q
    detay · 10A kutup) zaten eşik kapılı ve doğru yerde duruyor.
  - `mektupOpen` (13d): içeriği admin yazar; kişisel bir ritüel değil.
  - `karAc` (13B): üç sayfalık gezinme odası — mühürlenen tek bir eylem yok.
  - `gyStart` (13s): 21 günlük yolculuk; bir chip'in taşıyabileceğinden ağır.

  **Asıl mühendislik kararı bu üç seçimden doğdu: `hazir()`.** Eski dört
  araç ÖN KOŞULSUZ törenlere bağlıydı (söz ver · not kaydet · okuma aç ·
  imge seç) — hiçbiri boş oda açamazdı. Üç yenisi öyle değil: OİK kartı
  yoksa GÖRDÜN'ün penceresi boştur, bugün bakıldıysa mühür çoktan düşmüştür,
  aday hipotez yoksa aynada gösterilecek bir şey yoktur. Chip bir **vaattir**;
  "sana bir şey göstereceğim" deyip boş bir oda açmak §6.2'nin kendisidir.
  Registry `hazir()` ile genişledi ve hazır olmayan chip **hiç çizilmez**
  (nabız da susar — çizilmeyen chip önerilmiş sayılmaz, 09·D'nin ölçüsü
  bozulmasın). Emsal icat edilmedi, repoda zaten vardı: 10A'nın
  `gkSinanabilir`'i — *"kapı yalnız o zaman çizilir"*.
  `sabir`'in `hazir`'i **bilerek yoktur**: sabır kartı türetilmiş bir veri
  değil bir duraktır, ön koşul yazmak onu ölçüye bağlamak olurdu.

  **Yan kazanç — dört eski araçta sessiz bir sahte başarı bulundu ve
  kapandı.** `run: () => { window.glGiveSozNow?.(); return true; }` köprü
  yüklü değilken hiçbir şey yapmıyor ama `true` dönüyordu: chip kayboluyor,
  kullanıcı bir şey olmasını bekliyor, hiçbir şey olmuyor ve **hiçbir yerde
  bir hata görünmüyor** — aracın en sinsi hâli. `_ac(ad)` köprüyü önce
  yokluyor, yoksa dürüst bir toast basılıyor. Kapının değeri ÖLÇÜLDÜ: eski
  satır geçici olarak geri kondu, yeni test kırmızı bastı, sonra geri alındı
  — "dün kırmızı olurdu" bir iddia değil bir gözlem.

  **Onay-chip'i ilkesi gevşetilmedi ve bu kaynağa karşı doğrulandı:** üç
  törenin de yazan satırı kullanıcı eylemine bağlı — `usRecordVision`
  `gorOpen`'da değil `_seal()`'in içinde (`#gor-seal-btn` tıklaması),
  `yolOpenSabir` hiçbir şey yazmıyor, `ayOpen` yalnız çiziyor.

  **Parent'ın kendi diff okuması bir kırık buldu (§3.5/1).** `gordun`'un ilk
  `hazir`'i `(window.gorDayWindow?.() || {}).source !== 'empty'` yazıyordu ve
  10E yüklü değilken `undefined !== 'empty'` **doğru** dönüyordu: kapı, tam
  olarak engellemek için var olduğu şeyi geçiriyordu. `ayna`nın aynı hâli
  tesadüfen doğruydu (`(undefined || []).some` → false) ve simetri
  sınanmadığı için görünmedi. Düzeltildi + testi yazıldı — *sınav, sınadığını
  sınamalıdır.*

  **Denetim (çapraz · Sonnet) — bir sözleşme kırığı, iki register bulgusu.**
  En ağırı kodda değil **iki dosyanın ARASINDAYDI**: Araç Nabzı'nın kapalı
  ad kümesi (`00f:704` `_ARAC_ARAC`) üç yeni aracı tanımıyordu. `wtLogArac`
  çağrılıyor, satır yazılıyor, ama `prev_screen` `null`'a düşüyordu — üç
  aracın öneri/onay/ret sayıları tek bir isimsiz kovada toplanacaktı:
  **ölçüyormuş gibi görünen, ölçmeyen kod** (§6.10). Hedefli süitin bunu
  görememesinin sebebi öğretici: `13a`'nın testleri `wtLogArac`'ı MOCK'luyor
  — "doğru argümanla çağrıldı" kanıtlanıyor, o argümanla ne YAPILDIĞI
  kanıtlanmıyor.

  Kök neden bir unutkanlık değil bir mimari: iki liste elle senkronlanıyor ve
  `00f` `13a`'yı import EDEMEZ (altyapı katmanıdır; 13a 06/07/13-extras
  çeker — döngü). Senkron sağlanamıyorsa **ölçülür** (§6.6 üçüncü basamak):
  `tests/arac-kumesi-kapisi.test.js` iki listeyi karşılaştırır, adı
  `*-kapisi` olduğu için `kapi:genel` desenine kendiliğinden girer ve değeri
  ÖLÇÜLDÜ — küme dört ada geri alındığında kapı kırmızı bastı ve eksik üç
  adı adıyla saydı. Kapı boş-liste tuzağına karşı da kilitli
  ([[kapi-sessiz-gec]]): ayrıştırıcı kırılıp iki liste birden boşalırsa
  eşitlik sağlanır ama test yine kırmızı yanar.

  İkinci bulgu TR system-prompt'undaydı: *"Hiçbiri ANA tam oturmuyorsa"* —
  kesme işaretsiz büyük "ANA" var olan bir kelimeyle (ana/anne) çakışıyordu
  ve aynı dosyada belirteçli emsal vardı (`16b:92` "şu ana dönmek");
  *"Hiçbiri bu ana tam oturmuyorsa"* oldu. Üçüncüsü EN'deki `«»` idi —
  parent kendi öz-incelemesinde zaten bulup düzeltmişti (EN sözlükteki tek
  kullanım oydu; TR'de `kk.neden.duygu:2461` emsali var ve orada kalıyor).

  **Denetimin temiz bulup KANITLADIKLARI** (bir "temiz" iddiası kanıt ister):
  onay-chip ilkesi — üç tören de doğrudan okundu, `ayOpen` yalnız "Bu Benim"
  tıklanınca `apResolveHypothesis` çağırıyor · `gkSinanabilir` emsali
  gerçekten aynı desende (`10A:1822`) · `hazir()` okumaları törenlerin kendi
  iç mantığıyla birebir örtüşüyor (`10E:145-147`, `09h:92-93`) · `_ac`'in
  boot-sırası riski yok (üç köprü de `main.js`'te statik import) · Ayna
  Protokolü ile çakışma yok (farklı tetikleyici, aynı veri kaynağı, ikiz
  yok) · i18n paritesi tam · yeni testler davranışsal.

  **Bir tasarım sorusu parent'a bırakıldı, karara bağlandı:** `ayna.hazir`
  `S.isPremium`'a BAKMAZ — premium olmayan kullanıcıda aday hipotez varsa
  chip çizilir ve `ayOpen`'ın teaser'ı açılır. Bilerek böyle: chip'in cümlesi
  ("Bende biriken bir şey var") o kullanıcı için de **doğrudur** ve teaser
  bunu dürüstçe söyler. `hazir()`'in sözleşmesi *"kapının ardında bir şey var
  mı"*dır, *"kullanıcı görebilir mi"* değil — ikincisi 09h'nin kendi kararı
  ve İÇ DÜNYA odasındaki girişte de aynı işliyor. Chip'i premium'a kapatmak,
  doğru bir cümleyi saklamak olurdu.

## Opus öz-denetimi — 2026-09-05 · FAZ 5–10

Emre *"buraya kadar tüm yaptıklarımızı analiz edip sorunları giderip
geliştirmeleri yapıp hem planı hem çalışmayı en iyileyim"* dedi; §3.7 bu
hâlde tek başına koşar. Kapsam **önceki kaydın açıkça dışarıda bıraktığı
yer**: *"FAZ 5–17 henüz açılmadı; bu kayıt onları kapsamaz."* Bu tur FAZ
5–9'u ve bu turda yazılan FAZ 10'u kapsar. **Plan KAPANMADI.**

**Plana karşı.** FAZ 5–9'un **Yeni:/Değişen:** listeleri ağaca karşı tek tek
okundu ve beşi de teslim edilmiş: `052/053/054` yerinde, tık atıfı zinciri
dört halkasıyla tam (`052` RPC · `send-push:384` nid · `sw.js:136,154` ·
`10x:199` + `00e:67` native köprüsü), `admin_usage_report` üç migration'ın
hiçbirinde geçmiyor (planın Doğrulama maddesi 4 → **0**, ölçüldü),
`HK_VERSION` bilerek `1.3`. Sapma yok; tek **açık borç** planın kendi
kaydında zaten duruyor ve doğru duruyor: **FAZ 8b** `053`'ün ELLE
koşulmasına kilitli, ve gerekçesi bu turda yeniden yoklandı — hâlâ geçerli.

**Koda karşı.** Kapıların görmediği yer bulundu ve bulgu tek bir sınıftı:
**FAZ 9'un denetimi mekanizmayı değiştirdi, gerekçeyi dört dosyada eski
hâliyle bıraktı.** Köprü (`window.aracEtiket*`) koddan silindi, ama onu
ANLATAN yorumlar `13a`, `10B` ve `12e`'de kaldı — üstelik satır-değişimiyle
düzeltildikleri için **cümleleri ortadan kesikti** ("13a boot'ta zaten
yükleniyor ve" → yeni satır → "(§5.2 ...)"). İki yerde de sadece bayat
değil **yanlış**: "10B ve 12e bu dosyayı STATİK import ETMEZ" ve "köprü
burada" — ikisi de artık doğru değil, ve `10B`'nin son cümlesi kaldırılmış
test importlarına atıf yapıyordu. Ayrıca `13a:30` iki ölü import taşıyordu
(`etiketCoz`, `etiketRegex` — hiç kullanılmıyordu) ve bir **yetim doküman
yorumu** burada olmayan bir fonksiyonun sözleşmesini anlatıyordu.
Hepsi düzeltildi.

İkinci bulgu ölçüldü ama bu turda **düzeltilmedi**: aynı sınıf repo genelinde
yaşıyor — `js/parts` altında **123 ölü named import / 21 dosya** (tarama
scratchpad'de; üç örnek elle doğrulandı: `00-config-tracking.js:sb`,
`06-summary-chat.js:stripModeTag`, `12a-archetypes.js:ikvCardFace` — her
biri dosyada YALNIZ import satırında geçiyor). Bu bir alt sınır: tarayıcı
Türkçe harflerde JS `\b`'sinin ASCII sınırı yüzünden bazı adları
kaçırabilir, yani sayı şişmiyor. Temizlik mekaniktir ve tek başına bir 🅢
fazdır — **plana taşındı** (FAZ 18).

**Vizyona karşı.** FAZ 5–9'un beşi de tek bir cümlenin farklı yüzleri:
**uygulama bildiğinden fazlasını iddia etmez.** Tık atıfı web-only bir oranı
"tık oranı" diye sunmayı reddetti · saklama politikası "ölçülmüş görünen
eksik bir sayı"yı bir OKUMA SÖZLEŞMESİ ile kapattı · rıza defteri bir kaydı
düzeltmek yerine yenisini ekliyor · FAZ 8a "bilinmeyen, kabul etmedi
değildir" diyerek üçüncü hâli (`null`) korudu · FAZ 9 "daima bir koşul kabul
etmez" dedi. Hepsi §6.10'un ve tezin aynı yerinden çıkıyor: uygulamanın
kullanıcı hakkında söylediği her şeyin kökeni yine kullanıcı olmalı.
FAZ 10 bu zinciri **chip'e** taşıdı: `hazir()` yoksa kapı çizilmez, ve `_ac`
köprü yokken başarı raporlamaz. Anlam ekseni (altın · lapis · bronz) LLM'in
elinde ilk kez tamam. Register korundu; sayaç dili yok, `sabir`'in manevi
katmanı (tevekkül) sekülerleşmedi — kartın kendi metni dokunulmadan duruyor,
chip yalnız kapıyı gösteriyor.

**Sürece karşı.** Bulunan kırık bir **kural boşluğu değildi** — kural vardı
(§5.2: *Yorum = NEDEN*), yeri de doğruydu. Eksik olan üçüncü basamaktı
(§6.6): **ölçülemiyordu.** Üstelik ölçen kapı tam da orada kördü:
`tests/etiket-siyirma-kapisi.test.js` iddialarını yorumları SÖKEREK kuruyor
(kendi başlığı köprünün adını andığı için bu bilinçliydi) — yani yalan tam
da kapının bakmadığı yerde yaşadı. Kapı yeşilken davet ayaktaydı.
**Ölçülebilir hâle getirildi:** silinmiş köprünün ADI artık üç kaynakta
yorumda bile geçemez (aynı dosyaya yeni bir `it.each` girdi). Sınıfın öteki
yarısı — "STATİK import ETMEZ" gibi *içerik* olarak yanlışlaşan bir cümle —
statik olarak sınanamıyor ve **yargıya bırakılanlar** listesine yazıldı.
Ders tek cümlede: **silinen bir mekanizmanın gerekçesi, mekanizmanın kendisi
kadar davet edicidir.**

**Bulgular.** 9 — düzeltildi 7 · plana taşındı 2 · reddedildi 0
- `js/parts/13a-arac-motoru.js:30` — iki ölü import (`etiketCoz`,
  `etiketRegex`; dosyada yalnız import satırında geçiyorlardı) — **düzeltildi**
- `js/parts/13a-arac-motoru.js` (kuyruk) — silinmiş `window.aracEtiket*`
  köprüsünü anlatan yorum; iki cümlesi artık YANLIŞ — **düzeltildi**
- `js/parts/13a-arac-motoru.js` (~129) — burada olmayan bir fonksiyonun
  sözleşmesini anlatan yetim doküman yorumu — **düzeltildi**
- `js/parts/10B-ilham-karti.js:63-69` — ortadan kesik + bayat yorum;
  son cümlesi kaldırılmış test importlarına atıf yapıyordu — **düzeltildi**
- `js/parts/12e-isik-nisanlari.js:35-41` — aynı sınıf; "burada window
  köprüsü yeterli" diyordu, oysa köprü yok — **düzeltildi**
- `tests/etiket-siyirma-kapisi.test.js` — kapı yorumları sökerek bakıyor,
  yani sınıfın kendisi ölçülemiyordu (§6.6/3) — **düzeltildi** (ham kaynağa
  bakan `it.each` eklendi; sınıfın öteki yarısı yargıya bırakıldı)
- `.claude/plans/ic-calisma-kalan-fazlar.md` denetim defteri — sekiz madde
  bitmişken "AÇIK" görünüyordu ([[rapor-bayatligi]]) — **düzeltildi**
- `js/parts` geneli — 123 ölü named import / 21 dosya — **plana taşındı**
  (FAZ 18: temizlik + taban çizgili kapı)
- `js/parts/10D-olmak-istedigin.js:747` — OİK bağlam başlığı hardcoded TR,
  İMGE'ninki `p()` ile yerelleşiyor — **plana taşındı** (`### Taşınan bulgu`)

**Bakılmayan.** Prod durumu (Supabase Dashboard) hiçbir eksende ölçülmedi ve
ölçülemez — `052/053/054`'ün koşulup koşulmadığı repodan görünmez (§6.5).
FAZ 11–17 açılmadı; bu kayıt onları kapsamaz. `09a`/`09b`'nin paralel
sözlükleri (önceki turun taşınan bulgusu) bu turda da BOYU ölçülmedi —
adlandırıldı, sayılmadı. Kriz korpusunun kapsama oranı (hangi dil kaç satır)
gözden geçirilmedi: FAZ 1–2 kendi kapısını taşıyor ve bu tur ona dokunmadı.

- **FAZ 11 · BİTTİ** (2026-09-05). `uygulayici`da (🅢) + parent'ın denetimi.
  Merdivene `sosyal` girdi (winback'ten önce, freq-cap'e tabi),
  `loadSosyalAdaylar()` adayları **döngü dışında tek sorguda** hesaplıyor ve
  kendi kartına kendi etkileşimini eliyor; `10C`'ye oda köşesinde taze nokta
  (`sfRefreshRoomPulse`) eklendi — rozet `13B` tören kuyruğuna sormuyor.

  **Ajanın kendi keşfi ve düzeltmesi — bu fazın en değerli bulgusu.**
  `paylasim_begenileri`'nin RLS'i anonimlik gerekçesiyle `own read`'e
  daraltılmış (`000:860-870`, şemanın kendi yorumu bunu yazıyor). İlk yazdığı
  rozet sorgusu `.neq('user_id', uid)` ile **başkasının** beğeni satırını
  arıyordu: RLS zaten yalnız kendi satırlarını görünür kılıyor, filtre onları
  da eleyince sorgu **hata vermeden hep boş dönerdi** — rozet beğeni için asla
  yanmazdı ve hiçbir kapı kırmızıya dönmezdi. Kaynağı okuyup düzeltti: beğeni
  artık herkese açık agregat sayacın (`paylasilan_kartlar.like_count`) bir
  tabana göre **delta**sıyla ölçülüyor, yorum ise satır bazında (`all read`).
  İki tablo aynı alandayken FARKLI politikalara sahip — birini ötekinin
  kalıbıyla yazmak tam bu tuzaktır. Hafızaya girdi:
  [[rls-daralmasi-istemci-sorgusu]].

  **Faz denetimi (parent · Opus) — bir DAVRANIŞ REGRESYONU bulundu ve
  kapatıldı.** `sosyal` merdivenin EN ÜSTÜNE kondu, metni ise (doğru biçimde)
  FAZ 12'ye bırakıldı. Ama `pickTrigger` onu koşulsuz seçiyor, `generateCopy`
  `null` dönüyor ve `runEngine` `continue` ediyordu — yani **kartına bir
  beğeni düşen kullanıcı, o etkileşim 24 saatlik pencerede kaldığı sürece
  winback · streak_risk · soz · milestone · morning bildirimlerinin HEPSİNİ
  kaybediyordu.** Ajanın raporu "hiçbir push gönderilmez" derken haklıydı,
  ama bunun yalnız `sosyal`'i değil ALTINDAKİ BEŞ BASAMAĞI da kapsadığını
  görmedi. Teslim edilemeyen bir basamak yalnız kendini değil altındaki her
  şeyi düşürür — FAZ 10'un chip kuralının merdivendeki birebir aynısı:
  *odası boş olan kapı çizilmez.*
  Düzeltme `METNI_HAZIR` kümesi: merdiven yalnız metni yazılmış tetikleri
  seçer, `sosyal` kapının arkasında bekler ve FAZ 12 metni yazıp kümeye
  eklediğinde **kendiliğinden açılır**. Kapı `tests/tik-atifi.test.js`'e
  girdi ve değeri ölçüldü — kapı kaldırıldığında test kırmızı bastı ve aç
  kalan tetiği adıyla saydı.
  Ayrıca ajanın kendi testi düzeltmenin harfine takıldı (`if (sosyalVar)`
  satırını birebir arıyordu); iddia korunup harf gevşetildi — *sınav harfi
  değil iddiayı tutmalı.*

  **Altı Durak, altı karar:**
  1. *Sosyal microcopy yazılmadı* — **doğru**, FAZ 12'nin (🅞) işi. Kabul.
  2. *Hangi etkileşimler sosyal sayılır* — beğeni + yorum **evet**, "kayıt"
     (koleksiyona alma) **hayır**. Gerekçe: kayıt alanın SESSİZ bir eylemidir;
     sahibine haber vermek o eylemin karakterini değiştirir ve kaydedeni
     görünür kılar. Karar kabul edildi, gerekçesiyle yazıldı.
  3. *24 saatlik aday penceresi* — kabul; freq-cap'in kendi 24 saatlik
     aynı-tip kısıtıyla aynı ritimde ve dosyada gerekçesi yazılı.
  4. *Rozetin "görüldü" semantiği geniş fırça* — kabul; 09d/09h'nin
     `lastSeenWeek` kalıbıyla aynı hassasiyet. İnce ayar ayrı bir karardır.
  5. *Kapsam sapması* (`_src.html` +1 · `css/parts/sosyal.css` +17 ·
     `10-features-w2.js` +4) — **onaylandı ve doğru karardı.** Alternatifi
     paralel bir DOM-enjeksiyon mekanizması icat etmekti (§1.3 ihlali).
     Rozet mevcut `.ws-om-pulse`/`.ws-ay-pulse` desenine üçüncü tüketici
     olarak bindi, `prefers-reduced-motion` dahil. Planın "Değişen:" listesi
     desen keşfedilmeden yazılmıştı — sapma ajanın değil planın eksiğiydi.
  6. *RLS tuzağı hafızaya değer* — **evet**, yazıldı (yukarıda).

  **Tarayıcıda bir yanılgı ve dramasız teşhisi (§3.3), sonraki oturum aynı
  telaşı yaşamasın diye:** `--eval "typeof window.sfRefreshRoomPulse"`
  **`"undefined"`** döner ve bu bir kırık DEĞİLDİR. `#ws-sf-pulse` DOM'da,
  CSS yerinde (`opacity: 0`), ama expose `sfInit()`'in içinde — yani §5.2'nin
  çift boot ayrımına göre POST-AUTH (`03-auth-shell.js:1264`, dinamik import).
  Koşucu anon oturum açar, `sfInit` hiç koşmaz. Doğru kanıt kaynakta ve
  birim testlerdedir; rozetin canlı kanıtı ancak oturumlu bir senaryoyla
  alınabilir.

  Kapı: build ✅ 717KB · **tam süit ✅ 4070/4070** (faz kapısı hedefli süit
  ister; canlı push hattına dokunulduğu ve iki faz birden push edildiği için
  tam süit tercih edildi) · `dogrula` ✅ exit 0 "Konsol temiz."
  **ELLE bekleyen:** `send-push` redeploy (merdiven değişti). Yeni migration
  gerekmedi — `notification_log.type` serbest metin, "görüldü" damgası
  SafeStorage'da.

- **FAZ 12 · BİTTİ** (2026-09-05). 🅞, parent'ta (Opus).

  **Planın Ton Rehberi'nden bir SAPMA var ve bilinçlidir.** Rehber tek örnek
  veriyordu: *"Kartına biri yazmış."* Ama motor (`loadSosyalAdaylar`) beğeniyle
  yorumu **tek kovada** birleştiriyor ve hangisi olduğunu bilmiyor — bir
  beğeni "yazmak" değildir. O cümle, ölçtüğümüzden fazlasını iddia ederdi
  (§6.10). Ürün cümlesi bu yüzden daraltıldı: **"Kartına biri dokundu"** ·
  *"Halka pazarında biri senin kartında durdu. Görmek istersen orada."*
  🅞 fazın işi tam budur — plandan okunamayan, ürüne bakarak bulunan karar.

  Aynı sınır modele de yazıldı: `TRIGGER_INTENT.sosyal` bildiğini değil
  **bilmediğini** söylüyor — dokunuşun türü bilinmiyor, kimliği bilinmiyor
  (rumuz sözü; `paylasim_begenileri` RLS'i zaten göstermiyor), sayı
  verilmeyecek, "beğenildin" denmeyecek. Haber bir onay bildirimi değil:
  mesele karta gelen ilgi değil, kullanıcının **kendi beyanının** birine
  ulaşmış olması. Tez korunuyor — sosyal bildirim, uygulamanın dikkatini
  kullanıcıdan başkasına çeviren tek yerdir ve bir onay döngüsüne dönüşmesi
  en kolay olan yerdir.

  `METNI_HAZIR`'a `'sosyal'` girdi — FAZ 11'in kapısı böylece açıldı ve
  basamak canlandı (redeploy sonrası).

  **Rozetin "metni" erişilebilir adıdır — ve yoktu.** `#ws-sf-pulse` boş bir
  `<span>`di: ekran okuyucuda hiç duyurulmaz, yani haber yalnız GÖREN
  kullanıcıya ulaşıyordu. `sfRefreshRoomPulse` artık yanınca `aria-label`
  veriyor, **sönünce kaldırıyor** — olmayan bir haber duyurulmaz (§6.10).
  Ad `data-i18n-aria` ile DEĞİL JS'ten verilir ve gerekçesi çift: statik bir
  anahtar sönükken de duyururdu (`opacity: 0` ekran okuyucuyu susturmaz), ve
  `tests/15-i18n-aria.test.js` zaten JS-yönetimli elemanlara statik anahtar
  takılmasını yasaklıyor. TR+EN girdi (`sf.rozet.aria`) parite kapısından
  geçti.

  **Üç yeni kapı ve üçü de ihlale karşı elle sınandı** (yeşil kalmak
  yetmez, ısırdığı görülmeli — §10.5): sosyal metninde **rakam yasak**
  (sayaç dili), **"yaz(mış|dı)|yorum" yasak** (bir beğeni yazmak değildir),
  ve niyet metni modele bilmediğini söylemek zorunda. Sahte bir
  *"Kartına 3 yeni yorum geldi!"* metniyle denendi — ikisi de kırmızı bastı.

  **Denetim borcu (§3.3) açıldı ve KAPANDI.** Faz, çapraz denetim koşarken
  `74e2fd0` ile commit'lendi — gerekçe §10.4'tü (uzak oturumda commit
  edilmeyen iş oturumla ölür; beklemek işi güvenceye almaz, kaybeder) ve borç
  hem plan kaydında hem commit mesajında adıyla duruyordu. `157a372`'nin
  "ajan koşarken `git add -A`" tehlikesi burada yoktu: `denetci` sözleşmesi
  gereği kod yazmaz. Denetim döndü, dört bulgunun dördü de kapatıldı.

  **Denetim (çapraz · Sonnet) — dört bulgu, dördü de düzeltildi.**
  1. **Gerçek davranış kırığı ve FAZ 11'de bulduğumun KARDEŞİ.** Metin
     yazılıp basamak açılınca susturma **başka bir kapıdan** geri geldi: ilk
     koşuda sosyal push gider, sonraki her koşuda `pickTrigger` yine `'sosyal'`
     der (aday 24 saat pencerede kalır), `passesFreqCap` "aynı tip 24s'te bir"
     diye reddeder ve satır atlanırdı — kullanıcı yine 24 saat boyunca
     winback · streak_risk · soz · milestone · morning'in hiçbirini alamazdı,
     **günlük 2 bildirim bütçesi boşken bile.** `METNI_HAZIR` bir failure
     mode'u kapatmıştı, ötekini değil.
     Kök neden adlandırıldı: `sosyal` merdivendeki **tek YAPIŞKAN tetiktir** —
     koşulu 24 saat doğru kalır çünkü sunucuda "bu dokunuşu zaten bildirdik"
     damgası yoktur (istemcinin damgası yalnız rozeti söndürür, buraya
     ulaşmaz); öteki beşinin koşulu geçicidir. Düzeltme dar: yalnız yapışkan
     tetik reddedildiğinde merdiven bir kez daha, sosyal olmadan çözülür.
     Ötekilerin reddi eskisi gibi turu bitirir — *"önceliğin kapalıysa yerine
     başkasını koyma"* merdivenin kendi anlamıdır ve korundu.
  2. `sf.rozet.aria` **yanlış bölümdeydi** — sözlüğün `sf.*` "Halka pazarı"
     bloğu yerine Stüdyo Odaları bloğunun ortasına düşmüştü (iki dosyada da).
     Parite kapıları set-bazlı olduğu için kırmızı basmıyordu; organizasyon
     kırığı, `sf.report_aria`'nın yanına taşındı.
  3. **Yorumumun gerekçesi YANLIŞTI** ve bulgu haklıydı: "kimliği bilmez —
     RLS daraltılmıştır" yazmıştım, oysa bu motor `admin` (service-role)
     istemcisiyle sorgu atar, RLS onu **hiç bağlamaz** ve `loadSosyalAdaylar`
     `user_id`'yi fiilen okur. Kimliği taşımaması bilgisizlik değil bir
     **tasarım kararıdır** (rumuz sözü). Yanlış bir NEDEN, hiç yorum
     olmamasından kötüdür (§5.2) — ve bu turda tam bu dersi hafızaya yazmış
     olmam ironiyi ders yapmıyor, kuralın ne kadar kaygan olduğunu gösteriyor.
  4. **EN register kayması** (FAZ 4'ün ekseni): TR *"Kartında yeni bir
     dokunuş var"* sakin bir isim tamlamasıyken EN *"Someone has touched your
     card"* özne+fiile dönüyordu ve İngilizcede "touched your…" çoğunlukla
     izinsiz temas çağrışımı taşır. → *"A new touch on your card"*.

  **Sınıf iki fazda iki kez kırıldı, o yüzden artık bir kapısı var.** §3.7'nin
  dördüncü ekseni: aynı kırık iki kez çıktıysa mesele kırık değil onu üreten
  kuraldır. `tests/tik-atifi.test.js` artık yapışkan tetiğin reddinin turu
  koşulsuz bitirmesini yasaklıyor; kapı kaldırılıp sınandı, kırmızı bastı.
  Denetimin bir bakım notu da alındı: `TRIGGER_INTENT.sosyal` araması tam
  boşlukla eşleşiyordu (hizalama bir sözleşme değildir), desene çevrildi.

  **Denetimin doğrulayıp temiz bulduğu:** ton daraltmasının koda karşı haklı
  olduğu (`sosyalVar` yalnız boolean, tür bilgisi seçime hiç ulaşmıyor) ·
  `fallbackCopy`'nin TR-only olmasının `sosyal`'in açtığı yeni bir borç DEĞİL,
  altı tetiğin hepsinde var olan bir sınır olduğu · aria-label kararının
  kaynağa karşı doğru olduğu (`#ws-sf-pulse` bir `<button>` içindedir ve
  accname hesabına girer; CSS `opacity`dir, `display:none` değil).
  Bir de küçük bir dürüstlük notu: raporumdaki "49/49" tally'si denetçide
  yeniden üretilemedi — sayı doğruydu (10C 18 + aria 7 + tam-parite 8 +
  ihtimalsel 13 + parity 3) ama başlığı yalnız "i18n aria/parite/ihtimalsel"
  diyordu, yani hangi dosyaları kapsadığını yanlış anlatıyordu. Kırmızı
  yutulmamış; anlatım yanlıştı.

  **Taşınan sınır (yeni borç değil):** `fallbackCopy` TR-only'dir ve bu
  `sosyal`'in getirdiği bir kırık değil, altı tetiğin hepsinde var olan bir
  sınırdır — `langInstruction` yalnız LLM yolunu kapsar. Planın "DIŞINDA
  kalanlar" tablosundaki `13·F1 kalan · fallbackCopy` maddesi budur ve
  kapsam dışı kalmaya devam ediyor.

### ELLE kuyruğu — Emre'nin turu sonrası (2026-09-06)

**Emre 2026-09-06'da migration'ları ve deploy'ları yaptığını bildirdi.** Bu bir
BEYANDIR ve repodan doğrulanamaz (§6.5) — ama beyan da bir kaynaktır (§6.10'un
üç kökeninden biri) ve defter ona göre tazelendi. Repodan doğrulanabilen tek
şey dosyanın VARLIĞIdır, uygulanmışlığı değil.

| # | İş | Durum | Kanıt / not |
|---|---|---|---|
| 1 | `055_birlesik_041_054.sql` | **Emre: koşuldu** | `052·053·054`'ün üçünü de içerir (`:1318` `notif_mark_clicked`, `usage_events_daily`, `prune`, `hukuk_kabul`) — ayrı ayrı koşmaya gerek yoktu |
| 2 | `send-push` redeploy | **Emre: yapıldı** | FAZ 5'in `nid`'i + FAZ 11'in basamağı + FAZ 12'nin metni birlikte canlandı |
| 3 | **`usage_events_prune(90)` periyodik** | **AÇIK — ve artık ELLE DEĞİL** | aşağıya bak |

**Numara çakışması YOKTU ve yeniden numaralama yapılmadı.** PR #13'ün `055`'i
benim üçümü zaten kapsıyor; numaraları oynatmak *"en güncel tanım en yüksek
numaradadır"* kuralını ve `tests/migration-blok-tasima.test.js` kapısını
bozardı.

### PR defteri — üç dal, üçü de bu ağaçta (Emre'nin düzeltmesi, 2026-09-06)

| PR | Dal | Ne getirdi | Durum |
|---|---|---|---|
| **#12** | `claude/ic-calismalar-analiz-n08hvw` | **bu dal** — FAZ 5–9 öz-denetimi · FAZ 10 (kendi ölçüsüyle) · 11 · 12 · 16 · 17 | açık |
| **#13** | `claude/ic-calismalar-migrations-redeploy` | FAZ 10 (öteki ölçüyle: `inanc`·`engel`) · `055_birlesik_041_054.sql` · redeploy defteri | main'e alındı |
| **#14** | `claude/wanderer-packages-setup` | **taşınabilir zemin** — protokol taşındı, hafıza köprüsü kuruldu, `referans-butunlugu` kapısı `-kapisi` adını aldı (böylece `kapi:genel`'e girdi), CLAUDE.md'ye **madde 13** eklendi, uygulanmamış XSS paketi silindi | main'e alındı |

**#14 bu turun zeminini değiştirdi ve kontrol edildi:** hafıza artık İKİ
depoda yaşıyor (`.claude/hafiza/` lokalin aynası · `.claude/memories/` repo
tarafı) ve madde 13 uzak oturuma açık talimat veriyor — *"`.claude/memories/`
altına yaz, `hafiza/`ya YAZMA"* (`disa` kolu `rsync --delete` kullanır).
Bu turun iki hafıza dosyası ([[silinen-mekanizmanin-gerekcesi]] ·
[[rls-daralmasi-istemci-sorgusu]]) doğru depoya yazılmış; `tests/hafiza-senkron-kapisi.test.js`
ve `tests/referans-butunlugu-kapisi.test.js` merge sonrası yeşil (16/16).
Kapının adı değiştiği için eski adla koşan her alışkanlık "test bulunamadı"
alır — bu tur onu bir kez yaşadı ve kayda geçiyor.

### 8b'nin kilidi çözüldü — ve çözüm ELLE bir adım DEĞİL

FAZ 8a saklama cümlesini iki koşula bağlamıştı: `053` koşulmuş olmalı **ve**
`usage_events_prune(90)` periyodik olmalı. Birincisi tamam; ikincisi için Emre
*"bu konuda bir fikrim yok"* dedi — yani kurulmuş sayılamaz (§6.10: kanıtı
olmayan değer yoktur, ve bir gizlilik taahhüdü tam da kanıt isteyen şeydir).

**Ama `053`/`055`'in kendi yorumu yanıltıcı çıktı.** *"`pg_cron` bu repoda hiç
kullanılmamış"* diyor; bu yalnız `migrations/` için doğru. `SETUP-PUSH.md §4`
tam olarak `pg_cron`'u kurar ve `send-push` motorunu **30 dakikada bir**
çağırır. Yani projede ZATEN çalışan periyodik bir motor var — migration onu
görmemiş, ve o körlük 8b'yi bir aydır gereksiz yere kilitli tutmuş.

Çözüm bu yüzden yeni bir cron değil, var olanın yeniden kullanılmasıdır (§1.3):
**motorun kendisi günde bir kez `usage_events_prune` çağırır.** `prune`
`SECURITY DEFINER` ve `service_role`'a açıktır; `send-push` zaten service-role
istemcisiyle koşar. Yeni sır yok, yeni kurulum yok, Emre'ye yeni adım yok —
vaat mevcut mekanizmayla **yapısal olarak** doğru hâle gelir.

**SIRA KISITI (yeni ELLE maddesi, tek satır ama pazarlıksız):** HK 1.4
kullanıcıya gitmeden ÖNCE `send-push` redeploy edilmeli. Aksi hâlde uygulama
"90 gün sonra silinir" der ama silen şey henüz canlı değildir — 8a'nın tam
olarak reddettiği durum, yalnız tersten. İkisi ayrı deploy döngüsündedir.

- **FAZ 15 · BİTTİ** (2026-09-06). `uygulayici`da (🅢) + parent'ın denetimi.
  **"Teşhissiz" madde artık teşhisli — ve kök gerçekten vardı.** Faz bir
  yanlışlamayla da kapanabilirdi (planın kendi izni); kapanmadı.

  **Kök:** sidecar'lar (`assets/ext-*.js`, ör. 110KB'lık EN dil paketi)
  vite'ın bağımlılık grafiğinin DIŞINDA, ayrı bir `esbuild` çağrısıyla
  derleniyor (`build.sh:35-42`). `sw.js`'in `CACHE` damgası ise yalnız
  `bundle_hash`'ten üretiliyordu — yani **sidecar içeriği değişse bile damga
  kıpırdamıyordu.** Bugüne dek görünmemesinin sebebi bir tesadüf: i18n parite
  kapısı her YENİ anahtarı TR çekirdeğine de yazdırıyor ve o dosya
  vite-bundled, dolayısıyla hash birlikte kayıyor. Ama **var olan bir EN
  çevirisinin yalnız DEĞERİNİ düzelten** bir commit (yeni anahtar eklemeyen)
  bunu kırar: `sw.js` byte-aynı kalır, tarayıcı güncellemeyi hiç fark etmez,
  `staleWhileRevalidate` eski sözlüğü **süresiz** servis eder ve kullanıcı
  yeni anahtarlarda TR'ye düşen karışık-dil bir ekran görür — *"bazı
  açılışlarda yanlış dilde"* şikâyetinin birebir tarifi.
  Ajan bunu iddia etmekle kalmadı, **eski `build.sh` mantığını sentetik bir
  fixture'a karşı koşturup damganın değişmediğini gösterdi.**

  **Dil sırası ise KIRIK DEĞİL ve bu da yanlışlanarak kapandı:** `initI18n`
  boot'ta yalnız `localStorage`'ı okur (SafeStorage hidrasyonu auth-sonrasıdır),
  beyan yoksa `navigator.languages` yalnız ilk boyamayı tahmin eder ve **hiç
  kaydedilmez** — beyanı `openLangGate` alır. §6.10'a bilinçli uyum.

  **Faz denetimi (parent) — düzeltme YARIM kalmıştı ve yorumu fazlasını
  söylüyordu.** Ajan `CACHE` damgasına sidecar özetini ekledi (doğru) ve
  yorumuna *"ve dolayısıyla `?v=`'yi döndürsün"* yazdı (yanlış). `?v=`
  CACHE'ten türemiyor: `loadExtScript` onu DOM'daki `_src-<hash>.js`
  etiketinden okur, yani yalnız bundle hash'inden. Ve bu kozmetik değil —
  `staleWhileRevalidate` düz `fetch(req)` kullanıyor, yani SW kendi cache'ini
  boşaltsa bile **tazeleme isteği tarayıcının HTTP cache'inden karşılanabilir**;
  URL byte-aynı kaldığı sürece eski sözlük yine gelir. Kırığın iki katmanı
  vardı, düzeltme birini kapatmıştı.
  İkinci katman kapatıldı: `build.sh` aynı özeti `index.html`e `data-ext-v`
  olarak da basar, `loadExtScript` varsa onu URL'e katar
  (`?v=<bundle>-<ext>`), yoksa eski davranışa düşer — geriye uyumlu.
  Kapı `tests/ext-yukleyici-surum-kapisi.test.js`; eski yükleyiciye karşı
  koşuldu ve tam o iki iddia kırmızı bastı. Üretilmiş ağaçta iki damganın
  AYNI özeti taşıdığı da ayrıca mühürlendi.

  **Bu, bu turda ikinci kez görülen sınıftır** ([[silinen-mekanizmanin-gerekcesi]]
  ailesi): kod bir şey yapar, yorum daha fazlasını söyler. FAZ 12'de de
  bir yorumun gerekçesi yanlıştı. Yorum bir NEDEN'dir ve yanlış bir neden,
  hiç yorum olmamasından kötüdür (§5.2) — çünkü sonraki tur onu okur ve
  ölçmeden inanır.

  **Üç Durak, üçü de karara bağlandı:**
  1. *Plandan sapma* — plan `16c-*`/`14-boot` öngörmüştü (teşhis öncesi
     tahmin), kanıt `build.sh`'e işaret etti. **Doğru davranış:** ajan
     tahmine değil kanıta uydu ve sapmayı Durak olarak geri döndürdü.
     Planın "Değişen:" satırı bir tahmindi, bir sözleşme değil.
  2. *Ajan `./build.sh` koşarken öteki fazın WIP'i dist'e gömüldü* — zararsız,
     çıktı türetilmiş bir artefakttır ve sprint sonunda temiz ağaçta yeniden
     üretiliyor. Kayda geçti çünkü fark edilmesi iyi bir refleks.
  3. *`native-senkron-kapisi` sidecar BYTE içeriğini bağımsız doğrulamıyor* —
     yalnız `_src-<hash>.js` eşleşmesine bakıyor. Bugün güvenli bir vekil
     (`npx cap copy` tüm `dist/`i atomik kopyalar), ama sıkılaştırma ayrı bir
     iş. **Plana taşındı** (aşağıdaki `### Taşınan bulgu`).

### Taşınan bulgu — native senkron kapısı sidecar'ı vekaleten ölçüyor
`tests/native-senkron-kapisi.test.js` yalnız `_src-<hash>.js` adının
eşleşmesine bakıyor; `assets/ext-*.js`'in byte içeriğini bağımsız
doğrulamıyor. Bugün risksiz çünkü `build.sh:186-192` `npx cap copy` ile tüm
`dist/` klasörünü atomik kopyalıyor — yani vekil ölçüm doğru sonucu veriyor.
Ama FAZ 15 tam da "hash bir şeyi izliyor sanılıyordu, izlemiyordu" sınıfının
kırığıydı; aynı sınıf burada bir kapı olarak duruyor. Sıkılaştırma tek satır
(sidecar özetini iki tarafta karşılaştır) ama bu sprintin kapsamı değil.

- **FAZ 13 · BİTTİ** (2026-09-06). `uygulayici`da (🅢) + parent'ın denetimi.
  Gözlemevi'nin kartlara DAĞILMIŞ teşhis cümleleri tek listeye toplandı:
  on altı satır-içi cümle adlandırılmış `_xxxTani()` fonksiyonlarına çıkarıldı
  ve `data-gz-alarm="1"` ile işaretlendi; `_alarmListesi(d)` onları topluyor.
  **Yeni teşhis motoru YAZILMADI** — planın kısıtı buydu ve tutuldu: cümleler
  icat edilmedi, yerinden çıkarılıp adlandırıldı.

  `send-push` merdivenine `admin` basamağı **yapısal olarak** kuruldu ama
  `ADMIN_ALARM_AKTIF = false` ile hiç seçilmiyor ve `METNI_HAZIR`'a
  EKLENMEDİ — FAZ 11/12'nin dersi burada baştan uygulandı: metni yazılmadan
  eklenen bir basamak altındaki her şeyi susturur. Ajan ayrıca yapışkan tetik
  disiplinini **kümeye genelleştirdi** (`YAPISKAN_TETIKLER`) — benim tek
  tetiğe bağlı düzeltmemden daha iyisi: reddedilen hangi yapışkan tetikse
  yalnız o dışlanıyor, öbürüne yine şans tanınıyor.

  **Ajanın keşfi (planda yoktu, FAZ 14'ün zeminini değiştiriyor):** Gözlemevi'nin
  teşhisleri yalnız CLIENT'ta üretilebiliyor, çünkü kaynağı `admin_usage_report`
  RPC'si ve o RPC `auth.uid()` + `profiles.is_admin` kontrol ediyor (mig 042).
  `send-push`'un servis-rolü istemcisinin JWT'si yok — RPC'yi ÇAĞIRAMAZ. Yani
  "hangi alarm aktif" sorusunun cevabı sunucuda bugün yok; FAZ 14 bunu ya ayrı
  bir servis-rolü sorgusuyla ya da eşiklerin sunucuda yeniden hesaplanmasıyla
  çözmek zorunda.

  **Denetim (parent · Opus) — kabul, bir kayıtlı çekince ile.** `_alarmListesi`
  on dört kart çizicisini YENİDEN çağırıp kendi ürettiği HTML'i regex'le
  tarıyor. Mimari olarak zarif değil; kabul edilmesinin sebebi ölçüldü:
  on dördünün de **saf** olduğu doğrulandı (DOM/storage/ağ/log sıfır eşleşme),
  yani çift çağrının bedeli yalnız string üretimi. Alternatif — on altı
  `_xxxTani`'yi yapısal veri döndürecek şekilde yeniden kurmak — daha büyük
  bir değişiklik ve kullanıcıya görünür bir kazancı yok. İşaret
  (`data-gz-alarm="1"`) bilinçli bir sözleşme ve testleri var; çekince burada
  yazılı ki bir sonraki tur onu keşif sanmasın.
  Kapı: build ✅ 718KB · hedefli süit ✅ 179/179 · `kapi:genel` ✅ 404/404 ·
  `dogrula` ✅ exit 0 "Konsol temiz."

**İlk hamle (FAZ 14):** eşik SAYILARI + kanallar-üstü tavan — 🅞, parent'ta.
FAZ 13 zemini kurdu ve bir kısıt bıraktı: sunucu `admin_usage_report`'u
çağıramıyor. İlk iş o kısıtı karara bağlamak, sonra `ADMIN_ALARM_AKTIF`'i
gerçek bir koşulla değiştirmek ve `METNI_HAZIR`'a `admin`'i eklemek —
**üçü birlikte**, yoksa basamak ya ölü kalır ya da altını susturur.
11·F3 (kanallar-üstü tavan) buraya biner: tavan `13B`'nin oturum bütçesiyle
aynı deftere yazılır (`trnIzin`/`TRN_TAVAN` + FAZ 17'nin `trnRet` defteri).

**Eski İlk hamle (FAZ 13, tamamlandı):** eşik alarmı altyapısı — 🅢, DEVREDİLİR
(`uygulayici`). `13q-gozlemevi.js`'te kartların ZATEN yazdığı teşhis
cümleleri (oda 17: "her kart eşiği aşınca kendi tanısını yazıyor") tek yerde
toplanıp bir alarm listesine dönüşür — **yeni bir teşhis motoru YAZILMAZ**,
var olan cümleler toplanır. `send-push`'a `admin` tipi girer ve FAZ 11'in
dersi burada da geçerlidir: metni yazılmadan `METNI_HAZIR`'a EKLENMEZ, yoksa
merdivende altındaki her şeyi susturur. Eşik SAYILARI FAZ 14'ün (🅞) işi.

**Eski İlk hamle (FAZ 12, tamamlandı):** sosyal bildirim microcopy'si — 🅞, parent'ta.
`send-push`'ta iki nokta bekliyor ve ikisi de tek satır: `TRIGGER_INTENT`'e
`sosyal` niyeti, `fallbackCopy`'ye `case 'sosyal'`, sonra `METNI_HAZIR`
kümesine `'sosyal'` — üçüncüsü basamağı açar ve kapı (`tik-atifi`) ikisinin
birlikte yapılmasını zorunlu kılar. Rozet metni `10C`'de. Ton: sayı
BAĞIRMAZ — *"Kartına biri yazmış."* (planın Ton Rehberi'nin verdiği tek
örnek); "3 yeni yorum!" bu ürüne girmez.

**Eski İlk hamle (FAZ 11, tamamlandı):** sosyal bildirim altyapısı — 🅢, DEVREDİLİR
(`uygulayici`). `supabase/functions/send-push/index.ts` merdivenine `sosyal`
tipi girer ve **winback'ten ÖNCE** gelir (raporun kararı); freq-cap'e tabidir.
`10C-sosyal-feed.js`'e in-app rozet eklenir ve rozet `13B` tören kuyruğuna
SORMAZ — rozet bir sahne değil bir işarettir. Microcopy FAZ 12'nin (🅞) işi:
bu fazda yeni cümle İCAT EDİLMEZ, var olan anahtarlar kullanılır.

**Eski İlk hamle (FAZ 10, tamamlandı):** registry üzerinde yeni araçlar — 🅞.
Hangi üç ritüelin LLM'in eline verileceği ve chip cümlelerinin kitap-köklü
hâli üründe bulunur. Onay-chip'i ilkesi gevşetilmez.
**Eski İlk hamle (FAZ 9, tamamlandı):** `13a-arac-motoru.js`'te `_ARAC_DEFS` kayıtları
`{ marker, parse, label, cta, run }`'a genişler; `[KART]` (`10B:126`
`_IK_KART_TAG_RE`) ve `[NISAN]` (`12e:117` `ISIK_TAG_RE`) kendi regex'lerini
registry'ye taşır. `[ARAC:x]{json}` biçimi ve `aracExtract`/`aracAfterReply`/
`aracPromptGuide` imzaları KORUNAN sözleşmedir — dokunulmaz.

**Eski İlk hamle (FAZ 8, tamamlandı):** `13p-hukuk.js`'te `HK_VERSION` `1.3 → 1.4`; gizlilik
metnine saklama süresi cümlesi (90 gün ham + günlük agregat, `053`'ün
gerçeğiyle birebir); sürüm-değişim banner'ı — **onay kapısı değil**, "değişeni
oku" haberi. Banner `hukuk_kabul`'de o sürümün satırı YOKSA görünür (defter
FAZ 7'de kuruldu, okuyanı burada doğar).

**Eski İlk hamle (FAZ 7, tamamlandı):** `migrations/054_riza_defteri.sql` —
`hukuk_kabul(user_id, surum, kabul_at)` + RLS (sahibi okur/yazar);
`03-auth-shell.js` kayıt anında yazar. `bulten_izin_surum` KORUNUR — o ayrı
bir rızadır ve bu defter onun yerine geçmez. HK_VERSION'a DOKUNULMAZ (K4).

**Eski İlk hamle (FAZ 6, tamamlandı):** `migrations/053_saklama_politikasi.sql` —
`usage_events_daily` agregat tablosu → geri doldurma → `usage_events_prune()`.
Sıra K3'ün kendisidir: ham satır silinmeden önce agregat dolmalı.
`admin_usage_report`'a DOKUNULMAZ.

**Eski İlk hamle (FAZ 5, tamamlandı):** `migrations/052`'ye `notif_mark_clicked(p_id)`
SECURITY DEFINER RPC'si (yalnız kendi satırının `clicked_at`'i, yalnız
NULL'ken); `send-push` payload'ına `nid`; `sw.js` postMessage'ına `nid`;
`10x:_bindDeepLink` onu RPC'ye taşısın. `nid` yoksa HİÇBİR ŞEY yazılmaz.

**Eski İlk hamle (FAZ 4, tamamlandı):** `_src.html`'de Ayarlar → Bildirimler grubuna
(`push-status`'ın altına, test butonundan önce) iki saat seçici + durum
cümlesi; `10x`'e yazan fonksiyon (`etw_sessiz_saat_v1_<uid>`, `{start,end}`),
`bildirimRenderSettings` onu okusun; TR+EN sözlük girdileri (parite kapısı).

**Eski İlk hamle (FAZ 3, tamamlandı):** `13g-paylasim.js`'te `_shareCanvas(cv, title)` üçüncü
parametreyi (`tur`) alsın, `shrShareStory` onu `params.tur`'dan geçirsin;
`13g:301`'in sabit `tur:'kart'`'ı o değere devredilsin; yedi çağırana
planda yazılı eşleme konsun.
