/**
 * Tests for wtLogKota — Kota Nabzı (İç Çalışma 16 rev.2 · boşluk C).
 *
 * Paywall hunisi (duvar · sheet · gate · iptal · bonus) tek `kind:'kota'`
 * kanalında toplanır. Bu dosya kanalın SÖZLEŞMESİNİ mühürler: kapalı olay
 * kümesi, kapalı `dal` kümesi (paywall varyantı/sebep), kapalı `tier`
 * kümesi, gizlilik süzgeci (fiyat/ürün adı meta'ya giremez) ve uid'siz
 * sessiz düşüş.
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

const kota = (uid = 'u1') => ckptBuf(uid).filter(r => r.kind === 'kota');

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('wtLogKota — sözleşme', () => {
  it('window üzerinden erişilebilir (13m/08-trends-payment import etmeden çağırır — TDZ)', async () => {
    const { wt } = await freshModule();
    expect(typeof wt.wtLogKota).toBe('function');
    expect(typeof window.wtLogKota).toBe('function');
  });

  it('kapalı küme dışındaki olay satır yazmaz', async () => {
    const { wt } = await inited();
    wt.wtLogKota('uydurma-olay', { tier: 'free' });
    expect(kota()).toHaveLength(0);
  });

  it('wtInit çağrılmadan yazmaz — hidratasyon öncesi sessizdir', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = { id: 'u1' };
    vi.useFakeTimers();
    expect(() => wt.wtLogKota('duvar')).not.toThrow();
    expect(localStorage.getItem('etw_wt_ckpt_u1')).toBeNull();
  });

  it('uid yoksa sessizce düşer — anon oturumda çağrı zararsızdır', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = null;
    vi.useFakeTimers();
    wt.wtInit();
    expect(() => wt.wtLogKota('gate', { dal: 'a', tier: 'pro' })).not.toThrow();
    expect(localStorage.getItem('etw_wt_ckpt_undefined')).toBeNull();
  });

  it('beş olayın hepsi yazabilir — küme yüzeylerle örtüşür', async () => {
    const { wt } = await inited();
    const adlar = ['duvar', 'sheet', 'gate', 'iptal', 'bonus'];
    adlar.forEach(a => wt.wtLogKota(a));
    expect(kota().map(r => r.screen)).toEqual(adlar);
  });

  it('satır şeması: screen=olay, prev_screen=dal, kind=kota, meta={tier}', async () => {
    const { wt } = await inited();
    wt.wtLogKota('duvar', { dal: 'a', tier: 'free' });
    const [row] = kota();
    expect(row.screen).toBe('duvar');
    expect(row.kind).toBe('kota');
    expect(row.prev_screen).toBe('a');
    expect(row.meta).toEqual({ tier: 'free' });
    expect(row.duration_ms).toBe(0);
    expect(row.user_id).toBe('u1');
  });

  it('dal küme dışı değerde null olur, satır yine yazılır', async () => {
    const { wt } = await inited();
    wt.wtLogKota('sheet', { dal: 'kampanya-x' });
    expect(kota()).toHaveLength(1);
    expect(kota()[0].prev_screen).toBeNull();
  });

  it('tier verilmezse ya da küme dışıysa null olur — kanıtsız değer uydurulmaz', async () => {
    const { wt } = await inited();
    wt.wtLogKota('bonus', {});
    wt.wtLogKota('bonus', { tier: 'enterprise' });
    expect(kota()[0].meta.tier).toBeNull();
    expect(kota()[1].meta.tier).toBeNull();
  });

  it('GİZLİLİK: fiyat/ürün adı gibi serbest metin sızamaz', async () => {
    const { wt } = await inited();
    wt.wtLogKota('gate', { dal: '₺149,99/ay Pro paketi', tier: 'Wanderer Max Yıllık' });
    const [row] = kota();
    expect(row.prev_screen).toBeNull();
    expect(row.meta.tier).toBeNull();
    expect(JSON.stringify(row)).not.toContain('149,99');
    expect(JSON.stringify(row)).not.toContain('Yıllık');
  });
});
