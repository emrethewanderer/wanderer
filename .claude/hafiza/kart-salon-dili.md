---
name: kart-salon-dili
description: "2026-07-02 \"Fener Salonu\" sprinti — kart ekosisteminin tüm ekranları ortak tören primitifleriyle (12c ikvRing/panel/cascade/mühür buton) yeniden giydirildi"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7f7a4afc-0abf-40c0-bcc7-fab8ca820474
---

**"Fener Salonu" tasarım sprinti (2026-07-02):** kart ekosisteminin 8 ekranı + kart
detay töreni tek törensel dile taşındı. [[kart-gorsel-dili]] ve [[tasarim-prensipleri]]
üstüne oturur.

**Ortak primitifler artık 12c'de** (`12c-kart-gorsel.js`, JS-enjekte; `window.ikvRing` da açık):
- `ikvRing(pct, {size, yol, center, cls})` — mühür halkası; ilerleme DAİMA halka dilinde.
  `yol:true` → altın→lapis degrade (şimdiden geleceğe akan ilerleme); %100'de `is-full`
  nefes alan glow.
- `.ikv-panel` / `.ikv-panel--lapis` — ısıtılmış obsidyen pano: köşe radialleri + grain
  (`::after`, blend YOK) + radius-xl. `.ikv-hairline` eriyen ayraç.
- `.ikv-cascade > *` — kademeli süzülme; hücreye inline `style="--i:${Math.min(i,24)}"`,
  CSS `animation-delay:min(calc(var(--i,0)*38ms),.95s)`. Aynı kalıp 10A (akRise) ve
  10C'ye (sfRise) kendi keyframe'leriyle kopyalandı.
- `.ikv-seal-btn` (dövülmüş altın mühür pill) / `.ikv-ghost-btn`; 10q `kk-btn-primary/ghost`
  aynı dile çevrildi. Hepsi min-height 44px + focus-visible.

**Ekran durumu:** 10q (Kişilerim=altın salon `kk-wrap--gold`, Kişiler=lapis eşik
`kk-wrap--lapis`, `kkHallHead` halkalı tören başlığı, spotlight=nefes alan eşik ışığı,
kkOpenDetail=tam tören: `kk-det-dawn` şafak + `--rar` aurası + `::first-letter` tezhipli
ilk harf) sıfırdan; 13l im-block + 10r cz-* (Bugünün Kişisi mor→LAPİS'e normalize) +
13-extras hs-* (Hayattaki Sen) + 02c benlik portre sunağı + 12a `ws-arkv-*` (inline
stiller sınıfa taşındı, sentez.css) yeniden giydirildi. 10A ve 10C zaten dildeydi —
yalnız cascade + grain/atmosfer rötuşu.

**Görsel test:** `kisilerim-test.html` (repo kökü, GEÇİCİ — build'e girmez):
import-map ile 4 bare dep (`@supabase/supabase-js`, `marked`, `dompurify`, `chart.js`)
data-URL stub'lanır → 10q gerçek modül zinciri kaynaktan yüklenir, S seed'lenir.
localhost:3030 + preview_resize mobile ile iki görünüm + iki detay + paket töreni
doğrulanır. ⚠️ preview_screenshot giriş animasyonu ortasında yakalayabilir — DOM
opacity'sini eval ile doğrula, 1-2 sn sonra tekrar çek.
