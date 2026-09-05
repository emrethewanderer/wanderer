# `.claude/memories/` — repo tarafında yazılan hafıza

> Hafıza bu repoda **iki dizinde** yaşar. Bu bir kaza değil, tasarımdır — ve
> tasarım olduğu 2026-09-05'te anlaşıldı: ikisi yan yana gelince önce "paralel
> sistem" (§1.3) sanıldı, ölçüm bunu yanlışladı. İkisi ayrı şeyler tutuyor.

## İki depo, iki rol

| | `.claude/hafiza/` | `.claude/memories/` (burası) |
|---|---|---|
| Ne | Emre'nin lokal hafızasının **aynası** | Repo tarafında, **koda karşı** yazılmış hafıza |
| Gerçek kaynağı | `~/.claude/projects/<slug>/memory/` | bu repo |
| Nasıl tazelenir | `./scripts/hafiza-senkron.sh disa` | elle, yazıldığı turda |
| Elle düzenlenir mi | **HAYIR** — türevdir, ilk senkronda üzerine yazılır | evet, burası asıldır |
| Ne söyler | kararın **niçin** verildiğini | bugün kodda **nerede** durduğunu |

**Kural tek cümledir: aynaya yazılmaz, aynanın baktığı şeye yazılır.** Uzak
oturumun (GitHub/cloud) aynanın kaynağına erişimi yoktur — bu yüzden kendi
defterine, buraya yazar.

## Neden ayrı duruyorlar

Senkronun kaynağı repo değildir. Aynaya repo tarafından yazılan bir dosyanın
kaynakta karşılığı yoktur; eskiden `rsync --delete` onu **sessizce siliyordu**
ve kimse görmüyordu. Betik artık durup soruyor (`disa`, silinecekleri önce
gösterir) ve doğru cevabı da söylüyor: dosyayı buraya taşı.

Yani ikilik bir borç değil, senkronun **doğru** çalışmasının sonucudur.
Tek depoya inmek için yapılması gereken bir iş **yoktur**.

## Ad çakışması — 24 ad ikisinde de var

Ölçüldü (2026-09-05): 24 ad her iki dizinde de duruyor ve **24'ünün de içeriği
farklı**. 14 ad yalnız burada, 171 ad yalnız aynada.

Çakışan 24'ün 19'u burada kendi hakkında *"bu metin kurtarma değildir, bugünkü
koddan yeniden keşifle yazıldı"* der — yazıldıkları gün özgün hafıza repoda
yoktu (`TASINABILIR-ZEMIN.md`). İlk refleks o 19'u silmekti. Ölçüm durdurdu:
**16'sı, aynadaki özgün sürümde BULUNMAYAN repo yolları taşıyor**
(`js/parts/…`, `tests/…`, `scripts/…` çapaları). Bugünün koduna karşı
doğrulanmış bilgi — silmek onu atmak olurdu.

**Çakışan bir adda ikisini de oku.** Farklı içerik ihlal değildir; iki kayıt
aynı olayın iki yüzüdür.

İhlal olan tek şey **birebir kopyadır**: aynı ad iki depoda aynı içerikle
dururken ikilik bir role değil bir kazaya döner, ve hangisinin güncelleneceği
belirsizleşir. Kapısı `tests/hafiza-senkron-kapisi.test.js`'tedir; bugün sıfır
kopya var ve doğması yasaktır.

## Yazarken

- **Uzak oturumdaysan** hafızayı buraya yaz, `hafiza/`ya değil.
- **Lokaldeysen** memory aracına yaz; kapanıştan önce
  `./scripts/hafiza-senkron.sh disa` koştur (kapı: `… fark` temiz olmalı).
- Her iki hâlde `MEMORY.md` indeksine tek satır ekle (§7).
- Bir hafıza adını **ararken iki dizine de bak**;
  `tests/referans-butunlugu-kapisi.test.js` de `[[bağ]]` hedeflerini ikisinde
  birden çözer, yani bir ad hangisinde bulunursa bağ sağlamdır.
