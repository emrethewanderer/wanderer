---
name: nur-alfabesi-plani
description: "Şeytanla Savaş → Alfabe Işık; 10 fısıltı→nişan çifti — 4 FAZ TAM (kapı kazıması + koç köprüsü [NISAN:id] + Örüntü Aynası çıpası + OİK Yolunun Nişanı + eşik izi); 2026-07-24 sohbet kâğıdı ambient filigranı (Faz 2 alt-parça) güneş gibi göründüğü için SÖKÜLDÜ, kapı kazıması/kart izi KORUNDU; yalnız push şablonu ELLE bekliyor"
metadata: 
  node_type: memory
  type: project
  originSessionId: 67348c5a-7180-4222-8b20-8be47765414c
  modified: 2026-08-07T15:14:38.186Z
---

**Şeytanla Savaş · Alfabe Işık** (eski kullanıcı-yüzlü adı "Nur Alfabesi",
2026-07-06 ikinci turda değişti) — "War with the Devil.pages" (Wanderer Work
klasörü; iwa'dan söktüm) araştırmasından Wanderer'a göre tasarlanan plan;
artefakt: `.claude/plans/seytanla-savas-nur-alfabesi.md` (başında güncelleme
notu var). Emre "Onaylıyorum" dedi → Faz 1 aynı oturumda şiplendi; ikinci
turda "buraya kadar yaptıklarını analiz edip sorunları giderip iyileştir,
devam et" + rename + tek ayet istendi → hepsi uygulandı.

Merkez kavram: çağın 10 karanlık sembolü = **Fısıltı** (vesvese, dışarıdan);
karşılarına 10 **Nişan** (Kapalı Göz, Halka, Asa, Boyun Eğmiş Satürn, Birleşen
Zemin, Tohum, Sancak, Beş Nur, İnsan-ı Kâmil, Kalpte Nur — bu iç birim adı
"Nişan" DEĞİŞMEDİ, yalnız üst başlık değişti). Bilinçaltına işleme = kitabın
yolu (tekrar+hayal+ses), gizli telkin DEĞİL.

Kilit kararlar: **K1** savaş dili dışarıya karşı meşru ([[ic-meclis-suretler]]
ile çelişmez: Suret=içeriden/bütünleştir, Fısıltı=dışarıdan/dönüştür) · **K3**
"bil ama odaklanma" çizim sözleşmesi: gölgeler ≤1.5 sn + asla koleksiyon;
Baphomet/ters haç/ters pentagram HİÇ çizilmez · **K4** "Açık Nur": subliminal
kare yok, her iz görünür + Doku'dan kapatılabilir · **K5** kullanıcı-yüzlü
metinde örgüt adı YOK, fısıltı mesajıyla anılır · **K6** 10s günlük zincirine
pop-up eklenmez, tören salondan.

**Modül: js/parts/12e-nur-nisanlari.js** (dosya adı `nn` önekiyle "Nur Nişanı"
kökünden — üst başlık değişse de iç kod adı KORUNDU, churn'süz). İlk turda
`12d-nur-nisanlari.js` idi; başka bir oturum eşzamanlı olarak `12d-kart-uretim.js`
oluşturunca (bkz [[kart-uretim-motoru-huzura-cikis]]) iki modül aynı "12d"
önekini paylaşmış oldu — çakışma **12e**'ye taşınarak giderildi (main.js
import+expose × 2 yer, 10-features-w2.js dinamik import, 03-auth-shell.js
yorum, tests/12d-nur.test.js → tests/12e-nur.test.js hepsi güncellendi).

**Faz 1 (TAM):** `NISANLAR` 10 kayıt (id/ad/fisilti/hakikat/ders/icon-SVG);
pure helper'lar `nnWrite/nnWrittenCount/nnIsWritten/nnWroteToday/nnIsComplete/
nnGetState/nnResetState`; UI `loadNurView/renderNurSalonu/nnOpenNisan/nnSeal/
nnCancelCeremony`. Durum SafeStorage `etw_nur_nisan_v1`. Günde 1 nişan kilidi +
çift-ödül guard. Elmas +8/yazma +40/tamamlama, artık **düzgün etiketli**
(`10g _ELMAS_REASONS` + `wg.elmas.nur-nisan(-tam)` TR/EN dict'e eklendi —
ilk turdaki "default etikete düşer" eksiği giderildi). **Yeni: "Vazgeç"
butonu** dönüşüm fazında (`.ikv-ghost-btn` reuse) — yanlış nişana tıklayan
kullanıcı günlük hakkını kaybetmeden çıkabiliyor (ilk turda YOKTU, kapatma
yolu olmayan bir tören riski olarak tespit edilip düzeltildi).

**Tek ayet — Rad, 13/11:** "Kuşkusuz bir halk kendi durumunu değiştirmedikçe,
Allah onların durumunu değiştirmez." Salon hero panelinde `.nn-ayet` bloğu
(ince altın üst-çizgi + italik serif metin + küçük sure/ayet etiketi),
tüm alfabenin tez cümlesi olarak konumlandı — kitap tezi "Mesele Sensin"in
ayet karşılığı.

**Faz 2 — ambient alt-küme ŞİPLENDİ:** "Günün Nuru" — `#nn-chat-filigree`
(chat-view'da `#ambient-aura`'nın YANINA eklendi, ONUNLA ÇAKIŞMAZ: aura üst
%55'i kaplar/mod renginde, filigran sağ-alt köşede sabit 130px, opaklık
0.05/gündüz-0.09/`tw-night`); en son yazılan nişanın ikonunu gösterir
(`nnSyncAmbient`, tarih `localeCompare` ile sıralı — ilk yazımda `<`/`-1`
komparatörü hatalıydı, düzeltildi). Ayarlar > Doku'ya "Nur izleri" anahtarı
(`nn-ambient-toggle`, `nnSetAmbient`, varsayılan AÇIK). `nnInit()` post-auth
sırasına eklendi (13e fxInit'in hemen ardından); `switchView('chat')` girişinde
senkron. **Faz 2'nin kapı-kazıması (10o `_ornamentSVG` varyantı) kısmı HALA
YAPILMADI** — her feature-gate kapısına dokunacağından blast-radius'u daha
yüksek, bilinçli ertelendi.

**Doğrulama:** 523 test yeşil (30 dosya, +20 yeni: 13 Faz1 + 7 ambient/cancel),
build temiz (205 modül). Preview'da auth-gated shell aşılıp rename + ayet +
tören + "Vazgeç" + elmas + ambient filigran + Doku toggle uçtan uca çalıştırıldı,
konsol hatasız. Sözleşme regresyonu yok (`typeof window.loadMeclisView` vb hâlâ
`function`).

**2026-07-08 cool sprinti — KALAN HER ŞEY ŞİPLENDİ** (dosya artık
`12e-isik-nisanlari.js`, önek `isik*`, anahtarlar `etw_isik_nisan_v1` +
`etw_isik_ambient_v1`):
- **Faz 2 kapı kazıması:** 10o `_ornamentSVG(nisan?)` opsiyonel varyant —
  SON yazılan nişan rozet kalbine kazınır; her `featureEnter`'da tazelenir;
  Doku "Nur izleri" kapalıysa/hiç yazım yoksa varsayılan elmas (K4).
  Test: `tests/10o-fgate-etch.test.js` (4). GOTCHA: overlay DOM'u testte
  sökme — modülün `_built` bayrağı yaşarken featureEnter yeniden kurmaz.
- **Faz 3 koç köprüsü:** 12e `isikExtractTag` (`[NISAN:id]`) +
  `_isikOnCoachFinalized` (06 finalize hook, 10B emsali; etiket silinir,
  chip `.ik-coach-cta` reuse, SEANS BAŞINA 1) + `isikMatchNisan` tema
  eşleştirici (`ISIK_TEMALAR` substring, TR-locale) + `isikGetContext` →
  01 buildContextPrompt user_profile bölümüne (window'dan, TDZ-güvenli).
  Talimat `p('prompt.mode.nisan')` — 16b TR+EN, hardcode YOK
  ([[emre-yonlendirme-hardcode-yasak]] ✓). 09d Örüntü Aynası: `_renderPatternCard`
  örüntüye yankılanan nişanı `.om-isik` çıpası olarak basar (yazılı=altın
  hakikat / yazılmamış=salona davet) → tık isikOpenNisan.
- **Faz 4:** 10D tasarım töreni 5. adımda "Yolunun Nişanı" seçici
  (`card.nisan`, toggle; olumlama re-render'da korunur) → 12c `ikvCardBack({etch})`
  sırt kazıması (`.ikv-back-etch`) · `oikActiveNisan()` TEK KAYNAK →
  02d eşik köprüsünde `.esik-path-nisan` izi. Easter egg bilinçli atlandı.
- Test: `tests/12e-isik-faz3.test.js` (5); dict: 15b'ye 7 anahtar TR+EN.

**Hâlâ ELLE/bekleyen:** push "Günün Nuru" şablonu (send-push deploy) ·
İsra 81 / Kaf 16 ayet teyidi (kanon listesinden) · cihazlar-arası eşitleme
istenirse mig 032 ayrı iş.

**2026-08-07 — KART SAHNESİNDEN ÇEKİLDİ (Emre'nin kararı).** Aşağıdaki
2026-07-19 entegrasyonu SÖKÜLDÜ: 12c'deki on `nisan_*` nesne motifi
(`_nisanIm`), 12d'deki `KW_NISAN_EK` + `KW.nesne` enjeksiyonu, `input.nisan`
dalı, `_kumAktifNisan()` window köprüsü ve `_kumNisanGuide()` LLM bloğu ile
16b+16e'deki `prompt.kum.nisan_guide` anahtarı kaldırıldı. Gerekçe: kartın
sahnesi kartın anlamına ait olmalı, kullanıcının başka bir odada yazdığı
nişana değil. **KORUNDU:** 12e/12e1 salonu · 10o kapı kazıması · 10D "Yolunun
Nişanı" + `ikvCardBack({etch})` — sökülen *dayatma*, kullanıcının *seçimi*
değil. Bu turda 10o'nun ikiz `_isikEtchNisan()` sıralaması da `isikLastWritten`
tek kaynağına bağlandı (12d çıkınca o export yetim kalacaktı). Ayrıntı:
[[yasayan-kart-motoru]].

**2026-07-19 (ARTIK GEÇERLİ DEĞİL — yukarıya bakın):** Nişanlar kart üretiminin özüne girdi — veri `12e1-isik-veri.js`
saf yaprağına taşındı (12e re-export ile sözleşme korundu), on nişan `nisan_*`
nesne motifi oldu, besteci fısıltı temalarını tanıyor, yazılı son nişan
`kumEnsureSpec` köprüsüyle nesnesiz kartlara iz bırakıyor. Ayrıntı:
[[kart-uretim-motoru-huzura-cikis]].

**2026-07-24 — Faz 2 sohbet filigranı SÖKÜLDÜ:** Emre, Wanderer LLM (chat-view)
arka planında "Halka" nişanının (8-ışınlı daire ikonu) bir güneş gibi göründüğünü
fark etti → `#isik-chat-filigree` div'i, `isikSyncAmbient()` fonksiyonu (ve tüm
çağrı noktaları: `isikSetAmbient`, `isikInit`, `isikSeal`) ve ilgili CSS bloğu
tamamen kaldırıldı (`js/parts/12e-isik-nisanlari.js`, `_src.html`, `js/main.js`,
`js/parts/03-auth-shell.js`, `tests/12e-isik.test.js`). **KORUNDU:**
`isikAmbientEnabled`/`isikSetAmbient`/`isik-ambient-toggle` (Ayarlar > Doku
"Işık izleri") — artık YALNIZ 10o kapı kazımasını (`_ornamentSVG`) kontrol
ediyor; `isikLastWritten` de 10o + 12d kart bestecisi için tek kaynak olarak
duruyor. Yani Faz 2'nin kapı-kazıması ve kart-izi alt-parçaları AYNEN yaşıyor,
yalnız sohbet kâğıdındaki ambient filigran gitti. 1129 test yeşil, build 643KB
gzip.

Bkz [[zihniyet-devrimi-ozet]] [[tasarim-prensipleri]] [[kart-salon-dili]]
[[kart-uretim-motoru-huzura-cikis]].
