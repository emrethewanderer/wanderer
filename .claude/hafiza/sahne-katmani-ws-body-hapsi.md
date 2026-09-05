---
name: sahne-katmani-ws-body-hapsi
description: "GOTCHA: .ws-body içinde doğan inset:0 sahne katmanı padding kutusunda hapsolur ve içerikle kayar — zemin katmanı fixed olmalı"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1ef09278-0d7b-4acb-88d5-24a0df4f57d2
  modified: 2026-08-17T19:03:02.772Z
---

**2026-08-17 — Emre: "birçok ekranda arkaplan sınırlı kalmış, arkaya tam
yayılmamış."** Kök neden `.ws-body`'nin çift rolü.

`.ws-body` (`css/parts/sentez.css`) hem **scroll kabı** (`position:absolute;
top:60px; bottom:0; overflow-y:auto`) hem de **padding kabı**
(`--narrow` → `18px 22px`). Bir ekranın sahne katmanı (gök/gren/omurga) o
gövdenin içinde, `position:absolute; inset:0` ile doğduğunda containing
block'u `.ws-body`'nin **padding kutusu** olur. Sonuç iki kat kırık:

1. **Kutuda kalır.** OİK'te ölçüldü: 375px ekranda gök `x:22, w:329` —
   sol/sağdan 22px ve topbar'ın altındaki 78px sahnenin DIŞINDA. Ekranın
   ortasında kenarları belli bir dikdörtgen gibi durur.
2. **Kayar.** Yükseklik içerikle büyür (ölçüldü: `h:1983`) ve scroll'da
   yukarı kaçar — oysa gök **zemindir**, içeriğin bir parçası değil.

**Çözüm: zemin katmanı `position: fixed; inset: 0`.** Containing block
viewport olur → `.ws-body`'nin ne padding'i ne de `overflow`u onu keser
(absolute'ün aksine fixed, overflow ancestor'ı tarafından clip EDİLMEZ),
gök topbar'ın ardına geçer, içerik üstünde akarken yerinde durur. `.view`
`display:none` olduğunda fixed çocuklar da gizlenir — sahne yalnız kendi
ekranı açıkken yaşar, ekstra guard gerekmez.

**Ama her katman fixed olmaz — ayrım "zemin mi, eksen mi".** OİK'te aynı
turda yakalanan kırık: `.oik-spine` (omurga çizgisi) de fixed yapılınca
`top:40px` artık viewport'un tepesinden ölçüldü ve çizgi **üst barın
içinden, başlığın tam altından** geçti (bar 68px, çizgi bar içinde 28px).
Gök barın ardından geçer, içeriğin ekseni geçmez → omurganın `top`u barın
altından başlatıldı (`calc(var(--safe-t,0px) + 84px)`).

**Why:** Uygulama bir yer'dir; yerin göğü kutuya sığmaz. Kenarında çizgi
görünen bir gök, oda değil pano olur.

**How to apply:** `.ws-body` içinde `inset:0` bir dekor katmanı yazarken
sor: bu **zemin** mi (fixed), yoksa **içeriğin ekseni/çerçevesi** mi
(absolute, gövdede kalsın)? Zeminse fixed; ve fixed'e geçen her katmanın
`top/bottom` değerlerini yeniden oku — eski değerler gövdeye göreydi.

İlgili: [[sahne-gogu-tek-kaynak]] (aynı ders tam-ekran sahnelerde: gren
kayan ekranda fixed olmalı) · [[bugun-topbar-maybach-yildizlari]] (aynı
turun topbar tarafı) · [[olmak-istedigin-kisi-2-pencere-tasarimi]] ·
[[tasarim-prensipleri]].
