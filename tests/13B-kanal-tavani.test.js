/**
 * KANALLAR-ÜSTÜ TAVAN — davranışsal (İç Çalışma 11·F3 · FAZ 14b).
 *
 * `13B-toren-kuyrugu.test.js` tavanın VARLIĞINI ve sözleşmesini kaynaktan
 * tutuyor; bu dosya onun ISIRDIĞINI tutuyor. Ayrım gereksiz değil: bir
 * sabitin doğru yazıldığını kanıtlamak, o sabitin bir kararı gerçekten
 * değiştirdiğini kanıtlamaz — ve bu sprintte tam olarak o sınıftan iki
 * kırık çıktı (FAZ 16'nın `_master.gain`'i, FAZ 17'nin `TRN_TAVAN`'ı:
 * ikisinde de sayı yazılıydı, hiçbir şeyi etkilemiyordu).
 *
 * `notification_log` sorgusu mock'lanır (`vi.doMock` — `riza-defteri.test.js`
 * kalıbı). Mock'lanan şey KANAL, kural değil: tavanın kendisi gerçek kodda
 * koşar.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

/** 13B'yi, `notification_log` şu satırları döndürüyormuş gibi taze yükler. */
async function kuyrukYukle(satirlar, { hata = false } = {}) {
  vi.resetModules();
  vi.doMock('../js/config.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      sb: {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => Promise.resolve(
                hata ? { data: null, error: new Error('ağ') } : { data: satirlar, error: null })),
            })),
          })),
        })),
      },
    };
  });
  vi.doMock('../js/state.js', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, S: { ...actual.S, currentUser: { id: 'u1' } } };
  });
  const mod = await import('../js/parts/13B-toren-kuyrugu.js');
  mod.trnSifirla();
  return mod;
}

beforeEach(() => {
  document.body.innerHTML = '';
  vi.resetModules();
});

describe('tavan ısırıyor mu — bildirim tören bütçesini yer', () => {
  it('bugün İKİ push gittiyse davetsiz sahneye tek yuva kalır', async () => {
    const { trnIzin, trnKanalTazele, trnDurum } = await kuyrukYukle([
      { type: 'winback', sent_at: new Date().toISOString() },
      { type: 'morning', sent_at: new Date().toISOString() },
    ]);
    await trnKanalTazele();
    expect(trnDurum().push).toBe(2);

    // Zorunlu ritüel MUAF — günün omurgası kesilmez (bütçeyi yine de tüketir).
    expect(trnIzin('gunluk-ritus')).toBe(true);
    // 2 push + 1 sahne = 3 → tavan doldu; ikinci davetsiz sahne susar.
    expect(trnIzin('seri-muhru')).toBe(false);
  });

  it('ÜÇ push gittiyse bile kullanıcının KENDİ açtığı kapı açılır', async () => {
    const { trnIzin, trnKanalTazele } = await kuyrukYukle([
      { type: 'winback', sent_at: new Date().toISOString() },
      { type: 'soz', sent_at: new Date().toISOString() },
      { type: 'milestone', sent_at: new Date().toISOString() },
    ]);
    await trnKanalTazele();
    /* Sözleşmenin özü: tavan DAVETSİZ dokunuşu seyreltir, kullanıcının
       kendi isteğini değil. `davetsiz:false` bu satıra hiç uğramaz. */
    expect(trnIzin('imge-kapisi', { davetsiz: false })).toBe(true);
  });

  it('`test` ve `broadcast` sayılmaz — motorun freq-cap\'iyle aynı defter', async () => {
    const { trnIzin, trnKanalTazele, trnDurum } = await kuyrukYukle([
      { type: 'test', sent_at: new Date().toISOString() },
      { type: 'broadcast', sent_at: new Date().toISOString() },
      { type: 'winback', sent_at: new Date().toISOString() },
    ]);
    await trnKanalTazele();
    // Üç satır var ama yalnız biri KİŞİSEL bir dokunuştur.
    expect(trnDurum().push).toBe(1);
    expect(trnIzin('gunluk-ritus')).toBe(true);  // 1 + 1 = 2 < 3
    expect(trnIzin('seri-muhru')).toBe(true);    // 1 + 2 = 3 → bu sonuncusu
    expect(trnIzin('imge-kapisi')).toBe(false);
  });

  it('sorgu düşerse tavan DARALTMAZ — ölçüm hatası töreni öldürmez (§5.2)', async () => {
    const { trnIzin, trnKanalTazele, trnDurum } = await kuyrukYukle(null, { hata: true });
    await trnKanalTazele();
    expect(trnDurum().push).toBe(0);
    // Hata öncesi davranışın aynısı: iki davetsiz sahne geçer.
    expect(trnIzin('gunluk-ritus')).toBe(true);
    expect(trnIzin('seri-muhru')).toBe(true);
  });

  it('oturum yoksa hiç sorulmaz — anon kullanıcı için defter YOKTUR', async () => {
    vi.resetModules();
    vi.doMock('../js/state.js', async (importOriginal) => {
      const actual = await importOriginal();
      return { ...actual, S: { ...actual.S, currentUser: null } };
    });
    const fromSpy = vi.fn();
    vi.doMock('../js/config.js', async (importOriginal) => {
      const actual = await importOriginal();
      return { ...actual, sb: { from: fromSpy } };
    });
    const mod = await import('../js/parts/13B-toren-kuyrugu.js');
    mod.trnSifirla();
    await mod.trnKanalTazele();
    expect(fromSpy).not.toHaveBeenCalled();
    expect(mod.trnDurum().push).toBe(0);
  });
});
