// Kişilerin Kişileri (10C) — saf-mantık testleri
import { describe, it, expect, beforeEach, vi } from 'vitest';
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

/* ══════════════════════════════════════════════════════════════
   ROZET — sfRefreshRoomPulse (FAZ 11, İç Çalışma 12)
   ───────────────────────────────────────────────────────────
   sb her testte SIFIRLANIR (vi.resetModules); `.eq/.in/.gt/.neq/.limit`
   GERÇEK filtreleme yapan bir taklit üstünde çalışır — yalnız "çağrıldı mı"
   değil, üretim kodunun kurduğu sorgunun DOĞRU satırı seçtiği ölçülür.
══════════════════════════════════════════════════════════════ */
describe('sfRefreshRoomPulse — kartına biri dokundu mu (rozet)', () => {
  let _tablo;

  function chainFor(rows) {
    let f = [...(rows || [])];
    const o = {
      select: () => o,
      eq:   (k, v) => { f = f.filter(r => r[k] === v); return o; },
      in:   (k, vs) => { f = f.filter(r => vs.includes(r[k])); return o; },
      gt:   (k, v) => { f = f.filter(r => r[k] > v); return o; },
      lt:   (k, v) => { f = f.filter(r => r[k] < v); return o; },
      neq:  (k, v) => { f = f.filter(r => r[k] !== v); return o; },
      order: () => o,
      limit: (n) => { f = f.slice(0, n); return o; },
      then: (res, rej) => Promise.resolve({ data: f, error: null }).then(res, rej),
    };
    return o;
  }

  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock('../js/config.js');
    _tablo = { paylasilan_kartlar: [], paylasim_begenileri: [], paylasim_yorumlari: [] };
    document.body.innerHTML = '<span id="ws-sf-pulse"></span>';
  });

  async function kurulum() {
    vi.doMock('../js/config.js', async (importOriginal) => {
      const actual = await importOriginal();
      return { ...actual, sb: { from: (table) => chainFor(_tablo[table]) } };
    });
    const { S } = await import('../js/state.js');
    const { SafeStorage } = await import('../js/parts/00a-infrastructure.js');
    const sosyal = await import('../js/parts/10C-sosyal-feed.js');
    return { S, SafeStorage, ...sosyal };
  }

  it('DOM\'da rozet elementi yoksa sessizce düşer', async () => {
    document.body.innerHTML = '';
    const { S, sfRefreshRoomPulse } = await kurulum();
    S.currentUser = { id: 'u1' };
    await expect(sfRefreshRoomPulse()).resolves.toBeUndefined();
  });

  it('uid yoksa (anon) rozet yanmaz', async () => {
    const { S, sfRefreshRoomPulse } = await kurulum();
    S.currentUser = null;
    await sfRefreshRoomPulse();
    expect(document.getElementById('ws-sf-pulse').classList.contains('active')).toBe(false);
  });

  it('kullanıcının paylaştığı kart yoksa rozet yanmaz', async () => {
    const { S, sfRefreshRoomPulse } = await kurulum();
    S.currentUser = { id: 'u1' };
    await sfRefreshRoomPulse();
    expect(document.getElementById('ws-sf-pulse').classList.contains('active')).toBe(false);
  });

  it('ilk çalıştırmada damga yoksa geçmiş "yeni" sayılmaz — damga VE beğeni tabanı şimdi kurulur', async () => {
    const { S, SafeStorage, sfRefreshRoomPulse } = await kurulum();
    S.currentUser = { id: 'u1' };
    _tablo.paylasilan_kartlar = [{ id: 1, owner_user_id: 'u1', like_count: 3 }];
    _tablo.paylasim_yorumlari = [{ id: 'c1', card_id: 1, user_id: 'u2', created_at: '2020-01-01T00:00:00Z' }];
    await sfRefreshRoomPulse();
    expect(document.getElementById('ws-sf-pulse').classList.contains('active')).toBe(false);
    expect(SafeStorage.get('etw_sosyal_gorulen_v1_u1')).toBeTruthy();
    expect(SafeStorage.get('etw_sosyal_begeni_taban_v1_u1')).toBe(3);
  });

  it('damgadan SONRA başkasının yorumu varsa rozet yanar', async () => {
    const { S, SafeStorage, sfRefreshRoomPulse } = await kurulum();
    S.currentUser = { id: 'u1' };
    SafeStorage.set('etw_sosyal_gorulen_v1_u1', '2026-01-01T00:00:00Z');
    _tablo.paylasilan_kartlar = [{ id: 1, owner_user_id: 'u1', like_count: 0 }];
    _tablo.paylasim_yorumlari = [{ id: 'c1', card_id: 1, user_id: 'u2', created_at: '2026-06-01T00:00:00Z' }];
    await sfRefreshRoomPulse();
    expect(document.getElementById('ws-sf-pulse').classList.contains('active')).toBe(true);
  });

  /* FAZ 12 — rozetin "metni" erişilebilir adıdır. Boş bir `<span>` ekran
     okuyucuda hiç duyurulmaz: haber yalnız GÖREN kullanıcıya ulaşıyordu.
     Ad JS'ten verilir çünkü statik bir `data-i18n-aria` sönükken de
     duyururdu — `opacity: 0` ekran okuyucuyu susturmaz. */
  it('rozet yanınca erişilebilir ad DA gelir, sönünce KALKAR', async () => {
    const { S, SafeStorage, sfRefreshRoomPulse } = await kurulum();
    S.currentUser = { id: 'u1' };
    SafeStorage.set('etw_sosyal_gorulen_v1_u1', '2026-01-01T00:00:00Z');
    _tablo.paylasilan_kartlar = [{ id: 1, owner_user_id: 'u1', like_count: 0 }];
    _tablo.paylasim_yorumlari = [{ id: 'c1', card_id: 1, user_id: 'u2', created_at: '2026-06-01T00:00:00Z' }];
    await sfRefreshRoomPulse();
    const el = document.getElementById('ws-sf-pulse');
    expect(el.getAttribute('aria-label')).toBeTruthy();
    // Ad da push metniyle aynı sınırı taşır: sayı yok, dokunuşun türü yok.
    expect(el.getAttribute('aria-label')).not.toMatch(/\d/);

    // Kullanıcı halka pazarına girdi → damga tazelenir → rozet söner.
    _tablo.paylasim_yorumlari = [];
    await sfRefreshRoomPulse();
    expect(el.classList.contains('active')).toBe(false);
    expect(el.hasAttribute('aria-label'), 'sönük rozet hâlâ bir haber duyuruyor')
      .toBe(false);
  });

  it('kendi kartına kendi yorumu rozeti yakmaz (kendi etkileşimi hariç)', async () => {
    const { S, SafeStorage, sfRefreshRoomPulse } = await kurulum();
    S.currentUser = { id: 'u1' };
    SafeStorage.set('etw_sosyal_gorulen_v1_u1', '2026-01-01T00:00:00Z');
    _tablo.paylasilan_kartlar = [{ id: 1, owner_user_id: 'u1', like_count: 0 }];
    _tablo.paylasim_yorumlari = [{ id: 'c1', card_id: 1, user_id: 'u1', created_at: '2026-06-01T00:00:00Z' }];
    await sfRefreshRoomPulse();
    expect(document.getElementById('ws-sf-pulse').classList.contains('active')).toBe(false);
  });

  it('damgadan ÖNCEki bir yorum rozeti yakmaz (zaten görülmüş sayılır)', async () => {
    const { S, SafeStorage, sfRefreshRoomPulse } = await kurulum();
    S.currentUser = { id: 'u1' };
    SafeStorage.set('etw_sosyal_gorulen_v1_u1', '2026-06-01T00:00:00Z');
    _tablo.paylasilan_kartlar = [{ id: 1, owner_user_id: 'u1', like_count: 0 }];
    _tablo.paylasim_yorumlari = [{ id: 'c1', card_id: 1, user_id: 'u2', created_at: '2026-01-01T00:00:00Z' }];
    await sfRefreshRoomPulse();
    expect(document.getElementById('ws-sf-pulse').classList.contains('active')).toBe(false);
  });

  it('RLS tuzağı: paylasim_begenileri satır bazında SORULMAZ — beğeni AGREGAT sayaç deltasıyla okunur', async () => {
    // paylasim_begenileri RLS'i yalnız "own read" verir (own read policy,
    // 000_wanderer_schema.sql:866) — başkasının beğeni SATIRI istemciden hiç
    // görünmez. Taban 2 iken sayaç 5'e çıktıysa (başka biri beğenmiş demektir)
    // rozet yanmalı; bu iddia yalnız aggregate delta doğruysa geçer.
    const { S, SafeStorage, sfRefreshRoomPulse } = await kurulum();
    S.currentUser = { id: 'u1' };
    SafeStorage.set('etw_sosyal_gorulen_v1_u1', '2026-01-01T00:00:00Z');
    SafeStorage.set('etw_sosyal_begeni_taban_v1_u1', 2);
    _tablo.paylasilan_kartlar = [{ id: 1, owner_user_id: 'u1', like_count: 5 }];
    await sfRefreshRoomPulse();
    expect(document.getElementById('ws-sf-pulse').classList.contains('active')).toBe(true);
  });

  it('beğeni sayacı tabanla AYNIYSA (yeni beğeni yok) rozet yanmaz', async () => {
    const { S, SafeStorage, sfRefreshRoomPulse } = await kurulum();
    S.currentUser = { id: 'u1' };
    SafeStorage.set('etw_sosyal_gorulen_v1_u1', '2026-01-01T00:00:00Z');
    SafeStorage.set('etw_sosyal_begeni_taban_v1_u1', 5);
    _tablo.paylasilan_kartlar = [{ id: 1, owner_user_id: 'u1', like_count: 5 }];
    await sfRefreshRoomPulse();
    expect(document.getElementById('ws-sf-pulse').classList.contains('active')).toBe(false);
  });

  it('loadSosyalView halka pazarına girişte rozetin görüldü damgasını VE beğeni tabanını şimdiye çeker', async () => {
    document.body.innerHTML = '<span id="ws-sf-pulse" class="active"></span><div id="sosyal-body"></div>';
    const { S, SafeStorage, loadSosyalView } = await kurulum();
    S.currentUser = { id: 'u1' };
    _tablo.paylasilan_kartlar = [{ id: 1, owner_user_id: 'u1', like_count: 7 }];
    await loadSosyalView();
    expect(document.getElementById('ws-sf-pulse').classList.contains('active')).toBe(false);
    expect(SafeStorage.get('etw_sosyal_gorulen_v1_u1')).toBeTruthy();
    expect(SafeStorage.get('etw_sosyal_begeni_taban_v1_u1')).toBe(7);
  });
});
