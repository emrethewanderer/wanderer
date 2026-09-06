---
name: hazine-destesi-kart-paketleri
description: "Hazine Destesi (12f) — Elmas'la açılan bilgelik kart paketleri; 9 set/86 kart, kk-pack reuse, Işık Kanonu satılamaz; 2026-07-20 TAM UYGULANDI (5 faz) + commit 74b8134; ELLE mig 038"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4f266c58-908c-430d-b0b6-64c6e7d5c10a
  modified: 2026-07-20T21:15:52.502Z
---

**Hazine Destesi** (2026-07-20, Emre'nin isteği "kart paketleri" özelliği): Elmas ekonomisinin ilk gerçek harcama yüzeyi — [[kisilerim-kart-motoru]]'nun 112 kimlik kartına HİÇ dokunmadan yeni bir katman: kitap-köklü bilgelik kartları (Manifesto/Derinlikler/Temeller/Perdeler/Zehirler/Tuzaklar/Çerçeveler/Aforizmalar/Işık Kanonu). Tema: *"Kimlik kazanılır, bilgelik toplanır."*

**Mimari (12b/12b2 sidecar deseninin ikizi):**
- `js/parts/12f-hazine-paketleri.js` — motor+UI, ana bundle. `hazineReady()`→`ensureExt('hazine')` (12b `deckReady()` deseni). RNG+pity (`hzDrawPack`, saf fonksiyon, `rand` enjekte edilir), dupe→holo→iade (`hzApplyDraw`), set tamamlama (`hzDetectSetCompletion`, idempotent), Işık Kanonu deterministik imleç (`hzAyetCursorNext` — RNG'ye ASLA girmez), satın alma (`hzBuyPack`+`_hzPackOpen` çifte-harcama guard'ı), çok-kartlı tören (`hzOpenPack`), set töreni (`hzSetCeremony`, taç+40 Elmas+kota RPC), haftalık armağan (`hzMaybeWeeklyGift`, Pro/Max, `hzWeekKey` pazartesi-tabanlı).
- `js/parts/12f1-hazine-icerik.js` — SAF YAPRAK (12e1 deseni), 9 set + 77 satılabilir kart + 9 taç = 86. İçerik kitaptan birebir/özet: Manifesto 12 madde (`mr.item.*` i18n'den), Derinlikler/Temeller (09b `_WORKSHEET_TEMPLATES`'ten), Perdeler/Zehirler/Tuzaklar (10h `ENGELLER` + `eng.item.*.panzehir`den — YENİ YAZILMADI, mevcut kaynaktan taşındı), Çerçeveler (zihniyet-devrimi-ozet memory'sindeki #no'lu katalog), Aforizmalar (aforizma kanonu, 12/12 verbatim), Işık Kanonu (8 ayet + 2 orijinal "Hatırlatma").
- `js/ext/hazine.js` — sidecar girişi, `buildHazineData` re-export.

**K2 — kk-pack REUSE kararı:** `10q-w2-kisi-karti.js` `kkEnsureStyles`'a TEK satır `export` eklendi (davranış değişmedi); hazine paketi `.kk-pack*` sınıflarını (10q'nun 80'ler folyo kabuğu) kullanır, rip-sonrası kendi `.hz-fan` katmanı (3 kart, kapalı sırt→flip, outer=giriş animasyonu/inner=flip transform ayrımı — [[kart-uretim-motoru-huzura-cikis]] nested-flip GOTCHA'sından kaçınmak için). `kkOpenPack`'e hiç dokunulmadı; hazine kazanımı `imOnCardEarned` (kimlik devri) TETİKLEMEZ.

**K6 — Işık Kanonu satılamaz (manevi register kuralı):** ayet kartları RNG'ye asla girmez; yalnız (a) haftalık armağanda her zaman eşlik eder, (b) herhangi bir set tamamlamada emeğin mührü olarak verilir. `SETLER[].satilamaz=true` → `hzBuyPack` guard'ı + UI'da "PAKET AÇ" yerine kilit notu.

**Ekonomi:** paket 30 Elmas/3 kart, pity (5 pakette nadide+, 24'te efsane garanti), dupe→holo→ikinci dupe iade (2/3/5/8), set ikramiyesi 40 Elmas + Taç Kart (pakete asla girmez) + kota armağanı.

**Kalıcılık:** SafeStorage per-uid `etw_hazine_v1_<uid>` (12e `_isikState()` deseni — S'e YAZILMAZ, her çağrıda okunur/yazılır; yeni Supabase tablosu YOK).

**ELLE (Emre):** `migrations/038_hazine_set_bonus.sql` — `quota_windows.set_bonus_left/set_bonus_sets` + `quota_set_bonus_grant(p_set)` RPC + `quota_consume`/`quota_status` CREATE OR REPLACE (mig 030'un TAM gövdesi üzerine, AYRI kolonlarla — Ultra Armağanı'nın günlük `bonus_day` alanıyla ÇAKIŞMAZ, bkz. [[kota-motoru]]). Client tarafı RPC-yoksa sessiz düşer, `pendingBonus` kuyruğuna girer, `hzInit`'te retry (`hzRetryPendingBonuses`, 13m `ktGrantUltraBonus` deseni).

**Doğrulama:** 49 yeni test (`tests/12f-hazine.test.js`) + 1058/1058 tam suite yeşil (yalnız pre-existing 2 `13m-kota.test.js` hatası — hazine işiyle ilgisiz, dokunulmadı). Build: ana bundle 641KB/650KB gzip (sınıra yakın — FAZ sonrası ek büyütmede dikkat), sidecar `ext-hazine.js` 7KB. Preview'da canlı doğrulandı: raflar/halka/fog/satılamaz-set/paket-tören-flip/set-töreni/haftalık-armağan hepsi görsel olarak (manuel DOM enjeksiyonuyla — gerçek `S`/Elmas mekanizması main.js'te window'a expose edilmediği için uçtan uca satın alma canlı test edilemedi, bkz. not aşağıda).

**Not — test kısıtı:** `window.S` main.js'te expose edilmiyor (bilinçli encapsülasyon); tarayıcı konsolundan gerçek Elmas bakiyesini manipüle etmenin yolu yok. Uçtan uca satın alma akışı (`hzBuyPack`) yalnız vitest'te (gerçek `S` modülü import edilerek) test edildi, tarayıcıda değil — CSS/DOM/görsel katman ise `window.ikvCardFace`/`ikvRing`/`ikvHoloScan` (12c kendi window expose'u) ile manuel enjeksiyon yoluyla doğrulandı.

**Commit (2026-07-20):** `74b8134` — bu özellik ayrı bir (paralel) oturumda
yazılmış, Geçiş Motoru sprintini yürüten oturum bunu `git status`'ta
commit'siz bularak fark etti ([[gecis-motoru-plani]]'ndeki "paralel
oturum uyarısı"na bkz.); Emre onayıyla ("bilinçli yaptım, commit et")
bu commit'le depoya işlendi.

**Derin denetim + düzeltme (2026-07-20, `73308af`):** Emre "baştan sona
detaylıca analiz et, hataları gider" isteğiyle 74b8134'ü eleştirel
gözle yeniden inceledim, 4 gerçek kusur buldum ve düzelttim:
1. **Pity kart-başına sayılıyordu, paket-başına değil** — `hzDrawPack`'te
   sayaç 3-kartlık paketin HER kartında artıyordu; "5 pakette garanti"
   niyeti fiilen ~1,7 pakete düşüyordu (3x cömert). Düzeltme: sayaç paket
   başına 1 artar, garanti yalnız paketin İLK kartında zorlanır (standart
   gacha-pity deseni).
2. **Işık Kanonu'nun kendi Tacı (`hz_tac_isik_kanonu`) ölü içerikti** —
   10. ayet toplansa bile kanonun kendi seti "tamamlandı" sayılmıyordu,
   hiçbir kod yolu kendi tacını tetiklemiyordu. `hzSetCeremony` ve
   `hzMaybeWeeklyGift` artık her ayet kazanımından sonra Işık Kanonu'nun
   kendisinin tamamlanıp tamamlanmadığını da kontrol ediyor.
3. **Çifte ayet verilme riski** — haftalık armağan aynı anda bir seti
   tamamlarsa, set töreni kendi içinde İKİNCİ bir ayet daha veriyordu
   (K6.1 lütuf + K6.2 emeğin mührü aynı ana denk gelince toplanıyordu).
   Yeni `hzSetCeremony(setId, {skipAyet:true})` parametresiyle önlendi.
4. **`hzGrantSetBonus` lost-update yarış durumu** — durum RPC'yi
   beklemeden ÖNCE okunup await'ten SONRA kaydediliyordu; bekleme
   sırasında başka bir yazım (hzSetCeremony/hzBuyPack) olursa ezilirdi.
   Düzeltme: durum artık await'ten SONRA taze okunur.
5 yeni regresyon testi (54/54 dosya-içi, 1128/1128 tam suite). Bu tur
build'i 643KB/650KB gzip'e çıkardı — **bütçeye 7KB kaldı**, FAZ4/5 sonrası
herhangi bir ek büyütmede dikkat (sidecar'a taşıma ya da bütçe artırma
gerekebilir).

İlgili: [[kisilerim-kart-motoru]] [[kart-gorsel-dili]] [[holo-kart-motoru]] [[kota-motoru]] [[emre-kitaplari]] [[kitap-sesi-manevi-register]] [[build-source-convention]] [[i18n-bundle-bolme]] [[gecis-motoru-plani]]
