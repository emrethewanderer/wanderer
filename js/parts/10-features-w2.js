import { S } from '../state.js';
import { EMRE_IMG } from '../config.js';
import { EventBus, escapeHTML, localISODate } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { p, reTest } from './16-i18n-prompts.js';
import { loadMoodHistory } from './04-llm-hero-history.js';
import { loadSomaticHistory, loadPartsHistory } from './05-closure-parts.js';
import { p3GetProactiveGreeting, p6GetProactiveCheckin } from './09a-personalization-engine.js';
import { nowTR } from './00-config-tracking.js';
import { loadKnowledge } from './07-settings-knowledge.js';
import { getSuggestedArchetype, getArchetypeById } from './12a-archetypes.js';

import { showDailyThought } from './10d-w2-quickask.js';
import { isGreetingOnly } from './01-prompts-modes.js';
import { kokenOlc } from './13y-koken.js';

import { getUserLevel } from './10b-w2-gamification.js';

/* Bir temelin "ölçülmüş" sayılması için gereken en az sinyal — 09b'nin
   dfGetActiveFoundationTarget eşiğiyle aynı sayı, tek yerde yazılı. */
const TEMEL_MIN_SINYAL = 2;
/* Mertebe beş temelin BİLEŞİMİdir; ikisiyle söylenen mertebe uydurmadır. */
const MERTEBE_MIN_OLCUM = 3;
/* ═══ MANİFESTO ═══ */
// Manifesto fonksiyonları 10c-w2-manifesto.js'e taşındı.

// QuickAsk + Daily Thought + Calendly entegrasyonu 10d-w2-quickask.js'e taşındı.

/* ═══ SIGIL SVG GENERATOR (wv2-shared.jsx:75–170 birebir) ═══ */
function wsSigil(kind, size = 80, sealed = true, stroke = 1.2) {
  const c = sealed ? 'var(--gold)' : 'var(--text-dim)';
  const sw = stroke;
  const sigils = {
    oath:    `<circle cx="50" cy="50" r="36" fill="none" stroke="${c}" stroke-width="${sw}"/><circle cx="50" cy="50" r="28" fill="none" stroke="${c}" stroke-width="${sw*0.5}" opacity="0.5"/><path d="M50 22 L50 78 M22 50 L78 50" stroke="${c}" stroke-width="${sw*0.7}"/><path d="M50 36 L58 50 L50 64 L42 50 Z" fill="none" stroke="${c}" stroke-width="${sw}"/><circle cx="50" cy="50" r="3" fill="${c}"/>`,
    truth:   `<polygon points="50,18 80,68 20,68" fill="none" stroke="${c}" stroke-width="${sw}"/><circle cx="50" cy="52" r="6" fill="none" stroke="${c}" stroke-width="${sw}"/><line x1="50" y1="52" x2="50" y2="68" stroke="${c}" stroke-width="${sw}"/>`,
    shadow:  `<circle cx="50" cy="50" r="32" fill="none" stroke="${c}" stroke-width="${sw}"/><path d="M50 18 A32 32 0 0 0 50 82 Z" fill="${c}" opacity="0.7"/><circle cx="50" cy="50" r="4" fill="${sealed ? 'var(--bg)' : 'none'}" stroke="${c}" stroke-width="${sw*0.7}"/>`,
    courage: `<path d="M50 14 L62 38 L86 42 L68 60 L74 86 L50 72 L26 86 L32 60 L14 42 L38 38 Z" fill="none" stroke="${c}" stroke-width="${sw}"/><circle cx="50" cy="50" r="4" fill="${c}"/>`,
    silence: `<circle cx="50" cy="50" r="34" fill="none" stroke="${c}" stroke-width="${sw}"/><line x1="30" y1="50" x2="70" y2="50" stroke="${c}" stroke-width="${sw}"/><line x1="20" y1="35" x2="80" y2="35" stroke="${c}" stroke-width="${sw*0.4}" opacity="0.6"/><line x1="20" y1="65" x2="80" y2="65" stroke="${c}" stroke-width="${sw*0.4}" opacity="0.6"/>`,
    mirror:  `<ellipse cx="50" cy="50" rx="28" ry="36" fill="none" stroke="${c}" stroke-width="${sw}"/><ellipse cx="50" cy="50" rx="14" ry="20" fill="none" stroke="${c}" stroke-width="${sw*0.6}" opacity="0.5"/><path d="M40 20 L60 20" stroke="${c}" stroke-width="${sw}"/>`,
    void:    `<circle cx="50" cy="50" r="34" fill="none" stroke="${c}" stroke-width="${sw}"/><circle cx="50" cy="50" r="20" fill="${c}" opacity="0.85"/>`,
    rune:    `<path d="M30 20 L30 80 M30 20 L60 50 M30 50 L60 80" fill="none" stroke="${c}" stroke-width="${sw}"/><circle cx="70" cy="35" r="3" fill="${c}"/>`,
    spiral:  `<path d="M50 50 m-30 0 a30 30 0 1 1 30 30 a22 22 0 1 1 -22 -22 a14 14 0 1 1 14 14 a6 6 0 1 1 -6 -6" fill="none" stroke="${c}" stroke-width="${sw}"/>`,
    cross:   `<path d="M50 18 L50 82 M18 50 L82 50" stroke="${c}" stroke-width="${sw}"/><circle cx="50" cy="50" r="14" fill="none" stroke="${c}" stroke-width="${sw}"/><circle cx="50" cy="50" r="3" fill="${c}"/>`,
    niyet:   `<path d="M14 50 Q50 22 86 50 Q50 78 14 50 Z" fill="none" stroke="${c}" stroke-width="${sw}"/><circle cx="50" cy="50" r="10" fill="none" stroke="${c}" stroke-width="${sw}"/><circle cx="50" cy="50" r="3" fill="${c}"/>`,
    elmas:   `<path d="M50 18 L74 38 L60 78 L40 78 L26 38 Z" fill="none" stroke="${c}" stroke-width="${sw}"/><path d="M26 38 L74 38 M50 18 L50 78 M40 78 L26 38 L50 18 L74 38 L60 78" fill="none" stroke="${c}" stroke-width="${sw*0.5}" opacity="0.55"/>`,
  };
  return `<svg class="ws-sigil" width="${size}" height="${size}" viewBox="0 0 100 100">${sigils[kind] || sigils.oath}</svg>`;
}

/* ═══ HASIM SHIELD SVG (wsv4-screens.jsx:423–507) ═══ */
function wsHasimShield(boss, size = 36) {
  const isDefeated = boss.state === 'defeated';
  const isWounded  = boss.state === 'wounded';
  const isActive   = boss.state === 'active';
  const isUnmet    = boss.state === 'unmet';
  const color = isDefeated ? 'var(--text-dim)' : isWounded ? 'var(--gold)' : isUnmet ? 'var(--text-dim)' : 'var(--red)';
  const fillBg = isDefeated ? 'rgba(255,255,255,0.02)' : isActive ? 'rgba(192,57,43,0.10)' : isWounded ? 'rgba(184,149,60,0.10)' : 'rgba(7,7,7,0.45)';
  const ringPts = Array.from({length:12}, (_,i) => i * 30);
  const hatchId = `hasim-hatch-${boss.id}`;
  let inner = '';
  // tick notches
  if (!isUnmet) {
    ringPts.forEach(deg => { inner += `<line x1="20" y1="2" x2="20" y2="3.4" stroke="${color}" stroke-width="0.5" opacity="0.6" transform="rotate(${deg} 20 20)"/>`; });
    inner += `<defs><pattern id="${hatchId}" patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="3" stroke="${color}" stroke-width="0.35" opacity="0.55"/></pattern></defs>`;
    inner += `<circle cx="20" cy="20" r="15" fill="url(#${hatchId})" stroke="${color}" stroke-width="0.4" opacity="0.55"/>`;
    inner += wsHasimGlyph(boss.id, color, isDefeated ? 0.45 : 0.95);
  }
  if (isDefeated) inner += `<g stroke="var(--gold)" stroke-width="1.3" stroke-linecap="round" opacity="0.9"><path d="M 8 8 L 32 32"/><path d="M 32 8 L 8 32"/></g>`;
  if (isUnmet) inner += `<text x="20" y="25" text-anchor="middle" font-family="IM Fell English,serif" font-style="italic" font-size="14" fill="${color}" opacity="0.7">?</text>`;
  return `<div class="ws-hasim-shield${isUnmet ? ' ws-hasim-shield--unmet' : ''}" style="width:${size}px;height:${size}px;">
    <svg viewBox="0 0 40 40" width="${size}" height="${size}" style="overflow:visible;">
      <circle cx="20" cy="20" r="18" fill="${fillBg}" stroke="${color}" stroke-width="1.2" ${isUnmet ? 'stroke-dasharray="2 2.5"' : ''}/>
      ${inner}
    </svg>
  </div>`;
}

/* ═══ HASIM GLYPH SVG (wsv4-screens.jsx:356–418) ═══ */
function wsHasimGlyph(kind, color, opacity = 1) {
  const c = color, sw = 1.1;
  const glyphs = {
    erteleme:   `<path d="M 5 3 L 19 3 L 19 6 L 12 12 L 19 18 L 19 21 L 5 21 L 5 18 L 12 12 L 5 6 Z" stroke="${c}" fill="none" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/><path d="M 7 5 L 17 5" stroke="${c}" fill="none" stroke-width="${sw}"/><path d="M 7 19 L 17 19" stroke="${c}" fill="none" stroke-width="${sw}"/><path d="M 9 8 L 15 8" stroke="${c}" fill="none" stroke-width="${sw}" opacity="0.7"/><circle cx="12" cy="10" r="0.9" fill="${c}"/>`,
    onay:       `<path d="M 3 12 Q 12 3 21 12 Q 12 21 3 12 Z" stroke="${c}" fill="none" stroke-width="${sw}" stroke-linecap="round"/><circle cx="12" cy="12" r="3.4" stroke="${c}" fill="none" stroke-width="${sw}"/><circle cx="12" cy="12" r="1.2" fill="${c}"/><path d="M 12 4 L 12 2.5 M 12 22 L 12 20.5 M 4 12 L 2.5 12 M 22 12 L 20.5 12" stroke="${c}" stroke-width="${sw}" opacity="0.7"/>`,
    kacis:      `<path d="M 12 3.5 A 8.5 8.5 0 1 1 3.5 12 A 8.5 8.5 0 0 1 12 3.5 M 12 6.5 A 5.5 5.5 0 1 0 17.5 12 A 5.5 5.5 0 0 0 12 6.5 M 12 9.5 A 2.5 2.5 0 1 1 9.5 12" stroke="${c}" fill="none" stroke-width="${sw}" stroke-linecap="round"/><circle cx="12.5" cy="12.5" r="0.9" fill="${c}"/>`,
    kizginlik:  `<rect x="3" y="3" width="18" height="18" stroke="${c}" fill="none" stroke-width="${sw}" stroke-dasharray="2 2" opacity="0.6"/><path d="M 12 6 Q 8 10 10 14 Q 7 14.5 8 17 Q 9.5 19 12 19 Q 14.5 19 16 17 Q 17 14.5 14 14 Q 16 10 12 6 Z" stroke="${c}" fill="none" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`,
    yakistirma: `<g transform="rotate(180 12 12)" stroke="${c}" fill="none" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><path d="M 4 17 L 4 8 L 8 12 L 12 5 L 16 12 L 20 8 L 20 17 Z"/><path d="M 4 17 L 20 17"/><circle cx="12" cy="9" r="0.9" fill="${c}"/></g>`,
    kiyaslama:  `<line x1="3" y1="8" x2="13" y2="8" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/><line x1="3" y1="16" x2="21" y2="16" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/><circle cx="3" cy="8" r="1.2" fill="${c}"/><circle cx="13" cy="8" r="1.2" fill="${c}"/><circle cx="3" cy="16" r="1.2" fill="${c}"/><circle cx="21" cy="16" r="1.2" fill="${c}"/><line x1="3" y1="6" x2="3" y2="18" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" opacity="0.5"/>`,
  };
  return `<g transform="translate(8, 8)" opacity="${opacity}">${glyphs[kind] || glyphs.erteleme}</g>`;
}

/* ═══ DEPTH HESAPLAMA (ortak) ═══ */
function _getDepthLabel(dp) {
  if (!dp) return 'STANDART';
  const scores = [
    { key: 'layik', label: 'LAYIK' },
    { key: 'normal', label: 'NORMAL' },
    { key: 'hak_etmek', label: 'HAK ETMEK' },
    { key: 'standart', label: 'STANDART' }
  ];
  let best = scores[scores.length - 1];
  for (const s of scores) {
    if (dp[s.key] && dp[s.key].score >= 60) { best = s; break; }
  }
  return best.label;
}

/* ═══ VESPER ARC UPDATE (ortak) ═══ */
function _updateVesperArc(arcId) {
  const arc = document.getElementById(arcId);
  if (!arc) return;
  const totalMsgs = (S.allSessions?.[S.currentSessId] || []).filter(m => m.role === 'user').length;
  const maxMsgs = S.settings?.free_message_limit || 20;
  const ratio = Math.min(totalMsgs / maxMsgs, 1);
  const circumference = 2 * Math.PI * 16; // r=16
  arc.setAttribute('stroke-dashoffset', circumference * (1 - ratio));
}

/* ═══ BUGÜN EKRANI ═══ */
export function loadBugunView() {
  const streak = parseInt(document.getElementById('topbar-streak-count')?.textContent || '0');
  const userName = document.getElementById('ob-name')?.textContent || t('fm.gezgin', 'Gezgin');

  // Tarih + selamlama — ay/gün adları Intl ile lokalize (UI dilinde)
  const now = new Date();
  const _lang = S._currentLang || 'tr';
  const _mLong  = new Intl.DateTimeFormat(_lang, { month: 'long' }).format(now).toLocaleUpperCase(_lang);
  const _mShort = new Intl.DateTimeFormat(_lang, { month: 'short' }).format(now).toLocaleUpperCase(_lang);
  const _dLong  = new Intl.DateTimeFormat(_lang, { weekday: 'long' }).format(now).toLocaleUpperCase(_lang);
  const _dShort = new Intl.DateTimeFormat(_lang, { weekday: 'short' }).format(now).toLocaleUpperCase(_lang);
  const dateStr = `${now.getDate()} ${_mLong} · ${_dLong}`;
  const hour = now.getHours();
  let greeting = t('fm.greet.evening', 'İyi akşamlar');
  if (hour < 6) greeting = t('fm.greet.night', 'İyi geceler');
  else if (hour < 12) greeting = t('fm.greet.morning', 'İyi sabahlar');
  else if (hour < 18) greeting = t('fm.greet.day', 'İyi günler');

  const dateEl = document.getElementById('bugun-date');
  const salEl = document.getElementById('bugun-salutation');
  if (dateEl) dateEl.textContent = dateStr;
  if (salEl) salEl.textContent = `${greeting}, ${userName}.`;

  // İçsel Hava — takvim yaprağı (bugünün tarihi)
  const calMonthEl = document.getElementById('bugun-cal-month');
  const calDayEl   = document.getElementById('bugun-cal-daynum');
  const calDowEl   = document.getElementById('bugun-cal-dow');
  if (calMonthEl) calMonthEl.textContent = _mShort.slice(0, 3);
  if (calDayEl)   calDayEl.textContent   = now.getDate();
  if (calDowEl)   calDowEl.textContent   = _dShort.slice(0, 3);

  // Streak + Vesper
  const streakEl = document.getElementById('bugun-streak');
  if (streakEl) streakEl.textContent = streak;
  _updateVesperArc('bugun-vesper-arc');

  // Kimlik kartı — olmak istediğin kişi (hedef arketip)
  const pt = S._personTransition;
  const dp = S._depthProfile;
  const depthLabel = _getDepthLabel(dp);
  const targetArch = getSuggestedArchetype();
  // Arketip name alanı ALL CAPS veri formatında (kart tasarımı için).
  // Identity card'da gösterim için Title Case'e çevir: "SÖZÜNÜ TUTAN" → "Sözünü Tutan"
  function _toTitleCase(str) {
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  const personName = targetArch
    ? `${_toTitleCase(targetArch.name)} ${targetArch.sub}`
    : (pt?.desired?.description || pt?.current?.description || t('w2.intentful_wanderer', 'Niyetli Gezgin'));

  const daysEl = document.getElementById('bugun-identity-days');
  const nameEl = document.getElementById('bugun-identity-name');
  const depthEl = document.getElementById('bugun-identity-depth');
  if (daysEl) daysEl.textContent = streak;
  if (nameEl) nameEl.textContent = personName;
  if (depthEl) depthEl.textContent = `◆ ${depthLabel} ◆`;

  // Drawer identity sync (kartlar artık LLM kenar çubuğunda — 11 chDrawerOpen da çağırır)
  w2SyncDrawerIdentityCards();

  // Günlük Ritüel (10s) — Verdiğin Söz kartı (Günün Sözü pop-up'ı uygulamaya
  // girişten önce verildi). Birden çok söz verildiyse canlı geçiş yapar.
  try { window.glRenderVerdiginSoz && window.glRenderVerdiginSoz(); } catch (_) {}
  try { window.glElmasBarUpdate && window.glElmasBarUpdate(); } catch (_) {}
  // Cazibe (10r) — diğer kaldıraçlar (toplumsal kanıt vb.) için orkestratör
  try { window.czRenderBugun && window.czRenderBugun(); } catch (_) {}
  // İmge Kapısı (13z) — imge henüz seçilmemişse davet şeridi. Kendi
  // kapılarını içeride yokluyor (imge var mı, Benlik Kartı mühürlü mü).
  try { window.igMaybeInvite && window.igMaybeInvite(); } catch (_) {}

  // Üç Mühür hero'su (10f) — iki ana kart ve ARKALARINDAKİ deste. Kişilerim'in
  // ayrı bölümü 2026-08-18'de söküldü; kartlar buraya, tam ekran odaya (13B)
  // açılan yığına taşındı.
  try { window.yolRenderHero?.(); } catch (_) {}

  // Derin Çalışma (13A) — sökülen deste bölümünün yerindeki tezgâh kesiti.
  try { window.dcRenderBugun?.(); } catch (_) {}

  // Geçiş Kartım (10A) — artık ayrı şerit çizmiyor: kutupları yukarıdaki
  // hero'nun yığınında yaşıyor. Buradaki tek işi greeting modu —
  // loadBugunView selamı yeniden yazdığı için input durumu her açılışta tazelenir.
  try { window.gkSyncGreeting && window.gkSyncGreeting(); } catch (_) {}

  /* İÇSEL HAVA + İÇ SES + ENERJİ bloğu KALDIRILDI (2026-08-02).
     Yetim kanıtı: aradığı yedi element de (#bugun-hava-icon/-label/-sub/-dots,
     #bugun-ic-ses, #bugun-enerji-bar/-val) `_src.html`'de YOK — "Bugün ekranı
     yeniden düzen" sprintinde İçsel Hava Gün Özeti'ne, İç Ses #icses-page'e
     taşınmıştı; render kodu artık kalmıştı ve her guard'da sessizce düşüyordu.

     Ölü olduğu hâlde silindi, çünkü içinde DÖRT kanıtsız değer üretimi
     yaşıyordu ve blok bir gün canlansa uydurma geri gelirdi:
       · `let mood = 'parcali'` — hiç duygu verisi olmayan kullanıcıya
         "İçsel Hava: PARÇALI · Niyet açık, eylem ağır" teşhisi
       · `last?.intensity || 0.5` — ölçülmemiş yoğunluk
       · `optimal_challenge_level ?? 0.5` — state'te null'a çekilen ölçümü
         sessizce 0.5'e geri çeviriyordu (yani düzeltmeyi etkisiz kılıyordu)
       · `Math.floor(Date.now()/86400000) % voices.length` — kullanıcının
         "iç sesi" TAKVİMDEN hesaplanıyordu; hiçbir kökene dayanmıyor.
     `w2.hava.*` / `w2.voice.*` sözlük anahtarları ve `.ws-mood-dot*` stilleri
     yerinde bırakıldı: i18n paritesi ayrı bir kapıdır, orası ayrı temizlik. */

  // Seri Mührü kartı (10t) — hafta zincirinin yerine: günü mühürle durumu +
  // kilometre taşı koleksiyonu kapısı. (Eski _renderWeekChain kaldırıldı.)
  try { window.smRenderBugunCard && window.smRenderBugunCard(); } catch (_) {}

  // Günün düşüncesi
  showDailyThought();

  // Wanderer Oyunu — Ayna ayağı (10g)
  // Ayna/Geçiş Alanı/Hayal Bugün kartları kaldırıldı (artık "Üç Mühür" →
  // "Hayal" başlıklarından açılıyor); ama Ayna refleksi (merkezî seriyi
  // besler) ve Vasıta tuzağı bannerı Bugün'e girişte çalışmaya devam etmeli.
  // Dinamik import: döngüsel bağımlılığı önler.
  import('./10g-w2-wanderer-game.js').then(m => {
    try {
      m.aynaReflectToday();      // günde bir: aynaya bakma ödülü + merkezî seri
      m.checkAdminAnnouncement(); // #announce-banner: Emre'nin manuel duyurusu ("Anladım" ile kapanır)
      m.checkLibraryUpdate();     // Kitaplığa yeni içerik → otomatik alttan-kayan sayfa
    } catch (e) { console.warn('aynaReflectToday:', e?.message); }
  }).catch(() => {});

  // Olmak İstediğin Kişi (10D) — Bugün'e girişte elmas kristal eşiği kontrolü
  // (eski gaRenderBugunCard'ın kristal kontrolünün halefi).
  try { window.oikCheckCrystal?.(); } catch (e) { console.warn('oikCheckCrystal:', e?.message); }

  // Yol hero (10f) — Üç Mühür: altın ↔ lapis kutuplar + bugünün halkası.
  // (Eski Geçiş Şeridi _renderBkGecisStridi/_bkTarotFace emekli oldu;
  // smRenderBugunCard çağrısı yukarıda zaten hero'yu tazeliyor, bu çağrı
  // Bugün'e her girişte kutup kartlarının en taze kimlik verisiyle
  // çizilmesini garantiler.)
  try { window.yolRenderHero && window.yolRenderHero(); } catch (_) {}

  // STÜDYO bölgesi (tek sayfa) — Galeri rafı + oda sayaçları
  try { wsSyncStudio(); } catch (_) {}

  // Bölge Nabzı — beş STÜDYO çapası ayraç altına inince görünür mü, hiç
  // görünmüyor mu (İç Çalışma 18 · A). loadBugunView Bugün'e her girişte
  // çağrılır; gözlemci burada kurulmalı ki çapa DOM'a yeni geldiğinde
  // (ekran değişince #bugun-view yeniden monte olabilir) yeniden bağlanır.
  try { _bolgeGozle(); } catch (_) {}
}

/* ─── BÖLGE NABZI (İç Çalışma 18 rev.2 · boşluk A) ───
   Ayraç altına kaç kişi indi, Galeri/İç Dünya/yolculuk/ocak hiç görüldü mü
   sezgiyle biliniyordu, kadrandan değil. Beş çapayı `IntersectionObserver`
   ile gözler; her biri bölge başına OTURUMDA BİR KEZ sayılır (RİSK 2) —
   `_bolgeGorulen` modül-yerel set'i loadBugunView'ın tekrar tekrar
   çağrılmasından etkilenmez, sayfa yaşadığı sürece yaşar. Bölge bir kez
   görülünce `unobserve` edilir; ikinci kez gözlenmez, ikinci kez de
   yazılmaz. `gun` bilinçli olarak yok (K1, 00f'in wtLogBolge yorumu). */
const _BOLGE_ANCHORS = {
  'ws-studio-divider': 'ayrac',
  'studio-galeri':     'galeri',
  'studio-icdunya':    'icdunya',
  'studio-yolculuk':   'yolculuk',
  'studio-ocak':       'ocak',
};
let _bolgeGorulen = new Set();
let _bolgeObs = null;

function _bolgeGozle() {
  // Eski tarayıcı / test ortamı — sessiz düş, akışı bloklamaz (§5.2).
  if (typeof IntersectionObserver === 'undefined') return;
  if (!_bolgeObs) {
    _bolgeObs = new IntersectionObserver((girisler) => {
      girisler.forEach((g) => {
        if (!g.isIntersecting) return;
        const bolge = _BOLGE_ANCHORS[g.target.id];
        if (!bolge || _bolgeGorulen.has(bolge)) return;
        _bolgeGorulen.add(bolge);
        try { window.wtLogBolge?.(bolge); } catch (_) {}
        _bolgeObs.unobserve(g.target);   // bir kez sayılır; yol geriye akmaz
      });
    });
  }
  Object.entries(_BOLGE_ANCHORS).forEach(([id, bolge]) => {
    if (_bolgeGorulen.has(bolge)) return;   // zaten sayıldı — yeniden gözleme
    const el = document.getElementById(id);
    if (el) _bolgeObs.observe(el);          // aynı elemanı iki kez observe etmek no-op'tur
  });
}

/* ─── STÜDYO BÖLGESİ SENKRONU ───
   Bugün'ün alt yarısındaki odaların canlı dokusu: Galeri rafı (son kazanılan
   kartlar, 12c mini yüzler), Kişilerim/Mühür/Meclis sayaçları. loadBugunView
   her Bugün girişinde çağırır → raf kendiliğinden tazelenir; kart kazanım anı
   için 10q da (kkTick) window üzerinden tetikler. Ağır modüller (10q/12b/12c/
   10g) dinamik import — modül-10 erken yüklenir, TDZ/döngü riskine girmeyiz. */
export function wsSyncStudio() {
  if (!document.getElementById('ws-studio-divider')) return;

  // İç Meclis — tanınan yüz sayısı (S'ten, senkron). Suretler normalde yalnız
  // Meclis ekranında hidrate olur; hiç yüklenmemişse BİR KEZ tembel çek —
  // getSuretler sonunda wsSyncStudio'yu tekrar tetikler, ikinci turda
  // S._suretler artık tanımlı olduğundan döngü kendiliğinden durur.
  if (S._suretler === undefined && S.currentUser?.id) {
    import('./10p-w2-meclis.js').then(m => m.getSuretler?.()).catch(() => {});
  }
  try {
    const el = document.getElementById('studio-meclis-sub');
    const taninan = (S._suretler || []).filter(s => s.hal === 'adlandi' || s.hal === 'butunlesti').length;
    if (el) el.textContent = taninan === 1
      ? t('studio.meclis_1', 'bir yüz mecliste')
      : (taninan > 1
        ? t('studio.meclis_n', '{n} yüz mecliste').replace('{n}', taninan)
        : t('studio.meclis_0', 'yüzlerin meclisi'));
  } catch (_) {}

  // Örüntü Aynası — canlı alt-satır + taze nokta (09d, window köprüsü)
  try { window.omRefreshRoomSub?.(); } catch (_) {}

  // Ayna Anı — canlı alt-satır + taze nokta (09h, window köprüsü)
  try { window.ayRefreshRoomSub?.(); } catch (_) {}

  // Kişilerin Kişileri — sosyal dokunuş taze noktası (10C, window köprüsü;
  // async ama sonucu beklenmez — om/ay ile aynı "fire and forget" kalıbı).
  try { window.sfRefreshRoomPulse?.(); } catch (_) {}

  // Geçiş Yolu — canlı gün/perde alt-satırı (13s, window köprüsü)
  try { window.gySyncRoomSub?.(); } catch (_) {}

  // Dönüşüm Aynası — 90 günlük uygunluk alt-satırı (13t, window köprüsü)
  try { window.gbSyncRoomSub?.(); } catch (_) {}

  // Derin Çalışma — tezgâhın durumu: açık / tadımlık / Max ile açılır (13A)
  try { window.dcSyncRoomSub?.(); } catch (_) {}

  // Alfabe Işık — yazılı nişan sayısı (12e)
  import('./12e-isik-nisanlari.js').then(m => {
    try {
      const el = document.getElementById('studio-isik-sub');
      if (!el) return;
      const total = m.NISANLAR.length;
      const n = m.isikWrittenCount?.() || 0;
      el.textContent = n > 0
        ? t('studio.isik_n', '{n}/{total} nişan yazılı').replace('{n}', n).replace('{total}', total)
        : t('studio.isik_0', 'fısıltıya karşı nişan');
    } catch (_) {}
  }).catch(() => {});

  // Mührüm — canlı elmas sayısı
  import('./10g-w2-wanderer-game.js').then(m => {
    try {
      const el = document.getElementById('studio-muhrum-sub');
      if (!el) return;
      const n = m.getElmasSayisi?.() || 0;
      el.textContent = n > 0
        ? `◆ ${n.toLocaleString(S._currentLang || 'tr')} · ${t('studio.manifesto', 'manifesto')}`
        : t('studio.muhrum_sub', 'elmas · manifesto');
    } catch (_) {}
  }).catch(() => {});

  // Galeri — sayaç + kart rafı
  Promise.all([
    import('./10q-w2-kisi-karti.js'),
    import('./12b-kart-destesi.js'),
    import('./12c-kart-gorsel.js'),
  ]).then(([q, deck, ikv]) => {
    try {
      const st = q.getKisilerimStats?.();
      const subEl = document.getElementById('studio-kisilerim-sub');
      if (subEl && st) subEl.textContent = st.earned > 0
        ? t('studio.kisilerim_n', 'topladığın {n} kişi').replace('{n}', st.earned)
        : t('studio.kisilerim_0', 'topladığın kişiler');

      const shelf = document.getElementById('gal-shelf');
      const empty = document.getElementById('gal-shelf-empty');
      if (!shelf || !empty) return;
      const coll = (S._kisiKarti && S._kisiKarti.collection) || {};
      const ids = Object.keys(coll)
        .sort((a, b) => new Date(coll[b]?.earnedAt || 0) - new Date(coll[a]?.earnedAt || 0))
        .slice(0, 8);
      const cards = ids.map(id => deck.getCardById?.(id)).filter(Boolean);
      if (!cards.length) { shelf.style.display = 'none'; empty.style.display = ''; return; }
      shelf.innerHTML = cards.map((c, i) => {
        const safeId = String(c.id).replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeName = String(c.name || '').replace(/"/g, '&quot;');
        return `<button class="gal-shelf-card" style="--gi:${i};" onclick="kkOpenDetail('${safeId}')" aria-label="${safeName}">${ikv.ikvCardFace(c, { mini: true })}</button>`;
      }).join('') +
        `<button class="gal-shelf-more" style="--gi:${cards.length};" onclick="switchView('kisilerim')"><span>✦</span><span>${t('studio.see_all', 'HEPSİNİ GÖR')}</span></button>`;
      empty.style.display = 'none';
      shelf.style.display = '';
    } catch (e) { console.warn('wsSyncStudio galeri:', e); }
  }).catch(() => {});

  // Hazine Destesi — sahipli bilgelik kartı sayısı (12f)
  import('./12f-hazine-paketleri.js').then(m => {
    try {
      const el = document.getElementById('studio-hazine-sub');
      if (!el) return;
      const setler = m.getHazineSetler?.() || [];
      if (!setler.length) return; // sidecar henüz gelmedi — bir sonraki senkronda dolar
      const state = m.hzState?.();
      if (!state) return;
      const total = setler.reduce((a, s) => a + (m.getHazineKartlarBySet?.(s.id, { excludeTac: true }) || []).length, 0);
      const owned = setler.reduce((a, s) => a + (m.hzOwnedCount?.(state, s.id) || 0), 0);
      el.textContent = owned > 0
        ? t('studio.hazine_n', '{n}/{total} hazine').replace('{n}', owned).replace('{total}', total)
        : t('studio.hazine_0', 'kitabın bilgeliği');
    } catch (_) {}
  }).catch(() => {});
}

/* ═══ SOHBET KİMLİK BANNER ═══ */
export function updateChatIdentityBanner() {
  const pt = S._personTransition;
  const dp = S._depthProfile;
  const nameEl = document.getElementById('ws-chat-id-name');
  if (!nameEl) return;
  const targetArch = getSuggestedArchetype();
  const _toTitle = str => str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  const personName = targetArch
    ? `${_toTitle(targetArch.name)} ${targetArch.sub}`
    : (pt?.desired?.description || pt?.current?.description || t('w2.intentful_wanderer', 'Niyetli Gezgin'));
  const depthLabel = _getDepthLabel(dp);
  nameEl.innerHTML = `${escapeHTML(personName)} <span class="ws-depth-label">· ${depthLabel}</span>`;

  // Sigils (S2Sohbet:100–103) — show mühürlenmiş sigils
  const sealsEl = document.getElementById('ws-chat-id-seals');
  if (sealsEl) {
    const manifesto = S._manifestoEntries || [];
    const sealedSigils = manifesto.filter(m => m.sealed).slice(0, 3);
    let html = sealedSigils.map(m => wsSigil(m.sigil || 'oath', 20, true, 1.2)).join('');
    html += wsSigil('silence', 20, false, 1.2); // always show one unsealed
    sealsEl.innerHTML = html;
  }

  // Week chain in chat banner (S2Sohbet:114)
  const chatChainEl = document.getElementById('ws-chat-week-chain');
  if (chatChainEl) {
    const streak = parseInt(document.getElementById('topbar-streak-count')?.textContent || '0');
    // Gün kısaltmaları Intl ile (index 0=Pazar; 2024-01-07 Pazar) — UI dilinde
    const _dnLang = S._currentLang || 'tr';
    const dayNames = Array.from({ length: 7 }, (_, i) =>
      new Intl.DateTimeFormat(_dnLang, { weekday: 'short' }).format(new Date(2024, 0, 7 + i)));
    const today = new Date().getDay();
    const chain = [];
    for (let i = 0; i < 7; i++) {
      const dayIdx = (today - 6 + i + 7) % 7;
      let state = 'pending';
      if (i === 6) state = 'today';
      else if (i >= 7 - streak) state = 'sealed';
      else if (streak > 0 && i === 7 - streak - 1) state = 'broken';
      chain.push({ d: dayNames[dayIdx], state });
    }
    chatChainEl.innerHTML = chain.map(c => {
      let cls = 'ws-week-circle ws-week-circle--sm';
      if (c.state === 'sealed') cls += ' ws-week-circle--sealed';
      else if (c.state === 'today') cls += ' ws-week-circle--today';
      else if (c.state === 'broken') cls += ' ws-week-circle--broken';
      else cls += ' ws-week-circle--pending';
      const symbol = c.state === 'today' ? '·' : c.state === 'sealed' ? '✦' : c.state === 'broken' ? '×' : '';
      return `<div class="ws-week-day"><div class="${cls}">${symbol}</div></div>`;
    }).join('');
  }

  // Message count (S2Sohbet:117–119)
  const countEl = document.getElementById('ws-chat-msg-count');
  if (countEl) {
    const todayMsgs = S._todayMessageCount || 0;
    const max = S.settings?.dailyMessageLimit || 20;
    countEl.innerHTML = `${todayMsgs}<span> / ${max}</span>`;
  }
}

/* ═══ TAB SİSTEMİ ═══ */
export function wsTab(btn, group) {
  const row = btn.parentElement;
  row.querySelectorAll('.ws-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const tabId = btn.getAttribute('data-tab');
  document.querySelectorAll(`.ws-tab-content[data-group="${group}"]`).forEach(c => c.classList.remove('active'));
  const target = document.getElementById(tabId);
  if (target) target.classList.add('active');
}

/* ═══ ATLAS BÖLGELERİ — ATLAS ekranı 2026-06-16 kaldırıldı; dizi Hasımlar boss-bölge eşlemesi için korunuyor (bkz. hafıza: atlas-ekrani-kaldirildi) ═══ */
const ATLAS_REGIONS = [
  { id: 'arkadaki', name: 'NİYET VADİSİ', life: 'Arkadaki Sen', sigil: 'niyet', fpKey: 'bolluk',    whisper: 'Hayal âlemi hayal değildir.',         coord: '07°·02\'' },
  { id: 'bireysel', name: 'KENDİ ORMANI',  life: 'Bireysel',     sigil: 'spiral', fpKey: 'oz_guven', whisper: 'Olduğun kişiye göre bir hayatın olur.', coord: '11°·44\'' },
  { id: 'iliski',   name: 'İKİ YOL',       life: 'İlişki',       sigil: 'mirror', fpKey: 'oz_saygi', whisper: 'Mesele o değil, sensin.',               coord: '23°·09\'' },
  { id: 'is',       name: 'ÇELİK BÖLGESİ', life: 'İş',           sigil: 'rune',   fpKey: 'oz_deger', whisper: 'Hayat, seçimlerden oluşur.',            coord: '—' },
];

/* ═══ MÜHRÜM EKRANI — etiketler render anında i18n'den (modül-yükünde DONMASIN) ═══ */
const TEMELLER_KEYS = [
  { id: 'oz_sevgi' }, { id: 'oz_saygi' }, { id: 'oz_deger' }, { id: 'oz_guven' }, { id: 'bolluk' },
];
const _temelName = (id) => t('w2.temel.' + id, id.toUpperCase());
const DERINLIKLER_IDS = ['standart', 'hak_etmek', 'normal', 'layik'];
const _derinlikName = (id) => t('w2.derinlik.' + id + '.name', id.toUpperCase());
const _derinlikDesc = (id) => t('w2.derinlik.' + id + '.desc', '');

export function loadMuhrumView() {
  const elmasEl = document.getElementById('muhrum-elmas');
  const manifestoEl = document.getElementById('muhrum-manifesto');
  if (!elmasEl) return;

  const fp = S._foundationsProfile || {};
  const dp = S._depthProfile || {};
  /* Kanıtsız temel ÖLÇÜLMEMİŞTİR. Eskiden `?? 50` ile hiç sinyal gelmemiş
     temeller de 50 sayılıyor, beş temelin ortalaması 50 çıkıyor ve kullanıcı
     hiçbir şey yapmadan 1. mertebeye oturuyordu. Mertebe kazanılır. */
  const temeller = TEMELLER_KEYS.map(tk => {
    const o = fp[tk.id];
    const k = kokenOlc(o?.score, o?.signals_count || 0, TEMEL_MIN_SINYAL);
    return { id: tk.id, name: _temelName(tk.id), level: k.v };
  });
  const olculen = temeller.filter(x => x.level != null);
  const avg = olculen.length >= MERTEBE_MIN_OLCUM
    ? Math.round(olculen.reduce((s, x) => s + x.level, 0) / olculen.length)
    : null;
  const tierIdx = avg == null ? null : (avg >= 80 ? 3 : avg >= 65 ? 2 : avg >= 50 ? 1 : 0);

  elmasEl.innerHTML = `
    <div style="display:flex;justify-content:center;margin-bottom:6px;">
      <svg width="200" height="200" viewBox="0 0 200 200" style="overflow:visible;">
        ${_renderElmasSVG(temeller)}
      </svg>
    </div>
    ${tierIdx == null ? `
    <div style="padding:12px;border:1px solid var(--border);background:var(--surface);">
      <div class="ws-micro-gold">${t('w2.depth', 'Derinlik')}</div>
      <div style="margin-top:8px;font-family:var(--serif);font-style:italic;font-size:12px;color:var(--text-mid);line-height:1.5;">${escapeHTML(t('w2.muhrum.mertebe_yok', 'Mertebeni ben veremem — o, biriktirdiğin günlerden doğar.'))}</div>
    </div>` : `
    <div style="padding:10px 12px;border:1px solid var(--border);background:var(--surface);">
      <div class="ws-micro-gold">${t('w2.depth', 'Derinlik')} · ${_derinlikName(DERINLIKLER_IDS[tierIdx])}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
        ${DERINLIKLER_IDS.map((id, i) => {
          const passed = i <= tierIdx;
          const cur = i === tierIdx;
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;">
            <div style="width:${cur ? 14 : 10}px;height:${cur ? 14 : 10}px;transform:rotate(45deg);background:${passed ? 'var(--gold)' : 'transparent'};border:1.2px solid ${passed ? 'var(--gold)' : 'var(--text-dim)'};"></div>
            <div style="font-family:var(--cinzel);font-size:8px;letter-spacing:1.5px;color:${passed ? 'var(--text)' : 'var(--text-dim)'};">${_derinlikName(id)}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="margin-top:10px;font-family:var(--serif);font-style:italic;font-size:11px;color:var(--text-mid);line-height:1.4;">${_derinlikDesc(DERINLIKLER_IDS[tierIdx])}</div>
    </div>`}`;

  // 12 Mühür — Zihniyet Devrimi'ne Çağrı kitabının gerçek 12 maddesi
  if (manifestoEl) {
    // MANIFESTO_12 10v modülünden window üzerinden okunur (TDZ-güvenli)
    const ITEMS = (typeof window !== 'undefined' && window.MANIFESTO_12) ||
      [
        { roman:'I',    name:'Hakikat', title:'Mesele Sensin',                                sigil:'truth'   },
        { roman:'II',   name:'Hayal',   title:'Hayal Alemi Hayal Değildir',                   sigil:'niyet'   },
        { roman:'III',  name:'Uyum',    title:'Kalp ve Zihin Birlikte Olmalıdır',             sigil:'cross'   },
        { roman:'IV',   name:'Ayna',    title:'İnançlar Hayatın Belirleyicisidir',            sigil:'mirror'  },
        { roman:'V',    name:'Sarmal',  title:'Düşünceler Başlangıç Noktasıdır',              sigil:'spiral'  },
        { roman:'VI',   name:'Adak',    title:'Hayat Seçimlerden Oluşur',                     sigil:'oath'    },
        { roman:'VII',  name:'Gölge',   title:'Sorunların Kaynağı Olunan Kişidir',            sigil:'shadow'  },
        { roman:'VIII', name:'Hak',     title:'İstenen Hayatı O Hayatı Hak Eden Yaşar',      sigil:'rune'    },
        { roman:'IX',   name:'Cesaret', title:'Hayatının Sorumluluğu Sende',                  sigil:'courage' },
        { roman:'X',    name:'Elmas',   title:'Toplum İçin Kendini En İyi Biçimde Yetiştir', sigil:'elmas'   },
        { roman:'XI',   name:'Adalet',  title:'Hak, Hukuk ve Adalet Her Toplumun Temelidir', sigil:'silence' },
        { roman:'XII',  name:'İman',    title:'Allah İnsanlarladır, Sen Yalnız Değilsin',     sigil:'void'    },
      ];
    // Her tam okuma bir mühür açar (10v · mrTotalReadings + mrSealedDays)
    const totalRead = (typeof window !== 'undefined' && typeof window.mrTotalReadings === 'function')
      ? window.mrTotalReadings() : 0;
    const sealedDays = (typeof window !== 'undefined' && typeof window.mrSealedDays === 'function')
      ? window.mrSealedDays() : [];
    const sealedCount = Math.min(12, totalRead);
    const remaining = 12 - sealedCount;

    function _daysAgo(dateStr) {
      if (!dateStr) return '';
      const today = new Date();
      const d = new Date(dateStr + 'T00:00:00');
      const diff = Math.floor((today - d) / 86400000);
      if (diff === 0) return t('w2.seal.today', 'bugün');
      if (diff === 1) return t('w2.seal.yesterday', 'dün');
      return t('w2.seal.days_ago', '{n} gün önce').replace('{n}', diff);
    }

    // TR'de sayıya göre ek (-i/-sı…); diğer dillerde gerekmez
    function _numSuffix(n) {
      const s = [, "'i", "'si", "'ü", "'ü", "'i", "'sı", "'si", "'i", "'u", "'u", "'i", "'si"];
      return (S._currentLang === 'tr') ? (s[n] || "'i") : '';
    }

    const footerText = sealedCount === 0
      ? t('w2.seal.footer_none', 'Henüz hiçbir mühür dökülemedi. İlk okumayı yapmaya hazır mısın?')
      : sealedCount === 12
      ? t('w2.seal.footer_all', 'Tüm 12 mühür döküldü. Dönüşüm tamamlandı. ✦')
      : t('w2.seal.footer_some', '{n} mühür döküldü. {rem}{suf} hâlâ bekliyor.')
          .replace('{n}', sealedCount).replace('{rem}', remaining).replace('{suf}', _numSuffix(remaining));

    manifestoEl.innerHTML = `
      <div class="ws-seal-grid">
        ${ITEMS.map((m, i) => {
          const sealed = i < sealedCount;
          const isNext = i === sealedCount;
          const dateStr = (sealed && sealedDays[i]) ? _daysAgo(sealedDays[i]) : '';
          const cardClass = sealed
            ? 'ws-seal-card ws-seal-card--sealed'
            : isNext
              ? 'ws-seal-card ws-seal-card--locked ws-seal-card--next'
              : 'ws-seal-card ws-seal-card--locked ws-seal-card--dim';
          return `<div class="${cardClass}" onclick="window.mrOpenDetail && window.mrOpenDetail(${i})">
            <div class="ws-seal-roman">${escapeHTML(m.roman)}</div>
            ${wsSigil(m.sigil, 28, sealed, sealed ? 1.1 : 0.7)}
            <div class="ws-seal-name${sealed ? '' : ' ws-seal-name--dim'}">${escapeHTML(m.name)}</div>
            ${sealed && dateStr ? `<div class="ws-seal-date">${dateStr}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
      <div class="ws-seal-footer">${footerText}</div>
      <button onclick="window.mrOpenReader && window.mrOpenReader()" class="ws-seal-read-btn">
        ${t('w2.seal.read_btn', 'MANİFESTOYU OKU · MÜHÜR BAŞ →')}
      </button>`;
  }

  // Kitaplık sekmesi kaldırıldı — yazılar artık Sohbet drawer'ından
  // libOpenReader() ile 12 Mühür iç tasarımıyla açılır.
}

function _renderElmasSVG(temeller) {
  const cx = 100, cy = 100, rO = 80, rI = 8;
  const angles = Array.from({ length: 5 }, (_, i) => -Math.PI/2 + i * 2 * Math.PI / 5);
  const outer = angles.map(a => [cx + Math.cos(a) * rO, cy + Math.sin(a) * rO]);
  /* Ölçülmemiş temel merkezde durur ama "0 puan" DEĞİLDİR: bu yüzden dolu
     poligon yalnız yeterli ölçüm varken çizilir ve etiketi sayı değil "—"dir.
     Boş bir elmas, yanlış dolu bir elmastan dürüsttür. */
  const olculenN = temeller.filter(x => x.level != null).length;
  const level = angles.map((a, i) => {
    const lv = temeller[i].level;
    const r = rI + (rO - rI) * (lv == null ? 0 : lv) / 100;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  const poly = pts => pts.map(p => p.join(',')).join(' ');
  const rings = [0.33, 0.66, 1].map(t => outer.map(p => [cx + (p[0] - cx) * t, cy + (p[1] - cy) * t]));
  let svg = `<defs><radialGradient id="ws-glow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="var(--gold)" stop-opacity="0.22"/><stop offset="60%" stop-color="var(--gold)" stop-opacity="0.05"/><stop offset="100%" stop-color="var(--gold)" stop-opacity="0"/></radialGradient></defs>`;
  svg += `<circle cx="${cx}" cy="${cy}" r="${rO * 1.4}" fill="url(#ws-glow)"/>`;
  rings.forEach(ring => { svg += `<polygon points="${poly(ring)}" fill="none" stroke="var(--border)" stroke-width="0.6"/>`; });
  outer.forEach(p => { svg += `<line x1="${cx}" y1="${cy}" x2="${p[0]}" y2="${p[1]}" stroke="var(--border)" stroke-width="0.6"/>`; });
  if (olculenN >= 3) {
    svg += `<polygon points="${poly(level)}" fill="var(--gold)" fill-opacity="0.18" stroke="var(--gold)" stroke-width="1.3"/>`;
  }
  svg += `<polygon points="${poly(outer)}" fill="none" stroke="var(--text-mid)" stroke-width="1"/>`;
  if (olculenN >= 3) {
    level.forEach((p, i) => {
      if (temeller[i].level == null) return; // ölçülmemiş köşede nokta yok
      svg += `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="var(--bg)" stroke="var(--gold)" stroke-width="1.2"/>`;
    });
  }
  temeller.forEach((t, i) => {
    const a = angles[i], r = rO + 20;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    const anch = Math.abs(Math.cos(a)) < 0.2 ? 'middle' : (Math.cos(a) > 0 ? 'start' : 'end');
    svg += `<text x="${x}" y="${y - 2}" text-anchor="${anch}" style="font-family:Cinzel,serif;font-size:9px;letter-spacing:2px;fill:var(--gold);font-weight:600;">${t.name}</text>`;
    svg += `<text x="${x}" y="${y + 10}" text-anchor="${anch}" style="font-family:Cinzel,serif;font-size:10px;fill:var(--text-mid);">${t.level == null ? '—' : t.level}</text>`;
  });
  return svg;
}

/* ═══ KULLANICI SEVİYE SİSTEMİ ═══ */
// Gamification (level/sertifika/referral/proaktif checkin) 10b-w2-gamification.js'e taşındı.

/* ═══════════════════════════════════════════════════
   WANDERER V2 — YENİ ARAYÜZ KATMANI
   Drawer · Profil · Takvim · Gün Ayırıcı · Otomatik Özet
═══════════════════════════════════════════════════ */

/* ─── STÜDYO KONTROL ───
   Tam ekran Drawer (#ws-studio) emekli: Studio artık tek sayfa, odalar
   Bugün'ün STÜDYO bölgesinde yaşıyor. Fonksiyon adları KORUNUR — tüm çağrı
   noktaları (topbar'lar, Escape, i18n, boot, 10x derin-link) aynen çalışsın:
   aç = Bugün'e git; zaten Bugün'deysen STÜDYO ayracına süzül. */
export function w2OpenDrawer() {
  const onBugun = document.getElementById('bugun-view')?.classList.contains('active');
  if (!onBugun) { window.switchView?.('bugun'); }
  const divider = document.getElementById('ws-studio-divider');
  if (!divider) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // Bugün'e yeni geçildiyse cascade otursun diye küçük bir nefes bekle.
  setTimeout(() => {
    try { divider.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); } catch (_) {}
  }, onBugun ? 0 : 350);
  try { if (window.fxHaptic) window.fxHaptic('light'); else navigator.vibrate?.(8); } catch (_) {}
}

/* LLM kenar çubuğu üstündeki iki kimlik kartını senkronla:
   OLDUĞUN KİŞİ (Portre) + OLMAK İSTEDİĞİN KİŞİ.
   Hem loadBugunView hem chDrawerOpen (11) çağırır. */
export function w2SyncDrawerIdentityCards() {
  try { w2SyncDrawerPortreCard(); } catch (_) {}
  const daysEl  = document.getElementById('ws-drawer-days');
  const nameEl  = document.getElementById('ws-drawer-identity-name');
  const depthEl = document.getElementById('ws-drawer-depth');
  if (!daysEl && !nameEl && !depthEl) return;
  const streak = parseInt(document.getElementById('topbar-streak-count')?.textContent || '0');
  const pt = S._personTransition;
  const targetArch = getSuggestedArchetype();
  const toTitle = (str) => str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  const personName = targetArch
    ? `${toTitle(targetArch.name)} ${targetArch.sub}`
    : (pt?.desired?.description || pt?.current?.description || t('w2.intentful_wanderer', 'Niyetli Gezgin'));
  if (daysEl)  daysEl.textContent  = streak;
  if (nameEl)  nameEl.textContent  = personName;
  if (depthEl) depthEl.textContent = t('w2.drawer.see', '· GÖR ·');
}

/* Drawer üstündeki Portre kimlik kartını (OLDUĞUN KİŞİ) senkronla.
   "OLMAK İSTEDİĞİN KİŞİ" kimlik kartının ikizi — aynı tasarım. */
export function w2SyncDrawerPortreCard() {
  const nameEl = document.getElementById('ws-drawer-portre-name');
  const metaEl = document.getElementById('ws-drawer-portre-meta');
  if (!nameEl && !metaEl) return;
  const c = S._portre;
  const CATS = ['dusunceler', 'inanclar', 'duygular', 'davranislar'];
  const total = c ? CATS.reduce((n, k) => n + (Array.isArray(c[k]) ? c[k].length : 0), 0) : 0;
  if (c?.confirmed && (c.baslik || total)) {
    if (nameEl) nameEl.textContent = c.baslik || t('w2.portre_card', 'Portrem');
    if (metaEl) metaEl.textContent = t('w2.n_items', '· {n} MADDE ·').replace('{n}', total);
  } else {
    if (nameEl) nameEl.textContent = t('w2.portre_card', 'Portrem');
    if (metaEl) metaEl.textContent = total > 0 ? t('w2.complete', '· TAMAMLA ·') : t('w2.create', '· OLUŞTUR ·');
  }
}
export function w2CloseDrawer() {
  // Drawer emekli — güvenli no-op. Kapanış "garanti" çağrıları (Escape,
  // dil değişimi, post-auth) sözleşme gereği ayakta; dokunacak panel yok.
}
export function w2Nav(fn) {
  // Drawer kapanma beklemesi (180ms) kalktı — hedef doğrudan koşar.
  // 10x bildirim derin-linki view adını string verir — ikisini de kabul et.
  if (typeof fn === 'string') { const v = fn; fn = () => window.switchView?.(v); }
  try { fn(); } catch (e) { console.warn('w2Nav:', e); }
}

/* ─── PROFİL PANELİ ─── */
export function w2OpenProfile() {
  w2RefreshProfilePanel();
  document.getElementById('w2-profile-panel').classList.add('open');
  document.getElementById('w2-profile-backdrop').classList.add('open');
}
export function w2CloseProfile() {
  document.getElementById('w2-profile-panel').classList.remove('open');
  document.getElementById('w2-profile-backdrop').classList.remove('open');
}
export function w2RefreshProfilePanel() {
  try {
    // Avatar — topbar cameo'su HEP Emre'nin fotoğrafı; sohbet ekranı
    // "Emre The Wanderer ile konuşma" hissi verir. Kullanıcının kendi avatarı
    // profil panelinde kalır.
    const avImgTop = document.getElementById('w2-topbar-avatar-img');
    const avImgPanel = document.getElementById('w2-profile-avatar-img');
    if (avImgTop) avImgTop.src = EMRE_IMG;
    if (avImgPanel) avImgPanel.src = S.USER_IMG || 'data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2030%2042%22%3E%3Crect%20width%3D%2230%22%20height%3D%2242%22%20fill%3D%22%23181818%22%2F%3E%3Ccircle%20cx%3D%2215%22%20cy%3D%2215%22%20r%3D%226%22%20fill%3D%22%232E2A24%22%2F%3E%3Cpath%20d%3D%22M2%2042%20Q2%2027%2015%2027%20Q28%2027%2028%2042%20Z%22%20fill%3D%22%232E2A24%22%2F%3E%3Cellipse%20cx%3D%2215%22%20cy%3D%2210%22%20rx%3D%227%22%20ry%3D%221.2%22%20fill%3D%22none%22%20stroke%3D%22%238A6A2A%22%20stroke-width%3D%220.7%22%20opacity%3D%220.55%22%2F%3E%3C%2Fsvg%3E';

    // İsim & email
    const nameEl = document.getElementById('w2-profile-name');
    const emailEl = document.getElementById('w2-profile-email');
    if (nameEl) {
      const fullName = S.currentUser?.user_metadata?.full_name || (S.currentUser?.email?.split('@')[0] || '—');
      nameEl.textContent = fullName;
    }
    if (emailEl) emailEl.textContent = S.currentUser?.email || '';

    // İstatistikler
    const streakEl = document.getElementById('w2-profile-streak');
    const daysEl = document.getElementById('w2-profile-days');
    const levelEl = document.getElementById('w2-profile-level');
    if (streakEl) {
      const streakVal = document.getElementById('chat-streak')?.textContent || '0';
      streakEl.textContent = streakVal;
    }
    if (daysEl) {
      daysEl.textContent = Object.keys(S.allSessions || {}).length;
    }
    if (levelEl) {
      try { levelEl.textContent = getUserLevel().level; } catch (_) { levelEl.textContent = '1'; }
    }
  } catch (e) { console.warn('w2RefreshProfilePanel:', e); }
}

/* ─── GÜN BAŞLANGICI SELAM KARTI ─── */

/* Kartın metni sessionStorage'da tutulur (gün içinde sabit kalsın diye), ama
   MODELİN de onu görmesi gerekir: kart uygulamanın ağzından konuşur ("Geçen
   sefer sınavdan söz etmiştin — nasıl geçti?") ve kullanıcı ona cevap verir.
   Model ne söylediğini bilmezse cevabı bağlamsız karşılar — uygulamanın iki
   ağzı olur. Bu köprü o boşluğu kapatır (01 getGreetingContext tüketir).
   Yalnız günün ilk turlarında: sonrası selamı gereksiz yere diri tutardı. */
const GREET_CTX_TUR_TAVAN = 3;

export function w2GetGreetingCardContext() {
  try {
    /* Kriz anında SUSAR — havuz (09j) ve mühürlü sözlerle aynı töre: o an tek
       geçerli bağlam şimdiki andır. Kapısız hâlde model, en yüksek öncelikli
       bloğunda kriz talimatının yanında "sınavın nasıl geçti?" gibi hafif bir
       hatırlatma görüyordu — register ihlali. */
    if ((window.getCrisisContext?.() || '').trim()) return '';

    /* Kart BUGÜNÜN kartıdır; openSummarySession geçmiş bir günü açtığında
       hem currentSessId hem chatHistory o güne döner (FAZ 1'de aynı sınıf
       kırık çıkmıştı) — o görünümde selam bağlamı ilgisiz bir güne aittir. */
    if (S.currentSessId !== 'day_' + localISODate()) return '';

    const metin = sessionStorage.getItem('w2_greeting_text_' + nowTR().toDateString());
    if (!metin) return '';
    const turSayisi = (S.chatHistory || []).filter(m => m.role === 'user').length;
    if (turSayisi > GREET_CTX_TUR_TAVAN) return '';
    return p('prompt.greeting_card', { metin });
  } catch (_) { return ''; }
}

export function w2GetTodayGreetingText() {
  const todayStr = nowTR().toDateString();
  const cacheKey = 'w2_greeting_text_' + todayStr;
  const cached   = sessionStorage.getItem(cacheKey);
  if (cached) return cached;

  // Katman 6 — Yaşam Hafızası: en spesifik proaktif şefkat (açık döngü > önemli gün > uzun sessizlik)
  const checkin = p6GetProactiveCheckin();
  if (checkin) {
    sessionStorage.setItem(cacheKey, checkin);
    return checkin;
  }

  // Kişiselleştirme motoru — proaktif tahmin tabanlı karşılama
  const proactive = p3GetProactiveGreeting();
  if (proactive) {
    sessionStorage.setItem(cacheKey, proactive);
    return proactive;
  }

  // Yaşayan Portre (09e) — dönüşüm yayına hafif bir gönderme (window köprüsü,
  // TDZ-güvenli; portre henüz konsolide olmadıysa boş döner)
  try {
    const seed = window.ypGetGreetingSeed?.();
    if (seed) {
      sessionStorage.setItem(cacheKey, seed);
      return seed;
    }
  } catch (_) {}

  const userName = S.currentUser?.user_metadata?.full_name?.split(' ')[0] || '';
  const greetings = [
    t('w2.greet_card.0', 'Bugün nasıl başlıyoruz?'),
    userName ? t('w2.greet_card.named', '{name}, bugün ne var?').replace('{name}', userName) : t('w2.greet_card.noname', 'Bugün ne var?'),
    t('w2.greet_card.2', 'Bugün hangi gerçeğin üstüne gidiyoruz?'),
    t('w2.greet_card.3', 'Nereden başlıyoruz?'),
    t('w2.greet_card.4', 'Bugün kendine ne söylemen lazım?')
  ];
  const text = greetings[Math.floor(Math.random() * greetings.length)];
  sessionStorage.setItem(cacheKey, text);
  return text;
}

export function w2RenderGreetingCard() {
  const div = document.createElement('div');
  div.className = 'message emre';
  div.id = 'w2-greeting-card';
  const safeSender = escapeHTML(S.settings?.persona_name || 'EMRE THE WANDERER');
  div.innerHTML = `<div class="msg-row"><span class="msg-line" aria-hidden="true"></span><div class="msg-body"><div class="msg-header"><div class="msg-sender">${safeSender}</div></div><div class="msg-content">${escapeHTML(w2GetTodayGreetingText())}</div></div></div>`;
  return div;
}

export function w2DismissGreeting() {
  // Artık kullanılmıyor — greeting kalıcı Emre mesajı olarak kalır
}

export function w2RenderChatContextCards() {
  // Kartlar artık sohbet başında gösterilmiyor.
  // Konuşma ilerledikçe bağlama uygun olarak enjekte edilir:
  //   → w2InjectContextualMuhurCard()  — "Mühür Dökülüyor"
  //   → w2InjectContextualLessonCard() — "Kitap Alıntısı"
  return null;
}

function _renderLessonCard(el) {
  const items = S.knowledgeItems || [];

  if (!items.length) {
    el.innerHTML = `
      <div class="ws-ctx-lesson-label">${t('w2.lesson.label', 'KİTAPLIK')}</div>
      <div class="ws-ctx-lesson-text" style="font-style:italic;color:var(--text-dim);">${t('wg.admin.loading', 'Yükleniyor…')}</div>`;
    el.onclick = () => window.libOpenReader && window.libOpenReader();
    loadKnowledge().then(() => {
      const target = document.getElementById('ws-ctx-lesson');
      if (target && S.knowledgeItems.length) _renderLessonCard(target);
    }).catch(() => {});
    return;
  }

  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const item = items[dayOfYear % items.length];
  const title = item?.title || '';
  const conjIdx = title.indexOf(' çünkü ');
  let cause = title, effect = '';
  if (conjIdx !== -1) {
    cause = title.slice(0, conjIdx).trim();
    effect = title.slice(conjIdx + 7).trim();
  }

  const n = (dayOfYear % 152) + 1;
  el.innerHTML = `
    <div class="ws-ctx-lesson-label">${t('w2.lesson.num', "№ {n} · 152'den").replace('{n}', n)}</div>
    <div class="ws-ctx-lesson-text">
      ${escapeHTML(cause)}<span class="ws-ctx-lesson-conj"> çünkü </span><em>${escapeHTML(effect)}.</em>
    </div>`;
  el.onclick = () => {
    const items = S.knowledgeItems || [];
    const sorted = items.slice().sort((a, b) =>
      String(b.created_at || '').localeCompare(String(a.created_at || ''))
    );
    const idx = item ? sorted.findIndex(k => k.id === item.id) : 0;
    window.libOpenReader && window.libOpenReader(idx >= 0 ? idx : 0);
  };
}

/* ═══════════════════════════════════════════════════════════════════
   BAĞLAMSAL KART ENJEKSİYONU
   Sohbet başında değil, konuşma ilerledikçe duruma uygun gösterilir.
═══════════════════════════════════════════════════════════════════ */

const _ARCHETYPE_THEME_MAP = {
  sabir:   ['sabirli'],   erteleme: ['niyetli'],   niyet:    ['niyetli'],
  sukur:   ['sukreden'],  kizginlik: ['sabirli'],  yansima:  ['yansiyan'],
  deger:   ['hak-eden','layik'],  sinir:    ['sinir'],     cesaret:  ['cesur'],
  durust:  ['durust'],    bolluk:   ['bolluk'],    soz:      ['sozunu-tutan'],
  onay:    ['sinir','hak-eden'],  kacis:    ['cesur','durust'],
  ozguven: ['cesur','hak-eden'],  ozsaygi:  ['sinir','yansiyan'],
  ozsevgi: ['layik','sessiz'],    ozdeger:  ['hak-eden','layik'],
  korku:   ['cesur'],     utanc:    ['durust','yansiyan'],  sucluluk: ['durust'],
  yalnizlik: ['sessiz','sukreden'],
};

const _THEME_DETECT_PATTERNS = {
  sabir:    [/sabır/i, /sabret/i, /bekleme/i, /acele/i, /patience/i, /wait/i],
  erteleme: [/ertel/i, /yapamıyor/i, /başlayamıyor/i, /procrastinat/i],
  niyet:    [/niyet/i, /amaç/i, /hedef/i, /neden yapıyorum/i, /intention/i, /purpose/i],
  sukur:    [/şükür/i, /şükredi/i, /minnet/i, /grateful/i, /thankful/i],
  yansima:  [/yansıma/i, /fark ettim/i, /kendime baktım/i, /ayna/i, /reflect/i],
  deger:    [/hak ed/i, /değer/i, /layık/i, /deserve/i, /worth/i],
  sinir:    [/sınır/i, /hayır diye/i, /hayır dem/i, /boundar/i],
  cesaret:  [/cesaret/i, /korkuyorum ama/i, /korku/i, /courage/i, /brave/i, /afraid but/i],
  durust:   [/dürüst/i, /itiraf/i, /söyleyemedim/i, /yalan/i, /honest/i, /confess/i],
  bolluk:   [/bolluk/i, /kıtlık/i, /para/i, /abundan/i, /scarcity/i],
  soz:      [/söz ver/i, /söz tut/i, /sözüm/i, /tutamadım/i, /promise/i, /commit/i],
  onay:     [/onay/i, /beğen/i, /kabul görmek/i, /approval/i],
  kacis:    [/kaçıyorum/i, /kaçış/i, /yüzleşemiyorum/i, /avoid/i, /escape/i],
  ozguven:  [/özgüven/i, /kendime güven/i, /yapamam/i, /self.?confiden/i],
  ozsaygi:  [/öz saygı/i, /kendime saygı/i, /self.?respect/i],
  ozsevgi:  [/öz sevgi/i, /kendimi sev/i, /self.?love/i],
  ozdeger:  [/öz değer/i, /kendimi değer/i, /self.?worth/i],
  korku:    [/korkuyorum/i, /korktum/i, /korkuyor/i, /afraid/i, /scared/i, /fear/i],
  utanc:    [/utanıyorum/i, /utanç/i, /rezil/i, /ashamed/i, /shame/i],
  sucluluk: [/suçlu/i, /pişman/i, /guilty/i, /regret/i],
  yalnizlik:[/yalnız/i, /tek başıma/i, /kimsem yok/i, /lonely/i, /alone/i],
};

let _muhurCardShownThisSession = false;
let _lessonCardShownIds = new Set();

function _detectConversationThemes(text) {
  const found = [];
  for (const [theme, patterns] of Object.entries(_THEME_DETECT_PATTERNS)) {
    if (reTest(patterns, text)) found.push(theme);
  }
  return found;
}

function _findBestArchetypeForThemes(themes) {
  const scores = {};
  for (const theme of themes) {
    const archIds = _ARCHETYPE_THEME_MAP[theme] || [];
    for (const id of archIds) scores[id] = (scores[id] || 0) + 1;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : null;
}

function _buildDynamicArchetypeCard(archId) {
  const ARCH_DATA = _getArchDataById(archId);
  if (!ARCH_DATA) return null;
  return {
    id: ARCH_DATA.id,
    name: ARCH_DATA.name,
    sub: ARCH_DATA.sub,
    whisper: ARCH_DATA.whisper,
    lesson: ARCH_DATA.lesson,
    dusunceler: ARCH_DATA.dusunceler,
    inanclar: ARCH_DATA.inanclar,
    hisler: ARCH_DATA.hisler,
    davranislar: ARCH_DATA.davranislar,
  };
}

function _getArchDataById(id) {
  return getArchetypeById(id);
}

export function w2InjectContextualMuhurCard(userText, aiReply) {
  if (_muhurCardShownThisSession) return;
  if ((S._sessionUserMsgs?.length || 0) < 2) return;

  const combined = (userText + ' ' + aiReply).toLowerCase();
  const themes = _detectConversationThemes(combined);
  if (!themes.length) return;

  const bestArchId = _findBestArchetypeForThemes(themes);
  if (!bestArchId) return;

  const currentId = S._currentArchetypeId || 'niyetli';
  if (bestArchId === currentId) return;

  const archData = _buildDynamicArchetypeCard(bestArchId) || getSuggestedArchetype();
  if (!archData) return;

  _muhurCardShownThisSession = true;

  const area = document.getElementById('messages-area');
  if (!area) return;

  const card = document.createElement('div');
  card.className = 'ws-ctx-muhur ws-ctx-card-enter';
  card.id = 'ws-ctx-muhur-dynamic';
  card.innerHTML = `
    <div class="ws-ctx-muhur-icon">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="9" y="9" width="14" height="14" transform="rotate(45 16 16)"
          stroke="var(--gold)" stroke-width="1" opacity="0.8"/>
      </svg>
      <div class="ws-ctx-muhur-dot"></div>
    </div>
    <div class="ws-ctx-muhur-body">
      <div class="ws-ctx-muhur-label">${t('w2.ctx.muhur_label', 'Mühür Dökülüyor')}</div>
      <div class="ws-ctx-muhur-text">"${escapeHTML(archData.name)}" — ${escapeHTML(archData.whisper || archData.sub || '')}</div>
    </div>
    <div class="ws-ctx-muhur-arrow">›</div>`;
  card.onclick = () => EventBus.emit('navigate', { view: 'arketipler' });
  area.appendChild(card);
  area.scrollTop = area.scrollHeight;
  requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove('ws-ctx-card-enter')));
}

export function w2InjectContextualLessonCard(userText, aiReply) {
  const items = S.knowledgeItems || [];
  if (!items.length) return;
  if ((S._sessionUserMsgs?.length || 0) < 1) return;

  // Kullanıcı henüz gerçek bir konu açmadıysa (sadece selam/çok kısa mesaj) alıntı kartı çıkarma.
  // Aksi halde kart, AI'ın uzun yanıtındaki kelimelerle eşleşip alakasız görünür.
  if (isGreetingOnly(userText) || (userText || '').trim().length < 12) return;

  // Eşleşme kullanıcının kendi metnine dayanmalı; AI yanıtı yalnızca destekleyici sinyal.
  const userWords = userText.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (!userWords.length) return;
  const combined = (userText + ' ' + aiReply).toLowerCase();
  const words = combined.split(/\s+/).filter(w => w.length > 3);

  let bestItem = null;
  let bestScore = 0;
  let bestUserHit = false;

  for (const item of items) {
    if (_lessonCardShownIds.has(item.id)) continue;
    const title = (item.title || '').toLowerCase();
    const content = (item.content || '').toLowerCase();
    let score = 0;
    let userHit = false;
    for (const w of words) {
      if (title.includes(w)) score += 3;
      if (content.includes(w)) score += 1;
    }
    // En az bir kullanıcı kelimesi eşleşmeli — yoksa kart tamamen AI yanıtından doğmuş demektir.
    for (const w of userWords) {
      if (title.includes(w) || content.includes(w)) { userHit = true; break; }
    }
    if (score > bestScore) { bestScore = score; bestItem = item; bestUserHit = userHit; }
  }

  if (!bestItem || bestScore < 6 || !bestUserHit) return;
  _lessonCardShownIds.add(bestItem.id);

  const area = document.getElementById('messages-area');
  if (!area) return;

  const title = bestItem.title || '';
  const conjIdx = title.indexOf(' çünkü ');
  let cause = title, effect = '';
  if (conjIdx !== -1) {
    cause = title.slice(0, conjIdx).trim();
    effect = title.slice(conjIdx + 7).trim();
  }

  const card = document.createElement('div');
  card.className = 'ws-ctx-lesson ws-ctx-card-enter';
  card.id = 'ws-ctx-lesson-dynamic';

  const effectHTML = effect
    ? `${escapeHTML(cause)}<span class="ws-ctx-lesson-conj"> çünkü </span><em>${escapeHTML(effect)}.</em>`
    : escapeHTML(cause);

  card.innerHTML = `
    <div class="ws-ctx-lesson-label">${t('w2.ctx.lesson_label', 'KİTAP ALINTISI')}</div>
    <div class="ws-ctx-lesson-text">${effectHTML}</div>`;

  card.onclick = () => {
    const sorted = items.slice().sort((a, b) =>
      String(b.created_at || '').localeCompare(String(a.created_at || ''))
    );
    const idx = sorted.findIndex(k => k.id === bestItem.id);
    window.libOpenReader && window.libOpenReader(idx >= 0 ? idx : 0);
  };

  area.appendChild(card);
  area.scrollTop = area.scrollHeight;
  requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove('ws-ctx-card-enter')));
}

export function w2ResetContextualCards() {
  _muhurCardShownThisSession = false;
  _lessonCardShownIds.clear();
}

/* İç Ses sayfası — somatik (beden) + içsel parça (içsel çocuk) verileri.
   Eski "İçsel Durum" panosunun verileri buraya taşındı. */
window.wsIcSesAc = function() {
  const page = document.getElementById('icses-page');
  if (!page) return;
  page.style.display = 'flex';
  // Verileri yükle — DB'den ruh hâli, somatik ve parça kayıtları
  try { loadMoodHistory(); } catch (_) {}
  try { loadSomaticHistory(); } catch (_) {}
  try { loadPartsHistory(); } catch (_) {}
  // Boş-durum metinleri (kısa gecikme — DB sorguları dolarken)
  setTimeout(() => {
    const somaticList = document.getElementById('somaticList');
    const partsLegend = document.getElementById('partsLegend');
    const moodEmpty   = document.getElementById('icses-mood-empty');
    const partsEmpty  = document.getElementById('icses-parts-empty');
    if (partsEmpty) partsEmpty.style.display = (partsLegend && partsLegend.children.length) ? 'none' : '';
    if (moodEmpty)  moodEmpty.style.display  = (S.moodChartObj) ? 'none' : '';
  }, 600);
};
window.wsIcSesKapat = function() {
  const page = document.getElementById('icses-page');
  if (page) page.style.display = 'none';
};

/* ─── SONSUZ SCROLL + GÜN AYIRICILARI ─── */
// Bugünün user mesajı olan günleri toplar, özetlenmiş günleri ayırıcıya dönüştürür

/* 01 bu köprüyü window üzerinden okur (import etseydi 10 ↔ 01 arasında
   döngü kurulurdu; 09d/09e'nin kalıbı da budur: "kimse bu modülü import
   etmez, giriş window.*"). */
if (typeof window !== 'undefined') {
  window.w2GetGreetingCardContext = w2GetGreetingCardContext;
}
