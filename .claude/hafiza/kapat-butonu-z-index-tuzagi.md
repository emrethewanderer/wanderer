---
name: kapat-butonu-z-index-tuzagi
description: "Modallarda buton neden tıklanamıyor — iki varyant: opacity<1 kicker stacking context tuzağı + pointer-events'siz dekoratif kaplama katmanı"
metadata: 
  node_type: memory
  type: project
  originSessionId: d3ad5442-bab0-49e9-b03e-2426d15f7a09
  modified: 2026-07-25T11:31:03.432Z
---

2026-07-03: Emre "Gün Kapanışı" (Akşam Kapanışı, [[toren-katmani-aksam-meclis-wrapped]]) kapatma butonuna
"zar zor basabiliyorum" dedi. Kök neden doğrulandı (elementFromPoint ile canlı test): `.at-close`
`position:absolute` + `z-index:auto`, hemen ardından gelen `.at-kicker` `opacity:.85` taşıyor.
CSS spec'e göre `opacity<1` bir stacking context açar ve bu context `z-index:0`'a eşdeğer muamele
görür — yani DOM'da SONRA gelen `.at-kicker`, aynı seviyedeki `.at-close` ile berabere kalınca
ONU KAPATIR (üstüne boyanır). Kullanıcı butonun görsel merkezine bastığında aslında görünmez
kicker div'ine basıyordu; sadece üst/alt kenar şeridinde tıklama işe yarıyordu.

Aynı desen (position:absolute kapat butonu + hemen ardından opacity<1 "kicker" sibling, z-index yok)
3 yerde daha bulundu ve aynı şekilde doğrulandı/onarıldı:
- `.announce-sheet-close` (10g, wanderer-game.css) — `.announce-sheet > *` wildcard'ı hem butona hem
  kicker'a aynı z-index:1'i veriyordu → DOM-sırası berabere.
- `.lib-sheet-close` (10g, wanderer-game.css) — `.lib-sheet-kicker{opacity:.9}` aynı tuzak.
- `.sf-detail-close` (10C, sosyal.css) — `.sf-detail-stage > *{z-index:1}` wildcard'ı card-wrap ile
  berabere bırakıyordu; şu an sadece kart genişliği dar olduğu için köşeye değmiyordu (kırılgan).

Fix: her dördüne de kapat butonunun kendi kuralında `z-index:2` (pozitif, kesin üstün) eklendi.
`.mr-close`(z-index:10), `.hk-close`/`.km-close`/`.mektup-close`(z-index:2), `.wr-close`(z-index:4),
`.yolp-close`(z-index:5), `.us-scene-close`(z-index:10) zaten doğru kurulmuş, dokunulmadı.

## VARYANT 2 (2026-07-25) — pointer-events'siz dekoratif kaplama katmanı

Emre "Üç Mühür uyanış modalında CONTINUE'ya basılmıyor" dedi. Kök neden aynı aile, farklı mekanizma:
`.us-awaken-rays` (ultra-seri.css) `position:absolute; inset:-20px` ile MODAL'ın tamamını kaplıyordu,
ama ne `z-index` ne `pointer-events:none` taşıyordu. Konumlandırılmış eleman, aynı stacking context'teki
STATİK kardeşlerinin (kicker/title/body/cta) üstüne boyanır — DOM'da ilk çocuk olması korumaz.
`mask: radial-gradient(... transparent 60% ...)` ortayı görsel olarak boşaltıyordu ama **mask hit-test'i
etkilemez**: buton pırıl pırıl görünüp tamamen ölüydü. Canlı kanıt (elementFromPoint, 5 nokta): eski CSS'te
butonun beş noktası da `us-awaken-rays` döndürdü, click handler 0 kez tetiklendi; düzeltilmiş CSS'te beşi de
`us-awaken-cta`, handler tetiklendi.

Fix repo'nun ZATEN kurulu kalıbı: dekoratif katmana `z-index:0; pointer-events:none`, içeriğe
`.us-awaken-modal > * { position:relative; z-index:1 }`. Bu kalıp `.portre-hero::after`, `.sf-detail-stage::after`,
`.ws-arkv-panel::after`, `.gor-window::after`, `.sm-sparks`, `.ws-st-dust`'ta zaten doğru kuruluydu —
`.us-awaken-rays` tek istisnaydı. Ayrıca CTA 36px'ti → `min-height:44px` + inline-flex (dokunma hedefi).
`.sm-rays` (10t) tarandı ve GÜVENLİ: 168px'lik `.sm-stage` içinde kalıyor, modalı kaplamıyor.

**Nasıl uygula:** Yeni bir modal/sheet şablonu eklerken kapat butonu `position:absolute` ise VE
hemen ardından (veya aynı stacking-context kökünde daha sonra) `opacity<1`, `transform`, `filter`
ya da `animation` taşıyan bir kardeş (özellikle "-kicker" etiketi) varsa, kapat butonuna MUTLAKA
açık `z-index` ver (>=2, wildcard varsa wildcard'ın verdiğinden yüksek). Aksi halde buton görsel
olarak orada durur ama tıklamalar rastgele kardeşe gider — kullanıcı "zar zor basabiliyorum" der.

Varyant 2 için: bir yüzeye tam-kaplayan dekoratif katman (ışın, gren, aura, parıltı, toz) eklerken
`pointer-events:none` + `z-index:0` ŞART, ve kapsayıcıya `> * { position:relative; z-index:1 }` eşlik eder.
`mask`/`opacity`/`transparent` ile görünmez olması tıklamayı geçirmez. Semptom teşhisi: butona basılmıyorsa
önce `document.elementFromPoint(merkez)` çalıştır — dönen eleman butonun kendisi değilse suçlu odur.

Dokunulmadı ama ayrı bir konu: `ck-close`, `mem-close` (~20px, statik/inline, taşma değil boyut
sorunu), `kt-close`/`ys-close`/`yolp-st-close` (28-34px, 44px dokunma hedefi altı) — bunlar z-index
tuzağı DEĞİL, sadece küçük dokunma alanı; ayrı bir iyileştirme kararı gerektirir.
