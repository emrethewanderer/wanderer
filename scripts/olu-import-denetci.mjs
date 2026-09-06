#!/usr/bin/env node
/**
 * Wanderer AI — ÖLÜ IMPORT DENETÇİSİ
 * "İçeri alınan ama hiç kullanılmayan ad" sınıfının bekçisi.
 *
 * NEDEN VAR. 2026-09-05'in Opus öz-denetiminde (§3.7, kod ekseni) ölçüldü:
 * `js/parts` altında **123 ölü named import / 21 dosya**. Tek tek zararsız
 * görünürler — rollup zaten tree-shake ediyor, bundle'a girmiyorlar. Bedel
 * bundle değil OKUMA: `13a` `etiketCoz`'u import ediyordu ve KULLANMIYORDU,
 * yani dosyayı açan herkes "burada etiket çözülüyor" sanıyordu — oysa o iş
 * FAZ 9'da saf yaprağa taşınmıştı. Bir barrel dosyası `sb`'yi import edince
 * okuyan "burada Supabase'e gidiliyor" sanır. Ölü import bir performans
 * borcu değil, bir YANLIŞ HARİTADIR.
 *
 * Kullanım:
 *   node scripts/olu-import-denetci.mjs              → tabanla karşılaştır (artışta exit 1)
 *   node scripts/olu-import-denetci.mjs --liste      → hepsini dosya:ad olarak yaz, exit 0
 *   node scripts/olu-import-denetci.mjs --taban-yaz  → bugünkü sayıyı tabana yaz
 *   node scripts/olu-import-denetci.mjs --dizin X    → başka bir kökü tara (kapının kendi testi)
 *
 * TABAN ÇİZGİSİ: emsal `scripts/ihtimalsel-taban.json` — dosya başına sayı
 * tutulur, ARTIŞ yasaktır, azalma serbesttir. Hepsi 0 olduğunda kapı
 * kendiliğinden sert 0-tolerans kapısına döner.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * KAPININ GÖREMEDİĞİ (kör nokta defteri — gizlenmez, adlandırılır)
 *
 * 1. **Yalnız `import { … }` biçimi taranır.** `import X from`,
 *    `import * as X`, ve yan-etki importları (`import './x.js'`) HİÇ
 *    bakılmaz. Yan-etki importu zaten "kullanılmıyor" görünür ve silinmesi
 *    modülün yan etkisini öldürürdü — bilerek dışarıda.
 * 2. **Kullanım araması bir REGEX'tir, ayrıştırıcı değil.** Bir ad yalnız
 *    bir yorumda ya da bir string'de geçiyorsa "kullanılıyor" sayılır.
 *    Yön güvenlidir: kapı ölü importu KAÇIRABİLİR, ama canlı olanı ölü
 *    SANMAZ — yani yanlış pozitif üretmez. Sayı şişmez, eksilir.
 * 3. **Türkçe harfler ve `\b`.** JS'te `\b` ASCII sınırıdır; tek harfli ya
 *    da kısa bir ad (`S`) Türkçe bir sözcüğün içinde sahte eşleşme verebilir
 *    (`Süreç` içinde `S`). Bu yüzden yorumlar ÖNCE sökülür — `S`'nin tek
 *    gerçek geçişi kodda aranır. Bu da (2) ile aynı yöne çalışır.
 * 4. **Yeniden dışa aktarım (`export { x } from`)** ayrı bir sözdizimidir ve
 *    zaten `import { … }` deseniyle eşleşmez; barrel dosyaları bu yüzden
 *    yanlış raporlanmaz.
 * ───────────────────────────────────────────────────────────────────────── */
import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const _dizinArg = process.argv.indexOf('--dizin');
const DIZIN = _dizinArg >= 0 && process.argv[_dizinArg + 1] ? process.argv[_dizinArg + 1] : null;
const KOK = DIZIN || join(ROOT, 'js/parts');
const TABAN_YOLU = DIZIN ? join(DIZIN, 'olu-import-taban.json') : join(__dirname, 'olu-import-taban.json');

const IMPORT_RE = /import\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"]/g;

/** Yorumları söker — kör nokta #3'ün gereği. Şablon içi metin de gider,
 *  ama orada bir import adının geçmesi zaten kullanım sayılmaz. */
function kodu(ham) {
  return ham.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** Bir dosyadaki ölü named import adları. Saf fonksiyon — kapı bunu sınar. */
export function oluImportlar(ham) {
  const kod = kodu(ham);
  const adlar = [];
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(kod))) {
    for (let ad of m[1].split(',')) {
      ad = ad.trim().split(/\s+as\s+/).pop().trim();
      if (ad) adlar.push(ad);
    }
  }
  if (!adlar.length) return [];
  const govde = kod.replace(IMPORT_RE, '');   // TEK kez — O(n), her ad için değil
  return adlar.filter((ad) => {
    const kacis = ad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return !new RegExp(`\\b${kacis}\\b`).test(govde);
  });
}

function tara() {
  const out = {};
  for (const f of readdirSync(KOK).filter((x) => x.endsWith('.js'))) {
    const olu = oluImportlar(readFileSync(join(KOK, f), 'utf8'));
    if (olu.length) out[f] = olu;
  }
  return out;
}

const bulgu = tara();
const toplam = Object.values(bulgu).reduce((s, v) => s + v.length, 0);

if (process.argv.includes('--liste')) {
  for (const [f, adlar] of Object.entries(bulgu)) console.log(`${f}: ${adlar.join(', ')}`);
  console.log(`\n── ${toplam} ölü import / ${Object.keys(bulgu).length} dosya`);
  process.exit(0);
}

if (process.argv.includes('--taban-yaz')) {
  const taban = { _aciklama: 'Ölü import taban çizgisi — dosya başına sayı. Kapı ARTIŞI yasaklar; azalma serbesttir. Tümü 0 olduğunda sert 0-tolerans kapısına döner.' };
  for (const [f, adlar] of Object.entries(bulgu)) taban[f] = adlar.length;
  writeFileSync(TABAN_YOLU, JSON.stringify(taban, null, 2) + '\n');
  console.log(`taban yazıldı: ${toplam} ölü import / ${Object.keys(bulgu).length} dosya → ${TABAN_YOLU}`);
  process.exit(0);
}

const taban = existsSync(TABAN_YOLU) ? JSON.parse(readFileSync(TABAN_YOLU, 'utf8')) : {};
const artan = [];
for (const [f, adlar] of Object.entries(bulgu)) {
  const izin = Number(taban[f] || 0);
  if (adlar.length > izin) artan.push(`${f}: ${adlar.length} > taban ${izin} — ${adlar.join(', ')}`);
}
if (artan.length) {
  console.error('✗ ölü import ARTMIŞ:\n' + artan.map((x) => '  ' + x).join('\n'));
  process.exit(1);
}
console.log(`✓ ölü import artmamış (${toplam} / taban toplamı ${Object.values(taban).filter((v) => typeof v === 'number').reduce((a, b) => a + b, 0)})`);
