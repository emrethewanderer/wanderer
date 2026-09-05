---
name: atlas-ekrani-kaldirildi
description: "ATLAS ekranı (4 Hayat + Dönüşüm Hattı haritası) 2026-06-16'da kaldırıldı; geri getirme için tam yapı haritası"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7a504dde-56eb-4f1e-892d-3def43490a8d
---

ATLAS üst-seviye ekranı (Stüdyo odası · topbar "ATLAS · Kartograf") **2026-06-16'da kaldırıldı**. Emre "aynı veya farklı bir şekilde tekrar getirebiliriz" dedi → bu, geri-getirme için yapı snapshot'ı.

**NE İDİ (kavram):** İç Kıtan haritası. İki sekme:
1. **4 HAYAT** — `ATLAS_REGIONS` (Niyet Vadisi/Arkadaki, Kendi Ormanı/Bireysel, İki Yol/İlişki, Çelik Bölgesi/İş). Her bölge = bir Temel öz (`fpKey`: bolluk/oz_guven/oz_saygi/oz_deger); `S._foundationsProfile` skoruna göre "sis" (fog) opaklığı + aşama (Keşfedilmedi→Sisli→Yürünüyor→Aydınlanıyor) + `wsSigil` mührü. Whisper = kitap tezi alıntıları ("Mesele o değil, sensin." vb).
2. **DÖNÜŞÜM HATTI** — coğrafi blob-harita; 4 durak (Konfor Bölgesi→Yüzleşme Vadisi→Gölge Ormanı→Bilinmez), gün eşiği 0/7/30/60; "ŞU AN BURADASIN" barı + `smOpenCollection` "AÇ" tuşu. "~ Zarın Atlas ~" dekoratif başlık + pusula SVG.

**KORUNANLAR (silinmedi, hâlâ canlı):**
- `ATLAS_REGIONS` dizisi (10-features-w2.js) — Hasımlar boss-bölge eşlemesi onu kullanıyor (satır ~772/814/1017). SİLME.
- "Engel Atlası & Öz-Tanı" (10m modülü, Hasımlar içi buton) — AYRI özellik, adında "Atlas" geçse de ilgisi yok. Duruyor.

**GERİ GETİRMEK İÇİN (kaldırılan parçalar — git yok, manuel geri ekle):**
- `_src.html`: `#atlas-view` tam ekranı (topbar ATLAS/Kartograf + ws-tab-row 4 HAYAT/DÖNÜŞÜM HATTI + `#atlas-harita`/`#atlas-zaman`); Stüdyo oda butonu `data-nav="atlas"` (--i:8, YOLCULUK bölümü, oval+çember sigil SVG, alt "4 hayat · dönüşüm hattı"); profil çekmecesi `w2-profile-action` "Atlas"; legacy global-menu `gm-link` "Atlas".
- `js/parts/10-features-w2.js`: `loadAtlasView()` fonksiyonu (ATLAS_REGIONS map + Dönüşüm Hattı blob motoru). `ATLAS_REGIONS` const'ı yerinde kaldı → sadece fonksiyon geri yazılır.
- `js/main.js`: `loadAtlasView` import (10-features-w2 bloğu) + window-expose (Object.assign).
- `js/parts/03-auth-shell.js`: import; `ALLOWED_VIEWS` set'ine `'atlas'`; `if (v === 'atlas') loadAtlasView();` route.
- `js/parts/10s-w2-gunluk-ritus.js`: `_GL_ELMAS_SHOW` set'ine `'atlas'` (elmas barı bu view'da göster).
- `css/parts/sentez.css`: "ATLAS EKRANI" bloğu (`.ws-region-*`, `.ws-fog-bar/-fill`, `.ws-timeline-*`) — başka yerde kullanılmıyordu, tümü bu blokta.
- `js/parts/10y-w2-llm-shell.js:9` yorumunda arka-yüz listesinden "Atlas" çıkarıldı (kozmetik).

Geri-getirme felsefesi: Atlas, [[uc-muhur-yol-tasarimi]] (İki Kart Arası Yol) ve [[kimlik-motoru]] ile örtüşüyordu (4 Hayat ↔ Temeller, Dönüşüm Hattı ↔ seri yolculuğu). Yeniden gelirse bu motorların üstüne bind edilmeli, paralel değil.
