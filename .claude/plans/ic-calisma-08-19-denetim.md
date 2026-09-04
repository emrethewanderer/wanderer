# On İki Odanın Denetimi — "camın kalan yarısı"

> Emre'nin talebi (2026-09-03): *"İç Çalışma 08'den 19'a kadar hepsini tek tek
> koda göre ve vizyonumuza göre güncelleyip en iyileyip uygulayalım."*
> Küme on iki belgedir: **odalar 08–18** (on bir) + **Atlas**. Önceki tur
> (PR #8) odaları 1–8 denetlemişti; bu tur onun devamıdır ve seti kapatır.

## Bağlam

On sekiz oda 18 Temmuz 2026'da yazıldı. Odalar 09–18 o günden beri
**hiç güncellenmedi** (galeri damgası: 23 Ağustos); 08 bir gün önce rev.3'e
çekildi. Aradan geçen altı haftada repo değişti — ve raporlar değişmedi.

`[[rapor-bayatligi]]` dersinin ikinci koşusu budur: *bir rapor bitmiş işi
"yapılacak" gösterdiğinde, ölçüm boşluğundan daha sinsi bir kusur üretir —
okuyanı yapılmış işi yeniden yapmaya çağırır.* Önceki tur bunu üç odada
bulmuştu; bu tur on birinde arıyor.

### Onaylanan kararlar

1. **Küme 08–18 + Atlas.** "19" bir oda numarası değil, setin sayısıdır
   (Atlas + 18 oda). Emre'nin cümlesi 1–8 turunun devamını istiyor.
2. **Rapor gerçeğe çekilir, yeniden yazılmaz.** Oda kimliği, estetiği ve
   "Korunanlar" sözleşmeleri korunur; değişen yalnız durum ve kanıttır.
3. **Kapanan boşluk kanıtla kapanır** — `dosya:satır`. "Muhtemelen yapıldı"
   bir kapanış hâli değildir (§6.2).
4. **Uygulama seti vizyonun tek cümlesine bağlanır:** *ölçülmeyen iddia,
   iddia değildir* (§6.10). On bir odanın en çok tekrarlanan bulgusu tektir
   ve odası 17'dir: **uygulama çok şey yazıyor, Gözlemevi azını okuyor.**

### Merkez kavram

Bu sprint yeni bir yüzey açmaz; **var olan gözü tamamlar.** Oda 17 kendi
Faz 1'inde "Tek Cam sprinti" der ve diğer on yedi odanın Faz 1'lerinin orada
buluşacağını yazar. Bu plan o buluşmadır — artı iki hukuki kırık (silme
kapsamı, UGC süzgeci) ki ikisi de oda 15'in Faz 1'inde adıyla bekliyor.

## Denetim defteri — kırk dört boşluğun bugünkü hâli

Ölçüm 2026-09-03'te koda karşı yapıldı. Dört hâl: **KAPALI** (kanıt kodda) ·
**AÇIK** (bu sprintin işi) · **ELLE** (Emre'nin eli, repodan görünmez) ·
**YANLIŞLANDI** (iddia bugün doğru değil).

| Oda | Boşluk | Bugün | Kanıt |
|---|---|---|---|
| 09 | A · hayal görselleri silinmiyor | **AÇIK** | `10i:346` `hayal/{uid}/` yazar · `delete-user:124` yalnız `{uid}` listeler |
| 09 | B · vision/kaynakça yamaları | ELLE | repodan görünmez |
| 09 | C · araç yüzeyi dağınık | kısmen | `13a:75` `_ARAC_DEFS` tablosu var; `[KART]`/`[NISAN]` hâlâ ayrı |
| 09 | D · araç kabul oranı ölçülmüyor | **AÇIK** | `13a`/`13b`'de sıfır `wt*` çağrısı |
| 10 | A · tören çarpışmaları elle listede | **KAPALI** | `13B-toren-kuyrugu.js` · `trnIzin` üç tüketicide (`10t:226`, `13h:139`, `10s:379`) |
| 10 | B · iki gün-anahtarı formatı | **AÇIK** | `parseDayKey` repoda yok |
| 10 | C · akşam ısrarı ölçülmedi | kısmen | `wtTorenSonuc` var, ısrar sorgusu yok |
| 10 | D · mektup mig 015 | YANLIŞLANDI | 015 `000_wanderer_schema.sql`'de birleşti |
| 11 | A · send-push sürümsüz | **AÇIK** | `send-push/index.ts`'te `VERSION` sabiti yok |
| 11 | B · notification_log okunmuyor | **AÇIK** | `13q`'da sıfır okuyucu |
| 11 | C · sessiz saat hardcode | **AÇIK** | `10x:387-388` `quiet_start: 23` |
| 11 | D · kanallar-üstü davet bütçesi | kısmen | `13B` oturum bütçesi var, kanallar-üstü değil |
| 12 | A · UGC ön-süzgeç yok | **AÇIK** | `10C`/`10B`'de moderasyon yalnız `10C:661` (reaktif) |
| 12 | B · yorum bildirimi yok | AÇIK | merdivende `sosyal` tipi yok |
| 12 | C · paylaşım hunisi kör | **AÇIK** | `13g`/`10C`'de sıfır `wt*` |
| 12 | D · soğuk başlangıç | ürün kararı | — |
| 13 | A · sunucu tek dilli | **KAPALI** | `send-push:186-196` `langInstruction` + mig 037 `row.lang` |
| 13 | B · parite bekçisi kapı değil | **KAPALI** | `tests/i18n-parity.test.js` · `tests/i18n-tam-parite-kapisi.test.js` |
| 13 | C · aria çevrilmiyor | **KAPALI** | `tests/15-i18n-aria.test.js` |
| 13 | D · SW dil pürüzü | açık (teşhissiz) | — |
| 14 | A · sürüm kontrolü yok | **YANLIŞLANDI** | repo git; uzak dal + PR akışı çalışıyor |
| 14 | B · error_logs okunmuyor | **AÇIK** | `13q`'da sıfır okuyucu |
| 14 | C · bütçe kapısı öğüt veriyor | **KAPALI** | `tests/bundle-kapisi.test.js` · `build.sh:146` bütçe 1024 KB, byte'ta karşılaştırır |
| 14 | D · ELLE kuyruğu + flake | kısmen | 041–050 bekliyor (`migrations/README.md`) |
| 15 | A · sunucu güvenlik yamaları | ELLE | `SETUP-LLM-CHAT.md` §5 |
| 15 | B · safety telemetrisi okunmuyor | **AÇIK** | `wtLogSafety` yazar (`00f:226`), `050`'de `safety_pulse` yok |
| 15 | C · HK kabul kaydı yok | kısmen | `HK_VERSION` **1.3** (rapor 1.2 diyor); `bulten_izin_surum` var, genel kabul defteri yok |
| 15 | D · çapraz hukuki bulgular | **AÇIK** | 09A + 12A — ikisi de bu sprintte |
| 16 | A · mağaza zinciri | ELLE | `SETUP-STORE-BILLING.md` |
| 16 | B · kota client'ta | ELLE-bağımlı | 7b vendorlama |
| 16 | C · paywall hunisi kör | **AÇIK** | `13m:115` tek `wt*` çağrısı, o da `crisis_grace` |
| 16 | D · TRY fiyat bakımı | süreç | — |
| 17 | A · ölçüm adaları | **YARISI KAPALI** | `050` on blok taşır: `kart`·`ritus`·`esik`·`duygu`·`kimlik`·`model` kapandı; **kalan:** paywall · araç · bölge · paylaşım + üç okunmayan tablo |
| 17 | B · eşik alarmları | AÇIK | — |
| 17 | C · saklama politikası | AÇIK | prune/agregat migration'ı yok |
| 17 | D · mig 033 ELLE | YANLIŞLANDI | 033 `000`'de birleşti; bugünkü borç 041–050 |
| 18 | A · bölge görünürlüğü | **AÇIK** | `10-features-w2`'de bölge `IntersectionObserver`'ı yok |
| 18 | B · gerçek cihaz turu | ELLE | — |
| 18 | C · bölge sırası | veri bekliyor | A'nın çıktısına bağlı |
| 08 | altı faz | **KAPALI** | rev.3 (2026-09-03) her faza `dosya:satır` kanıtı verdi |

**Sayım:** 44 maddenin **12'si bu sprintin işi**, 6'sı kapanmış, 3'ü
yanlışlanmış, 8'i ELLE, kalanı kısmen/ürün kararı.

## Ana Tasarım Kararları

### K1 — Yeni motor yok, yeni tür var
Dört yeni nabız kanalı (`kota`·`arac`·`bolge`·`paylasim`) `00f`'in mevcut
kalıbına biner: yeni `kind` satırı, **yeni kolon yok, yeni tablo yok**.
Emsal `wtLogModel` (`00f:637`) — İç Çalışma 08'in FAZ 1'i tam olarak bunu
yapmıştı. Gizlilik sözleşmesi birebir aynı: yalnız kapalı kümeden sabit
kimlikler girer, küme dışı değer sessizce düşer, içerik asla loglanmaz.

### K2 — Tek migration, on yedi blok
`admin_usage_report`'a dokunan her dosya bir öncekinin **tüm** bloklarını
taşımak zorundadır (`migrations/README.md`: "bir blok düşerse o kart
Gözlemevi'nden kaybolur"). Bu yüzden yedi yeni blok **tek dosyada** gelir:
`051`. Ayrı yedi dosya, yedi kat taşıma riski demektir.

Yeni bloklar: `safety_pulse` · `error_pulse` · `notification_pulse` ·
`kota_pulse` · `arac_pulse` · `bolge_pulse` · `paylasim_pulse`.
`error_logs` ve `notification_log` `usage_events` değildir — kendi
tablolarından okunur; blok onların **varlığına** dayanıklı yazılır
(`to_regclass` kapısı), yoksa boş döner ve kart çizilmez.

### K3 — Oran panelde kurulur, SQL'de değil
`050`'nin kuralı korunur: ham sayı döner, oranı panel hesaplar, **payda
sıfırsa hiç göstermez.** Kanıtsız sıfır basmak §6.10 ihlalidir.

### K4 — Silme kapsamı yolu takip eder, bucket'ı değil
`hayal/` bir bucket değil, `chat-images` içinde bir **önektir** (`10i:347`
`sb.storage.from('chat-images')`). Rapor "hayal/{uid}" derken bucket ima
ediyordu; düzeltme ikinci bir `list(prefix)` çağrısıdır, ikinci bucket değil.

## Fazlar (her biri bağımsız ship edilebilir)

### FAZ 1 — Silme kapsamı · 🅢 · ~0.5 oturum
`delete-user` ve `reset-user`'a `chat-images/hayal/{uid}/` öneki eklenir;
mevcut `{uid}` bloğunun yanına ikinci `list`+`remove` çifti, aynı `try/catch`
kalıbıyla, `errors` dizisine kendi etiketiyle (`storage:chat-images:hayal`).
**Değişen:** `supabase/functions/delete-user/index.ts` ·
`supabase/functions/reset-user/index.ts`
**Yeni:** `tests/silme-kapsami.test.js` — iki fonksiyonun kaynağında her iki
önek de aranır (kapı: yeni bir yazma yolu doğarsa test kırmızı olur).

### FAZ 2 — Dört nabız kanalı · 🅢 · ~1 oturum
`00f`'e `wtLogKota` · `wtLogArac` · `wtLogBolge` · `wtLogPaylasim`.
Kapalı kümeler planda verilidir, uygulayan taraf küme icat etmez:
- `kota`: `duvar` · `sheet` · `gate` · `iptal` · `bonus`
- `arac`: `oner` · `onayla` · `reddet`
- `bolge`: `ayrac` · `galeri` · `icdunya` · `yolculuk` · `ocak`
  (**`gun` yoktur ve olmamalı:** Bugün'ün kendi `view` segmenti zaten paydadır.
  Ayrı bir `gun` olayı aynı şeyi ikinci kez sayar ve oranı bozar — oda 18'in
  sorduğu soru "ayraç altına kaç kişi indi", "Bugün'e kaç kişi girdi" değil.)
- `paylasim`: `story` · `yazi` · `kopyala` · `indir`
**Değişen:** `js/parts/00f-kullanim-nabzi.js`
**Yeni:** `tests/00f-kota-nabzi.test.js` · `tests/00f-arac-nabzi.test.js` ·
`tests/00f-bolge-nabzi.test.js` · `tests/00f-paylasim-nabzi.test.js`

### FAZ 3 — Çağrı yerleri · 🅢 · ~1 oturum
Kanallar tüketicilere bağlanır. Her çağrı **tek satır**, savunmacı
(`window.wtLogX?.()`), akışı asla bloklamaz.
**Değişen:** `js/parts/13m-kota.js` (duvar/bonus) ·
`js/parts/08-trends-payment.js` (sheet/gate/iptal) ·
`js/parts/13a-arac-motoru.js` (öner/onayla/reddet) ·
`js/parts/10-features-w2.js` (beş bölge, `IntersectionObserver`) ·
`js/parts/13g-paylasim.js` (story/yazi/indir) · `js/parts/10C-sosyal-feed.js`
(kopyala)

### FAZ 4 — migration 051 · 🅢 · ~1 oturum
`050`'nin gövdesi aynen taşınır, üstüne yedi blok biner. ELLE koşulur;
`migrations/README.md` defterine satır eklenir.
**Yeni:** `migrations/051_gozlemevi_tek_cam.sql`
**Değişen:** `migrations/README.md`

### FAZ 5 — Gözlemevi kartları · 🅢 · ~1.5 oturum
**Faz bölündü (§4.4).** Yargı çekirdeği — kart adları, sordukları soru, teşhis
cümleleri ve her kartın **dürüstlük sınırı** — aşağıda planda verildi; geriye
kalan render mekaniktir ve `_sesNabzi` (`13q:796`) kalıbının birebir taklidi.
Uygulayan taraf kart adı, eşik ya da cümle **icat etmez**.

Ortak kurallar (hepsi `_sesNabzi`'den):
- Kolun ikisi de boşsa kart **hiç çizilmez** (`return ''`) — kanıtsız sıfır yok.
- Payda yoksa sayı yerine `—` durur, `0` değil.
- Oran panelde hesaplanır (K3); SQL ham sayı döner.
- Teşhis `if/else` zinciridir, **en ağır olan önce**; hiçbiri tutmazsa cümle yok.
- Her kartın başına `13q` kalıbında Türkçe doküman yorumu: kartın sorusu,
  hangi İç Çalışma boşluğunu kapattığı, ve bilinen tuzağı.

| # | Kart | Kaynak | Köşeler | Boşluk |
|---|---|---|---|---|
| 1 | **Emniyet Nabzı** | `safety_pulse` | Sinyal · Kart · Lütuf | 15·B |
| 2 | **Hata Nabzı** | `error_pulse` | Hata · Etkilenen gezgin · En sık etiket | 14·B |
| 3 | **Davetin Nabzı** | `notification_pulse` | Gönderim · Tık (tip bazında çubuk) | 11·B |
| 4 | **Gelirin Nabzı** | `kota_pulse` | Duvar · Kapı · Sheet · İptal | 16·C |
| 5 | **Araç Nabzı** | `arac_pulse` | Öneri · Onay · Ret (araç bazında çubuk) | 09·D |
| 6 | **Bölge Nabzı** | `bolge_pulse` | beş bölgenin erişim yüzdesi | 18·A |
| 7 | **Halkanın Nabzı** | `paylasim_pulse` | Story · Yazı · Kopyala · İndir | 12·C |

**Dürüstlük sınırları — her kart ne ölçmediğini de söyler:**
1. **Emniyet Nabzı kaçırma oranını ÖLÇMEZ** ve bunu yazılı olarak söyler.
   Yakalanmayan sinyal tanım gereği sayılamaz; asıl korkulacak sayı budur ve
   ancak sentetik bir kriz eval setiyle ölçülür (15·B'nin kapatılmayan yarısı).
   Bu cümle kartın altında durur — yoksa panel, ölçmediği şeyi ölçüyor sanılır.
2. **Hata Nabzı yalnız `label` gösterir.** `error_message`/`error_stack`
   rapora hiç girmez (FAZ 4'ün mutlak kuralı) — kart onları isteyemez.
3. **Gelirin Nabzı satın alma sayısını ÖLÇMEZ.** O RevenueCat'in defteridir;
   bu kart yalnız client'ın gördüğünü sayar. Huninin son basamağı burada yok.
4. **Bölge Nabzı'nın paydası `bugun_gorenler`dir** — payda 0 ise kart çizilmez.

**Teşhis cümleleri (verilen; icat edilmeyecek):**
- Emniyet · sinyal var kart yok → *"sinyal yakalanıyor ama kart gösterilmiyor:
  20 dk soğuma penceresi mi yutuyor?"*
- Hata · tek etiket ≥ %40 → *"hataların %N'i tek etikette toplanıyor: `<etiket>`"*
- Davet · gönderim var tık yok → *"davet gidiyor, dönüş yok:
  notificationclick atıfı takılı olmayabilir"*
- Davet · hiç gönderim yok → *"motor bu pencerede hiç koşmamış — pg_cron kurulu mu?"*
- Gelir · duvar var kapı yok → *"duvara çarpılıyor ama teklif hiç açılmıyor"*
- Gelir · kapı var sheet yok → *"teklif görülüyor, sheet'e geçilmiyor"*
- Araç · öneri var dokunuş yok → *"chip çiziliyor ama kimse dokunmuyor: öneri
  ne kabul ne ret alıyor, sessizce kayboluyor"*
- Bölge · ayraç erişimi < %50 → *"Bugün'e giren N gezginin yalnız %M'i ayracın
  altına indi: STÜDYO fold altında kalıyor"*
- Halka · indir > story → *"paylaşım çoğunlukla indirmeye düşüyor: Share
  sheet'i olmayan cihazlar mı, vazgeçme mi?"*

**Ayrıca `_sondaIcerik` (şema sondası) yedi yeni nabzı öğrenir** — bugün
`kart_pulse`/`ritus_pulse`/… varlığını sorguluyor (`13q:950-954`). `051`
uygulanmadığında yedi kartın sessizce yok olması değil, sondanın **adıyla
söylemesi** gerekir. Bu, İç Çalışma 08 · FAZ 6'nın kurduğu sözleşmenin devamıdır.

**Değişen:** `js/parts/13q-gozlemevi.js`

### FAZ 6 — Üç küçük borç · 🅢 · ~1 oturum
Devir dışı: bu faz 🅢 ve `uygulayici`ya AÇILDI — ama çağrı Sonnet oturum
kotasına takılarak düştü (rate_limit, 20:10 UTC sıfırlanma). Devir kanalı
mekanik olarak kapalıyken kapı bekletilemez; §10.5'in dersi burada da geçerli:
bir kuralın uygulanmadığını görünce önce o ortamda **mümkün** olup olmadığına
bak. Parent uyguladı, denetim kendi üstünde kaldı — bu bir sapmadır ve
raporda öyle geçer.
- `parseDayKey` → `00a`'ya tek okuyucu (iki formatı bilir; **göç değil**)
- sessiz saat → `10x` hardcode'u satır değerine devreder (şema hazır)
- `VERSION` sabiti → `send-push/index.ts` + yanıtta damga
**Değişen:** `js/parts/00a-infrastructure.js` · `js/parts/10x-bildirim.js` ·
`supabase/functions/send-push/index.ts`

### FAZ 7 — UGC ön-yayın süzgeci · 🅞 · ~1.5 oturum
Devir: 🅞 — süzgecin **eşiği ve tonu** yargıdır: bir kart yayından döndüğünde
kullanıcıya ne denir, hangi desen "şüpheli" sayılıp admin kuyruğuna girer,
hangisi doğrudan reddedilir. Yanlış eşik, ürünün en kırılgan yüzeyinde
(kendi cümlesini paylaşan insan) sessiz bir hakaret üretir.
**Yeni:** `js/parts/10F-on-suzgec.js` (önek `sz`)
**Değişen:** `js/parts/10C-sosyal-feed.js` · `js/parts/10A-gecis-karti.js`

**Plan düzeltmesi (2026-09-03):** bu satır önce `10D-on-suzgec.js` diyordu —
**çakışma**: `10D-olmak-istedigin.js` zaten var. Doğrusu `10F` (10A–10E dolu,
`sz` öneki serbest). Ayrıca süzgecin **iki** yüzeyi var, bir değil:
`10C:150` `sfPostComment` (yorumlar → `paylasim_yorumlari`) ve `10A:1303`
(kart metni → `paylasilan_kartlar`). Yalnız `10C`'ye takmak, yayına inen
metnin yarısını süzgeçsiz bırakırdı.

### FAZ 8 — On iki raporun yeniden yayını · 🅞 · ~2 oturum
Devir: 🅞 — her odanın **hangi cümlesinin düzeltileceği** yargıdır; rapor
metni ürünün sesidir (§2). Aynı URL'e yayın; `favicon` verilmez (mevcut
korunur); `.claude/artifacts.md` tablosu tazelenir.
**Değişen:** on iki artifact + `.claude/artifacts.md`

**Etiket sayımı:** 🅢 **6** · 🅞 **2** — oran kapısı (§4.4) geçildi.
FAZ 5 bölündü: yargı çekirdeği plana yazıldı, render devredilebilir hâle geldi.

## State / Veri

- **Değişmeyen:** `usage_events` şeması — dört yeni `kind`, sıfır yeni kolon.
- **Yeni kind:** `kota` · `arac` · `bolge` · `paylasim`.
- **Yeni okunan tablolar:** `error_logs` · `notification_log` (yazılıyorlardı,
  okunmuyorlardı) — yalnız `admin_usage_report` içinden, `is_admin` guard'ının
  arkasından.
- **Tuzak:** `wt*` kanallarının `!_inited` guard'ı — `wtInit` öncesi çağrı
  sessizce düşer. Bölge gözlemcisi Bugün render'ında kurulursa post-auth
  init'ten sonra gelir, sorun yok; `13a` araç çağrıları da öyle.

## Ton Rehberi (kitap-köklü TR)

Panel başlıkları sayaç dili kurmaz — **"Emniyet Nabzı"**, **"Hata Nabzı"**,
**"Davetin Nabzı"**, **"Gelirin Nabzı"** (odaların kendi verdiği adlar).
Ön-süzgeç reddi suçlamaz: *"Bu kartta kişisel bir bilgi görünüyor — kendi
cümlen kalsın, izin telefon numarası çıksın."* Asla "uygunsuz içerik".

## Riskler / Dikkat

1. `051`, `050`'nin on bloğunu eksiksiz taşımazsa **çalışan kartlar düşer**.
   Kapı: dosyada on yedi blok adı da grep'lenir.
2. Bölge gözlemcisi her scroll'da olay yazarsa `usage_events` şişer —
   bölge başına **oturumda bir kez** yazılır (`_gorulen` seti).
3. `error_logs`/`notification_log` prod'da yoksa `051` hata vermemeli —
   `to_regclass` kapısı zorunlu.
4. Paywall olayları kota sayacına dokunamaz (§16 Korunanlar).
5. Ön-süzgeç yanlış pozitifi, ürünün en kırılgan anında konuşur — eşik
   dar tutulur, şüpheli içerik **reddedilmez, kuyruğa girer**.

## Doğrulama (dogrula.mjs, her faz sonunda)

1. `node scripts/dogrula.mjs --eval "typeof window.wtLogKota"` → `"function"`
   (aynısı `wtLogArac` · `wtLogBolge` · `wtLogPaylasim` için).
2. `node scripts/dogrula.mjs --eval "typeof window.trnIzin"` → `"function"`
   — 10A'nın kapandığının canlı kanıtı (rapor iddiası koda karşı).
3. `npx vitest run tests/00f-*` → dört yeni kanal testi yeşil.
4. `npx vitest run tests/silme-kapsami.test.js` → iki önek de bulunur.
5. `grep -c "_pulse'" migrations/051_*.sql` → **17** blok.
6. Panel: kol boşken kart HİÇ çizilmez (kanıtsız sıfır basmaz).

## Kritik Dosyalar

- **YENİ:** `migrations/051_gozlemevi_tek_cam.sql` · `js/parts/10F-on-suzgec.js` ·
  `tests/silme-kapsami.test.js` · dört `tests/00f-*-nabzi.test.js`
- **Yerinde evrim:** `js/parts/00f-kullanim-nabzi.js` · `js/parts/13q-gozlemevi.js` ·
  `js/parts/13m-kota.js` · `js/parts/08-trends-payment.js` ·
  `js/parts/13a-arac-motoru.js` · `js/parts/10-features-w2.js` ·
  `js/parts/10x-bildirim.js` · `js/parts/00a-infrastructure.js` ·
  `supabase/functions/{delete-user,reset-user,send-push}/index.ts`
- **Yeniden kullanılan (keşifte bulundu — ikizini yazma):**
  - `00f` nabız kalıbı — `wtLogModel` (`00f:637`) birebir emsaldir
  - `13B-toren-kuyrugu.js` `trnIzin` — tören çarpışması ZATEN çözülmüş
  - `tests/i18n-parity.test.js` + `tests/bundle-kapisi.test.js` — parite ve
    bütçe kapıları ZATEN var
  - `send-push` `langInstruction` — sunucu dili ZATEN çok dilli
  - `00a` `localDayKey` — `parseDayKey` onun yanına, ikinci helper değil
  - `13a` `_ARAC_DEFS` — araç registry'sinin çekirdeği ZATEN var

## Hafıza bağları

`[[rapor-bayatligi]]` · `[[kapi-sessiz-gec]]` · `[[artifact-galerisi]]` ·
`[[boot-nabzi]]` · `[[yerel-tarih-anahtari]]` · `[[olu-kod-temizlikleri]]`

## Durum

- **FAZ 1 · BİTTİ** (2026-09-03). `delete-user:137-146` ve `reset-user:143-152`
  ikinci öneki (`chat-images/hayal/{uid}`) temizliyor; `tests/silme-kapsami.test.js`
  11 testle kapıyı kurdu. Ajan kapının yakaladığını mutasyon turuyla kanıtladı
  (hayal bloğu silinince 3 test kırmızı). Denetim: parent (Opus) — Duraklar yok.
  Kapı: build ✅ · hedefli süit ✅ 11/11 · tarayıcı gerekçeli geçildi (`js/`
  dokunulmadı).
  **ELLE bekleyen:** iki edge fonksiyonun redeploy'u — yama repoda, prod'da değil.

- **FAZ 2+3 · BİTTİ** (2026-09-03). Dört kanal `00f:660-791`, çağrı yerleri
  altı modülde, dört yeni test dosyası (32 test). Kapı: build ✅ · hedefli süit
  ✅ · tarayıcı ✅ (dört kanal da `"function"`, exit 0, "Konsol temiz.").

  **Denetim (parent · Opus) — bir kırık bulundu ve düzeltildi:**
  `duvar` olayı yalnız `13m`'in `server_enforced` dalına takılmıştı. Ama İç
  Çalışma 16 · boşluk B'nin kendisi söylüyor ki `server_enforced` bugün
  **kapalı** (llm-chat vendorlanana dek açılamaz) — yani enstrümante edilen dal
  prod'da hiç koşmuyor, koşan dal (`quota_consume` RPC) sayılmıyordu. Panel
  "duvara kimse çarpmıyor" diye okunurdu: kanıtsız bir sıfır değil, **yanlış**
  bir sıfır (§6.10). Şüphe önce kırmızı testle mühürlendi
  (`tests/13m-kota.test.js` — üç yeni test, biri kırmızıydı), sonra
  `13m-kota.js:186-188` düzeltildi.

  **Durakların kararı:**
  1. `indir` olayı **bağlandı** — `13g:297` (kart) ve `13g:610` (çok sayfalı
     yazı) PNG indirme dallarına. Gerekçe: indirme bir başarısızlık değil ayrı
     bir sonuçtur; Share sheet'i olmayan tarayıcıda kullanıcı yine de kartını
     aldı. 'story' saymak paylaşımı, hiç saymamak kullanıcıyı yok sayardı.
  2. `story`/`yazi`nın `_shareCanvas(es)` içinde, gerçek başarı noktasında
     loglanması **kabul edildi** — dıştaki `ok` iptalde de `true` döndüğü için
     dış gate planın yasağını ("Share sheet iptali olay değildir") çiğnerdi.
  3. `tur` alanının `story`/`yazi`da boş kalması **plana taşındı**: altı
     çağıranın (kart/seri/yol/wrapped/hazine/oluş mührü) kendi `tur`'unu
     geçirmesi ayrı bir fazın işi. Uydurmak §6.10 ihlali olurdu.
  4. `13m`'de `dal` alanının boş kalması **gerekçeyle reddedildi** (kırık
     değil): `_KOTA_DAL`'ın `a`/`b`'si teklif A/B eksenidir ve `13m`'nin RPC
     tabanlı duvarında böyle bir eksen yoktur.

- **FAZ 4 · BİTTİ** (2026-09-03). `migrations/051_gozlemevi_tek_cam.sql`
  (607 satır) + `migrations/README.md` defteri + `tests/migration-blok-tasima.test.js`.

  **Denetim (parent · Opus) — bağımsız doğrulama:** `050`'nin **132 JSON
  anahtarının hiçbiri düşmemiş**; `051` 158 anahtar taşıyor, `_pulse` sayısı
  **17**. Gizlilik kuralı sorguda tutuluyor: `error_pulse` yalnız
  `user_id`·`label`·`occurred_at` seçer (`user_id` de yalnız `COUNT(DISTINCT)`
  içinde, dönmez), `notification_pulse` yalnız `type`·`clicked_at`.
  `error_message`/`error_stack`/`user_agent` dosyada iki kez geçiyor ama
  **ikisi de kuralın kendisini yazan yorum satırı** (`:42-43`, `:557-558`) —
  sorguda yok. `to_regclass` kapıları yerinde (`:80`, `:105`).

  Uygulayan taraf iki şey yaptı ki ikisi de kapının ötesindeydi: (1) gerçek bir
  PostgreSQL 16'da koşturup `CREATE FUNCTION`'ın tablo yokken de başardığını
  **çalıştırarak** kanıtladı — ve o turda dinamik SQL'de gerçek bir kapanış
  parantezi hatası yakalayıp düzeltti (`:99`, `:120`); sözle geçilseydi `051`
  prod'da patlardı. (2) kapının yakaladığını iki mutasyonla gösterdi: eski bir
  blok silinince zincir testi adıyla kırmızı oldu.

  **Durakların kararı:**
  1. `paylasim_pulse`'ın türü `meta->>'tur'`den okuması **kabul edildi** ve
     **plan düzeltildi** (yukarıda) — hata plandaydı, kodda değil.
     Not: kardeş kanallar ikinci ekseni `prev_screen`'de taşır, `paylasim`
     `meta`'da. Tutarsızlık bilinçli olarak **düzeltilmedi**: `tur` bugün zaten
     çoğunlukla `null` (FAZ 2+3 · Durak 3) ve üç dosyaya dokunmanın kazancı,
     hiçbir kartı değiştirmeyen bir ad değişikliğinden ibaret olurdu.
  2. `error_logs`/`notification_log`'un prod'daki varlığı **ELLE bilgisidir** —
     `051` her iki hâlde de çalışıyor, bu gerçek Postgres'te ispatlandı.
  3. `051` **ELLE koşulur** (§6.5) — deploy edilmiş varsayılmıyor.

- **FAZ 5 · BİTTİ** (2026-09-03). Yedi kart `13q:905-1200` arası, şema sondası
  yedi nabzı öğrendi (`13q:1259`), `tests/13q-gozlemevi.test.js` 124 teste
  büyüdü. Kapı: build ✅ · 13q 124 ✅ · tasarım kapısı 29 ✅ · gerçeklik kapısı
  ✅ · tarayıcı ✅ (`/admin.html`, exit 0, "Konsol temiz.").

  **Denetim (parent · Opus):** yeni CSS sınıfı yok (hepsi mevcut `gz-*`/
  `stat-*`), `esc()` sunucudan gelen her alanda, dört dürüstlük sınırının
  ikisi kartın altında **sabit metin** olarak duruyor (Emniyet: kaçırma
  oranını ölçmez · Gelir: satın alma sayısını ölçmez). Uygulayan taraf test
  yazarken kendi kırığını yakaladı: `_davetNabzi({})` dolu kart çiziyordu,
  guard `tip_dagilim` varlığına bağlandı.

  **Durakların kararı:**
  1. `window.gzYorumla` doğrulaması **benim kapı talimatımın hatasıydı** —
     `13q`'nun hiç `window.*` export bloğu yok ve hiç olmamış (modül ESM
     zinciriyle çağrılıyor, `07-settings-knowledge.js:704`). Gerçek kanıt
     `--yol /admin.html` koşusudur ve o yeşil.
  2. `tests/13q-gozlemevi.test.js`'e dokunulması **onaylandı**: kapının kendisi
     "kartların boş veriyle çizilmediğini kanıtla" diyordu, bu ancak testle
     kanıtlanır. Yeni dosya açılmadı, mevcut olan lockstep büyüdü.
  3. **Ölçülmüş sıfır `0` basar, `—` basmaz** — onaylandı ve gerekçesi
     **koda yazıldı** (`13q:903-911`). `—` "bilmiyoruz" demektir; `0` ise
     "ölçtük, hiç olmadı" der. Kriz kartının hiç gösterilmediğini `—` ile
     örtmek §6.10'u ters yönden ihlal eder: kanıtı OLAN değeri gizlemek.
     `_sesNabzi`'nin `kose(n||null)` kalıbı ikisini karıştırıyor; kapsam
     gereği değiştirilmedi ama yeni kartlar onu emsal almıyor ve bu, sonraki
     okuyanın "tutarsızlık" sanıp düzeltmemesi için yazılı.
  4. Köşe-dışı kırılımlar (Gelir'de bonus satırı, Hata/Davet'te dağılım
     barları) **kabul edildi** — uydurulmuş cümle değil ham veri, mevcut
     `gz-bar-row` kalıbıyla.

- **FAZ 6 · BİTTİ** (2026-09-03, parent uyguladı — yukarıdaki devir notu).
  Kapı: build ✅ (713KB) · 19 dosya / 379 test ✅ · tarayıcı ✅ (exit 0,
  "Konsol temiz.").

  1. **`parseDayKey`** → `00a:332`. Kritik tasarım kararı: **otomatik ayrım
     yapmaz, bayrak ister.** `'2026-11-25'` iki biçimde de geçerlidir ama
     farklı ayı gösterir (0-tabanlı: Aralık · 1-tabanlı: Kasım); pad'e bakmak
     kurtarmaz çünkü ikisi de iki hanelidir. Sessizce tahmin eden bir okuyucu
     yılın çoğunda doğru, bazı günlerinde bir ay şaşardı — ve o hata Wrapped'in
     "aktif gün" sayısında görünmeden yaşardı. `tests/gun-anahtari-okuyucu.test.js`
     bu tuzağı adıyla kilitler (aynı string, iki bayrak, iki ay).
     **Üç okuyucu bağlandı:** `13j:113` · `10u:138` · `12:42` (`w3DayKeyToDate`,
     "daima Date döner" sözleşmesi korunarak).
  2. **On dört ikiz gövde tek çağrıya indi.** Keşif planı aştı: `localDayKey`'in
     ifadesi yedi değil **on dört** yerde kopyalanmıştı (`03`×4 · `05`×1 ·
     `11`×6 · `12`×1 · `13-extras`×2). Hepsi birebir aynıydı, hepsi
     `localDayKey(d)` oldu. Bu bir davranış değişikliği değil; kopya, sessizce
     ayrışabilen bir sözleşmedir ve oda 10·B'nin asıl köküydü.
  3. **Sessiz saat ezmesi durdu** → `10x:388-399`. Mesele "hardcode" değildi:
     payload `quiet_start: 23` yazdığı sürece kullanıcının tablodaki tercihi
     HER senkronda geri eziliyordu. Artık anahtar yalnız gerçek tercih varsa
     gönderilir (`_sessizSaatTercihi`, SafeStorage per-uid); yoksa upsert onu
     yazmaz ve DB varsayılanı/mevcut değer korunur. **Ayarlar yüzeyi bu fazın
     işi değildi** (microcopy yargısı) — o gelene dek davranış bugünküyle
     birebir aynı, fark şu ki artık ezilmiyor. Mevcut test `quiet_start === 23`
     diye kilitliyordu, yani kaldırılan davranışın kendisini; sözleşmesi
     düzeltildi ve dört yeni test eklendi.
  4. **`VERSION` damgası** → `send-push/index.ts:43`. `json()` yardımcısının
     içine kondu: motorun HER yanıtı (engine/test/broadcast + hata dalları)
     sürümü taşır, yeni bir dönüş yolu eklendiğinde damga unutulamaz.

  **Bilerek dokunulmayanlar:** `12:58` ve `12:190`'daki elle parse — ikisi de
  gün sınırı aritmetiği için ham bileşen ister (`new Date(y,m,d)` ve
  `new Date(y,m,d+1)`); `parseDayKey` bunu ifade edemez ve DST'de gün ekleme
  milisaniyeyle yapılamaz. **Keşif notu:** `13j-wrapped.js`'in hiç test dosyası
  yok — bu turda eklenmedi, ayrı bir işin konusu.

- **FAZ 7 · BİTTİ** (2026-09-03). `js/parts/10F-on-suzgec.js` + iki yüzey
  (`10C:153` yorum · `10A:1298` kart metni) + `main.js` bağı + on anahtar
  (TR/EN) + `tests/10F-on-suzgec.test.js` (16 test). Kapı: build ✅ (714KB) ·
  parite kapısı ✅ · tüketici testleri ✅ (87) · tarayıcı ✅
  (`typeof window.szDenetle` → `"function"`, exit 0).

  **🅞 kararı — küfür/hakaret kelime listesi YAZILMADI.** Plan "kelime listesi +
  PII deseni" diyordu; yargı turunda ilki reddedildi ve gerekçesi modülün
  başlığına yazıldı:
  1. Yanlış pozitif, ürünün en kırılgan anında konuşur — insan **kendi
     cümlesini** paylaşırken. "Uygunsuz içerik" demek sessiz bir hakarettir.
  2. Kelime listesi niyet kanıtı olmadan hüküm verir; §6.10'un "kanıtı olmayan
     değer yoktur" kuralı sayılara olduğu kadar **yargılara** da uygulanır.
  3. Reaktif ⚑ hattı (`10C` `sfReportCard` → `paylasim_raporlari` → admin
     RAPORLAR) zaten var ve insan gözü taşıyor. Ön süzgeç yalnız
     **tartışmasız** olanı tutar.
  Sonuç: süzgeç iki şey tutar — **kimlik bilgisi** (telefon/e-posta/TCKN/IBAN)
  ve **kriz**. Kart, ne yapmadığını da başlığında söyler (Gözlemevi
  kartlarının dürüstlük sınırıyla aynı ilke).

  **İkinci motor yazılmadı:** kriz için `detectCrisis` (`13-extras:816`, on bir
  dil, Emniyet Katmanı'nın tek kaynağı) yeniden kullanıldı. İkinci bir dedektör,
  iki motorun zamanla ayrışması demekti (§1.3).

  **Testin yarısı yanlış pozitif avıdır** — tarih, seri sayısı, kilometre taşı,
  saat, yüzde, para ve 10/12 haneli kodlar engellenMEmeli; desenler bu yüzden
  dar yazıldı. Ayrıca ton kuralı teste bağlandı: mesaj "uygunsuz"/"yasak"/
  "ihlal" kelimelerini taşıyamaz.

**İlk hamle (FAZ 8):** kalan on rapor + Atlas — 09·10·11·12·15·16·17·18·08
sonra Atlas; her biri `dosya:satır` kanıtıyla.

---

## Kapanış — 2026-09-03

Sekiz fazın sekizi de uygulandı; on iki belgenin on ikisi yeniden yayınlandı.
Sprint iki parçalıydı ve sırası kasıtlıydı: **önce kod, sonra rapor.** Boşluk
kapatmadan rapor yazmak, düzeltmeye çalıştığı bayatlığı kendi eliyle üretirdi.

**Sayım.** 44 boşluk maddesinden bu sprintte **12'si kapandı**, 6'sı zaten
kapalı bulundu, **4'ü yanlışlandı** (10·D · 14·A · 17·D + Atlas D5), 8'i ELLE
olarak duruyor, kalanı kısmen/ürün kararı.

### Plandan sapmalar (dürüstlük kaydı)

1. **FAZ 6 devredilemedi.** `uygulayici` çağrısı Sonnet oturum kotasına takıldı
   (429, sıfırlama 20:10 UTC). Kanal mekanik olarak kapalıyken kapı
   bekletilemezdi; parent uyguladı ve gerekçe `Devir dışı:` satırıyla plana
   yazıldı (§4.4).
2. **Planın kendi iki hatası kod yazılmadan yakalandı:** yeni modül `10D` diye
   yazılmıştı ama `10D-olmak-istedigin.js` zaten vardı (→ `10F`); ve süzgecin
   tek yüzeyi olduğu varsayılmıştı, oysa iki yüzey var (`10C:153` yorum ·
   `10A:1298` kart metni). Yalnız `10C`'ye takmak boşluğu **kapatmış görünüp
   kapatmazdı**.
3. **Planın `paylasim_pulse` şartnamesi yanlıştı** — `prev_screen = tür`
   diyordu, oysa `wtLogPaylasim` `prev_screen: null` yazıp türü `meta.tur`'a
   koyar. Uygulayan taraf kaynağa uydu, plana değil; plan düzeltildi.
4. **Kendi FAZ 5 işimde bir §6.10 ihlali bulundu ve geri alındı.** Davetin
   Nabzı bir "Tık" sütunu çiziyordu; `notification_log.clicked_at`'i yazan
   hiçbir yer yok (`sw.js:140` yalnız pencereyi öne alır). O sütun daima 0
   gösterip "kimse tıklamıyor" diye okunurdu — ölçülmeyeni ölçülmüş gibi
   göstermek, kanıtsız sıfırdan daha yanıltıcıdır, çünkü **kanıtlı görünür**.
5. **CI dört koşu üst üste kırmızı bastı ve görülmedi** (#57–#60). Kırık FAZ
   5'in yedi kartındaki 23 korumasız HTML interpolasyonuydu. Hem kırık hem onu
   üreten iki kural boşluğu kapandı — ayrıntı aşağıda, "Sürece karşı".

## Opus öz-denetimi — 2026-09-03

**Plana karşı.** Sekiz fazın **Yeni:/Değişen:** listeleri ağaca karşı okundu;
sekizi de teslim edildi. `## Duraklar` maddelerinin hepsi karara bağlandı (en
büyüğü: küfür listesi — gerekçeyle reddedildi, gerekçe modül başlığında).
Sessizce düşen madde **yok**; sapmaların beşi yukarıda adıyla kayıtlı. Bir
şartname hatası (madde 3) ve iki keşif eksikliği (madde 2) planın kendisindeydi
ve üçü de kod yazılmadan ya da aynı turda yakalandı.

**Koda karşı.** Kapıların görmediği yer bu sprintte **gerçekten vardı** ve
pahalıya patladı: XSS tabanı 23 interpolasyonla büyümüştü, hedefli süit onu
seçmiyordu (repo-geneli kapılar hiçbir önekle bulunmaz). Düzeltme kapıyı
susturmak değil kaydı gerçek kılmak oldu — `gzSayi()` zorlamayı yazma anına
taşır (`13q:23`), iki HTML parçası ise beyan edilmiş muafiyet aldı
(`13q:1231`, gerekçe ve **blok kapsamının bedeli** yorumda yazılı). Tabanın
tolere ettiği borç **büyümedi, düştü**: 1931 → 1905 ham erişim. Tek-kaynak
motorun ikizi doğmadı: kriz için `detectCrisis` yeniden kullanıldı, dört yeni
nabız kanalı `wtLogModel` kalıbına bindi — yeni motor, yeni kolon, yeni tablo
yok. `*-MUAF` beyanlarının ikisi de gerekçelidir; gerekçesiz muafiyet yok.

**Vizyona karşı.** Eklenen şey **kart değil kaldıraç** mı? Yedi Gözlemevi
kartının her biri bir soruya bağlı ve **ne ölçmediğini de söylüyor** — bu
süsleme değil, tezin doğrudan uygulaması: *uygulama kullanıcı hakkında bir şey
söylüyorsa kaynağı kullanıcı olmak zorundadır.* En saf hâli iki kararda görünür:
(a) Davetin Nabzı'nın ölçülmeyen sütunu **kaldırıldı**, (b) ön-süzgece küfür
listesi **yazılmadı** — "uygunsuz içerik" demek sessiz bir hakarettir ve §6.10
yargılara da uygulanır. Anlam ekseni (altın=şimdi · lapis=gelecek · bronz=söz)
korundu; yeni yüzey admin panelidir, gezginin dünyasına dokunmaz. Manevi
register sekülerleşmedi — bu sprint kullanıcı microcopy'sine hiç girmedi.
Sayaç dili sızmadı: sayılar yalnız admin kadranında, gezgin yüzeyinde değil.

**Sürece karşı.** Turun asıl kazancı burada ve **iki kural boşluğu** kapandı:
1. **Repo-geneli kapılar önekle bulunmaz.** §3.3'ün hedefli süit kuralı doğru
   ama kördü: `tests/xss-kapisi.test.js` bir modülün değil bütün ağacın
   kapısıdır. Yeni kapı: `npm run kapi:genel` (`vitest run kapisi
   kapi-workflow` — 20 dosya, 284 test, ~17 sn). **Liste değil desen** olması
   kasıtlı: liste bayatlar, yeni bir kapı ona kendiliğinden girmez. §3.3'e
   madde, §9'un faz kapısına satır, `CLAUDE.md` çekirdeğine zincir.
2. **Kırmızı Kapı okunmadı.** §9'un "push sonrası Kapı koşusu izlendi" maddesi
   *sprint kapanışı* listesindeydi; oysa push **her fazda** oluyor. §10.4 iki
   hâl tanımlıyordu (kapıyı iş sayan 10 dk · bildirim sayan 50 dk); üçüncü hâl
   ikisinden de kötü ve bugün ölçüldü: **kapı hiç okunmadı.** Madde faz
   kapanışı listesine taşındı, §10.4'ün tablosu üçüncü hâli adıyla anıyor.
3. Üçüncü bir bulgu **repo dışında** kaldı ve sınırı yazılıyor: rapor kurarken
   etiket dengesi iki kez kırıldı (oda 16 ve 18). Kapı `scratchpad/rev.py`'ye
   gömüldü — ama scratchpad repoda değildir, yani bu kapı oturumla ölür. Kalıcı
   bir kural değil, bu turun aracıdır.

**Bulgular.** 8 — düzeltildi 7 · plana taşındı 0 · gerekçeyle reddedildi 1
- `js/parts/13q-gozlemevi.js` (7 kart, 23 interpolasyon) — XSS tabanı büyümüştü — **düzeltildi** (`gzSayi` + beyan)
- `PROTOKOL-FABLE.md` §3.3 — repo-geneli kapılar hedefte yoktu — **düzeltildi** (`kapi:genel`)
- `PROTOKOL-FABLE.md` §9 — Kapı okuma maddesi yanlış listedeydi — **düzeltildi**
- `js/parts/13m-kota.js:186` — duvar ölü dala bağlıydı, panel yanlış sıfır basacaktı — **düzeltildi** (önce kırmızı test)
- `js/parts/13q-gozlemevi.js` Davetin Nabzı — ölçülmeyen "Tık" sütunu — **düzeltildi**
- `.claude/plans/…` `paylasim_pulse` şartnamesi — kaynakla çelişiyordu — **düzeltildi**
- Oda 08 raporu — kanal sayısı bir akşamda bayatladı — **düzeltildi** (rev.3.1)
- Ön-süzgeçte küfür/hakaret listesi — **gerekçeyle reddedildi** (yanlış pozitifin bedeli, §6.10 yargılara da uygulanır; reaktif ⚑ hattı ikinci hat olarak duruyor)

**Bakılmayan.** Prod durumu (Supabase Dashboard) hiçbir eksende ölçülmedi ve
ölçülemez; kartların canlı `admin_usage_report` çıktısıyla nasıl göründüğü
sınanmadı — sentetik veriyle sınandı. Oda 18·B (gerçek cihaz turu) bu turda da
yapılmadı: doğrulama tarayıcısı konsolu okur, gezginin gözünü okumaz.

## Opus öz-denetimi — 2026-09-04 · sprint sonrası süreç turu

Emre "tüm yapılanları baştan sona incele ve sistemi en iyile" dedi; §3.7 bu
hâlde tek başına koşar ve kapsamı Emre'nin adlandırdığı iştir — bu oturumun
tamamı (14 commit, `c059803..4847c2b`).

**Plana karşı.** Sekiz fazın sekizi teslim edildi, on iki belge yayında;
sapmalar bir önceki kayıtta. Bu turda plana yeni bir vaat girmedi.

**Koda karşı.** Sprint kapandıktan sonra üç kırık daha çıktı ve üçü de
**kapıların kendisindeydi**, üründe değil: bekleme döngüsünün tavansızlığı,
`npm audit` adımının kırık sahibini ayırt etmemesi, `concurrency` grubunun
yarış üretmesi. Üçü de düzeltildi ve üçünün de kapısı yazıldı.

**Vizyona karşı.** Bu tur ürüne dokunmadı — kapsamı süreçti. Teze katkısı
dolaylı ama gerçek: *"Mesele Sensin"* diyen bir uygulamanın kendi kapıları
yalan söylüyorsa, o cümlenin bedeli düşer. Bir kapının "yeşil" demesi bir
iddiadır ve iddia kanıt ister (§6.10) — bu turda üç kapı, kanıtı olmadan
konuştuğu için düzeltildi.

**Sürece karşı — turun asıl bulgusu.** Bu oturumda **beş süreç kırığı** çıktı
ve ölçüldüğünde hepsinin aynı aileden olduğu görüldü:

| Kırık | Kural var mıydı? | Eksik olan |
|---|---|---|
| XSS tabanı büyüdü, hedefli süit görmedi | ✅ vardı | kapının **hedefi** |
| Kırmızı Kapı dört tur okunmadı | ✅ vardı | maddenin **listesi** |
| Tavansız döngü 40 dk yedi | ✅ mantık vardı | döngünün **tavanı** |
| `npm audit` 503'te kırmızı bastı | ✅ vardı | kırığın **sahibi** |
| PR guard'ı yarışta kanıt bulamadı | ✅ vardı | koşunun **sırası** |

**Beşinde de kural VARDI.** Hiçbiri "kural yok" değildi — hepsi "kural yanlış
yerde" idi. Bu, §6.6'nın bir üst basamağıdır ve protokole yazıldı: *kapısız
bir kural en azından kendini kural sanmaz; yanlış yerde duran kapı ise
koruduğunu sanır ve o güveni boşa harcatır.* §3.7'nin dördüncü ekseni artık
bu soruyla başlıyor: **kural yok muydu, yoksa yanlış yerde mi duruyordu?**

**Bulgular.** 5 — düzeltildi 5 · plana taşındı 0 · reddedildi 0
- `tests/` (yoktu) — repo-geneli kapılar önekle bulunmuyordu — **düzeltildi** (`kapi:genel`)
- `PROTOKOL-FABLE.md` §9 — Kapı okuma maddesi yanlış listedeydi — **düzeltildi**
- kabuk komutu — tavansız `until` + 403 → 40 dk sessiz sonsuzluk — **düzeltildi** (§10.6 + kapı)
- `.github/workflows/kapi.yml` — `npm audit` kırık sahibini ayırt etmiyordu — **düzeltildi** (üç kova + davranış kapısı)
- `.github/workflows/kapi.yml` — `concurrency` grubu yarış üretiyordu — **düzeltildi** (head sha)

**Bakılmayan.** ELLE kuyruğu (`041`–`051`, üç edge redeploy) bu turda da
ölçülmedi ve ölçülemez. Oda 18·B (gerçek cihaz turu) duruyor. `npm audit`in
üç kovası sentetik senaryolarla sınandı — gerçek bir 503 anında koşmadı,
ama kırığın kendisi zaten gerçek bir 503'tü.
