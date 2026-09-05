---
name: bugun-topbar-maybach-yildizlari
description: "Maybach tavanı — twinkle yıldız katmanı; 2026-08-17'de Bugün'e özgü olmaktan çıkıp 00g motoruyla HER .ws-topbar'a taşındı (17 ekran)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 2b2cab82-a167-4b06-8d5c-3c3020cb75a7
  modified: 2026-08-17T19:02:32.838Z
---

"Bugün" ekranındaki büyük başlık barının (`.ws-topbar--hero`, [studio.css](../../../../../Desktop/Wanderer%20AI/css/parts/studio.css)) dolu siyah arka planı KAZA DEĞİL: `background: linear-gradient(180deg, var(--bg) 0%, var(--bg) 58%, rgba(15,12,8,0.72) 78%, transparent 100%)` — scroll eden gövde içeriği ve arkadaki usturlap halkası/yıldız tozu (`.ws-st-ring` / `.ws-st-dust`) bu "obsidyen perde"nin ardından erisin diye. `--bg: #0F0C08`.

2026-07-03: Emre'nin isteğiyle bu siyah perdeye "Maybach'ın tavanı gibi" fiber-optik yıldız efekti eklendi — `.ws-topbar-stars` (markup: `_src.html`, `.ws-topbar--hero` içinde ilk çocuk; her biri `--x/--y/--s/--d/--delay` custom-prop'lu `<span>`, `.ws-st-dust` yazım kalıbıyla birebir). CSS: `z-index:-1` ile perdenin arka planının (step 1) üstünde ama metnin (`.ws-topbar-hero`, statik akış, step 3) ARKASINDA boyanır — negatif z-index bu sırayı garanti eder. Twinkle: `wsTopbarStarTwinkle` keyframe (opacity 0.12↔0.9, scale 0.7↔1.15), her yıldız farklı süre/gecikmeyle asenkron parlıyor. `prefers-reduced-motion` altında animasyon durur, sabit opacity 0.45'te kalır.

**Why:** Kullanıcı arka planın siyahlığını fark edip "bilinçli mi, öyleyse yıldızlarla donatalım" dedi — obsidyen zaten tasarım dilinin parçası ([[uc-ana-renk-lapis]]), sadece üzerine lüks-otomobil tavanı esintili bir doku katmanı istendi.

**How to apply:** Renk `#F3EFE0` (sıcak fildişi beyaz) bilinçli seçildi, saf beyaz paletle çakışırdı. Yeni bir ekranın barına yıldız EKLEMEK GEREKMEZ — `.ws-topbar` sınıfını taşıyan her bar katmanı motordan alır (aşağı bak).

**2026-08-17 — katman Bugün'e özgü olmaktan ÇIKTI: tek motor `js/parts/00g-topbar-yildizlari.js`.** Emre'nin isteği: "birçok ekranda arkaplan sınırlı kalmış; üstteki yazılı kısım da Bugün'ünki gibi yıldızlarla dolsun." Motor: `STARS` desen sabiti (Bugün'ün elle kalibre 18 yıldızı birebir taşındı) + `wsTopbarStars(kok)` her `.ws-topbar`'a katmanı **prepend** eder (idempotent — katmanı olan bar atlanır). Boot saf-görsel/auth'suz: IIFE + readyState (§5.2). Ölçüldü: 17/17 bar, her birinde 18 yıldız, katman ilk çocuk.
- **`_src.html`'deki 18 span SİLİNDİ** — desen iki kaynaktan doğarsa odalar arası geçişte gök zıplar ([[sahne-gogu-tek-kaynak]]'ın "aynı yıldız aynı yerde" gerekçesiyle aynı sebep).
- **CSS studio.css → sentez.css'e taşındı** (`.ws-topbar`'ın evi); `prefers-reduced-motion` kuralı `#bugun-view` kapsamından çıkıp genelleşti.
- **Slim barın zemini de değişti:** eski `rgba(11,11,11,0.95)→0.7` opak şerit ekranın kendi göğünü barın arkasında kesiyordu. Artık çok-duraklı eriyen perde (`0.58`→`transparent`) — bar kendi zeminini kurmaz, ekranınkini üstten hafifçe koyultup bırakır. `--hero` kendi opak perdesini korur (Bugün'de gövde barın ALTINDAN akar; slim barlarda `.ws-body` `top:60px`'ten başlar, akmaz).

2026-07-03 (devam): Emre perdenin gövdeye bitişini "direkt siyahtan Bugün ekranına" sert geçiş olarak tanımladı. Kök neden: eski gradyan yalnız 2 duraklıydı (`var(--bg) 58%` → `rgba(...,0.72) 78%` → `transparent 100%`) — düz alfa interpolasyonu "dolu duruyor, sonra aniden kesiliyor" gibi algılanıyor. Çözüm: çok-duraklı ease-out yaklaşımı — erime 38%'te başlıyor, 50/62/74/86/95/100 duraklarıyla (0.92→0.74→0.48→0.24→0.06→0) kademeli sönüyor. Genel ders: `--bg` üstüne kurulan opak→transparent perde efektlerinde 2 duraklı düz gradyan YETERSİZ, çok-duraklı yaklaşık ease-out kullan ([[bugun-topbar-maybach-yildizlari]] örneği referans alınabilir).
