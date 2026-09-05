---
name: duygu-motoru-plani
description: "KARAR 2026-08-28: Duygu Motoru uygulamanın TAMAMINA dokunur + Yanılma Kapısı; okuma yüzeyin bedelini karşılayacak kadar kanıtlıysa çıkar; 19 faz TAM + uçtan uca inceleme (08-30) — kapının 8 yüzeyi, damga kuralı, 10x susuyor, yay ölüydü/dirildi, iki defter birlikte dolar"
metadata:
  type: project
---

**Emre'nin isteği (2026-08-28):** *"LLM'ler soğuk ve mantığa dayalı konuşuyor
ancak insanla konuşuyor… duyguyu da hissettirelim."* Motor duygusal ihtiyacı
**iki saatte** okuyacak: "hem genel olarak o kullanıcı için hem de o sohbet
için". Plan: `.claude/plans/duygu-motoru.md` — 19 faz (16 🅢 / 3 🅞).

**Emre'nin kapsam kararı (aynı gün, ikinci tur):** motor yalnız sohbete değil
**uygulamanın tamamına** dokunur — "ancak yanlış okuma yapmamak için
world-class bir önlem alalım". Bu iki cümle bir takastır: yüzey büyüdükçe
yanılmanın bedeli büyür, o yüzden genişleme kendi kapısını yanında getirir.

## Merkez kavram
**Duygu bir veri değil, bir ihtiyaçtır; ihtiyaç ancak karşılanarak geçer.**
Nabız (bu sohbet) + İklim (bu kullanıcı) → **Karşılama** (yedi eksen: tanıklık,
yatıştırma, sahiplenme, berraklık, diriltme, kutlama, tutma). Töre tek cümle:
**duygu söylenmez, davranılır** — "Anlıyorum" kartuşlarda YASAK, çünkü duyguyu
adlandırmak onu karşılamanın yerine geçer.

## Keşifte bulunan dört kırık (koda karşı doğrulandı, 2026-08-28)
1. `p2DetectEmotions` kanıt yokken `['neutral']` döner (09a:277) — §6.10 ihlali,
   doğrusu `null`.
2. `trackEmotionalFlow` yalnız 5/3/2/1 üretir (00:44), `_determineContextMode`
   `>= 4` arar (01:187) → **`deep_emotion`'ın 4 kademesi ölü**.
3. Yoğunluk mutlak — kişinin kendi tabanı yok.
4. Olumsuzlama okunmuyor: `/mutsuz/i` "mutsuz değilim"i de tutar (16c:15).

## Yanılma Kapısı (kapsam genişlemesinin bedeli)
**Okuma, taşıyacağı yüzeyin bedelini karşılayacak kadar kanıtlıysa o yüzeye
çıkar.** Sohbette yanlış okuma bir tur sürer; kartta kalıcıdır; bildirimde
üstelik eskimiştir. Tek kapı `dgKapi(yuzey)`, dört kadran: **tanık sayısı**
(iki bağımsız kanıt sınıfı; aynı cümleden iki eşleşme TEK tanıktır) ·
**tazelik yarı-ömrü** (pencere dolunca okuma eskimez, `null` olur) ·
**ayrışma sustur** (ölçüm ile modelin okuması çelişince pahalı yüzey susar —
iki çelişkili okumanın ortalaması kendinden emin bir yanlıştır) ·
**geri alma her yüzeyde** (düzeltme BEYAN'dır, yüzey sınıfını susturur).

**Ehliyet beyanla kazanılır:** motorun günlük ölçümü kullanıcının kapanış
töreninde verdiği 1-10 skorla (`mood_history`, 05:234) sınanır → `dgIsabet
{n, uyum}`. Pahalı yüzeyler (seçici, bildirim) `n >= 7` olmadan **hiç doğmaz**;
uyum düşerse geri kapanır. Bu bir öz-beyan değil ÖLÇÜMdür — kanıtı
kullanıcının kendi rakamıdır. Dağılım kayarsa motor "seni tanımıyorum" hâline
döner (eskimiş kesinlik, yokluktan zararlıdır).

**Kimlik iddiası yasağı:** kartlar kimlik yüzeyidir; duygu yalnız **sunumu**
(sıra, ışık) değiştirir, **metne dokunamaz** — yoksa geçici bir hâl kalıcı bir
tanıya döner, tezin tersi.

## Mimari kararlar (kalıcı)
- Tek modül `js/parts/13D-duygu-motoru.js`, önek `dg`, tek storage anahtarı
  `etw_dg_iklim_v1_<uid>`. Yeni CSS yok, yeni i18n mekanizması yok.
- **Sıfır ek LLM çağrısı:** mevcut `[MOD:xxx]` satırı `[MOD:soft|DG:tanıklık#S2]`
  olarak genişler; modelin okuması `kokenSozBlok` numarasına bağlanır.
- **Migration YOK:** telemetri `wtLogMode` gibi `usage_events`e migration'sız
  biner. ELLE Supabase işi çıkmıyor.
- Sözlük 16c'nin mevcut `dp()` mekanizmasına biner; kanıt kapısı 13y; beyan
  defteri 09i deseni; şeffaflık paneli 10q `kkNedenGirisHTML` emsali.
- **13v ile çakışma yok:** 13v *hangi temel konuşacak*, 13D *nasıl karşılanacak*.
  Farklı sorular, oy paylaşımı gerekmez. 13D "ihtiyaç" adını KULLANMAZ.

**Why:** LLM'ler duyguyu etiketliyor, karşılamıyor; Wanderer'da da zincir
etiketle bitiyordu. Tez *Mesele Sensin*: kullanıcının ne hissettiğine dair son
sözü uygulama söyleyemez — ama ona ne verdiğinin sorumluluğu uygulamanındır.

**How to apply:** duyguya dokunan yeni bir yüzey açarken üç soruyu sırayla sor:
(1) bu yüzeyin bedeli ne — geri alınabilir mi, eskir mi, kalıcı mı; (2) `dgKapi`
üzerinden mi okuyor (doğrudan `dgNabiz` okumak kapıyı töreye çevirir);
(3) kimlik iddiası üretiyor mu (K12 yasağı). Kanıt yoksa yüzey **doğmaz** —
"nötr" bir varsayılan koymak §6.10 ihlalidir.

## 19/19 TAM (2026-08-30) — sonradan öğrenilen dört kural

1. **Kapının yüzeyi SEKİZdir, yedi değil.** `davet` (13o sessizlik daveti)
   FAZ 19'da kendi kimliğini kazandı: `{ tanik: 2, tazelik: 'dk90',
   ayrisma: true }`, **ehliyet yok**. K10 tablosu onu 10x ile aynı hücreye
   koymuştu, oysa 13o kullanıcı ekrandayken konuşur (`_isChatActive`) —
   hatası tek turda geri alınır. Ölçü: istenmeden gelen konuşma, cevaptan
   çok kanıt ister.
2. **"Damgayı teslim eden basar" ölçülebilir bir kuraldır** (§6.10 · K13).
   FAZ 16 denetiminde iki kez kırıldı: atmosfer damgası her `asRefresh`'te
   basılıyordu (saatlik zamanlayıcı + mod rozeti + akış bitişi — oysa
   `asGuncelle` aynı kelimede ekrana hiç dokunmaz), eşikte de doz
   uygulanmayan eksenlerde basılıyordu. İkisi de yanılma oranının
   **paydasını** şişirip motoru gerçekte olduğundan isabetli gösteriyordu.
   Kural: damga, görünür farkın oluştuğu DALDA basılır.
3. **`anlik` tazelik "her zaman taze" demektir** ve yalnız aynı turda
   çağrılan yüzeyler için doğrudur. Atmosfer şeridi öyle değildi (saatlik
   tazeleme) — okuma eskimiyor, **donuyordu**; duygu dalı zincirin üstünde
   olduğu için mod/özet/saat halkaları bir daha çalışmıyordu. FAZ 19'da
   `dk90`a çekildi. Ölçüm ancak FAZ 17 `S._dgNabizZaman`i doğurduktan sonra
   mümkün oldu: **damgası olmayan kadran ölçmez, varsayar.**
4. **10x (push) bilerek SUSAR.** Push metnini `send-push` edge fonksiyonu
   üretir (pg_cron); client'ın üç çağrısı da test/broadcast'tir, kullanıcıya
   giden nudge metnini kurmaz. Duyguyu oraya taşımak (a) edge deploy ister,
   (b) K10'un kendi cümlesine göre zaten eskimiş bir okumayla konuşurdu.
   `user_engagement`'a tüketicisi olmayan bir alan yazmak da §6.10 ihlali
   olurdu. Bu bir boşluk değil, kapının çalışmasıdır.

5. **Kapının yüzey listesi ile telemetrinin beyaz listesi BİRLİKTE değişir.**
   FAZ 19 `davet`i `DG_KAPI_ESIK`e ekledi, `00f`'un `_DG_YUZEY` kümesine
   eklemeyi unutunca telemetri yüzeyi sessizce `null` yazıyordu — kanal
   çalışıyor, Gözlemevi hiçbir sütunda göremiyor. Küme dışı değerin sessizce
   düşmesi bir güvenlik özelliğidir ama aynı zamanda sessiz bir kayıp yolu.
6. **Bir ailenin deseni başka ailenin kelimesinin içinde yaşamamalı.**
   Ölçülen vaka (2026-08-30): çıplak `/happy/i` "un**happy**" içinde
   eşleşiyordu ve sevinç ailesinin kuvveti (3) kederinkini (2) yendiği için
   *"i'm unhappy"* → **kutlama** karşılaması alıyordu; kanıt olarak
   kullanıcının kendi cümlesi gösteriliyordu. TR tarafı dersi öğrenmişti
   (`(?<![a-zçğıöşü])mutlu` — "umutlu"; `huzur(?!suz)`; sınırlanmış `yeter`),
   EN öğrenmemişti. Kapı: `tests/16c-detect-desen-kapisi.test.js` — hem
   tuzağı hem AŞIRI DARALTMAYI sınar.

**Çıkarımın cezalandırma yetkisi yoktur (FAZ 18).** Seçicide duygu çarpanı
tek yönlüdür: yakınlık varsa ×1.2, yoksa 1 — 0.x çarpan YASAK. Negatif
çarpan (0.6) bir ÖLÇÜMÜN karşılığıdır (geçti/kapattı); duygu okuması
çıkarımdır ve yanlış bir çıkarım, kanıtla hak edilmiş bir kartı geri
alınamaz biçimde gömerdi.

## Uçtan uca inceleme turu (2026-08-30) — beş bulgu daha, hepsi ÇAĞRIDA ya da SIFIRLAMADA

7. **Yay FAZ 3'ten beri ölüydü — K2'nin ikinci kuralı hiç tetiklenmedi.**
   `dgYay` `{kuvvet}` arar, ölçüm defteri aynı sayıyı `intensity` adıyla
   tutar → daima `null`. Ayrıntı ve genel ders: [[saf-yesil-cagri-olu]].
   *Ders:* **motorun saf fonksiyonlarını sınayan yeşil bir süit, o
   fonksiyonlara YANLIŞ ALANIN geçirildiğini asla göremez.**
8. **İklim tabanına GÖRELİ kuvvet yazılıyordu (K4 ihlali).**
   `dgIklimTabanEkle(iklim, nabiz.kuvvet)` — oysa `nabiz.kuvvet` İklim hidre
   olduktan SONRA `_dgGoreliKuvvet`in yüzdelik çıktısıdır. Zemin kendi
   cevaplarıyla besleniyordu: percentile kıyası anlamını yitirir, dağılım
   zamanla kendi ortasına düzleşir. Doğrusu `nabiz.kuvvetMutlak`.
   *Tuzağın sinsiliği:* ilk 20 ölçümde GÖRÜNMEZ (eşik altında göreli =
   mutlak) — tam da kapı açıldıktan sonra sessizce bozulur.
9. **Damgasız kadran ölçmez, VARSAYAR — ve varsayım "bugün"dür.**
   `'gun'` tazeliğinde `zaman` geçilmezse okuma "bugün" sayılır. Kapının
   sohbet dışındaki altı tüketicisinden yalnız `02d` (eşik) damgayı
   geçirmiyordu: gece boyu açık kalmış bir kabukta (PWA, reload yok) eşiğin
   ışığı DÜNÜN hâliyle yanardı. Yeni bir yüzey bağlarken ctx'in altı alanını
   (`nabiz · oncekiNabiz · iklim · zaman · akis · ayristi`) tek tek say.
10. **İki defter aynı dalda dolar.** Yanılma iki yere yazılır ve işleri
    farklıdır: `dgYanilmaKonustu/Duzeltildi` → kullanıcının İklim'i (kapının
    beşinci kadranı, GERÇEK kapanma kararı); `wtLogDuygu` → `usage_events`
    (Gözlemevi'nin gördüğü toplam). FAZ 16-19 beş teslim noktasında yalnız
    ilkini bastı → admin kadranında `davet` satırı `0 · 1✕` görünüyordu:
    sıfır konuşmanın üstünde duran bir düzeltme (§6.10). Kapı:
    `tests/13D-iki-defter-kapisi.test.js` (repo genelinde bakar — sohbetin
    damgası 01'de, telemetrisi 06'dadır).

11. **Yeni bir kadran alanı doğduğunda oturum sıfırlaması da büyür.**
    FAZ 17'nin `_dgOncekiNabiz`/`_dgNabizZaman` alanları `newSession()`'ın
    listesine hiç eklenmemişti: yeni günün İLK mesajında `oncekiNabiz` dünkü
    ölçümdü, tanık sayısı 2'ye çıkıyor ve K10'un *"2 bağımsız tanık, aynı
    gün"* şartıyla korunan `toren` yüzeyi dünün gölgesiyle konuşabiliyordu.
    Sıfırlama bloğunun kendi gerekçesi bunu zaten söylüyordu (`_dgSonKarsilama`
    için) — alan eklenirken o gerekçe okunmadı. Kapı:
    `tests/13D-yanilma-kapisi.test.js` (beş alan BİRLİKTE sıfırlanır).

**Bozulmayan iki karar (yeniden sınandı, yerinde bırakıldı):**
- **`secici` damga BASMAZ.** Panelde görünür bir duygu satırı var ama oradaki
  tek jest (`secBeyanAzalt`) **kartı** susturur, "beni yanlış okudun" demez.
  Duygu o skorda altı çarpandan biri ve yalnız ×1.2'lik bir kaldırmadır;
  kartın reddini duygu okumasına yazmak, kullanıcının beyan etmediği bir
  yanılmayı deftere geçirmek olur. Seçiciyi koruyan mekanizma yanılma
  defteri değil **ehliyettir** (K11).
- **K12'nin `13D-kimlik-yasagi.test.js` dosyası hiç yazılmadı** ama ÖZÜ üç
  iddiayla mühürlü (`13D-yanilma-kapisi.test.js`): `dgKapi('kart')` daima
  `metin: null` · repoda `dgKarsilama(` çağıranı yok · `dgNabiz(` yalnız iki
  bilinen ölçüm kaynağında. Eksik olan ad, mekanizma değil — ikizi yazılmadı.

**Açık (plan dışı, ad göçü):** `S._emotionalFlow` kuvveti `intensity` der,
motor `kuvvet` der; dört okuma noktasında daha yaşıyor. FAZ 18'in
`hisler`/`duygular` gözlemiyle aynı sınıf (§4.3 çeviri katmanı). Bu turda
ayrışma tek kaynağa (`_yayGirdisi`) toplandı — göç geldiğinde silinecek tek
satır orasıdır.

İlgili: [[saf-yesil-cagri-olu]] · [[gerceklik-mimarisi]] · [[kesin-alinti-mimarisi]] ·
[[ihtimalsel-dil-devrimi]] · [[duyar-anlar-hatirlar]] ·
[[personalization-engine-layers]] · [[tanima-motoru]] ·
[[guvenlik-emniyet-katmani]] · [[his-motoru-2-0]] · [[soz-ihtiyac-motoru-karari]]
