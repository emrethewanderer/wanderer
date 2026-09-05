---
name: studio-tek-sayfa
description: "2026-07-02: Studio tek sayfa oldu — tam ekran Drawer (#ws-studio) emekli; odalar Bugün'ün STÜDYO bölgesinde (ayraç + GALERİ/İÇ DÜNYA/YOLCULUK/OCAK); w2OpenDrawer→Bugün delegasyonu; wsSyncStudio canlı doku"
metadata: 
  node_type: memory
  type: project
  originSessionId: 2187163b-1913-447d-9160-115926fa4535
---

2026-07-02 sprinti: Wanderer Studio, LLM ön yüzü gibi **tek sayfa** oldu; merkez [[bugun-ekrani-yeniden-duzen]] Bugün ekranı. Plan: `.claude/plans/studio-tek-sayfa.md`.

- **Drawer emekli:** `#ws-studio` markup'ı `_src.html`'den kaldırıldı. ⚠️ `.ws-studio` CSS'i KALDI — [[admin-ayri-sayfa]] `#admin-home.ws-studio--admin` gömülü stüdyosu kullanıyor; admin'in kendi `admin-daily-thought` plaketi de ayrı ve TR.
- **Bugün iki bölge:** üst GÜN (yol-hero, greet, ak-strip) + `#ws-studio-divider` ("STÜDYO — Hayatını oluşturduğun alan", altın→lapis eriyen çizgi) + 4 bölüm: `#studio-galeri` (gal-shelf kart rafı + 4 oda), `#studio-icdunya` (İç Meclis + Hayattaki Sen), `#studio-yolculuk` (Mührüm + Ayın Filmi), `#studio-ocak` (Dinlenme + Admin + Günün Düşüncesi plaketi). Oda stilleri Drawer'ın `ws-st-*` sınıflarını yeniden kullanır.
- **Korunan sözleşmeler:** `w2OpenDrawer` → switchView('bugun') + ayraca smooth-scroll; `w2CloseDrawer` → no-op; `w2Nav` → beklemesiz (10x derin-link string imzası korunur). Taşınan id'ler aynen: `ws-hs-pulse`, `ws-drawer-premium-badge` (Bugün hero eyebrow'unda), `drawer-daily-thought`, `w2-admin-section`.
- **Navigasyon:** Bugün'ün hamburger'ı kalktı; 9 arka-yüz ekranının hamburger'ı `← Bugün` (switchView('bugun')) oldu. Bugün tagline'ı: "· Hayatını oluşturduğun alan ·".
- **wsSyncStudio (10-features-w2):** loadBugunView sonunda koşar; Galeri rafı (son 8 kart, 12c `ikvCardFace` mini, `--gi` kademeli giriş), Kişilerim/Mühür/Meclis sayaçları. Dinamik import'lar (10q/12b/12c/10g/10p) — TDZ/döngü yok. Tazeleme kancaları: 10q kkTick kart kazanımında + 10p getSuretler sonunda `window.wsSyncStudio?.()`. Suret tembel hidrasyonu: `S._suretler === undefined` iken BİR KEZ getSuretler çekilir (state'te ön-tanımsız olduğu için güvenli; döngüyü tanımlılık kırar).
- **Fixed hero perdesi:** Bugün artık uzun scroll — `.ws-topbar--hero` background'ı eriyen obsidyen degrade (blur değil); içerik başlığın arkasında erir.
- **i18n:** `studio.*` anahtarları 15b core dict TR/EN paritede; canlı sayaç sub'larında data-i18n YOK (applyTranslations ezmesin diye, JS t() doldurur); `studio.meclis_1` tekil hâli ayrı anahtar.
- Cascade `#bugun-view.casc .ws-body > *` gecikmeleri 10. çocuğa genişletildi ([[giris-kademelenmesi-casc]]).
