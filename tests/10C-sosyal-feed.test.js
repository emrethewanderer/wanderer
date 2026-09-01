// Kişilerin Kişileri (10C) — saf-mantık testleri
import { describe, it, expect } from 'vitest';
import { _rankScore, _sortByRank } from '../js/parts/10C-sosyal-feed.js';

describe('_rankScore', () => {
  it('beğeni iki, yorum ve kayıt birer puan', () => {
    expect(_rankScore({ like_count: 10, comment_count: 3, save_count: 2 })).toBe(25);
  });
  it('eksik alanlar 0 sayılır', () => {
    expect(_rankScore({})).toBe(0);
    expect(_rankScore({ like_count: 5 })).toBe(10);
  });
  it('null/undefined güvenli', () => {
    expect(_rankScore({ like_count: null, comment_count: undefined, save_count: 4 })).toBe(4);
  });
});

describe('_sortByRank', () => {
  it('puana göre azalan sırala (eşitlikte yeni önce)', () => {
    const cards = [
      { id: 1, like_count: 1, comment_count: 0, save_count: 0, shared_at: '2026-06-20T10:00:00Z' }, //  2
      { id: 2, like_count: 5, comment_count: 0, save_count: 0, shared_at: '2026-06-20T11:00:00Z' }, // 10
      { id: 3, like_count: 3, comment_count: 4, save_count: 0, shared_at: '2026-06-20T09:00:00Z' }, // 10
      { id: 4, like_count: 8, comment_count: 0, save_count: 2, shared_at: '2026-06-20T08:00:00Z' }, // 18
    ];
    const out = _sortByRank(cards);
    // 4 (18) > 2 (10, daha yeni) > 3 (10, daha eski) > 1 (2)
    expect(out.map(c => c.id)).toEqual([4, 2, 3, 1]);
  });

  it('eşit puanda yeni paylaşım önce', () => {
    const cards = [
      { id: 1, like_count: 1, comment_count: 0, save_count: 0, shared_at: '2026-06-20T10:00:00Z' },
      { id: 2, like_count: 1, comment_count: 0, save_count: 0, shared_at: '2026-06-20T11:00:00Z' },
    ];
    expect(_sortByRank(cards).map(c => c.id)).toEqual([2, 1]);
  });

  it('orijinal diziyi mutate etmez', () => {
    const cards = [
      { id: 1, like_count: 1 },
      { id: 2, like_count: 5 },
    ];
    _sortByRank(cards);
    expect(cards.map(c => c.id)).toEqual([1, 2]);
  });

  it('boş/null girdi güvenli', () => {
    expect(_sortByRank([])).toEqual([]);
    expect(_sortByRank(null)).toEqual([]);
    expect(_sortByRank(undefined)).toEqual([]);
  });
});
