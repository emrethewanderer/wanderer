---
name: hafiza-koprusu-github-devri
description: "2026-09-05: GitHub'a geçişte protokol taşındı (repoda) ama hafıza taşınmadı (repo dışı); köprü .claude/hafiza/ türevi + hafiza-senkron.sh; hook'lar $CLAUDE_PROJECT_DIR ile taşınabilir yapıldı"
metadata: 
  node_type: memory
  type: project
  originSessionId: d9e9d1f3-9ac8-4340-8a57-74cd44166002
  modified: 2026-09-05T17:12:31.995Z
---

**Lokalden GitHub'a geçişte model doğru çalıştı ama kör çalıştı: çalışma
biçimini biliyordu, geçmişi bilmiyordu.** Sebep tek ölçüde duruyordu —
`PROTOKOL-FABLE.md` (52 KB) repo kökündeydi ve git takipliydi, hafıza ise
`~/.claude/projects/<slug>/memory/` altında (193 dosya + `MEMORY.md`,
1.3 MB) repo DIŞINDAYDI. Protokol taşındı, hafıza taşınmadı; model
`ad-senkronu-kurali` gibi hafıza **adlarını** protokolün konvansiyonundan
türetti — kuralı biliyordu, kuralın uygulanma geçmişini bilmiyordu.

**Why:** Ders `[[tasarim-anayasa-kapisi]]`'nın kardeşidir. Orada öğrenilen
"kapısı olmayan kural tavsiyeye döner"di; burada öğrenilen **"repoya bağlı
olmayan bilgi hiç gitmez"**. Hafıza taşınmazsa `[[bağ]]`lar boşluğa işaret
eder, "bu zaten var" bilgisi kaybolur ve model paralel motor yazar — yani
protokolün 3. temel taşı (§1.3 mevcut olanı yeniden kullan) sessizce ihlal
edilir. Kayıp kod değil, **kararların gerekçesidir**.

**How to apply:**
- Hafızanın tek kaynağı DAİMA `~/.claude/…/memory/`'dir (memory aracı oraya
  yazar). `.claude/hafiza/` onun **türevidir**, ikinci kaynak değil —
  `[[ad-senkronu-kurali]]`'nın "tek ad, tek gerçek" ruhu.
- Köprü: `scripts/hafiza-senkron.sh {disa|ice|fark}`. `disa` `--delete`
  kullanır (yanlışlanan hafıza türevde de ölür), `ice` **kullanmaz** (yeni
  makinede lokalde yazılmış hafızayı ezmez), `fark` kapıdır (çıkış kodu 1).
  Hafıza yolu proje dizininden türetilir: `/` ve boşluk → `-`.
- **Hafızaya yazan tur, kapanışta `disa` koşturur, sonra commit eder.**
  Kural `CLAUDE.md` madde 9'a yazıldı — yani artık kapıya bağlı.
- Hook'lar mutlak yolla yazılırsa başka makinede ÖLÜR. `.claude/settings.json`
  iki Stop kancası `bash "${CLAUDE_PROJECT_DIR:-<eski mutlak yol>}/scripts/…"`
  biçimine çevrildi — fallback bilinçli, env gelmezse eski davranış sürer.
  Kırık hâlinde `[[auto-build-on-stop]]` ve `.claude/DEVIR.md` üretimi
  cloud'da sessizce durur.
- Cloud/GitHub oturumunda **preview elle başlar** (`./scripts/preview-baslat.sh`)
  — `launch.json` süreç başlatmaz, attach eder → `[[preview-sw-bayat-modul]]`.
- Sır taraması yapıldı ve temiz: hafızada anahtar **değeri** yok, yalnız
  secret adları (`LLM_API_KEY`, `OPENROUTER_API_KEY`). Buna rağmen repo
  **private** olmalı — iki kitabın içeriği, persona anayasası ve kararların
  gerekçeleri orada.

Envanterin tamamı (ne gitti / ne gitmedi / ne kırık gitti) ve çalışma
biçiminin taşınabilir özeti repo kökünde: `TASINABILIR-ZEMIN.md`.
Bağlar: [[fable-protokol-belgesi]] · [[auto-build-on-stop]] ·
[[preview-sw-bayat-modul]] · [[tasarim-anayasa-kapisi]] · [[ad-senkronu-kurali]]
