---
name: emre-foto-oval-cerceve
description: "Emre'nin fotoğrafı her zaman Wanderer↔Studio geçişindeki oval \"Emre\" çerçevesiyle gösterilmeli"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 3cb443d6-b3fe-4984-aad5-9cd11cc29bb8
---

Emre'nin portresini uygulamada NEREDE gösterirsem göstereyim, daima **Wanderer ↔ Wanderer Studio geçişindeki (ve açılış perdesindeki) oval çerçeve tarzıyla** çerçevele — yuvarlak daire ya da kare DEĞİL, oval.

Kanonik stil = `.wns-portrait` (`css/parts/llm-shell.css`): dikdörtgen + `border-radius: 50%` = oval; `border: 1.5px solid rgba(245,166,35,0.55)` (mühür altını kenar); altın halka glow box-shadow. Oran ~0.79 (104×132).

**Why:** Emre'nin portresi marka boyunca tek, tanınır bir çerçeveye sahip olmalı; oval altın çerçeve "Emre = bu mekânın sahibi/mührü" kimliğinin görsel imzası. Daire/kare kullanmak bu imzayı bozar.

**How to apply:** Yeni bir yere Emre fotoğrafı eklerken/değiştirirken `.wns-portrait` çerçevesini taban al (oval + 1.5px altın kenar + altın halka glow). Örnek uygulama: Duyuru sayfası `.announce-sheet-seal` (64×80 oval). İlgili: [[vasita-banner-kitaplik-haberi]], [[acilis-perdesi]], [[tasarim-prensipleri]].
