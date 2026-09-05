---
name: claude-tarzi-gorsel-dil
description: "2026-06-11 Claude-tarzı görsel dil geçişi — ev eğrisi --ease-out, --serif-display (Fraunces), --grain-img token'ı, ısıtılmış yüzeyler, 18–20px kart dili"
metadata: 
  node_type: memory
  type: project
  originSessionId: 36a1c8d0-e683-4d89-a7da-82a7ca848835
---

2026-06-11'de uygulanan Claude-tarzı görsel dil (5 karar, yenisini yazarken bunlara uy):

1. **Yüzeyler**: base.css token'ları ısıtıldı (--bg #0F0C08, --surface #1D1712 vb.) — saf siyah değil kahve-amber obsidyen. Yeni yüzey rengi eklerken bu sıcak skalada kal.
2. **Gren**: `--grain-img` (base.css :root) paylaşılan statik SVG noise token'ı. #chat-view::after tüm sohbet ön yüzüne 0.05 opaklıkla basar; `.ws-grain` da artık bu token'ı kullanıyor (önceden background-image'sızdı = görünmezdi).
3. **Tipografi**: `--serif-display` = Fraunces (selamlama + büyük başlıklar: .llm-home-greet, .ci-headline, .db-cover-title, .ws-section-title--serif). Gövde --serif (EB Garamond), marka majüskülü Cinzel. Fraunces _src.html Google Fonts linkinde.
4. **Hareket**: ev eğrisi `--ease-out: cubic-bezier(.16,1,.3,1)`; --ease-smooth artık ona alias. Yeni transition/animation'da --ease-out kullan; --ease-spring (taşmalı) yalnız oyunsu zıplamalar için. Haptik: 00a-infrastructure `hapticTap(ms)` + global pointerdown delegasyonu (touch, 8ms, 90ms throttle).
5. **Köşe/boşluk**: kart dili 18–20px (eski 14–16px codemod'landı; --radius-lg artık 20px). Yeni kartlar 18–20px radius + cömert padding.

**Why:** Wanderer = dil modeli kabuğu ([[dil-modeli-kabugu]]); ön yüzün Claude'un ferah-sıcak hissini taşıması bilinçli marka kararı.
**How to apply:** Yeni UI yazarken bu token'ları kullan, hardcoded bezier/radius/koyu renk yazma.
