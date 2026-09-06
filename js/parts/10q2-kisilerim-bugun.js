/* ═══════════════════════════════════════════════════════
   10q2 — KİŞİLERİM · Bugün'ün İki Destesi
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Asıl olarak iki kart vardır: OLDUĞUN KİŞİ ve OLMAK İSTEDİĞİN KİŞİ.
     Diğer her şey bu ikisini besler. Üç Mühür'deki (10f) iki kart o
     beslemenin SENTEZİDİR — olunan herkesin toplamı ve olunmak istenen
     herkesin özeti. Tek tek kişiler burada, iki destede yaşar:
       ALTIN = olduğun kişiler   (kazanılan Kişi Kartları)
       LAPİS = olmak istediklerin (hedef mührü vurulanlar, 10q 8b)
     Kitabın tezi mekanikte: sen değiştikçe deste büyür, sentez yeniden
     yazılır. "Mesele Sensin."

   MEKANİK / MİMARİ / TEK GİRİŞ (2026-08-18'de DEĞİŞTİ):
     Bu modül artık Bugün'de bir bölüm ÇİZMEZ. `#kk-bugun` kalktı; kişilerin
     Bugün'deki yüzü iki ana kartın ARKASINDAKİ yığındır (10f) ve tam ekran
     odası Karşılaşma'dır (13B). Buradan geriye iki şey kaldı ve ikisi de
     tek kaynak olduğu için yaşıyor:
       • DESTE VERİSİ  — kkDesteAltin/kkDesteLapis (13B ve 10f tüketir)
       • DESTE YÜZEYİ  — kkDeckHTML/kkDeckBind/kkDeckLen (Geçiş masası, 10A)
     Aşağıdaki yelpaze tarifi o yüzeyin tarifidir. Kartlar 12c'nin TEK kart
     motorundan (ikvCardFace) gelir — paralel kart stili yoktur. Deste
     "yelpaze": en fazla MAX_FACES yüz fiziksel olarak çizilir, gerisi
     sayaçta temsil edilir (100+ kartta GPU'yu yormaz). Gezinme üç yoldan:
     sürükleme · ‹ › mühür düğmeleri · ← → klavye.

   KÖPRÜ — 2026-07-26'da kuruldu, 2026-08-18'de TAŞINDI:
     İki destenin arasındaki "açık yol" ışığı Bugün'ün bölümüyle birlikte
     kalktı. Yürünen yol artık Karşılaşma'nın ORTA SAYFASIDIR: bir ışık
     değil, tam ekran bir kart. Geçiş kutuplarının deste üyeliği (`_gkEntry`)
     korundu — masa ve oda ikisi de onu okur.

   Kalıcılık: yok — deste S._kisiKarti + S._gecisKartlari'den türer.
   Konvansiyon: i18n t(); window.kk* expose; stiller css/parts/kisilerim.css
═══════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { escapeHTML } from './00a-infrastructure.js';
import { getCardById } from './12b-kart-destesi.js';
import { ikvCardFace, ikvCardBack } from './12c-kart-gorsel.js';
import { t } from './15-i18n.js';

/* ─── 1. SABİTLER ─── */
const MAX_FACES = 6;        // yığında fiziksel olarak çizilen en fazla yüz
const DRAG_MIN  = 34;       // kartı çevirmeye yeten en küçük sürükleme (px)
const KINDS = ['altin', 'lapis'];

/** Her destenin öndeki kart imleci — bellek-içi (oturumluk, persist edilmez).
 *  Gezinirken yerini korur; ama deste DEĞİŞİRSE (yeni kişi kazanıldı, yeni
 *  hedef mühürlendi, biri mezun oldu) başa döner — haber olan kart öndedir. */
const _idx = { altin: 0, lapis: 0 };
const _lastLen = { altin: -1, lapis: -1 };

/* Tek kaynak: escapeHTML (00a). Eskiden bu modülün kendi ikizi vardı;
   ikizler birbirinden de farklıydı (bir kısmı tek tırnağı kaçırmıyordu). */
const esc = escapeHTML;

/* ─── 2. DESTE KAYNAKLARI ─── */

/** Geçiş kartının bir kutbu, deste elemanı kılığında. Katalog kartından
 *  tek farkı `_gk` izidir — yüzü 10A çizer, detayı 10A açar. */
function _gkEntry(k, which, mezun) {
  const pole = (k && k[which]) || {};
  return {
    id: 'gk_' + k.id + '_' + which,
    name: pole.baslik || '',
    _gk: { kartId: k.id, which, mezun: !!mezun },
  };
}

/** ALTIN deste — olduğun kişiler. Sıra bir hikâyedir: önce yürünen geçişin
 *  "şu anlık olduğum bu" beyanı (en taze), sonra mezun olmuş geçişler
 *  ("artık o kişisin"), sonra kazanılan Kişi Kartları — şu anki kimlik (13l)
 *  onların başında. */
export function kkDesteAltin() {
  const out = [];
  try {
    (window.gkActiveCards?.() || []).forEach(k => out.push(_gkEntry(k, 'golden')));
  } catch (_) {}
  try {
    (window.gkCompletedCards?.() || [])
      .slice()
      .sort((a, b) => new Date(b?.sealed_at || 0) - new Date(a?.sealed_at || 0))
      .forEach(k => out.push(_gkEntry(k, 'lapis', true)));
  } catch (_) {}

  const coll = (S._kisiKarti && S._kisiKarti.collection) || {};
  const ids = Object.keys(coll).sort(
    (a, b) => new Date(coll[b]?.earnedAt || 0) - new Date(coll[a]?.earnedAt || 0)
  );
  let curId = null;
  try { curId = window.imGetCurrent?.()?.cardId || null; } catch (_) {}
  const at = curId ? ids.indexOf(curId) : -1;
  if (at > 0) { ids.splice(at, 1); ids.unshift(curId); }
  return out.concat(ids.map(id => getCardById(id)).filter(Boolean));
}

/** LAPİS deste — olmak istediklerin. Önce yürünen geçişin lapis kutbu
 *  (köprünün öteki ucu), sonra hedef mührü vurulan kartlar (en yeni önde);
 *  kazanılmış olanlar 10q'da zaten elenir. */
export function kkDesteLapis() {
  const out = [];
  try {
    (window.gkActiveCards?.() || []).forEach(k => out.push(_gkEntry(k, 'lapis')));
  } catch (_) {}
  let ids = [];
  try { ids = window.kkGetHedefler?.() || []; } catch (_) {}
  return out.concat(ids.map(id => getCardById(id)).filter(Boolean));
}

const _deste = kind => (kind === 'altin' ? kkDesteAltin() : kkDesteLapis());

/* ─── 3. YÜZEY ─── */

function _tag(kind) {
  return kind === 'altin'
    ? t('kkb.tag.altin', 'OLDUKLARIN')
    : t('kkb.tag.lapis', 'OLMAK İSTEDİKLERİN');
}

/** Boş deste — koleksiyonun ortak sırtı + davet (kart uydurmayız). */
function _emptyHTML(kind) {
  let back = '';
  try { back = ikvCardBack(); } catch (_) {}
  const goto = kind === 'altin' ? 'kisilerim' : 'arketipler';
  const line = kind === 'altin'
    ? t('kkb.empty.altin', 'Henüz kimse yok. İlk kişi, o kişi olduğunu söylediğinde gelir.')
    : t('kkb.empty.lapis', 'Kimi hedeflediğini seç — Kişiler\'de biri seni bekliyor.');
  const cta = kind === 'altin'
    ? t('kkb.empty.cta_altin', 'KİŞİLERİ GÖR')
    : t('kkb.empty.cta_lapis', 'BİRİNİ SEÇ');
  return `
    <div class="kkb-deste kkb-deste--${kind} kkb-deste--bos">
      <div class="kkb-tag">${_tag(kind)}</div>
      <div class="kkb-stack kkb-stack--bos">
        <div class="kkb-card kkb-card--back" style="--d:0">${back}</div>
      </div>
      <div class="kkb-empty-line">${line}</div>
      <button type="button" class="kkb-all" data-kkb-goto="${goto}">${cta} →</button>
    </div>`;
}

/** Tek yüz. Ön kart parlak ve tıklanır; arkadakiler yalnız derinlik.
 *  Geçiş kutbunun yüzünü 10A çizer (sahnesi kalıcı, kicker'ı kendine ait);
 *  katalog kartını 12c. İkisi de aynı motor — ayrı kart stili yok. */
function _faceHTML(card, kind, d, isFront) {
  const pal = kind === 'altin' ? 'gold' : 'lapis';
  const gk  = card._gk || null;
  let face = '';
  try {
    face = gk
      ? (window.gkPoleFace?.(gk.kartId, gk.which, { mezun: gk.mezun }) || '')
      : ikvCardFace(card, { palette: pal, mini: true, star: kind === 'lapis', sub: '' });
  } catch (_) { face = ''; }
  const crown = (isFront && kind === 'altin' && !gk && _isCurrent(card.id))
    ? `<span class="kkb-crown">${t('kkb.crown', '✦ ŞU AN BU KİŞİSİN')}</span>` : '';
  // EŞİKTE nişanı — hedeflediğin kişinin reçetesi tuttuysa lapis yüzde belirir;
  // mühürlenen kart eşikten düştüğü için altın destede hiç görünmez. Nişanın
  // TEK kaynağı 10q'dur (K9: Bugün'e yeni şerit eklenmez).
  let esik = '';
  if (isFront && kind === 'lapis' && !gk) {
    try { esik = window.kkEsikNisanHTML?.(card.id) || ''; } catch (_) { esik = ''; }
  }
  const esikHTML = esik ? `<span class="kkb-esik">${esik}</span>` : '';
  const open = gk
    ? `data-kkb-gkopen="${esc(gk.kartId)}" data-kkb-pal="${gk.which === 'golden' ? 'gold' : 'lapis'}"`
    : `data-kkb-open="${esc(card.id)}"`;
  // Arkadaki yüzler ekran okuyucudan gizli — okunan tek kart öndeki.
  return `<div class="kkb-card${isFront ? ' is-front' : ''}" style="--d:${d}"
               ${isFront ? `${open} role="button" tabindex="0"
               aria-label="${esc(card.name || '')}"` : 'aria-hidden="true"'}>
            ${face}${crown}${esikHTML}
          </div>`;
}

function _isCurrent(cardId) {
  try { return !!window.imIsCurrentPersona?.(cardId); } catch (_) { return false; }
}

function _deckHTML(kind, opts = {}) {
  const cards = _deste(kind);
  const total = cards.length;
  // Dış imleç (masa — 10A): kendi seçimini kendi tutar. İmleçsiz çağrıda
  // modül-içi imleç devreye girer (deste değişince başa döner).
  const dis = opts.idx != null;
  if (!dis && total !== _lastLen[kind]) { _lastLen[kind] = total; _idx[kind] = 0; }
  if (!total) return _emptyHTML(kind);   // boş destede davet kalır (dar modda da)

  let start = dis ? (opts.idx | 0) : _idx[kind];
  if (start > total - 1) start = total - 1;
  if (start < 0) start = 0;
  if (!dis) _idx[kind] = start;
  const shown = cards.slice(start, start + MAX_FACES);
  // Derinlik sırası ters çizilir: en arkadaki yüz önce, ÖN kart en sona.
  // Yığılma zaten z-index'ten geliyor; bunun asıl işi ön kartın DOM'da son
  // (ve tek odaklanabilir) öğe olması — sekme sırası kartın kendisine düşer.
  const faces = shown.map((c, d) => _faceHTML(c, kind, d, d === 0)).reverse().join('');
  const goto = kind === 'altin' ? 'kisilerim' : 'oik';
  const rest = total - start - shown.length;

  return `
    <div class="kkb-deste kkb-deste--${kind}">
      <div class="kkb-tag">${_tag(kind)}</div>
      <div class="kkb-stack" data-kkb-stack="${kind}" tabindex="0" role="group"
           aria-label="${esc(_tag(kind))}" aria-roledescription="${esc(t('kkb.aria.deck', 'kart destesi'))}">
        ${faces}
        ${rest > 0 ? `<span class="kkb-rest" aria-hidden="true">+${rest}</span>` : ''}
      </div>
      <div class="kkb-nav">
        <button type="button" class="kkb-arrow" data-kkb-kaydir="${kind}:-1"
                aria-label="${esc(t('kkb.aria.prev', 'Önceki kişi'))}" ${start === 0 ? 'disabled' : ''}>‹</button>
        <span class="kkb-count"><b>${start + 1}</b> / ${total}</span>
        <button type="button" class="kkb-arrow" data-kkb-kaydir="${kind}:1"
                aria-label="${esc(t('kkb.aria.next', 'Sonraki kişi'))}" ${start >= total - 1 ? 'disabled' : ''}>›</button>
      </div>
      ${opts.dar ? '' : `<button type="button" class="kkb-all" data-kkb-goto="${goto}">${t('kkb.see_all', 'HEPSİNİ GÖR')} →</button>`}
    </div>`;
}

/* ─── 4. TEK GİRİŞ — bölümü çiz ─── */
/* NOT: haftanın gündemi (DÖNEM KARTI, K7) burada DURMAZ — Kişiler ekranındaki
   "Emre'nin Önerisi" bloğuna yedirildi (10q `_donemSerit`). Bugün bir
   vitrindir; gündem "şimdi neye bakmalısın" sorusunun haftalık cevabıdır ve o
   soruyu zaten öneri bloğu soruyor. Verisi yine 10q'nun `kkDonemErdem`'i. */

function _bind(root, opts = {}) {
  // Masa (10A) aynı yüzeyi kullanır ama başka bir kaba çizer: kaydırma ve
  // kart seçimi opts üzerinden dışarı çıkar. opts boşsa Bugün'ün yolu.
  // Kaydırma daima tüketicinin işidir: Bugün'ün kendi imleci 2026-08-18'de
  // bölümle birlikte kalktı, masa (10A) kendi imlecini `onKaydir` ile sürer.
  const kaydir = (kind, yon) => { if (opts.onKaydir) opts.onKaydir(kind, yon); };
  root.querySelectorAll('[data-kkb-kaydir]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const [kind, yon] = btn.dataset.kkbKaydir.split(':');
      kaydir(kind, Number(yon));
    });
  });

  root.querySelectorAll('[data-kkb-open]').forEach(el => {
    const open = () => {
      if (opts.onSelect) { opts.onSelect({ tip: 'kart', id: el.dataset.kkbOpen }); return; }
      try { window.kkOpenDetail?.(el.dataset.kkbOpen); } catch (_) {}
    };
    el.addEventListener('click', open);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });

  // Geçiş kutbu — detayı 10A açar (o kutbun salt-okunur iki-kutup sahnesi)
  root.querySelectorAll('[data-kkb-gkopen]').forEach(el => {
    const open = () => {
      const kartId = el.dataset.kkbGkopen, pal = el.dataset.kkbPal || 'gold';
      if (opts.onSelect) { opts.onSelect({ tip: 'gk', kartId, pal }); return; }
      try { window.gkOpenDetail?.(pal, kartId); } catch (_) {}
    };
    el.addEventListener('click', open);
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });

  root.querySelectorAll('[data-kkb-goto]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      try { window.switchView?.(btn.dataset.kkbGoto); } catch (_) {}
    });
  });

  root.querySelectorAll('[data-kkb-stack]').forEach(stack => {
    const kind = stack.dataset.kkbStack;

    // Klavye — destede gezinme okla
    stack.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); kaydir(kind, -1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); kaydir(kind, 1); }
    });

    // Sürükleme — yatay eşiği aşınca kart devrilir. Dikey hareket sayfanın
    // kaydırmasıdır; ona hiç dokunmayız (passive dinleyici, preventDefault yok).
    let x0 = null, y0 = null, fired = false;
    stack.addEventListener('pointerdown', e => { x0 = e.clientX; y0 = e.clientY; fired = false; }, { passive: true });
    stack.addEventListener('pointermove', e => {
      if (x0 === null || fired) return;
      const dx = e.clientX - x0, dy = e.clientY - y0;
      if (Math.abs(dy) > Math.abs(dx)) { x0 = null; return; }   // dikey → sayfa kaydırması
      if (Math.abs(dx) < DRAG_MIN) return;
      fired = true;
      kaydir(kind, dx < 0 ? 1 : -1);                            // sola çek → sonraki
    }, { passive: true });
    const end = () => { x0 = null; y0 = null; };
    stack.addEventListener('pointerup', end, { passive: true });
    stack.addEventListener('pointercancel', end, { passive: true });
  });
}

/* ─── 5. DESTE YÜZEYİ — dışarıya açık tek kaynak ───
   Kişilerim'in destesi Bugün'e ait bir süs değil, tek bir çizim motorudur;
   Geçiş Ekranı'nın masası (10A) da onu tüketir. İkinci deste yazılmaz (§1.3).
   Bağ `window.*` üzerinden kurulur — 10A ↔ 10q2 statik kenarı rollup sırasını
   kaydırıp TDZ açar (10q'nun kalıbı). */

/** Destenin yüzeyi. opts.idx: dış imleç (verilmezse Bugün'ün imleci),
 *  opts.dar: "HEPSİNİ GÖR" çizilmez (masa zaten destenin içindedir). */
export function kkDeckHTML(kind, opts = {}) {
  if (!KINDS.includes(kind)) return '';
  return _deckHTML(kind, opts);
}

/** Destenin bağlaması. opts.onSelect({tip:'gk'|'kart', …}) ve
 *  opts.onKaydir(kind, yon) verilirse tıklama/kaydırma dışarı çıkar. */
export function kkDeckBind(root, opts = {}) {
  if (root) _bind(root, opts);
}

/** Bir destenin uzunluğu — dış imleci kırpmak isteyen tüketici için. */
export function kkDeckLen(kind) {
  return KINDS.includes(kind) ? _deste(kind).length : 0;
}

/* ─── 6. TDZ-güvenli global erişim ─── */
if (typeof window !== 'undefined') {
  window.kkDesteAltin   = kkDesteAltin;
  window.kkDesteLapis   = kkDesteLapis;
  window.kkDeckHTML     = kkDeckHTML;
  window.kkDeckBind     = kkDeckBind;
  window.kkDeckLen      = kkDeckLen;
}
