/* ═══════════════════════════════════════════════════════════════════
   10r — CAZİBE MOTORU · İknanın Psikolojisi (Cialdini) sistemin çekirdeğinde
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON:
     Cialdini'nin 8 etki ilkesini ALDIK ve ETİK OLARAK TERS ÇEVİRDİK.
     Onlar başkasını ikna/kandırma üstüneydi; biz kullanıcıyı BAŞKASINA
     değil, KENDİ DÖNÜŞÜMÜNE çekmek için kullanıyoruz. Çekirdek tez aynı:
     "Mesele Sensin." Sahte sayı yok, sahte sayaç yok, karanlık desen yok.
     Her kaldıraç manevi dille çerçevelenir: "önce sana verilir; sen de
     kendine verirsin." 8. ilke (Etkinin Silahları) bunu kullanıcıya da
     dürüstçe anlatan meta-katmandır — bu şeffaflık başlı başına çekicidir.

   8 KALDIRAÇ:
     1 Karşılıkta Bulunma   → Günün Hediyesi (uygulama önce verir)
     2 Bağlılık/Tutarlılık  → Günün Sözü (mikro-taahhüt + akşam geri-çağrı)
     3 Toplumsal Kanıt      → Gezginler kabilesi + öz-kanıt (uydurma sayı YOK)
     4 Sevgi/Beğeni         → hak edilmiş iltifat + yaşam-belleği dokunuşu
     5 Otorite              → Emre'nin sesi + kitap kökü (10q'da pekiştirilir)
     6 Azlık                → nadirlik + kayıp + Bugünün Kişisi (10q'da)
     7 Anlık Etki           → czSpark: her kazanımda anında mikro-ödül
     8 Etkinin Silahları    → Cazibe Pusulası (meta panel)

   Kalıcılık: SafeStorage (auth öncesi in-memory, sonrası localStorage —
   dinlenme/siginak ile aynı). Supabase migration YOK (cihaz-yerel durum).
   Konvansiyon: hardcoded Türkçe stringler (oyun-katmanı kuralı).
   TDZ güvenliği: top-level çağrı yok; modüller-arası erişim window.* ile.
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SafeStorage, stableHash, seededRng, localISODate, escapeHTML } from './00a-infrastructure.js';
import { kokenKayitVar } from './13y-koken.js';
import { awardElmas, getElmasSayisi } from './10g-w2-wanderer-game.js';
import { t } from './15-i18n.js';

const STORAGE_KEY = 'etw_cazibe_v1';

/* Dile duyarlı locale (toLocaleX için) */
const _locale = () => (S._currentLang === 'tr' ? 'tr-TR' : 'en-US');

/* Tek kaynak: escapeHTML (00a). Eskiden bu modülün kendi ikizi vardı;
   ikizler birbirinden de farklıydı (bir kısmı tek tırnağı kaçırmıyordu). */
const esc = escapeHTML;

/* ── Günün anahtarı (yerel) + deterministik tohum (aynı gün = aynı sonuç) ──
   Anahtar 00a'nın `localISODate`'idir; yerel ad çağrı yerlerinin okunurluğu
   için kalır. Sekiz modül bu satırı kopyalamış ve dördü de bu köprüden
   (`window.czDayKey`) okuyordu — hepsi 2026-08-17'de tek kaynağa bağlandı. */
function czDayKey() {
  return localISODate();
}
// Deterministik seed → 00a tek kaynağı (aynı algoritma; günlük rotasyonlar
// birebir korunur). Yerel adlar korunur, çağrı yerleri değişmez.
const _hash = stableHash;
const _rng  = seededRng;
// günlük deterministik seçici — uid + gün + tuz
function czDaily(salt) {
  const uid = (S.currentUser && S.currentUser.id) || 'anon';
  return _rng(_hash(`${uid}|${czDayKey()}|${salt || ''}`));
}
function _pick(arr, rnd) { return arr[Math.floor((rnd ? rnd() : Math.random()) * arr.length)]; }

/* ════════════════════════════════════════════════════════════════════
   CAZIBE — merkezî içerik kaynağı (kitap-köklü, manevi); metin i18n'den
   render anında çözülür (yük-anında t() çağırma → dil donar).
════════════════════════════════════════════════════════════════════ */
// Lever 1 — hediye edilen düşünce/mühür (İlişki Felsefesi + Zihniyet Devrimi köklü)
const _czThoughts = () => Array.from({ length: 10 }, (_, i) => t(`cz.thought.${i}`));
// Lever 2 — günün mikro-sözleri ("Bugün ___ olacağım" — kimlik inşası)
const _czPledges = () => Array.from({ length: 8 }, (_, i) => ({ text: t(`cz.pledge.${i}.text`), tag: t(`cz.pledge.${i}.tag`) }));
// Lever 3 — kabile normu (evergreen, dürüst; uydurma sayım YOK)
const _czTribe = () => Array.from({ length: 5 }, (_, i) => t(`cz.tribe.${i}`));
// Lever 8 — Cazibe Pusulası (radikal dürüstlük: güçleri adlandır + yeniden çerçevele)
/* 9. glyph İÇİ BOŞ yıldızdır (1. sıradaki dolu ✦'nin ikizi) — bilerek:
   ilk sekiz kaldıraç uygulamanındır, dokuzuncusunun içini kullanıcı
   doldurur. İmge Kapısı (13z) bu satırla kullanıcıya dürüstçe söylenir. */
const _CZ_PUSULA_GLYPHS = ['✦', '∞', '◈', '♥', '❖', '◇', '⚡', '◉', '✧'];
const _czPusula = () => _CZ_PUSULA_GLYPHS.map((g, i) => ({ g, baslik: t(`cz.pusula.${i}.baslik`), metin: t(`cz.pusula.${i}.metin`) }));

/* ════════════════════════════════════════════════════════════════════
   PERSİSTANS
════════════════════════════════════════════════════════════════════ */
function _default() {
  return {
    gift: { date: null, kind: null, claimed: false, payload: null },
    pledge: { date: null, idx: null, text: null, kept: null },
    lastCompliment: null,
    seenPusula: false,
    sparkTotal: 0,
  };
}
export function czSave() {
  try {
    const uid = (S.currentUser && S.currentUser.id) || 'anon';
    SafeStorage.set(`${STORAGE_KEY}_${uid}`, S._cazibe);
  } catch (e) { console.warn('czSave:', e && e.message); }
}
export function czLoad() {
  try {
    const uid = (S.currentUser && S.currentUser.id) || 'anon';
    const data = SafeStorage.get(`${STORAGE_KEY}_${uid}`);
    if (data && typeof data === 'object') S._cazibe = Object.assign(_default(), data);
  } catch (e) { console.warn('czLoad:', e && e.message); }
}
export function czInit() {
  if (!S._cazibe) S._cazibe = _default();
  czLoad();
}

/* ── küçük yardımcılar (dış modüllere window üzerinden eriş — TDZ güvenli) ── */
function _streak() { try { return (window.oikGetStats && window.oikGetStats().streak) || 0; } catch (_) { return 0; } }
function _kStats() { try { return (window.getKisilerimStats && window.getKisilerimStats()) || null; } catch (_) { return null; } }
function _userName() {
  const u = S.currentUser;
  return (u && (u.name || (u.user_metadata && u.user_metadata.name))) ||
    (document.getElementById('ob-name') && document.getElementById('ob-name').textContent) || t('cz.gezgin');
}

/* ════════════════════════════════════════════════════════════════════
   KALDIRAÇ 7 — ANLIK ETKİ · czSpark (her kazanımda anında mikro-ödül)
   awardElmas() bunu window.czSpark üzerinden çağırır (import yok, cycle yok).
════════════════════════════════════════════════════════════════════ */
let _sparkAt = 0;
export function czSpark(amount, label) {
  // Tam-ekran tören veil'i (gl-/sm-/us-/yol-/at- … hepsi *-veil) açıkken kıvılcım
  // z-index'te (9500) onun ALTINDA kalır → veil'in blur+karartmasının arkasından
  // soluk, yuvarlak uçlu bir "hayalet çizgi" olarak sızar (Günün Armağanı ekranında
  // "Söze Geç"in altında görünen çizgi tam buydu: armağan toplandığında awardElmas
  // bu kıvılcımı tetikliyordu). Tören kendi ödül geri bildirimini (ödül rayı / elmas
  // barı) zaten verdiğinden, bir tören açıkken kıvılcımı hiç gösterme. Elmas yine
  // kazanılır — yalnızca yüzen kıvılcım atlanır.
  if (document.querySelector('[class*="-veil"]')) return;
  czEnsureStyles();
  const now = Date.now();
  if (now - _sparkAt < 400) return; // arka arkaya patlamayı yumuşat
  _sparkAt = now;
  if (S._cazibe) { S._cazibe.sparkTotal = (S._cazibe.sparkTotal || 0) + 1; }
  try { if (window.fxHaptic) window.fxHaptic('light'); else navigator.vibrate?.(12); } catch (_) {}
  const n = Math.max(0, Math.round(amount || 0));
  const el = document.createElement('div');
  el.className = 'cz-spark';
  el.innerHTML = `<span class="cz-spark-glyph">◆</span>${n ? `<b>+${n}</b>` : ''}<span class="cz-spark-lbl">${esc(label || t('cz.spark_default'))}</span>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('cz-spark--go'));
  setTimeout(() => el.remove(), 1400);
}

/* ════════════════════════════════════════════════════════════════════
   KALDIRAÇ 4 — SEVGİ · hak edilmiş iltifat + yaşam-belleği dokunuşu
════════════════════════════════════════════════════════════════════ */
// kilometre-taşı kapılı, SPESİFİK ve HAK EDİLMİŞ övgü (yağcılık değil)
export function czIltifat() {
  const st = _streak();
  const ks = _kStats();
  const earned = ks ? ks.earned : 0;
  if (st >= 30) return t('cz.iltifat.30').replace('{st}', st);
  if (st >= 7) return t('cz.iltifat.7').replace('{st}', st);
  if (earned >= 10) return t('cz.iltifat.earned10').replace('{earned}', earned);
  if (st >= 3) return t('cz.iltifat.3');
  if (earned >= 1) return t('cz.iltifat.earned1');
  return null;
}

// yaşam-belleğinden (09a P6) sıcak, kişisel gönderme — veri varsa
export function czKisiselDokunis() {
  try {
    const lm = S._lifeMemory;
    if (!lm) return null;
    /* Köken kapısı (2026-08-02): kişisel dokunuş kullanıcının YÜZÜNE bir
       şey söyler ("X'i soralım mı?") — kanıtsız bir ad ya da hedef burada
       görünseydi, uydurma en yakın mesafeden geri dönerdi. */
    const people = lm.people ? Object.values(lm.people).filter(kokenKayitVar) : [];
    if (people.length) {
      const top = people.slice().sort((a, b) => (b.mention_count || 0) - (a.mention_count || 0))[0];
      if (top && top.name && (top.mention_count || 0) >= 2) {
        return t('cz.touch.person').replace('{name}', esc(top.name));
      }
    }
    const facts = (lm.lifeFacts || []).filter(kokenKayitVar);
    const goal = facts.find(f => f && (f.category === 'goal'));
    if (goal && goal.value) return t('cz.touch.goal').replace('{value}', esc(goal.value));
  } catch (_) {}
  return null;
}

/* ════════════════════════════════════════════════════════════════════
   KALDIRAÇ 3 — TOPLUMSAL KANIT · öz-kanıt (gerçek veri) + kabile normu
   SAHTE SAYI YOK: rakamlar yalnızca kullanıcının kendi verisinden gelir.
════════════════════════════════════════════════════════════════════ */
export function czToplumsalKanit() {
  const st = _streak();
  // (a) öz-kanıt — gerçek veriden
  if (st >= 3) return { kind: 'oz', text: t('cz.kanit.oz').replace('{st}', st) };
  // (b) kabile normu — evergreen, dürüst
  const rnd = czDaily('tribe');
  return { kind: 'kabile', text: _pick(_czTribe(), rnd) };
}

/* ════════════════════════════════════════════════════════════════════
   KALDIRAÇ 1 — KARŞILIKTA BULUNMA · Günün Hediyesi (uygulama ÖNCE verir)
════════════════════════════════════════════════════════════════════ */
function _ensureGiftForToday() {
  const g = S._cazibe.gift;
  const today = czDayKey();
  if (g.date === today && g.kind) return g;
  // bugüne yeni hediye seç (deterministik)
  const rnd = czDaily('gift');
  const ks = _kStats();
  const hasHint = !!(ks && ks.closest && ks.closest.missing && ks.closest.missing[0] && ks.closest.missing[0].hint);
  const kinds = ['elmas', 'dusunce'];
  if (hasHint) kinds.push('ipucu');
  const kind = _pick(kinds, rnd);
  let payload = null;
  if (kind === 'dusunce') payload = _pick(_czThoughts(), czDaily('gift-thought'));
  else if (kind === 'ipucu') payload = ks.closest.missing[0].hint;
  else payload = 3; // elmas miktarı
  S._cazibe.gift = { date: today, kind, claimed: false, payload };
  czSave();
  return S._cazibe.gift;
}

export function czRenderHediye() {
  const host = document.getElementById('cz-bugun-hediye');
  if (!host) return;
  czEnsureStyles();
  const g = _ensureGiftForToday();
  const name = esc(_userName());

  if (g.claimed) {
    // alındı → karşılık daveti (reciprocity: "sıra sende")
    host.innerHTML = `<div class="cz-card cz-card--soft cz-gift cz-gift--done">
      <div class="cz-gift-glyph">✦</div>
      <div class="cz-gift-body">
        <div class="cz-kicker">${t('cz.gift.done_kicker')}</div>
        <div class="cz-gift-title">${t('cz.gift.done_title').replace('{name}', name)}</div>
        <div class="cz-gift-sub">${t('cz.gift.done_sub')}</div>
      </div>
      <button class="cz-mini-cta" onclick="switchView('arketipler')">›</button>
    </div>`;
    return;
  }

  let title, sub, glyph;
  if (g.kind === 'dusunce') { glyph = '❝'; title = t('cz.gift.thought_title'); sub = `"${esc(g.payload)}"`; }
  else if (g.kind === 'ipucu') { glyph = '◈'; title = t('cz.gift.hint_title'); sub = `→ ${esc(g.payload)}`; }
  else { glyph = '◆'; title = t('cz.gift.elmas_title').replace('{n}', g.payload); sub = t('cz.gift.elmas_sub'); }

  // Sevgi/Beğeni — yaşam-belleğinden sıcak, kişisel dokunuş (veri varsa)
  const touch = czKisiselDokunis();

  host.innerHTML = `<div class="cz-card cz-gift">
    <div class="cz-gift-glyph cz-gift-glyph--pulse">${glyph}</div>
    <div class="cz-gift-body">
      <div class="cz-kicker">${t('cz.gift.kicker').replace('{name}', name.toLocaleUpperCase(_locale()))}</div>
      <div class="cz-gift-title">${esc(title)}</div>
      <div class="cz-gift-sub">${sub}</div>
      ${touch ? `<div class="cz-gift-touch">${touch}</div>` : ''}
    </div>
    <button class="cz-gift-claim" id="cz-gift-claim">${t('cz.gift.claim')}</button>
  </div>`;
  const btn = document.getElementById('cz-gift-claim');
  if (btn) btn.addEventListener('click', czClaimHediye);
}

export function czClaimHediye() {
  const g = S._cazibe.gift;
  if (!g || g.claimed) return;
  g.claimed = true;
  czSave();
  if (g.kind === 'elmas') { try { awardElmas(g.payload || 3, 'cazibe-hediye'); } catch (_) {} }
  else { czSpark(0, t('cz.spark.gift_claimed')); }
  if (g.kind === 'dusunce') {
    // hediye düşünceyi Geçiş Alanı'na taşıma daveti (varsa)
    try { S._affirmation = S._affirmation || {}; if (!S._affirmation.text) S._affirmation.text = g.payload; } catch (_) {}
  }
  czRenderHediye();
}

/* ════════════════════════════════════════════════════════════════════
   KALDIRAÇ 2 — BAĞLILIK & TUTARLILIK · Günün Sözü (mikro-taahhüt)
════════════════════════════════════════════════════════════════════ */
function _todaysPledgeChoices() {
  // günlük deterministik 3 seçenek
  const rnd = czDaily('pledge');
  const pool = _czPledges();
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}

export function czRenderSoz() {
  const host = document.getElementById('cz-bugun-soz');
  if (!host) return;
  czEnsureStyles();
  const p = S._cazibe.pledge;
  const today = czDayKey();
  const isEvening = new Date().getHours() >= 20;
  const streak = _streak();
  const lossLine = streak > 0
    ? `<div class="cz-soz-loss">${t('cz.soz.loss').replace('{n}', streak)}</div>`
    : '';

  // henüz bugün söz verilmedi → seçtir
  if (p.date !== today || p.idx == null) {
    const choices = _todaysPledgeChoices();
    host.innerHTML = `<div class="cz-card cz-soz">
      <div class="cz-kicker">${t('cz.soz.kicker_new')}</div>
      <div class="cz-soz-lead">${t('cz.soz.lead_new')}</div>
      <div class="cz-soz-opts">
        ${choices.map((c, i) => `<button class="cz-soz-opt" data-idx="${i}"><span class="cz-soz-tag">${esc(c.tag)}</span>${esc(c.text)}</button>`).join('')}
      </div>
      ${lossLine}
    </div>`;
    host.querySelectorAll('.cz-soz-opt').forEach(b => b.addEventListener('click', () => {
      const c = choices[+b.dataset.idx];
      czPledge(c.text, c.tag);
    }));
    return;
  }

  // söz verildi; gece ise "tuttun mu?" sorusu (henüz yanıtlanmadıysa)
  if (isEvening && p.kept == null) {
    host.innerHTML = `<div class="cz-card cz-soz cz-soz--ask">
      <div class="cz-kicker">${t('cz.soz.kicker_evening')}</div>
      <div class="cz-soz-given">${t('cz.soz.given_morning').replace('{text}', esc(p.text))}</div>
      <div class="cz-soz-lead">${t('cz.soz.ask')}</div>
      <div class="cz-soz-yn">
        <button class="cz-soz-yes" id="cz-soz-yes">${t('cz.soz.yes')}</button>
        <button class="cz-soz-no" id="cz-soz-no">${t('cz.soz.no')}</button>
      </div>
    </div>`;
    const y = document.getElementById('cz-soz-yes'); if (y) y.addEventListener('click', () => czPledgeKept(true));
    const no = document.getElementById('cz-soz-no'); if (no) no.addEventListener('click', () => czPledgeKept(false));
    return;
  }

  // söz verildi; gündüz boyu yansıt (taahhüt geri-çağrısı)
  const state = p.kept === true ? t('cz.soz.state_kept') : p.kept === false ? t('cz.soz.state_tomorrow') : t('cz.soz.state_today');
  const praise = p.kept === true ? czIltifat() : null;   // Sevgi/Beğeni — hak edilmiş övgü
  host.innerHTML = `<div class="cz-card cz-card--soft cz-soz cz-soz--locked">
    <div class="cz-kicker">${t('cz.soz.kicker_locked').replace('{state}', esc(state.toLocaleUpperCase(_locale())))}</div>
    <div class="cz-soz-given"><i>"${esc(p.text)}"</i></div>
    ${p.kept == null ? `<div class="cz-soz-sub">${t('cz.soz.remind')}</div>` : ''}
    ${praise ? `<div class="cz-soz-praise">♥ ${esc(praise)}</div>` : ''}
    ${lossLine}
  </div>`;
}

export function czPledge(text, tag) {
  S._cazibe.pledge = { date: czDayKey(), idx: 1, text, tag: tag || '', kept: null };
  czSave();
  czSpark(0, t('cz.spark.pledge_made'));
  czRenderSoz();
}

export function czPledgeKept(kept) {
  const p = S._cazibe.pledge;
  if (!p) return;
  p.kept = !!kept;
  czSave();
  if (kept) { try { awardElmas(4, 'cazibe-soz'); } catch (_) {} }
  czRenderSoz();
}

/* ════════════════════════════════════════════════════════════════════
   KALDIRAÇ 8 — ETKİNİN SİLAHLARI · Cazibe Pusulası (meta panel)
   Radikal dürüstlük: 8 gücü adlandır ve kullanıcının kendi büyüme
   kaldıraçları olarak yeniden çerçevele.
════════════════════════════════════════════════════════════════════ */
export function czPusula() {
  czEnsureStyles();
  let portal = document.getElementById('cz-pusula-portal');
  if (!portal) {
    portal = document.createElement('div');
    portal.id = 'cz-pusula-portal';
    document.body.appendChild(portal);
  }
  portal.style.cssText = 'position:fixed;inset:0;z-index:var(--z-cazibe-portal);';
  const rows = _czPusula().map(p => `<div class="cz-pus-row">
    <div class="cz-pus-g">${p.g}</div>
    <div><div class="cz-pus-h">${esc(p.baslik)}</div><div class="cz-pus-t">${esc(p.metin)}</div></div>
  </div>`).join('');
  portal.innerHTML = `
    <div class="cz-pus-veil"></div>
    <div class="cz-pus">
      <button class="cz-pus-close" id="cz-pus-close">×</button>
      <div class="cz-pus-kicker">${t('cz.pus.kicker')}</div>
      <div class="cz-pus-title">${t('cz.pus.title')}</div>
      <div class="cz-pus-intro">${t('cz.pus.intro')}</div>
      <div class="cz-pus-list">${rows}</div>
      ${getElmasSayisi ? `<div class="cz-pus-foot">${t('cz.pus.foot').replace('{n}', getElmasSayisi().toLocaleString(_locale()))}</div>` : ''}
    </div>`;
  S._cazibe.seenPusula = true; czSave();
  const close = () => { portal.style.cssText = ''; portal.innerHTML = ''; };
  const cb = document.getElementById('cz-pus-close'); if (cb) cb.addEventListener('click', close);
  portal.querySelector('.cz-pus-veil').addEventListener('click', close);
}

/* ════════════════════════════════════════════════════════════════════
   BUGÜN ORKESTRATÖRÜ — loadBugunView bunu çağırır (window.czRenderBugun)
════════════════════════════════════════════════════════════════════ */
export function czRenderBugun() {
  // NOT: Günün Hediyesi + Günün Sözü artık Bugün'e gömülü değil — günün ilk
  // girişinde Günlük Ritüel (10s) pop-up'larıyla veriliyor. czRenderHediye /
  // czRenderSoz fonksiyonları korunur (geri-uyum / olası yeniden kullanım),
  // ama Bugün'e basılmazlar. Bugün host'ları (#cz-bugun-hediye/#cz-bugun-soz)
  // kaldırıldığı için çağrılsalar bile no-op olurlar.
}

/* ════════════════════════════════════════════════════════════════════
   STİLLER (JS-enjekte — kkEnsureStyles kalıbı)
════════════════════════════════════════════════════════════════════ */
export function czEnsureStyles() {
  if (document.getElementById('cz-styles')) return;
  const css = `
  .cz-card{position:relative;display:flex;align-items:center;gap:12px;border:1px solid var(--border,#2a2a2a);border-radius:12px;padding:13px 14px;margin:12px 0;background:linear-gradient(155deg,rgba(184,149,60,.10),rgba(15,14,12,.55));font-family:var(--cinzel,'Cinzel',serif);}
  .cz-card--soft{background:linear-gradient(155deg,rgba(120,120,140,.07),rgba(15,14,12,.5));}
  .cz-kicker{font-size:8px;letter-spacing:3px;color:var(--gold,#d4af55);font-weight:700;}
  .cz-mini-cta{margin-left:auto;background:transparent;border:1px solid rgba(255,255,255,.2);color:var(--gold,#d4af55);width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:16px;}

  /* Hediye */
  .cz-gift-glyph{font-size:26px;color:var(--gold,#d4af55);filter:drop-shadow(0 0 10px rgba(212,175,85,.5));flex-shrink:0;width:34px;text-align:center;}
  .cz-gift-glyph--pulse{animation:czPulse 2s ease-in-out infinite;}
  .cz-gift-body{flex:1;min-width:0;}
  .cz-gift-title{font-size:13px;color:var(--text,#eee);margin-top:3px;font-weight:600;line-height:1.3;}
  .cz-gift-sub{font-family:var(--serif,Georgia);font-style:italic;font-size:11.5px;color:var(--text-dim,#a99);margin-top:4px;line-height:1.45;}
  .cz-gift-claim{flex-shrink:0;align-self:center;background:var(--gold,#d4af55);color:#1a1206;border:none;padding:9px 16px;border-radius:4px;font-family:var(--cinzel,serif);font-size:11px;letter-spacing:2px;font-weight:700;cursor:pointer;animation:czBob 2.4s ease-in-out infinite;}
  .cz-gift-claim:active{transform:scale(.95);}
  .cz-gift--done .cz-gift-glyph{opacity:.5;}
  .cz-gift-touch{font-family:var(--serif,Georgia);font-size:11px;color:#d9b6e6;margin-top:6px;line-height:1.4;border-top:1px solid rgba(255,255,255,.06);padding-top:6px;}
  .cz-soz-praise{font-family:var(--serif,Georgia);font-style:italic;font-size:11.5px;color:#d9b6e6;margin-top:8px;line-height:1.45;}

  /* Söz */
  .cz-soz{display:block;}
  .cz-soz-lead{font-family:var(--serif,Georgia);font-size:12px;color:var(--text,#ddd);margin:7px 0 10px;line-height:1.5;}
  .cz-soz-opts{display:flex;flex-direction:column;gap:7px;}
  .cz-soz-opt{text-align:left;background:rgba(255,255,255,.03);border:1px solid var(--border,#2a2a2a);border-radius:8px;padding:10px 12px;color:var(--text,#eee);font-family:var(--serif,Georgia);font-size:12px;cursor:pointer;line-height:1.4;transition:border-color .15s,background .15s;}
  .cz-soz-opt:hover,.cz-soz-opt:active{border-color:var(--gold,#d4af55);background:rgba(184,149,60,.08);}
  .cz-soz-tag{display:inline-block;font-family:var(--cinzel,serif);font-size:8px;letter-spacing:2px;color:var(--gold,#d4af55);border:1px solid rgba(184,149,60,.4);border-radius:3px;padding:1px 6px;margin-right:8px;vertical-align:middle;}
  .cz-soz-given{font-family:var(--serif,Georgia);font-size:12.5px;color:var(--text,#eee);margin:7px 0;line-height:1.5;}
  .cz-soz-given i{color:var(--gold,#d4af55);}
  .cz-soz-sub{font-size:11px;color:var(--text-dim,#a99);font-family:var(--serif,Georgia);font-style:italic;}
  .cz-soz-loss{margin-top:9px;font-size:11px;letter-spacing:1px;color:#e0a44a;font-family:var(--cinzel,serif);}
  .cz-soz-yn{display:flex;gap:9px;margin-top:10px;}
  .cz-soz-yes{flex:1;background:var(--gold,#d4af55);color:#1a1206;border:none;padding:11px;border-radius:5px;font-family:var(--cinzel,serif);font-size:11px;letter-spacing:1px;font-weight:700;cursor:pointer;}
  .cz-soz-no{flex:1;background:transparent;color:var(--text-dim,#a99);border:1px solid var(--border,#333);padding:11px;border-radius:5px;font-family:var(--cinzel,serif);font-size:11px;letter-spacing:1px;cursor:pointer;}

  /* Anlık ödül (czSpark) */
  .cz-spark{position:fixed;left:50%;bottom:96px;transform:translate(-50%,16px);z-index:var(--z-cazibe-kivilcim);display:flex;align-items:center;gap:6px;background:linear-gradient(120deg,rgba(40,28,8,.95),rgba(20,16,10,.95));border:1px solid var(--gold,#d4af55);border-radius:24px;padding:8px 16px;font-family:var(--cinzel,serif);color:#ffe6a8;font-size:13px;box-shadow:0 8px 28px rgba(0,0,0,.5),0 0 22px rgba(212,175,85,.4);opacity:0;pointer-events:none;transition:transform .4s cubic-bezier(.2,1.3,.4,1),opacity .4s;}
  .cz-spark--go{opacity:1;transform:translate(-50%,0);}
  .cz-spark-glyph{color:var(--gold,#d4af55);filter:drop-shadow(0 0 6px rgba(212,175,85,.7));}
  .cz-spark b{color:#fff;}
  .cz-spark-lbl{font-size:10px;letter-spacing:2px;color:rgba(255,230,168,.8);}

  /* Toplumsal kanıt satırı (Kişiler görünümünde kullanılır) — altın tanıklık */
  .cz-proof{display:flex;align-items:center;gap:10px;border:1px solid rgba(234,226,214,.10);border-left:2px solid var(--gold,#F5A623);
    border-radius:0 14px 14px 0;padding:10px 13px;margin:0 0 14px;
    background:linear-gradient(90deg,rgba(245,166,35,.07),transparent 70%);}
  .cz-proof-g{color:var(--gold,#F5A623);font-size:13px;filter:drop-shadow(0 0 6px rgba(245,166,35,.4));}
  .cz-proof-t{font-family:var(--serif,Georgia);font-size:12px;color:var(--text,#EAE2D6);line-height:1.45;font-style:italic;}

  /* Pusula paneli */
  .cz-pus-veil{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 30%,rgba(40,30,15,.6),rgba(6,6,8,.96));backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);}
  .cz-pus{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,92vw);max-height:86vh;overflow:auto;background:linear-gradient(165deg,#15140f,#0b0b0e);border:1px solid var(--gold,#3a3424);border-radius:14px;padding:24px 22px 20px;font-family:var(--cinzel,'Cinzel',serif);box-shadow:0 30px 80px rgba(0,0,0,.7);}
  .cz-pus-close{position:absolute;right:14px;top:12px;background:transparent;border:none;color:var(--text-dim,#999);font-size:24px;cursor:pointer;}
  .cz-pus-kicker{font-size:9px;letter-spacing:5px;color:var(--gold,#d4af55);font-weight:700;}
  .cz-pus-title{font-family:var(--serif,Georgia);font-style:italic;font-size:22px;color:var(--text,#eee);margin:4px 0 10px;}
  .cz-pus-intro{font-family:var(--serif,Georgia);font-size:12.5px;color:var(--text-dim,#b9b3a6);line-height:1.55;margin-bottom:16px;}
  .cz-pus-intro b{color:var(--gold,#d4af55);font-style:normal;}
  .cz-pus-list{display:flex;flex-direction:column;gap:12px;}
  .cz-pus-row{display:flex;gap:12px;align-items:flex-start;}
  .cz-pus-g{flex-shrink:0;width:30px;height:30px;border:1px solid rgba(184,149,60,.4);border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--gold,#d4af55);font-size:14px;}
  .cz-pus-h{font-size:12px;letter-spacing:1px;color:var(--text,#eee);font-weight:700;}
  .cz-pus-t{font-family:var(--serif,Georgia);font-size:11.5px;color:var(--text-dim,#a9a397);line-height:1.5;margin-top:2px;}
  .cz-pus-foot{margin-top:18px;text-align:center;font-size:10px;letter-spacing:2px;color:var(--gold,#d4af55);opacity:.8;}

  /* Kişiler görünümü cazibe eklentileri (10q yüzeyleri) — salon dili.
     Bugünün Kişisi = yarın değişen GELECEK yüzü → lapis (anlam ekseni). */
  .cz-bugun-kisi{position:relative;display:flex;width:100%;gap:13px;align-items:center;text-align:left;overflow:hidden;
    border:1px solid rgba(90,138,216,.26);border-radius:var(--radius-lg,20px);padding:12px 14px;margin:0 0 14px;cursor:pointer;
    background:radial-gradient(120% 100% at 100% 0%, rgba(45,95,168,.13), transparent 60%),linear-gradient(170deg,#141A2B,#0C0F18);
    transition:border-color .2s ease;}
  .cz-bugun-kisi:hover{border-color:rgba(90,138,216,.5);}
  .cz-bk-card{width:66px;flex-shrink:0;}
  .cz-bk-txt{flex:1;min-width:0;}
  .cz-bk-kicker{font-family:var(--cinzel,serif);font-size:8px;letter-spacing:2.5px;color:var(--lapis-bright,#5A8AD8);font-weight:700;}
  .cz-bk-name{font-family:var(--serif-display,var(--serif,Georgia));font-style:italic;font-size:16px;color:var(--text,#EAE2D6);margin:3px 0 2px;}
  .cz-bk-lesson{font-family:var(--serif,Georgia);font-style:italic;font-size:11px;color:var(--text-mid,#95897A);margin-bottom:6px;line-height:1.45;}
  /* Keşif daveti (10q · Tanıma Motoru K6) — hazırlık çubuğunun sustuğu yerde
     duran SORU. Düz (italik değil): dersin sesi ayrı, davetin sesi ayrı. */
  .cz-bk-davet{font-family:var(--serif,Georgia);font-size:11.5px;color:var(--lapis-bright,#5A8AD8);opacity:.92;line-height:1.5;}
  .cz-pusula-link{display:block;width:100%;min-height:44px;margin:18px 0 0;background:transparent;
    border:1px dashed rgba(245,166,35,.40);border-radius:var(--radius-full,999px);padding:12px;
    color:var(--gold,#F5A623);font-family:var(--cinzel,serif);font-size:10px;letter-spacing:2px;cursor:pointer;transition:background .2s ease;}
  .cz-pusula-link:active,.cz-pusula-link:hover{background:rgba(245,166,35,.06);}
  .cz-pusula-link:focus-visible{outline:2px solid var(--gold,#F5A623);outline-offset:2px;}
  /* iltifat — hak edilmiş altın satır (sevgi = şimdinin sıcaklığı) */
  .cz-praise-line{border:1px solid rgba(245,166,35,.26);border-radius:var(--radius-lg,20px);padding:12px 15px;margin:0 0 16px;
    background:radial-gradient(120% 100% at 0% 0%, rgba(245,166,35,.09), transparent 60%),rgba(18,14,9,.5);
    font-family:var(--serif,Georgia);font-style:italic;font-size:12.5px;color:var(--gold-bright,#F7C744);line-height:1.5;}
  /* Otorite (kök künyesi) + Azlık (nadirlik/kayıp) */
  .kk-emre-auth{font-size:8px;letter-spacing:1px;color:var(--text-dim,#998);font-weight:400;}
  .kk-det-auth{display:block;font-family:var(--serif,Georgia);font-style:italic;font-size:9px;color:var(--text-dim,#888);margin-top:3px;letter-spacing:.5px;}
  .kk-pack-cap-scarce{font-size:9px;letter-spacing:3px;color:#e0a44a;margin-top:3px;}
  .kk-spot-scarce{font-family:var(--cinzel,serif);font-size:8.5px;letter-spacing:1.5px;color:#e0a44a;margin-top:6px;}
  .kk-spot-loss{font-family:var(--serif,Georgia);font-style:italic;font-size:11px;color:#e0a44a;margin-top:4px;}

  @keyframes czPulse{0%,100%{transform:scale(1);opacity:1;}50%{transform:scale(1.12);opacity:.85;}}
  @keyframes czBob{0%,100%{transform:translateY(0);}50%{transform:translateY(-2px);}}
  @media (prefers-reduced-motion:reduce){.cz-gift-glyph--pulse,.cz-gift-claim{animation:none;}}
  `;
  const style = document.createElement('style');
  style.id = 'cz-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

/* ── window expose (HTML/inline + diğer modüllerin TDZ-güvenli erişimi) ── */
if (typeof window !== 'undefined') {
  window.czRenderBugun = czRenderBugun;
  window.czClaimHediye = czClaimHediye;
  window.czPledge = czPledge;
  window.czPledgeKept = czPledgeKept;
  window.czPusula = czPusula;
  window.czSpark = czSpark;
  window.czToplumsalKanit = czToplumsalKanit;
  window.czIltifat = czIltifat;
  window.czKisiselDokunis = czKisiselDokunis;
  window.czDayKey = czDayKey;
  window.czDaily = czDaily;
  window.czEnsureStyles = czEnsureStyles;
}
