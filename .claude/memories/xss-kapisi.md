---
name: xss-kapisi
description: XSS yüzey denetçisi ifade-bazlıdır ve HTML üreten HER template'i tarar; taban scripts/xss-taban.json
type: mimari
---

# XSS kapısı — ölçü `innerHTML` satırı değil, HTML üreten template

`scripts/audit-innerhtml.mjs` + `scripts/xss-taban.json` +
`tests/xss-kapisi.test.js` (2026-09-02).

**Why:** Eski motor `.innerHTML =` satırını bulup **±2 satırlık pencereye**
bakıyordu ve iki yönde de yalan söylüyordu — çok satırlı `map` bloklarındaki
kaçışı göremeyip temiz kodu "riskli" sayıyor, komşu satırdaki alakasız bir
`escapeHTML` yüzünden gerçekten korumasız bir atamayı "kaçışlı" damgalıyordu.
İkincisi tehlikeliydi.

Daha derin sebep: **bu repoda HTML çoğunlukla `innerHTML` satırında değil,
HTML döndüren yardımcı fonksiyonlarda kurulur** (`${_atlRing(1)}`,
`${kkRenderCard3D(kart)}`). Bir fonksiyon çağrısını tek başına "riskli"
saymak da "güvenli" saymak da yanlıştır; doğrusu o fonksiyonun kendi
template'ini de taramaktır.

**How to apply:**
- Motor HTML üreten her template literal'in interpolasyonlarını sınıflandırır.
- Güvenli sayılanlar: `escapeHTML`/`esc`/`safeHTML` sarmalı · i18n getter'ı
  (`t`/`p`) · salt literal/aritmetik · `UPPER_SNAKE` sabit · fonksiyon
  çağrısı (gövdesi ayrıca taranır) · elle yazılmış kaçış zinciri.
- Kalanlar tabana yazılır; kapı **listenin büyümesini** yasaklar. Düşmek
  serbesttir, `--taban-yaz` ile kayda geçer. Liste boşalınca kapı sertleşir.
- Bilinçli istisna: satırda ya da hemen üstündeki yorumda
  `/* XSS-MUAF: gerekçe */`. Gerekçesiz muafiyet de ihlaldir.

**Kaçış tek kaynaktır:** `escapeHTML` (`00a-infrastructure.js`) tip
güvenlidir (sayı/0/false/nesne). 22 modülün eski `esc` ikizi ona delege
eder — ikizler merkezî helper çöktüğü için doğmuştu, altısı tek tırnağı
kaçırmıyordu. `10g-w2-wanderer-game.js`'teki `esc` bir REGEX kaçışıdır,
HTML değil; denetçi onu `&amp;` üretmediğinden ayırt eder.

İlgili: [[kapi-tarama-yarisi]] · `CODEMOD.md`
