/* ═══════════════════════════════════════════════════════════════════
   10x — BİLDİRİMLER · Gerçek Web Push (uygulama kapalıyken geri çağırma)
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     "Mesele Sensin" — dönüşüm, üst üste gelen küçük günlerle gerçek olur.
     Ama insan unutur, kaçar, erteler. Bu modül, kullanıcıyı uygulama
     KAPALIYKEN bile — onu çekebileceğimiz HER AN — doğru anda doğru
     sözle geri çağırır. Bildirim bir reklam değil; "Olduğun Kişi"ye
     atılmış bir adımın hatırlatıcısıdır.

   MİMARİ:
     • Bu client: izin (soft-prompt) → PushManager.subscribe(VAPID) →
       push_subscriptions tablosuna upsert; ayrıca her açılışta
       user_engagement snapshot upsert (motorun kimi/ne zaman çağıracağı).
     • sw.js: 'push' → showNotification ; 'notificationclick' → deep-link.
     • Edge (send-push): pg_cron ile çalışır; öncelik merdiveni + sessiz
       saat + freq-cap → kişisel LLM metni → web-push gönderir.

   Konvansiyon: hardcoded TR string. TDZ güvenliği: modüller-arası erişim
   window.* üzerinden. Yerel tarih: localISODate (UTC kayması yok).
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { sb, VAPID_PUBLIC, EDGE_FN_BASE, EMRE_IMG } from '../config.js';
import { SafeStorage, showToast, localISODate, getActivityDays, debounce } from './00a-infrastructure.js';
import { t, getCurrentLanguage } from './15-i18n.js';

const SOFT_DISMISS_KEY = 'etw_push_softprompt_dismissed'; // "daha sonra" / kalıcı ret
const NATIVE_ON_KEY    = 'etw_native_push_on';            // native'de bildirim açık (yerel ipucu)
let _deepLinkBound = false;

/* Native (Capacitor) mı? Web Push iOS WKWebView'de çalışmaz → native'de
   00e köprüsü APNs/FCM token'ı alır, aşağıdaki native dallar onu yazar. */
function _isNativePush() { try { return !!window.nativePushIsNative?.(); } catch (_) { return false; } }

/* ── VAPID public key (base64url) → Uint8Array (applicationServerKey) ── */
export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/* ── Yetenek kontrolü ── */
function _pushSupported() {
  return typeof navigator !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

/* ════════════════════════════════════════════════════════════════════
   BOOT — auth sonrası çağrılır (03-auth-shell post-auth)
════════════════════════════════════════════════════════════════════ */
export function bildirimInit() {
  // Native: Web Push yerine APNs/FCM köprüsü. Deep-link 00e içinde bağlanır.
  if (_isNativePush()) { bildirimNativeInit(); return; }
  if (!_pushSupported()) return;
  _bindDeepLink();

  // İzin durumuna göre:
  const perm = Notification.permission;
  if (perm === 'granted') {
    // Zaten izinli → aboneliği DB ile senkronla (sessizce) + snapshot
    _ensureSubscription().catch(() => {});
    bildirimSyncEngagement();
  } else if (perm === 'default') {
    // Henüz sorulmadı → uygun anda nazik in-app davet (sert prompt'tan önce)
    bildirimSyncEngagement(); // last_active'i yine de kaydet (win-back motoru için)
    setTimeout(() => { try { bildirimMaybeSoftPrompt(); } catch (_) {} }, 7000);
  } else {
    // 'denied' → saygı göster, dürtme; yine de snapshot tut
    bildirimSyncEngagement();
  }

  // Uygulama yeniden öne geldiğinde last_active'i tazele (win-back doğruluğu)
  try {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') bildirimSyncEngagement();
    });
  } catch (_) {}
}

/* ════════════════════════════════════════════════════════════════════
   NATIVE PUSH (Capacitor) — 00e köprüsü + APNs/FCM token persist
════════════════════════════════════════════════════════════════════ */
async function bildirimNativeInit() {
  // Token yenilemelerini dinle (arka planda APNs/FCM token döndürebilir)
  try {
    window.addEventListener('wndr-native-push-token', (e) => {
      const d = e?.detail || {};
      if (d.token) _saveNativeToken(d.token, d.platform);
    });
  } catch (_) {}
  // Daha önce izin verildiyse token'ı sessizce tazele + flag'i doğrula
  try {
    const tok = await window.nativePushSilentToken?.();
    if (tok?.token) {
      await _saveNativeToken(tok.token, tok.platform);
      SafeStorage.setRaw(NATIVE_ON_KEY, '1');
    }
  } catch (_) {}
  bildirimSyncEngagement();
  try {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') bildirimSyncEngagement();
    });
  } catch (_) {}
}

async function bildirimNativeEnable() {
  const tok = await window.nativePushRegister?.();
  if (!tok?.token) {
    showToast('Bildirim izni verilmedi.', true);
    SafeStorage.setRaw(SOFT_DISMISS_KEY, '1');
    bildirimRenderSettings();
    return false;
  }
  await _saveNativeToken(tok.token, tok.platform);
  await _setEngagement({ push_enabled: true });
  bildirimSyncEngagement();
  SafeStorage.setRaw(NATIVE_ON_KEY, '1');
  showToast('Bildirimler açıldı. Yolun her anında buradayım.');
  bildirimRenderSettings();
  return true;
}

async function bildirimNativeDisable() {
  // En son token satırını sil (varsa). Token'ı bilmiyorsak platforma göre temizle.
  try {
    if (S.currentUser?.id) {
      await sb.from('push_subscriptions').delete()
        .eq('user_id', S.currentUser.id)
        .not('platform', 'is', null);
    }
  } catch (_) {}
  await _setEngagement({ push_enabled: false });
  SafeStorage.remove(NATIVE_ON_KEY);
  showToast('Bildirimler kapatıldı.');
  bildirimRenderSettings();
}

async function _saveNativeToken(token, platform) {
  if (!S.currentUser?.id || !token) return;
  // Web push satırlarıyla aynı tabloya; sentetik endpoint UNIQUE anahtarı korur.
  // p256dh/auth native'de yok (migration 024 NULL'a izin verir).
  await sb.from('push_subscriptions').upsert({
    user_id: S.currentUser.id,
    endpoint: `native:${platform || 'unknown'}:${token}`,
    native_token: token,
    platform: platform || 'unknown',
    ua: (navigator.userAgent || '').slice(0, 300),
  }, { onConflict: 'endpoint' });
}

/* ── SW → sayfa deep-link köprüsü (bildirime tıklayınca doğru ekrana git) ── */
function _bindDeepLink() {
  if (_deepLinkBound || !('serviceWorker' in navigator)) return;
  _deepLinkBound = true;
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'wndr-notif-click') _routeNotif(e.data.ntype);
  });
  // Soğuk açılış: SW openWindow ettiyse hedef hash'te gelir (#notif=<tip>)
  try {
    const m = (location.hash || '').match(/notif=([^&]+)/);
    if (m) { _routeNotif(decodeURIComponent(m[1])); history.replaceState(null, '', location.pathname); }
  } catch (_) {}
}

function _routeNotif(ntype) {
  try {
    if (ntype === 'person_pack' && typeof window.w2Nav === 'function') { window.w2Nav('kisilerim'); return; }
    // Diğer tüm tipler → ana sohbet ekranı (kullanıcıyı akışa sokar)
    if (typeof window.switchView === 'function') window.switchView('chat');
  } catch (_) {}
}

/* ════════════════════════════════════════════════════════════════════
   SOFT-PROMPT — markalı in-app davet (tarayıcının sert iznini tetiklemeden)
   Best-practice: önce değer öner, sonra izin iste → "denied" oranı düşer.
════════════════════════════════════════════════════════════════════ */
export function bildirimMaybeSoftPrompt() {
  const native = _isNativePush();
  if (!native && !_pushSupported()) return;
  if (!native && Notification.permission !== 'default') return; // sorulmuş/karar verilmiş
  if (native && SafeStorage.getRaw(NATIVE_ON_KEY)) return;      // native'de zaten açık
  if (SafeStorage.getRaw(SOFT_DISMISS_KEY)) return;        // "daha sonra" denmiş
  if (document.getElementById('push-softprompt')) return;  // zaten açık
  // En az bir kez uygulamayı kullanmış olsun (boş kullanıcıyı dürtme)
  const sessions = Object.keys(S.allSessions || {}).length;
  if (sessions < 1) return;
  _renderSoftPrompt();
}

function _renderSoftPrompt() {
  const el = document.createElement('div');
  el.className = 'overlay show';
  el.id = 'push-softprompt';
  el.style.setProperty('z-index', 'var(--z-modal)');
  el.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-label="Bildirimler"
         style="max-width:380px;text-align:center;">
      <div style="font-size:34px;line-height:1;margin-bottom:14px;">🔔</div>
      <div class="serif" style="font-size:21px;color:var(--gold);margin-bottom:12px;">
        ${t('bld.sp.title', 'Yolun her anında yanında olayım mı?')}
      </div>
      <p style="font-size:14px;color:var(--text-mid);line-height:1.7;margin-bottom:24px;">
        ${t('bld.sp.body', 'Serini, verdiğin sözü ve o güne özel adımı tam zamanında hatırlatayım. Reklam değil — <em>olmak istediğin kişiye</em> giden bir dürtü. İstediğin an kapatabilirsin.')}
      </p>
      <button class="btn-gold" id="push-sp-yes" type="button"
              style="width:100%;margin-bottom:10px;">${t('bld.sp.yes', 'İzin ver')}</button>
      <button class="btn-outline-gold" id="push-sp-later" type="button"
              style="width:100%;">${t('bld.sp.later', 'Daha sonra')}</button>
    </div>`;
  document.body.appendChild(el);
  document.getElementById('push-sp-yes').addEventListener('click', async () => {
    _closeSoftPrompt();
    await bildirimEnable();
  });
  document.getElementById('push-sp-later').addEventListener('click', () => {
    SafeStorage.setRaw(SOFT_DISMISS_KEY, '1');
    _closeSoftPrompt();
  });
}

function _closeSoftPrompt() {
  const el = document.getElementById('push-softprompt');
  if (el) el.remove();
}

/* ════════════════════════════════════════════════════════════════════
   İZİN + ABONELİK
════════════════════════════════════════════════════════════════════ */
export async function bildirimEnable() {
  if (_isNativePush()) return bildirimNativeEnable();
  if (!_pushSupported()) { showToast(t('bld.unsupported', 'Bu cihaz bildirimleri desteklemiyor.'), true); return false; }
  let perm = Notification.permission;
  if (perm === 'default') perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    showToast(t('bld.denied', 'Bildirim izni verilmedi.'), true);
    SafeStorage.setRaw(SOFT_DISMISS_KEY, '1'); // tekrar dürtme
    bildirimRenderSettings();
    return false;
  }
  const ok = await bildirimSubscribe();
  if (ok) showToast(t('bld.enabled', 'Bildirimler açıldı. Yolun her anında buradayım.'));
  bildirimRenderSettings();
  return ok;
}

/** SW kaydını verir; kayıt YOKSA hata fırlatır.
 *
 *  `navigator.serviceWorker.ready` bir kayıt olmadığında ASLA resolve olmaz —
 *  sessizce askıda kalır. Yerel geliştirmede SW bilerek kayıtlı değildir
 *  (14-boot: bayat bundle preview'ı sahte-yeşile çevirmesin), dolayısıyla o
 *  promise'i beklemek butonu sonsuza dek dondururdu. Çağıranların üçünün de
 *  zaten bir hata yolu var (toast + false); askıda kalmak yerine onu çalıştır.
 *  Sessiz donma, gürültülü hatadan kötüdür. */
async function _swReg() {
  if (!('serviceWorker' in navigator)) throw new Error('service worker desteklenmiyor');
  const kayit = await navigator.serviceWorker.getRegistration();
  if (!kayit) throw new Error('service worker kaydı yok (yerel geliştirmede kapalıdır)');
  return navigator.serviceWorker.ready;
}

/** Aktif abonelik yoksa oluştur; varsa DB ile senkronla. */
async function _ensureSubscription() {
  const reg = await _swReg();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    });
  }
  await _saveSubscription(sub);
  return sub;
}

export async function bildirimSubscribe() {
  try {
    await _ensureSubscription();
    await _setEngagement({ push_enabled: true });
    return true;
  } catch (e) {
    console.warn('[push] subscribe error:', e?.message || e);
    showToast(t('bld.sub_failed', 'Bildirim aboneliği kurulamadı.'), true);
    return false;
  }
}

async function _saveSubscription(sub) {
  if (!S.currentUser?.id) return;
  const raw = sub.toJSON();
  if (!raw?.endpoint || !raw?.keys) return;
  await sb.from('push_subscriptions').upsert({
    user_id: S.currentUser.id,
    endpoint: raw.endpoint,
    p256dh: raw.keys.p256dh,
    auth: raw.keys.auth,
    ua: (navigator.userAgent || '').slice(0, 300),
  }, { onConflict: 'endpoint' });
}

export async function bildirimUnsubscribe() {
  try {
    const reg = await _swReg();
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      try { await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint); } catch (_) {}
      await sub.unsubscribe();
    }
    await _setEngagement({ push_enabled: false });
    showToast(t('bld.disabled', 'Bildirimler kapatıldı.'));
  } catch (e) {
    console.warn('[push] unsubscribe error:', e?.message || e);
  }
  bildirimRenderSettings();
}

/* ── Ayarlardaki anahtar (toggle) ── */
export async function bildirimToggle(on) {
  if (_isNativePush()) { if (on) await bildirimNativeEnable(); else await bildirimNativeDisable(); return; }
  if (on) await bildirimEnable();
  else await bildirimUnsubscribe();
}

/* ════════════════════════════════════════════════════════════════════
   ENGAGEMENT SNAPSHOT — motorun "kimi/ne zaman/neyle" kararı için sinyaller.
   Client'ın eriştiği veriden (RLS-owner) en-iyi-çaba doldurulur.
════════════════════════════════════════════════════════════════════ */
export const bildirimSyncEngagement = debounce(_syncEngagementNow, 1500);

async function _syncEngagementNow() {
  if (!S.currentUser?.id) return;
  try {
    await _setEngagement(_buildEngagementSnapshot());
  } catch (e) {
    console.warn('[push] engagement sync:', e?.message || e);
  }
}

/** Saf (yan etkisiz) snapshot kurucu — test edilebilir. */
export function _buildEngagementSnapshot() {
  const tz = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul'; }
    catch (_) { return 'Europe/Istanbul'; }
  })();

  // Seri (sohbet + ritüel defteri). recomputeStreakUI sayı döndürür.
  let streak = 0;
  try {
    if (typeof window.recomputeStreakUI === 'function') streak = window.recomputeStreakUI() || 0;
    if (!streak) streak = parseInt(document.getElementById('streak-val')?.textContent || '0', 10) || 0;
  } catch (_) {}

  // Son aktivite günü = aktivite defterinin en yeni girdisi (yoksa bugün).
  let lastSealed = '';
  try {
    const days = getActivityDays(); // localDayKey: "Y-M-D" (padding YOK)
    if (days.length) {
      const parsed = days
        .map(k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m, d); })
        .sort((a, b) => b - a)[0];
      lastSealed = localISODate(parsed);
    }
  } catch (_) {}

  // Bugün verilmiş ama akşam hesabı yapılmamış söz (varsa) → LLM için güçlü kanca.
  let pendingSoz = '';
  try {
    const r = S._gunlukRitus;
    const today = localISODate();
    if (r && r.date === today && Array.isArray(r.pledges) && r.pledges.length && !r.reckoned) {
      pendingSoz = String(r.pledges[0]?.text || '').slice(0, 160);
    }
  } catch (_) {}

  return {
    tz,
    streak,
    last_active_date: localISODate(),
    last_sealed_date: lastSealed || null,
    pending_soz_text: pendingSoz || null,
    quiet_start: 23,  // yerel saat — bu aralıkta bildirim gönderilmez
    quiet_end: 8,
    lang: getCurrentLanguage() || 'tr', // push dil kilidi (mig 037) — sohbetle aynı dil
  };
}

async function _setEngagement(patch) {
  if (!S.currentUser?.id) return;
  await sb.from('user_engagement').upsert({
    user_id: S.currentUser.id,
    ...patch,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

/* ════════════════════════════════════════════════════════════════════
   TEST — gerçek (uçtan uca) push. Edge fn yoksa yerel bildirime düşer.
════════════════════════════════════════════════════════════════════ */
export async function bildirimTest() {
  // Native: token taze olsun, sonra edge fn test moduyla (FCM→APNs) gönder.
  if (_isNativePush()) {
    if (!SafeStorage.getRaw(NATIVE_ON_KEY)) { const ok = await bildirimNativeEnable(); if (!ok) return; }
    try {
      const { data } = await sb.auth.getSession();
      const res = await fetch(`${EDGE_FN_BASE}/send-push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data?.session?.access_token}` },
        body: JSON.stringify({ mode: 'test' }),
      });
      showToast(res.ok ? 'Test bildirimi gönderildi.' : 'Test bildirimi gönderilemedi.', !res.ok);
    } catch (_) { showToast('Test bildirimi gönderilemedi.', true); }
    return;
  }
  if (!_pushSupported()) { showToast(t('bld.unsupported', 'Bu cihaz bildirimleri desteklemiyor.'), true); return; }
  if (Notification.permission !== 'granted') { await bildirimEnable(); return; }
  await bildirimSubscribe(); // abonelik taze olsun
  try {
    const { data } = await sb.auth.getSession();
    const token = data?.session?.access_token;
    const res = await fetch(`${EDGE_FN_BASE}/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode: 'test' }),
    });
    if (res.ok) { showToast(t('bld.test_sent', 'Test bildirimi gönderildi.')); return; }
    throw new Error('edge ' + res.status);
  } catch (e) {
    console.warn('[push] test via edge failed, local fallback:', e?.message || e);
    // Yerel fallback (uygulama açıkken): yine de bir şey görünsün.
    try {
      const reg = await _swReg();
      reg.showNotification(S.settings?.persona_name || 'Emre the Wanderer', {
        body: t('bld.test_body', 'Test bildirimi · Yolun her anında buradayım.'),
        icon: EMRE_IMG, badge: EMRE_IMG, tag: 'wndr-test',
        data: { url: './index.html', type: 'generic' },
      });
      showToast(t('bld.test_local', 'Test bildirimi (yerel) gösterildi.'));
    } catch (_) { showToast(t('bld.test_failed', 'Test bildirimi gönderilemedi.'), true); }
  }
}

/* ════════════════════════════════════════════════════════════════════
   AYARLAR — durum metni + toggle senkronu (_src.html'deki Bildirimler grubu)
════════════════════════════════════════════════════════════════════ */
export function bildirimRenderSettings() {
  const statusEl = document.getElementById('push-status');
  const toggle = document.getElementById('push-toggle');
  if (!statusEl && !toggle) return;

  // Native: izin durumunu senkron okuyamayız → yerel açık-ipucu (NATIVE_ON_KEY).
  if (_isNativePush()) {
    const on = !!SafeStorage.getRaw(NATIVE_ON_KEY);
    if (toggle) { toggle.checked = on; toggle.disabled = false; }
    if (statusEl) statusEl.textContent = on
      ? 'Açık. Seni doğru anda — serin, sözün, o günkü adımın için — geri çağıracağım.'
      : 'Kapalı. Aç ki uygulama kapalıyken bile sana doğru anda seslenebileyim.';
    return;
  }

  const supported = _pushSupported();
  const perm = supported ? Notification.permission : 'unsupported';
  const isOn = perm === 'granted';

  if (toggle) {
    toggle.checked = isOn;
    toggle.disabled = !supported || perm === 'denied';
  }
  if (statusEl) {
    let msg;
    if (!supported) msg = t('bld.status.unsupported', 'Bu cihaz/ tarayıcı bildirimleri desteklemiyor.');
    else if (perm === 'denied') msg = t('bld.status.denied', 'Bildirimler tarayıcı ayarlarından engellenmiş. Açmak için site izinlerinden ver.');
    else if (perm === 'granted') msg = t('bld.status.on', 'Açık. Seni doğru anda — serin, sözün, o günkü adımın için — geri çağıracağım.');
    else msg = t('bld.status.off', 'Kapalı. Aç ki uygulama kapalıyken bile sana doğru anda seslenebileyim.');
    statusEl.textContent = msg;
  }
}

/* ════════════════════════════════════════════════════════════════════
   ADMIN — tüm push-enabled kullanıcılara elle bildirim (broadcast composer)
════════════════════════════════════════════════════════════════════ */
export async function bildirimBroadcast(btn) {
  const title = (document.getElementById('push-bc-title')?.value || '').trim();
  const body  = (document.getElementById('push-bc-body')?.value || '').trim();
  if (!body) { showToast(t('bld.bc.empty', 'Bildirim metni boş olamaz.'), true); return; }
  if (!confirm(t('bld.bc.confirm', 'Bu bildirim TÜM bildirim-açık kullanıcılara gönderilecek. Emin misin?'))) return;
  const old = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = t('bld.bc.sending', 'Gönderiliyor…'); }
  try {
    const { data } = await sb.auth.getSession();
    const res = await fetch(`${EDGE_FN_BASE}/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data?.session?.access_token}` },
      body: JSON.stringify({ mode: 'broadcast', title: title || 'Emre the Wanderer', body }),
    });
    const out = await res.json().catch(() => ({}));
    if (res.ok) {
      showToast(t('bld.bc.sent', 'Gönderildi · {n} kullanıcı.').replace('{n}', out.delivered ?? 0));
      const b = document.getElementById('push-bc-body'); if (b) b.value = '';
    } else {
      showToast(t('bld.bc.failed', 'Gönderilemedi') + ': ' + (out.error || res.status), true);
    }
  } catch (e) {
    console.warn('[push] broadcast error:', e?.message || e);
    showToast(t('bld.bc.net_failed', 'Gönderilemedi (ağ hatası).'), true);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = old; }
  }
}
