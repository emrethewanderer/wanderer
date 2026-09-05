---
name: kota-brifingi-devir-noktasi
description: DEVİR bloğu YALNIZ kota %95 + kalan pay işi bitirmeye yetmiyorken yazılır; faz kapanışı turu bitirmez, plana ara verilmeden devam edilir
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2d880425-72dc-412c-9281-159b2643b844
  modified: 2026-08-10T16:50:06.115Z
---

Emre'nin durağan talimatı (2026-08-09): **kota bitmek üzereyken iş hâlâ
devam ediyorsa, sessizce tükenme — kaldığın yeri kolayca bulacağımız bir
brifing bırak.** Emre o brifingi yeni bir oturuma yapıştırarak işi kaldığı
yerden sürdürür; böylece kota, işin bütünlüğünü değil yalnız oturumun
uzunluğunu sınırlar.

Şablon ve kural `PROTOKOL-FABLE.md` §3.6 "Kota brifingi — devir noktası"nda
kanonik hâlde durur (§9'da "Kota daralınca" kontrol listesi, `CLAUDE.md`
yedek çekirdeğinde 7. madde).

**Why:** Bir oturum kotayla kesildiğinde kaybolan şey kod değil **bağlamdır**
— hangi fazdaydık, neyin yarım kaldığı, sıradaki hamlenin ne olduğu. Bu
bağlam yazılmazsa yeni oturum onu yeniden keşfeder: aynı dosyalar yeniden
okunur, aynı grep'ler yeniden koşar, yani kota bir kez daha aynı işe ödenir.
Brifing bu ikinci ödemeyi engeller — [[model-devri-sandvic]]'te planın
`## Kritik Dosyalar` ve `## Hafıza bağları` satırlarının yaptığı işin, oturum
sınırındaki karşılığıdır.

**Eşik tektir ve YÜKSEKTİR (Emre'nin kararı, 2026-08-10 ikinci tur).** Brifing
**yalnız iki koşul birlikte** doğruyken yazılır: (1) kota **%95**'e gelmiş,
(2) kalan pay **kalan işi bitirmeye yetmiyor**. Başka her durumda DEVİR YOK —
plana ara vermeden uygulamaya devam edilir.

**Faz kapanışı turu BİTİRMEZ.** Kuralın ara hâli "iyi an: bir faz kapanınca"
diyordu; pratikte bu her fazın sonunda rapor verip Emre'nin "devam" demesini
beklemeye dönüştü — yani uzun otonom sprint faz sayısı kadar parçaya bölündü,
her parça yeni bir onay turu istedi. Emre bunu durdurdu (2026-08-10, Geçiş
Ekranı sprinti). Faz kapanışında **kayıt noktası atılır ama tur sürer**:
TaskList güncel + plan dosyasına fazın durum notu ve sıradaki **İlk hamle** +
commit ([[oz-denetim-ve-commit-kapanisi]]) → kısa durum bildirimi → **sorusuz**
sonraki faz. Turun doğal sonu üçtür: sprint bitti (kapanış şablonu), gerçek
bir çatal çıktı ([[fable-5-ortaklik-ve-planlama]]), ya da yukarıdaki iki
koşullu kota eşiği doğru.

Eşiği yükseltmeyi güvenli kılan şey **kancadır**: Stop kancası her tur sonunda
`.claude/DEVIR.md`'yi yazar (`scripts/devir-notu.sh`): son commit,
`git status --short`, son commitler, en son plan + faz başlıkları. Oturum uyarı
görülmeden kesilse bile zemin yazılıdır ve kota harcamaz. Kancanın yazamadığı
tek şey **"İlk hamle"** yargı satırıdır — onu faz kapanışında model plana
yazar, turu kesmeden. Yeni oturum sırası: `.claude/DEVIR.md` → plan dosyası →
hafıza bağları.

**How to apply:**
- Faz bitti → kayıt noktası (TaskList + plan notu + commit) → kısa bildirim →
  **sonraki faz.** "Şimdi devam edeyim mi?" diye durma; bu bir onay noktası
  değil ([[fable-5-gorev-listesi-protokolu]]).
- Brifingi yazmadan önce eşiği sına: %95 değilse ya da kalan iş kalan paya
  sığıyorsa **yazma** — sprintin ortasında brifing yazmak, Emre'nin
  durdurduğu duraklamanın kendisidir.
- Eşik doğruysa önce diski toparla: yarım bir Edit build'i kırıyorsa tamamla
  ya da geri al.
  Faz bittiyse commit at ([[oz-denetim-ve-commit-kapanisi]], push yok);
  bitmediyse commit etme ama `git status --short` çıktısını brifinge koy.
- Blok turun **son metin mesajı** ve tek kopyalanabilir fenced blok olur
  (§2.4: Emre çoğu zaman ara anlatımı görmez).
- Sınav tek soru: *bu bloğu okuyan, oturumu hiç görmemiş bir model ilk
  hamlesini sormadan yapabiliyor mu?* Hayırsa brifing eksiktir.
- Blok şunları taşır: görev · plan dosyası + faz · biten · yarım (dosya:satır)
  · diskteki durum · **İlk hamle** · açık kararlar · doğrulama durumu ·
  ELLE bekleyenler · okunacak hafıza bağları.
- Brifingi ALAN oturum: plan + hafıza bağlarını okur, TaskList'i tazeler,
  **İlk hamle**yi sorusuz yapar — "nereden devam edeyim?" diye sormaz
  ([[fable-5-gorev-listesi-protokolu]]).
