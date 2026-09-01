/**
 * 10w — sessiz kaybın kaydı gerçekten yazılıyor mu (İç Çalışma 08 rev.2 · K1)
 *
 * DENETİM 2026-08-31 (FAZ 2). `tests/00f-model-nabzi.test.js` kanalın
 * SÖZLEŞMESİNİ sınıyor ve harness'ı `wtInit()` ile açıyor — o yüzden yeşil.
 * Gerçek çağrı noktası ise ters sırada yaşıyor: `03-auth-shell:1376` fmInit'i,
 * `:1393` wtInit'i başlatır ve iki modül de `main.js`'te STATİK import
 * edilmiştir (105 · 451) — yani `import()` anında çözülür, `.then` sırası
 * çağrı sırasıdır. fmInit senkron yazsaydı `wtLogModel`'in `!_inited`
 * guard'ına çarpar, satır hiç doğmazdı: sessiz kaybın kaydı sessizce
 * kaybolurdu (`saf-yesil-cagri-olu` hafızası — kapı ÇAĞRIDA olmalı).
 *
 * Bu dosya birim değil DİKİŞ sınar: stub, nabzın fmInit'ten SONRA açıldığı
 * gerçek sırayı taklit eder ve olayın o sıradan sağ çıkmasını bekler.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { S } from '../js/state.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';
import { fmInit } from '../js/parts/10w-w2-odak-modelleri.js';

const KEY = 'wanderer_focus_model';   // 10w:46 — dosya dışına açılmıyor

describe('fmInit — düşülen eksen nabza gerçekten ulaşır', () => {
  let kayit, nabizAcik;

  beforeEach(() => {
    S.currentUser = { id: 'u-dus' };
    S.isPremium = false;              // Free: kayıtlı Bağ, etkin Öz
    S._activeFocusModel = null;
    kayit = []; nabizAcik = false;
    /* Nabız 03-auth-shell'de EN SONDA açılır: açılmadan gelen çağrı 00f'in
       `!_inited` guard'ına çarpıp düşer. Stub o gerçeği taklit eder. */
    window.wtLogModel = (olay, d) => { if (!nabizAcik) return; kayit.push([olay, d]); };
  });

  afterEach(() => {
    delete window.wtLogModel;
    SafeStorage.remove(KEY);          // _kvCache bellekte kalır (hafıza gotcha'sı)
    S.currentUser = null; S.isPremium = false;
  });

  it('nabız fmInit\'ten SONRA açılsa bile "dus" satırı yazılır', async () => {
    SafeStorage.set(KEY, 'bag');
    fmInit();
    await Promise.resolve();          // wtInit'in mikrotask turu
    nabizAcik = true;
    await new Promise(r => setTimeout(r, 0));
    expect(kayit).toHaveLength(1);
    expect(kayit[0][0]).toBe('dus');
    expect(kayit[0][1]).toMatchObject({ model: 'bag', oteki: 'oz', prem: false });
  });

  it('kayıtlı eksen zaten etkinse hiç satır doğmaz', async () => {
    SafeStorage.set(KEY, 'oz');
    fmInit();
    await Promise.resolve();
    nabizAcik = true;
    await new Promise(r => setTimeout(r, 0));
    expect(kayit).toHaveLength(0);
  });
});
