---
name: gordun-pencereden-bakis
description: "GÖRDÜN (Üç Mühür'ün HAYAL vuruşu) sil-baştan — 'Pencereden Bakış' (10E-w2-gordun.js); 6 ritüellik checklist yerine günde bir bakış anı"
metadata:
  node_type: memory
  type: project
  originSessionId: 9e6df658-54eb-4b87-a504-e6f78dc625a5
---

**GÖRDÜN mührü sil-baştan tasarlandı (2026-07-04)** — eski hâli `_hayalAllDone()` 6 ritüelin
TAMAMINI (Manifesto/Ayna/OİK okuma/Kendinle Konuş/Hayal Seansı/Dinlenme + vadeli
Değerlendirme) şart koşan bir kontrol listesiydi (bkz. [[uc-muhur-yol-tasarimi]]). Kitabın
GÖRDÜN'e yüklediği anlam (Manifesto II "Hayal âlemi hayal değildir" + yazı #151 "izleme
değil, o gözlerden yaşama") bir checklist değil, **günde bir kez olmak istediğin kişinin
gözünden bakma anı**dır. Merkez kavram: **"Pencereden Bakış"** — OİK 2.0'ın
([[olmak-istedigin-kisi-2-pencere-tasarimi]]) "Pencerenin Ardındaki Kişi" mekânının günlük
açılışı.

**Yeni mühür tanımı (K1, 10u `_hayalAllDone`):** `_bakisDone() || _gecisDone() ||
_hayalSeansDone()` — kanonik eylem yeni Bakış anı; OİK okuma ritüeli ve Hayal Seansı da
(zaten "o gözlerden yaşamanın" derin biçimleri) mühürlemeye devam eder. Manifesto/Ayna/
Kendinle Konuş/Dinlenme/Değerlendirme GÖRDÜN kapısından ÇIKARILDI — kendi elmas/seri/
imEvent ödülleri aynen sürer, yalnız hayal mührünü artık beslemiyorlar.
`usHayalChecklist`+5 detektör (_aynaDone/_konusDone/_dinlenmeOkundu/_manifestoDone/
_degerlendirmeSatisfied/_isoWeekKey) SİLİNDİ; `us.chk.*` i18n (8 anahtar × TR+EN) silindi.

**YENİ modül `10E-w2-gordun.js`** (önek `gor*`; main.js 10f'ten hemen sonra STATİK import
— init gerekmiyor, hydrate yok, her `gorOpen()` çağrısında canlı okur; 03-auth-shell'e
DOKUNULMADI). `css/parts/gordun.css` (`#gor-portal` body-append, oik-read-portal kalıbı).

**Akış (`gorOpen`, tek portal, dört nefes):** PENCERE (`ikvCardFace(card,{palette:'lapis',
stage:'pencere'})`, kart yoksa `ikvCardBack` fog) → GÜNÜN PENCERESİ (`gorDayWindow()`:
OİK kartının 4 kategorisinden (dusunceler/inanclar/duygular/davranislar) TEK madde,
`localISODate()+cardId` seed'li deterministik seçim — kota harcamaz, gün boyu sabit;
fallback zinciri kart maddesi yok→whisper/olumlama→yok→`oikGetDesired()`→hiçbiri yok→
"O kişiyi tasarla" CTA) → BAKIŞ (`ikvRing` nefes halkası + soru + opsiyonel tek cümle input
+ "Sustum, sadece baktım" ghost) → MÜHÜR (`oik-seal-stamp` kalıbı altın damga + `fxCue`;
milestone günse `ikvMilestoneScene` mini kart + "Emre ile derinleş" köprüsü).

**Gördüklerin Defteri (10u yeni API, `S._hayalMuhru.visions` — YENİ ALAN, göç yok):**
`usRecordVision(text)`/`usGetTodayVision()`/`usGetRecentVisions(n)`/`usDeleteVision(date)`.
Anahtar = `usDayKey()` (hayal ledgeriyle aynı format); `text:null` = sessiz bakış da
mühürler. `_ensureHayalLedger()` guard'ı **KRİTİK**: `usInit()` henüz çalışmadıysa (ör. bu
oturumdaki auth-bypass DOM-hack testinde) `S._hayalMuhru` undefined olabilir —
`if (!S._hayalMuhru) usLoad();` deseni bunu GARANTİ ETMEZ (SafeStorage boş dönerse
`S._hayalMuhru` hâlâ undefined kalır → `.visions` erişimi patlar). Düzeltme:
`_ensureHayalLedger()` önce `_defLedger()` ile senkron var eder, SONRA `.visions` okur.

**`usOpenDetail('hayal')` sil-baştan (K3, ad/sözleşme AYNEN):** checklist yerine bugün
durumu (cümle varsa alıntı) + iki derin kapı kartı (`us-gate`: "OKU — Geçiş Protokolü"→
`switchView('oik')`, "HAYAL SEANSI"→`switchView('hayalseans')`) + Gördüklerin Defteri
(son 28 gün, satır başı sil butonu — kişisel veri silinebilir).

**Yol ekranı (10f):** GÖRDÜN eylem satırı artık `window.gorOpen?.()` çağırır (eskiden
`usOpenDetail('hayal')`); tamamlanmış satır varsa günün cümlesini gösterir
(`usGetTodayVision()`), yoksa eski statik metin. `yol.todo.hayal`="O gözlerden bak".

**Koç bağlamı (10D `oikGetContext`):** sonuna "Son bakışlar: ..." (son 3 defter cümlesi,
`usGetRecentVisions(3)`) eklendi — Emre kullanıcının o gözlerden ne gördüğünü bilir.

**GOTCHA — z-index çakışması (build+preview'de yakalandı):** `#gor-portal` ilk sürümde
`var(--z-ceremony, 9650)` kullanıyordu; Yol ekranından (`#yol-portal` z=9655)
`window.gorOpen()` çağrılınca Gördün sahnesi YOL'un ALTINA giriyordu (görünmez perde).
Fix: `#gor-portal` z-index sabit **9658** (yol-portal 9655 üstü, us-portal 9660 altı —
gorOpen us-portal'dan açıldığında zaten `_closePortal()` önce çağrılıyor, çakışma yok).
Ders: yeni bir ceremony portalı Üç Mühür yüzeylerinden (Bugün hero/Yol/Üç Mühür detay)
BİRDEN FAZLASINDAN açılabiliyorsa, hangi portalın üstüne bindiğini z-index'le açıkça test
et — `--z-ceremony` taban tokenı yetmez.

**Korunan sözleşmeler:** `usCheckHayalDay(opts)` imzası + 8 çağıran modül (10g/10i/10k/
10l/10n/10v/10D/10u) aynen; `usSeriesState('hayal')`; `etw_hayal_muhru_v1` KV anahtarı +
`days`/`cards`/`bestStreak` formatı. **ELLE adım YOK** (migration/edge fn/reset listesi
değişmedi — `visions` mevcut KV objesinin içinde yeni bir alan).

**Doğrulama:** build temiz (200 modül) · vitest 36 yeni (10u detektör+defter round-trip,
10E gorDayWindow determinizm+fallback zinciri) + genel suite 472/474 yeşil (2 pre-existing
hata `08-trends-payment.test.js` RC_ENTITLEMENT_ID/PRICE_USD — fiyatlandırma v2 göçünden
kalma, bu işle ilgisiz) · preview: boş-kart/dolu-kart/mühür/milestone/derinleş-köprü/Yol
üstü-Gördün/defter-sil uçtan uca doğrulandı, konsol 0 hata.

**Baştan-sona review + düzeltme turu (2026-07-04, aynı gün ikinci oturum):**
- **BUG (gerçek, düzeltildi) — Yol'dan açılan Gördün'de switchView çıkışları:**
  `10f-w2-yol.js` bugünün vuruş satırında `act==='hayal'` dalı `_yolClose()`
  ÇAĞIRMADAN direkt `window.gorOpen?.()` açıyordu (kardeşleri `seal`/`soz` önce
  kapatıyor; `10u usOpenDetail`'in kendi `us-act-hayal`'ı da önce `_closePortal()`
  çağırıyor — yalnız Yol yolu tutarsızdı). z-index notundaki "9658, yol'un üstünde
  dursun" kararı bunu bilerek üstünde bırakmak için değil, muhtemelen unutulmuş bir
  kapamaydı: `gor-portal` kapandığında Yol hâlâ DOM'daydı, ve Gördün'ün switchView
  içeren çıkışları (`gor-design-cta`→`switchView('oik')`, `gor-derinles-btn`→
  `switchView('chat')`) hedef view'ı `#yol-portal` (fixed, inset:0, z=9655)
  arkasında/altında görünmez bırakıyordu — kullanıcı Yol'u kapatana kadar
  yönlendirildiği ekranı GÖREMİYORDU. Fix: `10f-w2-yol.js` act==='hayal' artık
  `_yolClose()` sonra 280ms'de `gorOpen()` çağırıyor (seal/soz ile birebir kalıp).
  z-index 9658 sabiti dokunulmadan kaldı (zararsız savunma katmanı).
- **Temizlik:** `10u-w2-ultra-seri.js` `_todayBlockHTML` kendi modülünde tanımlı
  `usGetTodayVision`/`usGetRecentVisions`'ı gereksiz yere `window.*` üzerinden
  çağırıyordu → doğrudan yerel çağrıya sadeleştirildi (TDZ-güvenli window.* yalnız
  MODÜLLER ARASI erişim için gerekli, aynı modül içi değil).
- **Temizlik:** `10E-w2-gordun.js`'teki `_gorSeed` (FNV-1a+xorshift32 PRNG), 12c'nin
  `ikvSeed`'iyle birebir aynı kod (kopyala-yapıştır). `ikvSeed` 12c'de `export`
  edildi, 10E artık onu import ediyor — algoritma tek yerde.
- **Temizlik:** `_src.html`'de "Manifesto·Ayna·Geçiş·Konuş·Hayal Seansı → Hayal
  detayındaki kontrol listesinden açılıyor (usHayalChecklist)" yorumu silinen
  checklist'e işaret ediyordu (dangling referans) — güncel Bakış/derin-kapı
  modeline göre düzeltildi.
- **08-trends-payment.test.js iki test düzeltildi** (RC_ENTITLEMENT_ID/PRICE_USD
  fiyatlandırma v2 göçünde silinmişti, bu Gördün işiyle ilgisiz pre-existing hata
  idi): testler yeni API'ye taşındı — `RC_ENTITLEMENT_PRO`/`RC_ENTITLEMENT_MAX`,
  `SKU` kataloğu, ve asıl karar noktası `pricingState()` state machine için 8 yeni
  test (active_max/active_pro/lapsed_locked/lapsed_list/cancelled/offer_a/offer_b/
  new_no_offer).
- **Doğrulama (bu tur):** build 200 modül temiz · vitest TAM YEŞİL 482/482 (27
  dosya) — iki pre-existing hata dahil artık kalmadı. Canlı preview click-through
  YAPILAMADI (S module-private, IIFE bundle'da window'a expose değil, gerçek
  Supabase login gerektiriyor) — doğrulama statik kod okuma + testlerle sınırlı;
  Emre gerçek cihazda Yol→Gördün→derinleş/tasarla çıkışlarını bir kez elle
  denerse iyi olur.

İlgili: [[uc-muhur-yol-tasarimi]] (halefi olduğu tasarım) · [[olmak-istedigin-kisi]]
(oikGetCard/oikGetDesired kaynağı) · [[olmak-istedigin-kisi-2-pencere-tasarimi]] ("pencere"
sahne kalıbı) · [[kart-gorsel-dili]] · [[kart-salon-dili]] · [[build-source-convention]].
