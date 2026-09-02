---
name: bagsiz-ad-kapisi
description: bagsiz-ad-denetci.mjs vite'ın IIFE build'inin gizlediği "bundle'da çalışan, kaynakta olmayan ad" sınıfını gerçek tsc scope analiziyle yakalar
type: mimari
---

# Bağsız ad kapısı — ölçü build'in geçmesi değil, kaynağın ReferenceError vermemesi

`scripts/bagsiz-ad-denetci.mjs` + `tsconfig.bagsiz-ad.json` +
`tests/bagsiz-ad-kapisi.test.js` (2026-08-21).

**Why:** Vite'ın IIFE build'i tüm modülleri TEK scope'a düzleştirir (scope
hoisting). Bir modül başka bir modülün fonksiyonunu import ETMEDEN çıplak
çağırırsa (`generateHomework()` gibi), bundle'da o ad — başka bir modülün
aynı isimli fonksiyonuna — tesadüfen çözülür ve ürün ÇALIŞIYOR görünür.
Aynı satır kaynak ES modülü olarak koştuğunda (vitest, dev sunucusu,
doğrudan import) ReferenceError'dır. `./build.sh` bu kırığı YAKALAMAZ —
ölçüldü: kasten eklenen bağsız bir adla build exit 0 verdi ve ad bundle'a
olduğu gibi girdi. Kırık, build'in ve gözün göremediği tam o boşlukta durur.

Tarama açıldığında (2026-08-21) 56 vaka, 26 ayrı ad bulundu. Üçü ağırdı:
- `06:requestChatExit` → `saveSessionPatterns` / `generateHomework` /
  `updateTrackProgress` üçü de bağsızdı. `Promise.resolve(f())` kalıbında
  hata ARGÜMAN değerlendirilirken atılır — `.catch()` onu YAKALAYAMAZ.
- `10n:_obRender` → `OB_STATIONS` hiç tanımlanmamıştı; kullanıcı
  "Başla"ya bastığı an Dinlenme onboarding'i sessizce ölüyordu.
- `07:loadSettings` → `WHATSAPP_COMMUNITY_URL`'e ATAMA yapılıyordu; ES
  modülleri daima strict, tanımsıza atama da ReferenceError'dır.

**How to apply:**
- Gerçek scope analizini TypeScript yapar (`checkJs: true` ile,
  `tsconfig.bagsiz-ad.json`). Elle regex bu işi çözmez — blok scope,
  hoisting, destructuring, catch parametresi, sınıf alanları hepsi kural
  ister; denetçi `tsc`in TS2304/TS2552 ("Cannot find name… bunu mu demek
  istedin?") çıktısını ayrıştırır.
- `types/globals.d.ts` tarayıcı köprülerini `interface Window { ... }` ile
  beyan eder, `declare var` İLE DEĞİL — bu kasıtlıdır ve kapının çalışma
  ŞARTIDIR: `declare var` yazılırsa çıplak `foo()` sessizce meşrulaşır ve
  kapı kendi kendini köreltir.
- İhlali düzeltmenin tek yolu adı GERÇEKTEN import etmektir (ya da adı
  hiçbir yerde tanımlı değilse çağrıyı sökmektir) — "bundle'da çalışıyor"
  bir gerekçe değildir.
- **Sınırı (dürüstçe):** bu kapı ADIN ÇÖZÜLÜP ÇÖZÜLMEDİĞİNİ sorar, doğru
  adın çağrıldığını ya da doğru ZAMANDA çağrıldığını değil. `window.foo?.()`
  biçimindeki köprüler buradan GEÇER — optional chaining `tsc`e göre de
  geçerlidir; karşı ucun (`foo` hiç expose edilmiş mi) sorusunu kardeş
  denetçi `scripts/yetim-kopru-denetci.mjs` sorar.
- [[kapi-tarama-yarisi]]'nin aksine bu denetçi `js/`i kendi `readdirSync`iyle
  GEZMEZ — dosya seçimini `tsc`e (tsconfig `include`) bırakır. Yani o
  yarışa AÇIK DEĞİLDİR; T7'nin geçici modülü yazılıp silinirken bu denetçi
  çökmez.
- Kullanım: `node scripts/bagsiz-ad-denetci.mjs` (denetle, ihlalde exit 1) ·
  `--liste` (yalnız raporla, exit 0) · `--config X` (başka tsconfig
  profiliyle tara — kapının kendi öz-sınaması geçici bir dizinde kasti
  bağsız ad yazıp bunu kullanır, exit 1 bekler).

İlgili: [[xss-kapisi]] · [[kapi-tarama-yarisi]] · `scripts/yetim-kopru-denetci.mjs`
