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
import { existsSync, readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const KABUKLAR = [
  ['Android', 'android/app/src/main/assets/public/index.html'],
  ['iOS', 'ios/App/App/public/index.html'],
];

// mutlakYol: hem gerçek repo dosyaları (join(ROOT, …) çağıranda üretilir)
// hem de self-test fixture'ı aynı imzayla okuyabilsin diye ROOT'a göre değil
// mutlak yola göre çalışır.
function bundleHash(mutlakYol) {
  const m = readFileSync(mutlakYol, 'utf8').match(/_src-([A-Za-z0-9_-]+)\.js/);
  return m ? m[1] : null;
}

// Karşılaştırma mantığı burada tek yerde yaşar — hem gerçek kabuk testleri
// hem aşağıdaki self-test aynı fonksiyonu çağırır (K1: kapı sınandığı
// mantığın dışına taşmamalı).
function senkronDogrula(ad, distYol, kabukYol) {
  const beklenen = bundleHash(distYol);
  if (!beklenen) throw new Error(`${ad}: dist bundle hash okunamadı — ${distYol}`);
  const bulunan = bundleHash(kabukYol);
  if (bulunan !== beklenen) {
    throw new Error(
      `${ad} kabuğu geride kalmış — dist: _src-${beklenen}.js, kabuk: _src-${bulunan}.js\n` +
      `Çözüm: ./build.sh (build kendi senkronunu yapar) ya da npx cap copy`
    );
  }
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
      expect(() => senkronDogrula(ad, join(ROOT, 'dist/index.html'), join(ROOT, yol))).not.toThrow();
    });
  }
});

/*
 * SELF-TEST — "yakalamayan bir kapı, kapı değildir".
 *
 * senkronDogrula gerçek android/ios ağacına hiç dokunulmadan, sentetik
 * fixture dosyalarıyla sınanır — kasıtlı bir hash uyuşmazlığı üretip
 * kapının gerçekten kırıldığı kanıtlanır.
 */
describe('natif senkron kapısı — self-test (sentetik fixture, gerçek dist/android/ios\'a dokunmaz)', () => {
  it('hash uyuşmazlığında kapı gerçekten kırılıyor', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'wanderer-native-senkron-kapisi-'));
    try {
      const distYol = join(fixtureRoot, 'dist-index.html');
      const kabukYol = join(fixtureRoot, 'kabuk-index.html');
      writeFileSync(distYol, '<script src="/assets/_src-AAAAAAAA.js"></script>');
      writeFileSync(kabukYol, '<script src="/assets/_src-BBBBBBBB.js"></script>'); // kasıtlı uyuşmazlık
      expect(() => senkronDogrula('Sınav', distYol, kabukYol)).toThrow(/geride kalmış/);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it('hash eşleştiğinde kapı sessiz kalıyor', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'wanderer-native-senkron-kapisi-'));
    try {
      const distYol = join(fixtureRoot, 'dist-index.html');
      const kabukYol = join(fixtureRoot, 'kabuk-index.html');
      writeFileSync(distYol, '<script src="/assets/_src-AAAAAAAA.js"></script>');
      writeFileSync(kabukYol, '<script src="/assets/_src-AAAAAAAA.js"></script>');
      expect(() => senkronDogrula('Sınav', distYol, kabukYol)).not.toThrow();
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
