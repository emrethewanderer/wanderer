/* ═══════════════════════════════════════════════════════════════════
   13m — KOTA MOTORU · Claude tarzı çift kota (5 saatlik pencere + haftalık)
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Wanderer ücretsiz katmanı Claude'un kota modelini izler: sınır bir
     ceza değil, bir eşiktir. 5 saatlik pencere bir derin seansa yeter;
     haftalık tavan her gün dolu seans yapan adanmışı Studio kapısına
     getirir. Duvar sıcak ve dürüst konuşur — ücretsiz sınırı şeffafça
     anlatır, sonra Studio kapısını gösterir. Suçlama yok.

   MEKANİK:
     · Sayaç sunucuda: quota_consume / quota_status RPC'leri
       (migrations/000_wanderer_schema.sql — ELLE).
     · RPC yoksa motor sessizce devre dışı kalır; 06-summary-chat.js
       eski yerel günlük sayaca düşer (hiçbir şey kırılmaz). Geçici ağ
       hatası motoru KAPATMAZ — sonraki temasta yeniden denenir.
     · server_enforced=true ise tüketim llm-chat'te olur; client yalnız
       status okur ve iyimser artırır (gerçek 429'u 06 duvara çevirir).
     · Mini kota çemberi iki composer ayağında ([data-kt-ring]); dokununca
       detay kartı: 5 saat = altın halka, hafta = lapis halka, geri sayım,
       Studio CTA.
     · PREMIUM: çember gizlenmez — altın↔lapis dönen "sınırsız" halka
       çizilir; dokununca Studio kartı ("pencere yok, duvar yok").
     · ULTRA ARMAĞANI (10u köprüsü): Üç Mühür aynı gün tamamlanınca
       ktGrantUltraBonus → quota_bonus_grant; pencereler kapandığında
       armağan mesajları devreye girer (reason='bonus').
   Konvansiyon: window.kt* expose.
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { sb } from '../config.js';
import { localISODate, showToast } from './00a-infrastructure.js';
import { t } from './15-i18n.js';

const _C_MINI = 2 * Math.PI * 8.5;  // mini halka çevresi (r=8.5)
const _C_BIG  = 2 * Math.PI * 34;   // detay halkası çevresi (r=34)

/* kota motoru durumu: null=henüz bilinmiyor (geçici hata dahil — yeniden
   denenir), false=RPC yok / migration 018 eksik (kalıcı fallback), true=aktif */
let _available = null;
let _tickTimer = null;

/* "Fonksiyon yok" (migration eksik) ile geçici ağ hatasını ayır — yalnız
   ilki motoru kalıcı kapatır; geçici hata sonraki temasta yeniden denenir */
function _missingFn(e) {
  if (!e) return false;
  if (e.code === '42883' || e.code === 'PGRST202') return true;
  const msg = String(e.message || e.details || '');
  return /could not find the function|does not exist/i.test(msg);
}

/* ── Sanal pencere — süresi dolan pencereyi sunucuya sormadan sıfır say ── */
function _norm(q) {
  if (!q) return null;
  const now = Date.now();
  const n = { ...q };
  if (n.reset_5h && now >= new Date(n.reset_5h).getTime()) { n.used_5h = 0; n.reset_5h = null; }
  if (n.reset_week && now >= new Date(n.reset_week).getTime()) { n.used_week = 0; n.reset_week = null; }
  return n;
}

/* Ultra Armağanı — bugüne ait kalan armağan mesajı (gün geçtiyse 0) */
function _bonusLeft(q) {
  if (!q || !q.bonus_day || !(q.bonus_left > 0)) return 0;
  return q.bonus_day === localISODate() ? q.bonus_left : 0;
}

/* Max = sınırsız; Pro capped kota içinde akar (bkz. plan v2 md.3 — Pro
   "cömert sınırlı", yalnız Max "sınırsız"). q.tier sunucudan gelir. */
function _isPrem(q) { return S.isPremiumPlus || !!(q && q.tier === 'max') || !!(q && q.premium); }
function _isPro(q)  { return !_isPrem(q) && (S.isPremium || (q && q.tier === 'pro')); }

function _fmtCountdown(iso) {
  if (!iso) return null;
  let ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const g  = Math.floor(ms / 86400000); ms -= g * 86400000;
  const sa = Math.floor(ms / 3600000);  ms -= sa * 3600000;
  const dk = Math.ceil(ms / 60000);
  if (g > 0)  return t('kt.cd.dh', '{d} gün {h} sa').replace('{d}', g).replace('{h}', sa);
  if (sa > 0) return t('kt.cd.hm', '{h} sa {m} dk').replace('{h}', sa).replace('{m}', dk);
  if (dk > 1) return t('kt.cd.m', '{m} dk').replace('{m}', dk);
  return t('kt.cd.soon', 'az kaldı');
}

/* ═══ SUNUCU ÇAĞRILARI ═══ */

export async function ktStatus() {
  try {
    const { data, error } = await sb.rpc('quota_status');
    if (error) throw error;
    _available = true;
    S._kota = data;
    ktRender();
    return data;
  } catch (e) {
    // 404 / 42883 → migration 018 uygulanmamış: motor kalıcı kapanır, yerel
    // sayaç devralır. Geçici ağ hatası → null kalır, sonraki temas yeniden dener.
    if (_available === null && _missingFn(e)) _available = false;
    ktRender();
    return null;
  }
}

/* Kriz lütfu: kriz enjeksiyonu aktifken (13-extras) duvarı atlat; sayaç
   cihaz-yerel ve gün anahtarlı. Depolama hatasında kullanıcı aleyhine
   davranma — lütuf geçer (kriz anında yanlış tarafta hata yapılmaz). */
function _crisisGraceOk() {
  if (!(S._crisisMsgLeft > 0)) return false;
  try {
    const k = 'etw_crisis_grace_' + localISODate();
    const used = parseInt(localStorage.getItem(k) || '0', 10);
    if (used >= 15) return false;
    localStorage.setItem(k, String(used + 1));
    try { window.wtLogSafety?.('crisis_grace'); } catch (_) {}
    return true;
  } catch (_) { return true; }
}

/* Gönderim kapısı — 06-summary-chat.js mesajı yollamadan hemen önce çağırır.
   Dönüş: { available, allowed, reason, q }
   available=false → kota motoru yok, çağıran yerel günlük sayaca düşer.
   reason='bonus' → mesaj Ultra Armağanı'ndan geçti (allowed=true). */
export async function ktGate() {
  // Yalnız Max sınırsız kısayoldan geçer — Pro capped kotayı gerçekten tüketir.
  if (S.isPremiumPlus) return { available: _available === true, allowed: true, q: _norm(S._kota) };

  // EMNİYET KATMANI · Faz 2 — kriz penceresinde duvar inmez.
  // Suistimale karşı günde en çok 15 mesajlık lütuf. Sunucu zorlaması yine
  // 429 döndürebilir; o duvara 06 kriz kartı ekler. Kalıcı çözüm sunucuda
  // (SETUP-LLM-CHAT · kriz muafiyeti).
  if (_crisisGraceOk()) return { available: _available === true, allowed: true, reason: 'crisis', q: _norm(S._kota) };

  // İlk temas: motorun varlığını öğren
  if (_available === null) await ktStatus();
  if (_available === false) return { available: false, allowed: true };

  const cached = _norm(S._kota);

  // Sunucu zorlaması açık: tüketim llm-chat'te — burada yalnız hızlı duvar
  // + iyimser sayaç (gerçek 429 yine de yakalanır)
  if (cached?.server_enforced) {
    const blockedW = cached.used_week >= cached.limit_week;
    const blocked5 = cached.used_5h >= cached.limit_5h;
    if (blockedW || blocked5) {
      const bonus = _bonusLeft(cached);
      if (bonus > 0) {
        S._kota = { ...cached, bonus_left: cached.bonus_left - 1 };
        ktRender();
        _bonusToastMaybe(S._kota);
        return { available: true, allowed: true, reason: 'bonus', q: S._kota };
      }
      return { available: true, allowed: false, reason: blockedW ? 'week' : 'window', q: cached };
    }
    S._kota = {
      ...cached,
      used_5h:   cached.used_5h + 1,
      used_week: cached.used_week + 1,
      reset_5h:   cached.reset_5h   || new Date(Date.now() + 5 * 3600000).toISOString(),
      reset_week: cached.reset_week || new Date(Date.now() + 7 * 86400000).toISOString(),
    };
    ktRender();
    return { available: true, allowed: true, q: S._kota };
  }

  try {
    // p_day = yerel gün → Ultra Armağanı gün sınırı client saatiyle örtüşür.
    // Migration 019 henüz yoksa parametreli imza bulunamaz — 018 imzasına düş.
    let resp = await sb.rpc('quota_consume', { p_day: localISODate() });
    if (resp.error && _missingFn(resp.error)) resp = await sb.rpc('quota_consume');
    const { data, error } = resp;
    if (error) throw error;
    S._kota = data;
    ktRender();
    if (data.reason === 'bonus') _bonusToastMaybe(data);
    return { available: true, allowed: data.allowed !== false, reason: data.reason || null, q: data };
  } catch (e) {
    // Tüketim çağrısı düştü — kullanıcıyı cezalandırma, yerel sayaca düş.
    // Migration eksikse motoru kalıcı kapat; ağ hatasıysa sonraki tur dener.
    if (_missingFn(e)) { _available = false; ktRender(); }
    return { available: false, allowed: true };
  }
}

/* ═══ ULTRA ARMAĞANI — 10u Üç Mühür köprüsü ═══ */

/* Üç Mühür aynı gün tamamlandığında 10u çağırır. Günde bir kez sunucuya
   yazılır (quota_bonus_grant idempotent); client tarafında da ucuz guard
   var — bugün zaten verilmişse RPC atlanır. Dönüş: verilen mesaj sayısı
   (modal metni için) ya da null (premium / motor yok). */
export async function ktGrantUltraBonus() {
  if (!S.currentUser || S.isPremiumPlus) return null; // Max'te duvar yok — armağana gerek yok
  if (_available === false) return null;          // motor yok → 06 yerel sayaca +9 uygular
  const today = localISODate();
  if (S._kota && S._kota.bonus_day === today) {
    return (S._kota.bonus_granted | 0) || 9;      // bugün zaten verildi
  }
  try {
    const { data, error } = await sb.rpc('quota_bonus_grant', { p_day: today });
    if (error) throw error;
    _available = true;
    S._kota = data;
    ktRender();
    return (data && (data.bonus_granted | 0)) || 9;
  } catch (e) {
    // migration 019 yok ya da ağ hatası — sessiz; yerel fallback ödülü korur
    return null;
  }
}

/* Günde bir kez: armağan moduna ilk geçişte küçük bildirim */
function _bonusToastMaybe(q) {
  const day = localISODate();
  if (S._ktBonusToastDay === day) return;
  S._ktBonusToastDay = day;
  const total = (q && (q.bonus_granted | 0)) || 9;
  try { showToast(t('kt.bonus_toast', '✶ Ultra Armağanı devrede — bugüne +{n} mesaj').replace('{n}', total)); } catch (_) {}
}

/* ═══ MİNİ HALKA — composer ayaklarındaki kota çemberi ═══ */

/* Statik markup ücretsiz SVG halkası içerir; premium'da SVG gizlenip
   dönen altın↔lapis halka eklenir. Geri dönüş (ktPreview) kayıpsızdır. */
function _setRingMode(btn, mode) {
  const svg = btn.querySelector('svg');
  let prem = btn.querySelector('.kt-prem');
  if (mode === 'premium') {
    if (svg) svg.style.display = 'none';
    if (!prem) {
      prem = document.createElement('span');
      prem.className = 'kt-prem';
      prem.setAttribute('aria-hidden', 'true');
      prem.innerHTML = '<span class="kt-prem-spin"></span><span class="kt-prem-star">✦</span>';
      btn.appendChild(prem);
    }
    prem.style.display = '';
  } else {
    if (svg) svg.style.display = '';
    if (prem) prem.style.display = 'none';
  }
}

export function ktRender() {
  const btns = document.querySelectorAll('[data-kt-ring]');
  if (!btns.length) return;

  const q = _norm(S._kota);

  // Studio / deneme — sınırsız: özel dönen halka (RPC gerekmez)
  if (_isPrem(q)) {
    btns.forEach(btn => {
      _setRingMode(btn, 'premium');
      btn.style.display = '';
      btn.classList.remove('kt-low', 'kt-empty', 'kt-bonus');
      btn.setAttribute('aria-label', t('kt.aria_unlimited', 'Wanderer Studio — sınırsız kullanım'));
    });
    _stopTick();
    return;
  }

  const show = _available === true && !!q;
  btns.forEach(btn => { _setRingMode(btn, 'free'); btn.style.display = show ? '' : 'none'; });
  if (!show) { _stopTick(); return; }

  const left5 = Math.max(0, q.limit_5h - q.used_5h);
  const ratio = q.limit_5h > 0 ? left5 / q.limit_5h : 1;
  const weekBlocked = q.used_week >= q.limit_week;
  const bonus = _bonusLeft(q);
  const bonusTotal = Math.max(bonus, (q.bonus_granted | 0) || 9);
  const outOfWindows = weekBlocked || left5 <= 0;
  const onBonus = outOfWindows && bonus > 0;   // pencereler kapalı, armağan taşıyor
  const empty = outOfWindows && bonus <= 0;
  const low   = !outOfWindows && ratio <= 0.3;

  btns.forEach(btn => {
    btn.classList.toggle('kt-low', low);
    btn.classList.toggle('kt-empty', empty);
    btn.classList.toggle('kt-bonus', onBonus);
    btn.setAttribute('aria-label', onBonus
      ? t('kt.aria_bonus', 'Ultra Armağanı: {n} mesaj').replace('{n}', bonus)
      : weekBlocked
        ? t('kt.aria_week_full', 'Haftalık kullanım doldu')
        : t('kt.aria_left', 'Kalan kullanım: {n} / {total}')
            .replace('{n}', left5).replace('{total}', q.limit_5h));
    const arc = btn.querySelector('.kt-ring-arc');
    if (arc) arc.setAttribute('stroke-dashoffset',
      String(_C_MINI * (1 - (onBonus ? bonus / bonusTotal : ratio))));
  });

  _startTick();
  const sheet = document.getElementById('kt-sheet');
  if (sheet?.classList.contains('open') && sheet.dataset.mode !== 'premium') _renderSheet();
}

function _startTick() {
  if (_tickTimer) return;
  // 30 sn'de bir: geri sayım metni + süresi dolan pencerenin sanal sıfırlanması
  _tickTimer = setInterval(ktRender, 30000);
}
function _stopTick() {
  if (_tickTimer) { clearInterval(_tickTimer); _tickTimer = null; }
}

/* ═══ DETAY KARTI — iki halka + geri sayım + Studio CTA ═══ */

function _freeSheetHTML(tier) {
  const isPro = tier === 'pro';
  return `
    <div class="kt-card">
      <button class="kt-close" onclick="ktCloseSheet()" aria-label="Kapat">×</button>
      <div class="kt-head">
        <div class="kt-title">${t('kt.usage_right', 'KULLANIM HAKKI')}</div>
        <div class="kt-sub">${isPro
          ? t('kt.pro_sub', 'Wanderer Pro · cömert pencere')
          : t('kt.free_sub', 'Wanderer ücretsiz · iki pencere, tek yol')}</div>
      </div>
      <div class="kt-rings">
        <div class="kt-ring-block">
          <svg viewBox="0 0 84 84" width="104" height="104" aria-hidden="true">
            <circle class="kt-big-track" cx="42" cy="42" r="34"/>
            <circle class="kt-big-arc kt-arc-5h" id="kt-arc-5h" cx="42" cy="42" r="34"
              stroke-dasharray="${_C_BIG.toFixed(2)}" stroke-dashoffset="0" transform="rotate(-90 42 42)"/>
          </svg>
          <div class="kt-ring-num" id="kt-num-5h">—</div>
          <div class="kt-ring-label">${isPro ? t('kt.window_24h', 'GÜNLÜK PENCERE') : t('kt.window_5h', '5 SAATLİK PENCERE')}</div>
          <div class="kt-ring-reset" id="kt-reset-5h"></div>
        </div>
        <div class="kt-ring-block">
          <svg viewBox="0 0 84 84" width="104" height="104" aria-hidden="true">
            <circle class="kt-big-track" cx="42" cy="42" r="34"/>
            <circle class="kt-big-arc kt-arc-week" id="kt-arc-week" cx="42" cy="42" r="34"
              stroke-dasharray="${_C_BIG.toFixed(2)}" stroke-dashoffset="0" transform="rotate(-90 42 42)"/>
          </svg>
          <div class="kt-ring-num" id="kt-num-week">—</div>
          <div class="kt-ring-label">${t('kt.weekly', 'HAFTALIK')}</div>
          <div class="kt-ring-reset" id="kt-reset-week"></div>
        </div>
      </div>
      <div class="kt-bonus-row" id="kt-bonus-row" style="display:none;"
        title="${t('kt.bonus_title', 'Üç Mührü aynı gün tamamladın — pencereler dolsa da bu mesajlar bugün seninle.')}">
        <span class="kt-bonus-glyph" aria-hidden="true">✶</span>
        <span>${t('kt.bonus_label', 'ÜÇ MÜHÜR ARMAĞANI · bugün {n} mesaj').replace('{n}', '<b id="kt-bonus-n">+0</b>')}</span>
      </div>
      <div class="kt-note">${isPro
        ? t('kt.note_pro', 'Pencere ilk mesajınla açılır; 24 saat sonra tamamen yenilenir.')
        : t('kt.note', 'Pencere ilk mesajınla açılır; 5 saat sonra tamamen yenilenir. Haftalık alan 7 günde bir yenilenir.')}</div>
      <div class="kt-cta-row">
        <button class="kt-cta" onclick="ktCloseSheet();switchView('sub')">${isPro
          ? t('kt.cta_max', 'SINIRSIZ KONUŞ · MAX →')
          : t('kt.cta_studio', 'DUVARSIZ KONUŞ · STUDIO →')}</button>
      </div>
    </div>`;
}

function _premiumSheetHTML() {
  return `
    <div class="kt-card kt-card--prem">
      <button class="kt-close" onclick="ktCloseSheet()" aria-label="Kapat">×</button>
      <div class="kt-head">
        <div class="kt-title kt-title--prem">WANDERER STUDIO</div>
        <div class="kt-sub">${t('kt.prem_sub', 'Sınırsız yol · pencere yok, duvar yok')}</div>
      </div>
      <div class="kt-prem-hero" aria-hidden="true">
        <span class="kt-prem-hero-ring"></span>
        <span class="kt-prem-hero-inf">∞</span>
      </div>
      <div class="kt-prem-rows">
        <div class="kt-prem-row"><span>${t('kt.prem.window', '5 saatlik pencere')}</span><b>${t('kt.unlimited', 'Sınırsız')}</b></div>
        <div class="kt-prem-row"><span>${t('kt.prem.weekly', 'Haftalık tavan')}</span><b>${t('kt.unlimited', 'Sınırsız')}</b></div>
      </div>
      <div class="kt-note">${t('kt.prem.note', 'Studio yolcusu olarak duvarlar senin için kalktı. İstediğin an, istediğin kadar konuş. Mesele sensin — ve yol açık.')}</div>
    </div>`;
}

function _ensureSheet(mode) {
  let el = document.getElementById('kt-sheet');
  if (!el) {
    el = document.createElement('div');
    el.id = 'kt-sheet';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', t('kt.aria_sheet', 'Kullanım hakkı'));
    el.addEventListener('click', (e) => { if (e.target === el) ktCloseSheet(); });
    document.body.appendChild(el);
  }
  if (el.dataset.mode !== mode) {
    el.dataset.mode = mode;
    el.innerHTML = mode === 'premium' ? _premiumSheetHTML() : _freeSheetHTML(mode);
  }
  return el;
}

function _renderSheet() {
  const q = _norm(S._kota);
  if (!q) return;
  const left5 = Math.max(0, q.limit_5h - q.used_5h);
  const leftW = Math.max(0, q.limit_week - q.used_week);
  const r5 = q.limit_5h > 0 ? left5 / q.limit_5h : 1;
  const rW = q.limit_week > 0 ? leftW / q.limit_week : 1;

  const arc5 = document.getElementById('kt-arc-5h');
  const arcW = document.getElementById('kt-arc-week');
  if (arc5) {
    arc5.setAttribute('stroke-dashoffset', String(_C_BIG * (1 - r5)));
    arc5.classList.toggle('kt-arc-empty', left5 <= 0);
  }
  if (arcW) {
    arcW.setAttribute('stroke-dashoffset', String(_C_BIG * (1 - rW)));
    arcW.classList.toggle('kt-arc-empty', leftW <= 0);
  }

  const num5 = document.getElementById('kt-num-5h');
  const numW = document.getElementById('kt-num-week');
  if (num5) num5.textContent = String(left5);
  if (numW) numW.textContent = String(leftW);

  const cd5 = _fmtCountdown(q.reset_5h);
  const cdW = _fmtCountdown(q.reset_week);
  const re5 = document.getElementById('kt-reset-5h');
  const reW = document.getElementById('kt-reset-week');
  if (re5) re5.textContent = cd5 ? t('kt.renews_in', '{cd} sonra yenilenir').replace('{cd}', cd5) : t('kt.opens_first', 'İlk mesajla açılır');
  if (reW) reW.textContent = cdW ? t('kt.renews_in', '{cd} sonra yenilenir').replace('{cd}', cdW) : t('kt.opens_first', 'İlk mesajla açılır');

  // Ultra Armağanı satırı — bugün armağan varsa görünür
  const bonus = _bonusLeft(q);
  const row = document.getElementById('kt-bonus-row');
  if (row) {
    row.style.display = bonus > 0 ? '' : 'none';
    const n = document.getElementById('kt-bonus-n');
    if (n) n.textContent = `+${bonus}`;
  }
}

export function ktOpenSheet() {
  const prem = _isPrem(S._kota);
  const el = _ensureSheet(prem ? 'premium' : (_isPro(S._kota) ? 'pro' : 'free'));
  if (!prem) {
    _renderSheet();
    // Arkaplanda tazele — başka cihazdaki kullanım yansısın
    ktStatus();
  }
  el.classList.add('open');
}

export function ktCloseSheet() {
  document.getElementById('kt-sheet')?.classList.remove('open');
}

/* ═══ DUVAR METİNLERİ — 06-summary-chat.js duvar balonlarında kullanır ═══ */

export function ktWallText(reason, q) {
  const n = _norm(q);
  if (reason === 'window') {
    const cd = _fmtCountdown(n?.reset_5h);
    return {
      main: t('kt.wall.window.main', 'Bu pencere doldu. Şimdi konuşma değil, sindirme zamanı — söylediklerinle biraz yalnız kal.'),
      sub:  cd
        ? t('kt.wall.window.sub_cd', "_Pencere {cd} sonra yeniden açılır. Studio'da pencere yok — istediğin an konuşursun._").replace('{cd}', cd)
        : t('kt.wall.window.sub', "_Pencere birazdan yeniden açılır. Studio'da pencere yok — istediğin an konuşursun._"),
      cta:  t('kt.wall.cta', "Studio'yu Gör →"),
    };
  }
  const cd = _fmtCountdown(n?.reset_week);
  return {
    main: t('kt.wall.week.main', 'Bu haftanın ücretsiz alanı doldu. Burada konuştuklarınla biraz kal — birlikte iyi bir yol aldık.'),
    sub:  cd
      ? t('kt.wall.week.sub_cd', "_Haftalık alan {cd} sonra yenilenir. Studio'da duvar yok — istediğin an, istediğin kadar konuşursun._").replace('{cd}', cd)
      // kota motoru kapalı (yerel günlük sayaç) → süre bilinmez; klasik duvar metni
      : t('kt.wall.week.sub', '_Studio bu duvarı tümüyle kaldırır — istediğin an, istediğin kadar konuşursun._'),
    cta:  t('kt.wall.cta', "Studio'yu Gör →"),
  };
}

/* ═══ INIT — 03-auth-shell post-auth çağırır ═══ */

export function ktInit() {
  if (!S.currentUser) return;
  if (S.isPremiumPlus) { ktRender(); return; }  // sınırsız halka — RPC'ye dokunma
  ktStatus();
  document.addEventListener('visibilitychange', () => {
    // _available=false (migration yok) kalıcıdır; null (geçici hata) yeniden denenir
    if (!document.hidden && _available !== false && !S.isPremiumPlus) ktStatus();
  });
}

/* ── window expose ── */
if (typeof window !== 'undefined') {
  window.ktOpenSheet  = ktOpenSheet;
  window.ktCloseSheet = ktCloseSheet;
  window.ktStatus     = ktStatus;
  window.ktInit       = ktInit;       // abonelik değişince 08 kotayı yeniden kurar
  window.ktGrantUltraBonus = ktGrantUltraBonus;
  // dev/test: window.ktPreview({used_5h:11,limit_5h:15,used_week:52,limit_week:75,
  //   reset_5h:'…',reset_week:'…',bonus_day:'YYYY-MM-DD',bonus_left:4,bonus_granted:9})
  //   — sunucusuz çember + detay kartı önizlemesi
  window.ktPreview = (q) => {
    // premium hesapta da çizilsin diye bayrak bir anlığına indirilir;
    // 30 sn'lik tick sonraki ktRender'da gerçek duruma geri döner.
    // Sheet doğrudan açılır (ktOpenSheet'in ktStatus tazelemesi atlanır).
    S._kota = q; _available = true;
    const _p = S.isPremiumPlus; S.isPremiumPlus = false;
    try {
      ktRender();
      const el = _ensureSheet(q?.tier === 'pro' ? 'pro' : 'free'); _renderSheet(); el.classList.add('open');
    } finally { S.isPremiumPlus = _p; }
  };
}
