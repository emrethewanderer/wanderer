---
name: artifact-galerisi
description: İç Çalışma Atlası ve 18 oda raporu artifact olarak claude.ai galerisinde yaşar, repoda değil — uzak oturum onları listelemeden göremez; adres tablosu .claude/artifacts.md'dedir
type: gotcha
---

# Artifact'lar repoda değil galeride yaşar — indeks `.claude/artifacts.md`

Kaynak: 2026-09-02, Emre "lokalde artifacts olarak çalıştığımız 19 adet
artifacts vardı, onları burada göremiyorum" dedi.

**Why:** [[claude-altyapisi-commit-disi]] "diskte var, repoda yok" ayrımını
kurar. Artifact'lar **üçüncü** bir yerdedir: ne diskte ne repoda — claude.ai
galerisinde. Bu yüzden onları commit ederek kurtarmak diye bir şey yoktur;
kaybolmuş da değillerdi. 2026-09-02'de on dokuz çalışma "kayıp" sanıldı,
`Artifact({ action: "list" })` hepsini birinci çağrıda buldu.

Yanılgının ikinci bir sebebi daha vardı ve kaybolma hissini o üretti: sayı
tutuyordu ama **iki oda galeride numarasız adla duruyor**. Atlas'ın 04'ü
"Kart Evreni", 05'i "Ritüellerin Nabzı" başlığıyla yayımlanmış — "İç Çalışma"
diye tarayan göz on altı oda sayar, ikisini yok sanır. Yani eksiklik
galeride değil, **taramanın deseninde**ydi.

Sayım (2026-09-02 galerisi): **20** artifact = Atlas (00) + 18 oda + ayrıca
"Emniyet Katmanı · Güvenlik ve Sorumluluk Çalışması". Sonuncusu setin parçası
değildir; daha eski ve ayrı bir rapordur, ama Atlas'ın rapor estetiğinin
KAYNAĞIDIR (Atlas CSS banner'ı onu adıyla anar) — repodaki karşılığı
`GUVENLIK-VE-SORUMLULUK-CALISMASI.md`. Emre'nin saydığı 19, Atlas + 18 odadır.

**How to apply:**
- Emre bir "çalışma", "rapor", "oda" ya da "atlas" arıyor ve repoda yoksa,
  yok olduğunu SÖYLEME — önce `.claude/artifacts.md` tablosuna bak, oradan
  URL'yi al. Tablo eskiyse `Artifact({ action: "list", scope: "mine" })` ile
  tazele; başlıklar ve tarihler değişir, URL'ler kalıcıdır.
- Bir odanın içeriği gerekiyorsa `Artifact({ action: "read", url })` tam HTML'i
  bir dosyaya indirir — repoda kopyası yoktur, iddiasını oradan doğrula.
- Yeniden yayında **mevcut URL'yi `url` parametresiyle geçir**. `url`'süz
  yayın yeni bir artifact doğurur; o an Atlas'ın 18 bağından biri sessizce
  ölü kalır ve `.claude/artifacts.md` yalan söylemeye başlar.
- Bir artifact'ı ada göre arayan tarama, adın numarasız olabileceğini hesaba
  katmalı: sayı tutmuyorsa önce eşleştirmeyi (`.claude/artifacts.md`
  "Atlas'taki ad / Galerideki başlık" sütunları) kontrol et, sonra kayıp
  hükmü ver. Sayının eksikliği, şeyin eksikliği değildir.

İlgili: [[claude-altyapisi-commit-disi]] (aynı sınıfın repo tarafı: diskte
var, repoda yok) · `.claude/artifacts.md` (adres tablosunun kendisi)
