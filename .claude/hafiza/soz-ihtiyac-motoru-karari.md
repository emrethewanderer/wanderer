---
name: soz-ihtiyac-motoru-karari
description: "2026-07-31 SEKİZ FAZ TAM: Günün Sözü/Armağanı ihtiyaç motoruna bağlandı (13u defter + 13v motor + 13w terzi); topluluk verisi REDDEDİLDİ, tohum Portrem'dir; ELLE: soz-terzisi deploy"
metadata: 
  node_type: memory
  type: project
  originSessionId: c828b587-a02e-4158-a38e-190faa343f37
  modified: 2026-07-31T18:15:27.291Z
---

Emre 2026-07-31'de (sunum slaytı "Sözler · Wanderer") Günün Sözü'nün sabit
bankadan çıkıp **kullanıcının ihtiyacına göre** belirlenmesini istedi.
**Sekiz fazın tamamı bitti, 1608 test yeşil, bundle 598KB.**

## Kararlar (Emre)
1. **Topluluk katmanı REDDEDİLDİ.** "Veri yoksa diğer kullanıcılara sunulanı
   ver" önerisi kaldırıldı; soğuk başlangıçta **Portrem (02c) tohumu** —
   sözler kullanıcının kendi `dusunceler/inanclar/duygular/davranislar`
   cümlelerinden doğar. Anonim sayaç tablosu YAZILMADI.
2. **Söz + Armağan tek motoru tüketir** (`glBuildGift` → `ihNeedTop`).
3. **Söz Terzisi ayrı `soz-terzisi` edge function** — sohbet kotasına
   DOKUNMAZ, kişi başı günde 1. Kota için yeni migration GEREKMEDİ: mevcut
   `fn_quota_consume(p_uid, p_fn, p_limit)` jenerik olduğu için `p_fn =
   'soz-terzisi'` yeterli.

## Mimari — üç yeni modül
- **13u Söz Defteri** (`sd`, `etw_soz_defteri_v1_<uid>`, 90 gün): tek yazar
  `sdSenkronla(ritus)`, **her `glSave()`'de** çağrılır — "gün dönünce arşivle"
  DEĞİL, çünkü sıfırlama iki yerde ve akşam hesabı `kept`i sonradan doldurur.
  Okuma: sdGecmis/sdTutmaOrani/sdSkipOrani/sdSonSozler/sdSeri/sdGunSayisi/sdMertebe.
- **13v İhtiyaç Motoru** (`ih`, kalıcılık YOK): kaynaklar OY verir, ağırlıklar
  **olgunlukla** değişir (tohum→portre 3.0 / tanidik→defter 3.0).
  `ihNeed(alan)` → `{eksen, guc, kanit(slug), alinti, kaynak, olgunluk}`.
  Öğrenme kuralı: tutulamayan eksen öne çıkar (+1), istikrarla tutulan geri
  çekilir (−0.75), yakın günlerin ekseni cezalanır — **ama tutunmamış eksen
  ASLA cezalanmaz** (yoksa kullanıcı en zorlandığı yerde yalnız kalır).
- **13w Söz Terzisi** (`st`): gece (18:00+) YARININ üç sözünü dokur,
  `etw_soz_terzi_v1_<uid>`'e yazar. Sabah töreni ağ ÇAĞIRMAZ, yalnız okur.

**Söz seçim sırası:** Terzi dokuması → yuvalı banka (ad/olay) → düz banka →
`gl.soz_fallback`. Mertebe `dokunus` ise yuva atlanır (yuvalı sözler talepkâr).

## Kritik sözleşmeler
- **Anahtar sözleşmesi:** `gl.soz.<alan>.<eksen>.<n>` · `gl.sozk/sozo.<alan>.<eksen>`
  · `gl.terzi.<alan>.<eksen>` — **4. parça DAİMA eksendir**; yeni söz kaynağı
  eklerken uyulmazsa defter öğrenmeyi sessizce kaybeder (hata vermez, körleşir).
- **64 karakter kapısı:** söz HARFİYEN yazılarak mühürlenir; her kaynak
  (yuva, Terzi, kullanıcının kendi cümlesi) bu kapıdan geçer, geçemeyen düşer.
- **Türkçe ek uyumu:** yuvalar DAİMA eksiz edatla kullanılır ("{kisi} ile",
  "{olay} için"). `{kisi}'ye` yazılamaz — Ayşe'ye/Mehmet'e/Oğuz'a şablonla
  üretilemez.
- **Gizlilik:** Terzi'ye ham sohbet metni gitmez; yalnız eksen/mertebe/kısa
  ad/olay. Bu sınır teste bağlıdır (`13w` testi).

## Gotcha
`gl-modal` içinde font **Cinzel** miras alınır ve majüskül çizer (küçük harf
de BÜYÜK görünür). Okunacak cümlelerde (`gl-soz-why`, `gl-reason-*`)
`font-family: var(--serif)` ile mirası kırmak gerekir.

**How to apply:** Söze dokunan her iş bu dosyadaki sıraya ve anahtar
sözleşmesine uyar. Plan: `.claude/plans/soz-ihtiyac-motoru.md`.
**ELLE (Emre):** `supabase functions deploy soz-terzisi` → `SETUP-SOZ-TERZISI.md`.
İlgili: [[gunluk-ritus-armagan-soz]] [[benlik-karti-2-olunan-ad]]
[[personalization-engine-layers]] [[kota-motoru]] [[safestorage-testlerde-kvcache]].
