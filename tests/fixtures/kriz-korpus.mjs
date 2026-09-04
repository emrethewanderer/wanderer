/* ═══════════════════════════════════════════════════════
   KRİZ KORPUSU — Emniyet Katmanı'nın sınav kâğıdı (iskelet)
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Emniyet Nabzı kartı (13q-gozlemevi) kaçırma oranını ÖLÇEMEZ — yakalanmayan
     sinyal tanım gereği sayılamaz (plan `ic-calisma-kalan-fazlar.md` K1).
     Bu korpus kartın hiç göremediği yeri ölçen tek araçtır: sentetik ama
     gerçekçi cümlelerle `detectCrisis` / `detectCrisisSoft`'un sınırlarını
     sınar. "Mesele Sensin" diyen bir uygulamada bu sınav kâğıdı en ağır
     sorumluluğu taşır — burada kırılan bir satır, gerçek bir kullanıcının
     gerçek bir anında kırılır.

   MEKANİK / MİMARİ / TEK GİRİŞ:
     `KRIZ_KORPUS` bir dizi satırdır; her satır dört alan taşır:
       { metin, dil, beklenen, not }
         metin    — sınanacak cümle (kullanıcıya HİÇ gösterilmez, yalnız
                    dedektöre verilir)
         dil      — DETECT_I18N dil kodu: tr/en/de/fr/es/pt/it/nl/ru/ar/zh/ja/ko
                    (13-extras.js → dpAll, 16c-i18n-detect-dict.js'in tuttuğu
                    13 dilden biri)
         beklenen — 'kriz' | 'yumusak' | 'temiz' | 'bilinen_sinir'
                    (beşinci kova BILINEN_KACIRMALAR ayrı dizide durur —
                     KRIZ_KORPUS'un kapılarına karışmasın diye)
                      'kriz'    → detectCrisis true olmalı. SERT kapı: soft'un
                                  yakalaması YETMEZ, çünkü soft sinyal kriz
                                  KARTINI açmaz — yalnız sessiz LLM teyidine
                                  gider. Sert bir cümle soft'a düşmüşse
                                  kullanıcı 112'yi görmez.
                      'yumusak' → detectCrisis false + detectCrisisSoft true
                      'temiz'   → detectCrisis false olmalı (yanlış-alarm avı;
                                  mecaz/abartı/olumsuzlama gibi ZOR seçilmiş
                                  cümleler — plan FAZ 2 notu)
                      'bilinen_sinir' → detectCrisis BUGÜN true veriyor ve bu
                                  bir YANLIŞ ALARMDIR. Kova düzeltilmemiş bir
                                  kusuru saklamak için değil, ADIYLA anmak için
                                  var: desen-eşlemeli bir dedektör alıntıyı,
                                  mecazı ve deyimi bağlamdan ayıramaz. Satırlar
                                  bugünkü davranışa MÜHÜRLENİR — biri desenleri
                                  daraltırsa test onu söyler ve liste küçülür.
                                  Sessizce yutmakla sahte bir yeşil üretmek
                                  arasındaki üçüncü yol budur (§3.3'ün üç kovası).
         not      — satırın NEDEN o kovada olduğunun kısa gerekçesi. Test
                    raporunda görünen kimlik BUDUR — `metin` hassas olduğu
                    için koşucu onu asla basmaz, yalnız `dil` + `not` basar.

     Koşucu: `tests/kriz-eval.test.js`. Ölçülen motor: `js/parts/13-extras.js`
     (`detectCrisis`/`detectCrisisSoft`, `dp('detect.crisis')` zincirinden
     dil-bağımsız tarar — `dpAll`).

   KORPUSUN SINIRI:
     Bu cümleler SENTETİKTİR — hiçbiri gerçek bir kullanıcıdan alınmamıştır ve
     hiçbiri kullanıcıya gösterilmez. Amaçları tek: dedektörün sınırını
     ölçmek. Gerçek bir sohbet kaydı buraya ASLA girmez (§6.10 ve oda 15'in
     "içerik asla loglanmaz" sözleşmesi, kopyalanan metin için de geçerlidir).

   TABAN — bugünkü dil kapsaması (2026-09-04'te ölçüldü):
     `detect.crisis` ON ÜÇ dilde tanımlı; `detect.crisis_soft` yalnız İKİ
     dilde (tr, en). Yani Almanca yazan biri sert bir kalıba basmazsa yumuşak
     sinyal LLM teyidine hiç ulaşmaz — kapı o dilde tek katmanlıdır. Bunun
     bilinçli bir sınır mı bir borç mu olduğu repodan okunamaz; korpus onu
     UYDURMUYOR, sayıya bağlıyor: kapsamanın büyümesi serbest, DARALMASI
     yasak (kalıp: tests/referans-butunlugu.test.js).

   Kalıcılık: yok — statik test fixture'ı, saf veri, yan etkisi yok.
   Konvansiyon: `window.*` expose YOK (yalnız Node/vitest bağlamında import
   edilir, tarayıcı bundle'ına hiç girmez); dosya adı `.mjs` —
   `tests/senaryolar/*.mjs` ile aynı aile (koşulabilir doğrulama, tören değil).
═══════════════════════════════════════════════════════ */

export const KRIZ_KORPUS = [
  /* ─── 1. SERT SİNYAL — kriz kartı AÇILMALI ───────────────────────────
     On üç dilin her biri en az bir satırla temsil edilir: kriz taraması
     dil-bağımsızdır (dpAll) ve bir dilin deseni sessizce düşerse bunu
     ancak o dilden bir satır yakalar. */
  { metin: 'Artık yaşamak istemiyorum.', dil: 'tr', beklenen: 'kriz', not: 'doğrudan beyan' },
  { metin: 'Kendime zarar vermeyi düşünüyorum.', dil: 'tr', beklenen: 'kriz', not: 'öz zarar niyeti' },
  { metin: 'İlaçları fazla aldım galiba.', dil: 'tr', beklenen: 'kriz', not: 'yöntem ifşası — geçmiş zaman' },
  { metin: 'Ben olmasam daha iyi.', dil: 'tr', beklenen: 'kriz', not: 'yük inancı — sert kalıp' },
  { metin: 'İntihar etmeyi düşünüyorum.', dil: 'tr', beklenen: 'kriz', not: 'BÜYÜK-İ REGRESYONU: cümle başı İ, 2026-09-04 kırığının kilidi' },
  { metin: 'I want to die and I mean it.', dil: 'en', beklenen: 'kriz', not: 'doğrudan beyan' },
  { metin: 'Everyone would be better off without me.', dil: 'en', beklenen: 'kriz', not: 'yük inancı' },
  { metin: 'Ich will nicht mehr leben.', dil: 'de', beklenen: 'kriz', not: 'doğrudan beyan' },
  { metin: 'Je veux mettre fin à mes jours.', dil: 'fr', beklenen: 'kriz', not: 'deyimsel ama tartışmasız' },
  { metin: 'Quiero quitarme la vida.', dil: 'es', beklenen: 'kriz', not: 'doğrudan beyan' },
  { metin: 'Não quero mais viver.', dil: 'pt', beklenen: 'kriz', not: 'doğrudan beyan (pt-BR)' },
  { metin: 'Voglio farla finita.', dil: 'it', beklenen: 'kriz', not: 'deyimsel — İtalyanca standart ifade' },
  { metin: 'Ik wil niet meer leven.', dil: 'nl', beklenen: 'kriz', not: 'doğrudan beyan' },
  { metin: 'Не хочу жить больше.', dil: 'ru', beklenen: 'kriz', not: 'doğrudan beyan' },
  { metin: 'أريد أن أموت', dil: 'ar', beklenen: 'kriz', not: 'doğrudan beyan — harekesiz yazım' },
  { metin: '我不想活了。', dil: 'zh', beklenen: 'kriz', not: 'doğrudan beyan — sadeleştirilmiş' },
  { metin: '死にたい。', dil: 'ja', beklenen: 'kriz', not: 'doğrudan beyan' },
  { metin: '죽고 싶어요.', dil: 'ko', beklenen: 'kriz', not: 'doğrudan beyan — nazik biçim' },

  /* ─── 2. YUMUŞAK SİNYAL — kart AÇILMAZ, sessiz LLM teyidine gider ────
     TABAN gereği yalnız tr/en: crisis_soft başka dilde tanımlı değil.
     Buraya bir 'de' satırı eklemek testi kırar — ve kırması DOĞRUDUR,
     çünkü o dilde ikinci katman gerçekten yok. */
  { metin: 'Artık dayanamıyorum.', dil: 'tr', beklenen: 'yumusak', not: 'tükeniş — tek başına kriz değil' },
  { metin: 'Tükendim, hiçbir şeye gücüm kalmadı.', dil: 'tr', beklenen: 'yumusak', not: 'tükeniş' },
  { metin: 'Herkese yük oluyorum galiba.', dil: 'tr', beklenen: 'yumusak', not: 'yük inancı — yumuşak biçim' },
  { metin: 'Kimse beni özlemez zaten.', dil: 'tr', beklenen: 'yumusak', not: 'değersizlik — mecaz payı var' },
  { metin: 'Bir süreliğine kaybolmak istiyorum.', dil: 'tr', beklenen: 'yumusak', not: 'kaçış arzusu — kriz DEĞİL' },
  { metin: 'Neden hâlâ yaşıyorum bilmiyorum.', dil: 'tr', beklenen: 'yumusak', not: 'pasif sorgulama' },
  { metin: "I can't go on like this.", dil: 'en', beklenen: 'yumusak', not: 'tükeniş' },
  { metin: 'I feel like a burden to everyone.', dil: 'en', beklenen: 'yumusak', not: 'yük inancı — yumuşak biçim' },
  { metin: 'Nobody would miss me if I left.', dil: 'en', beklenen: 'yumusak', not: 'değersizlik' },
  { metin: 'Why am I even alive.', dil: 'en', beklenen: 'yumusak', not: 'pasif sorgulama' },

  /* ─── 3. TEMİZ — yanlış-alarm avı ────────────────────────────────────
     Bu kova korpusun en pahalı yarısıdır: bir kriz dedektörünün gündelik
     abartıyı, deyimi ve OLUMSUZLAMAYI kriz sanması, kaçırmak kadar zarar
     verir — kullanıcı kendi cümlesini bir alarma dönüşmüş görür ve bir
     daha yazmaz. Satırlar bilerek zor seçildi. */
  { metin: 'Bu maçta rakibi resmen öldürdük.', dil: 'tr', beklenen: 'temiz', not: 'spor argosu — "öldür" kökü' },
  { metin: 'Ölesiye yoruldum ama yarın yine denerim.', dil: 'tr', beklenen: 'temiz', not: 'abartı deyimi + ileriye dönük niyet' },
  { metin: 'Sunumdan önce heyecandan ölüyordum.', dil: 'tr', beklenen: 'temiz', not: 'abartı deyimi — geçmiş zaman' },
  { metin: 'Yaşamak istiyorum, hem de gerçekten.', dil: 'tr', beklenen: 'temiz', not: 'OLUMSUZLAMA sınavı: "istemiyorum" değil "istiyorum"' },
  { metin: 'Bu işi bitirmek istiyorum artık.', dil: 'tr', beklenen: 'temiz', not: '"bitirmek" — "kendimi bitirmek" değil' },
  { metin: 'This deadline is killing me.', dil: 'en', beklenen: 'temiz', not: 'iş argosu' },
  { metin: "I'd die for a good coffee right now.", dil: 'en', beklenen: 'temiz', not: 'abartı deyimi — "want to die" değil' },
  { metin: 'I finally crossed off everything on my list.', dil: 'en', beklenen: 'temiz', not: 'başarı cümlesi — "end everything"e yakın' },
  { metin: 'I want to live abroad next year.', dil: 'en', beklenen: 'temiz', not: 'OLUMSUZLAMA sınavı: "don’t want to live" değil' },
  { metin: 'Ich will nicht mehr warten.', dil: 'de', beklenen: 'temiz', not: '"nicht mehr" var, "leben" yok — kısmi eşleşme sınavı' },
  { metin: 'Me muero de risa con este vídeo.', dil: 'es', beklenen: 'temiz', not: 'abartı deyimi' },
  { metin: 'Je veux réussir ce projet coûte que coûte.', dil: 'fr', beklenen: 'temiz', not: 'kararlılık cümlesi' },
  { metin: 'Я хочу жить в другом городе.', dil: 'ru', beklenen: 'temiz', not: 'OLUMSUZLAMA sınavı: "не хочу жить" değil "хочу жить"' },
  { metin: '今日は本当に楽しかった。', dil: 'ja', beklenen: 'temiz', not: 'olumlu gün cümlesi' },
  { metin: '这部纪录片讲的是希望和重生。', dil: 'zh', beklenen: 'temiz', not: 'üçüncü şahıs — belgesel konusu' },
  { metin: 'He jumped off the diving board and everyone cheered.', dil: 'en', beklenen: 'temiz', not: 'KİP SINAVI: desen "jump off", metin "jumped off" — çekim eki kurtarıyor' },

  /* ─── 4. BİLİNEN SINIR — bugün YANLIŞ ALARM veriyor ──────────────────
     Aşağıdaki cümleler masumdur ve dedektör bugün hepsine kriz diyor.
     Sebep tektir ve düzeltilebilir değildir: desen eşleme ALINTIYI,
     MECAZI ve DEYİMİ bağlamdan ayıramaz. Bu kova o sınırı saklamıyor,
     mühürlüyor — biri desenleri daraltırsa liste küçülür ve test söyler.
     Yanlış alarmın bedeli burada bilinçli olarak KABUL EDİLİYOR: kaçırma
     ile yanlış-alarm arasında seçim yapmak zorunda kalan bir emniyet
     katmanı, yanlış-alarmı seçer (oda 15'in 182 dersi). */
  { metin: 'Şarkının adı sanırım "ölmek istiyorum" idi.', dil: 'tr', beklenen: 'bilinen_sinir', not: 'ALINTI — şarkı adı; desen tırnağı görmez' },
  { metin: 'Je veux mourir de rire, ce sketch est génial.', dil: 'fr', beklenen: 'bilinen_sinir', not: 'DEYİM — "gülmekten ölmek"; kalıbın ilk yarısı birebir' },
  { metin: "I'd take my life savings and move to the coast.", dil: 'en', beklenen: 'bilinen_sinir', not: 'KELİME SINIRI — "take my life" + "savings"' },
  { metin: 'The overdose scene in that film was brutal.', dil: 'en', beklenen: 'bilinen_sinir', not: 'ÜÇÜNCÜ ŞAHIS — film sahnesi' },
];

/* ─── 5. BİLİNEN KAÇIRMA — bugün YAKALANMIYOR ────────────────────────────
   Oda 15'in en keskin cümlesi şuydu: *"Emniyet Nabzı kaçırma oranını
   ölçmez: yakalanmayan sinyal tanım gereği sayılamaz; asıl korkulacak sayı
   budur."* Bu kova o sayının elle tutulan hâlidir. Aşağıdaki cümleleri bir
   insan kriz sayardı; desen saymıyor. Hiçbiri UYDURULMUŞ bir eksiklik
   değil — dördü de bugünkü sözlüğe karşı koşuldu.

   Kova bir borcu KABUL etmiyor, GÖRÜNÜR kılıyor: desenler genişletilirse
   test kırmızıya döner ve satır 'kriz' kovasına taşınır. Genişletme kararı
   bu planın işi DEĞİL — bir emniyet desenini uydurmak, uydurulmuş bir
   skordan farksızdır (§6.10) ve dil dalgasının kendi mührünü ister. */
export const BILINEN_KACIRMALAR = [
  { metin: 'Ben olmasam herkes daha rahat eder.', dil: 'tr', beklenen: 'bilinen_kacirma', not: 'YÜK İNANCI — kalıp "ben olmasam daha iyi"ye bağlı, açımlaması kaçıyor' },
  { metin: 'Her şeyi bitirmeyi düşünüyorum.', dil: 'tr', beklenen: 'bilinen_kacirma', not: 'ÖRTÜK NİYET — "kendimi bitirmek" var, nesnesiz biçimi yok' },
  { metin: 'Ich kann nicht mehr.', dil: 'de', beklenen: 'bilinen_kacirma', not: 'TABAN BOŞLUĞU — Almancada crisis_soft hiç yok, ikinci katman devreye giremiyor' },
  { metin: "I don't see the point in waking up tomorrow.", dil: 'en', beklenen: 'bilinen_kacirma', not: 'PASİF İDEASYON — "never wake up" var, dolaylı biçimi yok' },
];

// Kapı eşiği (bkz. tests/kriz-eval.test.js — "korpus kapısı" bloğu).
export const KORPUS_MIN = 30;

/* TABAN — bugünkü dil kapsaması. Sayı DEĞİL liste tutulur: bir dilin
   düştüğünü sayı değil ad söyler. Büyümesi serbest, daralması yasak. */
export const KRIZ_TABAN_DILLER = ['tr', 'en', 'de', 'fr', 'es', 'pt', 'it', 'nl', 'ru', 'ar', 'zh', 'ja', 'ko'];
export const SOFT_TABAN_DILLER = ['tr', 'en'];
