---
name: kapi-tarama-yarisi
description: js/ altını gezen denetçiler, tasarım kapısının T7 sınavı yüzünden ENOENT ile çökebilir — okuma yarışa dayanıklı olmalı
type: gotcha
---

# Denetçi tarama yarışı — `zz-t7-sinav-gecici.js`

> **Güncelleme 2026-09-02 (ikinci tur): YARIŞIN KAYNAĞI KURUTULDU.**
> `tests/tasarim-kapisi.test.js` artık repoya yazmıyor — T7 sınavı kendi
> `mkdtemp` fixture'ında koşuyor. Bunu mümkün kılan `scripts/tasarim-denetci.mjs`'e
> eklenen `REL_KOK`'tur: göreli yol artık ROOT'a değil TARAMA'nın köküne göre
> üretiliyor, böylece fixture içindeki `js/parts/…` ağacı da T7'nin desenini
> tutturuyor. Sınavın repoya yazmasının tek sebebi bu göreliliğti.
> **Aşağıdaki gotcha yine de geçerlidir ve savunma katmanı SÖKÜLMEZ** — bir
> dosya tarama sırasında başka sebeplerle de silinebilir (editör, git
> checkout, paralel araç). Kaynağa karşı savunma ile sonuca karşı savunma
> ayrı katmanlardır; biri diğerinin yerine geçmez.

`tests/tasarim-kapisi.test.js`, T7 sınavını doğrulamak için repo'nun İÇİNE
geçici bir modül yazardı: `js/parts/zz-t7-sinav-gecici.js` (2026-09-02'ye
kadar).

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

Dayanıklı hâle getirilmiş denetçiler (2026-09-02, birinci tur):
`audit-innerhtml` (`gez()` + tarama), `gerceklik`, `tasarim`, `yetim-kopru`.
`bagsiz-ad`, `eksen`, `ihtimalsel` `js/` gezmez, dokunulmadı.

**İkinci turun dersi — savunma asimetrik kalmıştı.** Birinci tur yalnız dört
`scripts/*.mjs`'i sertleştirdi; oysa gerçek `js/` ağacını `readdirSync` ile
gezip try/catch'siz okuyan yedi TEST dosyası daha vardı (en kritiği
`tests/13D-iki-defter-kapisi.test.js`, okuma modül üst seviyesinde — orada
patlarsa dosyanın bütün testleri collect aşamasında ölür). Kaynak kurutulunca
risk uykuya geçti ama asimetri kaldı; ikinci tur onu da kapattı.

Genel kural: **bir yarışı kaynağında kurutmak, sonucuna karşı savunmayı
gereksiz kılmaz.** Kaynak yeniden doğabilir — bu repoda tam olarak öyle oldu:
repoya yazan bir test deseni iki kez yazıldı.

İlgili: [[xss-kapisi]] · `.claude/plans/denetim-onarimi.md` · `DENETIM-2026-09-01.md`
