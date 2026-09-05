---
name: kisisel-baslaticilar-gunun-alintisi
description: "10y2 kişisel başlatıcı motoru (bsl*) — üç katmanlı şerit + kanıt kapısı; Günün Alıntısı Kitaplık okurunun üstünde şerit; ELLE: sohbet-baslaticilari deploy"
metadata: 
  node_type: memory
  type: project
  originSessionId: fd4f311e-3fa3-42de-baae-e351cde136f5
  modified: 2026-08-12T09:59:51.547Z
---

**KARAR (Emre, 2026-08-10/12).** Ana ekranın başlatıcı şeridi herkeste aynıydı
(mig 028'in model starter'ları). Artık üç katman: yeterli veri varsa yaşam
verisinden, yoksa Benlik Kartı'ndan, hiç veri yoksa model başlatıcıları aynen.
Üretim yolu **yalnız LLM** (istemci-şablon ve hibrit reddedildi); kanıt yüzeyi
**basılı tut → "Neden bu?"** (çipte görünür düğme yok).

**Motor `js/parts/10y2-baslaticilar.js` (önek `bsl`):**
- `bslMalzeme()` — `ihOlgunluk()` üç kademesi (13v:66) katmanı seçer, ama KARAR
  havuzundur: "tanıdık" dese bile havuz boşsa portre katmanına düşer. Yaşam
  havuzu = `kokenKullaniciSozleri(14)` + `sdSonSozler(8)`; portre havuzu =
  `S._portre` dört kategorisinin **yalnız `src:'user'`** maddeleri.
- `bslDokuMaybe()` — `kokenSozBlok` → edge fn → `kokenAlintiCoz`. **Kanıt kapısı
  eşiksiz:** ref çözülemeyen soru DOĞMAZ; hepsi düşerse şerit modele döner.
  Depo SafeStorage per-uid `etw_baslatici_v1_<uid>`, gün anahtarı `localISODate()`.
- `bslOku()` — 10y'nin tek okuma yüzeyi; kalite kapısını + `secBeyanVar` (09i
  susturma) elemesini YENİDEN uygular (depo kurcalanmış olabilir). Max 3.
- `bslGecerli()` — kalite kapısı, sunucudakinin İKİZİ: 20–110 karakter, tek
  cümle, **ikinci tekil hitap yasak** (soru kullanıcının ağzından çıkar),
  şablon sızıntısı yok. Sıra sayısının noktası (`3.`) maskelenir — yoksa
  "3. kez aynı hatayı yapıyorum" iki cümle sanılıp elenirdi (testte yakalandı).
- Soru kimliği metninden türer (`_soruId`), günden değil: susturma gün dönünce
  unutulmaz.

**Şerit (10y `_seritCipleri`)** tek kaynaktır: kişisel önce (max 3), `fmStarters()`
kalan yuvaları doldurur (max 4 — CSS kademeli girişi `nth-child(4)`'e kadar).
`llmStarterSend` indeksi de oradan çözer; iki liste ayrı sayılsaydı üçüncü çipe
dokunan dördüncüyü gönderirdi.

**Basılı tut** (10q4:415 deseninin kardeşi, 500ms): `kkNedenAc('baslatici', id)`
→ 10q `_nedenVeriBaslatici`. Panel gövdesine geriye uyumlu `alinti.head` /
`alinti.yorum` alanları eklendi (sınamanın "Sınamada {boyut}…" cümlesi
başlatıcıya uymuyordu). Beyandan sonra tazelenen yüzey türe bağlı:
`baslatici` → `llmRenderHome`, kartlar → `loadKisilerView`.
GOTCHA: capture aşamasında `click` engellenir — yoksa basılı tutup bırakınca
panel açılırken soru da sohbete giderdi.
GOTCHA: `visibilitychange` dinleyicisi ÇİP BAŞINA değil modül düzeyinde —
`llmRenderHome` her çizimde çip yaratır, çip başına dinleyici document'ta
birikirdi (dikiş turunda bulundu, testle mühürlendi).

**GÜNÜN ALINTISI — üç yer değiştirdi, son yeri kitabın kendisi.**
Kitaplık çipi (4. starter) SÖKÜLDÜ → composer ayracı → **son karar (08-12):
Kitaplık okurunun üstünde şerit** (`.lib-gunun`, `_libRenderReader` içinde).
Drawer'ın kitap sembolü → `libOpenReader()` → üstte bugünün cümlesi, altta
yazılar. Dokunuş cümlenin geldiği yazıya götürür ve `.lib-hl` ile işaretler —
`_goTo` bilerek kullanılmaz (o yol highlight taşımaz).
Motor aynı: `_sozPick()` (10g). `libGununAlintisiHazirla()` artık **senkron**,
okur çizilirken çağrılır; cache uid ile mühürlü (`_sozCacheUid`) — hesap
değişince önceki kullanıcının alıntısı taşınmaz.
Alıntı **EB Garamond italik** (§4: Fraunces başlıkların sesidir); metafor
**KAP** (§0.1 — Kitaplık zaten Kap'tır); kicker Cinzel altın, `text-transform`
YOK (Türkçe İ/I tuzağı — CSS uppercase EN `lang`inde "İlişki"yi bozuyordu).

**Composer sadeleşti (Emre, 08-12):** `.cl-ai-note` (EU AI Act m.50 / SB 243 /
Utah HB 452 satırı) KALDIRILDI — bilinçli ürün kararı, hukuki uyarı commit
`5e71e52`'de kayıtlı. `#chat-input` ilk ölçülerinde (`padding: 2px 4px 10px`).

**ELLE bekleyen:** `supabase functions deploy sohbet-baslaticilari`
(`SETUP-BASLATICILAR.md`). Yeni migration YOK — kota `fn_quota_consume`
RPC'sini `p_fn='sohbet-baslaticilari'` ile kullanır. Deploy edilene kadar
şerit model başlatıcılarıyla çalışır (üçüncü katman aynı zamanda emniyet
subabıdır). **Dilin son kalibrasyonu deploy sonrasına kaldı** — kontrol
tablosu `SETUP-BASLATICILAR.md §7`.

Gizlilikte `soz-terzisi`'nden bilinçli ayrım: Terzi ham metin almaz, bu
fonksiyon alır — model kanıtı uydurmasın diye görmesi gerekir.

Plan: `.claude/plans/kisisel-baslaticilar-ve-gunun-alintisi.md`
İlgili: [[kesin-alinti-mimarisi]] · [[gerceklik-mimarisi]] · [[tanima-motoru]] ·
[[soz-ihtiyac-motoru-karari]] · [[kitaplik-sozu-ve-toast-kapilari]] (sökülen
çipin kökeni) · [[odak-modelleri]] · [[ihtimalsel-dil-devrimi]] ·
[[tasarim-prensipleri]] · [[dil-modeli-kabugu]]
