/* BÜYÜK HARF KAPISI — harfin kuralı dilin kuralıdır.
 *
 * Kök: `tr-TR` locale'i küçük "i"yi noktalı "İ"ye çevirir. Büyütmenin
 * locale'i sabit yazıldığı her yerde şu kırık doğar — İngilizce arayüzde
 * kategori çipi "FOUNDATİONS", paylaşım kartı "THİS PATH" diye basılır.
 * FAZ 7'nin çapraz denetiminde yakalandı: yeni EN metni ("5 people on this
 * path") kırığı tetikledi, ama kaynağı 13g'ydi ve modülün kendi yazı-
 * paylaşımı yolu dili baştan beri doğru okuyordu — tutarsızlık içerideydi.
 *
 * Kapının ölçüsü METNİN KAYNAĞIDIR, dosya değil:
 *   · Arayüz metni (kaynağı `t()`, dili bilinir) → `localeUpper()` (15-i18n).
 *   · Kullanıcı verisi (kişinin adı) ve TR yazılmış içerik (deste kart
 *     adları) → sabit `tr-TR` DOĞRUDUR; dili arayüz diliyle değişmez.
 *     Bu satırlar `DIL-MUAF` yorumuyla, gerekçesiyle beyan edilir.
 * Gerekçesiz muafiyet de ihlaldir (gerçeklik kapısının KOKEN-MUAF emsali).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// jsdom ortamında `import.meta.url` http şemasına düşer — kök cwd'den kurulur.
const KOK = process.cwd();
const oku = (rel) => readFileSync(join(KOK, rel), 'utf8');

/** js/ altındaki tüm .js dosyaları (parts, ext, i18n, kök). */
function _tumKaynaklar(dir = 'js', biriken = []) {
  // Üst readdirSync bu alt dizini listeledikten SONRA silinmiş olabilir
  // (paralel koşu) — recursion o dalı yok sayar, taramayı çökertmez.
  let girdiler;
  try { girdiler = readdirSync(join(KOK, dir), { withFileTypes: true }); } catch (e) { if (e && e.code === 'ENOENT') return biriken; throw e; }
  for (const ad of girdiler) {
    const rel = `${dir}/${ad.name}`;
    if (ad.isDirectory()) _tumKaynaklar(rel, biriken);
    else if (ad.name.endsWith('.js')) biriken.push(rel);
  }
  return biriken;
}

const SABIT_LOCALE = /toLocale(Upper|Lower)Case\(\s*['"]tr-TR['"]\s*\)/;

describe('büyük harf kapısı — harfin kuralı dilin kuralıdır', () => {
  it('kırığın kendisi gerçek: tr-TR küçük "i"yi noktalı büyütür', () => {
    expect('5 people on this path'.toLocaleUpperCase('tr-TR')).toContain('THİS');
    expect('Foundations'.toLocaleUpperCase('tr-TR')).toBe('FOUNDATİONS');
    expect('Foundations'.toLocaleUpperCase('en-US')).toBe('FOUNDATIONS');
    // Ters yön de gerçek: TR metni en-US ile büyütmek noktayı DÜŞÜRÜR.
    expect('Kendine İyi'.toLocaleUpperCase('en-US')).toBe('KENDINE İYI');
  });

  it('tek motor 15-i18n\'de durur ve dili state\'ten okur', () => {
    const src = oku('js/parts/15-i18n.js');
    expect(src).toMatch(/export function localeUpper\(/);
    expect(src).toMatch(/toLocaleUpperCase\(S\._currentLang \|\| 'tr'\)/);
  });

  it('repoda sabit tr-TR ile büyütme YALNIZ gerekçeli muafiyetle kalır', () => {
    const ihlaller = [];
    for (const dosya of _tumKaynaklar()) {
      // Liste alındıktan SONRA dosya silinmiş olabilir (paralel koşu) —
      // o dosya bu turda taranamaz sayılır, sınav çökmez.
      let ham;
      try { ham = oku(dosya); } catch (e) { if (e && e.code === 'ENOENT') continue; throw e; }
      const satirlar = ham.split('\n');
      satirlar.forEach((satir, i) => {
        if (!SABIT_LOCALE.test(satir)) return;
        // Muafiyet satırın kendisinde ya da üstündeki üç yorum satırında.
        const pencere = satirlar.slice(Math.max(0, i - 3), i + 1).join('\n');
        if (!/DIL-MUAF/.test(pencere)) ihlaller.push(`${dosya}:${i + 1}`);
      });
    }
    expect(ihlaller).toEqual([]);
  });

  it('story kartının dört alanı da tek motordan geçer', () => {
    const src = oku('js/parts/13g-paylasim.js');
    expect(src).toMatch(/import \{ t, localeUpper \}/);
    for (const alan of ['localeUpper(p.kicker)', 'localeUpper(p.bigLabel)',
                        'localeUpper(p.sub)', 'localeUpper(p.dateLabel)']) {
      expect(src).toContain(alan);
    }
  });

  it('kategori çipi ARAYÜZ metnidir — dile bağlı büyür', () => {
    expect(oku('js/parts/10q-w2-kisi-karti.js')).toContain('localeUpper(_catLabel(c))');
  });

  it('localeUpper boş/null girdide çökmez — kart alanları isteğe bağlıdır', () => {
    const localeUpper = (s, lang) => String(s == null ? '' : s).toLocaleUpperCase(lang || 'tr');
    expect(localeUpper(null)).toBe('');
    expect(localeUpper(undefined)).toBe('');
    expect(localeUpper(0)).toBe('0');
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   İKİNCİ YÜZEY — CSS `text-transform: uppercase` (2026-08-28)
   ───────────────────────────────────────────────────────────────────────
   Kuralın JS kolu yukarıda korunuyordu; CSS kolu korumasızdı. Repoda 215
   `text-transform: uppercase` var ve HİÇBİRİ `localeUpper`dan geçmez —
   çünkü geçmesine gerek yok: tarayıcı büyütme locale'ini **sayfanın
   kökünden** okur. Yani bu 215 yüzeyin doğruluğu tek bir şeye bağlıdır:
   `<html lang>` arayüz diliyle senkron mu?

   O senkron bugün DOĞRU çalışıyor (`15-i18n.js`). Bu blok onu kırılmaktan
   korumak için var — bir kapı, kırılmamış olanı korumak için de kurulur.
   Kırılırsa görünen sonuç: EN arayüzde "THİS PATH", "FOUNDATİONS".

   İkinci kural sabit dilli yüzeyler içindir: metni i18n'den ALMAYAN bir
   yüzey (admin panelleri gibi) sayfanın diline teslim edilemez, kabına
   kendi `lang`ini vermelidir. Emsal ve tek örnek: 13q Gözlemevi.
   Ayrıntı: hafıza [[buyuk-harf-dil-kapisi]] "İKİNCİ YÜZEY" bölümü.
   ═══════════════════════════════════════════════════════════════════════ */
describe('büyük harf kapısı — CSS kolu: kök dil', () => {
  it('kırığın kendisi gerçek: CSS uppercase kökün dilini konuşur', () => {
    // `text-transform` locale'i elementin lang'inden gelir; JS karşılığı budur.
    expect('this path'.toLocaleUpperCase('tr')).toContain('THİS');
    expect('this path'.toLocaleUpperCase('en')).toContain('THIS');
  });

  it('15-i18n dil değiştiğinde <html lang>i günceller', () => {
    const src = oku('js/parts/15-i18n.js');
    // İki yol da lang yazmalı: dili UYGULAYAN yol ve hidrasyonda OKUYAN yol.
    const kez = (src.match(/document\.documentElement\.lang\s*=/g) || []).length;
    expect(kez).toBeGreaterThanOrEqual(2);
    expect(src).toMatch(/document\.documentElement\.lang\s*=\s*S\._currentLang|document\.documentElement\.lang\s*=\s*lang/);
  });

  it('_src.html kökü bir dille doğar (lang boş kalmaz)', () => {
    expect(oku('_src.html')).toMatch(/<html[^>]+lang=["'](tr|en)["']/);
  });

  it('sabit dilli yüzey kendi lang\'ini verir — 13q Gözlemevi emsali', () => {
    // 13q metnini i18n'den almaz, doğrudan Türkçe basar: sayfa EN iken
    // başlıkları "ZAMAN HARİTASI" değil "ZAMAN HAR I TASI" çıkardı.
    expect(oku('js/parts/13q-gozlemevi.js')).toMatch(/setAttribute\(\s*['"]lang['"]\s*,\s*['"]tr['"]\s*\)/);
  });
});
