/**
 * BÜYÜK-İ TUZAĞI KAPISI — `dp`/`dpAll` tüketicilerinin tamamı
 * (plan: .claude/plans/ic-calisma-kalan-fazlar.md, FAZ 2c)
 *
 * JS'in `/i` bayrağı Türkçenin noktalı İ'sini (U+0130) küçük i'ye
 * KATLAMAZ — desenler küçük harfle yazılı olduğu için, cümlesine büyük İ
 * ile başlayan bir Türkçe kullanıcı hiçbir `^i` deseniyle eşleşmiyordu.
 * FAZ 2, kriz yolunu (`detectCrisis`/`detectCrisisSoft`) kapattı; çapraz
 * denetim (Sonnet, 2026-09-04) aynı tuzağın on iki başka `detect.*`
 * anahtarında da açık olduğunu canlı regex koşularıyla gösterdi. Bu faz
 * kök çözümü TEK NOKTAYA taşıdı (`dpTest`/`dpAllTest`, 16-i18n-prompts.js)
 * ve tüm çağrı yerlerini oraya geçirdi (§1.3 — ikinci bir normalize
 * kopyası yazılmadı).
 *
 * İki kapı burada durur:
 *   1. SÖZLÜKTEN TÜREYEN kapsam — `DETECT_I18N.tr`'deki büyük-İ'ye açık
 *      HER desen taranır (liste elle yazılmaz — yeni bir desen eklendiğinde
 *      kapı kendiliğinden büyür, §3.3'ün "liste değil desen" dersi).
 *   2. HAM `.test()` TABANI — js/ altında `dp(`/`dpAll(` sonucunu
 *      doğrudan `.test(` ile kullanan satır SIFIR olmalı. `16-i18n-prompts.js`
 *      İSTİSNA: `dpTest`/`dpAllTest`'in KENDİ gövdesi tam bu şekli taşır —
 *      tek kaynak motor orada durur, kapı kendi tanımını ihlal saymaz.
 *
 * Üçüncü blok kapının KENDİSİNİ sınar (§10.5): normalize devre dışıyken
 * (ham `dp()` + `.test()`) yakalamanın gerçekten BAŞARISIZ olduğunu, ham
 * `.test()` taramasının hem gerçek ihlali yakaladığını hem de `dpTest`
 * üzerinden geçen satırı ihlal SAYMADIĞINI gösterir.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { S } from '../js/state.js';
import { dp, dpTest, dpAllTest, dpNormalizeKonum } from '../js/parts/16-i18n-prompts.js';
import { dgNabiz } from '../js/parts/13D-duygu-motoru.js';
import { DETECT_I18N } from '../js/parts/16c-i18n-detect-dict.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// dp()/dpTest() aktif dile bakar; TR bloğunu doğrudan sınadığımız için
// zincirin varsayılana (tr) düşmesine güvenmek yerine açıkça sabitliyoruz.
S._currentLang = 'tr';

/* ─── 1. SÖZLÜKTEN TÜREYEN KAPSAM ───────────────────────────────────── */

/** DETECT_I18N değerini (bare RegExp | RegExp[] | {pattern,extract}[]) düz
 *  bir RegExp dizisine indirger — `detect.commitment` gibi obje-taşıyan
 *  anahtarlarda `.pattern`i açar, tanımadığı biçimi sessizce atlar. */
function _regexlerden(deger) {
  if (!deger) return [];
  const dizi = Array.isArray(deger) ? deger : [deger];
  return dizi
    .map((v) => (v instanceof RegExp ? v : (v && v.pattern instanceof RegExp ? v.pattern : null)))
    .filter(Boolean);
}

/** Desenin kaynağı (varsa baştaki `^` çıkarıldıktan sonra) küçük 'i' ile
 *  başlıyorsa, büyük-İ tuzağına AÇIKTIR — literal kelime önekini döndürür
 *  (ilk regex metakarakterinde durur). Açık değilse null. */
function _literalOnek(kaynak) {
  const govde = kaynak.replace(/^\^/, '');
  if (govde[0] !== 'i') return null;
  const m = govde.match(/^[^.*+?()[\]{}|\\$^]+/);
  return m ? m[0] : null;
}

/** `DETECT_I18N.tr`'nin TAMAMINI tarar; her büyük-İ'ye açık desen için
 *  {anahtar, buyukIli} çifti üretir — liste ELLE yazılmaz, sözlükten türer.
 *
 *  Süzgeç: `onek` yalnız desenin İLK metakaraktere kadarki kısmıdır — bir
 *  desen `/ilaç.*fazla al/i` gibi ardından ZORUNLU bir devam istiyorsa
 *  ("fazla al"), tek başına "İlaç" o deseni tamamlamaz ve büyük-İ'ye
 *  açıklığı yanlış ölçerdi. `re.test(onek)` küçük harfli hâliyle önce
 *  DOĞRULANIR — yalnız önekin TEK BAŞINA zaten deseni tamamladığı
 *  (düz kelime ya da alternatif dalın ilk seçeneği gibi) durumlar
 *  otomatik türetilir; devamı zorunlu olan bileşik desenler (ör.
 *  `detect.crisis`'in "ilaç…fazla al" satırı) bu otomatik listenin DIŞINDA
 *  kalır — o örnek zaten `tests/kriz-eval.test.js`'te elle sınanıyor. */
function _buyukICiftleri() {
  const ciftler = [];
  for (const [anahtar, deger] of Object.entries(DETECT_I18N.tr)) {
    for (const re of _regexlerden(deger)) {
      const onek = _literalOnek(re.source);
      if (!onek) continue;
      if (!re.test(onek)) continue; // yalnız TEK BAŞINA yeterli önekler
      ciftler.push({ anahtar, buyukIli: 'İ' + onek.slice(1) });
    }
  }
  return ciftler;
}

describe('büyük-İ tuzağı kapısı — sözlükten türeyen kapsam (TR bloğu)', () => {
  const ciftler = _buyukICiftleri();

  it('TR bloğunda en az bir büyük-İ\'ye açık desen var (kapı boş dönmüyor)', () => {
    expect(ciftler.length).toBeGreaterThan(0);
  });

  it.each(ciftler.map((c) => [c.anahtar, c.buyukIli]))(
    'dpTest(%j, %j) büyük-İ\'li karşılığı yakalıyor',
    (anahtar, buyukIli) => {
      expect(dpTest(anahtar, buyukIli)).toBe(true);
    },
  );

  it('dpAllTest de aynı desenleri yakalıyor (dil-bağımsız zincir üzerinden)', () => {
    // dpAll TR dahil TÜM dillerin birleşimini tarar — TR'nin kendi deseni
    // zaten normalize edilmiş metinle eşleşmeli, öteki dillerin varlığı
    // bunu BOZMAMALI.
    for (const { anahtar, buyukIli } of ciftler) {
      expect(dpAllTest(anahtar, buyukIli)).toBe(true);
    }
  });
});

/* ─── 2. HAM .test() TABANI ──────────────────────────────────────────── */

// dpTest/dpAllTest'in KENDİ gövdesi tam bu şekli taşır (dp(key).some(r =>
// r.test(t))) — tek kaynak motor orada durur (§1.3). Kapı kendi tanımını
// ihlal saymasın diye bu dosya taranmaz.
const HARIC_DOSYA = new Set(['16-i18n-prompts.js']);

function _jsDosyalari(dizin) {
  const out = [];
  let girdiler;
  try { girdiler = readdirSync(dizin); } catch (_) { return out; }
  for (const ad of girdiler) {
    const tam = join(dizin, ad);
    let st;
    try { st = statSync(tam); } catch (_) { continue; }
    if (st.isDirectory()) out.push(..._jsDosyalari(tam));
    else if (ad.endsWith('.js') && !HARIC_DOSYA.has(ad)) out.push(tam);
  }
  return out;
}

/** Bir satırda `dp(`/`dpAll(` çağrısının DENGELİ kapanışından SONRA aynı
 *  satırda `.test(` var mı — varsa sonuç normalize'den GEÇMEDEN test
 *  edilmiş demektir (`.some(r => r.test(...))` kalıbı). Basit derinlik
 *  sayacı: bu dosyalarda çağrılar tek satırda ve düz metin/şablon
 *  literaldir, çok satırlı/iç içe parantez biçimi görülmedi. */
function _hamTestSatirlari(kaynak) {
  const sonuc = [];
  kaynak.split('\n').forEach((satir, i) => {
    const cagriRe = /\bdp(?:All)?\(/g;
    let m;
    while ((m = cagriRe.exec(satir))) {
      let j = cagriRe.lastIndex;
      let derinlik = 1;
      while (j < satir.length && derinlik > 0) {
        if (satir[j] === '(') derinlik++;
        else if (satir[j] === ')') derinlik--;
        j++;
      }
      if (derinlik !== 0) continue; // satır kesilmiş — bu kalıpta görülmedi, atla
      if (/\.\s*test\s*\(/.test(satir.slice(j))) {
        sonuc.push({ satirNo: i + 1, satir: satir.trim() });
      }
    }
  });
  return sonuc;
}

describe('büyük-İ tuzağı kapısı — ham .test() tabanı (sıfır olmalı)', () => {
  it('js/ altında dp(/dpAll( sonucu doğrudan .test( ile kullanılmıyor (16-i18n-prompts.js hariç)', () => {
    const dosyalar = _jsDosyalari(join(ROOT, 'js'));
    const ihlaller = [];
    for (const dosya of dosyalar) {
      const kaynak = readFileSync(dosya, 'utf8');
      for (const h of _hamTestSatirlari(kaynak)) {
        ihlaller.push(`${relative(ROOT, dosya)}:${h.satirNo}  ${h.satir}`);
      }
    }
    if (ihlaller.length) {
      throw new Error(
        `${ihlaller.length} satır dp()/dpAll() sonucunu büyük-İ normalize'i OLMADAN .test() ediyor:\n` +
        ihlaller.join('\n') +
        '\n\ndpTest(key, text) / dpAllTest(key, text) kullan (16-i18n-prompts.js).'
      );
    }
    expect(ihlaller).toEqual([]);
  });
});

/* ─── 2b. KONUM-DUYARLI TÜKETİCİLER — DAVRANIŞSAL KAPI (FAZ 2d) ────────
   Yukarıdaki tarayıcı SATIR bazlıdır ve yalnız `.test(` arar. Deseni önce
   bir değişkene alıp sonra `.exec(`/`.match(` çağıran tüketiciler (13D
   `_adaylariBul`, 00-config `captureCommitments`) o taramaya TAKILMAZ —
   ve onlar kaynak taramasıyla güvenilir biçimde yakalanamaz, çünkü bağ
   değişken üzerinden kurulur. Bu yüzden kapı burada kaynağa değil
   DAVRANIŞA bakar: motorun kendisine büyük İ ile başlayan bir cümle
   verilir ve tanıdığı kanıtlanır (§3.5 — asıl kırıklar davranışsaldır). */
describe('büyük-İ tuzağı kapısı — konum-duyarlı tüketiciler (davranışsal)', () => {
  /* Cümleler BİLEREK tek desenlidir: "İçim rahat, yük kalktı" yazsaydık
     eşleşme /yük kalktı/ üstünden gelir ve İ'yi hiç sınamazdık — kapı
     yeşil yanar, kırık durur. Sınav, sınadığını sınamalıdır. */
  it('duygu motoru yalnız İ-baş desenle eşleşen cümleyi tanıyor — huzur', () => {
    const n = dgNabiz('İçim rahat.');
    expect(n && n.adaylar[0] && n.adaylar[0].aile).toBe('huzur');
  });

  it('duygu motoru yalnız İ-baş desenle eşleşen cümleyi tanıyor — umut', () => {
    const n = dgNabiz('İnancım var.');
    expect(n && n.adaylar[0] && n.adaylar[0].aile).toBe('umut');
  });

  it('kanıt alıntısı ORİJİNAL cümleden kesiliyor — normalize edilmiş hâlinden değil', () => {
    // §6.10: uygulama kullanıcı hakkında bir şey söylüyorsa kaynağı
    // kullanıcı olmak zorundadır. Normalize bir EŞLEŞTİRME aracıdır;
    // kullanıcıya geri gösterilen metin onun yazdığı metindir.
    const n = dgNabiz('İçim rahat.');
    expect(n.adaylar[0].kanit).toContain('İçim');
    expect(n.adaylar[0].kanit).not.toContain('içim');
  });

  it('konum koruyan normalize gerçekten uzunluk koruyor', () => {
    // Kanıtın indeksle kesilebilmesinin tek şartı budur.
    const ornekler = ['İçim rahat', 'İnancım var', 'İlk kez', 'iyiyim'];
    for (const o of ornekler) expect(dpNormalizeKonum(o).length).toBe(o.length);
  });
});

/* ─── 3. KAPININ KENDİSİ (§10.5) ──────────────────────────────────────── */

describe('büyük-İ tuzağı kapısı — kapının kendisi çalışıyor', () => {
  it('ham .test() tarayıcısı gerçek ihlali yakalıyor', () => {
    const ornek = "  if (dp('detect.x').some(r => r.test(text))) return true;";
    expect(_hamTestSatirlari(ornek)).toHaveLength(1);
  });

  it('ham .test() tarayıcısı dpAll( çağrısını da yakalıyor', () => {
    const ornek = "  return dpAll('detect.crisis').some(r => r.test(t));";
    expect(_hamTestSatirlari(ornek)).toHaveLength(1);
  });

  it('dpTest/dpAllTest üzerinden geçen satırlar ihlal SAYILMAZ', () => {
    const ornek = "  if (dpTest('detect.x', text)) return true;\n  return dpAllTest('detect.y', text);";
    expect(_hamTestSatirlari(ornek)).toHaveLength(0);
  });

  it('normalize devre dışıyken (ham dp + .test) büyük-İ yakalanamıyor — düzeltmenin gerekliliğini kanıtlar', () => {
    // dpTest'in İÇİNDE ne olduğuna bakmadan, aynı ham kalıbı burada
    // birebir kurup normalize'siz sonucu ölçüyoruz: dp() zaten normalize
    // ETMEZ (bu onun sözleşmesi) — normalize dpTest'in kendi işidir.
    // Metin YALNIZ "İlk kez" — 'cesaret'/'konuştum' gibi aynı dizideki
    // BAŞKA (küçük harfli) bir kelimeyi taşımıyor, aksi hâlde ham .test()
    // o kelimeden dolayı yanlışlıkla true dönüp kapıyı yanıltırdı.
    const buyukIli = 'İlk kez.';
    const hamSonuc = dp('detect.progress').some((r) => r.test(buyukIli));
    expect(hamSonuc).toBe(false); // büyük-İ normalize'siz KAÇAR
    expect(dpTest('detect.progress', buyukIli)).toBe(true); // dpTest YAKALAR
  });
});
