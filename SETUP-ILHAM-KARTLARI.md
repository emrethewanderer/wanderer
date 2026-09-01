# SETUP — İlham Kartları + Kişilerin Kişileri

> Emre — bu özelliği canlıya almak için TEK manuel adım var: migration'ı
> Supabase'e elle uygulamak. Build + state + UI tarafı tamamen otomatik.

## 1) Migration

Supabase Studio → **SQL Editor** → yeni sorgu → şu dosyanın TÜMÜNÜ yapıştır + RUN:

```
migrations/000_wanderer_schema.sql
```

Sosyal halkanın nesneleri (bu dosya şemanın TAMAMINI kurar — aşağıdakiler
yalnız bu özelliğe ait olanlar):

| Nesne | Amaç |
|---|---|
| `paylasilan_kartlar` | Sosyal feed snapshot'ları — read-all, owner-write |
| `paylasim_begenileri` | Beğeniler — `UNIQUE(user_id, card_id)` + trigger `like_count` |
| `paylasim_yorumlari` | Yorumlar (max 600 char) — anonim rumuz alanı; trigger `comment_count` |
| `paylasim_kayitlari` | "Bana ekle" izi — `UNIQUE(user_id, card_id)` + trigger `save_count` |
| `paylasim_raporlari` | "⚑ Bildir" kayıtları + trigger `report_count` |
| `paylasilan_haftanin_topu` (view) | UI rafının kaynağı — `like×2 + yorum + kayıt`, "bu hafta" = ISO hafta-başı (Pazartesi 00:00, İstanbul) filtreli |
| `wanderer_rumuz(uuid)` + trigger'lar | Rumuz sunucuda türetilir — client beyanı ezilir |

> **Emekli:** `ilham_kartlari` tablosu ve `paylasilan_kart_kopyala(BIGINT)`
> RPC'si artık kurulmuyor. İlham Kartları içeriği Geçiş Kartım omurgasına
> (`gecis_kartlarim`) göçürüldü; eski tablo varsa dokunulmadan duruyor.

> `profiles.is_admin` zaten var (önceki migration'ların ön koşulu); admin
> moderasyon politikaları otomatik kurulur.

> **Not — "haftanın topu" neden GENERATED kolon değil:** İlk taslakta `week_iso`
> bir `GENERATED ... STORED` kolondu; ancak `AT TIME ZONE 'Europe/Istanbul'`
> IMMUTABLE olmadığı için Postgres `42P17: generation expression is not immutable`
> hatası verir. Çözüm: kolon kaldırıldı; "bu hafta" filtresi view içinde
> `shared_at >= date_trunc('week', now() AT TIME ZONE 'Europe/Istanbul')` ile
> yapılır (view'da STABLE fonksiyon serbesttir, `shared_at` index'i kapsar).

## 2) Doğrulama

```sql
SELECT id, baslik, state FROM ilham_kartlari LIMIT 1;
SELECT id, rumuz, like_count FROM paylasilan_haftanin_topu LIMIT 5;
```

Anonim rumuz: `GEZGİN_XXXX` — kullanıcı id'sinden deterministik türetilir
(FNV-1a hash → base36). Aynı kullanıcı için sabit; gerçek ad asla görünmez.

## 3) Akışın özeti

1. **Sohbet kancası** — Wanderer'ın bir mesajının altında altın bir chip belirir:
   *"Hadi böyle bir kişi oluşturalım →"*. Tıkla → Studio'da **Atölye** açılır.
2. **Atölye** (3 sahne): Loading → 4-kategoride düzenle → büyük lapis 12c kart +
   "Mühürle" (opsiyonel paylaş toggle'ı).
3. **Kendi Koleksiyonum** (Bugün · STÜDYO · GALERİ): İlham Kartları + Benim
   Kartım kartları yan yana; varsayılan **GİZLİ** — yalnız sen görürsün.
4. **Paylaş** → snapshot **Kişilerin Kişileri** akışına iner; anonim rumuzla.
5. **Kişilerin Kişileri** (Bugün · STÜDYO · GALERİ): "EN BEĞENİLEN BU HAFTA" rafı
   + kronolojik akış; beğen / yorum yap / koleksiyonuma kopyala.
6. **Olmak İstediğin Kişi** (Yol lapis kutbu) — mühürlü İlham Kartları'nın
   sayısı *+N İLHAM* rozeti olarak Yol Hero'da görünür; koç bağlamına da
   (09a buildPersonalizationPrompt) en yeni 5 kart enjekte olur — Wanderer
   konuşurken bu hedef niteliklere yumuşak yönlendirme yapar.

## 4) Yeni dosyalar

| Dosya | Görev |
|---|---|
| `migrations/000_wanderer_schema.sql` | DB şema (manuel uygulanır) |
| `js/state/ilham.js` | State slice (`_ilhamKartlari`, `_ilhamRumuz`, vs.) |
| `js/parts/10B-ilham-karti.js` | Atölye + Kendi Koleksiyonum + chat kanca + share |
| `js/parts/10C-sosyal-feed.js` | Kişilerin Kişileri (feed + detay + yorum + kopyala) |
| `tests/10B-ilham-karti.test.js` | 21 saf test |
| `tests/10C-sosyal-feed.test.js` | 7 saf test |

Mevcut dosyalarda küçük kancalar (tek satırlık değişiklikler):

| Dosya | Ne eklendi |
|---|---|
| `_src.html` | İki yeni `<div class="view">` (`#kk-mine-view`, `#sosyal-view`) + drawer'da iki yeni room (`data-nav="kk-mine"`, `data-nav="sosyal"`) |
| `js/state.js` | `ilhamState` compose'a eklendi |
| `js/main.js` | 10B + 10C static import |
| `js/parts/03-auth-shell.js` | switchView route'ları (`kk-mine`, `sosyal`) + post-auth `ilhamInit` + `sfInit` |
| `js/parts/09a-personalization-engine.js` | `ilhamGetContext()` koç bağlamına |
| `js/parts/10f-w2-yol.js` | Lapis kutba `+N İLHAM` rozet markup'ı |
| `css/parts/yol.css` | `.yol-ilham-badge` stili |

## 5) Tasarım Prensipleri uyumu (kontrol listesi)

✓ Anlam: altın CTA = "şimdi" eylemi · lapis kart = "olmak istediğin" hedef · bronz yok
✓ Token: tüm renkler/yumuşamalar `var(--gold)` / `var(--lapis-bright)` / `var(--ease-out)`
✓ Zaman: overlay'ler `obsidyen+gradyan` tabanlı, `tw-*` ile çakışmıyor
✓ Doku: kâğıt gren `var(--grain-img)` mevcut yüzeylerden devralınır; kart sırtı 12c
✓ Tipografi: Cinzel kicker → Fraunces başlık → EB Garamond italik açıklayıcı
✓ Hareket: `--ease-out` standardı, `prefers-reduced-motion: reduce` blokları zorunlu
✓ Form: kartlar **12c motoru** (paralel stil yazılmadı); köşeler ≥18px
✓ Tören: mühür sahnesi ayrı bir aşamadır (toast değil)
✓ Erişim: 44px min touch target (`min-height:36-44px`), `:focus` outline tarayıcı default'undan korunur
✓ Build: `_src.html` üzerinde çalışıldı; Stop hook auto-build üretir

## 6) İzlenecek olası noktalar

- **Spam koruması:** `paylasim_yorumlari.body` 1–600 char check; rate-limit RLS
  seviyesinde yok — istenirse Edge Function ile (örn. 1dk içinde ≤3 yorum)
- **Moderasyon:** `paylasilan_kartlar.hidden` + `paylasim_yorumlari.hidden` admin
  güncellemesi mevcut; admin panelinde bir "Halka Pazarı" sekmesi sonra eklenebilir.
- **Karşılıklı görünüm:** Hedef bir kişiyi paylaşan ile yorum yapan arasında özel
  mesajlaşma şu an YOK (vizyon: anonim halka). Sonra eklemek istenirse rumuzu
  korur, mesajlaşma katmanı eklenebilir.
