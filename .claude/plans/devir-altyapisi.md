# Devir Altyapısı — "kuralın kağıttaki hâli değil, çalışan hâli"

## Bağlam

`PROTOKOL-FABLE.md` §4.4 devir kapısını koşulsuz yazar: **🅢 faz görülünce
`uygulayici` çağrısı açılır.** §3.3 bunu çapraz denetimle tamamlar: fazı yazan
model denetlemez. Bu snapshot'ta ikisi de mekanik olarak İMKÂNSIZ — ölçüldü
(2026-09-02):

| Deneme | Sonuç |
|---|---|
| `Agent({ subagent_type: 'uygulayici' })` | ❌ `Agent type 'uygulayici' not found` |
| `Agent({ subagent_type: 'denetci' })` | ❌ listede yok |
| `Agent({ … model: 'sonnet' })` | ✅ *"powered by the model named Sonnet 5"* |
| `Agent({ … model: 'opus' })` | ✅ *"powered by the model named Opus 5"* |
| Bu oturum (`get_session`) | `claude-opus-5`, effort `xhigh` |

Yani **model ekseni sağlam, ad ekseni kırık.** Protokol `uygulayici`/`denetci`
adını 20 yerde anıyor; `git log --all -- .claude/agents/` boş — dizin bu repoda
hiç var olmamış.

Aynı örüntü `.claude/` altının tamamında: `git ls-files .claude/` üç dosya
döndürüyor (iki hafıza, bir plan). Kanca script'leri (`scripts/auto-build.sh`,
`scripts/devir-notu.sh`) diskte duruyor ve çalıştırılabilir, ama onları Stop
kancasına bağlayan `.claude/settings.json` yok — `.claude/DEVIR.md`'nin hiç
oluşmamış olması bunun kanıtı. `MEMORY.md`'nin kendi notu da aynı şeyi söylüyor:
*"repo snapshot'ında `MEMORY.md` ve `.claude/memories/` yoktu."*

### Onaylanan kararlar (Emre, 2026-09-02)

1. **Devir geri gelsin:** 🅢 fazları Sonnet yazar, 🅞 (görsel/kritik yargı)
   Opus'ta kalır — protokolün zaten tarif ettiği biçim.
2. `PROTOKOL-FABLE.md` **tamamıyla** analiz edilip buradaki eksikler kapatılır.

### Merkez kavram

Protokol bir kural kitabı değil, bir **kapılar sistemi**dir; §6.6'nın kendi
cümlesiyle: *"Kapısı olmayan kural, zamanla tavsiyeye döner."* Bu snapshot'ta
kuralların metni var, kapıların mekaniği yok — yani protokol tavsiyeye dönmüş
durumda. Bu sprintin ölçüsü tek: her eksik, **kendi mekaniğiyle** kapanacak;
belgeye bir cümle daha eklemekle değil.

## Ana Tasarım Kararları

### K1 — Ajan adı sözleşmenin kendisidir, takma ad değil
`general-purpose` + `model: 'sonnet'` çapraz modeli sağlar ama sözleşmeyi
KAYBEDER: `uygulayici`'nin plan-dışı dosya yasağı, microcopy icat etme yasağı,
ad göçü yasağı, commit/hafıza yasağı ve `## Duraklar` raporu; `denetci`'nin
"yalnız o fazın diff'ine bakar, kod yazmaz" kuralı. §4.4'ün kendi uyarısı bunu
söylüyor: *"Protokol yüklenmezse §5–§6 disiplini de gelmez — yani devrin tam da
güvendiği şey gelmez."* Bu yüzden çözüm prompt'a elle sözleşme yapıştırmak
değil, `.claude/agents/*.md` dosyalarını repoya koymaktır: bir kez yazılır, her
uzak oturumda yüklenir.

### K2 — `denetci`'nin modeli çağrıda ezilir, frontmatter'da değil
§3.3: *"denetçinin modeli, fazı yazan modelin modeli OLAMAZ."* Frontmatter
`model: sonnet` yalnız **varsayılandır** (en sık hâl: Opus yazar, Sonnet
denetler). Dosyanın kendisi bu tuzağı yazacak ki çağıran taraf `model`
parametresini geçmeyi unutmasın — sabit frontmatter'a güvenmek denetimi kapı
olmaktan çıkarıp törene çevirir.

### K3 — Tarihsel içerik uydurulmaz (§6.10 gerçeklik kuralı)
Üç kırık referans var: `.claude/plans/gerceklik-mimarisi.md`,
`.claude/plans/kesin-alinti-mimarisi.md`, `olu-kod-temizlikleri` hafızası.
Bunların **orijinalleri** kayıp; tarihsel kararlarını hatırlamak mümkün değil.
Kanıtı olmayan değer yoktur: bu belgeler kodun bugünkü hâlinden **yeniden
çıkarılır** (`js/parts/13y-koken.js`, `scripts/gerceklik-denetci.mjs`,
`tests/gerceklik-kapisi.test.js`) ve her birinin başına ne olduğu yazılır —
"orijinal snapshot'ta yoktu, bu belge koddan türetildi". Hatırlanmış gibi
yazmak §6.2 ihlalidir.

### K4 — Devir kapısı bu sprintte kendi kendini sınar
FAZ 1 ajan dosyalarını yazar; FAZ 2'den itibaren 🅢 fazlar **gerçekten**
`uygulayici`'ya devredilir. Ajan çalışan oturumda tanınmazsa (harness ajanları
oturum açılışında yükler) fallback K1'in reddettiği yoldur — `general-purpose` +
`model: 'sonnet'` + sözleşmeyi prompt'a elle yükleme — ve bu durum rapora
**sapma** olarak yazılır, sessizce yapılmaz.

## Fazlar (her biri bağımsız ship edilebilir)

### FAZ 1 — Ajan sözleşmeleri · 🅞 · ~1 oturum
Devir: 🅞 — ajanın hangi araçlara erişeceği (`uygulayici` Write alabilir mi,
`denetci` salt-okunur mu) ve sözleşmenin yasak listesinin sınırı ürün kararıdır;
plandan okunamaz. Ayrıca devir dışı: devrin kendi altyapısı — ajan yokken ajana
devredilemez.
**Yeni:** `.claude/agents/uygulayici.md`, `.claude/agents/denetci.md`

### FAZ 2 — Stop kancası yapılandırması · 🅢 · ~1 oturum
İki ölü script kapıya bağlanır. `auto-build.sh` stdout'a tek satır JSON basar
(`systemMessage` / `suppressOutput`) — sözleşmesi dosyanın başında yazılı;
`devir-notu.sh` `.claude/DEVIR.md`'yi yazar, stdout'u kirletmez.
**Yeni:** `.claude/settings.json`

### FAZ 3 — Preview attach girdisi · 🅢 · ~1 oturum
§3.3 tek origin kuralı: `launch.json` girdisi **komutsuzdur**, yalnız `url` ile
ayakta olana bağlanır (gerekçe `scripts/preview-baslat.sh` başlığında yazılı —
preview sandbox'ı repo içindeki `.mjs`'i açamıyor, EPERM). İki girdi: kök
`:3030`, dist `:3031`.
**Yeni:** `.claude/launch.json`

### FAZ 4 — Kırık plan referansları · 🅢 · ~1 oturum
§6.10'un işaret ettiği iki belge koddan yeniden çıkarılır (K3). Kaynak:
`js/parts/13y-koken.js` (tek motor), `scripts/gerceklik-denetci.mjs` +
`tests/gerceklik-kapisi.test.js` (kapı), `kokenSozBlok`/`kanit_ref`/
`kokenAlintiCoz` sözleşmesi.
**Yeni:** `.claude/plans/gerceklik-mimarisi.md`,
`.claude/plans/kesin-alinti-mimarisi.md`

### FAZ 5 — Ölü kod hafızası · 🅢 · ~1 oturum
§6.9'un andığı `olu-kod-temizlikleri` hafızası prosedür olarak yazılır: §3.1
yetim kontrolü, §5.2 sözleşme koruması, mevcut denetçilerin (`yetim-kopru`,
`bagsiz-ad`) rolü. Tarihsel KORUNANLAR listesinin kayıp olduğu açıkça yazılır.
**Yeni:** `.claude/memories/olu-kod-temizlikleri.md` · **Değişen:** `MEMORY.md`

### FAZ 6 — Kapı sınaması + kapanış · 🅢 · ~1 oturum
Devir kapısı canlı sınanır (`uygulayici` çağrısı açılıyor mu), tam süit koşar,
`.gitignore` `.claude/DEVIR.md` için karara bağlanır.
**Değişen:** `.gitignore` (gerekirse), plan kapanış notu

## State / Veri

- **Değişmeyen:** repo kodu (`js/`, `css/`, `_src.html`) bu sprintte
  DEĞİŞMEZ — iş tamamen `.claude/` altındadır. §3.3'ün "kaynak kod değişmediyse
  test/preview kapısı gerekçeli geçilir" maddesi bu yüzden geçerlidir.
- **Yeni yol:** `.claude/agents/` (dizin ilk kez oluşuyor)
- **Tuzak:** `.claude/DEVIR.md` kanca ürünüdür, elle düzenlenmez; commit'e girip
  girmeyeceği FAZ 6'da karara bağlanır.

## Ton Rehberi

Ajan dosyaları Emre'nin okuduğu metin değil, **modelin okuduğu sözleşmedir** —
buyurgan ve kesin: "açma", "icat etme", "yazma", "raporla". Süs yok, gerekçe
tek satır. Türkçe (§1: kod yorumları da Türkçe). Yasaklar madde madde, her
maddenin yanında protokol numarası (`§4.3`) ki ajan kaynağı doğrulayabilsin.

## Riskler / Dikkat

1. **Ajan yükleme anı.** Claude Code ajanları oturum açılışında tarar; FAZ 1'de
   yazılan dosya bu oturumda tanınmayabilir. FAZ 2 açılışında sınanır, sonuç
   rapora girer (K4).
2. **`settings.json` şeması.** Yanlış yazılan hook yapılandırması sessizce
   çalışmaz — `.claude/DEVIR.md`'nin OLUŞMASI tek gerçek kanıttır, dosyanın
   varlığı FAZ 2'nin kapısıdır.
3. **auto-build stdout sözleşmesi.** Script'in kendi başlığı uyarıyor: stdout
   YALNIZCA tek satır JSON. İki kancayı yanlış sırayla/aynı akışa bağlamak
   Claude Code'un okuduğu mesajı bozar.
4. **Ajan `tools` alanı fazla geniş olursa** sözleşme delinir (ör. `uygulayici`
   commit atabilir hâle gelir). Yasak listesi metinde kalırsa yetmez — araç
   listesiyle de daraltılır.
5. **Devredilen fazın denetimi bende.** FAZ 2-5 Sonnet'e giderse denetimleri
   Opus'a (bana) düşer; FAZ 1'i ben yazdığım için onun denetimi Sonnet'e gider
   (§3.3 tablosu).

## Doğrulama (her faz sonunda)

1. `bash build.sh` yeşil — kaynak kod değişmese de alınır (§3.3: ucuz ve
   `index.html` üretimini doğrular)
2. Hedefli süit: `.claude/` altı test dosyasına dokunmaz → §3.3'e göre
   `git diff --stat` kanıtıyla **gerekçeli** geçilir; FAZ 5'te `MEMORY.md`
   değişir, o da test yüzeyi değildir
3. Faz denetimi çapraz modelde (§3.3): FAZ 1 → Sonnet; FAZ 2-5 Sonnet yazarsa
   → Opus
4. **FAZ 2'nin kendi kapısı:** `.claude/DEVIR.md` tur sonunda oluşmuş mu
5. **FAZ 1'in kendi kapısı:** `Agent({ subagent_type: 'uygulayici' })` artık
   hata vermiyor mu — sözleşme regresyonu budur
6. Sprint kapanışında tam süit: `npx vitest run`

## Kritik Dosyalar

- **Yeniden kullanılan (keşifte bulundu, yeniden yazılmayacak):**
  `scripts/auto-build.sh` (Stop kancası, JSON sözleşmesi başlığında),
  `scripts/devir-notu.sh` (mekanik devir fotoğrafı, `.claude/DEVIR.md` üretir),
  `scripts/preview-baslat.sh` (idempotent, tek origin), `scripts/preview-server.mjs`
  (`no-store` + `/sw.js` kill-switch), `js/parts/13y-koken.js` (gerçeklik motoru),
  `scripts/gerceklik-denetci.mjs` + `scripts/tasarim-denetci.mjs` (kapı deseni)
- **YENİ:** iki ajan sözleşmesi, `settings.json`, `launch.json`, iki mimari
  belgesi, bir hafıza dosyası

## Hafıza bağları

- `[[xss-kapisi]]` — kapı deseni emsali (FAZ 4'ün belge dili için)
- `[[kapi-tarama-yarisi]]` — `js/` gezen denetçilerin yarış tuzağı
- `[[olu-kod-temizlikleri]]` — FAZ 5'te oluşturulacak

---

## İlerleme — 2026-09-02

### FAZ 1 ✅ — Opus yazdı, **Sonnet denetledi**
İki sözleşme yazıldı. Çapraz denetim üç bulgu getirdi, üçü de o turda düzeltildi
(commit `bc12209`): çapraz-model tablosu protokolün üç satırını ikiye
indirgemiş ve "Opus'un devrettiği faz → parent'ın kendisi; ajana devredilmez"
satırını kaybetmişti; `escapeHTML` atfı §6.6/§6.10 yerine §5.2 olmalıydı;
Risk 4'ün araç-düzeyi boşluğu adlandırılmamıştı.

### FAZ 2 + 3 ✅ — **Sonnet yazdı**, Opus denetledi
Tek çağrıda birleştirildi (§4.4 cold start: ikisi de `.claude/` yapılandırma
dosyası). Denetim parent'ta kaldı — tablonun orta satırı gereği ajana
verilmedi. **Bulgu yok.** Doğrulananlar: Stop sırası `auto-build` →
`devir-notu` (gerekçe: `dist/` takipli — 19 dosya — build'den önce çekilen
fotoğraf bayatlar), `$CLAUDE_PROJECT_DIR` geçerli hook env'i, `jq -e` iki
komutu da basıyor.

**Durak — karara bağlandı:** `.claude/launch.json` şeması **doğrulanmadı**.
Ne repoda ne protokolde alan-alan bir örnek var; harness binary'sinde de
okunabilir şema yüzeye çıkmadı. Yazılan biçim
(`{"<isim>": {"url": "..."}}`) protokolün "`url` alanı" ifadesi ve
`preview_start({ name: 'wanderer' })` kullanımıyla tutarlı en minimal
yorumdur — ama kanıt değil. Dosya bırakıldı: yanlışsa sessizce çalışmaz,
yani dosyanın hiç olmamasından kötü değil. **Emre'nin yerel oturumda
`preview_start` ile sınaması gerekiyor.**

### Bu sprintin ortak bulgusu — `.claude/` oturum açılışında yüklenir
Üç eksik de aynı sebeple bu oturumda canlı sınanamıyor:

| Dosya | Neden sınanamıyor |
|---|---|
| `.claude/agents/*.md` | harness ajan listesini oturum açılışında tarar — `subagent_type: 'uygulayici'` hâlâ "not found" |
| ~~`.claude/settings.json`~~ | **DÜZELTME — bu satır yanlış çıktı, aşağıya bak** |
| `.claude/launch.json` | preview aracı bu oturumda yüklü değil |

Bu bir kusur değil, bu sprintin **teşhisinin kendisi**: altyapı repoda
olmadığı için hiç yüklenmiyordu. Dosyalar artık doğru konumda ve commit'te;
etkinleşmeleri sonraki oturumda görülecek. Sınama FAZ 6'nın işi ve orada
"kanıtlandı" değil, **"sonraki oturuma bırakıldı"** diye yazılacak.

### İlk hamle (sonraki oturum, sorusuz)
`Agent({ subagent_type: 'uygulayici' })` çağrısını aç — hata vermiyorsa
FAZ 1-3 canlı kanıtlanmıştır; `.claude/DEVIR.md`'nin değişiklik zamanına bak
(kanca ateşlendiyse güncel olur). Sonra FAZ 4 (gerçeklik + kesin alıntı
mimari belgeleri) `uygulayici`'ya devredilir.


### DÜZELTME — Stop kancası bu oturumda ATEŞLENDİ (ölçüldü)

Yukarıdaki tablo `.claude/settings.json` için "bu oturumda sınanamaz" diyordu;
gerekçe `update-config` rehberinin uyarısıydı: *"ayar izleyicisi yalnız oturum
başında ayar dosyası olan dizinleri izler."* **Ölçüm bunu yalanladı.**

`.claude/DEVIR.md`'nin damgası tur tur izlendi:

| An | Damga | Ne oldu |
|---|---|---|
| 08:28:55 | — | `settings.json` yazıldı |
| 08:30 | `08:30` | belirsiz — ajan script'i elle de koşturmuştu |
| **08:37** | **`08:37`** | **kanca tur sonunda kendi ateşlendi** — elle çalıştırma yok |

Yani **FAZ 2 canlı kanıtlandı**: kanca bağlı ve çalışıyor. Rehberin uyarısı bu
ortamda geçerli değil (`.claude/` dizini oturum başında vardı, yalnız içindeki
`settings.json` yoktu — izleyici anlaşılan dizini izliyor, dosyayı değil).

Bu, kalan iki satırı **düşürmez**: ajan adları hâlâ "not found" veriyor ve
preview aracı bu oturumda yüklü değil. Üçünün aynı sebeple sınanamayacağı
varsayımı yanlıştı — sebepler ayrıymış, ve biri kanıtla kapandı.

### FAZ 4 ✅ — **Sonnet yazdı**, Opus denetledi
İki mimari belgesi koddan türetildi: `gerceklik-mimarisi.md` (230 satır),
`kesin-alinti-mimarisi.md` (161 satır). **Bulgu yok.** Denetim yöntemi:
belgelerdeki 87 `dosya:satır` iddiasından 14'ü rastgele seçilip koda karşı
sınandı — **14/14 tuttu**, yani belgeler hatırlanmış değil okunmuş. K3 notları
her iki belgenin başında, hatta beklenenden titiz: "kod içindeki yorumlarda
geçen tarihler koddan alıntıdır" ayrımını da yapıyorlar.

**Durak — karara bağlandı:** ajan üçüncü bir kırık referans buldu —
`tests/sifir-kanit-sinavi.test.js:19` → `.claude/plans/koken-kor-noktalar.md`,
o da yok. Plan-dışı olduğu için yazmamış (sözleşmesi gereği doğru davranış).
**Karar: FAZ 5'in kapsamına alınıyor** — FAZ 5 zaten kırık referans kapatma
işidir (§6.9'un `olu-kod-temizlikleri` hafızası), ikisi aynı cinsten.
