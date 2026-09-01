/* ═══════════════════════════════════════════════════════════════════
   10w — WANDERER MODELLERİ · "Kişisel Dönüşüm dil modeli" motoru
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Wanderer artık bir dil modeli. Tıpkı Claude'daki Opus/Sonnet/Haiku
     gibi, Wanderer'ın da insan hayatının alanlarına odaklanan modelleri var:
       • Wanderer Öz   — Bireysel hayat
       • Wanderer Bağ  — İlişki hayatı
       • Wanderer Eser — İş hayatı

   ÖNEMLİ AYRIM:
     Bu eksen, koddaki mevcut AI_MODES (SOFT/DIRECT/DEPTH… — otomatik
     algılanan duygusal yanıt modu) ile KARIŞMAZ. Bu, kullanıcının elle
     seçtiği MODEL eksenidir.

   MİMARİ:
     • Seçili model SafeStorage'da kalıcı (global; varsayılan DB'deki
       is_default model, o da yoksa 'oz').
     • Her modelin TÜM içeriği Supabase 'wanderer_models' tablosundan
       yüklenir (migration 013): kimlik, sistem promptu, bilgi tabanı,
       karşılama, sohbet başlatıcıları, üretim parametreleri.
       Tablo henüz yoksa eski 'focus_models' (migration 010) promptlarına
       geri düşülür — uygulama kırılmaz.
     • Aktif modelin davranışı + bilgi tabanı buildContextPrompt içindeki
       <focus_model> bölümüne client tarafında enjekte edilir.
     • temperature / max_tokens parametreleri sohbet çağrısına uygulanır
       (06-summary-chat → fmActiveParams).
     • Bir sohbet içinde modelden modele geçilince chat_history'ye özel bir
       'system' satırı (mode='fmswitch:<id>') yazılır ve geçmişe bakan
       kullanıcıya tasarıma uygun bir AYRAÇ olarak gösterilir.
       Eski kayıtlardaki id'ler (individual/relationship/work/general)
       LEGACY_MAP ile yeni modellere eşlenir.
     • Admin panelindeki "Model Stüdyosu" sekmesi 3 modelin tamamını
       yönetir — Emre içerikleri kitaplarına göre doldurur.

   Konvansiyon: hardcoded TR string (model adları marka — çevrilmez).
   Stiller: css/parts/chat.css (.fm-*) + css/parts/llm-shell.css (.mst-*).
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { sb } from '../config.js';
import { SafeStorage, showToast, escapeHTML, localISODate } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { p } from './16-i18n-prompts.js';

const STORAGE_KEY = 'wanderer_focus_model';

/* Üç model. İçerik alanları runtime'da Supabase'den doldurulur;
   buradaki değerler tablo erişilemezse devreye giren yerel çekirdek kimlik. */
export const WANDERER_MODELS = [
  {
    id: 'oz', name: 'Wanderer Öz', version: 'Öz 1.0',
    tagline: '', glyph: '◆',
    desc: '',
    systemPrompt: '', knowledge: '', greeting: '',
    starters: [], params: {}, enabled: true, isDefault: true, sort: 0,
  },
  {
    id: 'bag', name: 'Wanderer Bağ', version: 'Bağ 1.0',
    tagline: '', glyph: '❖',
    desc: '',
    systemPrompt: '', knowledge: '', greeting: '',
    starters: [], params: {}, enabled: true, isDefault: false, sort: 1,
  },
  {
    id: 'eser', name: 'Wanderer Eser', version: 'Eser 1.0',
    tagline: '', glyph: '▲',
    desc: '',
    systemPrompt: '', knowledge: '', greeting: '',
    starters: [], params: {}, enabled: true, isDefault: false, sort: 2,
  },
];

/* Geri uyum — eski import adı (FOCUS_MODELS) hâlâ çalışsın */
export const FOCUS_MODELS = WANDERER_MODELS;

const _byId = Object.fromEntries(WANDERER_MODELS.map(m => [m.id, m]));

/* Model kimliği = DB içeriği (admin-yazımlı); aşağısı tablo yokken devreye giren
   yerel fallback — i18n sözlüğünden RENDER ANINDA okunur. Model ADI/sürümü MARKA
   (çevrilmez). desc fallback'ı eski Odak Modeli .hint anahtarlarıyla aynı → reuse. */
const _DESC_KEY = { oz: 'fm.individual.hint', bag: 'fm.relationship.hint', eser: 'fm.work.hint' };
export function fmTagline(m) { return (m && (m.tagline || '').trim()) || t('fm.tag.' + (m && m.id), ''); }
function _mDesc(m) { return (m && (m.desc || '').trim()) || (m && t(_DESC_KEY[m.id] || '', '')); }
function _defaultStarters(id) {
  return [t('fm.starter.' + id + '.0'), t('fm.starter.' + id + '.1'), t('fm.starter.' + id + '.2')];
}

/* Eski Odak Modeli id'leri → yeni Wanderer modelleri.
   SafeStorage'daki eski seçim ve geçmişteki fmswitch ayraçları için. */
const LEGACY_MAP = { individual: 'oz', relationship: 'bag', work: 'eser', general: 'oz' };

function _resolveId(id) {
  if (_byId[id]) return id;
  if (LEGACY_MAP[id] && _byId[LEGACY_MAP[id]]) return LEGACY_MAP[id];
  return null;
}

function _defaultId() {
  const def = WANDERER_MODELS.find(m => m.isDefault && m.enabled)
           || WANDERER_MODELS.find(m => m.enabled)
           || WANDERER_MODELS[0];
  return def.id;
}

/* ── Aktif model ── */
export function fmGetActiveId() {
  const resolved = _resolveId(S._activeFocusModel);
  // Free katmanı yalnız Öz'e erişir (plan v2 md.3) — Bağ/Eser Pro'dan itibaren açılır.
  if (resolved && _byId[resolved].enabled && (S.isPremium || resolved === 'oz')) return resolved;
  return _defaultId();
}
export function fmGetActive() { return _byId[fmGetActiveId()]; }

export function fmEnabledModels() {
  return WANDERER_MODELS.filter(m => m.enabled).sort((a, b) => a.sort - b.sort);
}

/* ── Supabase'den modelleri yükle ──
   Önce wanderer_models (migration 013); tablo yoksa focus_models (010)
   promptlarına geri düş — eski kurulum kırılmasın. */
export async function loadWandererModels() {
  try {
    const { data, error } = await sb
      .from('wanderer_models')
      .select('*')
      .order('sort_order', { ascending: true });
    if (!error && data && data.length) {
      data.forEach(row => {
        const m = _byId[row.model_id];
        if (!m) return;
        if (row.display_name)  m.name    = row.display_name;
        if (row.version_label) m.version = row.version_label;
        if (row.tagline)       m.tagline = row.tagline;
        if (row.description)   m.desc    = row.description;
        if (row.glyph)         m.glyph   = row.glyph;
        m.systemPrompt = row.system_prompt || '';
        m.knowledge    = row.knowledge || '';
        m.greeting     = row.greeting || '';
        m.starters     = Array.isArray(row.starters) ? row.starters.filter(s => typeof s === 'string' && s.trim()) : [];
        m.params       = (row.params && typeof row.params === 'object') ? row.params : {};
        m.enabled      = row.is_enabled !== false;
        m.isDefault    = row.is_default === true;
        m.sort         = Number.isFinite(row.sort_order) ? row.sort_order : m.sort;
      });
      S._wandererModelsSource = 'wanderer_models';
    } else {
      // Geri düşüş: eski tablo — sadece promptlar
      const { data: legacy, error: e2 } = await sb
        .from('focus_models')
        .select('model_id, prompt');
      if (e2) { console.warn('loadWandererModels:', (error || e2).message); return; }
      (legacy || []).forEach(row => {
        const nid = _resolveId(row.model_id);
        if (nid && row.model_id !== 'general') _byId[nid].systemPrompt = row.prompt || '';
      });
      S._wandererModelsSource = 'focus_models';
    }
  } catch (e) { console.warn('loadWandererModels:', e?.message); }
  finally {
    // Yükleme KARARA vardı — başarıyla da hatayla da. Ana ekranın kanıt kapısı
    // (10y `_kapiAcik`) bu bayrağa bakar: model verisi gelmeden şerit yerleşik
    // i18n başlatıcılarıyla çizilip sonra kişisel sorularla değişiyordu.
    // `finally` şart — legacy dalındaki erken `return` bu üç satırı atlıyordu,
    // yani wanderer_models tablosu yokken model pili hiç çizilmiyordu.
    S._fmYuklendi = true;
    fmRenderControls();
    window.llmRenderHome?.();   // 10y — selam + başlatıcılar model verisine göre tazelensin
  }
}

/* Geri uyum — eski ad */
export const loadFocusModelPrompts = loadWandererModels;

/* ── Prompt enjeksiyonu (01-prompts-modes → buildContextPrompt) ──
   Aktif modelin davranışı (system_prompt) + bilgi tabanı (knowledge)
   <focus_model> bölümüne girer. İkisi de boşsa '' (token israfı yok). */
export function buildFocusModelContext() {
  const m = fmGetActive();
  if (!m) return '';
  const sysP = (m.systemPrompt || '').trim();
  const know = (m.knowledge || '').trim();
  if (!sysP && !know) return '';
  let out = p('prompt.focus_model.directive', { name: m.name, tagline: fmTagline(m) });
  const gecis = _bugunkuGecisNotu(m);
  if (gecis) out += '\n' + gecis;
  if (sysP) out += `\n<model_davranisi>\n${sysP}\n</model_davranisi>`;
  if (know) out += `\n<model_bilgi_tabani>\n${know}\n</model_bilgi_tabani>`;
  return out;
}

/* Geçiş satırı role='system' olduğu için pencere seçimi (06 _pencereSec) onu
   eler: kullanıcı görüşmenin ortasında Öz'den Bağ'a geçtiğinde model bunu
   göremiyordu — oysa geçişin kendisi bir sinyaldir ("artık şunu konuşmak
   istiyorum"). Satırı taşımak yerine tek cümlelik notunu buraya iliştiriyoruz;
   yalnız BUGÜN ve yalnız hâlâ aktif olan modele geçilmişse. */
function _bugunkuGecisNotu(aktif) {
  try {
    /* "chatHistory hep bugündür" yalnız post-auth boot anında doğrudur:
       openSummarySession (06) geçmiş bir günü açtığında hem currentSessId'yi
       hem chatHistory'yi o güne çevirir. Kapısız hâlde iki hafta önceki bir
       geçiş "bu görüşmenin ortasında" diye modele olgu olarak giderdi. */
    if (S.currentSessId !== 'day_' + localISODate()) return '';
    const gecmis = Array.isArray(S.chatHistory) ? S.chatHistory : [];
    let son = null;
    for (let i = gecmis.length - 1; i >= 0; i--) {
      if (fmRenderHistoryRow(gecmis[i]?.mode)) { son = gecmis[i]; break; }
    }
    if (!son) return '';
    if (_resolveId(son.mode.slice('fmswitch:'.length)) !== aktif.id) return '';
    return p('prompt.focus_model.switch_note', { name: aktif.name });
  } catch (_) { return ''; }
}

/* ── Üretim parametreleri (06-summary-chat → ana sohbet çağrısı) ──
   Admin'in Model Stüdyosu'nda ayarladığı temperature / max_tokens.
   Ayarlanmadıysa alan undefined döner; çağıran kendi varsayılanını kullanır. */
export function fmActiveParams() {
  const p = fmGetActive()?.params || {};
  const out = {};
  const temp = Number(p.temperature);
  if (Number.isFinite(temp)) out.temperature = Math.min(1.5, Math.max(0, temp));
  const maxTok = parseInt(p.max_tokens, 10);
  if (Number.isFinite(maxTok) && maxTok > 0) out.max_tokens = Math.min(4000, Math.max(50, maxTok));
  return out;
}

/* ── Karşılama + sohbet başlatıcıları (10y ana ekran) ──
   Selam HER ZAMAN saate göre sabit kalır ("İyi akşamlar, Emre."); modelin
   Model Stüdyosu'nda yazdığı özel cümle selamın YERİNE değil, composer'ın
   placeholder'ına akar (bkz. fmInputPlaceholder). */
export function fmGreetingText(userName) {
  const name = (userName || '').trim() || t('fm.gezgin', 'Gezgin');
  const hour = new Date().getHours();
  let g = t('fm.greet.evening', 'İyi akşamlar');
  if (hour < 6) g = t('fm.greet.night', 'İyi geceler');
  else if (hour < 12) g = t('fm.greet.morning', 'İyi sabahlar');
  else if (hour < 18) g = t('fm.greet.day', 'İyi günler');
  return `${g}, ${name}.`;
}

/* Aktif modelin Model Stüdyosu'nda yazdığı özel cümle — ana ekran composer'ının
   placeholder'ında ("Wanderer'a yaz…" yerine) gösterilir. Boşsa varsayılan
   placeholder'a geri düşer. */
export function fmInputPlaceholder(userName) {
  const m = fmGetActive();
  const name = (userName || '').trim() || t('fm.gezgin', 'Gezgin');
  const custom = (m.greeting || '').trim();
  if (!custom) return t('fm.input.placeholder', "Wanderer'a yaz…");
  return custom.replace(/\{\{\s*name\s*\}\}/gi, name);
}

export function fmStarters() {
  const m = fmGetActive();
  if (m.starters && m.starters.length) return m.starters.slice(0, 4);
  return _defaultStarters(m.id);
}

/* ── Hidrasyon (03-auth-shell post-auth) ── */
export function fmInit() {
  const saved   = SafeStorage.get(STORAGE_KEY, '');
  const kayitli = _resolveId(saved);
  S._activeFocusModel = kayitli || _defaultId();

  /* Sessiz kayıp (İç Çalışma 08 rev.2 · K1): kayıtlı eksen Bağ/Eser ama
     katman Free — fmGetActiveId her okumada onu Öz'e çeviriyor ve kullanıcıya
     hiçbir şey söylenmiyor. Olay OTURUMDA BİR KEZ burada yazılır; okuma
     fonksiyonuna takılsaydı her render bir satır doğururdu.

     NEDEN ERTELENİYOR (denetim 2026-08-31): nabız 03-auth-shell'de EN SONDA
     açılır (`:1393`), fmInit ise `:1376`'da — ve iki modül de main.js'te
     STATİK import edildiği için `import()` anında çözülür, `.then` sırası
     çağrı sırasıdır. Senkron yazılsaydı wtLogModel'in `!_inited` guard'ına
     çarpar ve satır hiç doğmazdı: sessiz kaybın kaydı sessizce kaybolurdu
     (`saf-yesil-cagri-olu`). Makro görev bütün mikrotask turundan sonra
     koşar — nabız o an açıktır. Kapısı: tests/10w-dus-cagrisi.test.js */
  const etkin = fmGetActiveId();
  if (kayitli && etkin && kayitli !== etkin) {
    setTimeout(() => {
      window.wtLogModel?.('dus', { model: kayitli, oteki: etkin, prem: !!S.isPremium });
    }, 0);
  }

  fmRenderControls();
  loadWandererModels(); // arka planda; kontroller zaten render edildi
}

/* Kısa ad — marka öneki olmadan ("Wanderer Öz" → "Öz"). Composer pilinde
   kullanılır; tam ad zaten selam altındaki model satırında görünür. */
export function fmShortName(m) {
  const n = (m?.name || '').trim();
  return n.replace(/^wanderer\s+/i, '') || n;
}

/* ── Seçici kontrolleri ──
   Hem composer'daki model pili (cl-model-*) hem ritüel kartı ayağındaki
   düğme (ic-models-*) aynı kayıttan beslenir. */
export function fmRenderControls() {
  const m = fmGetActive();

  // Ritüel kartı ayağı (İç Card)
  const toggle = document.getElementById('ic-models-toggle');
  const glyph  = document.getElementById('ic-models-glyph');
  const label  = document.getElementById('ic-models-label');
  const desc   = document.getElementById('ic-model-desc');
  if (glyph) glyph.textContent = m.glyph;
  if (label) label.textContent = m.name;
  if (desc)  desc.textContent  = fmTagline(m);
  const ariaLbl = t('fm.aria.toggle', 'Model: {{label}} — değiştir').replace('{{label}}', m.name);
  if (toggle) {
    toggle.setAttribute('aria-pressed', 'true');
    toggle.setAttribute('aria-label', ariaLbl);
  }

  // Claude-tarzı composer pili (ön yüz) — kısa ad
  const clGlyph = document.getElementById('cl-model-glyph');
  const clName  = document.getElementById('cl-model-name');
  const clPill  = document.getElementById('cl-model-pill');
  if (clGlyph) clGlyph.textContent = m.glyph;
  if (clName)  clName.textContent  = fmShortName(m);
  if (clPill)  clPill.setAttribute('aria-label', ariaLbl);
}

/* ── Popover seçici — Claude Code'un model menüsü gibi küçük pencere ──
   Tetikleyen düğmenin üstüne demirlenir (her iki tetikleyici de ekranın
   altında yaşar); sığmazsa altına düşer. Backdrop'a dokunma / Esc kapatır. */
function _fmPopEsc(ev) {
  if (ev.key === 'Escape') { ev.stopPropagation(); fmClosePicker(); }
}

export function fmOpenPicker(e) {
  if (e) e.stopPropagation();
  const pop = document.getElementById('fm-pop');
  if (!pop) return;
  const list = document.getElementById('fm-pop-list');
  const activeId = fmGetActiveId();
  if (list) {
    list.innerHTML = fmEnabledModels().map(m => {
      const sel = m.id === activeId;
      const locked = m.id !== 'oz' && !S.isPremium;
      return `
        <button class="fm-pop-row${sel ? ' fm-pop-row--active' : ''}${locked ? ' fm-pop-row--locked' : ''}" onclick="fmSelectModel('${m.id}')" role="option" aria-selected="${sel}">
          <span class="fm-pop-glyph" aria-hidden="true">${escapeHTML(m.glyph)}</span>
          <span class="fm-pop-text">
            <span class="fm-pop-name">${escapeHTML(fmShortName(m))}</span>
            <span class="fm-pop-tag">${escapeHTML(fmTagline(m))}</span>
          </span>
          <span class="fm-pop-check" aria-hidden="true">${locked ? '🔒' : (sel ? '✓' : '')}</span>
        </button>`;
    }).join('');
  }

  // Konumla: panel görünmezken ölçülebilir (opacity 0, display'i hep var)
  const panel = pop.querySelector('.fm-pop-panel');
  const anchor = (e?.currentTarget instanceof Element && e.currentTarget) ||
    (e?.target instanceof Element ? e.target.closest('button') : null);
  if (panel) {
    const pw = panel.offsetWidth, ph = panel.offsetHeight;
    let left, top, origin = 'bottom left';
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      left = Math.max(10, Math.min(r.left, window.innerWidth - pw - 10));
      top = r.top - ph - 10;
      if (top < 10) { top = Math.min(r.bottom + 10, window.innerHeight - ph - 10); origin = 'top left'; }
    } else {
      left = Math.max(10, (window.innerWidth - pw) / 2);
      top = Math.max(10, (window.innerHeight - ph) / 2);
      origin = 'center';
    }
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.transformOrigin = origin;
  }

  pop.classList.add('open');
  pop.setAttribute('aria-hidden', 'false');
  document.addEventListener('keydown', _fmPopEsc);
}

export function fmClosePicker() {
  const pop = document.getElementById('fm-pop');
  if (!pop) return;
  pop.classList.remove('open');
  pop.setAttribute('aria-hidden', 'true');
  document.removeEventListener('keydown', _fmPopEsc);
}

export function fmSelectModel(id) {
  const rid = _resolveId(id);
  if (!rid) return;
  const prev = fmGetActiveId();
  fmClosePicker();
  if (rid === prev) return;

  // Free katmanı yalnız Öz — Bağ/Eser seçimi Pro/Max kapısına yönlendirir.
  if (rid !== 'oz' && !S.isPremium) {
    /* Kapıya çarpan eksen Pro'nun GERÇEK talebidir: hangi sesin arkasında
       kaç gezgin bekliyor (İç Çalışma 08 rev.2 · K1). switchView'dan ÖNCE
       yazılır — ekran değişimi olayın kaydını beklemesin. */
    window.wtLogModel?.('kilit', { model: rid, oteki: prev, prem: false });
    try { window.switchView?.('sub'); } catch (_) {}
    showToast(t('fm.locked_pro', '{{label}} — Pro\'dan itibaren açılır').replace('{{label}}', _byId[rid].name), true);
    return;
  }

  S._activeFocusModel = rid;
  SafeStorage.set(STORAGE_KEY, rid);
  /* Niyet: kullanıcı eksenini eliyle değiştirdi (İç Çalışma 08 rev.2 · K1). */
  window.wtLogModel?.('sec', { model: rid, oteki: prev, prem: !!S.isPremium });
  fmRenderControls();
  window.llmRenderHome?.();

  // Aktif sohbette en az bir mesaj varsa geçişi işaretle (geçmişe görünsün)
  const hasConversation = Array.isArray(S.chatHistory) &&
    S.chatHistory.some(m => m.role === 'user' || m.role === 'assistant');
  if (hasConversation) fmInsertSwitchMarker(rid);

  try { if (window.fxHaptic) window.fxHaptic('light'); else navigator.vibrate?.(8); } catch (_) {}
  showToast(t('fm.switched', '{{label}} modeline geçildi').replace('{{label}}', _byId[rid].name));
}

/* ── Sohbet içi geçiş ayracı ── */

// Canlı: chat_history + state'e kalıcı satır ekler ve ayracı çizer.
export function fmInsertSwitchMarker(id) {
  const m = _byId[_resolveId(id)];
  if (!m) return;
  const ts = new Date().toISOString();
  const row = { role: 'system', content: m.name, mode: 'fmswitch:' + m.id };

  if (Array.isArray(S.chatHistory)) S.chatHistory.push(row);
  const sid = S.currentSessId;
  if (sid) {
    if (!S.allSessions[sid]) S.allSessions[sid] = [];
    S.allSessions[sid].push({ ...row, created_at: ts });
  }

  fmRenderSwitchDivider(m.id, ts);

  if (S.currentUser?.id && sid) {
    sb.from('chat_history')
      .insert([{ user_id: S.currentUser.id, session_id: sid, role: 'system', content: m.name, mode: 'fmswitch:' + m.id }])
      .then(({ error }) => { if (error) console.warn('fmswitch DB:', error.message); });
  }
}

// Görsel ayraç elemanını üretir (DOM'a EKLEMEZ — yalnız döndürür).
// VirtualScroller gibi "eleman bekleyen" render yolları bunu çağırır.
// Eski kayıtlardaki id'ler (fmswitch:individual vb.) LEGACY_MAP ile eşlenir.
export function fmBuildSwitchDivider(id) {
  const m = _byId[_resolveId(id)] || _byId[_defaultId()];
  const switchedText = t('fm.switched', '{{label}} modeline geçildi').replace('{{label}}', m.name);
  const div = document.createElement('div');
  div.className = 'fm-switch-divider';
  div.setAttribute('role', 'separator');
  div.setAttribute('aria-label', switchedText);
  div.innerHTML = `
    <span class="fm-switch-line" aria-hidden="true"></span>
    <span class="fm-switch-body">
      <span class="fm-switch-glyph" aria-hidden="true">${escapeHTML(m.glyph)}</span>
      <span class="fm-switch-text">${escapeHTML(switchedText)}</span>
    </span>
    <span class="fm-switch-line" aria-hidden="true"></span>`;
  return div;
}

// Görsel ayraç — #messages-area'ya ekler ve elemanı döndürür.
// Render yolları (06 openSummarySession, 04 renderHistory, 11 infinite chat) çağırır.
export function fmRenderSwitchDivider(id, _timestamp) {
  const area = document.getElementById('messages-area');
  if (!area) return null;
  const div = fmBuildSwitchDivider(id);
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
  return div;
}

/* Render yolları için ortak yardımcı: bir geçmiş satırı, geçiş ayracı mı
   yoksa normal mesaj mı? Geçişse ayraç çiz, değilse appendFn ile mesaj bas. */
export function fmRenderHistoryRow(rowMode) {
  return typeof rowMode === 'string' && rowMode.startsWith('fmswitch:');
}

/* ═══ ADMIN — "MODEL STÜDYOSU" sekmesi ═══
   Üç modelin tamamı buradan yönetilir. Her model bir stüdyo kartı:
   kimlik → davranış (sistem promptu) → bilgi tabanı → karşılama →
   başlatıcılar → üretim parametreleri → durum. */

function _mstField(label, hintHtml, inputHtml) {
  return `
    <div class="mst-field">
      <div class="mst-field-label">${label}</div>
      ${hintHtml ? `<div class="mst-field-hint">${hintHtml}</div>` : ''}
      ${inputHtml}
    </div>`;
}

export async function renderFocusModelsAdmin() {
  const host = document.getElementById('focus-models-list');
  if (!host) return;
  host.innerHTML = `<div style="color:var(--text-dim);font-size:13px;">${t('wg.admin.loading', 'Yükleniyor…')}</div>`;

  // En güncel hâli DB'den çek (registry'yi de tazeler)
  await loadWandererModels();

  const missing = S._wandererModelsSource !== 'wanderer_models';
  const warn = missing
    ? `<div class="mst-warn">⚠ ${t('fm.mst.no_table_warn', "<strong>wanderer_models</strong> tablosu bulunamadı — <code>migrations/000_wanderer_schema.sql</code> Supabase'e uygulanmalı. Şimdilik eski Odak Modelleri promptları gösteriliyor; kaydetme tablo kurulunca çalışır.")}</div>`
    : '';

  host.innerHTML = warn + WANDERER_MODELS.map(m => {
    const startersTxt = (m.starters || []).join('\n');
    const temp   = Number.isFinite(Number(m.params?.temperature)) ? m.params.temperature : '';
    const maxTok = Number.isFinite(parseInt(m.params?.max_tokens, 10)) ? m.params.max_tokens : '';
    return `
      <div class="mst-card" id="mst-card-${m.id}">
        <div class="mst-head" onclick="document.getElementById('mst-card-${m.id}').classList.toggle('open')">
          <span class="mst-head-glyph">${escapeHTML(m.glyph)}</span>
          <span class="mst-head-name">${escapeHTML(m.name)}</span>
          <span class="mst-head-version">${escapeHTML(m.version)}</span>
          <span class="mst-head-tagline">${escapeHTML(fmTagline(m))}</span>
          <span class="mst-head-caret" aria-hidden="true">▾</span>
        </div>
        <div class="mst-body">

          <div class="mst-section-title">${t('fm.mst.identity', 'Kimlik')}</div>
          <div class="mst-grid">
            ${_mstField(t('fm.mst.name', 'Görünen Ad'), '', `<input class="field-input" id="mst-name-${m.id}" type="text" value="${escapeHTML(m.name)}">`)}
            ${_mstField(t('fm.mst.version', 'Sürüm Etiketi'), '', `<input class="field-input" id="mst-version-${m.id}" type="text" value="${escapeHTML(m.version)}">`)}
            ${_mstField(t('fm.mst.axis', 'Eksen (kısa)'), '', `<input class="field-input" id="mst-tagline-${m.id}" type="text" value="${escapeHTML(m.tagline)}">`)}
            ${_mstField(t('fm.mst.glyph', 'Sembol'), '', `<input class="field-input" id="mst-glyph-${m.id}" type="text" maxlength="2" value="${escapeHTML(m.glyph)}">`)}
          </div>
          ${_mstField(t('fm.mst.desc', 'Açıklama'), t('fm.mst.desc_hint', 'Model seçicide görünen tek cümlelik tanım.'),
            `<input class="field-input" id="mst-desc-${m.id}" type="text" value="${escapeHTML(m.desc)}">`)}

          <div class="mst-section-title">${t('fm.mst.behavior', 'Davranış — Sistem Promptu')}</div>
          ${_mstField('', t('fm.mst.behavior_hint', 'Bu model seçiliyken Emre nasıl davransın? Hangi eksene, hangi tonla odaklansın? <span class="mst-gold">Buraya değil:</span> Emre\'nin temel kimliği &amp; sesi — o "Kişilik" sekmesine aittir.'),
            `<textarea class="field-textarea" id="mst-system-${m.id}" rows="8" placeholder="${escapeHTML(t('fm.mst.system_ph', 'Bu modelde Emre {axis} eksenine odaklanır…').replace('{axis}', fmTagline(m).toLowerCase()))}">${escapeHTML(m.systemPrompt)}</textarea>`)}

          <div class="mst-section-title">${t('fm.mst.knowledge', 'Bilgi Tabanı')}</div>
          ${_mstField('', t('fm.mst.knowledge_hint', 'Bu modelin <em>ne bildiğini</em> tanımla: kitaplarından bu eksene ait kavramlar, çerçeveler, alıntılar. Yanıt üretilirken modele eklenir.'),
            `<textarea class="field-textarea" id="mst-knowledge-${m.id}" rows="8" placeholder="${escapeHTML(t('fm.mst.knowledge_ph', 'Kitaplarından bu eksene ait içerik…'))}">${escapeHTML(m.knowledge)}</textarea>`)}

          <div class="mst-section-title">${t('fm.mst.greeting_section', 'Karşılama & Başlatıcılar')}</div>
          ${_mstField(t('fm.mst.greeting_label', 'Yazı Kutusu Cümlesi'), t('fm.mst.greeting_hint', 'Ana ekranın yazı kutusunda ("Wanderer\'a yaz…" placeholder\'ının yerinde) görünen model cümlesi. <code>{{name}}</code> kullanıcının adıyla değişir. Boşsa varsayılan placeholder kullanılır.'),
            `<input class="field-input" id="mst-greeting-${m.id}" type="text" value="${escapeHTML(m.greeting)}" placeholder="${escapeHTML(t('fm.mst.greeting_ph', 'Örn. Yine buluştuk, {{name}}. Nereden başlayalım?'))}">`)}
          ${_mstField(t('fm.mst.starters_label', 'Sohbet Başlatıcıları'), t('fm.mst.starters_hint', 'Her satır bir öneri çipi (en fazla 4 gösterilir). Boşsa yerleşik öneriler kullanılır.'),
            `<textarea class="field-textarea" id="mst-starters-${m.id}" rows="4" placeholder="${escapeHTML(t('fm.starter.oz.0', 'Bugün kendimde neyle yüzleşmem gerekiyor?'))}">${escapeHTML(startersTxt)}</textarea>`)}

          <div class="mst-section-title">${t('fm.mst.params', 'Üretim Parametreleri')}</div>
          <div class="mst-grid">
            ${_mstField('Temperature', t('fm.mst.temp_hint', 'Boş = moda göre otomatik (0.65–0.85).'),
              `<input class="field-input" id="mst-temp-${m.id}" type="number" min="0" max="1.5" step="0.05" value="${temp}" placeholder="${escapeHTML(t('fm.mst.auto', 'otomatik'))}">`)}
            ${_mstField('Max Token', t('fm.mst.maxtok_hint', 'Boş = bağlama göre otomatik.'),
              `<input class="field-input" id="mst-maxtok-${m.id}" type="number" min="50" max="4000" step="50" value="${maxTok}" placeholder="${escapeHTML(t('fm.mst.auto', 'otomatik'))}">`)}
          </div>

          <div class="mst-section-title">${t('fm.mst.status', 'Durum')}</div>
          <div class="mst-status-row">
            <label class="mst-check"><input type="checkbox" id="mst-enabled-${m.id}" ${m.enabled ? 'checked' : ''}> ${t('fm.mst.enabled', 'Aktif (seçicide görünür)')}</label>
            <label class="mst-check"><input type="radio" name="mst-default" id="mst-default-${m.id}" ${m.isDefault ? 'checked' : ''}> ${t('fm.mst.default', 'Varsayılan model')}</label>
          </div>

        </div>
      </div>`;
  }).join('');

  // İlk kart açık gelsin
  document.getElementById('mst-card-oz')?.classList.add('open');
}

export async function saveFocusModels(btn) {
  if (btn) btn.disabled = true;
  const _v = (id) => (document.getElementById(id)?.value || '').trim();

  const rows = WANDERER_MODELS.map((m, i) => {
    const starters = _v(`mst-starters-${m.id}`)
      .split('\n').map(s => s.trim()).filter(Boolean);
    const params = {};
    const temp = parseFloat(_v(`mst-temp-${m.id}`));
    if (Number.isFinite(temp)) params.temperature = Math.min(1.5, Math.max(0, temp));
    const maxTok = parseInt(_v(`mst-maxtok-${m.id}`), 10);
    if (Number.isFinite(maxTok)) params.max_tokens = Math.min(4000, Math.max(50, maxTok));

    return {
      model_id:      m.id,
      display_name:  _v(`mst-name-${m.id}`)    || m.name,
      version_label: _v(`mst-version-${m.id}`) || m.version,
      tagline:       _v(`mst-tagline-${m.id}`) || m.tagline,
      description:   _v(`mst-desc-${m.id}`)    || m.desc,
      glyph:         _v(`mst-glyph-${m.id}`)   || m.glyph,
      system_prompt: _v(`mst-system-${m.id}`),
      knowledge:     _v(`mst-knowledge-${m.id}`),
      greeting:      _v(`mst-greeting-${m.id}`),
      starters,
      params,
      is_enabled:    document.getElementById(`mst-enabled-${m.id}`)?.checked !== false,
      is_default:    document.getElementById(`mst-default-${m.id}`)?.checked === true,
      sort_order:    i,
      updated_at:    new Date().toISOString(),
    };
  });

  // En az bir model aktif ve bir varsayılan olsun
  if (!rows.some(r => r.is_enabled)) rows[0].is_enabled = true;
  if (!rows.some(r => r.is_default && r.is_enabled)) {
    const first = rows.find(r => r.is_enabled);
    if (first) first.is_default = true;
  }

  try {
    const { error } = await sb.from('wanderer_models').upsert(rows, { onConflict: 'model_id' });
    if (error) {
      if (/relation .*wanderer_models.* does not exist|could not find the table/i.test(error.message)) {
        showToast(t('fm.mst.no_table', 'wanderer_models tablosu yok — migrations/000_wanderer_schema.sql çalıştırılmalı.'), true);
      } else {
        showToast(t('mk.admin.save_failed', 'Kaydedilemedi') + ': ' + error.message, true);
      }
      if (btn) btn.disabled = false;
      return;
    }
    // Yerel registry'yi de güncelle (anında aktif olsun)
    rows.forEach(r => {
      const m = _byId[r.model_id];
      if (!m) return;
      m.name = r.display_name; m.version = r.version_label;
      m.tagline = r.tagline;   m.desc = r.description;
      m.glyph = r.glyph;       m.systemPrompt = r.system_prompt;
      m.knowledge = r.knowledge; m.greeting = r.greeting;
      m.starters = r.starters; m.params = r.params;
      m.enabled = r.is_enabled; m.isDefault = r.is_default; m.sort = r.sort_order;
    });
    S._wandererModelsSource = 'wanderer_models';
    fmRenderControls();
    window.llmRenderHome?.();
    showToast(t('fm.mst.saved', 'Model Stüdyosu kaydedildi.'));
  } catch (e) {
    showToast(t('mk.admin.save_failed', 'Kaydedilemedi') + ': ' + (e?.message || e), true);
  } finally {
    if (btn) btn.disabled = false;
  }
}
