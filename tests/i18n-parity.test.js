/**
 * i18n PARİTE KAPISI (Tüm Diller Native 2.0 · K2)
 *
 * I18N_LANGS'ta yayında olan her DIŞ dil (tr/en hariç — bunlar core dosyalarda
 * yaşar, js/parts/i18n/ dosya-tabanlı doğrulayıcının kapsamı dışında) için
 * scripts/i18n-validate.mjs'i koşar. Yayındaki bir dilin dosyaları bozulursa
 * (eksik anahtar, {{var}} kayması, yasak alana dokunma, vb.) bu test kırmızı
 * olur — dalga kapısından geçmiş bir dil asla sessizce eksik kalamaz.
 *
 * NOT: dosya adı .spec.js değil .test.js — vite.config.js'teki vitest include
 * deseni yalnız tests/**\/*.test.js'i toplar (bkz. dalga kapanış raporu).
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { I18N_LANGS } from '../js/parts/15-i18n.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const VALIDATOR = join(ROOT, 'scripts/i18n-validate.mjs');

const EXTERNAL_LANGS = Object.keys(I18N_LANGS).filter(l => l !== 'tr' && l !== 'en');

describe('i18n parity — yayındaki her dış dil i18n-validate.mjs\'ten 0 hatayla geçer', () => {
  if (!EXTERNAL_LANGS.length) {
    it('henüz yayında dış dil yok (I18N_LANGS = tr/en) — kapı boşta bekliyor', () => {
      expect(EXTERNAL_LANGS).toEqual([]);
    });
  }

  for (const lang of EXTERNAL_LANGS) {
    it(`${lang}: i18n-validate.mjs --lang ${lang} temiz`, () => {
      const res = spawnSync('node', [VALIDATOR, '--lang', lang], { cwd: ROOT, encoding: 'utf8' });
      if (res.status !== 0) {
        throw new Error(`i18n-validate --lang ${lang} başarısız (exit ${res.status}):\n${res.stdout}${res.stderr}`);
      }
      expect(res.status).toBe(0);
    });
  }
});
