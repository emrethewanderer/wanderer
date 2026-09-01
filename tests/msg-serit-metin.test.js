/**
 * Mesaj eylem şeridi — ham metnin tek kaynağı (msgRawText / _rawText).
 *
 * Bu dosyanın koruduğu kırık: metin eskiden her butonun `data-content`
 * niteliğinde taşınıyordu. Nitelik değeri HTML parser'ından geçtiği için
 * (a) yazarken `\n → ' '` düzleştiriliyor, çok paragraflı bir yanıt tek satır
 * kopyalanıyor; (b) okurken `&quot;` bir kez daha çözülüp metni bozuyordu.
 * Ham metin artık HTML'e hiç girmez — balonun JS property'sinde durur.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { S } from '../js/state.js';
import {
  _createMsgEl,
  msgRawText,
  fbSonEylemleriTazele,
} from '../js/parts/06-summary-chat.js';

const COK_SATIR = 'Birinci paragraf.\n\nİkinci paragraf.\nÜçüncü satır.';
const TUZAKLI   = 'O "gerçek" dedi & sonra <kapı> kapandı — &amp; kaldı.';

beforeEach(() => {
  document.body.innerHTML = '<div id="messages-area"></div>';
  S.settings = S.settings || {};
  S.settings.persona_name = 'EMRE THE WANDERER';
});

afterEach(() => { document.body.innerHTML = ''; });

describe('msgRawText — ham metnin tek kaynağı', () => {
  it('emre mesajında satır sonlarını KORUR', () => {
    const el = _createMsgEl('emre', COK_SATIR);
    document.getElementById('messages-area').appendChild(el);
    const btn = el.querySelector('.fb-btn');
    expect(btn).toBeTruthy();
    expect(msgRawText(btn)).toBe(COK_SATIR);
    expect(msgRawText(btn)).toContain('\n\n');
  });

  it('kullanıcı mesajında satır sonlarını KORUR', () => {
    const el = _createMsgEl('user', COK_SATIR);
    document.getElementById('messages-area').appendChild(el);
    expect(msgRawText(el.querySelector('.fb-btn'))).toBe(COK_SATIR);
  });

  it('tırnak, & ve açılı parantez bozulmadan döner', () => {
    const el = _createMsgEl('emre', TUZAKLI);
    document.getElementById('messages-area').appendChild(el);
    // Eski yol `&amp;`i `&`e çözer, `&quot;`i tırnağa çevirirdi — birebir olmalı
    expect(msgRawText(el.querySelector('.fb-btn'))).toBe(TUZAKLI);
  });

  it('ham metin DOM niteliğine SIZMAZ (data-content ölü)', () => {
    const el = _createMsgEl('emre', COK_SATIR);
    expect(el.querySelector('[data-content]')).toBeNull();
    expect(el.outerHTML).not.toContain('data-content');
  });

  it('şeritsiz bir düğümde sessizce boş string döner', () => {
    const yalniz = document.createElement('button');
    document.body.appendChild(yalniz);
    expect(msgRawText(yalniz)).toBe('');
    expect(msgRawText(null)).toBe('');
  });
});

describe('şeridin sözleşmesi', () => {
  it('her buton type="button" ve aria-label taşır', () => {
    const el = _createMsgEl('emre', 'Deneme.');
    const btns = [...el.querySelectorAll('.fb-btn')];
    expect(btns.length).toBeGreaterThan(0);
    btns.forEach(b => {
      expect(b.getAttribute('type')).toBe('button');
      expect(b.getAttribute('aria-label')).toBeTruthy();
    });
  });

  it('glif ekran okuyucudan gizli, stroke dilinde (fill niteliği yok)', () => {
    const el = _createMsgEl('emre', 'Deneme.');
    const svg = el.querySelector('.fb-btn svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('fill')).toBeNull();
  });

  it('beğeni ikilisi aria-pressed="false" ile başlar', () => {
    const el = _createMsgEl('emre', 'Deneme.');
    const rate = [...el.querySelectorAll('.fb-btn[data-rate]')];
    expect(rate).toHaveLength(2);
    rate.forEach(b => expect(b.getAttribute('aria-pressed')).toBe('false'));
  });
});

describe('fbSonEylemleriTazele — yalnız son mesajda anlamlı eylemler', () => {
  it('geçmişte kalan Yeniden üret düşer, sondaki kalır', () => {
    const area = document.getElementById('messages-area');
    const ilk = _createMsgEl('emre', 'İlk yanıt.');
    const son = _createMsgEl('emre', 'Son yanıt.');
    area.appendChild(ilk); area.appendChild(son);

    expect(ilk.querySelector('.fb-btn[data-son]')).toBeTruthy();
    fbSonEylemleriTazele();
    expect(ilk.querySelector('.fb-btn[data-son]')).toBeNull();
    expect(son.querySelector('.fb-btn[data-son]')).toBeTruthy();
  });

  it('emre ve kullanıcı şeritleri birbirini düşürmez', () => {
    const area = document.getElementById('messages-area');
    const u = _createMsgEl('user', 'Soru.');
    const e = _createMsgEl('emre', 'Yanıt.');
    area.appendChild(u); area.appendChild(e);

    fbSonEylemleriTazele();
    expect(u.querySelector('.fb-btn[data-son]')).toBeTruthy();
    expect(e.querySelector('.fb-btn[data-son]')).toBeTruthy();
  });

  it('data-son taşımayan eylemler (Kopyala/Paylaş) geçmişte de kalır', () => {
    const area = document.getElementById('messages-area');
    const ilk = _createMsgEl('emre', 'İlk.');
    area.appendChild(ilk);
    area.appendChild(_createMsgEl('emre', 'Son.'));

    fbSonEylemleriTazele();
    const kalan = [...ilk.querySelectorAll('.fb-btn')];
    expect(kalan.length).toBe(6); // 7 eylemden yalnız "Yeniden üret" düştü
    expect(ilk.querySelector('.fb-btn[data-rate]')).toBeTruthy();
  });
});

/* Öz-denetimde bulunan regresyon: "Yeniden üret" ile "Tekrar dene" ortak
   gövdeye indirilirken eski `lastAssistantIdx === -1` kapısı düşmüştü.
   O kapı olmadan, araya yanıtsız bir kullanıcı mesajı girdiğinde balon
   DOM'dan siliniyor ama S.chatHistory'de kalıyordu — ekran ile hafıza
   ayrışıyor, geçmiş yüklemesinde mesaj geri geliyordu. */
describe('yeniden üret — DOM ile hafıza ayrışmaz', () => {
  beforeEach(() => {
    S.chatHistory = [
      { role: 'user', content: 'İlk soru.' },
      { role: 'assistant', content: 'İlk yanıt.' },
      { role: 'user', content: 'Yanıtsız kalan ikinci soru.' },
    ];
    S.currentSessId = 'test-oturum';
    S.allSessions = { 'test-oturum': [...S.chatHistory] };
    S._llmStreaming = false;
    window.showToast = vi.fn();
  });

  afterEach(() => { delete window.showToast; });

  it('araya yanıtsız kullanıcı mesajı girdiyse Yeniden üret balona DOKUNMAZ', async () => {
    const area = document.getElementById('messages-area');
    const emre = _createMsgEl('emre', 'İlk yanıt.');
    area.appendChild(_createMsgEl('user', 'İlk soru.'));
    area.appendChild(emre);
    area.appendChild(_createMsgEl('user', 'Yanıtsız kalan ikinci soru.'));

    const btn = emre.querySelector('.fb-btn[data-son]');
    // Şerit tazelendiğinde bu buton düşmüş olabilir; kapıyı doğrudan sına
    const hedefBtn = btn || emre.querySelector('.fb-btn');
    await window.regenerateMessage?.(hedefBtn);

    // Balon yerinde ve hafıza bozulmamış olmalı
    expect(area.contains(emre)).toBe(true);
    expect(S.chatHistory.filter(m => m.role === 'assistant')).toHaveLength(1);
  });
});
