/**
 * Tests for js/parts/10y-w2-llm-shell.js — Dil Modeli Kabuğu (ana kart flip + ana ekran).
 *
 * Kapsam: _wsCascade tetikleyicileri (wsCascadeBugun/llmHomeCascade guard'ları),
 * llmRenderHome DOM render, llmSyncHome/llmContinueToday ana-ekran durum makinesi,
 * llmStarterSend/llmSendStarter composer enjeksiyonu, flip durum makinesi
 * (aynı-yüz no-op, çapraz-yüz iptal+flip, meşgulken yeni flip engellenir).
 *
 * 03-auth-shell.js TAM mock'lanır: switchViewHooks gerçek createHookRegistry
 * ile kurulur (modülün _installHooks'u gerçek before/after kaydeder), switchView
 * sahte bir "gerçek switchView" simülasyonu yapar (before→cancel kontrolü→view
 * swap→after) — flip zincirini deterministik test edebilmek için.
 *
 * Modül kendi kendine boot eden bir IIFE içerdiğinden (document.readyState
 * kontrolü + #app-screen arayan setTimeout-retry), DOM iskeleti dinamik
 * import'tan ÖNCE kurulur ki ilk deneme senkron başarısın — asılı retry
 * zamanlayıcısı kalmasın. Flip testlerinde sahte zamanlayıcı kullanılır ki
 * _flip'in gerçek setTimeout'ları sonraki testlere sızmasın.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { S } from '../js/state.js';

// vi.mock hoisted olduğundan referans verilen değerler vi.hoisted() içinde kurulur
// (basit before/after dizileriyle kendi createHookRegistry benzeri sahte kayıt).
const { switchViewHooks, switchView } = vi.hoisted(() => {
  const _before = [];
  const _after = [];
  const switchViewHooks = {
    before(fn) { _before.push(fn); },
    after(fn) { _after.push(fn); },
    runBefore(...args) { for (const f of _before) { try { f(...args); } catch (_) {} } },
    runAfter(...args) { for (const f of _after) { try { f(...args); } catch (_) {} } },
  };
  const switchView = vi.fn((v) => {
    const ctx = { cancelled: false };
    switchViewHooks.runBefore(v, ctx);
    if (ctx.cancelled) return;
    document.querySelectorAll('.view.active').forEach(el => el.classList.remove('active'));
    document.getElementById(v + '-view')?.classList.add('active');
    switchViewHooks.runAfter(v);
  });
  return { switchViewHooks, switchView };
});

vi.mock('../js/parts/03-auth-shell.js', () => ({ switchView, switchViewHooks }));

vi.mock('../js/parts/10w-w2-odak-modelleri.js', () => ({
  fmGreetingText: vi.fn((name) => `Merhaba, ${name}`),
  fmInputPlaceholder: vi.fn(() => "Wanderer'a yaz…"),
  fmStarters: vi.fn(() => ['Başlatıcı 1', 'Başlatıcı 2']),
  fmGetActive: vi.fn(() => ({ name: 'Öz', tagline: 'kısa tanım' })),
}));

// Eşik Ekranı (02d) dinamik import ile çağrılır (_maybeEsik) — gerçek 12b/12c
// deste bağımlılıklarını sürüklemesin diye mock'lanır; tetiklendiğini/
// tetiklenmediğini doğrulamak için bu referans kullanılır.
vi.mock('../js/parts/02d-esik-ekrani.js', () => ({ esikShow: vi.fn() }));

// jsdom matchMedia'yı desteklemez — AnimUtils.prefersReducedMotion() boot sırasında
// çağrılır, import'tan önce stub'lanmalı (bkz. tests/12c-holo.test.js emsali).
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

// Modül boot IIFE'si #app-screen'i senkron bulsun diye DOM İMPORT'TAN ÖNCE kurulur.
document.body.innerHTML = `
  <div id="app-screen">
    <div id="auth-screen" style="display:none;"></div>
    <div id="flip-fab"></div>
    <div id="ws-flip-title"><span class="wft-word"></span><span class="wft-sub"></span></div>
    <div class="view" id="chat-view"><div id="messages-area"></div></div>
    <div class="view" id="bugun-view"></div>
    <div class="view" id="settings-view"></div>
    <div class="view" id="library-view"></div>
    <div id="llm-greeting"></div>
    <div id="llm-greeting-sub"></div>
    <input id="chat-input" />
    <div id="llm-starters"></div>
    <div id="llm-continue"></div>
    <div id="breath-pill"></div>
    <button id="send-btn"></button>
  </div>`;

const mod = await import('../js/parts/10y-w2-llm-shell.js');
const { wsCascadeBugun, llmHomeCascade, llmRenderHome, llmHomeAc, llmSyncHome, llmContinueToday,
        llmStarterSend, llmSendStarter, wsFlipTo, llmFocusComposer } = mod;
const { esikShow } = await import('../js/parts/02d-esik-ekrani.js');

function setActiveView(id) {
  document.querySelectorAll('.view.active').forEach(el => el.classList.remove('active'));
  document.getElementById(id)?.classList.add('active');
}
function setChatHistory(arr) { S.chatHistory = arr; }

beforeEach(() => {
  switchView.mockClear();
  document.getElementById('chat-view').classList.remove('llm-home', 'casc');
  document.getElementById('bugun-view').classList.remove('active', 'casc');
  document.getElementById('chat-view').classList.add('active');
  document.getElementById('llm-continue').classList.remove('show');
  document.getElementById('chat-input').value = '';
  window.autoResize = vi.fn();
  window.sendMessage = vi.fn();
  document.getElementById('messages-area').scrollTo = vi.fn(); // jsdom'da yok
  // Ana ekranın kanıt kapısı (2026-08-19): şerit/model satırı/placeholder
  // kaynaklar konuşmadan çizilmez. Render testlerinin varsayılanı AÇIK kapıdır;
  // kapalı hâli kendi describe'ında sınanır.
  S._fmYuklendi = true;
  window.bslOku = () => [];
  const _host = document.getElementById('llm-starters');
  delete _host.dataset.llmImza;   // imza DOM'da yaşar — testler arası sızmasın
  _host.innerHTML = '';
});

describe('wsCascadeBugun — guard + cascade', () => {
  it('bugun-view aktif değilse no-op (casc eklenmez)', () => {
    document.getElementById('bugun-view').classList.remove('active');
    wsCascadeBugun();
    expect(document.getElementById('bugun-view').classList.contains('casc')).toBe(false);
  });

  it('bugun-view aktifse casc sınıfı eklenir', () => {
    setActiveView('bugun-view');
    wsCascadeBugun();
    expect(document.getElementById('bugun-view').classList.contains('casc')).toBe(true);
  });
});

describe('llmHomeCascade — guard', () => {
  it('chat-view llm-home değilse no-op', () => {
    document.getElementById('chat-view').classList.remove('llm-home');
    expect(() => llmHomeCascade()).not.toThrow();
    expect(document.getElementById('chat-view').classList.contains('casc')).toBe(false);
  });

  it('tam-ekran ritüel perdesi (.sc-onb açık) varsa ertelenir', () => {
    document.getElementById('chat-view').classList.add('llm-home');
    const perde = document.createElement('div');
    perde.className = 'sc-onb';
    document.body.appendChild(perde);
    llmHomeCascade();
    expect(document.getElementById('chat-view').classList.contains('casc')).toBe(false);
    perde.remove();
  });

  it('perde yoksa ve llm-home ise cascade oynar', () => {
    document.getElementById('chat-view').classList.add('llm-home');
    llmHomeCascade();
    expect(document.getElementById('chat-view').classList.contains('casc')).toBe(true);
  });
});

describe('llmRenderHome — DOM render (mock 10w\'den)', () => {
  it('selam ve alt satırı mock modelden doldurur', () => {
    // 2026-08-19: selam artık ad KANITINA bağlı (00i · kanıt bekleyen alanlar).
    // 'Gezgin' fallback'i kanıt sayılmadığı için kanıt burada kurulur.
    document.body.insertAdjacentHTML('beforeend', '<span id="ob-name">Emre</span>');
    llmRenderHome();
    expect(document.getElementById('llm-greeting').textContent).toContain('Merhaba');
    expect(document.getElementById('llm-greeting-sub').textContent).toBe('Öz · kısa tanım');
    document.getElementById('ob-name').remove();
  });

  it('ad kanıtı yokken selama DOKUNMAZ — sessizlik sıçramadan dürüsttür', () => {
    // llmRenderHome hidrasyondan ÖNCE de çağrılıyor (03 llmHomeCascade).
    // Eskiden orada "Merhaba, Gezgin." yazılır, sonra gerçek ada sıçrardı.
    document.getElementById('ob-name')?.remove();
    const onceki = S.currentUser;
    S.currentUser = null;
    const el = document.getElementById('llm-greeting');
    el.textContent = '—';
    llmRenderHome();
    expect(el.textContent).toBe('—');
    S.currentUser = onceki;
  });

  it('başlatıcı çipleri render eder', () => {
    llmRenderHome();
    const btns = document.querySelectorAll('#llm-starters .llm-starter');
    expect(btns.length).toBe(2);
  });

  it('gün boşsa devam satırı (llm-continue) gösterilmez', () => {
    setChatHistory([]);
    llmRenderHome();
    expect(document.getElementById('llm-continue').classList.contains('show')).toBe(false);
  });

  it('gün doluysa devam satırı gösterilir', () => {
    setChatHistory([{ role: 'user', content: 'merhaba' }]);
    llmRenderHome();
    expect(document.getElementById('llm-continue').classList.contains('show')).toBe(true);
    setChatHistory([]);
  });
});

/* 2026-08-19 — Emre'nin ekran kaydı açılışın DÖRT dalgada kurulduğunu gösterdi:
   boş → yerleşik i18n başlatıcıları → selam+model → kişisel şerit. Kökü iki
   kırıktı: (1) şerit kaynaklar konuşmadan yerleşik fallback'le çiziliyordu
   (§6.10), (2) her çağrıda innerHTML yeniden yazıldığı için `.casc` altındaki
   çipler giriş animasyonunu baştan oynuyordu. Bu blok ikisini de mühürler. */
describe('llmRenderHome — kanıt kapısı + idempotentlik', () => {
  it('kapı kapalıyken şeride DOKUNMAZ (yerleşik başlatıcı yazılmaz)', () => {
    S._fmYuklendi = false;
    const host = document.getElementById('llm-starters');
    host.innerHTML = '';
    delete host.dataset.llmImza;
    llmRenderHome();
    expect(host.querySelectorAll('.llm-starter').length).toBe(0);
    expect(host.dataset.llmImza).toBeUndefined();
  });

  it('kapı kapalıyken placeholder ve model satırı da bekler', () => {
    S._fmYuklendi = false;
    const sub = document.getElementById('llm-greeting-sub');
    sub.textContent = '—';
    const inp = document.getElementById('chat-input');
    inp.placeholder = 'ilk';
    llmRenderHome();
    expect(sub.textContent).toBe('—');
    expect(inp.placeholder).toBe('ilk');
  });

  it('llmHomeAc kapıyı ZORLAR — kaynaklar hiç konuşmasa da şerit belirir', () => {
    S._fmYuklendi = false;
    const host = document.getElementById('llm-starters');
    host.innerHTML = '';
    delete host.dataset.llmImza;
    llmHomeAc();
    expect(host.querySelectorAll('.llm-starter').length).toBe(2);
  });

  it('aynı içerikte DOM yeniden DOĞMAZ — çipler animasyonu baştan oynamaz', () => {
    llmRenderHome();
    const host = document.getElementById('llm-starters');
    const ilk = host.querySelector('.llm-starter');
    expect(ilk).toBeTruthy();
    llmRenderHome();
    llmRenderHome();
    // Aynı nesne: innerHTML'e dokunulsaydı düğüm yeniden yaratılmış olurdu.
    expect(host.querySelector('.llm-starter')).toBe(ilk);
  });

  it('içerik değişince şerit yenilenir (kanıt geldi → belirdi)', () => {
    llmRenderHome();
    const host = document.getElementById('llm-starters');
    const ilk = host.querySelector('.llm-starter');
    window.bslOku = () => [{ id: 'k1', metin: 'Kişisel soru' }];
    llmRenderHome();
    expect(host.querySelector('.llm-starter')).not.toBe(ilk);
    expect(host.querySelector('.llm-starter-text').textContent).toBe('Kişisel soru');
    window.bslOku = () => [];
  });

  it('selam aynı metinde yeniden yazılmaz', () => {
    document.body.insertAdjacentHTML('beforeend', '<span id="ob-name">Emre</span>');
    llmRenderHome();
    const el = document.getElementById('llm-greeting');
    const dugum = el.firstChild;
    llmRenderHome();
    expect(el.firstChild).toBe(dugum);
    document.getElementById('ob-name').remove();
  });
});

describe('llmSyncHome / llmContinueToday — ana ekran durum makinesi', () => {
  it('bugün boşsa (chatHistory boş) chat-view llm-home sınıfı alır', () => {
    setChatHistory([]);
    llmSyncHome();
    expect(document.getElementById('chat-view').classList.contains('llm-home')).toBe(true);
  });

  it('llmContinueToday çağrılınca ve gün doluyken tekrar sync edilince home kapanır', () => {
    setChatHistory([{ role: 'user', content: 'merhaba' }]);
    llmSyncHome(); // gün dolu ama _homeDismissed henüz false → hâlâ home (ilk-giriş davranışı)
    llmContinueToday(); // _homeDismissed = true
    llmSyncHome();
    expect(document.getElementById('chat-view').classList.contains('llm-home')).toBe(false);
    setChatHistory([]);
  });
});

describe('llmStarterSend / llmSendStarter — composer enjeksiyonu', () => {
  it('llmSendStarter composer\'a yazar ve sendMessage\'ı tetikler', () => {
    llmSendStarter('merhaba dünya');
    expect(document.getElementById('chat-input').value).toBe('merhaba dünya');
    expect(window.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('llmSendStarter boş metinde no-op', () => {
    llmSendStarter('');
    expect(window.sendMessage).not.toHaveBeenCalled();
  });

  it('llmStarterSend indeksten metni bulup gönderir', () => {
    llmStarterSend(0);
    expect(document.getElementById('chat-input').value).toBe('Başlatıcı 1');
  });

  it('llmStarterSend geçersiz indekste no-op', () => {
    llmStarterSend(99);
    expect(window.sendMessage).not.toHaveBeenCalled();
  });
});

describe('wsFlipTo / flip durum makinesi', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.runOnlyPendingTimers(); // _flip'in bekleyen setTimeout zincirini bitir — sonraki teste sızmasın
    vi.useRealTimers();
  });

  it('aynı yüz içinde geçiş: before-hook iptal ETMEZ, switchView normal çalışır', () => {
    setActiveView('chat-view'); // ön yüz
    wsFlipTo('settings'); // settings de ön-yüz ailesinde (FRONT_VIEWS)
    expect(switchView).toHaveBeenCalledWith('settings');
    expect(document.getElementById('settings-view').classList.contains('active')).toBe(true);
  });

  it('çapraz-yüz geçişte before-hook iptal eder ve DOM hemen değişmez (flip animasyonu sürer)', () => {
    setActiveView('chat-view'); // ön yüz
    wsFlipTo('bugun'); // arka yüz
    // _flip 340ms sonra gerçek switchView'i (_rawSwitch) tetikler — hemen değil.
    expect(document.getElementById('bugun-view').classList.contains('active')).toBe(false);
    vi.advanceTimersByTime(340);
    expect(document.getElementById('bugun-view').classList.contains('active')).toBe(true);
  });

  it('flip meşgulken (_flipBusy) yeni flip çağrısı engellenir', () => {
    setActiveView('chat-view');
    wsFlipTo('bugun'); // ilk flip başlar, _flipBusy=true, 340ms bekliyor
    switchView.mockClear();
    wsFlipTo('bugun'); // wsFlipTo kendi _flipBusy kontrolüyle no-op
    expect(switchView).not.toHaveBeenCalled();
  });

  it('flip animasyonu tamamlanınca (820ms) yeni flip tekrar mümkün olur', () => {
    setActiveView('chat-view');
    wsFlipTo('bugun');
    vi.advanceTimersByTime(340 + 480); // tam döngü biter, _flipBusy=false
    setActiveView('chat-view'); // simüle: kullanıcı geri döndü
    switchView.mockClear();
    wsFlipTo('bugun');
    expect(switchView).toHaveBeenCalled();
  });
});

/* Eşik Ekranı artık GİRİŞİN eşiği (02d esikShowOnce ← 03-auth-shell boot
   kuyruğu), Studio'nun değil — flip onu AÇMAZ. Kapı tersine çevrildi
   (Emre'nin kararı, 2026-08-26): tetik 10y'ye geri sızarsa, uygulamayı
   kapatmadan Studio'ya geçen kullanıcı Eşik'i ikinci kez görür — kararın
   tam olarak dışladığı davranış budur. */
describe('Eşik Ekranı — Studio flip\'i artık tetiklemez (tetik girişe taşındı)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    esikShow.mockClear();
  });
  afterEach(async () => {
    await vi.runOnlyPendingTimersAsync();
    vi.useRealTimers();
  });

  it('ön yüzden flip ile Bugün\'e girince Eşik AÇILMAZ', async () => {
    setActiveView('chat-view');
    wsFlipTo('bugun');
    await vi.advanceTimersByTimeAsync(340 + 480 + 400); // flip tam döngü + eski gecikme payı
    expect(esikShow).not.toHaveBeenCalled();
  });

  it('Sohbet ↔ Studio arasında gidip gelmek de açmaz — oturum içi gezinme', async () => {
    setActiveView('chat-view');
    wsFlipTo('bugun');
    await vi.advanceTimersByTimeAsync(340 + 480 + 400);
    setActiveView('chat-view');   // ön yüze dönüş
    wsFlipTo('bugun');            // ikinci giriş
    await vi.advanceTimersByTimeAsync(340 + 480 + 400);
    expect(esikShow).not.toHaveBeenCalled();
  });
});

/* Kısayollar (⌘K · ⌘/) post-auth reflekstir: giriş ekranı üstteyken ⌘K
   newSession'ı çağırırsa onboarding ritüeli (.sc-onb) auth perdesinin ARKASINA
   sızar — kullanıcı göremez, kapatamaz; içeri girdiğinde 10s/10t/13h/10g o
   sınıfı görüp günlük ritüelleri erteler. Üstelik preventDefault tarayıcının
   kendi ⌘K'sını da yutar: kullanıcı hiçbir şey almadan aramasını kaybeder. */
describe('Kısayol kapıları — ⌘K / ⌘/ yalnız post-auth', () => {
  const auth = () => document.getElementById('auth-screen');
  function bas(key) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, metaKey: true, bubbles: true, cancelable: true }));
  }
  // Kart bir kez kurulup modül-içi `_kbdOverlayEl`'de saklanır — DOM'dan
  // SİLMEYİZ (silersek modül silinmiş düğümü yeniden gösterir), yalnız
  // `.show` sınıfını düşürürüz.
  beforeEach(() => {
    window.newSession = vi.fn();
    document.getElementById('kbd-overlay')?.classList.remove('show');
    auth().style.display = 'none';
    S.currentUser = { id: 'uid-kisayol' };
  });
  afterEach(() => {
    document.getElementById('kbd-overlay')?.classList.remove('show');
    auth().style.display = 'none';
    S.currentUser = null;
  });

  it('giriş ekranı üstteyken ⌘K yeni oturum AÇMAZ', () => {
    auth().style.display = 'flex';
    bas('k');
    expect(window.newSession).not.toHaveBeenCalled();
  });

  it('post-auth\'ta ⌘K yeni oturum açar', () => {
    bas('k');
    expect(window.newSession).toHaveBeenCalledTimes(1);
  });

  it('oturum yokken (S.currentUser boş) ⌘K yeni oturum AÇMAZ', () => {
    S.currentUser = null;
    bas('k');
    expect(window.newSession).not.toHaveBeenCalled();
  });

  it('giriş ekranı üstteyken ⌘/ kısayol kartını AÇMAZ', () => {
    auth().style.display = 'flex';
    bas('/');
    expect(document.getElementById('kbd-overlay')?.classList.contains('show')).toBeFalsy();
  });

  it('post-auth\'ta ⌘/ kartı açar, Escape kapatır', () => {
    bas('/');
    expect(document.getElementById('kbd-overlay').classList.contains('show')).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.getElementById('kbd-overlay').classList.contains('show')).toBe(false);
  });

  it('açılış perdesi (wn-splash.show) inmeden ⌘K çalışmaz — boot ortasında oturum sıfırlanmasın', () => {
    const splash = document.createElement('div');
    splash.id = 'wn-splash';
    splash.className = 'show';
    document.body.appendChild(splash);
    bas('k');
    expect(window.newSession).not.toHaveBeenCalled();
    splash.remove();
  });
});

describe('llmFocusComposer — kapılar', () => {
  const ORIGINAL_MATCH_MEDIA = window.matchMedia;
  afterEach(() => { window.matchMedia = ORIGINAL_MATCH_MEDIA; });

  it('pointer:fine değilse (mobil) odaklanmaz', () => {
    window.matchMedia = () => ({ matches: false });
    document.getElementById('chat-input').blur();
    llmFocusComposer();
    expect(document.activeElement.id).not.toBe('chat-input');
  });

  it('masaüstünde ama açık overlay varken odaklanmaz', () => {
    window.matchMedia = () => ({ matches: true });
    setChatHistory([]); // _shouldHome() true olsun
    const ov = document.createElement('div');
    ov.className = 'overlay open';
    document.body.appendChild(ov);
    document.getElementById('chat-input').blur();
    llmFocusComposer();
    expect(document.activeElement.id).not.toBe('chat-input');
    ov.remove();
    setChatHistory([]);
  });

  it('masaüstü + temiz ana ekran + overlay yokken composer\'a odaklanır', () => {
    window.matchMedia = () => ({ matches: true });
    setChatHistory([]);
    document.getElementById('chat-input').blur();
    llmFocusComposer();
    expect(document.activeElement.id).toBe('chat-input');
    setChatHistory([]);
  });
});
