---
name: kitaplik-sozu-ve-toast-kapilari
description: "Wanderer LLM ana ekranında kişiselleştirilmiş Kitaplık çipi (4. starter) + Studio kk-toast; tıkla→Kitaplık portali (highlight)→kapanışta alıntı sohbete"
metadata: 
  node_type: memory
  type: project
  originSessionId: 9a08acc5-31c9-4517-aeaf-c318c6b44d54
---

İki ayrı giriş yüzeyi, iki yüz (ön=Wanderer LLM/#chat-view, arka=Studio):

**Studio toast (10q kk-toast)** — "✦ N kişi koleksiyonunda seni bekliyor". Artık YALNIZ Studio'da çıkar: `kkBackfill` toast'ı ertelemeli yapar (`_introToastCount`), `_inStudio()` (`.view.active`≠`chat-view`) kapısı + `switchViewHooks.after(v≠'chat')` kancası Studio'ya geçişte sunar; `seenIntro` ancak sunulunca mühürlenir. (Eskiden boot'ta ön yüzde patlıyordu.)

**Wanderer LLM Kitaplık çipi (10g)** — Studio kk-toast'ının ön-yüz karşılığı; 2026-06-22 toast olarak eklendi, **2026-06-23 yeniden tasarlandı: artık #llm-starters'a 4. starter olarak iliştiriliyor** (toast tamamen emekli — `_ensureSozStyles`/`_sozToast` SİLİNDİ). Mevcut `.llm-starter` sınıfı birebir kullanılır → tasarım dili 3 model starter'ı ile aynı; ayırt edici tek detay: glyph `❝` (✦ değil), text bloğunda italik alıntı + altta küçük altın Cinzel kaynak satırı (`EMRE'NİN KİTAPLIĞI · {TITLE}`, inline style — sadece bu meta satır için, hepsi base.css token).
- **Akış:** `_sozPick()` (kişiselleştirme) → `_sozPickCache` (modül-private, idempotent) → `libAttachKitaplikStarter()` her `llmRenderHome`'da 4. çipi bağlar (animation-delay nth-child(4) zaten CSS'te tanımlı).
- **Tetik:** 10y `_maybeKitaplikSoz()` (1.5sn gecikme) ilk kez cache doldurur; 10y `llmRenderHome` sonunda her seferinde `window.libAttachKitaplikStarter?.()` çağırır (idempotent: `[data-kitaplik-soz="1"]` kapısı).
- **Kişiselleştirme (tamamen istemci-tarafı, edge fn YOK):** needles = en zayıf temel (`S._foundationsProfile` → `_SOZ_THEMES`) + `S._userProfile.core_issue/goal/pattern` token'ları + `window.imGetCurrent()` kimlik adı → `S.knowledgeItems` skorla (başlık×3/gövde×1) → en iyi 3'ten günlük-rotasyonla yazı seç → gövdeden temiz cümle çek (regex lookbehind YOK, WebKit-uyumlu).
- Emre kararı (AskUserQuestion): kürate banka/LLM değil → **canlı Kitaplık'tan alıntı**.

**Tıklama akışı — Kitaplık portali → kapanışta sohbete gönder (2026-06-23):**
- `libKitaplikStarterOpen()` (window'a expose) → `libOpenReader(idx, soz, onClose)` ile portal açar.
- **Portal callback:** `libOpenReader(startIdx, highlight, onClose)` — onClose `portal._onClose`'a iliştirilir, `_libRenderReader.close()` içinde **kapanış animasyonu (280ms) bittikten sonra** tek-atış çağrılır (Escape/✕ butonu ikisi de aynı yol).
- **Highlight:** `_libRenderReader(..., highlight)` → `_libBodyHTML(content, highlight)` → `_libHlRegex` (esnek-boşluklu + sondaki `…` kırpan, min 12 char guard) → ham metinde gövdede **TEK kez** `<mark class="lib-hl">` sarar (`hlState.done`); `scrollIntoView({block:'center'})` ortalar, `.lib-hl--flash` ile geçici altın `libHlReveal` animasyonu (2.9sn, sönümlenir, `box-decoration-break:clone` ile çok satırlı sarmalama düzgün) + `fxCue('tap')`. Stil JS-enjekte `#lib-hl-styles` (reduced-motion bloğu). ÖNCEKİ/SONRAKİ ile geçişte highlight taşınmaz (söner).
- **Portal kapanışı → mesaj:** onClose → `window.llmSendStarter(soz)` (10y yeni export; main.js expose bloğunda) → `_homeDismissed=true` + composer'a yazıp `sendMessage()` (mevcut `llmStarterSend`'ın indeks-bağımsız kardeşi; eski `llmStarterSend` artık `llmSendStarter`'ı çağırıyor → DRY).
- Sonuç: kullanıcı 4. çipe dokunur → üstüne Kitaplık portali highlight'lı açılır → ✕/Escape ile kapatınca alıntı **kullanıcı mesajı olarak sohbete gönderilir** → asistan cevap verir; LLM araç motoru otomatik "KİTAP ALINTISI" `ws-ctx-lesson` bağlam kartını da koyar.

İlgili: [[kisilerim-kart-motoru]] (kk-toast kökeni), [[vasita-banner-kitaplik-haberi]] (Kitaplık + _checkWandererAnnounce), [[dil-modeli-kabugu]] (ön/arka yüz), [[gunluk-ritus-armagan-soz]] (10s GL_GIFTS = foundation-keyed Kitaplık sözü paraleli), [[kimlik-motoru]] (imGetCurrent).
