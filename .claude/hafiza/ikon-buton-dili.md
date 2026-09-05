---
name: ikon-buton-dili
description: "İkon-buton ölçek dili (--ikon-* token'ları) + mesaj eylem şeridi: stroke glif sözlüğü, msgRawText tek kaynağı, 44px hedef kaplaması"
metadata: 
  node_type: memory
  type: project
  originSessionId: 217d6db9-213b-436a-93dc-872d53791a97
  modified: 2026-08-03T20:04:07.025Z
---

2026-08-03 sprinti — mesaj eylem şeridinden başlayan denetim
([[ikon-buton-denetimi-karari]] üç kararı) altı fazda uygulandı.
Plan: `.claude/plans/ikon-buton-dili.md`.

**Ölçek token'ları** (`css/parts/base.css :root`): `--ikon-kutu: 32px` ·
`--ikon-kutu-sik: 28px` · `--ikon-glif: 18px` · `--ikon-glif-sik: 16px` ·
`--ikon-hedef: 44px` · `--ikon-radius: 8px`. Yeni ikon-buton yazarken sabit
px yazma, bu token'ları iç. Mühür butonları (`.send-btn` 36, `.nb-seal-btn`
44) bilinçli muaftır; `.kt-ring-btn` ikon değil ilerleme halkasıdır
(TASARIM-PRENSIPLERI: "İlerleme = halka/yay").

**Şeridin mimarisi** (`js/parts/06-summary-chat.js`):
- `FB_GLIF` — glif sözlüğü, yalnız geometri taşır. Kalınlık/uç CSS'te tek
  yerde (`.fb-btn svg`: `fill:none; stroke:currentColor; stroke-width:1.8`).
- `fbBtnHTML(glif, cagri, baslik, ek)` — tek buton üreticisi; `type="button"`,
  `title`, `aria-label`, `aria-hidden` glif buradan gelir. Eskiden on buton
  elle yazılıyordu.
- `msgRawText(btn)` (export) — ham metnin **tek kaynağı**; balonun
  `_rawText` JS property'sinden okur. Yazan iki yer: `_createMsgEl` ve
  streaming `finalize`. 07 ve 10z bunu import eder.
- `fbSonEylemleriTazele()` — `data-son` işaretli eylemler (Yeniden üret /
  Tekrar dene) yalnız son mesajda kalır; `appendMsg` ve `finalize` çağırır.
- `_yanitiYenidenUret(emreEl, {asistanSart})` — "Yeniden üret" ve
  "Tekrar dene"nin ortak gövdesi.

**Üç GOTCHA (bu sprintte ölçüldü):**
1. **`data-content` ölüdür.** Ham metni HTML niteliğinde taşımak iki sessiz
   kırık üretir: nitelik yazarken `\n → ' '` düzleşir (çok paragraflı yanıt
   tek satır kopyalanır) ve HTML parser değeri çözdüğü için ikinci bir
   `&quot;` çözmesi metni bozar. Metni DOM niteliğine koyma — JS property
   kullan. Kapı: `tests/msg-serit-metin.test.js`.
2. **Yerinde yenilemede DOM ile hafıza birlikte düşer.** Balon silme
   `lastAssistantIdx !== -1` bloğunun İÇİNDE olmalı; dışına çıkarsa araya
   yanıtsız bir kullanıcı mesajı girdiğinde balon ekrandan gider ama
   `S.chatHistory`'de kalır, geçmiş yüklemesinde geri gelir. Öz-denetimde
   yakalandı, tersine sınamayla (düzeltmeyi geri alıp testi kırmızıya
   düşürerek) doğrulandı.
3. **`opacity:0` şerit klavye tuzağıdır.** Hover'da görünen bir şeride
   tab'lanan buton odaklanır ama görünmez. `:focus-within` ile
   opaklığı 1'e çek — `:focus-visible` halkası tek başına yetmez.

**Doğrulanan ölçüler** (canlı preview): şerit butonu 18×18 → **28×28**,
glif 10/12 → **16**, iki mesaj türünde tek ölçek; dikey dokunma hedefi
`::after` (`top/bottom:-8px, left/right:-1px`) ile **43px** ölçüldü ve
`elementFromPoint` ile komşunun kenarını ÇALMADIĞI kanıtlandı — yatay
taşmanın dar olması pazarlık konusu değil ([[dokunma-hedefi-gorsel-bosluk]]).

**Why:** Şerit uygulamanın tek "yarım ölçek" adasıydı ve dört ayrı metin
okuma yolu taşıyordu; ölçü de metin de tek kaynağa indi.
**How to apply:** Yeni bir mesaj eylemi eklerken `FB_GLIF`'e glif + tek
`fbBtnHTML` satırı yeter; metni `msgRawText(btn)` ile oku, asla nitelikten.
Bağlar: [[claude-tarzi-gorsel-dil]], [[sohbet-cekirdek-kontrol]],
[[kart-gorsel-dili]].
