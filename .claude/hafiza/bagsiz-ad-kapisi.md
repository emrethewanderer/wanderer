---
name: bagsiz-ad-kapisi
description: "2026-08-21 — bundle'da çözülen, kaynakta ReferenceError olan adların kalıcı kapısı: tsc checkJs + TS2304. Regex denetçinin göremediği sınıfı kapatır; açılışta 56 vaka/26 ad çıktı, 3'ü ağır kırıktı"
metadata: 
  node_type: memory
  type: project
  originSessionId: 27e43813-12fe-41d3-b65c-6c422d5d0a78
  modified: 2026-08-21T12:46:55.009Z
---

`window.foo?.()` köprüsünün ([[yetim-kopru-denetcisi]]) üçüncü ve en sinsi
akrabası: **modülün kendi scope'unda hiçbir bağı olmayan ad.** Ne import
edilmiş, ne yerel tanımlı, ne `window.` önekli — sadece yazılmış.

## Kök neden: vite IIFE scope'ları düzleştirir

Vite'ın IIFE build'i tüm modülleri **tek scope'a** toplar (scope hoisting).
Bir modül başka modülün fonksiyonunu import etmeden çıplak çağırırsa, bundle'da
o ad tesadüfen çözülür ve **ürün çalışıyor görünür**. Aynı kod kaynak ES modülü
olarak koştuğunda ReferenceError'dır.

**Ölçüldü (kanıt):** kasten eklenen bağsız bir adla `./build.sh` **exit 0**
verdi ve ad bundle'a olduğu gibi girdi. Yani build bu sınıfı yapısal olarak
göremez — kapı bu boşluk için var.

## Neden regex denetçi yetmedi

Kardeş denetçi (`yetim-kopru-denetci.mjs`) **çağıran modülün kendi import
kümesini hiç sormuyordu**; yalnız "bu ad bir yerde export edilmiş mi" diyordu.
Kanıt: 2026-08-19 turu `06:requestChatExit` içindeki `saveAnalyticsToSupabase`
yetimini bulup düzeltmişti — ama **aynı fonksiyonun üç komşusunu** kaçırdı
(`saveSessionPatterns`, `generateHomework`, `updateTrackProgress`). Üçü de
export edilmişti, üçü de import edilmemişti.

Elle regex yazmak bu işi çözmez: blok scope, hoisting, destructuring, catch
parametresi, sınıf alanları hepsi kural ister. Gerçek scope analizini
TypeScript yapar.

## Kapı

```
node scripts/bagsiz-ad-denetci.mjs            # ihlalde exit 1
node scripts/bagsiz-ad-denetci.mjs --liste    # listele, exit 0
node scripts/bagsiz-ad-denetci.mjs --config X # başka profil (öz-sınama)
```

`tsconfig.bagsiz-ad.json` (`checkJs: true`) → **TS2304/TS2552 "Cannot find
name"**. `tests/bagsiz-ad-kapisi.test.js` onu koşar; ikinci bloğu kapının
kendisini sınar (ihlalli fixture'da exit 1 + adı raporlamalı). Maliyet ~13 sn.

**ŞART:** `types/globals.d.ts` köprüleri `interface Window` ile beyan eder,
`declare var` ile DEĞİL. `declare var` yazılırsa çıplak `foo()` sessizce
meşrulaşır ve kapı körleşir. Ana `tsconfig.json`'ın `checkJs: false` duruşu
korunur — bu profil tip denetimi yapmaz, yalnız "ad çözülüyor mu" sorar.

## Açılışta çıkan 56 vaka — üç ağır kırık

| Yer | Ad | Sonucu |
|---|---|---|
| `06:requestChatExit` | `saveSessionPatterns` +2 | **İLK satırda** ReferenceError; `Promise.resolve(f())` kalıbında hata argüman değerlendirmesinde atılır, `.catch` YAKALAYAMAZ → altındaki tüm arka plan işleri ölü |
| `10n:_obRender` | `OB_STATIONS` | hiç tanımlanmamış; kullanıcı "Başla"ya bastığı an Dinlenme onboarding'i ölüyordu (doğrusu `OB_STATION_COUNT`) |
| `07:loadSettings` | `WHATSAPP_COMMUNITY_URL` | hiç tanımlı değil, üstelik **ATAMA**; ES modülleri daima strict → tanımsıza atama ReferenceError. Hiç okunmuyordu, 3 satır söküldü |

`11:w2GenerateDaySummary`'nin `p`'si de canlı yoldaydı — [[gecmis-gunler-ozet-zinciri]]
ile aynı hastalığın 11'de düzeltilmemiş ikizi.

## `typeof` guard'ı bu sınıfı GİZLER

En sinsi biçim: `typeof X === 'undefined'` guard'ı bare identifier'ı yutar ve
kod "savunmacı" görünür. İki vaka bulundu, ikisi de sessiz ölü özellikti:
`_activeHomework` ([[odev-zinciri-ve-cipi]]) ve 02'nin `_choiceTracking`
okuması ("Kanıt 2" her zaman 0 sayılıyordu → `dfGetChoiceStats()`).
Başka modülün `_`-önekli state'ini okuyorsan guard yazma — **getter iste**.

**Why:** Build yeşil, konsol temiz, özellik yok. Bu üçlü bu repoda defalarca
görüldü; her seferinde elle bulundu. Kapı onu bir daha elle buldurmaz.

**How to apply:** Bir adı çağırmadan önce o modülde bağı olduğundan emin ol —
import et. Ad hiçbir yerde tanımlı değilse ya yaz ya çağrıyı sök; "bundle'da
çalışıyor" gerekçe değildir. Kapı kırmızıysa adı gerçekten bağla.

Bkz. [[yetim-kopru-denetcisi]] · [[odev-zinciri-ve-cipi]] ·
[[olu-kod-temizlikleri]] · [[build-source-convention]]
