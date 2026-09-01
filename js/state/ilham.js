/**
 * Wanderer — SOSYAL FEED state slice (10C, eski "İlham Kartı" 10B).
 *
 * 2026-06-21 — KAVRAMSAL BİRLEŞME: "İlham Kartı" ayrı kart sınıfı kaldırıldı;
 * yaratım+koleksiyon 10A "Geçiş Kartım" iki-kutuplu omurgasına gömüldü.
 * Bu slice'tan geriye yalnız SOSYAL FEED (Kişilerin Kişileri, 10C) ve anonim
 * rumuz (10B köprü + 10A paylaşımı) için gereken yerel cache'ler kaldı.
 *
 * Tasarım kararı: Sosyal akışı (feed/likes/comments) state'te tutmayız —
 * büyür, kaybolur, sayfada anlık sorgulanır. Sadece "ben hangi kartı
 * beğendim / koleksiyonuma aldım" için yerel Set cache tutarız ki UI'da
 * çift istek atmadan dolu/boş durum gösterelim.
 *
 * (Kart verisi artık _gecisKartlari'nda — bkz. js/state/gecis-karti.js.)
 */

export const ilhamState = {
  /** Yerel cache: bu paylaşılan kart id'lerini beğendim (UI dolu kalp için) */
  _ilhamLikedSet: null,    // Set<number> | null (lazy load)

  /** Yerel cache: bu paylaşılan kart id'lerini koleksiyonuma aldım (re-clone önleme) */
  _ilhamSavedSet: null,    // Set<number> | null (lazy load)

  /** Yerel cache: bu paylaşılan kart id'lerini bildirdim (⚑ tek-rapor UI'ı) */
  _ilhamReportedSet: null, // Set<number> | null (lazy load)

  /** Anonim rumuz cache — kullanıcıya sabit (seed: user_id) — bir kez üretilir, saklanır */
  _ilhamRumuz: null,       // { name:'GEZGİN_E7K1', color:'#5A8AD8' } | null
};
