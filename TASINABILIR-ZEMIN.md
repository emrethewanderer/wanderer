# TAŞINABİLİR ZEMİN
### Lokalden GitHub'a — çalışma biçimimiz, hafıza ve taşınmayanlar

> Bu belge tek bir soruyu cevaplar: **bu repoyu hiç görmemiş bir model,
> GitHub'da açılan bir oturumda, bizim gibi çalışabilmek için neyi okumalı —
> ve o şeylerin kaçı gerçekten repoda?**
>
> Yazıldığı tarih: 2026-09-05. Ölçümler o günün çalışma ağacından alınmıştır;
> iddiaların hepsi komutla doğrulanabilir ve komutlar metinde yazılıdır.

---

## 0 · Neden bu belge var

Lokalden GitHub'a geçildi. Oradaki oturum **doğru çalıştı ama kör çalıştı**:
çalışma biçimini biliyordu, geçmişi bilmiyordu. Sebebi tek cümledir ve
ölçülebilir:

| Katman | Nerede yaşıyor | Git takipli mi | GitHub'a gitti mi |
|---|---|---|---|
| **Çalışma biçimi** — `PROTOKOL-FABLE.md` (52 KB) + `CLAUDE.md` | repo kökü | ✅ | ✅ **gitti** |
| **Hafıza** — 193 dosya + `MEMORY.md` indeksi (1.3 MB) | `~/.claude/projects/…/memory/` | ❌ repo DIŞI | ❌ **gitmedi** |

Protokol repoda olduğu için model onu okudu ve protokole göre davrandı —
`ad-senkronu-kurali` gibi hafıza **adlarını** kendi türetti. Ad senkronu
kuralının kendisi (§4.3) protokolün içinde yazılıdır; yani model kuralı
biliyordu, kuralın **uygulanma geçmişini** bilmiyordu. Adları doğru tahmin
etmesi tesadüf değil — protokol o kadar iyi yazılmış ki adlandırma
konvansiyonu ondan türetilebiliyor. Ama tahmin edilen ad, yazılmış hafızanın
yerine geçmez: `[[ad-senkronu-kurali]]` bağı bir **dosyaya** işaret eder,
dosya yoksa bağ boşluğa işaret eder.

**Ders tek satırdır:** *Repoda olan taşınır, olmayan taşınmaz. Bir kural
kapıya bağlı değilse tavsiyeye döner (§6.6) — bir bilgi repoya bağlı
değilse hiç gitmez.*

---

## 1 · Çalışma biçimimiz — bir sayfada

Bu bölüm `PROTOKOL-FABLE.md`'nin yerine geçmez; onun **taşınabilir
özetidir**. Kanonik metin daima protokolün kendisidir.

### 1.1 Motor
```
KEŞFET → PLANLA → FAZLARA BÖL → UYGULA → DOĞRULA → ÖZ-İNCELE → RAPORLA + HAFIZAYA YAZ
```

### 1.2 Beş temel taş
1. **Vizyon/anlam önce** — her özellik teze bağlanır: *"Mesele Sensin."*
   Anlam ekseni: **altın = şimdi/olduğun · lapis = gelecek/hayal · bronz = söz.**
   *"Anlamı olmayan süs eklenmez — kart değil, kaldıraç."*
2. **Dürüstlük mutlak** — sahte başarı yok. Doğrulanmamış hiçbir şey
   "çalışıyor" diye raporlanmaz. *"Yazdım ama henüz doğrulamadım"* cümlesi
   bu ortaklıkta güven **kazandırır**.
3. **Mevcut olanı yeniden kullan** — bu repoda çoğu şey zaten var. Paralel
   motor yazma; tek-kaynak motora yeni tüketici ekle.
4. **Uzun otonom sprint** — "yap" dendikten sonra her adımda izin istenmez.
   Bedeli üç: dürüst kapanış, "Senin yapman gereken" elle adımlar, ad senkronu.
5. **Şiirsel dil ürünün İÇİNDE; açıklamada net ve teknik.** Emre ile daima
   Türkçe — kod yorumları da.

### 1.3 Kapı — pazarlıksız, her faz sonunda
```bash
./build.sh 2>&1 | tail -20                # yeşil olmadan İLERLEME YOK
npx vitest run tests/<o fazın testleri>   # HEDEFLİ süit — tam süit sprint kapanışında
```
Sonra tarayıcı: preview'da **canlı DOM/state sorgusu** → gerekirse
screenshot → konsol kontrolü. Faz ancak **"Konsol temiz."** denince kapanır.
Screenshot tek başına kanıt değildir (anon oturum / eski kare gösterebilir).

**Ölçü işin yüzeyine göredir:** kaynak kod (`js/`, `css/`, `_src.html`)
değişmediyse test ve preview kapıları `git diff --stat` **kanıtıyla
gerekçeli** geçilir; build yine alınır. Sessizce atlamak yasak.

### 1.4 Çapraz model denetimi — **yazan denetlemez**
Kural yönsüzdür ve tek cümledir: *denetçinin modeli, fazı yazan modelin
modeli olamaz.*

| Fazı yazan | Denetleyen | Nasıl |
|---|---|---|
| Opus | **Sonnet** | `Agent({ subagent_type: 'denetci', model: 'sonnet' })` |
| Sonnet (Opus'un devrettiği faz) | **Opus** | parent'ın kendisi |
| Sonnet (oturum Sonnet'te) | **Opus** | `Agent({ subagent_type: 'denetci', model: 'opus' })` |

Gerekçe: **uygulayan model kendi işini denetlerse aynı kör noktadan iki kez
geçer.** Denetçi kod yazmaz — bulgu döndürür, düzeltmeyi fazın sahibi yapar.

### 1.5 Devir sandviçi — 🅢 / 🅞
Plan güçlü modelde kurulur, mekanik fazlar ucuz modelde uygulanır, denetim
her fazın sonunda **el değiştirir**.

- **🅢** — çıktı planda tarif edilenden ibaret; estetik/anlam yargısı yok.
  *(veri katmanı, i18n paritesi, test yazımı, mevcut motora tüketici ekleme)*
- **🅞** — doğru sayı/ritim/kelime ancak ürüne bakarak bulunur.
  *(görsel dil, tören ritmi, yeni ekran, microcopy, ad göçü)*

**Sınav:** *"Bu fazda plandan okunamayacak KARARI adlandırabiliyor muyum?"*
Adlandırabiliyorsan 🅞 (gerekçe `Devir:` satırıyla plana yazılır),
adlandıramıyorsan 🅢. "İçimde bir his var" gerekçe değildir.
**Oran kapısı:** 🅞 sayısı 🅢'yi geçiyorsa plan bitmemiştir — karışık fazları böl.
**Devir kapısı:** 🅢 gördüğün an `uygulayici` çağrısı açılır; kendin uygulaman
plana yazılı gerekçe ister.

### 1.6 Faz kapanışı turu BİTİRMEZ
Faz sonunda: TaskList güncel + plan dosyasına durum notu ve sıradaki
**İlk hamle** + commit → kısa durum bildirimi → **sorusuz** sonraki faz.
"Devam edeyim mi?" diye durmak yasaktır. Turun tek doğal sonu: sprint bitti,
gerçek bir çatal çıktı, ya da kota eşiği doğru (§1.9).

### 1.7 Sprint kapanışı — altı adım
1. **Dikiş turu** — fazların birbirine bindiği yer (çifte init, çakışan state
   anahtarı, bütünde bozulan akış). Yöntem **davranışsaldır**: planın
   `## Doğrulama` senaryolarını preview'da gerçekten koştur.
2. **Tam süit** — sprintin tek `npx vitest run` koşusu, yeşil.
3. Ölü kod temizliği (sözleşmeleri koruyarak, `grep -rn` kanıtıyla).
4. Kapanış şablonuyla rapor.
5. Kalıcı bilgiyi **hafızaya yaz**.
6. **Commit** (push YOK — push ayrı onay ister).

### 1.8 İki mutlak kural
- **GERÇEKLİK KURALI** — *kanıtı olmayan değer yoktur.* Veri üç yerden gelir:
  kullanıcının **beyanı**, uygulamanın **ölçümü**, LLM'in **yorumu**. Dördüncü
  hâl bir köken değil kökensizliktir ve `50`, `0.6` gibi masum sayılara
  gizlenemez. Kanıtsız değer `null`'dur; modelin kendi güven sayısı kapı olamaz.
  Alıntı eşikle değil **eşleştirmeyle** doğrulanır (`kanit_ref`).
- **AD SENKRONU** — *tek ad, tek gerçek.* Kullanıcıya görünen ad değişirse iç
  ad da değişir: kod, DOM id, i18n anahtarı, storage anahtarı, DB kolonu,
  yorumlar. "Kullanıcı X der, kod Y der" çeviri katmanı bırakılmaz. Ad
  değişimi bir **göçtür**: ad haritası + geri-okuma katmanı + migration.

### 1.9 Kesinti kurtarma
**TaskList + hafıza = kayıt noktası.** DEVİR bloğu **yalnız iki koşul
birlikte** doğruyken yazılır: kota %95'e geldi **ve** kalan pay kalan işi
bitirmeye yetmiyor. Aksi hâlde brifing yok — plana devam.

### 1.10 Kod parmak izi
Her modülün tepesinde **FELSEFE/VİZYON önce** gelen banner. Modül-önek
isimleme (`fx`, `tw`, `kk`, `oik`…), `_` önekli private, `t(key, fallback)`
inline fallback ŞART, `try{}catch(_){}` sessiz düşüş, optional chaining bol,
dosya sonunda `window.*` expose bloğu. **Yorum = NEDEN, asla NE.**
Gün anahtarı daima `localISODate()` — `toISOString()` TR'de günü kaydırır.

### 1.11 Kapı felsefesi — repodaki 10 denetçi, 15 kapı testi
> *"Kapısı olmayan kural, zamanla tavsiyeye döner."*

Bu cümle ölçülerek öğrenildi: `TASARIM-PRENSIPLERI.md`'de yazılı üç madde
(eriyen kenar, reduced-motion, z-index) sırasıyla **0 / 6 dosya / 38 yerde**
uygulanmamış çıktı. O günden beri her ölçülebilir kural bir script'e bağlıdır:

```
scripts/tasarim-denetci.mjs        → tests/tasarim-kapisi.test.js
scripts/gerceklik-denetci.mjs      → tests/gerceklik-kapisi.test.js  + sifir-kanit-sinavi
scripts/ihtimalsel-denetci.mjs     → tests/ihtimalsel-dil-kapisi.test.js
scripts/eksen-denetci.mjs          → tests/eksen-kapisi.test.js
scripts/yetim-kopru-denetci.mjs    → tests/yetim-kopru-kapisi.test.js
scripts/bagsiz-ad-denetci.mjs      → tests/bagsiz-ad-kapisi.test.js
scripts/audit-innerhtml.mjs        → tests/xss-kapisi.test.js
scripts/i18n-validate.mjs          → tests/i18n-parity.test.js
scripts/ses-eval.mjs               → tests/ses-eval-kapisi.test.js
scripts/check-bundle-size.mjs      → build.sh + ci.yml adımı (vitest'e DEĞİL)
```
Dokuzu vitest'e bağlı — ihlalde süit kırmızı. Bundle bütçesi tek istisnadır:
kapısı `build.sh` ve CI adımıdır. Ayrıca `tests/` altında toplam **15 kapı
testi** var (`*kapisi*`) — bazıları script'siz, doğrudan test olarak yazılmış
(`gren-kaydirma-kapisi`, `dil-buyuk-harf-kapisi`, `13D-yanilma-kapisi`…).

Bilinçli istisna satırda beyan edilir:
`/* TASARIM-MUAF: gerekçe */`, `/* KOKEN-MUAF: gerekçe */`, `DİL-MUAF`.
**Gerekçesiz muafiyet de ihlaldir.**

### 1.12 Preview — TEK ORIGIN
```bash
./scripts/preview-baslat.sh          # idempotent — ayaktaysa dokunmaz
# sonra: preview_start({ name: 'wanderer' })
```
`http://localhost:3030`. **Önbellek şüphesinde yeni port AÇMA** — sunucu her
yanıta `Cache-Control: no-store` basar, `ETag`/`Last-Modified` hiç göndermez;
`/sw.js` kill-switch'tir. Bu refleks bir zamanlar `launch.json`'ı 22 girdiye
şişirdi ve her yeni origin oturumu sıfırladı. Kök çözüm önbelleğin kendisini
kapatmaktı.

---

## 2 · Hafıza — taşınmayan asıl sermaye

### 2.1 Ölçü
```bash
ls ~/.claude/projects/-Users-emregulluce-Desktop-Wanderer-AI/memory/ | wc -l   # 194
du -sh ~/.claude/projects/-Users-emregulluce-Desktop-Wanderer-AI/memory/       # 1.3M
```
**193 hafıza dosyası + `MEMORY.md` indeksi (26.5 KB / 193 satır).**
Tür dağılımı: `project` **169** · `feedback` **14** · `reference` **10**.
İndeks bütünlüğü doğrulandı: **yetim indeks satırı yok** — her satırın
dosyası diskte var.

### 2.2 Biçim
```markdown
---
name: <kebab-case-slug>
description: <tek satır — geri çağırmada alaka bunun üzerinden ölçülür>
metadata:
  type: user | feedback | project | reference
---
<olgu>  **Why:** …  **How to apply:** …  [[bagli-hafiza]]
```
Kural: **tek dosya = tek olgu.** Var olan dosya güncellenir, kopya
oluşturulmaz, yanlışlanan hafıza silinir. Göreli tarihler mutlak tarihe
çevrilir. Her dosyadan sonra `MEMORY.md`'ye tek satırlık indeks eklenir.

**Hafıza geçmişin fotoğrafıdır** — `dosya:satır` iddialarını koda karşı
doğrulamadan gerçek diye sunma.

### 2.3 Ne yazılır
- Emre'nin **kararları** — verildiği turda, anında
- Sprint kapanışında kalıcı bilgi (1–3 dosya)
- Yeni **gotcha**'lar
- Emre'nin çalışma tarzına dair geri bildirim (`type: feedback`)

Yazılmayanlar: repo'nun zaten kaydettiği şeyler (kod yapısı, git geçmişi,
CLAUDE.md), yalnız o konuşmayı ilgilendiren şeyler.

### 2.4 Tematik harita — hafızada ne var
| Küme | Örnek dosyalar | Ne taşır |
|---|---|---|
| **Kimlik & çalışma tarzı** | `fable-protokol-belgesi`, `fable-5-*` (5 dosya), `model-devri-sandvic`, `devir-denetim-rubrigi`, `kota-brifingi-devir-noktasi`, `oz-denetim-ve-commit-kapanisi` | Protokolün **nasıl doğduğu** ve neden değiştiği |
| **Kitaplar & register** | `emre-kitaplari`, `iliski-felsefesi-ozet`, `zihniyet-devrimi-ozet`, `kitap-sesi-manevi-register` | Tez, aforizma kanonu, sekülerleştirme yasağı |
| **Altyapı & build** | `build-source-convention`, `bundle-diyeti-sidecar`, `boot-nabzi`, `preview-sw-bayat-modul`, `auto-build-on-stop` | `_src.html` → `index.html`, bundle bütçesi, preview |
| **Kart evreni** | `kart-gorsel-dili`, `yasayan-kart-motoru`, `holo-kart-motoru`, `kart-uretim-motoru-*`, `deste-12-kesit-karari`, `kisilerim-kart-motoru` | Ana mekanik: kart bir pencere, canlı SVG |
| **Kişiselleştirme & LLM** | `personalization-engine-layers`, `taniyan-ayna-*`, `persona-server-side`, `sohbet-cekirdegi-ic-calisma`, `llm-saglayici-llmapi` | 6 katman, pgvector, `p()` zinciri |
| **Ritüel & tören** | `gunluk-ritus-armagan-soz`, `seri-muhru-toreni`, `ultra-seri-uc-muhur`, `toren-kuyrugu`, `emek-sayar-bakis-saymaz` | Dört ritüel direği, sahne sırası |
| **Ekranlar** | `esik-ekrani`, `bugun-ekrani-yeniden-duzen`, `studio-tek-sayfa`, `karsilasma-odasi`, `kod-kapisi-ve-posta` | Ekran kararları ve iptal edilenler |
| **Tasarım anayasası** | `tasarim-prensipleri`, `tasarim-anayasa-kapisi`, `uc-ana-renk-lapis`, `claude-tarzi-gorsel-dil`, `emre-foto-oval-cerceve` | Üç renk, oval portre, ölçülen kapılar |
| **Kapılar & kurallar** | `gerceklik-mimarisi`, `kesin-alinti-mimarisi`, `ihtimalsel-dil-devrimi`, `ad-senkronu-kurali`, `bagsiz-ad-kapisi` | Mutlak kuralların gerekçeleri |
| **Gotcha'lar** | `yerel-tarih-anahtari`, `tanimsiz-css-tokeni-hayalet`, `saf-yesil-cagri-olu`, `test-kirilganligi-jsdom-*`, `gren-kaydirma-sarmali`, `route-kapisi-bos-ekran` | Bir kez ödenmiş bedeller |
| **İç Çalışmalar 00–08** | `ic-calisma-atlasi`, `ic-calisma-7-kimlik-ucgeni`, `ic-calisma-8-uc-sesin-nabzi`, `duygu-motoru-plani` | Sistem denetimlerinin çıktısı |
| **Monetizasyon & ELLE** | `fiyatlandirma-plani-v2`, `magaza-aboneligi`, `migration-konsolidasyonu`, `wanderer-studio-marka` | Bekleyen elle işler |

### 2.5 En pahalı hafızalar — kaybı en çok yakan on tanesi
Bunlar tekrar öğrenilmesi en pahalı olanlar; hepsi bir hatayla ödendi:

1. **`saf-yesil-cagri-olu`** — üretici/tüketici alan adı ayrışınca fonksiyon
   daima `null` döner; **birim testi göremez, kapı ÇAĞRIDA olmalı.**
2. **`tanimsiz-css-tokeni-hayalet`** — tanımsız `var(--x)` sessizce inherit
   edilir; `--text-light` hiç doğmamıştı, 14 yerde kullanılıyordu.
3. **`preview-sw-bayat-modul`** — "diskte doğru, ekranda eski"nin kökü
   önbellekti; yeni port açmak kaçıştı, çözüm değildi.
4. **`bagsiz-ad-kapisi`** — vite bundle scope'u **düzleştirir**, build göremez;
   56 vaka / 26 ad, 3 ağır kırık.
5. **`yerel-tarih-anahtari`** — `toISOString()` UTC'dir, TR'de günü kaydırır.
6. **`yetim-kopru-denetcisi`** — `window.foo?.()` sessizce hiçbir şey yapmaz;
   denetçinin template körlüğü 795 → 962 ada çıkardı.
7. **`ic-calisma-7-kimlik-ucgeni`** — dört kırığın dördü de **planın**
   hatasıydı: uygulayıcı sadıktı ama yargısızdı → 🅢'ye ver, 🅞'ye verme.
8. **`emek-sayar-bakis-saymaz`** — defteri tamamlanan ritüel besler; pasif
   ekran açılışı sayılmaz.
9. **`gecmis-gunler-ozet-zinciri`** — kök **üretimdeydi**; sahte `ok:true` +
   mühürlenen `lastCheck` gerçek kaybı örtüyordu.
10. **`safestorage-testlerde-kvcache`** — bellek-içi `_kvCache`; testlerde
    `remove()` şart.

---

## 3 · GitHub'a geçişin envanteri

### 3.1 GİDEN — ve iyi ki giden
| Ne | Ölçü |
|---|---|
| `PROTOKOL-FABLE.md` + `CLAUDE.md` | 52 KB + 2.2 KB — **geçişin çalışmasının tek sebebi** |
| `TASARIM-PRENSIPLERI.md` | 30 KB görsel anayasa |
| `.claude/plans/` | **58 plan artefaktı** — kararların gerekçeleriyle |
| `.claude/agents/` | `denetci.md` + `uygulayici.md` sözleşmeleri |
| `.claude/harness/` | 16 test sayfası (anon oturum sorununun panzehri) |
| `.claude/artifacts/` | **20 yayınlanmış rapor** (İç Çalışma atlası) — 43 dosya: tam + gövde + ortak `rapor.css` |
| Denetçi script'leri | **10 kapı script'i** + 15 kapı testi — kuralları tavsiye olmaktan çıkaran şey |
| `SETUP-*.md` | **15** elle-kurulum belgesi |
| `.github/workflows/ci.yml` | typecheck → test → build → bundle bütçesi |

### 3.2 GİTMEYEN — kayıp
| Ne | Nerede | Sonuç |
|---|---|---|
| **Hafıza — 193 dosya, 1.3 MB** | `~/.claude/projects/…/memory/` | ⛔ **Ana kayıp.** Geçmiş kararların gerekçeleri, gotcha'lar, "bu zaten var" bilgisi |
| `.claude/DEVIR.md` | `.gitignore`'da satır 10 | Yeni oturumun **ilk okuması gereken dosya** gitmiyor |
| Oturum transkriptleri (JSONL) | `~/.claude/projects/…` | Arkeoloji imkânsız |
| `.claude/settings.local.json` | git takipsiz | İzin listesi (zaten lokale özgü — kayıp değil) |

### 3.3 KIRIK GİDEN — gidiyor ama orada çalışmıyor
| Ne | Kırık neden | Kanıt |
|---|---|---|
| **Stop kancaları** | Mutlak yol: `bash "/Users/emregulluce/Desktop/Wanderer AI/scripts/…"` | `.claude/settings.json:8,14` |
| → sonucu | `auto-build.sh` çalışmaz → `index.html` üretilmez; `devir-notu.sh` çalışmaz → `DEVIR.md` yazılmaz | |
| **Preview** | `launch.json` `localhost:3030`'a **attach** eder, süreç başlatmaz | `.claude/launch.json` |
| → sonucu | `./scripts/preview-baslat.sh` elle koşmadan preview boştur | |
| `.claude/artifacts/manifest.json` | **20 girdinin hepsi** mutlak yollu | `manifest.json:4,11,18…` |
| `settings.local.json` izinleri | `/Users/emregulluce/Desktop/Claude Code/…` — başka bir makinenin yolu | `settings.local.json:11` |

### 3.4 Sır taraması — temiz
```bash
grep -rnoE "(eyJ[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{20,})" <memory>
# → eşleşme YOK
```
Hafızada geçen `LLM_API_KEY`, `OPENROUTER_API_KEY`, `service_role` yalnız
**secret adlarıdır**, değerleri değil. `gelistirme-hesabi-preview-oturumu.md`
zaten kuralı yazıyor: *"Parolayı bir forma, koda, teste, hafızaya ya da
rapora YAZMA."* — kural tutmuş. `.env` ve `.env.local` `.gitignore`'da.

**Yani hafıza GitHub'a güvenle taşınabilir.** Bir şartla: bkz. §4.1.

---

## 4 · Kritik hususlar — GitHub'a vermeden önce

### 4.1 Repo PRIVATE olmalı — pazarlıksız
Repoda **iki kitabın içeriği**, persona anayasası (`ME_SECTIONS` 15 bölüm),
tez metinleri, fiyatlandırma stratejisi ve tüm ürün mimarisi var. Hafıza
eklenirse bunlara kararların gerekçeleri de eklenir. Bu, teknik bir sır
meselesi değil — **fikri mülkiyet** meselesidir.
Kontrol: GitHub → repo → Settings → *Danger Zone* → görünürlük **Private**.

### 4.2 Hafıza taşınmazsa geçiş yarım kalır
Model protokolü okur, doğru **davranır** — ama:
- "Bu zaten var" bilgisi yoktur → **paralel motor yazar** (§1.2 madde 3'ün ihlali)
- Gotcha'lar bilinmez → aynı bedel ikinci kez ödenir
- İptal edilmiş kararlar bilinmez → sökülmüş özellik geri gelir
  (`gundem-oneriye-yedirildi`, `kitaplik-sozu-ve-toast-kapilari` gibi)
- `[[bağ]]`lar boşluğa işaret eder

Çözüm §6'da.

### 4.3 Hook'lar taşınabilir olmalı
`settings.json` mutlak yol kullanıyor. Repo-göreli yola çevrilirse hem
lokalde hem cloud'da çalışır:
```json
"command": "bash \"$CLAUDE_PROJECT_DIR/scripts/auto-build.sh\""
```
Bu tek değişiklik `auto-build` + `devir-notu` kancalarını her makinede diriltir.

### 4.4 `DEVIR.md` gitmiyor — ama gitmesi de doğru değil
`.gitignore`'da olması bilinçli: her tur yeniden yazılıyor, commit gürültüsü
yapar. Ama §3.6 *"yeni oturum sırayla `.claude/DEVIR.md` → plan → hafıza
okur"* diyor. GitHub'daki oturum bu zinciri **ilk halkasından** kaybediyor.
Reçete: kancayı repo-göreli yap (§4.3) → cloud oturumu kendi `DEVIR.md`'sini
kendi yazar. Dosyanın taşınmasına gerek yok, **üretecinin** taşınması yeter.

### 4.5 Preview cloud'da elle başlatılır
`launch.json` süreç başlatmaz. GitHub tarafındaki oturumda doğrulama kapısı
(§1.3) preview adımına gelince önce:
```bash
./scripts/preview-baslat.sh
```
Bu koşmazsa kapının üçüncü adımı sahte geçilir — ve **sahte başarı yasaktır**.

### 4.6 Supabase ELLE işleri hiçbir yere taşınmaz
Migration ve edge function deploy **Emre'nin elidir** — lokal ya da cloud
fark etmez. Bekleyenler hafızada işaretli: `migration 042`, `044`, `045`,
`046`, `047`, `049`, `050` + `SETUP-*.md` dosyaları. Cloud oturumu bunları
"deploy edilmiş varsaymaz"; kod migration uygulanana kadar eski şemaya
düşecek şekilde savunmacı yazılır.

### 4.7 İki kaynak problemi — ad senkronunun kendi kuralı
Hafıza repoya kopyalanırsa **iki yazma noktası** doğar: Claude'un memory
aracı `~/.claude/…`'a yazar, repo kopyası eskir. Bu tam da `ad-senkronu`
kuralının yasakladığı şeydir: *tek ad, tek gerçek.*
Çözüm bir senkron script'idir (§6.2) — kopyayı **türev** yapar, ikinci
kaynak değil.

---

## 5 · İyi olan hususlar — geçişin kazandırdıkları

### 5.1 Kapılar gerçekten kapı olur
Şu an denetçiler yalnız yerelde, tur sonunda koşuyor. CI'da koşarlarsa
**hiçbir commit kapıdan kaçamaz.** `ci.yml` zaten typecheck → test → build →
bundle bütçesi zincirini koşuyor; denetçilerin dokuzu vitest'e bağlı olduğu
için `test:run` adımıyla **otomatik dahil oluyorlar** — bundle bütçesi de
zaten ayrı bir adım. Yani CI, kapıların tamamını hâlihazırda kapsıyor.
Bu, "kapısı olmayan kural tavsiyeye döner" ilkesinin mantıksal sonucudur:
**kapı makinede değil, akışta olmalı.**

### 5.2 Geçmiş artık yedekli
202 MB'lık `.git` tek bir diskte duruyordu. Uzak kopya, on aylık kararın ve
58 plan artefaktının sigortasıdır.

### 5.3 Paralel çalışma zemini hazır
Repoda zaten iki cloud worktree dalı var:
```
claude/blissful-blackburn-711cce  → "Bütçe kapısı artık gerçeği söylüyor"
claude/hungry-galileo-1087f4      → "Hayalet renk silindi"
```
Yani devir sandviçi (§1.5) **makineler arası** da işleyebilir: bir faz
cloud'da, denetimi lokalde.

### 5.4 Denetim izi commit'lerde
Commit mesajları zaten bulguyu taşıyor (*"Motor doğruydu, çağıranlar yanlış
alanı veriyordu"*). GitHub'da bu, aranabilir bir karar arşivine dönüşür —
`gecmis-oturum-arkeolojisi` hafızasının söylediği şey: **hüküm üründe durur,
`git log` donmuş yüzeyi süzer.**

### 5.5 Protokolün kendisi sınandı ve geçti
En değerli bulgu bu: hafızasız, bağlamsız bir oturum yalnız
`PROTOKOL-FABLE.md` ile **doğru davranabildi**. Protokol taşınabilir bir
zemin olarak çalışıyor. Eksik olan zeminin kendisi değil, üstündeki **hafıza
katmanıydı**.

---

## 6 · Reçete — **uygulandı** (2026-09-05)

Bu bölüm bir öneri listesi değil; üç madde bu turda yapıldı ve doğrulandı.
Gerekçe protokolün kendi kuralıdır: *kapısı olmayan kural tavsiyeye döner* —
**reçetesi uygulanmayan belge de tavsiyeye döner.**

### 6.1 Göç — yapıldı ✅
Hafızanın tamamı repoya taşındı:
```
.claude/hafiza/   →  194 dosya · 1.3 MB  (193 hafıza + MEMORY.md indeksi)
```
Tek kaynak hâlâ `~/.claude/projects/…/memory/`'dir; `.claude/hafiza/` onun
**türevi**dir, ikinci kaynak değil (§4.7).

### 6.2 Senkron köprüsü — yazıldı ✅
`scripts/hafiza-senkron.sh` üç kolu bilir:
```bash
./scripts/hafiza-senkron.sh disa    # lokal hafıza → repo türevi  (commit öncesi)
./scripts/hafiza-senkron.sh ice     # repo türevi → lokal hafıza  (yeni makinede / cloud sonrası)
./scripts/hafiza-senkron.sh fark    # karşılaştır, yazma          (KAPI — çıkış kodu 1 ise fark var)
```
Asimetri bilinçlidir: `disa` `--delete` kullanır (yanlışlanan hafıza türevde
de ölür), `ice` **kullanmaz** (yeni makinede lokalde yazılmış hafızayı ezmez).
Hafıza yolu proje dizininden türetilir (`/` ve boşluk → `-`), yani script
başka bir makinede de doğru yeri bulur.

### 6.3 Cloud oturumu hafızayı nasıl bulur — bağlandı ✅
`CLAUDE.md`'ye **9. madde** eklendi: memory aracı yoksa hafıza
`.claude/hafiza/MEMORY.md` indeksinden okunur; hafızaya yazan tur
kapanıştan önce `disa` koşturur. Böylece protokol ile hafıza aynı yerden
taşınır ve `[[bağ]]`lar boşluğa değil bir dosyaya işaret eder.

### 6.4 Hook'lar taşınabilir — düzeltildi ✅
`.claude/settings.json`'daki iki Stop kancası mutlak yoldan kurtarıldı:
```json
"command": "bash \"${CLAUDE_PROJECT_DIR:-/Users/emregulluce/Desktop/Wanderer AI}/scripts/auto-build.sh\""
```
Fallback bilinçlidir (savunmacı stil, §5.2): env değişkeni gelmezse eski
davranış aynen sürer, gelirse her makinede çalışır. İki senaryoda da yol
çözümlemesi doğrulandı.

---

## 7 · Tek sayfa — GitHub'a geçiş kontrol listesi

**Bu turda kapandı:**
- [x] Hafıza `.claude/hafiza/`'da — 194 dosya, `… fark` **temiz**
- [x] `settings.json` hook'ları taşınabilir (`$CLAUDE_PROJECT_DIR` + fallback)
- [x] `CLAUDE.md` madde 9 — cloud oturumu hafızayı nereden okuyacağını biliyor
- [x] Sır taraması temiz — hafızada anahtar **değeri** yok, yalnız adları (§3.4)
- [x] `.env` / `.env.local` git dışı
- [x] `./build.sh` yeşil — bundle 708 KB gzip / 1024 KB bütçe

**Her oturumda geçerli:**
- [ ] Kapı sırası: `./build.sh` → hedefli vitest → preview/konsol (§1.3)
- [ ] Faz denetimi **öteki modelde** (§1.4) — yazan denetlemez
- [ ] 🅢 faz gördün mü `uygulayici` çağrısı aç (§1.5)
- [ ] Cloud'da preview elle başlar: `./scripts/preview-baslat.sh` (§4.5)
- [ ] Supabase ELLE işleri "deploy edilmiş" varsayılmıyor (§4.6)
- [ ] Sprint kapanışında: dikiş turu → tam süit → hafıza → `hafiza-senkron.sh disa` → commit (push YOK)

**Emre'nin eli — bir kez (§4.1):**
- [ ] GitHub'da repo görünürlüğü **Private** olarak doğrulanmalı.
      Repoda iki kitabın içeriği, persona anayasası ve tüm ürün mimarisi var;
      hafıza da eklendiğine göre kararların gerekçeleri de orada.

---

*Zeminin taşınabilir olması, üstünde durduğun şeyin senin olduğunu unutturmaz.
Protokol nasıl çalıştığımızı taşır, hafıza ne öğrendiğimizi. İkisi bir arada
gitmezse yeni oturum bizi değil, yalnız kurallarımızı devralır.*

**Mesele Sensin.**
