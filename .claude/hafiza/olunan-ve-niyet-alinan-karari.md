---
name: olunan-ve-niyet-alinan-karari
description: "2026-07-27 TAM — Üç Mühür kartları 'Olunan [Ad]'/'Niyet Alınan [Ad]' oldu; Atölye kartları artık iki toplamı BESLİYOR; oikResynth ile lapis kart da canlı; ELLE iş yok"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8a11ac14-e99c-41c6-9d1b-4664cf9fbee5
  modified: 2026-07-27T12:40:49.456Z
---

Emre'nin sistem tarifi kodla karşılaştırıldı (2026-07-26), **kırık halka
bulundu ve kapatıldı** (2026-07-27, beş faz). Plan + uygulama sapmaları:
`.claude/plans/olunan-ve-niyet-alinan.md`.

## Bulunan kırık halka

Üç Mühür'ün iki kartını yalnız 12b katalog kartları besliyordu (kazanım →
`porAbsorbCard`, hedef mührü → `oikAbsorbCard`). **Atölye'de doğan Geçiş
Kartı (10A) hiçbirine işlenmiyordu** — Bugün input'u ve sohbet chip'i, yani
en çok kullanılan iki kapı, KİŞİLERİM destesinde görünüp toplama akmıyordu.
Desteler 2026-07-26'da birleşmişti ([[tek-deste-iki-kutup]]) ama besleme
kanalı kurulmamıştı.

## Kurulan (kod haritası)

| Ne | Nerede | Anahtar |
|---|---|---|
| Kutup → absorb adaptörü | 10A | `gkPoleAsCard(kartId, which)` · `gkPoleAsCardRef(ref)` |
| `gk_` ref çözücü | 10A | `gkRefResolve(ref)` → `{name, virtue, _gk}` |
| Doğuşta besleme | 10A | `_feedSentez` → lapis→`oikAbsorbCard`, altın→`porAbsorbCard` |
| Mezuniyet devri | 10A | `_graduateSentez` → `porAbsorbCard(lapis)` **sonra** `oikReleaseCard` |
| Yol bırakma | 10A | `_releaseSentez` → iki iz de çekilir |
| **Lapis evrim köprüsü** | 10D | `oikResynth` + `_oikWaveAdd` (1200 ms dalga) |
| Altın iz geri alma | 02c | `porReleaseCard(ref)` — `oikReleaseCard`'ın ikizi |
| Yapıda Atölye düğümleri | 10q3 | `_isGkRef` + `gkRefResolve` fallback |

**Ad göçü (§4.3):** "Şu Anki [Ad]" → **"Olunan [Ad]"** (`por.card_name`,
kart id `portre-simdi`→`portre-olunan`); OİK kartı adsızdı → **"Niyet Alınan
[Ad]"** (`oikCardName`, `oik.card_name`). LLM'in yazdığı `baslik` artık ad
değil **epitet**. EN: `Attained {name}` / `Intended {name}`. Repoda "Şu Anki"
0 sonuç. DB göçü YOK (ad client'ta türetilir).

**Why:** Destede duran her kart bir beyandır; beyan sahibini değiştirmiyorsa
deste albüme döner. Kartın kaynağı (katalog/Atölye) toplamdaki payını
belirlememeli.

## Emre'nin sentez kararı (2026-07-27) — KALICI

*"Sentez yalnızca mezuniyette çalışamaz. Kişi sürekli hangi kişi olduğunu ve
hangi kişi olmak istediğini görsün."* İlk plandaki `{silent:true}` ertelemesi
(kota gerekçeli) **reddedildi**. Koruma erteleme değil **debounce**: her iki
motor da 1200 ms dalgada tek LLM çağrısında birleşir.

**En güzel keşif:** altın tarafın evrim köprüsü lapis tarafta HİÇ YOKTU —
`oikAbsorbCard` maddeyi kaydedip susuyordu, OİK kartının yüzü yalnız tasarım
töreninde değişiyordu. `oikResynth` o asimetriyi kapattı.

## How to apply (gotcha'lar)

- **Dalga elemanı `{id, name, virtue}`** — adı absorb ANINDA yakala. Sentez
  anında çözmeye kalkma: `gk_` id'sini katalog bilmez, dinamik `import('12b')`
  ise sahte zaman altında askıda kalıp sentezi bir sonraki teste taşır.
- **Aynı tuzak 02c'de de vardı** (öz-denetimde yakalandı): `porResynth`'in
  `cardsInfo`'su `getCardById` ile çözüyordu → `window.gkRefResolve` fallback.
- **Sıra:** mezuniyette önce `porAbsorbCard`, sonra `oikReleaseCard` — ters
  sırada `oikCardRefs()` bir an boşalır, Benlik Yapısı açıksa kartı kaybeder.
- **Mini kartta epitet görünmez** (12c prensip 6, `.ikv-card--mini .ikv-sub`
  gizli): hero'da yalnız AD, epitet detay yüzeylerinde.
- `_oikWaveAdd` **fonksiyon bildirimi** (hoisted) — `oikAbsorbCard` evrim
  bloğundan önce tanımlı, `let _oikWave` sonra; TDZ'ye düşmesin.
- 02d Eşik Ekranı'nın lapis kutbu OİK kartını hiç kullanmıyordu ("en yakın
  kart" eziyordu — 10f'de 07-25'te düzeltilenin ikizi); aynı öncelik kuruldu.

**Doğrulama:** build 572KB/650 · 66 dosya / **1333 test yeşil** (39 yeni) ·
preview'da 18 sözleşme canlı, iki kart gerçek `ikvCardFace` ile çizildi,
konsol temiz. **Bekleyen ELLE iş YOK** (yeni kolon/migration gerekmedi —
idempotans izi maddelerin mevcut `ref` alanında).

Bkz. [[iki-kisi-bir-deste]] · [[tek-deste-iki-kutup]] · [[benlik-karti-2-olunan-ad]] ·
[[olmak-istedigin-kisi]] · [[kisilerim-kart-motoru]] · [[uc-muhur-yol-tasarimi]] ·
[[ad-senkronu-kurali]] · [[uc-usta-tek-deste-plani]]
