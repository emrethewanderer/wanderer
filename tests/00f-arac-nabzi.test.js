/**
 * Tests for wtLogArac — Araç Nabzı (İç Çalışma 09 rev.2 · boşluk D).
 *
 * Araç Motoru'nun (13a) önerdiği her şeyin kabul mü ret mi gördüğü tek
 * `kind:'arac'` kanalında toplanır. Bu dosya kanalın SÖZLEŞMESİNİ mühürler:
 * kapalı olay kümesi (oner|onayla|reddet), kapalı araç kümesi
 * (soz|not|gecis|imge), gizlilik süzgeci (aracın ürettiği metin meta'ya
 * giremez) ve uid'siz sessiz düşüş.
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

const arac = (uid = 'u1') => ckptBuf(uid).filter(r => r.kind === 'arac');

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('wtLogArac — sözleşme', () => {
  it('window üzerinden erişilebilir (13a-arac-motoru import etmeden çağırır — TDZ)', async () => {
    const { wt } = await freshModule();
    expect(typeof wt.wtLogArac).toBe('function');
    expect(typeof window.wtLogArac).toBe('function');
  });

  it('kapalı küme dışındaki olay satır yazmaz', async () => {
    const { wt } = await inited();
    wt.wtLogArac('uydurma-olay', { arac: 'soz' });
    expect(arac()).toHaveLength(0);
  });

  it('wtInit çağrılmadan yazmaz — hidratasyon öncesi sessizdir', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = { id: 'u1' };
    vi.useFakeTimers();
    expect(() => wt.wtLogArac('oner', { arac: 'not' })).not.toThrow();
    expect(localStorage.getItem('etw_wt_ckpt_u1')).toBeNull();
  });

  it('uid yoksa sessizce düşer — anon oturumda çağrı zararsızdır', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = null;
    vi.useFakeTimers();
    wt.wtInit();
    expect(() => wt.wtLogArac('onayla', { arac: 'gecis' })).not.toThrow();
    expect(localStorage.getItem('etw_wt_ckpt_undefined')).toBeNull();
  });

  it('üç olayın hepsi yazabilir — küme yüzeylerle örtüşür', async () => {
    const { wt } = await inited();
    const adlar = ['oner', 'onayla', 'reddet'];
    adlar.forEach(a => wt.wtLogArac(a, { arac: 'imge' }));
    expect(arac().map(r => r.screen)).toEqual(adlar);
  });

  it('satır şeması: screen=olay, prev_screen=arac, kind=arac, meta boş', async () => {
    const { wt } = await inited();
    wt.wtLogArac('onayla', { arac: 'soz' });
    const [row] = arac();
    expect(row.screen).toBe('onayla');
    expect(row.kind).toBe('arac');
    expect(row.prev_screen).toBe('soz');
    expect(row.meta).toEqual({});
    expect(row.duration_ms).toBe(0);
    expect(row.user_id).toBe('u1');
  });

  /* Sekiz: iki paralel FAZ 10'un birleşimi (inanc/engel · gordun/sabir).
     `ayna` birleşmede düştü — 09h Studio-gate'lidir ve premium kapılı bir
     ritüel sohbetten önerilmez (bkz. 13a registry yorumu). */
  it('sekiz aracın hepsi kapalı kümededir', async () => {
    const { wt } = await inited();
    const hepsi = ['soz', 'not', 'gecis', 'imge', 'inanc', 'engel', 'gordun', 'sabir'];
    hepsi.forEach(a => wt.wtLogArac('oner', { arac: a }));
    expect(arac().map(r => r.prev_screen)).toEqual(hepsi);
  });

  it('arac küme dışı değerde null olur, satır yine yazılır', async () => {
    const { wt } = await inited();
    wt.wtLogArac('reddet', { arac: 'bilinmeyen-arac' });
    expect(arac()).toHaveLength(1);
    expect(arac()[0].prev_screen).toBeNull();
  });

  it('GİZLİLİK: aracın ürettiği söz/not metni sızamaz', async () => {
    const { wt } = await inited();
    wt.wtLogArac('oner', { arac: 'Bugün kendine nazik ol cümlesi önerildi' });
    const [row] = arac();
    expect(row.prev_screen).toBeNull();
    expect(JSON.stringify(row)).not.toContain('kendine nazik');
  });
});
