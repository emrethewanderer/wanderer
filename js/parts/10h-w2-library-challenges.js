/* ═══════════════════════════════════════════════════════════════
   10h — SEFER (21 GÜNLÜK YOLCULUK) + ENGELLER KATALOĞU
   ───────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Bir kalıp bir günde çözülmez; sefer, aynı yere 21 gün üst üste
     dönmenin adıdır. Mühür günde birdir — çünkü ölçtüğü şey niyet
     değil, tekrar.
   MEKANİK / MİMARİ / TEK GİRİŞ:
     Sefer Engeller ritüelinden (10m) ya da Örüntü Aynası'ndan (09d)
     `startSeferForBoss` ile başlar; durumu `challenge_progress`
     tablosunda yaşar ve `loadChallenges()` ile okunur (bu fonksiyon
     ARTIK ÇİZMEZ, yalnız S._activeChallenge / S._completedSeferler'i
     doldurur). Yolun görünen yüzü Derin Çalışma'nın `#dc-sefer`
     bölümüdür; gün `completeChallengeDay()` ile mühürlenir.
   SÖKÜLENLER (FAZ 8): `loadLibrary` (0 çağıran) ve AI challenge önerisi
     zinciri (`loadAIChallengeRecommendation` · `renderAIChallengeRec` ·
     `renderActiveChallenge` · `startPersonalChallenge` ·
     `refreshChallengeRecommendation` · `recoverChallengeTasks` ·
     `challengeCacheKey`) — hepsinin DOM hedefi (`#library-all-list`,
     `#ai-challenge-recommendation`, `#active-challenge-section`…)
     `_src.html`'de yoktu, yani zincir yalnızca sessizce hiçbir şey
     yapmıyordu.
   NOT: İçerideki identifier'lar (HASIM_BOSSES, startSeferForBoss,
   isSeferBoss, boss_id) geri-uyum için AYNEN duruyor. HASIM_BOSSES ve
   ENGELLER'in name/sub/panzehir/personSeed alanları i18n dict'ten
   (anahtar önekleri: hasim, eng.item) çözen getter'lar — consumer
   kodu değişmedi.
   Kalıcılık: Supabase `challenge_progress` + SafeStorage per-uid
   (görev listesi ve gün kapısı)
═══════════════════════════════════════════════════════════════ */
import { S } from '../state.js';
import { sb } from '../config.js';
import { SafeStorage, MemCache, showToast, recordActivityDay } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { todayCacheKey } from './09-reports-tracks.js';
import { showGraduation } from './10b-w2-gamification.js';

/* ═══ 21 GÜNLÜK YOLCULUK — KALIP-BAZLI SEFER SİSTEMİ (V4) ═══
   İçerik dict'te (sefer.<pattern>.task.0..20 + .prompt); i18n. Görevler
   sefer BAŞLADIĞI anda aktif dile çözülüp DB/SafeStorage'a düz string
   dizisi olarak yazılır — dil sonradan değişse de başlamış bir sefer
   donduğu dilde kalır. */

export function resolveSeferTasks(bossId) {
  return Array.from({ length: 21 }, (_, i) => t(`sefer.${bossId}.task.${i}`));
}
export function getSeferPrompt(bossId) { return t(`sefer.${bossId}.prompt`); }

// HASIM_BOSSES — 21 günlük yolculuk/challenge sisteminin temel veri tanımı.
// Canlı Engeller ritüeli (10m) ve yolculuk modalı (wsShowSeferModal) buradan import eder.
// İsim geri-uyum için korundu; user-facing dilde "kalıp/yolculuk" kullanılır.
// name/sub getter — her okumada aktif dile göre çözer (dict: hasim.<id>.*).
const _HASIM_META = [
  { id: 'erteleme',   region: 'bireysel', lesson: 3 },
  { id: 'onay',       region: 'iliski',   lesson: 7 },
  { id: 'kacis',      region: 'bireysel', lesson: 12 },
  { id: 'kizginlik',  region: 'bireysel', lesson: 18 },
  { id: 'yakistirma', region: 'is',       lesson: 24 },
  { id: 'kiyaslama',  region: 'iliski',   lesson: 30 },
];
export const HASIM_BOSSES = _HASIM_META.map(b => ({
  ...b,
  get name() { return t(`hasim.${b.id}.name`); },
  get sub()  { return t(`hasim.${b.id}.sub`); },
}));

/* ═══ ENGELLER — 6 PERDE · 6 ZEHİR · 7 TUZAK (Zihniyet Devrimi) ═══
   Her engel: panzehir (yol haritası özü), roots (öz-tanı için
   temel/derinlik anahtarları), theme (tekilleştirme), personSeed
   (Geçiş Alanı kartı tohumu), bossId? (varsa mevcut yolculuk kalıbı).
   name/sub/panzehir/personSeed getter — dict: eng.item.<id>.* */
function _engItem(meta) {
  return {
    ...meta,
    get name()       { return t(`eng.item.${meta.id}.name`); },
    get sub()        { return t(`eng.item.${meta.id}.sub`); },
    get panzehir()   { return t(`eng.item.${meta.id}.panzehir`); },
    get personSeed() { return t(`eng.item.${meta.id}.seed`); },
  };
}
export const ENGELLER = {
  perde: [
    { id: 'belirsizlik', framework: 'Perde', roots: ['oz_guven'], theme: 'belirsizlik' },
    { id: 'korku', framework: 'Perde', roots: ['oz_guven', 'layik'], theme: 'korku' },
    { id: 'bulanik-dusunce', framework: 'Perde', roots: ['standart'], theme: 'dusunce' },
    { id: 'olumsuz-cevre', framework: 'Perde', roots: ['bolluk', 'oz_deger'], theme: 'cevre' },
    { id: 'olumsuz-aliskanlik', framework: 'Perde', roots: ['standart'], theme: 'aliskanlik' },
    { id: 'erteleme', framework: 'Perde', roots: ['oz_guven'], theme: 'erteleme', bossId: 'erteleme' },
  ].map(_engItem),
  zehir: [
    { id: 'sikayet', framework: 'Zehir', roots: ['oz_deger'], theme: 'sikayet' },
    { id: 'herkesi-memnun', framework: 'Zehir', roots: ['oz_saygi', 'oz_guven'], theme: 'onay', bossId: 'onay' },
    { id: 'kucumseme', framework: 'Zehir', roots: ['oz_deger', 'layik'], theme: 'kiyas' },
    { id: 'kararsizlik', framework: 'Zehir', roots: ['oz_guven'], theme: 'kararsizlik' },
    { id: 'negatif-insan', framework: 'Zehir', roots: ['bolluk', 'oz_deger'], theme: 'cevre' },
    { id: 'gecmiste-yasama', framework: 'Zehir', roots: [], theme: 'gecmis' },
  ].map(_engItem),
  tuzak: [
    { id: 'kiyas', framework: 'Tuzak', roots: ['oz_deger', 'layik'], theme: 'kiyas', bossId: 'kiyaslama' },
    { id: 'erteleme-t', framework: 'Tuzak', roots: ['oz_guven'], theme: 'erteleme', bossId: 'erteleme' },
    { id: 'sabirsizlik', framework: 'Tuzak', roots: [], theme: 'sabir' },
    { id: 'korku-t', framework: 'Tuzak', roots: ['oz_guven', 'layik'], theme: 'korku' },
    { id: 'odak-kaybi', framework: 'Tuzak', roots: [], theme: 'odak' },
    { id: 'gecmis-t', framework: 'Tuzak', roots: [], theme: 'gecmis' },
    { id: 'kusursuzluk', framework: 'Tuzak', roots: ['oz_deger'], theme: 'kusursuzluk' },
  ].map(_engItem),
};

export function challengeTasksKey(id) { return `challenge_tasks_${S.currentUser.id}_${id || 'personal'}`; }
export function challengeInfoKey(id) { return `challenge_info_${S.currentUser.id}_${id || 'personal'}`; }

/* Aktif seferin bugünkü görevi — kayıt DB'de eksikse cihazdaki kopyaya
   düşer (sefer başlarken ikisine birden yazılıyor). */
export function seferGorevleri(ch) {
  if (!ch) return [];
  if (Array.isArray(ch.challenge_tasks) && ch.challenge_tasks.length) return ch.challenge_tasks;
  try {
    return MemCache.get(challengeTasksKey(ch.challenge_id), () => SafeStorage.get(challengeTasksKey(ch.challenge_id), [])) || [];
  } catch (_) { return []; }
}

/* GÜN KAPISI — bir sefer günü GÜNDE BİR mühürlenir.
   Bu kapı bugüne kadar yoktu, çünkü `completeChallengeDay`'in hiç çağıranı
   yoktu: yüzeyi ilk kez açan tur onu da getirmek zorunda. Kapısız hâlde 21
   günlük yolculuk arka arkaya 21 dokunuşla "biterdi" ve mühür bir şey
   ölçmez olurdu (§6.10 — kanıtı olmayan değer yoktur; buradaki kanıt
   TEKRARDIR, yani günün kendisi).
   Anahtar `todayCacheKey` ile yerel güne bağlıdır (`toISOString` TR'de gün
   kaydırır) ve seferin id'sini tutar — sefer değişirse kapı yeni sefer için
   kapalı sayılmaz. DÜRÜST SINIR: kayıt cihaz-yereldir; başka bir cihazdan
   aynı gün ikinci mühür basılabilir. Sunucu tarafı kapı `challenge_progress`
   şemasına bir gün alanı ister — bu sprintte ELLE iş açılmadı. */
export function seferBugunMuhurlendi() {
  const ch = S._activeChallenge;
  if (!ch || !S.currentUser?.id) return false;
  try { return SafeStorage.getRaw(todayCacheKey('sefer_gun')) === String(ch.id); }
  catch (_) { return false; }
}

/* Sefer durumunu okur — ÇİZMEZ. Yüzey (13A `#dc-sefer`) bu state'i okuyup
   kendi diliyle basar; `S._activeChallenge`'ı 12a arketip önerisi de
   tüketiyor. Dönüş: aktif sefer ya da null. */
export async function loadChallenges() {
  try {
    const { data } = await sb.from('challenge_progress')
      .select('*')
      .eq('user_id', S.currentUser.id)
      .eq('status', 'active')
      .maybeSingle();
    S._activeChallenge = data || null;
    /* Görev listesi DB'de duruyorsa cihaza da yazılır: sefer başlarken
       ikisine birden yazılıyordu, tazeleyen taraf da aynı sözleşmeyi
       korusun (çevrimdışı açılışta bugünkü görev görünür kalsın). */
    if (data && Array.isArray(data.challenge_tasks) && data.challenge_tasks.length) {
      try {
        SafeStorage.set(challengeTasksKey(data.challenge_id), data.challenge_tasks);
        MemCache.set(challengeTasksKey(data.challenge_id), data.challenge_tasks);
      } catch (_) {}
    }
  } catch (_) {
    S._activeChallenge = null;
  }

  try {
    const { data: completed } = await sb.from('challenge_progress')
      .select('*')
      .eq('user_id', S.currentUser.id)
      .eq('status', 'completed')
      .not('boss_id', 'is', null)
      .order('created_at', { ascending: false });
    S._completedSeferler = completed || [];
  } catch (_) {
    S._completedSeferler = S._completedSeferler || [];
  }

  return S._activeChallenge;
}

/* loadAIChallengeRecommendation · renderAIChallengeRec · renderActiveChallenge ·
   startPersonalChallenge SÖKÜLDÜ (FAZ 8). Dördü de `#ai-challenge-*` /
   `#active-challenge-section` / `#today-challenge-task` kabuklarına
   yazıyordu; o kabuklar `_src.html`'de yok, dolayısıyla LLM'e giden
   challenge önerisi de hiç doğmuyordu. Sefer artık Engeller ritüelinden
   (10m) ve Örüntü Aynası'ndan (09d) başlar, Derin Çalışma'da görünür.
   Kişisel (boss'suz) eski kayıtlar DÜŞMEZ: yüzey `challenge_name`'e
   bakarak onları da gösterir. */

export async function startSeferForBoss(bossId) {
  const boss = HASIM_BOSSES.find(b => b.id === bossId);
  if (!boss) return;

  if (S._activeChallenge && !confirm(t('confirm.abandon_challenge'))) return;

  try {
    if (S._activeChallenge) {
      await sb.from('challenge_progress').update({ status: 'abandoned' }).eq('id', S._activeChallenge.id);
    }

    const tasks = resolveSeferTasks(bossId);
    const challengeId = `sefer_${bossId}_${Date.now()}`;
    const nefesAtStart = calcBossNefes(bossId);
    const bossName = boss.name, bossSub = boss.sub;

    SafeStorage.set(challengeTasksKey(challengeId), tasks);
    MemCache.set(challengeTasksKey(challengeId), tasks);
    const info = { name: bossName, desc: bossSub, reason: t('lib.boss_journey_reason', '{name} kalıbı üzerine 21 günlük yolculuk.').replace('{name}', bossName) };
    SafeStorage.set(challengeInfoKey(challengeId), info);
    MemCache.set(challengeInfoKey(challengeId), info);

    const { data } = await sb.from('challenge_progress')
      .insert([{
        user_id: S.currentUser.id,
        challenge_id: challengeId,
        status: 'active',
        current_day: 0,
        challenge_name: bossName,
        challenge_desc: bossSub,
        challenge_reason: info.reason,
        challenge_tasks: tasks,
        boss_id: bossId,
        nefes_at_start: nefesAtStart,
        nefes_now: nefesAtStart,
      }])
      .select().single();
    S._activeChallenge = data;
    showToast(t('lib.journey_started', '{name} yolculuğu başladı').replace('{name}', bossName));
    loadChallenges();
  } catch (e) { showToast(t('toast.error') + e.message, true); }
}

export function calcBossNefes(bossId) {
  const rLog = S._resistanceLog || [];
  const encounters = rLog.filter(r => (r.pattern || '').toLowerCase().includes(bossId)).length;
  return encounters > 10 ? Math.max(10, 100 - encounters * 3) : Math.min(100, 30 + encounters * 5);
}

/* Günü mühürler. Dönüş: mühür düştüyse true.
   NEFES YAZILMIYOR (FAZ 8 · §6.10): eski hâli her günde `nefes_now`'ı
   `3 + Math.random()*2` kadar düşürüyordu — ne beyan ne ölçüm, uydurulmuş
   bir sayı. Okuyanı da yoktu. `nefes_at_start` kaldı: o `calcBossNefes` ile
   kullanıcının gerçek karşılaşma kaydından (`S._resistanceLog`) hesaplanır. */
export async function completeChallengeDay() {
  if (!S._activeChallenge) return false;
  const ch = S._activeChallenge;

  if (seferBugunMuhurlendi()) {
    showToast(t('lib.day_already', 'Bugünün adımı mühürlü — yol yarın sürer.'));
    return false;
  }

  const newDay = (ch.current_day || 0) + 1;
  const status = newDay >= 21 ? 'completed' : 'active';
  const isSeferBoss = !!ch.boss_id;

  try {
    await sb.from('challenge_progress').update({ current_day: newDay, status }).eq('id', ch.id);
    ch.current_day = newDay;
    ch.status = status;
    try { SafeStorage.setRaw(todayCacheKey('sefer_gun'), String(ch.id)); } catch (_) {}
    recordActivityDay();  // emek sayar: mühürlenen sefer günü seriye yazar
    try { window.wtLogRitus?.('sefer', 'tamam', { n: newDay }); } catch (_) {}

    if (status === 'completed') {
      /* Tören AYRI korunur: `showGraduation` (10b) `#grad-title`'a guard'sız
         yazıyor — o kabuk bir gün kalkarsa tören patlar ve buradaki state
         temizliği ile yeniden okuma da atlanırdı. Yolun kaydı törene bağlı
         olmamalı: mühür düştü, sefer kapandı; tören görünmediyse yalnız
         tören görünmemiştir. */
      try {
        if (isSeferBoss) {
          const boss = HASIM_BOSSES.find(b => b.id === ch.boss_id);
          showGraduation(boss?.name || ch.challenge_name || 'Yolculuk', t('lib.journey_complete', 'Yolculuk tamamlandı. Kalıp çözüldü.'));
        } else {
          const info = MemCache.get(challengeInfoKey(ch.challenge_id), () => SafeStorage.get(challengeInfoKey(ch.challenge_id)));
          showGraduation(info?.name || ch.challenge_name || 'Yolculuk', t('ui.challenge_completed_msg'));
        }
      } catch (e) { console.warn('sefer töreni:', e && e.message); }
      S._activeChallenge = null;
    } else {
      showToast(t('lib.day_sealed', 'Gün {n} mühürlendi.').replace('{n}', newDay));
    }
    await loadChallenges();
    return true;
  } catch (e) { showToast(t('toast.error') + e.message, true); return false; }
}
