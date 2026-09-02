---
name: odev-zinciri-ve-cipi
description: Ödev zinciri (üret → DB → oku → LLM → çip → defter) iki ayrı yerden SESSİZCE koptu; motor yıllarca canlıydı ama kullanıcı hiçbir şey görmedi — çipi bağsız bir ad, defteri hiç yazılmamış bir getter kesti
type: gotcha
---

# Ödev zinciri ve çipi — motor canlı, ekran boş

> **Bu dosya hakkında.** `tests/09-odev-defteri.test.js:7` bu ada
> `[[odev-zinciri-ve-cipi]]: "panel istenirse yeniden yazılır"` diye bağ
> veriyordu; hedef dosya `.claude/memories/` altında yoktu. Özgün dosya
> repoya hiç girmedi ([[claude-altyapisi-commit-disi]]); **bu metin kurtarma
> değildir**, bugünkü koddan yeniden keşifle yazıldı.
>
> **Kayıp olan:** atıfın tırnak içinde aktardığı cümlenin bağlamı — *"panel
> istenirse yeniden yazılır"* özgün hafızada bir **karar** olarak duruyordu
> (bir panel bilinçli olarak ertelenmişti). O kararın ne zaman, hangi
> gerekçeyle verildiği repodan okunamıyor; bugün defter yazılmış durumda
> (`getHomeworkHistory`), yani karar sonradan tersine dönmüş görünüyor —
> **ama bunu doğrulayan bir kayıt yok.**

**Why:** Bu, Wanderer'daki **sessiz kopuş** kırık sınıfının en iyi belgelenmiş
örneğidir: bir zincirin tüm halkaları canlıdır, veri veritabanında birikir,
build yeşildir, konsol temizdir — ve kullanıcı hiçbir şey görmez.

Zincir şudur:

    seans sonu → generateHomework → homework tablosu
               → loadRoadmap (post-auth) → _activeHomework
               → getHomeworkContext (09:840) → LLM bağlamı
               → sohbet çipi (kullanıcının gördüğü TEK yüzey)
               → getHomeworkHistory (09:678) → Ödev Defteri

Zincir **iki ayrı yerden**, iki farklı sebeple koptu:

**1 · Çip — bağsız ad (2026-08-21).** `tests/06-odev-cipi.test.js:1-10` kaydı
tutuyor: motor baştan sona canlıydı, ama kullanıcıya görünen tek yüzey olan
sohbet çipi `_activeHomework`'ü 09'un modül-yerelinden **çıplak bir ad olarak**
okuyup `typeof … === 'undefined'` guard'ına takılıyordu. Guard **her zaman**
doğru dönüyordu — yani *"ödev veritabanında dururken ekranda hiç doğmadı."*
Bu, [[bagsiz-ad-kapisi]]'nın tuttuğu sınıfın ta kendisidir; testin kendi
cümlesiyle: *"Bağsız ad kapısı kırığın SINIFINI tutar; bu test bu özelliğin
DAVRANIŞINI tutar. İkisi ayrı işlerdir."*

**2 · Defter — hiç yazılmamış getter (2026-08-23).** `loadRoadmap` post-auth
turda `homework` tablosundan son on satırı **yıllardır** çekiyordu; içinden
yalnız `pending` olanı `_activeHomework`'e alıp **gerisini atıyordu**.
Kullanıcının kendine verdiği eski sözler veritabanında duruyor, hiçbir
yüzeyden görünmüyordu (`tests/09-odev-defteri.test.js:4-8`). Burada kırık bir
kod değil, **eksik bir getter**di — yazılmamış bir şey hata vermez.

Felsefe tarafı `09-reports-tracks.js`'in Ödev Defteri banner'ında:
*"Ödev bir puan değil, bir söz… Defter sayı tutmaz ('3 ödev tamamladın'
demez); üstlendiklerini [gösterir]."*

**How to apply:**

## 1 · Defterin sözleşmesi (dokunacaksan koru)

`getHomeworkHistory()` (`09-reports-tracks.js:678`) üç şeyi birden yapar:

- **Kanıt kapısı (§6.10):** kayıt yoksa **boş dizi** döner — çağıran taraf
  sayı basmaz, davet gösterir. Uydurma satır yok.
- **`superseded` eleme:** o satırlar *"kullanıcının bıraktığı bir söz değil,
  motorun üzerine yazdığı bir kayıttır"* (`09:652` onları `superseded`
  işaretler) — deftere girmezler.
- **Sessiz düşüş:** ağ giderse elimizdeki defter kalır, **ekran boşalmaz**.

Kaynak post-auth turda çekilen listedir — **ikinci sorgu atma**.

## 2 · Yeni bir "arka planda çalışan ama görünen tek yüzeyi olan" özellik yazarken

Bu zincirin dersi tek cümledir: **motorun canlı olması, özelliğin var olduğu
anlamına gelmez.** Zincirin ucundaki tek yüzey koparsa hiçbir kapı kırılmaz.
Yeni bir özellikte sor: *bu zincirin görünen ucunu hangi test tutuyor?*
Sınıf kapısı (bağsız ad) yeterli değildir — davranışı tutan ayrı bir test
gerekir.

## 3 · Modül-yereline çıplak adla erişme

Çipin kırığı bir stil hatası değildi: 09'un modül-yerel `_activeHomework`'ü
06'dan çıplak adla okunamaz. Doğru yol export edilmiş getter'dır
(`getActiveHomework`, `09:669`). `typeof x === 'undefined'` guard'ı bu hatayı
**gizler** — hiç tanımlanmamış bir ad da aynı cevabı verir.

İlgili: [[bagsiz-ad-kapisi]] (çipin kırığının sınıf kapısı) ·
[[guvenlik-emniyet-katmani]] (aynı sessiz-kopuş sınıfının emniyet
yüzeyindeki hâli — orada bedeli çok daha ağır)
