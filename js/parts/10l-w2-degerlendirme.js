/* ═══════════════════════════════════════════════════════════════════
   10l — DÖNEM DEĞERLENDİRMELERİ (Gün / Hafta / Ay / Yıl)
   ───────────────────────────────────────────────────────────────────
   FELSEFE (Zihniyet Devrimi'ne Çağrı, denemeler 86-89):
     "Yılını/Ayını/Haftanı/Gününü değerlendir." Kendinle Konuşmak
     yöntemiyle geçmişe bak, şimdiyi tart, geleceği tasarla.
     Hafta SORGU 4: "Günlük %1 ilerlemek seni yıl sonu 37 katına çıkarır."

   Her tören: kitabın net soru seti + (opsiyonel) AI özet + %1 bileşik
   büyüme görseli.
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage, showToast, localISODate, recordActivityDay } from './00a-infrastructure.js';
import { callLLM } from './04-llm-hero-history.js';
import { awardElmas } from './10g-w2-wanderer-game.js';
import { t } from './15-i18n.js';
import { p } from './16-i18n-prompts.js';

const STORAGE_KEY = 'etw_reviews_v1';
const NOW = () => new Date().toISOString();
const UID = () => 'rv_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

/* Dönem iskeleti — glyph + soru sayısı sabit; metinler i18n'den render anında
   çözülür (modül-yükünde dil donmasın). [[tr-en-i18n-tamamlama]] */
const REVIEW_DEFS = {
  gun:   { glyph: '☽', qn: 4 },
  hafta: { glyph: '◷', qn: 4 },
  ay:    { glyph: '◑', qn: 3 },
  yil:   { glyph: '✷', qn: 4 },
};

function _period(p) {
  const d = REVIEW_DEFS[p];
  if (!d) return null;
  const questions = [];
  for (let i = 0; i < d.qn; i++) questions.push(t(`rv.period.${p}.q${i}`));
  return {
    glyph: d.glyph,
    title: t(`rv.period.${p}.title`),
    label: t(`rv.period.${p}.label`),
    intro: t(`rv.period.${p}.intro`),
    questions,
  };
}

/* ── Dönem anahtarı (periodKey) ── */
function _isoWeek(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
function _periodKey(period, d = new Date()) {
  if (period === 'gun') return localISODate(d);
  if (period === 'hafta') return _isoWeek(d);
  if (period === 'ay') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (period === 'yil') return String(d.getFullYear());
  return '';
}

/* ══════════════════════════════════════════════════════════════
   PERSİSTANS
══════════════════════════════════════════════════════════════ */
export function rvSave() {
  try {
    const uid = S.currentUser?.id || 'anon';
    SafeStorage.set(`${STORAGE_KEY}_${uid}`, {
      day: S._reviews.day, week: S._reviews.week, month: S._reviews.month, year: S._reviews.year,
      tanik: S._reviews.tanik,
    });
  } catch (e) { console.warn('rvSave:', e?.message); }
}

export function rvLoad() {
  try {
    const uid = S.currentUser?.id || 'anon';
    const data = SafeStorage.get(`${STORAGE_KEY}_${uid}`);
    if (data && typeof data === 'object') {
      S._reviews.day = Array.isArray(data.day) ? data.day : [];
      S._reviews.week = Array.isArray(data.week) ? data.week : [];
      S._reviews.month = Array.isArray(data.month) ? data.month : [];
      S._reviews.year = Array.isArray(data.year) ? data.year : [];
      S._reviews.tanik = Array.isArray(data.tanik) ? data.tanik : [];
    }
  } catch (e) { console.warn('rvLoad:', e?.message); }
}

export function rvInit() { rvLoad(); }

const _bucket = { gun: 'day', hafta: 'week', ay: 'month', yil: 'year' };

/* ══════════════════════════════════════════════════════════════
   AKIŞ
══════════════════════════════════════════════════════════════ */
export function rvOpen() {
  // Ayrı sayfa (popup yok): dönem-seç adımına dön + Değerlendirme view'ına geç.
  _showStep('pick');
  _renderPickStatus();
  if (typeof window.switchView === 'function') window.switchView('degerlendirme');
}

export function rvClose() {
  S._reviews.current = null;
  // Sayfadan çık → Bugün'e dön.
  if (typeof window.switchView === 'function') window.switchView('bugun');
}

/* Değerlendirme sayfası (#degerlendirme-view) açılırken: dönem-seç adımına dön. */
export function loadDegerlendirmeView() {
  _showStep('pick');
  _renderPickStatus();
}

function _showStep(step) {
  for (const s of ['pick', 'questions', 'done']) {
    const el = document.getElementById(`rv-step-${s}`);
    if (el) el.style.display = (s === step) ? '' : 'none';
  }
}

function _renderPickStatus() {
  // Her dönem için bu dönemin değerlendirmesi yapıldı mı rozetini güncelle
  for (const [period, bucket] of Object.entries(_bucket)) {
    const key = _periodKey(period);
    const done = (S._reviews[bucket] || []).some(r => r.periodKey === key);
    const el = document.getElementById(`rv-pick-status-${period}`);
    if (el) el.textContent = done ? t('rv.pick.done') : '';
  }
}

export function rvSelectPeriod(period) {
  const def = _period(period);
  if (!def) return;
  try { window.wtLogRitus?.('degerlendirme', 'basladi'); } catch (_) {}
  S._reviews.current = { id: UID(), period, periodKey: _periodKey(period), created_at: NOW(), answers: {} };

  const titleEl = document.getElementById('rv-q-title');
  if (titleEl) titleEl.textContent = `${def.glyph} ${def.title}`;
  const introEl = document.getElementById('rv-q-intro');
  if (introEl) introEl.textContent = def.intro;
  const keyEl = document.getElementById('rv-q-key');
  if (keyEl) keyEl.textContent = S._reviews.current.periodKey;

  const listEl = document.getElementById('rv-q-list');
  if (listEl) {
    listEl.innerHTML = def.questions.map((q, i) => `
      <div class="sk-q-block">
        <div class="sk-q-text">${q.replace(/</g, '&lt;')}</div>
        <textarea class="sk-q-input" id="rv-q-${i}" rows="2" placeholder="${t('rv.answer_ph')}"></textarea>
      </div>`).join('');
  }
  _showStep('questions');
}

export async function rvFinish() {
  const cur = S._reviews.current;
  if (!cur) return;
  const def = _period(cur.period);

  cur.answers = {};
  def.questions.forEach((q, i) => {
    cur.answers[i] = { q, a: (document.getElementById(`rv-q-${i}`)?.value || '').trim() };
  });
  const anyAnswer = Object.values(cur.answers).some(e => e.a.length > 0);
  if (!anyAnswer) { showToast(t('rv.toast.answer_one')); return; }

  const bucket = _bucket[cur.period];
  // Aynı dönem için önceki kaydı değiştir (idempotent)
  S._reviews[bucket] = (S._reviews[bucket] || []).filter(r => r.periodKey !== cur.periodKey);
  S._reviews[bucket].push(cur);
  if (S._reviews[bucket].length > 60) S._reviews[bucket].shift();
  rvSave();
  awardElmas(cur.period === 'yil' ? 20 : cur.period === 'ay' ? 12 : cur.period === 'hafta' ? 8 : 5, 'degerlendirme');
  recordActivityDay();  // emek sayar: tamamlanan değerlendirme günü seriye yazar
  try { window.wtLogRitus?.('degerlendirme', 'tamam', { n: Object.keys(cur.answers).length }); } catch (_) {}
  try { window.usCheckHayalDay?.(); } catch (_) {} // Hayal Mührü: vadesi gelmiş değerlendirme tamamlandı

  _showStep('done');
  _renderCompound(cur.period);
  const sumEl = document.getElementById('rv-done-summary');
  if (sumEl) sumEl.textContent = t('rv.summarizing');
  await _generateSummary(cur, def);
}

async function _generateSummary(cur, def) {
  const sumEl = document.getElementById('rv-done-summary');
  const qa = Object.values(cur.answers).filter(e => e.a).map(e => `S: ${e.q}\nC: ${e.a}`).join('\n\n');
  // Yönlendirme sözlükte (16b) — canlı hâli admin "Emre'nin Sesi" odasından gelebilir.
  const prompt = p('prompt.degerlendirme.summary', { title: def.title, qa });
  try {
    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemPrompt: '', maxTokens: 220, temperature: 0.75, skipPersona: true,
    });
    if (sumEl) sumEl.textContent = (raw || '').trim() || t('rv.summary_fb1');
  } catch (e) {
    console.warn('rvSummary:', e?.message);
    if (sumEl) sumEl.textContent = t('rv.summary_fb2');
  }
}

/* ══════════════════════════════════════════════════════════════
   %1 BİLEŞİK BÜYÜME GÖRSELİ — "günlük %1 → yıl sonu 37×"
══════════════════════════════════════════════════════════════ */
function _renderCompound(period) {
  const wrap = document.getElementById('rv-compound');
  if (!wrap) return;
  // 1.01^n eğrisi (n = 0..365)
  const N = 365;
  const pts = [];
  const maxVal = Math.pow(1.01, N); // ≈ 37.78
  for (let i = 0; i <= N; i += 5) {
    const v = Math.pow(1.01, i);
    const x = (i / N) * 100;
    const y = 100 - (v / maxVal) * 100;
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  const path = `M ${pts.join(' L ')}`;
  // Bu döneme kadar tamamlanan değerlendirme sayısı → momentum noktası
  const bucket = _bucket[period];
  const count = (S._reviews[bucket] || []).length;
  wrap.innerHTML = `
    <div class="rv-compound-head">${t('rv.compound.head')}</div>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="rv-compound-svg">
      <path d="${path}" fill="none" stroke="var(--gold, #b8953c)" stroke-width="1.4"/>
      <line x1="0" y1="100" x2="100" y2="100" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
    </svg>
    <div class="rv-compound-foot">${t('rv.compound.foot').replace('{n}', count)}</div>`;
}

/* ══════════════════════════════════════════════════════════════
   TANIKLIK — "bu dertle gelmiştin, bugün neresinde?"
   ───────────────────────────────────────────────────────────
   Uygulama "sorununu çözdük" DEMEZ: kanıtı serer, hükmü kullanıcı verir.
   Dönem değerlendirmelerinden farkı budur — orada soruyu da cevabı da
   kullanıcı yazar, burada soru sabittir ve cevap TARİHLİ bir seri kurar.
   Depo yeni değil: `etw_reviews_v1`in beşinci kovası (İç Çalışma 02'nin
   dersi — yeniden üretilen bir yargıya söz hakkı verirken yeni depo AÇMA).
══════════════════════════════════════════════════════════════ */
export const TANIK_DURUMLAR = ['yol', 'yerinde', 'degil'];

/* Mevsimlik: aynı soru haftada bir sorulursa cevap bir alışkanlığa döner,
   dönüşümün ölçüsü olmaktan çıkar. Belgeselin ritmiyle aynı (90 gün). */
const TANIK_PERIYOT_GUN = 90;
const TANIK_CAP = 24;

/** Tanıklık beyanını deftere yazar (aynı dönemde idempotent — son söz geçerli).
 *  @param durum 'yol' (yol alıyorum) | 'yerinde' | 'degil' (artık o kişi değilim)
 *  @param t0 Yol Ayini'nin ilk teşhisi ({kalip, enZayif}) — beyan neyin
 *            hakkında verildiğini taşısın diye kaydın içinde yaşar.
 *  @returns kaydedilen giriş | null (geçersiz durum) */
export function rvTanikKaydet(durum, t0 = null, not = '') {
  if (!TANIK_DURUMLAR.includes(durum)) return null;
  try {
    if (!Array.isArray(S._reviews.tanik)) S._reviews.tanik = [];
    const periodKey = _periodKey('ay');
    const giris = {
      id: UID(), periodKey, created_at: NOW(), durum,
      not: String(not || '').trim().slice(0, 280) || null,   // boşluktan ibaret not, not değildir
      t0: t0 ? { kalip: t0.kalip || null, enZayif: t0.enZayif || null } : null,
    };
    S._reviews.tanik = S._reviews.tanik.filter(r => r.periodKey !== periodKey);
    S._reviews.tanik.push(giris);
    if (S._reviews.tanik.length > TANIK_CAP) S._reviews.tanik.shift();
    rvSave();
    return giris;
  } catch (e) { console.warn('rvTanikKaydet:', e?.message); return null; }
}

/** Tanıklık serisi — eskiden yeniye. Boşsa []. */
export function rvTanikSeri() {
  const t = S._reviews?.tanik;
  return Array.isArray(t) ? t.slice().sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))) : [];
}

/** En son tanıklık — belgeselin "geçen mevsim ne demiştin" satırı. Yoksa null. */
export function rvTanikSon() {
  const seri = rvTanikSeri();
  return seri.length ? seri[seri.length - 1] : null;
}

/** Tanıklık sorusu sorulabilir mi? Son beyandan bu yana bir mevsim geçmeli.
 *  Hiç sorulmamışsa daima true — ilk söz hakkı beklemez. */
export function rvTanikVaktiGeldi() {
  const son = rvTanikSon();
  if (!son) return true;
  const gecen = (Date.now() - new Date(son.created_at).getTime()) / 86400000;
  return !isFinite(gecen) || gecen >= TANIK_PERIYOT_GUN;
}

export function getReviewStats() {
  return {
    day: S._reviews.day.length, week: S._reviews.week.length,
    month: S._reviews.month.length, year: S._reviews.year.length,
  };
}

/* window köprüsü — Dönüşüm Aynası (13t) 10l'yi İMPORT ETMEZ: 10l bir tören
   modülüdür (LLM özeti + Elmas + aktivite defteri), aynanın ihtiyacı bir
   beyan kaydı. Aynı gerekçe 09a/09/02b köprülerinde de geçerli. */
if (typeof window !== 'undefined') {
  window.rvTanikKaydet = rvTanikKaydet;
  window.rvTanikSeri = rvTanikSeri;
  window.rvTanikSon = rvTanikSon;
  window.rvTanikVaktiGeldi = rvTanikVaktiGeldi;
}
