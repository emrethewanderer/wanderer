/* ═══════════════════════════════════════════════════════
   09j — HATIRLA · "Aklımda tut dediğin durur"
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Bir uygulamanın "seni hatırlıyorum" demesi ucuzdur; hatırladığını
     KANITLAMASI pahalıdır. Character.ai'ın çöküşünde en sık tekrarlanan
     şikâyet buydu — vaat söyleniyor, yirmi mesaj sonra tutulmuyordu.
     Wanderer'ın cevabı yeni bir motor değil, dizginin yer değiştirmesi:
     neyin unutulmayacağına kullanıcı karar verir.
     Bu yüzden pinlenebilen tek şey KULLANICININ KENDİ SÖZÜDÜR. Modelin
     bir cümlesi mühürlenseydi hatırlanan şey bir YORUM olurdu ve köken
     kullanıcıdan kopardı (§6.10 Gerçeklik Kuralı). Beyan eşiksizdir:
     kanıt cümlenin kendisidir, ölçülmez, yorumlanmaz. Mesele Sensin —
     hatırlanan da senin sözün.

   MEKANİK / MİMARİ / TEK GİRİŞ:
     Kullanıcı mesajının şeridindeki tek buton (06 buildUserMsgFooterHTML
     → htPinToggle) sözü mühürler. Kimlik metnin kendisinden türer
     (_kimlik) — DB id'sine bağlanmaz, çünkü henüz kaydedilmemiş bir söz
     de pinlenebilir ve reload'dan sonra aynı cümle aynı kimliği taşımalı.
     Pinli sözler her turda bağlama girer (01 → <pinned_declarations>) ve
     09f'nin embed havuzuna da düşer; FAZ 3'te numaralı söz havuzunun
     ilk maddeleri olurlar (13y kokenSozBlok).
     Beyan geri alınabilir: aynı buton ya da 09c panelindeki bölüm.
   Kalıcılık: SafeStorage per-uid (etw_hatirla_v1_<uid>)
   Konvansiyon: i18n t()/p(); window.ht* expose; panel bölümü 09c'de
═══════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage, showToast, localISODate, escapeHTML } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { p } from './16-i18n-prompts.js';
import { msgRawText } from './06-summary-chat.js';
import { kokenSozBlok, kokenAlintiCoz, kokenKullaniciSozleri } from './13y-koken.js';

/* ─── 1. SABİTLER ─── */

const HT_KEY = (uid) => `etw_hatirla_v1_${uid}`;
/* Tavan bir ölçüm değil bir tören sınırıdır: her şeyi mühürlemek hiçbir
   şeyi mühürlememektir. On söz, bir sohbet turunun bütçesinde de rahat
   durur (kısa satırlar, _CONTEXT_BUDGETS'ta kırpılmaya muhtaç değil). */
const HT_TAVAN = 10;
const HT_METIN_TAVAN = 400;   // bir sözün bağlama giren azami uzunluğu
/* Havuzun boyu: model sekiz numaralı sözü rahat tarar, on beşte seçim
   gürültüye döner ve bağlamın payı da büyür. Sekiz slotun altısı mühürlülere
   AYRILIR: tavan tek başına uygulansaydı on pinli bir kullanıcıda portre
   kanıtları ve son günlerin sözleri havuza hiç giremezdi — ve tersine, pinli
   listesi uzayınca en eskiler sessizce düşerdi. (Mühürlülerin TAMAMI zaten
   <pinned_declarations> bölümünde ayrıca gider; buradaki pay yalnız ALINTI
   gösterimi içindir.) */
const HT_HAVUZ_TAVAN = 8;
const HT_HAVUZ_PIN_PAYI = 6;
const HT_HAVUZ_GUN = 14;      // ham söz havuzunun geriye bakış penceresi

let _liste = null;            // [{ id, text, dayKey, ts }] — bellek aynası

/* ─── 2. KALICILIK ─── */

function _uid() { return S.currentUser?.id || 'anon'; }

function _yukle() {
  if (_liste) return _liste;
  try {
    const ham = SafeStorage.get(HT_KEY(_uid()), null);
    _liste = Array.isArray(ham) ? ham.filter(x => x && x.id && x.text) : [];
  } catch (_) { _liste = []; }
  return _liste;
}

function _yaz() {
  try { SafeStorage.set(HT_KEY(_uid()), _liste || []); }
  catch (e) { console.warn('htYaz:', e && e.message); }
}

/* Kimlik metinden türer: aynı cümle her zaman aynı kimliği alır. DB id'si
   kullanılamaz — kullanıcı mesajı kaydedilmeden de (kuyruk yolu, 06) pin
   edilebilmeli ve reload sonrası buton kendini pinli tanımalı. */
function _kimlik(text) {
  const s = (text || '').trim().slice(0, HT_METIN_TAVAN);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return 'h' + (h >>> 0).toString(36) + s.length.toString(36);
}

/* ─── 3. GENEL API ─── */

/** Post-auth hidrasyon (03-auth-shell zinciri). Yalnız listeyi ısıtır. */
export function htInit() {
  _liste = null;
  _yukle();
}

export function htPinliMi(text) {
  if (!text) return false;
  const id = _kimlik(text);
  return _yukle().some(x => x.id === id);
}

export function htListe() {
  return _yukle().slice();
}

export function htUnpin(id) {
  const l = _yukle();
  const i = l.findIndex(x => x.id === id);
  if (i < 0) return false;
  l.splice(i, 1);
  _yaz();
  _butonlariTazele();
  return true;
}

/** Şerit butonu — sözü mühürler ya da mührü geri alır. */
export function htPinToggle(btn) {
  const text = (msgRawText(btn) || '').trim();
  if (!text) return;
  const id = _kimlik(text);
  const l = _yukle();
  const i = l.findIndex(x => x.id === id);

  if (i >= 0) {
    l.splice(i, 1);
    _yaz();
    showToast(t('toast.ht.unpinned', 'Çıkardım.'));
  } else {
    if (l.length >= HT_TAVAN) {
      showToast(t('toast.ht.full', 'Aklımda tuttuklarım doldu — birini çıkarınca yenisi girer.'), true);
      return;
    }
    l.unshift({ id, text: text.slice(0, HT_METIN_TAVAN), dayKey: localISODate(), ts: Date.now() });
    _yaz();
    showToast(t('toast.ht.pinned', 'Aklımda.'));
    /* Mühürlenen söz anlamsal havuza da girer: kullanıcı aylar sonra aynı
       konuya dokunduğunda 09f onu geri getirebilsin. Modül yoksa sessizce
       düşer — pin yine çalışır (asla bloklama). */
    try { window.ehIngestMoment?.(text, { kind: 'beyan', source: 'hatirla' }); } catch (_) {}
    try { window.fxCue?.('seal'); } catch (_) {}
  }
  _butonlariTazele();
}

/** Prompt bölümü (01 → <pinned_declarations>). Boşsa '' — token israfı yok. */
export function htBaglamBloku() {
  const l = _yukle();
  if (!l.length) return '';
  return p('prompt.hatirla.header') + '\n' +
    l.map(x => `• [${x.dayKey}] "${x.text}"`).join('\n');
}

/* ─── 4. SÖZ HAVUZU · "alıntıyı model yazmaz, gösterir" ─── */

/* Alıntının doğruluğu bir eşikle değil EŞLEŞTİRMEYLE kurulur (13y, Emre'nin
   2026-08-02 kararı): prompta numaralı bir söz bloğu girer ([S1] "…"), model
   yalnız `[S3]` diye parmakla gösterir, metni uygulama KAYNAKTAN keser.
   Böylece modelin "hatırladım" demesi ile gerçekten hatırlaması arasındaki
   fark ortadan kalkar — uydurma alıntı yapısal olarak imkânsızdır.
   Havuzun sırası bir öncelik beyanıdır: önce kullanıcının mühürledikleri,
   sonra portrenin dayandığı cümleler, sonra son günlerin sözleri. */
function _havuzSozleri() {
  const out = [];
  const ekle = (t) => {
    const s = (t || '').trim();
    if (s && !out.includes(s)) out.push(s);
  };

  _yukle().slice(0, HT_HAVUZ_PIN_PAYI).forEach(x => ekle(x.text));   // 1. mühürlüler (en yeniler)

  try {                                                      // 2. portre kanıtları
    const yp = window.ypGetFullState?.();
    (yp?.degerler || []).forEach(d => ekle(d.kanit));
    (yp?.celiskiler || []).forEach(c => ekle(c.kanit));
  } catch (_) {}

  /* 3. son günlerin sözleri — en YENİDEN eskiye. Burada 09f'nin anlamsal
     geri-getirmesi (ehRecall) KULLANILMAZ, bilinçli: ehRecall ağ bağımlı ve
     async'tir, üstelik ham cümle değil başlıklandırılmış metin döndürür —
     kokenSozBlok'un numaralandıracağı şey ise kullanıcının kesilmemiş
     cümlesi olmak zorunda. Anlamsal hatırlama zaten <recalled_memories>
     kanalından gidiyor; burası ALINTI havuzudur, arama motoru değil. */
  try {
    kokenKullaniciSozleri(HT_HAVUZ_GUN).slice().reverse().forEach(ekle);
  } catch (_) {}

  return out.slice(0, HT_HAVUZ_TAVAN);
}

/** Prompt bloğu + çözüm haritası. Havuz boşsa null — bölüm hiç doğmaz. */
export function htSozHavuzu() {
  const sozler = _havuzSozleri();
  if (!sozler.length) return null;
  const { blok, harita } = kokenSozBlok(sozler, { max: HT_HAVUZ_TAVAN });
  return {
    metin: p('prompt.hatirla.havuz_header') + '\n' + blok,
    harita, sozler,
  };
}

/* Modelin metnindeki `[S3]` işaretleri. Model biçimi bozabilir (`(S3)`,
   `[s3]`, `[S3, S5]`) — sözleşmeyi biçim yüzünden kırmak, doğru bir kanıtı
   noktalama yüzünden düşürmek olurdu (13y `_refNorm` aynı gerekçeyle
   toleranslıdır). Çözülemeyen referans metinden SESSİZCE silinir: ekranda
   ham etiket bırakmak, uygulamanın iç konuşmasını kullanıcıya sızdırmaktır. */
const _REF_DESEN = /[\[(]\s*[Ss]\s*(\d{1,2})\s*[\])]/g;

/** Yanıttan alıntı referanslarını ayıklar → { text, alintilar[] }. */
export function htAlintiAyikla(metin, harita, sozler) {
  const ham = String(metin == null ? '' : metin);
  if (!ham || !harita) return { text: ham, alintilar: [] };

  const alintilar = [];
  const text = ham.replace(_REF_DESEN, (tam, no) => {
    const coz = kokenAlintiCoz('S' + no, '', harita, sozler);
    if (!coz || !coz.alinti) return '';
    if (!alintilar.some(a => a.alinti === coz.alinti)) {
      alintilar.push({ ref: coz.ref || ('S' + no), alinti: coz.alinti, gun: _gunBul(coz.alinti) });
    }
    return '';
  }).replace(/[ \t]{2,}/g, ' ').replace(/ +([,.;:!?])/g, '$1').trim();

  return { text: text || ham.trim(), alintilar };
}

/* Alıntının günü: mühürlü sözlerde beyanın günü, değilse boş. Tarih
   UYDURULMAZ — kaynağı belirsiz bir gün kanıtı güçlendirmez, zayıflatır.
   Eşleştirme baştan yapılır çünkü 13y alıntıyı kırpabilir (SOZ_BLOK_MAX_LEN);
   birden fazla mühürlü söz aynı başlangıcı taşıyorsa gün GÖSTERİLMEZ —
   iki adaydan birini seçmek, bilinmeyeni bilinir gibi göstermek olurdu. */
function _gunBul(alinti) {
  const a = (alinti || '').trim();
  if (!a) return '';
  const adaylar = _yukle().filter(x => x.text === a || x.text.startsWith(a) || a.startsWith(x.text));
  return adaylar.length === 1 ? (adaylar[0].dayKey || '') : '';
}

/** Alıntı bloğunun HTML'i — balonun içine, yanıtın üstüne girer. */
export function htAlintiHTML(alintilar) {
  const list = Array.isArray(alintilar) ? alintilar : [];
  if (!list.length) return '';
  return `<div class="ht-alinti-kume">` + list.map(a => {
    const gun = a.gun ? `<span class="ht-alinti-gun">${escapeHTML(a.gun)}</span>` : '';
    return `<blockquote class="ht-alinti">${gun}` +
           `<span class="ht-alinti-soz">${escapeHTML(a.alinti)}</span></blockquote>`;
  }).join('') + `</div>`;
}

/* ─── 5. DOM TAZELEME ─── */

/* Şeritteki butonlar HTML olarak basılır (06), durumu sonradan buradan
   güncellenir: aynı söz ekranda birden fazla balonda olabilir ve panelden
   yapılan bir kaldırma da butonu etkiler. */
function _butonlariTazele() {
  try {
    document.querySelectorAll('.message.user .fb-btn[data-ht]').forEach(b => {
      const pinli = htPinliMi(b.closest('.message')?._rawText || '');
      b.setAttribute('aria-pressed', pinli ? 'true' : 'false');
      const ad = pinli ? t('chat.unpin', 'Aklından çıkar') : t('chat.pin', 'Bunu unutma');
      b.setAttribute('title', ad);
      b.setAttribute('aria-label', ad);
    });
  } catch (_) {}
}

/* ─── 6. KÖPRÜ ─── */

if (typeof window !== 'undefined') {
  window.htInit       = htInit;
  window.htPinToggle  = htPinToggle;
  window.htPinliMi    = htPinliMi;
  window.htListe      = htListe;
  window.htUnpin      = htUnpin;
  window.htBaglamBloku = htBaglamBloku;
  window.htSozHavuzu   = htSozHavuzu;
  window.htAlintiAyikla = htAlintiAyikla;
  window.htAlintiHTML  = htAlintiHTML;
}
