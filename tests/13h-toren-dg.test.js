/**
 * Tests for js/parts/13h-aksam-toreni.js — Akşam Töreni'nin duygu daveti
 * (FAZ 17, K10 'toren' satırı). `dgKapi('toren', …)` TEK kapıdır: okuma
 * varsa mevcut `at.body` paragrafının BAŞINA tek cümle eklenir, paragrafın
 * kendisi DEĞİŞMEZ. `taniklik`/`tutma`'da (kriz) cümle YOK — K7'nin sessiz
 * eşliği ve K9'un "kriz sohbete verilir dekora değil" kararı. Damga (K13)
 * "teslim eden basar": kapıdan geçmek yetmez, cümle GERÇEKTEN paragrafa
 * yazıldığında basılır. 10s'in `gl.soz_lead` sözleşmesiyle simetrik.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { S } from '../js/state.js';
import { atRun } from '../js/parts/13h-aksam-toreni.js';
import { t } from '../js/parts/15-i18n.js';

function resetState() {
  S.currentUser = { id: 'at-dg-test' };
  S._aksamToreni = { lastDay: null, intentions: {} };
  S._gunlukRitus = null;
  S._seriMuhru = null;
  S._dgIklim = null;
  S._dgNabiz = null;
  S._dgOncekiNabiz = null;
  S._dgNabizZaman = null;
  document.body.innerHTML = '';
  window.dgKapi = undefined;
  window.dgYanilmaKonustu = undefined;
  window.dgIklimKaydet = undefined;
}

/* `.at-body`nin İLK çocuğu daima düz metin node'udur ("i" bilgi butonundan
   ÖNCE gelir) — dgCumle/`at.body` metninde HTML etiketi yok, doğrudan text
   node karşılaştırması innerHTML serileştirme farklarına duyarlı değildir. */
const bodyMetni = () => document.querySelector('.at-body')?.firstChild?.nodeValue;

describe('Akşam Töreni — duygu daveti (FAZ 17, K10 toren)', () => {
  beforeEach(resetState);
  afterEach(() => {
    delete window.dgKapi;
    delete window.dgYanilmaKonustu;
    delete window.dgIklimKaydet;
  });

  it('dgKapi tanımsızsa (iki tanık yok) at-body paragrafı bit-be-bit aynı kalır', () => {
    atRun(true);
    expect(bodyMetni()).toBe(t('at.body'));
  });

  it('okuma varsa (kutlama) cümle at-body paragrafının BAŞINA eklenir, orijinal metin bozulmaz', () => {
    window.dgKapi = () => ({ eksen: 'kutlama', gerekce: '', kanit: 'x', ikincil: null, krizOkundu: false });
    S._dgIklim = { yuzeyDefter: {} };
    atRun(true);
    expect(bodyMetni()).toBe(`${t('at.dg.kutlama')} ${t('at.body')}`);
  });

  it('taniklik ekseninde cümle YOK — at-body orijinal kalır, damga basılmaz', () => {
    window.dgKapi = () => ({ eksen: 'taniklik', gerekce: '', kanit: null, ikincil: null, krizOkundu: false });
    S._dgIklim = { yuzeyDefter: {} };
    let konustu = false;
    window.dgYanilmaKonustu = () => { konustu = true; return S._dgIklim; };
    window.dgIklimKaydet = () => {};
    atRun(true);
    expect(bodyMetni()).toBe(t('at.body'));
    expect(konustu).toBe(false);
  });

  it('kriz (tutma) ekseninde cümle YOK — tören kendi sesini korur', () => {
    window.dgKapi = () => ({ eksen: 'tutma', gerekce: 'Kriz sinyali', kanit: null, ikincil: null, krizOkundu: true });
    S._dgIklim = { yuzeyDefter: {} };
    let konustu = false;
    window.dgYanilmaKonustu = () => { konustu = true; return S._dgIklim; };
    atRun(true);
    expect(bodyMetni()).toBe(t('at.body'));
    expect(konustu).toBe(false);
  });

  it('damga (K13) — cümle GERÇEKTEN yazıldığında dgYanilmaKonustu("toren") + dgIklimKaydet çağrılır', () => {
    window.dgKapi = () => ({ eksen: 'diriltme', gerekce: '', kanit: 'x', ikincil: null, krizOkundu: false });
    const eskiIklim = { yuzeyDefter: {} };
    S._dgIklim = eskiIklim;
    let konustuArg = null, kaydedilen = null;
    window.dgYanilmaKonustu = (iklim, yuzey) => { konustuArg = { iklim, yuzey }; return { ...iklim, _sonKonusan: yuzey }; };
    window.dgIklimKaydet = (iklim) => { kaydedilen = iklim; };
    atRun(true);
    expect(konustuArg).toEqual({ iklim: eskiIklim, yuzey: 'toren' });
    expect(kaydedilen).toEqual({ ...eskiIklim, _sonKonusan: 'toren' });
  });

  it('S._dgIklim null iken cümle yine görünür ama damga yazılmaz', () => {
    window.dgKapi = () => ({ eksen: 'sahiplenme', gerekce: '', kanit: 'x', ikincil: null, krizOkundu: false });
    S._dgIklim = null;
    let cagrildi = false;
    window.dgYanilmaKonustu = () => { cagrildi = true; };
    window.dgIklimKaydet = () => { cagrildi = true; };
    atRun(true);
    expect(bodyMetni()).toBe(`${t('at.dg.sahiplenme')} ${t('at.body')}`);
    expect(cagrildi).toBe(false);
  });

  it('dgKapi("toren", ctx) çağrılır — ctx oncekiNabiz/zaman taşır (FAZ 17 K10 kadran 1-2)', () => {
    let yuzeyGorulen = null, ctxGorulen = null;
    S._dgNabiz = { deger: 1, kuvvet: 3, aile: 'sevinc' };
    S._dgOncekiNabiz = { deger: 0, kuvvet: 1, aile: 'huzur' };
    S._dgNabizZaman = 654321;
    window.dgKapi = (yuzey, ctx) => { yuzeyGorulen = yuzey; ctxGorulen = ctx; return null; };
    atRun(true);
    expect(yuzeyGorulen).toBe('toren');
    expect(ctxGorulen.nabiz).toEqual(S._dgNabiz);
    expect(ctxGorulen.oncekiNabiz).toEqual(S._dgOncekiNabiz);
    expect(ctxGorulen.zaman).toBe(654321);
  });
});
