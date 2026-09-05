---
name: kitaplik-paylasim-indirme
description: "Kitaplık paylaşımı (10g + 13g shrShareArticle) + admin \"İndirme Bağlantıları\" sekmesi (13n + mig 021); drawer kitap simgesi shimmer ile cycle eder"
metadata: 
  node_type: memory
  type: project
  originSessionId: 06168c4b-5fd0-45b5-b0aa-b3d183fba594
---

Kitaplık (Drawer · `.ch-drawer-library`) + paylaşım + indirme:

- **Drawer kitap düğmesi shimmer**: chat.css `@keyframes ch-drawer-library-shimmer` 8s linear cycle (text-dim → gold @28% → text-dim → lapis-bright @70% → text-dim) — Geçmiş Günler `ch-label-shimmer` ile aynı renk/ritim. SVG `stroke="currentColor"` olduğu için `color` animasyonu yeterli; `prefers-reduced-motion`'da `color:var(--gold)` sabitlenir.
- **Kitaplık Okur paylaş düğmesi**: 10g `_libRenderReader` içinde `.lib-share-btn` (mr-card--lib altında, hairline altın); `window.shrShareArticle({title, body, dateLabel, kicker})` çağırır.
- **13g `shrShareArticle`**: yazı uzunluğuna göre 1080×1920 obsidyen/altın N sayfa canvas çizer (`_paginate` + `BODY_FONT` ile satır bölme; ilk sayfa: başlık+tarih+ayraç+gövde; son sayfa altında "UYGULAMAYI İNDİR" + kısaltılmış URL). Native: Capacitor Filesystem+Share çoklu dosya; web: `navigator.share({files, text})`; son çare: tüm sayfaları indir + panoya metin.
- **13n `13n-indirme-baglantilari.js`**: `getAppDownloadLinks()` cache'li fetch (`app_download_links` tablosu, id=1); `renderDownloadLinksAdmin()` + `saveAppDownloadLinks(btn)`. Tablo yoksa sessiz boş döner.
- **Admin sekmesi**: `_src.html` "İNDİRME" tile (i:10, DUYURU↔SİSTEM arası); `page-download-links` admin page; `ADMIN_TITLES['download-links']` + `switchAdmin('download-links')` dinamik import (07-settings-knowledge).
- **Migration**: `migrations/021_download_links.sql` (`app_download_links` tablosu: ios_url, android_url, web_url; public read + admin write RLS; tek satır id=1) — ELLE çalıştır.

**Why:** Cazibe Motoru'nun Toplumsal Kanıt ilkesinin etik hâli — paylaşan KENDİ yolculuğunu gösterir, izleyene "uygulamayı indir" doğal köprü açılır.

**How to apply:** Yeni paylaşılabilir içerikler eklerken (Kişi Kartları, Hayal sahneleri vb.) `shrShareArticle`'ı değil; o sadece düz-yazı için. Mühür kartları için `shrShareStory` (mevcut). İlgili: [[ic-meclis-suretler]], [[cazibe-motoru-cialdini]], [[kisilerim-kart-motoru]].
