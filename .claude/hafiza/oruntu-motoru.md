---
name: oruntu-motoru
description: "09d Örüntü Motoru — sinyal defteri + haftalık LLM damıtma + Örüntü Aynası paneli; eski PME'nin (2026-06-15 kaldırılan) yerini alan sıfırdan yeniden kurgu, 2026-07-05"
metadata: 
  node_type: memory
  type: project
  originSessionId: 95658096-8afa-4549-b99e-d2c1fe6aaf58
---

2026-07-05: Eski "Pattern Memory Engine" [[olu-kod-temizligi-2026-06-15]]'te silinmişti ama Pattern sohbet modu (mor rozet, `_detectPatternModeSignal`, `buildPatternModeContext`) hep canlı kalmıştı — hafızasız çalışıyordu çünkü `S.sessionPatternSummary`'yi dolduran haftalık damıtma zinciri yoktu. `js/parts/09d-oruntu-motoru.js` bu boşluğu 4 fazda doldurdu.

**Mimari (3 katman, tek dosya, `window.om*` expose — kimse import etmez):**
1. **Sinyal defteri** (deterministik): `omSessionHarvest` (06 requestChatExit hook) günlük satır biriktirir (mood/avoidance/mode/kanıt alıntıları, idempotent — aynı seans iki kez hasat edilse çift saymaz); `omDailyRollup` (03 post-auth init +2400ms, 13l'den sonra) biten ISO haftalarını 13l kimlik olay defterinden (`soz_verildi/tutuldu`, `gun_muhru`, `gecis_okuma`…) + aktivite defteri boşluklarından + P3 tetik dizilerinden agregeler. SafeStorage `etw_oruntu_motoru_v1_<uid>` (cap: 60 gün/12 hafta/gün başı 2 alıntı) — migration YOK, reset/delete-user zaten `user_analytics` KV'sini kapsıyor.
2. **Haftalık damıtma** (`omMaybeDistill`, 13i meclis kalıbıyla tembel, edge fn/cron YOK): defter özeti + son 7 gün kullanıcı cümleleri (kanıt, verbatim) + `ENGELLER` kitap kataloğu (10h: 6 Perde/6 Zehir/7 Tuzak) → `callLLM` (SUMMARY_MODEL, jsonMode, skipPersona, ktGate'e girmez) → en çok 4 örüntü, her biri {kanit, kitap teşhisi, çözüm ritüeli+neden, guven}. Doğrulama: geçersiz itemId/rituel budanır, guven<0.55 düşer. Başarıda `user_patterns`'e `pme_weekly_<hafta>` satırı yazar → **mevcut `loadSessionPatterns()` okuyucusu (01-prompts-modes.js:505) SIFIR değişiklikle canlandı** (korunan sözleşme). 429/hata → sessiz, `lastWeek` işaretlenmez, günde 2 deneme tavanı.
3. **Sunum:** Pattern modu `buildPatternModeContext()`'e 8b bölümü (ilk 3 örüntü) + taze-hafta yumuşak ipucu (`omConsumeFreshHint`, haftada 1); **Örüntü Aynası** paneli — İÇ DÜNYA odasında (Hayattaki Sen yanında) üçüncü buton, `omOpenAyna()` overlay (tören portalı DEĞİL, hs-overlay kalıbı) — premium: kanıt+teşhis(panzehir)+çözüm butonu (6 ritüele derin bağlantı: konusma/degerlendirme/meclis/gecis_okuma/benim_kartim/sefer), ücretsiz: sayılı teaser + `showPremiumFeatureSpotlight('oruntu')`; Gün Özeti (`#dunun-ozet-page`, `wsBugunOzetAc`) satırı; Geri Çağrı (13o) daveti örüntü başlığına ithaf; `send-push` edge fn `loadContext()` en taze `pme_weekly_%` satırını `ctx.weekly_pattern`'e okur (ELLE deploy bekliyor).

**Erişim:** motor+damıtma+Pattern modu herkese; görünür Ayna paneli `S.isPremium` kapısı ardında (teaser serbest) — [[fiyatlandirma-plani-v2]] ile aynı desen.

**i18n:** `prompt.oruntu.*` (16b, admin "Emre'nin Sesi" ÖZET&AYNA grubunda düzenlenebilir), `om.*`/`premium.oruntu.*`/`studio.room.oruntu*` (15b), TR+EN parite. Eski `prompt.pattern_memory.*` (yetim, ~100 anahtar) BİLİNÇLİ bırakıldı — farklı çıktı sözleşmesi, silmenin kazancı yok.

**Doğrulama:** 12 yeni test (tests/09d-oruntu-motoru.test.js — rollup determinizmi/idempotensi, damıtma budaması, 429/tavan, week-key), tam suite 494/28 yeşil, production build temiz (203 modül), preview'da her iki panel dalı (premium/teaser) görsel doğrulandı (gold=teşhis, lapis=çözüm butonu).

**MİMARİ YÜKSELTME (2026-07-16):** (1) **Örüntü Yaşam Döngüsü** — `_kokOf` (kitap itemId > normalize başlık) + `_applyLifecycle`: süren örüntü `hafta_sayisi` sayar ("3 haftadır" rozeti, altın pill), ≥2 hafta sürüp görünmeyen → `distill.cozulmus` (panelde lapis "SÖNEN ÖRÜNTÜLER" bölümü, yalnız güncel damıtma haftası gösterilir; geri dönen örüntü listeden düşer — ayna çelişmez); LLM'e `{{prevPatterns}}` + süreklilik kuralı ("süren örüntüde AYNI baslik"). (2) **Girdi zenginleştirme** — akşam niyetleri (13h `S._aksamToreni.intentions`, söz-eylem makası) + Yaşayan Portre çekirdeği (09e `ypGetFullState`: mesele+çelişkiler) damıtma digest'ine; mod-etkililik satırı başka oturumdan zaten gelmişti. (3) **Sağlamlık** — LLM dönüşü sonrası `lastWeek` yeniden kontrolü (çift damıtma koruması); Ayna panel 00f telemetrisi (`wtOverlayOpen/Close('oruntu-ayna')` → usage_events, Gözlemevi'nde görünür; kapanış tek kapı `_ayClose`). (4) Geri-çağrı artık EN DİRENÇLİ (en çok haftadır süren) örüntüye ithaf eder; Pattern modu 8b satırlarına tekrar bilgisi + sönen kutlama satırı eklendi. NOT: sözlük mimarisi değişti — EN artık `15e-i18n-dict-en.js` / `16e-i18n-prompt-dict-en.js` (15b/16b yalnız TR); om.* de/fr… ext dillerde YOK (TR fallback) — de pilot çevirisi ayrı iş. Ekosistem: 09e damıtmayı okuyor (`omGetTopPatterns`), 09g `omWeekKey`'i statik import ediyor, 12e Işık çıpası pattern kartlarında.

**ELLE kalan:** `supabase functions deploy send-push` (push ithafı için) — migration yok, mağaza/RC adımı yok.

Plan dosyası: `.claude/plans/eager-sniffing-treasure.md`. İlgili: [[kimlik-motoru]] (olay defteri kaynağı), [[kota-motoru]] (LLM çağrısı kota-sessiz), [[geri-cagri-motoru]] (13o ithaf noktası), [[emre-yonlendirme-hardcode-yasak]] (p() kuralı).
