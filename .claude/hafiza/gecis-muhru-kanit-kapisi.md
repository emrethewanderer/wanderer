---
name: gecis-muhru-kanit-kapisi
description: "KARAR 2026-08-10 TAM: Geçiş Kartım'ın üç vuruşu (GÖRDÜN/YÜRÜDÜN/OLDUM) SÖKÜLDÜ — mühür tıklamayla değil sınamayla düşer; köprüde vuruşların yerini tek ışık aldı; olusSinamaAc kart-tipinden bağımsızlaştı"
metadata: 
  node_type: memory
  type: project
  originSessionId: f1a13829-94e6-4240-8452-eb0757259e7a
  modified: 2026-08-10T20:41:50.848Z
---

**Emre'nin gözlemi (2026-08-10):** *"Üç unsura tıklayınca kişi mühürleniyor —
bu sistem yanlış."* Doğruydu ve teşhis tektir: üç tık **kanıt sormayan bir
kimlik beyanıydı**. Aynı hata Oluş Sınaması'nda 2026-08-03'te zaten
onarılmıştı ([[olus-sinamasi-kanit-kapisi]]); geçiş kartı o onarımın dışında
kalmıştı. Plan: `.claude/plans/gecis-ekrani-toplanma.md` (FAZ 3–6).

## Ne söküldü, ne kaldı

**Söküldü (10A):** `gkStrike` · `gkSeal` · `gkStrikeDefs` · `gkStrikeVerb` ·
`STRIKES` · `gkRehberDurum/Ok` · `REHBER_KEY` · `_atlStrikeFlash` ·
`_strikeCount` · `_completionPct` · `gkHeroLabel`. **(10q2):** vuruş
düğmeleri, `_kopruAltHTML` (verdict + mikro-rehber), iki bağlama.
17 yetim i18n anahtarı TR **ve** EN'den birlikte.

**Kaldı:** `_completionCeremony` ve mezuniyet zinciri — ölmedi, yalnız
**tetikleyicisi değişti**. Zincir `_sealTransition(k)` olarak çıkarıldı
(tören → `state:'completed'` → `imEvent('gecis_karti')` → `recordActivityDay`
→ `_graduateSentez` → tazeleme) ve sınamanın `onGecti`'sine bağlandı.

**`k.strikes` SİLİNMEDİ** (§4.3 madde 4): okunmaz ama diskte ve
`gecis_kartlarim` tablosunda durur, gidiş-dönüşte korunur. Okumayı bırakmak
veri kaybı değildir, silmek olurdu.

## Sınama motoru kart-tipinden bağımsızlaştı (asıl mimari kazanç)

`olusSinamaAc(cardId, opts)` — **`opts` boşsa davranış birebir eskisi**:

| opts | Ne | Kim kullanıyor |
|---|---|---|
| `card` | kartı dışarıdan ver (katalogda olmayan kutup) | 10A `gkPoleAsCard(id,'lapis')` |
| `goldPole` | sınama sahnesinin "ŞU AN OLDUĞUN" kutbu | 10A kartın KENDİ altını |
| `defter` | `{oku(), yaz(kayit)}` — sınav kaydının **evi** | 10A `k.sinav` |
| `onGecti` | mühür yolunu çağıran devralır | 10A `_sealTransition` |

Çekirdek (dört soru, `olusSinamaCoz`, `kanit_ref`→`kokenAlintiCoz`, kural
`kanıtlı boyut >= 3`) **hiç değişmedi** — kartın nereden geldiğini zaten
sormuyordu. `olusSinamaBeklemeSinav(sinav)` saf yardımcı olarak ayrıldı:
defterin nerede durduğunu bilmez, 7 günlük dinlenme kuralı ikisinde de aynı.

**Why:** ikinci bir sınama motoru yazmak, aynı hükmü iki yerde ayrı ayrı
yanlış yapmanın yoludur (§1.3). Bir sonraki kart tipi de bu sözleşmeye bağlanır.

## Kararlar ve gerekçeleri

- **`goldPole` planda yoktu ama şarttı.** Sahne "ŞU AN OLDUĞUN"u
  `yolGoldPole()`'dan (kullanıcının genel portresi) çiziyordu; geçiş kartında
  o kutup kartın KENDİ altınıdır ("Kaçan" → "Duran").
- **Kapı yalnız LAPİS kutup öndeyken.** "Artık o kişiyim" bir iddiadır ve
  iddia hedefe bakarak edilir; altın kutba bakarken aynı cümle "artık
  Kaçan'ım" olurdu. Bu yüzden **köprü ışığı da lapis açar**.
- **`kk.esik` defterine yazılmaz.** Sınav kartın kendi kaydına düşer
  (`k.sinav = {at, gecti, eksik, alintilar}`). Ontolojiler ayrı: geçiş kartı
  katalog kartı değildir. *(Kolon gerekti — aşağıdaki ELLE bölümüne bak;
  planın "şema göçü yok" varsayımı dikiş turunda yanlışlandı.)*
- **Masa kapanıp sınama açılır** (340 ms). Masa arkada kalsaydı sınama
  geçince tamamlanma töreni aynı yığına açılır, kapanış sırası karışırdı.
- **İki tören üst üste bindirilmedi.** 10q4'ün basılı-tut mührü (`_perde2`)
  geçiş kartında ÇALIŞMAZ; kullanıcının eli okuma sahnesindeki "Mührü bas"ta
  zaten düşüyor, ardından 10A'nın kendi yanma töreni oynuyor.
- **`davranis_kaniti` terfi etti.** Kimlik Motoru'nun tier-1 davranış kanıtının
  TEK kaynağı YÜRÜDÜN vuruşuydu — bir tık. Artık sınamanın **kanıtlı**
  davranış boyutundan düşüyor: `kokenAlintiCoz`'dan geçmiş kullanıcı cümlesi.
  `yasandi:false` iken düşmediği ayrı testle mühürlendi.
- **Vuruş sayısı LLM bağlamından çıktı** (`gkGetContext`) — kanıtsız değer
  modele hiç girmez (§6.10).

## Köprü: üç düğme → tek ışık

`.kkb-isik` (10q2) yanar, nefes alır (3.4 s), dokununca masayı açar. Fener
12c'nin `ikvLantern`'ından — ikinci ışık motoru yazılmadı.

- **Halka Bugün'den ÇEKİLDİ.** Sınama geçilir geçilmez kart `completed` olur
  ve köprü zaten kapanır (`_kopruKartId` mezunu eler) → oradaki halka
  **hiçbir zaman yanamazdı**. Bilgisiz süs kaldırıldı; tek yeri masanın
  ortası, `window.gkRingSVG` expose'u da düştü.
- **Halka artık tek yay taşır** (`gkRingSVG(sinav)`): geçilmiş sınama halkayı
  TAM kapatır, yüzde yoktur — mühür bütündür. **Geçilemeyen sınama halkada
  GÖRÜNMEZ ve bu karardır:** dinlenme başarısızlık değil beklemedir; halkayı
  "denedi, olmadı" ile damgalamak geçmemiş bir sınamayı kalıcı lekeye
  çevirirdi. O hâli masa kendi diliyle söyler.
- **Işık kartların dikey ORTASINDA durur.** Kolon `align-self:stretch`,
  ışık `margin-top:auto` + `--kkb-kuyruk` telafisi (alt blokta oklar ve
  "hepsini gör" var; düz ortalamak ışığı kartın altına kaydırırdı). 375px'te
  TR ve EN'de kart merkezine fark **0px**. Dar ekranda (≤340px) köprü yatay
  şerittir → telafi **sıfırlanır**, yoksa ışık şeridin dışına fırlar.

## Ton (kalibre edilmiş)

- Işık: sessiz, kicker `AÇIK YOL`, aria **"Bu yol açık — masayı aç."**
- Kapı: **"ARTIK O KİŞİYİM"** — birinci tekil, kullanıcının ağzından;
  "Mühürle" değil, çünkü mührü basan uygulama değil.
- Dinlenme: **"Henüz değil — bu yol daha yürünüyor. Bir hafta sonra yeniden
  gel."** Suçlama yok, gün SAYISI yok (sayaç değil, hâl); "gel" çünkü
  uygulama bir yer'dir.
- 10q4'ün sınama sahnesinin dili geçiş kartına **olduğu gibi oturdu**
  ("ŞU AN OLDUĞUN" / "OLDUĞUNU SÖYLEDİĞİN" / *"Artık o kişiyim."*) —
  masadaki kapı cümlesiyle birebir aynı, değiştirilmedi.

## Gotcha (bu turda yakalandı)

**`_sinamaOpen` modül-yerel bayrağı overlay DOM'dan silinince sıfırlanmaz.**
Açık bırakılan bir sınama sonraki testin `olusSinamaAc` çağrısını sessizce
`false`'a düşürür — yani test **yanlış nedenle** geçer. Testlerde her
açılıştan sonra "Vazgeç" (`[data-act="iptal"]`) ile gerçekten kapatılır.

## Doğrulama

build ✅ · **2084 test yeşil** (17 yeni) · preview 375 + 320px, TR + EN.
Canlı tam zincir: ışık → masa (lapis öne gelir) → kapı → sınama (iki kutup
doğru, dört boyut şeridi, boş cevapla ilerlenmez) → tören → mezuniyet
("Duran" altın desteye geçti, köprü kapandı). Konsol temiz.
Harness: `.claude/harness/bugun-kopru.html` (yeni), `gecis-ekrani.html`.

## ELLE bekleyen (Emre)

`migrations/000_wanderer_schema.sql` §4.10'a **`sinav JSONB`** kolonu eklendi
(`ADD COLUMN IF NOT EXISTS`, idempotent). Supabase Dashboard → SQL Editor →
dosyanın tamamını çalıştır. **Uygulanana kadar sistem çalışır:** sınav KV'de
yaşar, `_gkFlushDirty` 42703'te bir kez düşüp satırı sınavsız yazar, hidrasyon
KV'deki kaydı korur — yalnız 7 günlük dinlenme cihazlar arası taşınmaz.

**Dikiş turunda yakalanan kırık (kayda değer ders):** plan "`gkSave` zaten
tüm kartı yazıyor, şema göçü gerekmez" diyordu — yanlış. `_rowFromKart`
**sabit bir alan listesi** kurar; yeni alan oraya eklenmezse yalnız KV'de
kalır ve tablo-birincil hidrasyon onu her açılışta siler. **Yeni bir kart
alanı eklerken üç yere birden bak:** `_rowFromKart` (yazma), `_kartFromRow`
(okuma), migration (kolon).

Bkz. [[olus-sinamasi-kanit-kapisi]] · [[tek-deste-iki-kutup]] ·
[[gecis-ekrani-masa-destesi]] · [[an-karti]] · [[kesin-alinti-mimarisi]] ·
[[gerceklik-mimarisi]] · [[olus-muhru-2-muhru-sen-basarsin]] ·
[[kisilerim-kart-motoru]] · [[uc-ana-renk-lapis]]
