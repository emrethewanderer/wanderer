---
name: gecis-ekrani-masa-destesi
description: "KARAR 2026-08-10 — Geçiş Ekranı'nın üstü iki DESTE olur (Kişilerim'in tam destesi) ve öndeki kart değişince ekranın altı da o karta geçer"
metadata: 
  node_type: memory
  type: project
  originSessionId: cadd5690-6717-450a-9177-7dfeb9bf5db5
  modified: 2026-08-10T16:40:05.164Z
---

Emre'nin 2026-08-10 kararı (FAZ 1 doğrulamasının ardından, ekrana bakarak):
Geçiş Ekranı'nın (`gkOpenDetail`, 10A) üstünde duran **iki mini kart**, Bugün'deki
Kişilerim bölümündeki (`10q2`) **gibi deste** olur — yığın + kaydırma okları.

İki kapsam sorusu soruldu, ikisi de en geniş cevabı aldı:

1. **Deste içeriği = Kişilerim'in TAM destesi.** Altın destede geçiş kutupları +
   mezunlar + kazanılmış Kişi Kartları; lapis destede geçişin lapis kutbu +
   hedeflediklerin. Yani `kkDesteAltin()` / `kkDesteLapis()` aynen.
2. **Alt panel kartla birlikte değişir.** Öne gelen kart neyse ekranın altı
   (ihtiyaç + dört kategori) onu gösterir: geçiş kutbuysa düzenlenebilir
   (aktifse), Kişi Kartıysa salt-okunur. Ekran gerçekten o karta "geçer" —
   deste yalnız bir seçici değildir.

**Why:** Planın merkez kavramı "Kişilerim bir vitrindir, Geçiş Ekranı bir
çalışma masasıdır" (`.claude/plans/gecis-ekrani-toplanma.md`). Bu kararla masa
vitrinin bütününü alır: Bugün'de bakarsın, masada çalışırsın.

**How to apply:** Deste yüzeyini 10A'da yeniden çizme — ikiz motor yasağı (§1.3).
10q2'nin deste çizimi tek kaynaktır; overlay onu tüketir. 10A ↔ 10q2 bağı
`window.*` üzerinden kurulur (statik kenar TDZ açar — 10q kalıbı).
Salt-okunur kuralı [[gecis-karti-mezun-kapisi]] ile aynıdır: yürünmemiş/kazanılmış
kart okunur, yazılmaz.

**Uygulandı 2026-08-10 (FAZ 1B + 1C).** Yüzey: `kkDeckHTML(kind, {idx, dar})` ·
`kkDeckBind(root, {onSelect, onKaydir})` · `kkDeckLen(kind)`. Masa tarafı
`gkOpenDetail` içinde yaşar: `_idx` + `aktifKind` + `_gorunen()` çözücüsü.
Dört gotcha kalıcıdır:

1. **Açılış imleci REF'le kurulur, paletle değil.** Mezun kartın LAPİS kutbu
   ALTIN destededir (`_gkEntry(k,'lapis',true)`) — `palette`'ten desteyi tahmin
   etmek onu yanlış desteye götürür. `gk_<kartId>_<which>` iki destede de aranır.
2. **`onSelect` hangi desteden geldiğini söylemez.** Masa iki desteyi AYRI kaba
   çizip her kabı ayrı `kkDeckBind` ile bağlar; `kind` kabın kendisinden okunur.
3. **Dış imleç tüketicinin sorumluluğudur.** `_deckHTML` `opts.idx`'i yerel
   olarak kırpar ama geri yazmaz; masa da `_onKart()` içinde aynı kırpmayı
   yapmazsa deste küçüldüğünde ekranın altı üstündeki kartı göstermez.
4. **Deste boş kutbu da temsil eder.** v1 göçü kartında (`lapis: null`) deste
   yine `gk_<id>_lapis` elemanı üretir — çözücü var olan kutba düşmezse alt
   panel adsız açılır.

Alan çevirisi tek yerdedir (`gkPoleAsCard`'ın simetriği): katalog `hisler` der,
kutup `duygular`; katalog düz string tutar, kutup `{text,src,at}`. Katalog
kartında `.atl-ore-note` ÇİZİLMEZ — ihtiyaç sözcüğü yalnız geçiş kartında vardır
(§6.10, uydurma yok).

**Görsel kalibre (FAZ 1D, 2026-08-10).** Masa Bugün'ün ızgarasını taşımaz:
`.kkb-body`'nin `1fr auto 1fr`'i geniş kapta doğrudur, overlay dar bir sahnedir
ve orada esnek kap iki desteyi ekranın iki ucuna dağıtır — kaplar sabit
(`flex: 0 0 118px`) ve `justify-content:center` ile toplanır. İki kalıcı ders:

- **Sönen KART'tır, kontroller değil.** Konu olmayan desteye opacity kabın
  tamamından verilirse okları da söner; masada gezinme ana eylemdir ve sönük
  bir ok tıklanabilir olduğu hâlde görünmez olur. Opacity yalnız `.kkb-stack`
  ve `.kkb-tag`'e iner.
- **`--dir` (yelpaze yönü) Kişilerim'in bilinçli kararıdır** — `kisilerim.css`
  yorumu "fanlar birbirine değmez, ön yüzler rotateY ile birbirine bakar" der.
  Masada ters çevirme cazibesine kapılma; taşma varsa sorun yön değil kaptır.

Salt-okunur hâl `.atl-masa-not` ile kendini söyler: form'un yokluğu sessiz
kalırsa kapı düşmüş gibi okunur (§6.2). İki ayrı satır, çünkü iki ayrı hâl:
`gk.masa.okunur_yol` (yürünmüş geçiş) · `gk.masa.okunur_kart` (destenden gelen
katalog kartı).

**Harness gotcha'sı:** `.claude/harness/gecis-ekrani.html` görsel yargının
zeminidir — `viewport` meta'sı yoksa mobil emülasyonda sayfa 980px'e açılıp
küçültülür ve "kart küçük / desteler kenara itilmiş" gibi YANLIŞ tanılar
doğar. Stil href'i de elle yazılmaz (hash her build'de değişir); `index.html`'den
okunur ve ekran stil yüklenmeden açılmaz. Bkz. [[preview-harness-anon-oturum]].

İlgili: [[kisilerim-kart-motoru]] · [[tek-deste-iki-kutup]] · [[an-karti]] ·
[[kart-gorsel-dili]] · [[preview-harness-anon-oturum]]
