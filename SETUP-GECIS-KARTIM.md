# SETUP — Geçiş Kartım 2.0 · ELLE adımlar

Bu doküman **senin elle yapman gerekenleri** içerir. Client kodu bu adımlar
yapılmadan da çalışır (KV fallback zinciri), ama omurga faydaları — çok cihaz
senkronu, rumuz sunucu mührü, ilham kurtarması, raporlar — migration ister.

## 1) Migration'ı uygula

Supabase Dashboard → SQL Editor → `migrations/000_wanderer_schema.sql` içeriğini
yapıştır → Run. İdempotenttir; iki kez koşmak zarar vermez.

Ne yapar (özet):
- **`an_kartlari`** — Geçiş Kartım artık kart-başına satır (owner-only RLS).
  Client ilk açılışta KV'deki kartları buraya tek seferlik göçürür.
  (027 bu tabloyu `gecis_kartlarim` olarak yeniden adlandırır — aşağıda.)
- **`wanderer_rumuz(uuid)`** + BEFORE INSERT trigger'ları — paylaşım ve yorum
  rumuzu artık **sunucuda** türetilir; client ne gönderirse gönderilsin ezilir.
- **Anonimlik daraltması** — beğeni/kayıt satırlarını artık yalnız sahibi okur
  (user_id sızıntısı kapandı; sayaçlar zaten kart satırındaki kolonlardan okunur).
- **`paylasim_raporlari`** + `report_count` — "⚑ Bildir" akışının omurgası.
- **Ad göçü** — tablo bugünkü adına taşınır (`an_kartlari` →
  `benim_kartlarim` → `gecis_kartlarim`); indeksleri ve RLS politikası da
  birlikte gelir, veri aynen kalır. Eski adlardan hangisi duruyorsa oradan
  devralır; hiçbiri yoksa yeni adla sıfırdan kurar.

> Tek dosya, tek çalıştırma: eskiden ayrı adım olan 025 → 027 → 039 zinciri
> artık `000_wanderer_schema.sql`'in içinde ve doğru sırada. Ayrıca
> idempotenttir — iki kez koşmak zarar vermez.

## 1c) reset-user + delete-user yeniden deploy

İki fonksiyonun tablo listesine `gecis_kartlarim` (+ eski ad), mig 022/023/025
tabloları eklendi — "Sıfırdan Başla" ve hesap silme artık kart/paylaşım/mektup
verisini de kapsıyor:

```
supabase functions deploy reset-user
supabase functions deploy delete-user
```

## 2) Rumuz parite kontrolü (30 saniye)

SQL Editor'de:

```sql
SELECT _wanderer_fnv1a('anon')                                              AS h_anon,
       wanderer_rumuz('00000000-0000-0000-0000-000000000000'::uuid)         AS r_zero,
       wanderer_rumuz('a1b2c3d4-e5f6-4a3b-8c9d-0e1f2a3b4c5d'::uuid)         AS r_a1,
       wanderer_rumuz('f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid)         AS r_f47;
```

Beklenen (JS `ilhamRumuz` ile bit-bit aynı; node ile doğrulandı 2026-07-02):

| girdi | h | rumuz | renk |
|---|---|---|---|
| `anon` | `2832133407` | — | — |
| `0000…0000` | — | `GEZGİN_1GSN` | `#F0D9A8` |
| `a1b2…4c5d` | — | `GEZGİN_II36` | `#7FA6E4` |
| `f47a…d479` | — | `GEZGİN_PCX1` | `#5A8AD8` |

Değerler farklıysa DURDUR ve bana söyle — rumuz tutarlılığı bozulmamalı.

## 3) Hızlı regresyon (uygulamada)

1. Kişilerin Kişileri'nde bir kartı **beğen → geri al** — sayaç doğru oynuyor mu.
2. Yeni bir Geçiş Kartım **paylaş** — feed'de rumuzun eskisiyle aynı mı
   (aynı kullanıcı = aynı rumuz; trigger aynı algoritmayı koşar).
3. Eski İlham kartların vardıysa: Kendi Koleksiyonum'da göründüler mi.

## 4) OPSİYONEL (ileri adım) — `[KART]` protokol etiketi

Client, sohbet köprüsünde `[KART: kısa tohum]` etiketini tanır (10B): model bir
mesajın Geçiş Kartım'a dönüşmeye değer olduğunu düşünürse bu etiketi mesajın
SONUNA ekler; client etiketi gizleyip kesin CTA chip'i basar. Etiket yoksa
mevcut cue-listesi fallback çalışır — yani bu adım yapılmasa da her şey çalışır.

Aktive etmek istersen `llm-chat` edge function persona'sına şu bloğu ekle
(13a araç protokolü bloğunun yanına):

```
[KART] ETİKETİ: Kullanıcıya "böyle bir kişi olabilirsin" dedirtecek net bir
kişi/oluş tarif ettiğinde — ve yalnız o zaman — yanıtın EN SONUNA yeni satırda
şunu ekle: [KART: o kişiyi 8-15 kelimeyle özetleyen tohum cümle]
Her yanıta ekleme; seansta en fazla 2 kez; sıradan bilgi yanıtlarına asla.
```

Sonra `supabase functions deploy llm-chat` (repoda yoksa dashboard'dan düzenle).

## Geri dönüş

- Rumuz trigger'ını kapatmak: `DROP TRIGGER trg_rumuz_muhru_kart ON paylasilan_kartlar;`
  ve `DROP TRIGGER trg_rumuz_muhru_yorum ON paylasim_yorumlari;`
- SELECT daraltmasını eski hâline almak istersen mig 023'teki `all read`
  politikalarını yeniden CREATE et.
- `gecis_kartlarim` (eski adıyla `an_kartlari`) tablosunu silme — client tablo
  yoksa KV'den okumaya döner ama tabloda birikmiş veri varsa kaybolur.
  Önce `SELECT count(*) FROM gecis_kartlarim;`
