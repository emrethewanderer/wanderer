// @vitest-environment node
// Dosya sistemiyle çalışır, DOM'a hiç dokunmaz — jsdom kurulumunu boşa ödemez.

/**
 * ARAÇ KÜMESİ KAPISI — "iki liste elle senkronlanıyor" sınıfının bekçisi.
 *
 * NEDEN BU KAPI VAR. Araç adları repoda İKİ yerde yaşar ve birbirini
 * göremez:
 *   1. `js/parts/13a-arac-motoru.js` · `_ARAC_DEFS` — chip'i çizen registry.
 *   2. `js/parts/00f-kullanim-nabzi.js` · `_ARAC_ARAC` — Araç Nabzı'nın
 *      GİZLİLİK sözleşmesi gereği kapalı tuttuğu ad kümesi.
 * `00f` `13a`'yı import EDEMEZ: 00f altyapı katmanıdır, 13a ise
 * 06-summary-chat / 07-settings-knowledge / 13-extras çeker — bağ bir döngü
 * açardı. Yani senkron mimari olarak sağlanamaz, yalnız ÖLÇÜLEBİLİR.
 *
 * BEDELİ ÖLÇÜLDÜ (2026-09-05, FAZ 10 · çapraz denetim · Sonnet): faz üç yeni
 * araç ekledi (`gordun`/`sabir`/`ayna`), registry büyüdü, kapalı küme
 * büyümedi. `wtLogArac` üçü için de çağrılıyordu ve satır YAZILIYORDU — ama
 * `prev_screen: _ARAC_ARAC.has(arac) ? arac : null` üçünü de `null`'a
 * düşürüyordu. Üç aracın öneri/onay/ret sayıları tek bir isimsiz kovada
 * toplandı: **ölçüyormuş gibi görünen, ölçmeyen kod** (§6.10).
 *
 * NEDEN HEDEFLİ SÜİT GÖREMEDİ. Faz `js/parts/13a*` değiştirdi, hedefli süit
 * `tests/13a*` koştu ve yeşil bastı; `13a`'nın kendi testleri `wtLogArac`'ı
 * MOCK'luyor — yani "doğru argümanla çağrıldı" kanıtlanıyor, o argümanla ne
 * yapıldığı kanıtlanmıyor. Kırık iki dosyanın ARASINDA yaşıyordu ve hiçbir
 * önek oraya işaret etmiyor. Bu yüzden kapı `*-kapisi` adını taşır ve
 * `npm run kapi:genel` desenine kendiliğinden girer (§3.3'ün XSS dersi).
 *
 * ÖLÇTÜĞÜ ŞEY: chip üreten her registry kaydının adı kapalı kümede VARDIR,
 * ve kapalı kümede chip üretmeyen bir ad YOKTUR. İddia yapısaldır (iki
 * listenin eşitliği), bu yüzden kaynak taraması meşrudur.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const oku = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** `_ARAC_DEFS` içinde `run:` taşıyan üst düzey anahtarlar — yani CHIP
 *  üreten araçlar. `kart`/`nisan` (13a1'den yayılan etiket kayıtları) `run`
 *  taşımaz ve chip'e dönüşmez (K5), bu yüzden nabzın kümesine de girmezler. */
export function registryAraclari(src) {
  const govde = src.slice(src.indexOf('const _ARAC_DEFS'));
  const son = govde.indexOf('\n};');
  const blok = son > 0 ? govde.slice(0, son) : govde;
  const adlar = [];
  // İki boşluk girintili `ad: {` — kaydın kendi açılışı; içeride kalan
  // `label:`/`hazir:` gibi alanlar dört boşlukludur ve eşleşmez.
  const re = /^ {2}(\w+):\s*\{/gm;
  let m;
  while ((m = re.exec(blok))) {
    const bas = m.index;
    const bit = blok.indexOf('\n  },', bas);
    const kayit = blok.slice(bas, bit > 0 ? bit : blok.length);
    if (/\brun:/.test(kayit)) adlar.push(m[1]);
  }
  return adlar;
}

/** `_ARAC_ARAC = new Set([...])` içindeki adlar. */
export function nabizAraclari(src) {
  const m = src.match(/_ARAC_ARAC\s*=\s*new Set\(\[([^\]]*)\]\)/);
  if (!m) return [];
  return [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
}

describe('araç kümesi — registry ile Araç Nabzı aynı adları taşır', () => {
  const registry = registryAraclari(oku('js/parts/13a-arac-motoru.js'));
  const nabiz = nabizAraclari(oku('js/parts/00f-kullanim-nabzi.js'));

  it('tarama gerçekten bir şey buldu — boş liste bir sonuç değildir', () => {
    // [[kapi-sessiz-gec]]: ayrıştırıcı kırılırsa iki boş liste EŞİT olur ve
    // kapı sessizce yeşil yanar. Alt sınır bilinçli: bugün yedi araç var.
    expect(registry.length).toBeGreaterThanOrEqual(7);
    expect(nabiz.length).toBeGreaterThanOrEqual(7);
  });

  it('chip üreten her araç kapalı kümede — yoksa telemetrisi null olur', () => {
    const eksik = registry.filter(a => !nabiz.includes(a));
    expect(eksik, `00f _ARAC_ARAC'a eklenmemiş araç(lar): ${eksik.join(', ')}`)
      .toEqual([]);
  });

  it('kapalı kümede chip üretmeyen ad yok — ölü ad ölçüyü kirletir', () => {
    const fazla = nabiz.filter(a => !registry.includes(a));
    expect(fazla, `13a'da karşılığı olmayan ad(lar): ${fazla.join(', ')}`)
      .toEqual([]);
  });

  it('etiket kayıtları (kart/nisan) kümeye GİRMEZ — chip üretmezler (K5)', () => {
    expect(registry).not.toContain('kart');
    expect(registry).not.toContain('nisan');
  });

  it('kapının kendisi çalışıyor — ihlali gerçekten yakalar (§10.5)', () => {
    const sahteRegistry = `const _ARAC_DEFS = {
  soz: {
    marker: 'ARAC',
    run:   _ac('glGiveSozNow')
  },
  yeni: {
    marker: 'ARAC',
    run:   _ac('yeniAc')
  },
};`;
    const sahteNabiz = "const _ARAC_ARAC = new Set(['soz']);";
    const r = registryAraclari(sahteRegistry);
    const n = nabizAraclari(sahteNabiz);
    expect(r).toEqual(['soz', 'yeni']);          // ayrıştırıcı iki kaydı da gördü
    expect(r.filter(a => !n.includes(a))).toEqual(['yeni']);  // ihlal görünür
  });
});
