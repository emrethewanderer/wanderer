---
name: arac-motoru-vision-kaynakca
description: "Faz 3.3+4+5 — araç motoru (13a), Çalışma Kağıdı artifact (13b), vision client (13c), kaynakça, SETUP-LLM-CHAT.md"
metadata: 
  node_type: memory
  type: project
  originSessionId: 479c37c5-92b6-450d-a687-6d4dd7a2639f
---

LLM-boşluk planının son fazları (2026-06-10) tamamlandı — plan KAPANDI.

- **Araç motoru (13a-arac-motoru.js)**: function calling'in sunucusuz Wanderer karşılığı — mode-tag kalıbının uzantısı. LLM yanıt SONUNA blok ekler: `[ARAC:soz|not|gecis]{json?}`, `[KAGIT]{"kavram":...}`, `[TAKIP]a|b[/TAKIP]`. `aracExtract` "ilk işaretçiden sonrası protokol bölgesi" yaklaşımı (kesik blok/bozuk JSON ekrana sızmaz; 8 senaryoluk node simülasyonuyla doğrulandı). 06 _runLLMTurn dikişi: rehber `window.aracPromptGuide()` (16b `prompt.arac.guide` TR+EN) systemPrompt'a; bloklar finalize/history/DB'den sıyrılır; `aracAfterReply` chip/kart/pil çizer. Araçlar ASLA sessiz yürümez — onay chip'i; veri chip dataset'inde (çoklu chip karışmaz). Yanıt salt-bloksa balon '✦'. Takip pili: llm-home'da chat-input'a, sohbette icOpen→ic-textarea'ya yazar; eski takip satırları yeni yanıtta temizlenir. + taslak kalıcılığı (localStorage etw_draft_chat/ic, cihaz-yerel).
- **Çalışma Kağıdı (13b)**: 09b'de UI'sız duran altyapıyı kapatır — `dfGetWorksheetTemplate/dfRecordWorksheet/dfGetWorksheetSessions/dfDeleteWorksheetSession` exportlandı (9 kavram: standart/hak_etmek/normal/layik/oz_*/bolluk). Kart: YAZ→HAYAL ET→OLUMLAMA + MÜHÜRLE (adım 1 boşsa engellenir); arşiv mem-panel "ÇALIŞMA KAĞITLARIN" bölümünde (sil destekli).
- **Vision client (13c)**: ataç butonu composer + Ritüel Kartı (`.ws-attach-btn`, `.gorsel-host` çift önizleme alanı); createImageBitmap + Image fallback; 1280px/JPEG 0.82; `chat-images` bucket'a yükler; gönderimde `sendMessageHooks.before` ile mesaja `![görsel](url)` ekler (06 API'sine dokunmadan, icSend yolundan da çalışır). safeMarkdown'a img allowlist; CSP img-src'ye `https://*.supabase.co` (mevcut avatar render'ı için de gizli düzeltmeydi).
- **Kaynakça**: 04 callLLM `X-Wanderer-Sources` header (encodeURIComponent'li JSON) → `S._lastBookSources` → 13a mesaj altında kitap chip'i + pasaj. Header yoksa sessiz.
- **SETUP-LLM-CHAT.md (ELLE)**: bucket SQL+RLS; llm-chat vision yaması (son user mesajındaki görsel markdown→multimodal + `VISION_MODEL` geçişi); sources header (+`Access-Control-Expose-Headers` ŞART); DELETE RLS hatırlatması. Yamasız hiçbir şey kırılmaz.
- Derin inceleme düzeltmeleri: chip-başına araç verisi; takip-sohbet köprüsü; regenerate'te `.arac-after` öksüz temizliği; kesik blok dayanıklılığı; salt-blok yanıt; Safari decode fallback.
- NOT: preview tarayıcısı dil=en algılar (16c auto-detect) — rehber/şablonlar EN görünür, TR cihazda TR. İlgili: [[sohbet-cekirdek-kontrol]], [[hafiza-paneli-drawer-arama]], [[ses-katmani-dikte-okuma]].
