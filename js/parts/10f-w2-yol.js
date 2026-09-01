/* ═══════════════════════════════════════════════════════════════════
   10f — YOL · "İki Kart Arasındaki Yol" (Üç Mühür'ün yeni yüzü)
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Üç Mühür bir sayaç değil, KİMLİK DÖVME eylemidir. Her gün, altın
     kart (OLDUĞUN KİŞİ) ile lapis kart (OLMAK İSTEDİĞİN KİŞİ) arasında
     dövülmesi gereken BİR halka vardır. Üç mühür = o halkayı döven üç
     vuruş:
       • SERİ  = GELDİN  (varlık — bugün buradaydın)
       • HAYAL = GÖRDÜN  (içsel çalışma — hedef kişiyi bugün canlı tuttun)
       • SÖZ   = YAPTIN  (davranış — o kişi gibi davranmaya söz verdin)
     3/3 → halka tamamlanır → "BUGÜN O KİŞİYDİN" (ultra). Eksik → halka
     yarım kalır ama yol durmaz. Çekirdek tez: "Mesele Sensin."

   YÜZEYLER:
     • BUGÜN hero (#yol-hero): mini altın kart ↔ bugünün halkası (3 vuruş
       yuvası) ↔ mini lapis kart + altından lapise SÜREKLİ akan bir yol
       çizgisi. Her kartın ALTINDA o kartı KİMLERİN kurduğu devreder
       (yolFeedNames): iki kutup da sentezdir, sentezin malzemesi görünmezse
       kart bir iddiadan ibaret kalır — şerit onu kanıta bağlar.
       Çizginin altındaki tek cümle kat edilen oranı SAYIYLA söyler; cümle
       Eşik Ekranı'yla PAYLAŞILIR (esik.path.label, 13x msAnaMesafe) —
       iki yüzey aynı sayıyı aynı kelimelerle söyler. Söylemediği şey
       "ne zaman"dır: çizgiye dokunulunca sabır kartı açılır (yolOpenSabir,
       boyun eğmiş Satürn + "en iyi Allah bilir" metni — bkz. manevi
       katman): "ne kadar" kulun ölçtüğü, "ne zaman" Allah'ın bildiğidir.
     • Yol ekranı (yolOpen): Üç Mühür Merkezi'nin halefi (Faz 2).

   VERİ: hiçbir yeni ledger yok — her şey mevcut motorlardan TÜRETİLİR
   (10u usSeriesState, 13l imGetCurrent, 10q closest, 02c portre).
   Konvansiyon: hardcoded TR; window.* üzerinden TDZ-güvenli erişim;
   stiller css/parts/yol.css (link ile).
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { getActivityDays, localDayKey, localISODate } from './00a-infrastructure.js';
import { ikvCardFace, ikvMilestoneScene, ikvEnsureStyles } from './12c-kart-gorsel.js';
import { getCardById } from './12b-kart-destesi.js';
import { t } from './15-i18n.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* Dile duyarlı locale (toLocaleX için) */
const _locale = () => (S._currentLang === 'tr' ? 'tr-TR' : 'en-US');

/* ── Üç vuruş — sıra ve kimlik (10u SERIES ile aynı id'ler); verb i18n ── */
const STRIKES = [
  { id: 'seri',  glyph: '✦' },
  { id: 'hayal', glyph: '◉' },
  { id: 'soz',   glyph: '◆' },
];
const _verb = (id) => t('yol.verb.' + id);

function _seriesState(id) {
  try { return window.usSeriesState?.(id) || null; } catch (_) { return null; }
}
function _strikes() {
  return STRIKES.map(sd => {
    const st = _seriesState(sd.id);
    return { ...sd, verb: _verb(sd.id), n: st ? st.n : 0, on: !!(st && st.activeToday) };
  });
}

/* ══════════════════════════════════════════════════════════════
   KUTUPLAR — 02d Eşik Ekranı'nın veri mantığı birebir (tek doğruluk)
══════════════════════════════════════════════════════════════ */

/** ALTIN kutup — olduğu kişilerin TOPLAMI. Portre > Kimlik Motoru > davet. */
function _goldPole() {
  // SENTEZ ÖNCE: bu kart "olunan herkesin toplamı"dır. Portre tam olarak
  // odur — 02c porAbsorbCard kazanılan HER kartı ona işler ve LLM portreyi
  // yeniden yazar. Kimlik Motoru'nun tek kartı artık Bugün'ün ALTIN
  // destesinin ön yüzüdür (10q2); burada toplam durur, tekil değil.
  const c = S._portre;
  if (c?.confirmed && c.baslik) {
    let name = c.baslik;
    try { name = window.porCardName?.() || c.baslik; } catch (_) {}
    return {
      card: { id: 'yol-portre', name, whisper: c.baslik, virtue: 'yansima', glyph: 'wanderer', category: 'cekirdek', yuz: true },
      sahne: c.sahne || undefined, empty: false,
    };
  }
  // Portre henüz onaylanmadıysa şu anki kimlik kartı vekâlet eder
  let cur = null;
  try { cur = window.imGetCurrent?.() || null; } catch (_) {}
  if (cur && cur.card) return { card: cur.card, empty: false };
  return { card: { id: 'yol-sen', name: t('yol.gold.name'), glyph: 'wanderer', category: 'cekirdek' }, empty: true };
}

/** LAPİS kutup — olmak istediklerinin ÖZETİ. OİK kartı (10D) > en yakın kart >
 *  kendi cümlesi > davet. (Bu sıra belgede zaten yazılıydı; kod 2026-07-25'te
 *  ona uyduruldu — önceden "en yakın kart" OİK kartını eziyordu.) */
function _lapisPole() {
  // SENTEZ ÖNCE (altın kutbun ikizi): bu kart "olunmak istenen herkesin
  // özeti"dir. OİK kartı tam olarak odur — kullanıcının kendi tasarladığı
  // hedef kimlik, hedef mührü vurulan her Kişi Kartı ona işlenir
  // (10D oikAbsorbCard). Tekil hedefler Bugün'ün LAPİS destesinde yaşar.
  let k = null;
  try { k = window.oikGetCard?.() || null; } catch (_) {}
  if (k && k.baslik) {
    // Ad kullanıcınındır ("Niyet Alınan [Ad]"), LLM'in başlığı epitete iner —
    // altın kutbun porCardName/whisper deseniyle birebir simetri.
    let name = k.baslik;
    try { name = window.oikCardName?.() || k.baslik; } catch (_) {}
    return {
      card: { id: 'yol-oik', name, whisper: k.baslik || k.whisper || '', virtue: 'odak', glyph: 'wanderer', category: 'cekirdek', yuz: true },
      sahne: k.sahne || undefined, empty: false,
    };
  }
  // OİK kartı yoksa: en yakın kart, sonra legacy desired aynası, sonra davet
  const desired = (window.oikGetDesired?.()?.description || S._personTransition?.desired?.description || '').trim();
  const closest = S._kisiKarti?.closest;
  let card = null;
  if (closest?.cardId) { try { card = getCardById(closest.cardId); } catch (_) {} }
  if (card) return { card, empty: false };
  if (desired) {
    return { card: { id: 'yol-desired', name: t('yol.lapis.chosen'), glyph: 'wanderer', category: 'cekirdek' }, empty: false };
  }
  return { card: { id: 'yol-hedef', name: t('yol.lapis.name'), glyph: 'wanderer', category: 'cekirdek' }, empty: true };
}

/** ALTIN kutbun HAM hâli — kart nesnesi ve sahnesi, çizilmiş yüzü değil.
 *  Dışa açık çünkü Oluş Sınaması (10q4) "hangi kişiden hangi kişiye" sorusunu
 *  AYNI sırayla sormak zorunda: Portre > Kimlik Motoru. Üçüncü bir kopya
 *  yazılsaydı sıra bir gün değiştiğinde iki yüzey iki farklı "şu an olduğun
 *  kişi" gösterirdi — 02d ile buradaki ikizlik zaten o riskin kanıtı. */
export function yolGoldPole() { return _goldPole(); }

/** Lapis kutbun ham hâli — altının ikizi. Karşılaşma (13B) iki kutbu da TAM
 *  boyda çizer, o yüzden yüzü değil MALZEMEYİ ister; `yolPoles` mini yüz
 *  döndürür ve orada kullanılamaz. Fallback zinciri tek yerde kalsın diye
 *  kutup çözücüleri dışarı böyle açılır (ikiz motor yasağı). */
export function yolLapisPole() { return _lapisPole(); }

/** İki kutbun kart yüzleri — ultra anı + dış tüketiciler için (tek kaynak). */
export function yolPoles() {
  const g = _goldPole(), l = _lapisPole();
  return {
    goldFace: ikvCardFace(g.card, { palette: 'gold', mini: true, fog: g.empty, sub: '', sahne: g.sahne }),
    lapisFace: ikvCardFace(l.card, { palette: 'lapis', mini: true, fog: l.empty, star: true, sub: '', sahne: l.sahne }),
    goldName: g.card.name, lapisName: l.card.name,
  };
}

/* ══════════════════════════════════════════════════════════════
   KUTBU KURAN KARTLAR — her kartın altında devreden şerit
   ───────────────────────────────────────────────────────────────
   İki kutup da SENTEZDİR: altın kart kazanılan herkesin toplamı, lapis
   kart hedef mührü vurulan herkesin özeti. Sentezin malzemesi görünmezse
   kullanıcı kendi kartına dışarıdan bakar; şerit o malzemeyi adıyla
   geri verir — "bu kart şunlardan oldu".

   Defter TUTULMAZ: izler kaynağından okunur. 10q3'ün byGetYapi'si
   porCardRefs (02c) + oikCardRefs (10D) + bekleyen hedef mühürlerini
   zaten birleştirir ve mezun olan kartı lapis koldan düşürür (kazanılan
   kart artık hedef değildir). İkinci bir türetme yazmak iki ekranın
   farklı kart listesi göstermesi demekti.
══════════════════════════════════════════════════════════════ */
const FEED_MAX = 6;      // şeritte devreden en yeni kart sayısı (10q3 BY_MAX_NODE ölçüsü)
const FEED_MS  = 4000;   // bir ad ne kadar durur

let _feedTimer = null;
let _feedIdx = 0;

/** { gold: [ad…], lapis: [ad…] } — Benlik Yapısı'nın okuduğu izlerin AYNISI.
 *  byGetYapi en yeni kazanımı/mührü öne alır; şerit o sırayı korur, yani
 *  önce en son olduğun kişi konuşur. */
export function yolFeedNames() {
  let y = null;
  try { y = window.byGetYapi?.() || null; } catch (_) {}
  const pick = (arr) => (Array.isArray(arr) ? arr : [])
    .map(c => (c && c.name ? String(c.name) : '')).filter(Boolean).slice(0, FEED_MAX);
  return { gold: pick(y && y.altin), lapis: pick(y && y.lapis) };
}

function _feedStop() {
  if (_feedTimer) { clearInterval(_feedTimer); _feedTimer = null; }
}

/** Şeridi döndür. Hero her tazelendiğinde yeniden kurulur — eski sayaç
 *  önce durur, yoksa her render bir sayaç daha bırakır ve adlar hızlanır. */
function _feedStart(host, feed) {
  _feedStop();
  const en = Math.max(feed.gold.length, feed.lapis.length);
  // Tek ad dönmez. Hareket azaltma isteyen kullanıcıda da dönmez: kendiliğinden
  // değişen metin okumayı böler (WCAG 2.2.2) — ilk ad sabit kalır.
  if (en < 2) return;
  let kis = false;
  try { kis = !!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches; } catch (_) {}
  if (kis) return;

  _feedIdx = 0;
  _feedTimer = setInterval(() => {
    // Hero yeniden çizildiyse/görünümden çıktıysa sayaç kendini toplar
    if (!host || !host.isConnected) { _feedStop(); return; }
    const els = host.querySelectorAll('.yol-feed');
    if (!els.length) { _feedStop(); return; }
    // Arka plan sekmesinde sıra İLERLEMEZ: kullanıcı döndüğünde kaldığı
    // addan sürer, kaçırdığı beş adı bir anda geçmiş olmaz.
    if (document.hidden) return;
    _feedIdx++;
    els.forEach(el => {
      const list = el.dataset.feed === 'lapis' ? feed.lapis : feed.gold;
      const item = el.querySelector('.yol-feed-item');
      if (!item || list.length < 2) return;
      item.textContent = list[_feedIdx % list.length];
      // Animasyonu yeniden başlat — sınıfı sök, reflow'u zorla, geri tak
      item.classList.remove('yol-feed-in');
      void item.offsetWidth;
      item.classList.add('yol-feed-in');
    });
  }, FEED_MS);
}

/* ══════════════════════════════════════════════════════════════
   %YAKINLIK — yavaş eksen (kimlik). Kaynak önceliği:
   1) kisi  : ANA MESAFE (13x msAnaMesafe) — 02d ile AYNI sayı
   2) hedef : seri hedefine ilerleme (usSeriesState('seri').pct)
   3) null  : sayı gizlenir, yalnız halka kalır

   Burada eskiden `closest.score` okunuyordu: TEK bir kartın ham reçete
   ortalaması. İki yüzey aynı cümleyi kurup (%n yakınsın) farklı sayılar
   söyleyebiliyordu. Ölçünün tek yazarı artık Mesafe Motoru'dur.
══════════════════════════════════════════════════════════════ */
export function yolScore() {
  let ana = null;
  try { const v = window.msAnaMesafe?.(); if (typeof v === 'number' && isFinite(v)) ana = v; } catch (_) {}
  if (ana != null) return { pct: Math.max(0, Math.min(100, Math.round(ana))), source: 'kisi' };
  const st = _seriesState('seri');
  if (st && st.n > 0 && st.target) return { pct: st.pct, source: 'hedef' };
  return { pct: null, source: null };
}

/* ══════════════════════════════════════════════════════════════
   BUGÜN HERO — #yol-hero host'una basılır (idempotent; usRenderBugunCard
   delegesi + loadBugunView üzerinden her görünür anda tazelenir)
══════════════════════════════════════════════════════════════ */

/* Halka SVG — 3 yay segmenti (r=46, çevre≈289; segment≈84, aralık≈12.4°) */
function _ringSVG(strikes) {
  const SEG = 84, GAP = 205; // dasharray: görünen yay + kalan boşluk
  const arcs = strikes.map((s, i) => `
    <circle class="yol-arc yol-arc--${s.id}${s.on ? ' yol-arc--on' : ''}"
            cx="60" cy="60" r="46"
            stroke-dasharray="${SEG} ${GAP}"
            transform="rotate(${-84 + i * 120} 60 60)"/>`).join('');
  return `<svg viewBox="0 0 120 120" aria-hidden="true">${arcs}</svg>`;
}

/* Çizginin altındaki TEK cümle. Sıra bir öncelik değil, bir tören:
     1) Ultra gün — mesafe o gün kapanmıştır, sayı konuşmaz.
     2) Ölçü varsa — Eşik Ekranı'nın cümlesi. Anahtar KOPYALANMAZ
        (esik.path.label): iki yüzey tek metni paylaşır, biri değişince
        öteki ayrışamaz. Rakam cümlenin içinde <b> ile durur; çizginin
        ucundaki çıplak sayı bu yüzden emekli oldu — aynı ölçüyü 8px
        arayla iki kez yazıyordu.
     3) Ölçüsüz — yeni kullanıcı. "%0 yakınsın" ilk cümle olamaz. */
function _heroLabel(onCount, ultra, pct) {
  if (ultra) return t('yol.hero.ultra');
  if (pct != null) return t('esik.path.label').replace('{n}', pct);
  return onCount > 0 ? t('yol.hero.on') : t('yol.hero.first');
}

/* ── Kutbun ARKASINDAKİ deste ──
   Emre'nin kararı (2026-08-18): Kişilerim'in kartları ayrı bir bölümde
   değil, iki ana kartın ARKASINDA durur. Ön yüz sentezdir (olunan herkesin
   toplamı); arkasındakiler onu kuran tek tek kişilerdir. Yüz üretimi
   13B'nin tek kaynağından gelir (`karYuz`) — burada ikinci bir kart dili
   yazılmaz. 13B yüklenmemişse yığın hiç çizilmez: kutup eskisi gibi tek
   kart olarak yaşar (sessiz düşüş).
   İki yüzle sınırlı: hero her tazelemede yeniden çizilir ve her ek yüz bir
   SVG sahnesi demektir. */
function _yiginHTML(kind) {
  let girdiler = [];
  try { girdiler = window.karYiginGirdileri?.(kind, 2) || []; } catch (_) { return ''; }
  if (!girdiler.length) return '';
  // Derinlik destenin SIRASIDIR: ilk kişi ön karta en yakın (--d:1). DOM'da
  // ters dizilir (en arkadaki önce) — hepsi aynı z-index'te durduğu için
  // yığının üst üste binme sırasını DOM belirler.
  return girdiler.map((g, i) => {
    let yuz = '';
    try { yuz = window.karYuz?.(g, kind, { mini: true }) || ''; } catch (_) { yuz = ''; }
    return yuz ? `<span class="yol-yigin-k" style="--d:${i + 1}" aria-hidden="true">${yuz}</span>` : '';
  }).reverse().join('');
}

export function yolRenderHero() {
  const host = document.getElementById('yol-hero');
  if (!host) return;
  ikvEnsureStyles();

  const strikes = _strikes();
  const onCount = strikes.filter(s => s.on).length;
  const ultra = onCount === 3;
  const gold = _goldPole();
  const lapis = _lapisPole();
  // Hero çizgisi ANA MESAFE kadar dolar ve o oranı sayıyla söyler — Eşik
  // Ekranı'ndaki "%{n} yakınsın" ile AYNI sayı (13x msAnaMesafe). Sayı
  // "ne kadar" sorusunu cevaplar; "ne zaman" sorusu kula ait değildir ve
  // cevabı Sabır Kartı'nda Allah'a bırakılır (yolOpenSabir) — çizgiye
  // dokunmak o kartı açar. Ölçü yoksa sayı HİÇ basılmaz: "%0 yakınsın"
  // yeni kullanıcıyı karşılayacak ilk cümle olamaz (02d ölçüsüz kuralının
  // ikizi).
  const heroPct = yolScore().pct;

  const glyphs = strikes.map(s => `
    <span class="yol-glyph yol-glyph--${s.id}${s.on ? ' yol-glyph--on' : ''}"
          title="${esc(s.verb)}">${s.glyph}</span>`).join('');

  // Kutbu kuran kartlar. Şerit İKİ tarafa da basılır (biri boş olsa bile):
  // yalnız dolu tarafa basılırsa o sütun uzar ve iki kart aynı hizada
  // durmaz. Hiçbir kutbun malzemesi yoksa şerit hiç açılmaz — boş bir
  // satır kartın altında ne söylerdi?
  // aria-hidden: kendiliğinden devreden metin ekran okuyucuyu böler;
  // listenin erişilebilir hâli Benlik Yapısı ekranındadır (10q3).
  const feed = yolFeedNames();
  const feedVar = feed.gold.length > 0 || feed.lapis.length > 0;
  const feedHTML = (kind) => feedVar
    ? `<span class="yol-feed" data-feed="${kind}" aria-hidden="true"
             ><span class="yol-feed-item yol-feed-in">${esc(feed[kind][0] || '')}</span></span>`
    : '';

  host.innerHTML = `
    <div class="yol-hero ws-corners${ultra ? ' yol-hero--ultra' : ''}">
      <span class="ws-corner ws-corner--tl"></span>
      <span class="ws-corner ws-corner--tr"></span>
      <span class="ws-corner ws-corner--bl"></span>
      <span class="ws-corner ws-corner--br"></span>
      <div class="yol-kicker">
        <span>${t('yol.kicker')}</span>
        <span class="yol-kicker-day">${ultra ? t('yol.kicker.ultra') : t('yol.kicker.count').replace('{n}', onCount)}</span>
      </div>
      <div class="yol-row">
        <button class="yol-pole yol-pole--gold${gold.empty ? ' yol-pole--empty' : ''}"
                id="yol-pole-gold" type="button" aria-label="${esc(t('yol.aria.gold'))}">
          <span class="yol-pole-tag">${t('yol.tag.gold')}</span>
          <span class="yol-yigin">
            ${_yiginHTML('altin')}
            <span class="yol-yigin-on">${ikvCardFace(gold.card, { palette: 'gold', mini: true, fog: gold.empty, sub: '', sahne: gold.sahne })}</span>
          </span>
          ${feedHTML('gold')}
        </button>
        <button class="yol-ring-btn" id="yol-ring-btn" type="button"
                aria-label="${esc(t('yol.aria.ring'))}">
          <span class="yol-ring">
            ${_ringSVG(strikes)}
            <span class="yol-ring-core">${ultra ? '✶' : `${onCount}<i>/3</i>`}</span>
          </span>
          <span class="yol-ring-glyphs">${glyphs}</span>
        </button>
        <button class="yol-pole yol-pole--lapis${lapis.empty ? ' yol-pole--empty' : ''}"
                id="yol-pole-lapis" type="button" aria-label="${esc(t('yol.aria.lapis'))}">
          <span class="yol-pole-tag yol-pole-tag--lapis">${t('yol.tag.lapis')}</span>
          <span class="yol-yigin">
            ${_yiginHTML('lapis')}
            <span class="yol-yigin-on">${ikvCardFace(lapis.card, { palette: 'lapis', mini: true, fog: lapis.empty, star: true, sub: '', sahne: lapis.sahne })}</span>
          </span>
          ${(() => {
            try {
              const n = window.gkCompletedCount?.() || 0;
              if (!n) return '';
              return `<span class="yol-ilham-badge" title="${esc(t('yol.ilham.badge').replace('{n}', n))}">
                <span class="yol-ilham-badge-sigil" aria-hidden="true">✦</span>
                <span class="yol-ilham-badge-n">+${n}</span>
              </span>`;
            } catch (_) { return ''; }
          })()}
          ${feedHTML('lapis')}
        </button>
      </div>
      <button class="yol-path" id="yol-path-btn" type="button"
              ${heroPct != null ? `style="--ms-pct:${heroPct}%"` : ''}
              aria-label="${esc(t('yol.sabir.aria'))}">
        <span class="yol-dot yol-dot--gold"></span>
        <span class="yol-line">
          ${heroPct != null ? '<span class="yol-fill"></span><span class="yol-spark"></span>' : ''}
        </span>
        <span class="yol-dot yol-dot--lapis">✷</span>
      </button>
      <div class="yol-label${heroPct != null && !ultra ? ' yol-label--mesafe' : ''}"
           >${_heroLabel(onCount, ultra, heroPct)}</div>
    </div>`;

  // Dokunuşlar: kutuplar eski Geçiş Şeridi hedeflerini korur; halka Yol'u açar
  // Kutba dokunmak artık KARŞILAŞMA odasını açar (Emre, 2026-08-18): kart
  // ekranı kaplar, arkasındaki deste dikeyde gezilir. Eski hedefler (portre /
  // arketip ekranı) kaybolmadı — odanın içinden ve Studio'dan erişilir.
  // Oda açılamıyorsa (13B yüklenmedi ya da gösterilecek kart yok) eski kapı
  // devralır: kimseden bugün kullandığı bir yol geri alınmaz.
  const _acOda = (kind, eski) => {
    let acildi = false;
    try { acildi = window.karAc?.(kind) === true; } catch (_) { acildi = false; }
    if (!acildi) { try { window.switchView?.(eski); } catch (_) {} }
  };
  host.querySelector('#yol-pole-gold')?.addEventListener('click', () => _acOda('altin', 'portre'));
  host.querySelector('#yol-pole-lapis')?.addEventListener('click', () => _acOda('lapis', 'arketip'));
  host.querySelector('#yol-ring-btn')?.addEventListener('click', () => yolOpen());
  host.querySelector('#yol-path-btn')?.addEventListener('click', () => yolOpenSabir());

  // Şerit her render'da yeniden kurulur; eski sayaç içeride durdurulur.
  _feedStart(host, feed);
}

/* ══════════════════════════════════════════════════════════════
   SABIR KARTI — yol çizgisine dokunuşta açılan tek kart. %yakınlık
   göstergesi (kaç gün/yüzde kaldığı) kaldırıldı; yerine "ne zaman"
   sorusunun cevabını Allah'a bırakan bir duraklama konur. Boyun eğmiş
   Satürn (zaman/sabır) + sabit metin — dile bağlı çevrilmez, kanon
   aforizma gibi hardcoded TR (bkz. manevi katman konvansiyonu).
══════════════════════════════════════════════════════════════ */
function _sabirSaturnSVG() {
  return `<svg viewBox="0 0 200 150" class="ys-saturn" aria-hidden="true">
    <defs>
      <radialGradient id="ysHalo" cx="50%" cy="42%" r="60%">
        <stop offset="0" stop-color="rgba(90,138,216,.36)"/>
        <stop offset="1" stop-color="rgba(90,138,216,0)"/>
      </radialGradient>
      <linearGradient id="ysBody" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stop-color="#3A2C14"/>
        <stop offset="1" stop-color="#15100A"/>
      </linearGradient>
    </defs>
    <ellipse cx="100" cy="72" rx="90" ry="64" fill="url(#ysHalo)"/>
    <circle cx="32" cy="24" r="1.1" fill="#CBD8F0" opacity=".55"/>
    <circle cx="166" cy="32" r="1" fill="#CBD8F0" opacity=".45"/>
    <circle cx="150" cy="110" r="1.3" fill="#F0D9A8" opacity=".5"/>
    <circle cx="28" cy="102" r="1" fill="#CBD8F0" opacity=".4"/>
    <g transform="translate(100,90) rotate(26)">
      <path d="M-60 3 A60 16 0 0 1 -6 -15" fill="none" stroke="#5A8AD8" stroke-width="1.1" opacity=".5"/>
      <path d="M6 -15 A60 16 0 0 1 60 3" fill="none" stroke="#5A8AD8" stroke-width="1.1" opacity=".5"/>
      <circle cx="0" cy="10" r="28" fill="url(#ysBody)" stroke="#F5A623" stroke-width="1.3"
              style="filter:drop-shadow(0 0 9px rgba(245,166,35,.42));"/>
      <path d="M-28 6 A28 28 0 0 0 3 36" fill="none" stroke="#F7C744" stroke-width="1" opacity=".3"/>
      <path d="M-60 3 A60 16 0 0 0 60 3" fill="none" stroke="#F5A623" stroke-width="1.5"
            style="filter:drop-shadow(0 0 6px rgba(245,166,35,.4));"/>
    </g>
  </svg>`;
}

/* Escape dinleyicisi ve kartı açan düğüm — modül kapsamında tekil tutulur
   ki kart kapanınca ikisi de sökülebilsin (10q4 kalıbı). */
let _sabirOnKey = null;
let _sabirLastFocus = null;

function _closeSabir() {
  const m = document.getElementById('ys-modal');
  if (!m) return;
  if (_sabirOnKey) { document.removeEventListener('keydown', _sabirOnKey); _sabirOnKey = null; }
  window.wtOverlayClose?.('sabir');   // Kullanım Nabzı (00f)
  // Yol ekranının üstünden açıldıysa telemetri o törene GERİ döner: 00f'de
  // wtOverlayOpen açık töreni kapatır, dönüş kendiliğinden olmaz — yoksa
  // Sabır'dan sonra Yol'da geçen süre hiçbir segmente yazılmazdı.
  if (document.getElementById('yol-portal')) { try { window.wtOverlayOpen?.('yol'); } catch (_) {} }
  m.classList.add('ys-modal--out');
  setTimeout(() => m.remove(), 260);
  // Odak kartı açan çizgiye döner: klavyeyle gezen kullanıcı hero'nun
  // başına fırlamaz, bıraktığı yerden devam eder. isConnected şart:
  // yolRenderHero kart açıkken tazelenirse (usRunDaily/yolInit) eski düğüm
  // DOM'dan kopar ve odak hiçbir yere gitmez — o hâlde hiç denemeyiz.
  try { if (_sabirLastFocus?.isConnected) _sabirLastFocus.focus(); } catch (_) {}
  _sabirLastFocus = null;
}

export function yolOpenSabir() {
  if (document.getElementById('ys-modal')) return;
  ikvEnsureStyles();
  window.wtOverlayOpen?.('sabir');    // Kullanım Nabzı (00f) — duraklamanın süresi
  // Sabır bir duraklamadır, kutlama değil: sessiz nefes cue'su (13e breath,
  // haptik yok). Mühür/armağan cue'ları burada yanlış register olurdu.
  try { window.fxCue?.('breath'); } catch (_) {}
  _sabirLastFocus = document.activeElement;
  const el = document.createElement('div');
  el.id = 'ys-modal'; el.className = 'ys-modal';
  el.innerHTML = `
    <div class="ys-veil"></div>
    <div class="ys-box" role="dialog" aria-modal="true" aria-label="${esc(t('yol.sabir.aria'))}">
      <button class="ys-close" id="ys-close" aria-label="${esc(t('yol.close'))}">✕</button>
      <div class="ys-art">${_sabirSaturnSVG()}</div>
      <div class="ys-quote">“O kişiye ne zaman dönüşebileceğini En iyi Allah bilir. O, sana doğru yolu göstersin. Belki de o kişiye değil, ondan daha iyi bir kişiye dönüşebilirsin. O'ndan sabırla yardım iste ve kalbini dinleyerek o kişiyi sabırla inşa et.”</div>
    </div>`;
  document.body.appendChild(el);
  el.querySelector('#ys-close')?.addEventListener('click', _closeSabir);
  el.querySelector('.ys-veil')?.addEventListener('click', _closeSabir);
  // Üçüncü çıkış: Escape. Repo genelinde her tören kapısının kuralı — kart
  // yalnız fareyle kapanan bir tuzak olamaz.
  _sabirOnKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); _closeSabir(); } };
  document.addEventListener('keydown', _sabirOnKey);
  setTimeout(() => { try { el.querySelector('#ys-close')?.focus(); } catch (_) {} }, 60);
}

/* ══════════════════════════════════════════════════════════════
   HALKA DEFTERİ — son N günün üç-vuruş durumu (TÜRETİLİR, saklanmaz)

   GÜN ANAHTARI İKİLİĞİ — repoda İKİ format yaşar, ikisi de 00a'da:
     • localDayKey  → `2026-7-17`  (ay 0-indeksli, PAD'SİZ) — merkezî
       aktivite defteri, yani SERİ. Sohbet seri mantığından miras.
     • localISODate → `2026-08-17` (ay 1-indeksli, PADDED) — hayal ve
       söz defterleri; lexical karşılaştırma güvenli olduğu için yeni
       yazılan her şey bunu kullanır.
   Yanlış anahtarla sorgulanan defter hata vermez, SESSİZCE boş döner —
   tuzak budur. Üç seriyi yan yana okuyan tek yer burasıdır ve normalize
   burada yapılır; yeni bir tüketici yazan önce bu bloğu okusun.
══════════════════════════════════════════════════════════════ */
export function yolDayRings(count) {
  let seriSet; try { seriSet = new Set(getActivityDays()); } catch (_) { seriSet = new Set(); }
  const hayalSet = new Set((S._hayalMuhru && S._hayalMuhru.days) || []);
  const sozSet = new Set((S._sozMuhru && S._sozMuhru.days) || []);
  const today = new Date();
  const out = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const padded = localISODate(d);
    out.push({
      date: d, day: d.getDate(), isToday: i === 0,
      seri: seriSet.has(localDayKey(d)),
      hayal: hayalSet.has(padded),
      soz: sozSet.has(padded),
    });
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════
   YOL EKRANI — Üç Mühür Merkezi'nin halefi (#yol-portal)
   Dikey sahne, YUKARIDAN aşağı (Emre'nin sırası, 2026-08-23):
     lapis kapı (olmak istediğin) → üç mührün şeridi → halka defteri →
     BUGÜNÜN HALKASI → altın kapı (olduğun kişi) → kilometre taşları.
   İki kapı sahneyi hâlâ kuşatır; aradaki üç blok bugüne inen basamaktır,
   taşların defteri ise en altta, yolun toplamı olarak açılır.
   Açılışta bugüne kaydırılır.
══════════════════════════════════════════════════════════════ */

function _yolClose() {
  window.wtOverlayClose?.('yol');   // Kullanım Nabzı (00f)
  const p = document.getElementById('yol-portal');
  if (p) {
    const sc = p.querySelector('.yolp-scene');
    if (sc) { sc.classList.add('yolp-scene--out'); setTimeout(() => p.remove(), 260); }
    else p.remove();
  }
  // Elmas barını mevcut view'e göre yeniden assert et (10s/10t kalıbı)
  try { window.glSyncElmasBar?.(window.glActiveViewName ? window.glActiveViewName() : ''); } catch (_) {}
}

/* Üç seri için aynı eşikteki kart tanımları + sahiplik (10u verisinden) */
function _stationData(d) {
  return STRIKES.map(sd => {
    const st = _seriesState(sd.id);
    const def = st?.cfg?.cards?.find(c => c.d === d) || null;
    const rec = st && st.cards ? st.cards[String(d)] : null;
    return { id: sd.id, glyph: sd.glyph, verb: _verb(sd.id), def, owned: !!rec, at: rec?.at || '' };
  });
}

/* Mini gün hücresi — 28 günlük halka defteri ızgarası */
function _dayCellHTML(day) {
  const strikes = [
    { id: 'seri', on: day.seri }, { id: 'hayal', on: day.hayal }, { id: 'soz', on: day.soz },
  ];
  const n = strikes.filter(s => s.on).length;
  const cls = n === 3 ? 'yolp-day--full' : (n > 0 ? 'yolp-day--part' : 'yolp-day--gap');
  return `
    <span class="yolp-day ${cls}${day.isToday ? ' yolp-day--today' : ''}" title="${n}/3">
      <span class="yolp-day-ring">${_ringSVG(strikes)}</span>
      <span class="yolp-day-num">${day.day}</span>
    </span>`;
}

/* Bugünün üç vuruş eylem satırı */
function _strikeRowHTML(s) {
  const ACT = { seri: 'seal', hayal: 'hayal', soz: 'soz' };
  if (s.on) {
    let doneLine = t('yol.done.' + s.id);
    if (s.id === 'hayal') {
      try {
        const v = window.usGetTodayVision?.();
        if (v && v.text) doneLine = `“${esc(v.text)}”`;
      } catch (_) {}
    }
    return `<div class="yolp-strike yolp-strike--on yolp-strike--${s.id}">
      <span class="yolp-strike-glyph">${s.glyph}</span>
      <span class="yolp-strike-txt"><b>${s.verb}</b><i>${doneLine}</i></span>
      <span class="yolp-strike-mark">✓</span>
    </div>`;
  }
  return `<button class="yolp-strike yolp-strike--off yolp-strike--${s.id}" data-act="${ACT[s.id]}" type="button">
    <span class="yolp-strike-glyph">${s.glyph}</span>
    <span class="yolp-strike-txt"><b>${s.verb}</b><i>${t('yol.todo.' + s.id)} →</i></span>
    <span class="yolp-strike-mark">○</span>
  </button>`;
}

const YOL_GOALS = [7, 30, 180, 365];

/* ── KOLEKSİYON PANELİ — tek kart, içinde kartlar ──
   İki tüketicisi var: kilometre taşları ve altın kutbu kuran kartlar.
   Kabuk tek yerde durur — ikinci panel ikiz bir kabuk doğurmasın diye
   (mevcut olanı yeniden kullan). İçerik hücreleri çağıran tarafın işi. */
function _collHTML({ mod, lbl, stat, cells, note }) {
  if (!cells) return '';
  return `
        <div class="yolp-coll${mod ? ' ' + mod : ''}">
          <div class="yolp-coll-head">
            <span class="yolp-coll-lbl">${lbl}</span>
            ${stat ? `<span class="yolp-coll-stat">${stat}</span>` : ''}
          </div>
          <div class="yolp-coll-grid">${cells}</div>
          ${note ? `<div class="yolp-coll-note">${note}</div>` : ''}
        </div>`;
}

/* Altın kutbu KURAN kartlar — panel hâli. Şeridin (yolFeedNames) adlarla
   söylediğini ızgara kartlarla söyler: "bu kart şunlardan oldu". Kaynak
   yine 10q3'ün byGetYapi'sidir; ikinci bir türetme YAZILMAZ — iki yüzey
   aynı listeyi göstermek zorunda. Kanıt yoksa (kart yoksa) panel de yok. */
const FEED_CELLS = 8;    // iki satır — kilometre taşları paneliyle aynı ölçü
function _goldCollHTML() {
  let y = null;
  try { y = window.byGetYapi?.() || null; } catch (_) {}
  const all = (Array.isArray(y?.altin) ? y.altin : []).filter(c => c && c.id);
  if (!all.length) return '';
  const cells = all.slice(0, FEED_CELLS).map(c => `
      <div class="yolp-cell">
        <button class="yolp-cell-open" data-kart="${esc(c.id)}" type="button"
                aria-label="${esc(c.name || '')}">
          <span class="yolp-cell-face">${ikvCardFace(c, { palette: 'gold', mini: true, sub: '' })}</span>
        </button>
      </div>`).join('');
  const kalan = all.length - Math.min(all.length, FEED_CELLS);
  const note = t('yol.feed.note') + (kalan
    ? ` <button class="yolp-coll-more" id="yolp-coll-more" type="button">${
        t('yol.feed.more').replace('{n}', kalan)}</button>` : '');
  return _collHTML({
    mod: 'yolp-coll--gold', lbl: t('yol.feed.lbl'),
    stat: t('yol.feed.stat').replace('{n}', all.length), cells, note,
  });
}

export function yolOpen() {
  if (document.getElementById('yol-portal')) return;
  window.wtOverlayOpen?.('yol');    // Kullanım Nabzı (00f)
  ikvEnsureStyles();

  const strikes = _strikes();
  const onCount = strikes.filter(s => s.on).length;
  const ultra = onCount === 3;
  const gold = _goldPole();
  const lapis = _lapisPole();
  const score = yolScore();
  const seriSt = _seriesState('seri');
  const n = seriSt ? seriSt.n : 0;
  const goal = seriSt ? seriSt.goal : null;
  const desired = (window.oikGetDesired?.()?.description || S._personTransition?.desired?.description || '').trim();

  // KİLOMETRE TAŞLARI — TEK kart, içinde sekiz kart (Emre, 2026-08-23).
  // Eskiden sekiz tam-genişlik satırdı ve yol ekseniyle aynı yöne bakıyordu
  // (uzak taş üstte); tek başına iki ekran yiyordu. Taşlar artık bir
  // koleksiyon panelinde ve YAKINDAN UZAĞA okunuyor: geçilmiş taşlar ilk
  // hücrelerde, sıradaki hemen onların ardında. Panelin yeri sahnenin EN
  // ALTIDIR (Emre): yol iki kapı arasında geçer, taşlar o yolun defteridir —
  // defter sahnenin sonunda, üç mühür şeridinin ardında açılır. Kart yüzü tek motordan
  // gelir (12c ikvCardFace + ikvMilestoneScene) — küçük kart yeni bir görsel
  // dil değil, aynı kartın mini hâlidir.
  const thresholds = (seriSt?.cfg?.cards || []).map(c => c.d).sort((a, b) => a - b);
  const stoneHTML = (d) => {
    const passed = n >= d;
    const pal = passed ? 'gold' : 'lapis';
    const card = (seriSt?.cfg?.cards || []).find(c => c.d === d);
    const name = card?.name || t('yol.day_tc').replace('{d}', d);
    const gunEt = t('yol.day_cap').replace('{d}', d);
    const durum = passed ? t('yol.st.passed') : t('yol.st.ahead').replace('{r}', d - n);
    const pips = _stationData(d).map(p => `
      <span class="yolp-pip yolp-pip--${p.id}${p.owned ? ' yolp-pip--on' : ''}" title="${esc(p.verb)}">${p.glyph}</span>`).join('');
    // Bayrak kartın KARDEŞİDİR, çocuğu değil: iç içe <button> ayrıştırıcıda
    // dıştakini kapatır — eski markup'ta dört bayrak hücreden kaçıp yolun
    // ortasında yetim kutular olarak duruyordu (2026-08-23 canlı DOM kanıtı).
    const flag = YOL_GOALS.includes(d)
      ? `<button class="yolp-flag${goal === d ? ' yolp-flag--on' : ''}" data-flag="${d}" type="button"
           aria-label="${esc(t('yol.flag.aria').replace('{d}', d))}" title="${esc(t('yol.flag.title'))}">⚑</button>` : '';
    return `
      <div class="yolp-cell ${passed ? 'yolp-cell--passed' : 'yolp-cell--ahead'}">
        <button class="yolp-cell-open" data-st="${d}" type="button"
                aria-label="${esc(`${name} · ${gunEt} ${durum}`)}">
          <span class="yolp-cell-face">${ikvCardFace({}, {
            palette: pal, mini: true, kicker: gunEt, name, sub: '',
            scene: ikvMilestoneScene(d, { palette: pal, mini: true }),
          })}</span>
          <span class="yolp-cell-pips">${pips}</span>
        </button>
        ${flag}
      </div>`;
  };
  const ownedStones = thresholds.filter(d => n >= d).length;
  const nextStone = thresholds.find(d => d > n) || null;
  const nextCard = nextStone ? (seriSt?.cfg?.cards || []).find(c => c.d === nextStone) : null;
  const stonesNote = nextStone
    ? t('yol.stones.next').replace('{name}', `<b>${esc(nextCard?.name || '')}</b>`).replace('{r}', nextStone - n)
    : t('yol.stones.all');
  // Defter yoksa (seri motoru henüz hidre olmadıysa) panel hiç basılmaz —
  // boş bir kabuk sahnede yol gibi görünür ama hiçbir şey söylemez.
  const stonesHTML = !thresholds.length ? '' : _collHTML({
    lbl: t('yol.stones.lbl'),
    stat: t('yol.stones.stat').replace('{owned}', ownedStones).replace('{total}', thresholds.length),
    cells: thresholds.map(stoneHTML).join(''),
    note: stonesNote,
  });

  // Halka defteri — son 28 gün
  const dayGrid = yolDayRings(28).map(_dayCellHTML).join('');

  // Saat tonu (13f) sahneye CSS'ten iner: gök --sky-scene token'ıdır, token'ı
  // <html>'deki tw-* sınıfı çevirir — burada sınıf kopyalamaya gerek yok.
  const portal = document.createElement('div');
  portal.id = 'yol-portal';
  portal.innerHTML = `
    <div class="yolp-scene" role="dialog" aria-modal="true" aria-label="${esc(t('yol.aria.scene'))}">
      <div class="yolp-sky" aria-hidden="true"></div>
      <div class="yolp-grain" aria-hidden="true"></div>
      <button class="yolp-close" id="yolp-close" aria-label="${esc(t('yol.close'))}">✕</button>
      <button class="yolp-share" id="yolp-share" type="button" aria-label="${esc(t('yol.aria.share'))}">↗</button>
      <div class="yolp-head">
        <span class="yolp-head-kicker">${t('yol.head.kicker')}</span>
        <span class="yolp-head-sub">${t('yol.head.sub')}</span>
      </div>
      <div class="yolp-body" id="yolp-body"><div class="yolp-body-in">

        <div class="yolp-gate yolp-gate--lapis">
          <div class="yolp-gate-tag yolp-gate-tag--lapis">${t('yol.gate.lapis_tag')}</div>
          <div class="yolp-gate-card">${ikvCardFace(lapis.card, { palette: 'lapis', mini: true, fog: lapis.empty, star: true, sub: '', sahne: lapis.sahne })}</div>
          ${desired ? `<div class="yolp-gate-line">“${esc(desired)}”</div>` : `<div class="yolp-gate-line">${t('yol.gate.lapis_wait')}</div>`}
        </div>

        <div class="yolp-tri">
          ${strikes.map(s => `
            <button class="yolp-tri-card${s.on ? ' yolp-tri-card--live' : ''}" data-tri="${s.id}" type="button">
              <span class="yolp-tri-glyph yolp-tri-glyph--${s.id}">${s.glyph}</span>
              <span class="yolp-tri-n">${s.n}</span>
              <span class="yolp-tri-lbl">${t('yol.tri.' + s.id)}</span>
            </button>`).join('')}
        </div>

        <div class="yolp-walked">
          <div class="yolp-walked-lbl">${t('yol.walked.lbl')}</div>
          <div class="yolp-walked-grid">${dayGrid}</div>
          <div class="yolp-walked-note">${n > 0
            ? t('yol.walked.note').replace('{n}', n)
            : t('yol.walked.note_empty')}</div>
        </div>

        <div class="yolp-today${ultra ? ' yolp-today--ultra' : ''}" id="yolp-today">
          <div class="yolp-today-kicker">${ultra ? t('yol.today.ultra_kicker') : t('yol.today.kicker')}</div>
          <div class="yolp-today-ring">
            ${_ringSVG(strikes)}
            <span class="yolp-today-core">${ultra ? '✶' : `${onCount}<i>/3</i>`}</span>
          </div>
          <div class="yolp-today-sub">${
            ultra ? t('yol.today.ultra_sub')
              : (onCount > 0 ? t('yol.today.part_sub') : t('yol.today.empty_sub'))}</div>
          <div class="yolp-strikes">${strikes.map(_strikeRowHTML).join('')}</div>
          ${score.pct != null ? (() => {
            const txt = score.source === 'kisi'
              ? t('yol.score.kisi').replace('{pct}', score.pct)
              : t('yol.score.hedef').replace('{pct}', score.pct);
            // aria: görünür cümlenin düz hâli (<b> okunmaz) + kartın kimliği
            const aria = `${txt.replace(/<[^>]+>/g, '')} · ${t('yol.sabir.aria')}`;
            return `
          <button class="yolp-score" id="yolp-score-btn" type="button"
                  style="--ms-pct:${score.pct}%" aria-label="${esc(aria)}">
            <span class="yolp-score-line"><span class="yolp-score-fill"></span><span class="yolp-score-spark"></span></span>
            <span class="yolp-score-lbl">${txt}</span>
          </button>`;
          })() : ''}
        </div>

        <div class="yolp-gate yolp-gate--gold">
          <div class="yolp-gate-tag">${t('yol.gate.gold_tag')}</div>
          <div class="yolp-gate-card">${ikvCardFace(gold.card, { palette: 'gold', mini: true, fog: gold.empty, sub: '', sahne: gold.sahne })}</div>
          <div class="yolp-gate-line">${t('yol.gate.gold_line')}</div>
        </div>

        ${_goldCollHTML()}

        ${stonesHTML}
      </div></div>
    </div>`;
  document.body.appendChild(portal);

  // Açılış: bugüne kaydır (altın kapıdan yürünmüş gibi)
  requestAnimationFrame(() => {
    try { document.getElementById('yolp-today')?.scrollIntoView({ block: 'center' }); } catch (_) {}
  });

  // Kapatma
  document.getElementById('yolp-close')?.addEventListener('click', _yolClose);

  // Paylaş (13g) — yolun bugünkü hâli story kartı olarak
  document.getElementById('yolp-share')?.addEventListener('click', () => {
    const sub = ultra ? t('yol.share.ultra_sub') : t('yol.share.count_sub').replace('{n}', onCount);
    const line = ultra ? t('yol.today.ultra_sub') : t('yol.share.line');
    try {
      window.shrShareStory?.({
        kicker: t('yol.share.kicker'), glyph: ultra ? '✶' : '✦',
        big: n, bigLabel: t('yol.gun'), title: ultra ? t('yol.share.ultra_title') : t('yol.share.title'),
        sub, line, note: score.pct != null ? t('yol.share.note').replace('{pct}', score.pct) : '',
        accent: ultra ? '#F7C744' : 'gold', tier: ultra ? 4 : 2,
      });
    } catch (_) {}
  });

  // Bugünün vuruş eylemleri
  portal.querySelectorAll('.yolp-strike[data-act]').forEach(b => b.addEventListener('click', () => {
    const act = b.dataset.act;
    if (act === 'seal') { _yolClose(); setTimeout(() => { try { window.smRunDaily?.(true); } catch (_) {} }, 280); }
    else if (act === 'hayal') { _yolClose(); setTimeout(() => { try { window.gorOpen?.(); } catch (_) {} }, 280); }
    else if (act === 'soz') { _yolClose(); setTimeout(() => { try { window.glGiveSozNow?.(); } catch (_) {} }, 280); }
  }));

  // Yol çizgisi — Bugün hero'daki ikiziyle aynı kapı: Sabır Kartı
  portal.querySelector('#yolp-score-btn')?.addEventListener('click', () => yolOpenSabir());

  // Taş detayı — o eşikte üç mührün kartları
  portal.querySelectorAll('.yolp-cell-open[data-st]').forEach(b => b.addEventListener('click', () => {
    yolOpenStation(parseInt(b.dataset.st, 10));
  }));

  // Altın kutbu kuran kart → 10q'nun TEK detay töreni (10q3'ün köprüsüyle
  // birebir: atölye kutbu katalogda yoktur, onu 10A çözer).
  portal.querySelectorAll('.yolp-cell-open[data-kart]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.kart;
    try {
      const gk = window.gkRefResolve?.(id);
      if (gk?._gk) window.gkOpenDetail?.(gk._gk.which === 'lapis' ? 'lapis' : 'gold', gk._gk.kartId);
      else window.kkOpenDetail?.(id);
    } catch (_) {}
  }));

  // "+N kart daha" → yapının tam ızgarası (10q3 byShowGrid); ikiz liste yok
  document.getElementById('yolp-coll-more')?.addEventListener('click', () => {
    try { window.byShowGrid?.(); } catch (_) {}
  });

  // Hedef bayrağı (toggle — seri omurga hedefi, 10t smSetGoal)
  portal.querySelectorAll('.yolp-flag[data-flag]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const d = parseInt(b.dataset.flag, 10);
    try { window.smSetGoal?.(goal === d ? null : d); } catch (_) {}
    _yolClose(); setTimeout(yolOpen, 80);
  }));

  // Üç mühür özet kartları → mühür detay sayfası (10u)
  portal.querySelectorAll('.yolp-tri-card[data-tri]').forEach(b => b.addEventListener('click', () => {
    try { window.usOpenDetail?.(b.dataset.tri); } catch (_) {}
  }));
}

/* İstasyon detayı — o eşikte üç mührün kartları (sahipli=altın, değil=lapis) */
export function yolOpenStation(d) {
  const portal = document.getElementById('yol-portal');
  if (!portal) return;
  document.getElementById('yolp-st-modal')?.remove();
  const data = _stationData(d);
  // Taşın yoldaki yeri: ızgarada hücre başına yazılmıyor (sekiz kez tekrar
  // eden bir cümle koleksiyonu boğardı) — sorulduğu yerde, burada söylenir.
  const _n = _seriesState('seri')?.n || 0;
  const durum = _n >= d ? t('yol.st.passed') : t('yol.st.ahead').replace('{r}', d - _n);
  const cardsHTML = data.map(p => {
    if (!p.def) return '';
    const face = ikvCardFace({ id: `yol-${p.id}-${d}`, name: p.def.name }, {
      palette: p.owned ? 'gold' : 'lapis',
      kicker: t('yol.mk.' + p.id),
      badge: `${p.owned ? p.def.glyph : '◇'} ${t('yol.day_cap').replace('{d}', d)}`,
      sub: p.owned ? p.def.sub : t('yol.st.faraway').replace('{verb}', p.verb.toLocaleLowerCase(_locale())),
      scene: ikvMilestoneScene(d, { palette: p.owned ? 'gold' : 'lapis' }),
      fog: !p.owned,
    });
    return `<div class="yolp-stc${p.owned ? ' yolp-stc--owned' : ''}">${face}
      ${p.owned && p.at ? `<div class="yolp-stc-when">${esc(p.at)}</div>` : ''}</div>`;
  }).join('');
  const ownedLine = data.find(p => p.owned && p.def?.line);

  const modal = document.createElement('div');
  modal.id = 'yolp-st-modal'; modal.className = 'yolp-st-modal';
  modal.innerHTML = `
    <div class="yolp-st-veil"></div>
    <div class="yolp-st-box">
      <button class="yolp-st-close" aria-label="${esc(t('yol.close'))}">✕</button>
      <div class="yolp-st-kicker">${t('sm.kicker.milestone').replace('{d}', d)}
        <i class="yolp-st-durum">${durum}</i></div>
      <div class="yolp-st-cards">${cardsHTML}</div>
      ${ownedLine ? `<div class="yolp-st-line">“${esc(ownedLine.def.line)}”</div>` : `<div class="yolp-st-line yolp-st-line--dim">${t('yol.st.line_dim')}</div>`}
    </div>`;
  portal.appendChild(modal);
  modal.querySelector('.yolp-st-close')?.addEventListener('click', () => modal.remove());
  modal.querySelector('.yolp-st-veil')?.addEventListener('click', () => modal.remove());
}

/* ══════════════════════════════════════════════════════════════
   INIT — 03-auth-shell post-auth (usInit'ten SONRA; hidrasyon kuralı).
   Kutup verileri kkInit(+1200ms)/imInit(+1800ms) ile geç dolar →
   usRunDaily(2600ms) zaten yeniden çizer; yine de güvenlik tazelemesi.
══════════════════════════════════════════════════════════════ */
export function yolInit() {
  try { yolRenderHero(); } catch (_) {}
  setTimeout(() => { try { yolRenderHero(); } catch (_) {} }, 3200);
}

/* ── window expose (TDZ-güvenli modüller-arası erişim + inline) ── */
if (typeof window !== 'undefined') {
  window.yolInit = yolInit;
  window.yolRenderHero = yolRenderHero;
  window.yolOpen = yolOpen;
  window.yolOpenSabir = yolOpenSabir;
  window.yolOpenStation = yolOpenStation;
  window.yolScore = yolScore;
  window.yolDayRings = yolDayRings;
  window.yolPoles = yolPoles;
  window.yolGoldPole = yolGoldPole;   // altın kutbun ham hâli (10q4 sınaması)
  window.yolLapisPole = yolLapisPole; // lapis kutbun ham hâli (13B Karşılaşma)
  window.yolFeedNames = yolFeedNames;
}
