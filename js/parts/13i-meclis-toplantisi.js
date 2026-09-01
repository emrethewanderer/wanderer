/* ═══════════════════════════════════════════════════════════════════
   13i — HAFTALIK MECLİS TOPLANTISI · Suretler haftada bir söz alır
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     İç Meclis (10p) bir kayıt defteri değil, yaşayan bir divandır.
     Haftada bir — kullanıcı Meclis Salonu'na ilk girdiğinde — meclis
     TOPLANIR: suretler tek tek söz alır (hal'ine göre: müttefik destek
     verir, adlandırılmış bağ ister, sezilen yüzünü göstermek ister),
     bütünlük geçen haftayla kıyaslanır, Reis (sen) kapanış sözünü alır.
     LLM çağrısı YOK — konuşmalar hal + bağ seviyesinden deterministik.

   TETİK: renderMeclisSalonu (10p) sonunda window.mtMaybeConvene(suretler);
     yeni ISO haftası + suret varsa bir kez açılır. Manuel: window.mtConvene().

   Kalıcılık: SafeStorage per-uid (etw_meclis_toplanti_v1_<uid>)
     { lastWeek: 'YYYY-Wnn', lastButunluk: n }
   Konvansiyon: hardcoded TR; window.mt* expose; ses 13e; stiller
     css/parts/meclis-toplanti.css (link ile).
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage } from './00a-infrastructure.js';
import { computeButunluk } from './10p-w2-meclis.js';
import { t } from './15-i18n.js';

const STORAGE_KEY = 'etw_meclis_toplanti_v1';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Dil-güvenli yüzde: TR '%50' / EN '50%'
const _pct = (n) => (S._currentLang === 'tr') ? `%${n}` : `${n}%`;

/* ── ISO hafta anahtarı (yerel saat) ── */
function _weekKey(d) {
  const x = d ? new Date(d) : new Date();
  // ISO 8601: hafta Pazartesi başlar; yılın ilk Perşembe'sini içeren hafta 1'dir
  const t = new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const day = (t.getDay() + 6) % 7; // Pzt=0
  t.setDate(t.getDate() - day + 3); // haftanın Perşembe'si
  const jan4 = new Date(t.getFullYear(), 0, 4);
  const week = 1 + Math.round(((t - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
  return `${t.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function _userName() {
  const u = S.currentUser;
  return (u && (u.name || (u.user_metadata && u.user_metadata.name))) || t('mt.gezgin', 'Gezgin');
}

/* ── Persistans ── */
function _default() { return { lastWeek: null, lastButunluk: null }; }
function _key() { return `${STORAGE_KEY}_${(S.currentUser && S.currentUser.id) || 'anon'}`; }
function _load() {
  if (S._meclisToplanti) return S._meclisToplanti;
  let data = null;
  try { data = SafeStorage.get(_key()); } catch (_) {}
  S._meclisToplanti = Object.assign(_default(), (data && typeof data === 'object') ? data : {});
  return S._meclisToplanti;
}
function _save() {
  try { SafeStorage.set(_key(), S._meclisToplanti); } catch (e) { console.warn('mtSave:', e && e.message); }
}

/* ── Konuşma bankaları (hal + bağ seviyesine göre; deterministik seçim)
   Modül-yükünde DONMASIN → render anında t() ile kur (i18n). ── */
function _speechBank() {
  return {
    butunlesti: [t('mt.speech.ally.0'), t('mt.speech.ally.1'), t('mt.speech.ally.2')],
    bagYuksek:  [t('mt.speech.bond.0'), t('mt.speech.bond.1')],
    adlandi:    [t('mt.speech.named.0'), t('mt.speech.named.1')],
    sezilen:    [t('mt.speech.sensed.0'), t('mt.speech.sensed.1')],
  };
}

function _hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function _pickFor(slug, arr) {
  if (!arr || !arr.length) return '';
  return arr[_hash(`${slug}|${_weekKey()}`) % arr.length];
}

function _speechFor(s) {
  const SPEECH = _speechBank();
  if (s.hal === 'butunlesti') return _pickFor(s.slug, SPEECH.butunlesti);
  if (s.hal === 'adlandi' && (s.bag_seviyesi || 0) >= 70) return _pickFor(s.slug, SPEECH.bagYuksek);
  if (s.hal === 'adlandi') return _pickFor(s.slug, SPEECH.adlandi);
  return _pickFor(s.slug, SPEECH.sezilen);
}

/* ── Reis'in kapanış sözü — bütünlük + haftalık delta ── */
function _reisLine(pct, delta) {
  if (delta != null && delta > 0) return t('mt.reis.up').replace('{delta}', delta);
  if (delta != null && delta < 0) return t('mt.reis.down');
  if (pct >= 100) return t('mt.reis.full');
  if (pct > 0) return t('mt.reis.some');
  return t('mt.reis.empty');
}

/* ════════════════════════════════════════════════════════════════════
   TOPLANTI — haftada bir, Meclis Salonu'na girişte
════════════════════════════════════════════════════════════════════ */
export function mtMaybeConvene(suretler) {
  try {
    const list = suretler || S._suretler || [];
    if (!list.length) return;                      // toplanacak yüz yok
    const st = _load();
    if (st.lastWeek === _weekKey()) return;        // bu hafta toplandı
    if (document.getElementById('mt-portal')) return;
    // Başka tam-ekran akış varsa bu haftaki girişlerden birinde tekrar denenir
    if (document.getElementById('gl-portal') || document.getElementById('sm-portal') || document.getElementById('at-portal')) return;
    if (document.getElementById('ig-portal')) return; // İmge Kapısı (13z)
    mtConvene(list);
  } catch (_) {}
}

export function mtConvene(suretler) {
  const list = suretler || S._suretler || [];
  const st = _load();
  const pct = computeButunluk(list);
  const delta = (typeof st.lastButunluk === 'number') ? (pct - st.lastButunluk) : null;
  const name = esc(_userName());

  // Söz sırası: müttefikler önce, sonra bağı yüksek adlandırılmışlar, en çok 4 konuşma
  const order = { butunlesti: 0, adlandi: 1, sezilen: 2 };
  const speakers = list.slice()
    .sort((a, b) => (order[a.hal] ?? 3) - (order[b.hal] ?? 3) || (b.bag_seviyesi || 0) - (a.bag_seviyesi || 0))
    .slice(0, 4);

  const rows = speakers.map((s, i) => {
    const cls = s.hal === 'butunlesti' ? 'mt-row--ally' : (s.hal === 'adlandi' ? 'mt-row--named' : 'mt-row--sensed');
    const who = s.hal === 'sezilen' ? t('mt.row.sensed', 'Sezilen yüz') : (s.ad || s.unvan || t('mt.row.face', 'Yüz'));
    return `
      <div class="mt-row ${cls}" style="animation-delay:${0.5 + i * 0.55}s">
        <div class="mt-row-sigil">${esc(s.sigil || '◆')}</div>
        <div class="mt-row-body">
          <div class="mt-row-name">${esc(who)}</div>
          <div class="mt-row-line">“${esc(_speechFor(s))}”</div>
        </div>
      </div>`;
  }).join('');

  let portal = document.getElementById('mt-portal');
  if (!portal) { portal = document.createElement('div'); portal.id = 'mt-portal'; document.body.appendChild(portal); }
  portal.className = 'mt-portal';
  window.wtOverlayOpen?.('meclis');   // Kullanım Nabzı (00f)
  portal.innerHTML = `
    <div class="mt-veil"></div>
    <div class="mt-modal" role="dialog" aria-modal="true" aria-label="Haftalık Meclis">
      <div class="mt-kicker">${t('mt.kicker', 'HAFTALIK MECLİS')} · ${esc(_weekKey())}</div>
      <div class="mt-throne" aria-hidden="true">
        <div class="mt-halo" style="background:conic-gradient(var(--gold) ${pct}%, rgba(255,255,255,0.06) 0)"></div>
        <div class="mt-sun">☉</div>
      </div>
      <div class="mt-title">${t('mt.title', 'Meclis Toplandı')}</div>
      <div class="mt-sub">${t('mt.integrity', 'Bütünlük')} · ${_pct(pct)}${delta != null && delta !== 0 ? ` <span class="${delta > 0 ? 'mt-up' : 'mt-down'}">(${delta > 0 ? '+' : ''}${delta} ${t('mt.this_week', 'bu hafta')})</span>` : ''}</div>

      <div class="mt-rows">${rows}</div>

      <div class="mt-reis">
        <div class="mt-reis-kicker">${t('mt.reis_kicker', "REİS'İN SÖZÜ")} · ${name.toLocaleUpperCase(S._currentLang || 'tr')}</div>
        <div class="mt-reis-line">${esc(_reisLine(pct, delta))}</div>
      </div>

      <button class="mt-cta" id="mt-cta" type="button">${t('mt.cta', 'MECLİSİ AÇ')} ✦</button>
    </div>`;

  try { window.fxCue?.('whoosh'); } catch (_) {}
  try { window.fxHaptic?.('medium'); } catch (_) {}

  const close = () => {
    window.wtOverlayClose?.('meclis');   // Kullanım Nabzı (00f)
    st.lastWeek = _weekKey();
    st.lastButunluk = pct;
    _save();
    const modal = portal.querySelector('.mt-modal');
    if (modal) { modal.classList.add('mt-modal--out'); setTimeout(() => portal.remove(), 380); }
    else portal.remove();
  };
  document.getElementById('mt-cta')?.addEventListener('click', () => {
    try { window.fxCue?.('seal'); } catch (_) {}
    close();
  });
  portal.querySelector('.mt-veil')?.addEventListener('click', close);
}

/* ── window expose ── */
if (typeof window !== 'undefined') {
  window.mtMaybeConvene = mtMaybeConvene;
  window.mtConvene = mtConvene;
}
