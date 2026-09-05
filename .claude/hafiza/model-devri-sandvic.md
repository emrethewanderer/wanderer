---
name: model-devri-sandvic
description: 2026-07-27 kararı — Opus plan → Sonnet 🅢 fazları uygular → Opus denetler+commit; devir etiketi, oran kapısı (08-01), HER FAZ SONU denetim + dikiş turu (08-01); 08-23: denetim SİMETRİK (Opus'un fazını Sonnet denetler, .claude/agents/denetci.md) ve tam süit faz sonundan sprint sonuna alındı; 08-25: yön modele değil ROLE bağlı — yazan denetlemez, denetçinin modeli çağrıda seçilir; 08-25 ikinci ölçüm: 149 🅢 faza karşı 11 uygulayici çağrısı — devir kuralı 08-11'de ölmüştü, kapı §9'a faz AÇILIŞI olarak yazıldı ve DEVIR.md'ye nabız eklendi
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5fabe654-8fc7-4bf5-92bf-2c585c020094
  modified: 2026-08-01T14:21:21.185Z
---

Emre 2026-07-27'de model devrini kural hâline getirdi: **plan güçlü modelde
kurulur, mekanik fazlar Sonnet'e devredilir, denetim güçlü modele döner**
(sandviç). `PROTOKOL-FABLE.md` §4.4 olarak yazıldı; uygulayıcı ajan
`.claude/agents/uygulayici.md` (`model: sonnet`).

Devir etiketi her fazın başına konur (§4.2 madde 4):
- **🅢** — çıktı planda tarif edilenden ibaret (meta dağıtma, i18n paritesi,
  test yazımı, ölü kod temizliği, mevcut motora yeni tüketici).
- **🅞** — doğru sayı/ritim/kelime ancak ürüne bakarak bulunur (görsel dil,
  tören ritmi ve eşikleri, yeni ekran, microcopy üretimi, ad göçü, açık uçlu
  keşif). Sınav cümlesi: *"Planda yazdığım gibi yapıp build'i yeşil bırakan
  biri yanlış yapmış olabilir mi?"* → evetse 🅞.

**Why:** İki ayrı risk var. Birincisi, uygulayan model kendi işini denetlerse
aynı kör noktadan iki kez geçer — denetimi el değiştirmek devrin kazancını
korurken asıl riski kapatır. İkincisi, planı yazan model keşifte bulduğu
"bu zaten var" bilgisini plana yazmadıysa yanında götürür; devralan taraf o
motoru bulamaz ve ikizini yazar (protokol §1.3 ihlali). Emsal: `KK_GUNLUK_TOREN=3`
tavanı plandan çıkmaz, ritmi izlerken doğar — build yeşil kalır, kapı yakalamaz
([[kart-yagmuru-toren-ritmi]]).

**How to apply:** Plan yazarken her faza 🅢/🅞 koy ve `## Kritik Dosyalar`daki
"yeniden-kullanılan" listesini eksiksiz doldur — devirde planın en önemli
bölümü odur. Devir çağrısı her hâlükârda plan yolu + FAZ numarası +
"`PROTOKOL-FABLE.md`'yi oku" talimatını taşır: **CLAUDE.md `@import`'unun alt
ajana taşındığına güvenme**, taşınmazsa §8'in Sonnet kalibrasyonu da gelmez.
Ajan commit atmaz, hafızaya yazmaz, ad göçü yapmaz, microcopy icat etmez;
yapamadığını **Duraklar** başlığıyla parent'a bildirir ve kararı parent verir.
Sprint kapanışındaki öz-denetim turu ([[oz-denetim-ve-commit-kapanisi]])
devredilen sprintte atlanmaz — asıl orada gerekir.

**Kuralın kendisi 2026-07-31'de sınandı (geç denetim de iş görür).** Emre
"Sonnet ile uyguladık, eksik olabilir mi?" diye sorunca "Eşiği Kaydırmak"
sprinti (commit `1d6f731`, 5 gün sonra) denetlendi: build yeşil, 1471 test
yeşil, konsol temizdi — yani **hiçbir kapı bu üç bug'ı yakalamamıştı**.
Çıkanlar: (1) auth-öncesi ⌘K'nın `.sc-onb` sızdırıp günlük ritüelleri
ertelemesi ([[acilis-perdesi]]), (2) `_crossedToBack` bayrağının asılı kalıp
Eşik'i Studio içi gezinmede açması ([[esik-ekrani]]), (3) yorumun vaat ettiği
"hesap ayrımı uid ile" sözünün kat 0'da tutulmaması. Üçü de **davranışsal**:
kod planı yerine getiriyor, kapılar yeşil, bug kullanıcı akışında yaşıyor.
Ders: denetim turunu sprint biterken kaçırdıysan sonradan yap — plan artefaktı
silinmiş olsa bile (bu turda öyleydi) commit mesajı + hafıza sözleşme olarak
yeter. Denetimde en verimli yol: şüpheyi **önce kırmızı testle mühürle**,
sonra düzelt.

**2026-08-01 kalibresi — devir kağıtta kaldı, ölçüldü.** Emre "sandviçi
sürdürsem kotam daha çok sürer mi?" diye sorunca kural sonrası beş plan
sayıldı (`grep "^### .*FAZ" .claude/plans/*.md`): etiketli 24 fazın **19'u
🅞** (%79), `olunan-ve-niyet-alinan.md` hiç etiketlenmemiş, etiket biçimi üç
ayrı yerleşimde — yani elle sayılamaz hâlde. Kök neden: sınav cümlesi
asimetrikti ("yanlış yapmış olabilir mi?" → her işte "olabilir"), fazlar
karışıktı (bir damla tören yargısı bütün fazı 🅞 damgalıyordu). Protokole
işlenen altı düzeltme:

1. **🅢 varsayılan.** Sınav tersine döndü: *"plandan okunamayan KARARI
   adlandır"* — adlandıramıyorsan faz 🅢. "İçimde bir his var" gerekçe değil.
2. **Karışık faz bölünür:** gövde 🅢 önce, yargı çekirdeği 🅞 üstüne.
3. **Oran kapısı:** 🅞 > 🅢 ise plan bitmemiştir (kayma alarmı).
4. **Tek etiket biçimi:** `### FAZ N — ad · 🅢/🅞 · ~N oturum` + 🅞 ise
   altına `Devir: 🅞 — <gerekçe>`; etiketsiz faz plan hatası.
5. **Her faz ayrı ajan çağrısı** (bağlam şişmesi = hem kota hem kalite kaybı)
   ve **keşif `Explore` alt-ajanına** (dosya avı planlayanın bağlamını yemesin).
6. **Denetim:** kapsam `git diff`, yöntem davranışsal (planın `## Doğrulama`
   senaryolarını preview'da koştur). *(Bu maddenin "sprint sonunda tek tur"
   kısmı ertesi gün Emre tarafından tersine çevrildi — aşağıya bak.)*

**Kota ölçümü (aynı gün, ikinci tur).** Emre "en kaliteli kod, en az kota"
deyince devrin gerçek bedeli ölçüldü: `PROTOKOL-FABLE.md` ~7.5K token, ama
ajanın gerçekten ihtiyaç duyduğu §3+§5+§6 çekirdeği ~2.4K — **%68'i her faz
çağrısında yeniden ödenen ölü yük**. `MEMORY.md` indeksi ayrıca ~4K. Ana
oturumda bunlar önbelleğe girer, ama **her alt-ajan çağrısı önbelleksiz
açılır** — optimizasyonun değerli olduğu yer orasıdır. Dört düzeltme:

- Ajan protokolün **tamamını değil çekirdeğini** okur (`uygulayici.md` §0'da
  hazır `sed` komutu). §8'in ajana yazdığı kalibrasyon maddesi protokolden
  bağımsız olsun diye ajan sözleşmesine taşındı.
- Plan yeni bir bölüm taşır: **`## Hafıza bağları`** (§4.2 madde 10) — ajan
  `MEMORY.md`'yi taramaz, yalnız orada yazan dosyaları açar. Keşfin kağıda
  geçmeyen kısmı devralana ikinci kez ödetilir.
- **Cold start nüansı:** "her faz ayrı çağrı" mutlak değil — ardışık 🅢
  fazlar aynı dosya kümesine dokunuyorsa tek çağrıda birleştirilir.
- **Kapının ölçüsü işin yüzeyine göre** (§3.3): kaynak kod değişmediyse
  test/preview `git diff --stat` kanıtıyla gerekçeli geçilir. Kod
  değişmemişken 1600+ test koşturmak dürüstlük değil, israf.

§8'in Opus kalibrasyonuna da işlendi: Opus'un ikinci eğilimi **işi kendine
ayırmak**tır. `uygulayici.md`'ye simetrik madde eklendi — 🅢 fazda plandan
okunamayan karar çıkarsa ajan tahminle doldurmaz, adıyla **Duraklar**a yazar;
mekanik gövdeyi ajan bitirir, yargı çekirdeğini parent basar.

**2026-08-01 · KARAR: denetim faza bağlandı (sprinte değil).** Emre "her
planın fazında öz-denetimi Opus 5 yapsın" dedi — aynı günün "sprint sonunda
tek tur" kalibresini bilerek tersine çevirdi. Devirde denetim artık **ikiye
ayrılır, ikisi de Opus'undur:**

- **Faz denetimi** — her ajan çağrısı biter bitmez, *sonraki faz açılmadan
  önce*. Kapsam yalnız o fazın diff'i (`--stat` → hedefli okuma) + ajanın
  `## Duraklar` listesi. Ajan raporu geldi diye faz bitmez; **denetim
  geçince biter.** Bulunan kırık o turda düzeltilir — ajana geri
  gönderilmez (yeni cold start, tek Edit'lik düzeltmeye değmez).
- **Dikiş turu** — sprint kapanışında tek kez, yalnız fazların birbirine
  bindiği yere bakar (çifte init, çakışan state anahtarı, bütünde bozulan
  akış). Faz denetimleri yapıldıysa dosyaları **yeniden okumaz**.

Denetimin birimi **ajan çağrısıdır**: iki faz tek çağrıda birleştiyse
denetim de tektir (birleştirme denetimi seyreltmez).

**Why:** Hatanın bedeli denetimin bedelinden büyük. Bir fazın kırığı
denetlenmeden sonraki faz onun üstüne inşa edilirse düzeltme tek dosya
değil, üst üste binmiş üç faz olur — 07-31 sınavındaki üç bug'ın üçü de
davranışsaldı ve kapılar yeşilken yaşıyordu. Kotayı koruyan şey turu
ertelemek değil, **kapsamı dar tutmaktır**: iki tur aynı dosyayı iki kez
okuyorsa kapsam yanlış çizilmiştir.

**How to apply:** Devrettiğin fazın raporunu okur okumaz `git diff --stat`
al, riskli dosyada tam diff aç, planın `## Doğrulama` senaryolarını
preview'da koştur, `## Duraklar` maddelerini karara bağla (sen uygula /
sonraki faza taşı / plana yaz) — sonra sonraki çağrıyı aç. `uygulayici.md`
§4 buna göre güncellendi: ajan fazı "bitmiş" ilan etmez, **teslim eder**;
doğrulayamadığı şüpheyi `## Parent'ın bilmesi gerekenler`e yazar.

**2026-08-23 · KARAR: denetim simetrikleşti, tam süit sprint sonuna gitti.**
Emre iki şeyi birden değiştirdi: *"Her bir faz bitiminde test yapmayalım, o
faz hangi modelde yapıldıysa diğer modelle öz-denetim yapalım, tam süite
sadece en sonda çalışsın."*

1. **Faz kapısı hedeflidir** (§3.3): build → *o fazın dokunduğu* testler →
   preview/konsol. Hedefi diff söyler (`git diff --name-only` → değişen
   `js/parts/<önek>…` için `tests/<önek>…`); paylaşılan bir motor
   değiştiyse onu tüketenlerin testleri de girer. **Tam süit yalnız sprint
   kapanışında** koşar (§3.5 madde 2) ve orada pazarlıksızdır.
2. **Denetimin yönü simetrik oldu.** Şema eskiden tek kolluydu — yalnız
   *devredilen* fazlar denetleniyordu, yani Opus'un kendi yazdığı 🅞 fazlar
   denetimsiz bir zemindi. Artık: **fazı Opus/Fable yazdıysa denetim
   Sonnet'e gider** (`.claude/agents/denetci.md`, `model: sonnet`), Sonnet
   yazdıysa Opus denetler (eski hâl, parent'ta kalır, devredilmez).

`denetci.md` sözleşmesi `uygulayici.md`'nin aynadaki hâli: protokolün
yalnız §3.3–3.5 + §5 + §6 çekirdeğini okur, **kod yazmaz** (tek istisna:
şüpheyi mühürleyen kırmızı test), kapsamı fazın diff'idir, bulguyu üç
kademede raporlar (KIRIK / KOKU / NOT) ve hiçbir şey bulamadıysa "temiz"
demekle yükümlüdür — tören için madde uydurmaz. Düzeltmeyi daima **fazın
sahibi** yapar.

**Why:** İki ayrı israf vardı. Tam süit her faz sonunda kapıyı
güçlendirmiyordu — bir fazın kırığı o fazın dosyalarında yaşar, başka bir
modülün testi onu zaten bulmaz; 2800+ test her fazda yalnız turu uzatıyordu.
Denetim tarafındaysa asimetri bir kör nokta bırakıyordu: sandviçin gerekçesi
("uygulayan model kendi işini denetlerse aynı kör noktadan iki kez geçer")
yönsüzdür, ama kural yalnız bir yöne yazılmıştı.

**How to apply:** Faz kapanışında tam süit koşturma — hedefli süiti koştur,
sonra denetimi karşı modele ver (`Agent({ subagent_type: 'denetci',
model: 'sonnet' })`; çağrı diff kapsamını + plan yolunu + FAZ numarasını
taşır). Bulguyu sen düzelt, sonra sorusuz sonraki faza geç ([[kota-brifingi-devir-noktasi]]).
Tam süiti sprint kapanışına sakla; kırmızı testle sprint kapanmaz.

**2026-08-25 · Yön modele değil ROLE bağlı; denetçinin modeli çağrıda
seçilir.** Emre bir teşhisi düzeltti. İddia şuydu: *"çapraz-model denetimi
çöker, `denetci.md` ile `uygulayici.md` ikisi de `model: sonnet`"* — yanlıştı,
çünkü Sonnet'in yazdığı fazı denetleyen model bir ajan değil **parent
Opus'un kendisidir**; iki ajanın aynı modelde olması onu çökertmez (protokol
`uygulayici`nın işini `denetci`ye vermeyi zaten yasaklar). Ama kuralın
kapsamadığı gerçek bir hâl vardı: **oturumun kendisi Sonnet'te açıldığında**
faz denetimi sabit `model: sonnet` ajanına gidiyor ve aynı model kendi
işinden iki kez geçiyordu. Emre kuralı tek cümlede yeniden kurdu — *bir fazı
kim yaptıysa denetimi öteki modelin işidir.* Protokole işlenen hâli:

> **Denetçinin modeli, fazı yazan modelin modeli OLAMAZ.**

§3.3 tablosu bu cümlenin üç hâline genişledi: Opus yazdı → `denetci`
varsayılan `model: 'sonnet'`; Sonnet'in devraldığı faz → parent Opus,
ajana verilmez; **oturum Sonnet'teyse → `Agent({ subagent_type: 'denetci',
model: 'opus' })`**.

**Why:** `denetci.md`'nin frontmatter'ındaki `model: sonnet` bir **kimlik**
gibi okunuyordu, oysa yalnız en sık hâlin **varsayılanıdır** — `Agent`
çağrısındaki `model` parametresi onu ezer. Kural "Sonnet denetler" diye
ezberlenirse Sonnet oturumunda denetim kapı olmaktan çıkar, törene döner:
aynı kör nokta iki kez geçilir ve yeşil kapılar bunu yakalamaz (07-31
sınavındaki üç bug'ın üçü de davranışsaldı).

**How to apply:** Denetçiyi çağırmadan önce tek soruyu sor — *fazı hangi
model yazdı?* Cevap Opus/Fable ise `model: 'sonnet'`, Sonnet ise
`model: 'opus'` geçir; varsayılana güvenip çağırma. `denetci.md` açılışında
artık bunu kendisi de hatırlatır ve hangi modelde koştuğunu bilmiyorsa
denetime başlamadan sorar.

**2026-08-25 · İKİNCİ ÖLÇÜM: etiket düzeldi, çağrı hiç açılmadı.** Emre
"Sonnet yerine DeepSeek kullansam?" diye sorunca devrin gerçek maliyeti
ölçüldü — ve soru cevaplanmadan önce zeminin çürük olduğu çıktı. 169 oturumun
ham JSONL kaydı tarandı:

| ölçü | değer |
|---|---|
| planlarda `### FAZ` başlığında **🅢** | **149** |
| aynı başlıklarda 🅞 | 73 |
| `uygulayici` ajan çağrısı (toplam) | **11** |
| 12 Ağustos sonrası 17 planda 🅢 | 85 → çağrı **1** |
| 08-11 → 08-25 arası çağrı | **0** (on bir gün) |
| aynı repoda `denetci` çağrısı (08-23 → 08-25) | **12** (iki gün) |

08-01'in oran kapısı **tuttu**: 🅞 %79'dan %33'e indi, 🅢 artık baskın. Yani
etiketleme sorunu çözülmüştü. Ama etiket çağrıya dönüşmüyordu — devir
08-11'de durdu ve bir daha açılmadı. Kota ölçümü de soruyu yerinden etti:
Opus toplam tüketimin **%60'ı**, Fable %23, Sonnet **%17**. Yani "Sonnet'i
ucuzlatmak" en pahalı modele hiç dokunmayan bir tasarruftu; asıl kaldıraç
devrin kendisini kurmaktı. Emre uygulayıcıyı Sonnet 5'te bıraktı ve
mekanizmanın onarılmasını istedi.

**Kök neden — kapının YERİ.** `denetci` iki günde on iki kez tuttu, çünkü §9
kontrol listesinde **koşulsuz bir checkbox**tu. Devir ise iki kez ıskalıyordu:
(1) §9'daki tek ilgili satır *"Faz devredildiyse (§4.4)…"* diye başlayan
**şartlı** bir cümleydi — devretmemeyi ihlal değil, seçenek olarak kodluyordu;
(2) liste fazın **SONUNU** denetliyordu, oysa devir kararı fazın **BAŞINDA**
verilir — kural, karar anına hiç bakmayan bir yerde duruyordu. Kağıt doğruydu,
yeri yanlıştı.

Protokole işlenen onarım:
1. §4.4'e **`#### Devir kapısı`** — "🅢 faz devredilebilir değil, DEVREDİLİR";
   kendin uygulamanın tek meşru hâli gerekçenin plana `Devir dışı:` satırıyla
   yazılmasıdır. "Daha hızlı olur / zaten küçük / nasılsa ben biliyorum"
   gerekçe sayılmaz — kuralı yirmi dokuz günde öldüren bu üçüdür.
2. §9'a **`Her faz AÇILIŞINDA — devir kapısı`** bloğu (koşulsuz, dört madde).
   Kontrol listesi ilk kez fazın açılışına bakıyor.
3. §8 Opus kalibresine **üçüncü eğilim**: "etiketi koyup çağrıyı açmamak".

**Mekanik katman — nabız (asıl önlem).** Kural zaten kağıttaydı ve öldü; aynı
kağıdı kalınlaştırmak önlem değil. `scripts/devir-notu.sh` (Stop kancası, her
tur koşar) artık `.claude/DEVIR.md`'ye **Devir nabzı** yazıyor: son 14 günde
planlardaki 🅢 faz sayısı vs JSONL'lerdeki `uygulayici` çağrısı; oran **%20**
altındaysa "Devir kapısı kapalı" uyarısı basar (%20 çünkü §4.4 ardışık 🅢
fazları tek çağrıda birleştirmeye izin verir). Yeni oturumun ilk okuduğu
dosya budur — kırık artık saklanamaz. Kapı: `tests/devir-nabzi-kapisi.test.js` (7 test).

**GOTCHA — ölçen aletin kendisi sessizce yalan söyledi.** Nabzın ilk yazımında
proje slug'ı yalnız `/` karakterini tireye çeviriyordu. Repo adında boşluk var
(`Wanderer AI`) ve Claude Code slug'ında **boşluk da tireye döner** — dizin hiç
bulunamadı, sayaç `0` bastı, yani "kapı kapalı" uyarısı DOĞRU sebeple değil
YANLIŞ sebeple göründü. İkinci kırık: sayaç dosyanın `mtime`'ına bakıyordu, o
yüzden eski bir çağrıyı taşıyan dosya bugün dokunulunca nabzı şişiriyordu;
sayım çağrının kendi `timestamp`'ine bağlandı. Ders: **ölçüm eklerken ölçüm
aletini de sına** — yanlış sebeple doğru görünen bir uyarı, uyarı değildir.

**Why:** Devrin gerekçesi kota değil **kör noktadır** (§4.4 sandviç): yazan ile
denetleyen aynı model olduğunda kapı töreve döner. Bir kural kağıtta doğru
olduğu hâlde ölçülmediği sürece ölü kalabilir — ve ölü olduğu ancak biri
"maliyeti ne?" diye sorduğunda ortaya çıkar. 07-27'den 08-25'e kadar sandviç
her plan yazımında anıldı, hiç uygulanmadı.

**How to apply:** Faz açmadan önce etiketine bak; 🅢 ise `uygulayici` çağrısını
aç — kendine "bunu zaten biliyorum" dediğin an kuralın öldüğü andır.
Kendin uygulayacaksan gerekçeyi **plana** yaz. Her oturum açılışında
`.claude/DEVIR.md`'nin "Devir nabzı" bölümüne bak: uyarı varsa devir kapısı
kapalıdır, sonraki 🅢 faz devredilir.

**2026-08-25 · GOTCHA — ajan `git add -A` ile başkasının işini commit etti.**
Devir kapısı onarıldıktan sonraki İLK gerçek devirde (kart planı FAZ 3)
`uygulayici` sözleşmesini iki yerden birden deldi: (1) commit attı — hem
`uygulayici.md` hem çağrı metni açıkça yasaklamıştı; (2) commit'ine çalışma
ağacındaki **başka bir işin dosyalarını** kattı — parent'ın o sırada ayrı bir
denetimden geçirdiği `PROTOKOL-FABLE.md`, `scripts/devir-notu.sh`,
`tests/devir-nabzi-kapisi.test.js`. Tek commit iki ayrı işi taşır hâle geldi.

Kök neden `git add -A` / `git commit -am`: ikisi de çalışma ağacındaki HER
şeyi alır. Ajan kendi dokunduğu dosyaları bildiği hâlde komut onu aşar —
yani yasak "commit atma" cümlesiyle kapanmıyor, **komutun kendisi** yasak
olmalı. Devir çağrısına eklenen satır: *`git add -A` bu repoda sana yasaktır;
değişiklikleri çalışma ağacında BIRAK, commit parent'ın işidir.*

**Düzeltme (geçmiş yeniden yazıldı, push yoktu):** yedek etiket
(`yedek-commit-ayrimi-20260825`) → `git stash push -u` (devam eden FAZ 3
işini ayır) → `git reset --soft HEAD~1` → seçerek iki commit → `git stash pop`.
Sonuç: `124430b` protokol onarımı, `b478355` kart işi FAZ 2 — ayrık ve
okunur. Sıra önemli: stash olmadan reset yapılırsa iki işin farkı aynı
dosyada birleşir ve bir daha ayrılamaz.

**Kota gerçeği (aynı tur):** FAZ 3'ün çapraz denetimi başlatıldı ama
*"monthly spend limit"* ile yarıda kesildi — denetçi yalnız "testler gerçek
kapı" sonucuna ulaşabildi. Alt-ajan çağrıları kotaya bağlıdır; kota
dolduğunda §3.3'ün çapraz denetim kapısı FİİLEN KAPANIR. O hâlde dürüst
davranış denetimi atlamak değil, **eksik olduğunu commit mesajına ve rapora
yazmaktır** — bu turda öyle yapıldı.

**Ve o yazı işe yaradı (2026-08-26).** Ertesi gün denetim tek `denetci`
çağrısıyla kapatıldı: commit mesajındaki "DENETİM EKSİK" bloğu kalan üç
maddeyi adıyla saydığı için yeni oturum ne denetleneceğini aramadı, doğrudan
brifingi kurdu. Kalıp şudur — kesilen denetim commit mesajına **kapsam
(commit aralığı) + denetçinin ulaştığı tek sonuç + denetlenmemiş maddeler**
olarak yazılır; sonraki tur onu çağrı metnine çevirir ve "bunu tekrarlama"
diyerek kotayı iki kez ödemez. Sonuç: 0 kırık, 1 ORTA bulgu (guard'ın
örttüğü asimetrik temizlik), 1 reddedilen bulgu. Denetçinin her bulgusu
doğru değildir — parent bulguyu koda karşı doğrular, katılmadığını
**gerekçesiyle reddeder** ve reddi de plana yazar.

İlgili: [[fable-protokol-belgesi]] · [[fable-5-ortaklik-ve-planlama]] ·
[[ad-senkronu-kurali]] · [[oz-denetim-ve-commit-kapanisi]] ·
[[kota-brifingi-devir-noktasi]]
