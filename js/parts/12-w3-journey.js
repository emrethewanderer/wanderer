import { S } from '../state.js';
import { sb, SUPABASE_URL, SUPABASE_ANON, EDGE_FN_BASE, ADMIN_EMAIL, SUMMARY_MODEL } from '../config.js';
import { STORAGE_KEYS, SafeStorage, MemCache, EventBus, RateLimiter, VirtualScroller, CryptoLite, SecureStorage, Z_LAYERS, A11y, AnimUtils, debounce, throttle, escapeHTML, showToast } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { callLLM, loadRemainingHistory } from './04-llm-hero-history.js';

/* w2ExtractToneFromSummary bu dosyada ÜÇ yerde çağrılıyordu ama import
   EDİLMEMİŞTİ. `s.tone || w2ExtractToneFromSummary(s)` kısa devre yaptığı
   için tonu dolu özetlerde hata görünmüyordu; tonu BOŞ tek bir satır
   ReferenceError'a yetiyordu. Üç çağrı yerinden biri CANLI yolda:
   `w3GetRecentSummaries` → `w3GenerateDeepSummary` (gün kapanışı
   `05-closure-parts:295` ve gece yarısı otomatik özeti). Diğer ikisi
   erişilemez takvim yüzeyindeydi; o yüzey 2026-08-21'de söküldü (karşılığı
   Sohbetler kenar çubuğudur — chDrawerOpenDay/renderDaySummaryHTML). */
import { w2LoadSummariesCache, w2NotifyDaySummaryReady, w2ExtractToneFromSummary } from './11-w2-chat-cal.js';
import { applyAutoClosurePenalty } from './05-closure-parts.js';

/* getUserFirstName ÇAĞRILIYORDU ama ne import ne window köprüsü vardı: bare
   identifier olduğu için build sessizce geçiyor, ÇALIŞMA ANINDA ReferenceError
   atıyordu — w3GenerateDeepSummary satır 62'de her seferinde ölüyor, iki
   çağıranın da try/catch'i hatayı yutuyordu. Sonuç: hiç özet yazılmıyor,
   Geçmiş Günler ebediyen boş, gün kapanışı "yetecek kadar konuşmadık" diyor. */
import { getUserFirstName } from './00-config-tracking.js';

/* p() aynı boşluğun ikinci yüzü — persona/prompt sözlüğü ANAHTARI (§6.4) bu
   dosyada dört yerde çağrılıyor, importu yoktu. */
import { p } from './16-i18n-prompts.js';

export function w3GetDaySessionId(dateObj) {
  const d = dateObj || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `day_${y}-${m}-${day}`;
}

export function w3GetDayKey(dateOrISO) {
  const d = (dateOrISO instanceof Date) ? dateOrISO : new Date(dateOrISO);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function w3DayKeyToDate(dayKey) {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, m, d);
}

export function w3FormatTurkishDate(date, opts = {}) {
  return date.toLocaleDateString(S._currentLang || 'tr', Object.assign({ day: 'numeric', month: 'long', year: 'numeric' }, opts));
}

/* ─── DERİN ÖZET ÜRETİMİ (8 katman) ─── */
export async function w3GenerateDeepSummary(dayKey) {
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
  const emreMsgs = dayMsgs.filter(mm => mm.role === 'assistant');
  const totalChars = userMsgs.reduce((a, mm) => a + (mm.content || '').length, 0);

  if (userMsgs.length < 2 || totalChars < 100) {
    return { ok: false, reason: 'insufficient' };
  }

  const userName = getUserFirstName();
  const userLines = userMsgs.map((mm, i) => `[K${i + 1}] ${mm.content.slice(0, 400)}`).join('\n');
  const emreLines = emreMsgs.map((mm, i) => `[E${i + 1}] ${mm.content.slice(0, 200)}`).join('\n');

  const recentSummaries = await w3GetRecentSummaries(dayKey, 10);
  const contextLines = recentSummaries.length
    ? recentSummaries.map(s => `- ${s.day_key}: ${s.title} (${s.tone || '—'})`).join('\n')
    : p('prompt.deep_summary.no_prev');

  const prompt = p('prompt.deep_summary.user', { userName, userLines, emreLines, contextLines });

  const raw = await callLLM({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    systemPrompt: p('prompt.deep_summary.system'),
    maxTokens: 3000, temperature: 0.35, jsonMode: true, model: SUMMARY_MODEL, skipPersona: true
  });

  let obj;
  try { obj = JSON.parse(raw); }
  catch (e) {
    console.warn('w3 JSON parse hatası, raw:', raw?.slice(0, 200));
    obj = w3ParseFallback(raw);
    if (!obj) return { ok: false, reason: 'parse', raw };
  }

  const normalized = {
    title: obj.title || t('summary.day_breakdown', 'Günün Dökümü'),
    tone: obj.tone || '',
    opening: obj.opening || '',
    theme: obj.theme || '',
    insight: obj.insight || '',
    pattern: obj.pattern || '',
    next: obj.next || '',
    note: obj.note || '',
    portrait: (typeof obj.portrait === 'string' ? obj.portrait.trim() : ''),
    quotes: Array.isArray(obj.quotes) ? obj.quotes.filter(q => q && q.trim()).slice(0, 3) : [],
    connections: Array.isArray(obj.connections) ? obj.connections.filter(c => c && c.trim()).slice(0, 2) : []
  };

  const dayIso = `${String(y).padStart(4, '0')}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const sessionId = `day_${dayIso}`;

  /* Düz yedek metin — yapılandırılmış kayıt yazılamazsa okunan budur.
     Etiketler kullanıcının dilinde doğar: EN kullanıcının özeti Türkçe
     başlıklarla mühürlenirse o kayıt bir daha düzelmez (§6.8). */
  const flatSummary = [
    `${t('summary.opening_state', 'Açılış Durumu')}: ${normalized.opening}`,
    `${t('summary.main_theme', 'Ana Tema')}: ${normalized.theme}`,
    `${t('summary.insight_moment', 'İçgörü Anı')}: ${normalized.insight}`,
    `${t('summary.resurfaced_pattern', 'Dirilen Kalıp')}: ${normalized.pattern}`,
    `${t('summary.next_step_short', 'Sonraki Adım')}: ${normalized.next}`,
    `${t('summary.emre_note', 'Emre\'nin Notu')}: ${normalized.note}`,
    normalized.portrait ? `${t('summary.portrait', 'Portre')}: ${normalized.portrait}` : ''
  ].filter(l => l && !l.endsWith(': ')).join('\n\n');

  const row = {
    user_id: S.currentUser.id,
    session_id: sessionId,
    title: normalized.title,
    summary: flatSummary
  };

  // TEK KAYIT GARANTİSİ: O güne ait tüm eski satırları sil, sonra yeniyi yaz.
  // Hem w2 hem w3 tarafından oluşmuş duplicate'ler tek hamlede temizlenir.
  try {
    await w3DeleteDaySummaries(dayKey);
  } catch (e) {
    console.warn('Eski gün kayıtları silinemedi (devam ediliyor):', e?.message);
  }

  let insertOk = false;
  let insertErr = null;
  try {
    const { error } = await sb.from('chat_summaries').insert([{
      ...row,
      tone: normalized.tone,
      structured_summary: JSON.stringify(normalized)
    }]);
    if (!error) insertOk = true;
    else { insertErr = error; console.warn('v3 insert (tam) hata:', error.message); }
  } catch (e) { insertErr = e; console.warn('v3 insert exception:', e); }

  if (!insertOk) {
    try {
      const { error } = await sb.from('chat_summaries').insert([row]);
      if (error) { insertErr = error; console.warn('v3 insert (flat) hata:', error); }
      else insertOk = true;
    } catch (e) { insertErr = e; console.warn('v3 insert flat exception:', e); }
  }

  // §6.2 — yazılamayan özet "üretildi" sayılmaz. Eskiden iki insert de patlasa
  // bile ok:true dönüyordu: çağıran bildirimi atıyor, gün "kontrol edildi" diye
  // mühürleniyor, ama Geçmiş Günler boş kalıyordu — hata hiçbir yerde görünmüyordu.
  if (!insertOk) {
    return { ok: false, reason: 'db', error: insertErr };
  }

  // Epizodik Hafıza (09f) — gün özeti başarıyla yazıldıysa portresini embed
  // et; anlamsal geri-getirmenin kaynağı budur. window.* TDZ-güvenli, kendi
  // idempotens+hata yönetimini yapar (mig 034 yoksa sessizce no-op).
  try { window.ehIngestDay?.(dayIso, normalized); } catch (_) {}

  S._w2SummariesCache = null;

  return { ok: true, data: normalized, sessionId };
}

// Verilen gün anahtarına ait tüm chat_summaries satırlarını siler.
// Hem session_id='day_YYYY-MM-DD' eşleşmesiyle hem de created_at aralığıyla dener —
// eski w2 sisteminin bıraktığı farklı session_id'li satırlar da yakalansın.
export async function w3DeleteDaySummaries(dayKey) {
  if (!S.currentUser) return;
  const [y, m, d] = dayKey.split('-').map(Number);
  const dayIso = `${String(y).padStart(4, '0')}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  // Yerel günün başını/sonunu UTC ISO'ya çevir — created_at UTC olarak saklanıyor,
  // dayKey ise yerel gün anahtarı. UTC midnight kullanırsak yerel günün bir kısmı
  // dışarıda kalır.
  const dayStart = new Date(y, m, d).toISOString();
  const dayEnd   = new Date(y, m, d + 1).toISOString();

  // 1. session_id eşleşmesi
  try {
    await sb.from('chat_summaries')
      .delete()
      .eq('user_id', S.currentUser.id)
      .eq('session_id', 'day_' + dayIso);
  } catch (_) {}

  // 2. created_at aralığı — farklı session_id'li eski satırları da yakala
  try {
    await sb.from('chat_summaries')
      .delete()
      .eq('user_id', S.currentUser.id)
      .gte('created_at', dayStart)
      .lt('created_at', dayEnd);
  } catch (_) {}
}

export function w3ParseFallback(raw) {
  if (!raw) return null;
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch (_) {}
  return null;
}

export async function w3GetRecentSummaries(beforeDayKey, n = 10) {
  try {
    const { data } = await sb.from('chat_summaries')
      .select('*')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(n + 5);
    if (!data) return [];
    const cutoff = w3DayKeyToDate(beforeDayKey).getTime();
    return data
      .filter(s => new Date(s.created_at).getTime() < cutoff)
      .slice(0, n)
      .map(s => ({
        day_key: w3GetDayKey(s.created_at),
        title: s.title,
        tone: s.tone || w2ExtractToneFromSummary(s) || ''
      }));
  } catch (e) { return []; }
}

/* ─── MİGRASYON ─── */

export async function w3IsMigrationNeeded() {
  const key = STORAGE_KEYS.W3_MIGRATION(S.currentUser?.id);
  if (SafeStorage.getRaw(key) === '1') return false;

  // Farklı browser/cihazdan giriş: Supabase'de kayıtlı flag'i kontrol et
  try {
    const { data: flagRow } = await sb.from('user_analytics')
      .select('data_json')
      .eq('user_id', S.currentUser.id)
      .eq('data_type', 'w3_migration_done')
      .maybeSingle();
    if (flagRow?.data_json === '1') {
      SafeStorage.setRaw(key, '1');
      return false;
    }
  } catch (_) {}

  try {
    // Soru 2026-08-19'da TERSİNE çevrildi. Eskiden "flat (structured_summary
    // NULL) satır var mı" soruluyordu: hiç özeti olmayan kullanıcıda sorgu boş
    // döner, migrasyon "gereksiz" sayılır ve damga vurulurdu — oysa geçmişi hiç
    // özetlenmemiş kullanıcı tam da migrasyona muhtaç olandır. Üretim zinciri
    // bugüne dek her çağrıda ölüyordu (bkz. getUserFirstName), yani bu durum
    // istisna değil KURAL'dı.
    const { data, error } = await sb.from('chat_summaries')
      .select('id')
      .eq('user_id', S.currentUser.id)
      .not('structured_summary', 'is', null)
      .limit(1);
    if (error) return false;               // okuyamadık → damgaya dokunma
    if (data?.length) {                    // derin özet VAR → geçmiş şekillenmiş
      SafeStorage.setRaw(key, '1');
      return false;
    }
    return true;
  } catch (e) {
    console.warn('w3IsMigrationNeeded:', e);
    return false;
  }
}

/* ── TEK SEFERLİK ONARIM ──
   Gün özeti üretimi bugüne dek HER çağrıda ReferenceError ile ölüyordu
   (`getUserFirstName`/`p` importsuzdu). Kırık zincir arkasında iki yalan damga
   bıraktı: migrasyon "tamamlandı" diye işaretlendi (sıfır özet üretmişken) ve
   her gün "kontrol edildi" diye mühürlendi. Damga bir BEYANDIR; kanıt
   `chat_summaries`'teki satırdır (§6.10). Kanıt yoksa damga yalandır — bir kez
   temizlenir, zincir yeniden koşar. Okuma patlarsa damgaya DOKUNULMAZ:
   kanıtsızlık, kanıtın yokluğu değildir. */
async function _ozetDamgaOnarimi() {
  const uid = S.currentUser?.id;
  if (!uid) return;
  const onarimKey = 'etw_ozet_damga_onarim_v1_' + uid;
  if (SafeStorage.getRaw(onarimKey)) return;

  try {
    const { data, error } = await sb.from('chat_summaries')
      .select('id')
      .eq('user_id', uid)
      .not('structured_summary', 'is', null)
      .limit(1);
    if (error) return;                       // okuyamadık → bir dahaki açılışta
    SafeStorage.setRaw(onarimKey, '1');      // onarım gün başına değil, ömür boyu bir kez
    if (data?.length) return;                // kanıt var → damgalar dürüst

    SafeStorage.remove(STORAGE_KEYS.W3_MIGRATION(uid));
    SafeStorage.remove('w2_lastdaysummary_check_' + uid);
    try {
      await sb.from('user_analytics').delete()
        .eq('user_id', uid).eq('data_type', 'w3_migration_done');
    } catch (_) {}
    console.warn('[özet] Kanıtsız "tamamlandı" damgaları temizlendi — geçmiş yeniden özetlenecek.');
  } catch (_) {}
}

export async function w3RunMigration() {
  if (S._w3MigrationRunning) return;
  S._w3MigrationRunning = true;

  const screen = document.getElementById('w3-migrate-screen');
  const bar = document.getElementById('w3-migrate-bar');
  const txt = document.getElementById('w3-migrate-text');
  const cur = document.getElementById('w3-migrate-current');

  screen.classList.add('open');
  txt.textContent = t('ui.preparing', 'Hazırlanıyor...');
  cur.textContent = '';

  try {
    if (!S._chatHistoryFullyLoaded) {
      txt.textContent = t('ui.loading_messages', 'Mesajların yükleniyor...');
      await loadRemainingHistory(0);
    }

    const allMsgs = Object.values(S.allSessions || {}).flat()
      .filter(m => m && m.created_at)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const byDay = new Map();
    allMsgs.forEach(m => {
      const dk = w3GetDayKey(m.created_at);
      if (!byDay.has(dk)) byDay.set(dk, []);
      byDay.get(dk).push(m);
    });

    const todayKey = w3GetDayKey(new Date());
    const dayKeys = Array.from(byDay.keys()).filter(k => k !== todayKey);

    // NOT: Eski "tüm özetleri sil" toplu silme kaldırıldı — bugünün özetini
    // (henüz yeniden üretilemediği için) kalıcı olarak yok ediyordu.
    // Her gün için w3GenerateDeepSummary zaten kendi w3DeleteDaySummaries
    // çağrısıyla o güne ait eski satırları temizliyor.
    S._w2SummariesCache = null;

    const total = dayKeys.length;
    if (total === 0) {
      txt.textContent = t('ui.no_past_days', 'Henüz geçmiş gün yok.');
      cur.textContent = '';
      await new Promise(r => setTimeout(r, 800));
    } else {
      for (let i = 0; i < dayKeys.length; i++) {
        const dk = dayKeys[i];
        const msgs = byDay.get(dk);
        const userMsgCount = msgs.filter(m => m.role === 'user').length;
        const totalCh = msgs.filter(m => m.role === 'user').reduce((a, m) => a + (m.content || '').length, 0);

        const pct = Math.round(((i + 1) / total) * 100);
        bar.style.width = pct + '%';
        txt.textContent = `${i + 1} / ${total} — %${pct}`;

        const dateObj = w3DayKeyToDate(dk);
        const dateStr = w3FormatTurkishDate(dateObj, { weekday: 'long' });
        cur.textContent = `${t('ui.processing', 'İşleniyor')}: ${dateStr}`;

        if (userMsgCount < 2 || totalCh < 100) continue;

        try {
          await w3GenerateDeepSummary(dk);
        } catch (e) {
          console.warn(`${dk} için özet üretim hatası:`, e);
        }
        await new Promise(r => setTimeout(r, 350));
      }
    }

    SafeStorage.setRaw(STORAGE_KEYS.W3_MIGRATION(S.currentUser.id), '1');
    // Cross-device: flag'i Supabase'e de kaydet
    try {
      await sb.from('user_analytics').upsert([{
        user_id:    S.currentUser.id,
        data_type:  'w3_migration_done',
        data_json:  '1',
        updated_at: new Date().toISOString()
      }], { onConflict: 'user_id,data_type' });
    } catch (_) {}
    S._w2SummariesCache = null;
    await w2LoadSummariesCache();

    bar.style.width = '100%';
    txt.textContent = t('ui.completed', 'Tamamlandı');
    cur.textContent = t('ui.past_reshaped', 'Geçmişin yeniden şekillendi.');
    await new Promise(r => setTimeout(r, 1400));
  } catch (e) {
    console.error('w3 migrasyon hatası:', e);
    txt.textContent = t('ui.error_occurred', 'Hata oluştu');
    cur.textContent = e.message || t('error.unexpected');
    await new Promise(r => setTimeout(r, 2500));
  } finally {
    screen.classList.remove('open');
    S._w3MigrationRunning = false;
  }
}

export async function w3MaybeRunMigration() {
  try {
    await _ozetDamgaOnarimi();   // yalan damgalar önce düşsün, soru sonra sorulsun
    const need = await w3IsMigrationNeeded();
    if (need) {
      await new Promise(r => setTimeout(r, 900));
      await w3RunMigration();
    }
  } catch (e) { console.warn('w3MaybeRunMigration:', e); }
}

/* ─── DERİN ÖZET RENDER ─── */
export function w3RenderDeepSummary(summary) {
  if (!summary) return '';

  let deep = null;
  if (summary.structured_summary) {
    try {
      deep = typeof summary.structured_summary === 'string'
        ? JSON.parse(summary.structured_summary)
        : summary.structured_summary;
    } catch (_) {}
  }

  if (!deep) {
    return `
      <div class="w3-summary-layer">
        <div class="w3-layer-label">${t('summary.label', 'Özet')}</div>
        <div class="w3-layer-text">${escapeHTML(summary.summary || '—')}</div>
      </div>
      <div style="margin-top:20px;font-size:12px;color:var(--text-dim);font-style:italic;">
        ${t('summary.old_format', 'Bu özet eski formatta.')}
      </div>
    `;
  }

  const layers = [
    { label: t('summary.opening_state', 'Açılış Durumu'), text: deep.opening },
    { label: t('summary.main_theme', 'Ana Tema'), text: deep.theme },
    { label: t('summary.insight_moment', 'İçgörü Anı'), text: deep.insight },
    { label: t('summary.resurfaced_pattern', 'Dirilen Kalıp'), text: deep.pattern },
    { label: t('summary.next_step_short', 'Sonraki Adım'), text: deep.next }
  ];

  let quotesHTML = '';
  if (deep.quotes && deep.quotes.length) {
    quotesHTML = deep.quotes.map(q =>
      `<div class="w3-quote">${escapeHTML(q)}</div>`
    ).join('');
  }

  let connectionsHTML = '';
  if (deep.connections && deep.connections.length) {
    connectionsHTML = `
      <div class="w3-connections">
        <div class="w3-connection-label">Bağlantılar</div>
        ${deep.connections.map(c => `<span class="w3-connection">${escapeHTML(c)}</span>`).join('')}
      </div>
    `;
  }

  const layersHTML = layers.filter(l => l.text).map(l => `
    <div class="w3-summary-layer">
      <div class="w3-layer-label">${escapeHTML(l.label)}</div>
      <div class="w3-layer-text">${escapeHTML(l.text)}</div>
    </div>
  `).join('');

  let noteHTML = '';
  if (deep.note) {
    noteHTML = `
      <div class="w3-emre-note">
        <div class="w3-emre-note-label">${t('ui.emre_note')}</div>
        <div class="w3-emre-note-text">${escapeHTML(deep.note)}</div>
      </div>
    `;
  }

  let quotesBlock = '';
  if (quotesHTML) {
    quotesBlock = `
      <div class="w3-summary-layer">
        <div class="w3-layer-label">Senin Sözlerinden</div>
        ${quotesHTML}
      </div>
    `;
  }

  return layersHTML + quotesBlock + connectionsHTML + noteHTML;
}

/* ═══ DÖNÜŞÜM HATTI — bölümlü okuma (DOM'suz) ═══
   Eski hâli `#w3-journey-chapters` diye bir kabuğa yazıyordu; o kabuk
   DOM'dan kalkalı çok olmuştu, yani motor çalışıyor ama kimse görmüyordu.
   Okuma katmanı burada ekrandan AYRILDI: veriyi kim isterse çeker, çizimi
   kendi diliyle yapar (bugün Derin Çalışma'nın `#dc-hat` bölümü).
   GERÇEKLİK (§6.10): bölüm başlıkları modelin YORUMUDUR; altlarında duran
   günler kullanıcının kendi kayıtlarıdır. O yüzden `gunler` yorumla birlikte
   döner: çizen taraf yorumu kanıtının üstünde gösterebilsin. (Eski v1
   cache'te gün satırı yoktur; ilk tazelemede gelir.)
   ŞEKİL: `chapters` = w3GenerateChapters'ın döndürdüğü nesnenin KENDİSİ
   (`{ intro, chapters: [{ title, description, day_indices }] }`), `gunler` =
   `[{ dk, at, baslik, ton }]` — `day_indices` bu diziye indeksler. */

/* Bölüm çıkarmak için gereken en az gün. Eşik keyfî değil: iki günden
   "yolculuk bölümü" çıkarmak kullanıcının günlerinden okumak değil,
   uydurmaktır. */
export const W3_HAT_ESIK = 3;
/* Cache şekli sürümlenir: v1 yalnız bölümleri tutuyordu, v2 günleri de
   taşır. Eski kayıt DÜŞÜRÜLMEZ — bölümleriyle okunur, günleri ilk
   tazelemede gelir. */
const W3_HAT_SURUM = 2;

/* Bölümlerin altında duran gün satırları — özetin kendisi değil, açacak
   kadarı (gün anahtarı + başlık + ton). Ağırlığı cache'e taşınabilsin diye
   ince tutulur. */
function _hatGunler(summaries) {
  return (summaries || []).map(s => ({
    dk: w3GetDayKey(s.created_at),
    at: s.created_at,
    baslik: s.title || '',
    ton: s.tone || w2ExtractToneFromSummary(s) || '',
  }));
}

function _hatCozumle(ham) {
  if (!ham || typeof ham !== 'object') return null;
  if (ham.v === W3_HAT_SURUM) return { chapters: ham.chapters, gunler: ham.gunler || [] };
  /* v1: gövdenin kendisi bölüm nesnesiydi. */
  if (Array.isArray(ham.chapters)) return { chapters: ham, gunler: [] };
  return null;
}

/* Ekrana ANINDA basılabilen hâl — ağ yok, yalnız cache. Yüzey açılırken
   bununla boyanır; tazelik sorusu kullanıcı isteyince sorulur (her açılışta
   sormak, hattı görmek için ağ beklemek demekti). */
export function w3GetChaptersCached() {
  try {
    if (!S.currentUser?.id) return null;
    return _hatCozumle(SafeStorage.get(STORAGE_KEYS.W3_JOURNEY(S.currentUser.id)));
  } catch (_) { return null; }
}

/* Hattın tek üretim yolu. `force` cache'i atlar (kullanıcı "tazele" derse).
   Dönüş her hâlde bir sebep taşır — çağıran taraf sessizce boşluğa
   düşmesin. */
export async function w3GetChapters({ force = false } = {}) {
  if (!S.currentUser?.id) return { ok: false, sebep: 'oturum_yok' };

  let data = null;
  try {
    const res = await sb.from('chat_summaries')
      .select('*')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: true });
    data = res && res.data;
  } catch (e) {
    return { ok: false, sebep: 'okunamadi', hata: e && e.message };
  }

  if (!data || data.length < W3_HAT_ESIK) return { ok: false, sebep: 'az_gun' };

  const cacheKey = STORAGE_KEYS.W3_JOURNEY(S.currentUser.id);
  const cacheVerKey = STORAGE_KEYS.W3_JOURNEY_VER(S.currentUser.id);
  const verNow = data.length + '_' + (data[data.length - 1]?.id || '');

  if (!force && SafeStorage.getRaw(cacheVerKey) === verNow) {
    const cached = _hatCozumle(SafeStorage.get(cacheKey));
    if (cached && cached.chapters) {
      return { ok: true, chapters: cached.chapters, gunler: cached.gunler.length ? cached.gunler : _hatGunler(data), taze: false };
    }
  }

  try {
    const chapters = await w3GenerateChapters(data);
    const gunler = _hatGunler(data);
    SafeStorage.set(cacheKey, { v: W3_HAT_SURUM, chapters, gunler });
    SafeStorage.setRaw(cacheVerKey, verNow);
    return { ok: true, chapters, gunler, taze: true };
  } catch (e) {
    console.warn('w3GetChapters:', e && e.message);
    return { ok: false, sebep: 'uretilemedi', hata: e && e.message };
  }
}

export async function w3GenerateChapters(summaries) {
  const lines = summaries.map((s, i) => {
    let tone = s.tone || '';
    let theme = '';
    try {
      if (s.structured_summary) {
        const d = typeof s.structured_summary === 'string' ? JSON.parse(s.structured_summary) : s.structured_summary;
        if (d.theme) theme = d.theme.slice(0, 120);
      }
    } catch (_) {}
    const dk = w3GetDayKey(s.created_at);
    return `[${i}] ${dk} · ${s.title || '—'} · ton:${tone || '—'}${theme ? ' · ' + theme : ''}`;
  }).join('\n');

  const prompt = p('prompt.chapters.user', { lines });

  const raw = await callLLM({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    systemPrompt: p('prompt.chapters.system'),
    maxTokens: 1600, temperature: 0.5, jsonMode: true, model: SUMMARY_MODEL, skipPersona: true
  });

  let obj;
  try { obj = JSON.parse(raw); }
  catch { obj = w3ParseFallback(raw); }
  if (!obj || !Array.isArray(obj.chapters)) throw new Error('Bölüm formatı okunamadı');

  return obj;
}

/* Romen rakamı çevirici */
export function toRoman(n) {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let r = '';
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { r += syms[i]; n -= vals[i]; }
  }
  return r;
}

/* w3RenderChapters · w3ToggleChapter · w3RebuildJourney SÖKÜLDÜ (FAZ 8):
   üçü de `#w3-journey-chapters` / `#w3-ch-<n>` kabuğuna yazıyordu, o kabuk
   `_src.html`'de yok. Çizim artık tüketicinin işi (13A `#dc-hat`); bu dosya
   veriyi verir. `toRoman` KALDI — bölüm numarası hâlâ Roma rakamıdır. */

/* ─── Gece yarısı otomatik özet — v3 derin formatla ─── */
export async function w2CheckAndSummarizeYesterday() {
  try {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86400000);
    const yKey = w3GetDayKey(yesterday);

    // Otomatik kapanış cezası — gün manuel kapatılmadıysa bir kez −3 elmas
    // (idempotent guard'lı; lastCheck guard'ından bağımsız çalışsın diye önde).
    applyAutoClosurePenalty(yKey);

    const lastCheckKey = 'w2_lastdaysummary_check_' + S.currentUser?.id;
    const lastCheck = SafeStorage.getRaw(lastCheckKey);
    if (lastCheck === yKey) return;

    const map = await w2LoadSummariesCache();
    const existing = map.get(yKey);
    if (existing && existing.some(s => s.structured_summary)) {
      SafeStorage.setRaw(lastCheckKey, yKey);
      return;
    }

    const result = await w3GenerateDeepSummary(yKey);

    // Mühür yalnız KALICI sonuca vurulur: özet yazıldıysa ya da o günde
    // özetlenecek konuşma yoksa. Geçici hatada (db/parse/ağ) mühürlersek o gün
    // bir daha hiç denenmez ve kullanıcı boş listeyle kalır.
    if (result.ok || result.reason === 'insufficient') {
      SafeStorage.setRaw(lastCheckKey, yKey);
    } else {
      // ...ama sonsuz da denenmez: bu kontrol HER açılışta koşar ve her deneme
      // bir LLM turudur. Kalıcı bir hata (RLS/şema) kotayı sessizce yerdi.
      // Üç denemeden sonra gün mühürlenir; sebep konsolda zaten duruyor.
      const tryKey = 'w2_daysummary_try_' + S.currentUser?.id + '_' + yKey;
      const n = Number(SafeStorage.getRaw(tryKey) || 0) + 1;
      SafeStorage.setRaw(tryKey, String(n));
      if (n >= 3) SafeStorage.setRaw(lastCheckKey, yKey);
    }

    if (result.ok) {
      w2NotifyDaySummaryReady(yesterday, result.data.title);
      S._w2SummariesCache = null;
      await w2LoadSummariesCache();
    }
  } catch (e) {
    console.warn('v3 otomatik özet hatası:', e);
  }
}

/* ═══════════════════════════════════════
   ÖZELLİK 1 — GÜNLÜK AÇILIŞ KARTI
═══════════════════════════════════════ */
