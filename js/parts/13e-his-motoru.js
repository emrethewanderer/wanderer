/* ═══════════════════════════════════════════════════════════════════
   13e — HİS MOTORU · Haptik + İmza Sesleri (dokunsal & işitsel doku)
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Törenler (mühür, paket, armağan, söz, elmas) görsel olarak güçlü ama
     SESSİZ ve TİTREŞİMSİZ. Premium uygulama hissinin yarısı dokudur:
     mühür "tok" düşer, kart folyosu parıldar, elmas kristal gibi tınlar.
     Hiçbir ses dosyası taşınmaz — tüm imza sesleri WebAudio ile yerinde
     sentezlenir (alçak seviye, kısa, asla müzik değil; bir "doku").

   TEK GİRİŞ: window.fxCue(name) → ses + haptik birlikte tetiklenir.
     Cue'lar: tap · seal · milestone1..4 · pack · holo · holoGrand ·
              gift · soz · elmas · whoosh · breath · esikGold · esikLapis ·
              cardBirth · nisan · streak · sendTick · replyBreath · flip · recall
   Haptik: native'de Capacitor Haptics (iOS/Android), web'de navigator.vibrate
     (iOS Safari web'de vibrate YOK — orada ses anın tek taşıyıcısıdır).
   Ses: AudioContext ilk kullanıcı dokunuşunda açılır (autoplay politikası);
     hazır değilse cue sessizce düşer — asla bloklamaz.

   WANDERER AKORDU — kök Sol (G); tüm cue'lar G-pentatonik (G-A-B-D-E) +
     alt-dominant C üçlüsünden seçilir. Altın ekseni (mühür/söz/kimlik):
     alçak register G2-G4, sine/triangle, g≤0.5, "tok ve sıcak" — şimdi/
     olduğun. Lapis ekseni (holo/elmas/eşik-lapis): tiz register G5-G7,
     sine, g≤0.09, "havadar ve kristal" — hayal/gelecek. Vuruş ≤1.6s, pad
     ≤2.5s; asla melodi, asla loop (Fener Ambiyansı hariç, o ayrı bölüm).
     Görsel senkron çağıranın sorumluluğudur (bkz. 10t mühür 280ms gecikmesi).

   GECE KISIKLIĞI — 13f'nin tw-night/tw-evening sınıfına göre otomatik:
     gece gain 0.5→0.22 + lowpass 3200Hz, akşam 0.38/8000Hz. Ayar gerektirmez
     (prefs.nightDim opt-out alanı var, ŞİMDİLİK UI toggle yok).

   FENER AMBİYANSI — "Bu yerin kendi sesi." Opt-in (varsayılan KAPALI),
     window.fxToggleAmbient(on). Sürekli fısıltı-altı oda tonu (G2 çift
     detune + gürültü + 0.05Hz nefes LFO); saat fazına göre kendi tablosu
     (_moodFor'dan bağımsız — gece kısıklığından iki kez etkilenmesin).
     Sekme arka plana geçince durur (batarya); kapatınca tam teardown.

   Kalıcılık: SafeStorage per-uid (etw_fx_prefs_v1_<uid>) { sound, haptic, nightDim, ambient }.
   Ayarlar görünümünde "Doku · Ses & Titreşim" anahtarları (fxToggle*).
   Konvansiyon: hardcoded TR string; modüller-arası erişim window.fx*.
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage, AnimUtils } from './00a-infrastructure.js';

const STORAGE_KEY = 'etw_fx_prefs_v1';

function _key() { return `${STORAGE_KEY}_${(S.currentUser && S.currentUser.id) || 'anon'}`; }
function _default() { return { sound: true, haptic: true, nightDim: true, ambient: false }; }

let _prefs = _default();

export function fxSave() {
  try { SafeStorage.set(_key(), _prefs); } catch (e) { console.warn('fxSave:', e && e.message); }
}
export function fxLoad() {
  try {
    const data = SafeStorage.get(_key());
    if (data && typeof data === 'object') _prefs = Object.assign(_default(), data);
  } catch (e) { console.warn('fxLoad:', e && e.message); }
}

/* ════════════════════════════════════════════════════════════════════
   SES — WebAudio sentez (dosyasız imza sesleri)
════════════════════════════════════════════════════════════════════ */
let _ctx = null;
let _master = null;
let _moodFilter = null;
let _noiseBuf = null;
let _unlocked = false;

function _ensureCtx() {
  if (_ctx) return _ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    _ctx = new AC();
    _master = _ctx.createGain();
    _master.gain.value = 0.5; // genel tavan — cue'lar zaten alçak
    // Gece kısıklığı düğümü: varsayılan şeffaf (18kHz lowpass = etkisiz);
    // _ready() saat fazına göre kısar (bkz. _moodFor). Fener Ambiyansı (FAZ E)
    // kendi gain'iyle doğrudan buraya bağlanır — _master'ın cue kısılmasından
    // bağımsız, yalnız gece/akşam lowpass'ını paylaşır.
    _moodFilter = _ctx.createBiquadFilter();
    _moodFilter.type = 'lowpass';
    _moodFilter.frequency.value = 18000;
    _master.connect(_moodFilter);
    _moodFilter.connect(_ctx.destination);
  } catch (_) { _ctx = null; }
  return _ctx;
}

/** Saat fazına göre gece kısıklığı — 13f'nin <html> sınıfından okunur
 *  (import edilmez: tw-* zaten kamusal CSS sözleşmesi, sıralama bağımlılığı
 *  yaratmaz). Saf fonksiyon — export yalnız test için, window'a çıkmaz. */
export function _moodFor(classList) {
  if (classList?.contains?.('tw-night'))   return { g: 0.22, lpf: 3200 };
  if (classList?.contains?.('tw-evening')) return { g: 0.38, lpf: 8000 };
  return { g: 0.5, lpf: 18000 };
}

// Autoplay politikası: ses ancak bir kullanıcı hareketinden sonra açılabilir.
// İlk pointerdown/keydown'da context'i kur + resume et; sonrası serbest.
function _bindUnlock() {
  if (_unlocked) return;
  const unlock = () => {
    _unlocked = true;
    const ctx = _ensureCtx();
    if (ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (_) {} }
    if (_prefs.ambient) _ambientStart(); // Fener önceki oturumdan açıksa ilk dokunuşta canlanır
    document.removeEventListener('pointerdown', unlock, true);
    document.removeEventListener('keydown', unlock, true);
  };
  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('keydown', unlock, true);
}

function _ready() {
  if (!_prefs.sound) return null;
  if (document.hidden) return null;
  const ctx = _ensureCtx();
  if (!ctx || ctx.state !== 'running') return null;
  // setTargetAtTime tıklamasız geçer — faz sınırında çalan bir cue bile
  // sıçramaz. nightDim kapalıysa (ileride Ayarlar'dan) tam-gündüz değerine döner.
  try {
    const mood = (_prefs.nightDim !== false) ? _moodFor(document.documentElement.classList) : { g: 0.5, lpf: 18000 };
    _master.gain.setTargetAtTime(mood.g, ctx.currentTime, 0.05);
    _moodFilter.frequency.setTargetAtTime(mood.lpf, ctx.currentTime, 0.05);
  } catch (_) {}
  return ctx;
}

function _noise(ctx) {
  if (_noiseBuf) return _noiseBuf;
  const len = ctx.sampleRate; // 1 sn beyaz gürültü, tekrar kullanılır
  _noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = _noiseBuf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return _noiseBuf;
}

/** Tek osilatör vuruşu: f→f2 kayması + üstel sönüm zarfı. */
function _tone(ctx, { type = 'sine', f = 440, f2 = null, at = 0, dur = 0.3, g = 0.15, detune = 0 }) {
  const t0 = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const gn = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (detune) o.detune.setValueAtTime(detune, t0);
  if (f2 != null) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.exponentialRampToValueAtTime(g, t0 + 0.012);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(gn); gn.connect(_master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

/** Gürültü vuruşu: bant-geçiren süpürmeli doku (yırtma / ışıltı / nefes). */
function _hiss(ctx, { at = 0, dur = 0.25, g = 0.1, f = 1200, f2 = null, q = 1.2 }) {
  const t0 = ctx.currentTime + at;
  const src = ctx.createBufferSource();
  src.buffer = _noise(ctx); src.loop = true;
  const flt = ctx.createBiquadFilter();
  flt.type = 'bandpass'; flt.Q.value = q;
  flt.frequency.setValueAtTime(f, t0);
  if (f2 != null) flt.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  const gn = ctx.createGain();
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.exponentialRampToValueAtTime(g, t0 + 0.02);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(flt); flt.connect(gn); gn.connect(_master);
  src.start(t0); src.stop(t0 + dur + 0.05);
}

/** Yumuşak pad: osc → lowpass → yavaş atak zarfı. Nefes/eşik dokusu —
 *  _tone'un ani vuruşunun tersi, tören perdesinin yavaş açılışı için. */
function _pad(ctx, { type = 'sine', f = 98, at = 0, dur = 1.6, g = 0.06, lpf = 1800, attack = 0.5, detune = 0 }) {
  const t0 = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const flt = ctx.createBiquadFilter();
  const gn = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0);
  if (detune) o.detune.setValueAtTime(detune, t0);
  flt.type = 'lowpass'; flt.frequency.setValueAtTime(lpf, t0);
  gn.gain.setValueAtTime(0.0001, t0);
  gn.gain.linearRampToValueAtTime(g, t0 + attack);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(flt); flt.connect(gn); gn.connect(_master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

/* ── İmza sesleri ─────────────────────────────────────────────────────
   Hepsi <1.6sn, alçak seviyeli; "duyulan" değil "hissedilen" doku. ── */
const SOUNDS = {
  // ince dokunuş — buton/kapama
  tap(ctx) { _tone(ctx, { type: 'triangle', f: 1300, f2: 900, dur: 0.05, g: 0.05 }); },

  // mühür: tok düşüş (gövde) + kısa metalik tını (yüzük)
  seal(ctx) {
    _tone(ctx, { type: 'sine', f: 150, f2: 52, dur: 0.22, g: 0.5 });
    _tone(ctx, { type: 'triangle', f: 660, f2: 640, at: 0.02, dur: 0.4, g: 0.06 });
  },

  // kilometre taşı: mühür + gong (tier ile büyür) + tepe tier'da ışıltı
  milestone(ctx, tier) {
    const t = Math.max(1, Math.min(4, tier | 0));
    SOUNDS.seal(ctx);
    const decay = 0.9 + t * 0.25;
    [196, 294, 392.5, 523.8].slice(0, 2 + t).forEach((f, i) => {
      _tone(ctx, { type: 'sine', f, at: 0.18 + i * 0.012, dur: decay, g: 0.10 - i * 0.012, detune: (i % 2) * 6 });
    });
    if (t >= 3) {
      [1318, 1568, 1976, 2637].forEach((f, i) => {
        _tone(ctx, { type: 'sine', f, at: 0.5 + i * 0.09, dur: 0.3, g: 0.035 });
      });
    }
  },

  // paket yırtma: folyo hışırtısı + yukarı süpürme
  pack(ctx) {
    _hiss(ctx, { dur: 0.22, g: 0.16, f: 900, f2: 4200, q: 0.8 });
    _hiss(ctx, { at: 0.1, dur: 0.3, g: 0.08, f: 2600, f2: 7800, q: 1.6 });
  },

  // holo parıltı: pentatonik kıvılcım serpintisi
  holo(ctx) {
    [1568, 1976, 2349, 3136].forEach((f, i) => {
      _tone(ctx, { type: 'sine', f: f * (1 + Math.random() * 0.01), at: i * 0.07, dur: 0.22, g: 0.04 });
    });
  },

  // nadide/efsane açılışı: holo + alçak gong gövdesi
  holoGrand(ctx) {
    _tone(ctx, { type: 'sine', f: 130.8, dur: 1.4, g: 0.16 });
    _tone(ctx, { type: 'sine', f: 196, at: 0.05, dur: 1.2, g: 0.10 });
    SOUNDS.holo(ctx);
    [2093, 2637, 3136, 3951].forEach((f, i) => {
      _tone(ctx, { type: 'sine', f, at: 0.4 + i * 0.09, dur: 0.3, g: 0.03 });
    });
  },

  // armağan: sıcak üçlü çan (yukarı)
  gift(ctx) {
    [523.3, 659.3, 784].forEach((f, i) => {
      _tone(ctx, { type: 'triangle', f, at: i * 0.1, dur: 0.5, g: 0.09 });
    });
  },

  // söz: iki alçak nota (kök + beşli) — ağırbaşlı yemin tınısı
  soz(ctx) {
    _tone(ctx, { type: 'sine', f: 98, dur: 0.5, g: 0.3 });
    _tone(ctx, { type: 'sine', f: 196, at: 0.16, dur: 0.7, g: 0.18 });
    _tone(ctx, { type: 'triangle', f: 294, at: 0.16, dur: 0.5, g: 0.05 });
  },

  // elmas: kristal çıt — çok kısa, çok ince
  elmas(ctx) {
    _tone(ctx, { type: 'sine', f: 2093, f2: 1850, dur: 0.08, g: 0.07 });
    _tone(ctx, { type: 'sine', f: 3136, at: 0.03, dur: 0.06, g: 0.04 });
  },

  // nefes/giriş: alçak süpürme — tören perdesi açılırken
  whoosh(ctx) {
    _hiss(ctx, { dur: 0.5, g: 0.07, f: 240, f2: 1400, q: 0.7 });
  },

  // açılış nefesi: yerin kendi sesi — perde inerken alçak G2 pad + hafif rüzgâr
  breath(ctx) {
    _pad(ctx, { f: 98, dur: 2.2, g: 0.05, lpf: 900, attack: 0.9 });
    _hiss(ctx, { f: 220, f2: 720, dur: 1.4, g: 0.03, q: 0.6 });
  },

  // eşik altın: sıcak boş beşli (G2+D3) — olduğun kişi
  esikGold(ctx) {
    _tone(ctx, { type: 'sine', f: 98, dur: 0.7, g: 0.22 });
    _tone(ctx, { type: 'sine', f: 147, at: 0.08, dur: 0.6, g: 0.12 });
  },

  // eşik lapis: tiz D6+G6 + ince kristal hışırtı — olmak istediğin kişi
  esikLapis(ctx) {
    _tone(ctx, { type: 'sine', f: 1175, dur: 0.5, g: 0.05 });
    _tone(ctx, { type: 'sine', f: 1568, at: 0.07, dur: 0.6, g: 0.04 });
    _hiss(ctx, { at: 0.05, f: 3000, f2: 6500, dur: 0.3, g: 0.025, q: 2 });
  },

  // kart doğuşu: kum savrulur + çift çan mühürler
  cardBirth(ctx) {
    _hiss(ctx, { f: 420, f2: 2100, dur: 0.6, g: 0.10, q: 0.9 });
    _tone(ctx, { type: 'triangle', f: 784, at: 0.42, dur: 0.7, g: 0.08 });
    _tone(ctx, { type: 'sine', f: 392, at: 0.42, dur: 0.5, g: 0.10 });
  },

  // nişan: mürekkep/tüy hışırtısı + yukarı iki nota
  nisan(ctx) {
    _hiss(ctx, { f: 1900, f2: 850, dur: 0.28, g: 0.05, q: 1.4 });
    _tone(ctx, { type: 'triangle', f: 587, at: 0.2, dur: 0.35, g: 0.06 });
    _tone(ctx, { type: 'triangle', f: 784, at: 0.34, dur: 0.55, g: 0.07 });
  },

  // gün serisi: tek sıcak çıt
  streak(ctx) {
    _tone(ctx, { type: 'sine', f: 392, dur: 0.14, g: 0.09 });
    _tone(ctx, { type: 'sine', f: 784, at: 0.06, dur: 0.18, g: 0.04 });
  },

  // gönderim: tap'ten de ince bir tık — sohbetin nabzı
  sendTick(ctx) {
    _tone(ctx, { type: 'triangle', f: 1046, f2: 880, dur: 0.045, g: 0.028 });
  },

  // yanıt nefesi: ilk chunk balona dönüşürken tek alçak G3 pad
  replyBreath(ctx) {
    _pad(ctx, { f: 196, dur: 1.1, g: 0.035, lpf: 1200, attack: 0.35 });
  },

  // kabuk flip: hızlı süpürme + kapanış çıtı
  flip(ctx) {
    _hiss(ctx, { f: 320, f2: 1250, dur: 0.28, g: 0.05, q: 0.8 });
    _tone(ctx, { type: 'sine', f: 392, at: 0.30, dur: 0.12, g: 0.06 });
  },

  // geri çağrı: uzaktan iki nota — bir daveti hatırlatır gibi
  recall(ctx) {
    _tone(ctx, { type: 'sine', f: 392, dur: 0.6, g: 0.07 });
    _tone(ctx, { type: 'sine', f: 587, at: 0.25, dur: 0.8, g: 0.05 });
  },
};

/* ════════════════════════════════════════════════════════════════════
   HAPTİK — native Capacitor Haptics; web fallback navigator.vibrate
════════════════════════════════════════════════════════════════════ */
let _Haptics = null; // lazy modül
let _hapticsPromise = null; // uçuştaki import — boolean bayrak DEĞİL

function _isNative() {
  try { return !!window.Capacitor?.isNativePlatform?.(); } catch (_) { return false; }
}

// _hapticSeq art arda (180-700ms aralıklarla) fxHaptic çağırdığı için ilk
// import henüz çözülmeden ikinci/üçüncü çağrı gelebilir — promise'i (bayrak
// değil) önbelleğe alarak hepsi AYNI yükleme sürecini paylaşır; yoksa geç
// gelen çağrı "denendi ama _Haptics hâlâ null" sanıp sessizce web
// fallback'e (native'de vibrate yok) düşerdi.
async function _loadHaptics() {
  if (_Haptics) return _Haptics;
  if (!_hapticsPromise) _hapticsPromise = import('@capacitor/haptics').catch(() => null);
  _Haptics = await _hapticsPromise;
  return _Haptics;
}

/** kind: light | medium | heavy | success | pattern:[ms…] */
export async function fxHaptic(kind) {
  if (!_prefs.haptic) return;
  try {
    if (_isNative()) {
      const m = await _loadHaptics();
      if (m && m.Haptics) {
        const { Haptics, ImpactStyle, NotificationType } = m;
        if (Array.isArray(kind)) { await Haptics.vibrate({ duration: kind.reduce((a, b) => a + b, 0) }); return; }
        if (kind === 'success') { await Haptics.notification({ type: NotificationType.Success }); return; }
        const style = kind === 'heavy' ? ImpactStyle.Heavy : kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light;
        await Haptics.impact({ style });
        return;
      }
    }
    if (navigator.vibrate) {
      const pat = Array.isArray(kind) ? kind
        : kind === 'heavy' ? [12, 30, 60] : kind === 'medium' ? 25 : kind === 'success' ? [10, 40, 20] : 8;
      navigator.vibrate(pat);
    }
  } catch (_) {}
}

/* ── Haptik koreografi — çok-vuruşlu diziler ─────────────────────────
   Native'de gerçek stil farkıyla (setTimeout + fxHaptic dizisi), web'de
   tek navigator.vibrate() desenine derlenir (vibrate'te "stil" yok, yalnız
   süre/boşluk). Milestone gong yükselişiyle (0.18s aralık, SOUNDS.milestone)
   hizalı. Reduced-motion açıkken çok-vuruşlu diziler son adıma sadeleşir —
   ses etkilenmez (işitsel doku vestibüler sistemi tetiklemez), yalnız art
   arda titreşim geriler (TASARIM-PRENSIPLERI §5 ruhu). */
const _SEQ_KIND_MS = { light: 8, medium: 25, heavy: 45, success: 20 };

function _hapticSeq(steps) {
  if (!_prefs.haptic || !Array.isArray(steps) || !steps.length) return;
  // matchMedia bazı gömülü webview'lerde yok — düşerse "reduced" varsayma,
  // tam diziyle devam et (asla bloklama; tek etkisi çok-vuruş sadeleşmemesi).
  let reduced = false;
  try { reduced = AnimUtils.prefersReducedMotion(); } catch (_) {}
  const seq = reduced
    ? [{ kind: steps[steps.length - 1].kind, at: 0 }]
    : steps;

  if (_isNative()) {
    seq.forEach(({ kind, at }) => setTimeout(() => { fxHaptic(kind); }, at));
    return;
  }
  const sorted = [...seq].sort((a, b) => a.at - b.at);
  const pattern = [];
  let cursor = 0;
  sorted.forEach((step, i) => {
    const dur = _SEQ_KIND_MS[step.kind] || 8;
    if (i > 0) pattern.push(Math.max(0, step.at - cursor));
    pattern.push(dur);
    cursor = step.at + dur;
  });
  try { navigator.vibrate?.(pattern); } catch (_) {}
}

/* ════════════════════════════════════════════════════════════════════
   TEK GİRİŞ — fxCue: ses + haptik eşleşmiş çiftler
════════════════════════════════════════════════════════════════════ */
const CUES = {
  tap:        { sound: 'tap',       haptic: 'light' },
  seal:       { sound: 'seal',      haptic: 'heavy' },
  milestone1: { sound: 'milestone', tier: 1, haptic: 'success' },
  milestone2: { sound: 'milestone', tier: 2, hapticSeq: [{ kind: 'medium', at: 0 }, { kind: 'heavy', at: 180 }] },
  milestone3: { sound: 'milestone', tier: 3, hapticSeq: [{ kind: 'medium', at: 0 }, { kind: 'heavy', at: 180 }, { kind: 'heavy', at: 420 }] },
  milestone4: { sound: 'milestone', tier: 4, hapticSeq: [{ kind: 'medium', at: 0 }, { kind: 'heavy', at: 180 }, { kind: 'heavy', at: 420 }, { kind: 'success', at: 700 }] },
  pack:       { sound: 'pack',      haptic: 'medium' },
  holo:       { sound: 'holo',      haptic: 'light' },
  holoGrand:  { sound: 'holoGrand', hapticSeq: [{ kind: 'light', at: 0 }, { kind: 'light', at: 70 }, { kind: 'light', at: 140 }, { kind: 'success', at: 400 }] },
  gift:       { sound: 'gift',      haptic: 'light' },
  soz:        { sound: 'soz',       haptic: 'medium' },
  elmas:      { sound: 'elmas',     haptic: 'light' },
  whoosh:     { sound: 'whoosh',    haptic: null },

  breath:      { sound: 'breath',      haptic: null },
  esikGold:    { sound: 'esikGold',    haptic: 'light' },
  esikLapis:   { sound: 'esikLapis',   haptic: 'light' },
  cardBirth:   { sound: 'cardBirth',   haptic: 'medium' },
  nisan:       { sound: 'nisan',       haptic: 'success' },
  streak:      { sound: 'streak',      haptic: 'light', cooldownMs: 300 },
  sendTick:    { sound: 'sendTick',    haptic: null, cooldownMs: 1500 },
  replyBreath: { sound: 'replyBreath', haptic: null, cooldownMs: 45000 },
  flip:        { sound: 'flip',        haptic: 'light' },
  recall:      { sound: 'recall',      haptic: null },
};

// Bıktırma sigortası: yalnız yüksek-frekanslı cue'lar (sohbet vb.) cooldown
// taşır (CUES'ta cooldownMs alanı) — tören cue'ları (seal/milestone/
// holoGrand) nadir zaten, kapı gerektirmez.
const _lastFired = Object.create(null);

export function fxCue(name) {
  const cue = CUES[name];
  if (!cue) return;
  if (cue.cooldownMs) {
    const now = Date.now();
    if (now - (_lastFired[name] || 0) < cue.cooldownMs) return;
    _lastFired[name] = now;
  }
  try {
    const ctx = _ready();
    if (ctx && SOUNDS[cue.sound]) SOUNDS[cue.sound](ctx, cue.tier);
  } catch (_) {}
  if (cue.hapticSeq) { try { _hapticSeq(cue.hapticSeq); } catch (_) {} }
  else if (cue.haptic) { try { fxHaptic(cue.haptic); } catch (_) {} }
}

/* ════════════════════════════════════════════════════════════════════
   FENER AMBİYANSI — opt-in, sürekli, fısıltının altında oda tonu
   "Bu yerin kendi sesi." Varsayılan KAPALI. _moodFor'dan bağımsız KENDİ
   faz tablosu (K7): kendi gain zinciriyle doğrudan _moodFilter'a bağlanır,
   gece kısıklığından bir kez daha etkilenmesin. Tek istisna olarak LOOP
   eder (Wanderer Akordu'nun "asla loop" kuralının dışında tutulan tek yer).
════════════════════════════════════════════════════════════════════ */
let _ambientNodes = null;

function _ambientMoodFor(classList) {
  if (classList?.contains?.('tw-night'))   return { g: 0.012, lpf: 250, partyF: null };
  if (classList?.contains?.('tw-morning')) return { g: 0.02,  lpf: 400, partyF: 147 };
  return { g: 0.02, lpf: 400, partyF: null };
}

function _ambientStart() {
  if (_ambientNodes) return; // zaten çalıyor
  if (!_prefs.sound || !_prefs.ambient || document.hidden) return;
  const ctx = _ensureCtx();
  if (!ctx) return;
  try {
    let reduced = false;
    try { reduced = AnimUtils.prefersReducedMotion(); } catch (_) {}
    const mood = _ambientMoodFor(document.documentElement.classList);

    const g = ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.linearRampToValueAtTime(mood.g, ctx.currentTime + 3); // yavaşça içeri süzül

    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass'; flt.frequency.value = mood.lpf;

    // İki hafif detune'lu G2 sine — çırpınma (beating) dokusu, oda tonu
    const o1 = ctx.createOscillator();
    o1.type = 'sine'; o1.frequency.value = 98; o1.detune.value = -4;
    const o2 = ctx.createOscillator();
    o2.type = 'sine'; o2.frequency.value = 98; o2.detune.value = 4;
    o1.connect(flt); o2.connect(flt);

    // Gürültü katmanı — tonun çok altında, yalnız "oda" hissi
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = _noise(ctx); noiseSrc.loop = true;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = mood.g * 0.15;
    noiseSrc.connect(noiseGain); noiseGain.connect(flt);

    // 0.05Hz LFO — gain'de yavaş "nefes" (reduced-motion'da sabit kalır)
    let lfo = null, lfoGain = null;
    if (!reduced) {
      lfo = ctx.createOscillator();
      lfo.type = 'sine'; lfo.frequency.value = 0.05;
      lfoGain = ctx.createGain();
      lfoGain.gain.value = mood.g * 0.35;
      lfo.connect(lfoGain); lfoGain.connect(g.gain);
    }

    // Sabah partisi — D3, base tonun üstünde ince bir üçlü
    let party = null;
    if (mood.partyF) {
      party = ctx.createOscillator();
      party.type = 'sine'; party.frequency.value = mood.partyF;
      const partyGain = ctx.createGain();
      partyGain.gain.value = mood.g * 0.2;
      party.connect(partyGain); partyGain.connect(flt);
      party.start();
    }

    flt.connect(g); g.connect(_moodFilter); // K7: _master'ı atla, doğrudan moodFilter'a

    o1.start(); o2.start(); noiseSrc.start(); if (lfo) lfo.start();
    _ambientNodes = { ctx, g, o1, o2, noiseSrc, lfo, party };
  } catch (_) { _ambientNodes = null; }
}

function _ambientStop() {
  if (!_ambientNodes) return;
  const { ctx, g, o1, o2, noiseSrc, lfo, party } = _ambientNodes;
  _ambientNodes = null; // hemen serbest bırak — anında yeniden başlatılabilsin
  try {
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.4); // yumuşak kapanış
  } catch (_) {}
  setTimeout(() => {
    try { o1.stop(); o2.stop(); noiseSrc.stop(); lfo?.stop(); party?.stop(); } catch (_) {}
  }, 900);
}

// Sekme arkaya geçince dur (batarya), öne dönünce kullanıcı hâlâ istekliyse devam et.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) _ambientStop();
  else if (_prefs.ambient) _ambientStart();
});

/* ════════════════════════════════════════════════════════════════════
   AYARLAR — anahtarlar (#fx-sound-toggle / #fx-haptic-toggle / #fx-ambient-toggle)
════════════════════════════════════════════════════════════════════ */
export function fxToggleSound(on) {
  _prefs.sound = !!on; fxSave();
  if (on) { _bindUnlock(); fxCue('gift'); if (_prefs.ambient) _ambientStart(); } // canlı önizleme
  else { _ambientStop(); } // ana ses kapanınca Fener de susar
}
export function fxToggleAmbient(on) {
  _prefs.ambient = !!on; fxSave();
  if (on) { _bindUnlock(); _ambientStart(); } else { _ambientStop(); }
}

/** Ambiyans açık mı — Ayarlar'ın toggle'ı dışındaki yüzeyler (Fener
 *  Salonu'nun ocağı) durumu buradan okur; iki yüzey tek gerçeği paylaşır. */
export function fxAmbientAcik() { return !!_prefs.ambient; }
export function fxToggleHaptic(on) {
  _prefs.haptic = !!on; fxSave();
  if (on) fxHaptic('medium');
}
export function fxSyncSettingsUI() {
  const s = document.getElementById('fx-sound-toggle');
  const h = document.getElementById('fx-haptic-toggle');
  const a = document.getElementById('fx-ambient-toggle');
  if (s) s.checked = !!_prefs.sound;
  if (h) h.checked = !!_prefs.haptic;
  if (a) a.checked = !!_prefs.ambient;
}

/* ════════════════════════════════════════════════════════════════════
   INIT — 03-auth-shell post-auth (SafeStorage hidrasyonu sonrası)
════════════════════════════════════════════════════════════════════ */
export function fxInit() {
  fxLoad();
  _bindUnlock();
  fxSyncSettingsUI();
}

/* ── window expose (HTML onclick + TDZ-güvenli modüller-arası erişim) ── */
if (typeof window !== 'undefined') {
  window.fxInit = fxInit;
  window.fxCue = fxCue;
  window.fxHaptic = fxHaptic;
  window.fxToggleSound = fxToggleSound;
  window.fxToggleHaptic = fxToggleHaptic;
  window.fxToggleAmbient = fxToggleAmbient;
  window.fxAmbientAcik   = fxAmbientAcik;
  window.fxSyncSettingsUI = fxSyncSettingsUI;
}
