import { S } from '../state.js';
import { sb, SUPABASE_URL, SUPABASE_ANON, EDGE_FN_BASE, IS_ADMIN_PAGE, EMRE_IMG } from '../config.js';
import { SafeStorage, EventBus, ErrorBoundary, showToast, escapeHTML } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { p } from './16-i18n-prompts.js';
import { nowTR } from './00-config-tracking.js';
import { mountGdprUI } from './gdpr.js';
import { mountHukukUI } from './13p-hukuk.js';
import { msgRawText } from './06-summary-chat.js';
import { ensureExt } from './00-ext-loader.js';
import { renderFeatureVideosAdmin } from './10o-w2-feature-gate.js';
import { showDailyThought } from './10d-w2-quickask.js';

import { getContextualNotificationBody } from './09-reports-tracks.js';
import { autoResize } from './08-trends-payment.js';

export async function loadSettings() {
  return ErrorBoundary.run('loadSettings', async () => {
  // GDPR butonları: settings ekranına dinamik mount (idempotent)
  try { mountGdprUI(); } catch (_) {}
  // Hukuki Çerçeve (13p): Koşullar/Gizlilik/Fikri Mülkiyet — GDPR bölümünün altına
  try { mountHukukUI(); } catch (_) {}
  // Bildirimler (10x) — toggle + durum metnini güncel izin durumuna göre tazele
  try { window.bildirimRenderSettings?.(); } catch (_) {}
  // 1. Public ayarlar (herkese açık view) — API key içermez
  const { data: publicData, error: publicErr } = await sb
    .from('public_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (publicErr) {
    console.warn('public_settings yüklenemedi:', publicErr.message);
  }

  if (publicData) {
    S.settings = { ...S.settings, ...publicData };
    const ppd = document.getElementById('premium-price-display');
    if (ppd) ppd.innerHTML = `₺${S.settings.monthly_price}<sub>/ay</sub>`;
  }

  // 2. Admin ise: admin_settings'ten ek bilgi (key durumu için placeholder)
  if (S.isAdmin) {
    let adminData = null;
    // Önce calendly_url'i de içeren select'i dene; sütun yoksa fallback select
    const first = await sb
      .from('admin_settings')
      .select('gemini_api_key, together_api_key, system_prompt, calendly_url, community_url')
      .eq('id', 1)
      .single();
    if (first.error && /column.*calendly_url/i.test(first.error.message || '')) {
      const fallback = await sb
        .from('admin_settings')
        .select('gemini_api_key, together_api_key, system_prompt')
        .eq('id', 1)
        .single();
      adminData = fallback.data || null;
    } else {
      adminData = first.data || null;
    }

    if (adminData) {
      // Key'ler için placeholder — gerçek değer UI'ya basılmaz
      const apiEl = document.getElementById('u-api-key');
      if (apiEl && adminData.gemini_api_key) apiEl.placeholder = '●●●●●● (kayıtlı)';

      const tkEl = document.getElementById('u-together-key');
      if (tkEl && adminData.together_api_key) tkEl.placeholder = '●●●●●● (kayıtlı)';

      // system_prompt admin sayfasında düzenlenebilsin diye burada yüklenir
      if (adminData.system_prompt) S.settings.system_prompt = adminData.system_prompt;

      // Calendly URL — admin UI'da göstermek + normal kullanıcıya public_settings üzerinden
      // gelmiyorsa bile admin tarafında taze tutmak için
      if (adminData.calendly_url !== undefined) S.settings.calendly_url = adminData.calendly_url;
      if (adminData.community_url !== undefined) {
        S.settings.community_url = adminData.community_url;
      }
    }
  }

  // Kişilik form alanları (admin için)
  const map = { 'p-name': 'persona_name', 'p-welcome': 'welcome_message' };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id); if (el) el.value = S.settings[key] || '';
  });

  // "Merhaba, Emre" — 15 bölümlük kimlik anayasası (system_prompt yerine)
  renderMerhabaEmre();

  const sm = document.getElementById('s-monthly');
  const sl = document.getElementById('s-limit');
  const sc = document.getElementById('s-calendly');
  const scom = document.getElementById('s-community');
  if (sm) sm.value = S.settings.monthly_price    || 299;
  if (sl) sl.value = S.settings.free_message_limit || 5;
  if (sc) sc.value = S.settings.calendly_url || '';
  if (scom) scom.value = S.settings.community_url || '';

  // Kota motoru limitleri (migration 018 — quota_settings tek satır).
  // Tablo yoksa alanlar placeholder ile kalır; kaydetme de sessizce atlanır.
  const k5 = document.getElementById('s-kota-5h');
  const kw = document.getElementById('s-kota-week');
  const ku = document.getElementById('s-kota-ultra');
  if (S.isAdmin && (k5 || kw || ku)) {
    // ultra_bonus migration 019 ile gelir — kolon yoksa select tamamen düşer;
    // 018 alanlarıyla yeniden dene ki 5s/hafta limitleri görünmeye devam etsin
    let { data: kq, error: kqErr } = await sb
      .from('quota_settings').select('five_hour_limit, weekly_limit, ultra_bonus').eq('id', 1).maybeSingle();
    if (kqErr) {
      if (ku) ku.placeholder = 'migration 019 gerekli';
      ({ data: kq, error: kqErr } = await sb
        .from('quota_settings').select('five_hour_limit, weekly_limit').eq('id', 1).maybeSingle());
    }
    if (!kqErr && kq) {
      if (k5) k5.value = kq.five_hour_limit;
      if (kw) kw.value = kq.weekly_limit;
      if (ku && kq.ultra_bonus != null) ku.value = kq.ultra_bonus;
    } else {
      if (k5) k5.placeholder = 'migration 018 gerekli';
      if (kw) kw.placeholder = 'migration 018 gerekli';
    }
  }

  // ── Hesap köprüsü (047 — K2/K3/K4/K9) ──
  // Adres ve kullanıcı adı zaten S'te (03-auth-shell hidrasyonu SIRASINDA
  // yazıldı) — burada yalnız BASILIR, ikinci bir sorgu açılmaz. Bülten
  // durumu da S.bultenIzin'den okunur; bu alan profiles.bulten_izin'in
  // (GENERATED) birebir kopyasıdır — client onu ASLA kendi hesaplamaz (§6.10).
  const acctEmailEl  = document.getElementById('acct-email');
  const acctUserEl   = document.getElementById('acct-username');
  const acctBultenEl = document.getElementById('acct-bulten-toggle');
  const acctSekmeEl  = document.getElementById('acct-sekme-uyari');
  if (acctEmailEl) acctEmailEl.textContent = S.currentUser?.email || '—';
  if (acctUserEl)  acctUserEl.textContent  = S.username || '—';
  if (acctBultenEl) acctBultenEl.checked = S.bultenIzin === true;
  // Sekme damgası S'te tutulmaz (yalnız bu ekranın ihtiyacı) — satırdan TAZE
  // okunur: eposta-sekme webhook'u girişten SONRA da yazabilir, S girişte
  // dondu (K9 — Sekme Kalkanı). Kolon yoksa (047 uygulanmadıysa) sessizce
  // gizli kalır; bu bir hata DEĞİL, göstergesizliktir.
  if (acctSekmeEl && S.currentUser?.id) {
    try {
      const { data: sekmeRow } = await sb
        .from('profiles').select('email_sekme_at').eq('id', S.currentUser.id).maybeSingle();
      acctSekmeEl.hidden = !(sekmeRow && sekmeRow.email_sekme_at);
    } catch (_) { acctSekmeEl.hidden = true; }
  }
  }); // ErrorBoundary.run end
}

/* ─── Hesap köprüsü: bülten anahtarı (047 §1.2 — anıyı client basmaz) ─────
   İstemci yalnız YÖNÜ yazar: null = geri dönüş, dolu damga = çıkış. Anı ve
   kaynağı bulten_rizasi_muhru() trigger'ı sunucuda basar — istemcinin saati
   kanıt değildir (§6.10). Ekrana yansıyan durum sunucunun döndürdüğü
   `bulten_izin` (GENERATED) alanıdır, checked argümanının kendisi değil. */
export async function acctBultenToggle(checked) {
  const toggle = document.getElementById('acct-bulten-toggle');
  if (!S.currentUser?.id) { if (toggle) toggle.checked = !checked; return; }
  const { data, error } = await sb
    .from('profiles')
    .update({ bulten_cikis_at: checked ? null : new Date().toISOString() })
    .eq('id', S.currentUser.id)
    .select('bulten_izin')
    .maybeSingle();
  if (error) {
    // Sahte başarı yok (§6.2): migration 047 uygulanmadıysa kolon yoktur ve
    // bu gerçekten kırmızı döner — anahtar eski hâline döner, hata gösterilir.
    if (toggle) toggle.checked = !checked;
    showToast(`${t('toast.error', 'Hata: ')}${error.message}`, true);
    return;
  }
  S.bultenIzin = data?.bulten_izin === true;
  if (toggle) toggle.checked = S.bultenIzin;
}

/* ═══ MERHABA, EMRE — Kimlik ve Davranış Anayasası (15 bölüm) ═══
   FELSEFE: Serbest "System Prompt" alanı emekli edildi. Emre'nin nasıl
   davranacağı artık kitaplarından (Wanderer İlişki Felsefesi + Zihniyet
   Devrimi'ne Çağrı) damıtılmış 15 bölümlük bir anayasada yaşar. Bölümler
   yayında tek belgeye birleştirilip admin_settings.system_prompt'a yazılır —
   sunucudaki llm-chat persona katmanı hiçbir değişiklik gerektirmez. */

/* İçerik (15 bölüm) bundle diyeti için sidecar'a taşındı — 07b-merhaba-emre-sections.js
   → ext-merhaba-emre.js. Yalnız admin paneli açıldığında ensureExt('merhaba-emre') ile
   çekilir; normal kullanıcı bu ~5KB'ı asla ana bundle'da taşımaz. */
let _meSections = [];
let _meP = null;
function _meEnsureSections() {
  if (_meSections.length) return Promise.resolve(true);
  if (_meP) return _meP;
  _meP = ensureExt('merhaba-emre').then(ns => {
    if (!Array.isArray(ns?.ME_SECTIONS) || !ns.ME_SECTIONS.length) throw new Error('merhaba-emre namespace boş');
    _meSections = ns.ME_SECTIONS;
    return true;
  }).catch(e => {
    _meP = null; // geçici ağ hatası kalıcı olmasın
    console.error('merhaba-emre sidecar yüklenemedi:', e);
    return false;
  });
  return _meP;
}

const ME_DOC_TITLE = '# MERHABA, EMRE — Kimlik ve Davranış Anayasası';

/* Kayıtlı belgeyi bölümlere ayır. Başlık deseni bulunmayan eski serbest
   prompt'ta null döner — UI o durumda kitap-temelli varsayılanları gösterir. */
function _meParseDoc(doc) {
  if (!doc || !/^## \d{1,2}\./m.test(doc)) return null;
  const out = {};
  const re = /^## (\d{1,2})\.[^\n]*\n?/gm;
  const hits = [];
  let m;
  while ((m = re.exec(doc))) hits.push({ no: +m[1], start: m.index, bodyStart: re.lastIndex });
  hits.forEach((h, i) => {
    const end = i + 1 < hits.length ? hits[i + 1].start : doc.length;
    out[h.no] = doc.slice(h.bodyStart, end).trim();
  });
  return out;
}

/* 15 bölümü tek yayın belgesine birleştir — admin_settings.system_prompt'a
   yazılan metin budur; boş bırakılan bölüm belgeye girmez. */
export function meAssembleDoc() {
  const parts = [];
  // Kaydet butonu yalnız render tamamlandıktan (_meSections dolduktan) sonra
  // tıklanabilir olur — panel her zaman önce renderMerhabaEmre'den geçer.
  _meSections.forEach((s, i) => {
    const val = (document.getElementById(`me-text-${i}`)?.value || '').trim();
    if (val) parts.push(`## ${i + 1}. ${s.tr} (${s.en})\n${val}`);
  });
  return `${ME_DOC_TITLE}\n\n${parts.join('\n\n')}`;
}

export function meToggle(i) { document.getElementById(`me-sec-${i}`)?.classList.toggle('open'); }

export async function renderMerhabaEmre() {
  const host = document.getElementById('merhaba-emre-host');
  if (!host) return;
  host.innerHTML = `<div class="kb-loading">${t('me.loading', 'Yükleniyor…')}</div>`;
  const ok = await _meEnsureSections();
  if (!ok || !host.isConnected) return; // panel kapandıysa eski host'a yazma
  const saved = _meParseDoc(S.settings.system_prompt);
  host.innerHTML = _meSections.map((s, i) => {
    const val = saved ? (saved[i + 1] || '') : s.def;
    return `
    <div class="kb-item" id="me-sec-${i}">
      <div class="kb-header" onclick="meToggle(${i})">
        <div class="kb-item-title">${i + 1}. ${escapeHTML(s.tr)} <span style="color:var(--text-dim);font-size:10px;">· ${escapeHTML(s.en)}</span></div>
        <div class="kb-chevron">▼</div>
      </div>
      <div class="kb-body">
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:8px;line-height:1.5;">${escapeHTML(s.d)}</div>
        <textarea class="field-textarea" id="me-text-${i}" rows="9" style="font-size:12px;line-height:1.6;">${escapeHTML(val)}</textarea>
      </div>
    </div>`;
  }).join('');
}

export async function savePersona() {
  const upd = {
    persona_name:    document.getElementById('p-name').value,
    welcome_message: document.getElementById('p-welcome').value,
    system_prompt:   meAssembleDoc()
  };

  const { error } = await sb.from('admin_settings').update(upd).eq('id', 1);
  if (error) {
    showToast(t('toast.save_error') + error.message, true);
    return;
  }

  S.settings = { ...S.settings, ...upd };

  // Edge Function'daki persona cache'ini invalidate et
  // Cache 10 dakikalık — bu çağrı olmazsa yeni persona en geç 10dk sonra aktif olur
  try {
    const { data: sess } = await sb.auth.getSession();
    const token = sess?.session?.access_token;
    if (token) {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/llm-chat`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey':        SUPABASE_ANON,
        },
        body: JSON.stringify({ action: 'invalidate_persona' }),
      });
      if (!res.ok) {
        console.warn('Persona cache invalidate başarısız (kritik değil):', res.status);
      } else {
        console.info('Persona cache invalidate edildi — yeni persona anında aktif.');
      }
    }
  } catch (e) {
    console.warn('Persona cache invalidate isteği hata:', e.message);
  }

  showToast(t('toast.saved'));
}

export async function saveSettings() {
  const calendlyRaw = (document.getElementById('s-calendly')?.value || '').trim();
  if (calendlyRaw && !/calendly\.com/i.test(calendlyRaw)) {
    showToast(t('toast.calendly_invalid', 'Calendly linki calendly.com içermeli.'), true);
    return;
  }
  const communityRaw = (document.getElementById('s-community')?.value || '').trim();
  const upd = {
    monthly_price:      parseInt(document.getElementById('s-monthly').value),
    free_message_limit: parseInt(document.getElementById('s-limit').value),
    calendly_url:       calendlyRaw || null,
    community_url:      communityRaw || null
  };
  const { error } = await sb.from('admin_settings').update(upd).eq('id', 1);
  if (error) {
    if (/column.*(calendly_url|community_url)/i.test(error.message)) {
      const { error: e2 } = await sb.from('admin_settings').update({
        monthly_price: upd.monthly_price, free_message_limit: upd.free_message_limit
      }).eq('id', 1);
      if (e2) { showToast(t('toast.cannot_save') + e2.message, true); return; }
      S.settings = { ...S.settings, monthly_price: upd.monthly_price, free_message_limit: upd.free_message_limit };
      showToast(t('toast.partial_save', 'Fiyat/limit kaydedildi. Eksik sütunlar admin_settings tablosuna eklenmeli.'), true);
      return;
    }
    showToast(t('toast.cannot_save') + error.message, true);
    return;
  }
  S.settings = { ...S.settings, ...upd };

  // Kota motoru limitleri — quota_settings (migration 018; ultra armağanı 019).
  // Tablo yoksa (RLS/404 hatası) sessizce atla; ana ayarlar zaten kaydedildi.
  const k5 = parseInt(document.getElementById('s-kota-5h')?.value, 10);
  const kw = parseInt(document.getElementById('s-kota-week')?.value, 10);
  const ku = parseInt(document.getElementById('s-kota-ultra')?.value, 10);
  if (Number.isFinite(k5) && Number.isFinite(kw) && k5 > 0 && kw > 0) {
    const kupd = { five_hour_limit: k5, weekly_limit: kw, updated_at: new Date().toISOString() };
    if (Number.isFinite(ku) && ku >= 0) kupd.ultra_bonus = ku;
    let { error: kErr } = await sb.from('quota_settings').update(kupd).eq('id', 1);
    if (kErr && kupd.ultra_bonus != null && /ultra_bonus/i.test(kErr.message || '')) {
      // 019 uygulanmamış — armağan alanı olmadan 018 limitlerini yine de kaydet
      delete kupd.ultra_bonus;
      ({ error: kErr } = await sb.from('quota_settings').update(kupd).eq('id', 1));
      if (!kErr) showToast(t('toast.kota_ultra_mig', 'Limitler kaydedildi · Ultra Armağanı için migration 019 gerekli'), true);
    }
    if (kErr) {
      showToast(t('toast.kota_save_fail', 'Kota limitleri kaydedilemedi — migration 018 uygulanmış mı?'), true);
      return;
    }
  }
  showToast(t('toast.saved'));
}

/* ═══ KNOWLEDGE BASE ═══ */
export async function loadKnowledge() {
  const { data } = await sb.from('knowledge_base').select('*').order('created_at', { ascending: false });
  if (data) S.knowledgeItems = data;
  renderKnowledgeList();
}

export async function saveKnowledge(btn) {
  const title   = document.getElementById('k-title').value.trim();
  const content = document.getElementById('k-content').value.trim();
  if (!title || !content) return;

  if (!btn) btn = event?.target;
  const oldText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Kaydediliyor...'; }

  try {
    const { data: kbData, error: kbErr } = await sb.from('knowledge_base').insert([{ title, content }]).select();
    if (kbErr) throw new Error(kbErr.message || kbErr.details || JSON.stringify(kbErr));
    const knowledgeId = kbData[0].id;

    if (S.LLM_API_KEY) {
      const chunks = chunkText(content, 800);
      for (let i = 0; i < chunks.length; i++) {
        if (btn) btn.textContent = `Vektörleniyor (${i+1}/${chunks.length})...`;
        try {
          const embedding = await getEmbedding(chunks[i]);
          const embStr = Array.isArray(embedding) ? JSON.stringify(embedding) : embedding;
          const { error: chunkErr } = await sb.from('knowledge_chunks').insert([{
            knowledge_id: knowledgeId, chunk_text: chunks[i], embedding: embStr
          }]);
          if (chunkErr) throw new Error(chunkErr.message || JSON.stringify(chunkErr));
        } catch (embErr) {
          console.warn('Embedding adımı atlandı:', embErr.message);
          break;
        }
      }
    }

    S.knowledgeItems.unshift(kbData[0]);
    document.getElementById('k-title').value   = '';
    document.getElementById('k-content').value = '';
    renderKnowledgeList();
    showToast(t('toast.added'));
  } catch (e) {
    console.error('Bilgi ekleme hatası:', e);
    showToast(t('toast.error') + e.message, true);
  }
  if (btn) { btn.disabled = false; btn.textContent = oldText; }
}

export async function updateKnowledge(i, btn) {
  const item     = S.knowledgeItems[i];
  const newTitle = document.getElementById(`kbt-${i}`).value.trim();
  const newCont  = document.getElementById(`kbc-${i}`).value.trim();
  if (!newTitle || !newCont) { showToast(t('toast.empty_field'), true); return; }

  if (!btn) btn = event?.target;
  const oldText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = t('auth.sending'); }

  try {
    const { error: kbErr } = await sb.from('knowledge_base')
      .update({ title: newTitle, content: newCont }).eq('id', item.id);
    if (kbErr) throw new Error(kbErr.message || kbErr.details || JSON.stringify(kbErr));

    await sb.from('knowledge_chunks').delete().eq('knowledge_id', item.id);

    if (S.LLM_API_KEY) {
      const chunks = chunkText(newCont, 800);
      for (let j = 0; j < chunks.length; j++) {
        if (btn) btn.textContent = `Vektörleniyor (${j+1}/${chunks.length})...`;
        try {
          const embedding = await getEmbedding(chunks[j]);
          const embStr = Array.isArray(embedding) ? JSON.stringify(embedding) : embedding;
          const { error: chunkErr } = await sb.from('knowledge_chunks').insert([{
            knowledge_id: item.id, chunk_text: chunks[j], embedding: embStr
          }]);
          if (chunkErr) throw new Error(chunkErr.message || JSON.stringify(chunkErr));
        } catch (embErr) {
          console.warn('Embedding adımı atlandı:', embErr.message);
          break;
        }
      }
    }

    S.knowledgeItems[i] = { ...item, title: newTitle, content: newCont };
    renderKnowledgeList();
    showToast(t('toast.updated'));
  } catch (e) {
    console.error('updateKnowledge hatası:', e);
    showToast(t('toast.error') + e.message, true);
  }
  if (btn) { btn.disabled = false; btn.textContent = oldText; }
}

export async function deleteKnowledge(i) {
  if (!confirm(t('confirm.delete_content'))) return;
  const itemId = S.knowledgeItems[i].id;
  try {
    await sb.from('knowledge_chunks').delete().eq('knowledge_id', itemId);
    await sb.from('knowledge_base').delete().eq('id', itemId);
    S.knowledgeItems.splice(i, 1);
    renderKnowledgeList();
    showToast(t('toast.deleted'));
  } catch (e) {
    console.error('Silme hatası:', e);
    showToast(t('toast.delete_error') + e.message, true);
  }
}

export function toggleKb(i) { document.getElementById(`kb-${i}`)?.classList.toggle('open'); }

export function renderKnowledgeList() {
  const el = document.getElementById('knowledge-list');
  if (!el) return;
  if (!S.knowledgeItems.length) { el.innerHTML = '<div class="empty-state">' + t('ui.empty', 'Boş.') + '</div>'; return; }
  el.innerHTML = S.knowledgeItems.map((k, i) => `
    <div class="kb-item" id="kb-${i}">
      <div class="kb-header" onclick="toggleKb(${i})">
        <div class="kb-item-title">${escapeHTML(k.title||'')}</div>
        <div class="kb-chevron">▼</div>
      </div>
      <div class="kb-body">
        <input class="field-input" id="kbt-${i}" value="${escapeHTML(k.title)}">
        <textarea class="field-textarea" id="kbc-${i}">${escapeHTML(k.content||'')}</textarea>
        <div class="kb-actions">
          <button class="kb-btn save" onclick="updateKnowledge(${i}, this)">${t('ui.save')}</button>
          <button class="kb-btn del"  onclick="deleteKnowledge(${i})">${t('ui.delete')}</button>
        </div>
      </div>
    </div>`).join('');
} // <--- EKSİK OLAN SÜSLÜ PARANTEZ BURASIYDI!

// 1. Uzun metinleri paragraflara/anlamlı parçalara böler (Türkçe uyumlu)
export function chunkText(text, maxChars = 800) {
  const paragraphs = text.split(/\n\s*\n|\r\n\s*\r\n/).map(function(p){ return p.trim(); }).filter(Boolean);
  const chunks = [];
  let current = '';
  for (const para of paragraphs) {
    if (para.length > maxChars) {
      if (current) { chunks.push(current.trim()); current = ''; }
      const sents = para.match(/[^.!?\n]+[.!?]*/g) || [para];
      for (const s of sents) {
        const trimmed = s.trim();
        if (!trimmed) continue;
        if ((current + ' ' + trimmed).trim().length > maxChars && current) {
          chunks.push(current.trim()); current = trimmed;
        } else {
          current = current ? current + ' ' + trimmed : trimmed;
        }
      }
    } else {
      if ((current + '\n\n' + para).trim().length > maxChars && current) {
        chunks.push(current.trim()); current = para;
      } else {
        current = current ? current + '\n\n' + para : para;
      }
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text.trim()];
}

// 2. Metni matematiksel anlama (Vektöre) çevirir (1536 boyut)
//    Edge Function üzerinden — API key client'ta YOK
export async function getEmbedding(text) {
  if (!text || !text.trim()) throw new Error('Embedding için boş metin gönderilemez.');
  const { data: sessionData } = await sb.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) throw new Error('Oturum yok.');

  const res = await fetch(`${EDGE_FN_BASE}/llm-embed`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'apikey':        SUPABASE_ANON,
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({ input: text.slice(0, 8000) })
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    if (res.status === 403) throw new Error('Embedding sadece admin için. Yetkin yok.');
    throw new Error(`Embedding API hatası (${res.status}): ${errText.slice(0, 200) || res.statusText}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  if (!data.data?.[0]?.embedding) throw new Error('Embedding yanıtı geçersiz: ' + JSON.stringify(data).slice(0, 200));
  return data.data[0].embedding;
}

/* ═══ ADMIN PANEL DATA ═══ */
export async function loadAdminFeedbacks() {
  const el = document.getElementById('feedbacks-list');
  el.innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:16px;">' + t('ui.preparing') + '</div>';

  const { data, error } = await sb
    .from('feedbacks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    el.innerHTML = `<div style="color:var(--red);font-size:13px;padding:16px;">${t('toast.error')} ${escapeHTML(error.message)}</div>`;
    console.error('loadAdminFeedbacks:', error);
    return;
  }

  if (!data?.length) {
    el.innerHTML = '<div class="empty-state">' + t('ui.no_feedback', 'Henüz geri bildirim yok.') + '</div>';
    return;
  }

  el.innerHTML = data.map(f => {
    const isPos       = f.is_positive === true;
    const safeContent = escapeHTML(f.message_content);
    const preview     = safeContent.length > 150 ? safeContent.slice(0, 150) + '…' : safeContent;
    const safeComment = escapeHTML(f.comment);
    const color       = isPos ? '#5BB97B' : '#C0392B';
    const label       = isPos ? t('ui.liked') : t('ui.disliked');
    const dateStr     = new Date(f.created_at).toLocaleString(S._currentLang || 'tr');
    const uid         = escapeHTML((f.user_id || '').slice(0, 8));

    return `<div style="padding:16px 0;border-bottom:1px solid var(--border);">
      <div style="font-size:10px;color:${color};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">${label}</div>
      ${preview ? `<div style="font-size:14px;color:var(--text);margin-bottom:10px;font-style:italic;line-height:1.5;">${preview}</div>` : ''}
      ${safeComment ? `<div style="font-size:13px;color:var(--gold);padding:8px 10px;border-left:2px solid rgba(184,149,60,0.4);margin-bottom:8px;font-style:italic;">"${safeComment}"</div>` : ''}
      <div style="font-size:10px;color:var(--text-dim);">${dateStr} — ${uid}...</div>
    </div>`;
  }).join('');
}

export async function loadAdminSummaries() {
  const el = document.getElementById('admin-summaries-list');
  el.innerHTML = t('ui.preparing');
  try {
    const { data, error } = await sb.from('chat_summaries').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data?.length) { el.innerHTML = '<div class="empty-state">' + t('toast.no_summary') + '</div>'; return; }
    const rows = data.map(s => {
      const safeTitle = escapeHTML(s.title || '');
      const safeSummary = escapeHTML(s.summary || '');
      const dateStr = new Date(s.created_at).toLocaleString(S._currentLang || 'tr');
      const uid = escapeHTML((s.user_id || '').slice(0, 8));
      return `<tr>
        <td>${safeTitle}</td>
        <td>${safeSummary}</td>
        <td>${dateStr}<br>${uid}...</td>
      </tr>`;
    }).join('');
    el.innerHTML = `<div class="doc-tablebox"><table>
      <thead><tr><th>Başlık</th><th>Özet</th><th>Tarih · Kullanıcı</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
  } catch { el.innerHTML = '<div class="empty-state">' + t('ui.loading_failed') + '</div>'; }
}

export async function loadDashboard() {
  const { count: u } = await sb.from('profiles').select('*', { count: 'exact', head: true });
  document.getElementById('stat-users').textContent     = u || '0';
  document.getElementById('stat-knowledge').textContent = S.knowledgeItems.length;
  // "Merhaba, Emre" belgesi uzun — Özet'te yalnız ilk bölümlerin nefesi görünsün
  const promptDoc = S.settings.system_prompt || '—';
  document.getElementById('active-prompt-preview').textContent =
    promptDoc.length > 600 ? promptDoc.slice(0, 600) + '…' : promptDoc;
}

/* Yönetim görevlerinin başlıkları — kutucuk açılınca üst bar başlığı buradan gelir. */
const ADMIN_TITLES = {
  dashboard: 'Özet', gozlemevi: 'Gözlemevi', persona: 'Kişilik', focus: 'Model Stüdyosu',
  'emre-sesi': "Emre'nin Sesi",
  knowledge: 'Bilgi', feedbacks: 'Geri Bildirimler', summaries: 'Özetler',
  'feature-videos': 'Tanıtım Videoları', mektup: 'Mektup',
  'user-letters': 'Kullanıcı Mektupları',
  bulten: 'Bülten', 'posta-akis': 'Posta Akışları',
  'library-banner': 'Duyuru', 'download-links': 'İndirme Bağlantıları',
  'halka-raporlar': 'Halka · Raporlar',
  bildirimler: 'Bildirimler', settings: 'Sistem',
};

/** Stüdyo girişine dön: görev sayfalarını kapat, gömülü stüdyoyu göster,
 *  üst barı uygulama-çıkış moduna al, kadran/toz/sahne girişini yeniden oynat. */
export function adminShowHome() {
  document.querySelectorAll('#admin-view .admin-page').forEach(p => p.classList.remove('active'));
  const pages = document.getElementById('admin-pages');
  if (pages) pages.style.display = 'none';        // görev sayfaları kabı (boş yer kaplamasın)
  const home = document.getElementById('admin-home');
  if (home) {
    home.style.display = '';
    // Stüdyo girişini her dönüşte yeniden sahnele (usturlap + toz + odalar).
    home.classList.remove('open');
    void home.offsetWidth;                          // reflow → animasyon yeniden tetiklenir
    home.classList.add('open');
    home.querySelector('.ws-st-body')?.scrollTo({ top: 0 });
  }
  try { showDailyThought(); } catch (_) {}  // günün düşüncesi plaketi
}

/** Geri çipi (görev sayfası başlığı): bir görev açıksa stüdyo girişine,
 *  girişteyken uygulamaya (kart-dönüş çıkışı) döner. */
export function adminNavBack() {
  const inPage = document.querySelector('#admin-view .admin-page.active');
  if (inPage) { adminShowHome(); return; }
  adminExitToApp();
}

/** Yönetim'den çıkış — ekranı kart gibi çevirip uygulamaya döner.
 *  Ayrı yönetim sayfasında (admin.html) tüm app-screen flip-out olur ve
 *  index.html'e gidilir; uygulama içindeyse (redirect öncesi, nadir) normal
 *  kabuk flip'i (10y) devreye girer. */
export function adminExitToApp() {
  if (!IS_ADMIN_PAGE) { window.switchView?.('chat'); return; }
  const app = document.getElementById('app-screen');
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (!app || reduce) { window.location.href = 'index.html'; return; }
  document.body.classList.add('flip-active');
  app.classList.add('flip-out-front');     // 0→90°: kart kenara döner (llm-shell.css)
  try { if (window.fxHaptic) window.fxHaptic('light'); else navigator.vibrate?.(10); } catch (_) {}
  setTimeout(() => { window.location.href = 'index.html'; }, 360);
}

/** Bir yönetim görevini tam-ekran view olarak aç. */
export function switchAdmin(pageId) {
  const page = document.getElementById('page-' + pageId);
  if (!page) return;
  const home = document.getElementById('admin-home');
  if (home) home.style.display = 'none';
  const pages = document.getElementById('admin-pages');
  if (pages) pages.style.display = '';
  document.querySelectorAll('#admin-view .admin-page').forEach(p => p.classList.remove('active'));
  page.classList.add('active');
  const pageTitle = document.getElementById('admin-page-title');
  if (pageTitle) pageTitle.textContent = ADMIN_TITLES[pageId] || 'Yönetim';
  document.getElementById('admin-view')?.scrollTo({ top: 0 });
  document.getElementById('admin-pages')?.scrollTo({ top: 0 });
  if (pageId === 'dashboard')       loadDashboard();
  if (pageId === 'feedbacks')       loadAdminFeedbacks();
  if (pageId === 'knowledge')       loadKnowledge();
  if (pageId === 'summaries')       loadAdminSummaries();
  if (pageId === 'feature-videos')  renderFeatureVideosAdmin();
  if (pageId === 'mektup')          import('./13d-mektup.js').then(m => m.renderMektupAdmin()).catch(() => {});
  if (pageId === 'user-letters')    import('./13d-mektup.js').then(m => m.renderUserLettersAdmin()).catch(() => {});
  if (pageId === 'bulten')          import('./13C-postane.js').then(m => m.pstRenderBulten()).catch(() => {});
  if (pageId === 'posta-akis')      import('./13C-postane.js').then(m => m.pstRenderAkislar()).catch(() => {});
  if (pageId === 'library-banner')  import('./10g-w2-wanderer-game.js').then(m => m.renderLibraryBannerAdmin()).catch(() => {});
  if (pageId === 'download-links')  import('./13n-indirme-baglantilari.js').then(m => m.renderDownloadLinksAdmin()).catch(() => {});
  if (pageId === 'halka-raporlar')  import('./10C-sosyal-feed.js').then(m => m.renderHalkaRaporlarAdmin()).catch(() => {});
  if (pageId === 'focus')           import('./10w-w2-odak-modelleri.js').then(m => m.renderFocusModelsAdmin()).catch(() => {});
  if (pageId === 'emre-sesi')       import('./16d-emre-sesi.js').then(m => m.renderEmreSesiAdmin()).catch(() => {});
  if (pageId === 'gozlemevi')       import('./13q-gozlemevi.js').then(m => m.renderGozlemeviAdmin()).catch(() => {});
}

/* ═══ PUSH NOTIFICATIONS ═══ */
export function initPushNotifications() {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted" && Notification.permission !== "denied")
    Notification.requestPermission();
  setInterval(() => {
    if (Notification.permission !== "granted") return;
    const now     = nowTR();
    const hour    = now.getHours();
    const dateStr = now.toDateString();
    if (hour === 10 || hour === 20) {
      const key  = `etw_notif_${dateStr}_${hour}`;
      if (!SafeStorage.getRaw(key)) {
        sendPush();
        SafeStorage.setRaw(key, '1');
      }
    }
  }, 60000);
}

export function sendPush() {
  if (Notification.permission !== "granted") { showToast(t('toast.notif_permission'), true); return; }
  const body = getContextualNotificationBody();
  const n = new Notification(S.settings.persona_name || 'Emre the Wanderer', {
    body, icon: EMRE_IMG, badge: EMRE_IMG
  });
  n.onclick = () => { window.focus(); EventBus.emit('navigate', { view: 'chat' }); };
}

export function testNotification() {
  if (!("Notification" in window)) { showToast(t('toast.notif_unsupported'), true); return; }
  if (Notification.permission === "granted") sendPush();
  else if (Notification.permission !== "denied")
    Notification.requestPermission().then(p => p === "granted" ? sendPush() : showToast(t('toast.notif_denied'), true));
  else showToast(t('toast.notif_enable'), true);
}

/* ═══ NOTEBOOK & SHARE ═══ */
export async function shareMessage(btn) {
  const text = msgRawText(btn);
  const shareText = `"${text}"\n\n— Emre the Wanderer`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: t('ui.share_title.note'),
        text: shareText
      });
    } catch (e) {
      if (e.name !== 'AbortError') showToast(t('toast.share_error'), true);
    }
  } else {
    try {
      await navigator.clipboard.writeText(shareText);
      showToast(t('toast.message_copied'));
    } catch (err) {
      showToast(t('toast.copy_fail'), true);
    }
  }
}

/* ═══ NOTEBOOK (Not Defteri) ═══
   - Supabase'e yazar
   - Not tıklanınca düzenlenebilir / silinebilir
   - Arama / filtre
   - Dışa aktarma (txt)
*/

let _allNotes       = [];
let _visibleNotes   = [];  // aktif sekme + arama filtresiyle görünen notlar
let _activeTab      = 'personal'; // 'personal' | 'quote'
let _editingNoteId  = null;

async function _saveNoteToDb(content, isQuote) {
  let ok = true;
  try {
    const { error } = await sb.from('notebook').insert([{
      user_id: S.currentUser.id,
      content:  content,
      is_quote: isQuote
    }]);
    if (error) throw error;
  } catch (e) {
    console.warn('Notebook kayıt hatası:', e.message);
    ok = false;
  }

  if (ok && document.getElementById('notebook-view')?.classList.contains('active')) {
    await loadNotebook();
  }
  return ok;
}

export async function saveToNotebookMsg(btn) {
  const text = msgRawText(btn);
  const ok = await _saveNoteToDb(text, true);
  showToast(ok ? t('toast.note_added') : t('toast.note_save_fail', 'Not kaydedilemedi. Tekrar dene.'), !ok);
}

/* Araç motoru (13a) için doğrudan not kaydı — buton/dataset gerektirmez */
export async function saveNoteDirect(text) {
  if (!text || !text.trim()) return false;
  const ok = await _saveNoteToDb(text.trim(), true);
  showToast(ok ? t('toast.note_added') : t('toast.note_save_fail', 'Not kaydedilemedi. Tekrar dene.'), !ok);
  return ok;
}

export async function addManualNote(btn) {
  const inp = document.getElementById('manual-note-input');
  const text = inp.value.trim();
  if (!text) return;
  // Mühür butonu ikon taşıyor — textContent'i ezme; busy sınıfıyla göster
  btn.disabled = true; btn.classList.add('is-busy');
  const ok = await _saveNoteToDb(text, false);
  if (ok) { inp.value = ''; inp.style.height = 'auto'; }
  btn.disabled = false; btn.classList.remove('is-busy');
  showToast(ok ? t('toast.thought_saved') : t('toast.note_save_fail', 'Not kaydedilemedi. Tekrar dene.'), !ok);
}

export async function loadNotebook() {
  const list = document.getElementById('notes-list');
  if (list) list.innerHTML = '<div class="nb-empty"><div class="nb-empty-text serif">' + t('ui.preparing') + '</div></div>';
  _allNotes = [];

  try {
    const { data, error } = await sb.from('notebook')
      .select('*')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      _allNotes = data.map(n => ({ ...n, source: 'supabase' }));
    }
  } catch (e) {
    console.warn('Notebook okuma hatası:', e.message);
  }

  _allNotes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const q = document.getElementById('note-search-input')?.value || '';
  _applyFilters(q);
}

/* Sekme + arama filtresini birlikte uygula — tek gerçek render noktası */
function _applyFilters(q) {
  const isQuote = _activeTab === 'quote';
  let filtered = _allNotes.filter(n => Boolean(n.is_quote) === isQuote);
  if (q && q.trim()) {
    const lq = q.toLowerCase();
    filtered = filtered.filter(n => n.content.toLowerCase().includes(lq));
  }
  renderNoteList(filtered);
}

/* Sekme geçişi — DOM tab butonlarını günceller, kompozeri göster/gizle */
export function switchNoteTab(tab) {
  _activeTab = tab;

  // Tab buton görünümleri
  ['personal', 'quote'].forEach(id => {
    const btn = document.getElementById('nb-tab-' + id);
    if (!btn) return;
    const active = id === tab;
    btn.classList.toggle('nb-tab--active', active);
    btn.setAttribute('aria-selected', String(active));
  });

  // Kompozer: yalnız kişisel sekmede
  const composer = document.getElementById('nb-composer');
  if (composer) composer.style.display = tab === 'personal' ? '' : 'none';

  // Arama kutusunu sıfırla
  const searchInp = document.getElementById('note-search-input');
  if (searchInp) searchInp.value = '';

  _applyFilters('');
}

export function renderNoteList(notes) {
  _visibleNotes = notes;
  const list = document.getElementById('notes-list');
  if (!list) return;

  if (!notes.length) {
    const isQuote = _activeTab === 'quote';
    const emptyMsg = isQuote
      ? t('ui.notebook_empty_quotes', 'Emre\'den henüz alıntı yok. Sohbet sırasında kaydettiğin cümleler burada belirir.')
      : t('ui.notebook_empty', 'Not defterin boş. Düşüncelerini kaydetmeye başla.');
    list.innerHTML = `<div class="nb-empty">
      <div class="nb-empty-glyph" aria-hidden="true">${isQuote ? '❝' : '✦'}</div>
      <div class="nb-empty-text serif">${escapeHTML(emptyMsg)}</div>
    </div>`;
    return;
  }

  list.innerHTML = notes.map((n, idx) => {
    const dStr = new Date(n.created_at).toLocaleString(S._currentLang || 'tr', {
      timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const safeContent = escapeHTML(n.content || '');
    const preview = safeContent.length > 160 ? safeContent.slice(0, 160) + '…' : safeContent;
    // Anlam ekseni: alıntı = altın (mühürlenmiş bilgelik) / kişisel = lapis (içsel derinlik)
    const kindClass = n.is_quote ? 'nb-card--quote' : 'nb-card--thought';
    const glyph     = n.is_quote ? '❝' : '✦';
    const dataAttr  = n.id ? `data-note-id="${escapeHTML(String(n.id))}"` : '';
    const body      = n.is_quote ? preview : preview.replace(/\n/g, '<br>');
    return `<article class="nb-card ${kindClass}" ${dataAttr} onclick="openNoteDetail(${idx})" tabindex="0" role="button">
      <span class="nb-card-glyph" aria-hidden="true">${glyph}</span>
      <div class="nb-card-body serif">${body}</div>
      <div class="nb-card-date">${dStr}</div>
    </article>`;
  }).join('');
}

export function filterNotes(q) {
  _applyFilters(q);
}

export function openNoteDetail(idx) {
  const n = _visibleNotes[idx];
  if (!n) return;
  _editingNoteId = n.id;
  const dStr = new Date(n.created_at).toLocaleString(S._currentLang || 'tr', {
    timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  document.getElementById('note-detail-date').textContent  = dStr;
  document.getElementById('note-detail-badge').textContent = n.is_quote ? '✦ ' + t('ui.note_prefix_quote').toUpperCase() : '✦ ' + t('ui.note_prefix_personal').toUpperCase();
  const inp = document.getElementById('note-detail-input');
  inp.value = n.content;
  autoResize(inp);
  document.getElementById('note-detail-overlay').classList.add('open');
}

export async function saveNoteEdit() {
  const newContent = document.getElementById('note-detail-input').value.trim();
  if (!newContent) return;
  document.getElementById('note-detail-overlay').classList.remove('open');

  const note = _allNotes.find(n => n.id === _editingNoteId);
  if (!note) return;

  // Bellekte güncelle
  note.content = newContent;

  if (note.id) {
    try {
      await sb.from('notebook').update({ content: newContent }).eq('id', note.id);
    } catch (e) { console.warn('Not güncelleme hatası:', e.message); }
  }

  const q = document.getElementById('note-search-input')?.value || '';
  _applyFilters(q);
  showToast(t('toast.note_updated'));
}

export async function deleteNote() {
  if (!confirm(t('confirm.delete_note'))) return;
  document.getElementById('note-detail-overlay').classList.remove('open');

  const idx  = _allNotes.findIndex(n => n.id === _editingNoteId);
  if (idx === -1) return; // Not bulunamadı — splice(-1) ile son notu silmeyi önle
  const note = _allNotes[idx];
  if (!note) return;

  if (note.id) {
    try { await sb.from('notebook').delete().eq('id', note.id); } catch {}
  }

  _allNotes.splice(idx, 1);
  const q = document.getElementById('note-search-input')?.value || '';
  _applyFilters(q);
  showToast(t('toast.note_deleted'));
}

export function exportNotes() {
  if (!_allNotes.length) { showToast(t('toast.no_notes'), true); return; }
  const lines = _allNotes.map(n => {
    const d = new Date(n.created_at).toLocaleString(S._currentLang || 'tr');
    const prefix = n.is_quote ? '[' + t('ui.note_prefix_quote') + ']' : '[' + t('ui.note_prefix_personal') + ']';
    return `${d} — ${prefix}\n${n.content}\n${'─'.repeat(40)}`;
  }).join('\n\n');
  const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = t('ui.notebook_filename'); a.click();
  URL.revokeObjectURL(url);
  showToast(t('toast.notes_downloaded'));
}

/* ═══ ŞİFRE SIFIRLAMA ═══ */
