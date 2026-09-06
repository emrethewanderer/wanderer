---
name: persona-ic-calisma
description: "2026-08-19 İç Çalışma 03 sprinti — 10 faz TAM: llm-chat vendorlandı, anayasa register göçü, sunucu p() zinciri (pServer), directive geçmişi, prova sahnesi, ses eval kapısı; ELLE: 2 redeploy + mig 043 + anayasa yayını"
metadata: 
  node_type: memory
  type: project
  originSessionId: ab95cc0d-3303-409c-bd86-9b18b28cd0c0
  modified: 2026-08-18T23:30:25.608Z
---

İç Çalışma 03 (Persona & Emre'nin Sesi) rev.2 yayınlandı ve **on fazın
tamamı aynı turda uygulandı**. Plan: `.claude/plans/persona-ic-calisma.md`.
2555 test yeşil, build temiz, üç denetçi temiz.

## Sprintin merkezi bulgusu — iki system mesajı çelişiyordu

`llm-chat` kaynağı indirildi (`npx supabase functions download llm-chat
--project-ref utfphfifkgfrrsifrzjc`) ve iki eski korku **yanlışlandı**:
sunucuda ayrı/bayat bir persona metni HİÇ olmamış — `getPersona()`
doğrudan `admin_settings.system_prompt`'u okur, yani 07b anayasasının
`meAssembleDoc()` çıktısını. Ayrıntı: [[persona-server-side]].

**Yerine çıkan gerçek:** İhtimalsel Dil Devrimi (2026-08-11) kapanırken
anayasa kapsam haritasında hiç yer almamıştı. 07b bölüm 3 kesin tanı
retoriğini emrederken (`"İlişkilerinde başarısız çünkü…"`), aynı turda giden
`prompt.identity.core` (16b:96-106) kesin hükmü yasaklıyordu. İkisi de
`system` rolünde, arka arkaya.

**Triyaj:** kitabın üç imza örneği VERBATİM korundu (onlar üçüncü tekildir —
gözlem, kişi hakkında hüküm değil), üstüne sahiplik kuralı yazıldı; 16b'nin
`mode.card.direct`'te zaten bulduğu şablon anayasaya taşındı ("Bu, şu an
_____ bir kişi olduğun için oluyor **olabilir**"). Tez yumuşatılmadı.

## Kalıcı kurallar / mimari

- **Sunucu tarafı p() zinciri** — `supabase/functions/_shared/persona-directives.ts`
  `pServer(sb, key, lang, fallback)`: dil-override → TR-override →
  fonksiyonun kendi metni. 10 dk cache (llm-chat `_personaCache` emsali).
  Asla throw etmez. `soz-terzisi` + `sohbet-baslaticilari` bağlandı.
  Anahtarlar `prompt.srv.*` — **16b'ye GİRMEZ** (bundle diyeti); panel onları
  16d'nin saf-DB anahtarı mekanizmasıyla gösterir (ES_SERVER_KEYS + SUNUCU
  SESLERİ grubu). Sessiz kırılmanın tek yeri anahtar adıdır → panel↔fonksiyon
  senkronu `tests/sunucu-sesi.test.js`'te kilitli.
- **Anayasanın bekçisi regex DEĞİL, sözleşme testi** — 07b uzun template
  literal ve gövdesinde ayetler var; desen taraması kanonu hedef gösterirdi
  (denetçinin 16b/16e'yi bilinçli dışarıda bırakma gerekçesiyle aynı, K5).
  `tests/anayasa-register.test.js` triyajın sonucunu kilitler.
  `ihtimalsel-denetci.mjs` kör nokta defterine **#8** yazıldı.
- **Directive geçmişini DB trigger'ı yazar** (mig 043) — uygulama katmanı
  değil: persona_directives'e yazan taraf tek değil, uygulamaya bağlanan bir
  geçmiş SQL Editor'dan gelen değişikliği kaçırır. Aynı içerik yeniden
  yayınlanırsa yazmaz (`IS DISTINCT FROM`). "Bu sürüme dön" yalnız KUTUYA
  yazar; yayın bilinçli hamle kalır.
- **Prova sahnesi** — `16g prvKos(taslak, mesaj)`: taslağı canlı override
  haritasına geçici bindirir, `finally` ile geri yazar. Geri alınmazsa
  yayınlanmamış taslak o oturumdaki her kullanıcı çağrısında yürürlükte kalır
  ve HİÇBİR yerde görünmez. Eşzamanlı prova kapısı (`_prvKosuyor`) şart —
  ikinci `finally` birincinin yedeğini ezerdi.
- **Ses eval kapısı LLM-hakem DEĞİL** — modelin öz-beyanı kapı olamaz (§6.10);
  bir modelin başka bir modeli puanlaması da aynı şeydir, bir katman uzakta.
  `scripts/ses-eval.mjs` yalnız metinde GÖSTERİLEBİLİR olguya bakar ve her
  ihlalin kanıtını metinden keser. Senaryo bağlamı taşınır: **krizde
  yumuşatma aranmaz, yönlendirme aranır**; selamda ihtimal aracı aranmaz.
  `16h` yedi kanonik konuşmayı `prvKos` ile koşar (ikiz motor yok).

## Gotcha'lar (bu turda ısıran)

1. **`\b` ve `\w` ASCII'dir — Türkçe metinde ISIRIR.** "çoğu zaman"da `ç`
   non-word sayılır, `\bçoğu` HİÇ eşleşmez. Repoda üçüncü kez ısırdı (P6
   örüntü motoru, ihtimalsel denetçi, ses-eval). Çözüm: Türkçe-farkındalıklı
   lookaround (`(?<![A-Za-zçÇğĞıİöÖşŞüÜ0-9_])`). Kaynakta `\b`/`\w`
   kalmadığı teste bağlandı.
2. **`.btn-outline-gold` globalde `width:100%` + `min-height:52px`** (dokunma
   hedefi). Satır içinde kullanılırsa yanındaki metni tek kelimelik sütuna
   ezer (327px yükseklik). Satır-içi butona `width:auto;flex:0 0 auto;
   min-height:0` şart.
3. **Preview pane gizliyken `innerWidth` 0 döner** ve TÜM layout ölçüleri
   yalancı sıfır çıkar — screenshot yine 800x450 gelir, yani görüntüye
   bakarak anlaşılmaz. Teşhis: `document.documentElement.clientWidth`.
   Çözüm: `tabs_create` ile yeni sekme (1280px açılır).
4. **`vi.mock` factory'si tüm modülü değiştirirse** import zinciri kırılır
   (`03-auth-shell` → `11-w2-chat-cal` TDZ). `importOriginal()` ile yayıp
   yalnız hedef fonksiyonu değiştir.
5. **CLI script'i tarayıcıda import edilecekse `process` guard'ı şart** —
   `ses-eval.mjs` hem `node --fixture` hem 16h tarafından yükleniyor.

## ELLE bekleyen (Emre)

1. `npx supabase functions deploy soz-terzisi --project-ref utfphfifkgfrrsifrzjc`
2. `npx supabase functions deploy sohbet-baslaticilari --project-ref utfphfifkgfrrsifrzjc`
3. `migrations/043_persona_directives_history.sql` → SQL Editor
4. Admin → Merhaba, Emre → bir kez **Yayınla** (yeni register sunucuya insin)

## Açık kalanlar

- **A'nın kuyruğu** (persona dışı, ayrı sprintler): llm-chat kota zorlaması
  hâlâ ilkel `message_count` üzerinden — 13m'nin beklediği `server_enforced`
  sunucuda HİÇ yok, bayrak `true` yapılırsa kota hiç işlemez [[kota-motoru]];
  Emniyet Katmanı §5 kodda yok, client bypass'ına açık
  [[guvenlik-emniyet-katmani]]; CORS `*`.
- **Gözlemevi eval kadranı** — sınama sonucu şimdilik kaydedilmiyor.
- **Bundle 662/665KB** — 16g/16h admin-only, sidecar'a taşınmaya aday
  [[bundle-diyeti-sidecar]].

İlgili: [[emre-sesi-yonlendirme]] · [[emre-yonlendirme-hardcode-yasak]] ·
[[merhaba-emre-anayasa]] · [[ihtimalsel-dil-devrimi]] ·
[[kitap-sesi-manevi-register]] · [[gerceklik-mimarisi]]
