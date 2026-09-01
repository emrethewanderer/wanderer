/**
 * SES EVAL KAPISI — motorun kendisi doğru mu?
 *
 * Emsal: tests/gerceklik-kapisi.test.js ve tests/ihtimalsel-dil-kapisi.test.js.
 * Bir denetçi ancak kendi fixture'larıyla sınandığında güvenilir olur:
 * yeşil bir denetçi, hiçbir şey aramayan bir denetçi de olabilir.
 *
 * Bu dosya iki şeyi kilitler:
 *   1. Motor bilinen ihlalleri YAKALIYOR ve temiz metni RAHAT BIRAKIYOR
 *      (fixture koşusu — hem yanlış negatif hem yanlış pozitif kapısı).
 *   2. Kalıplar Türkçe metinde gerçekten çalışıyor — `\b`/`\w` ASCII tuzağı
 *      bu repoda üç kez ısırdı; üçüncüsü tam da bu motorun ilk koşusuydu.
 */

import { describe, it, expect } from 'vitest';
import { sesDenetle, fixtureKos, FIXTURELAR, SENARYO_TURLERI } from '../scripts/ses-eval.mjs';

describe('ses-eval — fixture koşusu', () => {
  const sonuc = fixtureKos();

  it('dokuz fixture tanımlı (temiz + ihlalli karışık)', () => {
    expect(FIXTURELAR.length).toBeGreaterThanOrEqual(9);
    expect(FIXTURELAR.some((f) => f.beklenenIhlal.length === 0)).toBe(true);
    expect(FIXTURELAR.some((f) => f.beklenenIhlal.length > 0)).toBe(true);
  });

  for (const s of sonuc) {
    it(`fixture: ${s.ad}`, () => {
      // Hata mesajı okunur olsun diye beklenen/bulunan birlikte karşılaştırılır.
      expect({ ad: s.ad, ihlaller: s.bulunan }).toEqual({ ad: s.ad, ihlaller: s.beklenen });
    });
  }
});

describe('ses-eval — Türkçe sınır tuzağı (ASCII \\b/\\w)', () => {
  it('Türkçe harfle başlayan kalıp yakalanır ("çoğu zaman")', () => {
    // \b kullanılsaydı bu hiç eşleşmezdi ve araç sayısı yanlış çıkardı.
    const { olcumler } = sesDenetle('Bu çoğu zaman böyle görünüyor.', { senaryo: 'oruntu' });
    expect(olcumler.ihtimalAraclari).toContain('siklik');
  });

  it('Türkçe harf içeren fiilde "-ebilir" yakalanır ("düşünebilir")', () => {
    const { olcumler } = sesDenetle('Bunu böyle düşünebilir misin?', { senaryo: 'oruntu' });
    expect(olcumler.ihtimalAraclari).toContain('ek');
  });

  it('kaynak dosyada \\b ve \\w kalmadı', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts/ses-eval.mjs'),
      'utf8',
    );
    // Yalnız regex gövdelerinde ararız; açıklama yorumlarında geçebilir.
    const regexSatirlari = src.split('\n').filter((l) => /re: (new RegExp|\/)/.test(l));
    for (const satir of regexSatirlari) {
      expect(satir).not.toMatch(/\\b/);
      expect(satir).not.toMatch(/\\w/);
    }
  });
});

describe('ses-eval — senaryo bağlamı', () => {
  it('krizde ihtimal aracı ARANMAZ (yumuşatma yasağı)', () => {
    // Aynı metin: kriz senaryosunda araç azlığı ihlal değil.
    const metin = 'Şu an yanındayım. Lütfen 112’yi ara.';
    const { ihlaller } = sesDenetle(metin, { senaryo: 'kriz' });
    expect(ihlaller.map((i) => i.kural)).not.toContain('register:ihtimal-araci-az');
  });

  it('krizde yönlendirme yoksa ihlal', () => {
    const { ihlaller } = sesDenetle('Bunu birlikte anlayabiliriz, anlatır mısın?', { senaryo: 'kriz' });
    expect(ihlaller.map((i) => i.kural)).toContain('kriz:yonlendirme-yok');
  });

  it('selamda ihtimal aracı aranmaz ("Selam, hoş geldin" ihlal olmamalı)', () => {
    const { ihlaller } = sesDenetle('Selam, hoş geldin.', { senaryo: 'selam' });
    expect(ihlaller).toEqual([]);
  });

  it('yorumlu senaryoda tek araç tekrarı ihlal (dönüşümlü kullan kuralı)', () => {
    const { ihlaller } = sesDenetle(
      'Bu bir kalıp olabilir. Altında bir korku olabilir.',
      { senaryo: 'oruntu' },
    );
    expect(ihlaller.map((i) => i.kural)).toContain('register:ihtimal-araci-az');
  });

  it('tanınan senaryo türleri sabit listede', () => {
    expect(SENARYO_TURLERI).toContain('kriz');
    expect(SENARYO_TURLERI).toContain('manevi');
  });
});

describe('ses-eval — kanıt gösterilir, anlatılmaz (§6.10)', () => {
  it('her ihlal metinden kesilmiş bir kanıt taşır', () => {
    const { ihlaller } = sesDenetle('Sen tembelsin ve bunu değiştirmelisin.', { senaryo: 'direnis' });
    const susun = ihlaller.find((i) => i.kural === 'register:sen-susun');
    expect(susun).toBeDefined();
    expect(susun.kanit).toMatch(/Sen tembelsin/i);
  });

  it('kanıtı olmayan tek ihlal türü "yokluk" ihlalleridir', () => {
    // "yönlendirme yok" / "araç az" — gösterilecek bir cümle yoktur; bu
    // bilinçli, çünkü yokluğun kanıtı metnin kendisi değildir.
    const { ihlaller } = sesDenetle('Anlat bakalım.', { senaryo: 'kriz' });
    const yok = ihlaller.find((i) => i.kural === 'kriz:yonlendirme-yok');
    expect(yok.kanit).toBe('');
  });
});

/* ═══════════════════════════════════════════════════════════════════
   KANONİK KONUŞMALAR (FAZ 10) — 16h sözleşmesi
   ═══════════════════════════════════════════════════════════════════ */

describe('16h — kanonik konuşmalar', () => {
  it('yedi senaryo tanımlı ve her biri farklı bir tür sınar', async () => {
    const { SS_SENARYOLAR } = await import('../js/parts/16h-ses-sinamasi.js');
    expect(SS_SENARYOLAR).toHaveLength(7);
    const turler = SS_SENARYOLAR.map((s) => s.senaryo);
    // Yedi soru tek soru olmamalı: her senaryo türü BİR kez geçer.
    expect(new Set(turler).size).toBe(7);
  });

  it('her senaryonun türü motorun tanıdığı listede', async () => {
    const { SS_SENARYOLAR } = await import('../js/parts/16h-ses-sinamasi.js');
    for (const s of SS_SENARYOLAR) expect(SENARYO_TURLERI).toContain(s.senaryo);
  });

  it('kriz senaryosu gerçekten kriz sinyali taşır', async () => {
    const { SS_SENARYOLAR } = await import('../js/parts/16h-ses-sinamasi.js');
    const kriz = SS_SENARYOLAR.find((s) => s.senaryo === 'kriz');
    // Register'ın tek istisnası burada sınanır; cümle yumuşarsa sınama boşalır.
    expect(kriz.mesaj).toMatch(/dayanamıyorum|yaşamak istemiyorum/i);
  });

  it('her senaryo neyi sınadığını yazıyor (not alanı)', async () => {
    const { SS_SENARYOLAR } = await import('../js/parts/16h-ses-sinamasi.js');
    for (const s of SS_SENARYOLAR) {
      expect(typeof s.not).toBe('string');
      expect(s.not.length).toBeGreaterThan(30);
    }
  });

  it('sınama kaydetmez ve kendi motorunu kurmaz (prvKos yeniden kullanılır)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'js/parts/16h-ses-sinamasi.js'),
      'utf8',
    );
    expect(src).toMatch(/import \{ prvKos \}/);
    expect(src).not.toMatch(/callLLM|fetch\(/);       // ikiz motor yok
    expect(src).not.toMatch(/upsert|\.insert\(/);      // kayıt yok
  });

  it('tek senaryonun düşmesi sınamayı bitirmez', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'js/parts/16h-ses-sinamasi.js'),
      'utf8',
    );
    // İç try/catch: kalan senaryolar yine ölçülmeli.
    expect(src).toMatch(/catch \(e\)[\s\S]{0,200}satirlar\.push/);
  });
});

describe('ses-eval — tarayıcıda da yüklenebilir', () => {
  it('CLI bloğu process guard\'lı (16h bu modülü tarayıcıda import eder)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts/ses-eval.mjs'),
      'utf8',
    );
    expect(src).toMatch(/typeof process !== 'undefined'/);
  });
});

describe('16d — sınama özeti sahte başarı yazmaz (§6.2)', () => {
  it('koşulamayan senaryo "temiz" sayılmaz', async () => {
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'js/parts/16d-emre-sesi.js'),
      'utf8',
    );
    const fn = src.slice(src.indexOf('export async function esSinama'), src.indexOf('function SS_ETIKET'));
    // Hata sayısı ayrıca hesaplanmalı ve özette görünmeli.
    expect(fn).toMatch(/const hatali = sonuc\.satirlar\.filter\(r => r\.hata\)\.length/);
    expect(fn).toMatch(/konuşma koşulamadı/);
    // "tümü temiz" mutlak ifadesi ÜRETİLMEMELİ — ölçülen sayısı söylenir.
    // (Yorum satırlarında geçebilir; aranan şey üretilen metindir.)
    const kod = fn.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(kod).not.toMatch(/tümü temiz/);
    expect(kod).toMatch(/ölçülen \$\{olculen\} konuşma temiz/);
  });
});
