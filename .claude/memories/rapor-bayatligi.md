---
name: rapor-bayatligi
description: Bir İç Çalışma raporu bitmiş işi "yapılacak" gösterdiğinde ölçüm boşluğundan daha sinsi bir kusur üretir — okuyanı yapılmış işi yeniden yapmaya çağırır; rapor da geçmişin fotoğrafıdır ve durumu koda karşı doğrulanmadan okunmaz
type: gotcha
---

# Rapor bayatlığı — "yapılacak" diyen bitmiş iş

Kaynak: 2026-09-03, İç Çalışma 1–8 denetimi. Emre "18 Temmuz'da oluşturup
uygulamadan güncellemiştik" diye hatırlıyordu; ağaç bunun tersini gösterdi.

**Why:** §7 hafıza için "geçmişin fotoğrafıdır, dosya:satır iddiaları koda
karşı doğrulanmadan gerçek diye sunulmaz" der. **Aynısı raporlar için de
geçerlidir ve iki yönde bozulur.** Bilinen yön, raporun kapalı bir şeyi
"açık" sanmasıdır. Ölçülen yön ise tersiydi ve daha pahalıdır:

| Oda | Rapor ne diyordu | Ağaç ne gösterdi |
|---|---|---|
| 02 | dokuz boşluk AÇIK, Faz 1–4 "yapılacak" | sekizi kodda kapalı — kod yorumları boşlukları adıyla anıyor (`09c:116` "boşluk I", `09c:152` "boşluk E") |
| 08 | "altı fazın hiçbiri henüz uygulanmadı" | altısı da kodda: `wtLogModel` · mig 050 · Üç Sesin Nabzı · `eksen-denetci.mjs` + taban + kapı testi · iki sonda |
| 05 | "bundle kapısı delik — 548 byte aşım yeşil geçiyor" | kırık kapanmış: `build.sh:153–156` byte'ta karşılaştırıyor |

Ters yön daha pahalıdır çünkü **okuyanı yapılmış işi yeniden yapmaya çağırır.**
Açık bir maddeyi kapalı sanmak bir turu boşa harcar; kapalı bir maddeyi açık
sanmak, aynı işi ikinci kez yazdırır ve ikizi repoya sokar (§1.3'ün tam
karşıtı: "mevcut olanı yeniden kullan, paralel sistem yazma").

**Kökü ortam ayrımıdır** ([[claude-altyapisi-commit-disi]]). Rapor
galeride yaşar ([[artifact-galerisi]]), kod repoda. İkisi **ayrı yerlerde
güncellenir** ve fazı uygulayan tur kodu güncelleyip raporu bırakırsa,
bağ o anda kopar — kimse yalan söylemez, yalnız iki kayıt ayrışır.

## How to apply

- Bir raporun durum satırını **asla** olduğu gibi kullanma. Kapalı/açık
  iddiasının kanıtı koddadır: fazın çapasını (`wtLogX`, panel adı, denetçi
  betiği, migration dosyası) grep'le, sonra hüküm ver. Denetim maliyeti
  odada beş dakikadır; yanlış hüküm bir sprint.
- Kod yorumları rapordan **daha güncel** olabilir: bu repoda faz uygulayan
  tur, boşluğu adıyla anan bir yorum bırakıyor (`İç Çalışma NN · boşluk X`).
  `grep -rn "İç Çalışma" js/` bir raporun gerçek durumunu ondan hızlı verir.
- Bir fazı uyguladığın tur **raporu da güncelle** — ya da güncellenmediğini
  raporun kendi Dürüstlük Notu'na yaz. "Kapanacak" ile "kapandı" arasındaki
  farkı tutan satır, güncellenmediğinde ters yönde yanıltır.
- Yeniden yayında **mevcut URL'yi `url` parametresiyle geçir**; `url`'süz
  yayın yeni bir artifact doğurur ve Atlas'ın bağı sessizce ölür.
- Galeri tarihi ("updated 2026-08-30") bir **yayın** tarihidir, uygulama
  tarihi değil. İkisini karıştırmak bu yanılgının kendisidir.

İlgili: [[artifact-galerisi]] (raporlar nerede yaşar) ·
[[claude-altyapisi-commit-disi]] (aynı sınıfın repo tarafı) ·
`.claude/artifacts.md` (adres tablosu + 2026-09-03 denetim turu)
