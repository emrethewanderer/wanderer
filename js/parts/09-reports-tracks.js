import { S } from '../state.js';
import { sb, EDGE_FN_BASE, ADMIN_EMAIL, SUMMARY_MODEL } from '../config.js';
import { STORAGE_KEYS, SafeStorage, MemCache, SecureStorage, showToast, createHookRegistry, localISODate, escapeHTML } from './00a-infrastructure.js';
import { dgIsabetGuncelle, dgIklimKaydet } from './13D-duygu-motoru.js';
import { t } from './15-i18n.js';
import { p, dpTest } from './16-i18n-prompts.js';
import { callLLM, calculateStreak, getSessionLastActivity } from './04-llm-hero-history.js';
import { invalidateContextCache } from './01-prompts-modes.js';
import { nowTR } from './00-config-tracking.js';
import { runOnboardingRitual, buildRitualContext } from './02b-onboarding-ritual.js';

// Module-local mutable key (set by admin panel, needs to stay writable)
let TOGETHER_API_KEY = '';

export async function saveTogetherKey(btn) {
  if (!S.isAdmin) { showToast(t('toast.no_permission'), true); return; }
  const newKey = document.getElementById('u-together-key').value.trim();
  if (!newKey) return;
  if (!btn) btn = event?.target;
  btn.disabled = true; btn.textContent = t('toast.saving', 'Kaydediliyor...');
  try {
    const { error } = await sb.from('admin_settings').update({ together_api_key: newKey }).eq('id', 1);
    if (error) { showToast(t('toast.error') + error.message, true); }
    else {
      TOGETHER_API_KEY = newKey;
      showToast(t('toast.api_key_updated'));
      document.getElementById('u-together-key').value = '';
    }
  } catch { showToast(t('toast.critical_error'), true); }
  btn.disabled = false; btn.textContent = t('ui.update', 'Güncelle');
}

/* ═══ ANALİTİK VERİ SENKRONİZASYONU ═══
   Tüm veriler Supabase user_analytics tablosunda saklanır.
   Oturum başlangıcında storageInit ile belleğe yüklenir.
*/

export async function syncAnalyticsFromSupabase() {
  // storageInit() ile tüm veriler zaten belleğe yüklendi — ekstra sync gerekmez
}

export async function saveAnalyticsToSupabase() {
  // SafeStorage artık otomatik olarak Supabase'e yazıyor — ekstra sync gerekmez
}

/** RUH HÂLİ PENCERE KIYASI — ilk N gün ↔ son N gün, UI-güvenli ham sayı.
 *
 *  Repodaki tek gerçek trend hesabı `generateWeeklyReport` içinde hapisti:
 *  o fonksiyon `TOGETHER_API_KEY` kapılıydı (yalnız admin aynı oturumda
 *  anahtar kaydederse dolardı) ve hiçbir yerden çağrılmıyordu — yani hesap
 *  yazılmış ama erişilemezdi. Aynı matematik (yarı-yarı ortalama) buraya,
 *  LLM'siz ve kapısız taşındı; kapalı zincir FAZ 8'de söküldü.
 *
 *  Kanıt kapısı: her iki yarıda da en az {@link MOOD_MIN_KAYIT} kayıt
 *  aranır — iki noktadan trend çıkarmak ölçüm değil, gürültüdür.
 *  @returns {Promise<{once:number, simdi:number, n:number, gun:number}|null>} */
const MOOD_MIN_KAYIT = 3;

export async function moodPencereKiyas(gun = 90) {
  try {
    if (!sb || !S.currentUser?.id) return null;
    const baslangic = new Date(Date.now() - gun * 86400000).toISOString();
    const { data } = await sb.from('mood_history')
      .select('score, created_at')
      .eq('user_id', S.currentUser.id)
      .gte('created_at', baslangic)
      .order('created_at', { ascending: true });
    const rows = (data || []).filter(r => typeof r.score === 'number');
    if (rows.length < MOOD_MIN_KAYIT * 2) return null;
    const orta = Math.floor(rows.length / 2);
    const ort = (a) => a.reduce((t, r) => t + r.score, 0) / a.length;
    return {
      once: ort(rows.slice(0, orta)),
      simdi: ort(rows.slice(orta)),
      n: rows.length,
      gun,
    };
  } catch (_) { return null; }
}

/** GÜNÜN EHLİYET SINAMASI (K11, FAZ 14) — motorun bu seansta ÖLÇTÜĞÜ son
 *  nabız (`S._dgNabiz.deger`) kullanıcının kapanış töreninde BEYAN ettiği
 *  skoru (mood_history, 1-10 — `05-closure-parts.js:234`'ün AYNEN geçirdiği
 *  parametre; burada yeni bir sorgu YOK) yön olarak doğruluyor mu.
 *
 *  Seçim notu (rapor Duraklar'da tekrarlanır): İklim `S._emotionalFlow`'un
 *  aksine per-uid KALICIDIR ama günün TAMAMININ ortalaması hiçbir yerde
 *  tutulmuyor — `S._emotionalFlow` oturum başına sıfırlanır (03-auth-shell)
 *  ve yalnız kuvveti (yönsüz) taşır. Seansın SON ölçülü nabzı, o günden
 *  kalan tek işaretli (deger'li) veridir; tam gün ortalaması DEĞİL, bilinçli
 *  bir sadeleştirmedir — plan K11'in "günün ölçülmüş değeri" tarifini yeni
 *  bir depolama katmanı AÇMADAN karşılayan en ucuz yol. */
export function dgIsabetGunuKapat(beyanSkoru) {
  try {
    if (!S._dgIklim || !S._dgNabiz || typeof S._dgNabiz.deger !== 'number') return;
    /* ÖLÇEK DÖNÜŞÜMÜ YOK — faz denetimi, 2026-08-29. İlk yazımda `deger`
       burada 1..10'a çevrilip geçiriliyordu; `dgIsabetGuncelle` ise ölçülen
       tarafın orta noktasını 0 kabul eder (`olculenDeger > 0 ? +1 : ...`).
       Çevrilmiş bir skor DAİMA > 0 olduğu için ölçümün yönü her gün "iyi"
       okunuyordu: sınama motorun isabetini değil, yalnız kullanıcının 5.5
       üstü verip vermediğini sayardı. Bu FAZ 10 denetiminin bulduğu kırığın
       AYNI SINIFI (öğrenme defteri iki farklı ölçekten besleniyordu) —
       karşılaştırmanın iki yanı aynı ölçekte olmak zorunda değil, ama her
       yanın orta noktası KENDİ ölçeğinde tanımlı olmalı: `deger` için 0,
       `mood_history` için 5.5. Ham değer aynen geçer. */
    S._dgIklim = dgIsabetGuncelle(S._dgIklim, S._dgNabiz.deger, beyanSkoru);
    dgIklimKaydet(S._dgIklim);
  } catch (e) { console.warn('dgIsabetGunuKapat:', e && e.message); }
}

/* ═══ HAFTALIK RAPOR SİSTEMİ ═══
   Her Pazar kullanıcıya AI üretimli haftalık dürüst rapor sunar.
   Seans sayısı, mood trendi, tekrar eden temalar, taahhüt takibi.
*/

/* ═══ MİKRO-ONBOARDING SİSTEMİ ═══
   İlk seans öncesi 3 soru — kullanıcıyı hazırlar, AI'ya bağlam verir.
*/

/** showMicroOnboarding için after-hook registry (Faz 2.1) */
export const showMicroOnboardingHooks = createHookRegistry();

export async function showMicroOnboarding() {
  const result = await _showMicroOnboardingBody();
  showMicroOnboardingHooks.runAfter(result);
  return result;
}

// İlk giriş onboarding'i artık PORTRE (02c-portre.js) — kullanıcı kendi
// kartını yazar, "Olduğun Kişi" kararını onaylar. Eski Yol Ayini (02b) yerine geçti.
// window.* üzerinden çağrılır (import kenarı eklemeden, TDZ-güvenli; çağrı boot
// sonrası ilk seansta olur, fonksiyonlar o an window'da hazırdır).
function _showMicroOnboardingBody() {
  if (typeof window !== 'undefined' && window.runPortreOnboarding) {
    return window.runPortreOnboarding();
  }
  return runOnboardingRitual(); // emniyet ağı (eski ritüel)
}

export function buildOnboardingContext(result) {
  if (typeof window !== 'undefined' && window.buildPortreContext) {
    return window.buildPortreContext(result);
  }
  return buildRitualContext(result);
}

/* ═══ BAĞLAMA DUYARLI GERİ ÇAĞIRMA ═══
   Bildirim içeriğini son seans/taahhüt bağlamına göre kişiselleştir.
*/

export function getContextualNotificationBody() {
  // 1. Tutulmamış taahhüt var mı?
  try {
    const stored = SecureStorage.get(STORAGE_KEYS.COMMITMENTS(S.currentUser?.id), S.currentUser?.id, []);
    const pending = stored.filter(c => !c.checked && c.date !== nowTR().toDateString());
    if (pending.length) {
      return t('notify.commitment', '"{q}…" — bunu söyledin. Oldu mu?').replace('{q}', pending[0].text.slice(0, 50));
    }
  } catch (_) {}

  // 2. Son seansın son mesajından ipucu
  try {
    const sortedSids = Object.keys(S.allSessions).sort((a, b) =>
      getSessionLastActivity(b) - getSessionLastActivity(a));
    if (sortedSids.length) {
      const lastMsgs = S.allSessions[sortedSids[0]];
      const lastUserMsg = lastMsgs.filter(m => m.role === 'user').slice(-1)[0];
      if (lastUserMsg) {
        return t('notify.unfinished', 'Son konuşmamızda yarım kalan bir şey vardı. Devam edelim mi?');
      }
    }
  } catch (_) {}

  /* 3. Seri bazlı — kaynak DOM DEĞİL, serinin kendi defteri.
     Eskiden `document.getElementById('streak-val')?.textContent || '0'`
     okunuyordu; o id repoda hiç yok (updateStreakUI `chat-streak` ve
     `topbar-streak-count` yazar), yani değer HER ZAMAN 0'a düşüyor ve
     bildirim, kullanıcının serisi kaç olursa olsun "Seri kırıldı" diyordu.

     "Seri kırıldı" dalı da kaldırıldı: sıfır, serinin KIRILDIĞININ kanıtı
     değildir — hiç başlamamış bir seri kırılamaz. Uygulamayı yeni açan
     kullanıcıya "kırdın" demek, olmamış bir olayı ona atfetmekti. Kanıt
     yoksa suçlama da yok; nötr davet kalır. */
  /* calculateStreak kendi kaynağını okur (getActivityDays) — `historyData`
     parametresi gövdede hiç kullanılmıyor, o yüzden argüman geçilmiyor:
     geçmek, seriyi buradaki listeden hesaplıyormuş izlenimi verirdi. */
  let streak = 0;
  try { streak = calculateStreak(); } catch (_) {}
  if (streak >= 3) return t('notify.streak_active', '{n} günlük serin var. Bugün de devam.').replace('{n}', streak);

  return t('notify.default', 'Bugün de buradayım. Başla.');
}

/* ═══ YAPISAL KULLANICI PROFİLİ ═══
   AI'ın seans sonunda çıkardığı yapısal bilgi.
   user_profile tablosu: occupation, family, location, core_issue, goal, pattern
   Kullanıcı görebilir ve düzeltebilir.
   System prompt'a yapısal olarak eklenir.
*/

export async function loadUserProfile() {
  if (!S.currentUser) return;
  try {
    // maybeSingle: profil satırı HENÜZ yoksa (yeni hesabın ilk boot'u) .single()
    // sıfır satırı hata sayar ve konsola 406 basar — kayıp yok, sadece gürültü.
    const { data } = await sb.from('user_profile')
      .select('*')
      .eq('user_id', S.currentUser.id)
      .maybeSingle();
    if (data) {
      S._userProfile = data;
      // Form alanlarını doldur
      document.getElementById('up-occupation').value = data.occupation || '';
      document.getElementById('up-family').value = data.family || '';
      document.getElementById('up-location').value = data.location || '';
      document.getElementById('up-core-issue').value = data.core_issue || '';
      document.getElementById('up-goal').value = data.goal || '';
      document.getElementById('up-pattern').value = data.recurring_pattern || '';
    }
  } catch (e) {
    console.warn('Profil yükleme hatası (tablo yoksa normal):', e.message);
  }

  // Seans notlarını göster — gün başına TEK kayıt, portre odaklı
  const notesEl = document.getElementById('profile-memory-notes');
  if (notesEl) {
    if (S._narrativeMemory.length) {
      notesEl.innerHTML = S._narrativeMemory.map(m => {
        const noteHTML = (m.note || '')
          .replace(/</g, '&lt;')
          .replace(/\n\n+/g, '</p><p style="margin-top:10px;">')
          .replace(/\n/g, '<br>');
        return `
          <div style="padding:18px 0;border-bottom:1px solid var(--border);">
            <div style="font-size:10px;color:var(--gold);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">${m.date}</div>
            <div style="font-size:14px;color:var(--text-mid);line-height:1.65;font-family:var(--serif);">
              <p>${noteHTML}</p>
            </div>
          </div>
        `;
      }).join('');
    } else {
      notesEl.innerHTML = '<div style="font-size:12px;color:var(--text-dim);font-style:italic;">' + t('ui.no_summary_yet', 'Henüz gün sonu özeti yok. Bir gün dolu dolu konuştuğunda Emre seni tanımaya başlar.') + '</div>';
    }
  }
}

export async function saveUserProfile() {
  if (!S.currentUser) return;
  const profile = {
    user_id:           S.currentUser.id,
    occupation:        document.getElementById('up-occupation').value.trim(),
    family:            document.getElementById('up-family').value.trim(),
    location:          document.getElementById('up-location').value.trim(),
    core_issue:        document.getElementById('up-core-issue').value.trim(),
    goal:              document.getElementById('up-goal').value.trim(),
    recurring_pattern: document.getElementById('up-pattern').value.trim(),
    updated_at:        new Date().toISOString()
  };
  try {
    const { error } = await sb.from('user_profile').upsert([profile], { onConflict: 'user_id' });
    if (error) throw error;
    S._userProfile = profile;
    showToast(t('toast.profile_updated'));
  } catch (e) {
    showToast(t('toast.save_error') + e.message, true);
  }
}

// Seans sonunda AI'dan yapısal profil çıkarımı
export async function updateProfileFromSession() {
  if (!S.currentUser || !TOGETHER_API_KEY) return;
  const userMsgs = S.chatHistory.filter(m => m.role === 'user');
  if (userMsgs.length < 3) return;

  const existing = S._userProfile ? JSON.stringify({
    occupation: S._userProfile.occupation || '',
    family: S._userProfile.family || '',
    core_issue: S._userProfile.core_issue || '',
    goal: S._userProfile.goal || '',
    recurring_pattern: S._userProfile.recurring_pattern || ''
  }) : '{}';

  try {
    const userContent = userMsgs.map(m => m.content.slice(0, 120)).join('\n');
    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text:
        p('prompt.profile_extract.user', { userContent, existing })
      }] }],
      systemPrompt: p('prompt.profile_extract.system'),
      maxTokens: 200, temperature: 0.1, jsonMode: true, model: SUMMARY_MODEL, skipPersona: true
    });

    let updates;
    try { updates = JSON.parse(raw); } catch { return; }

    // Sadece dolu alanları güncelle
    const merged = { ...(S._userProfile || {}), user_id: S.currentUser.id, updated_at: new Date().toISOString() };
    Object.entries(updates).forEach(([k, v]) => {
      if (v && v.trim() && k !== 'user_id') merged[k] = v.trim();
    });

    await sb.from('user_profile').upsert([merged], { onConflict: 'user_id' });
    S._userProfile = merged;
    invalidateContextCache();
  } catch (e) {
    console.warn('Profil güncelleme hatası:', e.message);
  }
}

export function getProfileContext() {
  if (!S._userProfile) return '';
  const fields = [];
  if (S._userProfile.occupation) fields.push(`${p('prompt.profile.occupation')}: ${S._userProfile.occupation}`);
  if (S._userProfile.family) fields.push(`${p('prompt.profile.family')}: ${S._userProfile.family}`);
  if (S._userProfile.location) fields.push(`${p('prompt.profile.location')}: ${S._userProfile.location}`);
  if (S._userProfile.core_issue) fields.push(`${p('prompt.profile.core_issue')}: ${S._userProfile.core_issue}`);
  if (S._userProfile.goal) fields.push(`${p('prompt.profile.goal')}: ${S._userProfile.goal}`);
  if (S._userProfile.recurring_pattern) fields.push(`${p('prompt.profile.pattern')}: ${S._userProfile.recurring_pattern}`);
  if (!fields.length) return '';
  return '\n\n' + p('prompt.context.profile_header') + '\n' + fields.join('\n') + '\n' + p('prompt.context.profile_instruction');
}

/* ═══ KİŞİSELLEŞTİRME MOTORU ═══
   Kullanıcının tüm verisini toplayarak AI'ya bağlam üretir.
   Yol Haritası ve Challenge ortak kullanır.
*/

export async function buildPersonalizationContext() {
  const parts = [];

  if (S._userProfile) {
    const fields = [];
    if (S._userProfile.occupation) fields.push(`${p('prompt.profile.occupation')}: ${S._userProfile.occupation}`);
    if (S._userProfile.family) fields.push(`${p('prompt.personalization.family_label')}: ${S._userProfile.family}`);
    if (S._userProfile.location) fields.push(`${p('prompt.profile.location')}: ${S._userProfile.location}`);
    if (S._userProfile.core_issue) fields.push(`${p('prompt.profile.core_issue')}: ${S._userProfile.core_issue}`);
    if (S._userProfile.goal) fields.push(`${p('prompt.profile.goal')}: ${S._userProfile.goal}`);
    if (S._userProfile.recurring_pattern) fields.push(`${p('prompt.profile.pattern')}: ${S._userProfile.recurring_pattern}`);
    if (fields.length) parts.push(p('prompt.personalization.profile') + '\n' + fields.join('\n'));
  }

  if (S._narrativeMemory.length) {
    const portraits = S._narrativeMemory.slice(0, 7).map(m => `[${m.date}]: ${m.note.slice(0, 250)}`);
    parts.push(p('prompt.personalization.summaries') + '\n' + portraits.join('\n'));
  }

  try {
    const { data: moods } = await sb.from('mood_history')
      .select('score, created_at')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(14);
    if (moods?.length >= 3) {
      const avg = (moods.reduce((s, m) => s + m.score, 0) / moods.length).toFixed(1);
      const trend = moods[0].score > moods[moods.length - 1].score ? '↑' : moods[0].score < moods[moods.length - 1].score ? '↓' : '→';
      parts.push(p('prompt.personalization.mood_trend', { count: moods.length, avg, trend }));
    }
  } catch (_) {}

  try {
    const { data: breakthroughs } = await sb.from('breakthrough_moments')
      .select('content, created_at')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (breakthroughs?.length) {
      parts.push(p('prompt.personalization.breakthroughs') + '\n' + breakthroughs.map(b => b.content.slice(0, 120)).join('\n'));
    }
  } catch (_) {}

  try {
    const { data: hw } = await sb.from('homework')
      .select('task, status')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (hw?.length) {
      const done = hw.filter(h => h.status === 'done').length;
      const skipped = hw.filter(h => h.status === 'skipped').length;
      parts.push(`${p('prompt.personalization.homework_history')} ${hw.length}, ${done} ${p('prompt.personalization.completed')}, ${skipped} ${p('prompt.personalization.skipped')}`);
      const recent = hw.slice(0, 3).map(h => `- "${h.task}" → ${h.status === 'done' ? p('prompt.personalization.completed') : h.status === 'skipped' ? p('prompt.personalization.skipped') : h.status}`);
      parts.push('Son ödevler:\n' + recent.join('\n'));
    }
  } catch (_) {}

  try {
    const { data: ch } = await sb.from('challenge_progress')
      .select('challenge_id, status, current_day')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (ch?.length) {
      const completed = ch.filter(c => c.status === 'completed').length;
      const abandoned = ch.filter(c => c.status === 'abandoned').length;
      parts.push(`${p('prompt.personalization.challenge_history')} ${completed} ${p('prompt.personalization.completed')}, ${abandoned} ${p('prompt.personalization.skipped')}`);
    }
  } catch (_) {}

  try {
    const { data: tracks } = await sb.from('user_tracks')
      .select('track_id, status, sessions_completed')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(5);
    if (tracks?.length) {
      parts.push(p('prompt.personalization.track_history') + '\n' + tracks.map(tr => `- "${tr.track_id}": ${tr.status}, ${tr.sessions_completed}`).join('\n'));
    }
  } catch (_) {}

  return parts.join('\n\n');
}

/** Günlük cache key üreteci — diğer modüller (10h-w2-library-challenges) tarafından da kullanılır. */
export function todayCacheKey(prefix) {
  const d = new Date();
  return `${prefix}_${S.currentUser.id}_${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
// Geriye dönük uyumluluk — eski private isim
const _todayCacheKey = todayCacheKey;

/* ═══ YOL HARİTASI — AI KİŞİSEL YOL HARİTASI ═══ */

let _activeTrack = null;
let _activeHomework = null;
/* Ödev DEFTERİ — post-auth turda zaten çekilen listenin tamamı.
   `loadRoadmap` bu satırları yıllardır alıyor ve yalnız `pending` olanı
   saklayıp gerisini atıyordu; geçmiş DB'de duruyor, ekranda yoktu. Liste
   burada tutulur, ikinci bir sorgu turu açılmaz. */
let _homeworkGecmis = [];
let _aiRecommendedTracks = null;

export async function loadRoadmap() {
  try {
    const { data: trackData } = await sb.from('user_tracks')
      .select('*')
      .eq('user_id', S.currentUser.id)
      .eq('status', 'active')
      .maybeSingle();
    if (trackData) {
      _activeTrack = trackData;
      renderActiveTrack(trackData);
    } else {
      const _trackSec = document.getElementById('active-track-section');
      if (_trackSec) _trackSec.innerHTML = '';
    }
  } catch (_) {}

  try {
    const { data: hwData } = await sb.from('homework')
      .select('*')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (hwData?.length) {
      _activeHomework = hwData.find(h => h.status === 'pending') || null;
      _homeworkGecmis = hwData;
    }
  } catch (e) {
    console.warn('Ödev yükleme hatası:', e.message);
  }

  await loadAIRecommendedTracks();
}

export async function loadAIRecommendedTracks() {
  const el = document.getElementById('ai-recommended-tracks');
  if (!el) return;

  const cacheKey = _todayCacheKey('roadmap_v2');
  const cached = MemCache.get(cacheKey, () => SafeStorage.get(cacheKey));
  if (cached) {
    _aiRecommendedTracks = cached;
    renderAITracks();
    return;
  }

  if (!S._narrativeMemory.length && !S._userProfile) {
    el.innerHTML = `<div class="p13n-empty">
      <div class="p13n-icon">◎</div>
      <div class="p13n-title">${t('p13n.empty_title', 'Seni Tanımaya Başlıyorum')}</div>
      <div class="p13n-desc">${t('p13n.empty_desc', 'Birkaç seans konuştuktan sonra sana özel bir yol haritası çıkaracağım.<br>Şimdilik sohbete dön — birlikte keşfedelim.')}</div>
    </div>`;
    return;
  }

  el.innerHTML = `<div class="p13n-loading">
    <div class="p13n-shimmer"></div><div class="p13n-shimmer short"></div><div class="p13n-shimmer"></div>
    <div class="p13n-loading-text">${t('p13n.loading', 'Seni tanıyorum, yolunu çiziyorum...')}</div>
  </div>`;

  try {
    const ctx = await buildPersonalizationContext();
    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text:
        `${ctx}\n\n` + p('prompt.ai_tracks.task')
      }] }],
      systemPrompt: p('prompt.ai_tracks.system'),
      maxTokens: 1200, temperature: 0.7, jsonMode: true, model: SUMMARY_MODEL, skipPersona: true
    });

    const parsed = JSON.parse(raw);
    let tracks = parsed.tracks || (Array.isArray(parsed) ? parsed : (parsed.id && parsed.name) ? [parsed] : []);
    if (tracks.length) {
      _aiRecommendedTracks = tracks;
      SafeStorage.set(cacheKey, _aiRecommendedTracks);
      MemCache.set(cacheKey, _aiRecommendedTracks);
      renderAITracks();
    }
  } catch (e) {
    console.warn('AI roadmap hatası:', e.message);
    el.innerHTML = `<div class="p13n-empty">
      <div class="p13n-icon">◇</div>
      <div class="p13n-desc">${t('p13n.error', 'Şu an öneri oluşturamadım. Birazdan tekrar dene.')}</div>
    </div>`;
  }
}

function _getTrackInfo(trackId) {
  if (_aiRecommendedTracks) {
    const found = _aiRecommendedTracks.find(t => t.id === trackId);
    if (found) return found;
  }
  try {
    const stored = SafeStorage.get(`track_info_${S.currentUser.id}_${trackId}`);
    if (stored) return stored;
  } catch (_) {}
  return null;
}

export function renderActiveTrack(track) {
  const section = document.getElementById('active-track-section');
  if (!section) return;

  const info = _getTrackInfo(track.track_id);
  if (!info) {
    section.innerHTML = `<div class="aj-card">
      <div class="aj-badge">${t('track.active_journey', 'AKTİF YOLCULUK')}</div>
      <div class="aj-name">${track.track_id}</div>
    </div>`;
    return;
  }

  const completed = track.sessions_completed || 0;
  const total = info.sessions || 5;
  const pct = Math.min(100, Math.round((completed / total) * 100));

  section.innerHTML = `
    <div class="aj-card">
      <div class="aj-badge">${t('track.active_journey', 'AKTİF YOLCULUK')}</div>
      <div class="aj-name">${escapeHTML(info.name)}</div>
      <div class="aj-desc">${escapeHTML(info.desc)}</div>
      <div class="aj-reason">${escapeHTML(info.reason)}</div>
      <div class="aj-progress-wrap">
        <div class="aj-progress-track"><div class="aj-progress-fill" style="width:${pct}%"></div></div>
        <div class="aj-progress-meta"><span>${completed} / ${total} ${t('track.sessions_unit', 'seans')}</span><span>${pct}%</span></div>
      </div>
      ${info.milestones?.length ? `<div class="aj-milestones">${info.milestones.map((m, i) =>
        `<div class="aj-milestone ${i < completed ? 'done' : ''}"><div class="aj-ms-dot"></div><span>${escapeHTML(m)}</span></div>`
      ).join('')}</div>` : ''}
    </div>`;
}

export function renderAITracks() {
  const el = document.getElementById('ai-recommended-tracks');
  if (!el || !_aiRecommendedTracks?.length) return;

  el.innerHTML = _aiRecommendedTracks.map((trk, idx) => {
    const isActive = _activeTrack?.track_id === trk.id;
    return `<div class="ai-track-card ${isActive ? 'active' : ''}" ${isActive ? '' : `onclick="startTrack('${trk.id}')"`}>
      ${isActive ? `<div class="atc-badge">${t('track.active', 'AKTİF')}</div>` : ''}
      <div class="atc-number">${idx + 1}</div>
      <div class="atc-name">${escapeHTML(trk.name)}</div>
      <div class="atc-desc">${escapeHTML(trk.desc)}</div>
      <div class="atc-reason">${escapeHTML(trk.reason)}</div>
      <div class="atc-footer">
        <span class="atc-meta">${trk.sessions || 5} ${t('track.sessions_unit', 'seans')} · ${trk.milestones?.length || 0} ${t('track.milestones_unit', 'kilometre taşı')}</span>
        ${!isActive ? `<span class="atc-cta">${t('track.start_cta', 'Başla →')}</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

export async function markHomework(status) {
  if (!_activeHomework?.id) return;
  invalidateContextCache();
  try {
    await sb.from('homework')
      .update({ status, completed_at: new Date().toISOString() })
      .eq('id', _activeHomework.id);

    _activeHomework = null;
    showToast(status === 'done' ? t('toast.homework_done') : t('toast.homework_noted'));
  } catch (e) {
    showToast(t('toast.cannot_save') + e.message, true);
  }
}

export async function startTrack(trackId) {
  if (!S.currentUser) return;
  if (_activeTrack) {
    if (!confirm(t('confirm.change_track', 'Aktif yolculuğu değiştirmek istediğinden emin misin?'))) return;
    await sb.from('user_tracks').update({ status: 'abandoned' }).eq('id', _activeTrack.id);
  }

  const info = _aiRecommendedTracks?.find(t => t.id === trackId);
  if (info) {
    SafeStorage.set(`track_info_${S.currentUser.id}_${trackId}`, info);
  }

  try {
    const { data, error } = await sb.from('user_tracks').insert([{
      user_id: S.currentUser.id,
      track_id: trackId,
      status: 'active',
      sessions_completed: 0
    }]).select().single();
    if (error) throw error;
    _activeTrack = data;
    showToast(t('toast.track_started'));
    loadRoadmap();
  } catch (e) {
    showToast(t('toast.error') + e.message, true);
  }
}

export async function generateHomework() {
  if (!S.currentUser || !TOGETHER_API_KEY) return;
  const userMsgs = S.chatHistory.filter(m => m.role === 'user');
  if (userMsgs.length < 2) return;

  let trackContext = '';
  if (_activeTrack) {
    const info = _getTrackInfo(_activeTrack.track_id);
    trackContext = info ? `Aktif yolculuk: "${info.name}" — ${info.desc}` : '';
  }

  try {
    const userContent = userMsgs.slice(-4).map(m => m.content.slice(0, 100)).join('\n');
    const profileCtx = S._userProfile ? `Temel mesele: ${S._userProfile.core_issue || '?'}, Hedef: ${S._userProfile.goal || '?'}` : '';

    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text:
        p('prompt.homework_gen.user', { userContent, trackContext, profileCtx })
      }] }],
      systemPrompt: p('prompt.homework_gen.system'),
      maxTokens: 80, temperature: 0.5, model: SUMMARY_MODEL, skipPersona: true
    });

    if (raw && raw.length > 5) {
      if (_activeHomework?.id) {
        try { await sb.from('homework').update({ status: 'superseded' }).eq('id', _activeHomework.id); } catch (_) {}
      }
      const { data: inserted } = await sb.from('homework').insert([{
        user_id: S.currentUser.id, session_id: S.currentSessId,
        task: raw.slice(0, 300), status: 'pending'
      }]).select().single();
      _activeHomework = inserted || { task: raw.slice(0, 300), status: 'pending', created_at: new Date().toISOString() };
    }
  } catch (e) {
    console.warn('Ödev üretim hatası:', e.message);
  }
}

/* Bekleyen ödevin kendisi — sohbet çipi (06) bunu okur.
   Modül-yerel `_activeHomework`'e dışarıdan erişilemez; çip onu bare
   identifier olarak okuyup `typeof … === 'undefined'` guard'ına takılıyordu,
   yani ödev DB'de dururken ekranda hiç doğmuyordu. Köprü burada kurulur. */
export function getActiveHomework() {
  return _activeHomework;
}

/** Ödev geçmişi — kullanıcının kendine verdiği sözlerin defteri.
 *
 *  Kaynak post-auth turda çekilen listedir (ikinci sorgu yok). Kanıt kapısı
 *  (§6.10): kayıt yoksa BOŞ dizi döner — çağıran taraf sayı basmaz, davet
 *  gösterir. `superseded` satırlar elenir: onlar kullanıcının bıraktığı bir
 *  söz değil, motorun üzerine yazdığı bir kayıttır — deftere girmezler. */
export function getHomeworkHistory() {
  try {
    return (_homeworkGecmis || [])
      .filter(h => h && h.task && h.status !== 'superseded');
  } catch (_) { return []; }
}

/** Defteri derinleştirir — post-auth turu son 10 kaydı alır, panel daha
 *  gerisini isteyebilir. Sessizce düşer: ağ yoksa elimizdeki defter kalır,
 *  ekran boşalmaz. Döner: defterin (tazelenmiş) hâli. */
/* ═══════════════════════════════════════════════════════════════════
   ÖDEV DEFTERİ (hwd) — üstlendiklerinin kaydı
   ───────────────────────────────────────────────────────────────────
   FELSEFE (Emre): Ödev bir puan değil, bir söz. Seansın sonunda
     üstlendiğin iş DB'de yıllardır duruyordu ama hiçbir yerden
     görünmüyordu — kullanıcı kendi taahhütlerinin geçmişine bakamıyordu.
     Defter sayı tutmaz ("3 ödev tamamladın" demez); üstlendiklerini
     sırayla gösterir. "Mesele Sensin."
   AD: Kullanıcı çipte "ÖDEV" görür, defter de o adı taşır. "Söz Defteri"
     ADI ALINMIŞTIR (13u, günlük ritüelin sözü) — karıştırılmaz.
   MEKANİK: hwdAc() portal açar (09c'nin mem-panel kalıbı, kabuk CSS'i
     paylaşılır), gövdeyi getHomeworkHistory()'den çizer, açılışta
     loadHomeworkHistory() ile derinleştirip yeniden çizer.
   Kalıcılık: yok — kaynak `homework` tablosudur.
═══════════════════════════════════════════════════════════════════ */

/** Okunabilir tarih — 09c'nin kalıbı. Gün/ay yeter: yıl, defterde
 *  satırın kendisinden okunur (liste zaten yeniden eskiye iner). */
function _hwdTarih(iso) {
  try {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(S._currentLang || 'tr', { day: 'numeric', month: 'long' });
  } catch (_) { return ''; }
}

/** Defterin gövdesi. Kanıt kapısı (§6.10): kayıt yoksa SAYI değil DAVET
 *  basılır — "0 ödev" bir ölçü değil, bir sitemdir. */
function _hwdGovde() {
  const defter = getHomeworkHistory();
  if (!defter.length) {
    return `<p class="hwd-bos">${escapeHTML(t('hwd.empty',
      'Buraya seansların sonunda üstlendiklerin yazılır. Henüz bir şey yok.'))}</p>`;
  }
  const bekleyen = defter.filter(h => h.status === 'pending');
  const gecmis   = defter.filter(h => h.status !== 'pending');

  const satir = (h, acik) => {
    const tarih = _hwdTarih(h.created_at);
    return `<div class="hwd-satir${acik ? ' hwd-satir--acik' : ''}">
      <span class="hwd-glyph" aria-hidden="true">${acik ? '◈' : '✓'}</span>
      <div class="hwd-metin">
        <div class="hwd-task">${escapeHTML(h.task || '')}</div>
        ${tarih ? `<div class="hwd-tarih">· ${escapeHTML(tarih)} ·</div>` : ''}
      </div>
      ${acik && h.id ? `<button type="button" class="hwd-yaptim" data-hwd-done="${escapeHTML(String(h.id))}">${
        escapeHTML(t('chat.done', 'Yaptım'))}</button>` : ''}
    </div>`;
  };

  // Başlıklar yalnız DOLU bölüm için çizilir: boş bir başlık, olmayan bir
  // şeyin sözünü vermektir.
  return (bekleyen.length ? `<div class="hwd-blok">
      <div class="hwd-blok-tag">${escapeHTML(t('hwd.open', 'ÜSTÜNDE OLAN'))}</div>
      ${bekleyen.map(h => satir(h, true)).join('')}
    </div>` : '')
    + (gecmis.length ? `<div class="hwd-blok">
      <div class="hwd-blok-tag">${escapeHTML(t('hwd.past', 'ÜSTLENDİKLERİN'))}</div>
      ${gecmis.map(h => satir(h, false)).join('')}
    </div>` : '');
}

export function hwdKapat() {
  const el = document.getElementById('hwd-panel');
  // Kaydırma kilidi yalnız KENDİ panelimiz varsa açılır. Kilit `body`de
  // paylaşılan bir kaynaktır (hafıza paneli de onu kullanır); koşulsuz
  // sıfırlamak, açık duran başka bir panelin altındaki sayfayı kaydırılır
  // hâle getirirdi — `hwdAc`in ilk satırındaki "çift açılmayı önle"
  // çağrısı da o yoldan geçiyor.
  if (!el) return;
  try { window.wtOverlayClose?.('odev-defteri'); } catch (_) {}   // Kullanım Nabzı (00f)
  el.remove();
  try { document.body.style.overflow = ''; } catch (_) {}
}

/** Defteri aç. Önce elimizdeki kayıtla çizer (anında görünür), sonra
 *  derinleştirip tazeler — boş ekranda bekletmez. */
export function hwdAc() {
  hwdKapat();                          // çift açılmayı önle
  try { window.wtOverlayOpen?.('odev-defteri'); } catch (_) {}   // Kullanım Nabzı (00f)
  const panel = document.createElement('div');
  panel.id = 'hwd-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', t('hwd.title', 'ÖDEV DEFTERİ'));
  panel.innerHTML = `
    <div class="hwd-backdrop"></div>
    <div class="hwd-sheet">
      <div class="hwd-head">
        <div>
          <div class="hwd-title">◈ ${escapeHTML(t('hwd.title', 'ÖDEV DEFTERİ'))}</div>
          <div class="hwd-sub">${escapeHTML(t('hwd.sub',
            'Seansların sonunda üstlendiklerin — söz burada durur.'))}</div>
        </div>
        <button class="hwd-close" aria-label="${escapeHTML(t('common.close', 'Kapat'))}">✕</button>
      </div>
      <div class="hwd-body">${_hwdGovde()}</div>
    </div>`;
  document.body.appendChild(panel);

  const _tazele = () => {
    const body = panel.querySelector('.hwd-body');
    if (body && document.getElementById('hwd-panel')) body.innerHTML = _hwdGovde();
  };

  panel.querySelector('.hwd-backdrop').addEventListener('click', hwdKapat);
  panel.querySelector('.hwd-close').addEventListener('click', hwdKapat);

  // "Yaptım" — markHomework yalnız BEKLEYEN ödevi işaretler (_activeHomework
  // üzerinden çalışır), o yüzden buton yalnız açık satırda çizilir.
  panel.querySelector('.hwd-body').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-hwd-done]');
    if (!btn) return;
    btn.disabled = true;
    try { await markHomework('done'); } catch (err) { console.warn('hwd done:', err && err.message); }
    // Defteri kaynaktan tazele: durum DB'de değişti, ekran onu izlesin.
    try { await loadHomeworkHistory(); } catch (_) {}
    _tazele();
    // Sohbetteki çip artık bayat — varsa kalksın (iki yüzey aynı şeyi
    // söylemesin).
    try { document.getElementById('hw-chat-chip')?.remove(); } catch (_) {}
  });

  requestAnimationFrame(() => panel.classList.add('open'));
  document.body.style.overflow = 'hidden';

  // Derin defter arkadan gelir; panel açık kaldıysa yeniden çizilir.
  loadHomeworkHistory().then(_tazele).catch(() => {});
}

export async function loadHomeworkHistory(limit = 60) {
  try {
    if (!S.currentUser?.id) return getHomeworkHistory();
    const { data } = await sb.from('homework')
      .select('*')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (data?.length) {
      _homeworkGecmis = data;
      // Bekleyen ödev de bu turda tazelenir: iki kaynak arasında sessiz bir
      // ayrışma kalmasın (çip ile defter aynı satırı göstersin).
      _activeHomework = data.find(h => h.status === 'pending') || _activeHomework;
    }
  } catch (e) {
    console.warn('hwGecmis:', e && e.message);
  }
  return getHomeworkHistory();
}

export function getHomeworkContext() {
  if (!_activeHomework) {
    return '\n\n' + p('prompt.homework.none');
  }
  const ageInDays = Math.floor((Date.now() - new Date(_activeHomework.created_at).getTime()) / 86400000);
  if (ageInDays > 14) {
    return '\n\n' + p('prompt.homework.stale', { ageInDays, task: _activeHomework.task });
  }
  return '\n\n' + p('prompt.homework.active', { ageInDays, task: _activeHomework.task });
}

export function getTrackContext() {
  if (!_activeTrack) return '';
  const info = _getTrackInfo(_activeTrack.track_id);
  const name = info?.name || _activeTrack.track_id;
  const sessions = info?.sessions || 5;
  return '\n\n' + p('prompt.track.active', { name, completed: _activeTrack.sessions_completed || 0, sessions });
}

export async function updateTrackProgress() {
  if (!_activeTrack) return;
  invalidateContextCache();
  try {
    const newCount = (_activeTrack.sessions_completed || 0) + 1;
    const info = _getTrackInfo(_activeTrack.track_id);
    const totalSessions = info?.sessions || 5;
    const status = newCount >= totalSessions ? 'completed' : 'active';
    await sb.from('user_tracks').update({ sessions_completed: newCount, status }).eq('id', _activeTrack.id);
    _activeTrack.sessions_completed = newCount;
    if (status === 'completed') {
      showToast(t('toast.track_completed').replace('{{name}}', info?.name || 'Journey'));
    }
  } catch (e) {
    console.warn('İzlek güncelleme hatası:', e.message);
  }
}

export function refreshRoadmapRecommendations() {
  const cacheKey = _todayCacheKey('roadmap_v2');
  MemCache.invalidate(cacheKey);
  SafeStorage.remove(cacheKey);
  _aiRecommendedTracks = null;
  loadAIRecommendedTracks();
}

/* ═══ BREAKTHROUGH MOMENT YAKALAMA ═══ */
// BREAKTHROUGH_PATTERNS → dp('detect.breakthrough') — 13-dil desteği

export function detectBreakthrough(text) {
  return dpTest('detect.breakthrough', text);
}

export async function saveBreakthroughMoment(text) {
  try {
    await sb.from('breakthrough_moments').insert([{
      user_id: S.currentUser.id, session_id: S.currentSessId,
      content: text.slice(0, 500), moment_type: 'insight'
    }]);
  } catch (_) {}
}

/** KIRILMA ANLARININ İKİ UCU — en eski ↔ en yeni, kullanıcının VERBATIM
 *  cümlesiyle.
 *
 *  Dönüşümün en dürüst kanıtı bir sayı değil, kişinin kendi diliyle yazdığı
 *  iki cümledir: aylar arayla, aynı hayat hakkında. Model bu cümleleri
 *  ÜRETMEZ — uygulama kaynaktan keser (.claude/plans/kesin-alinti-mimarisi.md).
 *
 *  Kanıt kapısı: iki AYRI kayıt yoksa `null` (tek cümle bir kıyas değildir).
 *  @returns {Promise<{ilk:{metin,tarih}, son:{metin,tarih}}|null>} */
export async function kirilmaUclari() {
  try {
    if (!sb || !S.currentUser?.id) return null;
    const { data } = await sb.from('breakthrough_moments')
      .select('content, created_at')
      .eq('user_id', S.currentUser.id)
      .order('created_at', { ascending: true });
    const rows = (data || []).filter(r => r && String(r.content || '').trim());
    if (rows.length < 2) return null;
    const yap = (r) => ({ metin: String(r.content).trim(), tarih: r.created_at });
    return { ilk: yap(rows[0]), son: yap(rows[rows.length - 1]) };
  } catch (_) { return null; }
}

/* ═══ EMRE'NİN KİTAPLIĞI ═══ */

/* window köprüsü — Dönüşüm Aynası (13t) bu modülü İMPORT ETMEZ: 09 ağır bir
   rapor/parça modülüdür ve aynanın tek ihtiyacı bir sayı çiftidir. */
if (typeof window !== 'undefined') {
  window.moodPencereKiyas = moodPencereKiyas;
  window.dgIsabetGunuKapat = dgIsabetGunuKapat;
  window.kirilmaUclari = kirilmaUclari;
  // Ödev defteri Drawer'ın inline onclick'inden açılır (_src.html) — o yüzden
  // window'da durur; kapatma da dışarıdan çağrılabilsin diye yanında.
  window.hwdAc = hwdAc;
  window.hwdKapat = hwdKapat;
}
