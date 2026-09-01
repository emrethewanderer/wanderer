// Wanderer AI — KART GÖRSEL DİLİ (12c) · "Kart Sırtı" + "Kapı · Lapis Gece"
// ════════════════════════════════════════════════════════════════════════════
// Tek doğruluk kaynağı: uygulamadaki TÜM kart yüzeyleri (10q Kişi Kartı,
// 12a yolculuk kartı, 10t kilometre kartları…) bu modülün şablonundan çizilir.
//
// TASARIM DİLİ (Emre'nin referans tasarımlarından):
//   • 5:7 kart; ince çift çerçeve + 4 köşe tiki; Cinzel majüskül + EB Garamond.
//   • İKİ KUTUP: altın/obsidyen = ŞİMDİ (olduğun kişi, mühür) —
//                lapis gece    = GELECEK (olmak istediğin kişi, hedef, hayal).
//     "altın çerçeve şimdi, lapis gece gelecek."
//   • KART SIRTI: koleksiyonun ortak yüzü — kafes dokusu, çift halka,
//     fener-mührü, EMRE THE WANDERER.
//   • SAHNE: her kartın görseli içeriğiyle uyumlu — kategori sahneyi,
//     glyph figürü, erdem aksanı, kademe (filiz/kök/taç) bitkiyi,
//     kart kimliği (id) yıldız haritasını belirler.
//
// Konvansiyon: stiller JS-enjekte (ikvEnsureStyles) → CSS-link'ten bağımsız.
// Boyutlandırma: container query (cqw) + px fallback → 96px grid hücresinden
// 280px detay kartına kadar aynı şablon ölçeklenir.
// ════════════════════════════════════════════════════════════════════════════

import { wsArchFigureBody } from './12a-archetypes.js';

/* ── Palet (base.css token'larının kart-yerel sabitleri — SVG içinde var()
      her yerde çalışmadığından düz değer kullanılır) ─────────────────────── */
export const IKV = {
  gold:       '#F5A623',
  goldBright: '#F7C744',
  goldSoft:   'rgba(245,166,35,0.55)',
  lapis:      '#5A8AD8',
  lapisDeep:  '#182E5C',
  lapisSoft:  'rgba(90,138,216,0.55)',
  ivory:      '#EAE2D6',
  star:       '#CBD8F0',
  starWarm:   '#F0D9A8',
  dim:        '#585349',
};

/* Palet varyantları: kart çerçevesi/zemini/gökyüzü.
   gold  → şimdi/mühür (sıcak obsidyen + şafak ışığı)
   lapis → hedef/hayal (lapis gece + yıldızlar; kapı ve figür ALTIN kalır) */
const PALETTES = {
  gold: {
    cls: 'ikv-card--gold',
    accent: IKV.gold, accentBright: IKV.goldBright,
    sky: ['#33240F', '#1A1208', '#0F0B06'],
    star: IKV.starWarm,
    glow: 'rgba(245,166,35,0.55)',
  },
  lapis: {
    cls: 'ikv-card--lapis',
    accent: IKV.lapis, accentBright: '#7FA6E4',
    sky: ['#182E5C', '#101A30', '#0B0F1B'],
    star: IKV.star,
    glow: 'rgba(245,166,35,0.55)',   // eşik ışığı her zaman altın — "şimdi"nin daveti
  },
};

/* ── Deterministik tohum — kart kimliği yıldız haritasını/aksan yerleşimini
      belirler: her kart görsel olarak da TEK ─────────────────────────────── */
export function ikvSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) { h ^= String(str).charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5; h |= 0;
    return ((h >>> 0) % 10000) / 10000;
  };
}

/* ── Yıldız tarlası — sahnenin gökyüzü bölgesine serpilir ────────────────── */
function ikvStars(rnd, n, x0, x1, y0, y1, color, skip) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd() * (x1 - x0);
    const y = y0 + rnd() * (y1 - y0);
    const r = 0.7 + rnd() * 1.6;
    const o = 0.35 + rnd() * 0.55;
    // skip: bir bölgeyi yıldızsız bırakır (yüz madalyonunun içi) — tohum
    // akışı BOZULMAZ, yalnız o yıldız basılmaz; deterministiklik korunur.
    if (skip && skip(x, y)) continue;
    // class + --i: sahne matematiği DEĞİŞMEZ; yalnız yaşayan sahnenin CSS'i
    // tutunacak bir yer kazanır — --i her yıldıza kendi gecikmesini verir,
    // yoksa hepsi tek ağızdan yanıp söner ve doku değil "flaş" olur.
    out += `<circle class="ikv-star" style="--i:${i}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${o.toFixed(2)}"/>`;
    if (r > 1.9) out += `<circle class="ikv-star" style="--i:${i}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r * 2.4).toFixed(1)}" fill="${color}" opacity="0.08"/>`;
  }
  return out;
}

/* ── Beş köşeli yıldız path'i (hedefin yıldızı — figürün üstünde) ────────── */
function ikvStarPath(cx, cy, s, color, opacity = 0.9) {
  return `<path d="M${cx} ${cy - s} L${cx + s * 0.28} ${cy - s * 0.31} L${cx + s} ${cy - s * 0.31} L${cx + s * 0.42} ${cy + s * 0.12} L${cx + s * 0.64} ${cy + s * 0.81} L${cx} ${cy + s * 0.38} L${cx - s * 0.64} ${cy + s * 0.81} L${cx - s * 0.42} ${cy + s * 0.12} L${cx - s} ${cy - s * 0.31} L${cx - s * 0.28} ${cy - s * 0.31} Z" fill="${color}" opacity="${opacity}"/>`;
}

/* ── Fener mührü — markanın merkez sigili (kart sırtı + ff-card) ─────────── */
export function ikvLantern(size = 84, color = IKV.gold) {
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" style="overflow:visible;">
    <path d="M50 18 L74 38 L60 78 L40 78 L26 38 Z" fill="none" stroke="${color}" stroke-width="1.6" style="filter:drop-shadow(0 0 6px ${color});"/>
    <path d="M26 38 L74 38 M50 18 L50 78 M40 78 L26 38 M60 78 L74 38" stroke="${color}" stroke-width="0.7" fill="none" opacity="0.55"/>
    <circle cx="50" cy="50" r="3" fill="${color}"/>
  </svg>`;
}

/* ════════════════════════════════════════════════════════════════════════
   ERDEM AKSANLARI — figürün yanına/altına işlenen küçük anlam imleri
═══════════════════════════════════════════════════════════════════════════ */
function ikvVirtueAccent(virtue, P, rnd) {
  const a = P.accent === IKV.lapis ? IKV.gold : P.accent;  // aksan hep altın okunur
  const g = `stroke="${a}" fill="none" stroke-width="1"`;
  switch (virtue) {
    case 'sebat':   // zincir halkaları — üst üste günler
      return `<g opacity="0.7"><circle cx="58" cy="216" r="4" ${g}/><circle cx="66" cy="216" r="4" ${g}/><circle cx="74" cy="216" r="4" ${g}/></g>`;
    case 'bolluk':  // taşan kâse
      return `<g opacity="0.75"><path d="M132 212 q8 8 20 0" ${g}/><circle cx="138" cy="206" r="1.2" fill="${a}"/><circle cx="143" cy="202" r="1" fill="${a}"/><circle cx="148" cy="206" r="1.2" fill="${a}"/></g>`;
    case 'ozsaygi': // sınır yayı — figürü saran koruma
      return `<path d="M52 224 a48 24 0 0 1 96 0" ${g} stroke-dasharray="3 4" opacity="0.55"/>`;
    case 'durust':  // açık göz
      return `<g opacity="0.7"><path d="M128 208 q10 -7 20 0 q-10 7 -20 0 Z" ${g}/><circle cx="138" cy="208" r="1.6" fill="${a}"/></g>`;
    case 'ozguven': // dikilmiş asa/kılıç
      return `<g opacity="0.75"><line x1="140" y1="190" x2="140" y2="222" stroke="${a}" stroke-width="1.2"/><line x1="134" y1="196" x2="146" y2="196" stroke="${a}" stroke-width="1"/></g>`;
    case 'ozdeger': // elmas
      return `<path d="M138 200 l6 6 -6 8 -6 -8 Z" ${g} opacity="0.8"/>`;
    case 'ozsevgi': // içte ısınan çekirdek
      return `<g opacity="0.7"><circle cx="62" cy="206" r="5" ${g}/><circle cx="62" cy="206" r="1.5" fill="${a}"/></g>`;
    case 'niyet':   // pusula yıldızı
      return `<g opacity="0.75"><path d="M138 198 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5 Z" fill="${a}" opacity="0.8"/></g>`;
    case 'sukur':   // yükselen üç nokta — sayılan şükürler
      return `<g opacity="0.75"><circle cx="60" cy="214" r="1.4" fill="${a}"/><circle cx="63" cy="206" r="1.2" fill="${a}" opacity="0.7"/><circle cx="66" cy="199" r="1" fill="${a}" opacity="0.5"/></g>`;
    case 'yansima': // yansıma çizgisi
      return `<path d="M70 228 q30 6 60 0" stroke="${a}" stroke-width="0.7" fill="none" opacity="0.45" stroke-dasharray="2 3"/>`;
    case 'odak':    // toplanan ışınlar
      return `<g opacity="0.55" stroke="${a}" stroke-width="0.6"><line x1="126" y1="194" x2="138" y2="208"/><line x1="152" y1="196" x2="142" y2="208"/><line x1="148" y1="222" x2="141" y2="211"/></g>`;
    default: return '';
  }
}

/* ════════════════════════════════════════════════════════════════════════
   SAHNELER — kategori → sahne; viewBox 0 0 200 250
   Her sahne: gökyüzü + mimari motif + figür + zemin ışığı + erdem aksanı
═══════════════════════════════════════════════════════════════════════════ */
const CAT_STAGE = {
  cekirdek: 'kapi',    temel: 'fidan',   derinlik: 'derinlik',
  manifesto: 'yildiz', golge: 'golge',   perde: 'perde',
  tuzak: 'tuzak',      surec: 'halka',   gercek: 'pencere',
  bilesik: 'cift',
};

function ikvFigure(glyph, color, x = 56, y = 92, scale = 0.74, opacity = 1, halo = true) {
  return `<g transform="translate(${x},${y}) scale(${scale})" opacity="${opacity}">${wsArchFigureBody(glyph || 'wanderer', color, halo)}</g>`;
}

/* Ortak: kemer (kapı) path'i — altın çerçeve, içi gökyüzü */
function ikvArch(P, x = 40, w = 120, top = 42, bottom = 226, opts = {}) {
  const r = w / 2;
  const skyId = opts.skyId || 'ikvSky';
  const d = `M${x} ${bottom} L${x} ${top + r} A${r} ${r} 0 0 1 ${x + w} ${top + r} L${x + w} ${bottom} Z`;
  return {
    defs: `<linearGradient id="${skyId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${P.sky[0]}"/><stop offset="0.55" stop-color="${P.sky[1]}"/><stop offset="1" stop-color="${P.sky[2]}"/>
    </linearGradient>`,
    fill: `<path d="${d}" fill="url(#${skyId})" stroke="none"/>`,
    stroke: `<path d="${d}" fill="none" stroke="${IKV.gold}" stroke-width="1.3" opacity="${opts.strokeOpacity == null ? 0.95 : opts.strokeOpacity}" style="filter:drop-shadow(0 0 5px rgba(245,166,35,0.35));"/>`,
    clip: `<clipPath id="${skyId}-clip"><path d="${d}"/></clipPath>`,
    d,
  };
}

/* Zemin ışıması — eşikten taşan sıcak ışık */
function ikvGroundGlow(cx = 100, y = 226, w = 76, color = 'rgba(245,166,35,0.55)', id = 'ikvGg') {
  return `<defs><radialGradient id="${id}" cx="0.5" cy="1" r="1"><stop offset="0" stop-color="${color}"/><stop offset="0.75" stop-color="rgba(0,0,0,0)"/></radialGradient></defs>
    <ellipse class="ikv-gglow" cx="${cx}" cy="${y}" rx="${w}" ry="16" fill="url(#${id})"/>`;
}

/* ── IŞIK NABZI — motifin TAMAMI değil, ışık VEREN parçası yanar ─────────
   Fenerin alevi titrer, direği durur; kapının eşiği nefes alır, kemeri
   durur. Bu yüzden ikv-mv (sarmalayıcı) yerine doğrudan ışık düğümüne
   basılır — ve yalnız OPACITY oynattığı için transform taşıyan düğüme de
   güvenlidir (ikv-mv'nin aksine; bkz. IKV_MV notu).

   `--o` tabanı korur: her ışığın kendi opaklığı vardır (eşik 0.35, alev 1)
   ve keyframe o tabana GÖRE nabız atar. Sabit bir 0→1 aralığı sönük
   ışıkları da göz alıcı yapar, sahnenin derinliğini düzleştirirdi.
   `gec` (negatif animation-delay) aynı ışığın iki kopyasını ayırır —
   iki pencere aynı anda yanıp sönerse "şehir" değil "flaşör" olur. */
function _isik(o = 1, opt = {}) {
  const st = [`--o:${o}`];
  if (opt.gec != null) st.push(`animation-delay:${opt.gec}s`);
  if (opt.filtre) st.push(`filter:${opt.filtre}`);
  return `opacity="${o}" class="ikv-isik${opt.titrek ? ' ikv-isik--titrek' : ''}" style="${st.join(';')}"`;
}

/* Kademe bitkisi (temel kartları: -filiz/-kok/-tac) */
function ikvPlant(kademe, a) {
  const g = `stroke="${a}" fill="none" stroke-width="1.2" stroke-linecap="round"`;
  if (kademe === 'tac') return `<g>
    <line x1="138" y1="226" x2="138" y2="172" ${g}/>
    <path d="M138 196 q-16 -10 -20 -26 M138 196 q16 -10 20 -26 M138 184 q-10 -8 -12 -20 M138 184 q10 -8 12 -20" ${g} opacity="0.85"/>
    <circle cx="138" cy="164" r="9" fill="none" stroke="${a}" stroke-width="1"/>
    ${ikvStarPath(138, 164, 4.5, a, 0.95)}
    <path d="M138 226 q-8 8 -16 10 M138 226 q8 8 16 10" ${g} opacity="0.5"/></g>`;
  if (kademe === 'kok') return `<g>
    <line x1="138" y1="226" x2="138" y2="188" ${g}/>
    <path d="M138 204 q-12 -8 -14 -20 M138 204 q12 -8 14 -20 M138 214 q-9 -5 -11 -13" ${g} opacity="0.85"/>
    <path d="M138 226 q-9 9 -18 12 M138 226 q9 9 18 12 M138 226 l0 12" ${g} opacity="0.6"/></g>`;
  return `<g>
    <line x1="138" y1="226" x2="138" y2="206" ${g}/>
    <path d="M138 212 q-9 -5 -11 -14 M138 212 q9 -5 11 -14" ${g} opacity="0.9"/>
    <circle cx="138" cy="200" r="1.4" fill="${a}"/></g>`;
}

/* ── SAHNE ÇİZİCİLER ─────────────────────────────────────────────────────── */
const STAGES = {
  /* KAPI — hedef benlik bir kapının ardında durur (çekirdek + varsayılan) */
  kapi(card, P, rnd, o) {
    const arch = ikvArch(P, 40, 120, 42, 226, { skyId: o.uid + 's' });
    const figColor = IKV.gold;
    return `<defs>${arch.defs}</defs>${arch.fill}${arch.clip}
      <g clip-path="url(#${o.uid}s-clip)">${ikvStars(rnd, 8, 46, 154, 50, 150, P.star)}</g>
      ${ikvGroundGlow(100, 226, 72, P.glow, o.uid + 'g')}
      ${ikvFigure(card.glyph, figColor, 61, 110, 0.64, o.fog ? 0.45 : 1)}
      ${o.star ? ikvStarPath(100, 66, 7, IKV.goldBright) : ''}
      ${arch.stroke}`;
  },

  /* FİDAN — Temeller: açık gökyüzü, kademe bitkisi (filiz→kök→taç) */
  fidan(card, P, rnd, o) {
    const a = IKV.gold;
    return `<defs><linearGradient id="${o.uid}s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${P.sky[0]}"/><stop offset="1" stop-color="${P.sky[2]}"/></linearGradient></defs>
      <rect x="22" y="34" width="156" height="192" fill="url(#${o.uid}s)"/>
      ${ikvStars(rnd, 7, 28, 172, 42, 130, P.star)}
      <line x1="22" y1="226" x2="178" y2="226" stroke="${a}" stroke-width="0.8" opacity="0.6"/>
      ${ikvGroundGlow(96, 226, 64, P.glow, o.uid + 'g')}
      ${ikvFigure(card.glyph, a, 48, 100, 0.7, o.fog ? 0.45 : 1)}
      ${ikvPlant(o.kademe || 'filiz', a)}
      <rect x="22" y="34" width="156" height="192" fill="none" stroke="${IKV.gold}" stroke-width="1" opacity="0.55"/>`;
  },

  /* DERİNLİK — aşağı inen basamaklar, fenerle inilen kuyu-kemeri */
  derinlik(card, P, rnd, o) {
    const a = IKV.gold;
    const arch = ikvArch(P, 44, 112, 50, 226, { skyId: o.uid + 's' });
    let steps = '';
    for (let i = 0; i < 4; i++) {
      const y = 226 - i * 13, inset = 14 + i * 11;
      steps += `<line x1="${44 + inset}" y1="${y}" x2="${156 - inset}" y2="${y}" stroke="${a}" stroke-width="0.8" opacity="${0.7 - i * 0.13}"/>`;
    }
    return `<defs>${arch.defs}</defs>${arch.fill}${arch.clip}
      <g clip-path="url(#${o.uid}s-clip)">${ikvStars(rnd, 5, 50, 150, 58, 120, P.star)}${steps}</g>
      ${ikvGroundGlow(100, 226, 56, P.glow, o.uid + 'g')}
      ${ikvFigure(card.glyph, a, 58, 84, 0.68, o.fog ? 0.45 : 1)}
      <circle cx="128" cy="176" r="3" fill="${a}" opacity="0.9" style="filter:drop-shadow(0 0 5px ${a});"/>
      ${arch.stroke}`;
  },

  /* YILDIZ — Manifesto: takımyıldız + yukarı bakan figür */
  yildiz(card, P, rnd, o) {
    const a = IKV.gold;
    const pts = [];
    for (let i = 0; i < 5; i++) pts.push([40 + rnd() * 120, 50 + rnd() * 64]);
    const constellation = pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="1.8" fill="${P.star}"/>`).join('') +
      pts.slice(1).map((p, i) => `<line x1="${pts[i][0].toFixed(1)}" y1="${pts[i][1].toFixed(1)}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}" stroke="${P.star}" stroke-width="0.5" opacity="0.4"/>`).join('');
    return `<defs><linearGradient id="${o.uid}s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${P.sky[0]}"/><stop offset="1" stop-color="${P.sky[2]}"/></linearGradient></defs>
      <rect x="22" y="34" width="156" height="192" fill="url(#${o.uid}s)"/>
      ${ikvStars(rnd, 9, 28, 172, 40, 140, P.star)}
      ${constellation}
      ${ikvStarPath(100, 58, 8, IKV.goldBright)}
      <line x1="22" y1="226" x2="178" y2="226" stroke="${a}" stroke-width="0.8" opacity="0.6"/>
      ${ikvGroundGlow(100, 226, 70, P.glow, o.uid + 'g')}
      ${ikvFigure(card.glyph, a, 56, 100, 0.7, o.fog ? 0.45 : 1)}
      <rect x="22" y="34" width="156" height="192" fill="none" stroke="${IKV.gold}" stroke-width="1" opacity="0.55"/>`;
  },

  /* GÖLGE — Gölgeden Işığa: yarı karanlık / yarı şafak, ikiz figür */
  golge(card, P, rnd, o) {
    const arch = ikvArch(P, 40, 120, 42, 226, { skyId: o.uid + 's' });
    return `<defs>${arch.defs}
      <linearGradient id="${o.uid}d" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="rgba(0,0,0,0.78)"/><stop offset="0.5" stop-color="rgba(0,0,0,0.45)"/><stop offset="0.5" stop-color="rgba(0,0,0,0)"/></linearGradient></defs>
      ${arch.fill}${arch.clip}
      <g clip-path="url(#${o.uid}s-clip)">
        ${ikvStars(rnd, 6, 100, 154, 50, 150, P.star)}
        <path d="${arch.d}" fill="url(#${o.uid}d)"/>
        <line x1="100" y1="44" x2="100" y2="226" stroke="${IKV.gold}" stroke-width="0.5" opacity="0.4" stroke-dasharray="3 4"/>
      </g>
      ${ikvGroundGlow(122, 226, 56, P.glow, o.uid + 'g')}
      ${ikvFigure(card.glyph, '#3A332A', 22, 100, 0.62, 0.8, false)}
      ${ikvFigure(card.glyph, IKV.gold, 84, 96, 0.68, o.fog ? 0.5 : 1)}
      ${arch.stroke}`;
  },

  /* PERDE — kemerde aralanan perde, aralıktan geçen figür */
  perde(card, P, rnd, o) {
    const a = IKV.gold;
    const arch = ikvArch(P, 40, 120, 42, 226, { skyId: o.uid + 's' });
    let folds = '';
    for (const [x0, sway, op] of [[52, 6, 0.8], [64, 4, 0.6], [148, -6, 0.8], [136, -4, 0.6]]) {
      folds += `<path d="M${x0} 48 q${sway} 60 0 90 q${-sway} 50 ${sway * 0.6} 86" stroke="${a}" stroke-width="0.9" fill="none" opacity="${op}"/>`;
    }
    return `<defs>${arch.defs}</defs>${arch.fill}${arch.clip}
      <g clip-path="url(#${o.uid}s-clip)">${ikvStars(rnd, 5, 78, 124, 54, 120, P.star)}${folds}</g>
      ${ikvGroundGlow(100, 226, 60, P.glow, o.uid + 'g')}
      ${ikvFigure(card.glyph, a, 58, 100, 0.68, o.fog ? 0.45 : 1)}
      ${arch.stroke}`;
  },

  /* TUZAK — yoldaki kapan işareti; figür ÜZERİNDEN geçmiş (aşılmış tuzak) */
  tuzak(card, P, rnd, o) {
    const a = IKV.gold;
    return `<defs><linearGradient id="${o.uid}s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${P.sky[0]}"/><stop offset="1" stop-color="${P.sky[2]}"/></linearGradient></defs>
      <rect x="22" y="34" width="156" height="192" fill="url(#${o.uid}s)"/>
      ${ikvStars(rnd, 6, 28, 172, 42, 120, P.star)}
      <path d="M30 226 L170 226" stroke="${a}" stroke-width="0.8" opacity="0.6"/>
      <g opacity="0.85"><circle cx="64" cy="218" r="10" fill="none" stroke="${IKV.dim}" stroke-width="1.4"/>
        <line x1="56" y1="210" x2="72" y2="226" stroke="${IKV.dim}" stroke-width="1.4"/></g>
      <path d="M58 196 q22 -22 46 -2" stroke="${a}" stroke-width="0.7" fill="none" stroke-dasharray="3 3" opacity="0.6"/>
      ${ikvGroundGlow(124, 226, 56, P.glow, o.uid + 'g')}
      ${ikvFigure(card.glyph, a, 76, 100, 0.68, o.fog ? 0.45 : 1)}
      <rect x="22" y="34" width="156" height="192" fill="none" stroke="${IKV.gold}" stroke-width="1" opacity="0.55"/>`;
  },

  /* HALKA — Süreç: çift halkanın içinde yürüyen figür + spiral iz */
  halka(card, P, rnd, o) {
    const a = IKV.gold;
    return `<defs><radialGradient id="${o.uid}s" cx="0.5" cy="0.45" r="0.8">
        <stop offset="0" stop-color="${P.sky[0]}"/><stop offset="1" stop-color="${P.sky[2]}"/></radialGradient></defs>
      <circle cx="100" cy="130" r="84" fill="url(#${o.uid}s)"/>
      ${ikvStars(rnd, 6, 40, 160, 60, 120, P.star)}
      <circle cx="100" cy="130" r="84" fill="none" stroke="${a}" stroke-width="1.1" opacity="0.9"/>
      <circle cx="100" cy="130" r="74" fill="none" stroke="${a}" stroke-width="0.6" opacity="0.4"/>
      <path d="M100 196 a40 40 0 0 1 -34 -52 a30 30 0 0 1 44 -18 a20 20 0 0 1 6 30" stroke="${a}" stroke-width="0.6" fill="none" opacity="0.5" stroke-dasharray="2 3"/>
      ${ikvGroundGlow(100, 206, 56, P.glow, o.uid + 'g')}
      ${ikvFigure(card.glyph, a, 58, 84, 0.66, o.fog ? 0.45 : 1)}`;
  },

  /* PENCERE — Gerçek Hayat: pencereden görünen sokak/ufuk, önünde figür */
  pencere(card, P, rnd, o) {
    const a = IKV.gold;
    return `<defs><linearGradient id="${o.uid}s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${P.sky[0]}"/><stop offset="1" stop-color="${P.sky[2]}"/></linearGradient></defs>
      <rect x="36" y="42" width="128" height="120" fill="url(#${o.uid}s)"/>
      ${ikvStars(rnd, 5, 42, 158, 48, 100, P.star)}
      <line x1="36" y1="118" x2="164" y2="118" stroke="${P.star}" stroke-width="0.6" opacity="0.5"/>
      <path d="M52 118 l0 -14 12 0 0 14 M118 118 l0 -20 16 0 0 20 M140 118 l0 -11 10 0 0 11" stroke="${P.star}" stroke-width="0.7" fill="none" opacity="0.55"/>
      <rect x="36" y="42" width="128" height="120" fill="none" stroke="${a}" stroke-width="1.2" opacity="0.95"/>
      <line x1="100" y1="42" x2="100" y2="162" stroke="${a}" stroke-width="0.6" opacity="0.5"/>
      ${ikvGroundGlow(100, 226, 64, P.glow, o.uid + 'g')}
      ${ikvFigure(card.glyph, a, 56, 116, 0.62, o.fog ? 0.45 : 1)}`;
  },

  /* ÇİFT — Bileşik Kişiler: iç içe iki kemer, omuz omuza iki figür */
  cift(card, P, rnd, o) {
    const a = IKV.gold;
    const arch1 = ikvArch(P, 28, 108, 50, 226, { skyId: o.uid + 's', strokeOpacity: 0.55 });
    const arch2 = ikvArch(P, 66, 108, 42, 226, { skyId: o.uid + 't' });
    return `<defs>${arch1.defs}${arch2.defs}</defs>
      ${arch1.fill}${arch2.fill}${arch2.clip}
      <g clip-path="url(#${o.uid}t-clip)">${ikvStars(rnd, 7, 70, 170, 50, 150, P.star)}</g>
      ${ikvGroundGlow(102, 226, 76, P.glow, o.uid + 'g')}
      ${ikvFigure(card.glyph, a, 30, 104, 0.62, 0.55, false)}
      ${ikvFigure(card.glyph, a, 78, 96, 0.7, o.fog ? 0.45 : 1)}
      ${arch1.stroke}${arch2.stroke}`;
  },
};

/* ════════════════════════════════════════════════════════════════════════
   SAHNE REÇETESİ KOMPOZİTÖRÜ — Kart Üretim Motoru'nun (12d) çizim ucu
   ─────────────────────────────────────────────────────────────────────────
   FELSEFE: "İçerik-uyum" kuralının tam hâli. 10 sabit kategorik sahne yerine
   her kart, kendi anlamından bestelenmiş bir reçeteyle (spec) çizilir:
   gökyüzü → gök cismi → uzak plan → orta motif → figür → nesneler → yol →
   zemin ışığı. Aynı şablon, aynı el; ama her kartın sahnesi TEK.

   REÇETE ŞEMASI (kompakt nesne; tüm alanlar opsiyonel — ikvNormSpec doldurur):
   {
     cerceve: 'kemer'|'dik'|'daire'|'pencere'|'acik',
     yildiz:  0-12,
     gok:     'hilal'|'gunes'|'dogan'|'takim'|'bulut'|'yagmur'|null,
     uzak:    ['dag'|'tepe'|'deniz'|'sehir'|'orman'|'sur'|'kubbe', ...] (≤2),
     orta:    [ 'kopru' | {m,x,s}, ... ] (≤2)   → IKV_ORTA anahtarları,
     nesne:   [ 'elmas' | {m,x,y,s}, ... ] (≤2) → IKV_NESNE anahtarları,
     fig:     {g:glyph, x, y, s, mod:'tek'|'ikiz'|'cift'|'golge'|'yok'},
     yol:     'kavis'|'spiral'|'taslar'|null,
     isik:    {x, w},
     bitki:   'filiz'|'kok'|'tac'|null,
   }
   viewBox 0 0 200 250 · zemin y=226 · çerçeve içi x:22-178, y:34-226
═══════════════════════════════════════════════════════════════════════════ */

/* ── UZAK PLAN — siluetler; gökyüzünün içinde, figürün ardında ──────────── */
const IKV_UZAK = {
  dag: (P) => `<path d="M22 226 L52 172 L74 194 L104 158 L132 188 L152 170 L178 226" fill="none" stroke="${P.star}" stroke-width="0.8" opacity="0.38"/>
    <path d="M98 168 L110 168 M46 182 L56 182" stroke="${P.star}" stroke-width="0.5" opacity="0.3"/>`,
  tepe: (P) => `<path d="M22 226 Q62 192 102 226" fill="none" stroke="${P.star}" stroke-width="0.7" opacity="0.35"/>
    <path d="M86 226 Q134 186 178 226" fill="none" stroke="${P.star}" stroke-width="0.7" opacity="0.3"/>`,
  deniz: (P) => `<line x1="22" y1="168" x2="178" y2="168" stroke="${P.star}" stroke-width="0.7" opacity="0.5"/>
    <path d="M34 182 q8 -3 16 0 M74 194 q9 -3 18 0 M126 186 q8 -3 16 0 M60 210 q10 -3 20 0 M140 206 q9 -3 18 0" stroke="${P.star}" stroke-width="0.5" fill="none" opacity="0.35"/>
    <path d="M96 168 L92 226 M104 168 L110 226" stroke="${IKV.gold}" stroke-width="0.4" opacity="0.28"/>`,
  sehir: (P) => `<line x1="22" y1="188" x2="178" y2="188" stroke="${P.star}" stroke-width="0.6" opacity="0.45"/>
    <path d="M34 188 l0 -16 12 0 0 16 M58 188 l0 -24 14 0 0 24 M96 188 l0 -13 10 0 0 13 M120 188 l0 -20 16 0 0 20 M150 188 l0 -11 12 0 0 11" stroke="${P.star}" stroke-width="0.7" fill="none" opacity="0.5"/>
    <circle cx="64" cy="172" r="0.9" fill="${IKV.gold}" ${_isik(0.7, { gec: -1.7 })}/><circle cx="127" cy="176" r="0.9" fill="${IKV.gold}" ${_isik(0.6, { gec: -4.2 })}/>`,
  orman: (P) => { let t = ''; for (let i = 0; i < 7; i++) { const x = 32 + i * 22, h = 12 + (i % 3) * 6; t += `<path d="M${x} 226 L${x + 7} ${226 - h} L${x + 14} 226" fill="none" stroke="${P.star}" stroke-width="0.7" opacity="0.35"/>`; } return t; },
  sur: (P) => `<path d="M22 196 L178 196 M22 196 L22 226 M178 196 L178 226" stroke="${P.star}" stroke-width="0.8" fill="none" opacity="0.4"/>
    <path d="M30 196 l0 -6 8 0 0 6 M62 196 l0 -6 8 0 0 6 M96 196 l0 -6 8 0 0 6 M130 196 l0 -6 8 0 0 6 M162 196 l0 -6 8 0 0 6" stroke="${P.star}" stroke-width="0.7" fill="none" opacity="0.42"/>`,
  kubbe: (P) => `<path d="M64 226 L64 196 Q64 172 100 172 Q136 172 136 196 L136 226" fill="none" stroke="${P.star}" stroke-width="0.8" opacity="0.42"/>
    <path d="M100 172 L100 162 M97 160 a4 4 0 1 1 6 0" stroke="${IKV.gold}" stroke-width="0.7" fill="none" ${_isik(0.55)}/>`,
};

/* ── ORTA PLAN — ana mimari/doğa motifi; altın çizgi, figürle aynı sahnede ─ */
const IKV_ORTA = {
  kapi: (P, a, u, m) => { const x = m.x || 128, s = m.s || 1, w = 26 * s, top = 226 - 62 * s;
    return `<path d="M${x - w} 226 L${x - w} ${top + w} A${w} ${w} 0 0 1 ${x + w} ${top + w} L${x + w} 226" fill="none" stroke="${a}" stroke-width="1.1" opacity="0.9" style="filter:drop-shadow(0 0 4px rgba(245,166,35,0.3));"/>
    <ellipse cx="${x}" cy="222" rx="${w * 0.72}" ry="5" fill="${P.glow}" ${_isik(0.35)}/>`; },
  kopru: (P, a, u, m) => { const y = 214 - (m.s ? (m.s - 1) * 20 : 0);
    return `<path d="M28 ${y} Q100 ${y - 58} 172 ${y}" fill="none" stroke="${a}" stroke-width="1.2" opacity="0.85"/>
    <path d="M28 ${y} Q100 ${y - 46} 172 ${y}" fill="none" stroke="${a}" stroke-width="0.5" opacity="0.4"/>
    <line x1="52" y1="${y - 17}" x2="52" y2="${y}" stroke="${a}" stroke-width="0.7" opacity="0.5"/>
    <line x1="148" y1="${y - 17}" x2="148" y2="${y}" stroke="${a}" stroke-width="0.7" opacity="0.5"/>`; },
  kule: (P, a, u, m) => { const x = m.x || 138, s = m.s || 1, h = 78 * s;
    return `<path d="M${x - 11} 226 L${x - 9} ${226 - h} L${x + 9} ${226 - h} L${x + 11} 226" fill="none" stroke="${a}" stroke-width="1" opacity="0.85"/>
    <path d="M${x - 9} ${226 - h} L${x} ${226 - h - 12} L${x + 9} ${226 - h}" fill="none" stroke="${a}" stroke-width="0.9" opacity="0.8"/>
    <circle cx="${x}" cy="${226 - h + 14}" r="2.2" fill="${a}" ${_isik(0.9, { titrek: true, filtre: `drop-shadow(0 0 4px ${a})` })}/>`; },
  fener: (P, a, u, m) => { const x = m.x || 136, s = m.s || 1;
    return `<line x1="${x}" y1="226" x2="${x}" y2="${226 - 54 * s}" stroke="${a}" stroke-width="0.9" opacity="0.8"/>
    <path d="M${x} ${226 - 54 * s} q10 2 12 10" stroke="${a}" stroke-width="0.8" fill="none" opacity="0.7"/>
    <g transform="translate(${x + 12},${226 - 44 * s}) scale(${0.14 * s})"><path d="M0 -18 L24 2 L10 42 L-10 42 L-24 2 Z" fill="none" stroke="${a}" stroke-width="7" style="filter:drop-shadow(0 0 5px ${a});"/><circle cx="0" cy="14" r="6" fill="${a}" ${_isik(1, { titrek: true })}/></g>`; },
  merdiven: (P, a, u, m) => { let t = ''; const n = 5; for (let i = 0; i < n; i++) { const x = 108 + i * 13, y = 226 - i * 13; t += `<path d="M${x} ${y} L${x + 13} ${y} L${x + 13} ${y - 13}" fill="none" stroke="${a}" stroke-width="0.9" opacity="${0.85 - i * 0.1}"/>`; } return t + `<circle cx="${108 + n * 13 + 2}" cy="${226 - n * 13 - 4}" r="1.6" fill="${a}" ${_isik(0.8)}/>`; },
  basamak: (P, a, u, m) => { let t = ''; for (let i = 0; i < 4; i++) { const y = 226 - i * 13, inset = 14 + i * 11; t += `<line x1="${44 + inset}" y1="${y}" x2="${156 - inset}" y2="${y}" stroke="${a}" stroke-width="0.8" opacity="${0.7 - i * 0.13}"/>`; } return t; },
  perde: (P, a) => { let f = ''; for (const [x0, sway, op] of [[52, 6, 0.8], [64, 4, 0.6], [148, -6, 0.8], [136, -4, 0.6]]) { f += `<path d="M${x0} 48 q${sway} 60 0 90 q${-sway} 50 ${sway * 0.6} 86" stroke="${a}" stroke-width="0.9" fill="none" opacity="${op}"/>`; } return f; },
  ayna: (P, a, u, m) => { const x = m.x || 134, s = m.s || 1;
    return `<ellipse cx="${x}" cy="${188 - 22 * s}" rx="${15 * s}" ry="${26 * s}" fill="none" stroke="${a}" stroke-width="1" opacity="0.85"/>
    <path d="M${x - 8} ${180 - 26 * s} q8 -8 16 0" stroke="${P.star}" stroke-width="0.5" fill="none" opacity="0.5"/>
    <path d="M${x - 7} 226 L${x} ${188 + 6 * s} L${x + 7} 226" fill="none" stroke="${a}" stroke-width="0.7" opacity="0.6"/>`; },
  agac: (P, a, u, m) => { const x = m.x || 138, s = m.s || 1;
    return `<g transform="translate(${x - 138},${226 - 226 * s}) scale(${s})"><line x1="138" y1="226" x2="138" y2="172" stroke="${a}" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M138 196 q-16 -10 -20 -26 M138 196 q16 -10 20 -26 M138 184 q-10 -8 -12 -20 M138 184 q10 -8 12 -20" stroke="${a}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.85"/>
    <circle cx="138" cy="164" r="9" fill="none" stroke="${a}" stroke-width="1"/>
    <path d="M138 226 q-8 8 -16 10 M138 226 q8 8 16 10" stroke="${a}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity="0.5"/></g>`; },
  kuyu: (P, a, u, m) => { const x = m.x || 100;
    return `<path d="M${x - 22} 226 L${x - 18} 204 L${x + 18} 204 L${x + 22} 226" fill="none" stroke="${a}" stroke-width="1" opacity="0.85"/>
    <path d="M${x - 14} 204 L${x - 10} 186 M${x + 14} 204 L${x + 10} 186 M${x - 12} 186 L${x + 12} 186" stroke="${a}" stroke-width="0.7" fill="none" opacity="0.6"/>
    <line x1="${x}" y1="186" x2="${x}" y2="210" stroke="${a}" stroke-width="0.5" opacity="0.7"/>
    <circle cx="${x}" cy="212" r="1.8" fill="${a}" ${_isik(0.85, { filtre: `drop-shadow(0 0 4px ${a})` })}/>`; },
  cesme: (P, a, u, m) => { const x = m.x || 132;
    return `<path d="M${x - 16} 226 L${x - 13} 212 L${x + 13} 212 L${x + 16} 226" fill="none" stroke="${a}" stroke-width="1" opacity="0.85"/>
    <line x1="${x}" y1="212" x2="${x}" y2="192" stroke="${a}" stroke-width="0.8" opacity="0.7"/>
    <path d="M${x} 192 q-8 6 -10 16 M${x} 192 q8 6 10 16" stroke="${P.star}" stroke-width="0.6" fill="none" opacity="0.6"/>
    <circle cx="${x - 11}" cy="214" r="0.9" fill="${P.star}" opacity="0.6"/><circle cx="${x + 11}" cy="215" r="0.9" fill="${P.star}" opacity="0.6"/>`; },
  kapan: (P, a) => `<g opacity="0.85"><circle cx="64" cy="218" r="10" fill="none" stroke="${IKV.dim}" stroke-width="1.4"/>
    <line x1="56" y1="210" x2="72" y2="226" stroke="${IKV.dim}" stroke-width="1.4"/></g>
    <path d="M58 196 q22 -22 46 -2" stroke="${IKV.gold}" stroke-width="0.7" fill="none" stroke-dasharray="3 3" opacity="0.6"/>`,
  catal: (P, a) => `<path d="M100 226 Q96 196 74 178 M100 226 Q106 194 130 176" fill="none" stroke="${a}" stroke-width="0.8" opacity="0.65" stroke-dasharray="4 3"/>
    <circle cx="74" cy="174" r="1.6" fill="${IKV.dim}" opacity="0.8"/><circle cx="130" cy="172" r="1.6" fill="${a}" ${_isik(0.9, { filtre: `drop-shadow(0 0 4px ${a})` })}/>`,
  sutun: (P, a) => `<path d="M34 226 L34 64 M42 226 L42 64 M34 64 L42 64 M158 226 L158 64 M166 226 L166 64 M158 64 L166 64" stroke="${a}" stroke-width="0.9" fill="none" opacity="0.6"/>
    <path d="M30 64 L46 64 M154 64 L170 64" stroke="${a}" stroke-width="1.1" opacity="0.7"/>`,
};

/* ── NESNELER — küçük sembolik imler (elmas/kumru: kitap kanonu) ─────────── */
const IKV_NESNE = {
  elmas: (a, x, y, s) => `<g opacity="0.9"><path d="M${x - 8 * s} ${y - 6 * s} L${x - 4 * s} ${y - 11 * s} L${x + 4 * s} ${y - 11 * s} L${x + 8 * s} ${y - 6 * s} L${x} ${y + 8 * s} Z" fill="none" stroke="${a}" stroke-width="1" style="filter:drop-shadow(0 0 4px ${a});"/>
    <path d="M${x - 8 * s} ${y - 6 * s} L${x + 8 * s} ${y - 6 * s} M${x - 4 * s} ${y - 11 * s} L${x} ${y + 8 * s} L${x + 4 * s} ${y - 11 * s}" stroke="${a}" stroke-width="0.5" fill="none" opacity="0.6"/></g>`,
  kumru: (a, x, y, s) => `<g opacity="0.85"><path d="M${x} ${y} q${6 * s} ${-5 * s} ${12 * s} ${-2 * s} q${-2 * s} ${4 * s} ${-8 * s} ${5 * s} q${-6 * s} ${1 * s} ${-10 * s} ${-1 * s} Z" fill="none" stroke="${a}" stroke-width="0.9"/>
    <path d="M${x + 2 * s} ${y - 1 * s} q${2 * s} ${-7 * s} ${8 * s} ${-9 * s} q${-1 * s} ${6 * s} ${-5 * s} ${9 * s}" fill="none" stroke="${a}" stroke-width="0.8"/>
    <circle cx="${x + 11 * s}" cy="${y - 3.4 * s}" r="${0.7 * s}" fill="${a}"/><path d="M${x + 12 * s} ${y - 3 * s} l${3 * s} ${1 * s}" stroke="${a}" stroke-width="0.6"/></g>`,
  terazi: (a, x, y, s) => `<g opacity="0.85" stroke="${a}" fill="none" stroke-width="0.9">
    <line x1="${x}" y1="${y - 14 * s}" x2="${x}" y2="${y + 6 * s}"/><line x1="${x - 11 * s}" y1="${y - 10 * s}" x2="${x + 11 * s}" y2="${y - 10 * s}"/>
    <path d="M${x - 15 * s} ${y - 2 * s} a${4.5 * s} ${4.5 * s} 0 0 0 ${9 * s} 0 M${x - 11 * s} ${y - 10 * s} l${-4 * s} ${8 * s} m${4 * s} ${-8 * s} l${4 * s} ${8 * s}"/>
    <path d="M${x + 6 * s} ${y - 2 * s} a${4.5 * s} ${4.5 * s} 0 0 0 ${9 * s} 0 M${x + 11 * s} ${y - 10 * s} l${-4 * s} ${8 * s} m${4 * s} ${-8 * s} l${4 * s} ${8 * s}"/></g>`,
  pusula: (a, x, y, s) => `<g opacity="0.9"><circle cx="${x}" cy="${y}" r="${9 * s}" fill="none" stroke="${a}" stroke-width="0.8"/>
    <path d="M${x} ${y - 6 * s} L${x + 2 * s} ${y} L${x} ${y + 6 * s} L${x - 2 * s} ${y} Z" fill="${a}" opacity="0.85"/>
    <path d="M${x - 6 * s} ${y} L${x + 6 * s} ${y}" stroke="${a}" stroke-width="0.4" opacity="0.6"/></g>`,
  kitap: (a, x, y, s) => `<g opacity="0.85" stroke="${a}" fill="none" stroke-width="0.9">
    <path d="M${x - 12 * s} ${y} q${6 * s} ${-4 * s} ${12 * s} 0 q${6 * s} ${-4 * s} ${12 * s} 0 l0 ${3 * s} q${-6 * s} ${-4 * s} ${-12 * s} 0 q${-6 * s} ${-4 * s} ${-12 * s} 0 Z"/>
    <line x1="${x}" y1="${y}" x2="${x}" y2="${y + 3 * s}"/><path d="M${x - 8 * s} ${y - 1.4 * s} l${5 * s} ${-0.8 * s} M${x + 3 * s} ${y - 2.2 * s} l${5 * s} ${0.8 * s}" stroke-width="0.5" opacity="0.7"/></g>`,
  muhur: (a, x, y, s) => `<g opacity="0.9"><circle cx="${x}" cy="${y}" r="${8 * s}" fill="none" stroke="${a}" stroke-width="0.9" style="filter:drop-shadow(0 0 4px ${a});"/>
    <path d="M${x} ${y - 4.4 * s} L${x + 3.6 * s} ${y - 1.4 * s} L${x + 2.2 * s} ${y + 4.4 * s} L${x - 2.2 * s} ${y + 4.4 * s} L${x - 3.6 * s} ${y - 1.4 * s} Z" fill="none" stroke="${a}" stroke-width="0.7"/></g>`,
  zincir: (a, x, y, s) => `<g opacity="0.8"><circle cx="${x - 8 * s}" cy="${y}" r="${4 * s}" fill="none" stroke="${a}" stroke-width="1"/><circle cx="${x}" cy="${y}" r="${4 * s}" fill="none" stroke="${a}" stroke-width="1"/><circle cx="${x + 8 * s}" cy="${y}" r="${4 * s}" fill="none" stroke="${a}" stroke-width="1"/></g>`,
  kirikzincir: (a, x, y, s) => `<g opacity="0.85"><circle cx="${x - 9 * s}" cy="${y}" r="${4 * s}" fill="none" stroke="${a}" stroke-width="1"/>
    <path d="M${x - 3 * s} ${y - 2 * s} a${4 * s} ${4 * s} 0 0 1 ${5 * s} ${-1 * s}" fill="none" stroke="${a}" stroke-width="1"/>
    <circle cx="${x + 10 * s}" cy="${y + 5 * s}" r="${4 * s}" fill="none" stroke="${IKV.dim}" stroke-width="0.9" opacity="0.7"/></g>`,
  kumsaati: (a, x, y, s) => `<g opacity="0.85" stroke="${a}" fill="none" stroke-width="0.9">
    <path d="M${x - 6 * s} ${y - 10 * s} L${x + 6 * s} ${y - 10 * s} L${x - 6 * s} ${y + 10 * s} L${x + 6 * s} ${y + 10 * s} Z M${x - 7 * s} ${y - 10 * s} L${x + 7 * s} ${y - 10 * s} M${x - 7 * s} ${y + 10 * s} L${x + 7 * s} ${y + 10 * s}"/>
    <circle cx="${x}" cy="${y + 6 * s}" r="${1 * s}" fill="${a}" stroke="none"/></g>`,
  anahtar: (a, x, y, s) => `<g opacity="0.85" stroke="${a}" fill="none" stroke-width="0.9">
    <circle cx="${x - 6 * s}" cy="${y}" r="${4 * s}"/><line x1="${x - 2 * s}" y1="${y}" x2="${x + 10 * s}" y2="${y}"/>
    <path d="M${x + 6 * s} ${y} l0 ${4 * s} M${x + 10 * s} ${y} l0 ${3 * s}"/></g>`,
  kase: (a, x, y, s) => `<g opacity="0.85"><path d="M${x - 10 * s} ${y} q${10 * s} ${10 * s} ${20 * s} 0" stroke="${a}" fill="none" stroke-width="1"/>
    <circle cx="${x - 4 * s}" cy="${y - 6 * s}" r="${1.2 * s}" fill="${a}"/><circle cx="${x + 1 * s}" cy="${y - 10 * s}" r="${1 * s}" fill="${a}"/><circle cx="${x + 6 * s}" cy="${y - 6 * s}" r="${1.2 * s}" fill="${a}"/></g>`,
  tohum: (a, x, y, s) => `<g opacity="0.9"><circle cx="${x}" cy="${y}" r="${1.6 * s}" fill="${a}"/><path d="M${x} ${y - 2 * s} q${3 * s} ${-4 * s} ${1 * s} ${-8 * s}" stroke="${a}" stroke-width="0.8" fill="none"/></g>`,
  yildiz: (a, x, y, s) => ikvStarPath(x, y, 6 * s, a, 0.9),
  kalp: (a, x, y, s) => `<g opacity="0.8"><circle cx="${x}" cy="${y}" r="${5 * s}" fill="none" stroke="${a}" stroke-width="1"/><circle cx="${x}" cy="${y}" r="${1.5 * s}" fill="${a}"/></g>`,
};

/* ── GÖK CİSİMLERİ — üst gökyüzü ─────────────────────────────────────────── */
const IKV_GOK = {
  hilal: (P, a, rnd) => `<path d="M86 66 a20 20 0 1 0 24 30 a16 16 0 1 1 -24 -30 Z" fill="${a}" opacity="0.8" style="filter:drop-shadow(0 0 7px rgba(245,166,35,0.45));"/>`,
  gunes: (P, a) => { let rays = ''; for (let i = 0; i < 10; i++) { const ang = (i / 10) * Math.PI * 2; rays += `<line x1="${(100 + Math.cos(ang) * 18).toFixed(1)}" y1="${(76 + Math.sin(ang) * 18).toFixed(1)}" x2="${(100 + Math.cos(ang) * 25).toFixed(1)}" y2="${(76 + Math.sin(ang) * 25).toFixed(1)}" stroke="${a}" stroke-width="0.9" opacity="0.7"/>`; }
    return `<circle cx="100" cy="76" r="13" fill="none" stroke="${a}" stroke-width="1.2" style="filter:drop-shadow(0 0 8px rgba(245,166,35,0.5));"/><circle cx="100" cy="76" r="4" fill="${a}" opacity="0.85"/>${rays}`; },
  dogan: (P, a) => { let rays = ''; for (let i = -3; i <= 3; i++) { const ang = i * 0.34; rays += `<line x1="${(100 + Math.sin(ang) * 22).toFixed(1)}" y1="${(190 - Math.cos(ang) * 22).toFixed(1)}" x2="${(100 + Math.sin(ang) * 32).toFixed(1)}" y2="${(190 - Math.cos(ang) * 32).toFixed(1)}" stroke="${a}" stroke-width="0.9" opacity="0.65"/>`; }
    return `<path d="M84 190 a16 16 0 0 1 32 0 Z" fill="${a}" opacity="0.75" style="filter:drop-shadow(0 0 8px rgba(245,166,35,0.45));"/><line x1="30" y1="190" x2="170" y2="190" stroke="${a}" stroke-width="0.6" opacity="0.5"/>${rays}`; },
  takim: (P, a, rnd) => { const pts = []; for (let i = 0; i < 5; i++) pts.push([44 + rnd() * 112, 50 + rnd() * 58]);
    return pts.map(pt => `<circle cx="${pt[0].toFixed(1)}" cy="${pt[1].toFixed(1)}" r="1.8" fill="${P.star}"/>`).join('') +
      pts.slice(1).map((pt, i) => `<line x1="${pts[i][0].toFixed(1)}" y1="${pts[i][1].toFixed(1)}" x2="${pt[0].toFixed(1)}" y2="${pt[1].toFixed(1)}" stroke="${P.star}" stroke-width="0.5" opacity="0.4"/>`).join(''); },
  bulut: (P, a) => `<path d="M56 76 q6 -10 18 -8 q4 -9 15 -7 q11 1 12 11 q9 2 7 10 L60 82 q-8 -1 -4 -6 Z" fill="none" stroke="${P.star}" stroke-width="0.7" opacity="0.45"/>
    <path d="M118 100 q5 -8 15 -6 q9 1 10 9 L122 104 q-7 -1 -4 -4 Z" fill="none" stroke="${P.star}" stroke-width="0.6" opacity="0.35"/>`,
  yagmur: (P, a) => { let t = ''; for (let i = 0; i < 9; i++) { const x = 38 + i * 16, y = 58 + (i % 3) * 22; t += `<line x1="${x}" y1="${y}" x2="${x - 3}" y2="${y + 9}" stroke="${P.star}" stroke-width="0.6" opacity="0.4"/>`; } return t; },
};

/* ── YOL İMLERİ — zemin dili ─────────────────────────────────────────────── */
const IKV_YOL = {
  kavis: (a) => `<path d="M78 226 L96 168 M122 226 L104 168" stroke="${a}" stroke-width="0.9" opacity="0.65"/><line x1="98" y1="168" x2="102" y2="168" stroke="${a}" stroke-width="0.7" opacity="0.5"/>`,
  spiral: (a) => `<path d="M100 224 a40 40 0 0 1 -34 -52 a30 30 0 0 1 44 -18 a20 20 0 0 1 6 30" stroke="${a}" stroke-width="0.6" fill="none" opacity="0.5" stroke-dasharray="2 3"/>`,
  taslar: (a) => `<ellipse cx="70" cy="222" rx="7" ry="2.4" fill="none" stroke="${a}" stroke-width="0.8" opacity="0.7"/>
    <ellipse cx="92" cy="212" rx="6" ry="2" fill="none" stroke="${a}" stroke-width="0.7" opacity="0.55"/>
    <ellipse cx="110" cy="203" rx="5" ry="1.7" fill="none" stroke="${a}" stroke-width="0.6" opacity="0.45"/>
    <ellipse cx="124" cy="196" rx="4" ry="1.4" fill="none" stroke="${a}" stroke-width="0.5" opacity="0.35"/>`,
};

/* ════════════════════════════════════════════════════════════════════════
   HAREKET HARİTASI — "kart bir resim değil, bir pencere"
   ─────────────────────────────────────────────────────────────────────────
   FELSEFE: Harry Potter'ın portreleri gibi — sahnenin ardında bir hava var
   ve o hava durmadan kıpırdar. Hareket bir ÖDÜL ya da bayrak değil, kartın
   tabiatıdır; bu yüzden burada motifin ADINA bağlıdır, kartın nadirliğine
   değil. Tek istisna anlamlıdır: kilitli kart nefes almaz (bkz. ikvScene).

   Hangi motifin ne yaptığı anlamından okunur — terazi SALINIR (denge),
   kalp NEFES alır, pusula DÖNER, zincir kıpırdamaz (esaret durgundur),
   tuzak kıpırdamaz (kapan beklemektedir). Haritada olmayan motif donuktur:
   sessizlik de bir karardır, her şey birden oynarsa hiçbiri görülmez.

   MEKANİK: sınıf DAİMA dış sarmalayıcıya (`_mv`) basılır, motifin kendi
   düğümüne ASLA — çünkü SVG'de CSS transform, elemanın `transform`
   presentation attribute'unu EZER; sınıfı motifin kendisine koymak
   `translate()/scale()` taşıyan her motifi (agac, fener, figür) kartın sol
   üst köşesine fırlatır.
═══════════════════════════════════════════════════════════════════════════ */
const IKV_MV = {
  gok:   { hilal: 'parla', gunes: 'parla', dogan: 'parla', takim: 'parla', bulut: 'suzul', yagmur: 'dus' },
  uzak:  { deniz: 'dalga' },
  orta:  { perde: 'salin', agac: 'salin', cesme: 'akan' },
  nesne: { elmas: 'parla', kumru: 'suzul', terazi: 'salin', pusula: 'donen', muhur: 'parla',
           kirikzincir: 'salin', kumsaati: 'akan', kase: 'nefes', tohum: 'nefes', yildiz: 'parla', kalp: 'nefes' },
  yol:   {},
};

/* Hareket sarmalayıcısı. `gokMu`: ızgara (mini) hücrede yalnız gök cismi ve
   zemin ışığı yaşar — 12 hücrede onlarca animasyonlu düğüm hem gereksiz hem
   pahalıdır; sınıf hiç basılmazsa CSS'e iş de düşmez. */
function _mv(cls, svg, opt = {}) {
  if (!cls || (opt.mini && !opt.gok)) return svg;
  return `<g class="ikv-mv ikv-mv--${cls}" style="animation-delay:${_mvGec(opt.key || cls)}s">${svg}</g>`;
}

/* Senkron hareket "hayat" demez, "animasyon" der: aynı sahnede salınan ağaç
   ile salınan terazi aynı anda dönerse göz ikisini tek mekanizma olarak
   okur. Gecikme motifin ADINDAN türer — deterministiktir (aynı kart her
   açılışta aynı görünür) ve tohum akışına DOKUNMAZ (rnd() çağrısı eklemek
   yıldız haritasını kaydırırdı). Negatiftir: animasyon ortasından başlar,
   kart açılırken kimse "başlangıç" görmez. */
function _mvGec(key) {
  const s = String(key);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return -(h % 59) / 10;
}

/* ── Motif envanteri — 12d bestecisinin kullanabileceği geçerli anahtarlar ─ */
export const IKV_MOTIF_KEYS = {
  uzak: Object.keys(IKV_UZAK), orta: Object.keys(IKV_ORTA), nesne: Object.keys(IKV_NESNE),
  gok: Object.keys(IKV_GOK), yol: Object.keys(IKV_YOL),
  cerceve: ['kemer', 'dik', 'daire', 'pencere', 'acik'],
  figMod: ['tek', 'ikiz', 'cift', 'golge'],
  bitki: ['filiz', 'kok', 'tac'],
};

/* ── Reçete normalizasyonu — eksik alanları doldur, bilinmeyeni ayıkla ───── */
function _mList(v, dict, max) {
  const arr = Array.isArray(v) ? v : (v ? [v] : []);
  return arr.map(it => (typeof it === 'string' ? { m: it } : (it && it.m ? it : null)))
    .filter(it => it && dict[it.m]).slice(0, max);
}
export function ikvNormSpec(spec) {
  const s = spec || {};
  const fig = s.fig || {};
  return {
    cerceve: ['kemer', 'dik', 'daire', 'pencere', 'acik'].includes(s.cerceve) ? s.cerceve : 'dik',
    yildiz: Math.max(0, Math.min(12, s.yildiz == null ? 7 : +s.yildiz || 0)),
    gok: IKV_GOK[s.gok] ? s.gok : null,
    uzak: _mList(s.uzak, IKV_UZAK, 2),
    orta: _mList(s.orta, IKV_ORTA, 2),
    nesne: _mList(s.nesne, IKV_NESNE, 2),
    fig: fig.mod === 'yok' ? { mod: 'yok' } : {
      g: fig.g || null,   // null → kartın kendi glyph'i
      x: fig.x == null ? 56 : +fig.x, y: fig.y == null ? 98 : +fig.y,
      s: fig.s == null ? 0.68 : +fig.s,
      mod: ['tek', 'ikiz', 'cift', 'golge'].includes(fig.mod) ? fig.mod : 'tek',
    },
    yol: IKV_YOL[s.yol] ? s.yol : null,
    isik: { x: (s.isik && s.isik.x) || 100, w: (s.isik && s.isik.w) || 68 },
    bitki: ['filiz', 'kok', 'tac'].includes(s.bitki) ? s.bitki : null,
  };
}

/* ── KOMPOZİTÖR — reçeteyi katman katman çizer (STAGES sözleşmesi) ───────── */
function ikvComposeScene(card, P, rnd, o) {
  const spec = ikvNormSpec(o.sahne);
  const a = IKV.gold;                       // orta plan/figür aksanı hep altın
  const uid = o.uid;
  const mini = !!o.mini;

  // 1) Çerçeve + gökyüzü
  let defs = '', skyFill = '', frameStroke = '', clipOpen = '', clipClose = '';
  let starBox = [28, 172, 42, 130];
  if (spec.cerceve === 'kemer') {
    const arch = ikvArch(P, 40, 120, 42, 226, { skyId: uid + 's' });
    defs = arch.defs; skyFill = arch.fill + arch.clip; frameStroke = arch.stroke;
    clipOpen = `<g clip-path="url(#${uid}s-clip)">`; clipClose = '</g>';
    starBox = [46, 154, 50, 140];
  } else if (spec.cerceve === 'daire') {
    defs = `<radialGradient id="${uid}s" cx="0.5" cy="0.45" r="0.8"><stop offset="0" stop-color="${P.sky[0]}"/><stop offset="1" stop-color="${P.sky[2]}"/></radialGradient>
      <clipPath id="${uid}s-clip"><circle cx="100" cy="130" r="84"/></clipPath>`;
    skyFill = `<circle cx="100" cy="130" r="84" fill="url(#${uid}s)"/>`;
    frameStroke = `<circle cx="100" cy="130" r="84" fill="none" stroke="${a}" stroke-width="1.1" opacity="0.9"/><circle cx="100" cy="130" r="74" fill="none" stroke="${a}" stroke-width="0.6" opacity="0.4"/>`;
    clipOpen = `<g clip-path="url(#${uid}s-clip)">`; clipClose = '</g>';
    starBox = [40, 160, 60, 120];
  } else if (spec.cerceve === 'pencere') {
    defs = `<linearGradient id="${uid}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.sky[0]}"/><stop offset="1" stop-color="${P.sky[2]}"/></linearGradient>
      <clipPath id="${uid}s-clip"><rect x="36" y="42" width="128" height="120"/></clipPath>`;
    skyFill = `<rect x="36" y="42" width="128" height="120" fill="url(#${uid}s)"/>`;
    frameStroke = `<rect x="36" y="42" width="128" height="120" fill="none" stroke="${a}" stroke-width="1.2" opacity="0.95"/><line x1="100" y1="42" x2="100" y2="162" stroke="${a}" stroke-width="0.6" opacity="0.5"/>`;
    clipOpen = `<g clip-path="url(#${uid}s-clip)">`; clipClose = '</g>';
    starBox = [42, 158, 48, 110];
  } else { // dik | acik
    defs = `<linearGradient id="${uid}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.sky[0]}"/><stop offset="0.55" stop-color="${P.sky[1]}"/><stop offset="1" stop-color="${P.sky[2]}"/></linearGradient>`;
    skyFill = `<rect x="22" y="34" width="156" height="192" fill="url(#${uid}s)"/>`;
    frameStroke = spec.cerceve === 'dik'
      ? `<rect x="22" y="34" width="156" height="192" fill="none" stroke="${IKV.gold}" stroke-width="1" opacity="0.55"/>` : '';
  }

  // 2) Katmanlar (arkadan öne) — mini LOD: uzak¹ + nesne⁰ + yıldız½
  const starN = mini ? Math.min(4, spec.yildiz) : spec.yildiz;
  const stars = starN ? ikvStars(rnd, starN, starBox[0], starBox[1], starBox[2], starBox[3], P.star) : '';
  const gok = spec.gok ? _mv(IKV_MV.gok[spec.gok], IKV_GOK[spec.gok](P, a, rnd), { mini, gok: true, key: spec.gok }) : '';
  const uzakList = mini ? spec.uzak.slice(0, 1) : spec.uzak;
  const uzak = uzakList.map(u => _mv(IKV_MV.uzak[u.m], IKV_UZAK[u.m](P), { mini, key: u.m })).join('');
  const orta = spec.orta.map(mm => _mv(IKV_MV.orta[mm.m], IKV_ORTA[mm.m](P, a, uid, mm), { mini, key: mm.m })).join('');
  const yol = spec.yol ? _mv(IKV_MV.yol[spec.yol], IKV_YOL[spec.yol](a), { mini, key: spec.yol }) : '';
  const ground = spec.cerceve === 'daire' ? '' : `<line x1="22" y1="226" x2="178" y2="226" stroke="${a}" stroke-width="0.8" opacity="0.55"/>`;
  const glow = ikvGroundGlow(spec.isik.x, spec.cerceve === 'daire' ? 206 : 226, spec.isik.w, P.glow, uid + 'g');

  // 3) Figür(ler)
  const g = spec.fig.g || card.glyph || 'wanderer';
  const fo = o.fog ? 0.45 : 1;
  let fig = '';
  if (spec.fig.mod !== 'yok') {
    const { x, y, s } = spec.fig;
    if (spec.fig.mod === 'ikiz') {
      fig = ikvFigure('mirror', a, x, y, s, fo);
    } else if (spec.fig.mod === 'cift') {
      fig = ikvFigure(g, a, x - 26, y + 6, s * 0.92, 0.55, false) + ikvFigure(g, a, x + 14, y - 2, s, fo);
    } else if (spec.fig.mod === 'golge') {
      fig = ikvFigure(g, '#3A332A', x - 34, y + 4, s * 0.94, 0.8, false) + ikvFigure(g, a, x + 22, y - 2, s, fo);
    } else {
      fig = ikvFigure(g, a, x, y, s, fo);
    }
    // Figürün nefesi: sahnedeki kişi durur ama YAŞAR. Sarmalayıcıya basılır,
    // çünkü ikvFigure'ün kendi <g>'si translate/scale taşır (bkz. IKV_MV notu).
    fig = _mv('nefes', fig, { mini, key: 'fig' });
  }

  // 4) Nesneler + bitki + hedef yıldızı
  const nesne = mini ? '' : spec.nesne.map(nn =>
    _mv(IKV_MV.nesne[nn.m], IKV_NESNE[nn.m](a, nn.x == null ? 140 : +nn.x, nn.y == null ? 204 : +nn.y, nn.s == null ? 1 : +nn.s), { key: nn.m })).join('');
  const bitki = spec.bitki ? _mv('salin', ikvPlant(spec.bitki, a), { mini, key: 'bitki' + spec.bitki }) : '';
  const hedefStar = o.star ? _mv('parla', ikvStarPath(100, 60, 7, IKV.goldBright), { mini, gok: true, key: 'hedef' }) : '';

  return `<defs>${defs}</defs>${skyFill}
    ${clipOpen}${stars}${gok}${uzak}${clipClose}
    ${clipOpen}${orta}${clipClose}
    ${ground}${yol}${glow}${fig}${nesne}${bitki}${hedefStar}${frameStroke}`;
}

/* ── TAM-EKRAN ARKA PLAN — kartın dünyası detay ekranına taşar (10q) ─────
   Aynı reçete, çerçevesiz + geniş viewBox; üstüne obsidyene eriyen perde. */
export function ikvComposeBackdrop(card, opts = {}) {
  const P = PALETTES[opts.palette === 'lapis' ? 'lapis' : 'gold'];
  const rnd = ikvSeed((card.id || card.name || 'kart') + '-bd');
  const uid = 'ikbd' + (_uidCounter = (_uidCounter + 1) % 100000);
  const spec = ikvNormSpec(opts.sahne || card.sahne);
  const o = { uid, fog: false, star: false, mini: false, sahne: { ...spec, cerceve: 'acik', fig: { mod: 'yok' }, yildiz: Math.max(spec.yildiz, 8) } };
  const body = ikvComposeScene(card, P, rnd, o);
  _mvPlanla();
  return `<svg viewBox="0 0 200 250" preserveAspectRatio="xMidYMid slice" class="ikv-backdrop-svg" aria-hidden="true">
    <rect x="0" y="0" width="200" height="250" fill="${P.sky[2]}"/>
    <g opacity="0.85">${body}</g>
    <rect x="0" y="0" width="200" height="250" fill="url(#${uid}fade)"/>
    <defs><linearGradient id="${uid}fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="rgba(10,8,5,0.25)"/><stop offset="0.42" stop-color="rgba(10,8,5,0.55)"/><stop offset="1" stop-color="rgba(10,8,5,0.94)"/>
    </linearGradient></defs>
  </svg>`;
}

/* ── Kademe çıkarımı (temel kartları id'lerinden) ────────────────────────── */
function ikvKademe(id) {
  const s = String(id || '');
  if (s.endsWith('-tac')) return 'tac';
  if (s.endsWith('-kok')) return 'kok';
  if (s.endsWith('-filiz')) return 'filiz';
  return null;
}

/* ════════════════════════════════════════════════════════════════════════
   SAHNE — kartın içerik-uyumlu görseli (SVG)
   opts: { palette:'gold'|'lapis', fog:bool (sis/kilit), star:bool (hedef
          yıldızı), stage:'kapi'|... (kategori yerine zorla) }
═══════════════════════════════════════════════════════════════════════════ */
let _uidCounter = 0;

/* ── YÜZ SAHNESİ — gövdeyi 12g kazır, GÖĞÜ BURASI kurar ──────────────────
   Kart dili tek kaynaktır: yıldız tarlası, eşik ışığı ve çerçeve öteki
   sahnelerle aynı gramerden gelir; 12g yalnız yüzün konturlarını verir.
   Böylece iki ana kart "başka bir motorun ürünü" gibi durmaz — aynı
   gökyüzünün altında, yalnız figürü sen olan kartlardır.
   Tek lehçe farkı: burada çerçeve dikdörtgen değil OVALDİR (madalyon
   geleneği, .wns-portrait) — o yüzden zemin çizgisi yoktur, oval kendi
   ufkudur ve kartın iç dikdörtgeni (.ikv-frame) çekilir. */
function ikvYuzSahne(P, rnd, o, opts) {
  let govde = '';
  try {
    govde = window.yzKonturGovde
      ? window.yzKonturGovde({ palette: opts.palette === 'lapis' ? 'lapis' : 'gold', mini: o.mini })
      : '';
  } catch (_) { govde = ''; }
  if (!govde) return null;

  const uid = o.uid, a = IKV.gold;

  // ÇERÇEVE OVAL — bu iki kartta sahnenin çerçevesi dikdörtgen DEĞİL oval
  // (Emre, 2026-08-04). Gökyüzü ovalin içini doldurur, içerik ovale kırpılır,
  // çift altın hat çerçeve olur; zemin çizgisi yoktur — oval kendi ufkudur.
  // Yüz bu ovali DOLDURUR (12g'nin çizim kutusu ovalin sınır kutusudur):
  // boşlukta yüzen kesik bir yüz değil, çerçevelenmiş bir portre.
  const F = { cx: 100, cy: 130, rx: 76, ry: 94 };

  // MADALYON — yüzün ovalin içindeki kendi yeri. Çerçeve değil: yıldız
  // tarlasını seyreltmek için okunur (gökyüzü yüzün üstüne düşmesin).
  let mad = null;
  try { mad = window.yzMadalyon ? window.yzMadalyon() : null; } catch (_) { mad = null; }

  const yuzeDusuyor = (x, y) => !!mad &&
    (((x - mad.cx) / (mad.rx * 1.06)) ** 2 + ((y - mad.cy) / (mad.ry * 1.06)) ** 2) < 1;
  const starN = o.mini ? 14 : 34;
  const stars = ikvStars(rnd, starN, 30, 170, 46, 210, P.star, yuzeDusuyor);

  // Çift hat — 12c'nin 'daire' çerçeve lehçesinin oval kardeşi; lapis kartta
  // da ALTIN kalır: eşik ışığı hep altındır.
  const e = (rx, ry, w, op) => `<ellipse cx="${F.cx}" cy="${F.cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${a}" stroke-width="${w}" opacity="${op}"/>`;
  const halka = e(F.rx, F.ry, 1.1, 0.9) + (o.mini ? '' : e(F.rx - 7, F.ry - 8, 0.6, 0.38));

  const glow = ikvGroundGlow(F.cx, 206, 64, P.glow, uid + 'g');
  // Mini kartta drop-shadow soyulur (12c'nin genel LOD sözleşmesi)
  const parilti = o.mini ? ''
    : ` style="filter:drop-shadow(0 0 1.4px ${opts.palette === 'lapis' ? 'rgba(90,138,216,0.45)' : 'rgba(245,166,35,0.45)'});"`;
  return `<defs><linearGradient id="${uid}s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${P.sky[0]}"/><stop offset="0.55" stop-color="${P.sky[1]}"/><stop offset="1" stop-color="${P.sky[2]}"/></linearGradient>
      <clipPath id="${uid}c"><ellipse cx="${F.cx}" cy="${F.cy}" rx="${F.rx}" ry="${F.ry}"/></clipPath></defs>
    <ellipse cx="${F.cx}" cy="${F.cy}" rx="${F.rx}" ry="${F.ry}" fill="url(#${uid}s)"/>
    <g clip-path="url(#${uid}c)">
      ${stars}
      <g${parilti}>${govde}</g>
      ${glow}
    </g>
    ${halka}`;
}

/* ── K2 · ÜÇ CANLILIK HÂLİ ────────────────────────────────────────────────
   donuk : kilitli ya da sisli kart. Kart senin değilse NEFES ALMAZ —
           kazanınca canlanır. (Kilit iki ayrı yoldan gelir: 10q ızgarada
           `locked` gönderir ama `fog` göndermez; ikisi de kapıya bağlı
           olmazsa kilitli kart yaşar ve hâlin anlamı kırılır.)
   kisik : ızgara hücresi. Motif sınıfları zaten basılmadı (bkz. _mv); bu
           sınıf yıldızları da durdurur. Geriye zemin ışığı, gök cismi ve
           ışık nabızları kalır — hepsi salt opacity, yani compositor işi:
           kart ızgarada da canlı görünür ama bedeli yok.
   (yok) : tam yaşar — detay, tören, backdrop.

   `opts.live` 2026-08-07'de EMEKLİ oldu: canlılık bir ödül değil, kartın
   tabiatıdır. Eski çağıranlar kırılmasın diye sessizce yok sayılır. */
function _ikvHal(opts) {
  if (opts.fog || opts.locked) return ' ikv-scene-svg--donuk';
  return opts.mini ? ' ikv-scene-svg--kisik' : '';
}

export function ikvScene(card, opts = {}) {
  const P = PALETTES[opts.palette === 'lapis' ? 'lapis' : 'gold'];
  const rnd = ikvSeed(card.id || card.name || 'kart');
  const uid = 'ikv' + (_uidCounter = (_uidCounter + 1) % 100000);
  const sahne = opts.sahne || card.sahne || null;   // Kart Üretim Motoru reçetesi
  const o = {
    uid,
    fog: !!opts.fog,
    star: opts.star !== false && opts.palette === 'lapis',  // hedef yıldızı: gelecekte parlar
    kademe: ikvKademe(card.id),
    mini: !!opts.mini,
    sahne,
  };
  // YÜZ ÇİZGİSİ (12g) — iki ana kartın (Olunan / Niyet Alınan) çizimi
  // kullanıcının KENDİ yüzüdür. İz yoksa (foto yok, ten kanıtı yok, CORS)
  // sessizce düşer ve kart bugünkü sahnesinde kalır — yüz uydurulmaz.
  if (card.yuz && !o.fog) {
    const yuzBody = ikvYuzSahne(P, rnd, o, opts);
    // data-yuz: kartın çerçeve kararı buradan okunur (bkz. ikvCardFace) —
    // oval çerçeve yalnız yüz GERÇEKTEN çizildiyse geçerlidir.
    // K4 — kullanıcının YÜZÜ kıpırdamaz: kazıma donuk kalır, yalnız göğü
    // yaşar (yıldızlar/zemin ışığı ortak yardımcılardan gelir). Kendi yüzünün
    // oynatılması ürkütücüdür ve "kullanıcının imgesi ürünün imgesini ezer"
    // kuralına aykırıdır (TASARIM-PRENSIPLERI §0.1).
    if (yuzBody) return `<svg viewBox="0 0 200 250" class="ikv-scene-svg${_ikvHal(opts)}" data-yuz="1" aria-hidden="true">${yuzBody}</svg>`;
  }
  // erdem aksanı — kartın erdemine özgü küçük anlam imi (sahnenin üstüne işlenir)
  const accent = (!o.fog && card.virtue) ? ikvVirtueAccent(card.virtue, P, rnd) : '';
  let body;
  if (sahne) {
    body = `${ikvComposeScene(card, P, rnd, o)}${accent}`;
  } else {
    const stageId = opts.stage || CAT_STAGE[card.category] || 'kapi';
    const draw = STAGES[stageId] || STAGES.kapi;
    body = `${draw(card, P, rnd, o)}${accent}`;
  }
  // mini ızgara hücreleri: SVG filter (drop-shadow) GPU maliyeti — 100+ kartlık
  // koleksiyon ızgarasında belirgin; küçük boyutta görsel katkısı yok → soyul.
  // NOT: filtre artık `style` içinde yalnız başına değil, ışık nabzının
  // değişkenleriyle birlikte durabilir (`--o:.9;filter:...`) — bu yüzden
  // style'ın tamamı değil, filter BİLDİRİMİ ayıklanır.
  if (opts.mini) body = body.replace(/filter:[^;"]*;?/g, '');
  _mvPlanla();
  return `<svg viewBox="0 0 200 250" class="ikv-scene-svg${_ikvHal(opts)}" aria-hidden="true">${body}</svg>`;
}

/* ════════════════════════════════════════════════════════════════════════
   KİLOMETRE TAŞI SAHNELERİ (10t) — her eşiğin görseli anlamıyla uyumlu:
   7 ilk hilal · 15 kök salan fidan · 30 eşikten geçiş · 60 köprü ·
   120 ufka giden yol · 180 ikiz benlik · 240 zirve · 365 tam güneş
═══════════════════════════════════════════════════════════════════════════ */
export function ikvMilestoneScene(d, opts = {}) {
  const P = PALETTES[opts.palette === 'lapis' ? 'lapis' : 'gold'];
  const a = IKV.gold;
  const rnd = ikvSeed('sm-' + d);
  const uid = 'ikm' + d + (_uidCounter = (_uidCounter + 1) % 100000);
  const sky = `<defs><linearGradient id="${uid}s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${P.sky[0]}"/><stop offset="1" stop-color="${P.sky[2]}"/></linearGradient></defs>
    <rect x="22" y="34" width="156" height="192" fill="url(#${uid}s)"/>`;
  const frame = `<rect x="22" y="34" width="156" height="192" fill="none" stroke="${IKV.gold}" stroke-width="1" opacity="0.6"/>`;
  const ground = `<line x1="22" y1="214" x2="178" y2="214" stroke="${a}" stroke-width="0.8" opacity="0.6"/>`;
  const stars = ikvStars(rnd, 7, 28, 172, 42, 120, P.star);
  const glow = (cx, w) => ikvGroundGlow(cx, 214, w, P.glow, uid + 'g');
  let art = '';

  if (d === 7) {        // İlk Hafta — hilal + 7 halkalık zincir yayı
    let chain = '';
    for (let i = 0; i < 7; i++) {
      const x = 48 + i * 17.5, y = 196 - Math.sin((i / 6) * Math.PI) * 14;
      chain += `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${a}" stroke-width="1.1" opacity="${0.55 + i * 0.06}"/>`;
    }
    art = `<path d="M88 74 a26 26 0 1 0 30 38 a21 21 0 1 1 -30 -38 Z" fill="${a}" opacity="0.85" style="filter:drop-shadow(0 0 8px rgba(245,166,35,0.5));"/>
      ${chain}${glow(100, 70)}`;
  } else if (d === 15) { // Kök Salan — köklü fidan, merkez kahraman
    art = `<g transform="translate(-86,-91) scale(1.35)">${ikvPlant('kok', a)}</g>
      ${ikvStarPath(100, 64, 6, IKV.goldBright)}${glow(100, 60)}`;
  } else if (d === 30) { // Karaktere Dönüş — eşikten geçen figür
    const arch = ikvArch(P, 52, 96, 56, 214, { skyId: uid + 'a' });
    art = `<defs>${arch.defs}</defs>${arch.fill}
      ${glow(100, 64)}
      ${ikvFigure('wanderer', a, 66, 102, 0.58)}
      ${arch.stroke}`;
  } else if (d === 60) { // Taşıyan — köprünün ortasındaki figür
    art = `<path d="M28 214 Q100 150 172 214" fill="none" stroke="${a}" stroke-width="1.3" opacity="0.9"/>
      <path d="M28 214 Q100 162 172 214" fill="none" stroke="${a}" stroke-width="0.6" opacity="0.45"/>
      <line x1="52" y1="196" x2="52" y2="214" stroke="${a}" stroke-width="0.7" opacity="0.5"/>
      <line x1="148" y1="196" x2="148" y2="214" stroke="${a}" stroke-width="0.7" opacity="0.5"/>
      ${glow(100, 80)}
      ${ikvFigure('patient', a, 73, 96, 0.5)}`;
  } else if (d === 120) { // Yaşam Biçimi — ufka giden yol, doğan güneş
    let rays = '';
    for (let i = -3; i <= 3; i++) {
      const ang = i * 0.32;
      rays += `<line x1="${100 + Math.sin(ang) * 26}" y1="${150 - Math.cos(ang) * 26}" x2="${100 + Math.sin(ang) * 38}" y2="${150 - Math.cos(ang) * 38}" stroke="${a}" stroke-width="1" opacity="0.7"/>`;
    }
    art = `<path d="M100 150 m-20 0 a20 20 0 0 1 40 0 Z" fill="${a}" opacity="0.8" style="filter:drop-shadow(0 0 10px rgba(245,166,35,0.5));"/>
      <line x1="40" y1="150" x2="160" y2="150" stroke="${a}" stroke-width="0.8" opacity="0.6"/>
      ${rays}
      <path d="M76 214 L96 150 M124 214 L104 150" stroke="${a}" stroke-width="0.9" opacity="0.7"/>
      ${glow(100, 76)}`;
  } else if (d === 180) { // Dönüşen — eski benlik soluk, yeni benlik altın
    art = `<line x1="100" y1="48" x2="100" y2="214" stroke="${a}" stroke-width="0.5" opacity="0.4" stroke-dasharray="3 4"/>
      ${glow(124, 60)}
      ${ikvFigure('mirror', a, 40, 92, 0.72)}`;
  } else if (d === 240) { // Dayanan — zirvedeki figür
    art = `<path d="M22 214 L74 132 L106 178 L138 116 L178 214" fill="none" stroke="${a}" stroke-width="1.1" opacity="0.85"/>
      <path d="M70 138 L78 138 M134 122 L142 122" stroke="${P.star}" stroke-width="0.7" opacity="0.6"/>
      ${ikvStarPath(138, 96, 5.5, IKV.goldBright)}
      ${glow(138, 50)}
      ${ikvFigure('courage', a, 116, 70, 0.34)}`;
  } else {               // 365 · Bir Dönüşüm — tam güneş + 12 ay halkası + şükür
    let months = '';
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      months += `<circle cx="${(100 + Math.cos(ang) * 56).toFixed(1)}" cy="${(118 + Math.sin(ang) * 56).toFixed(1)}" r="1.6" fill="${a}" opacity="0.8"/>`;
    }
    let rays = '';
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 + 0.26;
      rays += `<line x1="${100 + Math.cos(ang) * 26}" y1="${118 + Math.sin(ang) * 26}" x2="${100 + Math.cos(ang) * 34}" y2="${118 + Math.sin(ang) * 34}" stroke="${a}" stroke-width="1" opacity="0.75"/>`;
    }
    art = `<circle cx="100" cy="118" r="20" fill="none" stroke="${a}" stroke-width="1.4" style="filter:drop-shadow(0 0 10px rgba(245,166,35,0.55));"/>
      <circle cx="100" cy="118" r="6" fill="${a}" opacity="0.9"/>
      ${rays}${months}
      ${glow(100, 80)}
      ${ikvFigure('grateful', a, 72, 136, 0.46)}`;
  }

  return `<svg viewBox="0 0 200 250" class="ikv-scene-svg" aria-hidden="true">${sky}${stars}${ground}${art}${frame}</svg>`;
}

/* ════════════════════════════════════════════════════════════════════════
   KART YÜZÜ — ortak şablon
   opts: {
     palette: 'gold' | 'lapis'
     kicker:  üst satır (Cinzel, harf aralıklı)        — ör. 'OLDUĞUN KİŞİ'
     badge:   sağ üst rozet                            — ör. '✦ MÜHÜR'
     name:    büyük ad (verilmezse card.name)
     sub:     italik alt yazı (verilmezse card.whisper)
     rarLabel/rarColor: nadirlik satırı (ops.)
     fog:     sis/kilit görünümü   · mini: yoğun küçük boy
     scene:   hazır sahne SVG (verilmezse ikvScene üretir)
     extra:   ad bloğunun altına eklenecek ham HTML (boyut barları vb.)
   }
═══════════════════════════════════════════════════════════════════════════ */
function ikvEsc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

const IKV_TICKS = `
  <svg class="ikv-tick ikv-tick--tl" viewBox="0 0 16 16"><path d="M0 8 L0 0 L8 0"/></svg>
  <svg class="ikv-tick ikv-tick--tr" viewBox="0 0 16 16"><path d="M16 8 L16 0 L8 0"/></svg>
  <svg class="ikv-tick ikv-tick--bl" viewBox="0 0 16 16"><path d="M0 8 L0 16 L8 16"/></svg>
  <svg class="ikv-tick ikv-tick--br" viewBox="0 0 16 16"><path d="M16 8 L16 16 L8 16"/></svg>`;

/* ── ÇERÇEVE LEHÇESİ (K1) — kartın TÜRÜ ilk bakışta okunur ────────────────
   Yu-Gi-Oh'un dersi: karta bakan, metnini okumadan ne tuttuğunu bilir.
   Bizde yeni RENK yok (üç-renk anayasası) — lehçe altın/lapis paletinin
   ÜSTÜNE binen bir kiptir: gölge/perde/tuzak kartları obsidyenin soğuk
   ucunda durur. Anlamı: tanıdığın ama henüz ışığa çevirmediğin yüz. */
const CAT_FRAME = { golge: 'golge', perde: 'golge', tuzak: 'golge' };

/* ── DOKUNUŞ MERDİVENİ (K2) — nadirlik etikette değil YÜZEYDE ────────────
   Pokémon'un dersi: modern nadirlik sembolle değil MUAMELE ile anlatılır —
   nadirlik arttıkça kart çerçevesinden kurtulur.
     yaygin → mat · nadir → folyo bandı · nadide → sahne bandları taşar
     (full-art) · efsane → tam sahne + tezhipli ad (YGO altın-varak dili).
   Eski sözleşme korunur: kilitli (fog) ve mini kart PARLAMAZ. */
const RAR_FOIL = { nadir: 0.5, nadide: 0.78, efsane: 1 };

export function ikvCardFace(card, opts = {}) {
  ikvEnsureStyles();
  const palette = opts.palette === 'lapis' ? 'lapis' : 'gold';
  const P = PALETTES[palette];
  const name = opts.name != null ? opts.name : (card.name || '');
  const sub = opts.sub != null ? opts.sub : (card.whisper || '');
  const scene = opts.scene || ikvScene(card, { palette, fog: opts.fog, locked: opts.locked, stage: opts.stage, star: opts.star, mini: opts.mini, sahne: opts.sahne });
  const miniCls = opts.mini ? ' ikv-card--mini' : '';
  const fogCls = opts.fog ? ' ikv-card--fog' : '';
  // BOY KART — 5/7 kalıbı serbest bırakılır: yükseklik içerikten gelir, çünkü
  // kartın metin kutusu (dört asli unsur + aradaki yol) kartın KENDİSİNDE
  // yaşar. container-type korunur, tipografi yine genişlikten ölçeklenir.
  const boyCls = opts.boy ? ' ikv-card--boy' : '';
  const rarLine = opts.rarLabel
    ? `<div class="ikv-rar" style="color:${opts.rarColor || P.accent};">· ${ikvEsc(opts.rarLabel)} ·</div>` : '';

  // K1/K2 — lehçe ve muamele kartın KENDİ verisinden türetilir: tüketici
  // hiçbir şey geçirmese de doğru çerçeveyi ve folyoyu alır (tek noktadan
  // tüm kart yüzeyleri dönüşür). opts ile bilinçli olarak ezilebilir.
  const frame = opts.frame !== undefined ? opts.frame : CAT_FRAME[card.category];
  const rar = opts.rarity !== undefined ? opts.rarity : card.rarity;
  const foilOp = (opts.mini || opts.fog) ? 0 : (RAR_FOIL[rar] || 0);
  const modCls = (frame ? ` ikv-card--${frame}` : '') + (rar ? ` ikv-card--r-${rar}` : '');
  const foil = foilOp ? `<div class="ikv-foil" style="--ikv-foil:${foilOp};"></div>` : '';

  // Künye — Pokémon'un alt bandı: koleksiyon numarası (12b deste sırasından,
  // deterministik) + kök kredisi (illüstratör kredisinin karşılığı: kartın
  // kitap kaynağı). Sisli kartta kaynak saklanır — kimliği henüz açılmadı.
  const no = opts.no != null ? opts.no : card.no;
  const credit = opts.credit != null ? opts.credit
    : (card.kok ? String(card.kok).split('·')[0].trim() : '');
  const foot = (!opts.mini && (no || credit)) ? `<div class="ikv-foot">
      ${no ? `<b>${card.catGlyph ? ikvEsc(card.catGlyph) + ' ' : ''}${String(no).padStart(3, '0')}${card.noTotal ? ' / ' + card.noTotal : ''}</b>` : ''}
      ${credit && !opts.fog ? `<i>${ikvEsc(credit)}</i>` : ''}
    </div>` : '';

  // K3 — kökeni ve kök derinliği. evrimden: "⟵ ÖZ SEVGİ · FİLİZ" (Pokémon'un
  // "Evolves from" satırı; iyelik eki YOK ki i18n'de dilbilgisi kırılmasın).
  // mertebe: kazanımdan SONRA biriken kanıtın yıldızı — ATK/DEF değil, KÖK.
  const evo = (!opts.mini && !opts.fog && opts.evrimden)
    ? `<div class="ikv-evo">${ikvEsc(opts.evrimden)}</div>` : '';
  const mertebe = Math.max(0, Math.min(5, Math.round(opts.mertebe || 0)));
  const rank = (!opts.mini && !opts.fog && mertebe > 1)
    ? `<div class="ikv-rank" aria-hidden="true">${'✦'.repeat(mertebe)}</div>` : '';

  // YÜZ KARTI — çerçeve bu iki kartta dikdörtgen değil OVALDİR (Emre,
  // 2026-08-04): sahnedeki altın oval tek çerçeve olsun diye kartın iç
  // dikdörtgeni gizlenir. Karar SAHNENİN kendisinden okunur (yzVar'dan
  // değil): yalnız oval gerçekten kurulduysa data-yuz gelir. Dışarıdan
  // verilen sahnede (opts.scene) ya da izin düştüğü anda kart çerçevesiz
  // kalmaz — katalog sahnesine düşer ve kendi dikdörtgenini korur.
  const yuzCls = scene.includes('data-yuz="1"') ? ' ikv-card--yuz' : '';

  return `<div class="ikv-card ${P.cls}${miniCls}${fogCls}${boyCls}${modCls}${yuzCls}">
    <div class="ikv-frame"></div>
    ${IKV_TICKS}
    ${opts.kicker ? `<div class="ikv-kicker">${ikvEsc(opts.kicker)}</div>` : '<div class="ikv-kicker">&nbsp;</div>'}
    ${opts.badge ? `<div class="ikv-badge">${ikvEsc(opts.badge)}</div>` : ''}
    <div class="ikv-scene">${scene}</div>
    ${evo}
    <div class="ikv-name${String(name).length > 16 ? ' ikv-name--long' : ''}">${ikvEsc(name)}</div>
    ${rank}
    ${sub ? `<div class="ikv-sub">${ikvEsc(sub)}</div>` : ''}
    ${rarLine}
    ${opts.extra || ''}
    ${foot}
    ${foil}
  </div>`;
}

/* ════════════════════════════════════════════════════════════════════════
   MÜHÜR HALKASI — ilerleme daima halka/yay dilinde (Tasarım Prensipleri §7).
   opts: { size:px, yol:bool (altın→lapis "yol" degradesi — geleceğe akan
   ilerleme), center:HTML (halkanın ortası), cls:ek sınıf }
   %100'de halka "uyanır" (nefes alan glow).
═══════════════════════════════════════════════════════════════════════════ */
export function ikvRing(pct, opts = {}) {
  ikvEnsureStyles();
  const p = Math.max(0, Math.min(100, Math.round(pct || 0)));
  const r = 26, C = +(2 * Math.PI * r).toFixed(2);
  const off = +(C * (1 - p / 100)).toFixed(2);
  const uid = 'ikr' + (_uidCounter = (_uidCounter + 1) % 100000);
  const stroke = opts.yol ? `url(#${uid}g)` : IKV.gold;
  const grad = opts.yol ? `<defs><linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${IKV.gold}"/><stop offset="1" stop-color="${IKV.lapis}"/></linearGradient></defs>` : '';
  return `<div class="ikv-ringwrap${p >= 100 ? ' is-full' : ''}${opts.cls ? ' ' + opts.cls : ''}" style="--ikr-size:${opts.size || 64}px;">
    <svg class="ikv-ring" viewBox="0 0 64 64" aria-hidden="true">${grad}
      <circle class="ikv-ring-track" cx="32" cy="32" r="${r}"/>
      <circle class="ikv-ring-bar" cx="32" cy="32" r="${r}" stroke="${stroke}" stroke-dasharray="${C}" stroke-dashoffset="${off}" style="--ikr-c:${C};--ikr-o:${off};" transform="rotate(-90 32 32)"/>
    </svg>
    ${opts.center ? `<div class="ikv-ring-center">${opts.center}</div>` : ''}
  </div>`;
}

/* ════════════════════════════════════════════════════════════════════════
   ARADAKİ YOL — mesafe çizgisi (tek primitif)

   Altın uç = olduğun sen · lapis ✷ = olmak istediğin. Dolgu GERÇEKTİR:
   gradyan çizginin tam genişliği üzerinden hesaplanır (yolun tamamı altından
   lapise akar), clip-path yalnız yürüdüğün kadarını açar. Sayı, çubuk ve
   cümle tek kaynaktan (--ms-pct) beslenir — ayrışamazlar.

   Lehçe Bugün hero'sundan (yol.css) alındı: aynı çizgi üçüncü kez
   kopyalanmasın diye kaynağı buraya taşındı; 02d ve 10f'in kendi nüshaları
   ayrı bir turda buraya göçer.
═══════════════════════════════════════════════════════════════════════════ */
export function ikvMesafeCizgi(pct, opts = {}) {
  ikvEnsureStyles();
  const raw = Number(pct);
  // Ölçüsüz hâl bir hata değil, bir HÂLDİR: kanıtı olmayan yol boş gerilir —
  // dolgu ve kıvılcım hiç basılmaz, "%0 yakınsın" denmez (§6.10).
  const n = (pct == null || isNaN(raw)) ? null : Math.max(0, Math.min(100, Math.round(raw)));
  const olculu = n != null;
  const styleAttr = olculu ? ` style="--ms-pct:${n}%"` : '';
  const govde = `<span class="ikv-ms-dot ikv-ms-dot--gold"></span>
      <span class="ikv-ms-line">${olculu ? '<span class="ikv-ms-fill"></span><span class="ikv-ms-spark"></span>' : ''}</span>
      <span class="ikv-ms-dot ikv-ms-dot--lapis">✷</span>`;
  // aria verilirse çizgi bir KAPIDIR (Sabır Kartı) ve butona döner; tıklamayı
  // çağıran bağlar. Verilmezse saf göstergedir, odak sırasına girmez.
  const cizgi = opts.aria
    ? `<button type="button" class="ikv-ms ikv-ms--btn"${styleAttr} aria-label="${ikvEsc(opts.aria)}">${govde}</button>`
    : `<div class="ikv-ms"${styleAttr} aria-hidden="true">${govde}</div>`;
  return `<div class="ikv-ms-wrap${opts.cls ? ' ' + opts.cls : ''}">${cizgi}${opts.label ? `<div class="ikv-ms-label">${opts.label}</div>` : ''}</div>`;
}

/* ════════════════════════════════════════════════════════════════════════
   KART SIRTI — koleksiyonun ortak yüzü; deste hissi buradan doğar

   SIRTLAR (2026-07-29): destenin DIŞI da kimliktir. Sırt satın alınmaz,
   yalnız kazanılır: her varyant bir eşiğin kaydıdır. Varyantlar SALT CSS'tir
   (mürekkep rengi + kafes dokusu + halka sayısı) — yeni görsel varlık,
   yeni veri yükü yoktur. Tek kapı bu fonksiyondur: seçilen sırt dokuz
   tüketici yüzeye (yelpaze, kapılar, desteler, tören sahneleri) hiçbiri
   değişmeden yayılır.
═══════════════════════════════════════════════════════════════════════════ */
export const SIRTLAR = {
  fener:  { id: 'fener',  ad: 'Fener',  kaynak: 'baslangic' },   // herkesin ilk sırtı
  tac:    { id: 'tac',    ad: 'Taç',    kaynak: 'hazine-set' },  // bir seti tamamladın
  yol:    { id: 'yol',    ad: 'Yol',    kaynak: 'seri' },        // seride kilometre taşı
  ufuk:   { id: 'ufuk',   ad: 'Ufuk',   kaynak: 'hedef' },       // ilk hedef mührü (lapis)
  meshale:{ id: 'meshale',ad: 'Meşale', kaynak: 'efsane-kart' }, // ilk efsane kart
};

/** Hangi sırt basılacak: çağıranın dediği → kullanıcının seçtiği → fener.
 *  12c alt katmandır ve 10q'yu İMPORT ETMEZ (döngü olurdu); seçim window
 *  köprüsünden okunur ve katalogla doğrulanır — sınıf adına doğrulanmamış
 *  bir dize asla geçmez. */
function _backId(opts) {
  let id = opts && opts.back;
  if (!id) { try { id = window.kkSirtSecili?.(); } catch (_) {} }
  return (id && SIRTLAR[id]) ? id : 'fener';
}

export function ikvCardBack(opts = {}) {
  ikvEnsureStyles();
  const wordmark = opts.wordmark || 'EMRE THE WANDERER';
  const back = _backId(opts);
  // etch: Yolunun Nişanı kazıması (Alfabe Işık Faz 4) — fener-mührünün altına,
  // wordmark'ın üstüne işlenir; iç SVG (viewBox 0 0 100 100, currentColor).
  // Nişan sırttan BAĞIMSIZ katmandır: hangi sırtı taşırsan taşı üstünde durur.
  const etch = opts.etch
    ? `<div class="ikv-back-etch" aria-hidden="true"><svg viewBox="0 0 100 100">${opts.etch}</svg></div>` : '';
  return `<div class="ikv-back ikv-back--${back}${opts.mini ? ' ikv-card--mini' : ''}${opts.boy ? ' ikv-back--boy' : ''}">
    <div class="ikv-back-lattice"></div>
    ${IKV_TICKS}
    <div class="ikv-back-rings">
      <div class="ikv-back-ring ikv-back-ring--outer"></div>
      <div class="ikv-back-ring ikv-back-ring--inner"></div>
      ${back === 'tac' ? '<div class="ikv-back-ring ikv-back-ring--tac"></div>' : ''}
      <div class="ikv-back-glow"></div>
      <div class="ikv-back-sigil">${ikvLantern(64)}</div>
    </div>
    ${etch}
    <div class="ikv-back-mark">${ikvEsc(wordmark)}</div>
  </div>`;
}

/* ════════════════════════════════════════════════════════════════════════
   STİLLER — JS-enjekte; container-query ile 96px→300px arası ölçeklenir
═══════════════════════════════════════════════════════════════════════════ */
export function ikvEnsureStyles() {
  if (document.getElementById('ikv-styles')) return;
  const css = `
  /* ═══ KART GÖRSEL DİLİ (12c) ═══ */
  .ikv-card,.ikv-back{position:relative;width:100%;aspect-ratio:5/7;container-type:inline-size;
    display:flex;flex-direction:column;align-items:center;text-align:center;overflow:hidden;
    padding:9% 7% 8%;box-sizing:border-box;}
  .ikv-card--gold{background:
    radial-gradient(90% 60% at 50% 0%, rgba(245,166,35,0.08), transparent 60%),
    linear-gradient(180deg,#18120B,#0C0906);
    border:1px solid rgba(245,166,35,0.85);
    box-shadow:0 10px 32px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(245,166,35,0.10);}
  .ikv-card--lapis{background:
    radial-gradient(90% 70% at 50% 18%, rgba(90,138,216,0.10), transparent 60%),
    linear-gradient(180deg,#10141E,#0A0C12);
    border:1px solid rgba(90,138,216,0.55);
    box-shadow:0 10px 36px rgba(0,0,0,0.65), 0 0 34px rgba(45,95,168,0.22), inset 0 0 0 1px rgba(90,138,216,0.12);}
  .ikv-card--fog{filter:saturate(0.55) brightness(0.8);}
  /* BOY KART — detay töreninin tek kartı. 5/7 kalıbı serbest bırakılır çünkü
     yükseklik artık İÇERİKTEN gelir: kişinin dört asli unsuru kartın kendi
     metin kutusunda yaşar. Sahne bu yüzden flex:1 ile "kalan alanı" dolduramaz
     (boy kartta kalan alan yoktur, sahne çökerdi) — yüksekliğini kendi viewBox
     oranından (200x250) alır. container-type korunur: tipografi yine kartın
     GENİŞLİĞİNDEN ölçeklenir, yani boy kart büyüdükçe yazı da büyür. */
  .ikv-card--boy{aspect-ratio:auto;}
  .ikv-card--boy .ikv-scene{flex:none;aspect-ratio:4/5;}
  .ikv-back--boy{aspect-ratio:auto;height:100%;}
  /* Çerçeve ve köşe tikleri boy kartta GENİŞLİĞE bağlanır. Sebebi CSS'in iki
     ayrı kuralı: inset'in dikey yüzdesi YÜKSEKLİKTEN, padding'in yüzdesi ise
     hep GENİŞLİKTEN hesaplanır. 5/7 kartta ikisi birbirine yakın çıkıyordu;
     kart uzayınca çerçeve içeri kaçıp metnin ortasından geçti (canlı
     yakalandı). cqw ikisini tek ölçüye bağlar — kart ne kadar uzarsa uzasın
     çerçeve kenarda kalır. */
  .ikv-card--boy .ikv-frame{inset:4.5cqw 4.5%;}
  .ikv-card--boy .ikv-tick--tl,.ikv-card--boy .ikv-tick--tr{top:1.7cqw;}
  .ikv-card--boy .ikv-tick--bl,.ikv-card--boy .ikv-tick--br{bottom:1.7cqw;}
  .ikv-frame{position:absolute;inset:4.5%;border:1px solid rgba(245,166,35,0.30);pointer-events:none;}
  .ikv-card--lapis .ikv-frame{border-color:rgba(90,138,216,0.25);}
  /* Yüz kartlarında çerçeve sahnedeki altın OVALDİR — iç dikdörtgen çekilir. */
  .ikv-card--yuz .ikv-frame{display:none;}
  .ikv-tick{position:absolute;width:14px;height:14px;opacity:0.9;pointer-events:none;}
  .ikv-tick path{fill:none;stroke:rgba(245,166,35,0.9);stroke-width:1.2;}
  .ikv-card--lapis .ikv-tick path{stroke:rgba(90,138,216,0.8);}
  .ikv-tick--tl{top:1.6%;left:2.2%;} .ikv-tick--tr{top:1.6%;right:2.2%;}
  .ikv-tick--bl{bottom:1.6%;left:2.2%;} .ikv-tick--br{bottom:1.6%;right:2.2%;}

  .ikv-kicker{font-family:var(--cinzel,'Cinzel',serif);font-weight:600;color:var(--gold,#F5A623);
    font-size:8.5px;font-size:3cqw;letter-spacing:0.34em;text-indent:0.34em;line-height:1.3;
    white-space:nowrap;overflow:hidden;max-width:96%;z-index:2;}
  .ikv-card--lapis .ikv-kicker{color:var(--lapis-bright,#5A8AD8);}
  .ikv-badge{position:absolute;top:13%;right:-1px;border:1px solid var(--gold,#F5A623);
    color:var(--gold,#F5A623);background:rgba(12,9,6,0.55);
    font-family:var(--cinzel,'Cinzel',serif);font-weight:700;
    font-size:7px;font-size:2.6cqw;letter-spacing:0.24em;
    padding:2% 3% 2% 4%;line-height:1;z-index:3;white-space:nowrap;}
  .ikv-card--lapis .ikv-badge{border-color:var(--lapis-bright,#5A8AD8);color:var(--lapis-bright,#5A8AD8);background:rgba(10,12,18,0.55);}
  .ikv-scene{flex:1;width:100%;min-height:0;display:flex;align-items:stretch;justify-content:center;margin:4% 0 3%;z-index:1;}
  .ikv-scene-svg{width:100%;height:100%;}
  /* ── YAŞAYAN SAHNE — "kart bir resim değil, bir pencere" ──────────────
     Harry Potter'ın portreleri: sahne durmadan kıpırdar ama dikkat çalmaz.
     Hareket motife GÖMÜLÜDÜR (ikv-mv-* — bkz. IKV_MV haritası), bir "canlı
     kart" bayrağına bağlı DEĞİLDİR: her kart yaşar. Üç istisna:
       --donuk : kilitli/sisli kart. Kart senin değilse nefes almaz.
       --kisik : ızgara hücresi. Motif sınıfları zaten basılmaz; burada
                 yıldızlar da susar. Geriye zemin ışığı, gök cismi ve ışık
                 nabızları kalır (salt opacity — compositor işi).
       is-durdu: ekran dışı kart (ikvMotionScan) — görünmeyeni oynatma.
     Salt opacity/transform: rAF yok, JS yok, arka plan sekmesi derdi yok
     (tarayıcı görünmeyen sekmede CSS animasyonunu kendi kısar).

     transform-box:fill-box ŞART — SVG'de transform-origin'in referansı
     varsayılan olarak viewBox'tır; fill-box olmadan her motif kendi
     merkezinden değil KARTIN ortasından döner/ölçeklenir. */
  .ikv-mv{transform-box:fill-box;transform-origin:center;}
  .ikv-mv--suzul{animation:ikvMvSuzul 26s ease-in-out infinite;}
  .ikv-mv--salin{animation:ikvMvSalin 7.3s ease-in-out infinite;}
  .ikv-mv--dalga{animation:ikvMvDalga 9.1s ease-in-out infinite;}
  .ikv-mv--nefes{animation:ikvMvNefes 4.6s ease-in-out infinite;}
  .ikv-mv--parla{animation:ikvMvParla 6.3s ease-in-out infinite;}
  .ikv-mv--akan{animation:ikvMvAkan 8.7s ease-in-out infinite;}
  .ikv-mv--donen{animation:ikvMvDonen 19s ease-in-out infinite;}
  .ikv-mv--dus{animation:ikvMvDus 4.1s linear infinite;}
  @keyframes ikvMvSuzul{0%,100%{transform:translateX(-3px)}50%{transform:translateX(3px)}}
  @keyframes ikvMvSalin{0%,100%{transform:rotate(-1.1deg)}50%{transform:rotate(1.1deg)}}
  @keyframes ikvMvDalga{0%,100%{transform:translateY(-0.7px)}50%{transform:translateY(0.7px)}}
  @keyframes ikvMvNefes{0%,100%{transform:scale(0.988)}50%{transform:scale(1.012)}}
  /* Işık nabzı — motifin ışık VEREN parçası (bkz. _isik). Salt opacity:
     compositor işi, ızgarada bile bedavaya yakın; bu yüzden kısık hâlde de
     yaşar — kartın canlı olduğunu ızgarada söyleyen şey budur.
     calc(var(--o)) tabanı korur: sönük eşik ışığı (0.35) ile fenerin alevi
     (1.0) aynı aralıkta yanıp sönerse sahnenin derinliği düzleşir. */
  .ikv-isik{animation:ikvIsikNabiz 6.7s ease-in-out infinite;}
  .ikv-isik--titrek{animation:ikvIsikTitrek 3.4s ease-in-out infinite;}
  @keyframes ikvIsikNabiz{0%,100%{opacity:calc(var(--o,1) * 0.5)}50%{opacity:var(--o,1)}}
  @keyframes ikvIsikTitrek{0%,100%{opacity:calc(var(--o,1) * 0.58)}21%{opacity:var(--o,1)}
    37%{opacity:calc(var(--o,1) * 0.74)}58%{opacity:calc(var(--o,1) * 0.96)}79%{opacity:calc(var(--o,1) * 0.66)}}
  @keyframes ikvMvParla{0%,100%{opacity:.62}50%{opacity:1}}
  @keyframes ikvMvAkan{0%,100%{opacity:.55}50%{opacity:1}}
  @keyframes ikvMvDonen{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
  @keyframes ikvMvDus{0%{transform:translateY(-3px);opacity:.15}30%{opacity:.55}100%{transform:translateY(9px);opacity:0}}
  /* Yıldız tarlası ve zemin ışığı: sahnenin en eski iki hareketi. Artık
     bayrağa bağlı değil — sınıflar ikvStars/ikvGroundGlow'da zaten basılı. */
  .ikv-star{animation:ikvLiveStar 4.2s ease-in-out infinite;
    animation-delay:calc(var(--i,0) * -370ms);transform-box:fill-box;transform-origin:center;}
  .ikv-gglow{animation:ikvLiveGlow 6.5s ease-in-out infinite;transform-origin:center bottom;}
  @keyframes ikvLiveStar{0%,100%{opacity:.45}50%{opacity:1}}
  @keyframes ikvLiveGlow{0%,100%{opacity:.72;transform:scaleY(.94)}50%{opacity:1;transform:scaleY(1.06)}}
  .ikv-scene-svg--donuk .ikv-mv,.ikv-scene-svg--donuk .ikv-star,
  .ikv-scene-svg--donuk .ikv-gglow,.ikv-scene-svg--donuk .ikv-isik{animation:none!important;}
  .ikv-scene-svg--kisik .ikv-star{animation:none!important;}
  .ikv-scene-svg.is-durdu *{animation-play-state:paused!important;}
  .ikv-backdrop-svg{width:100%;height:100%;display:block;}
  .ikv-name{font-family:var(--cinzel,'Cinzel',serif);font-weight:700;color:var(--text,#EAE2D6);
    font-size:17px;font-size:7cqw;letter-spacing:0.20em;text-indent:0.20em;line-height:1.22;
    max-width:100%;z-index:2;}
  .ikv-name--long{font-size:14px;font-size:5.6cqw;letter-spacing:0.16em;text-indent:0.16em;}
  .ikv-sub{font-family:var(--serif,'EB Garamond',Georgia,serif);font-style:italic;
    color:var(--lapis-bright,#5A8AD8);font-size:11px;font-size:4.4cqw;line-height:1.35;
    margin-top:1.5%;max-width:96%;z-index:2;}
  .ikv-card--gold .ikv-sub{color:var(--gold,#F5A623);opacity:0.85;}
  .ikv-rar{font-family:var(--cinzel,'Cinzel',serif);font-weight:600;
    font-size:6.5px;font-size:2.7cqw;letter-spacing:0.3em;text-indent:0.3em;margin-top:2.5%;opacity:0.85;z-index:2;}
  .ikv-card--mini{padding:8% 6% 7%;}
  .ikv-card--mini .ikv-kicker{font-size:4.6cqw;letter-spacing:0.2em;text-indent:0.2em;}
  .ikv-card--mini .ikv-name{font-size:9cqw;letter-spacing:0.14em;text-indent:0.14em;}
  .ikv-card--mini .ikv-rar{font-size:4cqw;}
  .ikv-card--mini .ikv-sub{display:none;}
  .ikv-card--mini .ikv-badge{display:none;}

  /* ═══ ÇERÇEVE LEHÇESİ (K1) — gölge kartları obsidyenin soğuk ucunda ═══
     Yeni renk YOK: lapis-deep iç gölgesi + kısılmış altın. Kartın türü ilk
     bakışta okunur; altın (sahipli) ve lapis (sahipsiz) paletinin üstüne
     biner, ikisini de bozmaz. */
  .ikv-card--golge{border-color:rgba(90,138,216,0.34);
    box-shadow:0 10px 32px rgba(0,0,0,0.72), inset 0 0 40px rgba(24,46,92,0.50), inset 0 0 0 1px rgba(90,138,216,0.10);}
  .ikv-card--golge .ikv-frame{border-color:rgba(203,216,240,0.14);}
  .ikv-card--golge .ikv-tick path{stroke:rgba(203,216,240,0.50);}
  .ikv-card--golge .ikv-kicker{color:rgba(203,216,240,0.70);}
  .ikv-card--golge .ikv-badge{border-color:rgba(203,216,240,0.40);color:rgba(203,216,240,0.75);}

  /* ═══ DOKUNUŞ MERDİVENİ (K2) — nadirlik yüzeyde hissedilir ═══ */
  .ikv-foil{position:absolute;inset:-14%;pointer-events:none;z-index:3;opacity:var(--ikv-foil,0);
    background:linear-gradient(122deg,transparent 32%,rgba(247,199,68,0.16) 43%,rgba(255,255,255,0.13) 50%,rgba(90,138,216,0.15) 57%,transparent 68%);}
  /* 10q kartı kendi CANLI folyosunu yönetir (imleci izleyen conic + color-dodge);
     statik bant onun üstüne tam güçle binerse nadirlik iki kez sayılır → kısılır.
     Holo motorunun "kk-card3d içine wrap girmez" sözleşmesinin ikizi. */
  .kk-card3d .ikv-foil{opacity:calc(var(--ikv-foil,0)*0.4);}
  /* Kart yüzüne mühür İZİ basılmaz (Emre, 2026-07-28). Mühür bir ANDIR: kartın
     lapis'ten altına dönmesi zaten o anın kaydıdır — yüze kalıcı bir damga
     eklemek hem kart adını örtüyordu hem de "kart bir üründür" diline kayıyordu.
     Mühürün görsel dili tören sahnesinde yaşar (olus.css .olus-press). */
  /* nadide/efsane: sahne çerçeve bandlarını taşar — kart "çerçevesinden kurtulur" */
  .ikv-card--r-nadide:not(.ikv-card--mini) .ikv-scene{margin:3% -7.5%;}
  .ikv-card--r-efsane:not(.ikv-card--mini) .ikv-scene{margin:2% -7.5% 3%;}
  /* efsane: adın hattatlığı nadirliği taşır (YGO altın-varak isim dili) */
  .ikv-card--r-efsane:not(.ikv-card--fog) .ikv-name{
    background:linear-gradient(100deg,#F5A623,#FFF1CE 46%,#F7C744);
    -webkit-background-clip:text;background-clip:text;color:transparent;
    filter:drop-shadow(0 0 6px rgba(245,166,35,0.28));}

  /* ═══ EVRİM + MERTEBE (K3) ═══
     evo: kartın kökeni (sahnenin altında, adın üstünde — Pokémon yerleşimi).
     rank: kök derinliği; sayaç dili değil yıldız dili (Tasarım Prensipleri §7). */
  .ikv-evo{font-family:var(--cinzel,'Cinzel',serif);font-weight:600;
    font-size:6.5px;font-size:2.5cqw;letter-spacing:0.2em;line-height:1.2;
    color:rgba(234,226,214,0.40);margin-bottom:1%;z-index:2;
    max-width:96%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .ikv-card--lapis .ikv-evo{color:rgba(203,216,240,0.42);}
  .ikv-rank{font-size:7px;font-size:2.7cqw;letter-spacing:0.34em;text-indent:0.34em;
    line-height:1;margin-top:1.4%;color:var(--gold,#F5A623);opacity:0.85;z-index:2;
    filter:drop-shadow(0 0 3px rgba(245,166,35,0.35));}
  .ikv-card--lapis .ikv-rank{color:var(--lapis-bright,#5A8AD8);filter:none;}
  .ikv-card--golge .ikv-rank{color:rgba(203,216,240,0.6);filter:none;}

  /* künye — koleksiyon numarası + kök kredisi (Pokémon alt bandı) */
  .ikv-foot{display:flex;align-items:baseline;justify-content:center;gap:0.7em;
    width:100%;max-width:100%;margin-top:2.6%;z-index:2;
    font-family:var(--cinzel,'Cinzel',serif);font-size:7px;font-size:2.7cqw;line-height:1.2;}
  .ikv-foot b{font-weight:600;letter-spacing:0.14em;white-space:nowrap;color:rgba(245,166,35,0.58);}
  .ikv-card--lapis .ikv-foot b{color:rgba(90,138,216,0.62);}
  .ikv-card--golge .ikv-foot b{color:rgba(203,216,240,0.48);}
  .ikv-foot i{font-family:var(--serif,'EB Garamond',Georgia,serif);font-style:italic;
    letter-spacing:0.02em;color:rgba(234,226,214,0.38);
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .ikv-card--mini .ikv-foot{display:none;}

  /* ═══ KART SIRTI ═══ */
  .ikv-back{background:
    radial-gradient(90% 70% at 50% 18%, rgba(245,166,35,0.07), transparent 60%),
    linear-gradient(180deg,#18120B,#0B0805);
    border:1px solid var(--gold,#F5A623);
    box-shadow:0 10px 32px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(245,166,35,0.10);
    justify-content:flex-end;}
  /* Sırdın mürekkebi TEK değişkendir (--bk-ink, RGB üçlüsü): varyantlar onu
     değiştirir, geometri ortak kalır — deste hissi bozulmaz. Varsayılan
     altındır, yani bugünkü sırt birebir korunur. */
  .ikv-back{--bk-ink:245,166,35;--bk-lat:14px;}
  .ikv-back-lattice{position:absolute;inset:3.3%;border:1px solid rgba(var(--bk-ink),0.35);
    background:
      repeating-linear-gradient(45deg, rgba(var(--bk-ink),0.07) 0 0.5px, transparent 0.5px var(--bk-lat)),
      repeating-linear-gradient(-45deg, rgba(var(--bk-ink),0.07) 0 0.5px, transparent 0.5px var(--bk-lat));}
  .ikv-back-rings{position:absolute;top:50%;left:50%;width:64%;aspect-ratio:1;transform:translate(-50%,-54%);}
  .ikv-back-ring{position:absolute;border-radius:50%;}
  .ikv-back-ring--outer{inset:0;border:1px solid rgba(var(--bk-ink),0.40);}
  .ikv-back-ring--inner{inset:5.5%;border:1px solid rgba(var(--bk-ink),0.18);}
  .ikv-back-ring--tac{inset:-7%;border:1px solid rgba(var(--bk-ink),0.30);}
  .ikv-back-glow{position:absolute;inset:-10%;border-radius:50%;background:radial-gradient(circle, rgba(var(--bk-ink),0.12), transparent 65%);}
  /* ── SIRT VARYANTLARI — her biri bir eşiğin kaydı ──
     Üç renk anayasası içinde kalınır: altın (olduğun) ve lapis (hayal)
     dışında mürekkep yoktur; ayrım yoğunluk, doku sıklığı ve halka
     sayısıyla kurulur. */
  .ikv-back--tac{--bk-lat:10px;}                     /* set tamam: doku sıklaşır, üçüncü halka */
  .ikv-back--yol .ikv-back-lattice{                  /* seri: çapraz kafes YOL çizgilerine döner */
    background:repeating-linear-gradient(90deg, rgba(var(--bk-ink),0.08) 0 0.5px, transparent 0.5px 11px);}
  .ikv-back--ufuk{--bk-ink:90,138,216;}              /* ilk hedef: lapis mürekkep (hayal ekseni) */
  .ikv-back--meshale{--bk-lat:8px;}                  /* ilk efsane: en yoğun doku */
  .ikv-back--meshale .ikv-back-glow{background:radial-gradient(circle, rgba(var(--bk-ink),0.22), transparent 68%);}
  .ikv-back--meshale .ikv-back-ring--outer{border-color:rgba(var(--bk-ink),0.62);}
  .ikv-back-sigil{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;}
  .ikv-back-sigil svg{width:44%;height:auto;}
  .ikv-back-mark{position:relative;font-family:var(--cinzel,'Cinzel',serif);font-weight:600;
    color:rgba(var(--bk-ink),0.6);font-size:7px;font-size:4.6cqw;letter-spacing:0.5em;text-indent:0.5em;
    padding-bottom:4%;white-space:nowrap;z-index:2;}
  /* Yolunun Nişanı kazıması — sırtın alt bölgesinde sessiz iz; sırtın
     mürekkebini paylaşır, çünkü nişan sırtın ÜSTÜNDE değil İÇİNDE yaşar */
  .ikv-back-etch{position:absolute;left:50%;bottom:13%;transform:translateX(-50%);
    width:15%;aspect-ratio:1;color:rgba(var(--bk-ink),0.55);z-index:2;}
  .ikv-back-etch svg{width:100%;height:100%;}

  /* ═══ TÖREN PRİMİTİFLERİ — salon dili: halka · panel · cascade · mühür ═══
     Kart ekranlarının ortak töre seti (Tasarım Prensipleri §3/§5/§7).       */
  .ikv-ringwrap{position:relative;width:var(--ikr-size,64px);height:var(--ikr-size,64px);flex:none;}
  .ikv-ring{width:100%;height:100%;display:block;overflow:visible;}
  .ikv-ring-track{fill:none;stroke:rgba(234,226,214,0.09);stroke-width:3;}
  .ikv-ring-bar{fill:none;stroke-width:3;stroke-linecap:round;
    filter:drop-shadow(0 0 4px rgba(245,166,35,0.35));
    animation:ikvRingDraw 1.1s var(--ease-out,cubic-bezier(0.16,1,0.3,1)) both;}
  .ikv-ringwrap.is-full .ikv-ring-bar{animation:ikvRingDraw 1.1s var(--ease-out,cubic-bezier(0.16,1,0.3,1)) both,ikvRingAwake 4.2s ease-in-out 1.3s infinite;}
  .ikv-ring-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;}
  @keyframes ikvRingDraw{from{stroke-dashoffset:var(--ikr-c)}to{stroke-dashoffset:var(--ikr-o)}}
  @keyframes ikvRingAwake{0%,100%{filter:drop-shadow(0 0 3px rgba(245,166,35,0.3))}50%{filter:drop-shadow(0 0 10px rgba(245,166,35,0.75))}}

  /* aradaki yol — iki kutup arasına gerilen tek çizgi (ikvMesafeCizgi) */
  .ikv-ms-wrap{width:100%;}
  .ikv-ms{display:flex;align-items:center;gap:8px;width:100%;}
  .ikv-ms--btn{position:relative;background:none;border:0;padding:0;cursor:pointer;min-height:0;
    -webkit-tap-highlight-color:transparent;}
  /* Apple HIG 44px hedefi görselden AYRI kurulur: base.css'in
     "button{min-height:44px}" kuralı 2px'lik çizgiyi 44px kutuya ortalar ve
     altında ölü yastık bırakırdı — cümle çizgiden kopardı. Yükseklik içeriğe
     kalır, hedef ::after ile taşar (11 + 15 + 18 = 44). */
  .ikv-ms--btn::after{content:'';position:absolute;left:0;right:0;top:-15px;bottom:-18px;}
  .ikv-ms--btn:active .ikv-ms-line{opacity:0.8;}
  .ikv-ms--btn:focus-visible{outline:2px solid var(--gold,#F5A623);outline-offset:6px;border-radius:2px;}
  .ikv-ms-dot{flex:none;font-size:11px;line-height:1;}
  .ikv-ms-dot--gold{width:8px;height:8px;border-radius:50%;
    background:var(--gold,#F5A623);box-shadow:0 0 9px rgba(245,166,35,0.7);}
  .ikv-ms-dot--lapis{color:var(--lapis-bright,#5A8AD8);text-shadow:0 0 9px rgba(90,138,216,0.8);}
  .ikv-ms-line{position:relative;flex:1;height:2px;border-radius:2px;
    background:rgba(234,226,214,0.12);overflow:visible;}
  .ikv-ms-fill{position:absolute;inset:0;border-radius:2px;
    background:linear-gradient(90deg,var(--gold,#F5A623),var(--lapis-bright,#5A8AD8));
    clip-path:inset(0 calc(100% - var(--ms-pct,0%)) 0 0);}
  .ikv-ms-spark{position:absolute;top:50%;width:4px;height:4px;border-radius:50%;
    background:var(--gold-bright,#F7C744);box-shadow:0 0 8px rgba(245,200,90,0.85);
    transform:translate(-50%,-50%);animation:ikvMsSpark 3.4s ease-in-out infinite;}
  .ikv-ms-label{font-family:var(--serif,Georgia);font-style:italic;font-size:12px;
    color:var(--text-mid,#95897A);line-height:1.5;margin-top:8px;}
  .ikv-ms-label b{color:var(--lapis-bright,#5A8AD8);font-style:normal;}
  /* parıltı yolun tamamını değil GİTTİĞİN kadarını koşar ve orada söner */
  @keyframes ikvMsSpark{
    0%{left:0%;opacity:0;} 8%{opacity:1;}
    50%{left:calc(var(--ms-pct,0%) / 2);opacity:0.9;}
    92%{opacity:1;} 100%{left:var(--ms-pct,0%);opacity:0;}}

  /* panel — ısıtılmış obsidyen: köşeden altın+lapis sızıntısı, kâğıt greni,
     cömert köşe. Gren düz opacity ile (blend-mode gren üstünde yasak). */
  .ikv-panel{position:relative;border-radius:var(--radius-xl,24px);overflow:hidden;
    border:1px solid rgba(245,166,35,0.22);
    background:
      radial-gradient(120% 90% at 0% 0%, rgba(245,166,35,0.09), transparent 55%),
      radial-gradient(130% 100% at 100% 100%, rgba(45,95,168,0.10), transparent 55%),
      linear-gradient(170deg, #1D1712, #120E09);
    box-shadow:0 14px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04);}
  .ikv-panel::after{content:'';position:absolute;inset:0;background-image:var(--grain-img);background-size:240px;opacity:0.10;pointer-events:none;}
  .ikv-panel--lapis{border-color:rgba(90,138,216,0.25);
    background:
      radial-gradient(120% 90% at 100% 0%, rgba(45,95,168,0.16), transparent 55%),
      radial-gradient(130% 80% at 50% 100%, rgba(245,166,35,0.10), transparent 60%),
      linear-gradient(170deg,#141A2B,#0C0F18);}

  /* uçlarda eriyen kıl-ayraç */
  .ikv-hairline{height:1px;border:0;margin:14px 0;background:linear-gradient(90deg,transparent,rgba(245,166,35,0.35),transparent);}
  .ikv-hairline--lapis{background:linear-gradient(90deg,transparent,rgba(90,138,216,0.35),transparent);}

  /* kademeli süzülme — hücreler --i indeksiyle sırayla belirir */
  .ikv-cascade > *{animation:ikvCascIn 0.55s var(--ease-out,cubic-bezier(0.16,1,0.3,1)) both;animation-delay:min(calc(var(--i,0)*38ms),0.95s);}
  @keyframes ikvCascIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}

  /* mühür buton — dövülmüş altın: üstten ışık, alttan gölge, basınca mühürlenir */
  .ikv-seal-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 26px;
    border:none;border-radius:var(--radius-full,999px);cursor:pointer;
    font-family:var(--cinzel,'Cinzel',serif);font-size:11px;letter-spacing:2.5px;font-weight:700;color:#1A1206;
    background:linear-gradient(180deg,var(--gold-bright,#F7C744),var(--gold,#F5A623) 55%,#D98F1B);
    box-shadow:inset 0 1px 0 rgba(255,255,255,0.38), 0 6px 18px rgba(245,166,35,0.28), 0 2px 6px rgba(0,0,0,0.4);
    transition:transform 0.15s var(--ease-out,ease), box-shadow 0.2s ease;}
  .ikv-seal-btn:active{transform:scale(0.93);box-shadow:inset 0 1px 4px rgba(0,0,0,0.25),0 2px 8px rgba(245,166,35,0.2);}
  .ikv-ghost-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 22px;
    background:transparent;border:1px solid rgba(234,226,214,0.22);border-radius:var(--radius-full,999px);cursor:pointer;
    font-family:var(--cinzel,'Cinzel',serif);font-size:10.5px;letter-spacing:2px;color:var(--text-mid,#95897A);
    transition:border-color 0.2s ease,color 0.2s ease;}
  .ikv-ghost-btn:hover{border-color:rgba(245,166,35,0.45);color:var(--text,#EAE2D6);}
  .ikv-seal-btn:focus-visible,.ikv-ghost-btn:focus-visible{outline:2px solid var(--gold,#F5A623);outline-offset:2px;}

  /* nefes — durağan ama canlı öğeler (4+s, sürekli) */
  @keyframes ikvBreath{0%,100%{opacity:0.55}50%{opacity:1}}
  @keyframes ikvGlowBreath{0%,100%{filter:drop-shadow(0 0 4px rgba(245,166,35,0.25))}50%{filter:drop-shadow(0 0 12px rgba(245,166,35,0.6))}}

  /* ═══ HOLO — kart eğilince ışık üzerinde gezer ═══
     Eğim SARMALAYICIYA uygulanır: .ikv-card'a doğrudan transform veren duruş
     kuralları (yol kutupları, oik eşik duruşu…) bozulmadan bileşir.
     Anlam: kart cansız baskı değil, ışığın üzerinde yaşadığı bir mühür —
     hangi açıdan bakarsan o yüzünü gösterir. */
  .ikv-holo{position:relative;width:100%;
    transform:perspective(1000px) rotateX(var(--hrx,0deg)) rotateY(var(--hry,0deg));
    transform-style:preserve-3d;will-change:transform;}
  .ikv-holo .ikv-scene{transform:translate3d(var(--hpx,0px),var(--hpy,0px),0);}
  .ikv-holo-sheen{position:absolute;inset:-18%;pointer-events:none;z-index:4;opacity:var(--hso,0);
    background:linear-gradient(115deg,transparent 32%,rgba(247,199,68,0.20) 44%,rgba(255,255,255,0.15) 50%,rgba(90,138,216,0.18) 56%,transparent 68%);
    transform:translate3d(var(--hsx,0%),var(--hsy,0%),0);transition:opacity 0.35s ease;}
  /* canlı giriş yokken parıltı kendi kendine yavaşça gezinir — nefes dili */
  .ikv-holo:not(.is-live) .ikv-holo-sheen{animation:ikvHoloIdle 7.5s ease-in-out infinite;}
  @keyframes ikvHoloIdle{0%,100%{opacity:0.05;transform:translate3d(-7%,3%,0)}50%{opacity:0.11;transform:translate3d(7%,-3%,0)}}

  @media (prefers-reduced-motion: reduce){
    .ikv-ring-bar,.ikv-ringwrap.is-full .ikv-ring-bar,.ikv-cascade > *{animation:none!important;}
    /* Kıvılcım susar ama SÖNMEZ: animasyon durunca solda donmasın diye
       gidilen yerin ucunda durur (yol.css'in kararı). Dolgu zaten gerçektir —
       clip-path animasyonsuz da doğru yeri gösterir. */
    .ikv-ms-spark{animation:none!important;left:var(--ms-pct,0%);opacity:0.85;}
    .ikv-seal-btn,.ikv-ghost-btn{transition:none;}
    .ikv-holo{transform:none;}
    .ikv-holo .ikv-scene{transform:none;}
    .ikv-holo-sheen{animation:none!important;opacity:0;}
    /* Yaşayan sahne durur — sahne statik hâline döner, KAYBOLMAZ. Burada
       opacity ELLE VERİLMEZ: her motifin/yıldızın kendi opaklığı SVG
       presentation attribute'undadır ve animasyon kalkınca o değer geri
       devreye girer; opacity:1 yazmak gökyüzünü düzleştirir ve sahneyi
       statik hâlinden BAŞKA gösterirdi. (Bu blok bir template literal'in
       içindedir: yorumda backtick kullanmak literal'i kapatır ve build'i
       kırar.) */
    .ikv-mv,.ikv-star,.ikv-gglow,.ikv-isik{animation:none!important;transform:none!important;}
  }
  `;
  const style = document.createElement('style');
  style.id = 'ikv-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

/* ════════════════════════════════════════════════════════════════════════
   HOLO MOTORU — kartın ışığı elinin/telefonunun eğimini izler
   ─────────────────────────────────────────────────────────────────────────
   FELSEFE: Koleksiyon kartı fizikseldir; ışığa tutulur. Masaüstünde imleç,
   telefonda jiroskop "ışığa tutma" hareketidir. Efekt üç katman:
     eğim (sarmalayıcıda rotateX/Y) → folyo parıltısı (--hsx/--hsy/--hso)
     → sahne parallax'ı (--hpx/--hpy; çerçeve sabit, dünya derinde).
   Sözleşme: mini/fog kartlara takılmaz (kilitli kart parlamaz), reduced-motion
   no-op, iOS jiroskop izni yalnızca karta dokunma jestinin içinde istenir.
═══════════════════════════════════════════════════════════════════════════ */
/* İki mod, TEK motor (paralel tilt sistemi yasak — reuse):
     'wrap' → jenerik .ikv-card/.ikv-back: sarmalayıcı + parıltı katmanı, 6°.
     'vars' → 10q .kk-card3d: sarmalayıcı YOK; kartın kendi foil/glare CSS'inin
              okuduğu --rx/--ry/--mx/--my değişkenleri sürülür (18°, tören dozu). */
const IKV_HOLO_MAX = 6;   // derece — mücevher gibi ölçülü, oyuncak gibi değil
const _holo = {
  els: new Set(), raf: 0,
  gyro: { on: false, asked: false, bBase: null, gBase: null, nx: 0, ny: 0 },  // normalize -1..1
};

function _holoReduced() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch (_) { return false; }
}

function _holoWake() {
  if (_holo.raf || !_holo.els.size) return;
  if (typeof requestAnimationFrame !== 'function') return;
  _holo.raf = requestAnimationFrame(_holoLoop);
}

function _holoLoop() {
  _holo.raf = 0;
  let live = _holo.gyro.on;   // jiroskop açıkken hedefler sürekli akar
  for (const el of _holo.els) {
    if (!el.isConnected) { _holo.els.delete(el); continue; }
    const st = el._ikvHolo;
    if (!st) { _holo.els.delete(el); continue; }
    // jiroskop ızgara minilerine akmaz — 100 hücreye rAF yazımı GPU israfı
    const gyroOk = !(st.mode === 'vars' && el.classList.contains('kk-card3d--mini'));
    const nx = st.pointer ? st.pnx : (gyroOk ? _holo.gyro.nx : 0);
    const ny = st.pointer ? st.pny : (gyroOk ? _holo.gyro.ny : 0);
    st.rx += (nx * st.max - st.rx) * 0.14;
    st.ry += (ny * st.max - st.ry) * 0.14;
    const mag = (Math.abs(st.rx) + Math.abs(st.ry)) / st.max;   // 0..2 normalize
    if (mag > 0.006 || st.pointer) live = true;
    if (st.mode === 'vars') {
      el.style.setProperty('--rx', st.rx.toFixed(2) + 'deg');
      el.style.setProperty('--ry', st.ry.toFixed(2) + 'deg');
      el.style.setProperty('--mx', (50 + (st.ry / st.max) * 50).toFixed(1) + '%');
      el.style.setProperty('--my', (50 - (st.rx / st.max) * 50).toFixed(1) + '%');
    } else {
      const wrap = el.parentElement;
      if (!wrap) { _holo.els.delete(el); continue; }
      wrap.style.setProperty('--hrx', st.rx.toFixed(2) + 'deg');
      wrap.style.setProperty('--hry', st.ry.toFixed(2) + 'deg');
      wrap.style.setProperty('--hsx', (st.ry * 3).toFixed(1) + '%');
      wrap.style.setProperty('--hsy', (-st.rx * 2).toFixed(1) + '%');
      wrap.style.setProperty('--hso', Math.min(0.85, mag * 0.75).toFixed(2));
      wrap.style.setProperty('--hpx', (-st.ry * 0.5).toFixed(2) + 'px');
      wrap.style.setProperty('--hpy', (st.rx * 0.4).toFixed(2) + 'px');
      wrap.classList.toggle('is-live', mag > 0.07);
    }
  }
  if (live && _holo.els.size) _holo.raf = requestAnimationFrame(_holoLoop);
}

/* Jiroskop: tutma pozisyonu "sıfır"dır — yavaş uyum sağlayan taban çizgisine
   göre sapma eğime çevrilir; telefonu nasıl tutarsan tut, kart oradan oynar. */
function _holoGyroOn() {
  if (_holo.gyro.on) return;
  _holo.gyro.on = true;
  try {
    window.addEventListener('deviceorientation', (e) => {
      const b = e.beta, g = e.gamma;
      if (typeof b !== 'number' || typeof g !== 'number') return;
      if (_holo.gyro.bBase == null) { _holo.gyro.bBase = b; _holo.gyro.gBase = g; }
      _holo.gyro.bBase += (b - _holo.gyro.bBase) * 0.01;
      _holo.gyro.gBase += (g - _holo.gyro.gBase) * 0.01;
      // ±14° fiziksel sapma = tam ölçek; -1..1'e normalize edilir
      const norm = (v) => Math.max(-1, Math.min(1, v / 14));
      _holo.gyro.nx = norm(_holo.gyro.bBase - b);
      _holo.gyro.ny = norm(g - _holo.gyro.gBase);
      _holoWake();
    }, { passive: true });
  } catch (_) { _holo.gyro.on = false; }
}

/* iOS 13+ jiroskobu izne bağlar ve izin çağrısı jest içinde olmak zorundadır —
   bu yüzden ilk karta-dokunuşta istenir; ret sessizce sindirilir. */
function _holoAskGyro() {
  if (_holo.gyro.asked) return;
  _holo.gyro.asked = true;
  try {
    const DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      DOE.requestPermission().then((r) => { if (r === 'granted') _holoGyroOn(); }).catch(() => {});
    } else if (DOE) {
      _holoGyroOn();
    }
  } catch (_) {}
}

export function ikvHoloAttach(el, opts) {
  try {
    if (!el || !el.classList || el._ikvHolo) return el;
    if (_holoReduced()) return el;
    const mode = (opts && opts.mode) === 'vars' ? 'vars' : 'wrap';
    let host = el;   // pointer dinleyicilerinin evi
    if (mode === 'wrap') {
      if (el.classList.contains('ikv-card--mini') || el.classList.contains('ikv-card--fog')) return el;
      if (el.closest && el.closest('.kk-card3d')) return el;   // kk kartları kendi foil dilini konuşur
      const parent = el.parentElement;
      if (!parent) return el;
      const wrap = document.createElement('div');
      wrap.className = 'ikv-holo';
      parent.insertBefore(wrap, el);
      wrap.appendChild(el);
      const sheen = document.createElement('div');
      sheen.className = 'ikv-holo-sheen';
      sheen.setAttribute('aria-hidden', 'true');
      el.appendChild(sheen);
      host = wrap;
    }
    // vars varsayılanı 9°: eski kkBindTilt (0.5−p)×18 formülünün etkin ucu
    const st = el._ikvHolo = {
      mode, max: (opts && +opts.max) || (mode === 'vars' ? 9 : IKV_HOLO_MAX),
      rx: 0, ry: 0, pnx: 0, pny: 0, pointer: false,
    };
    host.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;   // dokunmatikte kaydırmayla yarışma — orada jiroskop konuşur
      const r = host.getBoundingClientRect();
      if (!r.width || !r.height) return;
      st.pnx = -(((e.clientY - r.top) / r.height) * 2 - 1);   // dikey imleç → rotateX
      st.pny = ((e.clientX - r.left) / r.width) * 2 - 1;      // yatay imleç → rotateY
      st.pointer = true;
      _holoWake();
    }, { passive: true });
    host.addEventListener('pointerleave', () => { st.pointer = false; st.pnx = 0; st.pny = 0; _holoWake(); }, { passive: true });
    host.addEventListener('pointerdown', _holoAskGyro, { passive: true });
    _holo.els.add(el);
    if (!_holo.gyro.asked) {
      // izin kapısı olmayan platformlarda (Android/eski iOS) jiroskop hemen açılır
      try {
        const DOE = window.DeviceOrientationEvent;
        if (DOE && typeof DOE.requestPermission !== 'function') { _holo.gyro.asked = true; _holoGyroOn(); }
      } catch (_) {}
    }
    _holoWake();
    return el;
  } catch (_) { return el; }
}

/* Kap içindeki tüm uygun kartlara tek çağrıyla tak — tören render'larının ucu */
export function ikvHoloScan(root) {
  try {
    const r = root || document;
    const els = r.querySelectorAll('.ikv-card:not(.ikv-card--mini):not(.ikv-card--fog), .ikv-back:not(.ikv-card--mini)');
    let n = 0;
    els.forEach((el) => { if (!el._ikvHolo) { ikvHoloAttach(el); if (el._ikvHolo) n++; } });
    return n;
  } catch (_) { return 0; }
}

/* ════════════════════════════════════════════════════════════════════════
   GÖRÜNMEYEN SAHNE OYNAMAZ (ikvMotionScan)
   ─────────────────────────────────────────────────────────────────────────
   Yaşayan sahne bedava değildir: bir koleksiyon ızgarasında ekranın çok
   dışındaki kartlar da boşuna kompozit ederdi. IntersectionObserver tek bir
   kez kurulur ve görünmeyen sahneyi `is-durdu` ile duraklatır — durdurmak
   silmek değildir, kart göründüğü anda kaldığı yerden sürer.
   reduced-motion'da hiç kurulmaz: zaten hareket yok.
═══════════════════════════════════════════════════════════════════════════ */
let _mvIO = null;
let _mvPlanli = false;

/* Tarama ÇAĞIRANA bırakılmaz. Sahneler onlarca ayrı yüzeyden basılıyor
   (salon, detay, tören, backdrop, paket açılışı…); her birine "taramayı
   unutma" borcu yüklemek er geç unutulan bir yüzey demektir — nitekim ilk
   denemede salon ızgarası tarandı, detay portalı taranmadı. Bunun yerine
   sahne ÜRETİMİ taramayı kendi planlar: bir sonraki makro-görevde (innerHTML
   ataması senkron olduğundan DOM çoktan hazırdır) tek bir tarama koşar.
   `data-mv-izleniyor` guard'ı sayesinde tekrar çağrılar bedavadır.

   GOTCHA — burada requestAnimationFrame KULLANILMAZ: rAF görünmeyen sekmede
   (ve gizli panelde) hiç ateşlenmez, o yüzden arka planda basılan sahneler
   izlemeye HİÇ alınmazdı; sekme öne geldiğinde de alınmazlardı, çünkü yeni
   bir sahne basılmadıkça planlayıcı bir daha çalışmaz. setTimeout kısılır
   ama çalışır. */
function _mvPlanla() {
  try {
    if (_mvPlanli || typeof setTimeout !== 'function') return;
    _mvPlanli = true;
    setTimeout(() => { _mvPlanli = false; ikvMotionScan(document); }, 0);
  } catch (_) {}
}

export function ikvMotionScan(root) {
  try {
    if (_holoReduced()) return 0;
    if (typeof IntersectionObserver !== 'function') return 0;
    if (!_mvIO) {
      _mvIO = new IntersectionObserver((entries) => {
        entries.forEach((e) => e.target.classList.toggle('is-durdu', !e.isIntersecting));
      }, { rootMargin: '120px' });
    }
    const r = root || document;
    const els = r.querySelectorAll('.ikv-scene-svg:not([data-mv-izleniyor])');
    els.forEach((el) => { el.setAttribute('data-mv-izleniyor', '1'); _mvIO.observe(el); });
    return els.length;
  } catch (_) { return 0; }
}

/* TDZ-güvenli erişim için window'a aç (modüller-arası konvansiyon) */
try {
  window.ikvCardFace = ikvCardFace;
  window.ikvCardBack = ikvCardBack;
  window.IKV_SIRTLAR = SIRTLAR;      // sırt kataloğu (10q rafı okur)
  window.ikvRing = ikvRing;
  window.ikvMesafeCizgi = ikvMesafeCizgi;
  window.ikvScene = ikvScene;
  window.ikvMilestoneScene = ikvMilestoneScene;
  window.ikvLantern = ikvLantern;
  window.ikvEnsureStyles = ikvEnsureStyles;
  window.ikvNormSpec = ikvNormSpec;
  window.ikvComposeBackdrop = ikvComposeBackdrop;
  window.ikvHoloAttach = ikvHoloAttach;
  window.ikvHoloScan = ikvHoloScan;
  window.ikvMotionScan = ikvMotionScan;
} catch (_) {}
