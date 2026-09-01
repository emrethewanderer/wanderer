/**
 * Tests for wtLogRitus — Ritüellerin Nabzı (İç Çalışma 05 rev.3 · boşluk A).
 *
 * Dokuz ritüel yüzeyi tek `kind:'ritus'` kanalında toplanır; ayrımı ritüelin
 * adı yapar. Bu dosya kanalın SÖZLEŞMESİNİ mühürler: kapalı ritüel ve olay
 * kümeleri, gizlilik süzgeci (kullanıcının cümlesi meta'ya giremez), süre
 * tavanı ve uid'siz sessiz düşüş.
 *
 * Gözlem yolu 00f-kart-nabzi.test.js ile aynı: _buf private, checkpoint
 * (etw_wt_ckpt_<uid>) düz localStorage'a yazılır.
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

const ritus = (uid = 'u1') => ckptBuf(uid).filter(r => r.kind === 'ritus');

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('wtLogRitus — sözleşme', () => {
  it('window üzerinden erişilebilir (ritüel modülleri import etmeden çağırır — TDZ)', async () => {
    const { wt } = await freshModule();
    expect(typeof wt.wtLogRitus).toBe('function');
    expect(typeof window.wtLogRitus).toBe('function');
  });

  it('kapalı küme dışındaki ritüel adı satır yazmaz', async () => {
    const { wt } = await inited();
    wt.wtLogRitus('uydurma-ritus', 'tamam');
    expect(ritus()).toHaveLength(0);
  });

  it('kapalı küme dışındaki olay satır yazmaz', async () => {
    const { wt } = await inited();
    wt.wtLogRitus('hayal', 'yarim-kaldi');
    expect(ritus()).toHaveLength(0);
  });

  it('uid yoksa sessizce düşer — anon oturumda çağrı zararsızdır', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = null;
    vi.useFakeTimers();
    wt.wtInit();
    expect(() => wt.wtLogRitus('gunluk-ritus', 'tamam')).not.toThrow();
    expect(localStorage.getItem('etw_wt_ckpt_undefined')).toBeNull();
  });

  it('on ritüelin hepsi yazabilir — küme yüzeylerle örtüşür', async () => {
    const { wt } = await inited();
    const adlar = ['gunluk-ritus', 'hayal', 'kendinle-konusma', 'degerlendirme',
      'engel-atlasi', 'dinlenme', 'derin-calisma', 'sefer', 'seri-muhru',
      'oik-okuma'];
    adlar.forEach(a => wt.wtLogRitus(a, 'tamam'));
    expect(ritus().map(r => r.screen)).toEqual(adlar);
  });

  it('satır şeması: screen=ritüel, prev_screen=olay, meta={adim,n}', async () => {
    const { wt } = await inited();
    wt.wtLogRitus('gunluk-ritus', 'tamam', { adim: 3, n: 2 });
    const [row] = ritus();
    expect(row.screen).toBe('gunluk-ritus');
    expect(row.prev_screen).toBe('tamam');
    expect(row.kind).toBe('ritus');
    expect(row.meta).toEqual({ adim: 3, n: 2 });
    expect(row.user_id).toBe('u1');
  });

  it('GİZLİLİK: meta yalnız iki sayısal alan taşır — metin sızamaz', async () => {
    const { wt } = await inited();
    wt.wtLogRitus('kendinle-konusma', 'tamam',
      { adim: 'bugün babamla konuştum', n: 3, metin: 'gizli cümle' });
    const [row] = ritus();
    expect(Object.keys(row.meta).sort()).toEqual(['adim', 'n']);
    expect(row.meta.adim).toBe(0);          // sayı olmayan adım 0'a düşer
    expect(JSON.stringify(row)).not.toContain('babamla');
    expect(JSON.stringify(row)).not.toContain('gizli');
  });

  it('ölçülmemiş süre uydurulmaz (0) ve tavanı aşamaz', async () => {
    const { wt } = await inited();
    wt.wtLogRitus('hayal', 'tamam');
    wt.wtLogRitus('hayal', 'tamam', { sureMs: 9 * 60 * 60 * 1000 });
    const [olcusuz, tasan] = ritus();
    expect(olcusuz.duration_ms).toBe(0);
    expect(tasan.duration_ms).toBe(30 * 60 * 1000);
  });

  it('negatif/anlamsız sayılar 0’a düşer — uydurulmuş ölçüm yazılmaz', async () => {
    const { wt } = await inited();
    wt.wtLogRitus('dinlenme', 'tamam', { adim: -4, n: NaN });
    expect(ritus()[0].meta).toEqual({ adim: 0, n: 0 });
  });

  it('wtInit çağrılmadan yazmaz — hidratasyon öncesi sessizdir', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = { id: 'u1' };
    vi.useFakeTimers();
    expect(() => wt.wtLogRitus('sefer', 'tamam')).not.toThrow();
    expect(localStorage.getItem('etw_wt_ckpt_u1')).toBeNull();
  });
});
