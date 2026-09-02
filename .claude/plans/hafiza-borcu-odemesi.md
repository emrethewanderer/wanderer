# Hafıza Borcunun Ödenmesi — "kayıp içerik uydurulmaz, bugünkü kanıt yazılır"

## Bağlam

`tests/referans-butunlugu.test.js`'in TABAN'ı 33 kırık iç referans donduruyor:
**23 hafıza adı** + 10 plan yolu. Kök sebep [[claude-altyapisi-commit-disi]]:
`.claude/` altı aylarca yalnız lokal diskte kaldı, repoya hiç girmedi. Git
bunu kesinler — repo 33 commit'lik, `Initial commit` ile başlıyor ve
`git log --all -- .claude/memories/` bu adları hiç döndürmüyor.

Borç bugüne dek **tek iş** sanılıyordu: "yalnız lokal dizinin commit
edilmesiyle geri gelir, bu ELLE bir iştir". Ölçüm bunun yarısının yanlış
olduğunu gösterdi. Borç ikiye ayrılır:

1. **Kayıp içerik** — özgün dosyaların metni. Kurtarılamaz. Doğru.
2. **Kırık bağ** — bir oturumun `[[ad]]`i açtığında hiçbir şey bulmaması.
   **Bu repo-tarafı çözülebilir:** 23 adın HEPSİNİN canlı bir atıf yeri var
   ve o atıflar olgunun kendisini taşıyor — kırığı, ölçümü, tarihini, çaresini.

Emsal repoda zaten var: `olu-kod-temizlikleri.md`. Tarihsel KORUNANLAR
listesi aynı sebeple kayıptı; o dosya listeyi uydurmadı, yerine bugünkü
koddan bir prosedür yazdı ve kaybı beyan etti.

### Onaylanan kararlar

1. **Emre'nin kararı (2026-09-02).** Lokal orijinallere erişim zahmetli ve
   mesele onların değeri: *"Eğer ki bunlar benim entelektüel mülkümü
   istemeyen teknik işler ise orijinalinden daha iyi yapmana salık veririm."*
   → Kalan 22 dosya bugünkü koddan yazılır.
2. **Ayrım beyan edilir.** Teknik tuzaklarda hedef "orijinalinden iyi"dir
   (bugünkü koda karşı doğrulanmış, `dosya:satır` çapalı). Emre'nin kararını
   taşıyan dosyalarda hedef **sadakattir**: karar kod yorumunda ne diyorsa o
   kaydedilir, çevresindeki müzakere üretilmez ve kaybı yazılır.
3. **Plan referansları (10 ad) yeniden YAZILMAZ.** Plan ileriye dönük bir
   yargı belgesidir; geçmişi koddan keşfedilemez. TABAN'da donmuş kalır.
4. **Emsal dosya `boot-nabzi.md`dir** (bu sprintin ilk commit'i, `feff3fe`).
   Biçim, beyan dili ve kanıt sıkılığı oradan okunur.

### Merkez kavram

Bir hafıza dosyası bir **anıt** değil, bir **kapıdır**: sonraki oturum onu
açtığında bugünkü repoda ne yapacağını bilmeli. Bu yüzden ölçü "özgün metne
benzedi mi" değil, *"bu dosyayı okuyan bir sonraki oturum aynı tuzağa bir
daha düşer mi"*dir. Özgün dosya bir anın fotoğrafıydı ve §7'nin kendi uyarısı
altındaydı (*"hafıza geçmişin fotoğrafıdır: dosya:satır iddialarını koda karşı
doğrulamadan gerçek diye sunma"*) — koddan bugün yazılan metin o uyarıyı
doğuşta karşılar.

## Ana Tasarım Kararları

### K1 — Kanıtı olmayan cümle yazılmaz (§6.10'un hafızaya düşen payı)

Her teknik iddia bir `dosya:satır` taşır **ve o satır yazılmadan önce
okunur**. Atıf yorumunun özetiyle yetinilmez: yorum neyi koruduğunu söyler,
kodun kendisi nasıl koruduğunu gösterir. Ölçülmemiş bir sayı, tarih ya da
nedensellik dosyaya girmez.

**Sınır:** atıf yorumunda kayıtlı ama repoda yeniden üretilemeyen bir ölçüm
(emsal: `boot-nabzi`in `1331→905 ms`i) **kayıt olarak** aktarılır — kaynağı
`dosya:satır` ile verilir ve "yeniden üretilmiş ölçüm değildir" denir.

### K2 — Kayıp beyanı zorunlu, dosyanın tepesinde

Her dosya `> **Bu dosya hakkında.**` bloğuyla açar ve üç şeyi söyler:
özgün dosyanın repoya hiç girmediği (git kanıtıyla), bu metnin **kurtarma
olmadığı**, ve **ne kaybolduğu**. Beyansız bir yeniden yazım, sahte bir
süreklilik üretir — §6.2'nin yasakladığı şey.

### K3 — Emre'nin kararı aktarılır, genişletilmez

Ürün kararı taşıyan dosyalarda (mühür töreni, ihtimalsel dil, kart ekseni)
kod yorumundaki ifadeye sadık kalınır. "Emre şunu şunun için istedi"
cümlesi, yorumda yazmıyorsa YAZILMAZ — o bir çıkarımdır, kanıt değil.
Kararın kendisi kaydedilir, gerekçesi ancak yazılıysa.

### K4 — Kapı küçülmeyi zaten serbest bırakıyor

`tests/referans-butunlugu.test.js` TABAN'ı büyümeyi yasaklar, ödenmeyi
serbest bırakır. Yani bu sprint kapıya dokunmaz: hedef dosya yaratıldıkça
borç kendiliğinden düşer. **TABAN listesinden ad SİLİNMEZ** — silmek kapıyı
gevşetmez ama gereksiz bir diff üretir ve testin kendi gerekçe metnini
yalanlar. Ödenmiş ad TABAN'da durur, zararsızdır.

## Fazlar (her biri bağımsız ship edilebilir)

Ortak sözleşme (her faz için): faz YALNIZ `.claude/memories/<ad>.md`
dosyalarını yazar, biçim `boot-nabzi.md` emsalidir. Kaynak kod DEĞİŞMEZ —
bu sprint yalnız `.md` yazar.

**`MEMORY.md` indeksini fazlar YAZMAZ, parent yazar** (faz denetimi turunda).
Gerekçe iki katlı: fazlar paralel koşabildiği için tek dosyaya eşzamanlı
ekleme çakışma üretir; ayrıca indeks satırının hangi bölüme düşeceği ve neyi
tek cümlede söyleyeceği bütünün hükmüdür — dikiş turunun işidir (§4.4).
Kapı bunu sınar (`## Doğrulama` madde 4): indekssiz kalan dosya faz
kapanışında yakalanır.

### FAZ 1 — Test ve kapı tuzakları · 🅢 · ~1 oturum

**Yeni:** `.claude/memories/{safestorage-testlerde-kvcache,`
`test-kirilganligi-jsdom-stil-isinmasi,yerel-tarih-anahtari,`
`yetim-kopru-denetcisi}.md` · **Değişen:** `MEMORY.md`

| Ad | Kanıt çapaları |
|---|---|
| `safestorage-testlerde-kvcache` | `tests/06-summary-chat.test.js:438` · `tests/13D-duygu-iklimi.test.js:28` · `tests/13A-bugun-penceresi.test.js:24` + SafeStorage `_kvCache` tanımı (`js/parts/00a-infrastructure.js`) |
| `test-kirilganligi-jsdom-stil-isinmasi` | `tests/10q-hedef-muhru.test.js:165` (beforeAll ısıtma, 30000 ms) |
| `yerel-tarih-anahtari` | `tests/13m-kota.test.js:18` · `js/parts/09i-secici.js:298` + `localISODate` tanımı (`00a-infrastructure.js`) |
| `yetim-kopru-denetcisi` | `scripts/bagsiz-ad-denetci.mjs:6` (kardeş denetçi) · `tests/11-gecmis-gunler.test.js:245` (üçüncü sınıf: OKUMA) · `scripts/yetim-kopru-denetci.mjs` **motorun kendisi** |

### FAZ 2 — Boot, storage ve mimari · 🅢 · ~1 oturum

**Yeni:** `.claude/memories/{safestorage-kuyruk-flush-kilidi,`
`kisilerim-kart-motoru,belge-katmani-doc-primitifleri,i18n-bundle-bolme}.md`

| Ad | Kanıt çapaları |
|---|---|
| `safestorage-kuyruk-flush-kilidi` | `js/parts/03-auth-shell.js:1031` (tanışma kapısı yarıştırma) + SafeStorage kuyruk/flush kodu `00a-infrastructure.js` |
| `kisilerim-kart-motoru` | `js/parts/10D-olmak-istedigin.js:548` (dinamik import ↔ TDZ, `wsSyncStudio` ikizi) |
| `belge-katmani-doc-primitifleri` | `js/parts/00a-infrastructure.js:900` (`.doc-section`/`.doc-rise`, `wn-reveal`) + `css/parts/document.css` |
| `i18n-bundle-bolme` | `js/parts/15-i18n.js:69` (`ensureLangDict`, cache boşaltma + re-apply) |

### FAZ 3 — Dil kapıları ve i18n paritesi · 🅢 · ~1 oturum

**Yeni:** `.claude/memories/{buyuk-harf-dil-kapisi,tr-en-i18n-tamamlama,`
`ad-senkronu-kurali}.md`

| Ad | Kanıt çapaları |
|---|---|
| `buyuk-harf-dil-kapisi` | `tests/dil-buyuk-harf-kapisi.test.js:111` (CSS kolu + ikinci yüzey) · `js/parts/13q-gozlemevi.js:142` (`lang="tr"` çaresi) + `localeUpper` tanımı |
| `tr-en-i18n-tamamlama` | 7 atıf: `13C-postane.js:58` · `15e-i18n-dict-en.js:6` · `10q-w2-kisi-karti.js:39` (`%85` ↔ `85%`) · `10i/10k/10l/10n-w2-*` |
| `ad-senkronu-kurali` | `js/parts/i18n/en-deste.js:22` (kitap adları uydurulmaz) + `PROTOKOL-FABLE.md` §4.3 — **dikkat:** kural protokolde zaten yazılı; hafıza onu TEKRARLAMAZ, uygulamadaki izini (i18n/deste yüzeyi) belgeler |

### FAZ 4 — LLM davranışı ve model sözleşmesi · 🅢 · ~1 oturum

**Yeni:** `.claude/memories/{llm-bicimleri-geri-sizar,tanima-motoru,`
`sohbet-reasoning-fix}.md`

| Ad | Kanıt çapaları |
|---|---|
| `llm-bicimleri-geri-sizar` | `js/parts/00-config-tracking.js:476,484,490` (Unicode mod değeri, 2026-08-29 denetimi) · `js/parts/06-summary-chat.js:1013` (`_akisMaskesi` ikizi) · `tests/06-summary-chat.test.js:311,323` |
| `tanima-motoru` | `js/parts/06-summary-chat.js:30` (FAZ 7 dersi: stil enjeksiyonunu yalnız KART ÇİZEN yüzeyler tetikliyordu) · `tests/06-summary-chat.test.js:372` |
| `sohbet-reasoning-fix` | `js/parts/10A-gecis-karti.js:564,594` (reasoning gecikmesi ~25 sn; 22 sn sınırı her turda fallback'e düşürüyordu) |

### FAZ 5 — Ürün kararları: kart ve mühür ekseni · 🅞 · ~1 oturum

Devir: 🅞 — bu dört dosyada kaydedilecek şey bir mekanizma değil Emre'nin
**kararıdır** (mührü kim basar, hangi kart sosyal yüzeye çıkar, sıra neden
kritik). Plandan okunamayan karar: her birinde neyin verbatim aktarılacağı,
neyin çıkarım sayılıp DIŞARIDA bırakılacağı — K3'ün sınırı satır satır
çizilir.

**Yeni:** `.claude/memories/{olus-muhru-2-muhru-sen-basarsin,`
`olunan-ve-niyet-alinan-karari,kisi-kartlari,ilham-kartlari-sosyal-feed}.md`

| Ad | Kanıt çapaları |
|---|---|
| `olus-muhru-2-muhru-sen-basarsin` | `js/parts/13A-derin-calisma.js:513` (söz DAVETİ; madde otomatik yazılmaz, mührü kullanıcı basar) |
| `olunan-ve-niyet-alinan-karari` | `js/parts/10q-w2-kisi-karti.js:898` (SIRA KRİTİK: portreye işleme mezuniyetten ÖNCE) |
| `kisi-kartlari` | `js/parts/12f-hazine-paketleri.js:21` (hazine sosyal yüzeye çıkmıyor — kişi kartlarının aksine; yeni tablo YOK) |
| `ilham-kartlari-sosyal-feed` | `js/state/gecis-karti.js:5` (Atölye = aynı tezgâh, farklı giriş; ad senkronu + mig 039 ELLE) |

### FAZ 6 — Ürün kararları: dil, emniyet, ödev, kapı · 🅞 · ~1 oturum

Devir: 🅞 — `ihtimalsel-dil-devrimi` doğrudan tezin dil eksenidir
(*"`olunca` bir VAAT değil bir ihtimaldir"*), `guvenlik-emniyet-katmani` ise
bir emniyet kararının nasıl kaydedileceği sorusudur — sessizce çalışmayan bir
emniyet kontrolünün neden olmayandan beter olduğu cümlesi genişletilmeden
aktarılmalı.

**Yeni:** `.claude/memories/{ihtimalsel-dil-devrimi,guvenlik-emniyet-katmani,`
`odev-zinciri-ve-cipi,kod-kapisi-ve-posta}.md`

| Ad | Kanıt çapaları |
|---|---|
| `ihtimalsel-dil-devrimi` | `js/parts/i18n/en-deste.js:17` · `tests/12b-deste-en.test.js:9` (may/can/often) · `js/parts/06-summary-chat.js:552` (yorum ihtimalsel, ölçüm değil) |
| `guvenlik-emniyet-katmani` | `js/parts/13D-duygu-motoru.js:701` (`getCrisisContext` bir dönem window'a hiç bağlanmamış, kriz enjeksiyonu baştan beri ölüydü) |
| `odev-zinciri-ve-cipi` | `tests/09-odev-defteri.test.js:7` (geçmiş DB'de duruyordu, getter'ı yoktu — 2026-08-23) |
| `kod-kapisi-ve-posta` | `SETUP-SOSYAL-KAPILAR.md:7` (`doOAuth`, `authHandleOAuthUrl`, tanışma + bülten rızası aynı kapıdan) |

## State / Veri

Bu sprint **hiçbir state anahtarına dokunmaz**. Yazılan tek şey `.md`
dosyalarıdır: `.claude/memories/*.md` (yeni) ve `MEMORY.md` (indeks satırı).
`tests/referans-butunlugu.test.js`'in TABAN listesi **değişmez** (K4).

**Tuzak:** yeni bir hafıza dosyası içinde TABAN'da OLMAYAN ve karşılığı
bulunmayan bir `[[ad]]` bağı yazmak kapıyı KIRAR. Bağ verilecekse ya hedefi
var olmalı, ya TABAN'da bulunmalı.

## Ton Rehberi

Hafıza dosyası ürün yüzeyi değildir — kitap-köklü register burada
ARANMAZ. Ses `boot-nabzi.md`nin sesidir: sıcak ama kesin, süssüz Türkçe;
başlıklar `**Why:**` / `**How to apply:**`; iddia cümlesi `dosya:satır`
taşır; kayıp beyanı düz ve özürsüz.

Yasak: "muhtemelen", "sanırım", "bir şekilde" — bunlar kanıtın yokluğunu
örter. Bilinmiyorsa **bilinmediği yazılır**.

## Riskler / Dikkat

1. **Uydurma riski birinci risktir.** Atıf yorumu bir olguyu özetler; onu
   genişletmek (tarih eklemek, nedensellik kurmak, sayı türetmek) sessizce
   sahte bilgi üretir ve hafıza tam da güvenilmesi gereken yerdir.
2. **Protokolü tekrarlama.** Birkaç ad (`ad-senkronu-kurali`) zaten
   `PROTOKOL-FABLE.md`'de kural olarak yazılı. Hafıza kuralı kopyalamaz;
   kuralın **uygulamadaki izini** ve tuzağını belgeler.
3. **Yorumun kendisi eskimiş olabilir.** Atıf yorumu bir gerçeği iddia eder;
   yanındaki kod onu doğrulamıyorsa doğru olan KODDUR — ve bu ayrışma
   dosyaya not düşülür (denetçi için değerli bulgudur).
4. **Faz denetimi çapraz modelde** (§3.3): 🅢 fazları `uygulayici` (sonnet)
   yazar → `denetci` **opus** ile denetlenir. 🅞 fazlarını parent (opus)
   yazar → `denetci` **sonnet** ile denetlenir.

## Doğrulama (her faz sonunda)

Kaynak kod değişmediği için (§3.3) test/tarayıcı kapısı `git diff --stat`
kanıtıyla gerekçeli geçilir; koşulacak olanlar:

1. `./build.sh 2>&1 | tail -5` → yeşil (ucuz, `index.html` üretimini doğrular)
2. `npx vitest run tests/referans-butunlugu.test.js` → 6 test yeşil
   (yeni yazılan dosyaların kendi `[[bağ]]`ları kapıyı kırmamalı)
3. Borç sayacı — ödenen adet artmalı, TABAN 23 sabit kalmalı:
   ```
   adlar=$(sed -n '/^const TABAN = new Set(\[/,/^\]);/p' tests/referans-butunlugu.test.js \
     | grep -oE "'hafiza:[a-z0-9-]+'" | tr -d "'" | sed 's/hafiza://')
   for ad in $adlar; do [ -f ".claude/memories/$ad.md" ] && echo "ödendi $ad"; done | wc -l
   ```
4. Her yeni dosya frontmatter taşır ve `MEMORY.md` onu indeksler:
   ```
   for f in .claude/memories/*.md; do
     head -1 "$f" | grep -q '^---$' || echo "FRONTMATTER YOK: $f"
     ad=$(basename "$f" .md); grep -q "\[\[$ad\]\]" MEMORY.md || echo "İNDEKS YOK: $ad"
   done
   ```
5. Sprint kapanışında tam süit: `npx vitest run 2>&1 | tail -15`

## Kritik Dosyalar

**YENİ:** `.claude/memories/<22 ad>.md`

**Yerinde evrim:** `MEMORY.md` (indeks satırları — bölüm başlıkları
gerekiyorsa eklenir)

**Yeniden kullanılan (yazmadan ÖNCE oku):**
- `.claude/memories/boot-nabzi.md` — **biçim emsali**, kanıt sıkılığının ölçüsü
- `.claude/memories/olu-kod-temizlikleri.md` — **kayıp beyanının emsali**
- `.claude/memories/claude-altyapisi-commit-disi.md` — borcun kök sebebi
- `tests/referans-butunlugu.test.js` — TABAN listesi ve kapının sözleşmesi
- `PROTOKOL-FABLE.md` §6.10 (gerçeklik), §7 (hafıza disiplini), §3.3 (kapı)

## Hafıza bağları

[[boot-nabzi]] · [[claude-altyapisi-commit-disi]] · [[olu-kod-temizlikleri]] ·
[[bagsiz-ad-kapisi]] (FAZ 1'in `yetim-kopru-denetcisi` dosyası onun kardeşini
anlatır) · [[kapi-sessiz-gec]] (kapı kırığı ile körlük ayrımı — FAZ 1'in
denetçi dosyalarında emsal)

## Durum

- FAZ 1–6: açılmadı.
- **İlk hamle.** FAZ 1'i `uygulayici` ajanına devret (🅢, §4.4 devir kapısı):
  plan yolu `.claude/plans/hafiza-borcu-odemesi.md`, FAZ 1, protokol
  çekirdeği §3/§5/§6 + emsal dosya `boot-nabzi.md`.
