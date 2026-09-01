/* ═══════════════════════════════════════════════════
   13d — GEZGİNE MEKTUP
   Kenar çubuğundaki "Emre the wanderer · Wanderer Movement" satırına
   dokunan kullanıcı, Emre'nin kendi elinden çıkmış mektubu okur.
   İçerik admin paneldeki "Mektup" sekmesinden yazılır; tek satırlık
   founder_letter tablosunda yaşar (migrations/000_wanderer_schema.sql,
   herkes okur / admin yazar). Tablo yoksa varsayılan mektup gösterilir.
═══════════════════════════════════════════════════ */
import { sb, EMRE_IMG } from '../config.js';
import { escapeHTML, showToast } from './00a-infrastructure.js';
import { S } from '../state.js';
import { t } from './15-i18n.js';

/* Admin henüz yazmadıysa gösterilen yer tutucu mektup — render anında t() ile
   kurulur (modül-yükünde DONMASIN). Gerçek mektup admin tarafından yazılır. */
function _defaultMektup() {
  return {
    title: t('mk.default.title', 'Sana bir mektubum var'),
    body: t('mk.default.body', 'Sevgili Gezgin,\n\nBu sayfayı senin için ayırdım. Çok yakında burada, sana kendi elimle yazdığım bir mektup olacak.\n\nŞimdilik şunu bil: buraya kadar gelmen bile bir şeyin kanıtı. Mesele sensin — ve sen buradasın.'),
    photo_url: '',
  };
}

let _mektupCache = null;   // {title, body, photo_url, updated_at} | null (henüz yüklenmedi)
let _mektupLoaded = false;

/* Profil satırı cameo'su için fotoğraf — admin özel fotoğraf girdiyse o,
   yoksa Emre'nin fotoğrafı. Cache soğukken de anında bir görsel döner. */
export function mektupPhotoUrl() {
  return _mektupCache?.photo_url || EMRE_IMG;
}

async function _mektupLoad(force = false) {
  if (_mektupLoaded && !force) return _mektupCache;
  try {
    const { data, error } = await sb
      .from('founder_letter')
      .select('title, body, photo_url, updated_at')
      .eq('id', 1)
      .maybeSingle();
    if (!error) { _mektupCache = data || null; _mektupLoaded = true; }
  } catch (e) { console.warn('mektupLoad:', e?.message); }
  return _mektupCache;
}

/* Düz metni mektup paragraflarına çevir — boş satır paragraf ayırır */
function _bodyHTML(body) {
  return String(body || '')
    .split(/\n{2,}/)
    .map(par => par.trim())
    .filter(Boolean)
    .map(par => `<p>${escapeHTML(par).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function _letterHTML(letter) {
  const DEF = _defaultMektup();
  const L = (letter && (letter.body || letter.title)) ? letter : DEF;
  let dateStr = '';
  try {
    if (letter?.updated_at) {
      dateStr = new Date(letter.updated_at).toLocaleDateString(S._currentLang || 'tr', { day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch (_) {}
  return `
    <div class="mektup-photo-wrap">
      <div class="mektup-cameo"><img src="${escapeHTML(L.photo_url || EMRE_IMG)}" alt="Emre the wanderer"></div>
    </div>
    <div class="mektup-from">EMRE THE WANDERER</div>
    <div class="mektup-movement">Wanderer Movement</div>
    ${dateStr ? `<div class="mektup-date">${escapeHTML(dateStr)}</div>` : ''}
    <h1 class="mektup-title">${escapeHTML(L.title || DEF.title)}</h1>
    <div class="mektup-divider" aria-hidden="true">✦</div>
    <div class="mektup-body">${_bodyHTML(L.body || DEF.body)}</div>
    <div class="mektup-sign">
      <div class="mektup-sign-name">Emre</div>
      <div class="mektup-sign-sub">the wanderer · Wanderer Movement</div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════════
   KULLANICI MEKTUBU — "Benim de sana bir mektubum var!"
   Studio kullanıcısına ayda 1 hak: Emre'ye kişisel mektup yazıp e-posta
   olarak gönderir. Mektubun sayfa ikizi → kullanıcı portresi → ok →
   Emre portresi → metin alanı → GÖNDER. Edge function: send-user-letter.
═══════════════════════════════════════════════════════════════════ */

let _kmStatusCache = null;   // { can_send, last_sent_at, fetched_at } | null
let _kmSending = false;

function _kmIsStudio() {
  return !!(S?.isPremium || S?.isAdmin);
}

function _kmUserInitials() {
  const meta = S?.currentUser?.user_metadata || {};
  const name = (meta.full_name || meta.name || '').trim();
  const email = S?.currentUser?.email || '';
  const src = name || (email ? email.split('@')[0] : t('mk.you', 'Sen'));
  const parts = src.split(/[\s._-]+/).filter(Boolean);
  const a = (parts[0] || src || 'S')[0] || 'S';
  const b = parts[1] ? parts[1][0] : '';
  return (a + b).toUpperCase().slice(0, 2);
}

function _kmUserAvatarHTML() {
  const meta = S?.currentUser?.user_metadata || {};
  const url = meta.avatar_url || meta.picture || '';
  if (url) return `<img src="${escapeHTML(url)}" alt="${escapeHTML(t('mk.you', 'Sen'))}">`;
  return `<span class="km-initials" aria-hidden="true">${escapeHTML(_kmUserInitials())}</span>`;
}

async function _kmFetchStatus(force = false) {
  if (!S?.currentUser) return { can_send: false, last_sent_at: null };
  if (!force && _kmStatusCache && Date.now() - _kmStatusCache.fetched_at < 60_000) return _kmStatusCache;
  try {
    const { data, error } = await sb.rpc('user_letter_status');
    if (!error && Array.isArray(data) && data[0]) {
      _kmStatusCache = { ...data[0], fetched_at: Date.now() };
      return _kmStatusCache;
    }
  } catch (e) { console.warn('kmStatus:', e?.message); }
  _kmStatusCache = { can_send: true, last_sent_at: null, fetched_at: Date.now() };
  return _kmStatusCache;
}

function _kmFormatNextAvailable(lastIso) {
  if (!lastIso) return '';
  try {
    const last = new Date(lastIso);
    const next = new Date(last.getFullYear(), last.getMonth() + 1, 1);
    return next.toLocaleDateString(S._currentLang || 'tr', { day: 'numeric', month: 'long' });
  } catch (_) { return ''; }
}

/* Mektup sheet'ine eklenen sol-alt CTA. Studio değilse Studio'ya yönlendirir;
   bu ay gönderildiyse pasif + bir sonraki ayın tarihi gösterilir. */
function _kmRenderReplyBtn() {
  const sheet = document.querySelector('#mektup-panel .mektup-sheet');
  if (!sheet) return;
  if (sheet.querySelector('.mektup-reply-btn')) return; // çift basma

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mektup-reply-btn';
  btn.setAttribute('aria-label', t('mk.reply.text', 'Benim de sana bir mektubum var!'));
  btn.innerHTML = `
    <span class="mrb-ico" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2.5"/>
        <path d="M3 7 L12 13 L21 7"/>
      </svg>
    </span>
    <span class="mrb-text">${t('mk.reply.text', 'Benim de sana bir mektubum var!')}</span>
    <span class="mrb-sub" id="mrb-sub">…</span>`;
  sheet.appendChild(btn);

  /* 3sn sonra mühür-mektup hâline kapan; hover/focus ile yeniden açılır.
     Dokunmatikte ilk vuruş yalnız açar — anında yollamaz. */
  const _kmIsTouch = !window.matchMedia?.('(hover: hover)').matches;
  const _kmCollapseAfter = (ms) => {
    clearTimeout(btn._collapseTimer);
    btn._collapseTimer = setTimeout(() => {
      if (!btn.isConnected) return;
      if (btn.matches(':hover, :focus-within')) { _kmCollapseAfter(1200); return; }
      btn.classList.add('is-collapsed');
    }, ms);
  };
  _kmCollapseAfter(3000);

  btn.addEventListener('click', (e) => {
    // Dokunmatik: kapalıyken ilk dokunuş yalnızca açar
    if (_kmIsTouch && btn.classList.contains('is-collapsed')) {
      btn.classList.remove('is-collapsed');
      _kmCollapseAfter(4500);
      try { e.preventDefault(); } catch (_) {}
      return;
    }
    if (!S?.currentUser) {
      showToast(t('gk.toast_login_first', 'Önce giriş yap'), true);
      return;
    }
    if (!_kmIsStudio()) {
      mektupClose();
      try { window.switchView?.('sub'); } catch (_) {}
      showToast(t('mk.toast.studio_only', 'Bu özellik Wanderer Studio üyelerine açık.'), true);
      return;
    }
    const st = _kmStatusCache;
    if (st && st.can_send === false) {
      const nxt = _kmFormatNextAvailable(st.last_sent_at);
      showToast(t('mk.toast.sent_already', 'Bu ay mektubunu yolladın.') + ' ' + (nxt ? t('mk.toast.reopens', '{date} itibarıyla yeniden açılır.').replace('{date}', nxt) : ''));
      return;
    }
    kmOpen();
  });

  // Alt yazıyı duruma göre güncelle
  const sub = btn.querySelector('#mrb-sub');
  if (!S?.currentUser) {
    sub.textContent = t('mk.sub.login_first', 'önce giriş');
    btn.classList.add('disabled');
  } else if (!_kmIsStudio()) {
    sub.textContent = t('mk.sub.studio_monthly', 'Studio · ayda 1');
    btn.classList.add('locked');
  } else {
    sub.textContent = t('mk.sub.monthly', 'ayda 1');
    _kmFetchStatus().then(s => {
      if (!sub.isConnected) return;
      if (s.can_send === false) {
        const nxt = _kmFormatNextAvailable(s.last_sent_at);
        sub.textContent = nxt ? t('mk.sub.sent_dated', 'bu ay yollandı · {date}').replace('{date}', nxt) : t('mk.sub.sent', 'bu ay yollandı');
        btn.classList.add('disabled');
      } else {
        sub.textContent = t('mk.sub.can_write', 'ayda 1 · şimdi yazabilirsin');
      }
    });
  }
}

/* İkiz panel — Mektup'la aynı estetik, ikinci oval (kullanıcı) + altın ok + form */
export function kmOpen() {
  kmClose();
  const photoUrl = (_mektupCache?.photo_url || EMRE_IMG);
  const userAvatar = _kmUserAvatarHTML();
  const panel = document.createElement('div');
  panel.id = 'km-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', t('mk.write_aria', "Emre'ye sen yaz"));
  panel.innerHTML = `
    <div class="km-backdrop"></div>
    <div class="km-sheet">
      <button class="km-close" aria-label="Kapat">✕</button>
      <div class="km-scroll">
        <div class="km-eyebrow">${t('mk.km.eyebrow', 'SEN · EMRE')}</div>
        <div class="km-arrow-row">
          <div class="km-cameo km-cameo--user">${userAvatar}</div>
          <div class="km-arrow" aria-hidden="true">
            <svg viewBox="0 0 80 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12 H72"/>
              <path d="M62 5 L74 12 L62 19"/>
            </svg>
          </div>
          <div class="km-cameo km-cameo--emre"><img src="${escapeHTML(photoUrl)}" alt="Emre the wanderer"></div>
        </div>
        <div class="km-from">${t('mk.km.from', 'SEN → EMRE THE WANDERER')}</div>
        <div class="km-movement">${t('mk.km.movement', 'Wanderer Studio · ayda 1 mektup')}</div>
        <h1 class="km-title">${t('mk.km.title', 'Mektubunu yaz')}</h1>
        <div class="km-divider" aria-hidden="true">✦</div>
        <div class="km-form">
          <textarea id="km-body" class="km-body" rows="10" maxlength="6000"
            placeholder="${escapeHTML(t('mk.km.placeholder', 'Sevgili Emre,\n\nSana yazmak istediğim şey...')).replace(/\n/g, '&#10;')}"></textarea>
          <div class="km-counter"><span id="km-count">0</span> / 6000</div>
          <button id="km-send" class="km-send" type="button">${t('mk.km.send', 'GÖNDER')}</button>
          <div class="km-foot">${t('mk.km.foot', "Mektubun doğrudan Emre'ye iletilir. Bu hak ayda 1 kez yenilenir.")}</div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(panel);

  panel.querySelector('.km-backdrop').addEventListener('click', kmClose);
  panel.querySelector('.km-close').addEventListener('click', kmClose);
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') kmClose(); });

  const ta = panel.querySelector('#km-body');
  const counter = panel.querySelector('#km-count');
  ta.addEventListener('input', () => { counter.textContent = String(ta.value.length); });
  panel.querySelector('#km-send').addEventListener('click', () => kmSend());

  requestAnimationFrame(() => panel.classList.add('open'));
  document.body.style.overflow = 'hidden';
  setTimeout(() => ta.focus({ preventScroll: true }), 250);
}

export function kmClose() {
  const panel = document.getElementById('km-panel');
  if (!panel) return;
  panel.remove();
  // Eski okuma panelini kapatmıyoruz — sadece üstteki ikizi kapat
  if (!document.getElementById('mektup-panel')) {
    document.body.style.overflow = '';
  }
}

export async function kmSend() {
  if (_kmSending) return;
  const ta = document.getElementById('km-body');
  const sendBtn = document.getElementById('km-send');
  const body = (ta?.value || '').trim();
  if (body.length < 20) {
    showToast(t('mk.send.too_short', 'Mektubun biraz daha uzun olsun (en az 20 karakter).'), true);
    return;
  }
  _kmSending = true;
  sendBtn.disabled = true;
  sendBtn.textContent = t('mk.send.sending', 'Yollanıyor…');
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session?.access_token) {
      showToast(t('gk.toast_login_first', 'Önce giriş yap'), true);
      return;
    }
    const res = await fetch(`${sb.supabaseUrl}/functions/v1/send-user-letter`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': sb.supabaseKey,
      },
      body: JSON.stringify({ body }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = out.message || (out.error === 'monthly_limit' ? t('mk.toast.sent_already', 'Bu ay mektubunu yolladın.') :
        out.error === 'studio_required' ? t('mk.send.studio_required', 'Wanderer Studio gerekli.') :
        t('mk.send.failed', 'Mektup gönderilemedi.'));
      showToast(msg, true);
      return;
    }
    _kmStatusCache = { can_send: false, last_sent_at: new Date().toISOString(), fetched_at: Date.now() };
    showToast(t('mk.send.sent_ok', "Mektubun Emre'ye yola çıktı."));
    kmClose();
    // Ana mektup panelinin alt butonunu güncelle
    const sub = document.querySelector('#mektup-panel .mektup-reply-btn #mrb-sub');
    if (sub) {
      sub.textContent = t('mk.sub.sent', 'bu ay yollandı');
      document.querySelector('#mektup-panel .mektup-reply-btn')?.classList.add('disabled');
    }
  } catch (e) {
    console.warn('kmSend:', e?.message);
    showToast(t('mk.send.failed', 'Mektup gönderilemedi.') + ': ' + (e?.message || e), true);
  } finally {
    _kmSending = false;
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = t('mk.km.send', 'GÖNDER'); }
  }
}

export function mektupOpen(override) {
  mektupClose(); // çift açılmayı önle
  const panel = document.createElement('div');
  panel.id = 'mektup-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', t('aria.letter_from_emre', "Emre'den sana mektup"));
  panel.innerHTML = `
    <div class="mektup-backdrop"></div>
    <div class="mektup-sheet">
      <button class="mektup-close" aria-label="Kapat">✕</button>
      <div class="mektup-scroll">${_letterHTML(override || _mektupCache)}</div>
    </div>`;
  document.body.appendChild(panel);

  panel.querySelector('.mektup-backdrop').addEventListener('click', mektupClose);
  panel.querySelector('.mektup-close').addEventListener('click', mektupClose);
  panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') mektupClose(); });

  requestAnimationFrame(() => panel.classList.add('open'));
  document.body.style.overflow = 'hidden';
  panel.querySelector('.mektup-close').focus({ preventScroll: true });

  // Sol-alt köşe: "Benim de sana bir mektubum var!" CTA'sı
  _kmRenderReplyBtn();

  // İçerik soğuksa arkadan yükle ve yerinde tazele (açılış beklemez)
  if (!override) {
    _mektupLoad().then(letter => {
      const scroll = document.querySelector('#mektup-panel .mektup-scroll');
      if (scroll && letter) scroll.innerHTML = _letterHTML(letter);
    });
  }
}

/* Admin önizlemesi — kaydedilmemiş form alanlarıyla açar */
export function mektupPreviewFromAdmin() {
  mektupOpen({
    title:      (document.getElementById('mektup-title')?.value || '').trim(),
    body:       (document.getElementById('mektup-body')?.value || '').trim(),
    photo_url:  (document.getElementById('mektup-photo')?.value || '').trim(),
    updated_at: new Date().toISOString(),
  });
}

export function mektupClose() {
  const panel = document.getElementById('mektup-panel');
  if (!panel) return;
  panel.remove();
  document.body.style.overflow = '';
}

/* ══════════════════════════════════════════════════════════════════
   ADMIN — "Mektup" sekmesi: fotoğraf + başlık + gövde, tek satır upsert
══════════════════════════════════════════════════════════════════ */

export async function renderMektupAdmin() {
  const host = document.getElementById('mektup-admin-host');
  if (!host) return;
  host.innerHTML = `<div style="color:var(--text-dim);font-size:13px;">${t('wg.admin.loading', 'Yükleniyor…')}</div>`;

  const letter = await _mektupLoad(true) || {};
  host.innerHTML = `
    <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">${t('mk.admin.photo_label', 'Fotoğraf URL (opsiyonel)')}</div>
    <div style="font-size:12px;color:var(--text-mid);margin-bottom:10px;line-height:1.6;">${t('mk.admin.photo_desc', "Mektubun üstündeki büyük oval portre. Boş bırakırsan Emre'nin fotoğrafı kullanılır.")}</div>
    <input class="field-input" type="url" id="mektup-photo" value="${escapeHTML(letter.photo_url || '')}" placeholder="${escapeHTML(EMRE_IMG)}" style="margin-bottom:24px;">

    <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">${t('mk.admin.title_label', 'Başlık')}</div>
    <input class="field-input" type="text" id="mektup-title" value="${escapeHTML(letter.title || '')}" placeholder="${escapeHTML(_defaultMektup().title)}" style="margin-bottom:24px;">

    <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">${t('mk.admin.body_label', 'Mektup')}</div>
    <div style="font-size:12px;color:var(--text-mid);margin-bottom:10px;line-height:1.6;">${t('mk.admin.body_desc', 'Kendi sesinle, doğrudan kullanıcıya. Boş satır yeni paragraf açar. İlk paragrafın ilk harfi mektupta büyük başlar.')}</div>
    <textarea class="field-textarea" id="mektup-body" rows="14" placeholder="${escapeHTML(t('mk.admin.body_ph', 'Sevgili Gezgin,\n\n...')).replace(/\n/g, '&#10;')}">${escapeHTML(letter.body || '')}</textarea>
    <button class="btn-outline-gold" onclick="mektupPreviewFromAdmin()" style="margin-top:14px;margin-right:10px;">${t('mk.admin.preview', 'Önizle')}</button>`;
}

export async function saveMektup(btn) {
  if (btn) btn.disabled = true;
  const photo = (document.getElementById('mektup-photo')?.value || '').trim();
  const row = {
    id: 1,
    title:      (document.getElementById('mektup-title')?.value || '').trim() || null,
    body:       (document.getElementById('mektup-body')?.value || '').trim() || null,
    photo_url:  photo || null,
    updated_at: new Date().toISOString(),
  };

  if (row.photo_url && !/^https?:\/\//i.test(row.photo_url)) {
    showToast(t('mk.admin.photo_http', 'Fotoğraf URL http(s) ile başlamalı.'), true);
    if (btn) btn.disabled = false;
    return;
  }

  try {
    const { error } = await sb.from('founder_letter').upsert(row, { onConflict: 'id' });
    if (error) {
      if (/relation .*founder_letter.* does not exist|could not find the table/i.test(error.message)) {
        showToast(t('mk.admin.no_table', 'founder_letter tablosu yok — migrations/000_wanderer_schema.sql çalıştırılmalı.'), true);
      } else {
        showToast(t('mk.admin.save_failed', 'Kaydedilemedi') + ': ' + error.message, true);
      }
      return;
    }
    _mektupCache = row; _mektupLoaded = true;
    showToast(t('mk.admin.published', 'Mektup yayınlandı.'));
  } catch (e) {
    showToast(t('mk.admin.save_failed', 'Kaydedilemedi') + ': ' + (e?.message || e), true);
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   ADMIN — "Kullanıcı Mektupları" sekmesi
   Hedef e-posta (user_letter_settings) + gelen mektupların listesi.
═══════════════════════════════════════════════════════════════════ */

export async function renderUserLettersAdmin() {
  const host = document.getElementById('user-letters-admin-host');
  if (!host) return;
  host.innerHTML = `<div style="color:var(--text-dim);font-size:13px;">${t('wg.admin.loading', 'Yükleniyor…')}</div>`;

  // Hedef e-posta
  let dest = '';
  try {
    const { data } = await sb.from('user_letter_settings').select('destination_email').eq('id', 1).maybeSingle();
    dest = data?.destination_email || '';
  } catch (e) { console.warn('userLettersAdmin settings:', e?.message); }

  // Son 100 mektup
  let rows = [];
  try {
    const { data, error } = await sb
      .from('user_letters')
      .select('id, user_email, user_name, body, sent_at, sent_email_at, sent_email_error')
      .order('sent_at', { ascending: false })
      .limit(100);
    if (!error) rows = data || [];
  } catch (e) { console.warn('userLettersAdmin list:', e?.message); }

  const rowsHTML = rows.length === 0
    ? `<div style="color:var(--text-dim);font-size:13px;padding:24px 0;">${t('mk.ul.empty', 'Henüz mektup yok.')}</div>`
    : rows.map(r => {
        let dateStr = '';
        try { dateStr = new Date(r.sent_at).toLocaleString(S._currentLang || 'tr', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (_) {}
        const emailBadge = r.sent_email_at
          ? `<span style="color:#7ec48a;font-size:10px;letter-spacing:1.5px;">${t('mk.ul.email_sent', 'E-POSTA İLETİLDİ')}</span>`
          : r.sent_email_error
            ? `<span style="color:#d99a4a;font-size:10px;letter-spacing:1.5px;" title="${escapeHTML(r.sent_email_error)}">${t('mk.ul.db_only', 'YALNIZ DB')}</span>`
            : '';
        return `
          <div style="border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:14px;background:rgba(255,255,255,0.015);">
            <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:10px;flex-wrap:wrap;">
              <div>
                <div style="font-size:14px;color:var(--text);font-weight:500;">${escapeHTML(r.user_name || r.user_email || t('mk.gezgin', 'Gezgin'))}</div>
                ${r.user_email ? `<div style="font-size:11px;color:var(--text-dim);">${escapeHTML(r.user_email)}</div>` : ''}
              </div>
              <div style="text-align:right;">
                <div style="font-size:11px;color:var(--text-dim);">${escapeHTML(dateStr)}</div>
                ${emailBadge}
              </div>
            </div>
            <div style="font-family:var(--serif,Georgia),Georgia,serif;font-size:14.5px;line-height:1.75;color:var(--text);white-space:pre-wrap;">${escapeHTML(r.body || '')}</div>
          </div>`;
      }).join('');

  host.innerHTML = `
    <div style="font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">${t('mk.ul.dest_label', 'Hedef E-Posta')}</div>
    <div style="font-size:12px;color:var(--text-mid);margin-bottom:10px;line-height:1.6;">
      ${t('mk.ul.dest_desc', 'Kullanıcıların yolladığı mektuplar bu adrese e-posta olarak da iletilir (Edge Function: send-user-letter · RESEND_API_KEY gerekli). Boş bırakırsan yalnız aşağıdaki listede görünür.')}
    </div>
    <input class="field-input" type="email" id="ul-dest" value="${escapeHTML(dest)}" placeholder="emre@example.com" style="margin-bottom:14px;">
    <button class="btn-outline-gold" onclick="saveUserLetterSettings(this)" style="margin-bottom:32px;">${t('mk.ul.save_dest', 'Hedefi Kaydet')}</button>

    <div class="section-label">${t('mk.ul.incoming', 'Gelen Mektuplar')} · ${rows.length}</div>
    <div style="margin-top:14px;margin-bottom:40px;">${rowsHTML}</div>`;
}

export async function saveUserLetterSettings(btn) {
  if (btn) btn.disabled = true;
  const email = (document.getElementById('ul-dest')?.value || '').trim();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    showToast(t('mk.ul.bad_email', 'Geçerli bir e-posta adresi gir.'), true);
    if (btn) btn.disabled = false;
    return;
  }
  try {
    const { error } = await sb
      .from('user_letter_settings')
      .upsert({ id: 1, destination_email: email || null, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error) {
      if (/relation .*user_letter_settings.* does not exist|could not find the table/i.test(error.message)) {
        showToast(t('mk.ul.no_table', 'user_letter_settings tablosu yok — migrations/000_wanderer_schema.sql çalıştırılmalı.'), true);
      } else {
        showToast(t('mk.admin.save_failed', 'Kaydedilemedi') + ': ' + error.message, true);
      }
      return;
    }
    showToast(t('mk.ul.dest_saved', 'Hedef e-posta kaydedildi.'));
  } catch (e) {
    showToast(t('mk.admin.save_failed', 'Kaydedilemedi') + ': ' + (e?.message || e), true);
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* Inline onclick erişimi — minify'a dayanıklı */
window.mektupOpen              = mektupOpen;
window.mektupClose             = mektupClose;
window.mektupPreviewFromAdmin  = mektupPreviewFromAdmin;
window.renderMektupAdmin       = renderMektupAdmin;
window.saveMektup              = saveMektup;
window.kmOpen                  = kmOpen;
window.kmClose                 = kmClose;
window.kmSend                  = kmSend;
window.renderUserLettersAdmin  = renderUserLettersAdmin;
window.saveUserLetterSettings  = saveUserLetterSettings;
