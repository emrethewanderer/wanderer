/**
 * Tests for js/parts/10h-w2-library-challenges.js — SEFER (21 günlük yolculuk).
 *
 * Bu süitin asıl sebebi GÜN KAPISI. `completeChallengeDay` FAZ 8'e kadar
 * hiç çağrılmıyordu (sıfır çağıran); yüzeyi ilk kez açılırken kapısız
 * hâliyle bırakılsa 21 günlük yol arka arkaya 21 dokunuşla "bitirilebilir"
 * olurdu ve mühür bir şey ölçmez olurdu. İkinci kural gerçeklik: her günde
 * `nefes_now`'ı rastgele düşüren yazım kaldırıldı — ne beyan ne ölçüm olan
 * bir sayı DB'ye de yazılmaz (§6.10).
 *
 * config.js (sb) kısmi mock'lanır — ağa çıkılmaz, update payload'ı tam
 * görülür.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

/* Supabase zinciri SADIK taklit edilir: `completeChallengeDay` mühürden sonra
   `loadChallenges()` ile GERÇEKTEN yeniden okuyor, dolayısıyla mock filtreleri
   de uygulamalı — yoksa tamamlanmış sefer "aktif" diye geri gelir ve testin
   ölçtüğü şey kaybolur. */
const _update = vi.fn();
let _dbAktif = null;      // challenge_progress'teki satır (test kurar)

function _kurucu() {
  const filtreler = {};
  const o = {
    select: () => o,
    eq: (kolon, deger) => { filtreler[kolon] = deger; return o; },
    not: () => o,
    update: (payload) => { _update(payload); return o; },
    maybeSingle: async () => {
      const satir = _dbAktif;
      const uygun = satir && Object.entries(filtreler)
        .every(([k, v]) => k === 'user_id' || satir[k] === v);
      return { data: uygun ? satir : null, error: null };
    },
    order: async () => ({ data: [], error: null }),
    then: undefined,
  };
  return o;
}

vi.mock('../js/config.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, sb: { from: () => _kurucu() } };
});

import { S } from '../js/state.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';
import { todayCacheKey } from '../js/parts/09-reports-tracks.js';
import {
  seferBugunMuhurlendi, seferGorevleri, completeChallengeDay, getSeferPrompt,
} from '../js/parts/10h-w2-library-challenges.js';

function seferKur(over = {}) {
  return Object.assign({
    id: 'ch-42',
    challenge_id: 'sefer_erteleme_1',
    boss_id: 'erteleme',
    challenge_name: 'Erteleme Seferi',
    current_day: 4,
    status: 'active',
    nefes_at_start: 45,
    nefes_now: 30,
    challenge_tasks: Array.from({ length: 21 }, (_, i) => 'Gün ' + (i + 1)),
  }, over);
}

describe('Sefer — gün kapısı', () => {
  beforeEach(() => {
    // SafeStorage bellek-içi _kvCache paylaşır: her testte benzersiz uid şart.
    S.currentUser = { id: 'sefer-uid-' + Date.now() + '-' + Math.random() };
    S._currentLang = 'tr';
    S._activeChallenge = null;
    S._resistanceLog = [];
    _dbAktif = null;
    _update.mockClear();
  });

  it('sefer yokken kapı sorusu sessizce false döner', () => {
    expect(seferBugunMuhurlendi()).toBe(false);
  });

  it('mühür basılmadan gün kapısı açıktır', () => {
    S._activeChallenge = seferKur();
    expect(seferBugunMuhurlendi()).toBe(false);
  });

  it('gün mühürlenince kapı kapanır ve İKİNCİ mühür düşmez', async () => {
    _dbAktif = seferKur();
    S._activeChallenge = _dbAktif;
    expect(await completeChallengeDay()).toBe(true);
    expect(S._activeChallenge.current_day).toBe(5);
    expect(seferBugunMuhurlendi()).toBe(true);

    _update.mockClear();
    expect(await completeChallengeDay()).toBe(false);
    expect(_update).not.toHaveBeenCalled();          // DB'ye ikinci kez gidilmez
    expect(S._activeChallenge.current_day).toBe(5);  // gün ilerlemez
  });

  it('kapı SEFERE bağlıdır: yeni sefer başlarsa bugün yeniden mühürlenebilir', async () => {
    _dbAktif = seferKur();
    S._activeChallenge = _dbAktif;
    await completeChallengeDay();
    expect(seferBugunMuhurlendi()).toBe(true);
    S._activeChallenge = seferKur({ id: 'ch-99', current_day: 0 });
    expect(seferBugunMuhurlendi()).toBe(false);
  });

  it('GERÇEKLİK: nefes DB\'ye yazılmaz — uydurulmuş sayı kaydedilmez', async () => {
    _dbAktif = seferKur();
    S._activeChallenge = _dbAktif;
    await completeChallengeDay();
    expect(_update).toHaveBeenCalledTimes(1);
    const payload = _update.mock.calls[0][0];
    expect(payload).toEqual({ current_day: 5, status: 'active' });
    expect('nefes_now' in payload).toBe(false);
  });

  /* Bu test aynı zamanda töreni state'ten AYIRAN kapıyı tutar: mezuniyet
     töreni (10b `showGraduation`) `#grad-title`'a guard'sız yazıyor ve bu
     süitte o kabuk yok — yani tören burada gerçekten patlıyor. Sefer yine
     kapanmalı: yolun kaydı törenin görünmesine bağlı değildir. */
  it('21. günde sefer tamamlanır ve tören patlasa bile aktif sefer düşer', async () => {
    _dbAktif = seferKur({ current_day: 20 });
    S._activeChallenge = _dbAktif;
    await completeChallengeDay();
    expect(_update.mock.calls[0][0]).toEqual({ current_day: 21, status: 'completed' });
    expect(S._activeChallenge).toBeNull();
  });

  it('gün kapısı YEREL güne bağlıdır (toISOString TR\'de gün kaydırır)', async () => {
    _dbAktif = seferKur();
    S._activeChallenge = _dbAktif;
    await completeChallengeDay();
    // Kapının anahtarı bugünün yerel tarihini taşır; dünün anahtarı boştur.
    expect(SafeStorage.getRaw(todayCacheKey('sefer_gun'))).toBe('ch-42');
  });
});

describe('Sefer — görev okuma', () => {
  beforeEach(() => {
    S.currentUser = { id: 'sefer-gorev-' + Date.now() + '-' + Math.random() };
    S._currentLang = 'tr';
    S._activeChallenge = null;
  });

  it('görevler DB kaydından okunur', () => {
    const ch = seferKur();
    expect(seferGorevleri(ch)[0]).toBe('Gün 1');
    expect(seferGorevleri(ch).length).toBe(21);
  });

  it('DB kaydı boşsa cihazdaki kopyaya düşer', () => {
    const ch = seferKur({ challenge_tasks: null });
    SafeStorage.set(`challenge_tasks_${S.currentUser.id}_${ch.challenge_id}`, ['A', 'B']);
    expect(seferGorevleri(ch)).toEqual(['A', 'B']);
  });

  it('sefer yoksa boş dizi döner (asla bloklama)', () => {
    expect(seferGorevleri(null)).toEqual([]);
  });

  it('kalıbın sözü sözlükten çözülür', () => {
    expect(typeof getSeferPrompt('erteleme')).toBe('string');
  });
});
