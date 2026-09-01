/** Depth & foundations slice — derinlik profili, temeller, kişi geçişi, affirmation.
 *
 *  score: null = HİÇ ÖLÇÜLMEDİ. Eskiden burada 50 yazıyordu ve "ölçülmedi" ile
 *  "ölçüldü, 50 çıktı" ayırt edilemiyordu; tüketiciler o 50'yi gerçek sanıp
 *  mertebe hesaplıyor, günün sözünü ona göre seçiyordu. Ölçümün tek gerçek
 *  kanıtı `signals_count`tur — okuyucular ona bakar (bkz. 13y-koken.js,
 *  .claude/plans/gerceklik-mimarisi.md). Birikim 09b'de nötr tabandan başlar. */
export const depthState = {
  _depthProfile: {
    standart:  { score: null, evidence: [], direction: 'flat', signals_count: 0 },
    hak_etmek: { score: null, evidence: [], direction: 'flat', signals_count: 0 },
    normal:    { score: null, evidence: [], direction: 'flat', signals_count: 0 },
    layik:     { score: null, evidence: [], direction: 'flat', signals_count: 0 }
  },
  _foundationsProfile: {
    oz_sevgi:  { score: null, evidence: [], direction: 'flat', signals_count: 0 },
    oz_saygi:  { score: null, evidence: [], direction: 'flat', signals_count: 0 },
    oz_deger:  { score: null, evidence: [], direction: 'flat', signals_count: 0 },
    oz_guven:  { score: null, evidence: [], direction: 'flat', signals_count: 0 },
    bolluk:    { score: null, evidence: [], direction: 'flat', signals_count: 0 }
  },
  _personTransition: {
    current:  { description: '', beliefs: [], feelings: [], behaviors: [] },
    desired:  { description: '', beliefs: [], feelings: [], behaviors: [] },
    unwanted: { description: '', behaviors: [] },
    domains: {
      bireysel: { current: '', desired: '', active_belief: '' },
      iliski:   { current: '', desired: '', active_belief: '' },
      is:       { current: '', desired: '', active_belief: '' }
    },
    daily_steps: [],
    last_updated: null
  },
  _affirmation: {
    text: '', source: 'user', created_at: null,
    last_practiced: null, practiced_today: false,
    practice_streak: 0, practice_history: []
  },
};
