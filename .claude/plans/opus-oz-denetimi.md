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
§9 "Sprint kapanışı" kontrol listesi satırı)

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

## Hafıza bağları

[[kapi-sessiz-gec]] (K4 — boş sonuç temiz sonuç değildir) ·
[[rapor-bayatligi]] (plan ekseninin kendisi: söylenen ile ağacın gösterdiği) ·
[[kapi-cifte-kosu]] ("koşulan ağaç, commit'lenen ağaç") ·
[[claude-altyapisi-commit-disi]] (uzak oturumda `.claude/` commit edilmezse yok) ·
[[olu-kod-temizlikleri]] (kod ekseninde KORUNANLAR listesi)
