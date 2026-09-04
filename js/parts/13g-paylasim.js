/* ═══════════════════════════════════════════════════════════════════
   13g — PAYLAŞIM MOTORU · Story-boyutu kart görseli (canvas → Share)
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     İçerideki güzellik dışarı taşsın. Kilometre taşı kartları, Kişi
     Kartları ve (ileride) Wrapped kapanışı 1080×1920 obsidyen/altın
     bir story görseline çevrilir ve paylaşılır. Cazibe Motoru'ndaki
     Toplumsal Kanıt ilkesinin etik hâli: kullanıcı KENDİ dönüşümünü
     gösterir — uydurma sayım yok, gerçek mühür var.

   TEK GİRİŞ: window.shrShareStory(params)
     params: { kicker, glyph, big, bigLabel, title, sub, line, note,
               footer, accent ('gold'|hex), tier (1-4 ışıltı yoğunluğu),
               tur ('kart'|'rapor'|'film' — Paylaşım Nabzı'nın sınıfı) }
   AKIŞ: canvas çiz → native'de Filesystem+Share (Capacitor), web'de
     navigator.share(files) → desteklenmezse PNG indir.
   Konvansiyon: hardcoded TR; window.shr* expose; ses/haptik 13e'den.
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { showToast } from './00a-infrastructure.js';
import { getAppDownloadLinks, downloadLinkLine, downloadFooterUrl } from './13n-indirme-baglantilari.js';
import { t, localeUpper } from './15-i18n.js';

const W = 1080, H = 1920;

function _userName() {
  const u = S.currentUser;
  return (u && (u.name || (u.user_metadata && u.user_metadata.name))) || 'Gezgin';
}

function _trDate() {
  try {
    return new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (_) { return ''; }
}

/* ── Metin sarma (canvas) ── */
function _wrap(ctx, text, maxW) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

/* ════════════════════════════════════════════════════════════════════
   ÇİZİM — obsidyen taban + altın mühür halkası + tipografi
════════════════════════════════════════════════════════════════════ */
async function _drawStory(p) {
  // Web fontları canvas'tan önce yüklensin (yüklüyse anında döner)
  try {
    await Promise.all([
      document.fonts.load('700 64px Cinzel'),
      document.fonts.load('600 120px Fraunces'),
      document.fonts.load('italic 400 52px "EB Garamond"'),
    ]);
  } catch (_) {}

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const accent = (!p.accent || p.accent === 'gold') ? '#F5A623' : p.accent;
  const tier = Math.max(1, Math.min(4, p.tier || 2));

  // ── Taban: derin şafak göğü (body gradyanının ikizi) ──
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0E0C13');
  bg.addColorStop(0.4, '#0F0C08');
  bg.addColorStop(1, '#120D09');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // alt ufuk közü
  const ember = ctx.createRadialGradient(W / 2, H * 1.06, 80, W / 2, H * 1.06, H * 0.55);
  ember.addColorStop(0, 'rgba(255,178,120,0.16)');
  ember.addColorStop(1, 'rgba(255,178,120,0)');
  ctx.fillStyle = ember; ctx.fillRect(0, 0, W, H);

  // üst indigo nefesi
  const crown = ctx.createRadialGradient(W / 2, -120, 60, W / 2, -120, H * 0.5);
  crown.addColorStop(0, 'rgba(86,74,140,0.18)');
  crown.addColorStop(1, 'rgba(86,74,140,0)');
  ctx.fillStyle = crown; ctx.fillRect(0, 0, W, H);

  // ince kâğıt greni (hafif — 1200 nokta yeter)
  ctx.save();
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#EAE2D6' : '#000';
    ctx.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4);
  }
  ctx.restore();

  // ── Çerçeve: ince çift kenar + kafes dokusu + köşe tikleri (12c kart dili) ──
  ctx.strokeStyle = 'rgba(245,166,35,0.28)'; ctx.lineWidth = 3;
  ctx.strokeRect(54, 54, W - 108, H - 108);
  ctx.strokeStyle = 'rgba(245,166,35,0.10)'; ctx.lineWidth = 1.5;
  ctx.strokeRect(74, 74, W - 148, H - 148);
  // kafes (45° çapraz örgü — kart sırtının dokusu, çok hafif)
  ctx.save();
  ctx.beginPath(); ctx.rect(74, 74, W - 148, H - 148); ctx.clip();
  ctx.strokeStyle = 'rgba(245,166,35,0.035)'; ctx.lineWidth = 1;
  for (let d = -H; d < W + H; d += 56) {
    ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d + H, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(d + H, 0); ctx.lineTo(d, H); ctx.stroke();
  }
  ctx.restore();
  // köşe tikleri
  ctx.strokeStyle = 'rgba(245,166,35,0.8)'; ctx.lineWidth = 3.5;
  const tick = 36, m = 36;
  [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y0, sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y0 + sy * tick); ctx.lineTo(x, y0); ctx.lineTo(x + sx * tick, y0);
    ctx.stroke();
  });

  // ── Üst marka ──
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = '700 52px Cinzel, serif';
  _spaced(ctx, 'WANDERER', W / 2, 200, 26);
  ctx.fillStyle = 'rgba(234,226,214,0.45)';
  ctx.font = '500 30px Barlow, sans-serif';
  _spaced(ctx, localeUpper(p.kicker), W / 2, 268, 8);

  // ── Mühür halkası ──
  const cx = W / 2, cy = 700, r = 270;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 1.7);
  glow.addColorStop(0, _hexA(accent, 0.16));
  glow.addColorStop(1, _hexA(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 1.8, cy - r * 1.8, r * 3.6, r * 3.6);

  ctx.strokeStyle = _hexA(accent, 0.85); ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = _hexA(accent, 0.35); ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, r - 34, 0, Math.PI * 2); ctx.stroke();

  // tier kıvılcımları — halka çevresine serpilir
  ctx.fillStyle = _hexA(accent, 0.8);
  const sparks = [8, 14, 22, 34][tier - 1];
  for (let i = 0; i < sparks; i++) {
    const a = (Math.PI * 2 * i) / sparks + Math.random() * 0.4;
    const d = r + 50 + Math.random() * 130;
    const sz = 2.5 + Math.random() * 4.5;
    ctx.globalAlpha = 0.25 + Math.random() * 0.6;
    ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, sz, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // glif + büyük değer
  ctx.fillStyle = _hexA(accent, 0.95);
  if (p.big != null) {
    ctx.font = '400 110px "EB Garamond", serif';
    ctx.fillText(p.glyph || '✦', cx, cy - 95);
    ctx.fillStyle = '#EAE2D6';
    ctx.font = '600 220px Fraunces, Georgia, serif';
    ctx.fillText(String(p.big), cx, cy + 110);
    if (p.bigLabel) {
      ctx.fillStyle = 'rgba(234,226,214,0.5)';
      ctx.font = '500 34px Barlow, sans-serif';
      _spaced(ctx, localeUpper(p.bigLabel), cx, cy + 180, 10);
    }
  } else {
    ctx.font = '400 230px "EB Garamond", serif';
    ctx.fillText(p.glyph || '✦', cx, cy + 80);
  }

  // ── Başlık + alt başlık ──
  let y = 1150;
  ctx.fillStyle = '#EAE2D6';
  ctx.font = '600 104px Fraunces, Georgia, serif';
  const titleLines = _wrap(ctx, p.title || '', W - 260);
  titleLines.slice(0, 2).forEach(l => { ctx.fillText(l, W / 2, y); y += 116; });
  if (p.sub) {
    ctx.fillStyle = accent;
    ctx.font = '500 40px Barlow, sans-serif';
    _spaced(ctx, localeUpper(p.sub), W / 2, y + 8, 12);
    y += 76;
  }

  // ── Söz / satır ──
  if (p.line) {
    ctx.fillStyle = 'rgba(234,226,214,0.72)';
    ctx.font = 'italic 400 50px "EB Garamond", Georgia, serif';
    const lines = _wrap(ctx, `“${p.line}”`, W - 300);
    y += 40;
    lines.slice(0, 4).forEach(l => { ctx.fillText(l, W / 2, y); y += 66; });
  }
  // kişisel yansıma notu (varsa)
  if (p.note) {
    ctx.fillStyle = _hexA(accent, 0.85);
    ctx.font = 'italic 400 44px "EB Garamond", Georgia, serif';
    const lines = _wrap(ctx, `— ${p.note}`, W - 320);
    y += 28;
    lines.slice(0, 2).forEach(l => { ctx.fillText(l, W / 2, y); y += 58; });
  }

  // ── Alt: ince çizgi + isim + tarih ──
  ctx.strokeStyle = 'rgba(245,166,35,0.3)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W / 2 - 110, H - 290); ctx.lineTo(W / 2 + 110, H - 290); ctx.stroke();
  ctx.fillStyle = 'rgba(234,226,214,0.8)';
  ctx.font = '500 42px Barlow, sans-serif';
  ctx.fillText(p.footer || _userName(), W / 2, H - 218);
  ctx.fillStyle = 'rgba(234,226,214,0.4)';
  ctx.font = '400 32px Barlow, sans-serif';
  ctx.fillText(_trDate(), W / 2, H - 164);

  // fener mührü — markanın merkez sigili (12c kart sırtının imzası)
  ctx.save();
  ctx.translate(W / 2, H - 112);
  ctx.scale(0.6, 0.6);
  ctx.strokeStyle = _hexA(accent, 0.7); ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, -32); ctx.lineTo(24, -12); ctx.lineTo(10, 28); ctx.lineTo(-10, 28); ctx.lineTo(-24, -12); ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = _hexA(accent, 0.85);
  ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  return cv;
}

function _spaced(ctx, text, x, y, gap) {
  // harf-aralıklı yazım (canvas letterSpacing desteği tutarsız)
  const t = String(text || '');
  if (!t) return;
  const widths = [...t].map(ch => ctx.measureText(ch).width + gap);
  const total = widths.reduce((a, b) => a + b, 0) - gap;
  let cx = x - total / 2;
  [...t].forEach((ch, i) => {
    ctx.textAlign = 'left';
    ctx.fillText(ch, cx, y);
    cx += widths[i];
  });
  ctx.textAlign = 'center';
}

function _hexA(hex, a) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return `rgba(245,166,35,${a})`;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${a})`;
}

/* ════════════════════════════════════════════════════════════════════
   PAYLAŞIM — native (Capacitor) / web share / indirme
════════════════════════════════════════════════════════════════════ */
function _isNative() {
  try { return !!window.Capacitor?.isNativePlatform?.(); } catch (_) { return false; }
}

async function _shareCanvas(cv, title, tur) {
  // 1) Native: Cache'e yaz + sistem paylaşım sayfası
  if (_isNative()) {
    try {
      const dataUrl = cv.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const path = `wanderer-${Date.now()}.png`;
      await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache });
      const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
      await Share.share({ title: title || 'Wanderer', files: [uri] });
      // Paylaşım Nabzı: story GERÇEKTEN paylaşıldı (12·C) — iptal dalı (aşağıda)
      // bilerek loglanmaz, Share sheet iptali olay değildir.
      try { window.wtLogPaylasim?.('story', { tur }); } catch (_) {}
      return true;
    } catch (e) {
      if (String(e && e.message).includes('canceled')) return true; // kullanıcı vazgeçti
      console.warn('shr native:', e && e.message);
    }
  }
  // 2) Web Share API (dosyalı)
  try {
    const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
    if (blob && navigator.canShare) {
      const file = new File([blob], 'wanderer.png', { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: title || 'Wanderer' });
        try { window.wtLogPaylasim?.('story', { tur }); } catch (_) {}
        return true;
      }
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return true; // kullanıcı vazgeçti
  }
  // 3) Son çare: PNG indir
  try {
    const a = document.createElement('a');
    a.href = cv.toDataURL('image/png');
    a.download = 'wanderer-muhur.png';
    document.body.appendChild(a); a.click(); a.remove();
    showToast(t('shr.card_downloaded', 'Kart görseli indirildi ✦'));
    // Paylaşım Nabzı: 'indir' AYRI bir sonuçtur, başarısızlık değil (12·C).
    // Share sheet'i olmayan bir tarayıcıda kullanıcı yine de kartını aldı —
    // bunu 'story' saymak paylaşımı, hiç saymamak da kullanıcıyı yok sayardı.
    // İç Çalışma 12 FAZ 3: burada sabit 'kart' yazıyordu — oysa bu dal
    // shrShareStory'nin İNDİRME düşüşü ve paylaşılan şey film (Wrapped) ya da
    // rapor (Yol) da olabilir; sabit değer çağıranın belirttiği tur'a devredilir.
    try { window.wtLogPaylasim?.('indir', { tur }); } catch (_) {}
    return true;
  } catch (e) { console.warn('shr download:', e && e.message); }
  return false;
}

/** Tek giriş: story kartını çiz ve paylaş. */
export async function shrShareStory(params) {
  try {
    try { window.fxCue?.('tap'); } catch (_) {}
    const cv = await _drawStory(params || {});
    // Paylaşım Nabzı: neyin paylaşıldığı (kart/rapor/film) çağırandan gelir —
    // _shareCanvas kendi türünü bilmez, tahmin etmez (§6.10).
    const ok = await _shareCanvas(cv, params && params.title, params && params.tur);
    if (ok) { try { window.fxCue?.('holo'); } catch (_) {} }
    return ok;
  } catch (e) {
    console.warn('shrShareStory:', e && e.message);
    showToast(t('shr.prep_failed', 'Paylaşım hazırlanamadı'), true);
    return false;
  }
}

/* ════════════════════════════════════════════════════════════════════
   YAZI PAYLAŞIMI — Kitaplık yazıları için çok-sayfalı görsel.
   Story kartının yazı varyantı: aynı obsidyen taban + altın çerçeve;
   gövde uzunluğuna göre 1-N sayfaya bölünür, her sayfa 1080×1920 PNG.
   Son sayfanın altında "uygulamayı indir" ayakizi (admin paneldeki
   bağlantıdan); paylaşım metnine de aynı bağlantı eklenir.
════════════════════════════════════════════════════════════════════ */

const BODY_FONT = 'italic 400 44px "EB Garamond", Georgia, serif';
const BODY_LH = 64;
const BODY_MARGIN_X = 130;
const BODY_TOP_Y_FIRST = 760;      // ilk sayfada başlık altından başlar
const BODY_TOP_Y_CONT  = 360;      // devam sayfalarında üstten başlar
const BODY_BOTTOM_Y    = 1640;     // altbilgiden önceki son satır y'si

function _bodyParagraphs(text) {
  return String(text || '')
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean);
}

/** Sayfa bazlı satır bölme: her sayfaya kaç satır sığacağını
 *  hesapla, paragraflar arasında 1 boş satır bırak. */
function _paginate(ctx, paragraphs, maxWidth, firstPageY, contPageY, bottomY) {
  ctx.font = BODY_FONT;
  const pages = [];
  let cur = { y0: firstPageY, lines: [] };
  let curBottom = bottomY;

  const flush = () => {
    if (cur.lines.length) pages.push(cur);
    cur = { y0: contPageY, lines: [] };
  };

  for (let p = 0; p < paragraphs.length; p++) {
    if (p > 0) {
      // paragraflar arası boşluk
      const nextY = cur.y0 + (cur.lines.length + 1) * BODY_LH;
      if (nextY <= curBottom) cur.lines.push(null); // null = boş satır
      else flush();
    }
    const para = paragraphs[p];
    const wrapped = _wrap(ctx, para, maxWidth);
    for (const line of wrapped) {
      const nextY = cur.y0 + (cur.lines.length + 1) * BODY_LH;
      if (nextY > curBottom) flush();
      cur.lines.push(line);
    }
  }
  flush();
  // Boş ise en az 1 sayfa
  if (!pages.length) pages.push({ y0: firstPageY, lines: [] });
  return pages;
}

function _drawArticleFrame(ctx, accent) {
  // ── Taban ──
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0E0C13');
  bg.addColorStop(0.4, '#0F0C08');
  bg.addColorStop(1, '#120D09');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const crown = ctx.createRadialGradient(W / 2, -120, 60, W / 2, -120, H * 0.5);
  crown.addColorStop(0, 'rgba(86,74,140,0.16)');
  crown.addColorStop(1, 'rgba(86,74,140,0)');
  ctx.fillStyle = crown; ctx.fillRect(0, 0, W, H);

  const ember = ctx.createRadialGradient(W / 2, H * 1.06, 80, W / 2, H * 1.06, H * 0.55);
  ember.addColorStop(0, 'rgba(255,178,120,0.14)');
  ember.addColorStop(1, 'rgba(255,178,120,0)');
  ctx.fillStyle = ember; ctx.fillRect(0, 0, W, H);

  // grain
  ctx.save();
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? '#EAE2D6' : '#000';
    ctx.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4);
  }
  ctx.restore();

  // çift kenar + köşe tikleri
  ctx.strokeStyle = 'rgba(245,166,35,0.28)'; ctx.lineWidth = 3;
  ctx.strokeRect(54, 54, W - 108, H - 108);
  ctx.strokeStyle = 'rgba(245,166,35,0.10)'; ctx.lineWidth = 1.5;
  ctx.strokeRect(74, 74, W - 148, H - 148);
  ctx.strokeStyle = 'rgba(245,166,35,0.8)'; ctx.lineWidth = 3.5;
  const tick = 36, m = 36;
  [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y0, sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(x, y0 + sy * tick); ctx.lineTo(x, y0); ctx.lineTo(x + sx * tick, y0);
    ctx.stroke();
  });
}

function _drawArticleBrand(ctx, accent, kicker, pageNum, totalPages) {
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = '700 52px Cinzel, serif';
  _spaced(ctx, 'WANDERER', W / 2, 180, 26);
  ctx.fillStyle = 'rgba(234,226,214,0.45)';
  ctx.font = '500 26px Barlow, sans-serif';
  const sub = localeUpper(kicker || t('shr.article_kicker', 'KİTAPLIK')) +
              (totalPages > 1 ? `  ·  ${pageNum} / ${totalPages}` : '');
  _spaced(ctx, sub, W / 2, 232, 6);
}

function _drawArticleFooter(ctx, accent, footerUrl) {
  // ince altın çizgi
  ctx.strokeStyle = 'rgba(245,166,35,0.3)'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 140, H - 220);
  ctx.lineTo(W / 2 + 140, H - 220);
  ctx.stroke();

  if (footerUrl) {
    ctx.fillStyle = _hexA(accent, 0.85);
    ctx.font = '500 30px Barlow, sans-serif';
    _spaced(ctx, t('shr.download_app', 'UYGULAMAYI İNDİR'), W / 2, H - 160, 8);
    ctx.fillStyle = 'rgba(234,226,214,0.62)';
    ctx.font = '500 32px Barlow, sans-serif';
    // URL'i ortala — çok uzunsa sade kısalt (görselde de okunsun, tam adres
    // paylaşım metninde zaten var).
    let shown = String(footerUrl).replace(/^https?:\/\//i, '').replace(/\/$/, '');
    if (shown.length > 42) shown = shown.slice(0, 40) + '…';
    ctx.fillText(shown, W / 2, H - 112);
  } else {
    ctx.fillStyle = 'rgba(234,226,214,0.45)';
    ctx.font = '500 32px Barlow, sans-serif';
    _spaced(ctx, 'WANDERER', W / 2, H - 152, 14);
  }

  // fener mührü
  ctx.save();
  ctx.translate(W / 2, H - 64);
  ctx.scale(0.5, 0.5);
  ctx.strokeStyle = _hexA(accent, 0.7); ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, -32); ctx.lineTo(24, -12); ctx.lineTo(10, 28); ctx.lineTo(-10, 28); ctx.lineTo(-24, -12); ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = _hexA(accent, 0.85);
  ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

async function _drawArticlePages(p) {
  try {
    await Promise.all([
      document.fonts.load('700 52px Cinzel'),
      document.fonts.load('600 96px Fraunces'),
      document.fonts.load('italic 400 44px "EB Garamond"'),
    ]);
  } catch (_) {}

  const accent = '#F5A623';
  const links = await getAppDownloadLinks();
  const footerUrl = downloadFooterUrl(links);

  // Önce gövdeyi bir ölçüm canvas'ında bölelim
  const measure = document.createElement('canvas');
  measure.width = W; measure.height = H;
  const mctx = measure.getContext('2d');
  mctx.font = BODY_FONT;

  // Başlık alanı yüksekliği için bir tahmin — sadece ilk sayfa için
  // başlık + tarih + ince çizgi yaklaşık 200px alır, sonra gövde başlar
  const maxBodyWidth = W - 2 * BODY_MARGIN_X;
  const paragraphs = _bodyParagraphs(p.body);
  const pages = _paginate(mctx, paragraphs, maxBodyWidth, BODY_TOP_Y_FIRST, BODY_TOP_Y_CONT, BODY_BOTTOM_Y);

  const total = pages.length;
  const canvases = [];

  for (let i = 0; i < total; i++) {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');

    _drawArticleFrame(ctx, accent);
    _drawArticleBrand(ctx, accent, p.kicker || t('shr.article_kicker', 'KİTAPLIK'), i + 1, total);

    if (i === 0) {
      // Başlık + tarih + ince ayraç
      ctx.textAlign = 'center';
      ctx.fillStyle = '#EAE2D6';
      ctx.font = '600 88px Fraunces, Georgia, serif';
      const titleLines = _wrap(ctx, p.title || '', W - 220);
      let ty = 380;
      titleLines.slice(0, 3).forEach(l => { ctx.fillText(l, W / 2, ty); ty += 100; });

      if (p.dateLabel) {
        ctx.fillStyle = _hexA(accent, 0.7);
        ctx.font = '500 28px Barlow, sans-serif';
        _spaced(ctx, localeUpper(p.dateLabel), W / 2, ty + 20, 8);
      }

      // ince altın ayraç
      ctx.strokeStyle = 'rgba(245,166,35,0.4)'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 90, BODY_TOP_Y_FIRST - 90);
      ctx.lineTo(W / 2 + 90, BODY_TOP_Y_FIRST - 90);
      ctx.stroke();
    }

    // Gövde
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(234,226,214,0.88)';
    ctx.font = BODY_FONT;
    const { y0, lines } = pages[i];
    let by = y0;
    for (const line of lines) {
      if (line === null) { by += BODY_LH; continue; }   // paragraf boşluğu
      ctx.fillText(line, BODY_MARGIN_X, by);
      by += BODY_LH;
    }

    _drawArticleFooter(ctx, accent, i === total - 1 ? footerUrl : '');

    canvases.push(cv);
  }

  return { canvases, links };
}

/* ── Çoklu dosya paylaşımı ── */
async function _shareCanvases(canvases, title, text) {
  // 1) Native
  if (_isNative()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const uris = [];
      const stamp = Date.now();
      for (let i = 0; i < canvases.length; i++) {
        const dataUrl = canvases[i].toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        const path = `wanderer-${stamp}-${i + 1}.png`;
        await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache });
        const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
        uris.push(uri);
      }
      await Share.share({ title: title || 'Wanderer', text: text || undefined, files: uris });
      // Paylaşım Nabzı: yazı GERÇEKTEN paylaşıldı (12·C) — iptal dalı bilerek loglanmaz.
      try { window.wtLogPaylasim?.('yazi'); } catch (_) {}
      return true;
    } catch (e) {
      if (String(e && e.message).includes('canceled')) return true;
      console.warn('shr native multi:', e && e.message);
    }
  }
  // 2) Web Share API (çoklu dosya)
  try {
    const files = [];
    for (let i = 0; i < canvases.length; i++) {
      const blob = await new Promise(res => canvases[i].toBlob(res, 'image/png'));
      if (blob) files.push(new File([blob], `wanderer-${i + 1}.png`, { type: 'image/png' }));
    }
    if (files.length && navigator.canShare) {
      const payload = { files, title: title || 'Wanderer' };
      if (text) payload.text = text;
      if (navigator.canShare(payload)) {
        await navigator.share(payload);
        try { window.wtLogPaylasim?.('yazi'); } catch (_) {}
        return true;
      }
      // Çoklu desteklenmiyorsa tek-dosya dene
      if (files.length === 1 && navigator.canShare({ files: [files[0]] })) {
        await navigator.share({ files: [files[0]], title: title || 'Wanderer', text: text || undefined });
        try { window.wtLogPaylasim?.('yazi'); } catch (_) {}
        return true;
      }
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return true;
  }
  // 3) Son çare: tüm sayfaları indir
  try {
    for (let i = 0; i < canvases.length; i++) {
      const a = document.createElement('a');
      a.href = canvases[i].toDataURL('image/png');
      a.download = `wanderer-yazi-${i + 1}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      await new Promise(r => setTimeout(r, 120));   // tarayıcı çoklu indirmeyi sıraya alsın
    }
    if (text) {
      try { await navigator.clipboard.writeText(text); showToast(t('shr.images_downloaded_clipboard', 'Görseller indirildi · metin panoda ✦')); }
      catch (_) { showToast(t('shr.images_downloaded', 'Görseller indirildi ✦')); }
    } else {
      showToast(t('shr.images_downloaded', 'Görseller indirildi ✦'));
    }
    // Paylaşım Nabzı: çok sayfalı yazı indirildi — tek olay, sayfa başına değil
    // (n sayfa n paylaşım değildir).
    // İç Çalışma 12 FAZ 3: bu sabit KASITLI olarak dokunulmadı — bu dal yalnız
    // shrShareArticle'ın (Kitaplık yazısı) indirme düşüşüdür, tek çağıranı
    // vardır ve o çağıran her zaman bir rapor paylaşır; _shareCanvas'ın aksine
    // burada birden çok tür taşıyan bir çağıran yok.
    try { window.wtLogPaylasim?.('indir', { tur: 'rapor' }); } catch (_) {}
    return true;
  } catch (e) { console.warn('shr download multi:', e && e.message); }
  return false;
}

/** Tek giriş: Kitaplık yazısını N sayfalık görsel kart hâlinde paylaş.
 *  params: { title, body, dateLabel, kicker } */
export async function shrShareArticle(params) {
  try {
    try { window.fxCue?.('tap'); } catch (_) {}
    showToast(t('shr.preparing', 'Paylaşım hazırlanıyor…'));
    const { canvases, links } = await _drawArticlePages(params || {});
    const linkLine = downloadLinkLine(links);
    const titleLine = (params && params.title) ? `"${params.title}"\n\n— Wanderer` : 'Wanderer';
    const text = linkLine ? `${titleLine}\n\n${linkLine}` : titleLine;
    const ok = await _shareCanvases(canvases, params && params.title, text);
    if (ok) { try { window.fxCue?.('holo'); } catch (_) {} }
    return ok;
  } catch (e) {
    console.warn('shrShareArticle:', e && e.message);
    showToast(t('shr.prep_failed', 'Paylaşım hazırlanamadı'), true);
    return false;
  }
}

/* ── window expose ── */
if (typeof window !== 'undefined') {
  window.shrShareStory = shrShareStory;
  window.shrShareArticle = shrShareArticle;
}
