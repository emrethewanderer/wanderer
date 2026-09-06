---
name: emre-sesi-yonlendirme
description: "Emre'nin Sesi (16d): TÜM client Emre yönlendirmeleri DB'den (persona_directives mig 026 ELLE) yönetilir; p() override zinciri; admin odası; ext mode.guide silindi→TR fallback"
metadata: 
  node_type: memory
  type: project
  originSessionId: 8a413cb2-7d5c-420c-92ec-f8b484eeb11b
---

**2026-07-02 · "Emre sadece Admin'den yönlendirilsin"** — koddaki tüm hardcoded Emre yönlendirmeleri tek admin odasına bağlandı.

**Mimari (3 katman):**
1. **DB = canlı kaynak:** `persona_directives` (**mig 026 ELLE** — Emre Supabase'de çalıştırmalı!) `(key, lang['tr'|'en'], content)`; RLS herkes okur / yalnız admin yazar. Satır YOKSA sözlük varsayılanı çalışır → tablo kurulmasa bile hiçbir şey bozulmaz.
2. **p() override zinciri** [16-i18n-prompts.js]: dil-override → dil-sözlüğü → **TR-override** → TR-sözlüğü → key. `setPromptOverrides()/getPromptDefault()` export edildi. KRİTİK İNCELİK: TR-fallback'te sözlükten ÖNCE TR override'a bakılır — ext dillerde silinen anahtarlar canlı sesi izler. Boot: 03-auth-shell post-auth `esInit()` (SafeStorage `etw_emre_sesi_v1` cache anında + DB tazeleme).
3. **Admin odası "EMRE'NİN SESİ"** [16d-emre-sesi.js] (ÇEKİRDEK kanadı, `switchAdmin('emre-sesi')`): 14 öne-çıkan (başlık+açıklama) + kalan ~295 anahtar regex-gruplu (`ES_GROUPS`) — sözlüğün TAMAMI görünür/düzenlenebilir. Arama (TR-duyarlı), TR/EN sekmesi, VARSAYILAN/ÖZEL rozeti, {{değişken}} lejantı, yapısal-token uyarısı ([MOD:]/[ARAC]/JSON), Yayınla=upsert (varsayılanla aynıysa satırı SİLER — sözlük izlensin), Varsayılana Dön=delete, açık akordeonlar re-render'da korunur, eksik {{var}} uyarı-ile-yayınlar.

**Inline temizliği:** 7 modüldeki gömülü "Sen Emre…" promptları 16b sözlüğüne taşındı (TR+EN parite): `prompt.benlik.synth_system`(02c) · `an_karti.design_system`(10A) · `hayal_alemi.visualization`(10i) · `gecis_alani.fill`(10j) · `kendinle_konusma.reflection`+`reflection_inanc`(10k, JSON şeması farklı diye 2 anahtar) · `degerlendirme.summary`(10l) · `geri_cagri.instruction`(13o; [BAĞLAM] eki kodda kaldı — veri montajı). Kodda 0 inline yönlendirme kaldı (grep "Sen Emre|Wanderer'sın" temiz).

**Ext dil onarımı:** 11 dilin `prompt.mode.guide`'ı ESKİ 4-modlu yüzleşme-çağı metniydi ([[yuzlesme-kacis-kaldirma]] açık riski) → 16b-ext'ten SİLİNDİ; p() güncel TR'ye düşer (yanıt dili getLangInstruction ile ayrı). Ext asset 457→413KB. NOT: ext kullanıcının turn-başı prompt'u ~13KB büyür (tam kılavuz); yeniden çeviri istenirse GÜNCEL core'dan üretilmeli.

**Sistem sınırları (kodda kalması ZORUNLU):** (a) sözlük varsayılanları = çevrimdışı/ilk-boot emniyeti; (b) sunucu personası system_prompt zaten "Kişilik" odasında (admin_settings), kitap alıntısı/edge-fn iskeleti ELLE [[persona-server-side]]; (c) parser'ların okuduğu token biçimleri metin içinde düzenlenebilir ama BOZULMAMALI (odada uyarı var); (d) 11 ext dil çevirileri sözlükte — TR/EN override onlara yansımaz (TR-fallback hariç).

**Emergent özellik:** sözlükte OLMAYAN anahtar da DB'den çalışır (p() override'ı önce bakar) → `pArray` genişletmesi (ör. `identity_message_8` + `_count`=9) panelden mümkün.

Test: tests/16d-emre-sesi.test.js (17 test; parite + zincir + saf-DB anahtarı). İlgili: [[odak-modelleri]] (model-özgü davranış ayrı) · [[cekirdek-omurga-haritasi]] · [[emre-yonlendirme-hardcode-yasak]]

**2026-07-04 · Takip taraması — 12 kaçak bulundu ve temizlendi.** Centralization'dan bu yana eklenen özelliklerde 7 dosyada 12 hardcoded koç-talimatı sızıntısı tespit edildi (2 paralel subagent + elle doğrulama): `02b-onboarding-ritual.js` (p import bile etmiyordu — hiç dahil olmamış), `02c-self-card.js` (×2), `09b-depth-foundations.js` (×3), `10A-an-karti.js` (×2), `13l-kimlik-motoru.js`, `09a-personalization-engine.js`, `10w-w2-odak-modelleri.js`. Hepsi 12 yeni `p()` anahtarı olarak sözlüğe taşındı (TR+EN parite 313/313), `16d-emre-sesi.js` ES_GROUPS regex'i `self_card|depth_foundations|kimlik_motoru|ritual_work` ile genişletildi (RİTÜEL ATÖLYELERİ grubuna düşsünler diye). `benlikSessionEnrich`'in analist `sys` prompt'u (persona'sız, `skipPersona:true`, "Sen Emre" demiyor) bilinçli olarak DIŞARIDA bırakıldı — persona sesi taşımıyor, yapısal JSON-çıkarım görevi. 455 test yeşil. DERS: centralization tek seferlik bir "temizlik" değil — yeni özellik eklendikçe tekrar kontrol gerekir; bu yüzden [[emre-yonlendirme-hardcode-yasak]] artık kalıcı bir davranış kuralı.

**2026-08-19 · Oda dört yüzey kazandı** ([[persona-ic-calisma]]):
(1) **SUNUCU SESLERİ** — edge fonksiyonlarının prompt'ları da panelden
yönetiliyor (`prompt.srv.*`, sözlükte DEĞİL, saf-DB anahtarı olarak görünür;
sunucuda `_shared/persona-directives.ts` · `pServer` aynı zinciri yürütür).
(2) **Önceki sürümler** — "Yayınla" geri alınabilir; defteri DB trigger'ı
yazar (mig 043), panel yalnız okur ve seçilen sürümü KUTUYA yazar.
(3) **Provada dene** — kutudaki taslakla kaydetmeden tek dönüş (16g `prvKos`;
`finally` canlı haritayı geri yazar).
(4) **Ses sınaması** — yedi kanonik konuşma (16h) + `scripts/ses-eval.mjs`
register kapısı; sonuç kaydedilmez, Gözlemevi kadranı ayrı sprint.
`ES_GROUPS` bu ayın anahtar ailelerine açıldı (ayna/olus/imge/oik/yp/
personalization/srv) — son-çare torbası 119 → 69. Yeni testler:
`sunucu-sesi` · `16d-vitrin-gruplari` · `16g-prova-sahnesi` ·
`ses-eval-kapisi` · `anayasa-register`. Harness: `.claude/harness/emre-sesi-paneli.html`
(stub artık `__harnessRows` ile tablo satırı da besleyebiliyor).
