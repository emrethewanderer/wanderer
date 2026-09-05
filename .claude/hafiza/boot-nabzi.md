---
name: boot-nabzi
description: "2026-08-19: boot yavaşlığının kökü ölçüldü — bundle değil, sıralı ağ turlarıydı; ama asıl bulgu perdenin onu örtmesi. 00h-boot-nabzi.js (bnMark/bnSar/bnHazir/bnRapor) zincirin eklemlerini çentikler; üç sıralı bekleme paralelleştirilip zincir 1331→905 ms medyana indi. Regresyon kapısı SÜRE değil YAPI ölçer."
metadata:
  type: project
---

**Sorunun doğru sorusu "boot kaç saniye" değil: "perde inerken zincir bitmiş mi?"**

`_splashPlan(uid)` açılış perdesini üç kademeye böler — aynı oturumda tekrar
boot **0 ms**, aynı gün ikinci giriş **2000 ms**, yeni gün **4000 ms**
([[acilis-perdesi]]). Yani "uygulama geç açılıyor" hissinin 2-4 saniyesi
kasıtlı bir törendir. Ölçüm hükmü:

| Perde katı | Perde | Zincir | Sonuç |
|---|---:|---:|---|
| yeni gün | 4538 ms | 3924 ms (soğuk) | zincir 1906 ms önce bitti ✓ |
| aynı gün | ~2000 ms | ~905 ms | önce bitti ✓ |
| aynı oturum | 0 ms | 905 ms | **905 ms açıkta** ⚠ |

Yani boot'ta darboğaz yoktu, perde onu örtüyordu; gerçek açık yalnız kat 0'da.
Tümüyle kapatmak perdenin süreye değil **zincire** bağlanmasını ister — bu bir
tören kararıdır, Emre'nindir, bu sprintte YAPILMADI.

**Motor: `js/parts/00h-boot-nabzi.js` (önek `bn`).** İmport'suz SAF YAPRAK —
`main.js`'in ilk import'u olduğu için bundle exec'inin gerçek başını yakalar.
GOTCHA: `import` ifadeleri hoisted'dır, bu yüzden exec başlangıcı `main.js`'in
GÖVDESİNDEN çentiklenemez (oraya yazılan çentik 120 modül çalıştıktan sonra
düşer); çentik modülün kendi üst düzeyinde durur. `bnSar(ad, fn)` senkronu da
promise'i de aynı kapıdan geçirir, hata yolunda bile bitiş çentiği atar ve
hatayı YUTMAZ. İdempotent DEĞİL: aynı ad iki kez düşerse iki satır olur —
çifte init gizlenmez, gösterilir ([[toren-kuyrugu]]).
Rapor: `window.bnRapor()` (konsol tablosu) · `window.bnDefter()` (ham).

**Ölçüm tuzakları (ikisi de bu sprintte yaşandı):** (1) sahte uid UUID
değilse Supabase `22P02` döner ve ölçüme yabancı 400'ler karışır —
`crypto.randomUUID()` kullan; (2) iframe'de perde ömrü güvenilmez (arka
plan timer kısılması, bir turda 12983 ms), perde/zincir karşılaştırması
ANA pencerede yapılır. Ayrıca preview konsol buffer'ı navigasyonla
temizlenmez — "konsol temiz" iddiası TEMİZ SEKMEDE kurulur.

**Bulunan darboğaz — "adsız 1200 ms".** Perde açıldıktan sonra üç ardışık
`await`: `profiles.select` → `loadSettings` → `loadKnowledge`. Üçü de
paralelleştirildi (bağımlılıklar tek tek denetlendi: `loadKnowledge` ne
`S.isAdmin`'e ne `S.settings`'e bakıyor), ayrıca `loadAllChatHistory` paralel
bloğun içine alındı (bloktaki yedi yüklemenin hiçbiri `S.allSessions`'a
dokunmuyor). **Zincir 1331 → 904.7 ms medyan (896/904.7/911.2), ~%32.** Gürültüsüz
zeminde (geçerli UUID; sahte uid Supabase'de 22P02 + 400 üretiyordu)
kat 0 zinciri **791.5 ms**.
Kalan en büyük kalem `zincir-kk` (~316 ms, kkInit + deste sidecar'ı).

**Kapı SÜRE ölçmez, YAPI ölçer** (`tests/boot-nabzi.test.js` · "Boot zinciri ·
paralellik sözleşmesi"). Süre makineye ve ağa göre oynar (aynı zincir aynı
makinede 896-911 ms ama soğuk turda 3924 ms); CI'da süre eşiği anlamsızdır.
Test kaynak metnini tarar: profil sorgusu storageInit'ten ÖNCE tanımlanıp
SONRA bekleniyor mu, loadSettings/loadKnowledge aynı `Promise.all`'da mı,
sohbet geçmişi paralel bloğun İÇİNDE mi, `bnHazir()` `.catch`ten SONRA mı.
Kapının kırılabildiği negatif sınamayla doğrulandı.

**Why:** Boot yavaşlığı yıllarca tahminle konuşuldu; bir kez ölçülen 7929 ms
tek turluktu ve bu turda hiçbir koşulda tekrarlanmadı (anon `load` medyan
422 ms). Kök sorun ölçümün kendisiydi — repoda tek bir `performance.mark`
yoktu, dolayısıyla hiçbir iddia dayanıklı değildi.
**How to apply:** Boot şikâyeti geldiğinde önce `window.bnRapor()` çalıştır,
tahmin yürütme. Yeni bir boot adımı eklerken `bnSar` ile sarmala, yoksa
zincire adsız bir pay eklemiş olursun — "adsız 1200 ms" tam olarak böyle
doğdu. Bundle boyutunu suçlamadan önce [[bundle-diyeti-sidecar]]'ı oku:
derleme boot'un %1.2'sidir.
Plan + ölçüm tabloları: `.claude/plans/boot-nabzi.md`
Bağlar: [[cekirdek-omurga-haritasi]] · [[preview-harness-anon-oturum]] ·
[[preview-sw-bayat-modul]] · [[ritual-streak-unity]]
