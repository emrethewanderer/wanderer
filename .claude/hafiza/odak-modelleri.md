---
name: odak-modelleri
description: "10w modülü — WANDERER MODELLERİ: Öz/Bağ/Eser (dil modeli kimliği); wanderer_models tablosu (mig 013) + admin Model Stüdyosu; legacy individual/relationship/work/general eşlemesi"
metadata: 
  node_type: memory
  type: project
  originSessionId: 1468ee37-a571-41dd-b9fc-fe45a0e6cbf2
---

**Wanderer Modelleri** (10w-w2-odak-modelleri.js) — 2026-06-10 "dil modeli" dönüşümüyle
eski 4'lü Odak Modelleri yerine **3 model**: `oz` (Wanderer Öz · Bireysel hayat ◆),
`bag` (Wanderer Bağ · İlişki hayatı ❖), `eser` (Wanderer Eser · İş hayatı ▲).
Genel modeli KALDIRILDI; varsayılan = DB'de `is_default` (seed: oz). Kabuk/flip için bkz [[dil-modeli-kabugu]].

- **Depolama:** `wanderer_models` tablosu (migration 013, elle uygulanmalı; public read + admin write). Alanlar: display_name, version_label, tagline, description, glyph, system_prompt, knowledge, greeting ({{name}} destekli), starters (jsonb), params (jsonb: temperature/max_tokens), is_enabled, is_default, sort_order. Tablo yoksa focus_models (010) promptlarına graceful fallback (`S._wandererModelsSource`).
- **Legacy eşleme:** `LEGACY_MAP` individual→oz, relationship→bag, work→eser, general→oz — SafeStorage `wanderer_focus_model` eski değeri ve geçmişteki `fmswitch:<eskiId>` ayraçları için. fm* fonksiyon adları/prefix korunmuştur (main.js expose aynı).
- **Enjeksiyon:** `buildFocusModelContext()` → `<focus_model>` bölümüne model kimliği + `<model_davranisi>` (system_prompt) + `<model_bilgi_tabani>` (knowledge); ikisi de boşsa ''. Client tarafı (Edge Function'a dokunulmadı — [[persona-server-side]]).
- **Parametreler:** `fmActiveParams()` → 06-summary-chat ana çağrıda temperature (yoksa mod-bazlı 0.65–0.85) ve max_tokens (yoksa TOKEN_LIMITS) önceliği.
- **Seçici (2026-06-11 popover'a dönüştü):** composer'daki `#cl-model-pill` (ön yüz) + ritüel kartı ayağındaki `#ic-models-toggle` → **`#fm-pop`** küçük popover pencere (Claude Code'un model menüsü gibi; eski alttan-açılan `#fm-sheet` SİLİNDİ). Tetikleyenin üstüne demirlenir (fmOpenPicker konumlar; sığmazsa altına düşer), satırlar kısa ad + eksen + ✓; görünmez backdrop tıkı / Esc kapatır (`_fmPopEsc`). Markup body-level (_src.html, ic-overlay'den sonra; z 7000), stiller chat.css `.fm-pop-*`. **Kısa ad:** `fmShortName()` "Wanderer " önekini kırpar — composer pili "Öz/Bağ/Eser" yazar (tam ad selam altındaki model satırında zaten var); ic-models-label tam ad kalır.
- **Admin → "Model Stüdyosu"** (switchAdmin 'focus' → renderFocusModelsAdmin): model başına açılır kart (.mst-*) — Kimlik / Davranış-Sistem Promptu / Bilgi Tabanı / Karşılama+Başlatıcılar / Üretim Parametreleri / Durum (aktif+varsayılan radio). saveFocusModels → upsert; en az bir aktif + bir varsayılan garanti edilir.
- **MODEL İNŞAASI (2026-07-02, mig 028 ELLE):** 3 modelin tüm içeriği kitaplardan damıtılıp `migrations/028_model_insaasi.sql` upsert'iyle dolduruldu — Öz←Zihniyet Devrimi omurgası (Manifesto 12 özü, Geçiş Protokolü + kanonik olumlama verbatim, Kendinle Konuşmak, çerçeve kataloğu), Bağ←İlişki Felsefesi omurgası (tez verbatim, Hayatlar/Denklem/Vasıta, Derinlikler 4'lüsü nüanslı, Temeller+Bolluk, Alan Bilgisi %20, Çalışma Kağıdı, kapanış 5 karar), Eser←iki kitabın iş ekseni (Özel Prensipler, orman/yöntem/kişi teşhis sırası, amaç/İSTEMEK, Süper Odak/Ko-Zo/7 Tuzak, değerlendirme disiplini, toplum boyutu). Her modelde system_prompt=eksen davranışı (temel kimlik "Merhaba, Emre" anayasasında — çift yazılMADI), knowledge=eksen bilgi tabanı, greeting+4 starter; params bilinçli BOŞ ({} → 06 mod-bazlı ısı + 04 reasoning payı korunur). İdempotent; Stüdyo'dan sonradan düzenlenebilir.
- **Eksen ayrımı sürüyor:** "Modeller" (elle) ≠ "Modlar" (AI_MODES otomatik). fmswitch satırları LLM contents'inden filtrelenir.
- **2026-07-03 fix (final hâli):** `greeting` alanı (mig 028'de dolduruldu) saate göre sabit selamın YERİNE geçiyordu → `fmGreetingText` artık HER ZAMAN saat-bazlı. Modelin özel cümlesi `fmInputPlaceholder(userName)`'den gelir ve 10y `llmRenderHome()` bunu ana ekran composer'ının **`#chat-input.placeholder`'ına** yazar (`"Wanderer'a yaz…"` yerine) — ayrı bir satır DEĞİL. Detay + placeholder-yüksekliği ölçüm hack'i: [[dil-modeli-kabugu]].
