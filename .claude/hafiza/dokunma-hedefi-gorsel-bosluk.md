---
name: dokunma-hedefi-gorsel-bosluk
description: "GOTCHA — base.css'in global button{min-height:44px} kuralı ince tıklanabilir öğelerde (çizgi, şerit) görsel boşluğa dönüşür; çözüm min-height:0 + ::after kaplaması"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7bd6f7ff-f41c-4cdd-baf5-1b82ceb8ad0b
  modified: 2026-08-03T14:20:24.251Z
---

`css/parts/base.css`'te Apple HIG için global bir kural var:
`button, .nav-btn, … { min-height: 44px }`. Bu kural **ince, tıklanabilir
görsel öğelerde** (2px'lik bir çizgi, dar bir şerit) dokunma kolaylığı değil
**ölü boşluk** üretir: 11px'lik içerik 44px'lik kutuya `align-items:center`
ile ortalanınca öğenin altında ve üstünde 21'er px yastık kalır. Altındaki
metin o yastığın ardına düşer ve tasarımdaki ölçü tutmaz.

Somut vaka (2026-08-03): Üç Mühür hero'sundaki yol çizgisi (`.yol-path`,
`css/parts/yol.css`) bir `<button>`; Eşik Ekranı'ndaki ikizi (`.esik-path`,
`js/parts/02d-esik-ekrani.js`) bir `<div>`. Aynı CSS diliyle yazılmış iki
yüzeyde çizgi–yazı boşluğu 27px ↔ 12.5px çıkıyordu. Fark tasarımdan değil,
yalnız birinin `<button>` olmasından geliyordu.

**Why:** Kural görünmez çünkü base.css'te, tüketicisinden uzakta duruyor;
`.yol-path`'in kendi bloğunda 44px'e dair tek satır yok. Öğe ince olduğu
sürece de "boşluk fazla" hissi bir tasarım hatası gibi okunur, yastık
akla gelmez.

**How to apply:** Tıklanabilir ince bir öğede boşluk beklenenden büyükse
ÖNCE `getBoundingClientRect().height`'ı ölç — içeriğinden büyükse suçlu bu
kuraldır. Çözüm yüksekliği içeriğe bırakmak, dokunma hedefini görselden
ayırmaktır:

```css
.x { min-height: 0; position: relative; z-index: 2; }
.x::after { content:''; position:absolute; left:0; right:0; top:-15px; bottom:-18px; }
```

İki tuzak: (1) `::after` taşması komşu tıklama alanlarını çalmasın — üst
taşmayı öğenin kendi `margin-top`'unun içinde tut. (2) `z-index` kardeşten
büyük olmalı; aynı z-index'te DOM'da **sonra** gelen kardeş (ör. altındaki
`.yol-label`) kaplamayı yutar ve hedef sessizce 44px'in altına düşer —
`elementFromPoint` ile ölçmeden "44px korundu" deme.

Ölçüm dersi: boşluk yalnız `margin` değildir. `line-height` de görsel
boşluğa girer (satır kutusu metnin üstüne half-leading ekler); iki yüzeyi
eşitlerken ikisini birlikte taşı. Bağlar: [[uc-muhur-yol-tasarimi]],
[[esik-ekrani]], [[kapat-butonu-z-index-tuzagi]].
