/* ═══════════════════════════════════════════════════════════════════
   13j — WANDERER WRAPPED · Ayın Filmi (ay sonu kişisel sinematik)
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Ay biter; ama yaşanan değişim görünmezse yokmuş gibi hissedilir.
     Ayın Filmi, kullanıcının kendi verisinden kesilmiş story-tarzı bir
     kapanış sinematiğidir: geldiği günler, dövdüğü zincir, verdiği
     sözler, kazandığı kartlar, meclisin hâli — ve "Mesele Sensin"
     kapanışı. Paylaşılabilir (13g): kullanıcı KENDİ dönüşümünü gösterir.

   VERİ (tamamı client-side, LLM yok):
     • etw_activity_ledger (00a getActivityDays — DİKKAT localDayKey
       AY 0-TABANLI 'YYYY-M-D'; padded DEĞİL, ayrı parse edilir)
     • S._seriMuhru.cards ('YYYY-MM-DD' padded) · S._sozMuhru/_hayalMuhru
       .days + S._ultraMeta.ultraDays (10u, padded) · S._kisiKarti
       .collection[].earnedAt (ISO) · S._suretler + computeButunluk (10p)

   TETİK: ayın ilk 7 gününde, geçen ay ≥3 aktif günse Bugün'e davet
     şeridi (#wr-invite). Manuel: drawer "AYIN FİLMİ" → wrOpen().
   Kalıcılık: etw_wrapped_v1_<uid> { seen: { 'YYYY-MM': true } }.
   Konvansiyon: hardcoded TR; window.wr* expose; stiller wrapped.css.
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage, getActivityDays, escapeHTML } from './00a-infrastructure.js';
import { computeButunluk } from './10p-w2-meclis.js';
import { t } from './15-i18n.js';

const STORAGE_KEY = 'etw_wrapped_v1';
const SCENE_MS = 5200;

// Kilometre taşı adı 10t'den (sm.card.*.name) paylaşılır; yoksa "N gün" fallback
function _smName(day) {
  const k = `sm.card.${day}.name`;
  const v = t(k);
  return (v === k) ? t('wr.days_n', `${day} gün`).replace('{n}', day) : v;
}

// Dil-güvenli yüzde: TR '%50' / EN '50%'
const _pct = (n) => (S._currentLang === 'tr') ? `%${n}` : `${n}%`;

/* Tek kaynak: escapeHTML (00a). Eskiden bu modülün kendi ikizi vardı;
   ikizler birbirinden de farklıydı (bir kısmı tek tırnağı kaçırmıyordu). */
const esc = escapeHTML;

function _userName() {
  const u = S.currentUser;
  return (u && (u.name || (u.user_metadata && u.user_metadata.name))) || t('wr.gezgin', 'Gezgin');
}

/* ── Ay anahtarları ── */
function _ym(d) {
  const x = d || new Date();
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
}
/** Bir önceki ayın anahtarı ('2026-08' → '2026-07'). Ay 1-tabanlı okunur,
 *  UTC'de kurulur — yerel ayın son gününde saat farkı ayı kaydırmasın. */
function _oncekiYm(ym) {
  const y = parseInt(ym.slice(0, 4), 10), m = parseInt(ym.slice(5, 7), 10);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
/* Bugünün bir önceki ayı — _oncekiYm'in özel hâli, ikinci bir tarih
   aritmetiği yazılmadı. */
function _prevYm() { return _oncekiYm(_ym()); }
function _ymLabel(ym) {
  const year = parseInt(ym.slice(0, 4), 10);
  const m = parseInt(ym.slice(5, 7), 10);
  try {
    return new Intl.DateTimeFormat(S._currentLang || 'tr', { month: 'long', year: 'numeric' })
      .format(new Date(year, m - 1, 1));
  } catch (_) { return `${m}/${year}`; }
}

/* ── Persistans ── */
function _default() { return { seen: {} }; }
function _key() { return `${STORAGE_KEY}_${(S.currentUser && S.currentUser.id) || 'anon'}`; }
function _load() {
  if (S._wrapped) return S._wrapped;
  let d = null;
  try { d = SafeStorage.get(_key()); } catch (_) {}
  S._wrapped = Object.assign(_default(), (d && typeof d === 'object') ? d : {});
  return S._wrapped;
}
function _save() { try { SafeStorage.set(_key(), S._wrapped); } catch (_) {} }

/* ════════════════════════════════════════════════════════════════════
   AY İSTATİSTİKLERİ
════════════════════════════════════════════════════════════════════ */
function _uid() { return (S.currentUser && S.currentUser.id) || 'anon'; }

function _ledger(stateKey, storageBase) {
  // 10u state'i yüklüyse oradan; değilse SafeStorage'dan doğrudan
  try { if (S[stateKey] && Array.isArray(S[stateKey].days)) return S[stateKey]; } catch (_) {}
  try {
    const d = SafeStorage.get(`${storageBase}_${_uid()}`);
    if (d && Array.isArray(d.days)) return d;
  } catch (_) {}
  return { days: [] };
}

export function wrBuildStats(ym) {
  const year = parseInt(ym.slice(0, 4), 10);
  const month = parseInt(ym.slice(5, 7), 10); // 1-tabanlı
  const pad = `${ym}-`;

  // Aktif günler — localDayKey 'YYYY-M-D' (AY 0-TABANLI!)
  const dayNums = new Set();
  try {
    for (const k of getActivityDays()) {
      const p = String(k).split('-');
      if (p.length === 3 && parseInt(p[0], 10) === year && parseInt(p[1], 10) === month - 1) {
        dayNums.add(parseInt(p[2], 10));
      }
    }
  } catch (_) {}

  // Ay içi en uzun ardışık zincir
  const sorted = [...dayNums].sort((a, b) => a - b);
  let best = 0, run = 0, prev = null;
  for (const d of sorted) {
    run = (prev != null && d === prev + 1) ? run + 1 : 1;
    if (run > best) best = run;
    prev = d;
  }

  // Kilometre taşları (10t, padded 'YYYY-MM-DD')
  const smCards = [];
  try {
    const cards = (S._seriMuhru && S._seriMuhru.cards) || {};
    for (const [day, rec] of Object.entries(cards)) {
      if (rec && String(rec.at || '').startsWith(pad)) {
        smCards.push({ d: parseInt(day, 10), name: _smName(day) });
      }
    }
  } catch (_) {}

  // Söz / Hayal / Ultra günleri (10u, padded)
  const sozDays = _ledger('_sozMuhru', 'etw_soz_muhru_v1').days.filter(d => String(d).startsWith(pad)).length;
  const hayalDays = _ledger('_hayalMuhru', 'etw_hayal_muhru_v1').days.filter(d => String(d).startsWith(pad)).length;
  let ultraDays = 0;
  try { ultraDays = ((S._ultraMeta && S._ultraMeta.ultraDays) || []).filter(d => String(d).startsWith(pad)).length; } catch (_) {}

  // Kişi kartları (10q, earnedAt ISO — UTC; ay istatistiği için yeterli)
  const kisiCards = [];
  try {
    const col = (S._kisiKarti && S._kisiKarti.collection) || {};
    for (const [id, rec] of Object.entries(col)) {
      if (rec && String(rec.earnedAt || '').startsWith(pad)) kisiCards.push(id);
    }
  } catch (_) {}

  // Meclis (anlık fotoğraf)
  let butunluk = 0, muttefik = 0, taninan = 0;
  try {
    const list = S._suretler || [];
    butunluk = computeButunluk(list);
    muttefik = list.filter(s => s.hal === 'butunlesti').length;
    taninan = list.filter(s => s.hal === 'adlandi' || s.hal === 'butunlesti').length;
  } catch (_) {}

  // Akşam niyetleri (13h)
  let niyetler = 0;
  try { niyetler = Object.keys((S._aksamToreni && S._aksamToreni.intentions) || {}).filter(k => k.startsWith(pad)).length; } catch (_) {}

  return {
    ym, label: _ymLabel(ym),
    activeDays: dayNums.size, bestRun: best,
    // NOT: kıyas burada DEĞİL, wrOpen'da iliklenir — wrBuildStats kendini
    // önceki ay için yeniden çağırırdı ve sonsuz özyineleme doğardı.
    kiyas: null,
    smCards, sozDays, hayalDays, ultraDays,
    kisiCards: kisiCards.length, butunluk, muttefik, taninan, niyetler,
  };
}

/** GEÇEN AYLA KIYAS — ay içi sayım bir durumdur, kıyas bir yöndür.
 *
 *  Aynı `wrBuildStats` önceki ay için de koşar: ikinci bir hesap türetilmez
 *  (tek kaynak). Kanıt kapısı: geçen ayda hiç aktif gün yoksa kıyas
 *  YAPILMAZ — ilk ayında "geçen aya göre beş fazla" demek yalandır.
 *  @returns {{gun:{once,simdi,fark}, kisi:{once,simdi}}|null} */
export function wrOncekiAyKiyas(ym) {
  try {
    const onceki = wrBuildStats(_oncekiYm(ym));
    if (!onceki || onceki.activeDays < 1) return null;
    const simdi = wrBuildStats(ym);
    return {
      gun: { once: onceki.activeDays, simdi: simdi.activeDays, fark: simdi.activeDays - onceki.activeDays },
      kisi: { once: onceki.kisiCards, simdi: simdi.kisiCards },
    };
  } catch (_) { return null; }
}

/* ════════════════════════════════════════════════════════════════════
   SAHNELER
════════════════════════════════════════════════════════════════════ */
function _buildScenes(st) {
  const name = _userName();
  const scenes = [];

  scenes.push({
    kicker: `${t('wr.kicker', 'AYIN FİLMİ')} · ${st.label.toLocaleUpperCase(S._currentLang || 'tr')}`,
    glyph: '✦', title: `${name},`,
    lines: [t('wr.intro.0'), t('wr.intro.1')],
  });

  const gunSatirlari = st.bestRun > 1
    ? [t('wr.days.run').replace('{n}', st.bestRun), t('wr.days.run2')]
    : [t('wr.days.none')];
  // Kıyas satırı yalnız geçen ay da KANITLIYSA eklenir (wrOncekiAyKiyas
  // kapısı); yön yoksa sayı bir durumdur, ilerleme değil.
  // İki anahtar (cmp_up/cmp_down) BİLEREK aynı nötr cümleyi taşır (K6):
  // yönü kod bilir, cümle yorum yapmaz — "düştün" demez, iki sayıyı yan yana
  // koyar. Ayrı anahtarlar ton ayrımı istenirse diye durur, kopya değildir.
  const kiyas = st.kiyas;
  if (kiyas && kiyas.gun.fark !== 0) {
    gunSatirlari.push(
      (kiyas.gun.fark > 0
        ? t('wr.days.cmp_up', 'Geçen ay {o} gündü — bu ay {s}.')
        : t('wr.days.cmp_down', 'Geçen ay {o} gündü — bu ay {s}.'))
        .replace('{o}', kiyas.gun.once).replace('{s}', kiyas.gun.simdi));
  }
  scenes.push({
    kicker: t('wr.days.kicker', 'GÜNLER'), glyph: '◈',
    big: st.activeDays, label: t('wr.days.label', 'GÜN GELDİN'),
    lines: gunSatirlari,
  });

  if (st.sozDays > 0) {
    scenes.push({
      kicker: t('wr.soz.kicker', 'SÖZLER'), glyph: '◆',
      big: st.sozDays, label: t('wr.soz.label', 'GÜN SÖZ VERDİN'),
      lines: [t('wr.soz.line')],
    });
  }

  if (st.hayalDays > 0) {
    scenes.push({
      kicker: t('wr.hayal.kicker', 'HAYAL'), glyph: '◉', accent: 'lapis',
      big: st.hayalDays, label: t('wr.hayal.label', 'GÜN HAYALİNLE ÇALIŞTIN'),
      lines: [t('wr.hayal.line')],
    });
  }

  if (st.ultraDays > 0) {
    scenes.push({
      kicker: t('wr.ultra.kicker', 'ULTRA SERİ'), glyph: '✶',
      big: st.ultraDays, label: t('wr.ultra.label', 'GÜN ÜÇ MÜHÜR BİRDEN'),
      lines: [t('wr.ultra.line')],
    });
  }

  if (st.smCards.length || st.kisiCards > 0) {
    const lines = [];
    if (st.smCards.length) lines.push(t('wr.kart.milestone').replace('{list}', st.smCards.map(c => c.name).join(', ')));
    if (st.kisiCards > 0) lines.push(t('wr.kart.kisi').replace('{n}', st.kisiCards));
    scenes.push({
      kicker: t('wr.kart.kicker', 'KARTLAR'), glyph: '⟡',
      big: st.smCards.length + st.kisiCards, label: t('wr.kart.label', 'KART KAZANDIN'),
      lines,
    });
  }

  if (st.taninan > 0) {
    scenes.push({
      kicker: t('wr.meclis.kicker', 'İÇ MECLİS'), glyph: '☉',
      big: _pct(st.butunluk), label: t('wr.meclis.label', 'BÜTÜNLÜK'),
      lines: [t('wr.meclis.faces').replace('{a}', st.muttefik).replace('{b}', st.taninan), t('wr.meclis.line2')],
    });
  }

  /* ZİRVE SAHNESİ (13z FAZ 5) — filmin tek "konuşan" sahnesi: sayı değil,
     kullanıcının kendi cümlesi. Kapanıştan hemen ÖNCE durur, çünkü "Mesele
     Sensin" finalinin dayanağı odur.
     Kapı: kanıtlı kayıt VE kaydın günü bu filmin ayına ait olmalı — başka
     bir ayın cümlesini bu filme koymak hatırayı inşa etmez, çarpıtır.
     Şu an tek zirve saklanıyor (son seans), o yüzden sahne en çok BİR
     cümle gösterir; kayıt yoksa sahne hiç eklenmez. */
  try {
    const z = window.igGetZirve?.();
    if (z && z.kaynak !== 'yok' && z.kanit && String(z.v?.gun || '').slice(0, 7) === st.ym) {
      scenes.push({
        kicker: t('wr.zirve.kicker', 'KENDİ SÖZÜN'), glyph: '✧',
        title: t('wr.zirve.title', 'Bu ay şunu söyledin:'),
        lines: [`“${z.kanit}”`],
      });
    }
  } catch (_) {}

  const suffixed = (S._currentLang === 'tr') ? `${st.label}'${_ekiAy(st.label)}` : st.label;
  scenes.push({
    kicker: t('wr.close.kicker', 'KAPANIŞ'), glyph: '✦', final: true,
    title: t('wr.close.title', 'Mesele Sensin.'),
    lines: [t('wr.close.line').replace('{label}', suffixed)],
  });

  return scenes;
}

// "Haziran 2026'yı" tarzı ek — kaba ama yeterli ünlü uyumu (yalnız TR)
function _ekiAy(label) {
  // DIL-MUAF: ünlü uyumu yalnız Türkçede işler; harfin kuralı da TR'dir.
  const last = label.replace(/[^a-zçğıöşü]/gi, '').slice(-2).toLocaleLowerCase('tr-TR');
  return /[ıi]/.test(last) ? 'ı' : /[uü]/.test(last) ? 'u' : /[oö]/.test(last) ? 'u' : 'i';
}

/* ════════════════════════════════════════════════════════════════════
   FİLM — story-tarzı portal
════════════════════════════════════════════════════════════════════ */
let _wrTimer = null;
let _wrIdx = 0;
let _wrScenes = [];
let _wrStats = null;

export function wrOpen(ym) {
  const target = ym || (() => {
    const prev = wrBuildStats(_prevYm());
    return prev.activeDays > 0 ? prev.ym : _ym();
  })();
  _wrStats = wrBuildStats(target);
  _wrStats.kiyas = wrOncekiAyKiyas(target);   // kanıtsızsa null → satır yok
  _wrScenes = _buildScenes(_wrStats);
  _wrIdx = 0;

  const st = _load();
  st.seen[target] = true;
  _save();
  document.getElementById('wr-invite')?.remove();

  let portal = document.getElementById('wr-portal');
  if (!portal) { portal = document.createElement('div'); portal.id = 'wr-portal'; document.body.appendChild(portal); }
  portal.className = 'wr-portal';
  window.wtOverlayOpen?.('ayin-filmi');   // Kullanım Nabzı (00f)
  try { window.fxCue?.('whoosh'); } catch (_) {}
  _renderScene();
}

function _close() {
  window.wtOverlayClose?.('ayin-filmi');
  clearTimeout(_wrTimer); _wrTimer = null;
  document.getElementById('wr-portal')?.remove();
  try { window.glSyncElmasBar?.(window.glActiveViewName ? window.glActiveViewName() : ''); } catch (_) {}
}

function _renderScene() {
  const portal = document.getElementById('wr-portal');
  if (!portal) return;
  clearTimeout(_wrTimer); _wrTimer = null;

  const sc = _wrScenes[_wrIdx];
  if (!sc) { _close(); return; }
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  const lapis = sc.accent === 'lapis';

  const bars = _wrScenes.map((_, i) => `
    <span class="wr-bar${i < _wrIdx ? ' wr-bar--done' : ''}${i === _wrIdx ? ' wr-bar--live' : ''}">
      <i${i === _wrIdx && !reduce && !sc.final ? ` style="animation-duration:${SCENE_MS}ms"` : ''}></i>
    </span>`).join('');

  portal.innerHTML = `
    <div class="wr-stage${lapis ? ' wr-stage--lapis' : ''}">
      <div class="wr-bars">${bars}</div>
      <button class="wr-close" id="wr-close" aria-label="Kapat">✕</button>
      <div class="wr-scene" role="dialog" aria-modal="true" aria-label="Ayın Filmi">
        <div class="wr-kicker">${esc(sc.kicker)}</div>
        <div class="wr-glyph">${esc(sc.glyph || '✦')}</div>
        ${sc.big != null ? `<div class="wr-big">${esc(String(sc.big))}</div>` : ''}
        ${sc.label ? `<div class="wr-label">${esc(sc.label)}</div>` : ''}
        ${sc.title ? `<div class="wr-title">${esc(sc.title)}</div>` : ''}
        <div class="wr-lines">${(sc.lines || []).map(l => `<div class="wr-line">${esc(l)}</div>`).join('')}</div>
        ${sc.final ? `
          <div class="wr-actions">
            <button class="wr-share" id="wr-share" type="button">${t('wr.share_btn', 'FİLMİ PAYLAŞ')} ↗</button>
            <button class="wr-done" id="wr-done" type="button">${t('wr.done', 'KAPAT')}</button>
          </div>` : ''}
      </div>
      ${!sc.final ? `
        <button class="wr-tap wr-tap--prev" id="wr-prev" aria-label="Önceki"></button>
        <button class="wr-tap wr-tap--next" id="wr-next" aria-label="Sonraki"></button>
        <div class="wr-hint">${t('wr.hint', 'dokun · devam')}</div>` : ''}
    </div>`;

  try { window.fxCue?.(sc.final ? 'milestone3' : (_wrIdx === 0 ? 'gift' : 'tap')); } catch (_) {}

  document.getElementById('wr-close')?.addEventListener('click', _close);
  document.getElementById('wr-prev')?.addEventListener('click', () => { _wrIdx = Math.max(0, _wrIdx - 1); _renderScene(); });
  document.getElementById('wr-next')?.addEventListener('click', () => { _wrIdx++; _renderScene(); });
  document.getElementById('wr-done')?.addEventListener('click', _close);
  document.getElementById('wr-share')?.addEventListener('click', () => {
    const st = _wrStats;
    const bits = [];
    if (st.bestRun > 1) bits.push(t('wr.share.run').replace('{n}', st.bestRun));
    if (st.sozDays) bits.push(t('wr.share.soz').replace('{n}', st.sozDays));
    const kart = st.smCards.length + st.kisiCards;
    if (kart) bits.push(t('wr.share.kart').replace('{n}', kart));
    try {
      window.shrShareStory?.({
        kicker: `${t('wr.kicker', 'AYIN FİLMİ')} · ${st.label}`,
        glyph: '✶', big: st.activeDays, bigLabel: t('wr.gun_upper', 'GÜN'),
        title: t('wr.share.title', 'Yolculuğun'), sub: st.label,
        line: bits.length ? bits.join(' · ') : t('wr.share.fallback', 'Yeni ay, yeni halka.'),
        tier: 3,
      });
    } catch (_) {}
  });

  if (!sc.final && !reduce) _wrTimer = setTimeout(() => { _wrIdx++; _renderScene(); }, SCENE_MS);
}

/* ════════════════════════════════════════════════════════════════════
   DAVET — ayın ilk haftasında Bugün'e şerit
════════════════════════════════════════════════════════════════════ */
export function wrMaybeInvite() {
  try {
    const now = new Date();
    if (now.getDate() > 7) return;
    const prev = _prevYm();
    const st = _load();
    if (st.seen[prev]) return;
    if (document.getElementById('wr-invite')) return;
    const stats = wrBuildStats(prev);
    if (stats.activeDays < 3) return; // film çıkacak kadar veri yok
    const host = document.querySelector('#bugun-view .ws-body');
    if (!host) return;
    const el = document.createElement('button');
    el.id = 'wr-invite';
    el.className = 'wr-invite';
    el.type = 'button';
    el.innerHTML = `
      <span class="wr-invite-glyph">✶</span>
      <span class="wr-invite-txt">
        <span class="wr-invite-kick">${t('wr.invite.kick', 'AYIN FİLMİ HAZIR')}</span>
        <span class="wr-invite-title">${esc(t('wr.invite.title', '{label} · {n} günün filmi').replace('{label}', stats.label).replace('{n}', stats.activeDays))}</span>
      </span>
      <span class="wr-invite-cta">${t('wr.invite.cta', 'İZLE')} →</span>`;
    el.addEventListener('click', () => wrOpen(prev));
    host.appendChild(el);
  } catch (_) {}
}

export function wrInit() {
  _load();
  setTimeout(wrMaybeInvite, 4000); // sabah akışı yerleşsin
}

/* ── window expose ── */
if (typeof window !== 'undefined') {
  window.wrOpen = wrOpen;
  window.wrInit = wrInit;
  window.wrMaybeInvite = wrMaybeInvite;
  window.wrBuildStats = wrBuildStats;
}
