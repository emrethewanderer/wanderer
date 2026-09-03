/**
 * Tests for wtLogPaylasim — Paylaşım Nabzı (İç Çalışma 12 rev.2 · boşluk C).
 *
 * Paylaşım hunisi (story · yazı · kopyala · indir) tek `kind:'paylasim'`
 * kanalında toplanır. Bu dosya kanalın SÖZLEŞMESİNİ mühürler: kapalı olay
 * kümesi, kapalı `tur` kümesi (paylaşılan şeyin sınıfı — kart/rapor/film),
 * gizlilik süzgeci (paylaşılan kartın metni/altyazı meta'ya giremez) ve
 * uid'siz sessiz düşüş.
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

const paylasim = (uid = 'u1') => ckptBuf(uid).filter(r => r.kind === 'paylasim');

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('wtLogPaylasim — sözleşme', () => {
  it('window üzerinden erişilebilir (13g-paylasim/10C-sosyal-feed import etmeden çağırır — TDZ)', async () => {
    const { wt } = await freshModule();
    expect(typeof wt.wtLogPaylasim).toBe('function');
    expect(typeof window.wtLogPaylasim).toBe('function');
  });

  it('kapalı küme dışındaki olay satır yazmaz', async () => {
    const { wt } = await inited();
    wt.wtLogPaylasim('uydurma-olay', { tur: 'kart' });
    expect(paylasim()).toHaveLength(0);
  });

  it('wtInit çağrılmadan yazmaz — hidratasyon öncesi sessizdir', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = { id: 'u1' };
    vi.useFakeTimers();
    expect(() => wt.wtLogPaylasim('story', { tur: 'kart' })).not.toThrow();
    expect(localStorage.getItem('etw_wt_ckpt_u1')).toBeNull();
  });

  it('uid yoksa sessizce düşer — anon oturumda çağrı zararsızdır', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = null;
    vi.useFakeTimers();
    wt.wtInit();
    expect(() => wt.wtLogPaylasim('indir', { tur: 'rapor' })).not.toThrow();
    expect(localStorage.getItem('etw_wt_ckpt_undefined')).toBeNull();
  });

  it('dört olayın hepsi yazabilir — küme yüzeylerle örtüşür', async () => {
    const { wt } = await inited();
    const adlar = ['story', 'yazi', 'kopyala', 'indir'];
    adlar.forEach(a => wt.wtLogPaylasim(a));
    expect(paylasim().map(r => r.screen)).toEqual(adlar);
  });

  it('satır şeması: screen=olay, prev_screen=null, kind=paylasim, meta={tur}', async () => {
    const { wt } = await inited();
    wt.wtLogPaylasim('yazi', { tur: 'rapor' });
    const [row] = paylasim();
    expect(row.screen).toBe('yazi');
    expect(row.kind).toBe('paylasim');
    expect(row.prev_screen).toBeNull();
    expect(row.meta).toEqual({ tur: 'rapor' });
    expect(row.duration_ms).toBe(0);
    expect(row.user_id).toBe('u1');
  });

  it('tur verilmezse ya da küme dışıysa null olur — kanıtsız değer uydurulmaz', async () => {
    const { wt } = await inited();
    wt.wtLogPaylasim('kopyala', {});
    wt.wtLogPaylasim('kopyala', { tur: 'video' });
    expect(paylasim()[0].meta.tur).toBeNull();
    expect(paylasim()[1].meta.tur).toBeNull();
  });

  it('GİZLİLİK: paylaşılan kartın metni/altyazı sızamaz', async () => {
    const { wt } = await inited();
    wt.wtLogPaylasim('story', { tur: 'Bugün kendime çok kızgınım kartı' });
    const [row] = paylasim();
    expect(row.meta.tur).toBeNull();
    expect(JSON.stringify(row)).not.toContain('kızgınım');
  });
});
