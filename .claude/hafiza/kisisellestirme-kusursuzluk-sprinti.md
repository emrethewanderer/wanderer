---
name: kisisellestirme-kusursuzluk-sprinti
description: Kişiselleştirme Motoru (09a-09h+00a) kusursuzluk sprinti — 2026-07-18 TAMAMLANDI; 6 faz (kalıcılık kök çözümü+2 bug+i18n+ölü kod+test kalesi); 960 test yeşil; ELLE yok
metadata: 
  node_type: memory
  type: project
  originSessionId: 18b6627a-f904-4436-86df-e55e2b07b542
---

**Kişiselleştirme Motoru Kusursuzluk Sprinti** (2026-07-18, plan `.claude/plans/kisisellestirme-kusursuzluk.md`).
Emre'nin isteği: "Wanderer personalization engine" oturumunun işi için Kusursuzluk Sprinti —
[[kusursuzluk-sprinti-kararlari]] ve [[benlik-kusursuzluk-sprinti]]'nin devamı; bu kez
[[personalization-engine-layers]] (09a P1-P6) + [[taniyan-ayna-kisiselestirme-3]] (09e-09h) yığını.

## 3 onaylı karar (AskUserQuestion, 2026-07-18)
1. Kapsam = tam yığın (09a+09b+09e-09h+09c+09d).
2. 00a SafeStorage yazım kuyruğuna KÖK çözüm (lifecycle flush + ckpt aynası).
3. Test kalesi TAM (09a orkestrasyonu + 09e hipotez durum makinesi + 09f/09h dalları).

## KAPANIŞ — 6 faz TAM, 895→960 test (+65), build 630KB gzip (bütçe 650KB)

**FAZ 1 (kalıcılık kök çözümü):**
- `00a-infrastructure.js`: `_writeQueueCkpt()` + `_installLifecycleFlush()` (hidden→async flush+ckpt,
  pagehide→ckpt) + `storageInit` yetim-kurtarma (48h guard, kuyruk+`_kvCache` ikisine) +
  `_persistToSupabase`/`_deleteFromSupabase` enqueue-anında ckpt (sıra-bağımsızlık) +
  `_flushQueue` uçuş-sırası kayıp-güncelleme guard'ı (`_writeQueue.get(key)===item` kontrolü).
  Yeni anahtar `etw_wq_ckpt_<uid>` (HAM localStorage, SafeStorage DEĞİL — döngü olurdu).
  sendBeacon BİLİNÇLİ kullanılmadı (Supabase REST header taşıyamaz).
- `09e-yasayan-portre.js` `_ypSaveNow`+flush, `09d-oruntu-motoru.js` `_omSaveNow`+flush (02c/00f kalıbı).
- `09a`: `p6GetProactiveCheckin` artık mühür anında `personalizationSave()` çağırır (önceden render
  yolunda mutasyon yapıp kaydetmiyordu); modül-seviyesi hidden/pagehide flush eklendi.

**FAZ 2 (gerçek buglar):**
- `09h-ayna-ani.js`: teaser/empty dallarındaki `foot.innerHTML=''` silindi — Kapat butonu artık
  HER dalda yaşıyor (önceden aday-yok durumlarında overlay kapanamıyordu, Gözlemevi'nde yetim
  `wtOverlayOpen` kalıyordu). + backdrop-tıkla-kapat eklendi.
- `09a`: `\bönümüzdeki\b` + `_DAY_NAMES` dinamik regex'i — JS `\b` ASCII, TR harfle başlayan/biten
  kelimede (önümüzdeki/salı/çarşamba) hiç eşleşmiyordu → TR-harf sınıflı sınır grubuna geçti
  (lookbehind KULLANILMADI — iOS <16.4 WKWebView SyntaxError riski).

**FAZ 3 (prompt/i18n disiplini):**
- Deep-analysis gövdesi + `_buildRitualWorkContext` hardcode TR'den `prompt.personalization.*` /
  `prompt.ritual_work.*` ailesine taşındı (TR metin BAYT BAYT korundu — golden-string testiyle
  kilitlendi). `dil_haritasi` (üretilip hiç okunmayan alan) artık `ypGetContext`'e `prompt.yp.dil`
  ile tüketiliyor (metafor≤3, kelime≤5; `hitap` bilinçli dışarıda — taklit riski).

**FAZ 4 (ölü kod + disiplin):**
- `personalizationSyncToSupabase`/`personalizationSync` (boş no-op) + `renderPersonalizationDashboard`
  (container `_src.html`'de hiç yoktu, kanıtlı ölü) kaldırıldı — çağıran cerrahisi 03/06/09c'de.
  Bundle 632→630KB. Bayat init yorumları (eski ms-slot dünyası) ready-promise zincirine güncellendi.
  09e/09g "geçersiz LLM çıktısı" warn→error (prod'da warn düşüyor, error kalıyor — vite.config pure).
  `_mergeFreqTopics` yardımcısı (triggers/soothers ikiz merge birleştirildi).

**FAZ 5 (test kalesi, +65 test):** buildPersonalizationPrompt kompozisyonu (5) + personalizationDeepAnalysis
merge dalları (8: triggers/soothers/people/openLoops-dedup/life_facts/mirror_response×2/parse-hata/save) +
personalizationAnalyze orkestrasyonu (2, gerçek davranış kilitlendi: bir katman fırlarsa SONRAKİ katmanlar
çalışmaz — try/catch YOK) + P2-P5 çekirdek testleri + 09e GERÇEK hipotez durum makinesi (stub'suz, 09g+09e
gerçek iki-modül entegrasyonu dahil) + 09f boş-dizi fallback + insert-error dalları.

**FAZ 6 (öz-inceleme, kendi buglarım):** 09h'de `foot` değişkeni artık okunmuyordu (FAZ 2 temizliğinden
kalan) → silindi. 09a'da `escapeHTML` importu dashboard kaldırılınca yetim kaldı → silindi. 06'da
"Supabase sync" diyen bayat yorum → düzeltildi. 03'te tek-satır blok parantezi sadeleştirildi.

## Korunan sözleşmeler (doğrulandı, preview canlı)
22 window.* fonksiyonu (yp*/eh*/ap*/ay*) sağlam; kaldırılan 3 fonksiyon (personalizationSync/
SyncToSupabase/renderPersonalizationDashboard) zaten window'a hiç açılmıyordu (ES-export), boot
hatasız. `etw_p_*`/`etw_yp_dosya_*`/`etw_eh_meta_*`/`etw_ap_meta_*`/`etw_om_*` anahtarları aynen;
YENİ `etw_wq_ckpt_<uid>` eklendi.

**Senin yapman gereken (ELLE): YOK.** Migration/edge function/RLS değişikliği yok.

İlgili: [[personalization-engine-layers]] (P1-P6 temel, mimari değişmedi) · [[taniyan-ayna-kisiselestirme-3]]
(09e-09h mimari, mühür/dil_haritasi tüketimiyle güncellendi) · [[benlik-kusursuzluk-sprinti]] (flush
kalıbının kaynağı: `_installLifecycleFlush` 02c'den birebir taşındı) · [[gozlemevi-kullanim-nabzi]]
(00f hidden/pagehide+ckpt kalıbının kaynağı) · [[yerel-tarih-anahtari]] (nowTR().toISOString() çift-öteleme
bilinçli dokunulmadı, tek uyarı yorumu eklendi).
