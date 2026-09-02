---
name: kapi-tarama-yarisi
description: js/ altını gezen denetçiler, tasarım kapısının T7 sınavı yüzünden ENOENT ile çökebilir — okuma yarışa dayanıklı olmalı
type: gotcha
---

# Denetçi tarama yarışı — `zz-t7-sinav-gecici.js`

`tests/tasarim-kapisi.test.js`, T7 sınavını doğrulamak için repo'nun İÇİNE
geçici bir modül yazar ve siler: `js/parts/zz-t7-sinav-gecici.js`.

Vitest paralel koşar (`maxWorkers: 3`). `js/` altını `readdirSync` ile gezen
BAŞKA bir denetçi tam o anda çalışıyorsa, dosyayı listeler ama okumaya
gelene kadar dosya silinmiş olur → `ENOENT` → denetçi çöker → kapı kırmızı.

**Why:** Bu, kodda bir kusur olmadan kırmızıya dönen bir kapıdır — yani
"flake" gibi görünür ve insanı testi yeniden koşturmaya iter. Kök neden
gerçektir: repo'nun içine geçici dosya yazan bir test ile repo'yu gezen bir
denetçi aynı anda çalışıyor.

Bulunuşu öğreticidir: yerelde üç kez tam süit koşuldu, zamanlama hiç
tutmadı; **CI'ın ilk koşusu** (farklı çekirdek sayısı, farklı worker hızı)
ilk denemede yakaladı. Kapının kurulma sebebi tam da buydu — 2026-09-02.

**How to apply:** `js/` (ya da repo içi herhangi bir ağaç) gezen her yeni
denetçide dosya okuma yarışa dayanıklı yazılır:

```js
let src;
try { src = readFileSync(dosya, 'utf8'); }
catch (e) { if (e && e.code === 'ENOENT') continue; throw e; }   // döngüde
// fonksiyon içindeyse: return [] / return;
```

`statSync` için de aynısı geçerlidir (listelenmiş ama silinmiş girdi).
Tarama anında var olmayan dosya repo'nun kalıcı parçası değildir; sessizce
atlanır — susturma değil, doğru semantik.

Dayanıklı hâle getirilmiş denetçiler (2026-09-02): `audit-innerhtml`
(`gez()` + tarama), `gerceklik`, `tasarim`, `yetim-kopru`. `bagsiz-ad`,
`eksen`, `ihtimalsel` `js/` gezmez, dokunulmadı.

İlgili: [[xss-kapisi]] · `.claude/plans/denetim-onarimi.md` · `DENETIM-2026-09-01.md`
