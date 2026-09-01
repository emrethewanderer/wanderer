/* ═══════════════════════════════════════════════════════════════════
   09g — AYNA PROTOKOLÜ · "Bir şey fark ettim, yanılıyor olabilirim"
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     09e'nin "kör noktaları" (kor_noktalar) birer İDDİA'dır — henüz
     doğrulanmamış bir okuma. Bu motor haftada bir bu iddiaları 13l'in
     GERÇEK DAVRANIŞ defteriyle çapraz kontrol eder, en sağlam en fazla
     3'ünü HİPOTEZ olarak öne çıkarır ve Emre'nin sohbette nazikçe,
     dayatmadan sormasını sağlar. "Kendinden iyi tanıma" iddiası ancak
     DOĞRULANMIŞ içgörüyle kurulur — reddedilen hipotez de veridir
     (yanlış modeli düzeltir, kör nokta olarak geri gelmez).

   TEMBEL HAFTALIK ÜRETİM (09d omMaybeDistill kalıbı, edge fn/cron YOK):
     portre (09e: kor_noktalar + celiskiler + cekirdek) + 13l kimlik
     bağlamı (davranış kanıtı) → callLLM (SUMMARY_MODEL, jsonMode,
     skipPersona, ~800 token) → en fazla 3 hipotez. Kaynaklar [K1]/[C1]
     etiketiyle girer, model `dayanak` ile hangisine yaslandığını gösterir;
     kanıt olarak o kaynağın GERÇEK kullanıcı cümlesi devralınır.
     Dayanaksız hipotez budanır (modelin kendi güven sayısı kapı DEĞİLDİR).
     Sonuç 09e'nin yp dosyasına YAZILIR (window.ypSetHipotezler) — tek
     kanonik dosya ilkesi korunur; 09g yalnız kendi üretim meta'sını tutar.

   SUNUM: sohbette <mirror_hypothesis> bölümü (01), haftada ≤2 tüketim
     (apGetHintContext — omConsumeFreshHint deseninin haftada-2 hâli).
     DOĞRULAMA: kullanıcının yanıtı personalizationDeepAnalysis'in (09a)
     seans-sonu JSON'undaki mirror_response alanından okunur — bunun için
     bu modül "bu seansta hangi hipotez gösterildi"yi apGetLastShownHint
     ile bellekte tutar (kalıcı değil, oturum ömürlü yeter). Ayna Anı
     töreni (09h, FAZ 4) aynı hipotez havuzunu görsel olarak sunar.

   Kalıcılık: kendi küçük meta'sı `etw_ap_meta_<uid>` (lastWeek/attempts/
     hintWeek/hintCount); hipotez İÇERİĞİ 09e'nin yp dosyasında yaşar.
   Konvansiyon: kimse import etmez — window.ap* (01/09a/09c/03,
     TDZ-güvenli). Prompt metinleri p() (16b, admin'den düzenlenebilir).
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SUMMARY_MODEL } from '../config.js';
import { SafeStorage, localISODate } from './00a-infrastructure.js';
import { p } from './16-i18n-prompts.js';
import { callLLM } from './04-llm-hero-history.js';
import { omWeekKey } from './09d-oruntu-motoru.js';

const AP_KEY = (uid) => `etw_ap_meta_${uid}`;

const HYPOTHESIS_CAP = 3;
/* NOT (2026-08-02): burada `HYPOTHESIS_GUVEN_MIN = 0.6` vardı ve gerekçesi
   "09e'nin barından bilinçli yüksek, çünkü bu doğrudan sorulacak" idi. Gerekçe
   doğru, ölçü yanlıştı: modelin kendi yazdığı güven sayısı kalibre edilmemiş
   bir öz-beyandır — uydurulmuş bir hipoteze 0.9, doğru bir hipoteze 0.4
   yazabilir. Sahte bir sayıyı yükseltmek kapıyı sertleştirmez, yalnız kaybı
   artırır. Bu hipotez kullanıcıya DOĞRUDAN sorulduğu için kapısı da gerçek
   olmalı: dayanağını kullanıcının kendi cümlesine bağlayamayan hipotez
   sorulmaz (bkz. _parseHypotheses · dayanak). */
const TRIES_PER_DAY = 2;
const HINT_MAX_PER_WEEK = 2;

let _apInited = false;
let _ap = null;
let _busy = false;
let _lastShownHint = null; // { id, metin } — oturum ömürlü, kalıcı değil

/* ════════════════════════════════════════════════════════════════════
   DURUM + KALICILIK
════════════════════════════════════════════════════════════════════ */
function _default() {
  return { lastWeek: null, attempts: { day: null, count: 0 }, hintWeek: null, hintCount: 0 };
}

function apState() {
  if (!_ap) _ap = _default();
  return _ap;
}

function _apLoad() {
  const uid = S.currentUser?.id;
  if (!uid) return;
  try {
    const data = SafeStorage.get(AP_KEY(uid), null);
    if (data && typeof data === 'object') {
      _ap = Object.assign(_default(), data);
      if (!_ap.attempts || typeof _ap.attempts !== 'object') _ap.attempts = { day: null, count: 0 };
    }
  } catch (e) { console.warn('apLoad:', e?.message); }
}

function apSave() {
  try {
    const uid = S.currentUser?.id;
    if (!uid || !_ap) return;
    SafeStorage.set(AP_KEY(uid), _ap);
  } catch (_) {}
}

function _norm(s) {
  return String(s || '').toLocaleLowerCase('tr').replace(/\s+/g, ' ').trim();
}

/* ════════════════════════════════════════════════════════════════════
   LLM ÇIKTISI DOĞRULAMA + MEVCUT HİPOTEZLERLE BİRLEŞTİRME
════════════════════════════════════════════════════════════════════ */
/** Modelin gösterdiği dayanak etiketini ([K1]/[C2]) kaynağın GERÇEK
 *  alıntısına çevirir. Etiket süslenmiş gelebilir; biçim yüzünden doğru
 *  bir dayanağı düşürmek, kapıyı sertleştirmez yalnız kaybı artırır. */
function _dayanakCoz(d, kaynaklar) {
  const m = String(d == null ? '' : d).toUpperCase().match(/([KC])\s*(\d+)/);
  return m ? (kaynaklar[`${m[1]}${m[2]}`] || '') : '';
}

function _parseHypotheses(raw, existing, kaynaklar) {
  let obj = null;
  try { obj = JSON.parse(raw); } catch (_) {
    try { const m = String(raw).match(/\{[\s\S]*\}/); if (m) obj = JSON.parse(m[0]); } catch (_) {}
  }
  if (!obj || !Array.isArray(obj.hipotezler)) return null;

  const existingByText = new Map((existing || []).map((h) => [_norm(h.metin), h]));
  const out = [];
  for (const h of obj.hipotezler) {
    if (!h || typeof h !== 'object') continue;
    const metin = String(h.metin || '').trim().slice(0, 200);
    if (!metin) continue;
    const key = _norm(metin);
    const prev = existingByText.get(key);
    // Zaten yanıtlanmış (doğrulandı/reddedildi) bir hipotez aynen korunur —
    // LLM'in "aday"a geri döndürmesi engellenir.
    if (prev && prev.durum !== 'aday') { out.push(prev); continue; }

    /* Kanıt artık DEVRALINIR, yazılmaz. Model hangi kör noktaya/çelişkiye
       dayandığını gösterir ([K1]/[C2]); biz o kaynağın 09e'de zaten kesin
       alıntı kapısından geçmiş GERÇEK cümlesini hipoteze taşırız. Eskiden
       burada modelin kendi gerekçesi ("kimlik defterinde 3 kez kaçınma")
       kanıt sayılıyor ve 09h'de kullanıcıya "kanıt" etiketiyle GÖSTERİLİYORDU
       — kullanıcı onu kendi verisi sanıyordu. Dayanaksız hipotez sorulmaz:
       kullanıcıya "seni böyle görüyorum" diyen bir cümle, dayanağını
       gösteremiyorsa yargıdır ve bu mimaride yargı veri değildir. */
    const kanit = (Array.isArray(h.dayanak) ? h.dayanak : [])
      .map((d) => _dayanakCoz(d, kaynaklar)).filter(Boolean).slice(0, 3);
    if (!kanit.length) continue;
    out.push({ id: prev?.id || `ap-${Date.now()}-${out.length}`, metin, kanit, durum: 'aday' });
  }
  return out.slice(0, HYPOTHESIS_CAP);
}

/* ════════════════════════════════════════════════════════════════════
   HAFTALIK ÜRETİM — 03 post-auth ready zincirinden (ypReady→apInit)
════════════════════════════════════════════════════════════════════ */
export async function apMaybeGenerate() {
  if (!_apInited || !S.currentUser?.id || _busy) return;
  const st = apState();
  const wk = omWeekKey();
  if (st.lastWeek === wk) return; // haftada bir

  const today = localISODate();
  if (st.attempts.day !== today) st.attempts = { day: today, count: 0 };
  if (st.attempts.count >= TRIES_PER_DAY) return;

  const yp = (typeof window !== 'undefined' && window.ypGetFullState) ? window.ypGetFullState() : null;
  if (!yp) return;

  /* Yalnız KANITLI kaynaklar hipotez doğurabilir. 09e artık kör noktayı da
     alıntıya bağlıyor; kanıtsız eski kayıtlar (13y temizliği henüz koşmamış
     olabilir) buraya girmez — zincirin başı temiz değilse sonu da olmaz. */
  /* KOKEN-MUAF: kanıt 09e portresinden okunur ve ORADA kesin alıntı kapısından
     geçmiştir (kokenAlintiCoz). Burada ikinci kez ölçmek zararlı olurdu: portre
     maddesi aylar öncesine dayanabilir, buradaki havuz ise 7 günlüktür — geçerli
     bir kanıtı yalnız eskidiği için düşürürdük. Kanıtsız ESKİ satırların
     temizliği 13y'nin bir yıllık penceresine aittir (kokenTemizlik). */
  const korList = (yp.kor_noktalar || []).filter((k) => k?.metin && k?.kanit);
  const celList = (yp.celiskiler || []).filter((c) => c?.metin && c?.kanit);
  if (!korList.length && !celList.length) return; // sinyal yok

  const kaynaklar = {};
  korList.forEach((k, i) => { kaynaklar[`K${i + 1}`] = k.kanit; });
  celList.forEach((c, i) => { kaynaklar[`C${i + 1}`] = c.kanit; });

  _busy = true;
  st.attempts.count++;
  apSave();
  try {
    const kimlikOzet = (typeof window !== 'undefined' && window.imGetContext) ? (window.imGetContext() || '-') : '-';
    const existing = (typeof window !== 'undefined' && window.ypGetHipotezler) ? (window.ypGetHipotezler() || []) : [];

    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: p('prompt.ayna.generate_user', {
        korNoktalar: korList.map((k, i) => `[K${i + 1}] ${k.metin} — kullanıcının sözü: "${k.kanit}"`).join('\n') || '-',
        celiskiler: celList.map((c, i) => `[C${i + 1}] ${c.metin} — kullanıcının sözü: "${c.kanit}"`).join('\n') || '-',
        mesele: yp.cekirdek?.mesele || '-',
        kimlikOzet,
        mevcutHipotezler: existing.map((h) => h.metin).join('; ') || '-',
      }) }] }],
      systemPrompt: p('prompt.ayna.generate_system'),
      maxTokens: 800, temperature: 0.3, jsonMode: true, model: SUMMARY_MODEL, skipPersona: true,
    });

    const parsed = _parseHypotheses(raw, existing, kaynaklar);
    // Gerçek anomali — prod'da warn düşer (vite pure), error telemetride kalır.
    if (!parsed) { console.error('apMaybeGenerate: geçersiz LLM çıktısı'); return; }

    if (typeof window !== 'undefined') window.ypSetHipotezler?.(parsed);
    st.lastWeek = wk; // YALNIZ başarıda
    apSave();
  } catch (e) {
    // 429 dahil — sessiz: kullanıcıya duvar yok, bir sonraki açılış dener
    console.warn('apMaybeGenerate:', e?.message);
  } finally { _busy = false; }
}

/* ════════════════════════════════════════════════════════════════════
   SOHBET SUNUMU — haftada ≤2 tüketim
════════════════════════════════════════════════════════════════════ */
/** Sohbete eklenecek <mirror_hypothesis> bölümü — bir 'aday' hipotezi
 *  gösterir, en fazla haftada 2 kez.
 *
 *  SÖZLEŞME: `{ metin, muhurle() } | null` döner. Kotayı harcamak ve "bu
 *  hipotez soruldu" damgasını basmak ÜRETİMDE değil TESLİMDE olur — çağıran,
 *  metni gerçekten LLM'e gönderip yanıt aldıktan sonra `muhurle()` çağırır.
 *
 *  NEDEN: damga eskiden burada basılıyordu. İptal edilen, hata veren ya da
 *  bütçesi bu bölümü atan bir turda kullanıcı soruyu HİÇ görmediği hâlde
 *  haftalık kota harcanıyor ve 09a'nın seans-sonu analizi o soruya verilmiş
 *  sahte bir onay/ret çıkarıp portrenin changelog'una "Doğruladın: …" diye
 *  yazabiliyordu. Teslim edilmeyen söz, verilmiş sayılmaz. */
export function apGetHintContext() {
  try {
    if (!_apInited) return null;
    const st = apState();
    const wk = omWeekKey();
    if (st.hintWeek !== wk) { st.hintWeek = wk; st.hintCount = 0; }
    if (st.hintCount >= HINT_MAX_PER_WEEK) return null;

    const hipotezler = (typeof window !== 'undefined' && window.ypGetHipotezler) ? (window.ypGetHipotezler() || []) : [];
    const candidate = hipotezler.find((h) => h.durum === 'aday');
    if (!candidate) return null;

    let _muhurlendi = false;
    return {
      metin: p('prompt.ayna.hint', { metin: candidate.metin }),
      muhurle() {
        if (_muhurlendi) return false;       // aynı tur iki kez sayılmaz
        _muhurlendi = true;
        try {
          const s = apState();
          const w = omWeekKey();
          if (s.hintWeek !== w) { s.hintWeek = w; s.hintCount = 0; }
          if (s.hintCount >= HINT_MAX_PER_WEEK) return false;
          s.hintCount++;
          apSave();
          _lastShownHint = { id: candidate.id, metin: candidate.metin };
          return true;
        } catch (_) { return false; }
      },
    };
  } catch (_) { return null; }
}

/** Bu oturumda gösterilmiş hipotez var mı — 09a personalizationDeepAnalysis
 *  bu bilgiyi kullanarak kullanıcının yanıtını doğrulama/ret olarak okur. */
export function apGetLastShownHint() {
  return _lastShownHint;
}

/** Durum güncelle — hem 09a'nın otomatik tespiti hem (FAZ 4) Ayna Anı
 *  töreninin elle onayı buradan geçer. Gerçek yazma 09e'nin yp dosyasında. */
export function apResolveHypothesis(id, durum) {
  if (!['dogrulandi', 'reddedildi'].includes(durum)) return false;
  const ok = (typeof window !== 'undefined' && window.ypUpdateHipotezDurum) ? !!window.ypUpdateHipotezDurum(id, durum) : false;
  if (ok && _lastShownHint?.id === id) _lastShownHint = null; // yanıtlandı, tekrar sorulmasın
  return ok;
}

/* ════════════════════════════════════════════════════════════════════
   INIT — 03-auth-shell ready zinciri: ypReady→apInit (09e'den sonra)
════════════════════════════════════════════════════════════════════ */
export function apInit() {
  if (_apInited || !S.currentUser?.id) return;
  _apLoad();
  _apInited = true;
  try { apMaybeGenerate(); } catch (_) {}
}

/* ── window expose (01/09a/09c buradan çağırır — import kenarı yok) ── */
if (typeof window !== 'undefined') {
  window.apInit = apInit;
  window.apMaybeGenerate = apMaybeGenerate;
  window.apGetHintContext = apGetHintContext;
  window.apGetLastShownHint = apGetLastShownHint;
  window.apResolveHypothesis = apResolveHypothesis;
}
