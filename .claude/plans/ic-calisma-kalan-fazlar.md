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

## Denetim defteri — on üç maddenin bugünkü hâli

Ölçüm 2026-09-04'te koda karşı yapıldı.

| Oda | Faz | Madde | Bugün | Kanıt |
|---|---|---|---|---|
| 15 | F2 kalan | Kriz eval seti | **AÇIK** | `tests/` altında kriz/eval dosyası YOK (`ls tests \| grep -i kriz` boş) |
| 12 | borç | Paylaşım `tur` kırılımı | **AÇIK** | `wtLogPaylasim` `meta.tur` çoğu satırda null; `shrShareStory` altı çağıran |
| 11 | F2 kalan | Bildirim tercihleri yüzeyi | **AÇIK** | `10x-w2-bildirimler.js:399` "AYARLAR YÜZEYİ HENÜZ YOK" yorumu |
| 11 | F1 kalan | Tık atıfı | **AÇIK** | `notification_log.clicked_at` kolonu var (`000:1059`), yazan yok; `sw.js:141` yalnız focus |
| 17 | F3 | Saklama politikası | **AÇIK** | `000:1228` prune yalnız YORUM satırı; agregat tablo yok |
| 15 | F3 | Rıza defteri | **AÇIK** | `HK_VERSION='1.3'` (`13p:21`); yalnız `bulten_izin_surum` sürümlü (`03:715`) |
| 09 | F2 | Araç registry | **AÇIK** | `_ARAC_DEFS` dört araç (`13a:75`); `[KART]` `10B:126`, `[NISAN]` `12e:117` ayrı regex |
| 09 | F3 | Yeni araçlar | **AÇIK** | registry'ye bağlı |
| 12 | F2 | Sosyal bildirim | **AÇIK** | `send-push` merdiveninde `sosyal` tipi yok |
| 17 | F2 | Eşik alarmları | **AÇIK** | alarm/cron kaydı yok; `pg_cron` migration'larda hiç geçmiyor |
| 13 | D | SW dil pürüzü | **AÇIK (teşhissiz)** | kök teşhis hiç yapılmadı |
| 10 | D kalan | Ses şiddet kademesi | **AÇIK** | `13e` gain sabit; aç/kapa var, kademe yok |
| 10 | F3 | Akşam ısrar dozu | **AÇIK** | `wtTorenSonuc` yazıyor, soran yok |

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
> (kalıp: `tests/referans-butunlugu.test.js`). Yumuşak desenleri on bir
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
**Değişen:** `js/parts/10x-w2-bildirimler.js` (`bildirimRenderSettings`) ·
`js/parts/15b`/`15e` sözlükler · `css/parts/`
`_sessizSaatTercihi()` **zaten okuyor** (`10x:403`) — bu faz yalnız yazan
yüzeyi kurar. Kapı: tercih yokken payload'da `quiet_*` anahtarı hiç bulunmaz.

### FAZ 5 — Tık atıfı · 🅢 · ~1 oturum
**Yeni:** `migrations/052_tik_atifi_ve_saklama.sql` (RPC bloğu)
**Değişen:** `supabase/functions/send-push/index.ts` (payload'a `nid`) ·
`sw.js` (postMessage'a `nid`) · `js/parts/14-boot.js` veya mesaj dinleyicisi ·
`js/parts/13q-gozlemevi.js` (Davetin Nabzı'nın notu)
K2'ye birebir uyulur: `nid` yoksa hiçbir şey yazılmaz. Kartın "bu sıfır bir
sonuç değil, bir boşluk" cümlesi **kaldırılmaz** — yerine koşullu hâle gelir:
veri geldiğinde sütun konuşur, gelmediğinde not durur.

### FAZ 6 — Saklama politikası · 🅢 · ~1 oturum
**Değişen:** `migrations/052_tik_atifi_ve_saklama.sql` (agregat + prune) ·
`migrations/README.md`
K3'ün sırası: `usage_events_daily` (user_id, gun, screen, kind, adet,
toplam_ms) → geri doldurma → `usage_events_prune(p_gun int default 90)`.
Cron'a bağlanmaz. `admin_usage_report`'a **dokunulmaz** (blok taşıma kuralı
`051`'de mühürlü; `052` rapora hiç girmiyorsa taşıma borcu doğmaz).

### FAZ 7 — Rıza defteri · 🅢 · ~1 oturum
**Değişen:** `migrations/052_*.sql` (`hukuk_kabul` tablosu + RLS) ·
`js/parts/03-auth-shell.js` (kayıt anında yazım) · `js/parts/13p-hukuk.js`
`hukuk_kabul(user_id, surum, kabul_at)`; kullanıcı yalnız kendi satırını
okur/yazar. Mevcut `bulten_izin_surum` **korunur** — o ayrı bir rızadır ve
bu defter onun yerine geçmez.

### FAZ 8 — Sürüm-değişim banner'ı + HK 1.4 · 🅞 · ~0.5 oturum
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
`js/parts/10C-sosyal-feed.js` (in-app rozet) · `migrations/052_*.sql` gerekirse
Freq-cap'e tabi; merdivende winback'ten **önce** gelir (raporun kararı).
Rozet, `13B` tören kuyruğuna sormaz — rozet bir sahne değil, bir işarettir.

### FAZ 12 — Sosyal bildirim microcopy'si · 🅞 · ~0.5 oturum
Devir: 🅞 — "Kartına yorum geldi" cümlesinin kitap-köklü hâli ve rozet
metni üründe bulunur; sayaç dili ("3 yeni yorum!") bu ürüne girmez.

### FAZ 13 — Eşik alarmı altyapısı · 🅢 · ~1 oturum
**Değişen:** `js/parts/13q-gozlemevi.js` (eşik okuma + alarm satırı) ·
`supabase/functions/send-push/index.ts` (`admin` tipi) · `migrations/052_*.sql`
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

**Etiket sayımı:** 🅢 **10** (1·2c·3·5·6·7·9·11·13·15) · 🅞 **8**
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
4. `grep -c "admin_usage_report" migrations/052_*.sql` → **0** (K3/risk 2).
5. `node scripts/dogrula.mjs --eval "typeof window.aracExtract"` →
   `"function"` (FAZ 9 sözleşme regresyonu).
6. Her fazda: `./build.sh` → hedefli süit → **`npm run kapi:genel`** → tarayıcı.

## Kritik Dosyalar

- **YENİ:** `tests/kriz-eval.test.js` · `tests/fixtures/kriz-korpus.mjs` ·
  `migrations/052_tik_atifi_ve_saklama.sql`
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

**İlk hamle (FAZ 3):** `13g-paylasim.js`'te `_shareCanvas(cv, title)` üçüncü
parametreyi (`tur`) alsın, `shrShareStory` onu `params.tur`'dan geçirsin;
`13g:301`'in sabit `tur:'kart'`'ı o değere devredilsin; yedi çağırana
planda yazılı eşleme konsun.
