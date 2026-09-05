// @vitest-environment node
// Yalnız dosya adı ve dosya içeriği okur — DOM'a hiç dokunmaz, jsdom bedeli ödenmez.

/**
 * KAPI KAPSAMI KAPISI — "repo-geneli bir kapı, faz kapısının dışında kalamaz".
 *
 * §3.3 iki kez ölçtü ve iki kez aynı sınıf kırık doğdu: repo-geneli kapılar
 * hiçbir modül önekiyle bulunmaz. Çözüm `npm run kapi:genel` oldu ve deseni
 * kasten LİSTE değil DESEN yapıldı — "liste bayatlar". Ama desen de bir ada
 * bağlıdır: adı `kapisi` ile bitmeyen bir repo-geneli kapı, desenin de
 * dışında kalır ve kimse fark etmez.
 *
 * 2026-09-05'te tam bu oldu. `tests/referans-butunlugu.test.js` bütün ağacı
 * tarıyordu ama adı desene girmiyordu; faz kapısı yeşil bastı, CI kırmızı
 * kapandı (Kapı #102). Aynı gün ikinci bir örnek bulundu:
 * `tests/i18n-parity.test.js` — TASINABILIR-ZEMIN.md'nin denetçi listesinde
 * yazılı dokuz kapıdan biri, yine desenin dışında. İkisi de yeniden
 * adlandırıldı; bu dosya o düzeltmenin TEKRARLANMAMASINI sağlar.
 *
 * §6.6'nın üç basamağı burada tamamlanır: kural yok değildi, yanlış yerde de
 * durmuyordu — ÖLÇÜLEMİYORDU. Ölçülemeyen kural her sprintte yeniden
 * keşfedilir. Ölçülebilir hâle getiren şey kuralın kendisi değil, kodun
 * BİÇİMİ: "bir denetçi script'i koşturan test" grep'lenebilir bir cümledir.
 *
 * ÖLÇÜT (dar ve kasıtlı): bir test hem `spawnSync`/`execFileSync` çağırıyor
 * hem de gövdesinde `scripts/<ad>.mjs` geçiyorsa, repo-geneli bir denetçiyi
 * koşturuyordur — yani bütün ağacın kapısıdır ve `kapi:genel` desenine
 * girmelidir. Ağacı kendi içinde yürüyen kapılar (emsal:
 * referans-butunlugu-kapisi) bu ölçütle YAKALANMAZ; onlar belgeye yazılı
 * yargı maddesidir (PROTOKOL-FABLE.md §3.3). Dar bir ölçüt, geniş ve yanlış
 * bir ölçütten iyidir: ikincisi modül testlerini kapı sanıp gürültü üretir.
 *
 * Desen SABİT YAZILMAZ, `package.json`'dan okunur — kapının ölçtüğü şey
 * gerçekten koşulan komut olsun diye. Betik değişirse kapı onu takip eder;
 * ikinci bir gerçek kaynak doğmaz (§1.3).
 *
 * İkinci describe bloğu kapının KENDİSİNİ sınar (§10.5: ölçen alet de
 * ölçülür): desen dışında kalan bir denetçi-koşturan dosya uydurulur ve
 * yakalandığı kanıtlanır; adı desene giren aynı dosya ise geçmelidir.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/* ─── 1. DESEN — tek gerçek kaynak package.json ─── */

/** `vitest run kapisi kapi-workflow` → /kapisi|kapi-workflow/ */
export function kapiDeseni(betik) {
  // \s* (\s+ değil): "vitest run" desensiz de gelebilir — o hâlde null dönmeli.
  // Hiç eşleşme yoksa girdi bir vitest komutu değildir; yine null.
  const m = String(betik || '').match(/vitest\s+run\s*(.*)$/);
  if (!m) return null;
  const sonra = m[1];
  const parcalar = sonra.split(/\s+/).filter((p) => p && !p.startsWith('-'));
  if (!parcalar.length) return null;
  return new RegExp(parcalar.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
}

/* ─── 2. ÖLÇÜT — denetçi koşturan test ─── */

/** Hem süreç açıyor hem de bir `scripts/*.mjs` adı taşıyor mu? */
export function denetciKosturuyor(kaynak) {
  return /\b(spawnSync|execFileSync)\b/.test(kaynak) && /scripts\/[A-Za-z0-9._-]+\.mjs/.test(kaynak);
}

/** Bir tests/ dizinini tarar, desen dışında kalan denetçi-koşturanları döner. */
export function desenDisiKapilar(dizin, desen) {
  const disarida = [];
  let girdiler;
  try { girdiler = readdirSync(dizin); } catch (_) { return disarida; }
  for (const ad of girdiler) {
    if (!ad.endsWith('.test.js')) continue;
    let kaynak;
    try { kaynak = readFileSync(join(dizin, ad), 'utf8'); } catch (_) { continue; }
    if (!denetciKosturuyor(kaynak)) continue;
    if (desen.test(ad)) continue;
    disarida.push(ad);
  }
  return disarida;
}

/* ─── 3. KAPI ─── */

describe('kapı kapsamı — repo-geneli kapı faz kapısının dışında kalmıyor', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

  it('package.json bir kapi:genel betiği taşıyor ve deseni çözülebiliyor', () => {
    const betik = pkg.scripts && pkg.scripts['kapi:genel'];
    expect(betik, 'kapi:genel betiği yok — faz kapısının ikinci adımı kayıp').toBeTruthy();
    expect(kapiDeseni(betik), `desen çözülemedi: ${betik}`).toBeInstanceOf(RegExp);
  });

  it('denetçi koşturan her test kapi:genel desenine giriyor', () => {
    const desen = kapiDeseni(pkg.scripts['kapi:genel']);
    const disarida = desenDisiKapilar(join(ROOT, 'tests'), desen);
    if (disarida.length) {
      throw new Error(
        `${disarida.length} repo-geneli kapı kapi:genel deseninin DIŞINDA:\n` +
        disarida.map((a) => `  tests/${a}`).join('\n') +
        `\n\nDesen: ${desen}\n` +
        'Bu kapılar faz kapısında koşmaz; kırıkları ancak CI\'da doğar (Kapı #102).\n' +
        'Çözüm: dosyayı `*-kapisi.test.js` olarak yeniden adlandır (ad senkronu §4.3 — ' +
        'eski ad repoda kalmaz). Deseni genişletmek YANLIŞ yoldur: desen liste olur, liste bayatlar.'
      );
    }
    expect(disarida).toEqual([]);
  });
});

/* ─── 4. KAPININ KENDİSİ (§10.5) ─── */

describe('kapı kapsamı — kapının kendisi çalışıyor', () => {
  const DESEN = /kapisi|kapi-workflow/;
  // Gövde parça parça kurulur: bu dosya da tests/ taramasına dahildir ve
  // bitişik yazılmış bir örnek, ana kapıyı kendi kendini ihlal ettirirdi.
  const GOVDE = "import { spawnSync } from 'node:child_process';\n" +
                "spawnSync('node', ['" + 'scripts/zz-sinav-denetci' + ".mjs']);\n";

  it('desen dışında kalan denetçi-koşturan bir testi yakalar', () => {
    const dizin = mkdtempSync(join(tmpdir(), 'kapi-kapsami-'));
    try {
      writeFileSync(join(dizin, 'zz-sinav-tarama.test.js'), GOVDE);
      expect(desenDisiKapilar(dizin, DESEN)).toEqual(['zz-sinav-tarama.test.js']);
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });

  it('aynı dosya desene giren bir adla geçer', () => {
    const dizin = mkdtempSync(join(tmpdir(), 'kapi-kapsami-'));
    try {
      writeFileSync(join(dizin, 'zz-sinav-kapisi.test.js'), GOVDE);
      expect(desenDisiKapilar(dizin, DESEN)).toEqual([]);
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });

  it('denetçi koşturmayan bir modül testini kapı SAYMAZ', () => {
    const dizin = mkdtempSync(join(tmpdir(), 'kapi-kapsami-'));
    try {
      // readdirSync var ama süreç açmıyor: kendi modülünü okuyan sıradan test.
      writeFileSync(join(dizin, 'zz-sinav-modul.test.js'),
        "import { readdirSync } from 'node:fs';\nreaddirSync('js/parts');\n");
      expect(desenDisiKapilar(dizin, DESEN)).toEqual([]);
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });

  it('deseni package.json biçiminden çözer', () => {
    const d = kapiDeseni('vitest run kapisi kapi-workflow');
    expect(d.test('xss-kapisi.test.js')).toBe(true);
    expect(d.test('kapi-workflow.test.js')).toBe(true);
    expect(d.test('referans-butunlugu.test.js')).toBe(false);
    expect(kapiDeseni('vitest run')).toBe(null);
  });
});
