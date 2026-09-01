/* ═══════════════════════════════════════════════════════
   00h — BOOT NABZI · Perde inerken zincir bitmiş mi?
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Uygulama bir yer'dir; kapısını açan kişi eşikte ne kadar
     beklediğini bilmez, yalnız hisseder. O hissi yıllarca
     tahminle konuştuk: "boot yavaş" dendi, sayı üretilmedi;
     bir kez üretildi ve tek turluk olduğu için yanılttı.
     GERÇEKLİK KURALI'nın boot'a düşen payı budur — kanıtı
     olmayan değer yoktur, "yavaş" da bir değerdir. Bu kadran
     ölçümü kalıcı kılar: bir daha kimse boot hakkında
     hatırladığıyla konuşmaz, defterle konuşur.
   MEKANİK / MİMARİ / TEK GİRİŞ:
     Zincirin eklemlerine `bnMark(ad)` konur; süre isteyen
     adım `bnSar(ad, fn)` ile sarmalanır (senkron da promise
     de aynı kapıdan geçer). Her ikisi `performance.mark/
     measure` yazar — aynı veri hem `bnRapor()` tablosunda
     hem DevTools Performance şeridinde görünür, ikinci bir
     görselleştirme yazılmaz. Ölçüm ASLA bloklamaz: API yoksa
     her çağrı sessizce düşer ve fn yine çalışır.
   Kalıcılık: Kalıcılık YOK — profil `performance` buffer'ında
              yaşar, sayfa ömürlüdür. Ağ yok, şema yok.
   Konvansiyon: window.bn* expose; import'suz SAF YAPRAK
                (main.js'in ilk satırından çağrılabilsin diye
                `S`/00a dahil hiçbir şey import edilmez — 00a'ya
                bağlanmak dairesel import riskidir)
═══════════════════════════════════════════════════════ */

/* ─── 1. TEMEL ─── */

const ONEK = 'bn:';

// Özellik tespiti bir kez: eski WebView'de `performance.mark` yoktur ve
// ölçüm yüzünden boot'un kırılması, ölçümün kendisinden pahalıdır.
const _destekli = typeof performance !== 'undefined'
  && typeof performance.now === 'function'
  && typeof performance.mark === 'function';

// Sıralı defter: rapor bunu okur. `performance.getEntriesByName` de okunabilirdi
// ama mark'ların ÇAĞRILMA sırası bizim için anlamlıdır (zincir bir sıradır),
// timeline sırası ise startTime'a göredir — çakışan iki mark'ta ikisi ayrışır.
const _defter = [];

/**
 * Zincire bir çentik atar ve o anın ms'ini döndürür.
 * İdempotent DEĞİLDİR ve olmamalıdır: aynı ad iki kez düşerse defterde iki
 * satır belirir — çifte init'i gizlemek değil GÖSTERMEK istiyoruz.
 */
export function bnMark(ad) {
  if (!_destekli || !ad) return 0;
  let ms = 0;
  try {
    const e = performance.mark(ONEK + ad);
    // Eski sürümler `mark()`'tan undefined döner; o zaman saati elle okuruz.
    ms = (e && typeof e.startTime === 'number') ? e.startTime : performance.now();
  } catch (_) {
    try { ms = performance.now(); } catch (_) { return 0; }
  }
  _defter.push({ ad, ms });
  return ms;
}

/** İki mark arasını DevTools şeridine de yazar (rapor zaten farkı hesaplar). */
function _olc(ad, baslangicMs) {
  if (!_destekli) return;
  try {
    performance.measure(ONEK + ad, { start: baslangicMs, end: performance.now() });
  } catch (_) {
    // measure'ın obje imzası olmayan sürümlerde sessiz düş — mark'lar yeterli.
  }
}

/**
 * Süre isteyen adımın tek kapısı. Senkron fonksiyon da promise dönen de aynı
 * yerden geçer; hata yolunda bile bitiş çentiği atılır (yoksa patlayan adım
 * defterde "hiç bitmemiş" görünür ve zincir yanlış okunur).
 *
 * Kullanım:  await bnSar('storage', () => storageInit(sb, uid));
 */
export function bnSar(ad, fn) {
  if (typeof fn !== 'function') return undefined;
  if (!_destekli) return fn();

  const t0 = bnMark(ad + '-bas');
  const bitir = () => { bnMark(ad + '-son'); _olc(ad, t0); };

  let sonuc;
  try {
    sonuc = fn();
  } catch (e) {
    bitir();
    throw e;
  }
  if (sonuc && typeof sonuc.then === 'function') {
    return sonuc.then(
      (v) => { bitir(); return v; },
      (e) => { bitir(); throw e; }
    );
  }
  bitir();
  return sonuc;
}

/* ─── 2. ZİNCİRİN UCU ─── */

let _hazirMs = 0;

/**
 * Uygulamanın gerçekten kurulduğu an. Sıralı motor zincirinin ucundan
 * çağrılır. İlk çağrı asıldır — sonraki çağrılar (yeniden auth, hesap
 * değişimi) ilk boot'un sayısını EZMEZ.
 */
export function bnHazir() {
  if (_hazirMs) return _hazirMs;
  _hazirMs = bnMark('hazir');
  return _hazirMs;
}

/* ─── 3. RAPOR ─── */

const _yuvarla = (x) => Math.round(x * 10) / 10;

/**
 * Konsola tabloyu basar, ham satırları döndürür (harness/preview makine-okunur
 * alsın diye). Boot sırasında ÇAĞRILMAZ — `console.table` ölçtüğü şeyi bozar.
 */
export function bnRapor() {
  if (!_destekli) { console.warn('Boot Nabzı: performance.mark yok — ölçüm kapalı.'); return []; }

  const satirlar = [];
  let onceki = 0;
  for (const k of _defter) {
    satirlar.push({ adim: k.ad, ms: _yuvarla(k.ms), fark: _yuvarla(k.ms - onceki) });
    onceki = k.ms;
  }

  // Perde ile zincirin karşılaştırması bu kadranın var oluş sebebidir:
  // perde inerken zincir bitmemişse kullanıcı yarı kurulmuş bir ekrana çıkar.
  const bul = (ad) => _defter.find((k) => k.ad === ad)?.ms ?? null;
  const perdeIn = bul('perde-in');
  const hazir = _hazirMs || bul('hazir');
  let hukum = 'ölçüm eksik';
  if (perdeIn != null && hazir != null) {
    hukum = (hazir <= perdeIn)
      ? `zincir perdeden ${_yuvarla(perdeIn - hazir)} ms ÖNCE bitti`
      : `perde indikten ${_yuvarla(hazir - perdeIn)} ms SONRA bitti`;
  }

  try {
    console.groupCollapsed('Boot Nabzı — perde ve zincir');
    console.table(satirlar);
    console.info('Hüküm:', hukum);
    console.groupEnd();
  } catch (_) {}

  return satirlar;
}

/** Ham defter — harness ölçümü tabloyu değil sayıyı ister. */
export function bnDefter() {
  const bul = (ad) => _defter.find((k) => k.ad === ad)?.ms ?? null;
  return {
    satirlar: _defter.map((k) => ({ ad: k.ad, ms: _yuvarla(k.ms) })),
    hazir: _hazirMs ? _yuvarla(_hazirMs) : null,
    perdeIn: bul('perde-in') != null ? _yuvarla(bul('perde-in')) : null,
    perdeAc: bul('perde-ac') != null ? _yuvarla(bul('perde-ac')) : null
  };
}

/* ─── 4. ZİNCİRİN BAŞI ─── */

// Bu satır modül yüklenirken çalışır ve bundle exec'inin gerçek başlangıcıdır.
// main.js'in gövdesinden çentiklenemez: `import` ifadeleri hoisted olduğu için
// oraya yazılan bir çentik 120 modül çalıştıktan SONRA düşerdi.
bnMark('exec-bas');

/* ─── 5. EXPOSE ─── */

if (typeof window !== 'undefined') {
  window.bnMark = bnMark;
  window.bnSar = bnSar;
  window.bnHazir = bnHazir;
  window.bnRapor = bnRapor;
  window.bnDefter = bnDefter;
}
