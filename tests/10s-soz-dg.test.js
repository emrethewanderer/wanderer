/**
 * Tests for js/parts/10s-w2-gunluk-ritus.js — Günün Sözü'nün duygu daveti
 * (FAZ 17, K10 'toren' satırı). `dgKapi('toren', …)` TEK kapıdır: okuma
 * varsa mevcut `gl.soz_lead` paragrafının BAŞINA tek cümle eklenir, paragrafın
 * kendisi DEĞİŞMEZ. `taniklik`/`tutma`'da (kriz) cümle YOK — K7'nin sessiz
 * eşliği ve K9'un "kriz sohbete verilir dekora değil" kararı. Damga (K13)
 * "teslim eden basar": kapıdan geçmek yetmez, cümle GERÇEKTEN paragrafa
 * yazıldığında basılır.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { S } from '../js/state.js';
import { glRenderSozPopup } from '../js/parts/10s-w2-gunluk-ritus.js';
import { t } from '../js/parts/15-i18n.js';

function resetState() {
  S.currentUser = { id: 'gl-dg-test' };
  S._gunlukRitus = { date: null, gift: null, pledges: [], skipped: false, finished: false, reckoned: false };
  S._crisisDayKey = null;
  S._dgIklim = null;
  S._dgNabiz = null;
  S._dgOncekiNabiz = null;
  S._dgNabizZaman = null;
  document.body.innerHTML = '<div id="app-screen" style="display:block;">'
                          + '<div id="bugun-view" class="view active"></div></div>';
  window.dgKapi = undefined;
  window.dgYanilmaKonustu = undefined;
  window.dgIklimKaydet = undefined;
}

/* jsdom `<b>` gibi biçim etiketleri taşıyan gerçek `gl.soz_lead` metnini
   textContent düzeyinde karşılaştırmak için — innerHTML serileştirme
   farklarına duyarlı olmamak adına. */
function textOf(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent;
}

const lead = () => document.querySelector('.gl-soz-lead');
const leadPlain = () => textOf(t('gl.soz_lead'));

describe('Günün Sözü — duygu daveti (FAZ 17, K10 toren)', () => {
  beforeEach(resetState);
  afterEach(() => {
    delete window.dgKapi;
    delete window.dgYanilmaKonustu;
    delete window.dgIklimKaydet;
  });

  it('dgKapi tanımsızsa (iki tanık yok) lead paragrafı bit-be-bit aynı kalır', () => {
    glRenderSozPopup();
    expect(lead().textContent).toBe(leadPlain());
  });

  it('okuma varsa (kutlama) cümle lead paragrafının BAŞINA eklenir, orijinal metin bozulmaz', () => {
    window.dgKapi = () => ({ eksen: 'kutlama', gerekce: '', kanit: 'x', ikincil: null, krizOkundu: false });
    S._dgIklim = { yuzeyDefter: {} };
    glRenderSozPopup();
    expect(lead().textContent).toBe(`${t('gl.soz_dg.kutlama')} ${leadPlain()}`);
  });

  it('taniklik ekseninde cümle YOK — lead orijinal kalır, damga basılmaz', () => {
    window.dgKapi = () => ({ eksen: 'taniklik', gerekce: '', kanit: null, ikincil: null, krizOkundu: false });
    S._dgIklim = { yuzeyDefter: {} };
    let konustu = false;
    window.dgYanilmaKonustu = () => { konustu = true; return S._dgIklim; };
    window.dgIklimKaydet = () => {};
    glRenderSozPopup();
    expect(lead().textContent).toBe(leadPlain());
    expect(konustu).toBe(false);
  });

  it('kriz (tutma) ekseninde cümle YOK — tören kendi sesini korur', () => {
    window.dgKapi = () => ({ eksen: 'tutma', gerekce: 'Kriz sinyali', kanit: null, ikincil: null, krizOkundu: true });
    S._dgIklim = { yuzeyDefter: {} };
    let konustu = false;
    window.dgYanilmaKonustu = () => { konustu = true; return S._dgIklim; };
    glRenderSozPopup();
    expect(lead().textContent).toBe(leadPlain());
    expect(konustu).toBe(false);
  });

  it('damga (K13) — cümle GERÇEKTEN yazıldığında dgYanilmaKonustu("toren") + dgIklimKaydet çağrılır', () => {
    window.dgKapi = () => ({ eksen: 'diriltme', gerekce: '', kanit: 'x', ikincil: null, krizOkundu: false });
    const eskiIklim = { yuzeyDefter: {} };
    S._dgIklim = eskiIklim;
    let konustuArg = null, kaydedilen = null;
    window.dgYanilmaKonustu = (iklim, yuzey) => { konustuArg = { iklim, yuzey }; return { ...iklim, _sonKonusan: yuzey }; };
    window.dgIklimKaydet = (iklim) => { kaydedilen = iklim; };
    glRenderSozPopup();
    expect(konustuArg).toEqual({ iklim: eskiIklim, yuzey: 'toren' });
    expect(kaydedilen).toEqual({ ...eskiIklim, _sonKonusan: 'toren' });
  });

  it('S._dgIklim null iken cümle yine görünür ama damga yazılmaz', () => {
    window.dgKapi = () => ({ eksen: 'sahiplenme', gerekce: '', kanit: 'x', ikincil: null, krizOkundu: false });
    S._dgIklim = null;
    let cagrildi = false;
    window.dgYanilmaKonustu = () => { cagrildi = true; };
    window.dgIklimKaydet = () => { cagrildi = true; };
    glRenderSozPopup();
    expect(lead().textContent).toBe(`${t('gl.soz_dg.sahiplenme')} ${leadPlain()}`);
    expect(cagrildi).toBe(false);
  });

  it('dgKapi("toren", ctx) çağrılır — ctx oncekiNabiz/zaman taşır (FAZ 17 K10 kadran 1-2)', () => {
    let yuzeyGorulen = null, ctxGorulen = null;
    S._dgNabiz = { deger: 1, kuvvet: 3, aile: 'sevinc' };
    S._dgOncekiNabiz = { deger: 0, kuvvet: 1, aile: 'huzur' };
    S._dgNabizZaman = 123456;
    window.dgKapi = (yuzey, ctx) => { yuzeyGorulen = yuzey; ctxGorulen = ctx; return null; };
    glRenderSozPopup();
    expect(yuzeyGorulen).toBe('toren');
    expect(ctxGorulen.nabiz).toEqual(S._dgNabiz);
    expect(ctxGorulen.oncekiNabiz).toEqual(S._dgOncekiNabiz);
    expect(ctxGorulen.zaman).toBe(123456);
  });
});
