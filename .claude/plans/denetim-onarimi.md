# Denetim Onarımı — "kapıyı kur, sonra kapıya güven"

## Bağlam
`DENETIM-2026-09-01.md` on dokuz bulgu çıkardı. Emre kararı (2026-09-01):
**hepsi sırayla düzeltilecek.** Sıra denetimdeki öncelik listesidir: etki ÷ emek.

### Merkez kavram
Bulguların çoğu tek bir kalıbın türevleri: **söylenen ile ölçülen arasındaki
fark.** Belge "CI'da koşuyor" diyor, koşmuyor; test "sanitize ediyor" diyor,
mock'u ölçüyor; helper "escape eder" diyor, sayı görünce çöküyor. Onarımın
ölçüsü bu yüzden tek: her düzeltme **kendi kapısını da bırakmalı** — yoksa
aynı fark bir sonraki sprintte geri gelir.

### Devir dışı — gerekçe (§4.4 devir kapısı)
Fazların çoğu 🅢 ve normalde `uygulayici` ajanına devredilir. Bu snapshot'ta
`.claude/agents/` **yok**: ajan sözleşmesi (plan-dışı dosya yasağı, microcopy
icat etme yasağı, ad göçü yasağı) yüklenemiyor, yani devrin güvendiği şey
gelmiyor. Fazları kendim uyguluyorum; **faz denetimleri çapraz modelde**
(Sonnet) yapılarak §3.3'ün asıl kazancı — kör noktayı ikiye bölmek — korunuyor.

## Fazlar

### FAZ 1 — Build onarımı · 🅢
A1 `sed -i ''` → taşınabilir biçim (hem GNU hem BSD). A2 execute biti.
**Değişen:** `build.sh`, `.sh` dosya modları

### FAZ 2 — Bağımlılık açıkları · 🅢
C4 `npm audit fix` — DOMPurify 3.4.4 → güncel, tar critical.
**Değişen:** `package.json`, `package-lock.json`

### FAZ 3 — escapeHTML sertleştirme + ikiz göçü · 🅢
C1 merkezî helper ikizlerle aynı davranışa gelir; 26 modülün `esc`/`_esc`
tanımı merkezîye yönlendirilir. Ad değişmiyor → §4.3 göçü değil.
**Değişen:** `00a-infrastructure.js`, 26 modül, `tests/00a-infrastructure.test.js`

### FAZ 4 — Sanitizasyonu gerçekten sına · 🅢
C3 gerçek DOMPurify ile XSS vektör testi (node ortamı, mock'suz).
**Yeni:** `tests/00c-html-safe-gercek.test.js`

### FAZ 5 — Kapısız denetçileri kapıya bağla · 🅢
B2 audit-innerhtml + B4 bundle-size → `tests/*-kapisi.test.js`, taban deseniyle.
D3 audit motoru ifade-bazlı olur (fonksiyon-döndürür-HTML sözleşmesi tanınır).
**Yeni:** `scripts/xss-taban.json`, `tests/xss-kapisi.test.js`,
`tests/bundle-kapisi.test.js` · **Değişen:** `scripts/audit-innerhtml.mjs`

### FAZ 6 — Otomatik tetikleyici · 🅢
B1 GitHub Actions workflow: build + tam süit + denetçiler.
**Yeni:** `.github/workflows/kapi.yml`

### FAZ 7 — Güvenlik tamamlayıcıları · 🅞
Devir: 🅞 — C2'de `safeHTML` katmanının kaderi (kullan / kaldır) ve C5'te
`onclick` izninin daralıp daralmayacağı ürün kararıdır.
C7 `safeEq` iki webhook'a, C8 hosting başlıkları belgeye/yapılandırmaya.
**Değişen:** `revenuecat-webhook`, `eposta-sekme`, `00c-html-safe.js`

### FAZ 8 — Native senkron · 🅢
D1 `cap sync` ile android/ios bundle'ları web'e eşitlenir.
**Değişen:** `android/`, `ios/` public varlıkları

### FAZ 9 — Temizlik · 🅢
E1 ölü küme, E2 ikili kopya, E4 JSDoc em-dash.
**Değişen:** `12a-archetypes.js`, `icon-512.png`, üç JSDoc satırı

### FAZ 10 — Belge senkronu · 🅢
D2 `CODEMOD.md` + `TYPESCRIPT_MIGRATION.md` gerçek sayılarla; denetim raporuna
"onarıldı" işaretleri.
**Değişen:** iki belge, `DENETIM-2026-09-01.md`

## Riskler / Dikkat
1. **FAZ 3 çift kaçış**: ikizler ile merkezî aynı davranışa gelmeli; farklı
   davranan tek bir ikiz varsa (örn. `10q4`'ün `_esc`'i zaten escapeHTML sarar)
   göç sessizce çift kaçış üretebilir. Her ikiz okunacak, körlemesine sed yok.
2. **FAZ 2 DOMPurify major**: 3.4.4 → 3.x güncel; `ALLOWED_ATTR` davranışı
   değişmiş olabilir. Süit + gerçek sanitizasyon testi (FAZ 4) kanıt olacak.
   Bu yüzden FAZ 4, FAZ 2'nin hemen ardından gelir.
3. **FAZ 6 workflow**: CI ilk koşuda kırmızı olursa bu bir başarıdır — ama
   yeşile getirmeden faz kapanmaz.
4. **FAZ 8** Capacitor CLI native SDK istemez (yalnız dosya kopyalama), ama
   ortamda çalışmazsa ELLE adım olarak ayrılır — deploy edilmiş varsayılmaz.

## Doğrulama (her faz sonunda)
1. `bash build.sh` yeşil (FAZ 1'den sonra pazarlıksız)
2. Hedefli süit — o fazın dokunduğu testler
3. Faz denetimi çapraz modelde (Sonnet)
4. Sprint kapanışında: tam süit + preview boot + `npm audit`

## Kritik Dosyalar
- **Yeniden kullanılan:** kapı deseni (`tests/gerceklik-kapisi.test.js`),
  taban deseni (`scripts/tasarim-taban.json`), `safeEq`
  (`supabase/functions/bulten-cikis/index.ts:61`), `escapeHTML`
- **YENİ:** üç kapı testi, bir taban, bir workflow
