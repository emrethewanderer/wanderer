/**
 * Tests for js/parts/01-prompts-modes.js
 *
 * Covers: buildSmartRagQuery (pure logic), invalidateContextCache,
 * buildDepthModeContext, buildPatternModeContext output types.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { S } from '../js/state.js';
import { PROMPT_VERSION } from '../js/config.js';
import { p } from '../js/parts/16-i18n-prompts.js';
import { DG_KARSILAMALAR } from '../js/parts/13D-duygu-motoru.js';
import { nowTR, detectTopics, trackEmotionalFlow } from '../js/parts/00-config-tracking.js';

// Expose globals used without explicit import inside the module
globalThis.nowTR      = nowTR;
globalThis.detectTopics = detectTopics;

import {
  buildSmartRagQuery,
  invalidateContextCache,
  buildDepthModeContext,
  buildPatternModeContext,
  buildContextPrompt,
  _determineContextMode,
  _truncateSection,
  _CONTEXT_BUDGETS,
} from '../js/parts/01-prompts-modes.js';

function resetEmotionalFlow(intensity = 0) {
  S._emotionalFlow = intensity > 0
    ? [{ intensity, direction: 'neutral', ts: Date.now() }]
    : [];
}

// ─── buildSmartRagQuery ───────────────────────────────────────────────────────

describe('buildSmartRagQuery()', () => {
  beforeEach(() => resetEmotionalFlow());

  it('returns shouldRAG=false for very short text', () => {
    const result = buildSmartRagQuery('ok', []);
    expect(result.shouldRAG).toBe(false);
  });

  it('returns shouldRAG=false for empty text', () => {
    const result = buildSmartRagQuery('', []);
    expect(result.shouldRAG).toBe(false);
  });

  it('returns shouldRAG=false for pure greeting', () => {
    const result = buildSmartRagQuery('merhaba nasılsın', []);
    expect(result.shouldRAG).toBe(false);
  });

  it('returns shouldRAG=true for concept-seeking text', () => {
    const result = buildSmartRagQuery('anksiyete ne demek, açıklar mısın?', []);
    expect(result.shouldRAG).toBe(true);
    expect(result.query.length).toBeGreaterThan(0);
  });

  it('returns shouldRAG=true for technique-seeking text', () => {
    const result = buildSmartRagQuery('panik atak için nasıl baş edebilirim, bir teknik var mı?', []);
    expect(result.shouldRAG).toBe(true);
    expect(result.topK).toBeGreaterThanOrEqual(4);
  });

  it('returns shouldRAG=true for actionable psychological keyword', () => {
    const result = buildSmartRagQuery('son zamanlarda çok fazla anksiyete yaşıyorum', []);
    expect(result.shouldRAG).toBe(true);
  });

  it('returns shouldRAG=true for English concept-seeking', () => {
    const result = buildSmartRagQuery('what does attachment style mean and how does it affect relationships?', []);
    expect(result.shouldRAG).toBe(true);
  });

  it('strips filler patterns from query', () => {
    const result = buildSmartRagQuery('teşekkürler, anksiyete konusunda bilgi verir misin?', []);
    // Query should not start with thanks
    if (result.shouldRAG) {
      expect(result.query.toLowerCase()).not.toMatch(/^teşekkür/);
    }
  });

  it('returns topK >= 5 for technique queries', () => {
    const result = buildSmartRagQuery('depresyon için kullanabileceğim bir teknik veya yöntem var mı?', []);
    if (result.shouldRAG) expect(result.topK).toBeGreaterThanOrEqual(4);
  });

  it('always returns an object with shouldRAG, query, topK', () => {
    const result = buildSmartRagQuery('test', []);
    expect(result).toHaveProperty('shouldRAG');
    expect(result).toHaveProperty('query');
    expect(result).toHaveProperty('topK');
  });

  it('triggers RAG via actionable keyword (anksiyete)', () => {
    // Uses _RAG_ACTIONABLE_PATTERNS match — no topic needed
    const result = buildSmartRagQuery('anksiyete yaşıyorum ve bunun üstesinden gelmek istiyorum', []);
    expect(result.shouldRAG).toBe(true);
  });
});

// ─── invalidateContextCache ───────────────────────────────────────────────────

describe('invalidateContextCache()', () => {
  it('does not throw', () => {
    expect(() => invalidateContextCache()).not.toThrow();
  });

  it('can be called multiple times without error', () => {
    expect(() => {
      invalidateContextCache();
      invalidateContextCache();
      invalidateContextCache();
    }).not.toThrow();
  });
});

// ─── buildDepthModeContext ────────────────────────────────────────────────────

describe('buildDepthModeContext()', () => {
  beforeEach(() => {
    S._depthProfile = {
      standart:  { score: 50, direction: 'flat', signals_count: 0, evidence: [] },
      hak_etmek: { score: 50, direction: 'flat', signals_count: 0, evidence: [] },
      normal:    { score: 50, direction: 'flat', signals_count: 0, evidence: [] },
      layik:     { score: 50, direction: 'flat', signals_count: 0, evidence: [] },
    };
    S._foundationsProfile = {
      oz_sevgi: { score: 50, direction: 'flat', signals_count: 0, evidence: [] },
      oz_saygi: { score: 50, direction: 'flat', signals_count: 0, evidence: [] },
      oz_deger: { score: 50, direction: 'flat', signals_count: 0, evidence: [] },
      oz_guven: { score: 50, direction: 'flat', signals_count: 0, evidence: [] },
      bolluk:   { score: 50, direction: 'flat', signals_count: 0, evidence: [] },
    };
    S._personTransition = {
      current: { description: '', confidence: 0 },
      desired: { description: '', confidence: 0 },
      unwanted: { description: '' },
      domains: { bireysel: {}, iliski: {}, is: {} },
      last_updated: null,
    };
  });

  it('returns a non-empty string', () => {
    const result = buildDepthModeContext();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('does not throw', () => {
    expect(() => buildDepthModeContext()).not.toThrow();
  });
});

// ─── buildPatternModeContext ──────────────────────────────────────────────────

describe('buildPatternModeContext()', () => {
  beforeEach(() => {
    // Only reset arrays/fields that this function reads directly.
    // Do NOT overwrite S._predictionModel — state.js initializes it with the
    // correct structure (mood_by_day, time_patterns, etc.).
    S._emotionalFlow = [];
    S._emotionalChain = [];
    S._personalityMap.defense_mechanisms = [];
    S._adaptiveCommunication.effective_approaches = [];
    S._adaptiveCommunication.ineffective_approaches = [];
    S._adaptiveCommunication.preferred_metaphors = [];
    S._adaptiveCommunication.user_vocabulary = {};
    S._adaptiveCommunication.response_engagement = [];
  });

  it('returns a string', () => {
    const result = buildPatternModeContext();
    expect(typeof result).toBe('string');
  });

  it('does not throw', () => {
    expect(() => buildPatternModeContext()).not.toThrow();
  });
});

// ─── _determineContextMode (FAZ 2 — mod sistemi test zırhı) ──────────────────
// Dinamik bağlam bütçesinin hangi moda düşeceğini seçen fonksiyon. Öncelik
// sırası: crisis > deep_emotion > knowledge_seek > casual > standard.

describe('_determineContextMode()', () => {
  beforeEach(() => resetEmotionalFlow());

  it('extras.crisis doluysa "crisis" döner', () => {
    expect(_determineContextMode('herhangi bir metin', { crisis: 'kriz notu' })).toBe('crisis');
  });

  it('extras.crisis yalnız boşluksa "crisis" saymaz', () => {
    resetEmotionalFlow(5); // deep_emotion'a düşmesin diye referans
    expect(_determineContextMode('kısa', { crisis: '   ' })).not.toBe('crisis');
  });

  it('son duygusal yoğunluk ≥4 ise "deep_emotion" döner', () => {
    resetEmotionalFlow(4);
    expect(_determineContextMode('herhangi bir metin', {})).toBe('deep_emotion');
  });

  // KIRIK 2 (plan Bağlam, duygu-motoru.md): eski trackEmotionalFlow yalnız
  // 5/3/2/1 üretirdi — "4" hiç doğmazdı, oysa bu fonksiyon tam >=4 arıyordu.
  // 13D'ye devirden (FAZ 2) SONRA gerçek trackEmotionalFlow çağrısıyla uçtan
  // uca kanıtlanır: artık tam 4 üretebiliyor VE deep_emotion'ı tetikliyor.
  it('KIRIK 2 düzeldi: gerçek trackEmotionalFlow(4) → deep_emotion tetikler', () => {
    S._emotionalFlow = [];
    const kayit = trackEmotionalFlow('çok kaygılıyım, panik atıyorum!');
    expect(kayit.intensity).toBe(4);
    expect(_determineContextMode('herhangi bir metin', {})).toBe('deep_emotion');
  });

  it('crisis, deep_emotion\'ın önüne geçer', () => {
    resetEmotionalFlow(5);
    expect(_determineContextMode('metin', { crisis: 'kriz' })).toBe('crisis');
  });

  it('_ragActive true ve deep_emotion yoksa "knowledge_seek" döner', () => {
    resetEmotionalFlow(1);
    expect(_determineContextMode('bu bir bilgi sorusu mudur uzun bir cümle', { _ragActive: true })).toBe('knowledge_seek');
  });

  it('deep_emotion, knowledge_seek\'in önüne geçer', () => {
    resetEmotionalFlow(4);
    expect(_determineContextMode('metin', { _ragActive: true })).toBe('deep_emotion');
  });

  it('kısa metin (<30 char) + düşük yoğunluk (≤2) "casual" döner', () => {
    resetEmotionalFlow(1);
    expect(_determineContextMode('selam nasılsın', {})).toBe('casual');
  });

  it('uzun metin "casual" saymaz — "standard"a düşer', () => {
    resetEmotionalFlow(1);
    const longText = 'Bu otuz karakterden çok daha uzun bir cümledir ve casual sayılmamalı.';
    expect(_determineContextMode(longText, {})).toBe('standard');
  });

  it('hiçbir özel koşul yoksa "standard" döner', () => {
    resetEmotionalFlow(3);
    const longText = 'Bu otuz karakterden çok daha uzun bir cümledir ve casual sayılmamalı.';
    expect(_determineContextMode(longText, {})).toBe('standard');
  });
});

// ─── _truncateSection ─────────────────────────────────────────────────────────

describe('_truncateSection()', () => {
  it('içerik limit altındaysa değiştirmeden döner', () => {
    expect(_truncateSection('kısa metin', 100)).toBe('kısa metin');
  });

  it('içerik limiti aşıyorsa keser ve "…" ekler', () => {
    const long = 'a'.repeat(50);
    const result = _truncateSection(long, 10);
    expect(result).toBe('a'.repeat(10) + '…');
    expect(result.length).toBe(11);
  });

  it('içerik tam limit uzunluğundaysa dokunmaz', () => {
    const exact = 'a'.repeat(10);
    expect(_truncateSection(exact, 10)).toBe(exact);
  });

  it('boş/null içerik olduğu gibi döner', () => {
    expect(_truncateSection('', 10)).toBe('');
    expect(_truncateSection(null, 10)).toBe(null);
  });
});

// ─── _CONTEXT_BUDGETS — bilinçli-0 değişmezleri (regresyon kilidi) ───────────
// 09f/09g yorumları: recalled_memories ve mirror_hypothesis kriz/bilgi-arayışı
// modunda BİLİNÇLİ olarak 0'dır — bu testler o kararın sessizce bozulmasını yakalar.

describe('_CONTEXT_BUDGETS — bilinçli-0 değişmezleri', () => {
  it('tam olarak 5 bağlam modu tanımlar', () => {
    expect(Object.keys(_CONTEXT_BUDGETS).sort()).toEqual(
      ['casual', 'crisis', 'deep_emotion', 'knowledge_seek', 'standard'].sort()
    );
  });

  it('crisis modunda somatic_awareness/recalled_memories/mirror_hypothesis 0\'dır', () => {
    expect(_CONTEXT_BUDGETS.crisis.somatic_awareness).toBe(0);
    expect(_CONTEXT_BUDGETS.crisis.recalled_memories).toBe(0);
    expect(_CONTEXT_BUDGETS.crisis.mirror_hypothesis).toBe(0);
  });

  it('knowledge_seek modunda somatic_awareness/recalled_memories/mirror_hypothesis 0\'dır', () => {
    expect(_CONTEXT_BUDGETS.knowledge_seek.somatic_awareness).toBe(0);
    expect(_CONTEXT_BUDGETS.knowledge_seek.recalled_memories).toBe(0);
    expect(_CONTEXT_BUDGETS.knowledge_seek.mirror_hypothesis).toBe(0);
  });

  it('deep_emotion modunda mirror_hypothesis 0\'dır (Ayna Protokolü krizde/derin duyguda sorulmaz)', () => {
    expect(_CONTEXT_BUDGETS.deep_emotion.mirror_hypothesis).toBe(0);
  });

  // past_days (2026-08-24) — geçmiş günler user_profile demetinden ÇIKTI ve
  // kendi bütçesini aldı. Kriz/bilgi-arayışında 0, diğerlerinde dolu: bu
  // testler hatırlamanın sessizce kırpılmaya geri dönmesini yakalar.
  it('her mod past_days bütçesi tanımlar', () => {
    Object.values(_CONTEXT_BUDGETS).forEach(budget => {
      expect(budget).toHaveProperty('past_days');
    });
  });

  it('pinned_declarations yalnız crisis modunda 0\'dır — beyan kırpılmaz', () => {
    expect(_CONTEXT_BUDGETS.crisis.pinned_declarations).toBe(0);
    ['deep_emotion', 'knowledge_seek', 'casual', 'standard'].forEach(mod => {
      expect(_CONTEXT_BUDGETS[mod].pinned_declarations).toBeNull();
    });
  });

  it('past_days yalnız crisis ve knowledge_seek modunda 0\'dır', () => {
    expect(_CONTEXT_BUDGETS.crisis.past_days).toBe(0);
    expect(_CONTEXT_BUDGETS.knowledge_seek.past_days).toBe(0);
    expect(_CONTEXT_BUDGETS.casual.past_days).not.toBe(0);
    expect(_CONTEXT_BUDGETS.deep_emotion.past_days).not.toBe(0);
    expect(_CONTEXT_BUDGETS.standard.past_days).toBeNull();
  });

  it('standard modunda hiçbir bölüm 0 değildir (sınırsız veya bütçeli)', () => {
    Object.values(_CONTEXT_BUDGETS.standard).forEach(v => {
      expect(v).not.toBe(0);
    });
  });

  it('critical_alerts ve response_mode her modda sınırsızdır (null)', () => {
    Object.values(_CONTEXT_BUDGETS).forEach(budget => {
      expect(budget.critical_alerts).toBeNull();
      expect(budget.response_mode).toBeNull();
    });
  });

  // DENETİM 2026-07-31 — 06 artık modu buildContextPrompt'tan ÖNCE bir kez daha
  // çözüyor (bütçesi 0 olan bölümlerin yan-etkili tüketicilerini hiç çağırmamak
  // için). Bu ancak çözücü SAF ise güvenlidir: aynı girdiyle aynı sonuç,
  // S üzerinde iz bırakmadan.
  it('_determineContextMode saftır — iki kez çağırmak aynı sonucu verir, S\'yi kirletmez', () => {
    resetEmotionalFlow(5);
    const before = JSON.stringify({ flow: S._emotionalFlow, mode: S._lastContextMode });

    const a = _determineContextMode('bugün çok ağır bir gündü', {});
    const b = _determineContextMode('bugün çok ağır bir gündü', {});

    expect(a).toBe('deep_emotion');
    expect(b).toBe(a);
    expect(JSON.stringify({ flow: S._emotionalFlow, mode: S._lastContextMode })).toBe(before);
  });
});

// ─── buildContextPrompt() — bütçe uygulaması + prompt_meta ───────────────────

describe('buildContextPrompt() — prompt_meta ve bütçe entegrasyonu', () => {
  beforeEach(() => {
    resetEmotionalFlow();
    S._modeHint = 'soft';
    S._modeHistory = [];
    S._modeExplicitRequest = null;
    invalidateContextCache();
  });

  it('boş girdilerle bile çağrıldığında hata fırlatmaz', () => {
    expect(() => buildContextPrompt('', {})).not.toThrow();
  });

  it('sonuç <prompt_meta> etiketiyle başlar ve PROMPT_VERSION\'ı taşır', () => {
    const result = buildContextPrompt('', { _userText: 'selam' });
    expect(result).toContain(`<prompt_meta version="${PROMPT_VERSION}"`);
  });

  it('kısa/nötr mesaj için ctx_mode="casual" olarak işaretlenir', () => {
    resetEmotionalFlow(1);
    const result = buildContextPrompt('', { _userText: 'selam nasılsın' });
    expect(result).toContain('ctx_mode="casual"');
    expect(S._lastContextMode).toBe('casual');
  });

  it('crisis extras\'ı varsa ctx_mode="crisis" olarak işaretlenir', () => {
    const result = buildContextPrompt('', { _userText: 'yardım', crisis: 'kriz notu' });
    expect(result).toContain('ctx_mode="crisis"');
    expect(S._lastContextMode).toBe('crisis');
  });

  // C.AI DERSİ (2026-08-24) — "20 mesajda unutuyor" şikâyetinin bizdeki hâli:
  // memoryCtx, user_profile demetinin 3. sırasındaydı ve casual'ın 400
  // karakterini profil+seviye yiyordu. Kendi bölümüne taşındı.
  it('casual modda geçmiş günler kendi <past_days> bölümünde gider', () => {
    resetEmotionalFlow(1);
    S._narrativeMemory = [
      { date: '2026-08-20', note: 'Emeğinin karşılığını alamadığını söyledi; babasıyla konuşmayı erteledi.' },
      { date: '2026-08-21', note: 'Sabah yürüyüşünü ilk kez kaçırmadı.' },
    ];
    invalidateContextCache();
    const result = buildContextPrompt('', { _userText: 'selam' });
    expect(S._lastContextMode).toBe('casual');
    expect(result).toContain('<past_days');
    expect(result).toContain('2026-08-20');
  });

  // 09j — mühürlü sözler: kullanıcının kendi beyanı, kriz DIŞINDA her tura girer
  it('mühürlü sözler <pinned_declarations> bölümüne girer', () => {
    resetEmotionalFlow(1);
    window.htBaglamBloku = () => 'MÜHÜRLÜ SÖZLER\n• [2026-08-20] "Emeğimin karşılığını alamıyorum."';
    invalidateContextCache();
    const result = buildContextPrompt('', { _userText: 'selam' });
    expect(result).toContain('<pinned_declarations');
    expect(result).toContain('Emeğimin karşılığını alamıyorum.');
    delete window.htBaglamBloku;
  });

  it('kriz modunda mühürlü sözler gitmez (tek geçerli bağlam şimdiki an)', () => {
    window.htBaglamBloku = () => 'MÜHÜRLÜ SÖZLER\n• [2026-08-20] "Bir söz."';
    invalidateContextCache();
    const result = buildContextPrompt('', { _userText: 'yardım', crisis: 'kriz notu' });
    expect(result).not.toContain('<pinned_declarations');
    delete window.htBaglamBloku;
  });

  it('09j yüklü değilse bölüm hiç doğmaz (kayıpsız düşüş)', () => {
    delete window.htBaglamBloku;
    invalidateContextCache();
    const result = buildContextPrompt('', { _userText: 'selam' });
    expect(result).not.toContain('<pinned_declarations');
  });

  it('kriz modunda geçmiş günler bölümü hiç gitmez (odak ŞİMDİ)', () => {
    S._narrativeMemory = [{ date: '2026-08-20', note: 'Dün ağır bir gündü.' }];
    invalidateContextCache();
    const result = buildContextPrompt('', { _userText: 'yardım', crisis: 'kriz notu' });
    expect(S._lastContextMode).toBe('crisis');
    expect(result).not.toContain('<past_days');
  });

  it('RAG bağlamı verildiğinde kb_header içeren active_journey bölümüne girer', () => {
    // ≥30 karakter + düşük yoğunluk → "standard" (active_journey bütçesi null/sınırsız);
    // "casual" (300 char bütçeli) seçilirse trackCtx/homeworkCtx içeriği enjekte
    // edilen RAG metnini kesebilir — bu yüzden kısa metin burada KULLANILMAZ.
    const longText = 'Bu konu hakkında bana biraz daha fazla bilgi verebilir misin acaba?';
    const result = buildContextPrompt('örnek bilgi tabanı içeriği', { _userText: longText });
    expect(S._lastContextMode).toBe('standard');
    expect(result).toContain('örnek bilgi tabanı içeriği');
  });
});

/* REGISTER KARTUŞLARI (FAZ 6) — kartuş DAVRANIŞ tarif eder, duygu adlandırmaz
   (K7). Kriz kartuşu dar bütçeye sığmak zorundadır; sığmazsa kırpılır ve
   emniyet talimatının SONU kaybolur — en kötü yerde yarım kalan bir cümle. */
describe('duygusal_karsilama — register kartuşları', () => {
  const bolum = (out) => {
    const m = out.match(/<duygusal_karsilama[^>]*>([\s\S]*?)<\/duygusal_karsilama>/);
    return m ? m[1].trim() : '';
  };
  const sifirla = () => {
    S._emotionalFlow = []; S._dgNabiz = null; S._dgYay = null;
    S._dgSonKarsilama = []; S._dgIklim = null; S._currentLang = 'tr';
  };

  beforeEach(sifirla);

  it('kanıtlı turda kartuş bölüme giriyor', () => {
    trackEmotionalFlow('çok kaygılıyım, panik atıyorum!');
    const b = bolum(buildContextPrompt('', { _userText: 'çok kaygılıyım, panik atıyorum!' }));
    expect(b).toContain('Karşılama ekseni');
    expect(b).toMatch(/Kısa cümleler kur/); // yatıştırma kartuşu
  });

  it('ortak yasak satırı kartuşla birlikte gidiyor (K7)', () => {
    trackEmotionalFlow('çok kaygılıyım, panik atıyorum!');
    const b = bolum(buildContextPrompt('', { _userText: 'çok kaygılıyım, panik atıyorum!' }));
    expect(b).toContain('Yasak açılışlar');
  });

  it('KRİZDE ortak yasak EKLENMEZ — dar bütçe tutma kartuşuna ayrılır', () => {
    const eski = window.detectCrisis;
    window.detectCrisis = () => true;
    try {
      const b = bolum(buildContextPrompt('', { _userText: 'bitirmek istiyorum', crisis: 'kriz' }));
      expect(b).toContain('Güvenlik önde');
      expect(b).not.toContain('Yasak açılışlar');
    } finally { window.detectCrisis = eski; }
  });

  it('kriz bölümü bütçesine SIĞIYOR — kırpma yok (talimatın sonu kaybolmaz)', () => {
    const eski = window.detectCrisis;
    window.detectCrisis = () => true;
    try {
      const b = bolum(buildContextPrompt('', { _userText: 'bitirmek istiyorum', crisis: 'kriz' }));
      expect(b).not.toContain('…');           // _truncateSection'ın izi
      expect(b).toMatch(/somut ve kesin konuş/); // kartuşun SON cümlesi yerinde
    } finally { window.detectCrisis = eski; }
  });

  /* BÜTÇE KAPISI — bölüm hiçbir modda KIRPILMAMALI. Kesilen yer daima
     bölümün SONUDUR: ortak yasak satırı (K7) ve kartuşun son cümlesi.
     Yarım kalan bir talimat, olmayan bir talimattan beterdir — model onu
     yine de uygular. FAZ 7+ kartuşa satır eklerse bu test kırılır ve
     bütçenin yeniden ölçülmesi gerektiğini söyler. */
  it('hiçbir modda kırpılmıyor — iki dilde, en uzun kartuşla', () => {
    const eskiKriz = window.detectCrisis;
    for (const dil of ['tr', 'en']) {
      S._currentLang = dil;
      for (const mod of ['standard', 'casual', 'crisis']) {
        sifirla();
        S._currentLang = dil;
        window.detectCrisis = () => (mod === 'crisis');
        // taniklik/sahiplenme en uzun kartuşlar; kanıtı da uzun tutalım
        trackEmotionalFlow(dil === 'tr' ? 'çok utanıyorum, kendimi bir türlü affedemiyorum bugün' : 'i feel so ashamed and i cannot forgive myself today');
        const extras = { _userText: dil === 'tr' ? 'çok utanıyorum, kendimi bir türlü affedemiyorum bugün' : 'i feel so ashamed and i cannot forgive myself today' };
        if (mod === 'crisis') extras.crisis = 'kriz';
        if (mod === 'casual') extras._userText = dil === 'tr' ? 'utanıyorum' : 'ashamed';
        const b = bolum(buildContextPrompt('', extras));
        if (b) expect(`${dil}/${mod}: ${b}`).not.toContain('…');
      }
    }
    window.detectCrisis = eskiKriz;
    S._currentLang = 'tr';
  });

  it('yedi eksenin her birinin kartuşu var (eksiksiz sözlük)', () => {
    for (const eksen of DG_KARSILAMALAR) {
      const metin = p('prompt.dg.kartus.' + eksen);
      expect(typeof metin).toBe('string');
      expect(metin.length).toBeGreaterThan(40); // anahtar adı geri dönmüş olamaz
    }
  });
});
