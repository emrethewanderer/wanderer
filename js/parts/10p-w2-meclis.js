/* ═══════════════════════════════════════════════════════════════════
   10p — İÇ MECLİS · SURETLER 2.0 — "Gölgeyi tanı, kartı çevir"
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     "Hayattaki Sen" tek bir yüz değil — bir kadro. İçinde erteleyen,
     onay dileyen, kıyaslayan ayrı yüzler (Suretler) var. "Arkadaki Sen"
     (asıl sen) bu meclisin reisidir: yüzleri YARGILAMADAN tanır, onlara
     bir ad verir ve zamanla müttefike dönüştürür.

     Suret = ters çevrilmiş bir kart. Tek kartın iki yüzü var: gölge yüz
     (şu an seni yöneten parça) ve altın yüz (o parça dönüşünce olacağın
     madde — Olmak İstediğin Kişi'den beslenen ayna). Dönüşüm = kartın
     çevrilmesi. Meclis Salonu bu kartların divanıdır; Reis iki kutup —
     Olduğun Kişi (Portre) ve Olmak İstediğin Kişi (OİK) — arasında
     oturur. Zihniyet Böl.98: gölgeye bakarsın ama aynaya geçmek tek
     dokunuş (flip) uzaklıktadır — "bil ama odaklanma".

   SEZİŞ (çok kaynaklı, YENİ analiz motoru icat edilmez — bkz K6):
     Kaynak A: Yaşayan Portre (09e) kör nokta + çelişki → LLM'siz taslak.
     Kaynak B: Ayna Protokolü (09g) doğrulanmış hipotez → güçlü aday.
     Kaynak C: aylık invisible_face profili (13-extras) — YALNIZ A/B boşsa.
     Kaynak D: elle seziş ("bir yüz seziyorum").

   Suret = { slug, ad, unvan, koken_oruntu, dogus_ani, ses, niyet, korku,
             kor_nokta, zirh, kokler[], ayna, hal, engel_id, sahne,
             diyaloglar[], kaynak, oik_madde_id, named_at }
     hal: 'sezilen' (taslak) | 'adlandi' (tanındı, DB'de) | 'butunlesti' (dönüştü)

   Saklama: taslaklar (sezilen) yalnız local state (S._suretDrafts);
     yalnızca adlandırılan/dönüşen suretler `suretler` tablosuna yazılır.
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { sb } from '../config.js';
import { SafeStorage, escapeHTML, showToast, AnimUtils, localISODate } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { p } from './16-i18n-prompts.js';
import { callLLM } from './04-llm-hero-history.js';
import { awardElmas, getElmasSayisi } from './10g-w2-wanderer-game.js';
import { showGraduation } from './10b-w2-gamification.js';
import { generateInvisibleFaceProfile } from './13-extras.js';
import { ikvCardFace, ikvCardBack, ikvRing, ikvComposeBackdrop } from './12c-kart-gorsel.js';
import { ENGELLER } from './10h-w2-library-challenges.js';

const SIGILS = ['◆', '❖', '✶', '☽', '⟡', '✦', '◈', '⬡'];

function _slugify(s) {
  return String(s || '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9çğıöşü]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function _sigilFor(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return SIGILS[h % SIGILS.length];
}

function _dismissKey() { return `etw_meclis_dismissed_${S.currentUser?.id || 'anon'}`; }
function _dismissedSet() { return new Set(SafeStorage.get(_dismissKey()) || []); }
function _addDismissed(slug) {
  const set = _dismissedSet(); set.add(slug);
  SafeStorage.set(_dismissKey(), [...set]);
}

function _findSuret(slug) {
  return (S._suretler || []).find(x => x.slug === slug) || null;
}

/* ── Meydan Okuma — bağ ekonomisi ──────────────────────────────────── */
const BOND_YUZLESME    = 6;   // günlük "Fark Ediş" bağ kazancı
const BOND_SEFER_DAY   = 5;   // Yol günü mühürleme bağ kazancı
const ELMAS_YUZLESME   = 5;
const ELMAS_SEFER_DAY  = 3;
const ELMAS_SEFER_DONE = 25;
const SEFER_GUN_SAYISI = 21;

function _todayISO() {
  return localISODate();
}

/* ── Engel taksonomisi köprüsü (10m) — her surete daima bir engel ────
   LLM yok: metin taraması (.includes, TR \b-gotcha'sından kaçınır) +
   tohumlu düşüş — her zaman bir engel_id döner. */
const _ALL_ENGEL = [...ENGELLER.perde, ...ENGELLER.zehir, ...ENGELLER.tuzak];

function _engelById(id) { return _ALL_ENGEL.find(e => e.id === id) || null; }

export function resolveEngelId(texts, seed) {
  const norm = String((texts || []).join(' ')).toLocaleLowerCase('tr');
  let best = null, bestScore = 0;
  for (const e of _ALL_ENGEL) {
    let score = 0;
    if (e.theme && norm.includes(e.theme)) score += 2;
    if (score > bestScore) { bestScore = score; best = e; }
  }
  if (best) return best.id;
  let h = 0;
  const s = String(seed || 'meclis');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return _ALL_ENGEL[h % _ALL_ENGEL.length].id;
}

// Suret için erdem anahtarı — kok taksonomisinden (5 Temel) kum'un kendi
// erdem havuzuna (12d VIRTUE_POOLS) köprü; eşleşme yoksa yansıma (gölge-
// çalışmasına tematik en uygun jenerik havuz).
const _KOK_TO_VIRTUE = { oz_guven: 'ozguven', oz_deger: 'ozdeger', oz_sevgi: 'ozsevgi', oz_saygi: 'ozsaygi', bolluk: 'bolluk' };
function _virtueFor(s) {
  const k = (s.kokler || [])[0];
  return _KOK_TO_VIRTUE[k] || 'yansima';
}

/* ── 3 perdeli Yol (eski "Sefer", 21 gün) — gün 1-7 TANI / 8-14 KÖK /
   15-21 GEÇİŞ (#151 "izleme değil yaşama"). İçerik korunur — mevcut 21
   satırlık yay zaten bu 3 evreye uygun yazılmıştı; yalnız perde adı ve
   başlığı yüzeye çıkarılır. */
export function seferPerde(gun) {
  if (gun < 7) return 'tani';
  if (gun < 14) return 'kok';
  return 'gecis';
}
const PERDE_LABEL = {
  tr: { tani: 'TANI', kok: 'KÖK', gecis: 'GEÇİŞ' },
  en: { tani: 'NOTICE', kok: 'ROOT', gecis: 'CROSS' },
};

// Jenerik Suret Yolu — 21 günlük yay. {{ad}} = suret adı, {{ayna}} = dönüştüğü taraf.
// TR-hardcoded (10h SEFER_TASKS deseniyle tutarlı); EN fallback.
const SURET_SEFER_TASKS = {
  tr: [
    '{{ad}} bugün ortaya çıktığında hiçbir şey yapma — sadece onun konuştuğunu fark et.',
    '{{ad}}\'in sesini bir kez duy ve içinden adını söyle: "Bu {{ad}}."',
    '{{ad}} seni nereye ittiğini izle. Bir kez, sadece gözle.',
    'Bugün {{ad}} belirdiğinde dur ve sor: "Beni neden koruyorsun?"',
    '{{ad}}\'in korktuğu şeyi bir cümleyle yaz.',
    '{{ad}} konuştuğunda bir nefes al; seçimi ertelemeden fark et.',
    '{{ad}}\'e içinden teşekkür et — bir zamanlar işine yaradı.',
    'Bugün {{ad}}\'in dediğinin TERSİNİ küçük bir adımda bir kez seç.',
    '{{ad}} "yapma" dediğinde, ardında küçük bir "yaptım" bırak.',
    'Bir anlığına {{ayna}} gibi davran. Nasıl hissettirdi?',
    '{{ad}}\'in zırhını fark et: bahane mi, erteleme mi, kaçış mı?',
    'Bugün o zırhı bir kez indir — savunmadan kal.',
    '{{ayna}} bugün senin yerinde olsa ne yapardı? O adımı at.',
    'Sabah {{ayna}} niyetini söyle; akşam tuttun mu bak.',
    '{{ad}} belirdiğinde artık tanıyorsun. Tanıdığın şey seni daha az yönetir.',
    'Bugün {{ayna}} olarak bir karar ver — küçük olsun, gerçek olsun.',
    '{{ad}}\'e söyle: "Seni görüyorum, ama bugün ben seçiyorum."',
    'Bir günlük {{ayna}} ol. Akşam ne değişti, yaz.',
    '{{ad}} ile {{ayna}} arasındaki mesafeyi hisset — ne kadar yol aldın?',
    'Bugün {{ad}} sustuğunda fark et: o senin bir parçan, düşmanın değil.',
    'Yolu mühürle. {{ad}} artık {{ayna}}\'e dönüşmeye hazır.',
  ],
  en: [
    'When {{ad}} surfaces today, do nothing — just notice that it spoke.',
    'Hear {{ad}}\'s voice once and name it inwardly: "This is {{ad}}."',
    'Watch where {{ad}} pushes you. Once, just observe.',
    'When {{ad}} appears today, pause and ask: "Why do you protect me?"',
    'Write in one sentence what {{ad}} is afraid of.',
    'When {{ad}} speaks, take a breath; notice the choice before acting.',
    'Thank {{ad}} inwardly — it once served you.',
    'Today choose the OPPOSITE of what {{ad}} says, in one small step.',
    'When {{ad}} says "don\'t", leave a small "I did" behind you.',
    'For a moment, act like {{ayna}}. How did it feel?',
    'Notice {{ad}}\'s armor: is it excuses, delay, or escape?',
    'Lower that armor once today — stay undefended.',
    'What would {{ayna}} do in your place today? Take that step.',
    'Speak {{ayna}}\'s intention in the morning; check at night if you held it.',
    'When {{ad}} appears you now know it. What you know rules you less.',
    'Make one decision as {{ayna}} today — small, but real.',
    'Tell {{ad}}: "I see you, but today I choose."',
    'Be {{ayna}} for one day. Write what changed by evening.',
    'Feel the distance between {{ad}} and {{ayna}} — how far have you come?',
    'When {{ad}} falls silent today, notice: it is a part of you, not your enemy.',
    'Seal the path. {{ad}} is ready to become {{ayna}}.',
  ],
};

function _seferLang() { return (S._currentLang || 'tr').startsWith('en') ? 'en' : 'tr'; }

// AYNA = "olmak istediğin kişi". Önce suretin kendi aynası, yoksa OİK'in
// tek kaynağına hizalanır (K3), o da yoksa nazik jenerik düşüş.
export function _aynaName(s) {
  if (s.ayna) return s.ayna;
  try {
    const oik = window.oikGetDesired?.();
    if (oik?.name) return oik.name;
  } catch (_) {}
  return _seferLang() === 'en' ? 'who you want to be' : 'olmak istediğin kişi';
}

// Perdeye göre üçlü: TANI = yalnız fark et (eyleme geçme); KÖK = suretin
// KENDİ niyet/korku/zırhından türeyen kök-sorgu (dinamik, LLM'siz); GEÇİŞ =
// aynaya geç (mevcut Sor→Hayal et→Olumla motoru, #151 "yaşama, izleme").
function _triadFor(s, perde) {
  const lang = _seferLang();
  const ayna = _aynaName(s);
  const ad = s.ad || s.unvan || '';
  if (perde === 'tani') {
    return lang === 'en' ? [
      { k: 'Notice', text: `Just notice when ${ad} speaks today. Nothing more.` },
      { k: 'Name',   text: `Name it inwardly: "This is ${ad}."` },
      { k: 'Watch',  text: `Watch where it wants to take you. Only observe.` },
    ] : [
      { k: 'Fark et', text: `Bugün ${ad} konuştuğunda sadece fark et. Başka bir şey yapma.` },
      { k: 'Adlandır', text: `İçinden söyle: "Bu ${ad}."` },
      { k: 'İzle', text: `Seni nereye çekmek istediğini izle. Sadece gözle.` },
    ];
  }
  if (perde === 'kok') {
    const niyet = s.niyet || (lang === 'en' ? 'protect you' : 'seni korumak');
    const korku = s.korku || (lang === 'en' ? 'something it fears' : 'bir şeyden kaçmak');
    const zirh  = s.zirh  || (lang === 'en' ? 'its armor' : 'bir bahane');
    return lang === 'en' ? [
      { k: 'Ask',   text: `Why does ${ad} ${niyet}? Ask once, without judging.` },
      { k: 'See',   text: `What does it fear? "${korku}." Sit with it a moment.` },
      { k: 'Lower', text: `Notice its armor — ${zirh} — and lower it once today.` },
    ] : [
      { k: 'Sor',   text: `${ad} neden "${niyet}" ister? Yargılamadan bir kez sor.` },
      { k: 'Gör',   text: `Neden kaçıyor? "${korku}." Bir an bununla otur.` },
      { k: 'İndir', text: `Zırhını fark et — ${zirh} — ve bugün bir kez indir.` },
    ];
  }
  // gecis
  return lang === 'en' ? [
    { k: 'Ask',     text: `What would ${ayna} do right now? Ask yourself once.` },
    { k: 'Imagine', text: `Close your eyes — be ${ayna} for a moment. How do you stand, how do you breathe?` },
    { k: 'Affirm',  text: `Say inwardly: "I am ${ayna}. Today I choose it."` },
  ] : [
    { k: 'Sor',      text: `${ayna} olsa şimdi ne yapardı? İçinden bir kez sor.` },
    { k: 'Hayal et', text: `Gözünü kapat — bir an ${ayna} ol. Nasıl duruyorsun, nasıl nefes alıyorsun?` },
    { k: 'Olumla',   text: `İçinden söyle: "Ben ${ayna} biriyim. Bugün öyle seçiyorum."` },
  ];
}

function _seferTriadHTML(s) {
  const gun = s.sefer_gun || 0;
  const perde = seferPerde(gun);
  const label = (PERDE_LABEL[_seferLang()] || PERDE_LABEL.tr)[perde];
  const rows = _triadFor(s, perde).map(x => `
    <div class="meclis-triad-row">
      <span class="meclis-triad-k">${escapeHTML(x.k)}</span>
      <span class="meclis-triad-text">${escapeHTML(x.text)}</span>
    </div>`).join('');
  const engel = s.engel_id ? _engelById(s.engel_id) : null;
  const panzehir = engel ? `
    <div class="meclis-engel-line">
      <span class="meclis-engel-label">${escapeHTML(t('meclis.engel_label', 'Panzehir'))} · ${escapeHTML(engel.name)}</span>
      <span class="meclis-engel-panzehir">${escapeHTML(engel.panzehir)}</span>
      <button class="meclis-engel-link" onclick="window.engOpen&&window.engOpen()">${escapeHTML(t('meclis.engel_link', 'Engel Atlası →'))}</button>
    </div>` : '';
  return `
    <div class="meclis-triad">
      <div class="meclis-triad-head"><span class="meclis-perde-badge">${escapeHTML(label)}</span> ${escapeHTML(t('meclis.triad_head', 'Bugünün pratiği'))}</div>
      ${rows}
      ${panzehir}
    </div>`;
}

// Bir sonraki mühürlenecek günün görevi (sefer_gun = mühürlenmiş gün sayısı, 0..21)
function _seferTaskFor(s) {
  const arr = SURET_SEFER_TASKS[_seferLang()] || SURET_SEFER_TASKS.tr;
  const idx = Math.min(SEFER_GUN_SAYISI - 1, Math.max(0, s.sefer_gun || 0));
  return (arr[idx] || '')
    .replace(/\{\{ad\}\}/g, s.ad || s.unvan || '')
    .replace(/\{\{ayna\}\}/g, _aynaName(s));
}

function _seferActive(s) { return !!s.sefer_baslangic && (s.sefer_gun || 0) < SEFER_GUN_SAYISI; }
function _seferDone(s)   { return (s.sefer_gun || 0) >= SEFER_GUN_SAYISI; }

/* ── 42703-güvenli yazma (031/10D _oikSahneColOk kalıbı) ──────────────
   `suretler` tablosu mig 035 koşmadan da çalışsın: yeni alanlar (sahne/
   engel_id/diyaloglar/kaynak/oik_madde_id) undefined_column hatası
   verirse bir kez atılıp yeniden denenir; bayrak sonraki yazımları
   önceden temizler. */
const _EVRIM_COLS = ['sahne', 'engel_id', 'diyaloglar', 'kaynak', 'oik_madde_id'];
let _meclisEvrimColsOk = true;

function _stripEvrimCols(payload) {
  const out = { ...payload };
  for (const k of _EVRIM_COLS) delete out[k];
  return out;
}

async function _suretUpdate(slug, patch) {
  if (!S.currentUser) return;
  const body = _meclisEvrimColsOk ? patch : _stripEvrimCols(patch);
  const { error } = await sb.from('suretler').update(body).eq('user_id', S.currentUser.id).eq('slug', slug);
  if (error?.code === '42703') {
    _meclisEvrimColsOk = false;
    const stripped = _stripEvrimCols(patch);
    if (Object.keys(stripped).length) {
      await sb.from('suretler').update(stripped).eq('user_id', S.currentUser.id).eq('slug', slug);
    }
  }
}

async function _suretUpsert(payload) {
  const body = _meclisEvrimColsOk ? payload : _stripEvrimCols(payload);
  const { error } = await sb.from('suretler').upsert(body, { onConflict: 'user_id,slug' });
  if (error?.code === '42703') {
    _meclisEvrimColsOk = false;
    await sb.from('suretler').upsert(_stripEvrimCols(payload), { onConflict: 'user_id,slug' });
    return;
  }
  if (error) throw error;
}

// Suret satırını hem local hem DB'de günceller.
async function _persistSuret(s, patch) {
  Object.assign(s, patch);
  try { await _suretUpdate(s.slug, patch); } catch (_) { /* offline/RLS — local güncel kalır */ }
}

function _bondMeterHTML(bag) {
  const pct = Math.max(0, Math.min(100, bag || 0));
  return `<div class="meclis-bond"><div class="meclis-bond-fill" style="width:${pct}%"></div></div>`;
}

/* ── Diyalog + Bütünleşme ──────────────────────────────────────────── */
const BOND_DIALOG    = 4;    // günlük ilk diyaloğun bağ kazancı
const ELMAS_DIALOG   = 2;
const ELMAS_BUTUNLES = 50;   // bütünleşme büyük ödülü
const DIALOG_LOG_CAP = 10;

const KOK_LABEL = {
  tr: { oz_sevgi: 'Öz Sevgi', oz_saygi: 'Öz Saygı', oz_deger: 'Öz Değer', oz_guven: 'Öz Güven',
        bolluk: 'Bolluk Bilinci', standart: 'Standart', hak_etmek: 'Hak Etmek', normal: 'Normal', layik: 'Layık' },
  en: { oz_sevgi: 'Self-Love', oz_saygi: 'Self-Respect', oz_deger: 'Self-Worth', oz_guven: 'Self-Confidence',
        bolluk: 'Abundance', standart: 'Standard', hak_etmek: 'Deserving', normal: 'Normal', layik: 'Worthy' },
};
function _kokLabels(s) {
  const m = KOK_LABEL[_seferLang()] || KOK_LABEL.tr;
  return (s.kokler || []).map(k => m[k] || k);
}

/* ── Bütünlük Skoru + Meclis Salonu (reis) başlığı ─────────────────── */
const BOND_KANIT  = 5;
const ELMAS_KANIT = 4;

function _suretProgress(s) {
  if (s.hal === 'butunlesti') return 100;
  if (s.hal === 'adlandi')    return Math.max(0, Math.min(100, s.bag_seviyesi || 0));
  return 0;
}

// Meclisin geneli — yalnızca tanınmış (adlandı + bütünleşti) yüzlerin ortalaması.
export function computeButunluk(suretler) {
  const taninan = (suretler || []).filter(s => s.hal === 'adlandi' || s.hal === 'butunlesti');
  if (!taninan.length) return 0;
  return Math.round(taninan.reduce((a, s) => a + _suretProgress(s), 0) / taninan.length);
}

function _elmasSafe() { try { return getElmasSayisi(); } catch (_) { return 0; } }

// Salon, bütünlük yükseldikçe boş divandan altın meclise evrilir.
function _hallPhrase(pct, hasAny) {
  if (!hasAny) return t('meclis.hall_0', 'Divan henüz sessiz. Yüzlerini tanı.');
  if (pct >= 100) return t('meclis.hall_100', 'Meclisin bütünleşti. Reis sensin.');
  if (pct >= 67)  return t('meclis.hall_67', 'Meclisin neredeyse bütün.');
  if (pct >= 34)  return t('meclis.hall_34', 'Suretlerin seni dinlemeye başladı.');
  if (pct >= 1)   return t('meclis.hall_1', 'Meclisin uyanıyor.');
  return t('meclis.hall_0b', 'Tanıdığın yüzler tahtının etrafında bekliyor.');
}

/* ── Divan'ın iki kutbu — Olduğun Kişi (Portre) ↔ Olmak İstediğin
   Kişi (OİK). Meclis kendi kart render mantığını icat etmez: iki mevcut
   sisteme (02c/10D) bir pencere açar; tıklanınca oraya götürür. */
function _divanPolesHTML() {
  let goldName = '';
  try { goldName = window.porCardName?.() || ''; } catch (_) {}
  let lapisName = '';
  try { lapisName = window.oikGetDesired?.()?.name || ''; } catch (_) {}
  if (!goldName && !lapisName) return '';
  return `
    <div class="meclis-divan-poles">
      <button class="meclis-pole meclis-pole--gold" onclick="window.switchView&&window.switchView('portre')">
        <span class="meclis-pole-kicker">${escapeHTML(t('meclis.pole_gold', 'OLDUĞUN KİŞİ'))}</span>
        <span class="meclis-pole-name serif">${escapeHTML(goldName || '—')}</span>
      </button>
      <span class="meclis-pole-bridge">⟷</span>
      <button class="meclis-pole meclis-pole--lapis" onclick="window.switchView&&window.switchView('oik')">
        <span class="meclis-pole-kicker">${escapeHTML(t('meclis.pole_lapis', 'OLMAK İSTEDİĞİN KİŞİ'))}</span>
        <span class="meclis-pole-name serif">${escapeHTML(lapisName || '—')}</span>
      </button>
    </div>
    <div class="meclis-divan-poles-sub">${escapeHTML(t('meclis.poles_sub', 'Meclis, iki kart arasındaki yolda toplanır.'))}</div>`;
}

// Kart-entity köprüsü: suret satırını ikvCardFace/ikvCardBack için bir
// "kart" nesnesine çevirir. `face`: 'golge' (şu anki, koyu/lapis-sis) |
// 'altin' (dönüşünce olacağı, altın). sahne kumEnsureSpec ile ensure edilir
// (varsa DB'ye persist edilir — yalnız DB'de satırı olan adlanmış suretler).
function _suretToCard(s, face) {
  const texts = [s.unvan, s.koken_oruntu, s.kor_nokta, s.korku, s.niyet].filter(Boolean);
  const entity = { id: 'suret-' + s.slug, sahne: s.sahne };
  try {
    window.kumEnsureSpec?.(entity, {
      virtue: _virtueFor(s), texts,
      persist: (spec) => { s.sahne = spec; if (s.hal !== 'sezilen') { _persistSuret(s, { sahne: spec }).catch(() => {}); } },
    });
  } catch (_) {}
  if (entity.sahne) s.sahne = entity.sahne;
  if (face === 'altin') {
    return { id: entity.id + '-altin', name: _aynaName(s), whisper: t('meclis.now_label', 'artık'), virtue: _virtueFor(s), sahne: entity.sahne };
  }
  return { id: entity.id, name: s.ad || s.unvan || '', whisper: s.unvan && s.ad ? s.unvan : '', virtue: _virtueFor(s), sahne: entity.sahne };
}

// Epik Meclis Salonu — halka (ikvRing) + iki kutup + oturan suret madalyonları
// (gerçek mini kartlar). Vurgu DÖNÜŞMÜŞ (altın) müttefiklerde; sezilen
// gölgeler sönük/kenarda ("bil ama odaklanma" — Bölüm 98).
function _meclisHallHTML(suretler) {
  const pct = computeButunluk(suretler);
  const taninan  = suretler.filter(s => s.hal === 'adlandi' || s.hal === 'butunlesti').length;
  const muttefik = suretler.filter(s => s.hal === 'butunlesti').length;

  const order = { butunlesti: 0, adlandi: 1, sezilen: 2 };
  const seated = suretler.slice().sort((a, b) => (order[a.hal] ?? 3) - (order[b.hal] ?? 3));
  const seats = seated.map((s, i) => {
    const cls = s.hal === 'butunlesti' ? 'is-donus' : (s.hal === 'adlandi' ? 'is-named' : 'is-sensed');
    let inner;
    if (s.hal === 'sezilen') {
      inner = ikvCardBack({ mini: true });
    } else {
      const card = _suretToCard(s, s.hal === 'butunlesti' ? 'altin' : 'golge');
      inner = ikvCardFace(card, { palette: s.hal === 'butunlesti' ? 'gold' : 'lapis', mini: true, sahne: card.sahne });
    }
    return `<button class="meclis-seat ${cls}" style="--i:${Math.min(i, 24)}" title="${escapeHTML(s.hal === 'sezilen' ? t('meclis.unknown', 'Sezilen yüz') : (s.ad || s.unvan || ''))}" onclick="openSuretCard('${escapeHTML(s.slug)}')">${inner}</button>`;
  }).join('');

  return `
    <div class="meclis-divan ikv-panel ${pct >= 100 ? 'is-whole' : ''}">
      ${ikvRing(pct, { size: 76, yol: true, center: '<span class="meclis-divan-sun">☉</span>', cls: 'meclis-divan-ring' })}
      <div class="meclis-divan-reis">${escapeHTML(t('meclis.reis', 'SEN'))}</div>
      <div class="meclis-divan-reis-sub">${escapeHTML(t('meclis.reis_sub', 'Arkadaki Sen · Reis'))}</div>
      ${_divanPolesHTML()}
      ${seated.length ? `<div class="meclis-divan-seats ikv-cascade">${seats}</div>` : ''}
      <div class="meclis-divan-phrase">${escapeHTML(_hallPhrase(pct, taninan > 0))}</div>
      <div class="meclis-divan-stat">${muttefik} / ${taninan} ${escapeHTML(t('meclis.allies', 'müttefik'))}</div>
      <button class="meclis-derinlik-link" onclick="meclisOpenDerinlik()">${escapeHTML(t('meclis.depth_mirror', 'Derinlik Aynası'))} →</button>
    </div>`;
}

/* ── Derinlik Aynası (döngü kapanışı) — DEĞİŞMEDİ ─────────────────── */
const ELMAS_REMEASURE = 20;
const DEPTH_KEYS = ['standart', 'hak_etmek', 'normal', 'layik'];
const REMEASURE_MIN_DAYS = 21;

export function parseDepthLevel(val) {
  const v = String(val || '').toLowerCase().trim();
  if (v.startsWith('güçlü') || v.startsWith('guclu') || v.startsWith('strong')) return 2;
  if (v.startsWith('orta')  || v.startsWith('moderate')) return 1;
  if (v.startsWith('zayıf') || v.startsWith('zayif') || v.startsWith('weak')) return 0;
  return -1;
}

export function computeDepthDeltas(baseline, latest) {
  const b = baseline?.derinlik_haritasi || {};
  const l = latest?.derinlik_haritasi || {};
  return DEPTH_KEYS.map(k => {
    const from = parseDepthLevel(b[k]);
    const to   = parseDepthLevel(l[k]);
    let dir = 'unknown';
    if (from >= 0 && to >= 0) dir = to > from ? 'up' : (to < from ? 'down' : 'flat');
    return { key: k, from, to, dir };
  });
}

export function canRemeasure(record, suretler) {
  if (!record?.baseline_at) return false;
  const days = (Date.now() - new Date(record.baseline_at).getTime()) / 86400000;
  const integrated = (suretler || []).some(s => s.hal === 'butunlesti');
  return days >= REMEASURE_MIN_DAYS || integrated;
}

export async function getDerinlikRecord() {
  try {
    if (!S.currentUser) return null;
    const { data } = await sb.from('meclis_derinlik').select('*').eq('user_id', S.currentUser.id);
    return (data && data[0]) || null;
  } catch (_) { return null; }
}

async function ensureBaseline() {
  let rec = await getDerinlikRecord();
  S._meclisDerinlik = rec;
  if (rec?.baseline_at) return rec;
  const prof = S._meclisProfile;
  if (!prof?.derinlik_haritasi || !S.currentUser) return rec;
  const payload = {
    user_id: S.currentUser.id,
    baseline: { derinlik_haritasi: prof.derinlik_haritasi, zayif_temeller: prof.zayif_temeller || [] },
    baseline_at: new Date().toISOString(),
  };
  try { await sb.from('meclis_derinlik').upsert(payload, { onConflict: 'user_id' }); } catch (_) {}
  S._meclisDerinlik = payload;
  return payload;
}

const _DEPTH_LABEL = {
  tr: { standart: 'Standart', hak_etmek: 'Hak Etmek', normal: 'Normal', layik: 'Layık' },
  en: { standart: 'Standard', hak_etmek: 'Deserving', normal: 'Normal', layik: 'Worthy' },
};
const _LEVEL_WORD = {
  tr: ['Zayıf', 'Orta', 'Güçlü'],
  en: ['Weak', 'Moderate', 'Strong'],
};
function _levelWord(n) {
  if (n < 0) return '—';
  return (_LEVEL_WORD[_seferLang()] || _LEVEL_WORD.tr)[n] || '—';
}

export function meclisOpenDerinlik() {
  const rec = S._meclisDerinlik;
  const suretler = S._suretler || [];
  const baseline = rec?.baseline, latest = rec?.latest;
  const deltas = (baseline && latest) ? computeDepthDeltas(baseline, latest) : null;
  const dLabel = _DEPTH_LABEL[_seferLang()] || _DEPTH_LABEL.tr;
  const arrow = { up: '↑', down: '↓', flat: '→', unknown: '·' };

  let body;
  if (!baseline) {
    body = `<div class="meclis-derinlik-empty">${escapeHTML(t('meclis.depth_none', 'Derinlik haritan henüz oluşmadı. Birkaç gün Emre ile konuş.'))}</div>`;
  } else if (!latest) {
    const rows = DEPTH_KEYS.map(k =>
      `<div class="meclis-derinlik-row"><span>${escapeHTML(dLabel[k])}</span><span class="meclis-derinlik-now">${escapeHTML(_levelWord(parseDepthLevel(baseline.derinlik_haritasi?.[k])))}</span></div>`
    ).join('');
    body = `
      <div class="meclis-derinlik-caption">${escapeHTML(t('meclis.depth_baseline', 'Başlangıç haritan'))}</div>
      ${rows}`;
  } else {
    const rows = deltas.map(d =>
      `<div class="meclis-derinlik-row meclis-dir-${d.dir}">
        <span>${escapeHTML(dLabel[d.key])}</span>
        <span class="meclis-derinlik-shift">${escapeHTML(_levelWord(d.from))} <em>${arrow[d.dir]}</em> ${escapeHTML(_levelWord(d.to))}</span>
      </div>`
    ).join('');
    const ups = deltas.filter(d => d.dir === 'up').length;
    body = `
      <div class="meclis-derinlik-caption">${escapeHTML(t('meclis.depth_shift_caption', 'Başlangıç → Şimdi'))}</div>
      ${rows}
      ${ups ? `<div class="meclis-derinlik-win">✦ ${ups} ${escapeHTML(t('meclis.depth_rose', 'derinlik yükseldi'))}</div>` : ''}`;
  }

  const allowed = canRemeasure(rec, suretler);
  const remeasureBtn = allowed
    ? `<button class="btn-gold" onclick="meclisRemeasure()">${escapeHTML(t('meclis.remeasure_cta', 'Derinliğini yeniden ölç'))}</button>`
    : (baseline ? `<div class="meclis-derinlik-locked">${escapeHTML(t('meclis.remeasure_locked', 'Bir suret bütünleştir ya da 21 gün geç — sonra yeniden ölçebilirsin.'))}</div>` : '');

  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.id = 'meclis-derinlik-overlay';
  overlay.style.setProperty('z-index', 'var(--z-meclis-derinlik)');
  overlay.innerHTML = `
    <div class="modal meclis-modal" style="max-width:420px;">
      <div class="meclis-modal-sigil">⊹</div>
      <div class="meclis-modal-title serif">${escapeHTML(t('meclis.depth_mirror', 'Derinlik Aynası'))}</div>
      <div class="meclis-modal-unvan">${escapeHTML(t('meclis.depth_sub', '4 Derinlik — ne kadar yol aldın'))}</div>
      <div class="meclis-derinlik-body">${body}</div>
      <div class="meclis-modal-actions">
        ${remeasureBtn}
        <button class="meclis-dismiss" onclick="this.closest('.overlay').remove()">${escapeHTML(t('weekly.ok', 'Tamam'))}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

export async function meclisRemeasure() {
  if (!S.currentUser) return;
  showToast(t('meclis.remeasure_running', 'Derinliğin yeniden ölçülüyor…'));
  let prof = null;
  try { prof = await generateInvisibleFaceProfile(true); } catch (_) { prof = null; }
  if (!prof?.derinlik_haritasi) { showToast(t('meclis.remeasure_nodata', 'Yeterli veri yok.'), true); return; }

  const latest = { derinlik_haritasi: prof.derinlik_haritasi, zayif_temeller: prof.zayif_temeller || [] };
  const rec = S._meclisDerinlik || await getDerinlikRecord();
  const now = new Date().toISOString();
  const payload = {
    user_id: S.currentUser.id,
    baseline: rec?.baseline || latest,
    baseline_at: rec?.baseline_at || now,
    latest,
    latest_at: now,
  };
  try { await sb.from('meclis_derinlik').upsert(payload, { onConflict: 'user_id' }); } catch (_) {}
  S._meclisDerinlik = payload;
  awardElmas(ELMAS_REMEASURE, 'Derinlik yeniden ölçüldü');
  document.getElementById('meclis-derinlik-overlay')?.remove();
  meclisOpenDerinlik();
}

/* ── Çok kaynaklı seziş — Kişiselleştirme 3.0 üzerine kurulu ─────────
   YENİ analiz motoru İCAT EDİLMEZ: 09e/09g zaten günlük/haftalık damıtma
   yapıyor; Meclis yalnız TÜKETİCİ. Öncelik: yp kör nokta/çelişki → ap
   doğrulanmış hipotez ile zenginleştirme → hiçbiri yoksa legacy aylık
   profil (yalnız fallback) → elle seziş ayrı bir CTA'dır (bkz aşağıda). */
function _draftBase(slug, over) {
  return {
    slug, ad: '', unvan: '', koken_oruntu: '', dogus_ani: '', ses: '',
    niyet: '', korku: '', kor_nokta: '', zirh: '', kokler: [], ayna: '',
    hal: 'sezilen', kaynak: 'profil', engel_id: null, sahne: null,
    ...over,
  };
}

function _draftsFromYp(dismissed, seen) {
  const drafts = [];
  let yp = null;
  try { yp = window.ypGetFullState?.(); } catch (_) { yp = null; }
  if (!yp) return drafts;

  for (const k of (yp.kor_noktalar || [])) {
    const metin = String(k?.metin || '').trim();
    if (!metin) continue;
    const slug = _slugify(metin.split(' ').slice(0, 4).join(' '));
    if (!slug || seen.has(slug) || dismissed.has(slug)) continue;
    seen.add(slug);
    drafts.push(_draftBase(slug, {
      unvan: metin.length > 60 ? metin.slice(0, 57) + '…' : metin,
      kor_nokta: metin,
      /* KOKEN-MUAF: kanıt 09e portresinden okunur ve orada kesin alıntı
         kapısından geçmiştir (kokenAlintiCoz) — burada ikinci kez ölçülmez.
         Kör nokta 2026-08-02'den beri kanıt taşıyor; çelişkideki gibi
         buraya da geçirilir ki suretin dayanağı kullanıcının kendi cümlesi
         olsun, motorun adlandırması değil. */
      koken_oruntu: String(k?.kanit || ''),
      kaynak: 'yp',
      engel_id: resolveEngelId([metin, k?.kanit], slug),
    }));
  }
  for (const c of (yp.celiskiler || [])) {
    const metin = String(c?.metin || '').trim();
    if (!metin) continue;
    const slug = _slugify(metin.split(' ').slice(0, 4).join(' '));
    if (!slug || seen.has(slug) || dismissed.has(slug)) continue;
    seen.add(slug);
    drafts.push(_draftBase(slug, {
      unvan: metin.length > 60 ? metin.slice(0, 57) + '…' : metin,
      /* KOKEN-MUAF: kanıt 09e portresinden okunur ve orada KESİN alıntı
         kapısından geçmiştir (kokenAlintiCoz) — burada ikinci kez ölçülmez */
      koken_oruntu: String(c?.kanit || ''),
      kaynak: 'yp',
      engel_id: resolveEngelId([metin, c?.kanit], slug),
    }));
  }
  return drafts;
}

// Ayna Protokolü'nün DOĞRULANMIŞ hipotezleri — Meclis'in kendi "Tanı &
// Adlandır" ritüelini ATLAMAZ (hal hâlâ 'sezilen' kalır, kullanıcı yine
// adlandırma töreninden geçer); yalnız güçlü/öne-çıkan aday işaretlenir.
function _draftsFromAp(dismissed, seen, existingDrafts) {
  const drafts = [];
  let hips = [];
  try { hips = window.ypGetHipotezler?.() || []; } catch (_) { hips = []; }
  for (const h of hips) {
    if (h?.durum !== 'dogrulandi') continue;
    const metin = String(h?.metin || '').trim();
    if (!metin) continue;
    const slug = _slugify(metin.split(' ').slice(0, 4).join(' '));
    if (!slug || dismissed.has(slug)) continue;
    const already = existingDrafts.find(d => d.slug === slug);
    if (already) { already.kaynak = 'ap'; already.ap_confirmed = true; continue; }
    if (seen.has(slug)) continue;
    seen.add(slug);
    drafts.push(_draftBase(slug, {
      unvan: metin.length > 60 ? metin.slice(0, 57) + '…' : metin,
      kor_nokta: metin,
      kaynak: 'ap', ap_confirmed: true,
      engel_id: resolveEngelId([metin], slug),
    }));
  }
  return drafts;
}

/* ── AI taslaklarını hazırla (yp/ap birincil; profil YALNIZ fallback) ─ */
export async function ensureSuretDrafts() {
  const dismissed = _dismissedSet();
  const seen = new Set();

  const fromYp = _draftsFromYp(dismissed, seen);
  const fromAp = _draftsFromAp(dismissed, seen, fromYp);
  let drafts = [...fromYp, ...fromAp];

  if (!drafts.length) {
    let profile = null;
    try { profile = await generateInvisibleFaceProfile(); } catch (_) { profile = null; }
    S._meclisProfile = profile || null;
    const raw = Array.isArray(profile?.suretler) ? profile.suretler : [];
    for (const s of raw) {
      const slug = _slugify(s.slug || s.unvan || '');
      if (!slug || seen.has(slug) || dismissed.has(slug)) continue;
      seen.add(slug);
      drafts.push(_draftBase(slug, {
        unvan: s.unvan || '',
        koken_oruntu: s.koken_oruntu || '',
        dogus_ani: s.dogus_ani || '',
        ses: s.ses || '',
        niyet: s.niyet || '',
        korku: s.korku || '',
        kor_nokta: s.kor_nokta || '',
        zirh: s.zirh || '',
        kokler: Array.isArray(s.kokler) ? s.kokler : [],
        ayna: s.ayna || '',
        kaynak: 'profil',
        engel_id: resolveEngelId([s.unvan, s.koken_oruntu, s.kor_nokta, s.korku], slug),
      }));
    }
  }

  S._suretDrafts = drafts;
  return drafts;
}

/* ── Elle seziş — "bir yüz seziyorum" (Kaynak D) ─────────────────────
   Kullanıcının kısa tarifi → LLM anatomiyi doldurur; LLM yoksa/hata:
   tarif doğrudan unvan olur, anatomi boş kalır — yine adlandırılabilir. */
export function meclisOpenElleSezis() {
  document.getElementById('meclis-elle-overlay')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.id = 'meclis-elle-overlay';
  overlay.style.setProperty('z-index', 'var(--z-meclis-panel)');
  overlay.innerHTML = `
    <div class="modal meclis-elle" style="max-width:420px;">
      <div class="meclis-naming-sigil">◇</div>
      <div class="meclis-naming-title serif">${escapeHTML(t('meclis.elle_title', 'Bir yüz seziyorum'))}</div>
      <div class="meclis-naming-hint">${escapeHTML(t('meclis.elle_hint', 'İçinde fark ettiğin bir parçayı kısaca anlat — Meclis onu dinleyip bir taslak çıkarır.'))}</div>
      <textarea id="meclis-elle-input" class="meclis-input meclis-elle-textarea" maxlength="240" rows="3"
        placeholder="${escapeHTML(t('meclis.elle_placeholder', 'Örn. hep başkalarını memnun etmeye çalışan bir yanım var…'))}"></textarea>
      <div class="meclis-modal-actions">
        <button class="btn-gold" onclick="meclisSaveElleSezis()">${escapeHTML(t('meclis.elle_cta', 'Meclise getir'))}</button>
        <button class="meclis-dismiss" onclick="this.closest('.overlay').remove();window.wtOverlayClose&&window.wtOverlayClose('meclis-elle-sezis')">${escapeHTML(t('weekly.cancel', 'Vazgeç'))}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#meclis-elle-input')?.focus();
  try { window.wtOverlayOpen?.('meclis-elle-sezis'); } catch (_) {}
}

export async function meclisSaveElleSezis() {
  const input = document.getElementById('meclis-elle-input');
  const text = (input?.value || '').trim().slice(0, 240);
  if (!text) { showToast(t('meclis.elle_required', 'Kısaca anlat.'), true); return; }

  const slug = _slugify(text.split(' ').slice(0, 4).join(' ')) || `elle-${Date.now()}`;
  const dismissed = _dismissedSet();
  if (dismissed.has(slug)) { showToast(t('meclis.elle_dismissed', 'Bunu daha önce reddetmiştin.'), true); return; }

  let anatomy = null;
  try {
    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: p('prompt.meclis.sense', { tarif: text }) }] }],
      systemPrompt: '', maxTokens: 260, temperature: 0.5, jsonMode: true, skipPersona: true,
    });
    anatomy = JSON.parse(raw);
  } catch (_) { anatomy = null; }

  const draft = _draftBase(slug, {
    unvan: anatomy?.unvan || (text.length > 60 ? text.slice(0, 57) + '…' : text),
    koken_oruntu: anatomy?.koken_oruntu || '',
    ses: anatomy?.ses || '',
    niyet: anatomy?.niyet || '',
    korku: anatomy?.korku || '',
    kor_nokta: text,
    zirh: anatomy?.zirh || '',
    kaynak: 'elle',
    engel_id: resolveEngelId([text, anatomy?.unvan, anatomy?.koken_oruntu], slug),
  });

  S._suretDrafts = (S._suretDrafts || []).filter(d => d.slug !== slug).concat([draft]);
  const namedSlugs = new Set((S._suretler || []).filter(s => s.hal !== 'sezilen' || s.slug !== slug).map(s => s.slug));
  if (!namedSlugs.has(slug)) S._suretler = [...(S._suretler || []).filter(s => s.slug !== slug), draft];

  document.getElementById('meclis-elle-overlay')?.remove();
  try { window.wtOverlayClose?.('meclis-elle-sezis'); } catch (_) {}
  showToast(t('meclis.elle_toast', 'Meclise getirdin. Şimdi tanıyıp adlandırabilirsin.'));
  renderMeclisSalonu();
  openSuretCard(slug);
}

/* ── DB'deki adlanmış + cache'teki sezilen suretleri birleştir ─────── */
export async function getSuretler() {
  let named = [];
  try {
    if (S.currentUser) {
      const { data } = await sb.from('suretler').select('*').eq('user_id', S.currentUser.id);
      named = (data || []).map(r => ({ ...r, kokler: r.kokler || [], diyaloglar: r.diyaloglar || [] }));
    }
  } catch (_) { named = []; }

  const namedSlugs = new Set(named.map(n => n.slug));
  const dismissed = _dismissedSet();
  const drafts = (S._suretDrafts || []).filter(d => !namedSlugs.has(d.slug) && !dismissed.has(d.slug));

  const merged = [...named, ...drafts];
  S._suretler = merged;
  // Bugün STÜDYO İç Meclis sayacı — suretler asenkron hidrate olur, o an
  // loadBugunView çoktan koşmuş olabilir; taze veriyle eşle (TDZ-güvenli window).
  try { window.wsSyncStudio?.(); } catch (_) {}
  return merged;
}

/* ── View: Meclis Salonu ───────────────────────────────────────────── */
export async function loadMeclisView() {
  const contentEl = document.getElementById('hasimlar-content');
  if (!contentEl) return;
  _injectStyle();
  contentEl.innerHTML = `<div class="meclis-loading">${escapeHTML(t('meclis.loading', 'Meclis toplanıyor…'))}</div>`;
  await ensureSuretDrafts().catch(() => {});
  await ensureBaseline().catch(() => {});
  const suretler = await getSuretler();
  renderMeclisSalonu(suretler);
}

export function renderMeclisSalonu(suretler) {
  const contentEl = document.getElementById('hasimlar-content');
  if (!contentEl) return;
  suretler = suretler || S._suretler || [];

  // Stats: SEZİLEN · TANINDI · BÜTÜNLEŞTİ · ELMAS
  const sezilen     = suretler.filter(s => s.hal === 'sezilen').length;
  const tanindi     = suretler.filter(s => s.hal === 'adlandi').length;
  const butunlesti  = suretler.filter(s => s.hal === 'butunlesti').length;
  const statsEl = document.getElementById('hasimlar-stats');
  if (statsEl) {
    const cells = statsEl.querySelectorAll('.ws-stat-val');
    if (cells[0]) cells[0].textContent = sezilen;
    if (cells[1]) cells[1].textContent = tanindi;
    if (cells[2]) cells[2].textContent = butunlesti;
    if (cells[3]) cells[3].textContent = _elmasSafe();
  }

  const elleCta = `<button class="ikv-ghost-btn meclis-elle-cta" onclick="meclisOpenElleSezis()">◇ ${escapeHTML(t('meclis.elle_cta_entry', 'Bir yüz seziyorum'))}</button>`;

  if (!suretler.length) {
    contentEl.innerHTML = `
      ${_meclisHallHTML(suretler)}
      <div class="meclis-empty">
        <div class="meclis-empty-sigil">☽</div>
        <div class="meclis-empty-text">${escapeHTML(t('meclis.empty', 'Henüz sezilen bir suret yok. Birkaç gün Emre ile konuş — yüzlerin burada belirmeye başlayacak.'))}</div>
        ${elleCta}
      </div>`;
    return;
  }

  const cards = suretler.map((s, i) => {
    const isBut   = s.hal === 'butunlesti';
    const isNamed = s.hal === 'adlandi';
    const ready   = isNamed && (s.bag_seviyesi || 0) >= 100;
    const cls     = isBut ? 'is-butunlesti' : (isNamed ? 'is-named' : 'is-sensed');
    let face;
    if (s.hal === 'sezilen') {
      face = ikvCardBack({ mini: true });
    } else {
      const card = _suretToCard(s, isBut ? 'altin' : 'golge');
      face = ikvCardFace(card, {
        palette: isBut ? 'gold' : 'lapis', mini: true, sahne: card.sahne,
        badge: ready ? '✦' : '', extra: isNamed ? _bondMeterHTML(s.bag_seviyesi) : '',
      });
    }
    return `<button class="meclis-grid-card ${cls} ${ready ? 'is-ready' : ''}" style="--i:${Math.min(i, 24)}" onclick="openSuretCard('${escapeHTML(s.slug)}')">${face}</button>`;
  }).join('');

  contentEl.innerHTML = `
    ${_meclisHallHTML(suretler)}
    <div class="meclis-section-head">${escapeHTML(t('meclis.gallery_head', 'Yüzlerin'))}</div>
    <div class="meclis-grid ikv-cascade">${cards}</div>
    ${elleCta}`;

  // Haftalık Meclis Toplantısı (13i) — yeni haftanın ilk girişinde divan toplanır
  setTimeout(() => { try { window.mtMaybeConvene?.(suretler); } catch (_) {} }, 600);
}

/* ── "Tanı → hemen aynaya geç" yardımcıları ────────────────────────── */
// Kart açılır açılmaz odak gölgede değil, OLMAK İSTEDİĞİN kişide (ayna).
function _aynaFocusHTML(s) {
  const ayna = _aynaName(s);
  const ad = s.ad || s.unvan || '';
  const pivot = ad
    ? t('meclis.ayna_pivot', '{{ad}} belirdiğinde — tanı, sonra buraya dön.').replace('{{ad}}', ad)
    : '';
  return `
    <div class="meclis-ayna-focus">
      <div class="meclis-ayna-eyebrow">${escapeHTML(t('meclis.ayna_eyebrow', 'OLMAK İSTEDİĞİN'))}</div>
      <div class="meclis-ayna-name serif">${escapeHTML(ayna)}</div>
      ${pivot ? `<div class="meclis-ayna-pivot">${escapeHTML(pivot)}</div>` : ''}
    </div>`;
}

// "Bil ama odaklanma": gölgenin anatomisi (ses + niyet/korku/örüntü/kör nokta
// + engel panzehiri) görünür kalır ama katlanmış/sessiz.
function _shadowAnatomyHTML(s) {
  const row = (label, val) => val ? `
    <div class="meclis-row">
      <div class="meclis-row-label">${escapeHTML(label)}</div>
      <div class="meclis-row-val">${escapeHTML(val)}</div>
    </div>` : '';
  const voice = s.ses ? `<div class="meclis-voice">“${escapeHTML(s.ses)}”</div>` : '';
  const engel = s.engel_id ? _engelById(s.engel_id) : null;
  const engelRow = engel ? `
    <div class="meclis-row">
      <div class="meclis-row-label">${escapeHTML(t('meclis.engel_label', 'Panzehir'))} · ${escapeHTML(engel.name)}</div>
      <div class="meclis-row-val">${escapeHTML(engel.panzehir)}</div>
    </div>` : '';
  const rows = `
    ${row(t('meclis.intent_label', 'Seni neden koruyor'), s.niyet)}
    ${row(t('meclis.fear_label', 'Neyden kaçıyor'), s.korku)}
    ${row(t('meclis.pattern_label', 'Örüntü'), s.koken_oruntu)}
    ${row(t('meclis.blindspot_label', 'Göremediğin'), s.kor_nokta)}
    ${engelRow}`;
  const inner = `${voice}${rows}`;
  if (!inner.trim()) return '';
  return `
    <details class="meclis-tani">
      <summary>${escapeHTML(t('meclis.tani_summary', 'Gölgeyi tanı (ama orada durma)'))}</summary>
      <div class="meclis-tani-body">${inner}</div>
    </details>`;
}

/* ── Suret kartı (detay) — "Huzura Çıkış" ───────────────────────────
   Tam-ekran ikvComposeBackdrop + flip'li kart (dış sarmalayıcı giriş
   animasyonunu, iç sarmalayıcı flip'i taşır — nested-flip GOTCHA'sı). */
export function openSuretCard(slug) {
  const s = _findSuret(slug);
  if (!s) return;
  const state = s.hal; // 'sezilen' | 'adlandi' | 'butunlesti'
  const sl = escapeHTML(s.slug);
  const close = `meclisCloseDetail()`;

  document.getElementById('meclis-detay-overlay')?.remove();

  let body, actions;
  let backdropCard = null;
  let flipHTML = '';

  if (state === 'sezilen') {
    const row = (label, val) => val ? `
      <div class="meclis-row">
        <div class="meclis-row-label">${escapeHTML(label)}</div>
        <div class="meclis-row-val">${escapeHTML(val)}</div>
      </div>` : '';
    const voice = s.ses ? `<div class="meclis-voice">“${escapeHTML(s.ses)}”</div>` : '';
    const insights = `
      ${row(t('meclis.intent_label', 'Seni neden koruyor'), s.niyet)}
      ${row(t('meclis.fear_label', 'Neyden kaçıyor'), s.korku)}
      ${row(t('meclis.pattern_label', 'Örüntü'), s.koken_oruntu)}
      ${row(t('meclis.blindspot_label', 'Göremediğin'), s.kor_nokta)}`;
    const apBadge = s.ap_confirmed ? `<div class="meclis-ap-badge">✦ ${escapeHTML(t('meclis.ap_confirmed', "Ayna'da bunu sen doğruladın"))}</div>` : '';
    flipHTML = `<div class="meclis-flip-outer"><div class="meclis-flip-static">${ikvCardBack({})}</div></div>`;
    body = `${apBadge}${voice}${insights}`;
    actions = `
      <button class="ikv-seal-btn" onclick="${close};openAdlandirma('${sl}')">${escapeHTML(t('meclis.recognize_cta', 'Tanı & Adlandır'))}</button>
      <button class="meclis-dismiss" onclick="${close};dismissSuret('${sl}')">${escapeHTML(t('meclis.dismiss', 'Bu ben değilim'))}</button>`;
  } else {
    const isBut = state === 'butunlesti';
    const golgeCard = _suretToCard(s, 'golge');
    const altinCard = _suretToCard(s, 'altin');
    backdropCard = isBut ? altinCard : golgeCard;
    const golgeFace = ikvCardFace(golgeCard, { palette: 'lapis', sahne: golgeCard.sahne, kicker: t('meclis.kicker_golge', 'GÖLGE') });
    const altinFace = ikvCardFace(altinCard, { palette: 'gold', sahne: altinCard.sahne, kicker: t('meclis.kicker_altin', 'ALTIN') });
    flipHTML = `
      <div class="meclis-flip-outer">
        <div class="meclis-flip${isBut ? ' is-flipped' : ''}" onclick="this.classList.toggle('is-flipped')">
          <div class="meclis-flip-inner">
            <div class="meclis-flip-face meclis-flip-front">${golgeFace}</div>
            <div class="meclis-flip-face meclis-flip-back">${altinFace}</div>
          </div>
        </div>
        <div class="meclis-flip-hint">${escapeHTML(t('meclis.flip_hint', 'Kartına dokun — gölgeyi ve altını gör.'))}</div>
      </div>`;

    if (isBut) {
      const labels = _kokLabels(s);
      const oikDone = !!s.oik_madde_id;
      body = `
        <div class="meclis-butunlesti-badge">✦ ${escapeHTML(t('meclis.integrated_tag', 'bütünleşmiş müttefik'))}</div>
        ${s.ayna ? `<div class="meclis-mirror-now">${escapeHTML(t('meclis.now_label', 'artık'))}: <em>${escapeHTML(s.ayna)}</em></div>` : ''}
        ${labels.length ? `<div class="meclis-butunles-kok">${escapeHTML(t('meclis.depth_shift', 'Güçlenen Temeller'))}: <em>${escapeHTML(labels.join(' · '))}</em></div>` : ''}
        ${_shadowAnatomyHTML(s)}`;
      actions = `
        ${oikDone
          ? `<div class="meclis-oik-done">✦ ${escapeHTML(t('meclis.oik_sealed_tag', "Olmak İstediğin Kişi'ne işlendi"))}</div>`
          : `<button class="ikv-seal-btn" onclick="meclisSealToOik('${sl}')">${escapeHTML(t('meclis.oik_seal_cta', "Bu kazanımı Olmak İstediğin Kişi kartına işle"))}</button>`}
        <button class="ikv-ghost-btn" onclick="meclisDownloadMuhur('${sl}')">${escapeHTML(t('meclis.download_seal', 'Dönüşüm Mührünü al'))}</button>
        <button class="meclis-dismiss" onclick="${close}">${escapeHTML(t('weekly.ok', 'Tamam'))}</button>`;
    } else {
      const ready = (s.bag_seviyesi || 0) >= 100;
      body = `${_aynaFocusHTML(s)}${_meydanOkumaHTML(s)}${_shadowAnatomyHTML(s)}`;
      actions = `
        <button class="ikv-ghost-btn meclis-act" onclick="meclisOpenDialog('${sl}')">${escapeHTML(t('meclis.dialog_cta', 'Onunla konuş'))}</button>
        ${ready ? `<button class="ikv-seal-btn meclis-act" onclick="meclisButunles('${sl}')">${escapeHTML(t('meclis.butunles_cta', 'Bütünleş ✦'))}</button>` : ''}
        <button class="meclis-dismiss" onclick="${close}">${escapeHTML(t('weekly.ok', 'Tamam'))}</button>`;
    }
  }

  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.id = 'meclis-detay-overlay';
  const backdrop = backdropCard ? `<div class="meclis-det-backdrop">${ikvComposeBackdrop(backdropCard, { palette: state === 'butunlesti' ? 'gold' : 'lapis' })}</div>` : '';
  overlay.innerHTML = `
    ${backdrop}
    <div class="meclis-det-veil"></div>
    <div class="modal meclis-modal meclis-det ikv-cascade" style="max-width:440px;">
      <div class="meclis-det-title serif">${escapeHTML(s.hal === 'sezilen' ? t('meclis.unknown', 'Sezilen yüz') : (s.ad || s.unvan || ''))}</div>
      <div class="meclis-modal-unvan">${escapeHTML(s.unvan || '')}</div>
      ${flipHTML}
      ${body}
      <div class="meclis-modal-actions">${actions}</div>
    </div>`;
  document.body.appendChild(overlay);
  try { window.wtOverlayOpen?.('meclis-detay'); } catch (_) {}
}

export function meclisCloseDetail() {
  document.getElementById('meclis-detay-overlay')?.remove();
  try { window.wtOverlayClose?.('meclis-detay'); } catch (_) {}
}

/* ── Meydan Okuma bloğu (bağ + Fark Ediş + Yol + kanıt) ─────────────── */
function _meydanOkumaHTML(s) {
  const bag = s.bag_seviyesi || 0;
  const today = _todayISO();
  const ready = bag >= 100;
  const yuzlesmeDoneToday = s.son_yuzlesme === today;

  let html = `
    <div class="meclis-meydan">
      <div class="meclis-bond-head">
        <span class="meclis-bond-label">${escapeHTML(t('meclis.bond_label', 'Bağ'))}</span>
        <span class="meclis-bond-pct">${ready ? escapeHTML(t('meclis.bond_ready', 'bütünleşmeye hazır ✦')) : '%' + bag}</span>
      </div>
      ${_bondMeterHTML(bag)}`;

  // Fark Ediş (eski Yüzleşme — fonksiyon adı korunur, kullanıcı-yüzlü çerçeve "Fark Ediş")
  html += `<div class="meclis-section-mini-head">${escapeHTML(t('meclis.faredis_head', 'Fark Ediş'))}</div>`;
  html += yuzlesmeDoneToday
    ? `<div class="meclis-yuzlesme-done">✓ ${escapeHTML(t('meclis.yuzlesme_done_today', 'Bugünkü yüzleşmeyi yaptın.'))}</div>`
    : `<button class="ikv-seal-btn meclis-act" onclick="meclisYuzlesme('${escapeHTML(s.slug)}')">${escapeHTML(t('meclis.yuzlesme_cta', 'Bugün onu fark ettim, tersini seçtim'))}</button>`;

  // Yol (eski Sefer)
  if (_seferDone(s)) {
    html += `<div class="meclis-sefer-done">⛨ ${escapeHTML(t('meclis.sefer_complete', '21 günlük yol tamamlandı.'))}</div>`;
  } else if (_seferActive(s)) {
    const gun = (s.sefer_gun || 0) + 1;
    const sealedToday = s.sefer_son_muhur === today;
    html += `
      <div class="meclis-sefer">
        <div class="meclis-sefer-head">${escapeHTML(t('meclis.sefer_tag', 'YOL'))} · ${escapeHTML(t('meclis.sefer_day', 'Gün'))} ${gun}/${SEFER_GUN_SAYISI}</div>
        <div class="meclis-sefer-task">${escapeHTML(_seferTaskFor(s))}</div>
        ${_seferTriadHTML(s)}
        ${sealedToday
          ? `<div class="meclis-yuzlesme-done">✓ ${escapeHTML(t('meclis.sefer_sealed_today', 'Bugünkü günü mühürledin.'))}</div>`
          : `<button class="ikv-ghost-btn meclis-act" onclick="meclisSealSeferDay('${escapeHTML(s.slug)}')">${escapeHTML(t('meclis.sefer_seal_cta', 'Günü mühürle'))}</button>`}
      </div>`;
  } else {
    html += `<button class="meclis-sefer-start" onclick="meclisStartSefer('${escapeHTML(s.slug)}')">${escapeHTML(t('meclis.sefer_start_cta', '21 günlük yola çık →'))}</button>`;
  }

  // Kanıt (gerçek hayat çıpası)
  const kanitN = (s.kanitlar || []).length;
  html += `<button class="meclis-kanit-btn" onclick="meclisOpenKanit('${escapeHTML(s.slug)}')">🜄 ${escapeHTML(t('meclis.kanit_cta', 'Kanıt bırak'))}${kanitN ? ' · ' + kanitN : ''}</button>`;

  html += `</div>`;
  return html;
}

/* ── Fark Ediş (günlük) — fonksiyon adı meclisYuzlesme AYNEN korunur ── */
export async function meclisYuzlesme(slug) {
  const s = _findSuret(slug);
  if (!s || s.hal !== 'adlandi' || !S.currentUser) return;
  const today = _todayISO();
  if (s.son_yuzlesme === today) { showToast(t('meclis.yuzlesme_done_today', 'Bugünkü yüzleşmeyi yaptın.')); return; }
  const bag = Math.min(100, (s.bag_seviyesi || 0) + BOND_YUZLESME);
  await _persistSuret(s, { son_yuzlesme: today, yuzlesme_sayisi: (s.yuzlesme_sayisi || 0) + 1, bag_seviyesi: bag });
  awardElmas(ELMAS_YUZLESME, 'Fark Ediş: ' + (s.ad || slug));
  showToast(t('meclis.yuzlesme_toast', 'Fark ettin. Bağ güçlendi.'));
  _refreshCard(slug);
}

/* ── Yol başlat / günü mühürle ──────────────────────────────────────── */
export async function meclisStartSefer(slug) {
  const s = _findSuret(slug);
  if (!s || s.hal !== 'adlandi' || !S.currentUser) return;
  if (_seferActive(s)) { showToast(t('meclis.sefer_active', 'Zaten aktif bir yolun var.')); return; }
  await _persistSuret(s, { sefer_gun: 0, sefer_baslangic: new Date().toISOString(), sefer_son_muhur: null });
  showToast(t('meclis.sefer_started', '21 günlük yol başladı.'));
  _refreshCard(slug);
}

export async function meclisSealSeferDay(slug) {
  const s = _findSuret(slug);
  if (!s || !S.currentUser || !_seferActive(s)) return;
  const today = _todayISO();
  if (s.sefer_son_muhur === today) { showToast(t('meclis.sefer_sealed_today', 'Bugünkü günü mühürledin.')); return; }
  const prevPerde = seferPerde(s.sefer_gun || 0);
  const gun = (s.sefer_gun || 0) + 1;
  const patch = { sefer_gun: gun, sefer_son_muhur: today, bag_seviyesi: Math.min(100, (s.bag_seviyesi || 0) + BOND_SEFER_DAY) };
  let toast = t('meclis.sefer_day_toast', 'Gün {{n}} mühürlendi.').replace('{{n}}', gun);
  if (gun >= SEFER_GUN_SAYISI) {
    /* KOKEN-MUAF: bir mühür, bir ölçüm varsayılanı değil. Kullanıcı Sefer'in
       her gününü kendi eliyle mühürledi; bağın tam sayılmasının kanıtı o
       eylemin kendisidir (sefer_gun >= SEFER_GUN_SAYISI). */
    patch.bag_seviyesi = 100;
    awardElmas(ELMAS_SEFER_DONE, 'Yol tamamlandı: ' + (s.ad || slug));
    toast = t('meclis.sefer_done_toast', 'Yol tamamlandı. Bütünleşmeye hazırsın.');
  } else {
    awardElmas(ELMAS_SEFER_DAY, 'Yol günü: ' + (s.ad || slug));
    const newPerde = seferPerde(gun);
    if (newPerde !== prevPerde) {
      const label = (PERDE_LABEL[_seferLang()] || PERDE_LABEL.tr)[newPerde];
      toast = t('meclis.perde_shift_toast', 'Yeni perde: {{perde}}').replace('{{perde}}', label);
    }
  }
  await _persistSuret(s, patch);
  showToast(toast);
  _refreshCard(slug);
}

// Açık kartı yeniden çiz + galeriyi tazele
function _refreshCard(slug) {
  meclisCloseDetail();
  renderMeclisSalonu();
  openSuretCard(slug);
}

/* ═══ DİYALOG — Suret'in sesiyle konuşma ════════════════════════════ */
export function meclisOpenDialog(slug) {
  const s = _findSuret(slug);
  if (!s || (s.hal !== 'adlandi' && s.hal !== 'butunlesti')) return;
  const opening = s.ses || t('meclis.dialog_opening', 'Buradayım. Beni neden çağırdın?');
  S._meclisDialog = { slug, msgs: [{ role: 'suret', text: opening }] };

  meclisCloseDetail();
  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.id = 'meclis-dialog-overlay';
  overlay.style.setProperty('z-index', 'var(--z-meclis-dialog)');
  overlay.innerHTML = `
    <div class="modal meclis-dialog" style="max-width:440px;">
      <div class="meclis-dialog-head">
        <span class="meclis-dialog-sigil">${s.sigil || _sigilFor(s.slug)}</span>
        <span class="meclis-dialog-name serif">${escapeHTML(s.ad || s.unvan || '')}</span>
      </div>
      <div class="meclis-dialog-msgs" id="meclis-dialog-msgs"></div>
      <div class="meclis-dialog-input-row">
        <input id="meclis-dialog-input" class="meclis-input meclis-dialog-input" type="text"
               placeholder="${escapeHTML(t('meclis.dialog_placeholder', 'Ona bir şey sor…'))}"
               onkeydown="if(event.key==='Enter'){meclisDialogSend('${escapeHTML(s.slug)}')}" />
        <button class="btn-gold meclis-dialog-send" onclick="meclisDialogSend('${escapeHTML(s.slug)}')">→</button>
      </div>
      <button class="meclis-dismiss" onclick="meclisCloseDialog()">${escapeHTML(t('weekly.ok', 'Tamam'))}</button>
    </div>`;
  document.body.appendChild(overlay);
  _renderDialog();
  overlay.querySelector('#meclis-dialog-input')?.focus();
}

function _renderDialog() {
  const box = document.getElementById('meclis-dialog-msgs');
  if (!box) return;
  const msgs = S._meclisDialog?.msgs || [];
  box.innerHTML = msgs.map(m =>
    `<div class="meclis-msg meclis-msg--${m.role === 'user' ? 'user' : 'suret'}">${escapeHTML(m.text)}</div>`
  ).join('');
  box.scrollTop = box.scrollHeight;
}

export async function meclisDialogSend(slug) {
  const s = _findSuret(slug);
  const dlg = S._meclisDialog;
  if (!s || !dlg || dlg.slug !== slug) return;
  const input = document.getElementById('meclis-dialog-input');
  const text = (input?.value || '').trim();
  if (!text) return;
  if (input) input.value = '';

  dlg.msgs.push({ role: 'user', text });
  dlg.msgs.push({ role: 'suret', text: '…' });
  _renderDialog();

  try {
    const contents = dlg.msgs
      .filter(m => m.text !== '…')
      .map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));
    const systemPrompt = p('prompt.meclis_dialog', {
      ad: s.ad || s.unvan || '', unvan: s.unvan || '', ses: s.ses || '',
      niyet: s.niyet || '', korku: s.korku || '', ayna: s.ayna || '',
    });
    const reply = await callLLM({ contents, systemPrompt, maxTokens: 120, temperature: 0.85, skipPersona: true });
    dlg.msgs.pop(); // "…" placeholder'ı kaldır
    dlg.msgs.push({ role: 'suret', text: (reply || '').trim() || '…' });
    _renderDialog();
    await meclisDialogReward(slug, { user: text, suret: reply });
  } catch (e) {
    dlg.msgs.pop();
    _renderDialog();
    showToast(t('toast.error', 'Hata: ') + (e?.message || ''), true);
  }
}

export function meclisCloseDialog() {
  S._meclisDialog = null;
  document.getElementById('meclis-dialog-overlay')?.remove();
  renderMeclisSalonu();
}

// Diyalog bağ ödülü — günde bir kez (diyalog sayısı her seferinde artar).
// exchange: {user,suret} verilirse deterministik bir özet satırı diyaloglar
// defterine düşer (YENİ bir LLM özetleme çağrısı EKLENMEZ — mevcut turun
// kısaltmasıdır).
export async function meclisDialogReward(slug, exchange) {
  const s = _findSuret(slug);
  if (!s || !S.currentUser) return;
  const today = _todayISO();
  const patch = { diyalog_sayisi: (s.diyalog_sayisi || 0) + 1 };
  if (exchange?.user) {
    const ozet = `${exchange.user}`.slice(0, 120);
    const log = (s.diyaloglar || []).concat([{ at: today, ozet }]).slice(-DIALOG_LOG_CAP);
    patch.diyaloglar = log;
  }
  if (s.son_diyalog !== today) {
    patch.son_diyalog = today;
    patch.bag_seviyesi = Math.min(100, (s.bag_seviyesi || 0) + BOND_DIALOG);
    awardElmas(ELMAS_DIALOG, 'Diyalog: ' + (s.ad || slug));
  }
  await _persistSuret(s, patch);
}

/* ═══ BÜTÜNLEŞME — dönüşüm töreni + derinlik kayışı ═══════════════ */
export async function meclisButunles(slug) {
  const s = _findSuret(slug);
  if (!s || s.hal !== 'adlandi' || !S.currentUser) return;
  if ((s.bag_seviyesi || 0) < 100) { showToast(t('meclis.butunles_not_ready', 'Bağ henüz tam değil.')); return; }
  await _persistSuret(s, { hal: 'butunlesti', butunlesti_at: new Date().toISOString() });
  awardElmas(ELMAS_BUTUNLES, 'Bütünleşme: ' + (s.ad || slug));
  meclisCloseDetail();
  try { _butunlesmeCeremony(s); } catch (_) { /* kozmetik */ }
  renderMeclisSalonu();
}

function _butunlesmeCeremony(s) {
  const labels = _kokLabels(s);
  const card = _suretToCard(s, 'altin');
  const oikDone = !!s.oik_madde_id;
  const overlay = document.createElement('div');
  overlay.className = 'overlay open meclis-butunles-overlay';
  overlay.id = 'meclis-butunles-overlay';
  overlay.style.setProperty('z-index', 'var(--z-meclis-suret)');
  overlay.innerHTML = `
    <div class="modal meclis-butunles ikv-cascade">
      <div class="meclis-butunles-flip">${ikvCardFace(card, { palette: 'gold', sahne: card.sahne, kicker: t('meclis.kicker_altin', 'ALTIN') })}</div>
      <div class="meclis-butunles-eyebrow">${escapeHTML(t('meclis.butunles_eyebrow', 'DÖNÜŞÜM'))}</div>
      <div class="meclis-butunles-name serif">${escapeHTML(s.ad || s.unvan || '')}</div>
      <div class="meclis-butunles-arrow">↓</div>
      <div class="meclis-butunles-mirror serif">${escapeHTML(s.ayna || _aynaName(s))}</div>
      <div class="meclis-butunles-text">${escapeHTML(t('meclis.butunles_text', "{{ad}} artık meclisinde bir müttefik. Söz sırası sende, Reis.").replace('{{ad}}', s.ad || s.unvan || ''))}</div>
      ${labels.length ? `<div class="meclis-butunles-kok">${escapeHTML(t('meclis.depth_shift', 'Güçlenen Temeller'))}: <em>${escapeHTML(labels.join(' · '))}</em></div>` : ''}
      <div class="meclis-modal-actions">
        ${oikDone
          ? `<div class="meclis-oik-done">✦ ${escapeHTML(t('meclis.oik_sealed_tag', "Olmak İstediğin Kişi'ne işlendi"))}</div>`
          : `<button class="ikv-seal-btn" onclick="meclisSealToOik('${escapeHTML(s.slug)}')">${escapeHTML(t('meclis.oik_seal_cta', "Bu kazanımı Olmak İstediğin Kişi kartına işle"))}</button>`}
        <button class="ikv-ghost-btn" onclick="meclisDownloadMuhur('${escapeHTML(s.slug)}')">${escapeHTML(t('meclis.download_seal', 'Dönüşüm Mührünü al'))}</button>
        <button class="meclis-dismiss" onclick="meclisCloseButunlesCeremony()">${escapeHTML(t('weekly.ok', 'Tamam'))}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  try { window.wtOverlayOpen?.('meclis-donusum'); } catch (_) {}
}

export function meclisCloseButunlesCeremony() {
  document.getElementById('meclis-butunles-overlay')?.remove();
  try { window.wtOverlayClose?.('meclis-donusum'); } catch (_) {}
}

export function meclisDownloadMuhur(slug) {
  const s = _findSuret(slug);
  if (!s) return;
  const title = s.ayna || s.ad || t('meclis.butunles_eyebrow', 'DÖNÜŞÜM');
  const desc = `${s.ad || ''} → ${s.ayna || ''}`.trim();
  try { showGraduation(title, desc); } catch (_) { /* grad DOM yoksa sessiz geç */ }
}

/* ── OİK mührü — dönüşen suretin kazanımı Olmak İstediğin Kişi kartına
   işlenir (K3). İdempotent: oik_madde_id doluysa tekrar çalışmaz. */
export async function meclisSealToOik(slug) {
  const s = _findSuret(slug);
  if (!s || s.hal !== 'butunlesti') return;
  if (s.oik_madde_id) { showToast(t('meclis.oik_already', 'Zaten işlendi.')); return; }

  const text = s.ayna ? `${s.ad || s.unvan}: ${s.ayna}` : (s.ad || s.unvan || '');
  if (!text) return;

  let id = null;
  try { id = window.oikAddMadde?.('davranislar', text, 'meclis'); } catch (_) { id = null; }
  if (!id) { showToast(t('meclis.oik_unavailable', 'Olmak İstediğin Kişi kartın henüz yok.'), true); return; }

  await _persistSuret(s, { oik_madde_id: id });
  showToast(t('meclis.oik_sealed', "Olmak İstediğin Kişi kartına işlendi."));

  // Açık ceremony/detail varsa buton durumunu tazele
  if (document.getElementById('meclis-butunles-overlay')) {
    meclisCloseButunlesCeremony();
    _butunlesmeCeremony(s);
  } else if (document.getElementById('meclis-detay-overlay')) {
    meclisCloseDetail();
    openSuretCard(slug);
  }
}

/* ═══ KANIT — gerçek hayat çıpası — DEĞİŞMEDİ ══════════════════════ */
export function meclisOpenKanit(slug) {
  const s = _findSuret(slug);
  if (!s || s.hal !== 'adlandi') return;
  const kanitlar = (s.kanitlar || []).slice().reverse().slice(0, 8);
  const list = kanitlar.length ? `
    <div class="meclis-kanit-list">
      ${kanitlar.map(k => `<div class="meclis-kanit-item"><span class="meclis-kanit-date">${escapeHTML(k.d || '')}</span>${escapeHTML(k.t || '')}</div>`).join('')}
    </div>` : '';

  meclisCloseDetail();
  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.id = 'meclis-kanit-overlay';
  overlay.style.setProperty('z-index', 'var(--z-meclis-kanit)');
  overlay.innerHTML = `
    <div class="modal meclis-modal" style="max-width:420px;">
      <div class="meclis-modal-sigil">🜄</div>
      <div class="meclis-modal-title serif">${escapeHTML(t('meclis.kanit_title', 'Kanıt bırak'))}</div>
      <div class="meclis-naming-hint">${escapeHTML(t('meclis.kanit_hint', 'Bugün ona ait olmayan ne yaptın? Gerçek bir an yaz.'))}</div>
      <input id="meclis-kanit-input" class="meclis-input meclis-dialog-input" type="text" maxlength="160"
             placeholder="${escapeHTML(t('meclis.kanit_placeholder', 'Örn. ertelemeden başladım…'))}"
             onkeydown="if(event.key==='Enter'){meclisSaveKanit('${escapeHTML(s.slug)}')}" />
      ${list}
      <div class="meclis-modal-actions">
        <button class="btn-gold" onclick="meclisSaveKanit('${escapeHTML(s.slug)}')">${escapeHTML(t('meclis.kanit_save', 'Mühürle'))}</button>
        <button class="meclis-dismiss" onclick="this.closest('.overlay').remove();openSuretCard('${escapeHTML(s.slug)}')">${escapeHTML(t('weekly.cancel', 'Vazgeç'))}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#meclis-kanit-input')?.focus();
}

export async function meclisSaveKanit(slug) {
  const s = _findSuret(slug);
  if (!s || !S.currentUser) return;
  const input = document.getElementById('meclis-kanit-input');
  const text = (input?.value || '').trim().slice(0, 160);
  if (!text) { showToast(t('meclis.kanit_required', 'Kısa bir an yaz.'), true); return; }
  const today = _todayISO();

  const kanitlar = (s.kanitlar || []).concat([{ t: text, d: today }]).slice(-50);
  const patch = { kanitlar };
  if (s.son_kanit !== today) {
    patch.son_kanit = today;
    patch.bag_seviyesi = Math.min(100, (s.bag_seviyesi || 0) + BOND_KANIT);
    awardElmas(ELMAS_KANIT, 'Kanıt: ' + (s.ad || slug));
  }
  await _persistSuret(s, patch);
  showToast(t('meclis.kanit_toast', 'Kanıt mühürlendi. Bu gerçek oldu.'));
  document.getElementById('meclis-kanit-overlay')?.remove();
  renderMeclisSalonu();
  openSuretCard(slug);
}

/* ── Adlandırma seremonisi ─────────────────────────────────────────── */
export function openAdlandirma(slug) {
  const s = _findSuret(slug);
  if (!s) return;
  const suggestion = (s.unvan || s.slug || '').toString();
  const apBadge = s.ap_confirmed ? `<div class="meclis-ap-badge">✦ ${escapeHTML(t('meclis.ap_confirmed', "Ayna'da bunu sen doğruladın"))}</div>` : '';

  const overlay = document.createElement('div');
  overlay.className = 'overlay open';
  overlay.id = 'meclis-naming-overlay';
  overlay.style.setProperty('z-index', 'var(--z-meclis-panel)');
  overlay.innerHTML = `
    <div class="modal meclis-naming" style="max-width:420px;">
      <div class="meclis-naming-sigil">${s.sigil || _sigilFor(s.slug)}</div>
      <div class="meclis-naming-title serif">${escapeHTML(t('meclis.naming_title', 'Bu yüzü tanıdın. Ona ne ad verirsin?'))}</div>
      ${apBadge}
      ${s.ses ? `<div class="meclis-voice">“${escapeHTML(s.ses)}”</div>` : ''}
      <div class="meclis-naming-hint">${escapeHTML(t('meclis.naming_hint', 'Bir ad ver — onu yargılamak için değil, tanımak için. Önerilen:'))} <em>${escapeHTML(suggestion)}</em></div>
      <input id="meclis-ad-input" class="meclis-input" type="text" maxlength="40"
             value="${escapeHTML(suggestion)}" placeholder="${escapeHTML(t('meclis.name_placeholder', 'Bir ad…'))}" />
      <div class="meclis-modal-actions">
        <button class="btn-gold" onclick="saveSuretAd('${escapeHTML(s.slug)}')">${escapeHTML(t('meclis.name_cta', 'Adını koy'))}</button>
        <button class="meclis-dismiss" onclick="meclisCancelAdlandirma()">${escapeHTML(t('weekly.cancel', 'Vazgeç'))}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const input = overlay.querySelector('#meclis-ad-input');
  if (input) { input.focus(); input.select(); }
  try { window.wtOverlayOpen?.('meclis-adlandirma'); } catch (_) {}
}

export function meclisCancelAdlandirma() {
  document.getElementById('meclis-naming-overlay')?.remove();
  try { window.wtOverlayClose?.('meclis-adlandirma'); } catch (_) {}
}

export async function saveSuretAd(slug) {
  const s = _findSuret(slug);
  if (!s || !S.currentUser) return;
  const input = document.getElementById('meclis-ad-input');
  const ad = (input?.value || '').trim().slice(0, 40);
  if (!ad) { showToast(t('meclis.name_required', 'Bir ad yaz.'), true); return; }

  const payload = {
    user_id: S.currentUser.id,
    slug: s.slug,
    ad,
    unvan: s.unvan || null,
    koken_oruntu: s.koken_oruntu || null,
    dogus_ani: s.dogus_ani || null,
    ses: s.ses || null,
    niyet: s.niyet || null,
    korku: s.korku || null,
    kor_nokta: s.kor_nokta || null,
    zirh: s.zirh || null,
    kokler: Array.isArray(s.kokler) ? s.kokler : [],
    ayna: s.ayna || null,
    sigil: s.sigil || _sigilFor(s.slug),
    hal: 'adlandi',
    named_at: new Date().toISOString(),
    sahne: s.sahne || null,
    engel_id: s.engel_id || null,
    kaynak: s.kaynak || 'profil',
  };

  try {
    await _suretUpsert(payload);
  } catch (e) {
    showToast((t('toast.error', 'Hata: ')) + (e?.message || ''), true);
    return;
  }

  // Local state: taslağı adlanmış suretle değiştir
  Object.assign(s, payload, { hal: 'adlandi' });
  S._suretDrafts = (S._suretDrafts || []).filter(d => d.slug !== s.slug);

  awardElmas(15, 'Suret tanındı: ' + ad);
  document.getElementById('meclis-naming-overlay')?.remove();
  try { window.wtOverlayClose?.('meclis-adlandirma'); } catch (_) {}
  try { _namingCeremony(s, ad); } catch (_) { /* kozmetik — save'i bloke etmesin */ }
  showToast(t('meclis.named_toast', '“{{ad}}” meclisine katıldı.').replace('{{ad}}', ad));
  renderMeclisSalonu();
}

export function dismissSuret(slug) {
  _addDismissed(slug);
  S._suretDrafts = (S._suretDrafts || []).filter(d => d.slug !== slug);
  S._suretler = (S._suretler || []).filter(x => x.slug !== slug);
  renderMeclisSalonu();
}

/* ── Tanıma anı: kısa, dingin bir mühür ─────────────────────────────── */
function _namingCeremony(s, ad) {
  if (AnimUtils?.prefersReducedMotion?.()) return;
  const el = document.createElement('div');
  el.className = 'meclis-ceremony';
  el.innerHTML = `
    <div class="meclis-ceremony-inner">
      <div class="meclis-ceremony-sigil">${s.sigil || _sigilFor(s.slug)}</div>
      <div class="meclis-ceremony-name serif">${escapeHTML(ad)}</div>
      <div class="meclis-ceremony-sub">${escapeHTML(t('meclis.ceremony_sub', 'tanındı'))}</div>
    </div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 600); }, 2200);
}

/* ── Stil (bir kez enjekte edilir) — ikv primitifleri (ikvEnsureStyles,
   ikvCardFace/Ring/... çağrılarıyla otomatik enjekte edilir) devralır;
   burada yalnız Meclis'e özgü, ikv'de olmayan kurallar var. ─────────── */
function _injectStyle() {
  if (document.getElementById('meclis-style')) return;
  const css = `
    .meclis-loading{padding:40px 16px;text-align:center;color:var(--text-dim);font-size:13px;}
    .meclis-empty{padding:48px 20px;text-align:center;}
    .meclis-empty-sigil{font-size:34px;color:var(--text-dim);opacity:.5;margin-bottom:16px;}
    .meclis-empty-text{color:var(--text-dim);font-size:13px;line-height:1.7;max-width:340px;margin:0 auto 20px;}
    .meclis-elle-cta{margin-top:14px;}
    .meclis-section-head{font-size:9px;letter-spacing:4px;text-transform:uppercase;color:var(--text-dim);margin:6px 0 14px;}
    .meclis-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:12px;margin-bottom:16px;}
    .meclis-grid-card{border:0;background:none;padding:0;cursor:pointer;width:100%;transition:transform .15s;}
    .meclis-grid-card:hover{transform:translateY(-2px);}
    .meclis-grid-card.is-sensed{filter:grayscale(.7);opacity:.72;}

    /* Divan */
    .meclis-divan{padding:26px 18px 20px;text-align:center;margin-bottom:18px;}
    .meclis-divan-ring{margin:0 auto 6px;}
    .meclis-divan-sun{font-size:20px;color:var(--gold,#F5A623);}
    .meclis-divan-reis{font-size:11px;letter-spacing:3px;color:var(--gold,#F5A623);font-weight:700;margin-top:8px;}
    .meclis-divan-reis-sub{font-size:10px;color:var(--text-dim);letter-spacing:1px;margin-bottom:10px;}
    .meclis-divan-poles{display:flex;align-items:center;justify-content:center;gap:10px;margin:10px 0 4px;flex-wrap:wrap;}
    .meclis-pole{background:none;border:1px solid var(--border);border-radius:12px;padding:8px 14px;cursor:pointer;display:flex;flex-direction:column;gap:2px;min-width:120px;transition:border-color .2s;}
    .meclis-pole--gold:hover{border-color:rgba(245,166,35,0.5);}
    .meclis-pole--lapis:hover{border-color:rgba(90,138,216,0.5);}
    .meclis-pole-kicker{font-size:8px;letter-spacing:2px;color:var(--text-dim);}
    .meclis-pole--gold .meclis-pole-name{color:var(--gold,#F5A623);font-size:13px;}
    .meclis-pole--lapis .meclis-pole-name{color:var(--lapis,#5A8AD8);font-size:13px;}
    .meclis-pole-bridge{color:var(--text-dim);font-size:14px;}
    .meclis-divan-poles-sub{font-size:10px;color:var(--text-dim);font-style:italic;margin-bottom:12px;}
    .meclis-divan-seats{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:14px 0;}
    .meclis-seat{border:0;background:none;padding:0;width:44px;cursor:pointer;opacity:.9;transition:transform .15s,opacity .2s;}
    .meclis-seat:hover{transform:translateY(-2px);opacity:1;}
    .meclis-seat.is-sensed{opacity:.55;filter:grayscale(.6);}
    .meclis-divan-phrase{font-size:12px;color:var(--text-dim);margin-top:8px;line-height:1.6;}
    .meclis-divan-stat{font-size:10px;color:var(--gold,#F5A623);letter-spacing:1px;margin-top:4px;}
    .meclis-derinlik-link{margin-top:12px;background:none;border:0;color:var(--gold,#F5A623);font-size:11px;letter-spacing:1px;cursor:pointer;text-decoration:underline;}

    /* Bağ + Fark Ediş */
    .meclis-section-mini-head{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-dim);margin:14px 0 6px;}
    .meclis-bond{height:5px;border-radius:3px;background:rgba(255,255,255,.06);overflow:hidden;margin:6px 0 14px;}
    .meclis-bond-fill{height:100%;background:linear-gradient(90deg,var(--gold,#F5A623),var(--gold-bright,#FFD166));transition:width .4s;}
    .meclis-bond-head{display:flex;justify-content:space-between;font-size:11px;color:var(--text-dim);}
    .meclis-yuzlesme-done,.meclis-sefer-done{font-size:12px;color:var(--gold,#F5A623);padding:8px 0;}
    .meclis-act{width:100%;margin:6px 0;}

    /* Yol (perde) */
    .meclis-perde-badge{display:inline-block;font-size:8px;letter-spacing:2px;padding:2px 8px;border:1px solid var(--gold,#F5A623);border-radius:10px;color:var(--gold,#F5A623);margin-right:6px;}
    .meclis-sefer{margin-top:10px;padding:12px;border:1px solid var(--border);border-radius:12px;}
    .meclis-sefer-head{font-size:10px;letter-spacing:2px;color:var(--gold,#F5A623);margin-bottom:8px;}
    .meclis-sefer-task{font-size:13px;line-height:1.6;margin-bottom:10px;}
    .meclis-sefer-start{width:100%;padding:12px;background:none;border:1px dashed var(--border);border-radius:10px;color:var(--gold,#F5A623);cursor:pointer;margin-top:8px;}
    .meclis-triad{margin:10px 0;padding-top:8px;border-top:1px solid var(--border);}
    .meclis-triad-head{font-size:10px;letter-spacing:1px;color:var(--text-dim);margin-bottom:8px;}
    .meclis-triad-row{display:flex;gap:8px;margin-bottom:6px;font-size:12px;}
    .meclis-triad-k{color:var(--gold,#F5A623);flex-shrink:0;min-width:52px;font-size:10px;letter-spacing:1px;padding-top:2px;}
    .meclis-engel-line{margin-top:10px;padding:10px;background:rgba(255,255,255,.02);border-radius:10px;font-size:11px;}
    .meclis-engel-label{display:block;color:var(--gold,#F5A623);font-size:10px;letter-spacing:1px;margin-bottom:4px;}
    .meclis-engel-panzehir{display:block;color:var(--text-dim);line-height:1.5;}
    .meclis-engel-link{background:none;border:0;color:var(--gold,#F5A623);font-size:10px;cursor:pointer;margin-top:6px;text-decoration:underline;}
    .meclis-kanit-btn{width:100%;margin-top:10px;padding:10px;background:none;border:1px solid var(--border);border-radius:10px;color:var(--text-dim);cursor:pointer;}

    /* Ayna odağı + gölge anatomisi */
    .meclis-ayna-focus{text-align:center;padding:14px 10px;margin-bottom:12px;border-radius:12px;background:linear-gradient(180deg,rgba(245,166,35,0.08),transparent);}
    .meclis-ayna-eyebrow{font-size:9px;letter-spacing:3px;color:var(--gold,#F5A623);margin-bottom:4px;}
    .meclis-ayna-name{font-size:18px;color:var(--gold,#F5A623);}
    .meclis-ayna-pivot{font-size:11px;color:var(--text-dim);margin-top:6px;font-style:italic;}
    .meclis-tani{margin-top:12px;}
    .meclis-tani summary{cursor:pointer;font-size:11px;color:var(--text-dim);letter-spacing:.5px;padding:6px 0;}
    .meclis-tani-body{padding-top:8px;}
    .meclis-row{margin-bottom:8px;}
    .meclis-row-label{font-size:10px;color:var(--text-dim);letter-spacing:.5px;}
    .meclis-row-val{font-size:12px;line-height:1.5;}
    .meclis-voice{font-style:italic;font-size:13px;color:var(--text-dim);margin:8px 0;padding-left:10px;border-left:2px solid var(--gold,#F5A623);}
    .meclis-ap-badge{font-size:11px;color:var(--lapis,#5A8AD8);text-align:center;margin-bottom:10px;}

    /* Huzura Çıkış / flip */
    #meclis-detay-overlay{z-index:var(--z-ceremony,9650);}
    .meclis-det-backdrop{position:absolute;inset:0;overflow:hidden;z-index:0;}
    .meclis-det-backdrop svg{width:100%;height:100%;object-fit:cover;}
    .meclis-det-veil{position:absolute;inset:0;background:rgba(8,6,4,.35);z-index:0;}
    .meclis-det{position:relative;z-index:1;}
    .meclis-det-title{font-size:20px;text-align:center;margin-bottom:2px;}
    .meclis-flip-outer{perspective:1200px;margin:14px auto;max-width:200px;}
    .meclis-flip-static{max-width:160px;margin:0 auto;}
    .meclis-flip{position:relative;cursor:pointer;transition:transform .7s var(--ease-out,cubic-bezier(0.16,1,0.3,1));transform-style:preserve-3d;}
    .meclis-flip.is-flipped{transform:rotateY(180deg);}
    .meclis-flip-inner{position:relative;transform-style:preserve-3d;}
    .meclis-flip-face{backface-visibility:hidden;}
    .meclis-flip-front{position:relative;}
    .meclis-flip-back{position:absolute;inset:0;transform:rotateY(180deg);}
    .meclis-flip-hint{text-align:center;font-size:10px;color:var(--text-dim);margin-top:8px;letter-spacing:.5px;}

    /* Dönüşüm */
    .meclis-butunles-flip{max-width:180px;margin:0 auto 12px;}
    .meclis-butunles-eyebrow{font-size:10px;letter-spacing:3px;color:var(--gold,#F5A623);text-align:center;}
    .meclis-butunles-name{font-size:18px;text-align:center;color:var(--text-dim);}
    .meclis-butunles-arrow{text-align:center;color:var(--gold,#F5A623);margin:4px 0;}
    .meclis-butunles-mirror{font-size:22px;text-align:center;color:var(--gold,#F5A623);}
    .meclis-butunles-text{font-size:12px;text-align:center;color:var(--text-dim);margin:10px 0;line-height:1.6;}
    .meclis-butunles-kok{font-size:11px;text-align:center;color:var(--text-dim);margin-bottom:8px;}
    .meclis-oik-done{font-size:11px;color:var(--gold,#F5A623);text-align:center;padding:8px 0;}

    /* Diyalog */
    .meclis-dialog-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
    .meclis-dialog-sigil{font-size:22px;}
    .meclis-dialog-msgs{max-height:220px;overflow-y:auto;margin-bottom:10px;}
    .meclis-msg{padding:8px 12px;border-radius:10px;margin-bottom:6px;font-size:13px;max-width:85%;}
    .meclis-msg--suret{background:rgba(255,255,255,.04);}
    .meclis-msg--user{background:rgba(245,166,35,.12);margin-left:auto;text-align:right;}
    .meclis-dialog-input-row{display:flex;gap:8px;}
    .meclis-input,.meclis-dialog-input,.meclis-elle-textarea{flex:1;background:rgba(255,255,255,.03);border:1px solid var(--border);border-radius:10px;padding:10px 12px;color:var(--text,#EAE2D6);font-size:13px;font-family:inherit;}
    .meclis-elle-textarea{width:100%;resize:vertical;margin:10px 0;}
    .meclis-dismiss{width:100%;background:none;border:0;color:var(--text-dim);font-size:12px;padding:10px;cursor:pointer;margin-top:6px;}

    /* Kanıt / Derinlik / Ceremony — değişmedi */
    .meclis-kanit-list{margin:10px 0;max-height:160px;overflow-y:auto;}
    .meclis-kanit-item{font-size:12px;padding:6px 0;border-bottom:1px solid var(--border);}
    .meclis-kanit-date{color:var(--text-dim);font-size:10px;margin-right:8px;}
    .meclis-derinlik-row{display:flex;justify-content:space-between;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border);}
    .meclis-dir-up .meclis-derinlik-shift{color:var(--gold,#F5A623);}
    .meclis-derinlik-win{text-align:center;color:var(--gold,#F5A623);font-size:12px;margin-top:10px;}
    .meclis-ceremony{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(8,6,4,.7);opacity:0;transition:opacity .4s;z-index:var(--z-meclis-toren);pointer-events:none;}
    .meclis-ceremony.show{opacity:1;}
    .meclis-ceremony-inner{text-align:center;}
    .meclis-ceremony-sigil{font-size:32px;color:var(--gold,#F5A623);}
    .meclis-ceremony-name{font-size:22px;margin-top:8px;}
    .meclis-ceremony-sub{font-size:11px;color:var(--text-dim);letter-spacing:2px;margin-top:4px;}

    @media (prefers-reduced-motion:reduce){
      .meclis-flip,.meclis-grid-card,.meclis-seat,.meclis-ceremony{transition:none!important;}
    }
  `;
  const style = document.createElement('style');
  style.id = 'meclis-style';
  style.textContent = css;
  document.head.appendChild(style);
}
