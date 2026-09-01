/* ═══════════════════════════════════════════════════════════════════
   12f1 — HAZİNE DESTESİ · VERİ YAPRAĞI (SETLER + KARTLAR)
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Kimlik kartları (12b) "kim olduğunu" anlatır — davranışla kazanılır,
     dokunulmaz. Hazine kartları "ne bildiğini" toplar: kitabın manifestosu,
     derinlikleri, temelleri, panzehirleri, çerçeveleri, aforizmaları ve
     Işık Kanonu — Elmas'la açılan paketlerden çıkar. İçerik kitaptan
     BİREBİR ya da onun özetinden türetilir (bkz. PROTOKOL-FABLE §6.3,
     manevi register sekülerleştirilemez); uydurma metin yok.
   MEKANİK / TEK GİRİŞ:
     SAF YAPRAK — davranış yok, import yok (12b2/12e1 deseninin ikizi).
     Ana bundle'a GİRMEZ: js/ext/hazine.js bunu re-export eder, build.sh
     ext-hazine.js sidecar'ı üretir; 12f `hazineReady()` ile ensureExt
     üzerinden ihtiyaç anında ister.
   Işık Kanonu seti bilinçli olarak SATILAMAZ (satilamaz:true) — ayet
     kartları RNG'ye asla girmez, yalnız armağan/set-tamamlama ile
     deterministik sırayla verilir (bkz. 12f hzAyetCursorNext).
   Kalıcılık: yok (sabit veri). Durum 12f'de (etw_hazine_v1_<uid>).
═══════════════════════════════════════════════════════════════════ */

export const SETLER = [
  { id: 'manifesto',   ad: 'Manifesto',   glyph: '⟡', palette: 'gold' },
  { id: 'derinlikler', ad: 'Derinlikler', glyph: '◈', palette: 'gold' },
  { id: 'temeller',    ad: 'Temeller',    glyph: '❖', palette: 'gold' },
  { id: 'perdeler',    ad: 'Perdeler',    glyph: '◇', palette: 'gold' },
  { id: 'zehirler',    ad: 'Zehirler',    glyph: '◐', palette: 'gold' },
  { id: 'tuzaklar',    ad: 'Tuzaklar',    glyph: '⊘', palette: 'gold' },
  { id: 'cerceveler',  ad: 'Çerçeveler',  glyph: '✦', palette: 'gold' },
  { id: 'aforizmalar', ad: 'Aforizmalar', glyph: '❋', palette: 'gold' },
  { id: 'isik_kanonu', ad: 'Işık Kanonu', glyph: '☀', palette: 'lapis', satilamaz: true },
];

/* ── Manifesto — Zihniyet Devrimi'ne Çağrı, 12 madde (özleri birebir) ── */
const MANIFESTO = [
  { n: 'I',    name: 'Hakikat', sub: 'Mesele Sensin', virtue: 'yansima', rarity: 'efsane',
    quote: 'Hayatında değiştirmek istediğin her şeyin kaynağı dışarıda değil, içindedir. Koşullar, insanlar ya da şans seni belirlemez; olduğun kişi belirler. Dönüşümün ilk ve tek gerçek adımı bunu kabul etmektir.' },
  { n: 'II',   name: 'Hayal', sub: 'Hayal Alemi Hayal Değildir', virtue: 'niyet', rarity: 'nadide',
    quote: 'Zihinde canlı tutulan hayaller gerçekliği şekillendiren en güçlü araçtır. Hayal kurmak kaçmak değil, olmak istediğin kişiyi önceden yaşamaktır. Zihnin inşa ettiği her şey, bir gün ellerin inşa edeceğinin planıdır.' },
  { n: 'III',  name: 'Uyum', sub: 'Kalp ve Zihin Birlikte Olmalıdır', virtue: 'durust', rarity: 'nadir',
    quote: 'Ne yalnızca mantık ne de yalnızca his tek başına yeterlidir; ikisi uyum içinde çalıştığında gerçek güç ortaya çıkar. Kalbinin duymadığı kararlar uzun vadede sürdürülemez; zihninin onaylamadığı duygular seni sürükler.' },
  { n: 'IV',   name: 'Ayna', sub: 'İnançlar Hayatın Belirleyicisidir', virtue: 'yansima', rarity: 'nadir',
    quote: 'Gerçek olmayan ama gerçekmiş gibi hissettiren inançlar seni görünmez bir kafeste tutar. Hangi inancı beslersin, o inanç hangi gerçekliği yaratacağını belirler. İnançlarını değiştirmek, kaderini değiştirmektir.' },
  { n: 'V',    name: 'Sarmal', sub: 'Düşünceler Başlangıç Noktasıdır', virtue: 'odak', rarity: 'nadide',
    quote: 'Her duygu bir düşünceden, her davranış bir duygudan, her sonuç bir davranıştan doğar. Zincirin ilk halkası daima bir düşüncedir; hayatını değiştirmek istiyorsan düşüncenle başla.' },
  { n: 'VI',   name: 'Adak', sub: 'Hayat Seçimlerden Oluşur', virtue: 'sebat', rarity: 'yaygin',
    quote: 'Büyük kaderler büyük anlarda değil, her günün küçük seçimlerinde şekillenir. Seçimsiz geçen hiçbir an yoktur; hareketsizlik de bir seçimdir.' },
  { n: 'VII',  name: 'Gölge', sub: 'Sorunların Kaynağı Olunan Kişidir', virtue: 'yansima', rarity: 'nadir',
    quote: 'Sorunlar tesadüf değil; olduğun kişinin bir yansımasıdır. Çevreyi, koşulları ya da başkalarını değiştirmek sorunun kaynağını çözmez. Kişiyi değiştirmek, sorunların kendiliğinden çözüldüğünü görmektir.' },
  { n: 'VIII', name: 'Hak', sub: 'İstenen Hayatı O Hayatı Hak Eden Yaşar', virtue: 'ozdeger', rarity: 'efsane',
    quote: 'Arzuladığın hayat, sahip olduğun koşulların değil, olduğun kişinin hak ettiği kadar gerçektir. O hayatı yaşamak için önce o hayatı yaşayan kişi olmak gerekir.' },
  { n: 'IX',   name: 'Cesaret', sub: 'Hayatının Sorumluluğu Sende', virtue: 'ozguven', rarity: 'nadide',
    quote: 'Mağdur olmak bir hikâye; sorumluluğu almak bir seçimdir. Her şey olmayabilir senin elinde, ama verdiğin tepki, yorumladığın anlam ve attığın adım daima öyledir.' },
  { n: 'X',    name: 'Elmas', sub: 'Toplum İçin Kendini En İyi Biçimde Yetiştir', virtue: 'bolluk', rarity: 'nadir',
    quote: 'Bir insanın topluluğuna verebileceği en büyük armağan, en iyi versiyonuna ulaşmış kendi benliğidir. Kendine yatırım yapmak bencillik değil; toplumsal bir sorumluluktur.' },
  { n: 'XI',   name: 'Adalet', sub: 'Hak, Hukuk ve Adalet Her Toplumun Temelidir', virtue: 'durust', rarity: 'yaygin',
    quote: 'Bireysel dönüşüm toplumsal bir zemine ihtiyaç duyar; adalet olmadan insan potansiyeli tam açılamaz. İç dünya kadar dış dünya da inşa edilmeyi hak eder.' },
  { n: 'XII',  name: 'İman', sub: 'Allah İnsanlarladır, Sen Yalnız Değilsin', virtue: 'sukur', rarity: 'efsane',
    quote: 'En derin dönüşümün anlarında bile yalnız değilsin; anlam ve destek daha büyük bir kaynaktan gelir. Mesele sensin — ama sen de çok daha büyük bir bütünün parçasısın.' },
].map(m => ({
  id: 'hz_manifesto_' + m.n.toLowerCase(), set: 'manifesto', glyph: '⟡',
  name: m.name, sub: m.sub, quote: m.quote, virtue: m.virtue, rarity: m.rarity,
  source: `Zihniyet Devrimi'ne Çağrı · Manifesto ${m.n}`,
}));

/* ── Derinlikler — İlişki Felsefesi, 4 kavram × (Tanım + Olumlama) ──── */
const DERINLIK_DEFS = {
  standart: { ad: 'Standart', virtue: 'sebat',
    tanim: 'Standart, içinde yaşadığın alt ve üst sınırlı kutudur; ortalaması çoğu zaman senin yaşadığın yerdir. Düşük bir standart içindeyken kötü davranışı reddedemez, gidemezsin — hatta sana iyi davranandan bile kaçarsın.',
    olumlama: '"Ben yüksek standartlarla yaşayan bir insanım." Yüksek standartla yaşayan kişinin gözlerinden bak — o kişi ne görüyor?' },
  hak_etmek: { ad: 'Hak Etmek', virtue: 'ozdeger',
    tanim: 'İnsan her zaman seçimlerinin sonucunu, yani hak ettiğini yaşar. Hak etmek, kalben ve zihnen birlikte BİLMEK üzerinedir — hak edip sahip olamadığında henüz zamanı gelmemiştir; sabret ve çalışmaya devam et.',
    olumlama: '"Ben bunu hak eden bir insanım — bunu kalbimle biliyorum." Hak eden kişi olarak kendine bak; o kişi bunu kalben bilir, dışarıdan onaya ihtiyaç duymaz.' },
  normal: { ad: 'Normal', virtue: 'yansima',
    tanim: 'İstenen ilişki, "Bunda ne var ki? Olması gereken bu." denebilen bir olağanlık olmalı. Normalleşmemiş iyiyi insan ya normalleştirir ya da kendini sabote edip üzerinden atar.',
    olumlama: '"Bu hayat benim normalim." O hayatı yaşayan kişi olarak bak — "bunda ne var ki?" diyebilen kişi.' },
  layik: { ad: 'Layık', virtue: 'ozguven',
    tanim: 'Kendini layık gördüğün yere taşınırsın. Layık görmediğin şeye çalışmaz, gelse bile itersin; layık görmediğin bir konum verilse bile kalben ve zihnen oradan uzaklaşırsın.',
    olumlama: '"Ben buna layık bir insanım." Layık gören kişi olarak bak — o kişi iyilik karşısında huzurludur.' },
};
const DERINLIKLER = Object.entries(DERINLIK_DEFS).flatMap(([id, d]) => ([
  { id: 'hz_derinlik_' + id + '_tanim', set: 'derinlikler', glyph: '◈',
    name: d.ad, sub: 'Derinlik · Tanım', quote: d.tanim, virtue: d.virtue, rarity: 'nadir',
    source: `İlişki Felsefesi · Derinlikler · ${d.ad}` },
  { id: 'hz_derinlik_' + id + '_olumlama', set: 'derinlikler', glyph: '◈',
    name: d.ad, sub: 'Günlük Olumlama', quote: d.olumlama, virtue: d.virtue, rarity: 'yaygin',
    source: `İlişki Felsefesi · Derinlikler · ${d.ad}` },
]));
// Normal · Tanım tek başına ağırlık taşır (dördün en çok gözden kaçanı) — nadide.
DERINLIKLER.find(c => c.id === 'hz_derinlik_normal_tanim').rarity = 'nadide';

/* ── Temeller — İlişki Felsefesi, 5 Temel + Bolluk + Birlik kartı ──── */
const TEMELLER = [
  { id: 'hz_temel_oz_sevgi', name: 'Öz Sevgi', virtue: 'ozsevgi', rarity: 'nadir',
    quote: 'Kendine sevgiyle yaklaşmak, önce kendi ihtiyaçlarını karşılamaktır. "Ben kendimi seven bir insanım."' },
  { id: 'hz_temel_oz_saygi', name: 'Öz Saygı', virtue: 'ozsaygi', rarity: 'nadir',
    quote: 'Sınır koyabilmek, saygısızlığa net tepki vermektir. "Ben kendine saygı duyan bir insanım."' },
  { id: 'hz_temel_oz_deger', name: 'Öz Değer', virtue: 'ozdeger', rarity: 'nadide',
    quote: 'Kendini değerli bulmak, varlığının toplumuna kattığı değeri görmektir. "Ben değerli bir insanım."' },
  { id: 'hz_temel_oz_guven', name: 'Öz Güven', virtue: 'ozguven', rarity: 'nadir',
    quote: 'Kendi kararlarına güvenmek, başkalarının onayına bağımlı olmamaktır. "Ben kendi kararlarına güvenen bir insanım."' },
  { id: 'hz_temel_bolluk', name: 'Bolluk', virtue: 'bolluk', rarity: 'nadide',
    quote: 'Hayata kıtlıkla değil bollukla bakmak. "Ben bolluk bilinciyle yaşayan bir insanım." Bolluk bilinci olan kişi için nimetler boldur, korku yoktur.' },
  { id: 'hz_temel_birlik', name: 'Temellerin Birliği', virtue: 'sukur', rarity: 'efsane',
    quote: 'İlişkiden en temelde beklenen sevgi, saygı, değer ve güvendir — önce bunları kendine ver. Kendine verdikçe muhtaç kalmaz, daha çekici olur; ihtiyacın standardın, hakkın, normalin ve layığın olur.' },
].map(c => ({ ...c, set: 'temeller', glyph: '❖', sub: 'Temel', source: 'İlişki Felsefesi · Temeller' }));

/* ── Perdeler / Zehirler / Tuzaklar — Zihniyet Devrimi panzehirleri
   (kaynak: 10h-w2-library-challenges.js ENGELLER + 15b eng.item.*.panzehir —
   PANZEHİR metni birebir; yeni yazılmadı, mevcut kaynaktan taşındı). ──── */
const PERDELER = [
  { id: 'belirsizlik', name: 'Belirsizliğe Tahammülsüzlük', sub: 'Netlik gelmeden adım atamamak', virtue: 'ozguven', rarity: 'nadir',
    quote: 'Belirsizlik herkesin hayatında var; mesele ona ettiğin tahammül. Perdenin üzerine yürü, içinden geç — diğer taraf o kadar da kötü değil.' },
  { id: 'korku', name: 'Korku Perdesi', sub: 'Korkarak korktuğunu başına getirmek', virtue: 'ozguven', rarity: 'nadide',
    quote: '"Korktuğun şey başına gelir." Korkudan kaçma, içinden geç. "Ya başarısız olursam?" → olabilirsin; geriye iyiyi seçmek kalır.' },
  { id: 'bulanik-dusunce', name: 'Netleşmeyen Düşünceler', sub: 'Zihnin bulanık, geçeni fark etmiyorsun', virtue: 'odak', rarity: 'nadir',
    quote: 'Kendinle konuş; yaz veya sesini kaydet. İstemediğin düşünceyi fark et, istediğinle değiş tokuş et.' },
  { id: 'olumsuz-cevre', name: 'Olumsuz Çevre', sub: 'Çevre dışarıdan içeriye olumsuzlaştırır', virtue: 'bolluk', rarity: 'yaygin',
    quote: 'Önce kendine bak: nasıl bir insansan öyle insanlarla olursun. Sonra gerekirse çevreni seç.' },
  { id: 'olumsuz-aliskanlik', name: 'Olumsuz Alışkanlıklar', sub: 'Sabah/akşam alışkanlıkların seni oluşturur', virtue: 'sebat', rarity: 'yaygin',
    quote: 'İstediğin alışkanlıkları seç. Ko-Zo: iyiye giden yolu kolaylaştır, kötüye gideni zorlaştır.' },
  { id: 'erteleme', name: 'Erteleme Perdesi', sub: '"Sonra yaparım" hayallerine çektiğin perde', virtue: 'sebat', rarity: 'nadir',
    quote: 'Suya direkt atlar gibi başla. Ertelemenin arkasındaki korkuyu yaz; kısa hazzın uzun zararını gör.' },
].map(c => ({ id: 'hz_perde_' + c.id, set: 'perdeler', glyph: '◇', name: c.name, sub: c.sub, quote: c.quote, virtue: c.virtue, rarity: c.rarity, source: "Zihniyet Devrimi'ne Çağrı · 6 Perde" }));

const ZEHIRLER = [
  { id: 'sikayet', name: 'Sürekli Şikayet', sub: 'Sorumluluğu karşıya atmak', virtue: 'ozdeger', rarity: 'nadir',
    quote: 'Tüm sorumluluğu al; her zaman yapabileceğin bir şey var. Şikayeti çözüme çevir.' },
  { id: 'herkesi-memnun', name: 'Herkesi Memnun Etme', sub: 'Boşa kürek çekmek', virtue: 'ozsaygi', rarity: 'nadide',
    quote: 'Gerektiğinde hayır de. Arkasındaki onay ihtiyacını fark et; herkesi memnun edemezsin.' },
  { id: 'kucumseme', name: 'Kendini Küçümseme / Büyütme', sub: 'Kibir = aşağılık kompleksi', virtue: 'ozdeger', rarity: 'nadir',
    quote: 'Herkesi insani değerde eşit gör. Kimsenin senden üstünlüğü veya aşağısı yok.' },
  { id: 'kararsizlik', name: 'Kararsızlık', sub: 'Karar vermemek de bir karardır', virtue: 'ozguven', rarity: 'yaygin',
    quote: 'Her an seçiyorsun; kararsızlık diye bir şey yok. Karara haddini aşan önem yükleme.' },
  { id: 'negatif-insan', name: 'Negatif İnsanlara Bağımlılık', sub: 'Onlarla hayata sövmek', virtue: 'bolluk', rarity: 'yaygin',
    quote: 'Dışarıdan gözlemle: bu birliktelik fayda mı zarar mı? Gerekirse açıkla ve uzaklaş.' },
  { id: 'gecmiste-yasama', name: 'Geçmişte Yaşama', sub: 'Şimdiyi unutmak', virtue: 'yansima', rarity: 'nadir',
    quote: 'Geçmişten dersini al ve ilerle. Bugünün de bir geçmiş olacağını bilerek kıymetini bil.' },
].map(c => ({ id: 'hz_zehir_' + c.id, set: 'zehirler', glyph: '◐', name: c.name, sub: c.sub, quote: c.quote, virtue: c.virtue, rarity: c.rarity, source: "Zihniyet Devrimi'ne Çağrı · 6 Zehir" }));

const TUZAKLAR = [
  { id: 'kiyas', name: 'Kıyas Tuzağı', sub: 'Başkasıyla ölçme hastalığı', virtue: 'ozdeger', rarity: 'nadir',
    quote: 'Herkesin hayatı benzersiz. Ders ya da tavsiye al, sonra dön kendine odaklan: sen ne yapabilirsin?' },
  { id: 'erteleme-t', name: 'Erteleme Tuzağı', sub: 'Birikenlerin altında ezilmek', virtue: 'sebat', rarity: 'yaygin',
    quote: 'Ertelemeyi prensiple kır: ne zaman erteleyecek olsan direkt harekete geç.' },
  { id: 'sabirsizlik', name: 'Sabırsızlık Tuzağı', sub: 'Büyük ödüller sabredene', virtue: 'sebat', rarity: 'yaygin',
    quote: 'Fiziki alemde değişim zaman alır. Sabret, hedefinin yolunda ısrarla ilerle.' },
  { id: 'korku-t', name: 'Korku Tuzağı', sub: 'Korkarak başaramamak', virtue: 'ozguven', rarity: 'nadir',
    quote: 'Her ihtimali kabul et, bir geri çekilme alanı kur ve harekete geç.' },
  { id: 'odak-kaybi', name: 'Odak Kaybı Tuzağı', sub: 'Aynı anda her şeyi yapmak', virtue: 'odak', rarity: 'nadide',
    quote: 'Dikkatin bir tane. Tek tek, kaliteli ilerle — kalp ve zihinle uyumlu Süper Odak.' },
  { id: 'gecmis-t', name: 'Geçmiş Tuzağı', sub: 'Eski hatalarla yeni adımı engellemek', virtue: 'yansima', rarity: 'nadir',
    quote: 'Geçmişe ders için bak; kendini güncelle ve yeni adımı at.' },
  { id: 'kusursuzluk', name: 'Kusursuzluk Tuzağı', sub: 'Mükemmeliyetçilik kusur yaratır', virtue: 'durust', rarity: 'nadide',
    quote: 'Titiz çalış, sonra tevekkül et ve yap. "Kusursuz" çoğu zaman bir illüzyondur.' },
].map(c => ({ id: 'hz_tuzak_' + c.id, set: 'tuzaklar', glyph: '⊘', name: c.name, sub: c.sub, quote: c.quote, virtue: c.virtue, rarity: c.rarity, source: "Zihniyet Devrimi'ne Çağrı · 7 Tuzak" }));

/* ── Çerçeveler — Zihniyet Devrimi çerçeve kataloğu (yazı no'larıyla) ── */
const CERCEVELER = [
  { id: 'kazanma-yontemi', no: '#52, #75', name: 'Kazanma Yöntemi', sub: 'Sürekli başarısızlıkta hedefi değil yöntemi değiştir', virtue: 'sebat', rarity: 'nadir',
    quote: 'Başarısız olmakta da bir tür başarılısın — bu perspektifi tersine çevir. İlk denemelerde ısrar gerekebilir, ama sonuç gelmiyorsa değiştirmen gereken hedef değil yöntemdir.' },
  { id: 'ko-zo', no: '#59', name: 'Ko-Zo', sub: 'İstediğine giden yolu kolaylaştır, istemediğini zorlaştır', virtue: 'niyet', rarity: 'nadir',
    quote: 'İstediğine giden yolu Kolaylaştır, istemediğine gideni Zorlaştır. Ortam doğru kurulunca disiplin daha az gerekir.' },
  { id: 'degerlendirme', no: '#86-89', name: 'Değerlendirme Dizisi', sub: 'Gün · Hafta · Ay · Yıl döngüsü', virtue: 'yansima', rarity: 'nadide',
    quote: 'Her gün %1 iyileşmek yılda 37 kat büyür. Günü değerlendir, haftayı sorgula, ayı tasarla, yıla bir-iki ana amaç koy.' },
  { id: 'super-odak', no: '#134', name: 'Süper Odak', sub: 'Kalp ve zihinle uyumlu net hedef', virtue: 'odak', rarity: 'nadir',
    quote: 'Kalp ve zihinle uyumlu, net bir hedefin varsa odak kendiliğinden gelir. Hedefle uyumsuz zorunlu işleri de hedefe bağla.' },
  { id: 'uc-prensip', no: '#54', name: '3 Prensip', sub: 'Hayatım gönlümün aynası', virtue: 'durust', rarity: 'efsane',
    quote: '"Hayatım Gönlümün Aynası." "Hayatımdan Ben Sorumluyum." "Kendime Yaparım." — iyilik de kötülük de kendine döner.' },
  { id: 'kirmizi-isik', no: '#147', name: 'Kırmızı Işık', sub: 'Engel bazen bir dur işaretidir', virtue: 'ozguven', rarity: 'nadir',
    quote: 'Her engel aşılması gereken bir sınav değildir; bazen bir dur işaretidir. Kalp ve zihinle ayırt et.' },
  { id: 'yanlis-orman', no: '#140', name: 'Yanlış Orman', sub: 'Doğru alanda mı çalışıyorsun?', virtue: 'niyet', rarity: 'nadide',
    quote: 'Olağanüstü çalışıp kazanmak bile yanlış ormanda olduğun gerçeğini değiştirmez. Önce doğru ormanda olduğundan emin ol.' },
  { id: 'batik-maliyet', no: '#148', name: 'Batık Maliyet', sub: 'Ne sabırsızlıkla kes, ne batık maliyetle büyüt', virtue: 'sebat', rarity: 'nadir',
    quote: 'Bir ağacı ne sabırsızlıkla erken kesersin ne batık maliyetle sonsuza dek büyütürsün. Eski kişi de kesilmesi gereken bir ağaç olabilir.' },
  { id: '104-vurus', no: '#51, #141', name: '104 Vuruş', sub: "100'de pes etme", virtue: 'sebat', rarity: 'yaygin',
    quote: "Duvar 104 vuruşta çatlar; 100'de bırakan hiçbir kırılma göremez. Sonuç görünmüyor diye yol yanlış değildir." },
  { id: 'anda-kalma', no: '#43, #58', name: 'Anda Kalma', sub: 'Nefes · kalp atışı · doku', virtue: 'sukur', rarity: 'yaygin',
    quote: 'Diyaframdan nefes al, kalp atışını elinle dinle, arkadaki senden şimdiki seni izle, işin dokusuna odaklan — dört kapı, tek an.' },
].map(c => ({ id: 'hz_cerceve_' + c.id, set: 'cerceveler', glyph: '✦', name: c.name, sub: c.sub, quote: c.quote, virtue: c.virtue, rarity: c.rarity, source: `Zihniyet Devrimi'ne Çağrı · ${c.no}` }));

/* ── Aforizmalar — kanonik 12 (verbatim; PROTOKOL §6.3 tez verbatim kalır) ── */
const AFORIZMALAR = [
  { id: 'mesele-sensin', name: 'Mesele Sensin', virtue: 'yansima', rarity: 'efsane', quote: 'Mesele sensin.' },
  { id: 'bireysel-oyun', name: 'Bireysel Oyun', virtue: 'niyet', rarity: 'nadir', quote: 'Hayat, birlikte oynadığımız bireysel bir oyundur.' },
  { id: 'dikkat-akisi', name: 'Dikkat Akışı', virtue: 'odak', rarity: 'nadide', quote: 'Dikkatini nereye akıtırsan hayatın oraya akar.' },
  { id: 'radikal-sorumluluk', name: 'Radikal Sorumluluk', virtue: 'ozguven', rarity: 'nadide', quote: 'Olanların başına sen geliyorsun.' },
  { id: 'zamanin-sabri', name: 'Zamanın Sabrı', virtue: 'sebat', rarity: 'nadir', quote: 'Fiziki âlemde gördüklerinin değişmesi zaman alır.' },
  { id: 'muhtacsiz-sevgi', name: 'Muhtaçsız Sevgi', virtue: 'ozsevgi', rarity: 'nadide', quote: 'Muhtaç olmadan (gerçekten) sev ve sevil.' },
  { id: 'kisa-yol-yok', name: 'Kısa Yol Yok', virtue: 'sebat', rarity: 'nadir', quote: 'Kısa yol arama, o kişi ol.' },
  { id: 'varis-kisisi', name: 'Varış Kişisi', virtue: 'sukur', rarity: 'efsane', quote: "Mesele gitmek istediğin yerdir; gerisi Allah'ın izniyle gelir." },
  { id: 'iki-olcek', name: 'İki Ölçek', virtue: 'sukur', rarity: 'nadir', quote: 'Bu hayatı o kadar da önemseme çünkü öleceksin; o kadar da önemse çünkü diğer yaşamın buraya göre belli olacak.' },
  { id: 'eylemsel-sukur', name: 'Eylemsel Şükür', virtue: 'sukur', rarity: 'yaygin', quote: 'Şükür eylemseldir, teşekkür sözeldir.' },
  { id: 'once-kendin', name: 'Önce Kendin', virtue: 'bolluk', rarity: 'yaygin', quote: 'Kendini yetiştir, devamı gelecektir.' },
  { id: 'yeni-baslangic', name: 'Yeni Başlangıç', virtue: 'niyet', rarity: 'nadir', quote: 'Bitirirken aslında başlamaz mıyız?' },
].map(c => ({ id: 'hz_aforizma_' + c.id, set: 'aforizmalar', glyph: '❋', name: c.name, sub: 'Aforizma', quote: c.quote, virtue: c.virtue, rarity: c.rarity, source: 'Aforizma Kanonu' }));

/* ── Işık Kanonu — SATILAMAZ (K6). 8 ayet + 2 hatırlatma; ayet metinleri
   yalnızca daha önce kodda ZATEN doğrulanmış olan (Rad 13/11, bkz. 12e
   ISIK_AYET) ya da yaygın bilinen kısa çeviri metinleridir. Emre'nin
   kitabındaki tam çeviriyle karşılaştırıp gerekirse düzeltmesi gerekir
   (Dürüst uyarı — kapanış raporunda tekrar edilecek). ─────────────── */
const ISIK_KANONU = [
  { id: 'degisimin-sarti', name: 'Değişimin Şartı', source: 'Rad, 13/11', virtue: 'sukur', rarity: 'efsane',
    quote: 'Kuşkusuz bir halk kendi durumunu değiştirmedikçe, Allah onların durumunu değiştirmez.' },
  { id: 'sinama', name: 'Sınama', source: 'Mülk, 67/2', virtue: 'sukur', rarity: 'nadide',
    quote: 'Hayat ve ölüm, hanginizin daha güzel iş yapacağını sınamak için yaratıldı.' },
  { id: 'adil-mizan', name: 'Adil Mizan', source: 'Enbiya, 21/47', virtue: 'durust', rarity: 'nadide',
    quote: 'Kıyamet günü adalet terazileri kurulur; hardal tanesi kadar olsa bile getirir, tartarız. Hesap görücü olarak Biz yeteriz.' },
  { id: 'hakkin-dengesi', name: 'Hakkın Dengesi', source: "Mü'minûn, 23/71", virtue: 'durust', rarity: 'nadir',
    quote: "Hak, onların arzularına uysaydı, gökler de yer de içindekiler de bozulup giderdi." },
  { id: 'darda-samimiyet', name: 'Darda Samimiyet', source: 'Ankebût, 29/65', virtue: 'niyet', rarity: 'nadir',
    quote: "Gemiye bindiklerinde dini yalnız O'na has kılarak Allah'a yalvarırlar; karaya çıkarınca yine ortak koşarlar." },
  { id: 'en-guzeline-uymak', name: 'En Güzeline Uymak', source: 'Zümer, 39/18', virtue: 'niyet', rarity: 'nadide',
    quote: "Sözü dinleyip de en güzeline uyanlar — işte onlar Allah'ın doğru yola ilettiği kimselerdir." },
  { id: 'bir-tutulmaz', name: 'Bir Tutulmaz', source: 'Kalem, 68/35', virtue: 'durust', rarity: 'nadir',
    quote: 'Öyle ya, Müslümanları suçlularla bir mi tutacağız?' },
  { id: 'kolayligin-sozu', name: 'Kolaylık Sözü', source: 'İnşirâh, 94/6', virtue: 'sukur', rarity: 'efsane',
    quote: 'Şüphesiz zorlukla beraber bir kolaylık vardır.' },
  { id: 'kolay-degil-anlamli', name: 'Kolay Değil, Anlamlı', source: 'Işık Kanonu · Hatırlatma', virtue: 'sukur', rarity: 'yaygin',
    quote: 'Zorluk bir ceza değil, bir işaretin parçasıdır. Anlamını ararken yürümeye devam et.' },
  { id: 'sukrun-sessizligi', name: 'Şükrün Sessizliği', source: 'Işık Kanonu · Hatırlatma', virtue: 'sukur', rarity: 'yaygin',
    quote: 'Bazen en derin şükür, sözle değil sükûnetle söylenir.' },
].map(c => ({ id: 'hz_isik_' + c.id, set: 'isik_kanonu', glyph: '☀', name: c.name, sub: 'Işık Kanonu', quote: c.quote, virtue: c.virtue, rarity: c.rarity, source: c.source }));

/* ── Taç Kartları — set başına 1, pakete asla girmez (tac:true) ─────── */
const TAC_SOZLERI = {
  manifesto:   'On iki madde bir tek cümlede toplanır: mesele sensin.',
  derinlikler: 'Standart, hak etmek, normal, layık — dördü birden, aynı anda, aynı sen.',
  temeller:    'Sevgi, saygı, değer, güven, bolluk — önce kendine verdiğin, sonra taştığın.',
  perdeler:    'Altı perde de aşılır — üzerine yürüyenin önünde hiçbiri kalıcı değildir.',
  zehirler:    'Zehri tanıyan, panzehri elinde tutar.',
  tuzaklar:    'Yedi tuzağı gören, artık onlara düşmez — görmek başlı başına bir çıkıştır.',
  cerceveler:  'On çerçeve, tek bir bakış açısı: yöntem değişir, mesele değişmez.',
  aforizmalar: 'On iki cümle, bir ömürlük pusula.',
  isik_kanonu: 'Işık kazanılır, dayatılmaz — ve şimdi, tamamen senin.',
};
const TACLAR = SETLER.map(s => ({
  id: 'hz_tac_' + s.id, set: s.id, glyph: s.glyph, tac: true,
  name: s.ad + ' Tacı', sub: 'Set Tamamlandı', quote: TAC_SOZLERI[s.id],
  virtue: 'sukur', rarity: 'efsane', source: 'Hazine Odası · Set Tacı',
}));

export const HAZINE_KARTLARI = [
  ...MANIFESTO, ...DERINLIKLER, ...TEMELLER, ...PERDELER, ...ZEHIRLER,
  ...TUZAKLAR, ...CERCEVELER, ...AFORIZMALAR, ...ISIK_KANONU, ...TACLAR,
];

/* Sidecar sözleşmesi: builder fonksiyonu döner (12b2 buildDeckData deseni) —
   kumHeuristicSpec 12f'den enjekte edilir (döngü kurmadan sahne üretimi). */
export function buildHazineData({ kumHeuristicSpec }) {
  for (const card of HAZINE_KARTLARI) {
    if (!card.sahne) {
      card.sahne = kumHeuristicSpec({ seed: 'hz-' + card.id, virtue: card.virtue, texts: [card.name, card.quote] });
    }
  }
  return { setler: SETLER, kartlar: HAZINE_KARTLARI };
}
