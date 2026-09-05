// @vitest-environment node
// Dosya sistemiyle çalışır, DOM'a hiç dokunmaz — jsdom kurulumunu boşa ödemez.

/**
 * REFERANS BÜTÜNLÜĞÜ KAPISI — "belge/test bir dosyaya işaret ediyor, dosya yok"
 * sınıfının bekçisi.
 *
 * Sprint boyunca (devir-altyapisi) DÖRT kırık iç referans bulundu: üçü o
 * turda kapatıldı, dördüncüsü (`tests/bagsiz-ad-kapisi.test.js` → köşeli
 * çift parantezli bir hafıza adı, `.claude/memories/` altında yoktu) bu
 * dosyanın doğrudan sebebidir. Tek tek kapatmak §6.6'nın kendi uyarısına
 * düşerdi: "Kapısı olmayan kural, zamanla tavsiyeye döner." Beşinci kırık
 * referans yarın oluşur — bu yüzden kapı.
 *
 * Üç referans biçimi taranır:
 *   · köşeli çift parantezli hafıza adı → `.claude/hafiza/<ad>.md`
 *     (eski `.claude/memories/<ad>.md` yolu da tanınır — bkz. HAFIZA_DIZINLERI)
 *   · `.claude/plans/<slug>.md` yolu    → dosya var olmalı
 *   · `.claude/agents/<ad>.md` yolu     → dosya var olmalı
 * Taranan yerler: kök `*.md`, `.claude` altı `.md` (recursive), `js` altı
 * `.js` (recursive), `tests` altı `.js` (recursive), `scripts` altı `.mjs`
 * (recursive). Hariç: node_modules, dist, coverage, assets, android, ios.
 *
 * MUAFİYET: bilinçli istisna, ihlalin geçtiği satırda ya da en fazla altı
 * satır yukarıdaki yorumda beyan edilir — emsal `TASARIM-MUAF`
 * (scripts/tasarim-denetci.mjs) ve `KOKEN-MUAF` (scripts/gerceklik-denetci.mjs)
 * ile aynı biçim:
 *     /* REFERANS-MUAF: gerekçe *​/
 * Gerekçesiz muafiyet de ihlaldir (§6.10) — sekiz karakterden kısa gerekçe
 * muafiyet SAYILMAZ, altındaki kırık referans yine yakalanır. `SABLON_ADLAR`
 * denylist'i bunun YERİNE değil YANINA gelir: biri bilinen jenerik kelimeleri
 * (`name`, `ad`) kapalı ve küçük bir kümede tutar, öteki öngörülemeyen her
 * yeni vakayı satır satır karşılar — yeni bir vaka artık kod değişikliği
 * değil, bir satırlık beyan gerektirir.
 *
 * TABAN (kalıp `xss-taban.json` / `tasarim-taban.json` ile aynı — bkz.
 * [[xss-kapisi]]): bu tarama ilk koşulduğunda (2026-09-02) repoda otuz üç
 * ADI ayrı kırık referans zaten vardı — MEMORY.md'nin kendi notu bunu
 * doğrular: hafıza dizini bir "genel denetim turunda" sıfırdan başlatıldı,
 * ondan ÖNCEKİ oturumların `js/`/`tests/` içine yazdığı hafıza bağları
 * (`tanima-motoru`, `boot-nabzi`, `mod-sistemi.md` planı vb.) hedefsiz
 * kaldı. Bu borç FAZ 6a'nın kapsamı DEĞİL — plan dışı yeni dosya yasağı
 * (uygulayici.md §2.1) otuz beş dosyayı yeniden yazmayı zaten engelliyor.
 * Kapı bu yüzden BÜYÜMEYİ yasaklar, mevcut borcu tolere eder: TABAN'da
 * olmayan her yeni kırık referans testi kırar; TABAN'daki bir referansın
 * ödenmesi (hedefi sonradan yaratılması) testi kırmaz — küçülmek serbesttir.
 *
 * İkinci describe bloğu kapının KENDİSİNİ sınar: yeşil kalmak için ihlali
 * yakalayabildiğini de kanıtlamalı. Yakalamayan bir kapı, kapı değildir.
 * Örnek "kırık" metinler bu dosyanın İÇİNDE bitişik yazılamaz — bu dosya
 * da `tests` altı taramaya dahil olduğu için ana kapı testi kendi
 * kendini ihlal sayardı. Örnekler bu yüzden parça parça kurulur (bkz. o
 * describe bloğunun başındaki not).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/* ─── 1. TARAMA MOTORU ─── */

const HARIC_DIZIN = new Set(['node_modules', 'dist', 'coverage', 'assets', 'android', 'ios', '.git']);

/** Hafızanın git takipli türevi 2026-09-05'te `.claude/hafiza/`ya taşındı
 *  (CLAUDE.md md.9 · TASINABILIR-ZEMIN.md). Eski `.claude/memories/` yolu
 *  DÜŞÜRÜLMEZ: kapının kendi sınavı onu kurar, ve iki yol bir arada durunca
 *  taşınma sırasında hiçbir bağ hedefsiz kalmaz. */
const HAFIZA_DIZINLERI = ['.claude/hafiza', '.claude/memories'];

/** Bir dizini uzantıya göre recursive toplar. Kalıp `scripts/audit-innerhtml.mjs`nin
 *  gez()'i ile aynıdır: readdirSync + ayrı statSync, ikisi de try/catch'li.
 *  [[kapi-tarama-yarisi]] — listelenmiş ama tarama anında silinmiş bir girdi
 *  repo'nun kalıcı parçası değildir, sessizce atlanır. Kökendeki T7 sınavı
 *  artık repoya yazmıyor (kendi fixture'ında koşar, 2026-09-02); katman
 *  genel bir savunma olarak kaldı. */
function gez(dizin, uzanti) {
  const out = [];
  let dosyalar;
  try { dosyalar = readdirSync(dizin); }
  catch (_) { return out; } // dizin hiç yok (temiz fixture'da örn. tests/ olmayabilir)
  for (const ad of dosyalar) {
    if (HARIC_DIZIN.has(ad)) continue;
    const tam = join(dizin, ad);
    let st;
    try { st = statSync(tam); } catch (_) { continue; }
    if (st.isDirectory()) out.push(...gez(tam, uzanti));
    else if (ad.endsWith(uzanti)) out.push(tam);
  }
  return out;
}

/** Taranacak dosya listesi: kök `.md` (yalnız kök, recursive değil) +
 *  `.claude`, `js`, `tests` altı `.md`/`.js` (recursive) + `scripts` altı
 *  `.mjs` (recursive). */
function repoDosyalari(kok) {
  const kokMd = [];
  try {
    for (const ad of readdirSync(kok)) {
      if (HARIC_DIZIN.has(ad)) continue;
      const tam = join(kok, ad);
      let st; try { st = statSync(tam); } catch (_) { continue; }
      if (st.isFile() && ad.endsWith('.md')) kokMd.push(tam);
    }
  } catch (_) { /* kok yok — self-test fixture'ında olmayabilir */ }
  return [
    ...kokMd,
    ...gez(join(kok, '.claude'), '.md'),
    ...gez(join(kok, 'js'), '.js'),
    ...gez(join(kok, 'tests'), '.js'),
    ...gez(join(kok, 'scripts'), '.mjs'),
  ];
}

function oku(dosya) {
  try { return readFileSync(dosya, 'utf8'); }
  catch (e) { if (e && e.code === 'ENOENT') return null; throw e; } // [[kapi-tarama-yarisi]]
}

/* PROTOKOL-FABLE.md §7 kendi FORMAT ÖRNEĞİNDE köşeli çift parantezle `name`
   yazar — gerçek bir hafıza dosyasına işaret etmez, biçim tarifidir. §3.6'nın
   örneği (`memory-adı`) Türkçe ı içerdiği için zaten [A-Za-z0-9_-]+ karakter
   sınıfına uymaz; `.claude/plans/<slug>.md` gibi açı-parantezli örnekler de
   aynı sınıf `<`/`>` kabul etmediği için kendiliğinden dışlanır. Yalnız `name`
   saf ASCII ve tiresizdir, bu yüzden tek kelime açıkça listelenir.

   `ad` — FAZ 7d gerekçesi: dikiş notu bu biçimi anlatırken `[[ad]]` yazmıştı
   (devir-altyapisi.md, FAZ 6b dikiş bulgusu 1 — bkz. git a9a1de4→9c636bd);
   kapı bunu gerçek hafıza referansı sandı ve cümle `[[ad]]` yerine "çift
   köşeli parantez biçimi" diye yeniden yazılarak KAÇIRILDI — kapının kendisi
   düzeltilmedi. `name`in Türkçe karşılığı olduğu ve aynı gerekçeyle (biçim
   tarifi, hedef değil) kullanıldığı için buraya eklendi.

   Sınır — bu liste GENİŞ TUTULMAZ: `grep -rn '\[\[[A-Za-z0-9_-]+\]\]'` ile
   ölçüldü (2026-09-02, kök+`.claude`+`js`+`tests`+`scripts`), repodaki HER
   `[[...]]` örneği ya gerçek bir hafıza adı ya da zaten `.claude/memories/`de
   karşılığı olan bir bağdı — `name` ve `ad` DIŞINDA hiçbir jenerik yer-tutucu
   ASCII karakter sınıfına uyarak geçmiyordu (`bağ`, `memory-adı` gibi
   örnekler Türkçe harf yüzünden zaten regex dışı). Spekülatif kelime
   (`isim`, `slug`…) EKLENMEDİ: ölçülmemiş bir varsayım kapıyı körleştirir
   (§6.10 gerçeklik kuralı) — gerçek bir hafıza adı bu kelimelerden biriyle
   çakışırsa denylist onu sessizce yutar. Yeni bir şablon örneği çıkarsa aynı
   ölçüm tekrarlanıp buraya tek tek eklenir. */
const SABLON_ADLAR = new Set(['name', 'ad']);

const DESEN_HAFIZA = /\[\[([A-Za-z0-9_-]+)\]\]/g;
const DESEN_PLAN = /\.claude\/plans\/([A-Za-z0-9_-]+\.md)/g;
const DESEN_AGENT = /\.claude\/agents\/([A-Za-z0-9_-]+\.md)/g;

/* ─── Muafiyet — TASARIM-MUAF/KOKEN-MUAF ile aynı biçim (bkz. üstteki banner) ───
   Gerekçe çok satırlı olabilir — kapanış `*​/` aynı satırda aranmaz.
   Pencere dar tutulur (emsal: 6 satır) — uzaktaki bir muafiyet, alakasız bir
   kırık referansı sessizce örtmesin. */
const MUAF_RE = /\/\*\s*REFERANS-MUAF:\s*(.+)/;
const MUAF_PENCERE = 6;
function muaf(satirlar, i) {
  for (let j = Math.max(0, i - MUAF_PENCERE); j <= i; j++) {
    const m = (satirlar[j] || '').match(MUAF_RE);
    if (m && m[1] && m[1].replace(/\*\/\s*$/, '').trim().length >= 8) return true;
  }
  return false;
}

/** Tek dosyayı tarar, kırık referansları `sonuc`a ekler. Satır satır çalışır
 *  — muafiyet SATIR düzeyinde beyan edildiği için hangi satırda olduğunu
 *  bilmek gerekir; `[[…]]`/plan/agent desenleri tek satırı aşmadığı için
 *  bölme, hangi eşleşmenin bulunduğunu değiştirmez. */
function taraDosya(dosya, kok, sonuc) {
  const src = oku(dosya);
  if (src === null) return;
  const rel = relative(kok, dosya);
  const satirlar = src.split('\n');

  satirlar.forEach((satir, i) => {
    for (const m of satir.matchAll(DESEN_HAFIZA)) {
      const ad = m[1];
      if (SABLON_ADLAR.has(ad)) continue;
      if (HAFIZA_DIZINLERI.some((d) => existsSync(join(kok, d, `${ad}.md`)))) continue;
      if (muaf(satirlar, i)) continue;
      sonuc.push({ tip: 'hafiza', ad, dosya: rel });
    }
    for (const m of satir.matchAll(DESEN_PLAN)) {
      const ad = m[1];
      if (existsSync(join(kok, '.claude/plans', ad))) continue;
      if (muaf(satirlar, i)) continue;
      sonuc.push({ tip: 'plan', ad, dosya: rel });
    }
    for (const m of satir.matchAll(DESEN_AGENT)) {
      const ad = m[1];
      if (existsSync(join(kok, '.claude/agents', ad))) continue;
      if (muaf(satirlar, i)) continue;
      sonuc.push({ tip: 'agent', ad, dosya: rel });
    }
  });
}

/** Verilen kökten repo yapısını tarar, kırık referans listesini döndürür. */
function tara(kok) {
  const sonuc = [];
  for (const dosya of repoDosyalari(kok)) taraDosya(dosya, kok, sonuc);
  return sonuc;
}

function anahtar(b) { return `${b.tip}:${b.ad}`; }

/* ─── 2. TABAN — 2026-09-03 ölçümü, dokuz ayrı ad ───
   İlk ölçüm (2026-09-02) otuz üç ad saymıştı: yirmi üçü hafıza bağı, onu
   plan yolu. Yirmi üç hafıza borcunun tamamı o günün ilerleyen turunda
   ödendi (`6134284` — "Hafıza borcu kapandı: 23/23") ve dosyaları bugün
   `.claude/memories/` altında duruyor. TABAN küçülmedi; küçülmeyen taban
   bir kapı değil bir PERDEdir — ödenmiş yirmi üç borcun satırı, o
   dosyalardan biri silindiğinde kapıyı sessizce yeşil bırakacak yirmi üç
   serbest geçiş demektir. Ölçüm 2026-09-03'te yenilendi ve taban gerçeğe
   çekildi: geriye yalnız plan borcu kaldı.

   On plan borcundan biri (`ic-calisma-08-uc-ses-rev2.md`) 2026-09-03'te
   yeniden kuruldu — raporunun faz kırılımı ve fazların uygulanmış hâli
   birlikte yeterli kanıt veriyordu — ve TABAN'dan düştü. Kalan dokuzda o
   kanıt yok.

   Kalan dokuz ad, lokalde yazılıp commit edilmemiş planlardır (PROTOKOL §10.1:
   "lokal oturum diski görür, uzak oturum repoyu"). İçerikleri repodan
   görünmez ve §6.10 gereği UYDURULAMAZ — yeniden yazılmaları kayıptan
   kurtarma işidir, bu kapının işi değil. Borcun kendisi ve neden ödenemediği
   `.claude/plans/README.md`'de kayıtlıdır. */
const TABAN = new Set([
  'plan:bundle-diyet.md',
  'plan:duygu-motoru.md',
  'plan:gorunmeyen-doksan-bes.md',
  'plan:ihtimalsel-dil-devrimi.md',
  'plan:mod-sistemi.md',
  'plan:persona-ic-calisma.md',
  'plan:sosyal-kapilar.md',
  'plan:tasarim-anayasa-kapisi.md',
  'plan:tum-diller-native-2.md',

  /* ─── 2026-09-05 · hafıza devri · 58 ad ───
     Bu adlar `49739ef` ile geldi: hafızanın git takipli türevi
     (`.claude/hafiza/`, 195 dosya) repoya taşındı ve beraberinde kendi
     `[[bağ]]`larını getirdi. BORÇ BÜYÜMEDİ — GÖRÜNÜRLÜĞÜ büyüdü: bu
     planlar repoda dün de yoktu, yalnız onlara işaret eden bir dosya
     yoktu. Kaynakların tamamı bu turda gelendir (58 hafıza dosyası +
     TASINABILIR-ZEMIN.md); repo'nun eski bir köşesinden tek bir
     gönderme bile yok — ölçüldü.
     Sınıfı yukarıdaki dokuzla AYNI: lokalde yazılmış, commit edilmemiş
     planlar (§10.1). İçerikleri repodan görünmez ve §6.10 gereği
     UYDURULAMAZ; yeniden kurulmaları kayıptan kurtarma işidir.
     DÜRÜST UYARI: taban 9'dan 67'ye çıktı. Bu bir tolerans değil bir
     BORÇ kaydıdır — ödeme yolu planları repoya taşımaktır, listeyi
     büyütmeye devam etmek değil. Küçülmeyen taban perdedir (yukarı). */
  'hafiza:bagli-hafiza',
  'hafiza:gecis-karti-mezun-kapisi',
  'hafiza:karar-pwa-korunur',
  'hafiza:llm-bosluk-analizi-plani',
  'hafiza:olu-kod-pano-temizligi',
  'hafiza:olu-kod-temizligi-2026-06-15',
  'hafiza:onboarding-yol-ayini',
  'hafiza:taniyan-ayna-kisilestirme-3',
  'hafiza:taniyan-ayna-kisisellestirme-3',
  'hafiza:tum-diller-native-2',
  'plan:acilis-tek-dalga.md',
  'plan:benlik-kusursuzluk.md',
  'plan:boot-nabzi.md',
  'plan:cosmic-prancing-spring.md',
  'plan:dazzling-baking-willow.md',
  'plan:delightful-beaming-riddle.md',
  'plan:derin-calisma-denetim.md',
  'plan:derin-calisma.md',
  'plan:donusum-aynasi-2.md',
  'plan:dorduncu-usta-hearthstone.md',
  'plan:duyar-anlar-hatirlar.md',
  'plan:eager-sniffing-treasure.md',
  'plan:federated-hatching-graham.md',
  'plan:fuzzy-rolling-tarjan.md',
  'plan:gecis-ekrani-toplanma.md',
  'plan:gecis-motoru.md',
  'plan:gecmis-oturum-envanteri.md',
  'plan:gozlemevi-kullanim-nabzi.md',
  'plan:ic-calisma-07-kimlik-ucgeni-rev2.md',
  'plan:ikon-buton-dili.md',
  'plan:kanit-bekleyen-alanlar.md',
  'plan:karsilasma-tam-ekran-kartlar.md',
  'plan:kart-buyuk-boy-detay.md',
  'plan:kisisel-baslaticilar-ve-gunun-alintisi.md',
  'plan:kisisellestirme-ic-calisma.md',
  'plan:kisisellestirme-kusursuzluk.md',
  'plan:kusursuzluk-sprinti.md',
  'plan:mesafe-motoru.md',
  'plan:mesajin-arkasindaki-kart.md',
  'plan:olunan-ve-niyet-alinan.md',
  'plan:olus-muhru-2-muhur-basimi.md',
  'plan:olus-muhru.md',
  'plan:olus-sinamasi-esik-tasarimi.md',
  'plan:onboarding-ic-calisma.md',
  'plan:seytanla-savas-nur-alfabesi.md',
  'plan:sharded-jingling-candle.md',
  'plan:soft-forging-river.md',
  'plan:sohbet-cekirdegi-ic-calisma.md',
  'plan:soz-ihtiyac-motoru.md',
  'plan:starry-foraging-wave.md',
  'plan:studio-tek-sayfa.md',
  'plan:synchronous-baking-hearth.md',
  'plan:tanima-motoru.md',
  'plan:tek-deste-iki-kutup.md',
  'plan:tum-diller-native.md',
  'plan:uc-usta-tek-deste.md',
  'plan:velvety-prancing-giraffe.md',
  'plan:yasayan-kart-motoru.md',
]);

/* ─── 3. ANA KAPI ─── */

describe('referans bütünlüğü kapısı — repo iç referansları hedefsiz kalmıyor', () => {
  it('TABAN dışında kırık referans yok (büyümek yasak, küçülmek serbest)', () => {
    const bulgular = tara(ROOT);
    const mevcutAnahtarlar = new Set(bulgular.map(anahtar));
    const yeni = [...mevcutAnahtarlar].filter((k) => !TABAN.has(k));

    if (yeni.length) {
      const detay = yeni
        .map((k) => {
          const yerler = bulgular.filter((b) => anahtar(b) === k).map((b) => b.dosya);
          return `  ${k}\n${[...new Set(yerler)].map((y) => `      ${y}`).join('\n')}`;
        })
        .join('\n');
      throw new Error(
        `${yeni.length} YENİ kırık referans (TABAN'da yok):\n${detay}\n\n` +
        `Hedef dosyayı yarat, ya da referansı düzelt/sil. Gerçekten kalıcı ` +
        `bir borçsa TABAN listesine ekle ve gerekçesini yaz.`
      );
    }
    expect(yeni).toEqual([]);
  });

  it('TABAN\'daki her ad gerçekten tanınan bir tip taşıyor (yazım hatasına karşı)', () => {
    // Taban büyüyemez ama yanlış yazılmış bir anahtar da (`hafza:...` gibi)
    // sessizce hiçbir şeyi karşılamaz ve kapıyı gevşetir — biçim burada sınanır.
    for (const k of TABAN) {
      expect(k).toMatch(/^(hafiza|plan|agent):[A-Za-z0-9_-]+(\.md)?$/);
    }
  });
});

/* ─── 4. KAPININ KENDİSİ ─── */

describe('referans bütünlüğü kapısı — kapının kendisi çalışıyor', () => {
  /* Bu blok örnek "kırık" referanslar üretir ve geçici bir fixture ağacına
     yazar. Metni bu dosyanın İÇİNDE bitişik köşeli çift parantez / plan
     yolu olarak YAZMAK yasaktır: bu dosya da `tests` altı taramaya dahil
     olduğu için üstteki ana kapı testi kendi örneklerini gerçek kırık
     referans sanıp kendini kırardı. Parçalar bu yüzden runtime'da
     birleştirilir. */
  const AC = String.fromCharCode(91, 91); // '[['
  const KA = String.fromCharCode(93, 93); // ']]'
  const PLAN_ON = '.claude/' + 'plans/';
  const AGENT_ON = '.claude/' + 'agents/';

  function fixtureKur() {
    const dizin = mkdtempSync(join(tmpdir(), 'referans-kapi-'));
    mkdirSync(join(dizin, '.claude/memories'), { recursive: true });
    mkdirSync(join(dizin, '.claude/plans'), { recursive: true });
    mkdirSync(join(dizin, '.claude/agents'), { recursive: true });
    mkdirSync(join(dizin, 'js/parts'), { recursive: true });

    // Gerçekten var olan hedef — bağ kurulmalı, ihlal SAYILMAMALI.
    writeFileSync(join(dizin, '.claude/memories/var-olan-hafiza.md'), '# var\n');

    const gecerliBag = `${AC}var-olan-hafiza${KA}`;
    const kirikBag = `${AC}zz-sinav-yok-boyle-hafiza${KA}`;
    const sablonBag = `${AC}name${KA}`; // §7 format örneği — MUAF
    const sablonAdBag = `${AC}ad${KA}`; // FAZ 7d — "kırık `[[ad]]` bağı" gibi biçim tarifleri — MUAF
    const kirikPlan = `${PLAN_ON}zz-sinav-yok-boyle-plan.md`;
    const kirikAgent = `${AGENT_ON}zz-sinav-yok-boyle-agent.md`;
    const acikliOrnek = `${PLAN_ON}<slug>.md`; // şablon örneği — açı parantez yüzünden zaten dışlanır

    writeFileSync(
      join(dizin, 'js/parts/ornek.js'),
      [
        `// gerçek bağ: ${gecerliBag}`,
        `// kırık bağ: ${kirikBag}`,
        `// şablon: ${sablonBag}`,
        `// şablon ad: ${sablonAdBag}`,
        `// kırık plan: ${kirikPlan}`,
        `// kırık agent: ${kirikAgent}`,
        `// şablon plan: ${acikliOrnek}`,
        'export const x = 1;',
        '',
      ].join('\n')
    );

    return dizin;
  }

  it('gerçek kırık hafıza/plan/agent referanslarını yakalar', () => {
    const dizin = fixtureKur();
    try {
      const bulgular = tara(dizin);
      const anahtarlar = new Set(bulgular.map(anahtar));
      expect(anahtarlar.has('hafiza:zz-sinav-yok-boyle-hafiza')).toBe(true);
      expect(anahtarlar.has('plan:zz-sinav-yok-boyle-plan.md')).toBe(true);
      expect(anahtarlar.has('agent:zz-sinav-yok-boyle-agent.md')).toBe(true);
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });

  it('var olan hedefi ve şablon örneklerini ihlal SAYMAZ', () => {
    const dizin = fixtureKur();
    try {
      const bulgular = tara(dizin);
      const anahtarlar = new Set(bulgular.map(anahtar));
      expect(anahtarlar.has('hafiza:var-olan-hafiza')).toBe(false); // gerçek hedef var
      expect(anahtarlar.has('hafiza:name')).toBe(false); // §7 şablon placeholder'ı
      expect(anahtarlar.has('hafiza:ad')).toBe(false); // FAZ 7d — `name`in Türkçe karşılığı, biçim tarifi
      // açı-parantezli `<slug>.md` örneği karakter sınıfına hiç uymaz — hiçbir
      // `plan:` anahtarı üretmemeli (üretseydi regex'in kendisi bozuk demektir).
      expect([...anahtarlar].some((k) => k.startsWith('plan:') && k.includes('<'))).toBe(false);
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });

  it('REFERANS-MUAF gerekçeliyse susturur, beyansız/gerekçesiz susturmaz', () => {
    // Kendi fixture'ı: üsttekiyle karışmasın, üç hâl aynı dosyada yan yana
    // dursun — beyanlı+gerekçeli, beyansız, beyanlı+gerekçesiz. Aralarına
    // MUAF_PENCERE'den (6 satır) daha kalın dolgu konur — yoksa birinci
    // hâlin gerçek beyanı, penceresi içine düşen ikinci hâli de susturur.
    const dizin = mkdtempSync(join(tmpdir(), 'referans-muaf-'));
    try {
      mkdirSync(join(dizin, 'js/parts'), { recursive: true });
      const muafliBag = `${AC}zz-sinav-muafiyetli${KA}`;
      const muafsizBag = `${AC}zz-sinav-muafsiz${KA}`;
      const bosGerekceBag = `${AC}zz-sinav-bos-gerekce${KA}`;
      const dolgu = (n) => `// dolgu ${n} — pencereyi aşmak için`;
      writeFileSync(
        join(dizin, 'js/parts/muafiyet.js'),
        [
          `// beyanlı, gerekçeli: ${muafliBag} /* REFERANS-MUAF: bilinçli örnek, hedef kasıtlı yok */`,
          ...Array.from({ length: 8 }, (_, n) => dolgu(n + 1)),
          `// beyansız: ${muafsizBag}`,
          ...Array.from({ length: 8 }, (_, n) => dolgu(n + 9)),
          `// beyanlı ama gerekçesiz: ${bosGerekceBag} /* REFERANS-MUAF: */`,
          'export const y = 1;',
          '',
        ].join('\n')
      );

      const bulgular = tara(dizin);
      const anahtarlar = new Set(bulgular.map(anahtar));

      expect(anahtarlar.has('hafiza:zz-sinav-muafiyetli')).toBe(false); // gerekçeli beyan susturdu
      expect(anahtarlar.has('hafiza:zz-sinav-muafsiz')).toBe(true); // beyansız hâlâ yakalanıyor
      expect(anahtarlar.has('hafiza:zz-sinav-bos-gerekce')).toBe(true); // gerekçesiz beyan muafiyet SAYILMADI
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });

  it('boş/olmayan dizinde sessizce boş sonuç döner (repoDosyalari savunmacı)', () => {
    const dizin = mkdtempSync(join(tmpdir(), 'referans-bos-'));
    try {
      expect(tara(dizin)).toEqual([]);
      expect(tara(join(dizin, 'hic-yok'))).toEqual([]);
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });
});
