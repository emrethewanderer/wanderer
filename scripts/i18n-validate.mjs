#!/usr/bin/env node
/**
 * Wanderer AI — i18n BEKÇİSİ (Tüm Diller Native 2.0 · FAZ 0 · K2)
 * Çevirinin KALİTESİNİ değil YAPISINI denetler — transcreation kalitesi
 * yürütücü modelin kendi işidir (bkz. .claude/plans/tum-diller-native-2.md §0.4).
 *
 * Kullanım:
 *   node scripts/i18n-validate.mjs --lang <xx>   → tek dilin yapısal doğrulaması
 *   node scripts/i18n-validate.mjs --gaps        → TR core'a sonradan eklenen
 *                                                    anahtarların dil-dil raporu
 *
 * Denetlenen dosyalar (varsa; hiçbiri zorunlu değil — parça parça yazım destekli):
 *   js/parts/i18n/<lang>-ui.js     → export const I18N_LANG
 *   js/parts/i18n/<lang>-prompt.js → export const PROMPT_I18N_LANG
 *   js/parts/i18n/<lang>-detect.js → export const DETECT_LANG
 *   js/parts/i18n/<lang>-deste.js  → export const DESTE_OVERLAY
 *   js/parts/i18n/<lang>-hukuk.js  → export function buildHukukDocs({HK_CONTACT,HK_EFFECTIVE})
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, isAbsolute } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/* --dizin <yol>: kapının KENDİSİNİ sınamak için (tests/i18n-parity-kapisi.test.js
   self-test) — yalnız TARANAN dil dizinini değiştirir; TR referansı
   (loadTrRefs, trDeckIds) yine gerçek ROOT'tan okunur, çünkü "doğru" o
   sabit kalmalı. tasarim-denetci.mjs ve gerceklik-denetci.mjs'in aynı adı
   taşıyan bayrağıyla aynı kalıp — kapıyı test etmeyen kapı, kapı değildir. */
const _dizinArg = process.argv.indexOf('--dizin');
const I18N_DIR = (_dizinArg >= 0 && process.argv[_dizinArg + 1])
  ? (isAbsolute(process.argv[_dizinArg + 1]) ? process.argv[_dizinArg + 1] : join(ROOT, process.argv[_dizinArg + 1]))
  : join(ROOT, 'js/parts/i18n');

const STRUCT_TOKENS = ['[MOD:', '[ARAC]', '[KAGIT]', '[TAKIP]', '[KART]', '[NISAN:'];
/* Donuk sözleşme alanları — deste overlay bunlara ASLA dokunamaz (§0.2 kural 3). */
const DECK_FORBIDDEN_FIELDS = ['id', 'category', 'rarity', 'recipe', 'virtue', 'glyph', 'sigil', 'roman'];

let errors = [];
let warnings = [];

function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

async function importMod(absPath) {
  return import(pathToFileURL(absPath).href + '?t=' + Date.now()); // cache-bust: aynı süreçte tekrar tekrar koşulabilir
}

/* ── metin-analiz yardımcıları ─────────────────────────────────────────── */
function extractVars(str) {
  const set = new Set();
  for (const m of String(str).matchAll(/\{\{(\w+)\}\}/g)) set.add(m[1]);
  return set;
}
function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}
function tokenCounts(str) {
  const s = String(str);
  const out = {};
  for (const tok of STRUCT_TOKENS) {
    const re = new RegExp(tok.replace(/[[\]]/g, '\\$&'), 'g');
    out[tok] = (s.match(re) || []).length;
  }
  return out;
}
function htmlTagCounts(str) {
  const out = {};
  for (const m of String(str).matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g)) {
    const tag = m[1].toLowerCase();
    out[tag] = (out[tag] || 0) + 1;
  }
  return out;
}
function braceBalanced(str) {
  let depth = 0;
  for (const ch of String(str)) {
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth < 0) return false; }
  }
  return depth === 0;
}
function countsEqual(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] || 0) !== (b[k] || 0)) return false;
  return true;
}

/* ── TR referans kaynaklarını yükle ──────────────────────────────────────
   15b/16b/16c doğrudan import edilebilir saf-veri modülleridir (import zinciri
   sadece plain object/const — DOM'a dokunmaz), Node'da sorunsuz çalışır. */
async function loadTrRefs() {
  const uiMod = await importMod(join(ROOT, 'js/parts/15b-i18n-dict-core.js'));
  const promptMod = await importMod(join(ROOT, 'js/parts/16b-i18n-prompt-dict-core.js'));
  const detectMod = await importMod(join(ROOT, 'js/parts/16c-i18n-detect-dict.js'));
  return {
    ui: uiMod.I18N_CORE.tr,
    prompt: promptMod.PROMPT_I18N_CORE.tr,
    detect: detectMod.DETECT_I18N.tr,
  };
}

/* Deste TR id kümesi — 12b2 (Dokunulmaz, sabit) + 12a (12 çekirdek, sabit)
   metninden STATİK regex ile çıkarılır. Gerçek buildDeckData() çalıştırmak
   yerine bilinçli tercih: 12a/12d zincirinin tarayıcı-only bağımlılıkları
   olabilir (bkz. import ağacı); regex-taraması ortam-bağımsız ve hızlıdır. */
function trDeckIds() {
  const ids = new Set();
  const archSrc = readFileSync(join(ROOT, 'js/parts/12a-archetypes.js'), 'utf8');
  const archBlock = archSrc.match(/const ARKETIPLER_DATA = \[([\s\S]*?)\n\];/);
  if (archBlock) for (const m of archBlock[1].matchAll(/id:\s*'([a-z0-9_-]+)'/g)) ids.add(m[1]);

  const deckSrc = readFileSync(join(ROOT, 'js/parts/12b2-deste-icerik.js'), 'utf8');
  for (const m of deckSrc.matchAll(/P\(\{\s*id:\s*'([a-z0-9_-]+)'/g)) ids.add(m[1]);

  const bilesikBlock = deckSrc.match(/const BILESIK_DEFS = \[([\s\S]*?)\n\];/);
  if (bilesikBlock) {
    for (const m of bilesikBlock[1].matchAll(/\{\s*v1:\s*'([a-z]+)',\s*v2:\s*'([a-z]+)'/g)) {
      ids.add(`bilesik-${m[1]}-${m[2]}`);
    }
  }
  return ids;
}

/* ── (a)(b)(c)(d)(f) — string sözlük ortak denetimi (UI + prompt paylaşır) ── */
function validateStringDict(label, dict, trRef, { checkBraceBalance = false } = {}) {
  if (!dict || typeof dict !== 'object' || Array.isArray(dict)) {
    err(`${label}: export bir düz obje değil`);
    return;
  }
  for (const [key, val] of Object.entries(dict)) {
    if (!(key in trRef)) { err(`${label}: bilinmeyen anahtar (TR core'da yok) → ${key}`); continue; }
    if (typeof val !== 'string') { err(`${label}.${key}: değer string değil`); continue; }
    if (val.trim() === '') { err(`${label}.${key}: değer boş`); continue; }

    const trVal = trRef[key];
    if (typeof trVal !== 'string') continue; // TR referansı string değilse karşılaştırma anlamsız

    const varsHere = extractVars(val);
    const varsTr = extractVars(trVal);
    if (!setsEqual(varsHere, varsTr)) {
      err(`${label}.${key}: {{var}} kümesi TR ile uyuşmuyor (TR: [${[...varsTr]}] · dil: [${[...varsHere]}])`);
    }

    const tokHere = tokenCounts(val);
    const tokTr = tokenCounts(trVal);
    if (!countsEqual(tokHere, tokTr)) {
      err(`${label}.${key}: yapısal token sayıları TR ile uyuşmuyor`);
    }

    const tagHere = htmlTagCounts(val);
    const tagTr = htmlTagCounts(trVal);
    if (!countsEqual(tagHere, tagTr)) {
      err(`${label}.${key}: HTML etiket sayıları TR ile uyuşmuyor`);
    }

    if (checkBraceBalance && !braceBalanced(val)) {
      err(`${label}.${key}: süslü parantez dengesiz (JSON-gömülü prompt riski)`);
    }
  }
}

/* ── detect sözlüğü denetimi — regex/obje değerler, string denetimi uygulanmaz ── */
function validateDetectDict(label, dict, trRef) {
  if (!dict || typeof dict !== 'object' || Array.isArray(dict)) {
    err(`${label}: export bir düz obje değil`);
    return;
  }
  for (const [key, val] of Object.entries(dict)) {
    if (!(key in trRef)) { err(`${label}: bilinmeyen anahtar (TR core'da yok) → ${key}`); continue; }
    const isRe = v => v instanceof RegExp;
    const isPatternArr = v => Array.isArray(v) && v.every(x => isRe(x) || (x && isRe(x.pattern)));
    if (!(isRe(val) || isPatternArr(val))) {
      err(`${label}.${key}: RegExp / RegExp[] / {pattern,extract}[] biçiminde değil`);
      continue;
    }
    if (Array.isArray(val) && val.length === 0) err(`${label}.${key}: boş dizi`);
  }
}

/* ── deste overlay denetimi (g) ──────────────────────────────────────────── */
function validateDesteOverlay(label, overlay, trIds) {
  if (!overlay || typeof overlay !== 'object' || Array.isArray(overlay)) {
    err(`${label}: export bir düz obje değil (id → patch beklenir)`);
    return;
  }
  for (const [id, patch] of Object.entries(overlay)) {
    if (!trIds.has(id)) { err(`${label}: bilinmeyen kart id (TR destede yok) → ${id}`); continue; }
    if (!patch || typeof patch !== 'object') { err(`${label}.${id}: patch obje değil`); continue; }
    for (const f of DECK_FORBIDDEN_FIELDS) {
      if (f in patch) err(`${label}.${id}: yasak alana dokunuyor → ${f} (donuk sözleşme)`);
    }
    for (const [f, v] of Object.entries(patch)) {
      if (DECK_FORBIDDEN_FIELDS.includes(f)) continue;
      if (typeof v === 'string' && v.trim() === '') err(`${label}.${id}.${f}: değer boş`);
      if (Array.isArray(v) && v.some(x => typeof x !== 'string' || x.trim() === '')) {
        err(`${label}.${id}.${f}: liste içinde boş/eksik öğe`);
      }
    }
  }
}

/* ── hukuk paketi denetimi ────────────────────────────────────────────────── */
function validateHukukDocs(label, docs) {
  const kinds = ['terms', 'privacy', 'ip'];
  for (const k of kinds) {
    const doc = docs?.[k];
    if (!doc) { err(`${label}: '${k}' belgesi eksik`); continue; }
    if (typeof doc.title !== 'string' || !doc.title.trim()) err(`${label}.${k}: title boş/eksik`);
    if (typeof doc.body !== 'string' || !doc.body.trim()) err(`${label}.${k}: body boş/eksik`);
    if (typeof doc.body === 'string' && !braceBalanced(doc.body)) err(`${label}.${k}: süslü parantez dengesiz`);
  }
}

/* Dosya-bazlı denetim adımlarının HER BİRİ izole edilir: bir dosyada syntax
   hatası veya runtime exception (ör. buildHukukDocs içinde bug) varsa script
   çiğ bir Node stack trace ile çökmez — okunur bir err() satırına döner ve
   diğer dosyaların denetimine devam eder. */
async function _tryStep(label, fn) {
  try {
    await fn();
  } catch (e) {
    err(`${label}: beklenmeyen hata → ${e?.message || e}`);
  }
}

/* ── --lang <xx> ──────────────────────────────────────────────────────────── */
async function validateLang(lang) {
  const trRef = await loadTrRefs();
  let touched = 0;

  const uiPath = join(I18N_DIR, `${lang}-ui.js`);
  if (existsSync(uiPath)) {
    touched++;
    await _tryStep(`${lang}-ui.js`, async () => {
      const mod = await importMod(uiPath);
      if (!mod.I18N_LANG) err(`${lang}-ui.js: I18N_LANG export edilmemiş`);
      else validateStringDict(`${lang}-ui`, mod.I18N_LANG, trRef.ui);
    });
  }

  const promptPath = join(I18N_DIR, `${lang}-prompt.js`);
  if (existsSync(promptPath)) {
    touched++;
    await _tryStep(`${lang}-prompt.js`, async () => {
      const mod = await importMod(promptPath);
      if (!mod.PROMPT_I18N_LANG) err(`${lang}-prompt.js: PROMPT_I18N_LANG export edilmemiş`);
      else validateStringDict(`${lang}-prompt`, mod.PROMPT_I18N_LANG, trRef.prompt, { checkBraceBalance: true });
    });
  }

  const detectPath = join(I18N_DIR, `${lang}-detect.js`);
  if (existsSync(detectPath)) {
    touched++;
    await _tryStep(`${lang}-detect.js`, async () => {
      const mod = await importMod(detectPath);
      if (!mod.DETECT_LANG) err(`${lang}-detect.js: DETECT_LANG export edilmemiş`);
      else validateDetectDict(`${lang}-detect`, mod.DETECT_LANG, trRef.detect);
    });
  }

  const destePath = join(I18N_DIR, `${lang}-deste.js`);
  if (existsSync(destePath)) {
    touched++;
    await _tryStep(`${lang}-deste.js`, async () => {
      const mod = await importMod(destePath);
      if (!mod.DESTE_OVERLAY) err(`${lang}-deste.js: DESTE_OVERLAY export edilmemiş`);
      else validateDesteOverlay(`${lang}-deste`, mod.DESTE_OVERLAY, trDeckIds());
    });
  }

  const hukukPath = join(I18N_DIR, `${lang}-hukuk.js`);
  if (existsSync(hukukPath)) {
    touched++;
    await _tryStep(`${lang}-hukuk.js`, async () => {
      const mod = await importMod(hukukPath);
      if (typeof mod.buildHukukDocs !== 'function') { err(`${lang}-hukuk.js: buildHukukDocs export edilmemiş`); return; }
      const docs = mod.buildHukukDocs({ HK_CONTACT: 'test@example.com', HK_EFFECTIVE: '2026-01-01' });
      validateHukukDocs(`${lang}-hukuk`, docs);
    });
  }

  if (!touched) {
    warn(`${lang}: js/parts/i18n/ altında hiçbir dosya bulunamadı (henüz yazılmamış)`);
  }
  return touched;
}

/* ── --gaps ───────────────────────────────────────────────────────────────── */
async function runGaps() {
  const trRef = await loadTrRefs();
  const files = existsSync(I18N_DIR) ? readdirSync(I18N_DIR) : [];
  const langs = [...new Set(
    files.filter(f => f.endsWith('-ui.js')).map(f => f.replace(/-ui\.js$/, ''))
  )].sort();

  if (!langs.length) {
    console.log('--gaps: js/parts/i18n/ altında henüz hiçbir *-ui.js yok — rapor edilecek dil bulunamadı.');
    return;
  }

  console.log('i18n --gaps · TR core anahtar sayısı: ' + Object.keys(trRef.ui).length);
  console.log('────────────────────────────────────────');
  for (const lang of langs) {
    try {
      const mod = await importMod(join(I18N_DIR, `${lang}-ui.js`));
      const dict = (mod.I18N_LANG && typeof mod.I18N_LANG === 'object') ? mod.I18N_LANG : {};
      const missing = Object.keys(trRef.ui).filter(k => !(k in dict));
      console.log(`${lang}: ${missing.length} eksik anahtar${missing.length ? ' → ' + missing.slice(0, 10).join(', ') + (missing.length > 10 ? ' …' : '') : ''}`);
    } catch (e) {
      console.log(`${lang}: OKUNAMADI → ${e?.message || e}`);
    }
  }
}

/* ── main ─────────────────────────────────────────────────────────────────── */
async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--gaps')) {
    await runGaps();
    return;
  }
  const langIdx = args.indexOf('--lang');
  const lang = langIdx >= 0 ? args[langIdx + 1] : null;
  if (!lang) {
    console.error('Kullanım: node scripts/i18n-validate.mjs --lang <xx>  |  --gaps');
    process.exit(1);
  }

  const touched = await validateLang(lang);

  for (const w of warnings) console.warn('⚠ ' + w);
  if (errors.length) {
    console.error(`✗ i18n-validate --lang ${lang}: ${errors.length} hata\n`);
    for (const e of errors) console.error('  - ' + e);
    process.exit(1);
  }
  console.log(`✓ i18n-validate --lang ${lang}: temiz (${touched} dosya denetlendi)`);
}

main().catch(e => {
  console.error('✗ i18n-validate: beklenmeyen çalışma-zamanı hatası → ' + (e?.stack || e));
  process.exit(1);
});
