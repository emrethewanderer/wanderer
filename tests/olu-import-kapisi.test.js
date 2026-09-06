// @vitest-environment node
// Dosya sistemiyle çalışır, DOM'a hiç dokunmaz — jsdom kurulumunu boşa ödemez.

/**
 * ÖLÜ IMPORT KAPISI — "içeri alınan ama hiç kullanılmayan ad" sınıfının bekçisi.
 *
 * NEDEN VAR. Bedel bundle DEĞİL: rollup ölü named import'u zaten tree-shake
 * eder. Bedel OKUMADIR ve ölçüldü — `13a-arac-motoru.js` `etiketCoz`'u import
 * ediyordu ve kullanmıyordu, yani dosyayı açan herkes "burada etiket
 * çözülüyor" sanıyordu; oysa o iş FAZ 9'da saf yaprağa (`13a1`) taşınmıştı.
 * Bir barrel dosyası `sb`'yi import edince okuyan "burada Supabase'e
 * gidiliyor" sanır. **Ölü import bir performans borcu değil, yanlış bir
 * haritadır** — ve yanlış harita, kapısı olmayan her borç gibi büyür.
 *
 * TABAN ÇİZGİSİ — bugünkü borç bilerek tolere edilir (emsal:
 * `tests/referans-butunlugu-kapisi.test.js` ve `scripts/ihtimalsel-taban.json`).
 * Kapı ARTIŞI yasaklar; azalma serbesttir ve her temizlik tabanı düşürür.
 * Tümü sıfırlandığında kapı kendiliğinden sert 0-tolerans kapısına döner.
 * Geriye dönük ihlal üretmek dürüst olmazdı: sınıf 2026-09-05'te adlandırıldı,
 * ondan önceki 121 satır o günün ağacında zaten duruyordu.
 *
 * ADI `*-kapisi` — bu KASITLIDIR. Sınıf repo GENELİDİR ve hiçbir modül önekiyle
 * bulunmaz; hedefli süit onu asla seçmez. `npm run kapi:genel` desenine
 * kendiliğinden girsin diye ad böyle konuldu (§3.3'ün XSS dersi: kapı kağıtta
 * vardı, hedefte yoktu ve dört CI koşusu üst üste kırmızı bastı).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BETIK = join(ROOT, 'scripts/olu-import-denetci.mjs');
const TABAN = JSON.parse(readFileSync(join(ROOT, 'scripts/olu-import-taban.json'), 'utf8'));

/** Betiği koştur — çıkış kodu ve çıktı birlikte döner (kapı ikisini de sınar). */
function kostur(args = [], kok = null) {
  const argv = kok ? [...args, '--dizin', kok] : args;
  try {
    return { kod: 0, cikti: execFileSync('node', [BETIK, ...argv], { encoding: 'utf8' }) };
  } catch (e) {
    return { kod: e.status ?? 1, cikti: (e.stdout || '') + (e.stderr || '') };
  }
}

describe('ölü import kapısı — borç büyüyemez', () => {
  it('bugünkü ağaç tabanı AŞMIYOR', () => {
    const { kod, cikti } = kostur();
    expect(kod, `ölü import artmış:\n${cikti}`).toBe(0);
  });

  it('TABAN SIFIR — kapı artık sert 0-toleranstadır (2026-09-06)', () => {
    /* Bu testin ÖNCEKİ hâli tabanın BOŞ OLMAMASINI şart koşuyordu
       ([[kapi-sessiz-gec]]: boş bir taban her ağacı geçirir). O şart borç
       döneminin doğru şartıydı; borç 2026-09-06'da sıfırlandı ve artık BOŞ
       TABAN doğru hâldir. Kapının koruduğu şey değişmedi, yalnız yer
       değiştirdi: "taban dolu olmalı" yerine "taban SIFIR olmalı" — ve bir
       borç geri dönerse `--taban-yaz` ile sessizce meşrulaştırılamaz, çünkü
       bu satır kırmızı yanar. */
    const satirlar = Object.entries(TABAN).filter(([k]) => !k.startsWith('_'));
    expect(satirlar, `ölü import borcu geri gelmiş: ${satirlar.map(([f, n]) => `${f}=${n}`).join(', ')}`)
      .toEqual([]);
  });

  it('AYRIŞTIRICI CANLI — "0 ölü import" gerçek bir 0, kırık bir tarayıcı DEĞİL', () => {
    /* Sıfır borç, kapıyı en tehlikeli hâline sokar: gerçek bir 0 ile HİÇ
       IMPORT BULAMAYAN kırık bir ayrıştırıcının çıktısı BİREBİR AYNIDIR
       ([[kapi-sessiz-gec]]). Ve bu bir varsayım değil: 2026-09-06'da tam
       bu oldu — `kodu()` yeniden yazılırken string sınırları da düşürüldü,
       `from 'x'` kalıbı bozuldu, tarayıcı hiçbir import göremedi ve kapı
       "0 ölü import" diye SAHTE BİR YEŞİL bastı.
       Bu yüzden sıfır, ayrıştırıcının ÇALIŞTIĞI kanıtlanmadan kabul
       edilmez: sentetik bir kökte canlı ve ölü bir import birlikte verilir,
       tarayıcının ikisini de DOĞRU ayırması beklenir. */
    const kok = mkdtempSync(join(tmpdir(), 'olu-import-'));
    try {
      writeFileSync(join(kok, 'x.js'),
        "import { canli, olu } from './y.js';\nexport const a = canli(1);\n");
      const { cikti } = kostur(['--liste'], kok);
      expect(cikti, 'ayrıştırıcı ölü importu göremiyor — tarayıcı kırık').toMatch(/\bolu\b/);
      expect(cikti, 'ayrıştırıcı canlı importu ölü sanıyor — yön yanlış').not.toMatch(/\bcanli\b/);
      expect(cikti).toMatch(/── 1 ölü import \/ 1 dosya/);
    } finally { rmSync(kok, { recursive: true, force: true }); }
  });

  it('STRING İÇİNDEKİ `/*` bir yorum AÇMAZ — bugünün yanlış pozitifi (2026-09-06)', () => {
    /* Ölçülen kırık: `kodu()` yorumları iki `replace` ile söküyordu ve
       `fi.accept = 'image/*'` satırındaki dizi sahte bir blok yorum AÇIP
       bir sonraki gerçek kapanışa kadar 1324 karakter GERÇEK KODU yuttu.
       Sonuç: `13c-gorsel-ekleme.js`'in CANLI `S` ve `sb` import'ları ölü
       raporlandı. Silinselerdi görsel yükleme sessizce ölürdü — yani kapının
       kendisi bir kırık üretecekti.
       Betiğin kör nokta defteri "canlı olanı ölü SANMAZ" diyordu; bu satır
       o cümleyi bir iddia olmaktan çıkarıp bir ölçüye çevirir. */
    const kok = mkdtempSync(join(tmpdir(), 'olu-import-'));
    try {
      writeFileSync(join(kok, 'x.js'),
        "import { S } from './state.js';\n" +
        "const fi = {};\n" +
        "fi.accept = 'image/*';\n" +
        "export const a = () => S.currentUser;\n");
      const { kod, cikti } = kostur([], kok);
      expect(kod, `string içindeki /* bir yorum açtı ve canlı import yutuldu:\n${cikti}`).toBe(0);
    } finally { rmSync(kok, { recursive: true, force: true }); }
  });

  it('ŞABLON İÇİNDEKİ kullanım sayılır — `${S.x}` bir kullanımdır', () => {
    /* İlk düzeltme denemesi string içeriğini tümüyle düşürüyordu; o hâlde
       şablon literallerindeki `${…}` GERÇEK KODU da silinir ve düzeltilen
       yanlış pozitif başka bir kapıdan geri gelirdi. */
    const kok = mkdtempSync(join(tmpdir(), 'olu-import-'));
    try {
      writeFileSync(join(kok, 'x.js'),
        "import { S } from './state.js';\nexport const p = `yol/${S.id}/son`;\n");
      const { kod } = kostur([], kok);
      expect(kod, 'şablon içindeki kullanım görülmedi').toBe(0);
    } finally { rmSync(kok, { recursive: true, force: true }); }
  });

  it('kapının kendisi çalışıyor — YENİ bir ölü import gerçekten kırmızı yakar (§10.5)', () => {
    const kok = mkdtempSync(join(tmpdir(), 'olu-import-'));
    try {
      // Tabansız bir kökte tek bir ölü import → izin 0 → exit 1.
      writeFileSync(join(kok, 'x.js'), "import { kullanilmayan } from './y.js';\nexport const a = 1;\n");
      const { kod, cikti } = kostur([], kok);
      expect(kod, 'ölü import eklendi ama kapı sessiz kaldı').toBe(1);
      expect(cikti).toMatch(/kullanilmayan/);
    } finally { rmSync(kok, { recursive: true, force: true }); }
  });

  it('kapı YANLIŞ POZİTİF üretmiyor — kullanılan import ihlal sayılmaz', () => {
    const kok = mkdtempSync(join(tmpdir(), 'olu-import-'));
    try {
      writeFileSync(join(kok, 'x.js'), "import { kullanilan } from './y.js';\nexport const a = kullanilan(1);\n");
      const { kod } = kostur([], kok);
      expect(kod, 'canlı bir import ölü sanıldı — yön yanlış').toBe(0);
    } finally { rmSync(kok, { recursive: true, force: true }); }
  });

  it('yan-etki importu ihlal DEĞİLDİR — silinmesi modülün etkisini öldürürdü', () => {
    const kok = mkdtempSync(join(tmpdir(), 'olu-import-'));
    try {
      writeFileSync(join(kok, 'x.js'), "import './yan-etki.js';\nexport const a = 1;\n");
      const { kod } = kostur([], kok);
      expect(kod).toBe(0);
    } finally { rmSync(kok, { recursive: true, force: true }); }
  });

  it('taban listesi ile gerçek tarama aynı dosyalardan bahsediyor (taban boşken boş döngü — üstteki 0 testi kapsar)', () => {
    const { cikti } = kostur(['--liste']);
    const taranan = new Set(cikti.split('\n').map((l) => l.split(':')[0].trim()).filter(Boolean));
    for (const f of Object.keys(TABAN).filter((k) => !k.startsWith('_'))) {
      expect(readdirSync(join(ROOT, 'js/parts')), `${f} tabanda var ama ağaçta yok`).toContain(f);
      expect(taranan, `${f} tabanda var ama tarama onu görmüyor`).toContain(f);
    }
  });
});
