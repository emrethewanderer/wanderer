---
name: his-doku-paylasim
description: "Cool paketi katman 1 (2026-06-11) — 13e His Motoru (fxCue ses+haptik), 13f Zaman Dokusu (tw-* ambient), 13g Paylaşım Motoru (shrShareStory story kartı)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5d56cf54-236f-4e19-a917-d1850797c86a
  modified: 2026-07-20T11:40:09.567Z
---

**13e His Motoru** — tek giriş `window.fxCue(name)`: tap/seal/milestone1-4/pack/holo/holoGrand/gift/soz/elmas/whoosh. Sesler WebAudio ile SENTEZ (dosya yok); haptik native'de @capacitor/haptics, web'de navigator.vibrate. AudioContext ilk pointerdown'da açılır (autoplay). Prefs per-uid `etw_fx_prefs_v1`; Ayarlar'da "Doku · Ses & Titreşim" (fx-sound-toggle/fx-haptic-toggle). Entegrasyon: 10t mühür (280ms gecikme), 10s armağan/söz, 10g elmas, 10q paket/holo (haptic() artık fxHaptic'e yönlenir).
**GÜNCEL DEĞİL** — 2026-07-20 "His Motoru 2.0" ile 13e büyük ölçüde genişledi (10 yeni cue, haptik koreografi, gece kısıklığı, Fener Ambiyansı) → [[his-motoru-2-0]] güncel kaynak.

**13f Zaman Dokusu** — `<html>`'e tw-morning/day/evening/night sınıfı (5-11-17-22 sınırları); base.css "ZAMAN DOKUSU" bloğu yalnız --dawn-* token'larını kaydırır (obsidyen taban sabit). Modül yüklenirken uygular (auth bağımsız), 10dk nabız.

**13g Paylaşım Motoru** — `window.shrShareStory(params)`: 1080×1920 obsidyen/altın canvas (accent param ile lapis/nadirlik rengi), akış native=Filesystem+Share → web navigator.share(files) → PNG indirme. Giriş noktaları: 10t kilometre töreni "KARTI PAYLAŞ ↗" + galeri sm-card-share çipleri (smShareCard), 10q paket reveal "PAYLAŞ ↗", 13j Wrapped finali.

**Why:** Premium his + dışarı taşan güzellik (Toplumsal Kanıt'ın etik hâli) — [[cazibe-motoru-cialdini]].

**How to apply:** Yeni tören eklerken fxCue çağır (window üzerinden, TDZ-güvenli); yeni paylaşılabilir an için shrShareStory'ye param geç, yeni renderer yazma. @capacitor/haptics+share+filesystem+preferences package.json'da — native derlemede `npx cap sync` gerekir.
