/* ═══════════════════════════════════════════════════════════════════
   13r — GÜN SERİSİ · Wanderer LLM'e özel sohbet serisi
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Üç Mühür (10t/10u) artık yalnız Wanderer Studio'nun ritüel zeminini
     besler. Ama ücretsiz ön yüzün (Wanderer LLM sohbeti) de kendi
     sadakatini hak ediyor: gün içinde Emre'ye bir mesaj yazman yeter —
     o gün sayılır. Stüdyo'ya hiç girmesen de bu seri seninle büyür;
     Emre'yle konuşmanın kendisi bir mühürdür.

   TETİK: her gerçek kullanıcı mesajı (06 sendMessage → gsRecordChatDay).
     Ledger sohbete özel, Üç Mühür'ün merkezî defterinden
     (etw_activity_ledger_v1) TAMAMEN BAĞIMSIZ.

   GEÇİŞ (bir kereye mahsus benimseme): bu modül ilk kez çalıştığında
     (days boş + hiç seed edilmemiş) geçmiş sohbet günlerini S.allSessions'tan
     tarayıp deftere işler — sadık bir sohbet kullanıcısı bu değişiklikle
     serisini sıfırdan başlatmasın.

   Kalıcılık: SafeStorage per-uid (etw_gun_serisi_v1_<uid>). Supabase YOK.
   Konvansiyon: window.* TDZ-güvenli erişim; t() ile i18n.
   Stiller: css/parts/chat.css (.gs-streak-btn, ch-topbar-btns yanında).
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage, localDayKey, showToast } from './00a-infrastructure.js';
import { t } from './15-i18n.js';

const STORAGE_KEY = 'etw_gun_serisi_v1';

function _default() { return { days: [], seeded: false }; }
function _key() { return `${STORAGE_KEY}_${(S.currentUser && S.currentUser.id) || 'anon'}`; }

export function gsSave() {
  try { SafeStorage.set(_key(), S._gunSerisi); } catch (e) { console.warn('gsSave:', e && e.message); }
}
export function gsLoad() {
  try {
    const data = SafeStorage.get(_key());
    if (data && typeof data === 'object') S._gunSerisi = Object.assign(_default(), data);
  } catch (e) { console.warn('gsLoad:', e && e.message); }
}

/* Geçmiş sohbet günlerini bir kere deftere benimse (veri kaybı yok, tekrar etmez) */
function _seedFromHistory() {
  if (S._gunSerisi.seeded) return;
  S._gunSerisi.seeded = true;
  try {
    const days = new Set(S._gunSerisi.days || []);
    Object.values(S.allSessions || {}).forEach(arr => {
      if (!Array.isArray(arr)) return;
      arr.forEach(m => {
        if (m && m.role === 'user' && m.created_at) days.add(localDayKey(new Date(m.created_at)));
      });
    });
    S._gunSerisi.days = Array.from(days).slice(-400);
  } catch (_) {}
  gsSave();
}

export function gsInit() {
  if (!S._gunSerisi) S._gunSerisi = _default();
  gsLoad();
  _seedFromHistory();
  gsRender();
}

/* ── Seri hesabı — ardışık gün zinciri (calculateStreak/usStreakFromDays ile aynı mantık) ── */
function gsStreakFromDays(daysArr) {
  const set = new Set(daysArr || []);
  if (!set.size) return 0;
  const sorted = Array.from(set).map(k => {
    const [y, mo, da] = String(k).split('-').map(Number);
    return new Date(y, mo || 0, da || 1);
  }).sort((a, b) => b - a);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sinceLast = Math.round((today - sorted[0]) / 86400000);
  if (sinceLast > 1) return 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const gap = Math.round((sorted[i - 1] - sorted[i]) / 86400000);
    if (gap === 1) streak++; else break;
  }
  return streak;
}

export function gsCurrentStreak() {
  try { return gsStreakFromDays(S._gunSerisi && S._gunSerisi.days); } catch (_) { return 0; }
}

/** Bugün Emre'yle konuşuldu mu işle. Yeni günse true döner. */
export function gsRecordChatDay(d = new Date()) {
  if (!S._gunSerisi) S._gunSerisi = _default();
  const key = localDayKey(d);
  if (S._gunSerisi.days.includes(key)) return false;
  S._gunSerisi.days.push(key);
  S._gunSerisi.days = S._gunSerisi.days.slice(-400);
  gsSave();
  gsRender();
  try { window.fxCue?.('streak'); } catch (_) {}
  return true;
}

/* ── UI — sohbet topbar'ındaki rozet ── */
export function gsRender() {
  const btn = document.getElementById('gs-streak-btn');
  const n = document.getElementById('gs-streak-n');
  if (!btn || !n) return;
  const streak = gsCurrentStreak();
  n.textContent = streak;
  btn.style.display = streak > 0 ? 'inline-flex' : 'none';
}

export function gsShowInfo() {
  const n = gsCurrentStreak();
  if (n <= 0) return;
  const msg = n === 1 ? t('gs.toast.first') : t('gs.toast.n').replace('{n}', n);
  /* Rozete dokunan kişi "bu sayı neyi sayıyor" diye sorar: iki seri var ve
     hiçbir yüzey sınırlarını söylemiyordu (İç Çalışma 05 · boşluk D). */
  showToast(`${msg} ${t('gs.toast.kapsam')}`);
}

/* ── window expose (TDZ-güvenli modüller-arası erişim + inline onclick) ── */
if (typeof window !== 'undefined') {
  window.gsInit = gsInit;
  window.gsRecordChatDay = gsRecordChatDay;
  window.gsCurrentStreak = gsCurrentStreak;
  window.gsShowInfo = gsShowInfo;
  window.gsRender = gsRender;
}
