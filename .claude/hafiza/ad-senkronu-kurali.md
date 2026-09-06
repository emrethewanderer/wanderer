---
name: ad-senkronu-kurali
description: "KURAL DEĞİŞİMİ (2026-07-25) — §4.3 tersine çevrildi: görünen ad değişirse iç ad da değişir; üç kartın adı aynı sprintte koda taşındı (ad haritası + ELLE mig 039)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7a7e0666-8018-4f3e-97c2-cf5e8c25cdc3
  modified: 2026-07-26T09:14:46.307Z
---

**Emre'nin kararı (2026-07-25, AskUserQuestion):** `PROTOKOL-FABLE.md` §4.3'ün
eski hâli ("iç ad kararlı kalır, yalnız görünen ad değişir") **tersine
çevrildi**. Yeni kural: **görünen ad değişirse iç ad da değişir — ikisi aynı
olur.** Gerekçe: *tek ad, tek gerçek — grep ettiğin ad, kullanıcının gördüğü ad.*

Kapsam kararı: **her şey dahil** (kod, DOM id, i18n anahtarı, dosya adı, state,
**storage anahtarları**, **Supabase tablo adları**) ve **geriye dönük** —
2026-07-24'te adı değişen üç yüzey aynı sprintte koda taşındı.

## Ad haritası (KALICI — eski hafızalarda/commit'lerde eski adı görürsen bu tablo)

| Katman | ESKİ | **YENİ** |
|---|---|---|
| 02c modül | `02c-self-card.js` · `sc.*` · `benlik*` | `02c-portre.js` · **`por.*`** |
| 02c state/CSS | `js/state/benlik.js` · `self-card.css` · `S._benlikKarti` | `state/portre.js` · `portre.css` · **`S._portre`** |
| 02c storage | `etw_benlik_{karti,draft,absorb_q,evrim_wave,seen_v}_` | **`etw_portre_*`** |
| 02c tablo | `benlik_karti` | **`portre`** |
| 10A modül | `10A-an-karti.js` · `ak.*` · `_anKartlari` | `10A-gecis-karti.js` · **`gk.*`** · **`_gecisKartlari`** |
| 10A storage | `etw_an_kartlari_v2` · `etw_ak_rehber_v1` | **`etw_gecis_kartlari_v1`** · **`etw_gk_rehber_v1`** |
| 10A tablo | `benim_kartlarim` | **`gecis_kartlarim`** |
| 10A kart id | `ak_…` | **`gk_…`** (eski id'ler opak, geçerli kalır) |
| 10q ALT AĞAÇ | `kk.living.*` · `#kk-living-*` | **`kk.butunluk.*`** · **`#kk-butunluk-*`** |
| doküman | `SETUP-BENIM-KARTIM.md` | **`SETUP-GECIS-KARTIM.md`** |

**`kk` öneki KORUNDU** — Kişi Kartı motorunun ("Kişilerim") adı değişmedi;
yalnız "Bütünlüğün" olan `living` alt ağacı döndü. §4.3'ün "ad değişmediyse
sözleşme dokunulmazdır" tarafı.

## Kalıcı veri iki katmanda göçtü (kod yüzeyinden AYRI)

1. **Storage** — `SafeStorage.migrateKey(yeni, eski)` eklendi
   (`00a-infrastructure.js`): yeni anahtar boşsa eskiden oku → yeni ada yaz →
   **eskiyi SİLME**. İdempotent. 02c `_porMigrateKeys()` ile 5 anahtarı
   `porLoad` başında taşır; 10A `_gkOldKeys()` üç halkalı zincir tutar
   (`gecis_kartlari_v1` → `an_kartlari_v2` → `an_kartlari_v1`).
   6 vitest göçü kanıtlıyor (taşıma + idempotentlik + boş durum).
2. **Supabase** — `migrations/039_ad_senkronu.sql` (emsal: mig 027). Kod
   migration'dan ÖNCE de çalışır: 42P01 (undefined_table) → oturum boyu eski
   ada düşülür (`_gkTable`, `_portreUpsert`).

## Yol boyunca bulunan GERÇEK hatalar (ad senkronunun ortaya çıkardığı)

- **Almanca 2026-07-24 turunu tamamen kaçırmış**: `de-ui.js` hâlâ
  "Selbstkarte" / "Meine Karte" / "Deine Karte" diyordu — Almanca kullanıcı
  ekranda ESKİ adı görüyordu. Düzeltildi: **Mein Porträt · Meine
  Übergangskarte · Deine Ganzheit**. Ayrıca 3 anahtar (`por.topbar_title`,
  `por.topbar_mode`, `por.drawer_kicker`) DE'de hiç yoktu → eklendi, üç dil
  tam parite (109/129/5).
  > **KONU DIŞI KALDI (2026-07-25 akşamı):** DE dil paketi Emre kararıyla
  > silindi ([[tum-diller-native-plani]]). Bugün i18n **iki sözlüktür**:
  > `15b` (TR) + `15e` (EN), prompt için `16b` + `16e`. Yeni anahtar eklerken
  > DE aramayın — yok.
- `13q-gozlemevi.js` hâlâ `'Benlik Kartım'` etiketini hardcode ediyordu.
- `t('mem.portre.label', 'BENLİK KARTI')` — sözlük 'PORTRE' derken inline
  fallback eski adı taşıyordu.
- Üç dilde de "Bu **kart** … güncellenir" deniyordu, oysa Bütünlüğün'ün adı
  tam da "kart değil, ölçü" olduğu için değişmişti → düzeltildi.

## Dokunulmayanlar (bilinçli)

Kitabın kavramı olan "benlik" kelimesi korundu: `12d 'iki benlik'`,
`12c` "ikiz/eski benlik" yorumları, `13-extras` "gölge benlik profili",
`15b 'drawer.shadow': 'Gölge Benlik'` (AYRI bir özellik).

## Bekleyen ELLE iş

**2026-07-26 güncellemesi:** `migrations/039_ad_senkronu.sql` artık YOK —
ad göçü `migrations/000_wanderer_schema.sql` §2'ye taşındı ve 027'nin
`an_kartlari → benim_kartlarim` adımıyla birleştirildi (üç halkalı zincir,
`to_regclass` kapılı, CREATE'ten önce). Bkz. [[migration-konsolidasyonu]].

Yapılacak: 000'i Supabase Dashboard'da koştur + `delete-user`, `reset-user`,
`send-push` redeploy. **Deploy edilmiş varsayılmaz** — kod o zamana kadar
eski tablo adına düşer (10A üç halkalı fallback, 02c iki halkalı).

Bkz. [[kart-adlari-yeniden-adlandirma]] (adların NEDEN değiştiği),
[[fable-protokol-belgesi]], [[benlik-karti-2-olunan-ad]], [[an-karti]],
[[kisilerim-kart-motoru]], [[tr-en-i18n-tamamlama]].

## Repoda duran canlı örnek: `hisler` ↔ `duygular` (2026-08-30 tespiti)

Aynı boyutun iki adı var ve arada bir çeviri katmanı yaşıyor:
`10q:29` `DIMS = ['dusunceler','inanclar','hisler','davranislar']` (kart
reçete sinyalleri, `12b2`) ile `10D:51` `CAT_KEYS = [… 'duygular' …]`
(Portre/OİK). Köprü: `ABSORB_MAP = { hisler: 'duygular', … }` —
`02c-portre.js:510` ve `10D-olmak-istedigin.js:320`.

Bu tam olarak bu kuralın yasakladığı şeydir ("kod X der, başka kod Y der").
Bugün zararsız görünüyor çünkü köprü kurulu; ama yeni bir tüketici
(FAZ 18'in duygu çarpanı) yazarken hangi adın **veri anahtarı** olduğunu
bulmak grep gerektirdi ve yanlış adı seçmek sessiz bir "hiç eşleşmeyen
boyut" hatası üretirdi. Ad göçü yapılırsa `ABSORB_MAP`'in iki kopyası ve
kart reçeteleri (`12b2`) birlikte taşınmalı.

**How to apply:** yeni bir tüketici yazarken adı belgeden değil **veriden**
doğrula (`m.dims`'in gerçek anahtarları), sonra o adı yorumda gerekçelendir.
