// @vitest-environment node
// Denetçiyi spawnSync ile ayrı süreçte koşar — DOM'a hiç dokunmaz.
// jsdom kurulumu dosya başına ~3 sn'dir; burada bedava ödenirdi.

/**
 * XSS KAPISI — "HTML'e giren her değerin bir kaçış kaydı vardır".
 *
 * scripts/audit-innerhtml.mjs'i koşar. Denetçi, HTML üreten HER template'in
 * interpolasyonlarını sınıflandırır ve kaçış kaydı olmayanları
 * scripts/xss-taban.json ile karşılaştırır; taban BÜYÜRSE bu test kırılır.
 *
 * Kalıbı tests/gerceklik-kapisi.test.js ile aynıdır (spawnSync + exit kodu) —
 * çalışan kapı deseni ikinci kez kullanıldı, yenisi icat edilmedi.
 *
 * Bu denetçi 2026-09-02'ye kadar YAZILIYDI AMA KOŞMUYORDU: exit 1 veriyordu,
 * hiçbir test onu çağırmıyordu, CI yoktu (denetim B2). Kapısı olmayan kural
 * zamanla tavsiyeye döner — bu dosya o tavsiyeyi kapıya çevirir.
 *
 * İkinci describe bloğu kapının KENDİSİNİ sınar: yeşil kalmak için ihlali
 * yakalayabildiğini de kanıtlamalı. Yakalamayan bir kapı, kapı değildir.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, copyFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DENETCI = join(ROOT, 'scripts/audit-innerhtml.mjs');

// Denetçi ROOT'unu KENDİ konumundan hesaplar (import.meta.url) — bu yüzden
// geçici dizini sınarken oradaki KOPYA koşulmalı; asıl repodaki dosyayı
// yalnız cwd değiştirerek çağırmak asıl repoyu taratır ve kapı sınanmamış olur.
function kos(kok = ROOT) {
  const betik = kok === ROOT ? DENETCI : join(kok, 'scripts/audit-innerhtml.mjs');
  return spawnSync('node', [betik], { cwd: kok, encoding: 'utf8' });
}

describe('XSS kapısı — repo tabanı aşmıyor', () => {
  it('audit-innerhtml.mjs 0 ile geçer', () => {
    const res = kos();
    if (res.status !== 0) {
      throw new Error(`XSS denetçisi ${res.status} ile kırıldı:\n${res.stdout}${res.stderr}`);
    }
    expect(res.status).toBe(0);
  });

  it('taban dosyası okunabilir ve kayıt taşır', () => {
    const taban = JSON.parse(readFileSync(join(ROOT, 'scripts/xss-taban.json'), 'utf8'));
    expect(Array.isArray(taban.kayitlar)).toBe(true);
    expect(taban._aciklama).toMatch(/BÜYÜMESİNİ yasaklar/);
  });
});

describe('XSS kapısı — kapının kendisi çalışıyor mu', () => {
  it('kaçışsız yeni bir interpolasyon eklenirse exit 1 verir ve adını söyler', () => {
    const dir = mkdtempSync(join(tmpdir(), 'xss-kapi-'));
    try {
      mkdirSync(join(dir, 'js', 'parts'), { recursive: true });
      mkdirSync(join(dir, 'scripts'), { recursive: true });
      copyFileSync(DENETCI, join(dir, 'scripts/audit-innerhtml.mjs'));
      // Boş taban: her ham erişim "yeni" sayılır.
      writeFileSync(join(dir, 'scripts/xss-taban.json'),
        JSON.stringify({ _aciklama: 'test', kayitlar: [] }, null, 2));
      writeFileSync(join(dir, 'js/parts/ihlal.js'), `
export function kartCiz(kisi) {
  const el = document.createElement('div');
  el.innerHTML = \`<div class="ad">\${kisi.adSoyad}</div>\`;
  return el;
}
`);
      const res = kos(dir);
      expect(res.status).toBe(1);
      expect(res.stdout).toContain('kisi.adSoyad');
      expect(res.stdout).toContain('TABAN BÜYÜDÜ');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('escapeHTML ile sarılınca aynı kod kapıdan geçer', () => {
    const dir = mkdtempSync(join(tmpdir(), 'xss-kapi-'));
    try {
      mkdirSync(join(dir, 'js', 'parts'), { recursive: true });
      mkdirSync(join(dir, 'scripts'), { recursive: true });
      copyFileSync(DENETCI, join(dir, 'scripts/audit-innerhtml.mjs'));
      writeFileSync(join(dir, 'scripts/xss-taban.json'),
        JSON.stringify({ _aciklama: 'test', kayitlar: [] }, null, 2));
      writeFileSync(join(dir, 'js/parts/temiz.js'), `
import { escapeHTML } from './00a-infrastructure.js';
export function kartCiz(kisi) {
  const el = document.createElement('div');
  el.innerHTML = \`<div class="ad">\${escapeHTML(kisi.adSoyad)}</div>\`;
  return el;
}
`);
      const res = kos(dir);
      expect(res.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('XSS-MUAF beyanı bilinçli istisnayı geçirir', () => {
    const dir = mkdtempSync(join(tmpdir(), 'xss-kapi-'));
    try {
      mkdirSync(join(dir, 'js', 'parts'), { recursive: true });
      mkdirSync(join(dir, 'scripts'), { recursive: true });
      copyFileSync(DENETCI, join(dir, 'scripts/audit-innerhtml.mjs'));
      writeFileSync(join(dir, 'scripts/xss-taban.json'),
        JSON.stringify({ _aciklama: 'test', kayitlar: [] }, null, 2));
      writeFileSync(join(dir, 'js/parts/muaf.js'), `
export function ikonCiz(ikonlar) {
  const el = document.createElement('div');
  /* XSS-MUAF: ikonlar modül-yerel SVG sabitidir, kullanıcı verisi taşımaz */
  el.innerHTML = \`<span>\${ikonlar.onay}</span>\`;
  return el;
}
`);
      const res = kos(dir);
      expect(res.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
