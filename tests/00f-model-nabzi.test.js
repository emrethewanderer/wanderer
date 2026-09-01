/**
 * Tests for wtLogModel — Üç Sesin Nabzı (İç Çalışma 08 rev.2 · boşluk A).
 *
 * Ürünün kimlik iddiası üç sestir (Öz ◆ · Bağ ❖ · Eser ▲) ve on bir kanallı
 * kadranın hiçbirinde geçmiyordu. Bu dosya kanalın SÖZLEŞMESİNİ mühürler:
 * kapalı olay kümesi (sec|kilit|dus), kapalı eksen kümesi (oz|bag|eser),
 * gizlilik süzgeci (model adı/tagline/prompt meta'ya giremez), prem'in
 * kanıtsız 0'a düşmesi ve `fm` alanının latency kanalına binmesi (K2).
 *
 * Harness `tests/00f-kimlik-nabzi.test.js:12-44` ile birebir aynıdır.
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

const model = (uid = 'u1') => ckptBuf(uid).filter(r => r.kind === 'model');
const latency = (uid = 'u1') => ckptBuf(uid).filter(r => r.kind === 'latency');

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('wtLogModel — sözleşme', () => {
  it('window üzerinden erişilebilir (çağıranlar import etmeden çağırır — TDZ)', async () => {
    const { wt } = await freshModule();
    expect(typeof wt.wtLogModel).toBe('function');
    expect(typeof window.wtLogModel).toBe('function');
  });

  it('seçim satırı: screen=olay, prev_screen=eksen, meta={oteki,prem}', async () => {
    const { wt } = await inited();
    wt.wtLogModel('sec', { model: 'bag', oteki: 'oz', prem: true });
    expect(model()).toHaveLength(1);
    const [row] = model();
    expect(row.screen).toBe('sec');
    expect(row.kind).toBe('model');
    expect(row.prev_screen).toBe('bag');
    expect(row.meta.oteki).toBe('oz');
    expect(row.meta.prem).toBe(1);
    expect(row.duration_ms).toBe(0);
  });

  it('kapalı küme dışındaki olay satır yazmaz', async () => {
    const { wt } = await inited();
    wt.wtLogModel('degistir', { model: 'oz' });
    expect(model()).toHaveLength(0);
  });

  it('kapalı küme dışındaki eksen satır yazmaz — model adı sızamaz', async () => {
    const { wt } = await inited();
    wt.wtLogModel('sec', { model: 'genel' });
    wt.wtLogModel('sec', { model: 'Wanderer Bağ' });
    expect(model()).toHaveLength(0);
  });

  it('küme dışı oteki sessizce null olur, satır YİNE yazılır', async () => {
    const { wt } = await inited();
    wt.wtLogModel('sec', { model: 'oz', oteki: 'general' });
    expect(model()).toHaveLength(1);
    expect(model()[0].meta.oteki).toBeNull();
  });

  it('prem verilmezse 0 olur — kanıtsız değer uydurulmaz', async () => {
    const { wt } = await inited();
    wt.wtLogModel('dus', { model: 'bag', oteki: 'oz' });
    expect(model()[0].meta.prem).toBe(0);
  });

  it('uid yoksa sessizce düşer — anon oturumda çağrı zararsızdır', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = null;
    vi.useFakeTimers();
    wt.wtInit();
    wt.wtLogModel('sec', { model: 'oz' });
    expect(ckptBuf('u1')).toHaveLength(0);
  });
});

describe('wtLogLatency — fm alanı (K2: tur, seçimden güçlü kanıt)', () => {
  it('fm kümedeyse latency satırına biniyor', async () => {
    const { wt } = await inited();
    wt.wtLogLatency('deepseek-v4-flash', 900, { fm: 'eser' });
    const [row] = latency();
    expect(row.kind).toBe('latency');
    expect(row.meta.fm).toBe('eser');
  });

  it('fm küme dışıysa ya da verilmezse null olur — satır yine yazılır', async () => {
    const { wt } = await inited();
    wt.wtLogLatency('deepseek-v4-flash', 900, { fm: 'yok' });
    wt.wtLogLatency('deepseek-v4-flash', 800, {});
    expect(latency()).toHaveLength(2);
    expect(latency()[0].meta.fm).toBeNull();
    expect(latency()[1].meta.fm).toBeNull();
  });
});
