// Bildirimler · Web Push (10x) — saf-fonksiyon testleri
import { describe, it, expect, beforeEach } from 'vitest';
import { urlBase64ToUint8Array, _buildEngagementSnapshot } from '../js/parts/10x-w2-bildirimler.js';
import { VAPID_PUBLIC } from '../js/config.js';
import { localISODate } from '../js/parts/00a-infrastructure.js';
import { S } from '../js/state.js';

describe('urlBase64ToUint8Array', () => {
  it('base64url\'ı doğru byte dizisine çevirir', () => {
    const out = urlBase64ToUint8Array('AAAA'); // atob → 3 sıfır byte
    expect(out).toBeInstanceOf(Uint8Array);
    expect(Array.from(out)).toEqual([0, 0, 0]);
  });

  it('VAPID public key 65 byte uncompressed P-256 noktasıdır (0x04 ile başlar)', () => {
    const key = urlBase64ToUint8Array(VAPID_PUBLIC);
    expect(key.length).toBe(65);
    expect(key[0]).toBe(0x04);
  });

  it('- ve _ karakterlerini (url-safe) standart base64\'e map\'ler', () => {
    // '-' → '+', '_' → '/' ; padding eklenir → çözülebilir olmalı
    const out = urlBase64ToUint8Array(VAPID_PUBLIC);
    expect(out.length).toBeGreaterThan(0);
  });
});

describe('_buildEngagementSnapshot', () => {
  beforeEach(() => {
    S._gunlukRitus = undefined;
    S.currentUser = { id: 'u1' };
  });

  it('motor için gerekli tüm sinyal alanlarını içerir', () => {
    const snap = _buildEngagementSnapshot();
    expect(snap).toHaveProperty('tz');
    expect(snap).toHaveProperty('streak');
    expect(snap).toHaveProperty('last_active_date');
    expect(snap).toHaveProperty('last_sealed_date');
    expect(snap).toHaveProperty('pending_soz_text');
    expect(snap.quiet_start).toBe(23);
    expect(snap.quiet_end).toBe(8);
  });

  it('lang alanı aktif arayüz diline eşit olur (push dil kilidi, mig 037)', () => {
    expect(_buildEngagementSnapshot().lang).toBe('tr');
  });

  it('last_active_date her zaman bugünün yerel ISO tarihidir', () => {
    expect(_buildEngagementSnapshot().last_active_date).toBe(localISODate());
  });

  it('söz/seri yokken streak 0 ve pending_soz_text null olur', () => {
    const snap = _buildEngagementSnapshot();
    expect(snap.streak).toBe(0);
    expect(snap.pending_soz_text).toBeNull();
  });

  it('bugün verilmiş, hesabı görülmemiş söz pending_soz_text\'e yansır', () => {
    S._gunlukRitus = {
      date: localISODate(),
      reckoned: false,
      pledges: [{ text: 'Bugün ertelediğim tek adımı atacağım.' }],
    };
    expect(_buildEngagementSnapshot().pending_soz_text).toContain('ertelediğim tek adımı');
  });

  it('akşam hesabı yapılmış (reckoned) söz artık pending sayılmaz', () => {
    S._gunlukRitus = {
      date: localISODate(),
      reckoned: true,
      pledges: [{ text: 'tutuldu' }],
    };
    expect(_buildEngagementSnapshot().pending_soz_text).toBeNull();
  });
});
