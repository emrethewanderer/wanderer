---
name: dogrulama-tarayicisi
description: Doğrulama kapısının üçüncü adımı (canlı DOM + konsol) bir ARAÇTAN repoya taşındı — Playwright koşucusu `scripts/dogrula.mjs`; "preview yok" artık kapıyı atlamanın gerekçesi değildir
type: altyapı
---

# Doğrulama tarayıcısı — kapının üçüncü adımı repoya taşındı

`PROTOKOL-FABLE.md` §3.3'ün kapısı üç adımdır: build → hedefli süit →
**canlı DOM/konsol**. Üçüncü adım 2026-09-02'ye kadar `preview_start` +
`javascript_tool` araç çiftiyle yapılıyordu. O çift **lokal makinede vardı,
uzak oturumda yoktu** — ve §10.4 bu yüzden bir muafiyet taşıyordu: *"preview
bu oturumda yok, X sınanamadı"*.

Emre 2026-09-02'de bunu kapattı: *"Preview burada yok ancak aynı işi Playwright
ile yapalım ve tüm süreci de böyle güncelle."*

## Ne değişti

- `scripts/dogrula.mjs` — Playwright (`playwright-core` devDependency) koşucusu.
  Sunucu **değişmedi**: `previewSunucusuKur` (no-store, ETag/Last-Modified yok,
  `/sw.js` kill-switch) hâlâ tek origin'dir. Değişen İSTEMCİDİR.
- Chromium ortamdan çözülür — `chromiumYoluCoz`: `WANDERER_CHROMIUM` env →
  `/opt/pw-browsers/chromium` (uzak oturum) → sistem Chrome/Chromium →
  `PLAYWRIGHT_BROWSERS_PATH` altındaki sürümlü dizin. Sürüm numarası
  SABİTLENMEZ; Playwright her yükseltmede değiştirir, sabit yol sessizce ölür.
- `--eval` canlı sözleşme sorgusu, `--senaryo` koşulabilir doğrulama maddesi
  (emsal: `tests/senaryolar/acilis.mjs`), `--ss` kare, `--sert` uyarıları da
  ihlal sayar, `--json` makine okunur rapor.
- Kapı: `tests/dogrulama-tarayicisi.test.js` — ölçen aletin kendisi ölçülür
  (§10.5). Tarayıcı başlatmaz; koşucunun YARGISINI sınar.
- CI: `.github/workflows/kapi.yml` içinde "Doğrulama tarayıcısı (duman)" adımı.

## Üç kova — ve neden üç

| Kova | İçerik | Sonuç |
|---|---|---|
| **İHLAL** | pageerror, `console.error`, kendi origin'imizden 4xx/5xx, düşen istek | exit 1 |
| **DIŞ ORIGIN** | Supabase, Google Fonts — uzak oturumda ağ proxy arkasındadır | kırmaz, raporda adıyla görünür |
| **GÜRÜLTÜ** | dar, gerekçeli desen listesi (`GURULTU`) + ağır olmayan türler (log/info/debug/verbose) + `--izin` | tür dağılımıyla sayılır; `--json`'da TAM listelenir |

**`console.warn` gürültü DEĞİLDİR.** Bu repoda uyarı bir hata kanalıdır (§5.2:
`catch (e) { console.warn('fxSave:', …) }`, `js/` altında 305 kullanım); onu
yutan kapı uygulamanın kendi hata kanalını kör eder. `--gevsek` bu varsayılanı
tersine çevirir ve gerekçe ister.

Dış origin'i ihlal saymak kapıyı gürültüye boğardı, sessizce yutmak sahte
yeşil üretirdi. Ortası **göstermektir**. Aynı sebeple gürültü kovası JSON
çıktısında tam listelenir: yutulan şey denetlenemiyorsa filtre bir kapı değil
bir perdedir.

## Bulunan iki kırık (aynı turda)

İlk hâli senaryo bir iddiada çöktüğünde bile **"Konsol temiz."** basıyordu —
konsol gerçekten boştu, ama koşu tamamlanmamıştı. Bu, §6.2'nin yasakladığı
sahte başarının ta kendisiydi. Rapor artık koşu hatasını bilir ve o cümle
yerine *"…bu bir doğrulama DEĞİLDİR"* yazar; regresyonu testle mühürlü.

İkincisini **çapraz model denetimi** (Sonnet) buldu: koşucu `console.warn`'ı
varsayılanda yutuyordu. Kanıtı ilk harness taraması verdi —
`kumComposeFromText: sb.auth.getSession is not a function` o kanaldan çıkmış ve
kovalanmıştı. Varsayılan tersine çevrildi. (Bu ikinci kırık, §4.4'ün sandviç
gerekçesinin canlı örneğidir: yazan model kendi kör noktasından iki kez geçer —
Opus yazdı, Sonnet gördü.)

**Why:** "Konsol temiz." bu repoda bir fazın kapanma cümlesidir — bir tören
değil, bir KANIT iddiası. Cümleyi üreten mekanizma ortama bağlı olduğunda kapı
da ortamla birlikte kaybolur, ve meşru bir atlama tekrarlandıkça alışkanlığa
döner (§6.6: kapısı olmayan kural zamanla tavsiyeye döner). Tarayıcıyı repoya
bağlamak, cümleyi iki ortamda da kanıtlanabilir kılar.

**How to apply:**
- Faz sonunda üçüncü adımı koştur:
  `node scripts/dogrula.mjs --senaryo tests/senaryolar/<slug>.mjs`
  (ya da `--eval "typeof window.<fn>"`). Cümleyi **çıkış kodu** söyler.
- Plan yazarken `## Doğrulama` maddelerini koşulabilir yaz (§4.2 madde 8):
  her madde bir `--eval` ifadesine ya da bir senaryo iddiasına çevrilebilmeli.
  Koşulamayan madde bir talimattır — talimat koşulmadığında da yeşil görünür.
- Tarayıcı bulunamazsa kapı ATLANMAZ: koşucu exit 1 verir, faz kapanmaz.
  "Sınanamadı" bir kapanış hâli değildir.
- Yeni bir gürültü deseni eklerken gerekçesini yanına yaz; geniş bir gürültü
  listesi, kapıyı kapatmanın kibar yoludur.

Bağlar: [[kapi-sessiz-gec]] (boş sonuç temiz sonuç değildir — aynı sınıf),
[[claude-altyapisi-commit-disi]] (uzak oturum repoyu görür, diski değil).
