/**
 * ÖDEV ÇİPİ — kırık halkanın mührü (2026-08-21)
 *
 * Ödev motoru baştan sona canlıydı: `generateHomework` seans çıkışında ödev
 * üretiyor, `loadRoadmap` post-auth onu DB'den okuyor, `getHomeworkContext`
 * LLM'e taşıyor. Kullanıcıya görünen TEK yüzey sohbet çipiydi ve o çip
 * `_activeHomework`'ü 09'un modül-yerelinden BARE identifier olarak okuyup
 * `typeof … === 'undefined'` guard'ına takılıyordu — guard her zaman doğru
 * dönüyordu, yani ödev veritabanında dururken ekranda hiç doğmadı.
 *
 * Bu test o halkayı mühürler: ödev VARSA çip çizilir, YOKSA çizilmez.
 * Bağsız ad kapısı (tests/bagsiz-ad-kapisi) kırığın SINIFINI tutar; bu test
 * bu özelliğin DAVRANIŞINI tutar. İkisi ayrı işlerdir.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

let _odev = null;

vi.mock('../js/parts/09-reports-tracks.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getActiveHomework: () => _odev, markHomework: vi.fn() };
});

import { S } from '../js/state.js';
import { _odevChipiniBas } from '../js/parts/06-summary-chat.js';

describe('ödev çipi — DB\'de duran ödev ekranda doğar', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="messages-area"></div>';
    S._sessionUserMsgs = ['a', 'b', 'c'];   // çip 3. kullanıcı mesajında iner
    _odev = null;
  });

  it('bekleyen ödev varsa çip çizilir ve metni taşır', () => {
    _odev = { id: 7, task: 'Bugün bir kişiye teşekkür et.', created_at: new Date().toISOString() };
    _odevChipiniBas();
    const chip = document.getElementById('hw-chat-chip');
    expect(chip).toBeTruthy();
    expect(chip.textContent).toContain('Bugün bir kişiye teşekkür et.');
  });

  it('ödev yoksa çip çizilmez', () => {
    _odev = null;
    _odevChipiniBas();
    expect(document.getElementById('hw-chat-chip')).toBeNull();
  });

  it('aynı turda iki kez çağrılsa da tek çip kalır', () => {
    _odev = { id: 7, task: 'Tek kalmalı', created_at: new Date().toISOString() };
    _odevChipiniBas();
    _odevChipiniBas();
    expect(document.querySelectorAll('#hw-chat-chip').length).toBe(1);
  });

  it('3. mesaj değilse çip inmez (törenin eşiği)', () => {
    _odev = { id: 7, task: 'Erken', created_at: new Date().toISOString() };
    S._sessionUserMsgs = ['a'];
    _odevChipiniBas();
    expect(document.getElementById('hw-chat-chip')).toBeNull();
  });
});
