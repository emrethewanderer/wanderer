---
name: llm-bicimleri-geri-sizar
description: Uygulamanın modele gönderdiği biçimler (meta etiketi, filigran satırı) modelin ÇIKTISINA geri sızar — model onları taklit eder ve Türkçeleştirir; sıyırma Unicode olmalı, TANIMA ise ASCII sözleşmede kalmalı, ve iki ikiz regex aynı omurgayı taşımalı
type: gotcha
---

# LLM biçimleri geri sızar — model kendi gördüğü kalıbı taklit eder

> **Bu dosya hakkında.** Bu ada altı yerden bağ veriliyordu
> (`js/parts/00-config-tracking.js:476,484,490` · `js/parts/06-summary-chat.js:1013`
> · `tests/06-summary-chat.test.js:311,323`); hedef dosya
> `.claude/memories/` altında yoktu. Özgün dosya repoya hiç girmedi
> ([[claude-altyapisi-commit-disi]]); **bu metin kurtarma değildir**, bugünkü
> koddan yeniden keşifle yazıldı.
>
> **Kayıp olan:** kırık sınıfının ilk kez nasıl fark edildiği. Elde iki
> tarihli kayıt var (`2026-08-29` denetimi, FAZ 9) ama sınıfa adını veren
> ilk vakanın hangisi olduğu repodan okunamıyor — **uydurulmadı**.

**Why:** Wanderer modele yalnız metin göndermez, **biçim** de gönderir: bir
meta etiketi (`[MOD:soft|DG:yatistirma#S2]`) ve geçmiş yanıtların başına
eklenen bir filigran satırı. Modelin öğrenme yüzeyi ayrım yapmaz — gördüğü
kalıbı **taklit eder** ve kendi diline çevirir. Sınıfın adı budur: uygulamanın
kendi biçimleri, modelin çıktısından geri sızar.

**İki belgelenmiş vaka:**

**1 · Etiket Türkçeleşir.** Model `DG` yerine `DUYGU` yazabilir; MOD değerini
de çevirir (`[MOD:yumuşak]`, `[MOD:derinleş]`). Sıyırıcı desen bu yüzden
Unicode'dur — `00-config-tracking.js:494`:

```js
const MOD_TAG_RE = /^\[MOD:([\p{L}\p{N}_]+)(?:\s*\|\s*(?:DG|DUYGU)\s*:\s*([\p{L}_]+)…/iu;
```

**Kırığın kendisi ölçüldü (denetim 2026-08-29).** Yakalama eskiden `\w+` idi
ve **`\w` Unicode bayrağıyla bile ASCII'dir** — model modu Türkçeleştirince
desen hiç tutmuyor, etiket sıyrılmıyor ve kullanıcı **ham `[MOD:yumuşak]`
metnini ekranda görüyordu** (`00-config-tracking.js:490-497`).

Ama sıyırmanın gevşemesi tanımanın da gevşemesi değildir: `extractDgReading`
ekseni `DG_KARSILAMALAR`a karşı sınar ve **uymayan sessizce yok sayılır**
(`null` döner) — *"uydurma bir eşleşmeye düşülmez (§6.10)"*. Aynı fonksiyon
iki şeyi daha yapmaz: alıntı metnini **üretmez** (`ref` yalnız NUMARADIR;
metni kaynaktan kesme işi çağıranın `kokenAlintiCoz` çağrısıdır — K5, *"model
alıntıyı yazmaz, gösterir"*) ve modelin kendi güven sayısını **taşımaz** (K4).

**2 · Filigran taklidi.** 06, modele giden geçmiş assistant mesajlarının
başına `[bu yanıt "tasarla" modunda yazıldı]` satırını ekler ki model kendi
ton geçmişini görsün. Yan etkisi (`00-config-tracking.js:517-525`): model bu
satırı *"assistant mesajları böyle başlar"* diye öğrenip **kendi çıktısının
başına yazar**. Sıyrılmazsa **üç zarar birden** doğar:

- satır ekrana çıkar,
- geçmişe **ve DB'ye** yazılır, sonraki turda 06 üstüne bir filigran DAHA
  bindirir → **birikir**,
- öne geçtiği için `[MOD:]` etiketi baştan yakalanamaz ve mod telemetrisi
  yanlışlıkla `tag_missing` sayar.

Çare iki taraflıdır: filigran hem çıkışta (`stripModeWatermark`, birikmiş
katmanları **sabit noktaya kadar** soyar — en çok 5 tur) hem girişte (06'nın
idempotent eklemesi) sıyrılır.

**İkiz desen kuralı.** Meta satırını **iki** regex tanır: `MOD_TAG_RE`
(`00:494` — sıyırma + okuma) ve `_AKIS_MOD_TAM` (`06:1021` — akış maskesi).
İkisi **bilerek** farklıdır (maske uçuşan yarım metni de yutmalı:
`_AKIS_MOD_YARIM`, 40 karakterle sınırlı) ama **aynı omurgayı taşımak
zorundadır**. Maske bir YEDEK KATMANDIR: parser'ın regex'i beklenmedik bir
biçimle kırılırsa S3 fallback'i ham arabelleği basar ve bu iki desen o kaçağı
yutar; yalnız BAŞTA aranır (`^`) ki sohbetin ortasındaki bir "[MOD" metnini
yanlışlıkla yemesin (`06:1008-1020`).

Kapısı var: `tests/06-summary-chat.test.js:307-335` sekiz varyantlık bir
korpusu (`[MOD:soft|DUYGU:yatistirma#S2]`, `[MOD:direct | DG : kutlama # s10]`,
`[MOD:yumuşak]`…) **her iki desene** birden koşturur ve *"biri güncellenip
öteki unutulursa burası kırılır ve hangi tarafın geride kaldığını söyler."*
Ayrışma emsali kod yorumunda adıyla anılıyor: `13o gcFire`
(`13o-gec-cagri.js:273`, window köprüsü `:393`).

**How to apply:**

## 1 · Modele yeni bir BİÇİM gönderiyorsan, geri geleceğini varsay

Prompt'a bir etiket, bir başlık, bir ayraç koyuyorsan sor: *model bunu
taklit ederse ne olur?* Cevap "ekranda görünür" ya da "DB'ye yazılır" ise
**sıyırıcıyı aynı turda yaz** — hem çıkışta hem girişte, ve birikmeye karşı
döngüyle.

## 2 · Sıyırma GEVŞEK, tanıma SIKI

Bu ayrım bu dosyanın çekirdeğidir. Etiketi sıyırırken Unicode ol, diyakritiği
kabul et — amaç kullanıcının ham metni görmemesidir. Ama o etiketten bir
**karar** okuyorsan ASCII sözleşmeye uymayanı **uygulama**: tanınmayan değer
sessizce düşer, çağıran taraf ipucu moduna geçer. Gevşek tanıma, uydurulmuş
bir eşleşme üretir (§6.10).

## 3 · İkiz deseni tek başına güncelleme

`MOD_TAG_RE` ya da `_AKIS_MOD_TAM`'dan birine dokunuyorsan **ötekini de aç**.
Kapı seni yakalar ama kapıyı beklemek yerine ikizi kendin ara: bu repoda
"aynı işi yapan iki desen" kalıbının bilinen üçüncü örneği `13o gcFire`'dır.

İlgili: [[tanima-motoru]] (aynı 06 yüzeyinin kanıt kapısı dersi) ·
[[ihtimalsel-dil-devrimi]] (modelin ürettiği dilin register kapısı) ·
[[sohbet-reasoning-fix]] (aynı sohbet hattının timeout tarafı)
