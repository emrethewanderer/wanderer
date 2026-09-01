/* ═══════════════════════════════════════════════════
   10z — SES KATMANI: Dikte (konuşarak yaz) + Sesli Okuma
   "Kendinle Konuşmak" felsefesinin sohbete uzantısı: duygu yazıdan
   çok seste akar. İki yetenek:
   1) Dikte — composer/Ritüel Kartı mikrofonu; Web Speech API
      (Chrome/Android/Safari 14.5+). Desteklenmeyen tarayıcıda buton gizlenir.
   2) Sesli okuma — Emre mesajı footer'ındaki hoparlör; speechSynthesis,
      mevcut dile uygun ses seçimi. Sunucu değişikliği gerektirmez.
═══════════════════════════════════════════════════ */
import { showToast } from './00a-infrastructure.js';
import { t, getCurrentLanguage } from './15-i18n.js';
import { sendMessageHooks, msgRawText } from './06-summary-chat.js';

const _SR = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

/* Aktif dile uygun BCP-47 etiketi */
const _BCP47 = { tr: 'tr-TR', en: 'en-US', de: 'de-DE', fr: 'fr-FR', es: 'es-ES' };
function _lang() { return _BCP47[getCurrentLanguage()] || 'tr-TR'; }

/* ─── 1. DİKTE ─── */
let _rec = null;       // aktif SpeechRecognition
let _recBtn = null;    // dinleme görselini taşıyan buton
let _baseText = '';    // dikte başlamadan önceki input metni

function _recCleanup() {
  _recBtn?.classList.remove('listening');
  _rec = null; _recBtn = null;
}

export function sesMicStop() {
  try { _rec?.stop(); } catch (_) {}
  _recCleanup();
}

export function sesMicToggle(targetInputId, btn) {
  if (_rec) { sesMicStop(); return; }
  if (!_SR) { showToast(t('ses.unsupported', 'Bu tarayıcı ses girişini desteklemiyor.'), true); return; }
  const inp = document.getElementById(targetInputId || 'chat-input');
  if (!inp) return;

  const rec = new _SR();
  rec.lang = _lang();
  rec.interimResults = true;
  rec.continuous = true;

  _baseText = inp.value ? inp.value.replace(/\s+$/, '') + ' ' : '';

  rec.onresult = (e) => {
    let finalText = '', interim = '';
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript + ' ';
      else interim += r[0].transcript;
    }
    inp.value = (_baseText + finalText + interim).replace(/\s{2,}/g, ' ').trimStart();
    inp.dispatchEvent(new Event('input')); // autoResize + diğer dinleyiciler
  };
  rec.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      showToast(t('ses.denied', 'Mikrofon izni verilmedi. Tarayıcı ayarlarından izin ver.'), true);
    } else if (e.error !== 'aborted' && e.error !== 'no-speech') {
      showToast(t('ses.error', 'Ses tanıma hatası. Tekrar dene.'), true);
    }
    _recCleanup();
  };
  rec.onend = () => _recCleanup(); // tarayıcı sessizlikte kendiliğinden bitirebilir

  _rec = rec;
  _recBtn = btn || null;
  _recBtn?.classList.add('listening');
  try { rec.start(); } catch (_) { _recCleanup(); }
}

/* Mesaj gönderilirken dikteyi kapat — input temizlenir, eski taban metin bayatlar.
   Boot'ta register edilir (14-boot.js) — modül load time TDZ riskini önler. */
export function registerSesHooks() {
  sendMessageHooks.before(() => { if (_rec) sesMicStop(); });
}

/* ─── 2. SESLİ OKUMA ─── */
let _speakBtn = null; // aktif okunan mesajın butonu

/* Markdown'ı konuşulabilir düz metne indir */
function _plainForSpeech(s) {
  return (s || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')        // görseller
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')      // linkler → metin
    .replace(/`{1,3}[^`]*`{1,3}/g, ' ')           // kod
    .replace(/[*_~#>|]+/g, '')                    // vurgu/başlık işaretleri
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function _speakCleanup() {
  _speakBtn?.classList.remove('speaking');
  _speakBtn = null;
}

export function sesSpeakMessage(btn) {
  const synth = window.speechSynthesis;
  if (!synth) { showToast(t('ses.tts_unsupported', 'Bu tarayıcı sesli okumayı desteklemiyor.'), true); return; }

  const wasSpeakingThis = synth.speaking && _speakBtn === btn;
  if (synth.speaking) { synth.cancel(); _speakCleanup(); }
  if (wasSpeakingThis) return; // aynı butona ikinci dokunuş = durdur

  const text = _plainForSpeech(msgRawText(btn));
  if (!text) return;

  const u = new SpeechSynthesisUtterance(text);
  const lang = _lang();
  u.lang = lang;
  // Dile uygun ses — tam eşleşme yoksa dil köküyle başlayan ilk ses
  try {
    const voices = synth.getVoices() || [];
    const norm = v => (v.lang || '').replace('_', '-').toLowerCase();
    const v = voices.find(v => norm(v) === lang.toLowerCase())
           || voices.find(v => norm(v).startsWith(lang.slice(0, 2).toLowerCase()));
    if (v) u.voice = v;
  } catch (_) {}
  u.rate = 0.95;   // Wanderer temposu — aceleci değil
  u.pitch = 0.92;
  u.onend = () => _speakCleanup();
  u.onerror = () => _speakCleanup();

  _speakBtn = btn;
  btn?.classList.add('speaking');
  synth.speak(u);
}

/* ─── BOOT — desteklenmeyen tarayıcıda mikrofon butonlarını gizle ─── */
function _sesBoot() {
  if (!_SR) {
    document.querySelectorAll('.ws-mic-btn').forEach(b => { b.style.display = 'none'; });
  }
  // Bazı tarayıcılar sesleri tembel yükler — ilk getVoices() çağrısı tetikler
  try { window.speechSynthesis?.getVoices(); } catch (_) {}
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _sesBoot);
} else {
  _sesBoot();
}

/* Inline onclick erişimi — minify'a dayanıklı */
window.sesMicToggle    = sesMicToggle;
window.sesMicStop      = sesMicStop;
window.sesSpeakMessage = sesSpeakMessage;
