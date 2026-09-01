/**
 * Tests for wtLogKart — Koleksiyon Nabzı (İç Çalışma 04 rev.2 · boşluk Y1).
 *
 * Kart evreninin iki kolu (kimlik 10q · bilgelik 12f) tek `kind:'kart'`
 * kanalında toplanır. Bu dosya kanalın SÖZLEŞMESİNİ mühürler: kapalı olay
 * kümesi, gizlilik süzgeci (kart METNİ meta'ya giremez), ekonominin işaretli
 * elmas alanı ve uid'siz sessiz düşüş.
 *
 * Gözlem yolu: _buf private — 20 sn'lik checkpoint (etw_wt_ckpt_<uid>) düz
 * localStorage'a yazıldığı için tampon oradan okunur. Sunucuya giden insert
 * (mig 033) bu dosyanın kapsamı DEĞİL.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

async function freshModule() {
  vi.resetModules();
  const { S } = await import('../js/state.js');
  const wt = await import('../js/parts/00f-kullanim-nabzi.js');
  return { S, wt };
}

/** Checkpoint'i tetikleyip tampondaki satırları döndürür. */
function ckptBuf(uid) {
  vi.advanceTimersByTime(20000);
  const raw = localStorage.getItem(`etw_wt_ckpt_${uid}`);
  return raw ? (JSON.parse(raw).buf || []) : [];
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('wtLogKart — sözleşme', () => {
  it('window üzerinden erişilebilir (10q/12f import etmeden çağırır — TDZ)', async () => {
    const { wt } = await freshModule();
    expect(typeof wt.wtLogKart).toBe('function');
    expect(typeof window.wtLogKart).toBe('function');
  });

  it('kapalı küme dışındaki olay satır yazmaz', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = { id: 'u1' };
    vi.useFakeTimers();
    wt.wtInit();
    wt.wtLogKart('uydurma-olay', { kartId: 'temel-ozsevgi-tac' });
    expect(ckptBuf('u1').filter(r => r.kind === 'kart')).toHaveLength(0);
  });

  it('uid yoksa sessizce düşer — anon oturumda çağrı zararsızdır', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = null;
    vi.useFakeTimers();
    wt.wtInit();
    expect(() => wt.wtLogKart('kazanim', { kartId: 'temel-ozsaygi-kok' })).not.toThrow();
    expect(localStorage.getItem('etw_wt_ckpt_undefined')).toBeNull();
  });
});

describe('wtLogKart — gizlilik süzgeci (00f sözleşmesi: içerik ASLA loglanmaz)', () => {
  it('kart METNİ kartId olarak verilirse null düşer, satır yine de sayılır', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = { id: 'u2' };
    vi.useFakeTimers();
    wt.wtInit();
    // Bir portre cümlesi: boşluklu, büyük harfli, uzun — etiket deseni tutmaz.
    wt.wtLogKart('kazanim', {
      kartId: 'Yıllarca herkese iyi davranıp sıra kendine gelince unutan kişidir.',
      nadirlik: 'nadide', kategori: 'temel', n: 3,
    });
    const [row] = ckptBuf('u2').filter(r => r.kind === 'kart');
    expect(row).toBeTruthy();
    expect(row.prev_screen).toBeNull();          // metin geçmedi
    expect(row.meta.nadirlik).toBe('nadide');    // etiket geçti
    expect(row.meta.n).toBe(3);
  });

  it('etiket alanlarına metin sızarsa null olur', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = { id: 'u3' };
    vi.useFakeTimers();
    wt.wtInit();
    wt.wtLogKart('paket', { kartId: 'hz_temel_oz_sevgi', nadirlik: 'Kendine İyi Davranan', kategori: 'hazine' });
    const [row] = ckptBuf('u3').filter(r => r.kind === 'kart');
    expect(row.meta.nadirlik).toBeNull();
    expect(row.meta.kategori).toBe('hazine');
    expect(row.prev_screen).toBe('hz_temel_oz_sevgi');
  });
});

describe('wtLogKart — iki kol tek kanalda', () => {
  it('kimlik kolu: ilk-kart ve kazanim ayrı olaylardır', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = { id: 'u4' };
    vi.useFakeTimers();
    wt.wtInit();
    wt.wtLogKart('ilk-kart', { kartId: 'temel-ozsevgi-filiz', nadirlik: 'yaygin', kategori: 'temel', n: 1 });
    wt.wtLogKart('kazanim', { kartId: 'temel-ozsevgi-kok', nadirlik: 'nadir', kategori: 'temel', n: 2 });
    const rows = ckptBuf('u4').filter(r => r.kind === 'kart');
    expect(rows.map(r => r.screen)).toEqual(['ilk-kart', 'kazanim']);
    expect(rows[1].meta.n).toBe(2);
  });

  it('ekonomi: harcama negatif, iade pozitif — işaret korunur', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = { id: 'u5' };
    vi.useFakeTimers();
    wt.wtInit();
    wt.wtLogKart('paket', { kartId: 'hz_temeller', kategori: 'hazine', nadirlik: 'efsane', n: 3, elmas: -30 });
    wt.wtLogKart('dupe-iade', { kartId: 'hz_temeller', kategori: 'hazine', n: 1, elmas: 6 });
    const rows = ckptBuf('u5').filter(r => r.kind === 'kart');
    expect(rows[0].meta.elmas).toBe(-30);
    expect(rows[1].meta.elmas).toBe(6);
  });

  it('sayı olmayan n/elmas 0 olur — uydurma değer yazılmaz (§6.10)', async () => {
    const { S, wt } = await freshModule();
    S.currentUser = { id: 'u6' };
    vi.useFakeTimers();
    wt.wtInit();
    wt.wtLogKart('set-tamam', { kartId: 'hz_temeller', kategori: 'hazine', n: 'çok', elmas: null });
    const [row] = ckptBuf('u6').filter(r => r.kind === 'kart');
    expect(row.meta.n).toBe(0);
    expect(row.meta.elmas).toBe(0);
  });
});

/* Faz 1 denetiminde bulunan kırığın mührü: 'set-tamam' damgası önce
   hzBuyPack'e yazılmıştı — set orada TESPİT edilir ama +40 Elmas tören
   kapanınca (hzSetCeremony) verilir. Tespit anında yazmak, ödenmemiş bir
   bonusu ödenmiş göstermekti. Bu bir kaynak sondasıdır: çağrı yerinin
   doğruluğu davranış testiyle yakalanamaz, çünkü iki yer de "çalışır". */
describe('çağrı yeri sözleşmesi — damgayı teslim eden basar (§6.10)', () => {
  it("'set-tamam' hzBuyPack'te değil, awardElmas'ın yanında yazılır", async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync('js/parts/12f-hazine-paketleri.js', 'utf-8');

    const buyStart = src.indexOf('export function hzBuyPack');
    const buyEnd   = src.indexOf('\n}', buyStart);
    const buyBody  = src.slice(buyStart, buyEnd);
    expect(buyBody).toContain("wtLogKart?.('paket'");        // maliyet burada gerçek
    expect(buyBody).not.toContain("'set-tamam'");            // bonus burada ödenmedi

    const odemeIdx = src.indexOf("awardElmas(HZ_SET_BONUS_ELMAS");
    const damgaIdx = src.indexOf("wtLogKart?.('set-tamam'");
    expect(odemeIdx).toBeGreaterThan(-1);
    expect(damgaIdx).toBeGreaterThan(odemeIdx);              // damga ödemeden SONRA
    expect(damgaIdx - odemeIdx).toBeLessThan(700);           // aynı blokta
  });
});
