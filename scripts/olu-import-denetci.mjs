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
  /* SOLDAN SAĞA DURUM MAKİNESİ — ve bunun neden bir regex olmadığı ölçüldü.
     İlk hâl iki `replace` idi: önce `/*…*​/`, sonra `//…`. 2026-09-06'da o
     hâl bir YANLIŞ POZİTİF üretti ve betiğin kendi kör nokta defterindeki
     *"canlı olanı ölü SANMAZ"* iddiasını çürüttü:

       fi.accept = 'image/*';

     Bu string'in içindeki `/*` sahte bir blok yorum AÇTI ve bir sonraki
     gerçek `*​/`'a kadar 1324 karakter GERÇEK KODU yuttu — `13c`'nin
     `S.currentUser` ve `sb.storage` kullanımları o yutulan aralıktaydı.
     Sonuç: iki canlı import ölü raporlandı. Silinseydi görsel yükleme
     sessizce ölürdü — kapının kendisi bir kırık üretecekti.

     Ders bu turun tekrar eden sınıfı: bir yorum (burada bir belge iddiası)
     kodun yaptığından fazlasını söylüyordu (§5.2). Yön güvenliği bir NİYET
     değil, ancak ayrıştırıcının şekliyle GARANTİ edilebilir bir şeydir.

     Makine dört hâl tutar: kod · satır yorumu · blok yorum · string
     (tek/çift/şablon). Regex literalleri ayrıca izlenmez — blok-yorum
     açan bir dizi taşıyan bir regex bu repoda yoktur, ve olsa da yön yine
     güvenli tarafa düşer: fazladan kod görülür, ad "kullanılıyor" sayılır.
     Ters bölü ile kaçırılan tırnak string içinde onurlandırılır.

     KÜÇÜK BİR İRONİ, kayda değer: bu yorumun ilk yazımı blok-yorum kapatan
     diziyi bir örnek olarak İÇİNDE taşıyordu ve yorumu erken kapattı —
     yani düzeltilen kırığın aynısını, düzelten yorumun kendisi yaptı. */
  let out = '';
  let i = 0;
  const n = ham.length;
  while (i < n) {
    const c = ham[i], c2 = ham[i + 1];
    if (c === '/' && c2 === '*') {                       // blok yorum
      const son = ham.indexOf('*/', i + 2);
      i = son === -1 ? n : son + 2;
      continue;
    }
    if (c === '/' && c2 === '/') {                       // satır yorumu
      const son = ham.indexOf('\n', i);
      i = son === -1 ? n : son;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      /* String / şablon: İÇERİK AYNEN KORUNUR. Makinenin tek işi, string'in
         İÇİNDEKİ `/*` ya da `//` dizisinin bir YORUM AÇMASINI engellemektir —
         kırık buydu (`fi.accept = 'image/*'` 1324 karakter gerçek kodu
         yutuyordu). İçeriği ayrıca düşürmek İKİ yeni kırık üretir ve ikisi
         de ölçüldü (2026-09-06):
           · tırnakları yemek `from 'x'` kalıbını bozar → hiç import
             bulunmaz → kapı "0 ölü import" diye SAHTE YEŞİL basar;
           · şablon içeriğini yemek `${S.currentUser.id}` gibi GERÇEK
             kullanımları siler → düzeltilen yanlış pozitif geri gelir.
         İçeriği korumak betiğin kendi kör nokta defteriyle de tutarlıdır
         (madde 2): bir ad yalnız bir string'de geçiyorsa "kullanılıyor"
         sayılır ve yön güvenli tarafa düşer — kapı ölü importu KAÇIRABİLİR,
         canlı olanı ölü SANMAZ. */
      const tirnak = c;
      out += c;
      i++;
      while (i < n) {
        if (ham[i] === '\\') { out += ham[i] + (ham[i + 1] || ''); i += 2; continue; }
        if (ham[i] === tirnak) { break; }
        out += ham[i];
        i++;
      }
      out += tirnak;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
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
