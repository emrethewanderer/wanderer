---
name: preview-sw-bayat-modul
description: "Preview'da 'diskte doğru, ekranda eski' sınıfının kökü kapatıldı (2026-08-17): tek origin localhost:3030 + no-store sunucu + /sw.js kill-switch. Yeni port açmak ARTIK YASAK — eski reçeteydi, yanlışlandı"
metadata:
  node_type: memory
  type: project
  originSessionId: b709e692-0f0e-4f16-8597-f214f685635e
  modified: 2026-08-17T17:52:00.098Z
---

## ✅ KÖK ÇÖZÜM (2026-08-17) — önbellek artık HİÇ doğmuyor

Preview **tek origin**'dir: `http://localhost:3030`. İki adım:

```
./scripts/preview-baslat.sh          # idempotent — ayaktaysa dokunmaz
preview_start({ name: 'wanderer' })  # süreç başlatmaz, ayakta olana bağlanır
```

`scripts/preview-server.mjs` her yanıta `Cache-Control: no-store` basar ve
**`ETag`/`Last-Modified` göndermez** — tarayıcıda ne doğrulama koşulu ne de
sezgisel tazelik girdisi kalır. `/sw.js` gerçek Service Worker yerine
kill-switch servis eder (kaydı söker, cache'leri siler). Kapı:
`tests/preview-sunucusu.test.js` (9 test). `dist` için ikinci origin:
`./scripts/preview-baslat.sh 3031 dist` + `wanderer-dist`.

**Üç kök neden, üçü de kapandı:**

1. **HTTP önbelleği (asıl suçlu).** Eski düzen `python3 -m http.server` idi ve
   o sunucu `Cache-Control` HİÇ göndermez, yalnız `Last-Modified` gönderir.
   Tarayıcı bundan sezgisel ömür türetir: `(şimdi − Last-Modified) × 0.1`.
   Ölçüldü (2026-08-17): `js/state.js` 23 gün önce değişmişti → ≈**2.3 gün**
   boyunca "taze" sayılıp sunucuya hiç sorulmuyordu. Harness'lar hash'siz ham
   kaynağı (`/js/parts/*.js`) import ettiği için kaçış yolu da yoktu.
2. **Service Worker.** `14-boot.js`'in localhost sökümü yalnız ANA UYGULAMA
   boot ederse çalışır; harness sayfaları 14-boot'u import etmez, yani o kökte
   kalmış bir kayıt harness'ı sonsuza kadar bayat servis ederdi. Kill-switch bu
   boşluğu kapatır.
3. **Origin kaçışı.** Çare diye her seferinde yeni port açılmıştı:
   `.claude/launch.json` 22 girdiye, portlar 5176–5194 aralığına şişti. Her
   yeni origin bir preview penceresi daha, her açılış sıfırlanmış oturum
   demekti. launch.json 2 girdiye indirildi.

**⛔ YANLIŞLANAN REÇETE.** Bu dosya 2026-08-07'ye kadar "SW'yi temizle ve
**yeni porttan aç** (`root-test-5177`, `-5178`…), port değiştirmek tek kesin
yoldur" diyordu. Artık yanlış: port değiştirmek semptomu gizler, önbelleği
kapatmaz ve pencere biriktirir. Önbellek şüphesinde **yeni port açma** — zaten
no-store; şüpheyi canlı sorguyla sına.

**Sunucu neden kabuktan başlıyor?** `preview_start`'ın sandbox'ı repo içindeki
bir `.mjs`'i açamıyor (`EPERM`, node ESM loader) — aynı sınıf `npx vite` için de
kayıtlı (bkz. [[preview-harness-anon-oturum]]). Bu yüzden sunucuyu kabuk
başlatır, `launch.json` girdisi komutsuzdur ve yalnız `url` ile **attach** eder.

**Why:** Bayat modül, §3.3'ün "preview'da canlı doğrulama" kapısını sessizce
sahte-yeşile çevirir — hata türlerinin en tehlikelisi, çünkü yeşil görünür.
Bir kez bir saat, bir kez bütün bir turu yedi.

**How to apply:** Beklediğin değişikliği preview'da göremiyorsan koda dönüp
ayar aramadan ve YENİ PORT AÇMADAN önce: ① sunucu bu sunucu mu
(`curl -sI localhost:3030/js/state.js` → `no-store` görünmeli), ② çalışan modül
gerçekten eski mi (`/desen/.test(window.xFn.toString())`). İkisi çelişiyorsa
teşhis kodda değil kabukta — sunucuyu yeniden başlat.

Bkz. [[preview-harness-anon-oturum]] · [[build-source-convention]] ·
[[auto-build-on-stop]] · [[yuz-cizgisi-motoru]]
