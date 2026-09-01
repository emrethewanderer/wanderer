/* ═══════════════════════════════════════════════════════
   13A — DERİN ÇALIŞMA · Tezgâhın Açıldığı Yer
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Üç Mühür günlük ritimdir — gelirsin, bakarsın, sözünü tutarsın;
     günde bir halka dövülür ve gün kapanır. Derin Çalışma ise TEZGÂHTIR:
     kitap burada okunmaz, ÇALIŞILIR. Kitap 1'in her kavramda tekrarladığı
     Çalışma Kağıdı — SOR → HAYAL ET → PROGRAMLA → DAVRANIŞ — bu alanın
     ortak gramerıdir; Derinlikler'in ve Temeller'in dokuz kavramı da,
     kitaptan türeyen her yeni tezgâh da aynı grameri konuşur.
     "Kısa yol arama, o kişi ol." (Kitap 2, #60)
   DERİN METAFOR (TASARIM-PRENSIPLERI §0.1): KAP — alan bir yol değil, içine
     girilen bir çalışma odasıdır; kabuğu dört köşe tikiyle kapanır, yüzeyi
     grenlidir, kapısından geri dönülür. Kavram ızgarası bu kabın içinde
     DENGE'nin ritmini konuşur (Temeller & Derinlikler): ölçer ama yargılamaz
     — halkanın izi kalınlaşır, sayı bağırmaz. İki metafor birbirine
     bağırmaz çünkü biri odanın kendisi, öbürü odadaki tezgâhtır.
   MEKANİK / MİMARİ / TEK GİRİŞ:
     Bugün → STÜDYO → DERİN ÇALIŞMA → switchView('derincalisma') →
     dcLoadView() `#dc-body`'yi doldurur. Alan HERKESE açılır (önizleme);
     kilit alanın kapısında değil, YENİ tezgâhların çalışmasındadır
     (dcCanWork/dcUseTat: Max olmayan bir kez tadar, sonrası spotlight).
     Buradan açılan mevcut odaların (Kendinle Konuşma, Değerlendirme,
     Hayal Seansı, Ayna) kendi erişimi DEĞİŞMEZ — başka kapıları da var,
     kimseden bugün kullandığı bir şey geri alınmaz.
     Yeni motor yazılmaz: 09b'nin kavram/şablon/kanıt katmanı, 13b'nin
     kağıdı ve 12c'nin kart yüzeyleri tüketilir. Dönüşüm Hattı 12'nin
     `w3GetChapters` okuyucusunu, Sefer 10h'nin `challenge_progress`
     akışını TÜKETİR — ikisi de `window` üzerinden (import YOK: alanın
     kabuğu LLM/Supabase modüllerine bağlanmasın).
   Kalıcılık: SafeStorage per-uid (etw_dc_v1_<uid> · etw_dc_tat_v1_<uid>)
   Konvansiyon: i18n t(); window.dc* expose; stiller css/parts/derin-calisma.css
═══════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage, escapeHTML, showToast, recordActivityDay } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import {
  _DF_DEPTH_LABELS, _DF_FOUND_LABELS, dfScoreKey, _dfScoreLabel,
  dfGetWorksheetSessions, dfDeleteWorksheetSession
} from './09b-depth-foundations.js';
import { ckRenderCard } from './13b-calisma-kagidi.js';
/* Ses blob'ları 13b'nin yazdığı store'da yaşar (00b altyapı katmanı — LLM ya da
   Supabase modülü değil, o yüzden window köprüsü değil doğrudan import). */
import { idbGetRecording, idbDeleteRecording } from './00b-indexeddb.js';

/* ─── 1. SABİTLER ─── */

const STORAGE_KEY = 'etw_dc_v1';
const TAT_KEY     = 'etw_dc_tat_v1';

/* Alandan açılan mevcut odalar. `view` → switchView hedefi (K1: portal değil).
   `gate:false` = bu oda Derin Çalışma'ya ait DEĞİL, burada yalnız toplanıyor;
   kendi kapıları (Örüntü Aynası çözüm butonu, 10q ritüel çipi, Geçiş Yolu)
   yaşamaya devam eder, dolayısıyla Max kilidi uygulanmaz. */
const DC_ROOMS = [
  { id: 'konusma', view: 'konusma', gate: false,
    label: () => t('dc.room.konusma', 'KENDİNLE KONUŞ'),
    sub:   () => t('dc.room.konusma_sub', 'yalnız kal, sor, cevapla'),
    sigil: '<circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M35 42h30M35 52h22" stroke="currentColor" stroke-width="1" opacity="0.7" stroke-linecap="round"/><path d="M40 68 L34 78 L52 68" fill="none" stroke="currentColor" stroke-width="1"/>' },
  { id: 'degerlendirme', view: 'degerlendirme', gate: false,
    label: () => t('dc.room.degerlendirme', 'DEĞERLENDİRME'),
    sub:   () => t('dc.room.degerlendirme_sub', 'gün · hafta · ay · yıl'),
    sigil: '<circle cx="50" cy="50" r="31" fill="none" stroke="currentColor" stroke-width="1.2"/><line x1="50" y1="50" x2="50" y2="26" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><line x1="50" y1="50" x2="66" y2="58" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><circle cx="50" cy="50" r="2.6" fill="currentColor"/>' },
  { id: 'hayalseans', view: 'hayalseans', gate: false,
    label: () => t('dc.room.hayalseans', 'HAYAL SEANSI'),
    sub:   () => t('dc.room.hayalseans_sub', 'o gözlerden yaşa'),
    sigil: '<path d="M16 50 Q50 24 84 50 Q50 76 16 50 Z" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="50" cy="50" r="3.4" fill="currentColor"/>' },
  { id: 'ayna', view: 'ayna', gate: false,
    label: () => t('dc.room.ayna', 'DAVRANIŞ KANITI'),
    sub:   () => t('dc.room.ayna_sub', 'yaptığın, söylediğinden önce gelir'),
    sigil: '<rect x="26" y="18" width="48" height="64" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M36 40h28M36 52h28M36 64h16" stroke="currentColor" stroke-width="1" opacity="0.6" stroke-linecap="round"/>' },
];

/* ─── 2. STATE (13s kalıbı: dilim modülde doğar, state.js'e dokunulmaz) ─── */

function _uid() { return (S.currentUser && S.currentUser.id) || 'anon'; }
function _key()    { return `${STORAGE_KEY}_${_uid()}`; }
function _tatKey() { return `${TAT_KEY}_${_uid()}`; }

/* Alanlar ihtiyaç doğdukça eklenir — Süper Odak kendi fazında kendi alanını
   getirir; şimdiden boş anahtar açmak Supabase'e anlamsız null yazmaktan
   başka bir şey yapmaz. */
function _default() {
  return {
    lastRoom: null,     // son açılan oda — alan yeniden açılınca hatırlanır
    kozo: { ko: [], zo: [] },   // ortam tezgâhı (Kitap 2 · #59)
    kazanma: [],                // yol haritası kayıtları (Kitap 2 · #52)
    odak: null,                 // tek net hedef + çift onay (Kitap 2 · #134)
  };
}

export function dcSave() {
  try { SafeStorage.set(_key(), S._derinCalisma); }
  catch (e) { console.warn('dcSave:', e && e.message); }
}

export function dcLoad() {
  try {
    const data = SafeStorage.get(_key());
    if (data && typeof data === 'object') S._derinCalisma = Object.assign(_default(), data);
  } catch (e) { console.warn('dcLoad:', e && e.message); }
}

/* ─── 3. MAX KAPISI ─── */

/* Max'in TEK okuma noktası. S.isPremiumPlus istemci bayrağı (03:677 admin'i de
   Max sayar); sunucu gerçeği quota_status.tier==='max' ile teyit edilir —
   13m `_isPrem` deseninin ikizi, ama burada kota nesnesi yoksa bayrak yeter.
   Sekizinci elle kontrol yazılmasın diye alanın her yerinden bu çağrılır. */
export function dcIsMax() {
  if (S.isPremiumPlus) return true;
  return !!(S._kota && S._kota.tier === 'max');
}

/* Max olmayana verilen tek seferlik tat: tezgâhı bir kez gerçekten çalıştırır.
   Boş bir vitrin göstermek yerine tezgâhı tattırmak hem daha dürüst hem daha
   güçlü bir davettir — kaçırdığını görmek, anlatılandan fazlasını söyler. */
export function dcTatUsed() {
  try { return SafeStorage.get(_tatKey()) === true; } catch (_) { return false; }
}

export function dcUseTat() {
  try { SafeStorage.set(_tatKey(), true); } catch (e) { console.warn('dcUseTat:', e && e.message); }
}

/* Yeni tezgâhlarda (Çalışma Kağıdı, Ko-Zo, Süper Odak…) çalışma izni.
   Mevcut odalar (DC_ROOMS, gate:false) bu kapıdan GEÇMEZ. */
export function dcCanWork() {
  return dcIsMax() || !dcTatUsed();
}

/* Kilide çarpınca: kayıtlı spotlight'ı göster (03:419 PREMIUM_FEATURES).
   Kayıt yoksa spotlight sessizce sub'a düşer — o yüzden kayıt FAZ 1'de eklendi.
   Varlık `typeof` ile sorulur, `?.()` ile DEĞİL: optional call fonksiyon yoksa
   exception atmaz, sessizce undefined döner — yani catch hiç tetiklenmez ve
   alttaki fallback ölü kalırdı. Savunma çalışmayan yere kurulmasın. */
export function dcShowLock() {
  try {
    if (typeof window.showPremiumFeatureSpotlight === 'function') {
      window.showPremiumFeatureSpotlight('derin-calisma');
      return;
    }
  } catch (e) { console.warn('dcShowLock:', e && e.message); }
  try { window.switchView?.('sub'); } catch (_) {}
}

/* Çalışma kapısı — çağıran taraf tek satırla korunur:
   if (!dcGuardWork()) return;  → izin varsa true döner ve (Max değilse) tadı harcar. */
export function dcGuardWork() {
  if (dcIsMax()) return true;
  if (!dcTatUsed()) { dcUseTat(); dcSyncRoomSub(); return true; }
  dcShowLock();
  return false;
}

/* ─── 4. STÜDYO ODA ALT-SATIRI (wsSyncStudio çağırır — 13s gySyncRoomSub kalıbı) ─── */

export function dcSyncRoomSub() {
  const el = document.getElementById('studio-dc-sub');
  if (!el) return;
  try {
    if (dcIsMax()) { el.textContent = t('dc.sub_open', 'tezgâh açık'); return; }
    el.textContent = dcTatUsed()
      ? t('dc.sub_locked', 'Max ile açılır')
      : t('dc.sub_taste', 'bir çalışma seni bekliyor');
  } catch (_) {}
}

/* ─── 5. ÇALIŞMA TEZGÂHI — Kitap 1'in dokuz kavramı ─── */

/* Kavram LİSTESİ 09b'den gelir; burada ikinci bir liste tutulmaz. Gruplar
   kitabın kendi bölümlemesidir: DERİNLİKLER (Standart · Hak Etmek · Normal ·
   Layık) ve TEMELLER (Öz Sevgi · Saygı · Değer · Güven + Bolluk Bilinci). */
const DC_GRUPLAR = [
  { id: 'derinlikler', adKey: 'dc.grup.derinlikler', adTR: 'DERİNLİKLER',
    etiketler: _DF_DEPTH_LABELS, profil: () => S._depthProfile },
  { id: 'temeller', adKey: 'dc.grup.temeller', adTR: 'TEMELLER',
    etiketler: _DF_FOUND_LABELS, profil: () => S._foundationsProfile },
];

/* GERÇEKLİK KAPISI (§6.10 · K6): üç sinyalden az kanıtı olan kavramda SAYI
   YOKTUR. Skor `null` doğar ve ilk sinyalde 50'den birikmeye başlar — o 50
   bir ölçüm değil, delta matematiğinin sıfır noktasıdır (09b `_dfUpdateScore`).
   Bu yüzden kapı skora değil `signals_count`a bakar; kanıtsız kavram sayı
   yerine davet gösterir. */
function _kavramDurum(key, profil) {
  const o = profil && profil[key];
  if (!o || o.signals_count < 3 || typeof o.score !== 'number') return { kanitli: false };
  const son = o.evidence && o.evidence[o.evidence.length - 1];
  return {
    kanitli: true,
    mertebeKey: dfScoreKey(o.score),
    mertebe: t('dc.mertebe.' + dfScoreKey(o.score), _dfScoreLabel(o.score)),
    yon: o.direction === 'up' ? '↑' : o.direction === 'down' ? '↓' : '→',
    /* Alıntı MODELDEN değil, kullanıcının kendi cümlesinden kesilmiştir
       (09b snippet.slice(0,60)) — uygulama kaynaktan keser, model yazmaz. */
    alinti: (son && son.text) ? son.text : ''
  };
}

/* En zayıf halka — "nereden başlayalım?" satırının kaynağı. 09b'nin
   dfGetActiveDepthTarget'ı iki sinyalde açılır ve iki grubu ayrı sayar;
   tezgâh ise kendi kanıt kapısını (3) kullanır ve dokuz kavramı birlikte
   tartar, yoksa kartlarda gizlenen bir sayıyı burada sızdırmış oluruz. */
function _enZayif() {
  let en = null;
  for (const g of DC_GRUPLAR) {
    const profil = g.profil() || {};
    for (const key of Object.keys(g.etiketler)) {
      const o = profil[key];
      if (!o || o.signals_count < 3 || typeof o.score !== 'number') continue;
      if (!en || o.score < en.score) en = { key, score: o.score, adTR: g.etiketler[key] };
    }
  }
  return en;
}

function _kavramAd(key, adTR) { return t('dc.kavram.' + key, adTR); }

/* Kullanıcının kendi mühürlediği kağıtların kavramları. Bu bir ÖLÇÜM değil,
   kullanıcının kendi beyanının izidir (kağıdı o yazdı, mührü o bastı) — o
   yüzden kanıt kapısına takılmaz, sayı da taşımaz: yalnız "burada çalıştın". */
function _calisilanlar() {
  const set = new Set();
  try {
    (dfGetWorksheetSessions() || []).forEach(o => { if (o && o.concept) set.add(o.concept); });
  } catch (_) {}
  return set;
}

function _kavramHTML(key, adTR, durum, calisildi) {
  const ad = escapeHTML(_kavramAd(key, adTR));
  /* Davet cümlesi kartın İÇİNDE değil, grubun başında bir kez söylenir:
     dokuz kartta dokuz kez tekrarlanınca göz onu okumayı bırakıyor ve
     sessizlik gürültüye dönüyordu. Ekran okuyucu yine de kartın neden
     boş durduğunu duymalı — o yüzden aynı cümle sr-only olarak kalır. */
  const govde = durum.kanitli
    ? `<span class="dc-kavram-mertebe">${escapeHTML(durum.mertebe)} <span class="dc-kavram-yon">${durum.yon}</span></span>
       ${durum.alinti ? `<span class="dc-kavram-alinti">«${escapeHTML(durum.alinti)}»</span>` : ''}`
    : `<span class="sr-only dc-kavram-davet">${escapeHTML(t('dc.kavram_sessiz', 'Henüz seni tanımıyor — ilk cümle senden.'))}</span>`;
  /* Mertebenin görsel ikizi: kartın dibinde dövülmüş halkanın izi. Kalınlık
     mertebe dilinin (İNCE → SAĞLAM) karşılığıdır, YENİ bilgi taşımaz — aynı
     şeyi bir kez de gözle söyler. Kanıtsız kavramda halka hiç dövülmemiştir:
     kesik bronz iz durur, altın yoktur (K6: kanıtsız yüzey ışık almaz). */
  const halka = `<span class="dc-kavram-halka dc-halka--${durum.kanitli ? escapeHTML(durum.mertebeKey) : 'yok'}" aria-hidden="true"></span>`;
  const iz = calisildi
    ? `<span class="dc-kavram-iz" aria-hidden="true">◆</span>
       <span class="sr-only">${escapeHTML(t('dc.kavram_calisildi', 'Bu kavramda mühürlenmiş kağıdın var.'))}</span>`
    : '';
  return `
    <button class="dc-kavram${durum.kanitli ? ' dc-kavram--kanitli' : ''}" data-kavram="${escapeHTML(key)}">
      <span class="dc-kavram-ust">
        <span class="dc-kavram-ad">${ad}</span>
        ${iz}
      </span>
      ${govde}
      ${halka}
    </button>`;
}

function _tezgahHTML() {
  const calisilan = _calisilanlar();
  const gruplar = DC_GRUPLAR.map(g => {
    const profil = g.profil() || {};
    const satirlar = Object.entries(g.etiketler)
      .map(([key, adTR]) => ({ key, adTR, durum: _kavramDurum(key, profil) }));
    const sessizVar = satirlar.some(s => !s.durum.kanitli);
    const kartlar = satirlar
      .map(s => _kavramHTML(s.key, s.adTR, s.durum, calisilan.has(s.key)))
      .join('');
    return `
      <div class="dc-grup">
        <div class="dc-grup-ad">${escapeHTML(t(g.adKey, g.adTR))}</div>
        ${sessizVar ? `<div class="dc-grup-davet">${escapeHTML(t('dc.grup_sessiz', 'Sönük duranlar seni henüz tanımıyor — ilk cümle senden.'))}</div>` : ''}
        <div class="dc-kavramlar">${kartlar}</div>
      </div>`;
  }).join('');

  const zayif = _enZayif();
  const oneri = zayif
    ? `<div class="dc-oneri">${escapeHTML(t('dc.oneri', 'En ince halka şurada görünüyor:'))}
         <button class="dc-oneri-btn" data-kavram="${escapeHTML(zayif.key)}">${escapeHTML(_kavramAd(zayif.key, zayif.adTR))}</button>
       </div>`
    : '';

  return `
    <div class="dc-sec"><span class="dc-sec-label">${escapeHTML(t('dc.sec_tezgah', 'ÇALIŞMA TEZGÂHI'))}</span></div>
    ${oneri}
    ${gruplar}
    <div id="dc-kagit-host" class="dc-kagit-host"></div>`;
}

/* Kağıdı tezgâhta aç. Kapı burada SORULUR ama tat HARCANMAZ (dcCanWork,
   dcGuardWork değil): kağıt dört adımlı uzun bir iştir ve açılışta tat
   harcamak, bakıp vazgeçen kullanıcının tek hakkını hiçbir şey çalışmadan
   yakardı. Tat MÜHÜRDE harcanır — 13b `ckSeal`'in `#dc-kagit-host` kapsamlı
   köprüsü. Kazanma Yöntemi ve Süper Odak'ın kurduğu ayrımın aynısı; kağıt
   alanın en eski tezgâhı olduğu için bu dersten önce yazılmıştı. */
export function dcOpenKagit(concept) {
  const host = document.getElementById('dc-kagit-host');
  if (!host) return;
  if (!dcCanWork()) { dcShowLock(); return; }
  host.innerHTML = '';
  ckRenderCard(host, concept);
  /* `block:'center'` uzun kağıtta 1. adımı ekranın üstünden taşırıyordu —
     kullanıcı kağıdı ortasından açılmış buluyordu. 'start' + CSS
     `scroll-margin-top` kağıdın başlığını topbar'ın ALTINA oturtur. */
  try {
    const azHareket = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    host.scrollIntoView({ behavior: azHareket ? 'auto' : 'smooth', block: 'start' });
  } catch (_) { try { host.scrollIntoView(); } catch (__) {} }
}

/* 13b `ckSeal` mühürledikten sonra çağırır — arşiv anında tazelensin.
   Tezgâhın TAMAMI yeniden basılmaz: mühürlenen kağıt `#dc-tezgah`'ın içinde
   duruyor ve yeniden basım onu mühür anının tam ortasında yok ederdi. Yalnız
   o kavramın kartına çalışıldı izi düşer. */
export function dcOnKagitMuhurlendi(concept) {
  try { _arsivBas(); } catch (_) {}
  recordActivityDay();  // emek sayar: mühürlenen kağıt günü seriye yazar
  try { window.wtLogRitus?.('derin-calisma', 'tamam'); } catch (_) {}
  if (!concept) return;
  try {
    document.querySelectorAll('.dc-kavram').forEach(kart => {
      if (kart.dataset.kavram !== concept) return;
      if (kart.querySelector('.dc-kavram-iz')) return;
      const ust = kart.querySelector('.dc-kavram-ust');
      if (!ust) return;
      const iz = document.createElement('span');
      iz.className = 'dc-kavram-iz';
      iz.setAttribute('aria-hidden', 'true');
      iz.textContent = '◆';
      ust.appendChild(iz);
      const sr = document.createElement('span');
      sr.className = 'sr-only';
      sr.textContent = t('dc.kavram_calisildi', 'Bu kavramda mühürlenmiş kağıdın var.');
      ust.appendChild(sr);
    });
  } catch (_) {}
}

/* ─── 6. KO-ZO TEZGÂHI — ortamı değiştir, iradeni sınama ─── */

/* Kitap 2, #59 (s.261). Kitabın hamlesi iradeye yüklenmek DEĞİL, ortamı
   yeniden dizmektir: istediğine giden yolu KOlaylaştır, istemediğine gideni
   ZOrlaştır. Bu yüzden her madde bir niyet değil bir EYLEMDİR — "daha az
   telefon" değil, "geceleyin şarj aletini salonda bırak".
   GERÇEKLİK (§6.10): burada ölçülen hiçbir şey yok. Her madde kullanıcının
   BEYANIDIR; tezgâh sayı, skor ya da yargı üretmez — yazdığı durur, işaretini
   kendi koyar. Kanıt kapısı gerektirmemesinin sebebi de bu: beyan kendi
   kanıtıdır, ondan bir şey ÇIKARSAMADIĞIMIZ sürece. */
const KOZO_SUTUNLAR = ['ko', 'zo'];
/* Sütun başına tavan: liste yığına dönerse tezgâh olmaktan çıkıp yapılacaklar
   listesine düşer — Ko-Zo az sayıda ama gerçekten kurulmuş düzenek ister. */
const KOZO_TAVAN = 12;
const _kzId = () => 'kz_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);

/* Eski kayıtta alan yoksa ya da bozuksa yerinde onarılır — kullanıcı verisi
   asla düşürülmez, yalnız beklenen şekle getirilir. */
function _kozoState() {
  if (!S._derinCalisma) dcInit();
  const st = S._derinCalisma;
  if (!st.kozo || typeof st.kozo !== 'object') st.kozo = { ko: [], zo: [] };
  for (const s of KOZO_SUTUNLAR) if (!Array.isArray(st.kozo[s])) st.kozo[s] = [];
  return st.kozo;
}

export function dcKozoListe(sutun) {
  if (!KOZO_SUTUNLAR.includes(sutun)) return [];
  return _kozoState()[sutun];
}

/* Madde eklemek YENİ bir çalışmadır — kapı burada (Max ya da tek seferlik tat). */
export function dcKozoEkle(sutun, metin) {
  if (!KOZO_SUTUNLAR.includes(sutun)) return false;
  const temiz = String(metin == null ? '' : metin).trim().slice(0, 140);
  if (!temiz) return false;
  const liste = _kozoState()[sutun];
  if (liste.length >= KOZO_TAVAN) {
    /* Fallback sözlükle BİREBİR aynı: tavan `done` işaretine bakmaz, yalnız
       madde sayısına — "tamamla" demek yer açmayan bir yol göstermek olurdu. */
    try { showToast(t('dc.kozo.tavan', 'Bu sütun doldu — birini kaldırmak yer açar.')); } catch (_) {}
    return false;
  }
  if (!dcGuardWork()) return false;
  liste.push({ id: _kzId(), metin: temiz, at: new Date().toISOString(), done: false });
  dcSave();
  return true;
}

/* İşaretleme ve silme kullanıcının KENDİ verisine dokunur — kapı yoktur.
   (Arşivdeki kağıt silme de aynı sebeple kapısız.) */
export function dcKozoToggle(sutun, id) {
  const madde = dcKozoListe(sutun).find(m => m && m.id === id);
  if (!madde) return false;
  madde.done = !madde.done;
  dcSave();
  return true;
}

export function dcKozoSil(sutun, id) {
  if (!KOZO_SUTUNLAR.includes(sutun)) return false;
  const st = _kozoState();
  const i = st[sutun].findIndex(m => m && m.id === id);
  if (i < 0) return false;
  st[sutun].splice(i, 1);
  dcSave();
  return true;
}

function _kozoBaslik(sutun) {
  return sutun === 'ko'
    ? { ad: t('dc.kozo.ko', 'KO — kolaylaştır'), alt: t('dc.kozo.ko_sub', 'istediğine giden yol') }
    : { ad: t('dc.kozo.zo', 'ZO — zorlaştır'),   alt: t('dc.kozo.zo_sub', 'istemediğine giden yol') };
}

/* Boş sütun kitabın kendi örnekleriyle konuşur — "madde ekle" demek yerine
   nasıl bir maddeden söz ettiğimizi GÖSTERİR. */
function _kozoBosHTML(sutun) {
  const ornekler = sutun === 'ko'
    ? t('dc.kozo.ko_bos', 'Kitabı masanın üstüne koy. · Sayfayı güne böl. · Spor çantasını kapının yanına bırak.')
    : t('dc.kozo.zo_bos', 'Geceleyin ekranı odandan çıkar. · Uygulamayı ikinci sayfaya taşı. · Atıştırmalığı mutfakta bırak.');
  return `<div class="dc-kozo-bos">${escapeHTML(ornekler)}</div>`;
}

function _kozoMaddeHTML(sutun, m) {
  const done = !!m.done;
  return `
    <li class="dc-kozo-madde${done ? ' dc-kozo-madde--done' : ''}">
      <button class="dc-kozo-tik" data-kz-tik="${escapeHTML(m.id)}" data-kz-sutun="${sutun}"
              aria-pressed="${done}"
              aria-label="${escapeHTML(done ? t('dc.kozo.geri_al', 'Kurulmadı olarak işaretle') : t('dc.kozo.kuruldu', 'Kuruldu olarak işaretle'))}">${done ? '◆' : '◇'}</button>
      <span class="dc-kozo-metin">${escapeHTML(m.metin)}</span>
      ${done ? '' : `<button class="dc-kozo-soz" data-kz-soz="${escapeHTML(m.id)}" data-kz-sutun="${sutun}"
              aria-label="${escapeHTML(t('dc.kozo.soz', 'Bunu bugünün sözü yap'))}"
              title="${escapeHTML(t('dc.kozo.soz', 'Bunu bugünün sözü yap'))}">✦</button>`}
      <button class="dc-kozo-sil" data-kz-sil="${escapeHTML(m.id)}" data-kz-sutun="${sutun}"
              aria-label="${escapeHTML(t('dc.kozo.sil', 'Bu maddeyi kaldır'))}">✕</button>
    </li>`;
}

function _kozoSutunHTML(sutun) {
  const { ad, alt } = _kozoBaslik(sutun);
  const liste = dcKozoListe(sutun);
  const maddeler = liste.length
    ? `<ul class="dc-kozo-liste">${liste.map(m => _kozoMaddeHTML(sutun, m)).join('')}</ul>`
    : _kozoBosHTML(sutun);
  return `
    <div class="dc-kozo-sutun dc-kozo-sutun--${sutun}">
      <div class="dc-kozo-ad">${escapeHTML(ad)}</div>
      <div class="dc-kozo-alt">${escapeHTML(alt)}</div>
      ${maddeler}
      <div class="dc-kozo-giris">
        <input type="text" class="dc-kozo-input" data-kz-input="${sutun}" maxlength="140"
               placeholder="${escapeHTML(t('dc.kozo.placeholder', 'Bir hamle yaz…'))}"
               aria-label="${escapeHTML(ad)}">
        <button class="dc-kozo-ekle" data-kz-ekle="${sutun}"
                aria-label="${escapeHTML(t('dc.kozo.ekle', 'Ekle'))}">+</button>
      </div>
    </div>`;
}

function _kozoHTML() {
  return `
    <div class="dc-sec"><span class="dc-sec-label">${escapeHTML(t('dc.sec_kozo', 'KO-ZO TEZGÂHI'))}</span></div>
    <div class="dc-kozo-intro">${escapeHTML(t('dc.kozo.intro',
      'İrade sınanmaz, ortam kurulur. Yolu kolaylaştırdığın şey seni bulur.'))}</div>
    <div class="dc-kozo">
      ${KOZO_SUTUNLAR.map(_kozoSutunHTML).join('')}
    </div>`;
}

/* Ko-Zo'yu YERİNDE tazeler — alanın tamamı yeniden basılmaz: tezgâhta açık
   bir kağıt varsa (dc-kagit-host) tam basım onu kullanıcının altından
   çekerdi. FAZ 4'ün `dcOnKagitMuhurlendi` dersinin aynısı. */
function _kozoBas() {
  const host = document.getElementById('dc-kozo');
  if (!host) return;
  host.innerHTML = _kozoHTML();
  _kozoBagla(host);
}

function _kozoBagla(host) {
  host.querySelectorAll('[data-kz-ekle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sutun = btn.dataset.kzEkle;
      const input = host.querySelector(`[data-kz-input="${sutun}"]`);
      if (!input) return;
      if (dcKozoEkle(sutun, input.value)) { input.value = ''; _kozoBas(); }
    });
  });
  host.querySelectorAll('[data-kz-input]').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (dcKozoEkle(input.dataset.kzInput, input.value)) { input.value = ''; _kozoBas(); }
    });
  });
  host.querySelectorAll('[data-kz-tik]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (dcKozoToggle(btn.dataset.kzSutun, btn.dataset.kzTik)) _kozoBas();
    });
  });
  host.querySelectorAll('[data-kz-sil]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (dcKozoSil(btn.dataset.kzSutun, btn.dataset.kzSil)) _kozoBas();
    });
  });
  /* Söz DAVETİ — madde otomatik olarak söze YAZILMAZ. `sdSenkronla` günün
     `pledges` kaynağını senkronlar; oraya dışarıdan yazmak hem 10s'in
     sözleşmesini ezer hem töreni çiğnerdi: söz vermek bir törendir ve mührü
     kullanıcı basar ([[olus-muhru-2-muhru-sen-basarsin]]). FAZ 3'te kağıdın
     4. adımı için verilen kararın aynısı.
     Davet CÜMLEYİ de taşır: argümansız çağrı töreni açıyor ama kullanıcıya
     maddesini baştan yazdırıyordu — sözün önüne konmuş bir engel. Kağıt için
     FAZ 10'da düzeltilen kırığın Ko-Zo'daki ikiziydi. Metin DOM'dan değil
     kaynaktan okunur (`dcKozoListe`). */
  host.querySelectorAll('[data-kz-soz]').forEach(btn => {
    btn.addEventListener('click', () => {
      const madde = dcKozoListe(btn.dataset.kzSutun).find(m => m && m.id === btn.dataset.kzSoz);
      try { window.glGiveSozNow?.(madde ? madde.metin : undefined); } catch (_) {}
    });
  });
}

/* ─── 7. KAZANMA YÖNTEMİ — sonuç sürekliyse konuşulacak şey yöntemdir ─── */

/* Kitap 2, #52 (s.241) · #75 · #21. Kitabın YOL HARİTASI'sı üç soruda yürür:
   sürekli aldığın sonuç ne → bugüne kadarki yöntemin ne → hangisini
   değiştiriyorsun, hedefi mi yöntemi mi. Üçüncüsü kitabın kendi cevabını
   taşır: karar dışarıdan verilmez, "aklına ve kalbine bak". (Soru şimdiki
   zamanda kalır — "değiştireceksin" kullanıcının geleceği hakkında kesin
   varsayımdı ve ihtimalsel dil kapısına takıldı.)
   MALZEME NEREDEN GELİR: "sürekli" olanı uygulama zaten biliyor — 09d haftalık
   damıtmada ısrarla dönen konuyu çıkarıyor. Burada yeni bir tespit motoru
   KURULMAZ; o örüntü okunur (`window.omGetDirencliOruntuler`, 09d'nin
   konvansiyonu gereği import değil window üzerinden).
   GERÇEKLİK (§6.10 · K6): damıtılmış örüntü yoksa tezgâh bir sonuç UYDURMAZ.
   Ne sayı ne teşhis çıkar — sessizce çalışmaya davet eder. Kullanıcının kendi
   yazdığı üç cevap ise BEYANDIR; olduğu gibi saklanır, yorumlanmaz. */

const KY_SECIMLER = ['hedef', 'yontem'];

function _kazanmaState() {
  if (!S._derinCalisma) dcInit();
  const st = S._derinCalisma;
  if (!Array.isArray(st.kazanma)) st.kazanma = [];
  return st.kazanma;
}

export function dcKazanmaListe() { return _kazanmaState(); }

/* Damıtılmış en dirençli örüntü — yoksa null (davet moduna düşülür). */
function _kyOruntu() {
  try {
    const liste = window.omGetDirencliOruntuler?.(1);
    return (Array.isArray(liste) && liste.length) ? liste[0] : null;
  } catch (_) { return null; }
}

export function dcKazanmaKaydet({ s1, s2, secim, neden, oruntuBaslik } = {}) {
  const c1 = String(s1 == null ? '' : s1).trim().slice(0, 400);
  const c2 = String(s2 == null ? '' : s2).trim().slice(0, 400);
  if (!c1 || !c2) {
    try { showToast(t('dc.ky.eksik', 'İlk iki soru boş kalmasın — sonucu ve yöntemi sen adlandır.')); } catch (_) {}
    return false;
  }
  if (!KY_SECIMLER.includes(secim)) {
    try { showToast(t('dc.ky.secim_yok', 'Bir yol seç: hedef mi, yöntem mi?')); } catch (_) {}
    return false;
  }
  if (!dcGuardWork()) return false;
  _kazanmaState().push({
    id: _kzId(),
    at: new Date().toISOString(),
    oruntuBaslik: String(oruntuBaslik || '').slice(0, 120),
    s1: c1, s2: c2, secim,
    neden: String(neden == null ? '' : neden).trim().slice(0, 400),
  });
  dcSave();
  /* Mühür sesi kağıdınkiyle aynı motordan (13e) — ikizi yazılmaz. Damga
     basılmaz: tam ekran flaş kağıdın töreni, bu tezgâh onun altındadır. */
  try { window.fxCue?.('seal'); } catch (_) {}
  return true;
}

export function dcKazanmaSil(id) {
  const liste = _kazanmaState();
  const i = liste.findIndex(k => k && k.id === id);
  if (i < 0) return false;
  liste.splice(i, 1);
  dcSave();
  return true;
}

function _kyOruntuHTML(pt) {
  if (!pt) {
    /* Kanıtsız hâl: örüntü damıtılmamış. Sayı YOK, teşhis YOK — davet var. */
    return `<div class="dc-ky-sessiz">${escapeHTML(t('dc.ky.sessiz',
      'Sürekli dönen konu henüz damıtılmadı. Konuşmaya devam et — tezgâh malzemesini senin cümlelerinden çıkarır.'))}</div>`;
  }
  const tekrar = (pt.hafta_sayisi || 1) > 1
    ? `<span class="dc-ky-tekrar">${escapeHTML(t('om.tekrar', '{n} haftadır').replace('{n}', pt.hafta_sayisi))}</span>`
    : '';
  /* Alıntı modelden değil, damıtmanın köken temizliğinden geçmiş kanıt
     alanından gelir (09d omKokenTemizlik) — Ayna panelinin gösterdiğiyle
     aynı cümle. Uygulama kaynaktan keser, model yeniden yazmaz. */
  return `
    <div class="dc-ky-oruntu">
      <div class="dc-ky-ust">
        <span class="dc-ky-baslik">${escapeHTML(pt.baslik)}</span>
        ${tekrar}
      </div>
      ${pt.kanit ? `<div class="dc-ky-kanit">«${escapeHTML(pt.kanit)}»</div>` : ''}
    </div>`;
}

function _kyGecmisHTML() {
  const liste = _kazanmaState();
  if (!liste.length) return '';
  const satirlar = liste.slice(-3).reverse().map(k => {
    const yol = k.secim === 'hedef'
      ? t('dc.ky.secim_hedef', 'Hedefi değiştiriyorum')
      : t('dc.ky.secim_yontem', 'Yöntemi değiştiriyorum');
    return `
      <div class="dc-ky-kayit">
        <div class="dc-ky-kayit-ust">
          <span class="dc-ky-kayit-yol">${escapeHTML(yol)}</span>
          <span class="dc-ky-kayit-tarih">${escapeHTML((k.at || '').slice(0, 10))}</span>
          <button class="dc-ky-sil" data-ky-sil="${escapeHTML(k.id)}"
                  aria-label="${escapeHTML(t('dc.ky.sil', 'Bu yol haritasını sil'))}">✕</button>
        </div>
        ${k.neden ? `<div class="dc-ky-kayit-neden">${escapeHTML(k.neden)}</div>` : ''}
      </div>`;
  }).join('');
  return `<div class="dc-ky-gecmis">${satirlar}</div>`;
}

function _kazanmaHTML(formAcik) {
  const pt = _kyOruntu();
  const form = formAcik ? `
    <div class="dc-ky-form">
      <label class="dc-ky-soru" for="dc-ky-s1">${escapeHTML(t('dc.ky.s1', 'Sürekli aldığın sonuç ne?'))}</label>
      <textarea id="dc-ky-s1" class="dc-ky-alan" rows="2" maxlength="400"></textarea>

      <label class="dc-ky-soru" for="dc-ky-s2">${escapeHTML(t('dc.ky.s2', 'Bugüne kadarki yöntemin ne?'))}</label>
      <textarea id="dc-ky-s2" class="dc-ky-alan" rows="2" maxlength="400"></textarea>

      <div class="dc-ky-soru">${escapeHTML(t('dc.ky.s3', 'Hangisini değiştiriyorsun: hedefi mi, yöntemi mi?'))}</div>
      <div class="dc-ky-secim">
        <button type="button" class="dc-ky-sec" data-ky-sec="hedef">${escapeHTML(t('dc.ky.secim_hedef', 'Hedefi değiştiriyorum'))}</button>
        <button type="button" class="dc-ky-sec" data-ky-sec="yontem">${escapeHTML(t('dc.ky.secim_yontem', 'Yöntemi değiştiriyorum'))}</button>
      </div>
      <div class="dc-ky-kitap">${escapeHTML(t('dc.ky.kitap', 'Karar dışarıdan verilmez — aklına ve kalbine bak.'))}</div>
      <textarea id="dc-ky-neden" class="dc-ky-alan" rows="2" maxlength="400"
                placeholder="${escapeHTML(t('dc.ky.neden_ph', 'Neden? (istersen)'))}"></textarea>

      <button type="button" class="dc-ky-muhur" data-ky-muhur="1">${escapeHTML(t('dc.ky.muhur', 'MÜHÜRLE'))}</button>
    </div>` : `
    <button type="button" class="dc-ky-ac" data-ky-ac="1">${escapeHTML(t('dc.ky.ac', 'Yol haritasını aç →'))}</button>`;

  return `
    <div class="dc-sec"><span class="dc-sec-label">${escapeHTML(t('dc.sec_kazanma', 'KAZANMA YÖNTEMİ'))}</span></div>
    <div class="dc-ky-intro">${escapeHTML(t('dc.ky.intro',
      'Sürekli aynı sonucu alıyorsan, değiştirilecek şey hedef değil yöntem olabilir.'))}</div>
    ${_kyOruntuHTML(pt)}
    ${form}
    ${_kyGecmisHTML()}`;
}

function _kazanmaBas(formAcik) {
  const host = document.getElementById('dc-kazanma');
  if (!host) return;
  host.innerHTML = _kazanmaHTML(!!formAcik);
  _kazanmaBagla(host);
}

function _kazanmaBagla(host) {
  host.querySelector('[data-ky-ac]')?.addEventListener('click', () => {
    /* Kapı burada SORULUR ama tat HARCANMAZ (dcCanWork, dcGuardWork değil).
       İkisi de kapı çağırsaydı Max olmayan kullanıcı formu açarken tadını
       harcar, doldurduktan sonra mühür anında kendi kilidine çarpar ve
       yazdıklarını kaybederdi. Tat, forma bakmakla değil MÜHÜR basmakla
       harcanır (`dcKazanmaKaydet`); buradaki kontrol yalnız kimsenin
       dolduramayacağı bir formu doldurmasını engeller. */
    if (!dcCanWork()) { dcShowLock(); return; }
    _kazanmaBas(true);
  });

  let secim = null;
  host.querySelectorAll('[data-ky-sec]').forEach(btn => {
    btn.addEventListener('click', () => {
      secim = btn.dataset.kySec;
      host.querySelectorAll('[data-ky-sec]').forEach(b => {
        b.classList.toggle('dc-ky-sec--on', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
    });
  });

  host.querySelector('[data-ky-muhur]')?.addEventListener('click', () => {
    const pt = _kyOruntu();
    const ok = dcKazanmaKaydet({
      s1: host.querySelector('#dc-ky-s1')?.value,
      s2: host.querySelector('#dc-ky-s2')?.value,
      secim,
      neden: host.querySelector('#dc-ky-neden')?.value,
      oruntuBaslik: pt ? pt.baslik : '',
    });
    if (ok) _kazanmaBas(false);
  });

  _kyGecmisBagla(host);
}

/* Yalnız geçmiş listesini tazeler. Bölümün tamamı (`_kazanmaBas`) BASILMAZ:
   geçmiş, form AÇIKKEN de görünür — üç soruyu doldurmuş bir kullanıcı eski bir
   kaydı sildiğinde tam basım yazdıklarını silerdi. Alanın "kendi host'unu bas"
   kuralının bir kademe altı: bir bölümü tazelerken o bölümdeki açık form
   korunur. */
function _kyGecmisTazele(host) {
  const eski = host.querySelector('.dc-ky-gecmis');
  if (!eski) return;
  const html = _kyGecmisHTML();
  /* Gösterilen son üç kayıttır; biri silinince daha eskisi açığa çıkabilir —
     o yüzden satırı DOM'dan koparmak yetmez, liste yeniden dokunur. */
  if (!html) { eski.remove(); return; }
  eski.outerHTML = html;
  _kyGecmisBagla(host);
}

function _kyGecmisBagla(host) {
  host.querySelectorAll('[data-ky-sil]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (dcKazanmaSil(btn.dataset.kySil)) _kyGecmisTazele(host);
    });
  });
}

/* ─── 8. SÜPER ODAK — kalp ve zihin aynı hedefi gösteriyorsa ─── */

/* Kitap 2, #134 (s.459): "Kalp ve zihinle uyumlu, net bir hedefin varsa odak
   kendiliğinden gelir." Kitabın KRİTİK NOKTA'sı hedefi yazmak DEĞİL, yazdıktan
   sonra içeri bakmaktır: zihin bu hedefi onaylıyor mu, kalp huzurlu mu? İkisi
   birden gelmeden hedef "Süper Odak" sayılmaz — tek onayla geçilirse tezgâh
   kitabın söylemediği bir şeyi söylemiş olur.
   TEK HEDEF, liste değil: kitap "net BİR hedef" der; odak zaten bölünmemek
   demektir. Yeni hedef eskisinin yerine geçer.
   GERÇEKLİK (§6.10): iki onay da kullanıcının BEYANIDIR ve öyle saklanır.
   Uygulama bir "uyum skoru" ÜRETMEZ — Olmak İstediğin Kişi'nin (10D) tanımı
   yalnız yan yana GÖSTERİLİR; hedefin o kişiye yakışıp yakışmadığına
   kullanıcı bakar. Uydurulmuş bir yüzde burada tezin ihlali olurdu. */

function _odakState() {
  if (!S._derinCalisma) dcInit();
  return S._derinCalisma.odak || null;
}

export function dcOdakGet() { return _odakState(); }

export function dcOdakKaydet({ hedef, zihin, kalp } = {}) {
  const temiz = String(hedef == null ? '' : hedef).trim().slice(0, 200);
  if (!temiz) {
    try { showToast(t('dc.odak.hedef_yok', 'Hedef henüz boş — tek cümle yeter.')); } catch (_) {}
    return false;
  }
  /* Kitabın kapısı: TEK onay yetmez. Buradaki `&&` bir katılık değil, kitabın
     kendi cümlesi — kalp ve zihin AYNI hedefi göstermeli. */
  if (!zihin || !kalp) {
    try { showToast(t('dc.odak.ikisi_de', 'Zihin ve kalp aynı hedefi göstermeden odak kurulmuş sayılmaz.')); } catch (_) {}
    return false;
  }
  if (!dcGuardWork()) return false;
  if (!S._derinCalisma) dcInit();
  S._derinCalisma.odak = { hedef: temiz, zihin: true, kalp: true, at: new Date().toISOString() };
  dcSave();
  try { window.fxCue?.('seal'); } catch (_) {}
  return true;
}

export function dcOdakSil() {
  if (!S._derinCalisma || !S._derinCalisma.odak) return false;
  S._derinCalisma.odak = null;
  dcSave();
  return true;
}

/* ─── 5b. BUGÜN PENCERESİ — tezgâhın Bugün'deki kesiti ───
   Emre'nin kararı (2026-08-18): Bugün'deki Kişilerim deste bölümü söküldü
   (kartlar iki ana kartın arkasına ve tam ekran odaya taşındı, 10f + 13B),
   yerine Derin Çalışma geldi. Bölüm YENİ MOTOR YAZMAZ — alanın kendi
   durumundan okur ve tezgâha kapı açar.

   Ne gösterir: kullanıcının kendi beyanı. Süper Odak'ın hedefi, yoksa
   Ko-Zo'da kurduğu son açık hamle. İkisi de yoksa SAYI DEĞİL DAVET (K6):
   burada üretilecek bir ölçü yoktur, çünkü tezgâha henüz dokunulmamıştır.
   Kaynak ayrımı korunur: «…» kullanıcının kendi cümlesidir. */

/** Bugün'de gösterilecek kesit: {kicker, cumle} | null. Sıra bir öncelik
 *  değil, tazelik: odak günün çerçevesidir, Ko-Zo o çerçevenin içindeki
 *  hamledir. */
export function dcBugunKesit() {
  const o = _odakState();
  if (o && o.hedef) {
    return { tur: 'odak', kicker: t('dc.bugun.odak_k', 'ŞU AN ÜSTÜNDE DURDUĞUN'), cumle: o.hedef };
  }
  // Ko-Zo: en son eklenen AÇIK madde (kurulmuş olan bir hatırlatma değildir).
  for (const sutun of ['ko', 'zo']) {
    const acik = (dcKozoListe(sutun) || []).filter(x => x && !x.done);
    if (acik.length) {
      return {
        tur: 'kozo',
        kicker: sutun === 'ko'
          ? t('dc.bugun.kozo_k', 'KOLAYLAŞTIRDIĞIN YOL')
          : t('dc.bugun.zozo_k', 'ZORLAŞTIRDIĞIN YOL'),
        cumle: acik[acik.length - 1].metin,
      };
    }
  }
  return null;
}

/** Bugün bölümünü çiz. Host yoksa sessizce düşer (Bugün dışındaki ekranlar). */
export function dcRenderBugun() {
  const host = document.getElementById('dc-bugun');
  if (!host) return;
  const body = host.querySelector('#dc-bugun-body');
  if (!body) return;

  const kesit = dcBugunKesit();
  const govde = kesit
    ? `<div class="dcb-kesit">
         <div class="dcb-kicker">${escapeHTML(kesit.kicker)}</div>
         <div class="dcb-cumle">«${escapeHTML(kesit.cumle)}»</div>
       </div>`
    : `<div class="dcb-davet">${escapeHTML(t('dc.bugun.davet',
        'Tezgâh açık. Bugün neyin üstünde duracağını orada seçersin.'))}</div>`;

  // Durum satırı odanın alt satırıyla AYNI cümleyi konuşur (dcSyncRoomSub) —
  // iki yüzey aynı kapıyı anlatır, ikinci bir sözlük yazılmaz.
  let durum = '';
  try {
    durum = dcIsMax()
      ? t('dc.sub_open', 'tezgâh açık')
      : (dcTatUsed() ? t('dc.sub_locked', 'Max ile açılır') : t('dc.sub_taste', 'bir çalışma seni bekliyor'));
  } catch (_) {}

  body.innerHTML = `${govde}
    ${durum ? `<div class="dcb-durum">${escapeHTML(durum)}</div>` : ''}`;
}

/* Olmak İstediğin Kişi (10D) — tek kaynak `oikGetDesired`, window üzerinden
   (10D kendi expose eder; 13A onu import etmez, dairesel bağ kurulmasın). */
function _odakOik() {
  try {
    const d = window.oikGetDesired?.();
    return (d && d.name) ? d : null;
  } catch (_) { return null; }
}

function _odakMuhurluHTML(odak) {
  return `
    <div class="dc-odak-kart">
      <div class="dc-odak-etiket">${escapeHTML(t('dc.odak.kurulu', 'ODAK KURULU'))}</div>
      <div class="dc-odak-hedef">${escapeHTML(odak.hedef)}</div>
      <div class="dc-odak-izler">
        <span class="dc-odak-iz">◆ ${escapeHTML(t('dc.odak.zihin_iz', 'zihin uyumlu'))}</span>
        <span class="dc-odak-iz">◆ ${escapeHTML(t('dc.odak.kalp_iz', 'kalp huzurlu'))}</span>
        <span class="dc-odak-tarih">${escapeHTML((odak.at || '').slice(0, 10))}</span>
      </div>
      <div class="dc-odak-eylemler">
        <button type="button" class="dc-odak-degistir" data-odak-degistir="1">${escapeHTML(t('dc.odak.degistir', 'Hedefi değiştir'))}</button>
        <!-- Kaldırma her tezgâhta var (Ko-Zo · arşiv · yol haritası): kullanıcı
             kendi çalışmasının sahibidir. Odak "bitirilecek" bir şey değil,
             bırakılabilir bir şeydir de. -->
        <button type="button" class="dc-odak-kaldir" data-odak-kaldir="1"
                aria-label="${escapeHTML(t('dc.odak.kaldir', 'Odağı kaldır'))}">✕</button>
      </div>
    </div>`;
}

function _odakFormHTML(odak) {
  const oik = _odakOik();
  /* OİK satırı bir yargı değil bir AYNA: kullanıcının kendi tasarladığı kimlik
     hedefin yanında durur, karşılaştırmayı o yapar. */
  const oikSatiri = oik
    ? `<div class="dc-odak-oik">${escapeHTML(t('dc.odak.oik', 'Olmak istediğin kişi:'))}
         <span class="dc-odak-oik-ad">${escapeHTML(oik.name)}</span>
       </div>`
    : '';
  return `
    ${oikSatiri}
    <label class="dc-odak-soru" for="dc-odak-hedef">${escapeHTML(t('dc.odak.hedef_soru', 'Net hedefin ne? Tek cümle.'))}</label>
    <textarea id="dc-odak-hedef" class="dc-odak-alan" rows="2" maxlength="200">${escapeHTML(odak?.hedef || '')}</textarea>

    <div class="dc-odak-kritik">${escapeHTML(t('dc.odak.kritik', 'Şimdi dikkatini içine ver.'))}</div>
    <div class="dc-odak-onaylar">
      <button type="button" class="dc-odak-onay" data-odak-onay="zihin" aria-pressed="false">
        <span class="dc-odak-onay-glif" aria-hidden="true">◇</span>
        <span class="dc-odak-onay-metin">${escapeHTML(t('dc.odak.zihin', 'Zihnim bu hedefle uyumlu'))}</span>
      </button>
      <button type="button" class="dc-odak-onay" data-odak-onay="kalp" aria-pressed="false">
        <span class="dc-odak-onay-glif" aria-hidden="true">◇</span>
        <span class="dc-odak-onay-metin">${escapeHTML(t('dc.odak.kalp', 'İçim huzurlu'))}</span>
      </button>
    </div>
    <button type="button" class="dc-odak-muhur" data-odak-muhur="1">${escapeHTML(t('dc.odak.muhur', 'ODAĞI KUR'))}</button>`;
}

function _odakHTML(formAcik) {
  const odak = _odakState();
  const govde = (odak && !formAcik)
    ? _odakMuhurluHTML(odak)
    : (formAcik
        ? `<div class="dc-odak-form">${_odakFormHTML(odak)}</div>`
        : `<button type="button" class="dc-odak-ac" data-odak-ac="1">${escapeHTML(t('dc.odak.ac', 'Odağını kur →'))}</button>`);
  return `
    <div class="dc-sec"><span class="dc-sec-label">${escapeHTML(t('dc.sec_odak', 'SÜPER ODAK'))}</span></div>
    <div class="dc-odak-intro">${escapeHTML(t('dc.odak.intro',
      'Kalp ve zihin aynı hedefi gösteriyorsa odak kendiliğinden gelir.'))}</div>
    ${govde}`;
}

function _odakBas(formAcik) {
  const host = document.getElementById('dc-odak');
  if (!host) return;
  host.innerHTML = _odakHTML(!!formAcik);
  _odakBagla(host);
}

function _odakBagla(host) {
  host.querySelector('[data-odak-ac]')?.addEventListener('click', () => {
    // FAZ 6'nın dersi: açılışta tat HARCANMAZ, yalnız izin sorulur.
    if (!dcCanWork()) { dcShowLock(); return; }
    _odakBas(true);
  });
  host.querySelector('[data-odak-degistir]')?.addEventListener('click', () => {
    if (!dcCanWork()) { dcShowLock(); return; }
    _odakBas(true);
  });
  // Kendi kaydını kaldırmak kapıya takılmaz (Ko-Zo ve arşivdeki kural).
  host.querySelector('[data-odak-kaldir]')?.addEventListener('click', () => {
    if (dcOdakSil()) _odakBas(false);
  });

  /* Onaylar her açılışta SIFIRDAN gelir — kayıtlı odağı düzenlerken bile.
     Eski onayı taşımak "kalbin hâlâ huzurlu mu?" sorusunu kullanıcı adına
     cevaplamak olurdu; hedef değişiyorsa içeri yeniden bakılır. */
  const onaylar = { zihin: false, kalp: false };
  host.querySelectorAll('[data-odak-onay]').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.odakOnay;
      onaylar[k] = !onaylar[k];
      btn.classList.toggle('dc-odak-onay--on', onaylar[k]);
      btn.setAttribute('aria-pressed', String(onaylar[k]));
      const glif = btn.querySelector('.dc-odak-onay-glif');
      if (glif) glif.textContent = onaylar[k] ? '◆' : '◇';
    });
  });

  host.querySelector('[data-odak-muhur]')?.addEventListener('click', () => {
    const ok = dcOdakKaydet({
      hedef: host.querySelector('#dc-odak-hedef')?.value,
      zihin: onaylar.zihin,
      kalp: onaylar.kalp,
    });
    if (ok) _odakBas(false);
  });
}

/* ─── 9. DÖNÜŞÜM HATTI — günler bölümlere ayrılınca ─── */

/* Uygulama her gün bir özet yazıyor (`chat_summaries`) ve o özetleri
   bölümlere ayıran motor da yıllardır burada — yalnız çizecek kabuğu yoktu
   (`#w3-journey-chapters` DOM'dan kalkmıştı, yani motor çalışıyor, kimse
   görmüyordu). FAZ 8'de okuma katmanı ekrandan ayrıldı (`w3GetChapters`);
   hat burada, tezgâhın diliyle çiziliyor.
   MALZEME: 12'nin okuyucusu — 13A onu import ETMEZ, `window` üzerinden okur
   (09d ve 10D ile aynı konvansiyon; alanın kabuğu ağır modüllere bağlanmasın).
   GERÇEKLİK (§6.10): bölüm başlığı ve açıklaması MODELİN YORUMUDUR ve öyle
   ETİKETLENİR (`dc.hat.okuma` satırı) — altında duran satırlar kullanıcının
   kendi gün başlıklarıdır, yani yorum kanıtın üstünde durur. Işık (altın)
   yoruma verilmez. Eşiğin altında hat hiç üretilmez: sayı değil davet.
   (Eski v1 cache'te gün satırı yoktur; yorum etiketiyle tek başına durur ve
   satırlarına ilk tazelemede kavuşur.)
   GÜN SATIRI TIKLANMAZ: gün özeti okuyucusunun kabuğu (`#w2-summary-page-
   container`) da DOM'da yok — bir yere götürür gibi yapmak sessiz bir vaat
   kırığı olurdu. Satır burada KANITTIR, kapı değil.
   KAPI: bölüm ÜRETMEK gerçek bir LLM çağrısıdır → `dcGuardWork()` (tat orada
   harcanır). Üretilmiş hattı OKUMAK kapısızdır. */

/* Yalnız yüzeyin anlık hâli — kalıcı değil, `etw_dc_v1` içine girmez.
   Hattın kendisi 12'nin sürüm anahtarlı cache'inde yaşar. */
let _hatDurum = { yukleniyor: false, sebep: null, hat: null };

function _hatCache() {
  try { return window.w3GetChaptersCached?.() || null; } catch (_) { return null; }
}

export async function dcHatCikar({ force = false } = {}) {
  if (typeof window.w3GetChapters !== 'function') {
    _hatDurum = { yukleniyor: false, sebep: 'motor_yok', hat: null };
    _hatBas();
    return false;
  }
  if (!dcGuardWork()) return false;
  _hatDurum = { yukleniyor: true, sebep: null, hat: _hatDurum.hat };
  _hatBas();
  let sonuc = null;
  try { sonuc = await window.w3GetChapters({ force }); }
  catch (e) { sonuc = { ok: false, sebep: 'uretilemedi', hata: e && e.message }; }
  _hatDurum = (sonuc && sonuc.ok)
    ? { yukleniyor: false, sebep: null, hat: { chapters: sonuc.chapters, gunler: sonuc.gunler || [] } }
    : { yukleniyor: false, sebep: (sonuc && sonuc.sebep) || 'uretilemedi', hat: null };
  _hatBas();
  return !!(sonuc && sonuc.ok);
}

function _hatTarih(at) {
  try {
    return new Date(at).toLocaleDateString(S._currentLang || 'tr', { day: 'numeric', month: 'short' });
  } catch (_) { return ''; }
}

function _hatBolumHTML(ch, idx, gunler) {
  /* Roma rakamı 12'nin `toRoman`ından gelir (window köprüsü); yoksa sade
     sayıya düşer — ikinci bir çevirici YAZILMAZ. */
  let no;
  try { no = window.toRoman?.(idx + 1); } catch (_) { no = null; }
  const gunSatirlari = (ch.day_indices || [])
    .map(i => gunler[i])
    .filter(Boolean)
    .map(g => `
      <div class="dc-hat-gun">
        <span class="dc-hat-gun-tarih">${escapeHTML(_hatTarih(g.at))}</span>
        <span class="dc-hat-gun-baslik">${escapeHTML(g.baslik || '—')}</span>
      </div>`).join('');
  return `
    <div class="dc-hat-bolum">
      <div class="dc-hat-ust">
        <span class="dc-hat-no" aria-hidden="true">${escapeHTML(no || String(idx + 1))}</span>
        <span class="dc-hat-baslik">${escapeHTML(ch.title || '—')}</span>
      </div>
      ${ch.description ? `<div class="dc-hat-aciklama">${escapeHTML(ch.description)}</div>` : ''}
      ${gunSatirlari ? `<div class="dc-hat-gunler">${gunSatirlari}</div>` : ''}
    </div>`;
}

function _hatHTML() {
  const govde = (() => {
    if (_hatDurum.yukleniyor) {
      return `<div class="dc-hat-bekle">${escapeHTML(t('dc.hat.yukleniyor', 'Hat çıkarılıyor…'))}</div>`;
    }
    const hat = _hatDurum.hat || _hatCache();
    if (hat && hat.chapters && Array.isArray(hat.chapters.chapters) && hat.chapters.chapters.length) {
      const gunler = hat.gunler || [];
      const bolumler = hat.chapters.chapters.map((ch, i) => _hatBolumHTML(ch, i, gunler)).join('');
      return `
        <div class="dc-hat-okuma">${escapeHTML(t('dc.hat.okuma',
          'Bu bölümleme senin günlerinden yapılmış bir okuma; altındaki satırlar senin kendi başlıkların.'))}</div>
        ${hat.chapters.intro ? `<div class="dc-hat-giris">${escapeHTML(hat.chapters.intro)}</div>` : ''}
        ${bolumler}
        <button type="button" class="dc-hat-tazele" data-hat-tazele="1">${escapeHTML(t('dc.hat.tazele', 'Hattı tazele'))}</button>`;
    }
    if (_hatDurum.sebep === 'az_gun') {
      return `<div class="dc-hat-sessiz">${escapeHTML(t('dc.hat.az_gun',
        'Hat, günler birikince kendi biçimini alır. Henüz erken.'))}</div>`;
    }
    if (_hatDurum.sebep) {
      /* Sahte başarı yok (§6.2): çıkmadıysa çıkmadı denir ve yol açık kalır. */
      return `
        <div class="dc-hat-sessiz">${escapeHTML(t('dc.hat.hata', 'Hat bu sefer çıkmadı.'))}</div>
        <button type="button" class="dc-hat-cikar" data-hat-cikar="1">${escapeHTML(t('dc.hat.tekrar', 'Yeniden dene'))}</button>`;
    }
    return `
      <div class="dc-hat-intro">${escapeHTML(t('dc.hat.intro',
        'Konuştuğun günler bir kitabın bölümleri gibi okunabilir.'))}</div>
      <button type="button" class="dc-hat-cikar" data-hat-cikar="1">${escapeHTML(t('dc.hat.cikar', 'Hattı çıkar →'))}</button>`;
  })();

  return `
    <div class="dc-sec"><span class="dc-sec-label">${escapeHTML(t('dc.sec_hat', 'DÖNÜŞÜM HATTI'))}</span></div>
    ${govde}`;
}

function _hatBas() {
  const host = document.getElementById('dc-hat');
  if (!host) return;
  host.innerHTML = _hatHTML();
  host.querySelector('[data-hat-cikar]')?.addEventListener('click', () => { dcHatCikar(); });
  host.querySelector('[data-hat-tazele]')?.addEventListener('click', () => { dcHatCikar({ force: true }); });
}

/* ─── 10. SEFER — 21 gün, aynı yere dönmek ─── */

/* Sefer Engeller ritüelinden (10m) ya da Örüntü Aynası'ndan (09d) başlar ve
   `challenge_progress`'te yaşar. Bugüne kadar BAŞLIYOR ama ilerlemiyordu:
   `completeChallengeDay`'in tek bir çağıranı yoktu ve durumu gösteren bir
   yüzey de yoktu — yani 21 günlük yol ilk günde donuyordu. Yüzeyi burada
   açılıyor.
   KAPI YOK (bilinçli): sefer Derin Çalışma'nın kendi tezgâhı DEĞİL, başka
   kapılardan başlamış bir yol — DC_ROOMS'un `gate:false` gerekçesinin aynısı.
   Max kilidi burada olsaydı, ücretsiz ekranlardan başlatılan bir yol
   mühürlenemez hâle gelirdi.
   GERÇEKLİK (§6.10): gösterilen tek sayı kullanıcının kendi mühürlediği gün
   sayısıdır (ölçüm). `nefes` YÜZEYE ÇIKMAZ — 10h onu her günde rastgele
   düşürüyordu; kanıtı olmayan bir sayıydı, bu turda yazımı da kaldırıldı. */

const SEFER_GUN = 21;
let _seferYukleniyor = false;

function _seferAktif() { return S._activeChallenge || null; }

function _seferGorev(ch) {
  try {
    const gorevler = window.seferGorevleri?.(ch) || [];
    const gun = ch.current_day || 0;
    return (gun < SEFER_GUN && gorevler[gun]) ? String(gorevler[gun]) : '';
  } catch (_) { return ''; }
}

function _seferMuhurlendiMi() {
  try { return !!window.seferBugunMuhurlendi?.(); } catch (_) { return false; }
}

/* Alan her açıldığında sefer durumu tazelenir: yol başka bir ekrandan
   başlamış ya da başka bir cihazda ilerlemiş olabilir. Köprü yoksa sessizce
   mevcut state'le yetinilir (asla bloklama). */
function _seferYukle() {
  if (_seferYukleniyor || typeof window.loadChallenges !== 'function') return;
  _seferYukleniyor = true;
  Promise.resolve()
    .then(() => window.loadChallenges())
    .catch(() => {})
    .then(() => { _seferYukleniyor = false; _seferBas(); });
}

function _seferIzlerHTML(gun) {
  const izler = Array.from({ length: SEFER_GUN }, (_, i) =>
    `<span class="dc-sefer-iz${i < gun ? ' dc-sefer-iz--dolu' : ''}"></span>`).join('');
  return `<div class="dc-sefer-izler" aria-hidden="true">${izler}</div>`;
}

function _seferKartHTML(ch) {
  const gun = Math.max(0, Math.min(SEFER_GUN, ch.current_day || 0));
  const ad = ch.challenge_name || t('dc.sefer.ad_yok', 'Sefer');
  let soz = '';
  try { if (ch.boss_id) soz = window.getSeferPrompt?.(ch.boss_id) || ''; } catch (_) {}
  const gorev = _seferGorev(ch);
  const muhurlu = _seferMuhurlendiMi();

  return `
    <div class="dc-sefer-kart">
      <div class="dc-sefer-ad">${escapeHTML(ad)}</div>
      ${soz ? `<div class="dc-sefer-soz">${escapeHTML(soz)}</div>` : ''}
      ${_seferIzlerHTML(gun)}
      <div class="dc-sefer-sayi">${escapeHTML(t('dc.sefer.gun', 'gün {n} / {t}').replace('{n}', gun).replace('{t}', SEFER_GUN))}</div>
      ${gorev ? `
        <div class="dc-sefer-gorev-etiket">${escapeHTML(t('dc.sefer.bugun', 'Bugünün adımı'))}</div>
        <div class="dc-sefer-gorev">${escapeHTML(gorev)}</div>` : ''}
      ${muhurlu
        ? `<div class="dc-sefer-muhurlu">◆ ${escapeHTML(t('dc.sefer.muhurlu', 'bugün mühürlendi'))}</div>`
        : `<button type="button" class="dc-sefer-muhur" data-sefer-muhur="1">${escapeHTML(t('dc.sefer.muhurle', 'GÜNÜ MÜHÜRLE'))}</button>`}
    </div>`;
}

function _seferBitenHTML() {
  const biten = Array.isArray(S._completedSeferler) ? S._completedSeferler : [];
  if (!biten.length) return '';
  const adlar = biten.slice(0, 3).map(b => escapeHTML(b.challenge_name || '—')).join(' · ');
  return `<div class="dc-sefer-biten">${escapeHTML(t('dc.sefer.biten', 'Tamamlanan:'))} ${adlar}</div>`;
}

function _seferHTML() {
  const ch = _seferAktif();
  const govde = ch
    ? _seferKartHTML(ch)
    : `<div class="dc-sefer-sessiz">${escapeHTML(t('dc.sefer.yok',
        'Açık bir sefer yok. Bir kalıbın üstüne 21 gün gidilebilir.'))}</div>
       <button type="button" class="dc-sefer-basla" data-sefer-basla="1">${escapeHTML(t('dc.sefer.basla', 'Engeller\'e bak →'))}</button>`;
  return `
    <div class="dc-sec"><span class="dc-sec-label">${escapeHTML(t('dc.sec_sefer', 'SEFER'))}</span></div>
    ${govde}
    ${_seferBitenHTML()}`;
}

function _seferBas() {
  const host = document.getElementById('dc-sefer');
  if (!host) return;
  host.innerHTML = _seferHTML();
  /* Sunucuya giden bir eylemde sessiz `catch` sahte başarıya dönüşür (§6.2):
     çağrı patlarsa kart aynen durur ve kullanıcı günü mühürlemiş sanır — oysa
     sefer olduğu yerde kalmıştır. Burada hata SÖYLENİR ve düğme geri gelir;
     yol kapanmaz. (Süsleme köprüleri — fxCue, toRoman — sessiz düşmeye devam
     eder: ayrım kullanıcının bastığı, sonucu olan eylemdedir.) */
  host.querySelector('[data-sefer-muhur]')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const hata = () => {
      try { showToast(t('dc.sefer.muhur_hata', 'Gün mühürlenemedi — bağlantı geri geldiğinde yeniden dene.'), true); } catch (_) {}
    };
    if (typeof window.completeChallengeDay !== 'function') { hata(); return; }
    btn.disabled = true;
    try {
      await window.completeChallengeDay();
    } catch (err) {
      console.warn('dcSeferMuhur:', err && err.message);
      btn.disabled = false;
      hata();
      return;
    }
    _seferBas();
  });
  host.querySelector('[data-sefer-basla]')?.addEventListener('click', () => {
    try { window.switchView?.('hasimlar'); } catch (_) {}
  });
}

/* ─── 11. ARŞİV — kullanıcının kendi çalışmaları ─── */

/* Arşiv bir liste değil, geri açılabilir bir DEFTERDİR. Mühürlenen kağıt yalnız
   "olmuş" diye anılmıyordu: dört adımın yalnız birinin ilk 70 karakteri
   görünüyor, kullanıcı kendi çalışmasını bir daha okuyamıyordu. Veri hep tamdı
   (09b `step1_answer` · `step2_vision` · `step3_affirmation` · `davranis` ·
   `ses_id`) — burada yeni bir şey ÜRETİLMEZ, kaydın kendisi kesilir.
   GERÇEKLİK (§6.10): dört adımın ÜÇÜ kullanıcının kendi cümlesidir (1, 2, 4);
   3. adımdaki olumlama ise KİTABIN şablonundan gelir (`tmpl.affirmation`,
   13b:213) — kullanıcı onu yazmadı, okudu. Kaynak ayrımı yüzeyde görünür
   (FAZ 4). Boş bırakılan adım satır ÜRETMEZ: "belirtilmemiş" demek
   kullanıcının boş bıraktığı yeri yargılamaktır. Yorum, özet, skor yok. */
/* KAYNAK AYRIMI (§6.10). Repo bu ayrımı zaten konuşuyor, burada yeni bir dil
   icat edilmez — yalnız sürdürülür:
     «…»  kullanıcının KENDİ cümlesi, kaynaktan kesilmiş (dc-kavram-alinti,
          dc-ky-kanit — ikisi de kullanıcının sözü)
     “…”  kitabın cümlesi (kağıdın `.ck-affirmation`'ı bu tırnağı kullanır)
   Olumlama kullanıcının beyanı DEĞİLDİR: `tmpl.affirmation` şablondan gelir,
   kullanıcı onu yazmadı — okudu, sesli söyledi, belki kaydetti. Arşiv okunan
   yerdir; orada dört cümle yan yana dururken hangisinin kime ait olduğu
   görünmezse uygulama kullanıcıya kendi sözü diye kitabın sözünü göstermiş
   olur. Altın kullanıcının tarafında tam, kitabın tarafında kısıktır. */
function _arsivAdimHTML(etiketKey, etiketTR, metin, kitap) {
  if (!metin) return '';
  const kaynak = kitap
    ? `<span class="dc-arsiv-adim-kaynak">· ${escapeHTML(t('dc.arsiv_kitaptan', 'kitaptan'))}</span>`
    : '';
  const govde = kitap ? `“${escapeHTML(metin)}”` : escapeHTML(metin);
  return `
    <div class="dc-arsiv-adim${kitap ? ' dc-arsiv-adim--kitap' : ''}">
      <div class="dc-arsiv-adim-ad">${escapeHTML(t(etiketKey, etiketTR))}${kaynak}</div>
      <div class="dc-arsiv-adim-metin">${govde}</div>
    </div>`;
}

/* Adım etiketleri KAĞIDIN kendi sözlüğünden okunur (`ck.step*`) — aynı cümle
   iki sözlük satırında yaşamaz. */
function _arsivDetayHTML(o) {
  return [
    _arsivAdimHTML('ck.step1', 'YAZ — dışa çıkar',       o.step1_answer),
    _arsivAdimHTML('ck.step2', 'HAYAL ET — içe gir',     o.step2_vision),
    _arsivAdimHTML('ck.step3', 'PROGRAMLA — sesini duy', o.step3_affirmation, true),
    _arsivAdimHTML('ck.step4', 'DAVRANIŞ — güne taşı',   o.davranis),
  ].join('');
}

/* Kitabın 3. adımı dokuz kez "kaydet ve DİNLE" der; tekrar edilemeyen bir
   pratik pratik değildir. Blob cihazda durur (IndexedDB, Supabase'e gitmez) ve
   düğme ancak blob GERÇEKTEN bulunduğunda basılır: olmayan bir sesi vaat etmek
   sessiz bir yalan olurdu (§6.2). */
let _arsivSesURL = null;

function _arsivSesBirak() {
  if (!_arsivSesURL) return;
  try { URL.revokeObjectURL(_arsivSesURL); } catch (_) {}
  _arsivSesURL = null;
}

async function _arsivSesEkle(host, sesId) {
  if (!sesId) return;
  let rec = null;
  try { rec = await idbGetRecording(sesId); } catch (_) { rec = null; }
  /* Panel bu arada kapanmış olabilir (async): kapalı bir panele düğme eklemek
     bir sonraki açılışta hayalet satır bırakırdı. `closest` host'un kendisini
     de kapsar — host ister panel ister olumlama adımı olsun aynı kontrol. */
  const panel = host.closest('.dc-arsiv-detay');
  if (!rec || !rec.blob || !host.isConnected || !panel || panel.hidden) return;
  const satir = document.createElement('div');
  satir.className = 'dc-arsiv-ses';
  satir.innerHTML = `
    <button type="button" class="dc-arsiv-ses-btn">${escapeHTML(t('ck.listen', '▶ Kendi sesinden dinle'))}</button>
    <audio class="dc-arsiv-audio" preload="none"></audio>`;
  host.appendChild(satir);
  satir.querySelector('.dc-arsiv-ses-btn').addEventListener('click', () => {
    const audio = satir.querySelector('.dc-arsiv-audio');
    _arsivSesBirak();                       // önceki URL bırakılmazsa sızar
    try {
      _arsivSesURL = URL.createObjectURL(rec.blob);
      audio.src = _arsivSesURL;
      audio.play().catch(() => {});
    } catch (_) {}
  });
}

function _arsivKapat(satir) {
  const detay = satir.querySelector('.dc-arsiv-detay');
  if (detay) { detay.hidden = true; detay.innerHTML = ''; }
  satir.querySelector('.dc-arsiv-ac')?.setAttribute('aria-expanded', 'false');
  satir.classList.remove('dc-arsiv-satir--acik');
  _arsivSesBirak();
}

function _arsivAc(satir, o) {
  const detay = satir.querySelector('.dc-arsiv-detay');
  if (!detay) return;
  detay.innerHTML = _arsivDetayHTML(o);
  detay.hidden = false;
  satir.querySelector('.dc-arsiv-ac')?.setAttribute('aria-expanded', 'true');
  satir.classList.add('dc-arsiv-satir--acik');
  /* Ses OLUMLAMANIN altına düşer, panelin sonuna değil: kitabın tarifi tek
     cümledir — "bu ifadeleri sesli oku, kaydet ve dinle". Cümleyle sesi
     ayırmak tarifi ikiye bölerdi. Olumlama yoksa panelin sonuna iner. */
  _arsivSesEkle(detay.querySelector('.dc-arsiv-adim--kitap') || detay, o.ses_id);
}

function _arsivHTML() {
  let oturumlar = [];
  try { oturumlar = dfGetWorksheetSessions() || []; } catch (_) {}
  if (!oturumlar.length) {
    return `<div class="dc-arsiv-bos">${escapeHTML(t('dc.arsiv_bos', 'Henüz mühürlenmiş bir kağıt yok.'))}</div>`;
  }
  const satirlar = oturumlar.slice(-8).reverse().map((o, i) => {
    const gercekIndex = oturumlar.length - 1 - i;   // slice+reverse sonrası asıl sıra
    const tarih = (o.date || '').slice(0, 10);
    const ad = _kavramAd(o.concept, o.concept);
    const ilk = (o.step1_answer || '').slice(0, 70);
    /* Sil düğmesi aç/kapa düğmesinin İÇİNE giremez — iç içe `<button>`
       geçersiz markup'tır ve tıklama yanlış hedefe kaçar. İkisi kardeş durur. */
    return `
      <div class="dc-arsiv-satir">
        <div class="dc-arsiv-ust">
          <button type="button" class="dc-arsiv-ac" data-arsiv="${gercekIndex}" aria-expanded="false">
            <span class="dc-arsiv-kavram">${escapeHTML(ad)}</span>
            <span class="dc-arsiv-tarih">${escapeHTML(tarih)}</span>
          </button>
          <button class="dc-arsiv-sil" data-index="${gercekIndex}"
                  aria-label="${escapeHTML(t('dc.arsiv_sil', 'Bu çalışmayı sil'))}">✕</button>
        </div>
        ${ilk ? `<div class="dc-arsiv-metin">${escapeHTML(ilk)}</div>` : ''}
        <div class="dc-arsiv-detay" hidden></div>
      </div>`;
  }).join('');
  return `<div class="dc-arsiv">${satirlar}</div>`;
}

function _arsivBas() {
  const host = document.getElementById('dc-arsiv-host');
  if (!host) return;
  _arsivSesBirak();          // basım eski paneli yok eder; URL'i onunla bırak
  host.innerHTML = `
    <div class="dc-sec"><span class="dc-sec-label">${escapeHTML(t('dc.sec_arsiv', 'ÇALIŞILANLAR'))}</span></div>
    ${_arsivHTML()}`;

  host.querySelectorAll('.dc-arsiv-ac').forEach(btn => {
    btn.addEventListener('click', () => {
      const satir = btn.closest('.dc-arsiv-satir');
      const acikti = btn.getAttribute('aria-expanded') === 'true';
      /* Akordeon: tek defter açık kalır. İki panel yan yana açıkken arşiv bir
         defterden çok bir yığına dönüyor ve okunan kağıt gözden kaçıyor. */
      host.querySelectorAll('.dc-arsiv-satir').forEach(_arsivKapat);
      if (acikti) return;                    // ikinci tık kapatır
      const i = parseInt(btn.dataset.arsiv, 10);
      if (!isFinite(i)) return;
      let kayit = null;
      try { kayit = (dfGetWorksheetSessions() || [])[i]; } catch (_) {}
      if (kayit) _arsivAc(satir, kayit);
    });
  });

  host.querySelectorAll('.dc-arsiv-sil').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.index, 10);
      if (!isFinite(i)) return;
      /* Kağıt gidince sesi de gider. Blob cihazda (IndexedDB) kalırsa
         kullanıcının sildiği bir çalışmanın izi arkada yaşamaya devam eder —
         "sil" demek burada gerçekten silmektir. Kaydın kendisinden ÖNCE
         okunur; sonra kayıt gider ve `ses_id` bir daha bulunamaz. */
      try {
        const kayit = (dfGetWorksheetSessions() || [])[i];
        if (kayit && kayit.ses_id) idbDeleteRecording(kayit.ses_id).catch(() => {});
      } catch (_) {}
      try { dfDeleteWorksheetSession(i); } catch (_) {}
      _arsivBas();
    });
  });
}

/* ─── 12. ALAN ─── */

/* `lastRoom` yazılıyor ama okunmuyordu — alanın kendi yorumu "yeniden açılınca
   hatırlanır" diye bir vaat veriyordu ve kod onu tutmuyordu. İz sessizdir:
   kapıyı değiştirmez, sıralamayı bozmaz, yalnız en son nereye girdiğini
   hatırlatır. Ekran okuyucu da duysun diye sr-only satırı eşlik eder. */
function _roomCardHTML(room) {
  const son = !!(S._derinCalisma && S._derinCalisma.lastRoom === room.id);
  return `
    <button class="dc-room${son ? ' dc-room--son' : ''}" data-room="${escapeHTML(room.id)}">
      <svg class="dc-room-sigil" viewBox="0 0 100 100" aria-hidden="true" style="overflow:visible;">${room.sigil}</svg>
      <span class="dc-room-label">${escapeHTML(room.label())}</span>
      <span class="dc-room-sub">${escapeHTML(room.sub())}</span>
      ${son ? `<span class="sr-only">${escapeHTML(t('dc.room_son', 'En son burada çalıştın.'))}</span>` : ''}
    </button>`;
}

export function dcLoadView() {
  const host = document.getElementById('dc-body');
  if (!host) return;

  if (!S._derinCalisma) dcInit();
  /* Hattın geçici yüzey durumu (yükleniyor / çıkmadı) alanla birlikte
     sıfırlanır: kullanıcı alandan çıkıp döndüğünde bayat bir hata satırı
     karşılamaz. Hattın KENDİSİ 12'nin cache'inde durur, kaybolmaz. */
  _hatDurum = { yukleniyor: false, sebep: null, hat: null };

  host.innerHTML = `
    <div class="dc-intro">
      <div class="dc-intro-line">${escapeHTML(t('dc.intro',
        'Burada kitap okunmaz, çalışılır. Bir tezgâh seçelim ve kendimizden başlayalım.'))}</div>
    </div>

    <div id="dc-tezgah">${_tezgahHTML()}</div>

    <div id="dc-kozo"></div>

    <div id="dc-kazanma"></div>

    <div id="dc-odak"></div>

    <div id="dc-sefer"></div>

    <div class="dc-sec">
      <span class="dc-sec-label">${escapeHTML(t('dc.sec_odalar', 'ÇALIŞMA ODALARI'))}</span>
    </div>
    <div class="dc-rooms">
      ${DC_ROOMS.map(_roomCardHTML).join('')}
    </div>

    <div id="dc-hat"></div>

    <div id="dc-arsiv-host"></div>`;

  // Kavram kartı ve "en ince halka" önerisi — ikisi de kağıdı açar.
  host.querySelectorAll('[data-kavram]').forEach(btn => {
    btn.addEventListener('click', () => dcOpenKagit(btn.dataset.kavram));
  });

  /* Ko-Zo, Kazanma Yöntemi ve arşiv kendi host'larını basar (`_arsivBas`
     kalıbı): her biri kendi içinde tazelenir, alanın tamamı yeniden basılmaz —
     açık bir kağıt ya da yarım doldurulmuş bir form kullanıcının altından
     çekilmesin. */
  _kozoBas();
  _kazanmaBas(false);
  _odakBas(false);
  _seferBas();
  _hatBas();
  _arsivBas();

  /* Sefer durumu ağdan tazelenir — basım BEKLEMEZ: kart mevcut state'le
     hemen görünür, cevap gelince yerinde güncellenir. */
  _seferYukle();

  host.querySelectorAll('.dc-room').forEach(btn => {
    btn.addEventListener('click', () => {
      const room = DC_ROOMS.find(r => r.id === btn.dataset.room);
      if (!room) return;
      // gate:true olan odalar ileride buradan korunur; bugünkü dördü gate:false.
      if (room.gate && !dcGuardWork()) return;
      S._derinCalisma.lastRoom = room.id;
      dcSave();
      try { window.switchView?.(room.view); } catch (_) {}
    });
  });
}

/* Alanın tek açıcısı — oda kartı ve derin bağlantılar bunu çağırır.
   Kapı YOK: alan herkese açılır (önizleme), kilit çalışmadadır. */
export function dcOpen() {
  try { window.switchView?.('derincalisma'); } catch (_) {}
}

/* ─── 13. INIT (post-auth — SafeStorage hidrasyonundan sonra) ─── */

export function dcInit() {
  if (!S._derinCalisma) S._derinCalisma = _default();
  dcLoad();
  dcSyncRoomSub();
}

/* ─── 14. window expose (TDZ-güvenli; main.js import + init bağlar) ─── */
if (typeof window !== 'undefined') {
  window.dcInit               = dcInit;
  window.dcOpen               = dcOpen;
  window.dcLoadView           = dcLoadView;
  window.dcSyncRoomSub        = dcSyncRoomSub;
  window.dcRenderBugun        = dcRenderBugun;   // Bugün penceresi (2026-08-18)
  window.dcBugunKesit         = dcBugunKesit;
  window.dcIsMax              = dcIsMax;
  window.dcCanWork            = dcCanWork;
  window.dcGuardWork          = dcGuardWork;
  window.dcShowLock           = dcShowLock;
  window.dcOpenKagit          = dcOpenKagit;
  window.dcOnKagitMuhurlendi  = dcOnKagitMuhurlendi;   // 13b ckSeal köprüsü
  window.dcKozoListe          = dcKozoListe;
  window.dcKozoEkle           = dcKozoEkle;
  window.dcKozoToggle         = dcKozoToggle;
  window.dcKozoSil            = dcKozoSil;
  window.dcKazanmaListe       = dcKazanmaListe;
  window.dcKazanmaKaydet      = dcKazanmaKaydet;
  window.dcKazanmaSil         = dcKazanmaSil;
  window.dcOdakGet            = dcOdakGet;
  window.dcOdakKaydet         = dcOdakKaydet;
  window.dcOdakSil            = dcOdakSil;
  window.dcHatCikar           = dcHatCikar;
}
