# Köken Kör Noktaları — "avlayan kapı ile bakan kapı arasındaki boşluk"

> **Bu belge hakkında.** `tests/sifir-kanit-sinavi.test.js` kendi başlığında
> (satır 19) "Ayrıntı: `.claude/plans/koken-kor-noktalar.md`" diye bu dosyaya
> işaret ediyordu ama orijinali bu repo snapshot'ında yoktu — `git log --all
> -- .claude/plans/` bu adı hiç döndürmüyor, repo'nun ilk commit'inden beri
> yok. Belge 2026-09-02'de kodun **o günkü hâlinden** yeniden çıkarıldı:
> `scripts/gerceklik-denetci.mjs`, `tests/sifir-kanit-sinavi.test.js`,
> `tests/13y-koken.test.js` okunarak. `.claude/plans/gerceklik-mimarisi.md`
> zaten "İkinci kapı — statik denetçinin göremediği" başlığıyla bu boşluğa
> kısa bir not düşmüştü; bu belge o notu TEKRARLAMAZ, koda inip
> **derinleştirir** — hangi kör noktanın hangi katmanla, ne ölçüde kapandığını
> ve hâlâ AÇIK kalanı satır satır gösterir. Kararların tarihçesini değil,
> bugün diskte duran mekanizmayı anlatır; kod yorumlarındaki tarihler
> (ör. 2026-08-01, 2026-08-02) koddan alıntıdır, bu belgenin kendi iddiası
> değildir.

## Merkez kavram — üç katman, üç farklı soru

`PROTOKOL-FABLE.md` §6.10'un gerçeklik kuralı tek bir kapıyla değil, ÜÇ
katmanla korunuyor ve her katman farklı bir soru soruyor:

| Katman | Dosya | Soru | Yöntem |
|---|---|---|---|
| 1. Statik denetçi | `scripts/gerceklik-denetci.mjs` | "Bu SATIR kanıtsız bir varsayılana mı düşüyor?" | desen eşleştirme (regex), kod hiç ÇALIŞTIRILMAZ |
| 2. Motor birim testi | `tests/13y-koken.test.js` | "`kokenOlc`/`kokenBeyan`/`kokenYorum`'un KENDİ sözleşmesi doğru mu?" | motoru doğrudan çağırır, kavram adından bağımsız |
| 3. Davranışsal kapı | `tests/sifir-kanit-sinavi.test.js` | "Sıfır kanıtlı bir kullanıcıda uygulama GERÇEKTEN susuyor mu?" | uygulamayı gerçekten çalıştırır, ÇIKTIYA bakar |

Üçü de gerekli, hiçbiri tek başına yeterli değil. 1. katman ucuzdur (dosyayı
okur, çalıştırmaz) ama körlüğü **listeden** gelir. 2. katman motorun kendi
iç mantığını (eşik, tip kontrolü, null dönüşü) doğrular ama motoru YANLIŞ
KULLANAN bir tüketiciyi göremez. 3. katman gerçek çalışma zamanı davranışını
sınar ama yalnız KENDİ envanterindeki yüzeyleri görür — envanterin dışında
kalan bir yüzey ona hiç görünmez.

## Katman 1 — statik denetçinin göremediği (kör nokta defteri, derinleştirilmiş)

`gerceklik-denetci.mjs`'in kendi başlığı (satır 20-48) üç kör nokta
tanımlıyor; her biri burada koda inilerek somutlaştırılıyor.

### 1a. Sözcük listesi dışı kavram adları

K1/K1b/K5/K6'nın hepsi **aynı sabit sözcük havuzuna** bağlı:
`score|guven|güven|skor|puan|level|seviye|confidence` (gerceklik-denetci.mjs
satır 90, 100, 115, 123 — dört kural dört ayrı regex ama hepsi bu havuzdan
türüyor). Kavramın adı bu listede yoksa dört kural da SESSİZDİR — desen
eşleşmediği için ihlal hiç ihlal olarak görünmez.

Denetçinin kendi yorumu iki canlı örnek veriyor (satır 31-33):
`alliance_strength = 50` ve `mood = 'parcali'` — ikisi de kanıtsız bir
varsayılandı, ikisini de dört kural değil DAVRANIŞSAL kapı buldu (dosyanın
kendi cümlesi: "ikisini de davranışsal kapı buldu"). `alliance` sözcük
havuzunda hiç yok. K5'in kendi yorumu (satır 108-110) benzer bir örnekle
`\b` kelime sınırının neden yeterli olmadığını anlatıyor:
`optimal_challenge_level`'daki `level` kelimesi `\blevel\b` ile
eşleşmiyordu çünkü önündeki `_` bir kelime karakteridir — K5 bu yüzden
kelime sınırını gevşetip kavramı ADIN İÇİNDE de aramaya başladı, ama bu
yalnız `level`/`score` gibi HAVUZDAKİ kavramları içeren bileşik adları
düzeltti; sözlük dışı YENİ bir kavram adı (`itimat`, `dayaniklilik`,
`netlik_puani`…) yine görünmez kalır.

### 1b. Hesaplanmış varsayılanlar

`Math.round(x * 100)`, `(a + b) / 2`, `dizi.length / toplam` gibi bir
ifade K1-K6'nın HİÇBİRİNE görünmez, çünkü altı kuralın hepsi sabit bir
SAYI LİTERALİ arıyor (`\d+(?:\.\d+)?`) — `??`/`||`/`?:`/`=` işaretinin sağ
tarafında bir HESAPLAMA varsa regex orada durur, sayı yoktur. Bu, K1-K6'nın
kör noktası değil TASARIMIDIR: sabit bir sayıyı yakalamak için yazılmışlar,
bir ifadenin kanıtsız olup olmadığını anlamak statik analizin sınırının
dışındadır (ifadenin girdileri kanıtlı mı değil mi, çalışma zamanında
belli olur).

### 1c. Çalışma zamanında doğan değerler

`getElementById('…').textContent || '0'` (DOM'dan okunan bir sayı),
`Date.now() / 86400000 % n` (takvimden türetilen bir "durum") gibi
ifadeler statik taramada MASUM görünür — DOM'da ne olduğunu, `Date.now()`
o an ne döndüreceğini denetçi bilemez. Kanıtsızlıkları ancak KOŞARKEN
belli olur; bu tam olarak 1b ile aynı sınırın bir başka yüzüdür.

## Katman 2 — motor birim testi neyi kapatıyor (`tests/13y-koken.test.js`)

Bu katman 1a-1c'nin hiçbirini DOĞRUDAN kapatmaz — kavram adından, hesaplama
biçiminden ya da çalışma zamanı kaynağından tamamen BAĞIMSIZDIR, çünkü
sözcük aramaz, motorun kendi fonksiyonlarını doğrudan çağırır:

- `kokenOlc(72, 2)` → `.v === null` (satır 20) ve `kokenOlc(72,
  KOKEN_ESIK)` → `.v === 72` (satır 27): eşik sınırının TAM üstünde ve
  ALTINDA iki nokta da sınanıyor — `sifir-kanit-sinavi.test.js` bunu
  sınamaz, o yalnız `n=0`'ı (sıfır kanıt) sınar, `n=1`/`n=2` (eşiğin altında
  ama sıfır değil) davranışını sınayan TEK katman budur.
- `kokenOlc(NaN, 5)` / `kokenOlc(null, 5)` / `kokenOlc('72', 5)` → hepsi
  `kaynak: 'yok'` (satır 38-40): tip kontrolü — sayı olmayan bir "ölçüm"
  kanıt sayısı yeterli olsa bile reddediliyor.
- `kokenVar(kokenOlc(50, 0))` → `false` (satır 69): motorun iki tüketici
  sorusundan biri (`kokenVar`) doğrudan sınanıyor.

Bu katmanın kendi sınırı: motorun API'sinin DOĞRU KULLANILDIĞINI değil,
motorun KENDİSİNİN doğru olduğunu kanıtlar. Bir tüketici `kokenOlc`'u hiç
çağırmadan kendi `n < 3 ? null : deger` mantığını elle yazarsa (yani
motoru atlayıp kuralı yeniden icat ederse) bu katman onu göremez — çünkü
test motoru çağırıyor, tüketiciyi değil.

## Katman 3 — davranışsal kapının dört bloğu, dört farklı biçim

`tests/sifir-kanit-sinavi.test.js` avlamaz, **envanteri koddan türetip
çıktıya bakar** (kendi başlığı, satır 15-17). Dört blok dört AYRI kör
nokta sınıfını kapatır:

**BLOK 1 (satır 35-73, `describe` satır 61) — state'in sayısal
varsayılanları.** `S`'i DERİNLEMESİNE gezer (`sayisalVarsayilanlar`, satır
50-59) ve **ALAN ADINA DEĞİL DEĞERE** bakar: `typeof v === 'number' && v
!== 0` olan HER alanı toplar, kavramın adı `score` mu `alliance_strength`
mi hiç sormaz. Bu, 1a'nın (sözcük listesi dışı kavram adları) TAM
KARŞILIĞIdır — ama yalnız `state.js` içinde İLK KEZ tanımlanan (import
anındaki) şekil için; state'e sonradan, çalışma zamanında yazılan bir değer
bu bloğun kapsamı DIŞINDADIR (aşağıdaki "hâlâ açık" bölümüne bakın).

**BLOK 2 (satır 78-176, `describe` satır 112) — prompt yüzeylerinin
sessizliği.** Envanter `export\s+(?:async\s+)?function\s+(\w*(?:Context|
Ozet)\w*)\s*\(` regex'iyle (satır 83) `js/parts/*.js`'teki HER
`*Context`/`*Ozet` fonksiyonunu bulur — elle yazılmış bir liste değil, bu
yüzden yeni bir modül eklendiğinde otomatik denetlenir (dosyanın kendi
yorumu, satır 79-80: "elle yazılan bir liste, eklenmesi unutulan modülü
hiç görmez ve 'bilinmeyen bilinmeyen' tam orada yaşar" — bu satır
elle-liste riskini tarif ediyor, ENVANTER'in kendisi bu riski ortadan
kaldırıyor). `S.currentUser = null` iken her fonksiyon `f('')` ile
çağrılır; boş olmayan bir string dönerse ve `PROMPT_MUAF`'ta değilse ihlal.
Bu, 1c'nin (çalışma zamanında doğan değer) bir alt kümesini kapatır: değer
DOM'dan ya da takvimden gelsin, PROMPT ÇIKTISINA sızdığı an bu blok onu
görür — kaynağı denetçiye önemli değildir, çıktıya bakar.

**BLOK 3 (satır 179-215) — UI kart yakınlığı.** `kkMatchCard(kart, {})`
gerçek destede (`getFullDeck()`, 12 kart) çağrılır; `hazirlik > 0` ya da
`earned === true` çıkan HERHANGİ bir kart ihlaldir. Bu da 1b/1c'nin
(hesaplanmış / çalışma zamanı) UI YÜZEYİNE sızan hâlini kapatır — kartın
hazırlık hesabı `Math.round`/oran gibi bir ifade barındırsa bile, boş
girdiyle sonuç sıfır olmak ZORUNDADIR; test ifadenin BİÇİMİNE değil
SONUCUNA bakar.

**BLOK 4 (satır 217-241) — seçici (09i) aday listesi.** `secAday('kart',
'x', {})` → `null`, kanıtsız üç adaydan kurulu bir liste `secSirala` ile
→ `[]`. Seçici bir "yüzey" değil bir SIRALAYICI olduğu için ayrı bir blok
gerekti — konuşan bir metin üretmez, ADAY DOĞURUR ya da doğurmaz; BLOK 2/3
onu göremezdi çünkü ne prompt string'i ne kart nesnesi döndürüyor.

## Üç katmanın birlikte kapattığı ve hâlâ AÇIK kalan

Kapanan: 1a tamamen (BLOK 1, state için) + kısmen (BLOK 2/3/4, çıktıya
sızdığı ölçüde); 1b/1c tamamen ama YALNIZ dört test edilen yüzey sınıfına
(state şekli, `*Context`/`*Ozet`, kart yakınlığı, seçici) sızdıkları
zaman; eşik sınırı (`n` eşiğin altında/üstünde) Katman 2'de.

Hâlâ AÇIK — dürüstçe, `gerceklik-denetci.mjs`'in kendi üslubuyla ("bilinen
bir kör nokta, bilinmeyenden daha az tehlikelidir"):

1. **Çalışma zamanında `S`'e sonradan yazılan kanıtsız değer.** BLOK 1
   `S`'i YALNIZ `import`'tan hemen sonraki hâliyle gezer (satır 63:
   `await import('../js/state.js')`) — kullanıcı etkileşimini SİMÜLE
   ETMEZ. Bir modül `S.foo = hesapla() ?? 50` gibi bir atamayı çalışma
   zamanında (ör. bir olay dinleyicisinde) yaparsa, bu değer BLOK 1'in
   gördüğü an'dan SONRA state'e girer ve hiçbir katman onu görmez —
   ne K5 (kavram sözlük dışıysa), ne BLOK 1 (zamanlama dışıysa).
2. **`*Context`/`*Ozet` dışında adlandırılmış YENİ bir prompt/UI yüzeyi.**
   BLOK 2'nin envanteri bir AD KALIBINA bağlıdır. Bu kalıbın dışında
   adlandırılmış bir fonksiyon (`export function personaAcikla(...)` gibi)
   hiç envantere girmez — "koddan en az 40 yüzey türetir" sınavı (satır
   141-143) yalnız SAYI düşerse alarm verir, tek bir farklı-adlandırılmış
   yeni yüzeyin envantere hiç girmemesini YAKALAMAZ.
3. **K3'ün kendi deseni: `.kanit` erişimi yerine destructuring.**
   `K3_KANIT_RE = /\.kanit\b/` (gerceklik-denetci.mjs) yalnız NOKTA
   erişimini arar. `const { kanit } = llmYaniti` biçiminde bir
   destructuring, `.kanit` alt-dizesini HİÇ üretmez — desen kaçırır.
   Bu satırı yazan hiçbir modül şu an repoda YOK (`grep -rn "{ *kanit
   *}\s*="` js/parts boş döner, 2026-09-02) — yani bu BİLİNEN ama
   ŞU AN CANLI OLMAYAN bir kör noktadır; K1b'nin ternary'si gibi ileride
   elle bulunup kurala dönüşebilir.
4. **Prompt/UI dışı çıktı yüzeyleri** — analytics/log/console'a giden bir
   kanıtsız sayı, ya da `js/parts/1[56]…` sözlük dosyalarındaki SABİT bir
   metin içine gömülü kanıtsız bir istatistik (`"Kullanıcıların %80'i…"`
   gibi bir microcopy) hiçbir katmanın kapsamında değil — üçü de kod
   YOLUNU sınar, sabit metnin içeriğini değil. Bu, gerçeklik kuralının
   değil §2'nin (yazım sesi, "sayaç dili yasak") alanıdır.

## Kapının bağlantısı

`tests/sifir-kanit-sinavi.test.js` ve `tests/13y-koken.test.js` sıradan
`*.test.js` dosyaları oldukları için `npx vitest run`'a otomatik girerler;
ayrı bir `tests/*-kapisi.test.js` sarmalayıcıları YOKTUR (kardeşleri
`gerceklik-kapisi.test.js`'in aksine, statik denetçiyi `spawnSync` ile
ayrı süreçte koşturmazlar — doğrudan `import()` ile motoru ve state'i
çağırırlar). `build.sh` bu iki dosyayı ÇAĞIRMAZ (`grep -n "sifir-kanit\|
13y-koken" build.sh` boş döner, 2026-09-02) — kapı `./build.sh` değil
`npx vitest run` katmanındadır; §3.3'ün "hedefli süit" ölçüsü
`js/state.js`, `js/parts/13y-koken.js` ya da `js/parts/09i-secici.js`
değiştiğinde bu iki test dosyasını da hedefe alır.

İlgili: `.claude/plans/gerceklik-mimarisi.md` (K1-K6 tam tablosu, kapı
mekaniği) · `.claude/plans/kesin-alinti-mimarisi.md` (alıntı çözüm zinciri,
BLOK 4'ün seçicisinin bir üst katmanı) · `js/parts/13y-koken.js` (tek
motor).
