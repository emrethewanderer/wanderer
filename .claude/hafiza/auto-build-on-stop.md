---
name: auto-build-on-stop
description: "Emre build.sh'i elle çalıştırmaz; her tur sonunda otomatik production build (Stop hook)"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 6ddfd8af-58bc-4b93-a2c9-1aa89ceaccd4
---

Emre `bash build.sh` / `npm run deploy`'u elle çalıştırmaz — "seninle kod yazıyorum" diyor, build'in otomatik olmasını istiyor.

Kurulum: `.claude/settings.json` → **Stop hook** → `bash scripts/auto-build.sh`. Script yalnızca `_src.html`/`js`/`css` son build'den (dist/index.html) sonra değiştiyse `build.sh` çalıştırır (find -newer guard), yoksa hızlıca atlar. build.sh dist'i derler + root index.html & assets/'e kopyalar (production).

**Why:** Eskiden PostToolUse(Edit|Write) ile her düzenlemede tam build vardı — turda N düzenleme = N build, yavaş + tazelik yok. Stop hook turda bir kez build eder. **How to apply:** Kod değişikliklerini yap, ekstra build komutu çalıştırma — tur bitince otomatik derlenir. Hook ateşlenmezse kullanıcı bir kez `/hooks` açıp config'i reload etmeli. Preview `dist/` serve ettiğinden bu hook aynı zamanda önizlemeyi de tazeler. [[build-source-convention]] [[feature-gate-door-intro]]
