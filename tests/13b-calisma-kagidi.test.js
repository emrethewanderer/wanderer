// Çalışma Kağıdı (13b) — kitabın DÖRT adımı.
// Kitap her kağıtta aynı dördü söyler: sor → hayal et → olumlamayı sesli oku ve
// KENDİ SESİNDEN dinle → o kişinin davranışını sergile. Uygulamada 3. adımın
// ses kaydı ile 4. adım eksikti; bu testler ikisini ve geriye uyumluluğu tutar.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S } from '../js/state.js';
import { ckRenderCard, ckSeal } from '../js/parts/13b-calisma-kagidi.js';
import { dfRecordWorksheet, dfGetWorksheetSessions, dfLoadExtended } from '../js/parts/09b-depth-foundations.js';

function kagitAc(concept = 'standart') {
  document.body.innerHTML = '<div id="host"></div>';
  ckRenderCard(document.getElementById('host'), concept);
  return document.querySelector('.ck-card');
}

describe('Çalışma Kağıdı — dört adım', () => {
  beforeEach(() => {
    S.currentUser = { id: 'test-uid-ck-' + Date.now() + '-' + Math.random() };
    S._currentLang = 'tr';
    dfLoadExtended();   // oturum geçmişini bu uid için tazele
    document.body.innerHTML = '';
  });

  it('kağıt dört adımla açılır', () => {
    const kart = kagitAc();
    const adimlar = [...kart.querySelectorAll('.ck-step-label')].map(e => e.textContent);
    expect(adimlar.length).toBe(4);
    expect(adimlar[2]).toContain('PROGRAMLA');
    expect(adimlar[3]).toContain('DAVRANIŞ');
  });

  it('4. adımın kendi metin alanı vardır', () => {
    const kart = kagitAc();
    expect(kart.querySelector('.ck-input[data-step="4"]')).not.toBeNull();
  });

  it('MediaRecorder yoksa ses satırı hiç basılmaz — akış bloklanmaz', () => {
    // jsdom'da MediaRecorder tanımsız: özellik tespiti sessizce düşmeli
    const kart = kagitAc();
    expect(kart.querySelector('.ck-ses')).toBeNull();
    // Kağıt yine de mühürlenebilmeli
    kart.querySelector('.ck-input[data-step="1"]').value = 'yazdım';
    ckSeal(kart.querySelector('.ck-save'));
    expect(kart.classList.contains('sealed')).toBe(true);
  });

  it('4. adım doldurulunca kayda davranış alanı girer', () => {
    const kart = kagitAc('layik');
    kart.querySelector('.ck-input[data-step="1"]').value = 'kendimi layık görmüyorum';
    kart.querySelector('.ck-input[data-step="4"]').value = 'Bu hafta hayır demeyi deneyeceğim';
    ckSeal(kart.querySelector('.ck-save'));

    const son = dfGetWorksheetSessions().slice(-1)[0];
    expect(son.concept).toBe('layik');
    expect(son.davranis).toBe('Bu hafta hayır demeyi deneyeceğim');
  });

  it('4. adım boşsa davranış alanı YAZILMAZ (boş anahtar üretilmez)', () => {
    const kart = kagitAc('normal');
    kart.querySelector('.ck-input[data-step="1"]').value = 'yazdım';
    ckSeal(kart.querySelector('.ck-save'));
    const son = dfGetWorksheetSessions().slice(-1)[0];
    expect('davranis' in son).toBe(false);
    expect('ses_id' in son).toBe(false);
  });

  it('davranış yazıldıysa günün sözüne DAVET belirir (arka planda söz yazılmaz)', () => {
    const glSpy = vi.fn();
    window.glGiveSozNow = glSpy;
    const kart = kagitAc('oz_saygi');
    kart.querySelector('.ck-input[data-step="1"]').value = 'yazdım';
    kart.querySelector('.ck-input[data-step="4"]').value = 'Sınır koyacağım';
    ckSeal(kart.querySelector('.ck-save'));

    const koprü = kart.querySelector('.ck-soz-btn');
    expect(koprü).not.toBeNull();
    // Mühür ANINDA söz verilmez — kullanıcı düğmeye basana kadar çağrılmaz
    expect(glSpy).not.toHaveBeenCalled();
  });

  it('davranış boşsa söz daveti de çıkmaz', () => {
    const kart = kagitAc('bolluk');
    kart.querySelector('.ck-input[data-step="1"]').value = 'yazdım';
    ckSeal(kart.querySelector('.ck-save'));
    expect(kart.querySelector('.ck-soz-btn')).toBeNull();
  });

  it('1. adım boşken mühür basılmaz', () => {
    const kart = kagitAc();
    ckSeal(kart.querySelector('.ck-save'));
    expect(kart.classList.contains('sealed')).toBe(false);
  });

  it('mühür bir törendir: altın damga basılır ve seal cue\'su duyulur', () => {
    const cue = vi.fn();
    window.fxCue = cue;
    const kart = kagitAc('oz_deger');
    kart.querySelector('.ck-input[data-step="1"]').value = 'yazdım';
    ckSeal(kart.querySelector('.ck-save'));

    const damga = kart.querySelector('.ck-stamp');
    expect(damga).not.toBeNull();
    // Damganın dili kimlik mührüyle AYNI motordan gelir — ikizi yazılmadı
    expect(damga.classList.contains('oik-seal-stamp')).toBe(true);
    expect(cue).toHaveBeenCalledWith('seal');
  });

  it('mühür basılmadıysa damga da yoktur', () => {
    window.fxCue = vi.fn();
    const kart = kagitAc();
    ckSeal(kart.querySelector('.ck-save'));   // 1. adım boş → mühür yok
    expect(kart.querySelector('.ck-stamp')).toBeNull();
    expect(window.fxCue).not.toHaveBeenCalled();
  });
});

describe('dfRecordWorksheet — geriye uyumluluk', () => {
  beforeEach(() => {
    S.currentUser = { id: 'test-uid-dfw-' + Date.now() + '-' + Math.random() };
    dfLoadExtended();
  });

  it('dört argümanlı ESKİ çağrı (sohbet içi [KAGIT]) hâlâ geçerlidir', () => {
    dfRecordWorksheet('standart', 'cevap', 'hayal', 'olumlama');
    const son = dfGetWorksheetSessions().slice(-1)[0];
    expect(son.step1_answer).toBe('cevap');
    expect(son.step3_affirmation).toBe('olumlama');
    expect('davranis' in son).toBe(false);
  });

  it('beşinci argüman ses ve davranışı taşır, davranış 200 karakterde kesilir', () => {
    dfRecordWorksheet('normal', 'a', 'b', 'c', { sesId: 'ck_ses_x', davranis: 'x'.repeat(260) });
    const son = dfGetWorksheetSessions().slice(-1)[0];
    expect(son.ses_id).toBe('ck_ses_x');
    expect(son.davranis.length).toBe(200);
  });
});
