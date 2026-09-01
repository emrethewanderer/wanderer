/**
 * Tests for js/parts/12c-kart-gorsel.js — HOLO MOTORU
 *
 * Kartın ışığı eğimi izler: 'wrap' modu sarmalayıcı + parıltı katmanı takar,
 * 'vars' modu (10q kk-card3d) kartın kendi --rx/--ry CSS değişkenlerini sürer.
 * Sözleşme: mini/fog kart parlamaz, kk-card3d içine wrap girmez,
 * reduced-motion'da motor hiç takılmaz, attach idempotenttir.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ikvHoloAttach, ikvHoloScan } from '../js/parts/12c-kart-gorsel.js';

function makeCard(cls = 'ikv-card') {
  const host = document.createElement('div');
  const el = document.createElement('div');
  el.className = cls;
  host.appendChild(el);
  document.body.appendChild(host);
  return el;
}

beforeEach(() => { document.body.innerHTML = ''; });
afterEach(() => { delete window.matchMedia; });

describe('ikvHoloAttach — wrap modu', () => {
  it('kartı .ikv-holo ile sarar ve parıltı katmanı ekler', () => {
    const el = makeCard();
    ikvHoloAttach(el);
    expect(el.parentElement.classList.contains('ikv-holo')).toBe(true);
    expect(el.querySelector('.ikv-holo-sheen')).toBeTruthy();
    expect(el._ikvHolo.mode).toBe('wrap');
  });

  it('idempotenttir — ikinci çağrı ikinci sarmalayıcı üretmez', () => {
    const el = makeCard();
    ikvHoloAttach(el);
    ikvHoloAttach(el);
    expect(el.parentElement.parentElement.classList.contains('ikv-holo')).toBe(false);
    expect(el.querySelectorAll('.ikv-holo-sheen').length).toBe(1);
  });

  it('mini ve fog kartlara takılmaz (kilitli kart parlamaz)', () => {
    const mini = makeCard('ikv-card ikv-card--mini');
    const fog = makeCard('ikv-card ikv-card--fog');
    ikvHoloAttach(mini); ikvHoloAttach(fog);
    expect(mini._ikvHolo).toBeUndefined();
    expect(fog._ikvHolo).toBeUndefined();
  });

  it('kk-card3d içindeki karta wrap girmez — kk kendi foil dilini konuşur', () => {
    const kk = document.createElement('div');
    kk.className = 'kk-card3d';
    const el = document.createElement('div');
    el.className = 'ikv-card';
    kk.appendChild(el);
    document.body.appendChild(kk);
    ikvHoloAttach(el);
    expect(el._ikvHolo).toBeUndefined();
    expect(el.parentElement).toBe(kk);
  });
});

describe('ikvHoloAttach — vars modu (kk-card3d köprüsü)', () => {
  it('sarmalayıcı/parıltı eklemez, değişken modunda kaydeder', () => {
    const el = makeCard('kk-card3d');
    ikvHoloAttach(el, { mode: 'vars' });
    expect(el.parentElement.classList.contains('ikv-holo')).toBe(false);
    expect(el.querySelector('.ikv-holo-sheen')).toBeNull();
    expect(el._ikvHolo.mode).toBe('vars');
  });

  it('vars varsayılan doz 9° — eski kkBindTilt etkin ucu korunur', () => {
    const el = makeCard('kk-card3d');
    ikvHoloAttach(el, { mode: 'vars' });
    expect(el._ikvHolo.max).toBe(9);
  });
});

describe('ikvHoloScan', () => {
  it('kap içindeki uygun kartları sayarak takar, minileri atlar', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div class="ikv-card"></div>
      <div class="ikv-card ikv-card--mini"></div>
      <div class="ikv-card ikv-card--fog"></div>
      <div class="ikv-back"></div>`;
    document.body.appendChild(root);
    expect(ikvHoloScan(root)).toBe(2);
    expect(ikvHoloScan(root)).toBe(0);   // ikinci tarama: hepsi zaten takılı
  });

  it('kapsız çağrıda sessizce 0 döner (savunma)', () => {
    expect(ikvHoloScan(null)).toBeTypeOf('number');
  });
});

describe('reduced-motion disiplini', () => {
  it('kullanıcı hareketi azaltmışsa motor hiç takılmaz', () => {
    window.matchMedia = () => ({ matches: true });
    const el = makeCard();
    ikvHoloAttach(el);
    expect(el._ikvHolo).toBeUndefined();
    expect(el.querySelector('.ikv-holo-sheen')).toBeNull();
  });
});
