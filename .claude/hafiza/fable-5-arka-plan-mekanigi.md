---
name: fable-5-arka-plan-mekanigi
description: "Fable 5 arka planda nasıl çalışırdı — 22 oturumun ham kayıt analizi; sıralı tek-eylem ReAct döngüsü, grep→sed keşfi, build+test+preview_eval doğrulama, TaskList+memory \"save state\""
metadata: 
  node_type: memory
  type: reference
  originSessionId: b69c1823-153e-4c2b-a536-eb890e2072c5
---

22 `claude-fable-5` oturumunun (10–15 Haziran 2026) ham JSONL'inden çıkarılan **arka plan çalışma motoru** (4841 asistan mesajı). [[fable-5-calisma-tarzi]] görünür tarzı, bu dosya altındaki sessiz mekaniği anlatır.

**1. Katı sıralı tek-eylem döngüsü (en belirgin imza).** Mesaj blok dağılımı: 2688 mesaj = tam 1 araç + 0 metin; 2152 mesaj = sadece metin + 0 araç; ~0 mesaj ikisini birlikte; **paralel araç çağrısı sıfır** (maks batch=1). Yani ReAct ritmi: gözlemle → (çoğu zaman) tek satır anlat → tek eylem yap → sonucu oku → sonraki. *(Not: bu kısmen Fable döneminin runtime özelliğiydi; gerçekten bağımsız işleri paralel çağırmak daha verimli — ama keşfet-doğrula refleksi aynen taşınmalı.)*

**2. Yüksek anlatım oranı.** 2152 anlatım : 2689 araç ≈ her ~1.25 eyleme bir kısa, şimdiki-zaman, emir-kipi cümle ("Şimdi 10f modülünü yazıyorum:", "Build yeşil. Faz 6 — son regresyon."). Anlatım kendi mesajı olur, hemen ardından tek-araçlık adımlar dizisi gelir.

**3. Bash-önce keşif (771 Bash > 589 Edit > 370 Read).** Bash deyimleri:
- `grep -n <desen> tekDosya` (246) → sonra `sed -n 'A,Bp'` (83) ile o aralığı aç. **grep→sed = "önce konumla, sonra tam isabetle oku"** — büyük dosyayı baştan okumaz.
- `grep -rn` repo geneli (121): kullanım/çağrı yeri/yetim arama, özellikle silmeden önce.
- İmza kalıp: **`echo "=== etiket ==="` ile zincirlenmiş çoklu-grep** — birkaç ilgili aramayı tek komutta etiketli bölümler halinde toplar (tek-eylem döngüsünde tur sayısını düşürür).
- `ls` (75), `cat` (25). `node -e` / `python3 -c` (6): package.json okuma + ölü-kod bloğunu marker'la satır-hesaplayıp cerrahi silme.

**4. Cerrahi düzenleme.** Edit (589) ≫ Write (80). Write yalnız yeni modül/CSS/doküman/memory için; mevcut dosyada hep Edit.

**5. Doğrulama döngüsünün imzası (kapı):** `./build.sh 2>&1 | tail -N` (28) çoğu zaman `&& npx vitest run 2>&1 | tail -N` (16) ile zincirli → build yeşil olmadan ilerlemez. Sonra tarayıcı: **preview_eval (410!)** + screenshot (114) + console_logs (47). preview_eval iş atıdır — canlı DOM/state sorgular, screenshot'a güvenmez (anon/eski-kare olabilir). Faz kapanışı kalıbı: eval×birkaç → screenshot → **"Konsol temiz."** (console_logs) neredeyse zorunlu son kapı.

**6. TaskList + memory = "save state".** 73 TaskCreate / 117 TaskUpdate (~3 oluştur, ~2 update/faz: in_progress + completed). 61 memory yazımı (~3/oturum, hep sona doğru). mark_chapter 8 (sadece büyük faz geçişlerinde). ToolSearch 46 (deferred araçları talep üzerine yükler). **Kritik bağlam:** Fable sık sık oturum limitine takılıyordu ("You've hit your session limit · resets…"); Emre "Continue / Devam et" deyince TaskList + memory'den kaldığı yerden sürüyordu. Görev listesi ve hafıza disiplini bu yüzden kritikti — zorunlu kesintilerde **devam-durumu** onlardı.

**7. Hata kurtarma (dramasız, sebebi adlandırarak):** /tmp dolunca `export TMPDIR=…` workaround; preview anon/eski-kare gösterince "kodla ilgisi yok" teşhisi + eval ile gerçek doğrulama.

**Nasıl uygula:** grep→sed konumlama, etiketli çoklu-grep keşfi, Edit-önce, `build.sh|tail`→vitest→preview_eval→console_logs kapısı, faz başında TaskCreate + bitince memory yazımı. Bunları benimse; tek farkla — bağımsız işlerde paralel araç çağrısı kullan (daha verimli).
