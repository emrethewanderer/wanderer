---
name: koken-kor-noktalar
description: 2026-08-02 sprinti — P6 serbest metin kanıta bağlandı + statik denetçinin körlüğüne karşı davranışsal kapı (Sıfır Kanıt Sınavı)
metadata: 
  node_type: memory
  type: project
  originSessionId: c11c71e3-e6eb-4731-9fc7-646eafab0223
  modified: 2026-08-02T20:28:07.314Z
---

Gerçeklik Mimarisi'nin iki **Dürüst Uyarısı** kapatıldı (plan:
`.claude/plans/koken-kor-noktalar.md`, sekiz faz tam, 1762 test yeşil).

**Cephe 1 — 09a serbest metin alanları.** `open_loops` / `life_facts` /
`important_dates` artık `kanit_ref` zincirinden geçiyor: `kokenSozBlok`
prompt'a numaralı blok basar, model `[S3]` diye gösterir, `kokenAlintiCoz`
metni kaynaktan keser. Kanıtsız madde **hiç doğmaz**. Her P6 kaydı
`kaynak` (`olcum`/`yorum`/`beyan`) + `kanit` damgası taşır; kapı
`kokenKayitVar` (13y — düz kayıtlar için `kokenVar`ın kardeşi). Damgasız
kayıt prompt'a, panele, cazibe metnine giremez ve `p6KokenTemizlik`
tarafından silinir (`etw_koken_temiz_v3_*`).

**Tarih de gösterilir, yazılmaz:** model ISO tarih üretmez, cümledeki ham
ifadeyi (`tarih_metni`) verir; `p6TarihCoz` çözer. İfade kanıt cümlesinde
geçmiyorsa madde düşer. Göreli tarihler bilerek dışarıda — bir yıldönümü
"gelecek hafta" olamaz.

**Ad göçü:** `lifeFacts[].confidence` → `n` (bir güven değil, "kaç kez
görüldü" sayacı). Geri-okuma `_p6MigrateFacts`'te. **Sınır:**
`S._userProfile.current/desired.confidence` BAŞKA bir alandır, göç ona
dokunmaz — körü körüne grep-replace üç modülü kırar.

**Cephe 2 — denetçinin körlüğü.** Kök neden biçim değil **sözcük listesi**:
listede olmayan her kavram adı yeni bir kör nokta açar. Kanıtı sprintin
kendisi verdi — `alliance_strength: 50` ve `optimal_challenge_level: 0.5`
aylardır state'te duruyordu, ikisi de kullanıcı hakkında ölçülmemiş
iddiaydı, dört kuralın hiçbirine görünmüyordu.

Denetçiye K5 (atama/parametre varsayılanı — kelime sınırı BİLEREK gevşek,
çünkü `\b` `optimal_challenge_level` içindeki kavramı göremiyordu) ve K6
(sabite düşme) eklendi; `confidence` K1/K1b listesine girdi; banner'a
**"KAPININ GÖREMEDİĞİ"** kör nokta defteri yazıldı.

**Asıl hamle statik kapıyı tek dayanak olmaktan çıkarmak:**
`tests/sifir-kanit-sinavi.test.js` avlamaz, çıktıya bakar — envanteri
koddan türetir, boş kullanıcıda state'in sayısal varsayılanlarını,
prompt yüzeylerinin sessizliğini (39 sessiz / 7 gerekçeli muaf) ve 112
kartın `hazirlik === 0` oluşunu ölçer. Emre'nin elle yaptığı ölçüm artık
her koşuda yeniden yapılıyor.

**Why:** Bir kapı, göremediği yer kadar zayıftır; ve statik analizle tam
kapatma imkânsızdır. Doğru cevap kuralı büyütmek değil, ikinci bir kapı
türü eklemek — biri deseni avlar, diğeri davranışı zorunlu kılar.

**How to apply:** Yeni bir sayı/yargı üreten özellik yazarken önce
`kokenKayitVar`/`kokenVar` kapısını tak. Denetçi bir şeyi kaçırdıysa önce
kural yazılabiliyor mu diye bak (K1b ve K5 böyle doğdu); yazılamıyorsa
Sıfır Kanıt Sınavı'na blok ekle. Kör noktayı yalnız belgeleyip bırakmak,
kapıyı gerçek olduğundan güçlü göstermektir.

İlgili: [[gerceklik-mimarisi]] · [[kesin-alinti-mimarisi]] ·
[[personalization-engine-layers]] · [[ad-senkronu-kurali]] ·
[[olu-kod-temizlikleri]]
