---
name: turkce-i-regex-korlugu
description: JS'in /i bayrağı Türkçe büyük I'yı ı'ya değil i'ye indirir; ı/ş/ğ içeren bir desen BÜYÜK harfli Türkçe girdiyi sessizce kaçırır — repoda 733 desen bu sınıfta ve düzeltme toLocaleLowerCase('tr') ile normalize etmektir
type: gotcha
---

# `/i` bayrağı Türkçe bilmez — büyük harfli girdi sessizce kaçar

Kaynak: 2026-09-03, Opus öz-denetiminin (§3.7) ilk koşusu, kod ekseni.
`.claude/plans/opus-oz-denetimi.md` FAZ 3'te bir kapı yazılırken bulundu.

JavaScript'in `/i` bayrağı Unicode **basit** harf katlaması kullanır. Türkçe'de
`I` (U+0049) küçük hâli `ı`dır (U+0131); Unicode ise onu `i`ye (U+0069) katlar.
Sonuç: deseninde `ı`, `ş` ya da `ğ` geçen her `/…/i` regex'i, BÜYÜK harfle
yazılmış aynı metni **görmez**.

Ölçülmüş kanıt:

    /kapanış/i.test('KAPANIŞ')            → false
    'KAPANIŞ'.toLowerCase()               → 'kapaniş'   (i noktalı — yanlış)
    'KAPANIŞ'.toLocaleLowerCase('tr')     → 'kapanış'   (doğru)

    /buna\s+alış(kın|tım)/i.test('BUNA ALIŞKINIM')  → false
    /sınırım\s+bu/i.test('SINIRIM BU')              → false
    /sınırım\s+bu/i.test('SINIRIM BU'.toLocaleLowerCase('tr')) → true

**Why:** Bu, kırılan değil **körleşen** bir kapıdır — hata basmaz, eksik
eşleşir ([[kapi-sessiz-gec]]). Kullanıcı derdini büyük harfle yazdığında
sinyal motoru onu duymaz ve uygulama "sinyal yok" sanır; hiçbir test kırmızıya
dönmez, çünkü testler küçük harfli örneklerle yazılmıştır. Wanderer'ın tezi
açısından bedeli ağırdır: kullanıcının kendi cümlesi ölçüme girmez, yani
uygulama kullanıcı hakkında **eksik kanıtla** konuşur (§6.10).

**Yayılım ölçüldü (2026-09-03):** `js/`, `scripts/`, `tests/` altında `ı/ş/ğ`
içeren **733** adet `/…/i` deseni var. En yoğun üçü:

| Dosya | Desen |
|---|---|
| `js/parts/09b-depth-foundations.js` | 251 |
| `js/parts/16c-i18n-detect-dict.js` | 224 |
| `js/parts/09a-personalization-engine.js` | 73 |

`09b-depth-foundations.js` bu desenleri **ham metne** uygular
(`r.test(text)`, satır 390–428, 740–890) ve dosyada tek bir küçültme çağrısı
yoktur — yani orada kırık teoride değil pratikte açıktır. 733 rakamı ihlal
sayısı DEĞİL, incelenecek yüzeydir: girdisini önceden normalize eden çağrı
noktaları temizdir.

## How to apply

- Türkçe metne desen uygularken **`/i`ye güvenme**. Girdiyi önce normalize et:
  `String(x).toLocaleLowerCase('tr')` — repo bu deyimi zaten yirmiden fazla
  yerde kullanıyor (`js/parts/12d-kart-uretim.js:158`,
  `js/parts/09a-personalization-engine.js:1210`, `js/parts/10B-ilham-karti.js:109`).
- **Elle harf haritası yazma.** İlk düzeltme denemesi yedi harfi tek tek
  çeviren bir `trKucult()` fonksiyonuydu; o, var olan motorun ikiziydi (§1.3)
  ve öz-denetimin kod ekseni onu yakaladı. Tek satırlık deyim yeter.
- Yeni bir Türkçe desen yazdığında sınavını **BÜYÜK harfli girdiyle de** yaz.
  Küçük harfli tek örnek, bu sınıfın hiçbir vakasını yakalamaz.
- `toLowerCase()` (locale'siz) Türkçe metinde **yanlıştır** — `I`yı `i` yapar.
  `toUpperCase()` de simetrik olarak `i`yi `I` yapar, `İ` değil.

**Açık borç (bu turda kapatılmadı):** 733 desenin hangilerinin gerçekten ham
metne uygulandığı taranmadı; yalnız `09b` örneklem olarak doğrulandı. Bu bir
sonraki sprintin işidir ve ölçülebilir olduğu için **kapıya bağlanabilir**:
girdisi normalize edilmemiş `/…/i` desenlerini bulan bir denetçi, `TASARIM`
ve `KOKEN` denetçileriyle aynı kalıpta yazılabilir (§6.6: kapısı olmayan
kural tavsiyeye döner).

İlgili: [[kapi-sessiz-gec]] (boş sonuç temiz sonuç değildir — aynı aile) ·
[[buyuk-harf-dil-kapisi]] (dilin büyük-harf yüzeyi) ·
`.claude/plans/opus-oz-denetimi.md` (bulgunun doğduğu sprint)
