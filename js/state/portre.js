/**
 * Wanderer — Portre state slice.
 *
 * Kullanıcının kendi yazdığı + Emre'nin yolculuk boyunca eklediği canlı
 * "Olunan [Ad]" kartı (Düşünceler · İnançlar · Duygular · Davranışlar).
 * İlk-giriş onboarding'inde doğar, sonra sınırsız büyür: kazanılan her
 * Kişi Kartı'nın (10q/12b) bildikleri ona işlenir ve LLM portreyi yeniden
 * yazar — kitabın tezi mekanikte: sen değiştikçe kartın değişir.
 *
 * Her madde: { text, src: 'user' | 'emre' | 'kart', at: ISO, ref?: kartId }
 * Kart adı DB'de tutulmaz — client'ta "Olunan {ad}" olarak türetilir (02c).
 */
export const porState = {
  _portre: {
    dusunceler:  [],   // Düşünceler
    inanclar:    [],   // İnançlar
    duygular:    [],   // Duygular
    davranislar: [],   // Davranışlar
    baslik:      '',   // epitet — LLM'in "Olduğun Kişi" kimlik başlığı (kart alt-yazısı)
    portrait:    '',   // 2-3 cümlelik sentez portresi
    confirmed:   false,
    version:     1,    // her tam sentezde (porResynth) artar
    history:     [],   // evrim defteri: [{ v, at, baslik, portrait, cards:[kartId…] }] (son 40)
    sahne:       null, // 12d prosedürel sahne reçetesi — her evrimde yeniden doğar
    created_at:  null,
    updated_at:  null,
  },
};
