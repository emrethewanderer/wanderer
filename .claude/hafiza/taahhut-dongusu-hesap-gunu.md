---
name: taahhut-dongusu-hesap-gunu
description: 13-extras.js Özellik 3 — Söz Defteri/Hesap Günü (Pazartesi taahhütleri → Perşembe+ yüzleşme); 2026-07-24 çöp-kayıt + taşan-liste düzeltmesi
metadata: 
  node_type: memory
  type: project
  originSessionId: 408d955c-2b0d-41a1-8a32-29f86ac3f858
  modified: 2026-07-24T14:23:00.204Z
---

`js/parts/13-extras.js` **ÖZELLİK 3: HESAP GÜNÜ** (`showHesapGunu`, `getHesapGunuContext`) —
[[gunluk-ritus-armagan-soz]]'dan (10s, günlük Armağan+Söz pop-up) TAMAMEN AYRI bir sistem,
daha eski ve haftalık: sohbet sırasında `captureCommitments()` (00-config-tracking.js)
`dp('detect.commitment')` regex'leriyle taahhüt benzeri cümleleri (`yarın X yapacağım` vb.)
yakalar, `STORAGE_KEYS.COMMITMENTS(uid)` altında en fazla 20 kayıt tutar. Perşembe'den
itibaren (`dayOfWeek>=4`), günde bir kez, bekleyen (`!checked`) tüm taahhütleri bir modal'da
listeleyip TUTTUM/TUTAMADIM sorar (`resolveCommitment`); tutulan başına +4 elmas.

**2026-07-24 BUG (Emre ekran görüntüsüyle bildirdi):** Hesap Günü modalı onlarca satırlık,
çoğu tırnak içi TEK KARAKTER (`"e"`, `"t"`…) veya boş metinli taşan bir listeye dönüşmüştü,
"Good day, Emre." arkadan sızıyordu. **Kök neden ikili:**
1. **Eski veri çöpü** — `captureCommitments`'ta ÖNCEDEN düzeltilmiş kritik bir bug vardı
   (yorum satırı 627-629'da belgeli): `detect.commitment` girdileri `{pattern, extract}`
   nesnesi taşıyor, ama eski kod `text.match(entry)` ile nesneyi DOĞRUDAN regex'e veriyordu.
   JS bunu `String(entry)` → `"[object Object]"` → `/[object Object]/` karakter-sınıfına
   çeviriyor; bu, HERHANGİ bir mesajdaki `o/b/j/e/c/t/boşluk` harflerinden birine eşleşen
   "her metinle eşleşen sahte regex" haline geliyor ve `m[0]` (tam eşleşme) TEK KARAKTER
   oluyordu. Kod düzeltildi ama depoda (SafeStorage/SecureStorage, per-uid) birikmiş çöp
   kayıtlar `checked:false` olarak kalıp her Perşembe+ günü yeniden yüzeyleşiyordu.
2. **Taşan liste** — `.hesap-list` div'inde `max-height`/`overflow-y` YOKTU; `.overlay`
   flex-center içinde uzun liste viewport'u aşınca mobilde kontrolsüz kayma oluşuyordu.

**Düzeltme (13-extras.js + 00-config-tracking.js):** yeni `getCleanCommitments()`
(00-config-tracking.js) — storage'ı okur, `!checked && text.trim().length<3` olan kayıtları
SESSİZCE `checked:true, kept:null` yapıp kalıcı yazar (kullanıcıya göstermez, ödül vermez;
zaten `checked:true` olan geçmiş kayıtlara DOKUNMAZ). `getPendingCommitmentContext`,
`showHesapGunu`, `getHesapGunuContext` artık ham `SecureStorage.get` yerine bunu kullanıyor.
`.hesap-list`'e `max-height:50vh;overflow-y:auto;` eklendi (defans — gerçekten çok taahhüdü
olan kullanıcıda da modal viewport'u aşmaz, KAPAT/onay butonu hep görünür kalır). 6 yeni
test (`tests/00-config-tracking.test.js`), 1134 test yeşil, build 643KB.

**How to apply:** Bu sistemde yeni bir `detect.*` regex eklenirken `{pattern, extract}`
biçimini KORU — `entry instanceof RegExp ? entry : entry?.pattern` guard'ı (00-config-tracking.js:631)
olmadan aynı sınıf bug geri gelir. Depoda benzer bir "geçmiş bug'ın çöp verisi" şüphesi
varsa `getCleanCommitments()` deseni (kısa-metin heuristiği + sessiz kapatma + kalıcı
yazma) örnek alınabilir.
