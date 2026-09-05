---
name: silinen-mekanizmanin-gerekcesi
description: Bir mekanizma koddan silindiğinde onu ANLATAN yorum da silinmelidir — kalan gerekçe, mekanizmanın kendisi kadar davet edicidir ve yorumları sökerek bakan kapılar tam orada kördür
type: gotcha
---

# Silinen mekanizmanın gerekçesi — kapının göremediği davet

Kaynak: 2026-09-05, İç Çalışma 09 · FAZ 10 turu · Opus öz-denetimi (§3.7).

FAZ 9'un denetimi doğru bir kırığı doğru biçimde kapatmıştı: `[KART]`/
`[NISAN]` sıyırması `window.aracEtiketCoz` köprüsüne bağlıydı, köprü boşsa
etiket ekranda kalıyordu; çözüm tüketicileri saf yaprağa (`13a1`) **statik**
bağlamak oldu ve garanti çalışma zamanından derleme zamanına taşındı. Köprü
silindi, kapı yazıldı (`tests/etiket-siyirma-kapisi.test.js`), kapı yeşil
bastı.

Bir sonraki tur şunu buldu: **köprü silinmişti, köprüyü anlatan yorum
silinmemişti** — `13a`, `10B` ve `12e`'de. Üstelik satır-değişimiyle
düzeltildikleri için cümleler **ortadan kesikti** ("13a boot'ta zaten
yükleniyor ve" → araya yeni satır → "(§5.2 …)"), ve iki cümle artık düpedüz
**yanlıştı**: *"10B ve 12e bu dosyayı STATİK import ETMEZ"* ve *"köprü
burada"*. `13a` ayrıca iki **ölü import** (`etiketCoz`, `etiketRegex`) ve
burada olmayan bir fonksiyonun sözleşmesini anlatan bir **yetim doküman
yorumu** taşıyordu.

**Why:** FAZ 9 denetiminin köprüyü silme gerekçesi tam olarak şuydu —
*"durması `window` yolunun hâlâ desteklendiğini ima eder ve bir sonraki
tüketiciyi o kırılgan yola davet ederdi."* O davet koddan kalktı, **yorumda
kaldı**. Bir sonraki geliştirici için ikisi arasında fark yoktur: ikisi de
"bu repoda bu yol böyle çözülür" der. Yani §5.2'nin *"Yorum = NEDEN"*
kuralı, NEDEN ortadan kalktığında yorumun da kalkmasını gerektirir — ama bu
hiçbir yerde ölçülmüyordu.

Ve kapı tam orada kördü: `etiket-siyirma-kapisi` iddialarını **yorumları
sökerek** kuruyor (`.replace(/\/\*[\s\S]*?\*\//g, '')`). Bu bilinçliydi —
dosyanın kendi başlığı köprünün adını anıyor. Sonuç: yalan, kapının
bakmadığı tek yerde yaşadı. Kapı yeşilken davet ayaktaydı.

**How to apply:**
1. Bir mekanizmayı silerken `grep -rn <mekanizmanın adı>` ile **yorumları
   da** tara. Ölü kod `grep` kanıtıyla ölür (§3.1); ölü *gerekçe* de öyle.
2. Yorumu satır değiştirerek düzeltme — **bloğu yeniden yaz**. Ortadan
   kesilmiş bir cümle bayat bir cümleden kötüdür: okuyan onu kendi
   zihninde tamamlar.
3. Bir kapı gürültüyü elemek için yorumları söküyorsa, o kapı **yorumdaki
   ihlali göremez**. Silinen bir adın kaynakta yorumda bile geçmemesi
   ölçülebilir bir kuraldır — §6.6'nın üçüncü basamağı: kural yoktu değil,
   ÖLÇÜLEMİYORDU. Bu turda ölçülür hâle getirildi (aynı dosyaya
   `it.each([...TUKETICILER, '13a'])` girdi, ham kaynağa bakıyor).
4. Sınıfın öteki yarısı — *içerik olarak* yanlışlaşan bir cümle ("STATİK
   import ETMEZ") — statik sınanamaz ve **yargıya bırakılanlar**a girer.

Bağlar: [[rapor-bayatligi]] (aynı kusurun rapor katmanındaki hâli — bir
teşhis, ettiği kırık kapandığında kendini güncellemez) · [[kapi-sessiz-gec]]
(kapının kendi kör noktasını adlandırma kuralı) · [[olu-kod-temizlikleri]].
