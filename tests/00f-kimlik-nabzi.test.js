/**
 * Tests for wtLogKimlik — Kimlik Üçgeninin Nabzı (İç Çalışma 07 rev.2 · D).
 *
 * Üçgenin kimlik olayları (lapis kartın doğuşu, karttan vazgeçme, davranışla
 * kayma, kazanımla devir) tek `kind:'kimlik'` kanalında toplanır; ayrımı
 * olayın adı yapar. Bu dosya kanalın SÖZLEŞMESİNİ mühürler: kapalı olay
 * kümesi, kapalı kaynak kümesi, gizlilik süzgeci (kart adı meta'ya giremez)
 * ve uid'siz sessiz düşüş.
 *
 * Harness `tests/00f-esik-nabzi.test.js:12-44` ile aynı.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

const kimlik = (uid = 'u1') => ckptBuf(uid).filter(r => r.kind === 'kimlik');

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('wtLogKimlik — sözleşme', () => {
  it('window üzerinden erişilebilir (10D ve 13l import etmeden çağırır — TDZ)', async () => {
    const { wt } = await freshModule();
    expect(typeof wt.wtLogKimlik).toBe('function');
    expect(typeof window.wtLogKimlik).toBe('function');
  });

  it('kapalı küme dışındaki olay satır yazmaz', async () => {
    const { wt } = await inited();
    wt.wtLogKimlik('uydurma-olay', { n: 3 });
    expect(kimlik()).toHaveLength(0);
  });

  it('dört olayın hepsi yazabilir — küme yüzeylerle örtüşür', async () => {
    const { wt } = await inited();
    const adlar = ['oik-dogus', 'oik-serbest', 'kayma', 'devir'];
    adlar.forEach(a => wt.wtLogKimlik(a));
    expect(kimlik().map(r => r.screen)).toEqual(adlar);
  });

  it('uid yoksa sessizce düşer — anon oturumda çağrı zararsızdır', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = null;
    vi.useFakeTimers();
    wt.wtInit();
    wt.wtLogKimlik('kayma', { gun: 3 });
    expect(ckptBuf('u1')).toHaveLength(0);
  });

  it('satır şeması: screen=olay, prev_screen=kaynak, meta={gun,n}', async () => {
    const { wt } = await inited();
    wt.wtLogKimlik('kayma', { kaynak: 'resolve', gun: 4, n: 12 });
    const [row] = kimlik();
    expect(row.screen).toBe('kayma');
    expect(row.prev_screen).toBe('resolve');
    expect(row.kind).toBe('kimlik');
    expect(row.meta).toEqual({ gun: 4, n: 12 });
    expect(row.duration_ms).toBe(0);
    expect(row.user_id).toBe('u1');
  });

  it('küme dışı kaynak null’a düşer — kart adı prev_screen’e sızamaz', async () => {
    const { wt } = await inited();
    wt.wtLogKimlik('devir', { kaynak: 'Sabırlı Gezgin' });
    expect(kimlik()[0].prev_screen).toBeNull();
  });

  it('GİZLİLİK: meta yalnız iki sayısal alan taşır — metin sızamaz', async () => {
    const { wt } = await inited();
    wt.wtLogKimlik('oik-dogus', { kaynak: 'ilk', gun: 'bugün', n: 'yedi madde' });
    expect(kimlik()[0].meta).toEqual({ gun: 0, n: 0 });
  });

  it('negatif/anlamsız sayılar 0’a düşer — uydurulmuş ölçüm yazılmaz', async () => {
    const { wt } = await inited();
    wt.wtLogKimlik('kayma', { gun: -5, n: NaN });
    expect(kimlik()[0].meta).toEqual({ gun: 0, n: 0 });
  });
});
