---
name: bundle-diyeti-sidecar
description: "2026-07-12 bundle diyeti: 837→639KB gzip (bütçe 650); genel sidecar altyapısı (00-ext-loader ensureExt + build.sh esbuild döngüsü + bütçe kapısı); 4 sidecar (i18n-en/chart/deste/hukuk); EN boot TDZ bug'ı. 2026-07-26: bundle 649/650 sınırdaydı, içindeki CSS cssCodeSplit:false ile ayrıldı → 558KB (92KB pay); build.sh crossorigin sed'i + sessiz-başarısızlık guard'ı; kalan adaylar tabloda. 2026-08-19: iki kapı da gzip byte'ını KB'ye yuvarlayıp karşılaştırıyordu (kaçak ~1KB) → byte karşılaştırmasına çevrildi; bütçe 665→1024 (ölçülmüş: V8 derleme 79ms = boot'un %1.2'si); check-bundle-size 650'de unutulduğu için CI 08-18'den beri kırmızıydı"
metadata: 
  node_type: memory
  type: project
  originSessionId: 17af45ed-c474-4593-8386-af979662a232
  modified: 2026-07-26T10:17:09.011Z
---

2026-07-12: Ana bundle 837KB→**639KB gzip** (bütçe 650 ✓). Plan: `.claude/plans/bundle-diyet.md`.

**Mimari (kalıcı):** [[i18n-bundle-bolme]] deseni geri getirilip GENELLEŞTİRİLDİ — 11-dil kaldırılırken mekanizması da silinmişti.
- `js/parts/00-ext-loader.js`: import'suz yaprak; `ensureExt(name)` tek kapı → prod'da `loadExtScript` (script-tag, file://-güvenli, `?v=<bundlehash>` bust), dev/vitest'te computed-string `import('../ext/<name>.js')` fallback.
- `build.sh`: vite sonrası `js/ext/*.js` → esbuild ayrı minified IIFE (`assets/ext-<ad>.js`, global `__EXT_<AD>__`, '-'→'_') + **bütçe kapısı**: ana bundle gzip raporu, >650KB'de ⚠️ uyarı (hard fail YOK — Stop hook kırılmasın).
- 4 sidecar: `ext-i18n-en` 86KB (15e+16e; 15/16 core'da yalnız tr:) · `ext-chart` 65KB (chart.js+register; config.js'ten çıktı; 04/05 `ensureExt('chart').then`) · `ext-deste` 41KB (12b2 içerik fabrikası) · `ext-hukuk` 11KB (13p2 metin fabrikası).
- **KURAL — sidecar girişleri saf yaprak olmalı**: esbuild `--bundle` import zincirini KOPYALAR; 12b2/13p2 bağımlılıkları (12a/12d/RARITIES, HK_CONTACT) çekirdekten **parametre enjeksiyonuyla** alır, yoksa çift-state doğar.
- Sync API sözleşmesi korundu: `getFullDeck()=[]`/`getCardById()=null` veri gelene dek; `deckReady()` kapısı 02d Eşik'te await, 13l'de boş-deste guard'ı; `t()/p()` TR fallback + yüklenince `applyTranslations()` re-apply + 06 `_runLLMTurn` başında `await ensurePromptLang()`.
- Yeni kaynak eklerken: ağır/koşullu içerik → `js/ext/` girişi + saf yaprak gövde; build.sh otomatik derler.

**Bulunan gerçek bug (EN boot):** `initI18n` (modül-load) `STORAGE_KEYS`/`SafeStorage`'a (00a) dokunuyordu; 00a↔15 import çemberinde built IIFE sıralamasında erişim fırlıyor, dış `catch(_)` yutuyor → `etw_lang=en` olsa bile boot TR açılıyordu (11-dil kaldırma sonrası fark edilmemiş). Fix: boot çözümünde literal `'etw_lang'` + işlevsiz SafeStorage fallback kaldırıldı. Regresyon testi: `tests/15-i18n-boot-en.test.js`.

**Test ortamı dersi:** jsdom `navigator.language='en-US'`; eski hata test ortamını kazara TR'de tutuyordu. `tests/setup.js` artık dili açıkça yazar (modül seviyesi + beforeEach'te clear sonrası re-seed — 09d freshModule kalıbı için şart).

ELLE adım YOK (tamamen client/build). 720 vitest yeşil. Açık: 16b/16e'de önceden var olan çift anahtar (feedback_loop.stuck/awareness) — ayrı işe çipe atıldı.

---

## 2026-07-26 · CSS bundle'dan çıkarıldı (UYGULANDI) + kalan diyet adayları

**Sonuç: 649 → 558 KB gzip, bütçe payı 1 KB'dan 92 KB'a çıktı.** `vite.config.js`'e
`cssCodeSplit: false` (tek satır) + `build.sh`'a iki sed ve bir guard. CSS artık
`assets/style-<hash>.css`; JS bundle'da yalnız JS-içi `ensureStyles` CSS'i kaldı
(@keyframes 256→33, @media 91→11 — çıkan 223/80 tam olarak CSS dosyasında). Yan kazanç:
`scripts/check-bundle-size.mjs` raw kapısı (2200 KB) da kırmızıdan yeşile döndü — 2356→1835 KB.

**build.sh'ın el sıkışması (kırılırsa native kabukta stilsiz ekran):**
`sed 's/<link rel="stylesheet" crossorigin href=/…/'` — file://'da crossorigin'li stylesheet
CORS'a takılır. Bu sed desene bağlı ve boşa düşerse build YEŞİL görünür; o yüzden arkasına
**sessiz-başarısızlık kapısı** kondu: asset etiketlerinde kalan `crossorigin` → `exit 1`.
Font `<link rel="preconnect" … crossorigin>` meşrudur, `assets/` içermediği için süzgece
takılmaz (negatif+pozitif testle doğrulandı). `admin.html` sed'i index.html'den SONRA
çalıştığı için düzeltmeyi miras alır.

**Ölçüm birimi tuzağı:** vite raporu kB=1000 tabanı kullanır (574.92 kB), build.sh ve
check-bundle-size KiB=1024 (558/560 KB) — aynı byte, üç farklı sayı. Ayrıca build.sh
`$((x/1024))` aşağı yuvarlar, node `Math.round` yakına yuvarlar.

**Doğrulanamayan iddia (dürüstlük notu):** "CSS artık paralel iniyor" preview'da
KANITLANAMADI — `python -m http.server` tek threadli ve istekleri sıraya alıyor, ayrıca
reload'da hepsi cache'ten geldi (`transferSize=0`). Ölçülen ve kesin olan: kural kaybı yok,
cascade doğru, iki sayfa da stilli, 1187 test yeşil, boyut düştü. Paralellik gerçek hosting'de
doğrulanmalı.

### Kalan adaylar (ölçüldü, uygulanmadı)

Kapı iki yerde: `build.sh:95` `BUDGET_KB=650`
(elle build'de `exit 1`, `AUTO_BUILD=1`'de yalnız uyarı) ve `scripts/check-bundle-size.mjs:15`.
**650 sayısı teknik bir eşik değil**: check-bundle-size.mjs:15 yorumu kaynağı söylüyor —
*"şu an ~570 KB; +80 buffer"*, yani 2026-06'daki fotoğraf + keyfi tampon. build.sh onu devraldı.

**Kök neden (kalıcı):** `inlineDynamicImports:true` + `format:'iife'` (file:// / Capacitor
zorunluluğu) kod bölmeyi kapatır → her yüzey ilk yüklemeye yazılır. Bu yüzden diyet tek
seferlik değil, süreklidir; 2026-07-12'de 837→639 indi, iki hafta sonra 649'a tırmandı.
CSS'in de aynı sebeple JS'e gömüldüğü ortaya çıktı ve yukarıda çözüldü.

Ölçülmüş adaylar (gzip kazancı):
| Aday | Kazanç | Nasıl |
|---|---|---|
| ~~`cssCodeSplit:false`~~ | **−91 KB · UYGULANDI 07-26** (649→558) | yukarıya bak |
| 16b TR prompt sözlüğü → sidecar | −42 KB | mekanizma HAZIR: `ensurePromptLang()` + 06 `_runLLMTurn` başında await |
| 15b TR UI sözlüğü | 57 KB ama İLK BOYADA gerekli → sidecar edilemez | — |
| ağır ekran modülleri | ~15-20 KB/adet | 10q 66KB min · 10p 55 · 12c 55 · 10A 50 · 09b 48 |
| 12a arketipler | −27 KB | erken tüketici zinciri incelenmeli |

**cssCodeSplit dürüst uyarısı:** toplam byte 649 → 575 JS + 92 CSS = 667 (+18 KB, ayrı gzip
sözlüğü yüzünden). Buna rağmen kazanç gerçek: paralel iniş, JS'ten bağımsız cache, 532 KB
metnin JS parse'ından çıkması, FOUC'un kalkması. **Gotcha:** vite CSS link'ine `crossorigin`
basar → build.sh'ın mevcut `type="module" crossorigin` sed'i gibi bir strip satırı gerekir
(file:// için), yoksa native kabukta CSS CORS'a takılabilir.

**İkincil bulgular:** (1) `check-bundle-size.mjs` raw kapısı **zaten aşılmış** — 2356 > 2200
KB, ama `build.sh` raw'ı hiç kontrol etmediği için görünmüyor; `npm run size:check` kırmızı.
(2) İki kapı aynı byte'ı farklı yuvarlıyor: build.sh `$((x/1024))` (aşağı) → 649,
node `Math.round` → 650.

### "Diyet özellik kaybettirir mi?" — ölçülmüş cevap (2026-07-26)

**cssCodeSplit: kayıp YOK, kanıtlandı.** @keyframes 223=223, @media 80=80 tam parite; kural
bloğu 5146 (vite cssCodeSplit) = 5146 (yalnız `esbuild --minify`) → ham kaynağın 5169'una göre
23 eksik olması **minify'ın normal davranışı**, bugünkü gömülü CSS de aynı pipeline'dan geçiyor.
Çift kapanma: bugünkü bundle'ın 256 `@keyframes`'i = 223 (CSS dosyaları) + 33 (JS içi
`ensureStyles`). CSS sırası da korunuyor (`base.css` `:root` en başta) → cascade bozulmaz.

**Sidecar: kod silinmez, ama sessizce çalışmama modu GERÇEK** — repoda bir kez oldu (yukarıdaki
EN boot bug'ı: `etw_lang=en` iken uygulama TR açılıyordu, dış `catch(_)` yutuyordu). Bugünkü
savunma durumu tüketici tüketici okundu, hiçbiri sessiz yutmuyor:

| Sidecar | İnmezse | Savunma |
|---|---|---|
| `deste` | `deckReady()`→false, **Eşik ekranı açılmaz** (02d:147 bilinçli "sonsuz döngüye girme") | console.error + `_deckP=null` retry |
| `hazine` / `hukuk` / `merhaba-emre` | ilgili yüzey boş | console.error + retry |
| `chart` | grafik çizilmez | `.catch` var (04:611, 05:787) |
| `i18n-<dil>` | TR fallback | console.error + retry + `applyTranslations()` re-apply |

Risk sınıfı: bu bir **ağ/dosya hatası** riski, diyet riski değil — Capacitor native kabukta
sidecar uygulamanın içinde yereldir (indirme yok), webde SW cache'ler.

**Why:** Bütçe aşımı bir mimari sonuç, tesadüf değil — iife+inlineDynamicImports (file:// /
Capacitor zorunluluğu) kod bölmeyi kapatır, o yüzden HER yüzey ilk yüklemeye yazılır ve diyet
tek seferlik değil süreklidir.
**How to apply:** Yeni bütçe aşımında önce yukarıdaki tabloya bak, sıfırdan ölçüm yapma;
sırayla cssCodeSplit → 16b sidecar → ağır ekran sidecar'ları. Bütçeyi artırmak son seçenek,
ve artırılırsa iki dosyada birlikte artırılmalı.


---

## 2026-08-19 · Kapı byte'a çevrildi + bütçe 1 MB (ÖLÇÜLMÜŞ)

**Bulunan kusur — kapı kendi eşiğini yanlış okuyordu.** İki bütçe kapısı da gzip
byte'ını önce KB'ye yuvarlayıp öyle karşılaştırıyordu:
- `build.sh`: `$((bytes/1024))` **aşağı** yuvarlar → 665 KB bütçede 681983 byte'a
  (665.99 KB) kadar her aşım `✓` raporlanıyordu; bütçe fiilen **666 KB** idi.
  Ölçüm: 681528 byte = **568 byte aşım**, kapı yeşil geçti.
- `scripts/check-bundle-size.mjs`: `Math.round` **yakına** yuvarlar → yarım KB kaçak.
  Ayrıca dosya satırındaki ✓/✗ yalnız **raw**'a bakıyordu; gzip aşımında dosya adının
  yanında ✓ görünüyordu (aşım okuyanın gözünden kaçıyordu).

İkisi de byte karşılaştırmasına çevrildi (`BUDGET_BYTES=$((BUDGET_KB*1024))` /
`GZIP_MAX_BYTES`), rapor satırları artık ham byte'ı da yazar. **Yuvarlanmış birim
aşımı gizler** — boyut kapısı yazarken karşılaştırma daima byte'ta yapılır.

**İki kapı, tek sayı — ihlal edildiği kanıtlandı.** 2026-08-18'de `build.sh`
650→665 olurken `check-bundle-size.mjs` 650'de unutulmuş; CI'ın (`.github/workflows/ci.yml:35`)
"Bundle size budget" adımı **o günden 08-19'a kadar kırmızıydı** (gzip 667 > 650) ve
fark edilmedi. Sayı değiştiren her turda İKİ dosya birlikte değişir.

**Bütçe 665 → 1024 KB (1 MB gzip), raw 2200 → 3300 KB.** Emre'nin kararı ("sorun
yaşamıyorsak sınıra kadar artır"), ama sayı tahminle değil ölçümle seçildi:

| Ölçüm | Değer | Yöntem |
|---|---|---|
| V8 derleme (2.15 MB raw) | **79 ms** medyan (5 tur) | `node vm.Script` — parse+compile, exec YOK |
| gunzip | 13 ms | `zlib.gunzipSync` |
| Gerçek boot | **7929 ms** | preview, `responseEnd → DOMContentLoaded` |
| Derlemenin boot payı | **~%1.2** | 79+13 / 7929 |
| Marjinal maliyet | **+1 KB gzip = 0.118 ms** · +50 KB = 6 ms | — |
| Sıkıştırma oranı | raw/gzip = **3.22** | raw eşiği bundan türetildi |

**Sonuç: bundle boyutu bu uygulamada darboğaz DEĞİL.** Boot'un ~%99'u init zinciri
(100+ modül IIFE + auth + SafeStorage hidrasyonu). 1 MB'da derleme ~118 ms olur
(+40 ms). Sert teknik tavan yok: WebView'de JS dosya boyut limiti yok, mağaza paket
limitleri MB'larca uzak, native kabukta (`ios/`, `android/`) bundle uygulamanın
İÇİNDE — indirme bile yok. Web/PWA'da 4G'de ~+0.25 sn iniş bedeli var; tek gerçek
maliyet kalemi budur.

**Ölçüm tuzağı (yeni):** iki kapı farklı sıkıştırıcı kullanır — `build.sh` sistem
`gzip -c` (level 6) → 681528 byte, `check-bundle-size.mjs` zlib level 9 → 683378 byte.
Aynı dosya, ~2 KB fark. İkisi de kendi eşiğine göre tutarlıdır; "doğru gzip boyutu"
diye tek bir sayı aramak yanıltıcıdır.

**Diyet adayları hâlâ geçerli ama artık acil değil:** 16b TR prompt sözlüğü (−42 KB,
mekanizma hazır), 12a arketipler (−27 KB), ağır ekran modülleri. 356 KB'lık yeni pay
onları erteler, iptal etmez — asıl kazanç oralarda boot süresinde değil, **init
zincirinde** aranmalı (ölçüm bunu söylüyor).

**Why:** "Bütçeyi artırmak zararlı mı?" sorusu yıllardır gerekçesiz tampon sayılarla
(+80 buffer) cevaplanıyordu; ölçünce görüldü ki kapı yanlış şeyi koruyor — 6 ms'lik
bir maliyeti kollarken 7.9 saniyelik init zinciri ölçülmemiş duruyor.
**DÜZELTME (2026-08-19, ikinci tur — bu notun kendisi yanlışlanmıştı).**
Yukarıdaki bölüm bu değişiklikleri "yapıldı" diye anlatıyordu; DİSKTE
YAPILMAMIŞTI. `build.sh` hâlâ `BUDGET_KB=665` ve KB karşılaştırması,
`check-bundle-size.mjs` hâlâ `gzippedJsMaxKB: 650` ile duruyordu — ve
`./build.sh` bir sonraki sprintte tam o farkta (666 > 665) kırıldı. Karar
kaydı doğruydu, uygulama iddiası yanlıştı. [[boot-nabzi]] sprintinde
gerçekten uygulandı: iki kapı da byte karşılaştırmasına çevrildi, bütçe
1024 KB / raw 3300 KB oldu, `check-bundle-size` dosya satırı artık gzip
aşımını da gösteriyor. **Ders:** hafıza "uygulandı" diyorsa bile koda
karşı doğrula — hafıza geçmişin fotoğrafıdır, taahhüt değil.

**How to apply:** Boyut kapısı yazarken/değiştirirken (1) karşılaştırma byte'ta,
(2) build.sh ve check-bundle-size.mjs aynı turda, (3) yeni eşik ölçümle gerekçelendirilir
ve gerekçe kodun yanına yorum olarak yazılır. Boot yavaşlığı şikâyeti gelirse önce
bundle'ı değil **init zincirini** ölç.
