---
name: feature-gate-door-intro
description: "Kapı animasyonu + ilk giriş tanıtım videosu sistemi; Emre videoları FEATURE_REGISTRY'ye ekleyecek"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6ddfd8af-58bc-4b93-a2c9-1aa89ceaccd4
---

Her özelliğe girişte iki kanatlı obsidyen **kapı animasyonu** + bir özelliğe İLK girişte **tanıtım videosu** akışı eklendi (Emre'nin vizyonu).

- Modül: `js/parts/10o-w2-feature-gate.js` — `featureEnter(id, openFn)`, `FEATURE_REGISTRY`, `fgateReset(id)`.
- CSS: `css/parts/feature-gate.css` (z-index 10000, base.css altın/obsidyen estetiği).
- Wiring: `js/main.js` sonunda `FEATURE_GATE_MAP` ile şu window opener'ları sarmalanır: `gaOpenReading`(gecis-alani), `skOpen`(kendinle-konusma), `rvOpen`(degerlendirme), `hayalAcSeans`(hayal-alemi), `engOpen`(engeller), `openDailyClosure`(gunu-kapat). HTML onclick'leri değişmedi.
- CSP'ye `media-src 'self' blob: data: https:;` eklendi (_src.html).
- Akış: video sonuna kadar izlenirse → otomatik kapanır + kalıcı "görüldü". İzlenmezse "Teşekkür ederim Emre." → "onaylıyor musun?" onay ekranı → Evet ile kalıcı görüldü. Görüldü işareti `etw_feature_intro_seen_v1_<uid>` (SafeStorage, per-user).

**Admin sekmesi (Supabase'li):** Video URL'leri artık koddan değil, **Yönetim → Tanıtım Videoları** sekmesinden girilir. Tablo: `feature_videos` (feature_id PK, video_url, poster_url) — `migrations/003_feature_videos.sql` (public read + admin write RLS). Boot'ta `loadFeatureVideos()` (03-auth-shell parallel loads) tüm kullanıcılar için registry'ye işler. Admin fonksiyonları: `renderFeatureVideosAdmin()` + `saveFeatureVideos()` (10o). switchAdmin('feature-videos') sekmeyi render eder.

**Why:** Emre videoları henüz çekmedi; admin panelden ekleyecek. **How to apply:** ① Önce `migrations/003_feature_videos.sql`'i Supabase'de çalıştır (yoksa kayıt toast'la uyarır). ② Yönetim → Tanıtım Videoları'ndan URL'leri gir → Kaydet. Yeni özellik için: 10o `FEATURE_REGISTRY`'ye id + main.js `FEATURE_GATE_MAP`'e opener satırı ekle (admin sekmesi registry'den otomatik üretir).

NOT: Preview server `dist/` klasörünü serve eder (python http.server, launch.json wanderer-dev). Kaynak değişikliğini görmek için `npm run build:dev && mv dist/_src.html dist/index.html` gerekir (yoksa eski/stale bundle 404 → boot çöker). Prod için `bash build.sh`. [[build-source-convention]] [[wanderer-gamification-engine]]
