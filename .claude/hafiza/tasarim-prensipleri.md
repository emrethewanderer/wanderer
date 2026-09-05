---
name: tasarim-prensipleri
description: "Wanderer'ın tasarım anayasası — yeni/değişen her görsel unsurda uyulacak prensipler"
metadata: 
  node_type: memory
  type: project
  originSessionId: e4ba9319-177b-4956-b20b-52390ed631e0
  modified: 2026-08-09T14:14:52.028Z
---

Fable 5 ile alınan tüm tasarım kararları kalıcı bir anayasaya dönüştürüldü: repo kökünde `TASARIM-PRENSIPLERI.md`. Görsel bir unsur eklerken/değiştirirken önce buraya bakılmalı; sonundaki 10 maddelik kontrol listesi geçilmeli.

Çekirdek: form tezi taşır ("Mesele Sensin"); uygulama bir "yer"dir; her görsel öğe anlam taşır.
9 başlık: (1) üç kutuplu renk ekseni — altın=ŞİMDİ/mühür, lapis=GELECEK/hayal, bronz=söz [[uc-ana-renk-lapis]]; (2) zaman — yüzey saatle yaşar (tw-*); (3) doku — kâğıt greni + ısıtılmış obsidyen + mühür ışık/gölge; (4) tipografi — Cinzel/Fraunces/EB Garamond/Barlow dört sesli koro; (5) hareket — ev eğrisi --ease-out, oyunsu --ease-spring, nefes, zorunlu reduced-motion; (6) kart dili — 5:7 tarot, tek motor 12c, içerik-uyum [[kart-gorsel-dili]]; (7) tören — anlamlı eşikler, mühür daima altın; (8) atmosfer/derinlik; (9) erişim+build disiplini.

**2026-08-04 — §0.1 Derin Metafor Haritası eklendi** (`TASARIM-PRENSIPLERI.md:26`,
"Derin metafor haritası — her yüzey birini konuşur"): Zaltman'ın 7 derin metaforu
(denge, dönüşüm, yolculuk, kap, bağ, kaynak, kontrol) × uygulamanın yüzeyleri
eşleştirildi. **Kural:** yeni bir yüzey yazarken modül banner'ına o yüzeyin hangi
metaforu konuştuğu yazılır — görsel dil oradan türetilir, süsten değil.
İlgili: [[imge-kapisi-zaltman]] (13z arketipler aynı kökten).

**2026-08-28 — Anayasa KAPIYA bağlandı** ([[tasarim-anayasa-kapisi]]): ölçülebilir
maddeler `scripts/tasarim-denetci.mjs` + `tests/tasarim-kapisi.test.js` ile koşuluyor
(T1 z-index · T2 reduced-motion · T3 ev eğrisi · T4 altın üstü mürekkep · T5 display
sıkılaşması). Belgeye YENİ görsel kural yazan, onu ya denetçiye ya da belgedeki
"yargıya bırakılanlar" listesine bağlamak zorundadır — üç madde yazılı oldukları hâlde
uygulanmamış çıktı. Belgeye ayrıca §3'ün içerik hâli (`.wn-fade-*`), `--sp-*` ritim
merdiveni ve `--ls-display` eklendi.

Kaynak gerekçeler: base.css yorumları + modes.css + yol.css + llm-shell.css + 12c-kart-gorsel.js + 13f-zaman-dokusu.js. İlgili: [[claude-tarzi-gorsel-dil]] [[uc-muhur-yol-tasarimi]].
