---
name: benlik-karti
description: Benlik Kartı onboarding (02c) — kullanıcının kendi yazdığı canlı kimlik kartı; "Emre Beni Tanıyor"un yeni somut sürümü
metadata:
  node_type: memory
  type: project
  originSessionId: current-session-2026-06-09
---

**Benlik Kartı** (`js/parts/02c-self-card.js`, CSS `css/parts/self-card.css`) uygulamanın YENİ ilk-giriş onboarding deneyimidir. Eski **Yol Ayini (02b)** tamamen yerini aldı.

## Akış (sinematik overlay, `sc-onb` ID)
`totalSessions === 0` → `showMicroOnboarding()` → `window.runSelfCardOnboarding()` → 4 kategori toplama → 1500ms orbit animasyonu (LLM paralel) → "Olduğun Kişi" karar sahnesi → kullanıcı onaylar → downstream tohum.

**Sahneler (state.scene):**
0 = Intro (✶ "Önce kendi kartını yaratacaksın")
1 = Kategori toplama (CATS[catIdx]): ilerleme dotları + kıvılcım soruları + chip listesi
2 = Orbit animasyonu ("Emre Seni Okuyor") — minimum 1500ms
3 = Karar ("OLDUĞUN KİŞİ") — sentez portresi + 4 kategori özeti + onay butonu

**Özellikler:** Taslak kurtarma (SafeStorage DRAFT_KEY), "Şimdilik atla" butonu, kategori geçişinde otomatik kayıt, "Devam Et" geri dönüş mantığı.

## Kategoriler (CATS)
`dusunceler · inanclar · duygular · davranislar` — her biri 6 kıvılcım sorusu, kategori farkı açıklaması. Min 6 madde per kategori gerekli.

## LLM Sentezi (`synthesizePerson`)
`SUMMARY_MODEL` ile JSON: `baslik`, `portrait`, `dusunceler_ozet/inanclar_ozet/duygular_ozet/davranislar_ozet`, `foundations` (5 temel 0-100), `pattern`, `oneri`.
Fallback: deterministik `fallbackSynth(card)`.

## State & Kalıcılık
- `S._benlikKarti` → `js/state/benlik.js` slice → `state.js`'de compose edildi
- SafeStorage: `etw_benlik_karti_{uid}` (ana), `etw_benlik_draft_{uid}` (taslak)
- Supabase: `benlik_karti` tablosu (mig 011) — RLS owner; `confirmed` boolean
- `benlikLoad()` → 03-auth-shell `initApp` post-auth'a eklendi
- `benlikSave()` → her category-next + confirm + removeEntry + addFromView

## Downstream Tohum (`persistOnboardingSeed`)
Yol Ayini ile aynı state'leri besler:
- `S._foundationsProfile[k].score` ← LLM tahmin
- `S._personTransition.desired.description` ← `synth.oneri`
- `S._archetypes[archId].state` → `'reachable'` (FOUNDATION_ARCH haritası)
- `S._onboardingRecommendation` ← synth
- `dfSave()` çağrılır

## Koç Bağlamı
- `buildSelfCardContext(synth)` → `buildOnboardingContext(result)` → `window._microOnboardingCtx` (ilk seans açıcı)
- `benlikGetContext()` → `buildPersonalizationPrompt()` (09a) — **sadece confirmed kartlar**; son 4 madde per kategori; emre eklemeleri "(Emre)" ile işaretli

## Emre Kartı Zenginleştirme (sınırsız besleme)
`benlikSessionEnrich()` → seans sonu `requestChatExit` (06-summary-chat) kancasına eklendi.
LLM: mevcut kart + sohbet → yeni madde önerileri (src='emre', max 4/kategori).
**Guard:** sadece `S._benlikKarti.confirmed === true` ise çalışır.

## Görünüm: "BENLİK KARTIM" drawer
Route: `switchView('benlik')` → `loadBenlikView()` → `#benlik-root` içine render.
Drawer nav item: ALLOWED_VIEWS'a 'benlik' eklendi. switchView hook eklendi.
Boş/onaysız durum: `benlik-empty` + koşullu "Devam Et" CTA butonu.
Dolu durum: `benlik-portrait` (başlık + portre + meta) + 4 `benlik-sec` (madde listesi + "Emre" badge + inline ekleme satırı).

## Migration
`migrations/011_benlik_karti.sql` — **Supabase'e elle uygulanmalı.**

## Eski Yol Ayini (02b) — emekli, fallback olarak duruyor
Önceki onboarding 02b-onboarding-ritual.js'ti: Eşik → 3 alan teşhisi → Ayna → arketip sentezi; şıklar S._foundationsProfile'a yazar, kalıp etiketleri PATTERN_ARCH panzehri seçerdi. showMicroOnboarding/buildOnboardingContext imzaları korunup içeride yeni akışa devredildi; 02b yalnız runSelfCardOnboarding yoksa çalışan kasıtlı emniyet ağı ([[olu-kod-temizlikleri]]).

## Bağlantılar
[[personalization-engine-layers]] (benlikGetContext P6'dan önce eklendi)
[[kisilerim-kart-motoru]] (4-boyut şema aynı: Düşünceler·İnançlar·Duygular·Davranışlar)
[[build-source-convention]]

> **⚠️ AD SENKRONU (2026-07-25):** bu dosyadaki modül/dosya/anahtar adları
> ESKİDİR. Güncel eski→yeni haritası: [[ad-senkronu-kurali]]. Kısaca:
> `02c-self-card.js`→`02c-portre.js` (`sc.`→`por.`), `10A-an-karti.js`→
> `10A-gecis-karti.js` (`ak.`→`gk.`), `kk.living`→`kk.butunluk`;
> tablolar `benlik_karti`→`portre`, `benim_kartlarim`→`gecis_kartlarim`.
