---
name: gecmis-gunler-ozet-zinciri
description: "2026-08-19 — 'Geçmiş Günler boş' şikâyetinin kökü liste değil ÜRETİMDİ: w3GenerateDeepSummary bare identifier yüzünden her çağrıda ölüyordu; üstüne dört kırık daha (sahte ok:true, mühürlenen lastCheck, tembel yükleme yok, kırık zincirin bıraktığı YALAN DAMGALAR)"
metadata:
  type: project
---

Emre'nin şikâyeti: *"Özetler, Geçmiş Günler çalışmıyor!"* — ekranda
"Henüz özet bulunmuyor" yazıyordu. Liste doğru çiziyordu; **yazacak veri
hiç doğmamıştı.** Zincir baştan sona kırıktı ve dört ayrı kat birbirini
örtüyordu:

| # | Kırık | Etkisi |
|---|---|---|
| 1 | `12-w3-journey.js:62` — `getUserFirstName` / `p` importsuz (bkz. [[yetim-kopru-denetcisi]] ikinci sınıf) | **KÖK:** `w3GenerateDeepSummary` her çağrıda `ReferenceError` ile ölüyordu; hiç özet yazılmadı |
| 2 | İki `insert` de patlasa `{ ok: true }` dönüyordu | §6.2 sahte başarı: çağıran "özetin hazır" push'u atıyor, DB boş |
| 3 | `w2CheckAndSummarizeYesterday` sonuçtan bağımsız `lastCheck` mühürlüyordu | Bir kez patlayan gün **bir daha hiç denenmiyordu** |
| 4 | `chDrawerOpen` → `_chRenderList` cache'i hiç yüklemiyordu | Cache `null`'sa (her özet üretimi onu `null`'lar) liste "özet yok" der |

Ayrıca `w2LoadSummariesCache` `error`'u hiç okumuyordu (`const { data } =`)
ve hata yolunda `S._w2SummariesCache = new Map()` yazıyordu — RLS/ağ hatası
**kalıcı "özet yok"** olarak mühürleniyordu. Artık hata yolunda cache
mühürlenmez (`null` kalır), sonraki açılış yeniden dener.

## Yanlış teşhis de bir kırıktır

Gün kapanışında üretim patlayınca ekran *"Bugün özet çıkarmaya yetecek kadar
konuşmadık"* diyordu. Kullanıcı konuşmuştur; yazılamayan özettir. `reason`
ayrıldı: `insufficient` → eski metin, `db`/`parse` → `closure.failed`
("Konuştukların duruyor — özet ilk fırsatta yeniden denenecek").

## Neden yıllarca görünmedi

Üç `try/catch` üst üste yutuyordu: `closureRevealSummary` catch'i,
`w2CheckAndSummarizeYesterday` catch'i, ve `_chRenderList`'in sessiz boş
durumu. Build yeşil, konsol (kullanıcıda) sessiz, test yok. Sessiz düşüş
(§5.2 "asla bloklama") **hata yolunu da** sessizleştirdiğinde savunmacı
stil savunmasızlığa dönüşüyor.

## Beşinci kat: kırık zincirin bıraktığı yalan damgalar

Kök düzeltildikten sonra bile ekran boş kalacaktı. `w3RunMigration` geçmişi
gün gün özetler ve her günü `try/catch`e alır; üretim her çağrıda
ReferenceError attığı için döngü hatayı yutup **"tamamlandı" damgasını** hem
cihaza (`w3_migration_done_<uid>`) hem Supabase'e (`user_analytics`) yazdı —
sıfır özet üretmişken. Gece yarısı kontrolü de her günü mühürlemişti. Yani
kod düzelse bile hiçbir şey yeniden koşmazdı: **geçmiş kalıcı olarak
kilitliydi.**

`w3IsMigrationNeeded`'ın sorusu da terstiydi — *"flat (structured_summary
NULL) satır var mı?"* Hiç özeti olmayan kullanıcıda sorgu boş döner ve
migrasyon "gereksiz" sayılırdı; oysa geçmişi hiç özetlenmemiş kullanıcı tam
da migrasyona muhtaç olandır. Soru tersine çevrildi: **derin özet VAR MI?**

Onarım (`_ozetDamgaOnarimi`, post-auth'ta `w3MaybeRunMigration` başında):
kanıt `chat_summaries`'te derin özet satırıdır; yoksa iki damga da düşer,
ömür boyu bir kez (`etw_ozet_damga_onarim_v1_<uid>`). Okuma patlarsa damgaya
DOKUNULMAZ ve onarım hakkı harcanmaz — **kanıtsızlık, kanıtın yokluğu
değildir.**

**Ders:** sessizce yutulan bir hata yalnız o turu kaybettirmez — arkasında
"yapıldı" diyen kalıcı bir iz bırakırsa gelecekteki düzeltmeyi de etkisiz
kılar. Bir kırığı düzeltirken sor: *bu kırık çalışırken hangi damgaları
bastı, o damgalar hâlâ yalan mı?*

**Why:** Boş bir liste iki şey demek olabilir — "veri yok" ya da "veri
gelemedi". Uygulama ikisini ayırt etmiyorsa kullanıcıya yalan söyler.

**How to apply:** Bir liste boş durum gösteriyorsa üç soruyu sırayla sor:
(1) veri üretimi gerçekten koştu mu, (2) yazma başarılı mıydı, (3) okuma
katmanı yüklendi mi? Kapı: `tests/11-gecmis-gunler.test.js` üçünü de
mühürler. Sahte `ok: true` dönen her üretici §6.2 ihlalidir.

Bkz. [[yetim-kopru-denetcisi]] · [[sohbet-cekirdegi-ic-calisma]] ·
[[gerceklik-mimarisi]] · [[migration-konsolidasyonu]]
