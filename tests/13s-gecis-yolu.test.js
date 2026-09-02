// Geçiş Yolu (13s) — 21 günlük yolculuk pusulası saf-fonksiyon testleri
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { S } from '../js/state.js';
import { localISODate } from '../js/parts/00a-infrastructure.js';
import {
  gyInit,
  gyStart,
  gyIsActive,
  gyCurrentDay,
  gyPerdeForDay,
  gyGetState,
  gyOpenToday,
} from '../js/parts/13s-gecis-yolu.js';

describe('Geçiş Yolu — yolculuk motoru', () => {
  beforeEach(() => {
    // SafeStorage testler arası paylaşılan bir önbellek kullanır — her testte
    // benzersiz uid ile izole edilir (aksi hâlde önceki testin gySave()'i
    // gyLoad() ile sızar).
    S.currentUser = { id: 'test-uid-gy-' + Date.now() + '-' + Math.random() };
    S._gecisYolu = undefined;
    gyInit();
  });

  it('gyIsActive() başlangıçta false döner', () => {
    expect(gyIsActive()).toBe(false);
  });

  it('gyStart() currentUser yokken no-op kalır', () => {
    S.currentUser = null;
    gyStart();
    expect(gyIsActive()).toBe(false);
  });

  it('gyStart() yolculuğu bugünden başlatır', () => {
    gyStart();
    expect(gyIsActive()).toBe(true);
    expect(S._gecisYolu.startDate).toBe(localISODate());
  });

  it('gyStart() zaten aktifken tekrar çağrılırsa startDate\'i değiştirmez', () => {
    gyStart();
    const first = S._gecisYolu.startDate;
    gyStart();
    expect(S._gecisYolu.startDate).toBe(first);
  });

  it('gyCurrentDay() yolculuk aktif değilse 0 döner', () => {
    expect(gyCurrentDay()).toBe(0);
  });

  it('gyCurrentDay() başladığı gün 1 döner', () => {
    gyStart();
    expect(gyCurrentDay()).toBe(1);
  });

  it('gyCurrentDay() N gün önce başladıysa N+1 döner', () => {
    gyStart();
    const past = new Date(Date.now() - 4 * 86400000);
    S._gecisYolu.startDate = localISODate(past);
    expect(gyCurrentDay()).toBe(5);
  });

  it('gyCurrentDay() 21 günü aşmaz (tavan)', () => {
    gyStart();
    const past = new Date(Date.now() - 40 * 86400000);
    S._gecisYolu.startDate = localISODate(past);
    expect(gyCurrentDay()).toBe(21);
  });

  it('gyPerdeForDay() 4 perdeyi doğru gün aralıklarına eşler', () => {
    expect(gyPerdeForDay(1).key).toBe('hayal');
    expect(gyPerdeForDay(5).key).toBe('hayal');
    expect(gyPerdeForDay(6).key).toBe('inanc');
    expect(gyPerdeForDay(10).key).toBe('inanc');
    expect(gyPerdeForDay(11).key).toBe('his');
    expect(gyPerdeForDay(15).key).toBe('his');
    expect(gyPerdeForDay(16).key).toBe('secim');
    expect(gyPerdeForDay(21).key).toBe('secim');
  });

  it('gyGetState() başlamamışken active:false, completed:false döner', () => {
    const st = gyGetState();
    expect(st.active).toBe(false);
    expect(st.completed).toBe(false);
    expect(st.day).toBe(0);
  });

  it('gyGetState() aktifken doğru gün+perde döner', () => {
    gyStart();
    const st = gyGetState();
    expect(st.active).toBe(true);
    expect(st.day).toBe(1);
    expect(st.perde).toBe('hayal');
    expect(st.totalDays).toBe(21);
  });

  it('gyOpenToday() currentUser yokken false döner, state değişmez', () => {
    S.currentUser = null;
    const result = gyOpenToday();
    expect(result).toBe(false);
    expect(gyIsActive()).toBe(false);
  });

  it('gyOpenToday() henüz başlamamışsa otomatik başlatıp bugünün organını açar', () => {
    window.oikOpenReading = vi.fn();
    window.hayalAcSeans = vi.fn();
    gyOpenToday();
    expect(gyIsActive()).toBe(true);
    const called = window.oikOpenReading.mock.calls.length + window.hayalAcSeans.mock.calls.length;
    expect(called).toBe(1);
    delete window.oikOpenReading;
    delete window.hayalAcSeans;
  });

  it('gyOpenToday() ilgili perdenin organ fonksiyonunu window üzerinden çağırır', () => {
    gyStart();
    // 6-10. günlere taşı → 'inanc' perdesi → skOpen
    S._gecisYolu.startDate = localISODate(new Date(Date.now() - 6 * 86400000));
    window.skOpen = vi.fn();
    gyOpenToday();
    expect(window.skOpen).toHaveBeenCalledTimes(1);
    delete window.skOpen;
  });

  it('gyOpenToday() organ fonksiyonu window\'da yoksa sessizce false döner (crash yok)', () => {
    gyStart();
    expect(() => gyOpenToday()).not.toThrow();
  });

  it('gyOpenToday() 21. günü geçince yolculuğu completed olarak kapatır', () => {
    gyStart();
    S._gecisYolu.startDate = localISODate(new Date(Date.now() - 25 * 86400000));
    gyOpenToday();
    expect(S._gecisYolu.completed).toBe(true);
    expect(gyIsActive()).toBe(false);
  });
});

/* ══════════════════════════════════════════════════════════════
   PERDE ORGANLARI — window sözleşmesinin STATİK kapısı
   ───────────────────────────────────────────────────────────
   NEDEN: yukarıdaki davranış testleri organı `vi.fn()` ile window'a
   KENDİLERİ asıyor; bu yüzden gerçek kırığa kördüler. `skOpen`
   aylarca hiçbir yerde window'a asılmadı — `_openOrgan` sessizce
   false döndü ve 21 günlük yolun 6–10. günleri (DÜŞÜNCE ve İNANÇ
   perdesi) hiçbir şey açmadı; ne hata, ne uyarı. Bu kapı mock'a
   değil KAYNAĞA bakar: PERDELER'de adı geçen her organ gerçekten
   window'da duruyor mu?
══════════════════════════════════════════════════════════════ */
const _ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Yorumlar kanıt sayılmasın — bir organın adı yalnız açıklama satırında
    geçiyor olabilir (main.js'teki AÇICI SÖZLEŞMESİ notu gibi). */
function _yorumsuz(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** main.js'in tek `Object.assign(window, { … })` bloğu — süslü parantez
    sayarak kesilir ki import bloğundaki ad expose sanılmasın. */
function _mainExposeBlok() {
  const src = _yorumsuz(readFileSync(join(_ROOT, 'js/main.js'), 'utf8'));
  const anchor = src.indexOf('Object.assign(window, {');
  if (anchor < 0) return '';
  const basla = src.indexOf('{', anchor);
  let derinlik = 0;
  for (let i = basla; i < src.length; i++) {
    if (src[i] === '{') derinlik++;
    else if (src[i] === '}' && --derinlik === 0) return src.slice(basla, i + 1);
  }
  return '';
}

/** parts/*.js dosya sonu expose deseni: `window.yolOpen = yolOpen;` (§5.2). */
function _partsWindowAdlari() {
  const dir = join(_ROOT, 'js/parts');
  const adlar = new Set();
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.js')) continue;
    // Liste alındıktan SONRA dosya silinmiş olabilir (paralel koşu) —
    // o dosya window.* isim taşımıyor sayılır, tarama çökmez.
    let ham;
    try { ham = readFileSync(join(dir, f), 'utf8'); } catch (e) { if (e && e.code === 'ENOENT') continue; throw e; }
    const src = _yorumsuz(ham);
    for (const m of src.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=[^=]/g)) adlar.add(m[1]);
  }
  return adlar;
}

/** 13s'nin PERDELER tablosundaki organ adları — liste ikinci kez yazılmaz. */
function _perdeOrganlari() {
  const src = readFileSync(join(_ROOT, 'js/parts/13s-gecis-yolu.js'), 'utf8');
  const adlar = new Set();
  for (const m of src.matchAll(/organlar:\s*\[([^\]]*)\]/g))
    for (const q of m[1].matchAll(/'([^']+)'/g)) adlar.add(q[1]);
  return [...adlar];
}

describe('Perde organları — window sözleşmesi (statik kapı)', () => {
  const organlar = _perdeOrganlari();

  it('envanter koddan okunuyor ve dört perdenin organlarını kapsıyor', () => {
    expect(organlar.length).toBeGreaterThanOrEqual(4);
    expect(organlar).toContain('skOpen');
    expect(organlar).toContain('oikOpenReading');
    expect(organlar).toContain('hayalAcSeans');
    expect(organlar).toContain('yolOpen');
  });

  it('her organ gerçekten window\'a asılıyor — hiçbiri boşa düşmüyor', () => {
    const expose = _mainExposeBlok();
    const partsAdlari = _partsWindowAdlari();
    const eksik = organlar.filter(ad =>
      !new RegExp(`(^|[\\s,{])${ad}\\s*[,:}]`).test(expose) && !partsAdlari.has(ad)
    );
    expect(eksik).toEqual([]);
  });
});
