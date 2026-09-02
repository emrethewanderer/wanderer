// @vitest-environment node
/**
 * NATİF SENKRON KAPISI — "mağazaya giden sürüm webden geri kalmaz".
 *
 * Denetim D1 (2026-09-01): android/ ve ios/ altındaki web varlıkları
 * dist/'ten bir bundle hash ve 283 KB geride kalmıştı. `npx cap copy` elle
 * koşulan bir adımdı; bir gün koşulmamış, fark kimseye görünmeden repo'ya
 * commit'lenmişti. Türetilmiş çıktının elle senkronlanması böyle biter.
 *
 * İki katmanlı çözümün ikinci katmanı burasıdır: build.sh artık senkronu
 * kendi yapar (birinci katman), bu kapı da kaymayı yakalar. Kapı kırmızıysa
 * yapılacak tek şey vardır: `./build.sh` (ya da `npx cap copy`).
 *
 * Kabuk dizinleri yoksa (yalnız web dağıtımı) kapı boşta bekler.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const KABUKLAR = [
  ['Android', 'android/app/src/main/assets/public/index.html'],
  ['iOS', 'ios/App/App/public/index.html'],
];

function bundleHash(yol) {
  const m = readFileSync(join(ROOT, yol), 'utf8').match(/_src-([A-Za-z0-9_-]+)\.js/);
  return m ? m[1] : null;
}

describe('natif senkron kapısı — kabuklar dist ile aynı bundle\'ı taşır', () => {
  const distVar = existsSync(join(ROOT, 'dist/index.html'));

  it('dist build alınmış olmalı', () => {
    expect(distVar).toBe(true);
  });

  for (const [ad, yol] of KABUKLAR) {
    const kabukVar = existsSync(join(ROOT, yol));
    it(`${ad} kabuğu dist ile aynı bundle hash'ini taşır`, () => {
      if (!kabukVar) return;                       // kabuk yoksa kapı boşta
      const beklenen = bundleHash('dist/index.html');
      const bulunan = bundleHash(yol);
      expect(beklenen).toBeTruthy();
      if (bulunan !== beklenen) {
        throw new Error(
          `${ad} kabuğu geride kalmış — dist: _src-${beklenen}.js, kabuk: _src-${bulunan}.js\n` +
          `Çözüm: ./build.sh (build kendi senkronunu yapar) ya da npx cap copy`
        );
      }
      expect(bulunan).toBe(beklenen);
    });
  }
});
