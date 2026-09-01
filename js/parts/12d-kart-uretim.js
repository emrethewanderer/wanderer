/* ═══════════════════════════════════════════════════════════════════
   12d — KART ÜRETİM MOTORU (kum·) · "Her kart kendi sahnesini bulur"
   ───────────────────────────────────────────────────────────────────
   FELSEFE: Kart tasarlayan/edinen kişi hazır bir çizim GİYMEZ; karta
   ÖZEL, karta tam anlamıyla uyumlu ve bu tasarım dilinde BENZERSİZ bir
   sahne alır. Raster/AI görsel YOK (Emre kararı) — motor tamamen
   prosedürel: 12c'nin katmanlı kompozitörüne (ikvComposeScene) bir
   "sahne reçetesi" (spec) besler.

   ÜÇ REÇETE KAYNAĞI (öncelik sırasıyla):
     1) Elle küratörlü deste (12b `sahne` alanı) — DB/LLM gerekmez.
     2) LLM bestecisi (kumComposeFromText) — kullanıcı kartları için;
        yalnız 12c IKV_MOTIF_KEYS'teki geçerli anahtarları seçer.
     3) Sezgisel besteci (kumHeuristicSpec) — SENKRON, ağsız, daima
        çalışır: kart metnini anahtar-kelime taraması + erdem havuzu +
        deterministik tohumla (ikvSeed) bestelenmiş bir sahneye çevirir.
        LLM yoksa/başarısızsa/offline'da render ASLA boş kalmaz.

   SAHNE YALNIZ KARTIN KENDİ METNİNDEN DOĞAR (2026-08-07 kararı): daha
   önce Alfabe Işık'ın on nişanı nesne motifi olarak kütüphanedeydi ve
   kullanıcının o hafta yazdığı nişan metni nesnesiz kartlara iz
   bırakıyordu. Söküldü — kartın sahnesi kartın anlamına ait olmalı,
   kullanıcının başka bir odadaki durumuna değil. Alfabe Işık kendi
   salonunda, kapı kazımasında ve kart SIRTINDA yaşamayı sürdürür
   (10D "Yolunun Nişanı" — orada izi kullanıcı kendi eliyle seçer).

   ZAMANLAMA: ikvCardFace/ikvScene SENKRON çalışır — bir kartın sahnesi
   render anında ağ beklemez. Bu yüzden kumEnsureSpec de SENKRONDUR:
   önce sezgisel reçeteyi anında üretip döner (+ persist), SONRA arka
   planda LLM'den daha isabetli bir reçete gelirse onunla SESSİZCE
   değiştirir (onRefined callback'i varsa render'ı tazeler). Kullanıcı
   asla "yükleniyor" beklemez; sahne baştan zaten benzersizdir, LLM
   sadece onu bir adım daha isabetli hâle getirir.

   TR NOT: Kelime taramasında \b (regex kelime sınırı) KULLANILMAZ —
   JS \b, ç/ğ/ı/ö/ş/ü'yü "kelime dışı" saydığından Türkçe kelime
   başı/sonunda yanlış (ya da hiç) sınır bulur. Bunun yerine normalize
   edilmiş metinde düz .includes() taraması yapılır (bkz. 09a notu).
   ═══════════════════════════════════════════════════════════════════ */

import { SUMMARY_MODEL } from '../config.js';
import { callLLM } from './04-llm-hero-history.js';
import { p } from './16-i18n-prompts.js';
import { ikvSeed, ikvNormSpec, IKV_MOTIF_KEYS } from './12c-kart-gorsel.js';

/* ════════════════════════════════════════════════════════════════════
   ERDEM HAVUZLARI — anahtar kelime bulunamadığında dolduran öncül;
   her erdem için 2 varyant, tohumla seçilir (kart-kart çeşitlilik).
═══════════════════════════════════════════════════════════════════════ */
const VIRTUE_POOLS = {
  sebat:    [{ cerceve: 'dik', uzak: ['dag'], orta: ['merdiven'], yol: 'taslar' },
             { cerceve: 'kemer', uzak: ['sur'], orta: ['kapi'], yol: 'kavis' }],
  bolluk:   [{ cerceve: 'acik', gok: 'gunes', orta: ['agac'], nesne: ['kase'] },
             { cerceve: 'pencere', uzak: ['orman'], nesne: ['kase', 'tohum'] }],
  ozsaygi:  [{ cerceve: 'dik', orta: ['sutun'], uzak: ['sur'] },
             { cerceve: 'kemer', orta: ['kapi'], uzak: ['sur'] }],
  durust:   [{ cerceve: 'daire', gok: 'gunes', orta: ['ayna'] },
             { cerceve: 'pencere', gok: 'dogan' }],
  ozguven:  [{ cerceve: 'dik', gok: 'dogan', uzak: ['dag'], yol: 'kavis' },
             { cerceve: 'kemer', uzak: ['tepe'], nesne: ['muhur'] }],
  ozdeger:  [{ cerceve: 'kemer', nesne: ['elmas'], gok: 'gunes' },
             { cerceve: 'daire', nesne: ['elmas'], uzak: ['kubbe'] }],
  ozsevgi:  [{ cerceve: 'pencere', nesne: ['kalp'], gok: 'dogan' },
             { cerceve: 'acik', orta: ['agac'], nesne: ['kalp'] }],
  niyet:    [{ cerceve: 'acik', gok: 'takim', nesne: ['pusula'] },
             { cerceve: 'kemer', gok: 'hilal', nesne: ['pusula'] }],
  sukur:    [{ cerceve: 'acik', gok: 'gunes', nesne: ['kase'] },
             { cerceve: 'pencere', uzak: ['deniz'], nesne: ['kase'] }],
  yansima:  [{ cerceve: 'daire', orta: ['ayna'], fig: { mod: 'ikiz' } },
             { cerceve: 'daire', orta: ['kuyu'] }],
  odak:     [{ cerceve: 'kemer', gok: 'takim', yol: 'spiral' },
             { cerceve: 'dik', orta: ['fener'], yol: 'kavis' }],
};
/* Erdemsiz (kullanıcı kartları) için jenerik havuz — hiç ipucu yoksa bile
   sahne asla çıplak kalmaz. */
const GENERIC_POOL = [
  { cerceve: 'kemer', gok: 'hilal', uzak: ['dag'] },
  { cerceve: 'dik', gok: 'dogan', orta: ['merdiven'] },
  { cerceve: 'pencere', uzak: ['sehir'] },
  { cerceve: 'daire', gok: 'takim', yol: 'spiral' },
  { cerceve: 'acik', uzak: ['deniz'], gok: 'takim' },
];

/* ════════════════════════════════════════════════════════════════════
   ANAHTAR KELİME SÖZLÜĞÜ — kart metninde geçen somut imgeler sahneye
   yön verir. Taraması .includes() ile (bkz. dosya başı TR notu).
═══════════════════════════════════════════════════════════════════════ */
const KW = {
  gok: {
    hilal: ['hilal', 'ay ışığ', 'gece yarı', 'karanlık gece', 'ay doğ'],
    gunes: ['güneş', 'aydınlık', 'parlak bir', 'ışığa çık'],
    dogan: ['şafak', 'doğan güneş', 'sabahın ilk', 'yeni bir gün', 'tan vakti'],
    takim: ['yıldız', 'yön göster', 'rehber ışık', 'kutup yıldız'],
    bulut: ['bulutlu', 'belirsizlik', 'sisli', 'puslu'],
    yagmur: ['yağmur', 'gözyaşı', 'ağlayan', 'hüzünlü'],
  },
  uzak: {
    dag: ['dağ', 'zirveye', 'tırman', 'aşılması gereken'],
    tepe: ['tepe', 'yokuş'],
    deniz: ['deniz', 'okyanus', 'ufuk', 'dalga'],
    sehir: ['şehir', 'kalabalık', 'sokak', 'cadde'],
    orman: ['orman', 'ağaçlar aras'],
    sur: ['sur', 'kale duvar', 'şehir suru'],
    kubbe: ['kubbe', 'mabed', 'tapınak', 'ibadet'],
  },
  orta: {
    kapi: ['kapı', 'eşik', 'girişte'],
    kopru: ['köprü', 'iki yaka', 'karşıya geç'],
    kule: ['kule', 'yüksekte yalnız'],
    fener: ['fener', 'ışık tutan', 'aydınlatan el'],
    merdiven: ['merdiven', 'basamak basamak', 'yükselen adım'],
    perde: ['perde', 'sırrını', 'gizli kalan', 'örtülü'],
    ayna: ['ayna', 'yansıma', 'ikizi', 'kendine bak'],
    agac: ['ağaç', 'kök salan', 'büyüyen fidan'],
    kuyu: ['kuyu', 'derinlerde', 'iç dünyasın'],
    cesme: ['çeşme', 'akan su', 'tazelenen'],
    kapan: ['tuzağa', 'kısır döngü', 'alışkanlığın esiri', 'kapan'],
    catal: ['yol ayrımı', 'iki seçenek', 'karar anı', 'çatal'],
    sutun: ['sütun', 'sağlam temel', 'köklü duruş'],
  },
  nesne: {
    elmas: ['elmas', 'değerin', 'kıymetli', 'paha biçilmez'],
    kumru: ['kumru', 'güvercin', 'barış', 'huzur kuşu'],
    terazi: ['terazi', 'adalet', 'denge', 'tarttığı'],
    pusula: ['pusula', 'yönünü', 'niyetin', 'rotanı'],
    kitap: ['kitap', 'bilgelik', 'öğrendiği', 'sayfaları'],
    muhur: ['mühür', 'söz verdiği', 'yemin'],
    zincir: ['zincir', 'bağlı kaldığı', 'esir'],
    kirikzincir: ['zincirini kır', 'özgürleş', 'koptu bağ'],
    kumsaati: ['kum saati', 'zamanın', 'sabrın', 'geçen zaman'],
    anahtar: ['anahtar', 'kilidi aç', 'çözümü'],
    kase: ['kâse', 'kase', 'bereket', 'bolluğun', 'taşan'],
    tohum: ['tohum', 'ilk adım', 'yeni başlangıç'],
    kalp: ['kalbi', 'yüreği', 'sevgiyle'],
  },
  yol: {
    kavis: ['yükselen yol', 'yukarı doğru', 'tırmanış'],
    spiral: ['döngü', 'tekrar tekrar', 'sarmal'],
    taslar: ['adım adım ilerleyen', 'taş taş', 'yavaş yavaş'],
  },
  bitki: {
    filiz: ['filiz', 'yeni tohum', 'ilk başlangıç'],
    kok: ['kök sal', 'köklen', 'derinleşen'],
    tac: ['taç yaptı', 'zirveye ulaş', 'ustalaş'],
  },
  figMod: {
    ikiz: ['ikizi', 'yansıması', 'eski ben', 'iki benlik'],
    golge: ['gölge', 'karanlık yanı', 'bastırılmış'],
    cift: ['birlikte', 'omuz omuza'],
  },
  cerceve: {
    pencere: ['gerçek hayat', 'günlük hayat', 'sokakta', 'gündelik'],
    daire: ['döngü', 'çember', 'tekrar eden'],
    kemer: ['eşik', 'geçiş anı', 'kapıdan geçen'],
  },
};

function _norm(s) { return String(s || '').toLocaleLowerCase('tr'); }

/* Bir alan için sözlükte tara → eşleşen hedefleri ÖZGÜLLÜK sırasında döndür.
   ─────────────────────────────────────────────────────────────────────────
   Eskiden ilk eşleşen kazanırdı ve "ilk" sözlükteki YAZIM sırasıydı: `kapi`
   KW.orta'nın başında durduğu için "kapı" geçen her metin, kart asıl "kısır
   döngü"den söz ediyorken bile kapı çiziyordu. Sıra bir anlam taşımıyordu,
   ama sonucu belirliyordu.

   Ölçü artık eşleşmenin KENDİSİ: uzun ipucu kısa ipucundan özgüldür
   ("alışkanlığın esiri" > "kapı"), birden çok ipucu tek ipucundan güçlüdür.
   Eşitlikte sözlük sırası korunur (sort kararlıdır) — motor deterministik
   kalır, aynı metin her zaman aynı sahneyi verir. */
function _scan(norm, dict, max) {
  const hits = [];
  for (const [target, words] of Object.entries(dict)) {
    let enUzun = 0, adet = 0;
    for (const w of words) {
      if (!norm.includes(w)) continue;
      adet++;
      if (w.length > enUzun) enUzun = w.length;
    }
    if (adet) hits.push({ target, skor: enUzun + (adet - 1) * 4 });
  }
  hits.sort((a, b) => b.skor - a.skor);
  return hits.slice(0, max).map(h => h.target);
}

/* ════════════════════════════════════════════════════════════════════
   kumHeuristicSpec — SENKRON, ağsız, daima başarılı sezgisel besteci.
   input: { seed, virtue, texts:[...] }
═══════════════════════════════════════════════════════════════════════ */
export function kumHeuristicSpec(input = {}) {
  const seed = input.seed || 'kum-' + Math.random().toString(36).slice(2);
  const rnd = ikvSeed(seed);
  const norm = _norm((input.texts || []).join(' • '));

  const spec = {};
  const gokHit = _scan(norm, KW.gok, 1);
  const uzakHit = _scan(norm, KW.uzak, 2);
  const ortaHit = _scan(norm, KW.orta, 2);
  const nesneHit = _scan(norm, KW.nesne, 2);
  const yolHit = _scan(norm, KW.yol, 1);
  const bitkiHit = _scan(norm, KW.bitki, 1);
  const figHit = _scan(norm, KW.figMod, 1);
  const cerceveHit = _scan(norm, KW.cerceve, 1);

  if (gokHit.length) spec.gok = gokHit[0];
  if (uzakHit.length) spec.uzak = uzakHit;
  if (ortaHit.length) spec.orta = ortaHit;
  if (nesneHit.length) spec.nesne = nesneHit.map(m => ({ m }));
  if (yolHit.length) spec.yol = yolHit[0];
  if (bitkiHit.length) spec.bitki = bitkiHit[0];
  if (figHit.length) spec.fig = { mod: figHit[0] };
  if (cerceveHit.length) spec.cerceve = cerceveHit[0];

  // Eksik alanları erdem havuzundan (varsa) ya da jenerik havuzdan doldur —
  // ASLA metinden bulunanın üzerine yazma, yalnız BOŞLUKLARI kapat.
  const pool = (input.virtue && VIRTUE_POOLS[input.virtue]) || GENERIC_POOL;
  const pick = pool[Math.floor(rnd() * pool.length)] || pool[0];
  for (const k of ['cerceve', 'gok', 'uzak', 'orta', 'nesne', 'yol', 'bitki']) {
    if (spec[k] == null && pick[k] != null) spec[k] = pick[k];
  }
  if (!spec.fig && pick.fig) spec.fig = pick.fig;

  // Figür konumunda hafif tohumlu sapma — aynı motif seçilse de kart-kart ayrışır.
  const jx = 48 + rnd() * 16, jy = 92 + rnd() * 16, js = 0.6 + rnd() * 0.14;
  spec.fig = Object.assign({ x: jx, y: jy, s: js }, spec.fig || {});
  spec.yildiz = 5 + Math.floor(rnd() * 5);

  return ikvNormSpec(spec);
}

/* ════════════════════════════════════════════════════════════════════
   kumComposeFromText — LLM bestecisi; kumHeuristicSpec'i taban alır,
   yalnız geçerli (IKV_MOTIF_KEYS içindeki) alanları üstüne yazar.
   Asla reddetmez/atmaz — hata/zaman aşımında sezgisel taban döner.
═══════════════════════════════════════════════════════════════════════ */
function _validated(obj, base) {
  if (!obj || typeof obj !== 'object') return base;
  const K = IKV_MOTIF_KEYS;
  const out = { ...base };
  if (K.cerceve.includes(obj.cerceve)) out.cerceve = obj.cerceve;
  if (K.gok.includes(obj.gok)) out.gok = obj.gok;
  if (Array.isArray(obj.uzak)) { const v = obj.uzak.filter(x => K.uzak.includes(x)).slice(0, 2); if (v.length) out.uzak = v; }
  if (Array.isArray(obj.orta)) { const v = obj.orta.filter(x => K.orta.includes(x)).slice(0, 2); if (v.length) out.orta = v; }
  if (Array.isArray(obj.nesne)) { const v = obj.nesne.filter(x => K.nesne.includes(x)).slice(0, 2).map(m => ({ m })); if (v.length) out.nesne = v; }
  if (K.yol.includes(obj.yol)) out.yol = obj.yol;
  if (K.bitki.includes(obj.bitki)) out.bitki = obj.bitki;
  if (obj.fig && K.figMod.includes(obj.fig.mod)) out.fig = { ...base.fig, mod: obj.fig.mod };
  if (Number.isFinite(obj.yildiz)) out.yildiz = obj.yildiz;
  return ikvNormSpec(out);
}

function _kumPrompt(texts, base) {
  const K = IKV_MOTIF_KEYS;
  return [
    'KART METNİ:', String((texts || []).join(' • ')).slice(0, 700), '',
    'İZİN VERİLEN ANAHTARLAR (sadece bunlardan seç):',
    `cerceve: ${K.cerceve.join(', ')}`,
    `gok: ${K.gok.join(', ')}`,
    `uzak (en fazla 2): ${K.uzak.join(', ')}`,
    `orta (en fazla 2): ${K.orta.join(', ')}`,
    `nesne (en fazla 2): ${K.nesne.join(', ')}`,
    `yol: ${K.yol.join(', ')}`,
    `bitki: ${K.bitki.join(', ')}`,
    `fig.mod: ${K.figMod.join(', ')}`,
    '',
    p('prompt.kum.compose_task'),
  ].join('\n');
}

export async function kumComposeFromText(input = {}) {
  const base = kumHeuristicSpec(input);
  try {
    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: _kumPrompt(input.texts, base) }] }],
      systemPrompt: p('prompt.kum.design_system'),
      maxTokens: 260, temperature: 0.5, jsonMode: true,
      model: SUMMARY_MODEL, skipPersona: true,
    });
    return _validated(JSON.parse(raw), base);
  } catch (e) {
    console.warn('kumComposeFromText:', e?.message);
    return base;
  }
}

/* ════════════════════════════════════════════════════════════════════
   kumEnsureSpec — SENKRON ana giriş noktası (render'ı bloklamaz).
   entity: sahne alanını taşıyacak nesne (kartın kendisi/pole).
   opts: {
     field   : entity üzerindeki sahne alanının adı (vars. 'sahne'),
     texts   : besteci girdisi metin dizisi,
     virtue  : sezgisel havuz anahtarı (ops.),
     seed    : deterministik tohum (vars. entity.id),
     refine  : LLM ile arka planda iyileştir (vars. true),
     persist : (spec) => void — her güncellemede çağrılır (KV/DB yazımı),
     onRefined: (spec) => void — LLM sonucu geldiğinde (yeniden render için),
   }
   Dönüş: sahne reçetesi (spec) — SENKRON, asla undefined değil.
═══════════════════════════════════════════════════════════════════════ */
const _kumRefining = new Set();

export function kumEnsureSpec(entity, opts = {}) {
  const field = opts.field || 'sahne';
  if (entity && entity[field]) return entity[field];

  const seed = opts.seed || entity?.id || 'kum-' + Math.random().toString(36).slice(2);
  const spec = kumHeuristicSpec({ seed, virtue: opts.virtue, texts: opts.texts || [] });
  if (entity) entity[field] = spec;
  try { opts.persist?.(spec); } catch (_) {}

  if (opts.refine !== false && !_kumRefining.has(seed)) {
    _kumRefining.add(seed);
    kumComposeFromText({ seed, virtue: opts.virtue, texts: opts.texts || [] })
      .then(refined => {
        _kumRefining.delete(seed);
        if (!refined) return;
        if (entity) entity[field] = refined;
        try { opts.persist?.(refined); } catch (_) {}
        try { opts.onRefined?.(refined); } catch (_) {}
      })
      .catch(() => { _kumRefining.delete(seed); });
  }
  return spec;
}

/* TDZ-güvenli erişim için window'a aç (modüller-arası konvansiyon) */
try {
  window.kumHeuristicSpec = kumHeuristicSpec;
  window.kumComposeFromText = kumComposeFromText;
  window.kumEnsureSpec = kumEnsureSpec;
} catch (_) {}
