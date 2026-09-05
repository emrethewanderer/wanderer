---
name: bugun-ekrani-yeniden-duzen
description: "Bugün ekranı yeni düzen — merkezi selam+input, İçsel Hava=Gün Özeti, İç Ses=somatik+parça panosu"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7847e212-7944-485e-8bed-a2de945f8bfb
---

Bugün ekranı (2026-06-04) yeniden düzenlendi (_src.html #bugun-view + js/parts/10-features-w2.js + css/parts/sentez.css):

- **"BUGÜNÜ AÇ" CTA kaldırıldı** → yerine merkezî `.ws-greet-hero`: "İyi geceler, Emre." selamı + tek-satır input (#bugun-greet-input). `wsGreetingSend(event)` → switchView('chat') + chat-input'a yaz + sendMessage(). Eski `wsOpenTodayFlash` artık switchView('chat') alias'ı.
- **İçsel Hava + İç Ses kartları** "Olmak İstediğin Kişi" (kimlik) kartının altına taşındı (#bugun-state-row). İkisi de artık `<button>`.
- **İçsel Hava** = takvim yaprağı tasarımı (bugünün tarihi: #bugun-cal-month/daynum/dow) + iç hava; tıklayınca **Gün Özeti** açılır (`wsBugunOzetAc`). Eski sağ-üst DÜN takvim yaprağı (`dunun-ozeti-card`) tamamen kaldırıldı; `_loadDununOzeti` artık sadece `window._wsDunSummary` hazırlar + #bugun-hava-ozet-hint metnini günceller.
- **İç Ses** → `wsIcSesAc()` tam-ekran `#icses-page` açar (ws-ozet-page deseni). Eski "İçsel Durum" panosunun KAYIP verileri buraya taşındı: ruh hâli grafiği (#moodChart→loadMoodHistory), somatik beden haritası heatmap (#somaticHeatmap [data-region] + #somaticList→loadSomaticHistory) ve İçsel Parça/içsel çocuk doughnut (#partsChart/#partsLegend/#partsDominant→loadPartsHistory). Bu loader'lar daha önce switchView('dashboard')'da çağrılıyordu ama dashboard HTML'i silinmişti → orphan'dılar; şimdi İç Ses'te yaşıyorlar.

İçsel parça anahtarları (05-closure-parts PARTS_COLORS): elestirel/kacak/cocuk(içsel çocuk)/koruyucu/gozlemci. Somatik veri `somatic_log` tablosu, mood `mood_history`, parça `parts_log`. Bkz [[wanderer-gamification-engine]].

**Drawer→Bugün tasarım aktarımı tamamlandı (2026-06-15).** Emre'nin isteği: Drawer'ın (.ws-studio) ARKA PLANI+TASARIMI Bugün'e tam aktarılsın, BUTONLAR (odalar) aktarılMAsın — Bugün kendi içeriğini (Üç Mühür kartı + selam + input) korur. Önceki port gradient/halka/toz'u almıştı ama eksikler vardı; kapatıldı (hepsi css/parts/studio.css `#bugun-view` + `.ws-topbar--hero`): (1) **gren** — Bugün `.ws-grain` div'i global `mix-blend-mode:overlay` taşıyordu; `#bugun-view .ws-grain{mix-blend-mode:normal;opacity:.05}` ile Drawer'ın temiz `.ws-studio::after` greniyle birebir yapıldı (projenin "grende blend-mode yasak" ilkesi). (2) **başlık** `.ws-topbar--hero .ws-st-title` 42px→**46px** (Drawer `.ws-st-title` ile birebir). (3) **header padding** safe-t+34/8→**36/6** (`.ws-st-head` ritmi). NOT: gradient/ring/dust markup zaten `.ws-studio` ile birebirdi. Halkanın Bugün'de daha az görünmesi tasarım değil içerik kapanması (Üç Mühür kartı halkanın alt yarısını örtüyor; Drawer'da orada sadece ayraç var) — `#bugun-view` `position:static`, halka `#app-screen`'e tutunur.
