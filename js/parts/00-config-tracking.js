import { S } from '../state.js';
import { AI_MODES } from '../config.js';
import { STORAGE_KEYS, SecureStorage, AnimUtils, escapeHTML } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { p, dp, dpTest, dpNormalizeKonum } from './16-i18n-prompts.js';
import { p2GetEmotionalCycleInsight } from './09a-personalization-engine.js';
import { dgNabiz, dgYay, dgIklimTabanEkle, dgIklimKaydet, DG_KARSILAMALAR } from './13D-duygu-motoru.js';

/* ── Türkiye Saat Dilimi Yardımcıları (Europe/Istanbul, UTC+3) ──
   Tarayıcının sistem saati farklı bir zone'da olsa bile tüm
   getHours/getDay/toDateString çağrıları doğru TR saatini döndürür.
*/
const _TZ = 'Europe/Istanbul';
export function nowTR() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: _TZ }));
}
export function toTR(date) {
  return new Date(new Date(date).toLocaleString('en-US', { timeZone: _TZ }));
}

export function getUserFirstName() {
  return S.currentUser?.user_metadata?.full_name?.split(' ')[0] || 'Sen';
}

export function getAllMessages() { return Object.values(S.allSessions).flat(); }

/* ═══ SEANS FAZI KALDIRILDI ═══
   Eski sabit fazlar (Explore→Deepen→Confront→Close) kaldırıldı.
   Uygulama gün boyu açık kalıyor, kullanıcı farklı konularla dönüyor —
   mesaj sayısına bağlı sabit faz modeli bu kullanım desenine uymuyor.
   Sohbet akışı kararı artık LLM-driven mod sistemiyle birlikte LLM'e bırakıldı.
*/
export function getUserMsgCount() {
  return S.chatHistory.filter(m => m.role === 'user').length;
}

/* ═══ DUYGUSAL AKIŞ TAKİBİ ═══
   Seans içi duygusal yolculuğu izler.
   Duygu Motoru'na (13D) DEVREDİLDİ (2026-08-29, FAZ 2): eski sabit
   basamak (5/3/2/1, hiçbir zaman 4 üretmezdi) yerine dgNabiz'in sürekli
   0..4 kuvveti gelir. Yön değişimi tespit ederse bağlam üretir.
   FAZ 3 (İklim): her ölçülen tur İklim'in kendi tabanına eklenir — bir
   sonraki mesajın GÖRECELİ okunacağı zemin burada büyür (K4).
*/

/* ÖLÇÜM DEFTERİ → YAY GİRDİSİ (tek kaynak, inceleme turu 2026-08-30).
   `S._emotionalFlow` kuvveti `intensity` adıyla taşır (satır ~92), `dgYay`
   ise `{kuvvet}` alanı arar. İki ad ayrıştığı için `dgYay` her iki
   çağıranında da DAİMA null dönüyordu; kırık motorda değil, geçirilen
   alandaydı. Dönüştürme İKİ yerde tekrarlanmaz — aynı adı taşıyan ikinci
   bir hesap, biri değişince sessizce ayrışır (01'in kendi "tek ad, tek
   kaynak" gerekçesi). Ad ayrışmasının kendisi ayrı bir iştir: `intensity`
   bu defterin dört tüketicisinde daha yaşıyor, ad göçü plan dışıdır. */
const _yayGirdisi = (kayitlar) => (kayitlar || []).map(k => ({ kuvvet: k && k.intensity }));

export function trackEmotionalFlow(text) {
  /* Kanıt yoksa akışa HİÇBİR ŞEY eklenmez (§6.10) — eski kod kanıtsızlıkta
     sessizce "2: nötr" basıyordu; bu, kanıtı olmayan bir değerdi. Dizi
     boş kalırsa okuyucular zaten `.length ? … : 0` ile güvenli düşer.
     opts.iklim S._dgIklim'dir — dgInit henüz hidre etmediyse `null`/
     `undefined` olabilir, dgNabiz bu durumda mutlak kuvvete güvenli düşer. */
  const nabiz = dgNabiz(text, { iklim: S._dgIklim || null });
  if (!nabiz) {
    /* TAZELİK (K10 kadran 2, denetim 2026-08-29). Eskiden burada yalnız
       `return null` vardı ve `S._dgNabiz` BİR ÖNCEKİ turun nabzını tutmaya
       devam ediyordu — yani kanıtsız bir mesaja ("tamam, peki") iki tur
       önceki cümle KANIT gösterilerek karşılama veriliyordu. Eskimiş okuma
       eskimez, YOK OLUR: bu turun nabzı yoksa alan boşalır ve dgKarsilama
       K6'nın varsayılanına (tanıklık) düşer. `S._dgYay` seansın eğrisidir,
       tek kanıtsız tur onu silmez — ölçüm defteri (S._emotionalFlow)
       değişmediği için zaten aynı kalır. Aynı gerekçeyle `S._dgOncekiNabiz`
       ve `S._dgNabizZaman` da BURADA SİLİNMEZ (FAZ 17, K10 kadran 1-2): bu
       tur ölçüm üretmedi, geçmiş ölçümü yok etmez — 'toren' yüzeyi zaten
       tanık sayısını 1'de tutup kendiliğinden susar.
       ÖLÇÜM YOK EDİLMEZ, GERİ ÇEKİLİR (faz denetimi, 2026-08-30). Bu turun
       KARŞILAMASI için nabız yok olur — kadran 2 budur ve dokunulmadı. Ama
       az önce ölçülmüş tur hâlâ olmuş bir turdur: `S._dgNabiz`i öylece
       silmek, E→∅→E dizisinde ikinci tanığı da siler ve kullanıcı günde iki
       ayrı turda ölçülmüşken tören, araya "tamam" gibi kanıtsız bir mesaj
       girdi diye susardı. Doğru hamle silmek değil, bir basamak GERİ
       ÇEKMEK: nabız "önceki tanık" olur, güncel okuma yine boşalır. */
    S._dgOncekiNabiz = S._dgNabiz || S._dgOncekiNabiz || null;
    S._dgNabiz = null;
    return null;
  }

  /* İLK ÖLÇÜMÜN YÖNÜ YOKTUR (denetim 2026-08-29). Eski kod boş akışta
     `prev = 2` varsayıyordu — uydurulmuş bir başlangıç noktasına göre
     hesaplanan yön, ölçüm gibi görünen bir tahmindir (§6.10). Öncesi
     yoksa yön `null`: bir noktanın eğrisi olmaz. */
  const oncekiKayit = S._emotionalFlow.length ? S._emotionalFlow[S._emotionalFlow.length - 1] : null;
  const intensity = nabiz.kuvvet;
  const direction = !oncekiKayit ? null
    : intensity > oncekiKayit.intensity + 0.5 ? 'up'
    : intensity < oncekiKayit.intensity - 0.5 ? 'down' : 'flat';

  // Tur indeksi bitişiklik sınamasının kanıtıdır (getEmotionalFlowInsight) —
  // S._emotionalFlow yalnız KANITLI turları taşır, ardışık iki kayıt artık
  // ardışık iki mesaj olmayabilir; tur farkı olmadan "geçiş" okumak yanlış
  // bir bitişiklik iddiasıdır (plan FAZ 3, denetimde bulunan kırık).
  S._emotionalFlow.push({ intensity, direction, text: text.slice(0, 50), tur: getUserMsgCount() });
  /* İKİ TANIK KANITI (FAZ 17, K10 'toren' satırı) — 'toren' yüzeyi bu
     turun ölçümüyle BİR ÖNCEKİ turun ölçümünü ayrı iki tanık sayar; devir
     ÜZERİNE yazmadan önce olmalı, yoksa iki alan da aynı nabza işaret eder
     ve tanık sayısı sahte 2'ye şişer.
     ARADAKİ KANITSIZ TUR TANIĞI SİLMEZ (faz denetimi, 2026-08-30 — kırık
     planın (c) tarifindeydi, uygulamada değil). Devir yalnız `S._dgNabiz`
     üzerinden yapılsaydı E→∅→E dizisinde ikinci tanık kaybolurdu: kullanıcı
     günde iki ayrı turda ölçülmüşken tören, araya "tamam" gibi kanıtsız bir
     mesaj girdiği için susardı. Oysa kadran 1 "iki AYRI TURUN ölçümü" der —
     araya giren sessiz tur bir ölçümü yok etmez (aynı dosyanın kanıtsız-tur
     dalındaki gerekçesiyle simetrik). Takma riski yok: `S._dgNabiz` null
     iken taşınan kayıt zaten BAŞKA bir turundur. */
  S._dgOncekiNabiz = S._dgNabiz || S._dgOncekiNabiz || null;
  S._dgNabiz = nabiz;
  S._dgNabizZaman = Date.now(); // K10 kadran 2 — ölçümün damgası, 'gun' tazeliği bunu okur
  /* YAY ÖLÜYDÜ — ALAN ADI AYRIŞMASI (inceleme turu, 2026-08-30).
     `dgYay` `{kuvvet}` alanı taşıyan girdileri sayar; bu defter aynı sayıyı
     `intensity` adıyla tutar (satır ~92: `const intensity = nabiz.kuvvet`).
     İkisi ayrıştığı için `dgYay` DAİMA null dönüyordu — ve `nabiz.yon` de
     null (bu çağrı `opts.onceki` geçmez), yani `dgKarsilama`'nın `akisYon`u
     hiçbir zaman dolmuyordu: K2'nin ikinci kuralı (yükselen yoğunlukta
     yatıştırma) yapısal olarak ölüydü. Birim testleri bunu göremezdi —
     `dgYay` kendi sözleşmesini doğru uyguluyor, kırık ÇAĞRIDAYDI.
     Plan FAZ 3 bunu açıkça istemişti: "Yayı (dgYay) bu fazda gerçek
     tüketici yaptığında…". Ad ayrışmasının kendisi ayrı bir iştir
     (`intensity` bu defterin dört tüketicisinde daha yaşıyor — FAZ 18
     denetiminin `hisler`/`duygular` gözlemiyle aynı sınıf, ad göçü plan
     dışıdır); burada sözleşme çağrı yerinde karşılanır. */
  S._dgYay = dgYay(_yayGirdisi(S._emotionalFlow.slice(-3)));

  if (S._dgIklim) {
    /* TABANA MUTLAK KUVVET YAZILIR (K4, inceleme turu 2026-08-30).
       `nabiz.kuvvet` İklim hidre olduktan sonra GÖRELİ kuvvettir
       (`_dgGoreliKuvvet`in yüzdelik çıktısı). Onu kovaya geri yazmak zemini
       kendi çıktısıyla beslemekti: `_dgGoreliKuvvet` gelen MUTLAK kuvveti
       kovadaki değerlerle kıyaslar, kova yüzdeliklerle dolunca kıyas
       anlamını yitirir ve dağılım zamanla kendi ortasına düzleşir — "son 90
       ÖLÇÜMÜN dağılımı" (K4) artık ölçümlerin değil, kendi cevaplarının
       dağılımı olur. `dgIklimTabanEkle`nin kendi sözleşmesi de "mutlak
       kuvvet" der; kırık orada değil, burada geçirilen alandaydı. */
    S._dgIklim = dgIklimTabanEkle(S._dgIklim, nabiz.kuvvetMutlak);
    dgIklimKaydet(S._dgIklim);
  }
  return { intensity, direction };
}

export function getEmotionalFlowInsight() {
  if (S._emotionalFlow.length < 2) return '';
  const recent = S._emotionalFlow.slice(-3);
  const curr = recent[recent.length - 1];
  const prev = recent.length >= 2 ? recent[recent.length - 2] : null;

  /* BİTİŞİKLİK (FAZ 3 denetim dersi) — S._emotionalFlow artık yalnız
     kanıtlı turları taşır; iki ardışık KAYIT ardışık iki MESAJ olmayabilir.
     Tur farkı 1'den büyükse aralarında konuşulmamış turlar var demektir,
     bu iki nokta arasında "geçiş" okumak sahte bir bitişiklik iddiasıdır. */
  const bitisik = !!(prev && curr && typeof prev.tur === 'number' && typeof curr.tur === 'number' && (curr.tur - prev.tur) === 1);
  /* dgYay gerçek tüketici — son 3 kaydın trendini teyit eder, tek başına
     prev/curr eşiği değil, EĞRİYİ okur (plan FAZ 3). Yorum burada FAZ
     3'ten beri duruyordu ama çağrı ölüydü: `recent` `intensity` taşır,
     `dgYay` `kuvvet` arar → daima null, yani aşağıdaki İKİ okuma
     (sakin→yoğun, yoğun→sakin) hiç doğmuyordu. */
  const yay = dgYay(_yayGirdisi(recent));

  // Sakin → yoğun: bir şeye dokunduk (yalnız BİTİŞİK turlarda okunur)
  if (bitisik && yay === 'yukselen' && prev.intensity <= 2 && curr.intensity >= 4) {
    return p('prompt.emotional.calm_to_intense');
  }
  // Yoğun → sakin: kaçış mı yoksa gerçek rahatlama mı?
  if (bitisik && yay === 'dusen' && prev.intensity >= 4 && curr.intensity <= 2) {
    return p('prompt.emotional.intense_to_calm');
  }
  // Sürekli yüksek: dayanıklılık sınırı (bitişiklik şart değil — art arda
  // 3 KAYITTA hep yüksek kalmış olmak, aradaki turlar konuşulmamış olsa
  // bile doğru bir okumadır)
  if (recent.length >= 3 && recent.every(e => e.intensity >= 4)) {
    return p('prompt.emotional.sustained_high');
  }
  // Pozitif akış: kutlama fırsatı
  if (curr.intensity === 1 && dpTest('detect.intensity.positive', S._emotionalFlow[S._emotionalFlow.length - 1]?.text || '')) {
    return p('prompt.emotional.positive');
  }
  return '';
}

/* ═══ ADVANCED DETECTORS STATE ═══ */

// Detection patterns → dp('detect.*') — 13-dil desteği (16-i18n-prompts.js)
// AVOIDANCE_PATTERNS   → dp('detect.avoidance')
// VULNERABILITY_PATTERNS → dp('detect.vulnerability')
// PROGRESS_PATTERNS     → dp('detect.progress')
// EXPLICIT_MODE_REQUESTS → dp('detect.explicit_mode.*')

export function detectExplicitModeRequest(text) {
  const modeMap = {
    [AI_MODES.DIRECT]:     'detect.explicit_mode.direct',
    [AI_MODES.SOFT]:       'detect.explicit_mode.soft',
    [AI_MODES.REFLECTIVE]: 'detect.explicit_mode.reflective',
    [AI_MODES.PATTERN]:    'detect.explicit_mode.pattern',
    [AI_MODES.DEPTH]:      'detect.explicit_mode.depth'
  };
  for (const [mode, dpKey] of Object.entries(modeMap)) {
    if (dpTest(dpKey, text)) return mode;
  }
  return null;
}

export function _detectDepthSignal(text) {
  if (dpTest('detect.depth', text)) return true;
  if (dpTest('detect.depth_self_worth', text)) return true;
  return false;
}

export function detectMessageTone(text) {
  const isVulnerable = dpTest('detect.vulnerability', text);
  const isAvoidance  = dpTest('detect.avoidance', text);
  const isProgress   = dpTest('detect.progress', text);
  const isDepth      = _detectDepthSignal(text);
  const explicitMode = detectExplicitModeRequest(text);
  return { isVulnerable, isAvoidance, isProgress, isDepth, explicitMode };
}

export function _detectPatternModeSignal(text) {
  // Örüntü modu tetikleyicileri:
  // 1. Kullanıcı kendi kalıbını fark etmeye başlıyor
  if (dpTest('detect.pattern_awareness', text)) return true;
  // 2. Aynı savunma mekanizması 3+ kez (bu seans)
  const defCounts = S._personalityMap?.defense_mechanisms;
  if (defCounts?.length) {
    const sessDefense = defCounts.filter(d => d.count >= 3);
    if (sessDefense.length > 0) return true;
  }
  // 3. Duygusal döngü tespit edildiyse
  if (p2GetEmotionalCycleInsight()) return true;
  // 4. Tetikleyici sekans tekrar ediyorsa
  if (S._predictionModel?.trigger_sequences?.length >= 3) {
    const seqCounts = {};
    S._predictionModel.trigger_sequences.forEach(s => {
      seqCounts[s.antecedent] = (seqCounts[s.antecedent] || 0) + 1;
    });
    if (Object.values(seqCounts).some(c => c >= 3)) return true;
  }
  // 5. Direniş haritasında güçlü kalıp
  if (_resistanceLog.length >= 8) {
    const dayCounts = Array(7).fill(0);
    _resistanceLog.forEach(e => dayCounts[e.day]++);
    if (Math.max(...dayCounts) >= 4) return true;
  }
  return false;
}

export function updateAIMode(text) {
  const { isVulnerable, isAvoidance, isProgress, isDepth, explicitMode } = detectMessageTone(text);

  S._modeExplicitRequest = explicitMode;

  if (isAvoidance) {
    S.avoidanceCount++;
    S.consecutiveAvoidance++;
    if (S.consecutiveAvoidance >= 2) triggerPatternBreakFlash();
  } else {
    S.consecutiveAvoidance = 0;
  }

  const patternSignal = _detectPatternModeSignal(text);

  if (explicitMode) {
    S._modeHint = explicitMode;
  } else if (patternSignal && getUserMsgCount() >= 4) {
    S._modeHint = AI_MODES.PATTERN;
  } else if (isDepth && getUserMsgCount() >= 2) {
    S._modeHint = AI_MODES.DEPTH;
  } else if (isProgress && !isAvoidance) {
    S._modeHint = AI_MODES.CELEBRATE;
  } else if (isVulnerable) {
    S._modeHint = AI_MODES.SOFT;
  } else if (isAvoidance) {
    S._modeHint = AI_MODES.DIRECT;
  } else {
    S._modeHint = getUserMsgCount() >= 3 ? AI_MODES.REFLECTIVE : AI_MODES.SOFT;
  }
}

const MODE_FLASH_COLORS = {
  [AI_MODES.DIRECT]:      'rgba(192,57,43,0.22)',
  [AI_MODES.REFLECTIVE]:  'rgba(90,138,216,0.20)',
  [AI_MODES.CELEBRATE]:   'rgba(91,185,123,0.24)',
  [AI_MODES.PATTERN]:     'rgba(168,85,247,0.22)',
  [AI_MODES.DEPTH]:       'rgba(218,165,32,0.24)',
};

export function triggerModeFlash(mode) {
  const color = MODE_FLASH_COLORS[mode];
  if (!color) return;
  const el = document.getElementById('flash-overlay');
  if (!el) return;
  el.style.setProperty('--flash-color', color);
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 420);
}

const MODE_AURA_CLASS = {
  [AI_MODES.DIRECT]:      'aura-direct',
  [AI_MODES.REFLECTIVE]:  'aura-reflective',
  [AI_MODES.CELEBRATE]:   'aura-celebrate',
  [AI_MODES.PATTERN]:     'aura-pattern',
  [AI_MODES.DEPTH]:       'aura-depth',
};

/* Duygu Motoru (13D, FAZ 7, K8 beden kanalı) — karşılamanın atmosfere
   girişi. MUHAFAZAKÂR eşleme: yeni renk/gradient İCAT EDİLMEDİ, yalnız
   halihazırda o duyguyla örtüşen İKİ mevcut aura sınıfı yeniden kullanıldı
   (kutlama→aura-celebrate, diriltme→aura-kindle — bu ikincisi FAZ 8'de
   `aura-depth`ten AYRILDI: rengi doğruydu, altın eylemin rengidir, ama
   adı yanlıştı; artık aynı kuralı paylaşan kendi adını taşıyor). Işığın DOZU — kaç eksende
   görünsün, ne kadar sık — FAZ 8'in kararıdır (plan Devir gerekçesi:
   "ışığın dozu... üründe, kulakla ve gözle ayarlanır"). Kalan dört eksen
   (tanıklık/yatıştırma/berraklık/sahiplenme) mod tabanlı auraı EZMEZ — K7
   "sessiz eşlik" töresi burada da geçerli. `tutma` burada YOK: K9 gereği
   kriz anında aura karşılamadan asla etkilenmez, yalnız mod sınıfı kalır. */
const DG_AURA_CLASS = {
  kutlama:  'aura-celebrate',
  diriltme: 'aura-kindle',
};

export function setAmbientAura(mode, dgEksen) {
  const aura = document.getElementById('ambient-aura');
  if (!aura) return;
  const newClass = (dgEksen && dgEksen !== 'tutma' && DG_AURA_CLASS[dgEksen]) || MODE_AURA_CLASS[mode] || '';
  if (aura.className === newClass) return;
  if (AnimUtils.prefersReducedMotion()) {
    aura.className = newClass;
    return;
  }
  aura.style.opacity = '0';
  setTimeout(() => {
    aura.className = newClass;
    aura.style.opacity = '';
  }, 450);
}

/**
 * Mod rozeti güncellemesinden sonra çalıştırılacak hook'lar.
 * 13-extras.js gibi modüller burada listener kaydeder (ör. atmosfer şeridi yenileme)
 * — bu sayede updateModeBadge'in monkey-patch'lenmesi gerekmez.
 */
const _modeBadgeListeners = [];
export function onModeBadgeUpdate(fn) {
  if (typeof fn === 'function') _modeBadgeListeners.push(fn);
}

export function updateModeBadge() {
  const badge = document.getElementById('mode-badge');
  if (!badge) {
    _modeBadgeListeners.forEach(fn => { try { fn(); } catch (e) { console.warn('[modeBadge listener]', e); } });
    return;
  }
  badge.className = 'mode-badge w2-mode-badge';
  const map = {
    [AI_MODES.DIRECT]:      [t('mode.direct'),      'direct'],
    [AI_MODES.REFLECTIVE]:  [t('mode.reflective'),  'reflective'],
    [AI_MODES.CELEBRATE]:   [t('mode.celebrate'),   'celebrate'],
    [AI_MODES.PATTERN]:     [t('mode.pattern'),     'pattern'],
    [AI_MODES.DEPTH]:       [t('mode.depth'),        'depth'],
  };
  const entry = map[S.currentAIMode];
  if (entry) { badge.textContent = entry[0]; badge.classList.add(entry[1]); }
  else { badge.textContent = t('mode.soft'); }

  // Mod gerçekten değiştiyse flash yansı + kalıcı aura güncelle
  if (S.currentAIMode !== S._lastFlashedMode) {
    if (S.currentAIMode !== AI_MODES.SOFT) triggerModeFlash(S.currentAIMode);
    S._lastFlashedMode = S.currentAIMode;
  }
  /* Duygu Motoru (13D, FAZ 7) — bu turun karşılama kararı 01'in
     buildContextPrompt'unda TEK KEZ hesaplanıp S._dgSonKarsilama'ya
     yazıldı; burada YENİDEN HESAPLANMAZ, yalnız son kayıt okunur
     (buildModeSelectionGuide'daki aynı desen — "tek ad, tek kaynak").
     İKİNCİ bir çağrı yeri AÇILMADI — mevcut tek çağrı genişletildi. */
  const _dgSonAura = S._dgSonKarsilama.length ? S._dgSonKarsilama[S._dgSonKarsilama.length - 1] : null;
  setAmbientAura(S.currentAIMode, _dgSonAura && _dgSonAura.eksen);

  // Kayıtlı listener'ları çağır (eski 13-extras wrap'inin yerine geçer)
  _modeBadgeListeners.forEach(fn => { try { fn(); } catch (e) { console.warn('[modeBadge listener]', e); } });
}

export function triggerPatternBreakFlash() {
  triggerModeFlash(AI_MODES.DIRECT);
}

/* ═══ MOD SİSTEMİ — LLM-Driven ═══
   Mod kararı artık LLM'e bırakılıyor.
   Regex ön tahmini (hint) ipucu olarak gönderilir, son karar LLM'in.
   LLM yanıtının başına [MOD:xxx] koyar, client parse edip UI'ı günceller.
═══════════════════════════════════════════════════════════════ */

export function getModeHintLabel(mode) {
  const keyMap = {
    [AI_MODES.SOFT]:        'prompt.mode.hint.soft',
    [AI_MODES.DIRECT]:      'prompt.mode.hint.direct',
    [AI_MODES.REFLECTIVE]:  'prompt.mode.hint.reflective',
    [AI_MODES.CELEBRATE]:   'prompt.mode.hint.celebrate',
    [AI_MODES.PATTERN]:     'prompt.mode.hint.pattern',
    [AI_MODES.DEPTH]:       'prompt.mode.hint.depth'
  };
  return p(keyMap[mode] || 'prompt.mode.hint.soft');
}

export function buildModeSelectionGuide() {
  const hint = getModeHintLabel(S._modeHint);
  const msgCount = getUserMsgCount();

  // Omurga + Kartuş (FAZ 3 — .claude/plans/mod-sistemi.md): kimlik + protokol
  // her turda sabit gider; 6 modun TAMAMI yerine yalnız ipucu modu ve (varsa)
  // son gerçek LLM modu için derin talimat kartuşu eklenir (en fazla 2, aynıysa 1).
  let guide = '\n' + p('prompt.identity.core') + '\n\n' + p('prompt.mode.protocol');
  const _cardModes = new Set(
    [S._modeHint, S.currentAIMode].filter(m => m && Object.values(AI_MODES).includes(m))
  );
  _cardModes.forEach(m => { guide += '\n\n' + p('prompt.mode.card.' + m); });

  // Mod geçmişi — LLM'in kendi seçimlerini görmesi
  if (S._modeHistory.length > 0) {
    const recent = S._modeHistory.slice(-4);
    const labels = recent.map(m => getModeHintLabel(m));
    const lastMode = labels[labels.length - 1];
    guide += '\n\n' + p('prompt.mode.history', { labels: labels.join(' → ') });

    // Yapışkanlık uyarısı
    const tail = S._modeHistory.slice(-3);
    if (tail.length >= 2 && tail.every(m => m === tail[0])) {
      guide += '\n' + p('prompt.mode.stickiness_warning', { count: tail.length, mode: lastMode });
    }
  }

  guide += '\n\n' + p('prompt.mode.session_info', { msgCount });
  guide += '\n' + p('prompt.mode.hint_note', { hint });

  /* Duygu Motoru (13D, FAZ 5) — bu turun karşılama kararı 01'in
     buildContextPrompt'unda TEK KEZ hesaplanıp S._dgSonKarsilama'ya
     yazılıyor; burada YENİDEN HESAPLANMAZ, yalnız son kayıt okunur (aynı
     adı taşıyan ikinci bir hesap sıra değişince sessizce ayrışır — "tek
     ad, tek kaynak", bkz. 01'deki karsilama yorumu). Dizi boşsa (örn.
     16g prova sahnesi buildContextPrompt'u hiç çağırmadan bu fonksiyonu
     doğrudan çağırıyor) satır sessizce düşer. */
  const _dgSon = S._dgSonKarsilama.length ? S._dgSonKarsilama[S._dgSonKarsilama.length - 1] : null;
  if (_dgSon && _dgSon.eksen) {
    guide += '\n\n' + p('prompt.mode.karsilama', { eksen: p('prompt.dg.eksen.' + _dgSon.eksen) });
  }

  if (S._modeExplicitRequest) {
    const label = getModeHintLabel(S._modeExplicitRequest);
    guide += '\n\n' + p('prompt.mode.explicit_request', { mode: label });
  }

  if (S.consecutiveAvoidance >= 2) {
    guide += '\n\n' + p('prompt.mode.avoidance_warning', { count: S.consecutiveAvoidance });
  }

  // Otomatik mod dengeleme: %80+ aynı modda → alternatif öner
  const balancingHint = getBalancingModeHint();
  if (balancingHint) {
    guide += '\n\n' + p('prompt.mode.balancing', { mode: getModeHintLabel(balancingHint) });
  }

  return guide;
}

/* ── LLM yanıtından mod parse etme ── */

/* Duygu Motoru (13D, FAZ 9, K5 "iki okuyucu, tek satır") — model kendi
   okumasını AYNI [MOD:] satırına ekleyebilir: [MOD:soft|DG:yatistirma#S2].
   DG bloğu ve #S referansı İSTEĞE BAĞLIDIR — hiçbiri gelmezse eski çıplak
   [MOD:xxx] hiç değişmeden çalışır (geriye uyumluluk, tests/00-mode-system
   bunu kilitler). Model etiketi TÜRKÇELEŞTİRİR ([[llm-bicimleri-geri-sizar]])
   — "DG" yerine "DUYGU" yazabilir, ikisi de kabul edilir. Eksen kelimesi
   Unicode harfle (\p{L}) yakalanır ki diyakritikli bir yazım REGEX'İ
   KIRMASIN (tag yine sıyrılır, ekranda kalmaz) — ama TANIMA
   (extractDgReading, DG_KARSILAMALAR'a karşı) yalnız ASCII sözleşmeye
   uyanı kabul eder, gerisi sessizce yok sayılır (§6.10). `_akisMaskesi`
   (06-summary-chat) akış sırasında AYNI temel deseni kendi TAM/YARIM
   ikilisiyle taşır — biri değişirse öteki de değişmeli (13o `gcFire`
   ikizi emsali, [[llm-bicimleri-geri-sizar]] "How to apply").

   MOD DEĞERİ DE UNICODE (denetim 2026-08-29). Yakalama eskiden `\w+` idi
   ve `\w` Unicode bayrağıyla bile ASCII'dir: model modu Türkçeleştirince
   (`[MOD:yumuşak]`) desen HİÇ tutmuyor, yani etiket sıyrılmıyor ve
   kullanıcı HAM `[MOD:yumuşak]` metnini ekranda görüyordu. Bu, tam da
   [[llm-bicimleri-geri-sizar]]'ın belgelediği kırık sınıfı. Artık etiket
   DAİMA sıyrılır; tanınmayan mod değeri ise UYGULANMAZ — çağıran taraf
   AI_MODES'a karşı sınar ve ipucu moduna düşer (aşağıda). Sıyırma gevşek,
   tanıma sıkı: ekran korunur, karar uydurulmaz (§6.10). */
const MOD_TAG_RE = /^\[MOD:([\p{L}\p{N}_]+)(?:\s*\|\s*(?:DG|DUYGU)\s*:\s*([\p{L}_]+)(?:\s*#\s*[Ss]?(\d{1,2}))?)?\]\s*/iu;

export function stripModeTag(text) {
  return text.replace(MOD_TAG_RE, '');
}

/** Modelin İKİNCİ okuyucu olarak bastığı duygu okumasını [MOD:] satırından
 *  çıkarır (FAZ 9, K5) — uygulamanın kendi kararını EZMEZ, çağıran taraf
 *  (06) yanına kaydeder. Kanıt yoksa ya da eksen DG_KARSILAMALAR'a
 *  uymuyorsa (diyakritik/uydurma kelime) `null`: uydurma bir eşleşmeye
 *  düşülmez (§6.10). `ref` yalnız NUMARADIR — metni bu fonksiyon ASLA
 *  üretmez, kaynaktan kesme işi çağıranın `kokenAlintiCoz` çağrısıdır (K5:
 *  model alıntıyı yazmaz, gösterir). Modelin kendi güven sayısı hiç
 *  TAŞINMAZ (K4) — sözleşmede böyle bir alan yok. */
export function extractDgReading(text) {
  const m = String(text == null ? '' : text).match(MOD_TAG_RE);
  if (!m || !m[2]) return null;
  const eksen = m[2].toLowerCase();
  if (!DG_KARSILAMALAR.includes(eksen)) return null;
  return { eksen, ref: m[3] ? ('S' + m[3]) : null };
}

/* ── Mod filigranı — modelin taklit ettiği meta satır ──
   06, LLM'e giden GEÇMİŞ assistant mesajlarının başına
   `[bu yanıt "tasarla" modunda yazıldı]` satırını ekler (prompt.mode.past_watermark)
   ki model kendi ton geçmişini görsün. Yan etkisi: model bu satırı "assistant
   mesajları böyle başlar" diye öğrenip KENDİ çıktısının başına yazıyor. Sıyrılmazsa
   üç zarar birden doğuyordu — satır ekrana çıkar, geçmişe+DB'ye yazılır ve sonraki
   turda 06 üstüne bir filigran DAHA bindirerek birikir; ayrıca öne geçtiği için
   [MOD:] tag'i baştan yakalanamaz, mod telemetrisi yanlışlıkla "tag_missing" sayar.
   Bu yüzden filigran hem çıkışta (burada) hem girişte (06 idempotent ekleme) soyulur. */
const RE_MODE_WM = /^[ \t]*\[(?:bu yanıt|this reply)\b[^\]\n]*\][ \t]*\r?\n?/i;

export function stripModeWatermark(text) {
  if (!text) return text;
  let out = String(text);
  // Birikmiş katman olabilir (her tur bir tane bindirebiliyordu) — sabit noktaya kadar soy
  for (let i = 0; i < 5; i++) {
    const next = out.replace(RE_MODE_WM, '');
    if (next === out) break;
    out = next;
  }
  return out;
}

/* Geri-okuma katmanı: DB'deki ESKİ yanıtlar sıyırıcılar yazılmadan önce
   kaydedildikleri için filigran taklidini ve ham protokol bloklarını
   ([TAKİP]…[/TAKİP] gibi — parser Türkçe yazımı kaçırıyordu) içerebiliyor.
   Geçmiş bir seans açıldığında metni görüntü ve LLM bağlamı için temizler;
   DB'ye dokunmaz. Yeni yanıtlar zaten temiz kaydedilir. */
export function cleanHistoryText(content) {
  let s = stripModeWatermark(String(content || ''));
  try {
    // 13a window üzerinden expose eder; henüz yüklenmediyse sessizce ham kalır
    const proto = window.aracExtract?.(s);
    if (proto) s = proto.text || '✦';
  } catch (_) {}
  return s;
}

// Mod dağılımı — son N modda aynı modun yüzdesi
export function getModeDistribution(n = 6) {
  const recent = S._modeHistory.slice(-n);
  if (!recent.length) return {};
  const counts = {};
  recent.forEach(m => { counts[m] = (counts[m] || 0) + 1; });
  const result = {};
  Object.entries(counts).forEach(([m, c]) => { result[m] = c / recent.length; });
  return result;
}

// Tüm modlar için birikmiş etkililik skoru (effective - ineffective)
export function getModeEffectivenessScores() {
  const scores = {};
  Object.values(AI_MODES).forEach(m => { scores[m] = 0; });
  const { effective_approaches = [], ineffective_approaches = [] } = S._adaptiveCommunication || {};
  effective_approaches.forEach(({ mode, score }) => {
    /* KOKEN-MUAF: kaydın VARLIĞI zaten kanıttır (bu yaklaşım etkili diye
       işaretlenmiş); varsayılan olan ölçüm değil, kaydın ağırlığıdır */
    if (mode in scores) scores[mode] += (score || 3);
  });
  ineffective_approaches.forEach(({ mode, score }) => {
    if (mode in scores) scores[mode] += (score || -2);
  });
  return scores;
}

// Otomatik mod dengeleme: 5/6 aynı modsa → daha etkili alternatifi öner
export function getBalancingModeHint() {
  const dist = getModeDistribution(6);
  const dominant = Object.entries(dist).sort((a, b) => b[1] - a[1])[0];
  if (!dominant || dominant[1] < 0.80) return null; // %80 altı → dengesizlik yok
  const effScores = getModeEffectivenessScores();
  // Etkililik skoruna göre sırala; aynı skorda rastgele seç
  const alternatives = Object.values(AI_MODES)
    .filter(m => m !== dominant[0])
    .sort((a, b) => (effScores[b] || 0) - (effScores[a] || 0));
  return alternatives[0] || null;
}

/* ═══ MOD PUSULASI — tören katmanı (FAZ 5, .claude/plans/mod-sistemi.md) ═══
   Yalnız "ağır" modlara girip çıkmak sohbet akışına görsel-yalnız (kalıcı
   DEĞİL — reload'da kaybolur, chat_history'ye yazılmaz) bir ayraç düşürür.
   Sık geçilen soft/reflective/celebrate arası çekişme sohbeti kalabalıklaştırmasın. */
const _BIG_TRANSITION_MODES = new Set([AI_MODES.DIRECT, AI_MODES.DEPTH, AI_MODES.PATTERN]);

export function isBigModeTransition(prevMode, nextMode) {
  if (!prevMode || !nextMode || prevMode === nextMode) return false;
  return _BIG_TRANSITION_MODES.has(nextMode) || _BIG_TRANSITION_MODES.has(prevMode);
}

const MODE_GLYPHS = {
  [AI_MODES.SOFT]:       '◦',
  [AI_MODES.DIRECT]:     '▲',
  [AI_MODES.REFLECTIVE]: '◇',
  [AI_MODES.CELEBRATE]:  '✦',
  [AI_MODES.PATTERN]:    '↻',
  [AI_MODES.DEPTH]:      '▽',
};

function _insertModeSwitchDivider(mode) {
  const area = document.getElementById('messages-area');
  if (!area) return;
  // NOT: getModeHintLabel() küçük-harf LLM ipucu metnidir (ör. "yüzleş") — burası
  // kullanıcıya görünen UI, rozetle aynı büyük-harf etiketi kullanır (t('mode.X')).
  const text = t('mode.transition_divider', '{{label}} moduna geçildi').replace('{{label}}', t('mode.' + mode));
  const div = document.createElement('div');
  div.className = 'mode-switch-divider';
  div.setAttribute('role', 'separator');
  div.setAttribute('aria-label', text);
  div.style.setProperty('--mdv-c', `var(--mode-${mode}-color)`);
  div.innerHTML = `
    <span class="mode-switch-line" aria-hidden="true"></span>
    <span class="mode-switch-body">
      <span class="mode-switch-glyph" aria-hidden="true">${escapeHTML(MODE_GLYPHS[mode] || '◦')}</span>
      <span class="mode-switch-text">${escapeHTML(text)}</span>
    </span>
    <span class="mode-switch-line" aria-hidden="true"></span>`;
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

export function applyLLMMode(modeStr) {
  if (!modeStr || !Object.values(AI_MODES).includes(modeStr)) return;
  const prevMode = S.currentAIMode;
  S.currentAIMode = modeStr;
  S._modeHistory.push(modeStr);
  if (S._modeHistory.length > 8) S._modeHistory.shift();
  updateModeBadge();
  if (isBigModeTransition(prevMode, modeStr)) {
    try { _insertModeSwitchDivider(modeStr); } catch (_) {}
  }
}

/* ── Streaming buffer: ilk chunk'larda mod tag'ini yakalar ── */

export function createModeAwareChunkHandler(streamMsg) {
  let buffer = '';
  let parsed = false;
  let tagFound = false; // FAZ 4 telemetrisi: gerçek [MOD:] tag'i mi, yoksa ipucu fallback'i mi

  return {
    onChunk(delta) {
      if (parsed) {
        streamMsg.appendChunk(delta);
        return;
      }

      buffer += delta;

      // Filigran taklidi baştaysa [MOD:] tag'ini gizler ve ekrana çöp bırakır —
      // tag aramasından ÖNCE soyulur (bkz. stripModeWatermark)
      const probe = stripModeWatermark(buffer);

      // Tag'i ara: [MOD:xxx] — DG: uzantısı geldiyse (FAZ 9) de AYNI tek
      // regex'te yakalanır ki gövdesi ekrana hiç sızmasın; DG verisi
      // burada OKUNMAZ (yalnız match[1]/mod kullanılır) — extractDgReading
      // finalize'da tam `reply` üzerinde çalışır (bkz. 06 _runLLMTurn).
      const match = probe.match(MOD_TAG_RE);
      if (match) {
        parsed = true;
        tagFound = true;
        /* Etiket sıyrıldı (ekran korundu) ama mod TANINMIYORSA uygulanmaz:
           modelin Türkçeleştirdiği bir değer (`yumuşak`) S.currentAIMode'a
           yazılsaydı rozet, aura ve sıcaklık tabloları sessizce boşa
           düşerdi. Tanınmıyorsa "tag gelmedi" dalıyla aynı yere düşülür. */
        const mode = match[1].toLowerCase();
        applyLLMMode(Object.values(AI_MODES).includes(mode) ? mode : S._modeHint);
        // Tag sonrasındaki metni gönder
        const remaining = probe.slice(match[0].length);
        if (remaining) streamMsg.appendChunk(remaining);
        return;
      }

      // 30 karakter geçti ve hâlâ tag yok — tag gelmeyecek, ipucu moduna düş
      // (S3 fix: fallback olmadan rozet/aura/etkililik sessizce bayat kalırdı)
      // Kapanmamış bir köşeli-parantez satırı akıyorsa biraz daha bekle: filigran
      // taklidi 30 karakteri aşar, yarım basılırsa ekranda çöp kalır — 160'ta pes edilir.
      const stillOpen = /^[ \t]*\[[^\]\n]*$/.test(probe);
      if (probe.length > 30 && (!stillOpen || probe.length > 160)) {
        parsed = true;
        applyLLMMode(S._modeHint);
        streamMsg.appendChunk(probe);
      }
    },
    // finalize'da da strip et (streaming olmayan fallback + final temizlik).
    // Filigran ve [MOD:] tag'i modelin keyfine göre iki sırayla da gelebiliyor —
    // filigran → tag → filigran soyulunca ikisi de yakalanır.
    getCleanText(fullText) {
      return stripModeWatermark(stripModeTag(stripModeWatermark(fullText)));
    },
    isParsed() { return parsed; },
    // FAZ 4 (Mod Nabzı telemetrisi): true → LLM gerçekten [MOD:] yazdı;
    // false → S3 fallback devreye girdi (tag_missing sinyali).
    wasTagFound() { return tagFound; },
    flushIfNeeded() {
      if (!parsed && buffer.length > 0) {
        parsed = true;
        applyLLMMode(S._modeHint);
        streamMsg.appendChunk(stripModeWatermark(buffer));
      }
    }
  };
}

/* ═══════════════════════════════════════════════
   DEVRİMSEL ÖZELLİKLER
   1. Direniş Haritası  — ne zaman kaçıyorsun?
   2. Sessizlik Analizi — hangi konu seni sustururur?
   3. Taahhüt Döngüsü  — verilen sözler takip edilir
   4. Seans Öncesi Bağlam — Emre hazır bekliyor
════════════════════════════════════════════════= */

/* ── 1. DİRENİŞ HARİTASI ──
   Kullanıcının hangi gün/saatte kaçınma kalıpları kullandığını izler.
   "Her Pazartesi sabahı direniyorsun" — bunu tespit edip söyler.
*/
const _resistanceLog = [];

export function loadResistanceLog() {
  if (!S.currentUser?.id) return;
  try {
    const parsed = SecureStorage.get(STORAGE_KEYS.RESISTANCE(S.currentUser.id), S.currentUser.id, []);
    _resistanceLog.length = 0;
    if (Array.isArray(parsed)) _resistanceLog.push(...parsed);
  } catch { /* sessiz */ }
}

export function logResistanceMoment(text) {
  const hasAvoidance = dpTest('detect.avoidance', text);
  if (!hasAvoidance) return;
  const now = nowTR();
  const entry = {
    day:  now.getDay(),       // 0=Pazar … 6=Cumartesi
    hour: now.getHours(),     // 0-23
    date: now.toDateString()
  };
  _resistanceLog.push(entry);
  // Son 90 girişi tut
  if (_resistanceLog.length > 90) _resistanceLog.shift();
  try {
    SecureStorage.set(STORAGE_KEYS.RESISTANCE(S.currentUser?.id), S.currentUser?.id, _resistanceLog);
  } catch (_) {}
}

export function getResistanceInsight() {
  if (_resistanceLog.length < 5) return null;

  // Gün adını Intl ile al (dil-duyarlı)
  const getDayName = (dayIndex) => {
    const d = new Date(2024, 0, dayIndex); // 2024-01-01 = Pazartesi → dayIndex'e göre
    // dayIndex 0=Pazar, 1=Pazartesi...
    const ref = new Date(2024, 0, 7 + dayIndex); // 7 Ocak 2024 = Pazar
    const lang = (typeof S._currentLang !== 'undefined' ? S._currentLang : 'tr');
    const locale = lang === 'tr' ? 'tr-TR' : 'en-US';
    return ref.toLocaleDateString(locale, { weekday: 'long' });
  };

  // Gün bazlı sayım
  const dayCounts = Array(7).fill(0);
  _resistanceLog.forEach(e => dayCounts[e.day]++);
  const maxDay   = dayCounts.indexOf(Math.max(...dayCounts));
  const maxCount = dayCounts[maxDay];
  if (maxCount < 2) return null;

  // Saat bazlı: sabah (6-11) / öğle (11-16) / akşam (16-21) / gece (21-6)
  const slotKeys = ['morning', 'noon', 'evening', 'night'];
  const slotCounts = { morning: 0, noon: 0, evening: 0, night: 0 };
  _resistanceLog.forEach(e => {
    if (e.hour >= 6  && e.hour < 12) slotCounts.morning++;
    else if (e.hour >= 12 && e.hour < 17) slotCounts.noon++;
    else if (e.hour >= 17 && e.hour < 22) slotCounts.evening++;
    else slotCounts.night++;
  });
  const maxSlotKey = Object.entries(slotCounts).sort((a,b) => b[1]-a[1])[0][0];
  const timeSlot = p('prompt.time_slot.' + maxSlotKey);
  const dayName = getDayName(maxDay);

  return p('prompt.resistance.insight', { dayName, timeSlot });
}

/* ── 2. SESSİZLİK ANALİZİ ──
   Kullanıcının hangi konudan sonra sustuğunu (yavaş yanıt / kısa mesaj) takip eder.
   "Aile konusu açılınca susuyorsun" — bunu tespit edip bir sonraki seansta kullanır.
*/
let _lastMessageTopics  = []; // Bu seansın konu izi
let _lastMsgTimestamp   = null;
const _silenceTopicLog  = [];

export function loadSilenceTopicLog() {
  if (!S.currentUser?.id) return;
  try {
    const parsed = SecureStorage.get(STORAGE_KEYS.SILENCE_TOPICS(S.currentUser.id), S.currentUser.id, []);
    _silenceTopicLog.length = 0;
    if (Array.isArray(parsed)) _silenceTopicLog.push(...parsed);
  } catch { /* sessiz */ }
}

// TOPIC_PATTERNS → dp('detect.topic.*') — 13-dil desteği
const _TOPIC_KEYS = ['family', 'work', 'relationship', 'money', 'health', 'future'];
// Eski Türkçe anahtarları normalize et
const _TOPIC_KEY_MIGRATION = { 'aile': 'family', 'iş': 'work', 'ilişki': 'relationship', 'para': 'money', 'sağlık': 'health', 'gelecek': 'future' };

export function detectTopics(text) {
  return _TOPIC_KEYS.filter(k => dpTest('detect.topic.' + k, text));
}

export function trackSilenceTopic(userText) {
  const now = Date.now();
  const topics = detectTopics(userText);

  // Önceki mesajdan bu yana geçen süre > 2 dakika ise "sessizlik" sayılır
  if (_lastMsgTimestamp && _lastMsgTimestamp.topics.length) {
    const gap = now - _lastMsgTimestamp.time;
    if (gap > 120000) { // 2 dakika
      _lastMsgTimestamp.topics.forEach(topic => {
        _silenceTopicLog.push({ topic, date: nowTR().toDateString() });
      });
      if (_silenceTopicLog.length > 50) _silenceTopicLog.shift();
      try {
        SecureStorage.set(STORAGE_KEYS.SILENCE_TOPICS(S.currentUser?.id), S.currentUser?.id, _silenceTopicLog);
      } catch (_) {}
    }
  }

  _lastMsgTimestamp = { time: now, topics };
}

export function getSilenceInsight() {
  if (_silenceTopicLog.length < 3) return null;
  const counts = {};
  _silenceTopicLog.forEach(e => {
    // Eski Türkçe anahtarları normalize et
    const key = _TOPIC_KEY_MIGRATION[e.topic] || e.topic;
    counts[key] = (counts[key] || 0) + 1;
  });
  const top = Object.entries(counts).sort((a,b) => b[1]-a[1])[0];
  if (!top || top[1] < 2) return null;
  return p('prompt.silence.insight', { topic: top[0] });
}

/* ── 3. TAAHHÜT DÖNGÜSÜ ──
   Kullanıcı söz verdiğinde kaydeder, bir sonraki seansta hesap sorar.
*/
// COMMITMENT_PATTERNS → dp('detect.commitment') — 13-dil desteği

export function captureCommitments(text) {
  const commitments = [];
  // detect.commitment {pattern, extract} objeleri taşır (diğer detect.* anahtarları
  // düz RegExp) — pattern'i doğrudan match'e vermek "[object Object]" kaynaklı
  // sahte-regex'e düşer ve HER metinle eşleşir (kritik bug, testte yakalandı).
  /* Büyük-İ tuzağı (FAZ 2d): eşleşme KONUM KORUYAN normalize üstünde
     aranır, ama sözün metni ORİJİNAL cümleden kesilir — kullanıcının verdiği
     söz, kullanıcının yazdığı hâliyle kaydedilir (§6.10). Bugünkü
     `detect.commitment` desenlerinin hiçbiri `i` ile başlamıyor, yani bu
     GİZLİ bir risk: sözlüğe "isterim…" gibi bir desen eklendiği gün sessizce
     kırılırdı. Dikiş şimdi atıldı, o gün fark edilmesi gerekmesin. */
  const hedef = dpNormalizeKonum(text);
  dp('detect.commitment').forEach(entry => {
    const re = entry instanceof RegExp ? entry : entry?.pattern;
    if (!re) return;
    const m = hedef.match(re);
    if (!m) return;
    /* Eşleşmenin ham (orijinal) karşılığı — indeksler birebir uyar.
       SÖZLEŞMENİN TAM SINIRI (çapraz denetim bulgusu, Sonnet): `extract`
       yine çağrılır ve verilen dizide **m[0] ORİJİNALDİR**; `index`,
       `input` ve `groups` da elle taşınır (`[...m]` spread'i `groups`'u
       DÜŞÜRÜR — ampirik doğrulandı). Ama numaralı gruplar (`m[1]`, `m[2]`)
       hâlâ NORMALİZE metinden gelir: bir gün bir `extract` onları okursa
       değeri İ yerine i taşır. Bugün böyle bir tanım yok — dördü de m[0]
       kullanıyor (16c:31-36 ve :108-113) — ama "sözleşme tamamen korunur"
       demek fazla iddialı olurdu ve bu yorum onu demiyor. */
    const ham = text.slice(m.index, m.index + m[0].length);
    const mHam = Object.assign([...m], { index: m.index, input: text, groups: m.groups });
    mHam[0] = ham;
    const extracted = entry.extract ? entry.extract(mHam) : ham;
    commitments.push(String(extracted).slice(0, 100));
  });
  if (!commitments.length) return;

  try {
    let stored = SecureStorage.get(STORAGE_KEYS.COMMITMENTS(S.currentUser?.id), S.currentUser?.id, []);
    commitments.forEach(c => stored.unshift({
      text: c, date: nowTR().toDateString(), checked: false, kept: null
    }));
    if (stored.length > 20) stored = stored.slice(0, 20);
    SecureStorage.set(STORAGE_KEYS.COMMITMENTS(S.currentUser?.id), S.currentUser?.id, stored);
  } catch (_) {}
}

// Eski regex hatasının (yukarıdaki "[object Object]" bug'ı, artık düzeltildi)
// depoda bıraktığı tek/iki karakterlik çöp taahhütleri (ör. "e", "t") temizler —
// düzeltmeden ÖNCE yakalanmış kayıtlar hâlâ storage'da, her Hesap Günü'nde
// anlamsız satırlar olarak geri geliyorlardı. Sessizce "kept:null" ile kapatılır
// (kullanıcıya gösterilmez, ödül verilmez); gerçek taahhütler asla bu kadar kısa olmaz.
function _pruneGarbageCommitments(stored) {
  let mutated = false;
  const cleaned = stored.map(c => {
    if (!c.checked && (!c.text || c.text.trim().length < 3)) {
      mutated = true;
      return { ...c, checked: true, kept: null };
    }
    return c;
  });
  return { cleaned, mutated };
}

export function getCleanCommitments() {
  try {
    const uid = S.currentUser?.id;
    const key = STORAGE_KEYS.COMMITMENTS(uid);
    const stored = SecureStorage.get(key, uid, []);
    const { cleaned, mutated } = _pruneGarbageCommitments(stored);
    if (mutated) SecureStorage.set(key, uid, cleaned);
    return cleaned;
  } catch (_) { return []; }
}

// Söz Defteri — Hesap Günü'nde (13-extras.js) her taahhüt için ayrı ayrı
// "tuttum/tutamadım" işaretlenir. kept=null → henüz sonuçlanmamış (sadece
// checked=true ile "gördüm ama sonucunu söylemedim" hâli de mümkün, geriye
// dönük uyum). idx = stored dizisindeki GERÇEK pozisyon (filtrelenmiş pending
// listesindeki sıra değil) — çağıran taraf bunu data-attribute'ta taşır.
export function resolveCommitment(idx, kept) {
  try {
    let stored = SecureStorage.get(STORAGE_KEYS.COMMITMENTS(S.currentUser?.id), S.currentUser?.id, []);
    if (!stored[idx]) return false;
    stored[idx] = { ...stored[idx], checked: true, kept: !!kept };
    SecureStorage.set(STORAGE_KEYS.COMMITMENTS(S.currentUser?.id), S.currentUser?.id, stored);
    return true;
  } catch (_) { return false; }
}

export function getPendingCommitmentContext() {
  try {
    const stored = getCleanCommitments();
    const pending = stored.filter(c => !c.checked && c.date !== nowTR().toDateString());
    const resolved = stored.filter(c => c.checked && c.kept != null).slice(0, 2);
    if (!pending.length && !resolved.length) return '';

    const parts = [];
    if (pending.length) {
      const topPending = pending[0];
      parts.push(p('prompt.commitment.pending', { text: topPending.text, date: topPending.date }));
      pending.slice(1, 3).forEach(c => {
        parts.push(p('prompt.commitment.pending_extra', { text: c.text, date: c.date }));
      });
    }
    resolved.forEach(c => {
      parts.push(p(c.kept ? 'prompt.commitment.resolved_kept' : 'prompt.commitment.resolved_broke', { text: c.text }));
    });
    return parts.filter(Boolean).join('\n');
  } catch (_) { return ''; }
}

export function markCommitmentsChecked() {
  try {
    let stored = SecureStorage.get(STORAGE_KEYS.COMMITMENTS(S.currentUser?.id), S.currentUser?.id, []);
    const today = nowTR().toDateString();
    stored = stored.map(c => c.date !== today ? { ...c, checked: true } : c);
    SecureStorage.set(STORAGE_KEYS.COMMITMENTS(S.currentUser?.id), S.currentUser?.id, stored);
  } catch (_) {}
}

/* ── 4. SEANS ÖNCESİ BAĞLAM ──
   Kullanıcı uygulamayı açtığında Emre zaten hazır — son seans, streak, mod.
   Yeni seans başlamadan önce kişiselleştirilmiş açılış üretir.
*/
