/**
 * Wanderer — GEÇİŞ KARTIM state slice (iç dosya adı: gecis-karti).
 *
 * KULLANICIYA: "Geçiş Kartım" — kullanıcının Atölye'de oluşturduğu kendi kartı.
 * Yaratım sahnesi ATÖLYE adıyla anılır ([[ilham-kartlari-sosyal-feed]] İlham
 * Kartı ile aynı tezgâh, farklı giriş). Ad senkronu (§4.3): iç ad = görünen
 * ad — önek gk*, state _gecisKartlari, dosya gecis-karti. Kalıcı veri
 * katmanlarının göçü ayrı yürür: storage etw_an_kartlari_v2 (geri-okumalı)
 * ve tablo benim_kartlarim → gecis_kartlarim (mig 039, ELLE).
 *
 * Portre (kim olduğun) ile koleksiyondaki kişi/kilometre kartlarının
 * arasındaki üçüncü kart sınıfı. Şu anın ihtiyacı için Wanderer ile birlikte
 * tasarlanan **odaklı bir uydu kart**: konusu var ("yarınki sunum", "anneme
 * dönüş", "bu öfke"), ömrü sınırlı, dört kategorisi (Düşünceler · İnançlar ·
 * Duygular · Davranışlar) Portreyle aynı dili konuşur.
 *
 * Akış:
 *  1) ws-greet-hero input'u → LLM bu metni ihtiyaç olarak okur,
 *     4 kategoride sahiplenilebilir maddeler önerir → Atölye overlay'i.
 *  2) Kullanıcı onaylayınca kart doğar (palette: lapis — bu hedef için).
 *     S._gecisKartiAktif ona referans verir; ws-greet-hero artık ek modunda.
 *  3) Kullanıcı "Mühürle" deyince koleksiyona iner; aktif null'a düşer.
 *
 * Her madde Portreyle aynı şema: { text, src: 'user' | 'wanderer', at: ISO }
 */
export const gecisKartiState = {
  /** Kullanıcının tüm Geçiş Kartım kartları (en yenisi sona) */
  _gecisKartlari: [],
  /** Şu an besleme modunda olan kartın id'si (yoksa null) */
  _gecisKartiAktif: null,
};
