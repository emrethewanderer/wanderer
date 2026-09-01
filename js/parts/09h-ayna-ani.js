/* ═══════════════════════════════════════════════════════════════════
   09h — AYNA ANI · "Gel. Sana bir şey göstereceğim — bende biriken sen."
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Ayna Protokolü (09g) sohbette bir kez nazikçe sorar; gerçek
     YÜZLEŞME burada olur. Kullanıcı Emre'nin okuduğu kendi yansımasını
     GÖRÜR ve tek kelimeyle karar verir: "Bu benim" (altın mühür) ya da
     "Bu ben değilim" (ayna kırılır, motor yeniden bakar). Onaylanan
     içgörü portreye (09e) işlenir; reddedilen de bir öğrenmedir.

   Üç Mühür kalibresinde tören ama nested-flip YOK (12c GOTCHA — bu
   ekranda hiç kart flip'i yok, sadece durum değişimi). Reuse: ikvRing
   (12c, mühür halkası) + fxCue('seal') (13e, ses+haptik) +
   showPremiumFeatureSpotlight (03, teaser). Örüntü Aynası'nın (09d)
   hs-overlay kalıbıyla aynı katman (z-index 750, tören portalı DEĞİL).

   Erişim: İÇ DÜNYA odası, Örüntü Aynası'nın yanı; Studio-gate
   (S.isPremium) + ücretsiz teaser. Gözlemevi (00f) enstrümantasyonu:
   yeni ceremonies wtOverlayOpen/Close çağırır (09d bunu yapmıyordu —
   Gözlemevi'nden ÖNCE yazılmıştı; bu yeni tören güncel kalıbı izler).
   Konvansiyon: kimse import etmez — window.ay* (10-features-w2, 03).
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { escapeHTML } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { ikvRing } from './12c-kart-gorsel.js';

/** Tanıma Motoru (FAZ 1) — `sonuc`: 'muhur' yalnız bir KARAR verildiğinde
 *  (Bu Benim / Bu Ben Değilim — ikisi de "ayna karşısında durdum" demektir);
 *  ×/backdrop/"sonra bakayım"/teaser hepsi kararsız çıkış, 'kapat'. */
function _closeOverlay(sonuc) {
  const el = document.getElementById('ay-overlay');
  if (!el) return;
  try { window.wtOverlayClose?.('ayna-ani', sonuc); } catch (_) {}
  el.remove();
}

function _renderResult(container, durum) {
  const isConfirm = durum === 'dogrulandi';
  // Karar verildi — üçlü seçim ŞİMDİ sökülür. Sonuç ekranı 2.2sn duruyor ve
  // butonlar ayakta kalırsa kullanıcı o pencerede "Bu Ben Değilim"e de basıp
  // aynı hipoteze ikinci, ters bir karar yazdırabiliyordu (portrenin
  // changelog'unda "Doğruladın: X" ile "Yanılmışım: X" yan yana düşüyordu).
  const foot = document.getElementById('ay-foot');
  if (foot) foot.innerHTML = '';
  container.innerHTML = `
    <div class="ay-result${isConfirm ? '' : ' ay-result--reject'}">
      <div class="ay-result-ring">${ikvRing(100, { size: 72 })}</div>
      <div class="ay-result-text">${isConfirm
        ? escapeHTML(t('ayna.result_confirm', 'Bunu artık biliyorum. Sen söyledin, ben yazdım.'))
        : escapeHTML(t('ayna.result_reject', 'Demek aynayı yanlış tutmuşum. Sildim — bana kendini sen anlat.'))}</div>
    </div>`;
  if (isConfirm) { try { window.fxCue?.('seal'); } catch (_) {} }
  try { ayRefreshRoomSub(); } catch (_) {}
  setTimeout(() => _closeOverlay('muhur'), 2200);
}

function _resolve(container, candidate, durum) {
  try { window.apResolveHypothesis?.(candidate.id, durum); } catch (_) {}
  _renderResult(container, durum);
}

function _renderHipotez(container, candidate) {
  /* Kanıt satırları artık KULLANICININ KENDİ CÜMLESİDİR (09g · dayanak
     devri) — bu yüzden tırnak içinde gösterilir, tıpkı 09d'nin om-kanit
     satırı gibi. Eskiden burada modelin kendi gerekçesi ("kimlik defterinde
     3 kez kaçınma") "kanıt" etiketiyle duruyordu ve kullanıcı onu kendi
     verisi sanıyordu; tırnak o zaman bir yalan olurdu, şimdi doğrudur. */
  const kanitHTML = (candidate.kanit || []).slice(0, 3).map((k, i) =>
    `<div class="ay-kanit-item" style="--gi:${i};">“${escapeHTML(k)}”</div>`
  ).join('');
  container.innerHTML = `
    <div class="ay-hipotez">${escapeHTML(candidate.metin)}</div>
    <div class="ay-kanit-list">${kanitHTML}</div>`;

  const foot = document.getElementById('ay-foot');
  if (foot) {
    foot.innerHTML = `
      <button type="button" class="ay-choice-confirm" id="ay-confirm">${escapeHTML(t('ayna.choice_confirm', 'Bu Benim'))}</button>
      <button type="button" class="ay-choice-reject" id="ay-reject">${escapeHTML(t('ayna.choice_reject', 'Bu Ben Değilim'))}</button>
      <button type="button" class="ay-choice-unsure" id="ay-unsure">${escapeHTML(t('ayna.choice_unsure', 'Emin değilim, sonra bakayım'))}</button>`;
    foot.querySelector('#ay-confirm').addEventListener('click', () => _resolve(container, candidate, 'dogrulandi'));
    foot.querySelector('#ay-reject').addEventListener('click', () => _resolve(container, candidate, 'reddedildi'));
    foot.querySelector('#ay-unsure').addEventListener('click', () => _closeOverlay('kapat'));
  }
}

/** İÇ DÜNYA odasından açılan tören — bir 'aday' hipotezi gösterir. */
export function ayOpen() {
  if (document.getElementById('ay-overlay')) return; // zaten açık
  const hipotezler = window.ypGetHipotezler?.() || [];
  const candidate = hipotezler.find((h) => h.durum === 'aday');

  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.style.cssText = 'z-index:var(--z-overlay-ust);';
  overlay.id = 'ay-overlay';
  overlay.innerHTML = `
    <div class="modal ay-modal">
      <div class="ay-head">
        <div class="ay-kicker">${escapeHTML(t('ayna.kicker', 'AYNA ANI'))}</div>
        <div class="ay-title">${escapeHTML(t('ayna.title', 'Sana Bir Şey Göstereceğim'))}</div>
        <div class="ay-epigraf">${escapeHTML(t('ayna.epigraf', 'Bende biriken sen — doğruysa mühürle, değilse söyle.'))}</div>
      </div>
      <div class="ay-scroll" id="ay-content"></div>
      <div class="ay-foot" id="ay-foot">
        <button type="button" class="btn-outline-gold" style="width:100%;" id="ay-close">${escapeHTML(t('ayna.close', 'Kapat'))}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  // Backdrop tıklaması da kapatır — teaser/empty dallarında tek kaçış Kapat
  // butonu olmasın (wtOverlayClose _closeOverlay içinde, olay yetim kalmaz).
  overlay.addEventListener('click', (e) => { if (e.target === overlay) _closeOverlay('kapat'); });
  // Kapat inline onclick DEĞİL — kapanış tek yoldan (_closeOverlay) geçer,
  // Gözlemevi close olayı hiçbir dalda atlanmaz. Handler SARMALANIR: doğrudan
  // referans verilirse click Event'i `sonuc` parametresine sızar (00f'e olay
  // nesnesi yazılır — Tanıma Motoru FAZ 1 gotcha'sı).
  overlay.querySelector('#ay-close')?.addEventListener('click', () => _closeOverlay('kapat'));
  try { window.wtOverlayOpen?.('ayna-ani'); } catch (_) {}

  const content = overlay.querySelector('#ay-content');

  if (!S.isPremium) {
    content.innerHTML = `
      <div class="ay-teaser">
        <div class="ay-teaser-icon">◈</div>
        <div class="ay-teaser-text">${escapeHTML(candidate
          ? t('ayna.teaser', 'Emre senin hakkında bir şey fark etti — Ayna, Studio\'da seni bekliyor.')
          : t('ayna.teaser_empty', 'Ayna henüz sessiz — birkaç gün daha konuş, bir soru belirsin.'))}</div>
        ${candidate ? `<button type="button" class="ay-teaser-cta" id="ay-teaser-cta">${escapeHTML(t('ayna.teaser_cta', 'Aynaya Bak'))}</button>` : ''}
      </div>`;
    content.querySelector('#ay-teaser-cta')?.addEventListener('click', () => {
      _closeOverlay('kapat');
      try { window.showPremiumFeatureSpotlight?.('ayna'); } catch (_) {}
    });
    // Kapat butonu foot'ta YAŞAR — silinirse aday-yok teaser'ı kapanamaz
    // ve Gözlemevi'nde wtOverlayOpen('ayna-ani') yetim kalırdı.
    return;
  }

  if (!candidate) {
    content.innerHTML = `<div class="ay-empty">${escapeHTML(t('ayna.empty', 'Şu an sana soracak bir şeyim yok. Konuştukça bir şeyler fark edeceğim.'))}</div>`;
    return;
  }

  _renderHipotez(content, candidate);
}

/** İÇ DÜNYA oda alt-satırı + taze nokta — wsSyncStudio çağırır (09d omRefreshRoomSub kalıbı). */
export function ayRefreshRoomSub() {
  try {
    const sub = document.getElementById('studio-ayna-sub');
    const pulse = document.getElementById('ws-ay-pulse');
    const hipotezler = window.ypGetHipotezler?.() || [];
    const hasAday = hipotezler.some((h) => h.durum === 'aday');
    if (sub) {
      sub.textContent = hasAday
        ? t('ayna.sub_pending', 'sana bir sorum var')
        : t('ayna.sub_default', 'seni sana gösteriyor');
    }
    if (pulse) pulse.classList.toggle('active', hasAday);
  } catch (_) {}
}

/* ── window expose (10-features-w2/03 buradan çağırır — import kenarı yok) ── */
if (typeof window !== 'undefined') {
  window.ayOpen = ayOpen;
  window.ayRefreshRoomSub = ayRefreshRoomSub;
}
