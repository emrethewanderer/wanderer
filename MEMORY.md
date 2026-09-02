# MEMORY — Hafıza İndeksi

Her satır bir hafıza dosyasına işaret eder (`.claude/memories/<ad>.md`).
İndeks özet, dosya gerçektir: görevin alanına değen satırı görünce dosyayı AÇ.

> Not: bu indeks 2026-09-02'de genel denetim turunda yeniden başlatıldı —
> repo snapshot'ında `MEMORY.md` ve `.claude/memories/` yoktu. Eski oturumların
> hafıza dosyaları elde varsa buraya eklenmelidir.

## Kapılar ve denetçiler
- [[xss-kapisi]] — XSS yüzey denetçisi ifade-bazlıdır ve HTML üreten HER
  template'i tarar; kaçış tek kaynağı `escapeHTML`, taban `scripts/xss-taban.json`
- [[kapi-tarama-yarisi]] — `js/` gezen denetçiler tasarım kapısının T7 geçici
  dosyası yüzünden ENOENT ile çökebilir; okuma yarışa dayanıklı yazılır
- [[kapi-sessiz-gec]] — bir kapı kırığı değil kırığı GÖRME YETENEĞİNİ
  kaybettiğinde de kırmızı yanmalı: boş bulgu listesi "temiz" demek değil
  (tsc TS18003 exit 0 ile gelir); sınır ölçülerek çizilir
- [[olu-kod-temizlikleri]] — ekran/özellik silmeden önce dört sözleşme
  yüzeyini (window köprüsü, DOM id, storage anahtarı, i18n anahtarı) tara;
  tarihsel KORUNANLAR listesi kayıp, dosya onun yerine prosedür yazar
- [[bagsiz-ad-kapisi]] — vite'ın IIFE build'i modülleri tek scope'a
  düzleştirdiği için build'in kendisi yakalamadığı "bundle'da çalışan,
  kaynakta olmayan ad" sınıfını `tsc` scope analiziyle yakalar; sınırı
  `window.foo?.()` köprülerini görmemesi, onu kardeş denetçi sorar

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

## Motorlar ve tuzaklar
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
