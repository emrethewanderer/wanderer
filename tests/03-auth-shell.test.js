/**
 * Smoke tests for js/parts/03-auth-shell.js
 *
 * Covers exports + pure helpers (toggleMenu, toggleCat, switchView guards,
 * premium spotlight) ve OAuth kestirmesi (doOAuth/authHandleOAuthUrl).
 * Network yolları mocked away by the Supabase stub in setup.js.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  toggleMenu,
  toggleCat,
  switchView,
  showPremiumFeatureSpotlight,
  closePremiumSpotlight,
  _splashPlan,
  _showTanisma,
  _closeSplash,
  doOAuth,
  authHandleOAuthUrl,
  authNativeDeepLinkInit,
  NATIVE_OAUTH_REDIRECT,
} from '../js/parts/03-auth-shell.js';
import { sb } from '../js/config.js';

describe('toggleMenu()', () => {
  it('toggles "open" class on #global-menu when element exists', () => {
    const menu = document.createElement('div');
    menu.id = 'global-menu';
    document.body.appendChild(menu);
    toggleMenu();
    expect(menu.classList.contains('open')).toBe(true);
    toggleMenu();
    expect(menu.classList.contains('open')).toBe(false);
    menu.remove();
  });
});

describe('toggleCat(btn)', () => {
  it('does not throw when sibling group exists', () => {
    const btn = document.createElement('button');
    const group = document.createElement('div');
    group.className = 'gm-cat-group';
    const wrap = document.createElement('div');
    wrap.appendChild(btn);
    wrap.appendChild(group);
    document.body.appendChild(wrap);
    expect(() => toggleCat(btn)).not.toThrow();
    expect(group.classList.contains('open')).toBe(true);
    wrap.remove();
  });

  it('no-ops when sibling is not a cat group', () => {
    const btn = document.createElement('button');
    const sibling = document.createElement('div');
    const wrap = document.createElement('div');
    wrap.appendChild(btn);
    wrap.appendChild(sibling);
    document.body.appendChild(wrap);
    expect(() => toggleCat(btn)).not.toThrow();
    expect(sibling.classList.contains('open')).toBe(false);
    wrap.remove();
  });
});

describe('switchView(v)', () => {
  it('does not throw with arbitrary view name', () => {
    expect(() => switchView('test-view')).not.toThrow();
  });

  it('is callable with no argument', () => {
    expect(() => switchView()).not.toThrow();
  });
});

describe('showPremiumFeatureSpotlight / closePremiumSpotlight', () => {
  it('functions exist and are callable', () => {
    expect(typeof showPremiumFeatureSpotlight).toBe('function');
    expect(typeof closePremiumSpotlight).toBe('function');
    expect(() => closePremiumSpotlight()).not.toThrow();
  });
});

describe('_splashPlan(uid) — açılış perdesi üç kademe', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('Kat 1: bugün cihazdaki ilk çağrı → tam perde (4000ms, brief:false)', () => {
    expect(_splashPlan('uid-splash-1')).toEqual({ ms: 4000, brief: false });
  });

  it('Kat 0: aynı tarayıcı oturumunda ikinci çağrı → perde yok (ms:0)', () => {
    _splashPlan('uid-splash-1'); // ilk çağrı sessionStorage bayrağını kurar
    expect(_splashPlan('uid-splash-1')).toEqual({ ms: 0, brief: false });
  });

  it('Kat 2: yeni sekme (sessionStorage temiz) ama aynı gün → kısa nefes (2000ms, brief:true)', () => {
    _splashPlan('uid-splash-1'); // bugünün gün-anahtarını localStorage'a yazar
    sessionStorage.clear();      // yeni sekme/oturum simülasyonu — gün anahtarı KALIR
    expect(_splashPlan('uid-splash-1')).toEqual({ ms: 2000, brief: true });
  });

  it('farklı uid (farklı hesap) bu cihazda bağımsız izlenir', () => {
    _splashPlan('uid-splash-a');
    sessionStorage.clear(); // yeni sekme — yalnız gün-anahtarının hesaba bağlılığı
    expect(_splashPlan('uid-splash-b')).toEqual({ ms: 4000, brief: false });
  });

  // Hesap değişimi signOut→location.reload() ile olur; sessionStorage reload'ı
  // aşar. Oturum bayrağı uid'siz olsaydı yeni hesap kat 0'a düşer, kendi
  // karşılamasını hiç görmezdi.
  it('aynı oturumda hesap değişince yeni hesap kendi karşılamasını görür', () => {
    _splashPlan('uid-splash-a');                        // A perdeyi gördü
    expect(_splashPlan('uid-splash-a').ms).toBe(0);     // A yeniden boot → perde yok
    expect(_splashPlan('uid-splash-b')).toEqual({ ms: 4000, brief: false });
  });
});

describe('_closeSplash(splashEl) — idempotent kapanış', () => {
  it('ilk çağrı kapanışı başlatır (cascade bir kez); çakışan ikinci çağrı (dokunuş+tuş) no-op kalır', () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    el.className = 'show brief';
    document.body.appendChild(el);
    const cascadeSpy = vi.fn();
    window.llmHomeCascade = cascadeSpy;

    _closeSplash(el);
    _closeSplash(el); // aynı anda ikinci tetik — guard olmadan cascade iki kez oynardı
    expect(cascadeSpy).toHaveBeenCalledTimes(1);
    expect(el.classList.contains('closing')).toBe(true);

    vi.advanceTimersByTime(720);
    expect(el.classList.contains('show')).toBe(false);
    expect(el.classList.contains('closing')).toBe(false);
    expect(el.classList.contains('brief')).toBe(false);

    vi.useRealTimers();
    el.remove();
    delete window.llmHomeCascade;
  });
});

/* ─── Eşiğin Nabzı (FAZ 2): perde kapanışı wtLogEsik'e satır düşürür ───
   _splashShownAt/_splashKat initApp'in ağ/DOM zincirinden geçmeden set
   edilemediği için her test TAZE modül instance'ı kurar (_markSplashShown
   test seamı) — paylaşılan üstteki _closeSplash testinin `_splashClosed`
   bayrağına dokunmadan. */
describe('_closeSplash(splashEl, atlandi) — Eşiğin Nabzı (wtLogEsik)', () => {
  async function freshAuthShell() {
    vi.resetModules();
    return import('../js/parts/03-auth-shell.js');
  }

  afterEach(() => {
    vi.useRealTimers();
    delete window.wtLogEsik;
  });

  it('dokunuşla atlanınca dal + gerçek süre + atlandi:1 yazılır', async () => {
    const mod = await freshAuthShell();
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.appendChild(el);
    const logSpy = vi.fn();
    window.wtLogEsik = logSpy;

    mod._markSplashShown('kat2');
    vi.advanceTimersByTime(500); // izlenen süre — planlanan ms değil
    mod._closeSplash(el, true);

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith('perde', { dal: 'kat2', sureMs: 500, atlandi: 1 });

    vi.advanceTimersByTime(720);
    el.remove();
  });

  it('timer yoluyla (süre dolunca) atlandi:0 yazılır', async () => {
    const mod = await freshAuthShell();
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.appendChild(el);
    const logSpy = vi.fn();
    window.wtLogEsik = logSpy;

    mod._markSplashShown('kat1');
    vi.advanceTimersByTime(4000);
    mod._closeSplash(el); // atlandi parametresiz — varsayılan (timer yolu)

    expect(logSpy).toHaveBeenCalledWith('perde', { dal: 'kat1', sureMs: 4000, atlandi: 0 });

    vi.advanceTimersByTime(720);
    el.remove();
  });

  it('perde hiç gösterilmediyse (kat 0) hiçbir satır yazılmaz', async () => {
    const mod = await freshAuthShell();
    vi.useFakeTimers();
    const el = document.createElement('div');
    document.body.appendChild(el);
    const logSpy = vi.fn();
    window.wtLogEsik = logSpy;

    mod._closeSplash(el); // _markSplashShown hiç çağrılmadı — olmayan perde ölçülmez

    expect(logSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(720);
    el.remove();
  });
});

/* ═══ EŞİK — tek kapı: adres → kod → tanışma ═══ */

function mountEsik() {
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div id="auth-screen"></div>
    <div id="app-screen"></div>
    <div id="auth-adres"></div>
    <div id="auth-kod" style="display:none;"></div>
    <div id="auth-tanisma" style="display:none;">
      <input id="auth-tanisma-ad"><input id="auth-age-input"><button id="auth-tanisma-btn"></button>
    </div>
    <div id="auth-error"></div>`;
  document.body.appendChild(wrap);
  return wrap;
}

/* ═══ OAuth kestirmesi — Google · Apple (sosyal-kapilar planı FAZ 1) ═══
   Kod kapısının zemini bozulmuyor; doOAuth/authHandleOAuthUrl yalnız aynı
   eşiğe ikinci bir yoldan girer. Kod kapısının kendi testleri ayrı dosyada:
   tests/03-auth-kod-kapisi.test.js. */

describe('doOAuth(provider)', () => {
  it('sağlayıcıyı ve sorgu/hash artıksız dönüş adresini Supabase\'e geçirir', async () => {
    const wrap = mountEsik();
    sb.auth.signInWithOAuth.mockClear();
    await doOAuth('google');
    expect(sb.auth.signInWithOAuth).toHaveBeenCalledTimes(1);
    const arg = sb.auth.signInWithOAuth.mock.calls[0][0];
    expect(arg.provider).toBe('google');
    expect(arg.options.redirectTo).toBe(window.location.origin + window.location.pathname);
    // Web'de yönlendirmeyi tarayıcı yapar — kendimiz sayfa açmayız.
    expect(arg.options.skipBrowserRedirect).toBeUndefined();
    wrap.remove();
  });

  it('Supabase hata dönerse i18n\'li mesaj eşikte görünür (sessiz sahte başarı yok)', async () => {
    const wrap = mountEsik();
    sb.auth.signInWithOAuth.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    await doOAuth('google');
    expect(document.getElementById('auth-error').textContent.length).toBeGreaterThan(0);
    wrap.remove();
  });
});

/* ═══ NATIVE OAUTH — özel şema kapısı (Capacitor) ═══ */

/* Kabuğu native'e çevirir, verilen plugin'leri asar; geri alma işini döndürür. */
function mountNative(plugins = {}) {
  const prev = window.Capacitor;
  window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios', Plugins: plugins };
  return () => { window.Capacitor = prev; };
}

describe('doOAuth() — native kabuk dalı', () => {
  it('özel şemayı dönüş adresi yapar, yönlendirmeyi devralır ve sayfayı sistem tarayıcısında açar', async () => {
    const wrap = mountEsik();
    const Browser = { open: vi.fn().mockResolvedValue(undefined) };
    const restore = mountNative({ Browser });
    sb.auth.signInWithOAuth.mockClear();
    sb.auth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: 'https://saglayici.example/authorize?x=1' }, error: null,
    });

    await doOAuth('apple');

    const arg = sb.auth.signInWithOAuth.mock.calls[0][0];
    expect(arg.provider).toBe('apple');
    expect(arg.options.redirectTo).toBe(NATIVE_OAUTH_REDIRECT);
    expect(arg.options.skipBrowserRedirect).toBe(true);
    expect(Browser.open).toHaveBeenCalledWith({ url: 'https://saglayici.example/authorize?x=1' });

    restore(); wrap.remove();
  });

  it('Supabase hata dönerse tarayıcı hiç açılmaz', async () => {
    const wrap = mountEsik();
    const Browser = { open: vi.fn() };
    const restore = mountNative({ Browser });
    sb.auth.signInWithOAuth.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });

    await doOAuth('google');

    expect(Browser.open).not.toHaveBeenCalled();
    expect(document.getElementById('auth-error').textContent.length).toBeGreaterThan(0);
    restore(); wrap.remove();
  });
});

describe('authHandleOAuthUrl(url) — dönüşü oturuma çevirir', () => {
  beforeEach(() => {
    sb.auth.exchangeCodeForSession.mockClear();
    sb.auth.setSession.mockClear();
    sb.auth.getUser.mockClear();
  });

  it('PKCE kodunu takas eder', async () => {
    const wrap = mountEsik();
    await authHandleOAuthUrl('com.emretransformation.wanderer://auth-callback?code=ABC123');
    expect(sb.auth.exchangeCodeForSession).toHaveBeenCalledWith('ABC123');
    wrap.remove();
  });

  it('örtük akışın hash token\'larını oturuma yazar', async () => {
    const wrap = mountEsik();
    await authHandleOAuthUrl('com.emretransformation.wanderer://auth-callback#access_token=AT&refresh_token=RT');
    expect(sb.auth.setSession).toHaveBeenCalledWith({ access_token: 'AT', refresh_token: 'RT' });
    wrap.remove();
  });

  it('aynı adres iki kez düşerse kodu bir kez takas eder (kod tek kullanımlıktır)', async () => {
    const wrap = mountEsik();
    const url = 'com.emretransformation.wanderer://auth-callback?code=TEKSEFER';
    await authHandleOAuthUrl(url);
    await authHandleOAuthUrl(url);
    expect(sb.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
    wrap.remove();
  });

  it('bize ait olmayan deep-link\'e dokunmaz', async () => {
    const wrap = mountEsik();
    const out = await authHandleOAuthUrl('com.emretransformation.wanderer://paylasim/kart-42');
    expect(out).toBe(false);
    expect(sb.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(sb.auth.setSession).not.toHaveBeenCalled();
    wrap.remove();
  });

  it('sağlayıcı hata döndürürse takas denenmez, hata eşikte görünür', async () => {
    const wrap = mountEsik();
    await authHandleOAuthUrl('com.emretransformation.wanderer://auth-callback?error=access_denied&error_description=iptal');
    expect(sb.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(document.getElementById('auth-error').textContent.length).toBeGreaterThan(0);
    wrap.remove();
  });

  it('takastan sonra kullanıcı alınamazsa içeri almaz — eşikte tutar', async () => {
    const wrap = mountEsik();
    sb.auth.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const out = await authHandleOAuthUrl('com.emretransformation.wanderer://auth-callback?code=KULLANICISIZ');
    expect(out).toBe(false);
    expect(document.getElementById('auth-error').textContent.length).toBeGreaterThan(0);
    wrap.remove();
  });

  it('boş/bozuk adreste sessizce düşer', async () => {
    expect(await authHandleOAuthUrl('')).toBe(false);
    expect(await authHandleOAuthUrl(null)).toBe(false);
    expect(await authHandleOAuthUrl('düz metin')).toBe(false);
  });
});

describe('authNativeDeepLinkInit()', () => {
  it('web kabuğunda dinleyici kurmaz', () => {
    const App = { addListener: vi.fn() };
    window.Capacitor = { isNativePlatform: () => false, Plugins: { App } };
    authNativeDeepLinkInit();
    expect(App.addListener).not.toHaveBeenCalled();
    window.Capacitor = { isNativePlatform: () => false };
  });

  it('native kabukta appUrlOpen olayını dinler ve açılış adresini de sorar', () => {
    const App = {
      addListener: vi.fn(),
      getLaunchUrl: vi.fn().mockResolvedValue({ url: null }),
    };
    const restore = mountNative({ App });
    authNativeDeepLinkInit();
    expect(App.addListener).toHaveBeenCalledTimes(1);
    expect(App.addListener.mock.calls[0][0]).toBe('appUrlOpen');
    expect(App.getLaunchUrl).toHaveBeenCalled();
    restore();
  });
});

describe('Doğum yılı üst sınırı', () => {
  it('tanışma paneli açılınca içinde bulunulan yıla ayarlanır (HTML\'de sabit kalmaz)', () => {
    // Sabit yazılırsa yılbaşında sessizce bayatlar: o yıl doğanlar reddedilir.
    const wrap = mountEsik();
    _showTanisma({ id: 'u1', email: 'e@x.com', user_metadata: {} });
    expect(document.getElementById('auth-age-input').max).toBe(String(new Date().getFullYear()));
    wrap.remove();
  });
});


// _needsAgeGate/authSubmitBirthYear/authAgeCancel bu fazda SİLİNDİ —
// yerlerine _tanismaGerekli/authTanismaGonder/authTanismaIptal geçti
// (tests/03-auth-tanisma.test.js). "Doğum yılı üst sınırı" testi hâlâ
// geçerli: #auth-age-input id'si tanışma panelinde AYNEN korunuyor.
