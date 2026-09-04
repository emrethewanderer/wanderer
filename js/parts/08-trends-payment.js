import { S } from '../state.js';
import { sb, SUPABASE_URL, SUPABASE_ANON, EDGE_FN_BASE, EMRE_IMG } from '../config.js';
import { SafeStorage, EventBus, escapeHTML, showToast } from './00a-infrastructure.js';
import { t, getCurrentLanguage } from './15-i18n.js';
import { initDrawerPremiumGates } from './03-auth-shell.js';
import { sendMessage, appendMsg } from './06-summary-chat.js';
import { cleanHistoryText, getAllMessages } from './00-config-tracking.js';


/* ═══ ŞİFRE SIFIRLAMA SÖKÜLDÜ (2026-08-27) ═══
   doForgotPassword + sendPasswordReset kaldırıldı: kod kapısıyla birlikte
   şifre diye bir şey kalmadı. Kullanıcı her girişte adresine gelen tek
   kullanımlık kodu yazar — unutulacak, sıfırlanacak, çalınacak bir sır yok.
   Ayarlar'daki "Güvenlik · Şifre Sıfırlama Gönder" bloğu da aynı turda
   _src.html'den silindi; trAuthErr importu ise burada başka tüketicisi
   kalmadığı için düştü. */

/* ═══ SEANS ARAMA — filterHistory SÖKÜLDÜ (2026-08-17) ═══
   Hedefi `#full-history-list` DOM'da doğmuyordu; tek çağıranı olan
   switchView 'history' dalı FAZ 5'te düştü. Ölü olmakla kalmıyordu —
   çağrılsa ilk satırda (`list.innerHTML`) null referansla patlardı.
   Seans geçmişi bugün Sohbet takvimi (11-w2-chat-cal) üzerinden okunuyor. */

/* ═══ HAFTALIK ÖZET BİLDİRİMİ ═══ */
export async function checkWeeklySummaryNotif() {
  if (Notification.permission !== 'granted') return;
  const now  = new Date();
  if (now.getDay() !== 0) return; // Pazar günü
  const key  = `etw_weekly_${now.toLocaleDateString(getCurrentLanguage() || 'tr')}`;
  if (SafeStorage.getRaw(key)) return;
  SafeStorage.setRaw(key, '1');

  // Haftalık veri özetle
  const weekAgo   = new Date(now - 7 * 86400000);
  const weekMsgs  = getAllMessages()
    .filter(m => m.role === 'user' && new Date(m.created_at) > weekAgo);
  const sessCount = new Set(weekMsgs.map(m => m.session_id)).size;

  const body = sessCount
    ? t('notify.week_active').replace('{{count}}', sessCount)
    : t('notify.week_inactive');

  new Notification(S.settings.persona_name || 'Emre the Wanderer', {
    body, icon: EMRE_IMG, badge: EMRE_IMG
  });
}

/* ═══ UTILS ═══ */
export function handleKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }
export function autoResize(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }

/* Kullanıcı dostu hata mesajı dönüştürücü — teknik mesajları gizler */
export function userFriendlyError(e) {
  const raw = (e?.message || String(e || '')).toLowerCase();
  if (!raw) return t('error.unexpected');
  if (raw.includes('network') || raw.includes('failed to fetch') || raw.includes('load failed')) {
    return t('error.network');
  }
  if (raw.includes('quota') || raw.includes('exceeded') || raw.includes('rate limit') || raw.includes('429')) {
    return t('error.rate_limit');
  }
  if (raw.includes('401') || raw.includes('unauthorized') || raw.includes('api key')) {
    return t('error.auth');
  }
  if (raw.includes('timeout') || raw.includes('timed out')) {
    return t('error.timeout');
  }
  if (raw.includes('duplicate') || raw.includes('unique constraint')) {
    return t('error.duplicate');
  }
  // Supabase/Postgres spesifik
  if (raw.includes('row-level security') || raw.includes('permission denied')) {
    return t('error.permission');
  }
  // Sunucu / upstream hatası
  if (raw.includes('500') || raw.includes('502') || raw.includes('503') || raw.includes('504') || raw.includes('server') || raw.includes('upstream')) {
    return t('error.server');
  }
  // JS runtime hatası — geliştirici için daha anlamlı
  if (e instanceof ReferenceError || e instanceof TypeError) {
    console.error('Runtime hatası (bug):', e);
    return t('error.unexpected');
  }
  // Fallback: genel mesaj
  return t('error.generic');
}

export function toastError(e, prefix = '') {
  const msg = prefix ? `${prefix}: ${userFriendlyError(e)}` : userFriendlyError(e);
  showToast(msg, true);
  // Geliştirici için console'a gerçek hatayı bırak
  if (e) console.warn('Hata:', e);
}

/* ═══════════════════════════════════════════════════════
   MAĞAZA ABONELİĞİ v2 — "Kapılar ve Kilitler" (App Store & Google Play / RevenueCat)

   İş modeli (Wanderer Fiyatlandırma Planı v2.md — Wanderer Work/):
     Free  → yalnız Öz, sınırlı kota
     Pro   → 299₺/ay (kilit) · 499₺/ay (liste) · 2999₺/yıl (herkese, kilit)
     Max   → 999₺/ay (kilit) · 1499₺/ay (liste) · 9999₺/yıl (herkese, kilit)

   Sadakat Kilidi: kesintisiz abone kilit fiyatında kalır; iptal→30 gün
   "Kapı Aralık" kilidi korur, sonra liste fiyatına düşer. Yıllık HERKESE
   kilit fiyatındadır (dönüş için asil kapı).

   Giriş kapıları (yalnız hiç kullanmamış hesaba, hesap başına 1 kez):
     Kapı A — İlk Kapı: pro_monthly ürününe bağlı Introductory Offer (1₺,
       ilk ay), yalnız offer_a_deadline'a kadar (72s).
     Kapı B — Yedi Eşik: pro_monthly_t ürününe bağlı Free Trial (7 gün).
   Apple/Google kuralı: bir ürüne TEK intro bağlanır — bu yüzden A/B AYRI
   SKU'lardır, ikisi de 'pro' entitlement'ına bağlıdır.

   Akış:
     native (iOS/Android) → Purchases.purchasePackage → RevenueCat
       webhook'u → profiles.is_premium/is_premium_plus → Realtime ile client'a düşer
     web → mağaza yönlendirme modalı (payment-overlay)
════════════════════════════════════════════════════════= */

// RevenueCat public SDK anahtarları (Project → API Keys; appl_/goog_ önekli)
export const RC_API_KEY_APPLE  = 'BURAYA_RC_APPLE_API_KEY';
export const RC_API_KEY_GOOGLE = 'BURAYA_RC_GOOGLE_API_KEY';
// RevenueCat'te tanımlı entitlement id'leri — webhook ve client aynı adları kullanır.
// Max ürünleri RC panelinde HEM 'pro' HEM 'max' entitlement'ına bağlanmalı.
export const RC_ENTITLEMENT_PRO = 'pro';
export const RC_ENTITLEMENT_MAX = 'max';

// SKU kataloğu — App Store Connect / Google Play'de birebir bu ID'lerle oluşturulur
export const SKU = {
  PRO_MONTHLY:       'pro_monthly',      // kilit 299₺ + Introductory Offer (1₺ ilk ay) — Kapı A
  PRO_MONTHLY_TRIAL: 'pro_monthly_t',    // kilit 299₺ + Free Trial (7 gün) — Kapı B
  PRO_MONTHLY_LIST:  'pro_monthly_list', // liste 499₺
  PRO_YEARLY:        'pro_yearly',       // 2999₺ (herkese, kilit)
  MAX_MONTHLY:       'max_monthly',      // kilit 999₺
  MAX_MONTHLY_LIST:  'max_monthly_list', // liste 1499₺
  MAX_YEARLY:        'max_yearly',       // 9999₺ (herkese, kilit)
};

export const STORE_URL_APPSTORE = 'https://apps.apple.com/app/idBURAYA_APPLE_APP_ID';
export const STORE_URL_PLAY     = 'https://play.google.com/store/apps/details?id=com.emretransformation.wanderer';

const KAPI_ARALIK_GUN = 30; // iptal sonrası kilidin korunduğu pencere

let _rcPurchases = null; // plugin modülü — yalnız native'de yüklenir
let _offerings   = null; // Purchases.getOfferings() ham sonucu

export function storePlatform() {
  try {
    if (!window.Capacitor?.isNativePlatform?.()) return 'web';
    const pl = window.Capacitor.getPlatform?.();
    return pl === 'ios' || pl === 'android' ? pl : 'web';
  } catch (_) { return 'web'; }
}

async function _getPurchases() {
  if (_rcPurchases) return _rcPurchases;
  const mod = await import('@revenuecat/purchases-capacitor');
  _rcPurchases = mod.Purchases;
  return _rcPurchases;
}

async function _loadOfferings() {
  try {
    const Purchases = await _getPurchases();
    _offerings = await Purchases.getOfferings();
  } catch (e) { console.warn('getOfferings hatası:', e?.message); }
}

/* Bir offering adı fark etmeksizin, verilen SKU'yu taşıyan paketi bul.
   RC projesinde offering'ler (gate_a/gate_b/active_upsell/winback_locked/
   winback_list) SKU 9'da tarif edildiği gibi kurulmuşsa isabet eder; tek
   "default" offering kullanılıyorsa da current.availablePackages üzerinden
   çalışır — kurulum eksikse sessizce null döner (satın alma engellenir,
   kullanıcı web modaline düşer). */
function _findPackageForSku(skuId) {
  if (!_offerings) return null;
  const all = _offerings.all || {};
  for (const key in all) {
    const found = (all[key]?.availablePackages || []).find(p => p.product?.identifier === skuId);
    if (found) return found;
  }
  return (_offerings.current?.availablePackages || []).find(p => p.product?.identifier === skuId) || null;
}

/* ═══ YOLCU DURUM MAKİNESİ (plan v2 md.6) ═══
   Paywall'ın neyi göstereceğine karar veren TEK yer. */
export function pricingState() {
  if (S.isPremiumPlus) return 'active_max';
  if (S.isPremium)     return 'active_pro';
  if (S.lapsedAt) {
    const days = (Date.now() - new Date(S.lapsedAt).getTime()) / 86400000;
    return days <= KAPI_ARALIK_GUN ? 'lapsed_locked' : 'lapsed_list';
  }
  if (S.hasCancelledBefore) return 'lapsed_list'; // lapsed_at kayıtsız eski iptal — güvenli varsayım
  if (!S.hasUsedOfferA && offerADeadlineMs() > 0) return 'offer_a';
  if (!S.hasUsedOfferB) return 'offer_b';
  return 'new_no_offer'; // İlk Kapı kaçtı, Yedi Eşik de kullanılmış — yalnız kilitli fiyat
}

export function offerADeadlineMs() {
  return S.offerADeadline ? new Date(S.offerADeadline).getTime() - Date.now() : 0;
}

export function kapiAralikDaysLeft() {
  if (!S.lapsedAt) return 0;
  const left = KAPI_ARALIK_GUN - (Date.now() - new Date(S.lapsedAt).getTime()) / 86400000;
  return Math.max(0, Math.ceil(left));
}

/* locked=true → kilit SKU (299/999), false → liste SKU (499/1499).
   Yıllık her zaman kilit fiyatındadır (herkese açık dönüş kapısı). */
function _resolveSku(tier, cadence) {
  if (cadence === 'yearly') return tier === 'max' ? SKU.MAX_YEARLY : SKU.PRO_YEARLY;
  const locked = pricingState() !== 'lapsed_list';
  if (tier === 'max') return locked ? SKU.MAX_MONTHLY : SKU.MAX_MONTHLY_LIST;
  return locked ? SKU.PRO_MONTHLY : SKU.PRO_MONTHLY_LIST;
}

/* ── Auth sonrası çağrılır (03 → window.initStoreBilling) ── */
export async function initStoreBilling() {
  const platform = storePlatform();
  if (platform === 'web' || !S.currentUser) return;

  try {
    const apiKey = platform === 'ios' ? RC_API_KEY_APPLE : RC_API_KEY_GOOGLE;
    if (!apiKey || apiKey.startsWith('BURAYA')) {
      console.error('RevenueCat API anahtarı eksik — mağaza aboneliği devre dışı');
      return;
    }
    const Purchases = await _getPurchases();
    // appUserID = Supabase uid → webhook profili bu id ile günceller
    await Purchases.configure({ apiKey, appUserID: S.currentUser.id });

    // Mağazadaki gerçek durumla senkron — webhook gecikmesi/kaçağı telafisi
    const { customerInfo } = await Purchases.getCustomerInfo();
    _applyCustomerInfo(customerInfo);

    await _loadOfferings();
    renderSubStatus();
  } catch (e) {
    console.error('Mağaza aboneliği başlatılamadı:', e);
  }
}

/* ── Deneme süresi yardımcıları — yalnız eski (grandfather) 30 günlük
   denemesi kalan hesaplar için anlamlıdır; v2'de yeni hesap bu yolu görmez ── */
export function trialDaysLeft() {
  if (S.isStudioSub || !S.trialEndsAt) return 0;
  const ms = new Date(S.trialEndsAt).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 86400000) : 0;
}

/* ── Abonelik sayfası dinamik durumları (initPricing'den çağrılır) ──
   Free/Pro/Max üç kart + Sadakat Kilidi çerçevesi + Kapı Aralık banner'ı
   burada tek yerden yönetilir; _src.html'deki ilgili id'leri günceller. */
export function renderSubStatus() {
  const state = pricingState();
  const statusEl = document.getElementById('sub-trial-status');
  const kapiBanner = document.getElementById('kapi-aralik-banner');

  if (kapiBanner) {
    if (state === 'lapsed_locked') {
      kapiBanner.style.display = '';
      const daysEl = document.getElementById('kapi-aralik-days');
      if (daysEl) daysEl.textContent = String(kapiAralikDaysLeft());
    } else {
      kapiBanner.style.display = 'none';
    }
  }

  if (statusEl) {
    if (state === 'active_max') {
      statusEl.textContent = t('sub.active_max', 'Wanderer Max aktif ✦ Sınırsız yol açık.');
      statusEl.style.display = '';
    } else if (state === 'active_pro') {
      statusEl.textContent = t('sub.active_pro', 'Wanderer Pro aktif ✦ 299₺ fiyatın kilitli.');
      statusEl.style.display = '';
    } else if (state === 'offer_a') {
      statusEl.textContent = t('sub.offer_a_left', 'İlk Kapı açık — {{h}} saat kaldı').replace('{{h}}', Math.max(1, Math.ceil(offerADeadlineMs() / 3600000)));
      statusEl.style.display = '';
    } else if (state === 'lapsed_locked') {
      statusEl.textContent = t('sub.kapi_aralik', 'Kapı Aralık: kilidin {{d}} gün daha seni bekliyor').replace('{{d}}', kapiAralikDaysLeft());
      statusEl.style.display = '';
    } else {
      statusEl.style.display = 'none';
    }
  }

  _renderPlanCard('pro', state);
  _renderPlanCard('max', state);
}

function _renderPlanCard(tier, state) {
  const priceEl = document.getElementById(`${tier}-price`);
  const noteEl  = document.getElementById(`${tier}-price-note`);
  const ctaEl   = document.getElementById(`${tier}-cta-btn`);
  if (!ctaEl) return;

  const LOCKED = tier === 'max' ? '999₺' : '299₺';
  const LIST   = tier === 'max' ? '1499₺' : '499₺';
  const isActiveTier = (tier === 'pro' && (state === 'active_pro' || state === 'active_max')) ||
                       (tier === 'max' && state === 'active_max');

  if (tier === 'max' && state === 'active_max') {
    if (priceEl) priceEl.innerHTML = `${LOCKED}<sub>/ay</sub>`;
    if (noteEl) noteEl.textContent = t('sub.this_is_you', 'Şu an buradasın');
    ctaEl.textContent = t('sub.manage', 'Aboneliği Yönet');
    ctaEl.onclick = openCancelIntent;
    return;
  }
  if (tier === 'pro' && state === 'active_pro') {
    if (priceEl) priceEl.innerHTML = `${LOCKED}<sub>/ay</sub>`;
    if (noteEl) noteEl.textContent = t('sub.this_is_you', 'Şu an buradasın');
    ctaEl.textContent = t('sub.manage', 'Aboneliği Yönet');
    ctaEl.onclick = openCancelIntent;
    return;
  }
  if (tier === 'pro' && state === 'active_max') {
    if (priceEl) priceEl.innerHTML = `${LOCKED}<sub>/ay</sub>`;
    if (noteEl) noteEl.textContent = t('sub.included_in_max', 'Max\'in içinde zaten var');
    ctaEl.style.display = 'none';
    return;
  }

  const locked = state !== 'lapsed_list';
  if (priceEl) priceEl.innerHTML = `${locked ? LOCKED : LIST}<sub>/ay</sub>`;
  if (noteEl) {
    noteEl.textContent = locked
      ? t('sub.locked_note', 'Sadakat Kilidi — kesintisiz yürüdükçe hep bu fiyat')
      : t('sub.list_note', 'Liste fiyatı — yıllığa geçersen kilit fiyatı geri döner');
  }
  ctaEl.style.display = '';
  ctaEl.textContent = tier === 'max' ? t('sub.cta_max', "Max'e Geç →") : t('sub.cta_pro', "Pro'ya Geç →");
  ctaEl.onclick = () => startPayment(tier, 'monthly');
}

function _isUserCancel(e) {
  const code = String(e?.code ?? e?.errorCode ?? '');
  return /cancel/i.test(code) || /cancel/i.test(String(e?.message || ''));
}

async function _purchaseSku(skuId) {
  if (!S.currentUser) { showToast(t('toast.login_first'), true); return false; }
  if (storePlatform() === 'web') {
    // Kota Nabzı: abonelik sheet'i gerçekten açıldı (16·C) — tier SKU'nun kendi önekinden okunur.
    try { window.wtLogKota?.('sheet', { tier: skuId.startsWith('max') ? 'max' : 'pro' }); } catch (_) {}
    document.getElementById('payment-overlay')?.classList.add('open');
    return false;
  }
  try {
    const Purchases = await _getPurchases();
    if (!_offerings) await _loadOfferings();
    const pkg = _findPackageForSku(skuId);
    if (!pkg) {
      showToast(t('toast.store_unavailable', 'Mağaza şu an yanıt vermiyor. Birazdan tekrar dene.'), true);
      return false;
    }
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    _applyCustomerInfo(customerInfo);
    startPremiumWatch();
    return true;
  } catch (e) {
    if (_isUserCancel(e)) return false;
    toastError(e, t('toast.purchase_failed', 'Satın alma tamamlanamadı'));
    return false;
  }
}

/* ── Kapı A / Kapı B — Portre sonrası gösterilen giriş teklifleri ── */
export async function startOfferA() { await _purchaseSku(SKU.PRO_MONTHLY); }
export async function startOfferB() { await _purchaseSku(SKU.PRO_MONTHLY_TRIAL); }

let _gateCountdownTimer = null;

/* Portre sentezinin hemen ardından (13-extras.js showMicroOnboardingHooks)
   çağrılır. Yalnız gerçekten uygun bir teklif varsa açılır — aksi hâlde no-op,
   zorla bir "şimdi değil" ekranı göstermez. */
export function openGateOverlay() {
  const state = pricingState();
  if (state !== 'offer_a' && state !== 'offer_b') return;
  const overlay = document.getElementById('gate-overlay');
  if (!overlay || overlay.classList.contains('open')) return;

  const panelA = document.getElementById('gate-a-panel');
  const panelB = document.getElementById('gate-b-panel');
  if (panelA) panelA.style.display = state === 'offer_a' ? '' : 'none';
  if (panelB) panelB.style.display = state === 'offer_b' ? '' : 'none';

  if (state === 'offer_a') _tickGateCountdown();
  // Kota Nabzı: hangi giriş teklifi (A/B) gerçekten gösterildi — huninin ilk basamağı (16·C).
  try { window.wtLogKota?.('gate', { dal: state === 'offer_a' ? 'a' : 'b', tier: S.isPremiumPlus ? 'max' : S.isPremium ? 'pro' : 'free' }); } catch (_) {}
  overlay.classList.add('open');
}

export function closeGateOverlay() {
  document.getElementById('gate-overlay')?.classList.remove('open');
  if (_gateCountdownTimer) { clearInterval(_gateCountdownTimer); _gateCountdownTimer = null; }
}

function _tickGateCountdown() {
  const render = () => {
    const el = document.getElementById('gate-a-countdown');
    if (!el) return;
    const ms = offerADeadlineMs();
    if (ms <= 0) { closeGateOverlay(); return; }
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    el.textContent = t('gate.a.countdown', '{{h}} saat {{m}} dakika').replace('{{h}}', h).replace('{{m}}', m);
  };
  render();
  if (_gateCountdownTimer) clearInterval(_gateCountdownTimer);
  _gateCountdownTimer = setInterval(render, 60000);
}

/* ── Genel satın alma — aktif abone yükseltmesi / winback (Kapı Aralık, liste) ── */
export async function startPayment(tier = 'pro', cadence = 'monthly') {
  if (storePlatform() === 'web') {
    // Kota Nabzı: abonelik sheet'i gerçekten açıldı (16·C) — tier çağıranın verdiği hedef katman.
    try { window.wtLogKota?.('sheet', { tier: tier === 'max' ? 'max' : 'pro' }); } catch (_) {}
    document.getElementById('payment-overlay')?.classList.add('open');
    return;
  }
  await _purchaseSku(_resolveSku(tier, cadence));
}

/* ── Satın alımları geri yükle (Apple zorunluluğu; cihaz değişimi) ── */
export async function restorePurchases() {
  if (storePlatform() === 'web') {
    showToast(t('toast.restore_native_only', 'Geri yükleme yalnızca mobil uygulama içinde çalışır.'), true);
    return;
  }
  try {
    const Purchases = await _getPurchases();
    const { customerInfo } = await Purchases.restorePurchases();
    const active = customerInfo?.entitlements?.active || {};
    if (active[RC_ENTITLEMENT_PRO] || active[RC_ENTITLEMENT_MAX]) {
      _applyCustomerInfo(customerInfo);
      startPremiumWatch();
      showToast(t('toast.restore_success', 'Aboneliğin geri yüklendi ✦'));
    } else {
      showToast(t('toast.no_sub_found', 'Bu hesaba bağlı aktif abonelik bulunamadı.'), true);
    }
  } catch (e) {
    toastError(e, t('toast.restore_failed', 'Geri yükleme başarısız'));
  }
}

/* ── Abonelik yönetimi — iptal/değişiklik mağazadan yapılır ── */
export function manageSubscription() {
  const platform = storePlatform() !== 'web' ? storePlatform() : (S.storePlatform || '');
  const url = platform === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : platform === 'android'
      ? 'https://play.google.com/store/account/subscriptions'
      : null;
  if (url) window.open(url, '_blank');
  else showToast(t('toast.manage_in_store', 'Aboneliğini satın aldığın mağazanın hesap ayarlarından yönetebilirsin.'));
}

/* ── Ayrılık Eşiği — mağazaya yönlendirmeden ÖNCE gösterilen, kişisel
   veriyle konuşan retention ekranı. Çıkış hiçbir zaman engellenmez —
   "Yine de ayrılmak istiyorum" her zaman tek dokunuşla mağazaya açılır. ── */
export function openCancelIntent() {
  const streak = (() => { try { return window.recomputeStreakUI?.() | 0; } catch (_) { return 0; } })();
  const cards  = (() => { try { return window.getKisilerimStats?.()?.earned | 0; } catch (_) { return 0; } })();
  const lockPrice = S.isPremiumPlus ? '999₺' : '299₺';

  const streakEl = document.getElementById('ci-streak-n');
  const cardsEl  = document.getElementById('ci-cards-n');
  const priceEl  = document.getElementById('ci-lock-price');
  if (streakEl) streakEl.textContent = String(streak);
  if (cardsEl)  cardsEl.textContent  = String(cards);
  if (priceEl)  priceEl.textContent  = lockPrice;

  const downgradeBtn = document.getElementById('ci-downgrade-btn');
  if (downgradeBtn) downgradeBtn.style.display = S.isPremiumPlus ? '' : 'none';

  // Kota Nabzı: Ayrılık Eşiği'ne kaç kişi geldi — hunideki tek çıkış ölçümü (16·C).
  try { window.wtLogKota?.('iptal', { tier: S.isPremiumPlus ? 'max' : S.isPremium ? 'pro' : 'free' }); } catch (_) {}
  document.getElementById('cancel-intent-overlay')?.classList.add('open');
}
export function closeCancelIntent() {
  document.getElementById('cancel-intent-overlay')?.classList.remove('open');
}
export function confirmCancelIntent() {
  closeCancelIntent();
  manageSubscription();
}
export async function downgradeToProFromMax() {
  closeCancelIntent();
  await startPayment('pro', 'monthly');
}
export async function switchToYearly(tier) {
  closeCancelIntent();
  await startPayment(tier, 'yearly');
}

function _applyCustomerInfo(customerInfo) {
  const active = customerInfo?.entitlements?.active || {};
  const hasMax = !!active[RC_ENTITLEMENT_MAX];
  const hasPro = hasMax || !!active[RC_ENTITLEMENT_PRO];
  if (!hasPro && !hasMax) return;
  const wasMax = S.isPremiumPlus;
  const wasPro = S.isPremium;
  S.isPremium = true;
  S.isStudioSub = true;
  S.isPremiumPlus = hasMax;
  const el = document.getElementById('premium-indicator');
  if (el) el.style.display = 'none';
  initDrawerPremiumGates();
  try { window.ktInit?.(); } catch (_) {}
  renderSubStatus();
  if (!wasPro || (hasMax && !wasMax)) {
    showToast(hasMax ? t('toast.max_active', 'Wanderer Max aktif ✦') : t('toast.premium_active'));
  }
}

export function startPremiumWatch() {
  _stopPremiumWatch();

  const uid = S.currentUser?.id;
  if (!uid) return;

  // Realtime subscription — tetiklenince hemen bildir
  S._realtimeChannel = sb
    .channel(`premium-watch-${uid}`)
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'profiles',
      filter: `id=eq.${uid}`,
    }, (payload) => {
      if (payload.new?.is_premium || payload.new?.is_premium_plus) {
        _stopPremiumWatch();
        S.isPremium = true; S.isStudioSub = true;
        S.isPremiumPlus = !!payload.new.is_premium_plus;
        const el = document.getElementById('premium-indicator');
        if (el) el.style.display = 'none';
        initDrawerPremiumGates();
        try { window.ktInit?.(); } catch (_) {}
        renderSubStatus();
        showToast(S.isPremiumPlus ? t('toast.max_active', 'Wanderer Max aktif ✦') : t('toast.premium_active'));
      }
    })
    .subscribe();

  // Fallback: 5 dakika sonra tek seferlik kontrol — Realtime kaçırdıysa yakala
  S._premiumWatchTimeout = setTimeout(async () => {
    _stopPremiumWatch();
    try {
      const { data: prof } = await sb
        .from('profiles')
        .select('is_premium, is_premium_plus')
        .eq('id', uid)
        .single();
      if (prof?.is_premium || prof?.is_premium_plus) {
        S.isPremium = true; S.isStudioSub = true; S.isPremiumPlus = !!prof.is_premium_plus;
        initDrawerPremiumGates();
        try { window.ktInit?.(); } catch (_) {}
        renderSubStatus();
      }
    } catch (_) {}
  }, 5 * 60 * 1000);
}

function _stopPremiumWatch() {
  if (S._realtimeChannel) {
    sb.removeChannel(S._realtimeChannel);
    S._realtimeChannel = null;
  }
  if (S._premiumWatchTimeout) {
    clearTimeout(S._premiumWatchTimeout);
    S._premiumWatchTimeout = null;
  }
}

/* ── Abonelik sayfası mount noktası (switchView('sub') → 03-auth-shell) ──
   v2'de fiyatlar TRY sabit satır kalemleridir (299/499/999/1499/2999/9999) —
   eski $9/ay FX tahmini (ipapi.co + open.er-api.com) artık gereksiz. */
export async function initPricing() {
  renderSubStatus();
  if (!_offerings && storePlatform() !== 'web') await _loadOfferings();
}

export function closePayment() {
  document.getElementById('payment-overlay').classList.remove('open');
  _stopPremiumWatch();
}

/* ═══ PAYLAŞIM KARTI ═══ */
export function openShareCard() {
  const title   = document.getElementById('sum-modal-title')?.textContent || '';
  const summary = document.getElementById('sum-modal-desc')?.textContent  || '';
  if (!title && !summary) { showToast(t('toast.create_summary_first'), true); return; }

  document.getElementById('summary-overlay').classList.remove('open');
  document.getElementById('share-card-overlay').classList.add('open');

  requestAnimationFrame(() => drawShareCard(title, summary));
}

export function drawShareCard(title, summary) {
  const canvas = document.getElementById('share-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 1080, H = 1080;
  canvas.width = W; canvas.height = H;

  // Arkaplan — obsidyen siyah
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // Üst altın çizgi
  ctx.fillStyle = '#B8953C';
  ctx.fillRect(80, 80, 920, 1);

  // Alt altın çizgi
  ctx.fillRect(80, H - 80, 920, 1);

  // Marka — üst sol
  ctx.fillStyle = '#B8953C';
  ctx.font = '500 28px Georgia, serif';
  ctx.letterSpacing = '8px';
  ctx.fillText('EMRE THE WANDERER', 80, 134);

  // Tarih — üst sağ
  const dateStr = new Date().toLocaleDateString(getCurrentLanguage() || 'tr', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillStyle = '#52504A';
  ctx.font = '300 26px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(dateStr, W - 80, 134);
  ctx.textAlign = 'left';

  // Başlık
  ctx.fillStyle = '#E8E6E0';
  ctx.font = '500 72px Georgia, serif';
  const titleLines = wrapText(ctx, title, W - 160, 72);
  let y = 300;
  titleLines.forEach(line => {
    ctx.fillText(line, 80, y);
    y += 90;
  });

  // Ayraç
  ctx.fillStyle = '#1E1E1E';
  ctx.fillRect(80, y + 20, 920, 1);
  y += 60;

  // Özet metni
  ctx.fillStyle = '#8A887F';
  ctx.font = '300 36px Georgia, serif';
  const summaryLines = wrapText(ctx, summary, W - 160, 36);
  summaryLines.slice(0, 6).forEach(line => {
    ctx.fillText(line, 80, y);
    y += 52;
  });

  // Alt — seans notu
  ctx.fillStyle = '#2A2A2A';
  ctx.font = '300 24px sans-serif';
  ctx.fillText('emretransformation.com', 80, H - 100);
}

function wrapText(ctx, text, maxWidth, fontSize) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  words.forEach(word => {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  });
  if (current) lines.push(current);
  return lines;
}

export function downloadShareCard() {
  const canvas = document.getElementById('share-canvas');
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = 'gunluk-ozet.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast(t('toast.card_downloaded'));
}

export async function nativeShareCard() {
  const canvas = document.getElementById('share-canvas');
  if (!canvas) return;

  if (navigator.share && navigator.canShare) {
    try {
      canvas.toBlob(async blob => {
        const file = new File([blob], 'gunluk-ozet.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: t('ui.share_title.daily') });
        } else {
          downloadShareCard();
        }
      }, 'image/png');
    } catch (e) {
      if (e.name !== 'AbortError') downloadShareCard();
    }
  } else {
    downloadShareCard();
  }
}


/* ═══════════════════════════════════════════════════════
   DÖNÜŞÜM KARTLARI SİSTEMİ
   - Together AI FLUX ile seans özet tonuna göre görsel üretim
   - Supabase transformation_cards tablosuna kayıt
   - Endel tarzı: soyut, seans duygu tonunu yansıtan kompozisyon
════════════════════════════════════════════════════════= */

let _currentDetailCard = null; // Detay overlay'de açık kart

/* ── DUYGU TONU → FLUX PROMPT ÜRETICI ── */
function buildImagePrompt(title, summary) {
  // Seans tonunu analiz et
  const text = (title + ' ' + summary).toLowerCase();

  // Duygu tonu tespiti
  const isBreakthrough = /yüzleş|gerçek|kabul|fark et|ilk kez|dönüşüm|kırdı|açıldı|breakthrough|confront|acceptance|realiz|transform/.test(text);
  const isResistance   = /kaçış|direniş|kaçtı|direndi|ret|erteledi|olmaz|yapamam/.test(text) || /\b(escape|resistance|resist|refus|procrastinat|can'?t)\b/.test(text);
  const isVulnerable   = /ağladı|çaresiz|yalnız|korku|üzgün|kırılgan|bunaldı/.test(text) || /\b(cried|helpless|lonely|fear|afraid|sad|fragile|overwhelmed)\b/.test(text);
  const isAwareness    = /farkında|gördü|anladı|kavradı|kalıp|örüntü|tekrar/.test(text) || /\b(aware|realized|understood|pattern|recurring)\b/.test(text);

  // Temel görsel dil: soyut, sinematik, obsidyen
  const base = 'abstract generative art, cinematic chiaroscuro, obsidian black background, ultra high quality, 4k';

  if (isBreakthrough) {
    return `${base}, golden light fractal breaking through dark stone, transformation moment, emerald particles emerging from darkness, baroque atmosphere, single ray of warm gold light piercing black void, dust motes suspended in light`;
  }
  if (isResistance) {
    return `${base}, dark geometric labyrinth, deep crimson and charcoal tones, walls of obsidian, maze architecture, heavy shadows, no exit visible, oppressive but beautiful, architectural surrealism`;
  }
  if (isVulnerable) {
    return `${base}, soft silver moonlight on dark water, minimal reflection, single candle flame in vast darkness, fragile warmth, muted gold and deep blue, melancholic beauty, Edward Hopper atmosphere`;
  }
  if (isAwareness) {
    return `${base}, ancient star map on dark stone, constellation patterns in gold and copper, cartographic circles, old manuscript aesthetic, amber bioluminescence, pattern recognition visualized`;
  }
  // Varsayılan: nötr dönüşüm
  return `${base}, abstract smoke and light in dark void, gold and silver tendrils, movement frozen in time, contemplative atmosphere, Zdzisław Beksiński inspired, monumental and quiet`;
}

/* ── TOGETHER AI FLUX GÖRSEL ÜRETICI (Edge Function üzerinden) ── */
export async function generateTransformationImage(title, summary) {
  const prompt = buildImagePrompt(title, summary);

  const { data: sessionData } = await sb.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) {
    console.warn('Oturum yok — görsel üretim atlanıyor');
    return null;
  }

  try {
    const res = await fetch(`${EDGE_FN_BASE}/image-gen`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey':        SUPABASE_ANON,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({ prompt })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      // 500 = server secret eksik → görseli atla, seansı bozma
      if (res.status === 500) {
        console.warn('Görsel servisi yapılandırılmamış — atlanıyor');
        return null;
      }
      throw new Error(`Görsel API hatası (${res.status}): ${errText.slice(0, 200) || res.statusText}`);
    }

    const data = await res.json();
    if (data.error)                   throw new Error(data.error.message || JSON.stringify(data.error));
    if (!data.data?.[0]?.b64_json)   throw new Error('Görsel verisi boş döndü');

    return 'data:image/png;base64,' + data.data[0].b64_json;
  } catch (e) {
    console.error('Görsel üretim hatası:', e);
    return null;
  }
}

/* ── SUPABASE'E GÖRSEL UPLOAD + KART KAYDET ── */
export async function saveTransformationCard(title, summary, imageDataUrl) {
  let imageUrl = null;

  // Supabase Storage'a yükle (bucket: transformation-cards, public)
  if (imageDataUrl) {
    try {
      // Base64'ü Blob'a çevir
      const base64 = imageDataUrl.split(',')[1];
      const byteArr = Uint8Array.from(atob(base64), ch => ch.charCodeAt(0));
      const blob    = new Blob([byteArr], { type: 'image/png' });
      const path    = `cards/${S.currentUser.id}/${S.currentSessId}.png`;

      const { data: upData, error: upErr } = await sb.storage
        .from('transformation-cards')
        .upload(path, blob, { upsert: true, contentType: 'image/png' });

      if (!upErr && upData) {
        const { data: urlData } = sb.storage
          .from('transformation-cards')
          .getPublicUrl(path);
        imageUrl = urlData?.publicUrl || null;
      }
    } catch (e) {
      console.warn('Storage upload hatası:', e.message);
      // Yedek: base64'ü doğrudan kaydet (küçük görseller için)
      imageUrl = imageDataUrl;
    }
  }

  // DB'ye kaydet
  try {
    const { error } = await sb.from('transformation_cards').insert([{
      user_id:    S.currentUser.id,
      session_id: S.currentSessId,
      title,
      summary,
      image_url:  imageUrl,
      tone:       buildImagePrompt(title, summary).split(',')[0] // Ton etiketi
    }]);
    if (error) { console.warn('Kart kayıt hatası:', error.message); return false; }
    return true;
  } catch (e) {
    console.error('Kart DB hatası:', e);
    return false;
  }
}

/* ── ANA FONKSİYON: Özet sonrası kart üret ── */
export async function generateAndSaveCard(title, summary) {
  if (!title || !summary) return;

  // Anlık: galeri placeholder göster
  appendCardPlaceholder(S.currentSessId, title);

  // Asenkron: görsel üret → kaydet → placeholder'ı güncelle
  const imageDataUrl = await generateTransformationImage(title, summary);
  const saved = await saveTransformationCard(title, summary, imageDataUrl);
  if (!saved) {
    showToast(t('toast.card_save_fail', 'Kart kaydedilemedi. Sohbeti kapatıp tekrar dene.'), true);
  }

  // Galeri açıksa yenile
  if (document.getElementById('cards-view')?.classList.contains('active')) {
    await loadTransformationCards();
  }

  // Placeholder'ı gerçek kartla değiştir (eğer galeri açık değilse bile)
  updateCardPlaceholder(S.currentSessId, imageDataUrl, title);
}

/* ── ANİMASYONLU PLACEHOLDER (üretim sırasında) ── */
function appendCardPlaceholder(sessId, title) {
  const grid = document.getElementById('cards-grid-wrap');
  if (!grid) return;
  // Boş durum varsa temizle
  const empty = grid.querySelector('.empty-state');
  if (empty) empty.remove();

  const div = document.createElement('div');
  div.className = 'tx-card';
  div.id = `card-placeholder-${sessId}`;
  div.innerHTML = `
    <div class="tx-card-generating">
      <div class="tx-card-spinner"></div>
      <div class="tx-card-gen-label">${t('ui.generating', 'Oluşturuluyor')}</div>
    </div>
    <div class="tx-card-overlay" style="display:none;">
      <div class="tx-card-title">${title}</div>
    </div>`;
  grid.prepend(div);
}

function updateCardPlaceholder(sessId, imageDataUrl, title) {
  const ph = document.getElementById(`card-placeholder-${sessId}`);
  if (!ph) return;
  if (imageDataUrl) {
    ph.innerHTML = `
      <img src="${imageDataUrl}" alt="${title}" loading="lazy">
      <div class="tx-card-overlay">
        <div class="tx-card-date">${new Date().toLocaleDateString(getCurrentLanguage() || 'tr', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long' })}</div>
        <div class="tx-card-title">${title}</div>
      </div>`;
    ph.onclick = () => openCardDetail({ title, summary: '', image_url: imageDataUrl, created_at: new Date().toISOString() });
  } else {
    // Görsel üretilemedi — salt metin kartı
    ph.style.background = 'var(--bg-raised)';
    ph.innerHTML = `
      <div class="tx-card-overlay" style="background:linear-gradient(to top,rgba(0,0,0,0.9) 0%,rgba(0,0,0,0.4) 100%);top:0;">
        <div class="tx-card-date">${new Date().toLocaleDateString(getCurrentLanguage() || 'tr', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long' })}</div>
        <div class="tx-card-title">${title}</div>
      </div>`;
  }
}

/* ── GALERİ YÜKLE ── */
export async function loadTransformationCards() {
  const grid = document.getElementById('cards-grid-wrap');
  if (!grid) return;
  grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:40px 0;">' + t('ui.preparing') + '</div>';

  try {
    const { data, error } = await sb
      .from('transformation_cards')
      .select('*')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data?.length) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:40px 0;">' + t('ui.no_cards', 'Henüz kart yok. İlk konuşmanı tamamla.') + '</div>';
      return;
    }

    // Kart verilerini güvenli şekilde sakla (XSS koruması)
    window._cardCache = data;
    grid.innerHTML = data.map((card, idx) => {
      const dStr = new Date(card.created_at).toLocaleDateString(getCurrentLanguage() || 'tr', { day: 'numeric', month: 'long' });
      const safeTitle = escapeHTML(card.title || '');
      if (card.image_url) {
        return `<div class="tx-card" onclick="openCardDetail(window._cardCache[${idx}])">
          <img src="${card.image_url.replace(/"/g,'&quot;')}" alt="${safeTitle}" loading="lazy">
          <div class="tx-card-overlay">
            <div class="tx-card-date">${dStr}</div>
            <div class="tx-card-title">${safeTitle}</div>
          </div>
        </div>`;
      } else {
        return `<div class="tx-card" style="background:var(--bg-raised);" onclick="openCardDetail(window._cardCache[${idx}])">
          <div class="tx-card-overlay" style="background:linear-gradient(to top,rgba(0,0,0,0.9) 0%,rgba(0,0,0,0.4) 100%);top:0;">
            <div class="tx-card-date">${dStr}</div>
            <div class="tx-card-title">${safeTitle}</div>
          </div>
        </div>`;
      }
    }).join('');
  } catch (e) {
    console.error('loadTransformationCards hatası:', e);
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;color:var(--red);">' + t('ui.loading_failed') + '</div>';
  }
}

/* ── KART DETAY ── */
export function openCardDetail(card) {
  if (typeof card === 'string') {
    try { card = JSON.parse(card); } catch { return; }
  }
  _currentDetailCard = card;
  const dStr = new Date(card.created_at).toLocaleDateString(getCurrentLanguage() || 'tr', { day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('card-detail-date').textContent    = dStr;
  document.getElementById('card-detail-title').textContent   = card.title   || '';
  document.getElementById('card-detail-summary').textContent = card.summary || '';
  const img = document.getElementById('card-detail-img');
  if (card.image_url) {
    img.src   = card.image_url;
    img.style.display = 'block';
  } else {
    img.style.display = 'none';
  }
  document.getElementById('card-detail-overlay').classList.add('open');
}

export async function shareTransformationCard() {
  if (!_currentDetailCard) return;
  const card = _currentDetailCard;
  const shareText = `"${card.title}"

${card.summary || ''}

— Emre the Wanderer`;

  if (card.image_url && navigator.share && navigator.canShare) {
    try {
      // Görseli fetch et → Blob → File
      const res  = await fetch(card.image_url);
      const blob = await res.blob();
      const file = new File([blob], 'donusum-karti.png', { type: blob.type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: card.title, text: shareText });
        return;
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }

  // Yedek: metin paylaş veya kopyala
  if (navigator.share) {
    try { await navigator.share({ title: card.title, text: shareText }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(shareText);
    showToast(t('toast.card_copied'));
  } catch { showToast(t('toast.share_failed'), true); }
}

/* ── saveTogetherKey: Admin panel fonksiyonu ── */
