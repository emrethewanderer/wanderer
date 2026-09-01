// @vitest-environment node
// Bu dosya denetçiyi spawnSync ile ayrı süreçte koşar — DOM'a hiç dokunmaz.
// jsdom kurulumu dosya başına ~3 sn'dir (ölçüldü); burada bedava ödenirdi.

/**
 * TASARIM KAPISI — `TASARIM-PRENSIPLERI.md`'nin vitest bekçisi.
 *
 * `scripts/tasarim-denetci.mjs`'i koşar; anayasanın ölçülebilir bir maddesi
 * kırılırsa bu test KIRILIR. Kalıbı `tests/gerceklik-kapisi.test.js` ile
 * aynıdır (spawnSync + exit kodu) — çalışan kapı deseni yedinci kez
 * kullanıldı, yenisi icat edilmedi.
 *
 * İkinci describe bloğu kapının KENDİSİNİ sınar: yeşil kalmak için ihlali
 * yakalayabildiğini de kanıtlamalı. Yakalamayan bir kapı, kapı değildir.
 * Üçüncü blok ise kapının SUSMASI gerektiği yerleri sınar — bir kapının
 * yanlış pozitifi, açığından daha hızlı öldürür: T3'ün ilk koşusunda 14
 * bulgunun 13'ü meşru fallback çıktı (2026-08-28) ve kural o gün daraltıldı.
 *
 * Bilinçli istisna: ihlalin geçtiği satıra ya da en fazla 6 satır üstteki
 * yoruma `/* TASARIM-MUAF: gerekçe *​/` yazılır. Gerekçesiz muafiyet de
 * ihlaldir. Ayrıntı: .claude/plans/tasarim-anayasa-kapisi.md
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DENETCI = join(ROOT, 'scripts/tasarim-denetci.mjs');

function kos(args = []) {
  return spawnSync('node', [DENETCI, ...args], { cwd: ROOT, encoding: 'utf8' });
}

/** Geçici dizine tek bir dosya yazıp denetçiyi yalnız onun üstünde koşar.
 *  `uzanti` ile CSS kolu ile JS kolu ayrı ayrı sınanır. */
function sina(icerik, uzanti = '.css') {
  const dir = mkdtempSync(join(tmpdir(), 'tasarim-kapi-'));
  try {
    writeFileSync(join(dir, `sinav${uzanti}`), icerik);
    const res = kos(['--dizin', dir, '--liste']);
    return { cikti: res.stdout + res.stderr, dir };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const sinaJs = (icerik) => sina(icerik, '.js');

describe('tasarım kapısı — repo anayasayla uyumlu', () => {
  it('tasarim-denetci.mjs 0 ihlalle geçer', () => {
    const res = kos();
    if (res.status !== 0) {
      throw new Error(
        `tasarım-denetçi ${res.status} ile kırıldı:\n${res.stdout}${res.stderr}`
      );
    }
    expect(res.status).toBe(0);
  });
});

describe('tasarım kapısı — kapının kendisi çalışıyor', () => {
  it('T1 — çıplak global z-index yakalanır', () => {
    const { cikti } = sina('.a { position: fixed; z-index: 9658; }');
    expect(cikti).toMatch(/T1/);
    expect(cikti).toMatch(/9658/);
  });

  it('T2 — keyframes var, reduced-motion yok → yakalanır', () => {
    const { cikti } = sina('@keyframes doner { from { opacity: 0; } to { opacity: 1; } }');
    expect(cikti).toMatch(/T2/);
  });

  it('T3 — ev eğrisinin çıplak kopyası yakalanır', () => {
    const { cikti } = sina('.a { transition: opacity .3s cubic-bezier(0.16, 1, 0.3, 1); }');
    expect(cikti).toMatch(/T3/);
  });

  it('T4 — altın dolgu üstünde çıplak #000 yakalanır', () => {
    const { cikti } = sina('.a { background: var(--gold); color: #000; }');
    expect(cikti).toMatch(/T4/);
  });

  it('T5 — display serif 28px+ ve letter-spacing kararı yok → yakalanır', () => {
    const { cikti } = sina('.a { font-family: var(--serif-display); font-size: 42px; }');
    expect(cikti).toMatch(/T5/);
  });

  it('T5 — clamp üst sınırı ölçülür (alt sınır eşiğin altındayken bile)', () => {
    const { cikti } = sina('.a { font-family: var(--serif-display); font-size: clamp(18px, 5vw, 40px); }');
    expect(cikti).toMatch(/T5/);
    expect(cikti).toMatch(/40px/);
  });

  it('gerekçesiz TASARIM-MUAF ihlali örtmez', () => {
    const { cikti } = sina('.a { z-index: 9658; /* TASARIM-MUAF: */ }');
    expect(cikti).toMatch(/T1/);
  });

  it('gerekçeli TASARIM-MUAF ihlali örter', () => {
    const { cikti } = sina(
      '/* TASARIM-MUAF: native kabuk bu katmanı kendi ölçüsüyle bekliyor */\n' +
      '.a { z-index: 9658; }'
    );
    expect(cikti).not.toMatch(/T1/);
  });
});

describe('tasarım kapısı — JS kolu (stil CSS dosyasında bitmez)', () => {
  it('şablon dizesindeki CSS\'te çıplak z-index yakalanır', () => {
    const { cikti } = sinaJs("const css = `.a{position:fixed;z-index:9400;}`;");
    expect(cikti).toMatch(/T1/);
    expect(cikti).toMatch(/9400/);
  });

  it('style.cssText içindeki çıplak z-index yakalanır', () => {
    const { cikti } = sinaJs("el.style.cssText = 'position:fixed;z-index:750;';");
    expect(cikti).toMatch(/T1/);
  });

  it('style.zIndex property ataması yakalanır', () => {
    const { cikti } = sinaJs("overlay.style.zIndex = '775';");
    expect(cikti).toMatch(/T1/);
    expect(cikti).toMatch(/775/);
  });

  it('setProperty ile token verilmesi ihlal DEĞİLDİR (doğru yol)', () => {
    const { cikti } = sinaJs("overlay.style.setProperty('z-index', 'var(--z-meclis-panel)');\nconst _t = { '--z-meclis-panel': 1 };");
    expect(cikti).not.toMatch(/T1/);
  });

  it('JS yorumundaki desen ihlal sayılmaz', () => {
    const { cikti } = sinaJs("// eskiden z-index: 9400 idi, artık token\n/* ve style.zIndex = '775' vardı */\nconst a = 1;");
    expect(cikti).not.toMatch(/T1/);
  });
});

describe('tasarım kapısı — T7: yüzey adlandırılmadan doğmaz', () => {
  /* T7 gerçek repo yollarına bakar (js/parts/*.js), bu yüzden --dizin ile
     sınanamaz: geçici bir modül GERÇEKTEN yazılır ve finally ile silinir. */
  const GECICI = join(ROOT, 'js/parts/zz-t7-sinav-gecici.js');

  it('yeni bir bannersiz modül kapıyı kırar', () => {
    try {
      writeFileSync(GECICI, 'export function zzSinav() { return 1; }\n');
      const res = kos(['--liste']);
      const cikti = res.stdout + res.stderr;
      expect(cikti).toMatch(/T7/);
      expect(cikti).toMatch(/zz-t7-sinav-gecici/);
    } finally {
      rmSync(GECICI, { force: true });
    }
  });

  it('FELSEFE satırı olan yeni modül kapıdan geçer', () => {
    try {
      writeFileSync(GECICI,
        '/* ═══\n   ZZ — Sınav Modülü\n   FELSEFE (Emre): bu yüzey Yolculuk metaforunu konuşur.\n═══ */\n' +
        'export function zzSinav() { return 1; }\n');
      const res = kos(['--liste']);
      expect(res.stdout + res.stderr).not.toMatch(/zz-t7-sinav-gecici/);
    } finally {
      rmSync(GECICI, { force: true });
    }
  });

  it('taban çizgisindeki eski borç tolere edilir (liste büyümedikçe)', () => {
    const taban = JSON.parse(readFileSync(join(ROOT, 'scripts/tasarim-taban.json'), 'utf8'));
    expect(Array.isArray(taban.bannersiz)).toBe(true);
    // Taban listesindeki dosyalar gerçekten var ve gerçekten bannersiz olmalı —
    // silinmiş bir dosyayı listede tutmak kapıyı sessizce gevşetir.
    for (const rel of taban.bannersiz) {
      const src = readFileSync(join(ROOT, rel), 'utf8');
      expect(src).not.toMatch(/FELSEFE/);
    }
  });
});

describe('tasarım kapısı — T8: tanımsız token (hayalet) yoktur', () => {
  it('fallbacksiz tanımsız var(--x) yakalanır', () => {
    const { cikti } = sina('.a { color: var(--hic-dogmamis); }');
    expect(cikti).toMatch(/T8/);
    expect(cikti).toMatch(/hic-dogmamis/);
  });

  it('tanımlı token ihlal değildir', () => {
    const { cikti } = sina(':root { --gercek: #fff; }\n.a { color: var(--gercek); }');
    expect(cikti).not.toMatch(/T8/);
  });

  it('fallback\'li kullanım muaftır — orada tesadüf yok, karar var', () => {
    const { cikti } = sina('.a { color: var(--yok-ama-fallbackli, #eee); }');
    expect(cikti).not.toMatch(/T8/);
  });

  it('JS\'in setProperty çağrısı da bir TANIM kaynağıdır', () => {
    const { cikti } = sinaJs("el.style.setProperty('--jsden-gelen', '4px');\nconst css = `.a{ padding: var(--jsden-gelen); }`;");
    expect(cikti).not.toMatch(/T8/);
  });
});

describe('tasarım kapısı — kapı doğru yerlerde SUSAR', () => {
  it('T1 — yerel stacking (z-index 1..8) ihlal değildir', () => {
    const { cikti } = sina('.a { z-index: 2; }\n.b { z-index: 8; }\n.c { z-index: -1; }');
    expect(cikti).not.toMatch(/T1/);
  });

  it('T1 — token kullanımı ve fallback\'i ihlal değildir', () => {
    const { cikti } = sina('.a { z-index: var(--z-modal); }\n.b { z-index: var(--z-toast, 9999); }');
    expect(cikti).not.toMatch(/T1/);
  });

  it('T3 — var(--ease-out, cubic-bezier(…)) FALLBACK\'tir, kopya değil', () => {
    const { cikti } = sina('.a { animation: x .45s var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1)) both; }');
    expect(cikti).not.toMatch(/T3/);
  });

  it('T3 — token\'ın kendi tanımı ihlal değildir', () => {
    const { cikti } = sina(':root { --ease-out: cubic-bezier(0.16, 1, 0.3, 1); }');
    expect(cikti).not.toMatch(/T3/);
  });

  it('T4 — altın dolgu yoksa #000 serbesttir', () => {
    const { cikti } = sina('.a { background: var(--surface); color: #000; }');
    expect(cikti).not.toMatch(/T4/);
  });

  it('T5 — display serif 28px altındaysa susar', () => {
    const { cikti } = sina('.a { font-family: var(--serif-display); font-size: 19px; }');
    expect(cikti).not.toMatch(/T5/);
  });

  it('T5 — letter-spacing kararı verilmişse susar (değerine karışmaz)', () => {
    const { cikti } = sina(
      '.a { font-family: var(--serif-display); font-size: 42px; letter-spacing: 4px; }'
    );
    expect(cikti).not.toMatch(/T5/);
  });

  it('yorum satırındaki desenler ihlal sayılmaz (kapı kendi gerekçesini yemez)', () => {
    const { cikti } = sina(
      '/* burada bir z-index: 9658 vardı; --z-* merdivenine taşındı.\n' +
      '   Eski hâli: cubic-bezier(0.16, 1, 0.3, 1) elle yazılıydı. */\n' +
      '.a { color: var(--text); }'
    );
    expect(cikti).not.toMatch(/T1|T3/);
  });
});
