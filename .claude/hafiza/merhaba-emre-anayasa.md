---
name: merhaba-emre-anayasa
description: "Kişilik sekmesinde serbest System Prompt kaldırıldı; yerine 'Merhaba, Emre' — kitaplardan damıtılmış 15 bölümlük kimlik anayasası (07 modülü); yayında tek belge olarak admin_settings.system_prompt'a birleşir"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0e7600d5-1f29-43b6-b8eb-7c66d1c21081
---

**Merhaba, Emre — Kimlik ve Davranış Anayasası** (2026-07-02). Kişilik sekmesindeki serbest "System Prompt" textarea'sı (`p-system`) emekli edildi; yerine [[emre-kitaplari]]'ndan damıtılmış **15 bölümlük** açılır-kapanır besteci geldi (Identity & Core Purpose → Evolution & Adaptation Clause; Emre'nin verdiği İngilizce şablon başlıkları TR+EN etiketli).

**Why:** Emre'nin nasıl davranacağı tek serbest metin yerine kitap-temelli yapılı bir anayasadan yönetilsin; her bölüm ayrı düzenlenebilir olsun.

**How to apply:**
- Kod: `js/parts/07-settings-knowledge.js` — `ME_SECTIONS` (15 bölüm, `def` alanları kitap-temelli varsayılan içerik), `renderMerhabaEmre()` (kb-item kalıbıyla açılır-kapanır UI; `#merhaba-emre-host`), `meAssembleDoc()` (yayın belgesi; boş bölüm atlanır), `_meParseDoc()` (kayıtlı belgeyi `## N.` başlıklarından ayrıştırır; marker yoksa null → varsayılanlar gösterilir). `meToggle`/`renderMerhabaEmre` main.js window hub'ında.
- Depolama DEĞİŞMEDİ: birleşik belge `admin_settings.system_prompt`'a yazılır → sunucudaki `llm-chat` persona katmanı ([[persona-server-side]]) hiçbir değişiklik gerektirmedi; savePersona'daki cache invalidation korunur. Migration yok.
- Belge formatı: `# MERHABA, EMRE — Kimlik ve Davranış Anayasası` + `## N. TR Başlık (EN Başlık)` bölümleri — parse bu desene bağlı, başlık formatını bozma.
- Testler: `tests/07-settings-knowledge.test.js` — render/parse/legacy-fallback + assemble→parse gidiş-dönüş (6 test).
- İçerik kaynağı: [[iliski-felsefesi-ozet]] + [[zihniyet-devrimi-ozet]] + [[kitap-sesi-manevi-register]]; manevi katman bölüm 9'da açıkça "sekülerleştirme YASAK" olarak kodlandı.
