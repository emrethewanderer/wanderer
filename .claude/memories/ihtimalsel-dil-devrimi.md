---
name: ihtimalsel-dil-devrimi
description: "Wanderer bilir gibi değil, görebiliyor gibi konuşur" — ölçüm/beyan kesin dilde, YORUM ihtimalsel dilde kalır; kapısı scripts/ihtimalsel-denetci.mjs + tests/ihtimalsel-dil-kapisi.test.js, tabanı sıfırlanmış durumda (sert kapı)
type: karar
---

# İhtimalsel Dil — ölçüm kesindir, yorum ihtimalseldir

> **Bu dosya hakkında.** Bu ada üç yerden bağ veriliyordu
> (`js/parts/i18n/en-deste.js:17`, `tests/12b-deste-en.test.js:9`,
> `js/parts/06-summary-chat.js:552`); hedef dosya `.claude/memories/` altında
> yoktu. Özgün dosya repoya hiç girmedi ([[claude-altyapisi-commit-disi]]);
> **bu metin kurtarma değildir**, bugünkü koddan yeniden keşifle yazıldı.
>
> **Kayıp olan:** kararın mimarisi ve fazları. Denetçinin banner'ı kaynağı
> `.claude/plans/ihtimalsel-dil-devrimi.md` diye gösteriyor, ama **o plan
> dosyası da repoda yok** (`tests/referans-butunlugu.test.js` TABAN'ında
> donmuş bir borç). Yani "devrim"in kaç fazda yürüdüğü, hangi kararların
> alındığı okunamıyor. Bu dosya onun yerine geçmez — **bugünkü kuralı ve
> kapısını** belgeler.

**Why:** Bu kural Wanderer'ın tezinin dilbilgisidir. Kaynak cümle
`js/parts/07b-merhaba-emre-sections.js:43`'te aynen duruyor:

> *"Ölçtüğün ve duyduğun kesindir, yorumun ihtimalseldir — 'Sen şusun'
> demezsin. Sorunu dışarıda değil kişide kök salarsın; ama suçlamadan ve
> hükmü onun yerine vermeden."*

Ayrım [[olus-muhru-2-muhru-sen-basarsin]]'daki *"kart dağıtılmaz, beyan
edilir"* kararının dil tarafıdır ve §6.10'un (gerçeklik kuralı) doğrudan
sonucudur: uygulamanın **bildiği** (ölçüm, beyan, olgu) kesin dilde kalabilir;
uygulamanın **çıkardığı anlam** (yorum, atıf, tahmin, buyruk) ihtimalsel dile
geçmek zorundadır. Kesin konuşan bir yorum, ölçülmemiş bir kesinlik satar.

Uygulamadaki izleri:

- `10q-w2-kisi-karti.js:1964` — *"Ölçüm kesin dilde, yorum ihtimalsel dilde
  (İhtimalsel Dil anayasası)"*; `:2019` — yorum **yalnız bir alıntıya
  bağlıysa doğar** ve ihtimalsel konuşur (kanıt kapısıyla birlikte işler).
- `06-summary-chat.js:550-556` — Duygu Motoru'nun "neden" panelinde ölçüm
  bloğu kullanıcının kendi cümlesini gösterir; yorum bloğu ise
  `'{eksen} olabilir.'` kalıbıyla basılır. Aynı ekranda iki register.
- `13A-derin-calisma.js:534` — bir soru *"değiştireceksin"* diye yazılmıştı;
  bu kullanıcının geleceği hakkında kesin varsayımdı ve **ihtimalsel dil
  kapısına takıldı**, şimdiki zamana çevrildi.
- `16h-ses-sinamasi.js:60` — *"Bilgi verirken bile yorum ihtimalsel kalmalı;
  buyruk kipine ('şunu yapmalısın') kaymamalı."*
- EN tarafı transcreation'dır, çeviri değil: `may / can / often` taşınır,
  *"`olunca` bir VAAT değil bir ihtimaldir"* (`i18n/en-deste.js:17-26`,
  `tests/12b-deste-en.test.js:9`).

**Kapısı var ve taban SIFIRLANMIŞ durumda.** `scripts/ihtimalsel-denetci.mjs`
kesinlik kalıplarını arar — TR: buyruk kipi (`-malısın/-melisin`), çıplak
emir fiili, kesin gelecek (`-acaksın/-eceksin`), cümle sonu kesin yargı eki
(`-dır/-dir/…`); EN: `will`, `must`, `have to`, çıplak `you are/you're`.
`tests/ihtimalsel-dil-kapisi.test.js` denetçiyi `spawnSync` ile koşar (emsal:
`tests/gerceklik-kapisi.test.js`). `scripts/ihtimalsel-taban.json` bugün
**üç dosyada da 0** — yani taban çizgisi kapısı fiilen **sert 0-tolerans
kapısına** dönmüş durumda (K7'nin kendi öngördüğü son hâl).

Bilinçli istisna satırda beyan edilir: `/* IHTIMAL-MUAF: gerekçe */`
(gerekçesiz muafiyet de ihlaldir, §6.10).

> **Dürüst uyarı — belgeyle koşan ayrışıyor.** Hem denetçinin banner'ı hem
> testin banner'ı **"beş sözlük dosyası"** diyor ve `DIL` haritası beş dosya
> tanımlıyor (16b/16e prompt sözlükleri dahil; muaf kategori yorumu bile
> `prompt.identity.core`'u adıyla anıyor). Ama gerçekten taranan liste
> `TARAMA_DOSYALARI` **üç dosyadır** — `node scripts/ihtimalsel-denetci.mjs
> --liste` çıktısı da bunu yazıyor: *"0 ihlal (3 dosya tarandı)"*.
> **Prompt sözlükleri (`16b-i18n-prompt-dict-core.js`,
> `16e-i18n-prompt-dict-en.js`) bugün kapının DIŞINDA.** Bu bilinçli bir
> daraltma mı yoksa yarım kalmış bir genişletme mi, repodan okunamıyor —
> ama "beş dosya korunuyor" diye okuyup prompt'lara kesin dil yazmak
> güvenli değildir.

**How to apply:**

## 1 · Yeni bir cümle yazarken önce kaynağını adlandır

*Bu cümle bir ÖLÇÜM/BEYAN mı, yoksa bir YORUM mu?* Ölçümse kesin
konuşabilir ("üç gün üst üste yazdın"). Yorumsa ihtimalsel kalmalı
("…olabilir", "may", "often") **ve bir kanıta bağlı olmalı** — 10q'nun
kuralı nettir: yorum yalnız bir alıntıya bağlıysa doğar.

## 2 · Sözlüğe yazıyorsan kapı seni sınayacak

`15b` (TR), `15e` (EN), `12b2` (deste içeriği) taranıyor. Yazdıktan sonra
`node scripts/ihtimalsel-denetci.mjs --liste` koş; ihlal çıkarsa ya cümleyi
ihtimalselleştir ya da `IHTIMAL-MUAF` ile gerekçeni yaz. Taban sıfır olduğu
için **bir ihlal bile kapıyı kırar**.

## 3 · Buyruk kipine kayma en sık hata

`-malısın`, `will`, `must` — bunlar "yardımcı" görünür ama hükmü kullanıcının
yerine verir. Register kuralının kendisi bunu tarif eder: *"Tanının gücü
kaybolmaz; son sözü kullanıcı söyler."*

İlgili: [[olus-muhru-2-muhru-sen-basarsin]] (aynı kararın kart tarafı —
hükmü kullanıcı verir) · [[tr-en-i18n-tamamlama]] (EN transcreation'ının
parite tarafı) · [[ad-senkronu-kurali]] (deste metinlerinde uydurulmayan
kitap adları)
