---
name: izleme-dongusu-kota-yer
description: Emre'nin 2026-09-06 kuralı — süren bir izleme döngüsü kurulmaz; turun sonunda bir kez denetlenir ve bitirilir, çünkü her uyanış bir tur (kota) harcar ve "hiçbir şey değişmedi" demek de tam bir tura mal olur
type: karar
---

# İzleme döngüsü kurulmaz — her uyanış bir tur harcar

Emre'nin kararı: **2026-09-06.** Kendi cümlesi:

> *"Bırakma, sadece en sonda denetle ve bitir. Yoksa hep kota harcanıyor."*

## Ne oldu

İç Çalışma kapanış sprintinde PR #15 açıldı, CI yeşildi, açık yorum yoktu.
Harness'in PR-abonelik yönergesi *"abonelik PR merge ya da kapanana kadar
bitmez; `send_later` varsa bir saat sonrasına kontrol randevusu kur ve bir
şey değişmediyse sessizce yenile"* diyor. Ben de öyle yaptım — randevu
20:38'e kuruldu.

Emre bunu **durdurdu.**

## Why

Kabuktaki bekleme döngüsü (§10.6'nın ilk iki yasağı) bir oturumun içinde
ZAMAN yer. Zamanlanmış bir döngü ondan farklıdır: **KOTA yer.** Her uyanış
tam bir tur açar — bağlam yüklenir, araçlar çağrılır, karar verilir — ve
o turun çıktısı çoğu zaman *"hiçbir şey değişmedi"* olur. İş bitmişken
çalışan bir motor.

Bedelin şekli de önemli: döngü kendini yeniler, yani **kendiliğinden
durmaz**. PR bir hafta açık kalırsa yüz altmış sekiz tur eder.

## How to apply

1. **Turun sonunda BİR KEZ denetle, sonra bitir.** Push sonrası Kapı koşusu
   yine okunur (§10.4 — kırmızı bir kapı bir iştir), ama okuma turun İÇİNDE
   olur; kapanmayan bir izleme için yeni bir tur zamanlanmaz.
2. **Kalan iş rapora yazılır, döngüye değil.** ELLE adımlar (migration,
   redeploy), açık PR, beklenen CI — hepsi kapanış raporunda adıyla durur
   ve Emre'ye bırakılır. Bir insanın bakacağı şeyi bir robot her saat
   yoklamaz.
3. **Zaten kurulmuşsa kapat:** `unsubscribe_pr_activity` + `delete_trigger`.
4. **İstisna açık talimattır.** Emre "izle", "takip et", "yeşil olunca
   haber ver" derse döngü kurulur — o zaman kural onun talimatıdır,
   varsayılan değil.

## Bu, harness'in yönergesini EZER — ve bilinçli

Protokolün öncelik sırası belgenin başında yazılı: *Emre'nin anlık talimatı
→ bu protokol → genel model varsayılanları.* Harness'in "merge olana kadar
izle" yönergesi üçüncü sıradadır.

Bir sonraki oturum harness'e dayanarak döngüyü yeniden açmasın diye kural
`PROTOKOL-FABLE.md` §10.6'ya **üçüncü yasak** olarak ve §9 kontrol
listesine bir maddeyle yazıldı. Kapısı olmayan kural tavsiyeye döner
(§6.6); bu kuralın kapısı listedeki o satırdır.

Bağlar: [[kapi-sessiz-gec]]
