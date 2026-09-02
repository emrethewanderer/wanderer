/**
 * KAPI — İKİ DEFTER AYRIŞMAZ (13D K13 · 00f wtLogDuygu).
 *
 * Duygu Motoru'nun yanılması İKİ yere yazılır ve ikisinin işi farklıdır:
 *   · `dgYanilmaKonustu/Duzeltildi` → kullanıcının KENDİ İklim'i; kapının
 *     beşinci kadranı (kendini kapatma) bunu okur — gerçek kapanma kararı.
 *   · `wtLogDuygu(..., { yuzey, duzeltildi })` → `usage_events`; Gözlemevi'nin
 *     Yanılma Nabzı bunu sayar — Emre'nin gördüğü kadran.
 *
 * Biri basılıp öteki basılmayınca ölçüm kendi kendisiyle çelişir. Gerçek
 * vaka (inceleme turu, 2026-08-30): FAZ 16-19 beş teslim noktasında yalnız
 * İklim defterini bastı; `davet` yüzeyi admin kadranında **`0 · 1✕`**
 * görünüyordu — sıfır konuşma, bir düzeltme. Ölçülmemiş bir paydanın
 * üstünde duran bir pay, ölçüm değildir (§6.10).
 *
 * Bu kapı, ikisinin YÜZEY KÜMESİNİ karşılaştırır. Repo genelinde bakar,
 * dosya dosya değil: sohbetin damgası 01'de, telemetrisi 06'dadır — ayrışma
 * meşrudur, EKSİKLİK değil (§6.6: kapısı olmayan kural tavsiyeye döner).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DG_KAPI_YUZEYLER } from '../js/parts/13D-duygu-motoru.js';

const DIZIN = join(process.cwd(), 'js', 'parts');
const DOSYALAR = readdirSync(DIZIN).filter(f => f.endsWith('.js') && f !== '13D-duygu-motoru.js');
// Liste alındıktan SONRA bir dosya silinmiş olabilir (paralel koşu, editör) —
// bu okuma modül üst seviyesinde: korunmazsa dosyanın TÜM testleri collect
// aşamasında ölür (bkz. [[kapi-tarama-yarisi]]).
const KAYNAK = DOSYALAR.map(f => {
  try { return readFileSync(join(DIZIN, f), 'utf8'); } catch (e) { if (e && e.code === 'ENOENT') return ''; throw e; }
}).join('\n/*__DOSYA__*/\n');

const topla = (re, src = KAYNAK) => {
  const set = new Set();
  let m;
  while ((m = re.exec(src)) !== null) set.add(m[1]);
  return set;
};

/** `wtLogDuygu(..., { yuzey: 'X', ... duzeltildi: <bool> })` — araya yorum
 *  girebildiği için pencere geniş tutulur, ama `wtLogDuygu` çağrısına
 *  bağlıdır: başka bir bağlamdaki `yuzey:` alanını saymamak için. */
const telemetriYuzeyleri = (duzeltildiDegeri) => {
  const set = new Set();
  const cagri = /wtLogDuygu\??\.?\(([\s\S]{0,800}?)\n\s*\}\s*\)|wtLogDuygu\??\.?\(([^;]{0,400}?)\)\s*;/g;
  let c;
  while ((c = cagri.exec(KAYNAK)) !== null) {
    const govde = c[1] || c[2] || '';
    const y = /yuzey:\s*'([a-z]+)'/.exec(govde);
    const d = /duzeltildi:\s*(true|false)/.exec(govde);
    if (y && d && d[1] === String(duzeltildiDegeri)) set.add(y[1]);
  }
  return set;
};

describe('iki defter — İklim damgası olan her yüzeyin telemetrisi de var', () => {
  it('`dgYanilmaKonustu` basılan her yüzey `wtLogDuygu(duzeltildi:false)` da basar', () => {
    const damga = topla(/dgYanilmaKonustu\??\.?\(\s*[^,]+,\s*'([a-z]+)'/g);
    const telemetri = telemetriYuzeyleri(false);
    expect(damga.size).toBeGreaterThan(0);           // kapı boşa dönmesin
    const eksik = [...damga].filter(y => !telemetri.has(y));
    expect(eksik).toEqual([]);
  });

  it('`dgYanilmaDuzeltildi` basılan her yüzeyin `duzeltildi:true` satırı var', () => {
    const damga = topla(/dgYanilmaDuzeltildi\??\.?\(\s*[^,]+,\s*'([a-z]+)'/g);
    const telemetri = telemetriYuzeyleri(true);
    expect(damga.size).toBeGreaterThan(0);
    const eksik = [...damga].filter(y => !telemetri.has(y));
    expect(eksik).toEqual([]);
  });

  it('kullanılan her yüzey adı kapının kapalı kümesinde (DG_KAPI_YUZEYLER)', () => {
    const tum = new Set([
      ...topla(/dgYanilmaKonustu\??\.?\(\s*[^,]+,\s*'([a-z]+)'/g),
      ...topla(/dgYanilmaDuzeltildi\??\.?\(\s*[^,]+,\s*'([a-z]+)'/g),
      ...telemetriYuzeyleri(true), ...telemetriYuzeyleri(false),
    ]);
    const kacak = [...tum].filter(y => !DG_KAPI_YUZEYLER.includes(y));
    expect(kacak).toEqual([]);
  });

  /* Gözlemevi ham ASCII anahtarı göstermesin: `_DG_YUZEY_AD` haritası
     kapının kümesiyle birlikte büyür. `davet` FAZ 19'da doğduğunda bu
     satır unutulmuştu ve panel "davet" yazıyordu. */
  it('Gözlemevi her yüzey için okunabilir bir ad taşır', () => {
    const gz = readFileSync(join(DIZIN, '13q-gozlemevi.js'), 'utf8');
    const blok = /_DG_YUZEY_AD = \{([\s\S]*?)\};/.exec(gz);
    expect(blok).toBeTruthy();
    const adli = [...blok[1].matchAll(/([a-z]+):\s*'/g)].map(m => m[1]);
    const eksik = DG_KAPI_YUZEYLER.filter(y => !adli.includes(y));
    expect(eksik).toEqual([]);
  });

  it('kapının her yüzeyi 00f beyaz listesinde de var — kanal sessizce null\'a düşmesin', () => {
    const nabiz = readFileSync(join(DIZIN, '00f-kullanim-nabzi.js'), 'utf8');
    const satir = /_DG_YUZEY = new Set\(\[([^\]]+)\]\)/.exec(nabiz);
    expect(satir).toBeTruthy();
    const beyazListe = [...satir[1].matchAll(/'([a-z]+)'/g)].map(m => m[1]);
    expect([...DG_KAPI_YUZEYLER].sort()).toEqual([...beyazListe].sort());
  });
});
