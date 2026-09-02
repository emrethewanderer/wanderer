# Kesin Alıntı Mimarisi — "Model yazmaz, gösterir"

> **Bu belge hakkında.** `PROTOKOL-FABLE.md` §6.10 bu dosyaya "Ayrıntı:" diye
> işaret ediyordu ama orijinali bu repo snapshot'ında yoktu. Belge
> 2026-09-02'de kodun **o günkü hâlinden** yeniden çıkarıldı —
> `js/parts/13y-koken.js`'in 3b bölümü, `tests/13y-koken.test.js`, ve bu
> mekanizmayı tüketen modüller (`09d-oruntu-motoru.js`,
> `09e-yasayan-portre.js`, `06-summary-chat.js`, `10q4-olus-muhru.js`,
> `10y2-baslaticilar.js`, `09a-personalization-engine.js`) okunarak.
> Kararın tarihçesini değil, bugün diskte duran mekanizmayı anlatır. Kod
> yorumlarındaki tarihler (ör. 2026-08-02) koddan alıntıdır.

## Merkez kavram

`PROTOKOL-FABLE.md` §6.10'un kendi cümlesi bu mimarinin gerekçesidir:

> *"Alıntı eşikle değil eşleştirmeyle doğrulanır. Bulanık örtüşme oranı
> (`>= 0.6`) bir ROC eğrisinde nokta seçmektir: hangi noktayı seçersen seç
> iki tür hatadan birini satın alırsın. […] Model alıntıyı **yazmaz,
> gösterir**: numaralı söz bloğu (`kokenSozBlok`) prompt'a girer, model
> `kanit_ref` döndürür, metni uygulama kaynaktan keser. Kullanıcı ekranda
> kendi cümlesini görür — modelin o cümleye dair hatırladığını değil."*

`13y-koken.js`'in kendi başlığı bunu "ALINTI KESİNDİR" diye adlandırıyor
(13y-koken.js:20-24): kökensizlik bir eşiğin ARDINDA da saklanamaz —
`0.6`'nın üstündeki uydurmayı kabul etmek ile altındaki gerçeği atmak
ikisi de kabul edilemez. Sorunun biçimi tamamen değişti: eskiden "gelmiş
OLABİLİR Mİ" (bir olasılık) soruluyordu, artık "havuzda VAR MI" (bir
evet/hayır) soruluyor.

## Mekanizma — üç adımlı akış

```
kullanıcının gerçek cümleleri
        │
        ▼  kokenSozBlok(sozler, opts)
{ blok: "[S1] \"...\"\n[S2] \"...\"", harita: { S1: "...", S2: "..." } }
        │
        ▼  blok prompt'a `{{sozler}}` gibi bir yer tutucuya enjekte edilir
     LLM çağrısı (callLLM)
        │
        ▼  model JSON döner, örn. { "kanit_ref": "S3", "kanit": "..." (opsiyonel çapraz kontrol) }
        │
        ▼  kokenAlintiCoz(ref, kirpma, harita, sozler)
   { alinti: "<KAYNAKTAN kesilmiş gerçek cümle>", ref: "S3" } | null
```

### Adım 1 — `kokenSozBlok(sozler, opts={})` (13y-koken.js:226-243)

Girdi: ham cümle listesi. `opts.max` (varsayılan `SOZ_BLOK_MAX = 14`,
13y-koken.js:74) kadarını **sondan** alır (tazelik — en yeni cümleler
kalır), her birini `opts.maxLen`e (varsayılan `SOZ_BLOK_MAX_LEN = 180`,
13y-koken.js:75) kırpar. Dönüş `{ blok, harita }`:

- `blok` — prompt'a giden metin: `[S1] "kesik cümle"` satırları,
  `\n` ile birleştirilmiş; girdi boşsa `'-'`.
- `harita` — `{ S1: 'kesik cümle', S2: … }`. Haritadaki metin de KESİKTİR
  (dosyanın kendi yorumu: "model neyi gördüyse kanıt odur",
  13y-koken.js:238) — çünkü çözüm adımı modelin GÖRDÜĞÜ metinle
  karşılaştırma yapar, kırpılmamış orijinalle değil.

### Adım 2 — model `kanit_ref` döndürür

Prompt şablonları (i18n sözlüğünde, `js/parts/16b-i18n-prompt-dict-core.js`
ve İngilizce karşılığı `16e-i18n-prompt-dict-en.js`) modele kuralı açıkça
yazar. Örnek — örüntü damıtma sistemi (16b-i18n-prompt-dict-core.js:486):

> *"KANIT YAZILMAZ, GÖSTERİLİR: 'kanit_ref' alanına '…CÜMLELERİ'
> bölümündeki satırın etiketini koy (ör. 'S3'). Cümleyi yeniden yazma —
> uygulama onu kaynaktan alır. Gösteremiyorsan o örüntüyü hiç yazma."*

Aynı kalıp beş ayrı prompt'ta tekrarlanır — günlük portre konsolidasyonu
(16b:493-494), oluş sınaması (16b:527-528), kişiselleştirme derin analizi
(16b:827-831) — her biri kendi JSON şemasında bir veya birden çok
`kanit_ref` alanı ister (bazen `zirve_kanit_ref` gibi tekil bir "en yüklü
cümle" için de).

### Adım 3 — `kokenAlintiCoz(ref, kirpma, harita, sozler)` (13y-koken.js:278-299)

Modelin gösterdiği referansı GERÇEK cümleye çevirir. Dört sıralı adım
(dosyanın kendi yorumu, 13y-koken.js:261-277 — hiçbirinde eşik yok):

1. `ref` geçerli VE (kırpma yoksa ya da kırpma o referansın metnini
   doğruluyorsa) → o cümle kanıttır.
2. Kırpma referansı doğrulamıyorsa → tüm havuzda BİREBİR aranır; bulunursa
   bulunduğu cümle kazanır (ref'ten daha güçlü bir doğrulama).
3. Hiçbir yerde birebir bulunamadı ama `ref` GEÇERLİ → yine de ref'in
   cümlesi kanıttır — bu, modelin alıntıyı PARAFRAZ ettiği (doğru cümleyi
   gösterdi ama kendi kelimeleriyle yazdı) hâldir; kırpmayı veto hakkı
   saymak ref'in var olma amacını öldürürdü.
4. Ref de yoksa → `null`; madde sessizce düşer.

`ref` normalizasyonu (`_refNorm`, 13y-koken.js:248-251) süslemeyi tolere
eder: `[S3]`, `s3`, `" S3 "`, hatta çıplak `3` hepsi `S3`'e döner — biçim
hatası doğru bir kanıtı düşürmesin diye.

Kanıt DAİMA `kokenKirp()` ile kaynaktan kesilir — modelin yazdığı
metinden değil. `kirpma` parametresi yalnız ÇAPRAZ KONTROL amaçlıdır, asla
kanıt metni olarak kullanılmaz (13y-koken.js:255-260).

## Sözleşme

| Fonksiyon | İmza | Dönüş | Kaynak |
|---|---|---|---|
| `kokenSozBlok` | `(sozler: string[], opts?: {max?, maxLen?}) => { blok, harita }` | prompt metni + referans haritası | 13y-koken.js:226-243 |
| `kokenAlintiCoz` | `(ref, kirpma, harita, sozler) => { alinti, ref } \| null` | kesin kanıt ya da hiç | 13y-koken.js:278-299 |
| `kokenIcerir` | `(kaynak, parca) => boolean` | Adım 2/3'ün birebir testi | 13y-koken.js:174-179 |
| `kokenKirp` | `(s) => string` | `ALINTI_MAX_LEN=160` tavanlı kırpma | 13y-koken.js:189-192 |

## Kapı

Bu mimari için iki ayrı koruma var — biri statik (denetçi), biri her
tüketicinin kendi kod yolunda:

1. **K3 (`scripts/gerceklik-denetci.mjs:130-139`)** — bir modül `callLLM`
   çağırıyor VE LLM çıktısından `.kanit` okuyorsa, `kokenAlinti` /
   `kokenYorum` / `kokenAlintiCoz`'dan biri o dosyada geçmek ZORUNDADIR.
   Geçmiyorsa denetçi kırılır. Tam mekanizma ve K1-K6 tablosu
   `.claude/plans/gerceklik-mimarisi.md`'de.
2. **Her tüketicinin kendi "bağlanamayan madde sessizce düşer" satırı** —
   `kokenAlintiCoz` `null` döndüğünde çağıran satır o maddeyi (örüntüyü,
   değeri, soruyu) HİÇ üretmez; ekrana ya da bir sonraki LLM turuna hiç
   girmez. Bu, denetçinin göremeyeceği DAVRANIŞSAL bir kapıdır — her
   tüketicide ayrı ayrı yazılıdır (aşağıdaki tabloya bakın).

`tests/13y-koken.test.js`'in `kokenSozBlok`/`kokenAlintiCoz` blokları
(13y-koken.test.js:260-340+) mekanizmayı doğrudan sınar: numaralı blok
üretimi, tavan+tazelik, haritanın kesikliği, geçerli ref çözümü, süslenmiş
ref'in (`[S2]`, `s2`, `2`) çözülmesi, PARAFRAZ durumunda ref'in kanıtı
kaybettirmemesi, YANLIŞ hedef gösteren ref'in kırpma çapraz kontrolüyle
yakalanması, uydurulmuş kanıtın hiçbir yoldan giremediği, ve tek kelimelik
serbest kanıtın bağlanmadığı.

## Tüketiciler

| Modül | Ne için kullanır | Kanıt | Kaynak |
|---|---|---|---|
| `09d-oruntu-motoru.js` | Haftalık örüntü damıtma — sohbet kanıtı numaralı bloğa çevrilir, model her örüntü için `kanit_ref` gösterir | bağlanamayan örüntü hiç doğmaz (`_parseDistill`) | 09d-oruntu-motoru.js:574 (blok üretimi), 751 (çözüm) |
| `09e-yasayan-portre.js` | Günlük portre konsolidasyonu — değerler/çelişkiler/kör noktalar her biri kendi `kanit_ref`ini taşır | `_kanit()` yardımcı fonksiyonu boş dönerse madde `filter(Boolean)` ile elenir | 09e-yasayan-portre.js:397 (blok), 223-227 (çözüm) |
| `09a-personalization-engine.js` | Seans-sonu derin analiz — `open_loops`, `life_facts`, `important_dates`, `zirve_kanit_ref` | `_kanit(o)` çözülemezse madde atılır; `zirve_kanit_ref` ayrıca `igZirveKaydet`e gider | 09a-personalization-engine.js:2197-2201, 2236-2238 |
| `10q4-olus-muhru.js` | Oluş Sınaması — dört boyuttan (düşünce/inanç/his/davranış) her biri için modelin "yaşandı" iddiası `kanit_ref` ile doğrulanmadan SAYILMAZ; kanıtlı boyut sayısı `SINAMA_GECER=3`'e ulaşmazsa sınama geçilmez | hüküm ARTIK modelin `gecti` beyanından değil, kanıtlı boyut sayısından çıkar (K4 ile aynı gerekçe: öz-beyan kapı olamaz) | 10q4-olus-muhru.js:987-994 (mimari not), 1156 (çözüm) |
| `06-summary-chat.js` | Sohbet turundaki model duygu-okuması (`DG:` etiketi) `#S2` gösterirse kanıt kaynaktan kesilir, İklim defterine yazılır | ref çözülemezse `kanit` sessizce `null` kalır, okuma yine de kaydedilir (kanıtsız ama SAYILAN bir sinyal — ayrı bir mekanizma) | 06-summary-chat.js:2196-2205 |
| `10y2-baslaticilar.js` | Ana ekran kişisel başlatıcı soruları — model soruyu üretir, kanıtı `kanit_ref`/`kanit_kirpma` ile gösterir | çözülemeyen soru şeride hiç girmez (`if (!coz \|\| !coz.alinti) return;`) | 10y2-baslaticilar.js:231, 250-254 |
| `10q-w2-kisi-karti.js` | Yukarıdaki motorların ÜRETTİĞİ kanıtı (10q4'ün `sinav.alintilar`ı, 10y2'nin `kanit`i) panelde GÖSTERİR — kendisi `kokenAlintiCoz` çağırmaz, önceden çözülmüş alıntıyı okur | ikinci kez ölçüm yapılmaz (yorum satırı bunu açıkça söylüyor) | 10q-w2-kisi-karti.js:2062-2068, 2167-2170 |

`09g-ayna-protokolu.js:164-166` ve `10p-w2-meclis.js:624-643` da aynı
deseni izler: kanıtı 09e'nin portresinden okurlar ve orada zaten
`kokenAlintiCoz`'dan geçtiği için ikinci kez ölçmezler — yani bu ikisi
üretici değil, 09e'nin tüketicisidir.

## İlgili ama bu belgenin kapsamı dışında

`13D-duygu-motoru.js`, benzer bir "kaynaktan kesilmiş kanıt" fikrini
**farklı bir mekanizmayla** uygular: `_kanitKes(metin, start, end)`
(13D-duygu-motoru.js:180) modelin döndürdüğü `[MOD:x|DG:eksen#S2]` tag'inin
konumundan ham metinde cümle sınırında kesim yapar — `kokenSozBlok`/
`kokenAlintiCoz` çiftini KULLANMAZ. `13o-geri-cagri.js:27-30` bu ayrımı
açıkça yazıyor: `_kanitKes`in ürettiği kanıt "LLM çıktısı DEĞİL", kullanıcının
kendi ham metninden yapılan bir ÖLÇÜMdür; K3'ün aradığı kapı LLM'in
ÜRETTİĞİ kanıt iddiaları içindir, ikisi hiç kesişmez. Bu farklı mekanizma
bu belgenin konusu değildir.
