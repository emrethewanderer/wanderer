/* ═══════════════════════════════════════════════════════════════════
   09e — YAŞAYAN PORTRE · "Emre'nin gözünden sen"
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     P1-P6 (09a) ham sinyal toplar; 13l ne YAPTIĞINI, 09d hangi
     ÖRÜNTÜLERİ tekrarladığını bilir. Ama hiçbiri birbirini görmez.
     Bu motor hepsini GÜNLÜK tek kanonik anlatıya damıtır: çekirdek
     mesele ("X çünkü Y" tanısı), dönüşüm yayı, değerler, çelişkiler,
     kör noktalar, kişi hikayeleri, ritüel ilişkisi. Kitabın tezi
     burada koda döner: "Mesele sensin" — motorun işi bunu GÖSTERMEK,
     dayatmamak (kör noktalar sohbete direkt basılmaz — Ayna Protokolü
     FAZ 3'te bunları nazikçe sorar).

   TEMBEL KONSOLİDASYON (09d omMaybeDistill kalıbı): günde bir, edge
     fn/cron YOK. Girdi: önceki portre + dünün gün özeti
     (S._narrativeMemory[0]) + P1/P5/P6 sinyal özeti + 13l kimlik
     bağlamı (window.imGetContext) + 09d örüntüleri
     (window.omGetTopPatterns) → callLLM (SUMMARY_MODEL, jsonMode,
     skipPersona) → doğrulanmış TAM sentez (replace, append değil) +
     changelog satırı.

   Kalıcılık: SafeStorage `etw_yp_dosya_<uid>` (user_analytics KV'sine
     otomatik senkron → reset/delete listeleri değişmeden kapsar).
   Konvansiyon: kimse bu modülü import etmez — tüm girişler window.yp*
     (09a/09c/03, TDZ-güvenli). Prompt metinleri p() (16b, admin'den
     düzenlenebilir); UI metinleri t() (15b, TR+EN).
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SUMMARY_MODEL } from '../config.js';
import { SafeStorage, localISODate } from './00a-infrastructure.js';
import { p } from './16-i18n-prompts.js';
import { callLLM } from './04-llm-hero-history.js';
import { kokenAlinti, kokenSozBlok, kokenAlintiCoz, kokenKullaniciSozleri, kokenKayitVar } from './13y-koken.js';

/* ── kanıt havuzu: modelin "kanit" alanını GERÇEK cümlelerden yazabilmesi
     için ham sözler prompt'a girer. Bu motor eskiden yalnız TÜREV veri
     görüyordu (gün özeti, kimlik özeti, örüntü özeti) ama ondan kullanıcının
     kendi cümlesini kanıt diye istiyordu — görmediği cümleyi ancak
     uydurabilirdi. Tavanlar günlük tek çağrının bütçesini korur. ── */
const SOZ_GUN = 7;
const SOZ_MAX = 14;
const SOZ_MAX_LEN = 180;

/* ── sabitler: dosya tavanları — KV satırı küçük kalsın ── */
const CHANGELOG_CAP = 30;
const DEGERLER_CAP = 8;
const CELISKI_CAP = 6;
const KORNOKTA_CAP = 6;
const KISI_CAP = 20;
const METAFOR_CAP = 5;
const KELIME_CAP = 10;

/* ── konsolidasyon sabitleri ──
   NOT (2026-08-02): burada bir `KORNOKTA_GUVEN_MIN = 0.55` vardı. Modelin
   kendi yazdığı `guven` sayısı bir köken DEĞİLDİR — ne kullanıcının beyanı,
   ne uygulamanın ölçümü, ne de kanıta bağlanmış bir yorumdur; kalibre
   edilmemiş bir öz-beyandır. O eşik ekranda hiç görünmüyordu; tek işlevi
   kanıtlı bir kör noktayı modelin keyfî `0.4`'ü yüzünden sessizce düşürmekti.
   Kör noktanın kapısı artık ALINTI: kanıtını gösteremeyen kör nokta yazılmaz. */
const TRIES_PER_DAY = 2;          // 429/parse hatasında günü hammering'den koru
const MIN_MSGS_FOR_FIRST_RUN = 3; // ilk konsolidasyon için asgari ömür boyu sinyal

const YP_KEY = (uid) => `etw_yp_dosya_${uid}`;

let _ypInited = false;
let _yp = null;
let _saveTimer = null;
let _consolidateBusy = false;

/* ════════════════════════════════════════════════════════════════════
   DURUM + KALICILIK
════════════════════════════════════════════════════════════════════ */
function ypDefault() {
  return {
    v: 1,
    cekirdek: { mesele: '', donusum_yayi: '' },
    degerler: [],
    celiskiler: [],
    kor_noktalar: [],
    dil_haritasi: { metaforlar: [], kelimeler: [], hitap: '' },
    kisiler: {},
    rituel_iliskisi: '',
    changelog: [],
    hipotezler: [],
    lastConsolidated: null,
    attempts: { day: null, count: 0 },
  };
}

function ypState() {
  if (!_yp) _yp = ypDefault();
  return _yp;
}

function _ypLoad() {
  const uid = S.currentUser?.id;
  if (!uid) return;
  try {
    const data = SafeStorage.get(YP_KEY(uid), null);
    if (data && typeof data === 'object' && data.v === 1) {
      _yp = Object.assign(ypDefault(), data);
      // Bozuk depoya tolerans: iskelet alanları güvence altına al
      if (!_yp.cekirdek || typeof _yp.cekirdek !== 'object') _yp.cekirdek = ypDefault().cekirdek;
      if (!Array.isArray(_yp.degerler)) _yp.degerler = [];
      if (!Array.isArray(_yp.celiskiler)) _yp.celiskiler = [];
      if (!Array.isArray(_yp.kor_noktalar)) _yp.kor_noktalar = [];
      if (!_yp.dil_haritasi || typeof _yp.dil_haritasi !== 'object') _yp.dil_haritasi = ypDefault().dil_haritasi;
      if (!_yp.kisiler || typeof _yp.kisiler !== 'object') _yp.kisiler = {};
      if (!Array.isArray(_yp.changelog)) _yp.changelog = [];
      if (!Array.isArray(_yp.hipotezler)) _yp.hipotezler = [];
      if (!_yp.attempts || typeof _yp.attempts !== 'object') _yp.attempts = { day: null, count: 0 };
    }
  } catch (e) { console.warn('ypLoad:', e?.message); }
}

function _ypSaveNow() {
  try {
    const uid = S.currentUser?.id;
    if (!uid || !_yp) return;
    _yp.changelog = _yp.changelog.slice(-CHANGELOG_CAP);
    _yp.degerler = _yp.degerler.slice(0, DEGERLER_CAP);
    _yp.celiskiler = _yp.celiskiler.slice(0, CELISKI_CAP);
    _yp.kor_noktalar = _yp.kor_noktalar.slice(0, KORNOKTA_CAP);
    const kisiEntries = Object.entries(_yp.kisiler);
    if (kisiEntries.length > KISI_CAP) _yp.kisiler = Object.fromEntries(kisiEntries.slice(-KISI_CAP));
    SafeStorage.set(YP_KEY(uid), _yp);
  } catch (_) {}
}

function ypSave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => { _saveTimer = null; _ypSaveNow(); }, 500);
}

/* Sekme gizlenirken bekleyen debounce varsa hemen yaz — 02c/00f kalıbı
   (iOS/Capacitor'da güvenilir tek sinyal hidden'dır; timer'ı sıfırlamak
   çift-kayıt penceresini kapatır). */
let _lifecycleFlushInstalled = false;
function _installLifecycleFlush() {
  if (_lifecycleFlushInstalled || typeof document === 'undefined') return;
  _lifecycleFlushInstalled = true;
  const flush = () => {
    if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; _ypSaveNow(); }
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  window.addEventListener('pagehide', flush);
}

/* ════════════════════════════════════════════════════════════════════
   KONSOLİDASYON GİRDİSİ — mevcut sinyalleri kompakt metne çevir
════════════════════════════════════════════════════════════════════ */
function _p1Digest() {
  try {
    const pm = S._personalityMap;
    if (!pm) return '-';
    const parts = [];
    if (pm.communication?.style && pm.communication.style !== 'unknown') {
      parts.push(`iletişim tarzı: ${pm.communication.style}`);
    }
    const topValues = (pm.values || []).slice().sort((a, b) => b.strength - a.strength).slice(0, 5);
    if (topValues.length) parts.push(`değerler: ${topValues.map(v => `${v.value}(${v.strength})`).join(', ')}`);
    if (pm.self_descriptions?.length) parts.push(`öz-tanımlar: "${pm.self_descriptions.slice(-5).join('", "')}"`);
    const topDef = (pm.defense_mechanisms || []).slice().sort((a, b) => b.count - a.count).slice(0, 3);
    if (topDef.length) parts.push(`savunmalar: ${topDef.map(d => `${d.type}(${d.count})`).join(', ')}`);
    return parts.join(' · ') || '-';
  } catch (_) { return '-'; }
}

function _p5Digest() {
  try {
    const rd = S._relationshipDepth;
    if (!rd || rd.total_messages < 3) return '-';
    return `güven ${rd.trust_score}, ittifak ${rd.alliance_strength}, açılma ${Math.round(rd.vulnerability_depth)}, kırılma anı ${rd.breakthroughs_count}`;
  } catch (_) { return '-'; }
}

function _p6Digest() {
  try {
    const lm = S._lifeMemory;
    if (!lm) return '-';
    const parts = [];
    /* Köken kapısı (09a ile aynı kural): portrenin girdisi de kanıtlı
       olandan kurulur. Damgasız bir yaşam gerçeği buradan geçseydi,
       günlük konsolidasyon onu "mesele"nin gerekçesine dönüştürebilirdi. */
    const people = Object.values(lm.people || {}).filter(pr => kokenKayitVar(pr) && pr.mention_count >= 2).slice(0, 8);
    if (people.length) {
      parts.push('kişiler: ' + people.map(pr =>
        `${pr.name}(${pr.role !== 'unknown' ? pr.role : '?'}${pr.notes?.length ? ', not: ' + pr.notes.slice(-2).join('; ') : ''})`
      ).join(' | '));
    }
    const openCount = (lm.openLoops || []).filter(l => kokenKayitVar(l) && l.status === 'open').length;
    if (openCount) parts.push(`açık döngü: ${openCount}`);
    const gercekler = (lm.lifeFacts || []).filter(kokenKayitVar);
    if (gercekler.length) parts.push(`gerçekler: ${gercekler.slice(-8).map(f => f.value).join(', ')}`);
    return parts.join(' · ') || '-';
  } catch (_) { return '-'; }
}

function _prevPortreDigest(st) {
  try {
    return JSON.stringify({
      mesele: st.cekirdek.mesele || '',
      yay: st.cekirdek.donusum_yayi || '',
      degerler: (st.degerler || []).map(d => d.deger),
      celiskiler: (st.celiskiler || []).map(c => c.metin),
      kisiler: Object.keys(st.kisiler || {}),
    });
  } catch (_) { return '{}'; }
}

/** Bugün henüz hiç sinyal yokken bile ilk konsolidasyon için ömür boyu asgari veri var mı. */
function _hasEnoughSignal(st) {
  if (S._narrativeMemory?.length) return true; // en az bir gün özeti üretilmiş
  return (S._personalityMap?.communication?.msg_lengths?.length || 0) >= MIN_MSGS_FOR_FIRST_RUN
    || !!st.cekirdek.mesele; // zaten bir portre varsa günlük tazeleme devam eder
}

/* ════════════════════════════════════════════════════════════════════
   LLM ÇIKTISI DOĞRULAMA — sapmayı portreye taşıma
════════════════════════════════════════════════════════════════════ */
function _parseConsolidation(raw, sozler, harita) {
  /** Maddenin kanıtını çözer. Model `kanit_ref` ile parmakla gösterir;
   *  metni BİZ kaynaktan keseriz. Bağlanamayan madde hiç doğmaz. */
  const _kanit = (o) => {
    const c = kokenAlintiCoz(o?.kanit_ref, o?.kanit, harita, sozler);
    return c ? c.alinti : '';
  };

  let obj = null;
  try { obj = JSON.parse(raw); } catch (_) {
    try { const m = String(raw).match(/\{[\s\S]*\}/); if (m) obj = JSON.parse(m[0]); } catch (_) {}
  }
  if (!obj || typeof obj !== 'object') return null;

  const mesele = typeof obj.mesele === 'string' ? obj.mesele.trim().slice(0, 200) : '';
  const donusum_yayi = typeof obj.donusum_yayi === 'string' ? obj.donusum_yayi.trim().slice(0, 200) : '';

  const degerler = (Array.isArray(obj.degerler) ? obj.degerler : [])
    .map(d => {
      if (!d || typeof d !== 'object') return null;
      const deger = String(d.deger || '').trim().slice(0, 60);
      if (!deger) return null;
      // Alıntı kapısı: kullanıcının ağzından çıkmamış bir "kanıt" değer taşımaz.
      const kanit = _kanit(d);
      if (!kanit) return null;
      return { deger, kanit };
    }).filter(Boolean).slice(0, DEGERLER_CAP);

  const celiskiler = (Array.isArray(obj.celiskiler) ? obj.celiskiler : [])
    .map(c => {
      if (!c || typeof c !== 'object') return null;
      const metin = String(c.metin || '').trim().slice(0, 160);
      if (!metin) return null;
      const kanit = _kanit(c);
      if (!kanit) return null;
      return { metin, kanit };
    }).filter(Boolean).slice(0, CELISKI_CAP);

  /* Kör nokta artık KANITLIDIR. Bu, portrenin en ağır iddiasıdır — kullanıcının
     kendi görmediği bir örüntüyü ona söyler — ve bugüne dek hiçbir alıntı
     kapısından geçmiyordu; tek bekçisi modelin kendi güven sayısıydı. Üstelik
     buradan Meclis'e suret taslağı (10p) ve Ayna'ya hipotez (09g) doğuyor:
     kanıtsız tek bir satır, kullanıcıya iki ayrı yerde "sen busun" diye
     dönüyordu. Kör noktanın kanıtı, kullanıcının o örüntüyü ele veren KENDİ
     cümlesidir; adlandırma modelin, cümle kullanıcınındır. */
  const kor_noktalar = (Array.isArray(obj.kor_noktalar) ? obj.kor_noktalar : [])
    .map(k => {
      if (!k || typeof k !== 'object') return null;
      const metin = String(k.metin || '').trim().slice(0, 160);
      if (!metin) return null;
      const kanit = _kanit(k);
      if (!kanit) return null;
      return { metin, kanit };
    }).filter(Boolean).slice(0, KORNOKTA_CAP);

  const dh = obj.dil_haritasi && typeof obj.dil_haritasi === 'object' ? obj.dil_haritasi : {};
  const dil_haritasi = {
    metaforlar: (Array.isArray(dh.metaforlar) ? dh.metaforlar : []).map(x => String(x).trim().slice(0, 60)).filter(Boolean).slice(0, METAFOR_CAP),
    kelimeler: (Array.isArray(dh.kelimeler) ? dh.kelimeler : []).map(x => String(x).trim().slice(0, 30)).filter(Boolean).slice(0, KELIME_CAP),
    hitap: typeof dh.hitap === 'string' ? dh.hitap.trim().slice(0, 30) : '',
  };

  /* Kişi adı uydurulamaz: ad ya kullanıcının kendi cümlelerinde geçer ya da
     yaşam hafızasında (09a) zaten kayıtlıdır. Tek kelimelik adlar alıntı
     kapısının token tabanına takılacağı için burada doğrudan aranır. */
  const _sozHavuz = (Array.isArray(sozler) ? sozler : []).join(' ').toLocaleLowerCase('tr');
  let _bilinenAdlar = new Set();
  try {
    _bilinenAdlar = new Set(Object.values(S._lifeMemory?.people || {})
      .map(x => String(x?.name || '').toLocaleLowerCase('tr').trim()).filter(Boolean));
  } catch (_) {}

  const kisiler = {};
  (Array.isArray(obj.kisiler) ? obj.kisiler : []).forEach(k => {
    if (!k || typeof k !== 'object' || !k.key) return;
    const key = String(k.key).toLocaleLowerCase('tr').trim().slice(0, 40);
    if (!key) return;
    if (!_bilinenAdlar.has(key) && !_sozHavuz.includes(key)) return; // uydurulmuş ad
    kisiler[key] = {
      hikaye: String(k.hikaye || '').trim().slice(0, 200),
      son_durum: String(k.son_durum || '').trim().slice(0, 100),
    };
  });

  const rituel_iliskisi = typeof obj.rituel_iliskisi === 'string' ? obj.rituel_iliskisi.trim().slice(0, 200) : '';
  const ne_ogrendim = typeof obj.ne_ogrendim === 'string' ? obj.ne_ogrendim.trim().slice(0, 160) : '';

  // Anlamlı içerik yoksa geçersiz say — sessiz atlanır, bir sonraki gün dener
  if (!mesele && !degerler.length && !ne_ogrendim) return null;

  return { mesele, donusum_yayi, degerler, celiskiler, kor_noktalar, dil_haritasi, kisiler, rituel_iliskisi, ne_ogrendim };
}

/** TAM sentez: LLM'in bugünkü okuması öncekinin yerine geçer (append değil) —
 *  09d'nin `distill.current` replace kalıbıyla aynı felsefe: portre "şu anki
 *  en iyi okuma", katman katman biriken çöp değil. */
function _mergeConsolidation(parsed) {
  const st = ypState();
  if (parsed.mesele) st.cekirdek.mesele = parsed.mesele;
  if (parsed.donusum_yayi) st.cekirdek.donusum_yayi = parsed.donusum_yayi;
  if (parsed.degerler.length) st.degerler = parsed.degerler;
  if (parsed.celiskiler.length) st.celiskiler = parsed.celiskiler;
  if (parsed.kor_noktalar.length) st.kor_noktalar = parsed.kor_noktalar;
  if (parsed.dil_haritasi.metaforlar.length || parsed.dil_haritasi.kelimeler.length || parsed.dil_haritasi.hitap) {
    st.dil_haritasi = parsed.dil_haritasi;
  }
  Object.entries(parsed.kisiler).forEach(([key, v]) => {
    st.kisiler[key] = { ...(st.kisiler[key] || {}), ...v };
  });
  if (parsed.rituel_iliskisi) st.rituel_iliskisi = parsed.rituel_iliskisi;
  if (parsed.ne_ogrendim) {
    st.changelog.push({ tarih: localISODate(), ne_ogrendim: parsed.ne_ogrendim });
  }
}

/* ════════════════════════════════════════════════════════════════════
   GÜNLÜK KONSOLİDASYON — 03 post-auth ready zincirinden (ehReady→ypInit)
════════════════════════════════════════════════════════════════════ */
/* KULLANICININ REDDETTİKLERİ (İç Çalışma 02 · boşluk E) — 09i beyan defteri.
   İki katman, çünkü tek katman yetmez:
     ① prompt'a "bir daha üretme" olarak girer (modele saygı),
     ② çıktıdan süzülür (modele güvenmemek zorunda kalmadan garanti).
   Model kuralı çiğnerse kullanıcı yine de aynı cümleyi görmez. */
function _reddedilenler(tur) {
  try { return window.secBeyanListe?.(tur) || []; } catch (_) { return []; }
}

function _reddedilenDigest() {
  const hepsi = [..._reddedilenler('portre-deger'), ..._reddedilenler('portre-celiski')];
  if (!hepsi.length) return '-';
  return hepsi.slice(0, 12).map((x) => `• ${x}`).join('\n');
}

/** Kullanıcının susturduğu bir maddeyi model yine üretirse burada düşer. */
export function _beyanSuz(parsed) {
  const susmus = (tur, metin) => {
    try {
      const id = window.secBeyanId?.(tur, metin);
      return id ? !!window.secBeyanVar?.(id) : false;
    } catch (_) { return false; }
  };
  if (Array.isArray(parsed.degerler)) {
    parsed.degerler = parsed.degerler.filter((d) => !susmus('portre-deger', d?.deger));
  }
  if (Array.isArray(parsed.celiskiler)) {
    parsed.celiskiler = parsed.celiskiler.filter((c) => !susmus('portre-celiski', c?.metin));
  }
  return parsed;
}

export async function ypMaybeConsolidate() {
  if (!_ypInited || !S.currentUser?.id || _consolidateBusy) return;
  const st = ypState();
  const today = localISODate();
  if (st.lastConsolidated === today) return; // günde bir

  if (st.attempts.day !== today) st.attempts = { day: today, count: 0 };
  if (st.attempts.count >= TRIES_PER_DAY) return;

  if (!_hasEnoughSignal(st)) return; // sinyal yok — sessizce bekle

  _consolidateBusy = true;
  st.attempts.count++;
  ypSave();
  try {
    const gunOzeti = S._narrativeMemory?.[0]?.note || '-';
    const kimlikOzet = (typeof window !== 'undefined' && window.imGetContext) ? (window.imGetContext() || '-') : '-';
    const oruntuOzet = (typeof window !== 'undefined' && window.omGetTopPatterns) ? (window.omGetTopPatterns(3) || '-') : '-';

    /* Kanıt havuzu — hem prompt'a girer hem çıktının kapısı olur (aynı liste).
       NUMARALI blok (2026-08-02): model artık kanıtı yazmak yerine `[S3]`
       diye gösterir; metni kaynaktan biz keseriz. Kapı böylece tahminden
       eşleştirmeye iner — bir eşiğe ihtiyaç kalmaz. */
    const sozler = kokenKullaniciSozleri(SOZ_GUN);
    const { blok: sozlerMetin, harita: sozHarita } =
      kokenSozBlok(sozler, { max: SOZ_MAX, maxLen: SOZ_MAX_LEN });

    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: p('prompt.yp.consolidate_user', {
        oncekiPortre: _prevPortreDigest(st),
        sonDegisiklikler: st.changelog.slice(-5).map(c => `${c.tarih}: ${c.ne_ogrendim}`).join('\n') || '-',
        gunOzeti,
        p1Ozet: _p1Digest(),
        p5Ozet: _p5Digest(),
        p6Ozet: _p6Digest(),
        kimlikOzet,
        oruntuOzet,
        sozler: sozlerMetin,
        reddedilenler: _reddedilenDigest(),
      }) }] }],
      systemPrompt: p('prompt.yp.consolidate_system'),
      maxTokens: 900, temperature: 0.3, jsonMode: true, model: SUMMARY_MODEL, skipPersona: true,
    });

    const parsed = _parseConsolidation(raw, sozler, sozHarita);
    // Gerçek anomali — prod'da warn düşer (vite pure), error telemetride kalır.
    if (!parsed) { console.error('ypMaybeConsolidate: geçersiz LLM çıktısı'); return; }

    _mergeConsolidation(_beyanSuz(parsed));
    st.lastConsolidated = today; // YALNIZ başarıda
    ypSave();
  } catch (e) {
    // 429 dahil — sessiz: kullanıcıya duvar yok, bir sonraki açılış dener
    console.warn('ypMaybeConsolidate:', e?.message);
  } finally { _consolidateBusy = false; }
}

/* ════════════════════════════════════════════════════════════════════
   OKUYUCULAR
════════════════════════════════════════════════════════════════════ */
/** Sohbet bağlamına eklenecek portre bölümü. Kör noktalar BİLİNÇLİ hariç —
 *  onlar Ayna Protokolü'nün (FAZ 3) nazikçe soracağı hipotez havuzudur;
 *  motor kullanıcıya doğrudan "kör noktan bu" demez. */
export function ypGetContext() {
  try {
    const st = ypState();
    if (!st.cekirdek.mesele && !st.degerler.length) return '';
    const parts = [p('prompt.yp.header')];
    if (st.cekirdek.mesele) parts.push(p('prompt.yp.mesele', { mesele: st.cekirdek.mesele }));
    if (st.cekirdek.donusum_yayi) parts.push(p('prompt.yp.donusum', { yay: st.cekirdek.donusum_yayi }));
    if (st.degerler.length) parts.push(p('prompt.yp.degerler', { list: st.degerler.map(d => d.deger).join(', ') }));
    if (st.celiskiler.length) parts.push(p('prompt.yp.celiskiler', { list: st.celiskiler.map(c => c.metin).join('; ') }));
    const kisiEntries = Object.values(st.kisiler).filter(k => k.hikaye);
    if (kisiEntries.length) parts.push(p('prompt.yp.kisiler', { list: kisiEntries.slice(0, 5).map(k => k.hikaye).join('; ') }));
    // dil_haritasi artık TÜKETİLİYOR — üretilip hiç okunmayan alandı (K5).
    // 'hitap' bilinçli dışarıda: hitap taklidi persona sesini bozar.
    const dh = st.dil_haritasi || {};
    if ((dh.metaforlar || []).length || (dh.kelimeler || []).length) {
      parts.push(p('prompt.yp.dil', {
        metaforlar: (dh.metaforlar || []).slice(0, 3).join(', ') || '-',
        kelimeler: (dh.kelimeler || []).slice(0, 5).join(', ') || '-',
      }));
    }
    if (st.rituel_iliskisi) parts.push(p('prompt.yp.rituel', { text: st.rituel_iliskisi }));
    return '\n' + parts.join('\n');
  } catch (_) { return ''; }
}

/** buildPersonalizationPrompt'un P1 self-desc satırını kısmak için —
 *  portre en az bir kez konsolide olduysa aynı sinyali daha zengin taşır. */
export function ypHasCore() {
  try { return !!ypState().cekirdek.mesele; } catch (_) { return false; }
}

/** Gün başı selam kartı için portre tabanlı ısıtma cümlesi (10-features-w2
 *  w2GetTodayGreetingText tüketir). donusum_yayi zaten ikinci-tekil doğal bir
 *  cümle olacak şekilde üretilir (bkz. prompt.yp.consolidate_system) — ayrı
 *  bir t()/p() şablonuna sarmaya gerek yok, doğrudan gösterilir. */
export function ypGetGreetingSeed() {
  try { return ypState().cekirdek.donusum_yayi || ''; } catch (_) { return ''; }
}

/** Geri Çağrı Motoru (13o) daveti için — çekirdek okumaya somut ithaf
 *  (09d'nin omGetGcLine kalıbıyla aynı ruh: dayatma değil, davet zemini). */
export function ypGetGcLine() {
  try {
    const st = ypState();
    if (!st.cekirdek.mesele) return null;
    return p('prompt.yp.gc_line', { mesele: st.cekirdek.mesele });
  } catch (_) { return null; }
}

/** Akşam Kapanış Töreni'nin (13h) yarına niyeti — kullanıcının kendi sözü
 *  LLM konsolidasyonu beklenmeden anında changelog'a işlenir (bir sonraki
 *  günün konsolidasyonuna da "son değişiklikler" olarak girdi olur). */
export function ypAddEveningIntentNote(txt) {
  try {
    const clean = String(txt || '').trim();
    if (!clean) return;
    const st = ypState();
    st.changelog.push({ tarih: localISODate(), ne_ogrendim: p('prompt.yp.evening_intent_note', { txt: clean.slice(0, 140) }) });
    ypSave();
  } catch (_) {}
}

/** 09c Emre'nin Hafızası paneli için tam durum (salt-okunur render). */
/** GERÇEKLİK TEMİZLİĞİ (13y · tek seferlik göç) — kanıta bağlanamayan portre
 *  maddelerini SİLER (Emre kararı 2026-08-01: arşivlenmez). Silmeden önce
 *  sayar; sayım 13y'nin raporuna girer.
 *
 *  Kapı canlı üretimdekiyle AYNI fonksiyondur (kokenAlinti) — iki ayrı ölçü
 *  olsaydı temizliğin kendisi yeni bir uydurma üretirdi.
 *
 *  Yanıtlanmış hipotez KORUNUR: kullanıcı "evet/hayır" dediyse o kayıt artık
 *  modelin yorumu değil, kullanıcının beyanıdır. */
export function ypKokenTemizlik(sozler) {
  const rapor = { deger: 0, celiski: 0, kisi: 0, kornokta: 0, hipotez: 0 };
  try {
    const st = ypState();
    const havuz = (Array.isArray(sozler) ? sozler : []).join(' ').toLocaleLowerCase('tr');

    const d0 = (st.degerler || []).length;
    st.degerler = (st.degerler || []).filter(x => kokenAlinti(x?.kanit, sozler));
    rapor.deger = d0 - st.degerler.length;

    const c0 = (st.celiskiler || []).length;
    st.celiskiler = (st.celiskiler || []).filter(x => kokenAlinti(x?.kanit, sozler));
    rapor.celiski = c0 - st.celiskiler.length;

    /* Kör noktalar (2026-08-02): eski kayıtlarda `kanit` alanı HİÇ yok —
       o dönemde kapı yalnız modelin `guven` sayısıydı. Kanıtsız olan
       kökensizdir ve silinir; Meclis sureti ile Ayna hipotezi bu satırlardan
       doğduğu için temizlik zincirin başını keser. */
    const kn0 = (st.kor_noktalar || []).length;
    st.kor_noktalar = (st.kor_noktalar || []).filter(x => kokenAlinti(x?.kanit, sozler));
    rapor.kornokta = kn0 - st.kor_noktalar.length;

    const kisiler = st.kisiler || {};
    const k0 = Object.keys(kisiler).length;
    const kalan = {};
    for (const [k, v] of Object.entries(kisiler)) if (k && havuz.includes(k)) kalan[k] = v;
    st.kisiler = kalan;
    rapor.kisi = k0 - Object.keys(kalan).length;

    const h0 = (st.hipotezler || []).length;
    st.hipotezler = (st.hipotezler || [])
      .filter(h => h && (h.durum !== 'aday' || (Array.isArray(h.kanit) && h.kanit.length)));
    rapor.hipotez = h0 - st.hipotezler.length;

    if (rapor.deger || rapor.celiski || rapor.kisi || rapor.hipotez) ypSave();
  } catch (_) {}
  return rapor;
}

export function ypGetFullState() {
  return ypState();
}

/** Panelden "Portreyi sıfırla" — kullanıcı yanlış aynayı reddeder,
 *  motor sıfırdan yeniden okumaya başlar (bir sonraki konsolidasyonda). */
export function ypResetPortre() {
  const uid = S.currentUser?.id;
  _yp = ypDefault();
  if (uid) SafeStorage.set(YP_KEY(uid), _yp);
}

/* ════════════════════════════════════════════════════════════════════
   HİPOTEZLER — Ayna Protokolü'nün (09g) yazdığı/okuduğu alan. Portre TEK
   kanonik dosya olduğu için 09g kendi içeriğini burada tutar, kendi
   SafeStorage anahtarını AÇMAZ (çift-yazan iki dosya riski olmasın).
════════════════════════════════════════════════════════════════════ */
export function ypGetHipotezler() {
  try { return ypState().hipotezler || []; } catch (_) { return []; }
}

/** 09g haftalık üretim sonunda TAM listeyi yazar (09e'nin diğer alanlarındaki
 *  "tam sentez" felsefesiyle tutarlı) — zaten yanıtlanmış (durum!=='aday')
 *  olanların korunması 09g'nin kendi birleştirme mantığındadır. */
export function ypSetHipotezler(list) {
  try {
    const st = ypState();
    st.hipotezler = Array.isArray(list) ? list.slice(0, 6) : [];
    ypSave();
  } catch (_) {}
}

/** Doğrulama/ret — durum değişince changelog'a da işlenir: reddedilen de
 *  bir öğrenmedir (yanlış modeli düzeltmek). */
export function ypUpdateHipotezDurum(id, durum) {
  try {
    const st = ypState();
    const h = (st.hipotezler || []).find((x) => x.id === id);
    if (!h || !['dogrulandi', 'reddedildi'].includes(durum)) return false;
    // Bir hipotez BİR KEZ yanıtlanır. Yazarın kendisi bunu güvence altına alır
    // ki hangi yol çağırırsa çağırsın (09h töreni, 09c paneli, 09a'nın seans-sonu
    // otomatik tespiti) ikinci ve ters bir karar changelog'a düşmesin.
    // Eski kayıtlarda durum alanı hiç olmayabilir — o da 'aday' sayılır.
    if (h.durum && h.durum !== 'aday') return false;
    h.durum = durum;
    if (durum === 'dogrulandi') {
      st.changelog.push({ tarih: localISODate(), ne_ogrendim: p('prompt.yp.changelog_confirmed', { metin: h.metin }) });
    } else {
      st.changelog.push({ tarih: localISODate(), ne_ogrendim: p('prompt.yp.changelog_rejected', { metin: h.metin }) });
    }
    ypSave();
    return true;
  } catch (_) { return false; }
}

/* ════════════════════════════════════════════════════════════════════
   INIT — 03-auth-shell ready zinciri: omReady→ehReady→ypInit (03:440-460)
════════════════════════════════════════════════════════════════════ */
export function ypInit() {
  if (_ypInited || !S.currentUser?.id) return;
  _ypLoad();
  _installLifecycleFlush();
  _ypInited = true;
  try { ypMaybeConsolidate(); } catch (_) {}
}

/* ── window expose (09a/09c buradan çağırır — import kenarı yok) ── */
if (typeof window !== 'undefined') {
  window.ypInit = ypInit;
  window.ypMaybeConsolidate = ypMaybeConsolidate;
  window.ypGetContext = ypGetContext;
  window.ypHasCore = ypHasCore;
  window.ypGetGreetingSeed = ypGetGreetingSeed;
  window.ypGetGcLine = ypGetGcLine;
  window.ypAddEveningIntentNote = ypAddEveningIntentNote;
  window.ypGetFullState = ypGetFullState;
  window.ypKokenTemizlik = ypKokenTemizlik;
  window.ypResetPortre = ypResetPortre;
  window.ypGetHipotezler = ypGetHipotezler;
  window.ypSetHipotezler = ypSetHipotezler;
  window.ypUpdateHipotezDurum = ypUpdateHipotezDurum;
}
