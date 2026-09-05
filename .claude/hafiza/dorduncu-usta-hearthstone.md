---
name: dorduncu-usta-hearthstone
description: "Dördüncü Usta: Hearthstone (beklenti ışığı + üç kapı + sırt koleksiyonu + canlı kart + ocak + kademeli emel) — 2026-07-29 ALTI FAZIN TAMAMI UYGULANDI; plan .claude/plans/dorduncu-usta-hearthstone.md"
metadata: 
  node_type: memory
  type: project
  originSessionId: 551f08ec-2933-4080-b7d7-3d1e1db6e819
  modified: 2026-08-07T15:14:27.487Z
---

**2026-07-29:** Emre "Üç Usta"nın ([[uc-usta-tek-deste-plani]]) yolunu
Hearthstone için istedi: araştır, damıt, planla. Plan yazıldı, onaylandı
("Onaylıyorum") ve **altı fazın tamamı aynı turda uygulandı**. Planla kod
arasındaki 8 sapma plan dosyasının başındaki "Uygulama notları"nda.

**Merkez kavram — "Han sensin."** Hearthstone'un dehası mekanik değil MEKÂN:
ocaklı bir han, kapıda seçim, sırtta kimlik. Beklenti, seçim ve prestij o
sıcaklığın içinden doğar.

## Kalıcı olan (kod haritası)

| Ne | Nerede | Anahtar |
|---|---|---|
| Beklenti ışığı (flip'ten ÖNCE nadirlik) | 10q `kkEnsureStyles` + 12f fan | `.kk-fan-card::after`, `--rar`, `--bekle-min/max`, `kkBekle` |
| Üç Kapı (Keşfet) | **10q4** | `olusKapiSec`, `olusKapiKanit`, `olusKapilarAc`, `_sahneKapilar`, `_davetIzi`, `_elendi` |
| Kapı promptu (tek turda N kart) | 16b/16e | `prompt.olus.kapi_system` / `kapi_user` |
| Sırt koleksiyonu | 12c katalog + 10q sahiplik | `SIRTLAR` (fener/tac/yol/ufuk/meshale), `_backId`, `.ikv-back--*`, `--bk-ink` |
| Sırt API | 10q | `kkSirtSecili` (12c'nin TEK köprüsü), `kkSirtKazan`, `kkSirtSec`, `kkSirtSahip` |
| ~~Canlı kart~~ → **Altın Kart** | 12c + 10q | **2026-08-07 GÜNCELLENDİ:** `opts.live`/`--live` EMEKLİ — hareket artık her kartın tabiatı ([[yasayan-kart-motoru]]). Ölçüt aynı, adı ve ödülü değişti: `kkCanliMi`→`kkAltinMi`, `.kk-card3d--altin` (altın kenar + `--foil:1`) |
| Ocak (hanın ateşi) | 10q `kkHallHead` + 13e | `kkOcakHTML`, `.kk-ocak`, `fxAmbientAcik()` |
| Kademeli emel | 10q | `kkEmelKademeler`, `kkDetectEmelKademe`, `emeller[cat].kademe` |

**Why:** Sistem güçlüydü ama hanın dramaturjisi eksikti — paket beklentisiz
açılıyor, davet tek kart uzatıyor, deste tek sırt taşıyor, en derin kartlar
bile kıpırdamıyordu.

## How to apply (bu turda öğrenilenler)

- **Renk gerçeği plandan değil destedan gelir.** Plan nadirlik renklerini
  keyfî eşlemişti; repo'nun kendi `RARITIES` tablosu (nadir mavi · nadide
  altın · efsane mor) her yerde kullanılıyor. Merdiven RENKTE değil
  YOĞUNLUKTA kuruldu — aynı nadirlik kartın kenarında ve künyesinde aynı renk.
- **CSS template literal'i içindeki YORUMDA backtick YASAK** — build'i
  sessizce değil, parse hatasıyla kırar (`12c ikvEnsureStyles`, bu turda
  yaşandı ve düzeltildi).
- **`animation:none` + reduced-motion'da opacity ELLE VERİLMEZ** — eğer
  öğenin kendi opaklığı SVG presentation attribute'undaysa. `.kk-fan-card`
  emsali tersini söyler (orada base opacity:0'dır); yıldızlarda `opacity:1`
  yazmak gökyüzünü düzleştirirdi.
- **`z-index:-1` yerine kardeşi öne al.** Beklenti ışığı `::after`'a
  `z-index:-1` verilirse reduced-motion'da (transform silinince stacking
  context düşer) tüm sahnenin arkasına kaçar; çözüm `.kk-fan-inner{z-index:1}`.
- **Tören sahnesine HER ZAMAN kapanış yolu.** `_olusOpen` yalnız kapanış
  akışında düşer; Escape'siz bir sahne sonraki bütün törenleri kilitler
  ([[olus-muhru-2-muhru-sen-basarsin]] gotcha'sının ikinci kez ısırması).
- **Kademe/ilerleme kayıtları SEÇİM anından sayılır**, koleksiyonun o anki
  hâlinden değil — yoksa geçmiş kutlanır.
- Elmas ekonomisi DEĞİŞMEDİ: kademe geçişleri toast + `milestone2`, ödeme
  yalnız emelin tamamında (`KK_EMEL_ELMAS=25`) ve yalnız canlı kazanımda.
- Bundle 585 → 590 KB gzip (bütçe 650). Testler 1408 → **1454** (46 yeni).

**Bekleyen ELLE iş:** yok yeni. `sirtlar`/`sirtSecili`/`kademe` Üç Usta'dan
bekleyen `kisi_karti_profile.yapi JSONB` blobuna biner — uygulanmadan da
kırılmaz (42703 yakalanır, veri IndexedDB'de yaşar).

**Doğrulama gotcha'sı (yeniden doğrulandı):** python http.server + tarayıcı
ES modül cache'i — `?v=` yalnız HTML'i tazeler, MODÜLLERİ tazelemez; yeni
sekme de yetmez (cache origin başına). Her modül turu için **yeni port**
gerekir; preview tek origin `localhost:3030` kökü servis eder. HTML-only
değişiklikte `?v=` yeterli.

**Harness büyüdü** (`kisilerim-test.html`, build'e girmez): "Hazine ·
yelpaze", "Oluş · üç kapı", "Sırtlar · beşini kazan" düğmeleri + sırt
galerisi + `#toast` kabı + `_harnessDeck`/`_harnessSetMertebe` köprüleri.

İlgili: [[uc-usta-tek-deste-plani]] · [[olus-muhru-karari]] ·
[[olus-muhru-2-muhru-sen-basarsin]] · [[hazine-destesi-kart-paketleri]] ·
[[kart-gorsel-dili]] · [[his-motoru-2-0]] · [[kisilerim-kart-motoru]] ·
[[uc-ana-renk-lapis]] · [[llm-bicimleri-geri-sizar]]
