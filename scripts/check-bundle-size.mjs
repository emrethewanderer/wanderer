#!/usr/bin/env node
/**
 * Bundle size budget kontrolü — CI'da build sonrası çalıştırılır.
 * Eşik aşılırsa exit 1, GitHub Actions PR'ı bloklar.
 *
 * Kullanım: node scripts/check-bundle-size.mjs
 */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * İKİ KAPI, TEK SAYI — bu eşikler build.sh'ın BUDGET_KB'siyle AYNI turda
 * değişir. 2026-08-18'de build.sh 650→665 olurken burası unutuldu ve CI'ın
 * "Bundle size budget" adımı bir gün boyunca sessizce kırmızı kaldı.
 *
 * Sayılar ölçümle seçildi (2026-08-19): V8 derlemesi 79 ms = boot'un %1.2'si,
 * marjinal maliyet +1 KB gzip = 0.118 ms. Raw eşiği ölçülen sıkıştırma
 * oranından türetildi (raw/gzip = 3.22).
 *
 * Karşılaştırma BYTE'tadır: `Math.round(x/1024)` YAKINA yuvarlar ve yarım
 * KB'lık aşımı `✓` gösterirdi. Yuvarlanmış birim aşımı gizler.
 *
 * NOT (ölçüm tuzağı): bu dosya zlib level 9 kullanır, build.sh sistem `gzip -c`
 * (level 6) — aynı dosya için ~2 KB fark eder. İkisi de kendi eşiğine göre
 * tutarlıdır; "doğru gzip boyutu" diye tek bir sayı aramak yanıltıcıdır.
 */
const BUDGETS = {
  rawJsMaxBytes: 3300 * 1024,   // build.sh BUDGET_KB × 3.22 (ölçülen oran)
  gzippedJsMaxBytes: 1024 * 1024, // = build.sh BUDGET_KB (1 MB gzip)
};

const ASSETS_DIR = join(process.cwd(), 'dist', 'assets');

function findJsFiles(dir) {
  try {
    return readdirSync(dir)
      .filter(f => f.endsWith('.js'))
      .map(f => ({ name: f, size: statSync(join(dir, f)).size }));
  } catch (e) {
    console.error(`✗ dist/assets bulunamadı: önce 'npm run build' çalıştırın`);
    process.exit(1);
  }
}

async function gzipSize(filePath) {
  const { gzipSync } = await import('node:zlib');
  const { readFileSync } = await import('node:fs');
  const buf = readFileSync(filePath);
  return gzipSync(buf, { level: 9 }).length;
}

const files = findJsFiles(ASSETS_DIR);
if (!files.length) {
  console.error('✗ dist/assets/*.js bulunamadı');
  process.exit(1);
}

let failed = false;
console.log('Bundle size budget kontrolü:');
console.log('────────────────────────────');

for (const f of files) {
  const gzipped = await gzipSize(join(ASSETS_DIR, f.name));
  const rawAsti = f.size > BUDGETS.rawJsMaxBytes;
  const gzAsti  = gzipped > BUDGETS.gzippedJsMaxBytes;

  const rawStatus = rawAsti ? '✗' : '✓';
  const gzStatus  = gzAsti  ? '✗' : '✓';
  // Dosya satırı İKİSİNİ birden yansıtır: eskiden yalnız raw'a bakıyordu ve
  // gzip aşımında dosya adının yanında ✓ görünüyordu — aşım okuyanın gözünden
  // kaçıyordu.
  console.log(`${rawAsti || gzAsti ? '✗' : '✓'} ${f.name}`);
  console.log(`  ${rawStatus} raw:   ${Math.round(f.size / 1024)} KB (${f.size} byte)   (budget: ${Math.round(BUDGETS.rawJsMaxBytes / 1024)} KB)`);
  console.log(`  ${gzStatus} gzip:  ${Math.round(gzipped / 1024)} KB (${gzipped} byte)   (budget: ${Math.round(BUDGETS.gzippedJsMaxBytes / 1024)} KB)`);

  if (rawAsti || gzAsti) {
    failed = true;
  }
}

console.log('────────────────────────────');
if (failed) {
  console.error('✗ Bundle size budget aşıldı. Lazy-load / code split / unused dep söküm gerek.');
  process.exit(1);
}
console.log('✓ Tüm bundle\'lar budget içinde.');
