// Olmak İstediğin Kişi (10D) — saf-mantık testleri
//   - 10j Geçiş Alanı göç eşleyicisi (alan eşleme + state)
//   - olumlama birleştirici
//   - kart↔satır round-trip (Supabase omurgası)
//   - LLM tasarım normalize + fallback
//   - kristal eşikleri
//   - oikGetDesired öncelik sırası + seedHint
import { describe, it, expect, beforeEach, vi } from 'vitest';

// callLLM mock — import zinciri güvenliği (gerçek API çağrısı yok).
vi.mock('../js/parts/04-llm-hero-history.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, callLLM: vi.fn().mockResolvedValue('{}') };
});

// IndexedDB gerçek API — JSDOM'da yok, test ortamında mock'lanır (Geçiş
// Motoru F6: idbDeleteRecording zaten altyapıdaydı, hiç UI çağırmıyordu).
vi.mock('../js/parts/00b-indexeddb.js', () => ({
  idbSaveRecording: vi.fn().mockResolvedValue(true),
  idbGetRecording: vi.fn().mockResolvedValue(null),
  idbDeleteRecording: vi.fn().mockResolvedValue(true),
}));

import {
  _cardFromLegacyGecis, _composeOlumlama, _addEntry,
  _rowFromCard, _cardFromRow, _normalizeDesign, _oikDesignFallback,
  emptyCard, oikCrystalTierIndex, oikGetDesired, oikSeedDraft, CAT_KEYS,
  oikDeleteRecording, oikOpenDim, oikOpenDimPanel, CAT_SIGILS, _oikTasinanMaddeler,
} from '../js/parts/10D-olmak-istedigin.js';
import { idbDeleteRecording } from '../js/parts/00b-indexeddb.js';
import { S } from '../js/state.js';

beforeEach(() => {
  document.body.innerHTML = '';
  S._oik = {
    cards: [], activeCardId: null,
    readingLog: { lastMorning: null, lastNight: null, lastDayKey: null, streak: 0, totalReadings: 0 },
    crystalMilestone: 0, seedHint: null, migratedFromGecis: false,
  };
  S._personTransition = { desired: { description: '' }, last_updated: null };
});

describe('_cardFromLegacyGecis — 10j göç eşleyicisi', () => {
  const gc = {
    id: 'g_abc', created_at: '2026-06-01T00:00:00.000Z',
    olmakIstenenKisi: 'Cesaretle Olan',
    dusunceInanc: ['Ben cesurum', 'Korku bir işarettir'],
    duygu: ['huzur', 'kararlılık'],
    davranis: ['derin nefes al'],
    hasRecording: true,
  };

  it('alanları doğru eşler + id oik_ga_ öneki alır', () => {
    const c = _cardFromLegacyGecis(gc, true);
    expect(c.id).toBe('oik_ga_g_abc');
    expect(c.baslik).toBe('Cesaretle Olan');
    expect(c.inanclar.map(e => e.text)).toEqual(['Ben cesurum', 'Korku bir işarettir']);
    expect(c.duygular.map(e => e.text)).toEqual(['huzur', 'kararlılık']);
    expect(c.davranislar.map(e => e.text)).toEqual(['derin nefes al']);
    expect(c.inanclar.every(e => e.src === 'legacy')).toBe(true);
    expect(c.source).toBe('legacy_gecis');
    expect(c.has_recording).toBe(true);
    expect(c.created_at).toBe('2026-06-01T00:00:00.000Z');
  });

  it('olumlama = inanç satırlarının birleşimi', () => {
    const c = _cardFromLegacyGecis(gc, true);
    expect(c.olumlama).toBe('Ben cesurum Korku bir işarettir');
  });

  it('isActive bayrağı state belirler', () => {
    expect(_cardFromLegacyGecis(gc, true).state).toBe('active');
    expect(_cardFromLegacyGecis(gc, false).state).toBe('archived');
  });
});

describe('_composeOlumlama', () => {
  it('inanç + düşünce satırlarını birleştirir', () => {
    const card = { inanclar: [{ text: 'Ben sabırlıyım' }], dusunceler: [{ text: 'Acele hata getirir' }] };
    expect(_composeOlumlama(card)).toBe('Ben sabırlıyım Acele hata getirir');
  });
  it('boş kartta boş döner', () => {
    expect(_composeOlumlama(emptyCard())).toBe('');
  });
});

describe('_addEntry', () => {
  it('geçerli maddeyi ekler', () => {
    const card = emptyCard();
    expect(_addEntry(card, 'inanclar', 'Ben güçlüyüm', 'user')).toBe(true);
    expect(card.inanclar[0].text).toBe('Ben güçlüyüm');
  });
  it('duplike (normalize eşit) reddeder', () => {
    const card = emptyCard();
    _addEntry(card, 'inanclar', 'Ben güçlüyüm');
    expect(_addEntry(card, 'inanclar', 'ben güçlüyüm!')).toBe(false);
    expect(card.inanclar.length).toBe(1);
  });
  it('çok kısa ve geçersiz kategori reddeder', () => {
    const card = emptyCard();
    expect(_addEntry(card, 'inanclar', 'a')).toBe(false);
    expect(_addEntry(card, 'gecersiz', 'yeterince uzun')).toBe(false);
  });
});

describe('_rowFromCard ↔ _cardFromRow round-trip', () => {
  it('kart → satır → kart aynı özü korur', () => {
    const card = emptyCard('tasarim');
    card.id = 'oik_x'; card.baslik = 'Bağışlayan Tanık'; card.whisper = 'sessiz güç';
    _addEntry(card, 'dusunceler', 'Affetmek özgürlüktür');
    _addEntry(card, 'davranislar', 'bir cümle özür dile');
    card.olumlama = 'Ben affediyorum'; card.olumlama_duygu = 'huzur';
    card.version = 2; card.parent_id = 'oik_old'; card.state = 'archived';

    const row = _rowFromCard(card, 'uid-1');
    expect(row.user_id).toBe('uid-1');
    const back = _cardFromRow(row);
    expect(back.id).toBe('oik_x');
    expect(back.baslik).toBe('Bağışlayan Tanık');
    expect(back.dusunceler.map(e => e.text)).toEqual(['Affetmek özgürlüktür']);
    expect(back.davranislar.map(e => e.text)).toEqual(['bir cümle özür dile']);
    expect(back.olumlama).toBe('Ben affediyorum');
    expect(back.olumlama_duygu).toBe('huzur');
    expect(back.version).toBe(2);
    expect(back.parent_id).toBe('oik_old');
    expect(back.state).toBe('archived');
  });
});

describe('_oikTasinanMaddeler — yeniden tasarım "önce"yi öldürmez', () => {
  const ESKI = '2026-02-11T08:30:00.000Z';

  it('taşınan maddenin YAZIM TARİHİ korunur', () => {
    const out = _oikTasinanMaddeler([{ text: 'sınır koyarım', src: 'user', at: ESKI }]);
    expect(out[0].at).toBe(ESKI);
    expect(out[0].text).toBe('sınır koyarım');
  });

  it('tarihsiz/ham metin maddeye bugünün damgası düşer', () => {
    const once = Date.now();
    const out = _oikTasinanMaddeler(['yeni bir madde']);
    expect(out[0].text).toBe('yeni bir madde');
    expect(new Date(out[0].at).getTime()).toBeGreaterThanOrEqual(once - 1000);
  });

  it('src bilinçli olarak user olur — kullanıcı maddeyi kendi eliyle taşıdı', () => {
    const out = _oikTasinanMaddeler([{ text: 'emre önerdi', src: 'emre', at: ESKI }]);
    expect(out[0].src).toBe('user');
    expect(out[0].at).toBe(ESKI);       // köken değişse de yaş yalan söylemez
  });

  it('boş/eksik liste crash etmez', () => {
    expect(_oikTasinanMaddeler(null)).toEqual([]);
    expect(_oikTasinanMaddeler(undefined)).toEqual([]);
  });
});

describe('_normalizeDesign', () => {
  it('LLM çıktısını indirir, kullanıcı maddelerini korur (birleşim)', () => {
    const draft = emptyCard();
    _addEntry(draft, 'inanclar', 'Kullanıcının inancı', 'user');
    const out = _normalizeDesign({
      baslik: 'Yeni Ad', whisper: 'fısıltı',
      inanclar: ['Emre eklentisi'], dusunceler: ['bir düşünce'],
      olumlama: 'Ben olumluyum', olumlama_duygu: 'neşe',
    }, draft);
    expect(out.baslik).toBe('Yeni Ad');
    const inancTexts = out.inanclar.map(e => e.text);
    expect(inancTexts).toContain('Kullanıcının inancı');
    expect(inancTexts).toContain('Emre eklentisi');
    expect(out.olumlama).toBe('Ben olumluyum');
    expect(out.olumlama_duygu).toBe('neşe');
  });
});

describe('_oikDesignFallback', () => {
  it('başlık yoksa gaze cümlesinden türer + olumlama birleştirir', () => {
    const draft = emptyCard();
    _addEntry(draft, 'inanclar', 'Ben sakinim');
    const out = _oikDesignFallback(draft, 'Sakin ve dingin biri');
    expect(out.baslik).toBe('Sakin ve dingin biri');
    expect(out.olumlama).toBe('Ben sakinim');
  });
});

describe('oikCrystalTierIndex', () => {
  it('elmas seviyesine göre doğru eşik indeksi', () => {
    expect(oikCrystalTierIndex(0)).toBe(0);
    expect(oikCrystalTierIndex(49)).toBe(0);
    expect(oikCrystalTierIndex(50)).toBe(1);
    expect(oikCrystalTierIndex(150)).toBe(2);
    expect(oikCrystalTierIndex(699)).toBe(3);
    expect(oikCrystalTierIndex(700)).toBe(4);
  });
});

describe('oikGetDesired — öncelik sırası', () => {
  it('aktif kart varsa kartın başlığını döner', () => {
    const card = emptyCard(); card.id = 'oik_a'; card.baslik = 'Cesur'; card.whisper = 'ileri';
    S._oik.cards = [card]; S._oik.activeCardId = 'oik_a';
    const d = oikGetDesired();
    expect(d.name).toBe('Cesur');
    expect(d.whisper).toBe('ileri');
  });
  it('kart yoksa legacy desired.description', () => {
    S._personTransition.desired.description = 'Eski hedef';
    expect(oikGetDesired().name).toBe('Eski hedef');
  });
  it('hiçbiri yoksa null', () => {
    expect(oikGetDesired()).toBeNull();
  });
});

describe('oikSeedDraft', () => {
  it('seedHint alanlarını normalize eder', () => {
    oikSeedDraft({ olmakIstenenKisi: 'Sabırlı', dusunceInanc: ['Ben beklerim', ''], duygu: ['huzur'] });
    expect(S._oik.seedHint.baslik).toBe('Sabırlı');
    expect(S._oik.seedHint.inanclar).toEqual(['Ben beklerim']);
    expect(S._oik.seedHint.duygular).toEqual(['huzur']);
  });
});

describe('CAT_KEYS', () => {
  it('Portre ile aynı 4 kategori', () => {
    expect(CAT_KEYS).toEqual(['dusunceler', 'inanclar', 'duygular', 'davranislar']);
  });
});

// Geçiş Motoru FAZ 6 — idbDeleteRecording zaten altyapıdaydı, hiçbir UI
// çağırmıyordu; oikDeleteRecording bu boşluğu kapatır.
describe('oikDeleteRecording', () => {
  beforeEach(() => {
    S._oik.cards = [{ id: 'c1', state: 'active', has_recording: true }];
    S._oik.activeCardId = 'c1';
    document.body.innerHTML = `
      <button id="oik-play-btn" style="display:block"></button>
      <button id="oik-delete-btn" style="display:block"></button>`;
    idbDeleteRecording.mockClear();
  });

  it('aktif kart yoksa idbDeleteRecording\'i çağırmaz, crash etmez', async () => {
    S._oik.cards = [];
    S._oik.activeCardId = null;
    await expect(oikDeleteRecording()).resolves.not.toThrow();
    expect(idbDeleteRecording).not.toHaveBeenCalled();
  });

  it('aktif kartın kaydını idbDeleteRecording ile siler', async () => {
    await oikDeleteRecording();
    expect(idbDeleteRecording).toHaveBeenCalledWith('oik_c1');
  });

  it('card.has_recording\'i false yapar', async () => {
    await oikDeleteRecording();
    expect(S._oik.cards[0].has_recording).toBe(false);
  });

  it('play ve delete butonlarını gizler', async () => {
    await oikDeleteRecording();
    expect(document.getElementById('oik-play-btn').style.display).toBe('none');
    expect(document.getElementById('oik-delete-btn').style.display).toBe('none');
  });

  it('idbDeleteRecording reddedilirse (silme başarısız) crash etmez', async () => {
    idbDeleteRecording.mockRejectedValueOnce(new Error('idb fail'));
    await expect(oikDeleteRecording()).resolves.not.toThrow();
  });
});

/* ══════════════════════════════════════════════════════════════
   Boyut penceresi + Eşik köprüsü (02d) derin bağlantısı
   REGRESYON: ilk tasarım hub'da render edilmiş `#oik-dim-*` düğümüne
   scrollIntoView yapıyordu; canlıda ölçüldü ki düğüm o an DOM'da
   olmayabiliyor (ve sayfa uzadıkça kaydırma zaten kırılgan). Pencere
   artık DOM çapasına DEĞİL state'e bakar — hub hiç render edilmemişken
   bile açılır.
══════════════════════════════════════════════════════════════ */
describe('Boyut penceresi (oikOpenDimPanel) + köprü (oikOpenDim)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.switchView = vi.fn();
    const card = emptyCard();
    card.id = 'oik_dp'; card.baslik = 'Sabırlı Olan';
    ['bir', 'iki', 'üç', 'dört', 'beş'].forEach(x => _addEntry(card, 'duygular', x + ' duygusu'));
    S._oik.cards = [card];
    S._oik.activeCardId = 'oik_dp';
  });

  it('köprü switchView("oik") çağırır ve pencereyi HUB RENDER EDİLMEDEN açar', async () => {
    oikOpenDim('duygular');
    expect(window.switchView).toHaveBeenCalledWith('oik');
    // Hub'a ait hiçbir düğüm yok — pencere yine de açılmalı
    expect(document.getElementById('oik-dim-duygular')).toBeNull();
    await new Promise(r => setTimeout(r, 600));
    expect(document.getElementById('oik-dim-portal')).not.toBeNull();
  });

  it('pencere o boyutun TAMAMINI gösterir (vitrindeki 3 sınırı burada yok)', () => {
    oikOpenDimPanel('duygular');
    const rows = document.querySelectorAll('#oik-dim-portal .oik-dim-row');
    expect(rows.length).toBe(5);
  });

  it('ikinci çağrı ikinci pencere açmaz (çift-overlay guard)', () => {
    oikOpenDimPanel('duygular');
    oikOpenDimPanel('duygular');
    expect(document.querySelectorAll('#oik-dim-portal').length).toBe(1);
  });

  it('Escape pencereyi kapatır', async () => {
    oikOpenDimPanel('duygular');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await new Promise(r => setTimeout(r, 400));
    expect(document.getElementById('oik-dim-portal')).toBeNull();
  });

  it('boş boyutta pencere kapanmaz — davete döner', () => {
    oikOpenDimPanel('davranislar');
    const portal = document.getElementById('oik-dim-portal');
    expect(portal).not.toBeNull();
    expect(portal.querySelector('.oik-dp-empty')).not.toBeNull();
  });

  it('geçersiz kategori pencere açmaz', () => {
    oikOpenDimPanel('gecersiz');
    expect(document.getElementById('oik-dim-portal')).toBeNull();
  });

  it('dört boyutun her birinin bir mühür işareti var (köprü ikizsiz okur)', () => {
    expect(CAT_KEYS.every(k => typeof CAT_SIGILS[k] === 'string' && CAT_SIGILS[k].length > 0)).toBe(true);
  });
});
