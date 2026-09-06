// Wanderer AI — Arketip & Arketipler (v4 birebir geçiriş)
// wsv3-data.jsx + wsv3-screens.jsx → vanilla JS
//
// TODO i18n: Tüm kullanıcıya görünen TR string'ler şu an literal.
// İkinci fazda 15b-i18n-dict-*.js sözlüklerine taşınacak anahtar grupları:
//   arch.ribbon.now / arch.ribbon.sealed / arch.ribbon.reachable / arch.ribbon.locked
//   arch.trait.thoughts / arch.trait.beliefs / arch.trait.feelings / arch.trait.behaviors
//   arch.counter.sealed / arch.counter.threshold / arch.counter.fog / arch.counter.total
//   arch.filter.all / arch.filter.sealed / arch.filter.threshold / arch.filter.fog
//   arch.popup.add / arch.popup.commit / arch.popup.cancel / arch.popup.prompt
//   arch.reel.next / arch.reel.seal / arch.ceremony.back
//   arch.view.day / arch.view.youAre / arch.view.details / arch.view.quote / arch.view.cta

import { S } from '../state.js';
import './12c-kart-gorsel.js';

/* ══════════════════════════════════════════════════════
   VERİ — 12 Arketip (wsv3-data.jsx birebir)
══════════════════════════════════════════════════════ */
const ARKETIPLER_DATA = [
  {
    id: 'niyetli',
    roman: 'III',
    name: 'NİYETLİ',
    sub: 'Gezgin',
    whisper: 'önce niyet, sonra hareket',
    glyph: 'wanderer',
    sigil: 'niyet',
    virtue: 'sebat',
    defaultState: 'sealed',
    sealedDay: 38,
    sealedDate: '09 Mayıs',
    requirement: null,
    lesson: 'Hareketinden önce niyetinle var olursun.',
    dusunceler: ['Bu hareketi neden yapıyorum?','Kim olduğum, ne yaptığımdan önce gelir.','Sabah ilk düşüncem, günü kurar.','Bu eylem, niyetimin nereye gittiğini söyler.','Yaptığım her şey, kim olduğumu inşa ediyor.'],
    inanclar: ['Niyet, eylemden öncedir.','Bilinçsiz hareket, savrulmadır.','Olduğum kişi, yaptığım her şeyi besler.','Niyet açıksa, yol kendiliğinden açılır.','Her sabah yeniden niyet etmeden var olunmaz.'],
    hisler: ['İçten gelen sakin bir kararlılık.','Acele etmeden, yere basan bir hız.','Niyet doğduğunda gelen hafif bir aydınlanma.','Ne yapacağımı önceden bilmenin verdiği güven.','Niyetimle uyumlu davrandığımda yükselen iç ışık.'],
    davranislar: ['Bir işe başlamadan önce duruyor, niyetini söylüyor.','Sabah ilk yarım saatte telefon açmıyor.','Kararını "ne için" cümlesiyle test ediyor.','Her görevin başında 30 saniye duruyor.','Niyetini günlüğüne her gün yazıyor.'],
  },
  {
    id: 'sabirli',
    roman: 'I',
    name: 'SABIRLI',
    sub: 'Gezgin',
    whisper: 'üç nefes, sonra söz',
    glyph: 'patient',
    sigil: 'silence',
    virtue: 'sebat',
    defaultState: 'sealed',
    sealedDay: 14,
    sealedDate: '15 Nisan',
    requirement: null,
    lesson: 'Patlamadan önce beklemek bir mühürdür.',
    dusunceler: ['Şimdi konuşursam pişman olurum.','Acele bir cevap, acele bir karardır.','Bekleyişim, gücümün başka bir adı.','Şu an konuşmasam ne olur?','Aceleyi kim öğretti bana?'],
    inanclar: ['Zaman, bilenin yanındadır.','İlk tepki, en doğru tepki değildir.','Susmak da bir cevaptır.','Bekleyebilmek, kendine güvenin sınavıdır.','İlk hamleyi yapan değil, doğru hamleyi yapan kazanır.'],
    hisler: ['Göğsünde yumuşayan bir gerilim.','Çocukluk acelesinden uzak bir durulma.','Üç nefesin sonunda gelen yer çekimi.','Sabırla gelen sade bir özgüven.','Patlamamış olmanın verdiği temiz vicdan.'],
    davranislar: ['Tartışmada üç nefes alıyor, sonra konuşuyor.','Mesajı yazıyor, ama hemen göndermiyor.','Sırasını bekliyor; lafı kapmıyor.','Tepki anında çayını demlemeye gidiyor.','Gece yarısı yazmıyor; sabah okuyup karar veriyor.'],
  },
  {
    id: 'sukreden',
    roman: 'II',
    name: 'ŞÜKREDEN',
    sub: 'Gezgin',
    whisper: 'elindeki yetiyor',
    glyph: 'grateful',
    sigil: 'spiral',
    virtue: 'bolluk',
    defaultState: 'sealed',
    sealedDay: 27,
    sealedDate: '28 Nisan',
    requirement: null,
    lesson: 'Elindekini saydığında, eksiğin küçülür.',
    dusunceler: ['Bugün bana verilen üç şey ne?','Eksik aradığım yer, dolu olanı saklıyor.','Şu an, geçmişin getirdiği bir hediye.','Bugün eksildiğim değil, eklendiğim şeyler önemli.','Karşılaştırma yaptığımda kaybediyorum.'],
    inanclar: ['Yetecek olan zaten elimde.','Şükür bir his değil, bir bakıştır.','Daha çok değil; daha derin gerek.','Az ile çok arasındaki fark, içsel bir karardır.','Şükür çoğaltır, yakınma daraltır.'],
    hisler: ['Genişleyen bir göğüs kafesi.','Hafif, ısınmış bir minnet.','İsteklerin küçüldüğü bir doygunluk.','Beklenmedik bir şeyi fark edince inen sevinç.','Birinin başardığında içeriden gelen gerçek mutluluk.'],
    davranislar: ['Gün başında üç şükür sayıyor.','Aldığı bir iyiliği geri bildiriyor.','Karşılaştırmayı yakaladığında durduruyor.','Bir teşekkür notu yazmadan günü bitirmiyor.','Pencereden gözlem yaparken ışığa bakıyor.'],
  },
  {
    id: 'yansiyan',
    roman: 'IV',
    name: 'YANSIYAN',
    sub: 'Gezgin',
    whisper: 'kendini dışarıdan izle',
    glyph: 'mirror',
    sigil: 'mirror',
    virtue: 'ozsaygi',
    defaultState: 'sealed',
    sealedDay: 42,
    sealedDate: '13 Mayıs',
    requirement: null,
    lesson: 'Aynaya kaçmadan baktığında, dönüşüm başlar.',
    dusunceler: ['Şu anki tepkim, hangi kalıbın?','Bu his bana ne anlatmaya çalışıyor?','Dışarıdan baksam ne görürdüm?','Tepki verdiğim şey, hangi parçamla ilgili?','Bu duygu, hangi anının yankısı?'],
    inanclar: ['Görmediğim şey beni yönetir.','Yansıma, yargı değil, fark etmedir.','Mesele o değil, ben.','Yansıtmadan iyileşilmez.','Suçlanan hep dışarısı oldukça, içeri değişmez.'],
    hisler: ['Bir adım geri çekilince inen sis.','Karşıdaki yerine kendine dönen merak.','Yumuşak ama net bir farkındalık.','Geriye çekildiğimde yatışan iç çığlık.','Kendine kibar bakmanın hafifliği.'],
    davranislar: ['Gün sonunda 10 dakika gözlem yapıyor.','Tepki anında "şu an neredeyim?" diye soruyor.','Defterine "bugün hangi kişi konuştu?" yazıyor.','Yatmadan önce gün özetini yazıyor.','Tepkilerini etiketlemeden gözlüyor.'],
  },
  {
    id: 'sozunu-tutan',
    roman: 'V',
    name: 'SÖZÜNÜ TUTAN',
    sub: 'Gezgin',
    whisper: 'verdiğin sözle ol',
    glyph: 'oathHand',
    sigil: 'oath',
    virtue: 'sebat',
    defaultState: 'current',
    sealedDay: null,
    sealedDate: '—',
    requirement: null,
    progress: undefined,
    lesson: 'Sözünü tuttukça, kendine olan güvenin biner.',
    dusunceler: ['Söylediğim, yapacağımdır.','Vermediğim söz, ihanet değildir.','Küçük sözler, büyük güven yapar.','Verdiğim söz, sözden büyüktür.','Tutamayacağım sözden çekinmek de bir saygıdır.'],
    inanclar: ['Söz, sözden büyüktür — kendineyse mühürdür.','Tutamayacağım sözü vermem.','Tutulan her söz, bir omurga taşıdır.','Söz tutmak, kendinde sürmek demektir.','Verilen söz, kişinin ağırlığıdır.'],
    hisler: ['İçinde sağlamlaşan bir omurga.','Kendi gözünde büyüyen bir güven.','Söz bozulduğunda gelen dürüst bir sıkıntı.','Verdiği sözü tutunca gelen sessiz onur.','Söz bozulduğunda iç pusulasının sapması.'],
    davranislar: ['Sözünü yazıyor, görünür yere asıyor.','"Yapamam" demeyi öğreniyor, "yaparım" hafifliyor.','Bozulan sözü saklamadan yeniden yazıyor.','Söz verdiğinde takvime not düşüyor.','Sözünü tutamadığında ilk haber veriyor.'],
  },
  {
    id: 'durust',
    roman: 'VI',
    name: 'DÜRÜST',
    sub: 'Gezgin',
    whisper: 'önce kendine söyle',
    glyph: 'truth',
    sigil: 'truth',
    virtue: 'durust',
    defaultState: 'reachable',
    sealedDay: null,
    sealedDate: '—',
    requirement: '12 itiraf',
    progress: 0.42,
    lesson: 'Söylenmeyen, içte büyür.',
    dusunceler: ['Bunu kendime söylemekten neden çekiniyorum?','Söylemediğim şey, gerçeği değiştirmiyor.','Yalan, önce içeride başlıyor.','Söylemediğim şey, yokmuş gibi davranmıyor.','Kibar yalan da bir maliyet getiriyor.'],
    inanclar: ['Önce kendine dürüst olmayan, kimseye olamaz.','Saklanan gerçek, içte mantar olur.','Dürüstlük cesaretin sade hâli.','Gerçek, tek başına bir özgürlüktür.','Saklamak, taşımak demek.'],
    hisler: ['İtiraftan sonra gelen tuhaf bir hafiflik.','Söylenmeden önceki ağır titreşim.','Sahte gülüşü fark edince inen utanç.','İtiraftan sonra gelen tuhaf bir oksijen.','Söylenmeden önce göğüsteki sıkışma.'],
    davranislar: ['Defterine söylenmeyeni yazıyor.','Kibar yalan yerine sade gerçeği seçiyor.','Yanıldığında "yanıldım" diyebiliyor.','Sözcüklerini büyütmüyor, küçültmüyor.','Övgüyü hak ettiğinde alıyor.'],
  },
  {
    id: 'cesur',
    roman: 'VII',
    name: 'CESUR',
    sub: 'Gezgin',
    whisper: 'korkuya rağmen',
    glyph: 'courage',
    sigil: 'courage',
    virtue: 'ozguven',
    defaultState: 'locked',
    sealedDay: null,
    sealedDate: '—',
    requirement: 'Yakıştırmama kalıbının üstüne git',
    progress: 0.18,
    lesson: 'Cesaret korkunun yokluğu değildir, ona rağmen yürümektir.',
    dusunceler: ['Korkuyorum, ama yine de yapacağım.','En kötüsü ne olabilir? Onunla yaşayabilirim.','Konfor, sessiz bir hapis.','Korku bana ne anlatmaya çalışıyor?','Yapmadığım, beni daha çok korkutur.'],
    inanclar: ['Cesaret, korkunun yokluğu değildir.','Rahat kalan, dönüşmez.','Korkudan kaçtığım kapı, gideceğim yerdir.','Hayat, konforun dışında başlar.','Cesaretsizlik, sessiz bir vazgeçiş.'],
    hisler: ['Eylem anında titreyen ama duran bir el.','Mide bulantısıyla karışık bir berraklık.','Adımdan sonra gelen geniş bir gurur.','Adım atıldıktan sonra hafifleyen göğüs.','Korkuya rağmen yürürken yükselen güç.'],
    davranislar: ['Erteleyenin tam tersini seçiyor.','Zor konuşmayı önce gündeme alıyor.','"Bana göre değil" cümlesini sınıyor.','Korktuğu konuşmayı 24 saat içinde başlatıyor.','Konforuna ayda bir kez meydan okuyor.'],
  },
  {
    id: 'sinir',
    roman: 'VIII',
    name: 'SINIRI BİLEN',
    sub: 'Gezgin',
    whisper: '"hayır" da bir mühür',
    glyph: 'boundary',
    sigil: 'cross',
    virtue: 'ozsaygi',
    defaultState: 'locked',
    sealedDay: null,
    sealedDate: '—',
    requirement: 'Onay Açlığı kalıbını yıprat',
    progress: 0.12,
    lesson: 'Sınırını bilmeyen, kimsenin sınırına saygı duyamaz.',
    dusunceler: ['"Hayır" demek, reddetmek değil; korumak.','Açıklama yapmadan hayır diyebilirim.','Onun rahatsızlığı, benim sorumluluğum değil.','Bana iyi gelmiyorsa, kabul etmek zorunda değilim.','Sınırım, ilişkiyi koruyandır; bozanı değil.'],
    inanclar: ['Sınır olmadan ilişki olmaz.','"Evet"in değeri, "hayır"dan gelir.','Sınırım, kendime saygımın haritası.','Sınırı olmayan, kendini de tanımıyordur.','Sınır koymak, sevmemek değildir.'],
    hisler: ['"Hayır" derken titreyen ama dik bir ses.','Sınırı koruduktan sonra gelen sessiz onur.','Suçluluk geldiğinde nazikçe iten bir net.','Sınırı korurken titreyen ama dik duran ses.','İhlal edildiğinde yükselen sağlam bir kızgınlık.'],
    davranislar: ['Açıklamasız hayır pratiği yapıyor.','Telefon saatini günde bir kez kapatıyor.','Aşıldığında nazikçe ama net hatırlatıyor.','Rahatsız edici şakaya sessiz kalmıyor.','Sosyal medyayı saatleriyle sınırlıyor.'],
  },
  {
    id: 'hak-eden',
    roman: 'IX',
    name: 'HAK EDEN',
    sub: 'Gezgin',
    whisper: 'standardın yükselir',
    glyph: 'deserve',
    sigil: 'elmas',
    virtue: 'ozdeger',
    defaultState: 'reachable',
    sealedDay: null,
    sealedDate: '—',
    requirement: 'Hak Etmek derinliği · 7 gün',
    progress: 0.86,
    lesson: 'Hak ettiğinde, dilenmen gerekmez.',
    dusunceler: ['Bunu hak ediyorum — kanıtlamak zorunda değilim.','Standardım, kabul ettiğim şeydir.','Daha azına razı olmak, daha azına dönüşmek.','Bunu hak etmek, kanıtlamak değil.','Standardım, sevdiklerimi de yükseltir.'],
    inanclar: ['Hak etmek, izin beklemenin sonudur.','Aldığım her şey, kabul ettiğim eşiktir.','Değerim, performansımdan önce gelir.','Az olana razı olan, az olan olur.','Hak etmek, ısrarın değil, varoluşun meselesidir.'],
    hisler: ['Dik durmanın getirdiği sade bir gurur.','Pazarlık etmeyen bir iç ses.','Reddetmenin verdiği hafiflik.','Kabul etmediğim şeyi geri çevirirken inen huzur.','Pazarlık dışı duran bir iç tonu.'],
    davranislar: ['Düşük teklifi sessizce geri çeviriyor.','Kötü muameleye gülümseyerek katlanmayı bırakıyor.','Hak ettiği şeyi istemekten utanmıyor.','Mesleki teklifte değerini söylemekten çekinmiyor.','İlişkide kabul edemediğini açıkça söylüyor.'],
  },
  {
    id: 'bolluk',
    roman: 'X',
    name: 'BOLLUK',
    sub: 'Gezgini',
    whisper: 'kıtlık bir alışkanlıktır',
    glyph: 'abundance',
    sigil: 'spiral',
    virtue: 'bolluk',
    defaultState: 'locked',
    sealedDay: null,
    sealedDate: '—',
    requirement: 'Bolluk Bilinci · 70+',
    progress: 0.0,
    lesson: 'Eline geleni paylaştığında, daha çok gelir.',
    dusunceler: ['Kıtlık değil, bakış darlığı.','Verdiğim, geri dönüşün davetidir.','Yetecek olan, hep yetmiş.','Vermek, eksiltmek değil.','Diğerinin bolluğu, beni daraltmaz.'],
    inanclar: ['Bolluk paylaştıkça çoğalır.','Kıtlık bir alışkanlıktır, gerçeklik değil.','Cömertlik bir zenginlik, bir sınav.','Para, enerjinin bir biçimidir; akmadıkça kokar.','Bolluk önce zihinde olur.'],
    hisler: ['Açılan bir el, açılan bir kalp.','Vermeden gelen sade bir doygunluk.','Kıskançlık yerine selamlama.','Verirken hissedilen genişleme.','Birinin başarısına eşlik etmenin ısısı.'],
    davranislar: ['Başkasının kazancını gerçekten kutluyor.','Vermeyi hesap etmeden yapıyor.','Para konuşmasını korkmadan açıyor.','Sırasında faturayı önce o ödüyor.','Parayı sayıyor; ama tıkamadan, akıtarak.'],
  },
  {
    id: 'layik',
    roman: 'XI',
    name: 'LÂYIK',
    sub: 'Gezgin',
    whisper: 'olmaya lâyıksın',
    glyph: 'worthy',
    sigil: 'elmas',
    virtue: 'ozdeger',
    defaultState: 'locked',
    sealedDay: null,
    sealedDate: '—',
    requirement: 'Lâyık derinliğine ulaş',
    progress: 0.0,
    lesson: 'Lâyık olmak, izin beklemenin sonudur.',
    dusunceler: ['Lâyık olduğum şey, izin beklemez.','Kendimi kanıtlamaktan yorulmadım — kanıtlamayı bıraktım.','Var olmam yeter; ek bir sebep gerekmiyor.','Var olduğum için yeterim.','İzin dilemek için doğmadım.'],
    inanclar: ['Lâyık olmak, doğuştan; tartışmaya kapalı.','Sevgi kazanılmaz; alıştırılır.','Hak etmek bir eşik, lâyık olmak bir hâl.','Lâyıklık, doğuştandır; performans değil.','Sevgi kazanılmaz, paylaşılır.'],
    hisler: ['Hiçbir şey kanıtlamadan kalan bir dinginlik.','Övgüden de eleştiriden de sarsılmayan bir merkez.','Görünmek yerine olma huzuru.','Övgüde de eleştiride de sarsılmayan iç merkez.','Hiçbir şey kanıtlamadan kalan tam bir sakinlik.'],
    davranislar: ['Onay aramayı bıraktı.','Hatasını saklamadan, küçültmeden anlatıyor.','Övgüyü "teşekkürler" deyip indirmiyor.','Olduğu hâliyle görünmekten çekinmiyor.','Birisi ona değer verdiğinde içine alıyor.'],
  },
  {
    id: 'sessiz',
    roman: 'XII',
    name: 'SESSİZ',
    sub: 'Gezgin',
    whisper: 'sözün artık yetmez',
    glyph: 'silent',
    sigil: 'void',
    virtue: 'ozsevgi',
    defaultState: 'locked',
    sealedDay: null,
    sealedDate: '—',
    requirement: '12 mührü topla',
    progress: 0.0,
    lesson: 'Sessizlik, son mühürdür. Kim olduğun artık konuşmaz, görünür.',
    dusunceler: ['Söz, yapılan şey kadar konuşur.','Sessizlik bir kaçış değil, bir varış.','Söylenmesi gerekmeyen, en güçlü cümle.','Anlatmaya gerek yoksa anlatmıyorum.','Sözle açıklanan, çoğu zaman yaşanmıyor.'],
    inanclar: ['Kim olduğun, konuşmadan görünür.','Anlatmak ile olmak arasındaki fark, son derstir.','Sessizlik, en derin ses.','Sessizlik, son ders ve son yansımadır.','Asıl güç, gösterilmeye ihtiyaç duymayandır.'],
    hisler: ['Konuşma ihtiyacının düştüğü bir dolgunluk.','Yatışan bir iç deniz.','Görünmekten yorulmamış bir varlık.','Konuşmaktan vazgeçmenin getirdiği bir hafiflik.','Görünmeden var olmanın derin tatmini.'],
    davranislar: ['Açıklama yapmadan duruyor.','Olmadığı bir şeymiş gibi davranmıyor.','Yaşayışıyla anlatıyor; sözle değil.','Sosyal medyada paylaşmıyor; yaşıyor.','Tartışmada ısrar etmiyor; duruyor.'],
  },
];

export function getArchetypeById(id) {
  return ARKETIPLER_DATA.find(a => a.id === id) || null;
}

export function getAllArchetypeData() {
  return ARKETIPLER_DATA;
}

const CURRENT_ID = 'sozunu-tutan';

// Emre'nin curated kart önerisi — 10q "Kişiler" görünümünde spotlight olarak
// kullanılır (yalnız RAF modu boşken; kullanıcının kendi eşiği varsa o konuşur).
// Üç kart destenin yayınlanan kesitinden seçilir (12b2) ve bir ROTA çizer:
// yumuşak başlangıç → bu sıranın kartı → zirveyi sonraya bırak.
export const EMRE_ONERI = {
  pickId: 'temel-ozsaygi-kok',
  headline: 'Şu sıra sana iyi gelebilecek kişi: SINIRINI SAKİNCE KORUYAN.',
  yumusakKart: 'temel-ozsevgi-filiz',
  yumusakNot: 'Sınıra geçmeden önce kendine iyi davranmakta durmak istersen, ilk taş oraya iner — dolmayan bir kap sınırı da taşıyamaz.',
  uzakDur: 'temel-ozsevgi-tac',
  uzakNot: 'Kendinden Taşan\'a şimdi bakma. O, hattın tacı — önce dolmak var, taşmak sonra gelir.',
};

/* ══════════════════════════════════════════════════════
   STATE YÖNETİMİ
══════════════════════════════════════════════════════ */
function _getState(id) {
  return S._archetypes?.[id]?.state || ARKETIPLER_DATA.find(a => a.id === id)?.defaultState || 'locked';
}

function _getProgress(id) {
  const saved = S._archetypes?.[id]?.progress;
  if (saved !== undefined) return saved;
  return ARKETIPLER_DATA.find(a => a.id === id)?.progress ?? 0;
}

function _getSealedDate(id) {
  return S._archetypes?.[id]?.sealedDate || ARKETIPLER_DATA.find(a => a.id === id)?.sealedDate || '—';
}

function _getSealedDay(id) {
  return S._archetypes?.[id]?.sealedDay || ARKETIPLER_DATA.find(a => a.id === id)?.sealedDay || null;
}


export function getSuggestedArchetype() {
  const deck = _getDeck();
  const currentId = S._currentArchetypeId || CURRENT_ID;

  const reachable = deck.filter(a => a.state === 'reachable');
  if (reachable.length) return reachable[0];

  if (S._activeChallenge?.boss_id) {
    const bossArchMap = {
      erteleme: 'niyetli', onay: 'sabirli', kacis: 'durust',
      kizginlik: 'sabirli', yakistirma: 'hak-eden', kiyaslama: 'yansiyan',
    };
    const id = bossArchMap[S._activeChallenge.boss_id];
    const found = deck.find(a => a.id === id && a.id !== currentId);
    if (found) return found;
  }

  return deck.find(a => a.id !== currentId && a.state !== 'locked') || deck[0];
}


export async function _saveArchetypeProgress() {
  try {
    if (!window._idb) return;
    await window._idb.put('wanderer-kv', { key: 'archetypeProgress', value: S._archetypes });
  } catch (_) {}
}

function _getDeck() {
  return ARKETIPLER_DATA.map(a => ({
    ...a,
    state: _getState(a.id),
    progress: _getProgress(a.id),
    sealedDate: _getSealedDate(a.id),
    sealedDay: _getSealedDay(a.id),
  }));
}


/* ══════════════════════════════════════════════════════
   ARCHFIGURE — 12 SVG line-art figür (wsv3-screens.jsx birebir)
══════════════════════════════════════════════════════ */
export function wsArchFigure(glyph = 'wanderer', size = 100, color = 'var(--gold)', opacity = 1, halo = true) {
  const h = Math.round(size * 1.4);
  const body = wsArchFigureBody(glyph, color, halo);
  return `<svg viewBox="0 0 120 140" width="${size}" height="${Math.round(h * size / 100)}" style="opacity:${opacity};overflow:visible;">${body}</svg>`;
}

/* Figür gövdesi (svg iç markup'ı) — 12c sahne motoru figürü kendi SVG'sine
   <g transform> ile gömer; viewBox 0 0 120 140 varsayımıyla çizilidir. */
export function wsArchFigureBody(glyph = 'wanderer', color = 'var(--gold)', halo = true) {
  const c = color;
  const figures = {
    wanderer: `
      ${halo ? `<circle cx="60" cy="44" r="32" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.35"/>` : ''}
      <ellipse cx="60" cy="40" rx="9" ry="12" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M42 56 L60 54 L78 56 L78 110 Q78 130 60 132 Q42 130 42 110 Z" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M52 78 L57 130 M60 78 L60 132 M68 78 L63 130" stroke="${c}" stroke-width="0.5" opacity="0.5"/>
      <line x1="36" y1="36" x2="36" y2="140" stroke="${c}" stroke-width="0.8"/>
      <circle cx="36" cy="32" r="4" fill="${c}" fill-opacity="0.25" stroke="${c}" stroke-width="0.8"/>
      <path d="M60 10 L62 16 L68 16 L63 20 L65 26 L60 22 L55 26 L57 20 L52 16 L58 16 Z" fill="${c}" opacity="0.85"/>`,
    patient: `
      ${halo ? `<circle cx="60" cy="44" r="30" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.35"/>` : ''}
      <ellipse cx="60" cy="44" rx="9" ry="11" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M44 60 Q60 56 76 60 L80 100 Q80 116 60 120 Q40 116 40 100 Z" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M50 96 Q60 102 70 96" fill="none" stroke="${c}" stroke-width="1"/>
      <circle cx="60" cy="98" r="3" fill="none" stroke="${c}" stroke-width="0.9"/>
      <path d="M28 124 L92 124" stroke="${c}" stroke-width="0.8" opacity="0.6"/>
      <path d="M34 130 L86 130" stroke="${c}" stroke-width="0.5" opacity="0.4"/>
      <circle cx="60" cy="20" r="2" fill="${c}" opacity="0.7"/>
      <circle cx="60" cy="14" r="1.2" fill="${c}" opacity="0.45"/>`,
    grateful: `
      ${halo ? `<circle cx="60" cy="38" r="34" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.35"/>` : ''}
      <ellipse cx="60" cy="38" rx="9" ry="12" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M44 70 L24 32" stroke="${c}" stroke-width="1.2" stroke-linecap="round"/>
      <path d="M76 70 L96 32" stroke="${c}" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="24" cy="32" r="3" fill="none" stroke="${c}" stroke-width="0.9"/>
      <circle cx="96" cy="32" r="3" fill="none" stroke="${c}" stroke-width="0.9"/>
      <path d="M44 70 L60 56 L76 70 L74 124 Q60 132 46 124 Z" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M60 18 L60 8 M48 22 L42 14 M72 22 L78 14" stroke="${c}" stroke-width="0.7" opacity="0.7"/>`,
    mirror: `
      <line x1="60" y1="14" x2="60" y2="138" stroke="${c}" stroke-width="0.5" opacity="0.5" stroke-dasharray="2 3"/>
      <ellipse cx="40" cy="44" rx="8" ry="10" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M28 60 L40 56 L52 60 L52 110 Q40 122 28 110 Z" fill="none" stroke="${c}" stroke-width="1.2"/>
      <ellipse cx="80" cy="44" rx="8" ry="10" fill="none" stroke="${c}" stroke-width="1.2" opacity="0.45"/>
      <path d="M92 60 L80 56 L68 60 L68 110 Q80 122 92 110 Z" fill="none" stroke="${c}" stroke-width="1.2" opacity="0.45"/>
      <path d="M48 44 L72 44" stroke="${c}" stroke-width="0.6" opacity="0.5" stroke-dasharray="2 2"/>`,
    oathHand: `
      ${halo ? `<circle cx="60" cy="42" r="30" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.35"/>` : ''}
      <ellipse cx="60" cy="42" rx="9" ry="11" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M42 58 L60 56 L78 58 L78 124 Q60 134 42 124 Z" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M48 76 Q60 84 72 76 L66 90 L54 90 Z" fill="none" stroke="${c}" stroke-width="1"/>
      <path d="M60 84 L58 82 L60 80 L62 82 Z" fill="${c}" opacity="0.8"/>`,
    truth: `
      ${halo ? `<circle cx="60" cy="42" r="30" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.35"/>` : ''}
      <path d="M42 42 Q60 26 78 42 Q60 58 42 42 Z" fill="none" stroke="${c}" stroke-width="1.2"/>
      <circle cx="60" cy="42" r="6" fill="none" stroke="${c}" stroke-width="1.1"/>
      <circle cx="60" cy="42" r="2" fill="${c}"/>
      <path d="M42 64 L60 60 L78 64 L78 124 Q60 134 42 124 Z" fill="none" stroke="${c}" stroke-width="1.2"/>
      <line x1="78" y1="92" x2="92" y2="84" stroke="${c}" stroke-width="0.9"/>
      <circle cx="94" cy="80" r="6" fill="${c}" fill-opacity="0.2" stroke="${c}" stroke-width="1"/>`,
    courage: `
      ${halo ? `<circle cx="60" cy="42" r="32" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.35"/>` : ''}
      <ellipse cx="60" cy="38" rx="9" ry="11" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M42 56 L60 52 L78 56 L78 116 Q60 130 42 116 Z" fill="none" stroke="${c}" stroke-width="1.2"/>
      <line x1="60" y1="20" x2="60" y2="120" stroke="${c}" stroke-width="1.3"/>
      <line x1="48" y1="60" x2="72" y2="60" stroke="${c}" stroke-width="1.2"/>
      <circle cx="60" cy="18" r="3" fill="${c}"/>
      <path d="M60 124 L57 130 L60 134 L63 130 Z" fill="${c}" opacity="0.8"/>`,
    boundary: `
      <circle cx="60" cy="74" r="44" fill="none" stroke="${c}" stroke-width="1.2"/>
      <circle cx="60" cy="74" r="36" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.5" stroke-dasharray="3 3"/>
      <ellipse cx="60" cy="58" rx="8" ry="10" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M46 72 L60 70 L74 72 L74 104 Q60 114 46 104 Z" fill="none" stroke="${c}" stroke-width="1.2"/>
      <line x1="14" y1="74" x2="20" y2="74" stroke="${c}" stroke-width="1"/>
      <line x1="100" y1="74" x2="106" y2="74" stroke="${c}" stroke-width="1"/>`,
    deserve: `
      <path d="M44 24 L48 14 L54 22 L60 12 L66 22 L72 14 L76 24" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M44 24 L76 24" stroke="${c}" stroke-width="1.2"/>
      ${halo ? `<circle cx="60" cy="48" r="28" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.35"/>` : ''}
      <ellipse cx="60" cy="46" rx="9" ry="11" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M42 62 L60 60 L78 62 L78 124 Q60 134 42 124 Z" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M58 22 L62 22 L60 28 Z" fill="${c}"/>`,
    abundance: `
      ${halo ? `<circle cx="60" cy="42" r="30" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.35"/>` : ''}
      <ellipse cx="60" cy="42" rx="9" ry="11" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M42 60 L60 56 L78 60 L78 100 Q60 110 42 100 Z" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M44 102 L76 102 L72 122 L48 122 Z" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M44 102 Q34 110 30 130" fill="none" stroke="${c}" stroke-width="1" opacity="0.7"/>
      <path d="M76 102 Q86 110 90 130" fill="none" stroke="${c}" stroke-width="1" opacity="0.7"/>
      <circle cx="28" cy="132" r="1.5" fill="${c}"/>
      <circle cx="92" cy="132" r="1.5" fill="${c}"/>
      <circle cx="35" cy="124" r="1" fill="${c}" opacity="0.6"/>
      <circle cx="85" cy="124" r="1" fill="${c}" opacity="0.6"/>`,
    worthy: `
      <path d="M28 64 L28 130 M92 64 L92 130" stroke="${c}" stroke-width="1.2"/>
      <path d="M28 64 L28 30 L92 30 L92 64" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M28 130 L92 130" stroke="${c}" stroke-width="1.2"/>
      ${halo ? `<circle cx="60" cy="50" r="22" fill="none" stroke="${c}" stroke-width="0.5" opacity="0.35"/>` : ''}
      <ellipse cx="60" cy="50" rx="8" ry="10" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M44 68 L60 64 L76 68 L76 116 L44 116 Z" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M60 22 L62 26 L66 26 L63 29 L64 33 L60 30 L56 33 L57 29 L54 26 L58 26 Z" fill="${c}"/>`,
    silent: `
      <path d="M30 56 Q30 16 60 16 Q90 16 90 56 L90 130 Q60 142 30 130 Z" fill="none" stroke="${c}" stroke-width="1.2"/>
      <path d="M40 40 Q40 28 60 28 Q80 28 80 40 L80 64 Q60 72 40 64 Z" fill="${c}" fill-opacity="0.18" stroke="${c}" stroke-width="0.6"/>
      <circle cx="60" cy="50" r="1.6" fill="${c}"/>
      <path d="M44 80 L44 124 M76 80 L76 124 M60 76 L60 130" stroke="${c}" stroke-width="0.5" opacity="0.5"/>`,
  };
  return figures[glyph] || figures.wanderer;
}

/* ══════════════════════════════════════════════════════
   ARCHCARD — tarot kart bileşeni (12c kart dilinden)
   Anlam ekseni: altın = şimdi/mühür · lapis gece = eşik/hedef/sis
══════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════
   ARCHTRAITS — 4-sütun stat block + popup
══════════════════════════════════════════════════════ */


/* ══════════════════════════════════════════════════════
   ARKETİP EKRANI — EMEKLİ (2026-07-03)
   ───────────────────────────────────────────────────────
   Eski "Olmak İstediğin Kişi" tam-sayfa yüzeyi (statik 12 arketip
   destesi) yerini kullanıcının kendi tasarladığı hedef kimliğe bıraktı
   (10D-olmak-istedigin.js). switchView('arketip') artık 'oik'e alias'lanır.
   loadArketipView (route yüzeyi) SİLİNDİ. Zincirindeki yardımcılar
   (wsArchCard/wsArchTraitsHTML/_openTraitPopup/_getStreak/_getUserAdds/
   _loadArchetypeProgress/initArchetypes/TRAIT_FIELDS/TRAIT_SCALE) burada
   ölü bırakılmıştı; 2026-09-02 temizlik turunda SÖKÜLDÜ (denetim E1).
   Küme transitif olarak doğrulandı: dokuzunun da ne repo genelinde çağrısı
   vardı ne de canlı bir zincirden erişimi. Söküm tanım tanım yapıldı ve her
   adımda sözdizimi sınandı.
   GERİ GETİRME: git ref öncesi 12a-archetypes.js — loadArketipView bu
   blok + #arketip-view HTML'i + ws-arkv / ws-trait CSS + route ile döner.

   KORUNAN (canlı importlar — DOKUNMA): ARKETIPLER_DATA, getArchetypeById,
   getAllArchetypeData, getSuggestedArchetype, initArchetypes, _getDeck,
   wsArchFigure, wsArchFigureBody, EMRE_ONERI, _saveArchetypeProgress,
   (Not: bu liste eskiden _getUserAdds'i de "12b/12c/10q/09b/13l/02b/02c
   kullanır" diye korunanlara yazıyordu — ölçüldüğünde o çağrıların hiçbiri
   yoktu. Belge geçmişin fotoğrafıdır; koda karşı doğrulanmadan gerçek
   sayılmaz.)
══════════════════════════════════════════════════════ */
