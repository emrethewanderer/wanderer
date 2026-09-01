/**
 * Tests for the live directive layer (Emre'nin Sesi):
 *  - p() override precedence (16-i18n-prompts.js)
 *  - per-lang isolation (TR override must not leak to EN)
 *  - getPromptDefault() ignores overrides
 *  - moved inline directives exist in dict with TR/EN parity
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { S } from '../js/state.js';
import { p, setPromptOverrides, getPromptDefault, ensurePromptLang } from '../js/parts/16-i18n-prompts.js';
import { PROMPT_I18N_CORE } from '../js/parts/16b-i18n-prompt-dict-core.js';
// EN artık sidecar'da (16e) — core'da yalnız tr: var (bundle diyeti).
import { PROMPT_I18N_EN } from '../js/parts/16e-i18n-prompt-dict-en.js';

const MOVED_KEYS = [
  'prompt.portre.synth_system',
  'prompt.gecis_karti.design_system',
  'prompt.hayal_alemi.visualization',
  'prompt.gecis_alani.fill',
  'prompt.kendinle_konusma.reflection',
  'prompt.kendinle_konusma.reflection_inanc',
  'prompt.degerlendirme.summary',
  'prompt.geri_cagri.instruction',
];

describe('p() — canlı yönlendirme override katmanı', () => {
  beforeEach(() => { S._currentLang = 'tr'; });
  afterEach(() => { setPromptOverrides({}); });

  it('override yokken sözlük varsayılanını döner', () => {
    expect(p('prompt.default_system')).toBe(PROMPT_I18N_CORE.tr['prompt.default_system']);
  });

  it('override varsa sözlüğün önüne geçer', () => {
    setPromptOverrides({ tr: { 'prompt.default_system': 'Sen Emre the Wanderer\'sın — yeni ses.' } });
    expect(p('prompt.default_system')).toBe('Sen Emre the Wanderer\'sın — yeni ses.');
  });

  it('TR override EN kullanıcısına sızmaz', async () => {
    setPromptOverrides({ tr: { 'prompt.default_system': 'TR özel' } });
    S._currentLang = 'en';
    await ensurePromptLang('en'); // sidecar yok (test) → ESM fallback zincirini de sınar
    expect(p('prompt.default_system')).toBe(PROMPT_I18N_EN['prompt.default_system']);
  });

  it('override metnindeki {{değişkenler}} yerine konur', () => {
    setPromptOverrides({ tr: { 'prompt.degerlendirme.summary': 'Özel: {{title}} / {{qa}}' } });
    expect(p('prompt.degerlendirme.summary', { title: 'Hafta', qa: 'S: a\nC: b' }))
      .toBe('Özel: Hafta / S: a\nC: b');
  });

  it('sözlükte olmayan saf-DB anahtarı da çalışır (pArray genişletmesi)', () => {
    setPromptOverrides({ tr: { 'prompt.identity_message_8': 'Dokuzuncu söz.' } });
    expect(p('prompt.identity_message_8')).toBe('Dokuzuncu söz.');
  });

  it('ext dil sözlüğünde olmayan anahtar TR override\'ına düşer (mode.guide senaryosu)', () => {
    // de sözlüğünde silinmiş bir anahtar: dict.de yok → TR canlı sesi kazanmalı
    setPromptOverrides({ tr: { 'prompt.mode.guide': 'Güncel TR kimliği (canlı).' } });
    S._currentLang = 'de';
    expect(p('prompt.mode.guide')).toBe('Güncel TR kimliği (canlı).');
  });

  it('getPromptDefault override görmezden gelir (admin "Varsayılan" görünümü)', () => {
    setPromptOverrides({ tr: { 'prompt.default_system': 'Özel' } });
    expect(getPromptDefault('prompt.default_system', 'tr'))
      .toBe(PROMPT_I18N_CORE.tr['prompt.default_system']);
  });
});

describe('16b — modülden taşınan yönlendirmeler sözlükte', () => {
  it.each(MOVED_KEYS)('%s TR + EN paritesiyle var', (key) => {
    expect(typeof PROMPT_I18N_CORE.tr[key]).toBe('string');
    expect(PROMPT_I18N_CORE.tr[key].length).toBeGreaterThan(20);
    expect(typeof PROMPT_I18N_EN[key]).toBe('string');
    expect(PROMPT_I18N_EN[key].length).toBeGreaterThan(20);
  });

  it('TR ve EN sözlükleri anahtar kümesi olarak eşit (parite)', () => {
    const tr = Object.keys(PROMPT_I18N_CORE.tr).sort();
    const en = Object.keys(PROMPT_I18N_EN).sort();
    expect(en).toEqual(tr);
  });

  it('değişken taşıyan anahtarlarda TR/EN aynı {{değişkenleri}} içerir', () => {
    for (const key of MOVED_KEYS) {
      const vars = s => (String(s).match(/\{\{[a-zA-Z0-9_]+\}\}/g) || []).sort();
      expect(vars(PROMPT_I18N_EN[key])).toEqual(vars(PROMPT_I18N_CORE.tr[key]));
    }
  });
});
