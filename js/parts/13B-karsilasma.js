/* ═══════════════════════════════════════════════════════
   13B — KARŞILAŞMA · Kartın Karşısına Geçilen Oda
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Kişilerim bir vitrindi, Geçiş Ekranı bir masaydı — burası bir ODA.
     Vitrinde bakarsın, masada çalışırsın, odada KARŞILAŞIRSIN: kart
     ekranı kaplar, başka hiçbir şey kalmaz, döndüğünde arkasında seni
     anlatan cümleler durur. Yatayda üç sayfa vardır — OLDUĞUN KİŞİ ·
     GEÇİŞ KARTIM · OLMAK İSTEDİĞİN KİŞİ — yürünen yol iki kutbun tam
     ortasında. Dikeyde ise sentezden onu OLUŞTURANLARA inilir: aşağı
     indikçe kendini kuran kişilere varırsın. "Mesele Sensin."
   DERİN METAFOR (TASARIM-PRENSIPLERI §0.1): BAĞ — birbirine bakan
     kartlar, portre, çift halka. Yolculuk metaforu bu odada BAĞIRMAZ:
     mesafe çizgisi hero'da kalır, odada yalnız yüz vardır.
   MEKANİK / MİMARİ / TEK GİRİŞ:
     Bu dosya iki katmandır. ALT KATMAN (bu faz) yalnız ÇÖZÜCÜDÜR:
     karSayfalar() akışın tamamını, karAkis(kind) tek sayfanın dikey
     listesini, karGirdiCoz(entry) bir girdinin türünü/paletini verir.
     Hiçbir deste burada KURULMAZ — 10q2'nin kkDesteAltin/kkDesteLapis'i
     ve 10f'nin kutup çözücüleri (yolGoldPole/yolLapisPole) TÜKETİLİR.
     Bağlar window.* üzerindendir: statik import kenarı rollup IIFE
     sırasını değiştirip TDZ açar (10q'nun pahalı dersi).
   Kalıcılık: yok — akışın tamamı türetilir (imleç oturumluktur).
   Konvansiyon: i18n t(); window.kar* expose; stiller css/parts/karsilasma.css
═══════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { escapeHTML } from './00a-infrastructure.js';
import { t } from './15-i18n.js';

/* ─── 1. SABİTLER ─── */

/** Yatay sıra ANLAMDIR: olduğun → yürüdüğün yol → olmak istediğin.
 *  Geçiş sayfası yalnız yürünen bir yol varsa doğar (§6.10: boş sayfa
 *  uydurulmaz), o yüzden akış iki ya da üç sayfadır. */
export const KAR_KINDS = ['altin', 'gecis', 'lapis'];

/* ─── 2. KAYNAKLAR — hepsi dışarıdan, hiçbiri burada kurulmaz ─── */

function _deste(kind) {
  try {
    const fn = kind === 'lapis' ? window.kkDesteLapis : window.kkDesteAltin;
    return fn?.() || [];
  } catch (_) { return []; }
}

/** Yürünen geçiş kartı — akışın orta sayfasının konusu. Birden fazlaysa
 *  ilki alınır (10q2'nin destelerdeki sırasıyla aynı seçim). */
function _aktifGecis() {
  try { return (window.gkActiveCards?.() || [])[0] || null; } catch (_) { return null; }
}

/** Bir geçiş kutbunu DESTEDEN bulur — kendi elemanını üretmez.
 *  Mezun kartın lapis kutbu ALTIN destededir; bu yüzden arama iki
 *  destede de yapılır (masanın REF dersi: paletten deste tahmin edilmez). */
function _kutup(kartId, which) {
  const ara = (arr) => arr.find(e => e && e._gk && e._gk.kartId === kartId && e._gk.which === which) || null;
  return ara(_deste('altin')) || ara(_deste('lapis'));
}

/* ─── 3. SENTEZ GİRDİLERİ ─── */

/** Sentez kartı akışın BAŞINDA durur: toplam parçadan önce gelir.
 *  Malzemesi 10f'nin kutup çözücüsüdür — fallback zinciri (portre →
 *  şu anki kimlik → davet / OİK → en yakın kart → davet) tek yerde
 *  yaşasın diye burada yeniden kurulmaz. */
function _sentez(kind) {
  let p = null;
  try {
    p = kind === 'lapis' ? (window.yolLapisPole?.() || null) : (window.yolGoldPole?.() || null);
  } catch (_) { p = null; }
  if (!p || !p.card) return null;
  return {
    id: 'kar_sentez_' + kind,
    name: p.card.name || '',
    card: p.card,
    _sentez: { kind, empty: !!p.empty, sahne: p.sahne || null },
  };
}

/* ─── 4. AKIŞ — tek sayfanın dikey listesi ─── */

/** Sayfanın dikey akışı. Index 0 DAİMA sentezdir (ya da geçiş sayfasında
 *  yürünen yolun altın kutbu); altındakiler onu oluşturanlardır. Liste
 *  boşsa sayfa tek kartla yaşar — sahte satır eklenmez (§6.10). */
export function karAkis(kind) {
  if (kind === 'gecis') {
    const k = _aktifGecis();
    if (!k) return [];
    const out = [];
    const altin = _kutup(k.id, 'golden');
    const lapis = _kutup(k.id, 'lapis');
    if (altin) out.push(altin);
    if (lapis) out.push(lapis);
    // Mezun yollar: "artık o kişisin" beyanları, yürünen yolun altında durur.
    _deste('altin').forEach(e => { if (e && e._gk && e._gk.mezun) out.push(e); });
    return out;
  }
  const s = _sentez(kind);
  // Yalnız ORTA SAYFADA gösterilen kartın kutupları elenir — aynı kart iki
  // yerde iki şey söylemesin. Başka aktif geçişlerin kutupları KALIR: geçiş
  // sayfası ilk kartı konu edinir, ötekiler elenirse hiçbir sayfada görünmez
  // ve sessizce kaybolurlardı.
  const ortaId = (_aktifGecis() || {}).id || null;
  const deste = _deste(kind).filter(e => {
    if (!e || !e._gk) return true;
    if (e._gk.mezun) return true;
    return e._gk.kartId !== ortaId;
  });
  return (s ? [s] : []).concat(deste);
}

/* ─── 5. SAYFALAR ─── */

/** Akışın tamamı. Kartı olmayan sayfa doğmaz: geçiş sayfası yalnız
 *  yürünen yol varken, altın/lapis sayfaları sentez malzemesi
 *  çözülebildiğinde. Sentez "boş" olabilir (portre henüz onaylanmadı) —
 *  o hâlde kart sisli davet olarak yaşar, uydurulmaz. */
export function karSayfalar() {
  const out = [];
  KAR_KINDS.forEach(kind => {
    const akis = karAkis(kind);
    if (!akis.length) return;
    out.push({ kind, akis, sentez: akis[0] });
  });
  return out;
}

/* ─── 6. GİRDİ ÇÖZÜCÜSÜ ─── */

/** Akıştaki bir girdinin türü, kartı ve paleti. Üç tür vardır:
 *    sentez  — iki ana karttan biri (10f malzemesi)
 *    kutup   — geçiş kartının bir kutbu (yüzünü 10A çizer)
 *    katalog — kazanılmış/hedeflenmiş Kişi Kartı (yüzünü 12c çizer)
 *  Palet kartın KENDİ verisinden okunur; tüketici hiçbir şey geçirmese
 *  de doğru kutbu alır. */
export function karGirdiCoz(entry, kind) {
  if (!entry) return null;
  if (entry._sentez) {
    return {
      tur: 'sentez', card: entry.card, gk: null,
      palette: entry._sentez.kind === 'lapis' ? 'lapis' : 'gold',
      sahne: entry._sentez.sahne, empty: !!entry._sentez.empty,
      kind: entry._sentez.kind,
    };
  }
  if (entry._gk) {
    return {
      tur: 'kutup', card: entry, gk: entry._gk,
      palette: entry._gk.which === 'golden' ? 'gold' : 'lapis',
      sahne: null, empty: false, kind: kind || null,
    };
  }
  return {
    tur: 'katalog', card: entry, gk: null,
    palette: kind === 'lapis' ? 'lapis' : 'gold',
    sahne: null, empty: false, kind: kind || null,
  };
}

/** Sayfanın adı — etiket kartın üstünde durur, sayfa numarası YOKTUR
 *  (sayaç dili yasak; nerede olduğunu kartın kendisi söyler). */
export function karSayfaAdi(kind) {
  if (kind === 'altin') return t('kar.sayfa.altin', 'OLDUĞUN KİŞİ');
  if (kind === 'gecis') return t('kar.sayfa.gecis', 'GEÇİŞ KARTIM');
  return t('kar.sayfa.lapis', 'OLMAK İSTEDİĞİN KİŞİ');
}

/* ═══ KABUK — odanın kendisi ═══════════════════════════════════════════
   Portal, view DEĞİL: `switchView` odası olmayan hedefte ekranı boşaltır
   (route kapısı dersi) ve Bugün'ün kaydırma konumu kaybolurdu. Oda
   Bugün'ün ÜSTÜNE açılır, kapanınca altındaki ekran olduğu gibi durur.
   Kabuk `document.body`ye asılır — `.ws-body`nin padding kutusuna değil
   (sahne katmanı hapsi).
════════════════════════════════════════════════════════════════════════ */

const PORTAL_ID = 'kar-portal';

/* Oda açıkken yaşayan tekil durum — kapanışta hepsi sökülür. */
let _acik = null;          // { sayfalar, kind }
let _onKey = null;
let _sonOdak = null;

const _rm = () => {
  try { return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; }
  catch (_) { return false; }
};

function _portal() {
  let el = document.getElementById(PORTAL_ID);
  if (!el) { el = document.createElement('div'); el.id = PORTAL_ID; document.body.appendChild(el); }
  return el;
}

/* ─── 8. YÜZ — tek motor, iki çizici ─── */

/** Girdinin kart yüzü. Katalog ve sentez 12c'den, geçiş kutbu 10A'dan
 *  gelir; ikisi de TAM boydur (mini kart folyoyu ve künyeyi soyar).
 *  Motor yoksa yüz boş kalır — oda yine açılır, uydurma kart basılmaz. */
function _yuzHTML(coz, opts = {}) {
  if (!coz) return '';
  const mini = !!opts.mini;
  try {
    if (coz.tur === 'kutup') {
      return window.gkPoleFace?.(coz.gk.kartId, coz.gk.which,
        { mezun: coz.gk.mezun, tam: !mini }) || '';
    }
    return window.ikvCardFace?.(coz.card, {
      palette: coz.palette,
      mini,
      fog: coz.empty,
      star: coz.palette === 'lapis',
      sahne: coz.sahne || undefined,
      sub: (mini || coz.tur === 'sentez') ? '' : undefined,
    }) || '';
  } catch (_) { return ''; }
}

/** Bir akış girdisinin kart yüzü — dışarıdan da istenebilir. Bugün'ün
 *  hero'sundaki yığın (10f) bunu `mini: true` ile tüketir: yüz üretimi
 *  iki yerde ayrı yazılırsa iki ayrı kart dili doğar (§1.3). */
export function karYuz(entry, kind, opts = {}) {
  return _yuzHTML(karGirdiCoz(entry, kind), opts);
}

/** Hero yığınının malzemesi: sentezin ARKASINDA duran ilk kişiler.
 *  Sentez zaten kutbun ön yüzüdür — burada yalnız onu oluşturanlar döner. */
export function karYiginGirdileri(kind, n = 2) {
  const akis = karAkis(kind);
  return akis.slice(1, 1 + Math.max(0, n));
}

/** Sayfanın alt daveti — Emre'nin cümlesi altın sayfada verbatim durur.
 *  Davet yalnız GERÇEKTEN aşağıda biri varsa çizilir: boş bir vaadin
 *  düğmesi olmaz. */
function _davetMetni(kind) {
  if (kind === 'altin') return t('kar.davet.altin', 'OLDUĞUN KİŞİ’Yİ OLUŞTURANLARI GÖR');
  if (kind === 'gecis') return t('kar.davet.gecis', 'YOLUN ÖTEKİ UCUNU GÖR');
  return t('kar.davet.lapis', 'SENİ ÇAĞIRANLARI GÖR');
}

/* ─── 9. ÇİZİM ─── */

/* Tek kaynak: escapeHTML (00a). Eskiden bu modülün kendi ikizi vardı ve
   tek tırnağı hiç kaçırmıyordu — tek-tırnaklı attribute'ta açık bırakırdı. */
const _esc = escapeHTML;

function _katHTML(entry, kind, i, toplam) {
  const coz = karGirdiCoz(entry, kind);
  const yuz = _yuzHTML(coz);
  const ilk = i === 0;
  const etiket = ilk
    ? `<div class="kar-etiket">${_esc(karSayfaAdi(kind))}</div>`
    : '';
  // Davet yalnız İLK katta ve altında biri varken. Sayaç dili yok: kaç
  // kişi olduğu söylenmez, "aşağıda birileri var" denir.
  const davet = (ilk && toplam > 1)
    ? `<button type="button" class="kar-davet" data-kar-in="${_esc(kind)}">
         ${_esc(_davetMetni(kind))} <span aria-hidden="true">↓</span>
       </button>`
    : '';
  /* İKİ ANA KART ÇEVRİLMEZ (Emre, 2026-08-23).
     Sentez kartına dokunmak DETAY penceresini açar — altın kutup Portre'yi,
     lapis kutup Olmak İstediğin Kişi'yi. O pencereler zaten yaşıyordu; odaya
     giden yol açılınca onlara giden yol kapanmıştı (10f'nin `_acOda` fallback'i
     yalnız oda AÇILAMAZSA devreye giriyordu). Dört boyut detay penceresinde
     daha geniş durduğu için odada ikinci bir kopya tutulmaz: kap hiç
     kurulmaz — kurup CSS'le gizlemek iki davranış bırakırdı (klavye yine
     çevirir, `aria-pressed` yalan söyler).
     `karArkaHTML`'in sentez dalı SİLİNMEDİ: fonksiyon kutup ve katalog
     kartları için çalışmaya devam eder ve dış sözleşmedir (`window.karArkaHTML`
     + testler). Değişen, odanın onu sentez için ÇAĞIRMAMASI.

     Alt kartlar (onu oluşturanlar) eskisi gibi çevrilir — TEK flip kabı (K9):
     12c kartı zaten 3B'ye duyarlıdır, ikinci bir preserve-3d kabı holo
     tilt'iyle çakışır. Çevirme kabın işi, eğilme kartın. */
  const sentez = !!(coz && coz.tur === 'sentez');
  const kartHTML = sentez
    ? `<div class="kar-kart" data-kar-tur="sentez">
        <div class="kar-yuz kar-yuz--on kar-detay" data-kar-detay="${_esc(coz.kind || kind)}"
             role="button" tabindex="0"
             aria-label="${_esc(_detayAria(coz.kind || kind))}">${yuz}</div>
      </div>`
    : `<div class="kar-kart" data-kar-tur="${_esc(coz ? coz.tur : '')}">
        <div class="kar-flip" data-kar-flip role="button" tabindex="0"
             aria-label="${_esc(t('kar.aria.cevir', 'Kartı çevir'))}" aria-pressed="false">
          <div class="kar-yuz kar-yuz--on">${yuz}</div>
          <div class="kar-yuz kar-yuz--arka" aria-hidden="true">${karArkaHTML(entry, kind)}</div>
        </div>
      </div>`;
  return `<article class="kar-kat${ilk ? ' kar-kat--bas' : ''}" data-kar-kat="${i}"
                   aria-label="${_esc(entry && entry.name || '')}">
    ${etiket}
    ${kartHTML}
    ${sentez ? _yolButonHTML(coz.kind || kind) : ''}
    ${davet}
  </article>`;
}

/** Sentez kartının erişilebilir adı — hangi pencereyi açtığını SÖYLER.
 *  "Kartı çevir" artık yalan olurdu. */
function _detayAria(kind) {
  return kind === 'lapis'
    ? t('kar.aria.detay_lapis', 'Olmak İstediğin Kişi — ayrıntıları aç')
    : t('kar.aria.detay_altin', 'Olduğun Kişi — ayrıntıları aç');
}

/** İKİ ANA KARTIN ARASINDAKİ YOL — masaya açılan buton (Emre, 2026-08-23).
 *
 *  Masa (`gkOpenDetail`, 10A) yaşıyordu ama odada tek kapısı geçiş kutbunun
 *  ARKA YÜZÜNDEKİ "BU YOLU AÇ" düğmesiydi: kullanıcının önce orta sayfaya
 *  gitmesi, sonra kartı çevirmesi gerekiyordu. Buton yolu doğrudan açar.
 *  Kanıt kapısı: yürünen bir geçiş yoksa buton ÇİZİLMEZ — olmayan bir yolun
 *  düğmesi olmaz (§6.10). Palet sayfanın kutbudur: kullanıcı hangi kutupta
 *  duruyorsa masada o yüz öne gelir. */
function _yolButonHTML(kind) {
  const k = _aktifGecis();
  if (!k || !k.id) return '';
  const pal = kind === 'lapis' ? 'lapis' : 'gold';
  return `<button type="button" class="kar-yol kar-yol--${pal}"
             data-kar-yol="${_esc(k.id)}" data-kar-yol-pal="${pal}">
    ${_esc(t('kar.yol', 'ARADAKİ YOLU AÇ'))}
  </button>`;
}

function _sayfaHTML(sayfa) {
  const kats = sayfa.akis.map((e, i) => _katHTML(e, sayfa.kind, i, sayfa.akis.length)).join('');
  return `<section class="kar-sayfa" data-kar-sayfa="${_esc(sayfa.kind)}"
                   aria-label="${_esc(karSayfaAdi(sayfa.kind))}">
    <div class="kar-dikey" data-kar-dikey="${_esc(sayfa.kind)}">${kats}</div>
  </section>`;
}

/* ═══ ARKA YÜZ — kart döndüğünde ne yazıyor ═══════════════════════════
   Üç girdi türünün üçü de aynı DÖRT BOYUTU taşır ama üç ayrı sözcükle:
   katalog `hisler` der, kutup ve portre `duygular`. Çeviri TEK yerdedir
   (`_dortBoyut`) — `gkPoleAsCard`'ın simetriği, tek farkı KAYNAK izini
   (`src`) düşürmemesidir: kimin cümlesi olduğu ekranda görünecek (§6.10).
     «…» kullanıcının kendi cümlesi · kitabın metni tırnaksız durur.
═══════════════════════════════════════════════════════════════════════ */

const DORT = ['dusunceler', 'inanclar', 'hisler', 'davranislar'];
const DORT_GLYPH = { dusunceler: '◉', inanclar: '✦', hisler: '❖', davranislar: '⟡' };

/** Maddeleri tek şekle indirger: düz string (katalog) ve {text,src} (kutup,
 *  portre, OİK) aynı listeye iner; boş/tek harflik gürültü elenir. */
function _maddeler(arr) {
  return (Array.isArray(arr) ? arr : [])
    .map(e => (e && typeof e === 'object')
      ? { text: e.text, kullanici: e.src === 'user' }
      : { text: e, kullanici: false })
    .filter(x => typeof x.text === 'string' && x.text.trim().length > 1);
}

function _dortBoyut(o) {
  if (!o) return null;
  const d = {
    dusunceler:  _maddeler(o.dusunceler),
    inanclar:    _maddeler(o.inanclar),
    hisler:      _maddeler(o.hisler || o.duygular),
    davranislar: _maddeler(o.davranislar),
  };
  return DORT.some(k => d[k].length) ? d : null;
}

/** Geçiş kartını id'siyle bul — aktif ve mezun havuzların ikisinde de arar
 *  (mezun kartın kutbu altın destede yaşar). */
function _gkKart(id) {
  const ara = (arr) => (Array.isArray(arr) ? arr : []).find(k => k && k.id === id) || null;
  try { return ara(window.gkActiveCards?.()) || ara(window.gkCompletedCards?.()); }
  catch (_) { return null; }
}

/** Sentez kartının ham malzemesi: altın kutup PORTREdir (02c), lapis kutup
 *  OİK kartıdır (10D). İkisi de dört boyutu `duygular` sözcüğüyle taşır. */
function _sentezKaynak(kind) {
  if (kind === 'lapis') {
    try { return window.oikGetCard?.() || null; } catch (_) { return null; }
  }
  return (S && S._portre) || null;
}

/** 10q'nun blok başlıkları glyph'i metnin İÇİNDE taşır ('◉ GERÇEK HAYATTA').
 *  Kart arkasında bloklar ve dört boyut alt alta durduğu için o glyph'ler
 *  boyut glyph'leriyle çakışır (◉ · ⟡ ikisinde de var). Sözlüğü ikizlemek
 *  yerine baştaki işaret burada sökülür; ayrım renk ve ölçüyle kurulur. */
function _glyphsiz(x) {
  return String(x == null ? '' : x).replace(/^[^\p{L}\p{N}]+/u, '').trim();
}

function _boyutHTML(d) {
  return DORT.map(k => {
    const items = d[k];
    if (!items.length) return '';
    return `<div class="kar-boyut">
      <div class="kar-boyut-h"><span aria-hidden="true">${DORT_GLYPH[k]}</span> ${_esc(t('kk.dim.' + k, k))}</div>
      <ul>${items.slice(0, 5).map(it => `<li${it.kullanici ? ' class="kar-benim"' : ''}>${
        it.kullanici ? '«' + _esc(it.text) + '»' : _esc(it.text)
      }</li>`).join('')}</ul>
    </div>`;
  }).join('');
}

/** Kartın arka yüzü. İçerik girdinin türünden gelir; hiçbir alan
 *  UYDURULMAZ — olmayan bölüm hiç çizilmez (§6.10). */
export function karArkaHTML(entry, kind) {
  const coz = karGirdiCoz(entry, kind);
  if (!coz) return '';

  let ad = coz.card?.name || '';
  let fisilti = '';
  let govde = '';
  let dort = null;
  let kok = '';
  let masa = null;

  if (coz.tur === 'katalog') {
    const c = coz.card;
    fisilti = c.whisper || '';
    if (c.portre) govde += `<p class="kar-portre">${_esc(c.portre)}</p>`;
    if (c.gercek) govde += `<div class="kar-blok"><span class="kar-blok-h">${
      _esc(_glyphsiz(t('kk.det.real_life', '◉ GERÇEK HAYATTA')))}</span>${_esc(c.gercek)}</div>`;
    if (c.olunca) govde += `<div class="kar-blok"><span class="kar-blok-h">${
      _esc(_glyphsiz(t('kk.det.when_become', '⟡ SEN BU KİŞİ OLDUĞUNDA')))}</span>${_esc(c.olunca)}</div>`;
    dort = _dortBoyut(c);
    kok = c.kok || '';
  } else if (coz.tur === 'kutup') {
    const k = _gkKart(coz.gk.kartId);
    const pole = k && k[coz.gk.which === 'golden' ? 'golden' : 'lapis'];
    ad = (pole && pole.baslik) || ad;
    fisilti = (pole && pole.whisper) || '';
    dort = _dortBoyut(pole);
    // Masaya açılan kapı. Eskiden Bugün'deki köprü ışığıydı; bölüm sökülünce
    // yolun çalışma yüzeyine giden tek yol kapanacaktı. Yürünmemiş yol
    // (mezun değil) masada DÜZENLENİR, mezun olan salt-okunur açılır — kapıyı
    // 10A'nın kendi kuralı karşılar, burada yalnız çağrılır.
    masa = coz.gk;
  } else {
    const kaynak = _sentezKaynak(coz.kind);
    fisilti = (kaynak && (kaynak.whisper || kaynak.baslik)) || coz.card?.whisper || '';
    dort = _dortBoyut(kaynak);
  }

  const bos = !govde && !dort;
  const govdeHTML = bos
    // Boş arka yüz sessiz kalmaz: kartın henüz doldurulmadığını SÖYLER.
    // Uydurma madde basmak yerine davet — sayı da vaat de yok.
    ? `<p class="kar-arka-bos">${_esc(coz.tur === 'katalog'
        ? t('kar.arka.bos_kart', 'Bu kişinin sayfası henüz yazılmadı.')
        : t('kar.arka.bos', 'Burası senin cümlelerinin yeri.'))}</p>`
    : govde + (dort ? _boyutHTML(dort) : '');

  return `<div class="kar-arka kar-arka--${coz.palette === 'lapis' ? 'lapis' : 'gold'}">
    <div class="kar-arka-ic">
      <div class="kar-arka-ad">${_esc(ad)}</div>
      ${fisilti ? `<div class="kar-arka-fis">${_esc(fisilti)}</div>` : ''}
      ${govdeHTML}
      ${masa ? `<button type="button" class="kar-masa"
                  data-kar-masa="${_esc(masa.kartId)}"
                  data-kar-masa-pal="${masa.which === 'golden' ? 'gold' : 'lapis'}">${
                  _esc(t('kar.masa', 'BU YOLU AÇ'))}</button>` : ''}
      ${kok ? `<div class="kar-kok">${_esc(_glyphsiz(t('kk.det.source', '◆ KAYNAK ·')))} ${_esc(kok)}</div>` : ''}
    </div>
  </div>`;
}

/* ─── 10. AÇ / KAPAT ─── */

/** Odayı aç. `kind` hangi sayfanın önde açılacağını söyler (hero'da hangi
 *  kutba dokunulduysa o). Sayfa doğmamışsa akışın başına düşülür. */
export function karAc(kind = 'altin') {
  const sayfalar = karSayfalar();
  if (!sayfalar.length) return false;          // gösterilecek kart yok — oda açılmaz
  // Oda zaten açıksa YENİDEN kurulmaz, yalnız sayfa değişir: yeniden kurmak
  // ikinci bir keydown dinleyicisi asar ve kullanıcının bulunduğu katı siler.
  if (karAcikMi()) { _gitSayfa(kind); return true; }
  try { window.ikvEnsureStyles?.(); } catch (_) {}

  _sonOdak = document.activeElement;
  const el = _portal();
  el.className = 'kar-portal';
  // Nokta göstergesi tek sayfada çizilmez — gezinecek yer yokken konum
  // göstergesi bilgi değil süstür.
  const noktalar = sayfalar.length > 1
    ? `<div class="kar-noktalar" aria-hidden="true">${sayfalar.map(sf =>
        `<span class="kar-nokta" data-kar-nokta="${_esc(sf.kind)}" data-kind="${_esc(sf.kind)}"></span>`
      ).join('')}</div>`
    : '';
  el.innerHTML = `
    <div class="kar-sahne" aria-hidden="true"></div>
    <div class="kar-yatay" data-kar-yatay>${sayfalar.map(_sayfaHTML).join('')}</div>
    ${noktalar}
    <button type="button" class="kar-kapat" data-kar-kapat
            aria-label="${_esc(t('kar.aria.kapat', 'Kapat'))}">✕</button>`;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', _esc(t('kar.aria.oda', 'Karşılaşma')));

  _acik = { sayfalar, kind };
  document.documentElement.classList.add('kar-kilit');   // arkadaki ekran kaymasın
  _bind(el);
  // İmleç sayfaya ANINDA konur: snap animasyonuyla açılış birbirini ezer.
  _gitSayfa(kind, false);
  try { window.wtOverlayOpen?.('karsilasma'); } catch (_) {}
  try { window.fxCue?.('whoosh'); } catch (_) {}   // bir yere GİRİLİR
  // Holo tilt tam boy kartın hakkı (mini kartta bilerek soyulur).
  try { window.ikvHoloScan?.(el); } catch (_) {}
  try { window.ikvMotionScan?.(el); } catch (_) {}
  const ilk = el.querySelector('.kar-sayfa[data-kar-sayfa="' + kind + '"] .kar-dikey') ||
              el.querySelector('.kar-dikey');
  try { ilk?.focus?.(); } catch (_) {}
  return true;
}

export function karKapat() {
  const el = document.getElementById(PORTAL_ID);
  // Dinleyici ve kilit portalın VARLIĞINA bağlanmaz: portal başka bir yolla
  // DOM'dan koparsa (ekran yeniden basıldı, kabuk temizlendi) erken dönen bir
  // kapanış tuş dinleyicisini document'te bırakır — ok tuşları o andan sonra
  // görünmeyen bir odayı sürükler. Önce sök, sonra düğüme bak.
  if (_onKey) { document.removeEventListener('keydown', _onKey); _onKey = null; }
  document.documentElement.classList.remove('kar-kilit');
  if (!el) { _acik = null; _sonOdak = null; return; }
  try { window.wtOverlayClose?.('karsilasma'); } catch (_) {}
  el.remove();
  _acik = null;
  // Oda açıkken deste değişmiş olabilir (kart kazanıldı, hedef mühürlendi).
  // Oda BİLEREK yerinde tazelenmez — kullanıcının bulunduğu katı silmek onu
  // kaybeder; ama kapanışta arkadaki zemin güncellenir.
  try { window.yolRenderHero?.(); } catch (_) {}
  // Odak odayı açan düğmeye döner; düğüm bu arada yeniden çizildiyse
  // (hero tazelendi) hiçbir yere zorlamayız.
  try { if (_sonOdak?.isConnected) _sonOdak.focus(); } catch (_) {}
  _sonOdak = null;
}

export function karAcikMi() { return !!document.getElementById(PORTAL_ID); }

/** Kartı çevir. Arka yüz ekran okuyucuya ancak GÖRÜNÜR olduğunda açılır;
 *  aksi hâlde iki yüz de aynı anda okunur ve kart iki kez anlatılır. */
export function karCevir(flip) {
  if (!flip || !flip.classList) return;
  const acik = flip.classList.toggle('is-arka');
  flip.setAttribute('aria-pressed', acik ? 'true' : 'false');
  const on = flip.querySelector('.kar-yuz--on');
  const arka = flip.querySelector('.kar-yuz--arka');
  if (on) on.setAttribute('aria-hidden', acik ? 'true' : 'false');
  if (arka) arka.setAttribute('aria-hidden', acik ? 'false' : 'true');
  try { window.fxCue?.('tap'); } catch (_) {}
}

/* ─── 11. GEZİNME ─── */

function _yatayEl() { return document.querySelector('#' + PORTAL_ID + ' [data-kar-yatay]'); }

/** Yanan noktayı taşı. Parmakla kayan sayfa da, klavye de buradan geçer —
 *  iki yol ayrı yazılırsa biri güncellenip öteki unutulur. */
function _noktaYak(kind) {
  document.querySelectorAll('#' + PORTAL_ID + ' [data-kar-nokta]').forEach(n => {
    n.classList.toggle('is-on', n.dataset.karNokta === kind);
  });
}

function _gitSayfa(kind, yumusak = true) {
  const yatay = _yatayEl();
  if (!yatay || !_acik) return;
  let at = _acik.sayfalar.findIndex(s => s.kind === kind);
  if (at < 0) at = 0;
  _acik.kind = _acik.sayfalar[at].kind;
  _noktaYak(_acik.kind);
  const x = at * yatay.clientWidth;
  const smooth = yumusak && !_rm();
  try { yatay.scrollTo({ left: x, behavior: smooth ? 'smooth' : 'auto' }); }
  catch (_) { yatay.scrollLeft = x; }
}

/** Yatayda komşu sayfaya geç (yon: -1 sol, +1 sağ). */
export function karKaydir(yon) {
  if (!_acik) return;
  const at = _acik.sayfalar.findIndex(s => s.kind === _acik.kind);
  const hedef = Math.max(0, Math.min(_acik.sayfalar.length - 1, (at < 0 ? 0 : at) + (yon > 0 ? 1 : -1)));
  _gitSayfa(_acik.sayfalar[hedef].kind);
}

/** Dikeyde komşu kata geç. Kat yüksekliği ekran boyudur — snap zaten
 *  hizalar, biz yalnız bir ekran ötelemeyi başlatırız. */
function _gitKat(yon) {
  const dikey = document.querySelector(
    '#' + PORTAL_ID + ' .kar-sayfa[data-kar-sayfa="' + (_acik ? _acik.kind : '') + '"] .kar-dikey');
  if (!dikey) return;
  const smooth = !_rm();
  try { dikey.scrollBy({ top: yon * dikey.clientHeight, behavior: smooth ? 'smooth' : 'auto' }); }
  catch (_) { dikey.scrollTop += yon * dikey.clientHeight; }
}

/** İki ana karttan birinin DETAY penceresini açar.
 *
 *  Hedefler yeni değildir: `portre` (02c) ve `oik` (10D) ekranları zaten
 *  yaşıyordu — 10f'nin `_acOda` fallback'i onları yalnız oda AÇILAMAZSA
 *  çağırıyordu, yani oda açıldığı andan itibaren o kapılar kullanıcıya
 *  kapanmıştı. `oik` kanonik addır; `arketip` eski alias'tır (12a:668) ve
 *  yeni kodda kullanılmaz (§4.3: tek ad, tek gerçek).
 *  Oda önce kapanır — route kapısı bir ekranı değiştirirken odanın üstte
 *  asılı kalması iki tam ekran yüzey bırakırdı. */
function _detayAc(kind) {
  const hedef = kind === 'lapis' ? 'oik' : 'portre';
  karKapat();
  try { window.switchView?.(hedef); } catch (_) {}
}

/* ─── 12. BAĞLAMA ─── */

function _bind(el) {
  el.addEventListener('click', (e) => {
    const kapat = e.target.closest('[data-kar-kapat]');
    if (kapat) { karKapat(); return; }
    const davet = e.target.closest('[data-kar-in]');
    if (davet) { _gitKat(1); return; }
    const masa = e.target.closest('[data-kar-masa]');
    if (masa) {
      e.stopPropagation();                       // kartı çevirmesin — o başka bir jest
      const id = masa.dataset.karMasa, pal = masa.dataset.karMasaPal || 'gold';
      karKapat();                                // iki tam ekran üst üste durmaz
      try { window.gkOpenDetail?.(pal, id); } catch (_) {}
      return;
    }
    // İki ana kartın arasındaki yol → masa. Kutup kartının arka yüzündeki
    // "BU YOLU AÇ" ile aynı kapı, farkı: buraya varmak için kart çevirmek
    // gerekmez.
    const yol = e.target.closest('[data-kar-yol]');
    if (yol) {
      const id = yol.dataset.karYol, pal = yol.dataset.karYolPal || 'gold';
      karKapat();                                // iki tam ekran üst üste durmaz
      try { window.gkOpenDetail?.(pal, id); } catch (_) {}
      return;
    }
    // Sentez kartı → detay penceresi. Oda ÖNCE kapanır: `switchView` bir
    // ekran değiştirir, oda onun üstünde asılı kalırsa kullanıcı görünmeyen
    // bir sayfanın üstünde durur.
    const detay = e.target.closest('[data-kar-detay]');
    if (detay) { _detayAc(detay.dataset.karDetay); return; }
    const flip = e.target.closest('[data-kar-flip]');
    if (flip) { karCevir(flip); return; }
  });

  // Klavye: kart bir düğmedir. Alt kartlarda Enter/Space onu ÇEVİRİR,
  // sentez kartında DETAYI açar — ikisi de aynı jestin iki anlamı.
  // Ok tuşları gezinmeye ait olduğu için burada YUTULMAZ.
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const detay = e.target.closest?.('[data-kar-detay]');
    if (detay) { e.preventDefault(); _detayAc(detay.dataset.karDetay); return; }
    const flip = e.target.closest?.('[data-kar-flip]');
    if (!flip) return;
    e.preventDefault();
    karCevir(flip);
  });

  // Yatay imleç kullanıcının parmağıyla da değişir: hangi sayfada
  // olduğumuzu scroll'dan okuruz, yoksa klavye ile parmak birbirini ezer.
  const yatay = el.querySelector('[data-kar-yatay]');
  if (yatay) {
    let tik = null;
    yatay.addEventListener('scroll', () => {
      if (tik) return;
      tik = requestAnimationFrame(() => {
        tik = null;
        if (!_acik || !yatay.clientWidth) return;
        const at = Math.round(yatay.scrollLeft / yatay.clientWidth);
        const s = _acik.sayfalar[Math.max(0, Math.min(_acik.sayfalar.length - 1, at))];
        if (s && s.kind !== _acik.kind) {
          _acik.kind = s.kind;
          _noktaYak(s.kind);
          try { window.fxCue?.('tap'); } catch (_) {}
        }
      });
    }, { passive: true });
  }

  _onKey = (e) => {
    if (!karAcikMi()) return;
    if (e.key === 'Escape')      { e.preventDefault(); karKapat(); }
    else if (e.key === 'ArrowLeft')  { e.preventDefault(); karKaydir(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); karKaydir(1); }
    else if (e.key === 'ArrowDown')  { e.preventDefault(); _gitKat(1); }
    else if (e.key === 'ArrowUp')    { e.preventDefault(); _gitKat(-1); }
  };
  document.addEventListener('keydown', _onKey);
}

/* ─── 7. WINDOW ─── */
if (typeof window !== 'undefined') {
  window.karSayfalar    = karSayfalar;
  window.karAkis        = karAkis;
  window.karGirdiCoz    = karGirdiCoz;
  window.karSayfaAdi    = karSayfaAdi;
  window.karAc          = karAc;
  window.karKapat       = karKapat;
  window.karKaydir      = karKaydir;
  window.karAcikMi      = karAcikMi;
  window.karArkaHTML    = karArkaHTML;
  window.karCevir       = karCevir;
  window.karYuz         = karYuz;
  window.karYiginGirdileri = karYiginGirdileri;
}
