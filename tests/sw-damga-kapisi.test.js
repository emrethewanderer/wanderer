// @vitest-environment node
/**
 * SW DAMGA KAPISI — "sidecar sessizce bayatlamasın".
 *
 * FAZ 15 teşhisi (2026-09-06, İç Çalışma 13 · "SW dil pürüzü", teşhissiz
 * işaretliydi): build.sh SW cache damgasını yalnız vite'ın ana bundle
 * hash'inden türetiyordu. `assets/ext-*.js` (EN dil paketi `ext-i18n-en.js`
 * dahil) vite'ın bağımlılık grafiğinin DIŞINDA esbuild ile ayrı derlenir —
 * bundle_hash yalnız `_src.js` içeriğini izler, sidecar İÇERİĞİ değişse bile
 * SESSİZCE aynı kalırdı. Sonuç: sw.js byte-aynı kalır → tarayıcı güncellemeyi
 * hiç fark etmez → activate hiç tetiklenmez → staleWhileRevalidate eski
 * sidecar'ı (ör. eski EN sözlüğü) cache'ten SÜRESİZ servis eder. Bugüne dek
 * bu görünmedi çünkü her EN sözlük değişimi i18n parite kapısı yüzünden TR
 * çekirdeğini de (vite-bundled) değiştiriyordu — hash hep BİRLİKTE kayıyordu.
 * Yalnız bir sidecar'ın DEĞERİNİ değiştiren (yeni anahtar EKLEMEYEN, ör. saf
 * bir çeviri düzeltmesi) bir commit bu korumayı atlar.
 *
 * Bu kapı build.sh'teki GERÇEK bloğu (SW-DAMGA-BASLA/BITTI sentinel'leri
 * arası) sentetik bir $TMP fixture'ına karşı ÇALIŞTIRIR — mantığı JS'e
 * KOPYALAMAZ. Sentinel kaybolursa (biçim değişirse) ilk `it` kendini kırar;
 * mantık build.sh dışında bir yerde ikinci kez yazılıp sessizce eskimez.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BUILD_SH = readFileSync(join(ROOT, 'build.sh'), 'utf8');

function sentinelBlok() {
  const baslaIdx = BUILD_SH.indexOf('# SW-DAMGA-BASLA');
  const bitiIdx = BUILD_SH.indexOf('# SW-DAMGA-BITTI');
  if (baslaIdx === -1 || bitiIdx === -1 || bitiIdx <= baslaIdx) return null;
  return BUILD_SH.slice(baslaIdx, bitiIdx);
}

/* Sentetik $TMP + kök sw.js fixture'ında build.sh'in GERÇEK damga bloğunu
   koşar, ortaya çıkan `const CACHE = 'etw-<damga>';` değerini döndürür.
   Bundle hash SABİT tutulur (index.html hiç değişmez) — yalnız sidecar
   içeriği (extIcerik) değişir; "bundle değişmedi, sidecar değişti" senaryosu
   böyle üretilir. */
function damgaKosustur(extIcerik) {
  const blok = sentinelBlok();
  if (!blok) throw new Error('SW-DAMGA sentinel bulunamadı — build.sh biçimi değişmiş olabilir');

  const kokDizin = mkdtempSync(join(tmpdir(), 'wanderer-sw-damga-'));
  try {
    const tmp = join(kokDizin, 'dist.tmp');
    mkdirSync(join(tmp, 'assets'), { recursive: true });
    writeFileSync(join(tmp, 'index.html'), '<script src="assets/_src-SABIT1234.js"></script>');
    writeFileSync(join(tmp, 'assets', 'ext-i18n-en.js'), extIcerik);
    writeFileSync(join(kokDizin, 'sw.js'), "const CACHE = 'placeholder';\n");

    const betik = `set -euo pipefail\nTMP="dist.tmp"\n${blok}\n`;
    execFileSync('bash', ['-c', betik], { cwd: kokDizin });

    const swIcerik = readFileSync(join(kokDizin, 'sw.js'), 'utf8');
    const m = swIcerik.match(/const CACHE = 'etw-([^']+)';/);
    if (!m) throw new Error('sw.js damgası oturmadı — fixture çıktısı: ' + swIcerik);
    return m[1];
  } finally {
    rmSync(kokDizin, { recursive: true, force: true });
  }
}

describe('sw damga kapısı — sidecar içeriği değişince CACHE damgası da değişir', () => {
  it('sentinel bloğu build.sh\'te bulunuyor (kendi kendini sınayan kapı)', () => {
    expect(sentinelBlok()).toBeTruthy();
  });

  it('aynı sidecar içeriği → aynı damga (deterministik)', () => {
    const a1 = damgaKosustur('AAA-sidecar-icerigi');
    const a2 = damgaKosustur('AAA-sidecar-icerigi');
    expect(a1).toBe(a2);
  });

  it('FAZ 15 kırığı — sidecar İÇERİĞİ değişince (bundle hash SABİTKEN) damga da değişir', () => {
    const eski = damgaKosustur('EN sözlüğü v1: hello');
    const yeni = damgaKosustur('EN sözlüğü v2: hello (düzeltildi)');
    // Bu satır dünkü build.sh'e karşı KIRMIZI olurdu: eski mantık yalnız
    // bundle_hash'i kullanıyordu ve ikisi de "SABIT1234" — damga hiç
    // kıpırdamazdı, sw.js byte-aynı kalırdı.
    expect(eski).not.toBe(yeni);
    // Bundle hash bileşeni (damganın ilk parçası) ikisinde de aynı kalmalı —
    // değişen yalnız sidecar özeti, ana bundle'a hiç dokunulmadı.
    expect(eski.split('-')[0]).toBe('SABIT1234');
    expect(yeni.split('-')[0]).toBe('SABIT1234');
  });
});
