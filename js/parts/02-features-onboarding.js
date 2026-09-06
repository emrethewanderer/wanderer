import { S } from '../state.js';
import { sb, AI_MODES, EMRE_IMG } from '../config.js';
import { STORAGE_KEYS, SafeStorage, SecureStorage, showToast } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { p, dpTest } from './16-i18n-prompts.js';
import { appendMsg } from './06-summary-chat.js';
import { updateModeBadge, nowTR, detectMessageTone, getAllMessages } from './00-config-tracking.js';

/* renderHistory + detectMessageTone çağrılıyordu ama importları yoktu — bare
   identifier build'i geçer, çalışma anında ReferenceError atar (aynı sınıf:
   12-w3-journey getUserFirstName/p). */
import { renderHistory } from './04-llm-hero-history.js';

import { appendEODClosureCard } from './05-closure-parts.js';
import { dfGetChoiceStats } from './09b-depth-foundations.js';

/* ── YOLCULUK HARİTASI (Gezginin Yolu + Zaman Çizelgesi birleşik) ── */
let _yhEvents = [];
let _yhStage = 1;
let _yhSelectedStage = 0; // 0 = tümü
let _yhActiveFilter = 'all';

export async function loadYolculukHaritasi() {
  const allMsgs = getAllMessages();
  const totalSessions = Object.keys(S.allSessions).length;

  const userMsgs = allMsgs.filter(m => m.role === 'user');
  let avoidTotal = 0, progressTotal = 0;
  userMsgs.forEach(m => {
    const { isAvoidance, isProgress } = detectMessageTone(m.content || '');
    if (isAvoidance) avoidTotal++;
    if (isProgress)  progressTotal++;
  });

  const avoidPct    = userMsgs.length ? avoidTotal   / userMsgs.length : 0;
  const progressPct = userMsgs.length ? progressTotal / userMsgs.length : 0;
  const streak = parseInt(document.getElementById('streak-val')?.textContent || '0');

  // Aşama hesapla — Ayna → Tasarım → Geçiş
  // Kitap s.55: "Bir nefeste değişim olabilir" — mesaj sayısı değil, gerçek geçiş kanıtları belirler.
  // Kanıt 1: Kişi Geçiş Haritası dolu mu? (desired.description var mı)
  const hasPersonDesired = (typeof S._personTransition !== 'undefined') && (S._personTransition.desired?.description?.length > 5);
  // Kanıt 2: Yeni kişi seçimleri oranı
  /* 09b'nin `_choiceTracking`'i modül-yereldir; buradan bare okunup `typeof`
     guard'ına takılıyordu — "Kanıt 2" HER ZAMAN 0 sayılıyordu. Okuma 09b'nin
     kendi getter'ından (dfGetChoiceStats yüzdelik döner, oran 0–1 istiyoruz). */
  const choiceRatio = (dfGetChoiceStats().newRatio || 0) / 100;
  // Kanıt 3: Derinlik/Temel sinyalleri birikmiş mi?
  const hasDepthWork = (typeof S._depthProfile !== 'undefined') &&
    Object.values(S._depthProfile).some(d => d.signals_count >= 3);

  let stage = 1;
  // Ayna → Tasarım: Kim olduğunu görmeye + olmak istediğini tasarlamaya başladı
  if (totalSessions >= 3 && hasPersonDesired && progressPct > 0.03) stage = 2;
  // Tasarım → Geçiş: Aktif seçimler yapıyor + derinlik çalışması var + streak
  if (stage >= 2 && choiceRatio >= 0.5 && hasDepthWork && streak >= 3 && totalSessions >= 10) stage = 3;
  // Güçlü kanıt: Çok yüksek seçim oranı + uzun seri — Tasarım aşamasından geçmeden Geçiş olmaz
  if (stage >= 2 && choiceRatio >= 0.7 && streak >= 10 && totalSessions >= 20) stage = 3;
  _yhStage = stage;

  // Subtitle
  const stageAtNames = [t('stage.comfort_at'), t('stage.confrontation_at'), t('stage.transformation_at')];
  const subEl = document.getElementById('yh-subtitle');
  if (subEl) subEl.textContent = `${stageAtNames[stage - 1]}. ${totalSessions} ${t('stat.day').toLowerCase()}, ${userMsgs.length} ${t('ui.messages', 'mesaj')}.`;

  // Aşama şeridi
  const fillEl = document.getElementById('yh-stage-fill');
  if (fillEl) fillEl.style.width = stage === 1 ? '0%' : stage === 2 ? '50%' : '100%';

  [1, 2, 3].forEach(s => {
    const node = document.getElementById('yh-node-' + s);
    if (!node) return;
    node.classList.remove('yh-active', 'yh-past', 'yh-future', 'yh-selected');
    if (s < stage)       node.classList.add('yh-past');
    else if (s === stage) node.classList.add('yh-active');
    else                  node.classList.add('yh-future');
  });

  // Aşama kartı
  const stageInfo = [
    { icon: '🪞', name: t('stage.comfort'), desc: t('stage.comfort_desc') },
    { icon: '✏️', name: t('stage.confrontation'), desc: t('stage.confrontation_desc') },
    { icon: '🦋', name: t('stage.transformation'), desc: t('stage.transformation_desc') }
  ];
  yhUpdateStageCard(stageInfo[stage - 1]);

  // İstatistikler
  const statsEl = document.getElementById('yh-stats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="yh-stat"><span class="yh-stat-num">${totalSessions}</span><div class="yh-stat-label">${t('stat.day')}</div></div>
      <div class="yh-stat"><span class="yh-stat-num">${streak}</span><div class="yh-stat-label">${t('stat.streak')}</div></div>
      <div class="yh-stat"><span class="yh-stat-num">${progressTotal}</span><div class="yh-stat-label">${t('stat.breakthrough')}</div></div>
      <div class="yh-stat"><span class="yh-stat-num">${Math.round(progressPct * 100)}%</span><div class="yh-stat-label">${t('stat.progress')}</div></div>
    `;
  }

  // Timeline olaylarını topla
  await yhBuildEvents(stage, totalSessions);
  _yhSelectedStage = 0;
  _yhActiveFilter = 'all';
  yhRenderTimeline();
}

function yhUpdateStageCard(info) {
  const icon = document.getElementById('yh-card-icon');
  const name = document.getElementById('yh-card-name');
  const desc = document.getElementById('yh-card-desc');
  if (icon) icon.textContent = info.icon;
  if (name) name.textContent = info.name;
  if (desc) desc.textContent = info.desc;
}

async function yhBuildEvents(currentStage, totalSessions) {
  const events = [];

  // Seanslar — her birine aşama ata
  const sessIds = Object.keys(S.allSessions).sort((a, b) => {
    const aT = S.allSessions[a][0]?.created_at || '';
    const bT = S.allSessions[b][0]?.created_at || '';
    return new Date(aT) - new Date(bT);
  });

  sessIds.forEach((sid, i) => {
    const first = S.allSessions[sid]?.find(m => m.role === 'user');
    if (!first) return;
    const sessStage = yhEstimateStageAt(i + 1, totalSessions, sessIds.length);
    events.push({
      date: first.created_at,
      type: 'session',
      text: `Gün #${i + 1}`,
      detail: (first.content || '').slice(0, 60),
      stage: sessStage
    });
  });

  // Breakthroughs
  try {
    const { data: bts } = await sb.from('breakthrough_moments')
      .select('*').eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: true });
    if (bts) bts.forEach(b => {
      events.push({
        date: b.created_at,
        type: 'breakthrough',
        text: t('journey.breakthrough'),
        detail: (b.content || '').slice(0, 100),
        stage: yhStageForDate(b.created_at, events)
      });
    });
  } catch (_) {}

  // Summaries
  try {
    const { data: sums } = await sb.from('chat_summaries')
      .select('title, created_at').eq('user_id', S.currentUser.id);
    if (sums) sums.forEach(s => {
      events.push({
        date: s.created_at,
        type: 'summary',
        text: s.title || t('journey.day_summary'),
        detail: '',
        stage: yhStageForDate(s.created_at, events)
      });
    });
  } catch (_) {}

  // Milestone'lar
  const streak = parseInt(document.getElementById('streak-val')?.textContent || '0');
  [3, 7, 14, 30].forEach(n => {
    if (streak >= n) {
      events.push({
        date: new Date().toISOString(),
        type: 'milestone',
        text: t('journey.streak_milestone').replace('{{n}}', n),
        detail: n >= 14 ? t('journey.pattern_changing') : n >= 7 ? t('journey.discipline_rooting') : t('journey.routine_forming'),
        stage: currentStage
      });
    }
  });

  // Aşama geçiş olayları — sessIds üzerinden hesapla
  let prevStage = 1;
  sessIds.forEach((sid, i) => {
    const s = yhEstimateStageAt(i + 1, totalSessions, sessIds.length);
    if (s > prevStage) {
      const stgNames = ['', t('stage.comfort'), t('stage.confrontation'), t('stage.transformation')];
      const first = S.allSessions[sid]?.[0];
      events.push({
        date: first?.created_at || new Date().toISOString(),
        type: 'stage-change',
        text: `${stgNames[prevStage]} → ${stgNames[s]}`,
        detail: t('journey.new_stage').replace('{{stage}}', stgNames[s]),
        stage: s
      });
      prevStage = s;
    }
  });

  events.sort((a, b) => new Date(b.date) - new Date(a.date));
  _yhEvents = events;
}

function yhEstimateStageAt(sessIndex, _total, totalCount) {
  if (sessIndex >= 15 && totalCount >= 15) return 3;
  if (sessIndex >= 5) return 2;
  return 1;
}

function yhStageForDate(date, events) {
  const d = new Date(date).getTime();
  let closest = events
    .filter(e => e.type === 'session' && new Date(e.date).getTime() <= d)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  return closest?.stage || 1;
}

export function yhFilterStage(s) {
  _yhSelectedStage = (_yhSelectedStage === s) ? 0 : s;

  [1, 2, 3].forEach(n => {
    const node = document.getElementById('yh-node-' + n);
    if (!node) return;
    node.classList.toggle('yh-selected', n === _yhSelectedStage);
  });

  const stageInfo = [
    { icon: '🪞', name: t('stage.comfort'), desc: t('stage.comfort_desc') },
    { icon: '✏️', name: t('stage.confrontation'), desc: t('stage.confrontation_desc') },
    { icon: '🦋', name: t('stage.transformation'), desc: t('stage.transformation_desc') }
  ];
  yhUpdateStageCard(_yhSelectedStage ? stageInfo[_yhSelectedStage - 1] : stageInfo[_yhStage - 1]);
  yhRenderTimeline();
}

export function yhSetFilter(btn, filter) {
  document.querySelectorAll('.yh-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _yhActiveFilter = filter;
  yhRenderTimeline();
}

function yhRenderTimeline() {
  const el = document.getElementById('yh-timeline');
  if (!el) return;

  let filtered = _yhEvents;
  if (_yhSelectedStage) filtered = filtered.filter(e => e.stage === _yhSelectedStage);
  if (_yhActiveFilter !== 'all') {
    if (_yhActiveFilter === 'milestone') {
      filtered = filtered.filter(e => e.type === 'milestone' || e.type === 'stage-change');
    } else {
      filtered = filtered.filter(e => e.type === _yhActiveFilter);
    }
  }

  if (!filtered.length) {
    el.innerHTML = '<div class="empty-state">Bu filtrede olay yok.</div>';
    return;
  }

  const icons = { session: '●', breakthrough: '◈', summary: '◎', milestone: '★', 'stage-change': '▲' };
  const colors = { session: 'var(--text-dim)', breakthrough: 'var(--gold)', summary: '#5A8AD8', milestone: '#5BB97B', 'stage-change': 'var(--gold)' };

  el.innerHTML = filtered.map((e, i) => {
    const d = new Date(e.date).toLocaleDateString(S._currentLang || 'tr', { day: 'numeric', month: 'short', year: 'numeric' });
    const safe = (e.detail || '').replace(/</g, '&lt;');
    return `<div class="yh-event yh-event--${e.type}" style="animation-delay:${Math.min(i * 40, 400)}ms">
      <div class="yh-event-dot" style="color:${colors[e.type]}">${icons[e.type]}</div>
      <div class="yh-event-date">${d}</div>
      <div class="yh-event-title">${(e.text || '').replace(/</g, '&lt;')}</div>
      ${safe ? `<div class="yh-event-detail">${safe}</div>` : ''}
    </div>`;
  }).join('');
}

/* ── 3. SESSİZLİK → GERİ ÇAĞRI MOTORU ──
   Eski "Kademe-1 chip + Kademe-2 rastgele 4 cümleden biri" sistemi söküldü.
   Yerini 13o-geri-cagri aldı: Kişiselleştirme Motoru'nu (P1-P6) + bugünkü
   konuyu esas alan, kullanıcıyı sohbete yeniden davet eden LLM-üretimli
   tek kişisel mesaj. Bu thin wrapper hook'ların callsite'larını bozmadan
   yeni motora delege eder; eski timer kalıntıları varsa cleanup eder.
*/
export function resetSilencePressure() {
  // Eski timer'lar varsa temizle — defensive (eski sürümden cold-load durumu)
  if (S._silencePressureTimer) { clearTimeout(S._silencePressureTimer); S._silencePressureTimer = null; }
  if (S._silenceHintTimer) { clearTimeout(S._silenceHintTimer); S._silenceHintTimer = null; }
  try { window.gcSchedule?.(); } catch (_) {}
}

/* ── 4. EMOTIONAL SPIKE DETECTION ──
   Mesajda ani duygusal yoğunluk tespiti
*/
// EMOTIONAL_SPIKE_PATTERNS → dp('detect.emotional_spike') — 13-dil desteği

export function detectEmotionalSpike(text) {
  return dpTest('detect.emotional_spike', text);
}

export function handleEmotionalSpike(text) {
  if (S._emotionalSpikeFired) return; // Seans başına bir kez
  S._emotionalSpikeFired = true;
  // Flash + badge değişimi
  const el = document.getElementById('flash-overlay');
  el.style.background = 'rgba(192,57,43,0.08)';
  el.classList.add('flash');
  setTimeout(() => { el.classList.remove('flash'); el.style.background = ''; }, 600);
  // Toast uyarısı
  setTimeout(() => showToast(t('toast.spike_detected')), 400);
  // Modu soft'a çek, AI şefkatle yaklaşsın
  S.currentAIMode = AI_MODES.SOFT;
  updateModeBadge();
}

/* ── 5+6. TUTARLILIK TAKİBİ (Birleşik) ──
   Eski: Self-Contradiction Catcher + Identity Drift Detector
   Şimdi tek sistem: hem söz/taahhüt çelişkilerini hem kimlik kaymasını izler.
   Tek storage key'i, tek AI bağlam çıktısı.
*/
const CONSISTENCY_PATTERNS = [
  // Söz/taahhüt kalıpları
  { pattern: /değişeceğim/i,       key: 'degisecegim',      type: 'claim' },
  { pattern: /yapacağım/i,         key: 'yapacagim',        type: 'claim' },
  { pattern: /bırakacağım/i,       key: 'birakacagim',      type: 'claim' },
  { pattern: /başlayacağım/i,      key: 'baslayacagim',     type: 'claim' },
  { pattern: /artık yapmıyorum/i,  key: 'artik_yapmiyorum', type: 'claim' },
  { pattern: /söz veriyorum/i,     key: 'soz_veriyorum',    type: 'claim' },
  // Kimlik ifadeleri
  { pattern: /ben .+ biri değilim/i, key: 'ben_degilim',    type: 'identity' },
  { pattern: /ben .+ yapamam/i,      key: 'ben_yapamam',    type: 'identity' },
  { pattern: /benim doğam/i,         key: 'benim_dogam',    type: 'identity' },
  { pattern: /benim için zor/i,      key: 'benim_icin_zor', type: 'identity' },
  { pattern: /ben hep böyle/i,       key: 'ben_hep_boyle',  type: 'identity' },
  { pattern: /ben hiç .+ olmadım/i,  key: 'ben_hic',        type: 'identity' },
];

function _getConsistencyStore() {
  try { return SecureStorage.get(STORAGE_KEYS.CONSISTENCY(S.currentUser?.id), S.currentUser?.id, []); }
  catch { return []; }
}

function _saveConsistencyStore(store) {
  try { SecureStorage.set(STORAGE_KEYS.CONSISTENCY(S.currentUser?.id), S.currentUser?.id, store.slice(0, 40)); }
  catch {}
}

export function trackSelfContradiction(text, userMsgIndex) {
  if (userMsgIndex < 2) return null;

  let store = _getConsistencyStore();
  let result = null;

  for (const { pattern, key, type } of CONSISTENCY_PATTERNS) {
    if (!pattern.test(text)) continue;

    // Cross-session çelişki kontrolü
    const prevEntry = store.find(c => c.key === key && c.date !== nowTR().toDateString());
    if (prevEntry && !S._contradictionFired) {
      S._contradictionFired = true;
      if (type === 'claim') {
        result = `Dur. Geçmişte de bunu söyledin — "${prevEntry.text.slice(0,60)}…". Bugün gerçekten farklı mı?`;
      } else {
        result = `Kimlik ifaden değişiyor: Daha önce "${prevEntry.text.slice(0,60)}" demiştin. Bugün farklı bir şey söylüyorsun.`;
      }
    }

    // Kaydı güncelle
    store = store.filter(c => c.key !== key);
    store.unshift({ key, type, text: text.slice(0, 80), date: nowTR().toDateString() });
  }

  _saveConsistencyStore(store);
  return result;
}

export function trackIdentityDrift(text) {
  // Artık trackSelfContradiction içinde birleşik çalışıyor.
  // Bu fonksiyon geriye uyumluluk için kalıyor (sendMessage'dan çağrılıyor).
}

export function getIdentityDriftInsight() {
  try {
    const store = _getConsistencyStore();
    const identityEntries = store.filter(c => c.type === 'identity');
    if (identityEntries.length < 2) return null;
    const days = new Set(identityEntries.map(s => s.date));
    if (days.size < 2) return null;
    const recent = identityEntries[0];
    const older = identityEntries.find(s => s.date !== recent.date);
    if (!older) return null;
    return `Tutarlılık: "${recent.text}" (bugün) vs "${older.text}" (${older.date})`;
  } catch { return null; }
}

/* ── 7. END OF DAY JUDGMENT ──
   Her gün 21:00'da aktif seans varsa veya kullanıcı açıksa yargılama
*/
export function scheduleEndOfDayJudgment() {
  if (S._endOfDayScheduled) return;
  S._endOfDayScheduled = true;

  function checkEOD() {
    const now = nowTR();
    if (now.getHours() === 21 && now.getMinutes() < 2) {
      triggerEndOfDayJudgment();
    }
  }
  setInterval(checkEOD, 60000);
}

function triggerEndOfDayJudgment() {
  const key = STORAGE_KEYS.EOD(nowTR().toDateString());
  if (SafeStorage.getRaw(key)) return;
  SafeStorage.setRaw(key, '1');

  // Chat açıksa direkt mesaj + Günlük Kapanış kartı
  if (document.getElementById('chat-view').classList.contains('active') && S.chatHistory.length > 0) {
    const eodPhrases = [
      `Günün bitti. Bugün ne kaçırdın?`,
      `Akşam muhasebesi: Bugün kendine verdiğin söze sadık kaldın mı?`,
      `Gün bitiyor. Bugün dürüst müydün yoksa rahat mı seçtin?`,
    ];
    const pick = eodPhrases[Math.floor(Math.random() * eodPhrases.length)];
    appendMsg('emre', pick, 'mode-direct');
    S.chatHistory.push({ role: 'assistant', content: pick });
    if (S.currentSessId) {
      S.allSessions[S.currentSessId] = S.allSessions[S.currentSessId] || [];
      S.allSessions[S.currentSessId].push({ role: 'assistant', content: pick, created_at: new Date().toISOString() });
      sb.from('chat_history').insert([{ user_id: S.currentUser.id, session_id: S.currentSessId, role: 'assistant', content: pick }]).then(({error}) => { if (error) console.warn('DB hata:', error.message); });
      renderHistory();
    }
    // Mesajın hemen altına interaktif Kapanış kartı
    setTimeout(appendEODClosureCard, 400);
    return;
  }

  // Uygulama açık değilse bildirim gönder (Notification API tüm ortamlarda olmayabilir)
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(S.settings.persona_name || 'Emre the Wanderer', {
      body: t('notify.eod'),
      icon: EMRE_IMG, badge: EMRE_IMG
    });
  }
}

/* ── 9. ONBOARDING İLK MESAJ AKIŞI ──
   3 adımlı senaryo — sadece ilk seans için.
   Kullanıcı ilk mesajını yazdıktan sonra sistem normal moda geçer.
*/
let _onboardingActive = false;
let _onboardingStep   = -1;

// ONBOARDING_OPENER → p('prompt.onboarding.opener') — 13-dil desteği
export function getOnboardingOpener() { return p('prompt.onboarding.opener'); }

export function startOnboardingSequence() {
  _onboardingActive = true;
  _onboardingStep   = 0;
  document.getElementById('messages-area').innerHTML = '';
  S.chatHistory = [];

  setTimeout(() => {
    const opener = getOnboardingOpener();
    appendMsg('emre', opener);
    S.chatHistory.push({ role: 'assistant', content: opener });
  }, 600);
}

export function getOnboardingContext() {
  if (!_onboardingActive) return '';
  const microCtx = S._microOnboardingCtx || '';

  if (_onboardingStep === 0) {
    _onboardingStep = 1;
    return p('prompt.onboarding.context') + microCtx;
  }

  if (_onboardingStep === 1) {
    _onboardingStep = 2;
    return p('prompt.onboarding.context_transition');
  }

  _onboardingActive = false;
  _onboardingStep   = -1;
  return '';
}

/* ═══ AUTH ═══ */
export function getAuthErrors() {
  return {
    'Invalid login credentials': t('auth.error.invalid'),
    'Email not confirmed': t('auth.error.not_confirmed'),
    'User already registered': t('auth.error.already_registered'),
    'Password should be at least 6 characters': t('auth.error.short_password'),
    'Unable to validate email address: invalid format': t('auth.error.invalid_email'),
    'signup_disabled': t('auth.error.signup_disabled'),
    'Email rate limit exceeded': t('auth.error.rate_limit'),
  };
}
/* ═══ trAuthErr İKİZİ SÖKÜLDÜ (2026-08-27) ═══
   Tek tüketicisi 08-trends-payment'ın şifre sıfırlama zinciriydi; o zincir
   kod kapısıyla birlikte öldü. Tek kaynak artık 03-auth-shell'dedir. */

/* ═══ setAuthTab + fillAdmin SÖKÜLDÜ (2026-08-27) ═══
   İkisi de e-posta+şifre panelinin parçasıydı: setAuthTab "Giriş / Kayıt"
   sekmelerini çeviriyordu, fillAdmin #login-email alanına admin adresini
   yazan bir geliştirme kısayoluydu. Kod kapısında ne sekme var ne şifre
   alanı — ikisi de çağrılsa null referansla patlardı. */

