---
name: sohbet-topbar-cok-ok-kart-portre
description: "Sohbet topbar kaydırınca çöker + flip-tarzı sade en-üste-dön oku; Ritüel Kartı'na Emre oval portresi (92×116) + sarmalanan söz"
metadata: 
  node_type: memory
  type: project
  originSessionId: 56a1101a-68d2-4a12-a2a3-5b1856d5d6b9
  modified: 2026-08-17T18:23:40.482Z
---

2026-06-21 sohbet (chat-view) üst barı + Ritüel Kartı yenilendi. **Why:** Emre "kaydırınca bar kaybolsun, mesajlar tüm sayfayı kaplasın" + karta kişisel kimlik istedi.

**Topbar (wanderer.css + 04-llm-hero-history.js):**
- Atmosferik şerit (ts-* / w2-topbar-strip-inner / updateTopbarStripMode / starfield / _STRIP_PALETTE) TÜMÜYLE kaldırıldı → bkz eski [[dil-modeli-kabugu]].
- Kaydırınca `setCollapsed` topbar'a `.topbar-collapsed` ekler → `.w2-topbar.topbar-collapsed .w2-topbar-inner { height: calc(safe-t + 22px); padding:0 }` (yumuşak geçiş) → mesajlar yukarı kayıp **ok mührünün ucu hizasından (~22px)** başlar (Emre "yazı en üstten ama sınır ok ucu olsun" dedi). `#chat-view #hero-container` koşulsuz `display:none` olduğu için negatif-margin tuck çalışmıyordu; çözüm budur.
- `.w2-topbar` saydam, border YOK, `overflow:visible` → bar tam **57px** (eskiden 58, 1px border'lı).
- `.w2-topbar-right` artık `position:absolute; top:safe-t; right:19px; height:57px` → bar çökse de sağdaki buton görünür kalır; grid'den çıktığı için ortadaki başlık yine ortalı.
- `.w2-title-col` `margin-top:0` (2026-06-21 eski -11px kaldırıldı) → başlık bloğu sol cameo fotoğraf + sağ flip mührüyle aynı dikey merkezde (üçü de centerY 28.5, grid align-items:center). Emre "title-col ikisinin ortasında olsun, biraz aşağı" dedi.

**Flip ↔ ok mührü TAKASI (sağ üst):**
- İKİ buton aynı yuvada, `.topbar-collapsed` ile takas: en üstte (bar açık) eski kart-çevir flip (`.w2-flip-btn`, `wsFlipTo('bugun')`) görünür; kaydırınca (collapsed) en-üste-dön ok mührü (`.w2-scrolltop-btn`) görünür. Kurallar: `.w2-topbar:not(.topbar-collapsed) .w2-scrolltop-btn{display:none}` + `.w2-topbar.topbar-collapsed .w2-flip-btn{display:none}`. Yani ok SADECE aşağı inilince çıkar; en üste dönünce işi biter, flip geri gelir.
- Ok tasarımı (2026-06-21 güncel): flip kart işaretiyle AYNI dil — dolgusuz 18×18 çizgi-ok SVG, `stroke="currentColor"` sw=1.4, `.ch-topbar-hist-btn`'den gelen text-dim (rgb(88,83,73)) → hover altın. Eski altın-hairline çember (30px) + `.w2-scrolltop-arrow` shimmer ok (mask + `ch-label-shimmer`) KALDIRILDI; markup'ta span yerine inline SVG. Tıkla → `w2ScrollTop()` (04 export, main.js import+window) → messages-area top'a smooth scroll.

**Ritüel Kartı (ic-card) portresi (chat.css + _src.html):**
- `.ic-emre` içine `.ic-emre-portrait` (splash `.wns-portrait` dili: oval + mühür-altını kenar, COACH_IMG, **92×116** [2026-06-21 104×132'den küçültüldü]) `float:left` + `shape-outside:ellipse(50% 50%)` + `margin:2px 18px 8px 0` → isim (`.ic-emre-sender`) sağına kayar, Emre'nin sözü (`.ic-emre-text`) portreyi sarmalar. (NOT: 2026-06-21 denenen `border-box`+`shape-margin:12px` "tam sarma" Emre'nin isteğiyle geri alındı — eski hâl bu.)
- GOTCHA: `_icPopulateEmre` yalnız `#ic-emre-text` ve `#ic-emre-sender` içeriğini set eder, `.ic-emre`'nin diğer çocuklarına dokunmaz → statik `<img>` kalıcıdır. `#ic-card:not(.has-emre) .ic-emre-portrait{display:none}` ile yanıt gelince görünür.
- GOTCHA: Eşik Ekranı (.sc-onb) ic-overlay'in üstünde; preview'de kartı görmek için ic-overlay z-index'i geçici yükselt + .sc-onb'u gizle.

**GOTCHA — bar histerezisi TERS kurulursa sohbet titrer (2026-08-17, ekran kaydından teşhis):**
- Bar layout AKIŞINDADIR (`position:sticky`, `.chat-area`'nın flex kardeşi). Çökünce `.w2-topbar-inner` 57px→22px iner ve `.chat-area` **tam 35px uzar** — canlı ölçüldü. Yani her durum değişimi bir layout sıçramasıdır; bar'ın açılıp kapanması ucuz değildir.
- Eşikler ters kuruluydu: `HIDE_AT=60` ama `SHOW_BELOW=400`. Gösterme eşiği gizleme eşiğinin ÜSTÜNDE olunca 60–400 arası kararlı bant değil **kararsız bant** olur — kullanıcının her yön değişimi barı toggle eder. Ölçüm: tabanda ±12px'lik parmak oynaması yarım saniyede **8 toggle** üretiyordu; ekran 35px'lik adımlarla ileri-geri zıplıyor, kaydırma "tutmuyor" hissi veriyordu.
- Düzeltme: `HERO_SHOW_BELOW = 24` (< `HERO_HIDE_AT = 60`). Arada kalan 24–60 bandı artık "durumu koru" bölgesi. Aynı ölçüm: **0 toggle**, içerik yalnız kullanıcının ittiği kadar (12px) hareket ediyor.
- Karar mantığı saf fonksiyona çıkarıldı: `_heroCollapseKarar(top, lastTop, hidden, mesajSayisi)` (export, `_nextFallbackModel` emsali — window'a açılmaz). jsdom layout hesaplamadığı için titremeyi DOM'da test etmek mümkün değil; saf fonksiyon bunu çözer. Kapı: `tests/04-llm-hero-history.test.js` → "KARARLI BANT" + "TİTREME YOK" testleri (eski eşikle ikisi de kırmızı — doğrulandı).
- **Kural:** layout'u değiştiren HER kaydırma-tetikli durum için gizleme eşiği gösterme eşiğinin üstünde olmalı. Aksi hâlde toggle'ın kendi ürettiği layout kayması bir sonraki scroll event'ini besler ve döngü kapanır.
