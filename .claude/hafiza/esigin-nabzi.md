---
name: esigin-nabzi
description: "İç Çalışma 06 rev.2 (2026-08-26) — onboarding hunisine wtLogEsik kanalı + Gözlemevi kartı + retroaktif absorb; ELLE: migration 046"
metadata:
  type: project
---

**Eşiğin Nabzı** (2026-08-26, plan `.claude/plans/onboarding-ic-calisma.md`,
rapor `.claude/artifacts/ic-06-onboarding.html` rev.2 · artifact
`0f9883f7-e0be-44cd-ac2a-ae361f50d50c`). İç Çalışma 06'nın (18 Tem) beş
boşluğu bir ay sonra koda karşı sınandı: **B ve E zaten kapanmıştı**
(perde üç kademeli `_splashPlan`, portre tablosu konsolide şemada), A ve D
bu turda kapandı, **C bilerek açık** (değer-önce ürün çatalı — artık kanıtı
toplanıyor).

## Kanal (FAZ 1-3)
- `wtLogEsik(olay, { dal, adim, sureMs, atlandi, n })` — `kind:'esik'`,
  `00f-kullanim-nabzi.js`. `wtLogRitus` iskeletinin ikizi; yeni tablo YOK.
- Sekiz olay: `perde · dil-kapisi · basladi · kategori · sentez · dogus ·
  atladi · esik-ekrani`. `dal` (→`prev_screen`) kapalı küme: 4 kategori ·
  `ok|fallback` · `kat1|kat2` · `acildi|kapandi`.
- **`dal` ile `atlandi` AYRI alandır.** İlk yazımda tek `kat` parametresi
  hem string hem sayı kabul ediyordu (string gelince `meta.kat` sessizce 0
  yazıyordu) — denetimde ayrıldı.
- **KRİTİK SIRA (K3):** perde `03-auth-shell.js:673`'te doğar, `wtInit`
  `:983`'te açılır. Perde olayı gösterim anına yazılsaydı `_inited=false`
  kapısından sessizce düşerdi. Bu yüzden `_closeSplash`'ta yazılır —
  yan kazanç: "atlandı mı" ancak kapanışta bilinir. Kat 0'da (`ms:0`)
  `_splashShownAt` hiç kurulmaz, olay yazılmaz.
- **Perde kademe dili:** kat1 = tam 4 sn (günün ilk girişi) · kat2 = kısa
  2 sn nefes (brief) · kat 0 = perde yok. `03:587-590` asıldır.
- Sentezin fallback'i sessizdi (`synthesizePerson` yedeğe düşünce çağıran
  ayırt edemiyordu) — `_fallback` bayrağı eklendi, okunduğu satırda silinir.
- ELLE: **`migrations/046_gozlemevi_esik_nabzi.sql`** — Supabase SQL Editor.

## Panel (FAZ 4)
`13q _esikNabzi(ep)`: huni ALTI basamak (Eşiğe geldi → 4 kategori →
mühürledi). Kartın işi en küçük sayıyı göstermek değil **en büyük DÜŞÜŞÜ
adlandırmak**: "kalem <basamak>'ta düşüyor, oraya gelenlerin %N'i geçmiyor".
Yanında perde (atlama + gerçek ort. süre + kademeler), sentez sağlığı,
Studio eşiği. Payda 0 → oran YOK; `esik_pulse` alanı yoksa kart çizilmez.

## Retroaktif absorb (FAZ 5-6)
- `porBackfillCollection()` (02c): `deckReady` → `kkPartitionDeck` →
  `porCardRefs()` farkı → `porAbsorbCard`. **Senkron döngü** — N kart tek
  dalgaya düşer (1200 ms debounce her çağrıda sıfırlanır). Yeni "işlendi"
  defteri İCAT EDİLMEDİ; üç katmanlı idempotans zaten vardı.
- `porBackfillPending()` sayar ama işlemez — davetin kapısı ölçümdür (§6.10).
- Davet: Portrem'de, Kartın Evrimi şeridinin üstünde; üç kapı (onaylı ·
  bekleyen var · sorulmamış), **sayı yazılmaz**, ret kalıcı
  (`etw_portre_backfill_davet_<uid>`). Harness: `.claude/harness/portre-backfill.html`.
- 02c artık **10q'yu statik import eder** (`kkPartitionDeck`). Döngü
  sınandı: 10q → 02c yolu yok; 02c'yi statik import eden tek dosya 10q3 ve
  10q ona yalnız `window` üzerinden erişir (`10q:1846`).

## Dikişler (kapı testleri)
- `tests/00f-esik-nabzi.test.js` — çağrı yerleri ↔ kapalı küme aynası:
  her çağrının olayı kümede, kümedeki her olayın çağrısı var, sabit `dal`
  değerleri ve 02c `CAT_ORDER` kümede. **Küme dışı bir olay adı sessizce
  hiçbir şey yazmaz** — huninin bir basamağı görünmeden kaybolur.
- `tests/13q-gozlemevi.test.js` — panel basamakları 00f'nin iki kümesinde.

İlgili: [[gozlemevi-kullanim-nabzi]] · [[ritus-nabzi]] ·
[[kart-evreni-koleksiyon-nabzi]] · [[benlik-karti-2-olunan-ad]] ·
[[esik-ekrani]] · [[acilis-perdesi]] · [[gerceklik-mimarisi]] ·
[[buyuk-harf-dil-kapisi]] · [[ad-senkronu-kurali]]
