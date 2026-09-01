/** W2/W3 + arketip slice — calendar cache, archetypes, summaries. */
export const w2State = {
  _w2SummariesCache: null,
  _w2CurrentDayKey: null,
  _w2CalMonth: null,
  _w2MidnightTimer: null,
  _w3MigrationRunning: false,

  _archetypes: {},
  _currentArchetype: null,

  /* ──────────────────────────────────────────────────────────────
     KİŞİ KARTI MOTORU (10q) — kart toplama oyunlaştırmasının çekirdeği
     ──────────────────────────────────────────────────────────────
     profile:    kullanıcının canlı 4-boyut profili (0-100) — "[İsim]'in Kartı"
                 { dusunceler, inanclar, hisler, davranislar, updatedAt }
     collection: kazanılan (BEYAN EDİLMİŞ) kartlar { [cardId]: { earnedAt,
                 rarity, dims, muhur:{at,yol} } } — TEK yazarı kkMuhurle'dir.
     history:    kazanım kayıtları (kronolojik) [{ cardId, at, rarity }]
     seenIntro:  ilk-kez paket deneyimi gösterildi mi (amplified moment)
     lastTick:   son hesaplama zamanı (debounce)
     esik:       ÖNERİ HAVUZU (Oluş Mührü, 2026-07-27) — reçetesi tutmuş ama
                 kullanıcı henüz "artık o kişiyim" demedi { [cardId]: { at,
                 skor, dims, davet, sonDavet, red[] } }. Wanderer kart
                 DAĞITMAZ, yalnız ÖNERİR — collection'a geçiş yalnız
                 kkMuhurle'nin beyanıyla olur (K1/K2/K3, `.claude/plans/
                 olus-muhru.md`). Eski `pending`/`sunum` (dağıtım kuyruğu +
                 günlük tören tavanı) bu kararla SÖKÜLDÜ.
     olusGun:    davet ritmi günlük sayaç { gun (localISODate), davet } —
                 FAZ 2'den itibaren kullanılır (davet ritim kapıları).
     hedefler:   "Böyle bir kişi olmak istiyorum" mührü vurulan SAHİPSİZ
                 kartlar { [cardId]: { at, absorbed } } — Bugün'ün lapis
                 destesini besler ve OİK kartına işlenir (10D oikAbsorbCard).
                 Kart sonradan mühürlenirse mühür düşer: hedef → olunan
                 (mezuniyet, kkTick/kkMuhurle).
  ────────────────────────────────────────────────────────────── */
  _kisiKarti: {
    profile: { dusunceler: 0, inanclar: 0, hisler: 0, davranislar: 0, updatedAt: null },
    collection: {},
    history: [],
    seenIntro: false,
    lastTick: 0,
    esik: {},              // öneri havuzu (Oluş Mührü) — beyan bekleyen kartlar
    olusGun: null,          // davet ritmi günlük sayaç (FAZ 2)
    closest: null,        // near-miss: { cardId, score, missing, hazirlik, niyet } — Kişiler spotlight'ı + 10f lapis yedeği
    hedefler: {},         // hedef mührü vurulan kartlar (lapis deste kaynağı)
  },

  /* ──────────────────────────────────────────────────────────────
     MESAFE MOTORU (13x) — "Aradaki Yol"
     ──────────────────────────────────────────────────────────────
     İki kutup arasındaki tek ölçü: olduğun kişi ile olmak istediğin
     kişi arasında ne kaldı. TÜRETİLMİŞ veridir — kkTick her taramada
     yeniden yazar, kalıcı DEĞİLDİR (kalıcı olan yalnız günlük iz:
     SafeStorage `etw_mesafe_iz_v1_<uid>`).
     ana:    0-100 | null (ölçecek kart yoksa sayı gizlenir)
     hesap:  { kaynak: 'hedef'|'yakin', n } — sayının neyden doğduğu
  ────────────────────────────────────────────────────────────── */
  _mesafe: { ana: null, hesap: null, updatedAt: null },

  /* ──────────────────────────────────────────────────────────────
     KİMLİK MOTORU (13l) — "Olduğun Kişi" canlı kimlik çözücüsü
     ──────────────────────────────────────────────────────────────
     Kullanıcının uygulamadaki TÜM hareketlerini önem sırasına dizilmiş
     bir olay defterinde toplar; zaman-azalmalı erdem vektörüyle "şu an
     hangi Kişi olduğunu" çözer. Kart kazanımında kimlik devri yapar:
     kazanılan kart artık OLDUĞU KİŞİ'dir.
     ledger:          [{t, type, w}] zaman damgalı olaylar (son ~600)
     base:            delta-gözlemci taban çizgisi {counterKey: n}
     currentPersonaId: şu an olduğu kişinin kart id'si (null = henüz
                      kart yok → Portre başlığı kimliktir)
     personaSince:    bu kişi olduğu an (ISO)
     personaHistory:  kimlik yolculuğu [{cardId, name, at, via}]
     seeded:          ilk sessiz taban alındı mı (geri-doldurma yok)
  ────────────────────────────────────────────────────────────── */
  _kimlik: {
    ledger: [],
    base: {},
    currentPersonaId: null,
    personaSince: null,
    personaHistory: [],
    seeded: false,
    lastTick: 0,
  },

  /* ──────────────────────────────────────────────────────────────
     WANDERER OYUNU — Eşsiz oyunlaştırma katmanı
     Felsefe: "İlişkide mesele o değil, sensin."
     ──────────────────────────────────────────────────────────────
     elmas:                "Sıcaklık + basınç" altında biriken değer
                           (kitap metaforu — kolay yoldan kazanılmaz).
     davranisKanitlari:    "Olmak istediğin kişinin davranışı"nın
                           günlük kanıt defteri.
     ayna:                 "Bugün hangi kişiyim?" ayna durumu.
  ────────────────────────────────────────────────────────────── */
  _wandererGame: {
    elmas: 0,
    davranisKanitlari: [],          // [{date, behavior, archetypeId?, source}]
    ayna: {
      lastViewed: null,
      todayReflectedAt: null,       // bugün aynaya bakıldı mı?
      transitionSpark: 0,           // dönüşüm kıvılcımları
    },
    tanikMode: {
      lastShown: null,              // haftalık "tanık modu" zamanlaması
    },
  },

  /* ──────────────────────────────────────────────────────────────
     HAYAL ALEMİ — Imagination Engine
     ──────────────────────────────────────────────────────────────
     FELSEFE: "Hayal aleminde istediğin gibi bir ilişkiyi standartı
              olan bir kişi olarak kendini görebilirsin." (Kitap s.29)

     İki dünya metaforu:
       - HAYAL ALEMİ:    Kullanıcının kendini "olmak istediği kişi"
                         olarak gördüğü sahnelerin biriktiği yer.
       - FİZİKSEL ALEM:  Gerçek yaşamdaki yansıma — Davranış Kanıtı.

     Her seansta kullanıcı:
       1) Bir kavram seçer (Standart/Hak Etmek/Normal/Layık ya da
          Öz Sevgi/Saygı/Değer/Güven/Bolluk),
       2) LLM rehberli bir soruyu yanıtlar,
       3) Sahneyi kendi sözleriyle betimler,
       4) Sahne mühürlenir ve Hayal Alemi haritasına eklenir.

     sahne = {
       id, created_at, concept (key),
       prompt (LLM'in sorduğu),
       scene_text (kullanıcının betimi),
       archetypeId (opsiyonel),
       sealed (true),
       yansima_count (Fiziksel Alem'de kaç davranış kanıtıyla eşleşti)
     }
  ────────────────────────────────────────────────────────────── */
  _hayalAlemi: {
    sahneler: [],                    // mühürlenmiş sahneler
    lastSessionAt: null,             // ISO timestamp
    sessionsCount: 0,
    yansimaScore: 0,                 // 0-100: Hayal/Fiziksel kavşaması
    currentSession: null,            // aktif seans (varsa) — sayfa yenilemede kaybolur
  },

  /* ──────────────────────────────────────────────────────────────
     GEÇİŞ ALANI — Zihniyet Devrimi'nin merkez pratiği (s.103-107)
     ──────────────────────────────────────────────────────────────
     "Olmak İstediğin Kişi" kartı + her sabah & gece sesli okuma,
     sesini kaydet & dinle, o kişinin gözlerinin içinden hayal et.

     kart = {
       id, created_at, title,
       olmakIstenenKisi (başlık satırı),
       dusunceInanc[], duygu[], davranis[],   // 3 alan, satır dizileri
       source ('manual'|'ai'|'archetype'|'essay'),
       archetypeId?, essayId?,
       hasRecording (bool — IndexedDB'de ses var mı)
     }
     readingLog: sabah/gece mühürleri + ardışık gün serisi.
  ────────────────────────────────────────────────────────────── */
  _gecisAlani: {
    cards: [],
    activeCardId: null,
    readingLog: {
      lastMorning: null,    // ISO date (YYYY-MM-DD)
      lastNight: null,      // ISO date
      lastDayKey: null,     // son tam-gün mührü
      streak: 0,            // ardışık tam-gün serisi
      totalReadings: 0,     // toplam okuma (sabah+gece ayrı sayılır)
    },
    crystalMilestone: 0,    // ulaşılan kristalleşme eşiği indeksi
  },

  /* ──────────────────────────────────────────────────────────────
     KENDİNLE KONUŞMAK — kitabın tekrarlayan yöntemi
     ──────────────────────────────────────────────────────────────
     Rehberli öz-diyalog: yaz veya sesini kaydet, kendine sor.
     seans = { id, created_at, setKey, entries:[{q,a,mode,audioKey?}] }
  ────────────────────────────────────────────────────────────── */
  _selfDialogue: {
    sessions: [],
    lastAt: null,
    current: null,          // aktif seans (sayfa yenilemede kaybolur)
  },

  /* ──────────────────────────────────────────────────────────────
     DÖNEM DEĞERLENDİRMELERİ — Gün/Hafta/Ay/Yıl (deneme 86-89)
     ──────────────────────────────────────────────────────────────
     giriş = { id, periodKey, created_at, answers{}, summary? }
  ────────────────────────────────────────────────────────────── */
  _reviews: {
    day: [],
    week: [],
    month: [],
    year: [],
    current: null,          // aktif değerlendirme oturumu
    /* TANIKLIK — "bu dertle gelmiştin, bugün neresinde?" Dönem
       değerlendirmelerinden farkı: soruyu uygulama sorar, hükmü kullanıcı
       verir ve hüküm TARİHLİ bir seriye yazılır (dönüşümün beyan katmanı).
       giriş = { id, periodKey, created_at, durum:'yol'|'yerinde'|'degil',
                 not?, t0:{kalip, enZayif} } */
    tanik: [],
  },

  /* ──────────────────────────────────────────────────────────────
     DİNLENME — Başarı Günlüğü (kullanıcının kendi zaferleri)
     ──────────────────────────────────────────────────────────────
     Dinlenme alanı: yorulduğunda çekildiğin, geçmiş başarılarını
     tarih tarih yazıp istediğin zaman okuduğun mühürlü günlük.
     başarı = { id, date(YYYY-MM-DD), title, text, created_at }
  ────────────────────────────────────────────────────────────── */
  _dinlenme: {
    achievements: [],
    lastReadDay: null,   // YYYY-MM-DD — "günde bir kez okundu" (Hayal mührünü besler)
    onboarded: false,    // geçmiş başarıları toplayan rehberli ilk giriş yapıldı mı
  },

  /* ──────────────────────────────────────────────────────────────
     CAZİBE MOTORU (10r) — İknanın Psikolojisi (Cialdini) 8 ilkesi
     ──────────────────────────────────────────────────────────────
     Etki ilkeleri ETİK olarak ters çevrilip oyunlaştırmanın çekirdeğine
     yerleştirildi: kullanıcıyı başkasına değil, KENDİ dönüşümüne çeker.
     gift:    Günün Hediyesi (uygulama önce verir) { date, kind, claimed, payload }
     pledge:  Günün Sözü (mikro-taahhüt) { date, idx, text, tag, kept }
     seenPusula: Cazibe Pusulası meta-paneli görüldü mü
     sparkTotal: toplam anlık-ödül sayacı (iç metrik)
  ────────────────────────────────────────────────────────────── */
  _cazibe: {
    gift: { date: null, kind: null, claimed: false, payload: null },
    pledge: { date: null, idx: null, text: null, kept: null },
    lastCompliment: null,
    seenPusula: false,
    sparkTotal: 0,
  },

  /* ──────────────────────────────────────────────────────────────
     İMGE KAPISI (13z) — Zaltman'ın kendi-seçilen imgesi
     ──────────────────────────────────────────────────────────────
     Kullanıcının 12 arketipik imgeden seçtiği, "neden sen?" cümlesiyle
     mühürlediği kendi metaforu. Uygulama imge İCAT ETMEZ; yalnız
     kullanıcının seçtiğini geri yankılar (TASARIM-PRENSIPLERI.md §0.1).
     aktif:  { id, neden (kullanıcının kendi cümlesi), tarih } | null
     gecmis: önceki mühürlenmiş imgeler (en çok 12, en yeni başta)
     zirve:  seans kapanışında kanıtlı hatıra inşası (FAZ 5) — bu fazda
             yalnız ŞEKİL, okuma/yazma mantığı yok.
  ────────────────────────────────────────────────────────────── */
  _imge: { aktif: null, gecmis: [], zirve: null },
};
