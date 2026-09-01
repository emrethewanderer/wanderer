/**
 * Açılış Tek Dalga — "Ana ekran bir kez kurulur" (10y · 2026-08-19)
 *
 * Emre'nin ekran kaydı açılışın DÖRT dalgada kurulduğunu gösterdi:
 * boş → yerleşik i18n başlatıcıları → selam+model → kişisel şerit. Belirleyici
 * ipucu davranışın KOŞULLU olmasıydı — kapat-aç'ta yok, reload'da var. Sebebi
 * `_splashPlan`'ın kat 0'ı (aynı sessionStorage → perde YOK): perdeli katlarda
 * `llmSyncHome`'un `splashUp` guard'ı ara çizimleri örtüyordu. Perde bir çözüm
 * değil örtüydü.
 *
 * Bu dosya boot senaryosunu TAZE bir modül instance'ıyla kurar (bayraklar
 * modül düzeyinde yaşadığı için 10y'nin ana test dosyasına eklenemez: orada
 * ilk `llmHomeCascade` çağrısı açılışı çoktan tüketmiş olur).
 */
import { describe, it, expect, vi } from 'vitest';

const { switchViewHooks, switchView } = vi.hoisted(() => {
  const _before = [], _after = [];
  return {
    switchViewHooks: {
      before(fn) { _before.push(fn); },
      after(fn) { _after.push(fn); },
    },
    switchView: vi.fn(),
  };
});
vi.mock('../js/parts/03-auth-shell.js', () => ({ switchView, switchViewHooks }));
vi.mock('../js/parts/10w-w2-odak-modelleri.js', () => ({
  fmGreetingText: vi.fn((name) => `Merhaba, ${name}`),
  fmInputPlaceholder: vi.fn(() => "Wanderer'a yaz…"),
  fmStarters: vi.fn(() => ['Yerleşik 1', 'Yerleşik 2']),
  fmGetActive: vi.fn(() => ({ name: 'Öz', tagline: 'kısa tanım' })),
}));
vi.mock('../js/parts/02d-esik-ekrani.js', () => ({ esikShow: vi.fn() }));

// jsdom matchMedia'yı desteklemez — AnimUtils.prefersReducedMotion() boot'ta okunur.
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));

function domKur() {
  document.body.innerHTML = `
    <div id="app-screen">
      <div id="auth-screen" style="display:none;"></div>
      <div id="flip-fab"></div>
      <div class="view active" id="chat-view"><div id="messages-area"></div></div>
      <div class="view" id="bugun-view"></div>
      <div id="llm-greeting"></div>
      <div id="llm-greeting-sub"></div>
      <input id="chat-input" />
      <div id="llm-starters" data-kb="1"></div>
      <div id="llm-continue"></div>
      <div id="breath-pill"></div>
      <button id="send-btn"></button>
    </div>`;
}

/* `.casc` sınıfının KAÇ KEZ eklendiğini sayar. _wsCascade remove→reflow→add
   ile animasyonu baştan oynatır; her ekleme bir "ekran yeniden süzüldü"
   olayıdır — kullanıcının "tekrar başlıyor" dediği şey tam olarak budur. */
function cascSayaci(el) {
  const durum = { n: 0 };
  const var_ = (str) => (str || '').split(/\s+/).includes('casc');
  const gozcu = new MutationObserver((kayitlar) => {
    // Kaydın YENİ değeri bir sonraki kaydın oldValue'sudur; son kayıtta anlık
    // className. `el.classList` doğrudan okunamaz — callback mikrotaskta koşar,
    // remove→add çiftinin İKİSİ de "şu an casc var" görüp iki kez sayılırdı.
    for (let i = 0; i < kayitlar.length; i++) {
      const eski = var_(kayitlar[i].oldValue);
      const yeni = var_(i + 1 < kayitlar.length ? kayitlar[i + 1].oldValue : el.className);
      if (!eski && yeni) durum.n++;
    }
  });
  gozcu.observe(el, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  durum.dur = () => gozcu.disconnect();
  return durum;
}
const bekle = () => new Promise(r => setTimeout(r, 0));

/** Taze modül + temiz DOM: her senaryo kendi boot'unu yaşar.
    `state.js` de resetModules'tan SONRA import edilir — yoksa modülün gördüğü
    `S` ile testin tuttuğu `S` iki ayrı nesne olur ve kapı hiç açılmaz. */
async function tazeBoot() {
  domKur();
  delete window.bslOku;
  vi.resetModules();
  const { S } = await import('../js/state.js');
  S.chatHistory = [];
  S._fmYuklendi = false;
  S.currentUser = { id: 'u1', user_metadata: { name: 'Emre' } };
  const mod = await import('../js/parts/10y-w2-llm-shell.js');
  return { ...mod, S };
}

describe('Perdesiz kat (reload) — kademelenme içeriği bekler', () => {
  it('kapı kapalıyken perde tetiği ekranı SÜZMEZ', async () => {
    const { llmHomeCascade, llmSyncHome } = await tazeBoot();
    const view = document.getElementById('chat-view');
    llmSyncHome();                       // initApp: llm-home sınıfı buradan gelir
    expect(view.classList.contains('llm-home')).toBe(true);
    const sayac = cascSayaci(view);

    llmHomeCascade(0.04);                // 03 kat 0: "perde tarafı hazır"
    llmSyncHome();                       // initApp:1063
    llmSyncHome(0.04);                   // switchView('chat') after-hook
    await bekle();

    expect(sayac.n).toBe(0);
    expect(view.classList.contains('casc')).toBe(false);
    sayac.dur();
  });

  it('kaynaklar konuşunca kademelenme TEK kez oynar', async () => {
    const { llmHomeCascade, llmSyncHome, llmRenderHome, S } = await tazeBoot();
    const view = document.getElementById('chat-view');
    llmSyncHome();
    llmHomeCascade(0.04);
    const sayac = cascSayaci(view);

    // Kaynaklar konuştu: 10w'nin ağ turu bitti, 10y2 modülü yüklendi.
    S._fmYuklendi = true;
    window.bslOku = () => [];
    llmRenderHome();
    await bekle();
    expect(sayac.n).toBe(1);

    // Zincirin geri kalanı ekranı bir daha süzmez (geçmiş hidrasyonu,
    // bslDokuMaybe, i18n olayları hep llmRenderHome/llmSyncHome çağırır).
    llmRenderHome();
    llmSyncHome();
    llmRenderHome();
    await bekle();
    expect(sayac.n).toBe(1);
    sayac.dur();
  });

  it('şerit kapı açılana dek yerleşik başlatıcılarla DOLMAZ', async () => {
    const { llmSyncHome, llmRenderHome, S } = await tazeBoot();
    const host = document.getElementById('llm-starters');
    llmSyncHome();
    llmRenderHome();
    expect(host.querySelectorAll('.llm-starter').length).toBe(0);

    S._fmYuklendi = true;
    window.bslOku = () => [];
    llmRenderHome();
    expect(host.querySelectorAll('.llm-starter').length).toBe(2);
  });
});

describe('Perdeli kat — tetik perdenin kapanışından gelir', () => {
  it('içerik erken hazırsa bile perde inmeden süzülmez', async () => {
    const { llmSyncHome, llmRenderHome, llmHomeCascade, S } = await tazeBoot();
    const view = document.getElementById('chat-view');
    llmSyncHome();
    const sayac = cascSayaci(view);

    S._fmYuklendi = true;                // içerik perdenin ARKASINDA hazırlandı
    window.bslOku = () => [];
    llmRenderHome();
    await bekle();
    expect(sayac.n).toBe(0);

    llmHomeCascade();                    // _closeSplash → perde indi
    await bekle();
    expect(sayac.n).toBe(1);
    sayac.dur();
  });
});

describe('Kilit sigortası — açılış tüketilmeden gezinme donmaz', () => {
  it('ana ekrana hiç uğranmasa da açılış tamamlanmış sayılır', async () => {
    const { llmHomeCascade, llmRenderHome, llmSyncHome, S } = await tazeBoot();
    const view = document.getElementById('chat-view');
    view.classList.remove('llm-home');   // ?view=bugun ile açılış
    S._fmYuklendi = true;
    window.bslOku = () => [];
    llmHomeCascade(0.04);
    llmRenderHome();
    await bekle();

    // Şimdi ana ekrana dönülüyor: cascade artık normal yoldan oynamalı.
    const sayac = cascSayaci(view);
    S.chatHistory = [];
    llmSyncHome(0.04);
    await bekle();
    expect(sayac.n).toBe(1);
    sayac.dur();
  });
});
