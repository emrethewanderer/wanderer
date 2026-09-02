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
- [[claude-altyapisi-commit-disi]] — `.claude/` altındaki çalışma altyapısı
  (ajanlar, hafızalar, kancalar, launch girdileri) aylarca yalnız lokal
  makinede kalmış, repoya hiç girmemişti; uzak oturum klondan kurar, commit
  edilmemiş olan YOKTUR — uzak oturumda devir denenemez bile
