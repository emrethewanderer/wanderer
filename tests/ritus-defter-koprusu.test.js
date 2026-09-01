/**
 * "Emek sayar, bakış saymaz" — merkezî seri defterinin sözleşmesi
 * (Emre'nin kararı, 2026-08-19 · İç Çalışma 05 rev.3 · boşluk E).
 *
 * `calculateStreak` yalnız `getActivityDays()` okur; yani defteri BESLEMEYEN
 * ritüel, kullanıcının gününü saymaz. 19 Ağustos taramasında yedi yüzey
 * beslemiyordu — başında Günlük Ritüel vardı — ve pasif bir ekran açılışı
 * (10g "aynaya bakma") besliyordu. Bu dosya iki yönü de mühürler: emeğin
 * yazıldığını ve bakışın yazılmadığını.
 *
 * Yöntem KAYNAK SONDASI'dır: davranışın kendisi dokuz ayrı modülün DOM'una
 * bağlı; sözleşme ise tek satırlık bir çağrının varlığıdır ve kırılması da
 * o satırın sessizce silinmesiyle olur. Sonda tam o kırığı yakalar.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const P = resolve(dirname(fileURLToPath(import.meta.url)), '../js/parts');
const oku = (f) => readFileSync(`${P}/${f}`, 'utf-8');

/** Ritüelin tamamlanma anında defteri besleyen yüzeyler. */
const EMEK = {
  '10s-w2-gunluk-ritus.js':      'Günlük Ritüel — verilen söz + akşam hesabı',
  '10i-w2-hayal-alemi.js':       'Hayal Seansı — mühürlenen sahne',
  '10k-w2-kendinle-konusma.js':  'Kendinle Konuşmak — tamamlanan seans',
  '10l-w2-degerlendirme.js':     'Dönem değerlendirmesi — bitirilen soru seti',
  '10n-w2-dinlenme.js':          'Başarı Günlüğü — yazılan başarı',
  '13A-derin-calisma.js':        'Derin Çalışma — mühürlenen kağıt',
  '10h-w2-library-challenges.js':'Sefer — mühürlenen gün',
  '10t-w2-seri-muhru.js':        'Seri Mührü — günü mühürleme',
};

describe('Emek sayar — defteri besleyen yüzeyler', () => {
  for (const [dosya, ne] of Object.entries(EMEK)) {
    it(`${dosya} defteri besler (${ne})`, () => {
      expect(oku(dosya)).toMatch(/recordActivityDay\(\)/);
    });
  }

  it('Günlük Ritüel iki ayrı emek anında yazar: söz + akşam hesabı', () => {
    const src = oku('10s-w2-gunluk-ritus.js');
    expect(src.match(/recordActivityDay\(\);/g)).toHaveLength(2);
  });
});

describe('Bakış saymaz — pasif tetikler defteri büyütmez', () => {
  it('10g aynaReflectToday defter çağrısı TAŞIMAZ (ekranı açmak emek değildir)', () => {
    const src = oku('10g-w2-wanderer-game.js');
    const govde = src.slice(src.indexOf('export function aynaReflectToday'),
                           src.indexOf('export function aynaReflectToday') + 900);
    expect(govde).toContain("awardElmas(1, 'ayna-bakti')");
    expect(govde).not.toMatch(/^\s*recordActivityDay\(\);/m);
  });

  it('10g davranış kanıtı defteri BESLEMEYE devam eder — o bir emektir', () => {
    expect(oku('10g-w2-wanderer-game.js'))
      .toMatch(/recordActivityDay\(\); \/\/ davranış kanıtı/);
  });

  it('10m Engel Atlası teşhisi deftere yazmaz — ekran açılışında otomatik koşar', () => {
    const src = oku('10m-w2-engeller.js');
    expect(src).toMatch(/wtLogRitus\?\.\('engel-atlasi', 'basladi'/);
    expect(src).not.toMatch(/recordActivityDay/);
  });
});

describe('Ritüellerin Nabzı — her emek anı ölçülür', () => {
  const NABIZ = {
    '10s-w2-gunluk-ritus.js':      "'gunluk-ritus'",
    '10i-w2-hayal-alemi.js':       "'hayal'",
    '10k-w2-kendinle-konusma.js':  "'kendinle-konusma'",
    '10l-w2-degerlendirme.js':     "'degerlendirme'",
    '10m-w2-engeller.js':          "'engel-atlasi'",
    '10n-w2-dinlenme.js':          "'dinlenme'",
    '13A-derin-calisma.js':        "'derin-calisma'",
    '10h-w2-library-challenges.js':"'sefer'",
    '10t-w2-seri-muhru.js':        "'seri-muhru'",
  };
  for (const [dosya, ad] of Object.entries(NABIZ)) {
    it(`${dosya} → wtLogRitus(${ad})`, () => {
      expect(oku(dosya)).toContain(`window.wtLogRitus?.(${ad}`);
    });
  }

  it('çağrılar TDZ-güvenli: statik import ile değil window üzerinden', () => {
    for (const dosya of Object.keys(NABIZ)) {
      expect(oku(dosya)).not.toMatch(/import\s*{[^}]*wtLogRitus/);
    }
  });

  it('huninin iki ucu da ölçülür: başlama ve bırakma olayları var', () => {
    expect(oku('10s-w2-gunluk-ritus.js')).toContain("'gunluk-ritus', 'basladi'");
    expect(oku('10s-w2-gunluk-ritus.js')).toContain("'gunluk-ritus', 'birakti'");
    expect(oku('10i-w2-hayal-alemi.js')).toContain("'hayal', 'basladi'");
    expect(oku('10k-w2-kendinle-konusma.js')).toContain("'kendinle-konusma', 'basladi'");
    expect(oku('10l-w2-degerlendirme.js')).toContain("'degerlendirme', 'basladi'");
  });
});
