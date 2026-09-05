---
name: uc-usta-tek-deste-plani
description: "Üç Usta, Tek Deste (Pokémon+YGO+INWO → kart sistemi) — 2026-07-26 ALTI FAZIN TAMAMI UYGULANDI; plan .claude/plans/uc-usta-tek-deste.md, uygulama notları orada"
metadata: 
  node_type: memory
  type: project
  originSessionId: 48961cde-c831-4f75-96c2-cfc4c532c79a
  modified: 2026-07-26T15:51:58.647Z
---

**2026-07-25/26:** Emre üç kart oyununu (Pokémon TCG, Yu-Gi-Oh, Illuminati:
NWO) araştırıp kart sistemini dönüştürmemizi istedi. Plan yazıldı, onaylandı
("Uygulayalım") ve **altı fazın tamamı uygulandı**. Plan + planla kod
arasındaki 7 sapma: `.claude/plans/uc-usta-tek-deste.md`.

Commit'ler: FAZ 1 `f070f62` (çerçeve lehçesi + dokunuş merdiveni) · FAZ 2
`f85624f` (mertebe + evrim) · FAZ 3 `17b247d` (sentez + aile mührü) · FAZ 4
`ee6718e` (Benlik Yapısı) · FAZ 5-6 (panzehir + emel + dönem).

## Kalıcı olan (kod haritası)

| Ne | Nerede | Anahtar |
|---|---|---|
| Çerçeve lehçesi + nadirlik muamelesi + künye | 12c `ikvCardFace` | `CAT_FRAME`, `RAR_FOIL`, `.ikv-foot` |
| Koleksiyon numarası + kategori glifi | 12b deste kurulumu | `c.no/noTotal/catGlyph` |
| Evrim + mertebe | 10q | `kkEvrim`, `kkMertebeOf`, `kkEvolveCeremony` |
| Sentez (füzyon) | 10q | `kkSentezMalzeme/Durum`, `kkSynthCeremony` |
| Aile mührü + emel | 10q | `kkAileDurum`, `kkDetectAileCompletion`, `kkEmelSec` |
| Panzehir | 10q | `kkPanzehir`, `kkDetectPanzehir` |
| Benlik Yapısı merceği | **10q3** (yeni, önek `by`) | `byRender`, `byGetYapi` |
| Dönem Kartı | 10q + 10q2 rafı | `kkDonemErdem`, `kkDonemHafta` |
| Besleme izi sözleşmeleri | 02c / 10D | `porCardRefs()`, `oikCardRefs()` |

**Why:** Koleksiyon albümden çıkıp merkezinde kullanıcının durduğu bir benlik
yapısına dönüştü — üç oyunun mekaniği tek teze bağlandı ("Mesele Sensin").
Savaş/rekabet dili bilinçli dışarıda ([[yuzlesme-kacis-kaldirma]]).

**How to apply:**
- **En büyük ders: veri çoğu zaman zaten destede.** İki büyük mekanik (sentez
  malzemesi, panzehir kutbu) yeni meta yazılmadan, mevcut alanlardan
  (`bilesik-<v1>-<v2>` id'si ve gölge kartlarının `virtue`'su) türetildi.
  Yeni alan eklemeden önce destenin ne söylediğine bak.
- **Elmas ödemesi ASLA "ilk taramaya" bağlanmaz** — `aileler/emeller`
  cihaz-yerel yaşayabildiği için (mig'siz) ikinci cihazda tekrar ödenirdi;
  ödeme yalnız CANLI kazanımda yapılır. Aynı gerekçe emel mührü için de.
- Bundle 558 → 569 KB gzip (bütçe 650) — altı fazın toplam maliyeti ~11 KB.
- Testler: 63 dosya / 1249+ (sprint 74 yeni test getirdi).

**Bekleyen ELLE iş:** `migrations/000_wanderer_schema.sql` içindeki
`kisi_karti_profile.yapi JSONB` kolonu (aileler/panzehirler/emeller/donem).
Uygulanmadan da hiçbir akış kırılmaz — client 42703'ü yakalar, veri
IndexedDB'de yaşar ([[migration-konsolidasyonu]] deseni).

**Doğrulama gotcha'sı (bu sprintte öğrenildi):** kökü servis eden preview'da
tarayıcı HTTP cache'i + service worker eski modülü tutuyor; `?v=` sayfa
sorgusu YETMEZ. Çözüm: SW'yi unregister + `caches.delete` + **ikinci port**
(tek origin `localhost:3030`). Modül-içi doğrulamada `import('...?b='+Date.now())`.

İlgili: [[kisilerim-kart-motoru]] · [[kart-gorsel-dili]] · [[holo-kart-motoru]] ·
[[iki-kisi-bir-deste]] · [[hazine-destesi-kart-paketleri]] · [[kimlik-motoru]] ·
[[uc-ana-renk-lapis]] · [[kitap-sesi-manevi-register]] · [[bundle-diyeti-sidecar]]
