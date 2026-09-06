---
name: ultra-seri-uc-muhur
description: Ultra Seri — 3 ayrı seri (Seri/Hayal/Söz mührü) + split kart + Sohbet çemberi (10u modülü)
metadata: 
  node_type: memory
  type: project
  originSessionId: f36140b4-de11-40a6-8d7b-c9f5b3a7c7a7
---

**Ultra Seri** (10u-w2-ultra-seri.js + css/parts/ultra-seri.css) — tek "Seri Mührü"nü ([[seri-muhru-toreni]]) ÜÇ ayrı seriye genişletir:
- **Seri Mührü** — merkezî aktivite defteri (getActivityDays / recomputeStreakUI; 10t korunur).
- **Hayal Mührü** — Ayna + Geçiş Alanı + Kendinle Konuş + Hayal Seansı O GÜN tamamlanınca; Değerlendirme yalnız vadesi gelmişse (Pazar/ay-sonu/yıl-sonu) şart, değilse otomatik. Detektörler her modülün kendi formatında (todayISO = UTC slice) okur.
- **Söz Mührü** — o gün ≥1 söz verilince ([[gunluk-ritus-armagan-soz]]).

Hayal/Söz kendi SafeStorage defterleri (`etw_hayal_muhru_v1_<uid>`, `etw_soz_muhru_v1_<uid>`, `etw_ultra_meta_v1_<uid>`), usDayKey (czDayKey/local padded) formatında günler; usStreakFromDays ardışık-gün hesabı. SafeStorage Supabase/IndexedDB üzerinden (localStorage'da DEĞİL).

**Yüzeyler:**
- **BUGÜN'deki çapraz üçe bölünmüş kart KALDIRILDI (2026-06-09).** `#sm-bugun-card` artık HTML'de yok; Bugün ekranı temizlendi. Erişim yolları: (1) Drawer "ÜÇ MÜHÜR" menü öğesi → `smOpenCollection()`, (2) **Bugün greet-hero köşesindeki "Ay" butonu** (`#bugun-moon`, lapis hilal SVG, `.ws-moon-btn` sentez.css, `onclick="smOpenCollection()"`) → Üç Mühür Merkezi → tri-card seç → `usOpenDetail(id)` mühür sayfası (2026-06-09 eklendi).
- **REGRESYON DÜZELTİLDİ (2026-06-09):** kart kaldırılırken `smOpenCollection()` (10t) içindeki TÜM HTML attribute tırnakları düz `"` yerine eğri `”` (U+201D, 86 adet) olmuştu → `class=”sm-tri-card”`/`data-us-id=”seri”` bozulduğu için tri-card'lar render olmuyor ve `querySelectorAll('.sm-tri-card[data-us-id]')` boş dönüp navigasyon ölüyordu. Hepsi `"`'ye çevrildi; Üç Mühür Merkezi + mühür seçimi yeniden çalışıyor.
- Seri/Hayal/Söz tam-ekran sürükleyici detay (`us-portal`, ev→bahçe sahnesi) korundu; Üç Mühür Merkezi'nden (smOpenCollection) dilime tıklanınca açılır.
- `usSeriesState` window'a expose edildi (10u) → 10t `smOpenCollection()` Hayal/Söz verilerini buradan okur.
- **Hayal kontrol listesi → 5 AYRI SAYFA (view), popup YOK (2026-06-04):** Bugün'deki 5 kart (Ayna/Geçiş/Konuş+Değerlendirme/Hayal Seansı) KALDIRILDI; her biri artık kendi `<div class="view" id="X-view">` SAYFASI (Drawer özelliği gibi: `.ws-grain`+`.ws-vignette--light`+`.ws-topbar`+`.ws-body.ws-feat-body`, _src.html'de #app-screen içinde). View id'leri: `ayna`/`gecis`/`konusma`/`degerlendirme`/`hayalseans`. Eski body-root overlay'ler (hayal/kanit/ga-editor/ga-reading/sk/rv + harita/kart) KALDIRILDI; iç içeriği (ID'ler korunarak) bu view'lara taşındı; `ENG-overlay` (Engeller) KALDI. `usHayalChecklist` artık `view:'<page>'` + `fn:''` → tıklama handler'ı `switchView(view)`. Değerlendirme dueRow da artık `view:'degerlendirme'` butonu (vade olsa da olmasa da tıklanır).
  - **Aç/kapa = sayfa navigasyonu:** skOpen/rvOpen/aynaOpenKanit/hayalAcSeans → `switchView('<page>')`; *Close → `switchView('bugun')`. Sayfa-içi alt-bölümler `_gaShowSection` (gecis: #ga-editor-section/#ga-reading-section — **Kart VE Oku ikisi de korundu**) ve `_haShowSection` (hayalseans: seans/harita/kart). Ayna sayfasında Davranış Kanıtı form+geçmiş İNLİNE (aynaSaveKanit artık kapatmaz, sayfada kalıp tazeler).
  - **KRİTİK yarış-koşulu:** switchView'in view-yükleme kancası SENKRON olmalı (`window.loadAynaView/loadGecisView/loadKonusmaView/loadDegerlendirmeView/loadHayalSeansView`, 03-auth-shell switchView içinde + main.js'de expose). Dinamik import (async) kullanılırsa, açıcının senkron `_gaShowSection('editor')` çağrısından SONRA çalışıp `_gaShowSection('none')` ile bölümü kapatır → Kart/Oku/Harita "açılmaz" bug'ı. loadGecisView=hub reset, açıcı switchView'den SONRA bölümü açar.
  - **Feature gate:** gaOpenReading/skOpen/rvOpen/hayalAcSeans `FEATURE_GATE_MAP`'ten ÇIKARILDI (main.js) — kapı/tanıtım-videosu sayfaya uymuyordu ve ilk-girişte boş tanıtımda takılıp "tepki vermiyor" bug'ı veriyordu. engOpen/openDailyClosure gate'te kaldı.
  - Pasif yan etkiler korundu: enterBugunView'da `aynaReflectToday`+`checkVasitaTrap`+`gaRenderBugunCard`. CSS: sentez.css sonunda `.ws-feat-body`/`.ws-feat-hero`/`.ws-feat-body .ws-feat-panel` (modal kabuğunu nötrler).
- **`#us-ring` KALDIRILDI (2026-06-11):** Sohbet topbar'ındaki 38px Ultra çember (eski Satürn/Vesper halkasının halefi) artık yok — HTML/CSS silindi, 10u'da `usRefreshRing` no-op stub (çağıran 4 yer bozulmasın diye korunur), `usMountRing`/`usRingTap` silindi. EOD "send to Saturn" hedefi `.w2-vesper-wrap` (yoksa orb düşey yukarı süzülür, 05-closure). Üç Mühür erişimi yalnız Drawer + Bugün Ay butonu. BUGÜN'deki Vesper halkası (`.ws-vesper-ring`) AYRI, saf Gün Kapanışı kaldı.

**Hook noktaları:** ritüel tamamlanınca `window.usCheckHayalDay?.()` (10g aynaReflectToday / 10i / 10j / 10k / 10l rvFinish), söz commit'te `usCheckSozDay?.()` (10s glConfirmSoz), seri mühürlenince `usOnSeriSealed?.()` (10t). Init/boot: 03-auth-shell post-auth `usInit()` + boot timer `usRunDaily()` 2600ms.

Konvansiyon: [[build-source-convention]] (preview dist/ serve eder → her değişiklikte build.sh; auto-build [[auto-build-on-stop]]). [[ritual-streak-unity]] ile uyumlu.
