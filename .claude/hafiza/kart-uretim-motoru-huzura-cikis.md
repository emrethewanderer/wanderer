---
name: kart-uretim-motoru-huzura-cikis
description: "Kart Üretim Motoru (12d, prosedürel sahne bestecisi) + detay ekranı sil-baştan \"Huzura Çıkış\" (10q kkOpenDetail); 2026-07-06"
metadata: 
  node_type: memory
  type: project
  originSessionId: cb6905e8-815d-495c-a348-7b4f4360c795
  modified: 2026-08-07T15:14:54.269Z
---

**Kart Üretim Motoru (12d-kart-uretim.js, önek `kum`)** — Emre'nin kararı: raster/AI görsel YOK, motor tamamen prosedürel (vektörel). Üç katman:
1. `kumHeuristicSpec` — SENKRON, ağsız, TR anahtar-kelime taraması (`.includes()`, ASLA `\b` regex — JS `\b` ç/ğ/ı/ö/ş/ü'yü kelime-dışı sayar) + 11 erdem havuzu (`VIRTUE_POOLS`, 2 varyant/erdem) + seed'li jitter → her zaman geçerli, benzersiz sahne döner.
2. `kumComposeFromText` — LLM bestecisi (10A "Tek Nefes" kalıbı, `callLLM` + `prompt.kum.design_system`), yalnız 12c `IKV_MOTIF_KEYS` içindeki anahtarları kabul eder, hata/timeout'ta heuristik tabana düşer.
3. `kumEnsureSpec(entity, opts)` — ana giriş noktası, SENKRON: yoksa heuristik hesaplar+persist eder+döner, ARKA PLANDA LLM ile iyileştirir (varsa `entity[field]` zaten doluysa LLM tetiklenmez — refine yalnız İLK hesaplamada tetiklenir).

**12c-kart-gorsel.js genişlemesi**: `STAGES` (10 sabit sahne) yanında YENİ `ikvComposeScene`/`ikvNormSpec`/`ikvComposeBackdrop` — reçete (`card.sahne`) şeması: `{cerceve,yildiz,gok,uzak[],orta[],nesne[],fig{g,x,y,s,mod},yol,isik,bitki}`. Motif kütüphaneleri: `IKV_UZAK`(7)/`IKV_ORTA`(13)/`IKV_NESNE`(13, elmas+kumru dahil)/`IKV_GOK`(6)/`IKV_YOL`(3). `IKV_MOTIF_KEYS` dışa açık (12d validasyonu için). `ikvScene(card,opts)`: `opts.sahne||card.sahne` varsa yeni kompozitör, yoksa eski `CAT_STAGE` yolu (geri uyumlu). `ikvComposeBackdrop(card,{palette})`: tam-ekran, çerçevesiz, obsidyene eriyen versiyon — detay ekranının arka planı.

**12b-kart-destesi.js**: `buildDeck()` artık HER 112 karta `c.sahne = kumHeuristicSpec({seed:c.id, virtue:c.virtue, texts:[...tüm metin alanları]})` atıyor — LLM YOK (deterministik, build-time, oturumdan oturuma sabit kalmalı). "A1: 112 kartın elle küratörlü reçetesi" planı yerine BU mühendislik kararıyla çözüldü — 112 JSON elle yazmak yerine mevcut heuristik besteci reuse edildi (bkz. [[kart-uretim-motoru-huzura-cikis]] kendi içinde not).

**10A-an-karti.js entegrasyonu**: Önceden TÜM Benim Kartım'lar sadece 2 sabit sahneye düşüyordu (`stage:'kapi'`/`'pencere'`, virtue hep `yansima`/`odak`) — kök şikâyet buydu. `_poleSahne(k,which)`/`_previewSahne(pole,palette)` eklendi; `golden`/`lapis` JSONB blob'ları içine `sahne` gömülüyor (YENİ KOLON GEREKMEDİ — mevcut upsert otomatik taşıyor). `_miniCard`/`_faceCard` imzası `(k, which, palette, ...)` oldu (önceden `(pole, palette, ...)`).

**10D-olmak-istedigin.js (OİK)**: `oik_kartlari` DÜZ kolonlu (jsonb blob yok) → **mig 031 ELLE** (`sahne JSONB` kolonu benlik_karti + oik_kartlari'na). Client 42703 (undefined_column) hatasını yakalayıp `sahne`'yi satırlardan çıkarıp retry eder → migration koşmadan da hiçbir akış kırılmaz (KV-only fallback).

**10q-w2-kisi-karti.js `kkOpenDetail` → "Huzura Çıkış"**: Eski "bilgi paneli" (veil+3B kart+metin) sil baştan. Yeni: `ikvComposeBackdrop` tam-ekran arka plan (`.kk-det-backdrop`) + hafif `.kk-det-veil` + `.kk-det-flip` (tıklayınca kart sırtını gösterir — flip trigger'ı **outer wrapper**'da olmalı, `.kk-card3d`/`.kk-card3d-inner`'a `transform-style:preserve-3d` scope'lu eklenmeli yoksa backface MİRRORED görünür — bkz. GOTCHA aşağıda) + `.ikv-cascade` ile kademeli süzülen gövde + Yol bölümü (`RITUAL_ROUTE` sinyal-anahtarı→switchView eşlemesi: reviews→degerlendirme, selfDialogue→konusma, gecis*→oik, dinlenme→dinlenme, hayalScenes→hayalseans, meclis*→hasimlar, streak/sessions→bugun) + near-miss vurgusu + `czToplumsalKanit()` sosyal kanıt + sahiplik izleri (kazanım tarihi + `imIsCurrentPersona` taç). z-index `9250`→`var(--z-ceremony)` (9650).

**GOTCHA — nested flip + CSS animasyon çakışması**: (1) Bir eleman hem `animation:X both` (transform içeren keyframe) HEM DE class-toggle ile `transform:rotateY(180deg)` alıyorsa, dolan (fill:both) animasyonun SON keyframe transform'u normal class kuralını EZER — flip hiç görünmez. Çözüm: giriş animasyonunu OUTER wrapper'a, flip transform'unu INNER'a ayır. (2) `.kk-card3d`/`.kk-card3d-inner` kendi `transform-style:preserve-3d`'ini outer flip context'ine YAYMAZSA, dıştan 180° çevrilince İÇ backface değil ÖN yüzün AYNALANMIŞ hâli görünür (pack-reveal'da zaten bilinen bir sorun, `.kk-reveal-in .kk-card3d{transform-style:preserve-3d}` olarak scope'lanmıştı — aynı kalıp yeni `.kk-det-flip` bağlamında da tekrarlanmalı).

**Kapsam dışı bırakılanlar (bilinçli)**: Paylaş butonu detay ekranına eklenmedi (13g `shrShareStory` param şeması derinlemesine incelenmedi, yarım entegrasyon riskinden kaçınıldı). 02c Benlik Kartı'na sahne entegrasyonu yapılmadı (hiç kart görseli render etmiyor — tüketicisi yok). 12a `wsArchCard`/12-w3-journey.js (Yolculuk ekranı, kısmen emekli) motife bağlanmadı — 10q üzerinden (buildCekirdek kopyaları) zaten otomatik kazanıyor, orijinal `ARKETIPLER_DATA` nesneleri değil.

**Bundle bütçesi**: `node scripts/check-bundle-size.mjs` hâlâ aşıyor (819KB gzip / 650KB bütçe) — bu ÖNCEDEN AÇIK bir risk (bkz. [[sistem-saglik-taramasi]]), bu oturum biraz büyüttü ama kök neden değil; ayrı bir iş.

**ELLE (Emre)**: ~~`migrations/031_kart_sahne.sql`~~ — 2026-07-31'de doğrulandı: `sahne JSONB` konsolide şemaya girdi (`migrations/000_wanderer_schema.sql`: portre, oik_kartlari, suretler; `ADD COLUMN IF NOT EXISTS`). Ayrı ELLE borç KALMADI (bkz. [[migration-konsolidasyonu]]).

**2026-07-31 — DENETİM (Sonnet devri sonrası, dosya yolları artık `js/parts/`)**: Motor katmanı TEMİZ çıktı — 12d determinizmi, `_scan` TR `.includes()` taraması, metin-imgesi > havuz önceliği, `_mList`'in düz-string/`{m}` çift kabulü, `ikvNormSpec` clamp'leri (yildiz 0–12), `IKV_MOTIF_KEYS` senkronu ve tüketiciler (12b2/12f1/10A/10D/02c) canlı doğrulandı: 40 tohumda 40 ayrı sahne, aynı tohum determinist. Kusurların TAMAMI tören yüzeyinin ETKİLEŞİM BAĞLARINDAYDI, motorda değil:
1. **`.kk-det-veil` kapanışı ölü** — veil `pointer-events:none` (backdrop üstü saf görsel katman) olduğu hâlde `close` ona bağlanmıştı; üstelik `.kk-det` (inset:0) veili örtüyor. Dış dokunuş `.kk-det`'in KENDİSİNE düşer → `e.target === detEl` kontrolüne taşındı.
2. **Escape yoktu** — repo genelinde (10q4 dahil 15+ yer) standart. Eklendi; dinleyici MODÜL kapsamında tekil (`_kkDetOnKey`) çünkü detaydan detaya geçiş portalı kapatmadan yeniden yazar, kapanış closure'ı çağrılmaz → biriktirirdi.
3. **Panzehir butonu ölü** — `.kk-pz-card[data-open]` portalda yaşar, salon yüzeylerinin `[data-open]` bağlayıcısı ise `body` üzerinde çalışır. Portal içi bağ eklendi.
4. 14 `kk.det.*` çağrısı inline fallback'sizdi (PROTOKOL §5.2); TR/EN paritesi 21/21 tamdı, yani ekranda kırık yoktu — konvansiyon kaçağı kapatıldı. `.kk-det`'e `overscroll-behavior:contain` eklendi.

Ders: **testin ADI davranışı sınadığını sanmaya yetiyor** — "kapatma düğmesi ve veil portalı temizler" testi veili hiç sınamıyordu, ölü listener bu yüzden görünmedi. 4 regresyon testi eklendi (1471 test yeşil).

**2026-08-07 — MOTOR ÜÇ YERDEN DEĞİŞTİ** ([[yasayan-kart-motoru]]):
(1) **Alfabe Işık söküldü** — aşağıdaki 2026-07-19 entegrasyonu artık geçerli
DEĞİL (`nisan_*` motifleri, `KW_NISAN_EK`, `input.nisan`, `_kumAktifNisan`,
`_kumNisanGuide` kaldırıldı). (2) **`_scan` özgüllüğe geçti** — eskiden ilk
eşleşen kazanırdı ve "ilk" sözlükteki YAZIM sırasıydı (`kapi` başta durduğu
için "kapı" geçen her metin kapı çiziyordu); artık uzun ipucu kısadan,
çok ipucu tekten özgüldür, eşitlikte sözlük sırası korunur (determinizm
bozulmaz). (3) **Elle reçete motoru yener** — 12b2'nin toplu ataması "sahne
varsa dokunma" oldu; yayınlanan 12 kartın sahnesi elle bestelendi, motor
yalnız boşluğu dolduruyor.

**2026-07-19 — Alfabe Işık kart üretiminin ÖZÜNDE (ARTIK SÖKÜLDÜ, yukarıya bakın)** ([[nur-alfabesi-plani]]): NISANLAR+ISIK_TEMALAR `12e1-isik-veri.js` SAF YAPRAĞA taşındı; 12e import+re-export ile sözleşme korundu (10o/10D `from './12e-isik-nisanlari.js'` kırılmadı — sebep: 12e→12c importu varken 12c veriyi 12e'den çekemezdi, döngü olurdu). **12c:** on nişan `nisan_<id>` anahtarıyla IKV_NESNE'de (`_nisanIm` sarmalayıcı: 100x100 currentColor ikon → k=0.24 scale + `<g color=aksan>`); IKV_MOTIF_KEYS.nesne Object.keys ile otomatik genişledi → 12d _validated + LLM izin listesi kendiliğinden kapsar. **12d:** KW.nesne'nin SONUNA nişan temaları (ISIK_TEMALAR + `KW_NISAN_EK` hakikat-dili ekleri — ISIK_TEMALAR'a kelime EKLENMEZ ki koç köprüsünün chip kadansı genişlemesin); kumHeuristicSpec `input.nisan` yalnız metin nesnesizse ve havuzdan ÖNCE iz bırakır; kumEnsureSpec `window.isikLastWritten?.()` köprüsü (12e'ye yeni export `isikLastWritten` — filigran da aynı tek kaynağa delege; main.js import+expose ×2 güncellendi); _kumPrompt'a `p('prompt.kum.nisan_guide')` (16b TR + 16e EN) + NISANLAR ad/ders satırları (anahtar çevrilmemişse blok susar). **12b deste DETERMİNİST kaldı** (nisan alanı geçilmez, kullanıcı durumu bulaşmaz); tema eşleşmesiyle 112 kartın 11'i nişan imi kazandı (halka 4, bes_isik 3, saturn 2…). 6 yeni test (12d dosyası 12 test). Kural: `_scan` max=2 + nişanlar KW sonda → somut nesne imgesi ve mevcut motifler DAİMA nişandan önceliklidir — ışık kazanılır, dayatılmaz.
