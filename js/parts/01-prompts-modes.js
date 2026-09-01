import { S } from '../state.js';
import { sb, EDGE_FN_BASE, SUMMARY_MODEL, AI_MODES, PROMPT_VERSION, TOKEN_LIMITS } from '../config.js';
import { STORAGE_KEYS, SafeStorage, SecureStorage, localISODate } from './00a-infrastructure.js';
import { t, getCurrentLanguage } from './15-i18n.js';
import { p, dp, pArray } from './16-i18n-prompts.js';
import { callLLM, getSessionLastActivity } from './04-llm-hero-history.js';
import { nowTR, getUserMsgCount, getEmotionalFlowInsight, buildModeSelectionGuide, getResistanceInsight, getSilenceInsight, getPendingCommitmentContext, detectTopics } from './00-config-tracking.js';
import { dfGetActiveDepthTarget, dfGetActiveFoundationTarget, dfGetPersonTransitionContext, dfGetPhilosophyLayersContext } from './09b-depth-foundations.js';
import { p2GetEmotionalChainInsight, p2GetEmotionalCycleInsight, p3GetPredictiveInsight, p5GetRelationshipContext } from './09a-personalization-engine.js';
import { getPartsContext, getSomaticContext } from './05-closure-parts.js';
import { getProfileContext, getHomeworkContext, getTrackContext } from './09-reports-tracks.js';
import { getLevelContext } from './10b-w2-gamification.js';
import { buildFocusModelContext } from './10w-w2-odak-modelleri.js';
import { dgKapi, dgYanilmaKonustu, dgIklimKaydet } from './13D-duygu-motoru.js';

export async function generatePreSessionContext() {
  if (!S.currentUser) return null;

  // Gün Serisi (13r) — sohbete özel seri, kaç gündür Emre'yle konuştuğunu taşır
  // (eski merkezî seri artık Wanderer Studio'ya has, sohbet bağlamına uymuyor).
  const streak        = (() => { try { return window.gsCurrentStreak ? (window.gsCurrentStreak() | 0) : 0; } catch (_) { return 0; } })();
  const totalSessions = Object.keys(S.allSessions).length;
  const daysSinceLast = (() => {
    const lastSessId = Object.keys(S.allSessions).sort((a,b) =>
      getSessionLastActivity(b) - getSessionLastActivity(a)
    )[0];
    return lastSessId ? Math.floor((Date.now() - getSessionLastActivity(lastSessId)) / 86400000) : null;
  })();

  // Yeterli bağlam yoksa üretme
  if (totalSessions === 0) return null;

  // Günde bir kez üret, cache'le
  const cacheKey = STORAGE_KEYS.PRE_CTX(S.currentUser.id, nowTR().toDateString());
  const cached = SafeStorage.getRaw(cacheKey);
  if (cached) return cached;

  // Narrative memory'den bağlam çek — son seansın son mesajı yerine
  const memoryNotes = S._narrativeMemory.slice(0, 3).map(m => m.note).join(' ');

  /* DÖNÜŞ KÖPRÜSÜ (2026-08-24 kararı) — açılış artık son konuşulanla bağ
     kurabilir. Eski kural bunu YASAKLIYORDU ("geçmiş günlerden spesifik bir
     konuyu tekrar ETME") ve odağı şimdiye çeviriyordu; gerekçe hâlâ geçerli
     ama bedeli ağırdı: tanınma hissinin doğduğu İLK temas tamamen jenerikti.
     Yeni denge: TEK kanıtlı köprü, sonra odak yine bugüne döner.
     Köprünün kaynağı uydurulamaz — yalnız buraya yazılan iki satır. */
  const sonGun = S._narrativeMemory[0];
  const sonGunCtx = sonGun?.note
    ? p('prompt.presession.son_gun', { tarih: sonGun.date || '', not: sonGun.note.slice(0, 220) })
    : '';

  /* Push ile çağırdıysak model ne yazdığını BİLMELİ: kullanıcı o cümleye
     cevap vermek üzere geliyor olabilir. Okuma kullanıcının kendi satırıyla
     sınırlı (RLS `notif_log owner read`); hata olursa köprü sessizce düşer. */
  let sonPushCtx = '';
  try {
    /* Yalnız KİŞİSEL tetikler. `broadcast` herkese giden bir duyuru, `test`
       admin denemesidir; ikisi de "ona son gönderdiğin bildirim" diye
       sunulursa uygulama herkesin gördüğü bir cümleyi kişisel bir söz gibi
       gösterir — Character.ai'dan çıkardığımız dersin (sahte
       kişiselleştirme) tam tersi. Whitelist bilinçli: yeni bir tip eklenirse
       sessizce sızmasın, önce burada tartılsın. */
    const { data: pushRows } = await sb.from('notification_log')
      .select('title, body, sent_at')
      .in('type', ['winback', 'streak_risk', 'soz', 'armagan', 'person_pack', 'morning', 'milestone'])
      .eq('user_id', S.currentUser.id)
      .gte('sent_at', new Date(Date.now() - 3 * 86400000).toISOString())
      .order('sent_at', { ascending: false }).limit(1);
    const son = pushRows && pushRows[0];
    if (son?.body) sonPushCtx = p('prompt.presession.son_push', { metin: String(son.body).slice(0, 160) });
  } catch (_) {}

  try {
    const prompt = p('prompt.presession', {
      totalSessions,
      streak,
      daysSinceLast: daysSinceLast !== null ? daysSinceLast : '?',
      memoryNotes: memoryNotes ? memoryNotes.slice(0, 300) : '',
      sonGun: sonGunCtx,
      sonPush: sonPushCtx,
    });

    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemPrompt: '', // Persona sunucuda eklenecek
      maxTokens: 120, temperature: 0.7
    });

    if (raw) {
      SafeStorage.setRaw(cacheKey, raw);
      return raw;
    }
  } catch (e) {
    console.warn('Pre-session context hatası:', e.message);
  }
  return null;
}

export function buildDepthModeContext() {
  const parts = [p('prompt.depth_context.header')];

  // Aktif derinlik hedefi — en düşük skorlu kavram
  const _depthTarget = dfGetActiveDepthTarget();
  if (_depthTarget) {
    parts.push(p('prompt.depth_context.active_target', { label: _depthTarget.label, score: _depthTarget.score }));
  }

  // Aktif temel hedefi — en düşük temel
  const _foundTarget = dfGetActiveFoundationTarget();
  if (_foundTarget) {
    parts.push(p('prompt.depth_context.active_foundation', { label: _foundTarget.label, score: _foundTarget.score }));
  }

  // Kişi geçiş haritası
  const _ptCtx = dfGetPersonTransitionContext();
  if (_ptCtx) parts.push(_ptCtx);

  return '\n\n' + parts.filter(Boolean).join('\n');
}

export function buildPatternModeContext() {
  const sections = [];

  // 1. Direniş haritası — gün/saat bazlı kaçınma kalıpları
  const resistanceInsight = getResistanceInsight();
  if (resistanceInsight) sections.push(resistanceInsight);

  // 2. Sessizlik analizi — hangi konuda susuyor
  const silenceInsight = getSilenceInsight();
  if (silenceInsight) sections.push(silenceInsight);

  // 3. Taahhüt geçmişi — tutulan/tutulmayan sözler
  const commitCtx = getPendingCommitmentContext();
  if (commitCtx) sections.push(commitCtx);

  // 4. Duygusal zincir — duygu geçişleri ve döngüler
  const _chainInsight = p2GetEmotionalChainInsight('');
  if (_chainInsight) sections.push(_chainInsight);
  const _cycleInsight = p2GetEmotionalCycleInsight();
  if (_cycleInsight) sections.push(_cycleInsight);

  // 5. Tahmin motoru — tetikleyici sekanslar
  const _predInsight = p3GetPredictiveInsight();
  if (_predInsight) sections.push(_predInsight);

  // 6. Savunma mekanizmaları (kişilik haritasından)
  if (S._personalityMap?.defense_mechanisms?.length) {
    const defs = S._personalityMap.defense_mechanisms
      .filter(d => d.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    if (defs.length) {
      sections.push(p('prompt.pattern_context.defenses', {
        list: defs.map(d => `${d.type} (×${d.count})`).join(', ')
      }));
    }
  }

  // 7. İlişki derinliği — kaçışların ilişkisel bağlamı
  const _relCtx = p5GetRelationshipContext();
  if (_relCtx) sections.push(_relCtx);

  // 8. Günler arası kalıp hafızası (PME / cross-session)
  if (S.sessionPatternSummary) {
    sections.push(S.sessionPatternSummary);
  }

  // 8b. Örüntü Motoru (09d) — haftalık damıtmanın ilk 3 örüntüsü:
  // kanıt + kitap teşhisi + çözüm yolu (window.* — TDZ-güvenli, 09d import edilmez)
  try {
    const omTop = window.omGetTopPatterns?.(3);
    if (omTop) sections.push(p('prompt.oruntu.context_top', { list: omTop }));
  } catch (_) {}

  if (!sections.length) return '';

  return '\n\n' + p('prompt.pattern_context.header') + '\n' + sections.join('\n');
}

/* ═══ DİNAMİK CONTEXT BÜTÇESİ ═══
   Mesajın doğasına göre hangi XML bölümlerinin ağırlıklı gönderileceğini belirler.
   Kriz anında somatic_awareness gereksiz; kısa mesajda personalization kısaltılır.
*/
export function _determineContextMode(text, extras) {
  if (extras.crisis && extras.crisis.trim()) return 'crisis';
  const intensity = S._emotionalFlow.length
    ? S._emotionalFlow[S._emotionalFlow.length - 1].intensity : 0;
  if (intensity >= 4) return 'deep_emotion';
  if (extras._ragActive) return 'knowledge_seek';
  if (text.length < 30 && intensity <= 2) return 'casual';
  return 'standard';
}

export function _truncateSection(content, maxChars) {
  if (!content || content.length <= maxChars) return content;
  return content.slice(0, maxChars) + '…';
}

// Context mode → bölüm bütçeleri (0 = atla, null = sınırsız)
// recalled_memories: kriz/bilgi-arayışı modunda 0 — o anlarda odak DAĞITILMAZ,
// geçmiş anı hatırlatmak yerine tam şimdiki ana/soruya odaklanılır (09f).
// mirror_hypothesis: kriz/bilgi-arayışı modunda 0 — Ayna Protokolü (09g) bir
// YÜZLEŞME anıdır, kriz anında ya da salt bilgi isterken ASLA sorulmaz.
// pinned_declarations: kullanıcının kendi mühürlediği sözler (09j). Kriz
// dışında HİÇ kırpılmaz — kullanıcı "bunu unutma" dediyse bütçe onu
// düşüremez; düşürebilseydi vaat şarta bağlı olurdu. Kriz anında 0, çünkü
// o an tek geçerli bağlam şimdiki andır.
// user_sozleri: alıntı havuzu (09j). Kriz ve bilgi-arayışında 0 — o anlarda
// geçmişten cümle göstermek odağı dağıtır (recalled_memories ile aynı töre).
// past_days: geçmiş günlerin özeti (12-w3) KENDİ bölümü — eskiden user_profile
// demetinin 3. sırasındaydı ve casual'ın 400 karakterini profil+seviye yiyordu:
// en sık modda geçmiş sessizce düşüyordu. Hatırlama ürünün vaadi olduğu için
// kendi bütçesini alır. Kriz/bilgi-arayışında 0 — o anda odak ŞİMDİdir.
// duygusal_karsilama (13D, FAZ 5-6): karşılama kararının söz kanalı.
// Bilgi-arayışında 0 — salt bilgi isterken duygusal yönlendirme odağı
// dağıtır (past_days ile aynı töre). Derin duyguda cömert (null). Standard'da
// 0 OLAMAZ (aşağıdaki regresyon testi bunu kilitler).
//
// SAYILAR FAZ 6'DA BÜYÜTÜLDÜ ve gerekçesi bir kırıktır: bütçeler kartuşlar
// yazılmadan ÖNCE (asgari kanal hâlindeyken) ölçülmüştü. Kartuşlar gelince
// bölüm TR'de 720, EN'de 759 karaktere çıktı ve 400/300'lük tavanlar onu
// sessizce kırpmaya başladı — kesilen yer bölümün SONU, yani ortak yasak
// satırı (K7'nin kendisi) ve kartuşun son cümlesiydi. Krizde daha kötüsü:
// 200'lük tavan `tutma` kartuşunu ortasından kesiyordu, yani emniyet
// talimatı yarım cümleyle bitiyordu. Yarım kalan bir talimat, olmayan bir
// talimattan beterdir: model onu yine de uygular.
// Yeni sayılar ölçümle konuldu (kriz 278/305 → 360; tam bölüm 720/759 → 800
// ve 900) ve `tests/01-prompts-modes.test.js`'teki "hiçbir mod kırpmıyor"
// kapısı bunu kilitler — FAZ 7+ kartuşa bir satır daha eklerse test kırılır.
export const _CONTEXT_BUDGETS = {
  crisis:        { critical_alerts: null, response_mode: null, personalization: 600,  user_profile: 400, past_days: 0, pinned_declarations: 0, user_sozleri: 0, session_insights: 300, active_journey: 300, somatic_awareness: 0, recalled_memories: 0, mirror_hypothesis: 0, duygusal_karsilama: 360 },
  deep_emotion:  { critical_alerts: null, response_mode: null, personalization: null, user_profile: 500, past_days: 400, pinned_declarations: null, user_sozleri: null, session_insights: null, active_journey: 300, somatic_awareness: 200, recalled_memories: 300, mirror_hypothesis: 0, duygusal_karsilama: null },
  knowledge_seek:{ critical_alerts: null, response_mode: null, personalization: 600,  user_profile: null, past_days: 0, pinned_declarations: null, user_sozleri: 0, session_insights: 300, active_journey: null, somatic_awareness: 0, recalled_memories: 0, mirror_hypothesis: 0, duygusal_karsilama: 0 },
  casual:        { critical_alerts: null, response_mode: null, personalization: 400,  user_profile: 400, past_days: 300, pinned_declarations: null, user_sozleri: null, session_insights: 200, active_journey: 300, somatic_awareness: 0, recalled_memories: 300, mirror_hypothesis: 300, duygusal_karsilama: 800 },
  standard:      { critical_alerts: null, response_mode: null, personalization: null, user_profile: null, past_days: null, pinned_declarations: null, user_sozleri: null, session_insights: null, active_journey: null, somatic_awareness: null, recalled_memories: null, mirror_hypothesis: 300, duygusal_karsilama: 900 }
};

export function buildContextPrompt(ragContext = '', extras = {}) {
  /*
   * YAPISAL BAĞLAM MONTAJI — Primacy-Recency + XML
   *
   * ⚠️ Persona (system_prompt + kitap alıntıları) BURADA DEĞİL.
   *    Sunucuda (Edge Function) eklenir — client asla görmez.
   *
   * Sıralama (Lost-in-the-Middle optimizasyonu):
   *   BAŞ  → critical_alerts   : Kriz + selamlaşma (en yüksek dikkat)
   *        → response_mode     : Mod rehberi + duygusal akış
   *        → duygusal_karsilama: Karşılama kararı (13D) — response_mode'un
   *                              hemen yanı, ikisi de "nasıl konuşulacağını"
   *                              belirler; personalization'dan ÖNCE (FAZ 5)
   *        → personalization   : 5 katmanlı derin tanıma (P1-P5)
   *   ORTA → past_days        : Geçmiş günlerin özeti (12-w3 zinciri)
   *        → recalled_memories : Anlamsal geri-getirme (09f — geçmişe atıfta dolu)
   *        → user_profile      : Profil + seviye + kalıp (kararlı referans)
   *        → session_insights  : Çelişki + drift + direnç + sessizlik
   *   SON  → active_journey    : Yol haritası + ödev + taahhüt + RAG bilgi
   *        → somatic_awareness : IFS parça + bedensel tarama
   */

  // --- Dinamik Bütçe Hesaplama ---
  const userText = extras._userText || '';
  const ctxMode = _determineContextMode(userText, extras);
  const budget = _CONTEXT_BUDGETS[ctxMode];
  S._lastContextMode = ctxMode; // Token limiti seçimi için dışa aç

  // --- Katman Oluşturma (cache'li bölümler) ---
  if (_contextCache.memoryCtx === null) {
    _contextCache.memoryCtx = S._narrativeMemory.length
      ? p('prompt.context.memory_header') + '\n' +
        S._narrativeMemory.slice(0, 5).map(m => `• [${m.date}]: ${m.note}`).join('\n')
      : '';
  }
  const memoryCtx = _contextCache.memoryCtx;

  // Mühürlü sözler (09j) — pin anında değişir, cache'lenmez. Modül yoksa ''.
  let pinnedCtx = '';
  try { pinnedCtx = window.htBaglamBloku?.() || ''; } catch (_) {}

  /* Duygu Motoru (13D, FAZ 5, kapı FAZ 13) — bu turun karşılama kararı
     TEK BURADA, TEK KEZ hesaplanır. İki tüketicisi var: aşağıdaki
     duygusal_karsilama bölümü (yerel `karsilama` değişkeninden) ve
     buildModeSelectionGuide (00) — o da S._dgSonKarsilama'nın az önce
     eklenen son kaydını okur, YENİDEN HESAPLAMAZ (06'nın _ctxMode
     yorumuyla aynı gerekçe: aynı adı taşıyan ikinci bir hesap, sıra
     değişince ya da girdi kayınca sessizce ayrışır — "tek ad, tek
     kaynak"). `dgKarsilama`'yı DOĞRUDAN çağırmıyoruz — `dgKapi('sohbet', …)`
     üzerinden geçiyoruz (FAZ 13, K10): duyguya dokunan HER tüketici aynı
     kapıdan girer, ikinci bir giriş bırakmak kapıyı kapı olmaktan
     çıkarır. `sohbet` yüzeyinde eşik yoktur — kanıt yoksa (S._dgNabiz
     null) dgKapi yine bir karar döner (K6: tanıklık) ama `kanit` boş
     kalır; bölüm o durumda aşağıda hiç doğmaz — eksen tek başına "davran"
     der, "neyle" demez.
     try/catch: buildContextPrompt HER turun tek geçidi — burada atlanan bir
     istisna, komşu bölümlerin (pinnedCtx, mirrorHint) hepsinin sessiz
     düştüğü bu fonksiyonda tüm sohbet turunu kilitler (§5.2 "asla bloklama"). */
  let karsilama = { eksen: 'taniklik', gerekce: '', kanit: null, ikincil: null, krizOkundu: false };
  try {
    karsilama = dgKapi('sohbet', { metin: userText, nabiz: S._dgNabiz, iklim: S._dgIklim, akis: { yon: S._dgYay, gecmis: S._dgSonKarsilama } });
  } catch (e) { console.warn('dgKapi:', e && e.message); }
  /* FAZ 11'den beri kayıt yalnız `.eksen`i taşımaz — şeffaflık paneli
     (06-summary-chat.js) bu turun `.gerekce`/`.kanit`/`.ikincil`/
     `.krizOkundu`'sunu da bu son kayıttan okur (S._dgSonKarsilama'nın
     son elemanı = TEK KEZ hesaplanan bu turun kararı). Mevcut okuyucular
     (00'ın buildModeSelectionGuide'ı, 09a) yalnız `.eksen` okur — ek
     alanlar onları etkilemez, geriye dönük uyumlu. */
  S._dgSonKarsilama.push({ eksen: karsilama.eksen, gerekce: karsilama.gerekce, kanit: karsilama.kanit, ikincil: karsilama.ikincil, krizOkundu: karsilama.krizOkundu });
  if (S._dgSonKarsilama.length > 8) S._dgSonKarsilama.shift(); // _modeHistory cap emsali (00:496)

  // Bu bölümler her mesajda değişebilir — cache'lenmez
  const modeInstruction = buildModeSelectionGuide();
  const emotionalCtx = getEmotionalFlowInsight();

  /* Kanal + REGISTER KARTUŞU (FAZ 5 açtı, FAZ 6 doldurdu). Sıra bilinçli:
     ne (eksen) → neye dayanarak (kullanıcının kendi cümlesi) → nasıl
     (kartuş) → ne değil (ortak yasak). Talimat sona yakın durur; model son
     okuduğuna göre davranır. Ortak yasak KRİZDE eklenmez — orada bütçe dar
     (200) ve `tutma` kartuşu kendi töresini zaten taşır (K9).
     `karsilama.gerekce` TR-only iç metindir (FAZ 11'in şeffaflık paneli
     için) ve dil-duyarlı olmayan bu prompt'a taşınmaz.
     Kriz (tutma) kanıt şartından MUAF — K9 kanıt beklemeden devreye girer.
     KOKEN-MUAF: karsilama.kanit LLM çıktısı DEĞİL — dgNabiz'in _kanitKes'i
     kullanıcının kendi ham metninden cümle sınırında kestiği ÖLÇÜM'dür
     (13D K3); kokenAlinti/kokenYorum kapısı yalnız LLM'in ÜRETTİĞİ kanıt
     iddiaları içindir (K5), bu dosyanın kendi callLLM çağrısıyla ilgisi yok. */
  // TESLİM ANI — hem prompt'a girişin hem de yanılma defterinin (K13, FAZ
  // 15) tek koşulu: karşılamanın kanıtı VAR ya da kriz (tutma, kanıtsız
  // ama K9 muaf). İki ayrı hesap açmak "aynı adı taşıyan ikinci bir hesap"
  // riskini tekrarlardı (bu dosyanın kendi 06 kıyası, satır ~284) — tek
  // bayrak.
  const _dgTeslimEdildi = !!(karsilama.kanit || karsilama.eksen === 'tutma');
  const karsilamaCtx = _dgTeslimEdildi
    ? [
        p('prompt.dg.eksen_satiri', { eksen: p('prompt.dg.eksen.' + karsilama.eksen) }),
        karsilama.kanit ? p('prompt.dg.kanit_satiri', { kanit: karsilama.kanit }) : '',
        p('prompt.dg.kartus.' + karsilama.eksen),
        karsilama.eksen === 'tutma' ? '' : p('prompt.dg.yasak'),
      ].filter(Boolean).join('\n')
    : '';
  /* YANILMA DEFTERİ (K13, FAZ 15) — "damgayı teslim eden basar" (§6.10):
     `dgKapi` bir okuma döndürdü diye sayılmaz, sohbet TÜKETİCİSİ (burası)
     okumayı gerçekten prompt'a soktuğunda sayar. Sohbet hiçbir hâlde
     KAPANMAZ (`dgYanilmaKapali('sohbet', …)` daima false, §8) — bu satır
     yalnız Gözlemevi'nin göreceği defteri doldurur, okuma yolunu değiştirmez. */
  if (S._dgIklim && _dgTeslimEdildi) {
    S._dgIklim = dgYanilmaKonustu(S._dgIklim, 'sohbet');
    dgIklimKaydet(S._dgIklim);
  }

  // Wanderer modeli — kullanıcının seçtiği model (Öz/Bağ/Eser; 10w).
  // Modelin davranışı + bilgi tabanı boşsa '' döner; doluysa <focus_model>'e enjekte edilir.
  const focusModelCtx = buildFocusModelContext();

  const kbCtx = ragContext
    ? p('prompt.context.kb_header') + '\n' + ragContext
    : '';

  const depthCtx = S._modeHint === AI_MODES.DEPTH ? buildDepthModeContext() : '';

  // Felsefi katmanlar — tüm modlarda aktif
  const philosophyCtx = dfGetPhilosophyLayersContext(userText);

  let patternCtx = S._modeHint === AI_MODES.PATTERN
    ? buildPatternModeContext()
    : (S.sessionPatternSummary
        ? p('prompt.context.pattern_header') + '\n' + S.sessionPatternSummary
        : '');

  // Örüntü Motoru (09d) — taze haftalık damıtmanın ilk seansında Emre'ye
  // tek cümlelik yumuşak davet ipucu (haftada bir kez tüketilir)
  try {
    const omFresh = window.omConsumeFreshHint?.();
    if (omFresh) patternCtx += (patternCtx ? '\n' : '') + omFresh;
  } catch (_) {}

  // Alfabe Işık (12e Faz 3) — [NISAN] köprü talimatı + yazılı nişan özeti.
  // Metin Emre'nin Sesi'nden (p anahtarı); erişim window'dan TDZ-güvenli.
  let isikCtx = '';
  try { isikCtx = window.isikGetContext?.() || ''; } catch (_) {}

  if (_contextCache.profileCtx === null) _contextCache.profileCtx = getProfileContext();
  const profileCtx = _contextCache.profileCtx;

  if (_contextCache.trackCtx === null) _contextCache.trackCtx = getTrackContext();
  const trackCtx = _contextCache.trackCtx;

  if (_contextCache.homeworkCtx === null) _contextCache.homeworkCtx = getHomeworkContext();
  const homeworkCtx = _contextCache.homeworkCtx;

  const partsCtx = getPartsContext();
  const somaticCtx = getSomaticContext();

  if (_contextCache.levelCtx === null) _contextCache.levelCtx = getLevelContext();
  const levelCtx = _contextCache.levelCtx;

  // --- Extras (06-summary-chat'ten gelen ek bağlamlar) ---
  const { greeting, crisis, contradiction, drift, onboarding, resistance,
          silence, commitment, hesap, wellness, personalization, sessionMemory,
          recalledMemories, mirrorHypothesis } = extras;

  // --- XML Yapısal Montaj (bütçe uygulamalı) ---
  /* Bağlam Nabzı (İç Çalışma 02 · boşluklar D+H) — kanal→bayt ölçüsü BURADA
     alınır, çünkü kırpmanın yapıldığı tek yer burasıdır: başka yerde ölçmek
     kırpılmadan önceki hâli sayardı. Yalnız `.length` — kopyalama, serialize
     ya da içerik saklama YOK; ölçüm sıcak yolda bedava kalmalı. Yazımı 06 tur
     sonunda tek olayda yapar (wtLogCtx). */
  const _olcum = {};
  const _s = (tag, priority, ...parts) => {
    const content = parts.filter(s => s && s.trim()).map(s => s.trim()).join('\n');
    if (!content) return '';
    const limit = budget[tag];
    if (limit === 0) return '';
    const finalContent = limit != null ? _truncateSection(content, limit) : content;
    _olcum[tag] = finalContent.length;
    return `<${tag} priority="${priority}">\n${finalContent}\n</${tag}>`;
  };

  // Talimat satırını sadece asıl içerik varsa ekle (boş bölüme talimat düşmesin)
  const _withGuide = (guideKey, ...dataParts) => {
    const hasData = dataParts.some(s => s && s.trim());
    return hasData ? [p(guideKey), ...dataParts] : [];
  };

  const sections = [
    // ■ BAŞ — en yüksek LLM dikkati
    _s('critical_alerts', 'critical', ..._withGuide('prompt.context_guide.critical', greeting, crisis)),
    _s('focus_model', 'high', focusModelCtx),
    _s('response_mode', 'high', ..._withGuide('prompt.context_guide.response_mode', modeInstruction, emotionalCtx, wellness)),
    _s('duygusal_karsilama', 'high', ..._withGuide('prompt.context_guide.duygusal_karsilama', karsilamaCtx)),
    _s('personalization', 'high', ..._withGuide('prompt.context_guide.personalization', personalization)),

    // ■ ORTA — kararlı referans bilgi (değişim yavaş, atlanabilir)
    // session_memory: kayan bağlam özeti — pencere dışına çıkan seans-içi mesajlar (06)
    /* pinned_declarations: kullanıcının "bunu unutma" dediği kendi sözleri
       (09j). Beyandır — eşiği, ölçüsü, yorumu yoktur; kriz dışında HER tura
       girer. Hafızanın dizgini kullanıcının elinde olan tek kanal budur. */
    _s('pinned_declarations', 'high', pinnedCtx),
    /* user_sozleri: numaralı söz havuzu (09j → 13y kokenSozBlok). Model
       buradan ALINTI YAZMAZ, `[S3]` diye gösterir; metni uygulama keser.
       Kırpılmaz — yarım kesilen bir söz bloğu, modelin gösterebileceği
       kanıtı sessizce yok ederdi. */
    _s('user_sozleri', 'high', extras.sozHavuzu || ''),
    _s('session_memory', 'medium', sessionMemory),
    // past_days: geçmiş günlerin özet zinciri (12-w3 → loadNarrativeMemory).
    // Kendi bölümü ve kendi bütçesi var; user_profile'ın referans demetinde
    // sıkışırsa kırpma onu ilk düşürendi (bkz. _CONTEXT_BUDGETS yorumu).
    _s('past_days', 'medium', memoryCtx),
    // recalled_memories: anlamsal geri-getirme (09f) — "bunu daha önce de yaşamıştın";
    // yalnız kullanıcı geçmişe atıf yaptığında dolu gelir (_shouldRecall gate)
    _s('recalled_memories', 'medium', recalledMemories),
    // mirror_hypothesis: Ayna Protokolü (09g) — haftada ≤2 kez, doğrulanmamış
    // bir okumayı nazikçe sormaya davet; kriz/derin-duygu modunda hiç gelmez
    _s('mirror_hypothesis', 'medium', mirrorHypothesis),
    _s('user_profile', 'reference', profileCtx, levelCtx, patternCtx, depthCtx, philosophyCtx, isikCtx),
    _s('session_insights', 'medium', contradiction, drift, resistance, silence, onboarding),

    // ■ SON — ikinci en yüksek LLM dikkati
    _s('active_journey', 'medium', trackCtx, homeworkCtx, hesap || commitment, kbCtx),
    _s('somatic_awareness', 'low', partsCtx, somaticCtx),
  ].filter(Boolean);

  if (!sections.length) { S._ctxOlcum = null; return ''; }

  const meta = '<context_guide>' + p('prompt.context_guide') + '</context_guide>';
  // Prompt versiyonu ve context modu log olarak eklenir (Edge Function analytics için)
  const versionTag = `<prompt_meta version="${PROMPT_VERSION}" ctx_mode="${ctxMode}" />`;

  const cikti = versionTag + '\n' + meta + '\n\n' + sections.join('\n\n');

  /* `personalization` kanalının alt kırılımı 09a'dan gelir (H) — kanal
     toplamıyla YARIŞMAZ, onun içini açar; `p_` öneki ikisini ayırır. */
  try {
    const alt = S._ctxOlcumP;
    if (alt && typeof alt === 'object') Object.assign(_olcum, alt);
    S._ctxOlcumP = null;
  } catch (_) {}
  S._ctxOlcum = { kanallar: _olcum, toplam: cikti.length, ctxMode };

  return cikti;
}

/* ═══ CONTEXT CACHE ═══
   Seans boyunca yavaş değişen bağlam parçalarını cache'ler.
   invalidateContextCache() çağrıldığında sıfırlanır.
*/
const _contextCache = { profileCtx: null, levelCtx: null, memoryCtx: null, trackCtx: null, homeworkCtx: null, _version: 0 };

export function invalidateContextCache() {
  _contextCache.profileCtx = null;
  _contextCache.levelCtx = null;
  _contextCache.memoryCtx = null;
  _contextCache.trackCtx = null;
  _contextCache.homeworkCtx = null;
  _contextCache._version++;
}

/* ═══ AKILLI RAG QUERY BUILDER ═══
   Ham kullanıcı metnini vektör arama için optimize eder.
   1. Selamlama/dolgu → strip
   2. Konu tespiti → ağırlıklı anahtar kelimeler
   3. Son konuşma bağlamı → zenginleştirilmiş query
   4. RAG gating → bilgi tabanına gerek yoksa false döner
*/

const _RAG_FILLER_PATTERNS = [
  /^(merhaba|selam|hey|günaydın|iyi\s+(akşam|gece)lar?|naber|nasılsın)\s*/i,
  /^(hi|hello|hey|good\s+(morning|evening|night)|what'?s\s+up)\s*/i,
  /^(evet|hayır|tamam|ok|anladım|hmm+|hı?hı?|aha|peki)\s*/i,
  /^(yes|no|okay|ok|i\s+see|hmm+|uh\s*huh|alright|sure)\s*/i,
  /\s*(teşekkür(ler)?|sağ\s*ol|eyvallah)\s*/i,
  /\s*(thanks?|thank\s+you)\s*/i,
];

const _RAG_ACTIONABLE_PATTERNS = [
  /anksiyete/i, /depresyon/i, /travma/i, /panik/i, /tükenmi[şs]/i,
  /yas\b/i, /kayıp/i, /bağlanma/i, /sınır\s*koy/i, /mükemmelliyetçi/i,
  /erteleme/i, /bağımlı/i, /özgüven/i, /utanç/i, /suçluluk/i,
  /yalnızlık/i, /öfke/i, /korku/i, /reddedil/i, /stres/i,
  /anxiety/i, /depressi/i, /trauma/i, /panic/i, /burnout/i,
  /grief/i, /attachment/i, /boundar/i, /perfectionism/i, /procrastinat/i,
  /self.?esteem/i, /shame/i, /guilt/i, /loneliness/i, /anger/i, /fear/i, /rejection/i
];

/* ═══ SADECE-SELAMLAŞMA TESPİTİ ═══
   Kullanıcı henüz bir dert açmadan sadece selam/nezaket sözü söylediyse
   true döner. Bu durumda prompt'a "önce sıcak karşıla, dert varmış gibi
   varsayma" talimatı enjekte edilir (bkz. getGreetingContext).
*/
export function isGreetingOnly(text) {
  if (!text) return false;
  let cleaned = text.trim().toLowerCase();
  if (cleaned.length > 40) return false; // uzun mesaj selamlaşma değildir
  _RAG_FILLER_PATTERNS.forEach(r => { cleaned = cleaned.replace(r, ' '); });
  // Selam/nezaket dışındaki kalıntı: sadece noktalama/boşluk/emoji kalmalı
  cleaned = cleaned.replace(/[\s.,!?;:…\-_*"'()]/g, '');
  cleaned = cleaned.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ''); // emoji
  return cleaned.length < 3;
}

export function getGreetingContext(text) {
  const parts = [];
  if (isGreetingOnly(text)) parts.push(p('prompt.greeting'));
  /* Selam kartı UYGULAMANIN ağzından konuşur ("Geçen sefer sınavdan söz
     etmiştin — nasıl geçti?") ama chatHistory'ye girmez: model kendi
     söylediğini bilmiyordu ve kullanıcı ona cevap verdiğinde bağlamsız
     kalıyordu. Kart günün ilk turlarında bağlama girer — sonrası gürültü. */
  try {
    const kart = window.w2GetGreetingCardContext?.();
    if (kart) parts.push(kart);
  } catch (_) {}
  return parts.filter(Boolean).join('\n');
}

export function buildSmartRagQuery(userText, chatHistory) {
  if (!userText || userText.length < 8) return { shouldRAG: false, query: '', topK: 3 };

  let cleaned = userText.trim();
  _RAG_FILLER_PATTERNS.forEach(r => { cleaned = cleaned.replace(r, ' '); });
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  if (cleaned.length < 10) return { shouldRAG: false, query: '', topK: 3 };

  const topics = detectTopics(userText);

  const hasQuestion = /[?？]/.test(userText) ||
    /\b(neden|niye|nasıl|ne\s+yapmalı|ne\s+zaman|anlamıyorum)\b/i.test(userText) ||
    /\b(why|how|what\s+should|when|i\s+don'?t\s+understand)\b/i.test(userText);

  const seeksConcept = /\b(ne\s+demek|ne\s+anlama|açıkla|anlamı\s+ne|nedir)\b/i.test(userText) ||
    /\b(what\s+(does|is|are)|explain|meaning|define)\b/i.test(userText);

  const seeksTechnique = /(?:teknik|yöntem|egzersiz|deneyebilir|nasıl\s+baş\s*edebilir|öneri)/i.test(userText) ||
    /\b(technique|method|exercise|try|cope|suggestion|tip)\b/i.test(userText);

  // Proaktif RAG: duygusal yoğunluk + konu varsa soru olmasa da tetikle
  const currentIntensity = S._emotionalFlow.length
    ? S._emotionalFlow[S._emotionalFlow.length - 1].intensity : 0;
  const hasEmotionalTopic = currentIntensity >= 3 && topics.length > 0;

  // Proaktif RAG: psikolojik anahtar kelime doğrudan eşleşirse tetikle
  const hasActionableTopic = _RAG_ACTIONABLE_PATTERNS.some(r => r.test(userText));

  const shouldRAG = seeksConcept || seeksTechnique
    || (hasQuestion && topics.length > 0)
    || hasEmotionalTopic
    || hasActionableTopic;

  if (!shouldRAG) return { shouldRAG: false, query: '', topK: 3 };

  // Dinamik top-K: sorgu karmaşıklığına göre chunk sayısı
  let topK = 3;
  if (seeksTechnique)                        topK = 5;
  else if (seeksConcept && topics.length > 1) topK = 4;
  else if (hasEmotionalTopic)                topK = 4;
  else if (hasActionableTopic)               topK = 3;
  else if (hasQuestion)                      topK = 2;

  const parts = [cleaned];

  if (topics.length) {
    parts.push('(' + topics.join(', ') + ')');
  }

  if (chatHistory && chatHistory.length >= 2) {
    const lastAssistant = [...chatHistory].reverse().find(m => m.role === 'assistant');
    if (lastAssistant) {
      const lastTopics = detectTopics(lastAssistant.content);
      if (lastTopics.length) {
        parts.push('[bağlam: ' + lastTopics.join(', ') + ']');
      }
    }
  }

  return { shouldRAG: true, query: parts.join(' '), topK };
}

/* ═══ NARRATIVE MEMORY (Günlük Hafıza) ═══
   Artık her seans sonunda değil, GÜN SONU özetlerinden besleniyor.
   Görüşme tek bir yerden aktığı için günlük toplu özet daha doğru bir bellek veriyor.
   Kaynak: chat_summaries tablosu (w3GenerateDeepSummary üretiyor).
*/

export async function loadNarrativeMemory() {
  if (!S.currentUser) return;
  try {
    // Son 60 günlük özeti çek — sınırsız sorgu yerine bellek ve performans dengesi
    const { data } = await sb.from('chat_summaries')
      .select('title, summary, tone, structured_summary, session_id, created_at')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(60);

    if (!data?.length) { S._narrativeMemory = []; return; }

    // Gün bazında dedupe: aynı güne ait birden fazla satır varsa
    // (eski duplicate kayıtlar) portrait'i en zengin olanı seç.
    const byDay = new Map(); // dayKey -> best row
    for (const s of data) {
      const dt = new Date(s.created_at);
      const dayKey = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;

      // structured_summary'yi parse et
      let struct = null;
      try {
        if (s.structured_summary) {
          struct = typeof s.structured_summary === 'string'
            ? JSON.parse(s.structured_summary) : s.structured_summary;
        }
      } catch (_) {}

      // Bu kaydın "zenginlik skoru": portrait > structured > flat
      const portraitLen = (struct?.portrait || '').length;
      const structLen = struct ? JSON.stringify(struct).length : 0;
      const flatLen = (s.summary || '').length;
      const score = portraitLen * 10 + structLen + flatLen; // portrait ağır basar

      const existing = byDay.get(dayKey);
      if (!existing || score > existing._score) {
        byDay.set(dayKey, { ...s, _struct: struct, _score: score });
      }
    }

    // Dedupe edilmiş listeyi tarihe göre yeni → eski sırala
    const dedupedRows = Array.from(byDay.values())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    S._narrativeMemory = dedupedRows.map(s => {
      const st = s._struct;
      let note = '';

      // Öncelik: portrait (kişiyi tanıma notu)
      if (st?.portrait && st.portrait.trim()) {
        note = st.portrait.trim();
      } else if (st) {
        // Geri uyumluluk: eski özetlerde portrait yok — tema+içgörü+kalıp birleştir
        const parts = [];
        if (st.theme) parts.push(st.theme);
        if (st.insight) parts.push(st.insight);
        if (st.pattern) parts.push(p('prompt.profile.pattern') + ': ' + st.pattern);
        note = parts.join(' ');
      } else if (s.summary) {
        note = s.summary;
      } else {
        note = s.title || '';
      }

      return {
        date: new Date(s.created_at).toLocaleDateString(S._currentLang || 'tr', { day: 'numeric', month: 'long', year: 'numeric' }),
        note,
        session_id: s.session_id || ('day_' + localISODate(new Date(s.created_at))),
        has_portrait: !!(st?.portrait && st.portrait.trim())
      };
    }).filter(m => m.note);
  } catch (e) {
    console.warn('Narrative memory yükleme hatası:', e.message);
  }
}

/* ═══ CROSS-SESSION PATTERN TRACKING (Premium) ═══ */
export async function saveSessionPatterns() {
  if (!S.isPremium || S.avoidanceCount === 0) return;
  try {
    const patternNote = p('prompt.pattern_note', { date: new Date().toLocaleDateString(S._currentLang || 'tr', { timeZone: 'Europe/Istanbul' }), count: S.avoidanceCount, consecutive: S.consecutiveAvoidance });
    const { error } = await sb.from('user_patterns').upsert([{
      user_id: S.currentUser.id,
      session_id: S.currentSessId,
      avoidance_count: S.avoidanceCount,
      pattern_note: patternNote,
      created_at: new Date().toISOString()
    }], { onConflict: 'session_id' });
    if (error) console.warn('Pattern kayıt hatası (tablo yoksa normal):', error.message);
  } catch (_) {}
}

export async function loadSessionPatterns() {
  if (!S.currentUser) return;
  try {
    const { data } = await sb.from('user_patterns')
      .select('pattern_note, avoidance_count, session_id, created_at')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!data?.length) return;

    // PME haftalık kör nokta özeti — tüm kullanıcılar için
    const pmeRow = data.find(r => r.session_id?.startsWith('pme_weekly_'));
    if (pmeRow?.pattern_note) {
      S.sessionPatternSummary = pmeRow.pattern_note;
      return; // PME varsa seans bazlı kalıplara gerek yok
    }

    // Yoksa premium için seans bazlı kalıp özeti (eski davranış)
    if (S.isPremium) {
      const sessionRows = data.filter(r => !r.session_id?.startsWith('pme_weekly_'));
      const totalAvoidance = sessionRows.reduce((s, r) => s + (r.avoidance_count || 0), 0);
      if (totalAvoidance > 3) {
        S.sessionPatternSummary = sessionRows.map(r => r.pattern_note).join(' | ');
      }
    }
  } catch (_) {}
}
