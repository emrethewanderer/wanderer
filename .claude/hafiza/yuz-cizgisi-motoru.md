---
name: yuz-cizgisi-motoru
description: "2026-08-04 — İki ana kartın (Olunan/Niyet Alınan) çizimi kullanıcının profil fotoğrafından ölçülür: 12g ten segmentasyonu + madalyon + kontur gravürü; altın/lapis aynı yüz, arka plan yıldızlar"
metadata: 
  node_type: memory
  type: project
  originSessionId: b709e692-0f0e-4f16-8597-f214f685635e
  modified: 2026-08-07T16:38:35.929Z
---

**Emre'nin kararı (2026-08-04):** *"Ana iki kartın çizimleri kullanıcının
profil fotoğrafıyla oluşturulsun. Sadece uygulamada, arka plandan yüz ayrılmış
şekilde SADECE YÜZ. Arka plan yıldızlar olsun. Attained altın, Intended lapis."*
Çizgi dili: **kontur gravürü** (dört seçenek arasından seçildi).

Sunucu/görsel model YOLU REDDEDİLDİ — her şey cihazda, kota harcanmadan,
fotoğraf dışarı çıkmadan.

## Motor · `js/parts/12g-yuz-cizgisi.js` (önek `yz`)

Zincir: foto → **ten kroması** (YCbCr; tanıma değil ölçüm) → en büyük bağlı
parça → **açma** (saç arasından sızan gökyüzü benekleri düşer) → kapama →
sınır kutusundan **madalyon elipsi** → kırpma yüzü kartın kutusuna oturtur →
maske içinde ton dengelenip gerilir → **yatay şerit gravürü**.

- Tek giriş: `yzKonturGovde({palette, mini})` → yalnız `<path>`ler.
- `yzEnsure(url)` ölçer (idempotent, yarış korumalı), `yzVar()`, `yzUnut()`,
  `yzInit()` (03-auth post-auth; bitince `loadPortreView`/`oikRenderHub` tazeler).
- Kalıcılık YOK — her oturumda yeniden ölçülür (bayat iz olmaz). Ölçüm 42 ms,
  çizim 4 ms; gövde 76KB (tam) / 24KB (mini LOD).
- Foto değişince `saveUserSettings` → `yzUnut()` + `yzInit()`.

## Sahne · 12c dalı

`card.yuz === true` → `ikvScene` gövdeyi 12g'den alır, **göğü/yıldızı/çerçeveyi
kart dilinden kendisi kurar** (`ikvYuzSahne`). Kart dili tek kaynak kalsın diye
12g yalnız konturu ve madalyon ölçüsünü verir (`yzMadalyon()` → yüzün ovalin
içindeki yeri; ÇERÇEVE DEĞİL, yıldız seyreltmesi için). `fog` kartta yüz yok.

**ÇERÇEVE OVAL — Emre'nin son kararı (2026-08-04, üçüncü tur):** bu iki kartta
kartın çerçevesi dikdörtgen DEĞİL ovaldir.
- `F = {cx:100, cy:130, rx:76, ry:94}` — gök **ovalin içini** doldurur, içerik
  ovale `clipPath` ile kırpılır, **çift altın hat** çerçevedir (lapis kartta da
  ALTIN — eşik ışığı sözleşmesi). Zemin çizgisi YOK: oval kendi ufkudur.
- **Yüz ovali DOLDURUR**: 12g'nin çizim kutusu (`X0..X1=24..176`,
  `Y0..Y1=36..224`, `GH=129`) ovalin sınır kutusudur; `DOLGU=0.84` yüzü ona
  oturtur. Emre'nin şikayeti buydu: *"oval büyük ve yüzüm kesilmiş hâlde."*
- **Kartın iç dikdörtgeni çekilir**: `.ikv-card--yuz .ikv-frame{display:none}`.
  Karar `window.yzVar()`'dan DEĞİL sahnenin kendisinden okunur — yüz sahnesi
  `data-yuz="1"` taşır, `ikvCardFace` ona bakar. Yoksa dışarıdan sahne verilen
  kart (10f/10t `opts.scene`) hem ovalsiz hem çerçevesiz kalırdı.
- **Yıldızlar yüzün üstüne düşmez**: `ikvStars(..., skip)` madalyon ölçüsünü
  okur; tohum akışı bozulmaz (deterministiklik korunur), o yıldız basılmaz.
- **Kırpma kelepçesi**: pencere fotoğrafın dışına taşarsa KAYDIRILIR,
  küçültülmez — yüzün ölçüsü bozulmadan kenarda boş şerit kalmaz.

Bayrağın takıldığı 4 yüzey: 02c hero (`portre-olunan`) · 10D hub (`oik_*`) ·
02d Eşik (`esik-portre`/`esik-oik`) · 10f Yol (`yol-portre`/`yol-oik`).
**Kapsam dışı kalan:** 10q3 Benlik Yapısı düğümleri.

### Tazeleme listesi bayrak listesiyle EŞ olmalı (2026-08-07 kırığı)

`yzInit` ölçüm bitince açık yüzeyleri yeniden çizer — ama liste **iki**
yüzeydeydi (`loadPortreView`, `oikRenderHub`), bayrak **dört** yüzeyde.
Bugün'ün iki ana kartı (`#yol-hero`) listede yoktu: 10f'nin kendi 3200 ms'lik
güvenlik tazelemesi, fotoğraf indirmesi yavaş olduğunda ölçümden ÖNCE bitiyor
ve kartı bir daha kimse çizmiyordu → kart yüzsüz, dolayısıyla **ovalsiz**
donuyordu. Emre'nin "iki oturum önce değiştirdik ama güncellenmemiş"
şikayetinin kök nedeni buydu (ikinci neden SW cache'iydi:
[[preview-sw-bayat-modul]]).

- `window.yolRenderHero?.()` listeye eklendi.
- **Eşik (02d) bilerek liste DIŞI**: `render()` töreni baştan oynatır,
  tazelemek kartları animasyona geri atardı.
- 02c'nin DOĞUŞ sahnesindeki `portre-olunan` kartında bayrak eksikti — aynı
  id'li kart doğarken dikdörtgen, hero'da oval görünüyordu. Tek kart, iki yüz
  olmaz; bayrak eklendi.
- Sözleşme `tests/12g-yuz-cizgisi.test.js` sonundaki dört testle **kaynakta**
  mühürlendi (ölçüm jsdom'da koşmaz, davranış birim testiyle yakalanamaz).
  Testlerden biri kapının kendini kanıtlamasıdır; biri de `window.x?.()`
  çağrısının karşılığının gerçekten expose edildiğini sınar — optional
  chaining eksik köprüyü sessizce yutar. Bkz. [[yetim-kopru-denetcisi]].

## Neden böyle (denenip ELENENLER — tekrar denemeyin)

1. **Ton haritası tek başına yetmez.** Kart obsidyen; fotoğrafın arka planı
   özneden parlaksa (Emre'nin portresi tam bu) hangi kutbu seçersen seç
   altın kütle ya da delik çıkar. Kurtaran şey segmentasyondur, ayar değil.
2. **Silueti izlemek yanlış** — ten lekesinin pürüzlü sınırı saç/gökyüzü
   kaçaklarını içeri alıyor. Doğru geometri **elips madalyon** (markanın
   `.wns-portrait` ovali).
3. **Elips ikinci momentten türetilmez** — düzensiz lekede yarıçapı şişirip
   ovali saça taşır. **Sınır kutusundan** türetilir.
4. **Doygunluk tuzağı:** germe + S eğrisi + eşik üst üste binince her şey
   dolu çıkar. Şerit tavanı `pitch`in ALTINDA kalmalı (0.80) — aralarda
   obsidyen nefes payı olmazsa yüz tek kütleye döner.
5. Yerel kontrast **maske içinde** uygulanır (saç kütlesi yüzü ezmesin);
   dışarıda uygulanınca ton kütlesini yok edip dalga desenine çeviriyor.
6. **LEVHA kipi (`tabaka:true`) SÖKÜLDÜ** (08-04, üçüncü tur). Şeritlerin
   madalyon dışında da sürmesi, yüz küçük kaldığı sürece boşluğu dolduruyordu;
   yüz ovali dolduran kadrajda gereksiz kaldı ve gökyüzünü yiyordu. Mürekkep
   artık yalnız yüzün maskesinde akar — Emre'nin ilk kuralı: SADECE YÜZ.
7. **Küçük portre madalyonu ELENDİ** — `.wns-portrait` ölçüsü (56×71) kartın
   ortasında bir madalyon olarak denendi; kart dili açısından doğruydu ama
   Emre dev ovali seçti: *"önceki dev oval çerçeveye dönelim."* Ölçü küçülünce
   çerçeve kartın çerçevesi olmaktan çıkıp bir rozete dönüşüyor.

## Gerçeklik (§6.10)

Çizim bir **ÖLÇÜMDÜR**, kaynağı kullanıcının kendi fotoğrafı. Foto yoksa,
`ui-avatars` vekiliyse (baş harflerden üretilmiş yer tutucu YÜZ DEĞİLDİR),
ten kanıtı eşiği geçmiyorsa ya da CORS düşerse → `null` ve kart bugünkü
sahnesinde kalır. **Olmayan yüz uydurulmaz.** Denetçi temiz, `tests/12g-yuz-cizgisi.test.js` (12 test) bu kapıyı ve 12c dalını mühürler.

## Bilinen sınır (dürüst)

Sahne fotoğraflarında (kalabalık arka plan, profilden çekim, saç kütlesi
büyük) sonuç tanınır bir baş madalyonudur ama yüz hatları tam çözülmez.
Yüzün kareyi doldurduğu sade fotoğraflarda gravür belirgin okunur.

Bkz. [[kart-gorsel-dili]] · [[olunan-ve-niyet-alinan-karari]] ·
[[benlik-karti-2-olunan-ad]] · [[olmak-istedigin-kisi]] · [[esik-ekrani]] ·
[[uc-muhur-yol-tasarimi]] · [[emre-foto-oval-cerceve]] ·
[[gerceklik-mimarisi]] · [[preview-sw-bayat-modul]]
