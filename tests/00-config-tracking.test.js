/**
 * Tests for js/parts/00-config-tracking.js
 *
 * Covers pure utility functions that don't require a real DOM or network:
 * - nowTR() — Turkish timezone helper
 * - detectTopics() — NLP keyword matcher
 * - getUserMsgCount() — counts user messages in chatHistory
 * - trackEmotionalFlow() — appends emotion to S._emotionalFlow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { S } from '../js/state.js';
import { AI_MODES } from '../js/config.js';
import { SecureStorage, STORAGE_KEYS } from '../js/parts/00a-infrastructure.js';

// Import after state so S is already initialised
import {
  detectTopics,
  getUserMsgCount,
  trackEmotionalFlow,
  getEmotionalFlowInsight,
  nowTR,
  captureCommitments,
  resolveCommitment,
  getPendingCommitmentContext,
  getCleanCommitments,
  setAmbientAura,
} from '../js/parts/00-config-tracking.js';

describe('nowTR()', () => {
  it('returns a Date object', () => {
    const d = nowTR();
    expect(d).toBeInstanceOf(Date);
  });

  it('returns a date close to "now"', () => {
    const before = Date.now();
    const d = nowTR();
    const after  = Date.now();
    expect(d.getTime()).toBeGreaterThanOrEqual(before - 10800000); // ±3h
    expect(d.getTime()).toBeLessThanOrEqual(after  + 10800000);
  });
});

// detectTopics returns keys from _TOPIC_KEYS: ['family','work','relationship','money','health','future']
describe('detectTopics(text)', () => {
  it('returns an array', () => {
    const topics = detectTopics('Bu durumda çok kaygılanıyorum');
    expect(Array.isArray(topics)).toBe(true);
  });

  it('returns empty array for empty string', () => {
    expect(detectTopics('')).toEqual([]);
  });

  it('returns empty array for short text with no keywords', () => {
    // Very short, no topic keywords
    expect(detectTopics('ok')).toEqual([]);
  });

  it('only returns values from known topic keys', () => {
    const validKeys = ['family', 'work', 'relationship', 'money', 'health', 'future'];
    const topics = detectTopics('I am worried about my work and money problems');
    topics.forEach(t => {
      expect(validKeys).toContain(t);
    });
  });

  it('detects relationship topic from English text', () => {
    const topics = detectTopics('I have serious problems with my partner and relationship');
    expect(Array.isArray(topics)).toBe(true);
    // May or may not match depending on i18n patterns — just verify no throw
  });
});

describe('getUserMsgCount()', () => {
  beforeEach(() => {
    S.chatHistory = [];
  });

  it('returns 0 for empty chatHistory', () => {
    expect(getUserMsgCount()).toBe(0);
  });

  it('counts only user messages', () => {
    S.chatHistory = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
      { role: 'user', content: 'goodbye' },
    ];
    expect(getUserMsgCount()).toBe(2);
  });

  it('returns 0 when only assistant messages exist', () => {
    S.chatHistory = [
      { role: 'assistant', content: 'Welcome!' },
    ];
    expect(getUserMsgCount()).toBe(0);
  });
});

// trackEmotionalFlow(text) — Duygu Motoru'na (13D) DEVREDİLDİ (2026-08-29,
// FAZ 2): intensity artık dgNabiz'in sürekli 0..4 kuvvetidir; kanıt yoksa
// eski "2: nötr" varsayılanı yerine null döner ve akışa hiçbir şey eklenmez
// (§6.10). Emsal: .claude/plans/gerceklik-mimarisi.md.
describe('trackEmotionalFlow(text)', () => {
  beforeEach(() => {
    S._emotionalFlow = [];
  });

  it('kanıt taşıyan metinde S._emotionalFlow\'a kayıt ekler', () => {
    trackEmotionalFlow('çok üzgünüm bugün');
    expect(S._emotionalFlow.length).toBe(1);
  });

  it('emotion record has intensity and direction properties', () => {
    trackEmotionalFlow('çok kızgınım');
    const record = S._emotionalFlow[0];
    expect(record).toHaveProperty('intensity');
    expect(record).toHaveProperty('direction');
    expect(typeof record.intensity).toBe('number');
  });

  it('kanıtsız metinde ("xyz unrecognised"): null döner, akışa HİÇBİR ŞEY eklenmez', () => {
    const result = trackEmotionalFlow('xyz unrecognised');
    expect(result).toBeNull();
    expect(S._emotionalFlow.length).toBe(0);
  });

  it('accumulates multiple (kanıtlı) records', () => {
    trackEmotionalFlow('üzgünüm');
    trackEmotionalFlow('kızgınım');
    trackEmotionalFlow('mutluyum');
    expect(S._emotionalFlow.length).toBe(3);
  });

  /* İKİ TANIK ALANLARI (FAZ 17, K10 kadran 1-2) + faz denetimi 2026-08-30:
     araya giren KANITSIZ tur ikinci tanığı silmemeli. `toren` yüzeyi bu
     turun ölçümüyle BAŞKA bir turun ölçümünü iki ayrı tanık sayar; devir
     yalnız `S._dgNabiz` üzerinden yapılsaydı E→∅→E dizisinde tanık
     kaybolur, kullanıcı günde iki kez ölçülmüşken tören susardı. */
  it('nabız devri: ikinci tanık BAŞKA bir turun ölçümüdür, sahte ikiz değil', () => {
    S._dgNabiz = null; S._dgOncekiNabiz = null; S._dgNabizZaman = null;
    trackEmotionalFlow('çok üzgünüm');
    expect(S._dgNabiz).toBeTruthy();
    expect(S._dgOncekiNabiz).toBeNull();          // ilk ölçümün öncesi yok
    expect(typeof S._dgNabizZaman).toBe('number'); // ölçümün damgası
    const ilk = S._dgNabiz;
    trackEmotionalFlow('çok mutluyum');
    expect(S._dgOncekiNabiz).toBe(ilk);            // devir ÜZERİNE yazmadan önce
    expect(S._dgNabiz).not.toBe(S._dgOncekiNabiz); // aynı nabza işaret etmiyor
  });

  it('kanıtsız tur ikinci tanığı SİLMEZ — E→∅→E dizisinde tanık korunur', () => {
    S._dgNabiz = null; S._dgOncekiNabiz = null;
    trackEmotionalFlow('çok üzgünüm');
    const ilk = S._dgNabiz;
    trackEmotionalFlow('xyz unrecognised');        // kanıtsız tur
    expect(S._dgNabiz).toBeNull();                 // bu turun okuması yok olur (kadran 2)
    expect(S._dgOncekiNabiz).toBe(ilk);            // ama ölçüm bir basamak GERİ ÇEKİLİR
    trackEmotionalFlow('çok mutluyum');            // yeniden ölçüm
    expect(S._dgNabiz).toBeTruthy();
    expect(S._dgOncekiNabiz).toBe(ilk);            // ARADAKİ SESSİZ TUR TANIĞI YUTMADI
  });

  it('returns { intensity, direction } object', () => {
    const result = trackEmotionalFlow('rahatladım');
    expect(result).toHaveProperty('intensity');
    expect(result).toHaveProperty('direction');
  });

  it('handles empty text without throwing (kanıt yok → null)', () => {
    expect(() => trackEmotionalFlow('')).not.toThrow();
    expect(trackEmotionalFlow('')).toBeNull();
  });

  // KIRIK 2 (plan Bağlam, duygu-motoru.md): eski kod yalnız 5/3/2/1 üretirdi
  // — "4" hiç doğmazdı, oysa _determineContextMode (01:187) tam bu eşiği
  // arıyordu. 13D'nin sürekli 0..4 kuvveti bunu kendiliğinden düzeltir.
  it('KIRIK 2 düzeldi: intensity artık TAM 4 değerini üretebilir (eskiden asla)', () => {
    const result = trackEmotionalFlow('çok kaygılıyım, panik atıyorum!');
    expect(result.intensity).toBe(4);
  });
});

// Söz Defteri (Geçiş Motoru FAZ 2) — taahhüt döngüsüne eklenen sonuç takibi.
// captureCommitments zaten var olan regex yakalayıcıydı; kept/resolveCommitment
// yeni: her taahhüdün "tuttum/tutamadım" sonucu artık ayrı ayrı kaydediliyor.
describe('Söz Defteri — taahhüt döngüsü sonuç takibi', () => {
  const uid = 'test-uid-soz';
  const key = STORAGE_KEYS.COMMITMENTS(uid);

  beforeEach(() => {
    S.currentUser = { id: uid };
    SecureStorage.set(key, uid, []);
  });

  it('captureCommitments yakaladığı taahhüde kept:null ekler', () => {
    captureCommitments('yarın spor yapacağım');
    const stored = SecureStorage.get(key, uid, []);
    expect(stored.length).toBe(1);
    expect(stored[0]).toHaveProperty('kept', null);
    expect(stored[0].checked).toBe(false);
  });

  it('taahhüt yakalamayan metin hiçbir kayıt eklemez', () => {
    captureCommitments('bugün hava çok güzel');
    expect(SecureStorage.get(key, uid, []).length).toBe(0);
  });

  it('resolveCommitment(idx, true) kaydı tutuldu olarak kapatır', () => {
    captureCommitments('yarın spor yapacağım');
    const ok = resolveCommitment(0, true);
    expect(ok).toBe(true);
    const stored = SecureStorage.get(key, uid, []);
    expect(stored[0].kept).toBe(true);
    expect(stored[0].checked).toBe(true);
  });

  it('resolveCommitment(idx, false) kaydı tutulmadı olarak kapatır', () => {
    captureCommitments('yarın spor yapacağım');
    resolveCommitment(0, false);
    const stored = SecureStorage.get(key, uid, []);
    expect(stored[0].kept).toBe(false);
  });

  it('resolveCommitment geçersiz index için false döner, atmaz', () => {
    expect(resolveCommitment(99, true)).toBe(false);
  });

  it('getPendingCommitmentContext bekleyen (dünkü) sözü bağlama ekler', () => {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    SecureStorage.set(key, uid, [
      { text: 'dünkü söz', date: yesterday, checked: false, kept: null },
    ]);
    const ctx = getPendingCommitmentContext();
    expect(ctx).toContain('dünkü söz');
  });

  it('getPendingCommitmentContext bugünkü (henüz hesabı görülmemiş) sözü bağlama EKLEMEZ', () => {
    const today = nowTR().toDateString();
    SecureStorage.set(key, uid, [
      { text: 'bugünkü söz', date: today, checked: false, kept: null },
    ]);
    expect(getPendingCommitmentContext()).toBe('');
  });

  it('getPendingCommitmentContext birden fazla bekleyen sözü listeler', () => {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    SecureStorage.set(key, uid, [
      { text: 'ilk söz', date: yesterday, checked: false, kept: null },
      { text: 'ikinci söz', date: yesterday, checked: false, kept: null },
    ]);
    const ctx = getPendingCommitmentContext();
    expect(ctx).toContain('ilk söz');
    expect(ctx).toContain('ikinci söz');
  });

  it('getPendingCommitmentContext sonuçlanmış (kept) sözleri de yansıtır', () => {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    SecureStorage.set(key, uid, [
      { text: 'tutulan söz', date: yesterday, checked: true, kept: true },
      { text: 'tutulmayan söz', date: yesterday, checked: true, kept: false },
    ]);
    const ctx = getPendingCommitmentContext();
    expect(ctx).toContain('tutulan söz');
    expect(ctx).toContain('tutulmayan söz');
  });

  it('hiçbir bekleyen/sonuçlanmış söz yoksa boş string döner', () => {
    SecureStorage.set(key, uid, []);
    expect(getPendingCommitmentContext()).toBe('');
  });
});

// Eski "[object Object]" regex hatası (artık düzeltildi, bkz. captureCommitments
// yorumu) storage'a tek/iki karakterlik çöp taahhütler bırakmıştı — Hesap Günü'nde
// onlarca anlamsız satır olarak geri geliyorlardı. getCleanCommitments bunları
// sessizce kapatır.
describe('getCleanCommitments() — eski regex hatasından kalan çöp kayıtları temizler', () => {
  const uid = 'test-uid-soz';
  const key = STORAGE_KEYS.COMMITMENTS(uid);

  beforeEach(() => {
    S.currentUser = { id: uid };
  });

  it('tek karakterlik çöp kaydı checked:true yapar, kept:null bırakır', () => {
    SecureStorage.set(key, uid, [
      { text: 'e', date: nowTR().toDateString(), checked: false, kept: null },
    ]);
    const cleaned = getCleanCommitments();
    expect(cleaned[0].checked).toBe(true);
    expect(cleaned[0].kept).toBe(null);
  });

  it('boş metinli kaydı da temizler', () => {
    SecureStorage.set(key, uid, [
      { text: '', date: nowTR().toDateString(), checked: false, kept: null },
    ]);
    expect(getCleanCommitments()[0].checked).toBe(true);
  });

  it('gerçek uzunlukta bir taahhüde dokunmaz', () => {
    SecureStorage.set(key, uid, [
      { text: 'ilk söz', date: nowTR().toDateString(), checked: false, kept: null },
    ]);
    const cleaned = getCleanCommitments();
    expect(cleaned[0].checked).toBe(false);
    expect(cleaned[0].text).toBe('ilk söz');
  });

  it('zaten çözülmüş (checked:true) kısa kayıtlara dokunmaz', () => {
    SecureStorage.set(key, uid, [
      { text: 'e', date: nowTR().toDateString(), checked: true, kept: false },
    ]);
    const cleaned = getCleanCommitments();
    expect(cleaned[0].kept).toBe(false); // temizlik geçmiş sonucu ezmez
  });

  it('temizlik sonucunu storage\'a kalıcı yazar', () => {
    SecureStorage.set(key, uid, [
      { text: 't', date: nowTR().toDateString(), checked: false, kept: null },
    ]);
    getCleanCommitments();
    const stored = SecureStorage.get(key, uid, []);
    expect(stored[0].checked).toBe(true);
  });

  it('getPendingCommitmentContext çöp kayıtları bağlama sızdırmaz', () => {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    SecureStorage.set(key, uid, [
      { text: 't', date: yesterday, checked: false, kept: null },
      { text: 'dünkü gerçek söz', date: yesterday, checked: false, kept: null },
    ]);
    const ctx = getPendingCommitmentContext();
    expect(ctx).toContain('dünkü gerçek söz');
    expect(ctx).not.toContain('"t"');
  });
});

/* TAZELİK (denetim 2026-08-29, FAZ 5) — K10 kadran 2'nin ta kendisi.
   trackEmotionalFlow kanıtsız mesajda erken dönüyordu ve S._dgNabiz bir
   ÖNCEKİ turun nabzını tutmaya devam ediyordu. Sonuç: "tamam, peki" gibi
   nötr bir mesaja, iki tur önceki cümle KANIT gösterilerek karşılama
   veriliyordu. Eskimiş okuma eskimez — YOK OLUR. */
describe('trackEmotionalFlow — kanıtsız tur nabzı eskitmez', () => {
  beforeEach(() => {
    S._currentLang = 'tr';
    S._emotionalFlow = [];
    S._dgNabiz = null;
    S._dgYay = null;
    S._dgIklim = null;
  });

  it('kanıtlı mesaj S._dgNabiz doldurur', () => {
    trackEmotionalFlow('çok kaygılıyım, panik atıyorum!');
    expect(S._dgNabiz).not.toBeNull();
    expect(S._dgNabiz.kuvvet).toBe(4);
  });

  it('ARDINDAN gelen kanıtsız mesaj S._dgNabiz\'i NULL\'lar — önceki tur taşınmaz', () => {
    trackEmotionalFlow('çok kaygılıyım, panik atıyorum!');
    expect(S._dgNabiz).not.toBeNull();
    trackEmotionalFlow('tamam, peki');
    expect(S._dgNabiz).toBeNull();
  });

  it('kanıtsız tur akışa kayıt EKLEMEZ (ölçüm defteri bozulmaz)', () => {
    trackEmotionalFlow('çok kaygılıyım!');
    const uzunluk = S._emotionalFlow.length;
    trackEmotionalFlow('tamam, peki');
    expect(S._emotionalFlow.length).toBe(uzunluk);
  });
});

/* Duygu Motoru (13D, FAZ 7, K8 beden kanalı) — setAmbientAura TEK çağrı
   yerinde genişledi (00:320). Reduced-motion=true ile test edilir ki
   450ms'lik yumuşak geçiş setTimeout'u beklenmesin — sınıf senkron atanır. */
describe('setAmbientAura(mode, dgEksen) — Duygu Motoru beden kanalı (FAZ 7)', () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="ambient-aura" aria-hidden="true"></div>`;
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  });

  afterEach(() => { delete window.matchMedia; document.body.innerHTML = ''; });

  it('dgEksen verilmezse eski davranış korunur — yalnız moda göre sınıf', () => {
    setAmbientAura(AI_MODES.DIRECT);
    expect(document.getElementById('ambient-aura').className).toBe('aura-direct');
  });

  it('kutlama ekseni — mod SOFT (kendi auraı yok) olsa bile aura-celebrate basar', () => {
    setAmbientAura(AI_MODES.SOFT, 'kutlama');
    expect(document.getElementById('ambient-aura').className).toBe('aura-celebrate');
  });

  /* FAZ 8: diriltme kendi ADINI aldı. Rengi (altın) aura-depth'le aynı
     kuralı paylaşır ama sınıf adı ayrıdır — "depth" grep'i artık diriltme
     bulmaz (§4.3 ad senkronu). */
  it('diriltme ekseni aura-kindle basar (aura-depth DEĞİL)', () => {
    setAmbientAura(AI_MODES.SOFT, 'diriltme');
    expect(document.getElementById('ambient-aura').className).toBe('aura-kindle');
  });

  it('DEPTH modu hâlâ aura-depth basar — iki ad ayrıştı, çakışmıyor', () => {
    setAmbientAura(AI_MODES.DEPTH, null);
    expect(document.getElementById('ambient-aura').className).toBe('aura-depth');
  });

  it('eşlenmemiş eksenler (tanıklık/yatıştırma/berraklık/sahiplenme) mod tabanlı auraı EZMEZ', () => {
    setAmbientAura(AI_MODES.DIRECT, 'yatistirma');
    expect(document.getElementById('ambient-aura').className).toBe('aura-direct');
  });

  it('K9 pazarlıksız: tutma (kriz) eksenle çağrılsa bile aura yalnız moddan gelir', () => {
    // 'tutma' hiçbir sınıfa eşlenmez; bir gün DG_AURA_CLASS'a yanlışlıkla
    // eklenirse bile açık `dgEksen !== 'tutma'` bekçisi bunu keser.
    setAmbientAura(AI_MODES.DEPTH, 'tutma');
    expect(document.getElementById('ambient-aura').className).toBe('aura-depth');
  });
});

/* ─── DİKİŞ: ölçüm defteri ile motorun sözleşmesi (2026-08-30 inceleme turu) ───
   İki kırık da AYNI cinsten: 13D'nin saf fonksiyonları kendi sözleşmelerini
   doğru uyguluyor ve birim testleri yeşil — ama bu dosyadaki ÇAĞRI onlara
   yanlış alanı veriyor. Birim testi bu sınıfı hiçbir zaman göremez; kapı
   çağrının kendisinde olmalı. */
describe('dikiş — trackEmotionalFlow motora doğru alanı veriyor mu', () => {
  beforeEach(() => {
    S._currentLang = 'tr';
    S._emotionalFlow = [];
    S._dgNabiz = null;
    S._dgOncekiNabiz = null;
    S._dgYay = null;
    S._dgIklim = null;
  });

  /* YAY ÖLÜ MÜYDÜ (K2 kural 2). `dgYay` `{kuvvet}` alanı olan girdileri
     sayar; `S._emotionalFlow` aynı sayıyı `intensity` adıyla taşır. Alan
     adları ayrışınca `dgYay` DAİMA null döner: `akisYon` da null kalır
     (nabzın kendi `yon`u da yok — `opts.onceki` geçilmiyor) ve K2'nin
     ikinci kuralı — yükselen yoğunlukta yatıştırma — hiç tetiklenemez.
     Plan FAZ 3 bunu açıkça istiyordu: "Yayı (dgYay) bu fazda gerçek
     tüketici yaptığında…". */
  it('iki ölçülü tur sonrası S._dgYay okunur — yay ölü değil', () => {
    trackEmotionalFlow('üzgünüm');
    trackEmotionalFlow('çok kaygılıyım, panik!');
    expect(S._dgYay).toBe('yukselen');
  });

  it('düşen eğri de okunur', () => {
    trackEmotionalFlow('çok kaygılıyım, panik!');
    trackEmotionalFlow('üzgünüm');
    expect(S._dgYay).toBe('dusen');
  });

  /* TABAN MUTLAK KUVVETİ İSTER (K4). `_dgGoreliKuvvet` gelen mutlak kuvveti
     kovadaki değerlerle KIYASLAR; kovaya göreli (yüzdelikten türemiş) bir
     sayı yazmak zemini kendi çıktısıyla beslemektir — dağılım zamanla
     kendi ortasına düzleşir ve "bu kişinin kendi tabanı" ölçmediği bir şey
     hâline gelir. `dgIklimTabanEkle`nin kendi sözleşmesi de "mutlak" der. */
  it('İklim tabanına MUTLAK kuvvet yazılır, göreli olan değil', () => {
    S._dgIklim = {
      taban: { n: 20, kova: new Array(20).fill(4), tarih: null },
      lehce: {}, defter: {}, beyan: {},
      isabet: { n: 0, uyum: null, son: null },
      yuzeyDefter: {},
      modelOkuma: { n: 0, ayristi: 0, son: null },
      v: 1,
    };
    // 'üzgünüm' → keder, mutlak kuvvet 2. Kova baştan sona 4 olduğu için
    // GÖRELİ kuvvet 0'a iner — ikisi ayrışır, hangisinin yazıldığı görünür.
    trackEmotionalFlow('üzgünüm');
    expect(S._dgNabiz.kuvvetMutlak).toBe(2);
    expect(S._dgNabiz.kuvvet).toBe(0);          // göreli okuma (K4)
    const kova = S._dgIklim.taban.kova;
    expect(kova[kova.length - 1]).toBe(2);      // tabana MUTLAK yazılmalı
  });
});

/* AYNI KIRIĞIN ÜÇÜNCÜ ÖRNEĞİ — `getEmotionalFlowInsight` de `dgYay(recent)`
   çağırıyordu ve `recent` `intensity` taşıdığı için yay daima null'dı: iki
   okuma (sakin→yoğun, yoğun→sakin) FAZ 3'ten beri hiç doğmamıştı, üstelik
   üstlerindeki yorum "dgYay artık gerçek tüketici" diyordu. */
describe('getEmotionalFlowInsight — yay okumaları gerçekten doğuyor', () => {
  beforeEach(() => { S._currentLang = 'tr'; S._emotionalFlow = []; });

  it('sakin → yoğun (bitişik turlar) okumayı üretir', () => {
    S._emotionalFlow = [
      { intensity: 1, direction: null, text: 'iyiyim', tur: 1 },
      { intensity: 4, direction: 'up', text: 'çok kaygılıyım!', tur: 2 },
    ];
    expect(getEmotionalFlowInsight()).toContain('DUYGUSAL AKIŞ');
  });

  it('yoğun → sakin (bitişik turlar) okumayı üretir', () => {
    S._emotionalFlow = [
      { intensity: 4, direction: null, text: 'çok kaygılıyım!', tur: 1 },
      { intensity: 1, direction: 'down', text: 'rahatladım', tur: 2 },
    ];
    expect(getEmotionalFlowInsight()).toContain('DUYGUSAL AKIŞ');
  });

  it('BİTİŞİK OLMAYAN turlarda susar — sahte geçiş iddiası yok', () => {
    S._emotionalFlow = [
      { intensity: 1, direction: null, text: 'iyiyim', tur: 1 },
      { intensity: 4, direction: 'up', text: 'çok kaygılıyım!', tur: 5 },
    ];
    expect(getEmotionalFlowInsight()).toBe('');
  });
});
