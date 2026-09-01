/* ═══════════════════════════════════════════════════════════════════
   10m — ENGEL ATLASI & ÖZ-TANI (6 Perde · 6 Zehir · 7 Tuzak)
   ───────────────────────────────────────────────────────────────────
   FELSEFE: Zihniyet Devrimi'nde hayalle aramıza çekilen 6 Perde
   (s.345), hayatı zehirleyen 6 Zehir (s.349) ve başarı/mutluluk
   yolundaki 7 Tuzak (s.471). Her birinin bir panzehiri/yol haritası var.

   ÖZ-TANI: Derinlik/Temeller profilleri (09b) + direnç günlüğü
   sinyallerinden hangi engelin en aktif olduğunu yüzeye çıkarır ve
   panzehir + Yolculuk / Geçiş Alanı kartı önerir (köprüler).
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { showToast } from './00a-infrastructure.js';
import { ENGELLER, HASIM_BOSSES, startSeferForBoss } from './10h-w2-library-challenges.js';
import { t } from './15-i18n.js';

function _allObstacles() {
  return [...ENGELLER.perde, ...ENGELLER.zehir, ...ENGELLER.tuzak];
}

/* Bir engelin "aktivasyon" skoru: kök temel/derinliklerin düşüklüğü +
   direnç günlüğü tema eşleşmeleri. 0 = sinyal yok. */
function _activation(ob) {
  let sum = 0, n = 0;
  for (const k of (ob.roots || [])) {
    const obj = S._foundationsProfile?.[k] || S._depthProfile?.[k];
    if (obj && typeof obj.score === 'number' && obj.signals_count >= 1) {
      sum += (100 - obj.score); n++;
    }
  }
  let base = n ? sum / n : 0;
  const rLog = S._resistanceLog || [];
  const matches = rLog.filter(r => {
    const p = (r.pattern || '').toLowerCase();
    return p.includes(ob.theme) || (ob.bossId && p.includes(ob.bossId));
  }).length;
  base += Math.min(30, matches * 10);
  return Math.round(base);
}

/* ══════════════════════════════════════════════════════════════
   OVERLAY
══════════════════════════════════════════════════════════════ */
export function engOpen() {
  engRunDiagnosis();
  engRenderAtlas();
  const overlay = document.getElementById('eng-overlay');
  if (overlay) { overlay.classList.add('open'); overlay.style.display = 'flex'; }
}

export function engClose() {
  const overlay = document.getElementById('eng-overlay');
  if (overlay) { overlay.classList.remove('open'); overlay.style.display = 'none'; }
}

/* ══════════════════════════════════════════════════════════════
   ÖZ-TANI
══════════════════════════════════════════════════════════════ */
export function engRunDiagnosis() {
  const el = document.getElementById('eng-diagnosis');
  if (!el) return;

  const scored = _allObstacles()
    .map(ob => ({ ob, score: _activation(ob) }))
    .filter(x => x.score > 0);

  // Tema bazında tekilleştir (en yüksek skoru tut)
  const byTheme = new Map();
  for (const x of scored) {
    const cur = byTheme.get(x.ob.theme);
    if (!cur || x.score > cur.score) byTheme.set(x.ob.theme, x);
  }
  const top = [...byTheme.values()].sort((a, b) => b.score - a.score).slice(0, 3);
  /* Nabza yazar ama DEFTERE yazmaz: teşhis ekran açılışında otomatik koşar
     (engOpen), kullanıcının emeği değildir — "emek sayar, bakış saymaz"
     kararı (2026-08-19). Atlas'ın emeği köprü kurduğu yerde sayılır. */
  try { window.wtLogRitus?.('engel-atlasi', 'basladi', { n: top.length }); } catch (_) {}

  if (!top.length) {
    el.innerHTML = `<div class="eng-diag-empty">
      <div class="eng-diag-empty-glyph">◇</div>
      <div>${t('eng.diag_empty', 'Henüz yeterli sinyal yok. Emre ile konuştukça hangi engelin seni tuttuğu netleşir. Aşağıdan engelleri inceleyebilirsin.')}</div>
    </div>`;
    return;
  }

  el.innerHTML = `
    <div class="eng-diag-eyebrow">${t('eng.diag_eyebrow', 'ÖZ-TANI · Şu an seni en çok tutan')}</div>
    ${top.map((x, i) => {
      const ob = x.ob;
      const boss = ob.bossId ? HASIM_BOSSES.find(b => b.id === ob.bossId) : null;
      return `<div class="eng-diag-card${i === 0 ? ' eng-diag-card--top' : ''}">
        <div class="eng-diag-head">
          <span class="eng-diag-rank">${i + 1}</span>
          <span class="eng-diag-name">${ob.name}</span>
          <span class="eng-diag-fw">${ob.framework}</span>
        </div>
        <div class="eng-diag-panzehir">${ob.panzehir}</div>
        <div class="eng-diag-actions">
          <button class="eng-act-btn eng-act-btn--gold" onclick="engToGecisCard('${ob.id}')">${t('eng.design_btn', '◆ Bu kişiyi tasarla')}</button>
          ${boss ? `<button class="eng-act-btn" onclick="engStartSefer('${boss.id}')">${t('eng.journey_btn', '◇ {name} yolculuğu').replace('{name}', boss.name)}</button>` : ''}
        </div>
      </div>`;
    }).join('')}`;
}

/* ══════════════════════════════════════════════════════════════
   ATLAS — tüm engeller (gruplu, açılır)
══════════════════════════════════════════════════════════════ */
export function engRenderAtlas() {
  const el = document.getElementById('eng-atlas');
  if (!el) return;
  const groups = [
    { key: 'perde', label: t('eng.perde_label', '6 PERDE'), sub: t('eng.perde_sub', 'Hayalinle arana çekilen perdeler'), items: ENGELLER.perde },
    { key: 'zehir', label: t('eng.zehir_label', '6 ZEHİR'), sub: t('eng.zehir_sub', 'Hayatını zehirleyen alışkanlıklar'), items: ENGELLER.zehir },
    { key: 'tuzak', label: t('eng.tuzak_label', '7 TUZAK'), sub: t('eng.tuzak_sub', 'Başarı yolundaki tuzaklar'), items: ENGELLER.tuzak },
  ];
  el.innerHTML = groups.map(g => `
    <div class="eng-group">
      <div class="eng-group-head"><span class="eng-group-label">${g.label}</span><span class="eng-group-sub">${g.sub}</span></div>
      ${g.items.map(ob => `
        <div class="eng-item" id="eng-item-${ob.id}">
          <button class="eng-item-head" onclick="engToggle('${ob.id}')">
            <span class="eng-item-name">${ob.name}</span>
            <span class="eng-item-sub">${ob.sub}</span>
            <span class="eng-item-chev">+</span>
          </button>
          <div class="eng-item-body" style="display:none;">
            <div class="eng-item-panzehir-label">${t('eng.panzehir_label', 'PANZEHİR / YOL HARİTASI')}</div>
            <div class="eng-item-panzehir">${ob.panzehir}</div>
            ${_meclisSuretlerHTML(ob.id)}
            <div class="eng-diag-actions">
              <button class="eng-act-btn eng-act-btn--gold" onclick="engToGecisCard('${ob.id}')">${t('eng.design_btn', '◆ Bu kişiyi tasarla')}</button>
              ${ob.bossId ? `<button class="eng-act-btn" onclick="engStartSefer('${ob.bossId}')">${t('eng.journey_start_btn', '◇ Yolculuk başlat')}</button>` : ''}
            </div>
          </div>
        </div>`).join('')}
    </div>`).join('');
}

/* ── İç Meclis köprüsü: bu engeli taşıyan (adlanmış) suretler ──────────
   S._suretler İç Meclis'in (10p) doldurduğu paylaşılan state — import
   gerekmez, doğrudan okunur. */
function _meclisSuretlerHTML(obId) {
  const suretler = (S._suretler || []).filter(s => s.engel_id === obId && (s.hal === 'adlandi' || s.hal === 'butunlesti'));
  if (!suretler.length) return '';
  return `
    <div class="eng-item-meclis-label">${t('eng.meclis_label', 'BU ENGELİ TAŞIYAN SURETLERİN')}</div>
    <div class="eng-item-meclis-list">
      ${suretler.map(s => `<button class="eng-act-btn" onclick="engJumpToSuret('${s.slug}')">${s.hal === 'butunlesti' ? '✦' : '◆'} ${s.ad || s.unvan || ''}</button>`).join('')}
    </div>`;
}

/** Engel Atlası'ndan doğrudan Meclis'teki suretin Huzura Çıkış törenine atlar. */
export function engJumpToSuret(slug) {
  engClose();
  try {
    window.switchView?.('meclis');
    setTimeout(() => { try { window.openSuretCard?.(slug); } catch (_) {} }, 350);
  } catch (_) {}
}

export function engToggle(id) {
  const item = document.getElementById(`eng-item-${id}`);
  if (!item) return;
  const body = item.querySelector('.eng-item-body');
  const chev = item.querySelector('.eng-item-chev');
  if (!body) return;
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  if (chev) chev.textContent = open ? '+' : '−';
}

/* ══════════════════════════════════════════════════════════════
   KÖPRÜLER
══════════════════════════════════════════════════════════════ */
export function engStartSefer(bossId) {
  engClose();
  try { startSeferForBoss(bossId); } catch (e) { showToast(t('eng.journey_fail', 'Yolculuk başlatılamadı.')); }
}

export function engToGecisCard(obstacleId) {
  const ob = _allObstacles().find(o => o.id === obstacleId);
  if (!ob) return;
  engClose();
  try {
    window.oikSeedDraft?.({ baslik: ob.personSeed || '' });
    if (window.oikOpenDesign) {
      window.oikOpenDesign();
      showToast(t('eng.gecis_toast', '"{seed}" — AI ile doldurup mühürle.').replace('{seed}', ob.personSeed));
    }
  } catch (_) {}
}
