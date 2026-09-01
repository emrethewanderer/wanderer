// Gün Serisi (13r) — Wanderer LLM'e özel sohbet serisi (Üç Mühür'den bağımsız)
import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../js/state.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';
import {
  gsInit, gsRecordChatDay, gsCurrentStreak, gsRender, gsShowInfo,
} from '../js/parts/13r-w2-gun-serisi.js';

beforeEach(() => {
  localStorage.clear();
  // SafeStorage önbelleği (_kvCache) module-level Map — localStorage.clear()
  // bunu temizlemez; test izolasyonu için per-uid anahtarı elle sil.
  SafeStorage.remove('etw_gun_serisi_v1_test-user');
  S.currentUser = { id: 'test-user' };
  S.allSessions = {};
  S._currentLang = 'tr';
  delete S._gunSerisi;
});

describe('gsRecordChatDay / gsCurrentStreak', () => {
  it('starts at 0 with no recorded days', () => {
    gsInit();
    expect(gsCurrentStreak()).toBe(0);
  });

  it('returns 1 after recording today', () => {
    gsInit();
    gsRecordChatDay(new Date());
    expect(gsCurrentStreak()).toBe(1);
  });

  it('deduplicates repeated calls on the same day', () => {
    gsInit();
    gsRecordChatDay(new Date());
    gsRecordChatDay(new Date());
    expect(gsCurrentStreak()).toBe(1);
  });

  it('counts consecutive days correctly', () => {
    gsInit();
    [2, 1, 0].forEach(offset => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      gsRecordChatDay(d);
    });
    expect(gsCurrentStreak()).toBe(3);
  });

  it('breaks the streak on a gap', () => {
    gsInit();
    [3, 1, 0].forEach(offset => {
      const d = new Date();
      d.setDate(d.getDate() - offset);
      gsRecordChatDay(d);
    });
    expect(gsCurrentStreak()).toBe(2);
  });

  it('returns 0 once the last day is more than a day old', () => {
    gsInit();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    gsRecordChatDay(twoDaysAgo);
    expect(gsCurrentStreak()).toBe(0);
  });

  it('persists across reload (SafeStorage round-trip)', () => {
    gsInit();
    gsRecordChatDay(new Date());
    delete S._gunSerisi;
    gsInit();
    expect(gsCurrentStreak()).toBe(1);
  });
});

describe('gsInit — one-time seed from chat history', () => {
  it('backfills days from S.allSessions on first run', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    S.allSessions = {
      sess1: [
        { role: 'user', content: 'merhaba', created_at: new Date().toISOString() },
        { role: 'assistant', content: 'selam', created_at: new Date().toISOString() },
        { role: 'user', content: 'dün de yazmıştım', created_at: yesterday.toISOString() },
      ],
    };
    gsInit();
    expect(gsCurrentStreak()).toBe(2);
    expect(S._gunSerisi.seeded).toBe(true);
  });

  it('does not re-seed on a second init (no resurrection of deleted days)', () => {
    S.allSessions = {
      sess1: [{ role: 'user', content: 'hi', created_at: new Date().toISOString() }],
    };
    gsInit();
    // Kullanıcı deftere hiç dokunmasa da ikinci init tekrar taramaz — idempotent
    const daysAfterFirst = [...S._gunSerisi.days];
    gsInit();
    expect(S._gunSerisi.days).toEqual(daysAfterFirst);
  });

  it('does not seed when there is no chat history', () => {
    gsInit();
    expect(S._gunSerisi.days).toEqual([]);
    expect(S._gunSerisi.seeded).toBe(true);
  });
});

describe('gsRender — chat topbar badge', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="gs-streak-btn" style="display:none;">
        <span id="gs-streak-n">0</span>
      </button>
      <div id="toast"></div>
    `;
  });

  it('hides the badge when streak is 0', () => {
    gsInit();
    gsRender();
    expect(document.getElementById('gs-streak-btn').style.display).toBe('none');
  });

  it('shows the badge with the current count once a day is recorded', () => {
    gsInit();
    gsRecordChatDay(new Date());
    expect(document.getElementById('gs-streak-btn').style.display).toBe('inline-flex');
    expect(document.getElementById('gs-streak-n').textContent).toBe('1');
  });

  it('gsShowInfo toasts without throwing when streak is 0', () => {
    gsInit();
    expect(() => gsShowInfo()).not.toThrow();
    expect(document.getElementById('toast').classList.contains('show')).toBe(false);
  });

  it('gsShowInfo toasts the current streak', () => {
    gsInit();
    gsRecordChatDay(new Date());
    gsShowInfo();
    expect(document.getElementById('toast').classList.contains('show')).toBe(true);
  });
});
