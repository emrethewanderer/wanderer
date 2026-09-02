// @vitest-environment node
// Denetçiyi spawnSync ile ayrı süreçte koşar — DOM'a hiç dokunmaz.
// (jsdom kurulumu dosya başına ~3 sn'dir; burada bedava ödenirdi.)

/**
 * BAĞSIZ AD KAPISI — "bundle'da çalışan, kaynakta olmayan ad"ın bekçisi.
 *
 * scripts/bagsiz-ad-denetci.mjs'i koşar; bir modül kendi scope'unda bağı
 * olmayan bir adı çağırır ya da okursa bu test KIRILIR. Kalıbı
 * tests/gerceklik-kapisi ile aynıdır (spawnSync + exit kodu) — çalışan kapı
 * deseni yeniden kullanıldı, yenisi icat edilmedi.
 *
 * NEDEN VAR: vite'ın IIFE build'i modülleri tek scope'a düzleştirir, o yüzden
 * `./build.sh` bu kırığı YAKALAMAZ — ölçüldü: kasten eklenen bağsız bir adla
 * build exit 0 verdi ve ad bundle'a olduğu gibi girdi. Kaynak ES modülünde
 * ise aynı satır ReferenceError'dır. Kapı bu boşluk için var.
 * Ayrıntı: [[bagsiz-ad-kapisi]] · kardeş kapı: yetim-kopru-denetci.mjs
 *
 * İkinci describe kapının KENDİSİNİ sınar: yeşil kalmak için ihlali
 * yakalayabildiğini de kanıtlamalı. Yakalamayan bir kapı, kapı değildir.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DENETCI = join(ROOT, 'scripts/bagsiz-ad-denetci.mjs');

/* tsc soğuk başlar; iki koşu için cömert ama sonsuz olmayan bir pay. */
const SURE = 180_000;

function kostur(ekArgs = []) {
  return spawnSync('node', [DENETCI, ...ekArgs], {
    cwd: ROOT, encoding: 'utf8', timeout: SURE,
  });
}

describe('bağsız ad kapısı — her çağrı kendi modülünde bir bağa oturur', () => {
  it('repo genelinde bağsız ad yok', () => {
    const r = kostur();
    if (r.status !== 0) {
      throw new Error(
        'Bağsız ad bulundu — bu ad bundle\'da tesadüfen çözülüyor olabilir ama\n' +
        'kaynak modülde ReferenceError\'dır. Adı gerçekten import et.\n\n' + (r.stdout || r.stderr)
      );
    }
    expect(r.status).toBe(0);
  }, SURE);
});

describe('kapının kendisi — ihlali gerçekten yakalıyor mu', () => {
  it('bağsız bir ad eklenmiş dosyada exit 1 verir ve adı raporlar', () => {
    const dizin = mkdtempSync(join(tmpdir(), 'bagsiz-ad-'));
    try {
      writeFileSync(join(dizin, 'ornek.js'),
        'export function f() {\n  return BAGSIZ_ORNEK_AD;\n}\n');
      writeFileSync(join(dizin, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
          allowJs: true, checkJs: true, noEmit: true, strict: false,
          target: 'ES2020', module: 'ESNext', moduleResolution: 'Bundler',
          skipLibCheck: true, types: [],
        },
        include: ['*.js'],
      }));

      const r = kostur(['--config', join(dizin, 'tsconfig.json')]);
      expect(r.status).toBe(1);
      expect(r.stdout).toContain('BAGSIZ_ORNEK_AD');
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  }, SURE);

  /* Kapının ikinci görevi: kırığı göremediğini FARK ETMEK. tsc taraması
     bozulduğunda (girdi bulunamadı, dosya silinmiş) bulgu listesi boş döner
     ve denetçi eskiden "✓ Bağsız ad yok" basardı — yani sessizce geçerdi.
     Ölçüm (2026-09-02): TS18003 bu durumda **exit 0** ile gelir, yani tsc'nin
     çıkış kodu da uyarmaz. Kırığı görme yeteneğinin kaybı, kırığın kendisi
     kadar tehlikelidir. */
  it('tarama hiç girdi bulamazsa sessizce geçmez — exit 1 ve gerekçe basar', () => {
    const dizin = mkdtempSync(join(tmpdir(), 'bagsiz-ad-bos-'));
    try {
      writeFileSync(join(dizin, 'tsconfig.json'), JSON.stringify({
        compilerOptions: {
          allowJs: true, checkJs: true, noEmit: true, strict: false,
          target: 'ES2020', module: 'ESNext', moduleResolution: 'Bundler',
          skipLibCheck: true, types: [],
        },
        include: ['yok-boyle-dizin/**/*.js'],
      }));

      const r = kostur(['--config', join(dizin, 'tsconfig.json')]);
      expect(r.status).toBe(1);
      expect(r.stdout).toMatch(/tarama güvenilmez/);
      expect(r.stdout).toContain('TS18003');
      /* Ve asla yanlış güvence vermemeli. */
      expect(r.stdout).not.toContain('Bağsız ad yok');
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  }, SURE);
});
