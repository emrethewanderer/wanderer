/* ═══════════════════════════════════════════════════════════════════
   13h — AKŞAM KAPANIŞ TÖRENİ · Günü kapatma + yarına niyet
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Sabah ritüeli günü AÇAR (Armağan → Söz → Mühür); akşam töreni günü
     KAPATIR. Gün, başladığı gibi bitmelidir: bilinçle. Üç satırlık dürüst
     bir bakış (mühür · söz · seri) + tek cümlelik YARINA NİYET. Niyet,
     ertesi sabah Günün Armağanı'nda geri verilir — döngü kapanır.
     Renk ekseni: kapanış gecesi LAPİS (hayal/içsel derinlik), mühür altın.

   TETİK: akşam penceresi (21:00–00:00, "9–12") + uygulama açık + bugün tören
     yapılmamış + başka tam-ekran akış yokken (gl/sm-portal, intro, kapı,
     onboarding). Üç Mühür'ün günlük özeti olduğundan Wanderer Studio'ya has —
     yalnız Bugün ekranında belirir (Wanderer LLM ön-yüzünde artık belirmez).
     SÖZLEŞME: gün KAPATILANA kadar (GÜNÜ KAPAT) kullanıcı uygulamaya her
     girdiğinde (cold boot) yeniden belirir. ✕/perde ile kapatmak "şimdi
     değil"dir: o oturum boyunca (uygulama içinde gezerken + arka plandan
     dönüşte) bir daha rahatsız etmez; bayrak tam yeniden yüklemede (cold
     boot, atInit) sıfırlanır → bir sonraki girişte geri gelir.
     Manuel: window.atRun(true) bayrağı yok sayar.

   Kalıcılık: SafeStorage per-uid (etw_aksam_toreni_v1_<uid>)
     { lastDay, intentions: { 'YYYY-AA-GG': metin } } (14 gün saklanır).
   Konvansiyon: t() ile i18n (at.* dict); GELDİN/GÖRDÜN/YAPTIN 10f'den reuse
     (yol.verb.*); window.at* expose; ses/haptik 13e.
   Stiller: css/parts/aksam.css (link ile).
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage, localISODate, escapeHTML } from './00a-infrastructure.js';
import { t } from './15-i18n.js';

const STORAGE_KEY = 'etw_aksam_toreni_v1';
const EVENING_HOUR = 21;     // kapı AÇILIR — akşam 21:00 ("9")
const EVENING_END_HOUR = 24; // kapı KAPANIR — gece yarısı 00:00 ("12"); sonrası yeni gün

/* Tek kaynak: escapeHTML (00a). Eskiden bu modülün kendi ikizi vardı;
   ikizler birbirinden de farklıydı (bir kısmı tek tırnağı kaçırmıyordu). */
const esc = escapeHTML;

function _dayKey(d) {
  return localISODate(d);
}
function _yesterdayKey() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return _dayKey(d);
}
function _userName() {
  const u = S.currentUser;
  return (u && (u.name || (u.user_metadata && u.user_metadata.name))) || t('at.default_name', 'Gezgin');
}

/* ── Persistans ── */
function _default() { return { lastDay: null, intentions: {} }; }
function _key() { return `${STORAGE_KEY}_${(S.currentUser && S.currentUser.id) || 'anon'}`; }

export function atSave() {
  try { SafeStorage.set(_key(), S._aksamToreni); } catch (e) { console.warn('atSave:', e && e.message); }
}
export function atLoad() {
  try {
    const data = SafeStorage.get(_key());
    if (data && typeof data === 'object') S._aksamToreni = Object.assign(_default(), data);
  } catch (e) { console.warn('atLoad:', e && e.message); }
}

/** Belirli günün niyeti (10s sabah armağanı dünün niyetini geri verir). */
export function atIntentionFor(dayKey) {
  try { return (S._aksamToreni && S._aksamToreni.intentions && S._aksamToreni.intentions[dayKey]) || null; }
  catch (_) { return null; }
}
export function atYesterdayIntention() { return atIntentionFor(_yesterdayKey()); }

function _pruneIntentions() {
  try {
    const keys = Object.keys(S._aksamToreni.intentions || {}).sort();
    while (keys.length > 14) delete S._aksamToreni.intentions[keys.shift()];
  } catch (_) {}
}

/* ── Uygunluk + bloklayıcılar (10s/10t kalıbı) ── */
function _applicable() {
  if (!S._aksamToreni) return false;
  if (S._aksamToreni.lastDay === _dayKey()) return false;       // bugün kapandı → bir daha gösterme
  const h = new Date().getHours();
  if (h < EVENING_HOUR || h >= EVENING_END_HOUR) return false;   // pencere dışı (yalnız 21:00–00:00)
  const app = document.getElementById('app-screen');
  if (!app || app.style.display === 'none') return false;
  return true;
}
function _blocked() {
  /* Sahne sırası 13B'de: portal listesi ve kabuk akışları oradan okunur.
     Kapanış törenine ÖZEL koşul (yalnız Bugün ekranında belirir) burada
     kalır — kuyruk sıranın kimde olduğunu bilir, sahnenin ne zaman uygun
     olduğunu sahibi bilir. */
  try { if (window.trnMesgul?.()) return true; } catch (_) {}
  // Kapanış Üç Mühür'ün (seri/hayal/söz) günlük özetidir → Studio'ya has,
  // yalnız Bugün ekranında belirir.
  const active = document.querySelector('.view.active');
  if (active && active.id !== 'bugun-view') return true;
  return false;
}

/* ── Gün durumu (özet satırları için) ── */
function _dayState() {
  const today = _dayKey();
  let sealed = false, streak = 0;
  try { sealed = !!(S._seriMuhru && S._seriMuhru.lastSealedDay === today); } catch (_) {}
  try { if (window.recomputeStreakUI) streak = window.recomputeStreakUI() | 0; } catch (_) {}
  // HAYAL mührü (GÖRDÜN) — bütün ritüel bugün canlı mı? (10u usSeriesState)
  let hayalDone = false;
  try { hayalDone = !!(window.usSeriesState && window.usSeriesState('hayal').activeToday); } catch (_) {}
  let pledges = [], reckoned = false, kept = 0;
  try {
    const r = S._gunlukRitus;
    if (r && r.date === today && Array.isArray(r.pledges)) {
      pledges = r.pledges;
      reckoned = !!r.reckoned;
      kept = pledges.filter(p => p && p.kept).length;
    }
  } catch (_) {}
  return { sealed, streak, hayalDone, pledges, reckoned, kept };
}

/* ════════════════════════════════════════════════════════════════════
   TETİKLEYİCİ — periyodik nabız (post-auth atInit kurar)
════════════════════════════════════════════════════════════════════ */
let _atTimer = null;
// Oturum-ömürlü "şimdi değil" bayrağı: ✕/perde → bu sayfa yüklemesi boyunca
// (gezinme + arka plandan dönüş) bir daha açılmaz. Cold boot'ta (atInit)
// sıfırlanır; force=true bayrağı yok sayar.
let _atDismissedSession = false;

export function atRun(force) {
  if (!force) {
    if (_atDismissedSession) return;
    if (!_applicable()) return;
    if (_blocked()) return; // nabız zaten tekrar dener
    if (window.trnIzin?.('aksam-toreni') === false) return; // oturum bütçesi (13B)
  }
  if (document.getElementById('at-portal')) return;
  _render();
}

export function atInit() {
  if (!S._aksamToreni) S._aksamToreni = _default();
  atLoad();
  _atDismissedSession = false;
  // Nabız: 5 dakikada bir (akşam penceresine açık uygulamayla geçişi yakalar) +
  // RESUME: sekme/uygulama yeniden görünür olunca (arka plandan dönüş = giriş)
  if (_atTimer) clearInterval(_atTimer);
  _atTimer = setInterval(() => atRun(false), 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(() => atRun(false), 1200); });
  // COLD BOOT girişi — açılış perdesi/onboarding/sabah guard'ları önde olabilir;
  // kısa bir merdivenle ilk temiz anı yakala (nabız uzun vadeli emniyet ağı).
  // atRun her denemede _applicable/_blocked ile yeniden kontrol eder (idempotent).
  [4000, 12000, 30000].forEach(ms => setTimeout(() => atRun(false), ms));
}

/* ════════════════════════════════════════════════════════════════════
   RENDER — tek portal, kapanış sahnesi
════════════════════════════════════════════════════════════════════ */
function _mountPortal() {
  let p = document.getElementById('at-portal');
  if (!p) { p = document.createElement('div'); p.id = 'at-portal'; document.body.appendChild(p); }
  p.className = 'at-portal';
  window.wtOverlayOpen?.('aksam-toreni');   // Kullanım Nabzı (00f)
  return p;
}
function _closePortal() {
  window.wtOverlayClose?.('aksam-toreni');
  document.getElementById('at-portal')?.remove();
  try { window.glSyncElmasBar?.(window.glActiveViewName ? window.glActiveViewName() : ''); } catch (_) {}
}

/* DUYGU MOTORU DAVETİ (13D K10/FAZ 17) — tören kendi sesini korur, `DG_CUE`
   burada devreye girmez (13h zaten `whoosh`/`seal`/`soz` cue'sunu taşır,
   K8'in beden kanalı dolu; ayna kanalı da Zirve satırıyla zaten dolu).
   Geriye yalnız SÖZ kanalı kalır: okuma varsa mevcut `at.body` paragrafının
   BAŞINA tek cümle eklenir, paragraf DEĞİŞMEZ. `taniklik`/`tutma`da cümle
   YOK — tablo plan FAZ 17'de karara bağlandı, burada İCAT EDİLMEDİ. */
function _dgAtCumle(eksen) {
  const CUMLE = {
    yatistirma: t('at.dg.yatistirma', 'Bugün ne taşıdıysan, burada bırakabilirsin.'),
    sahiplenme: t('at.dg.sahiplenme', 'Bugünü tartarken kendine karşı adil ol — dürüst bakış suçlama değildir.'),
    berraklik: t('at.dg.berraklik', 'Günün ipleri karıştıysa, üç satır onları ayırmaya yeter.'),
    diriltme: t('at.dg.diriltme', 'Az yapılmış bir gün de kapanır; kapanan gün yarını hafifletir.'),
    kutlama: t('at.dg.kutlama', 'İyi bir günü mühürlemek, onu hatırlanır kılar.'),
  };
  return CUMLE[eksen] || null;
}

/** `dgKapi('toren', …)` TEK kapıdır — `S._dgNabiz`/`S._dgIklim` burada
 *  DOĞRUDAN okunmaz (K10). İki tanık şartını `oncekiNabiz` + `zaman`
 *  karşılar (FAZ 17'nin doğurduğu iki alan, 00-config-tracking.js). window
 *  köprüsü bu dosyanın zaten kullandığı konvansiyondur (`window.igGetZirve`
 *  emsali) — okuma yoksa sessizce düş. */
function _dgTorenOkuma() {
  try {
    return window.dgKapi?.('toren', {
      nabiz: S._dgNabiz || null,
      oncekiNabiz: S._dgOncekiNabiz || null,
      iklim: S._dgIklim || null,
      zaman: S._dgNabizZaman || null,
      akis: { yon: S._dgYay, gecmis: S._dgSonKarsilama },
    });
  } catch (e) { console.warn('dgTorenOkuma(aksam):', e && e.message); return null; }
}

function _render() {
  const portal = _mountPortal();
  const st = _dayState();
  const name = esc(_userName());

  // Üç mühür · üç vuruş — Bugün'ün halkasını dövenler (10f/10u dili):
  //   SERİ = GELDİN (✦ altın) · HAYAL = GÖRDÜN (◉ lapis) · SÖZ = YAPTIN (◆ altın)

  // GELDİN — günü mühürle (smRunDaily köprüsü)
  const seriRow = st.sealed
    ? `<div class="at-row at-row--done at-row--seri">
        <span class="at-row-g">✦</span>
        <span class="at-row-t"><span class="at-row-v">${t('yol.verb.seri', 'GELDİN')}</span>${t('at.seri_done', 'Günün halkası dövüldü — zincir {n} gün.').replace('{n}', st.streak)}</span>
      </div>`
    : `<button class="at-row at-row--cta at-row--seri" id="at-seal" type="button">
        <span class="at-row-g">✦</span>
        <span class="at-row-t"><span class="at-row-v">${t('yol.verb.seri', 'GELDİN')}</span>${t('at.seri_pending', 'Bugün henüz mühürlenmedi.')}</span>
        <span class="at-row-act">${t('at.seri_cta', 'Mühürle →')}</span>
      </button>`;

  // GÖRDÜN — bütün ritüeli bütünle (usOpenDetail('hayal') köprüsü)
  const hayalRow = st.hayalDone
    ? `<div class="at-row at-row--done at-row--hayal">
        <span class="at-row-g">◉</span>
        <span class="at-row-t"><span class="at-row-v">${t('yol.verb.hayal', 'GÖRDÜN')}</span>${t('at.hayal_done', 'Hedef kişiyi bugün canlı tuttun.')}</span>
      </div>`
    : `<button class="at-row at-row--cta at-row--hayal" id="at-hayal" type="button">
        <span class="at-row-g">◉</span>
        <span class="at-row-t"><span class="at-row-v">${t('yol.verb.hayal', 'GÖRDÜN')}</span>${t('at.hayal_pending', 'Ritüel henüz bütünlenmedi.')}</span>
        <span class="at-row-act">${t('at.hayal_cta', 'Bütünle →')}</span>
      </button>`;

  // YAPTIN — söz durumu: hesap bekliyorsa köprü, verilmemişse davet
  let sozRow;
  if (st.pledges.length && !st.reckoned) {
    sozRow = `<button class="at-row at-row--cta at-row--soz" id="at-reckon" type="button">
      <span class="at-row-g">◆</span>
      <span class="at-row-t"><span class="at-row-v">${t('yol.verb.soz', 'YAPTIN')}</span>${t('at.soz_pending', '{n} alanda söz verdin — hesabı bekliyor').replace('{n}', st.pledges.length)}</span>
      <span class="at-row-act">${t('at.soz_cta', 'Hesapla →')}</span>
    </button>`;
  } else if (st.pledges.length) {
    sozRow = `<div class="at-row at-row--done at-row--soz">
      <span class="at-row-g">◆</span>
      <span class="at-row-t"><span class="at-row-v">${t('yol.verb.soz', 'YAPTIN')}</span>${t('at.soz_done', 'Söz: {kept}/{n} tutuldu — dürüst hesap, gerçek güç.').replace('{kept}', st.kept).replace('{n}', st.pledges.length)}</span>
    </div>`;
  } else {
    sozRow = `<div class="at-row at-row--dim at-row--soz">
      <span class="at-row-g">◇</span>
      <span class="at-row-t"><span class="at-row-v">${t('yol.verb.soz', 'YAPTIN')}</span>${t('at.soz_none', 'Bugün söz verilmedi. Yarın yeni bir sayfa.')}</span>
    </div>`;
  }

  /* ZİRVE SATIRI (13z FAZ 5) — günün en yüklü cümlesi, kullanıcının KENDİ
     ağzından. Üç Mühür "ne yaptın"ı söyler; bu satır "ne dedin"i geri
     verir. Kapı iki katlı: köken kaydı olacak (kokenKayitVar şekli) VE
     kayıt BUGÜNE ait olacak — dünün cümlesini bugünün töreninde göstermek
     hatırayı inşa etmez, uydurur. Cümleye dokunulmaz (kırpma/düzeltme
     yok), yalnız escapeHTML'den geçer. */
  let zirveRow = '';
  try {
    const z = window.igGetZirve?.();
    if (z && z.kaynak !== 'yok' && z.kanit && z.v?.gun === localISODate()) {
      zirveRow = `
      <div class="at-row at-row--zirve">
        <span class="at-row-g" aria-hidden="true">✧</span>
        <span class="at-row-t">
          <span class="at-row-v">${t('imge.zirve.kick', 'KENDİ SÖZÜN')}</span>
          ${t('imge.zirve.line', 'Bugün şunu söyledin:')}
          <span class="at-zirve-q">“${esc(z.kanit)}”</span>
        </span>
      </div>`;
      try { window.fxCue?.('seal'); } catch (_) {}
    }
  } catch (_) {}

  const dgOkuma = _dgTorenOkuma();
  const dgCumle = dgOkuma ? _dgAtCumle(dgOkuma.eksen) : null;

  portal.innerHTML = `
    <div class="at-veil"></div>
    <div class="at-modal" role="dialog" aria-modal="true" aria-label="${t('at.dialog_label', 'Akşam Kapanışı')}"><div class="wn-grain">
      <button class="at-close" id="at-close" aria-label="${t('at.close', 'Kapat')}">✕</button>
      <div class="at-kicker">${t('at.kicker', 'AKŞAM KAPANIŞI · {name}').replace('{name}', name.toLocaleUpperCase(S._currentLang || 'tr'))}</div>
      <div class="at-moon" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="56" height="56" fill="none">
          <path d="M52 36.5A22 22 0 1 1 27.5 12 17 17 0 0 0 52 36.5Z"
                stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="38" cy="18" r="1.6" fill="currentColor"/>
          <circle cx="46" cy="26" r="1.1" fill="currentColor"/>
        </svg>
      </div>
      <div class="at-title">${t('at.title', 'Gün kapanıyor')}</div>
      <div class="at-body">${dgCumle ? `${dgCumle} ` : ''}${t('at.body', 'Gün, başladığı gibi bitmeli: bilinçle. Kısa bir bakış — sonra yarına bir niyet bırak.')}<button class="at-info" id="at-info" type="button" aria-label="${t('at.info_label', 'Gün Özeti hakkında bilgi')}" aria-expanded="false">i</button></div>
      <div class="at-info-pop" id="at-info-pop" hidden>${t('at.info_pop', 'Günü kapattıktan sonra konuşmaya devam edebilirsin — ama bu andan yeni güne kadar yazdıkların Gün Özeti\'ne dâhil edilmez.')}</div>

      <div class="at-rows">
        ${seriRow}
        ${hayalRow}
        ${sozRow}
        ${zirveRow}
      </div>

      <div class="at-intent">
        <label class="at-intent-q" for="at-intent-input">${t('at.intent_q', 'YARINA NİYET')} <span>${t('at.intent_hint_inline', '— yarın kim olacaksın? Tek cümle.')}</span></label>
        <input class="at-intent-input" id="at-intent-input" type="text" maxlength="140"
               placeholder="${t('at.intent_placeholder', 'Örn: Yarın ilk tepkimden önce üç nefes alan kişiyim.')}" autocomplete="off">
        <div class="at-intent-hint">${t('at.intent_hint', 'Niyetin, sabah Günün Armağanı\'yla sana geri verilir.')}</div>
      </div>

      <button class="at-cta" id="at-cta" type="button">${t('at.cta', 'GÜNÜ KAPAT ☽')}</button>
    </div></div>`;

  try { window.fxCue?.('whoosh'); } catch (_) {}

  /* DAMGA (K13, §6.10) — "teslim eden basar". Kapıdan geçmek yetmez;
     `dgCumle` yalnız cümle GERÇEKTEN paragrafa yazıldığında dolu — kapı ile
     teslim aynı dal, ayrıştırmaya gerek yok. taniklik/tutma'da ya da okuma
     null'sa `dgCumle` de null'dır, damga da basılmaz. İklim hidre değilse
     yazacak defter yoktur (01-prompts-modes.js:344 emsali). */
  if (dgCumle && S._dgIklim) {
    S._dgIklim = window.dgYanilmaKonustu?.(S._dgIklim, 'toren') || S._dgIklim;
    window.dgIklimKaydet?.(S._dgIklim);
  }
  /* İKİNCİ DEFTER (00f wtLogDuygu) — gerekçe kanalın kendi evinde
     (00f-kullanim-nabzi.js, `_DG_YUZEY`); kapı: 13D-iki-defter-kapisi. */
  if (dgCumle) { try { window.wtLogDuygu?.(dgOkuma.eksen, { yuzey: 'toren', duzeltildi: false }); } catch (_) {} }

  /* ✕ artık YALNIZ bu oturumu değil, ısrarı da bildirir (FAZ 17). Üç ardışık
     ret sonrası kuyruk bu töreni davetsiz getirmeyi bir hafta bırakır —
     "şimdi değil" duyulur, ama "asla" sayılmaz: kullanıcı kendi açarsa kapı
     açık, tek bir tamamlama sayacı sıfırlar. */
  const _dismissNow = () => {
    _atDismissedSession = true;
    try { window.trnRet?.('aksam-toreni'); } catch (_) {}
    _closePortal();
  };
  document.getElementById('at-close')?.addEventListener('click', _dismissNow);
  portal.querySelector('.at-veil')?.addEventListener('click', _dismissNow);

  // Bilgi "i" — Gün Özeti notunu tıklayınca aç/kapat (artık daima görünmüyor)
  const infoBtn = document.getElementById('at-info');
  const infoPop = document.getElementById('at-info-pop');
  infoBtn?.addEventListener('click', () => {
    const open = infoPop?.hasAttribute('hidden');
    if (open) { infoPop.removeAttribute('hidden'); infoBtn.setAttribute('aria-expanded', 'true'); }
    else { infoPop?.setAttribute('hidden', ''); infoBtn.setAttribute('aria-expanded', 'false'); }
  });

  // GELDİN — günü mühürle: kapanışı bırak, mühür törenine geç (o kapanınca nabız yeniden dener)
  document.getElementById('at-seal')?.addEventListener('click', () => {
    _closePortal();
    setTimeout(() => { try { window.smRunDaily?.(true); } catch (_) {} }, 250);
  });
  // GÖRDÜN — doğrudan Bakış anına (10E gorOpen). Eskiden Hayal Mührü
  // istatistik sayfasına uğrayıp oradan törene gidiyordu; törenin yolu
  // törenden geçer. gorOpen bugünkü bakışı zaten tanır (usGetTodayVision):
  // yapılmışsa cümleyi gösterir, yapılmamışsa sorar.
  document.getElementById('at-hayal')?.addEventListener('click', () => {
    _closePortal();
    setTimeout(() => { try { window.gorOpen?.(); } catch (_) {} }, 250);
  });
  // YAPTIN — Akşam Hesabı köprüsü (10s)
  document.getElementById('at-reckon')?.addEventListener('click', () => {
    _closePortal();
    setTimeout(() => { try { window.glRunEveningReckoning?.(); } catch (_) {} }, 250);
  });

  // GÜNÜ KAPAT — niyeti sakla, töreni mühürle, ardından kapanışın derin
  // akışına geç: Ruh → Beden → Özet (05-closure-parts). Tören 21:00 kapısını
  // zaten geçtiği için closure'ın 21:00 penceresini force ile atlar ve onay
  // adımını atlayıp doğrudan Ruh adımına (1) iner.
  document.getElementById('at-cta')?.addEventListener('click', () => {
    const txt = (document.getElementById('at-intent-input')?.value || '').trim();
    if (txt) {
      S._aksamToreni.intentions[_dayKey()] = txt.slice(0, 140);
      _pruneIntentions();
      // Yaşayan Portre (09e) — kullanıcının kendi sözü anında changelog'a işlenir
      try { window.ypAddEveningIntentNote?.(txt); } catch (_) {}
    }
    S._aksamToreni.lastDay = _dayKey();
    atSave();
    // Katılım ısrar sayacını SIFIRLAR (FAZ 17) — bir kabul, üç retten ağır basar.
    try { window.trnKabul?.('aksam-toreni'); } catch (_) {}
    try { window.fxCue?.('soz'); } catch (_) {}
    const handoff = () => {
      _closePortal();
      setTimeout(() => { try { window.openDailyClosure?.(true, 1); } catch (_) {} }, 240);
    };
    const modal = portal.querySelector('.at-modal');
    if (modal) {
      modal.classList.add('at-modal--out');
      setTimeout(handoff, 420);
    } else handoff();
  });
}

/* ── window expose ── */
if (typeof window !== 'undefined') {
  window.atInit = atInit;
  window.atRun = atRun;
  window.atIntentionFor = atIntentionFor;
  window.atYesterdayIntention = atYesterdayIntention;
}
