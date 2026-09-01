/**
 * Wanderer — OLMAK İSTEDİĞİN KİŞİ (OİK) state slice.
 *
 * FELSEFE (Zihniyet Devrimi'ne Çağrı, s.103-107 + Manifesto VIII):
 *   "Olmak istediğin kişi" statik bir arketip değil — SENİN TASARLADIĞIN
 *   kişidir. Yeni Bir Kişiye Geçiş Yapısı: hayalde o kişinin gözünden bak →
 *   düşünce+inançları → his+davranışları → seçimleri. Emre (LLM) ile
 *   ko-tasarım (kitap md.6 AI-yardım mandatı). Bu kart, Portrenin
 *   ("Olduğun Kişi", 02c) LAPİS İKİZİ; Kimlik Motoru'nun (13l) hedef kutbu.
 *
 * Geçiş Protokolü ritüeli de burada yaşar: her sabah + her gece sesli oku,
 * sesini kaydet ve dinle, o kişinin gözlerinin içinden hayal et. Eski Geçiş
 * Alanı (10j) ekranının halefidir; verisi oikInit'te tek seferlik göçer.
 *
 * Kart şeması (Portre 02c ile aynı 4 kategori; madde = {text, src, at}):
 *   { id:'oik_…', baslik, whisper,
 *     dusunceler[], inanclar[], duygular[], davranislar[],
 *     olumlama, olumlama_duygu,
 *     source: 'tasarim'|'hayattaki_sen'|'konusma'|'legacy_gecis',
 *     version, parent_id, state: 'active'|'archived',
 *     has_recording, created_at, updated_at, sealed_at }
 *
 * readingLog şeması 10j ile BİREBİR (göçte 1:1 kopyalanır → 13l Kimlik
 * Motoru delta-gözlemcisi sayı eşitken hayalet olay üretmez).
 */
export const oikState = {
  _oik: {
    /** Kullanıcının tüm "olmak istediğin kişi" kartları (aktif + arşiv) */
    cards: [],
    /** Şu an yaşayan (state:'active') kartın id'si */
    activeCardId: null,
    /** Sabah/gece okuma mührü + ardışık tam-gün serisi (10j şemasıyla aynı) */
    readingLog: {
      lastMorning: null,   // ISO date (YYYY-MM-DD)
      lastNight: null,     // ISO date
      lastDayKey: null,    // son tam-gün mührü
      streak: 0,           // ardışık tam-gün serisi
      totalReadings: 0,    // toplam okuma (sabah+gece ayrı)
    },
    /** Ulaşılan kristalleşme eşiği indeksi (elmas seviyesi) */
    crystalMilestone: 0,
    /** Tasarım törenini ön-dolduracak tohum (sohbet/onboarding sinyali) */
    seedHint: null,
    /** 10j Geçiş Alanı verisi bir kez göçtüyse true (idempotent guard) */
    migratedFromGecis: false,
  },
};
