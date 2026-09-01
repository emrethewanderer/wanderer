/* ═══════════════════════════════════════════════════════════════════
   GÖZLEMEVİ (13q) — "Gezginlerin ayak izleri, usturlabın kadranında"

   FELSEFE: Kitabın kullanıcıya öğrettiği ilkeyi ürün kendine uygular:
   "Önce gör, sonra dönüştür." Emre hangi ekranın yaşadığını, hangi
   törenin ihmal edildiğini SEZGİYLE değil KADRANDAN okur.

   Veri: 00f Kullanım Nabzı → usage_events (mig 033) → admin_usage_report
   RPC'si (SECURITY DEFINER, is_admin kapılı) tüm kadranı TEK çağrıda döner.

   Bölümler: kadran kartları · günlük trend · Zaman Haritası (altın=ekran,
   lapis=tören) · Nabız Saati (7×24) · Akış · Sohbet Derinliği · Gezginler ·
   sessiz gezginler · EMRE'NİN TAVSİYELERİ (LLM analist, usage_insights'a kalıcı).

   Yalnız admin sayfasında dinamik import edilir (07 switchAdmin) —
   kullanıcı bundle'ının sıcak yoluna binmez.
═══════════════════════════════════════════════════════════════════ */
import { sb, SUMMARY_MODEL } from '../config.js';
import { escapeHTML as esc, showToast } from './00a-infrastructure.js';
import { callLLM } from './04-llm-hero-history.js';
import { p } from './16-i18n-prompts.js';

/* ── ekran adları sözlüğü (view + tören) — bilinmeyen ad kendisi kalır ── */
const GZ_EKRAN = {
  bugun: 'Bugün', chat: 'Sohbet (Wanderer)', history: 'Geçmiş Günler',
  notebook: 'Not Defteri', library: 'Kitaplık', challenge: 'Engeller',
  manifesto: 'Manifesto', muhrum: 'Mühürlerim', hasimlar: 'İç Meclis',
  isik: 'Alfabe Işık', dinlenme: 'Dinlenme', oik: 'Olmak İstediğin Kişi',
  arketipler: 'Kişiler', kisilerim: 'Kişilerim', portre: 'Portrem',
  'kk-mine': 'Kendi Koleksiyonum', sosyal: 'Kişilerin Kişileri',
  sub: 'Abonelik', profile: 'Profil', roadmap: 'Yol Haritası',
  timeline: 'Yolculuk Haritası', yolculuk: 'Yolculuk Haritası',
  summaries: 'Özetler', cards: 'Dönüşüm Kartları', ayna: 'Ayna',
  konusma: 'Kendinle Konuşmak', degerlendirme: 'Değerlendirme',
  hayalseans: 'Hayal Seansı', admin: 'Yönetim',
  'seri-muhru': 'Seri Mührü · GELDİN', yol: 'Yol Ekranı',
  bakis: 'Bakış · GÖRDÜN', 'aksam-toreni': 'Akşam Töreni',
  meclis: 'Haftalık Meclis', 'ayin-filmi': 'Ayın Filmi',
  hafiza: "Emre'nin Hafızası", 'kart-detay': 'Kart Detayı',
  'anin-ocagi': 'Anın Ocağı', 'gunluk-ritus': 'Armağan + Söz',
  'imge-kapisi': 'İmge Kapısı',
};
const _ad = s => GZ_EKRAN[s] || s || '—';
const GUNLER = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cts', 'Paz']; // ISODOW 1-7

/* ── mod adları (FAZ 4 — Mod Nabzı) — AI_MODES ile birebir, ayrı sözlük
   tutuyoruz çünkü GZ_EKRAN kalıbı gibi bu da yalnız admin görünümü ── */
const GZ_MOD = {
  soft: 'Fark Et', direct: 'Yüzleş', reflective: 'Tasarla',
  celebrate: 'Şahit', pattern: 'Örüntü', depth: 'Derinlik',
};
const _modAd = m => GZ_MOD[m] || m || '—';

let _period  = 30;    // 7 | 30 | 90
let _report  = null;  // son RPC sonucu
let _insight = null;  // son usage_insights satırı
let _busy    = false;

/* ── biçimleyiciler ── */
function _sure(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  if (sec < 60) return sec + ' sn';
  const m = Math.round(sec / 60);
  if (m < 60) return m + ' dk';
  return Math.floor(m / 60) + ' sa ' + (m % 60) + ' dk';
}
function _tarih(x) {
  try { return new Date(x).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }); }
  catch (_) { return '—'; }
}
/* Mini markdown (yalnız tavsiye gövdesi): önce escape, sonra **b** / başlık / madde */
function _md(txt) {
  let h = esc(String(txt || ''));
  h = h.replace(/^#{1,3}\s*(.+)$/gm, '<div class="gz-md-h">$1</div>');
  h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  h = h.replace(/^[-•]\s+/gm, '<span class="gz-md-dot">◆</span> ');
  return h.replace(/\n/g, '<br>');
}

/* ── stiller (yalnız admin sayfası; bundle CSS'e girmez) ── */
function gzEnsureStyles() {
  if (document.getElementById('gz-styles')) return;
  const st = document.createElement('style');
  st.id = 'gz-styles';
  st.textContent = `
  .gz-chips{display:flex;gap:8px;margin:4px 0 22px;}
  .gz-chip{padding:6px 14px;border:1px solid var(--border);border-radius:20px;background:none;
    color:var(--text-mid);font-size:11px;letter-spacing:1.5px;cursor:pointer;transition:all .3s var(--ease-out,ease);}
  .gz-chip--on{border-color:var(--gold);color:var(--gold);}
  .gz-sec{font-size:9px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin:30px 0 12px;}
  .gz-empty{font-size:13px;color:var(--text-dim);font-style:italic;line-height:1.7;padding:14px 0;}
  .gz-trend{display:flex;align-items:flex-end;gap:2px;height:44px;margin-top:10px;}
  .gz-trend i{flex:1;min-width:2px;background:linear-gradient(180deg,var(--gold),rgba(245,166,35,.25));
    border-radius:1px 1px 0 0;opacity:.85;}
  .gz-bar-row{display:flex;align-items:center;gap:10px;margin-bottom:9px;}
  .gz-bar-name{width:158px;flex:none;font-size:12px;color:var(--text-mid);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .gz-bar-track{flex:1;height:10px;border-radius:5px;background:rgba(255,255,255,.045);overflow:hidden;}
  /* display:block ŞART — çubuk bir <span>, yani varsayılanı inline'dır ve
     inline elemente width/height UYGULANMAZ: kural olmadan her çubuk 0×0
     çizilir, track dolu görünse de içi boş kalır. (İç Çalışma 02 FAZ 2
     harness'ında yakalandı; Mod Nabzı ve Zaman Haritası da bundan sessizce
     etkileniyordu — build ve testler yeşilken.) */
  .gz-bar{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,rgba(245,166,35,.55),var(--gold));min-width:2px;}
  .gz-bar--lapis{background:linear-gradient(90deg,rgba(66,99,204,.5),#5a8ad8);}
  .gz-bar-val{width:118px;flex:none;font-size:11px;color:var(--text-dim);text-align:right;}
  .gz-heat{display:grid;grid-template-columns:34px repeat(24,1fr);gap:2px;margin-top:8px;}
  .gz-heat-lbl{font-size:9px;color:var(--text-dim);align-self:center;}
  .gz-heat-cell{aspect-ratio:1;border-radius:2px;background:rgba(255,255,255,.035);}
  .gz-heat-x{grid-column:span 6;font-size:9px;color:var(--text-dim);margin-top:2px;}
  .gz-flow{font-size:12.5px;color:var(--text-mid);line-height:2.1;}
  .gz-flow b{color:var(--gold-quiet);font-weight:500;}
  .gz-flow .gz-n{color:var(--text-dim);font-size:11px;}
  .gz-tbl{width:100%;border-collapse:collapse;font-size:12px;}
  .gz-tbl th{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text-dim);
    text-align:left;padding:6px 8px;border-bottom:1px solid var(--border);font-weight:500;}
  .gz-tbl td{padding:8px;border-bottom:1px solid rgba(255,255,255,.05);color:var(--text-mid);}
  .gz-tbl td:first-child{color:var(--text-hi,#eee);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .gz-silent{border:1px solid rgba(224,159,62,.30);border-radius:10px;padding:12px 14px;margin-bottom:8px;
    font-size:12.5px;color:var(--text-mid);display:flex;justify-content:space-between;gap:10px;align-items:baseline;}
  .gz-silent b{color:#e09f3e;font-weight:500;}
  .gz-insight{border:1px solid var(--border);border-radius:12px;padding:18px;margin-top:10px;}
  .gz-insight-meta{font-size:10px;color:var(--text-dim);letter-spacing:1px;margin-bottom:12px;}
  .gz-insight-body{font-size:13.5px;color:var(--text-mid);line-height:1.85;}
  .gz-insight-body .gz-md-h{color:var(--gold-quiet);font-size:12px;letter-spacing:1.5px;margin:14px 0 4px;text-transform:uppercase;}
  .gz-insight-body b{color:var(--text-hi,#eee);font-weight:600;}
  .gz-md-dot{color:var(--gold-quiet);font-size:9px;}
  .gz-stale{font-size:12px;color:#e09f3e;font-style:italic;margin:10px 0 0;}
  `;
  document.head.appendChild(st);
}

/* ════════════════════════════════════════════════════════════════
   ANA RENDER — switchAdmin('gozlemevi') → buradan
════════════════════════════════════════════════════════════════ */
export async function renderGozlemeviAdmin() {
  gzEnsureStyles();
  const host = document.getElementById('gozlemevi-host');
  if (!host) return;
  /* Panelin dili SABİT Türkçedir (admin yüzeyi, t() geçmez) ama sayfanın
     kökü lang="en"dir — ve `.gz-sec` başlıkları CSS'te uppercase. Tarayıcı
     büyük harfi sayfa diline göre üretir: lang="en" altında "Eşiğin" →
     "EŞIĞIN", "gezgin" → "GEZGIN" (noktasız I). [[buyuk-harf-dil-kapisi]]
     gotcha'sının CSS hâli — orada çare localeUpper'dı, burada tek doğru
     kaynak elementin kendi dilidir. Host'a bir kez yazılır, tüm kartları
     kapsar. */
  host.setAttribute('lang', 'tr');
  if (!host.dataset.bound) {
    host.dataset.bound = '1';
    host.addEventListener('click', _onClick);
  }
  host.innerHTML = '<div class="gz-empty">Kadran okunuyor…</div>';

  const { data, error } = await sb.rpc('admin_usage_report', { p_days: _period });
  if (error) {
    host.innerHTML = `<div class="gz-empty">Kadran açılamadı: ${esc(error.message || '')}<br><br>
      <span style="color:var(--gold);">Not:</span> <code style="font-size:11px;">migrations/000_wanderer_schema.sql</code>
      Supabase SQL editöründe çalıştırılmalı (ELLE).</div>`;
    return;
  }
  _report = data || {};
  host.innerHTML = _renderAll(_report);
  _loadSonda();
  _loadInsight();
}

function _onClick(e) {
  const chip = e.target.closest('[data-gz-period]');
  if (chip) {
    _period = parseInt(chip.dataset.gzPeriod, 10) || 30;
    renderGozlemeviAdmin();
    return;
  }
  if (e.target.closest('#gz-yorumla')) gzYorumla();
}

function _renderAll(d) {
  const ov = d.overview || {};
  const active = ov.active_users || 0;
  const chips = [7, 30, 90].map(p =>
    `<button type="button" class="gz-chip${p === _period ? ' gz-chip--on' : ''}" data-gz-period="${p}">${p} GÜN</button>`
  ).join('');

  if (!active) {
    return `<div class="gz-chips">${chips}</div>
      <div class="gz-empty">Kadran henüz sessiz. Gezginler yürüdükçe izleri burada birikecek.</div>
      ${_insightShell()}`;
  }

  return `
    <div class="gz-chips">${chips}</div>
    ${_kadran(ov)}
    ${_trend(d.trend)}
    ${_zamanHaritasi(d.screens, active)}
    ${_nabizSaati(d.heatmap)}
    ${_akis(d.transitions)}
    ${_sohbetDerinligi(d.chat_depth)}
    ${_modNabzi(d.mode_pulse)}
    ${_hafizaNabzi(d.memory_pulse)}
    ${_gecikmeNabzi(d.latency_pulse)}
    ${_sesNabzi(d.model_pulse)}
    ${_baglamNabzi(d.ctx_pulse)}
    ${_koleksiyonNabzi(d.kart_pulse)}
    ${_ritusNabzi(d.ritus_pulse)}
    ${_esikNabzi(d.esik_pulse)}
    ${_duyguNabzi(d.duygu_pulse)}
    ${_donusumNabzi(d.kimlik_pulse, d.ritus_pulse)}
    ${_sondaShell(d)}
    ${_gezginler(d.users)}
    ${_sessizler(d.silent_users)}
    ${_insightShell()}`;
}

/* ── 1. kadran kartları ── */
function _kadran(ov) {
  const stat = (n, l) => `<div class="stat-block" style="border:1px solid var(--border);">
    <div class="stat-num">${n}</div><div class="stat-label">${l}</div></div>`;
  return `<div class="admin-stat-row">
    ${stat(ov.active_users || 0, 'Aktif Gezgin')}
    ${stat(_sure(ov.total_view_seconds), 'Toplam Süre')}
    ${stat(ov.sessions || 0, 'Oturum')}
    ${stat(_sure(ov.avg_session_seconds), 'Ort. Oturum')}
  </div>`;
}

/* ── 2. günlük trend (eksik günler 0 dolgulu) ── */
function _trend(trend) {
  const byDay = {};
  (trend || []).forEach(t => { byDay[t.day] = t; });
  const days = [];
  for (let i = _period - 1; i >= 0; i--) {
    // RPC günleri Europe/Istanbul'a göre üretir — anahtar da TR günüyle kurulmalı
    // (toISOString UTC'dir: TR'de gece 00-03 arası son gün kaybolur; en-CA = YYYY-MM-DD)
    const key = new Date(Date.now() - i * 86400000)
      .toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
    days.push(byDay[key] || { day: key, seconds: 0, users: 0 });
  }
  const max = Math.max(1, ...days.map(x => x.seconds || 0));
  const bars = days.map(x =>
    `<i style="height:${Math.max(3, Math.round((x.seconds || 0) / max * 100))}%"
        title="${_tarih(x.day)} · ${_sure(x.seconds)} · ${x.users || 0} gezgin"></i>`).join('');
  return `<div class="gz-sec">Günlük Nabız — son ${_period} gün</div><div class="gz-trend">${bars}</div>`;
}

/* ── 3. Zaman Haritası — ekranlar (altın) + törenler (lapis) ── */
function _zamanHaritasi(screens, activeUsers) {
  const list = Array.isArray(screens) ? screens : [];
  const views = list.filter(s => s.kind === 'view').slice(0, 14);
  const overs = list.filter(s => s.kind === 'overlay');
  const maxV = Math.max(1, ...views.map(s => s.seconds || 0));
  const maxO = Math.max(1, ...overs.map(s => s.seconds || 0));
  const row = (s, max, lapis) => `<div class="gz-bar-row">
    <span class="gz-bar-name" title="${esc(s.screen)}">${esc(_ad(s.screen))}</span>
    <span class="gz-bar-track"><span class="gz-bar${lapis ? ' gz-bar--lapis' : ''}"
      style="width:${Math.max(1.5, (s.seconds || 0) / max * 100)}%"></span></span>
    <span class="gz-bar-val">${_sure(s.seconds)} · ${s.users || 0} kişi${lapis && activeUsers
      ? ' · %' + Math.round((s.users || 0) / activeUsers * 100) : ''}</span>
  </div>`;
  let html = `<div class="gz-sec">Zaman Haritası — gezginler nerede yaşıyor</div>`;
  html += views.length ? views.map(s => row(s, maxV, false)).join('') : '<div class="gz-empty">Henüz iz yok.</div>';
  if (overs.length) {
    html += `<div class="gz-sec">Törenler — katılım oranıyla</div>`;
    html += overs.map(s => row(s, maxO, true)).join('');
  }
  return html;
}

/* ── 4. Nabız Saati — 7×24 ısı ızgarası (TR saati) ── */
function _nabizSaati(heatmap) {
  const map = {};
  let max = 1;
  (heatmap || []).forEach(h => {
    map[h.dow + '_' + h.hour] = h.seconds;
    if (h.seconds > max) max = h.seconds;
  });
  let cells = '';
  for (let dow = 1; dow <= 7; dow++) {
    cells += `<span class="gz-heat-lbl">${GUNLER[dow - 1]}</span>`;
    for (let h = 0; h < 24; h++) {
      const sec = map[dow + '_' + h] || 0;
      const a = sec ? (0.14 + 0.86 * (sec / max)) : 0;
      cells += `<span class="gz-heat-cell" title="${GUNLER[dow - 1]} ${String(h).padStart(2, '0')}:00 · ${_sure(sec)}"
        style="${sec ? `background:rgba(245,166,35,${a.toFixed(2)});` : ''}"></span>`;
    }
  }
  const xlbl = `<span></span>` + [0, 6, 12, 18].map(h =>
    `<span class="gz-heat-x">${String(h).padStart(2, '0')}:00</span>`).join('');
  return `<div class="gz-sec">Nabız Saati — günün hangi saatinde yaşıyorlar (TR)</div>
    <div class="gz-heat">${cells}${xlbl}</div>`;
}

/* ── 5. Akış — en sık geçişler ── */
function _akis(transitions) {
  const list = (transitions || []).slice(0, 10);
  if (!list.length) return '';
  const rows = list.map(x =>
    `<div><b>${esc(_ad(x.from))}</b> ⟶ <b>${esc(_ad(x.to))}</b> <span class="gz-n">· ${x.count} geçiş</span></div>`
  ).join('');
  return `<div class="gz-sec">Akış — kapılar arası en işlek yollar</div><div class="gz-flow">${rows}</div>`;
}

/* ── 6. Sohbet derinliği ── */
function _sohbetDerinligi(cd) {
  if (!cd || !cd.segments) return '';
  const silentPct = Math.round((cd.silent_segments || 0) / cd.segments * 100);
  return `<div class="gz-sec">Sohbet Derinliği</div>
    <div class="gz-flow">
      <div><b>${cd.segments}</b> sohbet ziyareti · <b>${cd.total_msgs}</b> kullanıcı mesajı</div>
      <div>Ziyaretlerin <b>%${silentPct}</b>'i sessiz geçti (girdi, yazmadan çıktı)${silentPct >= 40
        ? ' <span class="gz-n">— eşik davet etmiyor olabilir</span>' : ''}</div>
    </div>`;
}

/* ── 6b. Mod Nabzı — davranışsal mod dağılımı + hint↔LLM uyumu (FAZ 4).
   Veri: usage_events kind='mode' satırları (00f wtLogMode, mig 033 mode_pulse). ── */
function _modNabzi(mp) {
  if (!mp || !mp.total_turns) return '';
  const dist = Array.isArray(mp.distribution) ? mp.distribution : [];
  const max = Math.max(1, ...dist.map(x => x.count || 0));
  const rows = dist.map(x => `<div class="gz-bar-row">
    <span class="gz-bar-name">${esc(_modAd(x.mode))}</span>
    <span class="gz-bar-track"><span class="gz-bar gz-bar--lapis" style="width:${Math.max(1.5, (x.count || 0) / max * 100)}%"></span></span>
    <span class="gz-bar-val">${x.count} tur · %${Math.round((x.count || 0) / mp.total_turns * 100)}</span>
  </div>`).join('');
  const tagWarn = mp.tag_missing_pct >= 5
    ? ` <span class="gz-n">· tag kayıp oranı %${mp.tag_missing_pct} — beklenenden yüksekse mod protokolü kontrol edilmeli</span>` : '';
  return `<div class="gz-sec">Mod Nabzı — Wanderer hangi kapıdan konuşuyor</div>
    <div class="gz-flow"><div><b>${mp.total_turns}</b> mod kararı · ipucu↔LLM uyumu <b>%${mp.hint_match_pct}</b>${tagWarn}</div></div>
    ${rows}`;
}

/* ── 6c. Hafıza Nabzı — Epizodik Hafıza yaşıyor mu (İç Çalışma 02 · A).
   Veri: usage_events kind='memory' (00f wtLogMemory, mig 042 memory_pulse).
   Bu kartın varlık sebebi TEK bir soru: motor uzak yoldan mı çalışıyor, yoksa
   şema/embed deploy edilmediği için sessizce hep yerel fallback'te mi? Sessiz
   düşüş mühendislikte erdemdir; ama sessizce HİÇ çalışmamak arızadır. ── */
export function _hafizaNabzi(mp) {
  if (!mp || !mp.total) return '';
  const uzak = Number(mp.uzak_pct) || 0;
  const hata = Number(mp.hata_pct) || 0;
  // Uyarı eşiği bir yargı değil, mimari olgu: uzak yol hiç görünmüyorsa
  // anlamsal hafıza prod'da YAŞAMIYOR demektir (kod kusursuz görünse bile).
  const tani = uzak === 0
    ? `<span class="gz-n">— uzak yol hiç görünmedi: <code>user_memories</code> şeması ya da <code>llm-embed</code> deploy'u eksik olabilir (ELLE iş)</span>`
    : (hata >= 20 ? `<span class="gz-n">— hata oranı %${hata}: RPC ya da embed ucu düşüyor olabilir</span>` : '');
  const yollar = Array.isArray(mp.yollar) ? mp.yollar : [];
  const max = Math.max(1, ...yollar.map(x => x.count || 0));
  const rows = yollar.map(x => `<div class="gz-bar-row">
    <span class="gz-bar-name">${esc(_ehAd(x.tur))} · ${esc(_ehYol(x.yol))}</span>
    <span class="gz-bar-track"><span class="gz-bar${x.yol === 'uzak' ? '' : ' gz-bar--lapis'}" style="width:${Math.max(1.5, (x.count || 0) / max * 100)}%"></span></span>
    <span class="gz-bar-val">${x.count}</span>
  </div>`).join('');
  return `<div class="gz-sec">Hafıza Nabzı — anlamsal hafıza yaşıyor mu</div>
    <div class="gz-flow"><div><b>${mp.recall || 0}</b> geri çağırma · <b>${mp.ingest || 0}</b> yazma${mp.prefetch ? ` · <b>${mp.prefetch}</b> ön-getirme` : ''} · uzak yol <b>%${uzak}</b> · ort. <b>${mp.avg_ms || 0} ms</b>${tani}</div></div>
    ${rows}`;
}

function _ehAd(tur) {
  return ({ recall: 'geri çağırma', prefetch: 'ön-getirme', ingest: 'yazma', backfill: 'dolgu' })[tur] || tur || '—';
}
function _ehYol(yol) {
  return ({ uzak: 'uzak (pgvector)', sicak: 'sıcak (ön-getirilmiş)', yerel: 'yerel fallback', bos: 'boş döndü', hata: 'hata' })[yol] || yol || '—';
}

/* ── 6d. Gecikme Nabzı — ilk harf kaç ms'de geliyor (İç Çalışma 02 · F).
   Veri: kind='latency' (00f wtLogLatency, İç Çalışma 01 FAZ 4). Ölçü bir aydır
   yazılıyordu ve hiçbir yerde okunmuyordu; "hız mı derinlik mi" kararı buradan
   verilir — izlenimden değil. ── */
export function _gecikmeNabzi(lp) {
  if (!lp || !lp.total_turns) return '';
  const models = Array.isArray(lp.models) ? lp.models : [];
  const max = Math.max(1, ...models.map(x => x.p50_ms || 0));
  const rows = models.map(x => `<div class="gz-bar-row">
    <span class="gz-bar-name">${esc(x.model || '—')}</span>
    <span class="gz-bar-track"><span class="gz-bar gz-bar--lapis" style="width:${Math.max(1.5, (x.p50_ms || 0) / max * 100)}%"></span></span>
    <span class="gz-bar-val">${x.p50_ms} ms · ${x.count} tur</span>
  </div>`).join('');
  return `<div class="gz-sec">Gecikme Nabzı — ilk harf ne zaman geliyor</div>
    <div class="gz-flow"><div><b>${lp.total_turns}</b> tur · ortanca <b>${lp.p50_ms} ms</b> · en yavaş %5 <b>${lp.p95_ms} ms</b></div></div>
    ${rows}`;
}

/* ── 6e. Bağlam Nabzı — system prompt'un anatomisi (İç Çalışma 02 · D+H).
   Veri: kind='ctx' (00f wtLogCtx). `p_` önekli satırlar `personalization`
   kanalının İÇ kırılımıdır (09a) — kanal toplamıyla yarışmaz, onu açar; o
   yüzden ayrı grupta ve altın değil lapis çubukla çizilir. ── */
export function _baglamNabzi(cp) {
  if (!cp || !cp.total_turns) return '';
  const hepsi = Array.isArray(cp.kanallar) ? cp.kanallar : [];
  const kanal = hepsi.filter(x => !String(x.kanal || '').startsWith('p_'));
  const alt   = hepsi.filter(x =>  String(x.kanal || '').startsWith('p_'));
  const max = Math.max(1, ...kanal.map(x => x.avg_bytes || 0));
  const cizgi = (x, lapis) => `<div class="gz-bar-row">
    <span class="gz-bar-name">${esc(_ctxAd(x.kanal))}</span>
    <span class="gz-bar-track"><span class="gz-bar${lapis ? ' gz-bar--lapis' : ''}" style="width:${Math.max(1.5, (x.avg_bytes || 0) / max * 100)}%"></span></span>
    <span class="gz-bar-val">${x.avg_bytes} krk · ${x.turns} tur</span>
  </div>`;
  const altBlok = alt.length
    ? `<div class="gz-flow"><div class="gz-n">personalization kanalının içi — bu beş grup yukarıdaki tek satırın kırılımıdır</div></div>
       ${alt.map(x => cizgi(x, true)).join('')}`
    : '';
  return `<div class="gz-sec">Bağlam Nabzı — system prompt'un anatomisi</div>
    <div class="gz-flow"><div><b>${cp.total_turns}</b> tur · ort. <b>${cp.avg_toplam} karakter</b> · en büyük tur <b>${cp.max_toplam}</b></div></div>
    ${kanal.map(x => cizgi(x, false)).join('')}
    ${altBlok}`;
}

function _ctxAd(k) {
  return ({
    critical_alerts: 'kritik uyarılar', focus_model: 'Wanderer modeli',
    response_mode: 'yanıt modu', personalization: 'kişiselleştirme',
    session_memory: 'seans hafızası', recalled_memories: 'anımsanan anılar',
    mirror_hypothesis: 'ayna hipotezi', user_profile: 'profil', past_days: 'geçmiş günler', pinned_declarations: 'mühürlü sözler', user_sozleri: 'söz havuzu',
    session_insights: 'seans içgörüleri', active_journey: 'aktif yol',
    somatic_awareness: 'bedensel farkındalık',
    p_kimlik: 'kimlik motorları', p_p1: 'kişilik haritası',
    p_p2_p6: 'duygu → yaşam hafızası', p_derinlik: 'derinlik & temeller',
    p_calisma: 'ritüel · odak · imge · iz',
  })[k] || k || '—';
}

/* ── 6f. Koleksiyonun Nabzı — kimlik dağılıyor mu, Elmas dönüyor mu
   (İç Çalışma 04 rev.2 · boşluk Y1). Veri: kind='kart' (00f wtLogKart).
   Kart evreninin İKİ kolu tek kanalda toplanır ve burada yan yana okunur:
   kimlik (10q, altın çubuk) davranışla kazanılır, bilgelik (12f, lapis)
   Elmas'la açılır. Ayrımı meta.kategori='hazine' yapar.
   NADİRLİK DAĞILIMI pity eşiği kararının tek meşru girdisidir — plandaki
   bilinçli sınır: oranlara bu tablo dolmadan dokunulmaz. ── */
export function _koleksiyonNabzi(kp) {
  if (!kp || !kp.total) return '';
  const harcanan = Number(kp.elmas_harcanan) || 0;
  const iade     = Number(kp.elmas_iade) || 0;
  const paket    = Number(kp.paket) || 0;
  const kazanim  = Number(kp.kazanim) || 0;

  /* Teşhis eşikleri yargı değil mimari olgu: bir kol hiç görünmüyorsa o kol
     prod'da yaşamıyor ya da kapısı erişilemez demektir. */
  let tani = '';
  if (!kazanim) {
    tani = `<span class="gz-n">— kimlik kolu sessiz: hiç kart teslim edilmemiş. Reçete eşikleri (<code>threshold</code>/<code>minEvidence</code>) erişilemiyor ya da <code>kisi_kartlari</code> şeması eksik olabilir (ELLE iş)</span>`;
  } else if (!paket) {
    tani = `<span class="gz-n">— Hazine'nin girişi hiç kullanılmamış: Elmas birikiyor ama dönmüyor</span>`;
  } else if (harcanan > 0 && iade / harcanan > 0.5) {
    tani = `<span class="gz-n">— iade, harcamanın yarısını geçti: paketler çoğunlukla kopya döndürüyor</span>`;
  }

  const nad = Array.isArray(kp.nadirlikler) ? kp.nadirlikler : [];
  const max = Math.max(1, ...nad.map(x => x.count || 0));
  const rows = nad.map(x => `<div class="gz-bar-row">
    <span class="gz-bar-name">${esc(_kpNadirlik(x.nadirlik))} · ${esc(_kpKol(x.kategori))}</span>
    <span class="gz-bar-track"><span class="gz-bar${x.kategori === 'hazine' ? ' gz-bar--lapis' : ''}" style="width:${Math.max(1.5, (x.count || 0) / max * 100)}%"></span></span>
    <span class="gz-bar-val">${x.count}</span>
  </div>`).join('');

  const ilk = Number(kp.ilk_karti_acan) || 0;
  const ortKol = Number(kp.ort_koleksiyon) || 0;
  return `<div class="gz-sec">Koleksiyonun Nabzı — kimlik dağılıyor mu, Elmas dönüyor mu</div>
    <div class="gz-flow"><div><b>${ilk}</b> gezgin ilk kartını açtı · <b>${kazanim}</b> kimlik teslimi${ortKol ? ` · ort. koleksiyon <b>${ortKol}</b> kart` : ''} · <b>${paket}</b> paket · Elmas <b>−${harcanan}</b> / <b>+${iade}</b>${tani}</div></div>
    ${rows}`;
}

/* ── 6f2. Ritüellerin Nabzı — hangi direk taşıyor, hangisi sessiz
   (İç Çalışma 05 rev.3 · boşluk A). Veri: kind='ritus' (00f wtLogRitus).
   Ritüel mimarisi ürünün dönüşüm motorudur; bu panel motorun devrini gösterir.
   HUNİ İKİ UÇLUDUR: başlayan sayısı payda, tamamlayan pay — ama ikisi de
   GEZGİN sayısıdır, satır değil (bir kişinin on seansı "on gezgin" değildir).
   SESSİZ DİREK en pahalı bulgudur: hiç satırı olmayan ritüel ya erişilemiyor
   ya da kimse dokunmuyor — ikisi de ürün kararıdır, ikisi de görünmelidir. ── */
const _RITUS_AD = {
  'gunluk-ritus':     'Günlük Ritüel',
  'hayal':            'Hayal Seansı',
  'kendinle-konusma': 'Kendinle Konuşmak',
  'degerlendirme':    'Dönem Değerlendirmesi',
  'engel-atlasi':     'Engel Atlası',
  'dinlenme':         'Başarı Günlüğü',
  'derin-calisma':    'Derin Çalışma',
  'sefer':            'Sefer',
  'seri-muhru':       'Seri Mührü',
  'oik-okuma':        'Geçiş Okuması',
};

export function _ritusNabzi(rp) {
  if (!rp || !rp.total) return '';
  const baslayan   = Number(rp.baslayan_gezgin) || 0;
  const tamamlayan = Number(rp.tamamlayan_gezgin) || 0;
  const sozVeren   = Number(rp.soz_veren) || 0;
  const hesapVeren = Number(rp.hesap_veren) || 0;
  const tutulan    = Number(rp.tutulan_soz) || 0;
  const birakti    = Number(rp.birakti) || 0;
  const rit        = Array.isArray(rp.ritueller) ? rp.ritueller : [];

  /* Sessiz direk: kümede olup kanalda hiç görünmeyen ritüel. Küme 00f'te
     tanımlıdır; burada adları Türkçeye çevirmek için ikinci kez durur —
     ikisi ayrışırsa panel yeni ritüeli "sessiz" sanır, o yüzden ad haritası
     kümenin aynası olarak korunur (§4.3). */
  const gorulen = new Set(rit.map(r => r.ad));
  const sessiz = Object.keys(_RITUS_AD).filter(a => !gorulen.has(a));

  /* Teşhis eşikleri yargı değil mimari olgu; yarışmasınlar diye if/else. */
  let tani = '';
  if (!tamamlayan) {
    tani = `<span class="gz-n">— hiçbir ritüel sonuna kadar gitmemiş: huninin çıkışı kapalı ya da ölçüm yeni açıldı</span>`;
  } else if (sessiz.length >= 3) {
    tani = `<span class="gz-n">— ${sessiz.length} direğe hiç dokunulmadı: ${sessiz.map(a => esc(_RITUS_AD[a])).join(', ')}</span>`;
  } else if (sozVeren > 0 && hesapVeren / sozVeren < 0.5) {
    tani = `<span class="gz-n">— sözünü veren iki gezginden biri akşam hesabına dönmüyor: döngü yarım kapanıyor</span>`;
  } else if (baslayan > 0 && tamamlayan / baslayan < 0.4) {
    tani = `<span class="gz-n">— başlayanların yarıdan azı sonuna kalıyor; terk adımları aşağıda</span>`;
  } else if (sessiz.length) {
    tani = `<span class="gz-n">— sessiz kalan: ${sessiz.map(a => esc(_RITUS_AD[a])).join(', ')}</span>`;
  }

  const max = Math.max(1, ...rit.map(r => (Number(r.basladi) || 0) + (Number(r.tamam) || 0)));
  const rows = rit.map(r => {
    const t = Number(r.tamam) || 0;
    const b = Number(r.basladi) || 0;
    const k = Number(r.birakti) || 0;
    /* Altın = tamamlanan (olduğun), sönük = başlayıp yarım kalan.
       Bırakma ayrı sayı olarak yazılır: kaçtığı yer suçlanacak yer değil,
       tasarlanacak yerdir. */
    return `<div class="gz-bar-row">
      <span class="gz-bar-name">${esc(_RITUS_AD[r.ad] || r.ad)}</span>
      <span class="gz-bar-track"><span class="gz-bar" style="width:${Math.max(1.5, (t + b) / max * 100)}%"></span></span>
      <span class="gz-bar-val">${t}${b ? ` / ${b}` : ''}${k ? ` · ${k}✕` : ''}</span>
    </div>`;
  }).join('');

  const terk = Array.isArray(rp.terk_adimlari) ? rp.terk_adimlari.filter(x => x.adim > 0).slice(0, 3) : [];
  const terkSatiri = terk.length
    ? `<div class="gz-flow"><div>Yarım kalanların durduğu yer: ${terk.map(x =>
        `${esc(_RITUS_AD[x.ad] || x.ad)} <b>${x.adim}.</b> adım (${x.count})`).join(' · ')}</div></div>`
    : '';

  return `<div class="gz-sec">Ritüellerin Nabzı — hangi direk taşıyor, hangisi sessiz</div>
    <div class="gz-flow"><div><b>${baslayan}</b> gezgin bir ritüele başladı · <b>${tamamlayan}</b>'i sonuna kadar kaldı${birakti ? ` · <b>${birakti}</b> kez yarıda bırakıldı` : ''}${tani}</div></div>
    <div class="gz-flow"><div>Söz veren <b>${sozVeren}</b> · akşam hesabını veren <b>${hesapVeren}</b>${tutulan ? ` · tutulan söz <b>${tutulan}</b>` : ''}${Number(rp.soz_atlanan) ? ` · atlanan <b>${rp.soz_atlanan}</b>` : ''}</div></div>
    ${rows}
    ${terkSatiri}`;
}

/* ── 6f3. Eşiğin Nabzı — kaç gezgin kendi kartını yazdı
   (İç Çalışma 06 rev.2 · boşluk A). Veri: kind='esik' (00f wtLogEsik).
   Onboarding ürünün en pahalı dakikasıdır: gezgin burada ya kendi kartını
   yazar ya geri döner, ve bugüne dek o dakikanın hiçbir izi yoktu.
   HUNİNİN CEVABI BASAMAKLARIN ARASINDADIR: "kalem nerede düştü" sorusunu
   en küçük sayı değil en büyük DÜŞÜŞ yanıtlar — dört kategori sırayla
   yazılır, terk edilen yer iki basamak arasındaki uçurumdur.
   PERDE ayrı bir ölçüdür: tören ilk karşılaşmada büyüleyici, beşincide
   beklemedir; atlama oranı o bedeli söyleyen tek dürüst sayıdır.
   Kademe dili 03-auth-shell.js:587-590'ın kendi dilidir — kat1 tam perde
   (4 sn, günün ilk girişi), kat2 kısa nefes (2 sn).
   ORAN PAYDA OLMADAN GÖSTERİLMEZ (§6.10): kanıtsız değer yoktur, payda
   sıfırsa sayı susar. ── */
const _ESIK_BASAMAK = [
  ['basladi',     'Eşiğe geldi'],
  ['dusunceler',  'Düşünceler'],
  ['inanclar',    'İnançlar'],
  ['duygular',    'Duygular'],
  ['davranislar', 'Davranışlar'],
  ['dogus',       'Kartını mühürledi'],
];

export function _esikNabzi(ep) {
  if (!ep || !ep.total) return '';
  const h = ep.huni || {};
  const p = ep.perde || {};
  const ee = ep.esik_ekrani || {};
  const say = (v) => Number(v) || 0;

  const basamaklar = _ESIK_BASAMAK.map(([k, ad]) => ({ k, ad, n: say(h[k]) }));
  const basladi = basamaklar[0].n;
  const dogus   = say(h.dogus);
  const atladi  = say(h.atladi);
  const sOk     = say(h.sentez_ok);
  const sFb     = say(h.sentez_fallback);
  const perdeN  = say(p.n);
  const perdeAt = say(p.atlandi);

  /* En büyük düşüş — huninin asıl bulgusu. Payda 0 olan basamak atlanır:
     olmayan bir kalabalıktan "kayıp" hesaplanmaz. */
  let dususAd = '', dususPct = 0;
  for (let i = 1; i < basamaklar.length; i++) {
    const onceki = basamaklar[i - 1].n;
    if (!onceki) continue;
    const kayip = (onceki - basamaklar[i].n) / onceki;
    if (kayip > dususPct) { dususPct = kayip; dususAd = basamaklar[i].ad; }
  }

  /* Teşhis eşikleri yargı değil mimari olgu; yarışmasınlar diye if/else,
     en ağır olan önce. */
  let tani = '';
  if (!basladi) {
    tani = '<span class="gz-n">— bu dönemde eşiğe kimse gelmedi: ölçüm yeni açıldı ya da yeni gezgin yok</span>';
  } else if (!dogus) {
    tani = '<span class="gz-n">— eşiğe gelen hiç kimse kartını mühürlemedi: huninin çıkışı kapalı</span>';
  } else if (dususPct >= 0.4 && dususAd) {
    tani = `<span class="gz-n">— kalem <b>${esc(dususAd)}</b> basamağında düşüyor: oraya gelenlerin %${Math.round(dususPct * 100)}'i geçmiyor</span>`;
  } else if (sOk + sFb > 0 && sFb / (sOk + sFb) >= 0.2) {
    tani = `<span class="gz-n">— sentez her beş turdan birinde düşüyor (${sFb}/${sOk + sFb}): kart LLM'siz doğuyor</span>`;
  } else if (perdeN > 0 && perdeAt / perdeN >= 0.5) {
    tani = '<span class="gz-n">— perdeyi her iki gezginden biri atlıyor: tören bedelini aşmış olabilir</span>';
  } else if (dogus / basladi < 0.5) {
    tani = `<span class="gz-n">— eşiğe gelenlerin yarıdan azı kartını mühürlüyor (${dogus}/${basladi})</span>`;
  }

  const max = Math.max(1, ...basamaklar.map(b => b.n));
  const rows = basamaklar.map((b, i) => {
    /* Basamağın kendi kaybı çubuğun yanında durur: merdiveni okumak,
       satırları tek tek çıkarmak zorunda kalmadan mümkün olsun. */
    const onceki = i > 0 ? basamaklar[i - 1].n : 0;
    const kayip = (i > 0 && onceki) ? onceki - b.n : 0;
    return `<div class="gz-bar-row">
      <span class="gz-bar-name">${esc(b.ad)}</span>
      <span class="gz-bar-track"><span class="gz-bar" style="width:${Math.max(1.5, b.n / max * 100)}%"></span></span>
      <span class="gz-bar-val">${b.n}${kayip ? ` · ${kayip}✕` : ''}</span>
    </div>`;
  }).join('');

  /* Perde: ortalama yalnız ÖLÇÜLEN satırlardan gelir (SQL'de dur_ms>0
     süzgeci) — ölçülmemiş süre ortalamayı aşağı çekmez. */
  const ortMs = say(p.ort_ms);
  const perdeSatiri = perdeN
    ? `<div class="gz-flow"><div>Perde <b>${perdeN}</b> kez indi${perdeAt ? ` · <b>${perdeAt}</b>'i dokunuşla atlandı` : ''}${ortMs ? ` · ortalama <b>${(ortMs / 1000).toFixed(1)} sn</b> izlendi` : ''} · tam tören <b>${say(p.kat1)}</b> / kısa nefes <b>${say(p.kat2)}</b></div></div>`
    : '';

  const sentezSatiri = (sOk + sFb)
    ? `<div class="gz-flow"><div>Sentez <b>${sOk}</b> kez tuttu${sFb ? ` · <b>${sFb}</b> kez fallback'e düştü` : ''}${say(ep.dil_kapisi) ? ` · dil kapısı <b>${say(ep.dil_kapisi)}</b> kez soruldu` : ''}</div></div>`
    : '';

  const esikSatiri = (say(ee.acildi) || say(ee.kapandi))
    ? `<div class="gz-flow"><div>Giriş eşiği <b>${say(ee.acildi)}</b> kez açıldı · <b>${say(ee.kapandi)}</b> kez kapandı</div></div>`
    : '';

  return `<div class="gz-sec">Eşiğin Nabzı — kaç gezgin kendi kartını yazdı</div>
    <div class="gz-flow"><div><b>${basladi}</b> gezgin eşiğe geldi · <b>${dogus}</b>'i kartını mühürledi${atladi ? ` · <b>${atladi}</b> kez şimdilik atlandı` : ''}${tani}</div></div>
    ${rows}
    ${perdeSatiri}
    ${sentezSatiri}
    ${esikSatiri}`;
}

/* ── 6f4. Yanılma Nabzı (13D §10, K13, FAZ 15) — motor kendi hata oranını
   burada gösterir. Veri: kind='duygu' (00f wtLogDuygu, `yuzey` +
   `duzeltildi` bu fazda eklendi). GERÇEK KAPANMA KARARI (dgYanilmaKapali)
   her kullanıcının kendi İklim'inde, kayan pencere 12 üzerinden verilir —
   bu kart o kararın BİREBİR aynası DEĞİL, dönem boyunca TÜM gezginlerin
   toplam nabzıdır: bir yüzeyin burada yüksek oranla görünmesi "motor bu
   yüzeyde herkes için kapandı" demek değil, "bu yüzeyde düzeltme sık"
   demektir. MIN_N burada da 5 (13D DG_YANILMA_MIN_N'in görünüm ikizi,
   diğer kadranların "teşhis eşikleri yargı değil mimari olgu" kalıbıyla
   AYNI, bkz. _esikNabzi/_ritusNabzi) — oran payda 5'in altındayken
   GÖSTERİLMEZ (§6.10). Sohbet hiçbir hâlde kapanmaz (K13) — tanı satırı
   onu "eşiği aştı" listesinden BİLEREK dışlar. ── */
/* Yüzey kimliği ASCII'dir (`dgKapi`'nin kapalı kümesi); burada okunabilir
   karşılığı verilir. `davet` FAZ 19'da doğdu — bu satır unutulunca panel
   ham anahtarı (`davet`) gösteriyordu. Kapının yüzey listesi ile bu harita
   BİRLİKTE büyür (`tests/13D-iki-defter-kapisi.test.js`). */
const _DG_YUZEY_AD = {
  sohbet: 'Sohbet', atmosfer: 'Atmosfer şeridi', esik: 'Eşiğin ışığı',
  toren: 'Tören (Söz/Akşam)', davet: 'Sessizlik daveti',
  secici: 'Seçici sıralaması', push: 'Bildirim', kart: 'Kart sunumu',
};

export function _duyguNabzi(dp) {
  if (!dp || !dp.total) return '';
  const yuzeyler = Array.isArray(dp.yuzeyler) ? dp.yuzeyler : [];
  if (!yuzeyler.length) return '';

  const MIN_N = 5, ESIK = 0.34; // 13D DG_YANILMA_MIN_N / DG_YANILMA_ESIK — görünüm ikizi
  const rows = yuzeyler.map(y => {
    const konustu = Number(y.konustu) || 0;
    const duzeltildi = Number(y.duzeltildi) || 0;
    const oran = konustu >= MIN_N ? duzeltildi / konustu : null;
    const val = oran === null
      ? `${konustu}${duzeltildi ? ` · ${duzeltildi}✕` : ''}`
      : `${konustu} · ${duzeltildi}✕ · %${Math.round(oran * 100)}`;
    return { yuzey: y.yuzey, ad: _DG_YUZEY_AD[y.yuzey] || y.yuzey || '—', konustu, duzeltildi, oran, val };
  }).sort((a, b) => b.konustu - a.konustu);

  const asilan = rows.filter(r => r.oran !== null && r.oran > ESIK && r.yuzey !== 'sohbet');
  let tani = '';
  if (asilan.length) {
    tani = `<span class="gz-n">— ${asilan.map(r => `${esc(r.ad)} (%${Math.round(r.oran * 100)})`).join(', ')} eşiği aştı: bu gezginlerde kendini kapatmış olabilir</span>`;
  } else if (!rows.some(r => r.oran !== null)) {
    tani = '<span class="gz-n">— henüz hiçbir yüzey 5 konuşmaya ulaşmadı: oran ölçülmüyor</span>';
  }

  const max = Math.max(1, ...rows.map(r => r.konustu));
  const barRows = rows.map(r => `<div class="gz-bar-row">
    <span class="gz-bar-name">${esc(r.ad)}</span>
    <span class="gz-bar-track"><span class="gz-bar" style="width:${Math.max(1.5, r.konustu / max * 100)}%"></span></span>
    <span class="gz-bar-val">${r.val}</span>
  </div>`).join('');

  return `<div class="gz-sec">Yanılma Nabzı — motor kaç kez konuştu, kaç kez düzeltildi</div>
    <div class="gz-flow"><div><b>${dp.total}</b> duygu-güdümlü satır bu dönemde işlendi${tani}</div></div>
    ${barRows}`;
}

/* ── 6f3. Dönüşümün Nabzı — üçgenin kuzey yıldızı (İç Çalışma 07 rev.2 · D)
   Hedef belirleme → günlük pratik → kimlik değişimi: ürünün çekirdek
   döngüsü budur ve 18 Temmuz'dan beri ölçüsüzdü. Panel üç köşeyi yan yana
   koyar:
     TASARLADI — lapis kart doğdu            (kimlik_pulse)
     OKUDU     — Geçiş Okuması'na giren gezgin (ritus_pulse'tan gelir!)
     KAYDI     — kimlik davranışla el değiştirdi (kimlik_pulse)
   OKUMA SAYISI BURADA YENİDEN SAYILMAZ: ritus_pulse'un `ritueller`
   dizisinden okunur — aynı olayı iki kanaldan saymak kadranda iki farklı
   rakam doğurur.
   ORAN PANELDE KURULUR, payda 0 ise HİÇ GÖSTERİLMEZ (§6.10 — kanıtsız
   değer yoktur; "%0 tasarladı" ile "henüz kimse gelmedi" aynı şey değil). */
export function _donusumNabzi(km, rp) {
  if (!km || !km.total) return '';
  const say = (v) => Number(v) || 0;

  const tasarlayan = say(km.tasarlayan);
  const ilk        = say(km.ilk_tasarim);
  const yeniden    = say(km.yeniden_tasarim);
  const serbest    = say(km.serbest);
  const ortMadde   = say(km.ort_madde);
  const kayma      = say(km.kayma);
  const devir      = say(km.devir);
  const kayanGez   = say(km.kayan_gezgin);
  const ortTutus   = say(km.ort_tutus_gun);

  /* Ritüel köşesi öbür kanaldan gelir; yoksa köşe boş çizilir, sıfır DEĞİL. */
  const okumaSatir = (rp && Array.isArray(rp.ritueller))
    ? rp.ritueller.find(r => r.ad === 'oik-okuma') : null;
  /* `gezgin` ritus tarafında COUNT(DISTINCT user_id)'dir: okumaya DOKUNAN
     herkes — başlayan da, yarıda bırakan da. Mühürleyen gezgin sayısı o
     blokta ayrıca dönmüyor, o yüzden köşe "giren" diye adlandırılır; mühür
     ölçüsü `tamam` (olay sayısı) olarak aşağıda ayrı satırda durur.
     Kanıtı olmayan etiket takmak (§6.10) uydurulmuş sayı kadar yanlıştır. */
  const okuyan  = okumaSatir ? say(okumaSatir.gezgin) : null;
  const okumaOk = okumaSatir ? say(okumaSatir.tamam)  : null;

  /* Teşhis eşikleri yargı değil mimari olgu; yarışmasınlar diye if/else,
     en ağır olan önce. */
  let tani = '';
  if (!tasarlayan) {
    tani = '<span class="gz-n">— bu dönemde kimse olmak istediği kişiyi tasarlamadı: üçgenin lapis köşesi boş</span>';
  } else if (okumaOk === 0) {
    tani = '<span class="gz-n">— kart tasarlandı ama okunmuyor: Geçiş Protokolü kâğıtta kaldı</span>';
  } else if (!kayma && devir) {
    tani = '<span class="gz-n">— kimlik yalnız kart kazanımıyla el değiştiriyor; davranış henüz kendi hükmünü vermedi</span>';
  } else if (ortTutus > 0 && ortTutus < 1) {
    tani = '<span class="gz-n">— kimlik günü doldurmadan el değiştiriyor: histerezis eşiği gerçekten tutuyor mu?</span>';
  } else if (ortMadde > 0 && ortMadde < 4) {
    tani = `<span class="gz-n">— kartlar ortalama ${ortMadde} maddeyle doğuyor: dört boyutun hepsi dolmuyor</span>`;
  } else if (serbest > 0 && tasarlayan > 0 && serbest >= tasarlayan) {
    tani = '<span class="gz-n">— tasarlandığı kadar vazgeçiliyor: niyet tutunamıyor</span>';
  }

  /* Üç köşe — payda yoksa sayı yerine davet durur, uydurma sıfır değil. */
  const kose = (n, ad, alt) => `<div class="stat-block" style="border:1px solid var(--border);">
    <div class="stat-num">${n === null ? '—' : n}</div>
    <div class="stat-label">${esc(ad)}</div>
    ${alt ? `<div class="gz-n" style="margin-top:4px;">${esc(alt)}</div>` : ''}
  </div>`;

  const satir = (ad, deger) => `<div class="gz-bar-row">
    <span class="gz-bar-name">${esc(ad)}</span>
    <span class="gz-bar-val">${esc(deger)}</span>
  </div>`;

  const detaylar = [
    satir('İlk tasarım / yeniden tasarım', `${ilk} · ${yeniden}`),
    ortMadde ? satir('Kart doğarken taşıdığı madde', `${ortMadde} ortalama`) : '',
    okumaOk !== null ? satir('Mühürlenen Geçiş Okuması', String(okumaOk)) : '',
    satir('Davranışla kayma / kazanımla devir', `${kayma} · ${devir}`),
    ortTutus ? satir('Kimliğin ortalama tutuşu', `${ortTutus} gün`) : '',
    serbest ? satir('Niyetten dönüş (madde bırakıldı)', String(serbest)) : '',
  ].filter(Boolean).join('');

  return `<div class="gz-sec">Dönüşümün Nabzı — tasarladı, okudu, kaydı</div>
    <div class="gz-flow"><div>Üçgenin üç köşesi yan yana${tani}</div></div>
    <div class="admin-stat-row">
      ${kose(tasarlayan, 'Tasarladı', 'lapis kartı yazan gezgin')}
      ${kose(okuyan, 'Okudu', 'Geçiş Okuması\'na giren gezgin')}
      ${kose(kayanGez, 'Kaydı', 'kimliği davranışla değişen')}
    </div>
    ${detaylar}`;
}

/* ── 6f4. Üç Sesin Nabzı — hangi eksende konuşuluyor (İç Çalışma 08 rev.2 · A)
   Ürünün kimlik iddiası üç sestir: Öz (bireysel) · Bağ (ilişki) · Eser (iş).
   Panel iddiayı üç ayrı soruyla sınar:
     NİYET   — kullanıcı eliyle hangi eksene geçti      (kind='model', 'sec')
     TALEP   — hangi eksen kapıya çarpıldı              (kind='model', 'kilit')
     YAŞANAN — hangi eksende gerçekten konuşuldu        (kind='latency', meta.fm)
   SEÇİM İLE KİLİT YAN YANA DURUR ama TOPLANMAZ: Free katmanı Bağ/Eser'i Öz'e
   çevirir (10w:111) — ikisini tek dağılımda toplamak "herkes Öz'ü seviyor"
   diye okunur, oysa ölçülen mahkûmiyettir.
   PANEL "MOD NABZI" DEĞİLDİR: o AI_MODES'un otomatik modlarını ölçer
   (kind='mode'). Bu repoda Modeller (elle) ile Modlar (otomatik) ayrı
   eksenlerdir ve karıştırılmaları bilinen bir tuzaktır. ── */
export function _sesNabzi(mp) {
  const turlar = (mp && Array.isArray(mp.eksen_tur)) ? mp.eksen_tur : [];
  /* Kanal iki koldan beslenir; ikisi de boşsa panel HİÇ çizilmez. Seçim hiç
     yapılmamış olabilir (herkes varsayılanda kalmıştır) ama turlar varsa
     panelin söyleyecek sözü vardır. */
  if ((!mp || !mp.total) && !turlar.length) return '';

  const say = (v) => Number(v) || 0;
  const AD  = { oz: 'Öz ◆ bireysel', bag: 'Bağ ❖ ilişki', eser: 'Eser ▲ iş' };
  const ad  = (k) => AD[k] || k || '—';

  const secim      = say(mp && mp.secim);
  const secen      = say(mp && mp.secen);
  const kilit      = say(mp && mp.kilit);
  const kilitlenen = say(mp && mp.kilitlenen);
  const dus        = say(mp && mp.dus);
  const dusen      = say(mp && mp.dusen);
  const secDag     = (mp && Array.isArray(mp.secim_dagilim)) ? mp.secim_dagilim : [];
  const kilDag     = (mp && Array.isArray(mp.kilit_dagilim)) ? mp.kilit_dagilim : [];
  const gecis      = (mp && Array.isArray(mp.gecis)) ? mp.gecis : [];

  const turToplam = turlar.reduce((a, x) => a + say(x.tur), 0);
  const enBuyuk   = turlar.length ? Math.max(...turlar.map(x => say(x.tur))) : 0;
  const tekSesPay = turToplam ? Math.round(enBuyuk / turToplam * 100) : 0;

  /* Teşhis eşikleri yargı değil mimari olgu; yarışmasınlar diye if/else,
     en ağır olan önce. */
  let tani = '';
  if (kilit && !secim) {
    tani = '<span class="gz-n">— eksen seçimi yalnız kapıya çarpıyor: üç ses var, ikisi Pro\'nun arkasında</span>';
  } else if (turToplam >= 20 && tekSesPay >= 90) {
    tani = `<span class="gz-n">— konuşmanın %${tekSesPay}'i tek eksende geçiyor: üç ses pratikte tek sese düşmüş</span>`;
  } else if (dus) {
    tani = `<span class="gz-n">— ${dus} kez kayıtlı eksen sessizce Öz\'e döndü: gezgin seçtiğini kaybettiğini bilmiyor</span>`;
  } else if (!turlar.length && secim) {
    tani = '<span class="gz-n">— eksen seçiliyor ama turlarda izi yok: meta.fm yazılmıyor olabilir (migration 050 uygulandı mı?)</span>';
  } else if (secim && !gecis.length) {
    tani = '<span class="gz-n">— seçim var ama geçiş matrisi boş: eksenler arası dolaşım henüz doğmadı</span>';
  }

  /* Üç köşe — payda yoksa sayı yerine "—" durur, uydurma sıfır değil (§6.10). */
  const kose = (n, ad2, alt) => `<div class="stat-block" style="border:1px solid var(--border);">
    <div class="stat-num">${n === null ? '—' : n}</div>
    <div class="stat-label">${esc(ad2)}</div>
    ${alt ? `<div class="gz-n" style="margin-top:4px;">${esc(alt)}</div>` : ''}
  </div>`;

  const satir = (a, d) => `<div class="gz-bar-row">
    <span class="gz-bar-name">${esc(a)}</span>
    <span class="gz-bar-val">${esc(d)}</span>
  </div>`;

  /* Yaşanan kullanım çubukla çizilir — kadranın öbür nabızlarıyla aynı dil. */
  const turMax  = Math.max(1, enBuyuk);
  const turRows = turlar.map(x => `<div class="gz-bar-row">
    <span class="gz-bar-name">${esc(ad(x.model))}</span>
    <span class="gz-bar-track"><span class="gz-bar" style="width:${Math.max(1.5, say(x.tur) / turMax * 100)}%"></span></span>
    <span class="gz-bar-val">${say(x.tur)} tur · ${say(x.gezgin)} gezgin</span>
  </div>`).join('');

  /* Kilit dağılımı lapis: bu bir kullanım değil, KARŞILANMAMIŞ TALEPTİR —
     kadranın dilinde lapis "henüz olmayan"ın rengidir. */
  const kilMax  = Math.max(1, ...kilDag.map(x => say(x.n)));
  const kilRows = kilDag.map(x => `<div class="gz-bar-row">
    <span class="gz-bar-name">${esc(ad(x.model))}</span>
    <span class="gz-bar-track"><span class="gz-bar gz-bar--lapis" style="width:${Math.max(1.5, say(x.n) / kilMax * 100)}%"></span></span>
    <span class="gz-bar-val">${say(x.n)} çarpma · ${say(x.gezgin)} gezgin</span>
  </div>`).join('');

  const secRows = secDag.map(x => satir(ad(x.model), `${say(x.n)} seçim · ${say(x.gezgin)} gezgin`)).join('');
  const gecRows = gecis.map(x => satir(`${ad(x.from)} → ${ad(x.to)}`, String(say(x.n)))).join('');

  return `<div class="gz-sec">Üç Sesin Nabzı — hangi eksende konuşuluyor</div>
    <div class="gz-flow"><div>Niyet, talep ve yaşanan yan yana${tani}</div></div>
    <div class="admin-stat-row">
      ${kose(secen || null, 'Seçti', 'ekseni eliyle değiştiren gezgin')}
      ${kose(kilitlenen || null, 'Çarptı', 'kapalı eksene dokunan gezgin')}
      ${kose(turToplam || null, 'Konuştu', 'eksen bilinen tur (başarılı)')}
    </div>
    ${turRows ? `<div class="gz-flow"><div class="gz-n">yaşanan kullanım — turun gerçekten geçtiği eksen</div></div>${turRows}` : ''}
    ${kilRows ? `<div class="gz-flow"><div class="gz-n">karşılanmamış talep — Pro kapısına çarpan eksen</div></div>${kilRows}` : ''}
    ${secRows}
    ${dus ? satir('Sessizce Öz\'e dönen eksen', `${dus} kez · ${dusen} gezgin`) : ''}
    ${gecRows ? `<div class="gz-flow"><div class="gz-n">geçiş matrisi — hangi eksenden hangisine</div></div>${gecRows}` : ''}`;
}

function _kpNadirlik(r) {
  return ({ yaygin: 'yaygın', nadir: 'nadir', nadide: 'nadide', efsane: 'efsane' })[r] || r || '—';
}
function _kpKol(k) {
  return k === 'hazine' ? 'bilgelik' : 'kimlik';
}

/* ── 6g. Şema Sondası — sessiz fallback'in sesi (İç Çalışma 04 rev.2 · Y5,
   Atlas D1). Kart evreninin kalıcılığı ELLE uygulanan şemaya yaslanır ve
   client 42P01/42703'ü YUTUP KV-only moda düşecek kadar zarifti: hiçbir şey
   kırılmıyor, yalnız sessizce eksik çalışıyordu — kullanıcı cihaz değiştirene
   kadar. Bu sonda o sessizliği bozar.
   MİGRATION GEREKTİRMEZ: varlık, tek satırlık bir select'in HATA KODUNDAN
   okunur (42P01=tablo yok, 42703=kolon yok). RLS yüzünden boş dönmek "yok"
   demek değildir — kanıt hatanın kendisidir, satır sayısı değil. ── */
const _SONDALAR = [
  { tablo: 'kisi_kartlari', kolon: 'user_id', ad: 'Koleksiyon tablosu',      not: 'kazanılan kartlar cihazlar arası taşınmaz' },
  { tablo: 'portre',        kolon: 'sahne',   ad: 'Altın kartın sahnesi',    not: '12d reçetesi her açılışta yeniden bestelenir' },
  { tablo: 'oik_kartlari',  kolon: 'sahne',   ad: 'Lapis kartın sahnesi',    not: '12d reçetesi her açılışta yeniden bestelenir' },
  // Kimlik Üçgeni (İç Çalışma 07 rev.2 · boşluk A): üçgenin öbür üç tablosu
  // bugüne dek sondasızdı — kod 42P01/42703'ü yutup KV moduna düşecek kadar
  // zarif olduğu için borç sessiz kalıyordu. Kolon seçimi tesadüf değil:
  // her biri şemanın SONRADAN eklenen (ALTER) parçasıdır — tablo varken
  // kolonun yokluğu, migration'ın yarım koştuğunu söyler.
  { tablo: 'kimlik_yolculugu', kolon: 'persona_history', ad: 'Kimlik yolculuğu',       not: 'cihaz değişince "olduğun kişi"nin geçmişi taşınmaz' },
  { tablo: 'suretler',         kolon: 'oik_madde_id',    ad: 'Suretler · OİK köprüsü', not: 'dönüşen suret lapis karta mühürlenemez' },
  { tablo: 'meclis_derinlik',  kolon: 'baseline',        ad: 'Derinlik aynası',        not: 'Zayıf→Güçlü kayışının BAZ ölçümü tutulmaz' },
  // Üç Sesin tablosu (İç Çalışma 08 rev.2 · boşluk D): tablo yoksa 10w
  // sessizce eski focus_models promptlarına düşer (loadWandererModels'ın
  // fallback dalı) — arayüz "Wanderer Öz/Bağ/Eser" der, altında eski içerik
  // konuşur. Admin bunu yalnız Model Stüdyosu'na girerse görüyordu; kadran
  // saymıyordu. Kolon `system_prompt`: eksen davranışının yaşadığı yer.
  { tablo: 'wanderer_models', kolon: 'system_prompt', ad: 'Üç sesin tablosu', not: 'üç eksen eski Odak Modelleri promptlarıyla konuşur' },
];

/* Tablo VAR ama İÇİ boş olabilir (İç Çalışma 08 rev.2 · K4): 000'in CREATE
   bloğu tabloyu kurar, INSERT bloğu üç eksenin davranışını doldurur. İkisi
   ayrı ölçülür — "tablo var" demek "üç ses konuşuyor" demek değildir; boş
   system_prompt <focus_model> bölümüne boş girer ve eksen kimliği sessizce
   kaybolur.
   EŞİK 200 KARAKTER: bugünkü en kısa system_prompt 2114 karakterdir; 200
   sınırı "kazara kalmış bir cümle" ile "gerçek eksen davranışı"nı ayırır. */
const _SES_DOLU_MIN = 200;

async function _sondaIcerik() {
  try {
    const { data, error } = await sb.from('wanderer_models').select('model_id, system_prompt');
    if (error || !Array.isArray(data)) return null;   // tablo yoksa varlık sondası zaten söyler
    return {
      dolu:   data.filter(r => String(r.system_prompt || '').trim().length >= _SES_DOLU_MIN).length,
      toplam: data.length,
    };
  } catch (_) { return null; }
}

/** Sonda sonuçlarını HTML'e çevirir — saf, test edilebilir.
 *  `d` raporun tamamı: kart_pulse / ritus_pulse alanlarının VARLIĞI
 *  migration 044 ve 045'in uygulandığını söyler (içleri boş olabilir — o ayrı
 *  bir şey, veri yokluğu). Panel çizilmiyorsa sebebi burada okunur: nabız
 *  kanalı koda girdi diye kadranda görünmez, fonksiyon da yeniden kurulmalı. */
export function _sondaHTML(sonuclar, d, icerik) {
  const satir = (ad, ok, not) => `<div class="gz-bar-row">
    <span class="gz-bar-name">${esc(ad)}</span>
    <span class="gz-bar-val" style="color:${ok ? 'var(--green-ok, #8FAE7C)' : 'var(--gold)'};">
      ${ok ? '✓ uygulanmış' : '✗ ELLE bekliyor'}${ok ? '' : ` — ${esc(not)}`}</span>
  </div>`;
  const rows = (sonuclar || []).map(x => satir(x.ad, x.ok, x.not)).join('');
  const alan = (k) => !!(d && Object.prototype.hasOwnProperty.call(d, k));
  const kartPulse  = alan('kart_pulse');
  const ritusPulse = alan('ritus_pulse');
  const esikPulse  = alan('esik_pulse');
  const duyguPulse  = alan('duygu_pulse');
  const kimlikPulse = alan('kimlik_pulse');
  const modelPulse  = alan('model_pulse');
  /* TEK KAYNAK (denetim 2026-08-31): satırın hükmü ile borç sayacı aynı
     ifadeden okunur. Ayrı yazıldığında `toplam === 0` hâli — tablo VAR ama
     INSERT hiç koşmamış — satırda ✗ görünüyor, sayaçta görünmüyordu: kadran
     "borç kapalı" derken altında ELLE bekleyen bir satır duruyordu. */
  const icerikOk = !!(icerik && icerik.toplam > 0 && icerik.dolu === icerik.toplam);
  const eksik = (sonuclar || []).filter(x => !x.ok).length
    + (kartPulse ? 0 : 1) + (ritusPulse ? 0 : 1) + (esikPulse ? 0 : 1)
    + (duyguPulse ? 0 : 1) + (kimlikPulse ? 0 : 1) + (modelPulse ? 0 : 1)
    + (icerik && !icerikOk ? 1 : 0);
  const ozet = eksik
    ? `<span class="gz-n">— ${eksik} şema borcu açık: Supabase SQL editöründe ELLE uygulanmalı</span>`
    : '<span class="gz-n">— kadranın şema borcu kapalı</span>';
  return `<div class="gz-sec">Şema Sondası — kadran prod'da tam mı</div>
    <div class="gz-flow"><div>Sessiz fallback'ler burada sesini bulur${ozet}</div></div>
    ${rows}
    ${satir('Koleksiyonun Nabzı (migration 044)', kartPulse, 'kadran kart olaylarını okuyamaz')}
    ${satir('Ritüellerin Nabzı (migration 045)', ritusPulse, 'kadran ritüel olaylarını okuyamaz')}
    ${satir('Eşiğin Nabzı (migration 046)', esikPulse, 'kadran onboarding hunisini okuyamaz')}
    ${satir('Yanılma Nabzı (migration 048)', duyguPulse, 'kadran yanılma defterini okuyamaz')}
    ${satir('Dönüşümün Nabzı (migration 049)', kimlikPulse, 'kadran üçgenin kaymalarını okuyamaz')}
    ${satir('Üç Sesin Nabzı (migration 050)', modelPulse, 'kadran eksen seçimlerini okuyamaz')}
    ${icerik ? satir('Üç sesin içeriği', icerikOk,
        `${icerik.dolu}/${icerik.toplam} eksen dolu — kalan eksenler davranışsız konuşuyor`) : ''}`;
}

let _sondaRapor = null;

function _sondaShell(d) {
  _sondaRapor = d;
  return '<div id="gz-sonda"><div class="gz-empty">Şema sondası okunuyor…</div></div>';
}

/** Üç sondayı PARALEL koşar; her biri kendi hatasını yutar — sonda başarısız
 *  olursa kadranın geri kalanı ayakta kalır (asla bloklama). */
async function _loadSonda() {
  const host = document.getElementById('gz-sonda');
  if (!host) return;
  try {
    const [sonuclar, icerik] = await Promise.all([
      Promise.all(_SONDALAR.map(async sp => {
        try {
          const { error } = await sb.from(sp.tablo).select(sp.kolon).limit(1);
          const kod = error && (error.code || '');
          return { ...sp, ok: !(kod === '42P01' || kod === '42703') };
        } catch (_) { return { ...sp, ok: false }; }
      })),
      _sondaIcerik(),
    ]);
    host.innerHTML = _sondaHTML(sonuclar, _sondaRapor, icerik);
  } catch (_) {
    host.innerHTML = '';   // sonda okunamadıysa sessizce çekil — yalan söyleme
  }
}

/* ── 7. Gezginler ── */
function _gezginler(users) {
  const list = (users || []).slice(0, 60);
  if (!list.length) return '';
  const rows = list.map(u => `<tr>
    <td title="${esc(u.user_id || '')}">${esc(u.email || (u.user_id || '').slice(0, 8) + '…')}</td>
    <td>${_sure(u.seconds)}</td>
    <td>${u.sessions || 0}</td>
    <td>${esc(_ad(u.top_screen))}</td>
    <td>${u.streak != null ? u.streak + ' gün' : '—'}</td>
    <td>${_tarih(u.last_seen)}</td>
  </tr>`).join('');
  return `<div class="gz-sec">Gezginler — dönem içinde en çok yaşayanlar</div>
    <div style="overflow-x:auto;"><table class="gz-tbl">
      <thead><tr><th>Gezgin</th><th>Süre</th><th>Oturum</th><th>Yaşadığı Yer</th><th>Seri</th><th>Son Görülme</th></tr></thead>
      <tbody>${rows}</tbody></table></div>`;
}

/* ── 8. sessiz gezginler (7+ gün) ── */
function _sessizler(silent) {
  const list = (silent || []).slice(0, 20);
  if (!list.length) return '';
  const rows = list.map(u => `<div class="gz-silent">
    <span>${esc(u.email || (u.user_id || '').slice(0, 8) + '…')}</span>
    <span><b>${u.silent_days} gündür</b> kapıdan geçmedi · seri ${u.streak || 0} gündü</span>
  </div>`).join('');
  return `<div class="gz-sec">7 gündür kapıdan geçmeyenler</div>${rows}`;
}

/* ════════════════════════════════════════════════════════════════
   EMRE'NİN TAVSİYELERİ — LLM analist (usage_insights kalıcılığı)
════════════════════════════════════════════════════════════════ */
function _insightShell() {
  return `<div class="gz-sec">Emre'nin Tavsiyeleri — kadranın yorumu</div>
    <div class="gz-insight">
      <div id="gz-insight-body" class="gz-insight-body"><span class="gz-empty">Son yorum aranıyor…</span></div>
      <button class="btn-outline-gold" id="gz-yorumla" type="button" style="margin-top:16px;">Kadranı Yorumla</button>
    </div>`;
}

async function _loadInsight() {
  const body = document.getElementById('gz-insight-body');
  if (!body) return;
  try {
    const { data, error } = await sb.from('usage_insights')
      .select('generated_at, period_days, report_md')
      .order('generated_at', { ascending: false }).limit(1);
    if (error) throw error;
    _insight = data && data[0];
  } catch (_) { _insight = null; }
  _renderInsight();
}

function _renderInsight() {
  const body = document.getElementById('gz-insight-body');
  if (!body) return;
  if (!_insight) {
    body.innerHTML = `<span class="gz-empty">Kadran henüz yorumlanmadı. İlk yorumu iste — analist veriyi kitabın gözünden okusun.</span>`;
    return;
  }
  const age = Math.floor((Date.now() - new Date(_insight.generated_at).getTime()) / 86400000);
  const stale = age >= 7
    ? `<div class="gz-stale">Kadran döndü — son yorumun üzerinden ${age} gün geçti. Yeniden yorumlat.</div>` : '';
  body.innerHTML = `
    <div class="gz-insight-meta">${_tarih(_insight.generated_at)} · ${_insight.period_days} günlük pencere</div>
    <div>${_md(_insight.report_md)}</div>${stale}`;
}

/* Anonim, kompakt LLM girdisi — e-posta/kimlik ASLA modele gitmez. */
function _compactForLLM(d) {
  const ov = d.overview || {};
  return {
    pencere_gun: _period,
    genel: {
      aktif_gezgin: ov.active_users || 0,
      toplam_sure_dk: Math.round((ov.total_view_seconds || 0) / 60),
      oturum: ov.sessions || 0,
      ort_oturum_dk: Math.round((ov.avg_session_seconds || 0) / 60),
    },
    ekranlar: (d.screens || []).filter(s => s.kind === 'view').slice(0, 14)
      .map(s => ({ ekran: _ad(s.screen), dk: Math.round(s.seconds / 60), giris: s.enters, kisi: s.users })),
    torenler: (d.screens || []).filter(s => s.kind === 'overlay')
      .map(s => ({ toren: _ad(s.screen), dk: Math.round(s.seconds / 60), giris: s.enters, kisi: s.users,
                   katilim_yuzde: ov.active_users ? Math.round((s.users || 0) / ov.active_users * 100) : 0 })),
    akis: (d.transitions || []).slice(0, 10).map(x => `${_ad(x.from)} → ${_ad(x.to)} (${x.count})`),
    sohbet: d.chat_depth || {},
    mod_nabzi: d.mode_pulse ? {
      toplam_mod_karari: d.mode_pulse.total_turns,
      ipucu_llm_uyum_yuzde: d.mode_pulse.hint_match_pct,
      tag_kayip_yuzde: d.mode_pulse.tag_missing_pct,
      dagilim: (d.mode_pulse.distribution || []).map(x => ({ mod: _modAd(x.mode), tur: x.count })),
    } : null,
    /* Üç nabız analiste de gider (İç Çalışma 02) — hepsi anonim sayı.
       Hafıza nabzı özellikle önemli: "uzak_yol_yuzde 0" bir kullanım
       gözlemi değil, altyapının ölü olduğunun teşhisidir. */
    hafiza_nabzi: d.memory_pulse ? {
      geri_cagirma: d.memory_pulse.recall, yazma: d.memory_pulse.ingest,
      on_getirme: d.memory_pulse.prefetch || 0,
      uzak_yol_yuzde: d.memory_pulse.uzak_pct, hata_yuzde: d.memory_pulse.hata_pct,
      ort_ms: d.memory_pulse.avg_ms,
    } : null,
    gecikme_nabzi: d.latency_pulse ? {
      tur: d.latency_pulse.total_turns,
      ortanca_ms: d.latency_pulse.p50_ms, p95_ms: d.latency_pulse.p95_ms,
      modeller: (d.latency_pulse.models || []).map(x => ({ model: x.model, tur: x.count, ortanca_ms: x.p50_ms })),
    } : null,
    baglam_nabzi: d.ctx_pulse ? {
      tur: d.ctx_pulse.total_turns,
      ort_karakter: d.ctx_pulse.avg_toplam, en_buyuk: d.ctx_pulse.max_toplam,
      kanallar: (d.ctx_pulse.kanallar || []).map(x => ({ kanal: _ctxAd(x.kanal), ort_karakter: x.avg_bytes })),
    } : null,
    gezgin_dagilimi: (d.users || []).slice(0, 40)
      .map(u => ({ dk: Math.round((u.seconds || 0) / 60), oturum: u.sessions, en_cok: _ad(u.top_screen), seri: u.streak || 0 })),
    sessiz_gezgin_sayisi: (d.silent_users || []).length,
  };
}

const GZ_ANALIST_PROMPT = () => p('prompt.gozlemevi.analist_system');

export async function gzYorumla() {
  if (_busy) return;
  const btn = document.getElementById('gz-yorumla');
  const body = document.getElementById('gz-insight-body');
  if (!_report || !(_report.overview || {}).active_users) {
    showToast('Kadran boş — yorumlanacak iz yok.', true);
    return;
  }
  _busy = true;
  if (btn) { btn.disabled = true; btn.textContent = 'Kadran okunuyor…'; }
  try {
    const compact = _compactForLLM(_report);
    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text:
        'KULLANIM VERİSİ (JSON):\n' + JSON.stringify(compact, null, 1) }] }],
      systemPrompt: GZ_ANALIST_PROMPT(),
      maxTokens: 1600, temperature: 0.4, model: SUMMARY_MODEL, skipPersona: true,
    });
    const text = (typeof raw === 'string' ? raw : (raw?.text || '')).trim();
    if (!text) throw new Error('boş yanıt');
    const { error } = await sb.from('usage_insights').insert({
      period_days: _period, report_md: text, data_snapshot: compact,
    });
    if (error) throw error;
    _insight = { generated_at: new Date().toISOString(), period_days: _period, report_md: text };
    _renderInsight();
    showToast('Kadran yorumlandı.');
  } catch (e) {
    // Eski yorum ekranda kalır — kota/ağ hatasında veri kaybolmaz
    console.warn('gzYorumla:', e?.message);
    showToast('Yorum alınamadı — mevcut yorum korunuyor.', true);
    if (body && !_insight) _renderInsight();
  } finally {
    _busy = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Kadranı Yorumla'; }
  }
}
