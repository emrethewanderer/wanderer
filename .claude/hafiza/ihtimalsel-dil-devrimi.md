---
name: ihtimalsel-dil-devrimi
description: "KARAR 2026-08-09: uygulama bilgi verirken ihtimalsel konuşur (-ebilir), emirsel/kesin değil; merkez ilke ölçüm kesin ↔ yorum ihtimalsel; anayasa scripts/i18n-style/tr.md"
metadata: 
  node_type: memory
  type: project
  originSessionId: ba57f63a-720c-46f8-8c79-5f447876aa2f
  modified: 2026-08-11T13:46:21.930Z
---

**Emre'nin kararı (2026-08-09):** "Uygulamadaki Türkçe dâhil tüm kısımlarda bilgi
verirken (kart dâhil) hep '-bilir, ebilir, abilir' şeklinde ihtimâlsel bir dilimiz
olsun, emirsel veya kesin değil."

**Merkez ilke — ölçüm kesindir, yorum ihtimalseldir.** Devrim bir ek taraması değil
bir ayrım işidir: uygulamanın *bildiği* (sayılan gün, kullanıcının yazdığı cümle,
basılan mühür) kesin dilde kalır; uygulamanın *çıkardığı anlam* ihtimalselleşir.
> "Yedi gün üst üste geldin." (ölçüm, kesin) + "Bu, iradenin izi olabilir." (yorum)

Bu, [[gerceklik-mimarisi]]'nin dil katmanıdır: orada kanıtsız **sayı** yasaklandı,
burada kanıtsız **kesinlik**. Aynı tez — *Mesele Sensin*: kullanıcı hakkındaki son
sözü uygulama söyleyemez.

**Emre'nin dört mühürlü kararı:**
1. Sıra: önce TR devrimi, sonra dil dalgaları → [[tum-diller-native-plani]] BEKLEMEDE
   (diller TR'den doğar; kaynak değişirken çeviri her dili iki kez yazdırır).
2. Kapsam: UI bilgi/açıklama + kart metinleri + LLM promptları. **Buton/etiket HARİÇ.**
3. Kanon devrimin DIŞINDA, verbatim: ayetler · Manifesto 12 başlıkları · kitap
   aforizmaları (kart `lesson` dâhil) · tez cümleleri → [[kitap-sesi-manevi-register]]
4. Muaf: hukuk (bağlayıcılık) · kriz yönlendirmesi (güvenlik) · hata mesajları.

**Sonradan eklenen sınırlar (anayasada):** kullanıcının kendi sözü/olumlaması kesin
kalır (yoksa taahhüt çözülür → [[taahhut-dongusu-hesap-gunu]]); kartın semptom
listeleri (`dusunceler`/`inanclar`/`hisler`/`davranislar`) dokunulmaz — "Ben yeterince
iyi değilim" uygulamanın iddiası değil, kullanıcının iç sesinin aynasıdır.

**Why:** Uygulama kullanıcının iç dünyası hakkında konuşuyor; orada kesinlik üslup
hatası değil epistemik bir yalandır. İhtimalsellik tereddüt değil **saygıdır** —
iddiadan vazgeçmek değil, iddianın sahibini kullanıcıya bırakmak.

**DURUM: TAMAM (2026-08-11).** Denetçi taban çizgisi `15b:0 · 15e:0 · 12b2:0` —
kapı K7'nin öz-sertleşmesiyle sert 0-tolerans moduna geçti. 2084 test yeşil,
preview'da canlı doğrulandı. Commit'ler: `cb59931` (FAZ 0–3, 6) + `540579d`
(FAZ 4–5 + denetim düzeltmeleri). Dil dalgaları hâlâ beklemede
([[tum-diller-native-plani]]) — Emre "dil değişimine geçmeden dur" dedi.

**Denetimde bulunan üç kırık (hepsi düzeltildi) — asıl ders bunlar:**
1. **Tez yumuşatıldı, geri alındı.** `mr.item.*.summary` Manifesto'nun 12
   ilkesinin damıtılmış hâli, yani kitabın TEZİ. Anayasada onu "uygulama metni"
   saymak HATAYDI: "kaynağı… içindedir" → "içinde olabilir" oldu. 18 satır
   kanona döndürüldü, `mr.item.*` ailesi denetçide muaf edildi.
   **Kural:** ihtimalsel dil *uygulamanın* kullanıcı hakkındaki hükmünü yumuşatır,
   *kitabın* kendi tezini değil.
2. **Görev maddeleri gözleme dönmüştü.** "Bulduğunu yaz." → "yazmak iyi gelir
   gibi duruyor" — bu bir görev değil, yorum; kullanıcı ne yapacağını anlamaz.
   §4.1'in davet kipine çevrildi (soru · deneme çağrısı · davet, dönüşümlü).
3. **`\b` GOTCHA (tekrar).** Denetçinin emir-fiil regex'i `\b` kullanıyordu;
   JS'te `\b` ASCII sınırıdır, "açık." içinde a|çık arasında sahte sınır üretip
   `\bçık\.` eşleştiriyordu. `(?<![a-zA-ZçğıöşüÇĞİIÖŞÜâîû])` ile düzeltildi.
   Aynı tuzak [[personalization-engine-layers]]'da da yaşanmıştı.

**Kip ölçüsü — kağıttaki kural ölçüsüz tutmaz.** İlk dilim sonunda 15b'de
**120 `-ebilir` · 1 sıklık · 2 görünüş · 2 derece** çıktı (%96 tek araç).
Anayasaya sayısal ölçü eklendi; sonra o ölçü de kalibre edildi: **sert kural
ardışıklığa bağlı** (aynı ailede arka arkaya üç madde aynı ekle bitmez; tek
cümlede iki `-ebilir` olmaz), **global oran pusuladır** (%79 ölçüldü; hedefe
zorlamak 26 cümleyi doğal olmayan araçlara itecekti — metin ölçünün süsü için
feda edilmez).

**Kapının göremedikleri (bilinçli kör noktalar):** `16b/16e` hiç taranmaz (K5);
EN kuralları emir kipini yakalamaz — TR'de davete çevrilen 37 madde EN'de elle
eşitlendi; çıplak-emir fiil listesi elle derlenmiştir, bakım ister (ilk hâli
54 kaçak vermişti: `dene.` ×17, `ver.` ×8, `seç.` ×8).

**Uygulamada çıkan dört karar (2026-08-09 sprinti):**
1. **Olumsuz fiile ihtimal eki anlamı TERSİNE çevirir** — "yıkılmazsın" → "yıkılmayabilirsin"
   *"belki yıkılırsın"* diye okunur, vaat tehdide döner. Çözüm: olumlu fiile ihtimal
   ("taşımaktan kurtulabilirsin") ya da derece aracı ("kolay kolay yıkılmazsın").
2. **Kartta `olunca` geçti, `portre`/`gercek` geçmedi.** Ölçü: cümle kullanıcıya "sen"
   diyorsa iddia sahibi uygulamadır → ihtimalsel; kartı/kavramı tarif ediyorsa tanımdır
   → kesin. Tanımı belirsizleştirmek kartı çözer.
3. **16b/16e denetçi taramasından ÇIKARILDI (K5):** oradaki her değer `prompt.*`tır =
   modele TALİMAT; talimatı gevşetmek davranışı bozar. Modelin çıktı register'ı
   `prompt.identity.core` **XI. KONUŞMA TARZI** bloğunda kurulur. İkinci gerekçe:
   satır-bazlı anahtar takibi uzun template literal'de kayıyor ve gövdedeki AYETİ
   (Mülk 67/2) sahte ihlal olarak gösteriyordu — kapı kanona bekçilik etmeli, onu
   hedef göstermemeli.
4. **XI. KONUŞMA TARZI eski hâliyle devrimi yasaklıyordu:** *"'Belki' yerine 'Şunu
   düşünmeni istiyorum.'"* Yeniden yazıldı: doğrudanlık korunur, **sahiplik** değişir
   ("Sen kaçıyorsun" → "Burada bir kaçınma olabilir mi?"). YÜZLEŞ modundaki "X çünkü Y"
   tanı kalıbı da yapı korunarak kaydırıldı (protokol §6.3 gereği yapı dokunulmaz):
   "Bu, şu an ___ bir kişi olduğun için oluyor **olabilir**." Kriz/ilaç/güvenlik
   sınırlarında yumuşatma YOK — kartuşa açık istisna yazıldı.

**How to apply:** Anayasa `scripts/i18n-style/tr.md` (karar ağacı §7, muaf listesi §3,
kip ailesi §2 — `-ebilir` tek araç olursa metin robotlaşır, beş araç dönüşümlü).
Plan `.claude/plans/ihtimalsel-dil-devrimi.md`. Kapı: `scripts/ihtimalsel-denetci.mjs`
taban çizgisiyle (regresyon kapısı, K7 — sıfırla açılan kapı ilk gün build'i kilitler).
Dil dalgaları başlayınca her `<lang>.md` bu anayasayı miras alır.

İlgili: [[gerceklik-mimarisi]] · [[deste-12-kesit-karari]] · [[tr-en-i18n-tamamlama]] ·
[[emre-kitaplari]] · [[kart-gorsel-dili]]
