/* ═══════════════════════════════════════════════════════════════
   13p2 — HUKUKİ METİNLER (sidecar gövdesi)
   13p'den ayrıldı: TR+EN tam belge metinleri ana bundle'a GİRMEZ;
   panel ilk açıldığında ext-hukuk.js sidecar'ı olarak iner.
   SAF YAPRAK MODÜL — import'suz. İletişim/yürürlük sabitleri 13p
   çekirdeğinden buildHukukDocs parametresiyle enjekte edilir.
   Metin güncellenince 13p'deki HK_VERSION/HK_EFFECTIVE elle artırılır.
═══════════════════════════════════════════════════════════════ */

export function buildHukukDocs({ HK_CONTACT, HK_EFFECTIVE }) {
const HK_TR = {
  terms: {
    title: 'Kullanım Koşulları',
    body: `
Wanderer'a hoş geldin. Bu Kullanım Koşulları ("Koşullar"), Wanderer ve Wanderer Studio uygulamalarını ("Hizmet") kullanımını düzenler. Hizmeti kullanarak bu Koşulları kabul etmiş olursun. Kabul etmiyorsan lütfen Hizmeti kullanma.

## 1. Taraflar
Hizmet, Emre Güllüce ("Emre the Wanderer" · Wanderer Movement) tarafından işletilir ("biz"). İletişim: ${HK_CONTACT}. Bu Koşullar seninle ("kullanıcı") aramızdaki bağlayıcı sözleşmedir.

## 2. Hizmetin Tanımı
Wanderer; kişisel gelişim, öz-değerlendirme ve içsel dönüşüm yolculuğuna eşlik eden, yapay zekâ destekli bir uygulamadır. Wanderer Studio, ek özellikler içeren ücretli abonelik katmanıdır. Hizmet; sohbet, günlük ritüeller, kart sistemleri, notlar ve benzeri araçlar sunar. Hizmetin kapsamını, özelliklerini ve görünümünü zaman içinde değiştirebilir, geliştirebilir veya sonlandırabiliriz.

## 3. Yapay Zekâ Uyarısı, Güvenlik ve Kriz
- Wanderer'ın yanıtları bir yapay zekâ dil modeli tarafından üretilir; Wanderer bir insan değildir. Yanıtlar hatalı, eksik veya yanıltıcı olabilir; hiçbir yanıt gerçeklik garantisi taşımaz.
- Hizmet; tıbbi, psikolojik, psikiyatrik, hukuki veya finansal danışmanlık DEĞİLDİR, terapi veya tedavi sunmaz ve profesyonel yardımın yerini tutmaz. Sağlığını, güvenliğini veya önemli hayat kararlarını ilgilendiren konularda daima nitelikli bir uzmana danış. Reçeteli ilaçlarla ilgili kararlar yalnızca hekimine aittir.
- Kendine veya bir başkasına zarar verme düşüncesi yaşıyorsan Hizmeti kriz desteği için kullanma; bulunduğun ülkedeki acil yardım hattını ara (Türkiye'de 112) ve güvendiğin bir insana haber ver. Ülkelere göre ücretsiz destek hatlarının dizini: findahelpline.com
- Güvenlik yaklaşımımız: Hizmet, ciddi duygusal sıkıntı sinyallerini fark etmeye çalışan katmanlar içerir; böyle bir durumda seni acil yardım ve destek kaynaklarına yönlendirir, yapay zekâya bu konularda ek güvenlik talimatları uygular. Bu katmanlar hiçbir zaman kusursuz değildir ve profesyonel yardımın yerine geçmez.

## 4. Uygunluk, Hesap ve E-Posta
- Hizmeti kullanmak için en az 13 yaşında olmalısın; 18 yaşından küçüksen veli/vasi onayı gerekir. Kayıt sırasında doğum yılını doğru beyan etmekle yükümlüsün; 18 yaş altı hesaplara ek koruma ayarları uygulanır.
- **Hesabının şifresi yoktur.** Girişte e-posta adresini yazarsın, o adrese tek kullanımlık bir kod göndeririz, kodu yazarak içeri girersin. Bu nedenle e-posta adresin hesabının kimliğidir: adresine erişimini kaybedersen hesabına erişimini de kaybedersin. Adresini güncel tutmak ve e-posta kutunun güvenliğini sağlamak senin sorumluluğundadır.
- Kayıt sırasında kendine bir kullanıcı adı seçersin. Kullanıcı adları benzersizdir. Başkasının hakkını ihlal eden, yanıltıcı, hakaret içeren ya da bir kurumu veya kişiyi temsil ediyormuş izlenimi veren kullanıcı adlarını kaldırabiliriz.
- **Sana e-posta gönderiyoruz — iki türlü.** (a) *İşlemsel iletiler:* giriş kodun, hesap ve güvenlik bildirimleri, abonelik ve ödeme bilgileri. Bunlar Hizmetin işleyişinin parçasıdır ve hesabın açık olduğu sürece gönderilir; bunlardan çıkış yoktur, çünkü giriş kodun da bu iletilerden biridir. (b) *Bülten:* Wanderer'ın yeni özellikleri, Emre'nin yazıları ve yolculuğa dair içerikler. Kaydolarak bülteni almayı kabul edersin; **her bültenin dibinde çıkış bağı vardır** ve e-posta uygulamanın kendi "abonelikten çık" düğmesi de tek dokunuşta çalışır ve Ayarlar'dan da istediğin an kapatabilirsin. Bültenden çıkman işlemsel iletileri durdurmaz. Bültenden çıktığında bunu ilk gönderimde uygularız.
- Kayıt bilgilerinin doğru olmasından ve hesabının güvenliğinden sen sorumlusun. Hesabın üzerinden gerçekleşen etkinlikler senin sorumluluğundadır.
- Hesabını bir başkasına devredemezsin.

## 5. Abonelik, Deneme ve Ödeme
- Wanderer'ın çekirdeği ücretsizdir. Wanderer Studio, yinelenen abonelikle sunulur ve ödemeler Apple App Store veya Google Play üzerinden, ilgili mağazanın koşullarına tabi olarak alınır.
- Yeni kullanıcılara sunulan deneme süresi (mevcut durumda 30 gün) sonunda abonelik, iptal edilmedikçe mağaza üzerinden ücretlendirilir. İptal ve iade işlemleri ilgili mağazanın (Apple/Google) kuralları çerçevesinde yürür.
- Adil kullanım: Hizmet, yapay zekâ kullanımına makul kotalar uygulayabilir. Fiyat ve kota değişiklikleri önceden duyurulur.

## 6. Kabul Edilebilir Kullanım
Şunları yapamazsın:
- Hizmeti hukuka aykırı, zararlı, taciz edici veya başkalarının haklarını ihlal eden şekilde kullanmak;
- Hizmeti intihar, kendine zarar verme veya başkasına zarar vermeye ilişkin yöntem, araç veya plan elde etmek amacıyla kullanmak; güvenlik katmanlarını (kriz yönlendirmeleri dahil) atlatmaya çalışmak;
- Hizmete yetkisiz erişim sağlamaya çalışmak, güvenlik önlemlerini aşmak, tersine mühendislik yapmak;
- Hizmeti otomatik araçlarla (bot, kazıyıcı/scraper) toplu veri çekmek için kullanmak;
- İçeriği, yapay zekâ modeli eğitmek dahil, izinsiz kopyalamak veya türev çalışmalarda kullanmak (bkz. Fikri Mülkiyet Bildirimi);
- Topluluk alanlarında (ör. paylaşım akışı) başkalarına zarar veren, yanıltıcı veya hukuka aykırı içerik paylaşmak. Bu tür içerikleri kaldırabiliriz.

## 7. Senin İçeriğin
- Hizmete girdiğin içerikler (mesajların, notların, kartların, kayıtların) sana aittir.
- Hizmeti sana sunabilmemiz için (saklama, işleme, yedekleme, yapay zekâ yanıtı üretme, senin talebinle paylaşım) bu içerikler üzerinde dünya çapında, münhasır olmayan, telifsiz bir kullanım izni verirsin. Bu izin yalnızca Hizmetin işletilmesi amacıyla sınırlıdır.
- Verilerinin nasıl işlendiği Gizlilik Politikası'nda açıklanır.

## 8. Fikri Mülkiyet
Hizmetin kendisi — yazılımı, tasarımı, metinleri, kart sistemleri, metodolojisi, "Wanderer", "Wanderer Studio", "Emre the Wanderer" adları ve Emre Güllüce'nin kitaplarından türeyen tüm içerik — Emre Güllüce'ye aittir ve fikri mülkiyet mevzuatıyla korunur. Ayrıntılar için Fikri Mülkiyet Bildirimi'ni oku.

## 9. Sorumluluğun Sınırlandırılması
- Hizmet "olduğu gibi" ve "mevcut hâliyle" sunulur; kesintisiz, hatasız veya belirli bir amaca uygun olacağı garanti edilmez.
- Emredici hukuk kurallarının izin verdiği azami ölçüde; Hizmetin kullanımından veya kullanılamamasından doğan dolaylı, arızi veya netice kabilinden zararlardan sorumlu değiliz. Tüketici olarak sahip olduğun yasal haklar saklıdır.
- Yapay zekâ yanıtlarına dayanarak aldığın kararların sorumluluğu sana aittir (bkz. Bölüm 3).

## 10. Askıya Alma ve Fesih
- Bu Koşulları ihlal etmen hâlinde hesabını askıya alabilir veya kapatabiliriz; mümkün olduğunda önceden bildiririz.
- Hesabını dilediğin an Ayarlar üzerinden silebilirsin ("Hesabımı Kalıcı Olarak Sil"). Silme işlemi geri alınamaz.

## 11. Değişiklikler
Bu Koşulları güncelleyebiliriz. Önemli değişiklikleri uygulama içinden duyururuz; güncel sürüm ve yürürlük tarihi bu belgenin başında yer alır. Değişiklik sonrası Hizmeti kullanmaya devam etmen, güncel Koşulları kabul ettiğin anlamına gelir.

## 12. Uygulanacak Hukuk
Bu Koşullar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda İstanbul mahkemeleri ve icra daireleri yetkilidir; tüketici mevzuatından doğan yerleşim yeri hakların saklıdır.

## 13. İletişim
Sorular için: ${HK_CONTACT}

Bu belgenin Türkçe metni esastır; diğer dillerdeki çeviriler bilgilendirme amaçlıdır.`,
  },

  privacy: {
    title: 'Gizlilik Politikası',
    body: `
Wanderer'da bize içsel dünyanı emanet ediyorsun. Bu emanete, verini nasıl işlediğimizi açıkça anlatarak karşılık veriyoruz. Bu Gizlilik Politikası; 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve Avrupa Birliği Genel Veri Koruma Tüzüğü (GDPR) gözetilerek hazırlanmıştır.

## 1. Veri Sorumlusu
Veri sorumlusu: Emre Güllüce ("Emre the Wanderer" · Wanderer Movement). İletişim: ${HK_CONTACT}

## 2. Topladığımız Veriler
- **Hesap verileri:** kullanıcı adı, e-posta adresi, doğum yılı, profil fotoğrafı (eklersen). Hizmet şifre kullanmaz; giriş, e-posta adresine gönderilen tek kullanımlık kodla yapılır. Ayrıca e-postalarının teslim edilip edilmediğine dair sağlayıcı bildirimlerini (teslim edildi / geri döndü / şikâyet) kaydederiz — ölü bir adrese yazmayı sürdürmemek için.
- **Kullanıcı içerikleri:** sohbet mesajların, notların, ritüel kayıtların (Geçiş Alanı, değerlendirmeler, sözler), kartların ve Portre yanıtların, yüklediğin görseller.
- **Kullanım ve teknik veriler:** oturum ve etkinlik kayıtları (seri/ritüel takibi için), uygulama içi ekran kullanım ölçümleri (hangi ekranda ne kadar süre geçirildiği — yalnız ekran adı, süre ve sayı kaydedilir, içerik kaydedilmez; Hizmeti iyileştirmek için kullanılır), dil tercihi, cihaz/tarayıcı bilgisi, bildirim aboneliği (push token), abonelik durumu.
- Sesli dikte ve sesli okuma cihazının kendi ses motorlarıyla çalışır; ses kaydını sunucularımıza yüklemeyiz.

## 3. Hassas İçerik ve Açık Rıza
Hizmetin doğası gereği paylaştığın içerikler duygusal, manevi veya sağlıkla ilişkili kişisel bilgiler — ruh hâlin, psikolojik durumun veya inançların gibi, mevzuatta "özel nitelikli kişisel veri" (KVKK m.6; GDPR m.9) sayılabilecek bilgiler — içerebilir. Bu içerikleri yalnızca Hizmeti sana sunmak (saklamak, yanıt üretmek, kişiselleştirmek) için işleriz; profilleme yoluyla reklam amaçlı KULLANMAYIZ ve üçüncü taraflara SATMAYIZ. Bu tür içerikleri paylaşıp paylaşmamak tamamen senin seçimindir; paylaşman, bu kapsamdaki işlemeye açık rıza verdiğin anlamına gelir. Rızanı dilediğin an geri alabilirsin: ilgili içerikleri Hizmet içinden silebilir veya hesabının tamamen silinmesini isteyebilirsin.

## 4. İşleme Amaçları ve Hukuki Dayanaklar
- Hizmeti sunmak ve hesabını yönetmek — sözleşmenin ifası (KVKK m.5/2-c; GDPR m.6/1-b).
- Deneyimi kişiselleştirmek (hafıza, kişiselleştirme katmanları, hatırlatmalar) — sözleşmenin ifası ve meşru menfaat.
- Abonelik ve ödemelerin yürütülmesi — sözleşmenin ifası ve hukuki yükümlülük.
- Güvenlik, kötüye kullanımın önlenmesi, hata ayıklama — meşru menfaat.
- Bildirim gönderimi — açık rızan (istediğin an kapatabilirsin).
- **Giriş kodu ve işlemsel e-postalar** — sözleşmenin ifası (KVKK m.5/2-c; GDPR m.6/1-b). Bunlar olmadan hesabına giremezsin.
- **Bülten** — kayıt sırasında Kullanım Koşulları'nı kabul ederek verdiğin rıza ve mevcut kullanıcılarımıza kendi hizmetimizi tanıtmaktaki meşru menfaatimiz (GDPR m.6/1-f). Her iletide çıkış bağı bulunur ve çıkışını kaydederiz; çıktıktan sonra sana bülten göndermeyiz.
- **Teslimat kayıtları (geri dönen posta, şikâyet)** — meşru menfaat: ölü adreslere göndermeyi sürdürmek hem seni rahatsız eder hem gönderim altyapımızın güvenilirliğini bozar.

## 5. Yapay Zekâ İşlemesi
Sohbet mesajların ve ilgili bağlam (ör. kişiselleştirme özeti), yanıt üretilmesi için sözleşmeli yapay zekâ altyapı sağlayıcımıza iletilir. Sağlayıcılarla yaptığımız sözleşmelerde verinin yalnızca yanıt üretimi için işlenmesi esastır; verini kendi modellerini eğitmek için kullanmalarına izin vermeyiz. Sağlayıcı değişirse bu politika güncellenir.

## 6. Üçüncü Taraf Hizmet Sağlayıcılar
Verini yalnızca Hizmeti işletmek için gerekli olduğu ölçüde şu kategorilerdeki işleyicilerle paylaşırız:
- Veritabanı, kimlik doğrulama ve dosya depolama (Supabase);
- Yapay zekâ model sağlayıcısı (yanıt üretimi);
- Abonelik yönetimi (RevenueCat) ve uygulama mağazaları (Apple, Google) — ödeme bilgin mağazada kalır, bize kart bilgisi ulaşmaz;
- Bildirim iletimi (Apple/Google push servisleri, web push);
- E-posta iletimi (yalnızca gönderdiğin mektuplar ve hizmet e-postaları için).
Bu sağlayıcıların sunucuları yurt dışında bulunabilir; aktarım, KVKK m.9 ve GDPR'ın uluslararası aktarım kurallarına uygun güvencelerle yapılır.

## 7. Saklama ve Silme
- Verini, hesabın aktif olduğu sürece saklarız.
- Ayarlar'daki araçlarla dilediğin an: tüm verini JSON olarak indirebilir (Verimi İndir), hesabını silmeden tüm içeriğini temizleyebilir (Sıfırdan Başla) veya hesabını tüm verinle birlikte kalıcı olarak silebilirsin (Hesabımı Kalıcı Olarak Sil).
- Kalıcı silme talebinde verilerin, yasal saklama yükümlülükleri dışında, sistemlerimizden ve yedeklerimizden makul süre içinde silinir.
- **Kullanım ölçümleri** (hangi ekranı açtığın, orada ne kadar kaldığın gibi ham hareket kayıtları) ham hâlde en fazla **90 gün** tutulur. Süre dolan kayıtlar günlük toplamlara indirgenir ve ham satırlar silinir. Toplamlar bir ekranın kaç kez açıldığını sayar; orada ne yazdığını taşımaz.

## 8. Hakların
KVKK m.11 ve GDPR kapsamında; verine erişme, düzeltme, silme, işlemeyi kısıtlama, itiraz etme, verini taşınabilir biçimde alma ve verdiğin rızayı geri çekme haklarına sahipsin. Bu hakların çoğunu Ayarlar'dan kendin kullanabilirsin; kalanlar için ${HK_CONTACT} adresine yaz. Bülten aboneliğini her iletinin dibindeki bağdan ya da Ayarlar'dan sonlandırabilirsin. Ayrıca ilgili denetim makamına (Türkiye'de Kişisel Verileri Koruma Kurumu) şikâyette bulunma hakkın vardır.

## 9. Güvenlik
Verin; şifreli bağlantı (TLS), erişim kontrolü (satır düzeyi güvenlik) ve yetki ayrımı gibi teknik ve idari tedbirlerle korunur. Hiçbir sistem %100 güvenli değildir; bir veri ihlali hâlinde yasal yükümlülüklere uygun olarak bilgilendirilirsin.

## 10. Çocukların Gizliliği
Hizmet 13 yaşından küçüklere yönelik değildir; kayıt sırasında doğum yılı beyanı istenir ve 13 yaş altı kayıtlar engellenir. 13 yaşından küçük bir çocuğa ait veri topladığımızı fark edersek sileriz. 13-17 yaş hesaplarında ek koruma ayarları uygulanır ve veli/vasi onayı gerekir.

## 11. Çerezler ve Yerel Depolama
Uygulama, oturumunu ve tercihlerini hatırlamak için cihazında yerel depolama kullanır. Üçüncü taraf reklam/izleme çerezi kullanmayız.

## 12. Değişiklikler
Bu politikayı güncelleyebiliriz; önemli değişiklikler uygulama içinden duyurulur. Güncel sürüm ve yürürlük tarihi belgenin başındadır.

## 13. İletişim
Gizlilikle ilgili her soru için: ${HK_CONTACT}

Bu belgenin Türkçe metni esastır; diğer dillerdeki çeviriler bilgilendirme amaçlıdır.`,
  },

  ip: {
    title: 'Fikri Mülkiyet Bildirimi',
    body: `
Wanderer; bir yazılımdan fazlasıdır — Emre Güllüce'nin kitaplarından, felsefesinden ve yıllar içinde inşa ettiği özgün metodolojiden doğan bütünleşik bir eserdir. Bu bildirim, bu eserin korunan kapsamını ve sana tanınan kullanım iznini tanımlar.

## 1. Sahiplik
Hizmetin tamamı ve her bir parçası — aksi açıkça belirtilmedikçe — Emre Güllüce'ye aittir ve başta 5846 sayılı Fikir ve Sanat Eserleri Kanunu ile 6769 sayılı Sınai Mülkiyet Kanunu olmak üzere ulusal ve uluslararası fikri mülkiyet mevzuatıyla korunur. © ${new Date(HK_EFFECTIVE).getFullYear()} Emre Güllüce. Tüm hakları saklıdır.

## 2. Korunan Kapsam
- **Adlar ve markalar:** "Wanderer", "Wanderer Studio", "Emre the Wanderer", "Wanderer Movement" adları, logo ve mühür motifleri.
- **Edebi eserler:** "Wanderer İlişki Felsefesi" ve "Zihniyet Devrimi'ne Çağrı" kitapları ile bunlardan uygulamaya taşınan tüm alıntı, aforizma ve öğretiler ("Mesele Sensin" tezi dahil).
- **Metodoloji ve özgün kavram sistemleri:** Geçiş Alanı, İç Meclis, Portre, kart destesi ve kart törenleri, Üç Mühür, ritüel yapıları ve bunların ifade ediliş biçimleri.
- **Görsel ve işitsel dil:** arayüz tasarımı, kart görsel motoru, tipografik sistem, illüstrasyonlar, animasyon dili.
- **Yazılım:** kaynak kodu, veri yapıları ve uygulamanın derlenmiş hâli.

## 3. Sana Tanınan Lisans
Hizmeti kullandığın sürece; içeriğe kişisel, ticari olmayan, münhasır olmayan, devredilemez ve alt-lisanslanamaz bir erişim izni tanırız. Uygulamanın paylaşım araçlarıyla ürettiğin görselleri (ör. kart ve alıntı paylaşımları) kişisel sosyal hesaplarında paylaşabilirsin — bu paylaşımlarda uygulamanın koyduğu atıf/işaret korunmalıdır.

## 4. İzin Verilmeyen Kullanımlar
Önceden yazılı izin olmaksızın şunlar yasaktır:
- İçeriğin (kitap alıntıları, metodoloji, kart metinleri, arayüz metinleri) kopyalanması, çoğaltılması, yayımlanması veya ticari kullanımı;
- İçerikten türev çalışma üretilmesi (benzer uygulama, kurs, kitap veya içerik seti dahil);
- İçeriğin ve verilerin otomatik araçlarla toplanması (scraping) veya yapay zekâ modellerinin eğitiminde kullanılması;
- Yazılımın tersine mühendisliği, kaynak koda dönüştürülmesi veya güvenlik önlemlerinin aşılması;
- Ad ve markaların, bağlantı veya onay izlenimi verecek şekilde kullanılması.

## 5. Senin İçeriğin Sana Aittir
Bu bildirim, senin ürettiğin içerik üzerinde hak iddia etmez: mesajların, notların, kart yanıtların sana aittir (bkz. Kullanım Koşulları Bölüm 7 ve Gizlilik Politikası).

## 6. İhlal Bildirimi
Hizmet içinde fikri mülkiyet haklarını ihlal ettiğini düşündüğün bir içerik görürsen veya Wanderer'ın haklarının ihlal edildiğini fark edersen ${HK_CONTACT} adresine bildir. Bildirimde: ihlal edilen eser, ihlalin bulunduğu yer ve iletişim bilgilerin yer almalıdır.

## 7. Saklı Haklar
Burada açıkça tanınmayan tüm haklar saklıdır. Bu bildirimin herhangi bir hükmünün uygulanmaması, o haktan feragat edildiği anlamına gelmez.

Bu belgenin Türkçe metni esastır; diğer dillerdeki çeviriler bilgilendirme amaçlıdır.`,
  },
};

const HK_EN = {
  terms: {
    title: 'Terms of Use',
    body: `
Welcome to Wanderer. These Terms of Use ("Terms") govern your use of the Wanderer and Wanderer Studio applications (the "Service"). By using the Service you accept these Terms. If you do not agree, please do not use the Service.

## 1. Parties
The Service is operated by Emre Güllüce ("Emre the Wanderer" · Wanderer Movement) ("we"). Contact: ${HK_CONTACT}. These Terms form a binding agreement between you (the "user") and us.

## 2. The Service
Wanderer is an AI-assisted application that accompanies your journey of personal growth, self-reflection and inner transformation. Wanderer Studio is a paid subscription tier with additional features. The Service offers chat, daily rituals, card systems, notes and similar tools. We may change, improve or discontinue features of the Service over time.

## 3. AI Disclaimer, Safety and Crisis
- Wanderer's responses are generated by an artificial-intelligence language model; Wanderer is not a human. Responses may be inaccurate, incomplete or misleading; no response carries a guarantee of accuracy.
- The Service is NOT medical, psychological, psychiatric, legal or financial advice, does not provide therapy or treatment, and does not replace professional help. Always consult a qualified professional for matters concerning your health, safety or important life decisions. Decisions about prescription medication belong to your doctor alone.
- If you are experiencing thoughts of harming yourself or others, do not use the Service for crisis support; call your local emergency line (988 in the US, 112 in Türkiye) and tell someone you trust. A directory of free support lines by country: findahelpline.com
- Our safety approach: the Service includes layers that try to recognize signals of serious emotional distress; in such cases it directs you to emergency and support resources and applies additional safety instructions to the AI. These layers are never perfect and are no substitute for professional help.

## 4. Eligibility, Account and E-Mail
- You must be at least 13 years old to use the Service; if you are under 18, you need the consent of a parent or guardian. You are required to declare your year of birth truthfully at registration; accounts under 18 receive additional protection settings.
- **Your account has no password.** You enter your e-mail address, we send a single-use code to that address, and you sign in by entering the code. Your e-mail address is therefore the identity of your account: if you lose access to the address, you lose access to the account. Keeping your address current and your mailbox secure is your responsibility.
- You choose a username at registration. Usernames are unique. We may remove usernames that infringe someone else's rights, are misleading, are abusive, or give the impression of representing an organisation or another person.
- **We send you e-mail — of two kinds.** (a) *Transactional messages:* your sign-in code, account and security notices, subscription and payment information. These are part of how the Service works and are sent for as long as your account is open; there is no opt-out, because your sign-in code is one of them. (b) *Newsletter:* new Wanderer features, Emre's writing, and content about the journey. By registering you agree to receive the newsletter; **every newsletter carries an unsubscribe link at the bottom**, and your mail app's own "unsubscribe" button works in a single tap, and you can also turn it off in Settings at any time. Unsubscribing from the newsletter does not stop transactional messages. We apply your unsubscribe from the next send onwards.
- You are responsible for the accuracy of your registration details and for the security of your account. Activity under your account is your responsibility.
- You may not transfer your account to anyone else.

## 5. Subscription, Trial and Payment
- The core of Wanderer is free. Wanderer Studio is offered as a recurring subscription; payments are processed through the Apple App Store or Google Play and are subject to the respective store's terms.
- At the end of any trial period offered to new users (currently 30 days), the subscription is charged through the store unless cancelled. Cancellations and refunds are handled under the rules of the respective store (Apple/Google).
- Fair use: the Service may apply reasonable quotas to AI usage. Changes to prices or quotas are announced in advance.

## 6. Acceptable Use
You may not:
- use the Service in any unlawful, harmful, harassing manner or in violation of others' rights;
- use the Service to obtain methods, means or plans relating to suicide, self-harm or harming others, or attempt to circumvent its safety layers (including crisis referrals);
- attempt unauthorized access, circumvent security measures, or reverse-engineer the Service;
- use automated tools (bots, scrapers) to extract data from the Service in bulk;
- copy the content or use it in derivative works, including training AI models, without permission (see the Intellectual Property Notice);
- post content in community areas (e.g. the sharing feed) that is harmful, misleading or unlawful. We may remove such content.

## 7. Your Content
- Content you enter into the Service (your messages, notes, cards, records) belongs to you.
- So that we can provide the Service to you (storage, processing, backup, generating AI responses, sharing at your request), you grant us a worldwide, non-exclusive, royalty-free licence over this content, limited strictly to operating the Service.
- How your data is processed is explained in the Privacy Policy.

## 8. Intellectual Property
The Service itself — its software, design, texts, card systems, methodology, the names "Wanderer", "Wanderer Studio", "Emre the Wanderer", and all content derived from Emre Güllüce's books — belongs to Emre Güllüce and is protected by intellectual-property law. See the Intellectual Property Notice for details.

## 9. Limitation of Liability
- The Service is provided "as is" and "as available"; we do not warrant that it will be uninterrupted, error-free or fit for a particular purpose.
- To the maximum extent permitted by mandatory law, we are not liable for indirect, incidental or consequential damages arising from the use of, or inability to use, the Service. Your statutory rights as a consumer remain unaffected.
- You are responsible for decisions you make in reliance on AI responses (see Section 3).

## 10. Suspension and Termination
- We may suspend or terminate your account if you violate these Terms; where possible we will notify you in advance.
- You may delete your account at any time via Settings ("Delete My Account Permanently"). Deletion is irreversible.

## 11. Changes
We may update these Terms. Material changes are announced within the app; the current version and effective date appear at the top of this document. Continuing to use the Service after a change means you accept the updated Terms.

## 12. Governing Law
These Terms are governed by the laws of the Republic of Türkiye. The courts and enforcement offices of Istanbul have jurisdiction over disputes; your rights under consumer-protection law in your place of residence remain reserved.

## 13. Contact
Questions: ${HK_CONTACT}

The Turkish text of this document is authoritative; translations are provided for information only.`,
  },

  privacy: {
    title: 'Privacy Policy',
    body: `
In Wanderer you entrust us with your inner world. We honour that trust by explaining clearly how we handle your data. This Privacy Policy is prepared with regard to the Turkish Personal Data Protection Law No. 6698 (KVKK) and the EU General Data Protection Regulation (GDPR).

## 1. Data Controller
Data controller: Emre Güllüce ("Emre the Wanderer" · Wanderer Movement). Contact: ${HK_CONTACT}

## 2. Data We Collect
- **Account data:** username, e-mail address, year of birth, profile photo (if you add one). The Service uses no passwords; you sign in with a single-use code sent to your e-mail address. We also record provider delivery signals for our messages (delivered / bounced / complaint) so that we do not keep writing to a dead address.
- **User content:** your chat messages, notes, ritual records (Transition Space entries, evaluations, promises), your cards and Self Card answers, images you upload.
- **Usage and technical data:** session and activity records (for streak/ritual tracking), in-app screen usage measurements (which screen you spend time on — only screen name, duration and counts are recorded, never content; used to improve the Service), language preference, device/browser information, notification subscription (push token), subscription status.
- Voice dictation and read-aloud run on your device's own speech engines; we do not upload audio recordings to our servers.

## 3. Sensitive Content and Explicit Consent
By its nature, the content you share may include emotional, spiritual or health-related personal information — such as your mood, psychological state or beliefs, which may qualify as "special categories of personal data" (KVKK art. 6; GDPR art. 9). We process such content only to provide the Service to you (storing it, generating responses, personalising your experience); we do NOT use it for advertising profiles and do NOT sell it to third parties. Whether to share such content is entirely your choice; by sharing it you give explicit consent to this processing. You may withdraw your consent at any time: you can delete the relevant content within the Service or request full deletion of your account.

## 4. Purposes and Legal Bases
- Providing the Service and managing your account — performance of contract (KVKK art. 5/2-c; GDPR art. 6/1-b).
- Personalising your experience (memory, personalisation layers, reminders) — performance of contract and legitimate interest.
- Managing subscriptions and payments — performance of contract and legal obligation.
- Security, abuse prevention and debugging — legitimate interest.
- Sending notifications — your explicit consent (you can turn it off at any time).
- **Sign-in codes and transactional e-mail** — performance of contract (KVKK art. 5/2-c; GDPR art. 6/1-b). Without them you cannot access your account.
- **Newsletter** — the consent you give by accepting these Terms at registration, together with our legitimate interest in telling our existing users about our own service (GDPR art. 6/1-f). Every message carries an unsubscribe link; we record your unsubscribe and send you no further newsletters.
- **Delivery records (bounces, complaints)** — legitimate interest: continuing to send to dead addresses both disturbs you and damages the reliability of our sending infrastructure.

## 5. AI Processing
Your chat messages and related context (e.g. your personalisation summary) are transmitted to our contracted AI infrastructure provider to generate responses. Our agreements with providers require that data is processed solely to generate responses; we do not permit them to use your data to train their own models. If the provider changes, this policy will be updated.

## 6. Third-Party Service Providers
We share your data only to the extent necessary to operate the Service, with processors in the following categories:
- Database, authentication and file storage (Supabase);
- AI model provider (response generation);
- Subscription management (RevenueCat) and app stores (Apple, Google) — your payment details stay with the store; we never receive card information;
- Notification delivery (Apple/Google push services, web push);
- E-mail delivery (only for letters you send and service e-mails).
These providers' servers may be located abroad; transfers are made with safeguards compliant with KVKK art. 9 and the GDPR's international-transfer rules.

## 7. Retention and Deletion
- We keep your data for as long as your account is active.
- Using the tools in Settings you can, at any time: download all your data as JSON (Download My Data), wipe all your content without deleting the account (Start Over), or permanently delete your account together with all your data (Delete My Account Permanently).
- Upon a permanent-deletion request, your data is removed from our systems and backups within a reasonable period, except where retention is legally required.
- **Usage measurements** (raw activity records such as which screen you opened and how long you stayed there) are kept in raw form for at most **90 days**. Once that period passes, those records are reduced to daily totals and the raw rows are deleted. The totals count how often a screen was opened; they do not carry what you wrote there.

## 8. Your Rights
Under KVKK art. 11 and the GDPR you have the right to access, rectify and erase your data, restrict or object to processing, receive your data in a portable format, and withdraw consent you have given. You can exercise most of these rights yourself in Settings; for the rest, write to ${HK_CONTACT}. You also have the right to lodge a complaint with the competent supervisory authority (in Türkiye, the Personal Data Protection Authority).

## 9. Security
Your data is protected by technical and organisational measures including encrypted connections (TLS), access control (row-level security) and privilege separation. No system is 100% secure; in the event of a data breach you will be informed in accordance with legal obligations.

## 10. Children's Privacy
The Service is not directed at children under 13; a year-of-birth declaration is required at registration and under-13 registrations are blocked. If we learn that we have collected data belonging to a child under 13, we delete it. Accounts aged 13-17 receive additional protection settings and require parent/guardian consent.

## 11. Cookies and Local Storage
The app uses local storage on your device to remember your session and preferences. We do not use third-party advertising or tracking cookies.

## 12. Changes
We may update this policy; material changes are announced within the app. The current version and effective date appear at the top of this document.

## 13. Contact
For any privacy question: ${HK_CONTACT}

The Turkish text of this document is authoritative; translations are provided for information only.`,
  },

  ip: {
    title: 'Intellectual Property Notice',
    body: `
Wanderer is more than software — it is an integrated work born of Emre Güllüce's books, philosophy and the original methodology he has built over the years. This notice defines the protected scope of that work and the licence granted to you.

## 1. Ownership
The Service, in whole and in every part — unless expressly stated otherwise — belongs to Emre Güllüce and is protected by national and international intellectual-property law, including in particular the Turkish Law on Intellectual and Artistic Works No. 5846 and the Industrial Property Law No. 6769. © ${new Date(HK_EFFECTIVE).getFullYear()} Emre Güllüce. All rights reserved.

## 2. Protected Scope
- **Names and marks:** the names "Wanderer", "Wanderer Studio", "Emre the Wanderer", "Wanderer Movement", and the logo and seal motifs.
- **Literary works:** the books "Wanderer İlişki Felsefesi" (Wanderer Philosophy of Relationships) and "Zihniyet Devrimi'ne Çağrı" (A Call to a Mindset Revolution), together with all quotations, aphorisms and teachings carried from them into the app (including the thesis "Mesele Sensin" — "You Are the Matter").
- **Methodology and original concept systems:** the Transition Space, the Inner Council, the Self Card, the card deck and card ceremonies, the Three Seals, the ritual structures, and the way they are expressed.
- **Visual and audio language:** the interface design, the card visual engine, the typographic system, illustrations and motion language.
- **Software:** the source code, data structures and compiled builds of the application.

## 3. Licence Granted to You
For as long as you use the Service, we grant you a personal, non-commercial, non-exclusive, non-transferable and non-sublicensable licence to access the content. You may share images produced with the app's sharing tools (e.g. card and quote shares) on your personal social accounts, provided the attribution/marks placed by the app are preserved.

## 4. Prohibited Uses
Without prior written permission, the following are prohibited:
- copying, reproducing, publishing or commercially exploiting the content (book quotations, methodology, card texts, interface texts);
- creating derivative works from the content (including similar apps, courses, books or content collections);
- collecting the content or data with automated tools (scraping) or using it to train AI models;
- reverse-engineering or decompiling the software, or circumventing its security measures;
- using the names and marks in a way that implies affiliation or endorsement.

## 5. Your Content Remains Yours
This notice claims no rights over the content you create: your messages, notes and card answers belong to you (see Terms of Use Section 7 and the Privacy Policy).

## 6. Infringement Notices
If you see content within the Service that you believe infringes intellectual-property rights, or you discover an infringement of Wanderer's rights, notify ${HK_CONTACT}. Your notice should identify the work infringed, where the infringement is located, and your contact details.

## 7. Reserved Rights
All rights not expressly granted here are reserved. Failure to enforce any provision of this notice does not constitute a waiver of that right.

The Turkish text of this document is authoritative; translations are provided for information only.`,
  },
};

  return { tr: HK_TR, en: HK_EN };
}
