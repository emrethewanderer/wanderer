---
name: ic-calisma-8-uc-sesin-nabzi
description: "31 Ağustos 2026: İç Çalışma 08 rev.2 TAM (6 faz) — Öz/Bağ/Eser üçgenine nabız takıldı; seçim·kilit·düşüş AYRI sayılır; denetimde çıkan üç kırığın üçü de PLANIN hatasıydı; ELLE: migration 050"
metadata:
  type: project
---

**Ürünün kimlik iddiası üç sestir — Öz ◆ bireysel · Bağ ❖ ilişki · Eser ▲ iş —
ve 18 Temmuz'dan 31 Ağustos'a kadar bu iddianın hiçbir kanıtı yoktu.** On bir
kanallı Gözlemevi kadranının hiçbirinde `oz`/`bag`/`eser` geçmiyordu. İç
Çalışma 08 on ikinci kanalı taktı.

## Ne kuruldu (6 faz, hepsi TAM)

- **`wtLogModel`** (`00f`) — kapalı olay kümesi `sec|kilit|dus`, kapalı eksen
  kümesi `oz|bag|eser`, `meta={oteki, prem}`. Emsali `wtLogKimlik`.
- **`meta.fm`** `wtLogLatency`'ye bindi (K2): tur sayısı yeni bir olaydan
  gelmez, latency satırından okunur — aynı turu iki kanaldan saymak kadranda
  iki farklı rakam doğururdu.
- **migration 050** — `admin_usage_report`'a `model_pulse` bloğu. **ELLE.**
- **13q "Üç Sesin Nabzı" paneli** — üç köşe (Seçti · Çarptı · Konuştu) +
  yaşanan kullanım çubukları + karşılanmamış talep (lapis) + geçiş matrisi.
- **Eksen denetçisi** (`scripts/eksen-denetci.mjs` + `eksen-taban.json`) —
  üç `system_prompt`un Jaccard örtüşmesi ve tekillik payı; **marjlı regresyon
  kapısı** (`tests/eksen-kapisi.test.js`). LLM-hakem reddedildi: kalibre
  edilmemiş öz-beyan kapı olamaz (§6.10 · K4).
- **Şema Sondası'nda iki yeni satır** — tablo VARLIĞI ile içerik DOLULUĞU
  AYRI ölçülür; `wanderer_models` boşsa arayüz "Öz/Bağ/Eser" derken altında
  eski `focus_models` promptları konuşuyor olur.

## Merkez karar: seçim ile kilit TOPLANMAZ (K1)

`10w:111` Free katmanını Öz'e **kilitler**. İkisini tek dağılımda toplamak
kadranda "herkes Öz'ü seviyor" diye okunur — oysa ölçülen mahkûmiyettir.
`sec` niyettir · `kilit` karşılanmamış taleptir · `dus` sessiz kayıptır
(Pro bitti, kayıtlı eksen Öz'e döndü, kullanıcıya hiçbir şey söylenmedi).

## Denetimin dersi: üç kırığın üçü de PLANIN hatasıydı

[[ic-calisma-7-kimlik-ucgeni]]'nin bulgusu bire bir tekrarlandı — uygulayıcı
(GLM 5.3 Flash) plana **sadıktır ve yargısızdır**, o yüzden planın körlüğü
kodda aynen yaşar:

1. **`dus` olayı hiç yazılmıyordu.** Plan "karar fmInit'te verilir" diyordu
   ama init SIRASINI saymamıştı → [[saf-yesil-cagri-olu]]'nun dördüncü hâli.
2. **Sonda kendi kendisiyle çelişiyordu** (`toplam === 0` iken satır ✗, sayaç
   sıfır) — planın 6c(2) kod bloğu iki ayrı ifade veriyordu; tek kaynağa
   (`icerikOk`) indirildi.
3. **Planın §7 sözleşme listesi yanlış çapa veriyordu:** `fmInit` `window`'a
   HİÇ asılmamıştır (03-auth-shell onu modülden çağırır), liste onu
   `function` bekliyordu.

**Why:** 🅢 devri kotayı korur ama planın yargısını yerine koymaz. Devredilen
sprintte denetimin bulacağı şey genelde uygulayıcının özensizliği DEĞİL,
planı yazanın atladığı yargıdır — o yüzden faz denetimi ([[model-devri-sandvic]])
devirde ATLANAMAZ.

**How to apply:**
1. Bir olayı **init anında** yazan her çağrı için "benim çağrım motordan sonra
   mı?" sorusunu ayrıca sor; cevabı `03-auth-shell` post-auth bloğundaki satır
   numarasıdır.
2. Panelde bir satırın hükmü ile özetin sayacı **aynı ifadeden** okunsun; ayrı
   yazılan iki koşul er ya da geç ayrışır ve panel kendi kendisiyle çelişir.
3. Gözlemevi panellerini `.claude/harness/gozlemevi-nabizlari.html` ile
   doğrula — ama **ölçü aletinin kendisi de denetlenir**: `_loadSonda` sabit
   `#gz-sonda` id'sini arayıp daima belgedeki İLKİ doldurur, iki senaryo yan
   yana durunca ÜST kutunun sondası eziliyordu.

**Senin yapman gereken (ELLE):** `migrations/050_gozlemevi_model_nabzi.sql`
→ Supabase Dashboard → SQL Editor. Uygulanana kadar panel çizilmez (yalan
söylemez), Şema Sondası borcu sayar.

Plan: `.claude/plans/ic-calisma-08-uc-ses-rev2.md` (§6.9 kapanış durumu).
İlgili: [[odak-modelleri]] · [[gozlemevi-kullanim-nabzi]] ·
[[ic-calisma-7-kimlik-ucgeni]] · [[saf-yesil-cagri-olu]] ·
[[model-devri-sandvic]] · [[gerceklik-mimarisi]] · [[ic-calisma-atlasi]]
