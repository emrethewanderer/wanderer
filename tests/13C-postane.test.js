/**
 * Postane — 13C-postane.js · FAZ 7/8
 *
 * BÜLTEN (elle yazılan sayılar) ve POSTA AKIŞLARI (hoş geldin/geri çağrı)
 * admin odalarının istemci tarafı. Gönderimin kendisi TEK edge fonksiyonda
 * yaşar (eposta-gonder); burada sınanan şey İSTEMCİNİN DAVRANIŞI — kadranın
 * doğru alanları ayrı gösterip göstermediği, GÖNDER'in gönderilmiş bir
 * kampanyada gerçekten kilitli olup olmadığı, metni boş bir akışın
 * açılamadığı ve sınamanın deftere hiç dokunmadığı (K5/K9).
 *
 * sb.rpc / sb.from setup.js'te BİLİNÇLİ eksik ya da davranışı sabit — bu
 * dosya kendi kontrollü mock'unu kurar (emsal: tests/03-auth-tanisma.test.js).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  _pstKadranHTML,
  _pstFormHTML,
  _pstListHTML,
  _pstGonderimTabloHTML,
  _pstAkisCardHTML,
  pstRenderBulten,
  pstSayiSec,
  pstKaydetTaslak,
  pstSinamaGonder,
  pstGonderKampanya,
  pstAkisKaydet,
} from '../js/parts/13C-postane.js';
import { sb } from '../js/config.js';
import { S } from '../js/state.js';

function _gonderBtnTag(html) {
  const m = html.match(/<button[^>]*id="pst-gonder-btn"[^>]*>/);
  return m ? m[0] : null;
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
  S.currentUser = { id: 'admin-1', email: 'emre@wanderer.app' };
});

afterEach(() => {
  document.body.innerHTML = '';
  delete globalThis.fetch;
});

describe('_pstKadranHTML() — kadran (§6.10)', () => {
  it('bulten_ozet() alanlarını doğru sayılara basar', () => {
    const html = _pstKadranHTML({
      toplam: 120, adresli: 90, adressiz: 30, izinli: 70,
      gonderilebilir: 62, sekmis: 5, cikmis: 3, studio: 20, ucretsiz: 42,
    });
    for (const n of [120, 90, 30, 70, 62, 5, 3, 20, 42]) {
      expect(html).toContain(`>${n}<`);
    }
  });

  it('izinli ile gönderilebilir AYRI stat kutularında görünür — tek sayıya katlanmaz', () => {
    const html = _pstKadranHTML({ izinli: 70, gonderilebilir: 62 });
    const nums = [...html.matchAll(/<div class="pst-stat-num">(\d+)<\/div>/g)].map(m => m[1]);
    expect(nums).toContain('70');
    expect(nums).toContain('62');
  });

  it('adressiz kutusu lapis rengiyle (pst-stat--invite) işaretlenir — hata değil davettir', () => {
    const html = _pstKadranHTML({ adressiz: 12 });
    expect(html).toMatch(/<div class="pst-stat pst-stat--invite">\s*<div class="pst-stat-num">12<\/div>/);
  });

  it('eksik/boş girdide çökmez, 0 basar', () => {
    expect(() => _pstKadranHTML({})).not.toThrow();
    expect(() => _pstKadranHTML(null)).not.toThrow();
    expect(_pstKadranHTML(null)).toContain('>0<');
  });
});

describe('_pstFormHTML() — GÖNDER kilidi (§6.2 sahte başarı yok)', () => {
  const k = (durum) => ({ id: 1, durum, baslik: 'x', konu: 'y', govde: 'z', hedef: 'tumu' });

  it('taslak kampanyada GÖNDER AKTİFTİR', () => {
    const html = _pstFormHTML(k('taslak'));
    expect(_gonderBtnTag(html)).not.toContain('disabled');
  });

  it('gönderilmiş kampanyada GÖNDER KAPALIDIR ve gerekçesi yazılıdır', () => {
    const html = _pstFormHTML(k('gonderildi'));
    expect(_gonderBtnTag(html)).toContain('disabled');
    expect(html).toContain('Bu sayı zaten gönderildi.');
  });

  it('yeni taslakta (k=null) GÖNDER/sınama alanları hiç yoktur — kaydedilmemiş kampanya gönderilemez', () => {
    const html = _pstFormHTML(null);
    expect(html).not.toContain('pst-gonder-btn');
    expect(html).not.toContain('pst-sinama-btn');
  });
});

describe('_pstAkisCardHTML() — metni boş akış AÇILAMAZ', () => {
  it('konu/gövde boşken toggle kilitli ve gerekçe görünür', () => {
    const html = _pstAkisCardHTML({ anahtar: 'hos_geldin', ad: 'Hoş geldin', aciklama: 'açıklama', aktif: false, konu: '', govde: '', gecikme_saat: 2 });
    const toggle = html.match(/<input type="checkbox" id="pst-akis-hos_geldin-aktif"[^>]*>/)[0];
    expect(toggle).toContain('disabled');
    expect(html).toContain('Konu ve gövde doldurulmadan bu akış açılamaz.');
  });

  it('konu/gövde doluyken toggle açılabilir', () => {
    const html = _pstAkisCardHTML({ anahtar: 'geri_cagri', ad: 'Geri çağrı', aciklama: '', aktif: false, konu: 'Merhaba', govde: 'Seni özledik.', gecikme_saat: 168 });
    const toggle = html.match(/<input type="checkbox" id="pst-akis-geri_cagri-aktif"[^>]*>/)[0];
    expect(toggle).not.toContain('disabled');
    expect(html).not.toContain('Konu ve gövde doldurulmadan');
  });

  it('ad/açıklama admin panelinden DÜZENLENEMEZ — yalnız görüntülenir (K7)', () => {
    const html = _pstAkisCardHTML({ anahtar: 'hos_geldin', ad: 'Hoş geldin', aciklama: 'sabit metin', aktif: true, konu: 'k', govde: 'g', gecikme_saat: 2 });
    expect(html).not.toMatch(/id="pst-akis-hos_geldin-ad"/);
    expect(html).toContain('Hoş geldin');
    expect(html).toContain('sabit metin');
  });
});

describe('pstAkisKaydet() — sunucuya güvenmeden kilidi burada da uygular', () => {
  it('konu/gövde boşken aktif=true gönderilse bile PASİF kaydedilir', async () => {
    document.body.innerHTML = `
      <input id="pst-akis-hos_geldin-konu" value="">
      <textarea id="pst-akis-hos_geldin-govde"></textarea>
      <input id="pst-akis-hos_geldin-gecikme" value="2">
      <input type="checkbox" id="pst-akis-hos_geldin-aktif" checked>
      <button id="pst-akis-btn"></button>`;
    let updatePayload = null;
    sb.from = vi.fn(() => ({
      update: (payload) => { updatePayload = payload; return { eq: () => Promise.resolve({ data: null, error: null }) }; },
    }));
    await pstAkisKaydet('hos_geldin', document.getElementById('pst-akis-btn'));
    expect(updatePayload).not.toBeNull();
    expect(updatePayload.aktif).toBe(false);
  });

  it('konu/gövde doluyken aktif=true olduğu gibi kaydedilir', async () => {
    document.body.innerHTML = `
      <input id="pst-akis-geri_cagri-konu" value="Seni özledik">
      <textarea id="pst-akis-geri_cagri-govde">Bir süredir görünmüyorsun.</textarea>
      <input id="pst-akis-geri_cagri-gecikme" value="168">
      <input type="checkbox" id="pst-akis-geri_cagri-aktif" checked>
      <button id="pst-akis-btn"></button>`;
    let updatePayload = null;
    sb.from = vi.fn(() => ({
      update: (payload) => { updatePayload = payload; return { eq: () => Promise.resolve({ data: null, error: null }) }; },
    }));
    await pstAkisKaydet('geri_cagri', document.getElementById('pst-akis-btn'));
    expect(updatePayload.aktif).toBe(true);
    expect(updatePayload.konu).toBe('Seni özledik');
  });
});

describe('pstKaydetTaslak() — doğru tabloya doğru alanlarla yazar', () => {
  function formKur(vals) {
    document.body.innerHTML = `
      <input id="pst-baslik" value="${vals.baslik}">
      <input id="pst-konu" value="${vals.konu}">
      <textarea id="pst-govde">${vals.govde}</textarea>
      <select id="pst-hedef"><option value="${vals.hedef}" selected>${vals.hedef}</option></select>
      <button id="pst-kaydet-btn"></button>`;
  }

  it('yeni taslak eposta_kampanyalari tablosuna doğru alanlarla INSERT edilir', async () => {
    formKur({ baslik: 'Ağustos Sayısı', konu: 'Bu ay ne oldu?', govde: 'Merhaba gezgin.', hedef: 'studio' });
    let insert = null;
    sb.from = vi.fn((table) => ({
      insert: (payload) => {
        insert = { table, payload };
        return { select: () => ({ single: () => Promise.resolve({ data: { id: 7, ...payload, durum: 'taslak' }, error: null }) }) };
      },
    }));
    await pstKaydetTaslak(document.getElementById('pst-kaydet-btn'));
    expect(insert.table).toBe('eposta_kampanyalari');
    expect(insert.payload).toMatchObject({
      baslik: 'Ağustos Sayısı', konu: 'Bu ay ne oldu?', govde: 'Merhaba gezgin.', hedef: 'studio',
    });
  });

  it('başlık/konu/gövde boşken İSTEK ATMAZ — sahte başarı yok', async () => {
    formKur({ baslik: '', konu: 'y', govde: 'z', hedef: 'tumu' });
    const fromSpy = vi.fn();
    sb.from = fromSpy;
    await pstKaydetTaslak(document.getElementById('pst-kaydet-btn'));
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('yüklü bir taslak varsa ikinci kayıt YENİ satır açmaz, UPDATE eder', async () => {
    // Önce bir taslağı forma yükle (pstSayiSec → _pstAktifKampanya).
    sb.from = vi.fn(() => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 3, durum: 'taslak', baslik: 'a', konu: 'b', govde: 'c', hedef: 'tumu' }, error: null }) }) }),
    }));
    await pstSayiSec(3);

    formKur({ baslik: 'a2', konu: 'b2', govde: 'c2', hedef: 'tumu' });
    let updateCalled = null, insertCalled = false;
    sb.from = vi.fn(() => ({
      update: (payload) => { updateCalled = payload; return { eq: () => Promise.resolve({ data: null, error: null }) }; },
      insert: () => { insertCalled = true; return { select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }; },
    }));
    await pstKaydetTaslak(document.getElementById('pst-kaydet-btn'));
    expect(insertCalled).toBe(false);
    expect(updateCalled).toMatchObject({ baslik: 'a2', konu: 'b2', govde: 'c2' });
  });
});

describe('pstSinamaGonder() — kendine sınama (K9), deftere yazmaz', () => {
  beforeEach(async () => {
    sb.from = vi.fn(() => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 5, durum: 'taslak', baslik: 'x', konu: 'y', govde: 'z', hedef: 'tumu' }, error: null }) }) }),
    }));
    await pstSayiSec(5);
    sb.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, mod: 'sinama', gonderildi: true }) });
  });

  it('serbest metin adresi YOK — yalnız adminin KENDİ oturum e-postasına gider', async () => {
    await pstSinamaGonder();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(body.mod).toBe('sinama');
    expect(body.hedef_email).toBe('emre@wanderer.app');
  });

  it('deftere (eposta_gonderimleri) YAZMAZ — client sb.from çağrısı hiç yapmaz', async () => {
    const fromSpy = vi.fn();
    sb.from = fromSpy;
    await pstSinamaGonder();
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('oturum yoksa fetch İSTEMEZ', async () => {
    S.currentUser = null;
    globalThis.fetch = vi.fn();
    await pstSinamaGonder();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe('pstGonderKampanya() — geri alınamaz eylem, iki adımlı onay', () => {
  async function _kampanyaYukle(id, durum) {
    sb.from = vi.fn(() => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id, durum, baslik: 'x', konu: 'y', govde: 'z', hedef: 'tumu' }, error: null }) }) }),
    }));
    await pstSayiSec(id);
  }

  it('zaten gönderilmiş kampanyada fetch İSTEMEZ — kısıt panelde ÖNCE söylenir', async () => {
    await _kampanyaYukle(9, 'gonderildi');
    globalThis.fetch = vi.fn();
    await pstGonderKampanya();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('confirm() reddedilirse fetch İSTEMEZ — tek tıkla gönderme YOK', async () => {
    await _kampanyaYukle(10, 'taslak');
    globalThis.confirm = vi.fn(() => false);
    globalThis.fetch = vi.fn();
    await pstGonderKampanya();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('confirm() onaylanırsa mod:kampanya ile eposta-gonder çağrılır', async () => {
    await _kampanyaYukle(11, 'taslak');
    globalThis.confirm = vi.fn(() => true);
    sb.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null });
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, mod: 'kampanya', gonderildi: 3 }) });
    await pstGonderKampanya();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(globalThis.fetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ mod: 'kampanya', kampanya_id: 11 });
  });
});

describe('_pstGonderimTabloHTML() ve _pstListHTML() — boş/dolu durumlar', () => {
  it('boş dizide dürüst boş-durum metni gösterir', () => {
    expect(_pstGonderimTabloHTML([])).toContain('Henüz gönderim yok.');
    expect(_pstListHTML([])).toContain('Henüz sayı yazılmadı.');
  });

  it('gönderim satırları durum etiketiyle render edilir', () => {
    const html = _pstGonderimTabloHTML([
      { email: 'a@x.com', durum: 'gonderildi', sent_at: '2026-08-01T00:00:00Z' },
      { email: 'b@x.com', durum: 'sekti', hata: 'hard bounce' },
    ]);
    expect(html).toContain('a@x.com');
    expect(html).toContain('b@x.com');
    expect(html).toContain('doc-pill--ok');
    expect(html).toContain('doc-pill--crit');
  });
});

describe('pstRenderBulten() — uçtan uca, migration 047 henüz yoksa dürüst hata', () => {
  it('bulten_ozet() ve geçmiş listeyi çekip kadrana basar', async () => {
    document.body.innerHTML = '<div id="bulten-admin-host"></div>';
    sb.rpc = vi.fn().mockResolvedValue({ data: { toplam: 10, izinli: 6, gonderilebilir: 5, adressiz: 2 }, error: null });
    // Zincir hem `select().order().limit()` (kampanya listesi) hem
    // `select().eq().order().limit()` (bir önceki testten kalan aktif
    // kampanyanın gönderim tablosu) biçimini karşılamalı — modül state'i
    // testler arası (bilerek) sıfırlanmıyor, mock ikisini de taşımalı.
    sb.from = vi.fn(() => {
      const zincir = { select: () => zincir, eq: () => zincir, order: () => zincir, limit: () => Promise.resolve({ data: [], error: null }) };
      return zincir;
    });
    await pstRenderBulten();
    const host = document.getElementById('bulten-admin-host');
    expect(host.innerHTML).toContain('>10<');
    expect(host.innerHTML).toContain('>6<');
    expect(host.innerHTML).toContain('>5<');
  });

  it('RPC/tablo henüz yoksa (047 uygulanmadı) sahte veri UYDURMAZ, gerçek hata gösterir', async () => {
    document.body.innerHTML = '<div id="bulten-admin-host"></div>';
    sb.rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Could not find the function public.bulten_ozet without parameters in the schema cache' },
    });
    await pstRenderBulten();
    const host = document.getElementById('bulten-admin-host');
    expect(host.innerHTML).toContain('047_telefon_kimlik_ve_posta.sql');
  });
});
