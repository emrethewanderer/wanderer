// @vitest-environment node
// Bu dosya denetçiyi spawnSync ile ayrı süreçte koşar — DOM'a hiç dokunmaz.
// jsdom kurulumu dosya başına ~3 sn'dir (ölçüldü); burada bedava ödenirdi.

/**
 * GERÇEKLİK KAPISI — "uydurmayan uygulama" mimarisinin vitest bekçisi.
 *
 * scripts/gerceklik-denetci.mjs'i koşar; repoda kanıtsız bir varsayılan ya da
 * kapısız bir LLM kanıtı belirirse bu test KIRILIR. Kalıbı tests/i18n-parity-kapisi
 * ile aynıdır (spawnSync + exit kodu) — çalışan kapı deseni ikinci kez
 * kullanıldı, yenisi icat edilmedi.
 *
 * İkinci describe bloğu kapının KENDİSİNİ sınar: yeşil kalmak için ihlali
 * yakalayabildiğini de kanıtlamalı. Yakalamayan bir kapı, kapı değildir.
 *
 * Bilinçli istisna: ihlalin geçtiği satıra ya da hemen üstündeki yorum
 * bloğuna `/* KOKEN-MUAF: gerekçe *​/` yazılır. Gerekçesiz muafiyet de ihlaldir.
 * Ayrıntı: .claude/plans/gerceklik-mimarisi.md
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DENETCI = join(ROOT, 'scripts/gerceklik-denetci.mjs');

function kos(args = []) {
  return spawnSync('node', [DENETCI, ...args], { cwd: ROOT, encoding: 'utf8' });
}

describe('gerçeklik kapısı — repo kanıtsız değer üretmiyor', () => {
  it('gerceklik-denetci.mjs 0 ihlalle geçer', () => {
    const res = kos();
    if (res.status !== 0) {
      throw new Error(
        `gerçeklik-denetçi ${res.status} ile kırıldı:\n${res.stdout}${res.stderr}`
      );
    }
    expect(res.status).toBe(0);
  });
});

describe('gerçeklik kapısı — kapının kendisi çalışıyor', () => {
  let dir;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'koken-kapi-'));
    mkdirSync(join(dir, 'js', 'state'), { recursive: true });

    // K1 — kanıtsız sayısal varsayılan
    writeFileSync(join(dir, 'k1.js'), `
export function oku(fp, k) {
  const score = fp[k]?.score ?? 50;
  return score;
}
`);
    // K2 — state'te sabit başlangıç skoru
    writeFileSync(join(dir, 'js', 'state', 'k2.js'), `
export const sliceState = { _profil: { a: { score: 50, signals_count: 0 } } };
`);
    // K3 — LLM kanıtı okunuyor ama kapı yok
    writeFileSync(join(dir, 'k3.js'), `
import { callLLM } from './x.js';
export async function uret() {
  const raw = await callLLM({});
  const j = JSON.parse(raw);
  return { kanit: j.kanit, metin: j.metin };
}
`);
    // K4 — modelin kendi güven sayısı eşiğe vuruluyor
    writeFileSync(join(dir, 'k4.js'), `
const HIPOTEZ_GUVEN_MIN = 0.6;
export function buda(list) {
  return list.filter((h) => h.guven >= HIPOTEZ_GUVEN_MIN);
}
`);
    /* K4-YORUM — kaldırılmış bir eşiği ANLATAN belge satırı ihlal DEĞİLDİR.
       Kapı kendi gerekçesini ihlal olarak okursa, doğru kararı yazmak
       imkânsızlaşır (bu sprintte tam bu tuzağa düşüldü ve yakalandı). */
    writeFileSync(join(dir, 'k4yorum.js'), `
/* NOT: burada bir KORNOKTA_GUVEN_MIN = 0.55 vardı; kaldırıldı çünkü
   modelin kendi guven >= 0.55 eşiği bir ölçüm değildi. */
export const CAP = 6;
`);
    /* K5 — atama/parametre varsayılanı. Bu delik canlı yakalandı
       (2026-08-02): `p6UpsertFact(…, confidence = 1)` aylardır duruyordu ve
       K1/K1b/K2'nin hiçbiri onu görmüyordu. İkinci satır kelime sınırının
       kendisini sınar: `\b` kullanılsaydı `optimal_challenge_level`
       içindeki kavram görünmezdi — körlüğün asıl kaynağı oydu. */
    writeFileSync(join(dir, 'k5.js'), `
export function upsert(kategori, deger, confidence = 1) {
  let optimal_challenge_level = 0.5;
  return { kategori, deger, confidence, optimal_challenge_level };
}
`);
    /* K5-SABİT — bir eşiğin KENDİ tanımı ihlal değildir: eşik ölçünün
       kendisidir, ölçümün varsayılanı değil. */
    writeFileSync(join(dir, 'k5sabit.js'), `
export const OLUS_SKOR_SICRAMA = 8;
const RECALL_SCORE_MIN = 0.75;
export function esik() { return OLUS_SKOR_SICRAMA + RECALL_SCORE_MIN; }
`);
    /* K6 — sayı bir ada saklanarak gizlenemez. K1 burada sayı görmez,
       tanımlayıcı görür ve susardı. */
    writeFileSync(join(dir, 'k6.js'), `
const VARSAYILAN_SKOR = 50;
export function oku(fp, k) {
  return fp[k]?.score ?? VARSAYILAN_SKOR;
}
`);
    /* K6-KÜÇÜK — `|| null` ve `|| new Date()` sabit DEĞİLDİR; kural
       yazılırken tam bu iki satır yanlış pozitif üretti (regex `i`
       bayrağıyla koştuğu için küçük harfli sözcükleri sabit sanıyordu). */
    writeFileSync(join(dir, 'k6kucuk.js'), `
export function kaydet(c) {
  return { score: c.score || null, earned_at: c.earned_at || new Date() };
}
`);
    // MUAF — gerekçeli istisna yakalanmamalı
    writeFileSync(join(dir, 'muaf.js'), `
export function oku(fp, k) {
  /* KOKEN-MUAF: nötr hesap tabanı, okuma kapısı signals_count'tur */
  const score = fp[k]?.score ?? 50;
  return score;
}
`);
    // MUAF-BOŞ — gerekçesiz muafiyet de ihlaldir
    writeFileSync(join(dir, 'muafbos.js'), `
export function oku(fp, k) {
  /* KOKEN-MUAF: */
  const score = fp[k]?.score ?? 50;
  return score;
}
`);
  });

  afterAll(() => { try { rmSync(dir, { recursive: true, force: true }); } catch (_) {} });

  it('kanıtsız varsayılanı (K1), sabit state skorunu (K2) ve kapısız kanıtı (K3) yakalar', () => {
    const res = kos(['--dizin', dir]);
    expect(res.status).toBe(1); // kapı kırıldı = ihlal görüldü
    const cikti = res.stdout + res.stderr;
    expect(cikti).toContain('K1');
    expect(cikti).toContain('K2');
    expect(cikti).toContain('K3');
  });

  it('modelin güven eşiğini (K4) yakalar, ama onu ANLATAN yorumu yakalamaz', () => {
    const res = kos(['--dizin', dir]);
    const cikti = res.stdout + res.stderr;
    expect(cikti).toContain('K4');
    expect(cikti).toContain('k4.js');
    expect(cikti).not.toContain('k4yorum.js'); // belge metni ihlal değildir
  });

  it('atama/parametre varsayılanını (K5) yakalar — kelime sınırının içinde de', () => {
    const res = kos(['--dizin', dir]);
    const cikti = res.stdout + res.stderr;
    expect(cikti).toContain('K5');
    expect(cikti).toContain('k5.js');
    // `confidence = 1` VE `optimal_challenge_level = 0.5` — ikincisi `\b`
    // kullanan bir kurala görünmezdi; körlüğün kaynağı buydu.
    expect(cikti).toContain('confidence = 1');
    expect(cikti).toContain('optimal_challenge_level = 0.5');
  });

  it('eşik SABİTİNİN kendi tanımını (K5) ihlal saymaz', () => {
    const res = kos(['--dizin', dir]);
    const cikti = res.stdout + res.stderr;
    expect(cikti).not.toContain('k5sabit.js');
  });

  it('sabite düşülmesini (K6) yakalar, küçük harfli sözcüğü sabit sanmaz', () => {
    const res = kos(['--dizin', dir]);
    const cikti = res.stdout + res.stderr;
    expect(cikti).toContain('K6');
    expect(cikti).toContain('k6.js');
    expect(cikti).not.toContain('k6kucuk.js'); // `|| null` / `|| new Date()` sabit değildir
  });

  it('gerekçeli muafiyeti yakalamaz, gerekçesizi yakalar', () => {
    const res = kos(['--dizin', dir]);
    const cikti = res.stdout + res.stderr;
    expect(cikti).not.toContain('muaf.js');   // gerekçeli → sessiz
    expect(cikti).toContain('muafbos.js');    // gerekçesiz → ihlal
    expect(cikti).toContain('MUAF');
  });

  it('temiz bir dizinde 0 ile çıkar', () => {
    const temiz = mkdtempSync(join(tmpdir(), 'koken-temiz-'));
    writeFileSync(join(temiz, 'ok.js'), `
export function oku(fp, k) {
  const o = fp[k];
  if (!o || (o.signals_count || 0) < 3) return null;
  return o.score;
}
`);
    const res = kos(['--dizin', temiz]);
    try { rmSync(temiz, { recursive: true, force: true }); } catch (_) {}
    expect(res.status).toBe(0);
  });
});
