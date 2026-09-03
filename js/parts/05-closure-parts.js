import { S } from '../state.js';
import { sb } from '../config.js';
import { ensureExt } from './00-ext-loader.js';
import { SafeStorage, AnimUtils, showToast, localISODate, escapeHTML, localDayKey } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { nowTR, toTR, onModeBadgeUpdate } from './00-config-tracking.js';
import { p, dp } from './16-i18n-prompts.js';
import { appendMsg } from './06-summary-chat.js';
import { callLLM, loadMoodHistory } from './04-llm-hero-history.js';
import { dfSave } from './09b-depth-foundations.js';
import { w3GenerateDeepSummary } from './12-w3-journey.js';
// 11'den paylaşılan özet görüntüleyici + cache yükleyici. 05↔11 yalnızca
// fonksiyon-içi kullanım olduğundan (her ikisi hoisted function) eval-zamanı
// döngü riski yok — kod tabanındaki 05↔06 döngüsüyle aynı güvenli kalıp.
import { renderDaySummaryHTML, w2LoadSummariesCache } from './11-w2-chat-cal.js';
import { spendElmas } from './10g-w2-wanderer-game.js';

let closureState = { mood: null, region: null, sensation: null, intensity: null };

export function getRegionLabels() {
  return {
    bas: t('somatic.region.head'),
    bogaz: t('somatic.region.throat'),
    gogus: t('somatic.region.chest'),
    mide: t('somatic.region.stomach'),
    legen: t('somatic.region.pelvis'),
    kollar: t('somatic.region.arms'),
    bacaklar: t('somatic.region.legs'),
  };
}

export function getSensationLabels() {
  return {
    siksima: t('somatic.sensation.tightness'),
    baski: t('somatic.sensation.pressure'),
    isi: t('somatic.sensation.heat'),
    soguk: t('somatic.sensation.cold'),
    uyusukluk: t('somatic.sensation.numbness'),
    titreme: t('somatic.sensation.trembling'),
    bosluk: t('somatic.sensation.emptiness'),
    agirlik: t('somatic.sensation.heaviness'),
    hafiflik: t('somatic.sensation.lightness'),
  };
}

// Gün anahtarı — TR-yerel tarih (YYYY-MM-DD). toISOString() UTC verir → TR'de
// gece yarısı ile 03:00 arası dünün anahtarına düşer, böylece "gün kapandı"
// göstergeleri yeni güne taşardı. nowTR/kapanış penceresiyle tutarlı kalmak için
// TR duvar-saatinin tarihini kullan. (yerel-tarih-anahtari)
export function closureDayKey(d = new Date()) {
  return localISODate(toTR(d)); // YYYY-MM-DD (TR)
}
export function closureLocalKey(d = new Date()) {
  return `etw_closure_${closureDayKey(d)}`;
}

export function isClosureDoneToday() {
  return SafeStorage.getRaw(closureLocalKey()) === '1';
}

/* Kapanış penceresi: akşam 21:00 - gece yarısı (00:00) */
export function isClosureWindowOpen() {
  return nowTR().getHours() >= 21;
}

export function markClosureDone() {
  SafeStorage.setRaw(closureLocalKey(), '1');
  updateClosureChip();
  updateEODCardState();
}

// Günde bir kez kontrolü — DB'den de teyit et (cihaz değişmiş olabilir)
export async function syncClosureStatusFromDB() {
  if (!S.currentUser) return;
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const { data } = await sb.from('mood_history')
      .select('id, created_at')
      .eq('user_id', S.currentUser.id)
      .gte('created_at', start.toISOString())
      .limit(1);
    if (data && data.length) SafeStorage.setRaw(closureLocalKey(), '1');
  } catch {}
  updateClosureChip();
}

// Topbar chip state
export function updateClosureChip() {
  const chip  = document.getElementById('closure-chip');
  const label = document.getElementById('closure-chip-label');
  if (!chip) return;
  chip.classList.remove('pending', 'done', 'inactive');
  if (isClosureDoneToday()) {
    chip.classList.add('done');
    if (label) label.textContent = t('ui.closed_check');
  } else if (isClosureWindowOpen()) {
    chip.classList.add('pending');
    chip.setAttribute('aria-disabled', 'false');
    chip.style.pointerEvents = '';
    if (label) label.textContent = t('ui.closure');
  } else {
    chip.classList.add('inactive');
    chip.setAttribute('aria-disabled', 'true');
    if (label) label.textContent = 'Vesper';
  }
}

/**
 * @param {boolean} [force]     - saat penceresini (21:00) atla. Akşam Kapanış
 *   Töreni (13h) zaten 20:00 kapısını geçtiği için oradan force=true gelir.
 * @param {number}  [startStep] - açılış adımı (varsayılan 0=onay). Tören
 *   köprüsü onayı atlayıp doğrudan Ruh adımına (1) iner.
 */
export function openDailyClosure(force, startStep) {
  if (isClosureDoneToday()) {
    showToast(t('toast.closure_done'));
    return;
  }
  if (!force && !isClosureWindowOpen()) {
    showToast(t('toast.closure_after_9'));
    return;
  }
  closureState = { mood: null, region: null, sensation: null, intensity: null };

  // UI reset
  document.querySelectorAll('#closure-mood-grid .mood-btn').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('#closure-body-map [data-region]').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('#closure-sensations .sensation-btn').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('#closure-intensity .intensity-dot').forEach(el => el.classList.remove('active'));
  document.getElementById('closure-region-name').textContent = '';
  document.getElementById('closure-save-btn').disabled = true;
  goToClosureStep(startStep != null ? startStep : 0);

  // Event handler'ları bir kere bağla (idempotent)
  const modal = document.getElementById('closure-overlay');
  if (!modal.dataset.bound) {
    modal.querySelectorAll('#closure-mood-grid .mood-btn').forEach(el => {
      el.addEventListener('click', () => closureSelectMood(parseInt(el.dataset.score, 10)));
    });
    modal.querySelectorAll('#closure-body-map [data-region]').forEach(el => {
      el.addEventListener('click', () => closureSelectRegion(el.dataset.region));
    });
    modal.querySelectorAll('#closure-sensations .sensation-btn').forEach(el => {
      el.addEventListener('click', () => closureSelectSensation(el.dataset.sensation));
    });
    modal.querySelectorAll('#closure-intensity .intensity-dot').forEach(el => {
      el.addEventListener('click', () => closureSelectIntensity(parseInt(el.dataset.intensity, 10)));
    });
    modal.dataset.bound = '1';
  }

  modal.classList.add('open');
}

export function goToClosureStep(n) {
  const s0 = document.getElementById('closure-step-0');
  if (s0) s0.style.display = n === 0 ? '' : 'none';
  document.getElementById('closure-step-1').style.display = n === 1 ? '' : 'none';
  document.getElementById('closure-step-2').style.display = n === 2 ? '' : 'none';
  const s3 = document.getElementById('closure-step-3');
  if (s3) s3.style.display = n === 3 ? '' : 'none';
  const prog = document.getElementById('closure-progress-bar');
  if (prog) prog.style.display = n === 0 ? 'none' : '';
  document.getElementById('closure-prog-1').classList.toggle('active', n === 1);
  document.getElementById('closure-prog-1').classList.toggle('done',   n > 1);
  document.getElementById('closure-prog-2').classList.toggle('active', n === 2);
  document.getElementById('closure-prog-2').classList.toggle('done',   n > 2);
  const p3 = document.getElementById('closure-prog-3');
  if (p3) {
    p3.classList.toggle('active', n === 3);
    p3.classList.toggle('done',   n > 3);
  }
  // Step 3 iki alt-bölme: girişte daima Geçiş Sorusu görünür, Özet gizli.
  if (n === 3) {
    const trEl  = document.getElementById('closure-step-3-transition');
    const sumEl = document.getElementById('closure-step-3-summary');
    if (trEl)  trEl.style.display  = '';
    if (sumEl) sumEl.style.display = 'none';
  }
}

export function closureSelectMood(score) {
  closureState.mood = score;
  document.querySelectorAll('#closure-mood-grid .mood-btn').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.score, 10) === score);
  });
  // Kısa vurgu, sonra 2. adıma geç
  setTimeout(() => goToClosureStep(2), 200);
}

export function closureSelectRegion(region) {
  closureState.region = region;
  document.querySelectorAll('#closure-body-map [data-region]').forEach(el => {
    el.classList.toggle('active', el.dataset.region === region);
  });
  document.getElementById('closure-region-name').textContent = getRegionLabels()[region] || region;
  updateClosureSaveBtn();
}

export function closureSelectSensation(sensation) {
  closureState.sensation = sensation;
  document.querySelectorAll('#closure-sensations .sensation-btn').forEach(el => {
    el.classList.toggle('active', el.dataset.sensation === sensation);
  });
  updateClosureSaveBtn();
}

export function closureSelectIntensity(n) {
  closureState.intensity = n;
  document.querySelectorAll('#closure-intensity .intensity-dot').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.intensity, 10) === n);
  });
  updateClosureSaveBtn();
}

export function updateClosureSaveBtn() {
  const { region, sensation, intensity } = closureState;
  document.getElementById('closure-save-btn').disabled = !(region && sensation && intensity);
}

/**
 * withBody=true  → Ruh + Beden birlikte kaydet
 * withBody=false → "Sadece Ruhla Kapat" — beden atla, yalnız mood kaydet
 */
export async function saveDailyClosure(withBody) {
  const { mood, region, sensation, intensity } = closureState;
  if (!mood) { showToast(t('toast.select_mood')); goToClosureStep(1); return; }

  const saveBtn = document.getElementById('closure-save-btn');
  if (saveBtn) saveBtn.disabled = true;

  // 1) Mood kaydı
  try {
    await sb.from('mood_history').insert([{ user_id: S.currentUser.id, score: mood }]);
  } catch (e) { console.warn('closure mood insert:', e); }
  loadMoodHistory();

  /* EHLİYET SINAMASI (K11, FAZ 14 — dikiş faz denetiminde kapatıldı).
     Beyan tam BURADA doğuyor; motorun kendini sınayabileceği tek an bu.
     Çağrı olmadan `iklim.isabet.n` sonsuza dek 0 kalır ve pahalı yüzeyler
     (secici, push) hiçbir kullanıcıda AÇILMAZ — yani FAZ 18/19 açılmayan
     bir kapının üstüne inşa edilirdi. window köprüsü: 09-reports-tracks
     bu dosyayı zaten dolaylı tüketiyor, statik import döngü riski taşır
     (§5.2 TDZ-güvenli `?.()` deseni). */
  try { window.dgIsabetGunuKapat?.(mood); } catch (_) {}

  // 2) Beden kaydı (opsiyonel)
  if (withBody && region && sensation && intensity) {
    try {
      await sb.from('somatic_log').insert([{
        user_id: S.currentUser.id,
        session_id: S.currentSessId || null,
        region, sensation, intensity,
        mood_score: mood
      }]);
      loadSomaticHistory();
    } catch (e) { console.warn('closure somatic insert:', e); }
  }

  markClosureDone();
  showToast(withBody ? t('toast.day_closed_body') : t('toast.day_closed'));
  // Geçiş sorusunu göster, özet akışı oradan tetiklenecek
  goToClosureStep(3);
}

export function closureRecordTransition(answer) {
  // Geçiş cevabını kaydet (yes / partial / no / skip)
  if (answer !== 'skip' && S._personTransition) {
    if (!Array.isArray(S._personTransition.daily_steps)) S._personTransition.daily_steps = [];
    S._personTransition.daily_steps.push({ date: localISODate(), answer });
    if (S._personTransition.daily_steps.length > 90) S._personTransition.daily_steps.shift();
    dfSave();
  }
  // Overlay'i KAPATMA — aynı adımda (step 3) Günün Özeti'ni inline göster.
  closureRevealSummary();
}

export function closeDailyClosure(completed) {
  document.getElementById('closure-overlay').classList.remove('open');
  closureState = { mood: null, region: null, sensation: null, intensity: null };
}

/* Step 3'ün ikinci yüzü: Geçiş Sorusu cevaplanınca günün derin özetini üret ve
   Geçmiş Sohbetler ile AYNI görünümde (renderDaySummaryHTML) overlay içinde göster. */
export async function closureRevealSummary() {
  const trEl   = document.getElementById('closure-step-3-transition');
  const sumEl  = document.getElementById('closure-step-3-summary');
  const loadEl = document.getElementById('closure-summary-loading');
  const bodyEl = document.getElementById('closure-summary-body');
  const sealBtn= document.getElementById('closure-seal-btn');

  if (trEl)   trEl.style.display   = 'none';
  if (sumEl)  sumEl.style.display  = '';
  if (bodyEl) bodyEl.innerHTML     = '';
  if (sealBtn)sealBtn.style.display= 'none';
  if (loadEl) loadEl.style.display = '';

  const now = new Date();
  const todayKey = localDayKey(now);

  let deep = null;
  let failed = false;  // üretim/kayıt patladı mı — "az konuştuk"tan AYRI durum
  try {
    // v3 derin özet üretici — gece yarısı otomatik tetikleyiciyle aynı format.
    const r = await w3GenerateDeepSummary(todayKey);
    if (r && r.ok) deep = r.data;
    else if (r && r.reason !== 'insufficient') failed = true;
  } catch (e) {
    failed = true;
    console.warn('closureRevealSummary:', e);
  }

  // Özet listesini tazele → Geçmiş Sohbetler senkron kalsın.
  S._w2SummariesCache = null;
  try { await w2LoadSummariesCache(); } catch (_) {}

  if (loadEl) loadEl.style.display = 'none';

  const _lang = S._currentLang || 'tr';
  const _datePart = new Intl.DateTimeFormat(_lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  const _dayPart  = new Intl.DateTimeFormat(_lang, { weekday: 'long' }).format(now);
  const dateStr = `${_datePart} · ${_dayPart}`.toLocaleUpperCase(_lang);

  if (bodyEl) {
    if (deep) {
      bodyEl.innerHTML = renderDaySummaryHTML(deep, dateStr, { closing: t('closure.closing', '~ bugünü bilinçle kapattın ~') });
    } else if (failed) {
      // §6.2 — kayıt/üretim patladığında "az konuştuk" demek yanlış teşhistir:
      // kullanıcı konuşmuştur, yazılamayan özettir. Doğrusu söylenir.
      bodyEl.innerHTML = `<div class="ws-ozet-page-date">${escapeHTML(dateStr)}</div>
        <div class="closure-summary-empty">${t('closure.failed', 'Bugünün özeti şu an yazılamadı. Konuştukların duruyor — özet ilk fırsatta yeniden denenecek.')}</div>`;
    } else {
      bodyEl.innerHTML = `<div class="ws-ozet-page-date">${escapeHTML(dateStr)}</div>
        <div class="closure-summary-empty">${t('closure.empty', 'Bugün özet çıkarmaya yetecek kadar konuşmadık. Yine de günü bilinçle kapattın — bu da bir adım.')}</div>`;
    }
    bodyEl.scrollTop = 0;
  }
  if (sealBtn) sealBtn.style.display = '';
}

/* "GÜNÜ MÜHÜRLE" — overlay'i kapat. Hiçbir yere yönlendirme: kullanıcı kapanışı
   hangi ekrandan açtıysa orada kalır. Gün-kapandı bandı yalnız Sohbet'e aittir;
   mühürleme anında Sohbet'teysen bandı hemen tazele, değilsen dokunma (Bugün'e taşımaz). */
export function closureSealAndClose() {
  closeDailyClosure(true);
  if (document.getElementById('chat-view')?.classList.contains('active')) {
    setTimeout(() => startDayClosedCountdown(), 350);
  }
}

/* ─── OTOMATİK KAPANIŞ CEZASI ───
   Gün, kullanıcı tarafından manuel kapatılmadıysa (Ruh/Beden/Geçiş işaretlenmedi)
   gece yarısı/ertesi-açılış otomatik özetiyle kendiliğinden kapanır. Bu durumda
   kullanıcı bir kez −3 elmas kaybeder (0'ın altına düşmez). Hem gece-yarısı timer'ı
   (11) hem ertesi-açılış (12) bu yardımcıyı çağırır; guard anahtarı gün başına
   yalnız bir kez uygulanmasını sağlar. yKey biçimi: 'YYYY-M-D' (ay 0-tabanlı). */
export const AUTO_CLOSURE_PENALTY = 3;
export function applyAutoClosurePenalty(yKey) {
  try {
    if (!yKey || !S.currentUser) return;
    const penaltyKey = 'etw_autoclose_penalty_' + yKey;
    if (SafeStorage.getRaw(penaltyKey)) return; // gün başına bir kez

    const [yy, ym, yd] = yKey.split('-').map(Number);
    // Manuel kapanış anahtarı yerel-ISO biçiminde (akşam penceresi UTC==TR günü garantiler)
    const closureIso = `${yy}-${String(ym + 1).padStart(2, '0')}-${String(yd).padStart(2, '0')}`;
    if (SafeStorage.getRaw('etw_closure_' + closureIso) === '1') {
      SafeStorage.setRaw(penaltyKey, 'closed'); // manuel kapatılmış → ceza yok
      return;
    }

    // O gün gerçekten konuşma var mıydı? Yoksa cezalandırma (geçersiz gün).
    const dayStart = new Date(yy, ym, yd).getTime();
    const dayEnd   = new Date(yy, ym, yd + 1).getTime();
    const hadActivity = Object.values(S.allSessions || {}).flat().some(mm => {
      if (!mm || mm.role !== 'user' || !mm.created_at) return false;
      const ts = new Date(mm.created_at).getTime();
      return ts >= dayStart && ts < dayEnd;
    });
    if (!hadActivity) return;

    spendElmas(AUTO_CLOSURE_PENALTY, 'auto-closure');
    SafeStorage.setRaw(penaltyKey, '1');
    try { showToast(t('closure.auto_penalty', 'Günü kendin kapatmadın — gün kendiliğinden kapandı · −{n} elmas').replace('{n}', AUTO_CLOSURE_PENALTY)); } catch (_) {}
  } catch (e) { console.warn('applyAutoClosurePenalty:', e); }
}

/* Gün kapanış sayacı */
let _dayClosedCountdownInterval = null;

export function startDayClosedCountdown() {
  if (!isClosureDoneToday()) return;
  // Bu band YALNIZ Sohbet'e aittir. Sohbet aktif değilse hiçbir şey yapma — band
  // kim çağırırsa çağırsın Bugün'e veya başka ekrana asla düşmez.
  if (!document.getElementById('chat-view')?.classList.contains('active')) return;

  // Bar'ı başlatma — interval'i tekrar kurmamak için kontrol et
  if (_dayClosedCountdownInterval) clearInterval(_dayClosedCountdownInterval);

  // Mevcut bar'ları temizle
  document.querySelectorAll('.day-closed-bar').forEach(b => b.remove());

  const bar = document.createElement('div');
  bar.id = 'day-closed-bar';
  bar.className = 'day-closed-bar';

  function updateCountdown() {
    const n = new Date();
    const midnight = new Date(n);
    midnight.setHours(24, 0, 0, 0);
    const diff = midnight - n;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const parts = [];
    if (h > 0) parts.push(h + 's');
    parts.push(m + 'dk');
    parts.push(s + 'sn');
    // Kapanış sonrası net bildirim: bu mesajlar Özet'e dâhil edilmez + 00:00 geri sayımı.
    bar.innerHTML = t('closure.day_closed_bar', 'Gün kapandı · bu mesajlar Özet\'e eklenmez · 00:00\'a {time}')
      .replace('{time}', `<span class="day-closed-bar-time">${parts.join(' ')}</span>`);
  }

  updateCountdown();
  _dayClosedCountdownInterval = setInterval(updateCountdown, 1000);

  // Geri sayım barını AKTİF görünümün üst barının altına ekle — bu band YALNIZ
  // Sohbet'e (chat-view, .w2-topbar) aittir; "bu mesajlar Özet'e eklenmez" bildirimi
  // Bugün'de mesaj composer'ı olmadığından oraya konmaz (.ws-topbar bilerek hariç).
  const active = document.querySelector('.view.active');
  const topbar = active?.querySelector('.w2-topbar, .top-nav');
  if (topbar) { topbar.insertAdjacentElement('afterend', bar); return; }
  if (active) { active.insertBefore(bar, active.firstChild); return; }
  // Son çare: body'ye fixed olarak ekle
  document.body.appendChild(bar);
}

export function stopDayClosedCountdown() {
  if (_dayClosedCountdownInterval) {
    clearInterval(_dayClosedCountdownInterval);
    _dayClosedCountdownInterval = null;
  }
  const bar = document.getElementById('day-closed-bar');
  if (bar) bar.remove();
}

// EOD inline kartı — chat akışına bir kez düşer
export function appendEODClosureCard() {
  const area = document.getElementById('messages-area');
  if (!area) return;
  if (document.getElementById('eod-closure-card')) return;
  const done = isClosureDoneToday();
  const card = document.createElement('div');
  card.id = 'eod-closure-card';
  card.className = 'eod-closure-card' + (done ? ' done' : '');
  card.innerHTML = `
    <div class="eod-body">
      <div class="eod-title">${done ? t('toast.day_closed') : t('ui.day_closed_title')}</div>
      <div class="eod-desc">${done ? t('closure.body_spirit_done') : t('closure.body_spirit_prompt')}</div>
    </div>
    <div class="eod-actions">
      <div class="eod-arrow">${done ? '✓' : '→'}</div>
      ${!done ? `<button class="eod-up-btn" title="${t('ui.reminder')}"><svg width="12" height="14" viewBox="0 0 12 14" fill="none"><line x1="6" y1="13" x2="6" y2="1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M2 5.5L6 1.5L10 5.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>` : ''}
    </div>
  `;
  card.onclick = () => { if (!isClosureDoneToday()) openDailyClosure(); };
  if (!done) {
    const upBtn = card.querySelector('.eod-up-btn');
    if (upBtn) upBtn.addEventListener('click', eodSendToSaturn);
  }
  area.appendChild(card);
  area.scrollTop = area.scrollHeight;
}

export function updateEODCardState() {
  const card = document.getElementById('eod-closure-card');
  if (!card) return;
  if (isClosureDoneToday()) {
    card.classList.add('done');
    const tt = card.querySelector('.eod-title'); if (tt) tt.textContent = t('toast.day_closed');
    const d = card.querySelector('.eod-desc');  if (d) d.textContent = t('closure.body_spirit_done');
    const a = card.querySelector('.eod-arrow'); if (a) a.textContent = '✓';
    const upBtn = card.querySelector('.eod-up-btn'); if (upBtn) upBtn.remove();
    card.onclick = null;
  }
}

export function eodSendToSaturn(e) {
  e.stopPropagation();
  const btn = e.currentTarget;
  const btnRect = btn.getBoundingClientRect();
  // Hedef: BUGÜN'deki Vesper halkası (topbar'daki us-ring kaldırıldı);
  // bulunamazsa orb düşey olarak yukarı süzülür (endY fallback).
  const saturn = document.querySelector('.w2-vesper-wrap');

  const startX = btnRect.left + btnRect.width / 2;
  const startY = btnRect.top + btnRect.height / 2;
  const saturnRect = saturn ? saturn.getBoundingClientRect() : null;
  const endX = saturnRect ? saturnRect.left + saturnRect.width / 2 : startX;
  const endY = saturnRect ? saturnRect.top + saturnRect.height / 2 : 30;

  const orb = document.createElement('div');
  orb.className = 'eod-orb';
  orb.style.left = startX + 'px';
  orb.style.top = startY + 'px';
  document.body.appendChild(orb);

  const card = document.getElementById('eod-closure-card');

  // Hareket azaltma tercihi: animasyonsuz, anlık geçiş
  if (AnimUtils.prefersReducedMotion()) {
    orb.remove();
    if (saturn) saturn.classList.add('eod-saturn-pulse');
    if (card) card.remove();
    showToast(t('toast.deadline'));
    return;
  }

  const duration = 700;
  const t0 = performance.now();

  function tick(now) {
    const p = Math.min((now - t0) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    orb.style.left = (startX + (endX - startX) * ease) + 'px';
    orb.style.top  = (startY + (endY - startY) * ease) + 'px';
    orb.style.opacity = p < 0.12 ? p / 0.12 : p > 0.78 ? 1 - (p - 0.78) / 0.22 : 1;
    if (p < 1) { requestAnimationFrame(tick); return; }
    orb.remove();
    if (saturn) {
      saturn.classList.add('eod-saturn-pulse');
      setTimeout(() => saturn.classList.remove('eod-saturn-pulse'), 650);
    }
    // Kartı sil
    if (card) {
      card.style.transition = 'opacity 0.35s, transform 0.35s';
      card.style.opacity = '0';
      card.style.transform = 'translateY(-6px)';
      setTimeout(() => card.remove(), 360);
    }
    showToast(t('toast.deadline'));
  }
  requestAnimationFrame(tick);
}

export async function loadSomaticHistory() {
  if (!S.currentUser) return;
  let data = [];
  try {
    const res = await sb.from('somatic_log')
      .select('*')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(30);
    data = res.data || [];
  } catch (e) { console.warn('somatic load:', e); return; }

  // Heatmap
  const heatmap = document.getElementById('somaticHeatmap');
  if (heatmap) {
    const freq = {};
    data.forEach(r => { freq[r.region] = (freq[r.region] || 0) + 1; });
    const max = Math.max(1, ...Object.values(freq));
    heatmap.querySelectorAll('[data-region]').forEach(el => {
      const c = freq[el.dataset.region] || 0;
      const opacity = c ? 0.15 + (c / max) * 0.7 : 0;
      el.style.fill = `rgba(184,149,60,${opacity.toFixed(3)})`;
    });
  }

  // Son 5 kayıt
  const list = document.getElementById('somaticList');
  if (list) {
    if (!data.length) {
      list.innerHTML = `<div style="font-size:12px;color:var(--text-dim);font-style:italic;">${t('ui.no_scan_yet')}</div>`;
    } else {
      list.innerHTML = data.slice(0, 5).map(r => {
        const d = new Date(r.created_at).toLocaleDateString(S._currentLang || 'tr', { day: 'numeric', month: 'short' });
        const reg = getRegionLabels()[r.region] || r.region;
        const sen = getSensationLabels()[r.sensation] || r.sensation;
        const dots = '●'.repeat(r.intensity) + '○'.repeat(5 - r.intensity);
        return `<div class="somatic-row">
          <span class="sr-date">${d}</span>
          <span class="sr-sens">${reg} · ${sen}</span>
          <span class="sr-int">${dots}</span>
        </div>`;
      }).join('');
    }
  }
}

export function getSomaticContext() {
  const key = `etw_closure_${closureDayKey()}`;
  let data;
  data = SafeStorage.get(key); if (data === null) return '';
  if (!data?.region) return '';
  const reg = getRegionLabels()[data.region] || data.region;
  const sen = data.sensation ? (getSensationLabels()[data.sensation] || data.sensation) : null;
  const regionStr = reg + (sen ? ` — ${sen}` : '');
  const sensationStr = data.intensity ? ` (${data.intensity}/5)` : '';
  return p('prompt.somatic', { region: regionStr, sensation: sensationStr });
}

/* ═══════════════════════════════════════
   #8 İÇSEL PARÇA HARİTASI
   IFS tabanlı mesaj etiketleme + dashboard
═══════════════════════════════════════ */
export const PARTS_COLORS = {
  elestirel: '#C0392B',
  kacak:     '#E67E22',
  cocuk:     '#5A8AD8',
  koruyucu:  '#27AE60',
  gozlemci:  '#B8953C',
};

// PARTS artık dinamik — dil değişince label/desc güncellenir
export function getPart(key) {
  return {
    label: p('prompt.parts.' + key + '.label'),
    color: PARTS_COLORS[key] || '#888',
    desc:  p('prompt.parts.' + key + '.desc'),
  };
}
// Eski PARTS referansları için uyumluluk
export const PARTS = new Proxy({}, {
  get(_, key) { return PARTS_COLORS[key] ? getPart(key) : undefined; },
  has(_, key) { return key in PARTS_COLORS; },
  ownKeys() { return Object.keys(PARTS_COLORS); },
  getOwnPropertyDescriptor(_, key) {
    if (key in PARTS_COLORS) return { configurable: true, enumerable: true, value: getPart(key) };
  }
});

// PARTS_PROMPT → p('prompt.parts_analysis') — 13-dil desteği
export function getPartsPrompt() { return p('prompt.parts_analysis'); }

export async function analyzeMessagePart(text, msgDiv) {
  if (!text || text.length < 12 || !S.currentUser) return;
  try {
    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: `Mesaj: "${text.slice(0, 300)}"` }] }],
      systemPrompt: getPartsPrompt(),
      maxTokens: 60,
      temperature: 0.15,
      jsonMode: true,
      skipPersona: true,
    });

    let parsed;
    try { parsed = JSON.parse(raw); } catch { return; }
    const { part, confidence } = parsed;
    if (!PARTS[part]) return;

    _sessionPartsCounts[part] = (_sessionPartsCounts[part] || 0) + 1;

    // .msg-sender'daki direnç dotunun yanına İçsel Parça dot'u ekle
    if (msgDiv) {
      const dot = document.createElement('span');
      dot.className = 'msg-part-dot';
      dot.style.background = PARTS[part].color;
      dot.dataset.label = PARTS[part].label + (confidence === 'low' ? t('closure.low_confidence', ' · düşük güven') : '');
      dot.setAttribute('aria-label', PARTS[part].label);
      dot.onclick = function() { showToast(this.dataset.label); };
      const senderEl = msgDiv.querySelector('.msg-sender');
      if (senderEl) {
        const resistanceDot = senderEl.querySelector('.msg-resistance-dot');
        if (resistanceDot) resistanceDot.after(dot);
        else senderEl.prepend(dot);
      }
    }

    // DB'ye kaydet — başarısız olsa da UI etkilenmesin
    sb.from('parts_log').insert([{
      user_id: S.currentUser.id,
      session_id: S.currentSessId || null,
      part, confidence,
      excerpt: text.slice(0, 200),
    }]).then(({ error }) => {
      if (!error) loadPartsHistory();
    });
  } catch (e) { console.warn('parts analyze:', e); }
}

let _sessionPartsCounts = {};

export function getPartsContext() {
  const entries = Object.entries(_sessionPartsCounts);
  if (!entries.length) return '';
  const total = entries.reduce((s, [, c]) => s + c, 0);
  if (total < 2) return '';
  entries.sort((a, b) => b[1] - a[1]);
  const dominant = entries[0];
  const partDef = getPart(dominant[0]);
  if (!partDef) return '';
  const pct = Math.round((dominant[1] / total) * 100);
  const unit = p('prompt.parts_unit');
  const lines = entries.map(([k, c]) => {
    const pd = getPart(k);
    return pd ? `${pd.label}: ${c} ${unit}` : null;
  }).filter(Boolean).join(', ');
  return p('prompt.parts_context', { label: partDef.label, pct, desc: partDef.desc, distribution: lines });
}

const _sessionPartsCache = {};

export async function loadSessionParts(sessionId) {
  if (_sessionPartsCache[sessionId]) return _sessionPartsCache[sessionId];
  try {
    const { data } = await sb.from('parts_log')
      .select('part, confidence, excerpt')
      .eq('user_id', S.currentUser.id)
      .eq('session_id', sessionId);
    _sessionPartsCache[sessionId] = data || [];
  } catch { _sessionPartsCache[sessionId] = []; }
  return _sessionPartsCache[sessionId];
}

export async function applySessionPartDots(sessionId) {
  if (!sessionId || sessionId === 'legacy') return;
  const parts = await loadSessionParts(sessionId);
  if (!parts.length) return;
  const byExcerpt = {};
  parts.forEach(p => { byExcerpt[p.excerpt] = p; });
  document.querySelectorAll('#messages-area .message.user').forEach(div => {
    if (div.querySelector('.msg-part-dot')) return;
    const excerpt = div.dataset.excerpt;
    if (!excerpt) return;
    const found = byExcerpt[excerpt];
    if (!found || !PARTS[found.part]) return;
    const dot = document.createElement('span');
    dot.className = 'msg-part-dot';
    dot.style.background = PARTS[found.part].color;
    dot.dataset.label = PARTS[found.part].label + (found.confidence === 'low' ? t('closure.low_confidence', ' · düşük güven') : '');
    dot.setAttribute('aria-label', PARTS[found.part].label);
    dot.onclick = function() { showToast(this.dataset.label); };
    const senderEl = div.querySelector('.msg-sender');
    if (!senderEl) return;
    const resistanceDot = senderEl.querySelector('.msg-resistance-dot');
    if (resistanceDot) resistanceDot.after(dot);
    else senderEl.prepend(dot);
  });
}

let partsChartObj = null;

export async function loadPartsHistory() {
  if (!S.currentUser) return;
  let data = [];
  try {
    const res = await sb.from('parts_log')
      .select('part, created_at')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(100);
    data = res.data || [];
  } catch (e) { console.warn('parts load:', e); return; }
  renderPartsChart(data);
}

export function renderPartsChart(data) {
  const ctx = document.getElementById('partsChart');
  if (!ctx) return;

  const counts = {};
  Object.keys(PARTS).forEach(k => { counts[k] = 0; });
  data.forEach(r => { if (counts[r.part] !== undefined) counts[r.part]++; });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return;

  const keys   = Object.keys(PARTS);
  const labels = keys.map(k => PARTS[k].label);
  const values = keys.map(k => counts[k]);
  const colors = keys.map(k => PARTS[k].color);

  // Grafik motoru sidecar'dan (ext-chart.js) — ilk açılışta bir kez iner.
  // Legend/dominant DOM işleri senkron sürer; yalnız çizim motoru bekler.
  ensureExt('chart').then(({ Chart }) => {
  if (partsChartObj) partsChartObj.destroy();
  partsChartObj = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.map(c => c + 'AA'),
        borderColor: colors,
        borderWidth: 1.5,
        hoverBackgroundColor: colors.map(c => c + 'DD'),
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: c => ` ${c.label}: ${c.raw}` },
        },
      },
    },
  });
  }).catch(e => console.error('grafik motoru yüklenemedi:', e));

  // Legend
  const legend = document.getElementById('partsLegend');
  if (legend) {
    const sorted = keys.map(k => ({ k, count: counts[k] })).sort((a, b) => b.count - a.count);
    legend.innerHTML = sorted.filter(e => e.count > 0).map(({ k, count }) => `
      <div class="db-parts-legend-row">
        <div class="db-parts-legend-dot" style="background:${PARTS[k].color}"></div>
        <span class="db-parts-legend-name">${PARTS[k].label}</span>
        <span class="db-parts-legend-count">${count}</span>
      </div>`).join('');
  }

  // En baskın parça
  const dominant = document.getElementById('partsDominant');
  if (dominant && total > 0) {
    const top = keys.reduce((a, b) => counts[a] > counts[b] ? a : b);
    if (counts[top] > 0) {
      const pct = Math.round((counts[top] / total) * 100);
      dominant.textContent = `En aktif: ${PARTS[top].label} (%${pct})`;
    }
  }
}

/* ═══════════════════════════════════════
   #2 GEÇMİŞ BEN — TEKRAR EDEN TEMA
   Her 5. mesajda _narrativeMemory ile karşılaştırma.
   Aynı tema ≥14 gün önce de vardıysa geçmiş notu nazikçe hatırlatır.
═══════════════════════════════════════ */
export async function checkPastSelfEcho() {
  if (!S.currentUser || !S._narrativeMemory?.length) return;

  // Günde bir kez (çok sık çıkmasın)
  const rateKey = `etw_echo_${S.currentUser.id}_${nowTR().toDateString()}`;
  if (SafeStorage.getRaw(rateKey)) return;

  // 14 günden eski kayıtları filtrele
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const oldMemory = S._narrativeMemory.filter(m => new Date(m.date) < cutoff);
  if (oldMemory.length < 2) return; // yeterli geçmiş yok

  // Son 3 kullanıcı mesajını bağlam olarak ver
  const currentCtx = S._sessionUserMsgs.slice(-3).join(' ').slice(0, 500);

  const memCtx = oldMemory.slice(0, 8)
    .map(m => `[${m.date}]: ${m.note.slice(0, 250)}`)
    .join('\n\n');

  let raw;
  try {
    raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: p('prompt.echo.user', { currentCtx, memCtx }) }] }],
      systemPrompt: p('prompt.echo.system'),
      maxTokens: 160,
      temperature: 0.15,
      jsonMode: true,
      skipPersona: true,
    });
  } catch (e) { console.warn('echo check:', e); return; }

  let parsed;
  try { parsed = JSON.parse(raw); } catch { return; }
  if (!parsed?.echo || !parsed.excerpt || !parsed.date) return;

  // Rate limit yaz
  SafeStorage.setRaw(rateKey, '1');

  const dateStr = (() => {
    try {
      return new Date(parsed.date).toLocaleDateString(S._currentLang || 'tr', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return parsed.date; }
  })();

  const msg = `*${dateStr}:*\n\n> "${parsed.excerpt}"\n\n**${t('closure.what_changed', 'Değişen ne?')}**`;

  setTimeout(() => {
    appendMsg('emre', msg, 'mode-direct past-self-echo');
    S.chatHistory.push({ role: 'assistant', content: msg, mode: 'mode-direct' });
    if (S.currentSessId) {
      S.allSessions[S.currentSessId] = S.allSessions[S.currentSessId] || [];
      S.allSessions[S.currentSessId].push({ role: 'assistant', content: msg, created_at: new Date().toISOString() });
      sb.from('chat_history').insert([{
        user_id: S.currentUser.id, session_id: S.currentSessId,
        role: 'assistant', content: msg, mode: 'mode-direct',
      }]).catch(() => {});
    }
  }, 1400); // AI cevabından kısa süre sonra ayrı mesaj olarak gelsin
}

