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
 *   · köşeli çift parantezli hafıza adı → `.claude/memories/<ad>.md`
 *   · `.claude/plans/<slug>.md` yolu    → dosya var olmalı
 *   · `.claude/agents/<ad>.md` yolu     → dosya var olmalı
 * Taranan yerler: kök `*.md`, `.claude` altı `.md` (recursive), `js` altı
 * `.js` (recursive), `tests` altı `.js` (recursive), `scripts` altı `.mjs`
 * (recursive). Hariç: node_modules, dist, coverage, assets, android, ios.
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

/** Bir dizini uzantıya göre recursive toplar. Kalıp `scripts/audit-innerhtml.mjs`nin
 *  gez()'i ile aynıdır: readdirSync + ayrı statSync, ikisi de try/catch'li.
 *  [[kapi-tarama-yarisi]] — vitest paralel koşarken tasarim-kapisi testi T7
 *  için js/parts/ altına geçici bir modül yazıp siliyor; bu tarama js/ altını
 *  gezdiği için araya girebilir. Listelenmiş ama tarama anında silinmiş bir
 *  girdi repo'nun kalıcı parçası değildir — sessizce atlanır. */
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

/** Tek dosyayı tarar, kırık referansları `sonuc`a ekler. */
function taraDosya(dosya, kok, sonuc) {
  const src = oku(dosya);
  if (src === null) return;
  const rel = relative(kok, dosya);

  for (const m of src.matchAll(DESEN_HAFIZA)) {
    const ad = m[1];
    if (SABLON_ADLAR.has(ad)) continue;
    if (!existsSync(join(kok, '.claude/memories', `${ad}.md`))) {
      sonuc.push({ tip: 'hafiza', ad, dosya: rel });
    }
  }
  for (const m of src.matchAll(DESEN_PLAN)) {
    const ad = m[1];
    if (!existsSync(join(kok, '.claude/plans', ad))) {
      sonuc.push({ tip: 'plan', ad, dosya: rel });
    }
  }
  for (const m of src.matchAll(DESEN_AGENT)) {
    const ad = m[1];
    if (!existsSync(join(kok, '.claude/agents', ad))) {
      sonuc.push({ tip: 'agent', ad, dosya: rel });
    }
  }
}

/** Verilen kökten repo yapısını tarar, kırık referans listesini döndürür. */
function tara(kok) {
  const sonuc = [];
  for (const dosya of repoDosyalari(kok)) taraDosya(dosya, kok, sonuc);
  return sonuc;
}

function anahtar(b) { return `${b.tip}:${b.ad}`; }

/* ─── 2. TABAN — 2026-09-02 ölçümü, otuz üç ayrı ad ───
   Ölçüm yöntemi: `tara(ROOT)` bu tarih itibariyle 82 kırık referans örneği,
   36 ayrı ad buldu. Otuz üçü devraldığımız borç (bu turdan önce vardı),
   biri (`hafiza:bagsiz-ad-kapisi`) bu FAZ'ın kapattığı hedeftir — bilerek
   TABAN'da DEĞİL, testin kırmızı-yeşil geçişini kanıtlasın diye. */
const TABAN = new Set([
  'hafiza:ad-senkronu-kurali',
  'hafiza:belge-katmani-doc-primitifleri',
  'hafiza:boot-nabzi',
  'hafiza:buyuk-harf-dil-kapisi',
  'hafiza:guvenlik-emniyet-katmani',
  'hafiza:i18n-bundle-bolme',
  'hafiza:ihtimalsel-dil-devrimi',
  'hafiza:ilham-kartlari-sosyal-feed',
  'hafiza:kisi-kartlari',
  'hafiza:kisilerim-kart-motoru',
  'hafiza:kod-kapisi-ve-posta',
  'hafiza:llm-bicimleri-geri-sizar',
  'hafiza:odev-zinciri-ve-cipi',
  'hafiza:olunan-ve-niyet-alinan-karari',
  'hafiza:olus-muhru-2-muhru-sen-basarsin',
  'hafiza:safestorage-kuyruk-flush-kilidi',
  'hafiza:safestorage-testlerde-kvcache',
  'hafiza:sohbet-reasoning-fix',
  'hafiza:tanima-motoru',
  'hafiza:test-kirilganligi-jsdom-stil-isinmasi',
  'hafiza:tr-en-i18n-tamamlama',
  'hafiza:yerel-tarih-anahtari',
  'hafiza:yetim-kopru-denetcisi',
  'plan:bundle-diyet.md',
  'plan:duygu-motoru.md',
  'plan:gorunmeyen-doksan-bes.md',
  'plan:ic-calisma-08-uc-ses-rev2.md',
  'plan:ihtimalsel-dil-devrimi.md',
  'plan:mod-sistemi.md',
  'plan:persona-ic-calisma.md',
  'plan:sosyal-kapilar.md',
  'plan:tasarim-anayasa-kapisi.md',
  'plan:tum-diller-native-2.md',
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
