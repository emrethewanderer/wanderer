---
name: cekirdek-omurga-haritasi
description: "Uygulamanın mimari belkemiği — Fable gibi gezinmek için: state.js compose, main.js import+expose hub, 03-auth-shell switchView+hook+sıralı post-auth init, 01-prompts bütçeli buildContextPrompt"
metadata: 
  node_type: memory
  type: reference
  originSessionId: b69c1823-153e-4c2b-a536-eb890e2072c5
---

Fable'ın içgüdüsel gezindiği 4 omurga dosyası. Bir özelliğin "nereye bağlandığını" bulmak için buraya bak.

**1. `js/state.js` — merkezî sinir sistemi.** Tek `S` objesi 8 slice'tan compose edilir (`Object.assign({}, authState, chatState, settingsState, personalizationState, depthState, w2State, extrasState, benlikState)`). Tüm modüller `import { S } from '../state.js'` ile AYNI reference'a erişir — mutation her yerden görünür. Yeni state: `js/state/<ad>.js` oluştur + compose dizisine ekle. Modül-private state ise modül içi `let _x`.

**2. `js/main.js` — import + expose hub'ı (89 import).** Yükleme sırası: `infra → state/config → i18n → tracking → features → extras → boot`. Her feature importunun yanında ne expose ettiği yorumda ("boot'ta window.gl* açar"). Çekirdek dışa-açım: tek `Object.assign(window, { switchView, initApp, … })` (~486) + özel tekil expose'lar. Son modül `14-boot.js`.

**3. `js/parts/03-auth-shell.js` — router + init omurgası.**
- `switchViewHooks = createHookRegistry()`; `switchView(v)` → `runBefore(v, ctx)` → görünüm değiş → `runAfter(v)`. before-hook `ctx.cancelled=true` ile geçişi yakalar (10y flip motoru buraya takılır).
- **POST-AUTH INIT BLOĞU (~353-405) — KRİTİK ve SIRALI.** Her feature `import('./x.js').then(m=>{try{m.xInit()}catch(_){}}).catch(()=>{})` ile savunmacı dinamik yüklenir. Sıra önemli: temel feature'lar → fx/at/wr/wk/cz/gl → **smInit(10t) → usInit(10u)** [us, smRenderBugunCard'ı devralır] → **yolInit(10f)** [usSeriesState okur] → **kkInit +1200ms, imInit +1800ms** [hidrasyon için gecikmeli] → fm/kt/bildirim. Yeni feature init'i BURAYA, doğru sırada koy — `14-boot`'a ASLA ([[ritual-streak-unity]]).

**4. `js/parts/01-prompts-modes.js` — bütçeli katmanlı context.** `buildContextPrompt(ragContext, extras)` system prompt'u katman katman kurar: `_s(ad, öncelik, içerik)` ile focus_model + personalization(P1-P5) + felsefi katmanlar + session_memory… **BUDGETS** tablosu yanıt-moduna göre (crisis/deep_emotion/knowledge_seek/casual/standard) her bölüme token bütçesi ayırır (null=sınırsız); crisis personalization'ı kısar, casual kırpar. Persona + kitap alıntıları SUNUCUDA eklenir ([[persona-server-side]]); P6 yaşam hafızası 09a'da ([[personalization-engine-layers]]).

Akış: boot → 14-boot → auth → 03-auth-shell post-auth init (sıralı) → switchView ile gezinme (hook'lar flip/announce tetikler) → sohbet 06 `_runLLMTurn` → 01 buildContextPrompt → 04 callLLM → edge function (persona+RAG).
