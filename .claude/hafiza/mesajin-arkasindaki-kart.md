---
name: mesajin-arkasindaki-kart
description: "KARAR 2026-08-02: sohbet chip'i kalktı; kart arka planda tasarlanır, ancak TUTARSA mesajın arkasında çerçeve belirir — sahte kart yok"
metadata: 
  node_type: memory
  type: project
  originSessionId: b0b53af1-7090-49dc-875a-171a6f5fdfed
  modified: 2026-08-02T18:18:14.340Z
---

Sohbet → Atölye köprüsü (10B) tersine çevrildi: **davet, tasarımdan SONRA
gelir.** Emre'nin cümlesi: *"Eğer kart oluşturulamayacağı bir durum varsa,
neden böyle bir kart oluşturalım diyor? Kart gerçekten oluşturabildiği vakit
kart oluşturmaya davet gelsin."*

Akış: mesaj biter → eşik (`_messageSuggestsPerson` ya da `[KART]` etiketi) →
`_armCardFrame` arka planda `gkDesignForChat` çağırır → **tasarım tutarsa**
`.msg-body`'ye `.ik-kart` sınıfı + köşe sigili (`.ik-kart-sigil`) eklenir,
mesajın arkasında altın↔lapis shimmer'lı çerçeve belirir → tıklanınca
`gkOnboard(display, {preDesigned})` ağ beklemeden dolu açılır.
**Tutmazsa hiçbir şey görünmez.** Altın CTA chip'i (`ik.chip_cta`) SİLİNDİ.

**Why:** Emre'nin Keynote'undaki bozuk Atölye ekranı (`Attained Self` +
`You know this pattern` + yalnız Düşünceler'de kullanıcının kesik cümlesi)
LLM çıktısı değil, satır satır `_fallbackGolden()` çıktısıydı. Üç kök:
(1) `_designDual` timeout'u 22 sn iken `deepseek-v4-flash` reasoning
modelinin doğal gecikmesi ~25 sn ([[sohbet-reasoning-fix]]) → her turda
fallback; (2) prompt sohbet kapısında Wanderer'ın CEVABINI "kullanıcının
durum cümlesi" diye sunuyordu — model kullanıcıyı hiç görmüyordu;
(3) tohum `_excerptForSeed` ile ~120 karaktere kesiliyordu. Sessiz fallback
§6.2 (sahte başarı) ve §6.10 (kanıtsız değer) ihlaliydi: uydurma bir ad
kullanıcıya Wanderer'ın yargısı gibi görünüyordu.

**How to apply:**
- Tek tasarım motoru `_designDual(ihtiyac, ctx)` — `gkDesignForChat` onun
  ince sarmalıdır, ikiz motor yazma. Timeout 45 sn (arka planda kimse
  beklemiyor). Altın kurulamazsa **null** döner.
- `_poleHasSubstance`: dört boyutun (düşünce/inanç/duygu/davranış) HEPSİ
  dolu olmalı + başlık. Bu bir güven eşiği değil, madde VARLIĞININ sayımı
  ([[gerceklik-mimarisi]] — modelin öz-beyanı kapı olamaz).
- `gkOnboard(ihtiyac, opts)`: `ihtiyac` EKRANDA görünen kısa alıntı (karta
  da o yazılır, 280 char); modele giden bütün `opts.fullText` (mesajın
  tamamı) + `opts.chatContext` (kullanıcının son 2 mesajı — kartın kökeni)
  + `_userContextFull()` (portre + p6 yaşam hafızası + p5 ilişki derinliği,
  `window.*` üzerinden, 09a import edilmez).
- Bugün kapısında tasarım düşerse **"Ocak soğudu"** sahnesi
  (`_renderForgeCold`, `gk.cold_*`): TEKRAR SÜR / VAZGEÇ. `_fallbackGolden`
  KALDIRILDI. `_fallbackLapis` bilinçli olarak DURUYOR — altın onaylıyken
  töreni yarıda kesmek kullanıcının emeğini çöpe atardı.
- `.ik-emre-cta*` CSS'i SİLİNMEZ: 12e Işık Nişanları chip'i onu paylaşıyor.
- Kota: seans başına 2 sessiz tasarım (`IK_DESIGN_MAX_PER_SESSION`);
  başarısız deneme de sayılır çünkü kota gerçekten harcanır ([[kota-motoru]]).
- Çerçeve akışa GİRMEZ (`::before/::after` mutlak): tasarım ~25 sn sonra
  geldiğinde sayfa zıplamaz. Ekran okuyucu yolu köşe sigilindedir —
  `.msg-body`'ye `role="button"` konursa mesaj metni düğme adı olarak
  okunur ve kaybolur.

İlgili: [[an-karti]] (10A Atölye omurgası) · [[ilham-kartlari-sosyal-feed]]
(10B köprüsünün doğuşu) · [[gerceklik-mimarisi]] · [[uc-ana-renk-lapis]]
(shimmer altın↔lapis) · [[sohbet-canli-dom-korumasi]] (çerçevenin DOM ömrü)
Plan: `.claude/plans/mesajin-arkasindaki-kart.md`
