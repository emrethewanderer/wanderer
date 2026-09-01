/**
 * Smoke tests for js/parts/06-summary-chat.js
 *
 * Covers exports + safeMarkdown/sanitizeMarkdown — critical security fns
 * that render LLM output to the DOM.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { S } from '../js/state.js';
import { AI_MODES, DG_TEMPS, DG_TOKEN, DG_RENDER_MS, TOKEN_LIMITS } from '../js/config.js';
import {
  safeMarkdown,
  sanitizeMarkdown,
  isSessionSummarized,
  isSummaryEligible,
  SUMMARY_MIN_TOTAL_CHARS,
  showModeInfo,
  sendMessage,
  startStreamingMsg,
  _akisMaskesi,
  _dgSeffaflikVeri,
  dgSeffaflikAc,
} from '../js/parts/06-summary-chat.js';
import { stripModeTag, extractDgReading } from '../js/parts/00-config-tracking.js';
import { dgBeyanVar } from '../js/parts/13D-duygu-motoru.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';

// ─── sendMessage() — fx cue tetikleri (FAZ B, 13e köprüsü) ────────────────────
// LLM zinciri (callLLM vb.) burada mock'lanmaz — yalnız sendTick'e kadar olan
// SENKRON kısmı doğrulanır (09h kalıbı: window.fxCue = vi.fn()).
describe('sendMessage() — sendTick köprüsü', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <textarea id="chat-input"></textarea>
      <button id="send-btn"></button>
      <div class="input-row"></div>`;
    window.fxCue = vi.fn();
    S._llmStreaming = false;
  });

  afterEach(() => {
    delete window.fxCue;
    document.body.innerHTML = '';
  });

  it('boş input → erken return, fxCue çağrılmaz', async () => {
    document.getElementById('chat-input').value = '   ';
    await sendMessage();
    expect(window.fxCue).not.toHaveBeenCalled();
  });

  it('gönder butonu disabled iken fxCue çağrılmaz', async () => {
    document.getElementById('chat-input').value = 'Merhaba';
    document.getElementById('send-btn').disabled = true;
    await sendMessage();
    expect(window.fxCue).not.toHaveBeenCalled();
  });

  it('geçerli gönderim → sendTick tetiklenir', () => {
    document.getElementById('chat-input').value = 'Merhaba Emre';
    sendMessage().catch(() => {}); // LLM zinciri mock'suz — yalnız senkron kısmı doğrula
    expect(window.fxCue).toHaveBeenCalledWith('sendTick');
  });
});

// ─── startStreamingMsg() — Duygu Motoru ritim/beden kanalı (13D, FAZ 7) ────
// _runLLMTurn zaten S._dgSonKarsilama'dan "eksen değişti mi" kararını verip
// hazır bir cue adı/renderMs geçiyor — burada yalnız startStreamingMsg'in
// bu iki değeri doğru KULLANDIĞI doğrulanır (karar mantığı 13D'de, burada
// değil — bkz. plan "Dokunma: 13D'nin karar mantığına").
describe('startStreamingMsg(modeClass, dgRitim) — ritim/beden kanalı (FAZ 7)', () => {
  beforeEach(() => {
    document.body.innerHTML = `<div id="messages-area"></div>`;
    window.fxCue = vi.fn();
  });

  afterEach(() => {
    delete window.fxCue;
    document.body.innerHTML = '';
  });

  it('dgRitim verilmezse (eski çağıranlar) patlamaz, yalnız replyBreath çalar', () => {
    let sm;
    expect(() => { sm = startStreamingMsg(''); sm.appendChunk('Merhaba'); }).not.toThrow();
    expect(window.fxCue).toHaveBeenCalledWith('replyBreath');
    expect(window.fxCue).toHaveBeenCalledTimes(1);
  });

  it('dgRitim.cue verilmişse ilk chunk\'ta replyBreath\'in yanında o da çalar', () => {
    const sm = startStreamingMsg('', { cue: 'breath', renderMs: 140 });
    sm.appendChunk('Merhaba');
    expect(window.fxCue).toHaveBeenCalledWith('replyBreath');
    expect(window.fxCue).toHaveBeenCalledWith('breath');
  });

  it('dgRitim.cue null ise (eksen değişmedi, doz) duygu cue\'su çağrılmaz', () => {
    const sm = startStreamingMsg('', { cue: null, renderMs: 60 });
    sm.appendChunk('Merhaba');
    expect(window.fxCue).toHaveBeenCalledTimes(1); // yalnız replyBreath
  });

  it('dgRitim.renderMs ikinci chunk\'ın render edilmesini o süreye kadar erteler', () => {
    vi.useFakeTimers();
    const sm = startStreamingMsg('', { renderMs: 140 });
    sm.appendChunk('a');   // ilk chunk daima anında render olur
    expect(document.querySelector('.stream-text').textContent).toBe('a');
    sm.appendChunk('b');   // hemen ardından — 140ms dolmadan render ERTELENİR
    vi.advanceTimersByTime(100);
    expect(document.querySelector('.stream-text').textContent).toBe('a'); // 'b' henüz yok
    vi.advanceTimersByTime(40); // toplam 140ms
    expect(document.querySelector('.stream-text').textContent).toBe('ab');
    vi.useRealTimers();
  });
});

// ─── DG_TEMPS / DG_TOKEN / DG_RENDER_MS — K9 pazarlıksız yapısal dışlama ──
describe('DG_TEMPS / DG_TOKEN / DG_RENDER_MS (config.js) — K9 kriz üstünlüğü', () => {
  it('tutma (kriz) hiçbir tabloda YOK — sıcaklık/uzunluk/hız karşılamadan asla etkilenmez', () => {
    expect(DG_TEMPS.tutma).toBeUndefined();
    expect(DG_TOKEN.tutma).toBeUndefined();
    expect(DG_RENDER_MS.tutma).toBeUndefined();
  });

  it('DG_TEMPS altı ekseni de kapsar, MODE_TEMPS aralığına (0.60-0.90) sadıktır', () => {
    const eksenler = ['taniklik', 'yatistirma', 'sahiplenme', 'berraklik', 'diriltme', 'kutlama'];
    eksenler.forEach(e => {
      expect(DG_TEMPS[e]).toBeGreaterThanOrEqual(0.60);
      expect(DG_TEMPS[e]).toBeLessThanOrEqual(0.90);
    });
  });

  /* FAZ 8 KALİBRESİ — hiçbir karşılama tavanı uygulamanın kendi en dar
     bütçesinin (casual) ALTINA inemez. Token tavanı bir üslup kolu değil
     kaçak önleyicidir: kesişi serttir ve yanlışının bedeli ekranda görünür
     — cümle ortasında biten bir yanıt. Kısalığı kartuş taşır (FAZ 6).
     En sık eşleşme deep_emotion bağlamı + yatıştırma eksenidir; oradaki bir
     kırpma tam da en hassas anda yarım cümle bırakırdı. */
  it('hiçbir eksen tavanı TOKEN_LIMITS.casual altına inmez (yarım cümle riski)', () => {
    for (const [eksen, tavan] of Object.entries(DG_TOKEN)) {
      expect(`${eksen}=${tavan}`).toBe(`${eksen}=${Math.max(tavan, TOKEN_LIMITS.casual)}`);
    }
  });

  it('sıralama korunuyor — yatıştırma en dar, kutlama en geniş', () => {
    expect(DG_TOKEN.yatistirma).toBeLessThan(DG_TOKEN.berraklik);
    expect(DG_TOKEN.berraklik).toBeLessThan(DG_TOKEN.kutlama);
  });

  it('tavan hâlâ gerçekten kısıyor — standard ve deep_emotion bütçesinin altında', () => {
    expect(DG_TOKEN.yatistirma).toBeLessThan(TOKEN_LIMITS.standard);
    expect(DG_TOKEN.yatistirma).toBeLessThan(TOKEN_LIMITS.deep_emotion);
  });

  it('DG_TOKEN kutlama en geniş bağlam bütçesine (depth) eşit — pratikte hiç kırpmaz', () => {
    expect(DG_TOKEN.kutlama).toBe(TOKEN_LIMITS.depth);
  });

  it('donmuş nesneler — MODE_TEMPS/TOKEN_LIMITS emsaliyle aynı sözleşme', () => {
    expect(Object.isFrozen(DG_TEMPS)).toBe(true);
    expect(Object.isFrozen(DG_TOKEN)).toBe(true);
    expect(Object.isFrozen(DG_RENDER_MS)).toBe(true);
  });
});

describe('safeMarkdown / sanitizeMarkdown', () => {
  it('exports both with same reference', () => {
    expect(sanitizeMarkdown).toBe(safeMarkdown);
  });

  it('returns a string for plain text', () => {
    const out = safeMarkdown('hello world');
    expect(typeof out).toBe('string');
  });

  it('returns a string for markdown input', () => {
    const out = safeMarkdown('**bold** text');
    expect(typeof out).toBe('string');
  });

  it('does not throw on empty input', () => {
    expect(() => safeMarkdown('')).not.toThrow();
    expect(() => safeMarkdown(null)).not.toThrow();
    expect(() => safeMarkdown(undefined)).not.toThrow();
  });
});

describe('SUMMARY_MIN_TOTAL_CHARS', () => {
  it('is a positive number', () => {
    expect(typeof SUMMARY_MIN_TOTAL_CHARS).toBe('number');
    expect(SUMMARY_MIN_TOTAL_CHARS).toBeGreaterThan(0);
  });
});

describe('isSessionSummarized(id)', () => {
  beforeEach(() => {
    S.summarizedSessionIds = new Set();
  });

  it('returns false for unknown id', () => {
    expect(isSessionSummarized('nope')).toBe(false);
  });

  it('returns true after id is added to the set', () => {
    S.summarizedSessionIds.add('sess-1');
    expect(isSessionSummarized('sess-1')).toBe(true);
  });

  it('returns false when set is empty/missing', () => {
    S.summarizedSessionIds = new Set();
    expect(isSessionSummarized('whatever')).toBe(false);
  });
});

describe('isSummaryEligible()', () => {
  beforeEach(() => {
    S.chatHistory = [];
    S.summaryInProgress = false;
    S.currentSessId = 'test-sess';
    S.summarizedSessionIds = new Set();
  });

  it('returns false when chatHistory is too short', () => {
    S.chatHistory = [{ role: 'user', content: 'hi' }];
    expect(isSummaryEligible()).toBe(false);
  });

  it('returns false when summary is already in progress', () => {
    S.summaryInProgress = true;
    expect(isSummaryEligible()).toBe(false);
  });

  it('does not throw on missing session', () => {
    S.currentSessId = null;
    expect(() => isSummaryEligible()).not.toThrow();
  });
});

// FAZ 5 (.claude/plans/mod-sistemi.md) — showToast yerine tören: mini sheet
describe('showModeInfo() — Mod Pusulası', () => {
  beforeEach(() => {
    document.getElementById('mpc-portal')?.remove();
    S.currentAIMode = AI_MODES.SOFT;
    S._modeHistory = [];
  });

  it('rozete tıklayınca #mpc-portal sheet\'ini açar', () => {
    showModeInfo();
    expect(document.getElementById('mpc-portal')).not.toBeNull();
  });

  it('zaten açıkken tekrar çağrılırsa ikinci portal açmaz', () => {
    showModeInfo();
    showModeInfo();
    expect(document.querySelectorAll('#mpc-portal').length).toBe(1);
  });

  it('6 mod noktası render eder, yalnız aktif olan .mpc-dot--active taşır', () => {
    S.currentAIMode = AI_MODES.DEPTH;
    showModeInfo();
    expect(document.querySelectorAll('.mpc-dot').length).toBe(6);
    expect(document.querySelectorAll('.mpc-dot--active').length).toBe(1);
  });

  it('etiket aktif modun büyük-harfli UI adını gösterir (LLM ipucu değil)', () => {
    S.currentAIMode = AI_MODES.PATTERN;
    showModeInfo();
    expect(document.querySelector('.mpc-label')?.textContent).toBe('Örüntü');
  });

  it('modeinfo metninden tekrarlayan etiket önekini ayıklar', () => {
    S.currentAIMode = AI_MODES.SOFT;
    showModeInfo();
    const desc = document.querySelector('.mpc-desc')?.textContent || '';
    expect(desc).not.toMatch(/^Fark Et/);
  });

  it('_modeHistory doluysa yolculuk çizgisini render eder', () => {
    S._modeHistory = [AI_MODES.SOFT, AI_MODES.DIRECT, AI_MODES.DEPTH];
    showModeInfo();
    expect(document.querySelectorAll('.mpc-jdot').length).toBe(3);
    expect(document.querySelectorAll('.mpc-jdot--now').length).toBe(1);
  });

  it('_modeHistory boşsa yolculuk bölümünü hiç render etmez', () => {
    S._modeHistory = [];
    showModeInfo();
    expect(document.querySelector('.mpc-journey')).toBeNull();
  });

  it('kapat butonuna tıklayınca sheet çıkış animasyonuna girer ve kalkar', () => {
    vi.useFakeTimers();
    showModeInfo();
    document.querySelector('.mpc-close')?.dispatchEvent(new Event('click', { bubbles: true }));
    expect(document.querySelector('.mpc-sheet')?.classList.contains('mpc-sheet--out')).toBe(true);
    vi.advanceTimersByTime(350);
    expect(document.getElementById('mpc-portal')).toBeNull();
    vi.useRealTimers();
  });

  it('event verilirse stopPropagation çağrılır ve hata fırlatmaz', () => {
    const fakeEvent = { stopPropagation: vi.fn() };
    expect(() => showModeInfo(fakeEvent)).not.toThrow();
    expect(fakeEvent.stopPropagation).toHaveBeenCalledTimes(1);
  });
});

/* İKİZ DESEN KAPISI (FAZ 9 denetimi, 2026-08-29) — meta satırı İKİ ayrı
   regex tanıyor: `MOD_TAG_RE` (00, sıyırma + okuma) ve `_AKIS_MOD_TAM`
   (06, akış maskesi). İkisi bilerek farklıdır (maske uçuşan yarım metni de
   yutmalı), ama AYNI omurgayı taşımak zorundadır. Bu repoda ikizler ayrışır
   — `13o gcFire` emsali, [[llm-bicimleri-geri-sizar]]. Kapı: aynı korpusta
   ikisi de etiketi TAMAMEN yutmalı. Biri güncellenip öteki unutulursa
   burası kırılır ve hangi tarafın geride kaldığını söyler. */
describe('meta satırı — ikiz desen kapısı (stripModeTag ↔ _akisMaskesi)', () => {
  const KORPUS = [
    '[MOD:soft]',
    '[MOD:soft|DG:yatistirma]',
    '[MOD:soft|DG:yatistirma#S2]',
    '[MOD:soft|DUYGU:yatistirma#S2]',
    '[MOD:direct | DG : kutlama # s10]',
    '[MOD:depth|DG:taniklik#1]',
    /* Model MOD DEĞERİNİ de Türkçeleştirir (denetim 2026-08-29,
       [[llm-bicimleri-geri-sizar]]): eskiden desen hiç tutmuyordu ve
       kullanıcı ham `[MOD:yumuşak]` metnini EKRANDA görüyordu. */
    '[MOD:yumuşak]',
    '[MOD:derinleş|DG:taniklik#S3]',
  ];

  it('her iki desen de korpusun tamamını yutuyor', () => {
    for (const tag of KORPUS) {
      const govde = 'Buradayım. Nefes al.';
      expect(`strip/${tag}`).toBe(`strip/${tag}`);
      expect(stripModeTag(tag + ' ' + govde)).toBe(govde);
      expect(_akisMaskesi(tag + ' ' + govde)).toBe(govde);
    }
  });

  it('etiket YOKKEN metin ikisinde de bozulmadan geçiyor', () => {
    const duz = 'Kaldığın yer orası. Buradayım.';
    expect(stripModeTag(duz)).toBe(duz);
    expect(_akisMaskesi(duz)).toBe(duz);
  });

  it('metnin ORTASINDAKİ "[MOD" yenmiyor — maske yalnız baştan çalışır', () => {
    const orta = 'Şunu dedin: [MOD] gibi bir şey yazmışsın.';
    expect(_akisMaskesi(orta)).toBe(orta);
  });

  it('tanınmayan eksen sessizce yok sayılır — uydurma eşleşmeye düşülmez', () => {
    expect(extractDgReading('[MOD:soft|DG:yatıştırma#S2]')).toBeNull(); // diyakritikli
    expect(extractDgReading('[MOD:soft|DG:uydurma]')).toBeNull();
    expect(extractDgReading('[MOD:soft]')).toBeNull();
  });

  it('mod değeri Türkçeleşse bile DG okuması yine çıkarılıyor', () => {
    const r = extractDgReading('[MOD:derinleş|DG:taniklik#S3]');
    expect(r).not.toBeNull();
    expect(r.eksen).toBe('taniklik');
  });

  it('tanınan eksen okunuyor ve modelin güven sayısı sözleşmede YOK (K4)', () => {
    const r = extractDgReading('[MOD:soft|DG:yatistirma#S2]');
    expect(r.eksen).toBe('yatistirma');
    expect(r.ref).toBeTruthy();
    expect('guven' in r).toBe(false);
    expect('confidence' in r).toBe(false);
  });
});

/* Şeffaflık paneli — "Neden böyle konuştun?" (13D, FAZ 11). K7 kapısı:
   söylenecek beyan/ölçüm/yorum yoksa panel VERİSİ HİÇ ÜRETİLMEZ —
   [[tanima-motoru]] FAZ 7 dersi ("kanıt yoksa giriş düğmesi hiç çizilmez"). */
describe('_dgSeffaflikVeri — K7 kapısı', () => {
  it('karsilama null → null (giriş çizilmez)', () => {
    expect(_dgSeffaflikVeri(null, null)).toBeNull();
  });

  it('kanıt YOK + krizOkundu true + yorum YOK → null (söylenecek hiçbir şey yok)', () => {
    const k = { eksen: 'taniklik', gerekce: 'x', kanit: null, ikincil: null, krizOkundu: true };
    expect(_dgSeffaflikVeri(k, null)).toBeNull();
  });

  it('kanıt VARSA veri üretilir, hedefEksen = kanıtın eksenidir (taniklik değilse)', () => {
    const k = { eksen: 'diriltme', gerekce: 'x', kanit: 'boşluk hissediyorum', ikincil: null, krizOkundu: true };
    const v = _dgSeffaflikVeri(k, null);
    expect(v).not.toBeNull();
    expect(v.hedefEksen).toBe('diriltme');
  });

  it('eksen taniklik ama bir takasla oraya düştüyse (ikincil dolu) hedef = ikincil', () => {
    const k = { eksen: 'taniklik', gerekce: 'x', kanit: 'çok kırgınım', ikincil: 'yatistirma', krizOkundu: true };
    const v = _dgSeffaflikVeri(k, null);
    expect(v.hedefEksen).toBe('yatistirma');
  });

  /* K9 İKİNCİ BEKÇİ (dikiş turu, 2026-08-30). Kriz turunda panel normalde
     hiç doğmaz (kanıt null + krizOkundu true), AMA modelin kendi okuması
     (K5 `yorum`) varsa `varMi` true olur ve düzeltme jesti çizilirdi:
     kullanıcıya güvenlik yanıtını kapatma sözü veren bir düğme. `tutma`
     hiçbir hâlde hedef eksen olamaz. */
  it('KRİZ: yorum yüzünden panel doğsa bile hedefEksen tutma OLAMAZ (K9)', () => {
    const k = { eksen: 'tutma', gerekce: 'Kriz sinyali', kanit: null, ikincil: null, krizOkundu: true };
    const v = _dgSeffaflikVeri(k, { eksen: 'yatistirma' });
    expect(v).not.toBeNull();          // panel doğar (modelin okuması var)
    expect(v.hedefEksen).toBeNull();   // ama susturma jesti ÇİZİLMEZ
  });

  it('eksen taniklik ve ikincil de yoksa (ham karar zaten taniklik) hedef null — düzeltilecek bir şey yok', () => {
    const k = { eksen: 'taniklik', gerekce: 'x', kanit: 'sakinim', ikincil: null, krizOkundu: true };
    const v = _dgSeffaflikVeri(k, null);
    expect(v.hedefEksen).toBeNull();
  });

  it('kanıt yok ama krizOkundu===false → yine de üretilir (dürüstlük satırı, K10 kadran)', () => {
    const k = { eksen: 'taniklik', gerekce: 'x', kanit: null, ikincil: null, krizOkundu: false };
    expect(_dgSeffaflikVeri(k, null)).not.toBeNull();
  });

  it('kanıt yok ama modelin kendi okuması (YORUM) varsa üretilir', () => {
    const k = { eksen: 'taniklik', gerekce: 'x', kanit: null, ikincil: null, krizOkundu: true };
    expect(_dgSeffaflikVeri(k, { eksen: 'kutlama', kanit: null })).not.toBeNull();
  });
});

describe('dgSeffaflikAc — panel + "beni yanlış okudun" jesti', () => {
  const oncekiIklim = S._dgIklim;
  beforeEach(() => {
    document.body.innerHTML = `<div class="message emre"><div class="msg-body">
      <button id="giris-btn"></button>
    </div></div>`;
    S._dgIklim = { beyan: {}, taban: { n: 0, kova: [] }, defter: {}, lehce: {} };
  });
  afterEach(() => {
    document.getElementById('dg-neden-overlay')?.remove();
    document.body.innerHTML = '';
    S._dgIklim = oncekiIklim;
    // dgIklimKaydet 'sustur'/'geri' testlerinde anon anahtara yazar —
    // [[safestorage-testlerde-kvcache]]: _kvCache bellek-içi, temizlenmezse
    // sonraki testte/dosyada sızar.
    try { SafeStorage.remove('etw_dg_iklim_v1_anon'); } catch (_) {}
  });

  it('_dgPanel yoksa false döner, overlay AÇILMAZ', () => {
    const btn = document.getElementById('giris-btn');
    expect(dgSeffaflikAc(btn)).toBe(false);
    expect(document.getElementById('dg-neden-overlay')).toBeNull();
  });

  it('geçerli veriyle overlay açılır — kanıt kullanıcının kendi cümlesiyle görünür', () => {
    const msgEl = document.querySelector('.message.emre');
    msgEl._dgPanel = {
      karsilama: { eksen: 'diriltme', gerekce: 'x', kanit: 'boşluk hissediyorum', ikincil: null, krizOkundu: true },
      yorum: null,
      hedefEksen: 'diriltme',
    };
    const ok = dgSeffaflikAc(document.getElementById('giris-btn'));
    expect(ok).toBe(true);
    const overlay = document.getElementById('dg-neden-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.textContent).toContain('boşluk hissediyorum');
  });

  it('"Beni yanlış okudun" → S._dgIklim.beyan[hedefEksen]="sus", dgBeyanVar true olur', () => {
    const msgEl = document.querySelector('.message.emre');
    msgEl._dgPanel = {
      karsilama: { eksen: 'kutlama', gerekce: 'x', kanit: 'harikaydı', ikincil: null, krizOkundu: true },
      yorum: null,
      hedefEksen: 'kutlama',
    };
    dgSeffaflikAc(document.getElementById('giris-btn'));
    const susturBtn = document.querySelector('.dg-neden-btn[data-act="sustur"]');
    expect(susturBtn).not.toBeNull();
    susturBtn.click();
    expect(dgBeyanVar(S._dgIklim, 'kutlama')).toBe(true);
    expect(document.getElementById('dg-neden-overlay')).toBeNull(); // kapandı
  });

  it('GÜVENLİ DÜŞÜŞ — S._dgIklim henüz hidre olmamışsa (null) bile sustur SESSİZCE KAYBOLMAZ (canlı doğrulamada yakalanan kırık)', () => {
    S._dgIklim = null; // dgInit() henüz koşmamış gibi (yarış senaryosu)
    const msgEl = document.querySelector('.message.emre');
    msgEl._dgPanel = {
      karsilama: { eksen: 'kutlama', gerekce: 'x', kanit: 'harikaydı', ikincil: null, krizOkundu: true },
      yorum: null,
      hedefEksen: 'kutlama',
    };
    dgSeffaflikAc(document.getElementById('giris-btn'));
    document.querySelector('.dg-neden-btn[data-act="sustur"]').click();
    expect(S._dgIklim).not.toBeNull(); // dgIklimYukle() fallback'i devreye girdi
    expect(dgBeyanVar(S._dgIklim, 'kutlama')).toBe(true);
  });

  it('zaten susturulmuş eksende panel "Yine dene" gösterir, tıklayınca beyan silinir', () => {
    S._dgIklim.beyan.kutlama = 'sus';
    const msgEl = document.querySelector('.message.emre');
    msgEl._dgPanel = {
      karsilama: { eksen: 'taniklik', gerekce: 'x', kanit: 'harikaydı', ikincil: 'kutlama', krizOkundu: true },
      yorum: null,
      hedefEksen: 'kutlama',
    };
    dgSeffaflikAc(document.getElementById('giris-btn'));
    expect(document.querySelector('.dg-neden-btn[data-act="sustur"]')).toBeNull();
    const geriBtn = document.querySelector('.dg-neden-btn[data-act="geri"]');
    expect(geriBtn).not.toBeNull();
    geriBtn.click();
    expect(dgBeyanVar(S._dgIklim, 'kutlama')).toBe(false);
  });

  it('"Kapat" → overlay kalkar, İklim/beyan DOKUNULMAZ', () => {
    const msgEl = document.querySelector('.message.emre');
    msgEl._dgPanel = {
      karsilama: { eksen: 'diriltme', gerekce: 'x', kanit: 'iz', ikincil: null, krizOkundu: true },
      yorum: null,
      hedefEksen: 'diriltme',
    };
    dgSeffaflikAc(document.getElementById('giris-btn'));
    document.querySelector('.dg-neden-kapat').click();
    expect(document.getElementById('dg-neden-overlay')).toBeNull();
    expect(S._dgIklim.beyan).toEqual({});
  });

  it('krizOkundu===false → dürüstlük satırı görünür', () => {
    const msgEl = document.querySelector('.message.emre');
    msgEl._dgPanel = {
      karsilama: { eksen: 'taniklik', gerekce: 'x', kanit: null, ikincil: null, krizOkundu: false },
      yorum: null,
      hedefEksen: null,
    };
    dgSeffaflikAc(document.getElementById('giris-btn'));
    expect(document.querySelector('.dg-neden-satir--kriz')).not.toBeNull();
    // hedefEksen yok → düzeltme jesti hiç gösterilmez
    expect(document.querySelector('.dg-neden-btn')).toBeNull();
  });
});
