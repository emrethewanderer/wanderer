# Üç Sesin Nabzı — "ölçülmeyen kimlik iddiası, iddia değildir"

> **KÖKEN BEYANI (2026-09-03).** Bu dosya, özgün planın kendisi DEĞİLDİR.
> Özgün plan 2026-08-30'da lokal makinede yazıldı ve commit edilmedi
> (`PROTOKOL-FABLE.md` §10.1); repoya hiç girmediği için içeriği kayıptır.
> Elinizdeki metin, iki bağımsız kanıt kaynağından **yeniden kurulmuştur**:
> (1) İç Çalışma 08 rev.2 raporunun `07 · Yol Haritası` bölümü — altı fazı
> adıyla, kapalı kümeleriyle ve gerekçeleriyle tarif eder; (2) fazların
> uygulanmış hâli — kod, migration ve testler, hepsi okunabilir durumda.
> `.claude/plans/README.md` bu istisnanın neden yalnız bu plan için
> yapıldığını yazar. §6.10 gereği: **buradaki her satırın kanıtı ya raporda
> ya kodda gösterilir; gösterilemeyen hiçbir karar bu dosyaya yazılmadı.**
> Özgün planın "Onaylanan kararlar" ve "Riskler" bölümleri kurtarılamadı —
> yokluklarını uydurmakla doldurmak, kaybı gizlemek olurdu.

## Bağlam

Wanderer kendini üç sesle sunar: **Öz** (bireysel) · **Bağ** (ilişki) ·
**Eser** (iş). Bu bir özellik değil, ürünün **kimlik iddiasıdır**. 18
Temmuz 2026'dan 30 Ağustos'a kadar o iddia ölçüsüzdü: `00f`'in on bir
kanallı kadranının hiçbirinde `oz`/`bag`/`eser` geçmiyordu.

rev.1 iki reçete yazmıştı ve rev.2 ikisini de değiştirdi:

1. rev.1'in B boşluğu ("başlatıcılar sabit") **düştü** — `10y2-baslaticilar.js`
   arada doğdu, `10y:273` bugün `window.bslOku?.()` çağırıyor.
2. rev.1'in C reçetesi ("LLM-hakem rubriği koşulsun") **yanlışlandı**.
   Gerekçe `scripts/ses-eval.mjs`'in açılışında yazılıdır ve §6.10'un
   kendisidir: modelin kendi güven sayısı ne beyandır ne ölçüm; bir modelin
   başka bir modelin sesini "8/10" diye puanlaması da aynı şeydir, yalnız
   bir katman uzakta. Ayrışma **metin üzerinde gösterilebilir bir olguyla**
   ölçülür.

### Merkez kavram

Kadran üç ayrı soru sorar ve **bunları asla toplamaz**: kullanıcı hangi
ekseni eliyle seçti (*niyet*), hangi eksene çarpıp geri döndü (*karşılanmamış
talep*), hangi eksende gerçekten konuşuldu (*yaşanan*). Toplamak, `10w:111`in
Free katmanını Öz'e kilitlemesi yüzünden "herkes Öz'ü seviyor" diye okunur —
oysa ölçülen şey mahkûmiyettir.

## Fazlar

Altısı da 🅢: yargı gerektiren her karar — kapalı kümeler, eşikler, panel adı,
teşhis cümleleri — planda verilmiştir. Uygulayan taraf karar vermez, icra eder.

### FAZ 1 — `wtLogModel` kanalı · 🅢 · ~0.5 oturum
Kadranın on ikinci tüketicisi; yeni motor değil, mevcut kalıba yeni tür.
Kapalı küme: `sec` · `kilit` · `dus`. Gizlilik sözleşmesi kimlik kanalıyla
birebir aynı — yalnız üç sabit eksen kimliği girer, küme dışı değer sessizce
düşer.
**Değişen:** `js/parts/00f-kullanim-nabzi.js` (`wtLogModel`, `_FM_ID` kapalı kümesi)

### FAZ 2 — Niyet, kilit ve sessiz kayıp · 🅢 · ~0.5 oturum
`fmSelectModel`in iki dalı ayrı ayrı yazar: kilitli eksene dokunuş `kilit`,
gerçekleşen geçiş `sec`. **Düşüş** (`dus`) `fmInit`te oturumda bir kez yazılır
— okuma fonksiyonuna takılsaydı her render bir satır doğururdu. Turun ekseni
ayrı olay değildir: mevcut gecikme satırının `meta.fm` alanına biner.
**Değişen:** `js/parts/10w-w2-odak-modelleri.js:280` (`dus`), `:400` (`kilit`), `:409` (`sec`)

### FAZ 3 — `migration 050` · model_pulse · 🅢 · ~0.5 oturum
Şema DEĞİŞMEZ — nabız mevcut `usage_events` satırlarıdır. Dosyanın tek işi
`admin_usage_report`'a `model_pulse` bloğunu eklemek. Gövde 049'un üstüne
biner ve 049'un TÜM blokları aynen taşınır; bir blok düşerse Gözlemevi'nin o
kartı kaybolur. **Oran burada hesaplanmaz** — ham sayı döner, oranı panel
kurar, payda sıfırsa hiç göstermez.
**Yeni:** `migrations/050_gozlemevi_model_nabzi.sql` · ELLE koşulur

### FAZ 4 — "Üç Sesin Nabzı" paneli · 🅢 · ~1 oturum
Üç köşe: **Seçti** (ekseni eliyle değiştiren) · **Çarptı** (kapalı eksene
dokunan) · **Konuştu** (ekseni bilinen başarılı tur). Adı bilerek "Model
Nabzı" DEĞİL: kadranda zaten bir "Mod Nabzı" var ve bu repoda Modeller (elle)
ile Modlar (otomatik) ayrı eksenlerdir — karıştırılmaları bilinen tuzaktır.
İki kol da boşsa panel hiç çizilmez.
**Değişen:** `js/parts/13q-gozlemevi.js` (`_sesNabzi`, ~784–880)

### FAZ 5 — Eksen denetçisi · 🅢 · ~1 oturum
Ölçüm bir tabana yazılır ve regresyon kapısına bağlanır. Ölçü: üç
`system_prompt` arasındaki sözcük örtüşmesi (Jaccard) ve her eksenin yalnız
kendisinde geçen sözcük oranı (tekillik). Durak sözcükler ve 4 harften kısa
sözcükler düşer — ölçülen eksen sözlüğüdür, Türkçenin ortak iskeleti değil.
**Kapı yalnız `system_prompt` üzerindedir**; `knowledge` kitap içeriğidir ve
örtüşmesi meşrudur (Eser iki kitabın iş ekseninden damıtıldı, Öz'ün
malzemesinden beslenir) — raporda görünür, kapıda değil. Kör nokta defteri
betiğin başlığında: kapı kelime dağılımını ölçer, düşünceyi değil.
**Yeni:** `scripts/eksen-denetci.mjs` · `scripts/eksen-taban.json` · `tests/eksen-kapisi.test.js`

### FAZ 6 — Şema Sondası: tablo VAR ≠ içerik DOLU · 🅢 · ~0.5 oturum
İki ayrı satır. Tablonun varlığı hata kodundan okunur (`42P01`/`42703`) —
RLS yüzünden boş dönmek "yok" demek değildir. Doluluk ayrı ölçülür:
`system_prompt` uzunluğu ≥ **200 karakter**. Eşiğin gerekçesi ölçümdür —
bugünkü en kısa `system_prompt` 2114 karakterdir; 200 sınırı "kazara kalmış
bir cümle" ile "gerçek eksen davranışı"nı ayırır. Tablo dolu değilse arayüz
"Wanderer Öz" der ve altında eksen davranışı yoktur.
**Değişen:** `js/parts/13q-gozlemevi.js` (`wanderer_models` sondası, `_sondaIcerik`)

## State / Veri

- **Değişmeyen:** `usage_events` şeması — yeni `kind` eklendi, yeni kolon eklenmedi.
- **Yeni kind:** `kind='model'` (`sec`/`kilit`/`dus`) + `kind='latency'` satırlarının `meta.fm` alanı.
- **Tuzak:** `wtLogModel`in `!_inited` guard'ı — `fmInit`teki `dus` çağrısı
  senkron yazılsaydı guard'a takılırdı (`10w:273`in kendi notu).

## Riskler / Dikkat

1. `model_pulse` bloğu 049'un gövdesine biner — 049'un blokları eksiksiz taşınmazsa başka kartlar kaybolur.
2. Seçim ile kilidin toplanması ölçümü tersine çevirir (yukarıda, Merkez kavram).
3. Kapı repodaki seed'i ölçer, Model Stüdyosu'ndan yapılan canlı düzenlemeyi değil.

## Doğrulama

1. `node scripts/eksen-denetci.mjs` → exit 0, altı ölçüm taban içinde.
2. `npx vitest run tests/eksen-kapisi.test.js` → kapı hem ihlali yakalar hem yanlış pozitif üretmez.
3. `node scripts/dogrula.mjs --eval "typeof window.wtLogModel"` → `"function"`.
4. Panel: `model_pulse` yokken kart HİÇ çizilmez (kanıtsız sıfır basmaz).

## Kritik Dosyalar

- **YENİ:** `scripts/eksen-denetci.mjs` · `scripts/eksen-taban.json` · `tests/eksen-kapisi.test.js` · `migrations/050_gozlemevi_model_nabzi.sql`
- **Yerinde evrim:** `js/parts/00f-kullanim-nabzi.js` · `js/parts/10w-w2-odak-modelleri.js` · `js/parts/13q-gozlemevi.js`
- **Yeniden kullanılan:** `00f` nabız kalıbı (yeni motor değil, yeni tür) · Mod Nabzı'nın panel iskeleti · `ses-eval.mjs`'in hakem-reddi gerekçesi

## Hafıza bağları

`[[tanima-motoru]]` · `[[boot-nabzi]]`

## Durum

Altı fazın altısı da **uygulandı** (2026-08-30). ELLE bekleyen tek iş:
`migrations/050` Supabase'e koşulmadan panel çizilmez — `migrations/README.md`
bu borcu diğerleriyle birlikte listeler.
