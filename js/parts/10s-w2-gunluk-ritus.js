/* ═══════════════════════════════════════════════════════════════════
   10s — GÜNLÜK RİTÜEL · Günün Armağanı + Günün Sözü (ilk-giriş pop-up'ları)
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Gün, uygulamaya girmeden ÖNCE bir ritüelle açılır. Önce SANA verilir
     (Günün Armağanı: elmas + Emre'nin Kitaplığı'ndan kişiye özel söz/
     paragraf + ilgili yazı) — Karşılıkta Bulunma. Sonra SEN söz verirsin
     (Günün Sözü: Bireysel / İlişki / İş hayatında birer mikro-taahhüt,
     harfiyen yazılarak mühürlenir) — Tutarlılık. Çekirdek tez: "Mesele Sensin."

   AKIŞ: Armağan pop-up → Söz pop-up → uygulama. Günde bir kez (yerel gün anahtarı).

   SAHNE — Wanderer Studio'ya has: tören YALNIZ Bugün ekranında (#bugun-view)
   açılır. Wanderer LLM ön-yüzü (#chat-view) kendi bağımsız serisini taşır
   (13r Gün Serisi: o gün bir mesaj yeter) ve günlük törenle beslenmez.

   KİŞİSELLEŞTİRME KAYNAĞI (mevcut motorlar — yeniden kullanım):
     • S._foundationsProfile        — 5 temel puanı (en zayıf = günün ihtiyacı)
     • S._onboardingRecommendation  — Yol Ayini (02b): domainRecs / weakestKey
     • window.czKisiselDokunis()    — yaşam belleğinden (P6) sıcak dokunuş
   Sözler, güncel zayıf temele bağlı seçilir → profil değişince içerik de değişir.

   Kalıcılık: SafeStorage per-uid (etw_gunluk_ritus_v1_<uid>). Supabase YOK.
   Konvansiyon: hardcoded TR string. TDZ güvenliği: modüller-arası erişim window.*.
   Stiller: css/parts/gunluk.css (link ile; JS-enjekte değil).
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage, localISODate, recordActivityDay, escapeHTML } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { awardElmas, getElmasSayisi, spendElmas } from './10g-w2-wanderer-game.js';
import { dfGetActiveFoundationTarget } from './09b-depth-foundations.js';

const STORAGE_KEY = 'etw_gunluk_ritus_v1';

/* Dile duyarlı tarih/locale (toLocaleX için) */
const _locale = () => (S._currentLang === 'tr' ? 'tr-TR' : 'en-US');

/* Tek kaynak: escapeHTML (00a). Eskiden bu modülün kendi ikizi vardı;
   ikizler birbirinden de farklıydı (bir kısmı tek tırnağı kaçırmıyordu). */
const esc = escapeHTML;

/* ── Ekonomi (dengeli) ── */
const GIFT_ELMAS = 3;
const SOZ_REWARD = { 1: 5, 2: 12, 3: 20 };  // seçilen alan sayısına göre
const SKIP_PENALTY = 3;
const KEPT_REWARD = 4;                       // akşam hesabı: tutulan söz başına (söz vermenin asıl ödülü)

/* "Tutamadım" gerekçeleri — tek dokunuş, cezasız. 'buyuk' cevabı yarının
   sözünü bir mertebe küçültür (13u sdMertebe); diğerleri yalnız kayda geçer. */
const REASONS = ['unuttum', 'gun', 'buyuk'];

/* ── Gün anahtarı (00a tek kaynağı) + deterministik tohum ── */
function glDayKey() {
  return localISODate();
}
function _hash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function _rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// Günlük deterministik seçici — uid + gün + güncel zayıf temel + tuz
// (zayıf temel tohuma girdiği için profil değişince içerik de gün gün değişir)
function glDaily(salt) {
  const uid = (S.currentUser && S.currentUser.id) || 'anon';
  return _rng(_hash(`${uid}|${glDayKey()}|${_weakestFoundationKey()}|${salt || ''}`));
}

/* ════════════════════════════════════════════════════════════════════
   İÇERİK BANKALARI (kitap-köklü: İlişki Felsefesi + Zihniyet Devrimi)
════════════════════════════════════════════════════════════════════ */
// Alan × Temel → günün sözü (kimlik inşa eden mikro-taahhüt). Her hücre dizi
// (gün gün ufak çeşitlilik için). Temel, kişiselleştirmeden gelir.
const DOMAIN_META = {
  bireysel: { glyph: '◈' },
  iliski:   { glyph: '♥' },
  is:       { glyph: '❖' },
};

/* İçerik bankaları i18n'den — modül-yükünde DONMASIN diye fonksiyon
   (render/ritüel anında t() çağırır). fk olağan dışıysa 'default'a düşer. */
const _GIFT_FK = new Set(['oz_sevgi', 'oz_saygi', 'oz_deger', 'oz_guven', 'bolluk']);
const _fkOrDefault = fk => (_GIFT_FK.has(fk) ? fk : 'default');
function _sozBank(domain, fk) {
  const k = _fkOrDefault(fk);
  return [t(`gl.soz.${domain}.${k}.0`), t(`gl.soz.${domain}.${k}.1`)];
}
function _giftBank(fk) {
  const k = _fkOrDefault(fk);
  return {
    quotes: [t(`gl.gift.${k}.q0`), t(`gl.gift.${k}.q1`)],
    paragraph: t(`gl.gift.${k}.para`),
    article: { title: t(`gl.gift.${k}.article`), key: k },
  };
}

/* ════════════════════════════════════════════════════════════════════
   KİŞİSELLEŞTİRME OKUMA
════════════════════════════════════════════════════════════════════ */
const FKEYS = ['oz_sevgi', 'oz_saygi', 'oz_deger', 'oz_guven', 'bolluk'];

function _weakestFoundationKey() {
  /* ÖLÇÜM — kanıtlı temeller (09b kapısı). Kanıtsız temelin 50 sayılması
     ritüelin eksenini uydurma bir "en zayıf"a bağlıyordu. */
  try {
    const hedef = dfGetActiveFoundationTarget();
    if (hedef?.key && FKEYS.includes(hedef.key)) return hedef.key;
  } catch (_) {}
  /* BEYAN — kullanıcının kendi onboarding seçimi. */
  try { return S._onboardingRecommendation?.weakestKey || 'default'; } catch (_) {}
  return 'default';
}

function _domainFoundation(domain, need) {
  // İhtiyaç Motoru (13v) tek karar mercii: portre + temel + söz defteri + kişi
  // sinyallerini olgunluğa göre tartar. Motor hazır değilse (boot yarışı) eski
  // davranışa düşülür — tören hiçbir koşulda beklemez. `need` çağıran tarafta
  // zaten hesaplandıysa geçilir; motoru iki kez çalıştırmaya gerek yok.
  try {
    const n = need || window.ihNeed?.(domain);
    if (n && n.eksen) return n.eksen;
  } catch (_) {}
  try {
    const rec = S._onboardingRecommendation?.domainRecs?.[domain];
    if (rec && rec.foundationKey) return rec.foundationKey;
  } catch (_) {}
  return _weakestFoundationKey();
}

function _kisiselDokunis() {
  try { return (window.czKisiselDokunis && window.czKisiselDokunis()) || null; } catch (_) { return null; }
}

function _userName() {
  const u = S.currentUser;
  return (u && (u.name || (u.user_metadata && u.user_metadata.name))) ||
    (document.getElementById('ob-name') && document.getElementById('ob-name').textContent) || t('gl.guest_name');
}

/* ════════════════════════════════════════════════════════════════════
   PERSİSTANS
════════════════════════════════════════════════════════════════════ */
function _default() {
  return { date: null, gift: null, pledges: [], skipped: false, finished: false, reckoned: false };
}
function _key() { return `${STORAGE_KEY}_${(S.currentUser && S.currentUser.id) || 'anon'}`; }

export function glSave() {
  try { SafeStorage.set(_key(), S._gunlukRitus); } catch (e) { console.warn('glSave:', e && e.message); }
  // Söz Defteri (13u) tek yazarı burasıdır: gün dönmesini BEKLEMEDEN bugünün
  // satırları idempotent güncellenir — akşam hesabı `kept`i sonradan doldurunca
  // aynı satır tazelenir, tarayıcı kapalıyken geçen gün kaybolmaz.
  try { window.sdSenkronla?.(S._gunlukRitus); } catch (_) {}
}
export function glLoad() {
  try {
    const data = SafeStorage.get(_key());
    if (data && typeof data === 'object') S._gunlukRitus = Object.assign(_default(), data);
  } catch (e) { console.warn('glLoad:', e && e.message); }
}
export function glInit() {
  if (!S._gunlukRitus) S._gunlukRitus = _default();
  glLoad();
  // Hidrasyondan gelen kayıt DÜNÜN olabilir (tarayıcı kapalıyken gün döndü) —
  // sıfırlanmadan önce deftere işle, yoksa o günün sözü sessizce kaybolur.
  try { window.sdSenkronla?.(S._gunlukRitus); } catch (_) {}
  glElmasBarUpdate();
  // KRİTİK: glInit asenkron hidrasyon sonrası çalışır; loadBugunView ondan önce
  // koşmuş olabilir → Verdiğin Söz kartını burada (sözler yüklendikten sonra) bas.
  try { glRenderVerdiginSoz(); } catch (_) {}
}

/* ════════════════════════════════════════════════════════════════════
   ELMAS BARI — global, sağ üst (tüm ekranlarda)
════════════════════════════════════════════════════════════════════ */
export function glElmasBarUpdate() {
  const el = document.getElementById('gl-elmas-count');
  if (!el) return;
  let n = 0;
  try { n = getElmasSayisi(); } catch (_) {}
  el.textContent = n.toLocaleString(_locale());
  el.classList.remove('gl-elmas-pulse');
  // reflow → pulse yeniden tetiklensin
  void el.offsetWidth;
  el.classList.add('gl-elmas-pulse');
}

// Elmas Halkası, seri çemberinin (ws-vesper-ring) ikizi olarak right:58'e konumlanır.
// Sadece "Bugün" ekranında gösterilir.
const _GL_ELMAS_SHOW = new Set(['bugun', 'hazine']);
// Aktif view'in kısa adı (#xxx-view → "xxx"). Portal kapanışlarında barı
// mevcut view'e göre yeniden assert etmek için (kaybolma semptomuna karşı).
export function glActiveViewName() {
  try { return (document.querySelector('.view.active')?.id || '').replace(/-view$/, ''); }
  catch (_) { return ''; }
}
export function glSyncElmasBar(view) {
  const bar = document.getElementById('gl-elmas-bar');
  if (!bar) return;
  bar.style.display = _GL_ELMAS_SHOW.has(view) ? 'inline-flex' : 'none';
  if (_GL_ELMAS_SHOW.has(view)) glElmasBarUpdate();
}

/* ════════════════════════════════════════════════════════════════════
   İÇERİK İNŞASI
════════════════════════════════════════════════════════════════════ */
function glBuildGift() {
  // Armağan da Söz ile AYNI ihtiyaç motorunu (13v) tüketir — sabah töreninin
  // iki yarısı aynı yere bakmalı: önce sana verilen, sonra senin verdiğin söz
  // aynı ihtiyacın iki yüzüdür. Motor yoksa eski davranışa (en zayıf temel)
  // düşülür; ihNeedTop üç alanın EN GÜÇLÜ ihtiyacını seçer.
  let need = null;
  try { need = window.ihNeedTop?.() || null; } catch (_) {}
  const fk = (need && need.eksen) || _weakestFoundationKey();
  const bank = _giftBank(fk);
  const quotes = (bank.quotes || []).slice(0, 2);
  return {
    elmas: GIFT_ELMAS,
    foundationKey: fk,
    quotes,
    paragraph: bank.paragraph,
    article: bank.article,
    claimed: false,
    why: _kanitSatiri(need),
    needAlan: (need && need.alan) || null,
  };
}

/** İhtiyaç Motoru'nun (13v) kanıtını okunur tek satıra çevirir.
 *  Kullanıcı sözün NEDEN bu söz olduğunu görsün — "senin için seçildi"
 *  denmez, gösterilir. Motor yoksa ya da yeni tanışıyorsak satır çıkmaz. */
function _kanitSatiri(need) {
  try {
    if (!need || !need.kanit || need.kaynak === 'varsayilan') return '';
    const ham = t(`ih.kanit.${need.kanit}`, '');
    if (!ham || ham === `ih.kanit.${need.kanit}`) return '';
    return need.alinti ? ham.replace('{alinti}', esc(need.alinti)) : ham;
  } catch (_) { return ''; }
}

/* Söz HARFİYEN yazılarak mühürlenir (_normalize eşleşmesi) — bu yüzden hiçbir
   söz bu sınırı aşamaz. Yuvalı varyant taşarsa sessizce düz bankaya düşülür;
   kişiselleşme uğruna töreni eziyete çevirmeyiz. */
const SOZ_MAX_KARAKTER = 64;
/* Kendi sözünü yazan kullanıcıdan istenen asgari açıklık — "ok" gibi tek
   kelimelik bir giriş söz değildir; ama şart bundan ötesine geçmez. */
const SOZ_MIN_KARAKTER = 8;

/**
 * Yuvalı söz — kullanıcının gerçek hayatına değen varyant.
 * Önce kişi ("{kisi} ile"), sonra olay ("{olay} için") denenir; ikisi de
 * yoksa ya da sonuç uzunluk kapısını geçemezse null döner (düz banka).
 */
function _yuvaliSoz(domain, bankKey) {
  const dene = (aile, yuva, deger, source) => {
    if (!deger) return null;
    const key = `gl.${aile}.${domain}.${bankKey}`;
    const kalip = t(key, '');
    // t() anahtarı bulamazsa anahtarın kendisini döndürebilir → yuva kontrolü
    // hem eksik çeviriyi hem yanlış aileyi tek hamlede eler.
    if (!kalip || !kalip.includes(yuva)) return null;
    const metin = kalip.replace(yuva, deger);
    if (metin.length > SOZ_MAX_KARAKTER) return null;
    return { text: metin, key, source };
  };
  try {
    return dene('sozk', '{kisi}', window.ihKisi?.(domain), 'kisi')
        || dene('sozo', '{olay}', window.ihOlay?.(domain), 'olay');
  } catch (_) { return null; }
}

function glBuildSozler() {
  return Object.keys(DOMAIN_META).map(domain => {
    const need = (() => { try { return window.ihNeed?.(domain) || null; } catch (_) { return null; } })();
    const fk = _domainFoundation(domain, need);
    const bankKey = _fkOrDefault(fk);
    const cell = _sozBank(domain, fk);
    // Seçilen varyantın İNDEKSİ kaybolmamalı: Söz Defteri (13u) ekseni banka
    // anahtarından okuyor — anahtar üretilemezse motor kendi geçmişini
    // öğrenemez. Bu yüzden seçim burada açıkça yapılır.
    let foundationLabel = '';
    try { foundationLabel = S._onboardingRecommendation?.domainRecs?.[domain]?.foundationLabel || ''; } catch (_) {}

    // MERTEBE (13u) sözün AĞIRLIĞINI seçer — yeni banka satırı gerektirmeden,
    // eldeki malzemeyi yönlendirerek:
    //  · dokunuş → yuva KULLANILMAZ (yuvalı sözler daha talepkârdır: "ertelediğim
    //    konuşmayı açacağım"), en sakin varyant sabitlenir. Küçük olan, tutulan olsun.
    //  · eşik    → yuva TERCİH EDİLİR; isimli ve somut söz daha ağır basar.
    //  · adım    → günün tohumuna göre normal seçim.
    const mertebe = (() => { try { return window.sdMertebe?.(domain) || 'adim'; } catch (_) { return 'adim'; } })();
    const rnd = glDaily('soz-' + domain);
    const idx = (mertebe === 'dokunus') ? 0 : (cell.length ? Math.floor(rnd() * cell.length) : 0);

    // SIRA: Terzi dokuması (13w, gece yazıldı) → yuvalı banka → düz banka.
    // Terzi ağ ÇAĞIRMAZ; yalnız gece saklanmış dokumayı okur — tören beklemez.
    const dokuma = (() => { try { return (window.stBugun?.() || {})[domain] || null; } catch (_) { return null; } })();
    const yuvali = (mertebe === 'dokunus') ? null : _yuvaliSoz(domain, bankKey);
    const text = dokuma || (yuvali ? yuvali.text : (cell[idx] || t('gl.soz_fallback')));

    return {
      domain, label: t('gl.domain.' + domain), glyph: DOMAIN_META[domain].glyph,
      foundationLabel, text,
      // Terzi sözünün banka anahtarı yoktur; ekseni kaybetmemek için
      // eksen anahtarı üretilir (defter 13u bunu okuyup öğrenmeye devam eder).
      key: dokuma ? `gl.terzi.${domain}.${bankKey}` : (yuvali ? yuvali.key : `gl.soz.${domain}.${bankKey}.${idx}`),
      source: dokuma ? 'terzi' : (yuvali ? yuvali.source : 'banka'),
      why: _kanitSatiri(need),
      mertebe,
      frame: mertebe === 'dokunus' ? t('gl.mertebe.dokunus', 'Bugün küçük bir kapı. Küçük olan, tutulan olsun.')
           : mertebe === 'esik' ? t('gl.mertebe.esik', 'Tuttuğun sözler, bugün daha ağırını taşıyor.')
           : '',
    };
  });
}

/* ════════════════════════════════════════════════════════════════════
   ORKESTRATÖR — günde bir kez (Armağan → Söz → uygulama)
════════════════════════════════════════════════════════════════════ */
// Bugün için ritüel UYGUN mu? (kalıcı koşullar — gün bitti / app görünmez ise asla)
function _glRitualApplicable() {
  if (!S._gunlukRitus) return false;
  if (S._gunlukRitus.date === glDayKey() && S._gunlukRitus.finished) return false;
  // Kriz gününde armağan/söz pop-up'ı susar — kutlama töreni kriz anının
  // yanına yakışmaz (Emniyet Katmanı · Faz 2). Ertesi gün normal döner.
  if (S._crisisDayKey && S._crisisDayKey === glDayKey()) return false;
  const app = document.getElementById('app-screen');
  if (!app || app.style.display === 'none') return false;
  return true;
}
/* Tören Wanderer Studio'ya hastır: Armağan/Söz yalnız Bugün ekranında dövülür.
   Emsal 10t `_blocked()`, 13h `_blocked()`, 10u `_maybeUltra()` — 2026-07-12'de
   seri sistemi ikiye ayrılırken (Üç Mühür=Studio, Gün Serisi=LLM) o üç tören
   Bugün'e çekilmişti; 10s o turda atlanmıştı ve günlük ritüel her sahnede
   açılmaya devam etti. Kapı burada kapanır: LLM ön-yüzünde günün töreni yok,
   yalnız 13r Gün Serisi sayar. */
function _glStudioSahnesinde() {
  try { return document.querySelector('.view.active')?.id === 'bugun-view'; }
  catch (_) { return false; }
}
// Şu an başka bir tam-ekran akış (intro/onboarding/kapı/portal) ekranı tutuyor mu?
/* Sahne sırası tek yerden sorulur (13B Tören Kuyruğu). Buradaki liste bir
   zamanlar elle tutuluyordu ve üç kopyası vardı (13h `_blocked`,
   13z `_igBlocked`) — üçü de birbirinden farklı sahneleri tanıyordu: yeni bir
   tören eklendiğinde biri güncellenip öteki unutuluyordu. Kuyruk yoksa
   ENGELLEME (savunmacı: tören ritmi korunur, tören öldürülmez). */
function _glBlockingOverlay() {
  /* KENDİ sahnem kuyruğa devredilmez: kuyruk yüklenmemişse (ya da bir gün
     sökülürse) aynı portal ikinci kez açılıp kullanıcıyı kapana kıstırırdı.
     Bir modülün kendi tekrarına karşı koruması kendisindedir. */
  if (document.getElementById('gl-portal')) return true;
  try { return !!window.trnMesgul?.(); } catch (_) { return false; }
}
export function glShouldRunToday() {
  try { return _glRitualApplicable() && _glStudioSahnesinde() && !_glBlockingOverlay(); } catch (_) { return false; }
}

let _glRetries = 0;
const _GL_MAX_RETRIES = 24; // ~24 × 1500ms ≈ 36sn: intro/onboarding bitene kadar bekle
export function glRunDailyRitual(force) {
  if (!force) {
    if (!_glRitualApplicable()) return;              // bugün uygun değil → vazgeç
    /* Sahne dışındaysak (LLM ön-yüzü, Kütüphane, ara ekran) nabız KURULMAZ ve
       sayaç tüketilmez: sohbette geçirilen süre bir "bekleme" değil kullanıcının
       kararıdır — 36 saniyelik retry bütçesini orada harcarsak Bugün'e dönüldüğünde
       tören için pay kalmaz. Dönüşü iki kurtarma noktası yakalar: switchView
       kancası (03-auth-shell) ve Eşik Ekranı'nın kapanışı (02d). */
    if (!_glStudioSahnesinde()) { _glRetries = 0; return; }
    if (_glBlockingOverlay()) {                       // geçici overlay var → sonra dene
      if (_glRetries++ < _GL_MAX_RETRIES) setTimeout(() => glRunDailyRitual(false), 1500);
      return;
    }
  }
  /* Sıra bizde mi — oturumun davetsiz sahne bütçesi (13B). Reddedilirse
     tetik kendimizde kalır: nabız bir sonraki fırsatta yine sorar. */
  if (!force && window.trnIzin?.('gunluk-ritus') === false) return;
  _glRetries = 0;
  // Yeni gün → state'i tazele (eski günü ÖNCE deftere ver — sıfırlama siler)
  if (!S._gunlukRitus || S._gunlukRitus.date !== glDayKey()) {
    try { window.sdSenkronla?.(S._gunlukRitus); } catch (_) {}
    S._gunlukRitus = Object.assign(_default(), { date: glDayKey() });
  }
  S._gunlukRitus.gift = S._gunlukRitus.gift || glBuildGift();
  glSave();
  _mountPortal();
  glRenderGiftPopup();
}

function _mountPortal() {
  let portal = document.getElementById('gl-portal');
  if (!portal) {
    portal = document.createElement('div');
    portal.id = 'gl-portal';
    document.body.appendChild(portal);
  }
  portal.className = 'gl-portal';
  window.wtOverlayOpen?.('gunluk-ritus');   // Kullanım Nabzı (00f) — Armağan→Söz akışı
  return portal;
}
/** Tanıma Motoru (FAZ 1) — `sonuc` her çağıran yerde AÇIKÇA hardcode edilir
 *  (glConfirmSoz/glConfirmReckoning → 'muhur'; glSkipSoz/glOpenLibraryFromGift
 *  → 'kapat'), bu fonksiyonun kendi çağrılış biçiminden (event listener'a
 *  doğrudan referans) bağımsız — Event nesnesi sızma riski yok. */
function _closePortal(sonuc) {
  window.wtOverlayClose?.('gunluk-ritus', sonuc);
  const portal = document.getElementById('gl-portal');
  if (portal) { portal.remove(); }
  // Portal, elmas barını örtmüş olabilir; mevcut view'e göre yeniden assert et.
  try { glSyncElmasBar(glActiveViewName()); } catch (_) {}
  // Yarım kalan ritüel zinciri: bu portal akşam köprüsünden (at-reckon) gelmiş
  // olabilir; kapanışta akşam törenini idempotent olarak yeniden yokla. atRun
  // kendi uygunluk + bloklayıcı kontrolünü içeride yapar → güvenli.
  try { window.atRun?.(false); } catch (_) {}
}

/* ── 1) GÜNÜN ARMAĞANI ── */
export function glRenderGiftPopup() {
  const portal = _mountPortal();
  const g = S._gunlukRitus.gift;
  const name = esc(_userName());
  const touch = _kisiselDokunis();
  // Akşam töreninin (13h) dün gece bıraktığı niyet — döngü sabah kapanır
  let niyet = null;
  try { niyet = window.atYesterdayIntention?.() || null; } catch (_) {}

  portal.innerHTML = `
    <div class="gl-veil"></div>
    <div class="gl-modal gl-gift" role="dialog" aria-modal="true" aria-label="${t('gl.gift_aria')}"><div class="wn-grain">
      <div class="gl-kicker">${t('gl.gift_kicker')} · ${name.toLocaleUpperCase(_locale())}</div>
      <div class="gl-gift-glyph">✦</div>
      <div class="gl-gift-title">${t('gl.gift_title')}</div>
      <div class="gl-gift-lead">${t('gl.gift_lead')}</div>
      ${g && g.why ? `<div class="gl-soz-why gl-gift-why">${g.why}</div>` : ''}

      <div class="gl-reward-rail" id="gl-reward-rail">
        <div class="gl-reward gl-reward--locked" data-r="elmas">
          <div class="gl-reward-ic">◆</div><div class="gl-reward-lbl">${t('gl.reward_elmas').replace('{n}', g.elmas)}</div>
        </div>
        <div class="gl-reward gl-reward--locked" data-r="soz">
          <div class="gl-reward-ic">❝</div><div class="gl-reward-lbl">${t('gl.reward_quote')}</div>
        </div>
        <div class="gl-reward gl-reward--locked" data-r="yazi">
          <div class="gl-reward-ic">▤</div><div class="gl-reward-lbl">${t('gl.reward_article')}</div>
        </div>
      </div>

      <div class="gl-gift-reveal" id="gl-gift-reveal" hidden>
        ${(g.quotes || []).map(q => `<div class="gl-quote">“${esc(q)}”</div>`).join('')}
        ${g.paragraph ? `<div class="gl-para">${esc(g.paragraph)}</div>` : ''}
        ${touch ? `<div class="gl-touch">♥ ${esc(touch)}</div>` : ''}
        ${niyet ? `<div class="gl-touch">${t('gl.gift_intention').replace('{niyet}', esc(niyet))}</div>` : ''}
        <button class="gl-article" id="gl-article">
          <span class="gl-article-ic">▤</span>
          <span class="gl-article-txt">
            <span class="gl-article-kick">${t('gl.gift_lib_kick')}</span>
            <span class="gl-article-title">${esc(g.article?.title || t('gl.reward_article'))}</span>
          </span>
          <span class="gl-article-arrow">→</span>
        </button>
      </div>

      ${g.claimed
        ? `<button class="gl-cta" id="gl-gift-continue">${t('gl.gift_to_soz')}</button>`
        : `<button class="gl-cta gl-cta--bob" id="gl-gift-claim">${t('gl.gift_claim')}</button>`}
    </div></div>`;

  if (!g.claimed) {
    const btn = document.getElementById('gl-gift-claim');
    if (btn) btn.addEventListener('click', glClaimGift);
  } else {
    _revealGift();
    const cont = document.getElementById('gl-gift-continue');
    if (cont) cont.addEventListener('click', glRenderSozPopup);
  }
  const art = document.getElementById('gl-article');
  if (art) art.addEventListener('click', glOpenLibraryFromGift);
}

function _revealGift() {
  const reveal = document.getElementById('gl-gift-reveal');
  if (reveal) reveal.hidden = false;
  document.querySelectorAll('#gl-reward-rail .gl-reward').forEach((el, i) => {
    setTimeout(() => el.classList.remove('gl-reward--locked'), 120 + i * 220);
  });
}

export function glClaimGift() {
  const g = S._gunlukRitus.gift;
  if (!g || g.claimed) return;
  g.claimed = true;
  glSave();
  try { window.fxCue?.('gift'); } catch (_) {} // His Motoru — armağan çanı
  try { awardElmas(g.elmas || GIFT_ELMAS, 'gunluk-armagan'); } catch (_) {}
  try { window.wtLogRitus?.('gunluk-ritus', 'basladi', { adim: 1 }); } catch (_) {}
  // butonu "devam"a çevir + ödülleri aç
  glRenderGiftPopup();
}

export function glOpenLibraryFromGift() {
  // Armağan tamamlanmamışsa önce topla
  try { if (S._gunlukRitus?.gift && !S._gunlukRitus.gift.claimed) glClaimGift(); } catch (_) {}
  // Tanıma Motoru (FAZ 1) — Söz adımına değmeden Kitaplık'a sapmak: ritüel "yarım".
  _closePortal('kapat');
  // ÖNEMLİ: günü _finishToday ile kapatmıyoruz — kullanıcı Kitaplık'tan BUGÜN'E
  // dönünce ritüel "yarım" sayılır ve switchView kancası glRunDailyRitual'ı
  // yeniden tetikler (Armağan zaten toplanmış → "SÖZE GEÇ" buton hâliyle açılır).
  // Tören sahnesi Studio'ya has olduğu için Kitaplık okurunun üstünde AÇILMAZ;
  // orada beklemesi kasıtlıdır — yazıyı okuyan kesilmesin. Söze hiç değmek
  // istemiyorsa SKIP yoluyla bilinçli çıkar.
  try { window.libOpenReader && window.libOpenReader(0); } catch (_) {}
  // Bugün'de Verdiğin Söz alanını tazele (söz verilmediyse boş)
  try { glRenderVerdiginSoz(); } catch (_) {}
}

/* ── Söz'ü sonradan (Bugün'deki davet kartından) doğrudan aç ── */
/* Çalışma Kağıdı'nın 4. adımından gelen cümle (13b "Bunu bugünün sözü yap →").
   Tek seferliktir: pop-up basılırken portala devredilir ve burası boşalır. */
let _kagitOneri = '';

export function glGiveSozNow(oneri) {
  _kagitOneri = typeof oneri === 'string' ? oneri.trim() : '';
  if (document.getElementById('gl-portal')) return; // zaten bir akış açık
  if (!S._gunlukRitus || S._gunlukRitus.date !== glDayKey()) {
    try { window.sdSenkronla?.(S._gunlukRitus); } catch (_) {}  // eski günü kaybetme
    S._gunlukRitus = Object.assign(_default(), { date: glDayKey() });
    glSave();
  }
  _mountPortal();
  glRenderSozPopup();
}

/* DUYGU MOTORU DAVETİ (13D K10/FAZ 17) — tören kendi sesini korur, `DG_CUE`
   burada devreye girmez (10s zaten `gift`/`soz` cue'sunu taşır, K8'in beden
   kanalı dolu). Geriye yalnız SÖZ kanalı kalır: okuma varsa mevcut lead
   paragrafının BAŞINA tek cümle eklenir, paragrafın kendisi DEĞİŞMEZ.
   `taniklik`/`tutma`da cümle YOK — tablo plan FAZ 17'de karara bağlandı,
   burada İCAT EDİLMEDİ. */
function _dgSozCumle(eksen) {
  const CUMLE = {
    yatistirma: t('gl.soz_dg.yatistirma', 'Bugün tek bir şey yeter — en küçüğünü seç.'),
    sahiplenme: t('gl.soz_dg.sahiplenme', 'Sözü bir borç gibi değil, kendine bir iyilik gibi kur.'),
    berraklik: t('gl.soz_dg.berraklik', 'Tek bir cümle, karışık bir günü ayırmaya yeter.'),
    diriltme: t('gl.soz_dg.diriltme', 'Küçük bir kıvılcım da bir gündür — yapabileceğin en küçük adımı seç.'),
    kutlama: t('gl.soz_dg.kutlama', 'İyi bir gün, bir söze bağlanınca yarına taşınır.'),
  };
  return CUMLE[eksen] || null;
}

/** `dgKapi('toren', …)` TEK kapıdır — `S._dgNabiz`/`S._dgIklim` burada
 *  DOĞRUDAN okunmaz (K10). İki tanık şartını `oncekiNabiz` + `zaman`
 *  karşılar (FAZ 17'nin doğurduğu iki alan, 00-config-tracking.js). window
 *  köprüsü bu dosyanın kendi konvansiyonudur ("modüller-arası erişim
 *  window.*" — banner) — okuma yoksa sessizce düş. */
function _dgTorenOkuma() {
  try {
    return window.dgKapi?.('toren', {
      nabiz: S._dgNabiz || null,
      oncekiNabiz: S._dgOncekiNabiz || null,
      iklim: S._dgIklim || null,
      zaman: S._dgNabizZaman || null,
      akis: { yon: S._dgYay, gecmis: S._dgSonKarsilama },
    });
  } catch (e) { console.warn('dgTorenOkuma(soz):', e && e.message); return null; }
}

/* ── 2) GÜNÜN SÖZÜ ── */
export function glRenderSozPopup() {
  const portal = _mountPortal();
  const name = esc(_userName());
  const sozler = glBuildSozler();
  // seçim/yazım durumunu portalda taşı
  portal._sozler = sozler;
  portal._selected = portal._selected || {}; // {domain:true}
  portal._matched = portal._matched || {};   // {domain:true}
  portal._oneri = _kagitOneri; _kagitOneri = '';

  const dgOkuma = _dgTorenOkuma();
  const dgCumle = dgOkuma ? _dgSozCumle(dgOkuma.eksen) : null;

  portal.innerHTML = `
    <div class="gl-veil"></div>
    <div class="gl-modal gl-soz" role="dialog" aria-modal="true" aria-label="${t('gl.soz_aria')}"><div class="wn-grain">
      <div class="gl-kicker">${t('gl.soz_kicker')} · ${name.toLocaleUpperCase(_locale())}</div>
      <div class="gl-soz-title">${t('gl.soz_title')}</div>
      <!-- Sabah Sorusu (Zihniyet Devrimi, deneme 152). Kitabın gece
           karşılığı persona'da zaten var (16b prompt.daily.evening_question);
           eksik olan sabah tarafıydı. Metin 10k'nın Sabah Sorusu setinden
           OKUNUR — aynı cümle iki sözlük satırında yaşamasın. Soru NEDEN
           söz verildiğini söyler, altındaki lead NASIL verileceğini. -->
      <div class="gl-soz-question">${t('sk.set.sabah.q0')}</div>
      <div class="gl-soz-lead">${dgCumle ? `${dgCumle} ` : ''}${t('gl.soz_lead')}</div>
      ${portal._oneri ? `<div class="gl-soz-fromkagit">${t('gl.soz_from_kagit')}</div>` : ''}
      <div class="gl-soz-areas">
        ${sozler.map(s => `
          <div class="gl-area" data-domain="${s.domain}">
            <button class="gl-area-head" data-domain="${s.domain}" aria-pressed="false">
              <span class="gl-area-glyph">${s.glyph}</span>
              <span class="gl-area-info">
                <span class="gl-area-label">${esc(s.label)}</span>
                ${s.foundationLabel ? `<span class="gl-area-found">${esc(s.foundationLabel)}</span>` : ''}
              </span>
              <span class="gl-area-check">＋</span>
            </button>
            <div class="gl-area-body" hidden>
              ${s.why ? `<div class="gl-soz-why">${s.why}</div>` : ''}
              <div class="gl-soz-text">“${esc(s.text)}”</div>
              ${s.frame ? `<div class="gl-soz-frame gl-soz-frame--${s.mertebe}">${esc(s.frame)}</div>` : ''}
              <input class="gl-soz-input" type="text" data-domain="${s.domain}"
                     placeholder="${t('gl.soz_input_ph')}" autocomplete="off" autocorrect="off" spellcheck="false"
                     maxlength="${SOZ_MAX_KARAKTER}">
              <div class="gl-soz-state" data-domain="${s.domain}"></div>
              <button type="button" class="gl-soz-own" data-domain="${s.domain}">${t('gl.soz_own_btn', 'Kendi sözümü yazayım')}</button>
            </div>
          </div>`).join('')}
      </div>
      <div class="gl-soz-foot">
        <button class="gl-cta" id="gl-soz-confirm" disabled>${t('gl.seal_btn')}</button>
        <button class="gl-skip" id="gl-soz-skip">${t('gl.soz_skip').replace('{n}', SKIP_PENALTY)}</button>
      </div>
    </div></div>`;

  /* DAMGA (K13, §6.10) — "teslim eden basar". Kapıdan geçmek yetmez;
     `dgCumle` yalnız cümle GERÇEKTEN paragrafa yazıldığında dolu — burada
     kapı ile teslim aynı dal, ayrıştırmaya gerek yok. taniklik/tutma'da
     ya da okuma null'sa `dgCumle` de null'dır, damga da basılmaz. İklim
     hidre değilse yazacak defter yoktur (01-prompts-modes.js:344 emsali). */
  if (dgCumle && S._dgIklim) {
    S._dgIklim = window.dgYanilmaKonustu?.(S._dgIklim, 'toren') || S._dgIklim;
    window.dgIklimKaydet?.(S._dgIklim);
  }
  /* İKİNCİ DEFTER (00f wtLogDuygu) — gerekçe kanalın kendi evinde
     (00f-kullanim-nabzi.js, `_DG_YUZEY`); kapı: 13D-iki-defter-kapisi. */
  if (dgCumle) { try { window.wtLogDuygu?.(dgOkuma.eksen, { yuzey: 'toren', duzeltildi: false }); } catch (_) {} }

  // alan seç/aç
  portal.querySelectorAll('.gl-area-head').forEach(head => {
    head.addEventListener('click', () => {
      const d = head.dataset.domain;
      const area = portal.querySelector(`.gl-area[data-domain="${d}"]`);
      const body = area.querySelector('.gl-area-body');
      const open = portal._selected[d] = !portal._selected[d];
      head.setAttribute('aria-pressed', open ? 'true' : 'false');
      head.classList.toggle('gl-area-head--on', open);
      head.querySelector('.gl-area-check').textContent = open ? '✓' : '＋';
      body.hidden = !open;
      if (open) {
        const inp = body.querySelector('.gl-soz-input');
        /* Çalışma Kağıdı'ndan gelen cümle İLK açılan alana taşınır — kullanıcı
           aynı sözü iki kez yazmasın. Alan kendi-söz moduna geçer (harfiyen
           kapısı kendi cümlesinde uygulanmaz); mührü yine kullanıcı basar, söz
           arka planda YAZILMAZ — 13b'nin sözleşmesi bozulmuyor. */
        if (portal._oneri && !portal._oneriKullanildi) {
          portal._oneriKullanildi = true;
          area.querySelector('.gl-soz-own')?.click();
          if (inp) { inp.value = portal._oneri; inp.dispatchEvent(new Event('input', { bubbles: true })); }
        }
        setTimeout(() => inp && inp.focus(), 60);
      }
      else { portal._matched[d] = false; }
      _glSozRefresh();
    });
  });

  // KENDİ SÖZÜNÜ YAZ — söz senin ağzından çıkmalı. Kendi cümlesini yazan
  // kullanıcıdan onu bir kez daha harfiyen yazması istenmez (zaten kendi
  // yazdı); yalnız anlamlı uzunluk kapısı uygulanır.
  portal._own = portal._own || {};
  portal.querySelectorAll('.gl-soz-own').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = btn.dataset.domain;
      const area = portal.querySelector(`.gl-area[data-domain="${d}"]`);
      const inp = area.querySelector('.gl-soz-input');
      const stateEl = area.querySelector(`.gl-soz-state[data-domain="${d}"]`);
      const acik = portal._own[d] = !portal._own[d];

      area.classList.toggle('gl-area--own', acik);
      btn.textContent = acik ? t('gl.soz_own_back', 'Önerilen söze dön') : t('gl.soz_own_btn', 'Kendi sözümü yazayım');
      inp.placeholder = acik ? t('gl.soz_own_ph', 'Kendi cümlenle söyle…') : t('gl.soz_input_ph');
      inp.value = '';
      inp.classList.remove('gl-soz-input--ok', 'gl-soz-input--bad');
      if (stateEl) stateEl.textContent = '';
      portal._matched[d] = false;
      setTimeout(() => inp.focus(), 40);
      _glSozRefresh();
    });
  });

  // harfiyen yazım doğrulaması
  portal.querySelectorAll('.gl-soz-input').forEach(inp => {
    inp.addEventListener('input', () => {
      const d = inp.dataset.domain;
      const target = sozler.find(s => s.domain === d);
      const stateEl = portal.querySelector(`.gl-soz-state[data-domain="${d}"]`);

      if (portal._own && portal._own[d]) {
        const uzun = inp.value.trim().length >= SOZ_MIN_KARAKTER;
        portal._matched[d] = uzun;
        inp.classList.toggle('gl-soz-input--ok', uzun);
        inp.classList.toggle('gl-soz-input--bad', !uzun && inp.value.length > 0);
        if (stateEl) stateEl.textContent = uzun ? t('gl.soz_own_ok', 'Sözün hazır.') : (inp.value.length ? t('gl.soz_own_short', 'Biraz daha açık yaz.') : '');
        _glSozRefresh();
        return;
      }

      const ok = _normalize(inp.value) === _normalize(target.text);
      portal._matched[d] = ok;
      inp.classList.toggle('gl-soz-input--ok', ok);
      inp.classList.toggle('gl-soz-input--bad', !ok && inp.value.length > 0);
      if (stateEl) stateEl.textContent = ok ? t('gl.soz_exact') : (inp.value.length ? t('gl.soz_partial') : '');
      _glSozRefresh();
    });
  });

  document.getElementById('gl-soz-confirm').addEventListener('click', glConfirmSoz);
  document.getElementById('gl-soz-skip').addEventListener('click', glSkipSoz);
  _glSozRefresh();
}

function _glSozRefresh() {
  const portal = document.getElementById('gl-portal');
  if (!portal) return;
  const sel = portal._selected || {};
  const matched = portal._matched || {};
  const selCount = Object.keys(sel).filter(d => sel[d]).length;
  const allMatched = Object.keys(sel).filter(d => sel[d]).every(d => matched[d]);
  const btn = document.getElementById('gl-soz-confirm');
  const ready = selCount >= 1 && allMatched;
  if (btn) {
    btn.disabled = !ready;
    const reward = SOZ_REWARD[Math.min(selCount, 3)] || 0;
    btn.textContent = selCount ? t('gl.seal_reward').replace('{n}', reward) : t('gl.seal_btn');
  }
}

export function glConfirmSoz() {
  const portal = document.getElementById('gl-portal');
  if (!portal) return;
  const sel = portal._selected || {};
  const sozler = portal._sozler || [];
  const chosen = sozler.filter(s => sel[s.domain] && (portal._matched || {})[s.domain])
    .map(s => {
      // Kendi sözünü yazdıysa mühürlenen ONUN cümlesidir; banka anahtarı
      // düşer (defter bunu 'user' kaynağı olarak öğrenir ve Terzi'ye üslup
      // örneği olur), eksen bilgisi ise anahtarsız kaydedilir.
      if (!(portal._own || {})[s.domain]) return s;
      const inp = portal.querySelector(`.gl-soz-input[data-domain="${s.domain}"]`);
      const kendi = (inp && inp.value.trim().slice(0, SOZ_MAX_KARAKTER)) || '';
      if (kendi.length < SOZ_MIN_KARAKTER) return s;
      return { ...s, text: kendi, key: null, source: 'user' };
    });
  if (!chosen.length) return;
  S._gunlukRitus.pledges = chosen.map(s => ({
    domain: s.domain, label: s.label, glyph: s.glyph, text: s.text, foundationLabel: s.foundationLabel,
    // Söz Defteri (13u) ekseni bu anahtardan okur; kaynak, sözü kimin
    // dokuduğunu söyler (banka | kisi | olay | terzi | user).
    key: s.key || null, source: s.source || 'banka', mertebe: s.mertebe || 'adim',
  }));
  S._gunlukRitus.skipped = false;
  glSave();
  try { window.fxCue?.('soz'); } catch (_) {} // His Motoru — yemin tınısı
  const reward = SOZ_REWARD[Math.min(chosen.length, 3)] || 0;
  try { awardElmas(reward, 'gunluk-soz'); } catch (_) {}
  recordActivityDay();  // emek sayar: verilen söz günü seriye yazar
  try { window.wtLogRitus?.('gunluk-ritus', 'tamam', { adim: 2 }); } catch (_) {}
  _closePortal('muhur');   // Tanıma Motoru (FAZ 1) — söz verildi, mühürlendi
  _finishToday(false);
  try { glRenderVerdiginSoz(); } catch (_) {}
  try { window.usCheckSozDay?.(); } catch (_) {} // Söz Mührü serisini besle
  _chainSeal();
}

export function glSkipSoz() {
  S._gunlukRitus.pledges = [];
  S._gunlukRitus.skipped = true;
  glSave();
  try { spendElmas(SKIP_PENALTY, 'gunluk-soz-atla'); } catch (_) {}
  try { window.wtLogRitus?.('gunluk-ritus', 'birakti', { adim: 2 }); } catch (_) {}
  _closePortal('kapat');   // Tanıma Motoru (FAZ 1) — bilinçli vazgeçiş
  _finishToday(true);
  try { glRenderVerdiginSoz(); } catch (_) {}
  _chainSeal();
}

function _finishToday(skipped) {
  S._gunlukRitus.date = glDayKey();
  S._gunlukRitus.finished = true;
  if (skipped) S._gunlukRitus.skipped = true;
  glSave();
  glElmasBarUpdate();
  try { window.wkSync?.(); } catch (_) {} // Widget köprüsü (13k) — söz durumu tazele
}

// Birleşik Sabah Ayini — Armağan → Söz → MÜHÜR tek sürekli akış. Söz biter
// bitmez (Bugün'deyken) günü mühürleme törenini akıt; 2200ms boot timer'ını
// beklemeye gerek kalmaz. Seri Mührü guard'ları (lastSealedDay/sm-portal/bugun)
// çift tetiği zaten engeller → güvenli.
function _chainSeal() {
  setTimeout(() => { try { window.smRunDaily?.(false); } catch (_) {} }, 360);
}

/* ════════════════════════════════════════════════════════════════════
   AKŞAM HESABI — "Sözünü tuttun mu?" (Tutarlılık döngüsünü kapatır)
   ───────────────────────────────────────────────────────────────────
   Sabah verilen söz, gün sonunda dürüstçe hesaplanır. Tutulan söz =
   bonus elmas + Seri Mührü'nü besler. Tutamamak cezasız (dürüstlüğü
   teşvik): "düşmek değil, gizlemek yenilgidir." Tek kimlik inşası:
   söz vermek → günü mühürlemek → sözü tutmak.
════════════════════════════════════════════════════════════════════ */
export function glReckoningAvailable() {
  const r = S._gunlukRitus;
  const today = glDayKey();
  return !!(r && r.date === today && Array.isArray(r.pledges) && r.pledges.length && !r.reckoned);
}

export function glRunEveningReckoning() {
  if (document.getElementById('gl-portal')) return;          // başka akış açık
  if (!glReckoningAvailable()) return;
  _mountPortal();
  _renderReckoning();
}

function _renderReckoning() {
  const portal = _mountPortal();
  const name = esc(_userName());
  const pledges = (S._gunlukRitus && S._gunlukRitus.pledges) || [];
  portal._reckon = {}; // {domain: 'kept'|'broke'}

  portal.innerHTML = `
    <div class="gl-veil"></div>
    <div class="gl-modal gl-reckon" role="dialog" aria-modal="true" aria-label="${t('gl.reckon_aria')}"><div class="wn-grain">
      <div class="gl-kicker">${t('gl.reckon_kicker')} · ${name.toLocaleUpperCase(_locale())}</div>
      <div class="gl-reckon-title">${t('gl.reckon_title')}</div>
      <div class="gl-soz-lead">${t('gl.reckon_lead')}</div>
      <div class="gl-reckon-list">
        ${pledges.map(p => `
          <div class="gl-reckon-row" data-domain="${esc(p.domain)}">
            <div class="gl-reckon-info">
              <div class="gl-vs-area">${esc(p.label)}${p.foundationLabel ? ` · ${esc(p.foundationLabel)}` : ''}</div>
              <div class="gl-vs-text">“${esc(p.text)}”</div>
            </div>
            <div class="gl-reckon-btns">
              <button class="gl-reckon-btn gl-reckon-yes" data-domain="${esc(p.domain)}" data-v="kept" type="button">${t('gl.reckon_kept')}</button>
              <button class="gl-reckon-btn gl-reckon-no" data-domain="${esc(p.domain)}" data-v="broke" type="button">${t('gl.reckon_broke')}</button>
            </div>
            <div class="gl-reason" data-domain="${esc(p.domain)}" hidden>
              <div class="gl-reason-q">${t('gl.reason_q', 'Ne engel oldu?')}</div>
              <div class="gl-reason-opts">
                ${REASONS.map(r => `<button type="button" class="gl-reason-btn" data-domain="${esc(p.domain)}" data-r="${r}">${t('gl.reason.' + r, r)}</button>`).join('')}
              </div>
            </div>
          </div>`).join('')}
      </div>
      <div class="gl-soz-foot">
        <button class="gl-cta" id="gl-reckon-confirm" disabled>${t('gl.reckon_seal')}</button>
      </div>
    </div></div>`;

  portal.querySelectorAll('.gl-reckon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = btn.dataset.domain, v = btn.dataset.v;
      portal._reckon[d] = v;
      const row = portal.querySelector(`.gl-reckon-row[data-domain="${d}"]`);
      row.querySelectorAll('.gl-reckon-btn').forEach(b => b.classList.toggle('gl-reckon-btn--on', b.dataset.v === v));
      row.classList.toggle('gl-reckon-row--kept', v === 'kept');
      row.classList.toggle('gl-reckon-row--broke', v === 'broke');
      // "Tutamadım" dendiğinde sebep açılır — CEZA DEĞİL, ölçü: "fazla
      // büyüktü" cevabı yarının sözünü küçültür (13u sdMertebe).
      const rBox = row.querySelector('.gl-reason');
      if (rBox) {
        rBox.hidden = (v !== 'broke');
        if (v !== 'broke') { delete portal._reason?.[d]; }
      }
      _reckonRefresh();
    });
  });

  portal._reason = {};
  portal.querySelectorAll('.gl-reason-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = btn.dataset.domain, r = btn.dataset.r;
      portal._reason[d] = r;
      btn.parentElement.querySelectorAll('.gl-reason-btn')
        .forEach(b => b.classList.toggle('gl-reason-btn--on', b === btn));
    });
  });
  document.getElementById('gl-reckon-confirm').addEventListener('click', glConfirmReckoning);
}

function _reckonRefresh() {
  const portal = document.getElementById('gl-portal');
  if (!portal) return;
  const pledges = (S._gunlukRitus && S._gunlukRitus.pledges) || [];
  const decided = pledges.length && pledges.every(p => portal._reckon[p.domain]);
  const keptN = pledges.filter(p => portal._reckon[p.domain] === 'kept').length;
  const btn = document.getElementById('gl-reckon-confirm');
  if (btn) {
    btn.disabled = !decided;
    btn.textContent = (decided && keptN) ? t('gl.reckon_seal_reward').replace('{n}', keptN * KEPT_REWARD) : t('gl.reckon_seal');
  }
}

export function glConfirmReckoning() {
  const portal = document.getElementById('gl-portal');
  if (!portal) return;
  const r = S._gunlukRitus;
  const pledges = (r && Array.isArray(r.pledges)) ? r.pledges : [];
  if (!pledges.length || !pledges.every(p => portal._reckon[p.domain])) return;
  let keptN = 0;
  pledges.forEach(p => {
    const kept = portal._reckon[p.domain] === 'kept';
    p.kept = kept;
    // Sebep yalnız tutulamayan sözde anlamlıdır; tutulduysa temizlenir ki
    // eski bir gerekçe mertebeyi haksız yere aşağı çekmesin.
    p.reason = kept ? null : ((portal._reason || {})[p.domain] || null);
    if (kept) keptN++;
  });
  r.reckoned = true;
  glSave();
  if (keptN) { try { awardElmas(keptN * KEPT_REWARD, 'gunluk-soz-tuttu'); } catch (_) {} }
  recordActivityDay();  // emek sayar: akşam hesabını veren gün seriye yazar
  // adim 3 = akşam hesabı; n = tutulan söz sayısı (söz-tutma oranının payı)
  try { window.wtLogRitus?.('gunluk-ritus', 'tamam', { adim: 3, n: keptN }); } catch (_) {}
  _closePortal('muhur');   // Tanıma Motoru (FAZ 1) — akşam hesabı tamamlandı
  glElmasBarUpdate();
  try { glRenderVerdiginSoz(); } catch (_) {}
  try { window.smRenderBugunCard?.(); } catch (_) {} // Seri Mührü kartı söz durumunu yansıtsın
  try { window.wkSync?.(); } catch (_) {} // Widget köprüsü (13k) — hesap sonucu tazele
}

/* ════════════════════════════════════════════════════════════════════
   VERDİĞİN SÖZ — Bugün view kartı (#gl-verdigin-soz)
   1 söz: statik · >1 söz: birkaç saniyede canlı geçiş (crossfade)
════════════════════════════════════════════════════════════════════ */
let _verdiginTimer = null;

export function glRenderVerdiginSoz() {
  const host = document.getElementById('gl-verdigin-soz');
  if (!host) return;
  if (_verdiginTimer) { clearInterval(_verdiginTimer); _verdiginTimer = null; }

  const r = S._gunlukRitus;
  const today = glDayKey();
  const pledges = (r && r.date === today && Array.isArray(r.pledges)) ? r.pledges : [];

  // Boş durum → DAİMA görünür bir davet kartı (söz vermeye / yeniden vermeye).
  // "Olmak İstediğin Kişi"nin altında durduğu için o kişiye giden adımı çağırır.
  if (!pledges.length) {
    const skipped = !!(r && r.date === today && r.skipped);
    host.innerHTML = `<button class="gl-vs-card gl-vs-card--invite" id="gl-vs-invite" type="button">
      <span class="gl-vs-seal">◈</span>
      <span class="gl-vs-invite-body">
        <span class="gl-kicker">${t('gl.vs_kicker')}</span>
        <span class="gl-vs-invite-text">${skipped
          ? t('gl.vs_skipped')
          : t('gl.vs_invite')}</span>
      </span>
      <span class="gl-vs-invite-cta">${t('gl.vs_give')}</span>
    </button>`;
    const b = document.getElementById('gl-vs-invite');
    if (b) b.addEventListener('click', glGiveSozNow);
    return;
  }

  // Akşam hesabı durumu — tutuldu/tutulmadı işareti + alt eylem.
  const reckoned = !!(r && r.date === today && r.reckoned);
  const mark = (p) => !reckoned ? ''
    : (p.kept ? `<span class="gl-vs-mark gl-vs-mark--kept">${t('gl.vs_kept')}</span>`
              : `<span class="gl-vs-mark gl-vs-mark--broke">${t('gl.vs_broke')}</span>`);
  const keptN = reckoned ? pledges.filter(p => p.kept).length : 0;
  const footer = reckoned
    ? `<div class="gl-vs-foot gl-vs-foot--done">${t('gl.vs_done').replace('{k}', keptN).replace('{n}', pledges.length)}</div>`
    : `<button class="gl-vs-foot gl-vs-foot--cta" id="gl-vs-reckon" type="button">${t('gl.vs_reckon_cta')}</button>`;

  const renderOne = (p) => `
    <div class="gl-vs-glyph">${esc(p.glyph || '◆')}</div>
    <div class="gl-vs-body">
      <div class="gl-vs-area">${esc(p.label)}${p.foundationLabel ? ` · ${esc(p.foundationLabel)}` : ''}${mark(p)}</div>
      <div class="gl-vs-text">“${esc(p.text)}”</div>
    </div>`;

  // Bugün kartından akşam girişi → tam "Gün Kapanıyor" töreni (13h: GELDİN/GÖRDÜN/
  // YAPTIN + Yarına Niyet). Söz muhasebesi (Akşam Hesabı) artık onun içindeki YAPTIN
  // "Hesapla →" alt-adımı; çıplak reckoning'i doğrudan açmıyoruz. force=true → 13h'in
  // saat/gün-kapandı guard'larını atlar (manuel giriş). atRun yoksa eski davranışa düş.
  const bindReckon = () => {
    const rb = document.getElementById('gl-vs-reckon');
    if (rb) rb.addEventListener('click', () => {
      if (typeof window.atRun === 'function') { try { window.atRun(true); return; } catch (_) {} }
      glRunEveningReckoning();
    });
  };

  if (pledges.length === 1) {
    host.innerHTML = `<div class="gl-vs-card ${reckoned ? (pledges[0].kept ? 'gl-vs-card--kept' : 'gl-vs-card--broke') : ''}">
      <div class="gl-kicker">${t('gl.vs_card_kicker')}</div>
      <div class="gl-vs-row">${renderOne(pledges[0])}</div>
      ${footer}
    </div>`;
    bindReckon();
    return;
  }

  // Birden çok söz → canlı geçiş
  host.innerHTML = `<div class="gl-vs-card gl-vs-card--live">
    <div class="gl-kicker">${t('gl.vs_card_kicker_multi').replace('{n}', pledges.length)}</div>
    <div class="gl-vs-row" id="gl-vs-row">${renderOne(pledges[0])}</div>
    <div class="gl-vs-dots" id="gl-vs-dots">${pledges.map((_, i) => `<span class="gl-vs-dot${i === 0 ? ' on' : ''}"></span>`).join('')}</div>
    ${footer}
  </div>`;
  bindReckon();

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (reduce) {
    // Tüm sözleri listele (geçiş yok)
    const row = document.getElementById('gl-vs-row');
    if (row) row.innerHTML = pledges.map(p => `<div class="gl-vs-stack">${renderOne(p)}</div>`).join('');
    const dots = document.getElementById('gl-vs-dots'); if (dots) dots.remove();
    return;
  }

  let idx = 0;
  _verdiginTimer = setInterval(() => {
    if (!document.getElementById('gl-vs-row')) { clearInterval(_verdiginTimer); _verdiginTimer = null; return; }
    idx = (idx + 1) % pledges.length;
    const row = document.getElementById('gl-vs-row');
    if (!row) return;
    row.classList.add('gl-vs-fade');
    setTimeout(() => {
      row.innerHTML = renderOne(pledges[idx]);
      row.classList.remove('gl-vs-fade');
      document.querySelectorAll('#gl-vs-dots .gl-vs-dot').forEach((d, i) => d.classList.toggle('on', i === idx));
    }, 320);
  }, 4200);
}

/* ── yazım normalizasyonu (harfiyen, noktalama toleranslı, tr locale) ── */
function _normalize(s) {
  return String(s == null ? '' : s)
    .toLocaleLowerCase(_locale())
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ── window expose (HTML/inline + TDZ-güvenli modüller-arası erişim) ── */
if (typeof window !== 'undefined') {
  window.glInit = glInit;
  window.glRunDailyRitual = glRunDailyRitual;
  window.glRenderGiftPopup = glRenderGiftPopup;
  window.glClaimGift = glClaimGift;
  window.glOpenLibraryFromGift = glOpenLibraryFromGift;
  window.glRenderSozPopup = glRenderSozPopup;
  window.glGiveSozNow = glGiveSozNow;
  window.glConfirmSoz = glConfirmSoz;
  window.glSkipSoz = glSkipSoz;
  window.glRenderVerdiginSoz = glRenderVerdiginSoz;
  window.glRunEveningReckoning = glRunEveningReckoning;
  window.glConfirmReckoning = glConfirmReckoning;
  window.glReckoningAvailable = glReckoningAvailable;
  window.glElmasBarUpdate = glElmasBarUpdate;
  window.glSyncElmasBar = glSyncElmasBar;
  window.glActiveViewName = glActiveViewName;
}
