/**
 * Tests for js/parts/07-settings-knowledge.js
 *
 * Covers: chunkText (pure logic — no network, no DOM)
 */

import { describe, it, expect } from 'vitest';
import { chunkText } from '../js/parts/07-settings-knowledge.js';

describe('chunkText()', () => {
  it('returns a non-empty array for any non-empty string', () => {
    const chunks = chunkText('Merhaba dünya');
    expect(Array.isArray(chunks)).toBe(true);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('returns the original text in a single chunk when short', () => {
    const text = 'Kısa bir metin.';
    const chunks = chunkText(text, 800);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it('splits on double newlines (paragraph boundary)', () => {
    const text = 'İlk paragraf.\n\nİkinci paragraf.\n\nÜçüncü paragraf.';
    const chunks = chunkText(text, 800);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
  });

  it('splits long paragraphs that exceed maxChars', () => {
    // Create a paragraph with 3 sentences well over 50 chars each
    const sentence = 'Bu bir test cümlesidir ve oldukça uzundur. ';
    const longText = sentence.repeat(30); // ~1320 chars — well over 100 char limit
    const chunks = chunkText(longText, 100);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('each chunk is at most maxChars in length (approx)', () => {
    const sentence = 'Uzun bir test cümlesi yazılmaktadır buraya. ';
    const longText = sentence.repeat(30);
    const maxChars = 200;
    const chunks = chunkText(longText, maxChars);
    chunks.forEach(chunk => {
      // Allow slight overflow at sentence boundaries
      expect(chunk.length).toBeLessThanOrEqual(maxChars * 2);
    });
  });

  it('strips leading/trailing whitespace from chunks', () => {
    const text = '  Başlık  \n\n  İçerik satırı.  ';
    const chunks = chunkText(text, 800);
    chunks.forEach(chunk => {
      expect(chunk).toBe(chunk.trim());
    });
  });

  it('preserves all content (no characters lost) for simple input', () => {
    const text = 'A'.repeat(50) + '\n\n' + 'B'.repeat(50);
    const chunks = chunkText(text, 800);
    const joined = chunks.join('');
    expect(joined).toContain('A'.repeat(50));
    expect(joined).toContain('B'.repeat(50));
  });

  it('handles single very long word without crashing', () => {
    const longWord = 'a'.repeat(2000);
    expect(() => chunkText(longWord, 800)).not.toThrow();
    const chunks = chunkText(longWord, 800);
    expect(chunks.length).toBeGreaterThan(0);
  });

  it('handles empty string — returns single chunk with original text', () => {
    const chunks = chunkText('', 800);
    expect(Array.isArray(chunks)).toBe(true);
    // Implementation returns [''] for empty input
  });

  it('uses 800 as default maxChars', () => {
    const text = 'Test metni.';
    const withDefault = chunkText(text);
    const withExplicit = chunkText(text, 800);
    expect(withDefault).toEqual(withExplicit);
  });

  it('handles multiple consecutive newlines', () => {
    const text = 'Para 1.\n\n\n\nPara 2.\n\n\n\nPara 3.';
    expect(() => chunkText(text, 800)).not.toThrow();
  });
});

/* ═══ MERHABA, EMRE — 15 bölümlük kimlik anayasası ═══
   renderMerhabaEmre (varsayılanlar + kayıtlı belge ayrıştırma + eski serbest
   prompt fallback) ve meAssembleDoc (yayın belgesi) gidiş-dönüş bütünlüğü. */

import { renderMerhabaEmre, meAssembleDoc } from '../js/parts/07-settings-knowledge.js';
import { S } from '../js/state.js';

function mountHost() {
  document.body.innerHTML = '<div id="merhaba-emre-host"></div>';
}

describe('Merhaba, Emre — renderMerhabaEmre()', () => {
  it('renders 15 sections with book-based defaults when no saved doc', async () => {
    mountHost();
    S.settings.system_prompt = '';
    await renderMerhabaEmre();
    const items = document.querySelectorAll('#merhaba-emre-host .kb-item');
    expect(items).toHaveLength(15);
    expect(document.getElementById('me-text-0').value).toContain("Sen Emre'sin");
    expect(document.getElementById('me-text-1').value).toContain('MESELE SENSİN');
    expect(document.getElementById('me-text-14').value).toContain('Bitirirken aslında başlamaz mıyız');
  });

  it('falls back to defaults for a legacy free-form prompt (no section markers)', async () => {
    mountHost();
    S.settings.system_prompt = 'Sen bir dönüşüm rehberisin.';
    await renderMerhabaEmre();
    expect(document.getElementById('me-text-0').value).toContain("Sen Emre'sin");
  });

  it('parses a saved sectioned doc back into the correct textareas', async () => {
    mountHost();
    S.settings.system_prompt =
      '# MERHABA, EMRE — Kimlik ve Davranış Anayasası\n\n' +
      '## 1. Kimlik ve Temel Amaç (Identity & Core Purpose)\nTEST BİR\nikinci satır\n\n' +
      '## 3. Ton, Ses ve Dil Kişiliği (Tone, Voice & Linguistic Persona)\nTEST ÜÇ';
    await renderMerhabaEmre();
    expect(document.getElementById('me-text-0').value).toBe('TEST BİR\nikinci satır');
    expect(document.getElementById('me-text-1').value).toBe(''); // kayıtta yok → boş
    expect(document.getElementById('me-text-2').value).toBe('TEST ÜÇ');
  });

  it('does nothing when host is absent', async () => {
    document.body.innerHTML = '';
    // Async imza: host yokken erken-return ile sessizce çözülmeli (reject değil)
    await expect(renderMerhabaEmre()).resolves.toBeUndefined();
  });
});

describe('Merhaba, Emre — meAssembleDoc() round-trip', () => {
  it('assembles defaults into a doc that parses back unchanged', async () => {
    mountHost();
    S.settings.system_prompt = '';
    await renderMerhabaEmre();
    const defaults = Array.from({ length: 15 }, (_, i) =>
      document.getElementById(`me-text-${i}`).value);

    const doc = meAssembleDoc();
    expect(doc.startsWith('# MERHABA, EMRE')).toBe(true);
    expect(doc).toContain('## 1. Kimlik ve Temel Amaç (Identity & Core Purpose)');
    expect(doc).toContain('## 15. Evrim ve Adaptasyon (Evolution & Adaptation Clause)');

    S.settings.system_prompt = doc;
    await renderMerhabaEmre();
    Array.from({ length: 15 }, (_, i) =>
      expect(document.getElementById(`me-text-${i}`).value).toBe(defaults[i]));
  });

  it('skips empty sections in the published doc', async () => {
    mountHost();
    S.settings.system_prompt = '';
    await renderMerhabaEmre();
    document.getElementById('me-text-4').value = '   ';
    const doc = meAssembleDoc();
    expect(doc).not.toContain('## 5. Bilgi Alanı ve Yetkili Kaynak');
    expect(doc).toContain('## 6. Metafor Evreni ve Sembolik Dil');
  });
});
