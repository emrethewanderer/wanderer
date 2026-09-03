/**
 * Tests for wtLogBolge — Bölge Nabzı (İç Çalışma 18 rev.2 · boşluk A).
 *
 * Bugün ekranının beş bölgesinin (ayraç · galeri · İç Dünya · yolculuk ·
 * ocak) görünürlüğü tek `kind:'bolge'` kanalında toplanır. Bu dosya
 * kanalın SÖZLEŞMESİNİ mühürler: kapalı bölge kümesi, `gun`ün OLMADIĞI
 * (Bugün'ün kendi `view` segmenti zaten paydadır — K1) ve uid'siz sessiz
 * düşüş. Tekilleştirme (bölge başına oturumda bir kez) çağıranın
 * (10-features-w2) sorumluluğudur, bu fonksiyonun DEĞİL — kanal her
 * çağrıda satır yazar, sözleşme yalnız kapalı kümeyi denetler.
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

const bolge = (uid = 'u1') => ckptBuf(uid).filter(r => r.kind === 'bolge');

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('wtLogBolge — sözleşme', () => {
  it('window üzerinden erişilebilir (10-features-w2 import etmeden çağırır — TDZ)', async () => {
    const { wt } = await freshModule();
    expect(typeof wt.wtLogBolge).toBe('function');
    expect(typeof window.wtLogBolge).toBe('function');
  });

  it('kapalı küme dışındaki bölge satır yazmaz', async () => {
    const { wt } = await inited();
    wt.wtLogBolge('gun');            // bilinçli olarak kümede YOK (K1)
    wt.wtLogBolge('uydurma-bolge');
    expect(bolge()).toHaveLength(0);
  });

  it('wtInit çağrılmadan yazmaz — hidratasyon öncesi sessizdir', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = { id: 'u1' };
    vi.useFakeTimers();
    expect(() => wt.wtLogBolge('ayrac')).not.toThrow();
    expect(localStorage.getItem('etw_wt_ckpt_u1')).toBeNull();
  });

  it('uid yoksa sessizce düşer — anon oturumda çağrı zararsızdır', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = null;
    vi.useFakeTimers();
    wt.wtInit();
    expect(() => wt.wtLogBolge('galeri')).not.toThrow();
    expect(localStorage.getItem('etw_wt_ckpt_undefined')).toBeNull();
  });

  it('beş bölgenin hepsi yazabilir — küme yüzeylerle örtüşür', async () => {
    const { wt } = await inited();
    const adlar = ['ayrac', 'galeri', 'icdunya', 'yolculuk', 'ocak'];
    adlar.forEach(b => wt.wtLogBolge(b));
    expect(bolge().map(r => r.screen)).toEqual(adlar);
  });

  it('satır şeması: screen=bolge, prev_screen=null, kind=bolge, meta boş', async () => {
    const { wt } = await inited();
    wt.wtLogBolge('icdunya');
    const [row] = bolge();
    expect(row.screen).toBe('icdunya');
    expect(row.kind).toBe('bolge');
    expect(row.prev_screen).toBeNull();
    expect(row.meta).toEqual({});
    expect(row.duration_ms).toBe(0);
    expect(row.user_id).toBe('u1');
  });
});
