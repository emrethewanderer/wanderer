/**
 * Tests for js/parts/12c-kart-gorsel.js — BOY KART + ARADAKİ YOL
 *
 * İki primitif, tek sözleşme:
 *   - `opts.boy` → kart 5/7 kalıbından çıkar (yükseklik içerikten gelir),
 *     çünkü kişinin dört asli unsuru kartın KENDİ metin kutusunda yaşar.
 *   - `ikvMesafeCizgi(pct)` → altın uç · gerçek dolgu · lapis ✷. Ölçü yoksa
 *     çizgi boş gerilir; "%0 yakınsın" denmez (gerçeklik kuralı §6.10).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ikvCardFace, ikvCardBack, ikvMesafeCizgi, ikvEnsureStyles } from '../js/parts/12c-kart-gorsel.js';

const KART = {
  id: 'test-kart', name: 'SINIRINI SAKİNCE KORUYAN', whisper: 'sınır, kendine saygının haritasıdır',
  category: 'temel', rarity: 'nadir', virtue: 'ozsaygi', no: 3, noTotal: 12, catGlyph: '◆',
  kok: 'İlişki Felsefesi · Temeller',
};

beforeEach(() => { document.body.innerHTML = ''; });

describe('boy kart — opts.boy', () => {
  it('boy:true ile ikv-card--boy sınıfı basılır', () => {
    expect(ikvCardFace(KART, { boy: true })).toContain('ikv-card--boy');
  });

  it('boy verilmezse sınıf BASILMAZ (5/7 kalıbı korunur)', () => {
    expect(ikvCardFace(KART, {})).not.toContain('ikv-card--boy');
  });

  it('sırt da boy uyumunu alır (flip yüksekliği ön yüzden gelir)', () => {
    expect(ikvCardBack({ boy: true })).toContain('ikv-back--boy');
    expect(ikvCardBack({})).not.toContain('ikv-back--boy');
  });

  it('boy kart metin kutusunu (extra) taşır', () => {
    const html = ikvCardFace(KART, { boy: true, extra: '<div class="kk-det-kutu">unsurlar</div>' });
    expect(html).toContain('kk-det-kutu');
  });
});

describe('ikvMesafeCizgi — ölçülü hâl', () => {
  it('yüzdeyi --ms-pct olarak inline basar, dolgu ve kıvılcım gelir', () => {
    const html = ikvMesafeCizgi(72);
    expect(html).toContain('--ms-pct:72%');
    expect(html).toContain('ikv-ms-fill');
    expect(html).toContain('ikv-ms-spark');
  });

  it('iki kutup daima çizilir: altın nokta ve lapis ✷', () => {
    const html = ikvMesafeCizgi(40);
    expect(html).toContain('ikv-ms-dot--gold');
    expect(html).toContain('ikv-ms-dot--lapis');
    expect(html).toContain('✷');
  });

  it('0-100 aralığına kırpar', () => {
    expect(ikvMesafeCizgi(150)).toContain('--ms-pct:100%');
    expect(ikvMesafeCizgi(-5)).toContain('--ms-pct:0%');
  });

  it('ondalık ölçüyü yuvarlar', () => {
    expect(ikvMesafeCizgi(71.6)).toContain('--ms-pct:72%');
  });
});

describe('ikvMesafeCizgi — ölçüsüz hâl (kanıtsız değer gösterilmez)', () => {
  it('null ölçüde çizgi gerilir ama dolgu ve kıvılcım BASILMAZ', () => {
    const html = ikvMesafeCizgi(null);
    expect(html).toContain('ikv-ms-line');
    expect(html).not.toContain('ikv-ms-fill');
    expect(html).not.toContain('ikv-ms-spark');
    expect(html).not.toContain('--ms-pct');
  });

  it('sayı olmayan girdi de ölçüsüz sayılır', () => {
    expect(ikvMesafeCizgi(undefined)).not.toContain('--ms-pct');
    expect(ikvMesafeCizgi('yok')).not.toContain('--ms-pct');
  });
});

describe('ikvMesafeCizgi — cümle ve kapı', () => {
  it('label verilirse çizginin altına basılır', () => {
    const html = ikvMesafeCizgi(72, { label: 'Bu kişiye <b>%72</b> yakınsın.' });
    expect(html).toContain('ikv-ms-label');
    expect(html).toContain('<b>%72</b>');
  });

  it('label yoksa cümle kabı hiç doğmaz', () => {
    expect(ikvMesafeCizgi(72)).not.toContain('ikv-ms-label');
  });

  it('aria verilirse çizgi bir KAPIDIR — buton olur', () => {
    const html = ikvMesafeCizgi(72, { aria: 'Sabır ve tevekkül' });
    expect(html).toContain('<button');
    expect(html).toContain('aria-label="Sabır ve tevekkül"');
    expect(html).toContain('ikv-ms--btn');
  });

  it('aria yoksa saf göstergedir: buton değil, odak sırasında da değil', () => {
    const html = ikvMesafeCizgi(72);
    expect(html).not.toContain('<button');
    expect(html).toContain('aria-hidden="true"');
  });

  it('cls sarmalayıcıya eklenir', () => {
    expect(ikvMesafeCizgi(50, { cls: 'kk-det-yol' })).toContain('ikv-ms-wrap kk-det-yol');
  });
});

describe('sözleşme', () => {
  it('window köprüsü açıktır', () => {
    ikvMesafeCizgi(10);
    expect(typeof window.ikvMesafeCizgi).toBe('function');
  });

  it('stiller enjekte edilir: boy kart ve çizgi kuralları sayfada', () => {
    document.getElementById('ikv-styles')?.remove();
    ikvEnsureStyles();
    const css = document.getElementById('ikv-styles').textContent;
    expect(css).toContain('.ikv-card--boy');
    expect(css).toContain('.ikv-ms-fill');
    // Kıvılcım susar ama dolgu kalır — ölçü animasyon değil, gerçek.
    expect(css).toContain('.ikv-ms-spark{animation:none!important');
  });

  it('cümlenin içindeki sayı DİK basılır — Bugün hero lehçesiyle aynı', () => {
    // yol.css:258 `.yol-label b{font-style:normal}` — italik cümlenin içinde
    // ölçü dikleşir. İki yüzey aynı cümleyi söylüyorsa aynı görünmeli.
    document.getElementById('ikv-styles')?.remove();
    ikvEnsureStyles();
    expect(document.getElementById('ikv-styles').textContent)
      .toContain('.ikv-ms-label b{color:var(--lapis-bright,#5A8AD8);font-style:normal;}');
  });
});
