---
name: native-kabuk-push-pwa-ikon
description: "Native cila (00d klavye/status bar) + native push (00e+FCM, mig 024) + yerel PWA ikon; \"Claude gibi LLM\" kapatma sprinti 2026-06-29"
metadata: 
  node_type: memory
  type: project
  originSessionId: 28c62815-47b8-4d17-813c-1c038aead756
---

"Claude gibi hissettirme" sprinti (2026-06-29). Karar: PWA/Capacitor hibriti
KORUNUR (native'e tam geçiş değil — bkz [[karar-pwa-korunur]] yoksa bu dosya).
4 iyileştirme yapıldı; build+test+preview ile doğrulandı (402 test geçti).

**1. Streaming akıcılığı (06 + chat.css):** `startStreamingMsg` balonu artık
DETACHED oluşturur, DOM'a yalnız İLK chunk'ta girer (`_ensureInserted`).
Reasoning modeli düşünürken `showTyping` göstergesi canlı kalır — tek yanıp
sönen çubuk yerine nabız atan 3 altın nokta (`.thinking-dots` + `thinkingPulse`).
`_runLLMTurn`'de ilk-token-öncesi `removeTyping()` kaldırıldı; iptal/hata/boş
yanıt → yeni `streamMsg.discard()` (göstergeyi de temizler). Tüm hata yolları
sendMessage/regenerate/retry catch'inde removeTyping ile kapanıyor.

**2. Native cila — 00d-native-shell.js (main.js'te import):** klavye lift +
status bar, web'de no-op. Klavye: VisualViewport (PWA) VEYA Capacitor Keyboard
plugin → `--kb-height` yazar; `#app-screen{height:calc(100dvh - var(--kb-height))}`
(shell.css) daralır → composer klavyenin üstüne çıkar. `_isTyping()` gate'i
adres-çubuğu yanlış-pozitiflerini eler. StatusBar: Style.DARK (koyu app=açık
içerik) + overlay. overscroll bounce + safe-area ZATEN vardı (base.css).

**3. Native push — 00e-native-push.js + 10x entegrasyonu:** Web Push iOS
WKWebView'de çalışmaz → native'de APNs/FCM. 00e ince köprü (izin→register→token,
deep-link); 10x `_isNativePush()` dalları token'ı AYNI push_subscriptions
tablosuna yazar (platform + native_token, sentetik endpoint `native:<pl>:<tok>`).
send-push `sendToUser` artık platforma göre dallanır: native→FCM HTTP v1
(JWT RS256 → oauth → fcm/v1; iOS'a APNs köprüler), web→VAPID. Plugin erişimi
RUNTIME `window.Capacitor.Plugins.*` (ESM import YOK — 13k deseni).
ELLE: mig 024 + `supabase secrets set FCM_SERVICE_ACCOUNT` + deploy send-push +
`npm i @capacitor/{push-notifications,keyboard,status-bar}` + cap sync. Tam
runbook: SETUP-NATIVE-PUSH.md. FCM secret yoksa native gönderim sessiz atlanır.

**4. PWA yerel ikon + offline (manifest/sw/build.sh):** ikonlar artık dış
URL değil yerel `public/icon-{192,512}.png` (markа ikonu i.hizliresim'den
indirilip sips ile PNG'ye çevrildi). sw.js: ikon precache + markalı offline
sayfası (`offlineResponse`) + PUSH_ICON yerel. Latent bug düzeltme: 10x'te
`t()` kullanılıyordu ama import eksikti (linter ekledi).

**VİTE GOTCHA (yeni öğrenildi):** vite IIFE build'de CSS ayrı .css dosyası
DEĞİL — JS bundle'ına INLINE ediliyor (dist/assets'te .css yok). `public/`
dizini → dist KÖKÜNE kopyalanır (capacitor webDir=dist). build.sh ayrıca
public ikonları repo köküne kopyalar (root static-hosting). vite manifest.json'u
hash'leyip assets/'e koyar AMA içindeki ikon `src`'lerini YENİDEN YAZMAZ →
manifest'te `../icon-192.png` (assets/'ten köke). Bkz [[build-source-convention]].
