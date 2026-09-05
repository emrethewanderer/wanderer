---
name: acilis-perdesi
description: "wn-splash açılış perdesi — artık üç kademeli (4sn/2sn/0sn), dokun-geç + composer odağı; giriş bir LLM'e girmek gibi hissettirir"
metadata:
  node_type: memory
  type: project
  originSessionId: 606280d7-3a2a-457e-886a-6bf00a3f49b9
  modified: 2026-08-02T17:02:20.779Z
---

2026-07-26'da "Eşiği Kaydırmak" sprinti perdeyi sabit 4sn'den **üç kademeli, bağlama duyarlı bir nefese** çevirdi (plan: `.claude/plans/federated-hatching-graham.md`). Eski hâl (tek `#wn-splash` 4sn karşılama) artık YANLIŞ — bkz [[esik-ekrani]] için de aynı sprint.

**Üç kademe (`_splashPlan(uid)`, 03-auth-shell.js):**
- Kat 0 — aynı tarayıcı **oturumu** içinde tekrar boot (`sessionStorage.etw_splash_session_<uid>`) → perde HİÇ görünmez; `llmHomeCascade(0.04)` elle çağrılır (10y'nin CASC_NOW temposu), yoksa ana ekran cansız açılır. **2026-07-31 denetimi:** bu anahtar uid'sizdi — hesap değişimi `signOut→location.reload()` ile olur ama sessionStorage reload'ı aşar, yani yeni hesap kat 0'a düşüp kendi karşılamasını hiç görmezdi ("hesap ayrımı uid ile" sözü kat 1/2'de tutulup burada tutulmuyordu). Anahtar uid'le ayrıldı.
- Kat 1 — bugün bu **cihazdaki** ilk giriş (`localStorage.etw_splash_day_<uid>` ≠ `localISODate()`) → tam 4sn.
- Kat 2 — bugün aynı cihazdan tekrar → kısa 2sn nefes, `#wn-splash.brief` sınıfı (animasyon süreleri CSS'te kısalmış: portre .8s / word 1.0s / sub .85s).

Anahtarlar **ham `localStorage`/`sessionStorage`'a** yazılır, SafeStorage'a DEĞİL — bu cihazın deneyimidir, hesaplar arası senkron istenmez (aynı gün başka cihazdan giren yine tam karşılama görür).

**Kapanış tek kapıdan:** `_closeSplash(splashEl)` — timer, `pointerdown` (dokun-geç), ve herhangi bir `keydown` (tuşa bas-geç) üç ayrı yoldan tetikleyebilir; `_splashClosed` modül-seviye guard'ı olmadan `.closing` iki kez eklenip cascade iki kez oynardı. Kapanışta `llmHomeCascade()` (perdesiz→Bugün akışı DEĞİL, ön yüz akışı) + 720ms sonra `window.llmFocusComposer?.()` (composer'a odaklan, bkz aşağı).

**LLM refleksleri (yeni, 10y-w2-llm-shell.js):**
- `llmFocusComposer()` — perde kapanınca `#chat-input`'a odaklanır; kapılar: `matchMedia('(pointer: fine)')` (mobilde klavye zıplamasın), `_shouldHome()` (temiz ana ekran), açık overlay yok. Kat 0'da bu çağrı `initApp`'in EN BAŞINDA değil, `switchView('chat')` bittikten SONRA yapılır — erken çağrı `#chat-input` henüz aktif view'da değilken boşa gider (bir turda bulunup düzeltilen gerçek bug).
- `⌘/Ctrl+K` → `window.newSession?.()`, `⌘/Ctrl+/` → kısayol kartı (`_kbdToggle`, doc-tablebox primitifleriyle). Escape kısayol kartını kapatır — bu dinleyici 10y'nin KENDİ `_installShortcuts`'ında yaşar (03-auth-shell'in Escape dinleyicisi yalnız post-auth kurulur, üstelik başka yüzeyleri kapatır; kartın kapanışı kartın kendi işidir).
- **KAPI (`_shortcutsReady()`, 2026-07-31 denetimi):** kısayollar post-auth reflekstir — `S.currentUser?.id` yoksa, `#auth-screen` görünürse (eşik / yaş kapısı) ya da `#wn-splash.show` inmemişse çalışmazlar. Kapı YOKKEN ölçülen gerçek zarar: giriş ekranında ⌘K, auth perdesinin ARKASINDA `newSession()`'ı koşturuyor → 02c onboarding ritüeli (`.sc-onb`) DOM'a sızıyor (kullanıcı ne görüyor ne kapatabiliyor) → içeri girdiğinde 10s/10t/13h/10g ve `llmHomeCascade` o sınıfı görüp **günlük ritüelleri erteliyordu**; üstelik `preventDefault` tarayıcının kendi ⌘K'sını da yutuyordu. Canlıda `.sc-onb` 0→1 diye ölçüldü. Kart artık `tabindex=-1` + odak alır, kapanışta odağı geldiği yere verir (`aria-modal` sözü).

**Değişmeyen:** `#wn-splash` id'si, `.show`/`.closing` sınıfları (10s/10t/13h/10g/02d hâlâ bunları okur — perde artık 0sn de olabildiği için hiçbiri "perde vardır" varsayımına yaslanmıyor, hepsi zaten savunmacı `?.classList.contains('show')`).

**2026-07-28 eki:** Perde artık giriş yapmışlara özel değil — anon giriş ekranı
(`#auth-screen`) aynı `.wns-*` vuruşlarını yeniden kullanır ve altında üç kapı
taşır; `.wns-sub` bu turda i18n'e bağlandı (`splash.sub`). Bkz
[[esik-anon-giris-kapilari]].

**2026-08-02 eki — perdenin zemini artık Yol'un göğü.** `#wn-splash`'in düz
`var(--bg)` siyahı gitti: `var(--sky-stars), var(--sky-scene)` + absolute gren
`::after` + `> * { position: relative; z-index: var(--z-base) }`. Perde inerken
altından çıkan yüzey (giriş eşiği ya da Bugün) artık AYNI göğü taşıyor — göz
kesme görmüyor. Saat evresi `tw-*` ile döner. Ayrıntı: [[sahne-gogu-tek-kaynak]].

İlgili: [[esik-ekrani]] (artık boot'ta DEĞİL, Studio girişinde), [[dil-modeli-kabugu]] (flip+cascade motoru), [[giris-kademelenmesi-casc]].
