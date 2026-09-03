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

### FAZ 5 — Gözlemevi kartları · 🅞 · ~1.5 oturum
Yedi kart. Devir: 🅞 — kartların **adı, sırası ve teşhis cümleleri** üründe
ayarlanır; "Emniyet Nabzı"nın hangi sayıyı öne alacağı (yakalama mı, kart
gösterimi mi) plandan okunamaz ve mahremiyet sözleşmesine dokunur.
**Değişen:** `js/parts/13q-gozlemevi.js`

### FAZ 6 — Üç küçük borç · 🅢 · ~1 oturum
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
**Yeni:** `js/parts/10D-on-suzgec.js` (önek `sz`)
**Değişen:** `js/parts/10C-sosyal-feed.js`

### FAZ 8 — On iki raporun yeniden yayını · 🅞 · ~2 oturum
Devir: 🅞 — her odanın **hangi cümlesinin düzeltileceği** yargıdır; rapor
metni ürünün sesidir (§2). Aynı URL'e yayın; `favicon` verilmez (mevcut
korunur); `.claude/artifacts.md` tablosu tazelenir.
**Değişen:** on iki artifact + `.claude/artifacts.md`

**Etiket sayımı:** 🅢 **5** · 🅞 **3** — oran kapısı (§4.4) geçildi.

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

- **YENİ:** `migrations/051_gozlemevi_tek_cam.sql` · `js/parts/10D-on-suzgec.js` ·
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

**İlk hamle (FAZ 4):** `migrations/051_gozlemevi_tek_cam.sql` — `050`'nin on
altı bloğunu aynen taşı, üstüne yedi blok ekle.
