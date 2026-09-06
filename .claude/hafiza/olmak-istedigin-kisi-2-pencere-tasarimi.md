---
name: olmak-istedigin-kisi-2-pencere-tasarimi
description: "OİK (10D) UI 2.0 sil-baştan — 'Pencerenin Ardındaki Kişi'; Yeniden Tasarla butonu ölü tıklama hatası (onb-open eksik) düzeltildi; Üç Mühür kalibresinde tören"
metadata:
  node_type: memory
  type: project
  originSessionId: 10017866-7412-4190-9bf1-3c23204bf9bd
  modified: 2026-08-02T17:02:09.113Z
---

**2026-07-04 — 10D'nin UI'ı sil-baştan yeniden tasarlandı** (plan:
`.claude/plans/sharded-jingling-candle.md`), [[olmak-istedigin-kisi]]'nin (omurga/API/
şema DEĞİŞMEDİ) üstüne. Emre'nin tetiği: "Yeniden Tasarla" butonu tıklanınca ilerlemiyordu
+ tasarım içine sinmemişti; referans kalibre olarak [[uc-muhur-yol-tasarimi]]'nı gösterdi
("çok sevmiştim").

**Kök neden (ölü buton):** `oikOpenDesign()` overlay'i `onb-ritual sc-onb oik-onb` sınıfıyla
ekliyordu ama `.onb-ritual` tabanı `opacity:0` — görünürlük `.onb-open` sınıfı gerektirir
(02c/02d kalıbı, `requestAnimationFrame` ile eklenir). 10D bunu hiç eklemiyordu → tören
görünmez bir perde olarak tüm ekranı kilitliyordu + `_tOverlayOpen=true` kaldığı için ikinci
tık da yutuluyordu. Fix: `requestAnimationFrame(() => overlay.classList.add('onb-open'))`
append'den hemen sonra + `close()` içinde `onb-open` remove.

**Merkez kavram — "Pencerenin Ardındaki Kişi":** 12c'de bu kartın sahnesi zaten 'pencere';
ekran bunu mekâna çevirdi. Hub = lapis gece pencere odası (yıldız+gren+köşe-radial+`tw-*`
saat tonu + lapis→altın omurga çizgisi, yolp-scene kalıbından). Üç yüzey, tek atmosfer
motoru: **Hub** (in-view) · **Tasarım Töreni** (`.oik-onb` tam ekran) · **Okuma Portalı**
(YENİ `#oik-read-portal`, fixed `--z-ceremony`, sabah=şafak/gece=indigo atmosferi ayrı).

**Primitifler yalnız 12c'den** (paralel stil yazılmadı): `ikv-panel`/`ikv-panel--lapis`
(gren dahili), `ikv-cascade` (kademeli giriş), `ikv-seal-btn`/`ikv-ghost-btn`, `ikv-hairline`,
`ikvRing(pct,{yol:true})` (adım halkası + iki-okuma-vuruşu halkası), `ikvLantern`,
`ikvCardBack`. `css/parts/oik.css` SİL BAŞTAN yazıldı (yalnız sahne/yerleşim).

**Yeni tören unsurları:**
- **İki okuma vuruşu** (Üç Mühür vuruş dilinin kardeşi, sayaç değil): SABAH ✦ / halka /
  GECE ☾; ikisi dolunca halka "uyanır" (gold, `is-full`).
- **Adım halkası:** 4 sahnede "· N/4" metni yerine `ikvRing` yay + merkezde adım rakamı.
  Sahne 4 fener (`ikvLantern`) + yörünge kıvılcımları (jenerik spinner yerine).
- **Flip sunum:** sahne 5'te kart sırtı→yüze `rotateY` iki-aşamalı döner, sonra özet+olumlama
  kademeli süzülür (`oik-present-rest`).
- **Mühür töreni (K5, sahne 6, YENİ):** "Mühürle ◆" artık toast değil — kart üstüne altın
  mühür `--ease-spring` ile damgalanır (`oik-seal-stamp`), altın flaş, aforizma satırı,
  ~2.2sn sonra otomatik kapanış + hub'da kart tek nabız atar (`S._oik._justSealed` tek-seferlik
  bayrak, `_hubHTML` tüketir).
- **Okuma vuruş anı:** her mühürde altın flaş (`oik-rp-flash`); sabah+gece ikisi bugün
  bittiyse mini "GEÇİŞ MÜHRÜ / Günün geçişi mühürlendi. Bugün o kişiydin." anı (2.2sn,
  `_flashStrike(dayDone)`) — elmas toast'ı (ödül bildirimi) AYNEN korundu.

**i18n:** 5 yeni anahtar TR+EN (`oik.seal.kicker/line`, `oik.hub.strike_hint`,
`oik.read.day_sealed`, `oik.design.reveal`) — parite doğrulandı (86/86 oik.* anahtar TR+EN
eşit sayıda). `sc.label.*` kategori etiketleri REUSE aynen.

**Korunan sözleşmeler (değişmedi):** tüm `window.oik*` + `loadOikView` adları/imzaları,
`#oik-view`/`#oik-body`, kayıt element id'leri (`#oik-rec-btn` vb. — okuma portalı içine
taşındı ama id'ler aynı), `switchView('oik')` + arketip/gecis alias, `oikGetDesired/
oikGetContext` çıktı biçimi, KV+tablo şeması, legacy ayna, elmas/seri beslemeleri,
`imEvent('gecis_karti')`.

**Doğrulama:** `bash build.sh` temiz (198 modül) · vitest 10D 17/17 yeşil · preview'de gerçek
auth olmadan test için `#cinematic-intro`+`#auth-screen` gizlenip `#app-screen` açığa
çıkarıldı (geçici, yalnız bu oturuma özgü DOM hack — kalıcı bir test harness DEĞİL) →
boş durum (eğik kart sırtı + altın eşik ışığı) → "O Kişiyi Tasarla" tıklanınca **tören artık
görünür açılıyor** (ana şikâyet doğrulandı, `opacity` kapısı geçti) → 4 sahne + chip ekle/
sil + need_more gate + flip sunum + mühür töreni → hub'da "Önceki sürümler · 1" ile
YENİDEN TASARLA/arşivleme doğrulandı → okuma portalı sabah/gece iki atmosfer + tam-gün
mührü ("+12 Elmas · Bugünün ritüeli tamamlandı. 1 gün seri.") → mobil 375px ekran görüntüsü
temiz → konsol 0 hata.

**2026-08-02 — DÖRDÜNCÜ yüzey: Boyut Penceresi (`#oik-dim-portal`).** Emre'nin
tetiği: hub'daki dört boyut paneli madde eklendikçe sayfayı uzatıyordu (gerçek
kartta 15/15/10/15 madde ölçüldü).
- **Hub paneli artık VİTRİN:** `_dimPanelHTML` yalnız ilk `DIM_PREVIEW = 3`
  maddeyi çizer, gerisi `…` satırı (aria-hidden, kurşun noktası yok) + etikette
  toplam sayı rozeti (`.oik-dim-count`).
- **Açma düğmesi paneli KAPLAR** (stretched button): `<button>` içine `<ul>`
  koymak geçersiz HTML'dir → panel `div` kalır, `.oik-dim-open` üstüne serilir;
  klavye ve odak gerçek buton semantiğiyle çalışır.
- **Pencere** `oikOpenDimPanel(cat)`: o boyutun TAMAMI. Veil tıklaması + Escape
  kapatır, odak geldiği yere döner (`aria-modal` sözü), çift-overlay guard'ı
  **bayrağa değil DOM'a** bakar (`_dimPortalEl.isConnected` — kopmuş bayrak
  pencereyi bir daha hiç açtırmazdı; testle yakalandı).
- **Eşik köprüsünden derin bağlantı** `oikOpenDim(cat)` → `switchView('oik')` +
  380ms sonra pencereyi aç. **GOTCHA (canlıda ölçüldü):** ilk tasarım hub'da
  render edilmiş `#oik-dim-*` düğümüne `scrollIntoView` yapıyordu; o düğüm
  çağrı anında henüz DOM'da olmuyor, `if (!el) return` sessizce düşüyor ve
  kullanıcı OİK'in tepesinde kalıyordu — kapı açılıp odaya girilmiyordu. Pencere
  DOM çapasına değil **state'e** bakar (`_getActiveCard`), hub hiç render
  edilmemişken bile açılır. Regresyon: `tests/10D-olmak-istedigin.test.js`.
- Boş boyuta Eşik'ten gelinebilir (hub'da o panel hiç çizilmez) → pencere kapı
  kapatmaz, davete döner (`oik.dim.portal_empty` + tasarım CTA'sı).
- Yeni i18n TR+EN: `oik.dim.open_aria/portal_kicker/portal_empty/portal_cta`.
- Yeni export/expose: `CAT_SIGILS`, `oikOpenDim`, `oikOpenDimPanel`,
  `oikCloseDimPanel`.

İlgili: [[esik-ekrani]] (köprünün dört boyutu) · [[sahne-gogu-tek-kaynak]] ·
[[olmak-istedigin-kisi]] (omurga/API) · [[uc-muhur-yol-tasarimi]] (tasarım kalibresi
referansı) · [[tasarim-prensipleri]] · [[kart-gorsel-dili]] · [[kart-salon-dili]] ·
[[seri-muhru-toreni]] · [[esik-ekrani]] · [[build-source-convention]].
