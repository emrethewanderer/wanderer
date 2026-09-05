---
name: deste-en-karari
description: "KARAR 2026-08-19 (Emre): destenin 12 kartı İngilizceye çevrildi — 12b'nin `lang==='en'` istisnası kalktı; EN dış dil değil, ikinci resmî dil"
metadata:
  node_type: memory
  type: project
---

**Emre kararı (2026-08-19):** "Tamamını şimdi yaz." Kart destesinin on iki kartı
İngilizceye transcreate edildi: `js/parts/i18n/en-deste.js` (`DESTE_OVERLAY`) +
sidecar `js/ext/deste-en.js` → `assets/ext-deste-en.js` (6KB gzip, ana bundle sabit).
`12b _applyDeckOverlay`'in `lang === 'en'` istisnası **kaldırıldı**; TR hâlâ kaynak
dildir ve overlay almaz.

**Kararın gerekçesi — neden v2'yi beklemedi:** `12b:68`'deki istisna
[[tum-diller-native-plani]]'nın K3'üne bağlıydı ve v2 dalgaları beklemede
("kaynak TR değişirken çeviri başlatmak her dili iki kez yazdırır"). Ama v2 **dış
diller** içindir; **EN uygulamanın ikinci resmî dilidir** ve arayüzü zaten tam
native'di — yani Emre'nin "ya tam native ya hiç" ilkesinin ihlali tam da mevcut
durumdu: arayüz İngilizce, kartın portresi Türkçe. TR kaynak ihtimalsel dil
devrimini almış olduğu için "iki kez yazma" riski bu on iki kart için geçmişti.

**Register (testle mühürlü, `tests/12b-deste-en.test.js`):** ikinci tekil "you";
`olunca` alanı **ihtimal** taşır (`may|can|often`) — kesin gelecek kipi yasak,
[[ihtimalsel-dil-devrimi]]'nin EN karşılığı; kitap adları sözlüğün resmî
karşılıkları: **Relationship Philosophy** · **Mindset Revolution** ([[ad-senkronu-kurali]]);
`whisper` küçük harfle başlar. Donuk alanlar (id/category/rarity/recipe/virtue/
glyph/sigil/roman) overlay'e ASLA girmez — kapı: `scripts/i18n-validate.mjs --lang en`.

**How to apply:** Desteye kart eklenirse EN karşılığı AYNI sprintte yazılır; parite
testi 12 kartın hepsini ve dizi uzunluklarını sayar, yarım çeviri kırmızı verir.
İlgili: [[kart-evreni-koleksiyon-nabzi]] · [[deste-12-kesit-karari]] ·
[[tum-diller-native-plani]] · [[tr-en-i18n-tamamlama]]
