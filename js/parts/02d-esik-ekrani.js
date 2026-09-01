// Wanderer AI — EŞİK EKRANI (02d) · "İki Kart Arasında"
// ════════════════════════════════════════════════════════════════════════════
// Uygulamanın eşiği — girmek bir odaya girmek değil, bir EŞİKTEN geçmektir;
// bu yüzden karşılama Studio'nun kapısından alınıp girişin kendisine, dil
// modelinin ön yüzüne taşındı (Emre'nin kararı, 2026-08-26). Kullanıcıyı ilk
// karşılayan şey sohbet kutusu değil, kitabın çekirdek tezi olsun:
// solda ALTIN kart = OLDUĞUN KİŞİ (şimdi), sağda LAPİS kart = OLMAK İSTEDİĞİN
// KİŞİ (gelecek). İkisinin arasında yol çubuğu (yakınlık %'si), altında bugünün
// köprüsü: "O KİŞİ İÇİN BUGÜN" — kitabın DÖRT BOYUTU (Düşünce · İnanç · Duygu ·
// Davranış). Dördü de birer kapıdır: tıklayınca OİK'te (10D) o boyutun PENCERESİ
// açılır (window.oikOpenDim → oikOpenDimPanel). Köprü eskiden değişken bir görev
// listesiydi; artık sabit dört soru — çünkü değişen liste değil, kullanıcının o
// boyutu ne kadar doldurduğudur.
//
// Veri kaynakları (hepsi opsiyonel, olan gösterilir):
//   • imGetCurrent (13l)          → gözlemlenen kimlik kartı (altın)
//   • S._portre (02c)        → onaylı Portre başlığı (altın fallback)
//   • S._kisiKarti.closest (10q)  → en yakın sahipsiz kart (lapis)
//   • S._personTransition.desired → kullanıcının kendi cümlesi (alıntı)
//   • CAT_KEYS/CAT_SIGILS (10D)   → köprünün dört boyutu (ad + mühür dili)
//   • dgKapi('esik') (13D, FAZ 16) → günün ışık dozu (metin YOK, yalnız ışık)
//
// Akış: 03-auth-shell initApp'in kuyruğu esikShowOnce()'ı çağırır — HER
// girişte bir kez, perde arkasında. Kapı GÜN değil GİRİŞTİR: uygulamayı
// kapatmadan Sohbet ↔ Studio arasında gezinen kullanıcıya Eşik ikinci kez
// açılmaz (sayfa ömrü bayrağı), yeni gösterim yeni boot ister.
// Overlay .sc-onb sınıfını taşır → 10s/10t ritüelleri
// kapanana dek kendini erteler; kapanışta glRunDailyRitual/smRunDaily
// yeniden tetiklenir (idempotent).
// Konvansiyon: metinler i18n t() üzerinden (TR/EN); stiller JS-enjekte; window.esik* expose.
// ════════════════════════════════════════════════════════════════════════════

import { S } from '../state.js';
import { t } from './15-i18n.js';
import { ikvCardFace, ikvEnsureStyles } from './12c-kart-gorsel.js';
import { getCardById, getFullDeck, deckReady, RARITIES } from './12b-kart-destesi.js';
// Dört boyutun kanonik listesi + mühür dili 10D'nin sözleşmesidir — köprü
// kendi kopyasını tutmaz, adı ve işareti aynı yerden okur.
import { CAT_KEYS, CAT_SIGILS } from './10D-olmak-istedigin.js';

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const _rarLabel = (rar) => rar ? t('deck.rarity.' + rar.id, rar.label) : undefined; // K7 köprüsü (12b RARITIES)

// Altın altyazının "kaç gündür" sayısı buradan çıkar (imGetCurrent().since farkı)
const DAY_MS = 24 * 60 * 60 * 1000;

/* ══════════════════════════════════════════════════════════════
   VERİ TOPLAYICILAR — olan neyse onu göster, hiçbiri zorunlu değil
══════════════════════════════════════════════════════════════ */

/** ALTIN kutup — şu an olduğu kişi. "Olunan [Ad]" (Portre 2.0) > persona kartı.
 *  Altın kimlik birliği: onaylı Portre varsa altın kart HEP odur;
 *  Kimlik Motoru'nun çözdüğü persona kartın İÇİNDE yaşar (nadirlik ışığı). */
function _goldData() {
  let cur = null;
  try { cur = window.imGetCurrent?.() || null; } catch (_) {}

  const c = S._portre;
  if (c?.confirmed && c.baslik) {
    // Altyazı: Portre kimliği kullanıcının kendi kaleminden gelir; Kimlik
    // Motoru bir persona çözdüyse altyazı onu ve SÜRESİNİ söyler — kart adı
    // kim olduğunu, altyazı bunu neyin söylediğini taşır.
    let caption = t('esik.gold.portre_cap');
    const rar = cur?.card ? (RARITIES[cur.card.rarity] || null) : null;
    if (cur?.card) {
      const days = Math.max(0, Math.floor((Date.now() - (Date.parse(cur.since || 0) || Date.now())) / DAY_MS));
      caption = (days > 0
        ? t('esik.gold.persona_cap').replace('{n}', days)
        : t('esik.gold.persona_cap_today')
      ).replace('{persona}', cur.card.name);
    }
    let name = c.baslik;
    try { if (window.porCardName) name = window.porCardName(); } catch (_) {}
    return {
      // sahne kartın içinde — ikvScene `card.sahne`'yi kendisi okur (12c)
      card: { id: 'esik-portre', name, glyph: 'wanderer', category: 'cekirdek', virtue: 'yansima', sahne: c.sahne || undefined, yuz: true },
      sub: c.baslik,
      caption,
      rar,
    };
  }

  // Geriye düşüş — Portre onaysız/boşken eski persona-öncelikli zincir
  if (cur && cur.card) {
    const days = Math.max(0, Math.floor((Date.now() - (Date.parse(cur.since || 0) || Date.now())) / DAY_MS));
    return {
      card: cur.card,
      sub: cur.card.whisper || '',
      caption: days > 0 ? t('esik.gold.days_since').replace('{n}', days) : t('esik.gold.today'),
      rar: RARITIES[cur.card.rarity] || null,
    };
  }
  return null;
}

/* "Kendi cümlen" bloğunun GERÇEK kaynağı: OİK kartının dört boyutuna yazılmış
   maddeler. Burada eskiden `oikGetDesired().description` dururdu — o alan
   kartın BAŞLIĞIDIR (10D `oikGetDesired`), üstelik 10D aynı başlığı
   `_personTransition.desired.description`'a da yazar (10D `_syncPersonTransition`
   dalı): yani iki ayrı "kaynak" tek ve aynı addı. Blok bu yüzden hemen
   üstündeki lapis kartın adını tırnak içinde ikinci kez söylüyor, altına da
   "kendi cümlen" imzası atıyordu.
   Kullanıcının GERÇEKTEN yazdığı cümleler kartın maddeleridir ({text, src, at});
   en TAZE olan konuşur ve imza kaynağına göre değişir — kendi kalemi mi, yoksa
   Emre'nin o boyuta yazdığı satır mı (§6.10: imza kökeni yansıtmak zorundadır,
   kaynağı kullanıcı olmayan metin "kendi cümlen" diye imzalanamaz). */
function _kartinTazeCumlesi(oik) {
  if (!oik) return null;
  let en = null;
  for (const k of CAT_KEYS) {
    for (const e of (oik[k] || [])) {
      const txt = (typeof e === 'string' ? e : (e && e.text) || '').trim();
      if (!txt) continue;
      const at = Date.parse(e && e.at) || 0;
      if (!en || at > en.at) en = { txt, at, emre: (e && e.src) === 'emre' };
    }
  }
  return en;
}

/** LAPİS kutup — olmak istediği kişi. OİK kartı (10D) > en yakın kart > kendi cümlesi. */
function _lapisData() {
  // Alıntı bloğunun iki yedek kaynağı (asıl kaynak _kartinTazeCumlesi'dir).
  // İkisi de bir BAŞLIK taşıyabilir — o yüzden aşağıda `_cumleMi` kapısından
  // geçmeden hiçbiri alıntı sayılmaz.
  const ownWords = (S._personTransition?.desired?.description || '').trim();
  const oikDesc = (window.oikGetDesired?.()?.description || '').trim();
  const closest = S._kisiKarti?.closest;
  // ANA MESAFE (13x) — iki kutup arasındaki TEK sayı. Burada eskiden
  // `closest.score` dururdu: tek bir kartın ham reçete ortalaması, üstelik
  // hemen üstündeki çubuk onu hiç saymıyordu (sabit gradyan). Çubuğun ve
  // metnin ölçtüğü şey artık aynı: hedeflediğin kişilerin niyet-ağırlıklı
  // hazırlığı — "olmak istediğin kişiye ne kadar yakınsın".
  let _score = null;
  try { const v = window.msAnaMesafe?.(); if (typeof v === 'number' && isFinite(v)) _score = v; } catch (_) {}

  // LAPİS KİMLİK BİRLİĞİ (altın taraftaki Portre önceliğinin ikizi):
  // OİK kartı varsa lapis kutup HEP odur — "en yakın kart" onu ezemez
  // (10f `_lapisPole` ile aynı sıra). Yakınlık ölçüsü yine closest'tan
  // gelir; kimlik ile ölçü ayrı kaynaklardır.
  let oik = null;
  try { oik = window.oikGetCard?.() || null; } catch (_) {}
  if (oik && oik.baslik) {
    let name = oik.baslik;
    try { name = window.oikCardName?.() || oik.baslik; } catch (_) {}
    // Önce kartın maddeleri (gerçek cümleler), sonra legacy alan — ve her iki
    // yolda da kartın ADINI tekrar eden metin alıntı sayılmaz.
    const _cumleMi = (s) => s && s !== oik.baslik && s !== name;
    const taze = _kartinTazeCumlesi(oik);
    let kendiCumlesi = '', emreninKalemi = false;
    if (taze && _cumleMi(taze.txt)) { kendiCumlesi = taze.txt; emreninKalemi = taze.emre; }
    else if (_cumleMi(ownWords)) kendiCumlesi = ownWords;
    else if (_cumleMi(oikDesc)) kendiCumlesi = oikDesc;
    return {
      card: { id: 'esik-oik', name, glyph: 'wanderer', category: 'cekirdek',
              virtue: 'odak', sahne: oik.sahne || undefined, yuz: true },
      sub: oik.baslik, score: _score, desired: kendiCumlesi, desiredEmre: emreninKalemi, rar: null,
    };
  }

  // Buradan aşağısı OİK kartının OLMADIĞI dallardır — orada oikGetDesired()
  // zaten legacy aynasından okur, yani oikDesc ile ownWords aynı kaynaktır.
  const cumle = ownWords || oikDesc;

  let card = null;
  if (closest?.cardId) { try { card = getCardById(closest.cardId); } catch (_) {} }
  if (card) {
    return {
      card,
      sub: card.whisper || '',
      score: _score,
      desired: cumle,
      rar: RARITIES[card.rarity] || null,
    };
  }
  if (cumle) {
    return {
      card: { id: 'esik-desired', name: t('esik.lapis.desired_name'), glyph: 'wanderer', category: 'cekirdek' },
      sub: '', score: null, desired: cumle, rar: null,
    };
  }
  return null;
}

/* Köprü — "o kişi için bugün" DÖRT BOYUT.
   Eskiden burası değişken bir görev listesiydi (bugünün sözleri + en yakın
   kartın eksik adımları + ritüel doldurucuları, en çok 3 satır): her gün başka
   bir şey söylüyor, kullanıcıya "bugün şunu yap" diye ödev veriyordu. Oysa
   eşiğin sorusu tek ve her gün aynı: o kişi gibi düşünüyor, inanıyor,
   hissediyor, davranıyor musun? Kitabın dört boyutu (Portre'nin de OİK'in de
   kategorileri) artık köprünün kendisidir — dördü de sabit durur, çünkü
   değişen liste değil, kullanıcının o boyutu ne kadar doldurduğudur.
   Her satır bir kapıdır: OİK'te o boyutun penceresini açar (oikOpenDim). */
function _bridgeDims() {
  return CAT_KEYS.map(k => ({
    cat: k,
    glyph: CAT_SIGILS[k],
    title: t('esik.dim.' + k + '.title'),
    note: t('esik.dim.' + k + '.note'),
  }));
}

/* Dört kapının dizilimi ÖLÇÜMLE seçilir, media query ile değil: sahnenin boyu
   ekran boyutundan değil İÇERİKTEN gelir — alıntı bloğu var mı, kart kaç
   piksel (genişliğe VE yüksekliğe bağlı), hangi dilde kaç satır sarıyor.
   Sabit bir eşik (`min-height:900px`) bu yüzden ya erken ya geç tetiklenirdi.
   Asıl dizilim alt alta listedir; taşma varsa kapılar iki sütuna toplanır.
   Sınıf her ölçümde önce SÖKÜLÜR — pencere büyüyünce eşik listeye geri döner. */
function _fitBridge(overlay) {
  const bridge = overlay?.querySelector('.esik-bridge');
  if (!bridge) return;
  bridge.classList.remove('esik-bridge--kare');
  // +1: subpixel yuvarlaması taşma sanılmasın
  if (overlay.scrollHeight > overlay.clientHeight + 1) bridge.classList.add('esik-bridge--kare');
}

/* ══════════════════════════════════════════════════════════════
   EKRAN — açılış perdesinin arkasında hazırlanır, perde kalkınca açılır
══════════════════════════════════════════════════════════════ */
let _esikOpen = false;
// Eşiğin nabzı: açılış anını taşır — kapanışta gerçek süre bunun farkından çıkar.
let _esikShownAt = 0;
// Girişin kapısı: sayfa ömrü boyunca TEK gösterim. Modül yeniden yüklenmeden
// (yani uygulama yeniden açılmadan) sıfırlanmaz.
let _bootAcildi = false;
// Kutupların hidre olması için tavan — perde en çok 4 sn, kkInit/imInit ~2 sn.
const KUTUP_TAVAN = 8000;

/* GİRİŞ KAPISI — uygulamaya her girişte bir kez (03-auth-shell initApp).
   İki şeyi birden guard eder:
     • Tekrar: Sohbet ↔ Studio gezinmesi Eşik'i yeniden açmaz; ölçü GÜN değil
       GİRİŞTİR (Emre'nin kararı, 2026-08-26) — bir sonraki gösterim yeni bir
       boot ister (reload / uygulamayı kapatıp açma).
     • Yarış: esikShow'un "gösterecek kutup yok" kapısı overlay'den ÖNCE
       çalışır; boot'ta kkInit/imInit hidrasyonundan önce çağrılsaydı Eşik
       sessizce hiç açılmazdı. Bu yüzden çağrı kutuplardan biri doğana dek
       bekletilir. Tavan dolarsa (gerçekten taze hesap) sessiz geçilir —
       "gösterecek kutup yoksa açma" davranışı korunur. */
export function esikShowOnce() {
  if (_bootAcildi) return Promise.resolve(null);
  _bootAcildi = true;
  return _kutupBekle().then(varMi => (varMi ? esikShow() : null));
}

function _kutupBekle() {
  return new Promise((resolve) => {
    let bekledi = 0;
    (function tur() {
      let varMi = false;
      try { varMi = !!(_goldData() || _lapisData()); } catch (_) {}
      if (varMi) { resolve(true); return; }
      if (bekledi >= KUTUP_TAVAN) { resolve(false); return; }
      bekledi += 200;
      setTimeout(tur, 200);
    })();
  });
}

/* DUYGU MOTORUNUN IŞIĞA DOZU (13D K10, FAZ 16) — "metin YOK, yalnız ışık".
   `dgKapi('esik', …)` sunumSadece döner (`{ sunum, metin: null }`, K12
   emsali): eşik bir kimlik yüzeyi değildir ama bir iddia da taşımaz, motor
   burada da METİN üretmez — yalnız `.esik-onb`ün KENDİ iki gradyanının
   alfasını oynatır. Üç renk anayasası (§6.6) yeni renk yasaklar; varsayılan
   doz CSS kuralının kendisinde yazılıdır (`--esik-dg-lapis`/`-altin`).
   Kriz (`tutma`) burada da GÖRÜNMEZ (K9 emsali, atmosfer şeridiyle aynı
   gerekçe): o anda en son ihtiyaç duyulan şey ortamın da alarma geçmesidir.
   window köprüsü bilinçli: bu dosyanın geri kalanı da (fx/wt/oik/ig/ms)
   opsiyonel geliştirmeleri hep bu yoldan okur — okuma yoksa sessizce düş. */
function _esikDgDoz(overlay) {
  try {
    /* TAZELİK DAMGASI + AKIŞ (inceleme turu, 2026-08-30). Kapının sohbet
       dışındaki altı tüketicisinden yalnız burası `zaman`ı geçirmiyordu; eşiğin tazeliği
       `'gun'` ve damgasız okuma orada "bugün" SAYILIR. Uygulama gece
       boyunca açık kalmışsa (PWA/mobil kabuk yeniden yüklenmez)
       `S._dgNabiz` dünkü turun ölçümüdür ve eşiğin ışığı dünün hâliyle
       yanardı — kadran 2 tam da bunu yasaklar ("okuma eskimez, YOK OLUR").
       `akis` de aynı sebeple eklendi: aynı ölçümün aynı ekseni vermesi
       "tek kapı"nın kendisidir, yüzeyler arasında ayrışmamalı. */
    const okuma = window.dgKapi?.('esik', {
      nabiz: S._dgNabiz || null,
      iklim: S._dgIklim || null,
      zaman: S._dgNabizZaman || null,
      akis: { yon: S._dgYay, gecmis: S._dgSonKarsilama },
    });
    if (!okuma || !okuma.sunum || okuma.sunum === 'tutma') return;
    const DOZ = {
      kutlama:    { lapis: '.34', altin: '.16' },
      diriltme:   { lapis: '.34', altin: '.16' },
      yatistirma: { lapis: '.40', altin: '.06' },
      sahiplenme: { lapis: '.40', altin: '.06' },
    };
    const doz = DOZ[okuma.sunum]; // taniklik/berraklik tabloda yok → varsayılan CSS değeri kalır
    if (!doz) return; // sahne bit-be-bit varsayılan kaldı → teslim YOK, damga da yok
    overlay.style.setProperty('--esik-dg-lapis', doz.lapis);
    overlay.style.setProperty('--esik-dg-altin', doz.altin);
    /* DAMGA (K13, §6.10) — "teslim eden basar". Faz denetimi (2026-08-30):
       damga `doz` bulunamadığında da basılıyordu, oysa taniklik/berraklik
       satırlarında sahne motorsuz bir kullanıcınınkiyle BİT-BE-BİT aynı
       kalır — görünür hiçbir fark yoksa motor bu yüzeyde konuşmamıştır ve
       "teslim edilmeyen söz verilmiş sayılmaz". Damgayı oraya da basmak
       yanılma oranının paydasını teslim edilmemiş okumalarla dolduruyordu.
       İklim hidre değilse yazacak defter yoktur (01-prompts-modes.js:344). */
    if (S._dgIklim) {
      S._dgIklim = window.dgYanilmaKonustu?.(S._dgIklim, 'esik') || S._dgIklim;
      window.dgIklimKaydet?.(S._dgIklim);
    }
    /* İKİNCİ DEFTER (00f wtLogDuygu) — gerekçe kanalın kendi evinde
       (00f-kullanim-nabzi.js, `_DG_YUZEY`); kapı: 13D-iki-defter-kapisi. */
    try { window.wtLogDuygu?.(okuma.sunum, { yuzey: 'esik', duzeltildi: false }); } catch (_) {}
  } catch (e) { console.warn('esikDgDoz:', e && e.message); }
}

export function esikShow() {
  // Deste sidecar'ı henüz inmediyse önce onu bekle — iki kutup kartı tam
  // içerikle çizilsin (splash perdesi zaten sahneyi tutuyor). Yükleme
  // başarısızsa (ok=false) sessiz geç: sonsuz döngüye girme.
  if (!getFullDeck().length) {
    return deckReady().then(ok => (ok ? esikShow() : null));
  }
  return new Promise((resolve) => {
    if (_esikOpen || document.getElementById('esik-onb')) { resolve(null); return; }
    // Gösterecek hiçbir kutup yoksa (taze hesap, onboarding atlanmış) sessiz geç
    if (!_goldData() && !_lapisData()) { resolve(null); return; }
    _esikOpen = true;
    _esikShownAt = Date.now();
    try { window.wtLogEsik?.('esik-ekrani', { dal: 'acildi' }); } catch (_) {}

    esikEnsureStyles();
    ikvEnsureStyles();

    const overlay = document.createElement('div');
    // .sc-onb → 10s/10t ritüel orkestratörleri bu sınıf DOM'dayken kendini erteler
    overlay.className = 'onb-ritual sc-onb esik-onb';
    overlay.id = 'esik-onb';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', t('esik.aria'));
    document.body.appendChild(overlay);
    _esikDgDoz(overlay); // FAZ 16 — ışık dozu boyanmadan ÖNCE uygulanır

    // Pencere/klavye/yön değişiminde dizilim yeniden ölçülür (overlay yaşadığı
    // sürece); kapanışta sökülür ki ölü overlay'e tutunan dinleyici kalmasın.
    const onResize = () => _fitBridge(overlay);
    window.addEventListener('resize', onResize);

    function close(reason = 0) {
      // Eşiğin nabzı (K2): kapanış TEK yerden yazılır — CTA/boyut/arka plan
      // üçü de buraya döner. adim=kapanış nedeni (1=CTA "geç", 2=boyut kapısı,
      // 0=diğer/arka plan); sureMs=gerçek açık kalma süresi.
      try {
        window.wtLogEsik?.('esik-ekrani', {
          dal: 'kapandi',
          sureMs: _esikShownAt ? Date.now() - _esikShownAt : 0,
          adim: reason,
        });
      } catch (_) {}
      window.removeEventListener('resize', onResize);
      overlay.classList.add('onb-closing');
      // Eşik artık girişin eşiği — kapanınca altındaki ana ekran kademelenir
      // (llmHomeCascade). Bugün dalı savunmacı kaldı: derin link (?view=bugun)
      // ile doğrudan Studio'ya açılan boot'ta sahne odur. .onb-closing eklendiği için
      // llmHomeCascade'in .sc-onb açıkken erteleme kontrolü de geçer.
      const onBugun = document.getElementById('bugun-view')?.classList.contains('active');
      try {
        if (onBugun) window.wsCascadeBugun?.();
        else window.llmHomeCascade?.();
      } catch (_) {}
      setTimeout(() => {
        overlay.remove();
        _esikOpen = false;
        // Ertelenen günlük ritüelleri yeniden çağır (guard'lar idempotent yapar;
        // retry penceresi eşikte beklerken dolmuş olabilir)
        try { window.glRunDailyRitual?.(); } catch (_) {}
        setTimeout(() => { try { window.smRunDaily?.(); } catch (_) {} }, 700);
        resolve(true);
      }, 420);
    }

    function render() {
      const gold = _goldData();
      const lapis = _lapisData();
      const actions = _bridgeDims();

      const goldFace = gold ? ikvCardFace(gold.card, {
        palette: 'gold', kicker: t('esik.gold.kicker'), badge: t('esik.gold.badge'),
        sub: gold.sub, rarLabel: _rarLabel(gold.rar), rarColor: gold.rar?.color,
      }) : '';
      const lapisFace = lapis ? ikvCardFace(lapis.card, {
        palette: 'lapis', kicker: t('esik.lapis.kicker'), badge: t('esik.lapis.badge'),
        sub: lapis.sub, rarLabel: _rarLabel(lapis.rar), rarColor: lapis.rar?.color,
      }) : '';

      const score = lapis?.score;
      // Yolunun Nişanı izi (Alfabe Işık Faz 4) — iki kart arasındaki köprüde,
      // kullanıcının kendi seçtiği nişan sessizce durur (yoksa köprü sade kalır)
      let nisanIz = '';
      try {
        const nis = window.oikActiveNisan?.();
        if (nis) nisanIz = `<span class="esik-path-nisan"><svg viewBox="0 0 100 100">${nis.icon}</svg></span>`;
      } catch (_) {}
      // İMGE FİLİGRANI (13z) — kullanıcının kendi metaforu, ALTIN kartın
      // (olduğun kişi) köşesinde. Zaltman'ın priming'i: eşikteki ipucu
      // bilinç devreye girmeden yönü kurar. Yalnız mühürlü imge varsa;
      // yoksa Eşik bugünkü hâliyle kalır — davet buraya KONMAZ (Eşik
      // zaten yoğun, davet Bugün şerididir).
      let imgeFiligran = '';
      try {
        const ig = window.igGetAktif?.();
        if (ig && ig.kaynak !== 'yok' && ig.kanit && ig.v?.id) {
          const svg = window.igMotifSVG?.(ig.v.id, 30);
          if (svg) imgeFiligran = `<span class="esik-imge" aria-hidden="true">${svg}</span>`;
        }
      } catch (_) {}
      // İLERLEME İZİ (13x) — "aradaki yol bugünlerden örülür" cümlesinin
      // karşılığı. Yalnız İLERİ hareket konuşur: geri giden güne bir şey
      // demeyiz, o gün sessizce geçer (kitabın destekleyici sesi).
      let izHtml = '';
      try {
        const fark = window.msIzFark?.();
        if (typeof fark === 'number' && fark > 0) {
          izHtml = `<div class="esik-path-iz">${t('esik.path.iz')}</div>`;
        }
      } catch (_) {}

      // Ölçü yoksa (taze hesap, ölçecek sahipsiz kart kalmamış) çubuk ÖLÇÜSÜZ
      // çizilir: dolgu ve parıltı hiç basılmaz, metin gizlenir. "%0 yakınsın"
      // yeni kullanıcıyı karşılayacak ilk cümle olamaz.
      const pathHtml = (gold && lapis) ? `
        <div class="esik-path${score == null ? ' esik-path--olcusuz' : ''}" aria-hidden="true"${score != null ? ` style="--ms-pct:${score}%"` : ''}>
          <span class="esik-path-dot esik-path-dot--gold"></span>
          <span class="esik-path-line">${nisanIz}${score != null ? '<span class="esik-path-fill"></span><span class="esik-path-spark"></span>' : ''}</span>
          <span class="esik-path-dot esik-path-dot--lapis">✷</span>
        </div>
        ${score != null ? `<div class="esik-path-label">${t('esik.path.label').replace('{n}', score)}</div>` : ''}
        ${izHtml}` : '';

      const desiredHtml = lapis?.desired ? `
        <div class="esik-desired">
          <span class="esik-desired-mark">“</span>${esc(lapis.desired)}<span class="esik-desired-mark">”</span>
          <div class="esik-desired-src">— ${t(lapis.desiredEmre ? 'esik.desired_src_emre' : 'esik.desired_src')}</div>
        </div>` : '';

      const actionsHtml = actions.length ? `
        <div class="esik-bridge">
          <div class="esik-bridge-head"><span></span>${t('esik.bridge.head')}<span></span></div>
          ${actions.map((a, i) => `
            <button type="button" class="esik-act" data-dim="${esc(a.cat)}"
              style="animation-delay:${(0.95 + i * 0.1).toFixed(2)}s">
              <span class="esik-act-deste" aria-hidden="true"><i></i><i></i></span>
              <span class="esik-act-txt">
                <span class="esik-act-title"><span class="esik-act-glyph">${a.glyph}</span>${esc(a.title)}</span>
                ${a.note ? `<span class="esik-act-note">${esc(a.note)}</span>` : ''}
              </span>
              <span class="esik-act-go" aria-hidden="true">→</span>
            </button>`).join('')}
        </div>` : '';

      overlay.innerHTML = `
        <div class="onb-stage esik-stage">
          <div class="esik-head">
            <div class="onb-badge esik-badge">${t('esik.badge')}</div>
            <div class="esik-lead">${t('esik.lead')}</div>
          </div>
          <div class="esik-cards${(gold && lapis) ? '' : ' esik-cards--single'}">
            ${gold ? `<div class="esik-card esik-card--gold">
              <div class="esik-card-tag">${t('esik.gold.tag')}</div>
              ${imgeFiligran}
              ${goldFace}
              ${gold.caption ? `<div class="esik-card-cap">${esc(gold.caption)}</div>` : ''}
            </div>` : ''}
            ${lapis ? `<div class="esik-card esik-card--lapis">
              <div class="esik-card-tag esik-card-tag--lapis">${t('esik.lapis.tag')}</div>
              ${lapisFace}
              <div class="esik-card-cap">${t('esik.lapis.cap')}</div>
            </div>` : ''}
          </div>
          ${pathHtml}
          ${desiredHtml}
          ${actionsHtml}
          <button type="button" class="onb-next esik-cta" data-act="enter">${t('esik.cta')}</button>
          <div class="onb-hint esik-hint">${t('esik.hint')}</div>
        </div>`;
      // holo: iki kutup kartı ışığa tutulmuş gibi eğimi izler (12c motoru)
      try { window.ikvHoloScan && window.ikvHoloScan(overlay); } catch (_) {}
      // Kartların CSS animasyon gecikmesiyle senkron ses (esikFromLeft .15s /
      // esikFromRight .3s, satır ~302-303) — görsel senkron çağıranın işi.
      try {
        if (gold) setTimeout(() => window.fxCue?.('esikGold'), 150);
        if (lapis) setTimeout(() => window.fxCue?.('esikLapis'), 300);
      } catch (_) {}
    }

    overlay.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="enter"]')) { close(1); return; }
      // Boyut satırı → önce eşiği kapat (üstünde asılı kalmasın), sonra OİK'te
      // o boyutun penceresini aç. Gecikme close()'un .onb-closing solmasıyla
      // örtüşür: kullanıcı geçişi görür, ekran altından çekilmiş gibi olmaz.
      const dim = e.target.closest('.esik-act[data-dim]');
      if (dim) {
        const cat = dim.getAttribute('data-dim');
        close(2);
        setTimeout(() => { try { window.oikOpenDim?.(cat); } catch (_) {} }, 300);
      }
    });

    // Üstte bir perde sahnedeyse inmesini bekle — boot yolunda wn-splash,
    // Studio yolunda flip başlığı (#ws-flip-title, ~1.15s); içerik perde
    // arkasında EN TAZE veriyle (kkInit/imInit hidrasyonu ~2sn) çizilir,
    // perde kalkınca açılır.
    let waited = 0;
    (function waitCurtain() {
      const splashUp = document.getElementById('wn-splash')?.classList.contains('show');
      const flipTitleUp = document.getElementById('ws-flip-title')?.classList.contains('show');
      if ((splashUp || flipTitleUp) && waited < 12000) {
        waited += 200;
        setTimeout(waitCurtain, 200);
        return;
      }
      render();
      requestAnimationFrame(() => {
        overlay.classList.add('onb-open');
        _fitBridge(overlay); // dizilim kararı: layout kurulduktan SONRA ölç
      });
    })();
  });
}

/* ══════════════════════════════════════════════════════════════
   STİLLER (JS-enjekte) — kart dili 12c'den; sahne dili onb-ritual'dan
══════════════════════════════════════════════════════════════ */
export function esikEnsureStyles() {
  if (document.getElementById('esik-styles')) return;
  const css = `
  /* Zemin: eşiğin KENDİ göğü — üstte lapis gece, altta altın ufuk ışıması.
     (2026-08-27, Emre: görsel kabuk ilk hâline döndürüldü. Arada bir süre
     Yol'un paylaşılan göğüne --sky-stars/--sky-scene bağlanmıştı; eşik o
     ortak gökte kendi eşiği olmaktan çıkıp yolun bir kesitine benziyordu.
     Buradaki degrade tekrar eşiğe ait: iki kartın arasındaki karanlık
     kimsenin değil, geçilen anın karanlığıdır.) */
  .esik-onb{
    /* Duygu dozu (13D K10, FAZ 16) — DEĞİŞKENLER BURADA DOĞAR, varsayılanı
       BUGÜNKÜ değerdir. JS okuma bulamazsa (ya da eksen taniklik/berraklik/
       tutma ise) hiçbirine dokunmaz, sahne bit-be-bit aynı kalır. */
    --esik-dg-lapis:.34; --esik-dg-altin:.10;
    background:
    radial-gradient(110% 70% at 50% -8%, rgba(24,46,92,var(--esik-dg-lapis)), transparent 58%),
    radial-gradient(90% 60% at 50% 112%, rgba(245,166,35,var(--esik-dg-altin)), transparent 55%),
    var(--bg,#0F0C08);
    padding-top:max(26px, var(--safe-t));padding-bottom:max(26px, var(--safe-b));}
  .esik-stage{max-width:480px;text-align:center;}
  .esik-head{animation:esikRise .7s var(--ease-out,ease) both;}
  .esik-badge{margin-bottom:7px;}
  .esik-lead{font-family:var(--serif-display,var(--serif,Georgia));font-style:italic;
    font-size:19px;color:var(--text,#EAE2D6);margin-bottom:16px;line-height:1.4;}

  /* Kart ölçüsü ve dikey ritim ilk hâlindedir (2026-08-27, Emre): kart 46%/
     200px, boşluklar sabit px. Arada bir süre vh'ye bağlanmıştı (clamp'ler);
     ölçü ekrana göre kısılınca eşiğin nefesi de kısılıyordu. Kısa pencerede
     sahne taşarsa dikeyi _fitBridge'in kare dizilimi kurtarır — ölçüyü her
     ekranda kısmak yerine, yalnız taşan ekranda kapıları toplamak. */
  .esik-cards{display:flex;justify-content:center;align-items:stretch;gap:14px;perspective:900px;}
  .esik-cards--single{justify-content:center;}
  .esik-card{width:46%;max-width:200px;display:flex;flex-direction:column;position:relative;}
  .esik-cards--single .esik-card{width:60%;max-width:220px;}
  .esik-card--gold{animation:esikFromLeft .85s .15s var(--ease-out,ease) both;}
  .esik-card--lapis{animation:esikFromRight .85s .3s var(--ease-out,ease) both;}
  .esik-card--gold .ikv-card{transform:rotateY(7deg) rotateZ(-.7deg);}
  .esik-card--lapis .ikv-card{transform:rotateY(-7deg) rotateZ(.7deg);}
  .esik-card .ikv-card{transition:transform .5s var(--ease-out,ease);}
  .esik-card:hover .ikv-card,.esik-card:active .ikv-card{transform:none;}
  .esik-card-tag{font-family:var(--cinzel,serif);font-size:clamp(7px,2.3vw,9px);letter-spacing:1.8px;
    color:var(--gold,#F5A623);margin-bottom:9px;white-space:nowrap;}
  .esik-card-tag--lapis{color:var(--lapis-bright,#5A8AD8);}
  /* Kartların altındaki altyazılar (2026-08-27'de geri geldi): altın kartta
     kimliğin nereden geldiği ("Kendi kaleminle yazdığın kişi." / "{n} gündür
     {persona}"), lapis kartta davet ("Adın bu kartta da yazabilir."). Bir süre
     dikey yer açmak için sökülmüşlerdi; kartın adı kim olduğunu söyler, altyazı
     onu NEYİN söylediğini — ikisi aynı cümle değildir. */
  .esik-card-cap{font-family:var(--serif,Georgia);font-style:italic;font-size:10.5px;
    color:var(--text-mid,#a89f8e);line-height:1.45;margin-top:7px;}

  .esik-path{display:flex;align-items:center;gap:8px;margin:16px 10px 0;
    animation:esikRise .8s .6s var(--ease-out,ease) both;}
  .esik-path-dot{flex:none;font-size:11px;line-height:1;}
  .esik-path-dot--gold{width:9px;height:9px;border-radius:50%;background:var(--gold,#F5A623);
    box-shadow:0 0 10px rgba(245,166,35,.7);}
  .esik-path-dot--lapis{color:var(--lapis-bright,#5A8AD8);text-shadow:0 0 10px rgba(90,138,216,.8);}
  .esik-path-line{position:relative;flex:1;height:2px;border-radius:2px;background:rgba(234,226,214,.12);overflow:visible;}
  .esik-path-nisan{position:absolute;left:50%;bottom:5px;transform:translateX(-50%);
    width:20px;height:20px;color:rgba(245,166,35,.6);}
  .esik-path-nisan svg{width:100%;height:100%;filter:drop-shadow(0 0 4px rgba(245,166,35,.3));}
  /* MESAFE MOTORU (13x): dolgu artık GERÇEK. Gradyan çizginin TAM genişliği
     üzerinden hesaplanır (altın solda = olduğun, lapis sağda = olmak
     istediğin), clip-path yalnız yürüdüğün kadarını açar — böylece %93'te
     renk gerçekten lapise yaklaşmış olur, %40'ta hâlâ altındasın. inset:0
     ile hep tam dolu duran eski hâl, üstündeki "%{n} yakınsın" metniyle
     çelişiyordu. */
  .esik-path-fill{position:absolute;inset:0;border-radius:2px;
    background:linear-gradient(90deg,var(--gold,#F5A623),var(--lapis-bright,#5A8AD8));
    /* Dolgu ölçüyü gösterir ama SOLDAN SAĞA DOLMAZ (2026-08-27, Emre: ilk
       hâlde çubuk sahnede olduğu gibi durur, akan bir ışık yoktu). Açılışta
       %{n} kadarı zaten açıktır; hareket eden tek şey üstünden geçen parıltı.
       clip-path korunur — çubuk yürünen yolu, üstündeki sayıyla aynı şeyi
       söylemek zorundadır (13x msAnaMesafe). */
    clip-path:inset(0 calc(100% - var(--ms-pct,0%)) 0 0);}
  /* Parıltı ilk hâlindeki gibi yolun TAMAMINI tarar — gidilen kadarını değil
     gidilecek olanı gösterir, çubuğun kendisi zaten gidileni söylüyor. */
  .esik-path-spark{position:absolute;top:50%;width:4px;height:4px;border-radius:50%;
    background:var(--gold-bright,#F7C744);box-shadow:0 0 8px rgba(245,200,90,.85);
    transform:translate(-50%,-50%);animation:esikSpark 3.4s ease-in-out infinite;}
  @keyframes esikSpark{0%{left:0%;opacity:0}8%{opacity:1}50%{left:50%;opacity:.9}92%{opacity:1}100%{left:100%;opacity:0}}
  @media (prefers-reduced-motion:reduce){
    .esik-path-spark{animation:none;left:var(--ms-pct,0%);opacity:.85;}
    /* Giriş hareketleri susar ama sahne GÖRÜNÜR kalır. Bu animasyonlar 'both'
       ile opacity:0'dan başlar; animation:none fill-mode'u da siler, bitiş
       durumu ELLE verilmezse ekran boş donardı (kart yağmuru sprintinin
       gotcha'sı). §5'in reduced-motion kuralı bu blokla kapanıyor — kartların
       3B duruşu (.ikv-card rotateY) hareket değil YERLEŞİM olduğu için kalır.
       2026-08-03: Oluş Sınaması da bu yerleşimi kullanmaya başlayınca açık
       iki ekranı birden ilgilendirir oldu; kaynağında kapatıldı. */
    .esik-head,.esik-card--gold,.esik-card--lapis,.esik-path,.esik-path-label,
    .esik-path-iz,.esik-desired,.esik-bridge-head,.esik-act,.esik-cta,.esik-hint{
      animation:none;opacity:1;transform:none;}
    /* İstifin yelpazesi de susar — yapraklar kapalı desteyi korur (transform
       'none' YAZILMAZ: üst üste binen eğim yerleşimin kendisidir). */
    .esik-act-deste i{transition:none;}
  }
  .esik-path-label{font-family:var(--serif,Georgia);font-style:italic;font-size:12px;
    color:var(--text-mid,#a89f8e);margin-top:8px;animation:esikRise .8s .75s var(--ease-out,ease) both;}
  .esik-path-label b{color:var(--lapis-bright,#5A8AD8);font-style:normal;}
  /* İlerleme izi — yolun bugün kısaldığının tek satırlık kaydı (13x) */
  .esik-path-iz{font-family:var(--cinzel,serif);font-size:9px;letter-spacing:1.6px;
    color:var(--gold,#F5A623);opacity:.75;margin-top:5px;
    animation:esikRise .8s .9s var(--ease-out,ease) both;}

  .esik-desired{font-family:var(--serif,Georgia);font-style:italic;font-size:14px;
    color:var(--text,#EAE2D6);line-height:1.55;margin:14px 18px 0;
    animation:esikRise .8s .85s var(--ease-out,ease) both;}
  .esik-desired-mark{color:var(--lapis-bright,#5A8AD8);font-size:17px;}
  .esik-desired-src{font-size:10px;letter-spacing:1.5px;font-style:normal;
    font-family:var(--cinzel,serif);color:var(--text-dim,#777);margin-top:6px;}

  /* DÖRT KAPI — dizilim ÖLÇÜMLE seçilir (bkz. _fitBridge).
     Alt alta liste ASIL dizilimdir: dört kapı tam genişlikte durur, göz
     yukarıdan aşağı okur, her kapının nefesi kendine aittir. Kare (iki sütun)
     bir tasarım tercihi değil KURTARMA dizilimidir — köprü dört boyuta çıkınca
     tek başına 252px yiyor ve kısa pencerelerde "YOLA DEVAM ET"i ekranın
     altından düşürüyordu. Sahne sığdığı her yerde eşik eski hâliyle durur;
     yalnız taşan ekranda dört kapı iki sütuna toplanır (252→~130px). */
  .esik-bridge{margin:18px 6px 0;text-align:left;}
  .esik-bridge--kare{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
  .esik-bridge--kare .esik-bridge-head{grid-column:1/-1;margin-bottom:4px;}
  .esik-bridge--kare .esik-act{margin-bottom:0;gap:8px;}
  /* Kurtarma dizilimi sütunu daraltır — istif de kendini toplar. */
  .esik-bridge--kare .esik-act-deste{width:21px;height:15px;gap:2px;}
  .esik-bridge-head{display:flex;align-items:center;gap:10px;justify-content:center;
    font-family:var(--cinzel,serif);font-size:9px;letter-spacing:3px;color:var(--gold,#F5A623);
    margin-bottom:10px;animation:esikRise .7s .9s var(--ease-out,ease) both;}
  .esik-bridge-head span{flex:1;max-width:54px;height:1px;
    background:linear-gradient(90deg,transparent,rgba(245,166,35,.45));}
  .esik-bridge-head span:last-child{background:linear-gradient(90deg,rgba(245,166,35,.45),transparent);}
  /* Satır artık bir kapı (button): OİK'te o boyutun paneline iner. Buton
     sıfırlaması şart — tarayıcı varsayılanı yazı tipini ve hizayı ezer. */
  .esik-act{display:flex;align-items:center;gap:11px;padding:8px 12px;
    margin-bottom:6px;width:100%;text-align:left;font:inherit;color:inherit;cursor:pointer;
    border:1px solid rgba(234,226,214,.10);border-radius:12px;
    background:linear-gradient(150deg,rgba(245,166,35,.05),rgba(15,14,12,.4));
    animation:esikRise .7s var(--ease-out,ease) both;
    transition:border-color .22s var(--ease-out,ease),background .22s var(--ease-out,ease),
      transform .22s var(--ease-out,ease);}
  .esik-act:hover,.esik-act:focus-visible{
    border-color:var(--lapis-bright,#5A8AD8);
    background:linear-gradient(150deg,rgba(90,138,216,.12),rgba(15,14,12,.45));
    outline:none;}
  .esik-act:hover .esik-act-go,.esik-act:focus-visible .esik-act-go{opacity:1;transform:translateX(2px);}
  .esik-act:active{transform:scale(.985);}
  /* Mühür işareti (10D CAT_SIGILS) artık satırın başında değil BAŞLIĞIN
     önünde durur: kapının başını iki kartlık istif tutar (2026-08-27, Emre —
     Claude'un satır ikonu gibi), işaret ise adı taşıyan yere geçti. */
  .esik-act-glyph{display:inline-block;color:var(--gold,#F5A623);font-size:11px;
    margin-right:6px;vertical-align:1px;}
  .esik-act-txt{flex:1;min-width:0;}
  .esik-act-title{display:block;font-family:var(--serif,Georgia);font-size:13.5px;
    color:var(--text,#EAE2D6);line-height:1.4;}
  .esik-act-note{display:block;font-family:var(--serif,Georgia);font-style:italic;font-size:11px;
    color:var(--text-mid,#a89f8e);margin-top:2px;}
  /* İKİ KART, ART ARDA — kapının ardında ne olduğunu söyleyen minyatür.
     ARKADA ALTIN (olduğun kişi, şimdi), ÖNDE LAPİS (olmak istediğin, hedef);
     eşiğin iki kutbunun cebe girmiş hâli. 2026-08-27 (Emre): istif SADELEŞTİ —
     çapraz eğim, ön kartın üstündeki yazı satırları ve dokununca açılan
     yelpaze kalktı. Geriye iki kart kaldı: aynı ölçüde, art arda, bir ikon
     kadar. Renk ekseni TASARIM-PRENSIPLERI'nin kendisidir; burada da
     kopyalanmaz, --gold/--lapis-bright token'larından içilir. */
  /* İSTİF = SAHNENİN MİNYATÜRÜ (2026-08-27, Emre). Kapının yanındaki iki kart,
     yukarıdaki iki büyük kartın küçülmüş hâlidir: yan yana dururlar ve
     BİRBİRLERİNE bakarlar — solda altın (olduğun), sağda lapis (olmak
     istediğin). Duruş kopyalanmaz, aynı kuraldan gelir: .esik-card--gold /
     --lapis ile aynı rotateY(±7deg) rotateZ(∓.7deg) ve aynı perspektif oranı
     (900/200 ≈ 4.5 → 50/11). Eşiğin sorusu kapının yanında da aynı biçimde
     durur: iki kişi, arada sen. */
  .esik-act-deste{flex:none;display:flex;align-items:stretch;gap:2px;
    width:24px;height:17px;perspective:50px;}
  .esik-act-deste i{flex:1;border-radius:2.5px;border:1px solid;
    transition:transform .26s var(--ease-out,ease),border-color .26s var(--ease-out,ease);}
  /* SOL — altın: olduğun kişi, sahnedeki gibi içe dönük */
  .esik-act-deste i:nth-child(1){transform:rotateY(7deg) rotateZ(-.7deg);
    border-color:rgba(245,166,35,.55);
    background:linear-gradient(160deg,rgba(245,166,35,.24),rgba(15,14,12,.72));}
  /* SAĞ — lapis: olmak istediğin, ayna simetrisi */
  .esik-act-deste i:nth-child(2){transform:rotateY(-7deg) rotateZ(.7deg);
    border-color:rgba(90,138,216,.62);
    background:linear-gradient(160deg,rgba(90,138,216,.28),rgba(15,14,12,.92));}
  /* Dokunuşta iki kart birbirine bir tık daha döner — aradaki yol kısalır */
  .esik-act:hover .esik-act-deste i:nth-child(1),
  .esik-act:active .esik-act-deste i:nth-child(1),
  .esik-act:focus-visible .esik-act-deste i:nth-child(1){transform:rotateY(13deg) rotateZ(-1.2deg);
    border-color:rgba(245,166,35,.85);}
  .esik-act:hover .esik-act-deste i:nth-child(2),
  .esik-act:active .esik-act-deste i:nth-child(2),
  .esik-act:focus-visible .esik-act-deste i:nth-child(2){transform:rotateY(-13deg) rotateZ(1.2deg);
    border-color:rgba(90,138,216,.9);}
  /* Ok sessiz durur, dokununca konuşur — kapı olduğunu söyler, bağırmaz. */
  .esik-act-go{flex:none;color:var(--lapis-bright,#5A8AD8);font-size:12px;opacity:.42;
    transition:opacity .22s var(--ease-out,ease),transform .22s var(--ease-out,ease);}

  /* CTA dört kapıdan SONRA belirir. Köprü üç satırken 1.35s doğruydu; dördüncü
     boyut eklenince son kapı 1.43s'e kaydı ve "yola devam et" kendinden önce
     gelen kapıyı geçiyordu — beliriş sırası akışın sırasıdır. */
  .esik-cta{margin-top:18px;animation:esikRise .7s 1.38s var(--ease-out,ease) both;}
  .esik-hint{animation:esikRise .7s 1.5s var(--ease-out,ease) both;}

  @keyframes esikRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  @keyframes esikFromLeft{from{opacity:0;transform:translateX(-26px) rotateY(18deg)}to{opacity:1;transform:translateX(0) rotateY(0)}}
  @keyframes esikFromRight{from{opacity:0;transform:translateX(26px) rotateY(-18deg)}to{opacity:1;transform:translateX(0) rotateY(0)}}
  @media (max-width:360px){
    .esik-cards{gap:10px;}
    .esik-card-tag{letter-spacing:1.4px;}
    /* Kurtarma dizilimine düşmüşse dar telefonda kapıların iç nefesi kısılır. */
    .esik-bridge--kare{gap:5px;}
    .esik-bridge--kare .esik-act{gap:8px;padding-left:9px;padding-right:9px;}
  }
  `;
  const style = document.createElement('style');
  style.id = 'esik-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

/* window expose main.js'te (esikShow + esikShowOnce) — 03-auth-shell initApp
   dinamik import ile esikShowOnce'ı çağırır (döngüsel bağımlılık yok);
   window.esikShow dışa açık sözleşme olarak da durur. */
