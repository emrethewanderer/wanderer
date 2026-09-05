---
name: ilham-kartlari-sosyal-feed
description: 10B SOHBET KÖPRÜSÜ (sade) + 10C Kişilerin Kişileri — eski İlham Kartı yaratımı 10A'ya gömüldü (2026-06-21)
metadata: 
  node_type: memory
  type: project
  originSessionId: 52de786d-a346-42e9-ade7-545eefa653dd
  modified: 2026-08-02T18:19:48.060Z
---

## 2026-07-02 · 2.0 güncellemesi (Benim Kartım 2.0 sprinti — detay [[an-karti]])
- 10B: cue sıkılaştı (güçlü/zayıf iki katman), seans-başına 2 chip, `[KART:]`
  etiket parser'ı (`_extractKartTag`), chip metinleri t()'de. Stil enjeksiyonu YOK.
  **GÜNCEL DEĞİL (2026-08-02):** altın CTA chip'i SÖKÜLDÜ (`ik.chip_*` silindi);
  yerine mesajın arkasında tıklanabilir kart çerçevesi var ve davet ancak
  tasarım tuttuysa doğar. Seans-başına 2 sınırı artık chip değil **ocak**
  (tasarım denemesi) sayar. Ayrıntı: [[mesajin-arkasindaki-kart]].
- 10C: CSS statik `css/parts/sosyal.css`'e taşındı; ⚑ Bildir (iki-vuruşlu,
  `paylasim_raporlari`) + admin `renderHalkaRaporlarAdmin` (HALKA · RAPORLAR).
- Rumuz artık SUNUCU MÜHRÜ: mig 025 `wanderer_rumuz(uuid)` BEFORE INSERT
  trigger'ları client değerini ezer; JS↔SQL parite fikstürleri 10B testinde.
- Beğeni/kayıt SELECT yalnız kendi satırların; `paylasilan_kart_kopyala` REVOKE;
  eski `ilham_kartlari` mühürlü satırları `an_kartlari`'a SQL göçüyle kurtarıldı.
- ⚠ DİKKAT: overlay click handler'larında `t` DOM elementiyle GÖLGELENİR —
  i18n metinlerini handler dışında (RPT kalıbı) önceden çöz.

## 2026-06-21 · KAVRAMSAL BİRLEŞME — İlham Kartı sınıfı SİLİNDİ
"İlham Kartı" diye anılan ayrı tek-kutuplu yaratım sahnesi tamamen 10A "Benim Kartım" iki-kutuplu omurgasına gömüldü. Detay: [[an-karti]] 4. tur notu. Bu dosyanın aşağıdaki orijinal içeriği TARİHSEL — Y/N karar gerekirse mutlaka [[an-karti]]'na bak. Sade özet:
- **10B artık yalnız sohbet köprüsü**: ilhamRumuz (anonim GEZGİN_XXXX) + _messageSuggestsPerson + _excerptForSeed + _onCoachMessageFinalized (coach chip → `akOnboard(seed,{source:'sohbet'})`). Tüm Atölye/LLM/paylaşım/Kendi Koleksiyonum/blend kodu sökülmüş.
- **Paylaşım 10A.akShare/akUnshare'de**: lapis kutbu snapshot `paylasilan_kartlar` tablosuna `kind:'ilham'` (enum geri uyum) iner. `paylasilan_kart_kopyala` RPC kullanılmaz; `sfCopyToMine` artık `paylasim_kayitlari` INSERT + 10A Atölye'sini tohumla açar.
- **Yol rozeti**: `+N İLHAM` → `+N`; kaynak `window.akCompletedCount()`.
- **Migration 023 dokunulmadı** (`ilham_kartlari` tablosu legacy; yazılmaz). Feed view + trigger'lar olduğu gibi çalışır.
- **10B-ilham-karti.test.js** sadeleşti (10 test: _excerptForSeed/_messageSuggestsPerson/ilhamRumuz). 401/401 yeşil; build temiz.

---
## ARŞİV — Aşağıdaki bölümler 2026-06-21 öncesi tasarım. Tarihsel referans için tutuldu, GÜNCEL DEĞİL.


**İlham Kartı (10B) — kullanıcının YARATTIĞI dördüncü kart sınıfı** (Benlik/An/Kişi-koleksiyonu yanına). "Mesele Sensin" tezini bir basamak ileri taşır: kullanıcı kart toplayan değil, kart YARATAN olur. Sohbette dokunan bir mesajın altında **altın CTA chip** ("Hadi böyle bir kişi oluşturalım →") belirir; tıklayınca Studio'da Atölye açılır; LLM tohumdan 4 kategoride hedef kişiyi tasarlar; kullanıcı çıkarır/ekler/isim verir; **büyük lapis 12c kart** + Mühürle.

**Üç sahne (10A omurgasıyla aynı):** Loading-Lapis → Atölye (tek kutuplu, 4 kategori checkbox+ek) → Mühür (büyük kart + iki toggle: "Olmak İstediğin Kişi'ye dahil et" + "Aynı anda paylaş").

**Üç ekran:**
- **Kendi Koleksiyonum** (`#kk-mine-view`, drawer GALERİ "KENDİ KOLEKSİYONUM"): İlham + An kartları yan yana, **gizli** (yalnız sahip görür). Paylaş/sil/düzenle. `loadKendiKoleksiyonumView`.
- **Atölye overlay** (`#ik-onb`, `.ik-stage--review/--seal`): JS-enjekte CSS (`#ik-styles`), CSS-link gerekmez.
- **Kişilerin Kişileri** (`#sosyal-view`, drawer GALERİ "KİŞİLERİN KİŞİLERİ"): **"EN BEĞENİLEN BU HAFTA" rafı** (yatay kayar, `paylasilan_haftanin_topu` view) + kronolojik akış; her kartta beğen/yorum/koleksiyonuma + kart detayında yorum yazma. **Anonim rumuz** (GEZGİN_XXXX, FNV-1a hash'inden deterministik). `loadSosyalView` / `sfOpenCardDetail`. Boş durum + "Daha fazla" sayfalama.

**DB (migration 023, ELLE uygulanır):** `ilham_kartlari` (owner-only), `paylasilan_kartlar` (read-all, owner-write, week_iso GENERATED), `paylasim_begenileri` (UNIQUE + trigger like_count), `paylasim_yorumlari` (trigger comment_count, max 600 char), `paylasim_kayitlari` (trigger save_count) + view `paylasilan_haftanin_topu` (like×2+yorum+kayıt rank) + RPC `paylasilan_kart_kopyala(BIGINT)` (atomik klon, çift-kopyalama önler). Tüm trigger'lar `SECURITY DEFINER` değil — sıradan trigger.

**Sözleşmeler:** 12c motoru tek doğruluk (yeni kart stili YAZILMADI — `ikvCardFace({palette:'lapis', stage:'pencere', virtue:'odak'})`); 4 kategori şeması 02c/10A ile birebir; varsayılan gizli; paylaşımda gerçek ad **asla**. Anonim rumuz `ilhamRumuz()` sabit cached (`S._ilhamRumuz`).

**Yol entegrasyonu:** Mühürlü kart sayısı **`+N İLHAM` altın rozet** olarak `yol-pole-lapis`'e iliştirilir (10f markup IIFE). `09a buildPersonalizationPrompt` `window.ilhamGetContext()` ile en yeni 5 kartı koç bağlamına enjekte eder — Wanderer hedef niteliklere yumuşak yönlendirme yapar.

**Dosyalar:** `migrations/023_ilham_kartlari.sql` · `js/state/ilham.js` · `js/parts/10B-ilham-karti.js` (~830 satır) · `js/parts/10C-sosyal-feed.js` (~600 satır) · `tests/10B-ilham-karti.test.js` (21) · `tests/10C-sosyal-feed.test.js` (7) · `SETUP-ILHAM-KARTLARI.md`. Mevcut dosyalarda KÜÇÜK kancalar: `_src.html` (2 view + 2 drawer room), `js/state.js`, `js/main.js`, `js/parts/03-auth-shell.js` (route + init), `js/parts/09a-personalization-engine.js` (koç ctx), `js/parts/10f-w2-yol.js` + `css/parts/yol.css` (rozet).

**KRİTİK SÖZLEŞME (Y/N kararı için):** İlham Kartı **sadece lapis** (hedef) — altın değil. Altın Benlik Kartı'dır; yeni bir altın yazmak repolar çakışır. Bunu unutma: yeni "kullanıcı yaratımı kart" eklemek istersen, mevcut benlik-altın / ilham-lapis ayrımını koru.

**DOĞRULAMA (416/416 + production preview):** Atölye overlay tam doğru sahnede, Kendi Koleksiyonum An kartlarını listeler, Sosyal feed GEZGİN_XXXX rumuz pilini çiziyor, drawer'da iki yeni room, kart motoru lapis İlham kartını doğru çiziyor (lapis kenar + pencere sahne + altın yıldız + Cinzel kicker). Konsol temiz. NOT: window.ilham* yalnız POST-AUTH expose olur (kardeş modüllerle aynı); fresh preview'da oturum yoksa undefined — bu BEKLENEN.

## 2026-06-21 · Denetim turu — KRİTİK BUG'LAR DÜZELTİLDİ
İlk yazımda 3 sessiz-çökme bug'ı vardı, hepsi giderildi:
1. **`window.sb` HİÇBİR YERDE set edilmiyor** — config.js `export const sb`'yi window'a koymaz. Tüm Supabase çağrıları `undefined` üzerinde sessizce çöküyordu (try/catch yutuyordu). FİX: 10B+10C `import { sb } from '../config.js'`. GELECEK İÇİN: bu repoda Supabase için DAİMA `import { sb }`, asla `window.sb`.
2. **Hook metodu `.add` DEĞİL `.after`** — `createHookRegistry()` (00a) `{before, after, runBefore, runAfter}` döner. `startStreamingFinalizeHooks.add?.()` sessizce no-op'tu → chat CTA chip HİÇ eklenmiyordu. FİX: `.after((el,raw)=>...)`. 13-extras de `.after` kullanır (kanonik).
3. **Migration 42P17 (not immutable)** — `week_iso GENERATED ALWAYS AS (to_char(shared_at AT TIME ZONE 'Europe/Istanbul'...)) STORED` → `AT TIME ZONE` immutable değil. FİX: kolon TÜMÜYLE kaldırıldı; haftalık-top view `WHERE shared_at >= date_trunc('week', now() AT TIME ZONE 'Europe/Istanbul') AT TIME ZONE 'Europe/Istanbul'` (view'da STABLE serbest). GELECEK: GENERATED kolonda timezone-bağlı/now()-bağlı ifade YASAK; bunları view/trigger'a taşı.

Ek iyileştirmeler: detay-like çift-sayım yarışı düzeltildi (standalone await'li handler); `loadKendiKoleksiyonumView`/`_renderView` body listener `addEventListener`→`onclick` (mükerrer birikim); An kart açma `akOpenDetail`→`akOpenCollection`; native `confirm()`→iki-vuruşlu sil (10A dili); chat chip artık HER mesaja değil `_messageSuggestsPerson()` ipucu eşleşince çıkar; RPC id tam-uuid (PK çakışma riski 0); kopyalama non-destructive (sadece yeni kartı çek). Tasarım prensipleri: tüm inputlar 16px (iOS zoom), `:focus-visible` altın halka, 44px touch hedef, radius≥12px, tarih metinlerinde `text-transform:uppercase` KALDIRILDI (tr 'i→İ' tuzağı), `.ik-btn--danger` kırmızı yalnız yıkıcı eylemde.

İlgili: [[an-karti]] (omurga ikizi) · [[benlik-karti]] (4 kategori şeması kaynağı) · [[uc-muhur-yol-tasarimi]] (Yol kutupları) · [[kart-gorsel-dili]] (12c motoru) · [[tasarim-prensipleri]] · [[build-source-convention]]
