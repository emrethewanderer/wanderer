/**
 * YETİM KÖPRÜ KAPISI — "sessizce hiçbir şey yapmayan çağrı"nın vitest bekçisi.
 *
 * scripts/yetim-kopru-denetci.mjs'i koşar; repoda karşılığı expose edilmemiş
 * bir `window.foo?.()` çağrısı belirirse bu test KIRILIR. Kalıbı
 * tests/gerceklik-kapisi.test.js ile aynıdır (spawnSync + exit kodu) — çalışan
 * kapı deseni yeniden kullanıldı, yenisi icat edilmedi.
 *
 * Neden ayrı bir kapı: bu kırık sınıfı ne konsolu kızartır ne testi kırar.
 * Optional chaining hatayı yutar, özellik yalnızca yapılmaz. 2026-08-07
 * denetiminde altı tane bulundu — ikisi LLM'e giden bağlamı sessizce
 * boşaltıyordu. Elle bulunan şey, ikinci kez elle bulunmasın.
 *
 * İKİNCİ SINIF (2026-08-19): köprü hiç kurulmamış, ad doğrudan çağrılmış —
 * `getUserFirstName()`. Bare identifier build'i sessizce geçer, runtime'da
 * ReferenceError fırlar, çağıranın try/catch'i yutar. Altı vaka bulundu;
 * biri `w3GenerateDeepSummary`'yi her çağrıda öldürüyordu (hiç gün özeti
 * yazılmadı → Geçmiş Günler ebediyen boş).
 *
 * Son iki describe bloğu kapının KENDİSİNİ sınar: yeşil kalmak için ihlali
 * yakalayabildiğini de kanıtlamalı. Yakalamayan bir kapı, kapı değildir.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DENETCI = join(ROOT, 'scripts/yetim-kopru-denetci.mjs');

function kos(args = []) {
  return spawnSync('node', [DENETCI, ...args], { cwd: ROOT, encoding: 'utf8' });
}

describe('yetim köprü kapısı · repo', () => {
  it('repoda karşılıksız window.* çağrısı yok', () => {
    const r = kos();
    expect(r.stdout + r.stderr).toMatch(/Yetim köprü yok/);
    expect(r.status).toBe(0);
  });
});

describe('yetim köprü kapısı · kapının kendisi', () => {
  /** Geçici bir kökte tek dosyalık senaryo kurar, denetçiyi ona salar. */
  function senaryo(icerik) {
    const dizin = mkdtempSync(join(tmpdir(), 'yetim-'));
    writeFileSync(join(dizin, 'ornek.js'), icerik, 'utf8');
    try { return kos(['--dizin', dizin]); } finally { rmSync(dizin, { recursive: true, force: true }); }
  }

  it('expose edilmemiş çağrıyı YAKALAR', () => {
    const r = senaryo('function f(){ try { window.hicYokBirSey?.(); } catch (_) {} }\n');
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/hicYokBirSey/);
  });

  it('expose edilmiş çağrıyı yakalamaz (yanlış alarm yok)', () => {
    const r = senaryo(
      'export function varOlan(){ return 1; }\n' +
      'function f(){ window.varOlan?.(); }\n' +
      'if (typeof window !== "undefined") { window.varOlan = varOlan; }\n'
    );
    expect(r.status).toBe(0);
  });

  it('Object.assign(window, {…}) hub\'ıyla expose edileni de görür', () => {
    // Tek satırlık hub biçimi (00f deseni) bir kez kaçmıştı ve o dosyanın
    // TÜM expose'ları yetim görünmüştü — 22 çağrılık yanlış alarm.
    const r = senaryo(
      'function a(){} function b(){}\n' +
      'function f(){ window.a?.(); window.b?.(); }\n' +
      'Object.assign(window, { a, b });\n'
    );
    expect(r.status).toBe(0);
  });

  it('tarayıcı yerleşiklerini ihlal saymaz', () => {
    const r = senaryo('function f(){ window.getSelection(); window.matchMedia("(min-width:0)"); window.focus(); }\n');
    expect(r.status).toBe(0);
  });

  it('YETIM-MUAF beyanı olan satırı geçer', () => {
    const r = senaryo('function f(){ window.disKabukKoprusu?.(); /* YETIM-MUAF: native kabuk enjekte eder */ }\n');
    expect(r.status).toBe(0);
  });

  it('yorum satırındaki çağrıyı ihlal saymaz', () => {
    const r = senaryo('// window.ornekCagri?.() — belgede anılan ad\nfunction f(){ return 1; }\n');
    expect(r.status).toBe(0);
  });

  it('--liste ihlali gösterir ama zinciri kırmaz', () => {
    const r = senaryo('function f(){ window.hicYokBirSey?.(); }\n');
    expect(r.status).toBe(1);
    const l = kos(['--liste', '--dizin', join(ROOT, 'js')]);
    expect(l.status).toBe(0);
  });
});

describe('yetim köprü kapısı · ikinci sınıf (importsuz bare çağrı)', () => {
  /** Çok dosyalı senaryo: bu sınıf iki dosya ister — biri export eder, biri çağırır. */
  function senaryoCok(dosyalar) {
    const dizin = mkdtempSync(join(tmpdir(), 'yetim2-'));
    for (const [ad, icerik] of Object.entries(dosyalar)) writeFileSync(join(dizin, ad), icerik, 'utf8');
    try { return kos(['--dizin', dizin]); } finally { rmSync(dizin, { recursive: true, force: true }); }
  }

  it('başka modülde export edilmiş adın importsuz çağrısını YAKALAR', () => {
    const r = senaryoCok({
      'kaynak.js': 'export function getUserFirstName(){ return "Emre"; }\n',
      'cagiran.js': 'function uret(){ const ad = getUserFirstName(); return ad; }\n',
    });
    expect(r.status).toBe(1);
    expect(r.stdout).toMatch(/getUserFirstName/);
    expect(r.stdout).toMatch(/ReferenceError/);
  });

  it('import edilmişse yakalamaz', () => {
    const r = senaryoCok({
      'kaynak.js': 'export function getUserFirstName(){ return "Emre"; }\n',
      'cagiran.js': 'import { getUserFirstName } from "./kaynak.js";\nfunction uret(){ return getUserFirstName(); }\n',
    });
    expect(r.status).toBe(0);
  });

  it('window köprüsü varsa ikinci sınıf saymaz (birinci sınıfın alanı)', () => {
    const r = senaryoCok({
      'kaynak.js': 'export function koprulu(){ return 1; }\nif (typeof window !== "undefined") { window.koprulu = koprulu; }\n',
      'cagiran.js': 'function f(){ return koprulu(); }\n',
    });
    expect(r.status).toBe(0);
  });

  it('destructuring parametresiyle gelen adı yanlış alarma çevirmez', () => {
    // 12b2 deseni: buildDeckData({ getAllArchetypeData, … }) — ad parametredir,
    // yetim değildir. Bu regresyon ilk taramada tek false positive'ti.
    const r = senaryoCok({
      'kaynak.js': 'export function getAllArchetypeData(){ return []; }\n',
      'cagiran.js': 'export function buildDeckData({ getAllArchetypeData, RARITIES }) {\n' +
                    '  let core; try { core = getAllArchetypeData() || []; } catch (_) { core = []; }\n' +
                    '  return core.length + RARITIES.length;\n}\n',
    });
    expect(r.status).toBe(0);
  });

  it('yorumda ve dizede anılan adı ihlal saymaz', () => {
    const r = senaryoCok({
      'kaynak.js': 'export function anilanAd(){ return 1; }\n',
      'cagiran.js': '/* anilanAd() burada yalnız anlatılıyor */\n' +
                    'const not = "anilanAd() çağrısı belgede geçer";\n' +
                    'function f(){ return not.length; }\n',
    });
    expect(r.status).toBe(0);
  });

  it('YETIM-MUAF beyanı ikinci sınıfta da geçerli', () => {
    const r = senaryoCok({
      'kaynak.js': 'export function disaridanGelen(){ return 1; }\n',
      'cagiran.js': 'function f(){ return disaridanGelen(); /* YETIM-MUAF: native kabuk global olarak enjekte eder */ }\n',
    });
    expect(r.status).toBe(0);
  });

  /* ─── Template literal körlüğü (2026-08-19) ───
     Denetçi eskiden template literal'leri tek "dize" sayıp siliyordu; iç içe
     `${...}` yüzünden 06'nın %83'ü, 11'in %84'ü hiç taranmıyordu. O kör alanda
     üç gerçek yetim yaşadı — biri her geçmiş seans açılışında, biri her
     kullanıcı mesajı çiziminde ReferenceError atıyordu. */
  it('template literal içindeki bare çağrıyı yakalar', () => {
    const r = senaryoCok({
      'kaynak.js': 'export function sahneCiz(){ return "x"; }\n',
      'cagiran.js': 'function f(el){\n' +
                    '  el.innerHTML = `<div class="a">${sahneCiz()}</div>`;\n' +
                    '}\n',
    });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('sahneCiz');
  });

  it('template literal DÜZ METNİNDEKİ sahte çağrıyı ihlal saymaz', () => {
    const r = senaryoCok({
      'kaynak.js': 'export function anlatilanAd(){ return 1; }\n',
      'cagiran.js': 'function f(el){\n' +
                    '  el.innerHTML = `<p>Belgede anlatilanAd() diye geçer</p>`;\n' +
                    '}\n',
    });
    // Düz metindeki ad da taranır — bilinçli seçim: yanlış alarmın bedeli,
    // kaçırılan yetimin bedelinden düşüktür (ölçüm: repoda tek ek şüpheli,
    // o da gerçek çıktı). Bilinçli istisna YETIM-MUAF ile beyan edilir.
    expect(r.status).toBe(1);
  });

  it('tanımı template literal içinde geçen adı yetim sanmaz', () => {
    // Tanımlar HAM kaynaktan toplanır; gövde temizliği yalnız kullanımı arar.
    const r = senaryoCok({
      'kaynak.js': 'export function disariAd(){ return 1; }\n',
      'cagiran.js': 'import { disariAd } from "./kaynak.js";\n' +
                    'function f(el){ el.innerHTML = `<b>${disariAd()}</b>`; }\n',
    });
    expect(r.status).toBe(0);
  });
});
