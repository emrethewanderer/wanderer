/**
 * Tests for js/parts/10y2-baslaticilar.js — Kişisel Başlatıcılar.
 *
 * Kapsam: kalite kapısı (uzunluk, tek cümle, ikinci tekil hitap yasağı,
 * şablon sızıntısı), üç katmanlı malzeme seçimi (yaşam → Benlik Kartı →
 * hiç), bslOku'nun gün eşleşmesi + kanıtsız/susturulmuş soruyu eleme
 * sözleşmesi, bslDokuMaybe'ın kapıları (anon, çevrimdışı, "bugün zaten
 * dokunmuş") ve — bu süitin asıl sebebi — KANIT KAPISI: modelin
 * `kanit_ref`'i gerçek bir cümleye çözülemezse o soru DOĞMAZ (§6.10).
 *
 * Bu yol preview'da sınanamaz: depo SafeStorage per-uid'dir (Supabase KV),
 * anon oturumda dolmaz ve edge fonksiyonu deploy edilmemiştir.
 *
 * config.js (sb) mock'lanır — ağa çıkılmaz, invoke tam kontrol edilir.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// KISMİ mock (13w emsali): config.js tümden değiştirilmez, yalnız `sb`.
const _invoke = vi.fn();
vi.mock('../js/config.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, sb: { functions: { invoke: (...a) => _invoke(...a) } } };
});

import { S } from '../js/state.js';
import { SafeStorage, localISODate } from '../js/parts/00a-infrastructure.js';
import {
  bslGecerli, bslMalzeme, bslOku, bslKanit, bslDokuMaybe, bslCipleriBagla,
} from '../js/parts/10y2-baslaticilar.js';

const UID = 'bsl-test-user';
const KEY = `etw_baslatici_v1_${UID}`;

function gun(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return localISODate(d);
}

/* Kullanıcının gerçek cümleleri — kanıt havuzu. */
const SOZ_A = 'Yine aynı tartışmayı yaşadık, hep aynı yere geliyoruz sonunda.';
const SOZ_B = 'Kendime söz verdiğim şeyleri en kolay ben erteliyorum galiba.';

function resetState() {
  S.currentUser = { id: UID };
  S._currentLang = 'tr';
  S._portre = null;
  try { SafeStorage.remove(KEY); } catch (_) {}   // bellek-içi _kvCache şart
  _invoke.mockReset();
  // Malzeme kaynakları — her test kendi ihtiyacını ezer.
  window.ihOlgunluk = () => 'tanidik';
  window.kokenKullaniciSozleri = () => [SOZ_A, SOZ_B];
  window.sdSonSozler = () => [];
  window.fmGetActive = () => ({ id: 'bag', name: 'Wanderer Bağ', tagline: 'İlişki hayatı' });
  window.ihNeedTop = () => ({ eksen: 'oz_deger' });
  window.omGetTopPatterns = () => null;
  window.secBeyanVar = () => false;
  if (typeof navigator !== 'undefined') {
    try { Object.defineProperty(navigator, 'onLine', { value: true, configurable: true }); } catch (_) {}
  }
}

beforeEach(() => {
  resetState();
});

describe('bslGecerli — kalite kapısı', () => {
  it('gerçek bir soruyu kabul eder', () => {
    expect(bslGecerli('İlişkimde hep aynı döngüyü yaşıyorum — bendeki kök sebep ne?', 'tr')).toBe(true);
  });

  it('davet cümlesini de kabul eder (başlatıcı soru olmak zorunda değil)', () => {
    expect(bslGecerli('Biten ilişkimin dersini birlikte çıkaralım.', 'tr')).toBe(true);
  });

  it('çok kısa metni eler', () => {
    expect(bslGecerli('Neden?', 'tr')).toBe(false);
  });

  it('çok uzun metni eler', () => {
    expect(bslGecerli('A'.repeat(111) + '?', 'tr')).toBe(false);
  });

  it('ikinci tekil hitabı eler — soru kullanıcının ağzından çıkar', () => {
    expect(bslGecerli('Senin bugün neye ihtiyacın var, birlikte bakalım?', 'tr')).toBe(false);
    expect(bslGecerli('Kendine karşı neden bu kadar sertsin acaba?', 'tr')).toBe(false);
  });

  it('EN tarafında "you" hitabını eler', () => {
    expect(bslGecerli('What is the pattern you keep repeating in your life?', 'en')).toBe(false);
    expect(bslGecerli('Which pattern do I keep repeating in my closest bonds?', 'en')).toBe(true);
  });

  it('iki cümleyi eler — şerit tek cümle taşır', () => {
    expect(bslGecerli('Bugün çok zorlandım. Bunun kökünü birlikte bulalım?', 'tr')).toBe(false);
  });

  it('cümle sonu ortada kalmışsa eler', () => {
    expect(bslGecerli('Bugün zorlandım? ve bunun kökünü merak ediyorum', 'tr')).toBe(false);
  });

  it('sızmış şablon yuvasını eler', () => {
    expect(bslGecerli('{oruntu} kalıbım yine tekrarladı — kökü ne olabilir?', 'tr')).toBe(false);
  });

  it('alıntı/madde işaretiyle başlayanı eler', () => {
    expect(bslGecerli('“Hep aynı döngüyü yaşıyorum” cümlesini açalım mı?', 'tr')).toBe(false);
    expect(bslGecerli('- Erteleme kalıbımı birlikte çıkaralım.', 'tr')).toBe(false);
  });

  it('satır sonu içereni eler', () => {
    expect(bslGecerli('İlişkimde aynı döngü var\nkökü ne olabilir?', 'tr')).toBe(false);
  });

  it('sıra sayısının noktasını cümle sonu saymaz', () => {
    // "3." maskelenmezse iki cümle sanılır ve geçerli soru elenirdi.
    expect(bslGecerli('3. kez aynı hatayı yapıyorum — kökü ne olabilir?', 'tr')).toBe(true);
  });
});

describe('bslMalzeme — üç katman', () => {
  it('olgunluk tanıdıkken yaşam verisinden havuz kurar', () => {
    const m = bslMalzeme();
    expect(m.kaynak).toBe('yasam');
    expect(m.sozler).toContain(SOZ_A);
    expect(m.baglam.model).toBe('bag');
  });

  it('olgunluk tohumken Benlik Kartı cümlelerine düşer', () => {
    window.ihOlgunluk = () => 'tohum';
    S._portre = { dusunceler: [{ text: 'Yetersiz olduğumu düşünüyorum sık sık.', src: 'user' }],
                  inanclar: [], duygular: [], davranislar: [] };
    const m = bslMalzeme();
    expect(m.kaynak).toBe('portre');
    expect(m.sozler).toEqual(['Yetersiz olduğumu düşünüyorum sık sık.']);
  });

  it('Benlik Kartı\'nda kullanıcının EL YAZISI olmayan madde havuza girmez', () => {
    window.ihOlgunluk = () => 'tohum';
    S._portre = { dusunceler: [{ text: 'Emre çıkarımı olan bir cümle burada.', src: 'emre' }],
                  inanclar: [], duygular: [], davranislar: [] };
    expect(bslMalzeme()).toBeNull();
  });

  it('olgunluk tanıdık dese bile havuz boşsa portre katmanına düşer', () => {
    // Ölçüm kanıtın yerini almaz (§6.10): "tanıdık" bir etikettir, veri değil.
    window.kokenKullaniciSozleri = () => [];
    S._portre = { dusunceler: [{ text: 'Sınır koymakta çok zorlanıyorum.', src: 'user' }],
                  inanclar: [], duygular: [], davranislar: [] };
    const m = bslMalzeme();
    expect(m.kaynak).toBe('portre');
  });

  it('hiç veri yoksa null döner — şerit model başlatıcılarında kalır', () => {
    window.kokenKullaniciSozleri = () => [];
    window.sdSonSozler = () => [];
    expect(bslMalzeme()).toBeNull();
  });

  it('kaynak motorları yoksa çökmez', () => {
    delete window.ihOlgunluk;
    delete window.kokenKullaniciSozleri;
    delete window.sdSonSozler;
    delete window.fmGetActive;
    delete window.ihNeedTop;
    delete window.omGetTopPatterns;
    expect(() => bslMalzeme()).not.toThrow();
    expect(bslMalzeme()).toBeNull();
  });
});

describe('bslOku — gün eşleşmesi ve eleme sözleşmesi', () => {
  const SORU = { id: 'bsl_x', metin: 'Aynı tartışmaya neden hep geri dönüyorum?', kanit: SOZ_A };

  it('bugünün geçerli sorularını döndürür', () => {
    SafeStorage.set(KEY, { gun: gun(0), kaynak: 'yasam', sorular: [SORU] });
    expect(bslOku()).toEqual([SORU]);
  });

  it('dünün dokuması okunmaz', () => {
    SafeStorage.set(KEY, { gun: gun(-1), kaynak: 'yasam', sorular: [SORU] });
    expect(bslOku()).toEqual([]);
  });

  it('KANITSIZ soru elenir — kanıtı olmayan değer yoktur', () => {
    SafeStorage.set(KEY, { gun: gun(0), kaynak: 'yasam',
      sorular: [{ id: 'bsl_y', metin: 'Kanıtsız ama gayet düzgün duran bir soru?', kanit: '' }] });
    expect(bslOku()).toEqual([]);
  });

  it('kalite kapısını geçemeyen soru depodan gelse bile elenir', () => {
    SafeStorage.set(KEY, { gun: gun(0), kaynak: 'yasam',
      sorular: [{ id: 'bsl_z', metin: 'Senin kalıbın ne?', kanit: SOZ_A }] });
    expect(bslOku()).toEqual([]);
  });

  it('kullanıcının susturduğu soru şeritte görünmez', () => {
    SafeStorage.set(KEY, { gun: gun(0), kaynak: 'yasam', sorular: [SORU] });
    window.secBeyanVar = (id) => id === 'bsl_x';
    expect(bslOku()).toEqual([]);
  });

  it('en fazla üç soru döner — dördüncü yuva modelindir', () => {
    const cok = [1, 2, 3, 4].map(n => ({ id: 'bsl_' + n, kanit: SOZ_A,
      metin: `Bu ${n}. sorunun kökünü birlikte çıkaralım.` }));
    SafeStorage.set(KEY, { gun: gun(0), kaynak: 'yasam', sorular: cok });
    expect(bslOku()).toHaveLength(3);
  });

  it('bslKanit soruyu kanıtıyla birlikte verir ("Neden bu?" yüzeyi)', () => {
    SafeStorage.set(KEY, { gun: gun(0), kaynak: 'portre', sorular: [SORU] });
    expect(bslKanit('bsl_x')).toEqual({
      metin: SORU.metin, kanit: SOZ_A, kaynak: 'portre', gun: gun(0),
    });
    expect(bslKanit('yok')).toBeNull();
  });
});

describe('bslDokuMaybe — kapılar ve KANIT KAPISI', () => {
  const yanit = (sorular) => ({ data: { ok: true, sorular }, error: null });

  it('anon kullanıcıda dokuma yapılmaz', async () => {
    S.currentUser = null;
    expect(await bslDokuMaybe(true)).toBe(false);
    expect(_invoke).not.toHaveBeenCalled();
  });

  it('malzeme yoksa fonksiyon hiç çağrılmaz', async () => {
    window.kokenKullaniciSozleri = () => [];
    window.sdSonSozler = () => [];
    expect(await bslDokuMaybe(true)).toBe(false);
    expect(_invoke).not.toHaveBeenCalled();
  });

  it('bugün zaten dokunmuşsa çağrı yapılmaz', async () => {
    SafeStorage.set(KEY, { gun: gun(0), kaynak: 'yasam', sorular: [] });
    expect(await bslDokuMaybe(false)).toBe(false);
    expect(_invoke).not.toHaveBeenCalled();
  });

  it('ağ hatasında sessizce düşer', async () => {
    _invoke.mockResolvedValue({ data: null, error: new Error('boom') });
    expect(await bslDokuMaybe(true)).toBe(false);
    expect(bslOku()).toEqual([]);
  });

  it('kanıtı çözülen soru saklanır ve metin KAYNAKTAN kesilir', async () => {
    // Model kanıtı yeniden yazsa bile depoya giren kullanıcının cümlesidir.
    _invoke.mockResolvedValue(yanit([
      { soru: 'Aynı tartışmaya neden hep geri dönüyorum?', kanit_ref: 'S1',
        kanit_kirpma: 'hep aynı yere' },
    ]));
    expect(await bslDokuMaybe(true)).toBe(true);
    const okunan = bslOku();
    expect(okunan).toHaveLength(1);
    expect(okunan[0].kanit).toBe(SOZ_A);          // model kırpması değil, tam cümle
  });

  it('KANIT KAPISI: ref çözülemezse soru DOĞMAZ', async () => {
    _invoke.mockResolvedValue(yanit([
      { soru: 'Havuzda karşılığı olmayan uydurma bir soru?', kanit_ref: 'S9',
        kanit_kirpma: 'hiç söylemediğim bir cümle parçası' },
    ]));
    expect(await bslDokuMaybe(true)).toBe(false);
    expect(bslOku()).toEqual([]);
  });

  it('kalite kapısını geçemeyen soru düşer, geçen kalır', async () => {
    _invoke.mockResolvedValue(yanit([
      { soru: 'Senin kalıbın ne?', kanit_ref: 'S1' },                       // ikinci tekil
      { soru: 'Erteleme kalıbımın kökünü birlikte çıkaralım.', kanit_ref: 'S2' },
    ]));
    expect(await bslDokuMaybe(true)).toBe(true);
    const okunan = bslOku();
    expect(okunan).toHaveLength(1);
    expect(okunan[0].kanit).toBe(SOZ_B);
  });

  it('aynı soru iki kez gelirse bir kez saklanır', async () => {
    _invoke.mockResolvedValue(yanit([
      { soru: 'Erteleme kalıbımın kökünü birlikte çıkaralım.', kanit_ref: 'S2' },
      { soru: 'Erteleme kalıbımın kökünü birlikte çıkaralım.', kanit_ref: 'S1' },
    ]));
    await bslDokuMaybe(true);
    expect(bslOku()).toHaveLength(1);
  });

  it('fonksiyona kanıt bloğu ve bağlam gider, ham havuz dizisi GİTMEZ', async () => {
    _invoke.mockResolvedValue(yanit([]));
    await bslDokuMaybe(true);
    const [ad, opts] = _invoke.mock.calls[0];
    expect(ad).toBe('sohbet-baslaticilari');
    expect(opts.body.sozBlok).toContain('[S1]');
    expect(opts.body.baglam.model).toBe('bag');
    expect(opts.body.sozler).toBeUndefined();
  });

  it('gün anahtarı YEREL tarihtir — UTC gün kaydırmaz', async () => {
    _invoke.mockResolvedValue(yanit([
      { soru: 'Erteleme kalıbımın kökünü birlikte çıkaralım.', kanit_ref: 'S2' },
    ]));
    await bslDokuMaybe(true);
    expect(SafeStorage.get(KEY).gun).toBe(localISODate());
  });
});

describe('bslCipleriBagla — şerit her çizildiğinde çağrılır', () => {
  function serit(n) {
    const host = document.createElement('div');
    host.id = 'llm-starters';
    for (let i = 0; i < n; i++) {
      const b = document.createElement('button');
      b.className = 'llm-starter';
      b.setAttribute('data-bsl-id', 'bsl_' + i);
      host.appendChild(b);
    }
    // Model çipi — data-bsl-id YOK, dokunulmamalı
    const model = document.createElement('button');
    model.className = 'llm-starter';
    host.appendChild(model);
    document.body.appendChild(host);
    return host;
  }

  it('yalnız kişisel çipleri bağlar, model çipine dokunmaz', () => {
    const host = serit(2);
    bslCipleriBagla(host);
    const bagli = host.querySelectorAll('[data-bsl-bagli="1"]');
    expect(bagli).toHaveLength(2);
    expect(host.lastElementChild.hasAttribute('data-bsl-bagli')).toBe(false);
    host.remove();
  });

  it('aynı çipe iki kez bağlamaz (idempotent)', () => {
    const host = serit(1);
    bslCipleriBagla(host);
    bslCipleriBagla(host);
    expect(host.querySelectorAll('[data-bsl-bagli="1"]')).toHaveLength(1);
    host.remove();
  });

  it('document dinleyicisi çip başına BİRİKMEZ', () => {
    // Sızıntı: llmRenderHome her çizimde yeni çip yaratır; dinleyici çip
    // başına eklenirse çip DOM'dan gitse de document'ta kalırdı.
    const ekle = vi.spyOn(document, 'addEventListener');
    const a = serit(3); bslCipleriBagla(a); a.remove();
    const b = serit(3); bslCipleriBagla(b); b.remove();
    const vis = ekle.mock.calls.filter(c => c[0] === 'visibilitychange');
    expect(vis).toHaveLength(0);
    ekle.mockRestore();
  });
});
