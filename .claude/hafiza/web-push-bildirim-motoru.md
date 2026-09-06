---
name: web-push-bildirim-motoru
description: 10x Web Push sistemi; uygulama kapalıyken geri çağırma; send-push edge engine + user_engagement + priority ladder; LLM kişisel metin
metadata: 
  node_type: memory
  type: project
  originSessionId: cb5a7f59-e399-4fdc-a7c8-f584716fcbd2
---

**Web Push "Her An Geri Çekme" Motoru** (2026-06-09 eklendi) — uygulama KAPALIYKEN bile kullanıcıyı geri çağıran gerçek Web Push. Öncesinde yalnızca yerel `new Notification()` vardı (sadece sekme açıkken).

- **Client:** `js/parts/10x-w2-bildirimler.js` (window'a `bildirim*` açar). Soft-prompt (sert izinden önce markalı in-app davet) → `PushManager.subscribe(VAPID_PUBLIC)` → `push_subscriptions` upsert. Her açılış + visibilitychange'de `user_engagement` snapshot upsert (motorun sinyalleri). `bildirimInit` 03-auth-shell post-auth'ta dynamic import ile çağrılır (eski `initPushNotifications` 60sn polling KALDIRILDI, 07'de dead export kaldı).
- **SW:** `sw.js`'e `push` (showNotification) + `notificationclick` (focus/openWindow + postMessage deep-link) eklendi. `_routeNotif` SW mesajını dinler.
- **Migration 012** (`012_push_bildirim.sql`, Supabase'e ELLE): `push_subscriptions`, `user_engagement` (tz/streak/last_active_date/last_sealed_date/pending_soz_text/quiet saat/push_enabled), `notification_log` (freq-cap+analitik). Hepsi RLS owner; engine service_role ile bypass.
- **Engine:** `supabase/functions/send-push/index.ts` (Deno, `npm:web-push`). 3 mod: `engine` (pg_cron, x-cron-secret), `test` (user JWT → kendi cihazı), `broadcast` (admin JWT → tüm push-enabled). Öncelik merdiveni: winback(2/4/7/14/21/30g) > streak_risk(akşam) > soz > milestone > morning. Freq-cap: günde≤2, min 4s, aynı tip 24s'te bir. Sessiz saat (vars. 23–08).
- **Kararlar (Emre):** Sıklık = Dengeli·Akıllı (günde 1-2, ladder) · İçerik = Tamamen kişisel·LLM.
- **LLM metni:** `send-push` LLM'i DOĞRUDAN OpenRouter ile çağırır (llm-chat DEĞİL — cron'da user JWT yok). Bağlam: `benlik_karti` (baslik/portrait) + user_profile + pending_soz + streak. LLM fail/keysiz → deterministik TR fallback (garantili gönderim). Secret: `OPENROUTER_API_KEY`, `LLM_MODEL`.
- **VAPID:** public key `config.js` `VAPID_PUBLIC`'te (commit'li); PRIVATE asla repoda — Supabase secret `VAPID_PRIVATE_KEY`. Çift Node crypto ile üretildi.
- **Emre'nin elle adımları:** `SETUP-PUSH.md` (migration + secret'lar + `supabase functions deploy send-push` + pg_cron 30dk SQL). iOS: yalnızca Ana Ekrana eklenmiş PWA'da çalışır.
- Test: `tests/10x-bildirim.test.js` (saf helper). İlişkili: [[gunluk-ritus-armagan-soz]] (pending_soz), [[seri-muhru-toreni]]/[[ritual-streak-unity]] (streak), [[benlik-karti]] (LLM bağlamı).
