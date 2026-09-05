/* ═══════════════════════════════════════════════════════════════════
   10B — SOHBET KÖPRÜSÜ (eski: İLHAM KARTI) · Sohbet → Atölye chip'i
   ───────────────────────────────────────────────────────────────────
   FELSEFE: "Mesele Sensin."
   2026-06-21 — KAVRAMSAL BİRLEŞME: "İlham Kartı" diye anılan ayrı
   yaratım sahnesi 10A "Geçiş Kartım" iki-kutuplu omurgasına gömüldü.
   Sohbet'te dokunan bir cümlenin ARKASINDAKİ karta dokununca 10A'nın
   Atölye'sine geçilir (source:'sohbet'). Tek kart, tek koleksiyon,
   tek dil — kaynak meta'da yaşar.

   Bu dosyada geriye yalnız ŞUNLAR kalır:
     • ilhamRumuz()              — anonim wanderer rumuzu (10C feed +
                                    10A paylaşımı bunu kullanır;
                                    sunucu ikizi: mig 025 wanderer_rumuz)
     • _messageSuggestsPerson()  — sohbet mesajı "bir kişi tarif eden"
                                    cins bir mesaj mı? (chip eşiği)
     • _extractKartTag()         — modelin [KART: tohum] etiketi (13a
                                    protokol ailesi; persona'ya eklenmesi
                                    ELLE — SETUP-GECIS-KARTIM.md §4).
                                    Etiket varsa cue'suz KESİN chip.
     • _excerptForDisplay()      — Emre mesajından EKRAN alıntısı (kısa)
     • _chatContextForSeed()     — kullanıcının son sözleri; modele giden
                                    bağlamın kökeni (mesajın TAMAMI ile
                                    birlikte gkOnboard opts'unda gider)
     • _onEmreMessageFinalized  — startStreamingFinalizeHooks listener:
                                    eşik geçilirse SESSİZ ocağı yakar
     • _armCardFrame()          — arka planda gkDesignForChat; tasarım
                                    tuttuysa mesajın ARKASINDA kart
                                    çerçevesi (.ik-kart) + köşe sigili
                                    belirir → gkOnboard(display,
                                    {source:'sohbet', preDesigned})

   2.0 (2026-07-02): cue listesi sıkılaştı (güçlü kalıp YA DA ≥2 zayıf
   ipucu), seans-başına en çok 2 chip, chip metinleri t()'de. CSS'ler
   statik eve taşındı (css/parts/sosyal.css) — stil enjeksiyonu YOK.

   3.0 (2026-08-02) — DAVET, ANCAK DEMİR TUTTUYSA GELİR (Emre'nin kararı):
   Altın CTA chip'i KALKTI. Artık mesaj biter bitmez kart arka planda
   sessizce tasarlanır; tasarım kurulamazsa kullanıcı HİÇBİR ŞEY görmez.
   Kurulduysa mesajın arkasında belli belirsiz bir kart çizgisi belirir
   (altın↔lapis shimmer) ve tıklanabilir olur — Atölye ağ beklemeden
   dolu açılır. Gerekçe: uygulama tutamayacağı sözü vermez (§6.2);
   eski akışta LLM düşünce sahte bir kart ("Olunan Kişi" + kullanıcının
   kesik cümlesi) gerçekmiş gibi sunuluyordu.
   Modele giden bağlam da bütünlendi: mesajın TAMAMI + kullanıcının kendi
   son sözleri + hafızası (10A _userContextFull).

   Eski exports (emptyIlhamKarti / _commitDraftToCard / _isSealed /
   _normalizeDesign / ilhamGetContext / ilhamGetBlendedTargets /
   ilhamShare / ilhamUnshare / ilhamOpenAtolye / ilhamOpenDetail /
   ilhamMiniCard / loadKendiKoleksiyonumView) artık YOK. Bunların
   yerini 10A modülündeki gkShare/gkUnshare/gkGetContext/
   gkCompletedCount/gkOpenCollection/loadKendiKoleksiyonumView alır.

   DB tablosu `ilham_kartlari` ve RPC `paylasilan_kart_kopyala`
   legacy kalır (artık yazılmaz/çağrılmaz); paylaşım `paylasilan_kartlar`
   tablosuna kind:'ilham' olarak (enum geri uyum) iner — 10A.gkShare bunu yapar.
   ═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { etiketCoz, etiketRegex } from './13a1-arac-etiketleri.js';
import { t } from './15-i18n.js';
// Yukarıdaki import 13a1'edir, 13a'ya DEĞİL: 13a'yı statik almak
// 13a→06-summary-chat/13-extras→03-auth-shell→10B döngüsünü kapatır.
// 13a1 hiçbir şey import etmeyen SAF YAPRAKTIR, o yüzden bu bağ döngü
// doğurmaz ve "protokol blokları DAİMA sıyrılır" sözleşmesi çalışma
// zamanına değil DERLEME zamanına bağlanır (FAZ 9 denetimi).

/* ══════════════════════════════════════════════════════════════
   ANONİM RUMUZ — sabit, user_id türevli (paylaşımda gerçek ad yok)
   10C feed ve 10A paylaşımı bu rumuzu çağırır.
══════════════════════════════════════════════════════════════ */
const _GEZGIN_RENKLERI = [
  '#F5A623','#F7C744','#5A8AD8','#7FA6E4','#2D5FA8',
  '#C9A24B','#EAE2D6','#F0D9A8','#CBD8F0','#B8953C',
];
function _seedHash(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
export function ilhamRumuz() {
  if (S._ilhamRumuz) return S._ilhamRumuz;
  const uid = S.currentUser?.id || 'anon';
  const h = _seedHash(uid);
  const tag = h.toString(36).toUpperCase().slice(0, 4);
  const color = _GEZGIN_RENKLERI[h % _GEZGIN_RENKLERI.length];
  S._ilhamRumuz = { name: 'GEZGİN_' + tag, color };
  return S._ilhamRumuz;
}

/* ══════════════════════════════════════════════════════════════
   CHAT KANCASI — Emre balonu altında altın CTA chip
   ───────────────────────────────────────────────────────────
   Chip HER mesaja değil, yalnız bir KİŞİ/karakter/oluş tarif eden
   mesajlara düşer. TR \b tuzağına düşmemek için substring eşleşmesi
   (lowercase tr-locale).
══════════════════════════════════════════════════════════════ */
/* Güçlü kalıplar — tek başına yeter ("böyle bir kişi", "bir kişi düşün"…).
   Zayıf ipuçları — tek başına YETMEZ; en az iki farklı ipucu gerekir.
   (2.0 sıkılaştırması: eski düz liste 'olmak'/'biri' gibi tek kelimelerle
   neredeyse her Emre mesajında chip düşürüyordu — chip değersizleşiyordu.) */
const _IK_STRONG_CUES = [
  'böyle bir kişi', 'böyle bir insan', 'şöyle bir kişi', 'şöyle bir insan',
  'böyle biri', 'o kişi', 'kişi düşün', 'insan düşün',
  'biri haline gel', 'kişi olabilirsin',
];
const _IK_WEAK_CUES = [
  'kişi', 'biri', 'insan', 'karakter', 'olmak', 'gibi ol', 'dönüş',
];
export function _messageSuggestsPerson(text) {
  const t = String(text || '').toLocaleLowerCase('tr');
  if (!t) return false;
  if (_IK_STRONG_CUES.some(cue => t.includes(cue))) return true;
  let hits = 0;
  for (const cue of _IK_WEAK_CUES) {
    if (t.includes(cue)) hits++;
    if (hits >= 2) return true;
  }
  return false;
}

/* ── [KART] protokol etiketi (13a registry'sinin tüketicisi) ──────────
   Model, kartlaşmaya değer bir kişi tarif ettiğinde mesajın sonuna
   `[KART: 8-15 kelimelik tohum]` ekler (persona güncellemesi ELLE —
   SETUP-GECIS-KARTIM.md §4). Etiket görünür metinden gizlenir, chip
   KESİN düşer. Persona güncellenmediyse etiket hiç gelmez → cue
   fallback çalışır; iki katman birlikte yaşar.
   Regex artık 13a'nın registry'sinde tutulur (İç Çalışma 09 · K5) — bu
   ikizin bir kopyası burada YAZILMAZ; seed üretimi (boşluk normalizasyonu,
   min. 3 karakter) de registry'nin `kart` kaydında birebir korunur. */
export function _extractKartTag(rawText) {
  const hit = etiketCoz('kart', rawText);
  return hit ? { seed: hit.seed, tag: hit.tag } : null;
}

/** Emre mesajından GÖSTERİM alıntısı — Atölye'nin "SOHBETTEKİ AN" satırında
 *  görünen kısa hâl (ilk birkaç cümle, max ~280 char).
 *  DİKKAT: bu metin artık modele giden tohum DEĞİLDİR — model mesajın
 *  tamamını `opts.fullText` ile alır (kesik cevaptan kişi kurulamıyordu).
 *  Ekran kısa kalır çünkü `emptyKart.ihtiyac` 280 char'la saklanır. */
export function _excerptForDisplay(rawText, maxLen = 280) {
  const t = String(rawText || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const m = t.split(/(?<=[.!?…])\s+/).filter(Boolean);
  let out = '';
  for (const s of m) {
    if ((out + ' ' + s).trim().length > maxLen) break;
    out = (out + ' ' + s).trim();
    if (out.length >= 120) break;
  }
  return out || t.slice(0, maxLen);
}

/** Sohbetin son dönüşü — kullanıcının SON 2 mesajı.
 *  NEDEN: Emre'nin mesajı bir CEVAPtır. Soruyu görmeden "bu kişi kim"
 *  kurulamaz; model yalnız cevabın yarısını görünce dört boyuttan
 *  yalnız birini doldurabiliyordu. Kullanıcının kendi cümlesi — beyan —
 *  kartın kökenidir (§6.10). */
export function _chatContextForSeed(maxLen = 900) {
  try {
    const hist = Array.isArray(S.chatHistory) ? S.chatHistory : [];
    const mine = hist.filter(m => m?.role === 'user' && String(m.content || '').trim());
    if (!mine.length) return '';
    return mine.slice(-2)
      .map(m => String(m.content).replace(/\s+/g, ' ').trim())
      .join('\n---\n')
      .slice(0, maxLen);
  } catch (_) { return ''; }
}

/** 06-summary-chat → startStreamingFinalizeHooks listener.
 *  Mesaj biter, eşik geçilirse ocak SESSİZCE yanar: kart arka planda
 *  tasarlanır ve ancak tasarım tuttuysa mesajın arkasında çerçeve belirir.
 *  Kullanıcı tutulamayacak bir vaat görmez (Emre'nin kararı, 2026-08-02).
 *  [KART] etiketi varsa etiket gizlenir ve eşik kesin geçilir. */
/* Seans başına en çok 2 SESSİZ TASARIM — sayaç artık chip değil OCAK sayar:
   her deneme kullanıcı tıklamasa da kotadan yer (13m). Ad da öyle olur
   (§4.3 ad senkronu: sayaç chip saymıyorsa chip demez). */
const IK_DESIGN_MAX_PER_SESSION = 2;
let _ikDesignCount = 0;

export function _onEmreMessageFinalized(msgEl, rawText) {
  try {
    if (!msgEl || msgEl._ikKartArmed) return;
    const txt = String(rawText || '').trim();
    if (!txt) return;
    if (msgEl.classList.contains('streaming')) return;
    if (msgEl.dataset.llmError === '1') return;

    const kartTag = _extractKartTag(txt);
    const body = msgEl.querySelector('.msg-body');
    if (!body) return;

    // Etiket görünür metinden her koşulda temizlenir (protokol artığı kalmasın)
    const _kartRe = etiketRegex('kart');
    if (kartTag && _kartRe) {
      try {
        body.innerHTML = body.innerHTML.replace(_kartRe, '').trim();
      } catch (_) {}
    }

    if (!kartTag) {
      if (txt.length < 60) return;              // cue yolu: çok kısa mesajda ocak yanmaz
      if (!_messageSuggestsPerson(txt)) return;
    }
    if (_ikDesignCount >= IK_DESIGN_MAX_PER_SESSION) return;
    msgEl._ikKartArmed = true;
    _ikDesignCount++;

    // Ekranda kısa alıntı, modele mesajın TAMAMI + sohbetin son dönüşü.
    const clean = _kartRe ? txt.replace(_kartRe, '').trim() : txt.trim();
    const display = kartTag ? kartTag.seed : _excerptForDisplay(clean);
    const seedCtx = {
      source: 'sohbet',
      fullText: clean.slice(0, 4000),
      chatContext: _chatContextForSeed(),
    };
    // await YOK — sohbet akışı ocağı beklemez; çerçeve hazır olunca gelir.
    _armCardFrame(msgEl, body, display, seedCtx);
  } catch (e) { console.warn('ilham kart eşiği:', e?.message); }
}

/** Sessiz ocak → çerçeve. Tasarım kurulursa mesajın arkasında kart çizgisi
 *  belirir ve tıklanabilir olur; kurulamazsa HİÇBİR ŞEY olmaz — sohbet hiç
 *  kesilmemiş gibi akar. */
async function _armCardFrame(msgEl, body, display, ctx) {
  let design = null;
  try { design = await window.gkDesignForChat?.(display, ctx); }
  catch (e) { console.warn('ik kart tasarımı:', e?.message); }
  if (!design) return;                                  // demir tutmadı → davet yok
  if (!msgEl.isConnected || !body.isConnected) return;   // mesaj DOM'dan gitti

  const open = () => {
    try { window.gkOnboard?.(display, { ...ctx, preDesigned: design }); }
    catch (e) { console.warn('ik kart→gkOnboard:', e?.message); }
  };

  body.classList.add('ik-kart');

  /* Klavye ve ekran okuyucu yolu KÖŞE SİGİLİNDEDİR: .msg-body'ye
     role="button" konsaydı ekran okuyucu mesajın tamamını düğme adı diye
     okur, metnin kendisi kaybolurdu. */
  const sigil = document.createElement('button');
  sigil.className = 'ik-kart-sigil';
  sigil.type = 'button';
  sigil.setAttribute('aria-label', t('ik.kart_aria', 'Bu anın kartını aç'));
  sigil.innerHTML =
    '<span class="ik-kart-sigil-mark" aria-hidden="true">✦</span>' +
    '<span class="ik-kart-sigil-arrow" aria-hidden="true">→</span>';
  sigil.addEventListener('click', (e) => { e.stopPropagation(); open(); });
  body.appendChild(sigil);

  body.addEventListener('click', (e) => {
    // Mesaj içi bağlantı/düğme kendi işini yapar
    if (e.target?.closest?.('a, button, input, textarea, select, label')) return;
    // Kullanıcı alıntı kopyalıyor olabilir — seçim varken kart açılmaz
    try {
      const sel = window.getSelection?.();
      if (sel && !sel.isCollapsed) return;
    } catch (_) {}
    open();
  });

  // Nazik beliriş — çerçeve akışa girmez (::before), sayfa zıplamaz
  requestAnimationFrame(() => { try { body.classList.add('ik-kart-in'); } catch (_) {} });
}

/* ══════════════════════════════════════════════════════════════
   BOOT — yalnız: rumuz expose + sohbet chip hook'u
   (Stiller 2026-07-02'de statik eve taşındı → css/parts/sosyal.css:
    ik-btn* + ik-emre-cta orada; bu modül artık stil enjekte etmez.)
══════════════════════════════════════════════════════════════ */
export function ilhamInit() {
  // Sohbet finalize kancası — Emre mesajının altına chip iliştirir.
  // API: createHookRegistry → .after(fn) (NOT .add); _ikKartArmed idempotent.
  try {
    import('./06-summary-chat.js').then(m => {
      try {
        m.startStreamingFinalizeHooks?.after?.((el, raw) => {
          if (el?.classList?.contains('emre')) _onEmreMessageFinalized(el, raw);
        });
      } catch (e) { console.warn('ilham hook:', e?.message); }
    });
  } catch (_) {}

  // window expose — sade
  try {
    window.ilhamRumuz = ilhamRumuz;
  } catch (_) {}
}
