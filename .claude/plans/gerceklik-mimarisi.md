# Gerçeklik Mimarisi — "Kanıtı olmayan değer yoktur"

> **Bu belge hakkında.** `PROTOKOL-FABLE.md` §6.10 bu dosyaya "Ayrıntı:" diye
> işaret ediyordu ama orijinali bu repo snapshot'ında yoktu (2026-09-02'de
> `.claude/plans/` altında yalnız `denetim-onarimi.md` ve `devir-altyapisi.md`
> duruyordu). Belge o tarihte kodun **o günkü hâlinden** yeniden çıkarıldı —
> `js/parts/13y-koken.js`, `scripts/gerceklik-denetci.mjs`,
> `tests/gerceklik-kapisi.test.js`, `tests/13y-koken.test.js` ve
> `tests/sifir-kanit-sinavi.test.js` okunarak. Kuralın **tarihçesini**
> (hangi kararın hangi tartışmadan doğduğunu) anlatmaz — çünkü o tarihçenin
> kanıtı yok; anlattığı, bugün diskte duran **mekanizmanın kendisidir**.
> Kod içindeki yorumlarda geçen tarihler (ör. 2026-08-02) koddan alıntıdır,
> bu belgenin kendi iddiası değildir.

## Merkez kavram

`js/parts/13y-koken.js`'in kendi başlığı bunu tek paragrafta söylüyor
(13y-koken.js:4-18): Wanderer'ın tezi "Mesele Sensin"dir ve bu, bir veri
kuralı doğurur — uygulama kullanıcı hakkında bir şey söylüyorsa, o şeyin
kaynağı kullanıcının kendisi olmak zorundadır. Üç köken vardır, aralarında
hiyerarşi yok, üçü de farklı bir sorumluluğu taşır:

- **beyan** — kullanıcının kendi eliyle koyduğu değer. Doğrulama istemez.
- **olcum** — uygulamanın davranıştan saydığı değer. Yalnız kanıt sayısı
  (`n`) bir eşiği geçerse anlamlıdır.
- **yorum** — LLM'in ürettiği değer. Kaynak metne (kullanıcının gerçek
  cümlesine) bağlanamıyorsa veri sayılmaz, atılır.

Dördüncü bir hâl var ama bu bir köken DEĞİL — **kökensizlik**: `'yok'`.
Motorun bütün işi bu dördüncü hâli görünür ve zararsız kılmaktır, çünkü
protokolün kendi cümlesiyle (§6.10) kökensizlik bugüne dek `50` ve `0.6`
gibi masum sayılara gizleniyordu.

## Mekanizma

### Tek şekil: `{ v, kaynak, n }`

Motorun her kurucu fonksiyonu aynı şekli döndürür (13y-koken.js:26-30,
94-99). `v` değer yoksa **daima** `null`'dur — tüketici sayıyı gizler,
yerine bir davet gösterir; `50` gibi bir varsayılana asla düşülmez. Tek
üretim noktası `_yok(n)`'dur (13y-koken.js:97-99); `n` korunur çünkü "hiç
kanıt yok" ile "2 kanıt var ama 3 gerekiyordu" farklı hikâyelerdir.

Üç kurucu:

| Fonksiyon | Girdi | Kural | Kaynak |
|---|---|---|---|
| `kokenBeyan(deger)` | ham değer | boş/`null`/`undefined` → yok; aksi hâlde `{v, kaynak:'beyan', n:1}` — doğrulanmaz | 13y-koken.js:103-106 |
| `kokenOlc(deger, n, esik=KOKEN_ESIK)` | ölçüm + kanıt adedi | `n < esik` **veya** `deger` sayı değilse → yok; aksi hâlde `{v, kaynak:'olcum', n}` | 13y-koken.js:111-117 |
| `kokenYorum(deger, kanit, kaynakMetinler)` | LLM çıktısı + iddia edilen kanıt + gerçek kaynak metin(ler) | `kokenAlinti` kapısından geçmezse → yok; geçerse `{v, kaynak:'yorum', n:1, kanit}` | 13y-koken.js:123-127 |

`KOKEN_ESIK = 3` (13y-koken.js:69) `kokenOlc`'un varsayılan eşiğidir ve
İCAT EDİLMEMİŞTİR — dosyanın kendi yorumu bunu `09b-depth-foundations.js`nin
zaten uyguladığı `signals_count < 3` kapısının tek yere toplanmış hâli
olarak tanımlıyor (13y-koken.js:33-35).

### İki tüketici sorusu

Motor kendi başına hiçbir şeyi UI'a ya da prompt'a bağlamaz; iki saf soru
fonksiyonu sağlar, tüketici bunlardan birini sorar:

- **`kokenVar(x)`** (13y-koken.js:131-133) — motorun `{v, kaynak, n}`
  şeklindeki bir kaydı için: kaynak `'yok'` değil mi, `v` `null`/`undefined`
  değil mi. UI ve prompt kapısının TEK sorusudur.
- **`kokenKayitVar(x)`** (13y-koken.js:144-146) — düz nesne taşıyan
  kayıtlar (09a'nın yaşam hafızası gibi) `{v, kaynak, n}` şekline
  sokulmaz; bunlar için soru aynıdır ama şekli farklıdır: damgası var mı
  VE o damganın arkasında `kanit` alanı duruyor mu.

### Alıntı kapısı — kısa bakış

`kokenYorum`'un kapısı `kokenAlinti(kanit, kaynakMetinler)`dır
(13y-koken.js:210-214): normalize edilmiş bir birebir alt-dize testi
(`kokenIcerir`, 13y-koken.js:174-179), kısa "kanıt"ları eleyen bir token
tabanı (`ALINTI_MIN_TOKEN = 2`, 13y-koken.js:86) dışında **eşik yoktur**
(13y-koken.js:203-209 — 2026-08-02'de bulanık `>= 0.6` oranından bu kesin
kapıya geçildiği kod yorumunda anlatılıyor). Bu kapının NUMARALI referans
biçimi (`kokenSozBlok` → `kanit_ref` → `kokenAlintiCoz`) ayrı ve daha geniş
bir mekanizmadır — tam akışı `.claude/plans/kesin-alinti-mimarisi.md`da.

### Tek seferlik temizlik

`kokenTemizlik()` (13y-koken.js:349-372) kanıta bağlanamayan ESKİ
kayıtları kullanıcı başına BİR kez siler — geri alınamaz olduğu için üç
koruması var: bir yıllık kanıt penceresi (`TEMIZLIK_GUN = 365`,
13y-koken.js:58), yetersiz havuzda ERTELEME ve bayrağı YAKMAMA
(`TEMIZLIK_MIN_SOZ = 20`, 13y-koken.js:64), ve neyin silindiğinin bayrak
içinde kalıcı sayılması. Üç modüle `window.*` köprüsüyle ulaşır —
`window.ypKokenTemizlik` (09e-yasayan-portre.js:507, window'a bağlanması
09e-yasayan-portre.js:622), `window.omKokenTemizlik`
(09d-oruntu-motoru.js:712, bağlanması 09d-oruntu-motoru.js:1194),
`window.p6KokenTemizlik` (09a-personalization-engine.js:2319, bağlanması
09a-personalization-engine.js:2350).

## Sözleşme (dışa açık yüzey)

Tüm fonksiyonlar dosya sonunda TDZ-güvenli biçimde `window.koken*` olarak
da expose edilir (13y-koken.js:375-388):

| Fonksiyon | Rol |
|---|---|
| `kokenBeyan(deger)` | beyan kökeni kurar |
| `kokenOlc(deger, n, esik?)` | ölçüm kökeni kurar, eşik kapılı |
| `kokenYorum(deger, kanit, kaynakMetinler)` | LLM yorumu kökeni kurar, alıntı kapılı |
| `kokenVar(x)` | `{v,kaynak,n}` kaydı için tek soru |
| `kokenKayitVar(x)` | düz kayıt (kanit alanlı) için tek soru |
| `kokenAlinti(kanit, kaynakMetinler)` | kesin alıntı kapısı (birebir alt-dize) |
| `kokenKirp(s)` | kanıt cümlesini `ALINTI_MAX_LEN=160` karaktere kırpar |
| `kokenIcerir(kaynak, parca)` | normalize edilmiş birebir içerme testi |
| `kokenSozBlok(sozler, opts?)` | numaralı söz bloğu + referans haritası üretir (bkz. kesin-alinti-mimarisi.md) |
| `kokenAlintiCoz(ref, kirpma, harita, sozler)` | referansı gerçek cümleye çözer (bkz. kesin-alinti-mimarisi.md) |
| `kokenKullaniciSozleri(days?)` | kanıt havuzunun düz metin hâli |
| `kokenTemizlik()` | tek seferlik, geri alınamaz temizlik |

`kokenKullaniciMesajlari(days=7)` (13y-koken.js:314-330) export edilir ama
`window.*`'a bağlanmaz — yalnız modül-içi import ile tüketilir (ör.
09d-oruntu-motoru.js:37). Kaynağı: `S.allSessions` (hidre edilmiş geçmiş) +
henüz hidre olmamış olabilecek canlı `S.chatHistory` — dosyanın kendi
yorumu bunun tekilleştirmesini de anlatıyor (13y-koken.js:311-313).

## Kapı — `scripts/gerceklik-denetci.mjs`

Denetçi `js/parts` ve `js/state` altındaki her `.js` dosyasını **avlar** —
bilinen kanıtsız-varsayılan desenlerini bir sözcük listesiyle arar
(gerceklik-denetci.mjs:1-49'daki kendi "kör nokta defteri" bunu açıkça
söylüyor). Altı kural:

| Kural | Ne yakalar | Örnek | Kaynak |
|---|---|---|---|
| K1 | `??`/`\|\|` ile kanıtsız sayısal varsayılan | `x.score ?? 50` | gerceklik-denetci.mjs:86-90 |
| K1b | Ternary ile gizlenmiş varsayılan | `typeof o.score === 'number' ? o.score : 50` | gerceklik-denetci.mjs:92-100 |
| K2 | `js/state/` içinde sabit başlangıç skoru | `{ score: 50 }` | gerceklik-denetci.mjs:125-128 |
| K3 | LLM çıktısından `.kanit` okunuyor ama `kokenAlinti`/`kokenYorum`/`kokenAlintiCoz` kapısı yok | `callLLM` + `j.kanit` kapısız | gerceklik-denetci.mjs:130-139 |
| K4 | Modelin kendi güven sayısı eşiğe vuruluyor (öz-beyan bir ölçüm değildir) | `guven >= 0.6`, `HIPOTEZ_GUVEN_MIN` sabiti | gerceklik-denetci.mjs:141-157 |
| K5 | Atama/parametre varsayılanı (K1'in `=` kardeşi) | `confidence = 1` | gerceklik-denetci.mjs:102-115 |
| K6 | Sayı bir SABİTE saklanarak gizleniyor | `x.score ?? VARSAYILAN_SKOR` | gerceklik-denetci.mjs:117-123 |

K4'ün gerekçesi `PROTOKOL-FABLE.md` §6.10'da doğrudan yazılı: *"Modelin
kendi güven sayısı bir köken değildir ve KAPI OLAMAZ. `guven: 0.75` ne
beyandır ne ölçüm; kalibre edilmemiş bir öz-beyandır — uydurmaya 0.9,
doğruya 0.4 yazabilir."* Denetçinin kendi yorumu bu kuralın üç canlı
örnekten söküldüğünü anlatıyor: 09e kör nokta, 09g hipotez, 09d örüntü
(gerceklik-denetci.mjs:148-151) — repo bu snapshot'ta üçü de temizdir (K4
regex'i şu an bu dosyalarda eşleşmiyor).

Bir sabitin KENDİ tanımı (`const KOKEN_ESIK = 3`) ihlal değildir — ihlal
olan, ölçüm yokken o sabite DÜŞÜLMESİdir (gerceklik-denetci.mjs:117-122,
258-262). Yorum satırları ve i18n/prompt sözlük dosyaları (`js/parts/1[56]…`)
taranmaz (gerceklik-denetci.mjs:159-176, 206) — bir kavramı ANLATAN metin
ihlal sayılmaz.

### Muafiyet

Bilinçli istisna, ihlalin geçtiği satırda ya da altı satırlık bir pencere
içinde (`MUAF_PENCERE = 6`, gerceklik-denetci.mjs:75) şu yorumla beyan
edilir:

```js
/* KOKEN-MUAF: gerekçe (en az 8 karakter) */
```

Gerekçesiz muafiyet denemesi (`/* KOKEN-MUAF: */` boş) kendisi bir ihlaldir
— "MUAF" kuralı (gerceklik-denetci.mjs:83-84, 224-227): *"muafiyetin bedeli
nedenini yazmaktır."* Repoda 11 dosyada, 15 satırda gerekçeli `KOKEN-MUAF`
kullanımı var (`grep -rn "KOKEN-MUAF" js/`); tipik gerekçeler: bir sıfıra bölünme
paydası (13v-ihtiyac-motoru.js:342), bir sayım sentineli (nötr taban,
09b-depth-foundations.js:369, 10q-w2-kisi-karti.js:48), ya da `.kanit`
alanının LLM çıktısı olmadığının açıklanması (13o-geri-cagri.js:27-30,
01-prompts-modes.js:321).

### İkinci kapı — statik denetçinin göremediği

`gerceklik-denetci.mjs`'in kendi başlığı bunu itiraf ediyor
(gerceklik-denetci.mjs:20-48): sözcük listesi dışı kavram adları
(`alliance_strength = 50`), hesaplanmış varsayılanlar
(`Math.round(x*100)`), ve çalışma zamanında doğan değerler statik taramaya
görünmez. Bu yüzden ikinci, DAVRANIŞSAL bir kapı var:
`tests/sifir-kanit-sinavi.test.js` — avlamaz, **çıktıya bakar**. Dört blok
(sifir-kanit-sinavi.test.js:35, 78, 179, 217): state'in kanıtsız sayısal
varsayılan taşımadığını (envanteri koddan türetir, alan adına değil
DEĞERE bakar), boş kullanıcıda prompt yüzeylerinin sessiz kaldığını, UI'da
kanıtsız kullanıcıda kart yakınlığı olmadığını, ve seçicinin (09i) kanıtsız
kullanıcıda boş aday listesi döndürdüğünü sınar. Bu test dosyası kendi
"Ayrıntı" satırında `.claude/plans/koken-kor-noktalar.md`ya işaret ediyor
(sifir-kanit-sinavi.test.js:19) — bu belge de bu snapshot'ta **yok**; bkz.
bu FAZ'ın raporundaki Duraklar maddesi.

### Kapının kendi testi

`tests/gerceklik-kapisi.test.js` denetçiyi `spawnSync` ile ayrı süreçte
koşturur (jsdom bedelini ödemeden, dosya başlığındaki gerekçe:
gerceklik-kapisi.test.js:1-3). İki `describe` bloğu: birincisi
(gerceklik-kapisi.test.js:35-45) repoyu gerçekten 0 ihlalle geçirdiğini
kanıtlar; ikincisi (gerceklik-kapisi.test.js:47-206) denetçiyi `--dizin`
bayrağıyla geçici bir dizine karşı çalıştırıp K1-K6'nın hepsini VE MUAF
mekanizmasını (gerekçeli/gerekçesiz) hem yakaladığını hem yanlış pozitif
üretmediğini sınar — dosyanın kendi cümlesiyle: *"Yakalamayan bir kapı,
kapı değildir."* (gerceklik-kapisi.test.js:16).

## Tüketiciler (örnekler, tam liste değil)

- **`09i-secici.js`** — kart aday sıralaması `kokenOlc(g.deger, g.n)` ile
  başlar; `kanit.v === null` ise aday hiç doğmaz (09i-secici.js:189-190).
  Skor kullanıcıya asla ham sayı olarak gösterilmez — yorum bunu açıkça
  yazıyor (09i-secici.js:180-183).
- **`13z-imge-kapisi.js`** — aktif "imge" kaydı `kokenBeyan` ile sarılır
  (13z-imge-kapisi.js:137, 438); beyan doğrulanmaz, kullanıcının kendi
  seçimidir.
- **`09a-personalization-engine.js`** — `p6UpsertFact`'in `n` parametresi
  eskiden `confidence` adını taşıyordu ve bu bir AD GÖÇÜYDÜ
  (09a-personalization-engine.js:1416-1418): *"Eski adı `confidence`'tı ve
  o ad yalan söylüyordu — bir güven değil, bir sayaçtır."*
- **`13D-duygu-motoru.js`** — `dgYanilmaOran` (13D-duygu-motoru.js:1224) ve
  isabet ölçümü (13D-duygu-motoru.js:1084) `kokenOlc`'u doğrudan tüketir;
  konuşma sayısı eşiğin altındaysa Gözlemevi paneli sayı göstermez.
- **`10-features-w2.js:475`** — temel skoru `kokenOlc(o?.score,
  o?.signals_count || 0, TEMEL_MIN_SINYAL)` ile okur.

## İlgili ama bu belgenin kapsamı dışında — "teslim eden basar" (K13)

Protokolün §6.10'unda geçen *"Kotayı harcayan ya da 'gösterildi' diyen
damgayı üretici basmaz, teslim eden basar — teslim edilmeyen söz verilmiş
sayılmaz"* cümlesinin karşılığı koddadır ama **13y-koken.js'in bir
parçası değildir** — her tüketici kendi "teslim" anını kendi damgalar.
Örnekler: `13D-duygu-motoru.js:1149-1155` (`dgYanilmaKonustu` yalnız okuma
GERÇEKTEN yüzeye çıktığında çağrılır, `dgKapi`'nin okuma döndürmesi
yetmez); `02d-esik-ekrani.js:299`, `13h-aksam-toreni.js:324`,
`10s-w2-gunluk-ritus.js:625` aynı `K13` etiketiyle işaretli. Bu, gerçeklik
kuralının bir UZANTISI — kendi motoru ve kapısı yok, bu yüzden ayrı bir
belge yerine burada not düşülüyor.
