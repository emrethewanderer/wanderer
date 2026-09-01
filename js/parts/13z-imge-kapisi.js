/* ═══════════════════════════════════════════════════════
   13z — İMGE KAPISI · Kullanıcının Kendi Metaforu
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Zaltman'ın %95 kuralı (Tüketici Nasıl Düşünür): düşüncenin ezici kısmı
     bilinçdışıdır ve kelimelerle değil İMGELERLE yürür. "Ne istersin?"
     diye sormak yalnız %5'e — bilince — sorar. Bu modül geri kalan %95'e
     kapı açar: kullanıcı 12 arketipik imgeden birini SEÇER, "bu imge
     neden sen?" sorusuna KENDİ cümlesiyle cevap verir. "Mesele Sensin"
     burada da geçerlidir — uygulama bir imge İCAT ETMEZ, LLM "sen aslında
     bir fırtınasın" demez; yalnız kullanıcının seçtiğini geri yankılar.
     Bu yüzden veri katmanının tek girişi bir MÜHÜRLEME fiilidir (`igSec`),
     bir üretim fiili değil — boş beyan beyan değildir (Gerçeklik Kuralı).

   DERİN METAFOR (TASARIM-PRENSIPLERI.md §0.1): KAP — imge içine girilen,
     kişinin kendini bıraktığı bir kaptır; tören bu yüzden yolculuk değil
     kapanma/mühürleme ritmindedir (ızgara → tek imge → mühür).

   MEKANİK / MİMARİ / TEK GİRİŞ:
     İki yarım tek dosyada: (1) VERİ — `igSec(id, neden)` seçimi mühürler
     (id `IG_IMGELER` içinde + neden `kokenKirp` sonrası boş DEĞİLSE, aksi
     hâlde hiçbir şey kaydedilmez); `igGetAktif()` sonucu `kokenBeyan` ile
     sarıp `.kanit` alanıyla donatır — çağıran hem `kokenVar()` hem
     `kokenKayitVar()` kapısından geçirebilir. (2) TÖREN — `igOpenKapi()`
     tek girişli portal (#ig-portal): 12 imge ızgarası → "neden sen?" →
     basılı-tut mühür. Motifler prosedürel SVG (harici asset YOK), seed
     `stableHash(uid|id)` ile kişiye özel ama STABİL — aynı imge her
     açılışta birebir aynı görünür.
     İmge seçilmemişse hiçbir çağıran bir şey görmez: varsayılan imge
     YOKTUR, yalnız davet vardır (`igMaybeInvite`).

   Kalıcılık: SafeStorage per-uid (etw_imge_v1_<uid>)
   Konvansiyon: i18n t('imge.*', fallback); window.ig* expose; stiller
     css/parts/imge.css.

   ÖNEK NOTU (uygulayıcı kararı — plan `im` öneriyordu): `im` öneki VE
   `window.im*` alanı `13l-kimlik-motoru.js`de (Olduğun Kişi çözücüsü)
   zaten canlı ve 13 dosyada tüketiliyor (imGetCurrent/imGetContext/
   imResolve/imEvent/imInit…). Aynı önekle ikinci bir modül açmak
   `window.imInit`i sessizce ezerdi. Modül önekine bu yüzden `ig`
   (İmge) seçildi; grep ile çakışma yok doğrulandı. Ayrıntı: uygulayıcı
   raporunun Duraklar bölümü.
═══════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage, localISODate, escapeHTML, stableHash, seededRng } from './00a-infrastructure.js';
import { kokenBeyan, kokenKirp } from './13y-koken.js';
import { t } from './15-i18n.js';
import { awardElmas } from './10g-w2-wanderer-game.js';

/* ─── 1. SABİTLER ─── */

const STORAGE_KEY = 'etw_imge_v1';

/** Geçmişte tutulan önceki imgelerin tavanı — 12 arketipin tamamı kadar
 *  yer bırakır (döngüsel bir seçimde bile hiçbir kayıt sessizce basılmaz). */
const IG_GECMIS_MAX = 12;

/* ─── 2. İMGE TABLOSU (12 arketip) ───────────────────────────────────
   Yalnız id + i18n anahtarı taşınır — TR ad burada HARDCODE edilmez
   (Gerçeklik/i18n paritesi); adı çözen FAZ 2 t(entry.i18nKey, …) çağırır.
   Sıra plandan (K1, FAZ 1): kapı · deniz · dağ · ateş · köprü · tohum ·
   fener · yol · kanat · kök · yıldız · kumru (kitap-köklü: yayın günü
   salınan Ku). */
export const IG_IMGELER = [
  { id: 'kapi',   i18nKey: 'imge.ad.kapi' },
  { id: 'deniz',  i18nKey: 'imge.ad.deniz' },
  { id: 'dag',    i18nKey: 'imge.ad.dag' },
  { id: 'ates',   i18nKey: 'imge.ad.ates' },
  { id: 'kopru',  i18nKey: 'imge.ad.kopru' },
  { id: 'tohum',  i18nKey: 'imge.ad.tohum' },
  { id: 'fener',  i18nKey: 'imge.ad.fener' },
  { id: 'yol',    i18nKey: 'imge.ad.yol' },
  { id: 'kanat',  i18nKey: 'imge.ad.kanat' },
  { id: 'kok',    i18nKey: 'imge.ad.kok' },
  { id: 'yildiz', i18nKey: 'imge.ad.yildiz' },
  { id: 'kumru',  i18nKey: 'imge.ad.kumru' },
];
const _IG_IMGE_IDS = new Set(IG_IMGELER.map((x) => x.id));

/* ─── 3. PERSİSTANS (SafeStorage per-uid — Cazibe Motoru czLoad/czSave emsali) ─── */

function _default() {
  // `zirve` burada yalnız ŞEKİL olarak durur — okuma/yazma mantığı FAZ 5'in
  // işi (Zirve Mührü: seans kapanışında kanıtlı hatıra inşası).
  return { aktif: null, gecmis: [], zirve: null };
}

export function igSave() {
  try {
    const uid = (S.currentUser && S.currentUser.id) || 'anon';
    SafeStorage.set(`${STORAGE_KEY}_${uid}`, S._imge);
  } catch (e) { console.warn('igSave:', e && e.message); }
}

export function igLoad() {
  try {
    const uid = (S.currentUser && S.currentUser.id) || 'anon';
    const data = SafeStorage.get(`${STORAGE_KEY}_${uid}`);
    if (data && typeof data === 'object') S._imge = Object.assign(_default(), data);
  } catch (e) { console.warn('igLoad:', e && e.message); }
}

/* ─── 4. SEÇİM + MÜHÜRLEME ────────────────────────────────────────── */

/** Kullanıcı bir imge seçer ve "neden sen?" cümlesini kendi eliyle yazar.
 *  İki kapı da düşerse HİÇBİR ŞEY KAYDEDİLMEZ — boş beyan beyan değildir
 *  (plan K1, Gerçeklik Kuralı §6.10): kırık bir tören mühürsüz kapanmalı,
 *  yarım bir kayıtla değil. */
export function igSec(id, neden) {
  if (!_IG_IMGE_IDS.has(id)) return false;
  const temizNeden = kokenKirp(neden);
  if (!temizNeden) return false;

  if (!S._imge) S._imge = _default();
  const onceki = S._imge.aktif;
  if (onceki) {
    S._imge.gecmis = [onceki, ...(S._imge.gecmis || [])].slice(0, IG_GECMIS_MAX);
  }
  S._imge.aktif = { id, neden: temizNeden, tarih: localISODate() };
  igSave();
  return true;
}

/* ─── 5. OKUMA ─────────────────────────────────────────────────────── */

/** Aktif imgeyi köken-şekilli döner. Kayıt yoksa `kokenBeyan(null)`ın
 *  kanıtsız şekli (`{v:null, kaynak:'yok', n:0}`) döner — `kokenVar()`
 *  buradan false çıkar, hiçbir yüzeyde/prompt'ta imge yaşamaz.
 *
 *  `.kanit` alanı BİLEREK eklenir: `kokenBeyan` bu alanı üretmez (yalnız
 *  `kokenYorum` üretir), ama `kokenKayitVar` kapısı `.kanit`in doluluğuna
 *  bakar (13y:144). Kullanıcının "neden sen?" cümlesi burada kanıttır —
 *  09a/13a gibi tüketiciler bu fonksiyonu `kokenKayitVar` ile kapılar. */
export function igGetAktif() {
  const aktif = S._imge && S._imge.aktif;
  const k = kokenBeyan(aktif || null);
  return aktif ? { ...k, kanit: aktif.neden } : k;
}

/** 12 arketipten birinin katalog kaydı (id + i18n anahtarı). Bilinmeyen
 *  id'de null döner — çağıran varsayılan bir imgeye DÜŞMEZ. */
export function igGetImge(id) {
  return IG_IMGELER.find((x) => x.id === id) || null;
}

/* ─── 6. POST-AUTH BAŞLATMA ────────────────────────────────────────── */

/** Kullanıcı-verili iş — kendiliğinden boot ETMEZ (çift boot ayrımı,
 *  PROTOKOL-FABLE.md §5.2). 03-auth-shell post-auth zincirinden, Cazibe
 *  Motoru'nun (10r `czInit`) hemen ardından çağrılır. */
export function igInit() {
  if (!S._imge) S._imge = _default();
  igLoad();
}

/* ─── 7. MOTİF DİLİ (prosedürel SVG — harici asset YOK) ──────────────
   Her imge tek bir sigil: stroke tabanlı, 100×100 kutuda, altın. Dolgu
   yok — imge bir nesne değil, bir İZ'dir. Etrafındaki yıldız serpintisi
   `stableHash(uid|id)` ile üretilir: kişiye özel ama stabil (Math.random
   burada yasak — kullanıcı her açışta başka bir kart görürse "bu benim
   imgem" duygusu kırılır; §K5). */

const _IG_SIGIL = {
  kapi:   (c, w) => `<path d="M31 80 L31 40 Q50 24 69 40 L69 80" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/><path d="M22 80 L78 80" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/><circle cx="61" cy="60" r="2.4" fill="${c}"/>`,
  deniz:  (c, w) => `<path d="M22 44 q9 -7 18 0 t18 0 t18 0" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/><path d="M22 57 q9 -7 18 0 t18 0 t18 0" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" opacity=".8"/><path d="M22 70 q9 -7 18 0 t18 0 t18 0" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" opacity=".6"/>`,
  dag:    (c, w) => `<path d="M18 76 L40 38 L52 55 L62 41 L82 76 Z" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/><path d="M33 49 L40 44 L46 50" fill="none" stroke="${c}" stroke-width="${w * 0.7}" stroke-linecap="round" opacity=".75"/>`,
  ates:   (c, w) => `<path d="M50 22 C39 42 33 51 33 61 a17 17 0 0 0 34 0 c0 -10 -6 -19 -17 -39 Z" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/><path d="M50 48 c-6 9 -8 13 -8 17 a8 8 0 0 0 16 0 c0 -4 -2 -8 -8 -17 Z" fill="none" stroke="${c}" stroke-width="${w * 0.7}" opacity=".7"/>`,
  kopru:  (c, w) => `<path d="M20 60 Q50 30 80 60" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/><path d="M16 60 L84 60" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/><path d="M32 60 L32 76 M50 60 L50 76 M68 60 L68 76" stroke="${c}" stroke-width="${w * 0.7}" stroke-linecap="round" opacity=".7"/>`,
  tohum:  (c, w) => `<path d="M50 78 C33 68 31 46 50 28 C69 46 67 68 50 78 Z" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/><path d="M50 72 L50 40" stroke="${c}" stroke-width="${w * 0.7}" stroke-linecap="round" opacity=".75"/>`,
  fener:  (c, w) => `<path d="M38 44 L62 44 L67 72 L33 72 Z" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/><path d="M42 44 L46 30 L54 30 L58 44" fill="none" stroke="${c}" stroke-width="${w * 0.8}" stroke-linejoin="round"/><path d="M50 24 L50 18" stroke="${c}" stroke-width="${w * 0.8}" stroke-linecap="round"/><circle cx="50" cy="58" r="6" fill="none" stroke="${c}" stroke-width="${w * 0.7}" opacity=".75"/>`,
  yol:    (c, w) => `<path d="M28 80 L44 34" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/><path d="M72 80 L56 34" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/><path d="M40 34 L60 34" stroke="${c}" stroke-width="${w * 0.7}" stroke-linecap="round" opacity=".6"/><path d="M48 68 L52 68 M47 56 L53 56 M46 45 L54 45" stroke="${c}" stroke-width="${w * 0.6}" stroke-linecap="round" opacity=".55"/>`,
  /* Kanat: kapalı siluet + alt kenarda tüy çentikleri. Tek kavis üründe
     "kuyruklu yıldız" okunuyordu (2026-08-04 ekran denetimi) — kanadı
     kanat yapan uçuş çizgisi değil, tüylerin dişli kenarıdır. */
  kanat:  (c, w) => `<path d="M24 68 Q44 30 78 24 Q67 41 71 50 Q57 46 57 57 Q45 51 43 62 Q33 60 24 68 Z" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/><path d="M34 62 Q48 42 66 33" fill="none" stroke="${c}" stroke-width="${w * 0.6}" stroke-linecap="round" opacity=".55"/>`,
  /* Kök: toprak çizgisi imgeyi kurar. İki tur denendi (2026-08-04 ekran
     denetimi): gövdeye dal eklemek köklerle simetri yaratıp "asterisk"
     okunmasına yol açtı — dallar kaldırıldı. Kök imgesi yukarıyı değil
     AŞAĞIYI anlatır: görünen kısım sade, ağ altta dallanır. */
  kok:    (c, w) => `<path d="M20 44 L80 44" stroke="${c}" stroke-width="${w * 0.8}" stroke-linecap="round" opacity=".62"/><path d="M50 22 L50 44" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/><path d="M50 44 C48 54 42 59 36 66 M50 44 C52 54 58 59 64 66 M50 44 L50 72" fill="none" stroke="${c}" stroke-width="${w * 0.85}" stroke-linecap="round"/><path d="M36 66 L30 75 M36 66 L38 77 M64 66 L70 75 M64 66 L62 77 M50 72 L45 80 M50 72 L55 80" fill="none" stroke="${c}" stroke-width="${w * 0.55}" stroke-linecap="round" opacity=".68"/>`,
  yildiz: (c, w) => `<path d="M50 20 L56 44 L80 50 L56 56 L50 80 L44 56 L20 50 L44 44 Z" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/>`,
  kumru:  (c, w) => `<path d="M24 58 Q40 36 50 52 Q60 36 76 58" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/><path d="M50 52 L50 66 Q50 72 44 74" fill="none" stroke="${c}" stroke-width="${w * 0.8}" stroke-linecap="round"/><circle cx="50" cy="50" r="1.8" fill="${c}"/>`,
};

/** Bir imgenin SVG'si. `size` px kare. Yıldız serpintisi uid'ye bağlı —
 *  aynı kullanıcı için hep aynı, başka kullanıcıda başka. */
export function igMotifSVG(id, size = 96) {
  const sigil = _IG_SIGIL[id];
  if (!sigil) return ''; // bilinmeyen id → çizim YOK (varsayılan motife düşmez)
  const uid = (S.currentUser && S.currentUser.id) || 'anon';
  const rng = seededRng(stableHash(`${uid}|${id}`));
  const gold = 'var(--gold, #F5A623)';

  let yildizlar = '';
  const n = 5 + Math.floor(rng() * 4); // 5–8
  for (let i = 0; i < n; i++) {
    const ang = rng() * Math.PI * 2;
    const dist = 34 + rng() * 12;
    const x = (50 + Math.cos(ang) * dist).toFixed(1);
    const y = (50 + Math.sin(ang) * dist * 0.94).toFixed(1);
    // Izgara boyutunda (62px) r<1 neredeyse görünmez kalıyordu — serpinti
    // ince doku olmalı ama var olmalı.
    const r = (0.9 + rng() * 1.3).toFixed(2);
    const op = (0.3 + rng() * 0.4).toFixed(2);
    yildizlar += `<circle cx="${x}" cy="${y}" r="${r}" fill="${gold}" opacity="${op}"/>`;
  }

  return `<svg class="ig-sigil" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true" focusable="false">${yildizlar}${sigil(gold, 1.9)}</svg>`;
}

/* ─── 8. TÖREN — İMGE KAPISI (#ig-portal) ────────────────────────────
   İki durak: ızgara (seç) → neden (yaz + mühürle). Üçüncü bir "davet
   perdesi" bilerek YOK — davet zaten Bugün şeridinde verildi, töreni
   ekstra bir tıklamayla uzatmak töreni değil sürtünmeyi büyütür. */

const _IG_PRESS_MS = 900; // 10q4 Oluş Mührü ile aynı ağırlık

function _esc(s) { return escapeHTML(String(s == null ? '' : s)); }
function _ad(id) { const im = igGetImge(id); return im ? t(im.i18nKey, id) : id; }

/** Başka bir tam-ekran akış açıkken kapı açılmaz (13h `_blocked` emsali).
 *  Tören yığılması bu uygulamada bilinen bir kırık — üst üste iki portal
 *  kullanıcıyı kapana kıstırır. */
function _igBlocked() {
  /* Liste 13B'ye taşındı: üç kopya (10s/13h/13z) birbirinden ayrışıyordu —
     bu dosya `mt-portal`ı tanıyordu, 10s tanımıyordu. Kendi portalının
     tekrarına karşı koruma ise burada KALIR: kuyruk yüklenmezse kapı iki
     kez açılmasın. */
  if (document.getElementById('ig-portal')) return true;
  try { return !!window.trnMesgul?.(); } catch (_) { return false; }
}

function _igMount() {
  let p = document.getElementById('ig-portal');
  if (!p) { p = document.createElement('div'); p.id = 'ig-portal'; document.body.appendChild(p); }
  p.className = 'ig-portal';
  window.wtOverlayOpen?.('imge-kapisi');
  return p;
}

/* Tanıma Motoru (FAZ 1) — `sonuc` her çağıran yerde AÇIKÇA verilir (asla
 * doğrudan bir DOM listener'a referans olarak bağlanmaz): bağlanırsa click
 * Event'i bu parametreye sızar (00f'e olay nesnesi yazılır — bilinen gotcha,
 * bkz. 09h). 'muhur' yalnız mühür basıldıktan SONRAKİ sahnenin (×/veil/bitir)
 * kapanışında; öncesi hep 'kapat'. */
function _igClose(sonuc) {
  window.wtOverlayClose?.('imge-kapisi', sonuc);
  document.getElementById('ig-portal')?.remove();
}

/** TÖREN GİRİŞİ. Bloklayıcı akış varsa sessizce vazgeçer (davet şeridi
 *  yerinde kalır, kullanıcı sonra dokunur). */
export function igOpenKapi() {
  if (_igBlocked()) return false;
  _igRenderIzgara(_igMount());
  return true;
}

/* ── Durak 1: ızgara ── */
function _igRenderIzgara(portal) {
  const kutular = IG_IMGELER.map((im) => `
    <button type="button" class="ig-cell" data-id="${im.id}" aria-label="${_esc(t(im.i18nKey, im.id))}">
      ${igMotifSVG(im.id, 62)}
      <span class="ig-cell-ad">${_esc(t(im.i18nKey, im.id))}</span>
    </button>`).join('');

  portal.innerHTML = `
    <div class="ig-veil"></div>
    <div class="ig-modal" role="dialog" aria-modal="true" aria-labelledby="ig-baslik"><div class="wn-grain">
      <button type="button" class="ig-x" aria-label="${_esc(t('imge.kapat', 'Kapat'))}">✕</button>
      <div class="ig-kicker">${_esc(t('imge.kapi.kick', 'İMGE KAPISI'))}</div>
      <h2 class="ig-baslik" id="ig-baslik">${_esc(t('imge.kapi.lead', 'Hangi imge bugün sensin?'))}</h2>
      <p class="ig-alt">${_esc(t('imge.kapi.alt', 'Düşünme. İlk çekildiğin hangisiyse o.'))}</p>
      <div class="ig-grid">${kutular}</div>
    </div></div>`;

  portal.querySelector('.ig-x')?.addEventListener('click', () => _igClose('kapat'));
  portal.querySelector('.ig-veil')?.addEventListener('click', () => _igClose('kapat'));
  portal.querySelectorAll('.ig-cell').forEach((btn) => {
    btn.addEventListener('click', () => {
      try { window.fxCue?.('tap'); } catch (_) {}
      _igRenderNeden(portal, btn.dataset.id);
    });
  });
}

/* ── Durak 2: "bu imge neden sen?" + basılı-tut mühür ── */
function _igRenderNeden(portal, id) {
  portal.innerHTML = `
    <div class="ig-veil"></div>
    <div class="ig-modal ig-modal--neden" role="dialog" aria-modal="true" aria-labelledby="ig-neden-q"><div class="wn-grain">
      <button type="button" class="ig-geri" aria-label="${_esc(t('imge.geri', 'Geri'))}">←</button>
      <div class="ig-secili">${igMotifSVG(id, 104)}</div>
      <div class="ig-secili-ad">${_esc(_ad(id))}</div>
      <h2 class="ig-neden-q" id="ig-neden-q">${_esc(t('imge.neden.q', 'Bu imge neden sen?'))}</h2>
      <p class="ig-alt">${_esc(t('imge.neden.alt', 'Tek cümle yeter. Kimse okumayacak — sen okuyacaksın.'))}</p>
      <textarea class="ig-neden-in" rows="3" maxlength="240"
        placeholder="${_esc(t('imge.neden.ph', 'Çünkü…'))}"></textarea>
      <button type="button" class="ig-press" disabled>
        <span class="ig-press-fill"></span>
        <span class="ig-press-txt">${_esc(t('imge.press', 'MÜHÜRLE'))}</span>
      </button>
      <p class="ig-press-hint">${_esc(t('imge.press.hint', 'Mührü basılı tut.'))}</p>
    </div></div>`;

  const input = portal.querySelector('.ig-neden-in');
  const press = portal.querySelector('.ig-press');
  const hint  = portal.querySelector('.ig-press-hint');

  portal.querySelector('.ig-geri')?.addEventListener('click', () => _igRenderIzgara(portal));
  portal.querySelector('.ig-veil')?.addEventListener('click', () => _igClose('kapat'));

  // Mühür ancak kullanıcının kendi cümlesi varken açılır — boş beyan beyan
  // değildir (K1). Kapı UI'da da, veri katmanında da (igSec) duruyor.
  const tazele = () => { press.disabled = !kokenKirp(input.value); };
  input?.addEventListener('input', tazele);
  tazele();
  setTimeout(() => { try { input?.focus(); } catch (_) {} }, 160);

  let basildi = false, t0 = 0, raf = 0;
  const reduced = (() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
  })();

  const muhurle = () => {
    if (basildi) return;
    basildi = true;
    cancelAnimationFrame(raf);
    if (!igSec(id, input.value)) { basildi = false; return; } // kapı düştü → tören mühürsüz
    try { window.fxCue?.('cardBirth'); } catch (_) {}
    try { awardElmas(3, 'imge-muhru'); } catch (_) {}
    _igRenderMuhur(portal, id);
  };

  const bas = (ev) => {
    if (basildi || press.disabled) return;
    try { ev?.preventDefault?.(); } catch (_) {}
    if (reduced) { muhurle(); return; } // hareketi kısıtlayana jest dayatılmaz
    press.classList.add('is-pressing');
    t0 = Date.now();
    const tik = () => {
      const p = Math.min(1, (Date.now() - t0) / _IG_PRESS_MS);
      try { press.style.setProperty('--p', String(p)); } catch (_) {}
      if (p >= 1) { muhurle(); return; }
      raf = requestAnimationFrame(tik);
    };
    raf = requestAnimationFrame(tik);
  };
  const birak = () => {
    if (basildi || !t0) return;
    t0 = 0;
    cancelAnimationFrame(raf);
    press.classList.remove('is-pressing');
    try { press.style.setProperty('--p', '0'); } catch (_) {}
    if (hint) hint.textContent = t('imge.press.birakti', 'Elini çektin. Acele yok.');
  };

  press?.addEventListener('pointerdown', bas);
  press?.addEventListener('pointerup', birak);
  press?.addEventListener('pointercancel', birak);
  press?.addEventListener('pointerleave', birak);
  press?.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) bas(e); });
  press?.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') birak(); });
  // Sekme arkaya giderse parmak "basılı" sayılmaya devam ederdi — yarım
  // kalan temas asla mühür basmamalı (10q4'te öğrenilen gotcha).
  document.addEventListener('visibilitychange', function gorunurluk() {
    if (document.visibilityState !== 'visible') birak();
    if (!document.getElementById('ig-portal')) document.removeEventListener('visibilitychange', gorunurluk);
  });
}

/* ── Mühür anı ── */
function _igRenderMuhur(portal, id) {
  portal.innerHTML = `
    <div class="ig-veil"></div>
    <div class="ig-modal ig-modal--muhur" role="dialog" aria-modal="true"><div class="wn-grain">
      <div class="ig-secili ig-secili--muhur">${igMotifSVG(id, 116)}</div>
      <div class="ig-secili-ad">${_esc(_ad(id))}</div>
      <p class="ig-muhur-son">${_esc(t('imge.muhur.done', 'İmgen artık kapında.'))}</p>
      <button type="button" class="ig-derin">${_esc(t('imge.derinles', 'BU İMGEYLE KONUŞ'))}</button>
      <button type="button" class="ig-bitir">${_esc(t('imge.bitir', 'ŞİMDİLİK YETER'))}</button>
    </div></div>`;
  // Mühür ekranı — buraya ancak muhurle() başarıyla yazdıktan SONRA gelinir;
  // üç çıkış yolu da (konuş/bitir/veil) 'muhur' taşır (Tanıma Motoru FAZ 1).
  portal.querySelector('.ig-derin')?.addEventListener('click', igDerinles);
  portal.querySelector('.ig-bitir')?.addEventListener('click', () => _igClose('muhur'));
  portal.querySelector('.ig-veil')?.addEventListener('click', () => _igClose('muhur'));
  setTimeout(() => { try { portal.querySelector('.ig-derin')?.focus(); } catch (_) {} }, 200);
}

/* ─── 8b. ZMET MERDİVENİ (FAZ 4) ──────────────────────────────────────
   Zaltman'ın laddering'i: imge bir yüzeydir, altında duygu, duygunun
   altında kimlik vardır. Kullanıcı isterse merdiveni sohbette iner —
   dayatma YOK, kapı yalnız mühür anında açılır ve tek turluktur.

   Bayrak KALICI DEĞİL (SafeStorage'a yazılmaz): "şu an konuşmak istedim"
   bir tercihtir, bir kayıt değil. Yeniden yüklemede sıfırlanması doğru
   davranıştır. */
let _merdivenBekliyor = false;

/** Mühür ekranından "bu imgeyle konuş" köprüsü: sohbete geçer ve bir
 *  sonraki tur için merdiven rehberini kuyruğa alır. */
export function igDerinles() {
  _merdivenBekliyor = true;
  _igClose('muhur');
  try { window.fxCue?.('breath'); } catch (_) {}
  try { window.switchView?.('chat'); } catch (_) {}
  return true;
}

/** 09a damarı bunu çağırır: bekleyen merdiven varsa TRUE döner ve bayrağı
 *  TÜKETİR (tek turluk — ikinci turda model kendi haline bırakılır). */
export function igMerdivenTuket() {
  if (!_merdivenBekliyor) return false;
  _merdivenBekliyor = false;
  return true;
}

/* ─── 8c. ZİRVE (FAZ 5'in yazacağı kapı) ──────────────────────────────
   `S._imge.zirve`ye DIŞARIDAN doğrudan yazılmaz: state'in sahibi bu
   modüldür, kapıyı da o açar. Alıntı `kokenAlintiCoz` ile KAYNAKTAN
   kesilmiş olmalı — buraya modelin yazdığı bir cümle geçirilirse
   uygulamanın kullanıcıya söyleyebileceği en ağır yalan üretilir
   ("ben bunu söylemişim" sanır). */
export function igZirveKaydet(alinti, ref, gun) {
  const temiz = kokenKirp(alinti);
  if (!temiz) return false;                 // kanıtsız zirve zirve değildir
  if (!S._imge) S._imge = _default();
  S._imge.zirve = { alinti: temiz, ref: ref || null, gun: gun || localISODate() };
  igSave();
  return true;
}

/** Zirve kaydı köken-şekilli döner (kanıt = kullanıcının kendi cümlesi). */
export function igGetZirve() {
  const z = S._imge && S._imge.zirve;
  const k = kokenBeyan(z || null);
  return z ? { ...k, kanit: z.alinti } : k;
}

/* ─── 9. DAVET ŞERİDİ (Bugün) — 13j #wr-invite emsali ────────────────
   Davet Eşik'e KONMAZ (Eşik zaten yoğun); Bugün'ün gövdesine iner.
   Kapılar: imge yok + Benlik Kartı doğmuş (kullanıcı uygulamayı yeni
   açmış biri değil) + bloklayıcı tören yok. */
export function igMaybeInvite() {
  try {
    if (document.getElementById('ig-invite')) return;
    if (kokenKayitVarLocal()) return;                // imge zaten mühürlü
    // Benlik Kartı doğmadan davet yok: uygulamayı yeni açan biri önce
    // kendi kartını mühürlesin (onboarding yorgunluğu — plan Risk 3).
    // Kapı `confirmed` alanıdır (js/state/portre.js:21), `sealed` DEĞİL.
    if (!S._portre || !S._portre.confirmed) return;
    const host = document.querySelector('#bugun-view .ws-body');
    if (!host) return;

    const el = document.createElement('button');
    el.id = 'ig-invite';
    el.className = 'ig-invite';
    el.type = 'button';
    el.innerHTML = `
      <span class="ig-invite-glyph">${igMotifSVG('kapi', 34)}</span>
      <span class="ig-invite-txt">
        <span class="ig-invite-kick">${_esc(t('imge.invite.kick', "KELİMELER %5'İN"))}</span>
        <span class="ig-invite-title">${_esc(t('imge.invite.title', 'Gerisi imgelerde. Hangisi sensin?'))}</span>
      </span>
      <span class="ig-invite-cta">${_esc(t('imge.invite.cta', 'SEÇ'))} →</span>`;
    el.addEventListener('click', () => { igOpenKapi(); el.remove(); });
    host.appendChild(el);
  } catch (_) {}
}

/** `igGetAktif()`i köken kapısından geçiren yerel kısayol — kapının
 *  sorusu her yerde aynı olsun diye tek yerde duruyor. */
function kokenKayitVarLocal() {
  const r = igGetAktif();
  return !!(r && r.kaynak && r.kaynak !== 'yok' && r.kanit);
}

/* ─── 10. WINDOW EXPOSE (TDZ-güvenli, minify-dayanıklı) ─── */
if (typeof window !== 'undefined') {
  window.igSec = igSec;
  window.igGetAktif = igGetAktif;
  window.igGetImge = igGetImge;
  window.igInit = igInit;
  window.igLoad = igLoad;
  window.igOpenKapi = igOpenKapi;
  window.igMaybeInvite = igMaybeInvite;
  window.igMotifSVG = igMotifSVG;
  window.igDerinles = igDerinles;
  window.igMerdivenTuket = igMerdivenTuket;
  window.igZirveKaydet = igZirveKaydet;
  window.igGetZirve = igGetZirve;
}
