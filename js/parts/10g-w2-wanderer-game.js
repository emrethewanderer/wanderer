/* ═══════════════════════════════════════════════════════════════════
   10g — WANDERER OYUNU (Eşsiz oyunlaştırma katmanı)
   ───────────────────────────────────────────────────────────────────
   FELSEFE: "İlişkide mesele o değil, sensin.
             Olduğun kişiye göre bir birlikteliğin olur."

   Klasik oyunlaştırma "yapmaya" devam ettirir (streak, puan, rozet).
   Wanderer oyunlaştırması "olmaya" geçiş yaptırır.

   3 ANA MEKANİK:
     1) AYNA KARTI         — "Bugün ___ bir kişiyim" + "Olmak istediğin"
     2) DUYURU KANALLARI   — Duyuru alt-sayfası (Emre'nin manuel duyurusu, "Anladım")
                             + Kitaplık alt-sayfası (yeni içerik → otomatik); ikisi de alttan kayar
     3) DAVRANIŞ KANITI    — Her gece tek soru → Elmas birikir

   YENİ STATE (state/w2.js):
     S._wandererGame = {
       elmas, davranisKanitlari[], ayna{}, tanikMode{}
     }

   YARDIMCILAR (mevcut altyapı):
     - S._personTransition (current.description, desired.description)
     - S._depthProfile     (4 ayna skoru)
     - S._foundationsProfile (5 temel skoru)
     - S._choiceTracking   (new_person vs old_person seçimleri)
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { sb, EMRE_IMG } from '../config.js';
import { SafeStorage, showToast, recordActivityDay, localISODate } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { dfGetActiveFoundationTarget } from './09b-depth-foundations.js';

const TODAY = () => localISODate();
const NOW = () => new Date().toISOString();

/* Dile duyarlı locale (toLocaleX için) */
const _locale = () => (S._currentLang === 'tr' ? 'tr-TR' : 'en-US');

/* ══════════════════════════════════════════════════════════════
   PERSISTENCE — localStorage yedeği (Supabase opsiyonel sonra)
══════════════════════════════════════════════════════════════ */
const STORAGE_KEY = 'etw_wanderer_game_v1';
// Konvansiyon: per-uid anahtar (10j/10i ile aynı). Eski global anahtar
// (uid'siz) bir kez benimsenir, sonra per-uid'e yazılır.
const _wgKey = () => `${STORAGE_KEY}_${S.currentUser?.id || 'anon'}`;

export function wgSave() {
  try {
    SafeStorage.setRaw(_wgKey(), JSON.stringify(S._wandererGame));
  } catch (e) { console.warn('wgSave:', e?.message); }
}

export function wgLoad() {
  try {
    const raw = SafeStorage.getRaw(_wgKey()) || SafeStorage.getRaw(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      Object.assign(S._wandererGame, parsed);
    }
  } catch (e) { console.warn('wgLoad:', e?.message); }
}

/* ══════════════════════════════════════════════════════════════
   1) AYNA KARTI — "Bugün hangi kişiyim?"
   ───────────────────────────────────────────────────────────
   Felsefenin kalbi: ARKADAKİ SEN, HAYATTAKİ SEN'i izler.
   Bu kart günde bir görünür ve kullanıcıya hatırlatır:
   "Sen şu an ___ bir kişisin. Olmak istediğin: ___ bir kişi."
══════════════════════════════════════════════════════════════ */

export function renderAynaCard() {
  const card = document.getElementById('ayna-card');
  if (!card) return;

  const pt = S._personTransition || {};
  const current = pt?.current?.description?.trim();
  const desired = window.oikGetDesired?.()?.name || pt?.desired?.description?.trim();

  const currentEl = document.getElementById('ayna-current');
  const desiredEl = document.getElementById('ayna-desired');
  if (currentEl) currentEl.textContent = current
    ? t('wg.ayna.current').replace('{x}', current)
    : t('wg.ayna.current_empty');
  if (desiredEl) desiredEl.textContent = desired
    ? t('wg.ayna.desired').replace('{x}', desired)
    : t('wg.ayna.desired_empty');

  // Geçiş metresi — derinlik + temeller skorlarından
  const fill = document.getElementById('ayna-meter-fill');
  if (fill) {
    const score = computeTransitionScore();
    fill.style.width = score + '%';
    fill.setAttribute('data-score', score);
  }

  // Elmas
  const elmasEl = document.getElementById('ayna-elmas');
  if (elmasEl) elmasEl.textContent = (S._wandererGame?.elmas || 0).toLocaleString(_locale());
}

/* Günde bir kez "aynaya bakma" — render'dan ayrı, açık niyetli mutasyon.
   Bugün ekranı yüklendiğinde bir kez çağrılır (10-features-w2). */
export function aynaReflectToday() {
  const todayStamp = TODAY();
  if (S._wandererGame.ayna.todayReflectedAt === todayStamp) return false;
  S._wandererGame.ayna.todayReflectedAt = todayStamp;
  S._wandererGame.ayna.transitionSpark += 1;
  awardElmas(1, 'ayna-bakti'); // küçük ödül: aynaya bakmak
  /* DEFTERE YAZMAZ (karar: "emek sayar, bakış saymaz", 2026-08-19).
     Buradan bir zamanlar recordActivityDay() çağrılıyordu: Bugün ekranı
     yüklenince otomatik koşan bu fonksiyon, ekranı AÇMAYI emek sayıp
     seriyi şişiriyordu — sözünü veren kullanıcının günü sayılmazken.
     Seri artık yalnız tamamlanan ritüellerden beslenir; geçmiş defter
     satırları silinmedi, karar bugünden ileri işler. */
  wgSave();
  try { window.usCheckHayalDay?.(); } catch (_) {} // Hayal Mührü serisini besle (Ayna ayağı)
  return true;
}

/**
 * 0-100 arası geçiş skoru.
 * 4 ayna (derinlik) + 5 temel skorlarının ortalaması.
 */
export function computeTransitionScore() {
  const dp = S._depthProfile || {};
  const fp = S._foundationsProfile || {};
  const scores = [];
  for (const k of Object.keys(dp)) {
    const obj = dp[k];
    if (obj && typeof obj.score === 'number' && obj.signals_count >= 1) scores.push(obj.score);
  }
  for (const k of Object.keys(fp)) {
    const obj = fp[k];
    if (obj && typeof obj.score === 'number' && obj.signals_count >= 1) scores.push(obj.score);
  }
  if (!scores.length) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/* ══════════════════════════════════════════════════════════════
   2) İKİ AYRI DUYURU KANALI — İKİSİ DE ALTTAN KAYAN SAYFA (portal)
   ───────────────────────────────────────────────────────────
   A) DUYURU ALT-SAYFASI (#announce-sheet-portal) — Emre admin "Duyuru"dan
      bir mesaj gönderince alttan kayan sayfa olarak belirir; "Anladım" ile
      kapanır. Portal body'ye eklenir → hangi ekrandaysa (Bugün / Wanderer)
      onun üstüne biner. Sürüm (updated_at) per-uid damgayla kıyaslanır →
      her yeni mesaj herkese tekrar gösterilir.
        · checkAdminAnnouncement() → yeni mesaj varsa announceSheetOpen()
        · announceAck()            → kapat + damgala
        · renderLibraryBannerAdmin/saveLibraryBanner → admin

   B) KİTAPLIK ALT-SAYFASI — Kitaplığa yeni içerik eklenince OTOMATİK
      alttan kayan sayfa açılır (altın/kitap kimliği). Manuel tetik yok.
        · checkLibraryUpdate() → yeni içerik varsa libSheetOpen()
        · markLibrarySeen()    → damgala + sayfayı kapat
        · libraryUpdateGo()    → Kitaplığı aç
   İkisi ortak _sheetBlocked() ile birbirini de engeller (üst üste binmez).
   (Vasıta uyarısı prompt katmanında — 09b/16b — ayrıca korunur.)
══════════════════════════════════════════════════════════════ */

const _libEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

/* ── A) DUYURU ALT-SAYFASI — Emre'nin manuel mesajı, alttan kayan sayfa ──
   Eski inline bandlar (#announce-banner / #llm-announce) emekli; duyuru artık
   Kitaplık alt-sayfası gibi alttan kayan bir portal (position:fixed) →
   hangi ekrandaysa (Bugün / Wanderer) onun üstüne biner. Tek yüzey, tek
   damga; ücretsiz kullanıcı ön yüzde kalsa da görür. */

const _announceSeenKey = () => `etw_announce_seen_${S.currentUser?.id || 'anon'}`;
let _announceRetries = 0;

/** Bugün / Wanderer yüklenince: admin aktif bir duyuru yazdıysa ve kullanıcı
 *  bu sürümü daha önce kapatmadıysa alttan duyuru sayfasını açar. */
export async function checkAdminAnnouncement() {
  if (document.getElementById('announce-sheet-portal')) return; // zaten açık

  let cfg = null;
  try {
    const { data } = await sb
      .from('library_announcement')
      .select('header_text,active,updated_at')
      .eq('id', 1).maybeSingle();
    cfg = data;
  } catch (e) { console.warn('checkAdminAnnouncement:', e?.message); return; }

  const msg = (cfg?.header_text || '').trim();
  if (!cfg || cfg.active === false || !msg) return;

  // Bu sürümü daha önce kapattı mı? (ISO string → leksikografik kıyas)
  const version = cfg.updated_at || '';
  const seen = SafeStorage.getRaw(_announceSeenKey());
  if (seen && version && seen >= version) return;

  S._announceVersion = version;
  S._announceMsg = msg;

  // Tören/akış/başka sayfa çakışmasını önle; engelliyse kısa süre sonra tekrar dene.
  if (_sheetBlocked()) {
    if (_announceRetries < 4) { _announceRetries++; setTimeout(() => checkAdminAnnouncement(), 3500); }
    return;
  }
  _announceRetries = 0;
  announceSheetOpen();
}

export function announceSheetOpen() {
  if (document.getElementById('announce-sheet-portal')) return;
  const msg = S._announceMsg || '';
  if (!msg) return;

  const portal = document.createElement('div');
  portal.id = 'announce-sheet-portal';
  portal.className = 'announce-sheet-portal';
  portal.innerHTML = `
    <div class="announce-sheet-veil"></div>
    <div class="announce-sheet" role="dialog" aria-modal="true" aria-label="${_libEsc(t('wg.announce.aria'))}"><div class="wn-grain">
      <div class="announce-sheet-grip" aria-hidden="true"></div>
      <button class="announce-sheet-close" aria-label="${_libEsc(t('wg.close'))}">✕</button>
      <img class="announce-sheet-seal" src="${EMRE_IMG}" alt="" aria-hidden="true" draggable="false">
      <div class="announce-sheet-kicker">${t('wg.announce.kicker')}</div>
      <div class="announce-sheet-text">${_libEsc(msg)}</div>
      <div class="announce-sheet-sign">${t('wg.announce.sign')}</div>
      <button class="announce-sheet-cta" type="button">${t('wg.announce.cta')}</button>
    </div></div>`;
  document.body.appendChild(portal);

  try { window.fxCue?.('whoosh'); } catch (_) {}

  portal.querySelector('.announce-sheet-veil')?.addEventListener('click', announceAck);
  portal.querySelector('.announce-sheet-close')?.addEventListener('click', announceAck);
  portal.querySelector('.announce-sheet-cta')?.addEventListener('click', announceAck);

  // Erişim: Esc ile kapat + açılışta CTA'ya odak (Prensip 9)
  const onKey = (e) => { if (e.key === 'Escape') announceAck(); };
  document.addEventListener('keydown', onKey);
  portal._onKey = onKey;
  setTimeout(() => portal.querySelector('.announce-sheet-cta')?.focus(), 60);
}

/** "Anladım" / dışarı dokun — sayfayı kapat ve bu sürümü görüldü damgala. */
export function announceAck() {
  try {
    SafeStorage.setRaw(_announceSeenKey(), S._announceVersion || new Date().toISOString());
  } catch (_) {}
  const portal = document.getElementById('announce-sheet-portal');
  if (portal) _announceSheetClose(portal);
}

function _announceSheetClose(portal) {
  if (portal?._onKey) { document.removeEventListener('keydown', portal._onKey); portal._onKey = null; }
  const sheet = portal?.querySelector('.announce-sheet');
  if (!sheet) { portal?.remove(); return; }
  sheet.classList.add('announce-sheet--out');
  setTimeout(() => portal?.remove(), 340);
}

/* ── B) KİTAPLIK ALT-SAYFASI — yeni içerik → otomatik bottom sheet ── */

const _librarySeenKey = () => `etw_library_seen_${S.currentUser?.id || 'anon'}`;
let _libRetries = 0;

/** En son görülen içerik created_at damgasını kaydeder; sayfayı kapatır. */
export function markLibrarySeen(latestCreatedAt) {
  if (latestCreatedAt) {
    try { SafeStorage.setRaw(_librarySeenKey(), latestCreatedAt); } catch (_) {}
  }
  S._libraryNewItems = [];
  const portal = document.getElementById('lib-sheet-portal');
  if (portal) _libSheetClose(portal);
}

/** Başka tam-ekran akış (tören/onboarding/splash) ya da BAŞKA bir alt-sayfa
 *  açıkken yeni sayfa açma. Duyuru + Kitaplık sayfaları ortak kullanır ve
 *  birbirini de engeller (ikisi üst üste binmesin; engellenen kısa süre
 *  sonra tekrar dener → öteki kapanınca açılır). */
function _sheetBlocked() {
  if (document.getElementById('at-portal') || document.getElementById('gl-portal') || document.getElementById('sm-portal')) return true;
  if (document.getElementById('onb-ritual') || document.querySelector('.sc-onb')) return true;
  if (document.getElementById('wn-splash')?.classList.contains('show')) return true;
  if (document.querySelector('.fgate-overlay, .fgate-doors')) return true;
  if (document.getElementById('announce-sheet-portal') || document.getElementById('lib-sheet-portal')) return true;
  const active = document.querySelector('.view.active');
  if (active && active.id !== 'bugun-view' && active.id !== 'chat-view') return true;
  return false;
}

/** Bugün yüklenince koşar: Kitaplığa yeni içerik eklendiyse OTOMATİK sayfa açar. */
export async function checkLibraryUpdate() {
  if (document.getElementById('lib-sheet-portal')) return; // zaten açık

  let items = [];
  try {
    const { data, error } = await sb
      .from('knowledge_base')
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    items = data || [];
  } catch (e) { console.warn('checkLibraryUpdate:', e?.message); return; }

  if (!items.length) return;

  const latest  = items[0].created_at;
  const seenRaw = SafeStorage.getRaw(_librarySeenKey());

  // İlk kez: mevcut içerik sessizce "görüldü" — eski yazılar için sayfa açılmaz.
  if (!seenRaw) { try { SafeStorage.setRaw(_librarySeenKey(), latest); } catch (_) {} return; }

  const newItems = items.filter(it => it.created_at > seenRaw);
  if (!newItems.length) return;

  S._libraryNewItems = newItems;

  // Tören/akış/başka sayfa çakışmasını önle; engelliyse kısa süre sonra tekrar dene.
  if (_sheetBlocked()) {
    if (_libRetries < 4) { _libRetries++; setTimeout(() => checkLibraryUpdate(), 3500); }
    return;
  }
  _libRetries = 0;
  libSheetOpen();
}

const _BOOK_SVG = `<svg viewBox="0 0 64 64" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M32 18C26 13.5 16.5 13.5 11 15.5V47C16.5 45 26 45 32 49.5"/>
  <path d="M32 18C38 13.5 47.5 13.5 53 15.5V47C47.5 45 38 45 32 49.5"/>
  <line x1="32" y1="18" x2="32" y2="49.5"/>
</svg>`;

export function libSheetOpen() {
  if (document.getElementById('lib-sheet-portal')) return;

  const newItems = S._libraryNewItems || [];
  const count    = newItems.length;
  const title    = count === 1 ? t('wg.lib.title_one') : t('wg.lib.title_many').replace('{n}', count);
  const sub      = count === 1 ? t('wg.lib.sub_one') : t('wg.lib.sub_many');

  const itemsHTML = count
    ? `<div class="lib-sheet-items">${
        newItems.slice(0, 6).map(it =>
          `<div class="lib-sheet-item"><span class="lib-sheet-item-spine"></span><span class="lib-sheet-item-t">${_libEsc(it.title || t('wg.untitled'))}</span></div>`
        ).join('')
      }${count > 6
        ? `<div class="lib-sheet-item" style="justify-content:center;"><span class="lib-sheet-item-t" style="color:var(--text-dim);font-style:italic;">${_libEsc(t('wg.lib.more').replace('{n}', count - 6))}</span></div>`
        : ''
      }</div>`
    : '';

  const portal = document.createElement('div');
  portal.id = 'lib-sheet-portal';
  portal.className = 'lib-sheet-portal';
  portal.innerHTML = `
    <div class="lib-sheet-veil"></div>
    <div class="lib-sheet" role="dialog" aria-modal="true" aria-label="${_libEsc(t('wg.lib.aria'))}">
      <div class="lib-sheet-grip" aria-hidden="true"></div>
      <button class="lib-sheet-close" aria-label="${_libEsc(t('wg.close'))}">✕</button>
      <div class="lib-sheet-kicker">${t('wg.lib.kicker')}</div>
      <div class="lib-sheet-icon" aria-hidden="true">${_BOOK_SVG}</div>
      <div class="lib-sheet-title">${_libEsc(title)}</div>
      <div class="lib-sheet-sub">${_libEsc(sub)}</div>
      ${itemsHTML}
      <button class="lib-sheet-cta" type="button">${t('wg.lib.cta')}</button>
    </div>`;
  document.body.appendChild(portal);

  try { window.fxCue?.('whoosh'); } catch (_) {}

  const dismiss = () => markLibrarySeen(newItems[0]?.created_at);
  portal.querySelector('.lib-sheet-veil')?.addEventListener('click', dismiss);
  portal.querySelector('.lib-sheet-close')?.addEventListener('click', dismiss);
  portal.querySelector('.lib-sheet-cta')?.addEventListener('click', () => libraryUpdateGo());
}

function _libSheetClose(portal) {
  const sheet = portal?.querySelector('.lib-sheet');
  if (!sheet) { portal?.remove(); return; }
  sheet.classList.add('lib-sheet--out');
  setTimeout(() => portal?.remove(), 340);
}

/** Sayfa CTA'sından: damgayı güncelle ve Kitaplığı aç. */
export function libraryUpdateGo() {
  const latest = S._libraryNewItems?.[0]?.created_at;
  markLibrarySeen(latest);
  libOpenReader(0);
}

/* ══════════════════════════════════════════════════════════════
   KİTAPLIK OKUR — 12 Mühür iç tasarımı (mr-* sınıfları yeniden
   kullanılır). Tek kart + ÖNCEKİ/SONRAKİ navigasyonu; yazılar
   tarihe göre sıralı (en yeni başta). Drawer'daki kitap düğmesi
   ve içerikli kartlar buraya bağlanır.
══════════════════════════════════════════════════════════════ */
const _BOOK_SIGIL_BG = `<svg class="mr-sigil-bg" width="90" height="90" viewBox="0 0 100 100" aria-hidden="true">
  <path d="M50 26 C42 20 26 20 18 22 V72 C26 70 42 70 50 76" fill="none" stroke="var(--gold)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M50 26 C58 20 74 20 82 22 V72 C74 70 58 70 50 76" fill="none" stroke="var(--gold)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="50" y1="26" x2="50" y2="76" stroke="var(--gold)" stroke-width="1.2"/>
</svg>`;

function _libDateLabel(iso) {
  try {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString(_locale(), { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (_) { return ''; }
}

// Vurgu cümlesinden esnek-boşluklu, regex-güvenli bir kalıp kur. Toast'taki söz
// boşlukları sıkıştırılmış (\s+→' ') olduğundan kaynak metinde tek/çok boşluk veya
// satır kayması olsa da yakalanır. Sondaki "…" (kırpılmış fallback) atılır.
function _libHlRegex(hl) {
  const clean = String(hl || '').replace(/\s+/g, ' ').replace(/[…\s]+$/, '').trim();
  if (clean.length < 12) return null;                  // çok kısa → yanlış eşleşme riski
  const esc = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '[\\s]+');
  try { return new RegExp(esc, 'i'); } catch (_) { return null; }
}

// Ham metin satırında vurguyu ilk kez sararak escape'li HTML döndürür; bulunamazsa
// null. _hlState.done ile gövde boyunca tek sefer mühürlenir (tek kaydırma hedefi).
function _libWrapLine(line, re, hlState) {
  if (!re || hlState.done) return null;
  const m = re.exec(line);
  if (!m) return null;
  hlState.done = true;
  const a = line.slice(0, m.index);
  const hit = line.slice(m.index, m.index + m[0].length);
  const b = line.slice(m.index + m[0].length);
  return `${_libEsc(a)}<mark class="lib-hl">${_libEsc(hit)}</mark>${_libEsc(b)}`;
}

function _libBodyHTML(text, highlight) {
  const re = _libHlRegex(highlight);
  const hlState = { done: false };
  return String(text || '')
    .split(/\n{2,}/)
    .map(par => par.trim())
    .filter(Boolean)
    .map(par => {
      const html = par.split(/\n/)
        .map(line => _libWrapLine(line, re, hlState) ?? _libEsc(line))
        .join('<br>');
      return `<p>${html}</p>`;
    })
    .join('');
}

/** Kitaplık Okur'u aç. startIdx verilmezse en yeni yazı karşılar.
 *  S.knowledgeItems daha önce yüklenmediyse arka planda yükler. */
export async function libOpenReader(startIdx, highlight, onClose) {
  if (!S.knowledgeItems || !S.knowledgeItems.length) {
    try {
      const mod = await import('./07-settings-knowledge.js');
      if (mod && typeof mod.loadKnowledge === 'function') await mod.loadKnowledge();
    } catch (_) {}
  }
  const items = (S.knowledgeItems || []).slice().sort((a, b) =>
    String(b.created_at || '').localeCompare(String(a.created_at || ''))
  ); // DESC: en yeni başta
  if (!items.length) { showToast(t('wg.lib.empty')); return; }

  document.getElementById('lib-reader-portal')?.remove();
  const idx = Number.isInteger(startIdx)
    ? Math.max(0, Math.min(items.length - 1, startIdx))
    : 0;

  try { markLibrarySeen(items[0].created_at); } catch (_) {}

  const portal = document.createElement('div');
  portal.id = 'lib-reader-portal';
  portal.className = 'mr-portal';
  if (typeof onClose === 'function') portal._onClose = onClose;   // close() içinde tetiklenir
  document.body.appendChild(portal);

  _libRenderReader(portal, items, idx, false, highlight);
}

function _libRenderReader(portal, items, idx, animate, highlight) {
  const item = items[idx] || {};
  const total = items.length;
  const hasPrev = idx > 0;                 // daha yeni yazı yok (idx 0 = en yeni)
  const hasNext = idx < total - 1;         // bir sonrası daha eski yazı

  const title = item.title || t('wg.untitled');
  const dateStr = _libDateLabel(item.created_at);
  const bodyHTML = _libBodyHTML(item.content, highlight);

  /* GÜNÜN ALINTISI — kitabın kendi yüzeyinde, yazıların ÜSTÜNDE (Emre'nin
     kararı, 2026-08-12: ayrı bir ayraç/sayfa yerine buradaki yazılarla
     birleşsin). Kullanıcıyı tanıdığımızla seçilmiş bir cümle; dokununca
     geldiği yazıya gider ve o cümle işaretlenip ortalanır.
     Alıntı yoksa şerit hiç doğmaz — boş bir başlık asılı kalmaz. */
  const gununBlok = (() => {
    let pick = null;
    try { pick = libGununAlintisiHazirla(); } catch (_) {}
    if (!pick || !pick.soz) return '';
    return `<button class="lib-gunun" type="button" id="lib-gunun-btn"
        aria-label="${_libEsc(t('wg.soz.aria').replace('{soz}', pick.soz).replace('{title}', pick.title))}">
        <span class="lib-gunun-kicker">${_libEsc(t('wg.gunun.kicker', 'GÜNÜN ALINTISI'))}</span>
        <span class="lib-gunun-text">“${_libEsc(pick.soz)}”</span>
        <span class="lib-gunun-kaynak">${_libEsc(pick.title)}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>
        </span>
      </button>`;
  })();

  portal.innerHTML = `
    <div class="mr-scene mr-scene--lib${animate ? ' mr-scene--in' : ''}" role="dialog" aria-modal="true" aria-label="${_libEsc(t('wg.reader.aria').replace('{title}', title))}">
      <div class="mr-grain" aria-hidden="true"></div>
      <button class="mr-close" id="lib-reader-close" aria-label="${_libEsc(t('wg.close'))}">✕</button>
      <div class="mr-kicker">${t('wg.reader.kicker').replace('{n}', idx + 1).replace('{total}', total)}</div>
      ${gununBlok}

      <div class="mr-card mr-card--lib${animate ? ' mr-card--in' : ''}" id="lib-reader-card">
        ${_BOOK_SIGIL_BG}
        ${dateStr ? `<div class="mr-name-label">${_libEsc(dateStr.toLocaleUpperCase(_locale()))}</div>` : ''}
        <div class="mr-title">${_libEsc(title)}</div>
        <div class="mr-divider" aria-hidden="true"></div>
        <div class="mr-summary mr-summary--lib">${bodyHTML}</div>
        <button class="lib-share-btn" id="lib-reader-share" type="button" aria-label="${_libEsc(t('wg.reader.share_aria'))}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.6" y1="10.5" x2="15.4" y2="6.5"/>
            <line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/>
          </svg>
          <span>${t('wg.share')}</span>
        </button>
      </div>

      <div class="mr-detail-nav">
        <button class="mr-nav-btn${hasPrev ? '' : ' mr-nav-btn--disabled'}" id="lib-reader-prev" ${hasPrev ? '' : 'disabled aria-disabled="true"'}>${t('wg.reader.prev')}</button>
        <span class="mr-nav-pos">№ ${idx + 1}</span>
        <button class="mr-nav-btn${hasNext ? '' : ' mr-nav-btn--disabled'}" id="lib-reader-next" ${hasNext ? '' : 'disabled aria-disabled="true"'}>${t('wg.reader.next')}</button>
      </div>
    </div>`;

  const close = () => {
    if (portal._onKey) { document.removeEventListener('keydown', portal._onKey); portal._onKey = null; }
    portal.classList.add('mr-portal--out');
    const cb = portal._onClose; portal._onClose = null;     // tek-atış
    setTimeout(() => {
      try { portal.remove(); } catch (_) {}
      if (cb) { try { cb(); } catch (_) {} }                // kapanış animasyonu bittikten sonra
    }, 280);
  };

  function _goTo(newIdx) {
    const card = document.getElementById('lib-reader-card');
    const dir = newIdx > idx ? 1 : -1;
    if (card) {
      card.style.cssText = `opacity:0;transform:translateX(${dir * 18}px);transition:opacity .17s,transform .17s;`;
      setTimeout(() => _libRenderReader(portal, items, newIdx, true), 180);
    } else {
      _libRenderReader(portal, items, newIdx, false);
    }
  }

  /* Günün Alıntısı → cümlenin geldiği yazıya git ve orada işaretle.
     `_goTo` bilerek KULLANILMAZ: o geçişte highlight taşınmaz (ÖNCEKİ/
     SONRAKİ dolaşırken cümle sönmeli). Burada tersi isteniyor — okuyucu
     tam o cümleye gidiyor, bu yüzden render highlight'la çağrılır. */
  document.getElementById('lib-gunun-btn')?.addEventListener('click', () => {
    let pick = null;
    try { pick = libGununAlintisi(); } catch (_) {}
    if (!pick) return;
    const hedef = Math.max(0, Math.min(items.length - 1, pick.idx));
    _libRenderReader(portal, items, hedef, hedef !== idx, pick.soz);
  });

  document.getElementById('lib-reader-close')?.addEventListener('click', close);
  document.getElementById('lib-reader-prev')?.addEventListener('click', () => { if (hasPrev) _goTo(idx - 1); });
  document.getElementById('lib-reader-next')?.addEventListener('click', () => { if (hasNext) _goTo(idx + 1); });
  document.getElementById('lib-reader-share')?.addEventListener('click', () => {
    // Aktif yazının başlık + tarih + gövdesini 13g'ye verir; çoklu sayfa
    // gerekirse otomatik bölünür, son sayfada indirme bağlantısı ayakizi olur.
    const payload = {
      title:     item.title || t('wg.untitled'),
      body:      item.content || '',
      dateLabel: dateStr || '',
      kicker:    t('wg.lib.kicker_plain'),
    };
    try { window.shrShareArticle?.(payload); } catch (e) { console.warn('shrShareArticle:', e && e.message); }
  });

  if (portal._onKey) document.removeEventListener('keydown', portal._onKey);
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft' && hasPrev) _goTo(idx - 1);
    else if (e.key === 'ArrowRight' && hasNext) _goTo(idx + 1);
  };
  portal._onKey = onKey;
  document.addEventListener('keydown', onKey);

  // Toast'tan gelen alıntı: hedef yazıda o cümleyi ortala + geçici altın vurgu.
  // Yalnız ilk açılışta (highlight verilmişken); ÖNCEKİ/SONRAKİ ile geçildiğinde
  // highlight taşınmaz → mühür kendiliğinden sönümlenir.
  if (highlight) {
    const mark = portal.querySelector('.lib-hl');
    if (mark) {
      _ensureLibHlStyles();
      requestAnimationFrame(() => setTimeout(() => {
        try { mark.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        catch (_) { try { mark.scrollIntoView(); } catch (_) {} }
        mark.classList.add('lib-hl--flash');
        try { window.fxCue?.('tap'); } catch (_) {}
      }, animate ? 240 : 80));
    }
  }
}

// Geçici alıntı vurgusu — TASARIM-PRENSIPLERI uyumlu (yalnız token; altın hâle).
// Cümle önce nötr (arka plan yok), .lib-hl--flash ile bir kez parlar ve söner.
function _ensureLibHlStyles() {
  if (document.getElementById('lib-hl-styles')) return;
  const st = document.createElement('style');
  st.id = 'lib-hl-styles';
  st.textContent = `
  .lib-hl{border-radius:4px;padding:.02em .16em;margin:0 -.16em;background:transparent;color:inherit;
    box-decoration-break:clone;-webkit-box-decoration-break:clone;}
  .lib-hl--flash{animation:libHlReveal 2.9s var(--ease-out) both;}
  @keyframes libHlReveal{
    0%{background:transparent;box-shadow:none;color:inherit;}
    12%{background:var(--gold-dim);box-shadow:0 0 0 1px var(--gold-edge),0 0 16px var(--gold-glow);color:var(--text);}
    64%{background:var(--gold-dim);box-shadow:0 0 0 1px var(--gold-edge),0 0 12px var(--gold-glow);color:var(--text);}
    100%{background:transparent;box-shadow:none;color:inherit;}}
  @media (prefers-reduced-motion:reduce){
    .lib-hl--flash{animation:libHlRevealRM 2.6s ease both;}
    @keyframes libHlRevealRM{0%,78%{background:var(--gold-dim);color:var(--text);}100%{background:transparent;color:inherit;}}}`;
  document.head.appendChild(st);
}

/* window expose main.js'te (libOpenReader) — tüm çağıranlar runtime'da tetiklenir. */

/* ══════════════════════════════════════════════════════════════
   GÜNÜN ALINTISI — Kitaplık okurunun üstünde duran şerit
   ───────────────────────────────────────────────────────────────
   FELSEFE (Emre): Bir alıntı bir sohbet başlatıcısı DEĞİLDİR. Başlatıcı
   senin sorundur, alıntı Emre'nin cümlesidir; ikisi aynı şeridi paylaşınca
   alıntı bir öneri gibi görünürdü — bu yüzden başlatıcı şeridinden indi.
   2026-08-12'de yerini buldu: kendi kapısı da olmadı, KİTABIN kendi
   yüzeyiyle birleşti. Üstte bugünün cümlesi, altta yazıların.

   DERİN METAFOR: KAP (TASARIM-PRENSIPLERI §0.1 — Kitaplık zaten Kap'tır).
   İçeri alan çerçeve, tepeden inen ocak ışığı, kapalı sıcak yüzey. Şerit
   bir davet değil, açık bırakılmış bir sayfadır: dolu altın CTA yoktur,
   ok soluk durur. Yolculuğun aciliyeti burada bağırmaz.

   MEKANİK: Kullanıcıyı tanıdığımızla (en zayıf KANITLI temel + çekirdek
   mesele + Olduğun Kişi) ona bugün en çok değebilecek sözü CANLI KİTAPLIK
   yazılarından (S.knowledgeItems) seçer. Şeride dokunuş okuru o yazıya
   götürür, cümleyi `.lib-hl` ile işaretler ve ortalar. Tamamen
   istemci-tarafı: edge fonksiyonuna bağımlı değil. Alıntı yoksa şerit
   hiç doğmaz.
══════════════════════════════════════════════════════════════ */

// Temel (ihtiyaç) → Kitaplık'ta aranacak tema sözcükleri. Anahtarlar
// S._foundationsProfile ile aynı (10s GL_GIFTS ile paralel).
const _SOZ_THEMES = {
  oz_sevgi: ['kendine sevgi', 'şefkat', 'sevgi', 'merhamet', 'nazik', 'kabul', 'dost'],
  oz_saygi: ['saygı', 'sınır', 'hayır', 'onur', 'değer bil', 'kendine saygı'],
  oz_deger: ['değer', 'hak etmek', 'yeterli', 'kanıt', 'layık', 'özgüven', 'başarı'],
  oz_guven: ['güven', 'cesaret', 'korku', 'adım', 'risk', 'inan', 'kaygı'],
  bolluk:   ['bolluk', 'şükür', 'kıtlık', 'bereket', 'paylaş', 'minnet', 'yeter'],
};
const _SOZ_STOP = new Set(['için', 'gibi', 'daha', 'çünkü', 'ancak', 'olarak', 'kadar',
  'hala', 'bazı', 'şey', 'kendi', 'sonra', 'önce', 'hangi', 'değil', 'olan', 'çok']);

// DIL-MUAF: yukarıdaki durak sözcükleri TÜRKÇEDİR; karşılaştırma da TR
// kuralıyla küçültülmeli — en-US "İÇİN"i "i̇çin" yapıp eşleşmeyi kaçırırdı.
const _sozLc = s => String(s == null ? '' : s).toLocaleLowerCase('tr-TR');
// Günlük indeks — YYYYMMDD'den; rotasyon için stabil tamsayı.
function _sozDayIndex() { const n = parseInt(TODAY().replace(/-/g, ''), 10); return Number.isFinite(n) ? n : 0; }

function _sozWeakestFoundation() {
  /* ÖLÇÜM — yalnız KANITLI temeller yarışır (09b dfGetActiveFoundationTarget,
     signals_count kapılı). Eskiden kanıtsız temeller de 50 sayılıp yarışa
     giriyordu: hiç sinyal gelmemişken "en zayıf temelin bu" demek uydurmaydı
     ve günün sözü o uydurmadan seçiliyordu. */
  try {
    const hedef = dfGetActiveFoundationTarget();
    if (hedef?.key && _SOZ_THEMES[hedef.key]) return hedef.key;
  } catch (_) {}
  /* BEYAN — ölçüm yoksa kullanıcının onboarding'de kendi işaretlediği geçerlidir. */
  try { return S._onboardingRecommendation?.weakestKey || null; } catch (_) {}
  return null;
}

function _sozTokens(text, min = 4, max = 8) {
  const out = [], seen = new Set();
  _sozLc(text).split(/[^a-zçğıöşü0-9]+/i).forEach(w => {
    if (w.length >= min && !_SOZ_STOP.has(w) && !seen.has(w)) { seen.add(w); out.push(w); }
  });
  return out.slice(0, max);
}

// Kişi Motoru → aranacak anahtar kelimeler (lowercase, benzersiz).
function _sozNeedles() {
  const raw = [];
  const wf = _sozWeakestFoundation();
  if (wf && _SOZ_THEMES[wf]) raw.push(..._SOZ_THEMES[wf]);
  const up = S._userProfile || {};
  raw.push(..._sozTokens([up.core_issue, up.goal, up.recurring_pattern].filter(Boolean).join(' ')));
  try { const cur = window.imGetCurrent?.(); if (cur?.card?.name) raw.push(..._sozTokens(cur.card.name, 4, 3)); } catch (_) {}
  const uniq = [], seen = new Set();
  raw.forEach(n => { const l = _sozLc(n).trim(); if (l && !seen.has(l)) { seen.add(l); uniq.push(l); } });
  return uniq;
}

function _sozScore(it, needles) {
  if (!needles.length) return 0;
  const title = _sozLc(it.title), body = _sozLc(it.content);
  let s = 0;
  needles.forEach(n => { if (title.includes(n)) s += 3; else if (body.includes(n)) s += 1; });
  return s;
}

// Bir yazının gövdesinden temiz, kısa bir "söz" cümlesi çıkar (needle içereni
// yeğle; lookbehind YOK → WebKit/iOS uyumlu).
function _sozExtract(content, needles, di) {
  const clean = String(content || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const parts = (clean.match(/[^.!?\n]+[.!?]+/g) || [])
    .map(s => s.trim()).filter(s => s.length >= 28 && s.length <= 170);
  if (!parts.length) { const t = clean.slice(0, 140).trim(); return t ? (t + (clean.length > 140 ? '…' : '')) : ''; }
  const hits = parts.filter(s => { const l = _sozLc(s); return needles.some(n => l.includes(n)); });
  const cands = hits.length ? hits : parts;
  return cands[di % cands.length];
}

// En uygun yazı + söz. libOpenReader ile aynı DESC sıralama → doğru index.
function _sozPick() {
  const items = (S.knowledgeItems || []).slice().sort((a, b) =>
    String(b.created_at || '').localeCompare(String(a.created_at || '')));
  if (!items.length) return null;
  const needles = _sozNeedles();
  const di = _sozDayIndex() + _sozSalt;             // gün + açılış salt'ı → her girişte taze
  const scored = items.map((it, idx) => ({ it, idx, score: _sozScore(it, needles) }));
  let pool = scored.filter(s => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  if (!pool.length) pool = scored;              // sinyal yok → tüm yazılardan günlük rotasyon
  const chosen = pool[di % pool.length];
  const soz = _sozExtract(chosen.it.content, needles, di);
  if (!soz) return null;
  return { idx: chosen.idx, soz, title: chosen.it.title || t('wg.lib.kicker_plain') };
}

let _sozBusy = false;
let _sozPickCache = null;                          // {idx, soz, title} — ilk hesaplamadan sonra cache
/* Cache'in sahibi. Guard boolean DEĞİL uid'dir (09i secInit'in dersi):
   hesap değişince — farklı kullanıcı, "Sıfırdan Başla" — önceki kişinin
   alıntısı ayraçta asılı kalırdı. Ayraç artık kalıcı bir DOM kapısı
   olduğu için bu sessiz sızıntı görünür hale gelirdi. */
let _sozCacheUid = null;
const _sozSalt = Math.floor(Math.random() * 997);  // her açılışta taze söz rotasyonu

/** Seçilmiş alıntı (yoksa null). Okurun şeridi bunu okur; cache'e
 *  dışarıdan dokunulmaz. */
export function libGununAlintisi() {
  return _sozPickCache;
}

/** Alıntıyı seç ve cache'le. Kitaplık okuru açılırken çağrılır (yazılar
 *  zaten yüklüdür, seçim anlıktır) — ayrı bir kapı ya da ekran yoktur:
 *  Emre'nin kararı (2026-08-12) alıntıyı kitabın kendi yüzeyiyle
 *  birleştirdi, üstte alıntı altta yazılar.
 *  `S.knowledgeItems` boşsa sessizce hiçbir şey yapmaz. */
export function libGununAlintisiHazirla() {
  // Sahibi değişmişse cache düşer — yeni kullanıcı kendi alıntısını bekler.
  if (_sozCacheUid && _sozCacheUid !== (S.currentUser?.id || null)) {
    _sozPickCache = null; _sozCacheUid = null;
  }
  if (_sozBusy || _sozPickCache) return _sozPickCache;
  try {
    if (!S.knowledgeItems || !S.knowledgeItems.length) return null;
    _sozBusy = true;
    const pick = _sozPick();
    if (!pick) return null;
    _sozPickCache = pick;
    _sozCacheUid = S.currentUser?.id || null;
    return pick;
  } catch (e) { console.warn('libGununAlintisiHazirla:', e && e.message); return null; }
  finally { _sozBusy = false; }
}
if (typeof window !== 'undefined') {
  window.libGununAlintisiHazirla = libGununAlintisiHazirla;
  window.libGununAlintisi = libGununAlintisi;
}

/* ══════════════════════════════════════════════════════════════
   ADMIN — "Duyuru" sekmesi: duyuru bandı metni + aktif/pasif
══════════════════════════════════════════════════════════════ */

export async function renderLibraryBannerAdmin() {
  const host = document.getElementById('library-banner-admin-host');
  if (!host) return;
  host.innerHTML = `<div style="color:var(--text-dim);font-size:13px;">${t('wg.admin.loading')}</div>`;

  let cfg = {};
  try {
    const { data } = await sb.from('library_announcement').select('*').eq('id', 1).maybeSingle();
    cfg = data || {};
  } catch (_) {}

  const isActive = cfg.active !== false; // varsayılan true
  host.innerHTML = `
    <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">${t('wg.admin.msg_label')}</div>
    <div style="font-size:12px;color:var(--text-mid);margin-bottom:10px;line-height:1.6;">
      ${t('wg.admin.help1')}
    </div>
    <input class="field-input" type="text" id="lib-banner-text"
      value="${_libEsc(cfg.header_text || '')}"
      placeholder="${_libEsc(t('wg.admin.ph'))}"
      maxlength="160" style="margin-bottom:24px;">

    <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">${t('wg.admin.status')}</div>
    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin-bottom:8px;">
      <input type="checkbox" id="lib-banner-active" ${isActive ? 'checked' : ''}
        style="width:16px;height:16px;accent-color:var(--gold);">
      <span style="font-size:13px;color:var(--text-mid);">${t('wg.admin.active_lbl')}</span>
    </label>
    <div style="font-size:11px;color:var(--text-dim);margin-bottom:18px;line-height:1.5;">
      ${t('wg.admin.help2')}
    </div>
    <div style="font-size:11px;color:var(--text-dim);line-height:1.6;border-top:1px solid var(--border);padding-top:14px;">
      <span style="color:var(--gold);">${t('wg.admin.note_label')}</span> ${t('wg.admin.note')}
    </div>`;
}

export async function saveLibraryBanner(btn) {
  if (btn) btn.disabled = true;
  const text   = (document.getElementById('lib-banner-text')?.value || '').trim() || null;
  const active = document.getElementById('lib-banner-active')?.checked !== false;
  const row    = { id: 1, header_text: text, active, updated_at: new Date().toISOString() };
  try {
    const { error } = await sb.from('library_announcement').upsert(row, { onConflict: 'id' });
    if (error) {
      if (/relation.*library_announcement.*does not exist|could not find the table/i.test(error.message)) {
        showToast(t('wg.admin.no_table'), true);
      } else {
        showToast(t('wg.admin.save_fail') + error.message, true);
      }
      return;
    }
    showToast(active && text ? t('wg.admin.sent') : t('wg.admin.saved'));
  } catch (e) {
    showToast(t('wg.admin.save_fail') + (e?.message || e), true);
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* ══════════════════════════════════════════════════════════════
   3) DAVRANIŞ KANITI — "Bugün hangi davranışını sergiledin?"
   ───────────────────────────────────────────────────────────
   FELSEFE: "Hayalinde gördüğün kişinin davranışlarını
             sergileyebilirsin." — Wanderer İlişki Felsefesi
   Her gece (veya istenildiğinde) tek soru.
   Cevap → Elmas ödülü + Kanıt defteri.
══════════════════════════════════════════════════════════════ */

export function aynaOpenKanit() {
  // Davranış Kanıtı artık Ayna sayfasının (popup yok) sayfa-içi bölümü.
  // Ayna view'ına geç; form ve geçmiş hep orada. renderAynaCard +
  // _renderKanitGecmis switchView('ayna') yükleme kancasında çalışır.
  if (typeof window.switchView === 'function') window.switchView('ayna');
  const ta = document.getElementById('kanit-input');
  if (ta) setTimeout(() => ta.focus(), 120);
}

export function aynaCloseKanit() {
  // Sayfadan çık → Bugün'e dön.
  if (typeof window.switchView === 'function') window.switchView('bugun');
}

/* Ayna sayfası (#ayna-view) açılırken: hub kartı + Davranış Kanıtı geçmişi. */
export function loadAynaView() {
  renderAynaCard();
  _renderKanitGecmis();
}

export function aynaSaveKanit() {
  const ta = document.getElementById('kanit-input');
  const text = (ta?.value || '').trim();
  if (!text) {
    showToast(t('wg.kanit.empty'));
    return;
  }
  if (text.length < 4) {
    showToast(t('wg.kanit.short'));
    return;
  }

  const entry = {
    date: TODAY(),
    timestamp: NOW(),
    behavior: text.slice(0, 500),
    archetypeId: S._currentArchetype?.id || null,
    source: 'manual',
  };
  S._wandererGame.davranisKanitlari.push(entry);

  // Elmas ödülü: Kanıt başına 5 Elmas + ardışıklık bonusu
  let award = 5;
  const yesterday = localISODate(new Date(Date.now() - 86400000));
  const hadYesterday = S._wandererGame.davranisKanitlari.some(k => k.date === yesterday);
  if (hadYesterday) award += 3; // ardışık gün bonusu

  awardElmas(award, 'davranis-kaniti');

  // Choice tracking ile entegrasyon: bu bir "new_person" seçimidir
  if (!Array.isArray(S._choiceTracking)) {
    S._choiceTracking = S._choiceTracking || { recent_choices: [] };
  }
  if (Array.isArray(S._choiceTracking.recent_choices)) {
    S._choiceTracking.recent_choices.push({
      type: 'new_person',
      date: TODAY(),
      source: 'davranis-kaniti',
      text: text.slice(0, 100),
    });
    if (S._choiceTracking.recent_choices.length > 100) {
      S._choiceTracking.recent_choices.shift();
    }
  }

  wgSave();
  recordActivityDay(); // davranış kanıtı = merkezî seriyi besleyen ritüel
  showToast(t('wg.kanit.saved').replace('{n}', award));
  // Ayna sayfasında kal: formu temizle, kartı ve geçmişi tazele.
  if (ta) ta.value = '';
  renderAynaCard();
  _renderKanitGecmis();
}

function _renderKanitGecmis() {
  const listEl = document.getElementById('kanit-gecmis-list');
  const countEl = document.getElementById('kanit-gecmis-count');
  if (!listEl) return;
  const kanitlar = (S._wandererGame.davranisKanitlari || []).slice().reverse().slice(0, 7);
  if (countEl) countEl.textContent = t('wg.kanit.count').replace('{n}', S._wandererGame.davranisKanitlari.length);
  if (kanitlar.length === 0) {
    listEl.innerHTML = `<div class="kanit-empty">${t('wg.kanit.gecmis_empty')}</div>`;
    return;
  }
  listEl.innerHTML = kanitlar.map(k => {
    const d = new Date(k.timestamp || k.date).toLocaleDateString(_locale(), { day: 'numeric', month: 'short' });
    const safe = (k.behavior || '').replace(/</g, '&lt;');
    return `<div class="kanit-item">
      <div class="kanit-item-date">${d}</div>
      <div class="kanit-item-text">${safe}</div>
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════════════════════════════
   ELMAS EKONOMİSİ
   ───────────────────────────────────────────────────────────
   FELSEFE: "Bu kitabı bir elmas olarak görebilirsin.
             Elmas, sıcaklık ve basınç altında oluşur."
   → Kolay yoldan kazanılmaz. Anlamlı eylemler verir.
══════════════════════════════════════════════════════════════ */

// Anlık ödül etiketi (Cazibe · Anlık Etki) — reason → insanca etiket (i18n)
const _ELMAS_REASONS = new Set(['cazibe-hediye', 'cazibe-soz', 'dinlenme',
  'hayal', 'gecis', 'kanit', 'gunluk-armagan', 'gunluk-soz',
  'isik-nisan', 'isik-nisan-tam', 'hazine-iade', 'hazine-set', 'kart-ailesi', 'kart-emeli']);
const _elmasLabel = (reason) => _ELMAS_REASONS.has(reason) ? t('wg.elmas.' + reason) : t('wg.elmas.default');

export function awardElmas(amount, reason) {
  if (!amount || amount < 0) return;
  S._wandererGame.elmas = (S._wandererGame.elmas || 0) + amount;
  wgSave();
  // Küçük görsel ipucu
  const elmasEl = document.getElementById('ayna-elmas');
  if (elmasEl) {
    elmasEl.textContent = S._wandererGame.elmas.toLocaleString(_locale());
    elmasEl.classList.add('elmas-pulse');
    setTimeout(() => elmasEl.classList.remove('elmas-pulse'), 800);
  }
  // His Motoru (13e) — kristal çıt; Cazibe · Anlık Etki — mikro-ödül (TDZ-güvenli)
  try { window.fxCue?.('elmas'); } catch (_) {}
  try { window.czSpark && window.czSpark(amount, _elmasLabel(reason)); } catch (_) {}
  // Global Elmas Barı (10s) — canlı güncelle
  try { window.glElmasBarUpdate && window.glElmasBarUpdate(); } catch (_) {}
}

export function getElmasSayisi() {
  return S._wandererGame.elmas || 0;
}

// Elmas harcama — negatife düşmez. Günlük Söz'ü atlama gibi "kayıp" için (10s).
export function spendElmas(amount, reason) {
  if (!amount || amount < 0) return 0;
  const before = S._wandererGame.elmas || 0;
  const spent = Math.min(before, amount);
  S._wandererGame.elmas = before - spent;
  wgSave();
  const elmasEl = document.getElementById('ayna-elmas');
  if (elmasEl) elmasEl.textContent = S._wandererGame.elmas.toLocaleString(_locale());
  try { window.glElmasBarUpdate && window.glElmasBarUpdate(); } catch (_) {}
  return spent;
}

/* ══════════════════════════════════════════════════════════════
   AYNA KART DÜZENLEME
   ───────────────────────────────────────────────────────────
   Kullanıcı doğrudan aynaya tıklarsa basit, hızlı düzenleme açar.
══════════════════════════════════════════════════════════════ */

export function aynaEdit() {
  // "Olmak istediğin kişi"nin kanonik tasarımcısı = Olmak İstediğin Kişi (10D).
  // Ayna'dan düzenleme tasarım törenine yönlenir; sessiz üzerine-yazma biter.
  if (typeof window.oikOpenDesign === 'function') {
    window.oikOpenDesign();
  } else {
    showToast(t('wg.no_editor'));
  }
}

/* ══════════════════════════════════════════════════════════════
   BOOT HOOK — uygulama açıldığında çağrılır
══════════════════════════════════════════════════════════════ */

export function wgInit() {
  wgLoad();
  // İlk render Bugün view yüklendiğinde tetiklenecek (10-features-w2.js içinden)
}
