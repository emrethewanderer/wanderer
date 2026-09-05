---
name: tanima-motoru
description: "Tanıma Motoru sprinti TAMAM (7/7): dört platformun tavsiye mekaniği kanıt anayasasına çevrildi; 09i seçici + keşif yuvası + 'Neden bu?' şeffaflık paneli + beyan defteri"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0331ace6-6d8c-4739-aaea-420bd80a73b8
  modified: 2026-08-10T00:55:57.485Z
---

Emre'nin isteği (2026-08-09): *"Meta, X, YouTube, TikTok algoritmalarını detaylı inceleyerek Wanderer'ın kullanıcıyı tanımasını onların seviyesine, mümkünse daha ileriye götür."* Plan: `.claude/plans/tanima-motoru.md` (kanonik kopya repoda; her fazın altında o fazın denetim notu var — FAZ 7'ye başlamadan FAZ 6 notunu oku).

**Kuzey yıldızı:** platformların değer modeli P(kalır) hesaplar, bunun ki **P(tanındı)**. Aynı makine parçaları (mikro-sinyal, negatif defter, çürüme, iki aşamalı seçim, keşif), ters amaç fonksiyonu. Kazanım kapıları (10q üç kapı, nadirlik eşikleri) DOKUNULMAZ — seçici yalnız SIRALAR (K2), fallback'i mevcut `kkScoreAndSort` sırasıdır.

**Nerede duruyor (2026-08-10): YEDİ FAZ TAM.**
- FAZ 1-5 ✅ — oturum izi (`S._oturumIzi`), negatif defter + kapalı döngü (09d gün satırı `gezinme/neg/davet`), seçici çekirdeği `js/parts/09i-secici.js` (`secAday`/`secSirala`/`secGirdiTopla`, hepsi `window.sec*`), değer modeli ağırlıkları (ceza ödülden sert: olumlu ×1.25 tavanlı, negatif ×0.6 tabanlı), tüketici bağlama (10q spotlight + Emre rafı sırası seçiciden; 09a'da oturum izi LLM satırı; 13o).
- FAZ 6 ✅ — keşif yuvası: "Bugünün Kişisi" uniform zardan **uğranmamış erdem sondajına** döndü (10q `_kesifErdemi`/`_kesifYuvasi`). Havuz ölçüsü `imVirtueNow()` (13l), eşik `KESIF_ESIK = 20`, erdem rotasyonu gün indeksiyle, kart seçimi `czDaily('kesif')`. Keşif modunda hazırlık çubuğu susar.
- FAZ 7 ✅ — **"Neden bu?" şeffaflık paneli** (10q `kkNedenAc`/`kkNedenGirisHTML`, `.kk-neden-*`) + **beyan defteri** (09i `secBeyanAzalt`/`secBeyanGeriAl`/`secBeyanVar`, `etw_secici_v1_<uid>` — bu sprintin TEK kalıcı anahtarı). Yüzeyler: spotlight · Emre rafı (yalnız raf modunda) · keşif yuvası · 13o balonu (`gc-davet`).

**FAZ 7'nin üç kalıcı dersi:**
1. **Kartın öne çıkışının kanıtı bir cümle değil ÖLÇÜMdür.** Plan `kokenAlintiCoz` zincirinin kart yüzeyinde hazır olduğunu varsaymıştı; değildi. Kullanıcının kendi cümlesini üreten tek yer Oluş Sınaması'ydı ve alıntıları gösterip atıyordu — artık `esik.sinav.alintilar`'da kalıcı (10q4). Panel o cümleyi gösterir, yoksa göstermez.
2. **K7 üç katman:** BEYAN + ÖLÇÜM satırları paneli hak eder; YORUM satırı yalnız ALINTIYA bağlıyken doğar ve ihtimalsel konuşur. Söylenecek beyan/ölçüm yoksa **giriş düğmesi hiç çizilmez**. "Alıntı yoksa yüzey yok" diye okunsaydı özellik ölü doğardı.
3. **Susturma süresiz AMA geri alınabilir** — sessiz zaman aşımı beyanı ölçüme çevirirdi. `secAday` beyanlı adaya `null` döner; ama filtre 10q'da havuz kurulurken de uygulanır, çünkü `_secSiraliIdler`'in "kısmi sonuç = fallback" kuralı beyanı sessizce iptal ederdi.

**Why:** kanıtsız değer yoktur (§6.10) — bu sprint boyunca her yeni sayı `kokenOlc` kapısından geçti, kanıtsız aday listeye 0 alarak girmedi, **hiç doğmadı**. Sunucu telemetri sözleşmesi (`usage_events`, 00f gizlilik satırı) bilinçli olarak DEĞİŞMEDİ (K4) — bu yüzden bu sprintte **ELLE Supabase işi yok**, mikro-sinyaller cihaz defterinde (09d/SafeStorage) durur.

**How to apply:** yeni bir yüzey öne çıkarma kararı vereceksen seçiciyi çağır (`secGirdiTopla` → `secAday` → `secSirala`), kendi sıralama kuralını yazma; beyanı da havuz kurarken sor (`secBeyanVar`). Öne çıkardığın şeye "Neden bu?" girişini `kkNedenGirisHTML(tur, id)` ile ekle — K7 kapısı orada tek yerde durur, kanıtsızsa boş string döner. Kanıtsızlığı anlatan yüzeylerde (keşif) yüzde/çubuk gösterme — orada sayı yalandır. **Gotcha (canlıda yakalandı):** 12c primitifleri (`ikv-panel`/`ikv-ghost-btn`) stillerini kendi enjeksiyonundan alır ve bunu yalnız KART ÇİZEN yüzeyler tetikler — kart çizmeyen bir overlay `ikvEnsureStyles()` çağırmazsa tarayıcı varsayılanına düşer, üstelik build ve testler yeşil kalır. İlişkili: [[gerceklik-mimarisi]], [[kesin-alinti-mimarisi]], [[ihtimalsel-dil-devrimi]], [[kimlik-motoru]], [[kisilerim-kart-motoru]], [[oruntu-motoru]], [[yerel-tarih-anahtari]].
