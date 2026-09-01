/* ═══════════════════════════════════════════════════════
   12g — YÜZ ÇİZGİSİ · Kullanıcının kendi yüzünden kart gravürü
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     "Mesele Sensin." Uygulamanın iki ana kartı — Olunan [Ad] (altın,
     olduğun kişi) ve Niyet Alınan [Ad] (lapis, olmak istediğin kişi) —
     bugüne kadar kataloğun figür diliyle çiziliyordu. Artık ikisinin de
     çizimi KULLANICININ KENDİ YÜZÜ: profil fotoğrafından ölçülen yüz,
     kartın kendi çizgi diliyle (ince altın kontur gravürü) kazınır.
     İki kart AYNI yüzü taşır, yalnız ışığı değişir — altın "şimdi",
     lapis "gelecek". Tez tam olarak budur: kartta duran kişi sensin.
     Arka plan kartın yıldızlı göğüdür; yüz oradan doğar.

   MEKANİK / MİMARİ / TEK GİRİŞ:
     Foto → ten kromasıyla YÜZ ÖLÇÜMÜ (tanıma değil: YCbCr'de ten dar bir
     bantta durur) → en büyük bağlı parça → açma/kapama → sınır kutusundan
     madalyon elipsi → kırpma yüzü kartın ÇERÇEVE OVALİNE oturtur → maske
     içinde ton dengelenip gerilir → yatay şerit gravürü (mürekkep kalınlığı
     ışığı taşır). Çıktı SAF VEKTÖR (yalnız <path>) — kart sahnesine <image>
     GİRMEZ; 13g paylaşım tuvali ve SVG→raster yolları temiz kalır.

     Tek giriş: `yzKonturGovde({palette, mini})` → sahne gövdesi (string|'').
     Sahnenin göğünü/yıldızını/çerçevesini 12c kurar (kart dili orada tektir).

   GERÇEKLİK (§6.10): çizim bir ÖLÇÜMDÜR, kaynağı kullanıcının kendi
     beyanı olan fotoğraftır. Fotoğraf yoksa, ui-avatars vekili varsa ya da
     ten kanıtı eşiği geçmiyorsa `null` döner ve kart bugünkü sahnesinde
     kalır — olmayan bir yüz UYDURULMAZ.

   Kalıcılık: yok (oturum içi bellek). İz fotoğraftan her oturumda yeniden
     ölçülür; böylece fotoğraf değişince bayat iz kalmaz.
   Konvansiyon: window.yz* expose; stil yok (çizim SVG'nin kendisi)
═══════════════════════════════════════════════════════ */

import { S } from '../state.js';

/* ─── 1. SABİTLER ─── */
const GW = 104, GH = 129;        // gravür ızgarası — çerçeve ovalinin oranı
const MW = 150;                  // ölçüm kopyasının genişliği (avatar zaten ≤150)
/* Çizim kutusu, kart viewBox'ında (200×250) ÇERÇEVE OVALİNİN sınır kutusudur:
   kartın çerçevesi bu iki kartta dikdörtgen değil ovaldir (merkez 100,130 —
   yarıçaplar 76×94, bkz. 12c ikvYuzSahne). Yüz o ovali DOLDURUR, taşanı oval
   keser; kesik değil çerçevelenmiş bir portre olur. */
const X0 = 24, X1 = 176;
const Y0 = 36, Y1 = 224;
const TEN_ESIK = 0.010;          // kare içinde en az %1 ten pikseli
const PARCA_ESIK = 0.008;        // en büyük bağlı parçanın alt sınırı

let _iz = null;                  // {ton, maske} — ölçülmüş iz
let _izUrl = '';                 // izin ölçüldüğü foto adresi
let _bekleyen = null;            // eşzamanlı çağrılar tek ölçümde birleşsin

/* ─── 2. IZGARA YARDIMCILARI ─── */
function _blur(src, w, h, r) {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let k = -r; k <= r; k++) { const xx = x + k; if (xx < 0 || xx >= w) continue; s += src[y * w + xx]; n++; }
    tmp[y * w + x] = s / n;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let k = -r; k <= r; k++) { const yy = y + k; if (yy < 0 || yy >= h) continue; s += tmp[yy * w + x]; n++; }
    out[y * w + x] = s / n;
  }
  return out;
}

function _bilinear(g, w, h, u, v) {
  const x = Math.min(w - 1.001, Math.max(0, u * (w - 1)));
  const y = Math.min(h - 1.001, Math.max(0, v * (h - 1)));
  const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
  const a = g[y0 * w + x0], b = g[y0 * w + x0 + 1], c = g[(y0 + 1) * w + x0], e = g[(y0 + 1) * w + x0 + 1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + e * fx) * fy;
}

/* Morfoloji — genişletme (isDil) / aşındırma. Kare yapı elemanı. */
function _morph(src, w, h, r, isDil) {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let hit = isDil ? 0 : 1;
    for (let dy = -r; dy <= r; dy++) {
      let kir = false;
      for (let dx = -r; dx <= r; dx++) {
        const xx = x + dx, yy = y + dy;
        const v = (xx < 0 || yy < 0 || xx >= w || yy >= h) ? 0 : src[yy * w + xx];
        if (isDil) { if (v > 0.5) { hit = 1; kir = true; break; } }
        else if (v < 0.5) { hit = 0; kir = true; break; }
      }
      if (kir) break;
    }
    out[y * w + x] = hit;
  }
  return out;
}

/* ─── 3. YÜZ ÖLÇÜMÜ ───
   Yüz TANIMA değil. YCbCr'de insan teni — koyu ya da açık — dar bir
   krominans bandında durur; o bandı işaretleyip en büyük bağlı parçayı
   alıyoruz. Açma, saç aralarından sızan gökyüzü beneklerini düşürür;
   kapama göz/sakal deliklerini doldurur. Çizim alanı lekenin PÜRÜZLÜ
   silueti değil, ondan ölçülen ELİPS: siluet arka plan kaçaklarını içeri
   alıyordu, oval ise markanın portre çerçevesidir (.wns-portrait). */
function _yuzOlc(d, w, h) {
  const N = w * h, bin = new Uint8Array(N);
  let n = 0;
  for (let i = 0; i < N; i++) {
    const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2];
    const Y = 0.299 * R + 0.587 * G + 0.114 * B;
    const Cb = 128 - 0.168736 * R - 0.331264 * G + 0.5 * B;
    const Cr = 128 + 0.5 * R - 0.418688 * G - 0.081312 * B;
    if (Y > 40 && Y < 245 && Cr > 135 && Cr < 180 && Cb > 77 && Cb < 132 && R > G && G > B - 15) { bin[i] = 1; n++; }
  }
  if (n < N * TEN_ESIK) return null;

  // En büyük bağlı parça — yığın tabanlı (özyineleme derin fotoğrafta patlar)
  const lab = new Int32Array(N).fill(-1), st = new Int32Array(N);
  let best = null, bestN = 0;
  for (let s = 0; s < N; s++) {
    if (!bin[s] || lab[s] >= 0) continue;
    let top = 0, cnt = 0; st[top++] = s; lab[s] = s;
    const px = [];
    while (top > 0) {
      const p = st[--top]; cnt++; px.push(p);
      const x = p % w, y = (p / w) | 0;
      if (x > 0 && bin[p - 1] && lab[p - 1] < 0) { lab[p - 1] = s; st[top++] = p - 1; }
      if (x < w - 1 && bin[p + 1] && lab[p + 1] < 0) { lab[p + 1] = s; st[top++] = p + 1; }
      if (y > 0 && bin[p - w] && lab[p - w] < 0) { lab[p - w] = s; st[top++] = p - w; }
      if (y < h - 1 && bin[p + w] && lab[p + w] < 0) { lab[p + w] = s; st[top++] = p + w; }
    }
    if (cnt > bestN) { bestN = cnt; best = px; }
  }
  if (!best || bestN < N * PARCA_ESIK) return null;

  const comp = new Float32Array(N);
  for (const p of best) comp[p] = 1;
  const acik = _morph(_morph(comp, w, h, 3, false), w, h, 3, true);
  const kapali = _morph(_morph(acik, w, h, 3, true), w, h, 3, false);

  let k = 0, bx0 = w, bx1 = 0, by0 = h, by1 = 0;
  for (let i = 0; i < N; i++) if (kapali[i] > 0.5) {
    const x = i % w, y = (i / w) | 0;
    k++;
    if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
    if (y < by0) by0 = y; if (y > by1) by1 = y;
  }
  if (!k || bx1 - bx0 < 4 || by1 - by0 < 4) return null;

  const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
  const rx = (bx1 - bx0) / 2 * 1.06, ry = (by1 - by0) / 2 * 1.06;

  // Madalyon maskesi — kenarı yumuşar ki yüz yıldızlara karışsın, bıçakla
  // kesilmiş bir çıkartma gibi durmasın.
  const m = new Float32Array(N);
  const erx = rx * 0.92, ery = ry * 0.96;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const e = Math.sqrt(((x - cx) / erx) ** 2 + ((y - cy) / ery) ** 2);
    m[y * w + x] = e <= 0.78 ? 1 : (e >= 1.0 ? 0 : (1.0 - e) / 0.22);
  }
  return { m, w, h, cx, cy, rx, ry };
}

/* ─── 4. İZ — foto → {ton, maske} ─── */
async function _izCikar(url) {
  const img = new Image();
  img.crossOrigin = 'anonymous';   // tuval okunabilsin (Supabase CORS gönderir)
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  if (!img.width || !img.height) return null;

  const pv = document.createElement('canvas');
  pv.width = MW; pv.height = Math.max(8, Math.round(MW * img.height / img.width));
  const pc = pv.getContext('2d', { willReadFrequently: true });
  pc.drawImage(img, 0, 0, pv.width, pv.height);
  const f = _yuzOlc(pc.getImageData(0, 0, pv.width, pv.height).data, pv.width, pv.height);
  if (!f) return null;             // ten kanıtı yok → çizim doğmaz

  // Kırpma: yüz ÇERÇEVE OVALİNİ doldursun — ekranda .wns-portrait'in içini
  // fotoğrafın doldurduğu gibi. Pencere fotoğrafın dışına taşarsa kenarda
  // boş şerit kalırdı; kelepçe onu içeri çeker (kelepçe pencereyi KAYDIRIR,
  // küçültmez — yüzün ölçüsü bozulmaz).
  const DOLGU = 0.84;
  const k = img.width / pv.width;
  let sh = (2 * f.ry * k) / DOLGU;
  let sw = sh * (GW / GH);
  const minW = (2 * f.rx * k) / (DOLGU * 0.90);
  if (sw < minW) { sw = minW; sh = sw * (GH / GW); }
  const kelepce = (merkez, pencere, tam) =>
    tam > pencere ? Math.min(Math.max(0, merkez - pencere / 2), tam - pencere) : (tam - pencere) / 2;
  const sx = kelepce(f.cx * k, sw, img.width);
  const sy = kelepce(f.cy * k, sh, img.height);

  const cv = document.createElement('canvas');
  cv.width = GW; cv.height = GH;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(img, sx, sy, sw, sh, 0, 0, GW, GH);
  const d = cx.getImageData(0, 0, GW, GH).data;

  const raw = new Float32Array(GW * GH), maske = new Float32Array(GW * GH);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const i = y * GW + x;
    raw[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
    const pu = ((sx + (x + 0.5) / GW * sw) / k) / pv.width;
    const pv2 = ((sy + (y + 0.5) / GH * sh) / k) / pv.height;
    maske[i] = (pu < 0 || pu > 1 || pv2 < 0 || pv2 > 1) ? 0 : _bilinear(f.m, f.w, f.h, pu, pv2);
  }

  // Madalyonun İÇİNDE dengeleme: düşük frekans düzlenir (saç kütlesi yüzü
  // ezmesin), sonra ton yalnız maske içindeki piksellerin yüzdeliklerine
  // göre gerilir — yüzün kendi aralığı tam mürekkebe yayılsın.
  const lowf = _blur(raw, GW, GH, Math.round(GW * 0.17));
  const mix = new Float32Array(GW * GH);
  for (let i = 0; i < mix.length; i++) mix[i] = raw[i] * 0.55 + ((raw[i] - lowf[i]) * 1.35 + 0.5) * 0.45;

  const ic = [];
  for (let i = 0; i < mix.length; i++) if (maske[i] > 0.55) ic.push(mix[i]);
  if (ic.length < 40) return null;
  ic.sort((a, b) => a - b);
  const lo = ic[Math.floor(ic.length * 0.06)], hi = ic[Math.floor(ic.length * 0.94)];
  const span = Math.max(0.06, hi - lo);
  const ton = new Float32Array(GW * GH);
  for (let i = 0; i < ton.length; i++) ton[i] = Math.min(1, Math.max(0, (mix[i] - lo) / span));

  // MADALYON GEOMETRİSİ — kart viewBox'ında (200×250). Çerçeve DEĞİL: çerçeve
  // ovali kart dilinin sabitidir (12c). Bu ölçü yüzün ovalin içindeki kendi
  // yeridir; 12c yıldız tarlasını buna göre seyreltir (gökyüzü yüzün üstüne
  // düşmesin). Ölçüyü ölçen bilir, çizen değil.
  const cxN = (f.cx * k - sx) / sw, cyN = (f.cy * k - sy) / sh;
  const madalyon = {
    cx: X0 + cxN * (X1 - X0),
    cy: Y0 + cyN * (Y1 - Y0),
    rx: (f.rx * 0.92 * k / sw) * (X1 - X0),
    ry: (f.ry * 0.96 * k / sh) * (Y1 - Y0),
  };

  return { ton, maske, madalyon };
}

/* ─── 5. GRAVÜR — yatay şeritler, mürekkep kalınlığı ışığı taşır ───
   Banknot gravürünün kuralı: ton, çizginin KALINLIĞIYLA anlatılır. Tavan
   şerit aralığının altında kalır — aralarda hep obsidyen bir nefes payı
   durur, yoksa yüz tek bir altın kütleye dönüşür. */
export function yzKonturGovde(opts = {}) {
  if (!_iz) return '';
  const renk = opts.palette === 'lapis' ? '#7FA6E4' : '#F5A623';
  const mini = !!opts.mini;
  const rows = mini ? 40 : 74;                  // mini ızgarada LOD: yarı çözünürlük
  const steps = mini ? 56 : 96;
  const amp = 0.35;                             // hafif kabartma; ton işi kalınlıkta
  const pitch = (Y1 - Y0) / rows;
  let out = '';
  for (let r = 0; r < rows; r++) {
    const v = (r + 0.5) / rows;
    const yBase = Y0 + v * (Y1 - Y0);
    let top = [], bot = [];
    const parts = [];
    const bosalt = () => {
      if (top.length > 1) parts.push(`M${top.join(' L')} L${bot.reverse().join(' L')} Z`);
      top = []; bot = [];
    };
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const m = _bilinear(_iz.maske, GW, GH, u, v);
      // Mürekkep yalnız yüzün maskesinde akar: arka plan çizilmez, oradan
      // gökyüzü ve yıldızlar görünür (Emre'nin ilk kuralı — SADECE YÜZ).
      if (m < 0.06) { bosalt(); continue; }
      const L = _bilinear(_iz.ton, GW, GH, u, v);
      const ink = (L ** 1.25) * m;
      const w = 0.05 + ink * pitch * 0.80;
      const y = yBase - (ink - 0.5) * amp;
      const x = X0 + u * (X1 - X0);
      top.push(`${x.toFixed(1)} ${(y - w / 2).toFixed(2)}`);
      bot.push(`${x.toFixed(1)} ${(y + w / 2).toFixed(2)}`);
    }
    bosalt();
    if (parts.length) out += `<path d="${parts.join('')}" fill="${renk}" opacity="0.95"/>`;
  }
  return out;
}

/* ─── 6. HAYAT DÖNGÜSÜ ─── */

/** Çizilecek bir yüz izi var mı? (12c bunu sorar) */
export function yzVar() { return !!_iz; }

/** Yüzün çerçeve ovali içindeki kendi elipsi — 12c yıldız tarlasını buna
 *  göre seyreltir. İz yoksa null: seyreltilecek bir yüz de yoktur. */
export function yzMadalyon() { return _iz ? _iz.madalyon : null; }

/** Fotoğraf gerçek bir yükleme mi? ui-avatars vekili bir YÜZ DEĞİLDİR —
 *  baş harflerden üretilmiş bir yer tutucudan portre kazımak uydurmaktır. */
function _gercekFoto(url) {
  const u = String(url || '').trim();
  if (!u) return false;
  // ui-avatars: baş harflerden üretilen vekil. Tek elenen budur — adresin
  // biçimine karışmayız (data:, mutlak, göreli hepsi geçerli bir fotoğraf
  // olabilir); gerçek kapı zaten ten kanıtıdır (_yuzOlc null döner).
  return !u.startsWith('https://ui-avatars.com');
}

/** Yüz izini ölç (idempotent; aynı foto için tek ölçüm). */
export async function yzEnsure(url) {
  const foto = url || S.USER_IMG || '';
  if (!_gercekFoto(foto)) { _iz = null; _izUrl = ''; return false; }
  if (_iz && _izUrl === foto) return true;
  if (_bekleyen && _izUrl === foto) return _bekleyen;
  _izUrl = foto;
  let bu;                          // TDZ'ye düşmesin: finally'den önce tanımlı
  bu = (async () => {
    try {
      const iz = await _izCikar(foto);
      // Yarışta başka bir foto ölçülmeye başlamışsa bu sonucu yazma
      if (_izUrl !== foto) return !!_iz;
      _iz = iz;
      return !!iz;
    } catch (e) {
      // CORS, bozuk dosya, tuval kilidi… — asla bloklama, kart eski sahnesinde kalır
      console.warn('yzEnsure:', e && e.message);
      if (_izUrl === foto) _iz = null;
      return false;
    } finally {
      // Yalnız KENDİ beklemesini temizle: bu ölçüm sürerken foto değiştiyse
      // _bekleyen artık yeni ölçümündür, onu düşürmek yarışı bozar.
      if (_bekleyen === bu) _bekleyen = null;
    }
  })();
  _bekleyen = bu;
  return bu;
}

/** Fotoğraf değişti / hesap kapandı — izi bırak. */
export function yzUnut() { _iz = null; _izUrl = ''; _bekleyen = null; }

/** Post-auth girişi (03-auth-shell sırası). Sessizce ölçer; bittiğinde iki
 *  kartın durduğu yüzeyler bir sonraki çizimde yüzü alır. */
export function yzInit() {
  try {
    yzEnsure().then(ok => {
      if (!ok) return;
      // Ölçüm bitince açık olan yüzeyler yüzü görsün. Üçü de kendi kökünü
      // arar, ekran kapalıysa sessizce döner — idempotent.
      //
      // Bu liste, `yuz:true` bayrağının takıldığı yüzeylerle EŞ olmak
      // zorundadır. Biri unutulursa o yüzey ölçüm bitmeden çizilir ve bir
      // daha tazelenmez — kart yüzsüz, dolayısıyla ovalsiz donar. Bugün'ün
      // iki ana kartı (#yol-hero) tam bu yüzden eski sahnesinde kalmıştı:
      // 10f'nin kendi 3200 ms'lik güvenlik tazelemesi, fotoğraf indirmesi
      // yavaş olduğunda ölçümden ÖNCE bitiyor ve kimse bir daha çizmiyordu.
      //
      // Eşik (02d) bilerek LİSTE DIŞI: render'ı töreni baştan oynatır,
      // tazelemek kartları animasyona geri atardı. Eşik açılırken ölçüm
      // bitmişse yüzü zaten alır.
      try { window.loadPortreView?.(); } catch (_) {}
      try { window.oikRenderHub?.(); } catch (_) {}
      try { window.yolRenderHero?.(); } catch (_) {}
    }).catch(() => {});
  } catch (_) {}
}

if (typeof window !== 'undefined') {
  window.yzKonturGovde = yzKonturGovde;
  window.yzMadalyon = yzMadalyon;
  window.yzVar = yzVar;
  window.yzEnsure = yzEnsure;
  window.yzUnut = yzUnut;
  window.yzInit = yzInit;
}
