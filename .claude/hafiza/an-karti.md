---
name: an-karti
description: "\"Benim Kartım\" (10A) — TEK kart sınıfı; Bugün + Sohbet kapıları aynı iki kutuplu Atölye'ye akar; eski İlham Kartı 10A'ya gömüldü"
metadata: 
  node_type: memory
  type: project
  originSessionId: 65ab5d48-d775-4fc2-a57a-6227d8f16b1d
  modified: 2026-08-02T18:19:41.713Z
---

## 2026-07-05 · ATÖLYE 2.0 — "ANIN OCAĞI" (görsel sil-baştan, omurga korundu)
Emre: "Atölye + Benim Kartım'ı vizyonumuzla tam uyumlu yeniden tasarlayalım."
Plan onaylandı (`.claude/plans/synchronous-baking-hearth.md`), 4 fazda uygulandı.
Kapsam kararı: **deneyim (TÜM sahneler) sil-baştan; omurga (şema, benim_kartlarim
tablo+fallback, Tek Nefes LLM, KV çift yazım, damarlar, window.ak* sözleşmeleri)
AYNEN**. Merkez kavram: **Anın Ocağı** — dövme/kor metaforu (OİK 2.0'ın kardeşi
ama ayrışık: OİK'te ışık camdan/üstten gelir, Ocakta **kor DAİMA ALTTAN vurur**).

**Yeni dosya `css/parts/atolye.css`** (sil-baştan, `atl-*` öneki, yalnız primitifler
12c'den): atmosfer katmanları (`atl-ember` köz tarlası, `atl-grain`, `atl-spine`,
`atl-veil` su perdesi — lapis sahnelerde kor söner/su yükselir) + tw-morning/
evening/night varyantları + S1–S6 sahne stilleri + deste/detay/salon/raf blokları.

**Sahne koreografisi (akOnboard, JS fonksiyon adları AYNEN):** S1 CEVHER (loading-
altın, `ikvLantern`+kıvılcım) → S2 ÖRS BAŞINDA (checkbox+add içerik aynen, kor
işareti ✦ dokusu) → S3 TAV (flip sunum, kor halesi altından) → S4 SU (loading-
lapis, zemin kor→su geçişi) → S5 TAVLANMIŞ KART (lapis flip sunum) → **yeni ara
sahne** `_renderStampMoment` (mühür damgası --ease-spring + flaş, "Yol Açıldı")
→ S6 SOĞUMA·HALKA KAPISI (eski Paylaş Kapısı, aynı akShare/onSkip mantığı).

**Vuruş+tamamlanma (FAZ2):** `akStrike` her vuruşta `_atlStrikeFlash()` (geçici
body-append altın flaş, kendi kendini 650ms'de temizler) + `fxCue`. Tamamlanma
töreni (`_completionCeremony`) **`.ak-completion`/`.ak-completion-go` sınıfları
KORUNDU** (tests/10A-an-karti.test.js:145 kancası) — görsel tamamen `atl-complete-*`
(ring draw-in + mühür damgası + altın flaş + "Artık o kişisin" + aforizma +
fxCue('holoGrand'), hold 2400ms). `_akJustCompleted` bellek-içi bayrak (OİK
`_justSealed` kalıbı) → "GEÇMİŞ KARTLARIM" girişi bir kez nabız atar.

**Bugün destesi:** `_ringSVG` (3-yay vuruş halkası, zaten vardı ama HİÇ
kullanılmıyordu — ölü kod) artık `_flipCardHTML`'e kablolandı, atl- sınıflarıyla
görünür. `akSyncGreeting` chip satırı `atl-chip`.

**FAZ3 salon kalıbı:** `akOpenDetail` sil-baştan — iki kutup birbirine bakar
(`rotateY(±8deg)`, tıklanan yüz öne gelir, eski ayrı toggle-buton KALDIRILDI).
`akOpenCollection` → "Soğumuş Kartlar Rafı" (galeri+detay, `ikv-panel` cascade).
`loadKendiKoleksiyonumView` → `kk-mine-*` CSS sınıfları `atl-mine-*`'a taşındı
(DOM id `#kk-mine-body` AYNEN — dış sözleşme).

**BUG bulundu+düzeltildi (önceden de vardı, benim redesign'im değil):**
`akOpenDetail`'de `const pole = k[palette]` — kart objesinin alanı `golden`/`lapis`
iken palette teması `'gold'`/`'lapis'` string'i; `k['gold']` her zaman `undefined`
dönüyordu (yalnız `palette==='lapis'` çağrıları çalışıyordu, `'gold'` HER ZAMAN
crash ediyordu). Fix: `k[palette==='gold'?'golden':'lapis']` (2 nokta). Bu satır
orijinal (pre-redesign) kodda da AYNEN vardı — muhtemelen `akOpenDetail('gold',...)`
hiç gerçek kullanıcı tarafından tetiklenmemiş ya da fark edilmemiş.

**FAZ4 söküm:** `sentez.css` 3022→1852 satır (3 ölü blok: BENİM KARTIM ana blok
517–1583, PAYLAŞ KAPISI 2920–2950, KENDİ KOLEKSİYONUM/kk-mine-* 2951–3022);
`.ws-greet-input-wrap[data-mode="feed"]` kuralı (PAYLAŞILAN element, 10A'ya özel
değil) atolye.css'e taşındı, silinmedi. `?v=3` bump. ~11 ölü `ak.*` i18n anahtarı
temizlendi (aria_toggle/toggle_oldugun/toggle_olman — eski toggle-buton kalıntısı;
aria_active_card/aria_ring/aria_tap_seen/btn_gold_add/btn_anti_done/btn_seal/
now_that_person/today_n3 — daha da eski, benim redesign'imden önce ölüydü).
TR/EN parite: 129/129, sıfır fark.

**TASARIM-PRENSIPLERI denetiminde 2 gerçek dokunma-hedefi regresyonu bulundu+
düzeltildi** (ilk taslakta ben küçültmüştüm): `.atl-deck-rehber-ok` 32px→44px,
`.atl-back` 40px→44px. `.atl-flip-strike` (32px) ve `.atl-chip` (32px) ve
`.atl-line-x` (32px) 44px altında KALDI ama bunlar zaten ORİJİNAL tasarımda da
44px altıydı (30px/30px/22px) — benim değişikliğim onları KÖTÜLEŞTİRMEDİ, hafif
iyileştirdi; kompakt deste/liste yerleşiminin bilinen ödünleşimi (dokümante edildi,
"düzeltilmedi" değil "zaten böyleydi + hafif iyileşti").

**DOĞRULAMA:** build temiz her fazda; 494/494 test (09d-oruntu-motoru.test.js
paralel tam-paket koşusunda 3 kez flaky göründü, izole her seferinde 12/12 —
kendi kodumla ilgisiz, ön-var olan test-altyapısı karakteristiği); preview'da
gerçek `akOnboard` çağrısıyla uçtan uca (S1→S6→3 vuruş→tamamlanma→koleksiyon→
Kendi Koleksiyonum) DOM-seviyesinde doğrulandı (auth-bypass DOM hack ile —
ekran görüntüleri drawer/dialog katmanı yüzünden bazen karardı, DOM state
kontrolü ile teyit edildi); 375px mobil ekran görüntüsü temiz; `typeof
window.ak*` 17/17 fonksiyon sözleşmesi sağlam; konsol error+warn sıfır.

**ELLE adım YOK bu turda** — saf client-side görsel redesign; yeni migration,
yeni tablo, yeni edge function yok. `benim_kartlarim` (mig 025+027) ve tüm
sunucu omurgası dokunulmadan kaldı.

İlgili: [[olmak-istedigin-kisi-2-pencere-tasarimi]] (kalibre referansı) ·
[[kart-gorsel-dili]] · [[uc-muhur-yol-tasarimi]] · [[tasarim-prensipleri]] ·
[[build-source-convention]].

---

## 2026-07-02 · İSİM BİRLİĞİ — tablo `an_kartlari` → `benim_kartlarim` (mig 027 ELLE!)
Emre "uygulama içi ve dışıyla bir olsun" dedi; backend'deki son "An Kartı" izi
kapatıldı. **mig 027**: tablo + 2 indeks + RLS politika adı rename (idempotent;
025 koşmadıysa sessiz no-op — sıra 025→027). **Client (10A)**: `AK_TABLE =
'benim_kartlarim'`, `_akHydrateRemote` 42P01'de `AK_TABLE_LEGACY='an_kartlari'`e
oturum-boyu düşer (`_akTable` çözümlemesi) — 027 koşmadan deploy kırılmaz.
**reset-user + delete-user** tablo listeleri genişledi: benim_kartlarim,
an_kartlari(eski ad), ilham/paylasilan/paylasim_* (mig 023+025), user_letters
+ settings (022) — İKİSİ DE ELLE yeniden deploy ister. SETUP-BENIM-KARTIM.md
§1b/1c eklendi. KARAR: iç KOD önekleri (ak·, _anKartlari, etw_an_kartlari_v2,
dosya adları) bilinçli KARARLI — yalnız kullanıcı/backend'e görünen adlar
"Benim Kartım". KV anahtarı rename ETMEDİK (offline veri kaybı riski).

## 2026-07-02 · 2.0 "TEK NEFES, GERÇEK OMURGA" — tam baştan-tasarım sprinti
Emre "backend+frontend incele, tamamıyla baştan tasarla" dedi; plan onaylandı
(.claude/plans/fuzzy-rolling-tarjan.md) ve 5 fazda döküldü. Kavram (iki kutup /
3 vuruş / tek Atölye / anonim halka) KORUNDU; omurga yeniden döküldü:
- **SUNUCU OMURGASI (mig 025 ELLE!)**: yeni `an_kartlari` tablosu — kart-başına
  satır, owner-only RLS. 10A çift yazım: KV (`etw_an_kartlari_v2`) ayna+offline,
  tablo birincil okuma. `akSave(k)` → kirli-takip + 800ms debounce upsert
  (`_akFlushDirty`); `_akHydrateRemote` post-auth: tablo doluysa bellek tablodan,
  tablo boş+KV doluysa TEK SEFERLİK toplu göç. Tablo yoksa (42P01) sessiz KV modu.
  Eski `ilham_kartlari`'nda mahsur mühürlü kartlar SQL ile göçer (id `ak_ik_…`,
  source:'ilham', lapis kutbunda; golden BOŞ kutup — null DEĞİL, client okur).
- **TEK NEFES**: `_designDual` iki kutbu TEK LLM çağrısında üretir (maxTokens
  1200, 22sn); 5 sahne aynen. Altın atölyede ANLAMLI değişince
  (`_needsLapisRefresh`: başlık ya da madde kümesi saptı) lapis `_designLapis`
  ile tazelenir; değişmediyse S4 = 900ms sahne nefesi (reduced-motion atlar).
- **DAMARLAR**: her `akStrike` → `recordActivityDay()` (merkez seri);
  YÜRÜDÜN → `imEvent('davranis_kaniti')`, 3/3 tören → `imEvent('gecis_karti')`
  (13l taksonomisinden yeniden kullanım — yeni tip yazılmadı).
- **HALKA SUNUCU MÜHRÜ (mig 025)**: `wanderer_rumuz(uuid)` — 10B FNV-1a'nın
  plpgsql İKİZİ (işaretsiz mod-2^32; parite fikstürleri 10B testinde KİLİTLİ:
  0000…→GEZGİN_1GSN/#F0D9A8). BEFORE INSERT trigger'ları paylaşım+yorum
  rumuzunu sunucuda türetir (taklit kapandı). Beğeni/kayıt SELECT → yalnız kendi
  satırların (user_id sızıntısı kapandı; sayaçlar trigger kolonlarından).
  `paylasilan_kart_kopyala` RPC REVOKE. Yeni paylaşım `kind:'benim'`.
- **⚑ BİLDİR + ADMİN**: `paylasim_raporlari` + `report_count` + admin-read
  (admin artık hidden kartları da görür). Feed detayında iki-vuruşlu ⚑;
  admin "HALKA · RAPORLAR" (`switchAdmin('halka-raporlar')` →
  10C `renderHalkaRaporlarAdmin`, host `#halka-raporlar-host`): Gizle/Aç +
  Raporları Temizle. S._ilhamReportedSet yeni slice alanı.
- **CSS EVE TAŞINDI**: 10B+10C JS-enjekte stiller → statik `css/parts/sosyal.css`
  (_src.html link v=1); 10B/10C artık stil enjekte ETMEZ.
- **KÖPRÜ 2.0 (10B)**: cue sıkılaştı (güçlü kalıp YA DA ≥2 zayıf ipucu) +
  seans-başına 2 chip throttle + chip metinleri t() (`ik.chip_cta`).
  `_extractKartTag` — `[KART: tohum]` protokol etiketi parser'ı hazır; persona
  güncellemesi OPSİYONEL ELLE (SETUP-BENIM-KARTIM.md §4). Etiket yoksa cue
  fallback — iki katman birlikte.
- **Bugün cilası**: deste dokunuş/hover flip'i duraklatır (9sn, `_flipPausedUntil`);
  tek seferlik mikro-rehber "✦ Gör · ◉ Yürü · ◆ Ol — üç vuruş, bir geçiş."
  (`etw_ak_rehber_v1`, ANLADIM ile kapanır).
- **DOĞRULAMA**: build temiz, 415/415 test (34→10A/10B'de yeni: _needsLapisRefresh,
  satır↔kart gidiş-dönüş, [KART] parser, SQL parite fikstürleri), preview konsol
  error+warn 0; window.ak* sözleşmeleri + sosyal.css computed + enjeksiyon
  screenshot'ı doğrulandı. ELLE: mig 025 + SETUP-BENIM-KARTIM.md (parite sorgusu içinde).
- **KORUNAN SÖZLEŞMELER**: tüm window.ak* adları, `akSave()` argümansız çağrı
  geriye uyumlu (yalnız KV), akGetContext başlığı, 12c opts, #ak-bugun-strip,
  mig 023 nesneleri DROP edilmedi. ⚠ `_designGolden/_designGoldenPrompt` SİLİNDİ
  (dual'e gömüldü); `_designLapis` tazeleme+fallback olarak YAŞIYOR.

## 2026-06-28 · Bugün hero → UYGULAMA-KARTI DESTESİ (çoklu kart + 3B flip)
Studio "Bugün"deki `#ak-bugun-strip` hero'su eski tek mini-yol tasarımından (altın mini kart ↔ 3-yay halka ↔ lapis mini kart, aşağıda 4. tur §66'da anlatılan) **uygulamanın 12c kart görsel diline + dönen desteye** çevrildi. Önceki oturumda ("Wanderer Studio card design", session limit'e takıldı) kod indi + build temizdi ama doğrulanamadı; **bu oturumda preview'da doğrulandı (tamam)**.
- **`akRenderYolHero`** artık `_activeCards()` (state==='active' && golden olan TÜM kartlar) üstünden bir **deste** (`.ak-yol-deck`, flex) basar — eskiden tek aktif kart vardı. Birden çok "olmak istediğin" yolu yan yana döner.
- **`_flipCardHTML(k,i)`** — her hücre tam 12c app kartı: ön yüz `_faceCard(k.golden,'gold')` (WHO YOU ARE / OLDUĞUN), arka yüz `_faceCard(k.lapis,'lapis')` (WHO YOU MUST BE / OLMAN GEREKEN). `.ak-flip-inner` `transform-style:preserve-3d` + 0.9s cubic-bezier flip; `_startFlipTimer` 4 sn'de bir tüm kartları `is-flipped` toggle eder. Altında `.ak-flip-strikes` (3 vuruş ✦◉◆, `oldum` yalnız gordun+yurudun varsa açık — `disabled` doğru) + `.ak-flip-label` (`_heroLabel`).
- **`_faceCard`** gerçek `window.ikvCardFace`'i kullanır: gold→{stage:'kapi',virtue:'yansima'}, lapis→{stage:'pencere',virtue:'odak'}; ikv yoksa `.ak-card-fallback`.
- **Çoklu kart wiring**: `akStrike(type,id)` + `akOpenDetail(palette,id)` artık `id`'yle o karta hedeflenir (id verilmezse `_getActive()` fallback). Açılışta tıklanan kartın flip durumuna göre palette seçilir.
- **i18n**: yeni `ak.deck_paths` (TR `{n} AÇIK YOL` / EN `{n} OPEN PATHS`) — kicker'da kart>1 ise sayaç. Sözlük 1264/1264 parite.
- **DOĞRULAMA (bu oturum)**: build temiz + konsol error/warn yok; [[an-karti]] §102'deki yöntemle (gerçek `ikvCardFace` markup'ını built CSS üstüne enjekte + screenshot) iki kart yan yana doğrulandı — kart1 altın ön (kapı sahnesi), kart2 lapis arka (gece-pencere), rozet 1/3·2/3, vuruş/disabled mantığı + EN render kusursuz. CSS evi `sentez.css` (`ak-yol-deck/ak-flip*`).

## 2026-06-21 · 4. tur — KAVRAMSAL BİRLEŞME (İlham Kartı 10A'ya gömüldü)
Eski 10B "İlham Kartı" diye anılan ayrı tek-kutuplu yaratım sahnesi sökülüp 10A iki-kutuplu omurgaya çekildi. Artık **TEK kart sınıfı** ve **TEK Atölye** var; iki kapısı var:
- **BUGÜN kapısı** — `ws-greet-hero` input → `akOnboard(ihtiyac, {source:'bugun'})`. Need-label `YAZDIĞIN AN`.
- **SOHBET kapısı** — ~~coach mesajı altındaki altın chip~~ → **GÜNCEL DEĞİL (2026-08-02):** chip kalktı; kart önce arka planda tasarlanır, TUTARSA mesajın arkasında çerçeve belirir → `gkOnboard(display, {source:'sohbet', preDesigned})`. Ayrıntı: [[mesajin-arkasindaki-kart]]. Need-label `SOHBETTEKİ AN`.

Kart şeması `source: 'bugun'|'sohbet'` meta ile genişledi; `shared`/`share_id` da emptyKart'a girdi. Akış, ritüel, sahneler değişmedi; iki kapı aynı 5 sahneye akar.

**Yeni S6 sahnesi — PAYLAŞ KAPISI** (`_renderShareGate`): tören biter bitmez kullanıcıya "Bu yolu Kişilerin Kişileri'nde paylaş?" sorulur. Paylaşırsa sadece **lapis kutbu** snapshot olarak `paylasilan_kartlar`'a (`kind:'ilham'` enum geri uyum) iner; altın kutup ve vuruşlar yalnız sahipte kalır. Atla → özel kalır.

**Yeni 10A exports/window**: `akShare(id)`, `akUnshare(id)`, `akCompletedCount()`, `loadKendiKoleksiyonumView()` (10B'den göçtü), `_completedCards()` (export). `akOpenCollection` detayında tamamlanan karta paylaş/geri-al butonları eklendi.

**`akGetContext` genişledi**: aktif yol varsa eski iki-kutuplu davranış; YOKSA son 5 tamamlanmış Benim Kartım'ın lapis kutbunu "olmak istediği kişi" sinyali olarak verir (eski `ilhamGetContext`'in yerini alır). 09a'da artık tek enjeksiyon: `akGetContext`.

**Kendi Koleksiyonum** tek liste — `loadKendiKoleksiyonumView` 10A'da. Tüm tamamlanmış Benim Kartım'lar tek ızgarada (İlham/An ayrımı kalktı), her tile'da `KARTIM · BUGÜN` veya `KARTIM · SOHBET` etiketi + paylaşım durumu.

**10B sökülen exports** (geriye yalnız ilhamRumuz, _messageSuggestsPerson, _excerptForSeed, _onCoachMessageFinalized kaldı): `ilhamOpenAtolye`, `ilhamOpenDetail`, `ilhamShare`, `ilhamUnshare`, `ilhamGetContext`, `ilhamGetBlendedTargets`, `ilhamMiniCard`, `emptyIlhamKarti`, `_commitDraftToCard`, `_isSealed`, `_normalizeDesign`, `loadKendiKoleksiyonumView`. DB tablosu `ilham_kartlari` ve RPC `paylasilan_kart_kopyala` legacy (artık yazılmaz/çağrılmaz); migration dokunulmadı.

**10C feed**: kart adı "İlham Kartı" → "Benim Kartım"; `sfCopyToMine` artık `paylasilan_kart_kopyala` RPC çağırmaz — `paylasim_kayitlari`'na INSERT atar (save_count trigger'ı doğru artar) + snapshot'tan tohum kurar + `akOnboard(seed, {source:'sohbet'})` ile Atölye'yi açar. Yani başkasının kartı = kendi iki kutuplu Benim Kartım'ını kazıma daveti.

**10f Yol rozeti**: `+N İLHAM` → `+N` (sade); kaynak `window.akCompletedCount()`.

**DOĞRULAMA**: 401/401 test yeşil, production build temiz (3 MB), preview konsol error+warn yok. Window expose'ları: `ak*` fonksiyonları yerinde, eski `ilhamOpenAtolye/ilhamGetContext` `undefined` (sökme doğrulandı). CSS yeni sınıflar (`.ak-share-explain`, `.ak-coll-share`) computed style'da çalışır. Boş `kk-mine-body` view "Henüz Benim Kartım yok." + iki kapı açıklaması ile doğru render edilir. Gerçek kart tile'larının render'ı kullanıcı oturumu ister (production preview'da `window._S` modül-içi `S`'le aynı referans değil).

---

## 2026-06-21 · 5. tur — denetim + tasarım-uyum cilası (TASARIM-PRENSIPLERI.md)
Birleşme sonrası baştan-sona denetim; 4 düzeltme + doğrulama. Sarkan FONKSİYONEL referans YOK (tüm eski 10B export'ları için grep temiz).
- **BUG fix**: `akOnboard` S1 yükleme başlığı hardcode `'Yazdığın anı okuyorum…'` idi → sohbet kapısında yanlış. `loadTitle` kaynağa duyarlı (`source==='sohbet'` → `'Sohbetteki anı okuyorum…'`). `needLabel` zaten kaynağa duyarlıydı; şimdi başlık da hizalı.
- **Ölü state budandı**: `js/state/ilham.js`'ten `_ilhamKartlari` + `_ilhamSeed` kaldırıldı (artık hiç yazılmıyor/okunmuyor; grep temiz). Canlı kalan: `_ilhamLikedSet`/`_ilhamSavedSet` (10C feed) + `_ilhamRumuz` (köprü+paylaşım). Docstring sosyal-feed gerçeğine güncellendi.
- **Mimari decouple**: `kk-mine-*` CSS'i 10B'nin JS-enjekte `#ik-styles`'ından çıkarılıp `sentez.css`'e (10A evi, STATİK) taşındı. Artık `loadKendiKoleksiyonumView` 10B init'ine bağlı değil. 10B `#ik-styles` yalnız `ik-btn*` (10C kullanır) + `ik-coach-cta` tutar. GELECEK İÇİN: bir view'ın CSS'i o view'ın modülünün evinde olmalı; başka modülün JS-enjekte stiline gömme.
- **Tasarım cilası (Prensip #3/#5)**: `.ak-share-explain` flex-bağlam negatif margin (`-4px`) → `0 auto` (boşluk gap'ten); `.ak-coll-share` düz border-top → eriyen `border-image` degrade (kıl-çizgi).
- **Tasarım-uyum DENETİMİ (tam ekran Atölye)**: `.onb-ritual` zemini zaten `--dawn-amber`/`--dawn-indigo` token kullanıyor → zaman-duyarlı (Prensip #2/#3 UYUMLU, fix gerekmedi). Tüm `ak-*` sahnelerde `:focus-visible` altın outline + `prefers-reduced-motion` blokları + 44px hedef + 16px input mevcut (Prensip #9). Kicker'lar Türkçe büyük harf HTML'de yazılı (CSS transform tuzağı yok, Prensip #4).
- **DOĞRULAMA**: build temiz, 401/401 yeşil, preview reload sonrası konsol error+warn yok; `#ik-styles` artık `kk-mine` İÇERMEZ (`includes('kk-mine')===false`), kk-mine statik sentez.css'ten çözülür (pointer + altın Cinzel computed); `.ak-share-explain` marginTop=0px; boş koleksiyon ekranı screenshot ile Prensip #4 kalıbında doğrulandı.


**İFADE / PLANLAMA (2026-06-21):** Kullanıcıya görünen iki ad katmanı:
- **BENİM KARTIM** — kullanıcının girip kendi kartını oluşturduğu/koruduğu alan adı (eski "An Kartı"). Bugün mini-yol kicker'ı, koleksiyon başlığı/girişi, detay başlıkları, koç bağlamı satırı bu adı kullanır.
- **ATÖLYE** — kartın YARATILDIĞI sahnenin adı. 10A loading/review sahnelerinin kicker'ı `ATÖLYE · 1/2 · 2/2 · ŞU ANLIK SEN`. Aynı "Atölye" 10B İlham Kartı yaratımıyla **paylaşılır** (`ATÖLYE · İLHAM KARTI`, `ATÖLYE · OLMAK İSTEDİĞİN KİŞİ`) — bir Atölye, birçok açıdan giriş.

İç tanımlayıcılar (modül adı 10A, dosya `an-karti.js`, state slice `_anKartlari/_anKartiAktif`, fonksiyon önekleri `ak*`, CSS sınıfları `ak-*` + `kk-mine-*--an`, storage anahtarı `etw_an_kartlari_v2`) AYNEN kaldı — bu yalnız ifade değişikliği; içerik/akış/şema aynı. **Planlama sözlüğü de hizalandı** (2026-06-21 2. tur): tüm iç yorumlar/modül banner'ları/CSS başlıkları/`_src.html` yapısal yorumları "An Kartı"→"Benim Kartım" + paylaşılan-Atölye dili; `admin.html` build.sh'in `_src.html`'den ürettiği için otomatik geçti. ⚠️ BLOK YORUM TUZAĞI: yorum içinde `*` + `/` yan yana yazma (`ak*/...`) → `*/` block-comment'i erken kapatır, vite parse hatası; `ak·/...` gibi ayır.

**Backend denetimi (temiz):** edge function'lar ve migration'lar "An Kartı/Benim Kartım" adını TAŞIMAZ — depolama tamamen client-side (SafeStorage + yalnız İlham kartları `paylasilan_kartlar` feed'ine iner; Benim Kartım özel kalır). LLM'e tek köprü `akGetContext()` → satır başı `◈ BENİM KARTIM · İKİ KUTUPLU ANLIK YOL`. DESIGN_SYSTEM/tasarım prompt'ları kartı adıyla anmaz (model yankı riski yok). Yani "backend tarafı" = yalnız 09a enjeksiyonu + bu koç bağlamı satırı.

**Benim Kartım (10A · V2 — iki kutuplu anlık YOL)** — Wanderer Studio'daki `ws-greet-hero` input'unun omurgası. Üç Mühür'ün (10f) **anlık kuzeni**: her ihtiyaç tohumundan altın "olduğun" + lapis "olman gereken" iki kart doğar; aralarında mini Yol kurulur, 3 vuruşla kullanıcı geçirilir, sonunda lapis altına yanar.

**Şema (v2):** `{id, ihtiyac, golden:{baslik,whisper,4cat}, lapis:{baslik,whisper,4cat}, strikes:{gordun,yurudun,oldum}, state:'active'|'completed'|'abandoned', created_at, updated_at, sealed_at}`. v1 (tek-kart) kartlar `_migrateIfV1` ile "completed" olarak göçürülür. `_getActive` yalnız `state==='active'` döner; koleksiyon yalnız `'completed'` gösterir; `'abandoned'` görünmez (veri saklanır).

**Üç anlık vuruş** (Üç Mühür'ün GELDİN/GÖRDÜN/YAPTIN anlık karşılığı):
- **GÖRDÜN** — lapis kartı tap = o kişiyi kabul et (lapis yay)
- **YÜRÜDÜN** — anti-davranışlardan birini yap (altın yay)
- **OLDUM** — son mühür (parlak altın yay) — yalnız gordun+yurudun varsa

**Atölye iki sahne** (`akOnboard`):
1. Loading: `ATÖLYE · 1/2` "Yazdığın anı okuyorum…" → altın tasarım
2. Review: `ATÖLYE · ŞU ANLIK SEN` (gold solo) — isim+whisper+4 kategori önerisi (checkbox-pick + manuel ekleme). Onayla → altın sunum → `ATÖLYE · 2/2` lapis loading → lapis sunum "Bu Yol Benim".

**Bugün ekranı** (`akRenderYolHero`): kicker `BENİM KARTIM · MİNİ YOL`. Yol Hero'nun (10f) alt tasarımı — altın mini kart ↔ 3-yay halka ↔ lapis mini kart + altın→lapis path + verdict. ws-corners, kâğıt gren, ultra-hâl `yolUltraGlow` benzeri nefes — Üç Mühür ile aynı omurga, kendine özgü vuruşlar.

**Greeting:** input HEP **altın** kartı besler ("önce gör" prensibi — fark etmek = ayna); chip satırı altın kategoriyi seçer.

**Tamamlanma** (3/3): `_completionCeremony` — lapis kart altına YANAR (opacity/blur crossfade), "Artık o kişisin" verdict, kart `state:'completed'`, `S._anKartiAktif=null`, koleksiyona iner.

**Koleksiyon** (`akOpenCollection`): Bugün'de aktif yol yokken `#ak-bugun-strip`'te `GEÇMİŞ KARTLARIM · N` girişi → galeri kicker `BENİM KARTIM · GEÇMİŞ KARTLARIM` → tile tıklanınca salt-okunur iki-kutup detay. 10B "Kendi Koleksiyonum"da section label `BENİM KARTLARIM · N`, hücre tag'i `BENİM · GEÇİŞ`.

**Önemli entegrasyon kararları (2. tur denetimde çözüldü):**
- 12c kart: `category` DEĞİL `opts.stage:'pencere'` + `virtue:'odak'` ver (CAT_STAGE anahtar-değil tuzağı → yoksa 'kapi'ye düşer).
- Selamı (bugun-salutation) BİLEREK değiştirme — `loadBugunView` her açılışta ezer; kart kimliği placeholder+şerit+chip'te yaşar.
- `loadBugunView` sonuna `akRenderStrip()+akSyncGreeting()` kancası eklendi (her açılışta tazele).
- Koç bağlamı: 09a `buildPersonalizationPrompt` Benlik Kartı'ndan hemen sonra `window.akGetContext()` enjekte eder; satır başı `◈ BENİM KARTIM · İKİ KUTUPLU ANLIK YOL`.
- `wsGreetingSend` (10-features-w2) artık `akGreetingSend`'e köprü (geri çekilme: Sohbet'e gönder).

**Dosyalar:**
- `js/parts/10A-an-karti.js` — modül (akOnboard/akRenderStrip/akSyncGreeting/akGreetingSend/akOpenDetail/akSeal/akGetContext/akInit)
- `js/state/an-karti.js` — `_anKartlari: []`, `_anKartiAktif: null`
- `_src.html` — `ws-greet-hero` form `akGreetingSend`'e bağlı; altında `#ak-bugun-strip` slot
- `css/parts/sentez.css` — `ak-*` görsel dili (tasarım prensiplerine tam uyum: tokens, Cinzel→Fraunces→italik, --ease-out, prefers-reduced-motion, 44px hedef, 12c kart motoru)
- `js/parts/03-auth-shell.js` — post-auth `akInit` dynamic import
- `js/main.js` — static import ile boot'ta window.ak* açar

**Why:** Kitabın "Mesele Sensin" tezini şu ana indirir — Benlik Kartı kim olduğunu, Benim Kartım o anki ihtiyaçtaki kesiti çizer. "Atölye" adı, kartların doğduğu sahneyi (Benim Kartım yaratımı ⊕ İlham Kartı yaratımı) tek bir alın-teri mekânı olarak konumlar — tek yer, çok giriş.

**How to apply:** [[benlik-karti]] kalıcı kimlik kartıdır; Benim Kartım geçici uydudur (tipik ömür: birkaç saat-gün). Koç bağlamına `akGetContext()` ile enjekte edilebilir (aktif kart varsa). Yeni özellik eklerken Benim Kartım'ı kalıcı Benlik Kartı sanma — ayrı sınıf. Yaratım sahnesi her zaman ATÖLYE adıyla anılır (10A ⊕ 10B [[ilham-kartlari-sosyal-feed]]).

---

## 2026-06-19 · 3. denetim turu (baştan-sona inceleme + geliştirme)
- **KRİTİK BUG düzeltildi:** Tamamlanma töreninin doruğu görünmezdi. `_completionCeremony` `.ak-completion-go` ekler ama mühür halkası/✦ damga/isim/verdict CSS'te ASLA-eklenen `.ak-seal-go`'ya bağlıydı → "Artık o kişisin." normal harekette görünmüyordu (yalnız reduced-motion'da). 4 selektör `.ak-completion-go`'ya bağlandı. **Gelecek için:** tören tetikleyici sınıfı = `ak-completion-go` (ak-seal-go YOK).
- **Koleksiyon görüntüleyici eklendi (büyük boşluk kapandı):** tamamlanan kartlar artık görülebiliyor. `akOpenCollection()` (galeri→salt-okunur iki-kutup detay) + `_completedCards()` + `_renderCollectionEntry()`. Aktif yol YOKken `#ak-bugun-strip` slot'unda "Geçmiş Kartlarım · N" girişi (önceden boşken display:none). Galeri = lapis kimliğin ALTIN 12c mini kartları ("artık o kişi"). `window.akOpenCollection` expose.
- **Yolu bırakma:** `akOpenDetail` footer'ında iki-vuruşlu kırmızı (`--red`, Prensip 1) "BU YOLU BIRAK" → `state:'abandoned'`, aktif null. (Önceden aktif kart 3/3 bitene dek kilitliydi; yeni yol başlatılamıyordu.)
- **Vuruşa-duyarlı metin:** `_heroLabel`/`akStrike` verdict'leri artık hangi vuruşun yapıldığına bakıyor (yurudun önce yapılınca "Gördün" yanlışı düzeldi).
- **~150 satır ölü CSS silindi:** `ak-strip*`, `ak-pole-blocks/divider*`, `ak-stage--review`, `ak-name-edit/label`, `ak-seal-stage/scene/cardwrap/btn`, `ak-seal-go`. KORUNAN (tamamlanma töreni kullanır): `ak-seal-ring/stamp/name/verdict`.
- **Testler:** `tests/10A-an-karti.test.js` (15 test, hepsi yeşil) — bunun için saf yardımcılar export edildi: `_migrateIfV1, _addEntry, _normalizePole, _strikeCount, _completionPct, emptyKart`. Tüm paket 384 test yeşil; `./build.sh` temiz.
- **DOĞRULAMA TUZAĞI (gelecek oturumlar için):** preview (`wanderer-dev`, port 3000) `dist/`'i (production IIFE) python http.server ile servis eder → kaynak modül `import('/js/state.js')` 404; `window._S` YALNIZ vite **dev sunucusunda** (`import.meta.env.DEV`) açılır, `vite build --mode development` bile açmaz. **vite dev sunucusu preview launcher ile BAŞLATILAMAZ** (sandbox node_modules'ı okuyamaz: EPERM). Bu yüzden S'e bağlı UI'ı doğrulamak için: gerçek `window.ikvCardFace` ile fonksiyonun ürettiği markup'ı built CSS üzerine enjekte et + getComputedStyle/screenshot. SafeStorage in-memory `_kvCache` (localStorage değil) + Supabase, post-auth hydrate.

> **⚠️ AD SENKRONU (2026-07-25):** bu dosyadaki modül/dosya/anahtar adları
> ESKİDİR. Güncel eski→yeni haritası: [[ad-senkronu-kurali]]. Kısaca:
> `02c-self-card.js`→`02c-portre.js` (`sc.`→`por.`), `10A-an-karti.js`→
> `10A-gecis-karti.js` (`ak.`→`gk.`), `kk.living`→`kk.butunluk`;
> tablolar `benlik_karti`→`portre`, `benim_kartlarim`→`gecis_kartlarim`.
