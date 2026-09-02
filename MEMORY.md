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
- [[olu-kod-temizlikleri]] — ekran/özellik silmeden önce dört sözleşme
  yüzeyini (window köprüsü, DOM id, storage anahtarı, i18n anahtarı) tara;
  tarihsel KORUNANLAR listesi kayıp, dosya onun yerine prosedür yazar
