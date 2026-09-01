/* ═══════════════════════════════════════════════════════
   10y2 — KİŞİSEL BAŞLATICILAR · "soru sana ait olsun"
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Ana ekranın başlatıcı şeridi bir MENÜ değil, bir AYNADIR. Bugüne dek
     herkeste aynı üç soru duruyordu: uygulama kullanıcıyı tanıyordu ama
     en görünür yüzeyi tanımıyordu. Artık şerit, uygulamanın kullanıcı
     hakkında bildiğini ona soru biçiminde geri verir — ve her soru,
     geldiği cümleye kadar geri izlenebilir. "Mesele Sensin": soru
     kullanıcının kendi ağzından çıkar, uygulama ona anket sormaz.

     Kanıtı çözülemeyen soru DOĞMAZ (§6.10). Model uydurursa çip hiç
     görünmez — sahte kişiselleştirme, kişiselleştirmemekten kötüdür.

   MEKANİK / MİMARİ / TEK GİRİŞ:
     bslDokuMaybe() tek giriş: olgunluğa göre malzemeyi toplar
     (tanıdık→yaşam verisi, tohum→Benlik Kartı), kullanıcının GERÇEK
     cümlelerini numaralı söz bloğuna çevirir (13y kokenSozBlok) ve
     `sohbet-baslaticilari` edge fonksiyonuna gönderir. Model soruyu
     yazar, kanıtı YAZMAZ — `kanit_ref` ile gösterir; istemci cümleyi
     kaynaktan keser (kokenAlintiCoz). bslOku() 10y'nin tek okuma
     yüzeyidir; dokuma yoksa şerit model başlatıcılarına düşer.

     Üç katman (Emre'nin cümlesi): yeterli veri → yaşam verisinden ·
     yoksa → Benlik Kartı'ndan · hiç veri yok → bugünkü model
     başlatıcıları (fmStarters) aynen.

   Kalıcılık: SafeStorage per-uid (etw_baslatici_v1_<uid>) — tek gün taşır
   Konvansiyon: window.bsl* expose; ağ hatası SESSİZ (asla bloklama)
═══════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { sb } from '../config.js';
import { SafeStorage, localISODate } from './00a-infrastructure.js';
import { kokenSozBlok, kokenAlintiCoz } from './13y-koken.js';

const STORAGE_KEY = 'etw_baslatici_v1';

/* Şeritte en fazla dört çip durur (CSS kademeli girişi nth-child(4)'e
   kadar tanımlı); kişisel sorular en çok üçünü alır, kalan yuva model
   başlatıcısına bırakılır — modelin kimliği (Öz/Bağ/Eser) ekrandan
   tamamen silinmesin. */
const MAX_KISISEL = 3;

/* Kalite kapısı — sunucudakinin İKİZİ. Model iki tarafta da güvenilmez
   sayılır: sunucu elese bile istemci son kapıdır (eski cache, elle
   kurcalanmış depo, sürüm farkı). */
const SORU_MIN = 20;
const SORU_MAX = 110;

/* Kanıt havuzunun penceresi. 7 gün dar kalıyordu: haftada iki kez yazan
   bir kullanıcının havuzu boşalıp bütün sorular düşerdi. */
const HAVUZ_GUN = 14;

/* Bir sorunun kimliği metninden türer, günden DEĞİL: "bunu daha az göster"
   beyanı (09i) gün dönünce unutulmamalı. Aynı soru yarın yeniden dokunursa
   aynı kimlikle gelir ve susturulmuş kalır. */
function _soruId(metin) {
  const s = String(metin || '');
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return 'bsl_' + h.toString(36);
}

function _uid() { return (S.currentUser && S.currentUser.id) || 'anon'; }
function _key() { return `${STORAGE_KEY}_${_uid()}`; }
function _dil() { return S._currentLang === 'en' ? 'en' : 'tr'; }

/* ─── 1. KALİTE KAPISI ─── */

/** Bir başlatıcı geçerli mi? Soru ya da davet olabilir (bugünkü şeritte
 *  ikisi de var: "…kök sebep ne?" ve "…birlikte çıkaralım."), ama DAİMA
 *  kullanıcının ağzındandır — uygulama ona "sen" diye seslenmez. */
export function bslGecerli(metin, dil) {
  const s = String(metin == null ? '' : metin).trim();
  if (s.length < SORU_MIN || s.length > SORU_MAX) return false;
  if (/[\r\n]/.test(s)) return false;                       // tek satır
  if (/[{}[\]]/.test(s)) return false;                      // sızmış şablon
  if (/^["'“”«»•\-–—]/.test(s)) return false;               // alıntı/madde işareti
  /* Cümle sonu en fazla bir kez ve SONDA: iki cümlelik çip şeridi bozar.
     Sıra sayısının noktası cümle sonu DEĞİLDİR — maskelenmeden sayılırsa
     "3. kez aynı hatayı yapıyorum, kökü ne?" gibi geçerli bir soru elenir
     (testte yakalandı). Lookbehind yok: WebKit/iOS uyumu (13y'nin dersi). */
  const sonlar = s.replace(/\d+\./g, '§').match(/[.?!]/g) || [];
  if (sonlar.length > 1) return false;
  if (sonlar.length === 1 && !/[.?!]$/.test(s)) return false;
  // İkinci tekil hitap = soru kullanıcının değil uygulamanın ağzında.
  // Bu kapı olumlu bir dilbilgisi testinden (birinci tekil arama) daha
  // güvenilir: Türkçede birinci tekil eki çok biçimlidir, ikinci tekil
  // hitabı ise saymakla biter.
  return (dil === 'en')
    ? !/\b(you|your|yours|yourself)\b/i.test(s)
    : !/\b(sen|senin|sana|seni|sende|senden|kendine|kendini)\b/i.test(s);
}

/* ─── 2. MALZEME — olgunluğa göre iki katman ─── */

/** Benlik Kartı'nın kullanıcı eliyle yazılmış cümleleri. Emre çıkarımı ya
 *  da karttan emilen madde (src≠'user') havuza girmez: tohum katmanında
 *  kullanıcının KENDİ el yazısından başkası kanıt sayılmaz. */
function _portreCumleleri() {
  const out = [];
  try {
    const kart = S._portre;
    if (!kart) return out;
    ['dusunceler', 'inanclar', 'duygular', 'davranislar'].forEach(kategori => {
      const liste = Array.isArray(kart[kategori]) ? kart[kategori] : [];
      liste.forEach(madde => {
        const metin = typeof madde === 'string' ? madde : String(madde?.text || '');
        const kaynak = (madde && typeof madde === 'object') ? madde.src : 'user';
        const t = metin.trim();
        if (t.length >= 12 && (!kaynak || kaynak === 'user')) out.push(t);
      });
    });
  } catch (_) {}
  return out;
}

/** Yaşam verisinden kanıt havuzu: kullanıcının ham mesajları + söz
 *  defterindeki kendi sözleri. İkisi de kullanıcının kendi cümlesidir. */
function _yasamCumleleri() {
  const out = [];
  try { out.push(...(window.kokenKullaniciSozleri?.(HAVUZ_GUN) || [])); } catch (_) {}
  try {
    (window.sdSonSozler?.(8) || []).forEach(s => { if (s && s.text) out.push(String(s.text)); });
  } catch (_) {}
  return out.map(s => String(s || '').trim()).filter(s => s.length >= 12);
}

/**
 * Dokuma malzemesi. Kaynak olgunluğa göre seçilir ama KARAR kanıt
 * havuzunundur: olgunluk "tanıdık" dese bile havuz boşsa tohum katmanına
 * düşülür — ölçüm kanıtın yerini almaz (§6.10).
 * @returns {{kaynak:'yasam'|'portre', sozler:string[], baglam:Object}|null}
 */
export function bslMalzeme() {
  let olgunluk = 'tohum';
  try { olgunluk = window.ihOlgunluk?.() || 'tohum'; } catch (_) {}

  let sozler = [];
  let kaynak = 'portre';
  if (olgunluk === 'tanidik' || olgunluk === 'tanisma') {
    sozler = _yasamCumleleri();
    kaynak = 'yasam';
  }
  if (!sozler.length) { sozler = _portreCumleleri(); kaynak = 'portre'; }
  if (!sozler.length) return null;             // hiç veri → model başlatıcıları

  /* Bağlam kanıt DEĞİLDİR: modele yön verir, soruya girmez. Örüntü
     satırları (09d) burada durur çünkü bir örüntü motorun yorumudur —
     kanıt havuzuna kullanıcının ham cümleleri girer. */
  const baglam = { olgunluk, kaynak };
  try {
    const m = window.fmGetActive?.();
    if (m) { baglam.model = m.id; baglam.modelAd = m.name; baglam.eksen = m.tagline; }
  } catch (_) {}
  try {
    const need = window.ihNeedTop?.();
    if (need && need.eksen) baglam.ihtiyac = need.eksen;
  } catch (_) {}
  try {
    const pts = window.omGetTopPatterns?.(2);
    if (pts) baglam.oruntuler = String(pts).slice(0, 900);
  } catch (_) {}

  return { kaynak, sozler, baglam };
}

/* ─── 3. DEPO ─── */

function _oku() {
  try { return SafeStorage.get(_key(), null); } catch (_) { return null; }
}
function _yaz(gun, kaynak, sorular) {
  try { SafeStorage.set(_key(), { gun, kaynak, sorular }); } catch (_) {}
}

/**
 * Bugün için dokunmuş başlatıcılar — 10y'nin TEK okuma yüzeyi.
 * Kalite kapısı burada YENİDEN uygulanır (depo elle kurcalanmış olabilir),
 * susturulmuş sorular (09i beyan defteri) elenir.
 * @returns {Array<{id:string, metin:string, kanit:string, kaynak:string}>}
 */
export function bslOku() {
  const kayit = _oku();
  if (!kayit || kayit.gun !== localISODate() || !Array.isArray(kayit.sorular)) return [];
  const dil = _dil();
  return kayit.sorular.filter(s => {
    if (!s || !bslGecerli(s.metin, dil)) return false;
    if (!s.kanit) return false;                       // kanıtsız soru yoktur
    try { if (window.secBeyanVar?.(s.id)) return false; } catch (_) {}
    return true;
  }).slice(0, MAX_KISISEL);
}

/** Bir başlatıcının kanıtı — "Neden bu?" yüzeyi (FAZ 6) buradan okur. */
export function bslKanit(id) {
  const kayit = _oku();
  if (!kayit || !Array.isArray(kayit.sorular)) return null;
  const s = kayit.sorular.find(x => x && x.id === id);
  return s ? { metin: s.metin, kanit: s.kanit, kaynak: kayit.kaynak, gun: kayit.gun } : null;
}

/* ─── 4. DOKUMA ─── */

let _dokunuyor = false;

/**
 * Bugünün başlatıcılarını dokur. Tek giriş noktası; sessizdir — fonksiyon
 * deploy edilmemişse, ağ yoksa ya da model uydurmuşsa kullanıcı hiçbir şey
 * görmez, şerit model başlatıcılarıyla zaten doludur.
 * @param {boolean} force gün kapısını atla (test ve elle tetik için)
 * @returns {Promise<boolean>} dokuma yazıldıysa true
 */
export async function bslDokuMaybe(force) {
  if (_dokunuyor) return false;
  try {
    if (!S.currentUser?.id) return false;                          // anon dokunmaz
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;

    const gun = localISODate();
    const mevcut = _oku();
    if (!force && mevcut && mevcut.gun === gun) return false;      // bugün dokunmuş

    const malzeme = bslMalzeme();
    if (!malzeme) return false;

    if (!sb || !sb.functions) return false;

    // Model alıntıyı YAZMAZ, GÖSTERİR: numaralı blok prompt'a girer,
    // dönen `kanit_ref` ile cümle kaynaktan kesilir (kesin-alinti-mimarisi).
    const { blok, harita } = kokenSozBlok(malzeme.sozler);

    _dokunuyor = true;
    const { data, error } = await sb.functions.invoke('sohbet-baslaticilari', {
      body: {
        dil: _dil(),
        sozBlok: blok,
        baglam: malzeme.baglam,
        adet: MAX_KISISEL,
      },
    });
    if (error || !data || !data.ok || !Array.isArray(data.sorular)) return false;

    const dil = _dil();
    const temiz = [];
    data.sorular.forEach(row => {
      const metin = String(row?.soru || '').trim();
      if (!bslGecerli(metin, dil)) return;                          // kalite kapısı
      // KANIT KAPISI — çözülemeyen soru doğmaz (§6.10). Eşik yok:
      // soru "havuzda var mı", bir orana benziyor mu değil.
      const coz = kokenAlintiCoz(row?.kanit_ref, row?.kanit_kirpma, harita, malzeme.sozler);
      if (!coz || !coz.alinti) return;
      if (temiz.some(x => x.metin === metin)) return;               // tekrar
      temiz.push({ id: _soruId(metin), metin, kanit: coz.alinti });
    });
    if (!temiz.length) return false;                                // hepsi düştü

    _yaz(gun, malzeme.kaynak, temiz.slice(0, MAX_KISISEL));
    return true;
  } catch (e) {
    // Sessiz düşüş: kişisel başlatıcı bir lükstür, şerit onsuz da tamdır.
    console.warn('bslDokuMaybe:', e && e.message);
    return false;
  } finally {
    _dokunuyor = false;
  }
}

/* ─── 5. BASILI TUT → "NEDEN BU?" ─── */

/* Çipte görünür bir düğme yok (Emre'nin kararı, 2026-08-10): şerit tek dil
   konuşur, kişisel çip model çipinden görsel olarak ayrılmaz. Gerekçe
   basılı tutmakla açılır. Desen 10q4-olus-muhru.js:415-455'in kardeşidir:
   pointer + klavye + visibilitychange guard. */
const BASILI_MS = 500;

/* Sekme arkaya giderse parmak "basılı" sayılmaya devam ederdi. Dinleyici
   ÇİP BAŞINA değil modül düzeyinde kurulur: şerit her çizildiğinde çipler
   yeniden yaratılır (llmRenderHome innerHTML yazar) ve çip başına eklenen
   bir `document` dinleyicisi her çizimde birikirdi — çip DOM'dan gitse de
   dinleyici kalır. Aktif basış burada tutulur. */
let _aktifBirak = null;
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' && _aktifBirak) {
      try { _aktifBirak(); } catch (_) {}
    }
  });
}

/** Şerit her çizildiğinde çağrılır (10y llmRenderHome). İdempotent:
 *  bağlanan çip `data-bsl-bagli` ile işaretlenir. */
export function bslCipleriBagla(host) {
  const kok = host || document.getElementById('llm-starters');
  if (!kok) return;
  const reduced = (() => {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
  })();

  kok.querySelectorAll('[data-bsl-id]').forEach(btn => {
    if (btn.getAttribute('data-bsl-bagli') === '1') return;
    btn.setAttribute('data-bsl-bagli', '1');
    const id = btn.getAttribute('data-bsl-id');

    let t0 = 0, zaman = null, acildi = false;
    const ac = () => {
      acildi = true;
      birak();
      try { window.kkNedenAc?.('baslatici', id); } catch (_) {}
    };
    const bas = (ev) => {
      if (acildi) return;
      t0 = Date.now();
      btn.classList.add('is-bsl-pressing');
      _aktifBirak = birak;                 // sekme arkaya giderse buradan bırakılır
      // reduced-motion: bekleme yok, gerekçe anında açılır (a11y).
      zaman = setTimeout(ac, reduced ? 0 : BASILI_MS);
      // Uzun basışta metin seçimi/bağlam menüsü akışı bozar.
      if (ev && ev.pointerType === 'touch') { try { ev.preventDefault(); } catch (_) {} }
    };
    function birak() {
      if (zaman) { clearTimeout(zaman); zaman = null; }
      if (_aktifBirak === birak) _aktifBirak = null;
      btn.classList.remove('is-bsl-pressing');
    }
    /* Basılı tutma sohbeti AÇMAMALI: onclick (llmStarterSend) inline
       tanımlı olduğu için burada engellenir — capture aşamasında yakalayıp
       durdururuz, yoksa gerekçe paneliyle birlikte soru da gönderilirdi. */
    btn.addEventListener('click', (ev) => {
      if (!acildi) return;
      ev.preventDefault(); ev.stopPropagation();
      acildi = false;
    }, true);

    btn.addEventListener('pointerdown', bas);
    btn.addEventListener('pointerup', birak);
    btn.addEventListener('pointercancel', birak);
    btn.addEventListener('pointerleave', birak);
    // Klavye kısa yolu: uzun basış klavyede yok — Shift+Enter gerekçeyi açar.
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); ac(); }
    });
  });
}

/* ─── 6. INIT — 03-auth-shell post-auth zinciri ─── */

/* Guard boolean DEĞİL uid'dir: hesap değişince (farklı kullanıcı,
   "Sıfırdan Başla") yeni kullanıcı kendi sorularını bekler. */
let _initedUid = null;
let _gunDinleyiciKuruldu = false;

export function bslInit() {
  const uid = S.currentUser?.id;
  if (!uid || _initedUid === uid) return;
  _initedUid = uid;

  /* Açılış anı ana ekranın: dokuma ağ beklemesin diye kısa bir gecikmeyle
     yoklanır. Bugün dokunmuşsa çağrı hiç yapılmaz (gün kapısı depoda).
     Dokuma gelirse şerit yerinde tazelenir — kullanıcı bir şeyin
     değiştiğini görmez, yalnız sorular artık ona ait olur. */
  setTimeout(() => {
    bslDokuMaybe(false).then(yazildi => {
      if (yazildi) { try { window.llmRenderHome?.(); } catch (_) {} }
    }).catch(() => {});
  }, 4000);

  /* Gün dönerse (sekme gece açık kaldı) yeni günün soruları dokunur.
     Dinleyici hesap başına DEĞİL bir kez kurulur: "Sıfırdan Başla" ya da
     hesap değişimi bslInit'i yeniden çağırır ve her seferinde bir yenisi
     birikirdi. Guard dinleyicinin kendisinde, uid guard'ında değil. */
  if (!_gunDinleyiciKuruldu) {
    _gunDinleyiciKuruldu = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (!S.currentUser?.id) return;
      bslDokuMaybe(false).then(yazildi => {
        if (yazildi) { try { window.llmRenderHome?.(); } catch (_) {} }
      }).catch(() => {});
    });
  }
}

/* ── window expose (dosya sonu; TDZ-güvenli, minify-dayanıklı) ── */
if (typeof window !== 'undefined') {
  window.bslOku = bslOku;
  window.bslKanit = bslKanit;
  window.bslCipleriBagla = bslCipleriBagla;
  window.bslMalzeme = bslMalzeme;
  window.bslDokuMaybe = bslDokuMaybe;
  window.bslGecerli = bslGecerli;
}
