# Wanderer Tasarım Prensipleri

> Bu belge, Fable 5 ile birlikte alınan tasarım kararlarının arkasındaki mantığı
> kalıcı kurallara dönüştürür. Amaç: eklenen veya değiştirilen **her** unsurun aynı
> dili konuşması. Yeni bir ekran, kart, buton veya animasyon tasarlarken önce buraya
> bak; sonundaki **kontrol listesini** geç.
>
> Tek kaynak dosyalar: `css/parts/base.css` (token'lar), `css/parts/modes.css`,
> `css/parts/yol.css`, `css/parts/llm-shell.css`, `js/parts/12c-kart-gorsel.js`
> (kart motoru), `js/parts/13f-zaman-dokusu.js` (saat).

---

## 0. Çekirdek felsefe — Form, tezi taşır

Kitabın tezi **"Mesele Sensin"**: olduğun kişiyi değiştir. Tasarım bu cümlenin
görsel hâlidir, dekoru değil. İki sonuç:

1. **Uygulama bir "yer"dir.** Bir araç değil, içine girilen bir mekân. Mekânın ışığı
   saatle değişir, yüzeyi kâğıt gibi dokunsaldır, eşikleri vardır. Bu yüzden parlak,
   düz, "SaaS" hissi veren hiçbir şey kullanılmaz.
2. **Her görsel öğe bir anlam taşır.** Renk, ışık, hareket; hepsi "şu an olduğun kişi"
   ile "olmak istediğin kişi" arasındaki yolu anlatır. Anlamı olmayan süs eklenmez —
   *"kart değil, kaldıraç."*

### 0.1 Derin metafor haritası — her yüzey birini konuşur

Zaltman'ın bulgusu (*Tüketici Nasıl Düşünür*): insan düşüncesinin ezici kısmı
bilinçdışıdır ve **kelimelerle değil imgelerle** yürür. Bu imgeler sonsuz değildir;
kültürler üstü, sayılı **derin metafor**a inerler. Wanderer bu metaforları sonradan
edinmedi — kitabın dili onları zaten taşıyordu. Aşağıdaki tablo o örtük dili görünür
kılar, çünkü **adı konmamış dil zamanla tutarsızlaşır.**

| Derin metafor | Wanderer'daki yüzeyler | Görsel imzası |
|---|---|---|
| **Yolculuk** | Eşik Ekranı (02d), Üç Mühür Yol (10f), Mesafe Motoru (13x) | İki kutup arasında çekilmiş çizgi; altın→lapis degrade |
| **Dönüşüm** | Olunan [Ad] (02c), Olmak İstediğin Kişi (10D), Kimlik Motoru (13l), Oluş Mührü | Kartın evrimi, mertebe, flip |
| **Kap** | Sığınak (10n), Anın Ocağı (10A), Hafıza (09c), Kitaplık | Kapalı sıcak yüzey, ocak/mum ışığı, içeri alan çerçeve |
| **Bağ** | İç Meclis (10p/13i), Kişilerim destesi (10q), Gezgine Mektup (13d) | Çift halka, birbirine bakan kartlar, portre |
| **Kaynak** | Elmas ekonomisi (10g), Günün Armağanı (10s), Kota (13m) | ◆ elmas, kıvılcım, verilme jesti |
| **Kontrol** | Mühür (her tören), Seri Mührü (10t), Söz Defteri (13u) | Basılı-tut, dövülmüş altın, halkanın kapanışı |
| **Denge** | Temeller & Derinlikler (09b), İçsel Hava, Mod Pusulası | Karşılıklı çubuklar, terazi ritmi; ölçen ama yargılamayan dil |

Kurallar:

- **Yeni yüzey açarken hangi derin metaforu konuştuğunu modül banner'ının FELSEFE
  satırına yaz.** Adlandıramıyorsan yüzey henüz tasarlanmamıştır.
- **Bir yüzey aynı anda iki metaforu bağıramaz.** Kap'ın sıcaklığı ile Yolculuk'un
  aciliyeti bir arada okunmaz; ikisi de gerekiyorsa yüzeyi böl.
- **Metafor yüzeye ışık/renk/hareketle girer, etiketle değil.** "Yolculuğuna devam et"
  yazmak yolculuk metaforu kurmaz; iki kutup arasına çekilmiş bir çizgi kurar.
- **Kullanıcının kendi imgesi ürünün imgesini ezer.** İmge Kapısı'nda (13z) seçilmiş
  bir imge varsa o kişinin yüzeylerinde onun imgesi konuşur; uygulama kendi metaforunu
  üstüne bindirmez. Ve uygulama **imge icat etmez** — kullanıcı seçer, biz yankılarız.

**Microcopy denetimi:** imge dili serbesttir (kapı, deniz, ocak, kök, eşik); **soyut
ürün jargonu yasaktır** ("deneyimini kişiselleştir", "profilini zenginleştir", "içgörü
paneli"). Sayaç dili zaten yasak. Ölçü tek soru: cümle bir **imgeyi** mi çağırıyor,
yoksa bir **özelliği** mi tarif ediyor?

---

## 1. Renk — Üç kutuplu anlam ekseni

Renk burada **dekor değil, dildir.** Üç ana renk üç kavramı kodlar; bu eşleşme asla
bozulmaz.

| Renk | Token | Anlam |
|------|-------|-------|
| **Altın** | `--gold #F5A623` / `--gold-bright #F7C744` | **ŞİMDİ** — olduğun kişi, eylem, **mühür**. Mühür *daima* altındır. |
| **Lapis** | `--lapis #2D5FA8` / `--lapis-bright #5A8AD8` | **GELECEK** — olmak istediğin kişi, hayal, vizyon, içsel derinlik. |
| **Bronz** | `--bronze #C9A24B` | **SÖZ / yemin** — verdiğin söz. (Üç Mühür'ün üçüncü vuruşu.) Mühür DAİMA altın kalır; bronz yalnızca söz *içeriğinin* aksanıdır. |
| Obsidyen | `--bg #0F0C08` → `--surface #1D1712` | Taban. **Asla saf siyah değil** — kahve/amber alt tonlu, ısıtılmış. |
| Kırmızı | `--red #C0392B` | Yalnızca kritik/yüzleşme/uyarı. Süs olarak kullanılmaz. |

Kurallar:
- **Altın = sıcak/eylem kutbu, Lapis = serin/hayal kutbu.** İkisi tezhip/antik
  estetiğin klasik eşleşmesidir. Bir geçişi/yolu çizerken degrade **altından lapise**
  akar (`linear-gradient(90deg, var(--gold), var(--lapis-bright))`).
- **Eşik ışığı her zaman altındır.** Lapis (gelecek) sahnede bile kapı/davet altın
  kalır — "şimdi"nin çağrısı. (`12c-kart-gorsel.js` PALETTES.lapis.glow yine altın.)
- **Metin seçimi lapis** (`::selection`) — marka dokunuşu uygulamanın her yerinde.
- Yeni bir vurgu rengi ekleme. Bir renge ihtiyacın varsa, önce ona iliştireceğin
  **anlamı** bul; anlam yoksa renk de yok. Mod renkleri (`--mode-*-color`) bu kuralın
  zaten tanımlı istisnalarıdır.
- Metin hiyerarşisi sıcak fildişi → sıcak gri kademeleridir, asla nötr gri değil:
  `--text #EAE2D6` → `--text-mid #95897A` → `--text-dim #585349`.
- 🔒 **T4 · Altın/lapis zeminin mürekkebi de sıcaktır.** Altın bir yüzeyin
  ÜZERİNDEKİ koyu metin `var(--gold-ink)` (#1A1206) ile yazılır. Saf `#000`
  o sıcak skalanın dışına düşer: altın üstünde mürekkep gibi değil, **delik**
  gibi okunur. Kural blok bazlıdır — aynı kuralda altın/lapis/bronz dolgu ve
  çıplak siyah metin bir arada bulunamaz.

---

## 2. Zaman — Yüzey saatle yaşar

Mekânın ışığı günün vaktine göre kayar. (`13f-zaman-dokusu.js` + `base.css`)

- `<html>`'e `tw-morning | tw-day | tw-evening | tw-night` sınıfı takılır
  (10 dk'da bir + sekme görünür olunca). Eşikler: **05–11 sabah, 11–17 gündüz,
  17–22 akşam, 22–05 gece.**
- **Obsidyen taban sabit kalır;** yalnızca düşük opaklıklı `--dawn-*` (indigo/gül/
  kehribar/şeftali) şafak token'ları kayar. Sabah serin gül+indigo, gündüz dengeli,
  akşam kehribar ısınır (ocağın başı), gece indigo derinleşir.
- **Kalıcı ambient mood = gün doğumu.** Ekranın altından yükselen sıcak ufuk
  parıltısı (`#chat-view::before` peach+amber radial) her zaman oradadır.
- **Yeni tam ekran sahneler `tw-*` tonlarını almalı.** Örnek kalıp: `yolp-scene`
  (`yol.css`) her vakit için ayrı gökyüzü degradesi tanımlar. Yeni bir "sahne"
  açıyorsan aynısını yap.

---

## 3. Doku & yüzey — Kâğıt, gren, ısıtılmış obsidyen

Hiçbir yüzey düz/steril değildir; hepsi hafifçe fiziksel.

- **Kâğıt greni her büyük yüzeyde var.** Paylaşılan statik SVG noise `--grain-img`,
  çok düşük opaklıkta (0.05–0.25). Animasyonsuz (browser bir kez rasterize eder).
  ⚠️ Gren üstünde `mix-blend-mode` kullanımı kırılgan — bazı yüzeylerde yasak
  (bkz. Gezgine Mektup notu); şüphedeysen düz `opacity` ile koy.
- **Atmosfer = köşelerden gelen radial degradeler.** Kart/sahne zeminleri tek renk
  değil; bir köşeden altın (`rgba(245,166,35,.07)`), diğerinden lapis
  (`rgba(45,95,168,.11)`) sızar, alta linear obsidyen oturur. (`yol-hero`, `cl-composer`.)
- **Fiziksel objeler: üstten ışık, alttan gölge.** Gönder butonu "dövülmüş altın
  mühür" — `inset 0 1px 0 rgba(255,255,255,.38)` (üst ışık) + dış altın glow + basınca
  `scale(.93)`. Önemli interaktif öğeler bu "mühürlenmiş" his ile yapılır.
- **Çizgiler kıl gibidir, kenarlara doğru erir.** Düz `border` yerine uçlarda
  saydamlaşan degrade çizgi (`linear-gradient(90deg, transparent, ..., transparent)`).
  Scrollbar 2px. Ayraçlar sert değil, eriyen.
- **İÇERİK de erir — kural yalnız çizgiye ait değil.** Kaydırılan bir şerit
  kadraja çarpmaz, karanlığa girer: kartın yarısı bıçakla kesilmiş gibi
  bitmez. Motor `base.css`'te tektir ve **token**dur: tüketici kendi
  kuralında `--mask-fade-x` (iki yan kenar) ya da `--mask-fade-b` (yalnız alt
  kenar; gövde "devamı var" der, altındaki mühre değmez) içer. Elle
  `linear-gradient` maske yazmak ikinci bir ağız açar.
  Erime mesafesi `--fade-edge` (28px).
  > Bu satır 2026-08-28'de yazıldı. Kural o güne dek yalnız çizgiye
  > uygulanmıştı: repoda `mask-image` kullanımı **sıfırdı** ve beş kaydırma
  > kabının hepsi kesik kenarla bitiyordu. Anayasa maddesi eksik değildi —
  > **eksik olan uygulamaydı.** Bu yüzden §5'in reduced-motion'ı gibi bu da
  > artık kapıya bağlı değil ama kalıbı yazılı: yeni bir yatay şerit
  > açarken maskeyi tak.
  >
  > Maske **kenarlıksız** kaplara asılır (`border` da erir) ve tam ekran
  > `scroll-snap: mandatory` sayfa kaydırıcılarına asılmaz (sayfanın kendi
  > kenarını yer). İki eleme örneği: `.doc-tablebox`, `.kar-yatay`.
  > ⚠ Maskeli kapta `position: sticky` çocuk kırılır; maske GPU katmanı
  > doğurur — 96px ızgara hücrelerinde kullanma.

---

## 4. Tipografi — Dört sesli koro

Her font bir "ses"tir; rolü dışında kullanılmaz.

| Font | Token | Rol |
|------|-------|-----|
| **Cinzel** | `--cinzel` | Marka majüskülü, kicker'lar, etiketler. Büyük harf, geniş harf aralığı (2–7px), genelde altın. Törensel/Roma sesi. |
| **Fraunces** | `--serif-display` | Büyük selamlamalar, başlıklar. Optik boyutlu, mürekkepli display serif. |
| **EB Garamond** | `--serif` | Gövde, akış metni, **şiirsel italik satırlar**. |
| **Barlow** | `--sans` | Arayüz/işlevsel metin, butonlar, ince yazı. |
| IM Fell English | `--fell` | Nadir antik aksan. |

Tekrarlayan kalıp (her başlıkta uygula):
```
[CINZEL kicker — küçük, geniş aralıklı, altın]
[Fraunces/serif büyük başlık]
[EB Garamond italik açıklayıcı/şiirsel satır — text-mid]
```
- Kicker'lar: 8–13px, `letter-spacing` 2.5–7px, `text-transform: uppercase`, altın.
- 🔒 **T5 · Display serif 28px üstünde sıkılaşır.** Fraunces optik boyutludur:
  büyük puntoda nötr aralıkla dizilince "büyütülmüş gövde metni" gibi okunur,
  başlık gibi değil. `letter-spacing: var(--ls-display)` (−0.015**em** —
  oran, mutlak px değil; aralık puntoyla büyümeli).
  Kapı **değeri** değil, **kararın verilmiş olmasını** denetler: bir tören
  başlığının bilinçli olarak geniş dizilmesi meşrudur, yazılması şarttır.
  **Sayıya ve tek glife uygulanmaz** — harf aralığı iki harf arasında yaşar;
  rakam sütunlarında `tabular-nums` hizasını bozar. Sayı yüzeyleri
  `/* TASARIM-MUAF: gerekçe */` ile beyan edilir (emsal: `.wr-big`,
  `.kt-ring-num`, `.om-teaser-num`, `.kt-prem-hero-inf`).
- ⚠️ **Türkçe büyük harf tuzağı:** locale'e bağlı `text-transform: uppercase`
  noktasız-ı (I/İ) üretebilir. Tören başlıklarında metni HTML'de **gerçek Türkçe
  büyük harflerle yaz**, CSS transform kullanma (`wns-sub` notu).
- 🔒 **Büyütmenin locale'i KÖKTEN gelir.** Repodaki 215 `text-transform:
  uppercase`'in hiçbiri `localeUpper`dan geçmez ve geçmesine gerek de yoktur:
  tarayıcı büyütme dilini **sayfanın kökünden** (`<html lang>`) okur. Yani o
  215 yüzeyin doğruluğu tek bir şeye bağlıdır — kökün arayüz diliyle senkron
  kalması. `15-i18n.js` bunu yapar ve `dil-buyuk-harf-kapisi.test.js`'in
  "CSS kolu" bloğu onu kırılmaktan korur. Kırılırsa görünen sonuç:
  EN arayüzde "THİS PATH", "FOUNDATİONS".
  **Sabit dilli yüzey istisnadır:** metnini i18n'den ALMAYAN bir yüzey (admin
  panelleri) sayfanın diline teslim edilemez — kabına kendi dilini verir:
  `host.setAttribute('lang', 'tr')`. Emsal: 13q Gözlemevi, sayfa `lang="en"`
  iken on bir başlığı "ZAMAN HARİTASI" yerine noktasız basıyordu.

---

## 5. Hareket — Ev eğrisi ve nefes

- 🔒 **T3 · Ev eğrisi `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`** — güçlü
  yavaşlamalı yay. *Tüm* giriş/geçiş hareketlerinin standart dili.
  `--ease-smooth` buna işaret eder. Eğriyi elle yazmak token'ı ikizler: eğri
  bir gün ayarlanırsa kopyalar eski değerde kalır ve uygulama iki ayrı hızda
  hareket eder. `var(--ease-out, cubic-bezier(…))` biçimindeki **fallback
  serbesttir** — token asıldır, eğri yalnız o düşerse devreye girer (§5.2
  savunmacı stil). Başka bir eğri (spring, ease-in-back) meşrudur; kapı
  yalnız ev eğrisinin çıplak kopyasını arar.
- **`--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)`** (taşmalı) yalnızca **oyunsu/
  kutlama** anları için: vuruş nabzı, paket açma, mühür zıplaması.
- **Kademeli giriş:** birden çok öğe aynı anda değil, `nth-child` gecikmeleriyle
  sırayla süzülür (kapılar, başlatıcı çipleri). Süreler: `--anim-fast .15s`,
  `--anim-normal .3s`, `--anim-slow .45s`, `--anim-xslow .8s`.
- **Kademeli giriş KAYDIRIRKEN de sürer — `.wn-reveal`.** Kural uzun süre
  yalnız ekran AÇILIŞINDA yaşadı (`.casc`, 21 tetik); aşağı inerken hiçbir şey
  uyanmıyordu. Oysa uygulama bir *yer*dir (§0) ve uzun bir yüzeyde aşağı inmek
  orada **yürümektir**: konuşulan metafor Yolculuk'tur (§0.1), her bölüm yolun
  bir durağıdır. Motor `00a-infrastructure` §16 (`wnRevealInit` /
  `wnRevealScan`); işaret `data-reveal`, belge katmanının `.doc-section`'ları
  otomatik kapsanır. Kademe `--reveal-i` (60ms/adım), mesafe `--reveal-y` (16px).
  - **Bir kez uyanan sönmez.** Geri kaydırınca bölümlerin yeniden kaybolması
    yürüyüşü değil bir efekti anlatırdı — yol geriye akmaz (§0: anlamı olmayan
    süs eklenmez). Uyanan öğe gözlemden düşer.
  - 🔒 **Gizleme `html.wn-reveal-on` kapısına asılıdır.** JS düşerse,
    `IntersectionObserver` yoksa ya da motor hiç açılmazsa içerik **görünür
    kalır** (§5.2 "asla bloklama"). Bir giriş animasyonunun bedeli, içeriğin
    kaybolma riski olamaz. reduced-motion'da motor sınıfı hiç takmaz.
  - ⚠️ **Gizleme yalnız EKRAN DIŞINDA yapılır.** Görünen bir öğeye `.wn-reveal`
    takmak onu bir kare soldurur, sonra `.wn-seen` geri açar — kullanıcı
    içeriğin yanıp söndüğünü görür. İlk yazımda sınıf tarama anında takılıyordu
    ve kırık tam buydu; gözlemcinin `else` kolu bunun için var.
  - ⚠️ Bu motor **preview'da doğrulanamaz**: sayfa `visibilityState: hidden`
    iken tarayıcı IntersectionObserver'ı hiç çalıştırmaz (ham bir IO bile
    tetiklenmez). Davranışı `tests/00a-uyanan-sahne.test.js` sahte gözlemciyle
    sürer; preview yalnız CSS tarafını (opaklık/geçiş) doğrular.
- **Nefes:** durağan ama "canlı" öğeler yavaş opacity/glow nabzı atar (4–4.5s,
  `llmGlyphBreath`, `yhPulse`, `yolUltraGlow`). Tek seferlik flaş değil, sürekli.
- **Flip dili:** ön↔arka yüz `rotateY` ile iki aşamalı döner (0→90° kaybol, −90→0°
  belir) + tam ekran başlık perdesi yüzün adını söyler ("Wanderer" lapis süpürme /
  "Wanderer Studio" altın süpürme). Mini ikizi `#flip-fab` — kendi ekseninde periyodik
  tam tur atarak "ben bir çevirme kartıyım" der.
- 🔒 **T2 · `prefers-reduced-motion` zorunludur, opsiyonel değil.** Her yeni
  animasyon bloğunun sonunda `@media (prefers-reduced-motion: reduce)` ile
  `animation/transition: none` ver. Bu kural istisnasız — ve artık koşuluyor:
  `@keyframes` tanımlayan bir CSS dosyasında koruma bloğu yoksa vitest kırılır.
  ⚠ **Tuzak:** bir öğe görünürlüğünü animasyondan alıyorsa (açık `opacity: 0`
  + `animation … both`), hareketi kesmek onu GÖRÜNMEZ bırakır. O selector'da
  opaklığı elle geri ver (emsal: `.mt-row { animation: none !important;
  opacity: 1; }`). Aynısı ilerleme çubuklarında genişlik için geçerlidir.
  ⚠ Akış `animationend`'e bağlıysa animasyonu kesmek töreni durdurur —
  önce JS'in `reduce`'u kendi bildiğini doğrula (emsal: `13j-wrapped.js`
  otomatik sahne ilerlemesini reduce'ta zaten kapatır).

---

## 6. Form & kart dili

- **Cömert köşeler:** kartlar `--radius-lg 20px` / `--radius-xl 24px`; pill'ler
  `--radius-full`. Küçük çipler 12–18px. Sert/keskin köşe kullanma.
- **Boşluk da token'dır: `--sp-1..7` + `--sp-section`.** Bir yüzeyin sakinliği
  renkten değil, **tekrarlayan** boşluktan gelir — aynı ölçü ikinci kez
  görüldüğünde göz ritmi tanır ve yüzey "tasarlanmış" okunur. Merdiven 4'ün
  katlarıdır (4·8·12·16·24·40·64), bölüm nefesi `--sp-section` (96px).
  Ara değer icat etme, bir üst basamağa çık.
  > 2026-08-28'e dek `base.css`'te 152 token vardı ama **boşluğun token'ı
  > yoktu**: her ekran kendi dolgusunu kendi uyduruyordu. Utility sınıf
  > (`.p-6` vb.) YAZILMAZ — repo Tailwind kullanmıyor; mevcut CSS kendi
  > dolgusunu token'dan içer.
- **Tarot kartı ana metafordur.** 5:7 oran, ince **çift çerçeve + 4 köşe tiki**,
  Cinzel majüskül + EB Garamond.
- **TÜM kart yüzeyleri tek motordan çizilir** (`12c-kart-gorsel.js` → `ikvCardFace`).
  Kişi Kartı (10q), yolculuk kartı (12a), kilometre kartları (10t), Yol kutup kartları
  — hepsi aynı şablon. Yeni bir "kart" gerekiyorsa bu motoru kullan, paralel bir kart
  stili yazma.
- **İçerik-uyum (en önemli kart kuralı):** kartın görseli anlamından türer —
  *kategori* sahneyi (kapı/halka/pencere/çift…), *glyph* figürü, *erdem* aksanı,
  *kademe* bitkiyi (`filiz/kök/taç`), *kart kimliği (id)* deterministik yıldız
  haritasını belirler. Sonuç: aynı şablon, ama her kart görsel olarak **tek**.
- **İki kutup kart formunda:** altın çerçeve = şimdi, lapis gece (yıldızlı) = gelecek.
  Kart sırtı koleksiyonun ortak yüzü (kafes dokusu, çift halka, fener-mührü,
  EMRE THE WANDERER).
- **Ölçek:** container query (`cqw`) + px fallback → 96px ızgara hücresinden 280px
  detay kartına aynı şablon. Izgara/mini boyutta `drop-shadow` filtrelerini soy
  (GPU maliyeti).

---

## 7. Tören — Anlamlı eşikler

Önemli anlar bir toast değil, **sahnelenmiş bir tören**dir.

- Mühürleme, kilometre taşı, bütünleşme, flip başlığı, eşik ekranı — hepsi tam ekran
  veya odaklı sahne. "Bir şey oldu" demek için ekranı durdurup anı işaretle.
- **İlerleme = halka/yay** (SVG `stroke-dashoffset`), dolunca glow ile "uyanır".
  Üç Mühür halkası: seri (altın) / hayal (lapis) / söz (bronz) üç yay.
- **Kilometre taşlarının her birinin yazılı sembolik sahnesi vardır:** 7 ilk hilal ·
  15 kök salan fidan · 30 eşikten geçiş · 60 köprü · 120 ufka giden yol+güneş ·
  180 ikiz benlik · 240 zirve · 365 tam güneş. Yeni eşik eklersen ona da anlamına
  uygun bir sahne yaz — jenerik ikon koyma.
- **Mühür** tekrarlayan ödül motifidir ve **daima altındır.**

---

## 8. Atmosfer, derinlik & düzen

- **Omurga/yol çizgileri** öğeleri bağlar: `yolp-body::before` lapis(üst, gelecek) →
  altın(alt, şimdi) inen tek dikey çizgi. Yolculuğu mekânsal kıl.
- **Yıldız tarlaları** "gece/gelecek" sahnelerine serpilir; lapis sahnelerde serin
  yıldız, altın sahnelerde sıcak yıldız.
- 🔒 **T1 · z-index daima token'dan** (`--z-*`, `base.css`). Inline z-index
  yazma — katman sırası tek yerden yönetilir. Kapının eşiği **20**: altındaki
  değerler bir kabın kendi iç sırasıdır (bir kartın içindeki `z-index: 2`,
  bir modalın kapatma butonundaki `10`), ilk global basamak `--z-topbar: 40`.
  **Yeni bir katman gerekiyorsa sayıyı satıra yazma — merdivene ad ver.**
  Bir katman merdiveninde tehlikeli olan sayının kendisi değil, adının
  olmamasıdır: 2026-08-28'de `--z-ceremony` (9650) ile `--z-toast` (9999)
  arasına elle serpilmiş 38 çıplak değer bulundu ve **değiştirilmeden**
  adlandırıldı (`--z-toren-yol` 9655, `--z-toren-gordun` 9658…).
  ⚠ Tören basamaklarının sırası **canlı bağımlılıktır** — "Gördün" penceresi
  Yol portalının üstünde açılmak zorundadır (9658 > 9655), yoksa pencere
  zeminin altında kalır. Ad verirken sayıyı kaydırma.
- **İki kart birbirine bakar:** kutup kartları hafif 3B duruşla
  (`rotateY(±8deg) rotateZ(±.7deg)`) birbirine döner — Eşik Ekranı / Yol dili.

---

## 8b. Sohbet kutsal alandır — Character.ai'dan çıkarılan beş ders

2026-08-24'te Character.ai'ın çöküşü incelendi: uygulama mağazalarında 1.6/1.9
yıldıza, Trustpilot'ta 1.3'e düştü. Sebep tek bir hata değil, birbirini besleyen
beş karardı. Wanderer'ın yüzeyi bunları **yasak** olarak taşır — çünkü hepsi
tasarım kararıydı, hiçbiri kaza değildi.

1. **Monetizasyon sohbetin İÇİNE girmez.** c.ai konuşma ortasına tam ekran
   reklam koydu; en sık tekrarlanan şikâyet bu oldu. Wanderer'da kota duvarı
   eşikte durur (ekran başında ya da sonunda), akışın ortasında değil. Sohbet
   ekranında reklam, tam ekran satış perdesi, "izle ve kazan" yüzeyi
   **bulunmaz** — kapı testiyle mühürlüdür (`tests/sohbet-kutsal-alan.test.js`).
2. **Hatırlama vaadi ürünün kendisidir; kırılırsa güven topluca çöker.**
   "Yirmi mesajda ismimi unutuyor" şikâyeti, filtre ya da fiyat şikâyetinden
   daha öldürücü çıktı. Yeni bir bağlam kanalı eklerken sor: *bu kanal sessizce
   kırpılırsa kullanıcı ne kaybeder?* Kırpılan şey hatırlamaysa, kanal kendi
   bütçesini alır (`past_days`, `pinned_declarations` emsali).
3. **Güvenlik katmanı sesi öldürmez.** c.ai'ın filtresi tarihsel ve duygusal
   içeriği de kesince yanıtlar düzleşti ("lobotomi"). Emniyet Katmanı ayrı bir
   kattır; manevi register (§6.3, kitap sesi) ona feda edilmez.
4. **Ses bir sözleşmedir.** Sevilen modellerin bir gecede emekliye ayrılması
   kullanıcıların "tanıdığım kişi gitti" demesine yol açtı. Wanderer'ın persona
   anayasası sunucudadır ve model/fallback zincirinden bağımsızdır; sağlayıcı
   değişse de ses değişmez.
5. **İstenen verinin bedeli orantılı olmalı.** Zorunlu yüz taraması, ürünü
   kullanmayı bırakma sebebi oldu. Wanderer beyan-temelli kalır: kullanıcıdan
   istenen her yeni veri, karşılığında ne verdiğiyle birlikte sorulur.

Altıncı ders dildedir: c.ai'ın "bu uygulamayı çalıştırmak pahalı" savunması
öfkeyi büyüttü. **Maliyeti kullanıcıya fatura eden cümle kurulmaz** — kota
duvarı sayaç diliyle değil davet diliyle konuşur.

---

## 9. Erişilebilirlik & mekanik disiplin (tasarımı koruyan kurallar)

Bunlar görünmez ama tasarımın kalitesini ayakta tutar:

- **Min dokunma hedefi 44×44px** (Apple HIG) — tüm butonlar/nav.
- **`:focus-visible` altın outline**; klavye navigasyonu hep görünür.
- `sr-only`, `aria-hidden` dekoratif SVG'lerde, reduced-motion — her yenide.
- **iOS:** input `font-size: 16px` (zoom engeli), safe-area (`--safe-t/--safe-b`),
  overscroll kapalı, metin seçimi kapalı (uygulama hissi) — yazı alanları hariç.
- **Build disiplini:** `_src.html`'i düzenle, `index.html`'i değil; `build.sh`
  üretir (Stop hook otomatik çalıştırır).

---

## 🔒 Kapı — bu belgenin hangi maddesi KOŞULUYOR

> Bu bölüm 2026-08-28'de, bir ölçümün sonucunda yazıldı. Resend'in yüzeyi
> incelenip "onlardan ne alalım?" diye bakıldığında çıkan cevap şuydu: en çok
> işe yarayacak üç tekniğin üçü de **bu belgede zaten yazılıydı ve
> uygulanmamıştı.** §3'ün eriyen kenarı içeriğe hiç değmemişti (`mask-image`
> kullanımı: 0), §5'in "istisnasız" dediği reduced-motion 6 dosyada yoktu,
> §8'in z-index kuralı 38 yerde delinmişti.
>
> Kök neden dikkatsizlik değil, yapısaldı: repoda çalışan altı kapı vardı
> (`gerceklik`, `ihtimalsel`, `bagsiz-ad`, `yetim-kopru`, `dil-buyuk-harf`,
> `gren-kaydirma`) — hepsi bir kurala bağlı, hepsi vitest'i kırıyor. **Tasarım
> anayasası hiçbirine bağlı değildi.** Kapısı olmayan kural, zamanla tavsiyeye
> döner. Yedinci kapı bu boşluğu kapatır.

**Motor:** `scripts/tasarim-denetci.mjs` · **Kapı:** `tests/tasarim-kapisi.test.js`
(ihlalde vitest kırmızı). Elle koşmak için:

```bash
node scripts/tasarim-denetci.mjs --liste
```

| Kural | Madde | Ne denetler |
|---|---|---|
| **T1** | §8 | `z-index` ≥20 çıplak yazılamaz — `--z-*` merdiveninden gelir |
| **T2** | §5 | `@keyframes` tanımlayan dosyada `prefers-reduced-motion` bloğu var |
| **T3** | §5 | Ev eğrisinin çıplak kopyası yok (fallback ve token tanımı muaf) |
| **T4** | §1 | Altın/lapis dolgunun üstünde çıplak `#000` yok |
| **T5** | §4 | Display serif ≥28px'te `letter-spacing` kararı verilmiş |
| **T8** | §1 | Fallbacksiz `var(--x)` bir yerde tanımlı — hayalet token yok |
| **T6*** | §4 | `<html lang>` arayüz diliyle senkron (*`dil-buyuk-harf-kapisi.test.js`'te) |
| **T7** | §0.1 · §5.1 | Yeni `js/parts` modülü banner'sız doğamaz (taban çizgili) |

**Muafiyet.** Bilinçli istisna, ihlalin geçtiği satırda ya da **en fazla 6
satır** yukarıdaki yorumda beyan edilir: `/* TASARIM-MUAF: gerekçe */`.
Gerekçesiz muafiyet de ihlaldir — muafiyetin bedeli nedenini yazmaktır.
(Pencereyi uzatmak kapıyı kırar; emsal ve gerekçe: `gerceklik-denetci.mjs`.)

### Kapının GÖREMEDİĞİ — ve bunu iddia etmediği

Bir kapı, yakalayamadığını belgelemezse olduğundan güçlü görünür. Bu kapı
CSS **kaynağını** okur ve sözdizimsel desen arar; şunlar onun dışındadır:

1. ~~JS içine gömülü stiller~~ → **kapatıldı (2026-08-28).** Denetçi artık
   `js/` altını da tarar: şablon dizesindeki CSS, `style.cssText` ve
   `style.zIndex`. Orada T1/T2/T3 koşar. Kapının göremediği yer, kuralın en
   çok delindiği yer çıktı: 22 çıplak katman değeri oradaydı.
2. ~~§4 Türkçe büyük harf~~ → **kapatıldı (2026-08-28).** Sorun sanıldığı gibi
   215 yüzeyin tek tek denetlenmesi değildi; büyütmenin locale'i **kökten**
   gelir, yani tek bir senkron korunur (yukarıda T6).
3. **Inline `style="…"`** — `_src.html`'in kendi öznitelikleri.
4. **Bir kuralın davranışı** — T2 koruma bloğunun *varlığına* bakar, doğru
   animasyonu durdurup durdurmadığına değil.

### YARGIYA BIRAKILAN maddeler (kapı kurulmaz, kural yine bağlayıcıdır)

Bunlar avlanamaz çünkü ölçüsü sayı değil, anlamdır. Kapısız olmaları
"isteğe bağlı" demek DEĞİLDİR — denetimleri §3.3'ün insan/çapraz-model
gözündedir:

- **§0.1 Derin metaforun DOĞRULUĞU** — "bu yüzey doğru metaforu mu konuşuyor?"
  Metaforun *varlığı* artık kapıda (T7: banner'da FELSEFE satırı zorunlu);
  *doğruluğu* yargıdır ve öyle kalır. Kapı bir cümlenin yazıldığını görebilir,
  doğru cümle olduğunu göremez.
- **§3 Doku** — "yüzey düz mü kaldı?"
- **§6 İçerik-uyum** — kartın görseli anlamından türüyor mu?
- **§7 Tören** — bu an bir toast mı, sahnelenmiş bir eşik mi?
- **§8b Sohbet kutsal alandır** — davranışsal; kendi kapısı var
  (`tests/sohbet-kutsal-alan.test.js`).

### Bu belgeye YENİ bir madde eklerken

Maddeyi yazdıktan sonra tek soruyu sor: **bu ölçülebilir mi?**

- Ölçülebiliyorsa `tasarim-denetci.mjs`'e bir kural ekle, `tasarim-kapisi`ne
  üç test yaz (yakalıyor mu · doğru yerde susuyor mu · muafiyet çalışıyor mu)
  ve maddenin başına 🔒 rozetini koy.
- Ölçülemiyorsa yukarıdaki **yargıya bırakılanlar** listesine ekle.
- İkisini de yapmazsan madde, yazıldığı gün ölmeye başlar. Bu bölüm tam
  olarak o ölümün üç kez yaşanmış olmasından doğdu.

⚠ **Kapı gürültü üretirse töreve döner.** Bir kuralın yanlış pozitifi,
açığından daha hızlı öldürür: T3'ün ilk koşusunda 14 bulgunun 13'ü meşru
fallback çıktı ve kural aynı gün daraltıldı; T1'in eşiği 10'dan 20'ye çekildi.
Yeni kural yazarken önce `--liste` ile koş, çıkan her bulguya tek tek bak.

---

## ✅ Kontrol listesi — Yeni bir unsur eklerken sor

1. **Anlam:** Bu öğenin rengi/ışığı *neyi* söylüyor? Altın=şimdi, lapis=gelecek,
   bronz=söz eksenine oturuyor mu? Anlamsız bir vurgu rengi mi ekledim?
2. **Metafor (§0.1):** Bu yüzey hangi derin metaforu konuşuyor — adını koyabiliyor
   muyum? Banner'ın FELSEFE satırına yazdım mı? İki metaforu birden bağırıyorsa
   bölmem gerekmiyor mu? Kullanıcının kendi imgesi varsa onun önüne geçiyor muyum?
3. **Token:** Sabit hex/px yerine `base.css` token'ı kullandım mı? (renk, radius,
   z-index, easing, süre)
4. **Zaman:** Tam ekran sahne ise `tw-*` tonlarını alıyor mu?
5. **Doku:** Düz mü kaldı? Kâğıt greni + köşe-radial atmosfer + (interaktifse) mühür
   ışık/gölgesi eklendi mi?
6. **Tipografi:** Cinzel-kicker → başlık → italik-serif kalıbına uyuyor mu? Türkçe
   büyük harfi HTML'de mi yazdım?
7. **Hareket:** Girişler `--ease-out`, oyunsu anlar `--ease-spring` mi? Canlı öğe
   nefes alıyor mu? **`prefers-reduced-motion` bloğu var mı?**
8. **Form:** Köşeler cömert mi (≥18px)? Kart gerekiyorsa 12c motorundan mı çiziliyor?
9. **Tören:** Önemli bir an ise toast değil, sahnelenmiş eşik mi?
10. **Erişim:** 44px hedef, focus-visible, safe-area, 16px input — tamam mı?
11. **Build:** `_src.html` üzerinde mi çalıştım?
12. 🔒 **Kapı:** `node scripts/tasarim-denetci.mjs` temiz mi? Bir ihlal
    bilinçliyse gerekçesini `/* TASARIM-MUAF: … */` ile yazdım mı?
    Yeni bir *madde* eklediysem onu ya kurala ya da "yargıya bırakılanlar"
    listesine bağladım mı? (bkz. § Kapı)
