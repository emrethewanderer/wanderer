// Derin Çalışma · Bugün penceresi (13A · 2026-08-18)
//   Sökülen Kişilerim deste bölümünün yerinde durur. Yeni motor YOK:
//   Süper Odak'ın hedefi ya da Ko-Zo'daki son açık hamle gösterilir.
//   Kanıt (kullanıcının beyanı) yoksa sayı değil DAVET (§6.10 · K6).
import { describe, it, expect, beforeEach } from 'vitest';
import {
  dcRenderBugun, dcBugunKesit, dcInit, dcOdakKaydet, dcKozoEkle, dcKozoToggle,
} from '../js/parts/13A-derin-calisma.js';
import { S } from '../js/state.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';

function mount() {
  document.body.innerHTML = `
    <section class="dcb" id="dc-bugun">
      <button class="dcb-head"></button>
      <div class="dcb-body" id="dc-bugun-body"></div>
    </section>`;
}

beforeEach(() => {
  mount();
  S.currentUser = { id: 'u-dcb' };
  // SafeStorage bellek-içi cache tutar; testler arasında temizlenmezse
  // önceki testin tezgâhı sızar ([[safestorage-testlerde-kvcache]]).
  ['etw_dc_v1_u-dcb', 'etw_dc_tat_v1_u-dcb'].forEach(k => { try { SafeStorage.remove(k); } catch (_) {} });
  S._derinCalisma = null;
  dcInit();
  // Max kapısı burada konu DEĞİL (13A'nın kendi dosyasında sınanıyor); ama
  // odak/Ko-Zo yazımı `dcGuardWork`ten geçtiği için tezgâh açık olmalı —
  // yoksa beyan hiç kaydedilmez ve test kendi kurduğu şeyi ölçemez.
  S.isPremiumPlus = true;
});

describe('dcBugunKesit — ne gösterilir', () => {
  it('hiçbir beyan yoksa kesit YOKTUR (uydurulmaz)', () => {
    expect(dcBugunKesit()).toBeNull();
  });

  it('odak kurulduysa hedefi gösterir', () => {
    dcOdakKaydet({ hedef: 'kitabı bitirmek', zihin: true, kalp: true });
    const k = dcBugunKesit();
    expect(k.tur).toBe('odak');
    expect(k.cumle).toBe('kitabı bitirmek');
  });

  it('odak yoksa Ko-Zo\'daki son AÇIK hamleye düşer', () => {
    dcKozoEkle('ko', 'kitabı masaya koy');
    dcKozoEkle('ko', 'sayfayı güne böl');
    const k = dcBugunKesit();
    expect(k.tur).toBe('kozo');
    expect(k.cumle).toBe('sayfayı güne böl');
  });

  it('kurulmuş madde hatırlatma değildir — kapalı madde atlanır', () => {
    dcKozoEkle('ko', 'tek madde');
    const id = S._derinCalisma.kozo.ko[0].id;
    dcKozoToggle('ko', id);
    expect(dcBugunKesit()).toBeNull();
  });

  it('odak Ko-Zo\'yu bastırır — günün çerçevesi önce gelir', () => {
    dcKozoEkle('zo', 'telefonu odadan çıkar');
    dcOdakKaydet({ hedef: 'derin çalışma', zihin: true, kalp: true });
    expect(dcBugunKesit().tur).toBe('odak');
  });
});

describe('dcRenderBugun — bölüm', () => {
  it('host yoksa sessizce düşer (Bugün dışındaki ekranlar)', () => {
    document.body.innerHTML = '';
    expect(() => dcRenderBugun()).not.toThrow();
  });

  it('beyan varsa kullanıcının cümlesi «…» ile durur', () => {
    dcOdakKaydet({ hedef: 'kitabı bitirmek', zihin: true, kalp: true });
    dcRenderBugun();
    const c = document.querySelector('#dc-bugun-body .dcb-cumle');
    expect(c.textContent).toBe('«kitabı bitirmek»');
  });

  it('beyan yoksa SAYI değil davet çizilir', () => {
    dcRenderBugun();
    const body = document.getElementById('dc-bugun-body');
    expect(body.querySelector('.dcb-davet')).toBeTruthy();
    expect(body.querySelector('.dcb-cumle')).toBeNull();
    expect(body.textContent).not.toMatch(/\d/);
  });

  it('durum satırı odanın alt satırıyla aynı cümleyi konuşur', () => {
    dcRenderBugun();
    const d = document.querySelector('#dc-bugun-body .dcb-durum');
    expect(d).toBeTruthy();
    expect(d.textContent.trim().length).toBeGreaterThan(0);
  });

  it('kullanıcı cümlesi HTML olarak yorumlanmaz (escapeHTML)', () => {
    dcOdakKaydet({ hedef: '<img src=x onerror=alert(1)>', zihin: true, kalp: true });
    dcRenderBugun();
    const body = document.getElementById('dc-bugun-body');
    expect(body.querySelector('img')).toBeNull();
    expect(body.textContent).toContain('<img');
  });
});
