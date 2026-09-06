---
name: yasayan-kart-motoru
description: "KARAR 2026-08-07: kartlar Harry Potter portresi gibi YAŞAR (canlı SVG, raster GIF değil); Alfabe Işık kart sahnesinden çekildi; 12 kartın sahnesi ELLE bestelendi; canlı-kart prestiji → Altın Kart (kkCanliMi→kkAltinMi)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 9fe56226-4f02-4c27-ac2e-da8bd5aac600
  modified: 2026-08-07T15:14:15.803Z
---

Emre'nin isteği (2026-08-07): *"Alfabe Işık'ı kart üretiminden çıkartalım ve
kartların görsellerini kartın içeriğiyle tamamen uyumlu ve Wanderer Tasarım
Prensipleri'ne bağlı üretelim. Kartlar artık Harry Potter'daki gibi GIF olsun."*
Plan: `.claude/plans/yasayan-kart-motoru.md` · YEDİ FAZ TAM.

## Dört karar (Emre, AskUserQuestion)

1. **Hareket canlı SVG ile taşınır, raster GIF ile DEĞİL** — "raster/AI görsel
   YOK" kararı korunur. Her boyutta keskin, ~0 KB, ve kullanıcının o an doğan
   kartı da yaşar (gerçek GIF'te imkânsızdı: dosya yok).
2. **Herkes tam canlı** — hareket ödül değil, kartın tabiatı. (Emre burada
   önerilen "iki kademe"yi REDDETTİ; ayrım hareket üzerinden kurulmuyor.)
3. **12 kartın sahnesi elle bestelenir**, motor kullanıcı kartlarında kalır.
4. **Alfabe Işık sahneden çıkar, kart SIRTINDA kalır** — sökülen *dayatma*,
   kullanıcının *seçimi* değil.

## Merkez kavram

Kart bir illüstrasyon taşımaz, bir **pencere**dir. Tek anlamlı istisna:
**kilitli kart nefes almaz** — kazanınca canlanır.

## Mekanik (js/parts/12c-kart-gorsel.js)

- **`IKV_MV` haritası** — hangi motifin ne cinsten kıpırdayacağı motifin
  ADINDAN okunur, kartın nadirliğinden değil. Haritada olmayan motif
  DONUKTUR ve bu bir karardır: zincir (esaret) ve kapan (tuzak) kıpırdamaz.
- **`_mv(cls, svg, opt)`** — sınıf DAİMA dış sarmalayıcıya basılır.
  **GOTCHA:** SVG'de CSS transform, elemanın `transform` presentation
  attribute'unu EZER; sınıfı motifin kendisine koymak `translate()/scale()`
  taşıyan her motifi (agac, fener, figür) kartın köşesine fırlatır.
- **`_isik(o, opt)`** — ışık nabzı motifin TAMAMINI değil ışık VEREN parçasını
  yakar (fenerin alevi titrer, direği durur). Salt opacity olduğu için
  transform taşıyan düğüme de güvenlidir. `--o` tabanı korur: sönük eşik
  ışığı (0.35) ile alev (1.0) aynı aralıkta yanarsa sahnenin derinliği düzleşir.
- **`_mvGec(key)`** — gecikme motifin adından türer (deterministik, `rnd()`
  akışına DOKUNMAZ). Senkron hareket "hayat" demez, "animasyon" der.
- **K2 · üç hâl** (`_ikvHal`): `--donuk` (fog **veya** locked) · `--kisik`
  (mini) · tam. Kilit İKİ yoldan gelir — 10q ızgarada `locked` gönderir ama
  `fog` göndermez; biri unutulursa kilitli kart yaşar.
- **`transform-box:fill-box` ŞART** — SVG'de transform-origin'in referansı
  varsayılan olarak viewBox'tır; olmadan her motif kartın ortasından döner.
- **`ikvMotionScan` + `_mvPlanla`** — görünmeyen sahne duraklatılır
  (`is-durdu`). Tarama ÇAĞIRANA bırakılmaz, sahne ÜRETİMİ kendi planlar.
  **GOTCHA:** planlayıcıda `requestAnimationFrame` KULLANILMAZ — rAF gizli
  sekmede/panelde hiç ateşlenmez ve hiçbir sahne izlemeye alınmaz (bu tam
  olarak yaşandı, `izlenen: 0`). `setTimeout` kısılır ama çalışır.
- `opts.live` EMEKLİ (sessizce yok sayılır, eski çağıran kırılmaz).

## Elle bestelenen 12 sahne (12b2)

`P()` artık `sahne`yi taşır; 12b2'nin toplu ataması **"sahne varsa dokunma"**
oldu — elle reçete kazanır, motor boşluğu doldurur (geçiş dönemi kırıksız).
Evrim hatlarında sahne EVRİLİR: Öz Sevgi `pencere→pencere→açık`,
`şafak→şafak→güneş`, `tohum→kalp→kâse`, bitki `filiz→kök→taç`; Öz Saygı'da
sur hep uzakta durur, mimari büyür (`kapı→sütun→sütun+kapı`).

## Motorun isabeti (12d `_scan`)

Eskiden ilk eşleşen kazanırdı ve "ilk" sözlükteki YAZIM sırasıydı — `kapi`
başta durduğu için "kapı" geçen her metin kapı çiziyordu. Artık ölçü
eşleşmenin kendisi: **uzun ipucu kısadan özgüldür** (`enUzun + (adet-1)*4`),
eşitlikte sözlük sırası korunur (sort kararlı) → determinizm bozulmaz.

## Ad göçü: kkCanliMi → kkAltinMi

Hareket herkesin olunca "canlı mı?" sorusunun cevabı her zaman evet oldu — ad
yalan söylemeye başladı. Ölçüt AYNI (efsane ya da mertebe≥5, sahiplik şart);
değişen, ölçütün ne kazandırdığı: **Altın Kart** — kenar altınla mühürlenir
(`kk-card3d--altin`, `kkAltinNefes`) ve folyo tavana çıkar (`--foil:1`).
reduced-motion nabzı durdurur ama ALTINI bırakır: prestij bir animasyon değil,
bir mühürdür. Test dosyası `tests/12c-altin-kart.test.js`.

## Işığın kalanı (KORUNDU, kanıtlandı)

12c'den `nisan_*` motifleri, 12d'den `KW_NISAN_EK`/`input.nisan`/
`_kumAktifNisan`/`_kumNisanGuide`, 16b+16e'den `prompt.kum.nisan_guide`
söküldü. **Kalan:** 12e/12e1 salonu · 10o kapı kazıması · 10D "Yolunun Nişanı"
+ `ikvCardBack({etch})`. Bu turda bir **ikiz motor** da kapatıldı: 10o kendi
`_isikEtchNisan()` sıralamasını yazmıştı, `isikLastWritten` tek kaynağına
bağlandı (12d çıkınca o kaynak yetim kalacaktı).

**Geri uyum bedavaydı:** `ikvNormSpec`→`_mList` bilinmeyen motif anahtarını
zaten süzüyor → KV/DB'de kayıtlı eski `nisan_*` reçeteler KIRILMADAN, sessizce
nişansız çizilir. Ayrı göç katmanı yazmak ölü kod olurdu.

**Why:** Kartın sahnesi kartın anlamına ait olmalı — kullanıcının başka bir
odada yazdığı nişana değil. Ve hareket, kartın canlı olduğunun kanıtıdır:
"Mesele Sensin" tezinin görsel karşılığı, senin olan şeyin nefes almasıdır.

**How to apply:** Yeni motif eklerken `IKV_MV`'ye hareket vermek ZORUNLU
değildir — sessizlik de bir karardır. Hareket verirken sor: bu motif
gerçekten kıpırdar mı, yoksa sahneyi mi gürültüye boğarım? Yeni kart
eklerken `sahne` yaz; yazmazsan motor devralır ama görsel bir tarama
sonucudur.

Bkz. [[kart-gorsel-dili]] · [[kart-uretim-motoru-huzura-cikis]] ·
[[deste-12-kesit-karari]] · [[nur-alfabesi-plani]] · [[tasarim-prensipleri]] ·
[[dorduncu-usta-hearthstone]] · [[holo-kart-motoru]] · [[yuz-cizgisi-motoru]]
