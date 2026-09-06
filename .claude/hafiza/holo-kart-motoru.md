---
name: holo-kart-motoru
description: "2026-07-08 cool sprinti — 12c HOLO motoru: kartlar jiroskop+imleçle eğilir, folyo parıltısı + sahne parallax'ı; TEK motor iki mod (wrap=jenerik ikv kart / vars=10q kk-card3d); kkBindTilt motora delege"
metadata: 
  node_type: memory
  type: project
  originSessionId: 17e76bac-7ba8-4b1d-aa6a-76a16f8d4b3e
---

**12c HOLO MOTORU** (2026-07-08): koleksiyon kartları ışığa tutulmuş gibi eğimi izler. Girişler: masaüstü pointer + mobil jiroskop (`deviceorientation`, yavaş-uyumlu taban çizgisi — telefonu nasıl tutarsan tut oradan oynar; iOS 13+ izni yalnızca karta-dokunma JESTİ içinde istenir, ret sessiz). rAF yay (lerp 0.14), kartlar yokken/hedef sıfırken döngü durur.

**TEK motor, İKİ mod** (paralel tilt sistemi yasak — reuse):
- `wrap` (jenerik `.ikv-card`/`.ikv-back`, 6°): eğim karta DEĞİL motorun eklediği `.ikv-holo` SARMALAYICISINA uygulanır → `.yol-pole .ikv-card{transform:...}` gibi duruş kuralları bozulmadan bileşir. Karta `.ikv-holo-sheen` folyo bandı (altın→beyaz→lapis) + `.ikv-scene` parallax; canlı giriş yokken 7.5s idle nefes parıltısı.
- `vars` (10q `.kk-card3d`, 9°): sarmalayıcı YOK; kartın kendi foil/glare CSS'inin okuduğu `--rx/--ry/--mx/--my` sürülür. **10q kkBindTilt artık motora delege** (eski elle-pointer kodu silindi); 9° = eski (0.5−p)×18 formülünün etkin ucu, his birebir.

Sözleşme: mini/fog kart parlamaz (kilitli kart parlamaz) · kk-card3d içindeki ikv karta wrap girmez · `prefers-reduced-motion`'da attach no-op · jiroskop kk minilerine akmaz (100 hücre GPU israfı). API: `ikvHoloAttach(el, {mode,max})` + `ikvHoloScan(root)` (window'da).

Entegre yüzeyler: 10q (kkBindTilt üzerinden her yer) · 02d eşik kartları · 10A _renderPresent sunumu · 10D hub · 10t kilometre kartı (yalnız milestone). Testler: `tests/12c-holo.test.js` (9).

**Why:** Kart ana mekanik ([[kisilerim-kart-motoru]]); fiziksellik = premium his, "hangi açıdan bakarsan o yüzünü gösterir" anlamı [[tasarim-prensipleri]] §0'a oturur.

**How to apply:** Yeni tören/detay kartı eklerken render sonrası `try{window.ikvHoloScan(container)}catch(_){}` yeter. Jiroskop hissi gerçek cihazda ayarlanmadı — doz `IKV_HOLO_MAX` (12c) ve gyro norm ±14°'de; şikayet gelirse orada oyna.
