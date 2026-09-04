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
    .replace(/\$\{\{\s*github\.event\.pull_request\.head\.sha\s*\}\}/g, '$HEAD_SHA')
    .replace(/\$\{\{\s*github\.token\s*\}\}/g, '$GH_TOKEN');
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

const DAL_KOSUSU = 'dal ağacı · build · süit · denetçiler';

// Checks API'sinin yerine geçen sahte `curl`: yanıtı dosyadan basar. `cevap`
// null ise API susmuş/çökmüş demektir (exit 1) — guard'ın en önemli sınırı bu.
function sahteCurlKur(dizin, cevap) {
  const bin = path.join(dizin, 'sahte-bin');
  fs.mkdirSync(bin, { recursive: true });
  const yanit = path.join(bin, 'yanit.json');
  fs.writeFileSync(yanit, cevap === null ? '' : JSON.stringify(cevap));
  fs.writeFileSync(
    path.join(bin, 'curl'),
    cevap === null ? '#!/bin/sh\nexit 1\n' : `#!/bin/sh\ncat ${JSON.stringify(yanit)}\n`,
    { mode: 0o755 },
  );
  return bin;
}

// Guard'ı bash ile koşturur, $GITHUB_OUTPUT'a yazdığı kararı döndürür.
// `cevap` verilmezse kanıt DOLUDUR (mutlu yol); null → API susar.
function guardKostur({ cwd, olay = 'pull_request', headSha = 'sha-yok', cevap }) {
  const cikti = path.join(cwd, '.gh-output');
  fs.writeFileSync(cikti, '');
  const varsayilan = { check_runs: [{ name: DAL_KOSUSU, conclusion: 'success' }] };
  const bin = sahteCurlKur(cwd, cevap === undefined ? varsayilan : cevap);
  const log = execFileSync('bash', ['-c', SCRIPT], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      GITHUB_OUTPUT: cikti,
      OLAY: olay,
      HEAD_SHA: headSha,
      GH_TOKEN: 'sahte',
      GITHUB_API_URL: 'https://api.github.test',
      GITHUB_REPOSITORY: 'emrethewanderer/wanderer',
      DAL_KOSUSU,
    },
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

  it('aynı ağaç + dal koşusu KANITLI geçmiş → KOŞMAZ', () => {
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

  it('SHALLOW fetch (fetch-depth: 2) ağacı okumaya yeter', () => {
    // Guard'ın en kırılgan varsayımı: `actions/checkout` PR koşusunda
    // `refs/pull/N/merge`i SIĞ çeker. İkinci parent orada çözülmezse guard
    // her PR'de "OKUNAMADI"ya düşer ve sessizce işlevsizleşir — kapı yanlış
    // yeşil vermez ama Emre'nin beklemesi de bitmez. Burada checkout'un
    // yaptığı şeyin aynısı kurulur: bare uzak + `--depth=2` fetch.
    const uzak = depoKur(false).d;
    execFileSync('git', ['update-ref', 'refs/pull/1/merge', 'HEAD'], { cwd: uzak });

    const klon = fs.mkdtempSync(path.join(os.tmpdir(), 'kapi-sig-'));
    git(klon, 'init', '-q');
    git(klon, 'remote', 'add', 'origin', uzak);
    git(klon, 'fetch', '-q', '--depth=2', 'origin', 'refs/pull/1/merge');
    git(klon, 'checkout', '-q', 'FETCH_HEAD');
    expect(git(klon, 'rev-parse', '--is-shallow-repository')).toBe('true');

    const { karar, log } = guardKostur({ cwd: klon });
    expect(karar).toBe('hayir');
    expect(log).toContain('AYNI AĞAÇ');
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

describe('Kanıt kapısı — ağaç eşitliği "sınandı" demek DEĞİLDİR', () => {
  // Denetimin (Sonnet, 2026-09-03) K1 bulgusu: guard yalnız ağaç kimliğine
  // bakıp "dal push'unda sınandı" diyordu. En net kırık hâli fork PR'idir —
  // `push` tetiği yalnız BU repodaki push'larda koşar, yani fork'tan gelen
  // dalın ağacı hiç sınanmamıştır ama ağaç kimliği yine eşit çıkar.
  let ayni;
  beforeAll(() => { ayni = depoKur(false); });

  it('fork PR\'i: dal koşusu HİÇ YOK → kapı tam koşar', () => {
    const { karar, log } = guardKostur({ cwd: ayni.d, cevap: { check_runs: [] } });
    expect(karar).toBe('evet');
    expect(log).toContain('KANIT YOK');
  });

  it('dal koşusu KIRMIZI kapanmışsa → kapı tam koşar', () => {
    const cevap = { check_runs: [{ name: DAL_KOSUSU, conclusion: 'failure' }] };
    expect(guardKostur({ cwd: ayni.d, cevap }).karar).toBe('evet');
  });

  it('dal koşusu İPTAL edilmişse → kapı tam koşar', () => {
    // push ve pull_request ayrı concurrency gruplarındadır; biri ötekinin
    // iptal edildiğini bilmez.
    const cevap = { check_runs: [{ name: DAL_KOSUSU, conclusion: 'cancelled' }] };
    expect(guardKostur({ cwd: ayni.d, cevap }).karar).toBe('evet');
  });

  it('API susarsa/çökerse → kapı tam koşar (şüphe gevşetmez)', () => {
    const { karar, log } = guardKostur({ cwd: ayni.d, cevap: null });
    expect(karar).toBe('evet');
    expect(log).toContain('KANIT YOK');
  });

  it('BAŞKA bir check yeşilse kanıt sayılmaz — ad birebir eşleşmeli', () => {
    const cevap = { check_runs: [{ name: 'başka bir iş', conclusion: 'success' }] };
    expect(guardKostur({ cwd: ayni.d, cevap }).karar).toBe('evet');
  });

  it('aranan check-run adı, job adının push dalıyla HARFİ HARFİNE aynı', () => {
    // Ayrışırsa kanıt sorgusu hiçbir şey bulamaz ve kapı her PR'de tam koşar:
    // güvenli ama işlevsiz — ve bunu hiçbir koşu kırmızıya çevirmez.
    const envAd = YML.match(/DAL_KOSUSU:\s*'([^']+)'/)?.[1];
    const jobAd = YML.match(/\|\|\s*'([^']+)'\s*\}\}\s*·\s*(.+)$/m);
    expect(envAd).toBe(`${jobAd[1]} · ${jobAd[2].trim()}`);
  });

  it('kanıt sorgusu yalnız pull_request yolunda çalışır', () => {
    // push koşusunda kanıt aranmaz — sınanacak olan zaten o koşunun kendisidir.
    const { karar, log } = guardKostur({ cwd: ayni.d, olay: 'push', cevap: { check_runs: [] } });
    expect(karar).toBe('evet');
    expect(log).toContain('koşulsuz');
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

  it('checks: read izni var — kanıt sorgusu onsuz sessizce boş döner', () => {
    expect(YML).toMatch(/^permissions:$/m);
    expect(YML).toMatch(/^  checks: read$/m);
  });

  it('job adı event\'e göre ayrışır — iki koşu PR sayfasında karışmaz', () => {
    expect(YML).toContain("github.event_name == 'pull_request' && 'birleşmiş ağaç' || 'dal ağacı'");
  });
});

/* ════════════════════════════════════════════════════════════════════
   DIŞ ORIGIN AYRIMI — kırığı bizde olmayan kırmızı, kırmızı değildir
   ────────────────────────────────────────────────────────────────────
   2026-09-03: koşu #64'te 171 dosya / 3857 testin hepsi yeşil geçti, sonra
   `npm audit` yedi dakika retry'dan sonra "503 Service Unavailable" ile
   düştü ve kapı KIRMIZI kapandı. Aynı commit'in push koşusu (#63) bir saat
   önce yeşildi — fark ağaçta değil ZAMANDAYDI.

   Repo bu ayrımı zaten biliyor: doğrulama tarayıcısının üç kovası
   (PROTOKOL-FABLE.md §3.3). İHLAL kapıyı kırar, DIŞ ORIGIN kırmaz ama
   raporda ADIYLA görünür. Bu blok o kuralın CI'da da yaşadığını sınar —
   çünkü kapısı olmayan kural tavsiyeye döner (§6.6).
════════════════════════════════════════════════════════════════════ */
describe('Bağımlılık taraması — üç kova, tek adım', () => {
  const ADIM = (() => {
    const i = YML.indexOf('- name: Bağımlılık açıkları');
    expect(i, 'Bağımlılık açıkları adımı YML\'de yok').toBeGreaterThan(-1);
    return YML.slice(i);
  })();

  it('ham `npm audit --audit-level` TEK BAŞINA kapı değil', () => {
    /* Kırığın kendisi buydu: tek satır, iki sebep, ayrım yok. Adım artık
       JSON okur; `--audit-level` yalnız insan-okur çıktı basmak için,
       kararın ardından çağrılır. */
    expect(ADIM).toContain('npm audit --omit=dev --json');
    const kararSatiri = /run: npm audit --omit=dev --audit-level=high\s*$/m;
    expect(YML, 'karar hâlâ ham exit koduna bağlı').not.toMatch(kararSatiri);
  });

  it('DIŞ ORIGIN kapıyı KIRMAZ — registry sussa da ağacımız sağlam', () => {
    expect(ADIM).toContain('has("error")');
    expect(ADIM).toMatch(/DIŞ ORIGIN/);
    /* Hata dalı exit 0 ile biter: kırık bizde değil. */
    const hataDali = ADIM.slice(ADIM.indexOf('DIŞ ORIGIN'), ADIM.indexOf('yuksek='));
    expect(hataDali).toContain('exit 0');
  });

  it('…ama SESSİZ de değil — taranmadığı yazılı', () => {
    /* Sessizce yutmak sahte yeşil üretir (§6.2). GitHub'ın ::warning
       ek açıklaması koşu özetinde görünür. */
    expect(ADIM).toContain('::warning title=Bağımlılık taraması YAPILAMADI');
    expect(ADIM).toMatch(/bakılamadı|KOŞMADI/);
  });

  it('GERÇEK bulgu kapıyı kırar — high/critical > 0 → exit 1', () => {
    expect(ADIM).toContain('.metadata.vulnerabilities.high');
    expect(ADIM).toContain('.metadata.vulnerabilities.critical');
    expect(ADIM).toContain('::error title=Bağımlılık açığı');
    const bulguDali = ADIM.slice(ADIM.indexOf('::error title=Bağımlılık açığı'));
    expect(bulguDali).toContain('exit 1');
  });

  it('okunamayan çıktı "temiz" SAYILMAZ — üçüncü hâl adlandırılmış', () => {
    /* Ne bulgu ne hata: biçim tanınmadı. Kapı kırılmaz ama "temiz" de
       denmez — §6.10, kanıtı olmayan değer yoktur. */
    expect(ADIM).toContain('::warning title=npm audit çıktısı okunamadı');
  });

  it('bekleme TAVANLI — npm\'in kendi retry\'ı 7 dakika sürebiliyor', () => {
    /* §10.6: her bekleyiş bir tavan taşır. `timeout` o tavandır. */
    expect(ADIM).toMatch(/timeout \d+ npm audit/);
  });

  it('yeniden deneme BİR kez — 503 geçicidir, sonsuz değil', () => {
    const denemeler = ADIM.match(/cikti=\$\(kos \|\| true\)/g) || [];
    expect(denemeler.length, 'deneme sayısı iki olmalı: ilk + bir retry').toBe(2);
    expect(ADIM, 'retry bir döngü değil, tek seferlik olmalı').not.toMatch(/while|until/);
  });
});

describe('Yarış kapısı — aynı ağaç iki kez sınanmaz', () => {
  it('concurrency grubu AĞAÇ kimliğine bağlı, dal adına değil', () => {
    /* Eskiden `github.ref` idi: push `refs/heads/<dal>`, PR
       `refs/pull/N/merge` — ayrı gruplar, paralel koşu, yarış. PR koşusu
       dal koşusunun check-run'ını arıyordu ama o daha bitmemişti; kanıt
       bulunamayınca aynı ağaç ikinci kez koştu ve ikincisi npm 503'e
       denk geldi (koşu #63 yeşil / #64 kırmızı, aynı sha). */
    expect(YML).toContain('group: kapi-${{ github.event.pull_request.head.sha || github.sha }}');
    expect(YML, 'grup hâlâ ref bazlı — yarış geri gelir').not.toMatch(/group: kapi-\$\{\{ github\.ref \}\}/);
  });

  it('cancel-in-progress KAPALI — kuyruklanan PR koşusu iptal edilmemeli', () => {
    /* Aynı gruptaki ikinci koşu iptal edilseydi PR check'i hiç
       sonuçlanmazdı. Ardışık push'lar farklı sha, yani farklı grup. */
    expect(YML).toMatch(/^  cancel-in-progress: false$/m);
  });
});

/* ════════════════════════════════════════════════════════════════════
   DAVRANIŞ — betik gerçekten koşturulur, metin olarak okunmaz
   ────────────────────────────────────────────────────────────────────
   Yukarıdaki blok adımın METNİNİ sınar: doğru dalları içeriyor mu. Ama
   "doğru görünmek" ile "doğru davranmak" ayrı şeylerdir ve bu repoda asıl
   kırıklar davranışsaldır (§3.5 madde 1). Bu blok betiği YAML'dan çıkarıp
   sahte bir `npm` ile GERÇEKTEN koşturur ve çıkış kodunu okur.

   Tek uyarlama: `sleep 15` → `sleep 0`. Retry MANTIĞI korunur, yalnız
   bekleme kalkar — bir kapı kendi süresini beklemek için var değildir.
════════════════════════════════════════════════════════════════════ */
function auditScriptiCikar(yml) {
  const blok = yml.split('- name: Bağımlılık açıkları')[1];
  const satirlar = blok.split('\n');
  const runIdx = satirlar.findIndex((s) => s.trim() === 'run: |');
  const govde = satirlar.slice(runIdx + 1);
  const girinti = govde.find((s) => s.trim())?.match(/^\s*/)[0].length ?? 0;
  return govde
    .map((s) => s.slice(girinti))
    .join('\n')
    .replace(/\$\{\{[^}]*\}\}/g, 'YER_TUTUCU')
    .replace(/\bsleep 15\b/g, 'sleep 0');
}

function sahteNpmKur(dizin, cikti) {
  const bin = path.join(dizin, 'sahte-npm-bin');
  fs.mkdirSync(bin, { recursive: true });
  /* Gerçek npm audit bulgu VARSA da exit 1 verir — sahte de öyle yapar ki
     betiğin exit koduna değil ÇIKTIYA baktığı kanıtlansın. */
  fs.writeFileSync(path.join(bin, 'npm'), `#!/bin/bash\ncat <<'JSONBITIS'\n${cikti}\nJSONBITIS\nexit 1\n`, { mode: 0o755 });
  return bin;
}

function auditKostur(cikti) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kapi-audit-'));
  try {
    const betik = path.join(tmp, 'adim.sh');
    fs.writeFileSync(betik, auditScriptiCikar(YML));
    const bin = sahteNpmKur(tmp, cikti);
    try {
      const out = execFileSync('bash', [betik], {
        encoding: 'utf8',
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
        timeout: 60_000,
      });
      return { kod: 0, out };
    } catch (e) {
      return { kod: e.status ?? -1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

describe('Bağımlılık taraması — DAVRANIŞ (betik koşturulur)', () => {
  it('DIŞ ORIGIN (503): kapı KIRILMAZ ama uyarı basar', () => {
    /* 2026-09-03 koşu #64'ün birebir hâli. */
    const r = auditKostur('{"error":{"code":"E503","summary":"503 Service Unavailable","detail":"registry"}}');
    expect(r.kod, 'registry kesintisi kapıyı kırmamalı').toBe(0);
    expect(r.out).toContain('DIŞ ORIGIN');
    expect(r.out).toContain('::warning');
  });

  it('TEMİZ: high 0 · critical 0 → geçer', () => {
    const r = auditKostur('{"metadata":{"vulnerabilities":{"info":0,"low":3,"moderate":1,"high":0,"critical":0,"total":4}}}');
    expect(r.kod).toBe(0);
    expect(r.out).toContain('temiz');
  });

  it('GERÇEK BULGU: high/critical > 0 → kapı KIRILIR', () => {
    const r = auditKostur('{"metadata":{"vulnerabilities":{"info":0,"low":0,"moderate":0,"high":2,"critical":1,"total":3}}}');
    expect(r.kod, 'gerçek açık kapıyı kırmalı').toBe(1);
    expect(r.out).toContain('::error');
  });

  it('düşük/orta seviye bulgu kapıyı KIRMAZ — eşik high', () => {
    /* moderate 9 ama high/critical sıfır: haber var, kapı yok. */
    const r = auditKostur('{"metadata":{"vulnerabilities":{"info":2,"low":5,"moderate":9,"high":0,"critical":0,"total":16}}}');
    expect(r.kod).toBe(0);
  });

  it('TANINMAYAN BİÇİM: "temiz" SAYILMAZ, ama kapı da kırılmaz', () => {
    const r = auditKostur('{"beklenmedik":"yapı"}');
    expect(r.kod).toBe(0);
    expect(r.out).toContain('okunamadı');
    expect(r.out, 'bilinmeyen çıktı "temiz" diye raporlanamaz').not.toContain('Üretim bağımlılıkları temiz');
  });

  it('BOŞ ÇIKTI: npm hiç konuşmazsa dış origin sayılır', () => {
    const r = auditKostur('');
    expect(r.kod).toBe(0);
    expect(r.out).toContain('DIŞ ORIGIN');
  });
});
