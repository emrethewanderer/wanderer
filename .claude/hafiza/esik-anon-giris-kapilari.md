---
name: esik-anon-giris-kapilari
description: "Eşik: sinematik intro SÖKÜLDÜ, anon giriş splash diline geçti + üç kapı + OAuth yaş kapısı; 07-31'de açılış töreni (perde ortadan doğar, kapılar sonra) + iki düzen tuzağı"
metadata: 
  node_type: memory
  type: project
  originSessionId: 61f68405-6eb6-47d2-8716-ab475f9eff3a
  modified: 2026-07-31T12:12:37.386Z
---

> **⚠ 2026-08-27/28 — KAPI SEÇİM EKRANI SÖKÜLDÜ. Bu dosyanın "kapılar" kısmı
> YANLIŞLANDI (ama kapıların kendisi geri geldi — başka bir biçimde).**
> Şifre kapısı ve kapı SEÇİM EKRANI kalktı, geri de gelmedi. Google ve Apple
> 08-28'de geri geldi; artık ekranın kendisi değil, adres panelinin ALTINDAKİ
> kestirmeler. `.auth-gates` sınıfı yaşıyor, `doOAuth` yaşıyor — ama
> `auth-gates-label`, `auth.gate.email` ve `authEsigeDon` ÖLÜ.
> Güncel mimari: **[[kod-kapisi-ve-posta]]**.
> **Hâlâ geçerli olanlar:** perde/açılış töreni mekaniği (`.auth-entering`,
> `_authVeilCenter`'ın `offsetTop` tuzağı), İKİ DÜZEN TUZAĞI (`max-height:100dvh`
> ve `justify-content:flex-start` + auto-margin ikilisi), `--sky-scene` göğü,
> `.auth-err:empty` kuralı ve **söküm dersi: yetim taraması js + html + css
> ÜÇÜNÜ de kapsamalı.** Tören ölmedi, `#auth-adres`'e taşındı.

**KARAR (Emre, 2026-07-28):** Girişteki üç ekranlı sinematik manifesto
(`#cinematic-intro` — EN'de "Something brought you here") kalktı. Giriş yapmamış
kullanıcı artık üye olanla **aynı perdeyle** karşılanır; kapılar perdenin altında
durur.

**Sökülen (repoda izi kalmadı, `grep -rn "ci-\|ciNext\|cinematic-intro"` temiz):**
`_src.html` intro bloğu · `auth.css` 186 satırlık `.ci-*` bölümü ·
`12-w3-journey.js` ci IIFE (100 satır, `INTRO_KEY='etw_intro_seen_v1'` dahil) ·
14 `ci.*` i18n anahtarı (TR+EN) · 4 orkestratördeki (13h/10t/10g/10s) ve
`03-auth-shell` initApp'teki "intro açık mı" guard'ları. `--z-cinematic` token'ı
KALDI (6 tüketicisi var: wrapped, feature-gate, onboarding ritüeli) — yalnız
yorumu eklendi. **Düzeltme (2026-07-31):** "grep temiz" iddiası `js/` +
`_src.html` içindi, `css/` taranmamıştı — üç ölü kural geride kalmıştı
(`shell.css` admin-standalone listesindeki `#cinematic-intro` satırı,
`base.css`'te `#cinematic-intro` + `.ci-headline`); o turda temizlendi.
Ders: sökme sonrası yetim taraması **js + html + css** üçünü de kapsamalı.

**Eşiğin yapısı (`#auth-screen`, css/parts/auth.css başı):**
- Perde = `.wns-portrait` + `.wns-word` + `.wns-sub` — `#wn-splash`'in KENDİ
  sınıfları yeniden kullanılır, ikiz motor yok. Fark yalnız ölçek/hizalama:
  `#auth-screen` seçicisiyle portre 94×118 (splash 104×132) ve kendi
  `wnsRise/wnsWord` animasyonları. Splash'in `.wns-sub`'ı da bu turda i18n'e
  bağlandı (`splash.sub`) — daha önce hardcode TR'ydi, EN kullanıcı Türkçe
  görüyordu.

**AÇILIŞ TÖRENİ (KARAR Emre, 2026-07-31): eşik splash'in devamıdır.**
Perde ekranın TAM ORTASINDA doğar, söz yerleşince yukarı süzülür, kapılar
ancak o zaman açılır — splash'teki "dokun ve geç" ipucunun ritmi. Ölçülen
kareler: 0.6–1.5s yalnız perde (merkez = `innerHeight/2`, kapı+künye opacity
0) → 2.0s perde yerinde + kapılar 0.7 → 2.6s künye 0.89 → 3.4s hepsi 1.
- Sınıf `.auth-entering` `_src.html`'de STATİK yazılıdır; `_authEntryDone()`
  onu dört yerden düşürür (authShowEmail · authBackToGates · _showAgeGate ·
  initApp). **Neden:** sınıf kalsaydı panelden her geri dönüşte iki saniyelik
  tören yeniden oynardı (`display:none→flex` animasyonu yeniden başlatır).
- Kayma miktarı `--auth-veil-drop`, `_authVeilCenter()` ölçer: `innerHeight/2
  − (hero.offsetTop + hero.offsetHeight/2)`. **`getBoundingClientRect` DEĞİL
  `offsetTop`** — tören sürerken perdenin üstünde zaten bir translateY vardır,
  rect onu ölçüme katıp değeri kirletir. Ölçüm üç kaynaktan tazelenir (rAF ·
  `fonts.ready` · `resize`); resize dinleyicisi `_authEntryDone`'da kalkar.
- `authGateRise` keyframe'i `pointer-events`i de taşır (ayrık özellik
  keyframe'de çalışır): görünmeyen kapıya basılıp OAuth tetiklenmesin.

**İKİ DÜZEN TUZAĞI (ikisi de bu turda ölçümle bulundu, ikisi de eşikte
canlıydı):**
1. `body`/`html` `overflow:hidden`dır (shell.css) — sayfa kaydırmaz. Eşik
   yalnız `min-height:100dvh` taşırken içeriğiyle büyüyor, `scrollHeight ==
   clientHeight` kalıyor, kendi `overflow-y:auto`'su da devreye girmiyordu:
   600px'lik ekranda künye ERİŞİLEMEZ oluyordu. Çözüm `max-height: 100dvh`.
2. `justify-content: center` + taşma = üstü kırpar. Auto margin'ler negatif
   boş alanda sıfırlanır, center yeniden devreye girer, perdenin üstü ekran
   dışına taşar ve **kaydırmayla bile erişilemez** (ölçüldü: hero top −70px).
   Çözüm: `justify-content: flex-start`, ortalamayı `.auth-hero` ve
   `.auth-footer`'daki auto margin İKİLİSİ yapar — boşluk varsa ortalar,
   taşma varsa sıfırlanıp üstten başlar.

**Eşiğin göğü:** `--sky-scene` (base.css) — Yol (`.yolp-scene`) ve Gördün
(`.gor-scene`) ile TEK kaynak; dört tw-* kopyası birleştirildi. Canlı
doğrulandı: dört saat evresinde üç sahnenin `linear-gradient`i birebir aynı
(sabah #0E1320 / gündüz #0C1018 / akşam #100B16 mor · turuncu ufuk .18 /
gece #090C16). Portallar artık `tw-*` sınıfı KOPYALAMAZ (10f/10E'den
silindi) — token `<html>`'deki sınıfla kendiliğinden döner.
- `.auth-gates` üç kapı: `doOAuth('google')` · `doOAuth('apple')` ·
  `authShowEmail()`. Kapı arkası panelleri ortak `.auth-panel` sınıfını taşır
  (`#auth-mail` e-posta formu, `#auth-age` yaş kapısı).
- Düzen tuzağı: boş `.auth-err` iki flex `gap`'ini birden yiyip künyeyi ekrandan
  taşırıyordu → `.auth-err:empty { display: none; }`.

**OAuth sözleşmesi (03-auth-shell.js):** `signInWithOAuth`'a `redirectTo` olarak
sorgu/hash artıksız `origin + pathname` verilir. Dönüşte **elle `initApp` YOK** —
supabase-js oturumu URL'den okur, `14-boot`'un `getSession`'ı devralır.

**Yaş kapısı OAuth ayağı (Emniyet Katmanı · Faz 3):** Google/Apple bize yaş
vermez; `_needsAgeGate(user)` provider'ı OAuth olup `user_metadata.birth_year`
taşımayan kullanıcıyı `initApp`'in EN BAŞINDA durdurur ve `#auth-age` panelini
açar. 13 altı → `signOut` + kapılara dönüş. **Gotcha:** beyan yazıldıktan sonra
`getUser()` boş dönerse ham `_ageGateUser` ile devam etmek kullanıcıyı aynı
forma geri gönderir (kilitlenme) — fallback nesneye `birth_year`/`is_minor`
ELLE işlenir. E-posta yolu ve metadata'sız eski hesaplar kapıya SOKULMAZ.

**Aynı turda temizlenen ikiz:** `setAuthTab`'in `03-auth-shell.js`'teki birebir
kopyası silindi; tek kaynak `02-features-onboarding.js` (03 zaten oradan import
ediyor, dairesel değil).

**BEKLEYEN ELLE İŞ:** Supabase Dashboard → Authentication → Providers'ta Google
ve Apple açılmadan kapılar hata döner; native kabukta (Capacitor) OAuth dönüşü
ayrıca deep-link şeması ister.

İlgili: [[acilis-perdesi]] (splash motoru), [[guvenlik-emniyet-katmani]] (yaş
kapısının kökeni), [[tr-en-i18n-tamamlama]] (parite), [[tasarim-prensipleri]].
