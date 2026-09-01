/* ═══════════════════════════════════════════════════════
   10q3 — BENLİK YAPISI · Koleksiyonun merkezi mercek
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Illuminati: New World Order'da her kart bir merkeze —oyuncunun
     Illuminati'sine— kontrol oklarıyla bağlanır; kartlar tek tek değil
     YAPI olarak anlam kazanır. Aynı fikri devralıyoruz, tek bir farkla:
     merkezde bir örgüt değil SEN varsın. "Mesele Sensin."
     Ve ok kontrol etmez, BESLER — kazandığın her kişi altın merkeze
     (Portre · olduğun), hedef mührü vurduğun her kişi lapis merkeze
     (Olmak İstediğin) akar. Koleksiyon albüm olmaktan çıkar, bir
     benlik yapısına dönüşür.
   MEKANİK / MİMARİ / TEK GİRİŞ:
     byRender(host) → iki kutuplu dikey ağaç: altın bölge (Portre +
     besleyen kartlar), eriyen hat, lapis bölge (OİK + hedef kartları).
     Besleme izleri KENDİ defterinden değil kaynağından okunur:
     porCardRefs() (02c) ve oikCardRefs() (10D). Oklar render sonrası
     gerçek konumlardan SVG'ye çizilir (ResizeObserver ile tazelenir).
   Kalıcılık: Kalıcılık yok — yapı her açılışta kaynak defterlerden türetilir.
   Konvansiyon: i18n t(); window.by* expose; stiller JS-enjekte (byEnsureStyles)
═══════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { getCardById, getFullDeck } from './12b-kart-destesi.js';
import { ikvCardFace, ikvRing, ikvLantern } from './12c-kart-gorsel.js';
import { porCardRefs, porCardName } from './02c-portre.js';
import { oikCardRefs, oikGetDesired } from './10D-olmak-istedigin.js';
import { t } from './15-i18n.js';

/* ─── 1. SABİTLER ─── */
// Bir kolda en fazla kaç kart çizilir — kalanı "+N" düğümünde toplanır.
// 100+ kartlık koleksiyonda her düğümü çizmek hem GPU'yu hem gözü yorar
// (10q2 yelpazesinin dersi).
const BY_MAX_NODE = 6;

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ─── 2. VERİ — besleme izleri kaynağından okunur ─── */
/** Atölye kutbu izi mi? (Katalog filtresi bunları elemesin.) */
const _isGkRef = id => /^gk_.+_(golden|lapis)$/.test(String(id || ''));

/** Bir koldaki kartlar: en YENİ kazanım/mühür önce (haber olan kart önde). */
function _nodes(ids, order) {
  const out = [];
  for (const id of (ids || [])) {
    // Atölye kutbu katalogda YOKTUR (`gk_<id>_<which>`) — 10A çözer.
    // Bu sıra olmadan Bugün input'undan doğan kartlar yapıda görünmezdi.
    let card = null;
    try { card = window.gkRefResolve?.(id) || null; } catch (_) {}
    if (!card) card = getCardById(id);
    if (card) out.push(card);
  }
  // Kazanım tarihi varsa ona göre (yeni önce); yoksa kaynak sırası korunur.
  if (order) out.sort((a, b) => String(order[b.id] || '').localeCompare(String(order[a.id] || '')));
  return out;
}

export function byGetYapi() {
  const kk = S._kisiKarti || {};
  const coll = kk.collection || {};
  let altinIds = [], lapisIds = [];
  try { altinIds = porCardRefs(); } catch (_) {}
  try { lapisIds = oikCardRefs(); } catch (_) {}

  // Portre henüz onaylanmadıysa (absorb kuyrukta bekler) altın kol boş kalır —
  // o durumda koleksiyonun kendisi yapının altın tarafıdır: kart kazandın,
  // portreye işlenmesi gecikti; yapı bunu yansıtmalı.
  if (!altinIds.length) altinIds = Object.keys(coll);

  // Hedef mühürleri: OİK izleri + henüz absorbe edilmemiş mühürler (kuyruk).
  const hedefler = kk.hedefler || {};
  const lapisSet = new Set(lapisIds);
  for (const id of Object.keys(hedefler)) lapisSet.add(id);

  const earnedAt = {};
  for (const [id, c] of Object.entries(coll)) earnedAt[id] = c && c.earnedAt;
  const sealedAt = {};
  for (const [id, h] of Object.entries(hedefler)) sealedAt[id] = h && h.at;

  // MEZUNİYET: hedeflenen kart kazanıldıysa lapis koldan düşer, altın kolda
  // görünür. `hedefler` zaten kkTick'te temizleniyor ama OİK'e işlenmiş
  // maddelerin `ref` izi KALIR (bilinçli — o kişiyi hedeflerken yazdıkların
  // artık senin parçan). Yapı o izi hedef sanmasın diye burada süzülür.
  return {
    altin: _nodes(altinIds.filter(id => coll[id] || _isGkRef(id)), earnedAt),
    lapis: _nodes([...lapisSet].filter(id => !coll[id]), sealedAt),
  };
}

/* ─── 3. RENDER ─── */
// Koleksiyonun tamamlanma oranı — altın kutbun halkası bunu taşır.
function _collectionPct() {
  try {
    const n = Object.keys((S._kisiKarti || {}).collection || {}).length;
    const total = getFullDeck().length;
    return total ? Math.round((n / total) * 100) : 0;
  } catch (_) { return 0; }
}

function _nodeHTML(card, kind, i) {
  const pal = kind === 'lapis' ? 'lapis' : 'gold';
  return `<button class="by-node" data-by-open="${esc(card.id)}" style="--i:${Math.min(i, 12)}"
    aria-label="${esc(card.name || '')}">
    ${ikvCardFace(card, { palette: pal, mini: true, sub: '', star: kind === 'lapis' })}
  </button>`;
}

function _moreHTML(n, kind) {
  return `<button class="by-node by-node--more by-node--${kind}" data-by-more="${kind}">
    <span class="by-more-n">+${n}</span>
    <span class="by-more-l">${t('by.more', 'daha')}</span>
  </button>`;
}

// Halka YALNIZ gerçek bir ilerleme varsa çizilir (Tasarım Prensipleri §7:
// ilerleme daima halka dilinde — ama boş halka ilerleme YALANIdır).
// Altın kutup: koleksiyonun tamamlanma oranı. Lapis kutup: hedef bir ilerleme
// değil bir YÖNELİMdir — orada halka yok, sade glif çemberi var.
function _poleHTML(kind, title, sub, count, glyphHTML, pct) {
  const cls = kind === 'lapis' ? 'by-pole--lapis' : 'by-pole--gold';
  const center = `<span class="by-pole-glyph">${glyphHTML}</span>`;
  const ring = (typeof pct === 'number')
    ? ikvRing(pct, { size: 74, center })
    : `<div class="by-pole-disc">${center}</div>`;
  return `<div class="by-pole ${cls}">
    <div class="by-pole-ring">${ring}</div>
    <div class="by-pole-text">
      <div class="by-pole-kicker">${esc(title)}</div>
      <div class="by-pole-name">${esc(sub)}</div>
      <div class="by-pole-count">${count}</div>
    </div>
  </div>`;
}

export function byRender(host) {
  if (!host) return;
  byEnsureStyles();
  const { altin, lapis } = byGetYapi();

  const altinShown = altin.slice(0, BY_MAX_NODE);
  const lapisShown = lapis.slice(0, BY_MAX_NODE);
  const altinRest = altin.length - altinShown.length;
  const lapisRest = lapis.length - lapisShown.length;

  let portreAd = '';
  try { portreAd = porCardName(); } catch (_) {}
  let hedefAd = '';
  try { hedefAd = (oikGetDesired() || {}).name || ''; } catch (_) {}

  const altinBos = !altin.length;
  const lapisBos = !lapis.length;

  host.innerHTML = `
    <div class="by-wrap" id="by-wrap">
      <svg class="by-links" id="by-links" aria-hidden="true"></svg>

      <div class="by-zone by-zone--gold">
        ${_poleHTML('gold', t('by.pole.gold', 'OLDUĞUN'), portreAd || t('by.pole.gold_empty', 'Portren'),
          altinBos ? '' : t('by.count.gold', '{n} kişi senden geçti').replace('{n}', altin.length),
          ikvLantern(30), _collectionPct())}
        <div class="by-row" id="by-row-gold">
          ${altinBos
            ? `<div class="by-empty">${t('by.empty.gold', 'Henüz kimse yok. İlk kişiyi kazandığında burada belirir.')}</div>`
            : altinShown.map((c, i) => _nodeHTML(c, 'gold', i)).join('') + (altinRest > 0 ? _moreHTML(altinRest, 'gold') : '')}
        </div>
      </div>

      <div class="by-seam" aria-hidden="true"><span class="by-seam-line"></span></div>

      <div class="by-zone by-zone--lapis">
        <div class="by-row" id="by-row-lapis">
          ${lapisBos
            ? `<div class="by-empty">${t('by.empty.lapis', 'Hedef mührü vurduğun kişiler buraya akar.')}</div>`
            : lapisShown.map((c, i) => _nodeHTML(c, 'lapis', i)).join('') + (lapisRest > 0 ? _moreHTML(lapisRest, 'lapis') : '')}
        </div>
        ${_poleHTML('lapis', t('by.pole.lapis', 'OLMAK İSTEDİĞİN'), hedefAd || t('by.pole.lapis_empty', 'Henüz çizilmedi'),
          lapisBos ? '' : t('by.count.lapis', '{n} kişi hedefinde').replace('{n}', lapis.length),
          '◇')}
      </div>
    </div>`;

  // Kart detayına köprü (10q'nun tek detay töreni — ikiz ekran açılmaz)
  host.querySelectorAll('[data-by-open]').forEach(b =>
    b.addEventListener('click', () => {
      const id = b.dataset.byOpen;
      try {
        // Atölye kutbu 10A'nın kendi detay töreninde açılır; katalog kartı 10q'da
        const gk = window.gkRefResolve?.(id);
        if (gk?._gk) window.gkOpenDetail?.(gk._gk.which === 'lapis' ? 'lapis' : 'gold', gk._gk.kartId);
        else window.kkOpenDetail?.(id);
      } catch (_) {}
    }));
  // "+N" → o kolun tam listesi zaten ızgara mercekinde; oraya götür
  host.querySelectorAll('[data-by-more]').forEach(b =>
    b.addEventListener('click', () => {
      try {
        if (b.dataset.byMore === 'lapis') window.switchView?.('arketipler');
        else window.byShowGrid?.();
      } catch (_) {}
    }));

  _drawLinks(host);
  _observe(host);
}

/* ─── 4. BESLEME OKLARI — gerçek konumlardan çizilir ─── */
// Oklar kartlardan KUTBA doğru akar: yön anlamın kendisidir (besleme, kontrol
// değil). Konumlar layout sonrası ölçülür; CSS ile sahte çizgi çizilmez.
function _drawLinks(host) {
  const wrap = host.querySelector('#by-wrap');
  const svg = host.querySelector('#by-links');
  if (!wrap || !svg) return;
  const W = wrap.getBoundingClientRect();
  if (!W.width || !W.height) return;
  svg.setAttribute('viewBox', `0 0 ${Math.round(W.width)} ${Math.round(W.height)}`);
  svg.setAttribute('width', Math.round(W.width));
  svg.setAttribute('height', Math.round(W.height));

  let paths = '';
  for (const kind of ['gold', 'lapis']) {
    const zone = wrap.querySelector(`.by-zone--${kind}`);
    const pole = zone && zone.querySelector('.by-pole-ring');
    const row = wrap.querySelector(`#by-row-${kind}`);
    if (!pole || !row) continue;
    const P = pole.getBoundingClientRect();
    const px = P.left - W.left + P.width / 2;
    const py = P.top - W.top + P.height / 2;
    const color = kind === 'lapis' ? 'rgba(90,138,216,0.5)' : 'rgba(245,166,35,0.5)';
    row.querySelectorAll('.by-node').forEach((n, i) => {
      const R = n.getBoundingClientRect();
      const nx = R.left - W.left + R.width / 2;
      const ny = R.top - W.top + (kind === 'lapis' ? R.height : 0);
      const my = (py + ny) / 2;
      paths += `<path d="M${nx.toFixed(1)} ${ny.toFixed(1)} C${nx.toFixed(1)} ${my.toFixed(1)}, ${px.toFixed(1)} ${my.toFixed(1)}, ${px.toFixed(1)} ${py.toFixed(1)}"
        fill="none" stroke="${color}" stroke-width="1" style="--i:${Math.min(i, 12)}"/>`;
    });
  }
  svg.innerHTML = paths;
}

let _ro = null;
function _observe(host) {
  try {
    if (_ro) _ro.disconnect();
    if (typeof ResizeObserver === 'undefined') return;
    _ro = new ResizeObserver(() => _drawLinks(host));
    const wrap = host.querySelector('#by-wrap');
    if (wrap) _ro.observe(wrap);
  } catch (_) {}
}

/* ─── 5. STİLLER ─── */
export function byEnsureStyles() {
  if (typeof document === 'undefined' || document.getElementById('by-styles')) return;
  const css = `
  .by-wrap{position:relative;padding:8px 0 4px;}
  .by-links{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;overflow:visible;}
  .by-links path{stroke-dasharray:3 5;opacity:.85;
    animation:byFlow 1.1s var(--ease-out,ease) both;animation-delay:min(calc(var(--i,0)*60ms),.7s);}
  @keyframes byFlow{from{opacity:0;stroke-dashoffset:26}to{opacity:.85;stroke-dashoffset:0}}

  .by-zone{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:14px;}
  .by-zone--lapis{margin-top:6px;}
  .by-pole{display:flex;align-items:center;gap:12px;padding:10px 16px 10px 10px;border-radius:var(--radius-xl,24px);
    border:1px solid rgba(245,166,35,.28);background:linear-gradient(170deg,rgba(29,23,18,.9),rgba(18,14,9,.9));}
  .by-pole--lapis{border-color:rgba(90,138,216,.3);background:linear-gradient(170deg,rgba(20,26,43,.9),rgba(12,15,24,.9));}
  .by-pole-ring{flex:none;position:relative;}
  .by-pole-disc{width:74px;height:74px;border-radius:50%;display:flex;align-items:center;justify-content:center;
    border:1px solid rgba(90,138,216,.35);background:radial-gradient(circle at 50% 35%,rgba(45,95,168,.18),transparent 70%);}
  .by-pole-glyph{display:flex;align-items:center;justify-content:center;color:var(--gold,#F5A623);font-size:15px;}
  .by-pole--lapis .by-pole-glyph{color:var(--lapis-bright,#5A8AD8);}
  .by-pole-kicker{font-family:var(--cinzel,serif);font-size:8.5px;letter-spacing:2.6px;color:var(--gold,#F5A623);}
  .by-pole--lapis .by-pole-kicker{color:var(--lapis-bright,#5A8AD8);}
  .by-pole-name{font-family:var(--cinzel,serif);font-size:13px;letter-spacing:1.4px;color:var(--text,#EAE2D6);margin-top:3px;line-height:1.25;}
  .by-pole-count{font-family:var(--serif,Georgia);font-style:italic;font-size:11px;color:var(--text-mid,#95897A);margin-top:4px;}

  .by-row{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:center;gap:10px;width:100%;}
  .by-node{width:62px;flex:none;background:none;border:none;padding:0;cursor:pointer;
    animation:byRise .5s var(--ease-out,cubic-bezier(0.16,1,0.3,1)) both;animation-delay:min(calc(var(--i,0)*45ms),.6s);}
  .by-node:focus-visible{outline:2px solid var(--gold,#F5A623);outline-offset:3px;border-radius:4px;}
  @keyframes byRise{from{opacity:0;transform:translateY(10px) scale(.94)}to{opacity:1;transform:none}}
  .by-node--more{width:62px;aspect-ratio:5/7;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
    border:1px dashed rgba(245,166,35,.4);border-radius:4px;color:var(--gold,#F5A623);}
  .by-node--more.by-node--lapis{border-color:rgba(90,138,216,.4);color:var(--lapis-bright,#5A8AD8);}
  .by-more-n{font-family:var(--cinzel,serif);font-size:13px;font-weight:700;}
  .by-more-l{font-family:var(--serif,Georgia);font-style:italic;font-size:9px;color:var(--text-mid,#95897A);}

  .by-seam{display:flex;justify-content:center;padding:14px 0 10px;}
  .by-seam-line{width:1px;height:34px;background:linear-gradient(180deg,rgba(245,166,35,.5),rgba(90,138,216,.5));}
  .by-empty{font-family:var(--serif,Georgia);font-style:italic;font-size:12px;color:var(--text-mid,#95897A);
    text-align:center;max-width:34ch;line-height:1.5;padding:8px 0;}

  @media (prefers-reduced-motion: reduce){
    .by-links path,.by-node{animation:none!important;}
  }
  `;
  const style = document.createElement('style');
  style.id = 'by-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

/* ─── 6. WINDOW EXPOSE (TDZ-güvenli, minify-dayanıklı) ─── */
if (typeof window !== 'undefined') {
  window.byRender = byRender;
  window.byGetYapi = byGetYapi;
  window.byEnsureStyles = byEnsureStyles;
}
