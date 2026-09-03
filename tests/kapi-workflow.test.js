// @vitest-environment node
/**
 * KAPI WORKFLOW KAPISI — .github/workflows/kapi.yml
 *
 * Ölçen aletin kendisi ölçülmezse ölçüm bir teselli olur
 * (PROTOKOL-FABLE.md §10.5).
 *
 * Bu workflow repodaki BÜTÜN kapıların tetiğidir; sessizce gevşerse
 * 3.600 test her koşuda yeşil yanar ve hiçbiri koşmaz. Burada sınanan iki
 * şey var:
 *
 *   1. "Ağaç kimliği" adımının YARGISI — hangi ağacı sınanmış sayıyor.
 *      Script YAML'dan çıkarılıp GERÇEK git depolarında koşturulur; sahte
 *      bir kurgu değil, `git merge`in kendi ürettiği ağaçlar karşılaştırılır.
 *   2. Guard'ın KAPSAMI — pahalı adımların hepsi ona bağlı mı. Yeni bir adım
 *      eklenip `if` unutulursa kapı yarım koşar ve bunu kimse görmez.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const YML = fs.readFileSync(path.join(KOK, '.github/workflows/kapi.yml'), 'utf8');

/* ─── 1. BÖLÜM · Guard script'ini YAML'dan çıkar ─── */

// `- name: Ağaç kimliği` bloğundaki `run: |` gövdesini alır ve GitHub
// ifadelerini kabuk değişkenlerine çevirir — böylece script koşturulabilir.
function agacScriptiCikar(yml) {
  const blok = yml.split('- name: Ağaç kimliği')[1].split('- name: Node kur')[0];
  const satirlar = blok.split('\n');
  const runIdx = satirlar.findIndex((s) => s.trim() === 'run: |');
  const govde = satirlar.slice(runIdx + 1);
  const girinti = govde.find((s) => s.trim())?.match(/^\s*/)[0].length ?? 0;
  return govde
    .map((s) => s.slice(girinti))
    .join('\n')
    .replace(/\$\{\{\s*github\.event_name\s*\}\}/g, '$OLAY')
    .replace(/\$\{\{\s*github\.event\.pull_request\.head\.sha\s*\}\}/g, '$HEAD_SHA');
}

const SCRIPT = agacScriptiCikar(YML);

/* ─── 2. BÖLÜM · Gerçek git depoları ─── */

const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8' }).trim();

// main'den bir dal açar, üstüne bir commit atar; `baseIlerlesin` ise merge'den
// ÖNCE main'e ayrı bir commit koyar — birleşmiş ağaç o zaman dalınkinden ayrılır.
function depoKur(baseIlerlesin) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'kapi-agac-'));
  git(d, 'init', '-q', '-b', 'main');
  git(d, 'config', 'user.email', 'kapi@test');
  git(d, 'config', 'user.name', 'Kapı');
  fs.writeFileSync(path.join(d, 'f.txt'), 'temel\n');
  git(d, 'add', '-A');
  git(d, 'commit', '-qm', 'temel');

  git(d, 'checkout', '-qb', 'dal');
  fs.writeFileSync(path.join(d, 'f.txt'), 'dalın işi\n');
  git(d, 'add', '-A');
  git(d, 'commit', '-qm', 'dal işi');
  const headSha = git(d, 'rev-parse', 'HEAD');

  git(d, 'checkout', '-q', 'main');
  if (baseIlerlesin) {
    fs.writeFileSync(path.join(d, 'baska.txt'), 'base ilerledi\n');
    git(d, 'add', '-A');
    git(d, 'commit', '-qm', 'base ilerledi');
  }
  // refs/pull/N/merge tam olarak budur: parent1 base, parent2 dal head.
  git(d, 'merge', '--no-ff', '-q', 'dal', '-m', 'merge');
  return { d, headSha };
}

// Guard'ı bash ile koşturur, $GITHUB_OUTPUT'a yazdığı kararı döndürür.
function guardKostur({ cwd, olay = 'pull_request', headSha = 'sha-yok' }) {
  const cikti = path.join(cwd, '.gh-output');
  fs.writeFileSync(cikti, '');
  const log = execFileSync('bash', ['-c', SCRIPT], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GITHUB_OUTPUT: cikti, OLAY: olay, HEAD_SHA: headSha },
  });
  const ham = fs.readFileSync(cikti, 'utf8');
  return { karar: ham.match(/kos=(\w+)/)?.[1], log };
}

describe('Ağaç kimliği — guard\'ın yargısı', () => {
  let ayni, farkli;
  beforeAll(() => {
    ayni = depoKur(false);
    farkli = depoKur(true);
  });

  it('base ilerlemediyse birleşmiş ağaç dalın ağacıdır → KOŞMAZ', () => {
    // Emre'nin gördüğü "1 in progress, 1 successful" tam olarak bu hâldi:
    // beş PR'nin beşinde de merge ağacı head ağacına eşitti.
    expect(git(ayni.d, 'rev-parse', 'HEAD^{tree}'))
      .toBe(git(ayni.d, 'rev-parse', 'HEAD^2^{tree}'));

    const { karar, log } = guardKostur({ cwd: ayni.d, headSha: ayni.headSha });
    expect(karar).toBe('hayir');
    expect(log).toContain('AYNI AĞAÇ');
  });

  it('base ilerlediyse birleşmiş ağaç HENÜZ SINANMAMIŞTIR → KOŞAR', () => {
    // Kuralın ("koşulan ağaç, commit'lenen ağaç olmalı") korumak istediği hâl
    // budur ve guard onu SÖKMEZ — yalnız ölçer.
    expect(git(farkli.d, 'rev-parse', 'HEAD^{tree}'))
      .not.toBe(git(farkli.d, 'rev-parse', 'HEAD^2^{tree}'));

    const { karar, log } = guardKostur({ cwd: farkli.d, headSha: farkli.headSha });
    expect(karar).toBe('evet');
    expect(log).toContain('FARKLI AĞAÇ');
  });

  it('push/workflow_dispatch koşusunda ağaç koşulsuz sınanır', () => {
    for (const olay of ['push', 'workflow_dispatch']) {
      expect(guardKostur({ cwd: ayni.d, olay }).karar).toBe('evet');
    }
  });

  it('ağaç okunamıyorsa şüphe kapıyı GEVŞETMEZ — koşar', () => {
    // Merge commit'i olmayan bir depo: HEAD^2 çözülmez. Sessizce "hayir"
    // demek, sınanmamış bir ağacı geçmiş saymak olurdu.
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'kapi-tek-'));
    git(d, 'init', '-q', '-b', 'main');
    git(d, 'config', 'user.email', 'kapi@test');
    git(d, 'config', 'user.name', 'Kapı');
    fs.writeFileSync(path.join(d, 'f.txt'), 'tek\n');
    git(d, 'add', '-A');
    git(d, 'commit', '-qm', 'tek');

    const { karar, log } = guardKostur({ cwd: d });
    expect(karar).toBe('evet');
    expect(log).toContain('OKUNAMADI');
  });
});

describe('Guard\'ın kapsamı — hiçbir pahalı adım dışarıda kalmaz', () => {
  const PAHALI = [
    'Node kur', 'Bağımlılıklar', 'Build', 'Tip kontrolü',
    'Doğrulama tarayıcısı (duman)', 'Tam süit', 'Bağımlılık açıkları',
  ];

  it.each(PAHALI)('"%s" adımı guard\'a bağlı', (ad) => {
    const blok = YML.split(`- name: ${ad}`)[1].split('\n      - ')[0];
    expect(blok).toContain("if: steps.agac.outputs.kos == 'evet'");
  });

  it('YAML\'daki her `- name:` adımı ya guard\'lı ya bilinçli muaf', () => {
    // Yeni bir adım eklenip `if` unutulursa kapı yarım koşar; bu test onu
    // ADLANDIRIR — muafiyet listesi elle genişletilmeden test kırmızı kalır.
    const MUAF = ['Ağaç kimliği']; // yargıyı üreten adımın kendisi
    const adlar = [...YML.matchAll(/^      - name: (.+)$/gm)].map((m) => m[1].trim());
    const guardsiz = adlar.filter((ad) => {
      const blok = YML.split(`- name: ${ad}`)[1].split('\n      - ')[0];
      return !blok.includes("if: steps.agac.outputs.kos == 'evet'");
    });
    expect(guardsiz).toEqual(MUAF);
  });
});

describe('Tetikler ve kimlik', () => {
  it('push ve pull_request tetikleri DURUYOR — guard tetiği sökmedi', () => {
    // Çifte koşunun gerekçesi ölçülebilir yapıldı, ortadan kaldırılmadı.
    expect(YML).toMatch(/^  push:$/m);
    expect(YML).toMatch(/^  pull_request:$/m);
    expect(YML).toMatch(/branches: \['\*\*'\]/);
  });

  it('checkout ağaç karşılaştırmasına yetecek derinlikte', () => {
    // HEAD^2 olmadan guard körleşir ve her PR'de "OKUNAMADI"ya düşerdi.
    // Satır başına bağlı: yorumda geçen bir `fetch-depth: 0` ifadesi
    // testi kandırmasın — ilk taslakta tam olarak bu oldu.
    const d = YML.match(/^\s+fetch-depth:\s*(\d+)/m);
    expect(d).not.toBeNull();
    expect(Number(d[1])).toBeGreaterThanOrEqual(2);
  });

  it('job adı event\'e göre ayrışır — iki koşu PR sayfasında karışmaz', () => {
    expect(YML).toContain("github.event_name == 'pull_request' && 'birleşmiş ağaç' || 'dal ağacı'");
  });
});
