// Ultra Seri (10u) — GÖRDÜN (Bakış) detektör + Gördüklerin Defteri testleri
//   - _hayalAllDone: Bakış YA DA iki derin kapı (Geçiş okuması/Hayal Seansı)
//   - usRecordVision/usGetTodayVision/usGetRecentVisions/usDeleteVision round-trip
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { S } from '../js/state.js';
import { localISODate } from '../js/parts/00a-infrastructure.js';
import {
  _bakisDone, _gecisDone, _hayalSeansDone, _hayalAllDone,
  usRecordVision, usGetTodayVision, usGetRecentVisions, usDeleteVision,
  usOpenDetail,
} from '../js/parts/10u-w2-ultra-seri.js';

function resetState() {
  S._currentLang = 'tr';
  S._hayalMuhru = { days: [], goal: null, goalReachedAt: null, cards: {}, bestStreak: 0, visions: {} };
  S._sozMuhru = { days: [], goal: null, goalReachedAt: null, cards: {}, bestStreak: 0 };
  S._ultraMeta = { lastUltraDay: null, ultraDays: [] };
  S._oik = { readingLog: { lastMorning: null, lastNight: null, lastDayKey: null } };
  S._gecisAlani = null;
  S._selfDialogue = { sessions: [] };
  S._hayalAlemi = { lastSessionAt: null };
}

beforeEach(() => {
  resetState();
});

describe('usRecordVision / usGetTodayVision / usGetRecentVisions / usDeleteVision', () => {
  it('cümle kaydeder ve aynı gün geri okunur', () => {
    usRecordVision('Bugün sakin kaldım.');
    const v = usGetTodayVision();
    expect(v).toBeTruthy();
    expect(v.text).toBe('Bugün sakin kaldım.');
  });

  it('sessiz bakış da kaydedilir (text null)', () => {
    usRecordVision('');
    const v = usGetTodayVision();
    expect(v).toBeTruthy();
    expect(v.text).toBeNull();
  });

  it('usGetRecentVisions yalnız dolu cümleleri sayarken kullanılabilir, boş anahtar da listede döner', () => {
    usRecordVision('');
    const recent = usGetRecentVisions(28);
    expect(recent.length).toBe(1);
    expect(recent[0].text).toBeNull();
  });

  it('usDeleteVision satırı siler', () => {
    usRecordVision('silinecek cümle');
    const today = usGetRecentVisions(1)[0].date;
    usDeleteVision(today);
    expect(usGetTodayVision()).toBeNull();
  });

  it('metin 240 karaktere kırpılır', () => {
    usRecordVision('a'.repeat(300));
    expect(usGetTodayVision().text.length).toBe(240);
  });
});

describe('_bakisDone', () => {
  it('bugün vizyon yoksa false', () => {
    expect(_bakisDone()).toBe(false);
  });
  it('bugün vizyon varsa (cümleli ya da sessiz) true', () => {
    usRecordVision('gördüm');
    expect(_bakisDone()).toBe(true);
  });
});

describe('_gecisDone / _hayalSeansDone', () => {
  it('_gecisDone: OİK okuma bugün yapılmışsa true', () => {
    S._oik.readingLog.lastMorning = localISODate();
    expect(_gecisDone()).toBe(true);
  });
  it('_gecisDone: hiçbir okuma yoksa false', () => {
    expect(_gecisDone()).toBe(false);
  });
  it('_hayalSeansDone: bugün seans yapılmışsa true', () => {
    S._hayalAlemi.lastSessionAt = new Date().toISOString();
    expect(_hayalSeansDone()).toBe(true);
  });
});

describe('_hayalAllDone — Bakış YA DA iki derin kapı', () => {
  it('hiçbiri yapılmamışsa false', () => {
    expect(_hayalAllDone()).toBe(false);
  });
  it('yalnız Bakış yeterlidir', () => {
    usRecordVision('');
    expect(_hayalAllDone()).toBe(true);
  });
  it('yalnız Geçiş okuması (OKU kapısı) yeterlidir — Bakış şart değil', () => {
    S._oik.readingLog.lastNight = localISODate();
    expect(_hayalAllDone()).toBe(true);
  });
  it('yalnız Hayal Seansı (derin kapı) yeterlidir — Bakış şart değil', () => {
    S._hayalAlemi.lastSessionAt = new Date().toISOString();
    expect(_hayalAllDone()).toBe(true);
  });
});

/* ════════════════════════════════════════════════════════════════════
   DETAY SAHNESİ (FAZ 9) — sahne sil-baştan
   Sökülen dekorun geri sızmadığını ve kart yüzlerinin TEK motordan
   (12c) geldiğini mühürler: bu ekranın kendi kart stili yazılırsa
   koleksiyon dili ikiye bölünür.
════════════════════════════════════════════════════════════════════ */
describe('usOpenDetail — sahne', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  const sahne = () => document.querySelector('#us-portal .us-scene');

  it('sütunlar, bahçe ve mermer sahnesi geri gelmez; gök tek kaynaktan', () => {
    usOpenDetail('hayal');
    const sc = sahne();
    expect(sc).toBeTruthy();
    expect(sc.querySelector('.us-scene-cols')).toBeNull();
    expect(sc.querySelector('.us-scene-garden')).toBeNull();
    // Gök ve gren --sky-scene/--grain-img tokenlarını taşıyan katmanlar
    expect(sc.querySelector('.us-scene-sky')).toBeTruthy();
    expect(sc.querySelector('.us-scene-grain')).toBeTruthy();
  });

  it('kilometre taşı kazanılmamışsa hero destenin SIRTINI basar (emoji kilit yok)', () => {
    usOpenDetail('hayal');
    const hero = document.querySelector('.us-hero-card');
    expect(hero.querySelector('.ikv-back')).toBeTruthy();
    expect(hero.querySelector('.ikv-card')).toBeNull();
    expect(document.querySelector('#us-portal').innerHTML).not.toContain('🔒');
  });

  it('kazanılmış taş varsa hero o taşın KART YÜZÜNÜ basar; ad EN SON taştan gelir', () => {
    S._hayalMuhru.cards = { 7: { at: '2026-08-01' } };
    usOpenDetail('hayal');
    const ilk = document.querySelector('.us-hero-card .ikv-name').textContent;
    expect(document.querySelector('.us-hero-card .ikv-card')).toBeTruthy();

    S._hayalMuhru.cards = { 7: { at: '2026-08-01' }, 15: { at: '2026-08-09' } };
    usOpenDetail('hayal');
    const sonra = document.querySelector('.us-hero-card .ikv-name').textContent;
    // İkinci taş kazanılınca hero yüzünü değiştirir — geride kalan 7'de donmaz
    expect(sonra).not.toBe(ilk);
  });

  it('galeri kartları 12c motorundan gelir; kilitli olan sırt taşır', () => {
    S._hayalMuhru.cards = { 7: { at: '2026-08-01' } };
    usOpenDetail('hayal');
    const kartlar = document.querySelectorAll('.us-mcard');
    expect(kartlar.length).toBe(8);
    expect(kartlar[0].querySelector('.ikv-card')).toBeTruthy();   // kazanıldı
    expect(kartlar[1].querySelector('.ikv-back')).toBeTruthy();   // kilitli
    // Paralel kart stilleri emekli
    expect(document.querySelector('.us-mcard-glyph')).toBeNull();
    expect(document.querySelector('.us-hero-glyph')).toBeNull();
  });

  it('yüzde tek çubukta söylenir — ikinci ilerleme çubuğu yok', () => {
    usOpenDetail('hayal');
    expect(document.querySelector('.us-prog')).toBeNull();
    expect(document.querySelector('.us-prog-fill')).toBeNull();
    expect(document.querySelector('.us-yolpos-fill')).toBeTruthy();
  });

  it('sahne metni sökülen dekoru anlatmaz (sütun/bahçe/mermer)', () => {
    for (const id of ['seri', 'hayal', 'soz']) {
      usOpenDetail(id);
      const line = document.querySelector('.us-hero-scene-line').textContent;
      expect(line).not.toMatch(/sütun|bahçe|mermer|avlu|sunak/i);
      expect(line.trim().length).toBeGreaterThan(0);
    }
  });

  it('Escape sahneyi kapatır (üçüncü çıkış)', () => {
    usOpenDetail('soz');
    expect(sahne()).toBeTruthy();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.querySelector('.us-scene--out')).toBeTruthy();
  });

  it('render edilmeyen #us-act-soz düğmesi sahnede aranmaz', () => {
    usOpenDetail('soz');
    expect(document.getElementById('us-act-soz')).toBeNull();
  });
});

/* Akşam Töreni'nin GÖRDÜN vuruşu törene doğrudan gider — istatistik
   sayfasına uğrayıp oradan törene dönen dolambaç kaldırıldı (K5).
   13h'nin portal DOM'unu kurmak yerine köprünün kendisi mühürlenir. */
describe('13h GÖRDÜN köprüsü — dolambaç yok', () => {
  it('at-hayal doğrudan gorOpen çağırır, usOpenDetail çağırmaz', () => {
    // jsdom ortamında import.meta.url http şemasıdır — yol kökten kurulur.
    const src = readFileSync(process.cwd() + '/js/parts/13h-aksam-toreni.js', 'utf8');
    const blok = src.slice(src.indexOf("getElementById('at-hayal')"));
    const gövde = blok.slice(0, blok.indexOf('});') + 3);
    expect(gövde).toContain('gorOpen');
    expect(gövde).not.toContain('usOpenDetail');
  });
});

/* ═══════════════════════════════════════════════════════════
   TOPLAM EMEK — zincir kopar, mühürlenen günler kalır
   ───────────────────────────────────────────────────────────
   10t her mühürde `S._seriMuhru.totalSeals`'i sayıyordu ama hiçbir yüzey
   onu okumuyordu (FAZ 8). Galeri satırına kanıt kapılı bağlandı: toplam
   yalnız en uzun zincirden FAZLAYSA konuşur — seri hiç kopmadıysa aynı
   sayıyı iki kez söylemiş olurduk. Aynı turda zincirin kendisi de kapıya
   alındı: hiç mühür yokken "en uzun zincir 0 gün" konuşmaz (§6.10).
═══════════════════════════════════════════════════════════ */
describe('galeri satırı — toplam emek yalnız zincirden fazlaysa konuşur', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    S._seriMuhru = { lastSealedDay: null, goal: null, goalReachedAt: null, cards: {}, bestStreak: 0, totalSeals: 0 };
  });

  const stat = () => document.querySelector('#us-portal .us-gallery-stat')?.textContent || '';

  it('seri hiç kopmadıysa toplam SUSAR — aynı sayı iki kez söylenmez', () => {
    S._seriMuhru.bestStreak = 12;
    S._seriMuhru.totalSeals = 12;
    usOpenDetail('seri');
    expect(stat()).toContain('en uzun zincir');
    expect(stat()).not.toContain('toplamda');
  });

  it('zincir koptuysa toplam emek görünür', () => {
    S._seriMuhru.bestStreak = 12;
    S._seriMuhru.totalSeals = 40;
    usOpenDetail('seri');
    expect(stat()).toContain('toplamda 40 gün');
  });

  it('hiç mühür yokken zincir de toplam da SUSAR — kanıtsız değer konuşmaz', () => {
    usOpenDetail('seri');
    expect(stat()).not.toContain('toplamda');
    // §6.10: "en uzun zincir 0 gün" bir ölçüm değil, boş bir sayaçtır.
    expect(stat()).not.toContain('en uzun zincir');
    // Taşlar kalır — koleksiyonun sıfırı kanıtlıdır, defterin gerçek hâlidir.
    expect(stat()).toContain('kilometre taşı');
  });

  it('hayal/söz defterlerinde toplam alanı yok — orada hiç konuşmaz', () => {
    S._hayalMuhru.bestStreak = 5;
    usOpenDetail('hayal');
    expect(stat()).not.toContain('toplamda');
  });
});
