#!/usr/bin/env node
/**
 * Wanderer AI — BAĞSIZ AD DENETÇİSİ
 * "Bundle'da çalışan, kaynakta var olmayan ad" sınıfının bekçisi.
 *
 * [[yetim-kopru-denetcisi]]'nin kardeşi. O, köprünün KARŞI UCUNU sorar
 * (`window.foo?.()` yazıldı ama foo hiç expose edilmiş mi?). Bu ise
 * ÇAĞIRAN TARAFI sorar: `foo()` yazan modülde `foo` diye bir bağ var mı —
 * import edilmiş mi, tanımlanmış mı?
 *
 * NEDEN AYRI BİR KAPI GEREKTİ (2026-08-21):
 * Vite'ın IIFE build'i tüm modülleri TEK scope'a düzleştirir (scope hoisting).
 * Bir modül başka modülün fonksiyonunu import etmeden çıplak çağırırsa —
 * `generateHomework()` gibi — bundle'da o ad tesadüfen çözülür ve ürün
 * çalışıyor görünür. Aynı kod kaynak ES modülü olarak koştuğunda (vitest,
 * dev, herhangi bir doğrudan import) ReferenceError'dır. Yani kırık, build'in
 * ve gözün göremediği bir yerde durur.
 *
 * Bu tarama açıldığında 56 vaka çıktı, 26 ayrı ad. Üçü ağırdı:
 *   · `06:requestChatExit` → `saveSessionPatterns` / `generateHomework` /
 *     `updateTrackProgress`: üçü de bağsızdı. `Promise.resolve(f())` kalıbında
 *     hata ARGÜMAN değerlendirilirken atılır — `.catch()` onu YAKALAYAMAZ.
 *   · `10n:_obRender` → `OB_STATIONS` hiç tanımlanmamıştı; kullanıcı
 *     "Başla"ya bastığı an Dinlenme onboarding'i ölüyordu.
 *   · `07:loadSettings` → `WHATSAPP_COMMUNITY_URL`'e ATAMA yapılıyordu; ES
 *     modülleri daima strict, tanımsıza atama ReferenceError'dır.
 *
 * YÖNTEM: gerçek scope analizini TypeScript yapar (`tsconfig.bagsiz-ad.json`,
 * `checkJs: true`). Elle regex yazmak bu işi çözmez — blok scope, hoisting,
 * destructuring, catch parametresi, sınıf alanları hepsi kural ister.
 * `types/globals.d.ts` `interface Window` ile beyan eder, `declare var` ile
 * DEĞİL: bu kasıtlıdır ve kapının çalışmasının şartıdır — `declare var`
 * yazılırsa çıplak `foo()` sessizce meşrulaşır.
 *
 * SINIRI (dürüstçe): bu kapı ADIN ÇÖZÜLÜP ÇÖZÜLMEDİĞİNİ sorar; doğru adın
 * çağrıldığını ya da doğru zamanda çağrıldığını değil. `window.foo?.()`
 * biçimindeki köprüler buradan geçer — onları kardeş denetçi sorar.
 *
 * Kullanım:
 *   node scripts/bagsiz-ad-denetci.mjs             → denetle (ihlalde exit 1)
 *   node scripts/bagsiz-ad-denetci.mjs --liste     → listele, exit 0
 *   node scripts/bagsiz-ad-denetci.mjs --config X  → başka profille tara
 *                                                    (kapının öz-sınaması kullanır)
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');
const LISTE = process.argv.includes('--liste');
const _cfgArg = process.argv.indexOf('--config');
const PROFIL = _cfgArg >= 0 && process.argv[_cfgArg + 1]
  ? process.argv[_cfgArg + 1]
  : join(KOK, 'tsconfig.bagsiz-ad.json');

/* TS2304 "Cannot find name 'x'" · TS2552 aynı hatanın "bunu mu demek
   istedin?" varyantı — ikisi de aynı kırığın adıdır. */
const DESEN = /^(.+?)\((\d+),(\d+)\): error (TS2304|TS2552): Cannot find name '([^']+)'/;

function denetle() {
  let cikti = '';
  try {
    execFileSync('npx', ['tsc', '-p', PROFIL],
      { cwd: KOK, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    /* tsc ihlal bulunca exit 1 verir — çıktı stdout'tadır, bu beklenen yol. */
    cikti = (e.stdout || '') + (e.stderr || '');
  }
  const bulgular = [];
  for (const satir of cikti.split('\n')) {
    const m = DESEN.exec(satir.trim());
    if (m) bulgular.push({ dosya: m[1], satir: +m[2], ad: m[5] });
  }
  return bulgular;
}

const bulgular = denetle();

if (!bulgular.length) {
  console.log('✓ Bağsız ad yok — her çağrı kendi modülünde bir bağa oturuyor.');
  process.exit(0);
}

const adBazli = new Map();
for (const b of bulgular) {
  if (!adBazli.has(b.ad)) adBazli.set(b.ad, []);
  adBazli.get(b.ad).push(`${b.dosya}:${b.satir}`);
}

console.log(`${LISTE ? '•' : '✗'} ${bulgular.length} bağsız ad kullanımı, ${adBazli.size} ayrı ad:\n`);
for (const [ad, yerler] of [...adBazli].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${ad}`);
  for (const y of yerler) console.log(`      ${y}`);
}
console.log(`
  Bu adlar bundle'da tesadüfen çözülüyor olabilir (vite tüm modülleri tek
  scope'a düzleştirir) ama kaynak modülde ReferenceError'dır.
  Çözüm: adı gerçekten import et. Ad hiçbir yerde tanımlı değilse ya yaz
  ya da çağrıyı sök — "bundle'da çalışıyor" bir gerekçe değildir.`);

process.exit(LISTE ? 0 : 1);
