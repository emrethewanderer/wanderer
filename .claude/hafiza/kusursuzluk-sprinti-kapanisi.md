---
name: kusursuzluk-sprinti-kapanisi
description: "2026-07-17 sprint SONUÇ — FAZ 0-6+7a TAM, 7b (llm-chat vendor) Emre'nin kaynağını bekliyor; ELLE mig 036 + 2 redeploy"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5dad93a3-f1db-4ef1-bdf1-79420355c39a
---

Kusursuzluk Sprinti ([[kusursuzluk-sprinti-kararlari]]) kapanışı, 2026-07-17.
Kota kesintisi FAZ 6 sonrasına denk geldi; devam oturumu tüm fazları repoya
karşı doğruladı, iki artık bug bulup düzeltti ve FAZ 7a'yı tamamladı.

**Tamamlanan:** FAZ 0-6 (önceki oturumlar) + FAZ 7a + FAZ 8 öz-inceleme.
Devam oturumunun bulguları ve işleri:
1. **Test regresyonu:** FAZ 6 diyeti ME_SECTIONS'ı sidecar'a taşıyıp
   `renderMerhabaEmre`'yi async yapmış, `tests/07-settings-knowledge.test.js`
   eski senkron sözleşmede kalmıştı (5 kırmızı) → testler `await`'e bağlandı.
2. **Duplicate key:** `prompt.feedback_loop.stuck/awareness` 16b+16e'de İKİ
   kez tanımlıydı (erken `\n\n`'li kısa blok geç "Dönüşüm Zinciri"li blokça
   gölgeleniyordu) → gölgedeki erken ikizler silindi; davranış değişmedi,
   esbuild uyarısı kapandı. DE sözlüğü zaten tek (geç) sürümdeydi.
3. **FAZ 7a:** `migrations/036_kalici_fn_kota.sql` — `fn_quota_days` (kullanıcı
   × fonksiyon TEK canlı satır, mig 018 quota_windows kalıbı) + `fn_quota_consume`
   RPC (YALNIZ service_role; gün = Europe/Istanbul). hayal-gorsel + llm-embed
   kota blokları RPC'ye bağlı; RPC erişilemezse `_quotaOkLocal` yedek fren.
   `HAYAL_DAILY_LIMIT` env ile ayarlanabilir (vars. 2).

**AÇIK — FAZ 7b (yüzer):** llm-chat vendorlama Emre'nin Dashboard'dan kaynak
paylaşmasını bekliyor (kota zorlama + persona senkron + kriz muafiyeti yamaları
hazırlanacak). `quota_settings.server_enforced=true` ancak o zaman.

**ELLE bekleyen (Emre):** (1) mig 036 SQL Editor; (2) hayal-gorsel + llm-embed
redeploy; (3) ALLOWED_ORIGIN secret'ı gerçek origin'e (6 fonksiyon, istenirse);
(4) llm-chat kaynağını paylaş → FAZ 7b.

**Sözleşme notu:** `window.showToast`/`kkToast` FAZ 3'te BİLİNÇLİ düşürüldü —
üçlü kanıt: 0 inline çağrı (_src+admin), 0 `window.showToast=` ataması, 48 modül
import ile tüketiyor. Plan'daki canlı-liste FAZ 3 öncesi yazılmıştı; güncel
sözleşme listesi 9 isim: switchView/akGreetingSend/ikvCardFace/ikvHoloScan/
fxCue/yolOpen/esikShow/libOpenReader/sesMicStop.

**Why:** Sprint kapanış kaydı — sonraki denetimlerin tabanı; FAZ 7b tetiği
buradan okunur.
**How to apply:** Emre llm-chat kaynağını paylaştığında FAZ 7b'yi plandan
(`.claude/plans/kusursuzluk-sprinti.md` FAZ 7) sür; ELLE adımları tamamlanınca
[[sistem-saglik-taramasi]] risk (4)'ü tamamen kapat. Vitest'te nadir yük-flake'i
görülürse (263sn'lik koşuda 3 test) önce tek dosya koş — kod hatası değil.
İlgili: [[kota-motoru]] [[bundle-diyeti-sidecar]] [[merhaba-emre-anayasa]]
