---
name: ikon-buton-denetimi-karari
description: "KARAR 2026-08-03 — ikon-buton denetimi: kapsam UYGULAMA GENELİ, ikon dili STROKE, kullanıcı Tekrar dene YERİNDE YENİLER"
metadata: 
  node_type: memory
  type: project
  originSessionId: 217d6db9-213b-436a-93dc-872d53791a97
  modified: 2026-08-03T19:16:23.871Z
---

Emre 2026-08-03'te mesaj eylem şeridinden yola çıkan bir denetim istedi
("Bu butonların tasarımsal olarak Claude ile aynı boşluk olsun" +
"Bu butonlar tam çalışmıyor") ve üç çatalı şöyle bağladı:

1. **Kapsam: uygulama geneli tüm ikon-butonlar.** Yalnız sohbet şeridi
   değil — Studio, Kişilerim, kart yüzeyleri dahil metinsiz ikon-butonların
   tamamı tek ölçek diline oturur.
2. **İkon dili: STROKE.** Google Material "filled" siluetler bırakılır;
   `_SEND_ICON_SVG` (06-summary-chat.js) ile aynı dil asıldır — ince çizgi,
   `currentColor`, ~1.8 kalınlık. Gerekçe: altın renk çizgide daha zarif
   okunur ve uygulamanın geri kalanıyla tek dil konuşulur.
3. **Kullanıcı mesajı "Tekrar dene": yerinde yeniler.** Eski kullanıcı
   mesajı + ondan sonraki yanıt sohbetten ve `S.chatHistory`'den düşer,
   aynı metinle taze tur koşar. Eski davranış (input'a yaz + `sendMessage`)
   sohbette kopya mesaj üretiyordu.

Ölçülen başlangıç durumu (2026-08-03, canlı preview): şerit butonu 18×18px,
ikon 10px (Emre) / 12px (kullanıcı), adım 22/20px — Claude ölçüsünün
yaklaşık yarısı; dokunma hedefi 18px (base.css'in 44px'i `#chat-view`de
sıfırlanmış, kaplama yok).

**Why:** Kapsam kararı işi tek dosya çiftinden (06-summary-chat.js +
chat.css) uygulama geneline büyüttü; sonraki oturumlar "neden bu kadar
geniş" diye sormasın ve daraltmasın diye kağıda geçti.
**How to apply:** Yeni ikon-buton yazarken stroke dilini ve ortak ölçeği
kullan; dokunma hedefini görselden ayır ([[dokunma-hedefi-gorsel-bosluk]]).
Bağlar: [[claude-tarzi-gorsel-dil]], [[tasarim-prensipleri]].
