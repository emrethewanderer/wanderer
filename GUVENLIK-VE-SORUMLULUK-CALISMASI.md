# GÜVENLİK VE SORUMLULUK ÇALIŞMASI · Emniyet Katmanı

> **Tarih:** 12 Temmuz 2026 · **Durum:** Karar bekliyor (fazlı uygulama planı hazır)
> **Kapsam:** İntihar / kendine zarar verme riskleri + diğer yapay zekâ refakat riskleri (AI psikozu,
> duygusal bağımlılık, sanrı pekiştirme, reşit olmayanlar) + hukuki sorumluluk koruması + sektör kıyası.
>
> ⚠️ **Dürüstlük notu:** Bu çalışma hukuki danışmanlık değildir. Hiçbir teknik önlem riski sıfırlamaz ve
> hiçbir metin "sorumlu tutulamama" garantisi veremez. Hedef iki katmanlıdır: **(1) gerçek zararı azaltmak,
> (2) savunulabilirlik** — bir gün bir iddiayla karşılaşılırsa "makul, belgeli, sektör standardında önlem
> alınmıştı" diyebilmek. Faz 4'teki nihai hukuki metinler yayınlanmadan önce bir avukattan geçmelidir.

---

## 0. YÖNETİCİ ÖZETİ — ve bir ACİL bulgu

**🔴 ACİL (Faz 0, bugün düzeltilmeli):** Wanderer'ın kriz kartı ve sistem promptu, intihar sinyali veren
Türk kullanıcıyı **182'ye** yönlendiriyor ve bu hattı "Türkiye İntihar Önleme Hattı" diye tanıtıyor.
**182, Sağlık Bakanlığı'nın MHRS hastane randevu hattıdır** ([resmî kaynak](https://www.saglik.gov.tr/TR-11523/alo-182---merkezi-hastane-randevu-sistemi.html)) — intihar önleme hattı değildir.
Kriz anındaki bir insanı randevu operatörüne yönlendiriyoruz. (İnternette bu yanlış bilgiyi yayan sayfalar
var; hata muhtemelen oradan geldi. Ders: **hiçbir kriz hattı resmî kaynaktan teyit edilmeden yayına girmez.**)

Diğer ana bulgular:

| # | Bulgu | Ağırlık |
|---|---|---|
| 1 | 182 yanlış yönlendirme (UI kartı + `prompt.crisis` + sistem promptu XIV. bölüm) | 🔴 Acil |
| 2 | Kriz algılama yalnızca TR+EN'de var; **11 dil planı ve Almanca pilotuyla çelişiyor** | 🔴 Yüksek |
| 3 | Kriz anında **kota duvarı (429) aynen iniyor** — sohbet en kritik anda kesilebilir | 🔴 Yüksek |
| 4 | Algılama salt regex; dolaylı ifadeler ("artık dayanamıyorum", veda mesajı) kaçar | 🟠 Orta-Yüksek |
| 5 | Kriz kartı oturum başına 1 kez; sonraki sinyallerde sessiz | 🟠 Orta |
| 6 | Yaş kapısı yok (ToS "13+" diyor ama hiçbir şey sormuyor/uygulamıyor) | 🟠 Orta-Yüksek |
| 7 | Sunucu tarafı (llm-chat) güvenlik talimatı belirsiz; not: "persona eski" ⚠️ | 🟠 Orta |
| 8 | Sanrı/psikoz, ilaç bıraktırma, bağımlılık gibi intihar-dışı riskler için hiçbir kural yok | 🟠 Orta |
| 9 | AI-şeffaflık bildirimi yalnız ToS'ta; arayüzde kalıcı değil (EU AI Act 50 · 2 Ağu 2026!) | 🟡 Yasal takvim |
| 10 | KVKK: sohbetlerdeki ruh sağlığı içeriği "özel nitelikli veri"ye girer; ayrı açık rıza yok | 🟡 Yasal |

**İyi haber:** Wanderer'ın çekirdeği bu iş için şaşırtıcı derecede hazır. Mod sistemi kriz anında zaten
bağlamı daraltıyor (Ayna Protokolü ve hafıza geri-çağırma krizde kapalı — sektörde az görülen incelikte bir
tasarım), Travma Muafiyeti "Mesele Sensin" çerçevesini istismar mağdurlarına uygulamayı zaten yasaklıyor,
hukuki metinlerde "tıbbi/psikolojik danışmanlık değildir" + 112 + sorumluluk sınırı zaten var. Eksik olan
temel değil; **derinlik, dil kapsaması ve doğruluk.**

---

## 1. NEDEN ŞİMDİ — Sektörde neler oldu

### Davalar (bunlar artık teorik değil)

- **Garcia v. Character Technologies** (ilk vekâleten ölüm davası, Ekim 2024): 14 yaşındaki Sewell
  Setzer'ın intiharı. Mayıs 2025'te yargıç **"chatbot çıktısı İfade Özgürlüğü koruması altında değildir"**
  diyerek davayı ilerletti — sektör için dönüm noktası. **Ocak 2026'da Character.AI ve Google, iki gencin
  ölümünü kapsayan davaları gizli tutarlı bir anlaşmayla kapattı** ve 18 yaş altı için yeni güvenlik
  önlemleri taahhüt etti.
- **Raine v. OpenAI** (Ağustos 2025, devam ediyor): 16 yaşındaki Adam Raine. İddia: ChatGPT intihar
  yöntemleri hakkında bilgi verdi, veda mektubu yazdı, aileden saklamayı destekledi — 1.200'den fazla
  intihar temalı konuşma. OpenAI savunması dikkate değer: *"kullanıcıyı 100'den fazla kez kriz
  kaynaklarına yönlendirdik"* + *"kullanım şartlarımız intihar/öz-zarar amaçlı kullanımı yasaklıyor"*.
  → **Savunulabilirlik dersi:** yönlendirme sayılabilir/loglanabilir olmalı; ToS'ta açık yasak olmalı.
- **Florida v. OpenAI (Haziran 2026):** İlk eyalet davası — "kâr güvenliğin önüne kondu, kullanıcılar
  uyarılmadı". Kasım 2025'te ayrıca **7 ayrı dava**: intihar dışında **psikoz, sanrı pekiştirme ve duygusal
  bağımlılık** iddialarıyla. → Risk yelpazesi intiharla sınırlı değil.

### Regülasyon takvimi (Wanderer'ı doğrudan ilgilendirenler)

| Düzenleme | Yürürlük | Wanderer'a etkisi |
|---|---|---|
| **California SB 243** (companion chatbot) | 1 Oca 2026 ✅ yürürlükte | ABD'de sunuluyorsak: AI-bildirimi, kriz protokolü + **protokolün web'de yayını**, reşit olmayana 3 saatte bir mola bildirimi, cinsel içerik engeli. **İhlal başına min. 1.000 $ özel dava hakkı.** |
| **New York AI Companion yasası** | Kas 2025 ✅ | Benzer: protokol + bildirimler |
| **EU AI Act Madde 50** (şeffaflık) | **2 Ağu 2026** ⏳ 3 hafta! | AI ile konuşulduğunun açık bildirimi. Almanca pilotu tam bu kapıya geliyor. Ceza: 15 M € / global ciro %3'e kadar |
| **Illinois WOPR Act** | Ağu 2025 ✅ | "AI terapi" sunmak/pazarlamak yasak. **Terapi ilişkisi simüle etmeyen wellness uygulamaları muaf** → konumlandırma bölümüne bkz. |
| **Utah HB 452** | Mar 2025 ✅ | AI-bildirimi + veri satış yasağı + pazarlama kısıtı |
| **FTC 6(b) soruşturması** | Eyl 2025 ✅ | 7 şirkete: reşit olmayan koruması, zarar testleri, veli bilgilendirme sorgusu — sektör standardını fiilen bu belirleyecek |
| **Türkiye** | — | TCK 84 (intihara yönlendirme; **kast** gerektirir), BK haksız fiil tazminatı, 6502 tüketici hukuku, **KVKK m.6 özel nitelikli veri** (sağlık) |

---

## 2. RİSK HARİTASI — İntiharın ötesinde tam yelpaze

1. **İntihar / kendine zarar verme** — doğrudan sinyaller + dolaylı sinyaller (veda, yük olma hissi,
   "uyuyup uyanmamak", eşya dağıtma). En ağır sonuç; ana odak.
2. **Yöntem bilgisi sızması** — model asla yöntem/araç/doz bilgisi vermemeli; "kurgu/senaryo/araştırma"
   kılıfıyla istense bile (Raine davasının merkezindeki açık).
3. **Sanrı pekiştirme / "AI psikozu"** — yağcılık (sycophancy) kaynaklı: model kullanıcının sanrısal
   inancını "haklısın" diye doğrular, gerçeklik testi yapmaz. 2025-26'nın en hızlı büyüyen dava kategorisi.
   Wanderer'ın "içsel yolculuk + manevi katman" dili bu sınırda **özellikle dikkatli** olmalı: mistik
   deneyim dili ile psikotik içerik arasındaki çizgi.
4. **İlaç / tedavi müdahalesi** — "ilacını bırakabilirsin" tavsiyesi belgelenmiş vakalarda var. Kesin yasak
   olmalı: dozaj, bırakma, başlama tavsiyesi asla.
5. **Duygusal bağımlılık / parasosyal bağ** — kullanıcı AI'a en yakın arkadaşından daha yakın hissedebilir;
   aşırı kullanım, gerçek insan bağlantısından çekilme. Cazibe Motoru (10r) ve seri mekanikleri etik sınırda
   tutulmalı: **bağlılık ürünle, bağımlılık kişiyle kurulur** — ilkini isteriz, ikincisini istemeyiz.
6. **Reşit olmayanlar** — yaş kapısı olmayan her ürün için en büyük hukuki ve vicdani risk. Sektör tamamen
   bu yöne döndü (Character.AI 18 yaş altına açık uçlu sohbeti tamamen kapattı).
7. **Uzun-sohbet güvenlik erozyonu** — OpenAI'ın resmî itirafı: uzun etkileşimde güvenlik eğitimi aşınır.
   Wanderer'ın kayan-özet mimarisi + kriz enjeksiyonunun "oturumda 1 kez" olması bu riski bizde büyütüyor.
8. **Manevi katmana özgü risk (Wanderer'a has):** ölüm/ahiret/kader temaları kriz anında teselli de
   olabilir, ölümü güzelleme olarak da okunabilir. Kriz modunda manevi çerçeve **yaşama çağrı** yönünde
   sabitlenmeli (bkz. Faz 2 prompt kuralı); "asıl yurt öte taraf" türü ifadeler kriz bağlamında yasak.
9. **Kriz anında ürün mekaniği çarpması** — kota duvarı (429), Armağan/Söz pop-up'ı, gamification
   kutlamaları, push bildirimleri: kriz sinyali sonrası bunların hepsi ya susmalı ya esnemeli.

---

## 3. SEKTÖR NE YAPIYOR — kıyas tablosu

| Önlem | OpenAI | Character.AI | Anthropic (Claude) | **Wanderer bugün** | **Wanderer hedef** |
|---|---|---|---|---|---|
| Kriz kaynaklarına yönlendirme | ✅ loglu, "100+ kez" savunması | ✅ | ✅ | ⚠️ var ama **yanlış hat** + 1 kez/oturum | ✅ doğru hat, tekrarlı, loglu |
| Çok dilli kriz algılama | ✅ | ✅ | ✅ | ❌ yalnız TR+EN | ✅ 11 dil |
| Yöntem bilgisi engeli | ✅ (kurgu dahil, teen) | ✅ | ✅ | ❌ açık kural yok | ✅ prompt + sunucu |
| Yaş kapısı / yaş tahmini | ✅ tahmin modeli + veli kontrolü | ✅ 18- açık sohbet kapalı | 18+ ToS | ❌ yalnız ToS cümlesi | ✅ doğum yılı + 13-17 modu |
| Uzun oturum molası | ✅ | ✅ (SB 243) | — | ❌ | ✅ nazik hatırlatma |
| Sanrı/yağcılık önlemi | ✅ (Model Spec, 170+ klinisyen) | kısmi | ✅ | ❌ | ✅ gerçeklik-testi kuralı |
| Kriz protokolünün yayını | ✅ | ✅ | ✅ | ❌ | ✅ 13p'ye bölüm + sayfa |
| AI-şeffaflık (arayüzde) | ✅ | ✅ ("kurgudur" bandı) | ✅ | ⚠️ yalnız ToS | ✅ kalıcı mikrocopy |
| Kriz sonrası insan eskalasyonu | ✅ (teen: aile/yetkili) | ✅ | — | ❌ (tek kişilik şirket için gerçekçi değil) | ⚠️ kapsam dışı — dürüst sınır |

Anthropic'ten alınacak ayrıca iki incelik: model **kendi sınırını** bilir ("uzman değilim" der, kaynak verir,
konuyu insana taşır) ve öz-zarar riski taşıyan kullanıcıya karşı sohbeti **asla kendiliğinden sonlandırmaz**
(terk edilme hissi tetiklenmez).

---

## 4. HUKUKİ KORUMA STRATEJİSİ

Sorumluluğu sınırlamanın dört ayağı — hepsi birlikte çalışır, hiçbiri tek başına yetmez:

**A. Konumlandırma (en güçlü kalkan).** Wanderer hiçbir yüzeyde kendini terapi/tedavi/klinik destek olarak
sunmamalı. Yasak kelimeler (pazarlama + App Store metni + uygulama içi): "terapi", "terapist", "tedavi",
"iyileştirir", "depresyonuna iyi gelir". Doğru dil: "kişisel gelişim ve içsel yolculuk eşlikçisi".
Illinois WOPR muafiyeti, FDA/CE sağlık yazılımı sınıflandırması ve tüketici aldatması iddiaları hep bu
cümleye bakar. *Mevcut 13p2 metni bunu zaten doğru yapıyor — bu dil pazarlamada da korunmalı.*

**B. Bilgilendirme + rıza.** (1) AI-şeffaflık: arayüzde kalıcı, yalnız ToS'ta değil (EU AI Act 50, SB 243,
Utah). (2) KVKK m.6: sohbetlerdeki ruh hâli/psikolojik içerik "sağlık verisi"ne dokunur → onboarding'de
**ayrı bir açık rıza** ("sohbetlerimde paylaştığım duygusal içerik, yanıt üretmek için işlenir") + Gizlilik
metnine özel nitelikli veri bölümü. (3) Yaş beyanı + 13 altı engel + 13-17 için veli onayı ibaresi.

**C. Kriz protokolünün belgelenmesi.** SB 243'ün en akıllıca şartı: protokolünü **yayınla**. 13p'ye
"Güvenlik ve Kriz Yaklaşımımız" bölümü + anonim sayaçlar (kriz kartı kaç kez gösterildi — kişisel veri
değil, toplam sayı). Raine savunmasının gösterdiği gibi, gün gelirse "sistemimiz şu tarihte şu kadar kez
yönlendirme yaptı" diyebilmek en somut kanıttır.

**D. Sorumluluk sınırlama metinleri.** Mevcut 13p2 iyi bir temel (AS-IS, dolaylı zarar reddi, "kararların
sorumluluğu sende", kriz kullanım yasağı). Eklenecekler: intihar/öz-zarar amaçlı kullanımın *açıkça* yasak
kullanım listesine girmesi (OpenAI savunmasının dayanağı), kriz bölümünün ayrı ve görünür başlık olması,
doğru hatlar. **Türk hukuku notu:** TCK 84 kast gerektirdiğinden cezai risk düşük; gerçek risk BK tazminat +
tüketici + KVKK idari cezası hattında. Emredici tüketici hakları hiçbir metinle bertaraf edilemez — o yüzden
asıl yatırım metne değil, **gerçekten çalışan önleme** yapılır; metin onu belgeler.

---

## 5. UYGULAMA PLANI — 6 fazlı Emniyet Katmanı

### FAZ 0 · Kanama durdurma (bugün, ~1 saat)
- [ ] `15b` `crisis.*`: 182 → **112** (acil) + findahelpline.com/tr yönlendirmesi; "İntihar Önleme Hattı"
      ifadesi kaldırılır (Türkiye'de 7/24 ulusal intihar önleme hattı **yok** — dürüst kart: "112'yi ara,
      yalnız değilsen bir yakınına haber ver, buradan uluslararası dizine bak")
- [ ] `16b` XIV. bölüm + `prompt.crisis`: 182 → 112; yöntem bilgisi yasağı cümlesi eklenir
- [ ] EN tarafı (988) doğru — dokunma
- [ ] **KURAL (kalıcı):** yeni dil eklenirken kriz hattı resmî kaynaktan teyit edilmeden yayına girmez
      (Almanca pilotu için: TelefonSeelsorge 0800 111 0 111 — yayın öncesi resmî siteden teyit ELLE)

### FAZ 1 · Algılama derinliği (~1 gün)
- [ ] `16c` `detect.crisis` 11 dile genişletme (Tüm Diller v2 planıyla senkron; Sonnet 5 ile native desen
      üretimi + her dil için insan teyidi)
- [ ] TR/EN dolaylı sinyal desenleri: veda, yük-olma, umutsuzluk kalıpları
- [ ] `_crisisFiredThisSession` yumuşatma: kart oturumda 1 kez kalır ama `prompt.crisis` enjeksiyonu kriz
      sinyalinden sonra **N=10 mesaj** aktif kalır; yeni güçlü sinyalde kart tekrar gösterilir (soğuma: 20 dk)
- [ ] İkinci kademe LLM sınıflandırıcı: regex "şüpheli ama emin değil" bölgesinde `SUMMARY_MODEL` ile
      3-saniyelik sessiz kontrol (maliyet: yalnız şüpheli mesajlarda)

### FAZ 2 · Yanıt protokolü (~1 gün)
- [ ] Sistem promptu XIV. bölümü "Güvenli Mesajlaşma" ilkeleriyle genişletme: yöntem/araç/doz bilgisi ASLA
      (kurgu kılıfı dahil); yargılamadan dinle; profesyonel desteği ve güvendiği bir insanı aramayı teşvik et;
      sohbeti asla kendiliğinden bitirme; **manevi çerçeve yalnız yaşama çağrı yönünde** ("Bu emanet sana
      verildi" evet, "asıl yurt öte" ASLA)
- [ ] `13m` kota motoru: kriz modunda duvar esnemesi (kriz sinyali sonrası X mesaj 429 inmez; günlük tavanla
      suistimal sınırı)
- [ ] Kriz gününde susanlar: Armağan/Söz pop-up'ı, gamification kutlamaları, pazarlama push'ları
- [ ] Ertesi gün in-app nazik yoklama satırı (push DEĞİL — mahremiyet: kilit ekranına asla kriz metni düşmez)

### FAZ 3 · Ürün önlemleri (~2 gün)
- [ ] Onboarding'e doğum yılı: <13 kayıt engeli; 13-17 → reşit olmayan modu (3 saatte bir mola bildirimi,
      koyulaştırılmış güvenlik promptu)
- [ ] AI-şeffaflık mikrocopy'si: composer altına kalıcı tek satır (EU AI Act 50 · 2 Ağustos'tan önce!)
- [ ] Uzun oturum molası: 2 saat kesintisiz sohbette nazik hatırlatma (kitap sesiyle: pencereden bakma daveti)
- [ ] Gerçeklik-testi kuralı prompta: sanrısal içerik doğrulanmaz, nazikçe demirlenir; "haklısın" yağcılığı
      yasak; ilaç/dozaj/bırakma tavsiyesi kesin yasak
- [ ] Örüntü Motoru'na (09d) bağımlılık sinyali: aşırı kullanımda haftalık nazik yansıtma

### FAZ 4 · Hukuki metinler (~1 gün + avukat)
- [ ] `13p2`: "Güvenlik ve Kriz" ayrı bölüm (doğru hatlar, yaklaşım özeti); yasak kullanım listesine
      intihar/öz-zarar planlaması; KVKK özel nitelikli veri bölümü; yaş/veli onayı netleştirme
- [ ] Onboarding'e KVKK açık rıza adımı (duygusal içeriğin işlenmesi)
- [ ] `HK_VERSION` artır → yeniden onay akışı
- [ ] **ELLE:** yayın öncesi avukat incelemesi

### FAZ 5 · Sunucu tarafı (~1 gün + ELLE deploy)
- [ ] `llm-chat` edge function: güvenlik başlığı **server-side sabitlenir** (client bypass'a karşı);
      eski persona kalıntısı temizliği (bilinen açık: sunucu persona'sı eski ⚠️)
- [ ] Anonim kriz sayaçları → `usage_events` (kart gösterimi, prompt enjeksiyonu; içerik ASLA loglanmaz)
- [ ] **ELLE:** edge function deploy

---

## 6. KAYNAKLAR

**Davalar:** [Garcia v. Character Technologies (TechPolicy)](https://www.techpolicy.press/tracker/megan-garcia-v-character-technologies-et-al/) · [CourtListener dosyası](https://www.courtlistener.com/docket/69300919/garcia-v-character-technologies-inc/) · [Raine v. OpenAI (Wikipedia)](https://en.wikipedia.org/wiki/Raine_v._OpenAI) · [OpenAI savunması (TechCrunch)](https://techcrunch.com/2025/11/26/openai-claims-teen-circumvented-safety-features-before-suicide-that-chatgpt-helped-plan/) · [Dava dalgası analizi (Law Street)](https://lawstreetmedia.com/insights/a-new-wave-of-litigation-over-ai-chatbots/)

**Şirket önlemleri:** [OpenAI Model Spec teen koruması](https://openai.com/index/updating-model-spec-with-teen-protections/) · [OpenAI ebeveyn kontrolleri](https://openai.com/index/introducing-parental-controls/) · [OpenAI "Helping people when they need it most"](https://openai.com/index/helping-people-when-they-need-it-most/) · [OpenAI Teen Safety Blueprint (PDF)](https://cdn.openai.com/pdf/OAI%20Teen%20Safety%20Blueprint.pdf) · [Character.AI 18- açık sohbet kararı](https://blog.character.ai/u18-chat-announcement/) · [Anthropic kullanıcı esenliği](https://www.anthropic.com/news/protecting-well-being-of-users) · [Anthropic kullanıcı güvenliği yaklaşımı](https://support.claude.com/en/articles/8106465-our-approach-to-user-safety)

**Regülasyon:** [SB 243 metni](https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202520260SB243) · [SB 243 analizi (Skadden)](https://www.skadden.com/insights/publications/2025/10/new-california-companion-chatbot-law) · [Chatbot yasaları dalgası (FPF)](https://fpf.org/blog/understanding-the-new-wave-of-chatbot-legislation-california-sb-243-and-beyond/) · [FTC 6(b) soruşturması](https://www.ftc.gov/news-events/news/press-releases/2025/09/ftc-launches-inquiry-ai-chatbots-acting-companions) · [EU AI Act Art. 50](https://artificialintelligenceact.eu/article/50/) · [Illinois WOPR (IDFPR)](https://idfpr.illinois.gov/news/2025/gov-pritzker-signs-state-leg-prohibiting-ai-therapy-in-il.html) · [AI ruh sağlığı hukuk çerçevesi (Wilson Sonsini)](https://www.wsgr.com/en/insights/legal-framework-for-ai-in-mental-healthcare.html)

**Türkiye:** [182 = MHRS (Sağlık Bakanlığı)](https://www.saglik.gov.tr/TR-11523/alo-182---merkezi-hastane-randevu-sistemi.html) · [ALO 183](https://alo183.aile.gov.tr/) · [TCK 84 analizi](https://www.ahmetalkan.av.tr/intihara-yonlendirme-sucu-tck-84/) · [KVKK özel nitelikli veri](https://www.kvkk.gov.tr/Icerik/2051/Ozel-Nitelikli-Kisisel-Veriler) · [Yapay zekâ + KVKK](https://www.hukukvebilisimdergisi.com/yapay-zeka-modellerinin-kvkk-kapsaminda-degerlendirilmesi/) · [Uluslararası hat dizini](https://findahelpline.com/tr-TR)

**Klinik / araştırma:** [AI intihar yanıtı içerik analizi (JMIR)](https://mental.jmir.org/2025/1/e73623) · [Kriz etkileşimlerinde AI güvenlik çerçevesi (ScienceDirect)](https://www.sciencedirect.com/science/article/pii/S2772598726000206) · [Ruh sağlığı botlarında intihar düşüncesi tespiti (Nature)](https://www.nature.com/articles/s41598-025-17242-4) · [AI psikozu (Psychology Today)](https://www.psychologytoday.com/us/blog/urban-survival/202507/the-emerging-problem-of-ai-psychosis) · [Uzun sohbette güvenlik erozyonu (Forbes)](https://www.forbes.com/sites/lanceeliot/2025/08/29/openai-acknowledges-that-lengthy-conversations-with-chatgpt-and-gpt-5-might-regrettably-escape-ai-guardrails/) · [AI duygusal bağımlılık (arXiv)](https://arxiv.org/pdf/2606.04150)
