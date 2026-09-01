/**
 * Tests for js/parts/12e-isik-nisanlari.js — FAZ 3 · EMRE KÖPRÜSÜ
 *
 * [NISAN:id] protokolü: etiket görünür metinden silinir, geçerli id'de
 * chip düşer (seans başına 1 — nur nadirdir). isikGetContext talimatı
 * p('prompt.mode.nisan') anahtarından doldurur (hardcode yasak kuralı).
 * isikMatchNisan 09d Örüntü Aynası çıpasının eşleştiricisidir.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  NISANLAR,
  isikExtractTag,
  isikMatchNisan,
  isikGetContext,
  _isikOnEmreFinalized,
} from '../js/parts/12e-isik-nisanlari.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';

const ISIK_KEY = 'etw_isik_nisan_v1';

function emreMsg(raw) {
  const el = document.createElement('div');
  el.className = 'emre';
  el.innerHTML = `<div class="msg-body">${raw}</div>`;
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = '';
  SafeStorage.set(ISIK_KEY, { written: {}, lastWriteDate: null });
});

describe('isikExtractTag', () => {
  it('geçerli id → nişan kaydı + ham etiket', () => {
    const r = isikExtractTag('Cevap metni... [NISAN:saturn]');
    expect(r.nisan.id).toBe('saturn');
    expect(r.tag).toBe('[NISAN:saturn]');
  });
  it('bilinmeyen id ve etiketsiz metin → null', () => {
    expect(isikExtractTag('metin [NISAN:baphomet_yok]')).toBeNull();
    expect(isikExtractTag('etiketsiz sıradan cevap')).toBeNull();
  });
});

describe('isikMatchNisan — tema eşleştirici', () => {
  it('zaman telaşı → Boyun Eğmiş Satürn', () => {
    expect(isikMatchNisan('Hiçbir şeye yetişemiyorum, hep geç kalıyorum').id).toBe('saturn');
  });
  it('izlenme kaygısı → Kapalı Göz', () => {
    expect(isikMatchNisan('Sürekli izleniyormuşum gibi hissediyorum').id).toBe('kapali_goz');
  });
  it('yankısız metin → null', () => {
    expect(isikMatchNisan('Bugün hava çok güzeldi, yürüyüşe çıktım')).toBeNull();
  });
});

describe('isikGetContext — [NISAN] talimatı', () => {
  it('talimat + id haritası + yazılı özeti üretir', () => {
    SafeStorage.set(ISIK_KEY, { written: { saturn: '2026-07-01' }, lastWriteDate: '2026-07-01' });
    const ctx = isikGetContext();
    expect(ctx).toContain('NİŞAN KÖPRÜSÜ');
    expect(ctx).toContain('saturn=');
    expect(ctx).toContain('Boyun Eğmiş Satürn');   // yazılı özeti ad ile
    expect(ctx).not.toContain('{idler}');           // değişkenler doldurulmuş
  });
});

describe('_isikOnEmreFinalized — chip + throttle', () => {
  it('etiketi siler, ilk mesaja chip düşürür; seansta ikinci chip düşmez', () => {
    const el1 = emreMsg('Zaman baskısı üzerine bir cevap. [NISAN:saturn]');
    _isikOnEmreFinalized(el1, 'Zaman baskısı üzerine bir cevap. [NISAN:saturn]');
    expect(el1.querySelector('.msg-body').textContent).not.toContain('[NISAN');
    expect(el1.querySelector('.ik-emre-cta')).toBeTruthy();

    const el2 = emreMsg('İkinci cevap. [NISAN:halka]');
    _isikOnEmreFinalized(el2, 'İkinci cevap. [NISAN:halka]');
    expect(el2.querySelector('.msg-body').textContent).not.toContain('[NISAN');  // etiket yine silinir
    expect(el2.querySelector('.ik-emre-cta')).toBeNull();                        // ama chip düşmez
  });
});
