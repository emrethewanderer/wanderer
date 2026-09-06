---
name: tek-deste-iki-kutup
description: "2026-07-26 TAM (köprü kısmı 2026-08-10'da AŞILDI → [[gecis-muhru-kanit-kapisi]]) — Bugün'deki ayrı Geçiş Kartım şeridi (#gk-bugun-strip) SÖKÜLDÜ; kartın iki kutbu KİŞİLERİM destelerinin başına, üç vuruş da iki desteyi bağlayan köprüye taşındı"
metadata: 
  node_type: memory
  type: project
  originSessionId: 505cc4d4-db1b-43eb-bca5-fdc739c6f6ec
  modified: 2026-07-26T20:22:03.188Z
---

**Emre'nin bulgusu (2026-07-26):** *"Bugün'deki Kişilerim kartı tam olmamış —
eski Geçiş Kartım silinmeden üstüne inşa edilmiş."* Doğruydu, ama sapma
uygulamada değil **planda**: `iki-kisi-bir-deste.md` K1 maddesi şeridi yeni
bölümün İÇİNE taşımayı açıkça söylüyordu, aralarındaki ilişkiyi kurmadan.
Kanıtı tek satırlık CSS'ti — `#kk-bugun #gk-bugun-strip { margin-top:12px }`:
birleşme değil, dolgu. **Emre'nin kararı: "Birleştirelim."**
Plan: `.claude/plans/tek-deste-iki-kutup.md`.

## Ne çakışıyordu (analiz)

1. Aynı cümle Bugün'de **üç kez**: `#yol-hero` (sentez) + `#kk-bugun-body`
   (deste) + `#gk-bugun-strip` (flip kart) — üçü de "olduğun ↔ olmak istediğin".
2. Tek çerçevede **iki görsel lehçe**: `.kkb-*` (yelpaze, kullanıcı çevirir)
   vs `.atl-*` (flip, 4 sn'de kendi döner).
3. İki **ontoloji** aynı görünüyordu: 12b katalog kartı (112 kart, kazanılır)
   vs 10A'nın LLM üretimi kişiye özel geçiş kartı.
4. **Eylem yanlış taraftaydı:** deste tamamen pasifti; üç vuruş / halka /
   verdict yalnız silinmesi istenen şeritteydi.

## Kurulan mimari

| Katman | Nerede | Ne |
|---|---|---|
| **Deste üyeliği** | 10q2 `_gkEntry` | geçiş kutbu = katalog kartıyla aynı deste elemanı; tek farkı `_gk` izi (`kartId/which/mezun`) |
| **Sıra** | `kkDesteAltin` | yürünen geçişin altın kutbu → mezun geçişlerin lapis kutbu → katalog (şu anki kimlik başta) |
| **Köprü** | 10q2 `_kopruHTML` | iki destenin ÖN kartları aynı geçişin kutuplarıysa yanar. *(2026-08-10: halka + 3 vuruş + verdict + rehber SÖKÜLDÜ → tek ışık; bkz. [[gecis-muhru-kanit-kapisi]])* |
| **Malzeme** | 10A `window.gk*` | `gkActiveCards/gkCompletedCards/gkPoleFace` *(2026-08-10: `gkRingSVG/gkHeroLabel/gkStrikeDefs/gkRehberDurum/gkRehberOk` kaldırıldı)* |

**Mezuniyet:** mühür düşünce lapis kutup ALTIN desteye geçer
*(2026-08-10: mührü artık 3/3 vuruş değil GEÇİŞ SINAMASI düşürür)*
(`gkPoleFace(..., {mezun:true})` → altın palet + "ARTIK O KİŞİ" kicker'ı),
köprüsü düşer. Bu, 10q2'nin hedef-mührü mezuniyetiyle aynı dil.

## Ad senkronu (§4.3)

- `gkRenderYolHero` / `gkRenderStrip` **tamamen silindi** — alias bırakılmadı.
  10A'nın 8 çağrı yeri + `10-features-w2.js` artık `window.kkRenderBugun?.()`
  çağırıyor: yüzeyin tek sahibi 10q2.
- `_completedCards` → `gkCompletedCards` (dış sözleşme oldu).
- Halka `.atl-*` → **`.gk-ring*`** (atolye.css'te tek nüsha; hem geçiş kartı
  detayı hem köprü kullanıyor — bu yüzden `kkb-` değil `gk-` öneki aldı).
- Silinen 5 yetim i18n anahtarı (TR+EN): `gk.mini_yol_kicker`,
  `gk.deck_paths`, `gk.past_cards`, `gk.past_cards_sub`,
  `gk.aria_open_collection`. Yeni: `kkb.kopru.kicker/aria`.
- `gk.rehber_line` / `gk.rehber_ok` / `gk.hero.*` o turda korunmuştu; **2026-08-10'da hepsi silindi** (vuruş dili öldü).

## GOTCHA'lar (bu turda öğrenilen)

1. **Öz-denetim turu gerçek bir runtime bug yakaladı:** `_ringSVG` silinip
   `gkRingSVG` olunca geçiş kartı DETAY ekranındaki çağrı güncellenmemişti —
   `gkOpenDetail` açılışta ReferenceError atardı. Testler yakalamadı çünkü o
   yolu hiç açmıyorlardı. Ders: **bir fonksiyonu yeniden adlandırırken
   grep'i modülün TAMAMINDA koştur**, sadece taşıdığın bloğu değil. Regresyon
   testi eklendi (`gkOpenDetail — iki kutup sahnesi`).
2. **Grid'de açılıp kapanan kolon kayma yaratır.** Köprü kapandığında
   `1fr auto 1fr`'nin orta kolonu 0'a düşüp desteleri ~9px kaydırıyordu.
   Çözüm sabit px DEĞİL (kicker genişliği dile göre değişir): boş köprüye
   **aynı kicker konur + `visibility:hidden`** — ölçü durur, içerik gitmez.
3. Anon preview'da Bugün görünmez (`#app-screen` display:none). Köprüyü
   görsel doğrulamak için `window.gk*` kapılarını geçici besleyip
   `ikvCardFace` ile gerçek yüz üretmek yeterli — CSS ve düzen gerçek olur.

## Korunan (silinmedi)

Atölye töreni, `ws-greet-hero` input akışı (`gkGreetingSend`), sohbet chip'i
(10B) ve feed köprüsü (10C), `gkGetContext` LLM beslemesi, paylaşım,
`gecis_kartlarim` tablosu, `kk-mine` koleksiyon ekranı
(`loadKendiKoleksiyonumView`). Bugün'deki "GEÇMİŞ KARTLARIM" girişi kalktı —
mezun kartlar artık ALTIN destede görünüyor, ikinci kapıya gerek kalmadı.

## Doğrulama

build 569KB/650 ✓ · **64 dosya / 1283 test yeşil** (19 yeni: köprü 13 +
malzeme sözleşmesi 6) · preview'da TR+EN canlı (köprü açılır/kapanır, halka
dolar, OLDUM kapısı, kayma 0px), konsol temiz. Stylesheet'te 7 `gk-ring` +
12 `kkb-kopru/strike` kuralı, eski şerit kuralı 0.

**Bekleyen ELLE iş yok.**

Bkz. [[iki-kisi-bir-deste]] · [[kisilerim-kart-motoru]] · [[uc-usta-tek-deste-plani]] ·
[[ad-senkronu-kurali]] · [[kart-gorsel-dili]] · [[uc-ana-renk-lapis]] ·
[[oz-denetim-ve-commit-kapanisi]]

---

> **KÖPRÜ SÖKÜLDÜ (2026-08-18).** İki destenin arasındaki "açık yol" ışığı,
> Bugün'ün deste bölümüyle birlikte kalktı. İşlevi kaybolmadı, **büyüdü**:
> yürünen yol artık Karşılaşma odasının ORTA SAYFASIDIR (tam ekran bir kart,
> bir ışık değil) ve masaya açılan kapı geçiş kutbunun arka yüzündedir
> (`.kar-masa` → `gkOpenDetail`). Kutupların deste üyeliği (`_gkEntry`)
> korundu — masa ve oda ikisi de onu okur. Ayrıntı: [[karsilasma-odasi]].
