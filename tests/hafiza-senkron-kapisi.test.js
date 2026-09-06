// @vitest-environment node
// Betiği gerçekten koşturur (sahte dizinlerle) — DOM'a hiç dokunmaz.

/**
 * HAFIZA SENKRON KAPISI — "hiçbir kolda sessiz silme yok" cümlesini ölçer.
 *
 * `scripts/hafiza-senkron.sh` bu cümleyi banner'ında yazıyordu ama `disa`
 * kolu `rsync -a --delete` ile tam olarak sessiz silme yapıyordu. Ölçüldü
 * (2026-09-05): hafızanın repo türevine uzak oturumdan yazılan bir dosya,
 * Emre'nin ilk senkronunda iz bırakmadan ölüyordu — ve bunu kimse görmezdi,
 * çünkü silme başarı çıktısının içinde kayboluyordu.
 *
 * Kırık koda değil SÖZLEŞMEYE aitti: yazılı kural doğruydu, kod ona
 * uymuyordu ve hiçbir şey ikisini karşılaştırmıyordu. Bu dosya o
 * karşılaştırmadır.
 *
 * Betik ölçülebilir olsun diye iki env override taşır —
 * `WANDERER_HAFIZA_KAYNAK` ve `WANDERER_HAFIZA_TUREV`. Kalıp PROTOKOL
 * §3.3'ün `WANDERER_CHROMIUM` zinciriyle aynıdır: kapı gerçek hafızaya
 * dokunmadan koşar. Ölçülemeyen bir kuralı ölçülebilir kılmanın yolu
 * kuralı gevşetmek değil, KODUN BİÇİMİNİ değiştirmektir (§6.6).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BETIK = join(ROOT, 'scripts/hafiza-senkron.sh');

let kok, kaynak, turev;

function kos(...args) {
  return spawnSync('bash', [BETIK, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, WANDERER_HAFIZA_KAYNAK: kaynak, WANDERER_HAFIZA_TUREV: turev },
  });
}

beforeEach(() => {
  kok = mkdtempSync(join(tmpdir(), 'hafiza-senkron-'));
  kaynak = join(kok, 'kaynak');
  turev = join(kok, 'turev');
  mkdirSync(kaynak, { recursive: true });
  mkdirSync(turev, { recursive: true });
});
afterEach(() => { try { rmSync(kok, { recursive: true, force: true }); } catch (_) {} });

describe('hafıza senkronu — disa sessizce silmiyor', () => {
  it('silinecek yokken sorunsuz tazeler', () => {
    writeFileSync(join(kaynak, 'a.md'), 'bir\n');
    const r = kos('disa');
    expect(r.status).toBe(0);
    expect(existsSync(join(turev, 'a.md'))).toBe(true);
  });

  it('türevde fazladan dosya varsa DURUR, adını söyler ve dosyayı SİLMEZ', () => {
    writeFileSync(join(kaynak, 'a.md'), 'bir\n');
    writeFileSync(join(turev, 'repo-tarafinda-yazildi.md'), 'uzak oturumun hafızası\n');

    const r = kos('disa');
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('repo-tarafinda-yazildi.md');
    // Asıl iddia: dosya hâlâ yerinde.
    expect(existsSync(join(turev, 'repo-tarafinda-yazildi.md'))).toBe(true);
    expect(readFileSync(join(turev, 'repo-tarafinda-yazildi.md'), 'utf8'))
      .toContain('uzak oturumun hafızası');
  });

  it('durduğunda doğru yeri gösterir — .claude/memories/', () => {
    writeFileSync(join(turev, 'yetim.md'), 'x\n');
    const r = kos('disa');
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('.claude/memories/');
    expect(r.stdout).toContain('--sil');
  });

  it('--sil ile silme bilinçli olarak yapılır', () => {
    writeFileSync(join(kaynak, 'a.md'), 'bir\n');
    writeFileSync(join(turev, 'yanlislanan.md'), 'artık doğru değil\n');

    const r = kos('disa', '--sil');
    expect(r.status).toBe(0);
    expect(existsSync(join(turev, 'yanlislanan.md'))).toBe(false); // §7: yanlışlanan hafıza silinir
    expect(existsSync(join(turev, 'a.md'))).toBe(true);
  });
});

describe('hafıza senkronu — ice lokali ezmiyor', () => {
  it('türevi içe alır ama kaynaktaki fazlalığı silmez', () => {
    writeFileSync(join(turev, 'repodan.md'), 'repo\n');
    writeFileSync(join(kaynak, 'lokalde-yeni.md'), 'lokal\n');

    const r = kos('ice');
    expect(r.status).toBe(0);
    expect(existsSync(join(kaynak, 'repodan.md'))).toBe(true);
    expect(existsSync(join(kaynak, 'lokalde-yeni.md'))).toBe(true);
  });
});

describe('hafıza senkronu — fark bir kapıdır', () => {
  it('aynıysa 0, farklıysa 1 döner', () => {
    writeFileSync(join(kaynak, 'a.md'), 'bir\n');
    writeFileSync(join(turev, 'a.md'), 'bir\n');
    expect(kos('fark').status).toBe(0);

    writeFileSync(join(turev, 'b.md'), 'iki\n');
    const r = kos('fark');
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('FARK VAR');
  });
});

describe('hafıza senkronu — sözleşme kodda da yazılı', () => {
  it('banner sessiz silme yasağını beyan eder ve kod onu uygular', () => {
    const kaynakMetni = readFileSync(BETIK, 'utf8');
    expect(kaynakMetni).toContain('hiçbir kolda sessiz silme yok');
    // Beyanın kodda karşılığı: silinecekler ÖNCE hesaplanır ve gösterilir.
    expect(kaynakMetni).toContain('fazlalik');
    // Ve köprü, olmayabilecek bir araca yaslanmaz (uzak oturum kabında rsync yoktu).
    expect(kaynakMetni).not.toMatch(/^[^#\n]*\brsync\b/m);
  });

  it('bilinmeyen komutta kullanım basar ve 2 döner', () => {
    const r = kos('zzsinav');
    expect(r.status).toBe(2);
    expect(r.stdout).toContain('Kullanım:');
  });
});

/* ─── HAFIZA DÜZENİ — iki depo, iki rol ─── */

/**
 * Hafıza bu repoda İKİ dizinde yaşar ve bu bir kaza değil, tasarımdır:
 *   .claude/hafiza/    → Emre'nin lokal hafızasının AYNASI (senkron tazeler)
 *   .claude/memories/  → repo tarafında, koda karşı yazılan hafıza
 *
 * Ayrım gerekli çünkü senkronun kaynağı repo değildir: aynaya repo tarafından
 * yazılan bir dosyanın kaynakta karşılığı yoktur. Eskiden sessizce siliniyordu;
 * artık senkron durup soruyor (yukarıdaki bloklar). Doğru cevap ise dosyayı
 * memories/ altına koymaktır — bu yüzden iki depo.
 *
 * Bu bloğun koruduğu tek şey şudur: ikilik ANLAMLI kalmalı. Aynı adın iki
 * depoda BİREBİR AYNI kopyası dururken ikilik bir role değil bir kazaya
 * dönüşür — o an biri silinmelidir. Farklı içerik ihlal DEĞİLDİR: ayna
 * kararın niçin verildiğini, repo sürümü bugün kodda nerede durduğunu taşır.
 */
describe('hafıza düzeni — ikilik anlamlı kalıyor', () => {
  const AYNA = join(ROOT, '.claude/hafiza');
  const REPO_DEPO = join(ROOT, '.claude/memories');

  it('iki depo da duruyor ve rolleri yazılı', () => {
    expect(existsSync(AYNA)).toBe(true);
    expect(existsSync(REPO_DEPO)).toBe(true);
    const rol = readFileSync(join(REPO_DEPO, 'README.md'), 'utf8');
    expect(rol).toContain('.claude/hafiza/');
    expect(rol).toMatch(/ayna/i);
  });

  it('aynı ad iki depoda birebir aynı içerikle durmuyor', () => {
    const { readdirSync } = require('node:fs');
    const md = (d) => readdirSync(d).filter((f) => f.endsWith('.md') && f !== 'README.md');
    const ortak = md(AYNA).filter((f) => md(REPO_DEPO).includes(f));

    const kopya = ortak.filter((f) =>
      readFileSync(join(AYNA, f), 'utf8') === readFileSync(join(REPO_DEPO, f), 'utf8')
    );

    if (kopya.length) {
      throw new Error(
        `${kopya.length} dosya iki depoda BİREBİR AYNI:\n` +
        kopya.map((f) => `  ${f}`).join('\n') +
        '\n\nBirebir kopya bir rol değil bir kazadır: iki yerde tek gerçek olur ve\n' +
        'hangisinin güncelleneceği belirsizleşir (§1.3). Aynadakini bırak,\n' +
        '.claude/memories/ altındakini sil — ya da repo sürümünü gerçekten\n' +
        'ayrıştıracak bilgiyi (dosya:satır çapaları) ekle.'
      );
    }
    expect(kopya).toEqual([]);
  });
});
