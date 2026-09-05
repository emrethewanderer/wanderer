---
name: vasita-banner-kitaplik-haberi
metadata: 
  node_type: memory
  type: project
  originSessionId: e9fbc810-1596-4b5e-a193-e440679a8641
---

Eski `#vasita-banner` (Vasıta-tuzağı uyarısı) 2026-06-14'te emekli edildi; yerine
İKİ AYRI duyuru kanalı geldi (10g-w2-wanderer-game.js, Bugün ekranı):

**A) DUYURU ALT-SAYFASI** — Emre admin "Duyuru"dan MANUEL mesaj gönderir; kullanıcı
**"Anladım"** ile kapatır. Kitaplık'tan BAĞIMSIZ. **2026-06-14 mimari değişiklik:**
eski inline bandlar (`#announce-banner` Bugün yatay band + `#llm-announce` Wanderer
mührlü not) EMEKLİ; duyuru artık **Kitaplık gibi alttan kayan bir portal**
(`#announce-sheet-portal`, 10g `announceSheetOpen()`) — body'ye eklenir, hangi
ekrandaysa (Bugün / Wanderer) onun ÜSTÜNE biner. Tek yüzey, tek damga; ücretsiz
kullanıcı ön yüzde kalsa da görür. Kimlik (2026-06-15 Tasarım Prensipleri'ne göre
yeniden tasarlandı → "mühürlü mektup"): nefes alan yuvarluk altın mühür portresi
(announceSealBreath) + tepe altın ışık şeridi + "EMRE'DEN" Cinzel kicker +
serif-display mesaj + EB Garamond italik **"yol arkadaşın" imzası** (eriyen kıl
ayraç üstünde — dört sesli koroyu tamamlar) + dövülmüş-altın "Anladım" CTA
(inset üst ışık + glow + scale(.93)). Yüzey: kâğıt greni (`--grain-img` ::after,
blend yok) + iki kutuplu atmosfer (tepeden altın, sol-alttan lapis) + `tw-*`
zaman tonu (akşam ısınır / gece lapis derinleşir). Giriş `--ease-out` + kademeli
`announceRise`; tüm anim. reduced-motion korumalı. Erişim: 44×44 kapat hedefi +
Esc ile kapat + açılışta CTA'ya odak. CSS `.announce-sheet*` **wanderer-game.css**
(eski `.ws-announce*` yerine; lib-sheet keyframes `libSheetIn/Out/libVeilIn`
paylaşılır). `llm-shell.css §3c` kaldırıldı.
- 10g `checkAdminAnnouncement()` → yeni mesaj varsa `announceSheetOpen()`; `announceAck()` (Anladım / veil / ✕) kapat + damgala. Per-uid damga `etw_announce_seen_<uid>` (=updated_at; leksikografik kıyas). `_announceRetries` (4×) tören/splash/başka-sayfa çakışmasında bekler.
- **Ön yüz tetiği:** 10y `_checkWandererAnnounce()` → `switchViewHooks.after` ön-yüz (chat) inişinde `checkAdminAnnouncement()` + `checkLibraryUpdate()` koşar; YALNIZ `_shouldHome()` (temiz ana ekran) + post-auth + auth kapalıyken. Boot landing `switchView('chat')` da tetikler (10g dinamik import). Studio'ya özel DEĞİL.
- **Ortak `_sheetBlocked()`** (eski `_libBlocked`): tören/onboarding/splash/fgate + aktif view bugun/chat olmalı + **iki sayfa birbirini de engeller** (announce-sheet ↔ lib-sheet üst üste binmez; engellenen 3.5s'de retry). Duyuru her iki tetikte de Kitaplık'tan ÖNCE çağrılır → öncelik onda.
- Admin: `renderLibraryBannerAdmin()`/`saveLibraryBanner()` (isimler eski, anlam=duyuru).

**B) KİTAPLIK ALT-SAYFASI** — Kitaplığa yeni içerik eklenince **OTOMATİK** alttan
kayan sayfa (`libSheetOpen`, manuel tetik yok). Akşam Kapanışı ile akraba ama KENDİ
kimliği: **altın/kitap** ekseni (Akşam = lapis/ay) — altın tepe şeridi, açık-kitap
SVG, altın kitap-sırtı item işaretleri, altın dolu "KİTAPLIĞA GİT" CTA.
- `checkLibraryUpdate()` (knowledge_base created_at vs `etw_library_seen_<uid>`;
  ilk açılış sessiz; `_libBlocked()` ile tören/splash çakışmasında 4× retry).
  **Wanderer ekranında DA çıkar:** portal `position:fixed` → body'ye eklenir,
  `_libBlocked()` `bugun-view` VE `chat-view`'a izin verir; ön-yüz tetiği (yukarı,
  10y `_checkWandererAnnounce`) `checkLibraryUpdate`'i Bugün'le aynı anda koşar.
- `markLibrarySeen()` damgala+kapat (10h loadLibrary'den de). `libraryUpdateGo()` Kitaplığı aç.
- CSS: `.lib-sheet-*` **wanderer-game.css**'te (aksam.css'ten taşındı).

**Admin:** `switchAdmin('library-banner')` → `page-library-banner`. ADMIN_TITLES['library-banner']='Duyuru'.
Tablo: `library_announcement` (id=1, header_text=mesaj, active, updated_at) —
migration `020_library_announcement.sql` ELLE ÇALIŞTIR; yoksa fallback (band çıkmaz).

**GOTCHA:** `checkVasitaTrap`/`vasitaAck`/`vasitaTrap` state TAMAMEN kaldırıldı; prompt
katmanındaki `vasita_warning` (09b/16b) farklı/korundu. CSS: wanderer-game.css?v=2, aksam.css?v=3.

**KİTAPLIK OKUR — 2026-06-20:** Kitaplık'ın asıl yüzeyi yeniden tasarlandı; eski
`muhrum-kitaplik` sekmesi (Mühürler > KİTAPLIK 152 sebep-sonuç listesi) `_src.html`
ve `loadMuhrumView` dahil KALDIRILDI. Yeni yüzey **10g · libOpenReader(startIdx?)**:
12 Mühür iç tasarımının (`_mrRenderDetail` / 10v) tüm `mr-*` portal sınıflarını
yeniden kullanır — `.mr-portal/.mr-scene/.mr-card/.mr-roman→yok yerine altın kitap
sigili (`_BOOK_SIGIL_BG`)/.mr-name-label=tarih/.mr-title/.mr-divider/.mr-summary
.mr-summary--lib(düz, scrollable)/.mr-detail-nav ÖNCEKİ ← № SONRAKİ →`. Erişim:
sohbet drawer alt kuşağında profil satırının SAĞINDA `.ch-drawer-library` altın
kitap düğmesi (yeni `.ch-drawer-profile-row` flex wrapper) → drawer'ı kapatır,
`libOpenReader()` çağırır. Sıralama: `created_at` DESC (en yeni başta); ÖNCEKİ
idx-1 (idx 0'da disabled), SONRAKİ idx+1 (daha eski yazı). Bağlamsal "Kitap
Alıntısı" + "İçsel Hava" lesson kartları (10-features-w2 `_renderLessonCard` +
`w2InjectContextualLessonCard`) artık doğrudan `libOpenReader(idx)` çağırır
(eski `EventBus navigate→muhrum→muhrum-kitaplik tab` zinciri ÖLDÜ). 10s
`glOpenLibraryFromGift` armağan→ilgili yazı köprüsü de `libOpenReader(0)`'a
yönlendirildi (`switchView('library')` view'i artık hiçbir yerde tetiklenmiyor;
`_src.html` zaten DOM'unu içermiyordu → `loadLibrary()` no-op kaldı, 10h içinde
duruyor). Otomatik bottom-sheet (`libSheetOpen`) ve `markLibrarySeen` damgası
KORUNDU; "KİTAPLIĞA GİT" CTA artık `libOpenReader(0)`'ı açar. CSS
`manifesto-reader.css`'e `.mr-card--lib + .mr-summary--lib` eklendi (scrollable
kitap kartı). main.js'te export + `Object.assign(window)` köprüsü.

**KİTAPLIK OKUR CİLA — 2026-06-20 (2. tur):** Üç düzeltme (`manifesto-reader.css`
+ `chat.css` + `_src.html`):
1. **TEPE KIRPMA BUG'I** — `.mr-card` `justify-content:center` (kısa manifesto için
   doğru) UZUN yazıda içeriği dikey ortalıyor → başlık + ilk paragraflar kartın
   üstünden taşıyor ve `scrollTop:0` olduğu için **ULAŞILAMIYOR** (kullanıcı yazının
   ortasında açılıyor, başlığı asla göremiyor). Fix: `.mr-card--lib{justify-content:
   flex-start; padding-top:30px}` → tepeden başlar, tüm yazı doğal kayar. Preview
   ile doğrulandı (14 paragraf: başlık titleTop -224px→+53px, scrollTop 0).
2. **TİPOGRAFİ UYUMU** — başlık Cinzel yazıt-kapitalleriydi (uzun düz-yazı
   başlığında ağır + kartla uyumsuz). `.mr-card--lib .mr-title` artık alt-sayfayla
   (lib-sheet) aynı **serif-display (Fraunces) 23px, text-transform:none, doğal
   küçük-harf**; gövde `.mr-summary--lib` 14→15px, line-height 1.78. name-label +
   divider boşlukları flex-start'a göre ayarlandı. (Global `.mr-title` DOKUNULMADI →
   manifesto/mühür okuru korunur.)
3. **DRAWER PROFİL SATIRI** — eski `.ch-drawer-library` `border-left + width:56px`
   ile bandı **kesip** sağa ayrı kutu açıyordu ("Wanderer Movement" bölünmüş
   görünüyordu). Emre: "orayı bütün koru, sağına SEMBOL koy." Fix: border/kutu/bg
   kaldırıldı → kitap artık sessiz altın **bütünleşik sembol** (opacity .62, hover
   1+scale; 22→20px ikon). `.ch-drawer-profile-caret` (›) markup+CSS'ten TAMAMEN
   kaldırıldı (sembolle çift-glif kalabalığı olmasın); profil bandı tek parça,
   tamamı hâlâ Gezgine Mektup'u açar. 384 test geçti, build temiz.

**TASARIM-PRENSİBİ UYUM CİLASI — 2026-06-20 (3. tur):** Hem `.ch-drawer-library`
düğmesi hem Kitaplık okuru [[tasarim-prensipleri]]'ne TAM uyumlandı (`chat.css` +
`manifesto-reader.css` + 10g JS):
- **Düğme (chat.css):** `:focus-visible`'daki `outline:none` KALDIRILDI — global altın
  klavye odağını (base.css) gizliyordu (P9 ihlali). `transform … var(--ease-out)` (P5
  ev eğrisi) + `min-width/height:44px` (P9) + `@media (prefers-reduced-motion)` ölçek
  sönümleme (P5).
- **Okur (manifesto-reader.css):** sahneye yeni **`.mr-scene--lib` modifier** eklendi
  (JS `_libRenderReader` markup'ına da) → **lib-kapsamlı override deseni**; manifesto/
  mühür okuru ETKİLENMEZ. `.mr-card--lib`: `border-radius:var(--radius-lg)` (P6 cömert
  köşe — eskiden KESKİN) + iki-kutuplu köşe radial'i (altın 100%0 / lapis 0%100,
  P3 atmosfer). `.mr-scene--lib`: alttan sıcak ufuk + lapis derinlik radial'i (P2/3,
  düz `var(--bg)` yerine). `.mr-scene--lib .mr-nav-btn{min-height:44px;radius-full}` +
  `.mr-close{44×44}` (P9 + P6 pill). Paylaşılan `mr*` animasyonları `ease`→`var(--ease-out)`
  (P5) + dosyaya İLK KEZ `@media (prefers-reduced-motion)` bloğu (P5 "istisnasız", yoktu).
- **Türkçe büyük-harf tuzağı (P4):** tarih etiketi CSS `text-transform:uppercase`
  noktasız-ı üretiyordu (NISAN ✗). Fix: `.mr-card--lib .mr-name-label{text-transform:
  none}` + JS'te `dateStr.toLocaleUpperCase('tr-TR')` → "20 NİSAN 2026" doğru İ.
- Build temiz, konsol hatasız; preview enjekte-probe ile getComputedStyle doğrulandı
  (cardRadius 20px, nav 9999px, close 44×44, dateTransform none, 2 radial katman).

İlgili: [[wanderer-gamification-engine]], [[uc-ana-renk-lapis]], [[toren-katmani-aksam-meclis-wrapped]], [[gezgine-mektup]], [[claude-tarzi-gorsel-dil]], [[tasarim-prensipleri]]
