/**
 * Tests for js/parts/10s-w2-gunluk-ritus.js — Günlük Ritüel (Armağan + Söz).
 *
 * Kapsam: Elmas ekonomisi tam eşleşmesi (Armağan +3, Söz +5/+12/+20 seçilen
 * alan sayısına göre, Atlama −3, Akşam Hesabı tutulan söz başına +4),
 * glShouldRunToday/_glRitualApplicable gating (kriz günü susturması, bugün
 * zaten bitmiş, blocking overlay), Studio sahnesi kapısı (tören yalnız
 * #bugun-view'de; LLM ön-yüzünde 13r Gün Serisi sayar), glReckoningAvailable gating.
 *
 * 10g-w2-wanderer-game.js (awardElmas/getElmasSayisi/spendElmas) mock'lanır —
 * gerçek elmas ekonomisi çağrılarını tam kontrol + doğrulama için.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../js/parts/10g-w2-wanderer-game.js', () => ({
  awardElmas: vi.fn(),
  spendElmas: vi.fn(),
  getElmasSayisi: vi.fn(() => 0),
}));

import { S } from '../js/state.js';
import {
  glClaimGift, glConfirmSoz, glSkipSoz, glConfirmReckoning,
  glShouldRunToday, glReckoningAvailable, glRenderSozPopup, glRunDailyRitual,
  glOpenLibraryFromGift, glGiveSozNow,
} from '../js/parts/10s-w2-gunluk-ritus.js';
import { awardElmas, spendElmas } from '../js/parts/10g-w2-wanderer-game.js';

function resetState() {
  S.currentUser = { id: 'gl-test-user' };
  S._gunlukRitus = { date: null, gift: null, pledges: [], skipped: false, finished: false, reckoned: false };
  S._crisisDayKey = null;
  /* Tören Wanderer Studio'ya has: varsayılan zemin Bugün ekranıdır. Sahne
     olmadan glShouldRunToday/glRunDailyRitual bilerek susar (Studio kapısı). */
  document.body.innerHTML = '<div id="app-screen" style="display:block;">'
                          + '<div id="bugun-view" class="view active"></div></div>';
  awardElmas.mockClear();
  spendElmas.mockClear();
}

beforeEach(() => {
  resetState();
});

describe('glClaimGift — Armağan +3 elmas', () => {
  it('armağan toplanınca GIFT_ELMAS(3) ödüllendirilir', () => {
    S._gunlukRitus.gift = { elmas: 3, claimed: false, quotes: [], article: {} };
    glClaimGift();
    expect(awardElmas).toHaveBeenCalledWith(3, 'gunluk-armagan');
    expect(S._gunlukRitus.gift.claimed).toBe(true);
  });

  it('zaten toplanmışsa ikinci kez ödül verilmez (idempotent)', () => {
    S._gunlukRitus.gift = { elmas: 3, claimed: true, quotes: [], article: {} };
    glClaimGift();
    expect(awardElmas).not.toHaveBeenCalled();
  });

  it('gift yoksa no-op (throw etmez)', () => {
    S._gunlukRitus.gift = null;
    expect(() => glClaimGift()).not.toThrow();
    expect(awardElmas).not.toHaveBeenCalled();
  });
});

describe('glConfirmSoz — seçilen alan sayısına göre ödül (5/12/20)', () => {
  function mountPortal(selectedDomains) {
    const portal = document.createElement('div');
    portal.id = 'gl-portal';
    const sozler = selectedDomains.map(d => ({ domain: d, label: d, glyph: '◆', text: `${d} sözü` }));
    portal._sozler = sozler;
    portal._selected = Object.fromEntries(selectedDomains.map(d => [d, true]));
    portal._matched = Object.fromEntries(selectedDomains.map(d => [d, true]));
    document.body.appendChild(portal);
    return portal;
  }

  it('1 alan seçilince +5 elmas', () => {
    mountPortal(['bireysel']);
    glConfirmSoz();
    expect(awardElmas).toHaveBeenCalledWith(5, 'gunluk-soz');
    expect(S._gunlukRitus.pledges.length).toBe(1);
  });

  it('2 alan seçilince +12 elmas', () => {
    mountPortal(['bireysel', 'iliski']);
    glConfirmSoz();
    expect(awardElmas).toHaveBeenCalledWith(12, 'gunluk-soz');
  });

  it('3 alan seçilince +20 elmas', () => {
    mountPortal(['bireysel', 'iliski', 'is']);
    glConfirmSoz();
    expect(awardElmas).toHaveBeenCalledWith(20, 'gunluk-soz');
  });

  it('hiç eşleşen (matched) alan yoksa onay no-op, ödül verilmez', () => {
    const portal = document.createElement('div');
    portal.id = 'gl-portal';
    portal._sozler = [{ domain: 'bireysel', label: 'x', glyph: '◆', text: 'metin' }];
    portal._selected = { bireysel: true };
    portal._matched = { bireysel: false }; // seçili ama harfiyen eşleşmedi
    document.body.appendChild(portal);
    glConfirmSoz();
    expect(awardElmas).not.toHaveBeenCalled();
    expect(S._gunlukRitus.pledges.length).toBe(0);
  });

  it('onay sonrası gün "finished" işaretlenir', () => {
    mountPortal(['bireysel']);
    glConfirmSoz();
    expect(S._gunlukRitus.finished).toBe(true);
    expect(S._gunlukRitus.skipped).toBe(false);
  });
});

describe('glSkipSoz — Atlama −3 elmas', () => {
  it('atlayınca SKIP_PENALTY(3) düşülür', () => {
    document.body.innerHTML += '<div id="gl-portal"></div>';
    glSkipSoz();
    expect(spendElmas).toHaveBeenCalledWith(3, 'gunluk-soz-atla');
    expect(S._gunlukRitus.skipped).toBe(true);
    expect(S._gunlukRitus.pledges).toEqual([]);
    expect(S._gunlukRitus.finished).toBe(true);
  });
});

describe('glConfirmReckoning — Akşam Hesabı, tutulan söz başına +4', () => {
  function mountReckon(pledges, decisions) {
    S._gunlukRitus.pledges = pledges.map(d => ({ domain: d, label: d, text: `${d} sözü` }));
    const portal = document.createElement('div');
    portal.id = 'gl-portal';
    portal._reckon = decisions;
    document.body.appendChild(portal);
    return portal;
  }

  it('2 sözden 2\'si tutulduysa +8 (2×4) elmas', () => {
    mountReckon(['bireysel', 'iliski'], { bireysel: 'kept', iliski: 'kept' });
    glConfirmReckoning();
    expect(awardElmas).toHaveBeenCalledWith(8, 'gunluk-soz-tuttu');
    expect(S._gunlukRitus.reckoned).toBe(true);
  });

  it('2 sözden yalnız 1\'i tutulduysa +4 (1×4) elmas', () => {
    mountReckon(['bireysel', 'iliski'], { bireysel: 'kept', iliski: 'broke' });
    glConfirmReckoning();
    expect(awardElmas).toHaveBeenCalledWith(4, 'gunluk-soz-tuttu');
  });

  it('hiçbir söz tutulmadıysa ceza YOK — awardElmas hiç çağrılmaz (dürüstlük cezasız)', () => {
    mountReckon(['bireysel'], { bireysel: 'broke' });
    glConfirmReckoning();
    expect(awardElmas).not.toHaveBeenCalled();
    expect(S._gunlukRitus.reckoned).toBe(true); // yine de hesap kapanır
  });

  it('tüm sözler kararlandırılmadan onay no-op', () => {
    mountReckon(['bireysel', 'iliski'], { bireysel: 'kept' }); // iliski eksik
    glConfirmReckoning();
    expect(awardElmas).not.toHaveBeenCalled();
    expect(S._gunlukRitus.reckoned).toBe(false);
  });
});

describe('glShouldRunToday — gating', () => {
  it('app-screen görünür ve gün bitmemişse true', () => {
    S._gunlukRitus.date = null;
    expect(glShouldRunToday()).toBe(true);
  });

  it('bugün zaten "finished" ise false', () => {
    const d = new Date();
    S._gunlukRitus.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    S._gunlukRitus.finished = true;
    expect(glShouldRunToday()).toBe(false);
  });

  it('kriz gününde (S._crisisDayKey bugünle eşleşiyorsa) ritüel susar', () => {
    const d = new Date();
    const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    S._crisisDayKey = todayKey;
    expect(glShouldRunToday()).toBe(false);
  });

  it('app-screen gizliyse false', () => {
    document.getElementById('app-screen').style.display = 'none';
    expect(glShouldRunToday()).toBe(false);
  });

  it('bloklayıcı overlay (gl-portal zaten açık) varsa false', () => {
    document.body.innerHTML += '<div id="gl-portal"></div>';
    expect(glShouldRunToday()).toBe(false);
  });
});

describe('glReckoningAvailable — gating', () => {
  it('pledge yoksa false', () => {
    S._gunlukRitus.pledges = [];
    expect(glReckoningAvailable()).toBe(false);
  });

  it('bugünün pledge\'i varsa ve henüz reckoned değilse true', () => {
    const d = new Date();
    S._gunlukRitus.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    S._gunlukRitus.pledges = [{ domain: 'bireysel' }];
    S._gunlukRitus.reckoned = false;
    expect(glReckoningAvailable()).toBe(true);
  });

  it('zaten reckoned ise false', () => {
    const d = new Date();
    S._gunlukRitus.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    S._gunlukRitus.pledges = [{ domain: 'bireysel' }];
    S._gunlukRitus.reckoned = true;
    expect(glReckoningAvailable()).toBe(false);
  });

  it('pledge dünkü güne aitse (tarih uyuşmazsa) false', () => {
    S._gunlukRitus.date = '2020-01-01';
    S._gunlukRitus.pledges = [{ domain: 'bireysel' }];
    expect(glReckoningAvailable()).toBe(false);
  });
});

// ─── Tanıma Motoru (FAZ 1) — Gözlemevi sonuç raporu (00f wtOverlayClose) ────
describe('Tanıma Motoru — gunluk-ritus sonuc', () => {
  afterEach(() => { delete window.wtOverlayClose; });

  it("glConfirmSoz → wtOverlayClose('gunluk-ritus', 'muhur') — söz verildi", () => {
    const spy = vi.fn();
    window.wtOverlayClose = spy;
    const portal = document.createElement('div');
    portal.id = 'gl-portal';
    portal._sozler = [{ domain: 'bireysel', label: 'x', glyph: '◆', text: 'metin' }];
    portal._selected = { bireysel: true };
    portal._matched = { bireysel: true };
    document.body.appendChild(portal);
    glConfirmSoz();
    expect(spy).toHaveBeenCalledWith('gunluk-ritus', 'muhur');
  });

  it("glSkipSoz → wtOverlayClose('gunluk-ritus', 'kapat') — bilinçli vazgeçiş", () => {
    const spy = vi.fn();
    window.wtOverlayClose = spy;
    document.body.innerHTML += '<div id="gl-portal"></div>';
    glSkipSoz();
    expect(spy).toHaveBeenCalledWith('gunluk-ritus', 'kapat');
  });

  it("glConfirmReckoning → wtOverlayClose('gunluk-ritus', 'muhur') — akşam hesabı tamamlandı", () => {
    const spy = vi.fn();
    window.wtOverlayClose = spy;
    S._gunlukRitus.pledges = [{ domain: 'bireysel', label: 'x', text: 'y' }];
    const portal = document.createElement('div');
    portal.id = 'gl-portal';
    portal._reckon = { bireysel: 'kept' };
    document.body.appendChild(portal);
    glConfirmReckoning();
    expect(spy).toHaveBeenCalledWith('gunluk-ritus', 'muhur');
  });

  it("glOpenLibraryFromGift → wtOverlayClose('gunluk-ritus', 'kapat') — söz adımına değmeden sapma", () => {
    const spy = vi.fn();
    window.wtOverlayClose = spy;
    S._gunlukRitus.gift = { elmas: 3, claimed: true, quotes: [], article: {} };
    document.body.innerHTML += '<div id="gl-portal"></div>';
    glOpenLibraryFromGift();
    expect(spy).toHaveBeenCalledWith('gunluk-ritus', 'kapat');
  });
});

/* ══════════════════════════════════════════════════════════════
   YUVALI SÖZ (FAZ 3) — sözün gerçek ada/olaya değmesi.
   glRenderSozPopup jsdom'da gerçek DOM basar ve seçilen sözleri
   portal._sozler'e koyar; _yuvaliSoz export olmadığı için sözleşme
   buradan, gerçek render üzerinden doğrulanır.
══════════════════════════════════════════════════════════════ */
describe('Yuvalı söz — ad ve olay geçirme', () => {
  function sozleriAl() {
    glRenderSozPopup();
    const portal = document.getElementById('gl-portal');
    const out = {};
    (portal._sozler || []).forEach(s => { out[s.domain] = s; });
    portal.remove();
    return out;
  }

  beforeEach(() => {
    S._currentLang = 'tr';
    window.ihKisi = () => null;
    window.ihOlay = () => null;
    window.ihNeed = () => null;
  });

  it('kişi varsa ilişki sözü gerçek adı taşır', () => {
    window.ihKisi = (alan) => (alan === 'iliski' ? 'Ayşe' : null);
    const s = sozleriAl();
    expect(s.iliski.text).toContain('Ayşe');
    expect(s.iliski.key).toMatch(/^gl\.sozk\.iliski\./);
    expect(s.iliski.source).toBe('kisi');
  });

  it('kişi yoksa olay yuvası denenir', () => {
    window.ihOlay = (alan) => (alan === 'bireysel' ? 'sunum' : null);
    const s = sozleriAl();
    expect(s.bireysel.text).toContain('sunum');
    expect(s.bireysel.key).toMatch(/^gl\.sozo\.bireysel\./);
    expect(s.bireysel.source).toBe('olay');
  });

  it('kişi olaya tercih edilir (ad daha kişiseldir)', () => {
    window.ihKisi = (alan) => (alan === 'is' ? 'Kemal' : null);
    window.ihOlay = (alan) => (alan === 'is' ? 'toplantı' : null);
    const s = sozleriAl();
    expect(s.is.text).toContain('Kemal');
    expect(s.is.text).not.toContain('toplantı');
  });

  it('ne kişi ne olay varsa düz bankaya düşer', () => {
    const s = sozleriAl();
    expect(s.iliski.source).toBe('banka');
    expect(s.iliski.key).toMatch(/^gl\.soz\.iliski\./);
  });

  it('64 karakteri aşan yuvalı söz elenir — söz harfiyen yazılabilmeli', () => {
    // ihKisi'nin kendi eleği (16 karakter) atlanarak doğrudan uzun ad verilir:
    // _yuvaliSoz'un KENDİ uzunluk kapısı devreye girmeli.
    window.ihKisi = (alan) => (alan === 'iliski' ? 'Abdurrahman Muhammed Şerafettin' : null);
    const s = sozleriAl();
    expect(s.iliski.source).toBe('banka');
    expect(s.iliski.text.length).toBeLessThanOrEqual(64);
  });

  it('her söz uzunluk sözleşmesine uyar', () => {
    window.ihKisi = (alan) => (alan === 'iliski' ? 'Ayşe' : null);
    window.ihOlay = (alan) => (alan !== 'iliski' ? 'sunum' : null);
    Object.values(sozleriAl()).forEach(s => {
      expect(s.text.length).toBeLessThanOrEqual(64);
    });
  });
});

/* ══════════════════════════════════════════════════════════════
   MERTEBE (FAZ 4) — sözün ağırlığı seçimi yönlendirir.
══════════════════════════════════════════════════════════════ */
describe('Mertebe — sözün ağırlığı', () => {
  function sozleriAl() {
    glRenderSozPopup();
    const portal = document.getElementById('gl-portal');
    const out = {};
    (portal._sozler || []).forEach(s => { out[s.domain] = s; });
    portal.remove();
    return out;
  }

  beforeEach(() => {
    S._currentLang = 'tr';
    window.ihNeed = () => null;
    window.ihKisi = (alan) => (alan === 'iliski' ? 'Ayşe' : null);
    window.ihOlay = () => null;
    window.sdMertebe = () => 'adim';
  });

  it('adım mertebesinde çerçeve satırı BASILMAZ', () => {
    const s = sozleriAl();
    expect(s.iliski.mertebe).toBe('adim');
    expect(s.iliski.frame).toBe('');
  });

  it('dokunuş mertebesinde yuva kullanılmaz — söz küçülür', () => {
    window.sdMertebe = () => 'dokunus';
    const s = sozleriAl();
    expect(s.iliski.source).toBe('banka');
    expect(s.iliski.text).not.toContain('Ayşe');
    expect(s.iliski.frame).toContain('küçük');
  });

  it('eşik mertebesinde yuvalı söz tercih edilir', () => {
    window.sdMertebe = () => 'esik';
    const s = sozleriAl();
    expect(s.iliski.source).toBe('kisi');
    expect(s.iliski.text).toContain('Ayşe');
    expect(s.iliski.frame).toBeTruthy();
  });

  it('dokunuş mertebesinde banka varyantı sabitlenir (gün gün savrulmaz)', () => {
    window.sdMertebe = () => 'dokunus';
    const a = sozleriAl().bireysel;
    const b = sozleriAl().bireysel;
    expect(a.key).toBe(b.key);
    expect(a.key).toMatch(/\.0$/);
  });

  it('mertebe pledge ile birlikte saklanır', () => {
    window.sdMertebe = () => 'dokunus';
    glRenderSozPopup();
    const portal = document.getElementById('gl-portal');
    const soz = portal._sozler[0];
    portal._selected = { [soz.domain]: true };
    portal._matched = { [soz.domain]: true };
    glConfirmSoz();
    expect(S._gunlukRitus.pledges[0].mertebe).toBe('dokunus');
  });
});

/* ══════════════════════════════════════════════════════════════
   KENDİ SÖZÜN (FAZ 5) — söz kullanıcının kendi ağzından çıkar.
══════════════════════════════════════════════════════════════ */
describe('Kendi sözünü yaz', () => {
  beforeEach(() => {
    S._currentLang = 'tr';
    window.ihNeed = () => null;
    window.ihKisi = () => null;
    window.ihOlay = () => null;
    window.sdMertebe = () => 'adim';
  });

  function ac() {
    glRenderSozPopup();
    const portal = document.getElementById('gl-portal');
    const d = portal._sozler[0].domain;
    portal.querySelector(`.gl-area-head[data-domain="${d}"]`).click();
    return { portal, d };
  }

  it('düğme özel moda geçirir ve önerilen sözü soluklaştırır', () => {
    const { portal, d } = ac();
    portal.querySelector(`.gl-soz-own[data-domain="${d}"]`).click();
    const area = portal.querySelector(`.gl-area[data-domain="${d}"]`);
    expect(area.classList.contains('gl-area--own')).toBe(true);
    expect(portal._own[d]).toBe(true);
  });

  it('özel modda harfiyen eşleşme ARANMAZ, uzunluk yeter', () => {
    const { portal, d } = ac();
    portal.querySelector(`.gl-soz-own[data-domain="${d}"]`).click();
    const inp = portal.querySelector(`.gl-soz-input[data-domain="${d}"]`);
    inp.value = 'Bugün babama telefon edeceğim.';
    inp.dispatchEvent(new Event('input'));
    expect(portal._matched[d]).toBe(true);
  });

  it('çok kısa giriş sözü mühürletmez', () => {
    const { portal, d } = ac();
    portal.querySelector(`.gl-soz-own[data-domain="${d}"]`).click();
    const inp = portal.querySelector(`.gl-soz-input[data-domain="${d}"]`);
    inp.value = 'tamam';
    inp.dispatchEvent(new Event('input'));
    expect(portal._matched[d]).toBe(false);
  });

  it('mühürlenen söz kullanıcının kendi cümlesidir (source: user, key: null)', () => {
    const { portal, d } = ac();
    portal.querySelector(`.gl-soz-own[data-domain="${d}"]`).click();
    const inp = portal.querySelector(`.gl-soz-input[data-domain="${d}"]`);
    inp.value = 'Bugün babama telefon edeceğim.';
    inp.dispatchEvent(new Event('input'));
    glConfirmSoz();
    const p = S._gunlukRitus.pledges[0];
    expect(p.text).toBe('Bugün babama telefon edeceğim.');
    expect(p.source).toBe('user');
    expect(p.key).toBeNull();
  });

  it('özel moddan dönülünce yeniden harfiyen eşleşme aranır', () => {
    const { portal, d } = ac();
    const own = portal.querySelector(`.gl-soz-own[data-domain="${d}"]`);
    own.click();
    own.click();                                   // geri dön
    expect(portal._own[d]).toBe(false);
    const inp = portal.querySelector(`.gl-soz-input[data-domain="${d}"]`);
    inp.value = 'rastgele bir cümle';
    inp.dispatchEvent(new Event('input'));
    expect(portal._matched[d]).toBe(false);        // önerilen sözle eşleşmiyor
  });

  it('kendi sözü de uzunluk sözleşmesini aşamaz', () => {
    const { portal, d } = ac();
    portal.querySelector(`.gl-soz-own[data-domain="${d}"]`).click();
    const inp = portal.querySelector(`.gl-soz-input[data-domain="${d}"]`);
    inp.value = 'x'.repeat(200);
    inp.dispatchEvent(new Event('input'));
    glConfirmSoz();
    expect(S._gunlukRitus.pledges[0].text.length).toBeLessThanOrEqual(64);
  });
});

/* ══════════════════════════════════════════════════════════════
   SÖZ TERZİSİ (FAZ 6) — gece dokuması sözün ilk kaynağıdır.
══════════════════════════════════════════════════════════════ */
describe('Terzi dokuması önceliği', () => {
  function sozleriAl() {
    glRenderSozPopup();
    const portal = document.getElementById('gl-portal');
    const out = {};
    (portal._sozler || []).forEach(s => { out[s.domain] = s; });
    portal.remove();
    return out;
  }

  beforeEach(() => {
    S._currentLang = 'tr';
    window.ihNeed = () => null;
    window.ihKisi = (a) => (a === 'iliski' ? 'Ayşe' : null);
    window.ihOlay = () => null;
    window.sdMertebe = () => 'adim';
    window.stBugun = () => null;
  });

  it('dokuma varsa yuvalı sözün ÖNÜNE geçer', () => {
    window.stBugun = () => ({ iliski: 'Bugün Ayşe ile sessizce oturacağım.' });
    const s = sozleriAl();
    expect(s.iliski.text).toBe('Bugün Ayşe ile sessizce oturacağım.');
    expect(s.iliski.source).toBe('terzi');
  });

  it('terzi sözü eksen anahtarını korur (defter öğrenmeye devam eder)', () => {
    window.stBugun = () => ({ bireysel: 'Bugün ilk zor adımı atacağım.' });
    const s = sozleriAl();
    expect(s.bireysel.key).toMatch(/^gl\.terzi\.bireysel\./);
    // Eksen, anahtarın 4. parçasıdır — 13v _eksenOf bunu okuyabilmeli
    expect(s.bireysel.key.split('.')).toHaveLength(4);
  });

  it('dokunmayan alanlar bankaya düşer (kısmi dokuma)', () => {
    window.stBugun = () => ({ bireysel: 'Bugün ilk zor adımı atacağım.' });
    const s = sozleriAl();
    expect(s.bireysel.source).toBe('terzi');
    expect(s.iliski.source).toBe('kisi');       // yuva devrede
    expect(s.is.source).toBe('banka');
  });

  it('dokuma yoksa akış hiç değişmez', () => {
    const s = sozleriAl();
    expect(s.iliski.source).toBe('kisi');
    expect(s.bireysel.source).toBe('banka');
  });

  it('terzi sözü mühürlenince kaynağıyla saklanır', () => {
    window.stBugun = () => ({ bireysel: 'Bugün ilk zor adımı atacağım.' });
    glRenderSozPopup();
    const portal = document.getElementById('gl-portal');
    const soz = portal._sozler.find(s => s.domain === 'bireysel');
    portal._selected = { bireysel: true };
    portal._matched = { bireysel: true };
    glConfirmSoz();
    expect(S._gunlukRitus.pledges[0].source).toBe('terzi');
    expect(S._gunlukRitus.pledges[0].text).toBe(soz.text);
  });
});

/* ══════════════════════════════════════════════════════════════
   ARMAĞAN (FAZ 7) — sabah töreninin iki yarısı aynı yere bakar.
══════════════════════════════════════════════════════════════ */
describe('Armağan ihtiyaç motorunu tüketir', () => {
  beforeEach(() => {
    S._currentLang = 'tr';
    S._foundationsProfile = { oz_sevgi: { score: 10 }, oz_guven: { score: 90 } };
    window.ihNeedTop = () => null;
  });

  it('motor varsa armağanın ekseni motordan gelir', () => {
    window.ihNeedTop = () => ({ eksen: 'bolluk', alan: 'is', kanit: 'temel_enzayif', kaynak: 'temel', guc: 0.7 });
    glRunDailyRitual(true);
    expect(S._gunlukRitus.gift.foundationKey).toBe('bolluk');
    expect(S._gunlukRitus.gift.needAlan).toBe('is');
    document.getElementById('gl-portal')?.remove();
  });

  it('motor yoksa eski davranışa düşer (en zayıf KANITLI temel)', () => {
    /* Temeller kanıtlı olmak zorunda: eskiden hepsi 50 sayıldığı için
       hiç sinyal yokken de "en zayıf" ilk anahtara (oz_sevgi) düşüyordu —
       ritüelin ekseni ölçülmemiş bir zayıflıktan seçiliyordu (13y kapısı). */
    S._foundationsProfile = {
      oz_sevgi: { score: 20, signals_count: 3 },
      oz_saygi: { score: 80, signals_count: 3 },
    };
    glRunDailyRitual(true);
    expect(S._gunlukRitus.gift.foundationKey).toBe('oz_sevgi');
    document.getElementById('gl-portal')?.remove();
  });

  it('hiç kanıt yokken eksen UYDURULMAZ — varsayılana düşer', () => {
    S._foundationsProfile = {
      oz_sevgi: { score: 50, signals_count: 0 },
      oz_saygi: { score: 50, signals_count: 0 },
    };
    glRunDailyRitual(true);
    expect(S._gunlukRitus.gift.foundationKey).not.toBe('oz_sevgi');
    document.getElementById('gl-portal')?.remove();
  });

  it('motor patlasa bile armağan üretilir', () => {
    window.ihNeedTop = () => { throw new Error('motor yok'); };
    expect(() => glRunDailyRitual(true)).not.toThrow();
    expect(S._gunlukRitus.gift).toBeTruthy();
    document.getElementById('gl-portal')?.remove();
  });

  it('armağan kanıt satırı taşır ve DOM\'a basılır', () => {
    window.ihNeedTop = () => ({ eksen: 'oz_deger', alan: 'bireysel', kanit: 'temel_enzayif', kaynak: 'temel', guc: 0.7 });
    glRunDailyRitual(true);
    const why = document.querySelector('.gl-gift-why');
    expect(why).toBeTruthy();
    expect(why.textContent.trim().length).toBeGreaterThan(0);
    document.getElementById('gl-portal')?.remove();
  });

  it('varsayılan kaynakta kanıt satırı basılmaz', () => {
    window.ihNeedTop = () => ({ eksen: 'default', alan: 'bireysel', kanit: 'varsayilan', kaynak: 'varsayilan', guc: 0.2 });
    glRunDailyRitual(true);
    expect(document.querySelector('.gl-gift-why')).toBeNull();
    document.getElementById('gl-portal')?.remove();
  });
});

/* ════════════════════════════════════════════════════════════════════
   ÇALIŞMA KAĞIDI KÖPRÜSÜ (FAZ 10 dikişi)
   13b'nin "Bunu bugünün sözü yap →" düğmesi CÜMLEYİ de taşır; kullanıcı
   aynı sözü iki kez yazmaz. Mühür yine kullanıcıdadır — söz arka planda
   YAZILMAZ, yalnız hazır durur.
════════════════════════════════════════════════════════════════════ */
describe('glGiveSozNow — kağıttan gelen cümle', () => {
  beforeEach(() => {
    resetState();
    document.getElementById('gl-portal')?.remove();
  });

  it('öneriyle çağrılınca köprü satırı basılır ve ilk açılan alan cümleyi taşır', () => {
    const cumle = 'Bu hafta her sabah 20 dakika yürüyeceğim.';
    glGiveSozNow(cumle);
    const portal = document.getElementById('gl-portal');
    expect(portal.querySelector('.gl-soz-fromkagit')).toBeTruthy();

    portal.querySelector('.gl-area-head[data-domain="bireysel"]').click();
    const area = portal.querySelector('.gl-area[data-domain="bireysel"]');
    expect(area.querySelector('.gl-soz-input').value).toBe(cumle);
    expect(area.classList.contains('gl-area--own')).toBe(true);  // kendi-söz modu

    // Tek seferlik: ikinci alan öneriyi TEKRAR almaz
    portal.querySelector('.gl-area-head[data-domain="iliski"]').click();
    expect(portal.querySelector('.gl-area[data-domain="iliski"] .gl-soz-input').value).toBe('');
  });

  it('önerisiz çağrılınca köprü satırı yok ve alanlar boş açılır', () => {
    glGiveSozNow();
    const portal = document.getElementById('gl-portal');
    expect(portal.querySelector('.gl-soz-fromkagit')).toBeNull();
    portal.querySelector('.gl-area-head[data-domain="bireysel"]').click();
    const area = portal.querySelector('.gl-area[data-domain="bireysel"]');
    expect(area.querySelector('.gl-soz-input').value).toBe('');
    expect(area.classList.contains('gl-area--own')).toBe(false);
  });

  it('söz arka planda YAZILMAZ — köprü sonrası defter hâlâ boş', () => {
    glGiveSozNow('Bugün bir kez hayır diyeceğim.');
    expect(S._gunlukRitus.pledges.length).toBe(0);
  });
});

/* ════════════════════════════════════════════════════════════════════
   STUDIO SAHNESİ KAPISI — tören yalnız Bugün ekranında
   ────────────────────────────────────────────────────────────────────
   2026-08-20 kararı: "Günün Armağanı / Günün Sözü" Wanderer Studio'ya
   taşındı. Wanderer LLM ön-yüzünde (#chat-view) günün töreni açılmaz;
   orada yalnız 13r Gün Serisi (o gün bir mesaj) sayar. Sohbetin bağlamsal
   köprüleri (13a [ARAC:soz], 13b Çalışma Kağıdı → glGiveSozNow) BİLİNÇLİ
   olarak kapının dışındadır — Emre'nin kapsam kararı.
════════════════════════════════════════════════════════════════════ */
function sahne(id) {
  document.body.innerHTML = `<div id="app-screen" style="display:block;">`
                          + `<div id="${id}" class="view active"></div></div>`;
}

describe('Studio kapısı — günlük tören sahnesi', () => {
  it('LLM ön-yüzünde (#chat-view) glShouldRunToday false', () => {
    sahne('chat-view');
    S._gunlukRitus.date = null;
    expect(glShouldRunToday()).toBe(false);
  });

  it('Bugün ekranında (#bugun-view) glShouldRunToday true', () => {
    sahne('bugun-view');
    S._gunlukRitus.date = null;
    expect(glShouldRunToday()).toBe(true);
  });

  it('hiçbir view aktif değilken de susar (boot yarışı)', () => {
    document.body.innerHTML = '<div id="app-screen" style="display:block;"></div>';
    expect(glShouldRunToday()).toBe(false);
  });

  it('LLM ön-yüzünde glRunDailyRitual(false) portalı AÇMAZ', () => {
    sahne('chat-view');
    glRunDailyRitual(false);
    expect(document.getElementById('gl-portal')).toBeNull();
  });

  it('Bugün ekranında glRunDailyRitual(false) portalı açar', () => {
    sahne('bugun-view');
    glRunDailyRitual(false);
    expect(document.getElementById('gl-portal')).not.toBeNull();
  });

  it('sahne dışında retry nabzı KURULMAZ (bütçe Bugün için saklanır)', () => {
    vi.useFakeTimers();
    try {
      sahne('chat-view');
      glRunDailyRitual(false);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('force=true sahneyi atlar — tören köprüleri (10t/02d) kırılmaz', () => {
    sahne('chat-view');
    glRunDailyRitual(true);
    expect(document.getElementById('gl-portal')).not.toBeNull();
  });

  it('sohbetin söz köprüsü kapının DIŞINDA: glGiveSozNow chat-view\'de de açar', () => {
    sahne('chat-view');
    glGiveSozNow();
    expect(document.getElementById('gl-portal')).not.toBeNull();
  });
});
