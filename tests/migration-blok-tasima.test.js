// @vitest-environment node
// Dosya sistemiyle çalışır, DOM'a hiç dokunmaz — jsdom kurulumunu boşa ödemez.

/**
 * MİGRASYON BLOK TAŞIMA KAPISI — "bir blok düşerse o kart Gözlemevi'nden
 * kaybolur" kuralının bekçisi.
 *
 * `migrations/README.md` bunu bir aydır SÖYLÜYOR (§SIRA ÖNEMLİDİR) ama
 * hiçbir kapı SINAMIYORDU — kural kağıtta vardı, ölçüde yoktu (§6.6:
 * "kapısı olmayan kural, zamanla tavsiyeye döner"). İç Çalışma 08 rev.2'nin
 * `## Riskler` 1'i tam bunu adlandırır: "051, 050'nin on bloğunu eksiksiz
 * taşımazsa çalışan kartlar düşer." Bu dosya o riski bir vitest koşusuna
 * bağlar.
 *
 * NE SINANIR: `admin_usage_report`'a dokunan her migration dosyası,
 * numaraya göre sıralandığında, kendinden BİR ÖNCEKİ dosyanın TÜM
 * üst-düzey `jsonb_build_object(...)` anahtarlarını (blok adlarını) içerir.
 * Zincir boyunca bu doğruysa (her Fi ⊇ F(i-1)), en yüksek numaralı dosya
 * geçmişteki HER dosyanın bloklarını devralmış olur — README'nin "en
 * güncel tanım daima en yüksek numaradadır" cümlesinin kanıtı budur.
 *
 * NASIL ÇIKARILIR: üst-düzey blok adları, fonksiyon gövdesindeki TEK bir
 * `SELECT jsonb_build_object(...) INTO v_out` çağrısının doğrudan
 * argümanlarıdır. Basit bir `/'([a-z_]+)',\s*\(/` deseni de iş görür ama
 * NESTED alt sorgulardaki anahtarları da (`'nadirlikler'`, `'yollar'`,
 * `'users'` içindeki `'user_id'` gibi) yakalar — yanlış pozitif üretir.
 * Bu yüzden burada gerçek bir parantez-derinliği sayacı kullanılır:
 *   1. `jsonb_build_object(` çağrılarının hepsi taranır, kapanış parantezi
 *      eşlenir; kapanışın hemen ardından `INTO v_out` gelen çağrı ARANAN
 *      DIŞ çağrıdır (nested çağrılar `FROM ...` ya da `,` ile devam eder).
 *   2. O çağrının içeriği, yalnız DERİNLİK-0 virgüllerden bölünür — bir alt
 *      sorgunun (`(SELECT ...)`) İÇİNDEKİ virgüller derinliği artırıp
 *      azaltır, bölme noktası SAYILMAZ.
 *   3. Her ikinci argüman (0, 2, 4, …) bir anahtar STRING LİTERALİ olmalı;
 *      değilse o argüman atlanır (savunmacı — beklenmeyen bir kalıp testi
 *      sessizce yanlış geçirmez, adlar eksik kalır ve zincir testi kırar).
 * Derinlik sayımı `--` satır yorumlarını (yorum metni parantez/virgül
 * İÇEREBİLİR, örn. "wtLogMode()") ve tek tırnaklı string literalleri (`''`
 * kaçışıyla — Türkçe iyelik eki "049'un" bir string açılışı SANILMAZ)
 * atlayarak yapılır. Bu repo SQL'inde string literaller içinde parantez/
 * virgül YOKTUR (doğrulandı: `grep -nE "'[^']*[(),][^']*'"` — tek eşleşen
 * yerler hep tırnak DIŞINDAki parantezlerdi) — aksi hâlde bu basitleştirme
 * yanlış derinlik sayardı.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MIGRATIONS_DIR = join(ROOT, 'migrations');

/* ─── 1. PARÇALAYICI — SQL'e özel, ama SQL'i ANLAMAZ; yalnız parantez/virgül
   derinliği sayar, yorum ve string literali atlar. ─── */

/** Bir '(' karakterinin İNDEKSİNDEN başlayıp eşleşen ')' indeksini bulur. */
function eslesenParantez(metin, acilisIdx) {
  let derinlik = 0;
  let i = acilisIdx;
  const n = metin.length;
  while (i < n) {
    const ch = metin[i];
    if (ch === '-' && metin[i + 1] === '-') {           // satır yorumu — atla
      const nl = metin.indexOf('\n', i);
      i = nl === -1 ? n : nl + 1;
      continue;
    }
    if (ch === "'") {                                    // string literal — atla
      i++;
      while (i < n) {
        if (metin[i] === "'" && metin[i + 1] === "'") { i += 2; continue; } // '' kaçışı
        if (metin[i] === "'") { i++; break; }
        i++;
      }
      continue;
    }
    if (ch === '(') { derinlik++; i++; continue; }
    if (ch === ')') {
      derinlik--;
      if (derinlik === 0) return i;
      i++;
      continue;
    }
    i++;
  }
  return -1;
}

/** Parantez içeriğini yalnız DERİNLİK-0 virgüllerinden böler; yorum
 *  metinlerini çıktıdan da düşürür (aksi hâlde bir anahtarın önündeki
 *  açıklama satırı — "-- KOTA NABZI..." — anahtar parçasının İÇİNE
 *  karışır ve `^'ad'$` deseni eşleşmez). */
function ustSeviyeArgumanlariAyikla(icerik) {
  const parcalar = [];
  let derinlik = 0;
  let tampon = '';
  let i = 0;
  const n = icerik.length;
  while (i < n) {
    const ch = icerik[i];
    if (ch === '-' && icerik[i + 1] === '-') {
      const nl = icerik.indexOf('\n', i);
      i = nl === -1 ? n : nl + 1;
      continue;
    }
    if (ch === "'") {
      let j = i + 1;
      while (j < n) {
        if (icerik[j] === "'" && icerik[j + 1] === "'") { j += 2; continue; }
        if (icerik[j] === "'") { j++; break; }
        j++;
      }
      tampon += icerik.slice(i, j);
      i = j;
      continue;
    }
    if (ch === '(') { derinlik++; tampon += ch; i++; continue; }
    if (ch === ')') { derinlik--; tampon += ch; i++; continue; }
    if (ch === ',' && derinlik === 0) {
      parcalar.push(tampon);
      tampon = '';
      i++;
      continue;
    }
    tampon += ch;
    i++;
  }
  if (tampon.trim()) parcalar.push(tampon);
  return parcalar.map(p => p.trim());
}

/** admin_usage_report gövdesindeki DIŞ `jsonb_build_object(...)` çağrısını
 *  bulur (kapanışı `INTO v_out` ile devam eden tek çağrı) ve onun doğrudan
 *  argümanlarından üst-düzey blok adlarını çıkarır. Dosya admin_usage_report
 *  tanımlamıyorsa ya da kalıp tanınmıyorsa `null` döner. */
function ustDuzeyBlokAdlariniCikar(sqlMetni) {
  const anahtar = 'jsonb_build_object(';
  let ara = 0;
  while (true) {
    const idx = sqlMetni.indexOf(anahtar, ara);
    if (idx === -1) return null;
    const acilis = idx + anahtar.length - 1;
    const kapanis = eslesenParantez(sqlMetni, acilis);
    if (kapanis === -1) { ara = idx + anahtar.length; continue; }
    const sonrasi = sqlMetni.slice(kapanis + 1, kapanis + 40);
    if (/^\s*INTO\s+v_out/.test(sonrasi)) {
      const icerik = sqlMetni.slice(acilis + 1, kapanis);
      const parcalar = ustSeviyeArgumanlariAyikla(icerik);
      const adlar = [];
      for (let k = 0; k < parcalar.length; k += 2) {
        const m = parcalar[k].match(/^'([a-z_]+)'$/);
        if (m) adlar.push(m[1]);
      }
      return adlar;
    }
    ara = idx + anahtar.length;
  }
}

/* ─── 2. DOSYA TARAMASI ─── */

/** Bir dizindeki admin_usage_report'a dokunan migration dosyalarını,
 *  dosya adının baştaki numarasına göre sıralı döndürür. */
function admiUsageReportDosyalari(dizin) {
  return readdirSync(dizin)
    .filter(ad => /^\d{3}_.*\.sql$/.test(ad))
    .filter(ad => readFileSync(join(dizin, ad), 'utf8').includes('CREATE OR REPLACE FUNCTION admin_usage_report'))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
}

describe('migration blok taşıma kapısı', () => {
  it('admin_usage_report zincirindeki her dosya bir öncekinin tüm üst-düzey bloklarını taşır', () => {
    const dosyalar = admiUsageReportDosyalari(MIGRATIONS_DIR);
    // Bugün 000 + sekiz gözlemevi dosyası (042,044,045,046,048,049,050,051)
    // admin_usage_report'a dokunuyor — zincir en az ikili olmalı ki test
    // bir şey sınasın.
    expect(dosyalar.length).toBeGreaterThan(1);

    let oncekiAdlar = null;
    let oncekiDosya = null;
    for (const ad of dosyalar) {
      const metin = readFileSync(join(MIGRATIONS_DIR, ad), 'utf8');
      const adlar = ustDuzeyBlokAdlariniCikar(metin);
      expect(adlar, `${ad}: üst-düzey blok listesi çıkarılamadı — admin_usage_report kalıbı değişmiş olabilir`).not.toBeNull();
      expect(adlar.length, `${ad}: hiç blok adı bulunamadı`).toBeGreaterThan(0);

      if (oncekiAdlar) {
        const eksik = oncekiAdlar.filter(a => !adlar.includes(a));
        expect(eksik, `${ad}, ${oncekiDosya}'nin şu bloklarını taşımıyor — bu kartlar Gözlemevi'nden kaybolur: ${eksik.join(', ')}`).toEqual([]);
      }
      oncekiAdlar = adlar;
      oncekiDosya = ad;
    }
  });

  it('051, 050\'nin on altı bloğunu aynen taşır ve üstüne yedi yeni blok ekler (17 *_pulse)', () => {
    const dosya050 = readdirSync(MIGRATIONS_DIR).find(ad => ad.startsWith('050_'));
    const dosya051 = readdirSync(MIGRATIONS_DIR).find(ad => ad.startsWith('051_'));
    expect(dosya050, '050 migration dosyası yok').toBeTruthy();
    expect(dosya051, '051 migration dosyası yok').toBeTruthy();

    const adlar050 = ustDuzeyBlokAdlariniCikar(readFileSync(join(MIGRATIONS_DIR, dosya050), 'utf8'));
    const adlar051 = ustDuzeyBlokAdlariniCikar(readFileSync(join(MIGRATIONS_DIR, dosya051), 'utf8'));

    const eksik = adlar050.filter(a => !adlar051.includes(a));
    expect(eksik, `051, 050'nin şu bloklarını taşımıyor: ${eksik.join(', ')}`).toEqual([]);

    const yeni = adlar051.filter(a => !adlar050.includes(a)).sort();
    expect(yeni).toEqual([
      'arac_pulse', 'bolge_pulse', 'error_pulse', 'kota_pulse',
      'notification_pulse', 'paylasim_pulse', 'safety_pulse',
    ]);

    const metin051 = readFileSync(join(MIGRATIONS_DIR, dosya051), 'utf8');
    const pulseSayisi = (metin051.match(/_pulse'/g) || []).length;
    expect(pulseSayisi, "051'de tam on yedi '<ad>_pulse' anahtarı bekleniyordu").toBe(17);
  });
});

/*
 * ─── 3. KENDİ KENDİNİ SINAMA — "yakalamayan bir kapı, kapı değildir" ───
 *
 * Gerçek migration dosyalarının bugün eksiksiz olması ("hiç eksik yok")
 * tek başına kapının ÇALIŞTIĞINI kanıtlamaz — ayıklayıcı bozuk olup her
 * zaman boş/eşit küme döndürse bile ilk iki test yeşil kalırdı (boş küme
 * boş kümenin her zaman alt kümesidir). Bu blok, ayıklayıcıyı sahte iki
 * dosyalık bir fixture'a karşı çalıştırıp GERÇEKTEN bir blok eksikliğini
 * yakaladığını ve GERÇEKTEN tam bir taşımayı geçirdiğini kanıtlar (kalıp:
 * `tests/referans-butunlugu.test.js` ve `tests/bundle-kapisi.test.js`'in
 * kendi-kendini-sınama bölümleri).
 */
describe('kapının kendisi — mutasyon sınaması', () => {
  const ESKI_ICERIK = `
CREATE OR REPLACE FUNCTION admin_usage_report(p_days INTEGER DEFAULT 30)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE v_out JSONB;
BEGIN
  SELECT jsonb_build_object(
    -- yorum içinde parantez de olabilir: wtLogFoo()
    'a_pulse', (SELECT COUNT(*) FROM ev WHERE kind = 'a'),
    'b_pulse', (SELECT COUNT(*) FROM ev WHERE kind = 'b')
  ) INTO v_out;
  RETURN v_out;
END; $$;
`;

  function tamKontrol(dizin) {
    const dosyalar = admiUsageReportDosyalari(dizin);
    let oncekiAdlar = null;
    let sonuc = { tamamMi: true, eksikRapor: [] };
    for (const ad of dosyalar) {
      const adlar = ustDuzeyBlokAdlariniCikar(readFileSync(join(dizin, ad), 'utf8'));
      if (oncekiAdlar) {
        const eksik = oncekiAdlar.filter(a => !adlar.includes(a));
        if (eksik.length) { sonuc.tamamMi = false; sonuc.eksikRapor.push({ dosya: ad, eksik }); }
      }
      oncekiAdlar = adlar;
    }
    return sonuc;
  }

  it('bir blok gerçekten eksilirse zincir kontrolü kırmızı olur', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'migrasyon-kapi-kirik-'));
    try {
      const kirikIcerik = ESKI_ICERIK.replace(
        "'a_pulse', (SELECT COUNT(*) FROM ev WHERE kind = 'a'),\n    'b_pulse', (SELECT COUNT(*) FROM ev WHERE kind = 'b')",
        "'b_pulse', (SELECT COUNT(*) FROM ev WHERE kind = 'b')", // a_pulse DÜŞTÜ
      );
      writeFileSync(join(tmp, '001_eski.sql'), ESKI_ICERIK);
      writeFileSync(join(tmp, '002_kirik.sql'), kirikIcerik);

      const sonuc = tamKontrol(tmp);
      expect(sonuc.tamamMi).toBe(false);
      expect(sonuc.eksikRapor[0].eksik).toEqual(['a_pulse']);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('tüm bloklar taşınıp üstüne yenisi eklenirse zincir kontrolü yeşil kalır', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'migrasyon-kapi-tam-'));
    try {
      const tamIcerik = ESKI_ICERIK.replace(
        "'b_pulse', (SELECT COUNT(*) FROM ev WHERE kind = 'b')",
        "'b_pulse', (SELECT COUNT(*) FROM ev WHERE kind = 'b'),\n    'c_pulse', (SELECT COUNT(*) FROM ev WHERE kind = 'c')",
      );
      writeFileSync(join(tmp, '001_eski.sql'), ESKI_ICERIK);
      writeFileSync(join(tmp, '002_tam.sql'), tamIcerik);

      const sonuc = tamKontrol(tmp);
      expect(sonuc.tamamMi).toBe(true);
      expect(sonuc.eksikRapor).toEqual([]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('ayıklayıcı, admin_usage_report tanımlamayan dosyaları zincire hiç almaz', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'migrasyon-kapi-ilgisiz-'));
    try {
      writeFileSync(join(tmp, '001_eski.sql'), ESKI_ICERIK);
      writeFileSync(join(tmp, '002_ilgisiz.sql'), '-- bu dosya admin_usage_report tanımlamaz\nCREATE TABLE foo (id INT);\n');
      const dosyalar = admiUsageReportDosyalari(tmp);
      expect(dosyalar).toEqual(['001_eski.sql']);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
