---
name: yuzlesme-kacis-kaldirma
description: "2026-06-22 arkadaki uygulamanın eski 'Yüzleşme/Kaçış' adversaryal katmanı kaldırıldı; Wanderer dürüst bir AI LLM olarak çerçevelendi"
metadata: 
  node_type: memory
  type: project
  originSessionId: e0a22d6c-4e86-4fb0-b7c0-eaaec8a87b54
---

**2026-06-22** Emre'nin isteğiyle uygulamanın **ilk zamanlardan gelen "Yüzleşme/Kaçış" adversaryal/gözetim katmanı kaldırıldı** ve Wanderer **dürüstçe bir yapay zekâ LLM** olarak yeniden çerçevelendi. Emre'nin iki çatal kararı: (1) ek kapsam = eski Hasımlar/Engel Atlası ekranı (İç Meclis + kart destesi KORUNDU); (2) AI kimliği = dürüst ama Emre/Wanderer koçluk kimliği + manevi register AYNEN korunur.

**Kaldırılanlar:**
- **Kaçış Radarı** (05-closure-parts.js): `detectNightWatch`/`detectAbsence`("Ne kaçıyordun?")/`detectMessageShrinkage`/`getRadarContext`/gece-nöbeti rozet döngüsü + `prompt.radar.*` (16b) + gece i18n (15b-core TR/EN) + `body.night-watch` CSS. 03-auth-shell çağrıları + 01 katman enjeksiyonu temizlendi.
- **Gölge İkiz** (06-summary-chat.js): `generateShadowPrediction`/`showShadowChip`/`dismissShadowPrediction`/`checkShadowMatch` + #shadow-chip (_src.html) + `prompt.shadow.*` (16b) + .shadow-chip CSS + main.js expose.
- **Yüzleştirici kota duvarı**: `_showQuotaWall('week')` özel konfrontasyonel mesajları kaldırıldı → tek kaynak `ktWallText` (sıcak/dürüst, "ücretsiz sınır + Studio", suçlama yok); 13m `ktWallText('week')` de yumuşatıldı.
- **Eski `loadHasimlarView`** ("Sefer & Yüzleşme" ekranı, 10-features-w2.js:443-680 + 5 _private yardımcı): ÖLÜYDÜ — `#hasimlar-content`'a render ediyordu ama o container artık İç Meclis'in (03-auth:659 `hasimlar→loadMeclisView`). 10h'deki 2 ölü tazeleme çağrısı + main.js/03 export/import temizlendi.

**Persona flip:** `prompt.mode.guide` "WANDERER KİMLİĞİ" (16b TR:12 + EN:715) "Bir yapay zeka rolü değilsin" → "yapay zekâ dil modelisin (LLM); dürüstçe söylersin; insan numarası/'seni izliyordum' yapmazsın". Felsefe + 12 ilke + manevi register korundu. **NOT:** ext (11 dil) `prompt.mode.guide` KISA — kimlik cümlesi içermez; o diller persona'yı yalnız sunucudan alır → istemci flip'i sadece TR/EN'de gerekiyordu (tam). bkz. [[persona-server-side]]

**KRİTİK AYRIM (yumuşatma lensi):** Kitabın "kendinle yüzleşme" felsefesi (kullanıcı KENDİyle yüzleşir; identity_message, mode-sistemi etiketleri, atmo/stage) = KORUNDU — sekülerleştirme yok [[kitap-sesi-manevi-register]]. Yalnız **AI'ın kullanıcıyı yüzleştirmesi/kaçışını yakalaması** yumuşatıldı.

**Kapsamlı kalite turu (2026-06-23) — TR/EN + 11 ext dil:**
- Yumuşatılan AI-yüzleştirme direktifleri (TR/EN core + ilgili ext): p5 stage_advice ("sert yüzleştirme"→doğrudan), weekly_report ("yüzleştirici"→dürüst), hesap_gunu ("kaçış bırakma"→şefkatle), echo ("kaçış kalıbı"→tekrar eden tema), parts_context ("nazikçe yüzleştir"→görünür kıl), temporal.challenge ("Yüzleştirme toleransı"→Doğrudanlık), contradiction ("kullanıcıyla yüzleş/confront the user"→göster/show — 11 dil), p4.challenge_low/high ("YÜZLEŞME SEVİYESİ/confrontation"→Doğrudanlık, TR/EN), pattern_note ("kaçış kalıbı/Fluchtmuster"→tekrar eden kalıp — TR + 11 ext).
- Çok-dilli yumuşatma yöntemi: modülü yükle → `value.replace(find→softened)` → `JSON.stringify` ile kaynağa tek-satır geri yaz (escaping derdi yok); span-detection = "bir sonraki key/yorum/brace'e kadar" (çok-satırlı backtick değerleri güvenle kapsar). DRY-RUN + parse + placeholder doğrulaması.
- **Ölü-anahtar temizliği:** 16b-ext'ten 66 (98 satır, çoğu backtick çok-satırlı) `prompt.radar/shadow.*`; 15b-ext'ten 55 gece + 11 `ui.lift_wall`; 16b-core'dan 3 yetim shadow yorumu + `ui.lift_wall` (core TR/EN). Sonuç: 4 sözlükte 0 yetim, hiçbir kod okumuyor.
- `prompt.pattern_memory.system` ("confrontation" alanlı) = hiç çağrılmayan ÖLÜ key → dokunulmadı.
- Final tarama: 13 dil sözlüğünde **0 kalan AI-yüzleştirme direktifi**.

**2026-06-26 ikinci tur (Emre kararları: #2 yumuşat-omurga kalsın · #4 mode etiketleri korunsun · #1 sunucu Emre'nin gözüne emanet):**
- **#5 Karşılama metinleri (4 dize):** [state/settings.js:6](js/state/settings.js:6) `welcome_message` + [03-auth-shell.js:808,824](js/parts/03-auth-shell.js:808) fallback opener "Bugün hangi konuyla yüzleşeceğiz?" → "Bugün ne konuşmak istersin?"; [09-reports-tracks.js:46](js/parts/09-reports-tracks.js:46) yorum "haftalık yüzleşme raporu" → "haftalık dürüst rapor"; L274 push fallback "Bugün kendinle yüzleşmeye hazır mısın?" → "Bugün de buradayım. Başla."
- **#3 13i Meclis Toplantısı SPEECH bankaları:** "yüzleş benimle"→"beni gör", "yüzüme bak"→"beni fark et", "sessizce sabotaj yapamıyorum"→"sessizce iş çeviremiyorum". Suretler "ben seni gözetliyorum, bana bak" çerçevesinden "beni gör, beni fark et" içsel-tanıma diline geçti.
- **#2 Sefer/Hasım katmanı yumuşatma (omurga kaldı, dil değişti):** identifier'lar (SEFER_TASKS, HASIM_BOSSES, startSeferForBoss, boss_id, ws-sefer-modal CSS) **geri-uyum için AYNEN korundu**. User-facing değişiklikler: [10h](js/parts/10h-w2-library-challenges.js) "SEFER kapanışı"×6→"Yolculuk kapanışı", "21 GÜNLÜK SEFER"→"21 GÜNLÜK YOLCULUK", "${boss.name} seferi başladı"→"yolculuğu başladı", "Sefer tamamlandı. Kalıp yaralandı."→"Yolculuk tamamlandı. Kalıp çözüldü.", kacis L120 "sorunla yüzleş"→"sorunun üstüne git"; [10-features-w2.js wsShowSeferModal:1045,1056,1072](js/parts/10-features-w2.js) "~ yeni sefer ~"→"~ yeni yolculuk ~", "bırakmazsın yüzleşmeyi"→"bırakmazsın yolu", "SEFERİ MÜHÜRLE"→"YOLCULUĞU MÜHÜRLE"; karşılama varyantı L751 "hangi gerçekle yüzleşeceğiz"→"hangi gerçeğin üstüne gidiyoruz"; [10m engeller.js:98,130,153](js/parts/10m-w2-engeller.js) "⚔ Sefer"→"◇ Yolculuk" (kılıçtan eşik-elmas sembolüne); [12a:149](js/parts/12a-archetypes.js) "Yakıştırmama hasmıyla yüzleş"→"Yakıştırmama kalıbının üstüne git". DOKUNULMADI: `prompt.parts.kacak.desc`, IFS framework dili, 12b kart-destesi portreleri (kitap içeriği), `SEFER_PROMPTS[kacis]` özlü söz (boss-bound poetry).
- **#4 6-mod AI sistemi:** Emre kararıyla TAM KORUNDU. [16b-core:147](js/parts/16b-i18n-prompt-dict-core.js:147) "direct (YÜZLEŞ)" tanımı + 11 ext dil + [00-config-tracking.js:174](js/parts/00-config-tracking.js:174) `isAvoidance → DIRECT mode` otomasyonu dokunulmadı.

**2026-06-27 — Intro/onboarding kopyası (Emre kararı: B+C yap · A=11 ext dil ŞİMDİLİK dokunma):** Önceki turlar **sözlüğü** (15b-core TR/EN) temizlemişti ama `_src.html`'deki **hardcoded fallback** senkronlanmamıştı → ham-dosya Preview'ında (JS yok→i18n yok) hâlâ eski "Kaçmak/yüzleşme/rahatlatmaz" intro görünüyordu. **Canlı TR/EN app zaten temizdi** (`applyTranslations` [15-i18n.js:186] koşulsuz çalışır; `t()` TR dict değerini döner → "Olduğun kişiyi değiştirerek hayatını değiştirebilirsin"). Düzeltildi: **(B)** cinematic-intro fallback [_src.html:84-130] (ci.label1/headline1-3/sub1-3) + auth-screen [129-130] (auth.headline/subline) birebir TR dict'e eşitlendi; **meta description** [_src.html:36] "Kaçmayı bırak."→"Olduğun kişiyi değiştir, hayatını değiştir." (herkese açık SEO/link-önizleme). **(C)** [_src.html:1722] "anlık yüzleşme"→"anlık karşılaşma", [:2315] "derin bir yüzleşme"→"derin bir konuşma", admin placeholder [:1473] "hangi konuyla yüzleşeceğiz"→"ne üzerine konuşmak istersin". Build temiz, index.html'de 0 kalıntı.

**2026-07-02 GÜNCELLEME:** 11 ext dilin ESKİ 4-modlu `prompt.mode.guide`'ı 16b-ext'ten silindi → p() güncel TR'ye düşer (canlı TR override dahil). Ayrıntı: [[emre-sesi-yonlendirme]]. Aşağıdaki A maddesi (15b UI intro metinleri) HÂLÂ AÇIK — o farklı dosya/anahtar kümesi.

**A — KAPANDI (2026-07-17 denetimde doğrulandı):** `js/parts/15b-i18n-dict-ext.js` artık YOK — [[tum-diller-native-plani]] v2 i18n yeniden yapılanmasında dosya tümüyle silindi. Canlı app'te yalnız TR+EN var (DE native olarak `js/parts/i18n/de-*.js` altında hazırlanıyor). Kontrol edilen `ci.headline1-3/sub1-3` + `auth.headline/subline` üç dilde de temiz, adversaryal kaçış-dili (fliehen/fuir/huir/fuggire/vluchten) YOK. Eski risk maddesi geçersiz.

**⚠️ HÂLÂ AÇIK (kullanıcının kararı / erişimi gerekli):**
- **#1 Sunucu `llm-chat` Edge Function** (repoda yok) — 2026-07-17: Emre bu sprintte ([[kusursuzluk-sprinti-kararlari]] FAZ 7) kaynağı Dashboard'dan paylaşıp vendorlamayı onayladı; eski "yapay zeka değilsin" cümlesi varsa elle güncellenecek. SETUP-LLM-CHAT.md henüz persona güncellemesi bölümünü içermiyor — kaynak paylaşılınca eklenecek.
- **Ölü kod (scope dışı):** [10-features-w2.js:295-302](js/parts/10-features-w2.js:295) eski W1 4-mod pill sistemi (`ws-chat-mode-pills` + `handleModeSwitch`) — HTML'de element yok, `handleModeSwitch` hiç tanımlanmamış. Sessizce skip ediyor; "YÜZLEŞME" etiketi DOM'a hiç yazılmıyor. Temizlik fırsatı ama bu turda dokunulmadı.

Doğrulama: text-replace only · sentaks bozulma riski sıfır · auto-build hook bu tur sonunda çalışacak ([[auto-build-on-stop]]). İlgili: [[kota-motoru]] [[ic-meclis-suretler]] [[kitap-sesi-manevi-register]] [[persona-server-side]]
