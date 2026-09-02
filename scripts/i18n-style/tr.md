# TÜRKÇE REGISTER ANAYASASI — İhtimalsel Dil

> Karar: Emre, 2026-08-09. Plan: `.claude/plans/ihtimalsel-dil-devrimi.md`
> Bu belge hem **yazım** anayasasıdır (metni kim geçirirse geçirsin) hem de
> **denetçinin** (`scripts/ihtimalsel-denetci.mjs`) kural kaynağıdır.
> Dil dalgaları başladığında her `scripts/i18n-style/<lang>.md` bu belgeyi miras alır.

---

## 0 · TEK CÜMLE

**Uygulamanın bildiği kesindir; çıkardığı anlam ihtimalseldir.**

Wanderer bir insanın kalbini ölçemez. Saydığı günü, okuduğu cümleyi, basılan mührü
bilir — bunlar kesin konuşulur. Bunlardan çıkardığı anlam bir **yorumdur** ve yorumun
sahibi kullanıcıdır. Son sözü uygulama söylemez.

Bu, `.claude/plans/gerceklik-mimarisi.md`'nin dil katmanıdır: orada kanıtsız **sayı** yasaklandı,
burada kanıtsız **kesinlik**. Aynı tez: *Mesele Sensin.*

---

## 1 · AYRIM — hangi cümle hangi rejimde

Her cümlede tek soru: **bunu uygulama ölçtü mü, yoksa yorumladı mı?**

### 1.1 KESİN kalır — ölçüm, beyan, olgu

| Tür | Örnek | Neden |
|---|---|---|
| Sayılmış ölçüm | "Yedi gün üst üste geldin." | sayaç saydı |
| Kullanıcının beyanı | "Kendine güvenmediğini yazmıştın." | kullanıcı söyledi |
| Sistem olgusu | "Bu kart mühürlendi." · "Üç mesaj kaldı." | uygulama yaptı |
| Sistem kısıtı | "Olmak istediğin kişiyi tasarlamadan bu pencereden bakamazsın." | teknik gerçek |
| Kullanıcının kendi sözü | "Bugün sevdiğim birine teşekkür edeceğim." | taahhüt — bkz. §3.4 |

### 1.2 İHTİMALSEL olur — yorum, atıf, çıkarım, tahmin

| Tür | Önce | Sonra |
|---|---|---|
| Anlam atfı | "Bu zincir, iradenin kanıtı." | "Bu zincir, iradenin izi **olabilir**." |
| Tanı | "Kusursuzluk arayışın seni durduruyor." | "Kusursuzluk arayışın seni durduruyor **olabilir**." |
| Gelecek | "Burası seni gösterecek." | "Burası seni **gösterebilir**." |
| Buyruk | "Bu iki niteliği önce tek tek yaşamalısın." | "Bu iki niteliği önce tek tek **yaşayabilirsin**." |
| Genel yargı | "Sınır, kendine saygının haritasıdır." | *(kanon ise dokunulmaz — §3.1)* |

### 1.3 Karma cümle: ölçümü kes, yorumu yumuşat

Çoğu cümle ikisini birden taşır. Doğru hamle bölmektir, hepsini yumuşatmak değil.

> ✗ "Bütünlük bu hafta %{delta} yükselmiş olabilir. Meclis seni dinliyor olabilir."
> ✓ "Bütünlük bu hafta %{delta} yükseldi. Meclis seni dinliyor **olabilir**."

Ölçümü de ihtimalselleştirmek ikinci bir yalandır: ölçtüğün şeyden emin ol.

---

## 2 · KİP AİLESİ — tek ek değil, beş araç

`-ebilir` tek başına kullanılırsa 1.197 cümle aynı sesle biter ve metin robotlaşır.
Beş araç dönüşümlü kullanılır:

| # | Araç | Örnek |
|---|---|---|
| 1 | **-ebilir / -abilir** | "Bu, yorgunluğun sesi olabilir." |
| 2 | **Sıklık / derece** | "Bu kalıp çoğu zaman güvensizlikten beslenir." · "Sık sık…" |
| 3 | **Görünüş fiili** | "Buradan bakınca kaçınma gibi **görünüyor**." · "…gibi duruyor." |
| 4 | **Soru kipi** | "Bunun altında bir korku olabilir mi?" |
| 5 | **Koşul** | "Eğer bu tanıdık geliyorsa, kök burada olabilir." |

**Kural:** Aynı ekranda ardışık iki cümle aynı araçla bitmez. Bir paragrafta üçten
fazla `-ebilir` varsa 2/3/4/5'e dağıt.

**Sayısal ölçü (2026-08-11'de eklendi — ölçümle doğdu).** İlk geçiş dilimi bittiğinde
`15b` sayıldı: **120 `-ebilir` · 1 sıklık · 2 görünüş · 2 derece.** Tek araç %96 —
kural kağıtta vardı ama tutmadı, çünkü ölçüsü yoktu. Ölçü şudur:

> **Sert ölçü — ardışıklık:** aynı ailede (`sefer.*.task.*`, `premium.*.desc`,
> ardışık `notify.*`, boş-durum blokları) **arka arkaya üç madde aynı ekle bitmez**,
> ve **tek cümlede iki `-ebilir` bulunmaz**. Kullanıcı bunları alt alta görür;
> robotlaşma orada duyulur.
>
> **Yönlendirici hedef — global oran:** `-ebilir/-abilir` payı %70 civarında kalsın.
> *Bu bir kapı değil, bir pusuladır.* 2026-08-11 ölçümü: **227 / 287 = %79.**
> Hedefe zorla inmek, 26 cümleyi doğal olmayan araçlara itmek demekti — metnin
> kalitesi ölçünün süsü için feda edilmez. `-ebilir` Türkçede ihtimalselliğin en
> doğal taşıyıcısıdır; ceza değil, denge konusudur. Sayımı yine de yap ve rapora
> yaz — oran tırmanıyorsa (ör. %90) metin gerçekten düzleşiyor demektir:
> ```
> grep -oE "(ebilir|abilir)[a-zçğıöşü]*" <dosya> | wc -l
> grep -coE "çoğu zaman|sık sık|genelde|çoğunlukla" <dosya>
> grep -coE "gibi duruyor|görünüyor|olabilir mi" <dosya>
> grep -coE "daha az|kolay kolay|daha seyrek" <dosya>
> ```

**Aynı listede yan yana duran anahtarlar** (`premium.*.desc`, `sefer.*.task.*`,
boş-durum mesajları) tek blok sayılır: o blokta aynı ek arka arkaya gelmez. Kullanıcı
onları alt alta görür — sözlükteki mesafe ekranda mesafe değildir.

**Yasak — çifte yumuşatma:** "belki … olabilir gibi görünüyor" hantal ve güvensizdir.
Cümle başına **tek** ihtimalsellik işareti yeter.

**Yasak — olumsuz fiile ihtimal eki.** Türkçede olumsuz bir fiili ihtimalselleştirmek
anlamı **tersine çevirir**: "yıkılmazsın" → "yıkılmayabilirsin" kulağa *"belki
yıkılırsın"* gibi gelir; vaat güvence olmaktan çıkıp tehdide döner. İki doğru yol:

| Yanlış | Doğru | Yöntem |
|---|---|---|
| tüketmeyebilirsin | bir borç gibi taşımaktan **kurtulabilirsin** | olumlu fiile ihtimal |
| yıkılmayabilirsin | **kolay kolay** yıkılmazsın | derece aracı (§2.2) |
| sömürülmeyebilirsin | **daha az** sömürülürsün | derece aracı |
| dönüşmeyebilir | sertliğe kaymadan **durabilir** | olumlu fiile çevir |

**Yasak — sahte alçakgönüllülük:** "Yanılıyor olabilirim ama…", "Emin değilim ama…"
Bunlar Wanderer'ı tereddütlü gösterir. İhtimalsellik **tereddüt değil, saygıdır**:
iddiadan vazgeçmek değil, iddianın sahibini kullanıcıya bırakmak.

---

## 3 · MUAF — dokunulmayanlar

Muafiyet **kategoriktir** (aşağıdaki liste) veya **satır beyanlıdır**:
`/* IHTIMAL-MUAF: gerekçe */`. Gerekçesiz muafiyet de ihlaldir.

### 3.1 Kanon — verbatim
- **Ayetler** ve mealleri (`09b-depth-foundations.js` `ayet:`/`metin:` alanları,
  `12f1-hazine-icerik.js`, `16b` kartuş içi).
- **Manifesto 12 başlıkları** — `mr.item.*.title` ve `16b prompt.identity.core` içindeki
  12 ilke bloğu. ("Hak, Hukuk ve Adalet Her Toplumun Temelidir" olduğu gibi kalır.)
- **Kitap aforizmaları** — kart `lesson` satırları dâhil.
  ("Kusursuzluk, hiç bitirmemenin kibar adıdır." dokunulmaz.)
- **Tez cümleleri** — "Mesele Sensin", "HAYAT = O KİŞİ × O KİŞİNİN SEÇİMLERİ",
  Dönüşüm Zinciri ("Düşünce → İnanç → Duygu → Davranış → Sonuç").

> **Sınır (2026-08-11'de DÜZELTİLDİ).** Bu belge önce "başlık kanondur, `summary`
> uygulama metnidir" diyordu — **yanlıştı ve bir tur boyunca teze zarar verdi.**
> `mr.item.*.summary` Manifesto'nun 12 ilkesinin damıtılmış hâlidir, yani kitabın
> **tezidir**; protokol §6.3 tezin verbatim kalmasını emreder. Yumuşatıldığında ne
> olduğu görüldü:
>
> | | |
> |---|---|
> | ✗ oldu | "…her şeyin kaynağı dışarıda değil, içinde **olabilir**." |
> | ✓ olmalı | "…her şeyin kaynağı dışarıda değil, **içindedir**." |
>
> Tez bir gözlem değil, bir iddiadır — kitabın iddiası. İhtimalsel dil **uygulamanın**
> kullanıcı hakkındaki hükmünü yumuşatır, **kitabın** kendi tezini değil.
> `mr.item.*` ailesinin tamamı (title + summary) kanondur ve denetçide muaftır.

### 3.2 Hukuk
`13p2-hukuk-metin.js` — üç belge. Bağlayıcılık ihtimalsel dille zayıflar.

### 3.3 Güvenlik
- `16c-i18n-detect-dict.js` kriz kalıpları.
- Kriz yönlendirme metinleri: "Şu numarayı arayabilirsin" değil, **"Ara."**
  Bir insan kriz anındayken uygulamanın nezaketine değil netliğine ihtiyacı olur.

### 3.4 Kullanıcının kendi sözü
`gl.soz*` (36 anahtar), olumlamalar, taahhüt metinleri. Bunlar kullanıcının **ağzından**
çıkar; "edeceğim" → "edebilirim" taahhüdü çözer ve Hesap Günü mekaniğini kırar.
**Söz kesindir; söze davet ihtimalseldir:** "Bir söz verebilirsin." ✓ / "Bugün teşekkür
edeceğim." ✓ (ikisi de doğru, farklı ağızlardan).

### 3.5 Teknik hata mesajları
"Bağlantı kurulamadı." · "Kayıt başarısız." — kesin kalır; kullanıcı ne olduğunu
bilmelidir.

### 3.6 Buton / etiket / eylem adı
"Kaydet", "Mühürle", "Devam", "Geç". Bilgi vermez, eylemi adlandırır. Kapsam dışı.
Ölçü: değeri 25 karakterden kısa ve cümle değilse etikettir.

### 3.7 Kartın semptom listeleri
`dusunceler` / `inanclar` / `hisler` / `davranislar` — bunlar kullanıcının iç sesinin
aynasıdır, uygulamanın iddiası değil. "Ben yeterince iyi değilim" bir **semptomdur**;
"değil olabilirim" hem sahte hem etkisizdir. Dokunulmaz.

---

## 4 · KART REJİMLERİ (`12b2-deste-icerik.js`)

| Alan | Rejim |
|---|---|
| `olunca` | **ihtimalsel** — kullanıcıya "sen" der, geleceği hakkında vaat kurar |
| `portre` `gercek` | **kesin** — kartın 3. tekil tanımı ("…öğrenen kişidir"), kullanıcı hakkında iddia değil |
| `lesson` | **kanon** — verbatim (§3.1) |
| `dusunceler` `inanclar` `hisler` `davranislar` | **dokunulmaz** — semptom (§3.7) |
| `sub` `whisper` `name` `kok` | **dokunulmaz** — etiket / ad / kaynak atfı (§3.6) |
| `sahne` `id` `signals` `label` `recipe` | **metin değil / donuk sözleşme** — asla |

### 4.0 · Ayırt edici ölçü — cümle kime konuşuyor?

Kartta netleşen bu ölçü **her yüzeyde** geçerlidir ve §1'in tamamlayıcısıdır:

- Cümle **kullanıcıya "sen" diyorsa** → iddianın sahibi uygulamadır → **ihtimalsel**.
  ("Kendini en sona koymayı bırakırsın." → "…bırakabilirsin.")
- Cümle **bir kartı, kavramı ya da mekaniği tarif ediyorsa** → tanımdır → **kesin**.
  ("Zor anında kendini yalnız bırakmayan kişidir." — dokunma; tanımı
  belirsizleştirmek kartı çözer, ihtimalsel yapmaz.)

---

## 4.1 · GÖREV, RİTÜEL VE BİLDİRİM MADDELERİ

`sefer.*.task.*`, günlük ritüel adımları ve `notify.*` push metinleri buyruk kipiyle
yazılmıştı ("Sil.", "Başla.", "Cevabı yaz."). Bunlar kapsamdadır — ama liste
maddesinde "-ebilirsin" yığılması listeyi gevşetir ve okunmaz kılar. Üç araç:

| Kalıp | Örnek |
|---|---|
| **Davet** (tercih edilen) | "Geçen haftanın ertelenmişler listesini silebilirsin." |
| **Deneme çağrısı** | "'Kaçmasaydım ne olurdu?' sorusunu deneyebilirsin." |
| **Soru** | "Bugün bir başarını, kimseyle kıyaslamadan kutlayabilir misin?" |

Bir görev setinde (ör. `sefer.erteleme.task.1-14`) üç araç dönüşümlü kullanılır;
hepsi aynı formda bitmez (§2).

**Sınır:** kullanıcı bir görevi kendi sözü olarak üstlendiğinde (Söz Defteri'ne
yazıldığında) metin §3.4'e geçer ve kesinleşir — çağrı ihtimalsel, söz kesin.

---

## 4.2 · DENETÇİNİN KÖR NOKTASI — `prompt.identity.core`

Bu anahtar bir **template literal**dir; içine `/* IHTIMAL-MUAF */` satır beyanı
konamaz (yorum metnin parçası olur). Gövdesi karışıktır: Manifesto 12 ilkesi ve tez
cümleleri (kanon, §3.1) ile modele verilen davranış talimatları (K5) aynı string'de
yaşar. Denetçi bu yüzden anahtarın **tamamını** muaf sayar.

**Bedeli açıkça yazılıdır:** bu gövdenin register triyajı otomatik kapıyla değil,
**elle** yapılır (FAZ 6a). Özellikle "XI. KONUŞMA TARZI" bölümü bugün ihtimalsel dili
açıkça yasaklıyor ("'Belki' yerine 'Şunu düşünmeni istiyorum.'") — kapı orayı
göremez, insan gözü görmek zorundadır.

---

## 5 · İNGİLİZCE KARŞILIKLAR (`15e`, `16e`)

TR ile aynı turda, aynı ayrımla. Modal seçimi:

| TR | EN |
|---|---|
| -ebilir | **might** (yorum) · **can** (imkân) · **could** (olasılık) |
| görünüyor / gibi duruyor | **seems** · **looks like** |
| çoğu zaman | **often** · **tends to** |
| belki | **perhaps** (cümle başı, ölçülü) |

**Yasak:** modal yığma — "might possibly", "may perhaps", "could potentially".
**Yasak:** "I think / I believe" — Wanderer kendi kanısını değil, kullanıcının
ihtimalini konuşur.

---

## 6 · ÖLÇÜ — geçiş yaptıktan sonra oku

Bir dilim bitince şu üç sınavdan geçir:

1. **Ses sınavı:** ardışık üç cümleyi yüksek sesle oku. Aynı ekle bitiyorsa dağıt (§2).
2. **Güç sınavı:** cümle hâlâ bir şey söylüyor mu? "Belki bir şey olabilir gibi" bir
   şey söylemez. İhtimalsellik iddiayı **taşır**, silmez.
3. **Sahiplik sınavı:** cümlenin sonunda karar kimde? Kullanıcıda olmalı.

---

## 7 · HIZLI KARAR AĞACI

```
Değer bir cümle mi? (boşluklu, 25+ karakter)
├─ Hayır (buton/etiket/eylem adı) ──────────────→ DOKUNMA (§3.6)
└─ Evet
   ├─ Kanon mu? (ayet/Manifesto başlığı/aforizma/tez) → DOKUNMA (§3.1)
   ├─ Hukuk / kriz / hata mesajı mı? ───────────→ DOKUNMA (§3.2-3.5)
   ├─ Kullanıcının kendi ağzından mı? ──────────→ DOKUNMA (§3.4)
   ├─ Kart semptom listesi mi? ─────────────────→ DOKUNMA (§3.7)
   ├─ Görev/ritüel/bildirim maddesi mi? ────────→ DAVET KİPİ (§4.1)
   └─ Kalanı: ölçüm mü, yorum mu?
      ├─ Ölçüm/beyan/olgu ──────────────────────→ KESİN KALIR (§1.1)
      └─ Yorum/atıf/tahmin/buyruk ──────────────→ İHTİMALSEL (§1.2, araç §2)
```

---

## 8 · KALİBRE ÖRNEKLERİ (canlı kaynaktan)

| Anahtar | Önce | Sonra | Not |
|---|---|---|---|
| `kk.sentez.hint` | bu iki niteliği önce tek tek yaşamalısın | bu iki niteliği önce tek tek yaşayabilirsin | buyruk → imkân |
| `oik.design.present_verdict` | Bu kişi zaten var. Seçiminle fiziki âleme taşınıyor. | Bu kişi zaten var olabilir — seçiminle fiziki âleme taşınabilir. | çifte yorum, tek araç |
| `hayattaki_sen.no_data` | Birkaç gün Emre ile konuş — sonra burası seni gösterecek. | Birkaç gün Emre ile konuşabilirsin — sonra burası seni göstermeye başlayabilir. | emir + kesin gelecek |
| `mt.reis.up` | Bütünlük %{delta} yükseldi. Meclis seni dinliyor — yolda kal. | Bütünlük %{delta} yükseldi. Meclis seni dinliyor olabilir — yolda kalabilirsin. | ölçüm KESİN kaldı |
| `meclis.empty` | …yüzlerin burada belirmeye başlayacak. | …yüzlerin burada belirmeye başlayabilir. | kesin gelecek |
| `gl.soz.iliski.oz_sevgi.1` | Bugün sevdiğim birine içtenlikle teşekkür edeceğim. | *(değişmez)* | kullanıcının sözü §3.4 |
| `gor.window.empty_body` | …bu pencereden bakamazsın. | *(değişmez)* | sistem kısıtı §1.1 |
| `mr.item.10.title` | Hak, Hukuk ve Adalet Her Toplumun Temelidir | *(değişmez)* | Manifesto §3.1 |
