/* ═══════════════════════════════════════════════════
   13b — ÇALIŞMA KAĞIDI ARTIFACT'İ
   Kitap 1'deki Çalışma Kağıdı kalıbının (YAZ → HAYAL ET → OLUMLAMA)
   sohbet içi yapılandırılmış kartı. LLM [KAGIT]{"kavram":...} bloğu
   gönderir (13a ayıklar) → bu modül kartı çizer; şablonlar ve kayıt
   09b'nin MEVCUT altyapısı (dfGetWorksheetTemplate/dfRecordWorksheet —
   UI'sız duran döngü burada kapanır). MÜHÜRLE → arşive (09c'den görünür).
═══════════════════════════════════════════════════ */
import { S } from '../state.js';
import { escapeHTML, showToast } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { dfGetWorksheetTemplate, dfRecordWorksheet } from './09b-depth-foundations.js';
import { idbSaveRecording, idbGetRecording, idbDeleteRecording } from './00b-indexeddb.js';

const _CONCEPT_LABELS = {
  standart: 'Standart', hak_etmek: 'Hak Etmek', normal: 'Normal', layik: 'Layık',
  oz_sevgi: 'Öz Sevgi', oz_saygi: 'Öz Saygı', oz_deger: 'Öz Değer',
  oz_guven: 'Öz Güven', bolluk: 'Bolluk Bilinci'
};

export function ckConceptLabel(concept) {
  return _CONCEPT_LABELS[concept] || concept;
}

/* ─── SES KAYDI (10k'nın deseni; yeni motor yazılmaz) ───
   Kitap her Çalışma Kağıdı'nın 3. adımında aynı şeyi söyler: "Bu ifadeleri
   sesli olarak okuyabilir ve SES KAYDI yapıp DİNLEYEBİLİRSİN. Hem okurken hem
   dinlerken kendini olumlamalarda olan kişi gibi görüp hissetmen kritiktir."
   Kayıt cihazda kalır (IndexedDB) — Supabase'e gitmez. */
let _rec = null, _recStream = null, _recChunks = [], _recStartTs = 0, _lastURL = null;

/* Mikrofon yoksa/izin verilmezse akış BLOKLANMAZ: kayıt satırı hiç basılmaz,
   kağıt metin olarak tamamlanır (00a savunmacı stil ilkesi). */
function _sesDestekli() {
  return typeof navigator !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && typeof MediaRecorder !== 'undefined';
}

function _sesSatiriHTML() {
  if (!_sesDestekli()) return '';
  return `
    <div class="ck-ses">
      <button class="ck-rec-btn" onclick="ckToggleRecord(this)">
        <span class="ck-rec-dot" aria-hidden="true"></span>
        <span class="ck-rec-label">${escapeHTML(t('ck.record', 'Sesini kaydet'))}</span>
      </button>
      <button class="ck-play-btn" onclick="ckPlayRecording(this)" style="display:none;">${escapeHTML(t('ck.listen', '▶ Kendi sesinden dinle'))}</button>
      <button class="ck-rec-del" onclick="ckDeleteRecording(this)" style="display:none;"
              aria-label="${escapeHTML(t('ck.rec_delete', 'Kaydı sil'))}">✕</button>
      <audio class="ck-audio" preload="none"></audio>
      <div class="ck-rec-status" aria-live="polite"></div>
    </div>`;
}

function _stopStream() {
  try { _recStream?.getTracks().forEach(trk => trk.stop()); } catch (_) {}
  _recStream = null; _rec = null;
}

export async function ckToggleRecord(btn) {
  const card = btn?.closest('.ck-card');
  if (!card) return;
  const status = card.querySelector('.ck-rec-status');
  if (_rec && _rec.state === 'recording') {
    try { _rec.stop(); } catch (_) { _stopStream(); }
    return;
  }
  try {
    _recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _recChunks = [];
    _rec = new MediaRecorder(_recStream);
    _recStartTs = Date.now();
    _rec.ondataavailable = (e) => { if (e.data?.size) _recChunks.push(e.data); };
    _rec.onstop = async () => {
      const blob = new Blob(_recChunks, { type: _rec?.mimeType || 'audio/webm' });
      _recChunks = []; _stopStream();
      btn.classList.remove('recording');
      btn.querySelector('.ck-rec-label').textContent = t('ck.record_again', 'Yeniden kaydet');
      if (!blob.size) { if (status) status.textContent = ''; return; }
      const key = `ck_ses_${S.currentUser?.id || 'anon'}_${Date.now()}`;
      const sn = Math.round((Date.now() - _recStartTs) / 1000);
      await idbSaveRecording(key, blob, { user_id: S.currentUser?.id, duration: sn }).catch(() => {});
      card.dataset.sesId = key;
      card.querySelector('.ck-play-btn').style.display = '';
      card.querySelector('.ck-rec-del').style.display = '';
      if (status) status.textContent = t('ck.recorded', '{n} sn kaydedildi — şimdi kendi sesinden dinleyebilirsin.').replace('{n}', sn);
    };
    _rec.start();
    btn.classList.add('recording');
    btn.querySelector('.ck-rec-label').textContent = t('ck.record_stop', 'Kaydı bitir');
    if (status) status.textContent = t('ck.recording', 'Kaydediliyor…');
  } catch (e) {
    console.warn('ckToggleRecord:', e && e.message);
    if (status) status.textContent = t('ck.no_mic', 'Mikrofona ulaşılamadı — kağıt yazıyla da tamamlanır.');
  }
}

export async function ckPlayRecording(btn) {
  const card = btn?.closest('.ck-card');
  const key = card?.dataset.sesId;
  if (!key) return;
  const rec = await idbGetRecording(key).catch(() => null);
  if (!rec?.blob) return;
  const audio = card.querySelector('.ck-audio');
  if (!audio) return;
  if (_lastURL) { try { URL.revokeObjectURL(_lastURL); } catch (_) {} }
  _lastURL = URL.createObjectURL(rec.blob);
  audio.src = _lastURL;
  audio.play().catch(() => {});
}

export async function ckDeleteRecording(btn) {
  const card = btn?.closest('.ck-card');
  const key = card?.dataset.sesId;
  if (!key) return;
  await idbDeleteRecording(key).catch(() => {});
  delete card.dataset.sesId;
  card.querySelector('.ck-play-btn').style.display = 'none';
  card.querySelector('.ck-rec-del').style.display = 'none';
  const status = card.querySelector('.ck-rec-status');
  if (status) status.textContent = '';
}

/* ─── MÜHÜR ANI ───
   Mühür bir törendir (TASARIM-PRENSIPLERI §7): "bir şey oldu" demek için
   toast yetmez, an işaretlenir. Damganın dili kimlik mührününkiyle aynıdır —
   `oik-seal-stamp` sınıfı olduğu gibi kullanılır, ikizi yazılmaz — ama ölçüsü
   küçüktür ve tam ekran flaşı YOKTUR: kağıt mührü haftalık bir pratiktir,
   kimlik mührü ise yılda bir basılan eşik. Damga basılır, an geçer, geride
   `.ck-sealed-mark` izi kalır. */
function _damgaBas(card) {
  try {
    if (card.querySelector('.ck-stamp')) return;
    const damga = document.createElement('div');
    damga.className = 'oik-seal-stamp ck-stamp';
    damga.setAttribute('aria-hidden', 'true');
    damga.textContent = '◆';
    /* Damga kartın ORTASINA değil, MÜHÜRLE düğmesinin yerine basılır: kağıt
       dört adımla uzun, kullanıcı mührü bastığı an kartın dibinde duruyor —
       ortaya basılan damga ekranın dışında kalıp hiç görülmüyordu. Mühür
       bastığın yerde iz bırakır; solunca altında "Mühürlendi" satırı kalır. */
    (card.querySelector('.ck-foot') || card).appendChild(damga);
    setTimeout(() => { try { damga.classList.add('ck-stamp--out'); } catch (_) {} }, 1400);
    setTimeout(() => { try { damga.remove(); } catch (_) {} }, 2050);
  } catch (_) {}
}

/* Kartı verilen konteynerin içine çiz (13a aracAfterReply çağırır) */
export function ckRenderCard(container, concept) {
  const tmpl = dfGetWorksheetTemplate(concept);
  if (!tmpl || !container) return;

  const card = document.createElement('div');
  card.className = 'ck-card';
  card.dataset.concept = concept;
  card.innerHTML = `
    <div class="ck-head">
      <span class="ck-glyph" aria-hidden="true">𝍪</span>
      <span class="ck-title">${escapeHTML(t('ck.title', 'ÇALIŞMA KAĞIDI'))}</span>
      <span class="ck-concept">${escapeHTML(ckConceptLabel(concept))}</span>
      <button class="ck-close" onclick="this.closest('.ck-card').remove()" aria-label="Kapat">✕</button>
    </div>

    <div class="ck-step">
      <div class="ck-step-label">1 · ${escapeHTML(t('ck.step1', 'YAZ — dışa çıkar'))}</div>
      <div class="ck-step-q">${escapeHTML(tmpl.question)}</div>
      <textarea class="ck-input" data-step="1" rows="3" placeholder="${escapeHTML(t('ck.ph1', 'İçinden geldiği gibi yaz…'))}"></textarea>
    </div>

    <div class="ck-step">
      <div class="ck-step-label">2 · ${escapeHTML(t('ck.step2', 'HAYAL ET — içe gir'))}</div>
      <div class="ck-step-q">${escapeHTML(tmpl.vision)}</div>
      <textarea class="ck-input" data-step="2" rows="2" placeholder="${escapeHTML(t('ck.ph2', 'Gözlerini kapat, hayal et — ne gördün?'))}"></textarea>
    </div>

    <div class="ck-step">
      <div class="ck-step-label">3 · ${escapeHTML(t('ck.step3', 'PROGRAMLA — sesini duy'))}</div>
      <div class="ck-affirmation">“${escapeHTML(tmpl.affirmation)}”</div>
      <div class="ck-step-hint">${escapeHTML(t('ck.hint3', 'Yüksek sesle oku, kaydet, sonra kendi sesinden dinle — dinlerken o kişi gibi hissetmen kritik.'))}</div>
      ${_sesSatiriHTML()}
    </div>

    <div class="ck-step">
      <div class="ck-step-label">4 · ${escapeHTML(t('ck.step4', 'DAVRANIŞ — güne taşı'))}</div>
      <div class="ck-step-q">${escapeHTML(t('ck.step4_q', 'O kişi bu hafta ne yapar?'))}</div>
      <textarea class="ck-input" data-step="4" rows="2" placeholder="${escapeHTML(t('ck.ph4', 'Tek bir davranış yeter…'))}"></textarea>
    </div>

    <div class="ck-foot">
      <button class="ck-save" onclick="ckSeal(this)">${escapeHTML(t('ck.seal', 'MÜHÜRLE'))}</button>
    </div>`;
  container.appendChild(card);
}

export function ckSeal(btn) {
  const card = btn?.closest('.ck-card');
  if (!card) return;
  const concept = card.dataset.concept;
  const tmpl = dfGetWorksheetTemplate(concept);
  const step1 = card.querySelector('.ck-input[data-step="1"]')?.value.trim() || '';
  const step2 = card.querySelector('.ck-input[data-step="2"]')?.value.trim() || '';

  if (!step1) {
    showToast(t('ck.need_step1', 'Önce 1. adımı yaz — dışa çıkmadan mühür olmaz.'), true);
    card.querySelector('.ck-input[data-step="1"]')?.focus();
    return;
  }

  const davranis = card.querySelector('.ck-input[data-step="4"]')?.value.trim() || '';
  const sesId    = card.dataset.sesId || '';

  /* Derin Çalışma tezgâhında açılan kağıdın Max kapısı BURADA kapanır: alan
     açılışta yalnız izin sorar (13A `dcOpenKagit`), tek seferlik tat mühürle
     harcanır — kullanıcı dört adımı yazdıktan sonra kilide çarpmasın diye.
     Kapsam kontrolü şart: sohbette LLM'in getirdiği kağıt (13a) alanın kendi
     tezgâhı DEĞİLDİR ve kapısızdır; kapıyı kapsamsız koymak ücretsiz bir akışı
     kilitlerdi. Köprü yoksa (sohbet, test) sessizce geçilir. */
  if (card.closest('#dc-kagit-host') && typeof window.dcGuardWork === 'function'
      && !window.dcGuardWork()) return;

  dfRecordWorksheet(concept, step1, step2, tmpl?.affirmation || '', { sesId, davranis });

  // Kart mühürlenmiş hâle döner — alanlar kilitlenir, mühür izi kalır
  card.classList.add('sealed');
  card.querySelectorAll('.ck-input').forEach(i => { i.disabled = true; });
  card.querySelectorAll('.ck-rec-btn, .ck-rec-del').forEach(b => { b.disabled = true; });
  const foot = card.querySelector('.ck-foot');
  if (foot) {
    /* 4. adım yazıldıysa günün sözüne DAVET edilir — arka planda söz
       YAZILMAZ. Söz vermek bir törendir ve mührü kullanıcı basar; 10s'in
       `S._gunlukRitus.pledges` kaynağına dışarıdan yazmak hem o sözleşmeyi
       hem töreni çiğnerdi. */
    const koprü = davranis
      ? `<button class="ck-soz-btn" type="button">${escapeHTML(t('ck.to_soz', 'Bunu bugünün sözü yap →'))}</button>`
      : '';
    foot.innerHTML = `<div class="ck-sealed-mark">◆ ${escapeHTML(t('ck.sealed', 'Mühürlendi — arşivine işlendi.'))}</div>${koprü}`;
    /* Köprü CÜMLEYİ de taşır: "bunu sözü yap" derken kullanıcıya aynı cümleyi
       yeniden yazdırmak sözün önüne engel koymaktı. Inline onclick yerine
       dinleyici — metin closure'da durur, tırnak kaçışı derdi olmaz. */
    foot.querySelector('.ck-soz-btn')?.addEventListener('click', () => {
      try { window.glGiveSozNow?.(davranis); } catch (_) {}
    });
  }

  // Ses + haptik + damga: mühür altındır ve duyulur (13e `seal` cue'su).
  try { window.fxCue?.('seal'); } catch (_) {}
  _damgaBas(card);

  showToast(t('ck.saved', 'Çalışma Kağıdı arşivine işlendi.'));

  // Derin Çalışma tezgâhı açıksa arşivi anında tazelesin (13A). Sohbet içi
  // kullanımda karşılığı yoktur; optional-chaining zaten sessizce düşer.
  try { window.dcOnKagitMuhurlendi?.(concept); } catch (_) {}
}

/* Inline onclick + 13a köprüsü */
window.ckRenderCard      = ckRenderCard;
window.ckSeal            = ckSeal;
window.ckToggleRecord    = ckToggleRecord;
window.ckPlayRecording   = ckPlayRecording;
window.ckDeleteRecording = ckDeleteRecording;
