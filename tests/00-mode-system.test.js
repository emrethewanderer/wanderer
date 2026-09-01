/**
 * Tests for the mod sistemi (mode system) core in js/parts/00-config-tracking.js
 *
 * Covers the LLM-driven mode pipeline that used to have ZERO test coverage
 * (see .claude/plans/mod-sistemi.md — FAZ 2):
 * - updateAIMode()              — regex-hint priority matrix
 * - createModeAwareChunkHandler — streaming [MOD:xxx] tag parse + fallback (S3 fix)
 * - applyLLMMode()              — mode history push + 8-item cap + invalid-mode guard
 * - getBalancingModeHint()      — 80% stickiness threshold + effectiveness ranking
 * - getModeDistribution()       — mode share over recent history
 * - stripModeTag()              — tag removal from finalized text
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { S } from '../js/state.js';
import { AI_MODES } from '../js/config.js';

import {
  updateAIMode,
  createModeAwareChunkHandler,
  applyLLMMode,
  getBalancingModeHint,
  getModeDistribution,
  stripModeTag,
  stripModeWatermark,
  buildModeSelectionGuide,
  isBigModeTransition,
  extractDgReading,
} from '../js/parts/00-config-tracking.js';

function resetModeState() {
  S._currentLang = 'tr';
  S.chatHistory = [];
  S._modeHint = AI_MODES.SOFT;
  S._modeExplicitRequest = null;
  S._modeHistory = [];
  S.currentAIMode = AI_MODES.SOFT;
  S._lastFlashedMode = AI_MODES.SOFT;
  S.avoidanceCount = 0;
  S.consecutiveAvoidance = 0;
  // Sinyal kaynaklarını sıfırla — patternSignal'in gizli tetiklenmesini önler
  S._emotionalChain = [];
  S._personalityMap.defense_mechanisms = [];
  S._predictionModel.trigger_sequences = [];
  S._adaptiveCommunication.effective_approaches = [];
  S._adaptiveCommunication.ineffective_approaches = [];
}

function setUserMsgCount(n) {
  S.chatHistory = Array.from({ length: n }, (_, i) => ({ role: 'user', content: 'msg' + i }));
}

describe('updateAIMode() — öncelik matrisi', () => {
  beforeEach(resetModeState);

  it('explicit istek her şeyden önce gelir (kaçınma + kırılganlık dilinin önünde)', () => {
    setUserMsgCount(1);
    // "sert ol" → explicit direct; "bilmiyorum" → avoidance; "üzgünüm" → vulnerability
    updateAIMode('Bilmiyorum, üzgünüm ama sert ol bana lütfen.');
    expect(S._modeHint).toBe(AI_MODES.DIRECT);
    expect(S._modeExplicitRequest).toBe(AI_MODES.DIRECT);
  });

  it('örüntü sinyali (≥4 mesaj) derinlik sinyalinin önüne geçer', () => {
    setUserMsgCount(4);
    // "bu daha önce de oldu" → pattern_awareness (implicit, explicit_mode ile örtüşmez);
    // "standart" → depth sinyali. Aynı anda ikisi de true — sıra testi.
    updateAIMode('Standart bu değil, bu daha önce de oldu.');
    expect(S._modeHint).toBe(AI_MODES.PATTERN);
  });

  it('örüntü sinyali olsa da <4 mesajda tetiklenmez — derinlik devreye girer', () => {
    setUserMsgCount(2);
    updateAIMode('Standart bu değil, bu daha önce de oldu.');
    expect(S._modeHint).toBe(AI_MODES.DEPTH);
  });

  it('derinlik sinyali (≥2 mesaj) kutlama ve kırılganlığın önüne geçer', () => {
    setUserMsgCount(3);
    // "başardım" → progress; "üzgünüm" → vulnerability; "standart" → depth
    updateAIMode('Başardım ama üzgünüm, bu standart düşük.');
    expect(S._modeHint).toBe(AI_MODES.DEPTH);
  });

  it('derinlik sinyali <2 mesajda tetiklenmez — ilerleme (celebrate) devreye girer', () => {
    setUserMsgCount(1);
    updateAIMode('Başardım ama üzgünüm, bu standart düşük.');
    expect(S._modeHint).toBe(AI_MODES.CELEBRATE);
  });

  it('ilerleme sinyali kırılganlığın önüne geçer (kaçınma yoksa)', () => {
    setUserMsgCount(1);
    updateAIMode('Başardım, ama hâlâ üzgünüm.');
    expect(S._modeHint).toBe(AI_MODES.CELEBRATE);
  });

  it('kırılganlık kaçınmanın önüne geçer', () => {
    setUserMsgCount(1);
    updateAIMode('Bilmiyorum, çok korkuyorum.');
    expect(S._modeHint).toBe(AI_MODES.SOFT);
  });

  it('yalnız kaçınma sinyali varsa yüzleş moduna düşer', () => {
    setUserMsgCount(1);
    updateAIMode('Bilmiyorum, sonra bakarız, zamanım yok.');
    expect(S._modeHint).toBe(AI_MODES.DIRECT);
    expect(S.avoidanceCount).toBe(1);
  });

  it('hiçbir sinyal yokken ve mesaj sayısı düşükken fark et (soft) döner', () => {
    setUserMsgCount(0);
    updateAIMode('Bugün hava güzel.');
    expect(S._modeHint).toBe(AI_MODES.SOFT);
  });

  it('hiçbir sinyal yokken ve mesaj sayısı ≥3 ise tasarla (reflective) döner', () => {
    setUserMsgCount(3);
    updateAIMode('Bugün hava güzel.');
    expect(S._modeHint).toBe(AI_MODES.REFLECTIVE);
  });

  it('art arda 2+ kaçınma consecutiveAvoidance sayacını artırır', () => {
    setUserMsgCount(1);
    updateAIMode('Bilmiyorum.');
    updateAIMode('Sonra bakarız.');
    expect(S.consecutiveAvoidance).toBe(2);
  });

  it('kaçınma olmayan bir mesaj consecutiveAvoidance sayacını sıfırlar', () => {
    setUserMsgCount(1);
    updateAIMode('Bilmiyorum.');
    updateAIMode('Bugün hava güzel.');
    expect(S.consecutiveAvoidance).toBe(0);
  });
});

describe('applyLLMMode()', () => {
  beforeEach(resetModeState);

  it('geçerli bir mod S.currentAIMode ve _modeHistory günceller', () => {
    applyLLMMode(AI_MODES.DIRECT);
    expect(S.currentAIMode).toBe(AI_MODES.DIRECT);
    expect(S._modeHistory).toEqual([AI_MODES.DIRECT]);
  });

  it('geçersiz mod string\'i state\'i değiştirmez', () => {
    S.currentAIMode = AI_MODES.SOFT;
    applyLLMMode('bogus-mode');
    expect(S.currentAIMode).toBe(AI_MODES.SOFT);
    expect(S._modeHistory).toEqual([]);
  });

  it('null/undefined/boş string sessizce yok sayılır', () => {
    applyLLMMode(null);
    applyLLMMode(undefined);
    applyLLMMode('');
    expect(S._modeHistory).toEqual([]);
  });

  it('_modeHistory 8 öğeyle sınırlıdır (FIFO)', () => {
    const sequence = [
      AI_MODES.SOFT, AI_MODES.DIRECT, AI_MODES.REFLECTIVE, AI_MODES.CELEBRATE,
      AI_MODES.PATTERN, AI_MODES.DEPTH, AI_MODES.SOFT, AI_MODES.DIRECT,
      AI_MODES.REFLECTIVE, AI_MODES.CELEBRATE, // 10 push
    ];
    sequence.forEach(m => applyLLMMode(m));
    expect(S._modeHistory.length).toBe(8);
    // İlk iki push (soft, direct) atılmış olmalı — yalnız son 8 kalır
    expect(S._modeHistory).toEqual(sequence.slice(-8));
  });

  it('mod gerçekten değişmiyorsa updateModeBadge çağrısı hata fırlatmaz (DOM yok)', () => {
    expect(() => applyLLMMode(AI_MODES.PATTERN)).not.toThrow();
  });
});

describe('createModeAwareChunkHandler()', () => {
  beforeEach(resetModeState);

  function mockStreamMsg() {
    return { appendChunk: vi.fn() };
  }

  it('tag tek chunk\'ta baştan gelirse parse eder ve geri kalanı gönderir', () => {
    const streamMsg = mockStreamMsg();
    const handler = createModeAwareChunkHandler(streamMsg);
    handler.onChunk('[MOD:direct] Merhaba, nasılsın?');
    expect(handler.isParsed()).toBe(true);
    expect(handler.wasTagFound()).toBe(true); // FAZ 4: gerçek tag — tag_missing=false olmalı
    expect(S.currentAIMode).toBe(AI_MODES.DIRECT);
    expect(streamMsg.appendChunk).toHaveBeenCalledWith('Merhaba, nasılsın?');
    expect(streamMsg.appendChunk).toHaveBeenCalledTimes(1);
  });

  it('tag birden fazla chunk\'a bölünmüşse birikip doğru parse edilir', () => {
    const streamMsg = mockStreamMsg();
    const handler = createModeAwareChunkHandler(streamMsg);
    handler.onChunk('[MOD:pat');
    // Henüz eşleşme yok, tag tamamlanmadı — appendChunk çağrılmamalı
    expect(streamMsg.appendChunk).not.toHaveBeenCalled();
    expect(handler.isParsed()).toBe(false);
    expect(handler.wasTagFound()).toBe(false);
    handler.onChunk('tern] Merhaba');
    expect(handler.isParsed()).toBe(true);
    expect(handler.wasTagFound()).toBe(true);
    expect(S.currentAIMode).toBe(AI_MODES.PATTERN);
    expect(streamMsg.appendChunk).toHaveBeenCalledWith('Merhaba');
    expect(streamMsg.appendChunk).toHaveBeenCalledTimes(1);
  });

  it('parse edildikten sonraki chunk\'lar doğrudan appendChunk\'a gider', () => {
    const streamMsg = mockStreamMsg();
    const handler = createModeAwareChunkHandler(streamMsg);
    handler.onChunk('[MOD:soft] Merhaba');
    handler.onChunk(' devam ediyor');
    expect(streamMsg.appendChunk).toHaveBeenNthCalledWith(1, 'Merhaba');
    expect(streamMsg.appendChunk).toHaveBeenNthCalledWith(2, ' devam ediyor');
  });

  it('S3 fix: tag 30 karakter içinde hiç gelmezse ipucu moduna düşer (bayat kalmaz)', () => {
    S._modeHint = AI_MODES.CELEBRATE;
    const streamMsg = mockStreamMsg();
    const handler = createModeAwareChunkHandler(streamMsg);
    // Tek chunk'ta 30 karakteri aşan, tag'siz bir yanıt
    handler.onChunk('Bu yanıt otuz karakterden uzun ve hiç mod etiketi yok.');
    expect(handler.isParsed()).toBe(true);
    expect(handler.wasTagFound()).toBe(false); // FAZ 4: fallback — tag_missing=true olmalı
    expect(S.currentAIMode).toBe(AI_MODES.CELEBRATE);
    expect(streamMsg.appendChunk).toHaveBeenCalledTimes(1);
  });

  it('S3 fix: kısa yanıt tag getirmeden biterse flushIfNeeded ipucu moduna düşer', () => {
    S._modeHint = AI_MODES.REFLECTIVE;
    const streamMsg = mockStreamMsg();
    const handler = createModeAwareChunkHandler(streamMsg);
    handler.onChunk('Kısa yanıt.'); // 30 karakterin altında, tag yok
    expect(handler.isParsed()).toBe(false);
    expect(streamMsg.appendChunk).not.toHaveBeenCalled();
    handler.flushIfNeeded();
    expect(handler.isParsed()).toBe(true);
    expect(handler.wasTagFound()).toBe(false); // FAZ 4: fallback — tag_missing=true olmalı
    expect(S.currentAIMode).toBe(AI_MODES.REFLECTIVE);
    expect(streamMsg.appendChunk).toHaveBeenCalledWith('Kısa yanıt.');
  });

  it('flushIfNeeded zaten parse edilmişse veya buffer boşsa hiçbir şey yapmaz', () => {
    const streamMsg = mockStreamMsg();
    const handler = createModeAwareChunkHandler(streamMsg);
    handler.onChunk('[MOD:soft] Merhaba');
    streamMsg.appendChunk.mockClear();
    handler.flushIfNeeded();
    expect(streamMsg.appendChunk).not.toHaveBeenCalled();
  });

  it('getCleanText baştaki [MOD:xxx] etiketini siler', () => {
    const streamMsg = mockStreamMsg();
    const handler = createModeAwareChunkHandler(streamMsg);
    expect(handler.getCleanText('[MOD:direct] Merhaba')).toBe('Merhaba');
  });

  it('getCleanText tag yoksa metni değiştirmeden döner', () => {
    const streamMsg = mockStreamMsg();
    const handler = createModeAwareChunkHandler(streamMsg);
    expect(handler.getCleanText('Merhaba, nasılsın?')).toBe('Merhaba, nasılsın?');
  });

  /* FAZ 9 (13D, K5 "iki okuyucu, tek satır") — [MOD:x|DG:eksen#S2] uzantısı
     TEK chunk'ta gelirse de eski çıplak [MOD:xxx] gibi TEK seferde parse
     edilmeli; DG gövdesi asla appendChunk'a sızmamalı. */
  it('DG uzantılı tag tek chunk\'ta gelirse parse edilir, DG gövdesi ekrana sızmaz', () => {
    const streamMsg = mockStreamMsg();
    const handler = createModeAwareChunkHandler(streamMsg);
    handler.onChunk('[MOD:soft|DG:yatistirma#S2] Merhaba, nasılsın?');
    expect(handler.isParsed()).toBe(true);
    expect(handler.wasTagFound()).toBe(true);
    expect(S.currentAIMode).toBe(AI_MODES.SOFT);
    expect(streamMsg.appendChunk).toHaveBeenCalledWith('Merhaba, nasılsın?');
    expect(streamMsg.appendChunk).toHaveBeenCalledTimes(1);
  });

  it('DG uzantılı tag birden fazla chunk\'a bölünse de birikip doğru parse edilir', () => {
    const streamMsg = mockStreamMsg();
    const handler = createModeAwareChunkHandler(streamMsg);
    handler.onChunk('[MOD:reflective|DG:ber');
    expect(streamMsg.appendChunk).not.toHaveBeenCalled();
    handler.onChunk('raklik#S1] Devam');
    expect(handler.isParsed()).toBe(true);
    expect(S.currentAIMode).toBe(AI_MODES.REFLECTIVE);
    expect(streamMsg.appendChunk).toHaveBeenCalledWith('Devam');
    expect(streamMsg.appendChunk).toHaveBeenCalledTimes(1);
  });

  it('Türkçeleşmiş DUYGU: etiketi de tag olarak tanınır, ekrana sızmaz', () => {
    const streamMsg = mockStreamMsg();
    const handler = createModeAwareChunkHandler(streamMsg);
    handler.onChunk('[MOD:celebrate|DUYGU:kutlama] Aferin!');
    expect(handler.isParsed()).toBe(true);
    expect(S.currentAIMode).toBe(AI_MODES.CELEBRATE);
    expect(streamMsg.appendChunk).toHaveBeenCalledWith('Aferin!');
  });

  it('getCleanText DG uzantılı etiketi de siler', () => {
    const streamMsg = mockStreamMsg();
    const handler = createModeAwareChunkHandler(streamMsg);
    expect(handler.getCleanText('[MOD:direct|DG:sahiplenme#S3] Merhaba')).toBe('Merhaba');
    expect(handler.getCleanText('[MOD:direct|DUYGU:sahiplenme] Merhaba')).toBe('Merhaba');
  });
});

describe('getModeDistribution()', () => {
  beforeEach(resetModeState);

  it('boş _modeHistory için boş obje döner', () => {
    S._modeHistory = [];
    expect(getModeDistribution()).toEqual({});
  });

  it('mod başına doğru oranı hesaplar', () => {
    S._modeHistory = [AI_MODES.SOFT, AI_MODES.SOFT, AI_MODES.DIRECT];
    const dist = getModeDistribution(3);
    expect(dist[AI_MODES.SOFT]).toBeCloseTo(2 / 3);
    expect(dist[AI_MODES.DIRECT]).toBeCloseTo(1 / 3);
  });

  it('varsayılan n=6 ile yalnız son 6 öğeyi dikkate alır', () => {
    // İlk eleman (SOFT) 7 öğelik geçmişte en eskisi — slice(-6) onu dışarıda bırakmalı
    S._modeHistory = [AI_MODES.SOFT, AI_MODES.DIRECT, AI_MODES.DIRECT, AI_MODES.DIRECT, AI_MODES.DIRECT, AI_MODES.DIRECT, AI_MODES.DIRECT];
    const dist = getModeDistribution();
    expect(dist[AI_MODES.SOFT]).toBeUndefined();
    expect(dist[AI_MODES.DIRECT]).toBe(1);
  });
});

describe('getBalancingModeHint()', () => {
  beforeEach(resetModeState);

  it('%80 altı tekdüzelikte null döner', () => {
    S._modeHistory = [AI_MODES.SOFT, AI_MODES.DIRECT, AI_MODES.SOFT, AI_MODES.DIRECT, AI_MODES.SOFT, AI_MODES.DIRECT]; // 50/50
    expect(getBalancingModeHint()).toBeNull();
  });

  it('%80+ tekdüzelikte dominant olmayan bir mod önerir', () => {
    S._modeHistory = [AI_MODES.DIRECT, AI_MODES.DIRECT, AI_MODES.DIRECT, AI_MODES.DIRECT, AI_MODES.DIRECT, AI_MODES.SOFT]; // 5/6 = %83
    const hint = getBalancingModeHint();
    expect(hint).not.toBeNull();
    expect(hint).not.toBe(AI_MODES.DIRECT);
    expect(Object.values(AI_MODES)).toContain(hint);
  });

  it('etkililik skoruna göre en yüksek puanlı alternatifi önerir', () => {
    S._modeHistory = [AI_MODES.DIRECT, AI_MODES.DIRECT, AI_MODES.DIRECT, AI_MODES.DIRECT, AI_MODES.DIRECT, AI_MODES.SOFT];
    S._adaptiveCommunication.effective_approaches = [
      { mode: AI_MODES.REFLECTIVE, score: 5 },
      { mode: AI_MODES.REFLECTIVE, score: 5 },
      { mode: AI_MODES.CELEBRATE, score: 3 },
    ];
    S._adaptiveCommunication.ineffective_approaches = [
      { mode: AI_MODES.PATTERN, score: -5 },
      { mode: AI_MODES.DEPTH, score: -5 },
    ];
    expect(getBalancingModeHint()).toBe(AI_MODES.REFLECTIVE);
  });
});

describe('stripModeTag()', () => {
  it('baştaki [MOD:xxx] etiketini kaldırır', () => {
    expect(stripModeTag('[MOD:direct] Merhaba')).toBe('Merhaba');
  });

  it('tag yoksa metni olduğu gibi döner', () => {
    expect(stripModeTag('Merhaba, nasılsın?')).toBe('Merhaba, nasılsın?');
  });

  it('yalnız BAŞTAKİ tag\'i kaldırır — metin içinde geçen benzer bir dizi kalır', () => {
    const text = 'Merhaba [MOD:direct] dünya';
    expect(stripModeTag(text)).toBe(text);
  });

  // FAZ 9 — DG uzantılı (K5) etiket de tek regex'te tam silinir.
  it('DG uzantılı [MOD:x|DG:eksen#S2] etiketini bütünüyle kaldırır', () => {
    expect(stripModeTag('[MOD:soft|DG:yatistirma#S2] Merhaba')).toBe('Merhaba');
    expect(stripModeTag('[MOD:soft|DG:yatistirma] Merhaba')).toBe('Merhaba');
    expect(stripModeTag('[MOD:soft|DUYGU:yatistirma#S2] Merhaba')).toBe('Merhaba');
  });
});

describe('extractDgReading() — FAZ 9 modelin ikinci okuyucusu (K5)', () => {
  it('DG bloğu yoksa null döner (eski çıplak [MOD:xxx] hiçbir şey kaybetmez)', () => {
    expect(extractDgReading('[MOD:soft] Merhaba')).toBeNull();
    expect(extractDgReading('Merhaba, nasılsın?')).toBeNull();
  });

  it('tanınan eksen + ref ile okuma döner', () => {
    expect(extractDgReading('[MOD:soft|DG:yatistirma#S2] Merhaba')).toEqual({ eksen: 'yatistirma', ref: 'S2' });
  });

  it('ref olmadan da okuma döner (ref isteğe bağlı)', () => {
    expect(extractDgReading('[MOD:celebrate|DG:kutlama] Aferin')).toEqual({ eksen: 'kutlama', ref: null });
  });

  it('Türkçeleşmiş DUYGU: etiketini de tolere eder', () => {
    expect(extractDgReading('[MOD:direct|DUYGU:sahiplenme#S1] Metin')).toEqual({ eksen: 'sahiplenme', ref: 'S1' });
  });

  it('tanınmayan/diyakritikli eksen SESSİZCE yok sayılır (§6.10 — uydurma eşleşme yok)', () => {
    expect(extractDgReading('[MOD:soft|DG:yatıştırma#S2] Merhaba')).toBeNull();
    expect(extractDgReading('[MOD:soft|DG:uydurma_eksen] Merhaba')).toBeNull();
  });

  it('büyük/küçük harf duyarsızdır', () => {
    expect(extractDgReading('[MOD:soft|DG:YATISTIRMA#s2] Merhaba')).toEqual({ eksen: 'yatistirma', ref: 'S2' });
  });

  it('`guven`/`confidence` gibi bir alan asla üretmez (K4)', () => {
    const okuma = extractDgReading('[MOD:soft|DG:tutma#S1] Merhaba');
    expect(okuma).not.toHaveProperty('guven');
    expect(okuma).not.toHaveProperty('confidence');
    expect(Object.keys(okuma).sort()).toEqual(['eksen', 'ref']);
  });
});

describe('stripModeWatermark() — modelin taklit ettiği mod filigranı', () => {
  it('TR filigran satırını baştan kaldırır', () => {
    expect(stripModeWatermark('[bu yanıt "tasarla" modunda yazıldı]\nMerhaba')).toBe('Merhaba');
  });

  it('EN filigran satırını da kaldırır (prompt.mode.past_watermark paritesi)', () => {
    expect(stripModeWatermark('[this reply was written in "design" mode]\nHello')).toBe('Hello');
  });

  it('BİRİKMİŞ katmanları soyar — 06 her turda üstüne bir tane daha bindirebiliyordu', () => {
    const kirli = '[bu yanıt "tasarla" modunda yazıldı]\n' +
                  '[bu yanıt "tasarla" modunda yazıldı]\n' +
                  'Senden tek bir şey istiyorum.';
    expect(stripModeWatermark(kirli)).toBe('Senden tek bir şey istiyorum.');
  });

  it('filigran yoksa metne dokunmaz', () => {
    expect(stripModeWatermark('Merhaba, nasılsın?')).toBe('Merhaba, nasılsın?');
  });

  it('yalnız BAŞTAKİ filigranı kaldırır — metin ortasındaki satır korunur', () => {
    const text = 'Merhaba\n[bu yanıt "tasarla" modunda yazıldı]\ndünya';
    expect(stripModeWatermark(text)).toBe(text);
  });

  it('boş/undefined girdide patlamaz', () => {
    expect(stripModeWatermark('')).toBe('');
    expect(stripModeWatermark(undefined)).toBeUndefined();
  });
});

describe('buildModeSelectionGuide() — Omurga + Kartuş montajı (FAZ 3)', () => {
  beforeEach(resetModeState);

  it('kimlik omurgasını ve mod protokolünü her zaman içerir', () => {
    const guide = buildModeSelectionGuide();
    expect(guide).toContain('WANDERER KİMLİĞİ');
    expect(guide).toContain('[MOD:soft]');
  });

  // NOT: protokol her zaman 6 modun BİR SATIRLIK özetini listeler (ör. depth
  // için "• depth (DERİNLİK) — Zihniyetin derinliklerine in...") — bu satır
  // kartuş enjekte edilsin edilmesin zaten guide'da olur. Bu yüzden "kartuş
  // gerçekten eklendi mi" testleri yalnız kartın GÖVDESİNE özgü (protokolde
  // asla geçmeyen) alt satırları arar.
  it('ipucu modu ile aktif mod AYNIYSA yalnız TEK kartuş ekler', () => {
    S._modeHint = AI_MODES.DEPTH;
    S.currentAIMode = AI_MODES.DEPTH;
    const guide = buildModeSelectionGuide();
    // depth kartının gövdesine özgü satır (protokol özetinde yok)
    expect(guide).toContain('TEMELLER (muhtaçlık/değersizlik/sınır koyamama/onay bekleme/kıtlık tespit edildiğinde):');
    // diğer modların derin talimatı (ör. soft'un KALBİ satırı) enjekte edilmemeli
    expect(guide).not.toContain('Arkadaki Sen / Hayattaki Sen ayrımını kur');
  });

  it('ipucu modu ile aktif mod FARKLIYSA iki ayrı kartuş ekler', () => {
    S._modeHint = AI_MODES.PATTERN;
    S.currentAIMode = AI_MODES.CELEBRATE;
    const guide = buildModeSelectionGuide();
    // her iki kartın gövdesine özgü satırlar (protokol özetinde yok)
    expect(guide).toContain('HAYAL ALEMİ: "Bu örüntü sürekli tekrarlıyorsa — hayal aleminde o kişi kim?"');
    expect(guide).toContain('ÜSTEL BÜYÜME: "Her doğru seçim bir sonrakini kolaylaştırıyor."');
  });

  it('enjekte edilmeyen modların derin kartı guide\'a girmez', () => {
    S._modeHint = AI_MODES.SOFT;
    S.currentAIMode = AI_MODES.SOFT;
    const guide = buildModeSelectionGuide();
    // direct kartının gövdesine özgü cümle bulunmamalı (protokol özetinde
    // "Aktif olarak kaçıyor..." geçer ama bu İNANÇ TESPİTİ satırı yalnız kartta var)
    expect(guide).not.toContain('İNANÇ TESPİTİ: Kaçışın altındaki sınırlayıcı inancı ara.');
  });

  it('mod geçiş rehberini (XVII) her zaman içerir', () => {
    const guide = buildModeSelectionGuide();
    expect(guide).toContain('Örüntü tespit → örüntü');
  });
});

describe('isBigModeTransition() — Mod Pusulası tören eşiği (FAZ 5)', () => {
  it('aynı moddaysa false döner', () => {
    expect(isBigModeTransition(AI_MODES.SOFT, AI_MODES.SOFT)).toBe(false);
  });

  it('prev veya next eksikse false döner', () => {
    expect(isBigModeTransition(null, AI_MODES.DIRECT)).toBe(false);
    expect(isBigModeTransition(AI_MODES.DIRECT, null)).toBe(false);
    expect(isBigModeTransition(undefined, undefined)).toBe(false);
  });

  it('hafif modlar arası geçiş (soft↔reflective↔celebrate) büyük sayılmaz', () => {
    expect(isBigModeTransition(AI_MODES.SOFT, AI_MODES.REFLECTIVE)).toBe(false);
    expect(isBigModeTransition(AI_MODES.REFLECTIVE, AI_MODES.CELEBRATE)).toBe(false);
    expect(isBigModeTransition(AI_MODES.CELEBRATE, AI_MODES.SOFT)).toBe(false);
  });

  it('direct/depth/pattern\'e giren her geçiş büyük sayılır', () => {
    expect(isBigModeTransition(AI_MODES.SOFT, AI_MODES.DIRECT)).toBe(true);
    expect(isBigModeTransition(AI_MODES.SOFT, AI_MODES.DEPTH)).toBe(true);
    expect(isBigModeTransition(AI_MODES.SOFT, AI_MODES.PATTERN)).toBe(true);
  });

  it('direct\'ten çıkmak da büyük sayılır (↔direct)', () => {
    expect(isBigModeTransition(AI_MODES.DIRECT, AI_MODES.SOFT)).toBe(true);
    expect(isBigModeTransition(AI_MODES.DIRECT, AI_MODES.CELEBRATE)).toBe(true);
  });

  it('iki ağır mod arası geçiş de büyük sayılır', () => {
    expect(isBigModeTransition(AI_MODES.DEPTH, AI_MODES.PATTERN)).toBe(true);
  });
});

describe('applyLLMMode() — sohbet içi mod geçiş ayracı (FAZ 5)', () => {
  beforeEach(() => {
    resetModeState();
    document.body.innerHTML = '<div id="messages-area"></div>';
  });

  it('büyük geçişte #messages-area\'ya .mode-switch-divider ekler', () => {
    S.currentAIMode = AI_MODES.SOFT;
    applyLLMMode(AI_MODES.DIRECT);
    expect(document.querySelectorAll('.mode-switch-divider').length).toBe(1);
  });

  it('hafif geçişte ayraç eklemez', () => {
    S.currentAIMode = AI_MODES.SOFT;
    applyLLMMode(AI_MODES.REFLECTIVE);
    expect(document.querySelectorAll('.mode-switch-divider').length).toBe(0);
  });

  it('#messages-area DOM\'da yoksa hata fırlatmadan sessizce geçer', () => {
    document.body.innerHTML = '';
    S.currentAIMode = AI_MODES.SOFT;
    expect(() => applyLLMMode(AI_MODES.DEPTH)).not.toThrow();
  });

  it('ayracın rengi ilgili --mode-*-color değişkenine işaret eder', () => {
    S.currentAIMode = AI_MODES.SOFT;
    applyLLMMode(AI_MODES.PATTERN);
    const div = document.querySelector('.mode-switch-divider');
    expect(div.style.getPropertyValue('--mdv-c')).toContain('--mode-pattern-color');
  });
});
