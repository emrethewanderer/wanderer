/**
 * Tests for wtLogDuygu — Duygu Nabzı (13D FAZ 12 · sohbet ayağının kapanışı).
 *
 * Duygu Motoru'nun bu turun karşılama kararını `kind:'duygu'` kanalına
 * yazar — beş toplulaştırılabilir alan: eksen (screen), kuvvet kaynağı
 * (prev_screen: goreli/mutlak), kural/ayrışma/takas (meta). Sözleşme diğer
 * wtLog* kanallarıyla BİREBİR aynı kalıptır (bkz. tests/00f-esik-nabzi.test.js):
 * kapalı olay kümesi, gizlilik süzgeci, uid'siz/init'siz sessiz düşüş.
 *
 * K9 sözleşmesi burada da geçerli: 'tutma' (kriz) bu kanaldan HİÇ geçmez —
 * crisis_signal zaten wtLogSafety'de tek kaynaktan sayılıyor; ikinci bir
 * kanaldan aynı olayı saymak çift sayım üretir.
 *
 * Harness `tests/00f-esik-nabzi.test.js:12-44` ile aynı: _buf private,
 * checkpoint (etw_wt_ckpt_<uid>) düz localStorage'a yazılır.
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

const duygu = (uid = 'u1') => ckptBuf(uid).filter(r => r.kind === 'duygu');

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('wtLogDuygu — sözleşme', () => {
  it('window üzerinden erişilebilir (06-summary-chat import etmeden çağırır — TDZ)', async () => {
    const { wt } = await freshModule();
    expect(typeof wt.wtLogDuygu).toBe('function');
    expect(typeof window.wtLogDuygu).toBe('function');
  });

  it('kapalı küme dışındaki eksen satır yazmaz', async () => {
    const { wt } = await inited();
    wt.wtLogDuygu('uydurma-eksen', {});
    expect(duygu()).toHaveLength(0);
  });

  it("'tutma' (kriz) satır YAZMAZ — wtLogSafety zaten sayıyor (K9, çift sayım önleme)", async () => {
    const { wt } = await inited();
    wt.wtLogDuygu('tutma', { kuvvetKaynagi: 'mutlak' });
    expect(duygu()).toHaveLength(0);
  });

  it('uid yoksa sessizce düşer — anon oturumda çağrı zararsızdır', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = null;
    vi.useFakeTimers();
    wt.wtInit();
    expect(() => wt.wtLogDuygu('taniklik', {})).not.toThrow();
    expect(localStorage.getItem('etw_wt_ckpt_undefined')).toBeNull();
  });

  it('wtInit çağrılmadan yazmaz — hidratasyon öncesi sessizdir', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = { id: 'u1' };
    vi.useFakeTimers();
    expect(() => wt.wtLogDuygu('kutlama', {})).not.toThrow();
    expect(localStorage.getItem('etw_wt_ckpt_u1')).toBeNull();
  });

  it('altı eksenin hepsi yazabilir — tutma hariç K2 tablosu', async () => {
    const { wt } = await inited();
    const eksenler = ['taniklik', 'yatistirma', 'sahiplenme', 'berraklik', 'diriltme', 'kutlama'];
    eksenler.forEach(e => wt.wtLogDuygu(e, {}));
    expect(duygu().map(r => r.screen)).toEqual(eksenler);
  });

  it('satır şeması: screen=eksen, prev_screen=kuvvet kaynağı, kind=duygu', async () => {
    const { wt } = await inited();
    wt.wtLogDuygu('yatistirma', { kural: 2, kuvvetKaynagi: 'goreli', ayristi: false, takas: false });
    const [row] = duygu();
    expect(row.screen).toBe('yatistirma');
    expect(row.prev_screen).toBe('goreli');
    expect(row.kind).toBe('duygu');
    expect(row.duration_ms).toBe(0);
    /* Meta beş anahtardır (FAZ 12 `yuzey` + FAZ 15 `duzeltildi` ile
       genişledi; sözleşme testi 2026-08-30'da güncellendi). Çağıran yüzey
       vermediyse `yuzey` null'dır — uydurulmuş bir 'sohbet' varsayılanı
       §6.10 ihlali olurdu. */
    expect(row.meta).toEqual({ kural: 2, ayristi: false, takas: false, yuzey: null, duzeltildi: false });
    expect(row.user_id).toBe('u1');
  });

  it('prev_screen küme dışı (goreli/mutlak olmayan) değerde null olur', async () => {
    const { wt } = await inited();
    wt.wtLogDuygu('berraklik', { kuvvetKaynagi: 'orta' });
    expect(duygu()[0].prev_screen).toBeNull();
  });

  it('kural sayı değilse null olur, ondalık (7.5) korunur', async () => {
    const { wt } = await inited();
    wt.wtLogDuygu('sahiplenme', { kural: 'bilinmiyor' });
    wt.wtLogDuygu('kutlama', { kural: 7.5 });
    const [birinci, ikinci] = duygu();
    expect(birinci.meta.kural).toBeNull();
    expect(ikinci.meta.kural).toBe(7.5);
  });

  it('ayristi boolean değilse (model bu turda DG: basmadıysa) null olur — "ayrışmadı" iddia edilmez', async () => {
    const { wt } = await inited();
    wt.wtLogDuygu('diriltme', {});                       // ayristi verilmedi
    wt.wtLogDuygu('kutlama', { ayristi: 'evet' });        // boolean değil
    expect(duygu()[0].meta.ayristi).toBeNull();
    expect(duygu()[1].meta.ayristi).toBeNull();
  });

  it('takas daima boolean\'a zorlanır', async () => {
    const { wt } = await inited();
    wt.wtLogDuygu('taniklik', { takas: 'evet' });
    wt.wtLogDuygu('yatistirma', {});
    expect(duygu()[0].meta.takas).toBe(true);
    expect(duygu()[1].meta.takas).toBe(false);
  });

  it('GİZLİLİK: fonksiyon imzası kanıt/gerekçe metni almaz — kazara geçilse bile meta KAPALI KÜMEDİR', async () => {
    const { wt } = await inited();
    wt.wtLogDuygu('taniklik', {
      kural: 9, kuvvetKaynagi: 'mutlak', ayristi: true, takas: false,
      kanit: 'kullanıcının kendi cümlesi', gerekce: 'sızan gerekçe metni',
    });
    const [row] = duygu();
    expect(Object.keys(row.meta).sort()).toEqual(['ayristi', 'duzeltildi', 'kural', 'takas', 'yuzey']);
    expect(JSON.stringify(row)).not.toContain('kullanıcının kendi cümlesi');
    expect(JSON.stringify(row)).not.toContain('sızan gerekçe');
  });
});

/* ── Dikiş testi: kanal ile ÇAĞRI YERİ (06-summary-chat.js) ──
   Kapalı küme kanalın sözleşmesidir ama çağıran taraf çiğneyebilir —
   `wtLogDuygu('tutma', …)` satırı geri gelirse sessizce hiçbir şey yazmaz
   (K9 bekçisi kanalda da var), ama ÇAĞRI YERİNDE de bir bekçi olmalı ki
   K9 iki kez korunsun (bkz. FAZ 7 denetimi emsali — kriz iki kez korunur). */
describe('küme aynası — 06-summary-chat.js çağrısı K9 bekçisiyle sarılı', () => {
  it("çağrı yeri _dgEksen !== 'tutma' guard'ı taşır", async () => {
    const { readFileSync } = await import('fs');
    const { resolve, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    const kok = resolve(dirname(fileURLToPath(import.meta.url)), '../js/parts');
    const src = readFileSync(`${kok}/06-summary-chat.js`, 'utf-8');
    /* AKIŞ çağrısını hedefle, ilk eşleşmeyi DEĞİL (2026-08-30 düzeltmesi):
       FAZ 11'in şeffaflık paneli 06'ya İKİNCİ bir `wtLogDuygu?.` çağrısı
       ekledi (düzeltme jesti, dosyada daha ÖNCE geçiyor) ve `indexOf` o
       çağrıyı bulmaya başladı — test kod bozulmadan kırmızıya döndü.
       Bekçinin ait olduğu çağrı `_dgEksen` ile yapılandır; onu adıyla ara.
       Not: düzeltme jestinde K9 bekçisi GEREKMEZ — orada eksen kullanıcının
       susturduğu eksendir, kriz okuması değil. */
    const idx = src.indexOf('wtLogDuygu?.(_dgEksen');
    expect(idx).toBeGreaterThan(-1);
    expect(src.slice(idx - 400, idx)).toContain("_dgEksen !== 'tutma'");
  });
});
