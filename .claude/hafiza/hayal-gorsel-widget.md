---
name: hayal-gorsel-widget
description: "Cool paketi katman 3 — Hayalini Resmet (hayal-gorsel edge fn ELLE) + widget köprüsü 13k; 2026-07-08: Üç Mühür gün durumu (geldin/gordun/yaptin) widget'a eklendi, native şablonlar güncel"
metadata:
  node_type: memory
  type: project
  originSessionId: 5d56cf54-236f-4e19-a917-d1850797c86a
---

**Hayalini Resmet (10i + hayal-gorsel edge fn)** — Hayal Âlemi sahne detayında "HAYALİNİ RESMET" (lapis buton): S.isPremium gate (değilse showPremiumFeatureSpotlight), sahne başına 1 görsel. Akış: sb.functions.invoke('hayal-gorsel', {scene_text, concept}) → OpenRouter görüntü modeli (IMAGE_MODEL, vars. gemini-2.5-flash-image-preview) base64 döner → client 896px JPEG'e küçültür → 'chat-images' bucket `hayal/<uid>/<sceneId>.jpg` → scene.image_url (haDreamCard SVG yerine <img> basar; SafeStorage'a base64 YAZILMAZ). Edge'de kullanıcı başına günde 2 fren (instance-local). **SETUP-HAYAL-GORSEL.md ELLE**: deploy + OPENROUTER_API_KEY.

**13k Widget Köprüsü + native-widgets/** — wkSync tek JSON yazar (@capacitor/preferences group modu: iOS 'group.com.emretransformation.wanderer', Android 'WandererWidget'): {streak, sealedToday, soz, sozCount, kept, reckoned, **geldin, gordun, yaptin**, elmas, name, updatedAt}. `geldin/gordun/yaptin` = Üç Mühür gün durumu (2026-07-08 cool sprinti; [[uc-muhur-yol-tasarimi]] dili): GELDİN=activity ledger bugün · GÖRDÜN=usGetTodayVision · YAPTIN=reckoned&&kept>0. Senkron: post-auth, arka plana geçiş, 10dk nabız + anlık: 10t mühür, 10s hesap, **00a recordActivityDay**, **10u usRecordVision**. Native şablonlar güncel: Swift SealBadge satırı (altın/lapis/bronz; yeni alanlar `Bool?` — eski JSON'la decode kırılmaz) + Kotlin/layout `widget_muhurler` ◆/◇ satırı. **SETUP-WIDGET.md ELLE** (Xcode Widget Extension target + Android manifest receiver).

**Why:** Studio'ya somut değer ([[wanderer-studio-marka]]) + push'tan sonraki en güçlü geri çağırma ([[web-push-bildirim-motoru]]).

**How to apply:** Widget verisine alan eklersen üç yeri eşle: 13k _snapshot, Swift WandererData (yeni alanı `Bool?`/opsiyonel yap — synthesized Decodable eski JSON'da key yoksa TÜM decode'u düşürür), Kotlin JSON okuma.
