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
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { I18N_LANGS } from '../js/parts/15-i18n.js';
import { I18N_CORE } from '../js/parts/15b-i18n-dict-core.js';

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

/*
 * SELF-TEST — "yakalamayan bir kapı, kapı değildir".
 *
 * EXTERNAL_LANGS bugün BOŞ (yalnız tr/en yayında), yani yukarıdaki describe
 * bir no-op'a düşüyor ve i18n-validate.mjs HİÇ koşmuyor: doğrulayıcıda bir
 * bozukluk olsa (ör. her koşuda sessizce exit 0 dönse) hiçbir test bunu
 * göremezdi. Bu blok gerçek EXTERNAL_LANGS listesine dokunmadan (yayın
 * kapsamı değişmiyor) doğrulayıcıyı sentetik bir dille — scripts/i18n-
 * validate.mjs'in --dizin bayrağıyla — doğrudan sınar.
 *
 * Fixture dizininde bir package.json (`{"type":"module"}`) da kurulur:
 * Node'un ESM çözümleyicisi .js dosyasının modül biçimini EN YAKIN
 * package.json'dan belirler; mkdtemp'in altında biri yoksa Node dosyayı
 * CommonJS sanıp `export const` söz dizimini reddeder.
 */
describe('i18n parity kapısı — self-test (i18n-validate.mjs sentetik dille gerçekten koşuyor mu)', () => {
  // Tam bir tek {{var}} taşıyan gerçek TR anahtarı seçilir — kırılma noktası
  // (değişken kaybı) böylece gerçek doğrulama mantığını sınar, uydurma bir
  // microcopy değil, sözlükte zaten var olan bir metindir.
  const varliAnahtar = Object.keys(I18N_CORE.tr).find(k => {
    const varlar = [...String(I18N_CORE.tr[k]).matchAll(/\{\{\w+\}\}/g)];
    return varlar.length === 1;
  });

  function fixtureKur(icerik) {
    const dizin = mkdtempSync(join(tmpdir(), 'wanderer-i18n-parity-'));
    writeFileSync(join(dizin, 'package.json'), '{"type":"module"}\n');
    writeFileSync(join(dizin, 'zzsinav-ui.js'), icerik);
    return dizin;
  }

  it('sınavın oturduğu TR anahtarı gerçekten tek {{var}} taşıyor', () => {
    expect(varliAnahtar).toBeTruthy();
  });

  it('değişkeni eksik bir çeviriyle i18n-validate.mjs --dizin gerçekten kırılıyor', () => {
    const trMetin = I18N_CORE.tr[varliAnahtar];
    const bozukMetin = trMetin.replace(/\{\{\w+\}\}/, '').trim() || 'sinav';
    const dizin = fixtureKur(
      `export const I18N_LANG = ${JSON.stringify({ [varliAnahtar]: bozukMetin })};\n`
    );
    try {
      const res = spawnSync('node', [VALIDATOR, '--lang', 'zzsinav', '--dizin', dizin], { cwd: ROOT, encoding: 'utf8' });
      expect(res.status).not.toBe(0);
      expect(res.stdout + res.stderr).toMatch(/\{\{var\}\} kümesi TR ile uyuşmuyor/);
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });

  it('yapısı sağlam bir çeviriyle i18n-validate.mjs --dizin temiz geçiyor', () => {
    const trMetin = I18N_CORE.tr[varliAnahtar];
    const dizin = fixtureKur(
      `export const I18N_LANG = ${JSON.stringify({ [varliAnahtar]: trMetin })};\n`
    );
    try {
      const res = spawnSync('node', [VALIDATOR, '--lang', 'zzsinav', '--dizin', dizin], { cwd: ROOT, encoding: 'utf8' });
      if (res.status !== 0) {
        throw new Error(`beklenmedik kırık:\n${res.stdout}${res.stderr}`);
      }
      expect(res.status).toBe(0);
    } finally {
      rmSync(dizin, { recursive: true, force: true });
    }
  });
});
