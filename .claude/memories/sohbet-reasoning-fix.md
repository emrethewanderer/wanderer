---
name: sohbet-reasoning-fix
description: Reasoning modelinin doğal gecikmesi ~25 sn; eski 22 sn'lik timeout her turda fallback'e düşürüyordu — sınır 45 sn'ye çıkarıldı ve tasarım kurulamazsa FALLBACK YOK, null döner ve kullanıcı hiçbir şey görmez (§6.2)
type: gotcha
---

# Sohbet reasoning timeout'u — 22 sn sessiz bir "hep başarısız" demekti

> **Bu dosya hakkında.** `js/parts/10A-gecis-karti.js:564` ve `:594` bu ada
> `[[sohbet-reasoning-fix]]` diye bağ veriyordu; hedef dosya
> `.claude/memories/` altında yoktu. Özgün dosya repoya hiç girmedi
> ([[claude-altyapisi-commit-disi]]); **bu metin kurtarma değildir**, bugünkü
> koddan yeniden keşifle yazıldı.
>
> **Kayıp olan: ölçümün kendisi.** `~25 sn` sayısı yalnız iki kod yorumunda
> kayıtlıdır (`10A-gecis-karti.js:563` ve `:593`); kaç örnekten, hangi
> modelden, hangi tarihte ölçüldüğü repoda yok. Bu dosya sayıyı bir
> **KAYIT** olarak aktarır — yeniden üretilmiş bir ölçüm olarak değil.
> Yeni bir sınır seçmeden önce **yeniden ölç**.

**Why:** Geçiş Kartım'ın tasarımı bir reasoning modeline sorulur ve o modelin
doğal gecikmesi normal bir tamamlamadan uzundur. Eski timeout **22 sn**
idi — yani sınır, ölçülen gecikmenin (~25 sn) **altındaydı**. Sonuç bir
"bazen olur" değil, bir **her zaman**dı: çağrı her turda zaman aşımına
düşüyor ve akış fallback'e geçiyordu. Kod yorumu sonucu tek cümleyle
adlandırıyor: *"Keynote'taki ekranın kökü buydu"* (`10A:564`).

Bugünkü sınır **45 sn**dir (`_designDual` → `_llmJSON(prompt, 45000, 1200)`,
`10A:571`).

Kırığın öğrettiği asıl şey sayının kendisi değil, **sessizliği**dir: bir
timeout aşıldığında hiçbir kapı kırılmaz. Build yeşil, test yeşil, konsol
temiz — yalnız özellik hiç çalışmaz ve ekranda hep "ikinci en iyi" görünür.
Aynı sınıfın başka örnekleri için bkz. [[guvenlik-emniyet-katmani]] ve
[[odev-zinciri-ve-cipi]].

**İkinci karar — FALLBACK YOK.** `gkDesignForChat` (`10A:596-604`), kullanıcı
hiçbir şey istemeden, mesaj biter bitmez arka planda koşar. Kullanıcı
beklemediği için timeout rahattır; ama tasarım kurulamazsa **`null` döner ve
10B hiçbir çerçeve çizmez**. Yorumun kendi ifadesiyle: *"Kullanıcı
tutulamayacak bir vaat görmez (§6.2)."*

Aynı ilke `_designDual`'da da yazılı (`10A:559-566`): altın kutup
kurulamazsa **NULL** döner — *"sahte kart çizilmez"*; çağıran ya "Ocak
soğudu" sahnesini gösterir (Bugün) ya da hiç davet etmez (Sohbet). Lapis
ayrıdır: çözülemezse null kalır ve akış S4'te `_designLapis`'e düşer —
*"altın onaylıyken töreni yarıda kesmek anlamsız — katmanlı emniyet"*.

**How to apply:**

## 1 · Bir LLM çağrısına timeout koyarken önce ölç

Sınırı "makul görünen" bir sayıdan seçme. Reasoning modelleri normal
tamamlamalardan belirgin biçimde yavaştır; sınır ölçülen gecikmenin altına
düşerse özellik **her turda** değil, **hiçbir turda** çalışmaz — ve bunu
hiçbir test söylemez.

## 2 · Zaman aşımını görünür kıl

Bu kırık 22 sn'de aylarca sessiz yaşadı. Yeni bir çağrı yazarken sor:
*timeout dolduğunda bunu nereden anlarım?* En ucuz cevap `console.warn`
(bu repoda doğrulama tarayıcısı uyarıyı **ihlal** sayar, [[dogrulama-tarayicisi]]
— yani sessiz kalmaz).

## 3 · Fallback'i "nazik" sanma

Bu hattaki karar bilinçlidir: tasarım kurulamadıysa **hiçbir şey gösterme**.
Yarım bir kart, jenerik bir metin ya da "Olunan Kişi" gibi bir yer-tutucu
göstermek kullanıcıya tutulamayacak bir vaat verir. `null` dönmek burada bir
eksiklik değil, sözleşmedir.

İlgili: [[llm-bicimleri-geri-sizar]] (aynı sohbet hattının biçim tarafı) ·
[[ilham-kartlari-sosyal-feed]] (3.0 kararı — "davet, ancak demir tuttuysa
gelir"; bu timeout onun ön koşulu) · [[guvenlik-emniyet-katmani]] (sessizce
çalışmayan yolun daha ağır bir örneği)
