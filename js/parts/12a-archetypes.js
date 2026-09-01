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
import { ikvCardFace } from './12c-kart-gorsel.js';

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

function _getUserAdds(id, field) {
  return S._archetypes?.[id]?.userAdds?.[field] || [];
}

export function initArchetypes() {
  if (!S._archetypes) S._archetypes = {};
  ARKETIPLER_DATA.forEach(a => {
    if (!S._archetypes[a.id]) {
      S._archetypes[a.id] = { state: a.defaultState, progress: a.progress ?? 0, sealedDay: a.sealedDay, sealedDate: a.sealedDate, userAdds: {} };
    }
  });

  // Mevcut arketipi S._personTransition'dan belirle
  const pt = S._personTransition;
  if (pt?.current?.description) {
    const desc = pt.current.description.toLowerCase();
    const match = ARKETIPLER_DATA.find(a => desc.includes(a.name.toLowerCase()) || desc.includes(a.id));
    if (match) S._currentArchetypeId = match.id;
  }
  if (!S._currentArchetypeId) S._currentArchetypeId = CURRENT_ID;

  _loadArchetypeProgress();
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

async function _loadArchetypeProgress() {
  try {
    if (!window._idb) return;
    const data = await window._idb.get('wanderer-kv', 'archetypeProgress');
    if (data?.value) Object.assign(S._archetypes, data.value);
  } catch (_) {}
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

function _getStreak() {
  return parseInt(document.getElementById('topbar-streak-count')?.textContent || '0', 10);
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
function wsArchCard(a, size = 'full', highlight = false) {
  const dims = { full: { w: 268 }, mid: { w: 168 }, mini: { w: 100 } }[size];

  const isCurrent  = a.state === 'current';
  const isSealed   = a.state === 'sealed';
  const isReach    = a.state === 'reachable';
  const isLocked   = a.state === 'locked';

  // hedef vurgusu (Arketip ekranı): mühürlü değilse "kapının ardındaki sen"
  const asGoal = (highlight && !isSealed && !isCurrent) || isReach;
  const palette = (isCurrent || isSealed) ? 'gold' : 'lapis';
  const kicker = size === 'mini' ? '' :
    (highlight && asGoal) ? 'OLMAK İSTEDİĞİN KİŞİ' :
    (isCurrent || isSealed) ? `${a.roman} · OLDUĞUN KİŞİ` : `${a.roman}`;
  const badge = isCurrent ? '◆ ŞİMDİ' : isSealed ? '✦ MÜHÜR' : isReach ? '◇ EŞİK' : (highlight ? '◇ HEDEF' : '· SİS');

  let animStyle = '';
  if (isCurrent && size !== 'mini') {
    animStyle = 'animation:wsv3CardIn 0.5s ease both,wsArchBreathGlow 3.5s ease-in-out 0.6s infinite;';
  } else if (isCurrent) {
    animStyle = 'animation:wsv3CardIn 0.5s ease both;';
  }
  const breathClass = isCurrent && size !== 'mini' ? ' ws-arch-card--breath' : '';

  const face = ikvCardFace(a, {
    palette,
    kicker,
    badge,
    sub: isLocked ? '· sis altında ·' : (a.whisper || a.sub || ''),
    fog: isLocked,
    mini: size === 'mini',
    star: asGoal,
  });

  return `<div class="ws-arch-card${breathClass}" style="width:${dims.w}px;position:relative;${animStyle}">${face}</div>`;
}

/* ══════════════════════════════════════════════════════
   ARCHTRAITS — 4-sütun stat block + popup
══════════════════════════════════════════════════════ */
const TRAIT_FIELDS = [
  { id: 'dusunceler',  label: 'DÜŞÜNCELER',  glyph: '◉' },
  { id: 'inanclar',    label: 'İNANÇLAR',    glyph: '✦' },
  { id: 'hisler',      label: 'HİSLER',      glyph: '❖' },
  { id: 'davranislar', label: 'DAVRANIŞLAR', glyph: '⟡' },
];
const TRAIT_SCALE = 5;

function wsArchTraitsHTML(a, dense = false) {
  const labelSize = dense ? 6.5 : 7;
  const valSize   = dense ? 16 : 18;
  return `<div class="ws-traits-grid" style="gap:${dense?8:12}px;">
    ${TRAIT_FIELDS.map(f => {
      const items = a[f.id] || [];
      const userAdds = _getUserAdds(a.id, f.id);
      const total = items.length + userAdds.length;
      const fillPct = Math.min(total, TRAIT_SCALE) / TRAIT_SCALE * 100;
      return `<button class="ws-trait-btn" data-arch-id="${a.id}" data-field="${f.id}" style="position:relative;">
        <div class="ws-trait-glyph" style="color:var(--gold);font-size:${dense?11:13}px;">${f.glyph}</div>
        <div class="ws-trait-val" style="font-size:${valSize}px;color:var(--text);">${total}<span style="font-size:10px;color:var(--text-dim);">/${TRAIT_SCALE}</span></div>
        <div class="ws-trait-label" style="font-size:${labelSize}px;color:var(--text-dim);">${f.label}</div>
        <div class="ws-trait-bar"><div class="ws-trait-bar-fill" style="width:${fillPct}%;"></div></div>
      </button>`;
    }).join('')}
  </div>`;
}

function _openTraitPopup(archId, fieldId) {
  const a = ARKETIPLER_DATA.find(x => x.id === archId);
  const field = TRAIT_FIELDS.find(f => f.id === fieldId);
  if (!a || !field) return;

  const existing = document.getElementById('ws-trait-popup');
  if (existing) existing.remove();

  const items = a[fieldId] || [];
  const userAdds = _getUserAdds(archId, fieldId);

  const popup = document.createElement('div');
  popup.id = 'ws-trait-popup';
  popup.className = 'ws-trait-popup';

  const placeholders = { dusunceler: 'içinden geçen bir cümle…', inanclar: 'inandığın bir doğru…', hisler: 'içinde olan bir his…', davranislar: 'yaptığın bir davranış…' };

  popup.innerHTML = `
    <div class="ws-trait-popup-inner" id="ws-trait-popup-inner">
      <svg width="14" height="14" viewBox="0 0 14 14" style="position:absolute;top:-1px;left:-1px;"><path d="M0 7 L0 0 L7 0" fill="none" stroke="var(--gold)" stroke-width="1.2"/></svg>
      <svg width="14" height="14" viewBox="0 0 14 14" style="position:absolute;top:-1px;right:-1px;"><path d="M14 7 L14 0 L7 0" fill="none" stroke="var(--gold)" stroke-width="1.2"/></svg>
      <svg width="14" height="14" viewBox="0 0 14 14" style="position:absolute;bottom:-1px;left:-1px;"><path d="M0 7 L0 14 L7 14" fill="none" stroke="var(--gold)" stroke-width="1.2"/></svg>
      <svg width="14" height="14" viewBox="0 0 14 14" style="position:absolute;bottom:-1px;right:-1px;"><path d="M14 7 L14 14 L7 14" fill="none" stroke="var(--gold)" stroke-width="1.2"/></svg>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="color:var(--gold-bright);font-size:14px;line-height:1;">${field.glyph}</span>
          <div>
            <div style="font-family:var(--cinzel);font-size:11px;letter-spacing:3px;color:var(--gold);font-weight:700;">${field.label}</div>
            <div style="font-family:var(--fell);font-style:italic;font-size:9px;color:var(--text-dim);letter-spacing:1.5px;margin-top:2px;">${a.name.toLowerCase()} ${a.sub.toLowerCase()}</div>
          </div>
        </div>
        <button id="ws-trait-popup-close" style="background:transparent;border:1px solid var(--border);color:var(--text-mid);cursor:pointer;width:24px;height:24px;padding:0;font-family:var(--cinzel);font-size:14px;line-height:1;">×</button>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;">
        <div style="flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--gold) 40%,transparent);opacity:0.55;"></div>
        <span style="color:var(--gold);font-size:7px;">◆</span>
        <div style="flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--gold) 60%,transparent);opacity:0.55;"></div>
      </div>
      <div style="overflow-y:auto;flex:1;margin-right:-6px;padding-right:6px;">
        <ul style="margin:0;padding:0;list-style:none;font-family:var(--serif);font-style:italic;font-size:12px;line-height:1.5;color:var(--text);">
          ${items.map(t => `<li style="padding-left:18px;margin-bottom:8px;position:relative;"><span style="position:absolute;left:0;top:8px;width:10px;height:1px;background:var(--gold);opacity:0.8;display:block;"></span>${t}</li>`).join('')}
          ${userAdds.map(t => `<li style="padding-left:18px;margin-bottom:8px;position:relative;color:var(--gold-bright);"><span style="position:absolute;left:0;top:7px;color:var(--gold-bright);font-size:9px;">✦</span>${t}</li>`).join('')}
        </ul>
        <div style="margin-top:14px;padding-top:12px;border-top:1px dashed var(--border);">
          <div style="font-family:var(--cinzel);font-size:8px;letter-spacing:2.5px;color:var(--gold);font-weight:700;margin-bottom:6px;">◇ SEN NE EKLERDİN?</div>
          <div style="font-family:var(--serif);font-style:italic;font-size:11px;color:var(--text-mid);line-height:1.45;margin-bottom:10px;">
            Bir an için bu kişi olduğunu hayal et — buraya hangi ${field.label.toLowerCase()} satırını eklerdin?
          </div>
          <div id="ws-trait-draft-area">
            <button id="ws-trait-add-btn" style="width:100%;padding:14px 12px;background:rgba(184,149,60,0.04);border:1px dashed var(--gold);color:var(--gold);cursor:pointer;font-family:var(--cinzel);font-size:10px;letter-spacing:2.5px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;">
              <span style="font-size:14px;line-height:1;">+</span><span>SEN EKLE</span>
            </button>
          </div>
        </div>
      </div>
    </div>`;

  document.body.appendChild(popup);

  // Close handlers
  const close = () => popup.remove();
  popup.addEventListener('click', e => { if (e.target === popup) close(); });
  document.getElementById('ws-trait-popup-close').addEventListener('click', close);

  // ESC
  const onKey = e => { if (e.key === 'Escape') { close(); window.removeEventListener('keydown', onKey); } };
  window.addEventListener('keydown', onKey);

  // Draft
  function attachDraftEditor() {
    const draftArea = document.getElementById('ws-trait-draft-area');
    draftArea.innerHTML = `
      <textarea id="ws-trait-textarea" placeholder="${placeholders[fieldId]}" style="width:100%;min-height:50px;background:rgba(0,0,0,0.35);border:1px solid var(--gold);color:var(--text);font-family:var(--serif);font-style:italic;font-size:12px;padding:8px;resize:none;outline:none;line-height:1.4;"></textarea>
      <div style="display:flex;gap:6px;margin-top:8px;">
        <button id="ws-trait-commit" style="flex:2;padding:8px 10px;background:rgba(184,149,60,0.25);color:var(--bg);border:none;font-family:var(--cinzel);font-size:9px;letter-spacing:2.5px;font-weight:700;cursor:pointer;">✦ MÜHÜRLE</button>
        <button id="ws-trait-cancel" style="flex:1;padding:8px 10px;background:transparent;color:var(--text-mid);border:1px solid var(--border);cursor:pointer;font-family:var(--cinzel);font-size:9px;letter-spacing:2px;">VAZGEÇ</button>
      </div>`;

    const ta = document.getElementById('ws-trait-textarea');
    ta.focus();
    ta.addEventListener('input', () => {
      const btn = document.getElementById('ws-trait-commit');
      if (btn) btn.style.background = ta.value.trim() ? 'var(--gold)' : 'rgba(184,149,60,0.25)';
    });

    document.getElementById('ws-trait-commit').addEventListener('click', () => {
      const val = ta.value.trim();
      if (!val) return;
      if (!S._archetypes[archId].userAdds) S._archetypes[archId].userAdds = {};
      if (!S._archetypes[archId].userAdds[fieldId]) S._archetypes[archId].userAdds[fieldId] = [];
      S._archetypes[archId].userAdds[fieldId].push(val);
      _saveArchetypeProgress();
      close();
    });

    document.getElementById('ws-trait-cancel').addEventListener('click', () => {
      draftArea.innerHTML = `<button id="ws-trait-add-btn" style="width:100%;padding:14px 12px;background:rgba(184,149,60,0.04);border:1px dashed var(--gold);color:var(--gold);cursor:pointer;font-family:var(--cinzel);font-size:10px;letter-spacing:2.5px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;"><span style="font-size:14px;line-height:1;">+</span><span>SEN EKLE</span></button>`;
      document.getElementById('ws-trait-add-btn').addEventListener('click', attachDraftEditor);
    });
  }

  document.getElementById('ws-trait-add-btn').addEventListener('click', attachDraftEditor);
}

/* ══════════════════════════════════════════════════════
   ARKETİP EKRANI — EMEKLİ (2026-07-03)
   ───────────────────────────────────────────────────────
   Eski "Olmak İstediğin Kişi" tam-sayfa yüzeyi (statik 12 arketip
   destesi) yerini kullanıcının kendi tasarladığı hedef kimliğe bıraktı
   (10D-olmak-istedigin.js). switchView('arketip') artık 'oik'e alias'lanır.
   loadArketipView (route yüzeyi) SİLİNDİ. Yalnız onun zincirindeki
   yardımcılar (wsArchCard/wsArchTraitsHTML/_openTraitPopup/_getStreak/
   _getUserAdds/TRAIT_FIELDS/TRAIT_SCALE) artık ÇAĞRILMIYOR — ölü kod
   olarak bırakıldı, ayrı bir temizlik turunda birlikte sökülebilir
   (birbirine bağlı küme; tek tek silmek gizli bağımlılık riski taşır).
   GERİ GETİRME: git ref öncesi 12a-archetypes.js — loadArketipView bu
   blok + #arketip-view HTML'i + ws-arkv / ws-trait CSS + route ile döner.

   KORUNAN (canlı importlar — DOKUNMA): ARKETIPLER_DATA, getArchetypeById,
   getAllArchetypeData, getSuggestedArchetype, initArchetypes, _getDeck,
   wsArchFigure, wsArchFigureBody, EMRE_ONERI, _saveArchetypeProgress,
   _getUserAdds (12b/12c/10q/09b/13l/02b/02c kullanır).
══════════════════════════════════════════════════════ */
