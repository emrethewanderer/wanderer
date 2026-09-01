/**
 * Tanışma — 03-auth-shell.js · FAZ 3
 *
 * Kapı zaten açıldı (kod doğrulandı, oturum var); burada kimlik değil ad ve
 * yaş sorulur. _tanismaGerekli, _needsAgeGate'in YERİNE geçti — koşul artık
 * yalnız OAuth sağlayıcısına değil, profildeki `username`e bakar.
 *
 * sb.rpc / sb.from setup.js'te BİLİNÇLİ eksik ya da davranışı sabit
 * (§ tests/setup.js yorumu) — bu dosya kendi kontrollü mock'unu kurar
 * (emsal: tests/12f-hazine.test.js).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  _tanismaGerekli,
  _showTanisma,
  _authAdMusait,
  authTanismaAdInput,
  authTanismaGonder,
  authTanismaIptal,
  initApp,
} from '../js/parts/03-auth-shell.js';
import { HK_VERSION } from '../js/parts/13p-hukuk.js';
import { sb } from '../js/config.js';
import { S } from '../js/state.js';

/* Eşiğin sınanan parçası — gerçek _src.html'in aynı id/sınıf iskeleti. */
function esikKur() {
  document.body.innerHTML = `
    <div id="auth-screen">
      <div class="auth-panel" id="auth-adres" style="display:none;"></div>
      <div class="auth-panel" id="auth-kod" style="display:none;"></div>
      <div class="auth-panel" id="auth-tanisma" style="display:none;">
        <input id="auth-tanisma-ad" type="text">
        <div id="auth-tanisma-ad-durum"></div>
        <input id="auth-age-input" type="number">
        <button id="auth-tanisma-btn">Eşiği geç</button>
      </div>
      <div class="auth-err" id="auth-error"></div>
    </div>
    <div id="app-screen" style="display:none;"></div>`;
}

const hata  = () => document.getElementById('auth-error').textContent;
const durum = () => document.getElementById('auth-tanisma-ad-durum').textContent;

/* profiles UPDATE — çağrı argümanlarını gözlemleyen kontrollü mock.
   setup.js'in varsayılan stub'ı sabit {data:null,error:null} döner ve ne
   argümanı görür ne hatayı per-test değiştirir. */
let _profUpdate;

beforeEach(() => {
  esikKur();
  vi.clearAllMocks();
  vi.useRealTimers();
  sb.rpc = vi.fn().mockResolvedValue({ data: true, error: null });
  sb.from = vi.fn(() => ({
    update: (payload) => ({ eq: (col, val) => _profUpdate(payload, col, val) }),
  }));
  _profUpdate = vi.fn().mockResolvedValue({ data: null, error: null });
});

afterEach(() => {
  delete sb.rpc;
  delete sb.from;
});

describe('_tanismaGerekli(user, prof) — _needsAgeGate\'in yerine geçti', () => {
  it('kullanıcı yoksa gerekmez', () => {
    expect(_tanismaGerekli(null, null)).toBe(false);
  });

  it('profilde username yoksa gerekir', () => {
    expect(_tanismaGerekli({ user_metadata: { birth_year: 1990 } }, null)).toBe(true);
    expect(_tanismaGerekli({ user_metadata: { birth_year: 1990 } }, { username: null })).toBe(true);
  });

  it('doğum yılı beyan edilmemişse gerekir — username dolu olsa bile', () => {
    expect(_tanismaGerekli({ user_metadata: {} }, { username: 'Emre' })).toBe(true);
  });

  it('ikisi de doluysa gerekmez', () => {
    expect(_tanismaGerekli({ user_metadata: { birth_year: 1990 } }, { username: 'Emre' })).toBe(false);
  });
});

describe('authTanismaGonder() — ad boşken göndermez', () => {
  it('sahte başarı yok: updateUser çağrılmaz, hata görünür', async () => {
    document.getElementById('auth-age-input').value = '1990';
    await authTanismaGonder();
    expect(sb.auth.updateUser).not.toHaveBeenCalled();
    expect(_profUpdate).not.toHaveBeenCalled();
    expect(hata()).not.toBe('');
  });
});

describe('authTanismaGonder() — yaş kapısı', () => {
  it('13 altı içeri almaz: oturumu kapatır, eşiğe döner', async () => {
    sb.auth.signOut.mockClear();
    document.getElementById('auth-tanisma-ad').value = 'Deniz';
    document.getElementById('auth-age-input').value = String(new Date().getFullYear() - 6);
    document.getElementById('auth-tanisma').style.display = 'block';
    document.getElementById('auth-adres').style.display = 'none';

    await authTanismaGonder();

    expect(sb.auth.signOut).toHaveBeenCalledTimes(1);
    expect(sb.auth.updateUser).not.toHaveBeenCalled();
    expect(document.getElementById('auth-tanisma').style.display).toBe('none');
    expect(document.getElementById('auth-adres').style.display).toBe('block');
    expect(hata()).not.toBe('');
  });
});

describe('_authAdMusait(ad) — canlı müsaitlik, yalnız erken uyarı', () => {
  it('sunucu false dönerse "bu ad alınmış" gösterir', async () => {
    sb.rpc.mockResolvedValueOnce({ data: false, error: null });
    await _authAdMusait('ayse');
    expect(sb.rpc).toHaveBeenCalledWith('username_musait', { p_ad: 'ayse' });
    expect(durum()).toContain('alınmış');
  });

  it('sunucu true dönerse onay gösterir', async () => {
    sb.rpc.mockResolvedValueOnce({ data: true, error: null });
    await _authAdMusait('mehmet');
    expect(durum()).toContain('uygun');
  });

  it('ağ hatasında ENGELLEMEZ — sessizce düşer, ekranı bozmaz', async () => {
    sb.rpc.mockResolvedValueOnce({ data: null, error: { message: 'network' } });
    await expect(_authAdMusait('zeynep')).resolves.not.toThrow();
    expect(durum()).toBe('');
  });
});

describe('authTanismaAdInput(el) — 400ms debounce', () => {
  it('kısa adda RPC çağırmaz', () => {
    vi.useFakeTimers();
    const el = document.getElementById('auth-tanisma-ad');
    el.value = 'a';
    authTanismaAdInput(el);
    vi.advanceTimersByTime(500);
    expect(sb.rpc).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('yazmayı bitirdikten 400ms sonra tek çağrı yapar', () => {
    vi.useFakeTimers();
    const el = document.getElementById('auth-tanisma-ad');
    el.value = 'fatma';
    authTanismaAdInput(el);
    el.value = 'fatmagul';
    authTanismaAdInput(el); // önceki zamanlayıcıyı iptal eder
    vi.advanceTimersByTime(399);
    expect(sb.rpc).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(sb.rpc).toHaveBeenCalledTimes(1);
    expect(sb.rpc).toHaveBeenCalledWith('username_musait', { p_ad: 'fatmagul' });
    vi.useRealTimers();
  });
});

describe('authTanismaGonder() — username_musait false dönünce göndermez', () => {
  it('son bilinen canlı kontrol "alınmış" diyorsa göndermeden durur', async () => {
    _showTanisma({ id: 'u1', email: 'kerem@ornek.com', user_metadata: {} });
    document.getElementById('auth-tanisma-ad').value = 'kerem';
    document.getElementById('auth-age-input').value = '1990';
    sb.rpc.mockResolvedValueOnce({ data: false, error: null });
    await _authAdMusait('kerem'); // canlı kontrol: alınmış

    await authTanismaGonder();

    expect(sb.auth.updateUser).not.toHaveBeenCalled();
    expect(_profUpdate).not.toHaveBeenCalled();
    expect(hata()).toContain('alınmış');
  });
});

describe('authTanismaGonder() — 23505 çakışması (sunucu son sözü söyler)', () => {
  it('panel KAPANMAZ, "bu ad alınmış" gösterilir', async () => {
    _showTanisma({ id: 'u2', email: 'burak@ornek.com', user_metadata: {} });
    document.getElementById('auth-tanisma-ad').value = 'burak';
    document.getElementById('auth-age-input').value = '1990';
    document.getElementById('auth-tanisma').style.display = 'block';
    sb.auth.updateUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    _profUpdate.mockResolvedValueOnce({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "idx_profiles_username_ci"' },
    });

    await authTanismaGonder();

    expect(document.getElementById('auth-tanisma').style.display).toBe('block');
    expect(hata()).toContain('alınmış');
  });
});

describe('authTanismaGonder() — yazım hatasında panel KAPANMAZ (sahte başarı yok)', () => {
  it('updateUser hata dönerse profiles hiç yazılmaz, gerçek hata gösterilir', async () => {
    _showTanisma({ id: 'u3', email: 'canan@ornek.com', user_metadata: {} });
    document.getElementById('auth-tanisma-ad').value = 'canan';
    document.getElementById('auth-age-input').value = '1990';
    document.getElementById('auth-tanisma').style.display = 'block';
    sb.auth.updateUser.mockResolvedValueOnce({ data: null, error: { message: 'network hatası' } });

    await authTanismaGonder();

    expect(_profUpdate).not.toHaveBeenCalled();
    expect(document.getElementById('auth-tanisma').style.display).toBe('block');
    expect(hata()).not.toBe('');
  });

  it('profiles yazımı 23505 DIŞI hata dönerse gerçek hata gösterilir, panel kalır', async () => {
    _showTanisma({ id: 'u4', email: 'deniz2@ornek.com', user_metadata: {} });
    document.getElementById('auth-tanisma-ad').value = 'deniz2';
    document.getElementById('auth-age-input').value = '1990';
    document.getElementById('auth-tanisma').style.display = 'block';
    sb.auth.updateUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    _profUpdate.mockResolvedValueOnce({ data: null, error: { message: 'connection refused' } });

    await authTanismaGonder();

    expect(document.getElementById('auth-tanisma').style.display).toBe('block');
    expect(hata()).not.toBe('');
    expect(hata()).not.toContain('alınmış');
  });
});

describe('authTanismaGonder() — BAŞARI yolu', () => {
  it('updateUser ve profiles yazımı doğru alanlarla çağrılır; bulten_izin_surum HK_VERSION\'dır', async () => {
    _showTanisma({ id: 'u5', email: 'selin@ornek.com', user_metadata: {} });
    document.getElementById('auth-tanisma-ad').value = '  Selin  ';
    document.getElementById('auth-age-input').value = '1990';
    sb.auth.updateUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    sb.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'u5', email: 'selin@ornek.com', user_metadata: { full_name: 'Selin', birth_year: 1990, is_minor: false } } },
    });

    await authTanismaGonder();

    // Kırpılmış ad — K2: username YAZILDIĞI GİBİ saklanır, ama baştaki/sondaki
    // boşluk anlam taşımaz.
    expect(sb.auth.updateUser).toHaveBeenCalledWith({
      data: { full_name: 'Selin', birth_year: 1990, is_minor: false },
    });
    expect(_profUpdate).toHaveBeenCalledTimes(1);
    const [payload, col, val] = _profUpdate.mock.calls[0];
    expect(payload).toEqual({ username: 'Selin', email: 'selin@ornek.com', bulten_izin_surum: HK_VERSION });
    expect(col).toBe('id');
    expect(val).toBe('u5');
  });
});

describe('authTanismaIptal()', () => {
  it('oturumu kapatır ve kullanıcıyı eşiğin önüne alır', async () => {
    _showTanisma({ id: 'u6', email: 'iptal@ornek.com', user_metadata: {} });
    sb.auth.signOut.mockClear();
    document.getElementById('auth-tanisma').style.display = 'block';
    document.getElementById('auth-adres').style.display = 'none';

    await authTanismaIptal();

    expect(sb.auth.signOut).toHaveBeenCalledTimes(1);
    expect(document.getElementById('auth-tanisma').style.display).toBe('none');
    expect(document.getElementById('auth-adres').style.display).toBe('block');
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   K2 (sosyal-kapilar, FAZ 3) — OAuth kullanıcısı AYNI kapıdan geçer
   ───────────────────────────────────────────────────────────────────────
   Bu fazda YENİ kod yazılmadı: initApp'in tanışma kapısı zaten profile
   bakar (_tanismaGerekli(user, prof)), providera değil. Aşağıdaki testler
   initApp'in GERÇEK gövdesini OAuth-biçimli bir kullanıcıyla çağırıp bu
   iddiayı mühürler — taklit bir initApp değil.
   Kapsam sınırı: initApp'in tanışma-kapısı SONRASI gövdesi (avatar yazımı,
   loadSettings/loadKnowledge…) bu dosyanın kurduğu minimal eşik DOM'unun
   (#ob-name, #wn-splash yok) dışına taşar ve orada bilinçli olarak durur —
   "doğrudan içeri girer" iddiası S.currentUser atamasıyla kanıtlanır, çünkü
   bu atama initApp'te DOM'a dokunmadan ÖNCE, kapının hemen ardında olur.
   ═══════════════════════════════════════════════════════════════════════ */
describe('K2 — initApp: OAuth kullanıcısı aynı tanışma kapısından geçer', () => {
  // Google'ın initApp'e verdiği kullanıcı biçimi — _tanismaGerekli bu
  // biçimden yalnız user_metadata.birth_year'ı okur, app_metadata.provider'ı
  // HİÇ okumaz (K2'nin iddiası budur).
  const oauthUser = (userMeta = {}) => ({
    id: 'oauth-u1',
    email: 'ada@gmail.com',
    app_metadata: { provider: 'google', providers: ['google'] },
    user_metadata: { full_name: 'Ada Lovelace', avatar_url: 'https://lh3.googleusercontent.com/a', ...userMeta },
  });

  let _profSelect;

  beforeEach(() => {
    _profSelect = { data: null, error: null };
    // Bu blok initApp'i çağırdığı için sb.from hem SELECT (profil sorgusu +
    // storageInit'in user_analytics turu) hem UPDATE (authTanismaGonder)
    // zincirini desteklemeli — üst beforeEach yalnız update taşıyordu.
    sb.from = vi.fn(() => ({
      update: (payload) => ({ eq: (col, val) => _profUpdate(payload, col, val) }),
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve(_profSelect) }) }),
    }));
    S.currentUser = null;
  });

  afterEach(() => { S.currentUser = null; });

  it('profilinde username yok → tanışma paneli açılır, kapı içeri ALMAZ', async () => {
    _profSelect = { data: { username: null }, error: null };

    await initApp(oauthUser());

    expect(document.getElementById('auth-tanisma').style.display).toBe('block');
    expect(document.getElementById('auth-adres').style.display).toBe('none');
    expect(document.getElementById('auth-kod').style.display).toBe('none');
    expect(S.currentUser).toBe(null);
  });

  it('username VE doğum yılı beyanlı → tanışma paneli GÖRÜNMEZ, doğrudan içeri girer', async () => {
    _profSelect = { data: { username: 'ada' }, error: null };

    try {
      await initApp(oauthUser({ birth_year: 1990 }));
    } catch (_) {
      // Kapıdan SONRAKİ gövde bu testin kurmadığı gerçek uygulama DOM'una
      // (#ob-name) dokunur ve orada patlar — bu testin ilgisi yalnız GATE
      // kararı, o yüzden buradan sonrası bilinçli olarak yutulur (yukarıdaki
      // blok başlığına bkz).
    }

    // Kapı hiç açılmadı: initApp'in kapıdan SONRAKİ gövdesi bu satırdan
    // ÖNCE hiç çalışmaz — S.currentUser ataması gate'in hemen ardında,
    // DOM'a dokunmadan önce olur.
    expect(document.getElementById('auth-tanisma').style.display).toBe('none');
    expect(S.currentUser?.id).toBe('oauth-u1');
  });
});

describe('K2 — rıza damgası OAuth kökenli kullanıcıda da HK_VERSION ile basılır', () => {
  it('authTanismaGonder OAuth kullanıcısı için de bulten_izin_surum yazar', async () => {
    _showTanisma({
      id: 'oauth-u2', email: 'burak@gmail.com',
      app_metadata: { provider: 'google' },
      user_metadata: {},
    });
    document.getElementById('auth-tanisma-ad').value = 'burakOAuth';
    document.getElementById('auth-age-input').value = '1990';
    sb.auth.updateUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    sb.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'oauth-u2', email: 'burak@gmail.com', user_metadata: { full_name: 'burakOAuth', birth_year: 1990, is_minor: false } } },
    });

    await authTanismaGonder();

    expect(_profUpdate).toHaveBeenCalledTimes(1);
    const [payload] = _profUpdate.mock.calls[0];
    expect(payload.bulten_izin_surum).toBe(HK_VERSION);
  });
});
