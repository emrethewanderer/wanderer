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

  it('taban gerçek bir ölçüdür — boş değil, dosya başına sayı tutuyor', () => {
    // [[kapi-sessiz-gec]]: boş bir taban her ağacı geçirir ve kapı sessizce
    // yeşil yanar. Taban en az bir dosya saymalı ve sayılar sayı olmalı.
    const satirlar = Object.entries(TABAN).filter(([k]) => !k.startsWith('_'));
    expect(satirlar.length).toBeGreaterThan(0);
    for (const [f, n] of satirlar) {
      expect(typeof n, `${f} tabanı sayı değil`).toBe('number');
      expect(n).toBeGreaterThan(0);
    }
  });

  it('tarama gerçekten bir şey buluyor — ayrıştırıcı kırılırsa sessiz kalmaz', () => {
    const { cikti } = kostur(['--liste']);
    expect(cikti).toMatch(/ölü import \/ \d+ dosya/);
    const m = cikti.match(/── (\d+) ölü import/);
    expect(Number(m?.[1] ?? 0)).toBeGreaterThan(0);
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

  it('taban listesi ile gerçek tarama aynı dosyalardan bahsediyor', () => {
    const { cikti } = kostur(['--liste']);
    const taranan = new Set(cikti.split('\n').map((l) => l.split(':')[0].trim()).filter(Boolean));
    for (const f of Object.keys(TABAN).filter((k) => !k.startsWith('_'))) {
      expect(readdirSync(join(ROOT, 'js/parts')), `${f} tabanda var ama ağaçta yok`).toContain(f);
      expect(taranan, `${f} tabanda var ama tarama onu görmüyor`).toContain(f);
    }
  });
});
