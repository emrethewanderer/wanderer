// Wanderer AI — DESTE İÇERİĞİ (12b'den ayrılan sidecar gövdesi)
// ════════════════════════════════════════════════════════════════════════════
// 12 kartın tam içeriği + reçete üretimi. Ana bundle'a GİRMEZ: build.sh bunu
// js/ext/deste.js üzerinden ext-deste.js sidecar'ı yapar (bundle diyeti).
// SAF YAPRAK MODÜL — hiçbir şey import ETMEZ. Bağımlılıklar (12a arketip
// verisi, 12d sahne bestecisi, nadirlik ölçeği) 12b çekirdeğinden buildDeckData
// parametresiyle ENJEKTE edilir; yoksa esbuild uygulama zincirini (S dahil)
// sidecar'a kopyalar ve çift-state doğardı.
//
// NEDEN 12 (Emre'nin kararı, 2026-08-07):
//   Deste 112 karttı; içerik tek tek çalışılmadan ölçeklenmişti. Karar:
//   önce kartların kendisi çalışılacak, ölçek SONRA gelecek. Bu yüzden deste
//   "en temel" kesitine indirildi — ama kesit rastgele değil, MEKANİĞE göre
//   seçildi: 10q'nun dört motoru (evrim · sentez · panzehir · altın kart)
//   destedeki kart ilişkilerinden beslenir ve kesit onları AYAKTA tutar:
//     · EVRİM      → iki tam hat (temel-ozsevgi/ozsaygi · filiz→kok→tac)
//     · SENTEZ     → bilesik-ozsaygi-ozsevgi; malzemesi iki hattın kendisi
//     · PANZEHİR   → tuzak-kusursuz (ozsevgi) + golge-onay (ozsaygi);
//                    ikisinin de ışığı destede duruyor
//     · ALTIN KART → tek efsane: temel-ozsevgi-tac (koleksiyonun zirvesi)
//                    (2026-08-07'ye kadar "canlı kart" idi; hareket her
//                    kartın tabiatı olunca prestij çerçeveye taşındı)
//   Nadirlik yeniden dengelendi (5 yaygin · 4 nadir · 2 nadide · 1 efsane):
//   112'lik destenin dağılımı 12 kartta erken kullanıcıya yalnız 2 kart
//   bırakıyordu — tören sönerdi.
//   Silinen 100 kartın metni git tarihindedir (commit e6de018).
// ════════════════════════════════════════════════════════════════════════════

export function buildDeckData({ getAllArchetypeData, kumHeuristicSpec, ikvNormSpec, RARITIES }) {
/* ════════════════════════════════════════════════════════════════════════
   ERDEM META — her erdem: etiket, görsel, reçete sinyalleri ve kartların
   devraldığı temel 4-boyut içerik şablonları.
   signals: { key, dim, w } → rcp() bunları nadirlik ölçeğine göre eşiğe çevirir
   Destede yaşayan beş erdem burada durur; ölçek büyüdüğünde yenisi eklenir.
═══════════════════════════════════════════════════════════════════════════ */
const VIRTUE_META = {
  sebat: {
    label: 'Sebat', glyph: 'patient', sigil: 'oath',
    signals: [
      { key: 'gecisStreak', dim: 'davranislar', w: 1.2, k: 2.2 },
      { key: 'streak',      dim: 'davranislar', w: 1.0, k: 2.0 },
      { key: 'reviews',     dim: 'davranislar', w: 0.8, k: 1.1 },
      { key: 'oz_guven',    dim: 'inanclar',    w: 0.8 },
    ],
    dusunceler: ['Bugün de bir adım — küçük ama gerçek.', 'Bırakmadığım sürece yenilmedim.', 'Süreklilik, yetenekten güçlüdür.'],
    inanclar:   ['Devam eden, varır.', 'Mühür, tek günde değil; üst üste günlerde basılır.', 'Sebat, sessiz bir güçtür.'],
    hisler:     ['Sürdürmenin verdiği sakin güç.', 'Geri dönmeyen bir kararlılık.', 'Yorulsam da yere basan bir dinginlik.'],
    davranislar:['Zinciri kırmadan günü mühürlüyor.', 'Zor günde de pratiğe çekiliyor.', 'Bıraktığı yerden sessizce devam ediyor.'],
  },
  ozsaygi: {
    label: 'Öz Saygı', glyph: 'boundary', sigil: 'cross',
    signals: [
      { key: 'oz_saygi', dim: 'hisler',      w: 1.3 },
      { key: 'reviews',  dim: 'davranislar', w: 0.9, k: 1.0 },
      { key: 'newChoiceRatio', dim: 'davranislar', w: 0.8 },
      { key: 'standart', dim: 'dusunceler',  w: 0.7 },
    ],
    dusunceler: ['"Hayır" demek, korumaktır.', 'Bana iyi gelmiyorsa kabul etmek zorunda değilim.', 'Sınırım, kendime saygımın haritası.'],
    inanclar:   ['Sınır olmadan ilişki olmaz.', '"Evet"in değeri "hayır"dan gelir.', 'Sınır koymak sevmemek değildir.'],
    hisler:     ['Sınırı korurken titreyen ama dik bir ses.', 'Korunmuş olmanın sessiz onuru.', 'İhlal edildiğinde yükselen sağlam bir net.'],
    davranislar:['Açıklamasız hayır diyebiliyor.', 'Aşıldığında nazikçe ama net hatırlatıyor.', 'Kendine iyi gelmeyeni geri çeviriyor.'],
  },
  durust: {
    label: 'Dürüstlük', glyph: 'truth', sigil: 'truth',
    signals: [
      { key: 'selfDialogue', dim: 'davranislar', w: 1.2, k: 1.2 },
      { key: 'vulnerability',dim: 'hisler',      w: 1.0 },
      { key: 'meclisNamed',  dim: 'davranislar', w: 0.9, k: 1.0 },
      { key: 'layik',        dim: 'inanclar',    w: 0.6 },
    ],
    dusunceler: ['Söylemediğim şey gerçeği değiştirmiyor.', 'Önce kendime dürüst olmalıyım.', 'Yalan, içeride başlar.'],
    inanclar:   ['Önce kendine dürüst olmayan kimseye olamaz.', 'Saklanan gerçek içte büyür.', 'Dürüstlük cesaretin sade hâli.'],
    hisler:     ['İtiraftan sonra gelen tuhaf bir hafiflik.', 'Söylenmeden önceki ağır titreşim.', 'Sahteliği fark edince inen utanç.'],
    davranislar:['Yanıldığında "yanıldım" diyebiliyor.', 'Kibar yalan yerine sade gerçeği seçiyor.', 'Söylenmeyeni defterine yazıyor.'],
  },
  ozsevgi: {
    label: 'Öz Sevgi', glyph: 'silent', sigil: 'void',
    signals: [
      { key: 'oz_sevgi',  dim: 'hisler',      w: 1.3 },
      { key: 'dinlenme',  dim: 'davranislar', w: 1.0, k: 1.0 },
      { key: 'trust',     dim: 'hisler',      w: 0.7 },
      { key: 'normal',    dim: 'dusunceler',  w: 0.5 },
    ],
    dusunceler: ['Kendime de bir dost gibi davranabilirim.', 'Yorulmak, vazgeçmek değildir.', 'Bana iyi gelen şeyi seçmek bencillik değil.'],
    inanclar:   ['Önce kendini doldurmayan, taşıramaz.', 'Dinlenmek de bir saygıdır.', 'Sevgi kazanılmaz; alıştırılır.'],
    hisler:     ['Kendine kibar bakmanın hafifliği.', 'Yatışan bir iç deniz.', 'Hiçbir şey kanıtlamadan kalan bir dinginlik.'],
    davranislar:['Yorulduğunda suçluluk duymadan çekiliyor.', 'Başarılarını günlüğüne yazıyor.', 'Kendine küçük bir iyilik ayırıyor.'],
  },
  niyet: {
    label: 'Niyet', glyph: 'wanderer', sigil: 'niyet',
    signals: [
      { key: 'gecisStreak', dim: 'davranislar', w: 1.2, k: 2.2 },
      { key: 'standart',    dim: 'dusunceler',  w: 0.9 },
      { key: 'hayalScenes', dim: 'dusunceler',  w: 0.8, k: 1.2 },
      { key: 'oz_guven',    dim: 'inanclar',    w: 0.5 },
    ],
    dusunceler: ['Bu hareketi neden yapıyorum?', 'Kim olduğum, ne yaptığımdan önce gelir.', 'Niyet açıksa, yol kendiliğinden açılır.'],
    inanclar:   ['Niyet eylemden öncedir.', 'Bilinçsiz hareket savrulmadır.', 'Her sabah yeniden niyet edilir.'],
    hisler:     ['İçten gelen sakin bir kararlılık.', 'Acele etmeden yere basan bir hız.', 'Niyetle uyumlu davranınca yükselen iç ışık.'],
    davranislar:['Bir işe başlamadan niyetini söylüyor.', 'Sabah ilk yarım saat telefon açmıyor.', 'Niyetini günlüğüne yazıyor.'],
  },
};

/* ── Reçete kurucu: erdem sinyallerini nadirlik ölçeğine göre eşiğe çevir ── */
function rcp(virtue, rarityId, extra = []) {
  const v = VIRTUE_META[virtue];
  const R = RARITIES[rarityId] || RARITIES.yaygin;
  const signals = (v ? v.signals : []).map(s => ({
    key: s.key,
    op: 'gte',
    // sayım-bazlı sinyaller (k çarpanı) küçük hedefler; skor sinyalleri ölçeğe oturur
    value: s.k ? Math.max(1, Math.round((R.scale / 18) * s.k)) : R.scale,
    weight: s.w,
    dim: s.dim,
  }));
  for (const e of extra) signals.push({ op: 'gte', weight: 1, dim: 'davranislar', ...e });
  return { signals, threshold: R.threshold, minEvidence: R.minEvidence };
}

/* ── Authored "Bir Kişi" kartı: her alanı elle yazılmış tam portre ─────────
   Çekirdek mekaniği (id/virtue/rarity/recipe) korur; ruhu (isim + portre +
   gerçek hayat + kök + sen-bu-kişi-olduğunda + kişiye özel 4 boyut) elle gelir.

   `sahne` de o ruhun parçasıdır: on iki kartın görseli kelime taramasından
   DEĞİL, kartın kendi metninden okunarak elle bestelendi (2026-08-07). Boş
   bırakılırsa motor devralır — deste büyürken yeni kart hiçbir an sahnesiz
   kalmaz. */
function P(card) {
  const v = VIRTUE_META[card.virtue] || VIRTUE_META.sebat;
  return {
    id: card.id,
    roman: '·',
    // DIL-MUAF: deste içeriği TÜRKÇE yazılır ("Kendine İyi Davranmaya
    // Başlayan") ve TR kuralıyla büyür; en-US ile büyütülse "KENDINE IYI"
    // olurdu. İngilizce deste ayrı bir overlay'dir ve adları zaten büyük.
    name: card.name.toLocaleUpperCase('tr-TR'),
    sub: card.sub || 'Gezgin',
    whisper: card.whisper || '',
    glyph: card.glyph || v.glyph,
    sigil: card.sigil || v.sigil,
    virtue: card.virtue,
    lesson: card.lesson || '',
    portre: card.portre || '',
    gercek: card.gercek || '',
    kok:    card.kok    || '',
    olunca: card.olunca || '',
    dusunceler: card.dusunceler || v.dusunceler,
    inanclar:   card.inanclar   || v.inanclar,
    hisler:     card.hisler     || v.hisler,
    davranislar:card.davranislar|| v.davranislar,
    category: card.category,
    rarity: card.rarity,
    sahne: card.sahne || null,
    recipe: rcp(card.virtue, card.rarity, card.extra || []),
  };
}

/* ════════════════════════════════════════════════════════════════════════
   A. ÇEKİRDEK OMURGA (3) — 12a'dan içe aktarılan arketiplerin üçü
   ─────────────────────────────────────────────────────────────────────────
   Bu üçü hiçbir mekaniğe malzeme değildir; destenin ANLAM omurgasıdır —
   niyet (hareketten önce), sebat (üç nefes) ve dürüstlük (önce kendine).
   12a'nın 12 arketip verisi yerinde durur; buradaki harita hangisinin
   destede yayınlandığını söyler, ölçek büyürken kapı burasıdır.
═══════════════════════════════════════════════════════════════════════════ */
const CEKIRDEK_RARITY = {
  niyetli: 'yaygin', sabirli: 'yaygin', durust: 'nadir',
};
// 12a'nın kendi `virtue` alanı VIRTUE_META anahtarı DEĞİLDİR (niyetli orada
// 'sebat' der). Harita ikisini birleştirir ve karta YAZILIR — reçete bir
// erdemden, kartın kimliği başka erdemden okunursa sentez/panzehir/temsilci
// motorları kartı bulamaz (10q kkErdemTemsilcisi `card.virtue`ya bakar).
const CEKIRDEK_VIRTUE_MAP = {
  niyetli: 'niyet', sabirli: 'sebat', durust: 'durust',
};
// "Bir Kişi" yüzü — 12a'daki isim + 4 boyut zaten zengin; portre/gerçek/kök/olunca buradan
const CEKIRDEK_EXTRA = {
  niyetli: {
    portre: 'Bir işe başlamadan önce "bunu neden yapıyorum?" diye duran kişidir. Hareketten önce niyetiyle var olur; savrulmaz, çünkü yönünü baştan seçer.',
    gercek: 'Sabahın ilk yarım saatinde telefona sarılmak yerine, "bugün nasıl biri olmak istiyorum?" diye duran insan.',
    kok: 'İlişki Felsefesi · niyet — hareketten önce',
    olunca: 'Bilinçsiz savrulman azalabilir; her eylemin çoğu zaman bir yöne hizalanır; ne yaptığından önce kim olduğunu seçebilirsin.',
    // Şafak: kartın kendi cümlesi "sabahın ilk yarım saati". Pusula yönü
    // kurar (niyet), yükselen yol henüz yürünmemiştir — hareketten ÖNCE.
    sahne: { cerceve: 'acik', gok: 'dogan', uzak: ['tepe'], nesne: ['pusula'], yol: 'kavis', yildiz: 6 },
  },
  sabirli: {
    portre: 'Patlamadan önce üç nefes alabilen kişidir. İlk tepkinin en doğru tepki olmadığını bilir; bekleyişini bir güç olarak taşır.',
    gercek: 'Sinirlendiği bir mesajı hemen göndermek yerine yazıp bekleten, sabah tekrar okuyup karar veren insan.',
    kok: 'İlişki Felsefesi · sebat — sabır',
    olunca: 'Anlık tepkilerin azalabilir; acele kararların pişmanlığını daha seyrek yaşarsın; sabrın sana zaman ve güç kazandırabilir.',
    // Gece hilali: mesaj sabaha bırakılır. Kum saati sabrın kendisi; taşlar
    // yolu, dağ da bekleyişin neden gerektiğini söyler.
    sahne: { cerceve: 'dik', gok: 'hilal', uzak: ['dag'], nesne: ['kumsaati'], yol: 'taslar', yildiz: 7 },
  },
  durust: {
    portre: 'Önce kendine dürüst olan kişidir. İşine gelmeyen gerçeği bile yutmaz; saklananın içeride büyüdüğünü bilir.',
    gercek: 'Yanıldığında "yanıldım" diyebilen, kibar bir yalan yerine sade gerçeği seçen insan.',
    kok: 'İlişki Felsefesi · Dürüstlük — önce kendine',
    olunca: 'Kendini kandırma döngüsü kırılabilir; ilişkilerin çoğu zaman gerçeğin üstüne kurulur; dürüstlüğün cesaretin sade hâli olabilir.',
    // Daire + ayna + İKİZ figür: dürüstlük başkasına değil, aynadakine
    // verilen cevaptır. Güneş saklanacak gölge bırakmaz.
    sahne: { cerceve: 'daire', gok: 'gunes', orta: ['ayna'], fig: { mod: 'ikiz' }, yildiz: 4 },
  },
};

function buildCekirdek() {
  let core = [];
  try { core = getAllArchetypeData() || []; } catch (_) { core = []; }
  // 12a on iki arketip döner; destede yayınlanan yalnız haritadaki üçüdür.
  return core.filter(a => CEKIRDEK_RARITY[a.id]).map(a => {
    const rarity = CEKIRDEK_RARITY[a.id];
    const virtue = CEKIRDEK_VIRTUE_MAP[a.id] || 'sebat';
    const extra = CEKIRDEK_EXTRA[a.id] || {};
    return { ...a, category: 'cekirdek', virtue, rarity, recipe: rcp(virtue, rarity), ...extra };
  });
}

/* ════════════════════════════════════════════════════════════════════════
   B. TEMELLER (6) — iki öz × üç kademe; EVRİM mekaniğinin iki hattı
   ─────────────────────────────────────────────────────────────────────────
   filiz→kok→tac: aynı varlığın derinleşmesi (10q kkEvrim id'den okur).
   Öz Sevgi hattının tacı destenin TEK efsanesidir — koleksiyonun zirvesi
   ve altın kart (kkAltinMi) mekaniğinin tek taşıyıcısı.
═══════════════════════════════════════════════════════════════════════════ */
function buildTemeller() {
  return [
    // ── ÖZ SEVGİ ──
    P({ id: 'temel-ozsevgi-filiz', category: 'temel', virtue: 'ozsevgi', rarity: 'yaygin',
      sub: 'Öz Sevgi', name: 'Kendine İyi Davranmaya Başlayan', whisper: 'tohum yeni atıldı',
      lesson: 'Kendine sevgi, küçük bir iyilikle başlar.',
      portre: 'Yıllarca herkese iyi davranıp sıra kendine gelince unutan; şimdi şimdi kendine de bir dost gibi davranmayı öğrenen kişidir.',
      gercek: 'Yorgun olduğunda suçluluk duymadan "bugün biraz dinleneceğim" diyebilen, kendine küçük bir mola tanıyan insan.',
      kok: 'İlişki Felsefesi · Temeller — Öz Sevgi (filiz)',
      olunca: 'Kendini en sona koymayı bırakabilirsin; sana iyi gelen şeyi seçebilirsin; sevgi çoğu zaman dışarıdan beklenen değil, içeride büyütülen olur.',
      dusunceler: ['Kendime de bir dost gibi davranabilirim.', 'Bana iyi geleni seçmek bencillik değil.', 'Yorulmak, vazgeçmek değildir.'],
      inanclar: ['Sevgi önce içeride başlar.', 'Kendini doldurmayan taşıramaz.', 'Ben de iyi davranılmayı hak ediyorum.'],
      hisler: ['Kendine kibar bakmanın ilk hafifliği.', 'Suçluluğun yerini alan ufak bir şefkat.', 'İçeride filizlenen yeni bir sıcaklık.'],
      davranislar: ['Kendine küçük bir iyilik ayırıyor.', 'Yorulduğunda suçluluk duymadan duruyor.', 'İç sesini biraz yumuşatıyor.'],
      // ÖZ SEVGİ HATTI · 1/3 — kap henüz boş: tohum atıldı, filiz çıktı.
      // Pencere: sevgi burada büyük bir karar değil, gündelik küçük bir jest.
      sahne: { cerceve: 'pencere', gok: 'dogan', nesne: ['tohum'], bitki: 'filiz', yildiz: 5 } }),
    P({ id: 'temel-ozsevgi-kok', category: 'temel', virtue: 'ozsevgi', rarity: 'nadir',
      sub: 'Öz Sevgi', name: 'Kendi Dostu Olan', whisper: 'kendine dost',
      lesson: 'En sadık dostun, kendin olabilirsin.',
      portre: 'Zor anında kendini yalnız bırakmayan kişidir. Hata yapınca kendini dövmek yerine omuz veren; kendi yanında duran bir dosta dönüşmüştür.',
      gercek: 'Kötü bir gün geçirdiğinde kendini paylamak yerine "bugün zordu, anlıyorum seni" diyebilen insan.',
      kok: 'İlişki Felsefesi · Temeller — Öz Sevgi (kök)',
      olunca: 'Kendi yanında durabildiğin için kolay kolay yıkılmazsın; dışarıdan onaya muhtaçlığın azalabilir; ilişkilerde de muhtaç değil, dolu bir yerden sevebilirsin.',
      dusunceler: ['Kendi yanımda durabilirim.', 'Hata, kendimi sevmemek için bahane değil.', 'Bana en çok lazım olan dost benim.'],
      inanclar: ['Kendine dost olan yıkılmaz.', 'Şefkat, kendine de borçtur.', 'Sevgi kazanılmaz, alıştırılır.'],
      hisler: ['Kendine omuz vermenin huzuru.', 'Yatışan bir iç deniz.', 'Yalnız olmadığını bilmek — o biri sensin.'],
      davranislar: ['Zor günde kendini paylamıyor, anlıyor.', 'Başarılarını günlüğüne yazıyor.', 'Kendine bir dosta davranır gibi davranıyor.'],
      // ÖZ SEVGİ HATTI · 2/3 — aynı pencere, aynı şafak; kök saldı ve
      // ufukta deniz belirdi: kartın kendi cümlesi "yatışan bir iç deniz".
      sahne: { cerceve: 'pencere', gok: 'dogan', uzak: ['deniz'], nesne: ['kalp'], bitki: 'kok', yildiz: 6 } }),
    P({ id: 'temel-ozsevgi-tac', category: 'temel', virtue: 'ozsevgi', rarity: 'efsane',
      sub: 'Öz Sevgi', name: 'Kendinden Taşan', whisper: 'önce dolar, sonra taşar',
      lesson: 'Dolan bir kap, çevresini de ıslatır.',
      portre: 'Kendini doldurmuş, artık çevresine taşan kişidir. Verdiği sevgi bir fedakârlık değil, fazlasının doğal akışıdır; muhtaç olmadan sever.',
      gercek: 'Kendi huzuru yerinde olduğu için başkasının kötü gününü, kendi dünyasını bozmadan kucaklayabilen insan.',
      kok: 'İlişki Felsefesi · Temeller — Öz Sevgi (taç) · muhtaç olmadan sevmek',
      olunca: 'Sevgini bir borç gibi taşımaktan kurtulabilirsin; verirken çoğu zaman eksilmezsin; çevren senin doluluğundan beslenebilir, sen de tükenmeden taşarsın.',
      dusunceler: ['Önce dolarım, sonra taşarım.', 'Verdiğim, fazlamın akışı.', 'Muhtaç olmadan sevebilirim.'],
      inanclar: ['Dolu bir kap çevresini ıslatır.', 'Sevgi tükenmez, çoğalır.', 'Kendine yeten, başkasına yük olmaz.'],
      hisler: ['Hiçbir şey kanıtlamadan kalan dinginlik.', 'Taşmanın getirdiği cömert sıcaklık.', 'İçi dolu olmanın sakin gücü.'],
      davranislar: ['Verirken kendini tüketmiyor.', 'Başkasının yükünü huzurunu bozmadan taşıyor.', 'Sevgisini hesapsız paylaşıyor.'],
      // ÖZ SEVGİ HATTI · 3/3 — pencere AÇILIR (taşan kap çerçeveye sığmaz),
      // şafak güneşe döner, çeşme ile kâse "önce dolar, sonra taşar"ı çizer.
      // Destenin tek efsanesi: gökyüzü de en kalabalık burada.
      sahne: { cerceve: 'acik', gok: 'gunes', uzak: ['deniz'], orta: ['cesme'], nesne: ['kase'], bitki: 'tac', yildiz: 9 } }),
    // ── ÖZ SAYGI ──
    P({ id: 'temel-ozsaygi-filiz', category: 'temel', virtue: 'ozsaygi', rarity: 'yaygin',
      sub: 'Öz Saygı', name: 'İlk Sınırını Koyan', whisper: 'ilk "hayır"',
      lesson: 'Her saygı, ilk küçük "hayır"la başlar.',
      portre: 'Ömrü boyunca "kırılmasınlar" diye susmuş; şimdi şimdi ilk küçük sınırlarını koymayı deneyen kişidir. Sesi titrer ama deniyor.',
      gercek: 'Birinin kabul edemeyeceği isteğine, alışkanlıkla "olur" demek yerine ilk kez "bunu yapamam" diyebilen insan.',
      kok: 'İlişki Felsefesi · Temeller — Öz Saygı (filiz)',
      olunca: 'Herkesi memnun etme alışkanlığın çatlamaya başlayabilir; küçük "hayır"ların seni korumaya başlar; sınır koymanın sevmemek olmadığını görebilirsin.',
      dusunceler: ['"Hayır" demek beni kötü yapmaz.', 'Bana iyi gelmeyene "olur" demek zorunda değilim.', 'Sınır, ilk adımdır.'],
      inanclar: ['Sınır koymak sevmemek değildir.', 'Her "evet"in değeri "hayır"dan gelir.', 'Saygı önce kendime.'],
      hisler: ['İlk "hayır"ın titreyen ama dik sesi.', 'Korktuğum hâlde durabilmenin gururu.', 'Küçük bir korunmanın rahatlığı.'],
      davranislar: ['Alışkanlıkla "olur" demek yerine duruyor.', 'İlk küçük sınırını koyuyor.', 'Kendine iyi gelmeyeni nazikçe geri çeviriyor.'],
      // ÖZ SAYGI HATTI · 1/3 — sur UZAKTA (sınır henüz fikir), kapı yeni
      // kuruldu: ilk "hayır" bir eşiktir. Filiz, sesin hâlâ titrediğini söyler.
      sahne: { cerceve: 'dik', uzak: ['sur'], orta: ['kapi'], bitki: 'filiz', yildiz: 5 } }),
    P({ id: 'temel-ozsaygi-kok', category: 'temel', virtue: 'ozsaygi', rarity: 'nadir',
      sub: 'Öz Saygı', name: 'Sınırını Sakince Koruyan', whisper: 'sakin ama net',
      lesson: 'Sınır, kendine saygının haritasıdır.',
      portre: 'Sınırını koymayı öğrenmiş, artık onu sakince koruyabilen kişidir. Açıklama yığmaz, suçluluk taşımaz; net ve nazik bir "hayır" kurar.',
      gercek: 'Aşıldığında bağırmadan ama net biçimde "bu benim için uygun değil" diyebilen, sonra da arkasında durabilen insan.',
      kok: 'İlişki Felsefesi · Temeller — Öz Saygı (kök)',
      olunca: 'İlişkilerinde daha az sömürülürsün; "hayır"ların çoğu zaman açıklama gerektirmez; insanlar sana saygıyı, senin durduğun yerden öğrenebilir.',
      dusunceler: ['Sınırım, kendime saygımın haritası.', '"Hayır" için sebep sıralamak zorunda değilim.', 'Net olmak kabalık değil.'],
      inanclar: ['Sınır olmadan ilişki olmaz.', 'Açıklamasız "hayır" da geçerlidir.', 'Saygı, sınırla öğretilir.'],
      hisler: ['Sınırı korurken inen sağlam bir sakinlik.', 'Korunmuş olmanın sessiz onuru.', 'Suçluluk taşımamanın hafifliği.'],
      davranislar: ['Açıklamasız "hayır" diyebiliyor.', 'Aşıldığında nazik ama net hatırlatıyor.', 'Sınırının arkasında duruyor.'],
      // ÖZ SAYGI HATTI · 2/3 — aynı sur, ama artık bir SÜTUN var: sınırın
      // arkasında durulabiliyor. Mühür, açıklama yığmadan verilen sözdür.
      sahne: { cerceve: 'dik', uzak: ['sur'], orta: ['sutun'], nesne: ['muhur'], bitki: 'kok', yildiz: 6 } }),
    P({ id: 'temel-ozsaygi-tac', category: 'temel', virtue: 'ozsaygi', rarity: 'nadide',
      sub: 'Öz Saygı', name: 'Saygısı Tartışılmayan', whisper: 'sınırın artık sessiz',
      lesson: 'Gerçek sınır, savunulmadan anlaşılır.',
      portre: 'Sınırı varlığının bir parçası olmuş kişidir. Kimse kolayca haddini aşmaya kalkmaz; çünkü onun "hayır"ı kavga değil, sakin bir kesinliktir.',
      gercek: 'Etrafındakilerin, daha o bir şey söylemeden nelere izin vermeyeceğini sezdiği; bu yüzden ilişkilerinde nadiren zorlanan insan.',
      kok: 'İlişki Felsefesi · Temeller — Öz Saygı (taç)',
      olunca: 'Sınır savunmak yorucu olmaktan çıkabilir; saygı çoğu zaman istemeden gelir; kendine saygın, çevrendekilerin sana davranışını sessizce yükseltebilir.',
      dusunceler: ['Sınırım artık tartışma konusu değil.', 'Saygı, varlığımla anlaşılır.', 'Haddini bilen yanımda rahat eder.'],
      inanclar: ['Gerçek sınır savunulmadan anlaşılır.', 'Kendine saygı, dışarıya öğretilir.', 'Sessiz net, en güçlü nettir.'],
      hisler: ['Çaba istemeyen bir iç sağlamlık.', 'Saygı görmenin doğal huzuru.', 'Kavgasız durabilmenin dinginliği.'],
      davranislar: ['Sınırını anlatmadan yaşatıyor.', 'Aşılma girişimini sakin ama kesin durduruyor.', 'Saygı görmediği yerden sessizce uzaklaşıyor.'],
      // ÖZ SAYGI HATTI · 3/3 — çerçeve KEMERE döner: sınır artık savunulan
      // bir çizgi değil, içinden geçilen bir mimari. Sütun ve kapı yan yana,
      // takım yıldız sessiz kesinliği söyler — "savunulmadan anlaşılır".
      sahne: { cerceve: 'kemer', gok: 'takim', uzak: ['sur'], orta: ['sutun', 'kapi'], bitki: 'tac', yildiz: 8 } }),
  ];
}

/* ════════════════════════════════════════════════════════════════════════
   C. GÖLGELER (2) — PANZEHİR mekaniğinin iki kutbu
   ─────────────────────────────────────────────────────────────────────────
   10q kkPanzehir gölge kartının `virtue`'sunu okur ve aynı erdemde sahipli
   bir IŞIK kartı arar: gölgeyi tanımak birinci adım, ışığı elde tutmak
   ikincisi. İkisinin de ışığı yukarıdaki hatlardadır — tuzak-kusursuz'un
   panzehri Öz Sevgi hattı, golge-onay'ınki Öz Saygı hattı.
   Kategoriler bilerek farklı (tuzak · golge): 10q'nun GOLGE_KATEGORI seti
   üçünü de kapsar, kesit o sözleşmeyi tek kartla değil iki kategoriyle sınar.
═══════════════════════════════════════════════════════════════════════════ */
function buildGolgeler() {
  return [
    P({ id: 'tuzak-kusursuz', category: 'tuzak', virtue: 'ozsevgi', rarity: 'yaygin',
      sub: 'Tuzak', name: '"Yeter"i Bilen', whisper: 'yeter, mükemmel değil',
      lesson: 'Kusursuzluk, hiç bitirmemenin kibar adıdır.',
      portre: 'İşi "mükemmel" olana kadar beklemeyen, "yeterince iyi"yi teslim edebilen kişidir. Kusursuzluğun çoğu zaman korkunun maskesi olduğunu bilir.',
      gercek: 'Aylarca cilaladığı için kimseye gösteremediği işi, "yeter, bu hâliyle paylaşıyorum" deyip ortaya koyabilen insan.',
      kok: 'Zihniyet Devrimi · #139 7 Tuzak — Kusursuzluk',
      olunca: 'Bitirebilirsin; işlerin kafanda daha az çürür; kendine de bir insana davranır gibi davranabilir, hatayı yıkım değil yol olarak görebilirsin.',
      dusunceler: ['"Yeter" de bir karardır.', 'Kusursuzluk, bitirmemenin maskesi.', 'Hata, yıkım değil, yol.'],
      inanclar: ['Tamamlanmış, mükemmelden iyidir.', 'Kusursuzluk korkuyu saklar.', 'Kendime de şefkat borçluyum.'],
      hisler: ['Teslim edince inen hafiflik.', '"Yeter" deyince çözülen gerilim.', 'Kendine kibar olmanın huzuru.'],
      davranislar: ['İşi "yeterince iyi"de teslim ediyor.', 'Sonsuz cilayı bırakıp paylaşıyor.', 'Hatasını affedip devam ediyor.'],
      // Tuzak sahnede DURUR ama kişi çıkmıştır: kapan arkada, kırık zincir
      // elde, yol yukarı. Bu kart bir uyarı değil bir PANZEHİR — gölge
      // kartında bile ışık kazanılmış olanı gösterir, korkuyu değil.
      sahne: { cerceve: 'dik', gok: 'dogan', orta: ['kapan'], nesne: ['kirikzincir'], yol: 'kavis', yildiz: 4 } }),
    P({ id: 'golge-onay', category: 'golge', virtue: 'ozsaygi', rarity: 'nadir',
      sub: 'Dönüşüm', name: 'Sevip de Kaybolmayan', whisper: 'kendi onayın yeter',
      lesson: 'Onay açlığı, derin bir duyarlılığa dönüşebilir.',
      portre: 'Bir zamanlar herkesin onayına aç bir kişiydi. O incelik şimdi başkalarını derinden anlama yeteneğine dönüştü — ama artık kendini kaybetmeden seviyor.',
      gercek: 'Eskiden herkesi memnun etmek için kendini feda eden; şimdi insanlara sıcak davranırken bir yandan kendi sınırını koruyabilen insan.',
      kok: 'Zihniyet Devrimi · Gölgeden Işığa — Onay açlığı',
      olunca: 'Beğenilme telaşı derin bir empatiye dönüşebilir; insanları anlarsın ama kendini onlarda daha az kaybedersin; sevgin artık fedakârlık olmaktan çıkabilir.',
      dusunceler: ['İnsanları anlarım ama kendimi kaybetmem.', 'Kendi onayım yeter.', 'Eski açlığım, şimdi şefkatim.'],
      inanclar: ['Onay açlığı empatiye dönüşebilir.', 'Sevmek, kendini silmek değildir.', 'Kendi onayım en sağlam zemin.'],
      hisler: ['Sevip de kaybolmamanın dengesi.', 'Onay telaşının yerini alan dinginlik.', 'Hem sıcak hem dik olmanın huzuru.'],
      davranislar: ['Sıcak davranırken sınırını koruyor.', 'Onay için kendini feda etmiyor.', 'Duyarlılığını güce çeviriyor.'],
      // GÖLGE figürü: eski ben (onay açlığı) ile şimdiki ben aynı karede
      // durur — "eski açlığım, şimdi şefkatim". Ayna başkalarında kendini
      // arayışın izi; kalp o arayışın dönüştüğü yer. Daire: dönüşüm çemberi.
      sahne: { cerceve: 'daire', orta: ['ayna'], nesne: ['kalp'], fig: { mod: 'golge' }, yildiz: 5 } }),
  ];
}

/* ════════════════════════════════════════════════════════════════════════
   D. BİLEŞİK (1) — SENTEZ mekaniğinin tek kartı
   ─────────────────────────────────────────────────────────────────────────
   Füzyon malzeme ister: 10q kkSentezDurum id'den iki erdemi okur ve İKİSİNİN
   de tek-tek kartına sahip olmadan bileşiği vermez. Malzemeler destede hazır
   duruyor — Öz Saygı ve Öz Sevgi hatlarının kendisi.
═══════════════════════════════════════════════════════════════════════════ */
const BILESIK_DEFS = [
  { v1: 'ozsaygi', v2: 'ozsevgi', rarity: 'nadide', name: 'Sınırlı Şefkatli', w: 'hayır der, sevgiyle',
    lesson: 'En şefkatli "hayır", en net olandır.',
    portre: 'Hem sınır koyabilen hem şefkatli olan kişidir. "Hayır"ı bir sevgisizlik değil; kendine ve karşısındakine duyduğu saygının bir ifadesidir.',
    gercek: 'Sevdiği birine sınır koyarken sesini sertleştirmeyen, "seni seviyorum ama bunu yapamam" diyebilen insan.',
    kok: 'İlişki Felsefesi · Öz Saygı + Öz Sevgi',
    olunca: 'Şefkatin sınırsızlığa, sınırın sertliğe kaymadan durabilir; sevgiyle "hayır" diyebilir, hem kendini hem ilişkini koruyabilirsin.',
    dusunceler: ['En şefkatli "hayır", en net olandır.', 'Sınır, sevginin parçası.', 'Sevgiyle de "hayır" denir.'],
    inanclar: ['Sınır ile şefkat çelişmez.', 'Kendini koruyan, daha iyi sever.', 'Net "hayır" da bir sevgidir.'],
    hisler: ['Sevgiyle sınır çizmenin dengesi.', 'Hem yumuşak hem dik olmanın huzuru.', 'Korurken bile şefkatin sıcaklığı.'],
    davranislar: ['Sınırını sertleşmeden koyuyor.', '"Seni seviyorum ama" diyebiliyor.', 'Hem şefkati hem sınırı koruyor.'],
    // SENTEZ: iki hattın imgesi tek karede. Kapı Öz Saygı'dan (sınır), ağaç
    // Öz Sevgi'den (canlı, veren) gelir; terazi ikisinin dengesidir — ve
    // sahnede DURMAZ, salınır: denge korunan bir şeydir, kurulan değil.
    sahne: { cerceve: 'kemer', gok: 'takim', orta: ['kapi', 'agac'], nesne: ['terazi'], yildiz: 7 } },
];

function buildBilesik() {
  return BILESIK_DEFS.map(d => {
    const card = P({
      id: `bilesik-${d.v1}-${d.v2}`, category: 'bilesik', virtue: d.v1, rarity: d.rarity,
      sub: 'Bileşik', name: d.name, whisper: d.w, lesson: d.lesson,
      portre: d.portre, gercek: d.gercek, kok: d.kok, olunca: d.olunca,
      dusunceler: d.dusunceler, inanclar: d.inanclar, hisler: d.hisler, davranislar: d.davranislar,
      sahne: d.sahne,
    });
    // İkinci erdemin baş sinyalini de koşula ekle → reçete gerçekten iki yönlü
    const v2sig = VIRTUE_META[d.v2].signals[0];
    card.recipe.signals.push({ key: v2sig.key, op: 'gte', value: RARITIES[d.rarity].scale, weight: 1.1, dim: v2sig.dim });
    return card;
  });
}

function buildDeck() {
  const deck = [
    ...buildCekirdek(),
    ...buildTemeller(),
    ...buildGolgeler(),
    ...buildBilesik(),
  ];
  // Tekilleştir (id çakışmasına karşı güvence)
  const seen = new Set();
  const unique = deck.filter(c => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  // SAHNE: elle bestelenmiş reçete KAZANIR, motor yalnız boşluğu doldurur.
  // Kartın `sahne` alanı doluysa (yayınlanan on iki kartın her biri kendi
  // sahnesiyle yazılır — bkz. SAHNELER) motor ona DOKUNMAZ; yalnız normalize
  // eder ki eksik alanlar şemaya otursun. Reçetesiz kart sezgisel bestecinin
  // elinde kalır: SENKRON, LLM'siz, tohumla deterministik — deste sabit
  // içeriktir, oturumdan oturuma aynı görünmelidir (bu yüzden kumEnsureSpec
  // DEĞİL, doğrudan kumHeuristicSpec: ağ yok, arka plan iyileştirmesi yok).
  // Geçiş dönemi güvenlidir: elle yazılmamış kart hiçbir an sahnesiz kalmaz.
  for (const c of unique) {
    c.sahne = c.sahne
      ? (typeof ikvNormSpec === 'function' ? ikvNormSpec(c.sahne) : c.sahne)
      : kumHeuristicSpec({
        seed: c.id,
        virtue: c.virtue,
        texts: [c.name, c.whisper, c.lesson, c.portre, c.gercek, c.olunca,
          ...(c.dusunceler || []), ...(c.inanclar || []), ...(c.hisler || []), ...(c.davranislar || [])],
      });
  }
  return unique;
}

  return buildDeck();
}
