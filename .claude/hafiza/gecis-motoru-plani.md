---
name: gecis-motoru-plani
description: "2026-07-19/20 TÜM 7 FAZ (F0-F6) TAMAMLANDI: Geçiş Motoru — Wanderer'ı 'cevap veren LLM'den 'dönüşümü yürüten yol arkadaşına' taşıyan plan; repo .claude/plans/gecis-motoru.md; commit'ler 04f8e33/cfea8df/25d1db1/74b8134/64f36a3; 1063+ test yeşil; ELLE bekleyen: mig 037+038 + send-push deploy + embed-kitaplar.mjs çalıştırma"
metadata: 
  node_type: memory
  type: project
  originSessionId: e58ac100-072a-42d7-941a-3154d6f32ce8
  modified: 2026-07-20T10:39:33.072Z
---

**Geçiş Motoru planı (2026-07-19, ONAYLANDI — yolculuklar tamamen Studio,
tanıtım kapısı yok).** Emre'nin "Wanderer kişisel dönüşüm LLM'idir;
Claude/Gemini/DeepSeek sınıfında — muazzam bir plan istiyorum" isteğine
yanıt. Tam metin: `.claude/plans/gecis-motoru.md`.

Çekirdek teşhis: organlar tek tek VAR (10i hayal seansı, 10k kendinle
konuşmak, 10l değerlendirme, 13b kağıt, 10f yol halkası) ama onları
haftalarca süren TEK dönüşüm yayına dizen katman YOK. Plan = orkestra
katmanı; merkez kavram kitabın **GEÇİŞ protokolü** (sabah/gece okuma +
ses kaydı + AI md.6 mandatı, [[zihniyet-devrimi-ozet]]).

7 faz: **F0** zemin (git init + send-push dil + dokunuş bütçesi) →
**F2** Söz Defteri (bronz omurga; [TAKIP]→ledger→bağlam→push; en yüksek
kaldıraç, Wanderer ücretsiz yüzünde kanca) → **F1** Geçiş Yolu (21 günlük
"Yeni Bir Kişiye Geçiş" yolculuğu, Manifesto VIII 4 perdesi; 13s, gy*) →
**F4** İlk Işık (#152 sabah sorusu, günde TEK dokunuş) → **F3** Dönüşüm
Aynası (90 gün belgeseli; 13t) → **F5** Kitap Bilgesi (kitap RAG,
pgvector; llm-chat vendor kapısıyla AYNI turda) → **F6** Sesli Geçiş
Alanı (kullanıcının KENDİ sesi; TTS kararından bağımsız) → F7 ufuk.

**FAZ 0 TAMAMLANDI (2026-07-19):** `git init` + ilk commit (bf29a06, 399
dosya — Atlas tema 1 kapandı); `supabase/.temp/` .gitignore'a eklendi
(proje ref sızıntısı önlendi). send-push dil kilidi çözüldü: mig 037
(`user_engagement.lang`) + client (`10x` snapshot'a `lang` alanı) +
edge (`langInstruction()`, 12 dil). Günde-tek-dokunuş kuyruğu — YENİ KOD
YAZILMADI: `send-push`'ın `pickTrigger()` zinciri zaten tek-tetikleyici
öncelik merdiveni, keşifle doğrulandı.

**FAZ 2 TAMAMLANDI (2026-07-19) — planın en büyük keşfi:** Yeni bir Söz
Defteri modülü (`13u`) YAZILMADI çünkü `00-config-tracking.js`'de zaten
TAM bir taahhüt döngüsü vardı (`captureCommitments` regex-yakalama +
`getPendingCommitmentContext` LLM bağlamı + `13-extras.js`'te haftalık
"Hesap Günü" yüzleşme modalı). Eksik olan tek şey SONUÇ TAKİBİYDİ
(tutuldu/tutulmadı) — eklendi: `kept` alanı, `resolveCommitment(idx,
kept)`, Hesap Günü UI'ı artık her taahhüt için ayrı TUTTUM/TUTAMADIM
(eskiden tek "Hepsini Tamamladım"), tutulanlar `awardElmas(4)` ile
mühürleniyor, context artık çoklu bekleyen + son 2 sonuçlanmış sözü
gösteriyor.

**2 KRİTİK BUG bulundu ve düzeltildi (test yazarken ortaya çıktı):**
1. `captureCommitments` içinde `dp('detect.commitment')` `{pattern,
   extract}` OBJESİ döndürüyordu (diğer tüm `detect.*` anahtarları düz
   RegExp) ama kod `text.match(pattern)` ile objeyi doğrudan regex
   sanıyordu → JS bunu `"[object Object]"` string'ine çevirip anlamsız
   ama HER ZAMAN eşleşen bir regex üretiyordu (`[object O]` karakter
   sınıfı yaygın harflerle eşleşir). Sonuç: taahhüt yakalama sistemi
   muhtemelen PRODUCTION'DA HİÇ DOĞRU ÇALIŞMAMIŞTI — her mesajda 4 sahte
   "taahhüt" ekliyordu. Düzeltme: `entry.pattern` + `entry.extract(m)`.
2. `showHesapGunu` (13-extras.js) hiçbir zaman `window`'a bağlanmamıştı
   — `main.js`'in named-import + `Object.assign(window,{...})` listesinde
   YOKTU. `03-auth-shell.js:499`'daki `window.showHesapGunu?.()` çağrısı
   sessizce no-op'tu. Haftalık Hesap Günü özelliği muhtemelen HİÇ
   ÇALIŞMAMIŞTI. Düzeltme: main.js'e eklendi.

**Doğrulama:** `./build.sh` yeşil (631KB/650KB gzip) · `npx vitest run`
971/971 yeşil (9 yeni test dahil, i18n parity dahil) · preview'da
`window.showHesapGunu`/`captureCommitments` canlı doğrulandı, konsol
temiz. Sınır: Hesap Günü modalının TAM görsel render'ı preview'da
doğrulanamadı — `S`/`SecureStorage` module-private, tarayıcı konsolundan
enjekte edilemiyor; gerçek doğrulama `tests/00-config-tracking.test.js`
JSDOM ortamında (mock değil, gerçek SecureStorage/CryptoLite) yapıldı.

**Değişen dosyalar:** `migrations/037_push_dil_kilidi.sql` (yeni, ELLE) ·
`supabase/functions/send-push/index.ts` · `js/parts/10x-w2-bildirimler.js` ·
`js/parts/00-config-tracking.js` · `js/parts/13-extras.js` · `js/main.js` ·
`js/parts/{15b,15e,16b,16e}-i18n-*.js` · `tests/00-config-tracking.test.js` ·
`tests/10x-bildirim.test.js`. **Commit atılmadı** — Emre'den özel istek
gelmedi (yalnız git init+ilk commit protokolce önceden onaylıydı).

**Senin yapman gereken (ELLE):** Supabase SQL Editor'da
`migrations/037_push_dil_kilidi.sql` çalıştır → `send-push` YENİDEN
DEPLOY et. Yapılana kadar sistem eskisi gibi TR push gönderir (kırılma
yok, yalnız iyileşme bekliyor).

**FAZ 1 TAMAMLANDI (2026-07-19) — planın en büyük mimari keşfi:**
`10D-olmak-istedigin.js` (Olmak İstediğin Kişi) ZATEN kitabın "Yeni Bir
Kişiye Geçiş Yapısı"nın TEK OTURUMLUK uygulamasıydı — `oikOpenDesign()`
4 adımlı ko-tasarım sihirbazı, `oikOpenReading()` sabah/gece OKUMA
RİTÜELİ (ses kaydı + streak + mühürleme). Planın F1 VE F6'sının (Sesli
Geçiş Alanı) büyük kısmı zaten vardı — yeni tasarım/okuma/ses mekaniği
yazmak paralel-sistem hatası olurdu.

Gerçek boşluk: hiçbir şey kullanıcıya "bugün hangi organa gitmelisin"
demiyordu. `js/parts/13s-gecis-yolu.js` (`gy*`) bu yüzden bir ORGAN
DEĞİL, bir PUSULA — 21 gün, kitabın 4 perdesi, her gün mevcut bir organı
işaret eder (Perde 1 HAYAL gün 1-5 → `oikOpenReading`/`hayalAcSeans`
dönüşümlü · Perde 2 İNANÇ gün 6-10 → `skOpen` · Perde 3 HİS/DAVRANIŞ gün
11-15 → `oikOpenReading`/`hayalAcSeans` · Perde 4 SEÇİM gün 16-21 →
`yolOpen`). State `etw_gecis_v1_<uid>`, gün `localISODate` farkından
hesaplanır (sayaç değil, tarihten türetilir). Studio odasına giriş
kartı eklendi (`_src.html` studio-yolculuk section, mevcut `.ws-st-room`
kalıbı — YENİ CSS AÇILMADI). 16 yeni test (`tests/13s-gecis-yolu.test.js`).

**Yapılmayan (dürüst sınır):** yolculuk bitişi (gün 21) 12d kart üretimi
+ 13l kimlik devri törenine bağlanmadı — bu ayrı bir tören tasarımı
gerektiriyor, kapsamı büyütmemek için bilinçli olarak bırakıldı.

**Doğrulama (F0+F1+F2 birleşik):** `./build.sh` yeşil (632KB/650KB gzip)
· `npx vitest run` 987/987 yeşil (51 dosya, i18n parity dahil) ·
preview'da `window.gy*`/`showHesapGunu`/`captureCommitments` canlı
doğrulandı, konsol temiz, auth-guard'lar doğrulandı.

**Commit atıldı (2026-07-19):** `04f8e33` — FAZ 0+1+2 (git zemini + push
dil + Söz Defteri sonuç takibi + Geçiş Yolu pusulası), Emre'nin açık
onayıyla. FAZ 4 değişikliği (aşağıda) henüz stage'de, sonraki commit'e.

**FAZ 4 TAMAMLANDI (2026-07-19) — küçük, düşük riskli:** `send-push`'ın
`morning` tetikleyicisi zaten vardı (`pickTrigger()`), haftalık örüntü
context'i de zaten LLM'e enjekte ediliyordu (`ctx.weekly_pattern`).
Gerçek eksik: sabah metni generic'ti ("bugün kim olmak istiyorsun").
`TRIGGER_INTENT.morning` + `fallbackCopy` artık kitabın #152 sorusuna
("Bu gece uyumadan önce, iyi ki yapmışım diyeceğin ne olabilir?") göre
kişiselleştiriliyor. Yeni tetikleyici/modül YOK — K4 (günde tek dokunuş)
korundu. **ELLE:** bu dosya `send-push` fonksiyonunun parçası, migration
gerekmez, yalnız yeniden deploy gerekir (mig 037'yle aynı turda değil,
FAZ 0'daki dil değişikliğiyle birlikte tek deploy yeterli).

**FAZ 3 (Dönüşüm Aynası) için ön keşif — veri kaynağı ZATEN VAR:**
`02c-self-card.js`'de Benlik Kartı her yeniden-sentezde `c.history`'ye
`{v, at, baslik, portrait, cards}` kaydı ekliyor (`HISTORY_MAX` ile
sınırlı). "v1 ↔ bugünkü kart yan yana" için yeni bir toplama mekanizması
KURULMASINA gerek yok — bu geçmiş zaten orada duruyor. 10D'nin de kendi
`version`/`parent_id` zinciri var (aynı desen). F3'e başlarken önce bu
iki geçmişi okuyup birleştiren bir GÖRÜNTÜLEME katmanı tasarlanmalı,
yeni bir veri modeli değil.

**FAZ 3 TAMAMLANDI (2026-07-19):** `js/parts/13t-donusum-aynasi.js`
(`gb*`) — 90 günlük Geçiş Belgeseli. Ön keşif doğru çıktı: YENİ veri
toplama YOK — `02c`'nin `S._benlikKarti.history[0]` (ilk versiyon) ↔
güncel kart, `13l`'nin `imVirtueNow()` (güncel erdem vektörü — GEÇMİŞ bir
ana ait değil, fonksiyon parametre almıyor, bu yüzden "zaman çizgisi"
yerine "o zaman ↔ şimdi" iki-nokta karşılaştırmasına daraltıldı,
dürüstçe not edildi), `09d`'nin `omGetTopPatterns()` (dizi DEĞİL, hazır
TR metin satırları — kodda bu yanlış varsayımı düzelttim) birleştirilip
`document.css`'in doc-* primitifleriyle (zaten global link'li, YENİ CSS
YOK) render ediliyor. Otomatik AÇILMAZ — Studio'da "DÖNÜŞÜM AYNASI"
odası bekler (K4: dokunuş enflasyonu yaratma).

**1 crash bug'ı preview'da yakalandı ve düzeltildi (unit testler
kaçırmıştı):** `gbOpen()`, `gbInit()`'in (asenkron post-auth zinciri)
zaten çalıştığını varsayıyordu; kullanıcı Studio odasına init
tamamlanmadan tıklarsa `S._gecisAyna` undefined olup `TypeError`
fırlatıyordu. Testlerimin hepsi `beforeEach`'te `gbInit()` çağırdığı
için bu senaryoyu KAÇIRMIŞTI — yalnız canlı-DOM preview testinde
(auth'suz, init hiç çalışmamışken `gbOpen()` çağırınca) ortaya çıktı.
Ders: init-sırası bug'ları unit testte gizlenebilir, preview kapısı
bunun için var. Düzeltme + yeni test eklendi (16 test, `tests/13t-donusum-aynasi.test.js`).

**Doğrulama (F3):** `./build.sh` yeşil (633KB/650KB gzip) · `npx vitest
run` 1002+/1002+ yeşil · preview'da `window.gb*` canlı doğrulandı,
konsol temiz, crash-guard doğrulandı.

**FAZ 6 TAMAMLANDI (2026-07-20) — doğrulandığı gibi küçük çıktı:** 10D
kitabın ses emrini (sabah/gece okuma ritüeli, ses kaydı, KANONİK
OLUMLAMA #1 birebir metniyle zaten kodda, streak) tam uyguluyordu.
Gerçek tek eksik: `idbDeleteRecording` (00b-indexeddb.js) hiçbir UI'dan
çağrılmıyordu. `oikDeleteRecording()` eklendi + okuma portalına "KAYDI
SİL" butonu. 5 yeni test (`vi.mock('00b-indexeddb.js')` deseniyle —
JSDOM'da gerçek IndexedDB yok). Commit `25d1db1`.

**✅ PARALEL OTURUM UYARISI — ÇÖZÜLDÜ (2026-07-20):** Sprint sırasında
repo'da başka bir oturumun (Emre'nin eş zamanlı çalıştırdığı ayrı bir
Claude Code session'ı) "Hazine Destesi" özelliğini commit'lemeden
bıraktığı görülmüştü. İlk tepki doğruydu: DOKUNULMADI, FAZ 3/6
commit'lerinde (`cfea8df`, `25d1db1`) sadece kendi dosyalar stage
edildi. Emre'ye durum raporlandığında yanıtı netti: **"O değişiklikleri
bilinçli yaptım. Onları commit etmedim, bir sorun olmazsa onlara da
commit et ve devam et."** Son kontrol (build+test+secret taraması)
sonrası `74b8134` ile commit edildi — bkz. [[hazine-destesi-kart-paketleri]].
**Ders:** commit edilmemiş, tanınmayan değişiklik görünce DOKUNMA +
RAPORLA doğru refleksti; sahiplenme/onay netleşince (Emre'nin açık
talimatı) `git add -A` ile devam etmek de doğruydu — körü körüne
silmek/görmezden gelmek KADAR körü körüne "zaten oradaydı, ekleyeyim"
demek de yanlış olurdu; ikisi arasındaki fark Emre'nin açık onayıydı.

**FAZ 5 TAMAMLANDI (2026-07-20) — planın son büyük keşfi, Emre'nin
llm-chat kaynağını paylaşmasıyla netleşti:** Varsayım YANLIŞTI — "llm-chat
vendor kapısı + embed-canon" gerekmedi. Gerçek durum: llm-chat zaten TAM
bir RAG'a sahip (`runRAG()`: LLMAPI embeddings + `match_knowledge` RPC +
`X-Wanderer-Sources` header ile kaynakça); client'ın `buildSmartRagQuery()`
(01-prompts-modes.js) de zaten sohbette aktif olarak tetikleniyor
(`06-summary-chat.js:1274` `enableRAG:_rag.shouldRAG`). **KOD TARAFINDA
YAPACAK HİÇBİR ŞEY YOKTU** — tek gerçek boşluk VERİYDİ: `knowledge_base`/
`knowledge_chunks` (production'da gerçekten var, mig 034 yorumu kanıtlıyor)
tablosuna iki kitabın metni hiç embed edilmemişti.

`scripts/embed-kitaplar.mjs` yazıldı — PDF okur (pdf-parse), 07-settings-
knowledge.js'in `chunkText`/`saveKnowledge` ile AYNI şemayı (book/section
gibi TAHMİNİ kolon eklenmedi) kullanarak embed+insert eder. **ELLE**
(gerçek API anahtarları gerektirir, burada test edilemedi — sadece
`node --check` ile syntax doğrulandı): `npm install pdf-parse` +
`SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY/LLM_API_KEY` ortam değişkenleriyle
çalıştırılır (script içi kullanım talimatı var).

**Ders (üçüncü kez tekrarlanan desen bu sprintte):** Söz Defteri, Geçiş
Yolu'nun 10D omurgası, Sesli Alan'ın 10D okuma ritüeli, ve şimdi RAG —
DÖRDÜ de "yeni yaz" varsayımıyla başlayıp "zaten var, bağla/veriyle
doldur" ile bitti. Bu repo'da "mevcut olanı ara" ilkesi teorik değil,
sprint boyu defalarca doğrulanan bir gerçek.

**PARALEL OTURUM (2026-07-20) — kapandı:** Hazine Destesi (12f, ayrı bir
oturumun işi) `74b8134` ile commit edildi, Emre'nin açık onayıyla
("bilinçli yaptım, commit et"). Detay: [[hazine-destesi-kart-paketleri]].

**TÜM 7 FAZ TAMAMLANDI.** Commit'ler: `04f8e33` (F0+F1+F2) ·
`cfea8df` (F3+F4) · `25d1db1` (F6) · `74b8134` (Hazine, paralel) ·
`64f36a3` (F5). F7 (Yol Arkadaşları) planda bilinçli olarak "ufuk" —
yapılmadı, ayrı bir plan ister.

**Senin yapman gereken (ELLE, birikmiş — hiçbiri deploy edilmedi):**
1. `migrations/037_push_dil_kilidi.sql` + `038_hazine_set_bonus.sql`
   Supabase SQL Editor'da çalıştır.
2. `send-push` fonksiyonunu yeniden deploy et (dil kilidi + #152 sorusu).
3. `npm install pdf-parse` + `scripts/embed-kitaplar.mjs`'i iki kitabın
   PDF'leriyle çalıştır (kendi ortam değişkenlerinle).

**Why:** Sprint kapandı — bu dosya artık "devam et" değil "yeni bir işe
başlarken referans" amaçlı. F7 ya da başka bir plan gündeme gelirse
buradaki 4 keşfi (10D, 02c.history, 09d/13l veri şekilleri, RAG zaten
aktif) yeniden keşfetmeye gerek yok.
**How to apply:** Yeni oturumda bu sprintin bir parçasına dönülürse önce
bu dosyayı aç; ELLE listesinin hangi maddelerinin yapıldığını Emre'ye
sor (deploy durumu buradan izlenemez). İlgili: [[emre-kitaplari]]
[[ic-calisma-atlasi]] [[wanderer-studio-marka]] [[kusursuzluk-sprinti-kapanisi]]
[[hazine-destesi-kart-paketleri]].
