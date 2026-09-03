# Opus Öz-Denetimi — "dikiş turu işin içine bakar; bu tur işin kendisine"

## Bağlam

§3.5'in kapanış listesi bugün tek bir denetim turu tanıyor ve o turun adı iki
şeye birden takılı: metin ona hem **"öz-denetim turu"** hem **"dikiş turu"**
diyor. Kapsamı da tek: `git diff`. Yani sorduğu soru şudur — *bu turda yazılan
şey kendi içinde tutarlı mı?* Bu soruyu geçen bir sprint yine de **yanlış şeyi**
inşa etmiş olabilir: plan bir madde vaat eder, hiçbir faz onu yapmaz, hiçbir
test onu bilmez, diff'te de bir eksiklik görünmez — çünkü eksik olan şey
diff'te yoktur.

Emre bu boşluğu adlandırdı (2026-09-03): *"Öz-denetim, dikiş turundan bağımsız
olarak Opus olarak tüm yapılanları plana ve koda ve vizyonumuza göre
denetlediğin ve sorunları çözüp geliştirmeleri yapıp süreci en iyilediğin bir
süreçtir."*

### Onaylanan kararlar

1. Tur **dikiş turundan bağımsızdır** — onun yerine geçmez, ondan sonra gelir.
2. Ölçüsü **üç referanstır**: plan, kod, vizyon.
3. Turu **Opus** koşar; çapraz model denetimi (§3.3) fazın kapısıdır, bu turun
   yerine geçmez.
4. Tur **bulup bırakmaz**: düzeltir, ya da plana taşır, ya da gerekçeyle
   reddeder — üçünden biri, yazılı.
5. Bulunan kırık bir **kural boşluğuysa** düzeltme koda değil protokole yazılır
   — "süreci en iyileme" turun dördüncü eksenidir.

### Merkez kavram

Dikiş turu **yatay** bakar: fazların birbirine bindiği yere. Opus öz-denetimi
**dikey** bakar: sözden koda. Vaat (plan) → uygulama (kod) → anlam (vizyon)
zincirinde kopan halkayı arar. Bu zincirin kopması testle görünmez, çünkü test
yalnız yazılmış olanı ölçer — yazılmamış olanı değil.

## Ana Tasarım Kararları

### K1 — Numaralandırma dokunulmaz; tur ayrı bir bölümdür (§3.7)
§3.5'in maddeleri repoda yedi yerden **numarasıyla** anılıyor (`§3.5 madde 1`,
`§3.5 madde 2`, `§3.5/2`, `§3.5/6` — `PROTOKOL-FABLE.md:647,963,1037,1038`,
`CLAUDE.md:48`, `.claude/plans/kapi-saglamlastirma.md:282`,
`.claude/memories/kapi-cifte-kosu.md:44`). Listeye madde eklemek hepsini
kaydırır ve ikisi (plan + hafıza) geçmişin fotoğrafıdır — geriye dönük
düzeltilmez (§7). Tur bu yüzden **yeni bir bölüm** olarak yazılır (§3.7) ve
§3.5'e yalnız bir **sıra işareti** düşülür: dikiş turundan sonra, tam süitten
önce.

### K2 — Kapı plan dosyasındadır, transkriptte değil
§4.4'ün devir kuralı yirmi dokuz günde öldü çünkü kimse ölçmedi; nabzı
transkript sayarak ölçmek de yanlış saydı (§10.5). Bu turun kapısı ölçülebilir
ve ortamdan bağımsız bir yerde durur: **kapanmış bir plan dosyası öz-denetim
kaydı taşımak zorundadır.** Kayıt yoksa tur ya koşulmamıştır ya da
raporlanmamıştır — ikisi de aynı sonucu verir (§6.2).

### K3 — TABAN mevcut borcu tolere eder, büyümeyi yasaklar
Emsal `tests/referans-butunlugu.test.js` ve `scripts/xss-taban.json`. Repoda
bugün kapanmış üç plan var ve hiçbiri bu kaydı taşımıyor — kural bugün
doğdu, geriye dönük ihlal üretmesi dürüst olmaz. TABAN o üçünü adıyla
listeler; **listede olmayan her yeni kapanış** kaydı zorunlu kılar. Küçülmek
serbesttir: TABAN'daki bir planın kaydı sonradan yazılırsa test kırılmaz.

### K4 — Boş bulgu listesi bir sonuç değildir
[[kapi-sessiz-gec]]'in dersi bu tura birebir uyar: *bulgu yok + tarama sağlam*
ile *bulgu yok + tarama bozuk* ayrı iki hâldir. Rapor "temiz" diyecekse hangi
eksende neye bakıldığını yazar; bakılmadıysa "bakılmadı" der. Kapının kendisi
de bu üçüncü hâli sınar — hiç plan dosyası göremeyen bir tarama yeşil değil,
kırmızı kapanır.

## Fazlar (her biri bağımsız ship edilebilir)

### FAZ 1 — §3.7 metni · 🅞 · ~1 oturum
Devir: 🅞 — turun kaç ekseni olacağı, dikiş turundan hangi cümleyle ayrıldığı,
"temiz" demenin kanıt eşiği ve çapraz-model kuralıyla (§3.3) çelişmeden nasıl
durduğu plandan okunamaz; protokolün kendi sesinde, ürüne bakarak yazılır.
**Değişen:** `PROTOKOL-FABLE.md` — §3.5'e sıra işareti + yeni §3.7 bölümü

### FAZ 2 — Bağlama · 🅢 · ~1 oturum
FAZ 1'in metni yazıldıktan sonra türev iş; yargı gerektirmez.
**Değişen:** `CLAUDE.md` (yedek çekirdek maddesi) · `PROTOKOL-FABLE.md`
(§4.2 plan şablonuna `## Kapanış` maddesi, §4.4 ve §8'e çapraz atıf,
§9 "Sprint kapanışı" kontrol listesi satırı, §3.5/§3.7'ye adlandırma
ayrımı) · `.claude/plans/README.md` (envanter satırı)

**FAZ 1 denetiminin B1 bulgusu bu faza düştü.** "Öz-denetim" kelimesi
protokolde artık iki tura birden işaret ediyor: §3.5 madde 1 (dikiş —
**çapraz model**, zorunlu) ve §3.7 (Opus turu — **tek model**, hüküm
Opus'ta). Dört eski geçiş (§4.4 içinde iki, §3.5 madde 4, §9 sprint
kapanışı) dokunulmadan kaldı ve bağlamsız okunduğunda yanlış tura
bağlanabiliyor. **Karar (parent'ın yargısı, ajan uygulayacak):** dört
geçiş tek tek düzeltilmeyecek — bir *okuma kuralı* yazılacak. §3.5
madde 1'in etiketi `**Öz-denetim turu — dikiş:**` olur ve §3.7'ye tek
cümlelik bir **Adlandırma** notu girer: bağlamsız her "öz-denetim"
§3.5 madde 1'dir; §3.7 daima tam adıyla ("Opus öz-denetimi") anılır.
Gerekçe: dört yere not serpmek gürültüdür, ad göçü (§4.3) ise bu
sprintte planlanmadı — kelime aynı kalıyor, yalnız hangi turun
kastedildiği tek yerden okunuyor.

### FAZ 3 — Kapı · 🅢 · ~1 oturum
K2/K3/K4'ün testi; kalıp `tests/referans-butunlugu.test.js`.
**Yeni:** `tests/oz-denetim-kapisi.test.js`

### FAZ 4 — İlk koşu · 🅞 · ~1 oturum
Devir: 🅞 — bulguların hangisinin düzeltilip hangisinin plana taşınacağı ve
vizyon ekseninin bu sprintte ne söylediği yargıdır; ajana verilemez.
Yeni tur kendi sprintine uygulanır: dört eksen koşulur, bulgular bu plana
`## Opus öz-denetimi` başlığıyla yazılır, düzeltmeler ağaca girer.
**Değişen:** bu plan dosyası + bulguların dokunduğu dosyalar

## State / Veri

Uygulama state'i **değişmiyor** — bu sprint tek bir `js/` dosyasına dokunmaz.
Kapının okuduğu veri: `.claude/plans/*.md` metinleri + testin içindeki `TABAN`
listesi. Yeni storage anahtarı, yeni `window.*` adı, yeni DOM id'si yok.

**Tuzak:** `PROTOKOL-FABLE.md` ve `CLAUDE.md` `tests/referans-butunlugu.test.js`
taramasının içindedir — metne yazılan her `[[ad]]` bağı `.claude/memories/`
altında gerçekten var olmalıdır, yoksa süit kırılır.

## Ton Rehberi

Ürün microcopy'si üretilmiyor; bu sprintin "tonu" protokolün kendi sesidir
(§2): em-dash ile "ne + neden", ölçülmüş gerekçe, tarihli karar kaydı, süssüz
Türkçe. Yeni kural bir **temenni cümlesiyle** yazılmaz — her maddesi ya bir
eyleme ya bir kapıya bağlanır. Yasak kalıp: *"gerektiğinde gözden geçirilir."*

## Riskler / Dikkat

1. **Tören riski.** Dördüncü bir denetim turu, kapısı olmazsa raporun bir
   başlığına döner. K2 bu yüzden var; FAZ 3 pazarlıksızdır.
2. **Çapraz model kuralıyla çelişme.** §3.3 "yazan denetlemez" der; bu tur
   Opus'un kendi işine de bakar. FAZ 1 metni bu farkı açıkça yazmalı: faz
   denetimi **diff'in** kapısıdır ve karşı modeldedir; bu tur **bütünün**
   yargısıdır ve onun yerine geçmez — geçerse kör nokta tekrar tekleşir.
3. **Numara kayması.** K1'in yedi referansı: liste maddesi eklenirse hepsi
   yanlışlanır. §3.5'in numaraları bu sprintte DEĞİŞMEZ.
4. **Kapının kör noktası.** Gate yalnız *kapanış işareti taşıyan* planı görür;
   işaretsiz kapanan bir plan sessizce geçer. Sınır testin başlığında yazılı
   olacak, gizlenmeyecek ([[kapi-sessiz-gec]]).
5. **Kaynak kod değişmiyor.** `js/`, `css/`, `_src.html` bu sprintte
   dokunulmaz; §3.3'ün "kapının ölçüsü işin yüzeyine göredir" maddesi gereği
   tarayıcı kapısı `git diff --stat` kanıtıyla **gerekçeli** geçilir — build
   yine alınır, yeni kapı testi ve referans bütünlüğü testi yine koşar.

## Doğrulama (her faz sonunda)

1. `./build.sh 2>&1 | tail -20` yeşil — `index.html` üretimi doğrulanır.
2. `npx vitest run tests/referans-butunlugu.test.js` yeşil — protokole yazılan
   her `[[bağ]]` ve `.claude/plans/<slug>.md` yolu hedefini bulur.
3. FAZ 3'ten sonra `npx vitest run tests/oz-denetim-kapisi.test.js` yeşil —
   ve kapının self-test bloğu ihlali gerçekten yakalar.
4. Sözleşme regresyonu: bu sprint `window.*` yüzeyine dokunmaz —
   `git diff --name-only | grep -c '^js/'` çıktısı **0** olmalı.
5. Sprint kapanışında tam süit (`npx vitest run`) — koşulan ağaç commit'lenen
   ağaç olacak (§3.5 madde 2).

## Kritik Dosyalar

- **YENİ:** `tests/oz-denetim-kapisi.test.js`
- **Yerinde evrim:** `PROTOKOL-FABLE.md` (§3.5 sıra işareti, §3.7 yeni bölüm,
  §4.2/§4.4/§8/§9 bağları) · `CLAUDE.md` (yedek çekirdek)
- **Yeniden kullanılan:** TABAN kalıbı (`tests/referans-butunlugu.test.js`,
  `scripts/xss-taban.json`) · kapı self-test kalıbı (`tests/bagsiz-ad-kapisi.test.js`
  "sessizce geçmez" sınavı) · `## Kapanış` + "Plandan sapmalar" kaydı
  (`.claude/plans/denetim-onarimi.md:95`) — dürüstlük kaydının emsali

## Durum

- **FAZ 1** · ✅ uygulandı (Opus), **denetlendi** (`denetci`, Sonnet — çapraz
  model, §3.3). Commit `ea364de`. Kapı: build ✅ · `referans-butunlugu` 6/6 ✅ ·
  `dogrula.mjs` ✅ "Konsol temiz." (exit 0). İki bulgu döndü:
  - **B1 — terminoloji çakışması (orta).** "Öz-denetim" iki tura birden
    işaret ediyor. → **FAZ 2'ye düştü**, karar yukarıda yazılı.
  - **B2 — ileri-referans (düşük).** §3.7 şu an var olmayan iki şeyi
    (`§4.2 madde 11`, `tests/oz-denetim-kapisi.test.js`) şimdiki zamanda
    anlatıyor. Sprint FAZ 3'ten önce kesilirse §6.2 ihlali kalıntısı olur.
    → **Kapatma yolu ileriye**: FAZ 2 ve FAZ 3 aynı turda koşulur, geri alma
    yok. Risk kabul edildi ve kayda geçti.

- **FAZ 2** · ✅ devredildi (`uygulayici`/Sonnet), denetlendi (parent/Opus).
  Commit `c9368d8`. Üç bulgu, üçü de o turda düzeltildi; iki Durak'tan biri
  düzeltildi, biri gerekçeyle reddedildi.
- **FAZ 3** · ✅ devredildi (`uygulayici`/Sonnet), denetlendi (parent/Opus).
  Commit `3d70409`. Ajan plan-dışı bir kırık BULDU (Türkçe büyük I); dört
  denetim bulgusu düzeltildi ve yeni sınavlar mutasyon testiyle kanıtlandı.
- **FAZ 4** · ✅ Opus öz-denetimi koşuldu; kaydı aşağıda.

Dört fazın dördü de kapandı; **İlk hamle** satırı düştü.

## Hafıza bağları

[[kapi-sessiz-gec]] (K4 — boş sonuç temiz sonuç değildir) ·
[[rapor-bayatligi]] (plan ekseninin kendisi: söylenen ile ağacın gösterdiği) ·
[[kapi-cifte-kosu]] ("koşulan ağaç, commit'lenen ağaç") ·
[[claude-altyapisi-commit-disi]] (uzak oturumda `.claude/` commit edilmezse yok) ·
[[olu-kod-temizlikleri]] (kod ekseninde KORUNANLAR listesi)

---

## Kapanış — 2026-09-03

Dört faz uygulandı. Commit zinciri: `ea364de` (FAZ 1) · `10ccbb7` (FAZ 1
denetimi) · `c9368d8` (FAZ 2) · `3d70409` (FAZ 3) + bu turun kapanışı.

**Devir kaydı (§4.4).** İki 🅢 faz (2 ve 3) `uygulayici` ajanına ayrı ayrı
devredildi — farklı dosya kümelerine dokundukları için birleştirilmedi. İki
🅞 faz (1 ve 4) Opus'ta kaldı. Faz denetimleri çapraz modelde: FAZ 1'i
`denetci` (Sonnet) denetledi, FAZ 2 ve 3'ü parent (Opus). Oran kapısı:
🅞 2 · 🅢 2 — geçti.

**Plandan sapmalar — dürüstlük kaydı:**

1. **FAZ 2'nin kapsamı büyüdü.** FAZ 1'in denetim bulgusu B1 (terminoloji
   çakışması) plana yazılıp o faza eklendi. Sapma değil, kuralın işlemesi —
   ama planda yazılı olmadan girdi, o yüzden burada.
2. **FAZ 3'ün kapısı plandan geniş çıktı.** Plan üç şey istiyordu (TABAN,
   H2 ayrımı, körlük sınavı); kapı beş şey öğrendi. İkisi plan dışı: Türkçe
   büyük I tespiti (ajanın keşfi) ve kod bloğu farkındalığı (denetimin
   bulgusu). İkisi de sahte-yeşil yolu kapatıyor, yani kapsam büyümesi
   kapının lehine.
3. **`_src.html`e dokunulmadı.** Plan Doğrulama madde 4'ün vaadi ölçüldü:
   `git diff --name-only 624bb03..HEAD | grep -E '^(js/|css/|_src)'` → **0**.

**Faz denetimlerinin hasadı (bu turun ürünü DEĞİL).** Dört fazın faz
denetimleri — ikisi çapraz modelde (`denetci`/Sonnet), ikisi parent'ta —
toplam **on üç** kırık buldu ve on üçü de kendi turlarında kapandı: FAZ 1'de
iki (terminoloji çakışması, ileri-referans → `10ccbb7`/`c9368d8`), FAZ 2'de
üç (§4.2 madde 11'in ters gerekçesi, register kayması, 91 karakterlik satır →
`c9368d8`), FAZ 3'te dört (yorum sayı hatası, kod bloğu körlüğünün iki yönü,
sınanmamış TABAN semantiği → `3d70409`), FAZ 4'te dört (kaydın kendi verim
şişmesi, hafıza dosyasının biçimi, yönteme bağlı sunulan rakam, yanlış Durak
sayısı). Ayrıca FAZ 2 ajanının iki Durak'ından biri
düzeltildi, biri gerekçeyle reddedildi (`README.md` envanteri alfabetik
değil — liste zaten alfabetik değildi).

Bunlar §3.7 kaydının **dışındadır** ve bilerek öyle: kayıt, Opus turunun
kendi çıktısıdır. İlk yazımında dokuzu da kayda doldurulmuştu ve turun
verimini 3'ten 12'ye şişiriyordu — çapraz denetim (Sonnet) bunu bulgu olarak
döndürdü, kayıt daraltıldı. Kuralın kendisi de bu yüzden netleşti (§3.7'ye
tek cümle eklendi).

**Sıra hatası — dürüstlük kaydı.** FAZ 4, kendi çapraz-model denetimi
dönmeden commit edildi (`ecb8774`); §4.4 "denetim geçtiğinde biter" der.
Denetimin bulguları bu yüzden ayrı bir commit'te kapandı ve tam süit
yeniden koşuldu. Sebebi (Stop kancasının commit baskısı) bir gerekçe değil,
yalnız sebep — kayda geçti.

**Bekleyen ELLE iş:** yok. Bu sprint Supabase'e, deploy'a ya da mağazaya
dokunmadı.

## Opus öz-denetimi — 2026-09-03

**Plana karşı.** Dört fazın `Yeni:`/`Değişen:` listeleri ağaca karşı okundu;
hepsi teslim edildi, sessizce düşen madde yok. `## Doğrulama`nın beş
maddesinden dördü faz kapılarında koşuldu, beşincisi (tam süit) kapanışta.
`## Riskler`in beşi de tutuldu — özellikle Risk 3 (numara kayması):
`§3.5` maddeleri 1/2/3/6 hâlâ yerinde, `grep` ile doğrulandı. Açık `##
Duraklar` maddesi kalmadı: FAZ 2 ajanı iki Durak bildirdi (biri düzeltildi,
biri gerekçeyle reddedildi), FAZ 3 ajanı "yok" dedi.

**Koda karşı.** Kaynak kod hiç değişmedi (ölçüm: 0 satır), yani sözleşme
regresyonu imkânsız. Yeni kapı reponun TABAN + self-test kalıbını izliyor.
**Bu eksenin asıl bulgusu buydu:** kapının `trKucult()` fonksiyonu, reponun
zaten yirmiden fazla yerde kullandığı `toLocaleLowerCase('tr')` deyiminin
elle yazılmış ikiziydi (§1.3 ihlali). Faz denetimi bunu göremezdi — çünkü
faz denetimi **diff'e** bakar, diff'te ikiz yoktur; ikiz ancak repo genelinde
aranınca görünür. §3.7'nin varlık gerekçesi ilk koşusunda kendini kanıtladı.

**Vizyona karşı.** Bu sprint kullanıcıya görünen hiçbir şey üretmedi ve
üretmemesi gerekiyordu — ürettiği şey, ürünün teze bağlı kalıp kalmadığını
soran turun kendisi. Dürüst uyarı: **bu turun değeri koşulmasına bağlıdır**,
yazılmasına değil; kapı (FAZ 3) tam olarak bu yüzden pazarlıksızdı. Teze
doğrudan değen bulgu kod ekseninden geldi: 733 desenlik `/i` körlüğü,
kullanıcı derdini BÜYÜK harfle yazdığında sinyal motorunun onu duymaması
demektir — yani uygulama kullanıcı hakkında **eksik kanıtla** konuşur.
Bu, §6.10'un ("kanıtı olmayan değer yoktur") ürün tarafındaki tam karşılığı
ve *"Mesele Sensin"*in ihlali: mesele kullanıcıysa, kullanıcının kendi
cümlesi ölçüme girmek zorundadır.

**Sürece karşı.** Dört kalıcı iyileştirme: (1) kural bir kapıya bağlandı ve
kapı CI'da kendiliğinden koşuyor — `kapi.yml`in "Tam süit" adımı tüm
`*-kapisi` testlerini içine aldığı için workflow'a dokunmaya gerek kalmadı
(ölçüldü). (2) Devir kapısı (§4.4) kârını gösterdi: benim yazdığım şartname
yanlış bir desen öneriyordu, ajan onu ölçüp düzeltti — devrin kazancı
hız değil, **ikinci bir göz**. (3) Yeni gotcha hafızaya yazıldı ve bir
sonraki kapının adı kondu: girdisi normalize edilmemiş `/…/i` desenlerini
bulan bir denetçi, `TASARIM`/`KOKEN` kalıbında yazılabilir. (4) **Kuralın
kendi boşluğu kapandı:** §3.7 kaydın KİMİN bulgularını taşıdığını
söylemiyordu; ilk koşu tam oradan kaydı — faz denetimlerinin dokuz kararı
kayda dolduruldu ve tur kendi verimini üçten on ikiye şişirdi. Çapraz denetim
(Sonnet) bunu yakaladı, kayıt daraltıldı ve §3.7'ye tek cümle eklendi. Bir
denetim turunun kendi hasadını abartması, hiç koşulmamasından daha sinsidir:
sonraki tur onu ölçü sanır.

**Bulgular (bu turun kendi çıktısı).** 3 — düzeltildi 1 · plana taşındı 2 ·
reddedildi 0

- `tests/oz-denetim-kapisi.test.js` — `trKucult()` var olan motorun ikiziydi (§1.3) — **düzeltildi** (tek satırlık deyim)
- `js/parts/09b-depth-foundations.js` ve yedi yüz mertebesinde desen — `/i` bayrağı BÜYÜK harfli Türkçe girdiyi kaçırıyor — **plana taşındı** ([[turkce-i-regex-korlugu]]; bir sonraki sprintin denetçi adayı)
- `_src.html:39` — `rel="icon"` yok, her tarayıcı `/favicon.ico` isteyip 404 alıyor — **plana taşındı** (tek satırlık ürün düzeltmesi, bu sprintin kapsamı değil)

**Bu üç madde, önceki faz denetimlerinin bulgularını İÇERMEZ.** Onlar
`## Kapanış`ın "Faz denetimlerinin hasadı" özetindedir ve bu turun ürünü
değildir — kendi turlarında bulunup kendi commit'lerinde kapandılar.
