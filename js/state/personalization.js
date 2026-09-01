/** Personalization Engine slice — Layer 1-5 (kişilik haritası, prediction, adaptive). */
export const personalizationState = {
  _userProfile: null,
  _narrativeMemory: [],

  _personalityMap: {
    communication: {
      avg_msg_length: 0, msg_lengths: [], style: 'unknown',
      vocabulary: {}, unique_words: 0, total_words: 0,
      metaphor_count: 0, question_ratio: 0, emoji_usage: false,
      preferred_time: null, msg_count_by_hour: Array(24).fill(0)
    },
    triggers: [], soothers: [], values: [],
    relationships: {}, defense_mechanisms: [],
    growth_edges: [], recurring_phrases: {},
    self_descriptions: [], temporal_snapshots: []
  },
  _emotionalChain: [],
  _predictionModel: {
    day_patterns: {},
    time_patterns: { morning: [], afternoon: [], evening: [], night: [] },
    mood_by_day: Array(7).fill(null).map(() => []),
    trigger_sequences: [], crisis_indicators: [], good_day_signals: []
  },
  _adaptiveCommunication: {
    effective_approaches: [], ineffective_approaches: [],
    user_vocabulary: {}, preferred_metaphors: [],
    /* null = HENÜZ ÖLÇÜLMEDİ (2026-08-02, Sıfır Kanıt Sınavı bulgusu).
       Eskiden 0.5 idi ve hiç geri bildirim vermemiş kullanıcıda "Enerji 50"
       diye ekrana basılıyordu — uydurulmuş bir ölçüm. 0 yapmak da olmazdı:
       `cl < 0.3` kapısı açılır, model boş kullanıcı için "nazik yaklaşıma
       daha iyi yanıt veriyor" talimatı alırdı. Yokluğun değeri null'dur. */
    optimal_challenge_level: null, response_engagement: [],
    last_5_interactions: [], explicit_feedback_log: []
  },
  _relationshipDepth: {
    trust_score: 0, vulnerability_depth: 0,
    /* 0'dan başlar (2026-08-02): eskiden 50 idi ve hiç konuşmamış kullanıcı
       için modele "ittifak=50" diye gidiyordu — ölçülmemiş bir yakınlık
       iddiası, üstelik trust_score: 0 ile de tutarsız. İttifak sıfırdan
       inşa edilir; sıfır "yok" demektir ve eşiklerde zaten düşer. */
    alliance_strength: 0, progress_momentum: 0,
    engagement_trend: 'stable', first_session_date: null,
    total_messages: 0, deep_conversations: 0,
    milestones: [], consecutive_days: 0,
    longest_streak: 0, topics_explored: new Set(),
    vulnerability_moments: 0, breakthroughs_count: 0
  },
  _prevAiReply: '',
  /* Duygu Motoru (13D, FAZ 10) — ÖNCEKİ yanıtın karşılaması ve o anki nabız,
     yanıt tamamlandığı anda mühürlenir. Neden dizi konumundan okunmuyor:
     `personalizationAnalyze` ertelenmiş bir çağrıyla gelir (06'da
     requestIdleCallback/setTimeout), yani `S._dgSonKarsilama`'nın son kaydı
     o an ÖNCEKİ tura mı BU tura mı ait olduğu zamanlamaya bağlıdır. Yanlış
     indeks defteri sistematik olarak yanlış eksene yazar ve bu sessiz bir
     yanlış öğrenmedir. Mühür zamanlamadan bağımsızdır. */
  _prevDgKarsilama: null,

  /* KATMAN 6 — YAŞAM HAFIZASI (Life Memory)
     Bir ebeveyn/en yakın dost gibi somut hatırlama:
     isimle insanlar, açık döngüler (takip edilecek olaylar),
     kalıcı yaşam gerçekleri, önemli günler. */
  /* KÖKEN DAMGASI (2026-08-02): her kayıt `kaynak` + `kanit` taşır.
     kaynak — 'olcum' (uygulamanın regex çıkarımı) | 'yorum' (LLM) | 'beyan'.
     kanit  — kullanıcının KENDİ cümlesi, kaynaktan kesilmiş. Damgası olmayan
     kayıt prompt'a ve ekrana giremez: uygulama kullanıcı hakkında bir şey
     söylüyorsa kaynağı kullanıcı olmak zorundadır (13y-koken). */
  _lifeMemory: {
    people: {},          // { "ayşe": { name, role, mention_count, last_mentioned, sentiments:[], topics:[], notes:[], kaynak, kanit } }
    openLoops: [],       // { id, kanit, kaynak, topic, event, due_date(ISO|null), created, status:'open'|'followed'|'closed', followed_at }
    lifeFacts: [],       // { key, category, value, n, kaynak, kanit, first_seen, last_seen }  — n: kaç kez görüldü (eski adı `confidence`)
    importantDates: [],  // { label, date(ISO|'MM-DD'), kind, recurring, kaynak, kanit }
    lastCheckinShown: null, // ISO — proaktif kartın günde bir kez gösterilmesi için
    lastActiveDate: null    // ISO — uzun sessizlik tespiti
  },

  /* YAŞAYAN PORTRE (09e) — P1-P6 + 13l Kimlik + 09d Örüntü'nün günlük tek
     kanonik anlatıya damıtılmış hâli. "X çünkü Y" tanısı + dönüşüm yayı +
     çelişkiler + kör noktalar (Ayna Protokolü'nün hipotez havuzu) + kişi
     hikayeleri (P6 notes'un nihayet kullanıldığı yer). */
  _yasayanPortre: {
    v: 1,
    cekirdek: { mesele: '', donusum_yayi: '' },
    degerler: [],        // { deger, kanit, guven }
    celiskiler: [],      // { metin, kanit }
    kor_noktalar: [],    // { metin, guven } — Ayna Protokolü (FAZ 3) hipotez adayı
    dil_haritasi: { metaforlar: [], kelimeler: [], hitap: '' },
    kisiler: {},         // { "ayşe": { hikaye, son_durum } }
    rituel_iliskisi: '',
    changelog: [],       // { tarih, ne_ogrendim }
    hipotezler: [],      // FAZ 3 doldurur — { id, metin, kanit[], guven, durum }
    lastConsolidated: null,   // ISO gün — günde bir konsolidasyon
    attempts: { day: null, count: 0 }
  },
};
