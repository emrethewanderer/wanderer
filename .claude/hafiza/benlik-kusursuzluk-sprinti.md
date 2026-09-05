---
name: benlik-kusursuzluk-sprinti
description: Benlik Kartı (02c) kusursuzluk sprinti — 2026-07-17/18 TAMAMLANDI (FAZ 0-7); anında kayıt+dalga kalıcılığı+serileştirme+dil bütünlüğü+a11y+CSS temizliği; ELLE yok
metadata:
  type: project
  originSessionId: benlik-kusursuzluk-2026-07-17
---

**Benlik Kartı Kusursuzluk Sprinti** (2026-07-17 başladı; plan `.claude/plans/benlik-kusursuzluk.md`).
Emre'nin vizyonu ("Wanderer self-card system design" oturumuna dayanarak): mimariyi en iyi
seviyeye getir → geliştirilebilecek her yerde en iyi çalışmayı yap → baştan denetle, kusursuz
olsun — bu kez [[benlik-karti-2-olunan-ad]] sistemine odaklı.

## Onaylanan kararlar (2026-07-17)
1. **Koordinasyon:** Aynı repo üzerinde eşzamanlı çalışan [[kusursuzluk-sprinti-kararlari]]
   oturumu da `02c-self-card.js` + `16b/16e` sözlüklerine dokunuyor (o planın FAZ 2'si). Git
   yok — bu sprint o oturumun FAZ 2'si **kapanana kadar** 02c/self-card.css/16b/16e'ye
   dokunmuyor; önce dokunmayan fazlarla (0, 1) ilerliyor.
2. **Kapsam:** Teknik kusursuzluk (mimari + veri bütünlüğü + kod sağlığı + test + ölü kod +
   a11y). Görsel/ürün yüzeyi DEĞİŞMEZ — 2.0 tasarımı taze ve doğrulanmış.
3. **Dil sızıntısı çözülür:** EN/DE kullanıcıda absorb edilen 12b kart maddeleri artık taşma
   şartsız resynth kapsamına girip kullanıcı diline çevrilecek (eskiden yalnız >8 madde/kategori
   taşınca yoğunlaştırılıyordu — ödünleşim artık kapatılıyor).

## Bulunan kritik sorunlar (keşif, 2026-07-17)
- **Absorb dalgası kaybı:** `benlikAbsorbCard` maddeyi senkron ekliyor ama kayıt yalnız
  1200ms debounce'ta (`_scheduleEvrim`); sayfa o pencerede kapanırsa madde+dalga kaybolur —
  `beforeunload`/`pagehide` flush yoktu.
- **`benlik_karti` tablosu write-only:** repo genelinde tek `.select()` yok; client hiç geri
  okumuyor, cihazlar-arası "senkron" aslında SafeStorage KV hydration'la çalışıyor.
- **Enrich↔Resynth yarışı serileştirilmemiş:** `benlikSessionEnrich` (fire-and-forget,
  06-summary-chat:70) ile kazanım-tetikli `benlikResynth` eşzamanlı koşup birbirinin
  `benlikSave` yazımını ezebiliyordu.
- **Test mock tuzağı:** `tests/setup.js`'teki `upsert()` thenable değildi →
  `benlikSave`'in Supabase dalı + 42703 fallback (`_benlikEvrimColsOk`) testlerde hiç
  yürümüyordu; onboarding/tohumlama/doğuş töreni tamamen test dışıydı.
- **CSS'in ~%30'u ölü:** `self-card.css` `bk-*` geçiş şeridi (~250 satır) hiçbir JS
  üretmiyor (muhtemelen 2.0 redesign'ında yer değiştirdi).
- **Onboarding overlay'de focus-trap/Escape yoktu** (role=dialog var ama a11y eksik).

## Faz sıralaması
FAZ 0 koordinasyon kapısı (dokunmadan) → FAZ 1 test altyapısı (setup.js upsert) → FAZ 2
veri bütünlüğü (anında save + dalga kalıcılığı `etw_benlik_evrim_wave_{uid}` + promise-zincir
serileştirme) → FAZ 3 dil bütünlüğü (resynth kapsam genişlemesi) → FAZ 4 kod sağlığı+a11y →
FAZ 5 test kalesi boşlukları → FAZ 6 CSS temizliği → FAZ 7 kapanış. Tam gerekçeler ve
dosya:satır referansları `.claude/plans/benlik-kusursuzluk.md`'de.

## FAZ 0 kapı durumu (canlı doğrulandı, 2026-07-17 21:05)
İlk bakışta Kusursuzluk Sprinti oturumu limit'e çarpıp durmuş görünüyordu (13q taşınmış,
09a hâlâ hardcode) — ama bu bayat bir anlık-görüntüydü. Dosya mtime'ları (09a 15:44, 16b
20:36) ve saat (limit sıfırlama 20:10'da geçmiş) bir **devam oturumunun** çalışmayı
sürdürüp FAZ 2-7a'yı tamamladığını gösterdi; ikinci grep turu `09a:1657/1660`'ın artık
`p('prompt.personalization.deep_analysis_task/rules')` kullandığını ve
`migrations/036_kalici_fn_kota.sql`'in var olduğunu doğruladı. **Kapı açıldı** — Benlik
sprinti 02c/self-card.css/16b/16e üzerinde serbestçe ilerliyor. Ders: dosya mtime + saat
karşılaştırması, transcript anlık-görüntüsünden daha güvenilir kanıt.

## KAPANIŞ (2026-07-18, tüm fazlar doğrulandı)
8 faz de tamamlandı — her fazın sonunda `./build.sh` + `npx vitest run` + preview canlı
kontrolü geçti. Toplam: 895 test yeşil (sprint başı 873 → +22: 02c-benlik-evrim.test.js'e
+8, yeni tests/02c-benlik-onboarding.test.js 14), build 631KB gzip (bütçe 650KB, sprint
öncesinden 2KB düşük — CSS temizliği payı). Sıfır davranış regresyonu; 9 window sözleşmesi
+ 13 benlik-özel window fonksiyonu (toplam 22, bazı örtüşmelerle) canlı doğrulandı.

**Kod tarafı (`js/parts/02c-self-card.js`):**
- K1: `benlikAbsorbCard` artık anında `benlikSave()` + `_waveSave()` çağırır (debounce
  yalnız `benlikResynth`'i erteler); `etw_benlik_evrim_wave_{uid}` KV anahtarı dalgayı
  kalıcılaştırır, `benlikLoad` devralır; `visibilitychange(hidden)+pagehide` flush kurulur
  (00f kalıbı); onboarding `tryAdd` her maddede `saveDraft()` çağırır.
- K2: `_benlikSerial` promise-zinciri `benlikSessionEnrich`+`benlikResynth`'i sıraya sokar
  (impl/wrapper ayrımı: `_enrichImpl`/`_resynthImpl` iç, dışa açık adlar zincirler).
- K3: `benlik_karti` tablosunun rolü yorumla netleştirildi (yazma-yönlü projeksiyon, KV
  daima okuma kaynağı) — read-fallback bilinçli olarak EKLENMEDİ.
- K4: TR olmayan kullanıcıda taşmayan kart-kategorileri de resynth kapsamına girip
  (madde sayısı korunarak) çevrilir; ref'ler sayı korunduysa pozisyonel taşınır.
- K6: `A11y.trapFocus` + Escape (yalnız sahne 0) + odak restorasyonu; `ikvHoloScan` tek
  yol (statik import); `cardListText({marks})` + `_benlikEnsureSahne` helper'ları iki
  tekrar bloğunu tekilleştirdi.
- 16b/16e/de-prompt: `resynth_system`'a dil-modu talimatı eklendi; DE'ye eksik
  `enrich_system` anahtarı yazıldı (TR/EN'de zaten vardı).

**CSS (`css/parts/self-card.css`, 856→~600 satır):** `bk-*` geçiş şeridi (~250 satır,
üçlü kanıtla ölü — `_src.html` yorumu "emekli" onayladı) + `.sc-desired-ta` + çıplak
`.benlik-portrait` kapsayıcı silindi (alt sınıflar `-badge/-title/-text/-meta` CANLI,
korundu). Ham `rgba(245,166,35,…)` değerleri token'a bağlandı (`--gold-hairline` tam
eşleşme; `.45`/`.30` için dosya-içi `--sc-gold-45/30`). `_src.html` `?v=5`.

**Test (`tests/`):** `setup.js` upsert artık thenable (Supabase dalı + 42703 fallback
canlandı) · `02c-benlik-evrim.test.js` 11→19 · yeni `02c-benlik-onboarding.test.js` 14
(uçtan uca onboarding DOM akışı, persistOnboardingSeed, benlikDrainAbsorbQueue, taslak
kurtarma, Escape a11y, buildSelfCardContext, benlikSessionEnrich, synthesizePerson/
normalizeSynth/fallbackSynth, benlikLoad backfill).

**Korunan sözleşmeler:** 14 window adı + storage anahtarları (`etw_benlik_karti/draft/
absorb_q_{uid}` değişmedi, `etw_benlik_evrim_wave_{uid}` YENİ) + DOM id'leri +
`kk.collection[id].benlikAbsorbed` + `◈ BENLİK KARTI` başlığı — hepsi aynen.

**Senin yapman gereken (ELLE):** Yok. Migration/deploy gerektiren iş bilinçli olarak
sprint kapsamı dışında tutuldu.

**Öz-inceleme bulguları (FAZ 7, kendi buglarım):** `benlikResynth` doc-comment'i K4
sonrası bayat kalmıştı (yalnız "taşan kategoriler" diyordu) → düzeltildi. Escape/trapFocus
davranışı otomatik test kapsamı dışındaydı (yalnız preview'da doğrulanacaktı) →
`02c-benlik-onboarding.test.js`'e 2 test eklendi.

İlgili: [[benlik-karti-2-olunan-ad]] (mimari) · [[kusursuzluk-sprinti-kararlari]] (eşzamanlı
sprint, dosya çakışması — FAZ 2/7a tamamlandı, koordinasyon sorunsuz kapandı) ·
[[olu-kod-temizlikleri]] (CSS silme kontrol listesi)
