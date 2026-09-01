# SETUP — Kişisel Başlatıcılar (`sohbet-baslaticilari` edge function)

Ana ekranın soru şeridini kullanıcının **kendi cümlelerinden** dokuyan LLM
katmanı. Kod tarafı tamamdır; burada yalnız **elle** yapılacaklar var.

> **Başlatıcı dokuması bir lükstür.** Deploy edilmezse hiçbir şey kırılmaz:
> istemci (10y2) ağ hatasını sessizce yutar ve şerit bugünkü hâliyle —
> aktif Wanderer Modeli'nin başlatıcılarıyla — çizilmeye devam eder.
> Kullanıcı ne bir hata görür ne de boş bir şerit. Emre'nin üçüncü katmanı
> ("hiç veri yoksa bu öneriler kalsın") aynı zamanda deploy edilmemişlik
> için de emniyet subabıdır.

---

## 1. Neden ayrı bir fonksiyon?

Dokuma, kullanıcının **sohbet kotasına dokunmaz** (Emre kararı, 2026-07-31 —
`soz-terzisi` ile aynı gerekçe). Kendi günlük tavanı vardır: kişi başı günde
2 dokuma (gün dönümü + bir yeniden deneme payı).

Kota sayacı **yeni migration gerektirmez** — mevcut
`public.fn_quota_consume(p_uid, p_fn, p_limit)` RPC'si jenerik olduğu için
`p_fn = 'sohbet-baslaticilari'` adıyla aynı tablo kullanılır
(`migrations/000_wanderer_schema.sql`).

## 2. Deploy

```bash
supabase functions deploy sohbet-baslaticilari
```

## 3. Secret'lar

`LLM_API_KEY` zaten tanımlıysa (llm-chat için) yeni bir şey gerekmez;
fonksiyon aynı anahtarı okur.

| Secret | Zorunlu | Varsayılan |
|---|---|---|
| `LLM_API_KEY` | ✅ | — (yoksa fonksiyon 500 döner, şerit modele düşer) |
| `LLM_API_URL` | — | `https://api.llmapi.ai/v1/chat/completions` |
| `LLM_MODEL` | — | `deepseek-v4-flash` |
| `BASLATICI_DAILY_LIMIT` | — | `2` (kişi/gün) |
| `ALLOWED_ORIGIN` | — | `*` |

Farklı tavan istersen:

```bash
supabase secrets set BASLATICI_DAILY_LIMIT=2
```

## 4. Doğrulama

Deploy sonrası, **oturum açık** ve Kitaplık/Benlik Kartı verisi olan bir
tarayıcıda konsoldan:

```js
window.bslMalzeme()          // null DEĞİL olmalı — {kaynak, sozler[], baglam}
await window.bslDokuMaybe(true)   // true → dokuma yapıldı ve saklandı
window.bslOku()              // [{id, metin, kanit}] — kanıt DOLU olmalı
```

Ardından ana ekranı yeniden çiz (`window.llmRenderHome()`): şeridin ilk
çipleri kişisel sorular, son çip(ler) model başlatıcısı olmalı.

`bslMalzeme()` **null** dönüyorsa dokuma hiç denenmez — kullanıcının ne
yaşam verisi ne de Benlik Kartı cümlesi var demektir; bu bir hata değil,
üçüncü katmanın ta kendisidir.

## 5. Gizlilik notu — `soz-terzisi`'nden AYRILAN NOKTA

Söz Terzisi'ne ham metin **gönderilmez**; bu fonksiyona **gönderilir.**
Fark bilinçlidir ve mimarinin gereğidir:

Kanıt kuralı (§6.10 · `kesin-alinti-mimarisi`) modelin kanıtı **uydurmasını
değil göstermesini** ister. Gösterebilmesi için görmesi gerekir. Bu yüzden
kullanıcının gerçek cümleleri numaralı bir blok hâlinde (`kokenSozBlok`)
gönderilir; model soruyu yazar, kanıtı yazmaz — yalnız `kanit_ref` ("S3")
ile parmakla gösterir. İstemci o referansı **kendi haritasıyla** çözer ve
cümleyi **kaynaktan keser** (`kokenAlintiCoz`).

Sınırlar:
- Cümleler istemcide kırpılır (`kokenSozBlok` `maxLen`) ve blok sunucuda
  6000 karakterde kesilir.
- Fonksiyon hiçbir şey **saklamaz**; blok yalnız istek boyunca yaşar.
- Havuz boşsa (`sozBlok` yok ya da `-`) fonksiyon `400 no_evidence` döner —
  kanıtsız soru üretmek, bu mimarinin engellemek için var olduğu şeydir.

## 6. Kalite kapısı

Üretilen her başlatıcı **iki kez** elenir (sunucuda ve istemcide, aynı
kurallarla — model iki tarafta da güvenilmez sayılır):

- tek cümle · 20–110 karakter · şablon yuvası sızmamış · alıntı/madde
  işaretiyle başlamıyor
- cümle sonu en fazla bir kez ve **sonda**
- **ikinci tekil hitap yok** (TR `sen/senin/sana/…`, EN `you/your/…`):
  başlatıcı kullanıcının kendi ağzından çıkar, uygulama ona anket sormaz

Ve son kapı istemcidedir: `kanit_ref` gerçek bir cümleye çözülemezse
**o soru doğmaz**. Üçü birden düşerse şerit tamamen modele döner.

## 7. Dil kalibrasyonu — deploy sonrası (YARIM KALAN İŞ)

Promptun omurgası yazıldı (`_sistemPromptu`), ama **soruların dili ancak
gerçek çıktıya bakarak oturur** ve bu deploy'dan önce yapılamaz. Deploy
ettikten sonra birkaç kullanıcıda/günde çıktıya bak ve şunları kontrol et:

| Kontrol | Ne aranır | Bozuksa nereye dokunulur |
|---|---|---|
| **Ağza laf koyma** | Soru, kullanıcının söylemediği bir teşhisi onun ağzına koymuş mu? ("yorgunum" → "tükenmişim") | `_sistemPromptu` · "AĞZINA LAF KOYMA" maddesini örnekle sertleştir |
| **Uzunluk** | 40–80 karakter bandında mı, yoksa hep 20'ye mi yapışıyor? | aynı yerde "ideali 40-80" bandını daralt |
| **Kalıp tekrarı** | Üçü de aynı biçimde mi bitiyor (hepsi soru / hepsi "birlikte çıkaralım")? | "üçü aynı kalıpta olmamalı" maddesi + `temperature` (şu an 0.75) |
| **Mahremiyet** | Kişi adı, yer adı, teşhis etiketi sızmış mı? | prompt kuralı + gerekirse sunucu kalite kapısına ad eleği |
| **Eksen uyumu** | Bağ modelindeyken ilişki, Eser'deyken iş sorusu geliyor mu? | `_kullaniciPromptu` bağlam satırları |
| **Kanıt isabeti** | `bslOku()[n].kanit` gerçekten o sorunun kaynağı mı, rastgele bir cümle mi? | prompt "FARKLI bir cümleden" maddesi |

Hızlı bakış (oturum açık tarayıcıda):

```js
await window.bslDokuMaybe(true); window.bslOku().forEach(s => console.log(s.metin, '\n  ← ', s.kanit))
```

Bu tablo bir kez geçildiğinde bu bölüm silinebilir.

---

## Sesin canlı yönetimi (2026-08-19 · ELLE redeploy gerekiyor)

Bu fonksiyonun sistem prompt'u artık TypeScript içine kilitli değil:
`_shared/persona-directives.ts` üzerinden `persona_directives` tablosuna
bakar, satır yoksa fonksiyonun kendi metnine düşer.

- **Panel:** Admin → Emre'nin Sesi → **SUNUCU SESLERİ** grubu → `prompt.srv.baslatici.system`
- **Zincir:** dil-override → TR-override → fonksiyonun kendi metni
- **Gecikme:** yayınlanan metin en geç **10 dakikada** canlıya iner (cache TTL)
- **Emniyet:** tablo yoksa, satır yoksa, boşsa ya da DB düşerse fonksiyon
  kendi metniyle çalışmaya devam eder — hiçbir durumda susmaz

### Senin yapman gereken

```bash
npx supabase functions deploy sohbet-baslaticilari --project-ref utfphfifkgfrrsifrzjc
```

> Redeploy edilmezse sunucu **eski kodu** çalıştırmaya devam eder: panelde
> yazdığın metin kaydedilir ama fonksiyon onu hiç okumaz. Sessiz kırılma —
> panelde "yayınlandı" görürsün, üretilen metin değişmez.
