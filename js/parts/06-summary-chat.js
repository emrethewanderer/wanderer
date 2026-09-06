import { S } from '../state.js';
import { sb, SUMMARY_MODEL, AI_MODES, TOKEN_LIMITS, MODE_TEMPS, DG_TEMPS, DG_TOKEN, DG_RENDER_MS, marked, DOMPurify } from '../config.js';
import { escapeHTML, EventBus, AnimUtils, showToast, throttle, RateLimiter, A11y, createHookRegistry, SafeStorage, localISODate } from './00a-infrastructure.js';
import { ktGate, ktWallText, ktStatus } from './13m-kota.js';
import { t } from './15-i18n.js';
import { p, ensurePromptLang } from './16-i18n-prompts.js';
import { callLLM, renderHistory, updateStreakUI, calculateStreak } from './04-llm-hero-history.js';
import { updateAIMode, stripModeWatermark, cleanHistoryText, logResistanceMoment, trackSilenceTopic, captureCommitments, trackEmotionalFlow, getUserFirstName, getAllMessages, getResistanceInsight, getSilenceInsight, getPendingCommitmentContext, createModeAwareChunkHandler, extractDgReading, nowTR, toTR } from './00-config-tracking.js';
import { resetSilencePressure, getOnboardingContext, handleEmotionalSpike, detectEmotionalSpike, trackSelfContradiction, trackIdentityDrift, getIdentityDriftInsight } from './02-features-onboarding.js';
import { analyzeMessagePart, checkPastSelfEcho, applySessionPartDots, openDailyClosure } from './05-closure-parts.js';
import { userFriendlyError, generateAndSaveCard } from './08-trends-payment.js';

/* saveAnalyticsToSupabase importsuzdu: requestChatExit'te ReferenceError
   ARGÜMAN değerlendirmesinde fırlıyordu, yani Promise.resolve(...).catch onu
   yakalayamıyordu — altındaki dört arka plan işi (profil, ödev, ilerleme,
   derin analiz) hiç çalışmıyordu. */
import { updateProfileFromSession, detectBreakthrough, saveBreakthroughMoment, saveAnalyticsToSupabase,
         getActiveHomework, markHomework, generateHomework, updateTrackProgress } from './09-reports-tracks.js';
import {
  personalizationDeepAnalysis, personalizationSave,
  personalizationAnalyze, personalizationRecordAIReply, p4RecordExplicitUIFeedback,
  buildPersonalizationPrompt,
} from './09a-personalization-engine.js';
import { buildSmartRagQuery, buildContextPrompt, getGreetingContext, saveSessionPatterns,
         _determineContextMode, _CONTEXT_BUDGETS } from './01-prompts-modes.js';
import { DG_CUE, dgIklimKaydet, dgIklimYukle, dgIklimModelOkumaEkle, dgBeyanVar, dgBeyanSustur, dgBeyanGeriAl, dgYanilmaDuzeltildi } from './13D-duygu-motoru.js';
import { kokenAlintiCoz } from './13y-koken.js';
// 12c primitifleri (ikv-panel/ikv-ghost-btn/ikv-seal-btn) stillerini KENDİ
// enjeksiyonundan alır ve bunu bugüne dek yalnız KART ÇİZEN yüzeyler
// tetikliyordu ([[tanima-motoru]] FAZ 7 dersi). Bu dosya kart çizmez —
// şeffaflık paneli açılırken çağrılmazsa zemin/düğmeler tarayıcı
// varsayılanına düşer (build+testler yeşil kalırken).
import { ikvEnsureStyles } from './12c-kart-gorsel.js';
import { getModeHintLabel } from './00-config-tracking.js';
import { w2InjectContextualMuhurCard, w2InjectContextualLessonCard } from './10-features-w2.js';
import { fmRenderSwitchDivider, fmRenderHistoryRow, fmActiveParams } from './10w-w2-odak-modelleri.js';

/* ═══ SUMMARY ═══ */
const SUMMARY_MIN_USER_MSGS   = 3;
export const SUMMARY_MIN_TOTAL_CHARS = 200;

// Supabase'den daha önce özetlenmiş session_id'leri yükle
export async function loadSummarizedSessionIds() {
  try {
    const { data } = await sb.from('chat_summaries')
      .select('session_id')
      .eq('user_id', S.currentUser.id);
    if (data) data.forEach(r => S.summarizedSessionIds.add(r.session_id));
  } catch (_) {}
}

export function isSessionSummarized(sessId) {
  return S.summarizedSessionIds.has(sessId) || S.summarizedSessionId === sessId;
}

export function setSummaryState(state) {
  ['analyzing','result','ineligible','error'].forEach(s => {
    const el = document.getElementById('sum-state-' + s);
    if (el) el.style.display = s === state ? '' : 'none';
  });
}

export function dismissSummary() {
  document.getElementById('summary-overlay').classList.remove('open');
  S.summaryInProgress = false;
}

export function isSummaryEligible() {
  const userMsgs   = S.chatHistory.filter(m => m.role === 'user');
  const totalChars = userMsgs.reduce((acc, m) => acc + m.content.length, 0);
  return userMsgs.length >= SUMMARY_MIN_USER_MSGS && totalChars >= SUMMARY_MIN_TOTAL_CHARS;
}

export async function requestChatExit() {
  // Arka plan işlemleri — herhangi biri hata verirse UI'ı bloklamasın ama sessizce yutma
  Promise.resolve(saveSessionPatterns()).catch(e => console.warn('saveSessionPatterns:', e));
  Promise.resolve(saveAnalyticsToSupabase()).catch(e => console.warn('saveAnalytics:', e));
  Promise.resolve(updateProfileFromSession()).catch(e => console.warn('updateProfile:', e));
  Promise.resolve(generateHomework()).catch(e => console.warn('generateHomework:', e));
  Promise.resolve(updateTrackProgress()).catch(e => console.warn('updateTrackProgress:', e));
  // Kişiselleştirme motoru — derin analiz (SafeStorage zaten Supabase'e akıtır)
  Promise.resolve(personalizationDeepAnalysis()).catch(e => console.warn('personalizationDeep:', e));
  // Portre — Emre bu seanstan yeni Düşünce/İnanç/Duygu/Davranış maddeleri ekler
  // (window.* ile — 02c'ye import kenarı eklemeden, TDZ-güvenli)
  try { Promise.resolve(window.porSessionEnrich?.()).catch(e => console.warn('porEnrich:', e)); } catch (_) {}
  // Örüntü Motoru (09d) — bugünün sinyal satırını hasat et (idempotent)
  try { Promise.resolve(window.omSessionHarvest?.()).catch(e => console.warn('omHarvest:', e)); } catch (_) {}
  personalizationSave();

  const userMsgCount = S.chatHistory.filter(m => m.role === 'user').length;
  if (userMsgCount < 1) { openDailyClosure(); return; }

  // Analiz sürüyorsa sadece overlay'i öne getir
  if (S.summaryInProgress) { document.getElementById('summary-overlay').classList.add('open'); return; }

  // Bu seans zaten özetlendiyse sonucu tekrar göster, API çağrısı yapma
  if (isSessionSummarized(S.currentSessId)) {
    setSummaryState('result');
    document.getElementById('summary-overlay').classList.add('open');
    return;
  }

  if (!isSummaryEligible()) {
    setSummaryState('ineligible');
    document.getElementById('summary-overlay').classList.add('open');
    return;
  }

  S.summaryInProgress = true;
  setSummaryState('analyzing');
  document.getElementById('summary-overlay').classList.add('open');

  try {
    const userLines = S.chatHistory
      .filter(m => m.role === 'user')
      .map((m, i) => `${i + 1}. ${m.content.slice(0, 200)}`)
      .join('\n');

    // Emre'nin cevaplarını da dahil et — daha zengin analiz
    const emreLines = S.chatHistory
      .filter(m => m.role === 'assistant')
      .map(m => m.content.slice(0, 100))
      .join(' | ');

    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text:
        p('prompt.summary.user', { userLines, emreLines })
      }] }],
      systemPrompt: p('prompt.summary.system'),
      maxTokens: 250, temperature: 0.3, jsonMode: true, model: SUMMARY_MODEL, skipPersona: true
    });

    let result;
    try { result = JSON.parse(raw); }
    catch {
      const tm = raw.match(/"title"\s*:\s*"([^"]+)"/);
      const sm = raw.match(/"summary"\s*:\s*"([^"]+)"/);
      if (tm && sm) result = { title: tm[1], summary: sm[1] };
      else throw new Error('Format okunamadı.');
    }

    // DB'ye kaydet ve özetler listesini güncelle
    const { error: insertErr } = await sb.from('chat_summaries').insert([{
      user_id:    S.currentUser.id,
      session_id: S.currentSessId,
      title:      result.title,
      summary:    result.summary
    }]);
    if (insertErr) console.warn('Özet kayıt hatası:', insertErr.message, insertErr.details);
    await loadSummaries();

    document.getElementById('sum-modal-title').textContent = result.title;
    document.getElementById('sum-modal-desc').textContent  = result.summary;
    setSummaryState('result');
    S.summarizedSessionId = S.currentSessId;
    S.summarizedSessionIds.add(S.currentSessId);
    S.summaryInProgress   = false;
    updateSessionRing(); // Halka rengini güncelle

    // Dönüşüm kartı üretimini arka planda başlat (kullanıcıyı bekletmez)
    generateAndSaveCard(result.title, result.summary).catch(e =>
      console.warn('Kart üretim hatası (sessiz):', e)
    );

  } catch (e) {
    console.error('Özet Hatası:', e);
    document.getElementById('sum-error-desc').textContent = t('error.summary_failed', 'Özet oluşturulamadı. Lütfen tekrar dene.');
    setSummaryState('error');
    S.summaryInProgress = false;
  }
}

export function proceedToMood() {
  document.getElementById('summary-overlay').classList.remove('open');
  S.summaryInProgress = false;
  // Geçiş ritüeli: hareket azaltma tercihinde doğrudan kapanışa geç
  if (AnimUtils.prefersReducedMotion()) {
    openDailyClosure();
    return;
  }
  // 2.5 saniyelik sessizlik anı
  const ritual = document.createElement('div');
  ritual.style.cssText = 'position:fixed;inset:0;z-index:var(--z-modal);background:#000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.8s;';
  const summaryTitle = document.getElementById('sum-modal-title')?.textContent || '';
  const ritualText = summaryTitle || t('chat.ritual_default', 'Bugün bunu gördün.');
  ritual.innerHTML = `<div style="font-family:var(--serif);font-size:24px;color:var(--gold);text-align:center;max-width:80%;line-height:1.5;opacity:0;transition:opacity 1s 0.4s;">${escapeHTML(ritualText)}</div>`;
  document.body.appendChild(ritual);
  requestAnimationFrame(() => {
    ritual.style.opacity = '1';
    ritual.querySelector('div').style.opacity = '1';
  });
  setTimeout(() => {
    ritual.style.opacity = '0';
    setTimeout(() => {
      ritual.remove();
      openDailyClosure();
    }, 800);
  }, 2500);
}

export async function loadSummaries() {
  const list = document.getElementById('summaries-list');
  if (!list) return;
  try {
    const { data, error } = await sb.from('chat_summaries')
      .select('*')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (!data?.length) { list.innerHTML = '<div class="empty-state">' + t('toast.no_summary') + '</div>'; return; }
    list.innerHTML = data.map(s => {
      const dStr = new Date(s.created_at).toLocaleDateString(S._currentLang || 'tr', { day: 'numeric', month: 'long', year: 'numeric' });
      const safeSid   = (s.session_id || '').replace(/[^a-zA-Z0-9_\-]/g, '');
      const safeTitle = escapeHTML(s.title || t('ui.unnamed'));
      const safeSummary = escapeHTML(s.summary || '');
      return `<div class="history-item" onclick="openSummarySession('${safeSid}')" style="cursor:pointer;">
        <div class="h-date">${dStr}</div>
        <div class="h-title">${safeTitle}</div>
        <div class="h-preview">${safeSummary}</div>
      </div>`;
    }).join('');
  } catch (e) {
    console.error('loadSummaries hatası:', e);
    list.innerHTML = '<div class="empty-state" style="color:var(--red);">' + t('ui.loading_failed') + '</div>';
  }
}

export function openSummarySession(sessionId) {
  if (!sessionId) return;
  const msgs = S.allSessions[sessionId];
  if (!msgs || !msgs.length) { showToast(t('toast.no_messages_today'), true); return; }
  S.currentSessId     = sessionId;
  S.chatHistory       = msgs.map(m => ({ role: m.role, content: cleanHistoryText(m.content), mode: m.mode || '' }));
  S.summaryInProgress = false;
  // Bu seans özetlendiyse summarizedSessionId'yi de ayarla ki halka doğru görünsün
  if (isSessionSummarized(sessionId)) {
    S.summarizedSessionId = sessionId;
  }
  /* SIRA ÖNEMLİ: önce Sohbet'e geç, SONRA çiz. `navigate` 03'ün switchView'ını
     tetikler, o da `w2RenderInfiniteChat()` çağırır ve "sonsuz bugün" akışını
     kurar. Çizim navigate'ten ÖNCE yapılırsa o kurulum geçmiş seansın üstüne
     yazıyordu: drawer'dan ya da aramadan açılan gün ekrana hiç gelmiyor,
     kullanıcı bugüne düşüyordu (2026-08-19'da canlıda ölçüldü — `w2key`
     geçmiş seansı gösterirken DOM bugünü çiziyordu). */
  EventBus.emit('navigate', { view: 'chat' });

  const _msgArea = document.getElementById('messages-area');
  _msgArea.innerHTML = '';
  // Bu, "sonsuz bugün" görünümü değil belirli bir seans — canlı DOM korumasını
  // geçersizleştir ki Sohbet'e dönüldüğünde 11 temiz yeniden-kurma yapsın.
  _msgArea.dataset.w2mode = 'session';
  S.chatHistory.forEach(m => {
    if (m.role === 'system' && fmRenderHistoryRow(m.mode)) {
      fmRenderSwitchDivider(m.mode.slice('fmswitch:'.length));
    } else {
      appendMsg(m.role === 'user' ? 'user' : 'emre', m.content, m.mode || '');
    }
  });
  /* Ana ekran (llm-home) akışı gizler — geçmiş bir gün açılıyorsa oradan
     inilmeli, yoksa mesajlar DOM'da olur ama ekranda karşılama durur. */
  try { window.llmLeaveHome?.(); } catch (_) {}
  updateSessionRing();
  applySessionPartDots(sessionId);
}

/* ═══ SESSION PROGRESS RING ═══ */
// summaryInProgress ve isSummaryEligible'dan SONRA tanımlandı (TDZ güvenli)
const SESSION_RING_TARGET = 10; // Kaç kullanıcı mesajında dolsun

export function updateSessionRing() {
  const userMsgs = S.chatHistory.filter(m => m.role === 'user').length;
  const fill     = document.getElementById('session-ring-fill');
  const count    = document.getElementById('session-ring-count');
  if (!fill || !count) return;

  // Özetlenmiş seans → mavi halka, "✓" simgesi, tıklayınca özete git
  if (isSessionSummarized(S.currentSessId)) {
    const circumf = 94.25;
    fill.style.strokeDashoffset = 0; // Tam dolu
    fill.className = 'session-ring-fill summarized';
    count.textContent = '✓';
    count.className = 'session-ring-count summarized';
    // Tıklama davranışını "Özete git" olarak güncelle
    const wrap = document.querySelector('.session-ring-wrap');
    if (wrap) {
      wrap.title = t('chat.ring_has_summary', 'Bu günün özeti var — görüntüle');
      wrap.onclick = () => {
        setSummaryState('result');
        document.getElementById('summary-overlay').classList.add('open');
      };
    }
    return;
  }

  // Normal halka davranışı
  const circumf = 94.25;
  const pct     = Math.min(userMsgs / SESSION_RING_TARGET, 1);
  fill.style.strokeDashoffset = circumf - pct * circumf;
  fill.className = 'session-ring-fill' + (userMsgs >= SESSION_RING_TARGET ? ' complete' : '');
  count.textContent = userMsgs;
  count.className = 'session-ring-count' + (userMsgs >= SESSION_RING_TARGET ? ' complete' : '');

  // Tıklama davranışını sıfırla
  const wrap = document.querySelector('.session-ring-wrap');
  if (wrap) {
    wrap.title = t('chat.ring_progress', 'Günün ilerlemesi');
    wrap.onclick = showRingInfo;
  }

  // Tam dolunca yalnızca görsel bildirim
  if (userMsgs === SESSION_RING_TARGET) {
    showToast(t('toast.conversation_mature'));
  }
}

export function resetSessionRing() {
  const fill  = document.getElementById('session-ring-fill');
  const count = document.getElementById('session-ring-count');
  if (!fill || !count) return;
  fill.style.strokeDashoffset = 94.25;
  fill.classList.remove('complete');
  count.textContent = '0';
  count.classList.remove('complete');
}

function showRingInfo() {
  const userMsgs = S.chatHistory.filter(m => m.role === 'user').length;
  if (userMsgs === 0) {
    showToast(t('toast.no_conversation'));
  } else if (userMsgs < SESSION_RING_TARGET) {
    showToast(t('toast.message_progress').replace('{{count}}', userMsgs).replace('{{target}}', SESSION_RING_TARGET));
  } else {
    showToast(t('toast.conversation_auto'));
  }
}

/* ═══ MOD PUSULASI — rozet tıklaması (FAZ 5, .claude/plans/mod-sistemi.md) ═══
   showToast yerine tören: 6 mod nokta-halkası (her biri kendi rengi, aktif
   olan büyür+nefes alır) + bugünkü mod yolculuğu çizgisi (S._modeHistory).
   Yapı announce-sheet/lib-sheet ile akraba (portal/veil/sheet). */
const _MP_ORDER = [
  AI_MODES.SOFT, AI_MODES.DIRECT, AI_MODES.REFLECTIVE,
  AI_MODES.CELEBRATE, AI_MODES.PATTERN, AI_MODES.DEPTH,
];

function _closeModePusulasi() {
  const portal = document.getElementById('mpc-portal');
  if (!portal) return;
  portal.querySelector('.mpc-sheet')?.classList.add('mpc-sheet--out');
  setTimeout(() => portal.remove(), 300);
}

export function showModeInfo(e) {
  if (e) e.stopPropagation();
  if (document.getElementById('mpc-portal')) return; // zaten açık

  const current = S.currentAIMode || AI_MODES.SOFT;
  const rawDesc = t('modeinfo.' + current);
  // modeinfo.* metni "{Etiket} — {cümle}" biçimindedir; büyük başlıkta etiket
  // zaten var, cümle kısmını ayır ki aynı kelime iki kez görünmesin.
  const desc = rawDesc.includes(' — ') ? rawDesc.split(' — ').slice(1).join(' — ') : rawDesc;

  const ring = _MP_ORDER.map(m => {
    const active = m === current;
    return `<span class="mpc-dot${active ? ' mpc-dot--active' : ''}" style="--mp-c:var(--mode-${m}-color)" title="${escapeHTML(t('mode.' + m))}"></span>`;
  }).join('');

  const history = (S._modeHistory || []).slice(-8);
  const journeyDots = history.map((m, i) => {
    const isNow = i === history.length - 1;
    return `<span class="mpc-jdot${isNow ? ' mpc-jdot--now' : ''}" style="--mp-c:var(--mode-${m}-color)" title="${escapeHTML(t('mode.' + m))}"></span>`;
  }).join('<span class="mpc-jline" aria-hidden="true"></span>');

  const portal = document.createElement('div');
  portal.id = 'mpc-portal';
  portal.className = 'mpc-portal';
  portal.innerHTML = `
    <div class="mpc-veil"></div>
    <div class="mpc-sheet" role="dialog" aria-modal="true" aria-label="${escapeHTML(t('mode.pusulasi.kicker', 'MOD PUSULASI'))}"><div class="wn-grain">
      <div class="mpc-grip" aria-hidden="true"></div>
      <button class="mpc-close" aria-label="${escapeHTML(t('common.close', 'Kapat'))}" type="button">✕</button>
      <div class="mpc-kicker">${escapeHTML(t('mode.pusulasi.kicker', 'MOD PUSULASI'))}</div>
      <div class="mpc-ring">${ring}</div>
      <div class="mpc-label" style="--mp-c:var(--mode-${current}-color)">${escapeHTML(t('mode.' + current))}</div>
      <div class="mpc-desc">${escapeHTML(desc)}</div>
      ${history.length ? `<div class="mpc-journey">
        <span class="mpc-journey-title">${escapeHTML(t('mode.pusulasi.journey', 'Bugünkü Yolculuğun'))}</span>
        ${journeyDots}
      </div>` : ''}
    </div></div>`;
  document.body.appendChild(portal);

  portal.querySelector('.mpc-veil')?.addEventListener('click', _closeModePusulasi);
  portal.querySelector('.mpc-close')?.addEventListener('click', _closeModePusulasi);
}

/* ═══ FEEDBACK ═══ */
let activeFeedbackIsPositive = false;

/* ═══ MESAJ EYLEM ŞERİDİ ═══
   Glif sözlüğü — tek çizim dili: ince çizgi, currentColor, yuvarlak uç.
   Kalınlık ve uç CSS'te (.fb-btn svg, chat.css) tek yerde durur; buradaki
   her glif yalnız kendi geometrisini taşır. Ölçünün kaynağı bu dosyadaki
   _SEND_ICON_SVG'dir — şerit artık gönder/dur ikonlarıyla aynı dili konuşur
   (eskiden Google Material'ın dolu siluetleriydi, uygulamada tek yabancıydı). */
const FB_GLIF = {
  kopyala: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  onay:    '<path d="M20 6L9 17l-5-5"/>',
  seslen:  '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"/>',
  yenile:  '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
  begen:   '<path d="M7 22V11l4-9a3 3 0 0 1 3 3v4h5.3a2 2 0 0 1 2 2.3l-1.4 9a2 2 0 0 1-2 1.7z"/><path d="M7 11H4a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3"/>',
  begenme: '<path d="M17 2v11l-4 9a3 3 0 0 1-3-3v-4H4.7a2 2 0 0 1-2-2.3l1.4-9a2 2 0 0 1 2-1.7z"/><path d="M17 13h3a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1h-3"/>',
  defter:  '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  paylas:  '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  duzenle: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  geri:    '<path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 3v6h6"/>',
  // hatirla (09j) — kalbin değil DÜĞÜMÜN dili: bağlanan bir iplik. Stroke,
  // 24'lük kutu, iki nokta arası bağ (bkz. ikon-buton dili).
  hatirla: '<path d="M12 3v6"/><path d="M12 15v6"/><circle cx="12" cy="12" r="3"/><path d="M6 8.5l2.5 2M18 8.5l-2.5 2"/>'
};

/* Şeridin TEK buton üreticisi. Eskiden on buton elle yazılıyordu: aynı satır
   on kez, aria yok, type yok — ve bir kural değişince on yerde değişirdi.
   `ek` yalnız niteliğe ihtiyaç duyan butonlar içindir (ör. beğeni ikilisi). */
function fbBtnHTML(glif, cagri, baslik, ek = '') {
  const ad = escapeHTML(baslik || '');
  return `<button type="button" class="fb-btn" onclick="${cagri}" title="${ad}" aria-label="${ad}"${ek}>`
       + `<svg viewBox="0 0 24 24" aria-hidden="true">${FB_GLIF[glif]}</svg></button>`;
}

/* Şeritteki her eylem mesajın HAM metnini buradan okur — tek kaynak.
   Eskiden her buton metni `data-content` niteliğinde taşırdı ve bu iki
   sessiz kırık üretiyordu: (1) nitelik değeri HTML parser'ından geçtiği için
   metin yazılırken `\n → ' '` düzleştiriliyor, çok paragraflı bir yanıt tek
   satır olarak kopyalanıyordu; (2) yedi tüketici dört ayrı yoldan okuyordu —
   üçü ham, üçü `&quot;`i ikinci kez çözerek. Ham metin artık HTML'e hiç
   girmez: balonun JS property'sinde durur (yazan tek yer _createMsgEl ve
   streaming finalize). */
export function msgRawText(btn) {
  return btn?.closest('.message')?._rawText || '';
}

/* Emre yanıtı altı şerit — saat + eylemler. Tek kaynak.
   timeStr: mesajın gönderildiği an'ın saati (HH:MM). Verilmezse nowTR() fallback. */
function buildMsgFooterHTML(text, timeStr) {
  const now = timeStr || nowTR().toLocaleTimeString('tr', { hour: '2-digit', minute: '2-digit' });
  return `<div class="msg-footer">
    <span class="msg-time">${now}</span>
    <div class="msg-feedback">
      ${fbBtnHTML('kopyala', 'copyMessage(this)', t('chat.copy', 'Kopyala'))}
      ${fbBtnHTML('seslen', 'sesSpeakMessage(this)', t('chat.speak', 'Sesli oku'))}
      ${fbBtnHTML('yenile', 'regenerateMessage(this)', t('chat.regen', 'Yeniden üret'), ' data-son="1"')}
      ${fbBtnHTML('begen', 'rateMessage(this,true)', t('ui.like', 'Beğendim'), ' data-rate="1" aria-pressed="false"')}
      ${fbBtnHTML('begenme', 'rateMessage(this,false)', t('ui.dislike', 'Beğenmedim'), ' data-rate="0" aria-pressed="false"')}
      ${fbBtnHTML('defter', 'saveToNotebookMsg(this)', t('chat.save_notebook', 'Not Defterine Ekle'))}
      ${fbBtnHTML('paylas', 'shareMessage(this)', t('ui.share', 'Paylaş'))}
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════════════
   ŞEFFAFLIK PANELİ — "Neden böyle konuştun?" (13D, FAZ 11)
   ──────────────────────────────────────────────────────────────
   Duygu Motoru'nun bu turun karşılamasını NEDEN seçtiğini açar; K3'ün üç
   kanıt sınıfını ayırır (BEYAN/ÖLÇÜM/YORUM) ve "beni yanlış okudun"
   jestini taşır. Emsal BİREBİR 10q'nun kkNedenAc/kkNedenGirisHTML
   deseni — yeni bir panel mimarisi kurulmadı.

   TAZELİK, KALICILIK DEĞİL (13D K10 kadran 2 — "Sohbet yanıtı: tazelik
   anlık, kalıcı hayır"). Bu yüzden giriş düğmesi yalnız _dgSeffaflikEkle
   ile, BU OTURUMDA yeni biten mesaja doğrudan eklenir (finalize()
   sonrası). buildMsgFooterHTML/_createMsgEl'e KONMADI: onlar geçmiş/reload
   render yolunu da paylaşır (renderHistory) ve S._dgSonKarsilama ile
   S._dgIklim.modelOkuma yalnız EN SON turu taşır — eski bir mesaja o
   veriyi iliştirmek başka bir turun kanıtını bu turunmuş gibi göstermek
   olurdu (§6.10). */

/** Bu turun karşılama kararından ve (varsa) modelin kendi okumasından
 *  panelin göstereceği veriyi çıkarır. Söylenecek hiçbir şey yoksa `null`
 *  döner — K7 kapısı burada: giriş düğmesi bu durumda hiç çizilmez. */
export function _dgSeffaflikVeri(karsilama, yorum) {
  if (!karsilama) return null;
  const varMi = !!(karsilama.kanit || karsilama.krizOkundu === false || (yorum && yorum.eksen));
  if (!varMi) return null;
  /* Düzeltme jestinin hedefi: kullanıcının GERÇEKTEN aldığı eksen
     tanıklık DEĞİLSE o eksenin kendisi; tanıklıksa (bir takasla oraya
     düştüyse) takas ÖNCESİ aday (`ikincil`). Tanıklığın kendisi hiçbir
     zaman susturulamaz (K6, dgKarsilama'nın kendi `secilen !== 'taniklik'`
     bekçisi) — ikincil de yoksa (ham karar zaten tanıklıksa) düzeltilecek
     bir şey yoktur, jest hiç gösterilmez. */
  /* `tutma` ASLA susturulamaz (K9, dikiş turu 2026-08-30). Kriz turunda
     panel normalde hiç doğmaz (kanıt null + krizOkundu true), AMA modelin
     kendi okuması (K5 `yorum`) varsa `varMi` true olur ve düzeltme jesti
     çizilirdi: kullanıcıya güvenlik yanıtını kapatma sözü veren bir düğme.
     `dgKarsilama`'nın kriz dalı zaten her şeyden önce dönüyor — yani beyan
     yazılsa bile işlemezdi; ama işlemeyen bir düğme göstermek de bir vaattir
     ve K9 pazarlıksızdır. Bekçi iki katlı olur (FAZ 7 denetiminin emsali:
     "kriz iki kez korunur"): tanıklık gibi `tutma` da hedef olmaz — ikincil
     de yoksa jest hiç gösterilmez. */
  const hedefEksen = (karsilama.eksen !== 'taniklik' && karsilama.eksen !== 'tutma')
    ? karsilama.eksen
    : (karsilama.ikincil || null);
  return { karsilama, yorum: yorum || null, hedefEksen };
}

/** Mesaj balonuna giriş düğmesini ekler — çağıran YALNIZ finalize()'dan
 *  hemen sonra, bu turun taze verisiyle çağırır (bkz. yukarıdaki tazelik
 *  notu). Veri elemente doğrudan asılır (`el._dgPanel`) — `div._rawText`
 *  ile aynı desen (msgRawText); ayrı bir kayıt defteri kurulmadı. */
function _dgSeffaflikEkle(el, karsilama, yorum) {
  if (!el) return;
  const v = _dgSeffaflikVeri(karsilama, yorum);
  if (!v) return; // K7 — kanıt yoksa giriş hiç çizilmez
  el._dgPanel = v;
  // .msg-footer'IN İÇİNE DEĞİL — footer hover'da belirir (opacity fade),
  // bu giriş kalıcı bir açıklama hakkıdır (10q kk-neden-giris emsali).
  // .msg-body'nin SONUNA eklenir: footer'dan sonra, ayrı bir satır.
  const host = el.querySelector('.msg-body');
  if (!host) return;
  host.insertAdjacentHTML('beforeend',
    `<button type="button" class="dg-neden-giris" onclick="dgSeffaflikAc(this)">${escapeHTML(t('dg.neden.giris', 'Neden böyle konuştun?'))}</button>`);
}

/** Paneli açar — hs-overlay kalıbı (10q'nun kkNedenAc'ıyla aynı; bu bir
 *  açıklama, bir tören PORTALI değil). `susturulmus` burada, AÇILIŞ
 *  ANINDA taze okunur (`el._dgPanel`'de KAYITLI DEĞİL) — aksi hâlde bir
 *  önceki mesajın panelinden susturulan eksen, ondan önce biten bu
 *  mesajın panelinde eski (susturulmamış) hâliyle görünürdü. */
export function dgSeffaflikAc(btn) {
  const v = btn?.closest('.message')?._dgPanel;
  if (!v) return false;
  try { ikvEnsureStyles(); } catch (_) {}
  document.getElementById('dg-neden-overlay')?.remove();

  const { karsilama, yorum, hedefEksen } = v;
  const susturulmus = hedefEksen ? dgBeyanVar(S._dgIklim, hedefEksen) : false;
  const eksenAdi = p('prompt.dg.eksen.' + karsilama.eksen);

  const krizSatir = karsilama.krizOkundu === false
    ? `<div class="dg-neden-satir dg-neden-satir--kriz">${escapeHTML(t('dg.neden.kriz_dikkat', 'Bu turda güvenlik kontrolü okunamadı; okumayı ihtiyatlı tuttum.'))}</div>`
    : '';

  // ÖLÇÜM — kanıt DAİMA kullanıcının kendi cümlesinden (13D _kanitKes).
  const olcumBlok = karsilama.kanit
    ? `<div class="dg-neden-alinti">
        <div class="dg-neden-alinti-h">${escapeHTML(t('dg.neden.olcum_head', 'Kendi cümlen buydu:'))}</div>
        <blockquote class="dg-neden-alinti-q">“${escapeHTML(karsilama.kanit)}”</blockquote>
      </div>`
    : '';

  // YORUM — modelin ikinci okuyucusu (FAZ 9, K5). İhtimalsel konuşur
  // ([[ihtimalsel-dil-devrimi]]) — ölçüm değil, bir çıkarımdır.
  const yorumBlok = (yorum && yorum.eksen)
    ? `<div class="dg-neden-yorum">${escapeHTML(
        t('dg.neden.yorum_metin', '{eksen} olabilir.').replace('{eksen}', p('prompt.dg.eksen.' + yorum.eksen)))}</div>`
    : '';

  // BEYAN — "beni yanlış okudun" jesti: süresiz AMA geri alınabilir
  // (09i secBeyanAzalt/GeriAl emsali). Sessiz zaman aşımı YOK.
  const beyanBlok = hedefEksen
    ? (susturulmus
        ? `<div class="dg-neden-susmus">${escapeHTML(t('dg.neden.beyan_susmus', 'Bunu daha önce sen söyledin — bu ekseni bir daha önermiyorum.'))}</div>
           <button type="button" class="ikv-seal-btn dg-neden-btn" data-act="geri">${escapeHTML(t('dg.neden.beyan_geri', 'Yine dene'))}</button>`
        : `<button type="button" class="ikv-ghost-btn dg-neden-btn" data-act="sustur">${escapeHTML(t('dg.neden.beyan_sustur', 'Beni yanlış okudun'))}</button>`)
    : '';

  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.style.cssText = 'z-index:var(--z-overlay-ust);';
  overlay.id = 'dg-neden-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', t('dg.neden.aria', 'Bu yanıt neden böyle verildi'));
  overlay.innerHTML = `
    <div class="modal dg-neden-modal ikv-panel ikv-panel--lapis">
      <div class="dg-neden-kicker">${escapeHTML(t('dg.neden.kicker', 'NEDEN BÖYLE KONUŞTUN?'))}</div>
      <div class="dg-neden-ad">${escapeHTML(eksenAdi)}</div>
      <div class="dg-neden-govde">
        ${krizSatir}
        ${olcumBlok}
        ${yorumBlok}
      </div>
      <div class="dg-neden-alt">${escapeHTML(t('dg.neden.alt', 'Bu bir teşhis değil — sana ne verdiğimin hesabı.'))}</div>
      <div class="dg-neden-nav">
        ${beyanBlok}
        <button type="button" class="modal-skip dg-neden-kapat" data-act="kapat">${escapeHTML(t('dg.neden.kapat', 'Kapat'))}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  const kapat = () => overlay.remove();
  overlay.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) { if (ev.target === overlay) kapat(); return; }
    const act = b.getAttribute('data-act');
    if (act === 'kapat') { kapat(); return; }
    /* GÜVENLİ DÜŞÜŞ (canlı doğrulamada yakalandı): panel bir kanıtı
       gösterdiği an S._dgIklim neredeyse hep hidre olmuştur (dgKarsilama
       zaten en az bir turdur okuyordu), ama garanti değildir — post-auth
       `dgInit()` henüz koşmadıysa (yarış) `S._dgIklim` hâlâ `null`dur ve
       `dgBeyanSustur(null, …)` sessizce `null` döner: `dgIklimKaydet`
       yazmaz, kullanıcı "Anlaşıldı" toast'ını görür ama HİÇBİR ŞEY
       KAYDEDİLMEZ — bu tam da §6.10'un yasakladığı sahte başarıdır.
       `dgIklimYukle()` fallback'i (kayıt yoksa varsayılan boş İklim) bu
       yarışı kapatır. */
    if (act === 'sustur' && hedefEksen) {
      S._dgIklim = dgBeyanSustur(S._dgIklim || dgIklimYukle(), hedefEksen);
      /* YANILMA DEFTERİ (K13, FAZ 15) — "beni yanlış okudun" AYNI ANDA iki
         şey yazar: `dgBeyanSustur` EKSENİ (kutlama/diriltme/…) susturur,
         `dgYanilmaDuzeltildi` bu YÜZEYİN (burada hep 'sohbet') düzeltme
         sayacını artırır — "ikiz jest AÇILMAZ" (plan), mevcut çağrının
         yanına biner. Sohbette yuzeyDefter hiç dolmamışsa (konustu=0)
         sessizce no-op döner (dgYanilmaDuzeltildi'nin kendi güvenli düşüşü). */
      S._dgIklim = dgYanilmaDuzeltildi(S._dgIklim, 'sohbet');
      dgIklimKaydet(S._dgIklim);
      try { window.wtLogDuygu?.(hedefEksen, { yuzey: 'sohbet', duzeltildi: true }); } catch (_) {}
      try { showToast(t('dg.neden.beyan_sustur_toast', 'Anlaşıldı. Bu ekseni artık önermiyorum — sen isteyene kadar.')); } catch (_) {}
      kapat();
      return;
    }
    if (act === 'geri' && hedefEksen) {
      S._dgIklim = dgBeyanGeriAl(S._dgIklim || dgIklimYukle(), hedefEksen);
      dgIklimKaydet(S._dgIklim);
      try { showToast(t('dg.neden.beyan_geri_toast', 'Yeniden deniyorum.')); } catch (_) {}
      kapat();
    }
  });
  return true;
}

/* "Bunu unutma" (09j) — yalnız KULLANICI mesajında. Modelin bir cümlesi
   mühürlenseydi hatırlanan şey bir yorum olurdu; köken kullanıcı olmak
   zorunda (§6.10). Durum basılırken okunur (senkron, bellek aynası) ve
   09j panelden/başka balondan değişince _butonlariTazele ile güncellenir.
   Modül gelmediyse buton hiç basılmaz — teklif edilmeyen şey vaat değildir. */
function _htBtnHTML(text) {
  if (typeof window === 'undefined' || !window.htPinliMi) return '';
  const pinli = window.htPinliMi(text);
  const ad = pinli ? t('chat.unpin', 'Aklından çıkar') : t('chat.pin', 'Bunu unutma');
  return fbBtnHTML('hatirla', 'htPinToggle(this)', ad,
    ` data-ht="1" aria-pressed="${pinli ? 'true' : 'false'}"`);
}

/* Kullanıcı mesajı altı şerit — Düzenle/Tekrar dene/Kopyala + saat.
   .msg-actions grubu CSS ile hover'da gösterilir; .msg-time her zaman görünür. */
function buildUserMsgFooterHTML(text, timeStr) {
  return `<div class="msg-footer msg-footer-user">
    <div class="msg-actions">
      ${fbBtnHTML('duzenle', 'editMessage(this)', t('chat.edit', 'Düzenle'))}
      ${fbBtnHTML('geri', 'retryMessage(this)', t('chat.retry', 'Tekrar dene'), ' data-son="1"')}
      ${fbBtnHTML('kopyala', 'copyMessage(this)', t('chat.copy', 'Kopyala'))}
      ${_htBtnHTML(text)}
    </div>
    <span class="msg-time">${timeStr}</span>
  </div>`;
}

/* `data-son` işaretli eylemler yalnız son mesajda anlamlıdır: "Yeniden üret"
   ve "Tekrar dene" turu yerinde yeniler, geçmişteki bir mesajda karşılığı
   yoktur. Şerit basılırken bunu bilemez (o an her mesaj sondur), bu yüzden
   yeni mesaj geldikçe geçmişte kalanlar buradan düşürülür — uygulama
   yapılamayacak bir şeyi teklif etmez. */
export function fbSonEylemleriTazele() {
  const area = document.getElementById('messages-area');
  if (!area) return;
  const emreEls = area.querySelectorAll('.message.emre:not([data-llm-error])');
  const sonEmre = emreEls[emreEls.length - 1] || null;
  const userEls = area.querySelectorAll('.message.user');
  const sonUser = userEls[userEls.length - 1] || null;
  area.querySelectorAll('.fb-btn[data-son]').forEach(b => {
    const msg = b.closest('.message');
    if (msg !== sonEmre && msg !== sonUser) b.remove();
  });
}

/* Kullanıcı mesajını input'a yükle — düzenleyip yeniden gönderebilsin. */
function editMessage(btn) {
  const inp = document.getElementById('chat-input');
  if (!inp) return;
  inp.value = msgRawText(btn);
  inp.focus();
  inp.setSelectionRange(inp.value.length, inp.value.length);
  inp.dispatchEvent(new Event('input'));
  inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function copyMessage(btn) {
  const text = msgRawText(btn);
  const ok = await copyTextToClipboard(text);
  if (ok) {
    const prev = btn.innerHTML;
    btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${FB_GLIF.onay}</svg>`;
    btn.classList.add('active');
    setTimeout(() => { btn.innerHTML = prev; btn.classList.remove('active'); }, 1400);
  } else {
    showToast(t('toast.copy_fail'), true);
  }
}

/* Clipboard yardımcısı — iOS Safari ve non-HTTPS fallback'leri ile */
async function copyTextToClipboard(text) {
  // Yol 1: Modern async clipboard API (HTTPS + user gesture gerekli)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) { /* düş */ }
  }
  // Yol 2: Legacy execCommand — iOS'ta contentEditable üzerinden selection gerekli
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
    document.body.appendChild(ta);
    // iOS'ta setSelectionRange gerekli (select() çalışmaz)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      ta.contentEditable = 'true';
      const range = document.createRange();
      range.selectNodeContents(ta);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      ta.setSelectionRange(0, text.length);
    } else {
      ta.select();
    }
    const success = document.execCommand('copy');
    document.body.removeChild(ta);
    return success;
  } catch (e) {
    return false;
  }
}

/* ─── SEÇİM → ALINTI ───
   Emre mesajında metin seçildiğinde floating "Alıntıla" butonu gösterilir.
   Tıklanınca seçili metin blockquote olarak input'a eklenir. */
let _selectionQuoteText = '';
function _updateSelectionToolbar() {
  const sel = window.getSelection();
  const toolbar = document.getElementById('selection-toolbar');
  if (!toolbar) return;
  const text = sel?.toString().trim();
  if (!text || !sel.rangeCount) {
    toolbar.classList.remove('visible');
    _selectionQuoteText = '';
    return;
  }
  const range = sel.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const msgEl = (container.nodeType === 1 ? container : container.parentElement)?.closest?.('.message.emre .msg-content');
  if (!msgEl) {
    toolbar.classList.remove('visible');
    _selectionQuoteText = '';
    return;
  }
  _selectionQuoteText = text;
  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) {
    toolbar.classList.remove('visible');
    return;
  }
  const isMobile = window.matchMedia('(max-width: 640px)').matches;
  const topOffset = isMobile ? 46 : 8;
  // Ekran dışına taşmayı önle
  const left = Math.max(60, Math.min(window.innerWidth - 60, rect.left + rect.width / 2));
  const top = Math.max(50, rect.top - topOffset);
  toolbar.style.left = left + 'px';
  toolbar.style.top = top + 'px';
  toolbar.classList.add('visible');
}
document.addEventListener('selectionchange', _updateSelectionToolbar);
document.addEventListener('mouseup', () => setTimeout(_updateSelectionToolbar, 10));
document.addEventListener('touchend', () => setTimeout(_updateSelectionToolbar, 250));
// iOS'ta scroll sırasında toolbar yanlış konumda kalmasın
window.addEventListener('scroll', throttle(() => {
  const tb = document.getElementById('selection-toolbar');
  if (tb?.classList.contains('visible')) _updateSelectionToolbar();
}, 100), true);

export function quoteSelection() {
  const input = document.getElementById('chat-input');
  if (!input || !_selectionQuoteText) return;
  // Seçimi blockquote formatında ekle
  const quoted = _selectionQuoteText.split('\n').map(l => '> ' + l).join('\n');
  const existing = input.value.trim();
  input.value = existing ? existing + '\n\n' + quoted + '\n\n' : quoted + '\n\n';
  input.focus();
  // Cursor'u sona koy
  input.setSelectionRange(input.value.length, input.value.length);
  // Toolbar'ı gizle, seçimi temizle
  document.getElementById('selection-toolbar').classList.remove('visible');
  window.getSelection()?.removeAllRanges();
  _selectionQuoteText = '';
  // Input auto-resize tetikle (varsa)
  input.dispatchEvent(new Event('input'));
}

function rateMessage(btn, isPositive) {
  const content = msgRawText(btn);
  // Kapsam yalnız beğeni İKİLİSİ. Eskiden gruptaki tüm .fb-btn'lerin `active`
  // sınıfı siliniyordu — Kopyala'nın onay tiki de beğeniye basınca sönüyordu.
  btn.parentElement.querySelectorAll('.fb-btn[data-rate]').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
  });
  btn.classList.add('active');
  btn.setAttribute('aria-pressed', 'true');
  S.activeFeedbackContent    = content;
  activeFeedbackIsPositive = isPositive;
  document.getElementById('fb-modal-title').textContent = isPositive ? t('ui.feedback_ask') : t('ui.feedback_title');
  document.getElementById('fb-modal-desc').textContent  = isPositive
    ? t('ui.feedback_desc_positive', 'Bu yanıtı beğendin. Bir yorum eklemek ister misin?')
    : t('ui.feedback_desc_negative', 'Bu yanıtı neden beğenmedin?');
  document.getElementById('fb-comment').value = '';
  document.getElementById('feedback-overlay').classList.add('open');
  setTimeout(() => document.getElementById('fb-comment').focus(), 100);
}

export async function submitFeedback() {
  const comment = document.getElementById('fb-comment').value.trim();
  document.getElementById('feedback-overlay').classList.remove('open');
  showToast(activeFeedbackIsPositive ? t('toast.thanks_positive') : t('toast.thanks_feedback'));

  // Personalization engine'e bildir — adaptif iletişimi güncelle
  p4RecordExplicitUIFeedback(activeFeedbackIsPositive, comment);

  try {
    await sb.from('feedbacks').insert([{
      user_id:         S.currentUser.id,
      session_id:      S.currentSessId || '',
      message_content: (S.activeFeedbackContent || '').slice(0, 500),
      is_positive:     activeFeedbackIsPositive,
      comment:         comment
    }]);
  } catch (e) { console.error('Geri bildirim gönderme hatası:', e); }
}

/* onclick handler'ları global olmalı — bunlar main.js'te import edilmiyor,
   bu yüzden doğrudan window'a bağlanır (aksi halde minify'da isim kaybolur). */
window.copyMessage  = copyMessage;
window.rateMessage  = rateMessage;
window.editMessage  = editMessage;
window.retryMessage = retryMessage;
window.regenerateMessage = regenerateMessage;
window.retryLastTurn     = retryLastTurn;
window.stopGeneration    = stopGeneration;
// Kaydedilemeyen mesajın "yeniden dene"si — uyarı düğmesi listener'la bağlanır,
// window yüzeyi sözleşme olarak durur (dışarıdan tetiklenebilsin diye).
window.retryPersist      = retryPersist;
// Deko-ledger replay köprüsü — geçmişi çizen 04 ve 11 buradan çağırır
// (06 zaten 04'ü import ediyor; ters yönde import döngü kurardı).
window.dekoCiz           = dekoCiz;
// Şeffaflık paneli (13D, FAZ 11) — giriş düğmesi inline onclick ile çağırır.
window.dgSeffaflikAc     = dgSeffaflikAc;

/* ═══ CHAT ENGINE ═══ */
// escapeHTML artık 00a-infrastructure.js'de tanımlı — global olarak erişilebilir

// Güvenli markdown → HTML sanitize'ı (DOMPurify + güvenli izin listesi)
export function safeMarkdown(text) {
  const rawHTML = marked.parse(text || '');
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(rawHTML, {
      ALLOWED_TAGS: ['p','br','strong','em','i','b','u','s','del','ins','code','pre','blockquote','ul','ol','li','h1','h2','h3','h4','h5','h6','a','hr','table','thead','tbody','tr','th','td','img'],
      ALLOWED_ATTR: ['href','title','target','rel','src','alt','loading'],
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: ['style','script','iframe','object','embed','form','input','svg','math'],
      FORBID_ATTR: ['style','onerror','onload','onclick','onmouseover']
    });
  }
  // Fallback: regex-temelli temizlik (DOMPurify yüklenmezse)
  return rawHTML
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>.*?<\/iframe>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/\sstyle\s*=\s*["'][^"']*["']/gi, '');
}

// Alias for legacy callers within this file
export const sanitizeMarkdown = safeMarkdown;

export function getTimeOfDayLabel(date) {
  const h = date.getHours();
  if (h >= 6  && h < 12) return t('time.morning', 'Sabah');
  if (h >= 12 && h < 17) return t('time.afternoon', 'Öğleden Sonra');
  if (h >= 17 && h < 21) return t('time.evening', 'Akşam');
  return t('time.night', 'Gece');
}

export function createTimePeriodDivider(label) {
  const div = document.createElement('div');
  div.className = 'time-period-divider';
  div.setAttribute('aria-hidden', 'true');
  div.innerHTML = `<div class="time-period-divider-line"></div><span class="time-period-divider-text">${escapeHTML(label)}</span><div class="time-period-divider-line"></div>`;
  return div;
}

/* V4 sohbet — spiral sigil + "BUGÜN · GÜN · TARİH" (wsv2-screens.jsx:130–135).
   Gün/ay adları dil-duyarlı (Intl); "BUGÜN" anahtardan gelir. */
export function createWsChatDateDivider(date = null) {
  const d = date ? toTR(date) : nowTR();
  const lang = S._currentLang || 'tr';
  const dayName = new Intl.DateTimeFormat(lang, { weekday: 'long' }).format(d).toLocaleUpperCase(lang);
  const datePart = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long' }).format(d).toLocaleUpperCase(lang);
  const dateText = `${t('chat.today_upper', 'BUGÜN')} · ${dayName} · ${datePart}`;
  const div = document.createElement('div');
  div.className = 'ws-chat-date-divider';
  div.setAttribute('aria-hidden', 'true');
  div.innerHTML = `
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 50 m-30 0 a30 30 0 1 1 30 30 a22 22 0 1 1 -22 -22 a14 14 0 1 1 14 14 a6 6 0 1 1 -6 -6"
        fill="none" stroke="var(--gold)" stroke-width="0.9"/>
    </svg>
    <span class="ws-chat-date-divider-text">${escapeHTML(dateText)}</span>
  `;
  return div;
}

export function _createMsgEl(role, text, modeClass = '', timestamp = null) {
  const isUser = role === 'user';
  const msgDate = timestamp ? toTR(timestamp) : nowTR();
  let contentHTML;
  if (isUser) {
    contentHTML = escapeHTML(text).replace(/\n/g,'<br>');
  } else {
    contentHTML = sanitizeMarkdown(text);
  }
  const now    = msgDate.toLocaleTimeString('tr', { hour: '2-digit', minute: '2-digit' });
  const sender = isUser ? getUserFirstName() : (S.settings.persona_name || 'EMRE THE WANDERER');
  const safeSender = escapeHTML(sender);
  const div    = document.createElement('div');

  let msgClass = 'message ' + (isUser ? 'user' : 'emre');
  if (!isUser && modeClass) msgClass += ' ' + modeClass;
  div.className = msgClass;

  const footerHTML = isUser ? buildUserMsgFooterHTML(text, now) : buildMsgFooterHTML(text, now);

  const dotHTML  = isUser ? (window.msgResistanceDotHTML?.(text) || '') : '';
  if (isUser) div.dataset.excerpt = text.slice(0, 200);
  // Footer (.msg-footer) içerik altında, .msg-body'nin doğrudan çocuğu olarak durur.
  // Emre'ta .msg-header (#chat-view'da display:none) içine konursa footer da kaybolur — bu yüzden dışarıda.
  div.innerHTML = isUser
    ? `<div class="msg-body"><div class="msg-sender">${dotHTML}${safeSender}</div><div class="msg-content">${contentHTML}</div>${footerHTML}</div>`
    : `<div class="msg-row"><span class="msg-line" aria-hidden="true"></span><div class="msg-body"><div class="msg-header"><div class="msg-sender">${safeSender}</div></div><div class="msg-content markdown-body">${contentHTML}</div>${footerHTML}</div></div>`;
  // Şeridin okuyacağı ham metin — HTML'e girmez, balonun üstünde durur (msgRawText).
  div._rawText = text || '';
  return div;
}

/** appendMsg/sendMessage/startStreamingMsg.finalize için hook registry (Faz 2.1).
 *  13-extras gibi modüller hook listener kaydeder; eskiden wrap edilen davranışlar burada toplanır. */
export const appendMsgHooks  = createHookRegistry();
export const sendMessageHooks = createHookRegistry();
export const startStreamingFinalizeHooks = createHookRegistry();

export function appendMsg(role, text, modeClass = '', timestamp = null) {
  const area = document.getElementById('messages-area');
  const msgDate = timestamp ? toTR(timestamp) : nowTR();
  const timePeriod = getTimeOfDayLabel(msgDate);
  if (S._lastTimeOfDayLabel !== timePeriod) {
    S._lastTimeOfDayLabel = timePeriod;
    area.appendChild(createTimePeriodDivider(timePeriod));
  }
  const div = _createMsgEl(role, text, modeClass, timestamp);
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
  fbSonEylemleriTazele();
  appendMsgHooks.runAfter(div, role, text);
  return div;
}

export function showTyping() {
  const area = document.getElementById('messages-area');
  if (!area) return;
  const div  = document.createElement('div');
  div.className = 'message emre'; div.id = 'typing-msg';
  const safeSender = escapeHTML(S.settings.persona_name || 'EMRE THE WANDERER');
  // Nabız atan 3 nokta — reasoning modeli düşünürken (ilk token'a kadar) canlı
  // kalan "düşünüyor" göstergesi. Tek yanıp sönen çubuk yerine bekleyişi yaşatır.
  div.innerHTML = `<div class="msg-row"><span class="msg-line" aria-hidden="true"></span><div class="msg-body"><div class="msg-header"><div class="msg-sender">${safeSender}</div></div><div class="msg-content"><span class="thinking-dots" aria-label="${escapeHTML(t('chat.thinking', 'düşünüyor'))}"><i></i><i></i><i></i></span></div></div></div>`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}
export function removeTyping() { document.getElementById('typing-msg')?.remove(); }

/* Streaming emre mesajı başlat — boş bir emre mesajı oluşturur ve
   chunk'lar geldikçe metni büyütür. End'te kalıcı mesajı döndürür. */
/* AKIŞ MASKESİ — [MOD:] etiketinin buffer'ı (00-config-tracking) neyi
   koruyorsa bu da onu korur: uygulamanın iç konuşması ekrana sızmamalı.
   Model alıntıyı `[S3]` diye gösterir (09j); o etiket ancak finalize'da
   çözülür, oysa akış onu token token basıyordu — kullanıcı saniyelerce
   ham referansı görüyordu. Burada YALNIZ görüntü maskelenir; `raw` bozulmaz,
   finalize gerçek metinle çalışır.
   İki desen: tamamlanmış `[S3]` ve HENÜZ tamamlanmamış kuyruk (`… [S`,
   `… [S1`). Kuyruk beklenmezse yarım etiket bir an ekranda kalırdı.
   Markdown linkinin açık kuyruğuna (`[metin](htt`) dokunulmaz: onun içinde
   boşluk/parantez vardır, desen eşleşmez. */
const _AKIS_REF_TAM  = /[\[(]\s*[Ss]\s*\d{1,2}\s*[\])]/g;
const _AKIS_REF_YARIM = /[\[(]\s*(?:[Ss]\s*\d{0,2})?\s*$/;

/* Duygu Motoru (13D, FAZ 9) — [MOD:xxx|DG:eksen#S2] normalde ekrana hiç
   ULAŞMAZ: createModeAwareChunkHandler (00-config-tracking) kendi
   arabelleğinde tutar, yalnız etiket TAMAMLANINCA arta kalanı basar. Bu
   ikili YEDEK KATMANDIR — parser'ın regex'i beklenmedik bir biçimle
   (Türkçeleşmiş `DUYGU:` etiketi gibi, [[llm-bicimleri-geri-sizar]])
   KIRILIRSA S3 fallback'i ham arabelleği olduğu gibi basar; bu iki desen
   o kaçağı da yutar. Yalnız BAŞTA aranır ("^") — sohbetin ortasında geçen
   bir "[MOD" metnini yanlışlıkla yemez. Temel desen 00-config-tracking'in
   `MOD_TAG_RE`'siyle AYNI omurgayı taşır — biri değişirse öteki de
   değişmeli (13o `gcFire` ikizi emsali). YARIM desen 40 karakterle
   sınırlı: onChunk'ın kendi 160 karakterlik sert tavanıyla aynı felsefe —
   sınırsız büyürse gerçek bir yanıtı da yutabilirdi. */
const _AKIS_MOD_TAM = /^\[MOD:[\p{L}\p{N}_]+(?:\s*\|\s*(?:DG|DUYGU)\s*:\s*[\p{L}_]*(?:\s*#\s*[Ss]?\d{0,2})?)?\]\s*/iu;
const _AKIS_MOD_YARIM = /^\[MOD[^\]\n]{0,40}$/i;

export function _akisMaskesi(metin) {
  const s = String(metin == null ? '' : metin);
  return s.replace(_AKIS_MOD_TAM, '').replace(_AKIS_MOD_YARIM, '')
    .replace(_AKIS_REF_TAM, '').replace(_AKIS_REF_YARIM, '')
    .replace(/[ \t]+$/, '');
}

export function startStreamingMsg(modeClass = '', dgRitim = null) {
  const area = document.getElementById('messages-area');
  // Mesajın gönderildiği anın saatini kaydet — finalize'da footer'a yazılacak
  const _msgTimeStr = nowTR().toLocaleTimeString('tr', { hour: '2-digit', minute: '2-digit' });

  // Balon DETACHED oluşturulur — DOM'a yalnız İLK chunk geldiğinde girer.
  // Reasoning modeli düşünürken (~20sn) kullanıcı boş bir balon değil, canlı
  // "düşünüyor" göstergesini görür; ilk içerikle gösterge balona dönüşür.
  // (Claude/ChatGPT deseni — algılanan ilk-token gecikmesini düşürür.)
  const div = document.createElement('div');
  let cls = 'message emre streaming';
  if (modeClass) cls += ' ' + modeClass;
  div.className = cls;

  const sender = S.settings.persona_name || 'EMRE THE WANDERER';
  const safeSender = escapeHTML(sender);
  div.innerHTML = `<div class="msg-row"><span class="msg-line" aria-hidden="true"></span><div class="msg-body"><div class="msg-header"><div class="msg-sender">${safeSender}</div></div><div class="msg-content markdown-body"><span class="stream-text"></span><span class="typing-cursor"></span></div></div></div>`;

  const textEl = div.querySelector('.stream-text');
  let raw = '';
  let _inserted = false;
  let _renderTimer = null;
  let _lastRenderAt = 0;
  // Duygu Motoru (13D, FAZ 7, K8 ritim kanalı) — yatıştırma/kutlamada
  // eksene göre yavaşlar/hızlanır (dgRitim.renderMs), diğer eksenlerde ve
  // dgRitim verilmediğinde (ör. summary/system çağrıları) varsayılana düşer.
  const RENDER_MIN_INTERVAL = (dgRitim && dgRitim.renderMs) || 60; // ms — chunk başına parse maliyetini sınırla

  // İlk içerik geldiğinde "düşünüyor" göstergesini kaldır + balonu DOM'a tak.
  const _ensureInserted = () => {
    if (_inserted) return;
    _inserted = true;
    removeTyping();
    if (area) { area.appendChild(div); area.scrollTop = area.scrollHeight; }
    try { window.fxCue?.('replyBreath'); } catch (_) {} // tur başına ~1 kez, 45s kapılı
    // Karşılamanın BEDEN kanalı (13D, FAZ 7, K8) — yalnız eksen bir ÖNCEKİ
    // turdan DEĞİŞTİYSE çalar (doz: aynı eksende sessiz kalır, art arda
    // "tanıklık" turlarında her seferinde ding çalmak duyguyu değil
    // gürültüyü karşılamak olurdu). Kriz (`tutma`) çağıran tarafta zaten
    // hiç üretilmiyor (K9) — burada ayrıca bir kontrol GEREKMEZ, cue adı
    // `null` gelir. 13e'nin kendi cooldownMs mekanizması dokunulmadı;
    // paralel bir zamanlayıcı KURULMADI — doz bu değişim kontrolüyle sağlanır.
    if (dgRitim && dgRitim.cue) { try { window.fxCue?.(dgRitim.cue); } catch (_) {} }
  };

  const scrollArea = () => {
    const nearBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 120;
    if (nearBottom) area.scrollTop = area.scrollHeight;
  };

  const renderNow = () => {
    textEl.innerHTML = sanitizeMarkdown(_akisMaskesi(raw));
    _lastRenderAt = Date.now();
    _renderTimer = null;
    scrollArea();
  };

  return {
    element: div,
    appendChunk(delta) {
      _ensureInserted();
      raw += delta;
      const now = Date.now();
      const elapsed = now - _lastRenderAt;
      if (elapsed >= RENDER_MIN_INTERVAL) {
        // Yeterince beklendi — hemen render et
        if (_renderTimer) { clearTimeout(_renderTimer); _renderTimer = null; }
        renderNow();
      } else if (!_renderTimer) {
        // Bir sonraki render'ı zamanla
        _renderTimer = setTimeout(renderNow, RENDER_MIN_INTERVAL - elapsed);
      }
    },
    finalize(finalText) {
      // Hiç chunk gelmeden finalize (lokal typewriter / kısa yanıt) → balonu tak.
      _ensureInserted();
      // Bekleyen render varsa iptal et, son metni garantili olarak yaz
      if (_renderTimer) { clearTimeout(_renderTimer); _renderTimer = null; }
      raw = finalText || raw;
      textEl.innerHTML = sanitizeMarkdown(raw);

      const cursor = div.querySelector('.typing-cursor');
      if (cursor) cursor.remove();
      div.classList.remove('streaming');

      /* ── MİCRO: Mesaj reveal animasyonu ── */
      div.classList.add('ma-reveal');
      setTimeout(() => div.classList.remove('ma-reveal'), 750);

      /* ── MİCRO: Gönder butonu tekrar nefes almaya başlar ── */
      const sb2 = document.getElementById('send-btn');
      if (sb2 && !sb2.disabled) {
        setTimeout(() => sb2.classList.add('breathing'), 400);
      }

      // Ham metin şeritten ÖNCE yazılır — şerit onu msgRawText ile okur.
      div._rawText = raw || '';
      div.querySelector('.msg-body').insertAdjacentHTML('beforeend', buildMsgFooterHTML(raw, _msgTimeStr));
      fbSonEylemleriTazele();
      startStreamingFinalizeHooks.runAfter(div, raw);
      return div;
    },
    // Tur iptal/hata/boş yanıt → balonu (takılıysa) + "düşünüyor" göstergesini temizle.
    // Balon hiç eklenmediyse div detached olduğundan remove() güvenli no-op'tur.
    discard() {
      if (_renderTimer) { clearTimeout(_renderTimer); _renderTimer = null; }
      removeTyping();
      div.remove();
    }
  };
}

/* ═══ ÜRETİM KONTROLÜ — durdur / yeniden üret / tekrar dene ═══ */
const _SEND_ICON_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
const _STOP_ICON_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>';

function _setSendBtnStopMode(on) {
  const btn = document.getElementById('send-btn');
  if (!btn) return;
  btn.classList.toggle('stop-mode', on);
  btn.innerHTML = on ? _STOP_ICON_SVG : _SEND_ICON_SVG;
  btn.setAttribute('aria-label', on ? t('chat.stop', 'Durdur') : t('chat.send', 'Mesaj gönder'));
}

export function stopGeneration() {
  try { S._llmAbort?.abort(); } catch (_) {}
}

/* Hata mesajı + "Tekrar dene" chip'i. Chip retryLastTurn'ü çağırır;
   kullanıcı mesajı zaten persist edildiği için yeniden insert yapılmaz. */
function _appendErrorWithRetry(err) {
  // 429 — sunucu kotayı kapattı (server_enforced llm-chat). "Tekrar dene"
  // chip'i anlamsız: taze durumu çekip kota duvarını göster (SETUP-KOTA adım 3).
  if (err && err.quota) {
    // Kriz penceresinde duvar tek başına bırakılmaz — kaynak kartı eşlik eder
    // (Emniyet Katmanı · Faz 2; sunucu muafiyeti gelene dek köprü).
    if (S._crisisMsgLeft > 0) window.showCrisisCard?.();
    ktStatus()
      .then(q => _showQuotaWall(q && q.used_week >= q.limit_week ? 'week' : 'window', q))
      .catch(() => _showQuotaWall('window', null));
    return;
  }
  const errDiv = appendMsg('emre', `_${userFriendlyError(err)}_`);
  if (errDiv) errDiv.dataset.llmError = '1';
  const area = document.getElementById('messages-area');
  if (!area || document.getElementById('llm-retry-chip')) return;
  const chip = document.createElement('div');
  chip.id = 'llm-retry-chip';
  chip.className = 'llm-retry-chip';
  chip.innerHTML = `<button class="btn-outline-gold llm-retry-btn" onclick="retryLastTurn()">↻ ${t('chat.retry', 'Tekrar dene')}</button>`;
  area.appendChild(chip);
  area.scrollTop = area.scrollHeight;
}

export async function retryLastTurn() {
  if (S._llmStreaming) return;
  document.getElementById('llm-retry-chip')?.remove();
  // Önceki hata balonlarını temizle — taze deneme temiz akışta görünsün
  document.querySelectorAll('#messages-area .message[data-llm-error]').forEach(el => el.remove());
  const lastUser = [...S.chatHistory].reverse().find(m => m.role === 'user');
  if (!lastUser) return;
  try {
    await _runLLMTurn(lastUser.content, {});
  } catch (err) {
    removeTyping();
    _appendErrorWithRetry(err);
    console.warn('retryLastTurn hatası:', err);
  }
}

/* Son yanıtı düşürüp aynı kullanıcı mesajıyla taze bir tur koşar.
   İKİ KAPININ ORTAK GÖVDESİ: emre şeridindeki "Yeniden üret" yanıta,
   kullanıcı şeridindeki "Tekrar dene" soruya dokunarak girer — vardıkları
   yer aynıdır. Kullanıcı mesajı yerinde KALIR: _runLLMTurn yalnız asistan
   satırını yazar, kullanıcı satırını sendMessage yazmıştı. Eskiden
   "Tekrar dene" metni input'a basıp sendMessage() çağırdığı için sohbette
   aynı soru iki kez görünürdü. */
async function _yanitiYenidenUret(emreEl, { asistanSart = false } = {}) {
  if (S._llmStreaming) return;
  const area = document.getElementById('messages-area');
  if (!area) return;

  // Son asistan kaydını bul — fmswitch 'system' satırlarını atla; araya yeni
  // kullanıcı mesajı girdiyse bu yanıt artık "son" değildir.
  let lastAssistantIdx = -1;
  for (let i = S.chatHistory.length - 1; i >= 0; i--) {
    if (S.chatHistory[i].role === 'assistant') { lastAssistantIdx = i; break; }
    if (S.chatHistory[i].role === 'user') break;
  }
  const lastUser = [...S.chatHistory].reverse().find(m => m.role === 'user');
  if (!lastUser) return;

  // Araya yanıtsız bir kullanıcı mesajı girmişse düşecek yanıt YOKTUR.
  // "Yeniden üret" bunu bir hata sayar (ekrandaki balon o turun yanıtı
  // değildir); "Tekrar dene" için meşrudur — yanıt hiç gelmemiştir.
  if (asistanSart && lastAssistantIdx === -1) {
    showToast(t('chat.regen_only_last', 'Yalnızca son yanıt yeniden üretilebilir.'));
    return;
  }

  if (lastAssistantIdx !== -1) {
    const _dusen     = S.chatHistory[lastAssistantIdx];
    const oldContent = _dusen.content;
    const oldId      = _dusen.id ?? null;
    S.chatHistory.splice(lastAssistantIdx, 1);
    /* Geçmiş kaydı da aynı kesinlikle düşer: kimlik varsa onunla, yoksa
       "sondan ilk asistan" tahminiyle. İki defter (chatHistory / allSessions)
       ayrı ayrı tutulduğu için biri kimlikle, öbürü tahminle silinirse
       yeniden üretimden sonra geçmiş ile bağlam ayrışır. */
    const sess = S.allSessions[S.currentSessId] || [];
    for (let i = sess.length - 1; i >= 0; i--) {
      const uygun = (oldId != null && sess[i].id != null)
        ? sess[i].id === oldId
        : sess[i].role === 'assistant';
      if (uygun) { sess.splice(i, 1); break; }
    }
    /* Kimlik varsa TEK satır düşer. Yoksa — eski kayıt ya da insert dönüşü
       hiç gelmemiş — içerik eşleşmesine düşülür: aynı içerikli iki yanıt
       varsa ikisini birden silen eski davranış, ama artık yalnız kimliğin
       bulunmadığı durumda. RLS delete'e izin vermiyorsa sadece uyarılır;
       yeni yanıt yine de üretilir. */
    const _silme = oldId != null
      ? sb.from('chat_history').delete()
          .eq('user_id', S.currentUser.id).eq('id', oldId)
      : sb.from('chat_history').delete()
          .eq('user_id', S.currentUser.id).eq('session_id', S.currentSessId)
          .eq('role', 'assistant').eq('content', oldContent);
    _silme.then(({ error }) => { if (error) console.warn('yeniden üret delete:', error.message); });

    // DOM'dan ancak hafızadan da düşen bir yanıt varsa balon silinir —
    // aksi hâlde ekrandan giden mesaj hafızada kalır ve geçmiş yüklemesinde
    // geri gelir (DOM ile hafıza ayrışır).
    const hedef = emreEl
      || [...area.querySelectorAll('.message.emre:not([data-llm-error])')].pop();
    if (hedef) {
      // Balonun altındaki araç/takip konteyneri (13a) öksüz kalmasın
      if (hedef.nextElementSibling?.classList.contains('arac-after')) {
        hedef.nextElementSibling.remove();
      }
      hedef.remove();
    }
  }

  try {
    await _runLLMTurn(lastUser.content, {});
  } catch (err) {
    removeTyping();
    _appendErrorWithRetry(err);
    console.warn('_yanitiYenidenUret hatası:', err);
  }
}

/* Emre şeridi kapısı — yalnız son yanıtta anlamlıdır. Şerit bu butonu zaten
   yalnız son mesaja basar (fbSonEylemleriTazele); kapı burada da durur çünkü
   geçmiş yüklemesiyle DOM ve hafıza ayrışabilir. */
async function regenerateMessage(btn) {
  if (S._llmStreaming) return;
  const msgEl = btn.closest('.message.emre');
  const area = document.getElementById('messages-area');
  if (!msgEl || !area) return;

  const emreEls = area.querySelectorAll('.message.emre:not([data-llm-error])');
  if (emreEls[emreEls.length - 1] !== msgEl) {
    showToast(t('chat.regen_only_last', 'Yalnızca son yanıt yeniden üretilebilir.'));
    return;
  }
  await _yanitiYenidenUret(msgEl, { asistanSart: true });
}

/* Kullanıcı şeridi kapısı — bu soruya verilen yanıtı yeniden ister. */
async function retryMessage(btn) {
  if (S._llmStreaming) return;
  const msgEl = btn.closest('.message.user');
  const area = document.getElementById('messages-area');
  if (!msgEl || !area) return;

  const userEls = area.querySelectorAll('.message.user');
  if (userEls[userEls.length - 1] !== msgEl) {
    showToast(t('chat.retry_only_last', 'Yalnızca son mesaj yeniden denenebilir.'));
    return;
  }
  await _yanitiYenidenUret(null);
}

/* ═══ KAYAN BAĞLAM ÖZETİ (Faz 2.1) ═══
   LLM'e son CHAT_CONTEXT_WINDOW mesaj gider; pencereden çıkan eski mesajlar
   arka planda SUMMARY_MODEL ile sıkıştırılıp <session_memory> olarak enjekte edilir. */
export const CHAT_CONTEXT_WINDOW = 16;
const ROLLSUM_MIN_EXITING = 6; // pencereden çıkan bu kadar mesaj birikince özet tazelenir

/* ── Girdi bütçesi: pencere mesaj SAYMAZ, yük ölçer ──
   16 mesaj tek cümlelik de olabilir, on sayfalık bir dökülme de — sabit sayı
   iki yönde de yanılır: kısa turlarda bağlam israf edilir, uzun turlarda
   bütçe taşar ve kesme kararını biz değil modelin kendi sınırı verir.
   Ölçü yaklaşıktır ama kaynağı bellidir: ~4 karakter bir token (Türkçe biraz
   daha yoğun, bütçe bu yüzden temkinli tutuldu).
   System prompt'un uzunluğu bütçeden DÜŞÜLÜR: bu turda promptu şişiren 14
   bağlam kanalı, araç rehberi ve emniyet metni pencereyle aynı keseden
   harcar — girdi tarafındaki körlük yalnız pencerede değildi.
   CHAT_CONTEXT_WINDOW üst sınır olarak kalır (yük düşükken bile sonsuz
   geçmiş gitmez; eskiyi taşımak rollsum'ın işidir), PENCERE_TABAN ise alt
   sınır: prompt ne kadar şişerse şişsin sohbet hafızasız kalmaz. */
export const CHAT_INPUT_BUDGET_CHARS = 24000;  // ~6K token
const PENCERE_TABAN = 4;

export function _pencereSec(gecmis, sistemUzunluk = 0) {
  const uygun = (gecmis || []).filter(m => m.role === 'user' || m.role === 'assistant');
  let kalan = CHAT_INPUT_BUDGET_CHARS - (sistemUzunluk || 0);
  const secilen = [];
  for (let i = uygun.length - 1; i >= 0 && secilen.length < CHAT_CONTEXT_WINDOW; i--) {
    const uzunluk = (uygun[i].content || '').length;
    if (secilen.length >= PENCERE_TABAN && uzunluk > kalan) break;
    kalan -= uzunluk;
    secilen.unshift(uygun[i]);
  }
  return secilen;
}

const ROLLSUM_KEY = (uid) => `etw_rollsum_v1_${uid}`;

/* Kayan özet artık diskte de durur. Eskiden yalnız bellekteydi: sayfa
   yenilenince S.chatHistory Supabase'ten geri geliyordu ama pencere DIŞINDA
   kalan her şeyin özeti sıfırlanıyordu — uzun bir günün ortasında bir reload,
   modelin o sabahı unutması demekti. Anahtar sessId taşır (day_YYYY-MM-DD),
   yani gün dönünce kayıt kendiliğinden geçersizleşir; ayrı temizlik gerekmez.
   `busy` diske YAZILMAZ: yarıda kesilen bir çağrı, reload'dan sonra kilitli
   bir bayrak olarak geri gelmemeli. */
export function _rollSumState() {
  if (!S._rollSum || S._rollSum.sessId !== S.currentSessId) {
    let disk = null;
    try {
      const kayit = SafeStorage.get(ROLLSUM_KEY(S.currentUser?.id || 'anon'), null);
      if (kayit && kayit.sessId === S.currentSessId) disk = kayit;
    } catch (_) {}
    S._rollSum = {
      sessId: S.currentSessId,
      text: disk?.text || '',
      covered: disk?.covered || 0,
      busy: false,
    };
  }
  return S._rollSum;
}

/* Anahtar per-uid'dir ama TEK slotludur — bu yüzden yazan taraf "bugün müyüm"
   diye sormak zorunda: openSummarySession (yukarıda) geçmiş bir günü açınca
   S.currentSessId'yi o güne çevirir ve o ekrandan tur koşulabilir. Kapı
   olmasa eski bir günün özeti bugünün kaydını EZERDİ; okuma tarafı sessId
   uyuşmazlığını doğru reddeder ama ezilen ilerleme geri gelmez — yani bu
   fazın vaadi sessizce iptal olurdu. Geçmiş gün görünümünün özeti bellekte
   yaşar, diskte değil. */
export function _rollSumPersist(rs) {
  if (!rs || rs.sessId !== 'day_' + localISODate()) return;
  try {
    SafeStorage.set(ROLLSUM_KEY(S.currentUser?.id || 'anon'),
      { sessId: rs.sessId, text: rs.text, covered: rs.covered });
  } catch (e) { console.warn('rollsum persist:', e && e.message); }
}

async function _maybeRefreshRollSum() {
  const rs = _rollSumState();
  if (rs.busy) return;
  const msgs = S.chatHistory.filter(m => m.role === 'user' || m.role === 'assistant');
  /* "Pencereden çıkan" artık sabit 16'nın ötesi değil: pencere yüke göre
     daraldığı için özetin sınırı da son turda gerçekten gönderilen boyuttur.
     Henüz bir tur koşmadıysa üst sınır varsayılır. */
  const exitingEnd = msgs.length - (S._sonPencereBoyu || CHAT_CONTEXT_WINDOW);
  if (exitingEnd - rs.covered < ROLLSUM_MIN_EXITING) return;

  rs.busy = true;
  try {
    const lines = msgs.slice(rs.covered, exitingEnd)
      .map(m => `${m.role === 'user' ? 'KULLANICI' : 'WANDERER'}: ${m.content.slice(0, 280)}`)
      .join('\n');
    const summary = await callLLM({
      contents: [{ role: 'user', parts: [{ text: p('prompt.rollsum.user', { prev: rs.text || '—', lines }) }] }],
      systemPrompt: p('prompt.rollsum.system'),
      maxTokens: 240, temperature: 0.3, model: SUMMARY_MODEL, skipPersona: true,
    });
    if (summary && summary.trim()) {
      rs.text = summary.trim().slice(0, 1600);
      rs.covered = exitingEnd;
      _rollSumPersist(rs);
    }
  } catch (e) {
    console.warn('rollsum:', e);
  } finally {
    rs.busy = false;
  }
}

/* ── Günlük mesaj sayacı — TEK anahtar {d, n}.
   Eski biçim ('etw_daily_msgs_<tarih>') her gün user_analytics'e yeni satır
   ekliyordu; storageInit her açılışta tüm satırları çektiğinden boot yükü
   sonsuz büyüyordu. İlk okumada bugünün eski anahtarı devralınır, tüm
   tarih-ekli anahtarlar bir kez süpürülür. */
const DAILY_MSGS_KEY = 'etw_daily_msgs';
function _dailyMsgState() {
  const today = localISODate();
  let st = SafeStorage.get(DAILY_MSGS_KEY);
  if (!st || typeof st !== 'object' || st.d !== today) st = { d: today, n: 0 };
  const legacy = parseInt(SafeStorage.getRaw(DAILY_MSGS_KEY + '_' + today) || '0', 10) || 0;
  if (legacy > st.n) st.n = legacy;
  if (!S._dailyMsgsPurged) {
    S._dailyMsgsPurged = true;
    try {
      SafeStorage.keys()
        .filter(k => k.startsWith(DAILY_MSGS_KEY + '_'))
        .forEach(k => SafeStorage.remove(k));
    } catch (_) {}
  }
  return st;
}

/* ── Kota duvarı — Emre'nin sesiyle (13m-kota.js metinleri).
   reason 'window' → 5 saatlik pencere; 'week' / yerel günlük → haftalık alan.
   Metin tek kaynaktan (ktWallText): sıcak, dürüst, ücretsiz sınırı şeffaf
   anlatır + Studio kapısını gösterir. Suçlama / "kaçış" yüzleştirmesi yok. */
function _showQuotaWall(reason, q) {
  const w = ktWallText(reason, q);
  appendMsg('emre', w.main, 'mode-direct');
  setTimeout(() => {
    appendMsg('emre', w.sub, 'mode-direct');
    const area = document.getElementById('messages-area');
    const btnDiv = document.createElement('div');
    btnDiv.style.cssText = 'display:flex;justify-content:center;padding:20px 0;';
    btnDiv.innerHTML = '<button class="btn-outline-gold" style="padding:14px 32px;" onclick="switchView(\'sub\')">' +
      escapeHTML(w.cta) + '</button>';
    area.appendChild(btnDiv);
    area.scrollTop = area.scrollHeight;
  }, 1500);
}

// Tehlikeli pattern kontrolü
const _SCRIPT_PATTERN = /<script[\s\S]*?>[\s\S]*?<\/script>/gi;

function _validateUserInput(text) {
  if (!text || typeof text !== 'string') return { ok: false, reason: 'empty' };
  // XSS: script tag enjeksiyon girişimi
  if (_SCRIPT_PATTERN.test(text)) return { ok: false, reason: 'unsafe' };
  _SCRIPT_PATTERN.lastIndex = 0; // stateful regex sıfırla
  return { ok: true };
}

/* ═══ KALICILIK — mesajın kimliğiyle doğması ═══
   Bir mesaj üç yerde birden yaşar: S.chatHistory (LLM bağlamı),
   S.allSessions (geçmiş) ve DOM balonu. Kimliği ancak veritabanı verebilir,
   o yüzden insert dönüşü üçüne birden iliştirilir.

   Kimlik olmadan "yeniden üret" hangi satırı düşüreceğini İÇERİKTEN tahmin
   etmek zorunda kalır — aynı oturumda aynı cümleyi iki kez duyduysan ikisini
   birden siler. Bu yüzden `.select('id')`.

   Dönüş boşsa (insert'te SELECT izni yok, ağ koptu) kayıt id'siz yaşamaya
   devam eder ve çağıran taraf eski içerik-eşleşmeli yola düşer: yeni yol
   çalışmazsa eskisi kadar iyi olur, daha kötü değil. */
export async function _persistMesaj(satir, { chatKaydi, sessKaydi, balon, kuyrukla = true } = {}) {
  try {
    const { data, error } = await sb.from('chat_history')
      .insert([satir]).select('id').single();
    if (error) {
      console.warn('DB hata:', error.message);
      _persistIsaretle(balon, { satir, chatKaydi, sessKaydi });
      if (kuyrukla) _kuyrugaAl(satir);
      return null;
    }
    const id = data?.id ?? null;
    /* Kimlik gelmemesi yazmanın başarısız olduğu anlamına GELMEZ — insert'te
       SELECT izni yoksa satır yazılır, dönüş boş gelir. O yüzden burada uyarı
       basılmaz: olmayan bir kayıp için kullanıcıyı telaşlandırmak, gerçek
       kaybı gizlemek kadar kötüdür. */
    if (id == null) return null;
    if (chatKaydi) chatKaydi.id = id;
    if (sessKaydi) sessKaydi.id = id;
    // Balonun kimliği: deko-ledger ve silme bu çapayı okur
    if (balon) balon.dataset.msgId = String(id);
    _persistIsaretiKaldir(balon);
    _kuyruktanDus(satir);
    return id;
  } catch (e) {
    console.warn('DB hata:', e && e.message);
    _persistIsaretle(balon, { satir, chatKaydi, sessKaydi });
    if (kuyrukla) _kuyrugaAl(satir);
    return null;
  }
}

/* Kaydedilemeyen mesaj bunu KENDİ ÜSTÜNDE söyler — konsolda değil.
   Ekranda duran ama veritabanına yazılamamış bir mesaj, yenilendiğinde yok
   olur; kullanıcı bunu ancak sözü kaybettiğinde öğrenirdi. Uyarı balonun
   içinde durur çünkü kayıp o mesaja aittir; ayrı bir hata balonu (LLM
   hatasının dili) burada yanlış olurdu — tur başarılı, yalnız mürekkep
   kurumadı. */
function _persistIsaretle(balon, is) {
  if (!balon) return;
  balon.dataset.persistFailed = '1';
  balon._persistIs = is;
  const mevcut = balon.querySelector('.msg-persist-warn');
  if (mevcut) { mevcut.disabled = false; return; }
  const govde = balon.querySelector('.msg-body');
  if (!govde) return;
  const uyari = document.createElement('button');
  uyari.type = 'button';
  uyari.className = 'msg-persist-warn';
  uyari.innerHTML = '<span class="mpw-nokta" aria-hidden="true"></span>'
    + escapeHTML(t('chat.persist_failed', 'kaydedilmedi'))
    + ' · <span class="mpw-eylem">' + escapeHTML(t('chat.persist_retry', 'yeniden dene')) + '</span>';
  uyari.addEventListener('click', () => { retryPersist(uyari); });
  govde.appendChild(uyari);
}

function _persistIsaretiKaldir(balon) {
  if (!balon || !balon.dataset.persistFailed) return;
  delete balon.dataset.persistFailed;
  balon._persistIs = null;
  balon.querySelector('.msg-persist-warn')?.remove();
}

/* ═══ TURUN TÖRESİ — bir turda tek davet ═══
   Yanıt mühürlendikten sonra dört ayrı tüketici sohbete bir şey indirmek
   ister: oluş mührü kartı, bekleyen ödev, Geçmiş Ben yankısı, ders kartı.
   Hiçbiri diğerinin varlığından haberdar değildi ve tur başına bir bütçe
   yoktu — üçüncü mesajda dördü birden inebiliyordu.
   Kartın anlamı SEYREKLİĞİNDEN gelir: dördü birden düşerse dördü de süse
   dönüşür. Bu yüzden tur bütçesi bir: sırayla denenir, ilk inen turu kapatır.

   Öncelik sırası bir yargıdır, mekanik değil: en nadir ve en kişisel olan
   önce gelir. Oluş mührü bir eşiğin geçildiği andır (nadir); ödev
   kullanıcının kendi taahhüdüdür; Geçmiş Ben bir yankıdır; ders en geneli.

   "İndi mi" ölçüsü DOM'dan okunur — tüketiciler bugün bir şey döndürmüyor
   ve dördünü birden imzaya zorlamak bu turun işi değil. Senkron enjeksiyon
   messages-area'nın çocuk sayısını hemen değiştirir; async olan (Geçmiş Ben)
   bilinçli olarak sona konur: ondan önce bir şey indiyse zaten çağrılmaz. */
export function _sahneTuru(adaylar) {
  const alan = document.getElementById('messages-area');
  const oncekiSayi = alan ? alan.childElementCount : 0;
  for (const aday of adaylar) {
    if (!aday || typeof aday.calistir !== 'function') continue;
    try { aday.calistir(); } catch (e) { console.warn('sahne:', aday.ad, e && e.message); }
    if (alan && alan.childElementCount > oncekiSayi) return aday.ad;
  }
  return null;
}

/* Ödev hatırlatması — kullanıcının kendi taahhüdü, 3. mesajda bir kez.
   Stil chat.css'te (.hw-chip): eskiden tamamı inline hardcode'du ve ürünün
   üç renkli dilinin dışında kendi lehçesini konuşuyordu. */
export function _odevChipiniBas() {
  if (S._sessionUserMsgs.length !== 3) return;
  /* Ödev 09'un modül-yerel `_activeHomework`'ünde yaşar; buradan bare
     identifier olarak okunuyordu ve `typeof … === 'undefined'` guard'ı onu
     HER ZAMAN yutuyordu — ödev DB'de dururken çip hiç doğmadı. Okuma artık
     09'un kendi köprüsünden (§5.2: window.* değil, gerçek import). */
  const odev = getActiveHomework();
  if (!odev?.task) return;
  if (document.getElementById('hw-chat-chip')) return;
  const area = document.getElementById('messages-area');
  if (!area) return;
  const chip = document.createElement('div');
  chip.id = 'hw-chat-chip';
  chip.className = 'hw-chip';
  chip.innerHTML = `<span class="hw-chip-badge">${escapeHTML(t('chat.homework_badge', 'ÖDEV'))}</span>`
    + `<span class="hw-chip-text">${escapeHTML(odev.task.slice(0, 80))}</span>`
    + `<button type="button" class="hw-chip-done">${escapeHTML(t('chat.done', 'Yaptım'))}</button>`
    + `<button type="button" class="hw-chip-close" aria-label="${escapeHTML(t('common.close', 'Kapat'))}">✕</button>`;
  chip.querySelector('.hw-chip-done').addEventListener('click', () => {
    try { Promise.resolve(markHomework('done')).catch(e => console.warn('markHomework:', e)); } catch (_) {}
    chip.remove();
  });
  chip.querySelector('.hw-chip-close').addEventListener('click', () => chip.remove());
  area.appendChild(chip);
}

/* ═══ DEKO-LEDGER — sohbetin izleri kalıcı olsun ═══
   Kitap alıntısı kartı, araç onay çipleri, takip soruları, kaynakça: hepsi
   canlı kancalarda doğuyor ve DB'de yaşamıyordu. Navigasyonda marker
   koruması kurtarıyor, ama sayfa YENİLENİNCE gidiyorlardı. Sohbet "yaşanmış
   bir yer" olacaksa izleri de yaşamalı — bir mesaj neyle birlikte doğduysa,
   geri dönüldüğünde onunla durmalı.

   Süs mesajın KİMLİĞİNE bağlanır: bu katman Faz 1 olmadan yazılamazdı.
   Çizim tüketicinin işidir; ledger yalnız veriyi taşır ve tipe göre doğru
   çiziciye verir. Tanınmayan tip sessizce atlanır (ileri uyumluluk).
   Kolon henüz uygulanmamışsa (ELLE migration 041) yazma sessizce düşer ve
   ürün bugünkü davranışına devam eder — §6.5: deploy edilmiş varsayılmaz. */
const _dekoCiziciler = Object.create(null);

/** Bir süs tipini ve onu geri çizen fonksiyonu kaydeder. */
export function dekoTanit(tip, cizici) {
  if (tip && typeof cizici === 'function') _dekoCiziciler[tip] = cizici;
}

/** Süsü mesajın kaydına iliştirir. Kimliği olmayan balona yazılamaz. */
export async function dekoYaz(balon, tip, veri) {
  const id = balon?.dataset?.msgId;
  if (!id || !tip) return false;
  const defter = { ...(balon._deko || {}), [tip]: veri };
  balon._deko = defter;
  try {
    const { error } = await sb.from('chat_history')
      .update({ decorations: defter })
      .eq('id', id).eq('user_id', S.currentUser?.id);
    if (error) { console.warn('deko yazılamadı:', error.message); return false; }
    return true;
  } catch (e) {
    console.warn('deko yazılamadı:', e && e.message);
    return false;
  }
}

/** Geçmişten gelen süsleri balona geri çizer (rebuild replay). */
export function dekoCiz(balon, defter) {
  if (!balon || !defter || typeof defter !== 'object') return 0;
  balon._deko = defter;
  let cizilen = 0;
  for (const [tip, veri] of Object.entries(defter)) {
    const cizici = _dekoCiziciler[tip];
    if (!cizici) continue;   // tanınmayan tip — kayıt bozulmaz, yalnız çizilmez
    try { cizici(balon, veri); cizilen++; }
    catch (e) { console.warn('deko çiz:', tip, e && e.message); }
  }
  return cizilen;
}

/* Araç motorunun çıktısı (13a) ilk tüketici: `proto` zaten saf JSON
   ({tools, kagit, takip}), yani ledger'a olduğu gibi girer ve geri çizim
   aynı fonksiyonu yeniden çağırmaktan ibarettir. */
dekoTanit('arac', (balon, veri) => { window.aracAfterReply?.(balon, veri); });

/* Görünür kanıt (09j): alıntı bloğu yanıtın ÜSTÜNE girer — kullanıcı önce
   kendi cümlesini görür, sonra onun üzerine söyleneni. Ledger'a yalnız
   çözülmüş alıntılar yazılır (ref değil METİN), çünkü havuz her turda
   yeniden kurulur: yarın aynı `[S3]` bambaşka bir söze denk gelirdi.
   Kaydedilen şey referans değil, kanıtın kendisidir. */
export function _alintiCiz(balon, alintilar) {
  if (!balon || !Array.isArray(alintilar) || !alintilar.length) return;
  try {
    const govde = balon.querySelector('.msg-content') || balon;
    if (govde.querySelector('.ht-alinti-kume')) return;   // replay çift çizmesin
    const html = window.htAlintiHTML?.(alintilar) || '';
    if (html) govde.insertAdjacentHTML('afterbegin', html);
  } catch (e) { console.warn('alıntı çiz:', e && e.message); }
}
dekoTanit('alinti', (balon, veri) => _alintiCiz(balon, veri));

/* ═══ GÖNDERİM KUYRUĞU — ulaşamayan söz cihazda bekler ═══
   Neden SafeStorage DEĞİL: SafeStorage bellek-içi bir önbellek + Supabase'e
   kuyruklu yazmadır, hidrasyonu da Supabase'ten gelir. Bu verinin TANIMI ise
   "veritabanına ulaşamamış olan"dır — onu veritabanına yazan bir depoya
   emanet etmek çelişki olurdu. Ham localStorage cihazda durur:
   çevrimdışıyken de, sekme kapandıktan sonra da.
   Anahtar uid ekiyle: paylaşılan bir cihazda başkasının sözü taşınmaz.

   TASLAK burada DEĞİL: composer'ın yarım cümlesini 13a-arac-motoru zaten
   tutuyor (`etw_draft_chat`, 400ms debounce, `sendMessageHooks.before` ile
   temizlik) ve o katman pre-auth de çalışıyor. Bu sprintte bir ikizi
   yazılmıştı; denetimde bulunup kaldırıldı — tek iş, tek yer. */
const KUYRUK_ONEK  = 'wn_chat_kuyruk_';
const KUYRUK_TAVAN = 20;   // cihazda sonsuz birikmesin

function _kalicilikAnahtari(onek) {
  return onek + (S.currentUser?.id || 'anon');
}

function _yerelOku(anahtar, varsayilan) {
  try {
    const ham = localStorage.getItem(anahtar);
    return ham ? JSON.parse(ham) : varsayilan;
  } catch (_) { return varsayilan; }
}

function _yerelYaz(anahtar, deger) {
  try {
    const bos = deger == null || deger === '' || (Array.isArray(deger) && !deger.length);
    if (bos) localStorage.removeItem(anahtar);
    else localStorage.setItem(anahtar, JSON.stringify(deger));
  } catch (_) { /* kota dolu ya da özel mod — taslak bir lükstür, sohbeti bloklamaz */ }
}

function _kuyrukOku() {
  const k = _yerelOku(_kalicilikAnahtari(KUYRUK_ONEK), []);
  return Array.isArray(k) ? k : [];
}

function _kuyrukYaz(kuyruk) {
  _yerelYaz(_kalicilikAnahtari(KUYRUK_ONEK), kuyruk?.length ? kuyruk.slice(-KUYRUK_TAVAN) : null);
}

function _ayniSatir(a, b) {
  return a && b && a.role === b.role && a.content === b.content && a.session_id === b.session_id;
}

function _kuyrugaAl(satir) {
  if (!satir) return;
  const k = _kuyrukOku();
  // "Yeniden dene" döngüsünde aynı satır üst üste birikmesin
  if (k.some(s => _ayniSatir(s, satir))) return;
  k.push(satir);
  _kuyrukYaz(k);
}

function _kuyruktanDus(satir) {
  if (!satir) return;
  const k = _kuyrukOku();
  if (!k.length) return;
  const kalan = k.filter(s => !_ayniSatir(s, satir));
  if (kalan.length !== k.length) _kuyrukYaz(kalan);
}

/* Ağ zaman aşımında sunucu satırı yazmış ama yanıt dönmemiş olabilir; kuyruk
   onu ikinci kez yazarsa sohbette çift cümle görünür. Şemaya istemci anahtarı
   eklemeden en ucuz kanıt: aynı oturumda aynı rol+içerik zaten duruyor mu?
   Sorgu başarısız olursa "yazılmamış" sayılır — kaybetmektense tekrarlamak
   yeğdir, ama önce sorulur. */
async function _zatenYazilmis(satir) {
  try {
    const { data } = await sb.from('chat_history').select('id')
      .eq('user_id', satir.user_id).eq('session_id', satir.session_id)
      .eq('role', satir.role).eq('content', satir.content).limit(1);
    return !!(data && data.length);
  } catch (_) { return false; }
}

/** Cihazda bekleyen sözleri veritabanına taşımayı dener. Yazılamayanlar
 *  kuyrukta kalır — bir sonraki açılışta yeniden denenir. */
export async function chatKuyruguBosalt() {
  const kuyruk = _kuyrukOku();
  if (!kuyruk.length || !S.currentUser?.id) return 0;
  const kalan = [];
  let yazilan = 0;
  for (const satir of kuyruk) {
    if (await _zatenYazilmis(satir)) continue;
    const id = await _persistMesaj(satir, { kuyrukla: false });
    if (id == null) kalan.push(satir); else yazilan++;
  }
  _kuyrukYaz(kalan);
  return yazilan;
}

/* Post-auth init (03-auth-shell): kuyruk ham localStorage'da olduğu için
   SafeStorage hidrasyonuna bağlı değil — ama UID'e bağlı, çünkü doğru
   anahtar kullanıcı belli olmadan bilinemez. */
export function chatKuyrukInit() {
  chatKuyruguBosalt().catch(() => {});
}

/* Kullanıcı "yeniden dene" dediğinde aynı satır tekrar yazılmayı dener.
   Mesaj ekranda ZATEN duruyor — yeni bir balon doğmaz, yalnız mürekkep
   yeniden sürülür. */
export async function retryPersist(btn) {
  const balon = btn?.closest?.('.message');
  const is = balon?._persistIs;
  if (!balon || !is) return null;
  const uyari = balon.querySelector('.msg-persist-warn');
  if (uyari) uyari.disabled = true;
  const id = await _persistMesaj(is.satir, {
    chatKaydi: is.chatKaydi, sessKaydi: is.sessKaydi, balon,
  });
  // Başarısızsa _persistMesaj işareti yeniden kurar ve butonu tekrar açar
  return id;
}

export async function sendMessage() {
  // Üretim sürerken gönder butonu "durdur" görevi görür (stop-mode)
  if (S._llmStreaming) { stopGeneration(); return; }
  sendMessageHooks.runBefore();
  const inp  = document.getElementById('chat-input');
  const text = inp.value.trim();
  if (!text) return;

  // Input validation — sessiz yutma yok, kullanıcı neden gönderemediğini görsün
  const validation = _validateUserInput(text);
  if (!validation.ok) {
    if (validation.reason === 'unsafe') {
      showToast(t('chat.unsafe_input', 'Mesaj gönderilemedi — script benzeri içerik kaldırılmalı.'), true);
    }
    return;
  }

  // Çift gönderim koruması
  const sendBtn = document.getElementById('send-btn');
  if (!sendBtn || sendBtn.disabled) return;

  try { window.fxCue?.('sendTick'); } catch (_) {}

  /* ── MİCRO: Gönder nabzı + nefes durdur ── */
  sendBtn.classList.remove('breathing');
  sendBtn.classList.add('sending');
  setTimeout(() => sendBtn.classList.remove('sending'), 500);

  /* ── MİCRO: Input gold pulse ── */
  const inputRow = document.querySelector('.input-row');
  if (inputRow) {
    inputRow.classList.remove('ma-gold-pulse');
    void inputRow.offsetWidth; // reflow
    inputRow.classList.add('ma-gold-pulse');
    setTimeout(() => inputRow.classList.remove('ma-gold-pulse'), 1200);
  }

  // Rate limiting — client-side koruma (RateLimiter: 00a-infrastructure.js)
  if (!RateLimiter.canSend()) {
    showToast(t('toast.take_breath'));
    A11y.announceToSR(t('toast.take_breath'));
    return;
  }
  RateLimiter.record();

  // Wanderer ücretsiz katman — Claude tarzı çift kota: 5 saatlik pencere +
  // haftalık tavan (13m-kota.js, sayaç sunucuda). Kota motoru kurulu değilse
  // (migration 018 yok / ağ hatası) eski yerel günlük sayaç devrede kalır.
  const _daily = _dailyMsgState();
  let _localQuota = false;
  if (!S.isPremium) {
    const _gate = await ktGate();
    if (_gate.available) {
      if (!_gate.allowed) { _showQuotaWall(_gate.reason, _gate.q); return; }
    } else {
      _localQuota = true;
      // Üç Mühür armağanı — ultra günde yerel sınır da +9 (kota motoru
      // kurulu olmasa bile ödül işlesin; 10u window.usIsUltraToday)
      let _ultraBonus = 0;
      try { _ultraBonus = window.usIsUltraToday?.() ? 9 : 0; } catch (_) {}
      if (_daily.n >= (S.settings.free_message_limit || 20) + _ultraBonus) { _showQuotaWall('week', null); return; }
    }
  }

  // Silence pressure sıfırla
  resetSilencePressure();

  // Detektörleri çalıştır
  const userMsgIndex = S._sessionUserMsgs.length;
  S._sessionUserMsgs.push(text);
  trackIdentityDrift(text);
  logResistanceMoment(text);   // Direniş haritası
  trackSilenceTopic(text);     // Sessizlik analizi
  captureCommitments(text);    // Taahhüt döngüsü
  trackEmotionalFlow(text);    // Duygusal akış takibi

  // Kişiselleştirme motoru — tüm 5 katman analizi (non-blocking)
  const _analyzeText = text;
  (typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (fn) => setTimeout(fn, 0))(() => personalizationAnalyze(_analyzeText));

  // Duygusal zirve kontrolü
  if (detectEmotionalSpike(text)) handleEmotionalSpike(text);

  // Kriz algılama (Özellik 1)
  window.handleCrisisIfNeeded?.(text);

  // Breakthrough moment kontrolü
  if (detectBreakthrough(text)) {
    saveBreakthroughMoment(text);
    // Flash efekti — altın
    const fl = document.getElementById('flash-overlay');
    // Ürünün altını tokendan gelir — elle yazılan rgba(184,149,60) ona
    // benzeyen BAŞKA bir altındı (--gold #F5A623 değil).
    fl.style.background = 'var(--gold-dim)';
    fl.classList.add('flash');
    setTimeout(() => { fl.classList.remove('flash'); fl.style.background = ''; }, 600);
  }

  // Öz-çelişki kontrolü
  const contradictionMsg = trackSelfContradiction(text, userMsgIndex);

  updateAIMode(text);

  inp.value = ''; inp.style.height = 'auto';
  const _userMsgDiv = appendMsg('user', text);
  analyzeMessagePart(text, _userMsgDiv); // #8 — async, non-blocking
  const _userKayit     = { role: 'user', content: text, mode: '' };
  const _userSessKayit = { role: 'user', content: text, created_at: new Date().toISOString() };
  S.chatHistory.push(_userKayit);
  if (!S.allSessions[S.currentSessId]) S.allSessions[S.currentSessId] = [];
  S.allSessions[S.currentSessId].push(_userSessKayit);
  renderHistory();
  updateSessionRing();

  // Kimlik arka planda iliştirilir — LLM turu bunu beklemez (await yok),
  // ama kullanıcı yanıtı okurken id çoktan yerine oturmuş olur.
  _persistMesaj(
    { user_id: S.currentUser.id, session_id: S.currentSessId, role: 'user', content: text },
    { chatKaydi: _userKayit, sessKaydi: _userSessKayit, balon: _userMsgDiv }
  );
  updateStreakUI(calculateStreak(getAllMessages()));
  // Gün Serisi (13r) — Wanderer LLM'e özel: bugün Emre'yle konuşuldu, işaretle
  try { window.gsRecordChatDay?.(); } catch (_) {}

  // Kişiselleştirme motoru — her 10 mesajda otomatik kaydet
  if (S._sessionUserMsgs.length % 10 === 0) {
    personalizationSave();
  }

  // Yerel günlük sayaç yalnız kota motoru kapalıyken artar (fallback);
  // motor aktifken sayaç sunucuda (ktGate → quota_consume)
  if (_localQuota) {
    _daily.n += 1;
    SafeStorage.set(DAILY_MSGS_KEY, _daily);
  }
  S.messageCount++;
  if (S.messageCount % 5 === 0) {
    sb.from('profiles').update({ message_count: S.messageCount }).eq('id', S.currentUser.id).then(({error}) => { if (error) console.warn('DB hata:', error.message); });
  }

  try {
    await _runLLMTurn(text, { contradictionMsg });
  } catch (err) {
    removeTyping();
    _appendErrorWithRetry(err);
    console.warn('sendMessage hatası:', err);
  } finally {
    resetSilencePressure();
  }
}

/* ═══ LLM TURU — sendMessage / regenerateMessage / retryLastTurn ortak çekirdeği.
   Kullanıcı mesajı çağrılmadan ÖNCE persist edilmiş olmalı. Streaming UI,
   mod seçimi, asistan persist'i ve yanıt-sonrası kancaları burada yönetilir.
   Hata fırlatır — çağıran taraf hata balonu + tekrar dene chip'inden sorumlu. */
async function _runLLMTurn(text, { contradictionMsg = '' } = {}) {
  const _abort = new AbortController();
  S._llmAbort = _abort;
  S._llmStreaming = true;
  _setSendBtnStopMode(true);
  showTyping();

  try {
    // EN prompt sözlüğü sidecar'dan gelmemişse burada bekle (TR'de no-op,
    // EN'de boot prefetch'i sayesinde pratikte anında çözülür).
    await ensurePromptLang();

    // --- RAG QUERY (context bütçesi buna bağlı, önce hesapla) ---
    const _rag = buildSmartRagQuery(text, S.chatHistory);

    // --- EK BAĞLAMLARI TOPLA (buildContextPrompt XML yapısına entegre edilecek) ---
    const _inPatternMode = S._modeHint === AI_MODES.PATTERN;

    const hesapCtx = window.getHesapGunuContext?.() || '';

    /* --- BAĞLAM MODU ÖN-HESABI (01 ile birebir aynı girdiler) ---
       buildContextPrompt bu iki bölümü bütçesi 0 olan modlarda (kriz /
       derin-duygu / bilgi-arayışı) zaten atıyordu. Sorun atmasında değil,
       tüketicilerinin YAN ETKİLİ olmasındaydı:
         • apGetHintContext haftalık ipucu kotasını harcar ve "bu hipotez
           soruldu" damgasını basar — 09a seans sonu analizinde kullanıcının
           HİÇ GÖRMEDİĞİ bir soruya verilmiş sahte bir onay/ret çıkarabiliyor,
           portrenin changelog'una "Doğruladın: …" diye yazıyordu.
         • ehRecall embed kotasını (60/gün) ve 800ms'i boşa yakıyordu.
       Modu burada önce çözüp iki kapıyı da kaynağında kapatıyoruz. */
    const _crisisCtx = window.getCrisisContext?.() || '';
    const _ctxMode = _determineContextMode(text, { crisis: _crisisCtx, _ragActive: _rag.shouldRAG });
    const _ctxBudget = _CONTEXT_BUDGETS[_ctxMode] || _CONTEXT_BUDGETS.standard;

    // Epizodik Hafıza (09f) — yalnız "geçmişe atıf" sinyali olan metinlerde
    // gerçekten çalışır (_shouldRecall gate); kendi 800ms tavanı var, bu
    // await asla sohbeti gözle görülür biçimde geciktirmez.
    const recalledMemories = (_ctxBudget.recalled_memories === 0)
      ? ''
      : await (typeof window.ehRecall === 'function' ? window.ehRecall(text) : Promise.resolve(''));

    /* Ayna ipucu — üretilir ama MÜHÜRLENMEZ; mühür turun sonunda, yanıt
       gerçekten kullanıcıya ulaştıktan sonra basılır (09g sözleşmesi). */
    const _mirrorHint = (_ctxBudget.mirror_hypothesis === 0) ? null : (window.apGetHintContext?.() || null);

    /* Söz havuzu (09j) — TUR BAŞINA BİR KEZ. Harita finalize'da lazım:
       model `[S3]` gösterir, metni biz keseriz. Havuz boşsa bölüm hiç
       doğmaz ve parser da hiçbir şey aramaz (kayıpsız düşüş). */
    const _havuz = (() => {
      /* Bütçe kapısı prompt'ta bölümü zaten düşürür; havuzu BURADA da
         kurmamak mimari garantidir: kriz anında modelin yanıtı tesadüfen
         `[S1]`e benzese bile ekrana geçmişten bir cümle basılmaz. Kapı
         üretim yerinde, atma yerinde değil (Tanıyan Ayna denetiminin
         dersi — bütçesi 0 olan bölümün yan etkili tüketicisi çağrılmaz). */
      if (_ctxMode === 'crisis' || _ctxMode === 'knowledge_seek') return null;
      try { return window.htSozHavuzu?.() || null; } catch (_) { return null; }
    })();

    const contextExtras = {
      greeting:      getGreetingContext(text),
      sozHavuzu:     _havuz?.metin || '',
      crisis:        _crisisCtx,
      contradiction: contradictionMsg ? p('prompt.contradiction', { msg: contradictionMsg }) : '',
      drift:         (() => { const d = getIdentityDriftInsight(); return d ? p('prompt.drift', { insight: d }) : ''; })(),
      onboarding:    getOnboardingContext(),
      resistance:    _inPatternMode ? '' : (getResistanceInsight() || ''),
      silence:       _inPatternMode ? '' : (getSilenceInsight() || ''),
      commitment:    hesapCtx ? '' : (_inPatternMode ? '' : (getPendingCommitmentContext() || '')),
      hesap:         hesapCtx,
      wellness:      window.getWellnessContradictionContext?.(text) || '',
      personalization: buildPersonalizationPrompt(text),
      recalledMemories,
      // Ayna Protokolü (09g) — haftada ≤2 kez tetiklenen nazik hipotez daveti;
      // yalnız gerçekten SORULABİLECEĞİ modlarda tüketilir (yukarıdaki kapı).
      // Kota ve "soruldu" damgası burada DEĞİL, turun sonunda basılır
      // (_mirrorHint.muhurle) — teslim edilmemiş soru sorulmuş sayılmaz.
      mirrorHypothesis: _mirrorHint?.metin || '',
      sessionMemory: (() => {
        const rs = _rollSumState();
        return rs.text ? p('prompt.rollsum.ctx_header') + '\n' + rs.text : '';
      })(),
      _userText:     text,
      _ragActive:    _rag.shouldRAG
    };

    // Yapısal prompt: XML bölümleri + Primacy-Recency sıralama
    // + Araç motoru protokol rehberi (13a — [ARAC]/[KAGIT]/[TAKIP] blokları)
    const systemPrompt = buildContextPrompt('', contextExtras)
      + (window.aracPromptGuide?.() || '')
      // Emniyet Katmanı · Faz 3 — reşit-olmayan koruması + uzun oturum molası
      // (crisis kanalından bağımsız; mod çözücüsünü etkilemez)
      + (window.getSafetyGuards?.() || '');

    /* Kayan bağlam: pencereye SIĞAN mesajlar gider, daha eskisi
       <session_memory> özetinde. Pencere mesaj değil yük sayar ve system
       prompt'un boyunu da hesaba katar (_pencereSec). Odak-modeli geçiş
       satırları (role:'system') zaten elenir — yoksa user/model rol
       eşlemesi bozulur. */
    const _pencere = _pencereSec(S.chatHistory, systemPrompt.length);
    S._sonPencereBoyu = _pencere.length;   // rollsum'ın sınırı buradan okunur
    const contents = _pencere.map(m => {
      let text = m.content;
      // Assistant mesajlarına mod etiketi ekle — LLM hangi modda yazdığını görsün
      // böylece "önceki tonumu kopyalayayım" yerine bilinçli geçiş yapabilir
      if (m.role === 'assistant') {
        // Önce soy: eski kayıtlar modelin filigran taklidini taşıyabiliyor ve
        // üstüne eklersek her turda bir katman daha biner (bkz. stripModeWatermark)
        text = stripModeWatermark(text);
        if (m.mode) {
          const modeLabel = getModeHintLabel(m.mode.replace('mode-', ''));
          const wm = modeLabel ? p('prompt.mode.past_watermark', { label: modeLabel }) : '';
          // p() anahtarı çözemezse anahtarın KENDİSİNİ döndürür (bkz. aracPromptGuide) —
          // o hâlde filigran eklenmez; ham anahtar adı prompt'a gürültü olarak girmesin
          if (wm && !wm.includes('prompt.')) text = wm + '\n' + text;
        }
      }
      return { role: m.role === 'user' ? 'user' : 'model', parts: [{ text }] };
    });

    /* Duygu Motoru (13D, FAZ 7) — bu turun karşılama kararı 01'in
       buildContextPrompt'unda (yukarıda, systemPrompt kurulurken) TEK KEZ
       hesaplanıp S._dgSonKarsilama'ya yazıldı; burada YENİDEN HESAPLANMAZ,
       yalnız son iki kayıt okunur (00'ın buildModeSelectionGuide'daki aynı
       desen — "tek ad, tek kaynak"). Önceki kayıt "eksen değişti mi" doz
       kontrolü içindir (aşağıda, cue çağrısında). */
    const _dgLen = S._dgSonKarsilama.length;
    const _dgEksen = _dgLen ? S._dgSonKarsilama[_dgLen - 1].eksen : null;
    const _dgPrevEksen = _dgLen > 1 ? S._dgSonKarsilama[_dgLen - 2].eksen : null;
    // K9 pazarlıksız: kriz turunda (`tutma`) karşılamanın ritim/beden kanalı
    // hiçbirine karışmaz — bekçi burada, DG_* tablolarının 'tutma' anahtarı
    // taşımamasından BAĞIMSIZ olarak da uygulanır (çifte güvence).
    const _dgAktif = _dgEksen && _dgEksen !== 'tutma';

    // Temperature: önce aktif Wanderer modelinin Stüdyo ayarı (10w) — kullanıcının
    // kendi tercihi daima kazanır; sonra karşılama (13D, K8 ritim kanalı); en
    // sonda hint'e göre (LLM mod kararı verinceye kadar en iyi tahmin).
    const _mp = fmActiveParams();
    const temp = _mp.temperature
      ?? (_dgAktif ? DG_TEMPS[_dgEksen] : undefined)
      ?? (MODE_TEMPS[S._modeHint] ?? MODE_TEMPS[AI_MODES.SOFT]);

    // Karşılamanın beden kanalı: eksen bir önceki turdan DEĞİŞTİYSE cue
    // çalar, aynı eksende sessiz kalır (doz — bkz. startStreamingMsg
    // _ensureInserted yorumu). Akış hızı da aynı tabloyla birlikte gelir.
    const _dgCueName = (_dgAktif && _dgEksen !== _dgPrevEksen) ? DG_CUE[_dgEksen] : null;
    const _dgRenderMs = _dgAktif ? DG_RENDER_MS[_dgEksen] : undefined;

    // "Düşünüyor" göstergesini İLK TOKEN'a kadar canlı tut — balon lazily takılır
    // (startStreamingMsg._ensureInserted ilk chunk'ta göstergeyi kaldırıp balonu ekler).
    const streamMsg = startStreamingMsg('', { cue: _dgCueName, renderMs: _dgRenderMs });

    // Mod-aware streaming handler: ilk chunk'larda [MOD:xxx] tag'ini parse eder
    const modeHandler = createModeAwareChunkHandler(streamMsg);

    let reply = '';
    let _wasAborted = false;
    let _streamedRaw = '';
    try {
      // Dinamik token limiti — önce Stüdyo ayarı, yoksa max(bağlam modu, davranışsal mod).
      // depth/pattern ipucu varsa (S._modeHint) kendi geniş bütçesini garantiler —
      // yoksa Derinlik/Örüntü yanıtları casual/standard bağlam bütçesinde kesilirdi.
      /* Bağlam modu bu turda BİR kez çözüldü (yukarıda, _ctxBudget ile aynı
         kaynaktan). Burada `S._lastContextMode`'dan yeniden okumak aynı adı
         taşıyan ikinci bir gerçek yaratıyordu: bugün ikisi tesadüfen aynı
         çünkü buildContextPrompt arada state'e yazıyor — sıra değişse ya da
         prompt kurucusu erken dönse yanıt bütçesi sessizce yanlış moddan
         hesaplanırdı. Tek ad, tek kaynak. */
      const _effMode = (S._modeHint === AI_MODES.DEPTH || S._modeHint === AI_MODES.PATTERN) ? S._modeHint : null;
      const _ctxTavan = Math.max(TOKEN_LIMITS[_ctxMode] || TOKEN_LIMITS.standard, _effMode ? TOKEN_LIMITS[_effMode] : 0);
      // Karşılama uzunluk TAVANI (13D, FAZ 7, K8 ritim kanalı) — bağlam
      // bütçesinin üstüne binen bir Math.min çatısı: onu yükseltmez, yalnız
      // gerektiğinde alçaltır (yatıştırma/tanıklık/berraklık kısılır;
      // kutlama DG_TOKEN'da en geniş bütçeye eşit olduğu için pratikte hiç
      // kırpmaz). `tutma` DG_TOKEN'da YOK → Infinity → mevcut bütçeye DOKUNULMAZ (K9).
      const _dgTavan = (_dgAktif ? DG_TOKEN[_dgEksen] : undefined) ?? Infinity;
      const _dynamicTokens = _mp.max_tokens
        || Math.min(_dgTavan, _ctxTavan);

      reply = await callLLM({
        contents, systemPrompt, maxTokens: _dynamicTokens, temperature: temp,
        stream: true,
        enableRAG: _rag.shouldRAG,
        ragQuery: _rag.query || text,
        ragTopK: _rag.topK || 3,
        signal: _abort.signal,
        onChunk: (delta) => { _streamedRaw += delta; modeHandler.onChunk(delta); }
      });
    } catch (streamErr) {
      if (streamErr?.name === 'AbortError') {
        // Kullanıcı durdurdu — o ana kadar akan kısmı koru; hiç akmadıysa izi sil
        if (!_streamedRaw.trim()) { streamMsg.discard(); return ''; }
        _wasAborted = true;
        reply = _streamedRaw;
      } else {
        // Streaming başarısız olursa streaming mesajını kaldır ve hatayı dışarıya fırlat
        streamMsg.discard();
        throw streamErr;
      }
    }

    // Buffer'da kalan varsa flush et
    modeHandler.flushIfNeeded();

    // Mod Nabzı telemetrisi (FAZ 4) — mod netleşti, Gözlemevi için işaretle
    try { window.wtLogMode?.(S.currentAIMode, S._modeHint, !modeHandler.wasTagFound(), S._lastContextMode); } catch (_) {}

    /* Bağlam Nabzı (İç Çalışma 02 · D+H) — ölçü buildContextPrompt'ta alındı
       (01 `_s`), yazımı TUR BAŞINA BİR KEZ burada: mod nabzıyla aynı an, aynı
       tur. Defter yazıldıktan sonra boşaltılır — yarım kalan bir tur sonraki
       turun sayılarına karışmasın. */
    try {
      const olc = S._ctxOlcum;
      if (olc) window.wtLogCtx?.(olc.kanallar, {
        mode: S.currentAIMode, ctxMode: olc.ctxMode, toplam: olc.toplam,
      });
      S._ctxOlcum = null;
    } catch (_) {}

    // Boş yanıt güvenlik ağı — callLLM fallback'i de boş döndüyse boş balonu
    // mühürleyip DB'ye yazma; hata fırlat ki kullanıcı tekrar dene chip'i görsün.
    if (!_wasAborted && !(reply || '').trim()) {
      streamMsg.discard();
      throw new Error('Model yanıt üretmedi. Lütfen tekrar dene.');
    }

    // Yanıttan mod tag'ini sıyır; ardından araç protokol bloklarını ayıkla
    // (13a) — bloklar görüntüye, history'ye ve DB'ye girmez.
    let cleanReply = modeHandler.getCleanText(reply);

    /* Duygu Motoru (13D, FAZ 9, K5 "iki okuyucu, tek satır") — modelin
       KENDİ okuması ([MOD:x|DG:eksen#S2]) uygulamanın kararını (_dgEksen,
       01'de TEK KEZ hesaplandı) EZMEZ, İklim defterine YANINA yazılır.
       Ayrışma bir hata değil SİNYALDİR (K5): ölçüm sakin, model gergin
       okuyorsa örtülü bir duygunun izi olabilir — burada yalnız SAYILIR,
       hiçbir yüzeyde GÖSTERİLMEZ (o FAZ 11'in şeffaflık paneli). `reply`
       HAM metindir (tag hâlâ üstünde) — `extractDgReading` DG: yoksa ya
       da eksen DG_KARSILAMALAR'a uymuyorsa (diyakritik/uydurma) sessizce
       `null` döner (§6.10). Ek LLM çağrısı YOK — sıfır ek çağrı (K5). */
    // Şeffaflık paneli (FAZ 11) YORUM satırı — BU TURUN model okumasıdır.
    // `S._dgIklim.modelOkuma.son`'u sonradan okumak YANLIŞ olurdu: model bu
    // turda DG: etiketi basmadıysa o alan bir ÖNCEKİ turdan kalır, panel
    // başka bir mesajın okumasını bu mesajınmış gibi gösterirdi (§6.10).
    let _dgYorumBu = null;
    try {
      const _dgOkuma = extractDgReading(reply);
      if (_dgOkuma && S._dgIklim) {
        // #S2 varsa metni kaynaktan kes (K5: model alıntıyı yazmaz,
        // gösterir) — aynı turun numaralı söz havuzu (_havuz, 09j).
        // Havuz yoksa ya da ref çözülemezse `kanit` sessizce null kalır.
        const _dgKanit = _dgOkuma.ref
          ? kokenAlintiCoz(_dgOkuma.ref, '', _havuz?.harita, _havuz?.sozler)
          : null;
        _dgYorumBu = { eksen: _dgOkuma.eksen, kanit: _dgKanit?.alinti || null };
        S._dgIklim = dgIklimModelOkumaEkle(S._dgIklim, _dgEksen, _dgOkuma.eksen, _dgKanit?.alinti || null);
        dgIklimKaydet(S._dgIklim);
      }
    } catch (e) { console.warn('dgIklimModelOkumaEkle:', e && e.message); }

    /* Duygu Nabzı (00f, FAZ 12 · sohbet ayağının kapanışı) — planın
       "Değişen" listesinde bu dosya yazılı değildi ama fonksiyonu tanımlayıp
       hiç çağırmamak ölü kod bırakırdı; çağrı yeri burası çünkü AYRIŞMA
       (model okumasıyla uygulamanın kararı) ancak burada, model okuması
       parse edildikten SONRA bilinir — `01`'in tek hesap yerinde (henüz
       LLM'den yanıt yokken) bu bilgi mevcut değildir. `tutma` (kriz)
       burada BİLEREK sayılmıyor: crisis_signal zaten wtLogSafety'de tek
       kaynaktan sayılıyor (13-extras _fireCrisis, K9). */
    try {
      if (_dgEksen && _dgEksen !== 'tutma') {
        const _dgKarsilamaSon = S._dgSonKarsilama.length ? S._dgSonKarsilama[S._dgSonKarsilama.length - 1] : null;
        window.wtLogDuygu?.(_dgEksen, {
          kuvvetKaynagi: S._dgNabiz?.kuvvetKaynagi || null,
          ayristi: _dgYorumBu ? (_dgYorumBu.eksen !== _dgEksen) : null,
          takas: !!(_dgKarsilamaSon && _dgKarsilamaSon.ikincil),
          // K13 (FAZ 15) — bu satır "konuştu" olayıdır (duzeltildi:false);
          // "beni yanlış okudun" ayrı bir satır olarak duzeltildi:true ile
          // gelir (dgSeffaflikAc'ın 'sustur' dalı). Gözlemevi ikisini aynı
          // yüzeyde ayrı sayar, karıştırmaz.
          yuzey: 'sohbet',
          duzeltildi: false,
        });
      }
    } catch (_) {}

    let _proto = null;
    try {
      _proto = window.aracExtract?.(cleanReply) || null;
      // Yanıt yalnız bloklardan ibaretse boş balon yerine sessiz bir iz bırak
      if (_proto) cleanReply = _proto.text || '✦';
    } catch (e) { console.warn('aracExtract:', e); }

    // LLM'in seçtiği moda göre mesaj div'ine sınıf ekle — soft dahil her mod
    // (S10 fix: soft turlar önceden etiketsiz kalıyordu, LLM'in mod-geçmişi
    // etiketlemesinde ["bu yanıt X modunda yazıldı"] görünmüyorlardı; .mode-soft
    // CSS'te tanımsız olduğundan görsel değişiklik yok)
    const modeClass = 'mode-' + (S.currentAIMode || AI_MODES.SOFT);
    streamMsg.element.classList.add(modeClass);

    /* Görünür kanıt (09j · FAZ 3): model geçmişe atıf yaparken alıntıyı
       YAZMAZ, `[S3]` diye gösterir; metni havuzdan biz keseriz. Ayıklama
       finalize'dan ÖNCE: etiketler ne ekrana, ne geçmişe, ne DB'ye girer —
       araç bloklarıyla (aracExtract) aynı töre. */
    let _alintilar = [];
    if (_havuz) {
      try {
        const _ay = window.htAlintiAyikla?.(cleanReply, _havuz.harita, _havuz.sozler);
        if (_ay) { cleanReply = _ay.text; _alintilar = _ay.alintilar || []; }
      } catch (e) { console.warn('htAlintiAyikla:', e && e.message); }
    }

    streamMsg.finalize(cleanReply);
    if (_alintilar.length) _alintiCiz(streamMsg.element, _alintilar);
    // Şeffaflık paneli girişi (FAZ 11) — finalize'dan SONRA: `.msg-footer`
    // artık DOM'da (buildMsgFooterHTML orada eklendi). Bu turun karşılama
    // kararı 01'de push edildi, S._dgSonKarsilama'nın son kaydı budur.
    try {
      const _dgKarsilamaTam = S._dgSonKarsilama.length ? S._dgSonKarsilama[S._dgSonKarsilama.length - 1] : null;
      _dgSeffaflikEkle(streamMsg.element, _dgKarsilamaTam, _dgYorumBu);
    } catch (e) { console.warn('dgSeffaflikEkle:', e && e.message); }
    if (_wasAborted) {
      const _tEl = streamMsg.element.querySelector('.msg-time');
      if (_tEl) _tEl.textContent += ' · ' + t('chat.stopped', 'durduruldu');
    }
    const _asistanKayit     = { role: 'assistant', content: cleanReply, mode: modeClass };
    const _asistanSessKayit = { role: 'assistant', content: cleanReply, mode: modeClass, created_at: new Date().toISOString() };
    S.chatHistory.push(_asistanKayit);

    S.allSessions[S.currentSessId].push(_asistanSessKayit);
    const _asistanPersist = _persistMesaj(
      { user_id: S.currentUser.id, session_id: S.currentSessId, role: 'assistant', content: cleanReply, mode: modeClass || '' },
      { chatKaydi: _asistanKayit, sessKaydi: _asistanSessKayit, balon: streamMsg.element }
    );

    // Kişiselleştirme motoru — AI yanıtını kaydet (etkililik ölçümü için)
    personalizationRecordAIReply(cleanReply);

    // Bağlamsal kartlar — konuşma akışına uygun olarak enjekte et
    /* Turun töresi — bir turda TEK davet (bkz. _sahneTuru). */
    _sahneTuru([
      { ad: 'muhur',   calistir: () => w2InjectContextualMuhurCard(text, cleanReply) },
      { ad: 'odev',    calistir: () => _odevChipiniBas() },
      { ad: 'gecmis',  calistir: () => {
          if (S._sessionUserMsgs.length > 0 && S._sessionUserMsgs.length % 5 === 0) checkPastSelfEcho();
        } },
      { ad: 'ders',    calistir: () => w2InjectContextualLessonCard(text, cleanReply) },
    ]);

    /* Araç motoru kuyruğun DIŞINDADIR: onay chip'i, Çalışma Kağıdı, takip
       soruları ve kaynakça bir sürpriz değil, modelin bu turda açıkça
       ürettiği içeriğin parçasıdır. Kuyruk "dikkat isteyen davetleri"
       seyreltir; yanıtın kendi uzuvlarını değil. */
    try {
      window.aracAfterReply?.(streamMsg.element, _proto);
      /* İz ledger'a düşer — ama ancak kimlik geldikten SONRA: süs mesajın
         id'sine bağlanır ve o id insert dönüşüyle gelir. Akış beklemez;
         sohbet bir süsün kaydını beklemek zorunda değil. */
      if (_proto) {
        _asistanPersist
          .then(id => { if (id != null) dekoYaz(streamMsg.element, 'arac', _proto); })
          .catch(() => {});
      }
    } catch (e) { console.warn('aracAfterReply:', e); }

    /* Alıntı da ledger'a düşer — reload'dan sonra kanıt balonda kalsın.
       Kimliği beklemesi araçla aynı gerekçe: süs mesajın id'sine bağlanır. */
    if (_alintilar.length) {
      _asistanPersist
        .then(id => { if (id != null) dekoYaz(streamMsg.element, 'alinti', _alintilar); })
        .catch(() => {});
    }

    /* TESLİM MÜHRÜ — yanıt kullanıcıya ulaştı; ancak ŞİMDİ ayna ipucunun
       haftalık kotası harcanır ve "bu hipotez soruldu" damgası basılır.
       Tur iptal edilir ya da hata verirse buraya hiç gelinmez: kota durur,
       hipotez bir sonraki tura sağlam kalır. */
    try { _mirrorHint?.muhurle?.(); } catch (e) { console.warn('mirrorHint muhurle:', e && e.message); }

    // Kayan bağlam özeti — pencereden çıkan mesajları arka planda sıkıştır
    setTimeout(() => { _maybeRefreshRollSum(); }, 400);

    return cleanReply;
  } finally {
    S._llmStreaming = false;
    S._llmAbort = null;
    _setSendBtnStopMode(false);
  }
}

/* ═══ AUTO SUMMARY — 00:33 ═══ */

function _msUntil0033() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(0, 33, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target - now;
}

async function _autoGenerateSummaryBackground() {
  if (!S.currentUser || !isSummaryEligible() || isSessionSummarized(S.currentSessId)) return;
  if (S.summaryInProgress) return;

  S.summaryInProgress = true;
  try {
    const userLines = S.chatHistory
      .filter(m => m.role === 'user')
      .map((m, i) => `${i + 1}. ${m.content.slice(0, 200)}`)
      .join('\n');
    const emreLines = S.chatHistory
      .filter(m => m.role === 'assistant')
      .map(m => m.content.slice(0, 100))
      .join(' | ');

    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: p('prompt.summary.user', { userLines, emreLines }) }] }],
      systemPrompt: p('prompt.summary.system'),
      maxTokens: 250, temperature: 0.3, jsonMode: true, model: SUMMARY_MODEL, skipPersona: true,
    });

    let result;
    try { result = JSON.parse(raw); }
    catch {
      const tm = raw.match(/"title"\s*:\s*"([^"]+)"/);
      const sm = raw.match(/"summary"\s*:\s*"([^"]+)"/);
      if (tm && sm) result = { title: tm[1], summary: sm[1] };
      else throw new Error('Format okunamadı.');
    }

    const { error: insertErr } = await sb.from('chat_summaries').insert([{
      user_id:    S.currentUser.id,
      session_id: S.currentSessId,
      title:      result.title,
      summary:    result.summary,
    }]);
    if (insertErr) console.warn('Özet kayıt hatası:', insertErr.message);
    await loadSummaries();

    document.getElementById('sum-modal-title').textContent = result.title;
    document.getElementById('sum-modal-desc').textContent  = result.summary;
    S.summarizedSessionId = S.currentSessId;
    S.summarizedSessionIds.add(S.currentSessId);
    updateSessionRing();
    generateAndSaveCard(result.title, result.summary).catch(e => console.warn('Kart hatası:', e));
    showToast(t('chat.auto_summary_created', 'Günün özeti otomatik oluşturuldu.'));
  } catch (e) {
    console.warn('Otomatik özet hatası:', e);
  } finally {
    S.summaryInProgress = false;
  }
}

export function scheduleAutoSummary() {
  const _fire = () => {
    _autoGenerateSummaryBackground();
    setTimeout(_fire, _msUntil0033());
  };
  setTimeout(_fire, _msUntil0033());
}

/* ═══ SETTINGS ═══
   Normal kullanıcılar: public_settings view'undan okur (API key YOK)
   Admin kullanıcılar: ek olarak admin_settings'ten key durumunu çeker
*/
