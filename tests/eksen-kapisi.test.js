// @vitest-environment node
// Denetçi saf metin ölçümü yapar — DOM'a hiç dokunmaz; jsdom kurulumu (~3 sn)
// burada bedava ödenirdi (tests/tasarim-kapisi.test.js ile aynı gerekçe).

/**
 * EKSEN KAPISI — üç sesin gerçekten üç olduğunu mühürleyen test.
 *
 * `scripts/eksen-denetci.mjs`'in ölçümü (sözcük örtüşmesi + tekillik) gerçek
 * seed içeriğiyle taban bandının İÇİNDE kalmalı; yapay bozulmaları (kopya
 * içerik, kayan dolar-tırnak etiketi) yakalamalı. Yakalamayan bir kapı,
 * kapı değildir — E1 testi özellikle bunun için vardır: etiket kayması
 * sessizce "her şey ayrıştı" demeye yol açar (blokAl boş metinde ölçüm 0
 * üretir, 0 örtüşme "mükemmel ayrışma" sanılır).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { olcum, denetle, kume } from '../scripts/eksen-denetci.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const sql = readFileSync(join(ROOT, 'migrations/000_wanderer_schema.sql'), 'utf-8');
const taban = JSON.parse(readFileSync(join(ROOT, 'scripts/eksen-taban.json'), 'utf-8'));

const kodlar = (s) => denetle(olcum(s), taban).ihlaller.map(i => i.kod);

/** $tag$…$tag$ bloğunun içeriğini döndürür — yapay SQL kurmak için. */
const icerik = (tag) => sql.match(new RegExp('\\$' + tag + '\\$([\\s\\S]*?)\\$' + tag + '\\$'))[1];

/** Bir bloğun içeriğini yenisiyle değiştirir. Replacer FONKSİYON olmalı:
 *  içerikteki `$` işaretleri string-replacement'ta $&/$' desenı olurdu. */
const degistir = (tag, yeniIcerik) =>
  sql.replace(new RegExp('\\$' + tag + '\\$[\\s\\S]*?\\$' + tag + '\\$'), () => `$${tag}$${yeniIcerik}$${tag}$`);

describe('eksen kapısı — gerçek seed ayrışıyor', () => {
  it('000_wanderer_schema.sql kapıdan geçer (bugünün mühürü)', () => {
    const { ihlaller } = denetle(olcum(sql), taban);
    expect(ihlaller).toHaveLength(0);
  });

  it('üç eksenin de içeriği bulunuyor — bos boş, boyutlar anlamlı', () => {
    const o = olcum(sql);
    expect(o.bos).toHaveLength(0);
    for (const id of ['oz', 'bag', 'eser']) {
      expect(o.sp.boyut[id]).toBeGreaterThan(100);
    }
  });
});

describe('eksen kapısı — kapı bozulmayı yakalıyor', () => {
  it('E2: bir eksene öbürünün kopyası konursa örtüşme tavanı aşar', () => {
    // $bgs$ bloğuna $ozs$ içeriğinin aynısı → Öz ile Bağ davranışı birbirine yapışır
    const yapay = degistir('bgs', icerik('ozs'));
    expect(kodlar(yapay)).toContain('E2');
  });

  it('E3: bir eksenin sözlüğü öbürüyle doldurulursa tekillik taban-altına düşer', () => {
    // $ess$ bloğuna $bgs$ içeriği → Eser'in kendine ait hiç sözcüğü kalmaz
    const yapay = degistir('ess', icerik('bgs'));
    expect(kodlar(yapay)).toContain('E3');
  });

  it('E1: dolar-tırnak etiketi kayarsa blok okunamadı ihlali doğar — sessiz geçmez', () => {
    const bozuk = sql.split('$ess$').join('$esx$');
    const o = olcum(bozuk);
    expect(o.bos).toContain('eser');
    expect(kodlar(bozuk)).toContain('E1');
  });
});

describe('eksen kapısı — Türkçe tuzağı', () => {
  it('kume Türkçe harfleri düşürmez (ASCII \\b / \\w kullanılmadığının kanıtı)', () => {
    const K = kume('çözüm ilişki ığdır');
    expect(K.has('çözüm')).toBe(true);
    expect(K.has('ilişki')).toBe(true);
    expect(K.has('ığdır')).toBe(true);
  });

  it('kısa ve durak sözcükler ölçüme girmez — eksen sözlüğü sayılır, iskelet değil', () => {
    const K = kume('ve gibi bir olarak dikkat');
    expect(K.has('dikkat')).toBe(true);
    expect(K.size).toBe(1);
  });
});
