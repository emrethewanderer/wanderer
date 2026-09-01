/**
 * Tests for js/parts/13w-soz-terzisi.js — Söz Terzisi (gece dokuması).
 *
 * Kapsam: kalite kapısı (uzunluk, tek cümle, soru/ünlem yasağı, birinci tekil
 * gelecek zaman şartı — TR ve EN), stOku'nun gün eşleşmesi + bozuk kaydı
 * eleme sözleşmesi, stDokuMaybe'ın kapıları (anon, çevrimdışı, saat, "yarın
 * zaten dokunmuş"), edge fonksiyonu hata/eleme durumlarında SESSİZ düşüş ve
 * başarılı dokumanın yarının gün anahtarıyla saklanması.
 *
 * config.js (sb) mock'lanır — ağa çıkılmaz, invoke tam kontrol edilir.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// KISMİ mock: config.js'i tümden değiştirmek olmaz — başka modüller ondan
// AI_MODES gibi sabitleri okuyor. Yalnız `sb` yerine konur.
const _invoke = vi.fn();
vi.mock('../js/config.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, sb: { functions: { invoke: (...a) => _invoke(...a) } } };
});

import { S } from '../js/state.js';
import { SafeStorage, localISODate } from '../js/parts/00a-infrastructure.js';
import { stOku, stBugun, stDokuMaybe } from '../js/parts/13w-soz-terzisi.js';

const UID = 'st-test-user';
const KEY = `etw_soz_terzi_v1_${UID}`;

function gun(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return localISODate(d);
}

function resetState() {
  S.currentUser = { id: UID };
  S._currentLang = 'tr';
  S._lifeMemory = { people: {}, openLoops: [] };
  try { SafeStorage.remove(KEY); } catch (_) {}
  _invoke.mockReset();
  window.ihNeed = () => ({ eksen: 'oz_guven' });
  window.sdMertebe = () => 'adim';
  window.ihKisi = () => null;
  window.ihOlay = () => null;
  window.sdSonSozler = () => [];
}

beforeEach(() => {
  resetState();
});

describe('stOku — kalite kapısı ve gün eşleşmesi', () => {
  it('doğru günün geçerli sözlerini döndürür', () => {
    SafeStorage.set(KEY, { day: gun(0), sozler: { bireysel: 'Bugün ilk zor adımı atacağım.' } });
    expect(stBugun()).toEqual({ bireysel: 'Bugün ilk zor adımı atacağım.' });
  });

  it('başka güne ait dokuma okunmaz', () => {
    SafeStorage.set(KEY, { day: gun(-1), sozler: { bireysel: 'Bugün ilk adımı atacağım.' } });
    expect(stBugun()).toBeNull();
  });

  it('kayıt yoksa null (banka devreye girer)', () => {
    expect(stBugun()).toBeNull();
  });

  it('64 karakteri aşan söz elenir', () => {
    SafeStorage.set(KEY, { day: gun(0), sozler: { bireysel: 'Bugün ' + 'çok '.repeat(20) + 'uzun bir şey yapacağım.' } });
    expect(stBugun()).toBeNull();
  });

  it('soru ya da ünlem taşıyan söz elenir', () => {
    SafeStorage.set(KEY, { day: gun(0), sozler: { bireysel: 'Bugün bunu yapacağım!' } });
    expect(stBugun()).toBeNull();
  });

  it('birden çok cümle elenir', () => {
    SafeStorage.set(KEY, { day: gun(0), sozler: { bireysel: 'Bugün kalkacağım. Sonra yürüyeceğim.' } });
    expect(stBugun()).toBeNull();
  });

  it('birinci tekil gelecek zaman taşımayan söz elenir', () => {
    SafeStorage.set(KEY, { day: gun(0), sozler: { bireysel: 'Kendine iyi bak.' } });
    expect(stBugun()).toBeNull();
  });

  it('sızmış şablon yuvası olan söz elenir', () => {
    SafeStorage.set(KEY, { day: gun(0), sozler: { bireysel: 'Bugün {kisi} ile konuşacağım.' } });
    expect(stBugun()).toBeNull();
  });

  it('geçerli alanlar korunur, bozuk olanlar düşer (kısmi dokuma)', () => {
    SafeStorage.set(KEY, {
      day: gun(0),
      sozler: {
        bireysel: 'Bugün ilk zor adımı atacağım.',
        iliski: 'Ne yapmalıyım?',
        is: 'Bugün Kemal ile açık konuşacağım.',
      },
    });
    const out = stBugun();
    expect(Object.keys(out).sort()).toEqual(['bireysel', 'is']);
  });

  it('EN dilinde İngilizce gelecek zaman kabul edilir', () => {
    S._currentLang = 'en';
    SafeStorage.set(KEY, { day: gun(0), sozler: { bireysel: 'Today I will take the first step.' } });
    expect(stBugun()).toEqual({ bireysel: 'Today I will take the first step.' });
  });

  it('EN dilinde Türkçe kalıp elenir (dil karışması)', () => {
    S._currentLang = 'en';
    SafeStorage.set(KEY, { day: gun(0), sozler: { bireysel: 'Bugün ilk adımı atacağım.' } });
    expect(stBugun()).toBeNull();
  });
});

describe('stDokuMaybe — kapılar', () => {
  it('anon kullanıcı için dokunmaz', async () => {
    S.currentUser = null;
    expect(await stDokuMaybe(true)).toBe(false);
    expect(_invoke).not.toHaveBeenCalled();
  });

  it('yarın zaten dokunmuşsa tekrar dokunmaz', async () => {
    SafeStorage.set(KEY, { day: gun(1), sozler: { bireysel: 'Bugün adım atacağım.' } });
    expect(await stDokuMaybe(true)).toBe(false);
    expect(_invoke).not.toHaveBeenCalled();
  });

  it('force olmadan gündüz saatlerinde dokunmaz', async () => {
    const gercek = Date.prototype.getHours;
    Date.prototype.getHours = () => 9;
    try {
      expect(await stDokuMaybe(false)).toBe(false);
      expect(_invoke).not.toHaveBeenCalled();
    } finally { Date.prototype.getHours = gercek; }
  });
});

describe('stDokuMaybe — dokuma ve sessiz düşüş', () => {
  it('başarılı dokuma YARININ gün anahtarıyla saklanır', async () => {
    _invoke.mockResolvedValue({
      data: { ok: true, sozler: { bireysel: 'Bugün ilk zor adımı atacağım.' } },
      error: null,
    });
    expect(await stDokuMaybe(true)).toBe(true);
    const kayit = SafeStorage.get(KEY);
    expect(kayit.day).toBe(gun(1));
    expect(kayit.sozler.bireysel).toBe('Bugün ilk zor adımı atacağım.');
  });

  it('fonksiyona giden gövde yalnız türetilmiş sinyal taşır (ham metin YOK)', async () => {
    window.ihKisi = (a) => (a === 'iliski' ? 'Ayşe' : null);
    _invoke.mockResolvedValue({ data: { ok: true, sozler: { bireysel: 'Bugün adım atacağım.' } }, error: null });
    await stDokuMaybe(true);

    const [fnAdi, opts] = _invoke.mock.calls[0];
    expect(fnAdi).toBe('soz-terzisi');
    expect(opts.body.alanlar).toHaveLength(3);
    expect(opts.body.alanlar[0]).toHaveProperty('eksen');
    expect(opts.body.alanlar[0]).toHaveProperty('mertebe');
    expect(opts.body.alanlar.find(a => a.alan === 'iliski').kisi).toBe('Ayşe');
    // Sohbet metni / not / hafıza alanı GÖNDERİLMEZ
    expect(JSON.stringify(opts.body)).not.toMatch(/mesaj|sohbet|transcript/i);
  });

  it('fonksiyon hata dönerse sessizce düşer, depo kirletilmez', async () => {
    _invoke.mockResolvedValue({ data: null, error: { message: 'quota_exceeded' } });
    expect(await stDokuMaybe(true)).toBe(false);
    expect(SafeStorage.get(KEY)).toBeNull();
  });

  it('ağ patlarsa sessizce düşer (tören etkilenmez)', async () => {
    _invoke.mockRejectedValue(new Error('network down'));
    expect(await stDokuMaybe(true)).toBe(false);
    expect(SafeStorage.get(KEY)).toBeNull();
  });

  it('gelen sözlerin hepsi kapıdan elenirse hiçbir şey saklanmaz', async () => {
    _invoke.mockResolvedValue({
      data: { ok: true, sozler: { bireysel: 'Kendine iyi bak!', iliski: 'Ne yapmalıyım?' } },
      error: null,
    });
    expect(await stDokuMaybe(true)).toBe(false);
    expect(SafeStorage.get(KEY)).toBeNull();
  });

  it('kısmen geçerli yanıtta yalnız geçen sözler saklanır', async () => {
    _invoke.mockResolvedValue({
      data: { ok: true, sozler: { bireysel: 'Bugün ilk adımı atacağım.', is: 'Harika bir gün!' } },
      error: null,
    });
    expect(await stDokuMaybe(true)).toBe(true);
    const kayit = SafeStorage.get(KEY);
    expect(Object.keys(kayit.sozler)).toEqual(['bireysel']);
  });
});
