---
name: giris-kademelenmesi-casc
description: "Ekran giriş animasyonu — .casc + --casc-base mekanizması, perde sonrası tetiklenir (Bugün + llm-home)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 4c797792-7e93-4044-824b-a31b2ce818bc
---

Bugün ve Wanderer LLM ana ekranı (llm-home) artık Drawer'ın oda kademelenmesiyle (wsStRoomIn/wsStRise; llm-home'da llmHomeIn) süzülerek girer. (2026-06-16)

**ÇEKİRDEK KURAL — cascade .casc sınıfıyla JS'ten tetiklenir, display değişimiyle DEĞİL.** Sebep: ekranı bir perde kaplar — flip başlığı ("Wanderer Studio"/"Wanderer", #ws-flip-title, YARI SAYDAM rgba .66–.94+blur, ~1.15s), boot wn-splash, ya da Eşik/onboarding (.onb-ritual, opak, 0.45s opacity fade). Cascade perde ardında boşa akmasın/yarışmasın diye `--casc-base` gecikmesiyle perdenin ÇIKIŞIYLA ÖRTÜŞECEK şekilde bekletilir; CSS'teki `backwards`/`both` fill o süre unsurları `from` (opacity 0) TUTAR → ne boşa akar, ne boşluk kalır, ne flash.

**Mimari:**
- CSS: kurallar `#bugun-view.casc ...` / `#chat-view.llm-home.casc ...`; `animation-delay: calc(var(--casc-base, .04s) + <ofset>)`. Keyframe'ler ORTAK/yeniden tanımsız (wsStRoomIn, wsStRise, wsStTitleShimmer — studio.css; llmHomeIn — llm-shell.css). `.casc` YOKKEN unsurlar statik-görünür.
- JS (10y `_wsCascade(viewEl, base)`): `--casc-base` set → `.casc` remove→`offsetWidth` reflow→add (her girişte baştan oynar). reduced-motion'da erken çıkar.
- Base sabitleri (10y, 2026-06-16 KALİBRASYON): `CASC_FLIP=0.4` (after-hook 340ms'de → motion ~740ms; perde metni ~805ms dağılır, zemin ~828ms solar → fade'le örtüşür. ÖNCE 0.8'di → fade boyunca gizli kalıp BOŞLUK bırakıyordu, düşürüldü), `CASC_CURTAIN=0.2` (Eşik/onboarding 0.45s fade'iyle örtüşür: opak yarıda gizli, fade'de yüksel), `CASC_SPLASH=0.45` (wn-splash), `CASC_NOW=0.04` (perdesiz).

**Tetik noktaları:**
- Flip (after-hook, `_flipBusy` true): Bugün → `_wsCascade(#bugun-view, CASC_FLIP)`; ön yüz → `llmSyncHome(CASC_FLIP)`. _flipArmed false iken (boot'taki İLK geçiş) flip olmaz → CASC_NOW.
- Perdesiz aynı-yüz gezinme: CASC_NOW.
- Boot: initApp wn-splash `.closing` anında `window.llmHomeCascade()` (export 10y, expose main.js). KRİTİK: llmHomeCascade, AÇIK `.sc-onb:not(.onb-closing)` (Eşik/onboarding) varsa ERTELER → splash kapanışında home Eşik'in ALTINDA kalır, boşa akmaz.
- Eşik (02d) / onboarding (02c) `close()`: `.onb-closing` ekledikten SONRA `window.llmHomeCascade()` çağırır → defer kontrolü geçer (artık .onb-closing), base auto = CASC_CURTAIN (kapanan `.sc-onb.onb-closing` algılanır) → home, perde fade'iyle örtüşerek süzülür.
- Oturum-içi home yeniden beliriş: llmSyncHome base'siz, `!was` ise CASC_NOW.

`.llm-home` artık yalnız DÜZEN; animasyon `.casc`'a taşındı. reduced-motion blokları `.casc` özgüllüğüne yükseltildi. İlgili: [[dil-modeli-kabugu]] (flip+veil), [[acilis-perdesi]] (wn-splash), [[uc-muhur-yol-tasarimi]] (Bugün hero), [[bugun-ekrani-yeniden-duzen]].
