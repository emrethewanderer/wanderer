---
name: deste-12-kesit-karari
description: "KARAR 2026-08-07: deste 112→12 kart; kesit MEKANİĞE göre seçildi (evrim/sentez/panzehir/canlı kart ayakta); nadirlik 5·4·2·1; ölçekleme kapısı tests/12b-kesit-mekanikleri.test.js"
metadata: 
  node_type: memory
  type: project
  originSessionId: 702c7968-c9e3-4686-a0a7-273183e59a73
  modified: 2026-08-07T15:15:14.126Z
---

Emre'nin kararı (2026-08-07): **kartların adedi 12.** Gerekçe onun kendi
cümlesi — *"kartlar üzerine çalışma yapma niyetim var ve tam çalışma yapmadan
kartların adedini ölçeklemek istemiyorum."* Deste 112 karttı ve içerik tek tek
çalışılmadan ölçeklenmişti; önce kartların kendisi çalışılacak, ölçek sonra.

**Why:** Kesit rastgele değil. 10q'nun dört motoru destedeki kart
İLİŞKİLERİNDEN beslenir ve **hepsi savunmacıdır** — malzeme yoksa kod kırılmaz,
motor SESSİZCE susar. Emre'ye üç seçenek sunuldu (salt çekirdek · erdem ekseni ·
mekanikleri yaşatan kesit); **"mekanikleri yaşatan kesit"** seçildi, kalan 100
kart **dosyadan silindi** (git tarihinde: commit `e6de018`), nadirlik yeniden
dengelendi.

## Yayınlanan 12 kart (js/parts/12b2-deste-icerik.js)

| Mekanik | Kartlar |
|---|---|
| **EVRİM** | `temel-ozsevgi-filiz/kok/tac` + `temel-ozsaygi-filiz/kok/tac` (iki tam hat) |
| **SENTEZ** | `bilesik-ozsaygi-ozsevgi` — malzemesi iki hattın kendisi |
| **PANZEHİR** | `tuzak-kusursuz` (ozsevgi) + `golge-onay` (ozsaygi); ışıkları hatlarda |
| **ALTIN KART** | tek efsane `temel-ozsevgi-tac` (`kkAltinMi`'nin taşıyıcısı — 2026-08-07'ye kadar adı "canlı kart"/`kkCanliMi` idi, bkz. [[yasayan-kart-motoru]]) |
| **Omurga** | `niyetli` · `sabirli` · `durust` (12a'dan; hiçbir mekaniğe malzeme değil) |

**Nadirlik: 5 yaygin · 4 nadir · 2 nadide · 1 efsane.** 112'lik destenin
dağılımı (yaygin 2) 12 kartta erken kullanıcıya yalnız 2 kart bırakıyordu —
[[olus-muhru-2-muhru-sen-basarsin]] ikna kapısı (IKNA_ORAN .85) erken profilde
yalnız *yaygın* kartları açar, tören sönerdi.

**Erdem ekseni 5'e indi:** ozsevgi · ozsaygi · niyet · sebat · durust.
VIRTUE_META de bu beşe kırpıldı.

## How to apply

- **Ölçeklerken kapı: `tests/12b-kesit-mekanikleri.test.js`.** Kart eklemek
  serbest, bir motoru malzemesiz bırakmak değil — dosya her motorun malzemesini
  ayrı ayrı mühürler (evrim zinciri kopmaz, sentezin iki erdemi de temsilcili,
  her gölgenin ışığı destede, en az bir efsane).
- **Kesit sayısı artık SÖZLEŞME:** `getFullDeck().length` testlerde `toBe(12)`
  (eskiden `>=100` idi). Tek kart eksilirse bir motor sessizce susar.
- **12a'nın 12 arketip verisi yerinde durur**; `CEKIRDEK_RARITY` haritası
  hangisinin destede yayınlandığını söyler — ölçek büyürken kapı orasıdır.
- `EMRE_ONERI` (12a) rotası kesite taşındı: `temel-ozsevgi-filiz` (yumuşak) →
  `temel-ozsaygi-kok` (pick) → `temel-ozsevgi-tac` (uzak dur). Ölü alanlar
  `konum`/`gerekce` silindi (10q zaten atlıyordu).

## Bu turda yakalanan kırık (112'likte de vardı, kesitte görünür oldu)

**Çekirdek kartın `virtue` alanı ile reçetesi ayrışıyordu.** `buildCekirdek`
reçeteyi `CEKIRDEK_VIRTUE_MAP`ten kuruyor ama kartın `virtue`'sunu 12a'nın ham
değerinden bırakıyordu — 12a'da `niyetli` de `sabirli` de `virtue: 'sebat'` der.
Sonuç: `niyet` erdeminde hiç kart yok sayılıyordu ve `kkErdemTemsilcisi`
(sentez/panzehir malzemesi `card.virtue`ya bakar) kartı bulamıyordu. Harita
artık karta da YAZILIYOR; regresyon kapısı kesit testinde ("her kartın erdemi,
o erdemin temsilcisi aranınca kendini bulur").

## Canlı doğrulama (preview, 2026-08-07)

`kisilerim-test.html` salonunda: **"12 / 12 KİŞİ TOPLANDI · YAYGIN 5/5 ·
NADİR 4/4 · NADİDE 2/2 · EFSANE 1/1"**; kategori sekmeleri tam beş (UI yalnız
DOLU kategorileri gösteriyor — 12b `CATEGORIES` sözlüğünde duran kullanılmayan
girdiler ekrana sızmıyor). Kartlar 001–012 sırayla açılıyor, künye `007 / 12`
(`noTotal` padStart EDİLMEZ — Pokémon set dili). Silinen bir id (`gercek-
bireysel-ozsaygi`) `kkOpenDetail`'de sessizce açılmıyor. Dört motorun canlı
nişanı: `⟵ ÖZ SEVGİ · SPROUT` (evrim) · `kk-det-panzehir is-open` ·
`kk-det-sentez ikv-panel` · efsane foil (canlı kart). Konsol temiz.

**Preview kotası gotcha'sı:** `preview_start` "5 dev server per folder"a
takılırsa sunucular gerçekte **5185–5189** portlarında çalışıyor olabilir
(repo KÖKÜNÜ servis ederler, `dist`i değil). Yeni sunucu başlatmak yerine
`preview_start({url:'http://localhost:5188/...'})` ile bağlan; SW bayatlığı
için önce unregister + caches.delete, sonra BAŞKA porttan aç
([[preview-sw-bayat-modul]]).

Bkz. [[kisilerim-kart-motoru]] · [[olus-muhru-2-muhru-sen-basarsin]] ·
[[kart-gorsel-dili]] · [[bundle-diyeti-sidecar]] (ext-deste 41KB→6KB gzip)
