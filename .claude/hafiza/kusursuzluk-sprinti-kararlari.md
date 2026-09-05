---
name: kusursuzluk-sprinti-kararlari
description: 2026-07-17 başlayan 9 fazlı mimari+kod sağlığı+test sprinti — 4 onaylı Emre kararı + plan konumu + denetim kaynağı
metadata: 
  node_type: memory
  type: project
  originSessionId: 37adc141-1841-4678-8db4-5750187978fd
---

Emre'nin vizyonu (2026-07-17): "Mimariyi getirilebilecek en iyi seviyeye getir → tüm sistemi
inceleyip geliştirilebilecek her yerde en iyi çalışmayı yap → bittiğinde baştan denetle,
kusursuz olsun." Üç Explore ajanı (mimari omurga · kod sağlığı · test+backend) tam denetim yaptı;
bulgular `.claude/plans/kusursuzluk-sprinti.md` (9 fazlı plan) içinde birleştirildi.

**4 onaylı karar (AskUserQuestion, 2026-07-17):**
1. **llm-chat vendorlanacak** — Emre kaynağı Supabase Dashboard'dan paylaşır, ben yamaları
   (kota zorlama + persona senkron + kriz muafiyeti) hazırlarım, deploy ELLE. Bu FAZ (7) sprintin
   geri kalanını beklemez — kaynak gelince araya alınır.
2. **7 kritik modülün TAMAMINA test** — 13m-kota, 13a-arac-motoru, 13l-kimlik-motoru,
   10y-w2-llm-shell, 10s-gunluk-ritus, 10t-seri-muhru, 09c-memory-panel (hepsi testsizdi).
3. **Bundle: diyet + sert kapı** — 1-2 ağır parça sidecar'a taşınacak + build.sh boyut kapısı
   mod-ayrımlı sertleşecek (Stop hook'un otomatik build'i yalnız uyarır, elle build exit 1 verir).
4. **Init omurgası: tam refaktör** — 03-auth-shell.js'teki sihirli setTimeout zinciri
   (kkInit +1200…apInit +3200) yerine ready-promise bağımlılık zinciri kurulacak.

**Faz sırası (bağımsız ship edilebilir):** FAZ0 plan mührü → FAZ1 güvenlik/dürüstlük yamaları →
FAZ2 prompt disiplini+i18n → FAZ3 ölü sözleşme süpürme+depolama → FAZ4 init refaktörü →
FAZ5 testler → FAZ6 bundle → FAZ7 llm-chat (yüzer) → FAZ8 derin öz-inceleme+kapanış.

**Why:** Bu ilk büyük "kusursuzluk" denetimi — önceki oturum ("Benim Kartım redesign plan")
oturum limitine takılıp keşif fazı yarım kalmıştı; bu sprint o keşfi tamamlayıp somut plana
döktü. Kararlar Emre'nin kapsam tercihini yansıtır — daha hafif seçenekler (4 modül test,
llm-chat erteleme, dokunmama) sunulmuş ama reddedilmiştir.
**How to apply:** Sprint devam ederken hangi FAZ'da kalındığını TaskList'ten oku; kesinti olursa
buradan ve plandan devam et. FAZ tamamlandıkça bu dosyayı GÜNCELLEME — kapanışta (FAZ 8)
[[kusursuzluk-sprinti-kapanisi]] adıyla ayrı sonuç dosyası aç, bu dosyayı "karar kaydı" olarak
sabit bırak. İlgili: [[sistem-saglik-taramasi]] [[yuzlesme-kacis-kaldirma]] [[cekirdek-omurga-haritasi]]
[[olu-kod-temizlikleri]] [[bundle-diyeti-sidecar]] [[kota-motoru]].
