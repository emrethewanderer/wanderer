import { S } from '../state.js';
import { sb, SUMMARY_MODEL, EMRE_IMG } from '../config.js';
import { SafeStorage, EventBus, VirtualScroller, escapeHTML, showToast, createHookRegistry, localDayKey } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { callLLM } from './04-llm-hero-history.js';
import { toTR } from './00-config-tracking.js';
import { w2RenderGreetingCard, w2RenderChatContextCards, w2SyncDrawerIdentityCards } from './10-features-w2.js';
import { appendMsg, createWsChatDateDivider, openSummarySession, _createMsgEl, getTimeOfDayLabel, createTimePeriodDivider } from './06-summary-chat.js';
import { fmRenderHistoryRow, fmRenderSwitchDivider, fmBuildSwitchDivider } from './10w-w2-odak-modelleri.js';
import { mektupOpen, mektupPhotoUrl } from './13d-mektup.js';
import { idbGetChatByUser, idbDelete, IDB_STORES } from './00b-indexeddb.js';
import { applyAutoClosurePenalty, stopDayClosedCountdown } from './05-closure-parts.js';

import { p } from './16-i18n-prompts.js';

/** w2RenderInfiniteChat için after-hook registry (Faz 2.1) */
export const w2RenderInfiniteChatHooks = createHookRegistry();

export function w2RenderInfiniteChat() {
  const result = _w2RenderInfiniteChatBody();
  w2RenderInfiniteChatHooks.runAfter();
  return result;
}

// Bu kurulumun "imzası" — kabuk dışı bir şey değişmediyse DOM korunur.
function _w2ChatRenderKey() {
  const d = new Date();
  return [
    String(S.currentSessId || ''),
    localDayKey(d),
    String(S._currentLang || '')
  ].join('|');
}
function _w2MarkRendered(area) {
  area.dataset.w2mode = 'inf';
  area.dataset.w2key  = _w2ChatRenderKey();
}

function _w2RenderInfiniteChatBody() {
  const area = document.getElementById('messages-area');
  if (!area) return;

  // ─── CANLI DOM KORUMASI ───
  // "Sohbet"ten çıkıp tekrar girince switchView her seferinde burayı çağırır.
  // Eskiden messages-area sıfırdan kurulurdu (innerHTML=''), bu da konuşma
  // akışında CANLI eklenen unsurları siler: mod geçişi ayracı, "Kitap Alıntısı"
  // kartı, "Hadi böyle bir kişi oluşturalım" chip'i, takip pilleri, araç chip'leri…
  // DOM zaten güncel konuşmayı (aynı gün/seans/dil) gösteriyorsa YENİDEN KURMA —
  // canlı süslemeleri olduğu gibi koru, yalnızca en alta kaydır.
  // (Geçmiş seans yükleyen yollar — 04/06/08 — dataset.w2mode'u 'session' yapıp
  //  bu korumayı bilerek geçersizleştirir; gün/dil/seans değişince anahtar tutmaz.)
  if (area.dataset.w2mode === 'inf'
      && area.dataset.w2key === _w2ChatRenderKey()
      && area.childElementCount > 0) {
    requestAnimationFrame(() => { area.scrollTop = area.scrollHeight; });
    return;
  }

  // Aktif seans mesajları hâlihazırda chatHistory'de; DB'den tüm geçmişi flat al
  const allMsgs = Object.values(S.allSessions || {})
    .flat()
    .filter(m => m && m.created_at)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  if (!allMsgs.length) {
    area.innerHTML = '';
    area.appendChild(createWsChatDateDivider());
    area.appendChild(w2RenderGreetingCard());
    const ctxCards = w2RenderChatContextCards();
    if (ctxCards) area.appendChild(ctxCards);
    _w2MarkRendered(area);
    return;
  }

  // Günlere göre grupla (LOCAL date)
  const byDay = new Map();
  allMsgs.forEach(m => {
    const d = new Date(m.created_at);
    const key = localDayKey(d);
    if (!byDay.has(key)) byDay.set(key, { date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), msgs: [] });
    byDay.get(key).msgs.push(m);
  });

  // Bugünün anahtarı
  const now = new Date();
  const todayKey = localDayKey(now);

  // Özet listesi (hangi günün özeti var)
  const summariesByDay = w2GetSummariesByDay();

  // Eski içeriği temizle
  area.innerHTML = '';

  // Günleri eski → yeni sırala
  const dayKeys = Array.from(byDay.keys()).sort((a, b) => byDay.get(a).date - byDay.get(b).date);

  // Geçmiş günler: tek bir "Geçmiş Günler" girişi olarak özetlenir
  const pastDayKeys = dayKeys.filter(k => k !== todayKey);
  const pastCount = pastDayKeys.length;

  // Bugün: tarih divider + greeting + ctx kartları, ardından DB mesajları
  S._lastTimeOfDayLabel = null;
  area.appendChild(createWsChatDateDivider());
  area.appendChild(w2RenderGreetingCard());
  const ctxCards = w2RenderChatContextCards();
  if (ctxCards) area.appendChild(ctxCards);

  const _VS_THRESHOLD = 40;
  const todayMsgs = byDay.has(todayKey) ? byDay.get(todayKey).msgs : [];

  if (todayMsgs.length >= _VS_THRESHOLD) {
    const vsItems = [];
    let lastPeriod = null;
    todayMsgs.forEach(m => {
      const d = toTR(m.created_at);
      const period = getTimeOfDayLabel(d);
      if (period !== lastPeriod) {
        vsItems.push({ _div: true, label: period });
        lastPeriod = period;
      }
      vsItems.push(m);
    });
    VirtualScroller.init(area, vsItems, (item) => {
      if (item._div) return createTimePeriodDivider(item.label);
      // Odak-modeli geçiş satırı (role:'system') → emre balonu değil, ayraç
      if (item.role === 'system' && fmRenderHistoryRow(item.mode)) {
        return fmBuildSwitchDivider(item.mode.slice('fmswitch:'.length));
      }
      return _createMsgEl(item.role === 'user' ? 'user' : 'emre', item.content, item.mode || '', item.created_at || null);
    }, _VS_THRESHOLD, { reverse: true });
  } else {
    todayMsgs.forEach(m => {
      // Odak-modeli geçiş satırı (role:'system') → emre balonu değil, ayraç
      if (m.role === 'system' && fmRenderHistoryRow(m.mode)) {
        fmRenderSwitchDivider(m.mode.slice('fmswitch:'.length), m.created_at);
      } else {
        const _bal = appendMsg(m.role === 'user' ? 'user' : 'emre', m.content, m.mode || '', m.created_at || null);
        // Kimlik + izler geri gelir (deko-ledger replay'i)
        if (_bal && m.id != null) _bal.dataset.msgId = String(m.id);
        if (_bal && m.decorations) window.dekoCiz?.(_bal, m.decorations);
      }
    });
  }

  _w2MarkRendered(area);

  // Aşağıya kaydır; hero'ya geçmiş günler butonunu enjekte et (MO'dan sonra çalışır)
  requestAnimationFrame(() => {
    area.scrollTop = area.scrollHeight;
    if (pastCount > 0) {
      const overlay = document.querySelector('#hero-container .session-hero-overlay');
      if (overlay && !overlay.querySelector('.session-hero-archive-btn')) {
        const btn = document.createElement('div');
        btn.className = 'session-hero-archive-btn';
        btn.setAttribute('role', 'button');
        btn.setAttribute('tabindex', '0');
        const _pastLabel = t('chat.past_days', 'Geçmiş Günler');
        const _daysUnit  = t('chat.days_unit', 'gün');
        btn.setAttribute('aria-label', t('history.title', 'Geçmiş Kayıtlar'));
        btn.dataset.pastCount = pastCount;
        btn.innerHTML = `
          <div class="w2-day-divider-line left"></div>
          <div class="w2-day-divider-text">${escapeHTML(`${_pastLabel} · ${pastCount} ${_daysUnit}`)}</div>
          <div class="w2-day-divider-line right"></div>
        `;
        btn.onclick = () => EventBus.emit('navigate', { view: 'bugun' });
        btn.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); EventBus.emit('navigate', { view: 'bugun' }); } };
        overlay.appendChild(btn);
      }
    }
  });
}

/* Gün → özet eşlemesi (Map) — chat_summaries tablosunu kullanır */
export function w2GetSummariesByDay() {
  if (S._w2SummariesCache) return S._w2SummariesCache;
  return new Map();
}

/* session_id 'day_YYYY-MM-DD' (v3, 1-indexed) ya da 'day_YYYY-M-D' (v2, 0-indexed)
   olabilir. Cache anahtarı her yerde 0-indexed ay kullanır: `${y}-${m0}-${d}`.
   Ad-hoc seans kimlikleri için null döner — created_at fallback olur. */
export function w2DayKeyFromSession(sessionId) {
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('day_')) return null;
  const rest = sessionId.slice(4);
  let m = rest.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${Number(m[1])}-${Number(m[2]) - 1}-${Number(m[3])}`;
  m = rest.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${Number(m[1])}-${Number(m[2])}-${Number(m[3])}`;
  return null;
}

export async function w2LoadSummariesCache() {
  try {
    const { data, error } = await sb.from('chat_summaries')
      .select('*')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: false });
    // Hata sessizce yutulursa (RLS SELECT politikası yok, şema/ağ hatası) boş
    // Map mühürlenir ve "hiç özet yok" kalıcı gerçek gibi görünür. Cache'i
    // BOŞ Map'le mühürleme — null bırak ki sonraki açılış yeniden denesin.
    if (error) {
      console.warn('w2LoadSummariesCache:', error.message || error);
      return new Map();
    }
    const map = new Map();
    if (data) {
      data.forEach(s => {
        // Önce session_id'den türetilen hedef gün; aksi halde created_at gününe düş.
        // Bu, gece yarısı tetiklenip dün için üretilen özetin yanlışlıkla bugüne
        // bucketlanmasını engeller.
        let key = w2DayKeyFromSession(s.session_id);
        if (!key) {
          const d = new Date(s.created_at);
          key = localDayKey(d);
        }
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(s);
      });
    }
    S._w2SummariesCache = map;
    return map;
  } catch (e) {
    console.warn('w2LoadSummariesCache:', e);
    return new Map();
  }
}

/* ─── TAKVİM GÖRÜNÜMÜ ─── */

/* Özet içinden ton etiketi çıkar (yoksa heuristik) */
export function w2ExtractToneFromSummary(s) {
  if (!s) return '';
  // Eğer structured_summary varsa onun içinden
  try {
    if (s.structured_summary) {
      const obj = typeof s.structured_summary === 'string' ? JSON.parse(s.structured_summary) : s.structured_summary;
      if (obj?.tone) return obj.tone;
    }
  } catch (_) {}
  // Title'dan basit çıkarım
  const t = (s.title || '') + ' ' + (s.summary || '');
  const lower = t.toLowerCase();
  if (/(kaç|direnç|direndi|rahatsız)/.test(lower)) return 'Direniş';
  if (/(fark|gördü|anladı|keşf)/.test(lower)) return 'Farkındalık';
  if (/(öfk|kızg|sinir)/.test(lower)) return 'Öfke';
  if (/(kork|endiş|kaygı)/.test(lower)) return 'Kaygı';
  if (/(huzur|sakin|rahat)/.test(lower)) return 'Sakin';
  if (/(cesaret|kara|güç)/.test(lower)) return 'Cesaret';
  if (/(hüzün|üzgün|yas)/.test(lower)) return 'Hüzün';
  return '';
}

/* ─── YAPILANDIRILMIŞ GÜN ÖZETİ ÜRETİMİ ─── */
/* Bir günün TÜM user + emre mesajlarını birleştirip 3 başlıklı özet üretir.
   Sonuç: chat_summaries tablosuna kaydedilir. */
export async function w2GenerateDaySummary(dayKey) {
  const [y, m, d] = dayKey.split('-').map(Number);
  const dayStart = new Date(y, m, d).getTime();
  const dayEnd = new Date(y, m, d + 1).getTime();

  const dayMsgs = Object.values(S.allSessions || {}).flat()
    .filter(mm => mm && mm.created_at)
    .filter(mm => {
      const t = new Date(mm.created_at).getTime();
      return t >= dayStart && t < dayEnd;
    })
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  const userMsgs = dayMsgs.filter(mm => mm.role === 'user');
  const totalChars = userMsgs.reduce((a, mm) => a + (mm.content || '').length, 0);
  if (userMsgs.length < 3 || totalChars < 200) {
    return { ok: false, reason: 'insufficient' };
  }

  // Bu gün için zaten özet var mı?
  const existingMap = await w2LoadSummariesCache();
  if (existingMap.has(dayKey)) {
    // Ama günlük otomatik özet olmayabilir — yine de tekrar üretmeyelim, yeterli.
    return { ok: false, reason: 'exists' };
  }

  const userLines = userMsgs.map((mm, i) => `${i + 1}. ${mm.content.slice(0, 200)}`).join('\n');
  const emreLines = dayMsgs.filter(mm => mm.role === 'assistant')
    .map(mm => (mm.content || '').slice(0, 100)).join(' | ');

  const prompt = `Bugün kullanıcının mesajları:\n${userLines}\n\nEmre'nin yanıtları (kısa):\n${emreLines}\n\n` +
    `Bu günün tamamını özetle. Şu JSON formatında cevap ver, başka hiçbir şey yazma:\n` +
    `{\n` +
    `  "title": "kısa ve çarpıcı başlık (kullanıcının dilinde), maks 5 kelime",\n` +
    `  "tone": "günün duygusal tonunu tek kelimeyle (örn: Direniş, Farkındalık, Öfke, Sakin, Kaygı, Cesaret, Hüzün, Kararlılık)",\n` +
    `  "what": "Ne konuştuk — 2-3 cümle, ana temalar ve dönüm noktaları",\n` +
    `  "noticed": "Ne fark ettin — kullanıcının bugün görmeye başladığı içgörü veya farkındalık, 2-3 cümle. Eğer açık bir farkındalık yoksa, hangi kalıbın su yüzüne çıktığını anlat.",\n` +
    `  "next": "Bir sonraki adım — Emre\'nin sesiyle, yönlendirici ve net bir çağrı, 1-2 cümle"\n` +
    `}`;

  const raw = await callLLM({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    systemPrompt: p('prompt.day_summary.system'),
    maxTokens: 600, temperature: 0.3, jsonMode: true, model: SUMMARY_MODEL, skipPersona: true
  });

  let obj;
  try { obj = JSON.parse(raw); }
  catch {
    // Fallback
    const tm = raw.match(/"title"\s*:\s*"([^"]+)"/);
    const tn = raw.match(/"tone"\s*:\s*"([^"]+)"/);
    const wh = raw.match(/"what"\s*:\s*"([^"]+)"/);
    const no = raw.match(/"noticed"\s*:\s*"([^"]+)"/);
    const nx = raw.match(/"next"\s*:\s*"([^"]+)"/);
    if (tm && wh) {
      obj = {
        title: tm[1],
        tone: tn ? tn[1] : '',
        what: wh[1],
        noticed: no ? no[1] : '',
        next: nx ? nx[1] : ''
      };
    } else {
      throw new Error('Gün özeti formatı okunamadı.');
    }
  }

  // DB'ye yaz — structured alanı JSON olarak summary sütunu yerine ayrı bir alana
  // Eğer structured_summary kolonu yoksa summary'ye JSON olarak gömüyoruz.
  const flatSummary = `${obj.what}\n\nFark Ettiğin: ${obj.noticed}\n\nSonraki Adım: ${obj.next}`;

  const insertRow = {
    user_id: S.currentUser.id,
    session_id: 'day_' + dayKey,
    title: obj.title,
    summary: flatSummary
  };

  // Deneme: structured_summary ve tone kolonları varsa onlara da yaz
  try {
    const { error: e1 } = await sb.from('chat_summaries').insert([{
      ...insertRow,
      tone: obj.tone || null,
      structured_summary: JSON.stringify({
        tone: obj.tone || '',
        what: obj.what || '',
        noticed: obj.noticed || '',
        next: obj.next || ''
      })
    }]);
    if (e1) throw e1;
  } catch (colErr) {
    // structured_summary / tone kolonları yok — sadece summary ile yaz
    console.warn('structured_summary kolonu yok, fallback insert deneniyor:', colErr?.message);
    const { error: e2 } = await sb.from('chat_summaries').insert([insertRow]);
    if (e2) {
      console.warn('Özet kayıt hatası:', e2);
      return { ok: false, reason: 'db', error: e2 };
    }
  }

  // Cache'i invalidate et
  S._w2SummariesCache = null;
  await w2LoadSummariesCache();

  return { ok: true, title: obj.title, summary: flatSummary, tone: obj.tone };
}

/* ─── OTOMATİK GECE YARISI ÖZET TETİKLEYİCİ ─── */
/* Uygulama açıldığında: Dün henüz özetlenmemişse özet üret.
   Ayrıca gece yarısını geçen uzun oturumlar için günlük timer kurar. */
export async function w2CheckAndSummarizeYesterday() {
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const yKey = localDayKey(yesterday);

    // Otomatik kapanış cezası — gün manuel kapatılmadıysa bir kez −3 elmas
    // (idempotent; gece-yarısı timer'ı bu sürümü çağırdığından burada da uygulanır).
    applyAutoClosurePenalty(yKey);

    // Son kontrol tarihi — aynı gün içinde tekrar tetikleme
    const lastCheckKey = 'w2_lastdaysummary_check_' + S.currentUser?.id;
    const lastCheck = SafeStorage.getRaw(lastCheckKey);
    if (lastCheck === yKey) return;

    const result = await w2GenerateDaySummary(yKey);
    SafeStorage.setRaw(lastCheckKey, yKey);

    if (result.ok) {
      // Kullanıcıya bildirim
      w2NotifyDaySummaryReady(yesterday, result.title);
    }
  } catch (e) {
    console.warn('w2CheckAndSummarizeYesterday:', e);
  }
}

export function w2NotifyDaySummaryReady(dateObj, title) {
  // In-app toast
  try { showToast(t('toast.summary_yesterday')); } catch (_) {}

  // Push notification
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      const dateStr = dateObj.toLocaleDateString(S._currentLang || 'tr', { day: 'numeric', month: 'long' });
      const n = new Notification('Wanderer', {
        body: t('summary.ready_push', '{date} özetin hazır: {title}').replace('{date}', dateStr).replace('{title}', title),
        icon: EMRE_IMG,
        badge: EMRE_IMG,
        tag: 'w2-day-summary'
      });
      n.onclick = () => {
        window.focus();
        EventBus.emit('navigate', { view: 'bugun' });
        n.close();
      };
    }
  } catch (e) { console.warn('Notification error:', e); }
}

/* Gece yarısını aşan oturum için zamanlayıcı */
export function w2ScheduleMidnightSummary() {
  if (S._w2MidnightTimer) clearTimeout(S._w2MidnightTimer);
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 30, 0); // Gece yarısından 30sn sonra
  const delay = nextMidnight - now;
  S._w2MidnightTimer = setTimeout(async () => {
    await w2CheckAndSummarizeYesterday();
    stopDayClosedCountdown();
    // Sohbet ekranını yenile — yeni gün başladı, sohbet tekrar açık
    try {
      const chatView = document.getElementById('chat-view');
      if (chatView && !chatView.classList.contains('active')) {
        EventBus.emit('navigate', { view: 'chat' });
      } else {
        w2RenderInfiniteChat();
      }
    } catch (_) {}
    // Bir sonraki günü de planla
    w2ScheduleMidnightSummary();
  }, Math.max(1000, delay));
}




window.addEventListener('i18nchange', function() {
  const btn = document.querySelector('.session-hero-archive-btn');
  if (!btn) return;
  const pastCount = parseInt(btn.dataset.pastCount || '0', 10);
  const _pastLabel = t('chat.past_days', 'Geçmiş Günler');
  const _daysUnit  = t('chat.days_unit', 'gün');
  const textEl = btn.querySelector('.w2-day-divider-text');
  if (textEl) textEl.textContent = `${_pastLabel} · ${pastCount} ${_daysUnit}`;
  btn.setAttribute('aria-label', t('history.title', 'Geçmiş Kayıtlar'));
});

/* ═══════════════════════════════════════════════════
   SOHBETLER — LLM KENAR ÇUBUĞU
   Ön yüzde profil cameo'sundan soldan açılır; bugünün
   sohbeti + geçmiş günler + altta profil satırı.
═══════════════════════════════════════════════════ */

let _chCurrentDayKey = null;

/* Alt profil satırını eşle — artık kullanıcının değil Emre'nin satırı:
   fotoğrafı + "Emre the wanderer · Wanderer Movement"; dokununca
   Gezgine Mektup açılır (13d). Fotoğraf admin mektubundan, yoksa Emre'ninki. */
function _chSyncProfileRow() {
  const img = document.getElementById('ch-drawer-avatar-img');
  if (img) img.src = mektupPhotoUrl();

  const nameEl = document.getElementById('ch-drawer-profile-name');
  if (nameEl) nameEl.textContent = 'Emre the wanderer';

  const modelEl = document.getElementById('ch-drawer-profile-model');
  if (modelEl) modelEl.textContent = 'Wanderer Movement';
}

function _chSearchClose() {
  const row = document.getElementById('ch-search-row');
  if (!row || row.style.display === 'none') return;
  row.style.display = 'none';
  chDrawerSearchInput(null);
  document.removeEventListener('click', _chSearchOutside, true);
}

function _chSearchOutside(e) {
  const row = document.getElementById('ch-search-row');
  const toggle = document.querySelector('.ch-search-toggle');
  if (!row) return;
  if (!row.contains(e.target) && (!toggle || !toggle.contains(e.target))) {
    _chSearchClose();
  }
}

export function chSearchToggle() {
  const row = document.getElementById('ch-search-row');
  if (!row) return;
  const open = row.style.display === 'none';
  if (open) {
    row.style.display = '';
    const si = document.getElementById('ch-search-input');
    if (si) { si.value = ''; si.focus(); }
    setTimeout(() => document.addEventListener('click', _chSearchOutside, true), 0);
  } else {
    _chSearchClose();
  }
}

export function chDrawerOpen() {
  const drawer = document.getElementById('ch-drawer');
  if (!drawer) return;
  // Önceki aramayı sıfırla — drawer her açılışta temiz liste gösterir
  const si = document.getElementById('ch-search-input');
  if (si) si.value = '';
  _chSearchClose();
  _chListTried = false; // her açılış yükleme hakkını tazeler
  _chRenderList();
  _chSyncProfileRow();
  // Üstteki kimlik kartları (Olduğun Kişi + Olmak İstediğin Kişi) taze açılsın
  try { w2SyncDrawerIdentityCards(); } catch (_) {}
  _chShowPanel('list');
  drawer.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function chDrawerClose() {
  const drawer = document.getElementById('ch-drawer');
  if (!drawer) return;
  drawer.classList.remove('open');
  document.body.style.overflow = '';
}

/* NOT: "Bugünün Sohbeti" (chDrawerGoToday) kaldırıldı — yerini üstteki
   kimlik kartları aldı (Olduğun Kişi + Olmak İstediğin Kişi). */

/* Profil satırı → Gezgine Mektup (13d) — Ayarlar'a değil */
export function chDrawerProfile() {
  chDrawerClose();
  setTimeout(() => mektupOpen(), 180);
}

export function chDrawerBackToList() {
  _chRenderList();
  _chShowPanel('list');
}

export function chDrawerViewFull() {
  if (!_chCurrentDayKey) return;
  const map = S._w2SummariesCache || new Map();
  /* Özeti olmayan günün map'te satırı yoktur — seans kimliği gün
     anahtarından türetilir, yoksa düğme kullanıcıyı bugüne düşürürdü. */
  const summaries = map.get(_chCurrentDayKey);
  const sessionId = summaries?.[0]?.session_id || _chSidFromDayKey(_chCurrentDayKey);
  chDrawerClose();
  if (sessionId) {
    openSummarySession(sessionId);
  } else {
    EventBus.emit('navigate', { view: 'chat' });
  }
}

function _chShowPanel(which) {
  const listEl   = document.getElementById('ch-list-panel');
  const detailEl = document.getElementById('ch-detail-panel');
  if (!listEl || !detailEl) return;
  if (which === 'list') {
    listEl.classList.remove('hidden');
    detailEl.classList.add('hidden');
  } else {
    listEl.classList.add('hidden');
    detailEl.classList.remove('hidden');
  }
}

/* Drawer listesi tembel yükleme kilidi — açılış + arama kapanışı aynı anda
   _chRenderList çağırabilir; iki paralel sorgu açılmasın. `_chListTried`
   yükleme PATLADIĞINDA (cache null kalır) yeniden-çizimin kendini sonsuz
   tetiklemesini keser; drawer her açılışında sıfırlanır, yani sonraki açılış
   yeniden dener. */
let _chListLoading = false;
let _chListTried = false;

function _chRenderList() {
  const listEl = document.getElementById('ch-list');
  if (!listEl) return;

  // Cache henüz yüklenmemişse liste "hiç özet yok" derdi — oysa veri sunucuda
  // duruyordu. Cache boot'ta bir kez dolar ama her özet üretimi onu null'lar
  // (12 w3GenerateDeepSummary); tazelemeyi tüketici yapar. Bir kez yükle, çiz.
  if (!S._w2SummariesCache && !_chListTried) {
    if (!_chListLoading) {
      _chListLoading = true;
      listEl.innerHTML = `<div class="ch-list-empty">${t('summary.list_loading', 'Özetler getiriliyor…')}</div>`;
      w2LoadSummariesCache()
        .catch(() => {})
        .then(() => { _chListLoading = false; _chListTried = true; _chRenderList(); });
    }
    return;
  }

  const gunler = _chGunler();
  if (!gunler.length) {
    listEl.innerHTML = `<div class="ch-list-empty">${t('summary.list_empty', 'Henüz özet bulunmuyor.<br>Bir günü kapattığında burada belirir.')}</div>`;
    return;
  }

  listEl.innerHTML = gunler.map((g) => {
    const [y, m, d] = g.key.split('-').map(Number);
    const dateObj = new Date(y, m, d);
    const dateStr = escapeHTML(dateObj.toLocaleDateString(S._currentLang || 'tr', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));

    /* Özetsiz gün AYNI satırdır — kendi görsel dili yoktur. Farkı içeriktedir:
       başlık kullanıcının kendi ilk cümlesi (uydurma başlık değil, §6.10),
       ton etiketi yoktur (ton bir yorumdur, yorumlayan olmamıştır), önizleme
       o günün gerçek yanıtından bir kesittir. Kapı da aynı kapıdır. */
    if (!g.s) {
      const ilk = (g.ilkSoz || '').trim();
      const baslik = escapeHTML(ilk ? ilk.slice(0, 90) + (ilk.length > 90 ? '…' : '') : t('chat.day_untitled', 'O günün sohbeti'));
      const kesit = escapeHTML((g.yanit || '').trim().slice(0, 120));
      return `<button class="ch-list-item" onclick="chDrawerOpenDay('${escapeHTML(g.key)}')" type="button">
        <div class="ch-list-item-date">${dateStr}</div>
        <div class="ch-list-item-title">${baslik}</div>
        ${kesit ? `<div class="ch-list-item-preview">${kesit}</div>` : ''}
      </button>`;
    }

    const s = g.s;
    const tone  = s.tone || w2ExtractToneFromSummary(s);
    const title = escapeHTML(s.title || '—');
    const preview = escapeHTML((s.summary || '').slice(0, 120));
    const toneHTML = tone ? `<div class="ch-list-item-tone">${escapeHTML(tone)}</div>` : '';
    return `<button class="ch-list-item" onclick="chDrawerOpenDay('${escapeHTML(g.key)}')" type="button">
      <div class="ch-list-item-date">${dateStr}</div>
      <div class="ch-list-item-title">${title}</div>
      ${toneHTML}
      ${preview ? `<div class="ch-list-item-preview">${preview}</div>` : ''}
    </button>`;
  }).join('');
}

/* Listenin birimi ÖZET değil GÜNDÜR. Özeti olmayan bir gün yaşanmamış gün
   değildir — üretim patlamış, ağ kesilmiş ya da gün hiç kapanmamış olabilir;
   sohbet yerinde duruyorsa satırı da durur. Bugün listeye girmez: o gün
   henüz kapanmadı ve sohbeti zaten ekranda açık.
   Sıra: en yeni → en eski. */
function _chGunler() {
  const map = S._w2SummariesCache || new Map();
  const gunler = new Map();

  for (const [key, summaries] of map.entries()) {
    const s = summaries?.[0];
    if (s) gunler.set(key, { key, s, sid: s.session_id || null });
  }

  const b = new Date();
  const bugunKey = localDayKey(b);
  for (const [sid, msgs] of Object.entries(S.allSessions || {})) {
    if (!Array.isArray(msgs) || !msgs.length) continue;
    const key = _chDayKeyFromSid(sid);
    if (!key || key === bugunKey) continue;
    const mevcut = gunler.get(key);
    if (mevcut) { if (!mevcut.sid) mevcut.sid = sid; continue; }
    const ilk = msgs.find(m => m.role === 'user' && (m.content || '').trim());
    const yanit = msgs.find(m => m.role !== 'user' && m.role !== 'system' && (m.content || '').trim());
    gunler.set(key, { key, s: null, sid, ilkSoz: ilk?.content || '', yanit: yanit?.content || '' });
  }

  return Array.from(gunler.values()).sort((a, b2) => {
    const [ay, am, ad] = a.key.split('-').map(Number);
    const [by, bm, bd] = b2.key.split('-').map(Number);
    return new Date(by, bm, bd) - new Date(ay, am, ad);
  });
}

/* ─── PAYLAŞILAN DERİN ÖZET GÖRÜNTÜLEYİCİ ───
   Hem ch-drawer (Geçmiş Sohbetler) hem Gün Kapanışı step 3 (05-closure-parts)
   AYNI görünümü kullanır → "o başlıklarda ve o şekilde". `deep`: structured_summary
   parse edilmiş nesne; düz kayıttan ({title,summary,tone}) türetilmiş alanlar
   yedektir. Eski şema (what/noticed) de okunur. `portrait` GÖSTERİLMEZ (Emre/P6
   bağlamı için dahili kalır). opts.closing: kapanış dizesini özelleştirir. */
export function renderDaySummaryHTML(deep, dateStr, opts = {}) {
  deep = deep || {};
  const esc = escapeHTML;
  const tone  = (deep.tone || '').trim();
  const title = (deep.title || '—');

  const opening = (deep.opening || '').trim();
  const theme   = (deep.theme || deep.what || deep.summary || '').trim();
  const insight = (deep.insight || deep.noticed || '').trim();
  const pattern = (deep.pattern || '').trim();
  const nextStep= (deep.next || '').trim();
  const note    = (deep.note || '').trim();
  const quotes  = Array.isArray(deep.quotes) ? deep.quotes.filter(q => q && q.trim()).slice(0, 3) : [];
  const connections = Array.isArray(deep.connections) ? deep.connections.filter(c => c && c.trim()).slice(0, 2) : [];

  const block = (label, text, accent) => text ? `<div class="ws-ozet-block">
    <div class="ws-ozet-block-header">
      <div class="ws-ozet-block-line${accent ? ' ws-ozet-block-line--accent' : ''}"></div>
      <div class="ws-ozet-block-label${accent ? ' ws-ozet-block-label--accent' : ''}">${esc(label)}</div>
    </div>
    <div class="ws-ozet-block-text${accent ? ' ws-ozet-block-text--accent' : ''}">${esc(text)}</div>
  </div>` : '';

  const quotesBlock = quotes.length ? `<div class="ws-ozet-block">
    <div class="ws-ozet-block-header">
      <div class="ws-ozet-block-line"></div>
      <div class="ws-ozet-block-label">${t('summary.your_words', 'Senin Sözlerin')}</div>
    </div>
    ${quotes.map(q => `<blockquote class="ws-ozet-quote">${esc(q.trim())}</blockquote>`).join('')}
  </div>` : '';

  const connBlock = connections.length ? `<div class="ws-ozet-block">
    <div class="ws-ozet-block-header">
      <div class="ws-ozet-block-line"></div>
      <div class="ws-ozet-block-label">${t('summary.past_connection', 'Geçmişle Bağ')}</div>
    </div>
    ${connections.map(c => `<div class="ws-ozet-connection">${esc(c.trim())}</div>`).join('')}
  </div>` : '';

  const noteBlock = note ? `<div class="ws-ozet-note">
    <div class="ws-ozet-note-label">${t('summary.emre_note', 'Emre\'nin Notu')}</div>
    <div class="ws-ozet-note-text">${esc(note)}</div>
  </div>` : '';

  const closing = opts.closing || t('summary.closing_default', '~ dünün konuşulanı bugün taşımaktan ibaret ~');

  return `
    <div class="ws-ozet-page-date">${esc(dateStr)}</div>
    <div class="ws-ozet-page-title">${esc(title)}</div>
    ${tone ? `<div class="ws-ozet-tone-tag">
      <span style="color:var(--gold);font-size:8px;">◆</span>
      <span style="font-family:var(--cinzel);font-size:8px;letter-spacing:2.5px;color:var(--gold);font-weight:600;text-transform:uppercase;">${esc(tone)}</span>
    </div>` : ''}
    ${opening ? `<div class="ws-ozet-opening">${esc(opening)}</div>` : ''}
    ${block(t('summary.what_discussed', 'Ne Konuştuk'), theme, false)}
    ${block(t('summary.what_you_saw', 'Ne Gördün'), insight, false)}
    ${block(t('summary.which_pattern', 'Hangi Kalıp'), pattern, false)}
    ${quotesBlock}
    ${connBlock}
    ${block(t('summary.next_step', 'Bir Sonraki Adım'), nextStep, true)}
    ${noteBlock}
    <div class="ws-divider" style="margin:18px 0;">
      <div class="ws-divider-line ws-divider-line--left"></div>
      <span class="ws-divider-dot">◆</span>
      <div class="ws-divider-line ws-divider-line--right"></div>
    </div>
    <div class="ws-ozet-kapanish">${esc(closing)}</div>
  `;
}

export function chDrawerOpenDay(dayKey) {
  _chCurrentDayKey = dayKey;
  const map = S._w2SummariesCache || new Map();
  const summaries = map.get(dayKey);

  const [y, m, d] = dayKey.split('-').map(Number);
  const dateObj = new Date(y, m, d);
  const _lang = S._currentLang || 'tr';
  const _monthName = new Intl.DateTimeFormat(_lang, { month: 'long' }).format(dateObj).toLocaleUpperCase(_lang);
  const _dayName   = new Intl.DateTimeFormat(_lang, { weekday: 'long' }).format(dateObj).toLocaleUpperCase(_lang);
  const dateStr = `${d} ${_monthName} ${y} · ${_dayName}`;

  const body = document.getElementById('ch-detail-body');
  if (!body) return;

  /* Özeti olmayan gün de AYNI sayfayı açar — kapı kapanmaz, sayfa dürüst
     konuşur. Eskiden burada bir toast atılıp dönülürdü: kullanıcı için o gün
     yok sayılıyordu, oysa sohbeti duruyordu. Özetin yerini bir açıklama ve
     "tam sohbeti görüntüle" kapısı alır (o düğme panelin altında zaten var). */
  if (!summaries?.length) {
    body.innerHTML = _ozetsizGunHTML(dayKey, dateStr);
    body.scrollTop = 0;
    _chShowPanel('detail');
    return;
  }
  const s = summaries[0];

  let deep = null;
  if (s.structured_summary) {
    try { deep = typeof s.structured_summary === 'string' ? JSON.parse(s.structured_summary) : s.structured_summary; } catch (_) {}
  }
  // Düz kayıt alanlarını yedek olarak birleştir (structured alanlar üstün gelir)
  const deepObj = Object.assign({ title: s.title, tone: s.tone, summary: s.summary }, deep || {});

  body.innerHTML = renderDaySummaryHTML(deepObj, dateStr);
  body.scrollTop = 0;
  _chShowPanel('detail');
}

/* Özetsiz günün sayfası — özet sayfasının AYNI primitifleriyle çizilir
   (`ws-ozet-page-*`, `ws-ozet-block`), çünkü bu bir istisna ekranı değil,
   aynı ekranın başka bir hâlidir. Başlık kullanıcının kendi ilk cümlesidir;
   uydurulmuş bir başlık burada tezin ihlali olurdu (§6.10). */
function _ozetsizGunHTML(dayKey, dateStr) {
  const esc = escapeHTML;
  const sid = _chSidFromDayKey(dayKey);
  const msgs = (S.allSessions || {})[sid] || [];
  const ilk = msgs.find(m => m.role === 'user' && (m.content || '').trim())?.content?.trim() || '';
  const baslik = ilk ? ilk.slice(0, 90) + (ilk.length > 90 ? '…' : '') : t('chat.day_untitled', 'O günün sohbeti');

  return `
    <div class="ws-ozet-page-date">${esc(dateStr)}</div>
    <div class="ws-ozet-page-title">${esc(baslik)}</div>
    <div class="ws-ozet-block">
      <div class="ws-ozet-block-header">
        <div class="ws-ozet-block-line"></div>
        <div class="ws-ozet-block-label">${t('summary.absent_label', 'Özet Yok')}</div>
      </div>
      <div class="ws-ozet-block-text">${esc(t('summary.absent_body',
        'Bu gün için bir özet çıkarılmadı. Konuştukların olduğu gibi duruyor — aşağıdan o günün sohbetini baştan sona okuyabilirsin.'))}</div>
    </div>
    <div class="ws-divider" style="margin:18px 0;">
      <div class="ws-divider-line ws-divider-line--left"></div>
      <span class="ws-divider-dot">◆</span>
      <div class="ws-divider-line ws-divider-line--right"></div>
    </div>
    <div class="ws-ozet-kapanish">${esc(t('summary.absent_closing', '~ yazılmamış olması, yaşanmamış olması değildir ~'))}</div>
  `;
}

/* ─── SOHBETLERDE ARAMA (Faz 2.3) ───
   Tüm günlerin mesaj içerikleri + özet başlıklarında TR-duyarlı arama.
   Özeti olmayan günler de bulunur (liste normalde yalnız özetli günleri gösterir). */
let _chSearchTimer = null;

export function chDrawerSearchInput(inputEl) {
  clearTimeout(_chSearchTimer);
  const v = inputEl?.value || '';
  _chSearchTimer = setTimeout(() => _chRunSearch(v), 280);
}

/* drawer dayKey (ay 0-tabanlı) → day_YYYY-MM-DD seans kimliği.
   `_chDayKeyFromSid`'in tersi: özeti olmayan bir günün sohbetine ancak
   buradan varılır (o günün map'te satırı yoktur, session_id'si de). */
function _chSidFromDayKey(key) {
  const [y, m, d] = (key || '').split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return `day_${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/* day_YYYY-MM-DD → drawer dayKey formatı (ay 0-tabanlı) */
function _chDayKeyFromSid(sid) {
  const m = /^day_(\d{4})-(\d{2})-(\d{2})$/.exec(sid || '');
  if (!m) return null;
  return `${Number(m[1])}-${Number(m[2]) - 1}-${Number(m[3])}`;
}

function _chSessionDate(sid, msgs) {
  const m = /^day_(\d{4})-(\d{2})-(\d{2})$/.exec(sid || '');
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const first = (msgs || []).find(x => x.created_at);
  return first ? new Date(first.created_at) : null;
}

/* Eşleşme çevresinden güvenli, vurgulu snippet üret */
function _chHitSnippet(content, idx, qLen) {
  const PAD = 44;
  const start = Math.max(0, idx - PAD);
  const end   = Math.min(content.length, idx + qLen + PAD);
  const before = (start > 0 ? '…' : '') + content.slice(start, idx);
  const hit    = content.slice(idx, idx + qLen);
  const after  = content.slice(idx + qLen, end) + (end < content.length ? '…' : '');
  return `${escapeHTML(before)}<mark class="ch-hit">${escapeHTML(hit)}</mark>${escapeHTML(after)}`;
}

function _chRunSearch(q) {
  const listEl = document.getElementById('ch-list');
  if (!listEl) return;
  const query = (q || '').trim().toLocaleLowerCase('tr');
  if (!query) { _chRenderList(); return; }

  const map = S._w2SummariesCache || new Map();
  const results = [];

  Object.entries(S.allSessions || {}).forEach(([sid, msgs]) => {
    if (!Array.isArray(msgs) || !msgs.length) return;
    let snippetHTML = '';
    // 1) Mesaj içeriğinde ara (en yeni eşleşme öne)
    for (let i = msgs.length - 1; i >= 0; i--) {
      const c = msgs[i]?.content || '';
      const idx = c.toLocaleLowerCase('tr').indexOf(query);
      if (idx !== -1) { snippetHTML = _chHitSnippet(c, idx, query.length); break; }
    }
    // 2) Mesajda yoksa o günün özet başlığı/metninde ara
    const dayKey = _chDayKeyFromSid(sid);
    const daySum = dayKey ? (map.get(dayKey) || [])[0] : null;
    if (!snippetHTML && daySum) {
      const st = `${daySum.title || ''} ${daySum.summary || ''}`;
      const idx = st.toLocaleLowerCase('tr').indexOf(query);
      if (idx !== -1) snippetHTML = _chHitSnippet(st, idx, query.length);
    }
    if (!snippetHTML) return;

    const dateObj = _chSessionDate(sid, msgs);
    const firstUser = msgs.find(m => m.role === 'user');
    const title = daySum?.title
      || (firstUser ? firstUser.content.slice(0, 55) + (firstUser.content.length > 55 ? '…' : '') : '—');
    results.push({ sid, dateObj, title, snippetHTML, ts: dateObj ? dateObj.getTime() : 0 });
  });

  results.sort((a, b) => b.ts - a.ts);

  if (!results.length) {
    listEl.innerHTML = `<div class="ch-list-empty">${escapeHTML(t('chat.search_empty', 'Eşleşme yok.'))}</div>`;
    return;
  }

  listEl.innerHTML = results.slice(0, 30).map(r => {
    const dateStr = r.dateObj
      ? r.dateObj.toLocaleDateString(S._currentLang || 'tr', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '';
    return `<button class="ch-list-item" onclick="chDrawerOpenChat('${escapeHTML(r.sid)}')" type="button">
      <div class="ch-list-item-date">${escapeHTML(dateStr)}</div>
      <div class="ch-list-item-title">${escapeHTML(r.title)}</div>
      <div class="ch-list-item-preview">${r.snippetHTML}</div>
    </button>`;
  }).join('');
}

/* Bir seans kimliğinden tam sohbeti aç. İki çağıranı var: arama sonucu
   satırı ve özetsiz gün satırı — ikisi de aynı işi ister, o yüzden ad
   "SearchResult" değil "Chat"tir (§4.3 tek ad, tek gerçek). */
export function chDrawerOpenChat(sid) {
  if (!sid) return;
  chDrawerClose();
  openSummarySession(sid);
}

/* ─── GÜN SİLME (Faz 2.4) ───
   Detay panelindeki "GÜNÜ SİL" — chat_history + chat_summaries + IDB + bellek.
   RLS DELETE politikası yoksa dürüstçe hata gösterilir, sahte başarı yok. */
export async function chDrawerDeleteDay() {
  if (!_chCurrentDayKey || !S.currentUser?.id) return;
  const map = S._w2SummariesCache || new Map();
  const summaries = map.get(_chCurrentDayKey) || [];
  const sessionId = summaries[0]?.session_id || null;

  const ok = confirm(t('chat.delete_day_confirm',
    'Bu günün sohbeti ve özeti kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misin?'));
  if (!ok) return;

  const uid = S.currentUser.id;
  const errs = [];

  if (sessionId) {
    const { error } = await sb.from('chat_history').delete()
      .eq('user_id', uid).eq('session_id', sessionId);
    if (error) errs.push('chat_history: ' + error.message);
  }
  if (summaries.length) {
    const ids = summaries.map(s => s.id).filter(Boolean);
    const { error } = ids.length
      ? await sb.from('chat_summaries').delete().eq('user_id', uid).in('id', ids)
      : await sb.from('chat_summaries').delete().eq('user_id', uid).eq('session_id', sessionId);
    if (error) errs.push('chat_summaries: ' + error.message);
  }

  if (errs.length) {
    console.warn('chDrawerDeleteDay:', errs.join(' | '));
    showToast(t('chat.delete_failed', 'Silme başarısız. (Yetki eksik olabilir — RLS DELETE politikası gerekli.)'), true);
    return;
  }

  // Bellek temizliği
  if (sessionId) {
    delete S.allSessions[sessionId];
    S.summarizedSessionIds?.delete?.(sessionId);
    if (S.summarizedSessionId === sessionId) S.summarizedSessionId = null;
  }
  map.delete(_chCurrentDayKey);

  // IDB temizliği — best effort, UI'ı bloklamaz
  if (sessionId) {
    idbGetChatByUser(uid).then(msgs => {
      (msgs || []).filter(m => m.session_id === sessionId)
        .forEach(m => { if (m.id) idbDelete(IDB_STORES.CHAT_HISTORY, m.id).catch(() => {}); });
    }).catch(() => {});
  }

  // Silinen gün aktif seanssa sohbeti sıfırla, bugüne dön
  if (sessionId && S.currentSessId === sessionId) {
    S.chatHistory = [];
    const area = document.getElementById('messages-area');
    if (area) area.innerHTML = '';
    const d = new Date();
    S.currentSessId = `day_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  showToast(t('chat.day_deleted', 'Gün silindi.'));
  _chCurrentDayKey = null;
  chDrawerBackToList();
}

/* ═══════════════════════════════════════════════════
   WANDERER V3 — DERİN ÖZET & DÖNÜŞÜM HATTI
═══════════════════════════════════════════════════ */

/* ─── YARDIMCILAR ─── */
