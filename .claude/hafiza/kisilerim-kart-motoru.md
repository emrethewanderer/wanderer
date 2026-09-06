---
name: kisilerim-kart-motoru
description: Kişilerim kart-toplama oyunlaştırması — Kişi Kartı motoru (10q) + 112 kartlık deste (12b); ana mekanik
metadata: 
  node_type: memory
  type: project
  originSessionId: 21460c06-bd7e-4307-badd-4826062fcb6a
  modified: 2026-08-07T10:27:58.523Z
---

Ana oyunlaştırma mekaniği artık **kart toplama / koleksiyon** (Emre'nin isteği, 2026-06-02). Arka planda her etkileşimi analiz eden motor kullanıcının canlı "Kişi Kartı"nı (Düşünceler·İnançlar·Hisler·Davranışlar, 0-100) hesaplar; bir kartın reçetesi sağlanınca **80'ler folyo paket-açma animasyonuyla** kart hediye edilir. Drawer'da **"Kişilerim"** koleksiyon alanı.

> **⚠️ ÖLÇEK DEĞİŞTİ (2026-08-07):** deste 112 karttan **12 kartlık kesite**
> indirildi (Emre'nin kararı) — aşağıdaki kategori sayıları o günün destesidir.
> Güncel kesit, mekanik sözleşmesi ve ölçekleme kapısı: [[deste-12-kesit-karari]].

**Modüller:**
- `js/parts/12b-kart-destesi.js` — deste (lazy `getFullDeck`); o gün 112 kart. Kategoriler: cekirdek(12, 12a'dan içe aktarılır)/temel(15)/derinlik(8)/manifesto(12)/golge(6)/perde(6)/tuzak(7)/surec(6)/gercek(24)/bilesik(16). Nadirlik: yaygin/nadir/nadide/efsane. Her kart `wsArchCard` ŞEKLİYLE uyumlu + `category/rarity/recipe`. Hero kartlar tam-içerikli; gercek/bilesik `VIRTUE_META` şablonlu `makeCard` fabrikasıyla üretilir. `recipe={signals:[{key,op,value,weight,dim}],threshold,minEvidence}`; erdem→sinyal eşlemesi `rcp()`.
- `js/parts/10q-w2-kisi-karti.js` — motor: `kkComputeSignals` (S._foundationsProfile/_depthProfile/_relationshipDepth/_suretler/ritüel state + `dfGetBeliefStats/dfGetChoiceStats`), `kkComputeProfile`, `kkMatchCard`, `kkTick` (personalizationAnalyze kancası + idle 4sn), `kkBackfill` (ilk yükleme sessiz taban), `kkOpenPack` (80'ler paket), `kkRenderCard3D` (CSS 3B tilt + holo foil), `loadKisilerimView`, `kkOpenDetail`, `kkRenderBugunNudge`. Stiller JS-enjekte (`kkEnsureStyles`) — CSS-link yok. Durum S._archetypes[id] paylaşılır (motor 12a'nın 12 arketipini de **yalnızca yükselterek** otomatik sürer; manuel "MÜHRÜNÜ BAS" kaldırıldı).

**Kalıcılık:** IndexedDB (`wanderer-kv`/`kisiKarti`) + Supabase migration **009_kisi_karti.sql** (`kisi_karti_profile` + `kisi_kartlari`, RLS owner). Migration **Supabase'e elle uygulanmalı**. `kkInit` 03-auth-shell `initApp` içinde dinamik import + 1200ms gecikmeyle çağrılır.

**KRİTİK TUZAK (TDZ):** Yeni modüllere import kenarı eklemek rollup IIFE bundle sırasını değiştirip gizli bir "top-level çağrı → başka modülün const'ı" TDZ'sini açığa çıkarabilir. Bu işte `13-extras.js` initVesper IIFE'si `type=module` defer'i yüzünden eval sırasında `boot()→nowTR()→_TZ` (00-config-tracking) çağırıp "Cannot access 'fb' before initialization" verdi; **`setTimeout(boot,0)` ile ertelenerek** çözüldü. Yeni modül eklerken build sonrası tarayıcıda boot'u doğrula.

**"BİR KİŞİ" YENİDEN TASARIMI — BİTTİ (2026-06-02):** Her kart kitap-temelli + gerçek hayattan beslenen bir **insan portresi**. Şema: `portre` (kim bu kişi) · `gercek` (gerçek hayat sahnesi) · `kok` (kitap kökü) · `olunca` (dönüşüm vaadi) + kişiye-özel 4 boyut. 12b'de **`P()`** authored-kart fabrikası (id/virtue/rarity/recipe iskeleti korunur); `makeCard` tamamen kaldırıldı. cekirdek(12) için `CEKIRDEK_EXTRA` ile 4 yeni alan eklenir. **DOĞRULANDI (denetim 2026-06-02):** 112 kartın TAMAMINDA portre/gercek/kok/olunca var; çift id yok, tüm reçete sinyalleri motora eşleşiyor, 359 test + boot temiz. 10q `kkOpenDetail` Portre/◉Gerçek Hayatta/⟡Sen Bu Kişi Olduğunda/Kök bölümlerini gösterir.

**KİŞİLERİM / KİŞİLER BÖLMESİ + RENAME (2026-06-02):** Önceden Kişilerim 112 kartın hepsini (sahipli+kilitli) gösteriyordu. Artık ikiye bölündü — ortak saf kaynak **`kkPartitionDeck(deck, collection)`** → `{owned, unowned}` (+ `kkScoreAndSort` en-yakın-önce). **"Kişilerim"** (`loadKisilerimView`, kisilerim-view) = yalnız SAHİPLİ kartlar (revealed) + canlı kart başlığı + 0 ise davetkâr boş-durum (Kişiler'e CTA). **"Kişiler"** (`loadKisilerView`, arketipler-view — eski "Arketipler" rename) = yalnız SAHİPSİZ kartlar (locked, ilerleme + near-miss), yakınlığa göre sıralı + dinamik "EN YAKIN KİŞİ" spotlight. Route anahtarı `arketipler` AYNI kaldı (sadece UI etiketi "ARKETİPLER"→"KİŞİLER"); 03 route → `window.loadKisilerView`. Perf fix: `kkComputeSignals` kart-başına değil tek seferde. Bugün "en yakın kişi" nudge'ı → 'arketipler'. "Olmak İstediğin Kişi" (arketip-view, 12a) dokunulmadı.

**LEGACY TEMİZLİK + EMRE ÖNERİSİ BLEND (2026-06-02):** Eski 12a galeri+tören SİLİNDİ — `loadArketiplerView`/`wsOpenArchetypeReel`/`wsStartCeremony`/`wsSigilForCeremony` kaldırıldı (12a 1088→762 satır; korunan: `wsArchCard`/`wsArchTraitsHTML`/`_openTraitPopup`/`loadArketipView`). `EMRE_ONERI` 12a'dan **export** edildi → 10q `kkEmreBlock` ile "Kişiler" görünümünde curated **"EMRE'NİN ÖNERİSİ"** spotlight'ı (pick=hak-eden sahipsizken; evergreen headline + önce/sonraya rota + canlı ilerleme; stale demo sayıları `konum`/`gerekce` ATLANIR). Emre pick == en-yakın kart ise dedup (tek blok). main.js'ten `loadArketiplerView` import+expose kaldırıldı.

> **⚠️ 10q2'NİN İŞİ DEĞİŞTİ (2026-08-18):** Bugün'ün iki deste BÖLÜMÜ
> (`#kk-bugun`) söküldü. Kartlar iki ana kartın arkasındaki yığına (10f) ve
> tam ekran Karşılaşma odasına (13B) taşındı. 10q2'den geriye DESTE KAYNAĞI
> (`kkDesteAltin/kkDesteLapis`) ve DESTE YÜZEYİ (`kkDeckHTML/Bind/Len` —
> yalnız Geçiş masası tüketir) kaldı; `kkRenderBugun` ve `kkDesteKaydir`
> emekli. Ayrıntı: [[karsilasma-odasi]].

İlgili: [[wanderer-gamification-engine]] · [[personalization-engine-layers]] · [[iliski-felsefesi-ozet]] · [[zihniyet-devrimi-ozet]] · [[build-source-convention]]

> **⚠️ AD SENKRONU (2026-07-25):** bu dosyadaki modül/dosya/anahtar adları
> ESKİDİR. Güncel eski→yeni haritası: [[ad-senkronu-kurali]]. Kısaca:
> `02c-self-card.js`→`02c-portre.js` (`sc.`→`por.`), `10A-an-karti.js`→
> `10A-gecis-karti.js` (`ak.`→`gk.`), `kk.living`→`kk.butunluk`;
> tablolar `benlik_karti`→`portre`, `benim_kartlarim`→`gecis_kartlarim`.
