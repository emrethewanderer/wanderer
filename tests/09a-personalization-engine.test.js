/**
 * Tests for js/parts/09a-personalization-engine.js
 *
 * Covers: pattern constants, p1AnalyzePersonality communication analysis,
 * value detection, defense mechanism detection.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { S } from '../js/state.js';
import { SafeStorage } from '../js/parts/00a-infrastructure.js';
import { nowTR, detectTopics } from '../js/parts/00-config-tracking.js';

// Yalnız callLLM stub'lanır — 04'ün diğer export'ları gerçek kalır
vi.mock('../js/parts/04-llm-hero-history.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, callLLM: vi.fn() };
});
import { callLLM } from '../js/parts/04-llm-hero-history.js';

// nowTR is used inside p1AnalyzePersonality without being explicitly imported
// (works in browser via Vite bundling scope; expose globally for tests)
globalThis.nowTR = nowTR;
globalThis.detectTopics = detectTopics;

import {
  _METAPHOR_PATTERNS,
  _VALUE_INDICATORS,
  _RELATIONSHIP_PATTERNS,
  _DEFENSE_PATTERNS,
  _SELF_DESC_PATTERNS,
  p1AnalyzePersonality,
  p6ExtractPeople,
  p6ExtractOpenLoops,
  p6ExtractLifeFacts,
  p6UpsertFact,
  _p6MigrateFacts,
  p6KokenTemizlik,
  p6MarkLoopsFollowedUp,
  p6ResolveDueDate,
  p6TarihCoz,
  p6GetProactiveCheckin,
  p6GetLifeMemoryContext,
  personalizationDeepAnalysis,
  personalizationAnalyze,
  personalizationRecordAIReply,
  buildPersonalizationPrompt,
  p2DetectEmotions,
  _p2GocEt,
  p2RecordEmotionalMoment,
  p2GetEmotionalChainInsight,
  p2GetEmotionalCycleInsight,
  p3RecordPredictionData,
  p3GetPredictiveInsight,
  p4RecordExplicitUIFeedback,
  p4AnalyzeEffectiveness,
  p4GetAdaptiveInsight,
  p5UpdateRelationshipMetrics,
  p5GetRelationshipContext,
  _cleanName,
  _buildOturumIziContext,
  _buildOdakContext,
} from '../js/parts/09a-personalization-engine.js';

function resetPersonalityState() {
  S._personalityMap = {
    communication: {
      style: 'balanced',
      avg_msg_length: 0,
      msg_lengths: [],
      msg_count_by_hour: new Array(24).fill(0),
      preferred_time: 'morning',
      total_words: 0,
      unique_words: 0,
      vocabulary: {},
      question_ratio: 0,
      metaphor_count: 0,
      emoji_usage: false,
    },
    values: [],
    relationships: {},
    defense_mechanisms: [],
    recurring_phrases: {},
    triggers: [],
    soothers: [],
    growth_edges: [],
    self_descriptions: [],      // hidrate state'te DAİMA var (09a personalizationLoad)
    temporal_snapshots: [],
  };
  S._emotionalFlow = [];
}

// ─── Pattern Constants ────────────────────────────────────────────────────────

describe('_METAPHOR_PATTERNS', () => {
  it('is a non-empty array of RegExp', () => {
    expect(Array.isArray(_METAPHOR_PATTERNS)).toBe(true);
    expect(_METAPHOR_PATTERNS.length).toBeGreaterThan(0);
    _METAPHOR_PATTERNS.forEach(p => expect(p).toBeInstanceOf(RegExp));
  });

  it('matches Turkish metaphor expressions', () => {
    const matches = _METAPHOR_PATTERNS.some(r => r.test('sanki içimde bir fırtına var'));
    expect(matches).toBe(true);
  });

  it('matches English metaphor expressions', () => {
    const matches = _METAPHOR_PATTERNS.some(r => r.test('it feels like a void inside'));
    expect(matches).toBe(true);
  });

  it('does not match plain factual text', () => {
    const matches = _METAPHOR_PATTERNS.some(r => r.test('bugün işe gittim'));
    expect(matches).toBe(false);
  });
});

describe('_VALUE_INDICATORS', () => {
  it('has all expected value keys', () => {
    const expectedKeys = ['freedom', 'connection', 'authenticity', 'growth', 'security', 'meaning', 'control', 'love'];
    expectedKeys.forEach(key => {
      expect(_VALUE_INDICATORS).toHaveProperty(key);
      expect(Array.isArray(_VALUE_INDICATORS[key])).toBe(true);
    });
  });

  it('detects freedom value in Turkish', () => {
    const matched = _VALUE_INDICATORS.freedom.some(r => r.test('özgürlük çok önemli benim için'));
    expect(matched).toBe(true);
  });

  it('detects growth value in English', () => {
    const matched = _VALUE_INDICATORS.growth.some(r => r.test('I want to grow and learn'));
    expect(matched).toBe(true);
  });

  it('detects love value', () => {
    const matched = _VALUE_INDICATORS.love.some(r => r.test('sevilmek istiyorum'));
    expect(matched).toBe(true);
  });
});

describe('_RELATIONSHIP_PATTERNS', () => {
  it('has all expected relationship keys', () => {
    ['mother', 'father', 'partner', 'sibling', 'boss', 'friend', 'child', 'therapist']
      .forEach(key => expect(_RELATIONSHIP_PATTERNS).toHaveProperty(key));
  });

  it('matches mother in Turkish', () => {
    const matched = _RELATIONSHIP_PATTERNS.mother.some(r => r.test('annem bugün çok üzdü beni'));
    expect(matched).toBe(true);
  });

  it('matches partner in English', () => {
    const matched = _RELATIONSHIP_PATTERNS.partner.some(r => r.test('my husband does not understand'));
    expect(matched).toBe(true);
  });

  it('matches boss', () => {
    const matched = _RELATIONSHIP_PATTERNS.boss.some(r => r.test('müdürüm beni çok zorluyor'));
    expect(matched).toBe(true);
  });
});

describe('_DEFENSE_PATTERNS', () => {
  it('has all expected defense mechanism keys', () => {
    ['intellectualization', 'minimization', 'projection', 'deflection', 'humor_defense', 'denial']
      .forEach(key => expect(_DEFENSE_PATTERNS).toHaveProperty(key));
  });

  it('detects minimization', () => {
    const matched = _DEFENSE_PATTERNS.minimization.some(r => r.test('o kadar da değil aslında, küçük bir şey'));
    expect(matched).toBe(true);
  });

  it('detects deflection in Turkish', () => {
    const matched = _DEFENSE_PATTERNS.deflection.some(r => r.test('neyse boşver bunu, başka şeyden konuşalım'));
    expect(matched).toBe(true);
  });

  it('detects denial', () => {
    const matched = _DEFENSE_PATTERNS.denial.some(r => r.test('sorun yok, iyiyim ben'));
    expect(matched).toBe(true);
  });

  it('detects denial in English', () => {
    const matched = _DEFENSE_PATTERNS.denial.some(r => r.test("i'm fine, no problem at all"));
    expect(matched).toBe(true);
  });
});

// ─── p1AnalyzePersonality ─────────────────────────────────────────────────────

describe('p1AnalyzePersonality()', () => {
  beforeEach(resetPersonalityState);

  it('does not throw on any input', () => {
    expect(() => p1AnalyzePersonality('test mesajı')).not.toThrow();
    expect(() => p1AnalyzePersonality('')).not.toThrow();
    expect(() => p1AnalyzePersonality('a'.repeat(1000))).not.toThrow();
  });

  it('records message length', () => {
    p1AnalyzePersonality('bu bir test mesajıdır');
    expect(S._personalityMap.communication.msg_lengths.length).toBe(1);
    expect(S._personalityMap.communication.msg_lengths[0]).toBeGreaterThan(0);
  });

  it('updates avg_msg_length after multiple calls', () => {
    p1AnalyzePersonality('kısa');
    p1AnalyzePersonality('bu çok daha uzun bir test mesajıdır ve kelimeleri saymak gerekiyor');
    expect(S._personalityMap.communication.avg_msg_length).toBeGreaterThan(0);
  });

  it('sets style to "direct" for short messages', () => {
    // Feed many short messages
    for (let i = 0; i < 5; i++) p1AnalyzePersonality('ok');
    expect(S._personalityMap.communication.style).toBe('direct');
  });

  it('increments metaphor_count when metaphor detected', () => {
    p1AnalyzePersonality('sanki içimde bir karanlık var');
    expect(S._personalityMap.communication.metaphor_count).toBe(1);
  });

  it('detects emoji usage', () => {
    p1AnalyzePersonality('bugün çok iyiyim 😊');
    expect(S._personalityMap.communication.emoji_usage).toBe(true);
  });

  it('does not set emoji_usage for text without emoji', () => {
    p1AnalyzePersonality('bugün çok iyiyim');
    expect(S._personalityMap.communication.emoji_usage).toBe(false);
  });

  it('updates question_ratio when message contains ?', () => {
    p1AnalyzePersonality('ne yapmalıyım?');
    expect(S._personalityMap.communication.question_ratio).toBeGreaterThan(0);
  });

  it('detects values in text', () => {
    p1AnalyzePersonality('özgürlük benim için çok önemli, bağımsız olmak istiyorum');
    const freedomValue = S._personalityMap.values.find(v => v.value === 'freedom');
    expect(freedomValue).toBeDefined();
    expect(freedomValue.strength).toBeGreaterThan(0);
  });

  it('increments existing value strength on repeated detection', () => {
    p1AnalyzePersonality('özgürlük çok önemli');
    p1AnalyzePersonality('bağımsız olmak istiyorum');
    const freedomValue = S._personalityMap.values.find(v => v.value === 'freedom');
    expect(freedomValue?.strength).toBeGreaterThanOrEqual(2);
  });

  it('detects relationship mention', () => {
    p1AnalyzePersonality('annem bugün beni çok üzdü');
    expect(S._personalityMap.relationships.mother).toBeDefined();
    expect(S._personalityMap.relationships.mother.mention_count).toBe(1);
  });

  it('kanıtsız duyguda (S._emotionalFlow boş) sentiments dizisine uydurulmuş "orta" sayı eklenmez (§6.10, FAZ 12)', () => {
    // resetPersonalityState S._emotionalFlow'u zaten [] bırakır — kanıt yok.
    p1AnalyzePersonality('annem bugün beni çok üzdü');
    expect(S._personalityMap.relationships.mother.sentiments).toEqual([]);
  });

  it('kanıtlı duyguda (S._emotionalFlow dolu) sentiments gerçek ölçümü taşır', () => {
    S._emotionalFlow = [{ intensity: 3 }];
    p1AnalyzePersonality('annem bugün beni çok üzdü');
    expect(S._personalityMap.relationships.mother.sentiments).toEqual([3]);
  });

  it('detects defense mechanism', () => {
    p1AnalyzePersonality('o kadar da değil, küçük bir şey bu');
    const defense = S._personalityMap.defense_mechanisms.find(d => d.type === 'minimization');
    expect(defense).toBeDefined();
  });

  it('keeps msg_lengths capped at 100', () => {
    for (let i = 0; i < 105; i++) {
      p1AnalyzePersonality('test');
    }
    expect(S._personalityMap.communication.msg_lengths.length).toBeLessThanOrEqual(100);
  });

  it('increments total_words', () => {
    p1AnalyzePersonality('bir iki üç dört beş');
    expect(S._personalityMap.communication.total_words).toBeGreaterThan(0);
  });
});

// ─── KATMAN 6 — Yaşam Hafızası ──────────────────────────────────────────────

function resetLifeMemory() {
  S._currentLang = 'tr';
  S._emotionalFlow = [];
  S._lifeMemory = {
    people: {}, openLoops: [], lifeFacts: [], importantDates: [],
    lastCheckinShown: null, lastActiveDate: null
  };
}

describe('p6ExtractPeople', () => {
  beforeEach(resetLifeMemory);

  it('extracts a named person with role from a role cue', () => {
    p6ExtractPeople('eşim Ayşe ile bugün kavga ettik');
    expect(S._lifeMemory.people['ayşe']).toBeDefined();
    expect(S._lifeMemory.people['ayşe'].role).toBe('partner');
    expect(S._lifeMemory.people['ayşe'].name).toBe('Ayşe');
  });

  it('extracts an apostrophe-suffixed proper noun as unknown role', () => {
    p6ExtractPeople("Mehmet'le konuştum bugün");
    expect(S._lifeMemory.people['mehmet']).toBeDefined();
    expect(S._lifeMemory.people['mehmet'].role).toBe('unknown');
  });

  it('does not treat sentence-start stopwords as names', () => {
    p6ExtractPeople('Bugün çok yorgunum ile uğraştım');
    expect(S._lifeMemory.people['bugün']).toBeUndefined();
  });

  it('increments mention_count and upgrades unknown role to a known role', () => {
    p6ExtractPeople("Ayşe'yle gezdik");          // unknown
    p6ExtractPeople('arkadaşım Ayşe çok iyi');   // friend
    expect(S._lifeMemory.people['ayşe'].mention_count).toBe(2);
    expect(S._lifeMemory.people['ayşe'].role).toBe('friend');
  });
});

describe('p6ResolveDueDate', () => {
  it('resolves "yarın" to the next day', () => {
    const base = new Date('2026-05-30T09:00:00');
    const iso = p6ResolveDueDate('yarın sınavım var', base);
    expect(iso.slice(0, 10)).toBe('2026-05-31');
  });

  it('resolves a weekday name to the upcoming occurrence', () => {
    const base = new Date('2026-05-30T09:00:00'); // Cumartesi
    const iso = p6ResolveDueDate('pazartesi görüşmem var', base);
    expect(new Date(iso).getDay()).toBe(1); // Pazartesi
  });

  it('returns null when no temporal marker is present', () => {
    expect(p6ResolveDueDate('bir gün belki gelirim')).toBeNull();
  });
});

// ─── TR-harf regex sınır düzeltmeleri (FAZ 2) ────────────────────────────────
// JS \b ASCII'dir: 'önümüzdeki'/'çarşamba' başı ve 'salı' sonu Türkçe harfte
// sınır üretmiyordu — bu kalıplar ölüydü. TR-sınır grubuyla dirildiler.
describe('p6ResolveDueDate TR sınır düzeltmeleri (FAZ 2)', () => {
  beforeEach(resetLifeMemory);

  it('"önümüzdeki hafta" +7 gün çözer (eski \\b tuzağında ölüydü)', () => {
    const base = new Date('2026-05-30T09:00:00');
    const iso = p6ResolveDueDate('önümüzdeki hafta sınavım var', base);
    expect(iso.slice(0, 10)).toBe('2026-06-06');
  });

  it('_FUTURE_MARKERS "önümüzdeki" işaretleyicisi açık döngü tetikler', () => {
    p6ExtractOpenLoops('önümüzdeki hafta sınavım var');
    expect(S._lifeMemory.openLoops.length).toBe(1);
  });

  it('"salı" gün adı çözülür (sondaki ı sınırı kırıyordu)', () => {
    const base = new Date('2026-05-30T09:00:00'); // Cumartesi
    expect(new Date(p6ResolveDueDate('salı doktora gideceğim', base)).getDay()).toBe(2);
  });

  it('"çarşamba" gün adı çözülür (baştaki ç sınırı kırıyordu)', () => {
    const base = new Date('2026-05-30T09:00:00');
    expect(new Date(p6ResolveDueDate('çarşamba toplantım var', base)).getDay()).toBe(3);
  });

  it('"cumartesi" cuma\'ya YANLIŞ çözülmez (içerme yanlış-pozitifi regresyonu)', () => {
    const base = new Date('2026-05-25T09:00:00'); // Pazartesi
    expect(new Date(p6ResolveDueDate('cumartesi konser var', base)).getDay()).toBe(6);
  });
});

describe('p6ExtractOpenLoops', () => {
  beforeEach(resetLifeMemory);

  it('captures a future event as an open loop', () => {
    p6ExtractOpenLoops('yarın iş görüşmem var çok heyecanlıyım');
    expect(S._lifeMemory.openLoops.length).toBe(1);
    expect(S._lifeMemory.openLoops[0].event).toBe('görüşme');
    expect(S._lifeMemory.openLoops[0].status).toBe('open');
  });

  it('stamps the loop as olcum and keeps the sentence as evidence', () => {
    p6ExtractOpenLoops('yarın iş görüşmem var çok heyecanlıyım');
    const loop = S._lifeMemory.openLoops[0];
    expect(loop.kaynak).toBe('olcum');
    expect(loop.kanit).toBe('yarın iş görüşmem var çok heyecanlıyım');
    expect(loop.text).toBeUndefined(); // eski ad repoda kalmadı
  });

  it('ignores past/non-future event mentions', () => {
    p6ExtractOpenLoops('geçen hafta sınava girdim ve geçtim');
    expect(S._lifeMemory.openLoops.length).toBe(0);
  });

  it('does not duplicate the same event on the same due date', () => {
    p6ExtractOpenLoops('yarın sınavım var');
    p6ExtractOpenLoops('yarın sınavım var gerçekten');
    expect(S._lifeMemory.openLoops.length).toBe(1);
  });
});

describe('p6MarkLoopsFollowedUp', () => {
  beforeEach(resetLifeMemory);

  it('marks an overdue loop as followed when the user returns to the topic', () => {
    S._lifeMemory.openLoops.push({
      id: 'x', kanit: 'yarın sınavım var', kaynak: 'olcum', event: 'sınav', topic: 'work',
      due_date: new Date(Date.now() - 86400000).toISOString(),
      created: new Date().toISOString(), status: 'open', followed_at: null
    });
    p6MarkLoopsFollowedUp('sınav berbat geçti ya');
    expect(S._lifeMemory.openLoops[0].status).toBe('followed');
  });
});

describe('p6ExtractLifeFacts', () => {
  beforeEach(resetLifeMemory);

  it('captures an occupation fact', () => {
    p6ExtractLifeFacts('ben bir öğretmenim ve çok seviyorum işimi');
    const fact = S._lifeMemory.lifeFacts.find(f => f.category === 'occupation');
    expect(fact).toBeDefined();
    expect(fact.value).toContain('öğretmen');
  });

  it('increments n on repeated facts', () => {
    p6ExtractLifeFacts('öğretmenim');
    p6ExtractLifeFacts('öğretmenim ben');
    const fact = S._lifeMemory.lifeFacts.find(f => f.category === 'occupation');
    expect(fact.n).toBeGreaterThanOrEqual(2);
  });

  /* Köken damgası — regex çıkarımı ÖLÇÜMdür ve kanıtı eşleşen kelime değil,
     o kelimenin geçtiği cümledir: kullanıcı panelde kendi cümlesini görür. */
  it('stamps regex-derived facts as olcum with the whole sentence as evidence', () => {
    p6ExtractLifeFacts('ben bir öğretmenim ve çok seviyorum işimi');
    const fact = S._lifeMemory.lifeFacts.find(f => f.category === 'occupation');
    expect(fact.kaynak).toBe('olcum');
    expect(fact.kanit).toBe('ben bir öğretmenim ve çok seviyorum işimi');
  });

  it('keeps existing evidence when a later sighting brings none', () => {
    p6ExtractLifeFacts('ben bir öğretmenim ve çok seviyorum işimi');
    p6UpsertFact('occupation', 'öğretmen', '', 'yorum');
    const fact = S._lifeMemory.lifeFacts.find(f => f.category === 'occupation');
    expect(fact.kanit).toBe('ben bir öğretmenim ve çok seviyorum işimi');
    expect(fact.kaynak).toBe('olcum');
  });

  /* Kanıtın gücü aşağı inmez: LLM'in yorumu uygulamanın ölçümünü ezemez. */
  it('does not let an LLM interpretation overwrite a measured record', () => {
    p6ExtractLifeFacts('ben bir öğretmenim ve çok seviyorum işimi');
    p6UpsertFact('occupation', 'öğretmen', 'modelin gösterdiği başka bir cümle', 'yorum');
    const fact = S._lifeMemory.lifeFacts.find(f => f.category === 'occupation');
    expect(fact.kaynak).toBe('olcum');
    expect(fact.kanit).toBe('ben bir öğretmenim ve çok seviyorum işimi');
  });
});

/* Prompt kapısı (FAZ 4): damgası olmayan kayıt LLM bağlamına GİRMEZ.
   Bu kapı olmadan, model bir kez uydurunca uydurma kendi kendini besler:
   sonraki turda "zaten bilinen" sayılır ve üstüne yeni çıkarım yapılır. */
describe('p6GetLifeMemoryContext — köken kapısı', () => {
  beforeEach(resetLifeMemory);

  it('kanıtlı kaydı bağlama alır', () => {
    S._lifeMemory.lifeFacts = [{ key: 'occupation:öğretmen', category: 'occupation', value: 'öğretmen', n: 1, kaynak: 'olcum', kanit: 'ben bir öğretmenim' }];
    expect(p6GetLifeMemoryContext()).toContain('öğretmen');
  });

  it('damgasız kaydı bağlama ALMAZ', () => {
    S._lifeMemory.lifeFacts = [{ key: 'occupation:pilot', category: 'occupation', value: 'pilot', n: 1 }];
    expect(p6GetLifeMemoryContext()).toBe('');
  });

  it('kaynağı olup kanıtı boş olan kaydı da almaz', () => {
    S._lifeMemory.lifeFacts = [{ key: 'health:depresyon', category: 'health', value: 'depresyon', n: 1, kaynak: 'yorum', kanit: '' }];
    expect(p6GetLifeMemoryContext()).toBe('');
  });

  it('kanıtsız kişiyi ve açık döngüyü de eler', () => {
    S._lifeMemory.people = { ayşe: { name: 'Ayşe', role: 'friend', mention_count: 5, sentiments: [], topics: [], notes: [] } };
    S._lifeMemory.openLoops = [{ id: 'l1', event: 'sınav', status: 'open', due_date: null, created: new Date().toISOString() }];
    expect(p6GetLifeMemoryContext()).toBe('');
  });
});

/* "Model gösterir, uygulama çözer" — tarihin kökeni (2026-08-02).
   Model ISO tarih yazmaz; kullanıcının cümlesindeki ham ifadeyi gösterir. */
describe('p6TarihCoz — mutlak tarih çözücü', () => {
  it('resolves a Turkish month name without a year to a recurring MM-DD', () => {
    expect(p6TarihCoz('12 Mayıs')).toBe('05-12');
    expect(p6TarihCoz('3 Ocak')).toBe('01-03');
  });

  it('keeps the year when the sentence carries one', () => {
    expect(p6TarihCoz('12 Mayıs 1990')).toBe('1990-05-12');
  });

  it('reads English month names in either order', () => {
    expect(p6TarihCoz('May 12')).toBe('05-12');
    expect(p6TarihCoz('12 March 1988')).toBe('1988-03-12');
  });

  it('reads numeric forms, telling ISO order from Turkish order', () => {
    expect(p6TarihCoz('1990-05-12')).toBe('1990-05-12');
    expect(p6TarihCoz('05-12')).toBe('05-12');
    expect(p6TarihCoz('12/05')).toBe('05-12'); // eğik çizgi TR sırası: gün/ay
  });

  it('returns null for anything it cannot resolve — no invented day', () => {
    expect(p6TarihCoz('yakında')).toBeNull();
    expect(p6TarihCoz('gelecek hafta')).toBeNull(); // göreli ifade bir yıldönümü değildir
    expect(p6TarihCoz('Mayıs')).toBeNull();         // gün yok
    expect(p6TarihCoz('32 Mayıs')).toBeNull();
    expect(p6TarihCoz('')).toBeNull();
    expect(p6TarihCoz(null)).toBeNull();
  });
});

/* Geriye dönük temizlik (FAZ 5) — Emre'nin kararı: damgasız kayıt
   kurtarılmaya çalışılmaz, silinir. Bu kayıtların bir kısmı regex'ten
   (gerçek), bir kısmı kapısız LLM emiliminden doğdu ve ikisi AYIRT
   EDİLEMEZ; "muhtemelen doğrudur" diye tutmak tam olarak bu mimarinin
   sildiği şeydir. */
describe('p6KokenTemizlik — damgasız kayıt silinir', () => {
  beforeEach(resetLifeMemory);

  it('kanıtlıyı bırakır, damgasızı siler ve sayar', () => {
    S._lifeMemory.lifeFacts = [
      { value: 'öğretmen', kaynak: 'olcum', kanit: 'ben bir öğretmenim' },
      { value: 'pilot' },
    ];
    S._lifeMemory.openLoops = [{ id: 'l1', event: 'sınav', status: 'open' }];
    S._lifeMemory.importantDates = [{ label: 'doğum günü', date: '05-12', kaynak: 'yorum', kanit: 'doğum günü 12 Mayıs' }];
    S._lifeMemory.people = {
      ayşe: { name: 'Ayşe', mention_count: 2, kaynak: 'olcum', kanit: 'Ayşe ile konuştum' },
      zeynep: { name: 'Zeynep', mention_count: 1 },
    };

    const rapor = p6KokenTemizlik();

    expect(S._lifeMemory.lifeFacts.map(f => f.value)).toEqual(['öğretmen']);
    expect(S._lifeMemory.openLoops.length).toBe(0);
    expect(S._lifeMemory.importantDates.length).toBe(1);
    expect(Object.keys(S._lifeMemory.people)).toEqual(['ayşe']);
    expect(rapor).toEqual({ fact: 1, loop: 1, date: 0, lmKisi: 1 });
  });

  it('silecek bir şey yoksa kalıcılığı hiç tetiklemez', () => {
    S._lifeMemory.lifeFacts = [{ value: 'öğretmen', kaynak: 'olcum', kanit: 'ben bir öğretmenim' }];
    const rapor = p6KokenTemizlik();
    expect(rapor).toEqual({ fact: 0, loop: 0, date: 0, lmKisi: 0 });
    expect(S._lifeMemory.lifeFacts.length).toBe(1);
  });
});

/* Ad göçünün geri-okuma katmanı (§4.3 madde 4): kullanıcının cihazındaki
   sayaç taşınmadan eski ad bırakılmaz — veri kaybı kabul edilemez. */
describe('_p6MigrateFacts — confidence → n geri-okuma', () => {
  it('carries an old confidence value into n', () => {
    const out = _p6MigrateFacts([{ key: 'occupation:öğretmen', value: 'öğretmen', confidence: 4 }]);
    expect(out[0].n).toBe(4);
  });

  it('leaves an already-migrated record untouched', () => {
    const out = _p6MigrateFacts([{ key: 'pet:kedim', value: 'kedim', n: 2, confidence: 9 }]);
    expect(out[0].n).toBe(2);
  });

  it('defaults to a single sighting when neither field exists', () => {
    const out = _p6MigrateFacts([{ key: 'misc:x', value: 'x' }]);
    expect(out[0].n).toBe(1);
  });

  it('survives a missing or malformed list', () => {
    expect(_p6MigrateFacts(null)).toEqual([]);
    expect(_p6MigrateFacts([null])).toEqual([null]);
  });
});

describe('p6GetProactiveCheckin', () => {
  beforeEach(resetLifeMemory);

  it('returns an open-loop check-in for an overdue loop and marks it followed', () => {
    S._lifeMemory.openLoops.push({
      id: 'x', kanit: 'yarın iş görüşmem var', kaynak: 'olcum', event: 'görüşme', topic: 'work',
      due_date: new Date(Date.now() - 3600000).toISOString(),
      created: new Date().toISOString(), status: 'open', followed_at: null
    });
    const msg = p6GetProactiveCheckin();
    expect(msg).toContain('görüşme');
    expect(S._lifeMemory.openLoops[0].status).toBe('followed');
  });

  it('returns a long-silence check-in after 3+ days', () => {
    S._lifeMemory.lastActiveDate = new Date(Date.now() - 5 * 86400000).toISOString();
    const msg = p6GetProactiveCheckin();
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });

  it('only fires once per day', () => {
    S._lifeMemory.lastActiveDate = new Date(Date.now() - 5 * 86400000).toISOString();
    p6GetProactiveCheckin();
    expect(p6GetProactiveCheckin()).toBeNull();
  });
});

describe('p6GetLifeMemoryContext', () => {
  beforeEach(resetLifeMemory);

  it('builds context naming active people (>=2 mentions)', () => {
    S._lifeMemory.people['ayşe'] = {
      name: 'Ayşe', role: 'partner', mention_count: 4, kaynak: 'olcum', kanit: 'Ayşe ile konuştum',
      last_mentioned: new Date().toISOString(), sentiments: [3, 4], topics: [], notes: []
    };
    const ctx = p6GetLifeMemoryContext();
    expect(ctx).toContain('Ayşe');
  });

  it('returns empty string when there is nothing to surface', () => {
    expect(p6GetLifeMemoryContext()).toBe('');
  });

  it('sentiments boşken kişi anılır ama TON iddia edilmez (§6.10, FAZ 12 denetimi)', () => {
    // Köken kapısı (kaynak+kanit) sentiment'e bakmaz: kişinin adı gerçek bir
    // cümlede geçtiği an kapı açılır. Eskiden bu durumda `: 2` fallback'i
    // devreye girer ve 2 >= 3 false'a düşüp modele "sıcak" diye okunurdu —
    // hiçbir ölçüme dayanmayan bir yargı. Artık ton segmenti hiç doğmaz.
    S._lifeMemory.people['ayşe'] = {
      name: 'Ayşe', role: 'partner', mention_count: 4, kaynak: 'olcum', kanit: 'Ayşe ile konuştum',
      last_mentioned: new Date().toISOString(), sentiments: [], topics: [], notes: []
    };
    const ctx = p6GetLifeMemoryContext();
    expect(ctx).toContain('Ayşe');
    expect(ctx).not.toContain('sıcak');
    expect(ctx).not.toContain('gergin');
  });

  it('sentiments doluyken ton GERÇEK ölçümden okunur — kapı susmayı değil kanıtı arar', () => {
    S._lifeMemory.people['ayşe'] = {
      name: 'Ayşe', role: 'partner', mention_count: 4, kaynak: 'olcum', kanit: 'Ayşe ile konuştum',
      last_mentioned: new Date().toISOString(), sentiments: [4, 4], topics: [], notes: []
    };
    expect(p6GetLifeMemoryContext()).toContain('gergin');
  });
});

describe('_cleanName', () => {
  it('strips apostrophe suffixes and punctuation', () => {
    expect(_cleanName("Ayşe'yle")).toBe('Ayşe');
    expect(_cleanName('Mehmet,')).toBe('Mehmet');
  });
});

// ─── p6GetProactiveCheckin kalıcılık (FAZ 1) ─────────────────────────────────
// Render yolundan çağrılan check-in mührü artık personalizationSave ile ANINDA
// kalıcılaşır — sekme kapanışında kaybolup aynı check-in'in tekrar düşmesi biter.
describe('p6GetProactiveCheckin kalıcılık (FAZ 1)', () => {
  const LM_KEY = (uid) => `etw_p_lifememory_${uid}`;

  /** personalizationSave'in dokunduğu TÜM dilimleri iskeletle garanti et. */
  function seedFullPersonalizationState(uid) {
    S.currentUser = { id: uid };
    S._personalityMap = {
      communication: {
        avg_msg_length: 0, msg_lengths: [], style: 'balanced', unique_words: 0,
        total_words: 0, metaphor_count: 0, question_ratio: 0, emoji_usage: 0,
        preferred_time: null, msg_count_by_hour: new Array(24).fill(0),
      },
      triggers: [], soothers: [], values: [], relationships: {},
      defense_mechanisms: [], growth_edges: [], recurring_phrases: {},
      self_descriptions: [], temporal_snapshots: [],
    };
    S._emotionalChain = [];
    S._predictionModel = {};
    S._adaptiveCommunication = {
      effective_approaches: [], ineffective_approaches: [], user_vocabulary: {},
      preferred_metaphors: [], optimal_challenge_level: 0, response_engagement: [],
      explicit_feedback_log: [],
    };
    S._relationshipDepth = { topics_explored: new Set(), milestones: [] };
  }

  beforeEach(resetLifeMemory);
  afterEach(() => { S.currentUser = null; });

  it("due açık döngü mühürlenince kayıt SafeStorage'a iner", () => {
    seedFullPersonalizationState('p6-save-u1');
    S._lifeMemory.openLoops.push({
      id: 'x', kanit: 'yarın iş görüşmem var', kaynak: 'olcum', event: 'görüşme', topic: 'work',
      due_date: new Date(Date.now() - 3600000).toISOString(),
      created: new Date().toISOString(), status: 'open', followed_at: null,
    });
    const msg = p6GetProactiveCheckin();
    expect(msg).toBeTruthy();
    const stored = SafeStorage.get(LM_KEY('p6-save-u1'), null);
    expect(stored?.lastCheckinShown).toBe(S._lifeMemory.lastCheckinShown);
    expect(stored?.openLoops?.[0]?.status).toBe('followed');
  });

  it('önemli gün dalında da kayıt iner', () => {
    seedFullPersonalizationState('p6-save-u2');
    const now = nowTR();
    const mmdd = String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    S._lifeMemory.importantDates.push({ label: 'yıldönümü', date: '2020-' + mmdd, kaynak: 'yorum', kanit: 'yıldönümümüz yaklaşıyor' });
    expect(p6GetProactiveCheckin()).toBeTruthy();
    expect(SafeStorage.get(LM_KEY('p6-save-u2'), null)?.lastCheckinShown).toBeTruthy();
  });

  it('uzun sessizlik dalında da kayıt iner', () => {
    seedFullPersonalizationState('p6-save-u3');
    S._lifeMemory.lastActiveDate = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(p6GetProactiveCheckin()).toBeTruthy();
    expect(SafeStorage.get(LM_KEY('p6-save-u3'), null)?.lastCheckinShown).toBeTruthy();
  });

  it('null dönüşte kayıt YAZILMAZ', () => {
    seedFullPersonalizationState('p6-save-u4');
    expect(p6GetProactiveCheckin()).toBeNull();
    expect(SafeStorage.get(LM_KEY('p6-save-u4'), null)).toBeNull();
  });
});

// ─── Deep-analysis prompt kompozisyonu (FAZ 3 — i18n) ────────────────────────
// Hardcode TR gövde p() anahtarlarına taşındı; TR çıktı bayt bayt korunmalı
// (LLM davranışı değişmesin), EN sözlükte TR kalıbı sızmamalı.
describe('deep-analysis prompt kompozisyonu (FAZ 3 — i18n)', () => {
  /** Statik import zinciri 04'ü mock'tan önce önbelleğe alabiliyor —
   *  09e/09g kalıbı: taze modül + dinamik import mock kaydını garantiler. */
  async function freshDeep() {
    vi.resetModules();
    const { S: fS } = await import('../js/state.js');
    const llm = await import('../js/parts/04-llm-hero-history.js');
    const eng = await import('../js/parts/09a-personalization-engine.js');
    llm.callLLM.mockReset();
    return { fS, mockLLM: llm.callLLM, eng };
  }

  function seedForDeep(S, uid) {
    S.currentUser = { id: uid };
    S.LLM_API_KEY = 'test-key';
    S._userProfile = null;
    S._currentLang = 'tr';
    S.chatHistory = [
      { role: 'user', content: 'ilk mesaj' },
      { role: 'assistant', content: 'cevap' },
      { role: 'user', content: 'ikinci mesaj' },
      { role: 'user', content: 'üçüncü mesaj' },
    ];
    S._personalityMap = {
      communication: {
        avg_msg_length: 0, msg_lengths: [], style: 'balanced', unique_words: 0,
        total_words: 0, metaphor_count: 0, question_ratio: 0, emoji_usage: 0,
        preferred_time: null, msg_count_by_hour: new Array(24).fill(0),
      },
      triggers: [], soothers: [], values: [], relationships: {},
      defense_mechanisms: [], growth_edges: [], recurring_phrases: {},
      self_descriptions: [], temporal_snapshots: [],
    };
    S._emotionalChain = [];
    S._predictionModel = {};
    S._adaptiveCommunication = {
      effective_approaches: [], ineffective_approaches: [], user_vocabulary: {},
      preferred_metaphors: [], optimal_challenge_level: 0, response_engagement: [],
      explicit_feedback_log: [],
    };
    S._relationshipDepth = { topics_explored: new Set(), milestones: [], trust_score: 0, alliance_strength: 50 };
    S._lifeMemory = {
      people: {}, openLoops: [], lifeFacts: [], importantDates: [],
      lastCheckinShown: null, lastActiveDate: null,
    };
    delete window.apGetLastShownHint;
  }

  afterEach(() => { S.currentUser = null; });

  /* Golden string 2026-08-02'de BİLİNÇLİ değişti: kullanıcı mesajları artık
     ham metin olarak değil NUMARALI söz bloğu olarak basılıyor. Aynı liste
     hem analizin girdisi hem kanıtın haritasıdır — model kanıtı yazamaz,
     yalnız `[S3]` diye gösterebilir. Gövdenin geri kalanı korunur. */
  it('TR promptu numaralı söz bloğuyla kurulur (kanıt havuzu = analiz girdisi)', async () => {
    const { fS, mockLLM, eng } = await freshDeep();
    seedForDeep(fS, 'deep-golden-u1');
    mockLLM.mockResolvedValue('{}');
    await eng.personalizationDeepAnalysis();
    expect(mockLLM).toHaveBeenCalledTimes(1);
    const sent = mockLLM.mock.calls[0][0].contents[0].parts[0].text;
    const goldenHead =
      'SEANS ANALİZİ — Kişiselleştirme Motoru Derin Öğrenme\n\n' +
      'KULLANICININ BU SEANSTAKİ CÜMLELERİ (kanıt YALNIZ buradan GÖSTERİLİR — ' +
      'satırın başındaki etiket kanit_ref\'tir, cümleyi yeniden yazma):\n' +
      '[S1] "ilk mesaj"\n[S2] "ikinci mesaj"\n[S3] "üçüncü mesaj"\n\n' +
      'Mevcut profil: {}\n' +
      'İletişim stili: balanced, ort. 0 karakter\n' +
      'Tespit edilen değerler: henüz yok\n' +
      'Savunma mekanizmaları: henüz yok\n' +
      'İlişki derinliği: güven=0, ittifak=50\n' +
      'Önceki öz-tanımlamalar: henüz yok\n\n';
    expect(sent.startsWith(goldenHead)).toBe(true);
    expect(sent).toContain('\n\nMevcut isimler: yok\nMevcut gerçekler: yok\n\n');
    expect(sent.trimEnd().endsWith('Sadece JSON döndür')).toBe(true);
    // Kanıt sözleşmesi prompt'ta yazılı olmalı — kural metni sessizce düşerse
    // model kanit_ref'i hiç doldurmaz ve HER madde kapıda ölür.
    expect(sent).toContain('KANIT YAZILMAZ, GÖSTERİLİR');
    expect(sent).toContain('"kanit_ref"');
    expect(sent).toContain('"tarih_metni"');
  });

  it('3 kullanıcı mesajı altında LLM hiç çağrılmaz', async () => {
    const { fS, mockLLM, eng } = await freshDeep();
    seedForDeep(fS, 'deep-golden-u2');
    fS.chatHistory = [{ role: 'user', content: 'tek mesaj' }];
    await eng.personalizationDeepAnalysis();
    expect(mockLLM).not.toHaveBeenCalled();
  });

  it('EN sözlükte TR kalıbı sızmaz (dict-level parite denetimi)', async () => {
    const { PROMPT_I18N_EN } = await import('../js/parts/16e-i18n-prompt-dict-en.js');
    const ctx = PROMPT_I18N_EN['prompt.personalization.deep_analysis_context'];
    expect(ctx).toBeTruthy();
    expect(ctx.startsWith('SESSION ANALYSIS')).toBe(true);
    expect(ctx).not.toContain('SEANS ANALİZİ');
    expect(PROMPT_I18N_EN['prompt.ritual_work.header']).not.toContain('GEÇİŞ ÇALIŞMASI');
    expect(PROMPT_I18N_EN['prompt.personalization.mirror_context']).toContain('"{{metin}}"');
    // JSON şema alan adları İngilizce kalır — çeviriye taşınmadı
    expect(ctx).not.toContain('mirror_response');
  });
});

// ─── personalizationDeepAnalysis merge dalları (FAZ 5) ───────────────────────
describe('personalizationDeepAnalysis merge dalları (FAZ 5)', () => {
  async function freshDeep() {
    vi.resetModules();
    const { S: fS } = await import('../js/state.js');
    const llm = await import('../js/parts/04-llm-hero-history.js');
    const infra = await import('../js/parts/00a-infrastructure.js');
    const eng = await import('../js/parts/09a-personalization-engine.js');
    llm.callLLM.mockReset();
    return { fS, mockLLM: llm.callLLM, infra, eng };
  }

  function seedForMerge(S, uid) {
    S.currentUser = { id: uid };
    S.LLM_API_KEY = 'test-key';
    S._userProfile = null;
    S._currentLang = 'tr';
    /* Adlar kanıt kapısından geçer (13y): LLM'in çıkardığı ad kullanıcının
       kendi metninde geçmiyorsa yaşam hafızasına yazılmaz. */
    S.chatHistory = [
      { role: 'user', content: 'Ayşe ile bugün uzun uzun konuştum' },
      { role: 'user', content: 'Mehmet akşam aradı, iyi hissettim' },
      { role: 'user', content: 'c' },
    ];
    S._personalityMap = {
      communication: {
        avg_msg_length: 0, msg_lengths: [], style: 'balanced', unique_words: 0,
        total_words: 0, metaphor_count: 0, question_ratio: 0, emoji_usage: 0,
        preferred_time: null, msg_count_by_hour: new Array(24).fill(0),
      },
      triggers: [], soothers: [], values: [], relationships: {},
      defense_mechanisms: [], growth_edges: [], recurring_phrases: {},
      self_descriptions: [], temporal_snapshots: [],
    };
    S._emotionalChain = [];
    S._predictionModel = {};
    S._adaptiveCommunication = {
      effective_approaches: [], ineffective_approaches: [], user_vocabulary: {},
      preferred_metaphors: [], optimal_challenge_level: 0, response_engagement: [],
      explicit_feedback_log: [],
    };
    S._relationshipDepth = { topics_explored: new Set(), milestones: [], trust_score: 0, alliance_strength: 50 };
    S._lifeMemory = {
      people: {}, openLoops: [], lifeFacts: [], importantDates: [],
      lastCheckinShown: null, lastActiveDate: null,
    };
    delete window.apGetLastShownHint;
    delete window.apResolveHypothesis;
  }

  it('triggers/soothers: mevcut topic frequency++ / yeni topic push, cap 20', async () => {
    const { fS, mockLLM, infra, eng } = await freshDeep();
    seedForMerge(fS, 'merge-u1');
    fS._personalityMap.triggers = [{ topic: 'iş', frequency: 1, last_seen: '2020-01-01' }];
    mockLLM.mockResolvedValue(JSON.stringify({ triggers: ['iş', 'para'], soothers: ['müzik'] }));
    await eng.personalizationDeepAnalysis();
    const t = fS._personalityMap.triggers;
    expect(t.find(x => x.topic === 'iş').frequency).toBe(2);
    expect(t.find(x => x.topic === 'para').frequency).toBe(1);
    expect(fS._personalityMap.soothers.find(x => x.topic === 'müzik').frequency).toBe(1);
  });

  it('kullanıcının metninde hiç geçmeyen ad yaşam hafızasına GİRMEZ (13y ad kapısı)', async () => {
    const { fS, mockLLM, eng } = await freshDeep();
    seedForMerge(fS, 'merge-u-ad');
    mockLLM.mockResolvedValue(JSON.stringify({
      people: [{ name: 'Zeynep', role: 'friend', note: 'model uydurdu' }],
    }));
    await eng.personalizationDeepAnalysis();
    expect(fS._lifeMemory.people['zeynep']).toBeUndefined();
  });

  it('people merge: mevcut kişiye role/note zenginleştirme, yeni kişi mention_count=1', async () => {
    const { fS, mockLLM, eng } = await freshDeep();
    seedForMerge(fS, 'merge-u2');
    fS._lifeMemory.people['ayşe'] = { name: 'Ayşe', role: 'unknown', mention_count: 3, last_mentioned: '2020', sentiments: [], topics: [], notes: [] };
    mockLLM.mockResolvedValue(JSON.stringify({
      people: [
        { name: 'Ayşe', role: 'partner', note: 'destekleyici' },
        { name: 'Mehmet', role: 'friend', note: 'yeni tanıştı' },
      ],
    }));
    await eng.personalizationDeepAnalysis();
    expect(fS._lifeMemory.people['ayşe'].role).toBe('partner');
    expect(fS._lifeMemory.people['ayşe'].notes).toContain('destekleyici');
    expect(fS._lifeMemory.people['mehmet'].mention_count).toBe(1);
  });

  it('open_loops dedup: aynı open event tekrar eklenmez; due_hint p6ResolveDueDate\'ten geçer', async () => {
    const { fS, mockLLM, eng } = await freshDeep();
    seedForMerge(fS, 'merge-u3');
    fS._lifeMemory.openLoops = [{ id: 'x1', event: 'sınav', kanit: 'sınav', kaynak: 'olcum', topic: 'work', due_date: null, created: '2020', status: 'open', followed_at: null }];
    mockLLM.mockResolvedValue(JSON.stringify({
      open_loops: [
        { event: 'sınav', due_hint: 'yarın', kanit_ref: 'S1' },
        { event: 'görüşme', due_hint: 'yarın', kanit_ref: 'S2' },
      ],
    }));
    await eng.personalizationDeepAnalysis();
    expect(fS._lifeMemory.openLoops.filter(l => l.event === 'sınav').length).toBe(1); // dedup
    const gorusme = fS._lifeMemory.openLoops.find(l => l.event === 'görüşme');
    expect(gorusme).toBeDefined();
    expect(gorusme.due_date).toBeTruthy(); // "yarın" çözüldü
    // Kanıt modelden değil KAYNAKTAN kesilir: S2 seedForMerge'ün ikinci cümlesi
    expect(gorusme.kanit).toBe('Mehmet akşam aradı, iyi hissettim');
    expect(gorusme.kaynak).toBe('yorum');
  });

  it('kanit_ref\'i olmayan açık döngü HİÇ doğmaz', async () => {
    const { fS, mockLLM, eng } = await freshDeep();
    seedForMerge(fS, 'merge-u3b');
    mockLLM.mockResolvedValue(JSON.stringify({
      open_loops: [{ event: 'ameliyat', due_hint: 'yarın' }], // model kanıt göstermedi
    }));
    await eng.personalizationDeepAnalysis();
    expect(fS._lifeMemory.openLoops.find(l => l.event === 'ameliyat')).toBeUndefined();
  });

  it('life_facts p6UpsertFact\'e, important_dates label-dedup + cap altında birikir', async () => {
    const { fS, mockLLM, eng } = await freshDeep();
    seedForMerge(fS, 'merge-u4');
    fS.chatHistory = [
      { role: 'user', content: 'mühendis olarak çalışıyorum uzun yıllardır' },
      { role: 'user', content: 'annemin doğum günü 12 Mayıs, unutmak istemiyorum' },
      { role: 'user', content: 'bugün hava güzeldi' },
    ];
    fS._lifeMemory.importantDates = [{ label: 'yıldönümü', date: '05-01', kind: 'anniversary', recurring: true, kaynak: 'yorum', kanit: 'x' }];
    mockLLM.mockResolvedValue(JSON.stringify({
      life_facts: [{ category: 'occupation', value: 'mühendis', kanit_ref: 'S1' }],
      important_dates: [
        { label: 'yıldönümü', tarih_metni: '12 Mayıs', kanit_ref: 'S2' },
        { label: 'doğum günü', tarih_metni: '12 Mayıs', kind: 'birthday', kanit_ref: 'S2' },
      ],
    }));
    await eng.personalizationDeepAnalysis();
    const fact = fS._lifeMemory.lifeFacts.find(f => f.category === 'occupation');
    expect(fact).toBeDefined();
    expect(fact.kanit).toBe('mühendis olarak çalışıyorum uzun yıllardır');
    expect(fact.kaynak).toBe('yorum');
    expect(fS._lifeMemory.importantDates.length).toBe(2); // yıldönümü dedup edildi, doğum günü eklendi
    // Tarihi model değil UYGULAMA çözdü: "12 Mayıs" → 05-12 (yıl yok, yinelenen)
    expect(fS._lifeMemory.importantDates.find(d => d.label === 'doğum günü').date).toBe('05-12');
  });

  it('cümlesinde geçmeyen tarihi model uydurduysa önemli gün doğmaz', async () => {
    const { fS, mockLLM, eng } = await freshDeep();
    seedForMerge(fS, 'merge-u4b');
    fS.chatHistory = [
      { role: 'user', content: 'annemin doğum günü yaklaşıyor, ne alsam bilemedim' },
      { role: 'user', content: 'biraz heyecanlıyım açıkçası' },
      { role: 'user', content: 'c' },
    ];
    mockLLM.mockResolvedValue(JSON.stringify({
      important_dates: [{ label: 'annemin doğum günü', tarih_metni: '12 Mayıs', kind: 'birthday', kanit_ref: 'S1' }],
    }));
    await eng.personalizationDeepAnalysis();
    expect(fS._lifeMemory.importantDates.length).toBe(0);
  });

  it('kanıtsız yaşam gerçeği yaşam hafızasına GİRMEZ', async () => {
    const { fS, mockLLM, eng } = await freshDeep();
    seedForMerge(fS, 'merge-u4c');
    mockLLM.mockResolvedValue(JSON.stringify({
      life_facts: [{ category: 'health', value: 'depresyon' }], // kanit_ref yok
    }));
    await eng.personalizationDeepAnalysis();
    expect(fS._lifeMemory.lifeFacts.length).toBe(0);
  });

  it('mirror_response.confirmed=true → apResolveHypothesis("dogrulandi") uçtan uca çağrılır', async () => {
    const { fS, mockLLM, eng } = await freshDeep();
    seedForMerge(fS, 'merge-u5');
    window.apGetLastShownHint = vi.fn(() => ({ id: 'hint-1', metin: 'bir hipotez' }));
    window.apResolveHypothesis = vi.fn(() => true);
    mockLLM.mockResolvedValue(JSON.stringify({ mirror_response: { confirmed: true } }));
    await eng.personalizationDeepAnalysis();
    expect(window.apResolveHypothesis).toHaveBeenCalledWith('hint-1', 'dogrulandi');
  });

  it('mirror_response.confirmed=null (değinmedi) → apResolveHypothesis ÇAĞRILMAZ', async () => {
    const { fS, mockLLM, eng } = await freshDeep();
    seedForMerge(fS, 'merge-u6');
    window.apGetLastShownHint = vi.fn(() => ({ id: 'hint-2', metin: 'bir hipotez' }));
    window.apResolveHypothesis = vi.fn(() => true);
    mockLLM.mockResolvedValue(JSON.stringify({ mirror_response: { confirmed: null } }));
    await eng.personalizationDeepAnalysis();
    expect(window.apResolveHypothesis).not.toHaveBeenCalled();
  });

  it('parse hatasında sessiz warn, state bozulmaz (kırık JSON)', async () => {
    const { fS, mockLLM, eng } = await freshDeep();
    seedForMerge(fS, 'merge-u7');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockLLM.mockResolvedValue('{ bozuk json');
    await expect(eng.personalizationDeepAnalysis()).resolves.toBeUndefined();
    expect(fS._personalityMap.triggers).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('başarıda personalizationSave çağrılır (SafeStorage\'a iner)', async () => {
    const { fS, mockLLM, infra, eng } = await freshDeep();
    seedForMerge(fS, 'merge-u8');
    mockLLM.mockResolvedValue(JSON.stringify({ triggers: ['test-konu'] }));
    await eng.personalizationDeepAnalysis();
    const stored = infra.SafeStorage.get(`etw_p_personality_merge-u8`, null);
    expect(stored?.triggers?.some(t => t.topic === 'test-konu')).toBe(true);
  });
});

// ─── buildPersonalizationPrompt kompozisyonu (FAZ 5) ─────────────────────────
describe('buildPersonalizationPrompt kompozisyonu (FAZ 5)', () => {
  function emptyPersonalityState() {
    S._personalityMap = {
      communication: {
        avg_msg_length: 0, msg_lengths: [], style: 'balanced', unique_words: 0,
        total_words: 0, metaphor_count: 0, question_ratio: 0, emoji_usage: 0,
        preferred_time: null, msg_count_by_hour: new Array(24).fill(0),
      },
      triggers: [], soothers: [], values: [], relationships: {},
      defense_mechanisms: [], growth_edges: [], recurring_phrases: {},
      self_descriptions: [], temporal_snapshots: [],
    };
    S._emotionalChain = [];
    S._predictionModel = { mood_by_day: Array.from({ length: 7 }, () => []), time_patterns: { night: [], morning: [], afternoon: [], evening: [] }, trigger_sequences: [], crisis_indicators: [], good_day_signals: [] };
    S._adaptiveCommunication = { effective_approaches: [], ineffective_approaches: [], user_vocabulary: {}, preferred_metaphors: [], optimal_challenge_level: 0.5, response_engagement: [], last_5_interactions: [] };
    S._relationshipDepth = { topics_explored: new Set(), milestones: [], trust_score: 0, alliance_strength: 50, total_messages: 0 };
    S._lifeMemory = { people: {}, openLoops: [], lifeFacts: [], importantDates: [], lastCheckinShown: null, lastActiveDate: null };
    S._gecisAlani = { cards: [], activeCardId: null };
    S._hayalAlemi = { sahneler: [] };
    S._wandererGame = { davranisKanitlari: [] };
  }

  function deleteAllBridges() {
    ['porGetContext', 'gkGetContext', 'imGetContext', 'oikGetContext', 'ypGetContext', 'ypHasCore',
     'secBeyanId', 'secBeyanVar']
      .forEach(fn => delete window[fn]);
  }

  beforeEach(() => { emptyPersonalityState(); deleteAllBridges(); });
  afterEach(deleteAllBridges);

  it('P1-P6 sinyali yokken hiçbir P1-P6 satırı eklenmez (09b\'nin arketip bağlamı ayrı sistemdir, her zaman aktif kalır)', () => {
    // 09b dfGetPersonTransitionContext her kullanıcıda getSuggestedArchetype
    // (12a) fallback'iyle DAİMA bir hedef-arketip önerisi ekler — bu yüzden
    // prompt asla tam boş olmaz. Test buildPersonalizationPrompt'un KENDİ
    // P1-P6/bridge katkısının, sinyal yokken sıfır olduğunu doğrular.
    const out = buildPersonalizationPrompt('merhaba');
    expect(out).not.toContain('[KİŞİLİK]');
    expect(out).not.toContain('[DEĞERLER]');
    expect(out).not.toContain('[SAVUNMA]');
  });

  it('ilişkinin sentiments\'i boşken GERGİNLİK iddia edilmez (§6.10, FAZ 12 denetimi)', () => {
    // Boş dizide `reduce / length` NaN üretir ve `NaN >= 3` daima false —
    // yani ölçüm yokken modele "○sakin" diye okunurdu. Eksiklik sessizce
    // olumlu bir bulguya çevrilemez: ilişki yalnız anma sayısıyla anılır.
    S._personalityMap.relationships.mother = { mention_count: 3, sentiments: [], contexts: [] };
    const out = buildPersonalizationPrompt('x');
    expect(out).toContain('anne');
    expect(out).not.toContain('○sakin');
    expect(out).not.toContain('⚡yoğun');
  });

  it('ilişkinin sentiments\'i doluyken gerginlik GERÇEK ölçümden okunur', () => {
    S._personalityMap.relationships.mother = { mention_count: 3, sentiments: [4, 4], contexts: [] };
    expect(buildPersonalizationPrompt('x')).toContain('⚡yoğun');
  });

  it('ypHasCore true iken P1 self_desc satırı BASILMAZ', () => {
    S._personalityMap.self_descriptions = ['ben içine kapanık biriyim'];
    window.ypHasCore = () => true;
    window.ypGetContext = () => '\nPORTRE VAR';
    const out = buildPersonalizationPrompt('x');
    expect(out).toContain('PORTRE VAR');
    expect(out).not.toContain('içine kapanık');
  });

  it('ypHasCore false iken P1 self_desc satırı BASILIR', () => {
    S._personalityMap.self_descriptions = ['ben içine kapanık biriyim'];
    window.ypHasCore = () => false;
    const out = buildPersonalizationPrompt('x');
    expect(out).toContain('içine kapanık');
  });

  it('bir köprü fırlatırsa bölüm sessizce atlanır, kalan prompt sağlam kalır', () => {
    window.porGetContext = () => { throw new Error('boom'); };
    S._personalityMap.values = [{ value: 'freedom', strength: 5 }];
    const out = buildPersonalizationPrompt('x');
    expect(out).toContain('freedom');
    expect(out).not.toContain('boom');
  });

  it('değerler top-3 ile sınırlanır (slice cap)', () => {
    S._personalityMap.values = [
      { value: 'freedom', strength: 9 }, { value: 'love', strength: 8 },
      { value: 'growth', strength: 7 }, { value: 'control', strength: 1 },
    ];
    const out = buildPersonalizationPrompt('x');
    expect(out).toContain('freedom');
    expect(out).toContain('love');
    expect(out).toContain('growth');
    expect(out).not.toContain('control(1)');
  });

  /* İç Çalışma 02 · FAZ 5 — kullanıcının susturdukları (09i beyan defteri).
     P1'in üç listesi HER mesajda yeniden hasat edilir: hafıza panelinden
     silinen bir çıkarım, motor konuştukça geri doğardı. Silme artık deftere
     de yazılıyor (09c `_p1Beyan`) ve prompt o defteri okuyor — bu testler
     dönüş yolunun kapalı kaldığını kanıtlar. */
  function beyanKur(susmus) {
    window.secBeyanId = (tur, metin) => {
      const m = String(metin || '').trim().toLocaleLowerCase('tr');
      return m ? `${tur}:${m}` : '';
    };
    window.secBeyanVar = (id) => susmus.includes(id);
  }

  it('susturulan değer prompt\'a bir daha girmez; susturulmayan girer', () => {
    S._personalityMap.values = [
      { value: 'kontrol', strength: 9 },
      { value: 'özgürlük', strength: 8 },
    ];
    beyanKur(['p1-deger:kontrol']);
    const out = buildPersonalizationPrompt('x');
    expect(out).not.toContain('kontrol(9)');
    expect(out).toContain('özgürlük(8)');
  });

  it('tek değer susturulunca DEĞERLER satırı hiç basılmaz (boş liste yazılmaz)', () => {
    S._personalityMap.values = [{ value: 'kontrol', strength: 9 }];
    beyanKur(['p1-deger:kontrol']);
    expect(buildPersonalizationPrompt('x')).not.toContain('kontrol(9)');
  });

  it('öz-tanım ve savunma da aynı defterden süzülür', () => {
    S._personalityMap.self_descriptions = ['ben içine kapanık biriyim'];
    S._personalityMap.defense_mechanisms = [{ type: 'projection', count: 4 }];
    window.ypHasCore = () => false;
    beyanKur(['p1-oztanim:ben içine kapanık biriyim', 'p1-savunma:projection']);
    const out = buildPersonalizationPrompt('x');
    expect(out).not.toContain('içine kapanık');
    expect(out).not.toContain('[SAVUNMA]');
  });

  it('09i yüklü değilse süzme yapılmaz — prompt bugünkü gibi çizilir', () => {
    S._personalityMap.values = [{ value: 'kontrol', strength: 9 }];
    expect(buildPersonalizationPrompt('x')).toContain('kontrol(9)');
  });

  it('defter fırlatırsa madde DÜŞMEZ — susturma şüphesi maddeyi silmez', () => {
    S._personalityMap.values = [{ value: 'kontrol', strength: 9 }];
    window.secBeyanId = () => { throw new Error('defter bozuk'); };
    const out = buildPersonalizationPrompt('x');
    expect(out).toContain('kontrol(9)');
    expect(out).not.toContain('defter bozuk');
  });
});

// ─── Tanıma Motoru — _buildOturumIziContext (FAZ 5, İ7) ──────────────────────
describe('_buildOturumIziContext — "bu oturumda neye bakıldı" (kesin ölçüm)', () => {
  let CARD_A, CARD_B;

  beforeAll(async () => {
    const { deckReady, getFullDeck } = await import('../js/parts/12b-kart-destesi.js');
    await deckReady();
    const deck = getFullDeck();
    CARD_A = deck.find(c => c.id === 'temel-ozsevgi-filiz')?.id || deck[0].id;
    CARD_B = deck.find(c => c.id === 'temel-ozsevgi-kok')?.id || deck[1].id;
  }, 30000);

  afterEach(() => { delete S._oturumIzi; });

  it('S._oturumIzi yokken (auth öncesi) boş döner, patlamaz', () => {
    delete S._oturumIzi;
    expect(() => _buildOturumIziContext()).not.toThrow();
    expect(_buildOturumIziContext()).toBe('');
  });

  it('bir kart tek kez açıldıysa satır YOK (2+ tekrar eşiği)', () => {
    S._oturumIzi = { kartlar: [{ id: CARD_A, ts: Date.now() }], torenler: [] };
    expect(_buildOturumIziContext()).toBe('');
  });

  it('bir kart 2+ kez açıldıysa (tek kart) mühür durumuna göre SÖZ VERDİ/VERMEDİ satırı', () => {
    S._oturumIzi = {
      kartlar: [{ id: CARD_A, ts: 1 }, { id: CARD_A, ts: 2 }, { id: CARD_A, ts: 3 }],
      torenler: [],
    };
    const sessiz = _buildOturumIziContext();
    expect(sessiz).toContain('3');
    expect(sessiz.toLowerCase()).not.toContain('undefined');

    S._oturumIzi.torenler = [{ ad: 'kart-detay', sonuc: 'muhur', ts: 4 }];
    const sozlu = _buildOturumIziContext();
    expect(sozlu).not.toBe(sessiz);   // mühür durumu satırı değiştirir
  });

  it('birden fazla FARKLI kart açıldıysa mühür ithafı YAPILMAZ (belirsiz atıf riski) — yalnız sayar', () => {
    S._oturumIzi = {
      kartlar: [{ id: CARD_A, ts: 1 }, { id: CARD_A, ts: 2 }, { id: CARD_B, ts: 3 }],
      torenler: [{ ad: 'kart-detay', sonuc: 'muhur', ts: 4 }],
    };
    const out = _buildOturumIziContext();
    expect(out).toContain('2');   // en çok açılan (CARD_A) sayımı
  });

  it('kanıtsız/boş kullanıcıda buildPersonalizationPrompt bölümü hiç eklemez', () => {
    delete S._oturumIzi;
    S._personalityMap = {
      communication: { avg_msg_length: 0, msg_lengths: [], style: 'balanced', unique_words: 0, total_words: 0, metaphor_count: 0, question_ratio: 0, emoji_usage: 0, preferred_time: null, msg_count_by_hour: new Array(24).fill(0) },
      triggers: [], soothers: [], values: [], relationships: {}, defense_mechanisms: [], growth_edges: [], recurring_phrases: {}, self_descriptions: [], temporal_snapshots: [],
    };
    S._emotionalChain = [];
    S._predictionModel = { mood_by_day: Array.from({ length: 7 }, () => []), time_patterns: { night: [], morning: [], afternoon: [], evening: [] }, trigger_sequences: [], crisis_indicators: [], good_day_signals: [] };
    S._adaptiveCommunication = { effective_approaches: [], ineffective_approaches: [], user_vocabulary: {}, preferred_metaphors: [], optimal_challenge_level: 0.5, response_engagement: [], last_5_interactions: [] };
    S._relationshipDepth = { topics_explored: new Set(), milestones: [], trust_score: 0, alliance_strength: 50, total_messages: 0 };
    S._lifeMemory = { people: {}, openLoops: [], lifeFacts: [], importantDates: [], lastCheckinShown: null, lastActiveDate: null };
    S._gecisAlani = { cards: [], activeCardId: null };
    S._hayalAlemi = { sahneler: [] };
    S._wandererGame = { davranisKanitlari: [] };
    const out = buildPersonalizationPrompt('x');
    expect(out).not.toContain('BU OTURUMDA');
  });
});

// ─── personalizationAnalyze orkestrasyonu (FAZ 5) ────────────────────────────
describe('personalizationAnalyze orkestrasyonu (FAZ 5)', () => {
  function seedForAnalyze() {
    S.currentUser = { id: 'analyze-u1' };
    S._currentLang = 'tr';
    S._prevAiReply = null;
    S._sessionUserMsgs = [];
    S._personalityMap = {
      communication: {
        avg_msg_length: 0, msg_lengths: [], style: 'balanced', unique_words: 0,
        total_words: 0, metaphor_count: 0, question_ratio: 0, emoji_usage: 0,
        preferred_time: null, msg_count_by_hour: new Array(24).fill(0), vocabulary: {},
      },
      triggers: [], soothers: [], values: [], relationships: {},
      defense_mechanisms: [], growth_edges: [], recurring_phrases: {},
      self_descriptions: [], temporal_snapshots: [],
    };
    S._emotionalFlow = [];
    S._emotionalChain = [];
    S._predictionModel = { mood_by_day: Array.from({ length: 7 }, () => []), time_patterns: { night: [], morning: [], afternoon: [], evening: [] }, trigger_sequences: [], crisis_indicators: [], good_day_signals: [] };
    S._adaptiveCommunication = { effective_approaches: [], ineffective_approaches: [], user_vocabulary: {}, preferred_metaphors: [], optimal_challenge_level: 0.5, response_engagement: [], last_5_interactions: [] };
    S._relationshipDepth = { topics_explored: new Set(), milestones: [], trust_score: 0, alliance_strength: 50, total_messages: 0, longest_streak: 0, consecutive_days: 0, vulnerability_moments: 0, vulnerability_depth: 0, deep_conversations: 0, progress_momentum: 0, first_session_date: null, engagement_trend: 'stable', breakthroughs_count: 0 };
    resetLifeMemory();
    S._worksheetHistory = {};
  }

  it('tek çağrıda tüm katmanlar çalışır (P1 msg_lengths + P6 openLoop + lastActiveDate)', () => {
    seedForAnalyze();
    personalizationAnalyze('yarın önemli bir görüşmem var, çok heyecanlıyım');
    expect(S._personalityMap.communication.msg_lengths.length).toBe(1); // P1
    expect(S._lifeMemory.openLoops.length).toBeGreaterThan(0);          // P6
    expect(S._lifeMemory.lastActiveDate).toBeTruthy();
    expect(S._relationshipDepth.total_messages).toBe(1);                // P5
  });

  it('bir katman fırlarsa mevcut davranış: fonksiyon fırlar, SONRAKİ katmanlar çalışmaz', () => {
    seedForAnalyze();
    S._personalityMap = null; // P1 ilk satırda throw eder
    expect(() => personalizationAnalyze('yarın sınavım var')).toThrow();
    expect(S._lifeMemory.openLoops.length).toBe(0); // P6 (P1'den SONRA) hiç çalışmadı
  });
});

// ─── P2 duygu tespiti — 13D ad göçü (FAZ 2b, 2026-08-29) ─────────────────────
// Repoda iki duygu sözlüğü vardı; taksonomi tek kaynağa (13D) indi ve eski
// etiketler yeni aile adlarına göç etti. 'neutral' hiç var olmamalıydı (§6.10).
describe('p2DetectEmotions() — taksonomi tek kaynak, "neutral" ölür', () => {
  beforeEach(() => { S._currentLang = 'tr'; });

  it('13D\'nin AİLE adını döner, eski etiketi değil', () => {
    const r = p2DetectEmotions('çok üzgünüm bugün');
    expect(Array.isArray(r)).toBe(true);
    expect(r).toContain('keder');
    expect(r).not.toContain('sadness'); // eski ad repoda yaşamıyor
  });

  it('baskın aile başa gelir — içgörü cümlesi en güçlüsünü önce okur', () => {
    const r = p2DetectEmotions('çok kaygılıyım, biraz da üzgünüm');
    expect(r[0]).toBe('kaygi'); // taban 4, kederin 2'sini geçer
  });

  it('gerçekten kanıtsız metinde null döner (["neutral"] DEĞİL)', () => {
    expect(p2DetectEmotions('lorem ipsum xyz')).toBeNull();
  });

  it('null asla .some()/.includes() çağıranı patlatmaz — çağıranlar || [] ile korunur', () => {
    expect(() => (p2DetectEmotions('lorem ipsum xyz') || []).some(() => true)).not.toThrow();
  });
});

// ─── Geri-okuma katmanı (§4.3 madde 4) ───────────────────────────────────────
describe('_p2GocEt() — eski kayıtlar göçte kaybolmaz', () => {
  it('eski etiketler yeni aile adlarına çevrilir', () => {
    expect(_p2GocEt(['sadness', 'shame', 'hope'])).toEqual(['keder', 'utanc_suclu', 'umut']);
  });

  it('shame ve guilt aynı aileye düşer, tekrar etmez', () => {
    expect(_p2GocEt(['shame', 'guilt'])).toEqual(['utanc_suclu']);
  });

  it('"neutral" DÜŞER — kanıtsız bir iddiaydı, karşılığı yokluktur', () => {
    expect(_p2GocEt(['neutral'])).toEqual([]);
    expect(_p2GocEt(['neutral', 'joy'])).toEqual(['sevinc']);
  });

  it('zaten yeni adı taşıyan kayıt dokunulmadan geçer (idempotent)', () => {
    expect(_p2GocEt(['keder', 'umut'])).toEqual(['keder', 'umut']);
  });

  it('high_negative bir aile DEĞİLDİ — kaygıya düşer', () => {
    expect(_p2GocEt(['high_negative'])).toEqual(['kaygi']);
  });
});

// ─── P2 duygusal an kaydı + içgörüler (FAZ 5) ────────────────────────────────
describe('P2 duygusal an kaydı + içgörüler (FAZ 5)', () => {
  beforeEach(() => {
    S._currentLang = 'tr';
    S._emotionalChain = [];
    S._emotionalFlow = [];
    S.currentSessId = 'sess-p2';
  });

  it('yoğunluk düşükse (<3) ve güçlü duygu yoksa an kaydedilmez', () => {
    S._emotionalFlow = [{ intensity: 1 }];
    p2RecordEmotionalMoment('bugün sıradan bir gündü');
    expect(S._emotionalChain.length).toBe(0);
  });

  it('yoğunluk >=3 ise an kaydedilir', () => {
    S._emotionalFlow = [{ intensity: 3 }];
    p2RecordEmotionalMoment('çok üzgünüm bugün');
    expect(S._emotionalChain.length).toBe(1);
  });

  it('p2GetEmotionalChainInsight geçmiş benzer anı bulunca satır üretir', () => {
    // p2FindSimilarEmotionalMoment 3'ten az kayıtta hemen null döner —
    // eşleşen anı ARAMAYA başlaması için zincir en az 3 kayıt gerektirir.
    S.currentSessId = 'sess-today';
    const pastMoment = { date: '2020-01-01T10:00:00.000Z', day_of_week: 1, hour: 10, emotions: ['keder'], intensity: 4, topics: ['work'], relationships: ['boss'], context: 'patronumla tartıştık', session_id: 'sess-old' };
    S._emotionalChain = [
      { ...pastMoment, context: 'alakasız an 1' },
      { ...pastMoment, context: 'alakasız an 2' },
      pastMoment,
    ];
    S._emotionalFlow = [{ intensity: 4 }];
    const insight = p2GetEmotionalChainInsight('patronumla yine tartıştık çok üzgünüm');
    expect(typeof insight).toBe('string');
    expect(insight.length).toBeGreaterThan(0);
  });

  it('p2GetEmotionalCycleInsight 10 altı anıda boş döner', () => {
    S._emotionalChain = [{ day_of_week: 1, intensity: 4 }];
    expect(p2GetEmotionalCycleInsight()).toBe('');
  });

  it('kanıtsız yoğunlukta (S._emotionalFlow boş) ama güçlü duygu tetiklenince an null intensity ile kaydedilir — uydurulmuş "orta" (2) DEĞİL (§6.10, FAZ 12)', () => {
    // S._emotionalFlow beforeEach'te [] — kanıt yok. "sevinc" ailesi
    // (donukluk/utanc_suclu/sevinc/huzur listesinde) intensity'den BAĞIMSIZ
    // significant sayılır — bu yüzden an kaydedilir ama uydurulmuş bir
    // yoğunluk taşımaz.
    p2RecordEmotionalMoment('harika bir haberim var, çok mutluyum');
    expect(S._emotionalChain.length).toBe(1);
    expect(S._emotionalChain[0].intensity).toBeNull();
  });
});

// ─── P3 proaktif tahmin (FAZ 5) ───────────────────────────────────────────────
describe('P3 proaktif tahmin (FAZ 5)', () => {
  beforeEach(() => {
    S._currentLang = 'tr';
    S._emotionalFlow = [];
    S._sessionUserMsgs = [];
    S._predictionModel = { mood_by_day: Array.from({ length: 7 }, () => []), time_patterns: { night: [], morning: [], afternoon: [], evening: [] }, trigger_sequences: [], crisis_indicators: [], good_day_signals: [] };
  });

  it('eşik altı veride (< 3 kayıt) içgörü üretmez', () => {
    expect(p3GetPredictiveInsight()).toBe('');
  });

  it('3+ kriz belirtisi kaydından sonra crisis_warning üretir', () => {
    S._predictionModel.crisis_indicators = [
      { date: new Date().toISOString(), text: 'a' },
      { date: new Date().toISOString(), text: 'b' },
    ];
    const insight = p3GetPredictiveInsight();
    expect(insight).toContain('\n');
    expect(insight.length).toBeGreaterThan(0);
  });

  it('p3RecordPredictionData kriz kelimesini crisis_indicators\'a ekler', () => {
    p3RecordPredictionData('artık dayanamıyorum artık her şey bitsin istiyorum');
    expect(S._predictionModel.crisis_indicators.length).toBe(1);
  });

  it('kanıtsız yoğunlukta (S._emotionalFlow boş) mood_by_day ve time_patterns hiç kayıt almaz (§6.10, FAZ 12)', () => {
    // Eskiden burada sabit `2` fallback'i vardı — kanıtsız bir "orta" sayı
    // gün ortalamasına ve zaman dilimi istatistiğine sessizce karışıyordu.
    p3RecordPredictionData('bugün ne yapsam bilmiyorum');
    expect(S._predictionModel.mood_by_day.every(arr => arr.length === 0)).toBe(true);
    expect(Object.values(S._predictionModel.time_patterns).every(arr => arr.length === 0)).toBe(true);
  });
});

// ─── P4 adaptif iletişim (FAZ 5) ──────────────────────────────────────────────
describe('P4 adaptif iletişim (FAZ 5)', () => {
  beforeEach(() => {
    S._currentLang = 'tr';
    S.currentAIMode = 'direct';
    S._prevAiReply = 'önceki yanıt';
    S._adaptiveCommunication = { effective_approaches: [], ineffective_approaches: [], user_vocabulary: {}, preferred_metaphors: [], optimal_challenge_level: 0.5, response_engagement: [], explicit_feedback_log: [], last_5_interactions: [] };
  });

  it('uzun ve olumlu duygulu yanıt etkili olarak kaydedilir', () => {
    p4AnalyzeEffectiveness('önceki yanıt', 'evet tam bu, çok iyi oldu ve kendimi çok daha iyi hissediyorum şu anda gerçekten'.padEnd(160, ' iyi'));
    expect(S._adaptiveCommunication.effective_approaches.length).toBeGreaterThan(0);
  });

  it('kısa+savunmacı yanıt etkisiz olarak kaydedilir', () => {
    p4AnalyzeEffectiveness('önceki yanıt', 'neyse boşver');
    expect(S._adaptiveCommunication.ineffective_approaches.length).toBeGreaterThan(0);
  });

  it('p4GetAdaptiveInsight yeterli veri olmadan boş döner', () => {
    expect(p4GetAdaptiveInsight()).toBe('');
  });

  it('p4RecordExplicitUIFeedback pozitif geri bildirimi effective_approaches\'a ekler', () => {
    p4RecordExplicitUIFeedback(true, 'harika');
    expect(S._adaptiveCommunication.effective_approaches.length).toBe(1);
    expect(S._adaptiveCommunication.explicit_feedback_log[0].type).toBe('positive');
  });
});

// ─── P5 ilişki derinliği (FAZ 5) ──────────────────────────────────────────────
describe('P5 ilişki derinliği (FAZ 5)', () => {
  beforeEach(() => {
    S._currentLang = 'tr';
    S._emotionalFlow = [];
    S._adaptiveCommunication = { last_5_interactions: [] };
    S._relationshipDepth = {
      total_messages: 0, first_session_date: null, consecutive_days: 0, longest_streak: 0,
      topics_explored: new Set(), trust_score: 0, alliance_strength: 50, vulnerability_moments: 0,
      vulnerability_depth: 0, deep_conversations: 0, progress_momentum: 0, breakthroughs_count: 0,
      milestones: [], engagement_trend: 'stable',
    };
  });

  it('güven artırıcı ifade trust_score\'u yükseltir', () => {
    p5UpdateRelationshipMetrics('sana ilk kez söyleyeceğim, hiç kimse bilmiyor bunu');
    expect(S._relationshipDepth.trust_score).toBeGreaterThan(0);
  });

  it('5 mesaj altında p5GetRelationshipContext boş döner', () => {
    S._relationshipDepth.total_messages = 2;
    expect(p5GetRelationshipContext()).toBe('');
  });

  it('5+ mesajda aşama metni üretir', () => {
    S._relationshipDepth.total_messages = 6;
    const ctx = p5GetRelationshipContext();
    expect(ctx.length).toBeGreaterThan(0);
  });
});

// ─── Süper Odak bağlamı — _buildOdakContext (Derin Çalışma denetimi FAZ 5) ───
/* Kullanıcı "net hedefim bu, zihnim ve kalbim aynı yeri gösteriyor" deyip mührü
   basıyordu ve sohbet bunu hiç bilmiyordu: `S._derinCalisma`'nın 13A dışında
   sıfır okuyucusu vardı. Odak artık bağlama BEYAN olarak girer — ölçüm değil,
   o yüzden hiçbir sayı üretilmez (§6.10). */
describe('_buildOdakContext — Süper Odak bağlama beyan olarak girer', () => {
  afterEach(() => { delete window.dcOdakGet; });

  it('köprü hiç yoksa boş döner, patlamaz (13A yüklenmemiş olabilir)', () => {
    delete window.dcOdakGet;
    expect(() => _buildOdakContext()).not.toThrow();
    expect(_buildOdakContext()).toBe('');
  });

  it('odak kurulmamışsa satır HİÇ girmez — boşluk "hedefi yok" diye okunmasın', () => {
    window.dcOdakGet = () => null;
    expect(_buildOdakContext()).toBe('');
    window.dcOdakGet = () => ({ hedef: '   ', zihin: true, kalp: true });
    expect(_buildOdakContext()).toBe('');
  });

  it('odak varsa kullanıcının kendi cümlesi ve BEYAN etiketi girer', () => {
    window.dcOdakGet = () => ({
      hedef: 'yılın sonuna kadar kendi atölyemi açmak',
      zihin: true, kalp: true, at: '2026-08-17T10:00:00.000Z',
    });
    const ctx = _buildOdakContext();
    expect(ctx).toContain('yılın sonuna kadar kendi atölyemi açmak');
    expect(ctx.toLowerCase()).toContain('beyan');
    expect(ctx.toLowerCase()).not.toContain('undefined');
  });

  it('GERÇEKLİK: uyum yüzdesi / odak gücü gibi bir SAYI üretilmez', () => {
    window.dcOdakGet = () => ({ hedef: 'her sabah yazmak', zihin: true, kalp: true });
    expect(_buildOdakContext()).not.toMatch(/\d/);
  });

  it('köprü patlarsa sessizce düşer (asla bloklama)', () => {
    window.dcOdakGet = () => { throw new Error('13A yüklenmedi'); };
    expect(() => _buildOdakContext()).not.toThrow();
    expect(_buildOdakContext()).toBe('');
  });
});

/* ─── Hasat kapısı: susturulan çıkarım state'e HİÇ girmez ────────────────────
   İç Çalışma 02 · FAZ 5. Prompt süzgeci tek başına yarım bir sözdü: madde
   prompt'a girmese de `S._personalityMap`'e geri düşüyor, yani kullanıcı onu
   hafıza panelinde YENİDEN görüyordu. "Sildim, panelde geri geldi" ile
   "sildim, model hâlâ biliyor" aynı güven kaybının iki yüzü — kapı bu yüzden
   kökте, hasatta duruyor; prompt süzgeci eski state için ikinci kemerdir. */
describe('p1AnalyzePersonality — kullanıcının susturdukları hasat edilmez', () => {
  function beyanKur(susmus) {
    window.secBeyanId = (tur, metin) => {
      const m = String(metin || '').trim().toLocaleLowerCase('tr');
      return m ? `${tur}:${m}` : '';
    };
    window.secBeyanVar = (id) => susmus.includes(id);
  }
  const beyanSil = () => { delete window.secBeyanId; delete window.secBeyanVar; };

  beforeEach(() => { resetPersonalityState(); beyanSil(); });
  afterEach(beyanSil);

  it('susturulan değer yeniden hasat EDİLMEZ; susturulmayan edilir', () => {
    beyanKur(['p1-deger:control']);
    p1AnalyzePersonality('her şeyi kontrol etmek istiyorum ama özgürlük de lazım');
    const adlar = S._personalityMap.values.map(v => v.value);
    expect(adlar).not.toContain('control');
    expect(adlar).toContain('freedom');
  });

  it('susturulan değerin gücü de artmaz — sessiz büyüme yok', () => {
    p1AnalyzePersonality('kontrol bende olsun');
    expect(S._personalityMap.values.find(v => v.value === 'control').strength).toBe(1);
    beyanKur(['p1-deger:control']);
    p1AnalyzePersonality('kontrol bende olsun');
    expect(S._personalityMap.values.find(v => v.value === 'control').strength).toBe(1);
  });

  it('susturulan savunma ve öz-tanım da girmez', () => {
    beyanKur(['p1-savunma:denial', 'p1-oztanim:kaçan biriyim']);
    p1AnalyzePersonality('sorun yok, ben hep kaçan biriyim');
    expect(S._personalityMap.defense_mechanisms.map(d => d.type)).not.toContain('denial');
    expect(S._personalityMap.self_descriptions).not.toContain('kaçan biriyim');
  });

  it('09i yüklü değilse hasat bugünkü gibi çalışır (asla bloklama)', () => {
    p1AnalyzePersonality('özgürlük istiyorum');
    expect(S._personalityMap.values.map(v => v.value)).toContain('freedom');
  });
});
