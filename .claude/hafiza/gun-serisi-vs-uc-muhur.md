---
name: gun-serisi-vs-uc-muhur
description: "Seri sistemi ikiye ayrıldı (2026-07-12): Üç Mühür artık Wanderer Studio'ya has; yeni Gün Serisi (13r) Wanderer LLM'e özel, yalnız Emre'yle sohbetle sayılır"
metadata: 
  node_type: memory
  type: project
  originSessionId: d76f979c-18a1-4e68-98c8-ca76858a20e6
---

**2026-07-12'de Emre'nin isteğiyle mevcut "Seri" sistemi ikiye ayrıldı:** eski Üç Mühür
(Seri/Hayal/Söz — [[uc-muhur-yol-tasarimi]]) artık **yalnız Wanderer Studio'ya has**;
Wanderer LLM (ücretsiz ön yüz) için bağımsız yeni **"Gün Serisi"** eklendi (13r modülü,
`js/parts/13r-w2-gun-serisi.js`) — günde bir kullanıcı mesajı yeter, sayılır.

**Neden:** Studio'nun ritüel serisi (Seri/Hayal/Söz) daha önce sohbetle de besleniyordu
(`calculateStreak` sohbet mesaj günlerini + ritüel defterini birleştiriyordu; Seri Mührü
ceremony'si `#chat-view.llm-home`'da da dövülüyordu) — iki ürün katmanının ([[wanderer-studio-marka]]:
LLM=ücretsiz ön yüz, Studio=ücretli arka yüz) serileri birbirine karışmış durumdaydı.

**Studio-only'e çevrilen 4 sızıntı noktası:**
1. `04-llm-hero-history.js` `calculateStreak()` — artık YALNIZ `getActivityDays()`
   (ritüel defteri) okur; sohbet mesaj günü taraması (eski `historyData` union'ı) kaldırıldı.
2. `10t-w2-seri-muhru.js` `_blocked()` — Seri Mührü töreni artık YALNIZ `#bugun-view`de
   dövülür (`onLlmHome` izni kaldırıldı).
3. `10s-w2-gunluk-ritus.js` — `_glSealFirstPending()` "seal-first detour" fonksiyonu +
   çağrı yeri TAMAMEN SİLİNDİ (LLM ön-yüzünde Mühür artık hiç denenmiyor).
4. `13h-aksam-toreni.js` `_blocked()` — Akşam Kapanış Töreni (üç mühür özeti) artık
   YALNIZ `#bugun-view`de belirir (`chat-view` izni kaldırıldı).
5. `10u-w2-ultra-seri.js` `_maybeUltra()` — "Bugün O Kişiydin" uyanışı artık yalnız
   `#bugun-view`deyken tetiklenir (boot timer `usRunDaily` kör çağrısı artık korumalı).
6. **(2026-08-20 — kapatılmamış son kapı)** `10s-w2-gunluk-ritus.js` günlük
   töreninin KENDİSİ: 07-12 turunda yalnız "seal-first detour" silinmişti, ama
   `glRunDailyRitual()` hâlâ her sahnede açılıyordu — ve `initApp` boot'ta
   `switchView('chat')` çağırdığı için Armağan/Söz pratikte her zaman LLM
   ön-yüzünde doğuyordu. Artık `_glStudioSahnesinde()` kapısı var; sahne dışında
   retry nabzı da kurulmaz. Sohbetin bağlamsal söz köprüleri (13a `[ARAC:soz]`,
   13b Kağıt) Emre'nin kararıyla kapının DIŞINDA → [[gunluk-ritus-armagan-soz]].

**Yeni "Gün Serisi" (13r):** SafeStorage per-uid ledger (`etw_gun_serisi_v1_<uid>`,
`{days:[], seeded:false}`), Üç Mühür'ün merkezî defterinden (`etw_activity_ledger_v1`)
TAMAMEN BAĞIMSIZ. Tetik: `06-summary-chat.js` `sendMessage()` içinde her kullanıcı
mesajında `window.gsRecordChatDay?.()` (günde bir kez sayılır, idempotent). Hesap
mantığı `usStreakFromDays`/`calculateStreak` ile birebir (ardışık gün zinciri, kodun
kendi "küçük yerel kopya, paylaşılan utility değil" idiomuna uygun).

**Bir kereye mahsus benimseme (`gsInit` → `_seedFromHistory`):** modül ilk kez
çalıştığında (`S._gunSerisi.seeded===false`) `S.allSessions`'taki geçmiş kullanıcı mesaj
günlerini deftere bir kez işler — sadık sohbet kullanıcıları bu geçişte serisini
sıfırdan başlatmasın diye. Sonraki `gsInit()` çağrıları no-op (idempotent bayrak).

**UI:** `#chat-view` topbar'ında `.ch-topbar-btns` içinde `#gs-streak-btn` (✦ glyph +
sayı; streak>0 iken görünür, `gsRender()`). Bu slot zaten "us-ring kaldırıldı" yorumuyla
işaretli boş bir yuvaydı — yeni rozet oraya oturdu. Tıklama → `gsShowInfo()` → mevcut
`showToast()` (00a) ile "N gündür Emre ile konuşuyorsun." Stiller `css/parts/chat.css`
(`.gs-streak-btn`, altın nefes-glyph animasyonu, `prefers-reduced-motion` korumalı).

**Persona bağlamı:** `01-prompts-modes.js` `generatePreSessionContext()`'teki `streak`
değişkeni artık `window.recomputeStreakUI` (Studio) yerine `window.gsCurrentStreak`
(sohbet) okur — persona'nın "kaç gündür seninleyim" bağlamı artık doğru katmanı yansıtır.

**i18n:** `gs.aria`/`gs.toast.first`/`gs.toast.n` TR+EN dict'e eklendi
(`15b-i18n-dict-core.js`); diğer 11 dil bilinçli kapsam dışı (diğer küçük UI metinleri
gibi fallback yok, yalnız TR/EN — genişletilmek istenirse ext dict'e eklenmeli).

**Boot sırası:** `03-auth-shell.js` post-auth bloğunda `gsInit()` dinamik import,
10t'nin (`smInit`) hemen ardından eklendi. Gün Serisi'nin kendi ceremony/boot-timer'ı
YOK (sade sayaç) — yalnız `gsInit()` (hydrate+seed+render) yeterli.

**ELLE adım YOK** — tamamen client-side SafeStorage, migration/Supabase şeması yok.

**Doğrulama (2026-07-12):** typecheck temiz · build 208 modül temiz (dist'te
`gs-streak-btn`+`gsRecordChatDay`/`gsCurrentStreak`/`gsShowInfo`/`gsInit` doğrulandı)
· vitest 567/567 yeşil (13r için 17 yeni test + 04-llm-hero-history.test.js'in
`calculateStreak` testleri yeni Studio-only semantiğe güncellendi — SafeStorage
`_kvCache`'in module-level Map olup `localStorage.clear()` ile temizlenmediği, per-uid/
global ledger anahtarının test beforeEach'inde elle `SafeStorage.remove()` edilmesi
gerektiği GOTCHA'sı bu turda keşfedildi) · preview: konsol 0 hata, build çıktısında
rozet markup'ı doğrulandı. Gerçek Supabase login gerektiren click-through (Mühür'ün
chat-view'de artık belirmediği, rozetin ilk mesajdan sonra göründüğü) YAPILAMADI —
[[gordun-pencereden-bakis]]'teki aynı kısıt burada da geçerli; Emre gerçek cihazda bir
kez elle doğrularsa iyi olur.

İlgili: [[uc-muhur-yol-tasarimi]] [[ultra-seri-uc-muhur]] [[seri-muhru-toreni]]
[[ritual-streak-unity]] [[wanderer-studio-marka]] [[dil-modeli-kabugu]]
[[tasarim-prensipleri]] [[build-source-convention]].
