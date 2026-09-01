/**
 * ROUTE KAPISI — `?view=` hedefleri gerçekle hizalı mı?
 *
 * FELSEFE (Emre):
 *   Bir kapı ya bir odaya açılır ya da kapı değildir. Kullanıcıyı adı olan
 *   ama odası olmayan bir hedefe göndermek, ona "burada bir şey var" deyip
 *   boşluk göstermektir — uygulamanın en sessiz yalanı.
 *
 * NEDEN BU KAPI (2026-08-17, FAZ 5):
 *   `ALLOWED_VIEWS` (03-auth-shell.js) zamanla gerçeğin önünde kaydı: 13 hedef
 *   listede duruyordu ama `#<ad>-view`'ları çoktan sökülmüştü. Sonuç kozmetik
 *   değildi — `switchView` ÖNCE bütün view'ların `active` sınıfını siler,
 *   SONRA hedefi bulamayıp `return` eder. Yani `?view=library` ekranda hiçbir
 *   şey bırakmıyordu: bomboş bir uygulama. Aynı anda dört canlı oda
 *   (`ayna`, `konusma`, `degerlendirme`, `hayalseans`) listede olmadığı için
 *   derin bağlantıyla açılamıyordu.
 *
 *   Kapı iki yönü de tutar: izinli her hedefin bir odası var mı, ve
 *   switchView'ın her dalı gerçek bir ekrana mı bakıyor.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_03 = readFileSync(join(ROOT, 'js/parts/03-auth-shell.js'), 'utf8');
const SRC_HTML = readFileSync(join(ROOT, '_src.html'), 'utf8');

/** _src.html'de gerçekten doğan ekranlar: `id="bugun-view"` → `bugun`. */
function gercekViewlar() {
  const set = new Set();
  for (const m of SRC_HTML.matchAll(/id="([a-zA-Z0-9_-]+)-view"/g)) set.add(m[1]);
  return set;
}

/** switchView'ın başındaki emeklilik köprüleri: `if (v === 'arketip' …) v = 'oik';`
    Alias envanteri elle yazılmaz — kaynaktan okunur ki köprü değişince kapı da
    değişsin. */
function aliaslar() {
  const map = new Map();
  for (const m of SRC_03.matchAll(/if \(([^)]*v === '[^']+'[^)]*)\)\s*v = '([^']+)';/g)) {
    for (const q of m[1].matchAll(/v === '([^']+)'/g)) map.set(q[1], m[2]);
  }
  return map;
}

function allowedViews() {
  const blok = SRC_03.match(/const ALLOWED_VIEWS = new Set\(\[([\s\S]*?)\]\)/);
  if (!blok) return [];
  const yorumsuz = blok[1].replace(/\/\/.*$/gm, '');
  return [...yorumsuz.matchAll(/'([^']+)'/g)].map(m => m[1]);
}

/** switchView gövdesindeki `v === 'X'` hedefleri (dallar + köprüler). */
function switchViewHedefleri() {
  const anchor = SRC_03.indexOf('export function switchView(v) {');
  const basla = SRC_03.indexOf('{', anchor);
  let derinlik = 0, govde = '';
  for (let i = basla; i < SRC_03.length; i++) {
    if (SRC_03[i] === '{') derinlik++;
    else if (SRC_03[i] === '}' && --derinlik === 0) { govde = SRC_03.slice(basla, i + 1); break; }
  }
  const yorumsuz = govde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  return [...new Set([...yorumsuz.matchAll(/v === '([^']+)'/g)].map(m => m[1]))];
}

describe('ALLOWED_VIEWS — izinli hedeflerin odası var', () => {
  const views = gercekViewlar();
  const alias = aliaslar();
  const izinli = allowedViews();

  it('liste okunabiliyor ve boş değil', () => {
    expect(izinli.length).toBeGreaterThan(10);
    expect(views.has('bugun')).toBe(true);
  });

  it('her izinli hedef ya gerçek bir ekran ya da canlı bir ada çevriliyor', () => {
    const yetim = izinli.filter(v => !views.has(v) && !(alias.has(v) && views.has(alias.get(v))));
    expect(yetim).toEqual([]);
  });

  it('Derin Çalışma ve oradan açılan dört oda derin bağlantıyla açılabiliyor', () => {
    for (const v of ['derincalisma', 'ayna', 'konusma', 'degerlendirme', 'hayalseans']) {
      expect(izinli).toContain(v);
    }
  });

  it('sökülmüş ekranlar listeye geri sızmamış', () => {
    for (const olu of ['library', 'challenge', 'manifesto', 'journey', 'history', 'summaries', 'cards']) {
      expect(izinli).not.toContain(olu);
    }
  });
});

describe('switchView — her dal gerçek bir ekrana bakıyor', () => {
  const views = gercekViewlar();
  const alias = aliaslar();

  it('emeklilik köprüleri canlı bir hedefe çeviriyor', () => {
    expect(alias.size).toBeGreaterThan(0);
    for (const [eski, yeni] of alias) {
      expect(views.has(yeni), `${eski} → ${yeni} köprüsü ölü hedefe bakıyor`).toBe(true);
    }
  });

  it('gövdedeki hiçbir `v === \'…\'` dalı odası olmayan bir ada bakmıyor', () => {
    const yetim = switchViewHedefleri().filter(v => !views.has(v) && !alias.has(v));
    expect(yetim).toEqual([]);
  });
});
