// @vitest-environment node
/**
 * ETİKET SIYIRMA KAPISI — "protokol blokları DAİMA sıyrılır" (oda 09 · Korunanlar)
 *
 * NEDEN BU KAPI VAR. FAZ 9'da `[KART]`/`[NISAN]` regex'leri tek kayda
 * toplandı — doğru hamle (§1.3). Ama ilk uygulama tüketicileri `13a`'ya
 * statik bağladı ve gerçek bir import döngüsü doğdu; döngüyü kırmak için
 * `window.aracEtiketCoz?.(…)` köprüsüne geçildi. Faz denetimi (parent ·
 * Opus) o çözümün sessiz bedelini buldu: köprü boşsa `_extractKartTag`
 * null döner, `_kartRe` undefined olur ve `[KART: …]` artığı EKRANDA KALIR.
 * Yani döngü kapanırken korunan bir sözleşme delinmişti — "daima", "13a
 * yüklendiyse"ye dönmüştü.
 *
 * Doğru kesme yeri saf yapraktı (`13a1-arac-etiketleri.js`, hiçbir şey
 * import etmez): tüketici onu statik alır, döngü doğmaz ve garanti çalışma
 * zamanına değil DERLEME zamanına bağlanır. Bu kapı o kararı tutar.
 *
 * ÖLÇTÜĞÜ ŞEY: sıyırma yolu `window`'a bağlı OLMAYACAK. Kaynak taraması
 * yeterlidir çünkü iddia yapısaldır (bir bağın türü), davranışsal değil.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const oku = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const TUKETICILER = ['js/parts/10B-ilham-karti.js', 'js/parts/12e-isik-nisanlari.js'];

describe('etiket sıyırma — çalışma zamanına DEĞİL derleme zamanına bağlı', () => {
  it.each(TUKETICILER)('%s yaprağı STATİK import ediyor', (dosya) => {
    const src = oku(dosya);
    expect(src).toMatch(/import\s*\{[^}]*etiketCoz[^}]*\}\s*from\s*'\.\/13a1-arac-etiketleri\.js'/);
  });

  it.each(TUKETICILER)('%s etiket çözümünü window üzerinden ALMIYOR', (dosya) => {
    const kod = oku(dosya).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(kod).not.toMatch(/window\.aracEtiket/);
  });

  it('yaprak gerçekten yaprak — hiçbir şey import etmiyor (döngü imkânsız)', () => {
    const kod = oku('js/parts/13a1-arac-etiketleri.js')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(kod).not.toMatch(/^\s*import\s/m);
  });

  it('kayıt TEK yerde — tüketicilerde ikiz regex yok (§1.3)', () => {
    for (const dosya of TUKETICILER) {
      const kod = oku(dosya).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(kod, `${dosya} kendi [KART]/[NISAN] regex'ini yeniden yazmış`)
        .not.toMatch(/\/\\\[(KART|NISAN)/);
    }
  });

  it('kapının kendisi çalışıyor — ihlali gerçekten yakalar (§10.5)', () => {
    const sahte = "const re = window.aracEtiketCoz?.('kart', t);";
    const kod = sahte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(kod).toMatch(/window\.aracEtiket/);          // ihlal görünür
    const temiz = "const hit = etiketCoz('kart', t);";
    expect(temiz).not.toMatch(/window\.aracEtiket/);    // doğru hâl geçer
  });
});
