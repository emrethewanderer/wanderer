---
name: kart-yagmuru-toren-ritmi
description: "Kart yağmuru TEŞHİSİ (2026-07-27, hâlâ geçerli: minEvidence barajı ardında 78 kart) — ilk panzehir (tavan+yelpaze) aynı gün SÖKÜLDÜ, yerine Oluş Mührü geçti"
metadata: 
  node_type: memory
  type: project
  originSessionId: 2605f6aa-59ac-4534-a45f-7cd8547199f4
  modified: 2026-07-27T20:37:52.510Z
---

**Şikâyet (2026-07-27):** "Sohbetten bir mesaj attım ve bir sürü yeni kart açıldı."

**Kök teşhis (ölçüldü, varsayılmadı):** `minEvidence` nadirlik başına TEK global
kapıdır (12b `RARITIES`: yaygin 3 · nadir 8 · nadide 16 · efsane 30). Skoru
çoktan yeten kartlar o kapının arkasında **birikir**; kapı aşıldığı an hepsi
aynı `kkTick`'te düşer. Olgun bir profille ölçüm: **78 kart** (112'nin %70'i)
kapı ardında bekliyordu, `sessions` 7→8 geçişinde **tek anda +31 kart**.

**Sohbet neden tetikliyor:** `kkEvidence` (10q) `sessions`'ı sayar =
`Object.keys(S.allSessions).length`, evidence'ın en hızlı artan bileşeni. Ve her
mesaj `kkTick` çağırır (09a `personalizationAnalyze` sonu). Yani barajı yıkan kol
çoğu zaman sohbetten atılan bir mesajdır. Yağmurun ikinci yarısı sunum
zinciriydi: `close()` → 350 ms → `kkMaybePresent` → sıradaki tören.

> ⚠️ **AŞAĞIDAKİ PANZEHİR AYNI GÜN SÖKÜLDÜ (2026-07-27, ikinci tur).**
> Teşhis (78 kart, sohbetin barajı yıkması, sunum zinciri) **geçerlidir** ve
> yeni tasarımın temelidir; çözüm geçersizdir. Emre ilk panzehri görünce kökü
> gösterdi: *"Wanderer böyle kart dağıtamaz! Wanderer'da kullanıcı kartını
> belirler ve Emre öneri olarak sunar."* Tavan/kuyruk/yelpaze bir **dağıtım
> hattının** parçalarıydı — akışı yavaşlatmak sorunu çözmüyordu (78 kart ÷ 3
> = ~26 gün). Güncel tasarım: [[olus-muhru-karari]].
> Sökülenler: `KK_GUNLUK_TOREN` · `kk.sunum` · `kk.pending` · `kkMaybePresent`
> · `kkOpenFan` · `kk.tavan.dolu`. **`.kk-fan*` stilleri KALDI** (12f tüketicisi).

**Geçersiz kalan karar (tarihsel):** *"Yalnız ritim + yelpaze"* — `minEvidence`'a
DOKUNULMADI (baraj duruyor) ve geriye dönük onarım YAPILMADI (13l ilkesi: kart
geri alınmaz, persona silinmez). Bu iki ilke **hâlâ geçerli**.

**Sökülen panzehir (tarihsel kayıt):**
- `KK_GUNLUK_TOREN = 3` + `kk.sunum { gun, sayi, doluBildirildi }` — **kazanımı
  değil SUNUMU sınırlar**: kart kazanıldığı an koleksiyona yazılır (`kkTick`),
  yalnız töreni güne yayılır. `pending` IndexedDB'de kalıcı → hiçbir kart
  kaybolmaz. Gün anahtarı `localISODate()` ([[yerel-tarih-anahtari]]).
- `kkOpenFan(cardIds)` — aynı gün düşen kartlar ARDA ARDA değil YAN YANA:
  folyo bir kez yırtılır, kartlar yelpazede kaskad flip olur. Evrim ve sentez
  yelpazeye KARIŞMAZ (kendi jestleri var); grup sıradaki özel törende kesilir.
- Yelpaze primitifi göçtü: `.hz-fan*` → `.kk-fan*`, hazine.css'ten **10q
  `kkEnsureStyles`'a** taşındı. İki tüketici: `kkOpenFan` + 12f `hzOpenPack`
  (12f zaten `kkEnsureStyles()` çağırıyor). DOM id'leri kendi öneklerinde kaldı
  (`#kk-fan` / `#hz-fan`) — sınıf ortak primitif, id modülün kendi düğümü.

**İki gotcha (öz-denetimde yakalandı, ikisi de sessiz kırardı):**
1. **`animation:none` fill-mode'u da siler.** `.kk-fan-card` açılış durumu
   animasyonun İÇİNDE (`opacity:0 → 1`, `both`). reduced-motion'da yalnız
   `animation:none` demek kartı `opacity:0`'da dondurur — bitiş durumu elle
   verilmeli: `animation:none!important;opacity:1;transform:none`.
2. **`kkEnsureStyles`'ın CSS'i bir template literal** — içine yazılan yorumda
   backtick KULLANILAMAZ, build'i rollup parse hatasıyla kırar.

**O turun bilinen sınırı** (paylaş butonu `kkOpenPack`'te vardı, `kkOpenFan`'da
yoktu) **Oluş Mührü'nde kapandı**: yelpaze gitti, tek tören kaldı, paylaşım
mühür perdesinde yaşıyor.

**Kalıcı ders:** Bir taşmayı yavaşlatmak, taşmanın kaynağını meşrulaştırır.
"Ne hızda verelim?" sorusu sorulduğunda asıl soru atlanmıştır: "Neden elimizde
verilecek bir stok var?"

İlgili: [[olus-muhru-karari]] · [[kisilerim-kart-motoru]] · [[kimlik-motoru]] ·
[[hazine-destesi-kart-paketleri]] · [[holo-kart-motoru]]
