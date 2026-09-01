# SETUP — Söz Terzisi (`soz-terzisi` edge function)

Günün Sözü'nü kullanıcının kendi verisinden **gece** dokuyan LLM katmanı.
Kod tarafı tamamdır; burada yalnız **elle** yapılacaklar var.

> **Terzi bir lükstür.** Deploy edilmezse hiçbir şey kırılmaz: istemci (13w)
> ağ hatasını sessizce yutar, Günün Sözü banka + yuvalı söz + mertebe
> katmanlarıyla çalışmaya devam eder. Kullanıcı bir hata görmez.

---

## 1. Neden ayrı bir fonksiyon?

Terzi, kullanıcının **sohbet kotasına dokunmaz** (Emre kararı, 2026-07-31).
Kendi günlük tavanı vardır: kişi başı günde 1 dokuma. Böylece "uygulamayı
hiç kullanmadım ama sohbet hakkım gitmiş" durumu doğmaz.

Kota sayacı **yeni migration gerektirmez** — mevcut
`public.fn_quota_consume(p_uid, p_fn, p_limit)` RPC'si jenerik olduğu için
`p_fn = 'soz-terzisi'` adıyla aynı tablo kullanılır
(`migrations/000_wanderer_schema.sql`).

## 2. Deploy

```bash
supabase functions deploy soz-terzisi
```

## 3. Secret'lar

`LLM_API_KEY` zaten tanımlıysa (llm-chat için) yeni bir şey gerekmez;
fonksiyon aynı anahtarı okur. Farklı model/uç istiyorsan:

```bash
supabase secrets set LLM_MODEL=deepseek-v4-flash
supabase secrets set TERZI_DAILY_LIMIT=1
```

| Secret | Zorunlu | Varsayılan |
|---|---|---|
| `LLM_API_KEY` | ✅ | — (yoksa fonksiyon 500 döner, istemci sessizce bankaya düşer) |
| `LLM_API_URL` | — | `https://api.llmapi.ai/v1/chat/completions` |
| `LLM_MODEL` | — | `deepseek-v4-flash` |
| `TERZI_DAILY_LIMIT` | — | `1` (kişi/gün) |
| `ALLOWED_ORIGIN` | — | `*` |

## 4. Doğrulama

Deploy sonrası, oturum açık bir tarayıcıda konsoldan:

```js
await window.stDokuMaybe(true)   // true → dokuma yapıldı ve saklandı
window.stOku(new Date(Date.now() + 864e5).toISOString().slice(0,10))
```

İkinci çağrı aynı gün için `false` dönmeli (kota + "yarın zaten dokunmuş"
kapısı). Ertesi sabah söz pop-up'ında dokunan sözler görünür.

## 5. Gizlilik notu

Fonksiyona **ham sohbet metni gönderilmez**. Giden gövde yalnız türetilmiş
sinyalleri taşır: alan, ihtiyaç ekseni, mertebe ve — varsa — sözün içine
girecek kısa kişi adı / olay kelimesi. Bu sınır `tests/13w-soz-terzisi.test.js`
içinde teste bağlanmıştır ("fonksiyona giden gövde yalnız türetilmiş sinyal
taşır").

## 6. Kalite kapısı

Söz **harfiyen yazılarak** mühürlendiği için üretilen her cümle iki kez
elenir (sunucuda ve istemcide, aynı kurallarla):

- tek cümle · 8–64 karakter · soru/ünlem yok · şablon yuvası sızmamış
- birinci tekil gelecek zaman (TR `-acağım/-eceğim`, EN `I will`)

Kapıdan geçemeyen alan **sessizce düşer**, o alan bankadan tamamlanır.

---

## Sesin canlı yönetimi (2026-08-19 · ELLE redeploy gerekiyor)

Bu fonksiyonun sistem prompt'u artık TypeScript içine kilitli değil:
`_shared/persona-directives.ts` üzerinden `persona_directives` tablosuna
bakar, satır yoksa fonksiyonun kendi metnine düşer.

- **Panel:** Admin → Emre'nin Sesi → **SUNUCU SESLERİ** grubu → `prompt.srv.soz_terzisi.system`
- **Zincir:** dil-override → TR-override → fonksiyonun kendi metni
- **Gecikme:** yayınlanan metin en geç **10 dakikada** canlıya iner (cache TTL)
- **Emniyet:** tablo yoksa, satır yoksa, boşsa ya da DB düşerse fonksiyon
  kendi metniyle çalışmaya devam eder — hiçbir durumda susmaz

### Senin yapman gereken

```bash
npx supabase functions deploy soz-terzisi --project-ref utfphfifkgfrrsifrzjc
```

> Redeploy edilmezse sunucu **eski kodu** çalıştırmaya devam eder: panelde
> yazdığın metin kaydedilir ama fonksiyon onu hiç okumaz. Sessiz kırılma —
> panelde "yayınlandı" görürsün, üretilen metin değişmez.
