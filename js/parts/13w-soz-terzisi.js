/* ═══════════════════════════════════════════════════════
   13w — SÖZ TERZİSİ · yarının sözü gece dokunur
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Banka sözü doğru yere değer, yuvalı söz gerçek hayata dokunur — ama
     en kişisel cümle, kullanıcının kendi verisinden o gün için yazılandır.
     Bunu sabah pop-up'ında yapmak töreni bekletirdi; oysa tören beklemez.
     Bu yüzden söz GECE dokunur: akşam ya da boşta bir an, yarının üç sözü
     yazılır ve saklanır. Sabah perde açıldığında dokuma zaten oradadır.
     Dokuma yoksa kimse fark etmez — banka hazır bekler. Mesele Sensin.
   MEKANİK / MİMARİ / TEK GİRİŞ:
     stDokuMaybe() tek giriş: koşullar uygunsa `soz-terzisi` edge fonksiyonuna
     (kullanıcının sohbet kotasına DOKUNMAZ; kendi günlük tavanı vardır)
     türetilmiş sinyalleri gönderir → yarının gün anahtarıyla saklar.
     stOku(gunAnahtari) 10s'in tek okuma yüzeyidir.
   Kalıcılık: SafeStorage per-uid (etw_soz_terzi_v1_<uid>) — tek gün taşır
   Konvansiyon: window.st* expose; ağ hatası SESSİZ (asla bloklama, asla toast)
═══════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { sb } from '../config.js';
import { SafeStorage, localISODate } from './00a-infrastructure.js';

const STORAGE_KEY = 'etw_soz_terzi_v1';
const ALANLAR = ['bireysel', 'iliski', 'is'];

/* Kalite kapısı — sunucudakinin İKİZİ. Model iki tarafta da güvenilmez
   sayılır: sunucu elese bile istemci son kapıdır (eski cache, elle
   kurcalanmış depo, sürüm farkı). */
const SOZ_MAX_KARAKTER = 64;
const SOZ_MIN_KARAKTER = 8;

/* Dokuma yalnız akşam/gece denenir — sabahın kendi töreni varken ağ
   trafiği açmayız. 18:00 sonrası yarın için dokunur. */
const DOKUMA_SAATI = 18;

function _uid() { return (S.currentUser && S.currentUser.id) || 'anon'; }
function _key() { return `${STORAGE_KEY}_${_uid()}`; }

function _yarin() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return localISODate(d);
}

/* ── Kalıcılık ── */
function _oku() {
  try {
    const d = SafeStorage.get(_key());
    return (d && typeof d === 'object') ? d : null;
  } catch (_) { return null; }
}
function _yaz(gun, sozler) {
  try { SafeStorage.set(_key(), { day: gun, sozler, wovenAt: new Date().toISOString() }); }
  catch (e) { console.warn('stYaz:', e && e.message); }
}

/** Tek sözün geçerliliği — sunucu kapısının aynısı. */
function _gecerliSoz(metin, dil) {
  const s = String(metin || '').trim();
  if (s.length < SOZ_MIN_KARAKTER || s.length > SOZ_MAX_KARAKTER) return false;
  if (/[?!]/.test(s)) return false;
  if ((s.match(/[.]/g) || []).length > 1) return false;
  if (/[{}[\]]/.test(s)) return false;
  return dil === 'en'
    ? /\bi (will|['’]ll)\b/i.test(s)
    : /(acağım|eceğim|acagim|ecegim)\b/i.test(s);
}

/**
 * Belirli bir gün için dokunmuş sözler. 10s'in TEK okuma yüzeyi.
 * @returns {Object|null} {alan: metin} — yoksa null (banka devreye girer)
 */
export function stOku(gun) {
  try {
    const kayit = _oku();
    if (!kayit || kayit.day !== gun || !kayit.sozler) return null;
    const dil = S._currentLang === 'en' ? 'en' : 'tr';
    const temiz = {};
    ALANLAR.forEach(a => {
      const m = kayit.sozler[a];
      if (m && _gecerliSoz(m, dil)) temiz[a] = String(m).trim();
    });
    return Object.keys(temiz).length ? temiz : null;
  } catch (_) { return null; }
}

/** Bugün için dokunmuş söz var mı? (10s bunu sorar) */
export function stBugun() {
  return stOku(localISODate());
}

/* ── Dokuma ── */
let _dokunuyor = false;

/** Motorun (13v) türettiği sinyalleri fonksiyona gidecek biçime çevirir. */
function _alanlariTopla() {
  const out = [];
  // Motor üç alanı tek geçişte verir — alan alan çağırmaya gerek yok.
  let hepsi = {};
  try { hepsi = window.ihNeedAll?.() || {}; } catch (_) {}
  ALANLAR.forEach(alan => {
    let mertebe = 'adim', kisi = null, olay = null;
    const need = hepsi[alan] || null;
    try { mertebe = window.sdMertebe?.(alan) || 'adim'; } catch (_) {}
    try { kisi = window.ihKisi?.(alan) || null; } catch (_) {}
    try { olay = window.ihOlay?.(alan) || null; } catch (_) {}
    out.push({
      alan,
      eksen: (need && need.eksen) || 'default',
      mertebe,
      ...(kisi ? { kisi } : {}),
      ...(olay ? { olay } : {}),
    });
  });
  return out;
}

/** Tekrar önleme listesi — defterdeki son sözlerin METİNLERİ. */
function _sonSozler() {
  try {
    return (window.sdSonSozler?.(8) || []).map(s => s && s.text).filter(Boolean);
  } catch (_) { return []; }
}

/**
 * Koşullar uygunsa YARININ sözlerini dokur. Tek giriş noktası.
 * Sessizdir: hata olursa kullanıcı hiçbir şey görmez, banka zaten hazırdır.
 * @param {boolean} force saat/gün kapılarını atla (test ve elle tetik için)
 */
export async function stDokuMaybe(force) {
  if (_dokunuyor) return false;
  try {
    if (!S.currentUser || !S.currentUser.id) return false;         // anon dokunmaz
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
    if (!force && new Date().getHours() < DOKUMA_SAATI) return false;

    const gun = _yarin();
    const mevcut = _oku();
    if (mevcut && mevcut.day === gun) return false;                 // yarın zaten dokunmuş

    if (!sb || !sb.functions) return false;

    _dokunuyor = true;
    const { data, error } = await sb.functions.invoke('soz-terzisi', {
      body: {
        dil: S._currentLang === 'en' ? 'en' : 'tr',
        alanlar: _alanlariTopla(),
        sonSozler: _sonSozler(),
      },
    });
    if (error || !data || !data.ok || !data.sozler) return false;

    const dil = S._currentLang === 'en' ? 'en' : 'tr';
    const temiz = {};
    ALANLAR.forEach(a => {
      const m = data.sozler[a];
      if (m && _gecerliSoz(m, dil)) temiz[a] = String(m).trim();
    });
    if (!Object.keys(temiz).length) return false;                   // hepsi elendi → banka

    _yaz(gun, temiz);
    return true;
  } catch (e) {
    // Sessiz düşüş: Terzi bir lükstür, tören onsuz da tamdır.
    console.warn('stDokuMaybe:', e && e.message);
    return false;
  } finally {
    _dokunuyor = false;
  }
}

/**
 * Post-auth init. Dokumayı hemen denemez — açılış anı törenlerin;
 * bir süre sonra ve sekme arka plandan döndüğünde sessizce yoklar.
 */
export function stInit() {
  try {
    setTimeout(() => { stDokuMaybe(false); }, 90000);   // ~1.5 dk sonra ilk yoklama
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => { stDokuMaybe(false); }, 4000);
      }
    });
  } catch (_) {}
}

/* ── window expose (TDZ-güvenli, minify-dayanıklı) ── */
if (typeof window !== 'undefined') {
  window.stOku = stOku;
  window.stBugun = stBugun;
  window.stDokuMaybe = stDokuMaybe;
  window.stInit = stInit;
}
