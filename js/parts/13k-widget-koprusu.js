/* ═══════════════════════════════════════════════════════════════════
   13k — WIDGET KÖPRÜSÜ · Ana ekran widget'ına veri yazar (native)
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Push'tan sonraki en güçlü geri çağırma: seri halkası + Günün Mührü
     uygulama AÇILMADAN ana ekranda görünür. Zincir gözün önündeyse
     kırmak zorlaşır (tutarlılık + kayıptan kaçınma).

   MEKANİK: @capacitor/preferences ile platforma özel paylaşımlı alana
     tek JSON yazılır (anahtar: 'widget'):
       iOS  → App Group  'group.com.emretransformation.wanderer'
       And. → SharedPreferences dosyası 'WandererWidget'
     Native widget iskeletleri: native-widgets/ + SETUP-WIDGET.md (ELLE).

   VERİ: { streak, sealedToday, soz, sozCount, kept, reckoned,
           geldin, gordun, yaptin, elmas, name, updatedAt }
   (geldin/gordun/yaptin = Üç Mühür gün durumu — 10f Yol dili:
    GELDİN=bugün buradaydın · GÖRDÜN=bugün hayaline baktın ·
    YAPTIN=sözünün hesabını verdin ve en az birini tuttun)
   SENKRON ANLARI: post-auth init · uygulama arka plana geçerken ·
     10 dakikalık nabız · window.wkSync() (törenler sonrası çağrılabilir).
   Web'de sessiz no-op. Konvansiyon: hardcoded TR; window.wk* expose.
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { getActivityDays, localISODate } from './00a-infrastructure.js';

const IOS_GROUP = 'group.com.emretransformation.wanderer';
const ANDROID_GROUP = 'WandererWidget';

let _prefs = null;        // lazy @capacitor/preferences modülü
let _configured = false;

function _isNative() {
  try { return !!window.Capacitor?.isNativePlatform?.(); } catch (_) { return false; }
}
function _platform() {
  try { return window.Capacitor?.getPlatform?.() || 'web'; } catch (_) { return 'web'; }
}

async function _getPrefs() {
  if (_prefs) return _prefs;
  try {
    const m = await import('@capacitor/preferences');
    _prefs = m.Preferences;
    if (!_configured) {
      await _prefs.configure({ group: _platform() === 'ios' ? IOS_GROUP : ANDROID_GROUP });
      _configured = true;
    }
  } catch (_) { _prefs = null; }
  return _prefs;
}

function _dayKey() {
  return localISODate();
}

function _snapshot() {
  const today = _dayKey();
  let streak = 0;
  try { if (window.recomputeStreakUI) streak = window.recomputeStreakUI() | 0; } catch (_) {}
  let sealedToday = false;
  try { sealedToday = !!(S._seriMuhru && S._seriMuhru.lastSealedDay === today); } catch (_) {}
  let soz = null, sozCount = 0, kept = 0, reckoned = false;
  try {
    const r = S._gunlukRitus;
    if (r && r.date === today && Array.isArray(r.pledges) && r.pledges.length) {
      sozCount = r.pledges.length;
      soz = (r.pledges[0] && r.pledges[0].text) || null;
      reckoned = !!r.reckoned;
      kept = r.pledges.filter(p => p && p.kept).length;
    }
  } catch (_) {}
  let elmas = 0;
  try { elmas = (S._wandererGame && S._wandererGame.elmas) || 0; } catch (_) {}
  // Üç Mühür gün durumu (10f Yol dili) — widget'ta günün üç vuruşu
  let geldin = false, gordun = false;
  try { geldin = getActivityDays().includes(today); } catch (_) {}
  try { gordun = !!(window.usGetTodayVision && window.usGetTodayVision()); } catch (_) {}
  const yaptin = reckoned && kept > 0;
  const u = S.currentUser;
  const name = (u && (u.name || (u.user_metadata && u.user_metadata.name))) || 'Gezgin';
  return { streak, sealedToday, soz, sozCount, kept, reckoned, geldin, gordun, yaptin, elmas, name, updatedAt: Date.now() };
}

/** Paylaşımlı alana güncel veriyi yaz + (Android) widget'ları tazele. */
export async function wkSync() {
  if (!_isNative()) return false;
  const P = await _getPrefs();
  if (!P) return false;
  try {
    await P.set({ key: 'widget', value: JSON.stringify(_snapshot()) });
    // iOS: WidgetKit zaman çizelgesini tazele (eklenti köprüsü varsa)
    try { window.Capacitor?.Plugins?.WidgetsBridgePlugin?.reloadAllTimelines?.(); } catch (_) {}
    return true;
  } catch (e) { console.warn('wkSync:', e && e.message); return false; }
}

export function wkInit() {
  if (!_isNative()) return;
  // İlk senkron (state hidrasyonu otursun)
  setTimeout(() => { wkSync(); }, 4000);
  // Arka plana geçiş — widget'ın en kritik anı
  document.addEventListener('visibilitychange', () => { if (document.hidden) wkSync(); });
  // Nabız
  setInterval(() => { if (!document.hidden) wkSync(); }, 10 * 60 * 1000);
}

/* ── window expose ── */
if (typeof window !== 'undefined') {
  window.wkSync = wkSync;
  window.wkInit = wkInit;
}
