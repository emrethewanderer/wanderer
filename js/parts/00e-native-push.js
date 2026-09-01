/* ═══════════════════════════════════════════════════════════════════
   00e — NATIVE PUSH KÖPRÜSÜ · Capacitor PushNotifications ince sarmalı
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     "Her An Geri Çekme" motoru (10x) uygulama kapalıyken kullanıcıyı
     geri çağırır. Ama gerçek Web Push iOS WKWebView'de çalışmaz; native
     dağıtımda kullanıcıyı geri çağırmanın tek yolu APNs/FCM'dir. Bu köprü
     native'de cihaz token'ını alır; 10x onu push_subscriptions'a yazar,
     send-push edge fn FCM ile (iOS→APNs dahil) gönderir.

   SORUMLULUK SINIRI:
     • BU MODÜL: yalnız plugin erişimi (izin → register → token) +
       bildirime dokunulunca deep-link yönlendirme.
     • 10x: token'ı DB'ye yazar + engagement (bildirimEnable native dalı).

   KONVANSİYON: ESM plugin importu YOK — window.Capacitor.Plugins.
     PushNotifications runtime erişimi (IIFE/file:// güvenli, 13k gibi).
     Plugin native'de cap sync ile kayıtlı; web'de undefined → no-op.
     Native kurulum (plugin + APNs + Firebase) ELLE: SETUP-NATIVE-PUSH.md.
═══════════════════════════════════════════════════════════════════ */

function _isNative() { try { return !!window.Capacitor?.isNativePlatform?.(); } catch (_) { return false; } }
function _platform() { try { return window.Capacitor?.getPlatform?.() || 'web'; } catch (_) { return 'web'; } }
function _pn() { try { return window.Capacitor?.Plugins?.PushNotifications || null; } catch (_) { return null; } }

let _listenersBound = false;
let _pending = null; // register() bekleyen söz: { resolve }

/* Bildirime dokunulunca doğru ekrana git (SW deep-link _routeNotif ikizi) */
function _routeNotif(ntype) {
  try {
    if (ntype === 'person_pack' && typeof window.w2Nav === 'function') { window.w2Nav('kisilerim'); return; }
    if (typeof window.switchView === 'function') window.switchView('chat');
  } catch (_) {}
}

function _bindListeners() {
  const PN = _pn();
  if (!PN || _listenersBound) return;
  _listenersBound = true;
  try {
    // Token geldi (ilk kayıt VEYA arka planda yenilenme)
    PN.addListener('registration', (tok) => {
      const token = tok?.value || '';
      if (_pending) { _pending.resolve({ token, platform: _platform() }); _pending = null; }
      // İstenmeden gelen yenilenmeleri 10x dinler → DB'yi tazeler
      try { window.dispatchEvent(new CustomEvent('wndr-native-push-token', { detail: { token, platform: _platform() } })); } catch (_) {}
    });
    PN.addListener('registrationError', (err) => {
      console.warn('[native-push] registration error:', err);
      if (_pending) { _pending.resolve(null); _pending = null; }
    });
    // Bildirime dokunuldu → deep-link
    PN.addListener('pushNotificationActionPerformed', (action) => {
      const data = action?.notification?.data || {};
      _routeNotif(data.type || data.ntype || 'generic');
    });
  } catch (_) {}
}

/** İzin iste → register → token döndür (yoksa null). 10sn timeout. */
export async function nativePushRegister() {
  const PN = _pn();
  if (!PN) return null;
  _bindListeners();
  try {
    let perm = await PN.checkPermissions();
    if (perm?.receive !== 'granted') perm = await PN.requestPermissions();
    if (perm?.receive !== 'granted') return null;
    const p = new Promise((resolve) => { _pending = { resolve }; });
    await PN.register();
    return await Promise.race([p, new Promise(r => setTimeout(() => r(null), 10000))]);
  } catch (e) {
    console.warn('[native-push] register failed:', e?.message || e);
    return null;
  }
}

/** İzin daha önce verildiyse token'ı sessizce tazele (boot senkronu). */
export async function nativePushSilentToken() {
  const PN = _pn();
  if (!PN) return null;
  _bindListeners();
  try {
    const perm = await PN.checkPermissions();
    if (perm?.receive !== 'granted') return null;
    const p = new Promise((resolve) => { _pending = { resolve }; });
    await PN.register();
    return await Promise.race([p, new Promise(r => setTimeout(() => r(null), 8000))]);
  } catch (_) { return null; }
}

export function nativePushIsNative() { return _isNative(); }
export function nativePushBind() { if (_isNative()) _bindListeners(); }

// window expose + boot bind (deep-link + token-yenileme dinleyicileri kurulur).
if (typeof window !== 'undefined') {
  window.nativePushIsNative   = nativePushIsNative;
  window.nativePushRegister   = nativePushRegister;
  window.nativePushSilentToken = nativePushSilentToken;
  window.nativePushBind       = nativePushBind;
  const boot = () => { try { nativePushBind(); } catch (_) {} };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
}
