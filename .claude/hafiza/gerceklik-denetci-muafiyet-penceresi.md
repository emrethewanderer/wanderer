---
name: gerceklik-denetci-muafiyet-penceresi
description: "GOTCHA: gerceklik-denetci.mjs muafiyeti İKİ YERDE arar — satır kuralları 6 satırlık pencerede (MUAF_PENCERE), K3 ise DOSYA düzeyinde (ilk 40 satır); yanlış yere yazılan gerekçe kapıyı açmaz"
metadata:
  node_type: memory
  type: reference
---

`scripts/gerceklik-denetci.mjs` bir `KOKEN-MUAF` gerekçesini yalnız **ihlal satırının
en fazla 6 satır üstünde** ararsa bulur (`MUAF_PENCERE = 6`, satır 75; `muaf()`
fonksiyonu `i - MUAF_PENCERE`'den `i`'ye tarar). Gerekçe metni ayrıca **en az 8
karakter** olmalı — gerekçesiz muafiyet de ihlaldir.

Pratik sonuç: mevcut bir muafiyete tarihsel/açıklayıcı paragraf **eklemek** onu
pencerenin dışına iter ve `tests/gerceklik-kapisi.test.js` kırmızıya döner — kod
hiç değişmemiş olsa bile. 2026-08-19'da `10q sc()` muafiyetinde tam bu yaşandı.

## K3 İSTİSNA: dosya düzeyinde bir kuraldır (2026-08-30)

Yukarıdaki 6 satırlık pencere **satır kuralları** içindir. `K3` öyle değil:
dosyada `.kanit` **ve** `callLLM` geçiyorsa **ve** `kokenAlinti|kokenYorum|
kokenAlintiCoz` hiç geçmiyorsa dosya ihlalli sayılır ve ihlal `.kanit`in İLK
geçtiği satırda raporlanır. Muafiyet bu yüzden o satırda değil, **dosyanın ilk
40 satırında** (banner) aranır (`dosyaMuaf = MUAF_RE.test(baslik)`, satır ~199).

Belirti: gerekçeyi ihlal satırının hemen üstüne yazarsın, kapı yine kırmızı
kalır — üstelik artık **kendi muafiyet yorumunu** ihlal satırı diye gösterir
(o satırda `.kanit` geçtiği için). 2026-08-30'da `13o-geri-cagri.js`'de tam bu
yaşandı; gerekçe banner'a taşınınca kapı yeşile döndü.

Meşru muafiyet örneği: `dgKapi`'nin döndürdüğü `kanit` LLM çıktısı DEĞİLDİR —
`dgNabiz`in `_kanitKes`i kullanıcının kendi ham metninden cümle sınırında
keser ve `kokenKirp`ten geçirir. K3'ün aradığı köken kapısı LLM'in ÜRETTİĞİ
kanıt iddiaları içindir (emsal: `01-prompts-modes.js:321`).

**Why:** Pencere dar tutulmuş ki muafiyet gerçekten O satır için yazılsın, uzaktaki
bir yoruma yaslanmasın. K3'ün dosya düzeyinde olması ise kuralın kendisinin
dosya düzeyinde olmasındandır — "bu dosya LLM kanıtı okuyor mu" sorusu tek bir
satıra bakarak yanıtlanamaz.
**How to apply:** Önce kuralın cinsini sor: K3 ise gerekçe **banner'a**, değilse
korunan satıra bitişik. Muafiyet gerekçesini kısa tut ve korunan satıra bitişik bırak;
tarihçe/bağlam anlatacaksan **ayrı bir yorum bloğu** aç ve onu KOKEN-MUAF bloğunun
ÜSTÜNE koy. Değişiklikten sonra `node scripts/gerceklik-denetci.mjs` ile teyit et.
İlgili: [[gerceklik-mimarisi]] · [[kart-evreni-koleksiyon-nabzi]]
