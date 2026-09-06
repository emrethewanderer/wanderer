---
name: olus-muhru-2-muhru-sen-basarsin
description: "2026-07-28 TAM: Oluş Mührü II — dört boyut ikna kapısı (IKNA_ORAN .85), kapalı kart+flip açılış (folyo paket SÖKÜLDÜ), dokunuş yaprağı, basılı-tut mühür + lapis→altın erime"
metadata: 
  node_type: memory
  type: project
  originSessionId: 867463af-752c-41d3-a1ed-6f9dd45e5c89
  modified: 2026-08-03T13:28:44.859Z
---

Emre'nin dört notu (2026-07-28) Oluş Mührü törenini yeniden kurdu. Tören
artık **üç durak**: kapalı kart (çeviren sen) → lapis yüz + soru (dokununca
yaprak) → basılı-tut mühür (kart altına erir).

**Merkez kavram — "Mühür bir bildirim değil, bir el hareketidir."** İlk tur
([[olus-muhru-karari]]) "kartı kim seçer" sorusunu kullanıcı lehine kapatmıştı;
bu tur aynı cevabı **bedene** taşıdı.

Plan: `.claude/plans/olus-muhru-2-muhur-basimi.md`

## How to apply (kod haritası)

| Ne | Nerede |
|---|---|
| Dört boyut ikna kapısı | `kkMatchCard` → `m.ikna/iknaOk/iknaEksik/iknaEsik` (10q) |
| İkna eşiği | `IKNA_ORAN = 0.85` × kartın kendi `threshold`'u (sabit değil!) |
| Kapalı kart + çevirme | `_sahneSirt` → `ikvCardBack` + `.olus-flip` (10q4) |
| Dokunuş yaprağı | `_yaprakAc(portal, card, m, detay)` — 10q4 |
| Basılı-tut mühür | `_perde2` + `PRESS_MS=950` · `.olus-press` conic halka |
| lapis→altın erime | `.olus-face--lapis/--gold` crossfade, `.olus-stage.is-sealed` |
| Yaprak malzemesi | `olusKanit` → `{davet, kanit, boyutlar, emre}` tek LLM turunda |

**İkna kapısı — ölçüldü, tahmin edilmedi.** `kkMatchCard` ağırlıklı TEK skor
üretiyordu; tek boyuttan (çoğu zaman `davranislar`) beslenen kullanıcı eşiği
geçiyordu. Ölçüm: davranışı güçlü / iç dünyası zayıf profilde **112 kartın
78'i** öneriye düşüyordu. `IKNA_ORAN=0.85` ile → **12 kart, hepsi yaygın**
(nadir/nadide/efsane tamamen kapanır); dengeli-orta profil 110→86 (efsane
elenir); olgun profil 112'nin tamamını görür. Eşik **kartın threshold'una
oranlıdır** — efsane olmak dört boyutta daha yüksek ikna ister.

**Reçetenin susduğu boyut profilden okunur.** 11 erdemden yalnız 1'i dört
boyutu birden kapsıyor (`VIRTUE_META`, 12b2) — kapı yalnız reçeteye bakarsa
çoğu kart için tanımsız kalırdı. `ikna[d] = dims[d] ?? kkComputeProfile[d]`.
Gerekçe: kartın bir boyutta sinyal istememesi eksiklik değil **vurgusudur**,
ama vurgu o boyutun sıfır olabileceği anlamına gelmez. Profil `sig._profil`
ile memoize (112 kartlık tarama tek hesap; `kkTick` doğrudan doldurur).

## Emre'nin iki tasarım düzeltmesi (aynı gün, ilk uygulamadan sonra)

1. **"90'lar tarzını kaldıralım."** İlk deneme 10q'nun folyo paketini
   (`.kk-pack*`: varak, barkod, "WANDERER" bandı) ödünç almıştı — o dil 80'ler
   ticari kart paketinindir, `TASARIM-PRENSIPLERI.md` §0 ile çelişir. Yerine
   **koleksiyonun kendi sırtı** (`ikvCardBack` — kafes, çift halka, fener
   mührü) + §5 flip dili. Jest korundu, ambalaj gitti. `.kk-pack*` stilleri
   **12f hazine paketleri için yerinde duruyor** — sökülen yalnız bu akıştaki
   kullanımdı.
2. **"Mühür izi kalmasın; lapisten altına geçiş olsun."** Kart yüzüne kalıcı
   mum mührü (`ikvCardFace opts.muhur`) basılmıştı; ölçümde damga kartın
   **adını örtüyordu** (mühür %77–93, isim %80–86) ve kartı "mühürlenmiş ürün"
   diline çekiyordu. Söküldü. Mührün kaydı artık **rengin kendisi**: iki yüz
   üst üste durur, temasta biri diğerine erir.

## Gotcha'lar (bu turda yakalandı)

- **Dinleyici portala değil SAHNEYE bağlanır.** `#olus-portal` törenler arası
  yaşayan tek düğümdür; ona bağlanan Escape perde 2'de de canlı kalıyordu ve
  mühürden sonra "henüz değil" sahnesini açardı. `innerHTML` değişince sahne
  düğümü ölür, dinleyicisi de onunla gider.
- **Yaprakta odak en alttaki düğmeye verilmez.** Tarayıcı odaklanan öğeyi
  görünür kılmak için sheet'i kaydırıyor, yaprak ortasından açılıyordu
  (`scrollTop: 92`). Odak `#olus-y-sheet`'e (`tabindex="-1"`) +
  `focus({preventScroll:true})`.
- **Yarım kalan temas mühürlememeli.** `visibilitychange` → `birak()`;
  `bitir()` dinleyiciyi `document`'ten söker.
- **Test harness'ı `css/parts/olus.css` yüklemiyordu** — tören ÇIPLAK
  görünüyordu ve görsel doğrulama yanıltıyordu. `kisilerim-test.html`'e
  olus.css + onboarding-ritual.css eklendi.
- **Tarayıcı ES modüllerini inatla cache'liyor** (python http.server, `?v=`
  HTML'i tazeler ama modülleri değil). Çözüm: yeni port = taze origin
  (preview tek origin `localhost:3030`).
- **Tören testleri kendi kapanışını yapmalı** — `_olusOpen` modül kapsamında
  ve yalnız kapanış akışında düşer; açık kalan bir sahne SONRAKİ testleri
  zincirleme kilitler. `torenKapat()` yardımcısı (Escape) bunun içindir.

**Sonraki tur:** sınamanın (dört soru) ekranı ve hükmü 2026-08-03'te
sil-baştan yazıldı — bkz. [[olus-sinamasi-kanit-kapisi]].

Bkz. [[olus-muhru-karari]] · [[kisilerim-kart-motoru]] · [[tasarim-prensipleri]]
· [[kart-gorsel-dili]] · [[holo-kart-motoru]] · [[his-motoru-2-0]]
