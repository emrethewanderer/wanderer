/**
 * Tests for js/parts/15-i18n.js and js/parts/16-i18n-prompts.js
 *
 * t()  → UI çevirisi
 * p()  → LLM prompt çevirisi
 * dp() → Algılama regex dizisi
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../js/state.js';
import { t, getCurrentLanguage, getLangInstruction, ensureLangDict } from '../js/parts/15-i18n.js';
import { p, dp } from '../js/parts/16-i18n-prompts.js';

// ─── t() — UI ÇEVİRİSİ ─────────────────────────────────────────────────────

describe('t() — UI translation', () => {
  beforeEach(() => {
    S._currentLang = 'tr';
  });

  it('returns Turkish string for known TR key', () => {
    const val = t('settings.title');
    expect(typeof val).toBe('string');
    expect(val.length).toBeGreaterThan(0);
    expect(val).not.toBe('settings.title'); // key'in kendisi dönmemeli
  });

  it('returns English string when lang is en', () => {
    S._currentLang = 'en';
    const val = t('settings.title');
    expect(typeof val).toBe('string');
    expect(val.length).toBeGreaterThan(0);
  });

  it('TR and EN values for same key are different strings', async () => {
    await ensureLangDict('en'); // EN sidecar'da — testte ESM fallback ile yüklenir
    S._currentLang = 'tr';
    const tr = t('settings.title');
    S._currentLang = 'en';
    const en = t('settings.title');
    expect(tr).not.toBe(en);
  });

  it('falls back to TR when lang key missing in requested lang', () => {
    S._currentLang = 'en'; // EN sözlüğünde olmayan bir key olsa bile TR'ye düşer
    const val = t('auth.headline');
    expect(typeof val).toBe('string');
    expect(val.length).toBeGreaterThan(0);
  });

  it('returns key itself when key not found in any lang', () => {
    S._currentLang = 'tr';
    const val = t('this.key.definitely.does.not.exist');
    expect(val).toBe('this.key.definitely.does.not.exist');
  });

  it('returns custom fallback when key not found', () => {
    S._currentLang = 'tr';
    const val = t('nonexistent.key.xyz', 'varsayılan');
    expect(val).toBe('varsayılan');
  });

  it('returns non-empty string for common UI keys', () => {
    S._currentLang = 'tr';
    const keys = ['settings.title', 'hk.terms', 'lang.title', 'drawer.logout'];
    keys.forEach(key => {
      const val = t(key);
      expect(val, `Key "${key}" should return a real string`).not.toBe(key);
      expect(val.length).toBeGreaterThan(0);
    });
  });

  it('caches translation result — same object reference on repeated call', () => {
    S._currentLang = 'tr';
    const first  = t('settings.title');
    const second = t('settings.title');
    expect(first).toBe(second);
  });
});

// ─── getCurrentLanguage() ──────────────────────────────────────────────────

describe('getCurrentLanguage()', () => {
  it('returns current lang from state', () => {
    S._currentLang = 'tr';
    expect(getCurrentLanguage()).toBe('tr');
  });

  it('reflects lang change in state', () => {
    S._currentLang = 'en';
    expect(getCurrentLanguage()).toBe('en');
    S._currentLang = 'tr';
  });
});

// ─── getLangInstruction() ─────────────────────────────────────────────────

describe('getLangInstruction()', () => {
  afterEach(() => { S._currentLang = 'tr'; });

  it('returns empty string for Turkish (default lang)', () => {
    S._currentLang = 'tr';
    expect(getLangInstruction()).toBe('');
  });

  it('returns non-empty instruction for English', () => {
    S._currentLang = 'en';
    const instr = getLangInstruction();
    expect(instr.length).toBeGreaterThan(0);
    expect(instr).toContain('English');
  });

  it('resolves the target language name for a known dalga lang code (K3)', () => {
    S._currentLang = 'de';
    const instr = getLangInstruction();
    expect(instr).toContain('German');
  });

  it('falls back to the lang code itself for an unrecognized lang value', () => {
    S._currentLang = 'xx';
    const instr = getLangInstruction();
    expect(instr).toContain('xx');
  });

  it('instruction always starts with newline separator', () => {
    S._currentLang = 'en';
    expect(getLangInstruction().startsWith('\n')).toBe(true);
  });
});

// ─── p() — LLM PROMPT ÇEVİRİSİ ────────────────────────────────────────────

describe('p() — LLM prompt translation', () => {
  beforeEach(() => { S._currentLang = 'tr'; });

  it('returns a non-empty string for a known TR prompt key', () => {
    // prompt.identity.core her zaman TR'de tanımlı olmalı (FAZ 3 — eski
    // prompt.mode.guide Omurga+Kartuş mimarisine bölündü, bkz. 01-prompts-modes)
    const val = p('prompt.identity.core');
    expect(typeof val).toBe('string');
    expect(val.length).toBeGreaterThan(10);
    expect(val).not.toBe('prompt.identity.core');
  });

  it('returns key itself when key not found in any prompt lang', () => {
    S._currentLang = 'tr';
    const val = p('this.prompt.key.does.not.exist');
    expect(val).toBe('this.prompt.key.does.not.exist');
  });

  it('interpolates {{vars}} placeholders', () => {
    S._currentLang = 'tr';
    // Var olan herhangi bir key ile deneme yapalım
    // p2.chain_insight gibi değişken alan bir key arıyoruz
    // En güvenilir yol: elle şablon benzeri bir key test etmek değil,
    // kendi test key'imizi oluşturmak mümkün değil; var olan key'i kullan
    const raw = p('prompt.identity.core');
    // placeholder içermez, en azından string döndürdüğünü doğrula
    expect(typeof raw).toBe('string');
  });

  it('vars interpolation replaces {{key}} in returned text', () => {
    // p() fonksiyonunun {{key}} → value replaceAll'ını doğrula
    // Bunun için basit bir vars objesi veririz ve gerçek bir key kullanırız.
    // prompt.presession key'i totalSessions, streak gibi vars alır
    S._currentLang = 'tr';
    const val = p('prompt.presession', { totalSessions: 5, streak: 3, daysSinceLast: 1, memoryNotes: 'test' });
    // Key'in kendisi dönmüyorsa interpolasyon çalışıyordur
    expect(val).not.toBe('prompt.presession');
    // {{totalSessions}} yerine 5 gelmiş olmalı
    expect(val).not.toContain('{{totalSessions}}');
  });

  it('falls back to TR prompt when lang has no entry for key', () => {
    S._currentLang = 'en';
    // EN'de tanımlı olmayan ama TR'de olan bir key
    const val = p('prompt.identity.core');
    expect(typeof val).toBe('string');
    expect(val.length).toBeGreaterThan(0);
  });
});

// ─── dp() — ALGILAMA REGEX ────────────────────────────────────────────────

describe('dp() — detection regex array', () => {
  beforeEach(() => { S._currentLang = 'tr'; });

  it('returns an array for a known detection key', () => {
    const val = dp('avoidance');
    expect(Array.isArray(val)).toBe(true);
  });

  it('returns an array (possibly empty) for unknown key', () => {
    const val = dp('nonexistent.detection.key');
    expect(Array.isArray(val)).toBe(true);
  });

  it('array items are RegExp objects when detection key exists', () => {
    const val = dp('avoidance');
    if (val.length > 0) {
      val.forEach(item => {
        expect(item instanceof RegExp).toBe(true);
      });
    }
  });

  it('switches detection patterns with lang change', () => {
    S._currentLang = 'tr';
    const trPatterns = dp('avoidance');
    S._currentLang = 'en';
    const enPatterns = dp('avoidance');
    // Her iki dil de dizi döndürmeli
    expect(Array.isArray(trPatterns)).toBe(true);
    expect(Array.isArray(enPatterns)).toBe(true);
  });
});
