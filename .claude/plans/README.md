# `.claude/plans/` — ne var, ne yok, neden

Bu dizin çalışan plan artefaktlarını tutar (`PROTOKOL-FABLE.md` §4.2). Dosya
listesi bir envanter değil, bir **kayıt**tır: repoda olmayan planların borcu da
burada yazılıdır — çünkü onlara yaslanan otuz altı dosya var ve bir okuyucu
"bkz. şu planın FAZ 14'ü" satırını takip edemediğinde, eksikliğin sebebini
bilmek onu aramaya harcanan turdan ucuzdur.

## Repoda duran planlar

    denetim-onarimi.md · devir-altyapisi.md · gerceklik-mimarisi.md
    hafiza-borcu-odemesi.md · kapi-saglamlastirma.md
    kesin-alinti-mimarisi.md · koken-kor-noktalar.md
    ic-calisma-08-uc-ses-rev2.md

## Repoda OLMAYAN, ama referans verilen dokuz plan

2026-09-03 ölçümü: aşağıdaki dokuz ad `js/`, `tests/`, `scripts/` ve kök
belgelerinde toplam otuz altı yerde anılır, hiçbirinin dosyası yoktur.

| Plan | Kaç yerde anılır | En görünür çağıran |
|---|---|---|
| `mod-sistemi.md` | 10 | `tests/00-mode-system.test.js:5` |
| `duygu-motoru.md` | 9 | `tests/13D-ehliyet.test.js:10` |
| `ihtimalsel-dil-devrimi.md` | 4 | `scripts/ihtimalsel-denetci.mjs:5` |
| `tum-diller-native-2.md` | 4 | `js/parts/15-i18n.js:17` |
| `bundle-diyet.md` | 3 | `build.sh:134` |
| `persona-ic-calisma.md` | 2 | `scripts/ses-eval.mjs:5` |
| `gorunmeyen-doksan-bes.md` | 1 | `tests/13z-imge.test.js:6` |
| `sosyal-kapilar.md` | 1 | `SETUP-SOSYAL-KAPILAR.md:7` |
| `tasarim-anayasa-kapisi.md` | 1 | `tests/tasarim-kapisi.test.js:21` |

### Neden yoklar

Hepsi **lokal makinede yazıldı ve commit edilmedi**. `PROTOKOL-FABLE.md` §10.1
bunu tek cümleyle söyler: *lokal oturum DİSKİ görür, uzak oturum REPOYU.* §10.2
aynı bedeli bir kez ölçmüştü — o turda eksik olan `.claude/agents/`,
`.claude/memories/` ve `settings.json`'dı; onlar ödendi, **planlar ödenmedi**.
Bu tablo o borcun bugün kalan hâlidir.

### Neden yeniden yazılmıyorlar

§6.10 (gerçeklik kuralı): *kanıtı olmayan değer yoktur.* Bir planın içeriği —
onaylanan kararlar, faz sınırları, devir etiketleri, fallback zincirleri —
repodan **çıkarılamaz**. Koddan okunabilen şey planın SONUCUdur, planın
kendisi değil; ikisini karıştırıp "plan buymuş" diye bir dosya yazmak,
uydurulmuş bir kayıt üretir ve referansı düzeltmiş gibi görünürken
yanlışlar. Kayıp, kayıp olarak kalır.

Tek istisna aşağıdadır ve istisna olmasının sebebi kanıtın var olmasıdır.

### İstisna: `ic-calisma-08-uc-ses-rev2.md`

Bu plan 2026-09-03'te **yeniden kuruldu**, çünkü iki bağımsız kanıt kaynağı
vardı: (1) İç Çalışma 08 raporunun `07 · Yol Haritası — rev.2` bölümü altı fazı
adıyla, kapalı kümeleriyle ve gerekçeleriyle tarif ediyor; (2) fazların
tamamının uygulanmış hâli kodda duruyor ve okunabiliyor. Dosyanın başında bu
kökeni beyan eden bir not vardır — yeniden kurulmuş bir plan, özgün planla
aynı şey değildir ve öyle sunulmaz.

Kalan dokuzda bu iki kaynaktan ikisi de yok: raporları ya hiç yayımlanmadı ya
da faz kırılımını taşımıyor.

## Kural

**`.claude/` altındaki her insan yazısı commit edilir** (§10.3). Bir plan
yazıldığı turda commit edilmezse, o plana yaslanan her test yorumu ve her
denetçi başlığı sessizce hedefsiz kalır. Kapısı `tests/referans-butunlugu.test.js`:
TABAN büyüyemez, yeni kırık referans testi kırar.
