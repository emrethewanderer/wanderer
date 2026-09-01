/**
 * ERİŞİLEBİLİRLİK i18n KAPISI — data-i18n-aria
 *
 * Bulgu (2026-07-24): görünen metin EN'e dönerken aria-label'lar Türkçe
 * kalıyordu; ekran okuyucu kullanan EN kullanıcı karma dil duyuyordu.
 * applyTranslations artık [data-i18n-aria] elemanlarını da çevirir.
 *
 * Bu dosya iki şeyi kilitler:
 *   1) Davranış — setLanguage aria-label'ı gerçekten çevirir.
 *   2) Parite   — _src.html'de kullanılan HER data-i18n-aria/-ph anahtarı
 *                 hem TR hem EN sözlükte VARDIR (sessiz eksik anahtar yok).
 *
 * NOT: JS'in runtime'da setAttribute ettiği aria-label'lar (kota halkası,
 * model pili, gönder butonu) bilinçli olarak data-i18n-aria TAŞIMAZ —
 * taşısalardı dil değişimi canlı durumu ezerdi. Bkz. 15-i18n.js gotcha notu.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { S } from '../js/state.js';
import { setLanguage, ensureLangDict } from '../js/parts/15-i18n.js';
import { I18N_CORE } from '../js/parts/15b-i18n-dict-core.js';
import { I18N_EN } from '../js/parts/15e-i18n-dict-en.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_HTML = readFileSync(join(ROOT, '_src.html'), 'utf8');

function keysFor(attr) {
  return [...new Set([...SRC_HTML.matchAll(new RegExp(`${attr}="([^"]+)"`, 'g'))].map(m => m[1]))];
}

describe('data-i18n-aria — davranış', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    S._currentLang = 'tr';
  });

  it('setLanguage aria-label\'ı sözlükteki değere yazar', async () => {
    document.body.innerHTML =
      '<button id="probe" aria-label="ESKİ" data-i18n-aria="aria.chats"></button>';
    const el = document.getElementById('probe');

    setLanguage('tr');
    expect(el.getAttribute('aria-label')).toBe(I18N_CORE.tr['aria.chats']);

    await ensureLangDict('en');
    setLanguage('en');
    expect(el.getAttribute('aria-label')).toBe(I18N_EN['aria.chats']);
  });

  it('TR ve EN aria değerleri birbirinden farklı (çeviri gerçekten yapılmış)', () => {
    expect(I18N_CORE.tr['aria.chats']).not.toBe(I18N_EN['aria.chats']);
    expect(I18N_CORE.tr['aria.to_today']).not.toBe(I18N_EN['aria.to_today']);
  });

  it('data-i18n-aria taşımayan eleman ellenmez', () => {
    document.body.innerHTML = '<button id="p2" aria-label="DOKUNMA"></button>';
    setLanguage('tr');
    expect(document.getElementById('p2').getAttribute('aria-label')).toBe('DOKUNMA');
  });
});

describe('data-i18n-aria / -ph — TR↔EN parite kapısı', () => {
  it('_src.html\'deki her data-i18n-aria anahtarı iki sözlükte de var', () => {
    const keys = keysFor('data-i18n-aria');
    expect(keys.length).toBeGreaterThan(50); // katman gerçekten kurulu
    expect(keys.filter(k => I18N_CORE.tr[k] === undefined)).toEqual([]);
    expect(keys.filter(k => I18N_EN[k] === undefined)).toEqual([]);
  });

  it('_src.html\'deki her data-i18n-ph anahtarı iki sözlükte de var', () => {
    const keys = keysFor('data-i18n-ph');
    expect(keys.filter(k => I18N_CORE.tr[k] === undefined)).toEqual([]);
    expect(keys.filter(k => I18N_EN[k] === undefined)).toEqual([]);
  });

  it('aria.* anahtar seti TR ve EN\'de birebir aynı', () => {
    const tr = Object.keys(I18N_CORE.tr).filter(k => k.startsWith('aria.')).sort();
    const en = Object.keys(I18N_EN).filter(k => k.startsWith('aria.')).sort();
    expect(tr).toEqual(en);
  });

  it('JS-yönetimli elemanlara statik anahtar takılmamış (canlı değer ezilmesin)', () => {
    // Bu id/öznitelikleri taşıyan etiketler data-i18n-aria İÇERMEMELİ
    for (const marker of ['data-kt-ring', 'id="cl-model-pill"', 'id="send-btn"', 'id="ic-models-toggle"']) {
      const tags = SRC_HTML.match(new RegExp(`<[^>]*${marker.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&')}[^>]*>`, 'g')) || [];
      expect(tags.length).toBeGreaterThan(0); // marker gerçekten var
      for (const tag of tags) expect(tag).not.toContain('data-i18n-aria');
    }
  });
});
