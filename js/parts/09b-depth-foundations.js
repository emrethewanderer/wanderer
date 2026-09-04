import { S } from '../state.js';
import { sb, EDGE_FN_BASE, SUMMARY_MODEL } from '../config.js';
import { STORAGE_KEYS, SafeStorage, showToast, localISODate, SecureStorage } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { p, dp, reTest } from './16-i18n-prompts.js';
import { callLLM } from './04-llm-hero-history.js';
import { getSuggestedArchetype } from './12a-archetypes.js';

/* ═══════════════════════════════════════════════════════════════════════
   DERİNLİK & TEMELLER PROFİLİ — Wanderer Felsefesinin Özü
   ═══════════════════════════════════════════════════════════════════════
   4 Derinlik Kavramı : Standart · Hak Etmek · Normal · Layık
   5 Temel            : Öz Sevgi · Öz Saygı · Öz Değer · Öz Güven · Bolluk
   + Kişi Geçiş Haritası: Şu an kim → Olmak istediğim kim
   ═══════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   KATMAN 2: DERİNLİK + TEMELLER
   → 4 Derinlik: Standart · Hak Etmek · Normal · Layık
   → 5 Temel: Öz Sevgi · Öz Saygı · Öz Değer · Öz Güven · Bolluk
   Bu katman kullanıcının zihniyetinin derin yapısını izler.
══════════════════════════════════════════════════════════════ */

/* ── DERINLIK PROFİLİ ──
   score: 0-100 (0 = sorunlu/düşük, 100 = sağlıklı/güçlü)
   3 sinyal olmadan context'e dahil edilmez.
*/

/* ── TEMELLER PROFİLİ ── */

/* ── KİŞİ GEÇİŞ HARİTASI ── */

/* ── OLUMLAMA SİSTEMİ ── */

/* ══════════════════════════════════════════════════════════════
   SİNYAL KALIPLARI
   low  → skoru düşürür (sorun sinyali)
   high → skoru yükseltir (güç sinyali)
══════════════════════════════════════════════════════════════ */

const _DEPTH_SIGNALS = {
  standart: {
    low: [
      /buna\s+alış(kın|tım)/i,
      /hep\s+böyle\s+(oldu|olur)/i,
      /her\s+(ilişki|insan|şey)\s+böyle/i,
      /en\s+azından\s+(şiddet|hakaret|bağır)/i,
      /daha\s+iyisini\s+(bekleyemem|umamam)/i,
      /kabul\s+etmek\s+zorundayım/i,
      /razıyım\s+bu\s+kadarına/i,
      /nasılsa\s+(hep|herkes|böyle)/i,
      /benden\s+daha\s+iyisini\s+beklemez/i,
      /standartlarımı\s+düşürmek\s+(istiyorum|zorundayım|gerekiyor|lazım)/i,
      /standartlarımı\s+(?!yükselt|korumak|koruy)\S*\s*düşür/i,
      /i'?m\s+used\s+to\s+(this|it)/i,
      /(it'?s|that'?s)\s+always\s+been\s+this\s+way/i,
      /every\s+(relationship|person|thing)\s+is\s+like\s+this/i,
      /at\s+least\s+(he|she|they)\s+(don'?t|doesn'?t)\s+(hit|yell|insult)/i,
      /i\s+can'?t\s+expect\s+better/i,
      /i\s+have\s+to\s+accept\s+(this|it)/i,
      /i'?ll\s+settle\s+for\s+this/i,
      /everyone'?s\s+like\s+this\s+anyway/i,
      /doesn'?t\s+expect\s+better\s+from\s+me/i,
      /i\s+(want|need|have)\s+to\s+lower\s+my\s+standards/i
    ],
    high: [
      /bunu\s+kabul\s+etmeyeceğim/i,
      /sınırım\s+bu/i,
      /daha\s+iyisini\s+hak\s+ediyorum/i,
      /standartlarımdan\s+vazgeçmeyeceğim/i,
      /standartlarımı\s+düşürmek\s+istemiyorum/i,
      /standartlarımı\s+düşürmeyeceğim/i,
      /bu\s+benim\s+için\s+yeterli\s+değil/i,
      /i\s+won'?t\s+accept\s+(this|it)/i,
      /this\s+is\s+(my\s+limit|where\s+i\s+draw\s+the\s+line)/i,
      /i\s+deserve\s+better/i,
      /i\s+won'?t\s+give\s+up\s+my\s+standards/i,
      /i\s+don'?t\s+want\s+to\s+lower\s+my\s+standards/i,
      /i\s+won'?t\s+lower\s+my\s+standards/i,
      /this\s+isn'?t\s+enough\s+for\s+me/i
    ]
  },

  hak_etmek: {
    low: [
      /zaten\s+beni\s+kim\s+(sever|ister|saysın)/i,
      /bunu\s+hak\s+etmiyorum/i,
      /neden\s+bana\s+iyi\s+(davransın|baksın)/i,
      /benim\s+için\s+fazla\s+iyi/i,
      /bunu\s+beklemek\s+(fazla|aşırı)\s+(değil\s+mi|mı)/i,
      /şanslıyım\s+ki\s+yanımda/i,
      /neden\s+beni\s+sevsın\s+ki/i,
      /beni\s+kim\s+ister\s+ki/i,
      /kimse\s+benim\s+gibi\s+birini/i,
      /who\s+would\s+(love|want)\s+me\s+anyway/i,
      /i\s+don'?t\s+deserve\s+this/i,
      /why\s+would\s+(he|she|they)\s+treat\s+me\s+well/i,
      /too\s+good\s+for\s+me/i,
      /is(n'?t)?\s+it\s+too\s+much\s+to\s+(expect|ask)/i,
      /i'?m\s+lucky\s+(he|she|they)'?s?\s+(with|by)\s+me/i,
      /why\s+would\s+(he|she|they)\s+love\s+me/i,
      /who\s+would\s+want\s+me/i,
      /nobody\s+wants\s+someone\s+like\s+me/i
    ],
    high: [
      /bunu\s+hak\s+ediyorum/i,
      /iyi\s+muameleyi\s+hak\s+ediyorum/i,
      /değerimi\s+biliyorum/i,
      /sevilmeye\s+layığım/i,
      /i\s+deserve\s+this/i,
      /i\s+deserve\s+(to\s+be\s+treated\s+well|good\s+treatment)/i,
      /i\s+know\s+my\s+worth/i,
      /i'?m\s+worthy\s+of\s+(being\s+)?love/i
    ]
  },

  normal: {
    low: [
      /böyle\s+bir\s+şey\s+mümkün\s+mü\s+ki/i,
      /bu\s+sadece\s+filmde\s+olur/i,
      /bende\s+(olmaz|olamaz)\s+bu/i,
      /hayal\s+(gibi|kadar\s+uzak)/i,
      /naif\s+mi\s+oluyorum/i,
      /aşırı\s+iyimser(lik)?\s+(mi|değil\s+mi)/i,
      /gerçekçi\s+(olmak|konuşmak)\s+gerekirse/i,
      /neden\s+olsun\s+ki\s+benim\s+için/i,
      /is\s+(something|that)\s+like\s+this\s+even\s+possible/i,
      /that\s+only\s+happens\s+in\s+movies/i,
      /that\s+can'?t\s+happen\s+(to|for)\s+me/i,
      /feels\s+like\s+a\s+dream/i,
      /feels\s+(so\s+)?far\s+away/i,
      /am\s+i\s+being\s+naive/i,
      /(too|overly)\s+optimistic/i,
      /to\s+be\s+realistic/i,
      /why\s+would\s+it\s+happen\s+for\s+me/i
    ],
    high: [
      /böyle\s+olması\s+gerekiyor\s+zaten/i,
      /bu\s+benim\s+normalim/i,
      /tabi\s+ki\s+(böyle|olacak)/i,
      /bu\s+olağan\s+bir\s+şey/i,
      /neden\s+olmasın/i,
      /it'?s\s+supposed\s+to\s+be\s+this\s+way/i,
      /this\s+is\s+my\s+normal/i,
      /of\s+course\s+(it\s+will|this\s+is\s+how)/i,
      /this\s+is\s+(ordinary|normal)/i,
      /why\s+not/i
    ]
  },

  layik: {
    low: [
      /böyle\s+birini\s+(bulamam|bulamıyorum)/i,
      /benim\s+için\s+fazla\s+(iyi|büyük|güzel)/i,
      /buna\s+layık\s+değilim/i,
      /kimse\s+benim\s+gibi\s+biriyle\s+olmak\s+istemez/i,
      /bunu\s+(hak\s+etmiyorum|layık\s+görmüyorum\s+kendimi)/i,
      /şanslı\s+(değilim|olmadım)/i,
      /i\s+can'?t\s+find\s+someone\s+like\s+(that|this)/i,
      /i'?m\s+not\s+worthy\s+of\s+this/i,
      /nobody\s+wants\s+to\s+be\s+with\s+someone\s+like\s+me/i,
      /i'?m\s+not\s+lucky/i
    ],
    high: [
      /buna\s+layığım/i,
      /böyle\s+birine\s+layığım/i,
      /kendimi\s+buna\s+layık\s+görüyorum/i,
      /hak\s+ediyorum\s+bunu/i,
      /i'?m\s+worthy\s+of\s+this/i,
      /i'?m\s+worthy\s+of\s+someone\s+like\s+that/i,
      /i\s+see\s+myself\s+as\s+worthy\s+of\s+this/i
    ]
  }
};

const _FOUNDATION_SIGNALS = {
  oz_sevgi: {
    low: [
      /kendimden\s+nefret\s+ediyorum/i,
      /kendime\s+kızıyorum/i,
      /kendimi\s+(sevemiyorum|sevmiyorum)/i,
      /kendime\s+zarar/i,
      /kendimi\s+ihmal\s+ediyorum/i,
      /kendim\s+için\s+hiç\s+zaman\s+yok/i,
      /kendime\s+bakamıyorum/i,
      /kendimi\s+cezalandır/i,
      /i\s+hate\s+myself/i,
      /i'?m\s+angry\s+at\s+myself/i,
      /i\s+can'?t\s+love\s+myself/i,
      /i\s+don'?t\s+love\s+myself/i,
      /(hurting|harming)\s+myself/i,
      /i\s+neglect\s+myself/i,
      /no\s+time\s+for\s+myself/i,
      /i\s+can'?t\s+take\s+care\s+of\s+myself/i,
      /i\s+punish\s+myself/i
    ],
    high: [
      /kendimi\s+seviyorum/i,
      /kendime\s+iyi\s+bakıyorum/i,
      /kendime\s+zaman\s+ayırıyorum/i,
      /kendime\s+karşı\s+nazik/i,
      /i\s+love\s+myself/i,
      /i\s+take\s+good\s+care\s+of\s+myself/i,
      /i\s+make\s+time\s+for\s+myself/i,
      /i'?m\s+kind\s+to\s+myself/i
    ]
  },

  oz_saygi: {
    low: [
      /saygısızlığa\s+katlandım/i,
      /buna\s+tahammül\s+etmek\s+zorundaydım/i,
      /kendime\s+saygım\s+yok/i,
      /nasıl\s+kabul\s+ettim\s+bunu/i,
      /aşağılandım\s+ama\s+(kaldım|durdum|devam\s+ettim)/i,
      /sesimi\s+çıkaramadım/i,
      /sınır\s+(koyamıyorum|koyamadım)/i,
      /i\s+put\s+up\s+with\s+disrespect/i,
      /i\s+had\s+to\s+tolerate\s+(this|it)/i,
      /i\s+have\s+no\s+self.?respect/i,
      /how\s+did\s+i\s+accept\s+this/i,
      /i\s+was\s+humiliated\s+but\s+(stayed|kept\s+going)/i,
      /i\s+couldn'?t\s+speak\s+up/i,
      /i\s+can'?t\s+set\s+boundaries/i,
      /i\s+couldn'?t\s+set\s+boundaries/i
    ],
    high: [
      /buna\s+izin\s+vermem/i,
      /saygısızlığa\s+tahammül\s+etmem/i,
      /sınırımı\s+koydum/i,
      /hayır\s+dedim/i,
      /kabul\s+etmiyorum\s+bunu/i,
      /i\s+won'?t\s+allow\s+this/i,
      /i\s+won'?t\s+tolerate\s+disrespect/i,
      /i\s+set\s+(my|a)\s+boundary/i,
      /i\s+said\s+no/i,
      /i\s+don'?t\s+accept\s+this/i
    ]
  },

  oz_deger: {
    low: [
      /değersiz(im)?/i,
      /işe\s+yaramaz(ım)?/i,
      /kimseye\s+faydası\s+yok\s+benim/i,
      /hiçbir\s+şey\s+yapamıyorum/i,
      /başarısız(ım)?/i,
      /yetersiz(im)?/i,
      /hep\s+mahvediyorum/i,
      /bir\s+işe\s+yaramıyorum/i,
      /i'?m\s+worthless/i,
      /i'?m\s+useless/i,
      /i'?m\s+no\s+use\s+to\s+anyone/i,
      /i\s+can'?t\s+do\s+anything/i,
      /i'?m\s+a\s+failure/i,
      /i'?m\s+not\s+enough/i,
      /i\s+always\s+ruin\s+(it|everything)/i
    ],
    high: [
      /değerimi\s+biliyorum/i,
      /kendime\s+değer\s+veriyorum/i,
      /katkıda\s+bulunuyorum/i,
      /güçlü\s+yanlarım\s+var/i,
      /i\s+know\s+my\s+worth/i,
      /i\s+value\s+myself/i,
      /i\s+(contribute|make\s+a\s+contribution)/i,
      /i\s+have\s+strengths/i
    ]
  },

  oz_guven: {
    low: [
      /kendime\s+güvenemiyorum/i,
      /karar\s+veremiyorum/i,
      /ne\s+yapacağımı\s+bilmiyorum/i,
      /birinin\s+onayı\s+olmadan/i,
      /onayını\s+bekliyorum/i,
      /yanlış\s+mı\s+yapıyorum\s+acaba/i,
      /sürekli\s+şüphe\s+ediyorum/i,
      /başkası\s+ne\s+der/i,
      /i\s+can'?t\s+trust\s+myself/i,
      /i\s+can'?t\s+make\s+decisions/i,
      /i\s+don'?t\s+know\s+what\s+to\s+do/i,
      /without\s+someone'?s\s+approval/i,
      /i'?m\s+waiting\s+for\s+(his|her|their)\s+approval/i,
      /am\s+i\s+doing\s+(this\s+)?wrong/i,
      /i\s+constantly\s+doubt\s+myself/i,
      /what\s+will\s+(people|others)\s+(say|think)/i
    ],
    high: [
      /kendi\s+kararımı\s+aldım/i,
      /kendime\s+güveniyorum/i,
      /biliyorum\s+ne\s+yapacağımı/i,
      /kimsenin\s+onayına\s+ihtiyacım\s+yok/i,
      /i\s+made\s+my\s+own\s+decision/i,
      /i\s+trust\s+myself/i,
      /i\s+know\s+what\s+to\s+do/i,
      /i\s+don'?t\s+need\s+anyone'?s\s+approval/i
    ]
  },

  bolluk: {
    low: [
      /o\s+olmadan\s+(yapamam|olmaz)/i,
      /ondan\s+başkası\s+(olmaz|olmayacak)/i,
      /tek\s+o\s+var/i,
      /bir\s+daha\s+bulamam/i,
      /bu\s+(son|tek)\s+şansım/i,
      /onsuz\s+hiçbir\s+şey\s+olmaz/i,
      /bir\s+daha\s+beni\s+seven\s+olmaz/i,
      /i\s+can'?t\s+(do\s+it\s+|live\s+)?without\s+(him|her|them|it)/i,
      /there'?s\s+no\s+one\s+else\s+but\s+(him|her)/i,
      /(he'?s|she'?s)\s+the\s+only\s+one/i,
      /i'?ll\s+never\s+find\s+(another|anyone\s+else)/i,
      /this\s+is\s+my\s+(last|only)\s+chance/i,
      /nothing\s+works\s+without\s+(him|her|it)/i,
      /no\s+one\s+will\s+ever\s+love\s+me\s+again/i
    ],
    high: [
      /başka\s+fırsatlar\s+da\s+(var|olacak)/i,
      /hayat\s+devam\s+edecek/i,
      /Allah'ın\s+nimeti\s+bol/i,
      /başka\s+yollar\s+da\s+var/i,
      /kendi\s+içimde\s+huzurlu/i,
      /there\s+are\s+other\s+opportunities/i,
      /life\s+goes\s+on/i,
      /god'?s\s+blessings\s+are\s+abundant/i,
      /there\s+are\s+other\s+ways/i,
      /i'?m\s+at\s+peace\s+within\s+myself/i
    ]
  }
};

/* ── KİŞİ GEÇİŞ KALIPLARI ── */
const _TRANSITION_PATTERNS = {
  current_desc: [
    /ben\s+şu\s+an\s+(.{10,80})\s+(birisiyim|biriyim)/i,
    /kendimi\s+(.{10,80})\s+olarak\s+görüyorum/i,
    /hep\s+(.{10,80})\s+(biri\s+oldum|biriyim)/i,
    /sürekli\s+(.{10,80})\s+yapıyorum/i,
    /i(?:'m| am)\s+(?:currently\s+)?(?:a|an)?\s*(.{10,80}?)\s+person\b/i,
    /i\s+see\s+myself\s+as\s+(.{10,80})/i,
    /i(?:'ve| have)\s+always\s+been\s+(?:a|an)?\s*(.{10,80})/i,
    /i\s+keep\s+(.{10,80})/i
  ],
  desired_desc: [
    /olmak\s+istiyorum[^.]*?(.{10,80})/i,
    /olmak\s+istediğim\s+kişi\s+(.{10,80})/i,
    /o\s+kişi\s+(.{10,60})\s+(nasıl|gibi)/i,
    /hayallerim(deki|deki)\s+kişi\s+(.{10,60})/i,
    /istediğim\s+hayatı\s+yaşayan\s+kişi\s+(.{10,60})/i,
    /i\s+want\s+to\s+be[^.]*?(.{10,80})/i,
    /the\s+person\s+i\s+want\s+to\s+be\s+(.{10,80})/i,
    /that\s+person\s+(.{10,60})\s+(how|like)/i,
    /the\s+person\s+living\s+my\s+dream\s+life\s+(.{10,60})/i
  ]
};

/* ══════════════════════════════════════════════════════════════
   SKOR GÜNCELLEME
══════════════════════════════════════════════════════════════ */

function _dfUpdateScore(obj, isLow, snippet) {
  /* Skor state'te `null` doğar — "hiç ölçülmedi" hâli görünür kalsın diye
     (bkz. js/state/depth.js). İlk sinyal geldiğinde birikim 50'den başlar:
     bu bir varsayılan DEĞER değil, delta matematiğinin sıfır noktasıdır.
     Dışarıya açılan her okuma signals_count kapısından geçtiği için bu 50
     hiçbir zaman "ölçüm" olarak görünmez. */
  /* KOKEN-MUAF: nötr hesap tabanı — dışarı açılan okuma signals_count kapılı */
  const taban = (typeof obj.score === 'number' && isFinite(obj.score)) ? obj.score : 50;
  const prev = taban;
  const delta = isLow ? -6 : +6;
  obj.score = Math.min(95, Math.max(5, taban + delta));
  obj.direction = obj.score > prev ? 'up' : obj.score < prev ? 'down' : 'flat';
  obj.signals_count++;

  const entry = { text: snippet.slice(0, 60), type: isLow ? 'low' : 'high', ts: Date.now() };
  obj.evidence.push(entry);
  if (obj.evidence.length > 5) obj.evidence.shift();
}

/* ══════════════════════════════════════════════════════════════
   ANALİZ FONKSİYONLARI
══════════════════════════════════════════════════════════════ */

export function dfAnalyzeDepthSignals(text) {
  for (const [key, patterns] of Object.entries(_DEPTH_SIGNALS)) {
    const obj = S._depthProfile[key];
    for (const r of patterns.low) {
      if (r.test(text)) { _dfUpdateScore(obj, true, text.slice(0, 60)); break; }
    }
    for (const r of patterns.high) {
      if (r.test(text)) { _dfUpdateScore(obj, false, text.slice(0, 60)); break; }
    }
  }
}

export function dfAnalyzeFoundationSignals(text) {
  for (const [key, patterns] of Object.entries(_FOUNDATION_SIGNALS)) {
    const obj = S._foundationsProfile[key];
    for (const r of patterns.low) {
      if (r.test(text)) { _dfUpdateScore(obj, true, text.slice(0, 60)); break; }
    }
    for (const r of patterns.high) {
      if (r.test(text)) { _dfUpdateScore(obj, false, text.slice(0, 60)); break; }
    }
  }
  dfAnalyzeFinancialAbundance(text);
}

const _UNWANTED_PATTERNS = [
  /olmak\s+istemiyorum[^.]*?(.{10,80})/i,
  /böyle\s+biri\s+olmak\s+istemiyorum/i,
  /o\s+kişi\s+gibi\s+olmak\s+istemiyorum/i,
  /i\s+don'?t\s+want\s+to\s+be\s+(.{10,60})/i,
  /i\s+don'?t\s+want\s+to\s+become\s+(.{10,60})/i
];

const _DOMAIN_SIGNALS = {
  bireysel: [/bireysel\s+hayat/i, /kişisel\s+olarak/i, /yalnız\s+kaldığımda/i, /tek\s+başıma/i, /kendim\s+için/i, /personal\s+life/i, /as\s+a\s+person/i],
  iliski:   [/ilişki(de|mde|miz)?/i, /partner(im|im|le)?/i, /sevgilim/i, /eşim/i, /aşk/i, /relationship/i, /partner/i, /romantic/i],
  /* "işte" söylem partiküleyle karışmasın — \b + spesifik ekleler kullan */
  is:       [/\biş\s+hayatı/i, /\biş\s+yeri/i, /\biş(im|imde|inde|in|e)\b/i, /kariyer/i, /meslek/i, /çalışmada\b/i, /work|career|job|professional/i]
};

function _dfDetectDomain(text) {
  for (const [domain, patterns] of Object.entries(_DOMAIN_SIGNALS)) {
    if (reTest(patterns, text)) return domain;
  }
  return null;
}

export function dfExtractPersonTransition(text) {
  for (const r of _TRANSITION_PATTERNS.current_desc) {
    const m = r.exec(text);
    if (m) {
      const desc = (m[1] || '').trim().slice(0, 120);
      if (desc.length > 8) {
        S._personTransition.current.description = desc;
        const domain = _dfDetectDomain(text);
        if (domain) S._personTransition.domains[domain].current = desc;
        S._personTransition.last_updated = new Date().toISOString();
      }
      break;
    }
  }
  // Kullanıcı OİK (10D) ile kendi "olmak istediği kişi"sini mühürlediyse, sohbet
  // regex'i o kartın aynasını (desired.description) EZMESİN — bunun yerine sinyal
  // yeniden-tasarım tohumuna (seedHint) düşer. Kart yoksa eski davranış sürer.
  const _oikSealed = (() => { try { return !!(window.oikGetCard && window.oikGetCard()); } catch (_) { return false; } })();
  for (const r of _TRANSITION_PATTERNS.desired_desc) {
    const m = r.exec(text);
    if (m) {
      const desc = (m[1] || m[2] || '').trim().slice(0, 120);
      if (desc.length > 8) {
        if (_oikSealed) {
          try { window.oikSeedDraft && window.oikSeedDraft({ baslik: desc }); } catch (_) {}
        } else {
          S._personTransition.desired.description = desc;
          const domain = _dfDetectDomain(text);
          if (domain) S._personTransition.domains[domain].desired = desc;
          S._personTransition.last_updated = new Date().toISOString();
        }
      }
      break;
    }
  }
  // Olmak istemediğin kişi tespiti (E3)
  for (const r of _UNWANTED_PATTERNS) {
    const m = r.exec(text);
    if (m) {
      const desc = (m[1] || text).trim().slice(0, 120);
      if (desc.length > 8 && !S._personTransition.unwanted.description) {
        S._personTransition.unwanted.description = desc;
        S._personTransition.last_updated = new Date().toISOString();
      }
      break;
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   BAĞLAM ÜRETİMİ — LLM'e gönderilir
══════════════════════════════════════════════════════════════ */

/* Kavram anahtarları ve TR etiketleri — LLM bağlamının dili budur.
   Derin Çalışma tezgâhı (13A) da kavram LİSTESİNİ buradan okur; listeyi
   ikinci kez yazmaz. Tezgâhtaki GÖRÜNEN ad i18n'den gelir, bu etiketler
   orada TR fallback'i olur. */
export const _DF_DEPTH_LABELS = {
  standart:  'Standart',
  hak_etmek: 'Hak Etmek',
  normal:    'Normal',
  layik:     'Layık'
};

export const _DF_FOUND_LABELS = {
  oz_sevgi: 'Öz Sevgi',
  oz_saygi: 'Öz Saygı',
  oz_deger: 'Öz Değer',
  oz_guven: 'Öz Güven',
  bolluk:   'Bolluk Bilinci'
};

/* Mertebe eşikleri TEK yerde. Etiket TR sabittir (prompt dili); UI i18n
   yapabilsin diye anahtar ayrı açılır — eşikler iki yerde tutulmasın. */
export function dfScoreKey(score) {
  if (score < 30) return 'dusuk';
  if (score < 50) return 'orta_dusuk';
  if (score < 70) return 'orta';
  return 'guclu';
}

const _DF_SCORE_LABELS = { dusuk: 'DÜŞÜK', orta_dusuk: 'ORTA-DÜŞÜK', orta: 'ORTA', guclu: 'GÜÇLÜ' };

export function _dfScoreLabel(score) {
  return _DF_SCORE_LABELS[dfScoreKey(score)];
}

export function dfGetAffirmationContext() {
  if (!S._affirmation.text) return '';
  const streak = S._affirmation.practice_streak;
  const practiced = S._affirmation.practiced_today ? 'bugün çalıştı' : 'bugün henüz çalışmadı';
  return `[OLUMLAMA PRATİĞİ]: Kullanıcının aktif olumlaması: "${S._affirmation.text}" — ${practiced}, seri: ${streak} gün. Konuşma uygunsa olumlamayı hatırlat veya onunla derinleş. Geçiş anı yaşandıysa olumlama ile bağlantılandır.`;
}

export function dfGetDepthContext() {
  const lines = [];

  for (const [key, label] of Object.entries(_DF_DEPTH_LABELS)) {
    const obj = S._depthProfile[key];
    if (obj.signals_count < 3) continue;
    if (obj.score >= 70) continue; // güçlü olanları gösterme — odak düşük olanlara
    const scoreLabel = _dfScoreLabel(obj.score);
    const lastEvidence = obj.evidence[obj.evidence.length - 1]?.text || '';
    const dir = obj.direction === 'up' ? '↑' : obj.direction === 'down' ? '↓' : '→';
    lines.push(`• ${label}: ${scoreLabel} (${obj.score}/100 ${dir}) — Son sinyal: "${lastEvidence}"`);
  }

  if (!lines.length) return '';
  return '--- DERİNLİK PROFİLİ (Felsefenin 4 Kavramı) ---\n' +
    'Bu kullanıcının zihniyetinin derinlikleri:\n' +
    lines.join('\n') + '\n' +
    p('prompt.depth_foundations.directive');
}

export function dfGetFoundationsContext() {
  const low = [];
  const strong = [];

  for (const [key, label] of Object.entries(_DF_FOUND_LABELS)) {
    const obj = S._foundationsProfile[key];
    if (obj.signals_count < 3) continue;
    const sl = _dfScoreLabel(obj.score);
    const lastEvidence = obj.evidence[obj.evidence.length - 1]?.text || '';
    const dir = obj.direction === 'up' ? '↑' : obj.direction === 'down' ? '↓' : '→';
    if (obj.score < 50) {
      low.push(`• ${label}: ${sl} (${obj.score}/100 ${dir}) — "${lastEvidence}"`);
    } else if (obj.score >= 70) {
      strong.push(`• ${label}: GÜÇLÜ (${obj.score}/100)`);
    }
  }

  if (!low.length && !strong.length) return '';

  const parts = ['--- TEMELLER PROFİLİ (Öz Sevgi · Saygı · Değer · Güven · Bolluk) ---'];
  if (low.length) {
    parts.push('Zayıf temeller (dikkat et):');
    parts.push(low.join('\n'));
  }
  if (strong.length) {
    parts.push('Güçlü temeller (destekle):');
    parts.push(strong.join('\n'));
  }
  parts.push(p('prompt.depth_foundations.foundations_directive'));

  return parts.join('\n');
}

export function dfGetPersonTransitionContext() {
  const pt = S._personTransition;
  const hasCurrent  = pt.current.description.length > 5;
  const hasDesired  = pt.desired.description.length > 5;
  const hasUnwanted = pt.unwanted.description.length > 5;

  const lines = ['--- KİŞİ GEÇİŞ HARİTASI ---'];
  if (hasCurrent)  lines.push(`Şu an olduğu kişi: "${pt.current.description}"`);
  if (hasDesired)  lines.push(`Olmak istediği kişi: "${pt.desired.description}"`);
  if (hasUnwanted) lines.push(`Olmak İSTEMEDİĞİ kişi: "${pt.unwanted.description}" — bu da geçişin bir parçası; negatif tanım olarak kullan.`);

  // Hedef arketip — "Olmak İstediğin Kişi" kartı
  try {
    const targetArch = getSuggestedArchetype();
    if (targetArch) {
      lines.push(`\n--- OLMAK İSTEDİĞİN KİŞİ (Hedef Arketip) ---`);
      lines.push(`Hedef kişi: ${targetArch.name} ${targetArch.sub}`);
      lines.push(`Fısıltısı: "${targetArch.whisper}"`);
      lines.push(`Dersi: "${targetArch.lesson}"`);
      if (targetArch.dusunceler?.length) lines.push(`Bu kişinin düşünceleri: ${targetArch.dusunceler.slice(0, 3).map(d => '"' + d + '"').join(', ')}`);
      if (targetArch.inanclar?.length) lines.push(`Bu kişinin inançları: ${targetArch.inanclar.slice(0, 3).map(d => '"' + d + '"').join(', ')}`);
      if (targetArch.davranislar?.length) lines.push(`Bu kişinin davranışları: ${targetArch.davranislar.slice(0, 3).map(d => '"' + d + '"').join(', ')}`);
      lines.push(p('prompt.depth_foundations.target_person_directive'));
    }
  } catch (_) {}

  // Alan bazlı farklı kimlikler (Kitap s.21: farklı kişiler barındırırsın)
  const domainLines = [];
  const domainLabels = { bireysel: 'Bireysel hayatında', iliski: 'İlişkisinde', is: 'İş hayatında' };
  for (const [key, label] of Object.entries(domainLabels)) {
    const d = pt.domains[key];
    if (d.current || d.desired) {
      const parts = [];
      if (d.current) parts.push(`"${d.current}"`);
      if (d.desired) parts.push(`→ olmak istediği: "${d.desired}"`);
      domainLines.push(`• ${label}: ${parts.join(' ')}`);
    }
  }
  if (domainLines.length) {
    lines.push('Alan bazlı kişi farklılıkları (aynı insan, farklı alanlar):');
    lines.push(...domainLines);
  }

  if (lines.length <= 1) return '';

  lines.push(p('prompt.depth_foundations.transition_directive'));
  return lines.join('\n');
}

/* ══════════════════════════════════════════════════════════════
   DERINLIK MOD BAĞLAMI (mevcut buildDepthModeContext'i destekler)
══════════════════════════════════════════════════════════════ */

export function dfGetActiveDepthTarget() {
  // Hangi derinlik kavramına odaklanılmalı? En düşük skorlu + yeterli sinyal olan
  const candidates = Object.entries(S._depthProfile)
    .filter(([_, obj]) => obj.signals_count >= 2)
    .sort(([, a], [, b]) => a.score - b.score);
  if (!candidates.length) return null;
  return { key: candidates[0][0], label: _DF_DEPTH_LABELS[candidates[0][0]], score: candidates[0][1].score };
}

export function dfGetActiveFoundationTarget() {
  const candidates = Object.entries(S._foundationsProfile)
    .filter(([_, obj]) => obj.signals_count >= 2)
    .sort(([, a], [, b]) => a.score - b.score);
  if (!candidates.length) return null;
  return { key: candidates[0][0], label: _DF_FOUND_LABELS[candidates[0][0]], score: candidates[0][1].score };
}

/* ══════════════════════════════════════════════════════════════
   PERSİSTANS — Supabase-backed Storage
══════════════════════════════════════════════════════════════ */

const _DF_KEYS = {
  depth:       uid => `etw_df_depth_${uid}`,
  foundations: uid => `etw_df_foundations_${uid}`,
  transition:  uid => `etw_df_transition_${uid}`,
  affirmation: uid => `etw_df_affirmation_${uid}`,
  beliefs:     uid => STORAGE_KEYS.DF_BELIEFS(uid),
  choices:     uid => STORAGE_KEYS.DF_CHOICES(uid),
  worksheets:  uid => STORAGE_KEYS.DF_WORKSHEETS(uid)
};

export function dfSave() {
  if (!S.currentUser?.id) return;
  const uid = S.currentUser.id;
  SafeStorage.set(_DF_KEYS.depth(uid), S._depthProfile);
  SafeStorage.set(_DF_KEYS.foundations(uid), S._foundationsProfile);
  SafeStorage.set(_DF_KEYS.transition(uid), S._personTransition);
  SafeStorage.set(_DF_KEYS.affirmation(uid), S._affirmation);
  dfSaveExtended();
}

export function dfLoad() {
  if (!S.currentUser?.id) return;
  const uid = S.currentUser.id;
  try {
  const d = SafeStorage.get(_DF_KEYS.depth(uid));
  if (d) {
    for (const k of Object.keys(S._depthProfile)) {
      if (d[k]) Object.assign(S._depthProfile[k], d[k]);
    }
  }
  const f = SafeStorage.get(_DF_KEYS.foundations(uid));
  if (f) {
    for (const k of Object.keys(S._foundationsProfile)) {
      if (f[k]) Object.assign(S._foundationsProfile[k], f[k]);
    }
  }
  const tr = SafeStorage.get(_DF_KEYS.transition(uid));
  if (tr) Object.assign(S._personTransition, tr);
  const a = SafeStorage.get(_DF_KEYS.affirmation(uid));
  if (a) Object.assign(S._affirmation, a);
    // Gün başında practiced_today sıfırla
    const today = localISODate();
    if (S._affirmation.last_practiced && S._affirmation.last_practiced < today) {
      S._affirmation.practiced_today = false;
    }
  } catch (_) {}
  dfLoadExtended();
}

export async function dfSyncToSupabase() {
  // SafeStorage artık otomatik olarak Supabase'e yazıyor — ekstra sync gerekmez
}

export async function dfSyncFromSupabase() {
  // storageInit() ile tüm veriler zaten belleğe yüklendi — sadece state'e aktar
  dfLoad();
}

/* ══════════════════════════════════════════════════════════════
   KATMAN 1: FARKINDALIK ÇERÇEVESİ
   → Arkadaki Sen / Hayattaki Sen ayrımı
   → Vasıta vs. Hedef uyarısı
══════════════════════════════════════════════════════════════ */

const _VASITA_PATTERNS = [
  /nasıl\s+(yapayım|yapabilirim|edeyim|ederim)/i,
  /ne\s+(söylemeliyim|yapmalıyım|diyeyim|etmeliyim)/i,
  /taktik\s*(ver|öner|iste)/i,
  /bir\s+yol\s+göster/i,
  /adım\s+adım\s+anlat/i,
  /how\s+(do\s+i|should\s+i|can\s+i)/i,
  /what\s+should\s+i\s+(say|do|tell)/i,
  /give\s+me\s+(a\s+tip|advice|steps)/i,
  /step\s+by\s+step/i
];

const _ARKADAKI_SEN_SIGNALS = [
  /ben\s+(aslında|gerçekte)\s+(.{5,40})\s+(istiyorum|inanıyorum)/i,
  /bir\s+adım\s+geriye\s+çek/i,
  /kendimi\s+(dışarıdan|uzaktan)\s+izl/i,
  /fark\s+ettim\s+ki\s+ben/i,
  /gözleml(iyorum|ediyorum)\s+kendimi/i,
  /realize|observe\s+myself|step\s+back/i
];

export function dfDetectVasitaFocus(text) {
  return reTest(_VASITA_PATTERNS, text);
}

export function dfDetectArkadakiSen(text) {
  return reTest(_ARKADAKI_SEN_SIGNALS, text);
}

export function dfGetAwarenessContext(text) {
  const parts = [];

  if (dfDetectVasitaFocus(text)) {
    parts.push(p('prompt.awareness.vasita_warning'));
  }

  if (dfDetectArkadakiSen(text)) {
    parts.push(p('prompt.awareness.arkadaki_sen_detected'));
  }

  if (dfDetectHayalWatching(text)) {
    parts.push(p('prompt.awareness.hayal_watching'));
  }

  if (dfDetectHayalDisaridan(text)) {
    parts.push(p('prompt.awareness.hayal_disaridan'));
  }

  if (dfDetectOlumlamaSinmiyor(text)) {
    parts.push(p('prompt.awareness.olumlama_sinmiyor'));
  }

  if (dfDetectAmacYok(text)) {
    parts.push(p('prompt.awareness.amac_yok'));
  }

  return parts.length ? parts.join('\n') : '';
}

/* ══════════════════════════════════════════════════════════════
   KATMAN 3: GEÇİŞ ARAÇLARI
   → Hayal Alemi çalışması
   → Geri Bildirim Döngüsü tespiti
   → Üstel Büyüme izleme
══════════════════════════════════════════════════════════════ */

/* ── HAYAL ALEMİ PRATİĞİ ── */
let _hayalAlemi = {
  last_practice: null,
  practice_count: 0,
  current_vision: '',
  practice_history: []
};

const _HAYAL_WATCHING_SIGNALS = [
  /hayal\s+ediyorum\s+ama\s+(değişmiyor|olmuyor|işe\s+yaramıyor)/i,
  /vizualizasyon\s+(yapt|yapıyor)ım\s+ama/i,
  /hayal\s+kuruyorum\s+ama\s+gerçek\s+olmuyor/i,
  /i\s+imagine\s+but\s+(nothing\s+changes|it\s+doesn'?t\s+work)/i
];

const _HAYAL_DISARIDAN_SIGNALS = [
  /öyle\s+biri\s+olmak\s+istiyorum/i,
  /o\s+kişi\s+gibi\s+olmak\s+istiyorum/i,
  /keşke\s+(.{5,40})\s+(olsam|olabilsem)/i,
  /böyle\s+biri\s+olmayı\s+(isterdim|istiyorum)/i,
  /i\s+want\s+to\s+be\s+(like\s+)?that\s+(kind\s+of\s+)?person/i,
  /i\s+wish\s+i\s+(could|were|was)/i
];

const _OLUMLAMA_SINMIYOR_SIGNALS = [
  /olumlama(ları)?\s+(yapıyorum|söylüyorum|okuyorum)\s+ama\s+(inanmıyorum|sinmiyor|hissetmiyorum|boş\s+geliyor)/i,
  /tekrar\s+ediyorum\s+ama\s+(hissetmiyorum|içime\s+sinmiyor)/i,
  /söylüyorum\s+ama\s+inanmıyorum/i,
  /affirmations?\s+(don'?t|doesn'?t)\s+(work|feel|resonate)/i,
  /i\s+say\s+it\s+but\s+(don'?t|i\s+can'?t)\s+believe/i
];

export function dfDetectHayalDisaridan(text) {
  return reTest(_HAYAL_DISARIDAN_SIGNALS, text);
}

export function dfDetectOlumlamaSinmiyor(text) {
  return reTest(_OLUMLAMA_SINMIYOR_SIGNALS, text);
}

const _AMAC_SIGNALS = [
  /amacım\s+(yok|ne\s+bilmiyorum)/i,
  /neden\s+yaşıyorum/i,
  /hayatımın\s+anlamı\s+(ne|yok)/i,
  /bir\s+şey\s+için\s+yaşamıyorum/i,
  /motivasyonum\s+(yok|kalmadı)/i,
  /sabah\s+kalkamıyorum/i,
  /no\s+purpose|don'?t\s+know\s+why\s+i/i,
  /can'?t\s+get\s+out\s+of\s+bed/i,
  /what'?s\s+the\s+point/i
];

export function dfDetectHayalWatching(text) {
  return reTest(_HAYAL_WATCHING_SIGNALS, text);
}

export function dfDetectAmacYok(text) {
  return reTest(_AMAC_SIGNALS, text);
}

export function dfGetHayalAlemiContext() {
  if (!_hayalAlemi.current_vision && _hayalAlemi.practice_count === 0) return '';
  const parts = [];
  if (_hayalAlemi.current_vision) {
    parts.push(p('prompt.hayal_alemi.active_vision', { vision: _hayalAlemi.current_vision }));
  }
  if (_hayalAlemi.practice_count > 0) {
    parts.push(p('prompt.hayal_alemi.practice_info', { count: _hayalAlemi.practice_count }));
  }
  return parts.join('\n');
}

export function dfExtractHayalVision(text) {
  const m = /kendimi\s+(.{5,80})\s+olarak\s+(görüyorum|hayal\s+ediyorum)/i.exec(text);
  if (m) {
    _hayalAlemi.current_vision = m[1].trim().slice(0, 100);
    _hayalAlemi.last_practice = new Date().toISOString();
    _hayalAlemi.practice_count++;
    _hayalAlemi.practice_history.push({ date: localISODate(), vision_snippet: _hayalAlemi.current_vision.slice(0, 60) });
    if (_hayalAlemi.practice_history.length > 30) _hayalAlemi.practice_history.shift();
  }
}

/* ── GERİ BİLDİRİM DÖNGÜSÜ TESPİTİ ── */

const _FEEDBACK_LOOP_PATTERNS = {
  negative: [
    /hep\s+(aynı|böyle)\s+(oluyor|yaşıyorum|yapıyorum)/i,
    /her\s+seferinde\s+aynı\s+şey/i,
    /döngüden\s+çıkamıyorum/i,
    /bu\s+hep\s+böyle\s+(olacak|devam\s+edecek)/i,
    /ne\s+yapsam\s+değişmiyor/i,
    /yine\s+aynı\s+yere\s+geldim/i,
    /always\s+the\s+same/i,
    /can'?t\s+break\s+(the|this)\s+(cycle|loop|pattern)/i,
    /stuck\s+in\s+(a|the)\s+(loop|cycle)/i
  ],
  awareness: [
    /bir\s+döngü\s+olduğunu\s+görüyorum/i,
    /tekrar\s+ettiğimi\s+fark\s+ed/i,
    /aynı\s+inancı\s+besliyorum/i,
    /i\s+(see|notice|realize)\s+(the|a)\s+(pattern|cycle|loop)/i
  ]
};

export function dfDetectFeedbackLoop(text) {
  const neg = reTest(_FEEDBACK_LOOP_PATTERNS.negative, text);
  const aware = reTest(_FEEDBACK_LOOP_PATTERNS.awareness, text);
  if (aware) return 'awareness';
  if (neg) return 'stuck';
  return null;
}

export function dfGetFeedbackLoopContext(text) {
  const state = dfDetectFeedbackLoop(text);
  if (!state) return '';
  if (state === 'stuck') return p('prompt.feedback_loop.stuck');
  if (state === 'awareness') return p('prompt.feedback_loop.awareness');
  return '';
}

/* ── ÜSTEL BÜYÜME İZLEME ── */

export function dfGetExponentialGrowthContext() {
  const pt = S._personTransition;
  if (!pt.daily_steps || pt.daily_steps.length < 5) return '';

  const recent = pt.daily_steps.slice(-14);
  const yesCount = recent.filter(s => s.answer === 'yes').length;
  const ratio = yesCount / recent.length;

  if (ratio >= 0.7 && recent.length >= 7) {
    return p('prompt.exponential_growth.momentum', { days: recent.length, yesCount });
  }
  if (ratio >= 0.4 && recent.length >= 5) {
    return p('prompt.exponential_growth.building', { yesCount, total: recent.length });
  }
  return '';
}

/* ══════════════════════════════════════════════════════════════
   KATMAN 4: RUHSAL ZEMİN
   → Allah'a tevekkül, dua, niyet
   → "Tek başına değilsin" hatırlatması
══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   TRAVMA MUAFİYETİ — Çocukluk/İstismar Tespiti
   Kitap s.83-84: "Bilinçli olarak seçim yapmadığın küçük
   yaşların hariç." Bu sinyaller tespit edildiğinde
   "Mesele Sensin" çerçevesi uygulanmaz — şefkat modu aktif.
══════════════════════════════════════════════════════════════ */

const _TRAUMA_SIGNALS = [
  /çocukluğumda\s+(yaşadım|gördüm|oldu|maruz\s+kaldım)/i,
  /küçükken\s+(yaşadım|acı\s+çektim|zorla|istismar)/i,
  /babam\s+(vurdu|dövdü|istismar|şiddet|taciz)/i,
  /annem\s+(vurdu|dövdü|istismar|şiddet|taciz)/i,
  /çocukluk\s+(travması|acısı|istismarı|şiddeti)/i,
  /cinsel\s+(istismar|taciz|saldırı)/i,
  /fiziksel\s+(istismar|şiddet|kötü\s+muamele)/i,
  /duygusal\s+(istismar|şiddet|ihmal)/i,
  /ailem\s+(beni\s+terk\s+etti|beni\s+bıraktı|beni\s+sevmedi)/i,
  /küçüklüğümde\s+yalnız\s+bırakıldım/i,
  /as\s+a\s+child\s+i\s+(was\s+abused|suffered|was\s+hurt)/i,
  /childhood\s+(trauma|abuse|neglect|violence)/i,
  /my\s+(father|mother|parent)\s+(abused|hit|hurt|molested)/i,
  /sexual\s+(abuse|assault|trauma)/i,
  /physical\s+(abuse|violence)/i,
  /emotional\s+(abuse|neglect)/i
];

export function dfDetectTrauma(text) {
  return reTest(_TRAUMA_SIGNALS, text);
}

export function dfGetTraumaContext(text) {
  if (!dfDetectTrauma(text)) return '';
  return p('prompt.trauma.exemption');
}

const _SPIRITUAL_SIGNALS = {
  struggle: [
    /ne\s+yapacağımı\s+(bilmiyorum|şaşırdım)/i,
    /çaresiz(im|lik)/i,
    /elimden\s+bir\s+şey\s+gelmiyor/i,
    /umutsuz/i,
    /tüm\s+kapılar\s+kapandı/i,
    /hopeless|helpless|don'?t\s+know\s+what\s+to\s+do/i
  ],
  gratitude: [
    /Allah'a\s+şükür/i,
    /şükrediyorum/i,
    /hamdolsun/i,
    /elhamdülillah/i,
    /grateful|thankful\s+to\s+god/i
  ]
};

export function dfDetectSpiritualMoment(text) {
  if (reTest(_SPIRITUAL_SIGNALS.struggle, text)) return 'struggle';
  if (reTest(_SPIRITUAL_SIGNALS.gratitude, text)) return 'gratitude';
  return null;
}

export function dfGetSpiritualContext(text) {
  const state = dfDetectSpiritualMoment(text);
  if (!state) return '';
  if (state === 'struggle') return p('prompt.spiritual.struggle');
  if (state === 'gratitude') return p('prompt.spiritual.gratitude');
  return '';
}

/* ══════════════════════════════════════════════════════════════
   KALP-ZİHİN DENGESİ (Prensip III)
   Kalp: İdrakin, anlamanın, kavramanın asıl yeri (Kur'an).
   Zihin: Düşünme ve rasyonel akıl yürütme aleti.
   İkisi birlikte: Kalpteki idrakı zihinle anlamlandırıp harekete geçmek.
══════════════════════════════════════════════════════════════ */

const _KALP_ZIHIN_SIGNALS = {
  zihin_dominant: [
    /mantıklı\s+olan\s+şu/i,
    /rasyonel\s+düşünürsem/i,
    /mantıken/i,
    /toplum\s+(ne\s+der|beklentisi)/i,
    /doğru\s+olan\s+şey\s+(şu|bu)/i,
    /herkes\s+(.{3,20})\s+yapıyor/i,
    /aklım\s+(.{3,30})\s+diyor/i,
    /düşününce\s+(.{3,30})\s+yapmalıyım/i,
    /logically|rationally|makes\s+sense/i,
    /what\s+people\s+expect/i,
    /my\s+mind\s+(says|tells|thinks)/i
  ],
  kalp_speaking: [
    /içimden\s+(gelen|bir\s+ses)/i,
    /kalbim\s+(.{3,30})\s+(diyor|söylüyor)/i,
    /bir\s+şey\s+(var|diyor)\s+içimde/i,
    /anlayamıyorum\s+ama\s+hissediyorum/i,
    /açıklayamıyorum\s+ama/i,
    /sezgim/i,
    /içimde\s+bir\s+bilme/i,
    /something\s+inside\s+(me|tells)/i,
    /i\s+(feel|sense|know)\s+it\s+but\s+can'?t\s+explain/i,
    /my\s+(heart|gut|intuition)\s+(tells|says|knows)/i
  ]
};

export function dfDetectKalpZihinState(text) {
  const zihin = reTest(_KALP_ZIHIN_SIGNALS.zihin_dominant, text);
  const kalp = reTest(_KALP_ZIHIN_SIGNALS.kalp_speaking, text);
  if (zihin && !kalp) return 'zihin_dominant';
  if (kalp && !zihin) return 'kalp_speaking';
  if (kalp && zihin) return 'birlikte';
  return null;
}

export function dfGetKalpZihinContext(text) {
  const state = dfDetectKalpZihinState(text);
  if (!state) return '';
  if (state === 'zihin_dominant') return p('prompt.kalp_zihin.zihin_dominant');
  if (state === 'kalp_speaking') return p('prompt.kalp_zihin.kalp_speaking');
  if (state === 'birlikte') return p('prompt.kalp_zihin.birlikte');
  return '';
}

/* ══════════════════════════════════════════════════════════════
   BİRLEŞİK FELSEFİ BAĞLAM ÜRETİCİ
   Tüm yeni katmanları tek bir fonksiyonla toplar
══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   PRATİK KAVRAMLAR TESPİTİ
   → Kendini Baltalamak · Kafaya Takmak · Olumsuz Düşünce · Stres
══════════════════════════════════════════════════════════════ */

const _KENDINI_BALTALA_SIGNALS = [
  /fırsatı\s+(kaçırdım|elinden\s+gitti|mahvettim)/i,
  /her\s+şey\s+yolundayken\s+(bozdum|mahvettim|gitti)/i,
  /neden\s+kendimi\s+sabote\s+ediyorum/i,
  /güzel\s+gidiyordu\s+ama\s+(bozdum|karıştırdım|kaçırdım)/i,
  /hep\s+iyi\s+şeyleri\s+kaçırıyorum/i,
  /birinden\s+(kaçtım|uzaklaştım)\s+ama\s+neden\s+bilmiyorum/i,
  /sabote\s+et/i,
  /self.?sabotage/i,
  /i\s+(ruined|destroyed|messed\s+up)\s+(everything|it)\s+when/i,
  /why\s+do\s+i\s+(always\s+)?ruin\s+(good\s+)?things/i
];

const _KAFAYA_TAKMA_SIGNALS = [
  /kafama\s+takıldı/i,
  /aklımdan\s+(çıkmıyor|gitmiyor|silemiyorum)/i,
  /sürekli\s+(düşünüyorum|aklıma\s+geliyor)\s+(bunu|onu|bunu)/i,
  /takıntı\s+haline\s+geldi/i,
  /düşünmeyi\s+bırakamıyorum/i,
  /obsess(ed|ing)/i,
  /can'?t\s+(stop|get\s+it\s+out\s+of\s+my)\s+(thinking|head|mind)/i,
  /keep\s+(thinking\s+about|obsessing\s+over)/i
];

const _OLUMSUZ_DUSUNCE_STUCK_SIGNALS = [
  /olumsuz\s+düşüncelerden\s+(kurtulamıyorum|çıkamıyorum)/i,
  /kötü\s+düşünceler\s+(durmuyor|gelmeye\s+devam\s+ediyor)/i,
  /hep\s+kötüsünü\s+düşünüyorum/i,
  /felaket\s+senaryoları/i,
  /kafam\s+hep\s+(olumsuz|karanlık|negatif)/i,
  /negative\s+(thoughts?|spiral|loop)/i,
  /stuck\s+in\s+(negative|dark)\s+thoughts?/i,
  /catastrophiz/i
];

const _STRES_SIGNALS = [
  /çok\s+stresli(yim)?/i,
  /stres\s+altında\s+eziliyorum/i,
  /baş\s+edemiyorum\s+artık/i,
  /bunaltıcı/i,
  /altından\s+kalkamıyorum/i,
  /overwhelmed/i,
  /can'?t\s+(handle|cope|deal\s+with)\s+(this|it|the\s+stress)/i,
  /too\s+much\s+(stress|pressure)/i
];

export function dfGetPracticalConceptsContext(text) {
  const parts = [];
  if (reTest(_KENDINI_BALTALA_SIGNALS, text)) {
    parts.push(p('prompt.practical.kendini_baltala'));
  }
  if (reTest(_KAFAYA_TAKMA_SIGNALS, text)) {
    parts.push(p('prompt.practical.kafaya_takma'));
  }
  if (reTest(_OLUMSUZ_DUSUNCE_STUCK_SIGNALS, text)) {
    parts.push(p('prompt.practical.olumsuz_dusunce'));
  }
  if (reTest(_STRES_SIGNALS, text)) {
    parts.push(p('prompt.practical.stres'));
  }
  return parts.length ? parts.join('\n') : '';
}

export function dfGetPhilosophyLayersContext(text) {
  // NOT: dfAnalyzeBeliefs, dfAnalyzeChoices ve dfDetectWorksheetOpportunity
  // personalizationAnalyze()'de çağrılıyor. Bu fonksiyon sadece bağlam OLUŞTURUR.

  /* E15 + E16 çakışma koruması: wrongForest daha spesifik — tetiklenirse expDecline atla */
  const wrongForest = dfGetWrongForestContext();
  const expDecline  = wrongForest ? '' : dfGetExponentialDeclineContext();

  const layers = [
    dfGetTraumaContext(text),
    dfGetAwarenessContext(text),
    dfGetFeedbackLoopContext(text),
    dfGetKalpZihinContext(text),
    dfGetSpiritualContext(text),
    dfGetHayalAlemiContext(),
    dfGetExponentialGrowthContext(),
    dfGetPracticalConceptsContext(text),
    dfGetBeliefContext(),
    dfGetChoiceContext(),
    dfGetWorksheetContext(),
    dfGetWorksheetFollowup(),
    dfGetKendinleKonusmaContext(text),
    dfGetSartliTatminContext(text),
    dfGetSinavContext(text),
    dfGetAyetContext(text),
    dfGetFanilikContext(text),
    dfGetSunkCostContext(text),
    dfGetKoZoContext(text),
    dfGetFeedbackLoopVisualization(),
    expDecline,
    wrongForest,
    dfGetManifestoContext(text),
    dfGetBagAlisverisContext(text),
    dfGetDailyPracticeContext(),
    dfGetBeliefHierarchyContext(),
  ].filter(Boolean);

  if (!layers.length) return '';
  return '\n\n--- FELSEFİ KATMANLAR ---\n' + layers.join('\n');
}

/* ── Yeni verilerin persist edilmesi ── */

export function dfSaveExtended() {
  if (!S.currentUser?.id) return;
  const uid = S.currentUser.id;
  try {
    SecureStorage.set(STORAGE_KEYS.DF_HAYAL(uid), uid, _hayalAlemi);
    SecureStorage.set(STORAGE_KEYS.DF_BELIEFS(uid), uid, _beliefSystem);
    SecureStorage.set(STORAGE_KEYS.DF_CHOICES(uid), uid, _choiceTracking);
    SecureStorage.set(STORAGE_KEYS.DF_WORKSHEETS(uid), uid, _worksheetHistory);
    if (typeof _dailyPractice !== 'undefined') {
      SecureStorage.set(STORAGE_KEYS.DAILY_PRACTICE(uid), uid, _dailyPractice);
    }
  } catch (_) {}
}

export function dfLoadExtended() {
  if (!S.currentUser?.id) return;
  const uid = S.currentUser.id;
  try {
    const h = SecureStorage.get(STORAGE_KEYS.DF_HAYAL(uid), uid, null);
    if (h) Object.assign(_hayalAlemi, h);
  } catch (_) {}
  try {
    const b = SecureStorage.get(STORAGE_KEYS.DF_BELIEFS(uid), uid, null);
    if (b) Object.assign(_beliefSystem, b);
  } catch (_) {}
  try {
    const c = SecureStorage.get(STORAGE_KEYS.DF_CHOICES(uid), uid, null);
    if (c) Object.assign(_choiceTracking, c);
  } catch (_) {}
  try {
    const w = SecureStorage.get(STORAGE_KEYS.DF_WORKSHEETS(uid), uid, null);
    if (w) Object.assign(_worksheetHistory, w);
  } catch (_) {}
  /* E18 + E4/E5/E6: Günlük pratik durumunu yükle */
  dfLoadDailyPractice();
}

/* ── Kişi Kartı motoru (10q) için inanç & seçim istatistikleri ───────────── */
export function dfGetBeliefStats() {
  const beliefs = (_beliefSystem && _beliefSystem.core_beliefs) || [];
  const emp = beliefs.filter(b => b.type === 'empowering').reduce((s, b) => s + (b.count || 1), 0);
  const lim = beliefs.filter(b => b.type === 'limiting').reduce((s, b) => s + (b.count || 1), 0);
  const total = emp + lim;
  return {
    count: beliefs.length,
    empowering: emp,
    limiting: lim,
    empoweringRatio: total ? Math.round((emp / total) * 100) : 50,
  };
}

export function dfGetChoiceStats() {
  const recent = (_choiceTracking && _choiceTracking.recent_choices) || [];
  return {
    count: recent.length,
    newRatio: Math.round(((_choiceTracking && _choiceTracking.choice_ratio != null ? _choiceTracking.choice_ratio : 0.5)) * 100),
  };
}

/* ══════════════════════════════════════════════════════════════
   İNANÇ TAKİP SİSTEMİ (Belief Tracking System)
   Düşünce → İnanç → Duygu → Davranış → Sonuç zincirinin
   inanç halkasını izler ve kaydeder.
══════════════════════════════════════════════════════════════ */

let _beliefSystem = {
  core_beliefs: [],     // [{text, type:'limiting'|'empowering', first_seen, last_seen, count, evidence:[]}]
  belief_shifts: [],    // [{from, to, date, context}]
  active_limiting: null // En baskın sınırlandırıcı inanç
};

const _BELIEF_PATTERNS = {
  limiting: {
    tr: [
      { regex: /yapamam|yapamıyorum/i, belief: 'Yapamam / yetersizim' },
      { regex: /hak\s*etm[ie]yorum/i, belief: 'Hak etmiyorum' },
      { regex: /hep\s*böyle\s*olur/i, belief: 'Hep böyle olur' },
      { regex: /asla\s*(olmaz|değişmez)/i, belief: 'Asla değişmez' },
      { regex: /benden\s*olmaz/i, belief: 'Benden olmaz' },
      { regex: /değişemem/i, belief: 'Değişemem' },
      { regex: /geç\s*kaldım/i, belief: 'Artık geç' },
      { regex: /kimse\s*beni\s*sev/i, belief: 'Kimse beni sevmez' },
      { regex: /yetersiz/i, belief: 'Yetersizim' },
      { regex: /layık\s*değil/i, belief: 'Layık değilim' },
      { regex: /böyle\s*kalmaya\s*mahkum/i, belief: 'Mahkumiyet' },
      { regex: /zaten\s*hep\s*böyle/i, belief: 'Değişmezlik' },
      { regex: /beni\s*kimse\s*anlamaz/i, belief: 'Anlaşılmama' },
      { regex: /bu\s*bana\s*göre\s*değil/i, belief: 'Bana göre değil' },
      { regex: /başaramam/i, belief: 'Başaramam' }
    ],
    en: [
      { regex: /i\s*can'?t\s*(do|make|handle|manage|change|fix|stop|be|get|find|have|seem)/i, belief: "I can't" },
      { regex: /i\s*don'?t\s*deserve/i, belief: "I don't deserve" },
      { regex: /it\s*always\s*happens/i, belief: 'It always happens' },
      { regex: /impossible\s*for\s*me/i, belief: 'Impossible for me' },
      { regex: /that'?s\s*just\s*who\s*i\s*am/i, belief: "That's just who I am" },
      { regex: /i\s*can'?t\s*change/i, belief: "I can't change" },
      { regex: /it'?s\s*too\s*late/i, belief: "It's too late" },
      { regex: /nobody\s*loves\s*me/i, belief: 'Nobody loves me' },
      { regex: /i'?m\s*not\s*enough/i, belief: "I'm not enough" },
      { regex: /i'?m\s*not\s*worthy/i, belief: "I'm not worthy" },
      { regex: /i'?m\s*doomed/i, belief: "I'm doomed" },
      { regex: /i\s*always\s*fail/i, belief: 'I always fail' }
    ]
  },
  empowering: {
    tr: [
      { regex: /yapabilirim/i, belief: 'Yapabilirim' },
      { regex: /hak\s*ediyorum/i, belief: 'Hak ediyorum' },
      { regex: /değişeceğim/i, belief: 'Değişeceğim' },
      { regex: /başaracağım/i, belief: 'Başaracağım' },
      { regex: /buna\s*layığım/i, belief: 'Layığım' },
      { regex: /gücüm\s*var/i, belief: 'Gücüm var' },
      { regex: /değişebilirim/i, belief: 'Değişebilirim' },
      { regex: /kendime\s*güveniyorum/i, belief: 'Kendime güveniyorum' },
      { regex: /artık\s*o\s*kişiyim/i, belief: 'Artık o kişiyim' },
      { regex: /hak\s*ettiğimi\s*biliyorum/i, belief: 'Hak ettiğimi biliyorum' }
    ],
    en: [
      { regex: /i\s*can\s*do\s*this/i, belief: 'I can do this' },
      { regex: /i\s*(?:do\s*)?deserve\s*(this|it|better|more|good|love|happiness)/i, belief: 'I deserve' },
      { regex: /i\s*will\s*change/i, belief: 'I will change' },
      { regex: /i'?m\s*worthy/i, belief: "I'm worthy" },
      { regex: /i\s*have\s*the\s*strength/i, belief: 'I have the strength' },
      { regex: /i\s*can\s*change/i, belief: 'I can change' },
      { regex: /i\s*believe\s*in\s*myself/i, belief: 'I believe in myself' },
      { regex: /i\s*am\s*that\s*person/i, belief: 'I am that person' },
      { regex: /i\s*know\s*i\s*deserve/i, belief: 'I know I deserve' }
    ]
  }
};

export function dfAnalyzeBeliefs(text) {
  if (!text || text.length < 5) return;
  const lang = S._currentLang === 'en' ? 'en' : 'tr';
  const now = new Date().toISOString();
  let detected = [];

  // Sınırlandırıcı inançları tara
  for (const pat of _BELIEF_PATTERNS.limiting[lang]) {
    if (pat.regex.test(text)) {
      detected.push({ text: pat.belief, type: 'limiting' });
    }
  }
  // Güçlendirici inançları tara
  for (const pat of _BELIEF_PATTERNS.empowering[lang]) {
    if (pat.regex.test(text)) {
      detected.push({ text: pat.belief, type: 'empowering' });
    }
  }

  for (const d of detected) {
    const existing = _beliefSystem.core_beliefs.find(b => b.text === d.text && b.type === d.type);
    if (existing) {
      existing.count++;
      existing.last_seen = now;
      existing.evidence.push(text.substring(0, 120));
      if (existing.evidence.length > 10) existing.evidence.shift();
    } else {
      _beliefSystem.core_beliefs.push({
        text: d.text, type: d.type, first_seen: now, last_seen: now,
        count: 1, evidence: [text.substring(0, 120)]
      });
    }
  }

  // En baskın sınırlandırıcı inancı güncelle
  const limitings = _beliefSystem.core_beliefs.filter(b => b.type === 'limiting');
  if (limitings.length) {
    limitings.sort((a, b) => b.count - a.count);
    _beliefSystem.active_limiting = limitings[0].text;
  }

  // İnanç kayması tespiti: Aynı mesajda sınırlandırıcı → güçlendirici geçişi
  const hasLimiting = detected.filter(d => d.type === 'limiting');
  const hasEmpowering = detected.filter(d => d.type === 'empowering');
  if (hasLimiting.length && hasEmpowering.length) {
    _beliefSystem.belief_shifts.push({
      from: hasLimiting[0].text, to: hasEmpowering[0].text,
      date: now, context: text.substring(0, 200)
    });
    if (_beliefSystem.belief_shifts.length > 50) _beliefSystem.belief_shifts.shift();
  }

  if (detected.length) dfSave();
  return detected;
}

function dfGetBeliefContext() {
  const beliefs = _beliefSystem.core_beliefs;
  if (!beliefs.length) return '';

  const parts = [];
  const limitings = beliefs.filter(b => b.type === 'limiting').sort((a, b) => b.count - a.count);
  const empowerings = beliefs.filter(b => b.type === 'empowering').sort((a, b) => b.count - a.count);

  if (limitings.length) {
    parts.push(p('prompt.belief.limiting_detected', { belief: limitings[0].text }));
  }
  if (empowerings.length) {
    parts.push(p('prompt.belief.empowering_detected', { belief: empowerings[0].text }));
  }
  if (_beliefSystem.belief_shifts.length) {
    const recent = _beliefSystem.belief_shifts.slice(-3);
    const shiftText = recent.map(s => `${s.from} → ${s.to}`).join('; ');
    parts.push(p('prompt.belief.shift_history', { shifts: shiftText }));
  }

  return parts.length ? '\n<belief_context>\n' + parts.join('\n') + '\n</belief_context>' : '';
}

/* ══════════════════════════════════════════════════════════════
   SEÇİM İZLEME SİSTEMİ (Choice Tracking System)
   HAYAT = O KİŞİ × O KİŞİNİN SEÇİMLERİ
   Kullanıcının eski kişi vs yeni kişi seçimlerini izler.
══════════════════════════════════════════════════════════════ */

let _choiceTracking = {
  recent_choices: [],   // [{text, type:'old_person'|'new_person', date}]
  choice_ratio: 0.5,    // 0=hep eski, 1=hep yeni
  daily_choices: []      // [{date, old_count, new_count}]
};

const _CHOICE_PATTERNS = {
  old_person: {
    tr: [/yine aynısını yaptım/i, /kaçtım/i, /yapamadım/i, /eski halime döndüm/i,
         /söylemedim/i, /cesaret edemedim/i, /yine erteledim/i, /geri adım attım/i,
         /pes ettim/i, /yapmadım/i, /sustum/i, /korktum/i, /aynı şeyi tekrar/i],
    en: [/i did it again/i, /i ran away/i, /couldn'?t do it/i, /went back to.*old/i,
         /didn'?t say/i, /couldn'?t.*courage/i, /procrastinat/i, /backed down/i,
         /gave up/i, /didn'?t do it/i, /stayed silent/i, /got scared/i]
  },
  new_person: {
    tr: [/bu sefer yaptım/i, /söyledim/i, /cesaret ettim/i, /ilk kez/i,
         /farklı davrandım/i, /konuştum/i, /sınır koydum/i, /hayır dedim/i,
         /adım attım/i, /değiştirdim/i, /o kişi gibi davrandım/i, /başardım/i, /yüzleştim/i],
    en: [/this time i did/i, /i said it/i, /i had the courage/i, /first time/i,
         /acted differently/i, /i spoke up/i, /i set.*boundar/i, /i said no/i,
         /i took a step/i, /i changed/i, /new me/i, /i made it/i, /i confronted/i]
  }
};

export function dfAnalyzeChoices(text) {
  if (!text || text.length < 5) return;
  const lang = S._currentLang === 'en' ? 'en' : 'tr';
  const now = new Date().toISOString(); // olay zaman damgası (UTC) — kayıtta saklanır
  const today = localISODate();          // yerel gün anahtarı — günlük gruplama
  let detected = [];

  for (const pat of _CHOICE_PATTERNS.old_person[lang]) {
    if (pat.test(text)) {
      detected.push({ text: text.substring(0, 100), type: 'old_person', date: now });
      break; // Bir mesajda bir tip yeter
    }
  }
  if (!detected.length) {
    for (const pat of _CHOICE_PATTERNS.new_person[lang]) {
      if (pat.test(text)) {
        detected.push({ text: text.substring(0, 100), type: 'new_person', date: now });
        break;
      }
    }
  }

  for (const d of detected) {
    _choiceTracking.recent_choices.push(d);
    if (_choiceTracking.recent_choices.length > 100) _choiceTracking.recent_choices.shift();

    // Günlük sayaç
    let dayEntry = _choiceTracking.daily_choices.find(dc => dc.date === today);
    if (!dayEntry) {
      dayEntry = { date: today, old_count: 0, new_count: 0 };
      _choiceTracking.daily_choices.push(dayEntry);
      if (_choiceTracking.daily_choices.length > 90) _choiceTracking.daily_choices.shift();
    }
    if (d.type === 'old_person') dayEntry.old_count++;
    else dayEntry.new_count++;
  }

  // Oran hesapla (son 30 seçim)
  const recent = _choiceTracking.recent_choices.slice(-30);
  const newCount = recent.filter(c => c.type === 'new_person').length;
  _choiceTracking.choice_ratio = recent.length ? newCount / recent.length : 0.5;

  if (detected.length) dfSave();
  return detected;
}

function dfGetChoiceContext() {
  const recent = _choiceTracking.recent_choices.slice(-30);
  if (recent.length < 2) return '';

  const newCount = recent.filter(c => c.type === 'new_person').length;
  const oldCount = recent.filter(c => c.type === 'old_person').length;
  const ratio = _choiceTracking.choice_ratio;

  const trendKey = ratio >= 0.5 ? 'prompt.choice.ratio_positive' : 'prompt.choice.ratio_negative';
  const trend = p(trendKey);

  // Son seçimi de ekle
  const last = _choiceTracking.recent_choices[_choiceTracking.recent_choices.length - 1];
  const parts = [];
  if (last) {
    parts.push(p(last.type === 'new_person' ? 'prompt.choice.new_person' : 'prompt.choice.old_person'));
  }
  parts.push(p('prompt.choice.ratio', { newCount, oldCount, trend }));

  return '\n<choice_context>\n' + parts.join('\n') + '\n</choice_context>';
}

/* ══════════════════════════════════════════════════════════════
   ÇALIŞMA KAĞIDI SİSTEMİ (Worksheet System)
   Kitap 1'den 3'lü egzersiz: Soru → Hayal → Programlama
══════════════════════════════════════════════════════════════ */

let _worksheetHistory = {
  sessions: [],         // [{date, concept, step1_answer, step2_vision, step3_affirmation}]
  last_suggested: null,
  pending_worksheet: null
};

const _WORKSHEET_TEMPLATES = {
  standart: {
    tr: { question: 'Bu durumda standartım ne? Alt sınırım nerede?', vision: 'Yüksek standartla yaşayan kişinin gözlerinden bak. O kişi ne görüyor?', affirmation: 'Ben yüksek standartlarla yaşayan bir insanım.' },
    en: { question: 'What is my standard in this situation? Where is my lower limit?', vision: 'Look through the eyes of a person who lives with high standards. What does that person see?', affirmation: 'I am a person who lives with high standards.' }
  },
  hak_etmek: {
    tr: { question: 'Bunu gerçekten hak ettiğimi kalben biliyor muyum? Kalbin "evet" mi diyor, yoksa zihnin mi zorluyor? Hak etmek hem kalben hem zihnen bilmek üzerinedir.', vision: 'Hak eden kişi olarak kendine bak — o kişi bunu KALBEN biliyor, dışarıdan bir onaya ihtiyaç duymadan. O kişinin gözlerinden bak.', affirmation: 'Ben bunu hak eden bir insanım — bunu kalbimle biliyorum.' },
    en: { question: 'Do I truly KNOW in my heart that I deserve this? Is my heart saying "yes," or is only my mind forcing it? Deserving is about knowing it in both heart and mind.', vision: 'Look at yourself as the person who deserves this — that person KNOWS it in their heart, without needing external validation. Look through that person\'s eyes.', affirmation: 'I am a person who deserves this — I know it in my heart.' }
  },
  normal: {
    tr: { question: 'İstediğim hayat bana normal mi geliyor, yoksa ulaşılmaz mı?', vision: 'O hayatı yaşayan kişi olarak bak — "bunda ne var ki?" diyebilen kişi.', affirmation: 'Bu hayat benim normalim.' },
    en: { question: 'Does the life I want feel normal to me, or out of reach?', vision: 'Look as the person living that life — the one who can say "so what, this is how it should be."', affirmation: 'This life is my normal.' }
  },
  layik: {
    tr: { question: 'Kendimi buna layık görüyor muyum? Bana iyi davranıldığında ne hissediyorum?', vision: 'Layık gören kişi olarak bak — o kişi iyilik karşısında huzurlu.', affirmation: 'Ben buna layık bir insanım.' },
    en: { question: 'Do I see myself as worthy of this? What do I feel when treated well?', vision: 'Look as the person who sees themselves as worthy — they are at peace with goodness.', affirmation: 'I am worthy of this.' }
  },
  oz_sevgi: {
    tr: { question: 'Kendime ne kadar sevgiyle yaklaşıyorum? İhtiyaçlarımı karşılıyor muyum?', vision: 'Kendini seven kişi olarak bak — o kişi kendine hoşgörülü ve sevecen.', affirmation: 'Ben kendimi seven bir insanım.' },
    en: { question: 'How lovingly do I approach myself? Am I meeting my own needs?', vision: 'Look as the person who loves themselves — that person is tolerant and caring toward themselves.', affirmation: 'I am a person who loves myself.' }
  },
  oz_saygi: {
    tr: { question: 'Sınır koyabiliyor muyum? Saygısızlığa ne tepki veriyorum?', vision: 'Kendine saygı duyan kişi olarak bak — o kişi sınırlarını net bilir.', affirmation: 'Ben kendine saygı duyan bir insanım.' },
    en: { question: 'Can I set boundaries? How do I respond to disrespect?', vision: 'Look as the person who respects themselves — that person knows their boundaries clearly.', affirmation: 'I am a person who respects myself.' }
  },
  oz_deger: {
    tr: { question: 'Kendimi ne kadar değerli buluyorum? Topluma katkımı görüyor muyum?', vision: 'Değerini bilen kişi olarak bak — o kişi varlığının değerini hisseder.', affirmation: 'Ben değerli bir insanım.' },
    en: { question: 'How valuable do I find myself? Do I see my contribution?', vision: 'Look as the person who knows their worth — that person feels the value of their existence.', affirmation: 'I am a valuable person.' }
  },
  oz_guven: {
    tr: { question: 'Kendi kararlarıma ne kadar güveniyorum? Başkalarının onayına mı bağımlıyım?', vision: 'Kendine güvenen kişi olarak bak — o kişi kendi kararlarının arkasında durur.', affirmation: 'Ben kendi kararlarına güvenen bir insanım.' },
    en: { question: 'How much do I trust my own decisions? Am I dependent on others\' approval?', vision: 'Look as the self-confident person — that person stands behind their own decisions.', affirmation: 'I am a person who trusts my own decisions.' }
  },
  bolluk: {
    tr: { question: 'Hayata kıtlıkla mı yoksa bollukla mı bakıyorum?', vision: 'Bolluk bilinci olan kişi olarak bak — o kişi için nimetler boldur, korku yoktur.', affirmation: 'Ben bolluk bilinci ile yaşayan bir insanım.' },
    en: { question: 'Do I look at life through scarcity or abundance?', vision: 'Look as the person with abundance mindset — for them, blessings are plentiful and there is no fear.', affirmation: 'I am a person who lives with abundance mindset.' }
  }
};

export function dfDetectWorksheetOpportunity(text) {
  if (!text || text.length < 10) return null;
  const lang = S._currentLang === 'en' ? 'en' : 'tr';

  // Derinlik kavramlarını kontrol et
  const depthMap = [
    { key: 'standart', tr: [/standart/i, /alt\s*sınır/i, /üst\s*sınır/i], en: [/standard/i, /lower\s*limit/i, /upper\s*limit/i] },
    { key: 'hak_etmek', tr: [/hak\s*et/i, /hak\s*etmiyor/i], en: [/deserve/i, /don'?t\s*deserve/i] },
    { key: 'normal', tr: [/normal.*gel/i, /normalim/i, /ulaşılmaz/i], en: [/normal.*for\s*me/i, /out\s*of\s*reach/i] },
    { key: 'layik', tr: [/layık/i, /layık\s*değil/i], en: [/worthy/i, /not\s*worthy/i] }
  ];
  for (const dm of depthMap) {
    for (const pat of dm[lang]) {
      if (pat.test(text)) return dm.key;
    }
  }

  // Temel kavramlarını kontrol et
  const foundMap = [
    { key: 'oz_sevgi', tr: [/kendimi\s*sev/i, /öz\s*sevgi/i], en: [/self.?love/i, /love\s*myself/i] },
    { key: 'oz_saygi', tr: [/sınır\s*koy/i, /öz\s*saygı/i, /saygısızlık/i], en: [/boundar/i, /self.?respect/i, /disrespect/i] },
    { key: 'oz_deger', tr: [/değer.*hisset/i, /öz\s*değer/i, /değersiz/i], en: [/self.?worth/i, /worthless/i, /value.*myself/i] },
    { key: 'oz_guven', tr: [/kendime\s*güven/i, /öz\s*güven/i, /onay\s*bağımlı/i], en: [/self.?confiden/i, /trust\s*myself/i, /approval/i] },
    { key: 'bolluk', tr: [/bolluk/i, /kıtlık/i, /bereket/i], en: [/abundance/i, /scarcity/i] }
  ];
  for (const fm of foundMap) {
    for (const pat of fm[lang]) {
      if (pat.test(text)) return fm.key;
    }
  }

  return null;
}

function dfGetWorksheetContext() {
  const pending = _worksheetHistory.pending_worksheet;
  if (!pending) return '';
  const lang = S._currentLang === 'en' ? 'en' : 'tr';
  const tmpl = _WORKSHEET_TEMPLATES[pending];
  if (!tmpl || !tmpl[lang]) return '';
  /* `ws` kullanıyoruz — `t` global i18n fonksiyonunu gölgelemekten kaçınmak için */
  const ws = tmpl[lang];
  return '\n' + p('prompt.worksheet.suggest', {
    concept: pending, question: ws.question, vision: ws.vision, affirmation: ws.affirmation
  });
}

/* 5. argüman SONRADAN eklendi (Derin Çalışma tezgâhı): kitabın kağıdı üç değil
   DÖRT adımdır — olumlamanın ses kaydı ve "o kişinin davranışını sergile"
   satırı. Dört argümanlı eski çağrı (sohbet içi [KAGIT]) aynen geçerlidir;
   alanlar yalnız dolu geldiğinde kayda yazılır. */
export function dfRecordWorksheet(concept, step1, step2, step3, ek) {
  const kayit = {
    date: new Date().toISOString(), concept,
    step1_answer: step1 || '', step2_vision: step2 || '', step3_affirmation: step3 || ''
  };
  if (ek && ek.sesId)    kayit.ses_id  = String(ek.sesId);
  if (ek && ek.davranis) kayit.davranis = String(ek.davranis).slice(0, 200);
  _worksheetHistory.sessions.push(kayit);
  if (_worksheetHistory.sessions.length > 50) _worksheetHistory.sessions.shift();
  _worksheetHistory.pending_worksheet = null;
  dfSave();
}

/* Çalışma Kağıdı artifact'i (13b) için şablon erişimi — aktif dile göre */
export function dfGetWorksheetTemplate(concept) {
  const lang = S._currentLang === 'en' ? 'en' : 'tr';
  const tmpl = _WORKSHEET_TEMPLATES[concept];
  return tmpl?.[lang] ? { concept, ...tmpl[lang] } : null;
}

/* Arşiv görünümleri (09c) için oturum listesi + silme */
export function dfGetWorksheetSessions() {
  return _worksheetHistory.sessions.slice();
}
export function dfDeleteWorksheetSession(index) {
  if (index < 0 || index >= _worksheetHistory.sessions.length) return false;
  _worksheetHistory.sessions.splice(index, 1);
  dfSave();
  return true;
}

function dfGetWorksheetFollowup() {
  const sessions = _worksheetHistory.sessions;
  if (!sessions.length) return '';
  const last = sessions[sessions.length - 1];
  if (!last.step3_affirmation) return '';
  return p('prompt.worksheet.followup', {
    concept: last.concept, affirmation: last.step3_affirmation
  });
}

/* ══════════════════════════════════════════════════════════════
   KATMAN 5: YENİ ÖZELLİKLER — Kitap Vizyonundan Eksik Olanlar
══════════════════════════════════════════════════════════════ */

/* ── E2: KENDİNLE KONUŞMAK (Kitap: 25+ yerde geçen temel pratik) ──
   Kullanıcı sessiz, yalnız veya dürüst iç konuşma sinyali verdiğinde tetiklenir. */
const _KENDINLE_KONUSMA_SIGNALS = [
  /kendinle\s+(konuş|dürüst\s+ol|yüzleş|sorgula)/i,
  /kendi\s+kendime\s+(sordum|soruyorum|konuşuyorum)/i,
  /yalnız\s+kaldığımda\s+(düşündüm|fark\s+ettim|sordum)/i,
  /sesli\s+(düşündüm|konuştum|söyledim\s+kendime)/i,
  /i\s+(talked|spoke)\s+to\s+myself/i,
  /honest\s+with\s+myself/i
];

function dfDetectKendinleKonusma(text) {
  return reTest(_KENDINLE_KONUSMA_SIGNALS, text);
}

function dfGetKendinleKonusmaContext(text) {
  if (!dfDetectKendinleKonusma(text)) return '';
  return p('prompt.kendinle_konusma.detected');
}

/* ── E4+E5: GÜNLÜK PRATİKLER — Sabah Hayal + Gece Kapanış ──
   Sabahları hayal alemi ritueli, gece kapanış sorusu.
   Bu context, günün ilk veya son sohbetinde kullanıcıya önerilir. */
let _dailyPractice = {
  morning_done: false,
  evening_done: false,
  last_date: null,
  evening_reflection: '',
  niyet: ''   // E6: Günlük niyet
};

function dfGetDailyPracticeContext() {
  const today = localISODate();
  // Gün değiştiyse sıfırla
  if (_dailyPractice.last_date !== today) {
    _dailyPractice.morning_done = false;
    _dailyPractice.evening_done = false;
    _dailyPractice.last_date = today;
    try { SecureStorage.set(STORAGE_KEYS.DAILY_PRACTICE(S.currentUser?.id), S.currentUser?.id, _dailyPractice); } catch (_) {}
  }

  const hour = new Date().getHours();
  const parts = [];

  if (hour < 10 && !_dailyPractice.morning_done) {
    parts.push(p('prompt.daily.morning_ritual'));
  }
  if (hour >= 20 && !_dailyPractice.evening_done) {
    parts.push(p('prompt.daily.evening_question'));
  }
  if (_dailyPractice.niyet) {
    parts.push(p('prompt.daily.niyet_active', { niyet: _dailyPractice.niyet }));
  }
  return parts.length ? parts.join('\n') : '';
}

function dfLoadDailyPractice() {
  try {
    const d = SecureStorage.get(STORAGE_KEYS.DAILY_PRACTICE(S.currentUser?.id), S.currentUser?.id, null);
    if (d) Object.assign(_dailyPractice, d);
  } catch (_) {}
}

/* ── E6: SPİRİTÜEL ZEMİN PROFİLİ — Niyet + Tevekkül + Ayet Kütüphanesi ──
   Kitap: Her sayfada Allah'a atıf, 6+ Kuran ayeti, niyet ve tevekkül pratiği */
const _AYET_KUTUPHANESI = {
  sinav:      { ayet: 'Mülk 67/2', metin: '"Hanginizin daha güzel amel işleyeceğini denemek için ölümü ve hayatı yaratan O\'dur."', mesaj: 'Bu an da bir sınav. Ve sınavı geçmenin yolu kim olduğunu seçmek.' },
  sabir:      { ayet: 'İnşirah 94/6', metin: '"Şüphesiz her güçlükle birlikte bir kolaylık vardır."', mesaj: 'Zorluğun yanında kolaylık var — bu sıkışmışlık geçicidir.' },
  sorumluluk: { ayet: 'Ra\'d 13/11', metin: '"Bir toplum kendindekini değiştirmedikçe Allah onların durumunu değiştirmez."', mesaj: 'Değişim içeriden başlar. Dışarıyı değil, kendini değiştir.' },
  adalet:     { ayet: 'Enbiya 21/47', metin: '"Kıyamet günü için adalet terazileri kurarız; hiçbir kimse hiçbir şekilde haksızlığa uğratılmaz."', mesaj: 'Adalet var — hem bu dünyada hem ötesinde.' },
  tevekkul:   { ayet: 'Zümer 39/18', metin: '"Sözü dinleyip en güzeline uyanlar — işte onlar Allah\'ın hidayet ettikleridir."', mesaj: 'Dinle, düşün, en iyisini seç — ve Allah\'a bırak.' },
  kurtulus:   { ayet: 'Ankebut 29/65', metin: '"Gemiye bindiklerinde dini yalnız Allah\'a özgü kılarak O\'na yalvarırlar."', mesaj: 'Çaresizlikte bile — ya da özellikle o anda — Allah\'a dön.' }
};

function dfGetSituationalAyet(context) {
  if (!context) return '';
  if (/sınav|imtihan|zor\s+karar|test/i.test(context)) return _AYET_KUTUPHANESI.sinav;
  if (/sabır|sabret|dayanamı|tahammül/i.test(context)) return _AYET_KUTUPHANESI.sabir;
  if (/değişmek|dönüşmek|sorumluluk/i.test(context)) return _AYET_KUTUPHANESI.sorumluluk;
  if (/adalet|haksızlık|hak\s+et/i.test(context)) return _AYET_KUTUPHANESI.adalet;
  if (/tevekkül|bırak|kaygı|endişe/i.test(context)) return _AYET_KUTUPHANESI.tevekkul;
  if (/çaresiz|umutsuz|tüm\s+kapılar/i.test(context)) return _AYET_KUTUPHANESI.kurtulus;
  return null;
}

function dfGetAyetContext(text) {
  const ayet = dfGetSituationalAyet(text);
  if (!ayet) return '';
  return p('prompt.spiritual.ayet', { ayet: ayet.ayet, metin: ayet.metin, mesaj: ayet.mesaj });
}

/* ── E7: HAYAT SINAV BİLİNCİ (Mülk 67/2 — Kitabın Merkezi) ── */
const _SINAV_SIGNALS = [
  /neden\s+böyle\s+(bir\s+şey\s+yaşıyorum|oldu)/i,
  /bu\s+bana\s+neden\s+oluyor/i,
  /bu\s+kadar\s+zor\s+olmamalıydı/i,
  /why\s+is\s+this\s+happening\s+to\s+me/i,
  /why\s+is\s+life\s+(so\s+hard|this\s+difficult)/i
];

function dfDetectSinavMomenti(text) {
  return reTest(_SINAV_SIGNALS, text);
}

function dfGetSinavContext(text) {
  if (!dfDetectSinavMomenti(text)) return '';
  return p('prompt.spiritual.sinav_moment');
}

/* ── E8: ŞARTLI TATMİN SİNYALİ (Vasıta Derinleştirme) ──
   Kitap s.21-23: "Şu olursa mutlu olacağım" = vasıta zihniyeti */
const _SARTLI_TATMIN_SIGNALS = [
  /o\s+(olursa|gelirse|değişirse)\s+(mutlu|iyi|tamam|tamam\s+olacağım)/i,
  /onu\s+bulursam\s+(her\s+şey|hayatım)\s+(düzelir|iyi\s+olur)/i,
  /şu\s+(işi|parayı|ilişkiyi|kişiyi)\s+(bulunca|kazanınca|yaşayınca)\s+(mutlu|rahat)/i,
  /eğer\s+(.{5,40})\s+(olsaydı|olursa)\s+(mutlu|iyi|farklı)/i,
  /if\s+(.{5,40})\s+(then|i'?ll\s+be)\s+(happy|fine|okay|better)/i,
  /when\s+i\s+(find|get|have)\s+(.{5,40})\s+(i'?ll\s+be|everything\s+will)/i
];

function dfDetectSartliTatmin(text) {
  return reTest(_SARTLI_TATMIN_SIGNALS, text);
}

function dfGetSartliTatminContext(text) {
  if (!dfDetectSartliTatmin(text)) return '';
  return p('prompt.awareness.sartli_tatmin');
}

/* ── E9: BOLLUK BİLİNCİ GENİŞLEME — Finansal/Mesleki kıtlık ── */
// Mevcut bolluk sinyallerine ek olarak finansal/mesleki kıtlık sinyalleri
const _BOLLUK_FINANCIAL_SIGNALS = {
  low: [
    /para\s+olmadan\s+(olmaz|yapamam|başaramam)/i,
    /bu\s+(iş|meslek|pozisyon)\s+olmadan\s+(olmaz|olmayacak)/i,
    /o\s+işi\s+(bulmazsam|alamazsam)\s+(olmaz|biter)/i,
    /finansal\s+(güvensizlik|korku|endişe)/i,
    /hiç\s+param\s+olmasa\s+(ne\s+olur|mahvolurum)/i,
    /without\s+(money|that\s+job|that\s+position)\s+(can'?t|won'?t|impossible)/i
  ],
  high: [
    /Allah'ın\s+nimeti\s+(bol|tükenmez)/i,
    /başka\s+(iş|fırsat|yol)\s+da\s+var/i,
    /para\s+(kapısı\s+kapatsa\s+da|gitse\s+de)\s+yeni\s+(kapı|yol)/i,
    /abundance\s+mindset/i,
    /there\s+are\s+other\s+(opportunities|ways|paths)/i
  ]
};

// Mevcut bolluk score'una finansal/mesleki sinyaller de eklensin
function dfAnalyzeFinancialAbundance(text) {
  const obj = S._foundationsProfile.bolluk;
  for (const r of _BOLLUK_FINANCIAL_SIGNALS.low) {
    if (r.test(text)) { _dfUpdateScore(obj, true, text.slice(0, 60)); break; }
  }
  for (const r of _BOLLUK_FINANCIAL_SIGNALS.high) {
    if (r.test(text)) { _dfUpdateScore(obj, false, text.slice(0, 60)); break; }
  }
}

/* ── E10: İNANÇ HİYERARŞİSİ — Temel İnanç vs Yansıyan İnanç ──
   Kitap s.55: "Ben yetersizim" (temel) → "Bu işi yapamam" (yansıyan) */
function dfClassifyBeliefHierarchy() {
  const beliefs = _beliefSystem.core_beliefs;
  if (beliefs.length < 2) return null;

  const CORE_BELIEF_MARKERS = [
    /^(ben\s+)?(yetersizim|değersizim|sevilmiyorum|hak\s+etmiyorum|değişemem)/i,
    /^i'?m\s+(not\s+enough|worthless|unlovable|don'?t\s+deserve|can'?t\s+change)/i
  ];
  const coreBeliefs = beliefs.filter(b =>
    b.type === 'limiting' && reTest(CORE_BELIEF_MARKERS, b.text)
  );
  const reflectedBeliefs = beliefs.filter(b =>
    b.type === 'limiting' && !reTest(CORE_BELIEF_MARKERS, b.text)
  );

  if (!coreBeliefs.length) return null;
  return { core: coreBeliefs[0], reflected: reflectedBeliefs.slice(0, 3) };
}

function dfGetBeliefHierarchyContext() {
  const hierarchy = dfClassifyBeliefHierarchy();
  if (!hierarchy) return '';
  return p('prompt.belief.hierarchy', {
    core: hierarchy.core.text,
    reflected: hierarchy.reflected.map(b => b.text).join(', ') || '—'
  });
}

/* ── E11: WANDERER FANİLİK BOYUTU ──
   İlişki Felsefesi s.11: Wanderer = geçici hayatın farkında olan, ölüm bilinciyle yaşayan */
const _FANILIK_SIGNALS = [
  /ölüm(ü|den|le)\s+(düşününce|korkuyorum|hatırlatınca)/i,
  /hayat\s+(kısa|geçici|bir\s+gün\s+bitecek)/i,
  /bu\s+dünya\s+(geçici|fani)/i,
  /zamanım\s+(azalıyor|kalmıyor|tükeniyor)/i,
  /mortality|death|life\s+is\s+short|temporary\s+world/i
];

function dfDetectFanilik(text) {
  return reTest(_FANILIK_SIGNALS, text);
}

function dfGetFanilikContext(text) {
  if (!dfDetectFanilik(text)) return '';
  return p('prompt.fanilik.moment');
}

/* ── E12: BATIK MALİYET (SUNK COST) DETEKTÖRÜ ──
   Kitap s.497-499: "Buna bunca yatırım yaptım, bırakamam" */
const _SUNK_COST_SIGNALS = [
  /bunca\s+(yıl|ay|zaman|para|emek)\s+(harcadım|yatırdım|verdim)[^,.]*(bırakamam|bırakmak\s+(istemiyorum|çok\s+zor))/i,
  /bu\s+kadar\s+(yıl|ay|zaman|emek)\s+(verdikten\s+sonra|harcadıktan\s+sonra)\s+(bırakamam|nasıl\s+bırakırım)/i,
  /çok\s+(şey|zaman|para|emek)\s+(verdim|harcadım)[^,.]*(devam\s+etmem\s+gerekiyor|bırakamam)/i,
  /i'?ve\s+(invested|put\s+in)\s+(so\s+much|years|months)\s+(i\s+can'?t|can'?t\s+just)/i,
  /after\s+(all\s+this|so\s+many\s+years|everything)\s+i'?ve\s+(given|done|invested)/i
];

function dfDetectSunkCost(text) {
  return reTest(_SUNK_COST_SIGNALS, text);
}

function dfGetSunkCostContext(text) {
  if (!dfDetectSunkCost(text)) return '';
  return p('prompt.practical.sunk_cost');
}

/* ── E13: KO-ZO (KOLAYLAŞTIR/ZORLAŞTIR) ──
   Kitap s.261: İyi alışkanlıkları kolaylaştır, kötüleri zorlaştır */
const _KOZO_SIGNALS = [
  /alışkanlık\s+(kuramıyorum|oluşturamıyorum|bırakamıyorum)/i,
  /her\s+gün\s+yapmaya\s+çalışıyorum\s+ama\s+(yapamıyorum|başaramıyorum)/i,
  /kötü\s+alışkanlığımdan\s+(kurtulamıyorum|vaz\s+geçemiyorum)/i,
  /can'?t\s+(build|create|break)\s+(a\s+habit|the\s+habit)/i,
  /trying\s+to\s+(quit|stop|build)\s+(a\s+habit|habit)\s+but\s+failing/i
];

function dfDetectKoZo(text) {
  return reTest(_KOZO_SIGNALS, text);
}

function dfGetKoZoContext(text) {
  if (!dfDetectKoZo(text)) return '';
  return p('prompt.practical.kozo');
}

/* ── E14: GERİ BİLDİRİM DÖNGÜSÜ GÖRSELLEŞTİRME ──
   Kitap s.54-55: Döngüyü kullanıcıya görünür kıl */
function dfGetFeedbackLoopVisualization() {
  const beliefs = _beliefSystem.core_beliefs.filter(b => b.type === 'limiting');
  if (!beliefs.length) return '';
  const topBelief = beliefs.sort((a, b) => b.count - a.count)[0];
  if (topBelief.count < 2) return '';
  return p('prompt.feedback_loop.visualization', {
    belief: topBelief.text, count: topBelief.count
  });
}

/* ── E15: ÜSTEL BÜYÜME ÇİFT YÖNLÜ ── */
function dfGetExponentialDeclineContext() {
  const pt = S._personTransition;
  if (!pt.daily_steps || pt.daily_steps.length < 5) return '';

  const recent = pt.daily_steps.slice(-14);
  const noCount = recent.filter(s => s.answer === 'no').length;
  const ratio = noCount / recent.length;

  if (ratio >= 0.7 && recent.length >= 7) {
    return p('prompt.exponential_growth.decline', { days: recent.length, noCount });
  }
  return '';
}

/* ── E16: YANLIŞ ORMANDA ODUN KESMEK ──
   Kitap s.477: Uzun süre aynı alanda ilerleme yoksa "doğru alan mı?" sorusu */
function dfGetWrongForestContext() {
  const pt = S._personTransition;
  if (!pt.daily_steps || pt.daily_steps.length < 14) return '';

  const recent = pt.daily_steps.slice(-21);
  const noCount = recent.filter(s => s.answer === 'no').length;
  const ratio = noCount / recent.length;

  // 3 haftadır %65+ hayır = aynı alanda ilerleme yok
  if (ratio >= 0.65 && recent.length >= 14) {
    return p('prompt.wrong_forest');
  }
  return '';
}

/* ── E17: EKSİK MANİFESTO PRATİKLERİ ──
   IX. Sorumluluk, X. Toplum için kendini yetiştir, XI. Hak/Hukuk/Adalet */
const _MAGDURIYET_SIGNALS = [
  /hep\s+bana\s+oluyor/i,
  /kaderim\s+bu/i,
  /başkaları\s+yüzünden/i,
  /o\s+olmasa\s+olurdu/i,
  /bu\s+benim\s+suçum\s+değil/i,
  /it'?s\s+not\s+my\s+fault/i,
  /because\s+of\s+(him|her|them|others)/i,
  /always\s+happens\s+to\s+me/i
];

const _TOPLUM_KATKI_SIGNALS = [
  /başkalarına\s+(yardım\s+etmek|faydalı\s+olmak|katkıda\s+bulunmak)\s+istiyorum/i,
  /topluma\s+(katkı|fayda|hizmet)/i,
  /want\s+to\s+(help|contribute\s+to|give\s+back\s+to)\s+(others|society|community)/i
];

const _ADALET_SIGNALS = [
  /adalet\s+(yok|nerede|sağlanamıyor)/i,
  /haksızlığa\s+(uğradım|maruz\s+kaldım)/i,
  /hakkım\s+yendi/i,
  /injustice|unfair|my\s+rights\s+were\s+violated/i
];

function dfDetectMagduriyet(text) {
  return reTest(_MAGDURIYET_SIGNALS, text);
}

function dfDetectToplumKatki(text) {
  return reTest(_TOPLUM_KATKI_SIGNALS, text);
}

function dfDetectAdalet(text) {
  return reTest(_ADALET_SIGNALS, text);
}

function dfGetManifestoContext(text) {
  const parts = [];
  /* Travma tespiti varsa mağduriyet promptu ÇAKIŞIR —
     travma çerçevesi "mesele sensin" kullanmayı yasaklar.
     Mağduriyet promptu yerine travma muafiyeti geçerlidir. */
  if (dfDetectMagduriyet(text) && !dfDetectTrauma(text)) {
    parts.push(p('prompt.manifesto.sorumluluk'));
  }
  if (dfDetectToplumKatki(text)) parts.push(p('prompt.manifesto.toplum_katki'));
  if (dfDetectAdalet(text)) parts.push(p('prompt.manifesto.adalet'));
  return parts.length ? parts.join('\n') : '';
}

/* ── +1 BONUS: BAĞ VS ALIŞVERİŞ AYRIMI ──
   İlişki Felsefesi s.19: İlişki problemi duygusal bağ eksikliği mi yoksa
   alışveriş/ihtiyaç çözümü yanlış mı kurulmuş? */
const _BAG_SIGNALS = [
  /aramızda\s+(duygusal\s+)?(bağ|bağlantı)\s+(kalmadı|yok|koptu)/i,
  /onu\s+(artık\s+)?(hissedemiyorum|bulamıyorum|tanıyamıyorum)/i,
  /duygusal\s+olarak\s+(uzak(laştık|laştı)|bağlanamıyoruz)/i,
  /no\s+(emotional\s+)?connection\s+(left|anymore)/i,
  /can'?t\s+(feel|reach|connect\s+with)\s+(him|her|them)\s+anymore/i
];

const _ALISVERIS_SIGNALS = [
  /benden\s+(yeterince\s+)?(destek|ilgi|para|zaman)\s+(göremiyorum|almıyorum)/i,
  /beklentilerimi\s+(karşılamıyor|yerine\s+getirmiyor)/i,
  /ihtiyaçlarımı\s+(görmüyor|anlamıyor|karşılamıyor)/i,
  /doesn'?t\s+(meet|fulfill|provide)\s+(my\s+needs|expectations)/i,
  /not\s+getting\s+(enough\s+)?(support|attention|time)\s+from/i
];

function dfDetectBagVsAlisveris(text) {
  const hasBag = reTest(_BAG_SIGNALS, text);
  const hasAlisveris = reTest(_ALISVERIS_SIGNALS, text);
  if (hasBag && hasAlisveris) return 'both';
  if (hasBag) return 'bag';
  if (hasAlisveris) return 'alisveris';
  return null;
}

function dfGetBagAlisverisContext(text) {
  const result = dfDetectBagVsAlisveris(text);
  if (!result) return '';
  return p('prompt.iliski.bag_vs_alisveris_' + result);
}

