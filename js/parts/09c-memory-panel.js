/* ═══════════════════════════════════════════════════
   09c — EMRE'NİN HAFIZASI ("Hakkımda Bildiklerin") PANELİ
   Kişiselleştirme motorunun (09a) görünmez katmanlarını kullanıcıya
   açar: P6 Yaşam Hafızası (kişiler/açık döngüler/gerçekler/önemli
   günler) + P1 karakter okuması (değerler/öz-tanımlar/savunmalar) +
   Portre sentezi (salt-okunur). Her madde tek tek silinebilir —
   "sana tutulan aynayı görme ve düzeltme hakkı".
   Erişim: ch-drawer → EMRE'NİN HAFIZASI satırı (memPanelOpen).
═══════════════════════════════════════════════════ */
import { S } from '../state.js';
import { escapeHTML, showToast } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { p } from './16-i18n-prompts.js';
import { personalizationSave } from './09a-personalization-engine.js';
import { kokenKayitVar } from './13y-koken.js';
import { dfGetWorksheetSessions, dfDeleteWorksheetSession } from './09b-depth-foundations.js';
import { ckConceptLabel } from './13b-calisma-kagidi.js';

/* p() anahtar bulamazsa anahtarın kendisini döndürür — UI'da ham anahtar
   göstermemek için boşa düşür. */
function _label(key) {
  const v = p(key);
  return (!v || v.includes('prompt.')) ? '' : v;
}

function _fmtDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(S._currentLang || 'tr', { day: 'numeric', month: 'long' });
  } catch (_) { return ''; }
}

/* ── Bölüm üreticileri — her madde {key, html} döner; key silme hedefi ── */

/* KÖKEN KAPISI (2026-08-02) — damgasız kayıt panelde de görünmez.
   DİKKAT: lifeFacts ve importantDates'in silme anahtarı HAM LİSTE
   İNDEKSİdir (_deleteItem → splice(Number(key))). Filtrelenmiş listeden
   yeniden indekslemek, kullanıcının sildiğinden BAŞKA bir kaydı sildirirdi
   — o yüzden filtre orijinal indeksi taşıyarak yapılır. */

function _itemsPeople() {
  const people = S._lifeMemory?.people || {};
  return Object.entries(people)
    .filter(([, per]) => kokenKayitVar(per))
    .sort((a, b) => (b[1].mention_count || 0) - (a[1].mention_count || 0))
    .map(([key, per]) => {
      const role = per.role && per.role !== 'unknown' ? _label('prompt.p6.role.' + per.role) : '';
      const meta = [role, t('mem.mentioned', '{n}× anıldı').replace('{n}', per.mention_count || 0)].filter(Boolean).join(' · ');
      return { key, kanit: per.kanit, html: `<strong>${escapeHTML(per.name || key)}</strong><span class="mem-item-meta">${escapeHTML(meta)}</span>` };
    });
}

function _itemsLoops() {
  return (S._lifeMemory?.openLoops || [])
    .filter(l => kokenKayitVar(l) && l.status === 'open')
    .map(l => {
      const when = l.due_date ? _fmtDate(l.due_date) : '';
      // Kanıt artık kendi satırında; başlıkta `l.kanit` fallback'i kalsaydı
      // event'i olmayan bir döngüde aynı cümle iki kez görünürdü.
      return { key: String(l.id), kanit: l.kanit, html: `${escapeHTML(l.event || '')}${when ? `<span class="mem-item-meta">${escapeHTML(when)}</span>` : ''}` };
    });
}

function _itemsFacts() {
  return (S._lifeMemory?.lifeFacts || [])
    .map((f, i) => ({ f, i }))
    .filter(({ f }) => kokenKayitVar(f))
    .map(({ f, i }) => ({ key: String(i), kanit: f.kanit, html: escapeHTML(f.value || '') }));
}

function _itemsDates() {
  return (S._lifeMemory?.importantDates || [])
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => kokenKayitVar(d))
    .map(({ d, i }) => ({ key: String(i), kanit: d.kanit, html: `${escapeHTML(d.label || '')}<span class="mem-item-meta">${escapeHTML(d.date || '')}</span>` }));
}

function _itemsValues() {
  return (S._personalityMap?.values || [])
    .map((v, i) => ({ key: String(i), html: escapeHTML(v.value || '') }));
}

function _itemsSelfDesc() {
  return (S._personalityMap?.self_descriptions || [])
    .map((d, i) => ({ key: String(i), html: `"${escapeHTML(d)}"` }));
}

function _itemsDefense() {
  return (S._personalityMap?.defense_mechanisms || [])
    .map((d, i) => {
      const lbl = _label('prompt.p1.defense_type.' + d.type) || d.type;
      return { key: String(i), html: `${escapeHTML(lbl)}<span class="mem-item-meta">${d.count || 0}×</span>` };
    });
}

function _itemsWorksheets() {
  return dfGetWorksheetSessions()
    .map((ws, i) => ({ ws, i }))
    .reverse() // en yeni üstte; key orijinal indeks kalır (silme doğru hedefi bulsun)
    .map(({ ws, i }) => ({
      key: String(i),
      html: `<strong>${escapeHTML(ckConceptLabel(ws.concept))}</strong>` +
            `<span class="mem-item-meta">${escapeHTML(_fmtDate(ws.date))}</span>` +
            (ws.step3_affirmation ? `<br>“${escapeHTML(ws.step3_affirmation)}”` : '')
    }));
}

/* Yaşayan Portre (09e) — P1-P6+kimlik+örüntünün günlük tek kanonik sentezi.
   Salt-okunur (tekil madde silinmez, motor sentezini bozar) ama BÜTÜN olarak
   sıfırlanabilir: "sana tutulan aynayı görme ve reddetme hakkı".
   NOT: sıfırlama BİLİNÇLİ dar kapsamlı — yalnız 09e portre dosyasını siler;
   P1-P6 ham sinyalleri kalır, portre zamanla yeniden doğar. Tam unutma
   "Sıfırdan Başla" (reset-user) akışındadır. */
function _renderPortre() {
  const yp = (typeof window !== 'undefined' && window.ypGetFullState) ? window.ypGetFullState() : null;
  /* BOŞ PORTRE BİR DAVETTİR, boşluk değil (İç Çalışma 02 · boşluk I).
     Kanıt kapısı (13y) kanıta bağlanamayan maddeleri siler; portre bir gün
     dolu, ertesi gün boş olabilir ve kullanıcı sebebini bilmez. Sessiz düşüş
     mühendislikte erdemdir — ANLAM katmanında kayıptır. Motor hiç konuşmadıysa
     bölüm çizilmez (o hâl "henüz" değil "hiç"), ama bir kez konuştuysa
     sessizliğin kendisi anlatılır. */
  if (!yp) return '';
  /* Dönüşüm yayı tek başına da içeriktir: mesele damıtılmadan yay yazılmış
     olabilir ve o hâlde ekranda söylenecek bir şey VARDIR — davet yalnız
     gerçekten boş portreye çizilir. */
  const bosPortre = !yp.cekirdek?.mesele && !yp.cekirdek?.donusum_yayi
    && !yp.degerler?.length && !yp.celiskiler?.length;
  if (bosPortre) {
    const konusmusMu = !!(yp.changelog || []).length;
    if (!konusmusMu) return '';
    return `
      <div class="mem-section mem-section--yp">
        <div class="mem-section-label">◈ ${t('mem.yp.label', "EMRE'NİN GÖZÜNDEN SEN")}</div>
        <div class="mem-yp-davet">${t('mem.yp.bos_davet',
          'Şu an senin sözlerine dayanan bir portre yok. Emre uydurmaz — konuştukça burayı sen doldurursun.')}</div>
      </div>`;
  }
  const changelogHTML = (yp.changelog || []).slice(-5).reverse().map(c =>
    `<div class="mem-yp-change"><span class="mem-yp-change-date">${escapeHTML(_fmtDate(c.tarih))}</span> ${escapeHTML(c.ne_ogrendim)}</div>`
  ).join('');
  return `
    <div class="mem-section mem-section--yp">
      <div class="mem-section-label">◈ ${t('mem.yp.label', "EMRE'NİN GÖZÜNDEN SEN")}</div>
      ${yp.cekirdek.mesele ? `<div class="mem-yp-mesele">${escapeHTML(yp.cekirdek.mesele)}</div>` : ''}
      ${yp.cekirdek.donusum_yayi ? `<div class="mem-yp-yay">${escapeHTML(yp.cekirdek.donusum_yayi)}</div>` : ''}
      ${_ypMaddelerHTML(yp)}
      ${changelogHTML ? `<div class="mem-section-hint mem-yp-changelog-title">${t('mem.yp.changelog', 'Bu hafta senden öğrendiklerim')}</div>${changelogHTML}` : ''}
      <button type="button" class="mem-yp-reset" id="mem-yp-reset-btn">${t('mem.yp.reset', 'Portreyi sıfırla')}</button>
    </div>`;
}

/* Portrenin tekil maddeleri — değer ve çelişki (İç Çalışma 02 · boşluk E).
   SİLİNMEZLER: bu bölümün eski gerekçesi ("tekil madde silinmek motorun
   sentezini bozar") hâlâ geçerli. Bunun yerine BEYAN edilirler — 09i'nin
   defteri (Tanıma Motoru FAZ 7) burada ikinci tüketicisini bulur: madde
   yerinde durur, susar, ve karar GERİ ALINABİLİR. Kitabın tezi gereği son
   söz kullanıcınındır; ama son söz "yok et" değil "bu ben değilim"dir.

   KÖR NOKTALAR BİLEREK YOK: onlar sohbete de panele de doğrudan basılmaz,
   yalnız Ayna Anı töreninden geçer (etik sözleşme). Buraya ham listelemek
   töreni atlatırdı. */
function _ypMaddeler(yp) {
  const id = (tur, metin) => {
    try { return window.secBeyanId?.(tur, metin) || ''; } catch (_) { return ''; }
  };
  /* Anahtarsız madde de ÇİZİLİR: kimlik 09i'den gelir, madde 09e'den.
     Bir motorun yokluğu ötekinin içeriğini yutmamalı — 09i yüklenmemişse
     kullanıcı portresini yine görür, yalnız beyan düğmesi düşer. */
  const grup = (tur, dizi, al) => (dizi || []).map((x) => {
    const metin = (al(x) || '').trim();
    return metin ? { tur, key: id(tur, metin), metin, kanit: x?.kanit } : null;
  }).filter(Boolean);
  return [
    ...grup('portre-deger',   yp.degerler,   (d) => d?.deger),
    ...grup('portre-celiski', yp.celiskiler, (c) => c?.metin),
  ];
}

function _ypMaddelerHTML(yp) {
  const maddeler = _ypMaddeler(yp);
  if (!maddeler.length) return '';
  const susmus = (key) => { try { return !!window.secBeyanVar?.(key); } catch (_) { return false; } };
  const satir = (m) => {
    const kapali = !!m.key && susmus(m.key);
    return `<div class="mem-item mem-yp-madde${kapali ? ' mem-yp-madde--sus' : ''}">
      <div class="mem-item-text">${escapeHTML(m.metin)}${
        m.kanit ? `<div class="mem-item-kanit"><span class="mem-item-kanit-label">${t('mem.kanit.label', 'SENİN SÖZÜN')}</span>“${escapeHTML(m.kanit)}”</div>` : ''
      }${kapali ? `<div class="mem-yp-sus-not">${t('mem.yp.susmus', 'Sustu. Bir daha söylemeyeceğim.')}</div>` : ''}</div>
      ${m.key ? `<button type="button" class="mem-beyan" data-tur="${escapeHTML(m.tur)}" data-key="${escapeHTML(m.key)}"
        data-geri="${kapali ? '1' : '0'}">${
        kapali ? t('mem.yp.geri_al', 'Geri al') : t('mem.yp.degilim', 'Bu ben değilim')
      }</button>` : ''}
    </div>`;
  };
  return `<div class="mem-section-hint mem-yp-madde-basi">${
    t('mem.yp.maddeler_hint', 'Bunlar senin sözlerinden okuduklarım. Tutmayan varsa söyle — susar, istediğinde geri alırsın.')
  }</div>${maddeler.map(satir).join('')}`;
}

/* Ayna Protokolü (09g) — henüz doğrulanmamış ('aday') hipotezler. Silme
   burada REDDETMEK anlamına gelir (window.apResolveHypothesis → 'reddedildi');
   ONAYLAMA (bu ben) daha ağırlıklı bir an hak eder — Ayna Anı töreninden (09h). */
function _itemsHipotezler() {
  const yp = (typeof window !== 'undefined' && window.ypGetFullState) ? window.ypGetFullState() : null;
  return (yp?.hipotezler || [])
    .filter(h => h.durum === 'aday')
    .map(h => ({
      key: h.id,
      html: `${escapeHTML(h.metin)}${h.kanit?.[0] ? `<span class="mem-item-meta">${escapeHTML(h.kanit[0])}</span>` : ''}`
    }));
}

/* Salt-okunur okumalar — eski "Beni Tanıyor" (Defterim) ekranından buraya
   katıldı. Bunlar kişiselleştirme motorunun türettiği derlemeler; tek tek
   silinemez (kullanıcı değiştikçe yeniden okunur) — Portre gibi okunur. */
function _readInsights() {
  const out = [];
  const prof = S._userProfile || {};
  const pm   = S._personalityMap || {};
  if (prof.core_issue)           out.push({ label: t('mem.insight.core', 'ÇEKİRDEK MESELE'),  text: prof.core_issue });
  if (prof.communication?.style) out.push({ label: t('mem.insight.comm', 'İLETİŞİM STİLİN'),  text: prof.communication.style });
  if (pm.communication?.preferred_time) out.push({ label: t('mem.insight.time', 'EN AKTİF ZAMANIN'), text: pm.communication.preferred_time });
  return out;
}

/* Bölümler — etiket/ipucu i18n sözlüğünden RENDER ANINDA okunur (modül-yükünde
   DONMASIN); kind + items fonksiyon-ref iskeleti dil-bağımsız. */
const _SECTIONS = [
  { kind: 'person',   lbl: 'mem.sec.person.label',   hint: 'mem.sec.person.hint',   items: _itemsPeople },
  { kind: 'loop',     lbl: 'mem.sec.loop.label',     hint: 'mem.sec.loop.hint',     items: _itemsLoops },
  { kind: 'fact',     lbl: 'mem.sec.fact.label',     hint: 'mem.sec.fact.hint',     items: _itemsFacts },
  { kind: 'date',     lbl: 'mem.sec.date.label',     hint: '',                      items: _itemsDates },
  { kind: 'value',    lbl: 'mem.sec.value.label',    hint: 'mem.sec.value.hint',    items: _itemsValues },
  { kind: 'selfdesc', lbl: 'mem.sec.selfdesc.label', hint: 'mem.sec.selfdesc.hint', items: _itemsSelfDesc },
  { kind: 'defense',  lbl: 'mem.sec.defense.label',  hint: 'mem.sec.defense.hint',  items: _itemsDefense },
  { kind: 'kagit',    lbl: 'mem.sec.kagit.label',    hint: 'mem.sec.kagit.hint',    items: _itemsWorksheets },
  { kind: 'hipotez',  lbl: 'mem.sec.hipotez.label',  hint: 'mem.sec.hipotez.hint',  items: _itemsHipotezler },
  { kind: 'hatirla',  lbl: 'mem.sec.hatirla.label',  hint: 'mem.sec.hatirla.hint',  items: _itemsHatirla },
];

/* 09j — kullanıcının kendi mühürlediği sözler. Bu bölümün öbürlerinden farkı
   kökenidir: geri kalanı Emre'nin ÇIKARIMI, bu BEYAN. O yüzden metin kanıt
   satırında değil, maddenin kendisinde durur — kanıtı kendisidir. */
function _itemsHatirla() {
  let l = [];
  try { l = window.htListe?.() || []; } catch (_) { l = []; }
  return l.map(x => ({
    key: x.id,
    html: `<span class="mem-hatirla-soz">“${escapeHTML(x.text)}”</span>` +
          `<span class="mem-hatirla-gun">${escapeHTML(x.dayKey || '')}</span>`,
  }));
}

function _renderBody() {
  const c = S._portre;
  const porHTML = (c?.confirmed && (c.baslik || c.portrait)) ? `
    <div class="mem-section mem-section--portre">
      <div class="mem-section-label">◈ ${t('mem.portre.label', 'PORTRE')}</div>
      ${c.baslik ? `<div class="mem-portre-baslik">"${escapeHTML(c.baslik)}"</div>` : ''}
      ${c.portrait ? `<div class="mem-portre-portrait">${escapeHTML(c.portrait)}</div>` : ''}
      <div class="mem-section-hint">${t('mem.portre.hint', 'Kendi yazdığın portre — Portrem ekranından düzenlenir.')}</div>
    </div>` : '';

  const ypHTML = _renderPortre();

  const insights = _readInsights();
  const insightsHTML = insights.length ? `
    <div class="mem-section mem-section--read">
      <div class="mem-section-label">◈ ${t('mem.read.label', "EMRE'NİN OKUDUKLARI")}</div>
      <div class="mem-section-hint">${t('mem.read.hint', 'Konuşmalardan çıkardığı okuma — sen değiştikçe bu da değişir.')}</div>
      ${insights.map(i => `<div class="mem-read-item">
        <div class="mem-read-label">${escapeHTML(i.label)}</div>
        <div class="mem-read-text">${escapeHTML(i.text)}</div>
      </div>`).join('')}
    </div>` : '';

  const sectionsHTML = _SECTIONS.map(sec => {
    const items = sec.items();
    if (!items.length) return '';
    const hint = sec.hint ? t(sec.hint) : '';
    return `<div class="mem-section">
      <div class="mem-section-label">${t(sec.lbl)}</div>
      ${hint ? `<div class="mem-section-hint">${hint}</div>` : ''}
      ${items.map(it => `<div class="mem-item">
        <div class="mem-item-text">${it.html}${it.kanit ? `<div class="mem-item-kanit"><span class="mem-item-kanit-label">${t('mem.kanit.label', 'SENİN SÖZÜN')}</span>“${escapeHTML(it.kanit)}”</div>` : ''}</div>
        <button class="mem-del" data-kind="${sec.kind}" data-key="${escapeHTML(it.key)}" aria-label="Sil" title="${t('mem.delete', 'Bu kaydı sil')}">✕</button>
      </div>`).join('')}
    </div>`;
  }).filter(Boolean).join('');

  if (!porHTML && !ypHTML && !insightsHTML && !sectionsHTML) {
    return `<div class="mem-empty">${t('mem.empty', 'Henüz seninle ilgili hafıza birikmedi.<br>Konuştukça Emre seni tanır — burada görünür.')}</div>`;
  }
  return porHTML + ypHTML + insightsHTML + sectionsHTML;
}

function _persist() {
  try { personalizationSave(); } catch (e) { console.warn('memPanel save:', e); }
}

/** Silinen P1 çıkarımını beyan defterine de yazar (09i). Defter yoksa sessizce
 *  düşer — silme yine çalışır, yalnız kalıcılık zayıflar (asla bloklama). */
function _p1Beyan(tur, metin) {
  try {
    const id = window.secBeyanId?.(tur, metin);
    if (id) window.secBeyanAzalt?.(tur, id);
  } catch (_) {}
}

function _deleteItem(kind, key) {
  const lm = S._lifeMemory || {};
  const pm = S._personalityMap || {};
  switch (kind) {
    /* Mühür geri alınabilir (09i'nin beyan felsefesi): kullanıcı ne
       mühürleyeceğine karar veriyorsa, çözmeye de o karar verir. */
    /* Sonuç DÖNER — çağıran kapı (aşağıda) bununla paneli yeniden çizer ve
       toast basar. Bare `return` yutulan bir `undefined`dır: storage temizlenir
       ama satır ekranda kalır, kullanıcı hiçbir şey olmadığını sanır. */
    case 'hatirla':  { try { return !!window.htUnpin?.(key); } catch (_) { return false; } }
    case 'person':   delete lm.people?.[key]; break;
    case 'loop': {
      const i = (lm.openLoops || []).findIndex(l => String(l.id) === key);
      if (i !== -1) lm.openLoops.splice(i, 1);
      break;
    }
    case 'fact':     (lm.lifeFacts || []).splice(Number(key), 1); break;
    case 'date':     (lm.importantDates || []).splice(Number(key), 1); break;
    /* P1 ÇIKARIMLARI — silmek tek başına yetmez: bu üç liste her mesajda
       yeniden hasat edilir (09a p1AnalyzePersonality), yani kullanıcı siler,
       motor ertesi gün aynısını geri koyardı. "Sildim ama geri geldi" bir
       arıza değil, GÜVEN kaybıdır. O yüzden silmenin yanına beyan da yazılır:
       gider VE bir daha üretilmez. Olguda (kişi/döngü/gerçek) buna gerek yok,
       onlar yalnız kullanıcı söylerse doğar. */
    case 'value': {
      const v = (pm.values || [])[Number(key)];
      _p1Beyan('p1-deger', v?.value);
      (pm.values || []).splice(Number(key), 1);
      break;
    }
    case 'selfdesc': {
      _p1Beyan('p1-oztanim', (pm.self_descriptions || [])[Number(key)]);
      (pm.self_descriptions || []).splice(Number(key), 1);
      break;
    }
    case 'defense': {
      const d = (pm.defense_mechanisms || [])[Number(key)];
      _p1Beyan('p1-savunma', d?.type);
      (pm.defense_mechanisms || []).splice(Number(key), 1);
      break;
    }
    case 'kagit':    return dfDeleteWorksheetSession(Number(key)); // kendi save'ini yapar
    case 'hipotez':  return !!window.apResolveHypothesis?.(key, 'reddedildi'); // 09e'nin yp dosyasına yazar
    default: return false;
  }
  return true;
}

export function memPanelOpen() {
  memPanelClose(); // çift açılmayı önle
  window.wtOverlayOpen?.('hafiza');   // Kullanım Nabzı (00f)
  const panel = document.createElement('div');
  panel.id = 'mem-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', t('aria.emre_memory', "Emre'nin hafızası — hakkında bildikleri"));
  panel.innerHTML = `
    <div class="mem-backdrop"></div>
    <div class="mem-sheet">
      <div class="mem-head">
        <div>
          <div class="mem-title">◈ ${t('mem.title', "EMRE'NİN HAFIZASI")}</div>
          <div class="mem-sub">${t('mem.sub', 'Hakkında bildikleri — sana tutulan ayna. Yanlışsa sil, Emre unutur.')}</div>
        </div>
        <button class="mem-close" aria-label="Kapat">✕</button>
      </div>
      <div class="mem-body">${_renderBody()}</div>
    </div>`;
  document.body.appendChild(panel);

  panel.querySelector('.mem-backdrop').addEventListener('click', memPanelClose);
  panel.querySelector('.mem-close').addEventListener('click', memPanelClose);

  // Silme — event delegation (isimlerde tırnak/özel karakter güvenliği)
  panel.querySelector('.mem-body').addEventListener('click', (e) => {
    if (e.target.closest('#mem-yp-reset-btn')) {
      try { window.ypResetPortre?.(); } catch (_) {}
      panel.querySelector('.mem-body').innerHTML = _renderBody();
      showToast(t('mem.yp.reset_done', 'Portre sıfırlandı. Emre seni yeniden okumaya başlayacak.'));
      return;
    }
    /* Beyan — silme DEĞİL: madde durur, susar; kayıt 09i'nin defterinde
       (etw_secici_v1_<uid>), yani cihaz-yerel ve geri alınabilir. */
    const beyanBtn = e.target.closest('.mem-beyan');
    if (beyanBtn) {
      const { tur, key, geri } = beyanBtn.dataset;
      let ok = false;
      try {
        ok = geri === '1' ? !!window.secBeyanGeriAl?.(key) : !!window.secBeyanAzalt?.(tur, key);
      } catch (_) {}
      if (ok) {
        panel.querySelector('.mem-body').innerHTML = _renderBody();
        showToast(geri === '1'
          ? t('mem.yp.geri_alindi', 'Geri aldın. Emre bunu yeniden söyleyebilir.')
          : t('mem.yp.beyan_alindi', 'Anlaşıldı. Emre bunu bir daha söylemeyecek.'));
      }
      return;
    }

    const btn = e.target.closest('.mem-del');
    if (!btn) return;
    if (_deleteItem(btn.dataset.kind, btn.dataset.key)) {
      _persist();
      panel.querySelector('.mem-body').innerHTML = _renderBody();
      showToast(t('mem.deleted', 'Silindi. Emre bunu artık hatırlamayacak.'));
    }
  });

  requestAnimationFrame(() => panel.classList.add('open'));
  document.body.style.overflow = 'hidden';
}

export function memPanelClose() {
  const panel = document.getElementById('mem-panel');
  if (!panel) return;
  window.wtOverlayClose?.('hafiza');   // Kullanım Nabzı (00f)
  panel.remove();
  document.body.style.overflow = '';
}

/* Inline onclick erişimi (ch-drawer satırı) — minify'a dayanıklı */
window.memPanelOpen  = memPanelOpen;
window.memPanelClose = memPanelClose;
