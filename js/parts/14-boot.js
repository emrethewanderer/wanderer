import { S } from '../state.js';
import { sb, IS_ADMIN_PAGE } from '../config.js';
import { STORAGE_KEYS, SafeStorage, EventBus, ErrorBoundary, installGlobalErrorHandlers, debounce, showToast } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { initApp, authNativeDeepLinkInit } from './03-auth-shell.js';
import { registerModeBadgeHooks, registerChatHooks } from './13-extras.js';
import { scheduleAutoSummary } from './06-summary-chat.js';
import { registerAracHooks } from './13a-arac-motoru.js';
import { registerSesHooks } from './10z-w2-ses.js';
import { registerGorselHooks } from './13c-gorsel-ekleme.js';
/* Tören Kuyruğu (13B): auth gerektirmez, state tutmaz — window.trn* yüzeyi
   perde inerken de sorulabilsin diye post-auth'ta değil burada yüklenir. */
import './13B-toren-kuyrugu.js';

/* ═══ BOOT ═══ */

// Yönetim sayfası (admin.html): app kabuğu chrome'u (flip FAB, elmas barı,
// sinematik giriş…) CSS ile kapansın diye bayrak sınıfı en başta takılır —
// auth öncesi login ekranı da bu sade modda görünür.
// DİKKAT: bundle <head> içinde senkron çalışır — document.body henüz YOK;
// sınıf <html>'e (documentElement) takılır.
if (IS_ADMIN_PAGE) document.documentElement.classList.add('admin-standalone');

// NOT: wgInit (Wanderer/Ayna) ve haInit (Hayal Alemi) artık burada DEĞİL.
// SafeStorage cache'i auth sonrası (storageInit) hydrate olduğundan, bu iki
// modül 03-auth-shell içinde post-auth yüklenir; aksi halde state default'a
// düşüp buluttaki Elmas/sahne verisini ezerdi.
try { scheduleAutoSummary(); } catch (e) { console.warn('scheduleAutoSummary:', e?.message); }

// EventBus navigate listener — modüller switchView'ı doğrudan import etmek yerine
// EventBus.emit('navigate', { view }) kullanır; window.switchView zinciri (13-extras) korunur.
EventBus.on('navigate', ({ view }) => {
  if (typeof window.switchView === 'function') window.switchView(view);
});

// Cross-module hook'lar — modül load time TDZ riskini önlemek için boot'ta register edilir.
registerModeBadgeHooks();
registerChatHooks();
registerAracHooks();
registerSesHooks();
registerGorselHooks();

// Telemetri & global error handler'lar
installGlobalErrorHandlers();
ErrorBoundary.setToastFn(showToast);

// ── Telemetry: Sentry (varsa) + Supabase error_logs fallback ──
// VITE_SENTRY_DSN env var'ı set edilirse Sentry init edilir; yoksa Supabase'e log.
const _SENTRY_DSN = (typeof import.meta !== 'undefined') && import.meta.env?.VITE_SENTRY_DSN;
// Telemetry: VITE_SENTRY_DSN tanımlıysa Sentry'i CDN'den lazy-load et.
// Bundle bloat olmaması için statik import yapmıyoruz; npm paketi yerine CDN script.
// DSN yoksa sadece Supabase error_logs'a yazılır.
if (_SENTRY_DSN) {
  const _sentryScript = document.createElement('script');
  _sentryScript.src = 'https://browser.sentry-cdn.com/8.45.0/bundle.tracing.min.js';
  _sentryScript.crossOrigin = 'anonymous';
  _sentryScript.onload = () => {
    const Sentry = /** @type {any} */ (window).Sentry;
    if (!Sentry) { _bindSupabaseErrorLogger(); return; }
    Sentry.init({
      dsn: _SENTRY_DSN,
      environment: import.meta.env.MODE || 'production',
      tracesSampleRate: 0.1,
      ignoreErrors: [/ResizeObserver loop limit exceeded/, /Non-Error promise rejection/],
    });
    ErrorBoundary.setTelemetryHook((err, ctx) => {
      Sentry.captureException(err, { tags: ctx });
    });
    console.info('[Wanderer] Sentry telemetry active (CDN)');
  };
  _sentryScript.onerror = () => {
    console.warn('[Wanderer] Sentry CDN yüklenemedi, Supabase fallback aktif');
    _bindSupabaseErrorLogger();
  };
  document.head.appendChild(_sentryScript);
} else {
  _bindSupabaseErrorLogger();
}

function _bindSupabaseErrorLogger() {
  ErrorBoundary.setTelemetryHook(async (err, ctx) => {
    if (!S.currentUser?.id) return; // auth olmadan skip
    try {
      await sb.from('error_logs').insert([{
        user_id: S.currentUser.id,
        label: ctx?.label || 'unknown',
        error_message: err?.message?.slice(0, 1000) || String(err).slice(0, 1000),
        error_stack: err?.stack?.slice(0, 4000) || null,
        context: ctx || null,
        user_agent: navigator.userAgent?.slice(0, 500),
        app_version: '2.0.0',
        session_id: S.currentSessId || null,
      }]);
    } catch (_) { /* sessiz: telemetri kendi hatasıyla loop yapmasın */ }
  });
}

(async () => {
  // Service Worker kaydı — PROD ve native kabukta AÇIK, yerel geliştirmede KAPALI.
  //
  // Gerekçe: SW stale-while-revalidate ile eski bundle'ı servis eder. Localhost'ta
  // bunun bedeli, diske doğru yazılmış bir değişikliğin tarayıcıda HİÇ görünmemesi
  // ve "preview'da canlı doğrulama" kapısının sessizce sahte-yeşile dönmesidir —
  // hata türlerinin en tehlikelisi, çünkü yeşil görünür. Bir kez bir saat, bir kez
  // bütün bir turu yedi.
  //
  // Capacitor da içeriği localhost'tan servis eder; native ISTISNADIR — push
  // (10x, navigator.serviceWorker.ready) SW'nin varlığına bağlıdır ve onu
  // kapatmak bildirimleri sessizce öldürürdü.
  const yerelGelistirme = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  let nativeKabuk = false;
  try { nativeKabuk = !!window.Capacitor?.isNativePlatform?.(); } catch (_) {}

  if ('serviceWorker' in navigator) {
    if (yerelGelistirme && !nativeKabuk) {
      // Kayıt AÇMAMAK yetmez: önceki oturumlardan kalan SW bu kökte hâlâ
      // kayıtlıdır ve servise devam eder. Kaydı da cache'i de düşürmek şart.
      try {
        const kontrolluydu = !!navigator.serviceWorker.controller;
        const sokum = navigator.serviceWorker.getRegistrations()
          .then(rs => Promise.all(rs.map(r => r.unregister()))).catch(() => {});
        const cacheler = window.caches
          ? caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))).catch(() => {})
          : Promise.resolve();
        Promise.all([sokum, cacheler]).then(() => {
          // Bu sayfa ZATEN eski SW'den servis edildiyse temizlik tek başına
          // yetmez — çalışan bundle hâlâ bayattır, bir kez tazelenmeli.
          // Bayrak sonsuz döngüyü keser: temizlikten sonra controller kalmaz,
          // ama private mode'da sessionStorage patlarsa da döngü açılmasın.
          if (!kontrolluydu) return;
          try {
            if (sessionStorage.getItem('sw_temizlendi')) return;
            sessionStorage.setItem('sw_temizlendi', '1');
          } catch (_) { return; }
          location.reload();
        });
      } catch (_) {}
    } else {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  // iOS "Ana Ekrana Ekle" banner'ı
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true;
  const dismissed = SafeStorage.getRaw(STORAGE_KEYS.INSTALL_DISMISSED);
  if (isIOS && !isStandalone && !dismissed) {
    setTimeout(() => {
      const banner = document.getElementById('ios-install-banner');
      if (banner) banner.style.display = 'flex';
    }, 3000); // 3 saniye sonra göster
  }

  // iOS klavye açılınca scroll fix — visualViewport API ile daha güvenilir
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
    const inp = document.getElementById('chat-input');
    if (inp) {
      // visualViewport: klavye açılınca görünür alanı yeniden hesapla
      if (window.visualViewport) {
        const onVPResize = () => {
          const chatView = document.getElementById('chat-view');
          if (!chatView || !chatView.classList.contains('active')) return;
          const vvHeight = window.visualViewport.height;
          chatView.style.height = vvHeight + 'px';
          // Mesaj alanını en alta scroll et
          const area = document.getElementById('messages-area');
          if (area) setTimeout(() => { area.scrollTop = area.scrollHeight; }, 60);
        };
        const _debouncedVP = debounce(onVPResize, 150);
        window.visualViewport.addEventListener('resize', _debouncedVP);
        window.visualViewport.addEventListener('scroll', _debouncedVP);
      } else {
        // Fallback: eski scrollIntoView
        inp.addEventListener('focus', () => {
          setTimeout(() => { inp.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 350);
        });
      }
      // Input blur'da height sıfırla
      inp.addEventListener('blur', () => {
        const chatView = document.getElementById('chat-view');
        if (chatView) chatView.style.height = '';
      });
    }
  }

  // Network durumu bildirimi
  window.addEventListener('online',  () => showToast(t('toast.connected')));
  window.addEventListener('offline', () => showToast(t('toast.offline'), true));

  // Uzun süre hareketsizlik → oturumu yenile veya uyar (4 saat)
  (() => {
    const INACTIVE_MS = 4 * 60 * 60 * 1000;
    let _inactivityTimer = null;
    const _resetTimer = () => {
      clearTimeout(_inactivityTimer);
      if (!S.currentUser) return;
      _inactivityTimer = setTimeout(async () => {
        const { data } = await sb.auth.getSession();
        if (!data?.session) {
          showToast(t('toast.session_expired'), true);
          setTimeout(() => window.location.reload(), 2000);
        }
      }, INACTIVE_MS);
    };
    ['click', 'keydown', 'touchstart', 'scroll'].forEach(ev =>
      window.addEventListener(ev, _resetTimer, { passive: true })
    );
    _resetTimer();
  })();

  // Auth state değişimlerini izle — token expire olursa kullanıcıyı auth ekranına al
  sb.auth.onAuthStateChange((event, session) => {
    // TOKEN_REFRESHED: Supabase otomatik yeniledi, bir şey yapmaya gerek yok
    if (event === 'TOKEN_REFRESHED') return;
    // SIGNED_OUT veya USER_DELETED: kullanıcıyı auth ekranına al
    if (event === 'SIGNED_OUT' || event === 'USER_DELETED' || (!session && S.currentUser)) {
      // Sadece uygulama zaten açıksa yap — ilk load'da SIGNED_IN beklerken bunu tetikleme
      if (S.currentUser) {
        try {
          if (S._pollingInterval) clearInterval(S._pollingInterval);
          if (S._gcSilenceTimer) clearTimeout(S._gcSilenceTimer);
        } catch (_) {}
        S.currentUser = null;
        showToast(t('toast.session_expired'), true);
        setTimeout(() => window.location.reload(), 1500);
      }
    }
  });

  // Native OAuth dönüşü deep-link'le gelir ve aşağıdaki getSession'dan SONRA
  // düşebilir — dinleyici oturum sorgusundan önce kurulur. Web'de no-op.
  authNativeDeepLinkInit();

  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) await initApp(session.user);
})();
