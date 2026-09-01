/* ═══════════════════════════════════════════════════════════════════
   13o — GERİ ÇAĞRI MOTORU · in-session re-engagement
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Kullanıcı sohbet ekranında yazdıktan sonra geri çekilirse, eskiden
     rastgele dört şablon cümleden biri ("Silence is also an answer…")
     düşerdi — kim olduğunu, ne konuştuğunuzu, neye ihtiyacı olduğunu
     bilmeden. Yeni motor Kişiselleştirme Motoru'nun (P1-P6) tamamını,
     bugünkü konuşmayı ve gerektiğinde önceki günleri okuyup TEK, kısa,
     kişisel bir davet üretir. "Mesele Sensin" — sessizliği bile o kişiye
     dönüş hattına çevirir.

   MEKANİK:
     • Tetik: chat-view aktif (llm-home değil) + son turdan bu yana
       GC_SILENCE_MS geçti + composer'da taslak yok + LLM stream yok +
       bu oturumda kullanıcı en az bir kez yazmış + son fire'dan ≥4 dk
       geçti + oturum başına tavan (2) aşılmamış.
     • Bağlam: buildPersonalizationPrompt('') (Portre/An/Kimlik + P1-P6 +
       Geçiş çalışması + Derinlik/Temeller) + bugünün son 6 turn'ü
       öncelikli; bugün < 2 user mesajıysa S.allSessions'tan en yeni
       önceki gün eklenir.
     • Çağrı: callLLM stream:false, max_tokens 120, temperature 0.85
       (server persona + kitap RAG ekler). Sonuç italik emre balonu
       olur, chat_history'ye persist edilir. messageCount'a SAYILMAZ;
       kota duvarına çarpsa sessiz susar.

   KOKEN-MUAF: bu dosyadaki `.kanit` okumaları LLM çıktısı DEĞİLDİR —
   `dgKapi`'nin döndürdüğü `kanit`, dgNabiz'in `_kanitKes`i tarafından
   kullanıcının KENDİ ham metninden cümle sınırında kesilip `kokenKirp`ten
   geçirilmiş bir ÖLÇÜMdür (13D K3). K3'ün aradığı kokenAlinti/kokenYorum
   kapısı LLM'in ÜRETTİĞİ kanıt iddiaları içindir (K5); bu dosyanın kendi
   `callLLM` çağrısı davet METNİNİ üretir, bir kanıt iddiası değil — ikisi
   hiç kesişmez (01-prompts-modes.js:321 aynı gerekçeyi taşır).

   Konvansiyon: hardcoded TR, modül öneki gc*, defensive try/catch,
   window.* hub'ı, localISODate (UTC kayması yok).
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { sb } from '../config.js';
import { localISODate } from './00a-infrastructure.js';
import { p } from './16-i18n-prompts.js';
import { callLLM } from './04-llm-hero-history.js';
import { buildPersonalizationPrompt } from './09a-personalization-engine.js';
import { appendMsg } from './06-summary-chat.js';

const _DEFAULT_SILENCE_MS = 150000;     // 2 dk 30 sn
const _COOLDOWN_MS        = 4 * 60000;  // iki fire arası en az 4 dk
const _PER_SESSION_CAP    = 2;
const _MAX_TODAY_TURNS    = 6;
const _MAX_OLDER_TURNS    = 4;
const _DAVET_WINDOW_MS    = 10 * 60000; // Tanıma Motoru (FAZ 2, İ3) — kapalı döngü ölçüm penceresi

function _silenceMs() {
  // Test/preview override: window.GC_SILENCE_MS
  const ov = (typeof window !== 'undefined') ? Number(window.GC_SILENCE_MS) : NaN;
  return Number.isFinite(ov) && ov >= 1000 ? ov : _DEFAULT_SILENCE_MS;
}

function _isChatActive() {
  const v = document.getElementById('chat-view');
  if (!v || !v.classList.contains('active')) return false;
  // llm-home landing'i sohbet akışı değildir
  if (v.classList.contains('llm-home')) return false;
  return true;
}

function _composerHasDraft() {
  const inp = document.getElementById('chat-input');
  return !!(inp && inp.value && inp.value.trim());
}

/** Beyan defterindeki kimliği (09i · FAZ 7). Kart değil bir DAVET olduğu
 *  için sabit: kullanıcı "beni böyle çağırma" dediğinde susan şey tek tek
 *  balonlar değil, bu sesin kendisidir. */
const GC_BEYAN_ID = 'gc-davet';

function _canFire() {
  if (!_isChatActive()) return false;
  // Beyan kapısı (Tanıma Motoru FAZ 7 · K7) — kullanıcı bu sesi susturduysa
  // kota, sessizlik ve sayaç kurallarına hiç bakılmaz: beyan hepsinin
  // üstündedir. Kullanıcı kararını "Neden bu?" panelinden geri alabilir.
  try { if (window.secBeyanVar?.(GC_BEYAN_ID)) return false; } catch (_) {}
  // Kriz gününde sessizlik daveti susar — sessizlik o gün kullanıcının hakkı;
  // davet mesajı kriz anında yanlış tını verir (Emniyet Katmanı · Faz 2).
  if (S._crisisDayKey && S._crisisDayKey === localISODate()) return false;
  if (S._crisisMsgLeft > 0) return false;
  if (S._llmStreaming) return false;
  if (_composerHasDraft()) return false;
  if (!S.currentUser?.id) return false;
  const userMsgs = (S.chatHistory || []).filter(m => m.role === 'user');
  if (!userMsgs.length) return false;
  const now = Date.now();
  if (S._gcLastFireMs && (now - S._gcLastFireMs) < _COOLDOWN_MS) return false;
  if (S.currentSessId && S._gcLastFireSessId === S.currentSessId) {
    if (Number(S._gcSessFires || 0) >= _PER_SESSION_CAP) return false;
  }
  return true;
}

/* ─── Bağlam montajı ─────────────────────────────────────────────────
   Bugünkü konuşma öncelikli — bugün cılızsa son aktivite günü eklenir.
*/
function _buildContextSnippet() {
  const today = localISODate();
  const all = S.chatHistory || [];

  const todayTurns = all.slice(-_MAX_TODAY_TURNS);
  const userCount = todayTurns.filter(m => m.role === 'user').length;

  let olderTurns = [];
  if (userCount < 2) {
    try {
      const flat = Object.values(S.allSessions || {}).flat()
        .filter(m => m && m.content && (m.role === 'user' || m.role === 'assistant') && m.created_at)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const seed = flat.find(m => localISODate(new Date(m.created_at)) !== today);
      if (seed) {
        const day = localISODate(new Date(seed.created_at));
        olderTurns = flat
          .filter(m => localISODate(new Date(m.created_at)) === day)
          .slice(0, _MAX_OLDER_TURNS)
          .reverse();
      }
    } catch (_) {}
  }

  const fmt = arr => arr.map(m => {
    const role = m.role === 'user' ? 'Kullanıcı' : 'Sen';
    const text = String(m.content || '').replace(/\s+/g, ' ').slice(0, 240);
    return `${role}: ${text}`;
  }).join('\n');

  const blocks = [];
  if (todayTurns.length) blocks.push('[BUGÜNÜN AKIŞI]\n' + fmt(todayTurns));
  if (olderTurns.length) blocks.push('[ÖNCEKİ GÜN — bugünün konusu cılız, geriye dön]\n' + fmt(olderTurns));
  return blocks.join('\n\n');
}

/* DUYGU MOTORU · DAVETİN KAPISI (13D K10, FAZ 19) — bu fazın kararı
   "hangi kelime" değil, **"sussun mu"**dur.

   Davet İSTENMEDEN gelir: kullanıcı bir şey sormadı, sustu. Bu yüzden
   `dgKapi`'nin kendi `davet` satırından geçer (iki tanık + dk90 tazeliği +
   ayrışma sustur) — `sohbet`in eşiksiz hattı burada YANLIŞ olurdu, çünkü
   o hat "bir sohbet yanıtı her turda bir şey söylemek ZORUNDADIR" diye
   eşiksizdir; davetin böyle bir zorunluluğu yoktur, sessizliği meşrudur.
   Okuma yoksa prompt bugünküyle BİT-BE-BİT aynı kalır.

   Yeni sözlük anahtarı AÇILMADI: sohbetin kullandığı kartuşların ta
   kendisi kullanılır (`prompt.dg.*`, 01-prompts-modes.js:~330). Aynı
   karşılamanın iki ayrı metni olsaydı ikisi zamanla ayrışırdı. */
/* Son davetin okuması — 10q'nun "Neden bu?" paneli bunu okur
   (`_nedenVeriDavet`), böylece davet KENDİ yüzeyinde gerekçesini ve
   kullanıcının kendi cümlesini gösterir. Modül kapsamında durur, kalıcı
   DEĞİL: davet anlıktır, balonu reload'da kaybolur — gerekçesi de onunla.
   Emsal: `window.omGunSatiri?.()` / `window.bslKanit?.()` (aynı panelin
   öteki iki kaynağı). */
let _dgSonOkuma = null;
export function gcDuyguOkuma() { return _dgSonOkuma; }

function _dgDavetBlogu() {
  _dgSonOkuma = null;
  try {
    const okuma = window.dgKapi?.('davet', {
      nabiz: S._dgNabiz || null,
      oncekiNabiz: S._dgOncekiNabiz || null,
      iklim: S._dgIklim || null,
      zaman: S._dgNabizZaman || null,
      akis: { yon: S._dgYay, gecmis: S._dgSonKarsilama },
      ayristi: _dgAyristiMi(),
    });
    if (!okuma || !okuma.eksen) return '';
    /* KRİZ BURADA KONUŞMAZ (K9). Kriz turunda `tutma` sohbetin işidir —
       Emniyet Katmanı zaten oradadır; sessizlik davetinin kriz cümlesi
       kurması, kullanıcının o an bakmadığı bir ekrandan güvenlik sözü
       vermek olurdu. Davet susar, sohbet konuşur. */
    if (okuma.eksen === 'tutma') return '';
    /* Kanıtsız okuma daveti giydirmez: sohbet K6 gereği kanıtsızlıkta
       tanıklığa düşebilir çünkü YANITLAMAK zorundadır; davetin böyle bir
       zorunluluğu yok (§6.10). `okuma.kanit` LLM çıktısı DEĞİL — gerekçe
       dosya başlığındaki KOKEN-MUAF satırında. */
    if (!okuma.kanit) return '';
    _dgSonOkuma = okuma;
    return [
      p('prompt.dg.eksen_satiri', { eksen: p('prompt.dg.eksen.' + okuma.eksen) }),
      p('prompt.dg.kanit_satiri', { kanit: okuma.kanit }),
      p('prompt.dg.kartus.' + okuma.eksen),
      p('prompt.dg.yasak'),
    ].filter(Boolean).join('\n');
  } catch (e) { console.warn('dgDavetBlogu:', e && e.message); return ''; }
}

/** Ayrışma kadranı — 09i'nin `_dgSeciciOkuma`'sıyla AYNI türetme (FAZ 18):
 *  modelin okuması uygulamanın kararıyla AYNI GÜN çelişti mi. Dünkü bir
 *  ayrışma bugünün davetini susturmaz. */
function _dgAyristiMi() {
  const son = S._dgIklim?.modelOkuma?.son || null;
  return !!(son && son.tarih === localISODate()
            && son.uygulama && son.model !== son.uygulama);
}

function _buildSystemPrompt() {
  let persona = '';
  try { persona = buildPersonalizationPrompt('') || ''; } catch (_) {}
  const snippet = _buildContextSnippet();
  // Yönlendirme sözlükte (16b) — canlı hâli admin "Emre'nin Sesi" odasından gelebilir.
  // [BAĞLAM] eki koşullu olduğu için kodda kalır (metin değil, veri montajı).
  let instruction = p('prompt.geri_cagri.instruction')
    + (snippet ? '\n\n[BAĞLAM]\n' + snippet : '');
  // Örüntü Motoru (09d) — bu haftanın damıtılmış örüntüsüne somut ithaf
  // (window.* — TDZ-güvenli, 09d import edilmez)
  try {
    const omLine = window.omGetGcLine?.();
    if (omLine) instruction += '\n\n' + omLine;
  } catch (_) {}
  // Yaşayan Portre (09e) — çekirdek okumaya somut ithaf (window.* — 09e import edilmez)
  try {
    const ypLine = window.ypGetGcLine?.();
    if (ypLine) instruction += '\n\n' + ypLine;
  } catch (_) {}
  /* Duygu Motoru (13D, FAZ 19) — 09d/09e ile AYNI kalıp: koşullu bir blok,
     kapıdan geçerse eklenir. DAMGA (K13, §6.10) burada basılır çünkü
     "teslim eden basar" ve teslim tam da bu satırdır: blok prompt'a
     GİRDİĞİNDE davet duyguyla konuşmuş olur. Düzeltme tarafı bu dosyada
     DEĞİL: davetin "Neden bu?" paneli 10q'dadır ve oradaki "Beni böyle
     çağırma" dalı `dgYanilmaDuzeltildi(…, 'davet')`i kendi basar (kadran 4). */
  const dgBlok = _dgDavetBlogu();
  if (dgBlok) {
    instruction += '\n\n' + dgBlok;
    if (S._dgIklim) {
      S._dgIklim = window.dgYanilmaKonustu?.(S._dgIklim, 'davet') || S._dgIklim;
      window.dgIklimKaydet?.(S._dgIklim);
    }
    /* İKİNCİ DEFTER (00f wtLogDuygu) — gerekçe kanalın kendi evinde
       (00f-kullanim-nabzi.js, `_DG_YUZEY`); kapı: 13D-iki-defter-kapisi. */
    try { window.wtLogDuygu?.(_dgSonOkuma?.eksen, { yuzey: 'davet', duzeltildi: false }); } catch (_) {}
  }
  return persona + '\n' + instruction;
}

/* ─── Çekirdek: zamanlama + tetikleme ─── */
export function gcCancel() {
  if (S._gcSilenceTimer) {
    clearTimeout(S._gcSilenceTimer);
    S._gcSilenceTimer = null;
  }
}

/** Tanıma Motoru (FAZ 2, İ3) — bekleyen bir balon varsa kapalı döngüyü
 *  şimdi çöz: pencere içindeysek 'cevap', pencere zaten dolmuşsa (geç gelen
 *  mesaj) hiçbir şey yazma — o zamanlayıcı kendi 'sessiz'ini çoktan yazmıştır.
 *  13-extras'ın mevcut sendMessageHooks.before gc iptal noktasından çağrılır
 *  (yeni hook YOK, K3 disiplini). */
export function gcResolvePending() {
  if (!S._gcPendingAt) return;
  const zamanindaMi = (Date.now() - S._gcPendingAt) <= _DAVET_WINDOW_MS;
  S._gcPendingAt = 0;
  if (zamanindaMi) { try { window.omKaydetDavetSonuc?.('cevap'); } catch (_) {} }
}

export function gcSchedule() {
  gcCancel();
  // Oturum değişti mi? per-session sayacı sıfırla
  if (S.currentSessId && S._gcLastFireSessId !== S.currentSessId) {
    S._gcLastFireSessId = S.currentSessId;
    S._gcSessFires = 0;
  }
  if (!_isChatActive()) return;
  S._gcSilenceTimer = setTimeout(() => { gcFire().catch(() => {}); }, _silenceMs());
}

export async function gcFire() {
  S._gcSilenceTimer = null;
  if (!_canFire()) return;

  // Sayaçları önden tüket — kota duvarında bile döngüye girmesin
  S._gcLastFireMs = Date.now();
  S._gcLastFireSessId = S.currentSessId || S._gcLastFireSessId;
  S._gcSessFires = Number(S._gcSessFires || 0) + 1;

  let text = '';
  try {
    text = await callLLM({
      contents: [],
      systemPrompt: _buildSystemPrompt(),
      maxTokens: 120,
      temperature: 0.85,
      stream: false,
    });
  } catch (_) {
    // Kota duvarı / ağ — sessizce sus; sayaç yandı, kısa süre tekrar denemez
    return;
  }

  text = String(text || '').trim();
  if (!text) return;
  // Olası protokol kalıntılarını sıyır — etiket adı Türkçe yazıma toleranslı
  // (model [TAKİP]/[ARAÇ:]/[KAĞIT] yazabiliyor; bkz. 13a RE_TAG)
  text = text.replace(/\[(?:ARA[CÇ]|KA[GĞ][IİÎıiî]T|TAK[IİÎıiî]P)[\s\S]*$/i, '').trim();
  // LLM bazen "_" kapamayı bize bırakır — biz zaten italikliyoruz
  text = text.replace(/^_+|_+$/g, '').trim();
  if (!text) return;

  // Yine sahnede miyiz? Kullanıcı bu süre içinde yazmaya başlamış olabilir
  if (!_isChatActive() || S._llmStreaming || _composerHasDraft()) return;

  const display = `_${text}_`;
  let balon = null;
  try { balon = appendMsg('emre', display, 'mode-direct gc-reengage'); } catch (_) {}
  try { window.fxCue?.('recall'); } catch (_) {}

  // "Neden bu?" (Tanıma Motoru FAZ 7 · İ10) — balonun gerekçesi sorulabilir
  // olmalı: bu ses kullanıcının sessizliğinden doğdu, o ölçümü ondan
  // saklamanın bir gerekçesi yok. Giriş düğmesini 10q'nun köprüsünden
  // alırız (K7 kapısı orada tek yerde); paneli de o açar — 13o kart
  // motorunu import etmez. Balon reload'da kaybolur, düğme de onunla:
  // davet anlıktır, kalıcı bir yüzey değildir.
  /* Bu balonun KENDİ okuması (FAZ 19 dikiş turu). `_dgSonOkuma` modül
     kapsamındadır ve her davette yeniden yazılır; oturum başına iki davet
     düşebildiği için (`_PER_SESSION_CAP`) kullanıcı YUKARI kaydırıp
     birinci balonun panelini açtığında ikincinin alıntısını görebilirdi —
     o balon için yanlış bir gerekçe, üstelik kullanıcının kendi cümlesiyle
     kurulmuş bir yanlış (§6.10). Panel açılmadan önce okuma bu balonunkine
     geri sarılır. */
  const _balonOkumasi = _dgSonOkuma;
  try {
    const giris = window.kkNedenGirisHTML?.('geri-cagri', GC_BEYAN_ID);
    const govde = balon && balon.querySelector('.msg-content');
    if (giris && govde) {
      govde.insertAdjacentHTML('beforeend', giris);
      govde.querySelector('[data-neden]')?.addEventListener('click', (ev) => {
        ev.stopPropagation();
        _dgSonOkuma = _balonOkumasi;
        try { window.kkNedenAc?.('geri-cagri', GC_BEYAN_ID); } catch (_) {}
      });
    }
  } catch (_) {}

  // Tanıma Motoru (FAZ 2, İ3) — kapalı döngü: balon düştü, şimdi bekliyoruz.
  // Pencere içinde bir mesaj gelirse gcResolvePending 'cevap' yazar (13-extras'ın
  // mevcut sendMessageHooks.before gc iptal noktasından); gelmezse bu zamanlayıcı
  // kendi 'sessiz'ini yazar. `firedAt` karşılaştırması: araya YENİ bir fire girmişse
  // (ya da cevap zaten okunduysa) eski zamanlayıcı sessizce düşer — çift sayım yok.
  const firedAt = Date.now();
  S._gcPendingAt = firedAt;
  setTimeout(() => {
    if (S._gcPendingAt !== firedAt) return;
    S._gcPendingAt = 0;
    try { window.omKaydetDavetSonuc?.('sessiz'); } catch (_) {}
  }, _DAVET_WINDOW_MS);

  S.chatHistory.push({ role: 'assistant', content: text, mode: 'mode-direct' });
  if (S.currentSessId) {
    S.allSessions[S.currentSessId] = S.allSessions[S.currentSessId] || [];
    S.allSessions[S.currentSessId].push({
      role: 'assistant', content: text, created_at: new Date().toISOString(),
    });
    try {
      sb.from('chat_history').insert([{
        user_id:    S.currentUser.id,
        session_id: S.currentSessId,
        role:       'assistant',
        content:    text,
      }]).then(({ error }) => { if (error) console.warn('[gc] persist:', error.message); });
    } catch (_) {}
  }
}

/* ─── İnce CSS aksanı: re-engagement balonunu altın bir kenar damarıyla
   ayır — italik metnin solunda 2px altın akış. */
function _injectStyles() {
  if (document.getElementById('gc-reengage-style')) return;
  const st = document.createElement('style');
  st.id = 'gc-reengage-style';
  st.textContent =
    '.message.emre.gc-reengage .msg-line { background: linear-gradient(180deg, rgba(245,166,35,.55), rgba(245,166,35,0)); }\n' +
    '.message.emre.gc-reengage .msg-content { opacity: .92; }';
  document.head.appendChild(st);
}

function _gcBoot() { _injectStyles(); }

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _gcBoot);
} else {
  _gcBoot();
}

/* Inline + cross-module köprüsü */
window.gcSchedule = gcSchedule;
window.gcCancel   = gcCancel;
window.gcFire     = gcFire;
window.gcResolvePending = gcResolvePending;
window.gcDuyguOkuma = gcDuyguOkuma;   // 10q "Neden bu?" paneli (FAZ 19)
