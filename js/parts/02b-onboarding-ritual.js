// Wanderer AI — YOL AYİNİ (Devrimsel Onboarding Rıtüeli)
// =====================================================================
// İlk girişte çalışan sinematik teşhis ritüeli. Kullanıcı 3 hayat alanında
// (Bireysel · İlişki · İş) hedefini söyler + teşhis sorularını yanıtlar.
// Çıktı: 5 Temel'in (Öz Sevgi/Saygı/Değer/Güven · Bolluk) alan-bazlı puanı,
// seni durduran kalıp ve "hangi kişi olmalısın" arketip önerisi.
//
// Tüm sistemi tohumlar:
//   • S._foundationsProfile      ← teşhis puanları
//   • S._personTransition        ← hedefler + önerilen kişi
//   • S._onboardingRecommendation ← sentez sonucu
//   • dfSave() ile kalıcılaştırılır + onboarding_answers tablosuna yazılır
//
// Strings i18n (dict: onb.* + sc.found.* reuse). Modül-yükünde t() çağrılmaz —
// içerik render-anında resolver fonksiyonlarıyla (_domainText/_qText/_optText/
// _foundLabel/_patternLabel/_fallbackLabel) çözülür.
// =====================================================================

import { S } from '../state.js';
import { sb } from '../config.js';
import { getArchetypeById } from './12a-archetypes.js';
import { dfSave } from './09b-depth-foundations.js';
import { t } from './15-i18n.js';
import { p } from './16-i18n-prompts.js';

/* ══════════════════════════════════════════════════════════════
   SORU & AĞIRLIK TABLOSU
   Her şık bir veya birden çok Temel'e ± puan yazar (base 50).
   Bazı şıklar bir "kalıp" (hasım) etiketi taşır → Ayna sahnesi + öneri.
   Metinler dict'te (onb.domain.<key>.*); burada yalnız ağırlık/kalıp verisi.
══════════════════════════════════════════════════════════════ */
const DOMAINS = [
  {
    key: 'bireysel',
    questions: [
      {
        opts: [
          { w: { oz_deger: -18, oz_sevgi: -8 } },
          { w: { oz_guven: -4 }, pattern: 'erteleme' },
          { w: { oz_deger: -10, bolluk: -6 } },
          { w: { oz_guven: 12, oz_deger: 6 } },
        ],
      },
      {
        opts: [
          { w: { oz_sevgi: -18, oz_saygi: -6 } },
          { w: { oz_sevgi: -6 }, pattern: 'kacis' },
          { w: { oz_saygi: 8, oz_sevgi: 4 } },
          { w: { oz_sevgi: 16 } },
        ],
      },
    ],
  },
  {
    key: 'iliski',
    questions: [
      {
        opts: [
          { w: { oz_saygi: -14, oz_deger: -6 } },
          { w: { oz_saygi: -10 } },
          { w: { oz_saygi: 14 } },
          { w: { oz_saygi: -16 }, pattern: 'onay' },
        ],
      },
      {
        opts: [
          { w: { oz_deger: -18, oz_sevgi: -6 } },
          { w: { oz_saygi: -12 } },
          { w: { oz_saygi: 12, oz_deger: 8 } },
          { w: { oz_saygi: -4 }, pattern: 'kizginlik' },
        ],
      },
    ],
  },
  {
    key: 'is',
    questions: [
      {
        opts: [
          { w: { oz_guven: -18 } },
          { w: { oz_guven: -8, oz_deger: -6 } },
          { w: { oz_guven: 14 } },
          { w: { oz_deger: -10 }, pattern: 'kiyaslama' },
        ],
      },
      {
        opts: [
          { w: { bolluk: -18 } },
          { w: { bolluk: -10, oz_guven: -6 } },
          { w: { bolluk: 16 } },
          { w: { oz_deger: -12, bolluk: -6 } },
        ],
      },
    ],
  },
];

const FOUND_KEYS = ['oz_sevgi', 'oz_saygi', 'oz_deger', 'oz_guven', 'bolluk'];
const _foundLabel = (k) => t('por.found.' + k);
const _patternLabel = (p) => t('onb.pattern.' + p);
const _fallbackLabel = (k) => t('onb.fallback.' + k);
const _domainText = (dKey, field) => t(`onb.domain.${dKey}.${field}`);
const _qText = (dKey, qi) => t(`onb.domain.${dKey}.q${qi}`);
const _optText = (dKey, qi, oi) => t(`onb.domain.${dKey}.q${qi}.opt${oi}`);

// Kalıp → panzehir arketip (12a-archetypes getSuggestedArchetype ile aynı harita)
const PATTERN_ARCH = {
  erteleme: 'niyetli', onay: 'sabirli', kacis: 'durust',
  kizginlik: 'sabirli', yakistirma: 'hak-eden', kiyaslama: 'yansiyan',
};

// Zayıf temel → arketip (alan duyarlı)
function foundationArch(foundationKey, domainKey) {
  switch (foundationKey) {
    case 'oz_deger': return 'hak-eden';
    case 'oz_guven': return 'cesur';
    case 'bolluk':   return 'sukreden';
    case 'oz_saygi': return domainKey === 'iliski' ? 'sinir' : 'yansiyan';
    case 'oz_sevgi': return 'yansiyan';
    default:         return 'sozunu-tutan';
  }
}

/* ══════════════════════════════════════════════════════════════
   PUANLAMA & ÖNERİ MOTORU
══════════════════════════════════════════════════════════════ */
function computeResult(state) {
  const FKEYS = FOUND_KEYS;
  const clamp = v => Math.max(2, Math.min(98, Math.round(v)));

  // Global temel puanları (base 50 + tüm deltalar)
  const global = {}; FKEYS.forEach(k => (global[k] = 50));
  // Alan bazlı deltalar (alan limiting-foundation için)
  const perDomain = {};
  DOMAINS.forEach(d => { perDomain[d.key] = {}; });

  const patternCount = {};
  const domainPatterns = {};

  DOMAINS.forEach(d => {
    (state.answers[d.key] || []).forEach(opt => {
      if (!opt) return;
      Object.entries(opt.w || {}).forEach(([fk, delta]) => {
        global[fk] += delta;
        perDomain[d.key][fk] = (perDomain[d.key][fk] || 0) + delta;
      });
      if (opt.pattern) {
        patternCount[opt.pattern] = (patternCount[opt.pattern] || 0) + 1;
        (domainPatterns[d.key] ||= []).push(opt.pattern);
      }
    });
  });

  const foundations = {};
  FKEYS.forEach(k => (foundations[k] = clamp(global[k])));

  // Baskın kalıp (en sık; eşitlikte ilk görülen)
  let pattern = null;
  let max = 0;
  Object.entries(patternCount).forEach(([p, c]) => { if (c > max) { max = c; pattern = p; } });

  // Alan başına öneri
  const domainRecs = {};
  DOMAINS.forEach(d => {
    const dp = domainPatterns[d.key];
    const touched = Object.keys(perDomain[d.key]);
    // Bu alanda en zayıf (etkilenmiş) temel
    let limitKey = touched[0] || 'oz_deger';
    /* KOKEN-MUAF: en-küçüğü-bul döngüsünün sentineli, bir ölçüm değil.
       Hiçbir temel dokunulmadıysa 999 zaten kalmaz — bir alt satırdaki
       kontrol onu gerçek değere düşürür. */
    let limitScore = 999;
    touched.forEach(fk => {
      const sc = clamp(50 + perDomain[d.key][fk]);
      if (sc < limitScore) { limitScore = sc; limitKey = fk; }
    });
    if (limitScore === 999) { limitKey = 'oz_deger'; limitScore = foundations.oz_deger; }

    // Kalıp varsa panzehir arketip; yoksa zayıf temel arketipi
    let archId;
    if (dp && dp.length) {
      archId = PATTERN_ARCH[dp[0]] || foundationArch(limitKey, d.key);
    } else {
      archId = foundationArch(limitKey, d.key);
    }
    const arch = getArchetypeById(archId) || {};
    domainRecs[d.key] = {
      archId,
      name: arch.name || '',
      whisper: arch.whisper || '',
      lesson: arch.lesson || '',
      foundationKey: limitKey,
      foundationLabel: _foundLabel(limitKey),
      score: limitScore,
    };
  });

  // İlk mühür = en düşük skorlu (en acil) alan önerisi
  let firstSeal = null;
  Object.entries(domainRecs).forEach(([domainKey, rec]) => {
    if (!firstSeal || rec.score < firstSeal.score) firstSeal = { domainKey, ...rec };
  });

  // En zayıf global temel (Ayna sahnesi başlığı)
  let weakestKey = FKEYS[0];
  FKEYS.forEach(k => { if (foundations[k] < foundations[weakestKey]) weakestKey = k; });

  const patternLabel = pattern
    ? _patternLabel(pattern)
    : _fallbackLabel(weakestKey);

  return {
    goals: { ...state.goals },
    foundations,
    weakestKey,
    weakestLabel: _foundLabel(weakestKey),
    pattern: { id: pattern, label: patternLabel },
    domainRecs,
    firstSeal,
  };
}

/* ══════════════════════════════════════════════════════════════
   t0 — YOLUN BAŞINDAKİ TEŞHİS (dönüşüm kıyasının "önce"si)
══════════════════════════════════════════════════════════════ */
/** Yol Ayini'nin ilk teşhisini KALICI kaynaktan okur.
 *
 *  `S._onboardingRecommendation` yalnız bellekte yaşar — hiçbir SafeStorage
 *  anahtarına yazılmaz, sayfa yenilenince kaybolur. Dönüşümün "önce"si
 *  oradan okunamaz. `onboarding_answers` satırı ise tarihlidir ve içeriği
 *  kullanıcının kendi BEYANIDIR (§6.10 kökeni: beyan).
 *
 *  En ESKİ satır alınır: kullanıcı ayini tekrar ederse bile yolun başı
 *  başlangıçtır. Kanıt yoksa `null`.
 *  @returns {Promise<{tarih, temeller, enZayif, kalip, hedefler}|null>} */
export async function onbT0Oku() {
  try {
    if (!sb || !S.currentUser?.id) return null;
    const { data } = await sb.from('onboarding_answers')
      .select('answers, created_at')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: true })
      .limit(1);
    const row = (data || [])[0];
    if (!row) return null;
    const r = typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers;
    if (!r || !r.foundations) return null;
    return {
      tarih: row.created_at,
      temeller: r.foundations,                      // {oz_sevgi: 32, …}
      enZayif: r.weakestKey || null,
      kalip: (r.pattern && r.pattern.id) || null,   // erteleme/kacis/onay/…
      hedefler: r.goals || {},                      // bireysel/iliski/is
    };
  } catch (_) { return null; }
}

/** t0 ↔ BUGÜN: beş Temel'in kıyası.
 *  Bugünkü değer 09b'nin canlı profilinden gelir; kanıtsız temel (hiç sinyali
 *  olmayan) kıyasa GİRMEZ — `signals_count` eşiği 09b'nin kendi ölçüsüdür. */
export async function onbTemelKiyas() {
  const t0 = await onbT0Oku();
  if (!t0) return null;
  const simdiProfil = S._foundationsProfile || {};
  const satirlar = FOUND_KEYS.map(k => {
    const once = t0.temeller[k];
    const obj = simdiProfil[k];
    const kanitli = obj && (obj.signals_count || 0) >= 3 && typeof obj.score === 'number';
    if (typeof once !== 'number' || !kanitli) return null;
    return { anahtar: k, once, simdi: obj.score, fark: obj.score - once };
  }).filter(Boolean);
  return satirlar.length ? { tarih: t0.tarih, kalip: t0.kalip, enZayif: t0.enZayif, satirlar } : null;
}

/* ══════════════════════════════════════════════════════════════
   SİSTEME YAZ — temeller, kişi geçişi, öneri, kalıcılık
══════════════════════════════════════════════════════════════ */
function persistResult(result) {
  try {
    // 1) Temel puanları
    Object.entries(result.foundations).forEach(([k, score]) => {
      const obj = S._foundationsProfile?.[k];
      if (!obj) return;
      obj.score = score;
      obj.signals_count = Math.max(obj.signals_count || 0, 3);
      obj.direction = score < 50 ? 'down' : score > 50 ? 'up' : 'flat';
      obj.evidence = obj.evidence || [];
      obj.evidence.push({ text: 'Yol Ayini teşhisi', date: new Date().toISOString() });
    });

    // 2) Kişi geçişi — hedefler + önerilen kişi
    const pt = S._personTransition;
    if (pt) {
      const map = { bireysel: 'bireysel', iliski: 'iliski', is: 'is' };
      Object.entries(map).forEach(([k]) => {
        if (pt.domains?.[k]) {
          if (result.goals[k]) pt.domains[k].desired = String(result.goals[k]).slice(0, 120);
          const rec = result.domainRecs[k];
          if (rec) pt.domains[k].active_belief = `${rec.name}: ${rec.lesson}`;
        }
      });
      // Birincil arzu = ilk mühür arketipi
      if (result.firstSeal) {
        pt.desired.description = `${result.firstSeal.name} — ${result.firstSeal.lesson}`.slice(0, 120);
      }
      pt.last_updated = new Date().toISOString();
    }

    // 3) İlk mührü "ulaşılabilir" yap (arketipler init edildiyse)
    if (S._archetypes && result.firstSeal && S._archetypes[result.firstSeal.archId]) {
      const a = S._archetypes[result.firstSeal.archId];
      if (a.state === 'locked') a.state = 'reachable';
    }

    // 4) Öneri sonucunu state'e koy
    S._onboardingRecommendation = result;

    dfSave();
  } catch (e) { console.error('onboarding persist:', e?.message); }

  // 5) DB — onboarding_answers (geriye dönük tablo)
  try {
    if (S.currentUser?.id) {
      sb.from('onboarding_answers').insert([{
        user_id: S.currentUser.id,
        answers: JSON.stringify(result),
      }]).then(({ error }) => { if (error) console.warn('DB hata:', error.message); });
    }
  } catch (_) {}
}

/* ══════════════════════════════════════════════════════════════
   LLM BAĞLAMI — Emre ilk mesajdan itibaren bu kişiyi konuşsun
══════════════════════════════════════════════════════════════ */
export function buildRitualContext(result) {
  if (!result || !result.foundations) return '';
  const f = result.foundations;
  const foundLine = FOUND_KEYS
    .map(k => `${_foundLabel(k)} ${f[k]}`).join(' · ');
  const goalLines = [];
  if (result.goals.bireysel) goalLines.push(`- Bireysel: "${result.goals.bireysel}"`);
  if (result.goals.iliski)   goalLines.push(`- İlişki: "${result.goals.iliski}"`);
  if (result.goals.is)       goalLines.push(`- İş: "${result.goals.is}"`);
  const recs = result.domainRecs;
  const recLine = `Bireysel → ${recs.bireysel?.name} · İlişki → ${recs.iliski?.name} · İş → ${recs.is?.name}`;

  return [
    '[YOL AYİNİ — kullanıcının ilk teşhisi]',
    goalLines.length ? 'Hedefler:\n' + goalLines.join('\n') : '',
    `Temeller (0-100): ${foundLine}`,
    `En zayıf temel: ${result.weakestLabel} (${f[result.weakestKey]}). Seni durduran kalıp: ${result.pattern.label}.`,
    `Önerilen kişiler — ${recLine}.`,
    result.firstSeal ? `İlk mühür: ${result.firstSeal.name}.` : '',
    p('prompt.onboarding_ritual.emre_directive'),
  ].filter(Boolean).join('\n');
}

/* ══════════════════════════════════════════════════════════════
   EKRAN — sinematik overlay, event-delegation ile
══════════════════════════════════════════════════════════════ */
export function runOnboardingRitual() {
  return new Promise((resolve) => {
    const state = {
      scene: 0,                 // 0 eşik · 1-3 alanlar · 4 ayna · 5 sentez
      goals: { bireysel: '', iliski: '', is: '' },
      answers: { bireysel: [null, null], iliski: [null, null], is: [null, null] },
    };
    let result = null;

    const overlay = document.createElement('div');
    overlay.className = 'onb-ritual';
    overlay.id = 'onb-ritual';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    document.body.appendChild(overlay);

    const totalDomains = DOMAINS.length;

    function close(payload) {
      overlay.classList.add('onb-closing');
      setTimeout(() => { overlay.remove(); resolve(payload); }, 320);
    }

    function domainSceneHTML(d, idx) {
      const ans = state.answers[d.key];
      const qHTML = d.questions.map((qq, qi) => `
        <div class="onb-q" data-qi="${qi}">
          <div class="onb-q-text">${_qText(d.key, qi)}</div>
          <div class="onb-opts">
            ${qq.opts.map((o, oi) => `
              <button type="button" class="onb-opt ${ans[qi] === oi ? 'onb-opt-sel' : ''}"
                data-act="opt" data-d="${d.key}" data-qi="${qi}" data-oi="${oi}">
                ${_optText(d.key, qi, oi)}
              </button>`).join('')}
          </div>
        </div>`).join('');

      const answered = ans.every(a => a !== null);
      return `
        <div class="onb-scene onb-scene-domain">
          <div class="onb-progress">${idx + 1} / ${totalDomains}</div>
          <div class="onb-badge">${_domainText(d.key, 'badge')}</div>
          <h2 class="onb-h2">${_domainText(d.key, 'title')}</h2>
          <div class="onb-goal">
            <label class="onb-goal-label">${_domainText(d.key, 'goalPrompt')}</label>
            <textarea class="onb-goal-input" data-act="goal" data-d="${d.key}"
              rows="2" placeholder="${_domainText(d.key, 'goalPlaceholder')}">${state.goals[d.key] || ''}</textarea>
          </div>
          ${qHTML}
          <button type="button" class="onb-next ${answered ? '' : 'onb-disabled'}"
            data-act="next" ${answered ? '' : 'disabled'}>${t('onb.continue', 'Devam')}</button>
          <div class="onb-hint">${t('onb.domain_hint', 'Hedef alanı isteğe bağlı — iki soruyu yanıtla.')}</div>
        </div>`;
    }

    function render() {
      let html = '';
      if (state.scene === 0) {
        html = `
          <div class="onb-scene onb-scene-intro">
            <div class="onb-sigil">✶</div>
            <div class="onb-badge">${t('onb.intro.badge', 'YOL AYİNİ')}</div>
            <h1 class="onb-h1">${t('onb.intro.h1', 'Kim olduğunu değil,<br>kim olabileceğini konuşacağız.')}</h1>
            <p class="onb-lead">${t('onb.intro.lead', 'Üç alanda — kendinle, ilişkilerinde, işinde — nereye gitmek istediğini söyle. Sonunda, hedefine ulaşman için hangi kişi olman gerektiğini birlikte göreceğiz.')}</p>
            <button type="button" class="onb-next" data-act="begin">${t('onb.intro.begin', 'Başla')}</button>
            <button type="button" class="onb-skip" data-act="skip">${t('onb.intro.skip', 'Şimdilik geç')}</button>
          </div>`;
      } else if (state.scene >= 1 && state.scene <= totalDomains) {
        html = domainSceneHTML(DOMAINS[state.scene - 1], state.scene - 1);
      } else if (state.scene === totalDomains + 1) {
        // AYNA
        html = `
          <div class="onb-scene onb-scene-mirror">
            <div class="onb-sigil">🪞</div>
            <div class="onb-badge">${t('onb.mirror.badge', 'AYNA')}</div>
            <h2 class="onb-h2">${t('onb.mirror.h2', 'Şu an seni durduran')}</h2>
            <div class="onb-pattern">${result.pattern.label}</div>
            <p class="onb-lead">${t('onb.mirror.lead', 'En zayıf temelin <b>{label}</b> ({score}/100). Bu kalıp orada besleniyor. Onu görmek, dönüşümün ilk adımı.').replace('{label}', result.weakestLabel).replace('{score}', result.foundations[result.weakestKey])}</p>
            <div class="onb-found-bars">
              ${FOUND_KEYS.map(k => `
                <div class="onb-bar-row">
                  <span class="onb-bar-label">${_foundLabel(k)}</span>
                  <span class="onb-bar-track"><span class="onb-bar-fill" style="width:${result.foundations[k]}%"></span></span>
                  <span class="onb-bar-val">${result.foundations[k]}</span>
                </div>`).join('')}
            </div>
            <button type="button" class="onb-next" data-act="toSynth">${t('onb.mirror.next', 'Olman gereken kişiyi gör')}</button>
          </div>`;
      } else {
        // SENTEZ
        const fs = result.firstSeal;
        const recCard = (badge, rec) => `
          <div class="onb-rec ${rec.archId === fs.archId ? 'onb-rec-seal' : ''}">
            <div class="onb-rec-badge">${badge}</div>
            <div class="onb-rec-name">${rec.name}</div>
            <div class="onb-rec-lesson">"${rec.lesson}"</div>
          </div>`;
        html = `
          <div class="onb-scene onb-scene-synth">
            <div class="onb-sigil">✦</div>
            <div class="onb-badge">${t('onb.synth.badge', 'YOLUN BAŞLIYOR')}</div>
            <h2 class="onb-h2">${t('onb.synth.h2', 'Hedeflerine ulaşman için<br>olman gereken kişi')}</h2>
            <div class="onb-recs">
              ${recCard(_domainText('bireysel', 'badge'), result.domainRecs.bireysel)}
              ${recCard(_domainText('iliski', 'badge'), result.domainRecs.iliski)}
              ${recCard(_domainText('is', 'badge'), result.domainRecs.is)}
            </div>
            <div class="onb-seal">
              <div class="onb-seal-label">${t('onb.synth.seal_label', 'İlk mührün')}</div>
              <div class="onb-seal-name">${fs.name}</div>
              <div class="onb-seal-why">${t('onb.synth.seal_why', 'En zayıf temelin ({label}) tam burada güçlenir.').replace('{label}', fs.foundationLabel)}</div>
            </div>
            <button type="button" class="onb-next" data-act="finish">${t('onb.synth.finish', 'Yola Çık')}</button>
          </div>`;
      }
      overlay.innerHTML = `<div class="onb-stage">${html}</div>`;
    }

    function recordOpt(dKey, qi, oi) {
      const d = DOMAINS.find(x => x.key === dKey);
      state.answers[dKey][qi] = d.questions[qi].opts[oi];
      // sadece etkilenen butonları güncelle (re-render seçim hissini bozmasın)
      const scene = overlay.querySelector('.onb-scene-domain');
      if (scene) {
        scene.querySelectorAll(`.onb-opt[data-qi="${qi}"]`).forEach(b => {
          b.classList.toggle('onb-opt-sel', Number(b.dataset.oi) === oi);
        });
        const answered = state.answers[dKey].every(a => a !== null);
        const nextBtn = scene.querySelector('.onb-next');
        if (nextBtn) {
          nextBtn.classList.toggle('onb-disabled', !answered);
          nextBtn.disabled = !answered;
        }
      }
    }

    overlay.addEventListener('input', (e) => {
      const ta = e.target.closest('[data-act="goal"]');
      if (ta) state.goals[ta.dataset.d] = ta.value;
    });

    overlay.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]');
      if (!el) return;
      const act = el.dataset.act;

      if (act === 'skip') { close(null); return; }
      if (act === 'begin') { state.scene = 1; render(); return; }
      if (act === 'opt') {
        recordOpt(el.dataset.d, Number(el.dataset.qi), Number(el.dataset.oi));
        return;
      }
      if (act === 'next') {
        const dKey = DOMAINS[state.scene - 1].key;
        if (!state.answers[dKey].every(a => a !== null)) return;
        state.scene += 1;
        if (state.scene === totalDomains + 1) result = computeResult(state);
        render();
        return;
      }
      if (act === 'toSynth') { state.scene = totalDomains + 2; render(); return; }
      if (act === 'finish') {
        persistResult(result);
        close(result);
        return;
      }
    });

    render();
    requestAnimationFrame(() => overlay.classList.add('onb-open'));
  });
}

/* window köprüsü — Dönüşüm Aynası (13t) bu modülü İMPORT ETMEZ: 02b bir
   tören modülüdür (DOM + arketip zinciri), aynanın ihtiyacı iki sayı satırı. */
if (typeof window !== 'undefined') {
  window.onbT0Oku = onbT0Oku;
  window.onbTemelKiyas = onbTemelKiyas;
}
