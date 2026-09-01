/**
 * Tests for js/parts/13m-kota.js — Kota Motoru (Claude tarzı çift kota).
 *
 * Kapsam: ktGate() karar mantığı (Max kısayolu, kriz lütfu, RPC-yok fallback,
 * server_enforced blok/izin, Ultra Armağanı devreye girişi, quota_consume yolu),
 * ktGrantUltraBonus() günde-bir guard'ı, ktWallText() duvar metni üretimi.
 *
 * Modül-private durum (_available, S._kota) testler arası sızmasın diye her
 * testte vi.resetModules() ile taze modül yüklenir (09f-epizodik-hafiza.test.js
 * kalıbı — mockSb/freshModule).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { localISODate } from '../js/parts/00a-infrastructure.js';

/* Gün anahtarı testte de YEREL olmalı: 13m `bonus_day`i `localISODate()` ile
   yazar, test `toISOString()` ile kuruyordu — TR'de gece yarısı ile 03:00
   arası UTC bir önceki günü verir ve süit o saatlerde kendiliğinden kırmızıya
   dönerdi (kodda hata yokken). [[yerel-tarih-anahtari]] tuzağının test tarafı. */

/** config.js'in sb'sini mock'lu rpc ile değiştirir. rpcImpl: (name, params) => {data,error} */
async function mockSb(rpcImpl) {
  vi.doMock('../js/config.js', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, sb: { rpc: vi.fn((name, params) => Promise.resolve(rpcImpl(name, params))) } };
  });
  const { sb } = await import('../js/config.js');
  return sb;
}

/** Modül-private durumu (_available, _tickTimer) sıfırlamak için her testte taze modül yükle. */
async function freshModule() {
  vi.resetModules();
  const { S } = await import('../js/state.js');
  const kt = await import('../js/parts/13m-kota.js');
  return { S, kt };
}

beforeEach(() => {
  vi.doUnmock('../js/config.js');
});

describe('ktGate — karar mantığı', () => {
  it('Max (isPremiumPlus): her zaman izinli, RPC hiç çağrılmaz', async () => {
    const rpc = vi.fn();
    await mockSb(rpc);
    const { S, kt } = await freshModule();
    S.currentUser = { id: 'u1' };
    S.isPremiumPlus = true;
    const res = await kt.ktGate();
    expect(res.allowed).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('kriz lütfu: _crisisMsgLeft>0 iken RPC atlanır, allowed true + reason crisis', async () => {
    const rpc = vi.fn();
    await mockSb(rpc);
    const { S, kt } = await freshModule();
    S.currentUser = { id: 'u1' };
    S.isPremiumPlus = false;
    S._crisisMsgLeft = 3;
    const res = await kt.ktGate();
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe('crisis');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('RPC yok (migration eksik, 42883): available false, allowed true (yerel sayaca düşer)', async () => {
    await mockSb(() => ({ data: null, error: { code: '42883' } }));
    const { S, kt } = await freshModule();
    S.currentUser = { id: 'u1' };
    S.isPremiumPlus = false;
    const res = await kt.ktGate();
    expect(res.available).toBe(false);
    expect(res.allowed).toBe(true);
  });

  it('server_enforced + pencere dolu: allowed false, reason window', async () => {
    await mockSb((name) => {
      if (name === 'quota_status') {
        return { data: { used_5h: 5, limit_5h: 5, used_week: 10, limit_week: 50, server_enforced: true }, error: null };
      }
      return { data: null, error: new Error('beklenmeyen rpc: ' + name) };
    });
    const { S, kt } = await freshModule();
    S.currentUser = { id: 'u1' };
    S.isPremiumPlus = false;
    const res = await kt.ktGate();
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('window');
  });

  it('server_enforced + hafta dolu (pencere açık): allowed false, reason week', async () => {
    await mockSb((name) => {
      if (name === 'quota_status') {
        return { data: { used_5h: 1, limit_5h: 5, used_week: 50, limit_week: 50, server_enforced: true }, error: null };
      }
      return { data: null, error: null };
    });
    const { S, kt } = await freshModule();
    S.currentUser = { id: 'u1' };
    const res = await kt.ktGate();
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('week');
  });

  it('server_enforced + dolu ama Ultra Armağanı taşıyor: allowed true, reason bonus', async () => {
    await mockSb((name) => {
      if (name === 'quota_status') {
        return {
          data: {
            used_5h: 5, limit_5h: 5, used_week: 10, limit_week: 50, server_enforced: true,
            bonus_day: localISODate(), bonus_left: 3, bonus_granted: 9,
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });
    const { S, kt } = await freshModule();
    S.currentUser = { id: 'u1' };
    const res = await kt.ktGate();
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe('bonus');
  });

  it('server_enforced + pencere açık: allowed true, iyimser artış, quota_consume ÇAĞRILMAZ', async () => {
    const rpc = vi.fn((name) => {
      if (name === 'quota_status') {
        return Promise.resolve({ data: { used_5h: 1, limit_5h: 5, used_week: 5, limit_week: 50, server_enforced: true }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
    vi.doMock('../js/config.js', async (importOriginal) => {
      const actual = await importOriginal();
      return { ...actual, sb: { rpc } };
    });
    const { S, kt } = await freshModule();
    S.currentUser = { id: 'u1' };
    const res = await kt.ktGate();
    expect(res.allowed).toBe(true);
    expect(rpc).not.toHaveBeenCalledWith('quota_consume', expect.anything());
  });

  it('server_enforced KAPALI: quota_consume RPC gerçekten tüketir', async () => {
    await mockSb((name) => {
      if (name === 'quota_status') {
        return { data: { used_5h: 1, limit_5h: 5, used_week: 5, limit_week: 50, server_enforced: false }, error: null };
      }
      if (name === 'quota_consume') {
        return { data: { used_5h: 2, limit_5h: 5, used_week: 6, limit_week: 50, allowed: true }, error: null };
      }
      return { data: null, error: null };
    });
    const { S, kt } = await freshModule();
    S.currentUser = { id: 'u1' };
    const res = await kt.ktGate();
    expect(res.allowed).toBe(true);
    expect(res.q.used_5h).toBe(2);
  });

  it('quota_consume sunucuda allowed:false döndürürse duvar iner', async () => {
    await mockSb((name) => {
      if (name === 'quota_status') {
        return { data: { used_5h: 1, limit_5h: 5, used_week: 5, limit_week: 50, server_enforced: false }, error: null };
      }
      if (name === 'quota_consume') {
        return { data: { used_5h: 5, limit_5h: 5, used_week: 50, limit_week: 50, allowed: false, reason: 'week' }, error: null };
      }
      return { data: null, error: null };
    });
    const { S, kt } = await freshModule();
    S.currentUser = { id: 'u1' };
    const res = await kt.ktGate();
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('week');
  });
});

describe('ktGrantUltraBonus — günde-bir guard', () => {
  it('Max kullanıcıda armağan verilmez (null), RPC çağrılmaz', async () => {
    const rpc = vi.fn();
    await mockSb(rpc);
    const { S, kt } = await freshModule();
    S.currentUser = { id: 'u1' };
    S.isPremiumPlus = true;
    const res = await kt.ktGrantUltraBonus();
    expect(res).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('kullanıcı yoksa null döner', async () => {
    const rpc = vi.fn();
    await mockSb(rpc);
    const { S, kt } = await freshModule();
    S.currentUser = null;
    const res = await kt.ktGrantUltraBonus();
    expect(res).toBeNull();
  });

  it('bugün zaten verildiyse RPC çağrılmadan mevcut sayı döner', async () => {
    const rpc = vi.fn();
    await mockSb(rpc);
    const { S, kt } = await freshModule();
    S.currentUser = { id: 'u1' };
    S.isPremiumPlus = false;
    const today = localISODate();
    S._kota = { bonus_day: today, bonus_granted: 9 };
    const res = await kt.ktGrantUltraBonus();
    expect(res).toBe(9);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('RPC başarılıysa yeni bonus sayısını döner', async () => {
    await mockSb((name) => {
      if (name === 'quota_bonus_grant') {
        return { data: { bonus_day: localISODate(), bonus_granted: 9, bonus_left: 9 }, error: null };
      }
      return { data: null, error: null };
    });
    const { S, kt } = await freshModule();
    S.currentUser = { id: 'u1' };
    S.isPremiumPlus = false;
    const res = await kt.ktGrantUltraBonus();
    expect(res).toBe(9);
  });
});

describe('ktWallText — duvar metni', () => {
  it('window: countdown varsa sub metninde geçer', async () => {
    const { kt } = await freshModule();
    const future = new Date(Date.now() + 2 * 3600000).toISOString();
    const r = kt.ktWallText('window', { reset_5h: future });
    expect(r.main).toBeTruthy();
    expect(r.sub).toMatch(/sonra/);
    expect(r.cta).toBeTruthy();
  });

  it('window: q yoksa countdown-suz fallback metin döner', async () => {
    const { kt } = await freshModule();
    const r = kt.ktWallText('window', null);
    expect(r.sub).toMatch(/Studio/);
  });

  it('week: countdown varsa sub metninde geçer', async () => {
    const { kt } = await freshModule();
    const future = new Date(Date.now() + 3 * 86400000).toISOString();
    const r = kt.ktWallText('week', { reset_week: future });
    expect(r.sub).toMatch(/sonra/);
  });

  it('week: q yoksa (yerel sayaç modu) klasik duvar metni döner', async () => {
    const { kt } = await freshModule();
    const r = kt.ktWallText('week', null);
    expect(r.sub).toMatch(/Studio/);
  });
});
