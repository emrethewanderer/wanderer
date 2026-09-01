/**
 * DESTE · İNGİLİZCE OVERLAY (İç Çalışma 04 rev.2 · Y3 · Emre kararı 2026-08-19)
 * ─────────────────────────────────────────────────────────────────────────
 * Arayüz İngilizceyken kartın portresi Türkçe kalıyordu — ana mekanikte dil
 * kırığı. Bu dosya üç sözleşmeyi mühürler:
 *   1. PARİTE   — yayınlanan 12 kartın hepsi overlay'de, alan alan, eksiksiz.
 *   2. DONUKLUK — overlay mekaniğe (id/recipe/rarity/virtue) ASLA yazmaz.
 *   3. REGISTER — yorum cümleleri ihtimalsel kalır (may/can/often), kesin
 *      hüküm kurmaz. TR'deki [[ihtimalsel-dil-devrimi]]'nin EN karşılığı:
 *      `olunca` bir VAAT değil bir ihtimaldir.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { DESTE_OVERLAY } from '../js/parts/i18n/en-deste.js';
import { deckReady, getFullDeck } from '../js/parts/12b-kart-destesi.js';

const METIN = ['name', 'sub', 'whisper', 'lesson', 'portre', 'gercek', 'kok', 'olunca'];
const DIZI  = ['dusunceler', 'inanclar', 'hisler', 'davranislar'];
const DONUK = ['id', 'category', 'rarity', 'recipe', 'virtue', 'glyph', 'sigil', 'roman'];

let deck = [];
beforeAll(async () => { await deckReady(); deck = getFullDeck(); }, 30000);

describe('parite — yayınlanan kesitin tamamı çevrilmiş', () => {
  it('12 kartın hepsi overlay\'de karşılığını bulur', () => {
    expect(Object.keys(DESTE_OVERLAY)).toHaveLength(12);
    for (const c of deck) expect(DESTE_OVERLAY[c.id], c.id).toBeTruthy();
  });

  it('her kartın sekiz metin alanı da doludur — yarım çeviri yok', () => {
    for (const c of deck) {
      const en = DESTE_OVERLAY[c.id];
      for (const f of METIN) {
        expect(typeof en[f], `${c.id}.${f}`).toBe('string');
        expect(en[f].trim().length, `${c.id}.${f}`).toBeGreaterThan(0);
      }
    }
  });

  it('dört boyut dizisi TR ile aynı uzunluktadır', () => {
    for (const c of deck) {
      const en = DESTE_OVERLAY[c.id];
      for (const f of DIZI) {
        expect(Array.isArray(en[f]), `${c.id}.${f}`).toBe(true);
        expect(en[f].length, `${c.id}.${f}`).toBe((c[f] || []).length);
      }
    }
  });

  it('hiçbir alan Türkçe kaynaktan kopyalanmış değil', () => {
    for (const c of deck) {
      const en = DESTE_OVERLAY[c.id];
      for (const f of METIN) {
        if (f === 'sub') continue;              // "Wanderer" iki dilde de aynı
        expect(en[f], `${c.id}.${f}`).not.toBe(c[f]);
      }
    }
  });
});

describe('donukluk — overlay mekaniğe yazamaz', () => {
  it('hiçbir kartta donuk alan taşınmaz', () => {
    for (const [id, patch] of Object.entries(DESTE_OVERLAY)) {
      for (const f of DONUK) expect(patch, `${id}.${f}`).not.toHaveProperty(f);
    }
  });

  it('overlay uygulandıktan sonra reçete ve nadirlik değişmez', () => {
    const once = deck.map(c => ({ id: c.id, r: c.rarity, t: c.recipe?.threshold }));
    for (const c of deck) {
      const patch = DESTE_OVERLAY[c.id];
      for (const f of [...METIN, ...DIZI]) if (patch[f] !== undefined) c[f] = patch[f];
    }
    for (const s of once) {
      const c = deck.find(x => x.id === s.id);
      expect(c.rarity).toBe(s.r);
      expect(c.recipe?.threshold).toBe(s.t);
    }
  });
});

describe('register — ihtimalsel dil EN tarafında da korunur', () => {
  /* `olunca` kartın VAADİ değil ihtimalidir: TR'de "-ebilir", EN'de may/can.
     Kesin gelecek kipi ("you will become") bu alanda yasaktır. */
  it('her kartın olunca alanı ihtimal taşır', () => {
    for (const [id, p] of Object.entries(DESTE_OVERLAY)) {
      expect(/\b(may|can|often)\b/i.test(p.olunca), `${id}.olunca`).toBe(true);
    }
  });

  it('kitap kökleri sözlükteki resmî adları kullanır', () => {
    for (const [id, p] of Object.entries(DESTE_OVERLAY)) {
      expect(p.kok, id).toMatch(/^(Relationship Philosophy|Mindset Revolution)/);
      expect(p.kok, id).not.toMatch(/İlişki Felsefesi|Zihniyet Devrimi/);
    }
  });

  it('fısıltılar küçük harfle başlar — kart dilinin sabiti', () => {
    for (const [id, p] of Object.entries(DESTE_OVERLAY)) {
      expect(p.whisper[0], id).toBe(p.whisper[0].toLowerCase());
    }
  });
});
