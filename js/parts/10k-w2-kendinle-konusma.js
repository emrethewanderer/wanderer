/* ═══════════════════════════════════════════════════════════════════
   10k — KENDİNLE KONUŞMAK (Zihniyet Devrimi'nin tekrarlayan yöntemi)
   ───────────────────────────────────────────────────────────────────
   FELSEFE: Kitap boyunca defalarca geçen yöntem — "Yalnız kal, kendinle
   konuş; yaz veya sesini/görüntünü kaydet, kendine sorular sor, cevapla,
   cevaplar üzerine sorular sor." (denemeler 4, 10, 16, 92, 152 …)

   4 REHBERLİ SET:
     inanc   — İnanç Kazma (kendini baltalayan temel inancı bul + tersi)
     sabah   — Sabah Sorusu (deneme 152)
     amac    — Amaç Bulma (denemeler 7, 16)
     serbest — Serbest öz-diyalog (aç-konuş/yaz)

   Her seans: yazılı cevaplar + (opsiyonel) tek bir ses kaydı.
   Bitince: opsiyonel AI yansıması + "Geçiş Alanı kartına dönüştür" köprüsü.
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage, showToast, recordActivityDay } from './00a-infrastructure.js';
import { callLLM } from './04-llm-hero-history.js';
import { awardElmas } from './10g-w2-wanderer-game.js';
import { idbSaveRecording, idbGetRecording } from './00b-indexeddb.js';
import { t } from './15-i18n.js';
import { p } from './16-i18n-prompts.js';

const STORAGE_KEY = 'etw_self_dialogue_v1';
const NOW = () => new Date().toISOString();
const UID = () => 'sd_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

/* Set iskeleti — glyph + soru sayısı sabit; metinler i18n'den render anında
   çözülür (modül-yükünde dil donmasın). [[tr-en-i18n-tamamlama]] */
const DIALOG_DEFS = {
  inanc:   { glyph: '◐', qn: 4 },
  sabah:   { glyph: '☀', qn: 2 },
  amac:    { glyph: '✶', qn: 4 },
  serbest: { glyph: '◇', qn: 1 },
};

function _dialogSet(k) {
  const d = DIALOG_DEFS[k];
  if (!d) return null;
  const questions = [];
  for (let i = 0; i < d.qn; i++) questions.push(t(`sk.set.${k}.q${i}`));
  return { glyph: d.glyph, title: t(`sk.set.${k}.title`), intro: t(`sk.set.${k}.intro`), questions };
}

/* ══════════════════════════════════════════════════════════════
   PERSİSTANS
══════════════════════════════════════════════════════════════ */
export function skSave() {
  try {
    const uid = S.currentUser?.id || 'anon';
    SafeStorage.set(`${STORAGE_KEY}_${uid}`, { sessions: S._selfDialogue.sessions, lastAt: S._selfDialogue.lastAt });
  } catch (e) { console.warn('skSave:', e?.message); }
}

export function skLoad() {
  try {
    const uid = S.currentUser?.id || 'anon';
    const data = SafeStorage.get(`${STORAGE_KEY}_${uid}`);
    if (data && typeof data === 'object') {
      S._selfDialogue.sessions = Array.isArray(data.sessions) ? data.sessions : [];
      S._selfDialogue.lastAt = data.lastAt || null;
    }
  } catch (e) { console.warn('skLoad:', e?.message); }
}

export function skInit() { skLoad(); }

/* ══════════════════════════════════════════════════════════════
   SEANS AKIŞI
══════════════════════════════════════════════════════════════ */
export function skOpen() {
  // Ayrı sayfa (popup yok): set adımına dön + Kendinle Konuş view'ına geç.
  _showStep('set');
  if (typeof window.switchView === 'function') window.switchView('konusma');
}

export function skClose() {
  _stopRecording(true);
  S._selfDialogue.current = null;
  // Sayfadan çık → Bugün'e dön.
  if (typeof window.switchView === 'function') window.switchView('bugun');
}

/* Kendinle Konuş sayfası (#konusma-view) açılırken: set adımına dön. */
export function loadKonusmaView() {
  _showStep('set');
}

function _showStep(step) {
  for (const s of ['set', 'questions', 'reflect']) {
    const el = document.getElementById(`sk-step-${s}`);
    if (el) el.style.display = (s === step) ? '' : 'none';
  }
}

export function skSelectSet(setKey) {
  const set = _dialogSet(setKey);
  if (!set) return;
  try { window.wtLogRitus?.('kendinle-konusma', 'basladi'); } catch (_) {}
  S._selfDialogue.current = { id: UID(), created_at: NOW(), setKey, entries: [], audioKey: null };

  const titleEl = document.getElementById('sk-q-title');
  if (titleEl) titleEl.textContent = `${set.glyph} ${set.title}`;
  const introEl = document.getElementById('sk-q-intro');
  if (introEl) introEl.textContent = set.intro;

  const listEl = document.getElementById('sk-q-list');
  if (listEl) {
    listEl.innerHTML = set.questions.map((q, i) => `
      <div class="sk-q-block">
        <div class="sk-q-text">${q.replace(/</g, '&lt;')}</div>
        <textarea class="sk-q-input" id="sk-q-${i}" rows="2" placeholder="${t('sk.answer_ph')}"></textarea>
      </div>`).join('');
  }
  _resetRecUI();
  const playBtn = document.getElementById('sk-play-btn');
  if (playBtn) playBtn.style.display = 'none';
  _showStep('questions');
}

export async function skFinish() {
  const cur = S._selfDialogue.current;
  if (!cur) return;
  const set = _dialogSet(cur.setKey);
  _stopRecording(true);

  // Cevapları topla
  cur.entries = set.questions.map((q, i) => ({
    q,
    a: (document.getElementById(`sk-q-${i}`)?.value || '').trim(),
    mode: 'text',
  }));

  const anyAnswer = cur.entries.some(e => e.a.length > 0);
  if (!anyAnswer && !cur.audioKey) {
    showToast(t('sk.toast.answer_or_record'));
    return;
  }

  S._selfDialogue.sessions.push(cur);
  if (S._selfDialogue.sessions.length > 100) S._selfDialogue.sessions.shift();
  S._selfDialogue.lastAt = NOW();
  skSave();
  awardElmas(6, 'kendinle-konusma');
  recordActivityDay();  // emek sayar: tamamlanan seans günü seriye yazar
  try { window.wtLogRitus?.('kendinle-konusma', 'tamam', { n: cur.entries.length }); } catch (_) {}
  try { window.usCheckHayalDay?.(); } catch (_) {} // Hayal Mührü serisini besle

  // AI yansıması
  _showStep('reflect');
  const reflectEl = document.getElementById('sk-reflect-text');
  if (reflectEl) reflectEl.textContent = t('sk.thinking');
  const bridgeBtn = document.getElementById('sk-bridge-btn');
  if (bridgeBtn) bridgeBtn.style.display = 'none';

  await _generateReflection(cur, set);
}

async function _generateReflection(cur, set) {
  const reflectEl = document.getElementById('sk-reflect-text');
  const qa = cur.entries.filter(e => e.a).map(e => `S: ${e.q}\nC: ${e.a}`).join('\n\n');
  if (!qa) {
    if (reflectEl) reflectEl.textContent = t('sk.reflect_audio_only');
    return;
  }

  const isInanc = cur.setKey === 'inanc';
  // Yönlendirme sözlükte (16b) — inanç seansı ayrı anahtar (JSON şeması farklı);
  // canlı hâli admin "Emre'nin Sesi" odasından gelebilir.
  const prompt = p(
    isInanc ? 'prompt.kendinle_konusma.reflection_inanc' : 'prompt.kendinle_konusma.reflection',
    { title: set.title, qa }
  );

  try {
    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemPrompt: '', maxTokens: 320, temperature: 0.75, jsonMode: true, skipPersona: true,
    });
    const parsed = JSON.parse(raw);
    if (reflectEl) reflectEl.textContent = parsed.reflection || t('sk.reflect_fb1');
    // Köprü: İnanç Kazma → Geçiş Alanı kartı
    if (parsed.empoweringBelief || parsed.personSeed) {
      cur.empoweringBelief = parsed.empoweringBelief || null;
      cur.personSeed = parsed.personSeed || null;
      skSave();
      const bridgeBtn = document.getElementById('sk-bridge-btn');
      if (bridgeBtn) bridgeBtn.style.display = '';
    }
  } catch (e) {
    console.warn('skReflection:', e?.message);
    if (reflectEl) reflectEl.textContent = t('sk.reflect_fb2');
  }
}

/* Köprü: son seansın güçlendirici inancını Olmak İstediğin Kişi tasarımına taşı (10D) */
export function skBridgeToGecis() {
  const sessions = S._selfDialogue.sessions;
  const last = sessions[sessions.length - 1];
  if (!last) return;
  skClose();
  try {
    window.oikSeedDraft?.({
      baslik: last.personSeed || '',
      inanclar: last.empoweringBelief ? [last.empoweringBelief] : [],
    });
    if (window.oikOpenDesign) {
      window.oikOpenDesign();
      showToast(t('sk.toast.bridge'));
    }
  } catch (_) {}
}

/* ══════════════════════════════════════════════════════════════
   SES KAYDI (seans-düzeyi)
══════════════════════════════════════════════════════════════ */
let _mediaRecorder = null, _recChunks = [], _recStream = null, _lastURL = null, _recStartTs = 0;

function _resetRecUI() {
  const btn = document.getElementById('sk-rec-btn');
  if (btn) { btn.classList.remove('recording'); const l = btn.querySelector('.sk-rec-label'); if (l) l.textContent = t('sk.record'); }
  const st = document.getElementById('sk-rec-status');
  if (st) st.textContent = '';
}

export async function skToggleRecord() {
  if (_mediaRecorder && _mediaRecorder.state === 'recording') { _stopRecording(false); return; }
  const cur = S._selfDialogue.current;
  if (!cur) return;
  const st = document.getElementById('sk-rec-status');
  try {
    _recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _recChunks = [];
    _mediaRecorder = new MediaRecorder(_recStream);
    _recStartTs = Date.now();
    _mediaRecorder.ondataavailable = (e) => { if (e.data?.size) _recChunks.push(e.data); };
    _mediaRecorder.onstop = async () => {
      const blob = new Blob(_recChunks, { type: _mediaRecorder?.mimeType || 'audio/webm' });
      _recChunks = []; _stopStream();
      if (blob.size > 0) {
        const key = `dialog_${cur.id}`;
        const duration = Math.round((Date.now() - _recStartTs) / 1000);
        await idbSaveRecording(key, blob, { user_id: S.currentUser?.id, duration }).catch(() => {});
        cur.audioKey = key;
        const playBtn = document.getElementById('sk-play-btn');
        if (playBtn) playBtn.style.display = '';
        if (st) st.textContent = t('sk.recorded').replace('{n}', duration);
      }
    };
    _mediaRecorder.start();
    const btn = document.getElementById('sk-rec-btn');
    if (btn) { btn.classList.add('recording'); const l = btn.querySelector('.sk-rec-label'); if (l) l.textContent = t('sk.stop_record'); }
    if (st) st.textContent = t('sk.recording');
  } catch (e) {
    console.warn('skToggleRecord:', e?.message);
    if (st) st.textContent = t('sk.no_mic');
  }
}

function _stopRecording(silent) {
  try {
    if (_mediaRecorder && _mediaRecorder.state === 'recording') {
      if (silent) _mediaRecorder.onstop = () => { _stopStream(); };
      _mediaRecorder.stop();
    } else { _stopStream(); }
  } catch (_) { _stopStream(); }
  const btn = document.getElementById('sk-rec-btn');
  if (btn) { btn.classList.remove('recording'); const l = btn.querySelector('.sk-rec-label'); if (l) l.textContent = t('sk.record'); }
}

function _stopStream() {
  try { _recStream?.getTracks().forEach(trk => trk.stop()); } catch (_) {}
  _recStream = null; _mediaRecorder = null;
}

export async function skPlayRecording() {
  const cur = S._selfDialogue.current;
  const key = cur?.audioKey;
  if (!key) { showToast(t('sk.no_recording')); return; }
  const rec = await idbGetRecording(key).catch(() => null);
  if (!rec?.blob) return;
  const audio = document.getElementById('sk-audio');
  if (!audio) return;
  if (_lastURL) { try { URL.revokeObjectURL(_lastURL); } catch (_) {} }
  _lastURL = URL.createObjectURL(rec.blob);
  audio.src = _lastURL;
  audio.play().catch(() => {});
}

export function getSelfDialogueStats() {
  return { sessions: S._selfDialogue.sessions.length, lastAt: S._selfDialogue.lastAt };
}

/* ── window expose (TDZ-güvenli, minify-dayanıklı) ──
   Modül bugüne dek yalnız kendi view'ından çağrılıyordu; köprü, araç
   motorunun (13a) [ARAC:inanc] chip'i için açıldı. Gerekçe 13a'nın KURULU
   kalıbıdır: dört aracın üçü (glGiveSozNow · oikOpenReading · igOpenKapi)
   ritüeli window'dan çağırır, dördüncüsü de öyle çağırır — ikinci bir yol
   açmak registry'yi iki sözleşmeli hâle getirirdi (§1.3).
   FAZ 9'un dersi burada geçerli DEĞİL: orada delinen sözleşme "protokol
   blokları DAİMA sıyrılır"dı ve "daima" koşul kabul etmez; burada
   koşulluluk sözleşmenin KENDİSİdir — chip "ritüel varsa aç" der ve yoksa
   `false` dönüp kullanıcıya arac.fail toast'ını gösterir (13a:_acRitual). */
if (typeof window !== 'undefined') {
  window.skOpen = skOpen;
  window.skSelectSet = skSelectSet;
}
