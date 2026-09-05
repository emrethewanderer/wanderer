---
name: olus-muhru-karari
description: "KARAR 2026-07-27: kart dağıtılmaz, beyan edilir — kazanım kullanıcının onayına bağlandı (Oluş Mührü); dağıtım hattı söküldü, TÜM FAZLAR TAM (2026-07-28)"
metadata: 
  node_type: memory
  type: project
  originSessionId: d6745c7b-732b-435e-8189-8885f9c6b3ae
  modified: 2026-07-28T10:56:16.364Z
---

**Emre'nin kararı (2026-07-27):** *"Wanderer böyle kart dağıtamaz!
Wanderer'da kullanıcı kartını belirler ve Emre öneri olarak sunar."*

Bu karar iki soruyu birden kapattı: kartın kime ait olduğuna kim karar verir
(kullanıcı) ve Wanderer'ın elinde stok var mıdır (yoktur).

**Why:** Kitabın tezinde bir kişi olmak **beyan edilen** bir şeydir. Sistem
reçete tutunca kartı sessizce veriyordu — kullanıcı adına karar veriyordu.
Ayrıca kart yağmuruna karşı kurulan ilk panzehir (günlük tavan + kuyruk +
yelpaze) bir **dağıtım hattıydı**; akışı yavaşlatmak stoku meşrulaştırıyordu
([[kart-yagmuru-toren-ritmi]] artık tarihsel kayıt).

**Merkez kavram — "Kanıt kimdeyse, yük ondadır."** Aynı kapıya iki yol çıkar:
- **Davet** (Wanderer kanıtı gördü) → tek soru yeter: *"Artık o kişi gibi
  hissediyor musun?"*
- **Sınama** (kullanıcı iddia ediyor) → kanıtı o verir: dört boyutta dört soru.

Plan: `.claude/plans/olus-muhru.md` (7 faz, devir etiketli).

## How to apply (kod haritası · TÜM FAZLAR TAM, 2026-07-28)

| Ne | Nerede |
|---|---|
| Eşik havuzu (reçete tuttu, beyan bekliyor) | `kk.esik` — 10q |
| Kazanımın **TEK yazarı** | `kkMuhurle(cardId,{yol})` — 10q (kkTick artık yalnız ölçer) |
| Öneri rafı (en güçlü 3, hedefliler önce) | `kkOneriRafi(n)` · `kkEsikDurum/Liste` — 10q |
| İki perdeli davet töreni | `olusDavetAc` / `olusDavetSun` — **10q4** (yeni, önek `olus`) |
| Dört sahneli sınama | `olusSinamaAc` · `olusSinamaBekleme` (7 gün) — 10q4 |
| EŞİKTE nişanı (tek kaynak) | `kkEsikNisanHTML(cardId)` — 10q; tüketiciler: ızgara hücresi · spotlight · kart detayı · 10q2 lapis deste yüzü |
| Kimlik olayı | 13l `IM_TAXONOMY` → `olus_beyani` (tier 2, w 8) — **sayaçla**, `imEvent` çağrılmaz |

- **`collection` sözleşmesi dokunulmaz:** varlığı "kart senin" demek ve 20+
  tüketicisi var (`owned`, `kkPartitionDeck`, `porCardRefs`, aile/panzehir,
  10q3, 13l). Eşik havuzu AYRI yaşar; oraya yazan tek fonksiyon `kkMuhurle`.
- **Miras:** `muhur` alanı olmayan `collection` kaydı mühürlü sayılır — eski
  desteler dokunulmaz, geriye dönük soru sorulmaz.
- **Sıra kritik:** `kkMuhurle` içinde `porAbsorbCard` ÖNCE, `delete
  kk.hedefler` SONRA ([[olunan-ve-niyet-alinan-karari]] dersi).
- **Baraj'ın (`minEvidence`) rolü değişti:** kazanım kapısı değil **öneri
  eşiği**. Beyan yolu barajdan bağımsızdır — kullanıcı barajı geçmemiş karta
  da "artık o kişiyim" diyebilir.
- **Paket töreni beyan yolundan ÇIKARILDI** (plandan bilinçli sapma): 80'ler
  folyo paketi bir *hediye* jestidir, Oluş Mührü'nün tezi tam tersi. Evrim ve
  sentez törenleri KALDI — onlar dağıtım değil dönüşüm jestleri. Paylaşım
  mühür perdesine taşındı (eski "paylaş yelpazede yok" tutarsızlığı kapandı).
- **TR ek tuzağı:** `{portre}` özel ad taşır ("Olunan Emre") — iyelik eki
  kestirilemez ("Emrenın"). Microcopy eksiz kuruldu. Boyut adlarının bulunma
  hâli koda değil **sözlüğe** yazıldı (`olus.dim_loc.*`, -lerinde/-larında).
- `.ikv-card` genişliğini PARENT'tan alır (`width:100%; aspect-ratio:5/7`) —
  tören sarmalayıcısı ölçü vermezse kart 2px doğar (`.olus-card{width:200px}`).

- **Öneri bloğu iki modludur** (10q `kkEmreBlock`): havuzda kart varsa RAF modu
  ("BUGÜN SENDE BELİRENLER" + rafın kalanı işaretçi) — Emre'nin curated imzası
  bu modda **düşer**, çünkü seçim kullanıcının kendi verisinden doğdu; havuz
  boşsa eski curated blok (12a `EMRE_ONERI`) aynen döner.
- **Eşikteki kartta baskı diller susar:** ızgara ipucu ve spotlight'ın
  "bu kadar yaklaşmışken bırakma" kaybı gösterilmez — beyan baskı altında
  verilmez.

**Bekleyen ELLE iş:** `kisi_karti_profile.esik JSONB` (000_wanderer_schema.sql).
Uygulanmadan da kırılmaz — 42703 yakalanır, havuz IndexedDB'de yaşar.

**Törenleri gözle görmek için:** `kisilerim-test.html` harness'ı eşik havuzunu
seed'ler ve "Oluş · davet töreni" / "Oluş · sınama" düğmelerini taşır
(`localhost:3030` sunucusu, build'e girmez). Uygulamanın kendisi anon preview'da
`S._kisiKarti` kurmadığı için tören yüzeyleri orada görünmez — harness tek kapı.

**Gotcha (test):** çift tören guard'ı `_olusOpen` modül kapsamındadır ve yalnız
kapanış akışında düşer; portalı silmek onu temizlemez. Davet açan her test kendi
kapanışını yapmalı, yoksa sonraki test sahneyi hiç açamaz.

Bkz. [[kart-yagmuru-toren-ritmi]] · [[kisilerim-kart-motoru]] ·
[[olunan-ve-niyet-alinan-karari]] · [[iki-kisi-bir-deste]] · [[model-devri-sandvic]]
