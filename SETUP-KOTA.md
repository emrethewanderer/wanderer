# SETUP — Kota Motoru (5 saatlik pencere + haftalık tavan + Ultra Armağanı)

Claude Code'un kota modeli Wanderer'a uyarlandı: ücretsiz kullanıcı için
**5 saatlik pencere** (ilk mesajla açılır, 5 saat sonra tamamen yenilenir)
ve **haftalık tavan** (7 günde bir yenilenir). Premium (Studio abonelik /
30 gün deneme / admin) sınırsızdır — composer'da altın↔lapis dönen özel
"sınırsız" çemberi görünür; dokununca Studio kartı açılır.

**Ultra Armağanı (migration 019):** Üç Mühür'ü (Seri + Hayal + Söz) aynı
gün tamamlayan ücretsiz kullanıcıya o güne **+9 mesaj** yazılır. Armağan,
5 saatlik pencere ya da haftalık tavan kapandığında devreye girer ve
pencere sayaçlarına dokunmaz. Ödül, Ultra Seri uyanış modalında duyurulur;
detay kartında "ÜÇ MÜHÜR ARMAĞANI" satırı olarak görünür.

Client tarafı hazır ve **migration uygulanmadan da hiçbir şey kırılmaz**:
RPC bulunamazsa eski yerel günlük sayaç (20 mesaj/gün) devrede kalır,
kota çemberi görünmez (yerel sayaç da ultra günde +9 uygular). Geçici ağ
hatası motoru kapatmaz — yalnız "fonksiyon yok" (migration eksik) hatası
kalıcı fallback'e düşürür.

---

## 1) Migration (zorunlu)

Supabase Dashboard → SQL Editor → `migrations/000_wanderer_schema.sql`
içeriğini yapıştır → Run. Kota motorunun tamamı bu tek dosyada:

- `quota_settings` — tek satır: Free `five_hour_limit` / `weekly_limit`
  (varsayılan **10 / 40**), Pro `pro_daily_limit` / `pro_weekly_limit`
  (varsayılan **50 / 350**), `ultra_bonus` ve `set_bonus` (ikisi de **9**),
  `server_enforced` (varsayılan false)
- `quota_windows` — kullanıcı başına tek satır pencere durumu + armağan alanları
  (`bonus_day / bonus_left / bonus_granted`, `set_bonus_left / set_bonus_sets`)
- `quota_status()` / `quota_consume(p_day)` — tier'a duyarlı (free/pro/max),
  security definer
- `quota_bonus_grant(p_day)` — Üç Mühür günü armağanı (günde bir, idempotent)
- `quota_set_bonus_grant(p_set)` — Hazine seti armağanı (set başına ömür boyu bir)

Doğrulama:

```sql
select public.quota_status();          -- oturumlu kullanıcıyla; bonus_* alanları da döner
select * from public.quota_settings;   -- 1 satır: 10 / 40 / 50 / 350 / 9 / 9 / false
```

> Not: `quota_settings` satırı ZATEN varsa konsolide dosya ona dokunmaz
> (`ON CONFLICT DO NOTHING`). Eski kurulumdan 15/75 kaldıysa elle çek.

## 2) Limit ayarı (opsiyonel)

Admin sayfası → **Ayarlar** sekmesi → "Kota · 5 Saatlik Pencere",
"Kota · Haftalık Tavan" ve "Kota · Ultra Armağanı" alanları
`quota_settings`'i günceller. SQL ile de değiştirilebilir:

```sql
update public.quota_settings
   set five_hour_limit = 15, weekly_limit = 75, ultra_bonus = 9 where id = 1;
```

Sayıların gerekçesi (Haziran 2026 pazar araştırması):

| Servis | Ücretsiz katman |
|---|---|
| ChatGPT free | ~10 mesaj / 5 saat (sonra mini modele düşer) |
| Claude free | ~15–40 mesaj / 5 saat + haftalık tavan |
| Gemini free | ~30 istem / gün (dinamik) |
| **Wanderer free** | **15 mesaj / 5 saat + 75 mesaj / hafta** |

15/5s bir derin seansa yeter (Wanderer seansı ortalama 10–15 mesaj);
75/hafta, her gün dolu seans yapan adanmış kullanıcıyı 5. günde Studio
duvarıyla buluşturur — "yeterli ama ücretliye çağıran" denge.

## 3) Sunucu tarafı zorlama — llm-chat yaması (önerilir, sonra yapılabilir)

Bugünkü düzende `quota_consume`'u client çağırır (sayaç sunucuda ama
tetik client'ta). Kurcalanmış bir client kotayı atlayabilir. Tam zorlama
için `llm-chat` Edge Function'ın başına (persona yüklemeden ÖNCE) şunu ekle:

```ts
// ── KOTA — istek başına tüket; aşımda 429 ──
// supabase: kullanıcının JWT'siyle kurulmuş client (auth.uid() çalışır).
// invalidate_persona gibi mesaj-olmayan aksiyonları SAYMA.
if (body.action !== 'invalidate_persona') {
  const { data: quota, error: quotaErr } = await supabase.rpc('quota_consume');
  if (!quotaErr && quota && quota.allowed === false) {
    return new Response(JSON.stringify({ error: 'quota_exceeded', quota }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  // quotaErr → engelleme (kota motoru hiç kurulmamış olabilir); akış sürsün
}
```

Sonra çift saymayı kapatmak için bayrağı çevir:

```sql
update public.quota_settings set server_enforced = true where id = 1;
```

`server_enforced = true` iken client `quota_consume` yerine yalnız
`quota_status` okur (hızlı duvar + çember için); tüketim sunucuda olur.
Client 429'u zaten kota duvarına çevirir (06-summary-chat.js).

## Davranış özeti

- Çember (kota halkası) iki composer'da: ana ekran composer ayağı +
  Ritüel Kartı ayağı. Dokununca detay kartı: iki halka (5 saat = altın,
  hafta = lapis), yenilenme geri sayımı, Studio CTA.
- 5 saat duvarı: yumuşak — yenilenme saati söylenir, Studio anılır.
- Hafta duvarı: Emre'nin sesiyle yüzleştirici duvar + "Duvarı Kaldır" CTA
  (mevcut premium duvarı korunur).
- **Premium:** çember gizlenmez — altın↔lapis dönen "sınırsız" halkası
  (✦ merkezli) çizilir; dokununca Studio kartı: ∞ halkası + "5 saatlik
  pencere: Sınırsız / Haftalık tavan: Sınırsız". Hiçbir kota uygulanmaz,
  RPC çağrılmaz.
- **Ultra Armağanı:** Üç Mühür aynı gün tamamlanınca 10u →
  `ktGrantUltraBonus` → `quota_bonus_grant` (+9, günde bir). Pencereler
  kapandığında mesajlar armağandan düşer (`reason='bonus'`); mini çember
  lapis "armağan" moduna geçer, ilk armağan mesajında günde bir kez toast
  görünür. Uyanış modalında "✶ ARMAĞAN · Bugüne +9 mesaj hakkı eklendi"
  satırı yer alır. Kota motoru kurulu değilse yerel günlük sayaç ultra
  günde +9 uygular.
- 429 (server_enforced): client genel hata yerine taze `quota_status`
  çekip kota duvarını çizer (06 `_appendErrorWithRetry` → `err.quota`).

## Emniyet Katmanı · Kriz muafiyeti (Faz 2, 2026-07-12)

- **Client (kurulu):** `ktGate` kriz penceresinde (`S._crisisMsgLeft > 0`)
  duvarı atlar — günde en çok 15 mesajlık lütuf (`etw_crisis_grace_<gün>`,
  cihaz-yerel). Gerçek 429 gelirse 06 duvarın yanına kriz kartını basar.
- **Sunucu (ELLE — yapılacak):** `llm-chat` kota reddinden ÖNCE son kullanıcı
  mesajını kriz desenlerinden geçirmeli; sinyal varsa o mesaj için 429 yerine
  yanıt üretmeli (günde ≤15 muafiyet, `crisis_grace` sayacı user bazlı).
  Kriz anında duvar, en riskli anda kapıyı kapatmaktır — sunucu bunu asla
  tek başına client'a bırakmamalı. Ayrıntı: GUVENLIK-VE-SORUMLULUK-CALISMASI.md · Faz 5.
