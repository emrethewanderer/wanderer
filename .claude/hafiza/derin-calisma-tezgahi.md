---
name: derin-calisma-tezgahi
description: "Derin Çalışma (13A) — Max'in tezgâhı; dokuz kavram + Ko-Zo + Kazanma Yöntemi + Süper Odak + Dönüşüm Hattı + Sefer; kapı ayrımı dcCanWork/dcGuardWork; 08-17 denetimi: arşiv defteri + kaynak ayrımı + odak bağlamda"
metadata: 
  node_type: memory
  type: project
  originSessionId: 571fdbcd-29ce-4d4b-befc-3d7daf413421
  modified: 2026-08-17T15:35:27.042Z
---

`js/parts/13A-derin-calisma.js` + `css/parts/derin-calisma.css`. Alan HERKESE
açılır (önizleme); kilit alanın kapısında değil **çalışmada**: Max olmayan bir
kez tadar (`etw_dc_tat_v1_<uid>`), sonrası spotlight. Plan:
`.claude/plans/derin-calisma.md`.

Bölümler (2026-08-17 · FAZ 1–8): dokuz kavram tezgâhı (09b'den okunur, liste
ikinci kez yazılmaz) · Çalışma Kağıdı 4 adım (13b) · **Ko-Zo** (Kitap 2 #59) ·
**Kazanma Yöntemi** (#52) · **Süper Odak** (#134) · **Sefer** (10h) · dört oda
kartı · **Dönüşüm Hattı** (12) · arşiv. Kendi state'i tek anahtarda:
`etw_dc_v1_<uid>` (`kozo` · `kazanma` · `odak`); Hat ve Sefer kendi
kaynaklarında yaşar (12'nin cache'i · `challenge_progress`).

**Why — bu alanda pahalıya öğrenilen kurallar:**

1. **Kapı iki adımlı akışta İKİYE ayrılır.** Hem form açılışı hem mühür
   `dcGuardWork()` çağırırsa, Max olmayan kullanıcı formu açarken tadını harcar
   ve DOLDURDUKTAN SONRA kendi kilidine çarpar — yazdığı çöpe gider. Doğrusu:
   açılışta `dcCanWork()` (izin sorar, tat harcamaz) + `dcShowLock()`, mühürde
   `dcGuardWork()` (tadı orada harcar). Kendi kaydını işaretlemek/silmek/
   kaldırmak **hiç kapıya takılmaz** — kullanıcı kendi verisinin sahibidir.
   **Kağıt bu dersten önce yazılmıştı ve 2026-08-17 denetiminde düzeltildi:**
   mühür `13b ckSeal`'de olduğu için kapı oraya `window.dcGuardWork` köprüsüyle
   iner ve **`card.closest('#dc-kagit-host')` ile kapsamlanır** — sohbette
   LLM'in getirdiği kağıt (13a) alanın tezgâhı değildir ve kapısızdır; kapsamsız
   bir kapı ücretsiz akışı kilitler.
2. **Kapı ALANIN kendi tezgâhına aittir, başkasının yoluna değil.** Sefer
   Engeller (10m) / Örüntü (09d) gibi ÜCRETSİZ kapılardan başlıyor; DC'de
   yalnız görünür oluyor → mühürlemek kapıya TAKILMAZ (DC_ROOMS'un
   `gate:false` gerekçesi). Buna karşılık Dönüşüm Hattı ÜRETMEK gerçek bir
   LLM çağrısıdır → `dcGuardWork()`; üretilmişi OKUMAK kapısızdır.
3. **Söz otomatik yazılmaz, davet edilir.** `sdSenkronla` günün `pledges`
   kaynağını senkronlar; oraya dışarıdan yazmak 10s'in sözleşmesini ezer ve
   töreni çiğner. Ko-Zo maddesinde ✦, kağıdın 4. adımında düğme →
   `glGiveSozNow()`. Mührü kullanıcı basar ([[olus-muhru-2-muhru-sen-basarsin]]).
   **Ama davet CÜMLEYİ de taşır** — imza `glGiveSozNow(oneri)`; argümansız
   çağırmak kullanıcıya maddesini baştan yazdırır. Bu kırık iki kez ayrı ayrı
   yapıldı (kağıt · Ko-Zo), ikisi de sonradan düzeltildi.

4. **Sessiz `catch` ile sessiz `?.()` aynı şey değildir (2026-08-17).**
   `try{}catch(_){}`nin savunmacı olduğu yer SÜSLEMEDİR (`fxCue`, `toRoman`).
   Kullanıcının bastığı, sunucuya giden bir eylemde (sefer mührü) sessizlik
   **sahte başarıdır** (§6.2): gerçek hata toast'ı + düğme geri gelir. Ayrıca
   `window.foo?.('x')` fonksiyon yoksa **exception ATMAZ**, sessizce `undefined`
   döner — yani `catch` bloğundaki fallback hiç çalışmaz. Fallback isteniyorsa
   varlık `typeof` ile sorulur.

5. **Yerinde tazeleme bir kademe AŞAĞIDA da geçerlidir.** "Kendi host'unu bas"
   kuralının gerekçesi kullanıcının altından yarım işi çekmemektir; aynı gerekçe
   bölüm içinde de işler — Kazanma Yöntemi'nde geçmiş listesi form AÇIKKEN de
   görünür, o yüzden silme bölümü baştan basamaz (`_kyGecmisTazele` yalnız
   listeyi dokur). Satırı DOM'dan koparmak da yetmez: gösterilen son üç kayıttır,
   biri gidince daha eskisi açığa çıkar.

6. **Arşiv bir liste değil DEFTERDİR (2026-08-17).** Mühürlenen kağıt geri
   açılır: satır `aria-expanded` kapısı, panel dört adımı kaydın kendisinden
   keser, etiketler kağıdın sözlüğünden okunur (`ck.step*`). `ses_id` varsa
   `idbGetRecording` sorulur ve düğme **ancak blob gerçekten bulunduğunda**
   basılır — kitabın "kaydet ve DİNLE" pratiği tekrar edilebilir olmadan pratik
   değildir. Object URL her çalmada yenilenir, panel kapanınca bırakılır.
   Silinen kağıdın blob'u da silinir (`idbDeleteRecording`, kayıt gitmeden ÖNCE
   okunur). `00b` doğrudan import edilir — altyapı katmanıdır, window köprüsü
   gerektirmez.

7. **KAYNAK AYRIMI: kimin cümlesi olduğu görünmelidir (§6.10).** Kağıdın 3.
   adımındaki olumlama `tmpl.affirmation`'dır — **kitabın şablonu**, kullanıcı
   onu yazmadı, okudu. Diğer üç adım kullanıcının beyanıdır. Repo bu ayrımın
   dilini zaten konuşuyor ve yenisi İCAT EDİLMEZ: **`«…»` kullanıcının kendi
   cümlesi** (`dc-kavram-alinti`, `dc-ky-kanit`), **`“…”` kitabınki**
   (`ck-affirmation`). Arşivde kullanıcının cümlesi `--text` (fildişi, en
   okunur), kitabınki kısık altın italik + `· kitaptan` notu. Hiyerarşi tezin
   kendisidir: göz önce KULLANICININ sözüne gitmeli.

8. **Süper Odak artık alanın dışına çıkar.** `09a _buildOdakContext` →
   `buildPersonalizationPrompt`; `window.dcOdakGet` köprüsü, `p('prompt.odak.baglam')`
   anahtarı. **Beyandır, ölçüm değil**: skor/yüzde/"odak gücü" üretilmez, odak
   yoksa satır hiç girmez (boş alan modele "hedefi yok" diye okunmamalı).
   Studio alt satırına **girmez** (ölçüldü, reddedildi): `ws-st-room-sub` odanın
   DURUMUNU söyler, hedef bir içeriktir ve o darlıkta kırpılır — kırpılmış bir
   söz gösterilmemiş sözden kötüdür.

**How to apply:**
- Yeni tezgâh eklerken: kendi `_xBas()` host'unu bas (alanın tamamı yeniden
  basılmaz — açık kağıt/yarım form kullanıcının altından çekilmesin), `_default()`'a
  alanını ekle (eski kayıtta yoksa yerinde onar, veri düşürme), kapıyı yukarıdaki
  ayrımla kur, i18n TR+EN parite.
- **Dış motorları import ETME, window'dan oku:** `omGetDirencliOruntuler` (09d,
  "kimse bu modülü import etmez" konvansiyonu) · `oikGetDesired` (10D, dairesel
  bağ) · `glGiveSozNow` · `fxCue`. Motor yoksa/patlarsa sessizce davete düş.
- **API adını VARSAYMA, grep'le:** plan `omGetPatterns` diyordu, gerçek ad
  `omGetTopPatterns` çıktı (ve o LLM prompt'u için string dokuduğu için UI'ya
  ayrı bir ham okuyucu eklendi).
- **K6 gerçeklik:** kanıt yoksa sayı YOK, davet var. Kavramda kapı
  `signals_count >= 3`; Kazanma Yöntemi'nde damıtılmış örüntü. Süper Odak'ta
  OİK'in adı yalnız GÖSTERİLİR — uyum SKORU üretilmez (uydurulmuş yüzde tezin
  ihlalidir). Testler "bölümde tek rakam yok"u regex'le tutar.
- **Yorum ile kanıtı ayır, yorumu ETİKETLE.** Dönüşüm Hattı'nın bölüm
  başlıkları modelin okumasıdır (`dc.hat.okuma` satırı bunu söyler, altın
  ALMAZ); altındaki gün satırları kullanıcının kendi özet başlıklarıdır.
- **Götüreceği yer yoksa satır kapı gibi durmasın.** Hat'ın gün satırları
  bilinçle TIKLANMAZ: `w2OpenDaySummary`'nin kabuğu (`#w2-summary-page-container`,
  `#history-view`) DOM'da yok. Bağlamak sessiz bir vaat kırığı olurdu.
- Harness: `.claude/harness/derin-calisma.html` — `?oruntusuz=1` K6'nın sessiz
  hâli · `?hatsiz=1` hattın daveti · `?azgun=1` hattın kanıt kapısı ·
  `?sefersiz=1` seferin sessiz hâli · `window.__S` ile Max kapısı canlı
  sınanır. Preview anon oturumda alan açılmaz.
- **GOTCHA — bayat ES modülü (2026-08-17):** harness'ta bir modülü düzenledikten
  sonra tarayıcı ESKİ sürümü sunmaya devam edebilir; sayfa yenileme, `?cachebust`
  query'si ve YENİ SEKME yetmedi. Çözen tek şey **yeni port (yeni origin)** oldu.
  Belirtisi: yeni eklenen export `is not a function`, ya da `p()` ham anahtarı
  döndürüyor. Kod değil koşum sorunudur ama canlı doğrulamayı yanıltır —
  [[preview-sw-bayat-modul]]'ün HTTP tarafı.
- **GOTCHA — `--text-light` repoda TANIMLI DEĞİL** ama 13 yerde kullanılıyor
  (`chat.css` ×10 dahil `.ck-input`, `features.css` ×2); o metinler rengi kazara
  MİRAS alıyor. Derin Çalışma yüzeylerinde kullanma — tanımlı `--text` /
  `--text-mid` / `--text-dim` kullan.

Denetim planı (2026-08-17, 5 faz, hepsi bitti):
`.claude/plans/derin-calisma-denetim.md` — dokuz doğrulanmış bulgu ve
karşılıkları. Özgün yapım planı: `.claude/plans/derin-calisma.md`.

İlgili: [[gerceklik-mimarisi]] · [[ihtimalsel-dil-devrimi]] ·
[[olmak-istedigin-kisi]] · [[oruntu-motoru]] · [[emre-kitaplari]] ·
[[preview-harness-anon-oturum]] · [[preview-sw-bayat-modul]] ·
[[route-kapisi-bos-ekran]] · [[personalization-engine-layers]] ·
[[ses-katmani-dikte-okuma]] · [[gunluk-ritus-armagan-soz]]

---

> **BUGÜN PENCERESİ (2026-08-18).** Sökülen Kişilerim deste bölümünün yerine
> alanın Bugün kesiti geldi: `dcRenderBugun()` → `#dc-bugun`. Yeni motor yok —
> `dcBugunKesit()` Süper Odak'ın hedefini, yoksa Ko-Zo'daki son AÇIK hamleyi
> döndürür (kurulmuş madde hatırlatma değildir). Beyan yoksa sayı değil davet
> (K6). Kullanıcının cümlesi «…» ile ve fildişi; durum satırı odanın alt
> satırıyla AYNI sözlükten konuşur (`dc.sub_*`). Kabuk `.dcb-*`, Bugün'ün
> bölüm dilini sürdürür. Ayrıntı: [[karsilasma-odasi]].
