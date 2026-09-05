---
name: llm-yedek-zinciri-sirali
description: "GOTCHA: LLM_FALLBACK_CHAIN'in üçüncü halkası hiç denenmiyordu; _nextFallbackModel indeksle ilerler, döngü kapalı"
metadata: 
  node_type: memory
  type: project
  originSessionId: b0b53af1-7090-49dc-875a-171a6f5fdfed
  modified: 2026-08-02T18:18:35.750Z
---

`callLLM` yedek modele geçerken artık `_nextFallbackModel(model)` kullanır:
zincirde **indeksle** ilerler (`LLM_FALLBACK_CHAIN[i+1]`), sonunda `null`
döner. Zincir dışı ama bilinen bir model (`CHAT_MODEL` / `SUMMARY_MODEL`)
zincirin başından başlar.

**Why:** Eski kod iki kusur taşıyordu ve biri diğerini gizliyordu.
`find(m => m !== model)` daima ilk farklı elemanı — yani **ikinci** halkayı —
döndürüyordu, dolayısıyla üç modellik zincirin **üçüncüsü hiç denenmiyordu**.
Kapı (`model === CHAT_MODEL`) sohbet dışı modellere açılsaydı
`deepseek → gemini → deepseek` **sonsuz döngüsü** doğardı; döngü yoktu çünkü
ikinci halka zaten fallback yapamıyordu. Ayrıca `SUMMARY_MODEL` ile
`CHAT_MODEL` bugün AYNI sabiti (`deepseek-v4-flash`) gösteriyor — bu tesadüf
bozulduğu gün (özetleyici ucuz bir modele alınırsa) Atölye tasarımı, kart
üretimi (12d), örüntü damıtması (09d) ve Gözlemevi (13q) sessizce yedeksiz
kalırdı.

**How to apply:** Yeni bir model sabiti eklerken ya zincire koy ya da
`_nextFallbackModel`'in bilinen-model kolunda adını geç; yoksa o çağrı tek
atışlık olur. Zincir uzunluğu 503 testinde `fetch` çağrı sayısıyla
mühürlüdür (`tests/04-llm-hero-history.test.js`) — halka eklersen test
kendiliğinden yeni uzunluğu bekler.

Not: bir çağrının yedeğe HİÇ ulaşamamasının en yaygın sebebi zincir değil,
çağıranın kendi timeout'udur — `Promise.race` fetch'i abort edince zincir
devreye giremez (bkz. [[mesajin-arkasindaki-kart]] 22 sn vakası ve
[[sohbet-reasoning-fix]] ~25 sn ölçümü).
