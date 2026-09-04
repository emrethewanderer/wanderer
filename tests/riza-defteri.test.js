/**
 * RIZA DEFTERİ — İç Çalışma 15 · boşluk C (Kalan Yol Haritası FAZ 7).
 *
 * `HK_VERSION` (13p-hukuk.js) bugüne kadar hangi kullanıcının hangi sürümü
 * kabul ettiğini hiçbir yerde tutmuyordu. `migrations/054_riza_defteri.sql`
 * `hukuk_kabul(user_id, surum, kabul_at)` defterini açar; `hkKabulYaz`
 * (13p-hukuk.js) kayıt anında (03-auth-shell.js) o deftere yazar.
 *
 * NOT — 054 bir Postgres migration dosyasıdır; vitest onu KOŞTURAMAZ. Bu
 * yüzden dosya KAYNAK TARAMASIYLA sınanır — aynı gerekçe `tik-atifi.test.js` /
 * `saklama-politikasi.test.js`'in kabul ettiği yöntemdir: biçim değişirse
 * sahte kırmızı verebilir, ama SÖZLEŞMEYİ statik olarak kanıtlar.
 * `hkKabulYaz`'ın kendisi ise gerçek JS'tir ve DAVRANIŞSAL sınanır —
 * `tik-atifi.test.js`'in `_markNotifClicked` mock kalıbının aynısı.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/* ═══ 1. migrations/054_riza_defteri.sql — kaynak taraması ═══ */

describe('migrations/054_riza_defteri.sql — hukuk_kabul sözleşmesi', () => {
  const sql = readFileSync(join(ROOT, 'migrations/054_riza_defteri.sql'), 'utf8');

  it('admin_usage_report HİÇ geçmez — 051 blok zincirine dokunmaz, taşıma borcu doğmaz', () => {
    expect((sql.match(/admin_usage_report/g) || []).length).toBe(0);
  });

  it('hukuk_kabul tablosu (user_id, surum, kabul_at) taşır, birincil anahtar (user_id, surum)', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS hukuk_kabul');
    expect(sql).toContain('user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE');
    expect(sql).toContain('surum     TEXT NOT NULL');
    expect(sql).toContain('kabul_at  TIMESTAMPTZ NOT NULL DEFAULT now()');
    expect(sql).toContain('PRIMARY KEY (user_id, surum)');
  });

  it('ON DELETE CASCADE — hesap silinince defter de gider (silme hakkı)', () => {
    expect(sql).toMatch(/REFERENCES auth\.users\(id\) ON DELETE CASCADE/);
  });

  it('RLS açık ve sahibi okur/yazar — yalnız kendi satırı', () => {
    expect(sql).toContain('ALTER TABLE hukuk_kabul ENABLE ROW LEVEL SECURITY');
    expect(sql).toMatch(/CREATE POLICY "hukuk_kabul owner select"[\s\S]*?USING \(user_id = auth\.uid\(\)\)/);
    expect(sql).toMatch(/CREATE POLICY "hukuk_kabul owner insert"[\s\S]*?WITH CHECK \(user_id = auth\.uid\(\)\)/);
  });

  it('UPDATE/DELETE politikası YAZILMAZ — bir rıza kaydı düzeltilmez, yenisi eklenir', () => {
    expect(sql).not.toMatch(/CREATE POLICY[^;]*hukuk_kabul[^;]*FOR UPDATE/is);
    expect(sql).not.toMatch(/CREATE POLICY[^;]*hukuk_kabul[^;]*FOR DELETE/is);
    // gerekçe dosyada yazılı olmalı — sessiz bir eksiklik değil
    expect(sql).toMatch(/UPDATE\/DELETE POLİTİKASI[\s\S]*yaz[iı]lmaz/i);
  });

  it('yalnız authenticated rol hedeflenir — anon/public\'e politika verilmez', () => {
    const policyBlok = sql.slice(
      sql.indexOf('CREATE TABLE IF NOT EXISTS hukuk_kabul'),
    );
    const policyler = policyBlok.match(/CREATE POLICY[^;]*;/gis) || [];
    expect(policyler.length).toBeGreaterThanOrEqual(2);
    for (const p of policyler) expect(p).toMatch(/TO authenticated/);
  });
});

/* ═══ 2. hkKabulYaz — davranışsal (tik-atifi.test.js `_markNotifClicked` kalıbı) ═══ */

/** config.js'in sb'sini mock'lu auth.getSession + from().upsert() ile değiştirir. */
async function mockSb({ session = null, upsertImpl = () => ({ error: null }) } = {}) {
  const upsert = vi.fn((row, opts) => Promise.resolve(upsertImpl(row, opts)));
  vi.doMock('../js/config.js', async (importOriginal) => {
    const actual = await importOriginal();
    return {
      ...actual,
      sb: {
        auth: { getSession: vi.fn(() => Promise.resolve({ data: { session } })) },
        from: vi.fn((table) => ({ upsert })),
      },
    };
  });
  const { sb } = await import('../js/config.js');
  return { sb, upsert };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.resetModules();
  vi.doUnmock('../js/config.js');
});

describe('hkKabulYaz — oturum yoksa hiçbir şey yazmaz', () => {
  it('surum boş/null/undefined ise oturum bile sorulmaz', async () => {
    const { sb, upsert } = await mockSb({ session: { user: { id: 'u1' } } });
    const { hkKabulYaz } = await import('../js/parts/13p-hukuk.js');
    hkKabulYaz(null);
    hkKabulYaz(undefined);
    hkKabulYaz('');
    await flush();
    expect(sb.auth.getSession).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it('oturum yoksa (session null) upsert hiç çağrılmaz', async () => {
    const { sb, upsert } = await mockSb({ session: null });
    const { hkKabulYaz } = await import('../js/parts/13p-hukuk.js');
    hkKabulYaz('1.3');
    await flush();
    expect(sb.auth.getSession).toHaveBeenCalledTimes(1);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('session.user eksikse (bozuk veri) upsert çağrılmaz', async () => {
    const { upsert } = await mockSb({ session: {} });
    const { hkKabulYaz } = await import('../js/parts/13p-hukuk.js');
    hkKabulYaz('1.3');
    await flush();
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe('hkKabulYaz — oturum varken doğru sözleşmeyle yazar', () => {
  it('user_id ve surum ile upsert çağrılır, onConflict user_id,surum + ignoreDuplicates', async () => {
    const { sb, upsert } = await mockSb({ session: { user: { id: 'u-42' } } });
    const { hkKabulYaz } = await import('../js/parts/13p-hukuk.js');
    hkKabulYaz('1.3');
    await flush();
    expect(sb.from).toHaveBeenCalledWith('hukuk_kabul');
    expect(upsert).toHaveBeenCalledWith(
      { user_id: 'u-42', surum: '1.3' },
      { onConflict: 'user_id,surum', ignoreDuplicates: true },
    );
  });

  it('upsert hata dönerse sessizce düşer — throw etmez (migration ELLE deploy edilmemiş olabilir)', async () => {
    const { upsert } = await mockSb({
      session: { user: { id: 'u-1' } },
      upsertImpl: () => ({ error: { message: 'relation "hukuk_kabul" does not exist' } }),
    });
    const { hkKabulYaz } = await import('../js/parts/13p-hukuk.js');
    expect(() => hkKabulYaz('1.3')).not.toThrow();
    await flush();
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('sb.auth.getSession reddederse (ağ hatası) fonksiyon patlamaz', async () => {
    vi.doMock('../js/config.js', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        sb: { auth: { getSession: () => Promise.reject(new Error('network')) }, from: vi.fn() },
      };
    });
    const { hkKabulYaz } = await import('../js/parts/13p-hukuk.js');
    expect(() => hkKabulYaz('1.3')).not.toThrow();
    await flush();
  });

  it('sb.auth.getSession senkron throw ederse bile fonksiyon patlamaz (savunmacı stil)', async () => {
    vi.doMock('../js/config.js', async (importOriginal) => {
      const actual = await importOriginal();
      return { ...actual, sb: { auth: { getSession: () => { throw new Error('boom'); } }, from: vi.fn() } };
    });
    const { hkKabulYaz } = await import('../js/parts/13p-hukuk.js');
    expect(() => hkKabulYaz('1.3')).not.toThrow();
  });
});

/* ═══ 3. 03-auth-shell.js — kayıt anında çağrı + bulten_izin_surum regresyonu ═══ */

describe('03-auth-shell.js — kayıt anında rıza defteri yazımı', () => {
  const src = readFileSync(join(ROOT, 'js/parts/03-auth-shell.js'), 'utf8');

  it('hkKabulYaz import edilmiş ve HK_VERSION ile çağrılıyor', () => {
    expect(src).toContain("import { HK_VERSION, hkKabulYaz } from './13p-hukuk.js';");
    expect(src).toContain('hkKabulYaz(HK_VERSION);');
  });

  it('bulten_izin_surum yazımı HÂLÂ duruyor — bu defter onun YERİNE geçmez (regresyon kilidi)', () => {
    expect(src).toContain(
      ".update({ username: ad, email: _tanismaUser?.email || null, bulten_izin_surum: HK_VERSION })",
    );
  });

  it('hkKabulYaz çağrısı profiles.update başarılı olduktan SONRA gelir (profErr guard\'ından sonra)', () => {
    const updateIdx = src.indexOf("bulten_izin_surum: HK_VERSION })");
    const kabulIdx = src.indexOf('hkKabulYaz(HK_VERSION);');
    expect(updateIdx).toBeGreaterThan(-1);
    expect(kabulIdx).toBeGreaterThan(updateIdx);
  });
});

/* ═══ 4. K4 kilidi — HK_VERSION bu fazda DEĞİŞMEDİ ═══ */

describe('K4 — HK_VERSION bu fazda artmaz (sürüm artışı FAZ 8\'in işi)', () => {
  it('HK_VERSION hâlâ 1.3', async () => {
    const { HK_VERSION } = await import('../js/parts/13p-hukuk.js');
    expect(HK_VERSION).toBe('1.3');
  });
});


/* ═══ FAZ 8a — DEFTERİ OKUYAN TARAF ═══════════════════════════════════════
   Buradaki tek karar şudur ve testlerin çoğu onu koruyor: **bilinmeyen,
   "kabul etmedi" DEĞİLDİR.** `054` ELLE bekliyor; tablo yokken sorgu hata
   döner ve o hatayı `false`'a çevirmek, defteri hiç okunmamış her
   kullanıcıyı "bu sürümü kabul etmedi" diye damgalardı — ölçülmemiş bir
   şeyi ölçülmüş gibi göstermek (§6.10). Üç hâl var, iki değil. */
describe('hkKabulVarMi — bilinmeyen ≠ kabul etmedi', () => {
  let hkKabulVarMi;
  const kur = (cfg) => {
    globalThis.__sbSahte = cfg;
  };

  beforeEach(async () => {
    vi.resetModules();
    // Gerçek config'i KORU, yalnız sb'yi değiştir — dar bir mock, modülün
    // öteki dışa aktarımlarını (AI_MODES vb.) sessizce yok ederdi.
    vi.doMock('../js/config.js', async (importOriginal) => ({
      ...(await importOriginal()),
      sb: {
        auth: { getSession: () => Promise.resolve(globalThis.__sbSahte.session) },
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({ limit: () => Promise.resolve(globalThis.__sbSahte.rows) }),
            }),
          }),
          upsert: () => Promise.resolve({ error: null }),
        }),
      },
    }));
    ({ hkKabulVarMi } = await import('../js/parts/13p-hukuk.js'));
  });

  it('oturum yoksa null döner — hüküm verilmez', async () => {
    kur({ session: { data: { session: null } }, rows: { data: [], error: null } });
    expect(await hkKabulVarMi('1.3')).toBeNull();
  });

  it('tablo yoksa (sorgu hatası) null döner — "kabul etmedi" DEMEZ', async () => {
    kur({
      session: { data: { session: { user: { id: 'u1' } } } },
      rows: { data: null, error: { message: 'relation "hukuk_kabul" does not exist' } },
    });
    // false olsaydı ayar satırı herkese "bu sürümü okumadın" derdi.
    expect(await hkKabulVarMi('1.3')).toBeNull();
  });

  it('tablo var + satır yok → kabul:false (BİLİNEN bir olumsuzluk)', async () => {
    kur({
      session: { data: { session: { user: { id: 'u1' } } } },
      rows: { data: [], error: null },
    });
    expect(await hkKabulVarMi('1.3')).toEqual({ kabul: false, tarih: null });
  });

  it('satır varsa kabul:true ve tarihi taşır', async () => {
    kur({
      session: { data: { session: { user: { id: 'u1' } } } },
      rows: { data: [{ kabul_at: '2026-09-04T10:00:00Z' }], error: null },
    });
    expect(await hkKabulVarMi('1.3')).toEqual({ kabul: true, tarih: '2026-09-04T10:00:00Z' });
  });

  it('sürüm verilmezse hiç sorgu yapılmaz', async () => {
    kur({ session: { data: { session: { user: { id: 'u1' } } } }, rows: { data: [], error: null } });
    expect(await hkKabulVarMi('')).toBeNull();
  });
});
