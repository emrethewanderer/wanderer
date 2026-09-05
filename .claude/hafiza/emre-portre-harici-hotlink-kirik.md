---
name: emre-portre-harici-hotlink-kirik
description: "Emre'nin portresi eskiden tek bir harici hotlink'e (hizliresim.com) bağlıydı — 2026-07-24'te 404 oldu, ÇÖZÜLDÜ: artık proje-içi statik asset (public/emre-portre.png)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 408d955c-2b0d-41a1-8a32-29f86ac3f858
  modified: 2026-07-24T14:45:53.180Z
---

**ÇÖZÜLDÜ (2026-07-24).** `js/config.js` — `EMRE_IMG` — Emre'nin portresinin göründüğü
HER yerin (topbar avatar, `.wns-portrait` oval çerçeve, `.ic-emre-portrait`, mektup cameo,
session-hero, announce-sheet-seal, push bildirim icon/badge — ~12 çağıran, `grep -rn
EMRE_IMG js/`) TEK kaynağıydı ve eskiden harici bir hotlink'ti
(`https://i.hizliresim.com/dc6faqr.png`). 2026-07-24'te bu link **404** vermeye başladı
(üçüncü parti host kaldırmış) → fotoğraf UYGULAMA GENELİNDE aynı anda kayboldu (tek nokta
arızası). Emre gerçek fotoğrafını verdi (`emrethewanderer.png`, 512×512 PNG, profilden,
yeşil palto) → artık **proje-içi statik asset**: `EMRE_IMG = 'emre-portre.png'`.

**Mimari (icon-192.png ile AYNI dual-copy deseni, build.sh'ye bakılarak çıkarıldı):**
dosya HEM proje köküne (`emre-portre.png` — Vite'ın `_src.html`'deki 4 statik `<img
src="emre-portre.png">` etiketini hash'leyip `assets/emre-portre-<HASH>.png`'ye
gömmesi için kaynak) HEM `public/emre-portre.png`'ye (Vite'ın publicDir passthrough'ıyla
`dist/emre-portre.png`'ye ham kopyalanması için — JS'teki literal string `EMRE_IMG`
referansı Vite'ın asset pipeline'ından GEÇMEZ, sadece gerçek bir dosyaya işaret etmesi
gerekir) konuldu. `build.sh`'nin kök-statik-hosting kopya satırı (`cp dist/icon-192.png
dist/icon-512.png .`) `dist/emre-portre.png`'yi de içerecek şekilde genişletildi — yoksa
kök-mirror deploy yolunda (Capacitor/statik hosting DIŞI) JS tarafı kırık kalırdı. CSP
`img-src`'den `https://i.hizliresim.com` kaldırıldı (artık hiçbir çağıran kullanmıyor).

**Why:** Harici hotlink'ler (hizliresim.com gibi ücretsiz resim host'ları) süre/kota
sınırıyla kaldırılabiliyor — kanıtlandı. Proje-içi asset bu riski taşımaz.

**How to apply:** Fotoğraf DEĞİŞTİRİLECEKSE: (1) yeni dosyayı hem proje köküne hem
`public/`'a `emre-portre.png` adıyla koy (ikisi de aynı byte'ları taşımalı — `md5 -q`
ile doğrula), (2) `./build.sh` çalıştır (kök `assets/emre-portre-<HASH>.png` VE kök
`emre-portre.png` otomatik güncellenir). `js/config.js`/`_src.html` değişmesine GEREK
YOK (dosya adı sabit kaldı). İlgili: [[emre-foto-oval-cerceve]],
[[taahhut-dongusu-hesap-gunu]] (aynı denetim turunda bulundu).
