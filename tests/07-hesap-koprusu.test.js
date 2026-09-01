/**
 * Hesap köprüsü — 07-settings-knowledge.js · FAZ 10 (047)
 *
 * Ayarlar'daki Hesap grubu üç şeyi gösterir (adres, kullanıcı adı, bülten)
 * ve tek bir şeyi yazar (bülten yönü). Sınanan şey İSTEMCİNİN DAVRANIŞI:
 * bülten durumunun `profiles.bulten_izin`den (GENERATED, §6.10) OKUNMASI ve
 * asla client tarafından HESAPLANMAMASI · anının (`bulten_cikis_at`) yalnız
 * YÖN olarak yazılıp damganın sunucuya (trigger'a) bırakılması (047 §1.2) ·
 * yazım hatasında sahte başarı olmaması (§6.2) · sekmiş adresin (K9)
 * sessizce gizlenmemesi. GDPR dışa aktarımının rızanın kökenini (K4)
 * taşıdığı da burada sınanır.
 *
 * sb.rpc / sb.from setup.js'te BİLİNÇLİ eksik ya da davranışı sabit — bu
 * dosya kendi kontrollü mock'unu kurar (emsal: tests/13C-postane.test.js).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadSettings, acctBultenToggle } from '../js/parts/07-settings-knowledge.js';
import { exportUserData } from '../js/parts/gdpr.js';
import { sb } from '../js/config.js';
import { S } from '../js/state.js';

/** profiles select().eq().maybeSingle() zinciri — tek satırlık stub kurucu. */
function _profSelect(data, error = null) {
  return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data, error }) }) }) };
}

function _acctDom() {
  document.body.innerHTML = `
    <span id="acct-email">—</span>
    <span id="acct-username">—</span>
    <input type="checkbox" id="acct-bulten-toggle">
    <p id="acct-sekme-uyari" hidden></p>
    <div id="toast"></div>`;
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '';
  S.currentUser = { id: 'u-1', email: 'gezgin@ornek.com', created_at: '2026-01-01T00:00:00Z' };
  S.username = 'Gezgin';
  S.bultenIzin = true;
  S.isAdmin = false;
  S.settings = {};
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('loadSettings() — Hesap köprüsü basımı (K2/K3)', () => {
  it('adres S.currentUser.email\'den, kullanıcı adı S.username\'den basılır', async () => {
    _acctDom();
    sb.from = vi.fn((table) => {
      if (table === 'public_settings') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      if (table === 'profiles') return _profSelect({ email_sekme_at: null });
      throw new Error(`beklenmeyen tablo: ${table}`);
    });
    await loadSettings();
    expect(document.getElementById('acct-email').textContent).toBe('gezgin@ornek.com');
    expect(document.getElementById('acct-username').textContent).toBe('Gezgin');
  });

  it('kullanıcı adı yoksa "—" gösterilir — icat edilmiş bir ad DEĞİL', async () => {
    _acctDom();
    S.username = null;
    sb.from = vi.fn((table) => {
      if (table === 'public_settings') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      if (table === 'profiles') return _profSelect({ email_sekme_at: null });
    });
    await loadSettings();
    expect(document.getElementById('acct-username').textContent).toBe('—');
  });

  it('bülten anahtarı S.bultenIzin\'i (profiles.bulten_izin GENERATED) YANSITIR, client kendi hesaplamaz', async () => {
    _acctDom();
    sb.from = vi.fn((table) => {
      if (table === 'public_settings') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      if (table === 'profiles') return _profSelect({ email_sekme_at: null });
    });
    S.bultenIzin = true;
    await loadSettings();
    expect(document.getElementById('acct-bulten-toggle').checked).toBe(true);

    S.bultenIzin = false;
    await loadSettings();
    expect(document.getElementById('acct-bulten-toggle').checked).toBe(false);
  });

  it('email_sekme_at DOLUYKEN uyarı görünür — hata gizlenmez (K9)', async () => {
    _acctDom();
    sb.from = vi.fn((table) => {
      if (table === 'public_settings') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      if (table === 'profiles') return _profSelect({ email_sekme_at: '2026-08-20T10:00:00Z' });
    });
    await loadSettings();
    expect(document.getElementById('acct-sekme-uyari').hidden).toBe(false);
  });

  it('email_sekme_at BOŞKEN uyarı görünmez', async () => {
    _acctDom();
    sb.from = vi.fn((table) => {
      if (table === 'public_settings') return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) };
      if (table === 'profiles') return _profSelect({ email_sekme_at: null });
    });
    await loadSettings();
    expect(document.getElementById('acct-sekme-uyari').hidden).toBe(true);
  });
});

describe('acctBultenToggle() — anıyı client basmaz (047 §1.2)', () => {
  it('anahtar AÇILINCA bulten_cikis_at: null yazılır (geri dönüş)', async () => {
    _acctDom();
    document.getElementById('acct-bulten-toggle').checked = true; // browser onchange'den ÖNCE zaten günceller
    let payload = null;
    sb.from = vi.fn(() => ({
      update: (p) => { payload = p; return { eq: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: { bulten_izin: true }, error: null }) }) }) }; },
    }));
    await acctBultenToggle(true);
    expect(payload).toEqual({ bulten_cikis_at: null });
    expect(document.getElementById('acct-bulten-toggle').checked).toBe(true);
  });

  it('anahtar KAPANINCA bulten_cikis_at DOLU bir ISO damgası yazılır — anı client DAMGALAMAZ, yalnız YÖN yazar', async () => {
    _acctDom();
    document.getElementById('acct-bulten-toggle').checked = false;
    let payload = null;
    sb.from = vi.fn(() => ({
      update: (p) => { payload = p; return { eq: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: { bulten_izin: false }, error: null }) }) }) }; },
    }));
    await acctBultenToggle(false);
    expect(payload.bulten_cikis_at).not.toBeNull();
    expect(new Date(payload.bulten_cikis_at).toString()).not.toBe('Invalid Date');
    expect(document.getElementById('acct-bulten-toggle').checked).toBe(false);
  });

  it('ekrandaki durum sunucunun döndürdüğü bulten_izin\'den gelir, checked argümanından DEĞİL', async () => {
    // Sunucu (trigger) tazelenmiş sürüm nedeniyle "false" döndürse bile ekran
    // sunucuyu izler — istemcinin isteği tek başına kanıt sayılmaz.
    _acctDom();
    sb.from = vi.fn(() => ({
      update: () => ({ eq: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: { bulten_izin: false }, error: null }) }) }) }),
    }));
    await acctBultenToggle(true);
    expect(S.bultenIzin).toBe(false);
    expect(document.getElementById('acct-bulten-toggle').checked).toBe(false);
  });

  it('yazım hatasında anahtar ESKİ HÂLİNE döner ve gerçek hata gösterilir — sahte başarı yok (§6.2)', async () => {
    _acctDom();
    const toggle = document.getElementById('acct-bulten-toggle');
    toggle.checked = false; // kullanıcı kapattı (deneme)
    sb.from = vi.fn(() => ({
      update: () => ({ eq: () => ({ select: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: { message: 'column "bulten_cikis_at" does not exist' } }) }) }) }),
    }));
    await acctBultenToggle(false);
    expect(toggle.checked).toBe(true); // eski hâline döndü
    expect(document.getElementById('toast').textContent).toContain('column "bulten_cikis_at" does not exist');
    expect(document.getElementById('toast').className).toContain('err');
  });

  it('oturum yoksa istek atmaz, anahtarı eski hâline döndürür', async () => {
    _acctDom();
    S.currentUser = null;
    const fromSpy = vi.fn();
    sb.from = fromSpy;
    await acctBultenToggle(false);
    expect(fromSpy).not.toHaveBeenCalled();
    expect(document.getElementById('acct-bulten-toggle').checked).toBe(true);
  });
});

describe('exportUserData() — rızanın kökeni GDPR dışa aktarımına girer (K4)', () => {
  let capturedBlob = null;

  beforeEach(() => {
    document.body.innerHTML = '<div id="toast"></div>';
    capturedBlob = null;
    global.URL.createObjectURL = vi.fn((blob) => { capturedBlob = blob; return 'blob:mock'; });
    global.URL.revokeObjectURL = vi.fn();
  });

  it('username, bulten_izin ve kökeni (at/kaynak/surum) payload.user\'a girer', async () => {
    sb.from = vi.fn((table) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({
          data: { bulten_izin: true, bulten_izin_at: '2026-08-20T00:00:00Z', bulten_izin_kaynak: 'kayit_sozlesme', bulten_izin_surum: '1.3' },
          error: null,
        }) }) }) };
      }
      // USER_TABLES döngüsü: user_id filtreli tablolar — boş liste yeterli
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    });
    await exportUserData();
    expect(capturedBlob).not.toBeNull();
    const payload = JSON.parse(await capturedBlob.text());
    expect(payload.user).toMatchObject({
      username: 'Gezgin',
      bulten_izin: true,
      bulten_izin_at: '2026-08-20T00:00:00Z',
      bulten_izin_kaynak: 'kayit_sozlesme',
      bulten_izin_surum: '1.3',
    });
  });
});
