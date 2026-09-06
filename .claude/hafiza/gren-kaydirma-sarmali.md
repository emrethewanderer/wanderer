---
name: gren-kaydirma-sarmali
description: "GOTCHA + motor: kaydırma kabına asılı gren/süs kaydırınca kayar; çare .wn-grain sarmalı (base.css) + tests/gren-kaydirma-kapisi.test.js"
metadata: 
  node_type: memory
  type: project
  originSessionId: af8cd71e-9889-491b-b385-ee9b6da72b09
  modified: 2026-08-23T17:35:16.972Z
---

**Kaydırma kabına doğrudan asılan mutlak süs, içeriği DEĞİL görünen kutuyu
ölçer** (2026-08-23'te ölçüldü). `overflow-y:auto` bir kabın `::before`'ı
`position:absolute; inset:0` ile kabın *padding box*'ını alır: yüksekliği bir
ekran boyunda kalır **ve kaydırma ile birlikte yukarı kayar**. Sonuç: kâğıt
greni ilk ekrandan sonra biter, iki ekran aşağıda bütünüyle ekran dışındadır —
yüzey kaydırıldıkça düzleşir (`TASARIM-PRENSIPLERI` §3'ün ihlali).

Ölçüm (Chrome, canlı): 617px'lik kapta içerik 782px → **166px grensiz**; ikiz
öğe kaydırınca `top: 51 → -114`.

**Elenen iki çare — bir daha denenmesin:**
- `position: fixed`: transform'lu bir atası olan fixed öğe o ataya göre
  konumlanır **ama scroll offsetini yine alır** (ölçüldü: 20 → -680). Modallerin
  çoğu `transform: translate(-50%,-50%)` taşıdığı için cazip görünür; değildir.
- Greni kabın `background-image` yığınına almak: kaydırmaz (doğru davranış) ama
  taban `linear-gradient`'lar **opaktır**, gren altta kalıp yok olur; en üste
  alınınca da doz kontrolü kalmaz (gren SVG'sinin kendi alfası .85). Üstünde
  `background-blend-mode` §3'te yasak ("Gezgine Mektup" dersi).

**Çare — tek motor `.wn-grain` (`css/parts/base.css`):**
`position:relative; min-height:100%; display:flow-root` + `::before` içinde
`var(--grain-img)`, dozu `var(--grain-op)`. Gren kabın değil, **yüksekliği
içeriğin kendisi olan sarmalın** üstündedir. Yeni bir gren yüzeyi eklerken:
markup'a sarmal, kabın kuralına `--grain-op` (gerekirse `--grain-size`).

Üç tuzak, üçü de yaşandı:
1. **Yastık sarmala taşınır.** Sarmal kabın *content* kutusunu kaplar; padding
   kapta kalırsa gren kenar boşluklarını örtmez. `padding` kaptan `.<yüzey>
   .wn-grain`'e geçer — **media query override'ları dahil** (dar ekran bloğu
   atlanmıştı), ve genel bir kural mirası varsa (`.modal`) kapta `padding: 0`
   ile susturulur.
2. **`display: flow-root` şart.** Kaydırma kabı kendi blok bağlamını kurar,
   sarmal kurmazsa ilk/son çocuğun marjı sarmalın DIŞINA taşar → yastığı 0 olan
   yüzeylerde gren 12px eksik kalır.
3. Eski `z-index:-1` katmanı gerekmez: `.wn-grain > * { position: relative }`
   içeriği grenin üstünde tutar. Sarmal gelince yüzeyin kendi `> *` kuralı
   ölür — söküldü.

**Yayılım (2026-08-23):** sekiz yüzey, on iki markup noktası — `at-modal`,
`gl-modal` (×3), `ig-modal` (×3), `mpc-sheet`, `olus-y-sheet`, `sm-modal`,
`announce-sheet`, `.closure-ritual .modal` (`_src.html`). Kök, Yol ekranının
çizgisinde bulundu (`.yolp-body::before` → `.yolp-body-in::before`) — aynı
kırık sınıfı, aynı gün taranınca sekiz kardeşi çıktı.

**Kapı:** `tests/gren-kaydirma-kapisi.test.js` — kaydırma kabına asılı gren
belirirse kırmızı yanar; kapı kendini de sınar. Bilinçli istisna satırda
`/* GREN-MUAF: gerekçe */` ile beyan edilir. İki incelik çapraz denetimden
geldi: (1) kaydıran seçicilerin seti **repo genelinden** kurulur — kap bir
dosyada, süs başka dosyada olabilir; dosya dosya bakan kapı o vakayı sessizce
geçirirdi. (2) `position: fixed` **kendiliğinden kırık değildir**: atası
transform/animation taşımıyorsa süs viewport'a sabitlenir ve kaydırma onu
taşımaz (emsal `#auth-screen::after` — kapıya körce eklenince ilk iş onu
yanlış pozitif bastı). Kırık ancak kap kendini containing block yaptığında
doğar.

**Why:** Kırık ne konsolu kızartır ne testi kırar; yalnız gözle, o da ancak yan
yana konursa görülür — "diskte doğru, ekranda eksik" ailesindendir. Elle
bulunan şey ikinci kez elle bulunmasın diye kapıya bağlandı.

**How to apply:** Kaydırılan bir yüzeye doku/süs eklerken önce sor: *bu süs
kabın mı, içeriğin mi boyunda?* Kap kaydırıyorsa süs `.wn-grain` sarmalına
gider. Aynı soru grenden başka mutlak konumlu tam-kap süsler için de geçerlidir
(kenar ışığı, vinyet, filigran).

İlgili: [[uc-muhur-yol-tasarimi]] (kırığın bulunduğu yer) [[tasarim-prensipleri]]
(§3 hiçbir yüzey düz değildir) [[gezgine-mektup]] (blend-mode yasağının kaynağı)
[[sahne-katmani-ws-body-hapsi]] (akraba gotcha: kutu sanılan kap).
