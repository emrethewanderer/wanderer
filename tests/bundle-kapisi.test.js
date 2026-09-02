// @vitest-environment node
/**
 * BUNDLE BÜTÇE KAPISI — "ağırlık sessizce artmaz".
 *
 * scripts/check-bundle-size.mjs YAZILIYDI ama hiçbir yerde KOŞMUYORDU
 * (denetim B4): ne vitest çağırıyordu, ne CI vardı. Bir bütçe, aşıldığında
 * kimseyi uyandırmıyorsa bütçe değildir — bu dosya onu kapıya bağlar.
 *
 * Kalıp tests/gerceklik-kapisi.test.js ile aynı: spawnSync + exit kodu.
 *
 * NOT: Bütçenin KENDİSİ ayrı bir tartışmadır (ana bundle bugün ~710 KB gzip,
 * bütçe 1024 KB). Bu kapı bütçeyi sıkılaştırmaz; yalnız var olan bütçenin
 * gerçekten bekçilik etmesini sağlar. Sıkılaştırma ürün kararıdır.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DENETCI = join(ROOT, 'scripts/check-bundle-size.mjs');

describe('bundle bütçe kapısı', () => {
  it('check-bundle-size.mjs 0 ile geçer — hiçbir varlık bütçeyi aşmıyor', () => {
    if (!existsSync(join(ROOT, 'dist/assets'))) {
      // dist yoksa build alınmamıştır; kapı sessizce beklemez, sebebi söyler.
      throw new Error('dist/ yok — önce ./build.sh koşturulmalı, bütçe ölçülemiyor.');
    }
    const res = spawnSync('node', [DENETCI], { cwd: ROOT, encoding: 'utf8' });
    if (res.status !== 0) {
      throw new Error(`bundle bütçesi aşıldı:\n${res.stdout}${res.stderr}`);
    }
    expect(res.status).toBe(0);
  });

  it('raporunda ana bundle gerçekten ölçülüyor — kapı boş koşmuyor', () => {
    const res = spawnSync('node', [DENETCI], { cwd: ROOT, encoding: 'utf8' });
    expect(res.stdout).toMatch(/_src-[A-Za-z0-9_-]+\.js/);
    expect(res.stdout).toMatch(/gzip/);
  });
});
