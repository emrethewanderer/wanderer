---
name: i18n-bundle-bolme
description: "Extended dil sözlükleri ana bundle'dan ayrıldı — build mekaniği + IIFE/inlineDynamicImports tuzağı"
metadata: 
  node_type: memory
  type: project
  originSessionId: 38301532-16c7-470d-a0ea-e687ce9940da
---

2026-06-26: İlk yükleme boyutunu düşürmek için TR/EN-dışı 11 dilin sözlükleri ana bundle'dan çıkarıldı. **İlk yükleme 838 KB → 682 KB gzip (~%19 az)** TR/EN çoğunluğu için; ext asset'leri (i18n-ext 72KB + prompt-i18n-ext 105KB gzip) yalnız o dil seçilince yüklenir.

**Tuzak (kök neden):** `15b-i18n-dict-ext.js` ve `16b-i18n-prompt-dict-ext.js` zaten `import()` ile lazy-load'a yazılıydı AMA `vite.config.js` `format:'iife'` → `inlineDynamicImports:true` ZORUNLU (file:// native CORS için, bkz [[build-source-convention]]) → IIFE kod bölemez → dinamik import bundle'a GÖMÜLÜR. Yani lazy-load niyeti build'de boşa çıkıyordu.

**Çözüm mimarisi:**
- `build.sh`: vite sonrası iki esbuild adımı ext dosyalarını ayrı minified IIFE global olarak `$TMP/assets/`'e üretir (`--global-name=__I18N_EXT_NS__` / `__PROMPT_I18N_EXT_NS__`, `.I18N_EXT` / `.PROMPT_I18N_EXT` ile erişilir). Atomik takastan önce yazılır.
- `00a-infrastructure.js` `loadExtScript(fileName)`: `<script>` tag enjeksiyonu (ESM değil → file://-güvenli). URL'i ana bundle script'inden türetir (`script[src*="_src-"]` → aynı klasör + `?v=<bundlehash>` cache-bust). Built bundle yoksa (dev) false → ESM fallback.
- `15-i18n._loadExtended` / `16-i18n-prompts._loadPromptExtended`: önce loadExtScript, başarısızsa `import(/* @vite-ignore */ computedSpec)` (computed string → vite GÖMMEZ; dev ESM yolu). Kaynak ext dosyaları silinmedi (dev fallback için durur).

**İki kritik düzeltme (ext artık ağdan async geldiği için, eski inline-microtask değil):**
1. `_loadExtended` sonunda `applyTranslations()` yeniden çağrılır — yoksa boot'ta TR fallback basılıp öyle kalıyordu.
2. Prompt prefetch'i module-init'te DEĞİL, dil çözüldükten sonra tetiklenir (`_maybePrefetchPrompt`: hemen + `i18nchange` + DOMContentLoaded). Sebep: erken bir modül (`00-config-tracking` `p`'yi import eder) 16'yı initI18n'den ÖNCE init eder → `S._currentLang` hâlâ 'tr' → prefetch atlanırdı. `p()` on-demand çağrısı güvenlik ağı.

Doğrulandı: Almanca ana bundle'dan düştü (grep 13→0); TR boot ext yüklemiyor + konsol temiz; de boot ilk boyamada Almanca + iki ext de yükleniyor; 401 test geçti. Sonraki aday: `16c-i18n-detect-dict.js` (60K, statik import, sync `dp()` kullanımı → daha riskli). prompt-**core** (176K) client'ta gerçekten kullanılıyor ([[persona-server-side]] yalnız system_prompt'u sunucuya alır) → silinemez. [[sistem-saglik-taramasi]] bundle bütçe riskini kısmen kapatır.
