import { S } from '../state.js';
import { sb, SUPABASE_ANON, EDGE_FN_BASE, CHAT_MODEL, SUMMARY_MODEL, LLM_FALLBACK_CHAIN, EMRE_IMG } from '../config.js';
import { ensureExt } from './00-ext-loader.js';
import { idbSaveChatMessages, idbGetChatByUser } from './00b-indexeddb.js';
import { escapeHTML, EventBus, ErrorBoundary, getActivityDays } from './00a-infrastructure.js';
import { t, getCurrentLanguage, getLangInstruction } from './15-i18n.js';
import { nowTR, toTR, getAllMessages, cleanHistoryText } from './00-config-tracking.js';
import { checkWeeklySummaryNotif } from './08-trends-payment.js';
import { appendMsg, updateSessionRing } from './06-summary-chat.js';
import { applySessionPartDots } from './05-closure-parts.js';
import { fmRenderSwitchDivider, fmRenderHistoryRow } from './10w-w2-odak-modelleri.js';

/* Yedek zincirinde SIRADAKİ model — atlamadan ve döngüye girmeden.
   Eski koşul (`model === CHAT_MODEL` + `find(m => m !== model)`) iki kusur
   taşıyordu:
     1) Zincirin ÜÇÜNCÜ halkası (llama) hiç denenmiyordu — `find` daima ilk
        farklı elemanı, yani gemini'yi döndürüyordu.
     2) Kapı sohbet dışı modellere açılsaydı deepseek→gemini→deepseek
        sonsuz döngüsü doğardı; bugün döngü yok çünkü zincirin ikinci
        halkası zaten fallback yapamıyor — yani kusur (1) kusur (2)'yi
        tesadüfen gizliyordu.
   Ayrıca SUMMARY_MODEL bugün CHAT_MODEL ile aynı sabiti gösteriyor; ikisi
   ayrılırsa Atölye tasarımı / kart üretimi (12d) / örüntü damıtması (09d)
   sessizce yedeksiz kalmasın diye bağ açıkça yazıldı. */
export function _nextFallbackModel(model) {
  const i = LLM_FALLBACK_CHAIN.indexOf(model);
  if (i >= 0) return LLM_FALLBACK_CHAIN[i + 1] || null;   // sıradaki halka, yoksa dur
  // Zincir dışı ama bilinen bir model (ör. ayrılmış SUMMARY_MODEL) → baştan
  return (model === CHAT_MODEL || model === SUMMARY_MODEL) ? LLM_FALLBACK_CHAIN[0] : null;
}

export async function callLLM({ contents, systemPrompt, maxTokens = 400, temperature = 0.8, jsonMode = false, model = CHAT_MODEL, stream = false, onChunk = null, skipPersona = false, enableRAG = false, ragQuery = '', ragTopK = 3, signal = null }) {
  // Geçerli Supabase oturumunu al — Edge Function JWT ile doğrulayacak
  const { data: sessionData } = await sb.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) throw new Error('Oturum yok. Lütfen yeniden giriş yap.');

  // Client'taki system prompt artık SADECE bağlam (mod, faz, hafıza).
  // Persona (kitap alıntıları dahil) ve RAG sunucuda eklenir.
  const messages = [];
  contents.forEach(m => {
    messages.push({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.parts[0].text
    });
  });

  // Dil talimatı — TR dışındaki diller için sistem prompt'una eklenir
  const _langInstr = getLangInstruction();
  if (_langInstr) systemPrompt = (systemPrompt || '') + _langInstr;

  // Reasoning modeli (deepseek-v4-flash) görünmez "düşünme" token'larını da
  // max_tokens bütçesinden harcar — bütçe düşünme bitmeden dolarsa content hiç
  // gelmez ve balon boş kalır. Bu modellere düşünme payı eklenir; yanıtın
  // görünen uzunluğunu prompt talimatları sınırlamaya devam eder.
  const _isReasoningModel = /deepseek/i.test(model);
  const _effectiveMax = _isReasoningModel ? Math.min(4000, maxTokens + 1500) : maxTokens;

  const body = {
    model,
    messages,
    context_prompt: systemPrompt || '',  // Client bağlamı — server persona + RAG'a ekleyecek
    max_tokens: _effectiveMax,
    temperature,
    skip_persona: skipPersona,
    enable_rag:   enableRAG,
    rag_query:    ragQuery,
    rag_top_k:    ragTopK
  };
  if (jsonMode) body.response_format = { type: 'json_object' };
  if (stream) body.stream = true;

  const _t0 = Date.now();
  let res = await fetch(`${EDGE_FN_BASE}/llm-chat`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey':        SUPABASE_ANON
    },
    body: JSON.stringify(body),
    signal
  });

  // 401: Token expire olmuş olabilir — bir kez refresh dene, sonra tekrar gönder
  if (res.status === 401) {
    try {
      const { data: refreshed } = await sb.auth.refreshSession();
      const newToken = refreshed?.session?.access_token;
      if (newToken) {
        res = await fetch(`${EDGE_FN_BASE}/llm-chat`, {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${newToken}`,
            'apikey':        SUPABASE_ANON
          },
          body: JSON.stringify(body),
          signal
        });
      }
    } catch (_) { /* refresh başarısız → orijinal 401 hatası fırlatılacak */ }
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.warn(`[LLM] hata yanıtı: status=${res.status}, body=${errText.slice(0, 300)}`);
    if (res.status === 429) {
      // err.quota → 06 _appendErrorWithRetry hata balonu yerine kota duvarı çizer
      const qe = new Error('Mesaj limitin doldu. Premium\'a geçebilirsin.');
      qe.quota = true;
      throw qe;
    }
    if (res.status === 401) throw new Error('Oturumun süresi doldu. Yeniden giriş yap.');

    // 5xx → fallback modele geç (streaming dahil)
    const isServerError = res.status >= 500;
    if (isServerError) {
      const nextModel = _nextFallbackModel(model);
      if (nextModel) {
        console.warn(`[LLM] ${model} hata verdi (${res.status}), fallback: ${nextModel}`);
        return callLLM({ contents, systemPrompt, maxTokens, temperature, jsonMode, model: nextModel, stream, onChunk, skipPersona, enableRAG, ragQuery, ragTopK, signal });
      }
    }

    throw new Error(`API hatası (${res.status}): ${errText.slice(0, 200) || res.statusText}`);
  }

  // Kitap kaynakçası — sunucu RAG pasaj meta verisini header'da dönebilir
  // (SETUP-LLM-CHAT.md yaması; header yoksa sessizce null). encodeURIComponent
  // ile gelir — header'lar ASCII-dışı (Türkçe) karakter taşıyamaz.
  try {
    const _srcHeader = res.headers.get('X-Wanderer-Sources');
    S._lastBookSources = _srcHeader ? JSON.parse(decodeURIComponent(_srcHeader)) : null;
  } catch (_) { S._lastBookSources = null; }

  // Boş yanıt → fallback zinciri. Reasoning modeli tüm bütçeyi düşünmeye
  // harcayıp content üretmeden bitebilir (finish_reason: length) — bu sessizce
  // boş balon olmasın: bir sonraki modelle yeniden dene, zincir bittiyse fırlat.
  const _retryEmpty = (where) => {
    const nextModel = _nextFallbackModel(model);
    if (nextModel) {
      console.warn(`[LLM] ${model} boş yanıt döndü (${where}), fallback: ${nextModel}`);
      return callLLM({ contents, systemPrompt, maxTokens, temperature, jsonMode, model: nextModel, stream, onChunk, skipPersona, enableRAG, ragQuery, ragTopK, signal });
    }
    throw new Error('Model yanıt üretmedi. Lütfen tekrar dene.');
  };

  // Non-streaming: eski davranış
  if (!stream) {
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    if (!data.choices?.[0]) throw new Error('API yanıt döndürmedi.');
    // Model performans logu — admin analytics için
    if (!S._llmModelLog) S._llmModelLog = [];
    S._llmModelLog.push({ model, ms: Date.now() - _t0, mode: S.currentAIMode, ts: Date.now() });
    if (S._llmModelLog.length > 50) S._llmModelLog.shift();
    const _content = data.choices[0].message?.content || '';
    if (!_content.trim()) return _retryEmpty('non-stream');
    return _content;
  }

  // Streaming: SSE akışını chunk chunk oku
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';
  let _ttftYazildi = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const obj = JSON.parse(payload);
        const delta = obj.choices?.[0]?.delta?.content || '';
        if (delta) {
          /* İlk görünür harf — bekleyişin ölçüsü burada alınır. Bu kare,
             fallback zincirinde GERÇEKTEN yanıtlayan modeli bilen tek yerdir
             (callLLM kendini yeni modelle çağırır; çağıran taraf zinciri
             görmez). Ölçüm modelin adıyla birlikte anlam taşır. */
          if (!_ttftYazildi) {
            _ttftYazildi = true;
            try {
              window.wtLogLatency?.(model, Date.now() - _t0, {
                mode: S.currentAIMode, ctxMode: S._lastContextMode,
                /* Hangi Wanderer ekseninde konuşuldu (İç Çalışma 08 rev.2 · K2).
                   `?.` şart: 10w bu modülden bağımsız yüklenir ve admin
                   sayfasında hiç yüklenmez. */
                fm: window.fmGetActiveId?.(),
              });
            } catch (_) {}
          }
          full += delta;
          if (onChunk) onChunk(delta, full);
        }
      } catch (_) { /* parse hataları yoksay */ }
    }
  }
  // Akış content üretmeden bitti (reasoning bütçeyi yedi / model sustu)
  if (!full.trim()) return _retryEmpty('stream');
  return full;
}

/* ═══ HISTORY & STREAK ═══
   Wanderer Studio'ya has: yalnız ritüel aktivite defterini (etw_activity_ledger_v1)
   okur. Sohbet (Wanderer LLM) artık bu seriyi beslemez — kendi bağımsız serisi
   var (13r Gün Serisi, gsCurrentStreak). historyData parametresi geriye dönük
   uyumluluk için korunur (çağıranlar değişmedi) ama artık kullanılmıyor. */
export function calculateStreak(historyData) {
  const days = new Set();
  try { getActivityDays().forEach(k => days.add(k)); } catch (_) {}
  if (!days.size) return 0;

  // Günleri Date objesine çevir ve yeniden eskiye sırala
  const sortedDays = Array.from(days)
    .map(d => {
      const [y, mo, da] = d.split('-').map(Number);
      return new Date(y, mo, da);
    })
    .sort((a, b) => b - a);

  // Son aktivite günü bugün veya dün olmalı, yoksa seri kırılmış
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastDay = sortedDays[0];
  const daysSinceLast = Math.round((today - lastDay) / 86400000);

  if (daysSinceLast > 1) return 0; // Dün veya bugünden eski = seri kırık

  // Ardışık günleri say
  let streak = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const gap = Math.round((sortedDays[i - 1] - sortedDays[i]) / 86400000);
    if (gap === 1) streak++;
    else break;
  }
  return streak;
}

/** Seriyi mevcut state'ten (sohbet + ritüel defteri) yeniden hesapla ve
 *  UI'a bas. Ritüel tamamlandığında çağrılır — yeni sohbet beklemeden
 *  seri ve hafta zinciri güncellensin. */
export function recomputeStreakUI() {
  const msgs = [];
  Object.values(S.allSessions || {}).forEach(arr => {
    if (Array.isArray(arr)) arr.forEach(m => msgs.push(m));
  });
  const n = calculateStreak(msgs);
  updateStreakUI(n);
  return n;
}

export function updateStreakUI(n) {
  const chatStreak = document.getElementById('chat-streak');
  if (chatStreak) chatStreak.textContent = n;
  const topCircle = document.getElementById('topbar-streak-count');
  if (topCircle) topCircle.textContent = n;
}

/* Hero üst bilgi — seans numarası + tarih */
function _sessionHeroStrings() {
  const sessCount = Object.keys(S.allSessions || {}).length || 1;
  const lang = S._currentLang || 'tr';
  const d = new Date();
  const dateStr = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long' }).format(d).toLocaleUpperCase(lang);
  const sessStr = `${t('history.session_upper', 'SEANS')} ${String(sessCount).padStart(2,'0')}`;
  return { head: `${sessStr} · ${dateStr}`, divider: `${t('history.listening_upper', 'DİNLEME')} · ${dateStr}` };
}
function _heroHTML() {
  const s = _sessionHeroStrings();
  return `
    <div class="session-hero-block" data-hero="1">
      <div class="session-hero">
        <img class="session-hero-img" src="${EMRE_IMG}" alt="Emre the Wanderer" draggable="false">
        <div class="session-hero-grain"></div>
        <div class="session-hero-grain alt"></div>
        <div class="session-hero-vignette"></div>
        <div class="session-hero-overlay">
          <div class="session-hero-title serif">Emre the Wanderer</div>
        </div>
      </div>
    </div>
  `;
}
export function updateSessionHero() {
  const container = document.getElementById('hero-container');
  if (!container) return;
  if (container.querySelector('.session-hero-block')) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = _heroHTML();
  container.appendChild(tmp.firstElementChild);
}
function _ensureSessionHero() {
  const container = document.getElementById('hero-container');
  if (!container) return;
  if (container.querySelector('.session-hero-block')) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = _heroHTML();
  container.appendChild(tmp.firstElementChild);
}

/* hero-container'a koruyucu gözlemci */
(function initHeroGuard() {
  function attach() {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('hero-container');
    if (!container) { setTimeout(attach, 200); return; }
    _ensureSessionHero();
    const obs = new MutationObserver(() => {
      if (!container.querySelector('.session-hero-block')) _ensureSessionHero();
    });
    obs.observe(container, { childList: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();

/* Hero scroll-collapse — aşağı inerken gizle, tepe bölgesine (~400px) dönünce geri getir */
/* Kitap-üstüne-kitap altın tozu efekti — topbar strip moduna geçince */
function _spawnGoldDust(topbarEl) {
  const rect = topbarEl.getBoundingClientRect();
  const N = 20;
  for (let i = 0; i < N; i++) {
    const p = document.createElement('span');
    const x = rect.left + Math.random() * rect.width;
    const y = rect.bottom;

    /* Kitap sıkışma fiziği: ağırlıklı yatay yayılım, hafif yukarı akış */
    const side = Math.random() < 0.5 ? -1 : 1;
    const dx = side * (15 + Math.random() * 65);
    const dy = -(8 + Math.random() * 28);

    const size   = 0.7 + Math.random() * 2.1;
    const dur    = 0.5 + Math.random() * 0.55;
    const del    = Math.random() * 0.09;
    const alpha  = 0.5 + Math.random() * 0.5;
    const hue    = 38 + Math.floor(Math.random() * 18); /* sıcak altın yelpazesi */
    const lit    = 48 + Math.floor(Math.random() * 18);

    p.style.cssText =
      `position:fixed;left:${x}px;top:${y}px;` +
      `width:${size}px;height:${size}px;border-radius:50%;` +
      `background:hsla(${hue},72%,${lit}%,${alpha});` +
      `box-shadow:0 0 ${size + 1}px hsla(${hue},80%,65%,0.45);` +
      `pointer-events:none;z-index:var(--z-cinematic);` +
      `animation:goldDustPuff ${dur}s ease-out ${del}s forwards;` +
      `--gdx:${dx}px;--gdy:${dy}px;`;

    document.body.appendChild(p);
    setTimeout(() => { if (p.parentNode) p.parentNode.removeChild(p); }, (dur + del + 0.12) * 1000);
  }
}

/* Histerezis: gizleme eşiği DAİMA gösterme eşiğinin ÜSTÜNDE olmalı — arada
   kalan bant (24–60) "durumu koru" bölgesidir. Eskiden SHOW_BELOW=400 idi,
   yani gizleme eşiğinden büyüktü: 60–400 arası kararlı değil KARARSIZ bir
   banda dönüşüyordu ve kullanıcının her yön değişimi barı açıp kapatıyordu.
   Bar çökünce .chat-area 35px uzadığı için (57px → 22px) her toggle bir
   layout sıçraması demekti — ±12px'lik bir parmak oynaması yarım saniyede
   8 toggle üretiyordu. Kaydın gösterdiği "zorlanma" buydu. */
const HERO_HIDE_AT    = 60;  // px aşağı: hero kaybolur
const HERO_SHOW_BELOW = 24;  // px: yalnız tepe bölgesine dönünce hero geri gelir

/* Bar durum kararı — saf: DOM'a dokunmaz, yalnız yeni `hidden` değerini döner.
   Ayrı durmasının nedeni sınanabilirliktir: bandın kararlılığı jsdom'da layout
   olmadan da koşulabilsin (tests/04-llm-hero-history.test.js). */
export function _heroCollapseKarar(top, lastTop, hidden, mesajSayisi) {
  // Az mesajda veya tepedeyken hero gizlenmez
  if (mesajSayisi < 5 || top === 0) return false;
  if (top - lastTop > 0) {
    // Aşağı gidiyor
    return (!hidden && top > HERO_HIDE_AT) ? true : hidden;
  }
  // Yukarı gidiyor — yalnız tepe bölgesinde hero geri gelir
  return (hidden && top < HERO_SHOW_BELOW) ? false : hidden;
}

(function initHeroScrollCollapse() {
  function attach() {
    if (typeof document === 'undefined') return;
    const area      = document.getElementById('messages-area');
    const container = document.getElementById('hero-container');
    if (!area || !container) { setTimeout(attach, 200); return; }

    const topbar = document.querySelector('.w2-topbar');

    // Hero offset artık CSS'de (margin-top: calc(-57px - var(--safe-t)))

    let _dustPending = false;
    function setCollapsed(val) {
      container.classList.toggle('hero-collapsed', val);
      if (topbar) {
        topbar.classList.toggle('topbar-collapsed', val);
        /* Altın tozu — sadece kapanırken, hızlı tekrar tetiklemeyi önle */
        if (val && !_dustPending) {
          _dustPending = true;
          _spawnGoldDust(topbar);
          setTimeout(() => { _dustPending = false; }, 800);
        }
      }
    }

    let hidden  = false;
    let ticking = false;
    let lastTop = area.scrollTop;

    function update() {
      ticking = false;
      const top  = area.scrollTop;
      const yeni = _heroCollapseKarar(top, lastTop, hidden,
                                      area.querySelectorAll('.message').length);
      lastTop = top;
      if (yeni !== hidden) { hidden = yeni; setCollapsed(yeni); }
    }

    area.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });

    if (topbar) {
      topbar.addEventListener('click', () => {
        if (hidden) area.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    update();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();

/* Topbar'daki shimmer ok → sohbetin en üstüne dön (collapsed bar'da görünür) */
export function w2ScrollTop() {
  const area = document.getElementById('messages-area');
  if (area) area.scrollTo({ top: 0, behavior: 'smooth' });
}

export const CHAT_PAGE_SIZE = 500; // İlk yüklemede son 500 mesaj

export async function loadAllChatHistory() {
  return ErrorBoundary.run('loadAllChatHistory', async () => {
  // IDB önbelleği: ağa gitmeden anında render (cache-first)
  try {
    const cached = await idbGetChatByUser(S.currentUser.id);
    if (cached?.length >= 10) {
      const sorted = cached.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      S.allSessions = {};
      sorted.forEach(m => {
        const sid = m.session_id || 'legacy';
        if (!S.allSessions[sid]) S.allSessions[sid] = [];
        S.allSessions[sid].push(m);
      });
      const streak = calculateStreak(sorted);
      updateStreakUI(streak);
      renderHistory();
    }
  } catch (_) { /* IDB yoksa sessizce devam et */ }

  // İlk yükleme: son CHAT_PAGE_SIZE mesajı getir (hız için)
  const { data, count } = await sb.from('chat_history')
    .select('*', { count: 'exact' })
    .eq('user_id', S.currentUser.id)
    .order('created_at', { ascending: false })
    .limit(CHAT_PAGE_SIZE);

  S.allSessions = {};
  if (data?.length) {
    // Kopyasını ters çevir (orijinal data'ya dokunma — calculateStreak için lazım)
    const ascending = [...data].reverse();
    ascending.forEach(m => {
      const sid = m.session_id || 'legacy';
      if (!S.allSessions[sid]) S.allSessions[sid] = [];
      S.allSessions[sid].push(m);
    });
    // IDB'ye async olarak kaydet (UI'ı bloklamaz)
    idbSaveChatMessages(ascending).catch(() => {});
  }

  S._chatHistoryFullyLoaded = !count || count <= CHAT_PAGE_SIZE;

  const streak    = calculateStreak(data);
  const sessCount = Object.keys(S.allSessions).length;
  updateStreakUI(streak);
  renderHistory();
  checkWeeklySummaryNotif();
  updateSessionHero();

  // Arka planda geri kalanı yükle (UI'ı bloklamaz)
  if (!S._chatHistoryFullyLoaded) {
    loadRemainingHistory(CHAT_PAGE_SIZE);
  }
  }); // ErrorBoundary.run end
}

export async function loadRemainingHistory(offset) {
  try {
    const { data } = await sb.from('chat_history')
      .select('*')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: true });

    // Sadece henüz yüklenmemiş olanları ekle
    if (data?.length) {
      const existingIds = new Set();
      getAllMessages().forEach(m => {
        if (m.id) existingIds.add(m.id);
      });

      data.forEach(m => {
        if (m.id && existingIds.has(m.id)) return;
        const sid = m.session_id || 'legacy';
        if (!S.allSessions[sid]) S.allSessions[sid] = [];
        S.allSessions[sid].push(m);
      });

      // Seansları tarihe göre sırala
      Object.keys(S.allSessions).forEach(sid => {
        S.allSessions[sid].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      });

      renderHistory();
    }
    S._chatHistoryFullyLoaded = true;
  } catch (e) {
    console.warn('Arka plan geçmiş yükleme hatası:', e);
  }
}

export function getSessionLastActivity(sid) {
  const msgs = S.allSessions[sid];
  if (!msgs || !msgs.length) return 0;
  // Son mesajın tarihini bul (spread yerine reduce — büyük array'lerde stack overflow önler)
  return msgs.reduce((max, m) => {
    const t = new Date(m.created_at).getTime();
    return t > max ? t : max;
  }, 0);
}

export function renderHistory() {
  const list = document.getElementById('full-history-list');
  if (!list) return;
  list.innerHTML = '';
  // Son aktiviteye göre sırala — geçmiş seans güncellenince öne gelir
  const sortedSids = Object.keys(S.allSessions).sort((a, b) =>
    getSessionLastActivity(b) - getSessionLastActivity(a)
  );
  if (!sortedSids.length) { list.innerHTML = `<div class="empty-state">${t('history.empty', 'Geçmiş boş. İlk adımı at.')}</div>`; return; }
  sortedSids.forEach(sid => {
    const msgs  = S.allSessions[sid];
    const first = msgs.find(m => m.role === 'user');
    if (!first) return;
    const short   = first.content.length > 55 ? first.content.slice(0, 55) + '…' : first.content;
    const safeShort = escapeHTML(short);
    // Tarihi son mesaja göre göster
    const lastMsg = msgs[msgs.length - 1];
    const _locale = getCurrentLanguage();
    const dStr    = new Date(lastMsg.created_at).toLocaleDateString(_locale, { day: 'numeric', month: 'long', year: 'numeric' });
    const item    = document.createElement('div');
    item.className = 'history-item';
    item.onclick = () => {
      S.currentSessId = sid;
      S.chatHistory   = msgs.map(m => ({ role: m.role, content: cleanHistoryText(m.content), mode: m.mode || '' }));
      S.summaryInProgress = false;
      const _ma = document.getElementById('messages-area');
      _ma.innerHTML = '';
      _ma.dataset.w2mode = 'session'; // belirli seans — canlı DOM korumasını geçersizleştir
      S.chatHistory.forEach(m => {
        if (m.role === 'system' && fmRenderHistoryRow(m.mode)) {
          fmRenderSwitchDivider(m.mode.slice('fmswitch:'.length));
        } else {
          const _bal = appendMsg(m.role === 'user' ? 'user' : 'emre', m.content, m.mode || '');
          // Mesajın kimliği ve izleri geri gelir — süsler yalnız canlı
          // kancalarda yaşadığı için eskiden yenilemede kayboluyordu.
          if (_bal && m.id != null) _bal.dataset.msgId = String(m.id);
          if (_bal && m.decorations) window.dekoCiz?.(_bal, m.decorations);
        }
      });
      updateSessionRing();
      EventBus.emit('navigate', { view: 'chat' });
      applySessionPartDots(sid);
    };
    item.innerHTML = `<div class="h-date">${dStr}</div><div class="h-title">${safeShort}</div>`;
    list.appendChild(item);
  });
}

window.addEventListener('i18nchange', function() {
  renderHistory();
});

export async function loadMoodHistory() {
  return ErrorBoundary.run('loadMoodHistory', async () => {
    const { data } = await sb.from('mood_history').select('*').eq('user_id', S.currentUser.id).order('created_at', { ascending: true });
    renderMoodChart(data);
    if (data?.length) {
      const todayStr   = nowTR().toDateString();
      const todayMoods = data.filter(m => toTR(m.created_at).toDateString() === todayStr);
      const todayAvg   = todayMoods.length ? (todayMoods.reduce((a, b) => a + b.score, 0) / todayMoods.length).toFixed(1) : '-';
      document.getElementById('chat-mood').textContent = todayAvg;
      const allAvg = (data.reduce((a, b) => a + b.score, 0) / data.length).toFixed(1);
      const avgEl  = document.getElementById('dash-avg-mood');
      if (avgEl) avgEl.textContent = allAvg;
    } else {
      document.getElementById('chat-mood').textContent = '-';
    }
  });
}

export function renderMoodChart(data) {
  const ctx = document.getElementById('moodChart');
  if (!ctx) return;
  if (!data?.length) { if (S.moodChartObj) S.moodChartObj.destroy(); return; }
  const groups = {};
  data.forEach(m => {
    const d = new Date(m.created_at).toLocaleDateString(getCurrentLanguage(), { day: 'numeric', month: 'short' });
    if (!groups[d]) groups[d] = [];
    groups[d].push(m.score);
  });
  const labels = Object.keys(groups);
  const values = labels.map(d => (groups[d].reduce((a, b) => a + b, 0) / groups[d].length).toFixed(1));
  // Grafik motoru sidecar'dan (ext-chart.js) — ilk açılışta bir kez iner.
  // İmza sync kalır; destroy, yarışı önlemek için then içinde.
  ensureExt('chart').then(({ Chart }) => {
  if (S.moodChartObj) S.moodChartObj.destroy();
  S.moodChartObj = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{
      data: values, borderColor: '#B8953C',
      backgroundColor: 'rgba(184,149,60,0.04)',
      borderWidth: 1.5, tension: 0.4, fill: true,
      pointBackgroundColor: '#000', pointBorderColor: '#B8953C',
      pointBorderWidth: 1.5, pointRadius: 3
    }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 10, grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false }, ticks: { color: '#52504A', stepSize: 2 } },
        x: { grid: { display: false, drawBorder: false }, ticks: { color: '#52504A' } }
      }
    }
  });
  }).catch(e => console.error('grafik motoru yüklenemedi:', e));
}

/* ═══════════════════════════════════════
   #5 GÜNLÜK KAPANIŞ — Ruh (mood) + Beden (somatik)
   Günde bir kez, gün-bazlı akış.
═══════════════════════════════════════ */
