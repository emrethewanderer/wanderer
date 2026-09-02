---
name: kapi-sessiz-gec
description: Bir kapı yalnız kırığı değil, kırığı GÖRME YETENEĞİNİ kaybettiğini de yakalamalı — boş sonuç "temiz" demek değildir
type: gotcha
---

# Sessiz geçen kapı — boş sonuç, temiz sonuç değildir

`scripts/bagsiz-ad-denetci.mjs` `tsc` çıktısını satır satır tarar ve yalnız
`TS2304`/`TS2552` desenine uyanları bulgu sayar. Desene uymayan satırlar
sessizce atlanıyordu. Sorun şu: **taramanın kendisi bozulduğunda da desene
uymayan bir satır basılır** — ve bulgu listesi boş kalır, denetçi de
`✓ Bağsız ad yok` diyerek exit 0 döner.

Ölçüldü (2026-09-02): girdi bulunamadığında `tsc` şunu basar ve **exit 0**
döner —

    error TS18003: No inputs were found in config file '...'

Yani ne bulgu listesi ne de çıkış kodu uyarır. Denetçi hiçbir dosyayı
okumamışken "temiz" raporlar.

**Why:** Bu, yanlış negatiflerin en tehlikeli türüdür. Kırık bir kapı
kırmızı yanar ve düzeltilir; **kör** bir kapı yeşil yanar ve güven üretir.
Kapının değeri yakaladığı ihlal kadar, yakalayamadığını fark etme
yeteneğidir.

**How to apply:** Bir dış araç (tsc, eslint, tsc benzeri) çıktısını
desenle ayrıştıran her denetçide üç durumu AYIR:

1. **Bulgu var** → ihlal, exit 1.
2. **Bulgu yok, tarama sağlam** → temiz, exit 0.
3. **Bulgu yok ama tarama bozuldu** → exit 1 ve gerekçe. "Temiz" DEME.

Üçüncü durumun sınırı ölçülerek çizilir, tahminle değil:

```js
/* Yalnız taramanın KENDİSİNE dair kodlar: TS6xxx (dosya/girdi),
   TS18xxx (yapılandırma). TS2xxx (semantik) bilerek dışarıda. */
if (/error TS(6\d{3}|18\d{3})\b/.test(satir)) taninmayan.push(satir);
```

**Sınırın iki yönü de ölçülmelidir.** İlk denemede desen `/error TS\d+/`
yazıldı — yani her hata "tarama bozuk" sayıldı. Ölçüm bunu çürüttü: o
tsconfig bu repoda **2.208 semantik hata** üretiyor (2.042'si TS2339), hepsi
bilinen ve o denetçinin konusu değil; kapı her koşuda kırmızı yanardı.

Ders `[[bagsiz-ad-kapisi]]`nin ve FAZ 7d'nin dersinin simetriğidir:
**spekülatif genişletme kapıyı kırar, spekülatif daraltma körleştirir.**
İkisi arasındaki tek hakem ölçümdür (§6.10).

Kapının kendi self-testi bu üçüncü durumu de kapsamalı — `tests/bagsiz-ad-kapisi.test.js`
içindeki "tarama hiç girdi bulamazsa sessizce geçmez" sınavı emsaldir:
exit 1 bekler, gerekçeyi arar ve **"Bağsız ad yok" demediğini** ayrıca
doğrular.

İlgili: [[kapi-tarama-yarisi]] · [[bagsiz-ad-kapisi]] · [[xss-kapisi]]
