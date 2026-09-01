# SETUP — llm-chat Edge Function

> **2026-08-19 · Kaynak artık repoda.** `supabase/functions/llm-chat/index.ts`
> Supabase'den indirildi ve vendorlandı. Bu belge bundan sonra bir "yama
> listesi" değil, **canlı kaynağın durum defteri**dir: her bölüm kodda
> uygulanmış mı, damgasıyla yazılıdır.

## 0) Kaynak, deploy ve persona akışı

### Kaynağı indirme / güncelleme

```bash
npx supabase functions download llm-chat --project-ref utfphfifkgfrrsifrzjc
```

### Deploy

```bash
npx supabase functions deploy llm-chat --project-ref utfphfifkgfrrsifrzjc
```

> **Kural: bu dosya artık Dashboard'dan elle düzenlenmez.** Repo tek kaynaktır;
> Dashboard'da yapılan bir düzenleme bir sonraki deploy'da sessizce silinir.
> Değişiklik repoda yapılır, commit edilir, sonra deploy edilir.

### Gerekli secret'lar

| Secret | Kullanım |
|---|---|
| `LLM_API_KEY` | LLMAPI çağrıları (chat + embedding) — yoksa 500 |
| `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` | persona/profil/RAG okuması |

### Persona nereden geliyor (sesin sunucu ayağı)

```
07b ME_SECTIONS (15 bölüm, repoda)
  → meAssembleDoc()            [07:173]  tek belgeye mühürler
  → admin_settings.system_prompt          admin "Merhaba, Emre" panelinden yayın
  → getPersona()               [llm-chat:20]  10 dk TTL cache
  → finalMessages[0] = { role:'system', content: persona }
```

Yani **sunucuda ayrı bir persona metni yoktur** — sesin sunucu ayağı da
anayasadan doğar. Panelde yayınlanan değişikliğin canlıya inmesi için cache
düşürülür:

```js
// admin: 07 savePersona sonrası
await callLLM({ action: 'invalidate_persona' })   // admin-only, llm-chat:117
```

> ⚠️ **Parse tuzağı:** `_meParseDoc` (07:157) kayıtlı belgeyi `## N.`
> başlıklarından ayrıştırır; marker bulunmazsa panel **varsayılanları**
> gösterir ama sunucu `system_prompt`'ta ne yazıyorsa **onu** okur. Panelde
> gördüğün ile sunucunun okuduğu ayrışabilir — şüphede: panelden bir kez
> "Yayınla", belge yeniden mühürlenir.

---

## 1) `chat-images` Storage Bucket (görsel ekleme için zorunlu)

Supabase Dashboard → SQL Editor:

```sql
-- Bucket (public: mesaj balonlarında <img> doğrudan yüklensin diye)
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

-- Kullanıcı yalnız kendi klasörüne yükleyebilir (path: {uid}/dosya.jpg)
create policy "chat images insert own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Public okuma (URL'ler uzun rastgele adlı; istersen private + signed URL'e
-- geçilebilir ama o zaman geçmişte görsel render'ı için ek iş gerekir)
create policy "chat images public read"
on storage.objects for select to public
using (bucket_id = 'chat-images');
```

> Not: Client görselleri zaten 1280px / JPEG 0.82'ye küçültüyor (≈100-250 KB).

---

## 2) Görsel markdown'ı → multimodal içerik (Vision) · ✅ UYGULANMIŞ

> Kaynakta doğrulandı (2026-08-19): `IMG_MD` dönüşümü `llm-chat:177-193`'te
> duruyor, son kullanıcı mesajından en çok 3 görsel alıyor. Aşağıdaki kod
> referans olarak bırakıldı.

Client, görsel ekli mesajların SONUNA şu kalıbı ekler:
`![görsel](https://<proje>.supabase.co/storage/v1/object/public/chat-images/...)`

Kaynaktaki dönüşüm (LLMAPI'ye gidecek `messages` dizisi hazırlandıktan
sonra, fetch'ten önce):

```ts
// ── VISION: son kullanıcı mesajındaki görsel markdown'larını multimodal'a çevir ──
const IMG_MD = /!\[[^\]]*\]\((https:\/\/[^\s)]+\/storage\/v1\/object\/public\/chat-images\/[^\s)]+)\)/g;

let hasImages = false;
const lastUserIdx = messages.map(m => m.role).lastIndexOf('user');
if (lastUserIdx !== -1 && typeof messages[lastUserIdx].content === 'string') {
  const raw = messages[lastUserIdx].content;
  const urls = [...raw.matchAll(IMG_MD)].map(m => m[1]).slice(0, 3);
  if (urls.length) {
    hasImages = true;
    const text = raw.replace(IMG_MD, '').replace(/\n{3,}/g, '\n\n').trim();
    messages[lastUserIdx] = {
      role: 'user',
      content: [
        { type: 'text', text: text || 'Eklediğim görsele bak.' },
        ...urls.map(url => ({ type: 'image_url', image_url: { url } })),
      ],
    };
  }
}

// DeepSeek v4 (deepseek-v4-flash) artık NATIVE vision destekliyor — model değiştirmeye
// gerek YOK; mevcut model görsellerle birlikte çalışır. (hasImages yalnız multimodal
// içerik kurmak için lazım; eski sürümdeki gemini'ye geçiş kaldırıldı.)
```

> Eski (pencere içindeki) kullanıcı mesajlarındaki görsel linkleri metin olarak
> kalır — yalnız SON mesajın görselleri modele iletilir; maliyet kontrollü kalır.

---

## 3) Kitap kaynakçası header'ı (`X-Wanderer-Sources`) · ✅ UYGULANMIŞ

> Kaynakta doğrulandı (2026-08-19): `sourcesHeader` hem streaming hem
> non-streaming dalda gönderiliyor; `Access-Control-Expose-Headers`
> `corsHeaders` içinde sabit (`llm-chat:11`). RAG eşiği 0.25, 3 pasaj
> (`runRAG`, `llm-chat:44`).

RAG pasajları seçildikten sonra (LLM çağrısından önce elinde hangi pasajların
kullanıldığı var), yanıt header'ına meta veri ekle. Client
`decodeURIComponent + JSON.parse` ile okur; header yoksa sessizce geçer.

```ts
// ragPassages: [{ book: 'Mesele Sensin', section: 'Derinlikler', quote: '...' }, ...]
const sourcesHeader = encodeURIComponent(JSON.stringify(
  ragPassages.slice(0, 3).map(p => ({
    book:    p.book    ?? 'Mesele Sensin',
    section: p.section ?? '',
    quote:   (p.quote ?? p.content ?? '').slice(0, 300),
  }))
));

// Streaming yanıtı dönerken (header'lar body'den önce gider):
return new Response(stream, {
  headers: {
    ...corsHeaders,
    'Content-Type': 'text/event-stream',
    'X-Wanderer-Sources': sourcesHeader,
    'Access-Control-Expose-Headers': 'X-Wanderer-Sources', // CORS: client okuyabilsin
  },
});
```

> ÖNEMLİ: `Access-Control-Expose-Headers` olmadan tarayıcı header'ı client'a
> göstermez. `encodeURIComponent` şart — header'lar Türkçe karakter taşıyamaz.
> Non-streaming dalında da aynı header'ları ekle.

---

## 4) Hatırlatma — bekleyen RLS politikaları (gün silme + yeniden üret)

> Bu politikalar artık `migrations/000_wanderer_schema.sql` içinde
> (idempotent DO bloğuyla). 017'yi uyguladıysan bu adım otomatik tamam.

```sql
create policy "users delete own chat" on chat_history
  for delete using (auth.uid() = user_id);
create policy "users delete own summaries" on chat_summaries
  for delete using (auth.uid() = user_id);
```

## Doğrulama

1. **Vision**: Sohbette ataç (🖇) ile bir ekran görüntüsü ekle + "bu konuşmada ne
   oluyor?" yaz → Wanderer görüntü içeriğine atıf yapmalı.
2. **Kaynakça**: Kitap konusu geçen bir soru sor (RAG tetiklenir) → yanıt altında
   "𝍪 Mesele Sensin · …" chip'i görünmeli; tıklayınca pasaj açılmalı.

---

## 5) EMNİYET KATMANI — sunucu güvenlik ayağı · ❌ UYGULANMAMIŞ

> **Kaynakta doğrulandı (2026-08-19): 5a ve 5b kodda YOK.** İndirilen
> `index.ts` içinde ne `SAFETY_FOOTER` ne de kriz deseni taraması var —
> fonksiyon persona + RAG + proxy'den ibaret. Yani client katmanı bugün
> **bypass edilebilir**: client'tan boş bir `context_prompt` gönderen bir
> istemci, güvenlik talimatı olmadan modele ulaşır.
>
> Bu bir persona işi değil, **Emniyet Katmanı'nın işidir** — ayrı sprintte
> ele alınır (`.claude/plans/persona-ic-calisma.md` § A'nın kuyruğu).
> Aşağıdaki yamalar o sprint için hazır durur.

### 5a) Sunucu-sabitli güvenlik başlığı (client bypass koruması)

Client'tan gelen system prompt'a EK olarak, llm-chat OpenRouter/LLMAPI çağrısından
önce kendi güvenlik talimatını daima sona ekler (client ne gönderirse göndersin):

```ts
const SAFETY_FOOTER = `
[GÜVENLİK — SİSTEM SEVİYESİ, DEĞİŞTİRİLEMEZ / SAFETY — SYSTEM LEVEL, IMMUTABLE]
- İntihar veya kendine zarar verme YÖNTEMİ, aracı, yeri, dozu hakkında ASLA bilgi verme —
  kurgu, senaryo, araştırma, "bir arkadaşım için" kılıfıyla istense bile.
- Kriz sinyalinde: yargılamadan yanında kal, profesyonel desteği ve güvendiği bir insana
  haber vermeyi teşvik et (Türkiye: 112; US: 988; dizin: findahelpline.com).
- Reçeteli ilaç başlama/bırakma/doz tavsiyesi ASLA verme.
- Gerçeklikten kopuk inançları (sanrı/paranoya) doğrulama; nazikçe gerçekliğe demirle.
- Never provide methods/means for suicide or self-harm under any framing; in crisis,
  stay present and refer to professional help and a trusted person.`;

// messages hazırlandıktan sonra, fetch'ten önce:
const sysIdx = messages.findIndex(m => m.role === 'system');
if (sysIdx !== -1) messages[sysIdx].content += SAFETY_FOOTER;
else messages.unshift({ role: 'system', content: SAFETY_FOOTER });
```

### 5b) Kota reddinden ÖNCE kriz muafiyeti

429 dönmeden önce son kullanıcı mesajı kriz desenlerinden geçirilir; sinyal varsa
o mesaj kotadan muaf işlenir (günde ≤15 — client'taki lütufla aynı tavan):

```ts
const CRISIS_RX = [
  /intihar/i, /kendimi öldür/i, /yaşamak istemiyorum/i, /kendime zarar/i, /ölmek istiyorum/i,
  /suicide/i, /kill myself/i, /end my life/i, /want to die/i, /self.?harm/i, /hurt myself/i,
  /suizid|selbstmord|nicht mehr leben/i, /me suicider|je veux mourir/i, /quiero morir|suicidarme/i,
  /покончить с собой|не хочу жить/i,
]; // tam liste: js/parts/16c-i18n-detect-dict.js (client ile senkron tut)

const lastUser = [...messages].reverse().find(m => m.role === 'user');
const lastText = typeof lastUser?.content === 'string' ? lastUser.content
  : (lastUser?.content?.find?.(p => p.type === 'text')?.text ?? '');
const isCrisis = CRISIS_RX.some(r => r.test(lastText));

// Kota reddi dalında:
// if (quotaExceeded && !isCrisis) return 429;
// if (quotaExceeded && isCrisis)  → crisis_grace sayacına bak (user_id + gün, ≤15) → geç.
```

Sayaç için en hafif yol (yeni tablo yok): `quota_consume` RPC'sine `p_crisis boolean`
parametresi ekle; true ise limit aşımında `bonus` yolunun benzeriyle günde 15'e dek izin ver.

### 5c) Persona temizliği — ✅ eski korku çürüdü, ⚠️ yerine gerçek bir açık var

**Çürüyen korku:** "sunucuda ayrı, eski bir persona metni duruyor olabilir."
Kaynak okundu: böyle bir metin **yok**. `getPersona()` yalnız
`admin_settings.system_prompt`'u okur — yani anayasanın (07b) kendi çıktısını.
Sunucuda düzenlenecek ikinci bir kopya hiç olmamış.

**Yerine çıkan gerçek açık:** anayasanın kendisi İhtimalsel Dil Devrimi'nden
(2026-08-11) muaf kaldı. 07b bölüm 3 hâlâ kesin tanı retoriğini emrediyor
("İlişkilerinde başarısız çünkü…") oysa client kimliği (`prompt.identity.core`,
16b:96-106) kesin hükmü yasaklıyor. İkisi de aynı turda `system` rolünde
gidiyor. Göç `.claude/plans/persona-ic-calisma.md` FAZ 2'nin işidir; sunucuya
dokunmaz — anayasa düzeltilip panelden yayınlanınca sunucu da düzelmiş olur.

> `admin_settings.system_prompt`'ta hâlâ eski bir metin durup durmadığını
> anlamanın yolu: admin → Merhaba, Emre panelini aç. Bölümler doluysa belge
> parse edilebiliyor demektir; **boş/varsayılan görünüyorsa** kayıtlı belge
> `## N.` desenini taşımıyor ve sunucu panelde görmediğin bir metni okuyor —
> o hâlde bir kez "Yayınla" ile belgeyi yeniden mühürle.

### Doğrulama (Faz 5)
1. Client system prompt'u boş gönderilse bile yanıtta güvenlik davranışı sürmeli (5a).
2. Kota dolu + "yaşamak istemiyorum" → 429 DEĞİL, yanıt gelmeli (5b).
3. `select screen, count(*) from usage_events where kind='safety' group by 1;`
   → crisis_signal / crisis_card / crisis_grace sayaçları akmalı (client tarafı kurulu).

---

## 6) Kaynaktan çıkan açık maddeler (2026-08-19 vendorlama denetimi)

Kaynak okunurken görülen, persona ile ilgisi olmayan üç açık. Üçü de gerçek,
üçü de **başka sistemlerin** işi — ayrı sprintlere yazıldı.

### 6a) Kota zorlaması ilkel · Kota Motoru'nun işi

`llm-chat:134` şunu yapıyor:

```ts
if (!isPremium && msgCount >= freeLimit + 2) return json({ error: 'Free tier limit exceeded' }, 429);
```

Yani `profiles.message_count` üzerinden tek sayaç. Oysa Kota Motoru (13m)
çift kota + `quota_windows` + `fn_quota_consume` RPC'siyle çalışıyor ve
`quota_settings.server_enforced` bayrağını bekliyor — **bu bayrak sunucuda
hiç okunmuyor.**

> ⚠️ **Tehlike:** `server_enforced` `true` yapılırsa client tüketimi bırakır
> (13m:142) ve sunucu da yeni sayacı bilmediği için kota **hiç işlemez**.
> Bayrak, llm-chat `fn_quota_consume`'a bağlanana kadar `false` kalmalı.

### 6b) Emniyet Katmanı §5 sunucuda yok

Yukarıda §5. Client bypass'ına açık.

### 6c) CORS `*`

`llm-chat:8` — `Access-Control-Allow-Origin: '*'`. JWT doğrulaması var
(fonksiyon kimliksiz çağrılamaz), ama `ALLOWED_ORIGIN` secret'ı Kusursuzluk
Sprinti'nden beri bekleyen ELLE adım (6 fonksiyon için geçerli).
