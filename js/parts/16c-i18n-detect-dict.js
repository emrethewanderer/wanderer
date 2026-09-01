export const DETECT_I18N = {

tr: {
  'detect.avoidance': [/bilmiyorum/i,/emin değil/i,/belki/i,/sanırım/i,/ne bileyim/i,/zor/i,/yapamam/i,/mümkün değil/i,/sonra/i,/şimdi değil/i,/fark etmez/i,/önemli değil/i,/neyse/i,/olmaz/i,/gerek yok/i,/yorgunum/i,/motivasyon/i,/zamanım yok/i,/hazır değil/i],
  'detect.vulnerability': [/ağladım/i,/kötü hissediyorum/i,/üzgün/i,/çaresiz/i,/yalnız/i,/korku/i,/korkuyorum/i,/endişe/i,/depresyon/i,/bunaldım/i],
  'detect.progress': [/başardım/i,/yaptım/i,/değiştim/i,/fark ettim/i,/anladım/i,/ilk kez/i,/cesaret/i,/konuştum/i,/adım attım/i,/denedim/i,/kabul ettim/i,/söyledim/i,/bitirdim/i,/vazgeçtim.*kötü/i],
  'detect.breakthrough': [/ilk kez/i,/fark ettim ki/i,/anladım ki/i,/aslında/i,/kabul ediyorum/i,/artık görebiliyorum/i,/değişti/i,/korkumu yendim/i,/cesaret ettim/i,/söyledim ona/i,/yüzleştim/i,/bıraktım/i,/itiraf/i],
  'detect.wellness_claim': [/^iyiyim/i,/^gayet iyiyim/i,/^iyi hissediyorum/i,/^her şey yolunda/i,/^sorun yok/i,/^iyi gidiyor/i,/^güzelim/i,/^her şey tamam/i,/aslında iyiyim/i,/sorunum yok/i],
  'detect.crisis': [/intihar/i,/kendimi öldür/i,/hayatıma son/i,/yaşamak istemiyorum/i,/artık yaşamak istemiyorum/i,/kendime zarar/i,/öz zarar/i,/ölmek istiyorum/i,/yaşamanın anlamı yok/i,/bu dünyadan gitmek istiyorum/i,/ilaç.*fazla al/i,/köprüden atla/i,/kendimi bitirmek/i,/ben olmasam daha iyi/i,/uyuyup.*uyanmamak/i,/uyanmamak istiyorum/i,/veda mektubu/i,/yaşamaya değmez/i,/kendimi yok etmek/i,/canıma kıy/i,/yaşamı bırakmak/i],
  // Yumuşak sinyal: tek başına kriz sayılmaz — sessiz LLM teyidine gider (13-extras).
  // Mecaz payı yüksek ifadeler buraya; kesinleşenler yukarı taşınır.
  'detect.crisis_soft': [/dayanamıyorum/i,/tükendim/i,/yük oluyorum/i,/herkese yük/i,/kimse beni özlemez/i,/yok olmak istiyorum/i,/kaybolmak istiyorum/i,/neden (hâlâ|hala) yaşıyorum/i,/her şey bitsin/i,/bittim ben/i,/nefes almak.*yoruyor/i],
  'detect.emotional_spike': [/artık istemiyorum/i,/bıktım/i,/nefret/i,/dayanamıyorum/i,/çılgına dönüyorum/i,/mahvoldum/i,/her şey bitti/i,/anlamsız/i,/hiçbir şey fark etmiyor/i,/vazgeçmek istiyorum/i,/yeter/i],
  'detect.intensity.high': [/nefret/i,/dayanamıyorum/i,/mahvoldum/i,/çılgına/i,/bıktım/i,/yeter/i,/ağladım/i,/patladım/i,/çok kızgın/i,/inanamıyorum/i],
  'detect.intensity.medium': [/korkuyorum/i,/üzgün/i,/endişe/i,/bunaldım/i,/kararsız/i,/kötü hissediyorum/i,/mutsuz/i,/sıkıldım/i,/yoruldum/i],
  'detect.intensity.positive': [/mutlu/i,/gurur/i,/başardım/i,/yaptım/i,/değiştim/i,/fark ettim/i,/anladım/i,/rahatladım/i,/iyi hissediyorum/i,/güzel/i,/teşekkür/i],
  'detect.explicit_mode.direct': [/sert ol/i,/sert konuş/i,/acıma/i,/yumuşama/i,/yüzleş/i,/beni sorgula/i,/doğruyu söyle/i,/vur/i,/ağır gel/i,/kıyama/i,/abartma.*nazik/i,/dürüst ol/i,/gözünü kırpma/i],
  'detect.explicit_mode.soft': [/sadece dinle/i,/dinle yeter/i,/yargılama/i,/baskı yapma/i,/sakin ol/i,/yumuşak/i,/anlat.*sadece/i],
  'detect.explicit_mode.reflective': [/düşündür/i,/soru sor/i,/keşfettir/i,/yansıt/i,/bana sorarak ilerle/i,/kendim bul/i],
  'detect.explicit_mode.pattern': [/örüntü/i,/kalıp/i,/döngü/i,/tekrar eden/i,/hep aynı/i,/yine aynı/i,/pattern/i,/sürekli böyle/i,/hep böyle yapıyorum/i,/bu bende alışkanlık/i],
  'detect.explicit_mode.depth': [/derinlik/i,/standart.*nedir/i,/hak ediyor muyum/i,/layık mıyım/i,/normal.*mi/i,/standartım/i,/hak etmek/i,/layık görmek/i,/derinleş/i,/derinlere in/i],
  'detect.depth': [/standart/i,/hak et/i,/layık/i,/normal.*gel/i,/normal.*mi/i,/hak ed/i,/değer gör/i,/değer ver/i,/kendime.*değer/i,/kendimi.*sev/i,/kendime.*saygı/i,/kendime.*güven/i,/özgüven/i,/özsaygı/i,/özsevgi/i,/öz değer/i,/bolluk/i,/kıtlık/i,/muhtaç/i],
  'detect.depth_self_worth': [/sevilmeye.*layık/i,/hak etmiyor/i,/bunu hak etmem/i,/bu benim.*normalim.*değil/i,/fazla.*geliyor/i,/bu.*kadar.*iyi.*olamaz/i,/hak etmediğimi/i,/layık.*değilim/i,/standartım.*düşük/i,/kendimi.*kötü.*görüyorum/i,/kendimi.*değersiz/i],
  'detect.pattern_awareness': [/hep aynı şeyi yapıyorum/i,/bu daha önce de oldu/i,/yine aynı yere geldim/i,/kendimi tekrarlıyorum/i,/döngüye girdim/i,/aynı hatayı yapıyorum/i,/bu bir kalıp mı/i,/neden hep böyle/i,/yine kaçtım/i,/fark ettim.*tekrar/i,/her seferinde aynı/i,/aynı şey.*oluyor/i,/bu benim döngüm/i,/alışkanlıklarım/i],
  'detect.topic.family': /anne|baba|kardeş|aile|ebeveyn|çocuk|evlilik|boşanma/i,
  'detect.topic.work': /iş|kariyer|patron|çalışma|meslek|işsiz|işten/i,
  'detect.topic.relationship': /sevgili|aşk|partner|kız arkadaş|erkek arkadaş|yalnız|yalnızlık/i,
  'detect.topic.money': /para|borç|maddi|gelir|finansal|kira|ödeme/i,
  'detect.topic.health': /hasta|ağrı|sağlık|doktor|tedavi|ilaç/i,
  'detect.topic.future': /gelecek|hedef|plan|amaç|hayal|umut/i,
  'detect.commitment': [
    {pattern:/yarın (.{3,40})(yapacağım|konuşacağım|başlayacağım|deneyeceğim)/i, extract:m=>m[0]},
    {pattern:/bu hafta (.{3,40})(yapacağım|halledeceğim|başlayacağım)/i, extract:m=>m[0]},
    {pattern:/söz veriyorum (.{3,60})/i, extract:m=>m[0]},
    {pattern:/artık (.{3,40})(yapacağım|yapmayacağım|bırakacağım)/i, extract:m=>m[0]},
  ],
  'detect.belief.limiting': [/yapamam/i,/hak etmiyorum/i,/hep böyle olur/i,/asla olmaz/i,/benim için imkansız/i,/ben böyleyim/i,/değişemem/i,/geç kaldım/i,/benden olmaz/i,/hak etmem/i,/bu bana göre değil/i,/kimse beni sevmez/i,/yetersizim/i,/başaramam/i,/layık değilim/i,/böyle kalmaya mahkumum/i,/zaten hep böyle/i,/beni kimse anlamaz/i],
  'detect.belief.empowering': [/yapabilirim/i,/hak ediyorum/i,/değişeceğim/i,/başaracağım/i,/buna layığım/i,/gücüm var/i,/bu benim normalim/i,/değişebilirim/i,/kendime güveniyorum/i,/inanıyorum/i,/bu sefer farklı/i,/artık o kişiyim/i,/hak ettiğimi biliyorum/i,/buna değerim/i],
  'detect.choice.old_person': [/yine aynısını yaptım/i,/kaçtım/i,/yapamadım/i,/eski halime döndüm/i,/söylemedim/i,/cesaret edemedim/i,/yine ertele/i,/bıraktım/i,/vazgeçtim.*iyi/i,/sustu[mk]/i,/korktu[mk]/i,/geri adım/i,/pes ettim/i,/yapmadım/i,/aynı şeyi tekrar/i],
  'detect.choice.new_person': [/bu sefer yaptım/i,/söyledim/i,/cesaret ettim/i,/ilk kez/i,/farklı davrandım/i,/konuştum/i,/sınır koydum/i,/hayır dedim/i,/adım attım/i,/değiştirdim/i,/o kişi gibi davrandım/i,/yeni ben/i,/başardım/i,/yüzleştim/i],
  'detect.worksheet_ready': [/ne yapmalıyım/i,/nasıl değişir/i,/pratik.*öner/i,/egzersiz/i,/çalışma/i,/somut.*adım/i,/yol.*göster/i,/ne.*deneyebilirim/i,/uygulama.*öner/i,/kendime.*ne.*söylemeliyim/i,/olumlama/i,/hayal.*et/i],
  /* İhtiyaç Motoru (13v) — Portrem'in kendi cümlelerinden temel ekseni çıkarır.
     Kitabın beş temeli; her desen o temelin YOKLUĞUNUN dilidir. */
  'detect.eksen.oz_sevgi': [/kendimi sevm/i,/kendime sevgi/i,/şefkat/i,/sevilme/i,/sevilmey/i,/layık değil/i,/layık mıyım/i,/kendime kız/i,/kendimi suçlu/i,/suçluluk/i,/kendime acımasız/i,/kendimi affet/i,/yetersiz hissed/i,/kendimden nefret/i,/kimse beni sevm/i],
  'detect.eksen.oz_saygi': [/sınır koy/i,/sınırım/i,/hayır diyemi/i,/hayır demek/i,/kendime saygı/i,/saygı görm/i,/ezil/i,/kullanıl/i,/sözümü dinlem/i,/lafımı kesm/i,/kırılıyorum/i,/susuyorum/i,/karşı çıkam/i,/onay arıyorum/i,/insanları memnun/i],
  'detect.eksen.oz_deger': [/değersiz/i,/hak etmiyor/i,/hak etmem/i,/yeterince iyi değil/i,/kanıtlamak zorunda/i,/kendimi kanıtla/i,/standartım/i,/başarısız/i,/kıyaslıyorum/i,/karşılaştırıyorum/i,/küçük görü/i,/değerimi bilm/i,/övgüyü kabul edem/i],
  'detect.eksen.oz_guven': [/korkuyorum/i,/korkum/i,/ertele/i,/cesaret edem/i,/cesaretim yok/i,/başaramam/i,/başaramayaca/i,/risk alam/i,/güvenmiyorum kendime/i,/kendime güvenm/i,/çekiniyorum/i,/tereddüt/i,/adım atam/i,/harekete geçem/i,/yapamam/i],
  'detect.eksen.bolluk': [/kıtlık/i,/yetmiyor/i,/yeterince yok/i,/para sıkıntı/i,/borç/i,/hep eksik/i,/asla yetm/i,/paylaşam/i,/cimri/i,/minnet duyam/i,/şükred/i,/elimde olan/i,/kaybetme korkusu/i,/biriktir/i],
  /* Duygu Motoru (13D) — dokuz duygu ailesi, Nabız çekirdeğinin sözlüğü.
     Yalnız TR+EN yazılır (plan Risk 13): dp() eksik anahtarda TR'ye düşer;
     öteki dillerde motor yanlış OKUMAZ, kanıt bulamayıp SUSAR (null). */
  /* ALT-DİZE TUZAĞI (denetim 2026-08-29, canlı yakalandı): `\b` yalnız
     ASCII \w üzerinde tanımlıdır — Türkçe harflerde beklendiği gibi
     çalışmaz. Bu yüzden sınır lookbehind ile kurulur: `/mutsuz/` yalnız
     kelime başında geçerlidir, yoksa "uMUTSUZum" kedere düşerdi (oysa
     umutsuzluk donukluk ailesindendir). */
  'detect.duygu.keder': [/üzgün/i,/ağladım/i,/ağlıyorum/i,/hüzün/i,/hüzünlü/i,/\byas\b/i,/(?<![a-zçğıöşü])mutsuz/i,/kederli/i,/matem/i,/çok kötü/i,/berbat/i],
  'detect.duygu.yalnizlik': [/yalnızım/i,/yalnız hissediyorum/i,/kimsem yok/i,/tek başıma/i,/terk edilmiş/i,/kimsem/i],
  'detect.duygu.utanc_suclu': [/utanıyorum/i,/rezil/i,/suçluyum/i,/keşke/i,/mahcup/i,/suçluluk/i,/pişman/i,/ayıp ettim/i],
  /* `yeter` çıplak bırakılırsa "yeterli/yeterince" de öfke okunur —
     "kendimi yeterince iyi görmüyorum" kitabın en sık cümlelerinden biri
     ve öfke DEĞİL. İki yandan da sınırlanır. */
  'detect.duygu.ofke': [/kızgın/i,/sinirli/i,/öfke/i,/bıktım/i,/(?<![a-zçğıöşü])yeter(?![a-zçğıöşü])/i,/çıldırıyorum/i,/sinir oldum/i],
  'detect.duygu.kaygi': [/kaygı/i,/endişe/i,/panik/i,/korkuyorum/i,/tedirgin/i,/endişeliyim/i,/kaygılıyım/i,/dayanamıyorum/i,/korkuyor/i],
  'detect.duygu.donukluk': [/boşluk/i,/hiçbir şey hissetmiyorum/i,/hissetmiyorum/i,/ne fark eder/i,/bıraktım/i,/hissizim/i,/umursamıyorum/i,/umutsuz/i],
  'detect.duygu.karisiklik': [/kafam karışık/i,/bilmiyorum/i,/anlamıyorum/i,/karmaşık/i,/ne yapacağımı bilmiyorum/i],
  'detect.duygu.sevinc': [/(?<![a-zçğıöşü])mutlu/i,/gurur/i,/başardım/i,/harika/i,/sevindim/i,/harikayım/i],
  'detect.duygu.huzur': [/rahatladım/i,/ferahladım/i,/yük kalktı/i,/sakinim/i,/huzurluyum/i,/içim rahat/i,/huzur(?!suz)/i],
  /* umut — kitabın lapis ekseni; denetimde eklendi (eski P2'nin `hope`i).
     Desenler DAR tutuldu: `/umut/` "umutsuz"u da tutardı, "umudumu
     kaybettim" ise donukluk'a aittir. */
  'detect.duygu.umut': [/umutluyum/i,/umutlandım/i,/umut var/i,/inancım var/i,/yapabilirim/i,/başarabilirim/i],
  /* Olumsuzlama penceresi (13D) — iki yanda ikişer belirteç, cümlecik içi.
     `hiç` ÇIKARILDI (denetim 2026-08-29): olumsuzlanan fiilin kendi eki ya
     da `değil` zaten yakalıyor; `hiç` ise "hiç bu kadar iyi olmamıştım"
     gibi olumlu cümlelerde işareti TERSİNE çeviriyordu. */
  'detect.olumsuzlama': [/değil/i,/degil/i,/yok/i,/asla/i],
  /* Pekiştirici (13D) — kuvveti tabandan 1 basamak yukarı çeker. */
  'detect.pekistirici': [/çok/i,/gerçekten/i,/resmen/i,/aşırı/i,/bayağı/i,/iyice/i,/fazlasıyla/i,/epey/i,/cidden/i],
},

en: {
  'detect.avoidance': [/i don'?t know/i,/not sure/i,/maybe/i,/i think so/i,/i guess/i,/no idea/i,/it'?s hard/i,/i can'?t/i,/impossible/i,/later/i,/not now/i,/doesn'?t matter/i,/not important/i,/whatever/i,/no way/i,/no need/i,/i'?m tired/i,/no motivation/i,/no time/i,/not ready/i],
  'detect.vulnerability': [/i cried/i,/i feel bad/i,/i'?m sad/i,/hopeless/i,/i feel alone/i,/lonely/i,/afraid/i,/i'?m scared/i,/anxious/i,/depressed/i,/overwhelmed/i],
  'detect.progress': [/i did it/i,/i made it/i,/i changed/i,/i realized/i,/i understood/i,/first time/i,/courage/i,/i spoke/i,/i took a step/i,/i tried/i,/i accepted/i,/i told/i,/i finished/i,/i quit.*bad/i],
  'detect.breakthrough': [/first time/i,/i realized that/i,/i understood that/i,/actually/i,/i accept/i,/i can see now/i,/it changed/i,/i overcame my fear/i,/i had the courage/i,/i told them/i,/i confronted/i,/i let go/i,/i confess/i],
  'detect.wellness_claim': [/^i'?m fine/i,/^i'?m doing great/i,/^i feel good/i,/^everything'?s fine/i,/^no problems/i,/^going well/i,/^i'?m good/i,/^all good/i,/actually i'?m fine/i,/no issues/i],
  'detect.crisis': [/suicide/i,/kill myself/i,/end my life/i,/don'?t want to live/i,/want to die/i,/self.?harm/i,/hurt myself/i,/no reason to live/i,/leave this world/i,/overdose/i,/jump off/i,/end it all/i,/better off without me/i,/never wake up/i,/not worth living/i,/end everything/i,/take my (own )?life/i,/goodbye letter/i],
  'detect.crisis_soft': [/can'?t go on/i,/i'?m done with everything/i,/burden to everyone/i,/nobody would miss me/i,/want to disappear/i,/why am i (even )?alive/i,/what'?s the point of anything/i,/too tired to keep going/i],
  'detect.emotional_spike': [/i don'?t want this anymore/i,/i'?m sick of/i,/i hate/i,/i can'?t take it/i,/i'?m going crazy/i,/i'?m ruined/i,/it'?s all over/i,/meaningless/i,/nothing matters/i,/i want to give up/i,/enough/i],
  'detect.intensity.high': [/hate/i,/can'?t take it/i,/ruined/i,/going crazy/i,/sick of/i,/enough/i,/i cried/i,/i exploded/i,/so angry/i,/can'?t believe/i],
  'detect.intensity.medium': [/scared/i,/sad/i,/anxious/i,/overwhelmed/i,/indecisive/i,/feel bad/i,/unhappy/i,/bored/i,/exhausted/i],
  'detect.intensity.positive': [/happy/i,/proud/i,/i did it/i,/i made it/i,/i changed/i,/i realized/i,/i understood/i,/relieved/i,/i feel good/i,/beautiful/i,/thank you/i],
  'detect.explicit_mode.direct': [/be tough/i,/be harsh/i,/don'?t spare me/i,/don'?t be soft/i,/confront me/i,/challenge me/i,/tell me the truth/i,/hit me/i,/go hard/i,/be honest/i,/don'?t hold back/i],
  'detect.explicit_mode.soft': [/just listen/i,/only listen/i,/don'?t judge/i,/don'?t push/i,/be gentle/i,/be soft/i,/just let me talk/i],
  'detect.explicit_mode.reflective': [/make me think/i,/ask me questions/i,/help me explore/i,/reflect/i,/guide me with questions/i,/let me figure it out/i],
  'detect.explicit_mode.pattern': [/pattern/i,/cycle/i,/loop/i,/recurring/i,/same thing again/i,/keeps happening/i,/always the same/i,/show me my patterns/i,/my habits/i],
  'detect.explicit_mode.depth': [/depth/i,/my standard/i,/do i deserve/i,/am i worthy/i,/is this normal/i,/self.?worth/i,/go deeper/i,/dig deeper/i],
  'detect.depth': [/standard/i,/deserve/i,/worthy/i,/normal.*for me/i,/self.?worth/i,/self.?love/i,/self.?respect/i,/self.?esteem/i,/self.?confidence/i,/self.?value/i,/abundance/i,/scarcity/i,/needy/i,/dependent/i],
  'detect.depth_self_worth': [/worthy of love/i,/don'?t deserve/i,/i don'?t deserve this/i,/not.*normal for me/i,/too good.*for me/i,/can'?t be this good/i,/i'?m not worthy/i,/my standard.*low/i,/i see myself.*bad/i,/i feel worthless/i],
  'detect.pattern_awareness': [/i keep doing the same thing/i,/this happened before/i,/i'm back to the same place/i,/i'm repeating myself/i,/stuck in a loop/i,/same mistake again/i,/is this a pattern/i,/why do i always/i,/i ran away again/i,/i noticed.*again/i,/every time.*same/i,/same thing.*happening/i,/this is my cycle/i,/my habits/i],
  'detect.topic.family': /mother|father|sibling|family|parent|child|marriage|divorce|mom|dad|brother|sister/i,
  'detect.topic.work': /job|career|boss|work|profession|unemployed|fired|office|colleague/i,
  'detect.topic.relationship': /girlfriend|boyfriend|partner|love|relationship|lonely|loneliness|dating|breakup/i,
  'detect.topic.money': /money|debt|financial|income|rent|payment|salary|broke/i,
  'detect.topic.health': /sick|pain|health|doctor|treatment|medication|illness|hospital/i,
  'detect.topic.future': /future|goal|plan|purpose|dream|hope|aspiration/i,
  'detect.commitment': [
    {pattern:/tomorrow (.{3,40})(i'?ll|i will|i'?m going to)/i, extract:m=>m[0]},
    {pattern:/this week (.{3,40})(i'?ll|i will|i'?m going to)/i, extract:m=>m[0]},
    {pattern:/i promise (.{3,60})/i, extract:m=>m[0]},
    {pattern:/from now on (.{3,40})(i'?ll|i will|i won'?t)/i, extract:m=>m[0]},
  ],
  'detect.belief.limiting': [/i can'?t/i,/i don'?t deserve/i,/it always happens/i,/impossible for me/i,/that'?s just who i am/i,/i can'?t change/i,/it'?s too late/i,/not for me/i,/nobody loves me/i,/i'?m not enough/i,/i'?ll never/i,/i'?m not worthy/i,/i'?m stuck/i,/i'?m doomed/i,/no one understands me/i,/i always fail/i],
  'detect.belief.empowering': [/i can do this/i,/i deserve/i,/i will change/i,/i'?ll make it/i,/i'?m worthy/i,/i have the strength/i,/this is my normal/i,/i can change/i,/i believe in myself/i,/i trust myself/i,/this time.*different/i,/i am that person/i,/i know i deserve/i,/i'?m worth it/i],
  'detect.choice.old_person': [/i did it again/i,/i ran away/i,/couldn'?t do it/i,/went back to.*old/i,/didn'?t say/i,/couldn'?t.*courage/i,/procrastinat/i,/gave up/i,/backed down/i,/stayed silent/i,/got scared/i,/same thing again/i,/i didn'?t do it/i],
  'detect.choice.new_person': [/this time i did/i,/i said it/i,/i had the courage/i,/first time/i,/acted differently/i,/i spoke up/i,/i set.*boundar/i,/i said no/i,/i took a step/i,/i changed/i,/acted like.*person/i,/new me/i,/i made it/i,/i confronted/i],
  'detect.worksheet_ready': [/what should i do/i,/how do i change/i,/suggest.*exercise/i,/practical.*steps/i,/show me.*way/i,/what can i try/i,/suggest.*practice/i,/what.*tell myself/i,/affirmation/i,/imagin/i,/give me.*exercise/i],
  /* İhtiyaç Motoru (13v) — TR karşılıklarıyla aynı eksenler. */
  'detect.eksen.oz_sevgi': [/love myself/i,/self.?love/i,/compassion/i,/be kind to myself/i,/unlovable/i,/not worthy of love/i,/blame myself/i,/guilt/i,/hate myself/i,/forgive myself/i,/harsh on myself/i,/feel inadequate/i,/nobody loves me/i],
  'detect.eksen.oz_saygi': [/set.*boundar/i,/my boundaries/i,/can'?t say no/i,/saying no/i,/self.?respect/i,/disrespected/i,/walked over/i,/taken advantage/i,/not heard/i,/i stay silent/i,/people.?pleas/i,/seek approval/i,/can'?t stand up/i],
  'detect.eksen.oz_deger': [/worthless/i,/don'?t deserve/i,/not good enough/i,/have to prove/i,/prove myself/i,/my standard/i,/i'?m a failure/i,/compare myself/i,/comparing/i,/belittle/i,/can'?t take a compliment/i,/undervalue/i],
  'detect.eksen.oz_guven': [/i'?m afraid/i,/my fear/i,/procrastinat/i,/no courage/i,/can'?t bring myself/i,/i'?ll fail/i,/can'?t take risks/i,/don'?t trust myself/i,/hesitat/i,/hold back/i,/can'?t take the step/i,/can'?t get started/i,/i can'?t do it/i],
  'detect.eksen.bolluk': [/scarcity/i,/never enough/i,/not enough money/i,/in debt/i,/always missing/i,/can'?t share/i,/stingy/i,/ungrateful/i,/can'?t feel grateful/i,/gratitude/i,/fear of losing/i,/hoard/i],
  /* Duygu Motoru (13D) — TR karşılıklarıyla aynı dokuz aile. */
  'detect.duygu.keder': [/\bsad\b/i,/i cried/i,/crying/i,/grief/i,/heartbroken/i,/unhappy/i,/terrible/i],
  'detect.duygu.yalnizlik': [/lonely/i,/i'?m alone/i,/no one/i,/nobody/i,/isolated/i],
  'detect.duygu.utanc_suclu': [/ashamed/i,/i'?m guilty/i,/guilty/i,/i regret/i,/embarrassed/i,/i shouldn'?t have/i],
  'detect.duygu.ofke': [/angry/i,/furious/i,/i'?m mad/i,/pissed off/i,/i'?m fed up/i,/sick of/i],
  'detect.duygu.kaygi': [/anxious/i,/anxiety/i,/i'?m worried/i,/panic/i,/i'?m scared/i,/i'?m afraid/i,/\bafraid\b/i,/can'?t take/i],
  /* `numb` SINIRLANDI (dikiş turu, 2026-08-30): çıplak hâli "number/numbers"
     içinde eşleşiyor — "i called the number" donukluk okunuyordu. */
  'detect.duygu.donukluk': [/i feel nothing/i,/\bnumb\b/i,/empty inside/i,/i don'?t care anymore/i,/what'?s the point/i,/i gave up/i],
  'detect.duygu.karisiklik': [/confused/i,/i don'?t know/i,/i don'?t understand/i,/mixed up/i],
  /* `happy` SINIRLANDI (dikiş turu, 2026-08-30) — TR'deki `mutlu`nun
     "umutlu" tuzağının EN karşılığı, ama sonucu çok daha ağırdı: çıplak
     `/happy/i` "un**happy**"nin İÇİNDE eşleşiyordu ve sevinç ailesinin
     kuvveti (3) kederinkinden (2) yüksek olduğu için baskın aday oluyordu.
     Ölçülen sonuç: "i'm unhappy" → karşılama `kutlama`, üstelik KANIT
     olarak kullanıcının kendi "i'm unhappy" cümlesi gösteriliyordu. Bir
     ailenin deseni başka bir ailenin kelimesinin içinde yaşamamalı. */
  'detect.duygu.sevinc': [/\bhappy\b/i,/proud/i,/i did it/i,/i made it/i,/amazing/i,/thrilled/i],
  'detect.duygu.huzur': [/relieved/i,/weight off/i,/i'?m calm/i,/at peace/i,/peaceful/i],
  'detect.duygu.umut': [/hopeful/i,/i hope/i,/there'?s hope/i,/maybe i can/i,/i think i can/i,/i can do this/i],
  /* `\bno\b` ÇIKARILDI (denetim 2026-08-29): "I'm sad, no one understands"
     cümlesinde kederi OLUMLUYA çeviriyordu — `no one` zaten yalnizlik
     ailesinin kendi deseni. */
  'detect.olumsuzlama': [/\bnot\b/i,/n't/i,/\bnever\b/i],
  'detect.pekistirici': [/\bvery\b/i,/really/i,/\bso\b/i,/extremely/i,/totally/i,/incredibly/i,/seriously/i],
},

/* ═══════════════════════════════════════════════════
   EMNİYET KATMANI · Faz 1 — dil-bağımsız kriz desenleri
   Arayüz yalnız TR/EN olsa da kullanıcı mesajını HERHANGİ bir dilde
   yazabilir. detectCrisis (13-extras) bu blokları dpAll() ile
   BİRLEŞTİREREK tarar; dp()'nin aktif-dil zinciri bunlara hiç düşmez.
   11 dil planı (tum-diller-native-plani) geldiğinde her dilin bloğu
   hazır — o dilin diğer detect anahtarları o fazda eklenir.
   ═══════════════════════════════════════════════════ */
de: {
  'detect.crisis': [/suizid/i,/selbstmord/i,/mich umbringen/i,/nicht mehr leben/i,/will sterben/i,/mein leben beenden/i,/mir das leben nehmen/i,/mich selbst verletzen/i,/mich ritzen/i],
},
fr: {
  'detect.crisis': [/me suicider/i,/me tuer/i,/mettre fin à mes jours/i,/je veux mourir/i,/plus envie de vivre/i,/me faire du mal/i,/en finir avec la vie/i],
},
es: {
  'detect.crisis': [/suicidio/i,/suicidarme/i,/matarme/i,/quiero morir/i,/no quiero vivir/i,/quitarme la vida/i,/hacerme daño/i,/acabar con todo/i],
},
pt: {
  'detect.crisis': [/suic[íi]dio/i,/me matar/i,/quero morrer/i,/n[ãa]o quero (mais )?viver/i,/tirar minha vida/i,/me machucar/i,/acabar com tudo/i],
},
it: {
  'detect.crisis': [/suicidio/i,/suicidarmi/i,/uccidermi/i,/voglio morire/i,/non voglio (più )?vivere/i,/farla finita/i,/farmi del male/i],
},
nl: {
  'detect.crisis': [/zelfmoord/i,/su[ïi]cide/i,/mezelf (te )?doden/i,/wil niet meer leven/i,/wil dood/i,/mezelf pijn doen/i,/uit het leven stappen/i],
},
ru: {
  'detect.crisis': [/суицид/i,/самоубийств/i,/покончить с собой/i,/хочу умереть/i,/не хочу жить/i,/убить себя/i,/причинить себе вред/i],
},
ar: {
  'detect.crisis': [/انتحار/,/أريد أن أموت/,/اريد ان اموت/,/لا أريد أن أعيش/,/لا اريد ان اعيش/,/أؤذي نفسي/,/اؤذي نفسي/,/أقتل نفسي/,/اقتل نفسي/],
},
zh: {
  'detect.crisis': [/自杀|自殺/,/想死/,/不想活/,/结束生命|結束生命/,/伤害自己|傷害自己/],
},
ja: {
  'detect.crisis': [/自殺/,/死にたい/,/消えたい/,/生きたくない/,/自傷/],
},
ko: {
  'detect.crisis': [/자살/,/죽고 싶/,/살고 싶지 않/,/자해/],
},

}; // END DETECT_I18N
