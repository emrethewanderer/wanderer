import { S } from '../state.js';
import { AI_MODES } from '../config.js';
import { STORAGE_KEYS, SafeStorage, SecureStorage, AnimUtils, escapeHTML, showToast, localISODate, localDayKey } from './00a-infrastructure.js';
import { t, getCurrentLanguage } from './15-i18n.js';
import { dp, dpAll, p } from './16-i18n-prompts.js';
import { switchViewHooks } from './03-auth-shell.js';
import { appendMsgHooks, sendMessageHooks, startStreamingFinalizeHooks, sendMessage } from './06-summary-chat.js';
import { updateModeBadge as _origUpdateModeBadge, nowTR, onModeBadgeUpdate, resolveCommitment, getCleanCommitments, getAllMessages } from './00-config-tracking.js';
import { awardElmas } from './10g-w2-wanderer-game.js';
import { showMicroOnboardingHooks } from './09-reports-tracks.js';
import { w2RenderInfiniteChatHooks } from './11-w2-chat-cal.js';
import { callLLM } from './04-llm-hero-history.js';
import { SUMMARY_MODEL } from '../config.js';
import { isClosureDoneToday, appendEODClosureCard, startDayClosedCountdown, stopDayClosedCountdown } from './05-closure-parts.js';
import { loadYolculukHaritasi } from './02-features-onboarding.js';
import { w3GetDayKey } from './12-w3-journey.js';
import { getSuggestedArchetype, wsArchFigure } from './12a-archetypes.js';
import { dgKapi, dgYanilmaKonustu, dgIklimKaydet } from './13D-duygu-motoru.js';

import { autoResize } from './08-trends-payment.js';

export function chatOpenerDismiss() {
  const card = document.getElementById('chat-opener-card');
  if (!card) return;
  if (AnimUtils.prefersReducedMotion()) { card.remove(); return; }
  card.style.transition = 'opacity 0.4s, transform 0.4s';
  card.style.opacity = '0';
  card.style.transform = 'translateY(-8px)';
  setTimeout(() => card.remove(), 400);
}

export function chatOpenerRender(area) {
  if (!area) return;
  // Varsa eski kartı kaldır
  const existing = document.getElementById('chat-opener-card');
  if (existing) existing.remove();

  const overlay = document.querySelector('#hero-container .session-hero-overlay');
  if (!overlay || overlay.querySelector('.session-hero-today-btn')) return;

  const now = new Date();
  const locale = getCurrentLanguage();
  const dateStr = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const todayLabel = t('chat.today', 'Bugün');

  const btn = document.createElement('div');
  btn.className = 'session-hero-today-btn';
  btn.dataset.i18nToday = '1';
  btn.textContent = todayLabel + ' · ' + dateStr;
  overlay.insertBefore(btn, overlay.firstChild);
}

window.addEventListener('i18nchange', function() {
  const btn = document.querySelector('.session-hero-today-btn[data-i18n-today]');
  if (!btn) return;
  const locale = getCurrentLanguage();
  const now = new Date();
  const dateStr = now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const todayLabel = t('chat.today', 'Bugün');
  btn.textContent = todayLabel + ' · ' + dateStr;
});

export function chatOpenerDismissAndSave() {
  SafeStorage.setRaw(STORAGE_KEYS.OPENER_DISMISSED(nowTR().toDateString()), '1');
  chatOpenerDismiss();
}

/* ═══════════════════════════════════════
   ÖZELLİK 3 — HAFTALIK SERİ ŞERİDİ
═══════════════════════════════════════ */
export function renderStreakBar() {
  const now = new Date();

  const allMsgs = Object.values(S.allSessions || {}).flat();

  // Son 7 günü kontrol et (bugün dahil, geriye doğru)
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = localDayKey(d);
    const hasMsg = allMsgs.some(m => {
      if (!m.created_at || m.role !== 'user') return false;
      const md = new Date(m.created_at);
      return localDayKey(md) === key;
    });
    days.push({ isToday: i === 0, hasMsg });
  }

  /* Yeni topbar-entegre şerit */
  days.forEach((day, idx) => {
    const el = document.getElementById('tsd-' + idx);
    if (!el) return;
    el.className = 'w2-topbar-streak-day';
    if (day.isToday) el.classList.add('today');
    else if (day.hasMsg) el.classList.add('done');
  });

  /* Eski standalone bar (display:none ama yine de güncelle — güvenlik için) */
  days.forEach((day, idx) => {
    const el = document.getElementById('sd-' + idx);
    if (!el) return;
    el.className = 'streak-day';
    if (day.isToday) el.classList.add('today');
    else if (day.hasMsg) el.classList.add('done');
  });
}

/* Quick Reply Chips kaldırıldı — hiç etkinleştirilmemişti. */
function qrMaybeShow() { return; }

/* ═══════════════════════════════════════
   ÖZELLİK 5 — SESSİZLİK SATIRI (KALDIRILDI)
   Yerini 13o-geri-cagri (Geri Çağrı Motoru) aldı:
   rastgele 4 cümlelik chip + 180s Emre balonu yerine
   Kişiselleştirme Motoru'nu (P1-P6) + bugünkü konuyu
   esas alan, LLM-üretimli tek kişisel davet.
═══════════════════════════════════════ */

/* ═══════════════════════════════════════
   ÖZELLİK 6 — ALINTI BALONU
   (CSS'de blockquote stili zaten tanımlı;
    alıntı metin kullanıcı tarafından >
    ile gönderilince marked.js otomatik
    işliyor — ek JS gerekmez)
═══════════════════════════════════════ */

/* ═══════════════════════════════════════
   HOOK'LAR — Faz 2.1: monkey-patching söküm pattern
   appendMsg / sendMessage / w2RenderInfiniteChat / showMicroOnboarding
   artık orijinal modüllerden direkt çağrılır; ek davranışlar burada
   registerChatHooks/registerW2Hooks ile kaydedilir (14-boot.js).
═══════════════════════════════════════ */

/* appendMsg + sendMessage + w2RenderInfiniteChat + showMicroOnboarding
   + startStreamingMsg.finalize + switchView hook'ları (Faz 2.1+2.1b) */
export function registerChatHooks() {
  appendMsgHooks.after((div, role, text) => {
    if (role !== 'user') setTimeout(() => qrMaybeShow(text, div), 800);
    // Mühürlemeden gelen kullanıcı balonu altın bir parıltıyla yerleşir
    if (role === 'user' && S._icJustSealed) {
      S._icJustSealed = false;
      div.classList.add('ma-land');
      setTimeout(() => div.classList.remove('ma-land'), 1000);
    }
    try { window.gcSchedule?.(); } catch (_) {}
  });
  sendMessageHooks.before(() => {
    document.querySelectorAll('.quick-replies').forEach(el => el.remove());
    try { window.gcCancel?.(); } catch (_) {}
    // Tanıma Motoru (FAZ 2, İ3) — kapalı döngü: bekleyen bir Geri Çağrı
    // balonu varsa bu mesaj onun cevabıdır (yeni hook YOK, mevcut nokta).
    try { window.gcResolvePending?.(); } catch (_) {}
  });
  w2RenderInfiniteChatHooks.after(() => {
    setTimeout(renderStreakBar, 200);
    const area = document.getElementById('messages-area');
    if (area) setTimeout(() => chatOpenerRender(area), 300);
  });
  showMicroOnboardingHooks.after(() => {
    setTimeout(() => {
      try {
        w3RequestNotificationPermission().then(r => {
          if (r === 'granted') showToast(t('toast.notifications_on'));
        });
      } catch (_) {}
    }, 1200);
    // Fiyatlandırma v2 — Portre armağanının HEMEN ardından İlk Kapı (1₺)
    // ya da Yedi Eşik (7 gün) teklifi (plan md.5: önce ver, sonra iste).
    // Yalnız Free katmanı ve uygun teklif varsa görünür; aksi hâlde no-op.
    setTimeout(() => { try { window.openGateOverlay?.(); } catch (_) {} }, 2000);
  });
  // startStreamingMsg.finalize — QR + geri-çağrı zamanlayıcı + breathing + atmosfer
  startStreamingFinalizeHooks.after((div, finalText) => {
    setTimeout(() => qrMaybeShow(finalText || '', div), 900);
    try { window.gcSchedule?.(); } catch (_) {}
    const sb3 = document.getElementById('send-btn');
    if (sb3 && !sb3.disabled) setTimeout(() => sb3.classList.add('breathing'), 400);
    setTimeout(asRefresh, 800);
    // Ritüel modu — Emre'nin sözü bitince kartı yeniden aç, döngüyü sürdür
    icMaybeRitualReopen(div);
  });
  // switchView — chat→history redirect (closure done) + post-switch UI effects
  switchViewHooks.before((v, ctx) => {
    // history-view artık HTML'de yok; kapanış tamamlandıysa chat'e geçişe
    // izin ver, sonrasında EOD kartını ve geri sayımı chat içinde göster.
    void ctx;
  });
  switchViewHooks.after((v) => {
    if (v === 'chat') {
      setTimeout(asBaslat, 400);
      setTimeout(renderStreakBar, 300);
      const area = document.getElementById('messages-area');
      setTimeout(() => chatOpenerRender(area), 500);
      try { window.gcSchedule?.(); } catch (_) {}
      setTimeout(() => window.breathUpdate && window.breathUpdate(), 100);
      if (isClosureDoneToday()) {
        setTimeout(() => { appendEODClosureCard(); startDayClosedCountdown(); }, 600);
      } else if (nowTR().getHours() >= 21) {
        // Akşam 21:00–00:00: Wanderer LLM'e her girişte Akşam Kapanışı geçidi
        // belirir (atRun kendi _applicable/_blocked guard'larıyla yeniden kontrol eder).
        setTimeout(() => { try { window.atRun?.(false); } catch (_) {} }, 1400);
      }
    /* `journey` dalı SÖKÜLDÜ (FAZ 8): hedefi `#w3-journey-chapters`'tı, o
       kabuk DOM'da yok ve `journey` ALLOWED_VIEWS'ta da değil. Dönüşüm
       Hattı artık Derin Çalışma'nın içinde (`#dc-hat`). */
    } else if (v === 'gezgin' || v === 'yolculuk') {
      loadYolculukHaritasi();
    } else {
      try { window.gcCancel?.(); } catch (_) {}
    }
    if (v === 'bugun') {
      // Gün-kapandı bandı Bugün'de GÖSTERİLMEZ — yalnız Sohbet'e ait bir bildirimdir
      // ("bu mesajlar Özet'e eklenmez" Bugün'de mesaj composer'ı olmadığından anlamsız).
      // Bugün'e her girişte eski bandı temizle ki Sohbet'ten kalan kopya sızmasın.
      stopDayClosedCountdown();
      if (!isClosureDoneToday() && nowTR().getHours() >= 21) {
        // Akşam 21:00–00:00: Bugün ekranına her girişte de Akşam Kapanışı geçidi
        // belirir (Sohbet ile aynı sözleşme; atRun guard'larıyla yeniden kontrol eder).
        setTimeout(() => { try { window.atRun?.(false); } catch (_) {} }, 1400);
      }
    }
  });
}

// startStreamingMsg.finalize hook'u registerChatHooks() içinde kaydedilir (Faz 2.1b).

// switchView hook'u registerChatHooks() içinde kaydedilir (Faz 2.1b).

// w2RenderInfiniteChat hook'u registerChatHooks() içinde kaydedilir (Faz 2.1).

/* chat-input focus/input → Geri Çağrı timer'ı sıfırla (13o) */
document.addEventListener('DOMContentLoaded', () => {
  const inp = document.getElementById('chat-input');
  if (inp) {
    const cancel = () => { try { window.gcCancel?.(); } catch (_) {} };
    inp.addEventListener('focus', cancel);
    inp.addEventListener('input', () => { if (inp.value.trim()) cancel(); });
  }

  // Nefes çizgisi + input card sistemi — çizgi yalnızca konuşma akışında
  // görünür (llm-home'da CSS gizler, görünürlük 10y/llmSyncHome'dan eşlenir);
  // dokununca Ritüel Kartı açılır.
  const pill = document.getElementById('breath-pill');
  if (pill) {
    pill.addEventListener('click', () => icOpen());
    pill.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); icOpen(); }
    });

    window.breathUpdate = function() {
      if (!document.getElementById('ic-overlay')?.classList.contains('open')) {
        pill.classList.add('visible');
      }
    };
  }
});

/* ═══════════════════════════════════════
   INPUT CARD SİSTEMİ — Ritüel Kartı
   Her mesaj bir ritüel: Emre'nin sözü kartın içinde belirir,
   kullanıcı oraya yazar, ikisi de arka plandaki sohbete "mühürlenir".
═══════════════════════════════════════ */

// Ritüel modu: Emre yanıtladığında kart kendiliğinden yeniden açılır.
// Dil modeli kabuğuyla (10y) birlikte varsayılan KAPALI — yanıtlar sohbet
// akışında, claude.ai gibi akar; ritüeli isteyen toggle ile açar ('1').
const IC_RITUAL_KEY = 'wndr_ritual_mode';
let _icRitualMode = SafeStorage.getRaw(IC_RITUAL_KEY) === '1';

// Sohbetteki son Emre mesajı elemanı — typing göstergesi hariç
function _icLastEmreEl() {
  const area = document.getElementById('messages-area');
  if (!area) return null;
  const emres = area.querySelectorAll('.message.emre');
  for (let i = emres.length - 1; i >= 0; i--) {
    if (emres[i].id === 'typing-msg') continue;
    if (emres[i].querySelector('.msg-content, .stream-text')) return emres[i];
  }
  return null;
}

// Emre'nin sözünü kartın üstüne yerleştir; kaynak yoksa kartı sade input'a düşür
function _icPopulateEmre(emreEl) {
  const card     = document.getElementById('ic-card');
  const textEl   = document.getElementById('ic-emre-text');
  const senderEl = document.getElementById('ic-emre-sender');
  if (!card || !textEl) return false;

  const src = (emreEl && typeof emreEl.querySelector === 'function') ? emreEl : _icLastEmreEl();
  const content = src && src.querySelector('.msg-content, .stream-text');
  if (!content) { card.classList.remove('has-emre'); textEl.innerHTML = ''; return false; }

  textEl.innerHTML = content.innerHTML;
  const senderSrc = src.querySelector('.msg-sender');
  if (senderEl && senderSrc && senderSrc.textContent.trim()) senderEl.textContent = senderSrc.textContent.trim();
  card.classList.add('has-emre');
  return true;
}

export function icRitualToggle() {
  _icRitualMode = !_icRitualMode;
  SafeStorage.setRaw(IC_RITUAL_KEY, _icRitualMode ? '1' : '0');
  icSyncRitualToggle();
  showToast(_icRitualMode ? t('toast.ritual_on', 'Ritüel modu açık · her yanıttan sonra kart açılır')
                          : t('toast.ritual_off', 'Ritüel modu kapalı'));
}

export function icSyncRitualToggle() {
  const btn = document.getElementById('ic-ritual-toggle');
  if (btn) btn.setAttribute('aria-pressed', _icRitualMode ? 'true' : 'false');
}

export function icOpen(emreEl = null) {
  const overlay = document.getElementById('ic-overlay');
  const card    = document.getElementById('ic-card');
  const ta      = document.getElementById('ic-textarea');
  const pill    = document.getElementById('breath-pill');
  if (!overlay || !ta) return;

  const hasEmre = _icPopulateEmre(emreEl);
  icSyncRitualToggle();
  window.fmRenderControls?.();   // İç Card ayağındaki model düğmesini güncele

  // Kart composer'ı ön yüzdeki composer'ın aynısıdır — Model Stüdyosu'nun
  // yazdığı özel cümle (10y, fmInputPlaceholder) orada placeholder'a akıyor;
  // burada onu AYNALARIZ ki iki yüzde iki farklı davet cümlesi görünmesin.
  // chat-input henüz hidrasyon görmediyse HTML'deki data-i18n-ph değeri kalır.
  const frontPh = document.getElementById('chat-input')?.placeholder;
  if (frontPh) ta.placeholder = frontPh;

  ta.value = '';
  ta.style.height = 'auto';
  card.classList.remove('closing');
  overlay.classList.add('open');
  if (pill) pill.classList.remove('visible');

  const emreBox = document.getElementById('ic-emre');
  if (emreBox) emreBox.scrollTop = 0;

  setTimeout(() => ta.focus(), 60);
  // Emre'nin sözü görünürken kart kendiliğinden kapanmaz — ritüel bölünmesin
  if (!hasEmre) icStartCountdown();
}

// Finalize — Emre'nin sözü kartta belirir, kullanıcı girişi geri gelir; döngü sürer.
export function icMaybeRitualReopen(emreEl) {
  if (!_icRitualMode) return;
  const chatView = document.getElementById('chat-view');
  if (!chatView || !chatView.classList.contains('active')) return;

  const overlay = document.getElementById('ic-overlay');
  const card    = document.getElementById('ic-card');
  if (!overlay || !card) return;

  const fill = () => {
    if (document.querySelector('.overlay.open')) return; // başka modal araya girdiyse iptal
    card.classList.remove('ic-awaiting');
    _icPopulateEmre(emreEl);
    icSyncRitualToggle();
    if (!overlay.classList.contains('open')) {
      overlay.classList.add('open');
      const pill = document.getElementById('breath-pill');
      if (pill) pill.classList.remove('visible');
    }
    // Emre metni usulca belirsin (icEmreBloom'u yeniden tetikle)
    const textEl = document.getElementById('ic-emre-text');
    if (textEl) { textEl.style.animation = 'none'; void textEl.offsetWidth; textEl.style.animation = ''; }
    const ta = document.getElementById('ic-textarea');
    if (ta) { ta.value = ''; ta.style.height = 'auto'; setTimeout(() => ta.focus(), 90); }
  };

  // Bekleme sahnesi açıksa hemen doldur; kapalıysa (yedek yol) kısa nefesle aç
  if (overlay.classList.contains('open') && card.classList.contains('ic-awaiting')) {
    setTimeout(fill, 240);
  } else if (!overlay.classList.contains('open') && !document.querySelector('.overlay.open')) {
    setTimeout(fill, 320);
  }
}

export function icClose() {
  const overlay = document.getElementById('ic-overlay');
  const card    = document.getElementById('ic-card');
  const pill    = document.getElementById('breath-pill');
  if (!overlay) return;

  clearTimeout(S._icAutoCloseTimer);
  clearInterval(S._icCountdownInterval);
  S._icAutoCloseTimer = null;
  S._icCountdownInterval = null;

  const countdown = document.getElementById('ic-countdown');
  if (countdown) { countdown.textContent = ''; countdown.classList.remove('urgent'); }

  card.classList.add('closing');
  setTimeout(() => {
    overlay.classList.remove('open');
    card.classList.remove('closing');
    if (pill) pill.classList.add('visible');
  }, 180);
}

export function icOverlayClick(e) {
  if (e.target === document.getElementById('ic-overlay')) icClose();
}

export function icSend() {
  const ta  = document.getElementById('ic-textarea');
  const inp = document.getElementById('chat-input');
  if (!ta || !inp || !ta.value.trim()) return;

  inp.value = ta.value;
  autoResize(inp);

  const overlay = document.getElementById('ic-overlay');
  const card    = document.getElementById('ic-card');

  // Mühürleme geçişi — kart sözleri arka plandaki sohbete süzülerek bırakır
  if (card && overlay && !AnimUtils.prefersReducedMotion()) {
    clearTimeout(S._icAutoCloseTimer);
    clearInterval(S._icCountdownInterval);
    const countdown = document.getElementById('ic-countdown');
    if (countdown) { countdown.textContent = ''; countdown.classList.remove('urgent'); }
    card.classList.remove('closing');
    card.classList.add('sealing');
    overlay.classList.add('sealing');
    S._icJustSealed = true; // sendMessage'in ekleyeceği kullanıcı balonu altın yerleşme parıltısı alsın
    setTimeout(() => {
      overlay.classList.remove('open', 'sealing');
      card.classList.remove('sealing', 'has-emre');
      // Ritüel modu kapalıysa nefes çizgisi geri gelsin; açıksa kart kendiliğinden açılacak
      const pill = document.getElementById('breath-pill');
      if (pill && !_icRitualMode) pill.classList.add('visible');
      sendMessage();
    }, 440);
  } else {
    icClose();
    setTimeout(() => sendMessage(), 20);
  }
}

export function icHandleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); icSend(); }
  if (e.key === 'Escape') icClose();
}

export function icHandleInput(el) {
  // Otomatik yükseklik
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 220) + 'px';
  // Yazı varsa sayacı sıfırla
  icStartCountdown();
}

function icStartCountdown() {
  clearTimeout(S._icAutoCloseTimer);
  clearInterval(S._icCountdownInterval);

  const countdown = document.getElementById('ic-countdown');
  const ta = document.getElementById('ic-textarea');
  let remaining = 10;

  function tick() {
    remaining--;
    const hasText = ta && ta.value.trim().length > 0;
    if (hasText) {
      // Yazı varsa sayacı gizle, yeniden başlat
      if (countdown) { countdown.textContent = ''; countdown.classList.remove('urgent'); }
      clearInterval(S._icCountdownInterval);
      S._icCountdownInterval = null;
      S._icAutoCloseTimer = setTimeout(icClose, 30000); // 30s yazılı haldeyse
      return;
    }
    if (remaining <= 3) {
      if (countdown) {
        countdown.textContent = remaining + 's';
        countdown.classList.toggle('urgent', remaining <= 2);
      }
    }
    if (remaining <= 0) {
      clearInterval(S._icCountdownInterval);
      icClose();
    }
  }

  if (countdown) { countdown.textContent = ''; countdown.classList.remove('urgent'); }
  S._icCountdownInterval = setInterval(tick, 1000);
  // Yazısız 10 saniye sonra kapat
  if (!ta || !ta.value.trim()) {
    S._icAutoCloseTimer = setTimeout(icClose, 10000);
  }
}

/* ═══════════════════════════════════════
   ATMOSFERŞERİDİ SİSTEMİ
═══════════════════════════════════════ */
// Tone → atmosphere word mapping — keys match LLM tone output (normalized lowercase)
export const AS_TONE_MAP = {
  // TR tones
  'direniş': 'yüksek', 'farkındalık': 'normal', 'öfke': 'yüksek', 'sakin': 'normal',
  'kaygı': 'yüksek', 'cesaret': 'yüksek', 'hüzün': 'normal', 'kararlılık': 'yüksek',
  'kırılma': 'kritik', 'dönüş': 'yüksek', 'kaçış': 'kritik', 'hayal kırıklığı': 'yüksek',
  // EN tones
  'resistance': 'yüksek', 'awareness': 'normal', 'anger': 'yüksek', 'calm': 'normal',
  'anxiety': 'yüksek', 'courage': 'yüksek', 'sadness': 'normal', 'determination': 'yüksek',
  'breakthrough': 'kritik', 'return': 'yüksek', 'escape': 'kritik', 'disappointment': 'yüksek',
  // DE tones
  'widerstand': 'yüksek', 'bewusstsein': 'normal', 'wut': 'yüksek', 'ruhe': 'normal',
  'angst': 'yüksek', 'mut': 'yüksek', 'trauer': 'normal', 'entschlossenheit': 'yüksek',
};
function getAsTonlar() {
  return {
    'resistance':     { kelime: t('atmo.resistance', 'direnç'),     intensity: 'yüksek' },
    'awareness':      { kelime: t('atmo.awareness', 'uyanış'),      intensity: 'normal' },
    'anger':          { kelime: t('atmo.anger', 'öfke'),             intensity: 'yüksek' },
    'calm':           { kelime: t('atmo.calm', 'sessizlik'),         intensity: 'normal' },
    'anxiety':        { kelime: t('atmo.anxiety', 'gerginlik'),      intensity: 'yüksek' },
    'courage':        { kelime: t('atmo.courage', 'cesaret'),        intensity: 'yüksek' },
    'sadness':        { kelime: t('atmo.sadness', 'yas'),            intensity: 'normal' },
    'determination':  { kelime: t('atmo.determination', 'odak'),     intensity: 'yüksek' },
    'breakthrough':   { kelime: t('atmo.breakthrough', 'kırılma'),   intensity: 'kritik' },
    'return':         { kelime: t('atmo.return', 'dönüş'),           intensity: 'yüksek' },
    'escape':         { kelime: t('atmo.escape', 'kaçış'),           intensity: 'kritik' },
    'disappointment': { kelime: t('atmo.disappointment', 'hayal kırıklığı'), intensity: 'yüksek' },
  };
}
function getAsVarsayilan() {
  return [
    t('atmo.serenity', 'dinginlik'),
    t('atmo.anticipation', 'beklenti'),
    t('atmo.calm', 'sessizlik'),
    t('atmo.void', 'boşluk'),
    t('atmo.preparation', 'hazırlık')
  ];
}

/* ══════════════════════════════════════════
   VESPER — gün içi ilerleme halkası
   00:00 → 21:00 arası dolar, 21:00'de tıklanabilir
══════════════════════════════════════════ */
export const VESPER_UNLOCK_HOUR = 21; // 21:00
export const VESPER_CIRCUMFERENCE = 2 * Math.PI * 19; // ≈ 119.38 (r=19)

export function vesperProgress() {
  const now = nowTR();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const total   = VESPER_UNLOCK_HOUR * 60;
  return Math.min(1, minutes / total);
}

export function vesperUpdate() {
  const arcs = [
    document.getElementById('vesper-arc'),
    document.getElementById('vesper-arc-f')
  ].filter(Boolean);
  if (!arcs.length) return;
  const prog   = vesperProgress();
  const offset = VESPER_CIRCUMFERENCE * (1 - prog);
  const ready  = prog >= 1;
  arcs.forEach(arc => {
    arc.style.strokeDashoffset = offset;
    if (ready) {
      arc.classList.add('ready');
    } else {
      arc.classList.remove('ready');
      arc.style.stroke = `rgba(184,149,60,${(0.25 + 0.75 * prog).toFixed(2)})`;
    }
  });
  // Wrapper'a ready class ekle — sheen CSS'i buna göre değişir
  const wrap = document.querySelector('.w2-vesper-wrap');
  if (wrap) wrap.classList.toggle('ready', ready);
}

export function vesperTap() {
  // Gün Kapanışı (Ruh → Beden → Özet) artık buradan değil, Akşam Kapanış
  // Töreni'ndeki "Günü Kapat" köprüsünden açılır. Bu seri halkası tıklanınca
  // Üç Mühür "Yol" ekranına götürür (halkanın yeni anlamı: zincir/yolculuk).
  try {
    if (typeof window.yolOpen === 'function') { window.yolOpen(); return; }
    if (typeof window.smOpenCollection === 'function') { window.smOpenCollection(); return; }
  } catch (_) {}
}

(function initVesper() {
  function boot() {
    vesperUpdate();
    // Her dakika güncelle
    setInterval(vesperUpdate, 60 * 1000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    // type=module script defer edildiğinden burası modül-eval sırasında çalışır;
    // boot() içindeki nowTR() başka bir modülün const'ına (_TZ) bağlı → TDZ riski.
    // Tüm modüller init olduktan sonra çalışsın diye bir tık ertele.
    setTimeout(boot, 0);
  }
})();

/* ══════════════════════════════════════════
   DİRENÇ NOKTASI — kullanıcı mesajlarında
══════════════════════════════════════════ */
export function msgIntensityLevel(text) {
  if (dp('detect.intensity.high').some(r => r.test(text)))     return 5;
  if (dp('detect.intensity.medium').some(r => r.test(text)))   return 3;
  if (dp('detect.intensity.positive').some(r => r.test(text))) return 1;
  return 2;
}

export function msgResistanceDotHTML(text) {
  const level = msgIntensityLevel(text);
  const colorMap = { 5: '#C0392B', 3: '#B8953C', 2: 'rgba(138,136,127,0.5)', 1: '#5BB97B' };
  const labelMap = { 5: t('resistance.high'), 3: t('resistance.medium'), 2: t('resistance.neutral'), 1: t('resistance.positive') };
  const color = colorMap[level];
  const label = escapeHTML(labelMap[level]);
  return `<span class="msg-resistance-dot" style="background:${color}" data-label="${label}" onclick="msgResistanceDotClick(this)" aria-label="${label}"></span>`;
}

export function msgResistanceDotClick(el) {
  showToast(el.dataset.label || t('resistance.unknown'));
}

export function asGuncelle(yeniKelime, intensity = 'normal') {
  const el = document.getElementById('as-aktif-kelime');
  if (!el) return;
  if (el.textContent.trim() === yeniKelime) return;
  el.classList.remove('as-in');
  el.classList.add('as-out');
  setTimeout(() => {
    el.textContent = yeniKelime;
    el.dataset.intensity = intensity;
    el.classList.remove('as-out');
    el.classList.add('as-in');
  }, 600);
}

function asKelimeSecFromTon(tonStr) {
  if (!tonStr) return null;
  const lc = tonStr.toLowerCase();
  // Check tone map for intensity
  const intensity = AS_TONE_MAP[lc] || 'normal';
  // Look up display word from getAsTonlar
  const tonlar = getAsTonlar();
  for (const [key, val] of Object.entries(tonlar)) {
    if (lc.includes(key.toLowerCase()) || key.toLowerCase().includes(lc)) return val;
  }
  return { kelime: lc, intensity };
}

export async function asTonYukle() {
  try {
    const map = S._w2SummariesCache;
    if (!map || !map.size) return null;
    const todayKey = w3GetDayKey(new Date());
    const todaySums = map.get(todayKey);
    if (todaySums && todaySums.length && todaySums[0].tone) return asKelimeSecFromTon(todaySums[0].tone);
    const sorted = Array.from(map.keys()).sort().reverse();
    for (const key of sorted) {
      const sums = map.get(key);
      if (sums && sums.length && sums[0].tone) return asKelimeSecFromTon(sums[0].tone);
    }
  } catch (e) { console.warn('atmosfer tonu yüklenemedi:', e); }
  return null;
}

function asModedenTon() {
  if (typeof S.currentAIMode === 'undefined') return null;
  const modeMap = {
    'direct':      { kelime: t('atmo.confrontation', 'yüzleşme'),  intensity: 'kritik'  },
    'reflective':  { kelime: t('atmo.discovery', 'keşif'),          intensity: 'normal'  },
    'celebrate':   { kelime: t('atmo.victory', 'zafer'),            intensity: 'yüksek'  },
  };
  for (const [key, val] of Object.entries(modeMap)) {
    if (S.currentAIMode && S.currentAIMode.includes(key)) return val;
  }
  return null;
}

/* DUYGU MOTORU OKUMASI (13D K10, FAZ 16) — hâlin adı, karşılamanın adı
   DEĞİL (K7: duygu söylenmez, davranılır; K12: kimlik iddiası yasak).
   Eksen kelimesiyle BİREBİR aynı değil: motor berraklığa davet ediyorsa
   hava henüz bulanıktır, şerit "bulanıklık" yazar. Tablo plan FAZ 16'da
   karara bağlandı, burada İCAT EDİLMEDİ. `tutma` (kriz) burada bilerek
   YOK — K9 krizi sohbete verir dekora değil, `asRefresh` bu ekseni
   tanımadığı için mevcut kelimeye hiç dokunmaz. */
function _dgAtmosferKelime(eksen) {
  const KELIME = {
    taniklik:   t('atmo.dg.taniklik', 'sessizlik'),
    yatistirma: t('atmo.dg.yatistirma', 'yoğunluk'),
    sahiplenme: t('atmo.dg.sahiplenme', 'ağırlık'),
    berraklik:  t('atmo.dg.berraklik', 'bulanıklık'),
    diriltme:   t('atmo.dg.diriltme', 'durgunluk'),
    kutlama:    t('atmo.dg.kutlama', 'aydınlık'),
  };
  return KELIME[eksen] || null;
}

/** `dgKapi('atmosfer', …)` TEK kapıdır — `dgNabiz`/`S._dgIklim` burada
 *  DOĞRUDAN okunmaz (K10). Kanıt yoksa (bu turda ölçüm/beyan yok) `null`
 *  döner ve `asRefresh` zincirin geri kalanına (mod → özet → saat) düşer;
 *  bu, sohbetin dışında hiç konuşulmamış bir uygulamada varsayılan
 *  hâldir — motor kendini tanıtmadan önce sessiz kalır. */
function asDuyguTonu() {
  const okuma = dgKapi('atmosfer', {
    nabiz: S._dgNabiz || null,
    iklim: S._dgIklim || null,
    /* TAZELİK DAMGASI (FAZ 19) — atmosferin eşiği 'anlik'ten 'dk90'a
       çekildi; `dk90` damgasız okumayı taze SAYMAZ, yani bu alan
       geçilmezse şerit hiç konuşmaz. Kasıtlı: şerit sohbetin dışında,
       başka bir ekranda yaşar ve saatlik zamanlayıcıyla tazelenir —
       "üç saat önce ölçülen hâl" tam da burada eskiyordu. */
    zaman: S._dgNabizZaman || null,
    akis: { yon: S._dgYay, gecmis: S._dgSonKarsilama },
  });
  if (!okuma || okuma.eksen === 'tutma') return null;
  const kelime = _dgAtmosferKelime(okuma.eksen);
  // `eksen` çıktıda taşınır: teslim anında Gözlemevi'ne hangi eksenin
  // konuştuğu yazılır (00f wtLogDuygu). Kelime tek başına ekseni geri
  // vermez — iki eksen aynı kelimeye düşebilir.
  return kelime ? { kelime, intensity: 'normal', eksen: okuma.eksen } : null;
}

export async function asRefresh() {
  /* ÖNCELİK: duygu okuması zincirin EN ÜSTÜNE girer — mod ve özet tonu
     günün geneline bakar, Nabız BU ANA bakar (FAZ 16 gerekçesi). Okuma
     yoksa (null) hiçbir fallback SÖKÜLMEZ: mod → özet → saat-varsayılanı
     aynen bugünkü gibi çalışmaya devam eder. */
  const dgTonu = asDuyguTonu();
  if (dgTonu) {
    /* AYNI KELİME İKİNCİ KEZ TESLİM DEĞİLDİR (faz denetimi, 2026-08-30).
       `asRefresh` saatte bir (asBaslat), her mod rozeti güncellemesinde ve
       her akış bitişinde yeniden koşar; `asGuncelle` kelime değişmediyse
       ekrana zaten HİÇ dokunmaz (erken return). Damga koşulsuz basılınca
       "konuştu" sayacı teslimi değil TAZELEMEYİ sayıyordu — bir okuma beş
       saatte beş kez konuşmuş görünüyor, Gözlemevi'nin yanılma oranının
       paydası şişiyordu (§6.10: teslim edilmeyen söz verilmiş sayılmaz;
       FAZ 15 denetiminin aynı dersi). Zincirin en alt dalı bu guard'ı
       zaten taşıyor — duygu dalı da aynı ölçüye tabi.
       DAMGA (K13) yalnız kelime GERÇEKTEN değiştiğinde; iklim hidre
       değilse (S._dgIklim null) yazacak defter yoktur — 01-prompts-
       modes.js:344 ile AYNI guard. */
    if (S._asAktifTon !== dgTonu.kelime) {
      asGuncelle(dgTonu.kelime, dgTonu.intensity);
      S._asAktifTon = dgTonu.kelime;
      if (S._dgIklim) {
        S._dgIklim = dgYanilmaKonustu(S._dgIklim, 'atmosfer');
        dgIklimKaydet(S._dgIklim);
      }
      /* İKİNCİ DEFTER (00f wtLogDuygu) — gerekçe kanalın kendi evinde
         (00f-kullanim-nabzi.js, `_DG_YUZEY`); kapı: 13D-iki-defter-kapisi. */
      try { window.wtLogDuygu?.(dgTonu.eksen, { yuzey: 'atmosfer', duzeltildi: false }); } catch (_) {}
    }
    return;
  }
  const modeTonu = asModedenTon();
  if (modeTonu) { asGuncelle(modeTonu.kelime, modeTonu.intensity); S._asAktifTon = modeTonu.kelime; return; }
  const ozzetTonu = await asTonYukle();
  if (ozzetTonu) { asGuncelle(ozzetTonu.kelime, ozzetTonu.intensity); S._asAktifTon = ozzetTonu.kelime; return; }
  const idx = (nowTR().getHours() + nowTR().getDay()) % getAsVarsayilan().length;
  const kelime = getAsVarsayilan()[idx];
  if (S._asAktifTon !== kelime) { asGuncelle(kelime, 'normal'); S._asAktifTon = kelime; }
}

export function asBaslat() {
  if (!document.getElementById('atmosfer-seridi')) return;
  asRefresh();
  if (S._asTimer) clearInterval(S._asTimer);
  S._asTimer = setInterval(asRefresh, 60 * 60 * 1000);
}

/**
 * Atmosfer şeridini mode badge güncellemesine bağlamak için hook.
 * 14-boot.js bu fonksiyonu register eder — modül load time TDZ riskini önler.
 * Eski monkey-patch updateModeBadge wrap'i kaldırıldı (Faz 2.1).
 */
export function registerModeBadgeHooks() {
  onModeBadgeUpdate(() => setTimeout(asRefresh, 200));
}
// Backward-compat: bazı çağrılar hâlâ window.updateModeBadge bekliyor —
// orijinal fonksiyon doğrudan re-export edilir (artık hook'larla genişler).
export { _origUpdateModeBadge as updateModeBadge };

/* startStreamingMsg ve switchView hook'ları yukarıda (HOOK'LAR bölümü) birleştirilmiştir. */

/* Boot */
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => { if (document.getElementById('chat-view')?.classList.contains('active')) asBaslat(); }, 1500);
});


export async function w3RequestNotificationPermission() {
  try {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    const result = await Notification.requestPermission();
    return result;
  } catch (e) {
    console.warn('w3RequestNotificationPermission:', e);
    return 'error';
  }
}

// showMicroOnboarding hook'u registerChatHooks() içinde kaydedilir (Faz 2.1).

/* switchView journey + closure hook'ları yukarıda birleştirilmiştir. */

/* ═══════════════════════════════════════════════════
   ÖZELLİK 1: KRİZ ALGILAMA + GÜVENLİ YÖNLENDİRME
   İntihar / öz zarar / akut kriz sinyali → 182 hattı
   ═══════════════════════════════════════════════════ */
// CRISIS_PATTERNS → dp('detect.crisis') — 13-dil desteği

// dpAll: kriz taraması dil-BAĞIMSIZDIR — arayüz TR/EN olsa da kullanıcı
// mesajını başka dilde yazabilir; tüm dillerin desenleri birlikte taranır.
export function detectCrisis(text) {
  return dpAll('detect.crisis').some(r => r.test(text));
}

// Yumuşak sinyal: mecaz payı yüksek ifadeler — tek başına kriz sayılmaz,
// sessiz LLM teyidine gider (_confirmCrisisWithLLM).
export function detectCrisisSoft(text) {
  return dpAll('detect.crisis_soft').some(r => r.test(text));
}

export function showCrisisCard() {
  S.currentAIMode = AI_MODES.SOFT;
  /* Satır 704'teki `export { _origUpdateModeBadge as updateModeBadge }` bir
     RE-EXPORT'tur — yerel bir `updateModeBadge` bağı yaratmaz. Buradaki çıplak
     çağrı o yüzden hiçbir zaman çözülmüyordu: kriz kartı açılırken mod rozeti
     güncellenmiyordu. Yerel bağ zaten elimizde (satır 8). */
  _origUpdateModeBadge();

  const area = document.getElementById('messages-area');
  if (!area) return;

  const card = document.createElement('div');
  card.style.cssText = 'margin:12px 0;padding:20px;background:rgba(231,76,60,0.07);border-left:3px solid #e74c3c;border-radius:10px;';
  card.innerHTML = `
    <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#e74c3c;margin-bottom:10px;">${t('crisis.title')}</div>
    <div style="font-family:var(--serif);font-size:16px;color:var(--text);margin-bottom:10px;line-height:1.55;">
      ${t('crisis.message')}
    </div>
    <div style="font-size:13px;color:var(--text-mid);margin-bottom:16px;line-height:1.6;">
      ${t('crisis.description')}
    </div>
    <a href="${t('crisis.phone')}" style="display:inline-flex;align-items:center;gap:8px;background:#e74c3c;color:#fff;padding:11px 18px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;letter-spacing:1px;">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/></svg>
      ${t('crisis.cta')}
    </a>
    <div style="margin-top:12px;">
      <a href="${t('crisis.directory_url')}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:var(--text-mid);text-decoration:underline;">${t('crisis.directory')}</a>
    </div>`;
  area.appendChild(card);
  card.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

/* Kriz durumunu ateşle: enjeksiyon 10 kullanıcı mesajı boyunca aktif kalır
   (yeni sinyalde yeniden dolar); kart 20 dk soğuma ile yeniden gösterilebilir.
   Eski davranış (oturumda tek sefer) uzun sohbetlerde sessiz kalıyordu —
   OpenAI'ın "uzun etkileşimde güvenlik aşınır" dersinin tersine çevrilmesi. */
const _CRISIS_INJECT_MSGS = 10;
const _CRISIS_CARD_COOLDOWN_MS = 20 * 60000;

function _fireCrisis() {
  S._crisisFiredThisSession = true;
  S._crisisMsgLeft = _CRISIS_INJECT_MSGS;
  // Gün damgası: kriz gününde ritüel pop-up/push susar (10s, 13o), ertesi gün
  // nazik yoklama girer. localStorage bilinçli: boot'ta auth beklemeden okunur;
  // içerik yok, yalnız tarih.
  S._crisisDayKey = localISODate();
  try { localStorage.setItem('etw_crisis_day', S._crisisDayKey); } catch (_) {}
  // Anonim sayaç (00f · kind:'safety') — içerik ASLA loglanmaz, yalnız olay adı
  try { window.wtLogSafety?.('crisis_signal'); } catch (_) {}
  const now = Date.now();
  if (!S._crisisCardAt || now - S._crisisCardAt > _CRISIS_CARD_COOLDOWN_MS) {
    S._crisisCardAt = now;
    showCrisisCard();
    try { window.wtLogSafety?.('crisis_card'); } catch (_) {}
  }
}
// Boot hydrate — reload kriz gününü unutturmasın
try { S._crisisDayKey = localStorage.getItem('etw_crisis_day') || null; } catch (_) { S._crisisDayKey = null; }

export function handleCrisisIfNeeded(text) {
  if (detectCrisis(text)) { _fireCrisis(); return; }
  if (S._crisisMsgLeft > 0) S._crisisMsgLeft--;
  if (detectCrisisSoft(text)) _confirmCrisisWithLLM(text);
}

export function getCrisisContext() {
  if (S._crisisMsgLeft > 0) return p('prompt.crisis');
  // Kriz ertesi: dün kriz günüyse günün ilk mesajlarında nazik yoklama.
  // Bilinçli: followup da crisis kanalından girer → 01 mod çözücüsü yumuşak
  // moda geçer, ayna/hafıza geri-çağırma o mesajlarda kapalı kalır.
  if (_wasCrisisYesterday() && (S._sessionUserMsgs?.length || 0) <= 3) {
    return p('prompt.crisis_followup');
  }
  return '';
}

function _wasCrisisYesterday() {
  if (!S._crisisDayKey) return false;
  return S._crisisDayKey === localISODate(new Date(Date.now() - 86400000));
}

/* ═══════════════════════════════════════════════════
   EMNİYET KATMANI · Faz 3 — kalıcı güvenlik ekleri
   06 sistem promptu montajının SONUNA eklenir (mod çözücüsünden bağımsız —
   crisis kanalına karışmaz, hiçbir modu tetiklemez).
   ═══════════════════════════════════════════════════ */
const _BREAK_AFTER_MS  = 2 * 3600000; // kesintisiz 2 saat sohbet → nazik mola daveti
const _BREAK_REPEAT_MS = 1 * 3600000; // sonrasında saatte bir yinele (SB 243 tabanı: reşit olmayana ≤3 saat)
const _SESSION_GAP_MS  = 45 * 60000;  // 45 dk sessizlik = oturum tazelendi

let _chatFirstMsgAt = 0;
let _lastBreakHintAt = 0;

export function getSafetyGuards() {
  let out = '';
  if (S._isMinor) out += p('prompt.minor_guard');

  const now = Date.now();
  // Uzun aradan sonra oturum sayacı tazelenir
  if (S._lastMsgTimestamp && now - S._lastMsgTimestamp > _SESSION_GAP_MS) _chatFirstMsgAt = 0;
  if (!_chatFirstMsgAt) { _chatFirstMsgAt = now; _lastBreakHintAt = 0; }

  if (now - _chatFirstMsgAt > _BREAK_AFTER_MS &&
      now - (_lastBreakHintAt || 0) > _BREAK_REPEAT_MS) {
    _lastBreakHintAt = now;
    out += p('prompt.break_hint');
  }
  return out;
}

/* Yumuşak sinyalin sessiz teyidi — ucuz sınıflandırıcı, ana akışı bloklamaz.
   Sonuç pozitifse kart o mesajın YANITINA yetişmez ama hemen görünür ve
   sonraki mesajlara enjeksiyon girer. Hata sessiz yutulur: regex katmanı
   zaten devrede, sınıflandırıcı yalnız inceltmedir. */
async function _confirmCrisisWithLLM(text) {
  if (S._crisisLLMBusy || S._crisisMsgLeft > 0) return;
  if (!S.LLM_API_KEY) return;
  S._crisisLLMBusy = true;
  try {
    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: p('prompt.crisis_classify', { message: text.slice(0, 500) }) }] }],
      systemPrompt: '',
      maxTokens: 20, temperature: 0, jsonMode: true, model: SUMMARY_MODEL, skipPersona: true
    });
    const verdict = JSON.parse(raw);
    if (verdict && verdict.crisis === true) _fireCrisis();
  } catch (_) {
    /* sessiz — güvenlik kararı asla sınıflandırıcı hatasına bağlanmaz */
  } finally {
    S._crisisLLMBusy = false;
  }
}

/* ═══════════════════════════════════════════════════
   ÖZELLİK 2: OLDUĞUN KİŞİNİN GÖRÜNMEYEN YÜZÜ
   Konuşmalardan aylık otomatik gölge benlik profili
   ═══════════════════════════════════════════════════ */
export async function generateInvisibleFaceProfile(force = false) {
  if (!S.currentUser || !S.LLM_API_KEY) return null;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const recentMsgs = getAllMessages()
    .filter(m => m.role === 'user' && new Date(m.created_at) > thirtyDaysAgo)
    .map(m => m.content.slice(0, 120));

  if (recentMsgs.length < 8) return null;

  const monthKey = localISODate().slice(0, 7); // YYYY-MM (yerel)
  // Dil cache anahtarına dahil: dil değişince (ör. EN→TR) profil yeni dilde üretilsin,
  // aksi halde aynı ayın İngilizce cache'i Türkçe arayüzde geri döner.
  const lang = S._currentLang || 'tr';
  const cacheKey = `etw_invisible_face_${S.currentUser.id}_${monthKey}_${lang}`;
  if (!force) {
    const cached = SafeStorage.get(cacheKey);
    if (cached) return cached;
  }

  try {
    // İç Meclis 2.0 · K3: suretin "ayna"sı Olmak İstediğin Kişi'nin (10D)
    // tek kaynağına hizalanır — OİK yoksa prompt'un kendi serbest üretimi
    // korunur (fallback zinciri kırılmaz).
    let oikContext = '-';
    try { oikContext = window.oikGetDesired?.()?.name || '-'; } catch (_) {}
    const prompt = p('prompt.invisible_face', { messages: recentMsgs.slice(-35).join('\n'), oikContext });

    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemPrompt: '',
      maxTokens: 750, temperature: 0.5, jsonMode: true, model: SUMMARY_MODEL, skipPersona: true
    });

    const result = JSON.parse(raw);
    SafeStorage.set(cacheKey, result);
    return result;
  } catch (e) {
    console.warn('Görünmeyen Yüz profil hatası:', e);
    return null;
  }
}

/* ═══════════════════════════════════════════════════
   HAYATTAKİ SEN — "BU HAFTA / AY BÖYLE BİRİYDİN"
   Emre, kullanıcının mesaj geçmişinden o dönemde fiilen
   olduğu kişinin kartını çıkarır (düşünce/inanç/his/davranış),
   "Olmak İstediğin Kişi" ile farkını gösterir ve hedefe
   geçiş için yeni bir kart önerir (→ Geçiş Alanı).
   ═══════════════════════════════════════════════════ */
const _HS_SCOPES = {
  hafta: { days: 7,  label: 'Bu Hafta', labelLower: 'bu hafta', min: 4 },
  ay:    { days: 30, label: 'Bu Ay',    labelLower: 'bu ay',    min: 8 },
};
const _HS_TRAIT_FIELDS = [
  { id: 'dusunceler',  label: 'DÜŞÜNCELER',  glyph: '◉' },
  { id: 'inanclar',    label: 'İNANÇLAR',    glyph: '✦' },
  { id: 'hisler',      label: 'HİSLER',      glyph: '❖' },
  { id: 'davranislar', label: 'DAVRANIŞLAR', glyph: '⟡' },
];
let _hsPortraitCache = { hafta: null, ay: null };

function _hsBucket(scope, now) {
  if (scope === 'ay') return localISODate(now).slice(0, 7); // YYYY-MM (yerel)
  // ISO hafta etiketi (YYYY-Www)
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

function _hsDesiredSeed() {
  let arch = null;
  try { arch = getSuggestedArchetype(); } catch (_) {}
  const parts = [];
  let name = '';
  if (arch) {
    name = `${arch.name} ${arch.sub || ''}`.trim();
    parts.push(`${arch.name} — ${arch.sub || ''}`.trim());
    if (arch.dusunceler?.length)  parts.push('Düşünceler: '  + arch.dusunceler.slice(0, 3).join('; '));
    if (arch.inanclar?.length)    parts.push('İnançlar: '    + arch.inanclar.slice(0, 3).join('; '));
    if (arch.hisler?.length)      parts.push('Hisler: '      + arch.hisler.slice(0, 3).join('; '));
    if (arch.davranislar?.length) parts.push('Davranışlar: ' + arch.davranislar.slice(0, 3).join('; '));
  }
  // Olmak İstediğin Kişi (10D) — kullanıcının kendi tasarladığı hedef kimlik önceliklidir.
  const oikCard = (() => { try { return window.oikGetCard?.(); } catch (_) { return null; } })();
  if (oikCard) {
    const pick = k => (oikCard[k] || []).map(e => typeof e === 'string' ? e : (e?.text || '')).filter(Boolean).slice(0, 3).join('; ');
    if (!name) name = oikCard.baslik;
    if (pick('dusunceler'))  parts.push('Düşünceler: '  + pick('dusunceler'));
    if (pick('inanclar'))    parts.push('İnançlar: '    + pick('inanclar'));
    if (pick('duygular'))    parts.push('Duygular: '    + pick('duygular'));
    if (pick('davranislar')) parts.push('Davranışlar: ' + pick('davranislar'));
  }
  const desiredDesc = (oikCard?.baslik || S._personTransition?.desired?.description || '').trim();
  if (desiredDesc && !name) name = desiredDesc;
  const text = [desiredDesc ? `Tanım: "${desiredDesc}"` : '', parts.join('\n')]
    .filter(Boolean).join('\n') || 'Henüz net bir hedef tanımlı değil — mesajlardan en olası hedefi çıkar.';
  return { name: name || 'Olmak İstediğin Kişi', text, arch };
}

async function generateHayattakiSenPortrait(scope) {
  if (!S.currentUser || !S.LLM_API_KEY) return null;
  const cfg = _HS_SCOPES[scope] || _HS_SCOPES.hafta;

  const since = new Date(Date.now() - cfg.days * 86400000);
  const msgs = getAllMessages()
    .filter(m => m.role === 'user' && new Date(m.created_at) > since)
    .map(m => (m.content || '').slice(0, 140))
    .filter(Boolean);
  if (msgs.length < cfg.min) return null;

  const desired = _hsDesiredSeed();
  const cacheKey = `etw_hs_portrait_${scope}_${S.currentUser.id}_${_hsBucket(scope, new Date())}`;
  const cached = SafeStorage.get(cacheKey);
  if (cached) { cached._desiredName = desired.name; cached._desiredArch = desired.arch; return cached; }

  try {
    const prompt = p('prompt.hayattaki_sen_portrait', {
      messages: msgs.slice(-40).join('\n'),
      period_days: String(cfg.days),
      period_label: cfg.label,
      period_label_lower: cfg.labelLower,
      desired_person: desired.text,
    });
    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemPrompt: '',
      maxTokens: 700, temperature: 0.6, jsonMode: true, model: SUMMARY_MODEL, skipPersona: true,
    });
    const result = JSON.parse(raw);
    SafeStorage.set(cacheKey, result);
    result._desiredName = desired.name;
    result._desiredArch = desired.arch;
    return result;
  } catch (e) {
    console.warn('Hayattaki Sen portre hatası:', e);
    return null;
  }
}

function _hsEnsureStyles() {
  if (document.getElementById('hs-portrait-styles')) return;
  const st = document.createElement('style');
  st.id = 'hs-portrait-styles';
  st.textContent = `
    /* modal kabuğu — yükseklik sınırlı, içerik kaydırılır */
    .hs-modal{max-width:440px;max-height:88vh;padding:0;text-align:left;display:flex;flex-direction:column;overflow:hidden;}
    .hs-head{padding:22px 22px 0;flex-shrink:0;}
    .hs-kicker{font-family:var(--cinzel,serif);font-size:9px;letter-spacing:4px;text-transform:uppercase;color:var(--gold);margin-bottom:14px;}
    .hs-tabs{display:flex;position:relative;}
    .hs-tabs::after{content:'';position:absolute;left:0;right:0;bottom:0;height:1px;
      background:linear-gradient(90deg,transparent,rgba(245,166,35,.35),transparent);} /* eriyen ayraç */
    .hs-tab{flex:1;min-height:44px;padding:9px 0;background:none;border:none;border-bottom:2px solid transparent;color:var(--text-dim);font-family:var(--cinzel,serif);font-size:10px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:color .25s,border-color .25s;}
    .hs-tab.active{color:var(--gold);border-bottom-color:var(--gold);}
    .hs-tab:focus-visible{outline:2px solid var(--gold,#F5A623);outline-offset:-2px;}
    .hs-scroll{flex:1;overflow-y:auto;padding:18px 22px;min-height:150px;-webkit-overflow-scrolling:touch;}
    .hs-foot{display:flex;gap:10px;padding:14px 22px calc(var(--safe-b,0px) + 16px);border-top:1px solid var(--border);flex-shrink:0;}

    .hs-block{margin-bottom:14px;}
    .hs-block-tag{font-family:var(--cinzel,serif);font-size:8.5px;letter-spacing:3px;text-transform:uppercase;color:var(--text-dim);margin-bottom:10px;}
    .hs-block-tag.gold{color:var(--gold);}

    /* ayna kartları — salon dili: ısıtılmış yüzey, köşeden ışık, cömert köşe */
    .hs-card{display:flex;gap:14px;align-items:center;border:1px solid rgba(234,226,214,.12);border-radius:var(--radius-lg,20px);
      background:radial-gradient(120% 100% at 0% 0%, rgba(245,166,35,.06), transparent 60%),var(--surface,#1D1712);padding:14px 15px;}
    .hs-card--desired{border-color:rgba(90,138,216,.35);
      background:radial-gradient(120% 100% at 100% 0%, rgba(45,95,168,.13), transparent 60%),linear-gradient(170deg,#141A2B,#0C0F18);} /* hedef = lapis gece */
    .hs-card-body{flex:1;min-width:0;}
    .hs-card-name{font-family:var(--serif-display,var(--serif));font-style:italic;font-size:19px;color:var(--text);line-height:1.2;}
    .hs-card-sub{font-family:var(--serif);font-style:italic;font-size:12px;color:var(--gold);margin-top:2px;}
    .hs-card--desired .hs-card-sub{color:var(--lapis-bright,#5A8AD8);}
    .hs-card-ozet{font-size:12px;color:var(--text-mid);line-height:1.55;margin-top:8px;}

    .hs-traits{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px;}
    .hs-trait{border:1px solid rgba(234,226,214,.10);border-radius:14px;background:rgba(255,255,255,0.015);padding:10px 11px;}
    .hs-trait-head{display:flex;align-items:center;gap:5px;font-family:var(--cinzel,serif);font-size:8px;letter-spacing:2px;color:var(--text-dim);margin-bottom:6px;}
    .hs-trait-head span{color:var(--gold);font-size:10px;}
    .hs-trait ul{margin:0;padding:0;list-style:none;}
    .hs-trait li{position:relative;padding-left:10px;font-size:11px;line-height:1.4;color:var(--text-mid);margin-bottom:4px;}
    .hs-trait li::before{content:'';position:absolute;left:0;top:6px;width:3px;height:1px;background:var(--gold);}

    /* fark satırı — şimdiden geleceğe akan yol çizgisi */
    .hs-fark{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;margin:2px 0 14px;border-radius:14px;
      background:linear-gradient(90deg,rgba(245,166,35,.06),rgba(45,95,168,.06));}
    .hs-fark-arrow{color:var(--gold);font-size:15px;line-height:1.4;flex-shrink:0;}
    .hs-fark-text{font-size:12.5px;color:var(--text);line-height:1.55;font-family:var(--serif);}

    .hs-gecis{border:1px solid rgba(245,166,35,.45);border-radius:var(--radius-lg,20px);padding:15px;
      background:radial-gradient(120% 100% at 0% 0%, rgba(245,166,35,.11), transparent 60%),rgba(18,14,9,.55);}
    .hs-gecis-label{display:flex;align-items:center;gap:7px;font-family:var(--cinzel,serif);font-size:8.5px;letter-spacing:2px;color:var(--gold);font-weight:700;margin-bottom:8px;}
    .hs-gecis-badge{display:inline-flex;align-items:center;justify-content:center;width:16px;height:20px;border-radius:50%;border:1px solid var(--gold);font-size:8px;flex-shrink:0;} /* oval — Emre imzası */
    .hs-gecis-ad{font-family:var(--serif-display,var(--serif));font-style:italic;font-size:17px;color:var(--text);margin-bottom:5px;}
    .hs-gecis-ozet{font-size:12px;color:var(--text-mid);line-height:1.55;margin-bottom:12px;}
    .hs-gecis-btn{width:100%;min-height:44px;padding:11px;border:none;cursor:pointer;border-radius:var(--radius-full,999px);
      background:linear-gradient(180deg,var(--gold-bright,#F7C744),var(--gold,#F5A623) 55%,#D98F1B);color:#1A1206;
      font-family:var(--cinzel,serif);font-size:10px;letter-spacing:2px;font-weight:700;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.38),0 6px 18px rgba(245,166,35,.28);transition:transform .15s var(--ease-out,ease);}
    .hs-gecis-btn:hover{filter:brightness(1.05);}
    .hs-gecis-btn:active{transform:scale(.95);}
    .hs-gecis-btn:focus-visible{outline:2px solid var(--gold,#F5A623);outline-offset:2px;}

    /* 3B dönen kart */
    .hs3d-stage{width:64px;flex-shrink:0;perspective:680px;display:flex;align-items:center;justify-content:center;}
    .hs3d{width:60px;height:84px;position:relative;transform-style:preserve-3d;animation:hs3dSpin 8s linear infinite;}
    .hs3d-face{position:absolute;inset:0;-webkit-backface-visibility:hidden;backface-visibility:hidden;border:1.2px solid var(--gold);background:linear-gradient(180deg,#171513,#0d0c0b);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;box-shadow:inset 0 0 0 1px rgba(184,149,60,0.12);}
    .hs3d.shadow .hs3d-face{border-color:rgba(184,149,60,0.3);}
    .hs3d-back{transform:rotateY(180deg);}
    .hs3d-roman{font-family:var(--cinzel,serif);font-size:8px;letter-spacing:2px;color:var(--gold);}
    .hs3d.shadow .hs3d-roman{color:var(--text-dim);}
    .hs3d-mono{font-family:var(--serif);font-size:24px;color:var(--gold);opacity:0.45;}
    @keyframes hs3dSpin{to{transform:rotateY(360deg);}}
    @media (prefers-reduced-motion: reduce){.hs3d{animation:none;}}
    @media(max-width:380px){.hs-traits{grid-template-columns:1fr;}}
  `;
  document.head.appendChild(st);
}

export async function showHayattakiSen(initialTab) {
  // Eski çağrı uyumu: 'weekly'→hafta, 'map'/'monthly'→ay
  const scope = (initialTab === 'ay' || initialTab === 'map' || initialTab === 'monthly') ? 'ay' : 'hafta';
  _hsPortraitCache = { hafta: null, ay: null };
  _hsEnsureStyles();

  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.style.cssText = 'z-index:var(--z-overlay-ust);';
  overlay.id = 'hs-overlay';

  overlay.innerHTML = `
    <div class="modal hs-modal">
      <div class="hs-head">
        <div class="hs-kicker">${t('drawer.hayattaki_sen', 'Hayattaki Sen')}</div>
        <div class="hs-tabs">
          <button class="hs-tab" data-scope="hafta">${t('hayattaki_sen.tab_week', 'Bu Hafta')}</button>
          <button class="hs-tab" data-scope="ay">${t('hayattaki_sen.tab_month', 'Bu Ay')}</button>
        </div>
      </div>
      <div id="hs-content" class="hs-scroll"></div>
      <div class="hs-foot">
        <button class="btn-outline-gold" style="flex:1;" onclick="this.closest('.overlay').remove()">${t('pme.acknowledge', 'Bunu Görüyorum')}</button>
        <button class="modal-skip" style="flex:0 0 auto;" id="hs-share-btn">${t('pme.share', 'Paylaş')}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  overlay.querySelectorAll('.hs-tab').forEach(btn =>
    btn.addEventListener('click', () => _hsSwitchScope(btn.dataset.scope)));
  overlay.querySelector('#hs-share-btn').addEventListener('click', () => _hsShare());
  await _hsSwitchScope(scope);
}

async function _hsSwitchScope(scope) {
  const overlay = document.getElementById('hs-overlay');
  if (!overlay) return;
  overlay.dataset.activeScope = scope;

  overlay.querySelectorAll('.hs-tab').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.scope === scope));

  const content = overlay.querySelector('#hs-content');
  if (!content) return;
  content.innerHTML = `<div style="text-align:center;padding:56px 0;">
    <div class="p13n-shimmer"></div><div class="p13n-shimmer short"></div>
    <div style="font-size:11px;color:var(--text-dim);margin-top:16px;">${t('toast.profile_generating', 'Emre seni okuyor...')}</div>
  </div>`;
  await _hsRenderPortrait(content, scope);
}

async function _hsRenderPortrait(container, scope) {
  let data = _hsPortraitCache[scope];
  if (!data) {
    data = await generateHayattakiSenPortrait(scope);
    _hsPortraitCache[scope] = data;
  }

  if (!data) {
    container.innerHTML = `<div style="text-align:center;padding:36px 16px;color:var(--text-dim);font-size:13px;line-height:1.6;">${t('hayattaki_sen.no_data', 'Bu dönem için yeterli mesaj yok. Birkaç gün Emre ile konuş — sonra burası seni gösterecek.')}</div>`;
    return;
  }

  const traitHTML = _HS_TRAIT_FIELDS.map(f => {
    const items = (data[f.id] || []).filter(Boolean);
    if (!items.length) return '';
    return `<div class="hs-trait">
      <div class="hs-trait-head"><span>${f.glyph}</span>${f.label}</div>
      <ul>${items.slice(0, 3).map(i => `<li>${escapeHTML(i)}</li>`).join('')}</ul>
    </div>`;
  }).join('');

  const g = data.gecis_karti || {};
  const arch = data._desiredArch;
  const olanTag = scope === 'ay' ? 'BU AY BÖYLE BİRİYDİN' : 'BU HAFTA BÖYLE BİRİYDİN';
  const desiredEssence = arch?.whisper || arch?.lesson || S._personTransition?.desired?.description || '';

  const olanCard    = _hs3dCard({ roman: '—', name: data.kisi_adi, glyph: 'mirror', tone: 'shadow' });
  const desiredCard = _hs3dCard({ roman: arch?.roman || '✦', name: data._desiredName, glyph: arch?.glyph || 'wanderer', tone: 'gold' });

  container.innerHTML = `
    <div class="hs-block">
      <div class="hs-block-tag">${t('hayattaki_sen.eyebrow_' + scope, olanTag)}</div>
      <div class="hs-card hs-card--olan">
        ${olanCard}
        <div class="hs-card-body">
          <div class="hs-card-name">${escapeHTML(data.kisi_adi || '')}</div>
          ${data.kisi_alt ? `<div class="hs-card-sub">${escapeHTML(data.kisi_alt)}</div>` : ''}
          ${data.ozet ? `<div class="hs-card-ozet">${escapeHTML(data.ozet)}</div>` : ''}
        </div>
      </div>
      ${traitHTML ? `<div class="hs-traits">${traitHTML}</div>` : ''}
    </div>

    ${data.fark ? `<div class="hs-fark"><span class="hs-fark-arrow">↓</span><div class="hs-fark-text">${escapeHTML(data.fark)}</div></div>` : ''}

    <div class="hs-block">
      <div class="hs-block-tag gold">${t('hayattaki_sen.desired_tag', 'OLMAK İSTEDİĞİN KİŞİ')}</div>
      <div class="hs-card hs-card--desired">
        ${desiredCard}
        <div class="hs-card-body">
          <div class="hs-card-name">${escapeHTML(data._desiredName || '')}</div>
          ${desiredEssence ? `<div class="hs-card-ozet" style="font-style:italic;">${escapeHTML(desiredEssence)}</div>` : ''}
        </div>
      </div>
    </div>

    ${g.ad ? `
      <div class="hs-gecis">
        <div class="hs-gecis-label"><span class="hs-gecis-badge">E</span>${t('hayattaki_sen.gecis_label', "EMRE'NİN ÖNERDİĞİ GEÇİŞ KARTI")}</div>
        <div class="hs-gecis-ad">${escapeHTML(g.ad)}</div>
        ${g.ozet ? `<div class="hs-gecis-ozet">${escapeHTML(g.ozet)}</div>` : ''}
        <button class="hs-gecis-btn" id="hs-gecis-btn">${t('hayattaki_sen.gecis_btn', 'BU KARTI GEÇİŞ ALANINA EKLE →')}</button>
      </div>` : ''}`;

  const gbtn = container.querySelector('#hs-gecis-btn');
  if (gbtn) gbtn.addEventListener('click', () => _hsToGecisCard(scope));
}

function _hs3dCard({ roman, name, glyph, tone }) {
  const shadow = tone === 'shadow';
  const color = shadow ? 'var(--text-dim)' : 'var(--gold)';
  const fig = wsArchFigure(glyph || 'wanderer', 40, color, shadow ? 0.5 : 0.95, false);
  const initial = (((name || '·').trim()[0]) || '·').toUpperCase();
  return `<div class="hs3d-stage"><div class="hs3d${shadow ? ' shadow' : ''}">
    <div class="hs3d-face hs3d-front">
      <div class="hs3d-roman">${escapeHTML(String(roman || '·'))}</div>
      <div class="hs3d-fig">${fig}</div>
    </div>
    <div class="hs3d-face hs3d-back"><div class="hs3d-mono">${escapeHTML(initial)}</div></div>
  </div></div>`;
}

function _hsToGecisCard(scope) {
  const data = _hsPortraitCache[scope];
  const g = data?.gecis_karti;
  if (!g) return;
  document.getElementById('hs-overlay')?.remove();
  if (typeof window.oikOpenDesign !== 'function') {
    showToast(t('hayattaki_sen.gecis_unavailable', 'Geçiş Alanı şu an açılamadı.'), true);
    return;
  }
  // Programatik taslak — kırılgan setTimeout+DOM-input köprüsünün yerine (oikSeedDraft).
  try {
    window.oikSeedDraft?.({
      baslik: g.ad || '',
      inanclar: (g.dusunce_inanc || []).filter(Boolean),
      duygular: (g.duygu || []).filter(Boolean),
      davranislar: (g.davranis || []).filter(Boolean),
    });
  } catch (_) {}
  window.oikOpenDesign();
  showToast(t('hayattaki_sen.gecis_toast', 'Geçiş kartı taslağı hazır — kendine göre düzenle ve mühürle.'));
}

function _hsShare() {
  const overlay = document.getElementById('hs-overlay');
  if (!overlay) return;
  const scope = overlay.dataset.activeScope || 'hafta';
  const data = _hsPortraitCache[scope];
  if (!data) return;
  const cfg = _HS_SCOPES[scope] || _HS_SCOPES.hafta;
  const g = data.gecis_karti || {};
  const text = [
    `${cfg.label}: ${data.kisi_adi || ''}${data.kisi_alt ? ' — ' + data.kisi_alt : ''}`,
    '', data.ozet || '',
    data.fark ? '→ ' + data.fark : '',
    g.ad ? 'Geçiş kartı: ' + g.ad : '',
    '', '— Emre the Wanderer',
  ].filter(Boolean).join('\n').trim();
  _hsShareText(data.kisi_adi || 'Hayattaki Sen', text);
}

function _hsShareText(title, text) {
  if (navigator.share) {
    navigator.share({ title, text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => showToast(t('weekly.copied', 'Kopyalandı'))).catch(() => {});
  }
}

/* ═══════════════════════════════════════════════════
   ÖZELLİK 3: HESAP GÜNÜ
   Pazartesi taahhütleri → Cuma/Cumartesi yüzleşme
   ═══════════════════════════════════════════════════ */
export async function showHesapGunu() {
  if (!S.currentUser) return;

  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Paz 1=Pzt … 5=Cum 6=Cmt
  if (dayOfWeek < 4) return; // Perşembe'den itibaren aktif

  const key = `etw_hesap_gunu_${S.currentUser.id}_${today.toDateString()}`;
  if (SafeStorage.getRaw(key)) return;

  let stored = [];
  try { stored = getCleanCommitments(); } catch (_) {}
  // idx = stored dizisindeki GERÇEK pozisyon (resolveCommitment bunu bekler) —
  // pending filtrelenmiş bir alt-küme olduğu için index'i satırla birlikte taşı.
  const pending = stored
    .map((c, idx) => ({ ...c, _idx: idx }))
    .filter(c => !c.checked);
  if (!pending.length) return;

  SafeStorage.setRaw(key, '1');

  const dayName = today.toLocaleDateString(S._currentLang || 'tr', { weekday: 'long' });

  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.style.setProperty('z-index', 'var(--z-portal-alt)');
  overlay.innerHTML = `
    <div class="modal" style="max-width:420px;">
      <div style="font-size:9px;letter-spacing:4px;text-transform:uppercase;color:var(--gold);margin-bottom:14px;">${escapeHTML(t('hesap.kicker', 'Hesap Günü'))} · ${escapeHTML(dayName)}</div>
      <div class="modal-title serif" style="font-size:24px;margin-bottom:14px;">${escapeHTML(t('hesap.title', 'Söz vermiştin.'))}</div>
      <div class="hesap-list" style="margin-bottom:16px;max-height:50vh;overflow-y:auto;">
        ${pending.map(c => `
          <div class="hesap-row" data-idx="${c._idx}" style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--border,rgba(255,255,255,.08));">
            <div style="font-size:14px;color:var(--text-mid);line-height:1.6;font-style:italic;margin-bottom:4px;">"${escapeHTML(c.text)}"</div>
            <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px;">${escapeHTML(c.date)}</div>
            <div class="hesap-btns" style="display:flex;gap:8px;">
              <button class="btn-outline-gold hesap-kept" data-idx="${c._idx}" type="button" style="flex:1;">${escapeHTML(t('hesap.kept', 'TUTTUM'))}</button>
              <button class="modal-skip hesap-broke" data-idx="${c._idx}" type="button" style="flex:1;">${escapeHTML(t('hesap.broke', 'TUTAMADIM'))}</button>
            </div>
          </div>`).join('')}
      </div>
      <button class="btn-outline-gold" id="hesap-confront" style="margin-bottom:8px;">${escapeHTML(t('ui.confront_emre'))}</button>
    </div>`;
  document.body.appendChild(overlay);

  const _closeIfDone = () => {
    if (!overlay.querySelectorAll('.hesap-row').length) overlay.remove();
  };
  overlay.querySelectorAll('.hesap-kept, .hesap-broke').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const kept = btn.classList.contains('hesap-kept');
      resolveCommitment(idx, kept);
      if (kept) { try { awardElmas(4, 'hesap-gunu-tuttu'); } catch (_) {} }
      overlay.querySelector(`.hesap-row[data-idx="${idx}"]`)?.remove();
      _closeIfDone();
    });
  });
  overlay.querySelector('#hesap-confront')?.addEventListener('click', () => {
    overlay.remove();
    try { window.newSession?.(); } catch (_) {}
  });
}

function getHesapGunuContext() {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    if (dayOfWeek < 4) return '';

    const stored = getCleanCommitments();
    const pending = stored.filter(c => !c.checked);
    if (!pending.length) return '';

    const mondayOnes = pending.filter(c => new Date(c.date).getDay() === 1);
    const target = mondayOnes.length ? mondayOnes[0] : pending[pending.length - 1];
    const dayName = today.toLocaleDateString(S._currentLang || 'tr', { weekday: 'long' });
    return p('prompt.hesap_gunu', { dayName, text: target.text, date: target.date });
  } catch (_) { return ''; }
}

/* ═══════════════════════════════════════════════════
   ÖZELLİK 4: DÜRÜSTLÜK KONTROLLÜ DUYGU TAKİBİ
   "İyiyim" → geçmiş verilerle çapraz kontrol
   ═══════════════════════════════════════════════════ */
// WELLNESS_CLAIM_PATTERNS → dp('detect.wellness_claim') — 13-dil desteği

function detectWellnessClaim(text) {
  const trimmed = text.trim();
  return dp('detect.wellness_claim').some(r => r.test(trimmed));
}

function _getWeekKey() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil((((d - jan1) / 86400000) + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function _saveWellnessClaim(text) {
  try {
    let claims = SecureStorage.get(STORAGE_KEYS.WELLNESS(S.currentUser?.id), S.currentUser?.id, []);
    claims.unshift({ text: text.slice(0, 80), date: new Date().toISOString(), wk: _getWeekKey() });
    if (claims.length > 15) claims = claims.slice(0, 15);
    SecureStorage.set(STORAGE_KEYS.WELLNESS(S.currentUser?.id), S.currentUser?.id, claims);
  } catch (_) {}
}

function getWellnessContradictionContext(text) {
  if (!detectWellnessClaim(text)) return '';

  try {
    const claims = SecureStorage.get(STORAGE_KEYS.WELLNESS(S.currentUser?.id), S.currentUser?.id, []);
    const currentWk = _getWeekKey();
    const pastClaims = claims.filter(c => c.wk !== currentWk);

    _saveWellnessClaim(text);

    if (!pastClaims.length) return '';

    const allUserMsgs = getAllMessages().filter(m => m.role === 'user');
    const recentHard = allUserMsgs
      .filter(m => new Date(m.created_at) > new Date(Date.now() - 7 * 86400000))
      .some(m =>
        dp('detect.emotional_spike').some(r => r.test(m.content)) ||
        dp('detect.vulnerability').some(r => r.test(m.content))
      );

    const lastClaim = pastClaims[0];
    const lastDate = new Date(lastClaim.date).toLocaleDateString(S._currentLang || 'tr', { weekday: 'long', day: 'numeric', month: 'long' });

    if (recentHard) {
      return p('prompt.wellness.with_evidence', { lastDate });
    }
    return p('prompt.wellness.without_evidence', { lastDate });
  } catch (_) { return ''; }
}

/* ── window expose ──────────────────────────────────────────────
   06 sohbet çekirdeği bu iki bağlamı window üzerinden okur; 13-extras'ı
   import ETMEZ (döngüsel bağımlılık kurmamak için köprü window'dur).
   Köprünün kendisi hiç kurulmamıştı: iki fonksiyon da modül-yerel kaldığı
   için `window.getHesapGunuContext?.()` optional chaining ile sessizce
   undefined dönüyordu. Sonucu iki katmanlıydı — `hesap` ve `wellness`
   alanları LLM'e HER ZAMAN boş gidiyor, üstelik `commitment` kapısı
   (`hesapCtx ? '' : …`) hesapCtx hep boş olduğu için hiç kapanmıyordu.
   Sessiz kırığın niteliği bu: hata vermez, yalnız bağlamı eksiltir. */
if (typeof window !== 'undefined') {
  window.getHesapGunuContext = getHesapGunuContext;
  window.getWellnessContradictionContext = getWellnessContradictionContext;
  // Duygu Motoru (13D) K9 — kriz üstünlüğü bu köprüden okunur, aynı
  // döngüsel-bağımlılık gerekçesiyle (13D zaten 03-auth-shell → 00-config-
  // tracking zincirinden bu dosyaya dolaylı bağlı; statik import döngü kurar).
  window.detectCrisis = detectCrisis;
}

