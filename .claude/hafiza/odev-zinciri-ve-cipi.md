---
name: odev-zinciri-ve-cipi
description: "Ödev motoru baştan sona canlı (üretim + DB + LLM bağlamı). 2026-08-21: çip bare identifier yüzünden HİÇ çizilmiyordu, bağlandı; ölü panel söküldü. 2026-08-23: DEFTER GERİ GELDİ — Drawer sol üstünden açılan hwd paneli, geçmiş artık görünüyor"
metadata: 
  node_type: memory
  type: project
  originSessionId: 27e43813-12fe-41d3-b65c-6c422d5d0a78
  modified: 2026-08-21T12:47:23.640Z
---

Ödev = kullanıcının kendi taahhüdü; seans çıkışında LLM üretir, sonraki
seansların bağlamına girer. Zincirin dört halkası **canlıdır**:

| Halka | Yer | Ne yapar |
|---|---|---|
| Üretim | `09:generateHomework` | seans çıkışında (`06:requestChatExit`) LLM'den ödev üretir, `homework` tablosuna yazar |
| Okuma | `09:loadRoadmap` | post-auth (`03-auth-shell:985`) `status='pending'` olanı `_activeHomework`'e alır |
| LLM bağlamı | `09:getHomeworkContext` | `01-prompts-modes:251` üzerinden prompt'a girer (yaş > 14 gün ise "stale" varyantı) |
| Görünür yüzey | `06:_odevChipiniBas` | 3. kullanıcı mesajında `.hw-chip` çizer — "Yaptım" / kapat |

## İki yüzey: çip (sohbette) + defter (Drawer'da)

`renderHomework`'ün tüm kapları (`#homework-content`, `#homework-meta`,
`#active-homework`, `#homework-history`, `#hw-actions`) `_src.html`'de yoktu —
Studio tek-sayfa geçişinde ([[studio-tek-sayfa]]) sökülmüş, çizici kalmıştı.
2026-08-21'de çizici + `_homeworkHistory` defteri + 13 dict anahtarı
(`ui.homework_*`, `track.status.*`) + `.hw-actions/.hw-btn/.hw-history-*` CSS'i
kaldırıldı.

**2026-08-23 — Emre panelin geri yazılmasını istedi ("Drawer'da sol üste").**
Defter `09`'da yaşıyor, öneki `hwd`:

| Katman | Yer | Not |
|---|---|---|
| Veri | `09:getHomeworkHistory()` | post-auth turda ZATEN çekilen listeden (`loadRoadmap` son 10 satırı alıp gerisini atıyordu) — ikinci sorgu turu yok |
| Derinleştirme | `09:loadHomeworkHistory(limit=60)` | panel açılışında arkadan gelir, sessizce düşer |
| Yüzey | `09:hwdAc/hwdKapat` | portal; kabuk CSS'i hafıza paneliyle PAYLAŞILIR (`.mem-sheet, .hwd-sheet` grup selektörleri) |
| Kapı | `_src.html` `#ch-drawer-odev-btn` | Drawer başlığının SOL ucunda; header `space-between` olduğu için buton başlıkla aynı kaba alınır |

Kurallar: `superseded` satırlar deftere girmez (motorun üzerine yazdığı
kayıt, kullanıcının sözü değil) · kayıt yoksa sayı değil DAVET basılır ·
açık ödev altın + "Yaptım" butonu, üstlenilmiş olanlar sönük ✓ ·
`hwdKapat` yalnız KENDİ paneli varsa `body.overflow` kilidini ve
`wtOverlayClose('odev-defteri')` segmentini kapatır (kilit paylaşılan
kaynaktır; segment çifti kurulmazsa Kullanım Nabzı şişirilmiş süre yazar —
çapraz denetimin yakaladığı kırık buydu).

**AD:** defter çipin adını taşır — **ÖDEV** / EN **HOMEWORK**. "Söz Defteri"
ADI ALINMIŞTIR ([[taahhut-dongusu-hesap-gunu]] · 13u, günlük ritüelin sözü);
iki farklı şeye aynı ad verilmez. EN'de de tek ad: rozet `HOMEWORK`, defter
`HOMEWORK LOG` (ilk yazımda `ASSIGNMENT LOG`du, çapraz denetim bölünmeyi
yakaladı).

Mühür: `tests/09-odev-defteri.test.js` (10 test).

## Çip neden hiç doğmadı

`_activeHomework` 09'un **modül-yerelidir**. 06 onu bare identifier olarak
okuyup `typeof _activeHomework === 'undefined'` guard'ına takılıyordu — guard
HER ZAMAN doğru dönüyordu. Yani ödev üretiliyor, DB'ye yazılıyor, LLM'e
gidiyor; kullanıcı onu hiç görmüyordu. Köprü artık gerçek:
`09:getActiveHomework()` (window.* değil, import).

Aynı turda `06:requestChatExit`'in ilk satırındaki `saveSessionPatterns` de
bağsızdı — `Promise.resolve(f())` argümanında atılan hata `.catch`'e
yakalanmaz, yani `generateHomework` dahil altındaki her iş ölüydü. İkisi
birlikte: ödev ne üretiliyordu ne gösteriliyordu. Sınıfın kapısı:
[[bagsiz-ad-kapisi]].

Davranışsal mühür: `tests/06-odev-cipi.test.js` (ödev varsa çip doğar, yoksa
doğmaz, tek kalır, eşik 3. mesaj).

**Why:** Motorun canlı olması özelliğin yaşadığı anlamına gelmiyor — zincirin
son halkası kopuksa kullanıcı için özellik YOKTUR. Bu repoda "veri katmanı
canlı + yüzey ölü" birden çok yerde görüldü.

**How to apply:** Ödeve dokunacaksan çipin tek yüzey olduğunu bil; panel arama.
Yeni bir yüzey eklersen `getActiveHomework()`'ten oku, `_activeHomework`'e
uzanma.

Bkz. [[bagsiz-ad-kapisi]] · [[studio-tek-sayfa]] · [[olu-kod-temizlikleri]]
