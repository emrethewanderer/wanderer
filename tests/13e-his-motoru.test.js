/**
 * Tests for js/parts/13e-his-motoru.js — His Motoru (imza sesleri + haptik).
 *
 * WebAudio jsdom'da yok; burada minimal sahte AudioContext kurulur (yalnız
 * bu dosyada — setup.js'e global mock koymak autoplay-guard tuzaklarını
 * görünmez kılardı, bkz. setup.js'in sb.rpc yorum satırındaki aynı ilke).
 * navigator.vibrate ve @capacitor/haptics de burada mock'lanır.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@capacitor/haptics', () => {
  const impact = vi.fn().mockResolvedValue();
  const notification = vi.fn().mockResolvedValue();
  const vibrate = vi.fn().mockResolvedValue();
  return {
    Haptics: { impact, notification, vibrate },
    ImpactStyle: { Heavy: 'HEAVY', Medium: 'MEDIUM', Light: 'LIGHT' },
    NotificationType: { Success: 'SUCCESS' },
  };
});

/* ── Sahte WebAudio grafiği — yalnız çağrıldığını doğrulamak için ── */
class FakeAudioParam {
  constructor(value = 0) { this.value = value; }
  setValueAtTime() { return this; }
  linearRampToValueAtTime() { return this; }
  exponentialRampToValueAtTime() { return this; }
  setTargetAtTime() { return this; }
  cancelScheduledValues() { return this; }
}
class FakeNode { connect() { return this; } }
class FakeOscillator extends FakeNode {
  constructor() { super(); this.frequency = new FakeAudioParam(440); this.detune = new FakeAudioParam(0); this.type = 'sine'; }
  start() {} stop() {}
}
class FakeGain extends FakeNode {
  constructor() { super(); this.gain = new FakeAudioParam(1); }
}
class FakeBiquad extends FakeNode {
  constructor() { super(); this.frequency = new FakeAudioParam(350); this.Q = new FakeAudioParam(1); this.type = 'lowpass'; }
}
class FakeBufferSource extends FakeNode {
  constructor() { super(); this.buffer = null; this.loop = false; }
  start() {} stop() {}
}
class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = 'running'; // testte autoplay-guard'ı ayrı test etmiyoruz
    this.destination = new FakeNode();
    this.sampleRate = 44100;
  }
  createGain() { return new FakeGain(); }
  createOscillator() { return new FakeOscillator(); }
  createBiquadFilter() { return new FakeBiquad(); }
  createBufferSource() { return new FakeBufferSource(); }
  createBuffer(_ch, length) { return { getChannelData: () => new Float32Array(length) }; }
  resume() { this.state = 'running'; return Promise.resolve(); }
}

async function freshModule() {
  vi.resetModules();
  window.AudioContext = FakeAudioContext;
  window.Capacitor = { isNativePlatform: () => false };
  Object.defineProperty(window.navigator, 'vibrate', { value: vi.fn(() => true), configurable: true, writable: true });
  const { S } = await import('../js/state.js');
  const fx = await import('../js/parts/13e-his-motoru.js');
  return { S, fx };
}

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  document.documentElement.className = ''; // tw-* sızmasın (FAZ D testleri ekler)
});

describe('fx prefs — varsayılan + kalıcılık', () => {
  it('varsayılan { sound:true, haptic:true }', async () => {
    const { fx } = await freshModule();
    fx.fxLoad(); // kayıt yok → default korunur
    fx.fxSyncSettingsUI(); // atmaz, id'ler yoksa no-op — yalnız hata vermediğini doğrula
    expect(() => fx.fxCue('tap')).not.toThrow();
  });

  it('fxSave SafeStorage önbelleğine yazar, fxLoad geri okur', async () => {
    // SafeStorage kalıcılığı gerçek storage değil, bellek-içi _kvCache
    // (00a:46) + Supabase eşitleme; sayfa-yenileme senaryosu storageInit
    // hidrasyonuna bağlıdır ve birim testin kapsamı dışında. Burada aynı
    // modül grafiğinde fxSave→SafeStorage.get→fxLoad zincirini doğruluyoruz.
    const { fx } = await freshModule();
    const { SafeStorage } = await import('../js/parts/00a-infrastructure.js');
    fx.fxToggleSound(false);
    fx.fxToggleHaptic(false);
    expect(SafeStorage.get('etw_fx_prefs_v1_anon')).toEqual({ sound: false, haptic: false, nightDim: true, ambient: false, sesKademe: 'tam' });

    fx.fxLoad();
    const vibSpy = vi.spyOn(window.navigator, 'vibrate');
    fx.fxHaptic('heavy');
    expect(vibSpy).not.toHaveBeenCalled();
  });

  it('kısmi kayıt varsayılanlarla birleşir (ileri-uyumlu merge)', async () => {
    const { S, fx } = await freshModule();
    const { SafeStorage } = await import('../js/parts/00a-infrastructure.js');
    S.currentUser = { id: 'merge-uid' };
    SafeStorage.set('etw_fx_prefs_v1_merge-uid', { sound: false }); // haptic alanı kayıtta yok
    fx.fxLoad();
    const oscSpy = vi.spyOn(FakeAudioContext.prototype, 'createOscillator');
    const vibSpy = vi.spyOn(window.navigator, 'vibrate');
    fx.fxCue('seal');
    expect(oscSpy).not.toHaveBeenCalled();               // sound:false kayıttan geldi
    expect(vibSpy).toHaveBeenCalledWith([12, 30, 60]);    // haptic alanı yoktu → default true korundu
  });
});

describe('fxHaptic — web yolu (navigator.vibrate)', () => {
  it('haptic kapalıyken hiçbir şey tetiklemez', async () => {
    const { fx } = await freshModule();
    fx.fxToggleHaptic(false);
    const vibSpy = vi.spyOn(window.navigator, 'vibrate');
    vibSpy.mockClear();
    fx.fxHaptic('heavy');
    expect(vibSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['heavy', [12, 30, 60]],
    ['medium', 25],
    ['success', [10, 40, 20]],
    ['light', 8],
    [[5, 5, 5], [5, 5, 5]],
  ])('kind=%o → vibrate(%o)', async (kind, expected) => {
    const { fx } = await freshModule();
    const vibSpy = vi.spyOn(window.navigator, 'vibrate');
    await fx.fxHaptic(kind);
    expect(vibSpy).toHaveBeenCalledWith(expected);
  });
});

describe('fxHaptic — native yolu (@capacitor/haptics)', () => {
  it('success → Haptics.notification(Success)', async () => {
    const { fx } = await freshModule();
    window.Capacitor.isNativePlatform = () => true;
    const { Haptics } = await import('@capacitor/haptics');
    await fx.fxHaptic('success');
    expect(Haptics.notification).toHaveBeenCalledWith({ type: 'SUCCESS' });
  });

  it('heavy → Haptics.impact(Heavy)', async () => {
    const { fx } = await freshModule();
    window.Capacitor.isNativePlatform = () => true;
    const { Haptics } = await import('@capacitor/haptics');
    await fx.fxHaptic('heavy');
    expect(Haptics.impact).toHaveBeenCalledWith({ style: 'HEAVY' });
  });

  it('dizi kind → Haptics.vibrate(toplam süre)', async () => {
    const { fx } = await freshModule();
    window.Capacitor.isNativePlatform = () => true;
    const { Haptics } = await import('@capacitor/haptics');
    await fx.fxHaptic([10, 20, 30]);
    expect(Haptics.vibrate).toHaveBeenCalledWith({ duration: 60 });
  });

  it('eşzamanlı çağrılar (_hapticSeq deseni) aynı import sürecini paylaşır — ikisi de gerçek Haptics\'e ulaşır', async () => {
    // Regresyon: _loadHaptics eskiden boolean bayrakla (_hapticsTried) önbelleğe
    // alıyordu — import henüz çözülmeden gelen ikinci çağrı "denendi ama yok"
    // sanıp sessizce web vibrate fallback'ine düşerdi (native'de o da yoktur).
    // _hapticSeq art arda 180-700ms'de fxHaptic çağırdığı için bu yarış
    // gerçek risk; promise önbelleğe alınınca ikisi de aynı yüklemeyi bekler.
    const { fx } = await freshModule();
    window.Capacitor.isNativePlatform = () => true;
    const { Haptics } = await import('@capacitor/haptics');
    Haptics.impact.mockClear(); // mock modülü dosya boyunca paylaşılır
    const vibSpy = vi.spyOn(window.navigator, 'vibrate');
    const p1 = fx.fxHaptic('medium'); // await EDİLMEDEN ikincisi çağrılır
    const p2 = fx.fxHaptic('heavy');
    await Promise.all([p1, p2]);
    expect(Haptics.impact).toHaveBeenCalledTimes(2);
    expect(vibSpy).not.toHaveBeenCalled(); // hiçbiri web fallback'ine düşmedi
  });
});

describe('fxCue — sözlük + kontrat', () => {
  it('bilinmeyen cue sessiz no-op', async () => {
    const { fx } = await freshModule();
    const vibSpy = vi.spyOn(window.navigator, 'vibrate');
    expect(() => fx.fxCue('yok-boyle-bir-cue')).not.toThrow();
    expect(vibSpy).not.toHaveBeenCalled();
  });

  it('seal → ses (osilatör) + heavy haptik birlikte tetiklenir', async () => {
    const { fx } = await freshModule();
    const oscSpy = vi.spyOn(FakeAudioContext.prototype, 'createOscillator');
    const vibSpy = vi.spyOn(window.navigator, 'vibrate');
    fx.fxCue('seal');
    expect(oscSpy).toHaveBeenCalled();
    expect(vibSpy).toHaveBeenCalledWith([12, 30, 60]);
  });

  it('whoosh haptiksiz — yalnız ses tetiklenir', async () => {
    const { fx } = await freshModule();
    const vibSpy = vi.spyOn(window.navigator, 'vibrate');
    fx.fxCue('whoosh');
    expect(vibSpy).not.toHaveBeenCalled();
  });

  it('mevcut 13 cue adı sözlükte duruyor (regresyon)', async () => {
    const { fx } = await freshModule();
    const vibSpy = vi.spyOn(window.navigator, 'vibrate').mockImplementation(() => true);
    const names = ['tap', 'seal', 'milestone1', 'milestone2', 'milestone3', 'milestone4',
      'pack', 'holo', 'holoGrand', 'gift', 'soz', 'elmas', 'whoosh'];
    for (const n of names) expect(() => fx.fxCue(n)).not.toThrow();
    expect(vibSpy).toHaveBeenCalled();
  });
});

describe('Wanderer Akordu — yeni cue\'lar (FAZ B) regresyon', () => {
  it('10 yeni cue adı hata vermeden çalışır', async () => {
    const { fx } = await freshModule();
    const vibSpy = vi.spyOn(window.navigator, 'vibrate').mockImplementation(() => true);
    const names = ['breath', 'esikGold', 'esikLapis', 'cardBirth', 'nisan',
      'streak', 'sendTick', 'replyBreath', 'flip', 'recall'];
    for (const n of names) expect(() => fx.fxCue(n)).not.toThrow();
    vibSpy.mockRestore();
  });

  it('breath ve replyBreath haptiksiz — yalnız ses', async () => {
    const { fx } = await freshModule();
    const vibSpy = vi.spyOn(window.navigator, 'vibrate');
    fx.fxCue('breath');
    fx.fxCue('replyBreath');
    expect(vibSpy).not.toHaveBeenCalled();
  });

  it('nisan → success haptik', async () => {
    const { fx } = await freshModule();
    const vibSpy = vi.spyOn(window.navigator, 'vibrate');
    fx.fxCue('nisan');
    expect(vibSpy).toHaveBeenCalledWith([10, 40, 20]);
  });
});

describe('cue cooldown — bıktırma sigortası', () => {
  it('sendTick cooldown içinde ikinci çağrıda sessiz kalır', async () => {
    const { fx } = await freshModule();
    const oscSpy = vi.spyOn(FakeAudioContext.prototype, 'createOscillator');
    oscSpy.mockClear();
    fx.fxCue('sendTick');
    expect(oscSpy).toHaveBeenCalledTimes(1);
    fx.fxCue('sendTick'); // 1500ms kapısı içinde tekrar
    expect(oscSpy).toHaveBeenCalledTimes(1); // artmadı
  });

  it('cooldown taşımayan cue (tap) art arda her seferinde çalar', async () => {
    const { fx } = await freshModule();
    const oscSpy = vi.spyOn(FakeAudioContext.prototype, 'createOscillator');
    oscSpy.mockClear();
    fx.fxCue('tap');
    fx.fxCue('tap');
    expect(oscSpy.mock.calls.length).toBeGreaterThan(1);
  });
});

describe('Haptik koreografi (FAZ C) — çok-vuruşlu diziler', () => {
  // jsdom matchMedia'yı desteklemez (bkz. tests/10y-w2-llm-shell.test.js) —
  // varsayılan reduced-motion=false stub'ı; tek reduced-motion testi kendi override'ını verir.
  beforeEach(() => {
    window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  });
  afterEach(() => { delete window.matchMedia; vi.useRealTimers(); });

  it('milestone1 tek "success" deseninde kalır (regresyon)', async () => {
    const { fx } = await freshModule();
    const vibSpy = vi.spyOn(window.navigator, 'vibrate');
    fx.fxCue('milestone1');
    expect(vibSpy).toHaveBeenCalledWith([10, 40, 20]);
  });

  it('milestone4 web\'de tek vibrate() çağrısına derlenmiş zamanlı desen üretir', async () => {
    const { fx } = await freshModule();
    const vibSpy = vi.spyOn(window.navigator, 'vibrate');
    fx.fxCue('milestone4');
    expect(vibSpy).toHaveBeenCalledTimes(1);
    expect(vibSpy).toHaveBeenCalledWith([25, 155, 45, 195, 45, 235, 20]);
  });

  it('holoGrand web\'de 4 adımlık deseni tek vibrate() çağrısına derler', async () => {
    const { fx } = await freshModule();
    const vibSpy = vi.spyOn(window.navigator, 'vibrate');
    fx.fxCue('holoGrand');
    expect(vibSpy).toHaveBeenCalledWith([8, 62, 8, 62, 8, 252, 20]);
  });

  it('reduced-motion açıkken milestone4 tek vuruşa iner (son adım, anında)', async () => {
    window.matchMedia = () => ({ matches: true });
    const { fx } = await freshModule();
    const vibSpy = vi.spyOn(window.navigator, 'vibrate');
    fx.fxCue('milestone4');
    expect(vibSpy).toHaveBeenCalledWith([20]); // yalnız success (700ms yerine anında)
  });

  it('native yolda milestone4 zamanlı Haptics.impact/notification dizisi üretir', async () => {
    const { fx } = await freshModule();
    window.Capacitor.isNativePlatform = () => true;
    const { Haptics } = await import('@capacitor/haptics');
    Haptics.impact.mockClear(); Haptics.notification.mockClear(); // mock modülü dosya boyunca paylaşılır
    vi.useFakeTimers();
    fx.fxCue('milestone4');
    await vi.advanceTimersByTimeAsync(750);
    expect(Haptics.impact).toHaveBeenCalledTimes(3);       // medium + heavy + heavy
    expect(Haptics.notification).toHaveBeenCalledTimes(1); // success
  });

  it('haptic kapalıyken _hapticSeq hiçbir şey tetiklemez', async () => {
    const { fx } = await freshModule();
    fx.fxToggleHaptic(false);
    const vibSpy = vi.spyOn(window.navigator, 'vibrate');
    fx.fxCue('holoGrand');
    expect(vibSpy).not.toHaveBeenCalled();
  });
});

describe('_moodFor — saf fonksiyon (FAZ D)', () => {
  it('sınıf yok → tam gündüz değerleri', async () => {
    const { fx } = await freshModule();
    expect(fx._moodFor({ contains: () => false })).toEqual({ g: 0.5, lpf: 18000 });
  });

  it('tw-evening → ara kısıklık', async () => {
    const { fx } = await freshModule();
    expect(fx._moodFor({ contains: (c) => c === 'tw-evening' })).toEqual({ g: 0.38, lpf: 8000 });
  });

  it('tw-night → en kısık değerler', async () => {
    const { fx } = await freshModule();
    expect(fx._moodFor({ contains: (c) => c === 'tw-night' })).toEqual({ g: 0.22, lpf: 3200 });
  });

  it('classList yoksa (guard) çökmez, gündüz döner', async () => {
    const { fx } = await freshModule();
    expect(fx._moodFor(null)).toEqual({ g: 0.5, lpf: 18000 });
  });
});

describe('Gece kısıklığı entegrasyonu — _ready() içinde uygulanır (FAZ D)', () => {
  afterEach(() => { document.documentElement.className = ''; });

  it('tw-night iken master gain + moodFilter lowpass kısılır', async () => {
    const { fx } = await freshModule();
    document.documentElement.classList.add('tw-night');
    const seqSpy = vi.spyOn(FakeAudioParam.prototype, 'setTargetAtTime');
    fx.fxCue('tap');
    const calls = seqSpy.mock.calls.map(c => c[0]);
    expect(calls).toContain(0.22);
    expect(calls).toContain(3200);
  });

  it('tw-evening iken ara değerler uygulanır', async () => {
    const { fx } = await freshModule();
    document.documentElement.classList.add('tw-evening');
    const seqSpy = vi.spyOn(FakeAudioParam.prototype, 'setTargetAtTime');
    fx.fxCue('tap');
    const calls = seqSpy.mock.calls.map(c => c[0]);
    expect(calls).toContain(0.38);
    expect(calls).toContain(8000);
  });

  it('sınıf yokken tam gündüz değerine döner (gece sonrası tıklamasız geçiş)', async () => {
    const { fx } = await freshModule();
    const seqSpy = vi.spyOn(FakeAudioParam.prototype, 'setTargetAtTime');
    fx.fxCue('tap');
    const calls = seqSpy.mock.calls.map(c => c[0]);
    expect(calls).toContain(0.5);
    expect(calls).toContain(18000);
  });

  it('nightDim:false prefs\'te iken saat fazından bağımsız her zaman gündüz değeri', async () => {
    const { S, fx } = await freshModule();
    const { SafeStorage } = await import('../js/parts/00a-infrastructure.js');
    S.currentUser = { id: 'nodim-uid' };
    SafeStorage.set('etw_fx_prefs_v1_nodim-uid', { sound: true, haptic: true, nightDim: false });
    fx.fxLoad();
    document.documentElement.classList.add('tw-night');
    const seqSpy = vi.spyOn(FakeAudioParam.prototype, 'setTargetAtTime');
    fx.fxCue('tap');
    const calls = seqSpy.mock.calls.map(c => c[0]);
    expect(calls).toContain(0.5);
    expect(calls).toContain(18000);
    expect(calls).not.toContain(0.22);
  });

  it('eski kayıt (nightDim alanı yok) ileri-uyumlu merge ile nightDim:true varsayar', async () => {
    const { S, fx } = await freshModule();
    const { SafeStorage } = await import('../js/parts/00a-infrastructure.js');
    S.currentUser = { id: 'old-uid' };
    SafeStorage.set('etw_fx_prefs_v1_old-uid', { sound: true, haptic: true }); // eski kayıt
    fx.fxLoad();
    document.documentElement.classList.add('tw-night');
    const seqSpy = vi.spyOn(FakeAudioParam.prototype, 'setTargetAtTime');
    fx.fxCue('tap');
    const calls = seqSpy.mock.calls.map(c => c[0]);
    expect(calls).toContain(0.22); // nightDim varsayılan true → gece yine kısar
  });
});

describe('_ready — kapılar (sessiz düşüş)', () => {
  it('sound kapalıyken hiçbir osilatör oluşturulmaz', async () => {
    const { fx } = await freshModule();
    fx.fxToggleSound(false);
    const oscSpy = vi.spyOn(FakeAudioContext.prototype, 'createOscillator');
    oscSpy.mockClear();
    fx.fxCue('seal');
    expect(oscSpy).not.toHaveBeenCalled();
  });

  it('document.hidden iken hiçbir osilatör oluşturulmaz', async () => {
    const { fx } = await freshModule();
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    const oscSpy = vi.spyOn(FakeAudioContext.prototype, 'createOscillator');
    oscSpy.mockClear();
    fx.fxCue('seal');
    expect(oscSpy).not.toHaveBeenCalled();
  });
});

describe('Fener Ambiyansı (FAZ E) — opt-in sürekli oda tonu', () => {
  let fx;
  beforeEach(async () => { ({ fx } = await freshModule()); });
  afterEach(() => {
    // Modül-üstü visibilitychange listener'ı document'ta kalıcı (vi.resetModules
    // yalnız modül grafiğini sıfırlar, DOM event listener'ları DEĞİL) — sonraki
    // testlere sızıp hayalet oscillator yaratmasın diye ambient'ı burada kapatıyoruz.
    fx.fxToggleAmbient(false);
    document.documentElement.className = '';
    delete window.matchMedia;
    vi.useRealTimers();
  });

  it('varsayılan kapalı — sıradan bir cue ambiyans başlatmaz', async () => {
    const oscSpy = vi.spyOn(FakeAudioContext.prototype, 'createOscillator');
    oscSpy.mockClear();
    fx.fxCue('tap'); // tap kendi 1 osilatörünü kullanır
    expect(oscSpy).toHaveBeenCalledTimes(1);
  });

  it('fxToggleAmbient(true) oda tonu düğümlerini kurar (2 sine + LFO + gürültü)', async () => {
    const oscSpy = vi.spyOn(FakeAudioContext.prototype, 'createOscillator');
    const bufSpy = vi.spyOn(FakeAudioContext.prototype, 'createBufferSource');
    oscSpy.mockClear(); bufSpy.mockClear();
    fx.fxToggleAmbient(true);
    expect(oscSpy).toHaveBeenCalledTimes(3); // o1 + o2 + lfo (parti yok, reduced değil)
    expect(bufSpy).toHaveBeenCalledTimes(1); // gürültü katmanı
  });

  // Ocak (Fener Salonu) ambiyansın durumunu buradan okur: iki yüzey
  // (Ayarlar toggle'ı + salondaki alev) tek gerçeği paylaşmalı.
  it('fxAmbientAcik durumu doğru bildirir — ocağın okuduğu gerçek', async () => {
    expect(fx.fxAmbientAcik()).toBe(false);
    fx.fxToggleAmbient(true);
    expect(fx.fxAmbientAcik()).toBe(true);
    fx.fxToggleAmbient(false);
    expect(fx.fxAmbientAcik()).toBe(false);
  });

  it('ikinci fxToggleAmbient(true) çağrısı yeni düğüm kurmaz (idempotent)', async () => {
    fx.fxToggleAmbient(true);
    const oscSpy = vi.spyOn(FakeAudioContext.prototype, 'createOscillator');
    oscSpy.mockClear();
    fx.fxToggleAmbient(true);
    expect(oscSpy).not.toHaveBeenCalled();
  });

  it('fxToggleAmbient(false) düğümleri gecikmeli/yumuşak durdurur', async () => {
    fx.fxToggleAmbient(true);
    const stopSpy = vi.spyOn(FakeOscillator.prototype, 'stop');
    vi.useFakeTimers();
    fx.fxToggleAmbient(false);
    expect(stopSpy).not.toHaveBeenCalled(); // henüz — yumuşak kapanış sürüyor
    await vi.advanceTimersByTimeAsync(1000);
    expect(stopSpy).toHaveBeenCalled();
  });

  it('sound kapalıyken ambiyans başlamaz', async () => {
    fx.fxToggleSound(false);
    const oscSpy = vi.spyOn(FakeAudioContext.prototype, 'createOscillator');
    oscSpy.mockClear();
    fx.fxToggleAmbient(true);
    expect(oscSpy).not.toHaveBeenCalled();
  });

  it('ana ses (fxToggleSound) kapatılınca çalan ambiyans da durur', async () => {
    fx.fxToggleAmbient(true);
    const stopSpy = vi.spyOn(FakeOscillator.prototype, 'stop');
    vi.useFakeTimers();
    fx.fxToggleSound(false);
    await vi.advanceTimersByTimeAsync(1000);
    expect(stopSpy).toHaveBeenCalled();
  });

  it('document.hidden iken ambiyans başlamaz', async () => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    const oscSpy = vi.spyOn(FakeAudioContext.prototype, 'createOscillator');
    oscSpy.mockClear();
    fx.fxToggleAmbient(true);
    expect(oscSpy).not.toHaveBeenCalled();
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  it('reduced-motion açıkken LFO nefesi kurulmaz (yalnız 2 osilatör)', async () => {
    window.matchMedia = () => ({ matches: true });
    const oscSpy = vi.spyOn(FakeAudioContext.prototype, 'createOscillator');
    oscSpy.mockClear();
    fx.fxToggleAmbient(true);
    expect(oscSpy).toHaveBeenCalledTimes(2); // yalnız o1+o2, lfo yok
  });

  it('tw-morning sınıfında sabah partisi ekler (4. osilatör)', async () => {
    document.documentElement.classList.add('tw-morning');
    const oscSpy = vi.spyOn(FakeAudioContext.prototype, 'createOscillator');
    oscSpy.mockClear();
    fx.fxToggleAmbient(true);
    expect(oscSpy).toHaveBeenCalledTimes(4); // o1+o2+lfo+party
  });

  it('fxToggleAmbient prefs\'i SafeStorage\'a kalıcılaştırır', async () => {
    const { SafeStorage } = await import('../js/parts/00a-infrastructure.js');
    fx.fxToggleAmbient(true);
    expect(SafeStorage.get('etw_fx_prefs_v1_anon').ambient).toBe(true);
  });
});

describe('Ayarlar köprüsü', () => {
  it('fxToggleSound(true) canlı önizleme olarak gift çalar', async () => {
    const { fx } = await freshModule();
    const oscSpy = vi.spyOn(FakeAudioContext.prototype, 'createOscillator');
    oscSpy.mockClear();
    fx.fxToggleSound(true);
    expect(oscSpy).toHaveBeenCalled();
  });

  it('fxSyncSettingsUI DOM toggle checked durumunu prefs ile eşler (ambient dahil)', async () => {
    document.body.innerHTML = '<input type="checkbox" id="fx-sound-toggle"><input type="checkbox" id="fx-haptic-toggle"><input type="checkbox" id="fx-ambient-toggle">';
    const { fx } = await freshModule();
    fx.fxToggleSound(false);
    fx.fxToggleHaptic(false);
    fx.fxToggleAmbient(true);
    fx.fxSyncSettingsUI();
    expect(document.getElementById('fx-sound-toggle').checked).toBe(false);
    expect(document.getElementById('fx-haptic-toggle').checked).toBe(false);
    expect(document.getElementById('fx-ambient-toggle').checked).toBe(true);
    fx.fxToggleAmbient(false); // stale visibilitychange listener sızmasın
    document.body.innerHTML = '';
  });
});

describe('window expose — kontrat regresyonu', () => {
  it('window.fx* yedi fonksiyon tanımlı', async () => {
    await freshModule();
    for (const name of ['fxInit', 'fxCue', 'fxHaptic', 'fxToggleSound', 'fxToggleHaptic', 'fxToggleAmbient', 'fxSyncSettingsUI']) {
      expect(typeof window[name]).toBe('function');
    }
  });
});

describe('Kontrat regresyonu (FAZ F) — sözleşme sabitleri', () => {
  it('storage anahtar öneki etw_fx_prefs_v1_ değişmedi', async () => {
    const { fx } = await freshModule();
    const { SafeStorage } = await import('../js/parts/00a-infrastructure.js');
    fx.fxToggleSound(false);
    expect(SafeStorage.get('etw_fx_prefs_v1_anon')).not.toBeNull();
  });

  it('eski {sound,haptic} kaydı (nightDim/ambient alanları yok) sorunsuz hidrate olur', async () => {
    const { S, fx } = await freshModule();
    const { SafeStorage } = await import('../js/parts/00a-infrastructure.js');
    S.currentUser = { id: 'legacy-uid' };
    SafeStorage.set('etw_fx_prefs_v1_legacy-uid', { sound: true, haptic: false }); // FAZ A-öncesi kayıt biçimi
    expect(() => fx.fxLoad()).not.toThrow();
    const vibSpy = vi.spyOn(window.navigator, 'vibrate');
    fx.fxHaptic('heavy'); // haptic:false korunmuş olmalı
    expect(vibSpy).not.toHaveBeenCalled();
  });
});


/* ═══════════════════════════════════════════════════════════════════════
   SES KADEMESİ (FAZ 16) — "kısık" bir sayı değil bir doz

   Kademe zincirin EN SONUNDAKİ kendi düğümündedir ve bu bir tercih değil bir
   ZORUNLULUKTU; iki sebep de burada sınanır:
     1. `_master.gain` serbest değil — `_ready()` her cue'da gece/akşam
        mood'unu oraya yazar. Kademe oraya konsaydı ilk cue'da SESSİZCE
        silinirdi (§6.2: kullanıcı ayarı değiştirir, hiçbir şey olmaz).
     2. Fener Ambiyansı `_master`'ı atlar (K7) — `_master`'da kısmak
        ambiyansı hiç kısmazdı.
   Dozun kendisi uydurulmadı: gece kısıklığının kendi oranı (0.22/0.5 ≈ 0.45)
   ödünç alındı — uygulamanın "sessiz ama duyulur" dediği ölçü zaten oydu.
═══════════════════════════════════════════════════════════════════════ */
describe('ses kademesi — doz, zincirin sonunda tek düğümde', () => {
  it('varsayılan "tam" ve bilinmeyen değer "tam"a düşer', async () => {
    const { fx } = await freshModule();
    expect(fx.fxGetSesKademe()).toBe('tam');
    expect(fx.fxSetSesKademe('bilinmeyen')).toBe('tam');
    expect(fx.fxSetSesKademe('kisik')).toBe('kisik');
  });

  it('seçim KALICIDIR — fxSave zincirine girer', async () => {
    const { fx } = await freshModule();
    const { SafeStorage } = await import('../js/parts/00a-infrastructure.js');
    fx.fxSetSesKademe('kisik');
    expect(SafeStorage.get('etw_fx_prefs_v1_anon').sesKademe).toBe('kisik');
  });

  it('kademe satırı ses KAPALIYKEN gizlenir — kapalı sesin şiddeti sorulmaz', async () => {
    const { fx } = await freshModule();
    document.body.innerHTML = `
      <input type="checkbox" id="fx-sound-toggle">
      <div id="fx-kademe-row">
        <button class="fx-kademe-btn" data-kademe="tam"></button>
        <button class="fx-kademe-btn" data-kademe="kisik"></button>
      </div>`;
    fx.fxToggleSound(false);
    expect(document.getElementById('fx-kademe-row').hidden).toBe(true);
    fx.fxToggleSound(true);
    expect(document.getElementById('fx-kademe-row').hidden).toBe(false);
  });

  it('seçili düğme hem sınıfı hem aria-checked\'i taşır (tek gerçek)', async () => {
    const { fx } = await freshModule();
    document.body.innerHTML = `
      <input type="checkbox" id="fx-sound-toggle" checked>
      <div id="fx-kademe-row">
        <button class="fx-kademe-btn" data-kademe="tam" aria-checked="true"></button>
        <button class="fx-kademe-btn" data-kademe="kisik" aria-checked="false"></button>
      </div>`;
    fx.fxKademeSec('kisik');
    const [tam, kisik] = document.querySelectorAll('.fx-kademe-btn');
    expect(kisik.classList.contains('active')).toBe(true);
    expect(kisik.getAttribute('aria-checked')).toBe('true');
    expect(tam.classList.contains('active')).toBe(false);
    expect(tam.getAttribute('aria-checked')).toBe('false');
  });

  /* Bu kapı bir REGRESYON kilidi: kademe `_master`'a taşınırsa sessizce
     kırılırdı ve hiçbir test görmezdi. Kaynak taraması meşru çünkü iddia
     YAPISALDIR (düğümün zincirdeki yeri), davranışsal değil — jsdom'da
     WebAudio yok, gerçek gain okunamaz. */
  it('kademe düğümü zincirin SONUNDA — mood yazımıyla aynı düğümü paylaşmaz', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'js/parts/13e-his-motoru.js'), 'utf8');
    expect(src).toMatch(/_moodFilter\.connect\(_kademeGain\)/);
    expect(src).toMatch(/_kademeGain\.connect\(_ctx\.destination\)/);
    // mood HÂLÂ _master'a yazar; kademe ORAYA yazmaz.
    expect(src).toMatch(/_master\.gain\.setTargetAtTime\(mood\.g/);
    expect(src, 'kademe _master.gain\'e yazıyor — mood ilk cue\'da onu siler')
      .not.toMatch(/_master\.gain[^\n]*_kademeCarpani/);
  });
});
