# MEMORY — Hafıza İndeksi

Her satır bir hafıza dosyasına işaret eder (`.claude/memories/<ad>.md`).
İndeks özet, dosya gerçektir: görevin alanına değen satırı görünce dosyayı AÇ.

> **Not — bu indeksin tarihçesi.** 2026-09-02'de genel denetim turunda
> yeniden başlatıldı: repo snapshot'ında `MEMORY.md` ve `.claude/memories/`
> yoktu ([[claude-altyapisi-commit-disi]]). Geriye 23 hedefsiz `[[bağ]]` kaldı
> ve `tests/referans-butunlugu.test.js` bu borcu TABAN'da dondurdu.
>
> **Borç 2026-09-03'te kapatıldı** (`.claude/plans/hafiza-borcu-odemesi.md`):
> 23 dosyanın hepsi **bugünkü koddan yeniden keşifle** yazıldı — özgün
> metinlerin kurtarılmış hâli DEĞİLler ve her biri bunu kendi tepesinde
> beyan eder. Emre'nin kararı buydu: *"entelektüel mülkümü istemeyen teknik
> işler ise orijinalinden daha iyi yapmana salık veririm."* Elde özgün bir
> dosya varsa yine de eklenmelidir — koddan okunamayan tarihsel ayrıntıyı
> yalnız o taşır.

## Kapılar ve denetçiler
- [[xss-kapisi]] — XSS yüzey denetçisi ifade-bazlıdır ve HTML üreten HER
  template'i tarar; kaçış tek kaynağı `escapeHTML`, taban `scripts/xss-taban.json`
- [[kapi-tarama-yarisi]] — `js/` gezen denetçiler tasarım kapısının T7 geçici
  dosyası yüzünden ENOENT ile çökebilir; okuma yarışa dayanıklı yazılır
- [[kapi-sessiz-gec]] — bir kapı kırığı değil kırığı GÖRME YETENEĞİNİ
  kaybettiğinde de kırmızı yanmalı: boş bulgu listesi "temiz" demek değil
  (tsc TS18003 exit 0 ile gelir); sınır ölçülerek çizilir
- [[kapi-cifte-kosu]] — kapı workflow'u push+pull_request ile aynı ağacı
  iki kez sınıyordu; "ikisi farklı ağaçtır" gerekçesi beş PR'de de yanlış
  çıktı — tetik sökülmedi, gerekçe her koşuda ölçülür oldu
- [[olu-kod-temizlikleri]] — ekran/özellik silmeden önce dört sözleşme
  yüzeyini (window köprüsü, DOM id, storage anahtarı, i18n anahtarı) tara;
  tarihsel KORUNANLAR listesi kayıp, dosya onun yerine prosedür yazar
- [[bagsiz-ad-kapisi]] — vite'ın IIFE build'i modülleri tek scope'a
  düzleştirdiği için build'in kendisi yakalamadığı "bundle'da çalışan,
  kaynakta olmayan ad" sınıfını `tsc` scope analiziyle yakalar; sınırı
  `window.foo?.()` köprülerini görmemesi, onu kardeş denetçi sorar
- [[yetim-kopru-denetcisi]] — `scripts/yetim-kopru-denetci.mjs` "sessizce
  hiçbir şey yapmayan çağrı" sınıfının bekçisi: karşılıksız `window.foo?.()`
  köprüsü + bare `foo()` çağrısı. Üçüncü sınıf (bare identifier OKUMA)
  kapsamı DIŞINDA — kardeş denetçi [[bagsiz-ad-kapisi]] onu sorar
- [[buyuk-harf-dil-kapisi]] — `tr-TR` locale'i küçük "i"yi noktalı "İ"ye
  çevirir; sabit locale yazılan her yerde EN arayüzde "THİS PATH" doğar. JS
  kolu `localeUpper()` (dili `S._currentLang`'tan okur), CSS kolu
  `text-transform`un kaynağı elementin `lang`idir — sabit dilli panel kabına
  kendi `lang`ini verir (13q emsali)

## Konvansiyonlar ve göçler
- [[ad-senkronu-kurali]] — §4.3'ün uygulamadaki izi: üç tamamlanmış ad göçü
  (Portrem · Geçiş Kartım · İlham Kartı), storage geri-okuma katmanları,
  42P01 tablo düşüş zinciri ve bilinçli olarak senkronlanmayan legacy adlar.
  **Tuzak:** kodun andığı `mig 039` diye bir dosya yok — 001–040 arası kırk
  migration 2026-07-25'te `000_wanderer_schema.sql` §2'de birleştirildi

## Ortam / altyapı
- [[dogrulama-tarayicisi]] — kapının üçüncü adımı (canlı DOM + konsol) araçtan
  repoya taşındı: `scripts/dogrula.mjs` (Playwright) her iki ortamda da koşar,
  üç kovayla yargılar (ihlal / dış origin / gürültü) ve "Konsol temiz."i çıkış
  koduyla kanıtlar; "preview yok" artık kapıyı atlamanın gerekçesi değil
- [[claude-altyapisi-commit-disi]] — `.claude/` altındaki çalışma altyapısı
  (ajanlar, hafızalar, kancalar, launch girdileri) aylarca yalnız lokal
  makinede kalmış, repoya hiç girmemişti; uzak oturum klondan kurar, commit
  edilmemiş olan YOKTUR — uzak oturumda devir denenemez bile
- [[artifact-galerisi]] — İç Çalışma Atlası ve 18 oda raporu claude.ai
  galerisinde yaşar, ne diskte ne repoda; kaybolmuş görünmelerinin sebebi
  iki odanın numarasız adla yayımlanmış olmasıydı — adres tablosu
  `.claude/artifacts.md`
- [[rapor-bayatligi]] — bir rapor bitmiş işi "yapılacak" gösterdiğinde
  ölçüm boşluğundan daha sinsi bir kusur üretir: okuyanı yapılmış işi
  yeniden yapmaya çağırır; oda 02 ve 08 tam bunu yapıyordu — durum satırı
  koda karşı grep'lenmeden okunmaz, kod yorumları rapordan güncel olabilir

## Motorlar ve tuzaklar
- [[turkce-i-regex-korlugu]] — JS'in `/i` bayrağı Türkçe büyük `I`yı `ı`ya
  değil `i`ye indirir; `ı/ş/ğ` içeren desen BÜYÜK harfli girdiyi sessizce
  kaçırır. Yayılım yedi yüz mertebesinde (yöntemden yönteme 636–733); en
  yoğunu `09b-depth-foundations.js`. Çözüm `toLocaleLowerCase('tr')`.
- [[boot-nabzi]] — boot'un darboğazı bundle boyutu DEĞİL sıralı ağ turlarıdır
  (kayıtlı zincir 1331→905 ms); `iife`+`inlineDynamicImports` yüzünden dinamik
  import byte kazandırmaz, ağ turu kazandırır. Motor `js/parts/00h-boot-nabzi.js`
  (saf yaprak, idempotent DEĞİL, asla bloklamaz), paralellik sözleşmesi
  `tests/boot-nabzi.test.js` ile kilitli. **Koddan yeniden keşifle yazıldı** —
  özgün dosya repoya hiç girmemişti, ham ölçüm oturumu kayıp
- [[guvenlik-emniyet-katmani]] — kriz tespiti tek kaynaktır (13-extras
  `detectCrisis`) ve window köprüsünden okunur; `getCrisisContext` bir dönem
  hiç bağlanmayıp kriz enjeksiyonunu SESSİZCE ölü bıraktı. Köprü bugün
  13-extras'ın kendi expose bloğunda DEĞİL, `main.js:541`'in toplu
  `Object.assign`'ında — asimetrinin kendisi tuzak
- [[odev-zinciri-ve-cipi]] — ödev zinciri iki ayrı yerden sessizce koptu:
  çipi bağsız bir ad (`typeof … === 'undefined'` guard'ı hep doğru dönüyordu),
  defteri hiç yazılmamış bir getter kesti; motor yıllarca canlıydı, ekran boştu
- [[safestorage-kuyruk-flush-kilidi]] — yazım kuyruğu tek `_flushQueue()`
  kilidiyle korunur (`_flushing`/`_flushPending`); kilit olmadan eşzamanlı
  flush aynı item'ı iki kez deniyor ve retry bütçesini erken tüketiyordu.
  Tanışma kapısının yarıda kesilip ikinci `storageInit` turunu başlatması
  bu kilidin tam da neden var olduğu senaryodur
- [[safestorage-testlerde-kvcache]] — SafeStorage senkron okuma/yazma için
  bellek-içi `_kvCache` (Map) tutar; `localStorage.clear()` ona DOKUNMAZ —
  aynı test dosyasındaki `it()`ler arasında sızan state'in kaynağı budur,
  çare anahtarı elle `SafeStorage.remove` etmektir
- [[test-kirilganligi-jsdom-stil-isinmasi]] — jsdom'un devasa bir stil
  bloğunu ilk kez çözümlemesi pahalıdır; maliyet testin ilk gerçek
  çağrısında ödenirse yük altında zaman aşımına düşer. Çare `beforeAll`da
  AYRI ve YÜKSEK bir timeout'la önceden ısıtmaktır
- [[yerel-tarih-anahtari]] — `localISODate()` yerel saat diliminde
  `YYYY-MM-DD` üretir; `toISOString().slice(0,10)` UTC'dir ve TR'de gece
  yarısı ile 03:00 arası bir ÖNCEKİ günü verir — gün anahtarı
  karşılaştırmaları ve testler bu farktan kırılır
- [[kisilerim-kart-motoru]] — 12b deste kaynağına modül-10 ailesinin erken
  yüklenen üyeleri bilerek DİNAMİK import'la bağlanır: statik bir kenar
  eklemek rollup çıktı sırasını kaydırıp TDZ açabilir
- [[belge-katmani-doc-primitifleri]] — `css/parts/document.css`in `.doc-*`
  ailesi editoryal yüzeylerin tek dili; `.wn-reveal` motoru `.doc-section`ı
  otomatik kapsar, `.doc-rise` KAPSAYICIYA `.doc-section` İÇ BÖLÜMLERE takılır
- [[i18n-bundle-bolme]] — dış dil sözlükleri ana bundle'a girmez (sidecar);
  `ensureLangDict()` yükler, `_tCache`i boşaltır ve `applyTranslations()` ile
  DOM'u YENİDEN boyar — cache temizliği ya da re-apply atlanırsa ekran
  kalıcı TR kalır
- [[tr-en-i18n-tamamlama]] — EN paritesinin imza tuzağı DİL DONMASIDIR:
  metin modül yükünde çözülürse dil o anki değerde donar (iskelet sabit,
  metin render anında `t()`'den). İkinci tuzak kelime taşıyan hata mesajı
  anahtarları, üçüncüsü `%85` ↔ `85%` gibi dil-farkları
- [[llm-bicimleri-geri-sizar]] — uygulamanın modele gönderdiği biçimler
  (meta etiketi, filigran satırı) modelin ÇIKTISINA geri sızar: model onları
  taklit eder ve Türkçeleştirir. Sıyırma Unicode olmalı, TANIMA ASCII
  sözleşmede kalmalı, ve iki ikiz regex aynı omurgayı taşımalı
- [[tanima-motoru]] — 09d Örüntü Motoru + 09i Seçici ikilisinin proje adı;
  amaç fonksiyonu P(kalır) değil **P(tanındı)** ve motor hiçbir şey İCAT
  ETMEZ, var olan kanıtı sıralar (kanıtsız aday doğmaz). Fazlarını tanımlayan
  plan belgesi repoda YOK
- [[sohbet-reasoning-fix]] — reasoning modelinin doğal gecikmesi ~25 sn
  (kayıt); eski 22 sn'lik timeout "bazen" değil HER turda fallback'e
  düşürüyordu. Sınır 45 sn; tasarım kurulamazsa FALLBACK YOK — `null` döner
  ve kullanıcı hiçbir şey görmez (§6.2)

## Ürün kararları
- [[olus-muhru-2-muhru-sen-basarsin]] — "Wanderer kart DAĞITAMAZ, kullanıcı
  kartını belirler": kazanımın tek kapısı beyandır (`kkMuhurle`), mührü
  kullanıcı basar, elini çekerse hiçbir şey yazılmaz. Aynı karar söz
  töreninde de geçerli (madde otomatik söze yazılmaz)
- [[olunan-ve-niyet-alinan-karari]] — bir kart ya OLUNANdır (kazanılmış →
  altın → Portre 2.0) ya NİYET ALINANdır (hedef mührü → lapis → OİK); geçiş
  tek yönlüdür ve SIRASI kritiktir: `porAbsorbCard`, hedeflerden silmeden
  ÖNCE koşar, yoksa `oikCardRefs()` bir an boşalır
- [[kisi-kartlari]] — özel tablo mu KV mi? Ölçü verinin kart başına mı bütün
  hâlinde mi okunduğudur (12f Hazine karşı örnektir); yeni kolon eklerken
  42703 kademeli düşüş zinciri kopyalanır — migration uygulanmadan da
  uygulama çalışır
- [[ilham-kartlari-sosyal-feed]] — "İlham Kartı" ayrı sınıfı 2026-06-21'de
  Geçiş Kartım omurgasına gömüldü ama ad üç katmanda yaşıyor (modül 10B, DB
  tablosu, enum `kind:'ilham'`) — `grep "ilham"` bu yüzden yanıltır
- [[ihtimalsel-dil-devrimi]] — ölçüm/beyan kesin dilde, YORUM ihtimalsel
  dilde; kapısı `scripts/ihtimalsel-denetci.mjs` + `tests/ihtimalsel-dil-kapisi`
  ve tabanı sıfırlanmış (sert kapı). Dikkat: belge "beş sözlük" diyor, koşucu
  ÜÇ tarıyor — prompt sözlükleri kapının dışında
- [[kod-kapisi-ve-posta]] — eşikte adres hem anahtar hem adrestir: e-posta+kod
  şifre istemez ve aynı hamlede DOĞRULANMIŞ posta adresi kazandırır ("tek
  adres, tek gerçek"); Magic Link şablonu `{{ .Token }}` içermezse kod yerine
  BAĞ gider — ELLE iş
- [[repo-geneli-kapilar]] — hedefli süitin önek kuralı `xss/tasarim/gerceklik/
  bundle/bagsiz-ad` gibi **bütün ağacın** kapılarını asla seçmez; `npm run
  kapi:genel` (desen, liste değil — ~17 sn) o kör noktayı kapatır. Ölçü: FAZ 5
  yeşil bastı, CI dört koşu kırmızı
- [[kirmizi-kapi-okunmali]] — kırmızı Kapı'nın üçüncü hâli: hiç okunmamak.
  Kural §9'da vardı ama *sprint kapanışı* listesindeydi; oysa uzak oturumda
  push her fazda olur. **Kapının yeri, varlığından önemlidir**
- [[kapi-yoklanir-beklenmez]] — CI koşusu **yoklanır, beklenmez**; uzak
  oturumda `GITHUB_TOKEN` yer tutucudur ve `api.github.com` 403 döner. Tavansız
  bir `until` bunu sessizce sonsuza çevirdi (40 dk, koşu çoktan yeşildi).
  Kapı: `tests/bekleme-dongusu-kapisi.test.js`

