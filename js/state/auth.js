/** Auth & user slice — Supabase user, premium tier'lar. */
export const authState = {
  currentUser: null,
  username: null,        // profiles.username — tanışmada yazılan, görünen ad da AYNISI (K2)
  bultenIzin: false,     // profiles.bulten_izin (GENERATED) — kökeni olmayan izin yoktur (§6.10)
  _isMinor: false,       // 13-17 yaş beyanı — reşit-olmayan güvenlik modu (Emniyet Katmanı)
  isAdmin: false,
  isPremium: false,      // türetilmiş kapı: abonelik VEYA deneme VEYA admin
  isPremiumPlus: false,
  isStudioSub: false,    // gerçek mağaza aboneliği (profiles.is_premium)
  isTrial: false,        // 30 günlük Studio denemesi aktif mi
  trialEndsAt: null,     // profiles.trial_ends_at
  storePlatform: null,   // 'ios' | 'android' — aboneliğin alındığı mağaza
  USER_IMG: 'https://ui-avatars.com/api/?name=Sen&background=141414&color=B8953C',
  tempAvatarData: null,

  // Fiyatlandırma v2 — yolcu durum makinesi (migration 030_fiyatlandirma_v2)
  offerADeadline: null,     // profiles.offer_a_deadline — İlk Kapı (1₺) son anı
  hasUsedOfferA: false,     // profiles.has_used_offer_a
  hasUsedOfferB: false,     // profiles.has_used_offer_b
  hasCancelledBefore: false,// profiles.has_cancelled_before — Sadakat Kilidi geçmişi
  lapsedAt: null,           // profiles.lapsed_at — Kapı Aralık (30g) başlangıcı
};
