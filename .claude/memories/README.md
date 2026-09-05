# `.claude/memories/` — repo tarafında yazılan hafıza

> **Bu dizin `.claude/hafiza/`nın rakibi değil, tamamlayıcısıdır.** İkisi ayrı
> şeyler tutar ve ikisi de okunur. Bu belge 2026-09-05'te, iki dizin yan yana
> gelince yazıldı — çünkü adlandırılmamış bir ikilik, sessiz bir paralel
> sistemdir (§1.3) ve sessiz olduğu sürece kimse hangisinin gerçek olduğunu
> bilemez.

## İki depo, iki rol

| | `.claude/hafiza/` | `.claude/memories/` (burası) |
|---|---|---|
| Ne tutar | Emre'nin lokal hafızasının **aynası** | Repo tarafında, **koda karşı** yazılmış hafıza |
| Gerçek kaynağı | `~/.claude/projects/<slug>/memory/` | bu repo |
| Nasıl tazelenir | `./scripts/hafiza-senkron.sh disa` | elle, yazıldığı turda |
| Elle düzenlenir mi | **HAYIR** — türevdir | evet, burası asıldır |
| Dosya (2026-09-05) | 195 | 38 |

**Kritik mekanik:** `hafiza-senkron.sh disa` kolu `rsync -a --delete` kullanır.
Yani `.claude/hafiza/` içine repo tarafında yazılan bir dosya, Emre'nin bir
sonraki senkronunda **silinir** — kaynakta karşılığı yoktur. Bu yüzden uzak
oturumda (GitHub/cloud) yazılan hafıza **buraya** yazılır, `hafiza/`ya değil.
Kuralı tek cümleyle: *aynaya yazılmaz, aynanın baktığı şeye yazılır — ve uzak
oturumun o şeye erişimi yoktur, o yüzden kendi defterine yazar.*

## Ad çakışması — 24 ad ikisinde de var

Ölçüldü (2026-09-05): 24 ad her iki dizinde de duruyor ve **24'ünün de içeriği
farklı**. 14 ad yalnız burada, 171 ad yalnız `hafiza/`da.

Çakışan 24'ün 19'u burada kendi hakkında şunu yazar: *"bu metin kurtarma
değildir, bugünkü koddan yeniden keşifle yazıldı"* — çünkü yazıldıkları gün
özgün hafıza repoda yoktu (`TASINABILIR-ZEMIN.md` §0: model kuralı biliyordu,
kuralın uygulanma geçmişini bilmiyordu).

**Ama bunlar üstü çizilecek taslak değil.** Ölçüm: o 19 dosyanın **16'sı**,
`hafiza/`daki özgün sürümde BULUNMAYAN repo yolları taşıyor (`js/parts/…`,
`tests/…`, `scripts/…` çapaları). Özgün hafıza *ne yaşandığını* taşır; buradaki
sürüm *bugün kodda ne durduğunu*. İkisi aynı olayın iki farklı kaydıdır ve
biri ötekinin yerine geçmez.

Bu yüzden bu turda **hiçbir dosya silinmedi**. Silmek, doğrulanmış repo
bilgisini atmak olurdu.

## Okuyan taraf ne yapmalı

Bir hafıza adını ararken **iki dizine de bak**. `CLAUDE.md` madde 13 bunu
söyler; `tests/referans-butunlugu-kapisi.test.js` de `[[bağ]]` hedeflerini
ikisinde birden çözer — bir ad hangisinde bulunursa bağ sağlamdır.

Çakışan bir adda ikisini de oku: `hafiza/` kararın **niçin** verildiğini,
buradaki sürüm bugünkü **nerede** durduğunu söyler.

## Senin yapman gereken (Emre, elle — acele değil)

İki depoyu tek depoya indirmek istersen sıra şudur ve **repo tarafından
yapılamaz**:

1. `./scripts/hafiza-senkron.sh ice` — repo türevini lokal hafızaya al
   (`--delete` yok, lokalde yeni yazılmış hafıza korunur).
2. Buradaki 38 dosyanın taşımak istediklerini lokal hafızaya elle işle —
   çakışan 24'te iki metni birleştir, 14 tekil dosyayı olduğu gibi al.
3. `./scripts/hafiza-senkron.sh disa` — tazelenmiş kaynak `hafiza/`ya yazılır.
4. Ancak o zaman bu dizin boşaltılabilir ve `CLAUDE.md` madde 13 tek depoya
   indirilebilir.

Sırayı bozup önce burayı silmek, 2. adımda taşınacak metni yok eder.
