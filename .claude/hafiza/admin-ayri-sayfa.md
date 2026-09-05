---
name: admin-ayri-sayfa
description: "Yönetim paneli artık ayrı sayfa (admin.html) — aynı bundle, IS_ADMIN_PAGE bayrağıyla kabuksuz boot; uygulama içi switchView('admin') oraya yönlendirir"
metadata: 
  node_type: memory
  type: project
  originSessionId: 9e4803db-708d-4e87-be18-c1056f02afc8
---

Yönetim paneli (2026-06-11) uygulama içi sekme olmaktan çıktı; **ayrı sayfa**: `admin.html`.

- **Aynı bundle, ayrı sayfa**: `build.sh`, `dist/index.html`'den `dist/admin.html` üretir (sed ile yalnız `<title>` değişir: "Wanderer Studio · Yönetim") + root'a kopyalar. Ayrı vite entry YOK — modüller sıkı bağlı (TDZ/window-expose), ayrı bundle riskliydi.
- **Bayrak**: `IS_ADMIN_PAGE` (`js/config.js`) — pathname `admin.html` ile bitiyor VEYA `?admin=1` (dev sunucuda admin.html yok).
- **Boot**: `14-boot.js` en başta `<html>`'e `admin-standalone` sınıfı takar. **GOTCHA: bundle `<head>` içinde senkron çalışır → modül seviyesinde `document.body` NULL'dur; documentElement kullan.** (İlk denemede body'ye takınca bundle admin sayfasında komple çöktü.)
- **initApp kısa devre** (`03-auth-shell.js`): loadSettings+loadKnowledge sonrası `IS_ADMIN_PAGE` ise `enterAdminStandalone()` → kullanıcı kabuğu (chat hidrasyonu, ritüel pop-up'ları, push, entry kartları, kart flip) hiç boot etmez; admin-view doğrudan aktive edilir (switchView ATLANIR — kabuk hook'ları çalışmasın). Admin olmayan hesap toast + index.html'e redirect.
- **Üst bar KALDIRILDI** (2026-06-14): `#admin-view`'de `.top-nav` yok. Yönetim'den çıkış = sağ-altta `#admin-exit-card` (mini tarot kartı, kabuğun ✦ FAB'ının ikizi; `.ff-*` sınıflarını paylaşır, konum studio.css'te) → `adminExitToApp()` (07): standalone'da `#app-screen`'e `flip-out-front` takıp 360ms sonra `index.html`'e gider (kart-dönüş çıkışı; in-app ise `switchView('chat')`). Görev sayfasından stüdyo girişine dönüş = `#admin-pages` başındaki `.admin-back-chip` ("‹ YÖNETİM · <görev>", başlık `#admin-page-title` switchAdmin'de set edilir) → `adminNavBack()`. `doLogout` artık stüdyo gövdesi altındaki ince `#admin-logout-link` (`.ws-st-logout`, default gizli; enterAdminStandalone display:block yapar). Eski idler (`admin-nav-title`/`admin-back-btn`/`admin-logout-btn`) tamamen kaldırıldı.
- **Hunileme**: ana uygulamada `switchView('admin')` artık `location.href='admin.html'` yapar — drawer "ADMİN ↗" ve global menü "Yönetim ↗" girişleri elle değiştirilmeden oraya akar. `#admin-view` markup'ı `_src.html`'de DURUR (admin.html aynı HTML'den üretildiği için silinemez).
- **CSS**: `shell.css` → `html.admin-standalone` kuralları chrome'u gizler (flip-fab, ic-card, gl-elmas-bar, drawer'lar, cinematic…) + admin içeriği 960px.
- **SW**: navigasyon network-first ve istek kendi URL'iyle cache'lenir → admin.html hijack edilmez; offline fallback'i index.html (kabul edilebilir).
- Gerçek güvenlik sınırı değişmedi: RLS + edge function'lar. Sayfa ayrımı UI/UX ayrımıdır.

İlgili: [[dil-modeli-kabugu]] (kabuk chrome'u), [[odak-modelleri]] / [[feature-gate-door-intro]] / [[magaza-aboneligi]] (admin sekmeleri), [[auto-build-on-stop]].
