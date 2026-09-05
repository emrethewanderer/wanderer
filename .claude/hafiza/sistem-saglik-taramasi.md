---
name: sistem-saglik-taramasi
description: "2026-06-11 tam sistem taraması — delete-user GDPR fix, mig 017 profiles sertleştirme (ELLE), günlük sayaç tek-anahtar, bilinen açık kalan riskler"
metadata: 
  node_type: memory
  type: project
  originSessionId: 26616e4f-279d-411d-b651-2e4892a3f5b7
---

2026-06-11 tam sistem taraması yapıldı (373 test yeşil, typecheck temiz). Düzeltilenler: delete-user edge fn tablo listesi tamamen güncellendi (chat_history dahil ~35 tablo + chat-images/avatars storage temizliği — ELLE deploy gerek); mig 017 profiles ayrıcalık trigger'ı (is_admin/is_premium/trial_ends_at istemciden yazılamaz — ELLE uygula, RLS sütun ayrımı yapmadığından kritik); günlük mesaj sayacı `etw_daily_msgs_<tarih>` → tek anahtar `{d,n}` (eski biçim her gün user_analytics'e satır ekliyor, storageInit hepsini çekiyordu; SafeStorage.keys() eklendi); send-push freq-cap artık test/broadcast saymıyor + broadcast 20'lik paralel parti.

**Açık kalan bilinen riskler:** (1) ücretsiz katman günlük mesaj limiti — 2026-07-17 denetimde DÜZELTME: sunucu RPC'leri VAR (`migrations/018_kota_motoru.sql` quota_status/quota_consume), ama `server_enforced` varsayılanı `false` ve gerçek zorlama vendorlanmamış `llm-chat`'te olmalı → zorlama zayıf/denetlenemez, "sadece istemcide" değil; (2) llm-chat kaynağı repoda YOK, yalnız Supabase'te yaşıyor — vendorlanmalı (bkz. [[kusursuzluk-sprinti-kararlari]] FAZ 7); (3) ~~bundle bütçe aşımı~~ → 2026-07-17 Kusursuzluk Sprinti FAZ 6 ile: 631/650KB gzip (~19KB marj; hedef ≥30KB'a ulaşılamadı, sonraki adaylar `.claude/plans/bundle-diyet.md`) + elle `./build.sh` aşımda exit 1 (AUTO_BUILD=1 hook build'i yalnız uyarır) ([[bundle-diyeti-sidecar]]); (4) ~~hayal-gorsel VE llm-embed in-memory kota~~ → 2026-07-17 KOD KAPANDI: mig 036 `fn_quota_consume` (yalnız service_role, Europe/Istanbul günü) + iki fonksiyon RPC'ye bağlı, RPC erişilemezse in-memory yedek fren — ELLE mig 036 + redeploy bekliyor ([[kusursuzluk-sprinti-kapanisi]]); (5) ALLOWED_ORIGIN vars. `*` — 6 fonksiyonda kod-varsayılanı, prod secret değeri repodan doğrulanamaz; sıkılaştırma secret ayarı + redeploy ile eşzamanlı ELLE iştir.

**Why:** Bu tarama tabanı sonraki taramalarda tekrar kontrol maliyetini düşürür; açık riskler bilinçli erteleme, unutulmuş hata değil.
**How to apply:** Edge fn değişikliği görünce "ELLE deploy" hatırlat; profiles'a yeni ayrıcalık sütunu eklenirse mig 017 trigger'ına da ekletmeyi unutma. İlgili: [[magaza-aboneligi]], [[persona-server-side]], [[web-push-bildirim-motoru]].
