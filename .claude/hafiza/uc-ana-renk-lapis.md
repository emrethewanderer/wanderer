---
name: uc-ana-renk-lapis
description: "Uygulamanın 3 ana rengi (obsidyen/altın/lapis) ve lapis'in anlam ekseni — yeni stil yazarken uy"
metadata: 
  node_type: memory
  type: project
  originSessionId: e5ee853b-218c-4681-b587-28217e9c9302
---

Uygulama 3 ana renk üzerine kuruludur: **obsidyen** (`--bg #0D0A07`), **altın** (`--gold #F5A623`) ve **Lapis Lazuli** (üçüncü, 2026-06-08'de eklendi).

Lapis token ailesi `css/parts/base.css` `:root`'unda: `--lapis #2D5FA8`, `--lapis-bright #5A8AD8` (koyu zemin üstü metin/ikon), `--lapis-deep #182E5C`, `--lapis-dim`, `--lapis-glow`.

**Anlam ekseni (yeni stil yazarken buna uy):**
- **Altın** = kimlik, eylem, günlük disiplin ve özellikle **mühür/ödül doruğu** (her "mühürlendi/elmas" anı altın kalır — tüm uygulamada ortak dil).
- **Lapis** = hayal, vizyon, içsel derinlik (serin kutup). "Hayal" zaten maviyle anılır: `ultra-seri.css --us-hayal` lapis'e hizalandı (#5A8AD8).

Uygulandığı yerler: global `::selection` (lapis-glow); auth giriş ambient'i (altın üst + lapis sol-alt köşe); İç Ses `#icses-page` bölüm etiketleri/çizgisi (sentez.css); Hayal Alemi kimlik öğeleri (CTA, harita başlığı, sahne/kavram glif & kicker) — **tezhip mantığı: lapis içerik + altın çerçeve**, başarı/mühür ekranı altın.

**Mavi birleştirme (2026-06-13):** Uygulamadaki kaymış maviler "Olmak İstediğim Kişi" kartının lapisine hizalandı — tek mavi dili. `cornflowerblue`/`#6495ED`/`rgba(100,149,237,·)` (reflective+socratic koç modu: mod rozeti, koç mesajı, kenar bar, ambient aura, mod flaşı, topbar şerit, `--mode-reflective-color`, Derinlik Aynası "Açılma" halkası), `#4A90D9` (özet olayı), `#5B9BD5` (İç Meclis "çocuk" parçası), `var(--lapis, #6b8cce/cornflowerblue)` fallback'leri, sentez ay glow → hepsi `#5A8AD8` (= `--lapis-bright` / `rgb(90,138,216)`); fallback'ler `#2D5FA8` (= `--lapis`). YENİ MAVİ YAZARKEN `#5A8AD8`/`--lapis-bright` kullan, cornflower'ı geri getirme. KORUNAN (mavi DEĞİL, dokunulmadı): mor örüntü modu (`#A855F7`), hayal/cazibe morları, dawn-indigo ambient, kart artwork holo gradyanları (10q/12b cyan/teal), lapisin açık ucu (`#CBD8F0`/`#7FA6E4`).

Henüz lapis'e geçmemiş ama uygun adaylar: Dinlenme, Geçiş Alanı. İlgili: [[build-source-convention]] (edit css/parts kaynak, build.sh CSS'i JS bundle'a gömer; preview kök URL'den boot etmeli).
