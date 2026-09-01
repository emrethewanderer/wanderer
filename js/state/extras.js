/** Extras slice — challenges, crisis, ambient sound, UI timers, charts. */
export const extrasState = {
  // UI
  moodChartObj: null,
  _lastTimeOfDayLabel: null,
  _microOnboardingCtx: null, // onboarding sentez bağlamı (03-auth-shell yazar, 02 okur)

  // Sefer (21 günlük yolculuk) — 10h yazar, 12a arketip önerisi + 13A yüzeyi okur
  _activeChallenge: null,
  _completedSeferler: [],

  // Crisis / ambient / input-card timers
  _crisisFiredThisSession: false,
  _crisisMsgLeft: 0,   // prompt.crisis enjeksiyonunun kalan kullanıcı-mesajı sayısı
  _crisisCardAt: 0,    // son kriz kartı gösterimi (20 dk soğuma penceresi)
  _crisisLLMBusy: false, // yumuşak sinyalin sessiz LLM teyidi sürüyor
  _crisisDayKey: null,   // son kriz gününün yerel tarihi (10s/13o susturma + ertesi gün yoklama)
  _asAktifTon: null,
  _asTimer: null,
  _icAutoCloseTimer: null,
  _icCountdownInterval: null,
};
