/* ═══════════════════════════════════════════════════════════════════
   12e1 — ALFABE IŞIK · VERİ YAPRAĞI (NISANLAR + ISIK_TEMALAR)
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     On fısıltıya karşı on nişan — alfabenin harfleri. Bu veri artık
     yalnız salonun değil, kart üretiminin de özüdür: bir kartın metni
     çağın bir fısıltısına değiyorsa, sahnesine o fısıltının NİŞANI
     kazınır. Işık kazanılır, dayatılmaz — "Mesele Sensin."
   MEKANİK / TEK GİRİŞ:
     SAF VERİ YAPRAĞI — davranış yok, import yan-etkisi yok. 12e (salon/
     tören) ve 12c/12d (kart üretim motoru) buradan beslenir. Ayrı dosya
     olmasının tek nedeni import döngüsünü kırmaktır: 12e → 12c zaten
     var (ikvEnsureStyles); 12c bu veriyi 12e'den çekemezdi.
   Kalıcılık: yok (sabit veri). Durum 12e'de (etw_isik_nisan_v1).
   Konvansiyon: iç birim adı "Nişan" — kullanıcı-yüzlü başlık "Alfabe
     Işık". İkon viewBox 0 0 100 100, çizgi rengi currentColor.
═══════════════════════════════════════════════════════════════════ */

/* ── On çift — kaynak: "Şeytanla Savaş" araştırması, Wanderer'a göre
      dönüştürüldü. Örgüt adı yok — fısıltı taşıdığı mesajla anılır. ── */
export const NISANLAR = [
  {
    id: 'kapali_goz', ad: 'Kapalı Göz',
    fisilti: 'İzleniyorsun. Özgür değilsin.',
    hakikat: 'Dışarıda seni izleyen değil, içinde seni bekleyen bir ışık var. Özüne dön.',
    ders: 'Kontrol edilen değil, kendini bilen insan.',
    icon: `<path d="M22 52 Q50 68 78 52" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M34 56 L31 62 M50 60 L50 66 M66 56 L69 62" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity="0.7"/>
      <circle cx="50" cy="34" r="2.6" fill="currentColor"/>
      <path d="M50 40 L50 45" stroke="currentColor" stroke-width="1.2" opacity="0.6"/>`,
  },
  {
    id: 'halka', ad: 'Halka',
    fisilti: 'Sen en alttasın. Yukarıdakiler var, sistem böyle.',
    hakikat: 'Işık herkese eşit iner. Hiyerarşi yok, öz var.',
    ders: 'Sistemin dişlisi değil, özünün sahibi insan.',
    icon: `<circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" stroke-width="1.5"/>
      <g stroke="currentColor" stroke-width="1.3" opacity="0.75">
        <line x1="50" y1="24" x2="50" y2="14"/><line x1="50" y1="76" x2="50" y2="86"/>
        <line x1="24" y1="50" x2="14" y2="50"/><line x1="76" y1="50" x2="86" y2="50"/>
        <line x1="32" y1="32" x2="25" y2="25"/><line x1="68" y1="32" x2="75" y2="25"/>
        <line x1="32" y1="68" x2="25" y2="75"/><line x1="68" y1="68" x2="75" y2="75"/>
      </g>`,
  },
  {
    id: 'asa', ad: 'Asa',
    fisilti: 'Bir şeyler dönüyor. Aldatılıyorsun.',
    hakikat: 'Aldatan bilgi değil, doğrultan bilgi.',
    ders: 'Kurnazlık değil, hikmet.',
    icon: `<line x1="50" y1="84" x2="50" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M50 20 q7 4 0 10 q-7 4 0 8" fill="none" stroke="currentColor" stroke-width="1.3" opacity="0.65"/>
      <line x1="38" y1="84" x2="62" y2="84" stroke="currentColor" stroke-width="1.4" opacity="0.5"/>`,
  },
  {
    id: 'saturn', ad: 'Boyun Eğmiş Satürn',
    fisilti: 'Zaman dardır. Acele et, geç kalıyorsun.',
    hakikat: "Zaman Allah'ındır. Acele etme, özüne dön.",
    ders: 'Zamanın kölesi değil, anın sahibi olmak.',
    icon: `<circle cx="50" cy="44" r="15" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <ellipse cx="50" cy="50" rx="30" ry="8" fill="none" stroke="currentColor" stroke-width="1.3" opacity="0.75" transform="rotate(18 50 50)"/>
      <path d="M50 60 q0 12 -7 18" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.55" stroke-linecap="round"/>`,
  },
  {
    id: 'birlesen_zemin', ad: 'Birleşen Zemin',
    fisilti: 'İyi de kötü de aynı bütünün parçası. Arada fark yok.',
    hakikat: 'Hak gelince batıl yok olur. Işık karanlığı yutmaz; dönüştürür.',
    ders: 'Ahlaki görecelik değil, hakikatin birliği.',
    icon: `<rect x="16" y="58" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.85"/>
      <rect x="28" y="58" width="12" height="12" fill="currentColor" opacity="0.35"/>
      <rect x="16" y="70" width="12" height="12" fill="currentColor" opacity="0.35"/>
      <rect x="28" y="70" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.85"/>
      <path d="M42 64 Q54 64 60 58" fill="none" stroke="currentColor" stroke-width="1" opacity="0.4" stroke-dasharray="2 3"/>
      <circle cx="68" cy="46" r="17" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.9"/>`,
  },
  {
    id: 'tohum', ad: 'Tohum',
    fisilti: 'Dönüşmek istiyorsan, sana dayatılan şeye dönüş.',
    hakikat: 'Dönüşüm dışarıdan değil, içeriden başlar. Özünde ne varsa o büyür.',
    ders: 'Programlanan değil, özüyle dönüşen insan.',
    icon: `<circle cx="50" cy="72" r="4.5" fill="currentColor"/>
      <path d="M50 68 Q54 54 48 40 Q44 30 50 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M48 40 Q58 38 61 29" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.7" stroke-linecap="round"/>`,
  },
  {
    id: 'sancak', ad: 'Sancak',
    fisilti: 'Kutsal diye bir şey yok. Her şey değersizdir.',
    hakikat: "Allah birdir. Hak diktir, eğilmez.",
    ders: 'Alay değil, teslimiyet.',
    icon: `<line x1="30" y1="84" x2="30" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M30 20 L66 30 L30 40 Z" fill="currentColor" opacity="0.85"/>
      <circle cx="30" cy="18" r="2.6" fill="currentColor"/>`,
  },
  {
    id: 'bes_isik', ad: 'Beş Işık',
    fisilti: 'Arzuların seni yönetsin. Ruhunu dinleme.',
    hakikat: 'Ruhun maddeye değil, madde ruha tabi olsun.',
    ders: 'Arzunun esiri değil, ruhunun efendisi insan.',
    icon: `<circle cx="50" cy="52" r="4" fill="currentColor"/>
      <g stroke="currentColor" stroke-width="1.4" opacity="0.8" stroke-linecap="round">
        <line x1="50" y1="46" x2="50" y2="16"/>
        <line x1="55" y1="48" x2="80" y2="30"/>
        <line x1="56" y1="55" x2="82" y2="62"/>
        <line x1="44" y1="55" x2="18" y2="62"/>
        <line x1="45" y1="48" x2="20" y2="30"/>
      </g>`,
  },
  {
    id: 'insan_i_kamil', ad: 'İnsan-ı Kâmil',
    fisilti: 'İçindeki hayvanı kucakla. İnsanlığın bir yanılsamadır.',
    hakikat: 'İnsan eşref-i mahlûkattır. Hayvan değil, halifedir.',
    ders: 'Hayvani değil, insani olanın yüceltilmesi.',
    icon: `<circle cx="50" cy="26" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <line x1="50" y1="33" x2="50" y2="64" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M50 40 L34 56 M50 40 L66 56" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <path d="M50 64 L38 84 M50 64 L62 84" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="50" cy="46" r="2.8" fill="currentColor" opacity="0.85"/>`,
  },
  {
    id: 'kalpte_isik', ad: 'Kalpte Işık',
    fisilti: 'Tanrı uzaktır. Seninle ilgilenmez.',
    hakikat: "O, şah damarından yakındır. Mimar değil, Rab'dir.",
    ders: 'Uzak ve soğuk değil, yakın ve sıcak bir yaratıcı.',
    icon: `<path d="M50 78 C28 60 16 46 16 33 C16 21 26 15 37 19 C43 21 47 27 50 32 C53 27 57 21 63 19 C74 15 84 21 84 33 C84 46 72 60 50 78 Z" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <circle cx="50" cy="42" r="4.5" fill="currentColor" opacity="0.9"/>`,
  },
];

/* ── Tema imzaları — örüntü/mesaj metnini nişana bağlar (12e koç köprüsü +
      09d çıpası + 12d kart bestecisi kullanır). Fısıltı DİLİ kasıtlıdır:
      buradaki kelimeler fısıltının yankısını yakalar; hakikat-dili ekleri
      12d'de ayrıdır ki koç köprüsünün kadansı genişlemesin.
      TR \b tuzağı nedeniyle substring, tr-locale lowercase. ── */
export const ISIK_TEMALAR = {
  kapali_goz:     ['izlen', 'gözetlen', 'takip edil', 'mahremiyet', 'özgür değil'],
  halka:          ['en altta', 'yukarıdakiler', 'hiyerarşi', 'sistem böyle', 'ezil', 'güçsüz'],
  asa:            ['aldatıl', 'kandırıl', 'komplo', 'oyuna getir', 'dolap'],
  saturn:         ['yetişemiyorum', 'geç kal', 'zaman yok', 'zaman dar', 'acele', 'vakit yok'],
  birlesen_zemin: ['fark yok', 'hepsi aynı', 'göreceli', 'ne anlamı var', 'boşver hepsi'],
  tohum:          ['dayatıl', 'kalıba', 'programlan', 'başkası olmak', 'onların istediği'],
  sancak:         ['kutsal değil', 'hiçbir şey kutsal', 'değersiz', 'boş inanç'],
  bes_isik:       ['arzu', 'dürtü', 'nefs', 'kontrol edemiyorum', 'bağımlı'],
  insan_i_kamil:  ['hayvan gibi', 'içgüdü', 'insanlık yalan', 'vahşi'],
  kalpte_isik:    ['allah uzak', 'tanrı uzak', 'duymuyor', 'terk edil', 'yalnız bırak'],
};
