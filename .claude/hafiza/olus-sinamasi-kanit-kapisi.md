---
name: olus-sinamasi-kanit-kapisi
description: "2026-08-03 TAM: Oluş Sınaması sil-baştan — hüküm modelin `gecti`sinden alındı kanıta bağlandı (kanit_ref→kokenAlintiCoz, kanıtlı boyut>=3); ekran Studio göğü + Eşik'in iki kutup yerleşimi; beş durak (kapı/soru/gözden/okuma/mühür)"
metadata: 
  node_type: memory
  type: project
  originSessionId: cc71e88d-664a-40af-a82f-d26f18f77b82
  modified: 2026-08-03T13:28:21.490Z
---

Emre'nin isteği (2026-08-03): sınav ekranında **kart yok**, tasarım Wanderer
Studio'nun arka planı gibi olsun, "Bugünün Eşiği"nin kart yerleşimi buraya
gelsin (hangi kişiden hangi kişiye), ve **test en kaliteli seviyeye çıksın**.

Plan: `.claude/plans/olus-sinamasi-esik-tasarimi.md`

## Merkez kavram — "Model yargılar, alıntı geçirir"

Sınamanın hükmü artık modelin `{gecti: boolean}` alanı DEĞİL. Bir boyut ancak
**iki imza** taşıyorsa sayılır: model o boyutta "yaşandı" der VE gösterdiği
referans kullanıcının kendi cevabında çözülür. Gösteremiyorsa boyut düşer —
kalibre edilmemiş bir öz-beyan kapı olamaz (PROTOKOL §6.10 · denetçi K4).
Geçme kuralı koda indi ve deterministik: `kanıtlı boyut >= SINAMA_GECER (3)`.

Bu, [[kesin-alinti-mimarisi]]'nin dördüncü tüketicisidir — yeni doğrulama
yazılmadı: `kokenSozBlok` (cevaplar cümlelere bölünüp `[S1..Sn]` numaralanır)
→ model `kanit_ref` → `kokenAlintiCoz` metni **kaynaktan keser**. Kullanıcı
ekranda kendi cümlesini görür, modelin o cümleye dair hatırladığını değil.

## How to apply (kod haritası)

| Ne | Nerede |
|---|---|
| Saf çözücü (asıl kural) | `olusSinamaCoz(j, qa)` — export, LLM'siz test edilir (10q4) |
| Cümlelere bölme | `_sinamaSozler` — lookbehind YOK (eski iOS Safari), `[^.!?…\n]+[.!?…]*` |
| Eşik | `SINAMA_GECER = 3` · `SINAMA_SOZ_MAX/MAXLEN/MIN` (10q4 §6) |
| Dinlenme | `olusSinamaBeklemeSinav(sinav)` saf — defterin nerede durduğunu bilmez |
| Prompt sözleşmesi | `prompt.olus.sinama_karar_*` — `boyutlar{d:{yasandi,kanit_ref,kanit}}`; `gecti` alanı KALDIRILDI (16b/16e) |
| İki kutup | `kutuplar()` → `opts.goldPole` ?? `yolGoldPole()` (10f) + sınanan kart |
| Giriş sözleşmesi | `olusSinamaAc(cardId, opts)` — `card`/`goldPole`/`defter`/`onGecti`; opts boşsa davranış eskisi (2026-08-10, [[gecis-muhru-kanit-kapisi]]) |
| Yerleşim | `esikEnsureStyles()` + `.esik-cards/.esik-card/.esik-path` (02d) |
| Dört boyut şeridi | `serit({aktif}|{durum})` — `.olus-s-adim` is-dolu/is-aktif/is-kanitli/is-bos |
| Okuma sahnesi | `sceneOkuma` + `okumaListesi` — kanıtlı boyut altın + "KENDİ CÜMLEN", kanıtsız lapis rota |

## Kararlar ve gerekçeleri

- **Yüzde halkası söküldü** (`ikvRing` step/4). §7'nin "ilerleme = halka"
  kuralı SÜREKLİ ilerleme içindir; sınamanın ilerlemesi dört AYRIK kapıdır ve
  dördü zaten kitabın boyutları. Aynı şerit üç sahnede: kapıda ne geleceğini,
  soruda nerede olunduğunu, okumada neyin ayakta kaldığını söyler.
- **Gözden geçirme durağı eklendi** (5. durak). Sınamanın bedeli 7 gün
  beklemektir; yanlışlıkla ya da yarım cevapla ödenmemeli. Aynı sebeple boş
  cevapta "Devam" kapalıdır (`#olus-s-ileri[disabled]` + ipucu satırı).
- **Geçen de geçmeyen de OKUMA sahnesini görür.** Fark cezada değil, hangi
  boyutun kendi cümlesini taşıdığındadır. Mühür ondan sonra, kullanıcının
  eliyle basılır (`_perde2` REUSE; Emre'nin sözü orada TEKRARLANMAZ → `null`).
- **Kutup okuyucusu üçüncü kez yazılmadı.** 02d ve 10f zaten aynı sırayı
  (Portre > Kimlik Motoru) ikizliyordu; 10f'e `yolGoldPole()` exportu eklendi.

## Gotcha'lar (bu turda yakalandı)

- **`.onb-ritual` ile aynı özgüllükte yazılan kural KAYBEDER.** `.olus-sinama`
  tek sınıfla göğü basmıyordu: `onboarding-ritual.css` bu dosyadan sonra
  yükleniyor ve kendi dawn degradesini aynı özgüllükle basıyor. Doğrusu
  `.onb-ritual.olus-sinama`. (Eşik bu tuzağa düşmüyor çünkü stillerini JS'ten
  enjekte ediyor — sırayla kazanıyor; **dosya-tabanlı stil o şansa güvenemez.**)
- **Eşik Ekranı'nın giriş animasyonlarında reduced-motion bloğu HİÇ YOKTU**
  (`esikFromLeft/Right`, `esikRise`). Sınama aynı yerleşimi kullanmaya
  başlayınca açık iki ekranı ilgilendirir oldu; 02d'nin kendi bloğunda
  kapatıldı. `animation:none` fill-mode'u da siler → bitiş durumu (`opacity:1;
  transform:none`) ELLE verilir, yoksa sahne boş donar.
- **Panel gizliyken screenshot YALAN SÖYLER.** Perde şeffaf göründü; canlı
  sorgu (`elementFromPoint` + `getComputedStyle`) opak olduğunu kanıtladı —
  neden, gizli panelde `opacity` geçişinin 0.999'da donmasıydı. Görsel yargı
  için önce `resize_window`, sonra `style.transition='none'`.
- **ES modülleri inatla cache'lenir** (python http.server): `?v=` HTML'i
  tazeler, modülü tazelemez. CSS için `link.href`'i JS'ten değiştirmek yeter;
  JS değişikliğinde taze port gerekir (bkz. [[olus-muhru-2-muhru-sen-basarsin]]).

## Harness

`kisilerim-test.html` → **"Oluş · sınama · hüküm (sahte LLM)"** düğmesi:
Supabase stub'ı `auth.getSession` döndürür hâle geldi ve `fetch` kanıt turunu
sahte JSON'la karşılar. Prompt kurulumu, parse, kanıt kapısı ve sahneler
GERÇEK koddur — hükmün iki dalı (kanıt 3 → mühür / kanıt 1 → rota) böyle
doğrulandı. Geçersiz `kanit_ref` (havuzda olmayan `S9`) canlı olarak düştü.

Bkz. [[gecis-muhru-kanit-kapisi]] · [[olus-muhru-2-muhru-sen-basarsin]] · [[olus-muhru-karari]] ·
[[esik-ekrani]] · [[sahne-gogu-tek-kaynak]] · [[kesin-alinti-mimarisi]] ·
[[gerceklik-mimarisi]] · [[kart-gorsel-dili]] · [[tasarim-prensipleri]]
