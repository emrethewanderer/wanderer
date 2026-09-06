import { S } from '../state.js';
import { SUMMARY_MODEL, AI_MODES } from '../config.js';
import { SafeStorage, localISODate } from './00a-infrastructure.js';
import { p, reTest } from './16-i18n-prompts.js';
import { t } from './15-i18n.js';
import { callLLM } from './04-llm-hero-history.js';
import { nowTR, detectTopics } from './00-config-tracking.js';
import { detectBreakthrough } from './09-reports-tracks.js';
import { kokenKirp, kokenIcerir, kokenSozBlok, kokenAlintiCoz, kokenKayitVar } from './13y-koken.js';
import { dgNabiz, dgKarsilamaPuani, dgIklimDefterEkle, dgIklimKaydet } from './13D-duygu-motoru.js';
import {
  dfLoad, dfSave,
  dfAnalyzeDepthSignals, dfAnalyzeFoundationSignals, dfExtractPersonTransition,
  dfExtractHayalVision, dfAnalyzeBeliefs, dfAnalyzeChoices, dfDetectWorksheetOpportunity,
  dfGetAffirmationContext, dfGetDepthContext, dfGetFoundationsContext, dfGetPersonTransitionContext,
} from './09b-depth-foundations.js';
import { getCardById } from './12b-kart-destesi.js'; // Tanıma Motoru (FAZ 5) — oturum izi kart adı için

/* ═══════════════════════════════════════════════════════════════════════
   KİŞİSELLEŞTİRME DEVRİMİ — "EMRE SENİ TANIYOR 2.0"
   ═══════════════════════════════════════════════════════════════════════
   5 KATMAN:
   1. DİNAMİK KİŞİLİK HARİTASI    — Kim olduğunu sürekli öğrenir
   2. DUYGUSAL HAFIZA ZİNCİRİ       — Geçmişi hatırlar ve bağlam kurar
   3. PROAKTİF TAHMİN MOTORU        — Söylemeden anlar
   4. ADAPTİF İLETİŞİM              — Her kullanıcıya farklı konuşur
   5. İLİŞKİ DERİNLİĞİ METRİKLERİ  — Dostluğun seviyesini ölçer
   ═══════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════
   KATMAN 1 — DİNAMİK KİŞİLİK HARİTASI
   Her mesajda kullanıcının iletişim tarzını, tetikleyicilerini,
   değerlerini ve ilişki dinamiklerini öğrenir.
   ═══════════════════════════════════════════════════════════════════════ */

export const _METAPHOR_PATTERNS = [
  /gibi\s+hissediyorum/i, /sanki\s+/i, /adeta\s+/i, /tıpkı\s+/i,
  /bir\s+(?:duvar|deniz|boşluk|karanlık|ışık|ateş|fırtına|deprem)/i,
  /içimde\s+bir/i, /like\s+a/i, /as\s+if/i, /feels?\s+like/i
];

export const _VALUE_INDICATORS = {
  freedom:     [/özgürlük/i, /bağımsız/i, /kendi\s+yolum/i, /freedom/i, /independent/i],
  connection:  [/bağ\s+kurmak/i, /yakınlık/i, /birlikte/i, /connection/i, /together/i],
  authenticity:[/gerçek\s+ben/i, /sahici/i, /maske/i, /authentic/i, /real\s+me/i],
  growth:      [/büyümek/i, /gelişmek/i, /öğrenmek/i, /grow/i, /learn/i, /develop/i],
  security:    [/güvenlik/i, /güvende/i, /istikrar/i, /safe/i, /stable/i, /security/i],
  meaning:     [/anlam/i, /amaç/i, /neden\s+varım/i, /meaning/i, /purpose/i],
  control:     [/kontrol/i, /düzen/i, /planlı/i, /control/i, /order/i],
  love:        [/sevgi/i, /sevilmek/i, /aşk/i, /love/i, /affection/i, /care\s+about/i]
};

export const _RELATIONSHIP_PATTERNS = {
  mother:    [/anne/i, /annem/i, /mother/i, /mom/i, /mama/i],
  father:    [/baba/i, /babam/i, /father/i, /dad/i],
  partner:   [/eşim/i, /sevgilim/i, /partnerim/i, /kocam/i, /karım/i, /partner/i, /wife/i, /husband/i, /boyfriend/i, /girlfriend/i],
  sibling:   [/kardeşim/i, /abim/i, /ablam/i, /sibling/i, /brother/i, /sister/i],
  boss:      [/patronum/i, /müdür/i, /yöneticim/i, /boss/i, /manager/i],
  friend:    [/arkadaşım/i, /dostum/i, /friend/i],
  child:     [/çocuğum/i, /oğlum/i, /kızım/i, /child/i, /son/i, /daughter/i],
  therapist: [/terapist/i, /psikolog/i, /danışman/i, /therapist/i]
};

/* KULLANICININ SUSTURDUKLARI (İç Çalışma 02 · FAZ 5) — 09i beyan defteri.
   P1'in üç listesi (değerler, savunmalar, öz-tanımlar) HER mesajda yeniden
   hasat edilir: kullanıcı hafıza panelinden birini sildiğinde motor onu ertesi
   gün geri koyardı — "sildim ama geri geldi" bir arıza değil, güven kaybıdır.
   Silme artık deftere de yazılıyor (09c `_p1Beyan`) ve defter İKİ yerde okunur:
   hasatta (madde state'e hiç girmesin) ve prompt'ta (eski state'te birikmiş
   olan da geçmesin). Defter yoksa hiçbir şey süzülmez — asla bloklama. */
function _beyanliMi(tur, metin) {
  try {
    const id = window.secBeyanId?.(tur, metin);
    return id ? !!window.secBeyanVar?.(id) : false;
  } catch (_) { return false; }
}

export const _DEFENSE_PATTERNS = {
  intellectualization: [/aslında.*mantıklı/i, /rasyonel/i, /düşününce/i, /objektif/i, /logically/i],
  minimization:        [/o kadar da değil/i, /abartmıyorum/i, /küçük bir şey/i, /not\s+a\s+big\s+deal/i],
  projection:          [/onlar.*yüzünden/i, /o\s+yapmasaydı/i, /herkes\s+öyle/i, /they\s+made\s+me/i],
  deflection:          [/konuyu değiştir/i, /neyse/i, /boşver/i, /anyway/i, /whatever/i, /let's\s+talk\s+about/i],
  humor_defense:       [/haha.*ama/i, /şaka\s+bir\s+yana/i, /gülüyorum\s+ama/i, /lol\s+but/i, /joke\s+aside/i],
  denial:              [/sorun\s+yok/i, /iyiyim/i, /bir\s+şey\s+yok/i, /i'?m\s+fine/i, /no\s+problem/i]
};

export const _SELF_DESC_PATTERNS = [
  /ben\s+(?:bir|hep|aslında|genelde)\s+(.{5,60})/i,
  /kendimi\s+(.{5,60})\s+(?:olarak|gibi)\s+(?:görüyorum|hissediyorum|tanımlıyorum)/i,
  /i\s+(?:am|always|usually)\s+(.{5,40})/i,
  /benim\s+(?:en\s+büyük|temel)\s+(.{5,60})/i
];

export function p1AnalyzePersonality(text) {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const wordCount = words.length;

  // İletişim tarzı
  S._personalityMap.communication.msg_lengths.push(text.length);
  if (S._personalityMap.communication.msg_lengths.length > 100) {
    S._personalityMap.communication.msg_lengths.shift();
  }
  S._personalityMap.communication.avg_msg_length =
    S._personalityMap.communication.msg_lengths.reduce((a, b) => a + b, 0) /
    S._personalityMap.communication.msg_lengths.length;

  // Saat bazlı mesaj dağılımı
  const hour = nowTR().getHours();
  S._personalityMap.communication.msg_count_by_hour[hour]++;
  const maxHour = S._personalityMap.communication.msg_count_by_hour.indexOf(
    Math.max(...S._personalityMap.communication.msg_count_by_hour)
  );
  S._personalityMap.communication.preferred_time =
    maxHour < 6 ? 'night_owl' : maxHour < 12 ? 'morning' : maxHour < 18 ? 'afternoon' : 'evening';

  // Kelime zenginliği
  words.forEach(w => {
    S._personalityMap.communication.vocabulary[w] = (S._personalityMap.communication.vocabulary[w] || 0) + 1;
  });
  S._personalityMap.communication.total_words += wordCount;
  S._personalityMap.communication.unique_words = Object.keys(S._personalityMap.communication.vocabulary).length;

  // 2000 benzersiz kelimeyi aşınca en sık kullanılan 1000'e budanır — sınırsız büyümeyi önler
  if (S._personalityMap.communication.unique_words > 2000) {
    const pruned = Object.entries(S._personalityMap.communication.vocabulary)
      .sort((a, b) => b[1] - a[1]).slice(0, 1000);
    S._personalityMap.communication.vocabulary = Object.fromEntries(pruned);
    S._personalityMap.communication.unique_words = 1000;
  }

  // Soru sorma eğilimi
  const isQuestion = /\?/.test(text);
  const totalMsgs = S._personalityMap.communication.msg_lengths.length;
  if (isQuestion) {
    S._personalityMap.communication.question_ratio =
      (S._personalityMap.communication.question_ratio * (totalMsgs - 1) + 1) / totalMsgs;
  } else {
    S._personalityMap.communication.question_ratio =
      (S._personalityMap.communication.question_ratio * (totalMsgs - 1)) / totalMsgs;
  }

  // Metafor kullanımı
  if (reTest(_METAPHOR_PATTERNS, text)) {
    S._personalityMap.communication.metaphor_count++;
  }

  // Emoji kullanımı
  if (/[\u{1F300}-\u{1FAFF}]/u.test(text)) {
    S._personalityMap.communication.emoji_usage = true;
  }

  // İletişim stili sınıflandırma
  const avgLen = S._personalityMap.communication.avg_msg_length;
  const metaphorRate = S._personalityMap.communication.metaphor_count / Math.max(totalMsgs, 1);
  const questionRate = S._personalityMap.communication.question_ratio;

  if (metaphorRate > 0.15 && avgLen > 80) {
    S._personalityMap.communication.style = 'narrative';
  } else if (questionRate > 0.3) {
    S._personalityMap.communication.style = 'analytical';
  } else if (avgLen < 30) {
    S._personalityMap.communication.style = 'direct';
  } else if (avgLen > 120) {
    S._personalityMap.communication.style = 'emotional';
  } else {
    S._personalityMap.communication.style = 'balanced';
  }

  // Tekrarlayan ifadeler
  const phrases = text.match(/[\wçşğüöıİÇŞĞÜÖ]{3,}\s+[\wçşğüöıİÇŞĞÜÖ]{3,}\s+[\wçşğüöıİÇŞĞÜÖ]{3,}/gi) || [];
  phrases.forEach(phrase => {
    const key = phrase.toLowerCase();
    S._personalityMap.recurring_phrases[key] = (S._personalityMap.recurring_phrases[key] || 0) + 1;
  });

  // Değerler tespiti
  Object.entries(_VALUE_INDICATORS).forEach(([value, patterns]) => {
    if (reTest(patterns, text) && !_beyanliMi('p1-deger', value)) {
      const existing = S._personalityMap.values.find(v => v.value === value);
      if (existing) {
        existing.strength++;
        existing.last_seen = nowTR().toISOString();
      } else {
        S._personalityMap.values.push({
          value, strength: 1,
          evidence: text.slice(0, 80),
          first_seen: nowTR().toISOString(),
          last_seen: nowTR().toISOString()
        });
      }
    }
  });

  // İlişki dinamikleri
  Object.entries(_RELATIONSHIP_PATTERNS).forEach(([rel, patterns]) => {
    if (reTest(patterns, text)) {
      if (!S._personalityMap.relationships[rel]) {
        S._personalityMap.relationships[rel] = {
          mention_count: 0, sentiments: [],
          topics: [], last_mentioned: null
        };
      }
      const entry = S._personalityMap.relationships[rel];
      entry.mention_count++;
      entry.last_mentioned = nowTR().toISOString();

      // Duygu tespiti — kanıtsızsa (null) diziye HİÇ eklenmez (§6.10):
      // uydurulmuş bir "orta" sentiment, kişinin gerçek dağılımını bozar.
      const intensity = _p2CurrentIntensity();
      if (intensity !== null) entry.sentiments.push(intensity);
      if (entry.sentiments.length > 20) entry.sentiments.shift();

      // Konu bağlamı
      const detectedTopics = detectTopics(text);
      detectedTopics.forEach(t => {
        if (!entry.topics.includes(t)) entry.topics.push(t);
      });
    }
  });

  // Savunma mekanizmaları
  Object.entries(_DEFENSE_PATTERNS).forEach(([mechanism, patterns]) => {
    if (reTest(patterns, text) && !_beyanliMi('p1-savunma', mechanism)) {
      const existing = S._personalityMap.defense_mechanisms.find(d => d.type === mechanism);
      if (existing) {
        existing.count++;
        existing.last_seen = nowTR().toISOString();
      } else {
        S._personalityMap.defense_mechanisms.push({
          type: mechanism, count: 1,
          first_seen: nowTR().toISOString(),
          last_seen: nowTR().toISOString()
        });
      }
    }
  });

  // Öz-tanımlama
  _SELF_DESC_PATTERNS.forEach(pattern => {
    const match = text.match(pattern);
    if (match && match[1]) {
      const desc = match[1].trim().slice(0, 80);
      /* Liste state varsayılanında YOK — yalnız personalizationLoad hidrasyonunda
         doğuyor; hidrasyon bitmeden gelen bir mesaj burada patlardı. */
      const ozTanimlar = S._personalityMap.self_descriptions || (S._personalityMap.self_descriptions = []);
      if (!ozTanimlar.includes(desc) && !_beyanliMi('p1-oztanim', desc)) {
        ozTanimlar.push(desc);
        if (ozTanimlar.length > 15) ozTanimlar.shift();
      }
    }
  });
}

/* ═══════════════════════════════════════════════════════════════════════
   KATMAN 2 — DUYGUSAL HAFIZA ZİNCİRİ
   Geçmişi hatırlar: "Geçen hafta annenle konuştuğunda da böyle hissetmiştin"
   Döngüsel pattern'leri gerçek zamanlı yakalar.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── AD GÖÇÜ (FAZ 2b, 2026-08-29) — duygu taksonomisi TEK kaynaktan ──
   Buraya kadar repoda İKİ duygu sözlüğü yaşıyordu: burada 11 etiket
   (`_EMOTION_LABELS`), 13D'de 10 aile. Aynı şeyi iki adla adlandırmak
   "tek ad, tek gerçek"in ihlalidir (§4.3): grep edilen ad ile motorun
   okuduğu ad birbirini tanımaz. Sözlük söküldü; aileler artık yalnız
   13D'de tanımlıdır ve `dp('detect.duygu.*')` ile 16c'den beslenir. */

/** Eski etiket → yeni aile. İki adın karşılığı YOKTUR ve bu bilinçlidir:
 *  · `high_negative` bir aile değil bir KUVVETTİ (yoğunluk >= 4); yeni
 *    taksonomide ailesi kaygıdır, şiddeti `kuvvet` alanında taşınır.
 *  · `neutral` hiç var olmamalıydı — kanıtsız bir iddiaydı (§6.10);
 *    göçte DÜŞER, karşılığı yokluktur. */
export const _P2_ETIKET_GOC = Object.freeze({
  sadness: 'keder',
  loneliness: 'yalnizlik',
  shame: 'utanc_suclu',
  guilt: 'utanc_suclu',
  anger: 'ofke',
  anxiety: 'kaygi',
  high_negative: 'kaygi',
  joy: 'sevinc',
  hope: 'umut',
  relief: 'huzur',
  confusion: 'karisiklik',
  neutral: null,
});

/** Geri-okuma katmanı (§4.3 madde 4) — kullanıcının cihazındaki/hesabındaki
 *  `_emotionalChain` eski adlarla dolu ve o GERÇEK veridir. Hidrasyonda bu
 *  haritadan geçirilir; zaten yeni adı taşıyan kayıtlar dokunulmadan geçer,
 *  karşılığı olmayanlar (neutral) düşer. Taşıma kanıtlanmadan eski ad
 *  silinmez — bu yüzden harita kalıcıdır, tek seferlik bir script değil. */
export function _p2GocEt(emotions) {
  if (!Array.isArray(emotions)) return [];
  const out = [];
  for (const e of emotions) {
    if (typeof e !== 'string') continue;
    const yeni = Object.prototype.hasOwnProperty.call(_P2_ETIKET_GOC, e) ? _P2_ETIKET_GOC[e] : e;
    if (yeni && !out.includes(yeni)) out.push(yeni);
  }
  return out;
}

/** Bu turun kayıtlı yoğunluğu — kanıtsızsa `null` (§6.10, FAZ 12 gerçeklik
 *  kapısı turu, 2026-08-29). `S._emotionalFlow` FAZ 2'den beri yalnız
 *  KANITLI turları taşır (13D sözleşme göçü); dizi boşsa "henüz hiçbir
 *  turda kanıt yok" demektir, "nötr" değil. Burada eskiden sabit `2`
 *  fallback'i vardı ve uydurulmuş bir orta-yoğunluk sayısı sentiment
 *  dizilerine, gün bazlı ortalamalara ve tahmin modeline sessizce
 *  karışıyordu — plan bunu "Bilinen kalıntı" olarak FAZ 12'ye bağlamıştı.
 *  Çağıranlar `>=` karşılaştırmalarına DOKUNMAZ (null>=N zaten false'a
 *  coerce olur, davranış korunur); biriktirme noktalarında (push/toplam)
 *  null'ı AÇIKÇA atlar — kanıtsız veri istatistiğe girmez. */
function _p2CurrentIntensity() {
  return S._emotionalFlow.length ? S._emotionalFlow[S._emotionalFlow.length - 1].intensity : null;
}

export function p2DetectEmotions(text) {
  /* TEK KAYNAK 13D (FAZ 2b). Kanıt yoksa `null` — çağıranlar `|| []` ile
     hazır (§6.10). Baskın aile başa alınır: `p2GetEmotionalChainInsight`
     etiketleri sırayla cümleye diziyor, en güçlüsü önce okunmalı. */
  const nabiz = dgNabiz(text);
  if (!nabiz || !Array.isArray(nabiz.adaylar) || !nabiz.adaylar.length) return null;
  return nabiz.adaylar.slice().sort((a, b) => b.guc - a.guc).map(a => a.aile);
}

export function p2RecordEmotionalMoment(text) {
  const emotions = p2DetectEmotions(text) || []; // kanıt yoksa null (§6.10)
  const topics = detectTopics(text);
  const relationships = [];
  Object.entries(_RELATIONSHIP_PATTERNS).forEach(([rel, patterns]) => {
    if (reTest(patterns, text)) relationships.push(rel);
  });

  const intensity = _p2CurrentIntensity();

  // Sadece önemli anları kaydet (yoğunluk >= 3 veya güçlü duygu)
  const isSignificant = intensity >= 3 ||
    /* Hatırlanmaya değer anlar (FAZ 2b ad göçü). `donukluk` listeye
       EKLENDİ: umutsuzluk tam da hatırlanması gereken andır ve eski
       taksonomide karşılığı yoktu — göç bir kaybı da kapatıyor. */
    emotions.some(e => ['utanc_suclu', 'sevinc', 'huzur', 'donukluk'].includes(e));

  if (!isSignificant) return;

  const moment = {
    date: nowTR().toISOString(),
    day_of_week: nowTR().getDay(),
    hour: nowTR().getHours(),
    emotions,
    intensity,
    topics,
    relationships,
    context: text.slice(0, 120),
    session_id: S.currentSessId
  };

  S._emotionalChain.push(moment);
  if (S._emotionalChain.length > 200) S._emotionalChain.shift();

  // Epizodik Hafıza (09f) — yalnız GERÇEKTEN yüksek yoğunluklu anlar embed
  // edilir (günde ≤10 tavan 09f'de); sıradan "significant" eşiği (>=3) burada
  // yeterli değil, anlamsal hafıza yalnız en keskin anları taşımalı.
  if (intensity >= 4) {
    try { Promise.resolve(window.ehIngestMoment?.(text, { intensity, emotions, topics })).catch(() => {}); } catch (_) {}
  }
}

export function p2FindSimilarEmotionalMoment(text) {
  if (S._emotionalChain.length < 3) return null;

  const currentEmotions = p2DetectEmotions(text) || []; // null'a hazır (§6.10) — .includes güvenli
  const currentTopics = detectTopics(text);
  const currentRelationships = [];
  Object.entries(_RELATIONSHIP_PATTERNS).forEach(([rel, patterns]) => {
    if (reTest(patterns, text)) currentRelationships.push(rel);
  });

  // Bugünden ESKİ anları ara (aynı seans değil)
  const pastMoments = S._emotionalChain.filter(m => m.session_id !== S.currentSessId);
  if (!pastMoments.length) return null;

  let bestMatch = null;
  let bestScore = 0;

  pastMoments.forEach(moment => {
    let score = 0;
    // Duygu eşleşmesi (+3)
    const emotionOverlap = moment.emotions.filter(e => currentEmotions.includes(e)).length;
    score += emotionOverlap * 3;
    // Konu eşleşmesi (+2)
    const topicOverlap = moment.topics.filter(t => currentTopics.includes(t)).length;
    score += topicOverlap * 2;
    // İlişki eşleşmesi (+4)
    const relOverlap = moment.relationships.filter(r => currentRelationships.includes(r)).length;
    score += relOverlap * 4;
    // Yoğunluk benzerliği (+1) — ikisi de kanıtlıysa (§6.10: null'lu bir
    // fark 0'a coerce olup kanıtsız bir "benzerlik" iddia ederdi)
    const currentIntensity = _p2CurrentIntensity();
    if (moment.intensity != null && currentIntensity != null && Math.abs(moment.intensity - currentIntensity) <= 1) score += 1;

    if (score > bestScore && score >= 4) {
      bestScore = score;
      bestMatch = moment;
    }
  });

  return bestMatch;
}

export function p2GetEmotionalChainInsight(text) {
  const match = p2FindSimilarEmotionalMoment(text);
  if (!match) return '';

  const dateStr = new Date(match.date).toLocaleDateString(
    (typeof S._currentLang !== 'undefined' ? S._currentLang : 'tr'),
    { day: 'numeric', month: 'long' }
  );

  const emotionLabel = match.emotions.map(e => p('prompt.p2.emotion.' + e)).join(p('prompt.p2.and_joiner'));

  const relLabel = match.relationships.map(r => p('prompt.p2.rel.' + r)).join(p('prompt.p2.and_joiner'));

  return p('prompt.p2.chain_insight', {
    dateStr,
    emotionLabel,
    relLabel,
    context: match.context.slice(0, 60)
  });
}

export function _p2DayName(dayIndex) {
  const lang = (typeof S._currentLang !== 'undefined' ? S._currentLang : 'tr');
  const ref = new Date(2024, 0, 7 + dayIndex); // 7 Ocak 2024 = Pazar
  const locale = lang === 'tr' ? 'tr-TR' : 'en-US';
  return ref.toLocaleDateString(locale, { weekday: 'long' });
}

export function p2GetEmotionalCycleInsight() {
  if (S._emotionalChain.length < 10) return '';

  const dayEmotions = {};
  S._emotionalChain.forEach(m => {
    if (m.intensity == null) return; // kanıtsız kayıt ortalamaya girmez (§6.10)
    const day = m.day_of_week;
    if (!dayEmotions[day]) dayEmotions[day] = [];
    dayEmotions[day].push(m.intensity);
  });

  let worstDay = null, worstAvg = 0;

  Object.entries(dayEmotions).forEach(([day, intensities]) => {
    if (intensities.length < 2) return;
    const avg = intensities.reduce((a, b) => a + b, 0) / intensities.length;
    if (avg > worstAvg) { worstAvg = avg; worstDay = parseInt(day); }
  });

  if (worstDay !== null && worstAvg >= 3.5) {
    return p('prompt.p2.cycle_insight', { dayName: _p2DayName(worstDay), avg: worstAvg.toFixed(1) });
  }
  return '';
}

/* ═══════════════════════════════════════════════════════════════════════
   KATMAN 3 — PROAKTİF TAHMİN MOTORU
   Kullanıcının bugünkü ruh halini tahmin eder.
   Kriz erken uyarı sistemi.
   ═══════════════════════════════════════════════════════════════════════ */

export function p3RecordPredictionData(text) {
  const now = nowTR();
  const day = now.getDay();
  const hour = now.getHours();
  const timeSlot = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  const intensity = _p2CurrentIntensity();
  const emotions = p2DetectEmotions(text) || []; // null'a hazır (§6.10)

  // Gün bazlı mood kaydı — kanıtsızsa (null) HİÇ eklenmez: aksi hâlde
  // uydurulmuş bir "orta" sayı gün ortalamasına (avgMood) karışır (§6.10).
  if (intensity != null) {
    S._predictionModel.mood_by_day[day].push(intensity);
    if (S._predictionModel.mood_by_day[day].length > 30) {
      S._predictionModel.mood_by_day[day].shift();
    }

    // Zaman dilimi kaydı — aynı kanıt şartı (avgIntensity onu topluyor)
    S._predictionModel.time_patterns[timeSlot].push({
      intensity, emotions, date: now.toISOString()
    });
    if (S._predictionModel.time_patterns[timeSlot].length > 50) {
      S._predictionModel.time_patterns[timeSlot].shift();
    }
  }

  // Tetikleyici sekans tespiti: önceki mesajdaki konu → şu anki yoğun duygu
  if (intensity >= 4 && S._sessionUserMsgs.length >= 2) {
    const prevText = S._sessionUserMsgs[S._sessionUserMsgs.length - 2];
    const prevTopics = detectTopics(prevText);
    if (prevTopics.length) {
      S._predictionModel.trigger_sequences.push({
        antecedent: prevTopics[0],
        consequent: emotions[0] || 'high_intensity',
        date: now.toISOString()
      });
      if (S._predictionModel.trigger_sequences.length > 50) {
        S._predictionModel.trigger_sequences.shift();
      }
    }
  }

  // Kriz indikatörleri
  const crisisWords = [
    /yaşamak\s+istemiyorum/i, /her\s+şey\s+bitsin/i, /dayanamıyorum\s+artık/i,
    /çıkış\s+yok/i, /umudum\s+kalmadı/i, /don'?t\s+want\s+to\s+live/i,
    /can'?t\s+go\s+on/i, /no\s+way\s+out/i, /give\s+up/i
  ];
  if (reTest(crisisWords, text)) {
    S._predictionModel.crisis_indicators.push({
      date: now.toISOString(), text: text.slice(0, 100)
    });
  }

  // İyi gün sinyalleri
  const positiveWords = [
    /güzel\s+bir\s+gün/i, /bugün\s+iyi/i, /mutluyum/i, /başardım/i,
    /gurur\s+duyuyorum/i, /teşekkür/i, /good\s+day/i, /i\s+did\s+it/i, /proud/i
  ];
  if (reTest(positiveWords, text)) {
    S._predictionModel.good_day_signals.push({
      date: now.toISOString(), day, timeSlot
    });
    if (S._predictionModel.good_day_signals.length > 30) {
      S._predictionModel.good_day_signals.shift();
    }
  }
}

export function p3GetPredictiveInsight() {
  const now = nowTR();
  const day = now.getDay();
  const hour = now.getHours();
  const timeSlot = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';

  const insights = [];

  const dayMoods = S._predictionModel.mood_by_day[day];
  if (dayMoods.length >= 3) {
    const avgMood = dayMoods.reduce((a, b) => a + b, 0) / dayMoods.length;
    if (avgMood >= 3.5) {
      insights.push(p('prompt.p3.day_intense', { dayName: _p2DayName(day), avg: avgMood.toFixed(1) }));
    } else if (avgMood <= 1.5) {
      insights.push(p('prompt.p3.day_positive', { dayName: _p2DayName(day) }));
    }
  }

  const slotData = S._predictionModel.time_patterns[timeSlot];
  if (slotData.length >= 3) {
    const avgIntensity = slotData.reduce((a, b) => a + b.intensity, 0) / slotData.length;
    if (avgIntensity >= 3.5) {
      insights.push(p('prompt.p3.slot_intense', { slot: p('prompt.p3.slot.' + timeSlot) }));
    }
  }

  if (S._predictionModel.trigger_sequences.length >= 3) {
    const seqCounts = {};
    S._predictionModel.trigger_sequences.forEach(s => {
      const key = s.antecedent;
      seqCounts[key] = (seqCounts[key] || 0) + 1;
    });
    const topTrigger = Object.entries(seqCounts).sort((a, b) => b[1] - a[1])[0];
    if (topTrigger && topTrigger[1] >= 2) {
      insights.push(p('prompt.p3.trigger_warning', { topic: topTrigger[0], count: topTrigger[1] }));
    }
  }

  const recentCrisis = S._predictionModel.crisis_indicators.filter(c => {
    return Date.now() - new Date(c.date).getTime() < 14 * 86400000;
  });
  if (recentCrisis.length >= 2) {
    insights.push(p('prompt.p3.crisis_warning', { count: recentCrisis.length }));
  }

  return insights.length ? '\n' + insights.join('\n') : '';
}

export function p3GetProactiveGreeting() {
  const now = nowTR();
  const day = now.getDay();
  const dayName = _p2DayName(day);

  const dayMoods = S._predictionModel.mood_by_day[day];
  if (dayMoods.length >= 3) {
    const avgMood = dayMoods.reduce((a, b) => a + b, 0) / dayMoods.length;
    if (avgMood >= 3.8) {
      return p('prompt.p3.greeting_hard_day', { dayName });
    }
  }

  const recentGood = S._predictionModel.good_day_signals.filter(s => s.day === day).length;
  if (recentGood >= 2) {
    return p('prompt.p3.greeting_good_day', { dayName });
  }

  return null;
}

/* ═══════════════════════════════════════════════════════════════════════
   KATMAN 4 — ADAPTİF İLETİŞİM
   Hangi yaklaşımın işe yaradığını öğrenir.
   Kullanıcının dilini konuşmaya başlar.
   ═══════════════════════════════════════════════════════════════════════ */

export function p4RecordInteraction(aiMode, aiReply) {
  S._adaptiveCommunication.last_5_interactions.push({
    mode: aiMode,
    reply_length: aiReply.length,
    timestamp: Date.now()
  });
  if (S._adaptiveCommunication.last_5_interactions.length > 5) {
    S._adaptiveCommunication.last_5_interactions.shift();
  }
}

export const _EXPLICIT_FEEDBACK_NEGATIVE = [
  /bu\s+işe\s+yaramadı/i, /anlamadın/i, /hayır\s+öyle\s+değil/i, /başka\s+(bir\s+)?şey\s+dene/i,
  /saçmalama/i, /alakası\s+yok/i, /yanlış\s+anladın/i, /bunu\s+demek\s+istemedim/i,
  /hiç\s+yardımcı\s+olmadı/i, /öyle\s+deme/i, /böyle\s+olmuyor/i,
  /this\s+didn'?t\s+(help|work)/i, /you\s+don'?t\s+understand/i, /try\s+something\s+else/i,
  /that'?s\s+not\s+what\s+I\s+meant/i, /not\s+helpful/i, /wrong/i, /miss(ed|ing)\s+the\s+point/i
];

export const _EXPLICIT_FEEDBACK_POSITIVE = [
  /evet\s+tam\s+(bu|öyle)/i, /çok\s+iyi\s+oldu/i, /devam\s+et\s+böyle/i,
  /bunu\s+duymam\s+gerekiyordu/i, /tam\s+isabet/i, /haklısın/i,
  /aynen\s+öyle/i, /çok\s+doğru/i, /iyi\s+geldi/i, /tam\s+da\s+bunu/i,
  /exactly/i, /that\s+helped/i, /keep\s+going/i, /spot\s+on/i,
  /that'?s\s+(exactly|precisely)/i, /well\s+said/i, /needed\s+(to\s+hear\s+)?this/i
];

export function p4DetectExplicitFeedback(userText) {
  if (reTest(_EXPLICIT_FEEDBACK_NEGATIVE, userText)) return -5;
  if (reTest(_EXPLICIT_FEEDBACK_POSITIVE, userText)) return +5;
  return 0;
}

export function p4RecordExplicitUIFeedback(isPositive, comment) {
  const score = isPositive ? 5 : -5;
  const entry = {
    mode: S.currentAIMode,
    score,
    context: (S._prevAiReply || '').slice(0, 60),
    response: (comment || '').slice(0, 60),
    date: nowTR().toISOString()
  };

  if (isPositive) {
    S._adaptiveCommunication.effective_approaches.push(entry);
    if (S._adaptiveCommunication.effective_approaches.length > 30)
      S._adaptiveCommunication.effective_approaches.shift();
  } else {
    S._adaptiveCommunication.ineffective_approaches.push(entry);
    if (S._adaptiveCommunication.ineffective_approaches.length > 30)
      S._adaptiveCommunication.ineffective_approaches.shift();
  }

  S._adaptiveCommunication.explicit_feedback_log.push({
    date: nowTR().toISOString(),
    type: isPositive ? 'positive' : 'negative',
    context: (S._prevAiReply || '').slice(0, 80),
    mode: S.currentAIMode
  });
  if (S._adaptiveCommunication.explicit_feedback_log.length > 30)
    S._adaptiveCommunication.explicit_feedback_log.shift();

  if (S.currentAIMode === AI_MODES.DIRECT) {
    /* Ölçüm İLK geri bildirimle doğar (null → sayı). Nötr taban 0.5'tir:
       ilk kanıt bir yön verir, ama yokluk bir yön DEĞİLDİR — bu yüzden
       varsayılan null'dur, 0.5 yalnız ölçüm başlarken kullanılır. */
    const _cl = S._adaptiveCommunication.optimal_challenge_level ?? 0.5;
    S._adaptiveCommunication.optimal_challenge_level = isPositive
      ? Math.min(1, _cl + 0.08)
      : Math.max(0, _cl - 0.08);
  }
}

export function p4AnalyzeEffectiveness(aiReply, nextUserMsg) {
  if (!aiReply || !nextUserMsg) return;

  const prevMode = S.currentAIMode;
  const nextLength = nextUserMsg.length;
  const nextEmotions = p2DetectEmotions(nextUserMsg) || []; // null'a hazır (§6.10) — .some güvenli

  // Açık geri bildirim kontrolü — implicit skora eklenir
  const explicitScore = p4DetectExplicitFeedback(nextUserMsg);
  if (explicitScore !== 0) {
    S._adaptiveCommunication.explicit_feedback_log.push({
      date: nowTR().toISOString(),
      type: explicitScore > 0 ? 'positive' : 'negative',
      context: aiReply.slice(0, 80),
      mode: prevMode
    });
    if (S._adaptiveCommunication.explicit_feedback_log.length > 30)
      S._adaptiveCommunication.explicit_feedback_log.shift();
  }

  // Etkililik skoru: kullanıcı daha uzun ve derin yanıt verdiyse iyi
  let score = explicitScore;
  if (nextLength > 50) score += 2;
  if (nextLength > 150) score += 2;
  if (nextEmotions.some(e => ['sevinc', 'huzur', 'umut'].includes(e))) score += 3;
  if (nextEmotions.some(e => e !== 'karisiklik')) score += 1;
  // Kullanıcı kısa ve savunmacı yanıt verdiyse kötü
  if (nextLength < 20) score -= 2;
  if (reTest(_DEFENSE_PATTERNS.deflection, nextUserMsg)) score -= 3;
  if (reTest(_DEFENSE_PATTERNS.denial, nextUserMsg)) score -= 2;

  const entry = {
    mode: prevMode,
    score,
    context: aiReply.slice(0, 60),
    response: nextUserMsg.slice(0, 60),
    date: nowTR().toISOString()
  };

  if (score >= 3) {
    S._adaptiveCommunication.effective_approaches.push(entry);
    if (S._adaptiveCommunication.effective_approaches.length > 30) {
      S._adaptiveCommunication.effective_approaches.shift();
    }
  } else if (score <= -2) {
    S._adaptiveCommunication.ineffective_approaches.push(entry);
    if (S._adaptiveCommunication.ineffective_approaches.length > 30) {
      S._adaptiveCommunication.ineffective_approaches.shift();
    }
  }

  // Optimal challenge level güncelleme
  if (prevMode === AI_MODES.DIRECT) {
    const _cl = S._adaptiveCommunication.optimal_challenge_level ?? 0.5; // ölçüm ilk kanıtla doğar
    if (score >= 3) {
      S._adaptiveCommunication.optimal_challenge_level = Math.min(1, _cl + 0.05);
    } else if (score <= -2) {
      S._adaptiveCommunication.optimal_challenge_level = Math.max(0, _cl - 0.05);
    }
  }

  // Kullanıcının sık kullandığı kelimeleri öğren
  const words = nextUserMsg.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  words.forEach(w => {
    S._adaptiveCommunication.user_vocabulary[w] = (S._adaptiveCommunication.user_vocabulary[w] || 0) + 1;
  });

  // Metafor rezonansı: AI metafor kullandıysa ve kullanıcı olumlu yanıt verdiyse
  if (reTest(_METAPHOR_PATTERNS, aiReply) && score >= 3) {
    const metaphor = aiReply.match(/gibi|sanki|adeta|tıpkı|like\s+a|as\s+if/i);
    if (metaphor) {
      const context = aiReply.slice(
        Math.max(0, metaphor.index - 20),
        Math.min(aiReply.length, metaphor.index + 50)
      );
      S._adaptiveCommunication.preferred_metaphors.push(context.trim());
      if (S._adaptiveCommunication.preferred_metaphors.length > 10) {
        S._adaptiveCommunication.preferred_metaphors.shift();
      }
    }
  }

  /* ÖĞRENME DEFTERİ (13D, FAZ 10) — "bu kişide ne tuttu". Yeni bir etkililik
     motoru DEĞİL: bu fonksiyon zaten "önceki yanıt işe yaradı mı" sorusunu
     ölçüyor; karşılama boyutu onun yanına biner.
     Kanıt kapısı üç katlı — biri bile eksikse HİÇBİR ŞEY yazılmaz (§6.10):
     (1) önceki karşılama mühürlenmiş olmalı, (2) bu mesajın nabzı ölçülebilmeli,
     (3) puan hesaplanabilmeli (`dgKarsilamaPuani` kriz turunda ve kanıtsızlıkta
     `null` döner). Uydurulmuş bir 0 yazmak `n`'i şişirir ve FAZ 4'ün eşiklerini
     sahte biçimde ilerletirdi — riskli ekseni (diriltme) hak etmeden açardı. */
  try {
    const _prev = S._prevDgKarsilama;
    /* AYNI ÖLÇEK ŞART (çapraz denetim, 2026-08-29). Mühürlenen önceki
       kuvvet `trackEmotionalFlow` yolundan gelir ve orada İklim geçilir
       (00-config-tracking:52) — yani taban olgunsa (n>=20) kuvvet
       GÖRELİDİR (K4). Buradaki çağrı İklim'siz yapılırsa MUTLAK kuvvet
       üretir ve iki farklı ölçek çıkarılır: aynı cümle için 0..4 ölçeğinde
       2 puanlık sahte bir fark. `dKuvvet`'in işareti gerçek değişimle
       ilgisiz hâle gelir — özellikle yatıştırma ve diriltmede, yani tam da
       K6'nın "riskli eksen kazanılan bir izindir" dediği yerde. Üstelik
       yalnız İklim'i OLGUN kullanıcıda tetiklenir: en güvenilir olması
       gereken popülasyonda. */
    const _simdi = dgNabiz(nextUserMsg, { iklim: S._dgIklim || null });
    if (_prev && _simdi && S._dgIklim) {
      const _puan = dgKarsilamaPuani(_prev.eksen, _prev, _simdi, explicitScore);
      if (typeof _puan === 'number') {
        S._dgIklim = dgIklimDefterEkle(S._dgIklim, _prev.eksen, _puan);
        dgIklimKaydet(S._dgIklim);
      }
    }
  } catch (e) { console.warn('dgIklimDefterEkle:', e && e.message); }

  // Yanıt uzunluğu tercih analizi
  S._adaptiveCommunication.response_engagement.push({
    ai_length: aiReply.length,
    user_score: score,
    mode: prevMode
  });
  if (S._adaptiveCommunication.response_engagement.length > 50) {
    S._adaptiveCommunication.response_engagement.shift();
  }
}

export function _p4ModeLabel(mode) {
  return p('prompt.p4.mode_label.' + mode);
}

export function p4GetAdaptiveInsight() {
  const insights = [];
  const eff = S._adaptiveCommunication.effective_approaches;
  const ineff = S._adaptiveCommunication.ineffective_approaches;

  if (eff.length >= 3) {
    const modeCounts = {};
    eff.forEach(e => { modeCounts[e.mode] = (modeCounts[e.mode] || 0) + 1; });
    const bestMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0];
    if (bestMode) {
      insights.push(p('prompt.p4.best_mode', { mode: _p4ModeLabel(bestMode[0]), count: bestMode[1] }));
    }
  }

  if (ineff.length >= 2) {
    const modeCounts = {};
    ineff.forEach(e => { modeCounts[e.mode] = (modeCounts[e.mode] || 0) + 1; });
    const worstMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0];
    if (worstMode && worstMode[1] >= 2) {
      insights.push(p('prompt.p4.worst_mode', { mode: _p4ModeLabel(worstMode[0]), count: worstMode[1] }));
    }
  }

  /* Ölçüm yoksa modele doğrudanlık talimatı GİTMEZ. Eskiden varsayılan 0.5
     bu iki dalı da susturuyordu; null'a geçince kapı açıkça yazıldı —
     "hiç ölçmedim" ile "orta çıktı" aynı şey değildir. */
  const cl = S._adaptiveCommunication.optimal_challenge_level;
  if (cl != null) {
    if (cl < 0.3) {
      insights.push(p('prompt.p4.challenge_low'));
    } else if (cl > 0.7) {
      insights.push(p('prompt.p4.challenge_high'));
    }
  }

  if (S._adaptiveCommunication.response_engagement.length >= 5) {
    const byScore = S._adaptiveCommunication.response_engagement
      .filter(r => r.user_score >= 3)
      .map(r => r.ai_length);
    if (byScore.length >= 3) {
      const avgGoodLen = byScore.reduce((a, b) => a + b, 0) / byScore.length;
      if (avgGoodLen < 200) {
        insights.push(p('prompt.p4.length_short'));
      } else if (avgGoodLen > 500) {
        insights.push(p('prompt.p4.length_long'));
      }
    }
  }

  const topWords = Object.entries(S._adaptiveCommunication.user_vocabulary)
    .filter(([w, c]) => c >= 3 && w.length > 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  if (topWords.length >= 2) {
    insights.push(p('prompt.p4.user_words', { words: topWords.map(([w]) => '"' + w + '"').join(', ') }));
  }

  return insights.length ? '\n' + insights.join('\n') : '';
}

/* ═══════════════════════════════════════════════════════════════════════
   KATMAN 5 — İLİŞKİ DERİNLİĞİ METRİKLERİ
   Emre ile kullanıcı arasındaki "dostluk" seviyesini ölçer.
   Güven, açılma derinliği, terapötik ittifak, ilerleme momentumu.
   ═══════════════════════════════════════════════════════════════════════ */

export function p5UpdateRelationshipMetrics(text) {
  S._relationshipDepth.total_messages++;

  // İlk seans tarihi
  if (!S._relationshipDepth.first_session_date) {
    S._relationshipDepth.first_session_date = nowTR().toISOString();
  }

  // Streak güncelleme
  const streak = parseInt(document.getElementById('streak-val')?.textContent || '0');
  S._relationshipDepth.consecutive_days = streak;
  if (streak > S._relationshipDepth.longest_streak) {
    S._relationshipDepth.longest_streak = streak;
  }

  // Keşfedilen konular
  detectTopics(text).forEach(t => S._relationshipDepth.topics_explored.add(t));

  const emotions = p2DetectEmotions(text) || []; // null'a hazır (§6.10) — .some güvenli
  const intensity = _p2CurrentIntensity();

  // GÜVEN SKORU: Açılma davranışlarına göre artar
  const vulnerabilitySignals = [
    /itiraf\s+etmeliyim/i, /hiç\s+söylemedim/i, /ilk\s+kez/i, /utanıyorum\s+ama/i,
    /sana\s+bir\s+şey\s+söyleyeceğim/i, /gizli/i, /kimse\s+bilmiyor/i,
    /never\s+told/i, /first\s+time/i, /secret/i, /ashamed\s+but/i, /confess/i
  ];
  if (reTest(vulnerabilitySignals, text)) {
    S._relationshipDepth.trust_score = Math.min(100, S._relationshipDepth.trust_score + 3);
    S._relationshipDepth.vulnerability_moments++;
  }

  // Genel açılma derinliği: yoğunluk ve mesaj uzunluğu
  if (intensity >= 4 && text.length > 80) {
    S._relationshipDepth.vulnerability_depth = Math.min(100, S._relationshipDepth.vulnerability_depth + 1.5);
    S._relationshipDepth.deep_conversations++;
  }

  // Direkt duygu ifadesi güveni artırır
  if (emotions.some(e => ['keder', 'utanc_suclu', 'yalnizlik'].includes(e))) {
    S._relationshipDepth.trust_score = Math.min(100, S._relationshipDepth.trust_score + 1);
  }

  // Pozitif geri bildirim ittifak güçlendirir
  const allianceSignals = [
    /teşekkür/i, /haklısın/i, /iyi\s+geldi/i, /bunu\s+duymam\s+gerekiyordu/i,
    /doğru\s+söylüyorsun/i, /seni\s+anlıyorum/i, /emre/i,
    /thank/i, /you'?re\s+right/i, /that\s+helped/i, /i\s+needed\s+this/i
  ];
  if (reTest(allianceSignals, text)) {
    S._relationshipDepth.alliance_strength = Math.min(100, S._relationshipDepth.alliance_strength + 2);
  }

  // Direnç/ret ittifak zayıflatır
  const resistanceSignals = [
    /anlamıyorsun/i, /saçmalama/i, /bırak/i, /istemiyorum/i, /konu\s+değiştir/i,
    /you\s+don'?t\s+understand/i, /nonsense/i, /stop/i, /leave\s+me/i
  ];
  if (reTest(resistanceSignals, text)) {
    S._relationshipDepth.alliance_strength = Math.max(0, S._relationshipDepth.alliance_strength - 3);
  }

  // İlerleme momentumu
  if (detectBreakthrough(text)) {
    S._relationshipDepth.progress_momentum = Math.min(100, S._relationshipDepth.progress_momentum + 5);
    S._relationshipDepth.breakthroughs_count++;
    S._relationshipDepth.milestones.push({
      date: nowTR().toISOString(),
      event: 'breakthrough',
      context: text.slice(0, 60)
    });
    if (S._relationshipDepth.milestones.length > 20) S._relationshipDepth.milestones.shift();
  }

  // Doğal bozunma (zamanla güven hafifçe düşer, aktif kullanımla korunur)
  // Her 50 mesajda 1 puan düşme
  if (S._relationshipDepth.total_messages % 50 === 0) {
    S._relationshipDepth.trust_score = Math.max(0, S._relationshipDepth.trust_score - 1);
    S._relationshipDepth.vulnerability_depth = Math.max(0, S._relationshipDepth.vulnerability_depth - 1);
  }

  // Engagement trend
  const recentInteractions = S._adaptiveCommunication.last_5_interactions;
  if (recentInteractions.length >= 3) {
    const recentAvgLen = recentInteractions.slice(-3).reduce((a, b) => a + (b.reply_length || 0), 0) / 3;
    const olderAvgLen = recentInteractions.slice(0, Math.max(1, recentInteractions.length - 3))
      .reduce((a, b) => a + (b.reply_length || 0), 0) / Math.max(1, recentInteractions.length - 3);
    if (recentAvgLen > olderAvgLen * 1.2) S._relationshipDepth.engagement_trend = 'rising';
    else if (recentAvgLen < olderAvgLen * 0.8) S._relationshipDepth.engagement_trend = 'falling';
    else S._relationshipDepth.engagement_trend = 'stable';
  }
}

export function p5GetRelationshipContext() {
  const rd = S._relationshipDepth;
  if (rd.total_messages < 5) return '';

  const insights = [];

  const trustLevel = rd.trust_score;
  const stageKey = trustLevel < 15 ? 'intro' : trustLevel < 35 ? 'building' : trustLevel < 60 ? 'deepening' : trustLevel < 80 ? 'deep' : 'full';

  insights.push(p('prompt.p5.stage', { stage: p('prompt.p5.stage_name.' + stageKey), trust: trustLevel, alliance: rd.alliance_strength, vuln: Math.round(rd.vulnerability_depth) }));
  insights.push(p('prompt.p5.stage_advice.' + stageKey));

  if (rd.progress_momentum > 20) {
    insights.push(p('prompt.p5.momentum_high', { val: rd.progress_momentum }));
  } else if (rd.progress_momentum < -10) {
    insights.push(p('prompt.p5.momentum_low'));
  }

  if (rd.topics_explored.size > 0) {
    insights.push(p('prompt.p5.topics', { list: Array.from(rd.topics_explored).join(', ') }));
  }

  if (rd.breakthroughs_count > 0) {
    insights.push(p('prompt.p5.breakthroughs', { count: rd.breakthroughs_count, last: rd.milestones[rd.milestones.length - 1]?.context || '' }));
  }

  return '\n' + insights.join('\n');
}

export function p5GetRelationshipLevel() {
  const ts = S._relationshipDepth.trust_score;
  const stageKey = ts < 15 ? 'intro' : ts < 35 ? 'building' : ts < 60 ? 'deepening' : ts < 80 ? 'deep' : 'full';
  const icons = { intro: '◯', building: '◑', deepening: '◕', deep: '●', full: '★' };
  const levels = { intro: 1, building: 2, deepening: 3, deep: 4, full: 5 };
  return { level: levels[stageKey], name: p('prompt.p5.stage_name.' + stageKey), icon: icons[stageKey] };
}

/* ═══════════════════════════════════════════════════════════════════════
   TEMPORAL PROFİL EVRİMİ
   Aylık snapshot'larla kullanıcının zaman içindeki değişimini yakalar.
   ═══════════════════════════════════════════════════════════════════════ */

export function _takeTemporalSnapshot() {
  const topValues = S._personalityMap.values
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3)
    .map(v => v.value);

  return {
    date: nowTR().toISOString(),
    style: S._personalityMap.communication.style,
    avg_msg_length: Math.round(S._personalityMap.communication.avg_msg_length),
    top_values: topValues,
    trust_score: S._relationshipDepth.trust_score,
    alliance_strength: S._relationshipDepth.alliance_strength,
    optimal_challenge: S._adaptiveCommunication.optimal_challenge_level
  };
}

export function _maybeRecordSnapshot() {
  const snapshots = S._personalityMap.temporal_snapshots;
  if (!snapshots.length) {
    if (S._personalityMap.communication.msg_lengths.length >= 10) {
      snapshots.push(_takeTemporalSnapshot());
    }
    return;
  }
  const lastDate = new Date(snapshots[snapshots.length - 1].date);
  const daysSince = (Date.now() - lastDate.getTime()) / 86400000;
  if (daysSince >= 30) {
    snapshots.push(_takeTemporalSnapshot());
    if (snapshots.length > 12) snapshots.shift();
  }
}

/** PROFİL EVRİMİ — ilk snapshot ↔ bugün, UI-GÜVENLİ ham nesne.
 *
 *  `p1GetTemporalEvolution()` aynı veriden PROMPT metni dokur (`p()` anahtarlı
 *  cümleler) — bir UI ona bakamaz; Dönüşüm Aynası'nda tam da böyle bir metin
 *  ekrana basılmıştı ([[09d omGetDirencliOruntuler]] emsali). İkinci bir
 *  okuma yolu açmak yerine aynı kaynağın ham hâli verilir.
 *
 *  Kanıt kapısı: iki snapshot yoksa `null` (§6.10 — ölçülmemiş evrim yoktur).
 *  Snapshot'lar 30 günde bir alınır, en çok 12 tane (≈1 yıl).
 *  @returns {{ilkTarih,sonTarih,uslup,mesajUzunlugu,degerler}|null} */
export function p1TemporalYapisal() {
  try {
    const snaps = S._personalityMap?.temporal_snapshots || [];
    if (snaps.length < 2) return null;
    const ilk = snaps[0];
    const simdiUzunluk = Math.round(S._personalityMap.communication.avg_msg_length);
    const simdiDegerler = S._personalityMap.values
      .slice().sort((a, b) => b.strength - a.strength).slice(0, 3).map(v => v.value);
    const eskiDegerler = ilk.top_values || [];
    return {
      ilkTarih: ilk.date,
      sonTarih: snaps[snaps.length - 1].date,
      uslup: { once: ilk.style || null, simdi: S._personalityMap.communication.style || null },
      mesajUzunlugu: { once: ilk.avg_msg_length || 0, simdi: simdiUzunluk },
      degerler: {
        once: eskiDegerler,
        simdi: simdiDegerler,
        yeni: simdiDegerler.filter(v => !eskiDegerler.includes(v)),
        solan: eskiDegerler.filter(v => !simdiDegerler.includes(v)),
      },
    };
  } catch (_) { return null; }
}

export function p1GetTemporalEvolution() {
  const snapshots = S._personalityMap.temporal_snapshots;
  if (snapshots.length < 2) return '';

  const oldest = snapshots[0];
  const current = {
    style: S._personalityMap.communication.style,
    avg_msg_length: Math.round(S._personalityMap.communication.avg_msg_length),
    top_values: S._personalityMap.values.sort((a, b) => b.strength - a.strength).slice(0, 3).map(v => v.value),
    trust_score: S._relationshipDepth.trust_score,
    optimal_challenge: S._adaptiveCommunication.optimal_challenge_level
  };

  const insights = [];

  if (oldest.style !== 'unknown' && current.style !== 'unknown' && oldest.style !== current.style) {
    insights.push(p('prompt.temporal.style_shift', { from: p('prompt.p1.style.' + oldest.style), to: p('prompt.p1.style.' + current.style) }));
  }

  if (oldest.avg_msg_length > 0) {
    const lengthChange = (current.avg_msg_length - oldest.avg_msg_length) / oldest.avg_msg_length;
    if (lengthChange > 0.3) {
      insights.push(p('prompt.temporal.msg_longer', { pct: Math.round(lengthChange * 100) }));
    } else if (lengthChange < -0.3) {
      insights.push(p('prompt.temporal.msg_shorter', { pct: Math.round(Math.abs(lengthChange) * 100) }));
    }
  }

  const oldVals = new Set(oldest.top_values || []);
  const newVals = current.top_values.filter(v => !oldVals.has(v));
  const lostVals = (oldest.top_values || []).filter(v => !current.top_values.includes(v));
  if (newVals.length) {
    insights.push(p('prompt.temporal.new_values', { values: newVals.join(', ') }));
  }
  if (lostVals.length) {
    insights.push(p('prompt.temporal.faded_values', { values: lostVals.join(', ') }));
  }

  const trustGrowth = current.trust_score - (oldest.trust_score || 0);
  if (trustGrowth > 20) {
    insights.push(p('prompt.temporal.trust_grew', { from: oldest.trust_score || 0, to: current.trust_score }));
  }

  if (oldest.optimal_challenge != null && current.optimal_challenge != null) {
    const challengeShift = current.optimal_challenge - oldest.optimal_challenge;
    if (challengeShift > 0.2) {
      insights.push(p('prompt.temporal.challenge_up'));
    } else if (challengeShift < -0.2) {
      insights.push(p('prompt.temporal.challenge_down'));
    }
  }

  return insights.length ? '\n' + insights.join('\n') : '';
}

/* ═══════════════════════════════════════════════════════════════════════
   KATMAN 6 — YAŞAM HAFIZASI (Life Memory)
   Bir ebeveyn/en yakın dost gibi somut hatırlama:
   • İnsanları İSİMLE tanır ("Ayşe ile aran nasıl?")
   • Gelecek olayları (açık döngüler) takip eder ("sınav nasıl geçti?")
   • Kalıcı yaşam gerçeklerini tutar (meslek, evcil hayvan, hedef)
   • Önemli günleri hatırlar
   Çıkarım hibrit: regex gerçek-zamanlı + seans-sonu LLM derin analizi.
   ═══════════════════════════════════════════════════════════════════════ */

// Rol-ipucu kalıpları (yüksek kesinlik): "eşim Ayşe", "arkadaşım Mehmet"
export const _PERSON_ROLE_CUES = [
  { role: 'partner', re: /\b(?:eşim|sevgilim|partnerim|kocam|karım|nişanlım|wife|husband|boyfriend|girlfriend|partner)\s+([A-ZÇĞİÖŞÜ][a-zçğıöşüâî]{1,})/g },
  { role: 'mother',  re: /\b(?:annem|anam|mother|mom)\s+([A-ZÇĞİÖŞÜ][a-zçğıöşüâî]{1,})/g },
  { role: 'father',  re: /\b(?:babam|father|dad)\s+([A-ZÇĞİÖŞÜ][a-zçğıöşüâî]{1,})/g },
  { role: 'sibling', re: /\b(?:kardeşim|abim|ağabeyim|ablam|brother|sister)\s+([A-ZÇĞİÖŞÜ][a-zçğıöşüâî]{1,})/g },
  { role: 'child',   re: /\b(?:oğlum|kızım|çocuğum|son|daughter)\s+([A-ZÇĞİÖŞÜ][a-zçğıöşüâî]{1,})/g },
  { role: 'boss',    re: /\b(?:patronum|müdürüm|yöneticim|boss|manager)\s+([A-ZÇĞİÖŞÜ][a-zçğıöşüâî]{1,})/g },
  { role: 'friend',  re: /\b(?:arkadaşım|dostum|kankam|friend)\s+([A-ZÇĞİÖŞÜ][a-zçğıöşüâî]{1,})/g },
];

// Cümle başı büyük harfli sık sözcükler — yanlış-pozitif isim filtresi
export const _NAME_STOPLIST = new Set([
  'Bugün','Yarın','Dün','Ben','Sen','Biz','Siz','Onlar','Bu','Şu','Ama','Ve','Çünkü','Sonra','Önce',
  'Belki','Aslında','Yani','Hep','Hiç','Çok','Daha','Zaten','Tabii','Evet','Hayır','Neyse','Bir','İki',
  'Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar','Ocak','Şubat','Mart','Nisan',
  'Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık','Allah','Tanrı','Türkiye',
  'İstanbul','Ankara','İzmir','Bursa','Antalya','Google','Instagram','Facebook','Whatsapp','Youtube',
  'Twitter','İnşallah','Maşallah','Geçen','Gelecek','Her','Bütün','Nasıl','Neden','Niçin','Kim',
  'Nerede','Acaba','Galiba','Bazen','Artık','Hadi','Şey','Çünki'
]);

export function _cleanName(raw) {
  return (raw || '').replace(/['’].*$/, '').replace(/[^A-Za-zÇĞİÖŞÜçğıöşüâî]/g, '').trim();
}

export function _p6Locale() {
  const lang = (typeof S._currentLang !== 'undefined' ? S._currentLang : 'tr');
  return lang === 'tr' ? 'tr-TR' : 'en-US';
}

export function p6ExtractPeople(text) {
  const lm = S._lifeMemory;
  const intensity = _p2CurrentIntensity();
  const topics = detectTopics(text);
  const found = []; // { name, role }

  // 1) Rol-ipucu kalıpları (rol bilinir)
  _PERSON_ROLE_CUES.forEach(({ role, re }) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      const name = _cleanName(m[1]);
      if (name.length >= 2 && !_NAME_STOPLIST.has(name)) found.push({ name, role });
    }
  });

  // 2) Apostroflu özel isim ("Ayşe'yle", "Mehmet'i") — güçlü Türkçe özel-ad sinyali, rol unknown
  const apos = text.match(/\b([A-ZÇĞİÖŞÜ][a-zçğıöşüâî]{2,})['’](?:y?l[ae]|i|ı|e|a|n[ıiue]n|den|dan|de|da)\b/g) || [];
  apos.forEach(tok => {
    const name = _cleanName(tok);
    if (name.length >= 3 && !_NAME_STOPLIST.has(name) && !found.some(f => f.name === name)) found.push({ name, role: 'unknown' });
  });

  // 3) "X ile" — birlikte yapılan eylemde isim, rol unknown
  let im;
  const ileRe = /\b([A-ZÇĞİÖŞÜ][a-zçğıöşüâî]{2,})\s+ile\b/g;
  while ((im = ileRe.exec(text)) !== null) {
    const name = _cleanName(im[1]);
    if (name.length >= 3 && !_NAME_STOPLIST.has(name) && !found.some(f => f.name === name)) found.push({ name, role: 'unknown' });
  }

  // Kaydet / güncelle
  found.forEach(({ name, role }) => {
    const key = name.toLocaleLowerCase('tr');
    if (!lm.people[key]) {
      lm.people[key] = { name, role, mention_count: 0, last_mentioned: null, sentiments: [], topics: [], notes: [], kaynak: 'olcum', kanit: '' };
    }
    const per = lm.people[key];
    /* Regex çıkarımı ÖLÇÜMdür: adı uygulama kullanıcının kendi cümlesinde
       buldu. LLM emilimi aynı kişiyi 'yorum' damgasıyla açmış olabilir —
       ölçüm onu yükseltir, tersi olmaz (kanıtın gücü aşağı inmez). */
    if (_kokenGuc('olcum') >= _kokenGuc(per.kaynak)) {
      per.kaynak = 'olcum';
      per.kanit = kokenKirp(text);
    }
    per.mention_count++;
    per.last_mentioned = nowTR().toISOString();
    if (role !== 'unknown' && (per.role === 'unknown' || !per.role)) per.role = role; // rol netleşince güncelle
    if (intensity !== null) per.sentiments.push(intensity); // kanıtsız (§6.10)
    if (per.sentiments.length > 20) per.sentiments.shift();
    topics.forEach(t => { if (!per.topics.includes(t)) per.topics.push(t); });
  });

  // Sınırsız büyümeyi önle
  if (Object.keys(lm.people).length > 40) {
    const pruned = Object.entries(lm.people).sort((a, b) => b[1].mention_count - a[1].mention_count).slice(0, 30);
    lm.people = Object.fromEntries(pruned);
  }
}

export const _OPEN_LOOP_EVENTS = [
  /sınav/i, /görüşme/i, /mülakat/i, /randevu/i, /toplantı/i, /doktor/i, /ameliyat/i, /buluşma/i,
  /seyahat/i, /uçuş/i, /tatil/i, /düğün/i, /cenaze/i, /duruşma/i, /sunum/i, /teslim/i, /maç/i, /konser/i, /tarih/i,
  /exam/i, /interview/i, /appointment/i, /meeting/i, /doctor/i, /surgery/i, /presentation/i, /deadline/i, /flight/i, /trip/i, /wedding/i
];

export const _FUTURE_MARKERS = [
  /\byarın\b/i, /\bbugün\b/i, /\bbu\s+(?:akşam|gece|hafta|ay)\b/i, /\bgelecek\s+(?:hafta|ay)\b/i,
  /önümüzdeki\b/i, /\bhafta\s*sonu\b/i, /(?:acak|ecek|acağım|eceğim|acağız|eceğiz)\b/i,
  /\btomorrow\b/i, /\bnext\s+(?:week|month)\b/i, /\bthis\s+(?:evening|weekend|week)\b/i, /\bgoing\s+to\b/i, /\bwill\b/i
];

const _DAY_NAMES = {
  'pazartesi':1,'salı':2,'sali':2,'çarşamba':3,'carsamba':3,'perşembe':4,'persembe':4,'cuma':5,'cumartesi':6,'pazar':0,
  'monday':1,'tuesday':2,'wednesday':3,'thursday':4,'friday':5,'saturday':6,'sunday':0
};

// \b ASCII'dir — 'salı' sonundaki 'ı' ve 'çarşamba' başındaki 'ç' sınır
// üretmez, bu gün adları hiç eşleşmezdi. TR-harf sınıfıyla sınır kurulur;
// lookbehind YOK (iOS <16.4 WKWebView'da parse hatası verir).
const _TR_HARF = 'a-zA-ZçğıöşüÇĞİÖŞÜ';

export function p6ResolveDueDate(text, base) {
  const lower = (text || '').toLocaleLowerCase('tr');
  const d = new Date((base || nowTR()).getTime());
  d.setHours(12, 0, 0, 0);
  if (/\byarın\b|\btomorrow\b/.test(lower)) { d.setDate(d.getDate() + 1); return d.toISOString(); }
  if (/\bbugün\b|\btoday\b|\bbu\s+(?:akşam|gece)\b|\bthis\s+evening\b/.test(lower)) return d.toISOString();
  // gün adı — "cumartesi", "monday"
  for (const [name, idx] of Object.entries(_DAY_NAMES)) {
    if (new RegExp(`(?:^|[^${_TR_HARF}])${name}(?:[^${_TR_HARF}]|$)`, 'i').test(lower)) {
      let diff = (idx - d.getDay() + 7) % 7;
      if (diff === 0) diff = 7; // bugün o günse → gelecek hafta aynı gün
      d.setDate(d.getDate() + diff);
      return d.toISOString();
    }
  }
  if (/\bgelecek\s+hafta\b|önümüzdeki\s+hafta\b|\bnext\s+week\b/.test(lower)) { d.setDate(d.getDate() + 7); return d.toISOString(); }
  if (/\bhafta\s*sonu\b|\bweekend\b/.test(lower)) {
    let diff = (6 - d.getDay() + 7) % 7; if (diff === 0) diff = 7; d.setDate(d.getDate() + diff); return d.toISOString();
  }
  return null;
}

/* Ay adları — TR + EN, kısaltmalarıyla. Gün adları gibi (bkz. _DAY_NAMES)
   sözlüğe değil çözücüye aittir: bu bir UI metni değil, bir ayrıştırma
   tablosudur ve kullanıcının hangi dilde yazdığından bağımsız çalışmalıdır
   (TR arayüzde "May 12" yazan kullanıcı da vardır). */
const _AY_ADLARI = {
  'ocak': 1, 'şubat': 2, 'subat': 2, 'mart': 3, 'nisan': 4, 'mayıs': 5, 'mayis': 5, 'haziran': 6,
  'temmuz': 7, 'ağustos': 8, 'agustos': 8, 'eylül': 9, 'eylul': 9, 'ekim': 10,
  'kasım': 11, 'kasim': 11, 'aralık': 12, 'aralik': 12,
  'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6, 'july': 7,
  'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
  'jan': 1, 'feb': 2, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'sept': 9, 'oct': 10, 'nov': 11, 'dec': 12
};

const _iki = (n) => String(n).padStart(2, '0');

/** MUTLAK tarih çözücü — "model gösterir, uygulama çözer" ilkesinin tarihe
 *  uygulanması (2026-08-02).
 *
 *  Model artık `important_dates` için ISO tarih YAZMAZ; kullanıcının
 *  cümlesinde geçen ham ifadeyi ("12 Mayıs") gösterir, ISO'ya biz çeviririz.
 *  Neden: "2026-05-12" kullanıcının hiçbir cümlesinde geçmez, yani birebir
 *  kanıta bağlanamaz — modelin yazdığı bir tarih, kalibre edilmemiş bir
 *  öz-beyandır ve yanlış gün kalıcılaşır.
 *
 *  Dönüş: 'YYYY-MM-DD' (yıl verilmişse) | 'MM-DD' (yinelenen) | null.
 *
 *  GÖRELİ ifadeler bilerek DIŞARIDA: `p6ResolveDueDate` açık döngülerin
 *  ("yarın görüşmem var") işidir. Bir yıldönümü "gelecek hafta" olamaz;
 *  o zinciri buraya bağlamak, çözülemeyen bir ifadeyi uydurma bir güne
 *  bağlamak olurdu. */
export function p6TarihCoz(metin) {
  const ham = String(metin == null ? '' : metin).trim();
  if (!ham) return null;
  const lower = ham.toLocaleLowerCase('tr');

  // 1) Sayısal ISO — 1990-05-12
  const iso = lower.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    const ay = +iso[2], gun = +iso[3];
    if (ay >= 1 && ay <= 12 && gun >= 1 && gun <= 31) return `${iso[1]}-${_iki(ay)}-${_iki(gun)}`;
    return null;
  }

  // 2) Yılsız sayısal — 05-12 ya da 12/05 (TR yazımında gün önce gelir)
  const mmdd = lower.match(/\b(\d{1,2})[-/](\d{1,2})\b/);
  if (mmdd) {
    const a = +mmdd[1], b = +mmdd[2];
    // 'MM-DD' mi 'DD/MM' mi: tire ISO sırasını, eğik çizgi TR sırasını taşır.
    const [ay, gun] = mmdd[0].includes('/') ? [b, a] : [a, b];
    if (ay >= 1 && ay <= 12 && gun >= 1 && gun <= 31) return `${_iki(ay)}-${_iki(gun)}`;
    return null;
  }

  // 3) Ay adlı — "12 Mayıs 1990", "12 mayıs", "May 12", "May 12, 1990"
  for (const [ad, ay] of Object.entries(_AY_ADLARI)) {
    // \b ASCII'dir; TR ay adlarının kenarları için harf sınıfı kullanılır
    // (_DAY_NAMES'te aynı gerekçe, lookbehind YOK — iOS <16.4 parse hatası).
    const re = new RegExp(`(?:^|[^${_TR_HARF}])${ad}(?:[^${_TR_HARF}]|$)`, 'i');
    if (!re.test(lower)) continue;
    const gunM = lower.match(new RegExp(`(\\d{1,2})\\s*\\.?\\s*${ad}|${ad}\\s+(\\d{1,2})`, 'i'));
    const gun = gunM ? +(gunM[1] || gunM[2]) : NaN;
    // Gün bu ay adına bağlanamadıysa DÖNGÜ SÜRER: metinde ikinci bir ay adı
    // olabilir ("mart ayında evlendik, 12 Mayıs"). Burada erken null dönmek
    // çözülebilir bir tarihi çözülemez sayardı.
    if (!(gun >= 1 && gun <= 31)) continue;
    const yilM = lower.match(/\b(19\d{2}|20\d{2})\b/);
    return yilM ? `${yilM[1]}-${_iki(ay)}-${_iki(gun)}` : `${_iki(ay)}-${_iki(gun)}`;
  }

  return null;
}

export function p6ExtractOpenLoops(text) {
  const lm = S._lifeMemory;
  if (!reTest(_FUTURE_MARKERS, text)) return;
  const eventRe = _OPEN_LOOP_EVENTS.find(r => r.test(text));
  if (!eventRe) return;
  const eventWord = (text.match(eventRe) || [''])[0].toLocaleLowerCase('tr');
  const topic = detectTopics(text)[0] || 'future';
  const dueDate = p6ResolveDueDate(text);

  // Aynı olay+gün açık döngü zaten varsa tekrar ekleme, metni tazele
  const dupe = lm.openLoops.find(l => l.status === 'open' && l.event === eventWord &&
    (l.due_date || '').slice(0, 10) === (dueDate || '').slice(0, 10));
  /* Tazeleme kanıtı da tazeler: kullanıcı olayı en son hangi cümleyle andıysa
     panelde onu görür. Damga 'olcum'a yükselir — kayıt LLM'den doğmuş olsa
     bile artık uygulamanın kendi ölçümüyle doğrulanmıştır. */
  if (dupe) { dupe.kanit = kokenKirp(text); dupe.kaynak = 'olcum'; return; }

  lm.openLoops.push({
    id: 'ol_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    kanit: kokenKirp(text),
    kaynak: 'olcum',
    event: eventWord,
    topic,
    due_date: dueDate,
    created: nowTR().toISOString(),
    status: 'open',
    followed_at: null
  });
  if (lm.openLoops.length > 60) {
    lm.openLoops = lm.openLoops.filter(l => l.status === 'open').slice(-40)
      .concat(lm.openLoops.filter(l => l.status !== 'open').slice(-20));
  }
}

export function p6MarkLoopsFollowedUp(text) {
  const lm = S._lifeMemory;
  if (!lm.openLoops.length) return;
  const lower = text.toLocaleLowerCase('tr');
  const nowMs = nowTR().getTime();
  lm.openLoops.forEach(l => {
    if (l.status !== 'open' || !l.event) return;
    if (lower.includes(l.event)) {
      const past = !l.due_date || new Date(l.due_date).getTime() <= nowMs;
      if (past) { l.status = 'followed'; l.followed_at = nowTR().toISOString(); }
    }
  });
}

export const _LIFE_FACT_PATTERNS = [
  { category: 'occupation', re: /(öğretmen|doktor|mühendis|avukat|hemşire|yazılımcı|yazar|öğrenci|emekli|esnaf|memur|polis|asker|pilot|aşçı|berber|muhasebeci|mimar|psikolog|teacher|doctor|engineer|lawyer|nurse|developer|writer|student|retired)/i },
  { category: 'pet', re: /(köpeğim|kedim|kuşum|balığım|hamster(?:ım)?|dog|cat)/i },
  { category: 'goal', re: /\b(bırakmaya\s+çalış\w*|bırakmak\s+istiyorum|olmak\s+istiyorum|hedefim\s+\w+|trying\s+to\s+quit|want\s+to\s+be)\b/i },
  { category: 'health', re: /\b(depresyon|anksiyete|panik\s+atak|kronik|hastalığım|terapiye\s+gid\w*|depression|anxiety|chronic)\b/i },
];

/* Kökenin gücü: kullanıcının kendi beyanı en üstte, uygulamanın ölçümü
   ortada, LLM'in yorumu en altta. Aralarında hiyerarşi değil farklı
   sorumluluk var (13y) — ama bir kaydın damgası aşağı DÜŞMEZ: zayıf köken
   güçlüsünün yerine geçemez. */
const _KOKEN_GUC = { beyan: 3, olcum: 2, yorum: 1 };
const _kokenGuc = (k) => _KOKEN_GUC[k] || 0;

/** Yaşam gerçeğini ekler ya da tazeler.
 *
 *  `n` — bu gerçeğin kaç kez görüldüğü. Eski adı `confidence`'tı ve o ad
 *  yalan söylüyordu: bir güven değil, bir sayaçtır (2026-08-02 ad göçü).
 *  Gerçeklik dilinde ölçümün kanıt adedi `n`'dir (13y · kokenOlc).
 *
 *  `kanit` — kullanıcının bu gerçeği ele veren KENDİ cümlesi. Kanıtsız
 *  gerçek kaydedilebilir ama damgasız kalır; prompt ve UI kapısı (FAZ 4)
 *  onu geçirmez. */
export function p6UpsertFact(category, value, kanit, kaynak) {
  const lm = S._lifeMemory;
  const clean = String(value || '').toLocaleLowerCase('tr').trim().slice(0, 50);
  if (!clean) return;
  const key = (category || 'misc') + ':' + clean;
  const existing = lm.lifeFacts.find(f => f.key === key);
  if (existing) {
    existing.last_seen = nowTR().toISOString();
    existing.n = Math.min(5, (existing.n || 0) + 1);
    /* Yeni kanıt eskisini tazeler — ama yalnız kökeni ZAYIF DEĞİLSE.
       Kanıtsız tekrar mevcut kanıtı silmez, ve LLM'in 'yorum'u uygulamanın
       'olcum'unu ezemez: kanıtın gücü aşağı inmez (p6ExtractPeople'da da
       aynı kural). */
    if (kanit && _kokenGuc(kaynak) >= _kokenGuc(existing.kaynak)) {
      existing.kanit = kokenKirp(kanit);
      existing.kaynak = kaynak || existing.kaynak;
    }
  } else {
    lm.lifeFacts.push({
      key, category: category || 'misc', value: clean, n: 1,
      kanit: kanit ? kokenKirp(kanit) : '',
      kaynak: kanit ? (kaynak || 'olcum') : '',
      first_seen: nowTR().toISOString(), last_seen: nowTR().toISOString()
    });
    if (lm.lifeFacts.length > 50) lm.lifeFacts = lm.lifeFacts.slice(-50);
  }
}

export function p6ExtractLifeFacts(text) {
  _LIFE_FACT_PATTERNS.forEach(({ category, re }) => {
    const m = text.match(re);
    // Kanıt eşleşen kelime DEĞİL, o kelimenin geçtiği cümledir: kullanıcı
    // panelde "öğretmen" değil kendi cümlesini görmeli.
    if (m) p6UpsertFact(category, m[1] || m[0], text, 'olcum');
  });
}

export function p6GetLifeMemoryContext() {
  const lm = S._lifeMemory;
  const parts = [];

  /* KÖKEN KAPISI (2026-08-02): damgası olmayan kayıt LLM bağlamına GİRMEZ.
     Uygulama kullanıcı hakkında bir şey söylüyorsa kaynağı kullanıcı olmak
     zorundadır — kanıta bağlanmamış bir "bildiğin" model tarafından
     uydurulmuş olabilir ve sohbette gerçekmiş gibi anılırdı. */
  // Aktif kişiler (>= 2 anma)
  const people = Object.values(lm.people)
    .filter(per => kokenKayitVar(per) && per.mention_count >= 2)
    .sort((a, b) => b.mention_count - a.mention_count)
    .slice(0, 6);
  if (people.length) {
    const list = people.map(per => {
      /* KANITSIZ TON SÖYLENMEZ (FAZ 12 çapraz denetimi, 2026-08-29).
         Buradaki `: 2` fallback'i sessiz bir YARGI üretiyordu: dizi boşken
         2 >= 3 false'a düşer ve model, system prompt'unda "bu kişiyle
         ilişkin sıcak" iddiasını hiçbir ölçüme dayanmadan okurdu. FAZ 12
         besleme tarafını kanıta bağladı (bkz. _p2CurrentIntensity) — yani
         boş dizi artık olağan bir hâl, "nötr" değil. Okuma tarafı da
         §6.10'a uymak zorunda: kanıt yoksa ton segmenti HİÇ doğmaz, kişi
         yalnız anma sayısıyla anılır (o sayının kanıtı kullanıcının kendi
         cümlesidir, kokenKayitVar kapısından geçmiştir). */
      const tone = per.sentiments.length
        ? (per.sentiments.reduce((a, b) => a + b, 0) / per.sentiments.length >= 3
            ? p('prompt.p6.tone_tense') : p('prompt.p6.tone_warm'))
        : null;
      const roleLabel = per.role && per.role !== 'unknown' ? p('prompt.p6.role.' + per.role) : '';
      // Kişi notları (personalizationDeepAnalysis LLM zenginleştirmesi) — nihayet
      // basılıyor, önceden yalnız toplanıp hiç gösterilmiyordu.
      const noteSuffix = per.notes?.length ? ` — ${p('prompt.p6.note_prefix')}: "${per.notes[per.notes.length - 1]}"` : '';
      return per.name + (roleLabel ? ' (' + roleLabel + ')' : '') + ' — ' + per.mention_count + '×' + (tone ? ', ' + tone : '') + noteSuffix;
    }).join('; ');
    parts.push(p('prompt.p6.people_context', { list }));
  }

  // Bekleyen açık döngüler (due bugün/geçmiş veya tarihsiz, status open)
  const cutoff = nowTR().getTime() + 86400000;
  const due = lm.openLoops
    .filter(l => kokenKayitVar(l) && l.status === 'open' && (!l.due_date || new Date(l.due_date).getTime() <= cutoff))
    .sort((a, b) => new Date(a.due_date || a.created) - new Date(b.due_date || b.created))
    .slice(0, 3);
  due.forEach(l => {
    const when = l.due_date ? new Date(l.due_date).toLocaleDateString(_p6Locale(), { day: 'numeric', month: 'long' }) : '';
    parts.push(p('prompt.p6.open_loop_followup', { event: l.event, when }));
  });

  // Yaşam gerçekleri
  const facts = lm.lifeFacts.filter(kokenKayitVar).slice(-6);
  if (facts.length) {
    parts.push(p('prompt.p6.life_facts', { list: facts.map(f => f.value).join(', ') }));
  }

  return parts.length ? '\n' + parts.join('\n') : '';
}

export function p6GetProactiveCheckin() {
  const lm = S._lifeMemory;
  const todayStr = nowTR().toDateString();
  if (lm.lastCheckinShown === todayStr) return null; // günde bir kez

  const now = nowTR();
  const nowMs = now.getTime();
  let msg = null;

  // 1) Açık döngü takibi — due bugün veya geçmiş (kanıtsız döngü sorulmaz)
  const dueLoop = lm.openLoops
    .filter(l => kokenKayitVar(l) && l.status === 'open' && l.due_date && new Date(l.due_date).getTime() <= nowMs)
    .sort((a, b) => new Date(b.due_date) - new Date(a.due_date))[0];
  if (dueLoop) {
    dueLoop.status = 'followed';
    dueLoop.followed_at = now.toISOString();
    msg = p('prompt.p6.checkin_open_loop', { event: dueLoop.event });
  }

  // 2) Önemli gün (MM-DD eşleşmesi)
  if (!msg) {
    const mmdd = String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const today = lm.importantDates.find(d => kokenKayitVar(d) && (d.date || '').slice(-5) === mmdd);
    if (today) msg = p('prompt.p6.checkin_important_date', { label: today.label });
  }

  // 3) Uzun sessizlik (3+ gün)
  if (!msg && lm.lastActiveDate) {
    const gapDays = (nowMs - new Date(lm.lastActiveDate).getTime()) / 86400000;
    if (gapDays >= 3) msg = p('prompt.p6.checkin_long_silence', { days: Math.floor(gapDays) });
  }

  if (msg) {
    // Render yolundan (w2 selamı) çağrılır — mühür anında kalıcılaşmazsa sekme
    // kapanışında kaybolur, aynı check-in ertesi açılışta TEKRAR düşer.
    // Save asla selamı bloklamasın: hata olursa mühür bellekte yine durur.
    lm.lastCheckinShown = todayStr;
    try { personalizationSave(); } catch (_) {}
  }
  return msg;
}

/* ═══════════════════════════════════════════════════════════════════════
   ANA ORKESTRASYON
   Her mesajda tüm katmanları çalıştırır.
   ═══════════════════════════════════════════════════════════════════════ */

export function personalizationAnalyze(userText) {
  // Önceki AI yanıtının etkinliğini ölç
  if (S._prevAiReply && S._sessionUserMsgs.length >= 2) {
    p4AnalyzeEffectiveness(S._prevAiReply, userText);
  }

  p1AnalyzePersonality(userText);
  p2RecordEmotionalMoment(userText);
  p3RecordPredictionData(userText);
  p5UpdateRelationshipMetrics(userText);

  // Derinlik & Temeller — Wanderer felsefesinin özü
  dfAnalyzeDepthSignals(userText);
  dfAnalyzeFoundationSignals(userText);
  dfExtractPersonTransition(userText);
  dfExtractHayalVision(userText);

  // Katman 6 — Yaşam Hafızası: isimle insanlar, açık döngüler, gerçekler
  p6ExtractPeople(userText);
  p6ExtractOpenLoops(userText);
  p6ExtractLifeFacts(userText);
  p6MarkLoopsFollowedUp(userText);
  S._lifeMemory.lastActiveDate = nowTR().toISOString();

  // İnanç & Seçim Takibi — Dönüşüm Zinciri bileşenleri
  dfAnalyzeBeliefs(userText);
  dfAnalyzeChoices(userText);
  const wsConcept = dfDetectWorksheetOpportunity(userText);
  if (wsConcept) S._worksheetHistory = S._worksheetHistory || {};
  if (wsConcept) S._worksheetHistory.pending_worksheet = wsConcept;

  // Kişi Kartı motoru (10q) — her mesajda profili güncelle, kart kazanımını yakala
  try { window.kkTick && window.kkTick(); } catch (_) {}
}

export function personalizationRecordAIReply(aiReply) {
  S._prevAiReply = aiReply;
  /* Duygu Motoru (13D, FAZ 10) — karşılamayı ve o anki nabzı BURADA mühürle.
     Bu an belirsiz değildir: yanıt yeni tamamlandı, yani `S._dgSonKarsilama`
     son kaydı bu yanıtın ekseni, `S._dgNabiz` de bu yanıtı doğuran kullanıcı
     mesajının nabzıdır. Bir sonraki mesaj geldiğinde "önceki karşılama işe
     yaradı mı" sorusu bu mühre bakarak yanıtlanır (bkz. p4AnalyzeEffectiveness). */
  try {
    const _son = S._dgSonKarsilama && S._dgSonKarsilama.length
      ? S._dgSonKarsilama[S._dgSonKarsilama.length - 1] : null;
    S._prevDgKarsilama = (_son && S._dgNabiz)
      ? { eksen: _son.eksen, deger: S._dgNabiz.deger, kuvvet: S._dgNabiz.kuvvet }
      : null;
  } catch (_) { S._prevDgKarsilama = null; }
  p4RecordInteraction(S.currentAIMode, aiReply);
}

/* Geçiş çalışması bağlamı — kullanıcının Hayal Alemi'nde betimlediği
   sahneler ve Fiziksel Alem'de mühürlediği davranış kanıtları. Emre,
   kullanıcının ne hayal ettiğini ve ne kanıtladığını bilsin diye
   sohbet bağlamına eklenir. (10i + 10g ↔ Emre köprüsü) */
function _buildRitualWorkContext() {
  const lines = [];

  const card = (S._gecisAlani?.cards || []).find(c => c.id === S._gecisAlani?.activeCardId)
    || (S._gecisAlani?.cards || [])[0];
  if (card?.olmakIstenenKisi) {
    lines.push(p('prompt.ritual_work.designed_person', { text: card.olmakIstenenKisi }));
  }

  const sahneler = (S._hayalAlemi?.sahneler || []).slice(-2).reverse();
  if (sahneler.length) {
    const clip = t => (t || '').replace(/\s+/g, ' ').trim().slice(0, 180);
    lines.push(p('prompt.ritual_work.dream_scenes_label'));
    sahneler.forEach(s => lines.push(`• [${s.concept}] "${clip(s.scene_text)}"`));
  }

  const kanitlar = (S._wandererGame?.davranisKanitlari || []).slice(-2).reverse();
  if (kanitlar.length) {
    lines.push(p('prompt.ritual_work.behavior_evidence_label'));
    kanitlar.forEach(k => lines.push(`• "${(k.behavior || '').slice(0, 140)}"`));
  }

  if (!lines.length) return '';
  return p('prompt.ritual_work.header') + '\n' + lines.join('\n') +
    '\n' + p('prompt.ritual_work.reference_directive');
}

/* İmge Aynası (13z köprüsü, plan gorunmeyen-doksan-bes FAZ 3) — Zaltman'ın
   %95 kuralı: kullanıcının kendi seçtiği metafor kelimeyle değil imgeyle
   yaşar. Girişi köken kapısından geçer (K1): yalnız `igGetAktif()` gerçek
   bir mühür taşıyorsa (kokenKayitVar) bir şey döner, aksi hâlde SESSİZCE
   boş — varsayılan imge YOK. window.ig* üzerinden (13z ↔ 09a arası statik
   import kenarı yok, plan Risk 5).
   Doz güvencesi (K3) modelin insafına bırakılmaz: bu damar oturum başına
   EN ÇOK BİR KEZ dolar, ikinci çağrıda kendi bayrağıyla sessizce düşer.
   Bayrak S.currentSessId değişince sıfırlanır — yeni sohbet, yeni hatırlatma
   hakkı doğurur (03/06'nın oturum kimliği; nowTR tabanlı session_id alanları
   ile karıştırma, bu yalnız bayrak anahtarıdır). */
let _imgeCtxSessId = undefined;
let _imgeCtxVerildi = false;

export function _buildImgeContext() {
  try {
    if (S.currentSessId !== _imgeCtxSessId) {
      _imgeCtxSessId = S.currentSessId;
      _imgeCtxVerildi = false;
    }

    /* ZMET merdiveni (FAZ 4): kullanıcı mühür ekranında "bu imgeyle konuş"
       dedi. Bu KENDİ TALEBİDİR — K3'ün doz kısıtı (oturum başına bir kez)
       burada uygulanmaz; istenen bir şeyi esirgemek doz değil, sağırlıktır.
       Bayrak tek turluk: `igMerdivenTuket` okurken tüketir. */
    const merdiven = (typeof window !== 'undefined' && window.igMerdivenTuket)
      ? window.igMerdivenTuket() : false;
    if (!merdiven && _imgeCtxVerildi) return '';

    const rec = (typeof window !== 'undefined' && window.igGetAktif) ? window.igGetAktif() : null;
    if (!kokenKayitVar(rec)) return '';

    const katalog = (typeof window !== 'undefined' && window.igGetImge) ? window.igGetImge(rec.v.id) : null;
    const ad = katalog ? t(katalog.i18nKey, rec.v.id) : rec.v.id;

    _imgeCtxVerildi = true;
    const govde = p('prompt.imge.baglam_header') + '\n' +
      p('prompt.imge.baglam_neden', { ad, neden: rec.kanit }) + '\n';
    return govde + (merdiven ? p('prompt.imge.merdiven') : p('prompt.imge.yanki'));
  } catch (_) { return ''; }
}

/* SÜPER ODAK (13A · Kitap 2 #134) — kullanıcının kendi kurduğu tek hedef.
   Alanın içinde kalıyordu: kullanıcı "net hedefim bu, zihnim ve kalbim aynı
   yeri gösteriyor" diyor, mührü basıyordu ve sohbet bunu hiç bilmiyordu.
   GERÇEKLİK (§6.10): bu bir ÖLÇÜM DEĞİL, kullanıcının BEYANIDIR ve öyle
   etiketlenir. Uyum yüzdesi, "odak gücü", süre gibi bir sayı ÜRETİLMEZ —
   uydurulmuş kesinlik tezin ihlalidir. Kanıt kapısı da gerekmez: beyan kendi
   kanıtıdır, ondan bir şey ÇIKARSAMADIĞIMIZ sürece (Ko-Zo'nun kuralı).
   Odak yoksa satır HİÇ girmez — boş bir alan modele "hedefi yok" diye
   okunmamalı. Tek cümledir ve öyle kalır (13A hedefi 200 karaktere keser). */
export function _buildOdakContext() {
  try {
    const odak = (typeof window !== 'undefined' && window.dcOdakGet) ? window.dcOdakGet() : null;
    const hedef = (odak && typeof odak.hedef === 'string') ? odak.hedef.trim() : '';
    if (!hedef) return '';
    return p('prompt.odak.baglam', { hedef });
  } catch (_) { return ''; }
}

/* Tanıma Motoru (FAZ 5, İ7) — "bu oturumda neye bakıldı" izinin LLM ayağı.
   00f-kullanim-nabzi.js'in S._oturumIzi'ye biriktirdiği HAM izi (kart
   açılışları + tören sonuçları) burada EN ÇOK BİR KESİN ölçüm satırına
   indirger — yorum katılmaz, sayılır (§6.10). Diğer P-katmanlarından
   FARKI: bu satır bir HİPOTEZ değil, bugünün oturumunun kendisidir; doz
   kısıtı (bkz. _buildImgeContext) YOK — oturum sürdükçe sayı değişebilir,
   her turda güncel hâliyle okunur. 13o (Geri Çağrı) bu satırı AYRI
   çağırmaz: zaten buildPersonalizationPrompt'u çağırıyor, tek kaynak
   iki tüketici (K3 disiplini). */
export function _buildOturumIziContext() {
  try {
    const oi = S._oturumIzi;
    if (!oi || !oi.kartlar?.length) return '';

    const sayim = {};
    oi.kartlar.forEach(k => { if (k?.id) sayim[k.id] = (sayim[k.id] || 0) + 1; });
    const idler = Object.keys(sayim);
    const enCok = Object.entries(sayim).sort((a, b) => b[1] - a[1])[0];
    if (!enCok || enCok[1] < 2) return '';

    const card = getCardById(enCok[0]);
    if (!card?.name) return '';

    // "söz verdi/vermedi" YALNIZ bu oturumda TEK kart açıldıysa eklenir —
    // aksi hâlde kart-detay mührü (tören adı 'kart-detay', kart bazında
    // AYRIŞMAZ — 09d'nin gün satırı da aynı sınırı taşır) hangi karta ait
    // olduğunu ayırt etmez; uydurulmuş bir nedensellik yazmaktansa satır
    // yalnız SAYAR (§6.10).
    let key = 'prompt.oturumizi.kart_tekrar';
    if (idler.length === 1) {
      const muhurVar = (oi.torenler || []).some(tr => tr?.ad === 'kart-detay' && tr.sonuc === 'muhur');
      key = muhurVar ? 'prompt.oturumizi.kart_tekrar_soz' : 'prompt.oturumizi.kart_tekrar_sessiz';
    }
    return p('prompt.oturumizi.header') + '\n' + p(key, { ad: card.name, n: enCok[1] });
  } catch (_) { return ''; }
}

export function buildPersonalizationPrompt(userText) {
  const parts = [];

  /* Bağlam Nabzı · alt kırılım (İç Çalışma 02 · boşluk H) — `personalization`
     standard modda TAVANSIZ akan tek kanal ve bu ay içine dört yeni üretici
     girdi (ritüel, odak, imge, oturum izi). Hangi grubun ne kadar yer kapladığı
     ölçülmeden konacak tavan, en değerli sinyali kesme riskidir. Ölçü grup
     düzeyindedir: parça başına ölçmek 25 çağrı yerinin hepsini değiştirirdi,
     kararı vermek içinse grup yeter. Turda bir kez, yalnız `.length`. */
  const _pOlcum = {};
  let _pKesim = 0;
  const _grup = (ad) => {
    let simdi = 0;
    for (const x of parts) simdi += x.length + 1;
    if (simdi > _pKesim) _pOlcum[ad] = simdi - _pKesim;
    _pKesim = simdi;
  };

  // Portre — kullanıcının kendi tanımı (kutsal hafıza, en üst öncelik).
  // window.* ile çağrılır (02c'ye import kenarı eklemeden — TDZ-güvenli).
  try {
    const porCtx = (typeof window !== 'undefined' && window.porGetContext) ? window.porGetContext() : '';
    if (porCtx) parts.push(porCtx);
  } catch (_) {}

  // Geçiş Kartım (10A) — şu anki ihtiyaç için aktif uydu kart. Portreden
  // hemen sonra: kim olduğu + şu an neye ihtiyacı olduğu. Aktif kart yoksa boş.
  try {
    const anCtx = (typeof window !== 'undefined' && window.gkGetContext) ? window.gkGetContext() : '';
    if (anCtx) parts.push(anCtx);
  } catch (_) {}

  // Olduğu Kişi — Kimlik Motoru (13l): uygulamadaki hareketlerden çözülen canlı
  // kimlik. Portrenin hemen ardından gelir: yazdığı kişi + olduğu kişi.
  try {
    const kimlikCtx = (typeof window !== 'undefined' && window.imGetContext) ? window.imGetContext() : '';
    if (kimlikCtx) parts.push(kimlikCtx);
  } catch (_) {}

  // Olmak İstediği Kişi (10D) — kullanıcının kendi tasarladığı hedef kimlik
  // (Geçiş Yapısı). Olduğu kişinin lapis ikizi: Emre kullanıcıyı bu kişiye yürütür.
  try {
    const oikCtx = (typeof window !== 'undefined' && window.oikGetContext) ? window.oikGetContext() : '';
    if (oikCtx) parts.push(oikCtx);
  } catch (_) {}

  // Eski "İlham Kartı" bağlamı 2026-06-21'de gkGetContext'e gömüldü:
  // aktif yol yokken son tamamlanmış Geçiş Kartım'ların lapis kutbu
  // "olmak istediği kişi" sinyali olarak gkGetContext'ten döner.

  // Yaşayan Portre (09e) — P1-P6+kimlik+örüntünün günlük tek kanonik
  // sentezi ("X çünkü Y" tanısı). Oik'ten hemen sonra: kim olduğu +
  // olmak istediği + ONU NASIL OKUDUĞUMUZ. window.* TDZ-güvenli.
  let _ypCore = false;
  try {
    const ypCtx = (typeof window !== 'undefined' && window.ypGetContext) ? window.ypGetContext() : '';
    if (ypCtx) parts.push(ypCtx);
    _ypCore = (typeof window !== 'undefined' && window.ypHasCore) ? window.ypHasCore() : false;
  } catch (_) {}

  _grup('p_kimlik');   // portre + geçiş kartı + kimlik + hedef + yaşayan portre

  const pm = S._personalityMap;
  if (pm.communication.msg_lengths.length >= 5) {
    parts.push(p('prompt.p1.personality', { style: p('prompt.p1.style.' + pm.communication.style), avgLen: Math.round(pm.communication.avg_msg_length) }));
  }

  const _degerler = pm.values.filter(v => !_beyanliMi('p1-deger', v?.value));
  if (_degerler.length) {
    const topValues = _degerler.sort((a, b) => b.strength - a.strength).slice(0, 3);
    parts.push(p('prompt.p1.values', { list: topValues.map(v => v.value + '(' + v.strength + ')').join(', ') }));
  }

  const activeRels = Object.entries(pm.relationships)
    .filter(([_, v]) => v.mention_count >= 2)
    .sort((a, b) => b[1].mention_count - a[1].mention_count)
    .slice(0, 4);
  if (activeRels.length) {
    const relSummary = activeRels.map(([rel, data]) => {
      /* KANITSIZ GERGİNLİK SÖYLENMEZ (FAZ 12 çapraz denetimi, 2026-08-29).
         Boş dizide `reduce / length` NaN üretir ve `NaN >= 3` DAİMA false —
         yani hiç ölçüm yokken model "gerginlik düşük" diye okurdu. Bu, bir
         eksikliğin sessizce olumlu bir bulguya çevrilmesidir (§6.10).
         Kanıt yoksa segment doğmaz; ilişki yalnız anma sayısıyla anılır. */
      const tension = data.sentiments.length
        ? (data.sentiments.reduce((a, b) => a + b, 0) / data.sentiments.length >= 3
            ? p('prompt.p1.tension_high') : p('prompt.p1.tension_low'))
        : null;
      return `${p('prompt.p1.rel.' + rel)}(${data.mention_count}x${tension ? ', ' + tension : ''})`;
    }).join(', ');
    parts.push(p('prompt.p1.relationships', { summary: relSummary }));
  }

  const _savunmalar = pm.defense_mechanisms.filter(d => !_beyanliMi('p1-savunma', d?.type));
  if (_savunmalar.length) {
    const topDef = _savunmalar.sort((a, b) => b.count - a.count).slice(0, 2);
    parts.push(p('prompt.p1.defense', { list: topDef.map(d => p('prompt.p1.defense_type.' + d.type) + '(' + d.count + 'x)').join(', ') }));
  }

  // Portre en az bir kez konsolide olduysa bu ham liste onun içinde daha
  // zengin bir anlatıya dönüşmüş olur — çıplak tekrarı burada kıs.
  const _ozTanimlar = (pm.self_descriptions || []).filter(x => !_beyanliMi('p1-oztanim', x));
  if (_ozTanimlar.length && !_ypCore) {
    parts.push(p('prompt.p1.self_desc', { descriptions: _ozTanimlar.slice(-3).join('", "') }));
  }

  _grup('p_p1');       // kişilik haritası: üslup, değerler, ilişkiler, savunmalar

  const chainInsight = p2GetEmotionalChainInsight(userText);
  if (chainInsight) parts.push(chainInsight);

  const cycleInsight = p2GetEmotionalCycleInsight();
  if (cycleInsight) parts.push(cycleInsight);

  const predictiveInsight = p3GetPredictiveInsight();
  if (predictiveInsight) parts.push(predictiveInsight);

  const adaptiveInsight = p4GetAdaptiveInsight();
  if (adaptiveInsight) parts.push(adaptiveInsight);

  const relationshipCtx = p5GetRelationshipContext();
  if (relationshipCtx) parts.push(relationshipCtx);

  // Katman 6 — Yaşam Hafızası: isimle insanlar, açık döngü takibi, yaşam gerçekleri
  const lifeMemoryCtx = p6GetLifeMemoryContext();
  if (lifeMemoryCtx) parts.push(lifeMemoryCtx);

  const temporalEvolution = p1GetTemporalEvolution();
  if (temporalEvolution) parts.push(temporalEvolution);

  _grup('p_p2_p6');    // duygu zinciri → tahmin → uyarlanma → ilişki → yaşam hafızası

  // Olumlama pratiği
  const affCtx = dfGetAffirmationContext();
  if (affCtx) parts.push(affCtx);

  // Derinlik & Temeller profili
  const depthCtx = dfGetDepthContext();
  if (depthCtx) parts.push(depthCtx);
  const foundCtx = dfGetFoundationsContext();
  if (foundCtx) parts.push(foundCtx);
  const ptCtx = dfGetPersonTransitionContext();
  if (ptCtx) parts.push(ptCtx);

  _grup('p_derinlik'); // olumlama + derinlik + temeller + kişi geçişi

  // Geçiş çalışması — Hayal sahneleri + Davranış kanıtları (Emre bağlamı)
  const ritualCtx = _buildRitualWorkContext();
  if (ritualCtx) parts.push(ritualCtx);

  // Süper Odak (13A) — kullanıcının kendi kurduğu tek hedef; beyandır, ölçüm değil
  const odakCtx = _buildOdakContext();
  if (odakCtx) parts.push(odakCtx);

  // İmge Aynası (13z) — kullanıcının kendi seçtiği metafor, oturum başına EN ÇOK BİR KEZ
  const imgeCtx = _buildImgeContext();
  if (imgeCtx) parts.push(imgeCtx);

  // Tanıma Motoru (FAZ 5, İ7) — bu oturumda neye bakıldı (kesin ölçüm).
  // 01'in bütçe tablosuna dokunulmaz: personalization bloğunun İÇİNDE akar.
  const oturumIziCtx = _buildOturumIziContext();
  if (oturumIziCtx) parts.push(oturumIziCtx);

  _grup('p_calisma');  // ritüel + odak + imge + oturum izi (bu ay girenler)

  try { S._ctxOlcumP = _pOlcum; } catch (_) {}

  if (!parts.length) return '';
  return '\n\n═══ ' + p('prompt.personalization_header') + ' ═══\n' + parts.join('\n');
}

/* ═══════════════════════════════════════════════════════════════════════
   PERSİSTANS — Supabase-backed Storage
   ═══════════════════════════════════════════════════════════════════════ */

/* Tarih tabanı NOTU: bu motor baştan beri nowTR().toISOString() kullanır —
   nowTR TR saatine ötelenmiş Date döndürür, toISOString onu UTC etiketiyle
   yazar (çift öteleme). Saklanan değerler yalnız BİRBİRİYLE kıyaslanır ve
   kendi içinde tutarlıdır; yeni kodda bu değerleri localISODate()/new Date
   tabanlı gerçek-zaman değerleriyle KARIŞTIRMA. Format değişikliği mevcut
   kullanıcı verisini kırar — bilinçli olarak dokunulmadı (2026-07-18). */
export const _P_STORAGE_KEYS = {
  personality:    uid => `etw_p_personality_${uid}`,
  emotional:      uid => `etw_p_emotional_${uid}`,
  prediction:     uid => `etw_p_prediction_${uid}`,
  adaptive:       uid => `etw_p_adaptive_${uid}`,
  relationship:   uid => `etw_p_relationship_${uid}`,
  lifeMemory:     uid => `etw_p_lifememory_${uid}`
};

export function personalizationSave() {
  if (!S.currentUser?.id) return;
  const uid = S.currentUser.id;

  // Aylık snapshot kontrolü
  _maybeRecordSnapshot();

  SafeStorage.set(_P_STORAGE_KEYS.personality(uid), {
    communication: {
      avg_msg_length: S._personalityMap.communication.avg_msg_length,
      msg_lengths: S._personalityMap.communication.msg_lengths.slice(-50),
      style: S._personalityMap.communication.style,
      unique_words: S._personalityMap.communication.unique_words,
      total_words: S._personalityMap.communication.total_words,
      metaphor_count: S._personalityMap.communication.metaphor_count,
      question_ratio: S._personalityMap.communication.question_ratio,
      emoji_usage: S._personalityMap.communication.emoji_usage,
      preferred_time: S._personalityMap.communication.preferred_time,
      msg_count_by_hour: S._personalityMap.communication.msg_count_by_hour
    },
    triggers: S._personalityMap.triggers.slice(-20),
    soothers: S._personalityMap.soothers.slice(-20),
    values: S._personalityMap.values.slice(0, 10),
    relationships: S._personalityMap.relationships,
    defense_mechanisms: S._personalityMap.defense_mechanisms.slice(0, 10),
    growth_edges: S._personalityMap.growth_edges.slice(-10),
    recurring_phrases: Object.fromEntries(
      Object.entries(S._personalityMap.recurring_phrases)
        .sort((a, b) => b[1] - a[1]).slice(0, 20)
    ),
    self_descriptions: S._personalityMap.self_descriptions.slice(-10),
    temporal_snapshots: (S._personalityMap.temporal_snapshots || []).slice(-12)
  });

  SafeStorage.set(_P_STORAGE_KEYS.emotional(uid), S._emotionalChain.slice(-100));
  SafeStorage.set(_P_STORAGE_KEYS.prediction(uid), S._predictionModel);

  SafeStorage.set(_P_STORAGE_KEYS.adaptive(uid), {
    effective_approaches: S._adaptiveCommunication.effective_approaches.slice(-20),
    ineffective_approaches: S._adaptiveCommunication.ineffective_approaches.slice(-20),
    user_vocabulary: Object.fromEntries(
      Object.entries(S._adaptiveCommunication.user_vocabulary)
        .sort((a, b) => b[1] - a[1]).slice(0, 50)
    ),
    preferred_metaphors: S._adaptiveCommunication.preferred_metaphors.slice(-10),
    optimal_challenge_level: S._adaptiveCommunication.optimal_challenge_level,
    response_engagement: S._adaptiveCommunication.response_engagement.slice(-30),
    explicit_feedback_log: (S._adaptiveCommunication.explicit_feedback_log || []).slice(-20)
  });

  SafeStorage.set(_P_STORAGE_KEYS.relationship(uid), {
    ...S._relationshipDepth,
    topics_explored: Array.from(S._relationshipDepth.topics_explored),
    milestones: S._relationshipDepth.milestones.slice(-15)
  });

  // Katman 6 — Yaşam Hafızası (budanmış)
  const lm = S._lifeMemory;
  SafeStorage.set(_P_STORAGE_KEYS.lifeMemory(uid), {
    people: Object.fromEntries(
      Object.entries(lm.people).sort((a, b) => b[1].mention_count - a[1].mention_count).slice(0, 30)
    ),
    openLoops: [
      ...lm.openLoops.filter(l => l.status === 'open').slice(-40),
      ...lm.openLoops.filter(l => l.status !== 'open').slice(-20)
    ],
    lifeFacts: lm.lifeFacts.slice(-40),
    importantDates: lm.importantDates.slice(-30),
    lastCheckinShown: lm.lastCheckinShown,
    lastActiveDate: lm.lastActiveDate
  });

  dfSave();
}

/* Kayıt ritmi seyrek (her 10 mesaj + seans sonu — 06-summary-chat) — arka
   plana geçişte biriken P1-P6/lifeMemory sinyali hemen KV'ye insin
   (02c/00f hidden+pagehide kalıbı; personalizationSave uid yoksa no-op). */
let _pFlushInstalled = false;
function _installLifecycleFlush() {
  if (_pFlushInstalled || typeof document === 'undefined') return;
  _pFlushInstalled = true;
  const flush = () => { try { personalizationSave(); } catch (_) {} };
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  window.addEventListener('pagehide', flush);
}

/** GERİ-OKUMA KATMANI (§4.3 madde 4) — `confidence` → `n` ad göçü.
 *
 *  Kullanıcının cihazındaki gerçek veri; taşınmadan eski ad bırakılmaz.
 *  Sayaç aynı sayaçtır, yalnız adı doğrulanmıştır: bir güven değil, "bu
 *  gerçek kaç kez görüldü". Eski alan silinmez — bir sonraki yazımda
 *  zaten yeni şekliyle kaydedilir, ve yarım hidre olmuş bir cihazda
 *  veri kaybı riski taşımaz.
 *
 *  DİKKAT: repodaki ikinci `confidence` (S._userProfile.current/desired)
 *  BAŞKA bir alandır — hedef tanımının güveni, tekrar sayacı değil.
 *  Bu göç yalnız lifeFacts'e dokunur. */
export function _p6MigrateFacts(facts) {
  if (!Array.isArray(facts)) return [];
  return facts.map((f) => {
    if (!f || typeof f !== 'object') return f;
    if (typeof f.n === 'number') return f;
    /* KOKEN-MUAF: bu bir ölçüm varsayılanı değil, bir SAYIMIN taban değeri.
       Kayıt zaten var olduğuna göre o gerçek en az bir kez görülmüştür;
       n=1 yeni bir iddia üretmez, mevcut kaydın kendisini sayar. */
    const n = typeof f.confidence === 'number' ? f.confidence : 1;
    return { ...f, n };
  });
}

export function personalizationLoad() {
  if (!S.currentUser?.id) return;
  const uid = S.currentUser.id;

  const pm = SafeStorage.get(_P_STORAGE_KEYS.personality(uid));
  if (pm) {
    Object.assign(S._personalityMap.communication, pm.communication || {});
    S._personalityMap.triggers = pm.triggers || [];
    S._personalityMap.soothers = pm.soothers || [];
    S._personalityMap.values = pm.values || [];
    S._personalityMap.relationships = pm.relationships || {};
    S._personalityMap.defense_mechanisms = pm.defense_mechanisms || [];
    S._personalityMap.growth_edges = pm.growth_edges || [];
    S._personalityMap.recurring_phrases = pm.recurring_phrases || {};
    S._personalityMap.self_descriptions = pm.self_descriptions || [];
    S._personalityMap.temporal_snapshots = pm.temporal_snapshots || [];
  }

  const ec = SafeStorage.get(_P_STORAGE_KEYS.emotional(uid));
  /* Eski etiketler burada yeni adlara çevrilir (§4.3 geri-okuma katmanı) —
     kullanıcının kayıtlı anıları göçte kaybolmaz. */
  if (Array.isArray(ec)) S._emotionalChain = ec.map(m => (m && Array.isArray(m.emotions)) ? { ...m, emotions: _p2GocEt(m.emotions) } : m);

  const pred = SafeStorage.get(_P_STORAGE_KEYS.prediction(uid));
  if (pred) Object.assign(S._predictionModel, pred);

  const ac = SafeStorage.get(_P_STORAGE_KEYS.adaptive(uid));
  if (ac) Object.assign(S._adaptiveCommunication, ac);

  const rd = SafeStorage.get(_P_STORAGE_KEYS.relationship(uid));
  if (rd) {
    Object.assign(S._relationshipDepth, rd);
    S._relationshipDepth.topics_explored = new Set(rd.topics_explored || []);
  }

  const lm = SafeStorage.get(_P_STORAGE_KEYS.lifeMemory(uid));
  if (lm) {
    S._lifeMemory.people = lm.people || {};
    S._lifeMemory.openLoops = lm.openLoops || [];
    S._lifeMemory.lifeFacts = _p6MigrateFacts(lm.lifeFacts);
    S._lifeMemory.importantDates = lm.importantDates || [];
    S._lifeMemory.lastCheckinShown = lm.lastCheckinShown || null;
    S._lifeMemory.lastActiveDate = lm.lastActiveDate || null;
  }

  dfLoad();
  _installLifecycleFlush();
}

/* ═══════════════════════════════════════════════════════════════════════
   SEANS SONU DERİN ANALİZ
   Gün sonunda AI'ya tüm kişiselleştirme verilerini analiz ettir.
   ═══════════════════════════════════════════════════════════════════════ */

/* triggers/soothers ikiz merge'i — mevcut topic frequency++, yeni topic push,
   üst sınır cap (deep-analysis'te birebir iki blok vardı; tek yardımcı). */
function _mergeFreqTopics(map, field, incoming, cap = 20) {
  incoming.forEach(topic => {
    const existing = map[field].find(x => x.topic === topic);
    if (existing) { existing.frequency++; existing.last_seen = nowTR().toISOString(); }
    else map[field].push({ topic, frequency: 1, last_seen: nowTR().toISOString() });
  });
  if (map[field].length > cap) map[field] = map[field].slice(-cap);
}

export async function personalizationDeepAnalysis() {
  if (!S.currentUser || !S.LLM_API_KEY) return;
  const userMsgs = S.chatHistory.filter(m => m.role === 'user');
  if (userMsgs.length < 3) return;

  /* Kanıt havuzu — NUMARALI blok (2026-08-02). Aynı liste hem analizin
     girdisi hem kanıtın haritasıdır: model bir maddeyi yazarken kanıtını
     `[S3]` diye GÖSTERİR, metni kaynaktan biz keseriz. Eskiden burada ham
     metin 150 karakterde kırpılıp basılıyordu ve çıkan hiçbir madde bir
     cümleye bağlanmıyordu — model "iş görüşmen var" uydurunca kayıt
     kalıcılaşıyordu.

     max: 24 bilinçli — SOZ_BLOK_MAX (14) burada dar kalırdı, çünkü blok
     yalnız kanıt havuzu değil analizin de girdisidir; 14'e düşmek uzun
     seansların başını analizden de düşürürdü. */
  const _sozListe = userMsgs.map(m => String(m.content || ''));
  const { blok: sozler, harita: sozHarita } = kokenSozBlok(_sozListe, { max: 24, maxLen: 180 });
  /* Ad kapısının kanıt havuzu — HAM metin (kırpılmamış). Söz bloğu 180
     karakterde kesiliyor; kesilen kuyrukta geçen bir ad haksız yere
     "uydurma" sayılırdı, o yüzden ad doğrulaması tam metinden yapılır. */
  const _hamSozler = _sozListe.join('\n').toLocaleLowerCase('tr');
  const currentProfile = S._userProfile ? JSON.stringify({
    core_issue: S._userProfile.core_issue || '',
    goal: S._userProfile.goal || '',
    recurring_pattern: S._userProfile.recurring_pattern || ''
  }) : '{}';

  const pm = S._personalityMap;
  const rd = S._relationshipDepth;

  // Ayna Protokolü (09g) — bu oturumda kullanıcıya nazikçe bir hipotez
  // soruldıysa, cevabını (doğruladı/reddetti/değinmedi) bu analizden çıkar.
  const _pendingHint = (typeof window !== 'undefined' && window.apGetLastShownHint) ? window.apGetLastShownHint() : null;
  const mirrorContext = _pendingHint
    ? p('prompt.personalization.mirror_context', { metin: _pendingHint.metin })
    : '';
  // mirrorSchema JSON şema parçasıdır — alan adları çevrilmez, kod tarafında kalır.
  const mirrorSchema = _pendingHint
    ? `,\n  "mirror_response": { "confirmed": true|false|null }`
    : '';

  try {
    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text:
        p('prompt.personalization.deep_analysis_context', {
          sozler,
          currentProfile,
          style: pm.communication.style,
          avgLen: Math.round(pm.communication.avg_msg_length),
          values: pm.values.map(v => v.value).join(', ') || p('prompt.personalization.none'),
          defenses: pm.defense_mechanisms.map(d => d.type).join(', ') || p('prompt.personalization.none'),
          trust: rd.trust_score,
          alliance: rd.alliance_strength,
          selfDesc: pm.self_descriptions.join('; ') || p('prompt.personalization.none'),
        }) +
        mirrorContext + `\n\n` +
        p('prompt.personalization.deep_analysis_task', { mirror_schema: mirrorSchema }) + `\n\n` +
        // "Bilinenler" listesi de kanıtlıdan kurulur: damgasız bir ad ya da
        // gerçek buraya girse, model onu "zaten biliniyor" sayıp üstüne yeni
        // çıkarımlar yapardı — uydurma kendi kendini besleyen bir döngüye girer.
        p('prompt.personalization.known_names', { list: Object.values(S._lifeMemory.people).filter(kokenKayitVar).map(x => x.name).slice(0, 15).join(', ') || p('prompt.personalization.none_plain') }) + `\n` +
        p('prompt.personalization.known_facts', { list: S._lifeMemory.lifeFacts.filter(kokenKayitVar).map(f => f.value).slice(-10).join(', ') || p('prompt.personalization.none_plain') }) + `\n\n` +
        p('prompt.personalization.deep_analysis_rules')
      }] }],
      systemPrompt: '',
      maxTokens: 450, temperature: 0.2, jsonMode: true, model: SUMMARY_MODEL, skipPersona: true
    });

    const analysis = JSON.parse(raw);

    if (analysis.triggers?.length) _mergeFreqTopics(S._personalityMap, 'triggers', analysis.triggers);
    if (analysis.soothers?.length) _mergeFreqTopics(S._personalityMap, 'soothers', analysis.soothers);

    if (analysis.growth_edges?.length) {
      analysis.growth_edges.forEach(g => {
        if (!S._personalityMap.growth_edges.includes(g)) {
          S._personalityMap.growth_edges.push(g);
        }
      });
      if (S._personalityMap.growth_edges.length > 10) S._personalityMap.growth_edges = S._personalityMap.growth_edges.slice(-10);
    }

    // ── Katman 6 — Yaşam Hafızası merge (regex bulgularını LLM ile zenginleştir) ──
    const lm = S._lifeMemory;

    /** Maddenin kanıtını çözer — 09e `_parseConsolidation` ile aynı kapı.
     *  Model `kanit_ref` ile parmakla gösterir, metni BİZ kaynaktan keseriz.
     *  Bağlanamayan madde hiç doğmaz: kullanıcı, kurmadığı bir cümlenin
     *  sonucunu kendi hayatı sanmaz. */
    const _kanit = (o) => {
      const c = kokenAlintiCoz(o?.kanit_ref, o?.kanit, sozHarita, _sozListe);
      return c ? c.alinti : '';
    };

    if (analysis.people?.length) {
      analysis.people.forEach(pp => {
        if (!pp.name) return;
        const key = String(pp.name).toLocaleLowerCase('tr');
        /* Kullanıcının metninde GERÇEKTEN geçmeyen bir ad yaşam hafızasına
           girmez. Prompt bunu zaten istiyordu (16b known_names: "uydurma")
           ama hiçbir yerde doğrulanmıyordu — model bir kez uydurunca ad
           kalıcılaşıyor ve sonraki turlarda "bilinen kişi" sayılıyordu. */
        if (!key || !_hamSozler.includes(key)) return;
        /* Kişinin kanıtı modelden beklenmez: ad kapısı zaten adı kullanıcının
           kendi cümlesinde buldu — o cümleyi uygulama kendisi getirir ve
           damga 'olcum' olur. Modelin katkısı rol ve nottur, ad değil. */
        const _adKanit = _sozListe.find(s => s.toLocaleLowerCase('tr').includes(key)) || '';
        if (!lm.people[key]) {
          lm.people[key] = { name: pp.name, role: pp.role || 'unknown', mention_count: 1, last_mentioned: nowTR().toISOString(), sentiments: [], topics: [], notes: [], kaynak: 'olcum', kanit: kokenKirp(_adKanit) };
        }
        const per = lm.people[key];
        if (!per.kanit && _adKanit) { per.kanit = kokenKirp(_adKanit); per.kaynak = 'olcum'; }
        if (pp.role && pp.role !== 'unknown' && (per.role === 'unknown' || !per.role)) per.role = pp.role;
        if (pp.note && !per.notes.includes(pp.note)) { per.notes.push(pp.note); if (per.notes.length > 5) per.notes.shift(); }
      });
    }

    /* ZİRVE MÜHRÜ (13z FAZ 5) — Zaltman Z3: bir deneyimin ANISI deneyimin
       kendisinden değerlidir, ve anıyı kapanış çerçevesi kurar. Günün en
       yüklü cümlesi çerçevelenmezse seans "yaşandı ama hatırlanmadı" olur.
       Cümleyi model YAZMAZ, numarasını gösterir; metni kaynaktan _kanit
       keser (K2). Çözülemezse hiçbir şey kaydedilmez — kanıtsız bir
       çerçeveleme, kullanıcıya kurmadığı bir cümleyi kendi zirvesi diye
       sunardı. Yeni LLM çağrısı YOK: aynı seans-sonu JSON'una binen tek
       alan (kota ≈ 0). */
    if (analysis.zirve_kanit_ref) {
      const _z = _kanit({ kanit_ref: analysis.zirve_kanit_ref });
      if (_z) { try { window.igZirveKaydet?.(_z, String(analysis.zirve_kanit_ref), localISODate()); } catch (_) {} }
    }

    if (analysis.open_loops?.length) {
      analysis.open_loops.forEach(ol => {
        if (!ol.event) return;
        const kanit = _kanit(ol);
        if (!kanit) return; // kanıtsız açık döngü doğmaz
        const ev = String(ol.event).toLocaleLowerCase('tr').slice(0, 40);
        if (lm.openLoops.some(l => l.status === 'open' && l.event === ev)) return;
        lm.openLoops.push({
          id: 'ol_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          kanit, kaynak: 'yorum', event: ev, topic: 'future',
          due_date: ol.due_hint ? p6ResolveDueDate(ol.due_hint) : null,
          created: nowTR().toISOString(), status: 'open', followed_at: null
        });
      });
      if (lm.openLoops.length > 60) lm.openLoops = lm.openLoops.slice(-60);
    }

    if (analysis.life_facts?.length) {
      analysis.life_facts.forEach(f => {
        if (!f.value) return;
        const kanit = _kanit(f);
        if (!kanit) return; // kanıtsız yaşam gerçeği doğmaz
        p6UpsertFact(f.category || 'misc', String(f.value), kanit, 'yorum');
      });
    }

    if (analysis.important_dates?.length) {
      analysis.important_dates.forEach(d => {
        if (!d.label || !d.tarih_metni) return;
        const kanit = _kanit(d);
        if (!kanit) return;
        /* Tarih ifadesi kullanıcının KENDİ cümlesinde geçmiş olmalı: model
           "12 Mayıs" derken kullanıcı yalnız "annemin doğum günü yaklaşıyor"
           demişse gün uydurulmuştur ve kayıt hiç doğmaz. */
        if (!kokenIcerir(kanit, d.tarih_metni)) return;
        const date = p6TarihCoz(d.tarih_metni);
        if (!date) return; // çözülemeyen tarih uydurulmaz
        if (lm.importantDates.some(x => x.label === d.label)) return;
        lm.importantDates.push({ label: d.label, date, kind: d.kind || 'milestone', recurring: d.kind === 'birthday' || d.kind === 'anniversary', kaynak: 'yorum', kanit });
      });
      if (lm.importantDates.length > 30) lm.importantDates = lm.importantDates.slice(-30);
    }

    // Ayna Protokolü (09g) — hipotez yanıtını durum güncellemesine çevir.
    // "confirmed" açıkça true/false değilse (null/eksik) hiçbir şey yapılmaz —
    // kullanıcı hiç değinmediyse hipotez 'aday' kalır, bir dahaki sohbette tekrar sorulabilir.
    if (_pendingHint && typeof analysis.mirror_response?.confirmed === 'boolean') {
      try { window.apResolveHypothesis?.(_pendingHint.id, analysis.mirror_response.confirmed ? 'dogrulandi' : 'reddedildi'); } catch (_) {}
    }

    personalizationSave();
  } catch (e) {
    console.warn('Personalization deep analysis error:', e.message);
  }
}

/* PROFİL UI (renderPersonalizationDashboard) 2026-07-18 sprintinde KALDIRILDI:
   #personalization-dashboard container'ı _src.html'e hiç bağlanmamıştı —
   fonksiyon her çağrıda erken dönüyordu (ölü kod, repo-geneli grep kanıtlı).
   personalizationSync/personalizationSyncToSupabase de kaldırıldı: SafeStorage
   her yazımı zaten Supabase'e akıtıyor, ikisi boş no-op'tu. */

/* ═══════════════════════════════════════════════════════════════════════
   KÖKEN TEMİZLİĞİ — kanıtı olmayan yaşam hafızası kaydı silinir
   ═══════════════════════════════════════════════════════════════════════ */

/** 13y'nin `kokenTemizlik` zincirinden kullanıcı başına BİR kez çağrılır.
 *
 *  Emre'nin kararı (2026-08-02): damgasız kayıt KURTARILMAYA ÇALIŞILMAZ,
 *  silinir. Gerekçe: bu kayıtların bir kısmı regex'ten (gerçek), bir kısmı
 *  kapısız LLM emiliminden (uydurulmuş olabilir) doğdu ve ikisi ayırt
 *  EDİLEMEZ — hangisinin hangisi olduğunu bilmediğimiz bir listeyi
 *  "muhtemelen doğrudur" diye tutmak, tam olarak bu mimarinin sildiği şey.
 *  Hafıza sıfırdan, kanıtla dolar.
 *
 *  Havuza sorulmaz (09d/09e temizliğinden farkı budur): FAZ 1 sonrası
 *  yazılan her kanıt zaten kaynaktan kesilmiştir. Bir de havuz penceresine
 *  vurmak, bir yıldan eski ama gerçek bir kaydı haksız yere silerdi. */
export function p6KokenTemizlik() {
  /* Alan adları 09e/09d raporlarıyla ÇAKIŞMAMALI: 13y hepsini tek nesnede
     Object.assign ile birleştirir. `kisi` 09e'nin portre kişileridir;
     buradaki yaşam hafızası kişisi ayrı sayılır (`lmKisi`), yoksa iki
     temizlikten biri diğerinin sayısını sessizce ezerdi. */
  const rapor = { fact: 0, loop: 0, date: 0, lmKisi: 0 };
  try {
    const lm = S._lifeMemory;
    if (!lm) return rapor;
    const suz = (arr, alan) => (arr || []).filter((x) => {
      if (kokenKayitVar(x)) return true;
      rapor[alan]++;
      return false;
    });
    lm.lifeFacts = suz(lm.lifeFacts, 'fact');
    lm.openLoops = suz(lm.openLoops, 'loop');
    lm.importantDates = suz(lm.importantDates, 'date');
    Object.entries(lm.people || {}).forEach(([k, v]) => {
      if (kokenKayitVar(v)) return;
      delete lm.people[k];
      rapor.lmKisi++;
    });
    if (rapor.fact + rapor.loop + rapor.date + rapor.lmKisi) personalizationSave();
  } catch (_) {}
  return rapor;
}

/* window köprüsü — 13y bu modülü İMPORT ETMEZ. Etseydi 09a→13y→09a
   döngüsü doğar ve TDZ riski girerdi; 09d ve 09e'nin omKokenTemizlik /
   ypKokenTemizlik köprüsü de tam bu yüzden window üzerinden kuruluydu. */
if (typeof window !== 'undefined') {
  window.p6KokenTemizlik = p6KokenTemizlik;
  window.p6TarihCoz = p6TarihCoz;
  /* Bağlam üreticileri — 10A Atölye'si kullanıcının BÜTÜNÜNÜ buradan derler
     (_userContextFull). Aynı döngü gerekçesi: 10A bu modülü import etmez. */
  window.p6GetLifeMemoryContext = p6GetLifeMemoryContext;
  window.p5GetRelationshipContext = p5GetRelationshipContext;
  /* Profil evriminin UI-güvenli hâli — Dönüşüm Aynası (13t) buradan okur;
     p1GetTemporalEvolution'ın prompt metni ekrana BASILAMAZ. */
  window.p1TemporalYapisal = p1TemporalYapisal;
}
