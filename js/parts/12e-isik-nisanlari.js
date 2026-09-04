/* ═══════════════════════════════════════════════════════════════════
   12e — ALFABE IŞIK · Fısıltı → Nişan (Faz 1: motor · salon · tören)
   ───────────────────────────────────────────────────────────────────
   FELSEFE:
     Çağın görsel dili on karanlık sembolle bilinçaltına yazıyor —
     "izleniyorsun", "geç kalıyorsun", "arzularına köle ol"... Wanderer
     bu on FISILTI'nın karşısına on NİŞAN koyar. Bilinçaltına işleme
     kitabın kendi yöntemidir (tekrar + hayal + ses), gizli telkin değil:
     her iz görünür, her nişan bir törenle kazanılır.

   "Bil ama odaklanma" (Zihniyet Böl.98) — çizim sözleşmesi:
     Fısıltı sahnede TEK bir soyut gölge lekesiyle temsil edilir (sembol-
     özel çizim YOK — Baphomet/ters haç/ters pentagram asla çizilmez),
     yalnızca dönüşüm töreninin İÇİNDE, kısa bir an görünür. Kalıcı,
     biriken, parlayan her şey NİŞAN'dır. Kullanıcı-yüzlü metinde örgüt
     adı geçmez — her fısıltı taşıdığı MESAJLA anılır.

   Saklama: local-first, SafeStorage (etw_isik_nisan_v1). Günde bir nişan
     yazılabilir (global gün kilidi); bir nişan yalnızca bir kez yazılır.

   NOT: 2026-07-06'da kullanıcı-yüzlü başlık "Nur Alfabesi" → "Alfabe Işık"
     olarak değişti; aynı gün ikinci turda "Nur" kelimesi hem kullanıcı
     metninden HEM iç koddan (dosya adı, fonksiyon/CSS/storage önekleri)
     tamamen çıkarıldı — tek kaynak artık "Işık". Önceki dosya adı
     `12e-nur-nisanlari.js`, önceki fonksiyon öneki `nn*` idi.
═══════════════════════════════════════════════════════════════════ */

import { SafeStorage, escapeHTML, showToast, localISODate } from './00a-infrastructure.js';
import { etiketCoz, etiketRegex } from './13a1-arac-etiketleri.js';
import { t } from './15-i18n.js';
import { p } from './16-i18n-prompts.js';
import { awardElmas } from './10g-w2-wanderer-game.js';
import { ikvEnsureStyles } from './12c-kart-gorsel.js';
import { NISANLAR, ISIK_TEMALAR } from './12e1-isik-veri.js';
// 13a-arac-motoru.js STATİK import EDİLMEZ: 06-summary-chat + 13-extras
// üstünden 03-auth-shell'e (bu dosyayı zaten import eden modül) döngü
// kapatır — 10B'nin aynı gerekçesi (bkz. 10B-ilham-karti.js). 13a boot'ta
// Etiket kaydı 13a1'de (SAF YAPRAK) — statik import, döngü yok.
// sonunda mühürlüyor; 12e zaten 06-summary-chat için aynı döngü riskini
// dinamik import ile çözüyor (bkz. isikInit) — burada window köprüsü yeterli
// çünkü çağrı senkron olmak zorunda (isikExtractTag).

/* Veri 12e1 yaprağına taşındı (kart üretim motoru 12c/12d de besleniyor;
   12e→12c importu yüzünden 12c bu veriyi buradan çekemezdi). Mevcut
   tüketiciler (10o, 10D) kırılmasın diye sözleşme re-export ile korunur. */
export { NISANLAR, ISIK_TEMALAR };

const ISIK_KEY = 'etw_isik_nisan_v1';
const ISIK_ELMAS_WRITE = 8;
const ISIK_ELMAS_COMPLETE = 40;

// Rad, 13/11 — tüm alfabenin tez cümlesi: fısıltıları nişanlarla değiştirmek
// kendi durumunu değiştirmektir; bekleyerek değil, seçerek.
const ISIK_AYET = {
  text: 'Kuşkusuz bir halk kendi durumunu değiştirmedikçe, Allah onların durumunu değiştirmez.',
  cite: 'Rad, 13/11',
};


/* ── Durum ─────────────────────────────────────────────────────────── */
function _isikState() {
  const raw = SafeStorage.get(ISIK_KEY, null) || {};
  return { written: raw.written || {}, lastWriteDate: raw.lastWriteDate || null };
}
function _isikSave(state) { SafeStorage.set(ISIK_KEY, state); }

export function isikGetState() { return _isikState(); }
export function isikResetState() { SafeStorage.set(ISIK_KEY, { written: {}, lastWriteDate: null }); }

export function isikWrittenCount(state = _isikState()) { return Object.keys(state.written).length; }
export function isikIsWritten(id, state = _isikState()) { return !!state.written[id]; }
export function isikWroteToday(state = _isikState()) { return !!state.lastWriteDate && state.lastWriteDate === localISODate(); }
export function isikIsComplete(state = _isikState()) { return isikWrittenCount(state) >= NISANLAR.length; }

/* ── Faz 2: Günün Işığı — en son yazılan nişanın izi (kapı kazıması, 10o) ──
   K4 "Açık Işık": her iz görünür + Ayarlar > Doku'dan kapatılabilir; hiç
   yazılmamışsa motor susar (ışık kazanılır, dayatılmaz). ─────────────── */
const ISIK_AMBIENT_KEY = 'etw_isik_ambient_v1';

export function isikAmbientEnabled() {
  const v = SafeStorage.get(ISIK_AMBIENT_KEY, null);
  return v === null ? true : !!v;
}

export function isikSetAmbient(on) {
  SafeStorage.set(ISIK_AMBIENT_KEY, !!on);
}

export function isikSyncAmbientToggleUI() {
  const el = document.getElementById('isik-ambient-toggle');
  if (el) el.checked = isikAmbientEnabled();
}

/** En son yazılan nişanın id'si — hiç yazım yoksa null. Kapı kazıması (10o)
 *  bu TEK kaynaktan okur. (12d kart bestecisi 2026-08-07'de buradan
 *  ayrıldı: kartın sahnesi kartın kendi metninden doğar, kullanıcının
 *  başka bir odadaki durumundan değil.) */
export function isikLastWritten(state = _isikState()) {
  const ids = Object.keys(state.written);
  if (!ids.length) return null;
  return ids.sort((a, b) => state.written[b].localeCompare(state.written[a]))[0];
}

/* ════════════════════════════════════════════════════════════════════
   FAZ 3 · EMRE KÖPRÜSÜ — sohbet, alfabeye kapı açar
   ─────────────────────────────────────────────────────────────────────
   Model, konuşmada çağın bir fısıltısı yankılandığında cevabının sonuna
   [NISAN:id] etiketi ekler (talimat p('prompt.mode.nisan') — hardcode
   YASAK, Emre'nin Sesi odasından düzenlenir). Etiket görünür metinden
   silinir, altına tek chip düşer → isikOpenNisan mini töreni.
   Kadans: seans başına 1 chip (10B emsalinden daha sıkı — nur nadirdir).
═══════════════════════════════════════════════════════════════════════ */


/** Metne yankılanan nişanı bulur (ilk eşleşme) — yoksa null. */
export function isikMatchNisan(text) {
  const lc = String(text || '').toLocaleLowerCase('tr');
  if (!lc) return null;
  for (const [id, cues] of Object.entries(ISIK_TEMALAR)) {
    if (cues.some(c => lc.includes(c))) return NISANLAR.find(n => n.id === id) || null;
  }
  return null;
}

/* Regex artık 13a'nın registry'sinde tutulur (İç Çalışma 09 · K5) — ikinci
   bir kopyası burada YAZILMAZ. Registry yalnız ham id'yi çözer; NISANLAR'a
   karşı doğrulama (bu domain'in kendi verisi) bilerek burada kalır. */
export function isikExtractTag(raw) {
  const hit = etiketCoz('nisan', raw);
  if (!hit) return null;
  const nis = NISANLAR.find(n => n.id === hit.id);
  return nis ? { nisan: nis, tag: hit.tag } : null;
}

let _isikChipUsed = false;   // seans başına 1 — nur nadirdir, chip değersizleşmesin

export function _isikOnEmreFinalized(msgEl, rawText) {
  try {
    if (!msgEl || msgEl._isikChipAdded) return;
    if (msgEl.classList.contains('streaming')) return;
    if (msgEl.dataset.llmError === '1') return;
    const found = isikExtractTag(rawText);
    const body = msgEl.querySelector('.msg-body');
    if (!body) return;
    // Etiket görünür metinden her koşulda temizlenir (protokol artığı kalmasın)
    if (found) {
      const _nisanRe = etiketRegex('nisan');
      if (_nisanRe) {
        try { body.innerHTML = body.innerHTML.replace(_nisanRe, '').trim(); } catch (_) {}
      }
    }
    if (!found || _isikChipUsed) return;
    _isikChipUsed = true;
    msgEl._isikChipAdded = true;
    const chip = document.createElement('button');
    chip.className = 'ik-emre-cta';   // 10B altın CTA dili — paralel stil yok
    chip.type = 'button';
    chip.setAttribute('aria-label', t('isik.chip_aria', 'Nişanı gör'));
    chip.innerHTML = `
      <span class="ik-emre-cta-sigil" aria-hidden="true">☀</span>
      <span class="ik-emre-cta-txt">${escapeHTML(t('isik.chip_cta', 'Bu fısıltının nişanı var — gör'))}</span>
      <span class="ik-emre-cta-arrow" aria-hidden="true">→</span>`;
    chip.addEventListener('click', () => {
      try { isikOpenNisan(found.nisan.id); } catch (e) { console.warn('isik chip:', e?.message); }
    });
    body.appendChild(chip);
  } catch (e) { console.warn('isik emre chip:', e?.message); }
}

/** 01 buildContextPrompt bağlamı — [NISAN] talimatı + yazılı nişan özeti.
 *  Metin p()'den gelir (Emre'nin Sesi odası); kod yalnız değişken doldurur. */
export function isikGetContext() {
  try {
    const tpl = p('prompt.mode.nisan');
    if (!tpl || tpl === 'prompt.mode.nisan') return '';
    const state = _isikState();
    const yazili = Object.keys(state.written)
      .map(id => NISANLAR.find(n => n.id === id)?.ad).filter(Boolean).join(', ');
    const idler = NISANLAR.map(n => `${n.id}=${n.fisilti}`).join(' · ');
    return tpl.replace('{idler}', idler).replace('{yazili}', yazili || '—');
  } catch (_) { return ''; }
}

/* ── INIT — 03-auth-shell post-auth (SafeStorage hidrasyonu sonrası) ── */
export function isikInit() {
  _injectStyle();
  isikSyncAmbientToggleUI();
  // Emre köprüsü — Emre mesajı finalize olunca [NISAN] etiketini işle (10B emsali)
  try {
    import('./06-summary-chat.js').then(m => {
      try {
        m.startStreamingFinalizeHooks?.after?.((el, raw) => {
          if (el?.classList?.contains('emre')) _isikOnEmreFinalized(el, raw);
        });
      } catch (e) { console.warn('isik hook:', e?.message); }
    });
  } catch (_) {}
}

/** Bir nişanı yazar. Zaten yazılmışsa ya da bugün başka bir nişan
 *  yazılmışsa false döner (çift ödül yok, günde bir nişan). */
export function isikWrite(id) {
  const nis = NISANLAR.find(n => n.id === id);
  if (!nis) return false;
  const state = _isikState();
  if (state.written[id]) return false;
  const today = localISODate();
  if (state.lastWriteDate === today) return false;
  state.written[id] = today;
  state.lastWriteDate = today;
  _isikSave(state);
  awardElmas(ISIK_ELMAS_WRITE, 'isik-nisan');
  if (isikWrittenCount(state) >= NISANLAR.length) awardElmas(ISIK_ELMAS_COMPLETE, 'isik-nisan-tam');
  return true;
}

/* ── Görsel yardımcılar ───────────────────────────────────────────── */
function _isikIconWrap(inner, extraCls = '') {
  return `<svg class="isik-icon ${extraCls}" viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
}

// Fısıltı anının TEK ortak gölge lekesi — sembol-özel çizim asla yok (K3).
function _isikGolgeSVG() {
  return `<svg class="isik-golge" viewBox="0 0 100 100" aria-hidden="true">
    <path d="M18 50 Q35 28 50 50 T82 50" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 5" opacity="0.6"/>
    <path d="M24 64 Q40 78 56 64 T88 64" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 6" opacity="0.35"/>
  </svg>`;
}

/* ── View: Alfabe Işık salonu ─────────────────────────────────────── */
export function loadIsikView() {
  const el = document.getElementById('isik-content');
  if (!el) return;
  _injectStyle();
  ikvEnsureStyles();
  renderIsikSalonu();
}

export function renderIsikSalonu() {
  const el = document.getElementById('isik-content');
  if (!el) return;
  const state = _isikState();
  const total = isikWrittenCount(state);
  const complete = isikIsComplete(state);
  const wroteToday = isikWroteToday(state);

  const statEl = document.getElementById('isik-stat-written');
  if (statEl) statEl.textContent = total;

  const cards = NISANLAR.map((n, i) => {
    const written = isikIsWritten(n.id, state);
    return `
      <button class="isik-card ${written ? 'is-written' : 'is-dim'}" style="--i:${i};" onclick="isikOpenNisan('${n.id}')">
        ${_isikIconWrap(n.icon)}
        <div class="isik-card-name">${escapeHTML(n.ad)}</div>
      </button>`;
  }).join('');

  const headline = complete
    ? t('isik.complete_headline', 'Alfabe tamam. Artık çağın yazısını okuyabilen ve ona kendi harfleriyle cevap veren birisin.')
    : (total > 0
      ? t('isik.progress_headline', 'Alfabende {{n}} harf yazılı.').replace('{{n}}', total)
      : t('isik.empty_headline', 'Çağ sana on fısıltıyla yazıyor. Sen ona ışıkla cevap vereceksin.'));

  el.innerHTML = `
    <div class="ikv-panel isik-hero">
      <div class="isik-hero-title serif">${escapeHTML(t('isik.title', 'Alfabe Işık'))}</div>
      <div class="isik-hero-sub">${escapeHTML(headline)}</div>
      ${!complete && wroteToday ? `<div class="isik-hero-note">${escapeHTML(t('isik.today_note', 'Bugün bir nişan yazdın. Yarın devam eder.'))}</div>` : ''}
      <div class="isik-ayet">
        <div class="isik-ayet-text">${escapeHTML('"' + ISIK_AYET.text + '"')}</div>
        <div class="isik-ayet-cite">${escapeHTML(ISIK_AYET.cite)}</div>
      </div>
    </div>
    <div class="isik-grid ikv-cascade">${cards}</div>`;
}

/* ── Nişan açma: yazılmışsa detay, değilse tören (ya da günlük kilit) ─ */
export function isikOpenNisan(id) {
  const nis = NISANLAR.find(n => n.id === id);
  if (!nis) return;
  const state = _isikState();
  if (isikIsWritten(id, state)) { _isikShowWritten(nis); return; }
  if (isikWroteToday(state)) {
    showToast(t('isik.locked_today', 'Bugün zaten bir nişan yazdın. Yarın devam et.'));
    return;
  }
  _isikCeremony(nis);
}

function _isikShowWritten(nis) {
  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.id = 'isik-detail-overlay';
  overlay.style.setProperty('z-index', 'var(--z-isik-nisan)');
  overlay.innerHTML = `
    <div class="modal isik-modal">
      ${_isikIconWrap(nis.icon, 'isik-icon--big is-written')}
      <div class="isik-modal-title serif">${escapeHTML(nis.ad)}</div>
      <div class="isik-modal-hakikat">${escapeHTML(nis.hakikat)}</div>
      <div class="isik-modal-ders">${escapeHTML(nis.ders)}</div>
      <button class="isik-dismiss" onclick="this.closest('.overlay').remove()">${escapeHTML(t('weekly.ok', 'Tamam'))}</button>
    </div>`;
  document.body.appendChild(overlay);
}

/* ── Yazma töreni: Fısıltı (≤1.5sn, soyut gölge) → Dönüşüm → Mühür ──── */
function _isikCeremony(nis) {
  const overlay = document.createElement('div');
  overlay.className = 'isik-ceremony';
  overlay.id = 'isik-ceremony-overlay';
  overlay.innerHTML = `
    <div class="isik-ceremony-inner">
      <div class="isik-phase isik-phase-fisilti" id="isik-phase-fisilti">
        ${_isikGolgeSVG()}
        <div class="isik-fisilti-text">${escapeHTML('"' + nis.fisilti + '"')}</div>
      </div>
      <div class="isik-phase isik-phase-donusum" id="isik-phase-donusum" style="display:none;">
        ${_isikIconWrap(nis.icon, 'isik-icon--big is-written')}
        <div class="isik-donusum-line">${escapeHTML(t('isik.ceremony_line', 'Fısıltı söner. Işık kalır.'))}</div>
        <div class="isik-hakikat">${escapeHTML(nis.hakikat)}</div>
        <div class="isik-ceremony-actions">
          <button class="ikv-seal-btn" onclick="isikSeal('${nis.id}')">${escapeHTML(t('isik.seal_cta', 'Yazıldı.'))}</button>
          <button class="ikv-ghost-btn" onclick="isikCancelCeremony()">${escapeHTML(t('isik.cancel_cta', 'Vazgeç'))}</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  const reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => {
    const fisilti = document.getElementById('isik-phase-fisilti');
    const donusum = document.getElementById('isik-phase-donusum');
    if (fisilti) fisilti.style.display = 'none';
    if (donusum) donusum.style.display = '';
  }, reduced ? 0 : 1400);
}

/** Törenden vazgeç — hiçbir şey yazılmaz, günlük hak harcanmaz
 *  (yanlış nişana tıklayan kullanıcı için çıkış yolu). */
export function isikCancelCeremony() {
  document.getElementById('isik-ceremony-overlay')?.remove();
}

export function isikSeal(id) {
  const ok = isikWrite(id);
  document.getElementById('isik-ceremony-overlay')?.remove();
  if (!ok) { renderIsikSalonu(); return; }
  try { window.fxCue?.('nisan'); } catch (_) {}
  if (isikIsComplete()) {
    _isikCompletionCeremony();
  } else {
    showToast(t('isik.written_toast', 'Yazıldı. Bu harf artık senin.'));
  }
  renderIsikSalonu();
  try { window.wsSyncStudio?.(); } catch (_) {}
}

function _isikCompletionCeremony() {
  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.id = 'isik-complete-overlay';
  overlay.style.setProperty('z-index', 'var(--z-isik-yazit)');
  overlay.innerHTML = `
    <div class="modal isik-modal">
      <div class="isik-complete-sigil">✦</div>
      <div class="isik-modal-title serif">${escapeHTML(t('isik.complete_title', 'Alfabe Tamam'))}</div>
      <div class="isik-modal-hakikat">${escapeHTML(t('isik.complete_headline', 'Alfabe tamam. Artık çağın yazısını okuyabilen ve ona kendi harfleriyle cevap veren birisin.'))}</div>
      <button class="isik-dismiss" onclick="this.closest('.overlay').remove()">${escapeHTML(t('weekly.ok', 'Tamam'))}</button>
    </div>`;
  document.body.appendChild(overlay);
}

/* ── Stiller — JS-enjekte (10p/12c konvansiyonu) ─────────────────────
   Salon dili 12c tören primitiflerini (ikv-panel/ikv-cascade/ikv-seal-
   btn/ikv-ghost-btn) reuse eder; burada yalnız nişan-özel kurallar
   tanımlanır. */
function _injectStyle() {
  if (document.getElementById('isik-style')) return;
  const css = `
    .isik-hero{padding:22px 20px;margin-bottom:18px;text-align:center;}
    .isik-hero-title{font-family:var(--cinzel,'Cinzel',serif);font-size:20px;color:var(--gold);letter-spacing:0.5px;margin-bottom:8px;}
    .isik-hero-sub{font-size:13px;line-height:1.6;color:var(--text-mid);max-width:380px;margin:0 auto;}
    .isik-hero-note{margin-top:10px;font-size:11.5px;color:var(--text-dim);font-style:italic;}
    .isik-ayet{margin-top:16px;padding-top:14px;border-top:1px solid rgba(245,166,35,0.18);}
    .isik-ayet-text{font-family:var(--serif,'EB Garamond',Georgia,serif);font-style:italic;font-size:13.5px;line-height:1.7;color:var(--text-mid);max-width:400px;margin:0 auto;}
    .isik-ayet-cite{margin-top:8px;font-family:var(--cinzel,'Cinzel',serif);font-size:10px;letter-spacing:2px;color:var(--gold);text-transform:uppercase;}
    .isik-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:12px;}
    .isik-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 8px;
      background:rgba(255,255,255,0.015);border:1px solid var(--border);border-radius:14px;cursor:pointer;
      transition:border-color .25s,transform .15s;color:var(--text-dim);}
    .isik-card:hover{transform:translateY(-2px);}
    .isik-card.is-dim{opacity:0.55;filter:grayscale(0.6);}
    .isik-card.is-written{color:var(--gold);border-color:rgba(245,166,35,0.35);}
    .isik-icon{width:34px;height:34px;}
    .isik-icon--big{width:76px;height:76px;}
    .isik-card-name{font-family:var(--cinzel,'Cinzel',serif);font-size:10px;letter-spacing:0.06em;text-align:center;line-height:1.3;}

    .isik-ceremony{position:fixed;inset:0;z-index:var(--z-isik-sahne);display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.86);opacity:0;transition:opacity .5s;padding:24px;}
    .isik-ceremony.show{opacity:1;}
    .isik-ceremony-inner{text-align:center;max-width:340px;}
    .isik-phase-fisilti .isik-golge{width:120px;height:120px;color:var(--text-dim);margin:0 auto 18px;opacity:0.7;animation:isikFlicker 1.4s ease-in-out infinite;}
    .isik-fisilti-text{font-style:italic;color:var(--text-mid);font-size:15px;line-height:1.6;}
    .isik-phase-donusum .isik-icon--big{color:var(--gold);margin:0 auto 16px;filter:drop-shadow(0 0 14px rgba(245,166,35,0.5));animation:isikGlowIn 0.8s var(--ease-out,ease) both;}
    .isik-donusum-line{font-family:var(--cinzel,'Cinzel',serif);font-size:11px;letter-spacing:3px;color:var(--gold);text-transform:uppercase;margin-bottom:14px;}
    .isik-hakikat{font-size:15px;line-height:1.7;color:var(--text);margin-bottom:22px;}
    .isik-ceremony-actions{display:flex;flex-direction:column;gap:10px;align-items:center;}
    .isik-dismiss{background:none;border:none;color:var(--text-dim);font-size:12px;cursor:pointer;padding:8px;margin-top:8px;}
    .isik-dismiss:hover{color:var(--text-mid);}
    .isik-modal{text-align:center;}
    .isik-complete-sigil{font-size:40px;color:var(--gold);text-shadow:0 0 18px rgba(245,166,35,0.5);margin-bottom:14px;}
    .isik-modal-title{font-family:var(--cinzel,'Cinzel',serif);font-size:20px;color:var(--gold);margin:14px 0 10px;}
    .isik-modal-hakikat{font-size:14px;line-height:1.6;color:var(--text);margin-bottom:10px;}
    .isik-modal-ders{font-size:12px;color:var(--text-dim);font-style:italic;margin-bottom:18px;}

    @keyframes isikFlicker{0%,100%{opacity:0.5}50%{opacity:0.8}}
    @keyframes isikGlowIn{from{opacity:0;transform:scale(0.8);}to{opacity:1;transform:scale(1);}}

    @media (prefers-reduced-motion: reduce){
      .isik-golge{animation:none!important;}
      .isik-phase-donusum .isik-icon--big{animation:none!important;}
      .isik-card{transition:none;}
    }
  `;
  const style = document.createElement('style');
  style.id = 'isik-style';
  style.textContent = css;
  document.head.appendChild(style);
}
