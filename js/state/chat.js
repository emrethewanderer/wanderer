/** Chat slice — mesajlar, sessions, mode, emotional tracking, timers. */
export const chatState = {
  // Chat
  messageCount: 0,
  currentSessId: null,
  chatHistory: [],
  allSessions: {},
  knowledgeItems: [],
  _chatHistoryFullyLoaded: false,

  // Session lifecycle
  summaryInProgress: false,
  summarizedSessionId: null,
  summarizedSessionIds: new Set(),
  sessionPatternSummary: '',
  // Kayan seans özeti (06 _rollSumState) — {sessId, text, covered, busy}.
  // Diskte de durur (etw_rollsum_v1_<uid>); reload günün başını unutturmasın.
  _rollSum: null,
  activeFeedbackContent: '',

  // Polling
  _pollingInterval: null,
  _pollingAttempts: 0,

  // AI Mode System
  currentAIMode: 'soft',
  _modeHint: 'soft',
  _modeExplicitRequest: null,
  avoidanceCount: 0,
  consecutiveAvoidance: 0,
  _lastFlashedMode: 'soft',
  _modeHistory: [],

  // Emotional tracking
  _emotionalFlow: [],
  // Duygu Motoru (13D, FAZ 3/4/5) — Nabız son tur (kalıcı değil, her turda
  // ezilir), Yay son 3 turun eğrisi, İklim hidrate edilen per-uid parmak
  // izi (dgInit — post-auth), sonKarsilama akis.gecmis'in KENDİSİ: her
  // eleman geçmiş bir kararın {eksen}'i, dgKarsilama'nın tekrar cezasını
  // (K2) besler ve buildModeSelectionGuide (00) son elemanı okuyarak aynı
  // kararı ikinci kez hesaplamadan mod kılavuzuna taşır. Tek yazar:
  // buildContextPrompt (01) — cap 8, _modeHistory emsali (00:496).
  _dgNabiz: null,
  _dgYay: null,
  _dgIklim: null,
  _dgSonKarsilama: [],
  // FAZ 17-19 — kapının ilk iki kadranını besleyen alanlar. OncekiNabiz:
  // bir BAŞKA turun ölçümü (kadran 1'in "iki ayrı tanık"ı; kanıtsız turda
  // nabız buraya geri çekilir, yok edilmez). NabizZaman: ölçümün damgası
  // (kadran 2 — 'gun'/'dk90' pencereleri bunu okur; damgasız okuma dk90'da
  // taze SAYILMAZ, yani damgayı geçirmeyen tüketici sessizce susar).
  _dgOncekiNabiz: null,
  _dgNabizZaman: null,
  _sessionUserMsgs: [],
  _emotionalSpikeFired: false,
  _contradictionFired: false,
  _identityDriftHistory: [],

  // Timers
  _gcSilenceTimer: null,        // 13o Geri Çağrı Motoru — in-session sessizlik
  _gcLastFireMs: 0,             // 13o — bir önceki tetiklenme zamanı (cooldown)
  _gcLastFireSessId: null,      // 13o — bir önceki tetiklenmenin oturum kimliği
  _gcSessFires: 0,              // 13o — bu oturumdaki tetiklenme sayısı (tavan: 2)
  _gcPendingAt: 0,              // 13o (FAZ 2) — bekleyen davetin ateşlenme anı; cevap/sessiz ölçümü bunu okur
  _endOfDayScheduled: false,

  // Resistance / topic tracking
  _resistanceLog: [],
  _lastMessageTopics: [],
  _lastMsgTimestamp: null,
  _silenceTopicLog: [],

  // Tanıma Motoru (FAZ 1) — örtük mikro-sinyal izi. Oturum-ömürlü (bellekte);
  // sayfa yenilemede kaybolur (bilinçli, oturum tanımı gereği), hasadı 09d
  // omSessionHarvest yapar. İçerik taşımaz: yalnız kimlik + süre + sonuç.
  _oturumIzi: { ekranlar: [], kartlar: [], skipler: [], torenler: [] },
};
