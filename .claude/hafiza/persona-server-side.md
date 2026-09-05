---
name: persona-server-side
description: "Koç personası + kitap alıntıları sunucuda (llm-chat) eklenir; kaynak 2026-08-19'da VENDORLANDI — persona ayrı kopya değil, admin_settings.system_prompt = anayasa çıktısı"
metadata: 
  node_type: memory
  type: project
  originSessionId: b77fbea4-99ca-4431-82fa-913cc338e6d2
---

Emre the Wanderer'ın **personası (system_prompt) ve kitap alıntıları client'ta DEĞİL, sunucuda (Supabase Edge Function `llm-chat`) eklenir** — `buildContextPrompt` yalnızca XML bağlam bölümlerini üretir (bkz. 01-prompts-modes.js:167 ve 04-llm-hero-history.js:18). Ek olarak client-side `prompt.mode.guide` (16b) "WANDERER KİMLİĞİ" bloğunu taşır (00-config buildModeSelectionGuide → her mesajda).

**GÜNCELLEME 2026-06-22:** Client-side persona ARTIK yüzleştirici değil — bkz. [[yuzlesme-kacis-kaldirma]]. `prompt.mode.guide`'taki kimlik "Bir yapay zeka rolü değilsin" → "bir yapay zekâ dil modelisin (LLM); sorulursa dürüstçe söylersin; insan numarası / 'seni izliyordum' yapmazsın" olarak çevrildi (16b TR:12 + EN:715). ⚠️ **KRİTİK ELLE ADIM:** Sunucudaki `llm-chat` Edge Function'ın system_prompt'unda da eski "yapay zeka değilsin" ifadesi olabilir — ELLE güncellenmeli (repoda olmadığı için bu oturumda dokunulamadı).

**Why:** "Merhaba"ya bile agresif/yüzleştirici yanıt + alakasız kitap alıntısı kartı çıkıyordu.
**How to apply:** Selamlaşma/küçük-konuşma gibi durumlar için `prompt.greeting` talimatı (16b dict) `critical_alerts` bölümüne `getGreetingContext()` ile eklenir (06-summary-chat.js contextExtras). Bağlamsal "Kitap Alıntısı" kartı (10-features-w2.js `w2InjectContextualLessonCard`) artık selam/kısa mesajlarda ve kullanıcı kelimesi eşleşmeyince çıkmaz. Token kesilmesi (`başlayal…`) casual=280 limitinin verbose yanıta yetmemesindendi; kısa selam yanıtı limite çarpmaz. İlgili: [[build-source-convention]] [[personalization-engine-layers]]


**GÜNCELLEME 2026-08-19 · KAYNAK VENDORLANDI — iki iddia yanlışlandı.**
`npx supabase functions download llm-chat --project-ref utfphfifkgfrrsifrzjc`
ile indirildi, repoda: `supabase/functions/llm-chat/index.ts` (277 satır).
Sır taraması temiz (tüm anahtarlar `Deno.env.get`).

1. **"repoda YOK" artık yanlış** — kaynak repoda; Dashboard'dan elle
   düzenlenmez, repo tek kaynaktır (bkz. `SETUP-LLM-CHAT.md` §0).
2. **"sunucuda eski/bayat bir persona metni olabilir" korkusu ÇÜRÜDÜ.**
   Sunucuda ayrı bir persona metni hiç olmamış: `getPersona()` (llm-chat:20)
   yalnız `admin_settings.system_prompt`'u okur (10 dk TTL cache +
   `invalidate_persona` admin action'ı) — yani `meAssembleDoc()`'un ürettiği
   **anayasa belgesinin ta kendisini**. Sesin sunucu ayağı da 07b'den doğuyor.

**Yerine çıkan GERÇEK açık:** anayasa (07b) İhtimalsel Dil Devrimi'nden muaf
kaldı — bölüm 3 hâlâ kesin tanı retoriği emrediyor ("İlişkilerinde başarısız
çünkü…"), client kimliği (`prompt.identity.core` 16b:96-106) ise kesin hükmü
yasaklıyor. İkisi aynı turda `system` rolünde gidiyor. Kök neden:
`scripts/ihtimalsel-denetci.mjs` yalnız 15b/15e/12b2 tarıyor; 07b ve 16b/16e
kapının dışında. Göç + kapı: `.claude/plans/persona-ic-calisma.md` FAZ 2-3.

**Kaynaktan çıkan üç açık (persona DIŞI, ayrı sprintlerin işi):**
(a) kota zorlaması ilkel — `msgCount >= freeLimit+2` (llm-chat:134);
13m'nin beklediği `server_enforced`/`fn_quota_consume` sunucuda HİÇ yok →
bayrak `true` yapılırsa kota hiç işlemez [[kota-motoru]];
(b) Emniyet Katmanı §5 (SAFETY_FOOTER + kriz muafiyeti) kodda YOK — client
bypass'ına açık [[guvenlik-emniyet-katmani]];
(c) CORS `*` (llm-chat:8) — ALLOWED_ORIGIN secret'ı hâlâ bekliyor.

**Parse tuzağı:** `_meParseDoc` (07:157) `## N.` deseni bulamazsa panel
varsayılanları gösterir ama sunucu `system_prompt`'ta yazan metni okur —
panelde gördüğün ile sunucunun okuduğu ayrışabilir; şüphede bir kez "Yayınla".
