/**
 * Tests for wtLogEsik — Eşiğin Nabzı (İç Çalışma 06 rev.2 · boşluk A).
 *
 * Onboarding eşiği (perde · dil kapısı · kategori · sentez · doğuş · esik
 * ekranı) tek `kind:'esik'` kanalında toplanır; ayrımı olayın adı yapar.
 * Bu dosya kanalın SÖZLEŞMESİNİ mühürler: kapalı olay kümesi, ikincil eksen
 * (prev_screen) kapalı kümesi, gizlilik süzgeci (kullanıcının cümlesi
 * meta'ya giremez), süre tavanı ve uid'siz sessiz düşüş.
 *
 * Harness `tests/00f-ritus-nabzi.test.js:12-44` ile aynı: _buf private,
 * checkpoint (etw_wt_ckpt_<uid>) düz localStorage'a yazılır.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

async function freshModule() {
  vi.resetModules();
  const { S } = await import('../js/state.js');
  const wt = await import('../js/parts/00f-kullanim-nabzi.js');
  return { S, wt };
}

function ckptBuf(uid) {
  vi.advanceTimersByTime(20000);
  const raw = localStorage.getItem(`etw_wt_ckpt_${uid}`);
  return raw ? (JSON.parse(raw).buf || []) : [];
}

async function inited(uid = 'u1') {
  const { S, wt } = await freshModule();
  S.currentUser = { id: uid };
  vi.useFakeTimers();
  wt.wtInit();
  return { S, wt };
}

const esik = (uid = 'u1') => ckptBuf(uid).filter(r => r.kind === 'esik');

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('wtLogEsik — sözleşme', () => {
  it('window üzerinden erişilebilir (onboarding modülleri import etmeden çağırır — TDZ)', async () => {
    const { wt } = await freshModule();
    expect(typeof wt.wtLogEsik).toBe('function');
    expect(typeof window.wtLogEsik).toBe('function');
  });

  it('kapalı küme dışındaki olay satır yazmaz', async () => {
    const { wt } = await inited();
    wt.wtLogEsik('uydurma-olay', { adim: 1 });
    expect(esik()).toHaveLength(0);
  });

  it('uid yoksa sessizce düşer — anon oturumda çağrı zararsızdır', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = null;
    vi.useFakeTimers();
    wt.wtInit();
    expect(() => wt.wtLogEsik('perde', { sureMs: 4000 })).not.toThrow();
    expect(localStorage.getItem('etw_wt_ckpt_undefined')).toBeNull();
  });

  it('wtInit çağrılmadan yazmaz — hidratasyon öncesi sessizdir', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = { id: 'u1' };
    vi.useFakeTimers();
    expect(() => wt.wtLogEsik('basladi')).not.toThrow();
    expect(localStorage.getItem('etw_wt_ckpt_u1')).toBeNull();
  });

  it('sekiz olayın hepsi yazabilir — küme yüzeylerle örtüşür', async () => {
    const { wt } = await inited();
    const adlar = ['perde', 'dil-kapisi', 'basladi', 'kategori',
      'sentez', 'dogus', 'atladi', 'esik-ekrani'];
    adlar.forEach(a => wt.wtLogEsik(a));
    expect(esik().map(r => r.screen)).toEqual(adlar);
  });

  it('satır şeması: screen=olay, prev_screen=dal, kind=esik, meta={adim,n,atlandi}', async () => {
    const { wt } = await inited();
    wt.wtLogEsik('kategori', { adim: 2, n: 3, dal: 'dusunceler' });
    const [row] = esik();
    expect(row.screen).toBe('kategori');
    expect(row.prev_screen).toBe('dusunceler');
    expect(row.kind).toBe('esik');
    expect(row.meta).toEqual({ adim: 2, n: 3, atlandi: 0 });
    expect(row.user_id).toBe('u1');
  });

  it('prev_screen küme dışı değerde null olur', async () => {
    const { wt } = await inited();
    wt.wtLogEsik('sentez', { dal: 'basarili' });            // 'ok'/'fallback' değil
    expect(esik()[0].prev_screen).toBeNull();
  });

  it('perde: kat dal ile taşınır, atlama meta.atlandi ile — ikisi ayrı alan', async () => {
    const { wt } = await inited();
    wt.wtLogEsik('perde', { sureMs: 2000, dal: 'kat1', atlandi: 1 });
    wt.wtLogEsik('perde', { sureMs: 4000, dal: 'kat2' });
    const [birinci, ikinci] = esik();
    expect(birinci.prev_screen).toBe('kat1');
    expect(birinci.meta.atlandi).toBe(1);   // dokunarak atlandı
    expect(ikinci.prev_screen).toBe('kat2');
    expect(ikinci.meta.atlandi).toBe(0);    // süresi doldu
  });

  it('GİZLİLİK: meta yalnız sayısal alanlar taşır — metin sızamaz', async () => {
    const { wt } = await inited();
    wt.wtLogEsik('kategori', {
      adim: 'bugün babamla konuştum', n: 3, dal: 'gizli cümle', metin: 'sızan metin',
    });
    const [row] = esik();
    expect(Object.keys(row.meta).sort()).toEqual(['adim', 'atlandi', 'n']);
    expect(row.meta.adim).toBe(0);          // sayı olmayan adım 0'a düşer
    expect(row.meta.atlandi).toBe(0);       // metin sayıya düşer
    expect(row.prev_screen).toBeNull();     // kapalı küme dışı string sızmaz
    expect(JSON.stringify(row)).not.toContain('babamla');
    expect(JSON.stringify(row)).not.toContain('sızan');
  });

  it('ölçülmemiş süre uydurulmaz (0) ve tavanı aşamaz', async () => {
    const { wt } = await inited();
    wt.wtLogEsik('basladi');
    wt.wtLogEsik('basladi', { sureMs: 9 * 60 * 60 * 1000 });
    const [olcusuz, tasan] = esik();
    expect(olcusuz.duration_ms).toBe(0);
    expect(tasan.duration_ms).toBe(30 * 60 * 1000);
  });

  it('negatif/anlamsız sayılar 0’a düşer — uydurulmuş ölçüm yazılmaz', async () => {
    const { wt } = await inited();
    wt.wtLogEsik('dogus', { adim: -4, n: NaN });
    expect(esik()[0].meta.adim).toBe(0);
    expect(esik()[0].meta.n).toBe(0);
  });
});

/* ── Dikiş testi: kanal ile ÇAĞRI YERLERİ (İç Çalışma 06 rev.2 · FAZ 1↔2) ──
   Kapalı küme kanalın sözleşmesidir ama sözleşmeyi çağıran taraf çiğner:
   `wtLogEsik('dogum', …)` diye bir satır sessizce hiçbir şey yazmaz — ne
   hata verir ne uyarır, yalnız o an ölçülmemiş olur. Huninin bir basamağı
   sessizce kaybolur ve kadran "kimse oraya gelmedi" der. Bu test kaynağı
   okuyup iki tarafı yüzleştirir. */
describe('küme aynası — çağrı yerleri ile _ESIK_OLAY/_ESIK_PREV örtüşür', () => {
  const kok = resolve(dirname(fileURLToPath(import.meta.url)), '../js/parts');
  const src00f = readFileSync(`${kok}/00f-kullanim-nabzi.js`, 'utf-8');
  const kume = (re) => new Set(
    [...src00f.match(re)[1].matchAll(/'([a-z0-9-]+)'/g)].map(x => x[1]));

  const OLAY = kume(/const _ESIK_OLAY = new Set\(\[([\s\S]*?)\]\)/);
  const PREV = kume(/const _ESIK_PREV = new Set\(\[([\s\S]*?)\]\)/);

  const tumKaynak = readdirSync(kok)
    .filter(f => f.endsWith('.js'))
    .map(f => readFileSync(`${kok}/${f}`, 'utf-8'))
    .join('\n');

  it('her çağrının olay adı kapalı kümededir — sessizce düşen satır yok', () => {
    const cagrilar = [...tumKaynak.matchAll(/wtLogEsik\?\.\('([a-z0-9-]+)'/g)].map(m => m[1]);
    expect(cagrilar.length).toBeGreaterThanOrEqual(8);
    cagrilar.forEach(olay => expect(OLAY.has(olay)).toBe(true));
  });

  it('kümedeki her olayın en az bir çağrısı vardır — ölü olay yok', () => {
    const cagrilan = new Set([...tumKaynak.matchAll(/wtLogEsik\?\.\('([a-z0-9-]+)'/g)].map(m => m[1]));
    expect([...OLAY].sort()).toEqual([...cagrilan].sort());
  });

  it('sabit `dal` değerleri kapalı kümededir', () => {
    const dallar = [...tumKaynak.matchAll(/wtLogEsik\?\.\([^)]*?dal: '([a-z0-9]+)'/gs)].map(m => m[1]);
    dallar.forEach(dal => expect(PREV.has(dal)).toBe(true));
  });

  it('02c kategori anahtarları `dal` kümesinde vardır — merdivenin dört basamağı', () => {
    const src02c = readFileSync(`${kok}/02c-portre.js`, 'utf-8');
    const catOrder = [...src02c.match(/const CAT_ORDER = \[([\s\S]*?)\]/)[1]
      .matchAll(/'([a-z]+)'/g)].map(x => x[1]);
    expect(catOrder.length).toBe(4);
    catOrder.forEach(k => expect(PREV.has(k)).toBe(true));
  });

  it('perde kademeleri kümededir — kat1 tam perde, kat2 kısa nefes', () => {
    expect(PREV.has('kat1')).toBe(true);
    expect(PREV.has('kat2')).toBe(true);
  });
});
