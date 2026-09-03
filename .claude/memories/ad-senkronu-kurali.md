---
name: ad-senkronu-kurali
description: §4.3'ün uygulamadaki izi — üç tamamlanmış ad göçü (Portrem, Geçiş Kartım, İlham Kartı), storage geri-okuma katmanları, 42P01 tablo fallback'i; ve bilinçli olarak senkronlanmayan adlar (legacy enum/tablo) neden öyle bırakıldı
type: prosedür
---

# Ad senkronunun uygulamadaki izi — göçler, geri-okumalar, bilinçli istisnalar

> **Bu dosya hakkında.** `js/parts/i18n/en-deste.js:22` bu ada
> `[[ad-senkronu-kurali]]` diye bağ veriyordu; hedef dosya
> `.claude/memories/` altında yoktu. Özgün dosya repoya hiç girmedi
> ([[claude-altyapisi-commit-disi]]); **bu metin kurtarma değildir**, bugünkü
> koddan yeniden keşifle yazıldı.
>
> **Bu dosya KURALI TEKRARLAMAZ.** Kural `PROTOKOL-FABLE.md` §4.3'te tam
> hâliyle yazılı (beş adımlı göç prosedürü dahil) ve orası tek kaynaktır.
> Burada yazan şey kuralın **repodaki izi**: hangi göçler yapıldı, geri-okuma
> katmanı nasıl kuruldu, hangi adlar bilerek senkronlanmadı.
>
> **Kayıp olan:** göçlerin ad haritalarının plan dosyaları. §4.3 haritanın
> plana yazılmasını şart koşuyor ama o planlar `.claude/plans/` altında yok —
> haritalar bugün yalnız kodun içinden okunabiliyor.

**Why:** Kural soyut kalırsa uygulanmaz; bu repoda üç göç **tamamlanmış** ve
üçü de aynı iskeleti kullanıyor. Yeni bir ad değişimi yapacaksan kopyalayacağın
emsal bunlardır.

## Tamamlanmış göçler

| Göç | Kod yüzeyi | Storage | Tablo |
|---|---|---|---|
| "Benlik Kartı" → **Portrem** | önek `por*` (`02c-portre.js`) | `etw_benlik_*` → `etw_portre_*`, `_porMigrateKeys` ile `[yeni, eski]` çiftleri (`02c:100`, çağrısı `:137`) | `benlik_karti` → `portre` (`02c:163-168`) |
| "Anın Kartı"/"Benim Kartım" → **Geçiş Kartım** | önek `gk*`, state `_gecisKartlari`, dosya `gecis-karti` (`10A:3`, `js/state/gecis-karti.js:6-7`) | `_OLD_STORAGE_KEYS = ['etw_an_kartlari_v2','etw_an_kartlari_v1']`, yeni anahtar boşsa eskiden geri-oku (`10A:122,155`) | `an_kartlari` → `benim_kartlarim` → `gecis_kartlarim` |
| "İlham Kartı" → **Geçiş Kartım omurgası** | ayrı sınıf kaldırıldı | — | legacy bırakıldı — bkz. [[ilham-kartlari-sosyal-feed]] |

## Üç imza deseni

**1 · Storage geri-okuma katmanı (§4.3 madde 4).** Yeni anahtar boşsa eskiden
oku, yeni ada yaz, eskiyi bırak. Veri kaybı kabul edilmez; iki emsal yukarıda.

**2 · Tablo adı için 42P01 düşüş zinciri.** Kod, migration'ın koşup
koşmadığını **varsaymaz** (§6.5). `02c-portre.js:163-168` kalıbı:

```js
/* Ad senkronu (§4.3) — tablo da yeni adı taşır. mig 039 ELLE iştir ve
   deploy edilmiş VARSAYILMAZ: yeni ad 42P01 (undefined_table) dönerse
   oturum boyu eski ada düşülür (10A _gkTable kalıbı). */
const PORTRE_TABLE = 'portre';
const PORTRE_TABLE_LEGACY = 'benlik_karti'; // mig 039 koşmadıysa
```

Aynı dosyada ikinci bir zincir daha var: `42703` (kolon yok) → evrim
alanlarını çıkarıp yeniden dene (`02c:170-172`) — bkz. [[kisi-kartlari]],
aynı desenin şema tarafı.

**3 · İç ad = görünen ad, i18n dahil.** `en-deste.js:22`: kitap adları
**sözlükteki resmî karşılıklarıdır** (15e/16e — *Relationship Philosophy*,
*Mindset Revolution*) — *"uydurulmaz"*. Yani ad senkronu yalnız kod
tanımlayıcılarını değil, çeviri yüzeyini de bağlar: bir kitabın adı
transcreation sırasında yeniden icat edilemez.

> **Tuzak — "mig 039" diye bir dosya YOK ve aramak boşuna.** Kod birkaç
> yerde `mig 025`, `027`, `031/032`, `039` diye migration numarası anıyor;
> `migrations/` altında yalnız `000_wanderer_schema.sql` ve `041`–`050` var.
> Sebep `migrations/README.md`'de yazılı: **2026-07-25'te 001–040 arası kırk
> migration `000`'de birleştirildi, eskiler silindi.** Ad göçlerinin SQL'i
> bugün `000_wanderer_schema.sql` **§2 · AD GÖÇÜ** bloğundadır (`:81-121`) —
> `to_regclass` kapılı, idempotent, RLS politika adını da çeviren bir blok.
> Yani kod yorumundaki numara **tarihsel bir addır**, dosya yolu değil.

## Bilinçli olarak senkronlanmayan adlar

§4.3 *"adı değiştirmeye karar verdiysen yarım bırakma"* der — ama bazı adlar
**bilerek** eski kalır ve gerekçesi kodda yazılıdır:

- `kind:'ilham'` — DB enum geri uyumu (`10A-gecis-karti.js:1271`).
- `ilham_kartlari` tablosu ve `paylasilan_kart_kopyala` RPC'si — legacy veri;
  artık yazılmaz/çağrılmaz.
- Modül dosyası `10B-ilham-karti.js` — içi tamamen değişti, adı korundu.

Bunları "yarım kalmış göç" sanıp tamamlamaya kalkma: kullanıcı verisine
dokunan bir migration gerektirir ve kazancı yoktur.

**How to apply:**

## 1 · Yeni bir ad değişimi yapıyorsan

§4.3'ün beş adımını uygula ve yukarıdaki üç deseni kopyala. Ad haritasını
**plana yaz** — bu repoda üç göçün haritası bugün yalnız koddan okunabiliyor
ve bu bir eksikliktir, emsal değil.

## 2 · Eski adın kalmadığını KANITLA

`grep -rn "<eski ad>" js/ tests/ css/ _src.html` — kalan her eşleşme için ya
göçü tamamla ya gerekçesini satırda beyan et. `10B-ilham-karti.js` banner'ı
bunun iyi örneğidir: neyin neden kaldığını tek tek sayar.

## 3 · Sayaç/etiket tutarlılığı da ad senkronudur

`10B-ilham-karti.js:176` bunu tek cümlede söylüyor: *"§4.3 ad senkronu:
sayaç chip saymıyorsa chip demez."* Kullanıcıya görünen sözcük ile kodun
saydığı şey ayrışıyorsa ad senkronu kırılmıştır — ad değişmemiş olsa bile.

İlgili: [[ilham-kartlari-sosyal-feed]] (bilinçli bırakılan legacy adların
tam listesi) · [[kisi-kartlari]] (42703 kolon düşüşü — aynı savunmacı
ailenin şema tarafı) · [[tr-en-i18n-tamamlama]] (adın çeviri yüzeyi)
