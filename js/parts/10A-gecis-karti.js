/* ═══════════════════════════════════════════════════════════════════
   10A — GEÇİŞ KARTIM · Sıralı Tören (Altın → Sunum → Lapis → Sunum)
   (Ad senkronu §4.3 — iç ad = görünen ad: önek gk·, state _gecisKartlari,
   dosya gecis-karti. Kullanıcının GERÇEK verisini tutan iki katmanın göçü
   ayrı: storage etw_an_kartlari_v2 → geri-okumalı taşıma, tablo
   benim_kartlarim → gecis_kartlarim (mig 039, ELLE uygulanır))
   ───────────────────────────────────────────────────────────────────
   FELSEFE: "Mesele Sensin — olduğun kişiyi değiştir."
   DERİN METAFOR (TASARIM-PRENSIPLERI §0.1) — bu modül İKİ sahne taşır ve
   her sahne TEK metafor konuşur (ikisi bir arada bağırmaz):
     • Atölye / masa (gkOpenDetail) → KAP. Kapalı sıcak yüzey, ocak ışığı,
       içeri alan çerçeve; burada çalışılır, acele ettirilmez.
     • Tamamlanma töreni (_completionCeremony) → DÖNÜŞÜM. Kartın altına
       yanışı, mertebe, mühür; burada bir şey artık başka bir şeydir.
   KULLANICIYA: "Geçiş Kartım" — kullanıcının kendi kartını oluşturduğu
   TEK alan; önde de arkada da. Yaratım sahnesi ATÖLYE adıyla anılır.
   İKİ KAPI, TEK KART:
     • BUGÜN kapısı  — ws-greet-hero input'una bir an yazılır →
                        Atölye'de iki kutuplu Geçiş Kartım doğar.
     • SOHBET kapısı — Wanderer'ın bir cümlesi dokunur, "Hadi böyle
                        bir kişi oluşturalım →" chip'i tıklanır →
                        aynı Atölye'de aynı iki kutuplu Geçiş Kartım doğar.
   Kart bir kez doğdu mu kaynağı (source: 'bugun'|'sohbet') metaya yazılır
   ama şema, akış, ritüel TEK'tir. Eski "İlham Kartı" diye anılan tek
   kutuplu yaratım sahnesi 2026-06-21'de bu iki kutuplu omurgada birleşti.
   Üç Mühür kitabın 365 günlük büyük yolu; bu modül onun ANLIK kuzeni.
   Bir an gelir, "Şu an X'im" denilmesi gerekir, hemen ardından
   "Şimdi Y olmam gerek" denilmelidir. Bu kart o cümlenin görsel hâli.

   VİZYON (Emre · 3. iterasyon — Sıralı Tören):
   ───────────────────────────────────────────────────────────────────
   Kullanıcı nasıl bir durumda olduğunu yazar (ws-greet-hero input).
   Sonra şu sırayla yürür — kabul etmek önce, hedefi görmek sonra:

     1) LOADING-ALTIN  — Wanderer cümleyi okur
     2) ATÖLYE-ALTIN   — 4 kategoride öneri (DÜŞ/İNANÇ/DUYGU/DAVRANIŞ);
                         kullanıcı çıkarır, ekler, isim/whisper düzenler,
                         "Şu Anlık Olduğum Bu" der
     3) SUNUM-ALTIN    — altın kart tam sahne: "Şu anlık olduğun kişi bu"
     4) LOADING-LAPİS  — altın kartı referansla Wanderer tersini çizer
     5) SUNUM-LAPİS    — lapis kart tam sahne: "Olman gereken kişi bu"
                         → "Bu Yol Benim" → aktif kart, KİŞİLERİM destesinde

   4.0 — "MÜHÜR TIKLAMAYLA DÜŞMEZ" (2026-08-10):
   ───────────────────────────────────────────────────────────────────
   Üç anlık vuruş (GÖRDÜN · YÜRÜDÜN · OLDUM) SÖKÜLDÜ. Üç tık bir kimlik
   beyanıydı ve kanıt sormuyordu — §6.10'un ("kanıtı olmayan değer
   yoktur") doğrudan ihlali; aynı hata Oluş Sınaması'nda 2026-08-03'te
   zaten onarılmıştı, geçiş kartı o onarımın dışında kalmıştı. Mühür
   artık kanıtla düşer: masadaki kapı 10q4'ün sınamasını çağırır, hüküm
   kanıtlı boyut sayısındandır. Tören (_completionCeremony) ölmedi —
   yalnız tetikleyicisi değişti.
   `k.strikes` alanı SİLİNMEDİ: okunmaz ama kullanıcının diskinde ve
   gecis_kartlarim tablosunda durur (§4.3 madde 4 — okumayı bırakmak
   veri kaybı değildir, silmek olurdu).

   3.0 — "TEK DESTE, İKİ KUTUP" (2026-07-26):
   ───────────────────────────────────────────────────────────────────
   Bugün'deki ayrı şerit (#gk-bugun-strip) KALDIRILDI. Bu modül artık
   Bugün'de hiçbir şey ÇİZMEZ; kartın iki kutbu KİŞİLERİM'in (10q2) iki
   destesinin başında yaşar, köprü de o iki desteyi bağlar.
   Buradan dışarı yalnız MALZEME verilir: gkActiveCards / gkCompletedCards /
   gkPoleFace (+ köprünün ışığı gkOpenDetail'i çağırır). Halka artık dışarı
   verilmez — tek yeri masanın ortası. Yüzeyi tek yerde toplamanın bedeli:
   kart doğunca tazelenen şey window.yolRenderHero'dur — gkRenderYolHero
   diye bir şey yoktur.

   ws-greet-hero input modu (besleme):
     • Aktif yol yokken → ihtiyaç tohumu → Atölye (sıralı tören)
     • Aktif yol varken → input ALTIN kartı besler (fark etmek = ayna).
       Kategori chip satırı altın'a yazar.

   2.0 — "TEK NEFES, GERÇEK OMURGA" (2026-07-02):
   ───────────────────────────────────────────────────────────────────
   • TEK NEFES: iki kutup TEK LLM çağrısında doğar (_designDual);
     tören sırası aynen (kabul önce, hedef sonra) — S4 artık ağ değil
     sahne temposu. Kullanıcı altını atölyede ANLAMLI değiştirdiyse
     (_needsLapisRefresh) lapis, onaylı altından yeniden çizilir.
   • SUNUCU OMURGASI: kartlar gecis_kartlarim tablosunda kart-başına satır
     (mig 025 + 027 rename). KV (etw_an_kartlari_v2) offline tamponu + ayna olarak
     yazılmaya devam eder; okuma tablo-birincil, tablo boşsa KV'den
     tek seferlik göç. Tablo yoksa (migration koşmadı) sessiz KV modu.
   • DAMARLAR: mühür günü recordActivityDay() ile merkez seriyi besler;
     tamamlanma → imEvent('gecis_karti') — Kimlik Motoru olay defterine
     düşer. (Vuruş başına damar 4.0'da kesildi: tık kanıt değildi.)
   • Paylaşımlar kind:'benim' yazar; rumuz artık sunucu mührü (mig 025).

   Görsel dil → TASARIM-PRENSIPLERI.md
   12c kart motoru tek doğruluk; ayrı kart stili yazılmaz.
   ═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { SUMMARY_MODEL, sb } from '../config.js';
import { SafeStorage, showToast, recordActivityDay } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { p } from './16-i18n-prompts.js';
import { callLLM } from './04-llm-hero-history.js';
import { kumEnsureSpec, kumHeuristicSpec } from './12d-kart-uretim.js';

/* ── Kategori şeması — Portre (02c) ile birebir aynı ─────────────
   Metinler i18n'den; modül-yükünde donmasın diye çözücüler fonksiyon. */
const CATS = [
  { key: 'dusunceler',  sigil: '☉' },
  { key: 'inanclar',    sigil: '✷' },
  { key: 'duygular',    sigil: '❍' },
  { key: 'davranislar', sigil: '✺' },
];
const CAT_KEYS = CATS.map(c => c.key);

/* i18n çözücüler (render anında t() çağırır) */
const gkCatLabel   = k  => t('gk.label.' + k);
const gkCatBadge   = k  => t('gk.cat.' + k + '.badge');
const gkPhGold     = k  => t('gk.cat.' + k + '.ph_gold');
const gkPhLapis    = k  => t('gk.cat.' + k + '.ph_lapis');

const STORAGE_KEY = 'etw_gecis_kartlari_v1';
const _gkKey = () => `${STORAGE_KEY}_${S.currentUser?.id || 'anon'}`;
/* Eski anahtarlar — YENİDEN ESKİYE sıralı, yalnız geri-okuma için:
   [0] "Benim Kartım" dönemi (ad senkronu §4.3 öncesi, iki kutuplu şema)
   [1] ondan önceki tek-kutuplu ilk sürüm (_migrateIfV1 ile dönüştürülür)
   Hiçbiri silinmez; taşıma gkLoad'da kanıtlanır (yeni anahtara yazılır). */
const _OLD_STORAGE_KEYS = ['etw_an_kartlari_v2', 'etw_an_kartlari_v1'];
const _gkOldKeys = () => _OLD_STORAGE_KEYS.map(k => `${k}_${S.currentUser?.id || 'anon'}`);

const NOW = () => new Date().toISOString();
const NEWID = () => 'gk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ══════════════════════════════════════════════════════════════
   KALICILIK — çift yazım: KV ayna (hep) + gecis_kartlarim satırı (kirli olan)
   ───────────────────────────────────────────────────────────
   gkSave(k) — k verilirse o kart "kirli" işaretlenir ve debounce'la
   tabloya upsert edilir. k verilmezse yalnız KV aynası yazılır
   (hydrate sonrası ayna tazeleme gibi durumlar — remote'a dokunmaz).
══════════════════════════════════════════════════════════════ */
export function gkSave(changed) {
  try {
    SafeStorage.setRaw(_gkKey(), JSON.stringify({
      kartlar: S._gecisKartlari || [],
      aktif:   S._gecisKartiAktif || null,
    }));
  } catch (e) { console.warn('gkSave:', e?.message); }
  if (changed && changed.id) {
    _gkDirty.add(changed.id);
    _gkScheduleFlush();
  }
}

export function gkLoad() {
  try {
    let raw = SafeStorage.getRaw(_gkKey());
    if (raw == null) {                       // ad senkronu: eski adlardan geri-oku
      for (const eski of _gkOldKeys()) {
        raw = SafeStorage.getRaw(eski);
        if (raw != null) break;
      }
    }
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    // v1 → v2 migrate: eski tek-kutuplu kartları "tamamlanmış" sayıp koleksiyona kaydet
    const list = Array.isArray(parsed.kartlar) ? parsed.kartlar : [];
    S._gecisKartlari = list.map(_migrateIfV1);
    S._gecisKartiAktif = parsed.aktif || null;
    // v1 anahtarda kalanlar varsa yeni anahtara da yaz (kayıp önle)
    if (SafeStorage.getRaw(_gkKey()) == null) gkSave();
  } catch (e) { console.warn('gkLoad:', e?.message); }
}

/* ══════════════════════════════════════════════════════════════
   SUNUCU OMURGASI — gecis_kartlarim (mig 025'te an_kartlari doğdu,
   mig 027'de benim_kartlarim oldu, mig 039'da ad senkronuyla bugünkü
   adını aldı)
   ───────────────────────────────────────────────────────────
   Ad çözümleme: hidrasyon önce yeni adı dener; 42P01 gelirse (mig 039
   henüz koşmadı) eski adlara YENİDEN ESKİYE sırayla düşülür ve tutan ad
   oturum boyu kullanılır. Hiçbiri yoksa sessiz KV moduna geçilir; hiçbir
   akış kırılmaz. Migration ELLE iştir — deploy edilmiş VARSAYILMAZ.
   Kirli kartlar upsert başarısız olursa kirli KALIR — sonraki flush
   yeniden dener.
══════════════════════════════════════════════════════════════ */
const GK_TABLE = 'gecis_kartlarim';
const GK_TABLE_LEGACY = ['benim_kartlarim', 'an_kartlari']; // mig 039 / 027 koşmadıysa
let _gkTable = GK_TABLE;
const _gkDirty = new Set();
let _gkRemoteOk = true;
/* `sinav` kolonu tabloda var mı? İyimser başlar; ilk 42703'te kapanır ve
   oturum boyu kapalı kalır (ELLE migration uygulanınca yeni oturumda açılır).
   Kolon yokken sınav KV'de yaşamaya devam eder — veri kaybı yok, yalnız
   cihazlar arası taşınmaz. */
let _gkSinavKolonu = true;
let _gkFlushTimer = null;

function _gkRemoteErr(error) {
  if (error?.code === '42P01') _gkRemoteOk = false; // tablo yok → KV modu
  console.warn('gkRemote:', error?.message || error);
}

export function _rowFromKart(k, uid) {
  return {
    id: k.id, user_id: uid,
    ihtiyac: String(k.ihtiyac || '').slice(0, 280),
    source:  k.source || 'bugun',
    golden:  k.golden || null,
    lapis:   k.lapis  || null,
    /* MİRAS ALAN — üç vuruş 2026-08-10'da söküldü (mühür artık sınamayla
       düşer). Hiçbir yerde okunmaz ama gidiş-dönüşte KORUNUR: kullanıcının
       diskindeki ve tablodaki geçmiş kayıt üstüne null yazmayalım (§4.3
       madde 4 — okumayı bırakmak veri kaybı değildir, silmek olurdu). */
    strikes: k.strikes || { gordun: false, yurudun: false, oldum: false },
    /* Geçiş Sınaması'nın kaydı — 7 günlük dinlenme buna bakar. Kolon
       migration'la gelir; henüz koşmadıysa `_gkSinavKolonu` false'a düşer
       ve satır sınavsız yazılır (bkz. _gkFlushDirty). */
    ...(_gkSinavKolonu ? { sinav: k.sinav || null } : {}),
    state:   k.state || 'active',
    shared:  !!k.shared,
    share_id: k.share_id || null,
    created_at: k.created_at || NOW(),
    updated_at: k.updated_at || NOW(),
    sealed_at:  k.sealed_at || null,
  };
}

export function _kartFromRow(r) {
  return {
    id: r.id,
    ihtiyac: r.ihtiyac || '',
    source:  r.source || 'bugun',
    golden:  r.golden || null,
    lapis:   r.lapis  || null,
    strikes: (r.strikes && typeof r.strikes === 'object')
      ? { gordun: !!r.strikes.gordun, yurudun: !!r.strikes.yurudun, oldum: !!r.strikes.oldum }
      : { gordun: false, yurudun: false, oldum: false },
    sinav:   (r.sinav && typeof r.sinav === 'object') ? r.sinav : null,
    state:   ['active', 'completed', 'abandoned'].includes(r.state) ? r.state : 'completed',
    shared:  !!r.shared,
    share_id: r.share_id || null,
    created_at: r.created_at || NOW(),
    updated_at: r.updated_at || NOW(),
    sealed_at:  r.sealed_at || null,
  };
}

function _gkScheduleFlush() {
  if (!_gkRemoteOk) return;
  clearTimeout(_gkFlushTimer);
  _gkFlushTimer = setTimeout(() => { _gkFlushDirty(); }, 800);
}

async function _gkFlushDirty() {
  const uid = S.currentUser?.id;
  if (!sb || !uid || !_gkRemoteOk || !_gkDirty.size) return;
  const rows = (S._gecisKartlari || [])
    .filter(k => k && _gkDirty.has(k.id))
    .map(k => _rowFromKart(k, uid));
  if (!rows.length) { _gkDirty.clear(); return; }
  try {
    let { error } = await sb.from(_gkTable).upsert(rows);
    // `sinav` kolonu migration'la gelir (000_wanderer_schema §4.10). Henüz
    // koşmadıysa Postgres 42703 döner ve BÜTÜN satır yazılamazdı — yeni bir
    // alan yüzünden kartın kendisini kaybetmek kabul edilemez. Bir kez düş,
    // sınavsız yeniden yaz; sınav o oturumda cihazda kalır (KV'de duruyor).
    if (error?.code === '42703' && _gkSinavKolonu) {
      _gkSinavKolonu = false;
      console.warn('gkFlush: `sinav` kolonu yok — migration bekliyor, satır sınavsız yazılıyor.');
      const sade = (S._gecisKartlari || []).filter(k => k && _gkDirty.has(k.id))
        .map(k => _rowFromKart(k, uid));
      ({ error } = await sb.from(_gkTable).upsert(sade));
    }
    if (error) { _gkRemoteErr(error); return; }
    rows.forEach(r => _gkDirty.delete(r.id));
  } catch (e) { console.warn('gkFlush:', e?.message); }
}

/* Post-auth hidrasyon: tablo birincil; tablo boş + KV dolu → tek seferlik göç.
   true dönerse bellek tablodan tazelendi (render'lar yenilenmeli). */
export async function _gkHydrateRemote() {
  const uid = S.currentUser?.id;
  if (!sb || !uid || !_gkRemoteOk) return false;
  try {
    let { data, error } = await sb.from(_gkTable)
      .select('*').eq('user_id', uid)
      .order('created_at', { ascending: true });
    // Yeni ad yoksa (mig 039 koşmadı) eski adları sırayla dene — tutan ad
    // oturum boyu kalıcı; 42P01 dışı bir hatada denemeyi bırak.
    if (error?.code === '42P01') {
      for (const eski of GK_TABLE_LEGACY) {
        if (_gkTable === eski) continue;
        _gkTable = eski;
        ({ data, error } = await sb.from(_gkTable)
          .select('*').eq('user_id', uid)
          .order('created_at', { ascending: true }));
        if (!error || error.code !== '42P01') break;
      }
    }
    if (error) { _gkRemoteErr(error); return false; }

    if (Array.isArray(data) && data.length) {
      /* Sınav kaydı cihazda DA yaşar: `sinav` kolonu migration'la gelir ve
         henüz koşmadıysa tablodan boş döner. Tablo-birincil okuma o boşluğu
         KV'nin üstüne yazsaydı 7 günlük dinlenme her hidrasyonda sıfırlanır,
         kullanıcı sınamayı sınırsız tekrarlardı. Tablo susuyorsa bellekteki
         kayıt korunur — kolon geldiği gün tablo doğal olarak öne geçer. */
      const yerel = new Map((S._gecisKartlari || []).map(k => [k && k.id, k && k.sinav]));
      S._gecisKartlari = data.map(r => {
        const k = _kartFromRow(r);
        if (!k.sinav && yerel.get(k.id)) k.sinav = yerel.get(k.id);
        return k;
      });
      // Aktif işaretçi: KV'deki id tabloda hâlâ aktifse koru; değilse en yeni aktif
      const actives = S._gecisKartlari.filter(k => k.state === 'active');
      if (!actives.some(k => k.id === S._gecisKartiAktif)) {
        S._gecisKartiAktif = actives.length ? actives[actives.length - 1].id : null;
      }
      gkSave(); // KV aynasını tazele (arg yok → remote'a geri yazmaz)
      return true;
    }

    // Tablo boş — KV'de kart varsa yeni omurgaya göç (idempotent: PK upsert)
    if (Array.isArray(S._gecisKartlari) && S._gecisKartlari.length) {
      const rows = S._gecisKartlari.map(k => _rowFromKart(k, uid));
      const { error: e2 } = await sb.from(_gkTable).upsert(rows);
      if (e2) _gkRemoteErr(e2);
    }
    return false;
  } catch (e) { console.warn('gkHydrate:', e?.message); return false; }
}

export function _migrateIfV1(k) {
  if (!k || typeof k !== 'object') return k;
  if (k.golden || k.lapis) return k; // zaten v2
  // v1: { dusunceler, inanclar, duygular, davranislar, baslik, whisper, sealed... }
  const v2 = {
    id: k.id || NEWID(),
    ihtiyac: k.ihtiyac || '',
    golden: {
      baslik: k.baslik || t('gk.fallback.now_person'),
      whisper: k.whisper || '',
      dusunceler: Array.isArray(k.dusunceler) ? k.dusunceler : [],
      inanclar:   Array.isArray(k.inanclar)   ? k.inanclar   : [],
      duygular:   Array.isArray(k.duygular)   ? k.duygular   : [],
      davranislar:Array.isArray(k.davranislar)? k.davranislar: [],
    },
    lapis: null,                          // v1'de yoktu — söndü sayılır
    strikes: { gordun: false, yurudun: false, oldum: false },
    state: k.sealed ? 'completed' : 'active',
    created_at: k.created_at || NOW(),
    updated_at: k.updated_at || NOW(),
    sealed_at:  k.sealed_at || null,
  };
  // v1 aktif kartlar lapise sahip değil → kullanılamaz; "completed" işaretle
  if (!v2.lapis) v2.state = 'completed';
  return v2;
}

function _getActive() {
  if (!S._gecisKartiAktif || !Array.isArray(S._gecisKartlari)) return null;
  return S._gecisKartlari.find(k => k.id === S._gecisKartiAktif && k.state === 'active') || null;
}

function emptyPole() {
  return {
    baslik: '', whisper: '',
    dusunceler: [], inanclar: [], duygular: [], davranislar: [],
  };
}
export function emptyKart(ihtiyac, source = 'bugun') {
  return {
    id: NEWID(),
    ihtiyac: String(ihtiyac || '').slice(0, 280),
    source: source === 'sohbet' ? 'sohbet' : 'bugun',
    golden: emptyPole(),
    lapis:  emptyPole(),
    strikes: { gordun: false, yurudun: false, oldum: false },
    shared: false,
    share_id: null,
    state: 'active',
    created_at: NOW(),
    updated_at: NOW(),
    sealed_at: null,
  };
}

/* Aynı/çok-benzer madde varsa eklemez. */
export function _addEntry(pole, cat, text, src = 'user') {
  if (!CAT_KEYS.includes(cat)) return false;
  const clean = String(text || '').trim().replace(/\s+/g, ' ').slice(0, 200);
  if (clean.length < 2) return false;
  if (!Array.isArray(pole[cat])) pole[cat] = [];
  const norm = s => s.toLocaleLowerCase('tr').replace(/[.,!?;:"'…]/g, '').trim();
  if (pole[cat].some(e => norm(e.text) === norm(clean))) return false;
  pole[cat].push({ text: clean, src, at: NOW() });
  return true;
}

/* ══════════════════════════════════════════════════════════════
   LLM — ihtiyaç tohumundan ALTIN tasarım + anti-LAPİS tasarımı
══════════════════════════════════════════════════════════════ */
function _portreContextShort() {
  const c = S._portre;
  if (!c || !c.confirmed) return '';
  const last = k => (c[k] || []).slice(-3).map(e => e.text).join('; ');
  return [
    c.baslik ? `Kullanıcı kendini "${c.baslik}" olarak tanıyor.` : '',
    `Son düşünceler: ${last('dusunceler') || '—'}`,
    `Son inançlar: ${last('inanclar') || '—'}`,
    `Son duygular: ${last('duygular') || '—'}`,
    `Son davranışlar: ${last('davranislar') || '—'}`,
  ].filter(Boolean).join('\n');
}

/* Kullanıcının BÜTÜNÜ — üç mevcut motordan derlenir, ikizleri yazılmaz:
     · Benlik Kartı  → _portreContextShort() (yukarıda)
     · Yaşam hafızası → 09a p6GetLifeMemoryContext (köken kapılı: kanıtsız
       kayıt zaten girmez — §6.10)
     · İlişki derinliği → 09a p5GetRelationshipContext (tonun sınırı)
   window.* üzerinden savunmacı okunur: 09a import edilirse 10A ↔ 09a
   döngüsel bağımlılığı doğar; biri yoksa o satır düşer, prompt yine kurulur. */
function _userContextFull() {
  const parts = [_portreContextShort()];
  try { const lm = window.p6GetLifeMemoryContext?.(); if (lm) parts.push(String(lm)); } catch (_) {}
  try { const rl = window.p5GetRelationshipContext?.(); if (rl) parts.push(String(rl)); } catch (_) {}
  return parts.filter(Boolean).join('\n\n').slice(0, 1800);
}

// Yönlendirme sözlükte (16b) — canlı hâli admin "Emre'nin Sesi" odasından gelebilir.
const DESIGN_SYSTEM = () => p('prompt.gecis_karti.design_system');

/* ── TEK NEFES prompt'u — iki kutup tek JSON'da ───────────────────────
   Altın (şu anlık olduğun) + lapis (olman gereken, altının antitezi)
   tek çağrıda doğar; tören sırası client sahnelerinde korunur. */
function _designDualPrompt(ihtiyac, ctx = {}) {
  const ben = _userContextFull();
  const sohbet = ctx.source === 'sohbet';
  // Sohbet kapısında elimizdeki metin WANDERER'IN CEVABIDIR, kullanıcının
  // cümlesi değil. Eskiden ikisi de "kullanıcının durum cümlesi" diye
  // sunuluyordu — model kullanıcıyı hiç görmeden kişi kurmaya çalışıyor,
  // dört boyuttan yalnız birini doldurabiliyordu.
  const an = String(ctx.fullText || ihtiyac || '').slice(0, 4000);
  const kendi = String(ctx.chatContext || '').slice(0, 900);
  return [
    ...(sohbet ? [
      ...(kendi ? ['KULLANICININ KENDİ SÖZLERİ (sohbetteki son dönüş — kartın kökeni):', kendi, ''] : []),
      'WANDERER\'IN O ANA VERDİĞİ CEVAP (kartın doğduğu an — TAMAMI):',
      an,
      '',
      'Kartı KULLANICI için tasarla: bu cevabın işaret ettiği kişi kullanıcıdır,',
      'Wanderer değil.',
    ] : [
      'KULLANICININ ŞU ANKİ DURUM CÜMLESİ:',
      an,
    ]),
    '',
    ben ? 'KULLANICI HAKKINDA BİLİNENLER (isabet için — uydurmaya izin DEĞİL):' : '',
    ben,
    '',
    'İKİ kişiyi birden tasarla:',
    '1) "golden" — bu cümleye göre kullanıcının ŞU ANLIK olduğu kişi.',
    '   YARGILAMA: bu kişi kötü değil — şu an böyle; fark etmek dönüşümün başıdır.',
    '2) "lapis" — o kişinin TAM TERSİ: şimdi olması gereken kişi.',
    '   Lapis ad altının antitezi olsun: "Korkuyla Bekleyen" ↔ "Cesaretle Olan",',
    '   "Affetmeyen Yargıç" ↔ "Bağışlayan Tanık" gibi.',
    '   Lapis\'te her madde, golden\'daki AYNI SIRALI maddenin kırılışı olsun.',
    '   Lapis davranışları SOMUT eylem ("derin nefes al", "5dk sus", "bir cümle özür dile").',
    '',
    'JSON şeması:',
    '{',
    '  "golden": {',
    '    "baslik":  "2-4 kelimelik şiirsel ad — şu anki kişi",',
    '    "whisper": "tek cümle italik fısıltı",',
    '    "dusunceler":  ["şu anki düşünce 1", "..."],',
    '    "inanclar":    ["şu anki inanç 1", "..."],',
    '    "duygular":    ["şu anki duygu 1", "..."],',
    '    "davranislar": ["şu anki davranış 1", "..."]',
    '  },',
    '  "lapis": {',
    '    "baslik":  "2-4 kelimelik şiirsel ad — olman gereken kişi",',
    '    "whisper": "tek cümle italik fısıltı (lapis için)",',
    '    "dusunceler":  ["hedef düşünce 1", "..."],',
    '    "inanclar":    ["hedef inanç 1", "..."],',
    '    "duygular":    ["hedef duygu 1", "..."],',
    '    "davranislar": ["somut hedef davranış 1", "..."]',
    '  }',
    '}',
    'Her dizi 3-5 madde. Her madde "ben" diliyle, kısa, somut.',
    // Dil kilidi son satırda (recency): reasoning modeli üretimden hemen önce görsün.
    '⚠ DİL: iki kutbun da baslik, whisper ve TÜM maddeleri İSTİSNASIZ',
    'kullanıcının dilinde olacak.',
  ].join('\n');
}

/* ── LAPİS tasarım prompt'u — altının antitezi ───────────────────────── */
function _designLapisPrompt(goldenPole, ihtiyac) {
  const cat = (k) => (goldenPole[k] || []).map(e =>
    typeof e === 'string' ? e : (e?.text || '')
  ).filter(Boolean).join(' · ') || '—';
  return [
    'KULLANICININ DURUM CÜMLESİ:',
    String(ihtiyac).slice(0, 400),
    '',
    'KULLANICININ ŞU ANKİ HÂLİ (ALTIN KART — onaylı):',
    `Ad: "${goldenPole.baslik || t('gk.fallback.now_person', 'Olunan Kişi')}"`,
    `Whisper: ${goldenPole.whisper || '—'}`,
    `Düşünceler: ${cat('dusunceler')}`,
    `İnançlar: ${cat('inanclar')}`,
    `Duygular: ${cat('duygular')}`,
    `Davranışlar: ${cat('davranislar')}`,
    '',
    'Şimdi bu kişinin TAM TERSİNİ — şimdi olması gereken kişiyi — 4 kategoride tasarla.',
    'Lapis ad altının antitezi olsun: "Korkuyla Bekleyen" ↔ "Cesaretle Olan", ',
    '"Affetmeyen Yargıç" ↔ "Bağışlayan Tanık" gibi.',
    'Her madde altın listesindeki AYNI sıralı maddenin kırılışı olsun.',
    'Davranışlar SOMUT eylem olsun ("derin nefes al", "5dk sus", "bir cümle özür dile").',
    '',
    'JSON şeması:',
    '{',
    '  "baslik":  "2-4 kelimelik şiirsel ad — olman gereken kişi",',
    '  "whisper": "tek cümle italik fısıltı (lapis için)",',
    '  "dusunceler":  ["hedef düşünce 1", "..."],',
    '  "inanclar":    ["hedef inanç 1", "..."],',
    '  "duygular":    ["hedef duygu 1", "..."],',
    '  "davranislar": ["somut hedef davranış 1", "..."]',
    '}',
    'Her dizi 3-5 madde.',
    // KRİTİK: antitez/"tam tersi" görevinde model dili kaydırabiliyor; kilidi son satıra koy.
    '⚠ DİL: altın kartla AYNI dilde yaz; bu lapis kartının da baslik, whisper ve TÜM',
    'maddeleri İSTİSNASIZ kullanıcının dilinde olacak.',
  ].join('\n');
}

/* ── Promise.race timeout'lu callLLM sarmalı ──────────────────────────
   callLLM önce `await sb.auth.getSession()` yapar; orada askıda kalırsa
   AbortController fetch'e hiç ulaşmaz. Bu yüzden duvar-saati timeout'u
   Promise.race ile koyuyoruz. */
async function _llmJSON(prompt, ms = 18000, maxTokens = 600) {
  const controller = new AbortController();
  const timer = setTimeout(() => { try { controller.abort(); } catch (_) {} }, ms);
  const llmPromise = (async () => {
    const raw = await callLLM({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemPrompt: DESIGN_SYSTEM(),
      maxTokens, temperature: 0.55, jsonMode: true,
      model: SUMMARY_MODEL, skipPersona: true,
      signal: controller.signal,
    });
    return JSON.parse(raw);
  })();
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('gk-timeout')), ms));
  try { return await Promise.race([llmPromise, timeoutPromise]); }
  finally { clearTimeout(timer); try { controller.abort(); } catch (_) {} }
}

/* Tek Nefes — iki kutup tek çağrıda; TEK tasarım motoru (sohbet kapısı
   gkDesignForChat üzerinden buraya gelir, ikiz motor yok).
   Altın kurulamazsa NULL döner: sahte kart çizilmez, çağıran ya "Ocak
   soğudu" sahnesini gösterir (Bugün) ya da hiç davet etmez (Sohbet).
   Lapis ayrı: çözülemezse null kalır, akış S4'te _designLapis'e düşer
   (altın onaylıyken töreni yarıda kesmek anlamsız — katmanlı emniyet).
   Timeout 45 sn: reasoning modelinin doğal gecikmesi ~25 sn
   ([[sohbet-reasoning-fix]]); eski 22 sn sınırı her turda fallback'e
   düşürüyordu — Keynote'taki ekranın kökü buydu. */
async function _designDual(ihtiyac, ctx = {}) {
  try {
    const obj = await _llmJSON(_designDualPrompt(ihtiyac, ctx), 45000, 1200);
    const golden = _normalizePole(obj?.golden, '');
    if (!_poleHasSubstance(golden)) return null;
    const lapis = obj?.lapis
      ? _normalizePole(obj.lapis, t('gk.fallback.target_person'))
      : null;
    return { golden, lapis };
  } catch (e) {
    console.warn('gkDesignDual:', e?.message);
    return null;
  }
}

/* Dört boyut da kuruldu mu? — Emre'nin gördüğü kırığın panzehiri:
   model yalnız "Düşünceler"i doldurup diğer üçünü boş bırakırsa ortada
   kart yoktur. Bu bir GÜVEN eşiği değil (modelin öz-beyanı kapı olamaz —
   §6.10), maddelerin VARLIĞININ sayımıdır. */
function _poleHasSubstance(pole) {
  if (!pole || !String(pole.baslik || '').trim()) return false;
  return CAT_KEYS.every(k => Array.isArray(pole[k]) && pole[k].length >= 1);
}

/* ── SESSİZ OCAK — sohbet köprüsü (10B) için tasarım ──────────────────
   Davet, ancak demir tuttuysa gelir: bu çağrı kullanıcı HİÇBİR ŞEY
   istemeden, mesaj biter bitmez arka planda koşar. Kullanıcı beklemediği
   için timeout rahattır (reasoning modelinin doğal gecikmesi ~25 sn —
   [[sohbet-reasoning-fix]]; eski 22 sn'lik sınır her turda fallback'e
   düşürüyordu).
   FALLBACK YOK — bilinçli: tasarım kurulamadıysa null döner ve 10B hiçbir
   çerçeve çizmez. Kullanıcı tutulamayacak bir vaat görmez (§6.2). */
export async function gkDesignForChat(ihtiyac, ctx = {}) {
  return _designDual(ihtiyac, { ...ctx, source: 'sohbet' });
}

/* Atölye'de altın ANLAMLI değişti mi? — başlık farklıysa ya da seçilen
   madde kümesi öneriden saptıysa lapis bayat sayılır, tazelenir. */
export function _needsLapisRefresh(confirmed, proposed) {
  if (!proposed) return true;
  const norm = s => String(s || '').toLocaleLowerCase('tr')
    .replace(/[.,!?;:"'…]/g, '').replace(/\s+/g, ' ').trim();
  if (norm(confirmed?.baslik) !== norm(proposed?.baslik)) return true;
  for (const key of CAT_KEYS) {
    const a = (confirmed?.[key] || []).map(norm).filter(Boolean).sort();
    const b = (proposed?.[key]  || []).map(norm).filter(Boolean).sort();
    if (a.length !== b.length) return true;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
  }
  return false;
}

async function _designLapis(goldenPole, ihtiyac) {
  try {
    const obj = await _llmJSON(_designLapisPrompt(goldenPole, ihtiyac));
    return _normalizePole(obj, t('gk.fallback.target_person'));
  } catch (e) {
    console.warn('gkDesignLapis:', e?.message);
    return _fallbackLapis(goldenPole);
  }
}

export function _normalizePole(obj, fallbackTitle) {
  const cleanArr = a => (Array.isArray(a) ? a : [])
    .map(s => String(s || '').trim().slice(0, 200))
    .filter(s => s.length >= 2).slice(0, 6);
  return {
    baslik:      String(obj?.baslik || fallbackTitle).slice(0, 60),
    whisper:     String(obj?.whisper || '').slice(0, 140),
    dusunceler:  cleanArr(obj?.dusunceler),
    inanclar:    cleanArr(obj?.inanclar),
    duygular:    cleanArr(obj?.duygular),
    davranislar: cleanArr(obj?.davranislar),
  };
}

/* _fallbackGolden KALDIRILDI (2026-08-02): uydurma bir ad + kullanıcının
   kesik cümlesinden ibaret sahte altın kart üretiyordu ve tören onu "şu
   anlık olduğun kişi bu" diye sunuyordu. Altın kurulamazsa artık kart YOK:
   Sohbet'te davet hiç doğmaz, Bugün'de "Ocak soğudu" sahnesi çıkar.
   Lapis'in fallback'i AYRI ve bilinçli olarak duruyor — altın onaylanmışken
   töreni yarıda kesmek kullanıcının emeğini çöpe atardı. */
function _fallbackLapis(goldenPole) {
  const name = goldenPole?.baslik ? t('gk.fallback.not_x').replace('{x}', goldenPole.baslik) : t('gk.fallback.target_short');
  return {
    baslik: name, whisper: t('gk.fallback.lapis_whisper'),
    dusunceler: [], inanclar: [], duygular: [], davranislar: [],
  };
}

/* ══════════════════════════════════════════════════════════════
   ATÖLYE — SIRALI TÖREN (5 sahne)
   ───────────────────────────────────────────────────────────
   S1: Loading-Altın   → Wanderer cümleyi okur
   S2: Altın Atölyesi  → seç/sil/ekle/isim → "Şu Anlık Bu Benim"
   S3: Altın Sunum     → "Şu anlık olduğun kişi bu" (büyük 12c kart)
   S4: Loading-Lapis   → altını referansla tersini çizer
   S5: Lapis Sunum     → "Olman gereken kişi bu" → "Bu Yol Benim"
══════════════════════════════════════════════════════════════ */
let _overlayOpen = false;

/**
 * Atölye'yi aç — TEK yaratım sahnesi (Bugün ve Sohbet kapıları için ortak).
 * @param {string} ihtiyac — EKRANDA görünen kısa an (Bugün: kullanıcının yazdığı;
 *   Sohbet: mesajdan alınan alıntı). Karta da bu 280 char'lık hâl yazılır.
 * @param {{source?:'bugun'|'sohbet', fullText?:string, chatContext?:string,
 *          preDesigned?:{golden:object,lapis:object|null}}} [opts]
 *   fullText: modele giden TAM metin (sohbette Wanderer'ın cevabının tamamı).
 *   chatContext: kullanıcının kendi son sözleri — kartın kökeni (§6.10).
 *   preDesigned: sohbette davetten ÖNCE kurulmuş tasarım (gkDesignForChat);
 *     varsa ağ beklenmez, S1 yalnız tören nefesi olur.
 */
export async function gkOnboard(ihtiyac, opts = {}) {
  if (_overlayOpen) return;
  _overlayOpen = true;
  const source = opts.source === 'sohbet' ? 'sohbet' : 'bugun';

  const overlay = document.createElement('div');
  overlay.className = 'onb-ritual sc-onb gk-onb atl-onb';
  overlay.id = 'gk-onb';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  // Atmosfer katmanları sahne değişimlerinde YAŞAR (host'un dışında):
  // köz tarlası + gren + omurga + su perdesi (lapis sahnelerde yükselir)
  overlay.innerHTML = `
    <div class="atl-atmo" aria-hidden="true">
      <div class="atl-ember"></div>
      <div class="atl-grain"></div>
      <div class="atl-spine"></div>
      <div class="atl-veil"></div>
    </div>
    <div class="atl-host"></div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('onb-open'));
  try { window.fxCue && window.fxCue('whoosh'); } catch (_) {}

  const ctx = { cancelled: false, ihtiyac, source, overlay };
  // Modele giden bağlam — ekranda görünen kısa alıntıdan AYRI (bkz. 10B):
  // ihtiyac gösterilir, designCtx tasarlanır.
  const designCtx = {
    source,
    fullText:    String(opts.fullText || '').slice(0, 4000),
    chatContext: String(opts.chatContext || '').slice(0, 900),
  };
  const needLabel  = source === 'sohbet' ? t('gk.need_label_sohbet') : t('gk.need_label_bugun');
  const loadTitle  = source === 'sohbet' ? t('gk.load_title_sohbet') : t('gk.load_title_bugun');

  let _closing = false;
  function closeAll(opts = {}) {
    if (_closing) return;            // çift-tetiklemeye karşı (bayat listener vb.)
    _closing = true;
    overlay.classList.add('onb-closing');
    setTimeout(() => {
      overlay.remove();
      _overlayOpen = false;
      try { window.llmHomeCascade?.(); } catch (_) {}
      if (opts.afterRender) { try { window.yolRenderHero?.(); } catch (_) {} }
    }, 320);
  }

  /* ── S1: CEVHER — yazılan an ocağa sürülür ────────────────────
     Ocak tutana ya da kullanıcı vazgeçene kadar döner. Sahte kart YOK:
     demir tutmadıysa "Ocak soğudu" sahnesi çıkar (§6.2). */
  async function _forgeGolden() {
    for (;;) {
      _renderLoading(overlay, {
        palette: 'gold',
        kicker: t('gk.atolye_1_2'),
        title: loadTitle,
        need: ihtiyac,
        sub: t('gk.load_gold_sub'),
        step: 1,
        onCancel: () => { ctx.cancelled = true; closeAll(); },
      });
      const d = await _designDual(ihtiyac, designCtx);
      if (ctx.cancelled || !overlay.isConnected) return null;
      if (d) return d;
      const tekrar = await _renderForgeCold(overlay, {
        onCancel: () => { ctx.cancelled = true; closeAll(); },
      });
      if (!tekrar || ctx.cancelled || !overlay.isConnected) return null;
    }
  }

  // TEK NEFES — iki kutup tek çağrıda; lapis öneri olarak elde tutulur.
  // Sohbet kapısında tasarım ÇOKTAN yapılmıştır (gkDesignForChat, davetten
  // önce): ağ beklenmez, yalnız törenin nefesi korunur.
  let dual;
  if (opts.preDesigned?.golden) {
    _renderLoading(overlay, {
      palette: 'gold',
      kicker: t('gk.atolye_1_2'),
      title: loadTitle,
      need: ihtiyac,
      sub: t('gk.load_gold_sub'),
      step: 1,
      onCancel: () => { ctx.cancelled = true; closeAll(); },
    });
    const reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) await new Promise(r => setTimeout(r, 900));
    dual = { golden: opts.preDesigned.golden, lapis: opts.preDesigned.lapis || null };
  } else {
    dual = await _forgeGolden();
  }
  if (!dual || ctx.cancelled || !overlay.isConnected) { _overlayOpen = false; return; }
  const goldenDesign  = dual.golden;   // S2'de öneri (kullanıcı oynar)
  const proposedLapis = dual.lapis;    // altın değişmezse S5'e anında girer

  // ── S2: Altın Atölyesi ───────────────────────────────────────
  _renderGoldenReview(overlay, ihtiyac, goldenDesign, needLabel, {
    onCancel: () => { ctx.cancelled = true; closeAll(); },
    onConfirm: (confirmedGolden) => {
      // ── S3: TAV — altın kart sırttan yüze döner ───────────────
      _renderPresent(overlay, {
        palette: 'gold',
        kicker: t('gk.present_gold_kicker'),
        verdict: t('gk.present_gold_verdict'),
        pole: confirmedGolden,
        ctaLabel: t('gk.present_gold_cta'),
        step: 3,
        onCancel: () => { ctx.cancelled = true; closeAll(); },
        onCta: async () => {
          // ── S4: Loading-Lapis — ağ YA DA sahne temposu ──────────
          // Tek Nefes lapis'i elde; altın atölyede anlamlı değiştiyse
          // (isim/madde kümesi) bayat sayılır → onaylı altından tazelenir.
          let lapisDesign = proposedLapis;
          const stale = _needsLapisRefresh(confirmedGolden, goldenDesign);
          const showLapisLoading = () => _renderLoading(overlay, {
            palette: 'lapis',
            kicker: t('gk.atolye_2_2'),
            title: t('gk.load_lapis_title'),
            need: '',
            sub: t('gk.load_lapis_sub').replace('{name}', confirmedGolden.baslik || t('gk.fallback.now_person')),
            step: 4,
            onCancel: () => { ctx.cancelled = true; closeAll(); },
          });

          if (!lapisDesign || stale) {
            showLapisLoading();
            try { lapisDesign = await _designLapis(confirmedGolden, ihtiyac); }
            catch (_) { lapisDesign = _fallbackLapis(confirmedGolden); }
          } else {
            // Tören nefesi — ağ yok; sahne sırası korunur (reduced-motion atlar)
            const reduce = window.matchMedia &&
              window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            if (!reduce) {
              showLapisLoading();
              await new Promise(r => setTimeout(r, 900));
            }
          }
          if (ctx.cancelled || !overlay.isConnected) { _overlayOpen = false; return; }

          // ── S5: TAVLANMIŞ KART — lapis sunum ────────────────────
          _renderPresent(overlay, {
            palette: 'lapis',
            kicker: t('gk.present_lapis_kicker'),
            verdict: t('gk.present_lapis_verdict'),
            pole: lapisDesign,
            ctaLabel: t('gk.present_lapis_cta'),
            step: 5,
            onCancel: () => { ctx.cancelled = true; closeAll(); },
            onCta: () => {
              const kart = emptyKart(ihtiyac, source);
              kart.golden = _poleFromDesign(confirmedGolden);
              kart.lapis  = _poleFromDesign(lapisDesign);
              S._gecisKartlari = Array.isArray(S._gecisKartlari) ? S._gecisKartlari : [];
              S._gecisKartlari.push(kart);
              S._gecisKartiAktif = kart.id;
              _poleSahne(kart, 'golden');
              _poleSahne(kart, 'lapis');
              gkSave(kart);
              _feedSentez(kart);   // iki kutup, iki toplama akar (Üç Mühür)
              try { window.fxCue && window.fxCue('seal'); } catch (_) {}
              // MÜHÜR ANI — "Bu Yol Benim" damgası karta iner, yol doğar;
              // ardından S6: Soğuma · Halka Kapısı (paylaş ya da bende kalsın)
              _renderStampMoment(overlay, kart, () => {
                if (ctx.cancelled || !overlay.isConnected) { _overlayOpen = false; return; }
                _renderShareGate(overlay, kart, {
                  onSkip: () => closeAll({ afterRender: true }),
                  onShare: async () => {
                    try { await gkShare(kart.id); } catch (_) {}
                    closeAll({ afterRender: true });
                  },
                });
              });
            },
          });
        },
      });
    },
  });
}

/* Tasarım obj'sini kalıcı pole formatına çevir (entry-array). */
function _poleFromDesign(d) {
  const map = a => (Array.isArray(a) ? a : []).map(t => ({
    text: typeof t === 'string' ? t : (t?.text || ''),
    src: 'wanderer', at: NOW(),
  })).filter(e => e.text);
  return {
    baslik:      String(d?.baslik || '').slice(0, 60),
    whisper:     String(d?.whisper || '').slice(0, 140),
    dusunceler:  map(d?.dusunceler),
    inanclar:    map(d?.inanclar),
    duygular:    map(d?.duygular),
    davranislar: map(d?.davranislar),
  };
}

/* ══════════════════════════════════════════════════════════════
   KART ÜRETİM MOTORU KÖPRÜSÜ — her kutup kendi içeriğine uygun,
   benzersiz bir sahne alır (12d). Önceden HER Geçiş Kartım tam olarak
   iki sabit sahneye (kapi/pencere) düşüyordu; artık ihtiyaç cümlesinden
   ve kutbun maddelerinden türeyen bir reçete kullanılır.
══════════════════════════════════════════════════════════════ */
function _poleTexts(pole) {
  const flat = k => (Array.isArray(pole?.[k]) ? pole[k] : [])
    .map(e => (typeof e === 'string' ? e : (e?.text || ''))).filter(Boolean);
  return [pole?.baslik, pole?.whisper,
    ...flat('dusunceler'), ...flat('inanclar'), ...flat('duygular'), ...flat('davranislar')].filter(Boolean);
}

/* Kalıcı kart (k.id var) için: kalıcı reçete — yoksa hesapla, KV/tabloya
   yaz, arka planda LLM ile iyileştir. Zaten varsa anında döner. */
function _poleSahne(k, which) {
  const pole = k?.[which];
  if (!pole) return null;
  return kumEnsureSpec(pole, {
    seed: k.id + '-' + which,
    virtue: which === 'golden' ? 'yansima' : 'odak',
    texts: _poleTexts(pole),
    persist: () => gkSave(k),
  });
}

/* Henüz kalıcı olmayan ÖNİZLEME (S3/S5 tören sunumu) için: yalnız
   sezgisel, tek seferlik — kalıcılık/LLM iyileştirme yok (gereksiz). */
function _previewSahne(pole, palette) {
  return kumHeuristicSpec({
    seed: (pole?.baslik || '') + '|' + (pole?.whisper || '') + '|' + palette,
    virtue: palette === 'gold' ? 'yansima' : 'odak',
    texts: _poleTexts(pole),
  });
}

/* ══════════════════════════════════════════════════════════════
   SAHNE YARDIMCILARI — atmosfer host'u + adım halkası (12c ikvRing)
   ───────────────────────────────────────────────────────────
   Sahneler .atl-host içinde değişir; .atl-atmo (köz/gren/omurga/su)
   tören boyunca yaşar. Su perdesi lapis sahnelerde yükselir.
══════════════════════════════════════════════════════════════ */
function _atlHost(overlay) { return overlay.querySelector('.atl-host') || overlay; }

function _atlSu(overlay, on) { overlay.classList.toggle('atl-onb--su', !!on); }

/* Adım halkası — "N/5" metni yerine altın→lapis yay (Tasarım Prensipleri §7) */
function _atlRing(step) {
  const ikvRing = window.ikvRing;
  if (typeof ikvRing !== 'function') return '';
  const pct = Math.round((step / 5) * 100);
  return `<div class="atl-t-ring">${ikvRing(pct, { size: 50, yol: true, center: `<span class="atl-ring-glyph">${step}</span>` })}</div>`;
}

/* 12c yoksa savunmacı kart fallback'i */
function _atlCardFallback(pole, palette, kicker) {
  return `<div class="atl-cf${palette === 'lapis' ? ' atl-cf--lapis' : ''}">
    ${kicker ? `<div class="atl-cf-kicker">${esc(kicker)}</div>` : ''}
    <div class="atl-cf-name">${esc(pole?.baslik || '')}</div>
    ${pole?.whisper ? `<div class="atl-cf-whisper">${esc(pole.whisper)}</div>` : ''}
  </div>`;
}

/* ══════════════════════════════════════════════════════════════
   SAHNE: CEVHER / SU (yükleme) — fener yanar, kıvılcımlar yörüngede;
   yazılan an bir cevher satırı olarak közün üstünde bekler
══════════════════════════════════════════════════════════════ */
function _renderLoading(overlay, { palette, kicker, title, need, sub, step, onCancel }) {
  const su = palette === 'lapis';
  _atlSu(overlay, su);
  const ikvLantern = window.ikvLantern;
  const lantern = typeof ikvLantern === 'function'
    ? ikvLantern(64, su ? '#5A8AD8' : undefined)
    : '';
  _atlHost(overlay).innerHTML = `
    <div class="onb-scene atl-scene atl-scene--load${su ? ' atl-scene--su' : ''}">
      <div class="atl-kicker${su ? ' atl-kicker--su' : ''}">${esc(kicker)}</div>
      ${_atlRing(step || (su ? 4 : 1))}
      <div class="atl-lantern" aria-hidden="true">
        ${lantern}
        <div class="atl-lantern-orbit"><i></i><i></i><i></i></div>
      </div>
      <div class="atl-load-title">${esc(title)}</div>
      ${need ? `<div class="atl-ore">${esc(need)}</div>` : ''}
      <div class="atl-scene-sub">${esc(sub || '')}</div>
    </div>
    <button class="atl-close" data-act="cancel" aria-label="${t('gk.close')}">×</button>`;
  overlay.querySelector('[data-act="cancel"]')?.addEventListener('click', () => {
    try { onCancel && onCancel(); } catch (_) {}
  });
}

/* ══════════════════════════════════════════════════════════════
   SAHNE: OCAK SOĞUDU — tasarım kurulamadı.
   ───────────────────────────────────────────────────────────
   Buraya sahte bir kart çizmek YASAKTIR (§6.2 sahte başarı, §6.10
   kanıtsız değer): uydurma bir ad ("Olunan Kişi") ile kullanıcının
   kendi kesik cümlesinden ibaret bir kart, Wanderer'ın YARGISI gibi
   görünüyordu — oysa hiçbir şey ölçülmemiş, hiçbir şey söylenmemişti.
   Suskunluğu Wanderer sahiplenir; kullanıcıya fatura edilmez.
   Promise döner: true = tekrar sür, false = vazgeç.
══════════════════════════════════════════════════════════════ */
function _renderForgeCold(overlay, { onCancel }) {
  _atlSu(overlay, false);
  return new Promise((resolve) => {
    _atlHost(overlay).innerHTML = `
      <div class="onb-scene atl-scene atl-scene--cold">
        <div class="atl-kicker">${t('gk.cold_kicker')}</div>
        ${_atlRing(1)}
        <div class="atl-cold-mark" aria-hidden="true">✦</div>
        <div class="atl-load-title">${t('gk.cold_title')}</div>
        <div class="atl-scene-sub">${t('gk.cold_sub')}</div>
        <div class="atl-nav">
          <button class="ikv-ghost-btn" data-act="cold-cancel">${t('gk.cancel')}</button>
          <button class="ikv-seal-btn" data-act="cold-retry">${t('gk.cold_retry')}</button>
        </div>
      </div>
      <button class="atl-close" data-act="cold-cancel" aria-label="${t('gk.close')}">×</button>`;
    overlay.querySelectorAll('[data-act="cold-retry"]').forEach(b =>
      b.addEventListener('click', () => resolve(true)));
    overlay.querySelectorAll('[data-act="cold-cancel"]').forEach(b =>
      b.addEventListener('click', () => {
        try { onCancel && onCancel(); } catch (_) {}
        resolve(false);
      }));
  });
}

/* ══════════════════════════════════════════════════════════════
   SAHNE: ÖRS BAŞINDA — Wanderer'ın döktüğü taslak; çekici sen
   vurursun: seç/sil/ekle/isim. Seçili madde közde tutulur (✦),
   bırakılan söner. İçerik akışı aynen; görsel dil Ocak.
══════════════════════════════════════════════════════════════ */
function _pickHTML(cat, i, txt) {
  return `
    <label class="atl-pick">
      <input type="checkbox" data-cat="${cat}" data-i="${i}" checked />
      <span class="atl-pick-box" aria-hidden="true"></span>
      <span class="atl-pick-txt">${esc(txt)}</span>
    </label>`;
}

function _goldEditSection(workDesign) {
  return CATS.map((c, ci) => {
    const items = (workDesign[c.key] || []).map((txt, i) => _pickHTML(c.key, i, txt)).join('');
    return `
      <section class="atl-group ikv-panel" data-cat="${c.key}" style="--i:${ci}">
        <header class="atl-group-head">
          <span class="atl-group-sigil" aria-hidden="true">${c.sigil}</span>
          <span class="atl-group-label">${gkCatBadge(c.key)}</span>
        </header>
        <hr class="ikv-hairline" aria-hidden="true">
        <div class="atl-pick-list">${items || `<div class="atl-empty">${t('gk.cat_empty')}</div>`}</div>
        <form class="atl-add-form atl-add-row" data-cat="${c.key}">
          <input type="text" class="atl-add-inp" placeholder="${esc(gkPhGold(c.key))}" maxlength="180" />
          <button type="submit" class="atl-add-btn" aria-label="${t('gk.add_plus')}">+</button>
        </form>
      </section>
    `;
  }).join('');
}

function _renderGoldenReview(overlay, ihtiyac, goldenDesign, needLabel, { onCancel, onConfirm }) {
  _atlSu(overlay, false);
  // workDesign üstünde oynanır — checkbox + manuel ek
  const workDesign = {
    baslik:      goldenDesign.baslik || t('gk.fallback.now_person'),
    whisper:     goldenDesign.whisper || '',
    dusunceler:  [...(goldenDesign.dusunceler  || [])],
    inanclar:    [...(goldenDesign.inanclar    || [])],
    duygular:    [...(goldenDesign.duygular    || [])],
    davranislar: [...(goldenDesign.davranislar || [])],
  };

  _atlHost(overlay).innerHTML = `
    <div class="onb-scene atl-scene atl-scene--forge">
      <div class="atl-kicker">${t('gk.review_kicker')}</div>
      ${_atlRing(2)}
      <div class="atl-tagline">${t('gk.review_tagline')}</div>
      <div class="atl-ore-note">
        <span class="atl-ore-note-label">${esc(needLabel || t('gk.need_label_bugun'))}</span>
        <span class="atl-ore-note-text">${esc(ihtiyac)}</span>
      </div>
      <div class="atl-name-wrap">
        <div class="atl-kicker">${t('gk.pole_tag_gold')}</div>
        <input type="text" class="atl-name-input" id="gk-name-gold"
               value="${esc(workDesign.baslik)}" maxlength="60" aria-label="${t('gk.name_aria_gold')}" />
        ${workDesign.whisper ? `<div class="atl-name-whisper">${esc(workDesign.whisper)}</div>` : ''}
      </div>
      <div class="atl-groups ikv-cascade">${_goldEditSection(workDesign)}</div>
      <div class="atl-nav">
        <button class="ikv-ghost-btn" data-act="cancel">${t('gk.cancel')}</button>
        <button class="ikv-seal-btn" data-act="confirm">${t('gk.gold_confirm_cta')}</button>
      </div>
    </div>
  `;

  overlay.addEventListener('click', e => {
    const tgt = e.target;
    if (!tgt) return;
    // Bu delegate listener overlay'de kalıcı; sonraki sahneler (Sunum) innerHTML'i
    // değiştirince bayat kalır. Atölye markup'ı gittiyse (artık #gk-name-gold yok)
    // sessizce çık — yoksa Sunum'daki "Vazgeç" hem burada hem orada tetiklenir.
    if (!overlay.querySelector('#gk-name-gold')) return;

    if (tgt.closest('[data-act="cancel"]')) { try { onCancel && onCancel(); } catch (_) {} return; }

    if (tgt.closest('[data-act="confirm"]')) {
      const name = overlay.querySelector('#gk-name-gold')?.value?.trim() || workDesign.baslik;
      const confirmed = {
        baslik:  name.slice(0, 60),
        whisper: String(workDesign.whisper || '').slice(0, 140),
        dusunceler: [], inanclar: [], duygular: [], davranislar: [],
      };
      // Sadece seçili checkbox'lar
      const picks = Array.from(overlay.querySelectorAll('.atl-group input[type="checkbox"]'))
        .filter(c => c.checked)
        .map(c => ({ cat: c.dataset.cat, i: +c.dataset.i }));
      picks.forEach(({ cat, i }) => {
        const txt = (workDesign[cat] || [])[i];
        if (txt && CAT_KEYS.includes(cat)) confirmed[cat].push(txt);
      });
      try { onConfirm && onConfirm(confirmed); } catch (err) { console.warn('gkGoldConfirm:', err); }
    }
  });

  // Kor işareti dokusu — madde közde tutulur/bırakılır (hafif tık)
  overlay.addEventListener('change', e => {
    if (!overlay.querySelector('#gk-name-gold')) return;
    if (e.target?.matches?.('.atl-pick input[type="checkbox"]')) {
      try { window.fxCue && window.fxCue('tap'); } catch (_) {}
    }
  });

  overlay.querySelectorAll('.atl-add-form').forEach(f => {
    f.addEventListener('submit', e => {
      e.preventDefault();
      const cat = f.dataset.cat;
      const inp = f.querySelector('.atl-add-inp');
      const txt = inp?.value?.trim();
      if (!txt || !CAT_KEYS.includes(cat)) return;
      workDesign[cat] = Array.isArray(workDesign[cat]) ? workDesign[cat] : [];
      workDesign[cat].push(txt);
      inp.value = '';
      const list = f.parentElement.querySelector('.atl-pick-list');
      list.querySelector('.atl-empty')?.remove();
      const i = workDesign[cat].length - 1;
      list.insertAdjacentHTML('beforeend', _pickHTML(cat, i, txt));
      try { window.fxCue && window.fxCue('tap'); } catch (_) {}
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   SAHNE: SUNUM — kart sırttan yüze döner (flip dili), gerisi süzülür.
   Altın = tav (kor halesi alttan), lapis = tavlanmış kart (su göğü).
══════════════════════════════════════════════════════════════ */
function _renderPresent(overlay, { palette, kicker, verdict, pole, ctaLabel, step, onCancel, onCta }) {
  const su = palette === 'lapis';
  _atlSu(overlay, su);
  const ikvCardFace = window.ikvCardFace;
  const ikvCardBack = window.ikvCardBack;
  const cardHTML = typeof ikvCardFace === 'function'
    ? ikvCardFace(
        {
          id: (palette === 'gold' ? 'g_' : 'l_') + (pole.baslik || 'kart'),
          name: pole.baslik || (palette === 'gold' ? t('gk.fallback.now_person') : t('gk.fallback.target_short')),
          whisper: pole.whisper || '',
          virtue: palette === 'gold' ? 'yansima' : 'odak',
        },
        { palette, sahne: _previewSahne(pole, palette), kicker, sub: '' }
      )
    : _atlCardFallback(pole, palette, kicker);
  const backHTML = typeof ikvCardBack === 'function' ? ikvCardBack() : '';

  // Kategorilerden örnek özet — kartın altında küçük tekrar
  const summaryLines = CATS.map(c => {
    const items = pole[c.key];
    if (!Array.isArray(items) || !items.length) return '';
    const top = items.slice(0, 2)
      .map(x => esc(typeof x === 'string' ? x : (x?.text || '')))
      .join(' · ');
    return `<li class="atl-present-row"><span class="atl-present-cat">${gkCatBadge(c.key)}</span><span>${top}</span></li>`;
  }).filter(Boolean).join('');

  _atlHost(overlay).innerHTML = `
    <div class="onb-scene atl-scene atl-scene--present atl-scene--present-${palette}">
      <div class="atl-kicker${su ? ' atl-kicker--su' : ''}">${esc(kicker)}</div>
      ${_atlRing(step || (su ? 5 : 3))}
      <div class="atl-flip">
        <div class="atl-halo" aria-hidden="true"></div>
        <div class="atl-flip-inner">
          <div class="atl-flip-back">${backHTML}</div>
          <div class="atl-flip-face">${cardHTML}</div>
        </div>
      </div>
      <div class="atl-present-verdict atl-flip-reveal">${esc(verdict)}</div>
      <div class="atl-present-rest">
        ${summaryLines ? `<ul class="atl-present-sum ikv-panel${su ? ' ikv-panel--lapis' : ''}">${summaryLines}</ul>` : ''}
        <div class="atl-nav">
          <button class="ikv-ghost-btn" data-act="cancel">${t('gk.cancel')}</button>
          <button class="ikv-seal-btn" data-act="cta">${esc(ctaLabel)}</button>
        </div>
      </div>
    </div>`;

  try { window.fxCue && window.fxCue('holo'); } catch (_) {}
  // holo: sunumdaki kart ışığa tutulmuş gibi eğimi izler (12c motoru)
  try { window.ikvHoloScan && window.ikvHoloScan(overlay); } catch (_) {}

  overlay.querySelector('[data-act="cancel"]')?.addEventListener('click', () => {
    try { onCancel && onCancel(); } catch (_) {}
  });
  overlay.querySelector('[data-act="cta"]')?.addEventListener('click', () => {
    try { onCta && onCta(); } catch (err) { console.warn('gkPresentCta:', err); }
  });
}

/* ══════════════════════════════════════════════════════════════
   SAHNE: MÜHÜR ANI — "Bu Yol Benim" dendiğinde altın damga karta
   iner (yol doğdu); kısa bir nefes sonra Halka Kapısı'na süzülür.
══════════════════════════════════════════════════════════════ */
function _renderStampMoment(overlay, kart, onDone) {
  _atlSu(overlay, true);
  const lapis = kart.lapis || {};
  const ikvCardFace = window.ikvCardFace;
  const cardHTML = typeof ikvCardFace === 'function'
    ? ikvCardFace(
        { id: 'st_' + kart.id, name: lapis.baslik || t('gk.fallback.target_short'),
          whisper: lapis.whisper || '', virtue: 'odak' },
        { palette: 'lapis', sahne: _poleSahne(kart, 'lapis'), kicker: t('gk.label_olman'), sub: '' }
      )
    : _atlCardFallback(lapis, 'lapis', t('gk.label_olman'));

  _atlHost(overlay).innerHTML = `
    <div class="onb-scene atl-scene atl-scene--stamp">
      <div class="atl-kicker">${t('gk.stamp_kicker')}</div>
      <div class="atl-stamp-stage">
        ${cardHTML}
        <div class="atl-stamp" aria-hidden="true">◆</div>
      </div>
      <div class="atl-flash" aria-hidden="true"></div>
      <div class="atl-stamp-line"><em>${t('gk.stamp_line')}</em></div>
    </div>`;

  const reduce = typeof window !== 'undefined' &&
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(() => { try { onDone && onDone(); } catch (_) {} }, reduce ? 200 : 1600);
}

/* ══════════════════════════════════════════════════════════════
   SAHNE: SOĞUMA · HALKA KAPISI — kart soğurken son kapı:
   "Bu yolu Kişilerin Kişileri'nde anonim rumuzunla bırakır mısın?"
   Paylaşırsa lapis kutbu snapshot'ı paylasilan_kartlar'a iner.
   "Bende Kalsın" = özel kalır.
══════════════════════════════════════════════════════════════ */
function _renderShareGate(overlay, kart, { onSkip, onShare }) {
  _atlSu(overlay, true);
  const ikvCardFace = window.ikvCardFace;
  const lapis = kart.lapis || {};
  const cardHTML = typeof ikvCardFace === 'function'
    ? ikvCardFace(
        { id: 'sg_' + kart.id, name: lapis.baslik || t('gk.fallback.target_short'),
          whisper: lapis.whisper || '', virtue: 'odak' },
        { palette: 'lapis', sahne: _poleSahne(kart, 'lapis'), mini: true,
          kicker: t('gk.share_card_kicker'), sub: '' }
      )
    : _atlCardFallback(lapis, 'lapis', t('gk.share_card_kicker'));

  _atlHost(overlay).innerHTML = `
    <div class="onb-scene atl-scene atl-scene--cool">
      <div class="atl-kicker atl-kicker--su">${t('gk.share_gate_kicker')}</div>
      <div class="atl-cool-card">${cardHTML}</div>
      <div class="atl-present-verdict">${t('gk.share_verdict')}</div>
      <p class="atl-cool-explain">
        ${t('gk.share_explain').replace('{rumuz}', esc(window.ilhamRumuz?.()?.name || 'GEZGİN'))}
      </p>
      <div class="atl-nav">
        <button class="ikv-ghost-btn" data-act="skip">${t('gk.share_skip')}</button>
        <button class="ikv-seal-btn" data-act="share">${t('gk.share_btn')}</button>
      </div>
    </div>`;

  overlay.querySelector('[data-act="skip"]')?.addEventListener('click', () => {
    try { onSkip && onSkip(); } catch (_) {}
  });
  overlay.querySelector('[data-act="share"]')?.addEventListener('click', (e) => {
    e.target.disabled = true;
    try { onShare && onShare(); } catch (_) {}
  });
}

/* ══════════════════════════════════════════════════════════════
   PAYLAŞ / GERİ AL — lapis kutbu snapshot olarak paylasilan_kartlar'a
   ───────────────────────────────────────────────────────────
   kind:'ilham' bilerek korundu (10C feed + DB enum geri uyum).
   İçerik artık "Geçiş Kartım'ın lapis kutbu"dur; rumuz/anonim akış aynı.
══════════════════════════════════════════════════════════════ */
function _gkRumuz() {
  // Anonim rumuz 10B sohbet köprüsünden gelir; yoksa nazik fallback
  return window.ilhamRumuz?.() || { name: 'GEZGİN', color: '#F5A623' };
}

export async function gkShare(id) {
  const uid = S.currentUser?.id;
  if (!sb || !uid) { try { showToast(t('gk.toast_login_first')); } catch (_) {} return false; }
  const k = (S._gecisKartlari || []).find(x => x && x.id === id);
  if (!k || !k.lapis) return false;

  const lapis = k.lapis;
  const r = _gkRumuz();
  const snapshot = {
    seed_text: k.ihtiyac || '',
    baslik: lapis.baslik || '',
    whisper: lapis.whisper || '',
    glyph: 'wanderer',
    virtue: 'odak',
    dusunceler:  Array.isArray(lapis.dusunceler)  ? lapis.dusunceler  : [],
    inanclar:    Array.isArray(lapis.inanclar)    ? lapis.inanclar    : [],
    duygular:    Array.isArray(lapis.duygular)    ? lapis.duygular    : [],
    davranislar: Array.isArray(lapis.davranislar) ? lapis.davranislar : [],
  };
  try {
    // kind:'benim' — kart artık adıyla paylaşılır (eski 'ilham' satırları
    // feed'de aynen okunur; okuma tarafı kind'a bakmaz). Rumuz alanları
    // sunucu mührüyle (mig 025 trigger) türetilir; buradaki değerler yalnız
    // migration henüz koşmamış kurulumlar için nazik fallback'tir.
    const { data, error } = await sb.from('paylasilan_kartlar').insert([{
      owner_user_id: uid, kind: 'benim', source_card_id: null,
      card_snapshot: snapshot, rumuz: r.name, rumuz_color: r.color,
    }]).select('id').single();
    if (error) {
      console.warn('gkShare:', error.message);
      try { showToast(t('gk.toast_share_fail')); } catch (_) {}
      return false;
    }
    k.shared = true;
    k.share_id = data.id;
    k.updated_at = NOW();
    gkSave(k);
    try { showToast(t('gk.toast_shared')); } catch (_) {}
    return true;
  } catch (e) { console.warn('gkShare:', e?.message); return false; }
}

export async function gkUnshare(id) {
  const k = (S._gecisKartlari || []).find(x => x && x.id === id);
  if (!sb || !k || !k.share_id) return false;
  try {
    await sb.from('paylasilan_kartlar').delete().eq('id', k.share_id);
    k.shared = false; k.share_id = null; k.updated_at = NOW();
    gkSave(k);
    try { showToast(t('gk.toast_unshared')); } catch (_) {}
    return true;
  } catch (e) { console.warn('gkUnshare:', e?.message); return false; }
}

/* ══════════════════════════════════════════════════════════════
   KİŞİLERİM KÖPRÜSÜ — Bugün'de çizilmez, malzemesi verilir
   ───────────────────────────────────────────────────────────
   2026-07-26: Bugün'deki ayrı şerit (#gk-bugun-strip) kaldırıldı.
   Geçiş kartının iki kutbu artık KİŞİLERİM'in iki destesinin
   başında yaşıyor; aralarındaki vuruş halkası da o iki desteyi
   bağlayan köprüde. Bu bölüm o köprünün malzemesini üretir —
   yüzeyi 10q2 çizer, tek kart dili orada toplanır.
══════════════════════════════════════════════════════════════ */
function _miniCard(k, which, palette, kicker, tam) {
  const pole = k?.[which] || {};
  const ikvCardFace = window.ikvCardFace;
  if (typeof ikvCardFace !== 'function') return _atlCardFallback(pole, palette, kicker);
  return ikvCardFace(
    {
      id: (palette === 'gold' ? 'g_' : 'l_') + (pole.baslik || 'kart'),
      name: pole.baslik || (palette === 'gold' ? t('gk.fallback.now_person') : t('gk.fallback.target_short')),
      whisper: pole.whisper || '',
      virtue: palette === 'gold' ? 'yansima' : 'odak',
    },
    // `tam`: Karşılaşma (13B) kutbu ekran boyunda çizer — mini kart folyoyu,
    // künyeyi ve fısıltıyı bilerek soyar, o boyda kart yarım görünürdü.
    { palette, mini: !tam, kicker, sub: tam ? undefined : '', sahne: _poleSahne(k, which) }
  );
}

/** Yolun halkası. Üç vuruş yayı 2026-08-10'da söküldü; halka artık
 *  SINAMA durumunu taşır — tek yay, tek soru: bu yol kanıtlandı mı?
 *  `sinav` yoksa (henüz girilmemiş) halka NÖTR durur: yalnız yolun izi.
 *  GEÇİLEMEYEN sınama da halkada GÖRÜNMEZ, ve bu bir eksik değil karardır:
 *  dinlenme bir başarısızlık değil bir beklemedir; halkayı "denedi, olmadı"
 *  işaretiyle damgalamak geçmemiş bir sınamayı kalıcı bir lekeye çevirirdi.
 *  Masa o hâli zaten kendi diliyle söylüyor ("Henüz değil — bu yol daha
 *  yürünüyor"), üstelik davet sesiyle. Halka yalnız mührü bilir.
 *  Sınıfları gk-* ama stilleri atolye.css'te; hem masa (.atl-detail-ring)
 *  hem KİŞİLERİM köprüsü (10q2) aynı halkayı çizer — tek dil. */
export function gkRingSVG(sinav) {
  // Yarıçap 22, çevre ≈138.23. Geçilmiş sınama halkayı TAM kapatır (mühür
  // bütündür, yüzde yoktur); geçilmemişse iz görünür ama yay yanmaz.
  const gecti = !!(sinav && sinav.gecti);
  const R = 22, C = 2 * Math.PI * R;
  return `<svg class="gk-ring" viewBox="0 0 60 60" aria-hidden="true">
    <circle class="gk-ring-track" cx="30" cy="30" r="${R}" fill="none" stroke-width="2"/>
    <circle class="gk-ring-arc gk-ring-arc--sinama${gecti ? ' gk-ring-arc--on' : ''}"
            cx="30" cy="30" r="${R}" fill="none" stroke-width="2"
            stroke-dasharray="${C.toFixed(2)} ${C.toFixed(2)}"
            stroke-dashoffset="${(gecti ? 0 : C).toFixed(2)}"
            transform="rotate(-90 30 30)" />
  </svg>`;
}

/** Aktif yollar — yürünmekte olan geçişler. Kutupları KİŞİLERİM'in iki
 *  destesinin başında durur (10q2); köprü yalnız bunlar için çizilir. */
export function gkActiveCards() {
  if (!Array.isArray(S._gecisKartlari)) return [];
  return S._gecisKartlari.filter(k => k && k.state === 'active' && k.golden);
}

/** Bir kutbun 12c yüzü — destede çizilmek üzere (mini). Sahne kalıcıdır
 *  (kumEnsureSpec); yüz motoru tek: ikvCardFace, paralel kart stili yok.
 *  opts.mezun: geçiş tamamlandı — lapis kutup ALTIN yüzle döner, çünkü
 *  olunmak istenen artık olunmuştur ("ARTIK O KİŞİ"). */
export function gkPoleFace(kartId, which, opts = {}) {
  const k = (Array.isArray(S._gecisKartlari) ? S._gecisKartlari : [])
    .find(x => x && x.id === kartId);
  if (!k) return '';
  if (opts.mezun) return _miniCard(k, which, 'gold', t('gk.now_that_person_short'), opts.tam);
  const palette = which === 'golden' ? 'gold' : 'lapis';
  const kicker  = which === 'golden' ? t('gk.label_oldugun') : t('gk.label_olman');
  return _miniCard(k, which, palette, kicker, opts.tam);
}

/* ══════════════════════════════════════════════════════════════
   SENTEZ KÖPRÜSÜ — kutup, iki toplamın anladığı dile çevrilir
   ───────────────────────────────────────────────────────────
   Atölye kartı KİŞİLERİM destesinde katalog kartıyla yan yana durur
   (10q2 `_gkEntry`) ama Üç Mühür'ün iki toplamına (02c Portre / 10D OİK
   kartı) akmıyordu — deste birleşmiş, kan dolaşımı bağlanmamıştı.
   Aradaki iki sessiz uyumsuzluk burada çevrilir:
     1) absorb `hisler` bekler, geçiş kutbu `duygular` der,
     2) absorb düz string bekler, geçiş kutbu {text,src,at} nesnesi tutar.
   `id` deste elemanıyla AYNI (`gk_<id>_<which>`) — portreye düşen `ref`
   ile destede görünen eleman tek kimliği paylaşsın; geri alma ve Benlik
   Yapısı o tek izden çalışır.
══════════════════════════════════════════════════════════════ */

/** Kart id'siyle geçiş kartı (durum farkı gözetmez — mezun kart da çözülür). */
function _byId(kartId) {
  return (Array.isArray(S._gecisKartlari) ? S._gecisKartlari : [])
    .find(x => x && x.id === kartId) || null;
}

/** Geçiş kutbunu absorb sözleşmesine çevirir (porAbsorbCard / oikAbsorbCard).
 *  Döner: katalog kartı kılığında nesne | null. */
export function gkPoleAsCard(kartId, which) {
  const k = _byId(kartId);
  if (!k) return null;
  const w = which === 'lapis' ? 'lapis' : 'golden';
  const p = k[w] || {};
  const txt = (arr) => (Array.isArray(arr) ? arr : [])
    .map(e => (e && typeof e === 'object') ? e.text : e)
    .filter(s => typeof s === 'string' && s.trim().length > 1);
  return {
    id: `gk_${k.id}_${w}`,
    name: p.baslik || '',
    dusunceler:  txt(p.dusunceler),
    inanclar:    txt(p.inanclar),
    hisler:      txt(p.duygular),      // ← absorb 'hisler' der, kutup 'duygular'
    davranislar: txt(p.davranislar),
  };
}

/* Deste elemanı / madde ref'i biçimi — tek yerde tanımlı, üç çözücü paylaşır */
const GK_REF_RE = /^gk_(.+)_(golden|lapis)$/;

/** Yeni doğan kartın kutuplarını Üç Mühür'ün iki toplamına akıt.
 *  LAPİS → "Niyet Alınan [Ad]" (10D): niyet beyanı anında geçerlidir —
 *  hedef mührüyle bire bir aynı an. Çağrılar `window.*` üzerinden yapılır
 *  (statik kenar rollup sırasını kaydırıp TDZ açar — 10q'nun kalıbı). */
export function _feedSentez(kart) {
  if (!kart || !kart.id) return;
  try {
    const lapis = gkPoleAsCard(kart.id, 'lapis');
    if (lapis) window.oikAbsorbCard?.(lapis);
  } catch (e) { console.warn('gkFeed lapis:', e && e.message); }
  // ALTIN → "Olunan [Ad]" (02c): "şu an olduğum kişi bu" da bir beyandır.
  // Sentez ERTELENMEZ (Emre, 2026-07-27) — kullanıcı sürekli hangi kişi
  // olduğunu görmeli; kota koruması 02c'nin 1200 ms dalgasıdır, aynı turda
  // doğan iki kutup tek çağrıda birleşir.
  try {
    const golden = gkPoleAsCard(kart.id, 'golden');
    if (golden) window.porAbsorbCard?.(golden);
  } catch (e) { console.warn('gkFeed altın:', e && e.message); }
}

/** MEZUNİYET — hedef olunmuşa dönüşür (katalog mezuniyetiyle aynı dil).
 *  Sıra kritik: ÖNCE portreye işle, SONRA hedeften çek. Ters sırada
 *  `oikCardRefs()` bir an boş kalır ve Benlik Yapısı açıksa kartı kaybeder. */
export function _graduateSentez(kart) {
  if (!kart || !kart.id) return;
  const ref = `gk_${kart.id}_lapis`;
  try {
    const lapis = gkPoleAsCard(kart.id, 'lapis');
    if (lapis) window.porAbsorbCard?.(lapis);
  } catch (e) { console.warn('gkGraduate altın:', e && e.message); }
  try { window.oikReleaseCard?.(ref); } catch (e) { console.warn('gkGraduate lapis:', e && e.message); }
}

/** YOLU BIRAKMA — terk edilen kartın izi iki toplamdan da çekilir.
 *  Beyan geri alındıysa kimlik de onu taşımamalı; kullanıcının el yazısı
 *  her iki tarafta da dokunulmaz kalır (release yalnız `ref` izini siler). */
export function _releaseSentez(kart) {
  if (!kart || !kart.id) return;
  try { window.porReleaseCard?.(`gk_${kart.id}_golden`); } catch (e) { console.warn('gkRelease altın:', e && e.message); }
  try { window.oikReleaseCard?.(`gk_${kart.id}_lapis`); } catch (e) { console.warn('gkRelease lapis:', e && e.message); }
}

/** `gk_<id>_<which>` ref'inden absorb kartı — kuyruk drenajları (02c/10D)
 *  kuyrukta kart id'si tutar, kutup id'si de oraya düşebilir. */
export function gkPoleAsCardRef(ref) {
  const m = GK_REF_RE.exec(String(ref || ''));
  return m ? gkPoleAsCard(m[1], m[2]) : null;
}

/** `gk_<id>_<which>` ref'ini kart yüzü verisine çözer — katalog destesi bu
 *  id'yi bilmez (getCardById null döner), tüketiciler önce buraya sorar.
 *  Döner: { id, name, whisper, virtue, glyph, category, _gk } | null. */
export function gkRefResolve(ref) {
  const m = GK_REF_RE.exec(String(ref || ''));
  if (!m) return null;
  const k = _byId(m[1]);
  if (!k) return null;
  const which = m[2];
  const p = k[which] || {};
  const mezun = k.state === 'completed' && which === 'lapis';
  return {
    id: ref,
    name: p.baslik || t('gk.fallback.target_short'),
    whisper: p.whisper || '',
    virtue: (which === 'golden' || mezun) ? 'yansima' : 'odak',
    glyph: 'wanderer',
    category: 'cekirdek',
    _gk: { kartId: k.id, which, mezun },
  };
}

/* ══════════════════════════════════════════════════════════════
   KOLEKSİYON — tamamlanmış geçişlerin galerisi
   ───────────────────────────────────────────────────────────
   Her tamamlanan kart bir geçişin mührü: olduğun → olman gereken
   (artık o kişi). Tamamlanan kartın lapis kutbu KİŞİLERİM'in ALTIN
   destesine geçer (10q2 mezuniyeti) — olunmak istenen artık olunmuştur;
   galeri ise kk-mine ekranından açılır: salt-okunur iki-kutup detayı.
══════════════════════════════════════════════════════════════ */
export function gkCompletedCards() {
  if (!Array.isArray(S._gecisKartlari)) return [];
  return S._gecisKartlari.filter(k => k && k.state === 'completed' && k.lapis);
}

/* Tamamlanan kartların sayısı — Yol rozeti vb. dış çağırıcılar için. */
export function gkCompletedCount() {
  return gkCompletedCards().length;
}

function _fmtDate(iso) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(S._currentLang === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'long' });
  } catch (_) { return ''; }
}

/* Koleksiyon — "Soğumuş Kartlar Rafı". Galeri = altın 12c mini kartlar
   (Fener Salonu cascade girişi); tıklanan kart → salt-okunur iki-kutup
   detay + paylaş/geri-al. */
export function gkOpenCollection(openId) {
  if (document.querySelector('.gk-collection')) return;
  const overlay = document.createElement('div');
  overlay.className = 'onb-ritual sc-onb gk-onb atl-onb gk-collection';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="atl-atmo" aria-hidden="true">
      <div class="atl-ember"></div>
      <div class="atl-grain"></div>
    </div>
    <div class="atl-host"></div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('onb-open'));

  function close() {
    overlay.classList.add('onb-closing');
    setTimeout(() => overlay.remove(), 320);
    try { window.llmHomeCascade?.(); } catch (_) {}
  }

  function renderGrid() {
    const cards = gkCompletedCards().slice().reverse(); // en yeni önce
    const tiles = cards.map((k, i) => `
      <button type="button" class="atl-raf-tile" data-id="${esc(k.id)}" style="--i:${Math.min(i, 24)}"
              aria-label="${esc(k.lapis.baslik || t('gk.transition_word'))} — ${t('gk.detail_word')}">
        <span class="atl-raf-tile-card">${_miniCard(k, 'lapis', 'gold', t('gk.now_that_person_short'))}</span>
        <span class="atl-raf-tile-meta">
          <span class="atl-raf-tile-name">${esc(k.lapis.baslik || t('gk.fallback.target_short'))}</span>
          <span class="atl-raf-tile-date">${esc(_fmtDate(k.sealed_at || k.created_at))}</span>
        </span>
      </button>`).join('');

    _atlHost(overlay).innerHTML = `
      <div class="onb-scene atl-scene atl-scene--raf">
        <div class="atl-raf-head">
          <button class="atl-back" data-act="close" aria-label="${t('gk.close')}">←</button>
          <div class="atl-raf-title-wrap">
            <div class="atl-kicker">${t('gk.coll_title')}</div>
            <div class="atl-raf-sub">${t('gk.coll_sub').replace('{n}', cards.length)}</div>
          </div>
          <span aria-hidden="true"></span>
        </div>
        ${cards.length
          ? `<div class="atl-raf-grid ikv-cascade">${tiles}</div>`
          : `<div class="atl-empty atl-raf-empty">${t('gk.coll_empty')}</div>`}
      </div>`;

    _atlHost(overlay).querySelectorAll('.atl-raf-tile').forEach(btn => {
      btn.addEventListener('click', () => {
        const k = gkCompletedCards().find(c => c.id === btn.dataset.id);
        if (k) renderDetail(k);
      });
    });
  }

  function _poleColumn(pole, palette, tag) {
    const cats = CATS.map(c => {
      const items = (pole[c.key] || []).map(e =>
        `<li class="atl-raf-line">${esc(typeof e === 'string' ? e : (e?.text || ''))}</li>`
      ).join('');
      if (!items) return '';
      return `
        <section class="atl-raf-cat">
          <header class="atl-raf-cat-head">
            <span class="atl-group-sigil" aria-hidden="true">${c.sigil}</span>
            <span class="atl-group-label">${gkCatBadge(c.key)}</span>
          </header>
          <ul class="atl-raf-list">${items}</ul>
        </section>`;
    }).filter(Boolean).join('');
    return `
      <article class="atl-raf-pole ikv-panel${palette === 'lapis' ? ' ikv-panel--lapis' : ''}">
        <div class="atl-kicker${palette === 'lapis' ? ' atl-kicker--su' : ''}">${tag}</div>
        <div class="atl-raf-pole-name">${esc(pole.baslik || '')}</div>
        ${pole.whisper ? `<div class="atl-raf-pole-whisper">${esc(pole.whisper)}</div>` : ''}
        <hr class="ikv-hairline${palette === 'lapis' ? ' ikv-hairline--lapis' : ''}" aria-hidden="true">
        ${cats || `<div class="atl-empty">—</div>`}
      </article>`;
  }

  function renderDetail(k) {
    const srcLabel = k.source === 'sohbet' ? t('gk.src_sohbet') : t('gk.src_bugun');
    const shareBtn = k.shared
      ? `<button class="ikv-ghost-btn" data-act="unshare">${t('gk.unshare_btn')}</button>`
      : `<button class="ikv-seal-btn" data-act="share">${t('gk.share_btn')}</button>`;
    _atlHost(overlay).innerHTML = `
      <div class="onb-scene atl-scene atl-scene--raf">
        <div class="atl-raf-head">
          <button class="atl-back" data-act="back" aria-label="${t('gk.aria_back_gallery')}">←</button>
          <div class="atl-raf-title-wrap">
            <div class="atl-kicker">${t('gk.transition_sealed')} · ${esc(srcLabel)}</div>
            <h1 class="atl-raf-title">${esc(k.golden.baslik)} → ${esc(k.lapis.baslik)}</h1>
            <div class="atl-raf-date">${esc(_fmtDate(k.sealed_at || k.created_at))}</div>
          </div>
          <span aria-hidden="true"></span>
        </div>
        <div class="atl-ore-note">
          <span class="atl-ore-note-label">${t('gk.that_moment_need')}</span>
          <span class="atl-ore-note-text">${esc(k.ihtiyac || '')}</span>
        </div>
        <div class="atl-raf-poles ikv-cascade">
          ${_poleColumn(k.golden, 'gold', t('gk.label_oldugun'))}
          ${_poleColumn(k.lapis, 'lapis', t('gk.label_olman'))}
        </div>
        <div class="atl-raf-share">${shareBtn}</div>
      </div>`;

    _atlHost(overlay).querySelector('[data-act="share"]')?.addEventListener('click', async (e) => {
      e.target.disabled = true;
      const ok = await gkShare(k.id);
      if (ok) renderDetail(k);
      else e.target.disabled = false;
      try { loadKendiKoleksiyonumView(); } catch (_) {}
    });
    _atlHost(overlay).querySelector('[data-act="unshare"]')?.addEventListener('click', async (e) => {
      e.target.disabled = true;
      const ok = await gkUnshare(k.id);
      if (ok) renderDetail(k);
      else e.target.disabled = false;
      try { loadKendiKoleksiyonumView(); } catch (_) {}
    });
  }

  // Kalıcı delegate: close (galeri) + back (detay→galeri) her iki görünümde geçerli
  overlay.addEventListener('click', e => {
    const tgt = e.target; if (!tgt) return;
    if (tgt.closest('[data-act="close"]')) { close(); return; }
    if (tgt.closest('[data-act="back"]'))  { renderGrid(); return; }
  });

  // Kendi Koleksiyonum'dan gelirken doğrudan kart detayına aç —
  // Geçmiş Kartlarım galerisini atla, "GEÇİŞ MÜHÜRLENDİ" sahnesini göster.
  const target = openId ? gkCompletedCards().find(c => c.id === openId) : null;
  if (target) renderDetail(target);
  else renderGrid();
}

/* ══════════════════════════════════════════════════════════════
   GREETING — ws-greet-hero modu ALTIN karta göre senkron
══════════════════════════════════════════════════════════════ */
export function gkSyncGreeting() {
  const wrap = document.querySelector('.ws-greet-input-wrap');
  const inp  = document.getElementById('bugun-greet-input');
  if (!inp) return;

  const k = _getActive();
  document.getElementById('gk-cat-chips')?.remove();

  if (!k) {
    inp.placeholder = t('gk.greet_ph_seed');
    if (wrap) { wrap.dataset.mode = 'seed'; delete wrap.dataset.cat; }
    return;
  }

  // Aktif kart varsa: input "şu anki kişi"yi (ALTIN) besler — fark etmek = ayna.
  // Lapis hedef sahnede durur ve seni çağırır; ona vuruşlarla yaklaşırsın.
  inp.placeholder = t('gk.greet_ph_feed').replace('{name}', k.golden.baslik || t('gk.active_card'));
  if (wrap) wrap.dataset.mode = 'feed';

  const activeCat = wrap?.dataset.cat || 'duygular';
  const chips = CATS.map(c => `
    <button type="button" class="atl-chip${c.key === activeCat ? ' atl-chip--on' : ''}"
            data-gk-cat="${c.key}" aria-pressed="${c.key === activeCat}">
      <span class="atl-chip-sigil" aria-hidden="true">${c.sigil}</span>
      <span class="atl-chip-lbl">${esc(gkCatLabel(c.key))}</span>
    </button>
  `).join('');
  const row = document.createElement('div');
  row.id = 'gk-cat-chips';
  row.className = 'atl-cat-chips';
  row.innerHTML = chips;
  wrap?.parentElement?.insertBefore(row, wrap);

  row.addEventListener('click', e => {
    const btn = e.target.closest('[data-gk-cat]');
    if (!btn) return;
    const cat = btn.dataset.gkCat;
    if (wrap) wrap.dataset.cat = cat;
    row.querySelectorAll('.atl-chip').forEach(c => {
      const on = c.dataset.gkCat === cat;
      c.classList.toggle('atl-chip--on', on);
      c.setAttribute('aria-pressed', String(on));
    });
    inp.focus();
  });
}

/* ══════════════════════════════════════════════════════════════
   GREETING SEND
══════════════════════════════════════════════════════════════ */
export function gkGreetingSend(e) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  const inp  = document.getElementById('bugun-greet-input');
  const text = (inp ? inp.value : '').trim();
  if (!text) return false;
  if (inp) inp.value = '';

  const k = _getActive();
  if (!k) { gkOnboard(text); return false; }

  const wrap = document.querySelector('.ws-greet-input-wrap');
  const cat  = wrap?.dataset.cat || 'duygular';
  // Besleme HEP altın karta gider — kullanıcı kendi kalıbını büyütüyor (ayna)
  const added = _addEntry(k.golden, cat, text, 'user');
  if (added) {
    k.updated_at = NOW();
    gkSave(k);
    try { showToast(`${t('gk.gold_word')} · ${gkCatLabel(cat)} → ${t('gk.added_word')}`); } catch (_) {}
    try { window.yolRenderHero?.(); } catch (_) {}
  } else {
    try { showToast(t('gk.toast_already_gold')); } catch (_) {}
  }
  return false;
}

/* ══════════════════════════════════════════════════════════════
   MÜHÜR ZİNCİRİ — geçiş tamamlanır: tören → mezuniyet → tazeleme
   ───────────────────────────────────────────────────────────
   Tetikleyicisi 2026-08-10'da değişti: eskiden üçüncü vuruş, artık
   Geçiş Sınaması'nın kanıtlı hükmü. Zincirin kendisi aynen korundu —
   sıra kritiktir (tören biter, sonra state yazılır, sonra portre).
══════════════════════════════════════════════════════════════ */
function _sealTransition(k) {
  if (!k) return;
  _completionCeremony(k, () => {
    k.state = 'completed';
    k.sealed_at = NOW();
    if (S._gecisKartiAktif === k.id) S._gecisKartiAktif = null;
    gkSave(k);
    // Geçiş mühürlendi — kimlik defterine "Olmak İstediği Kişi kartı" düşer
    try { window.imEvent && window.imEvent('gecis_karti'); } catch (_) {}
    // Mühür günü merkez seriyi besler (ritüel-seri bütünlüğü)
    try { recordActivityDay(); } catch (_) {}
    // Niyet alınan, olunana karıştı: lapis kutup portreye işlenir ve
    // hedeften düşer (kutup ayrıca ALTIN desteye geçer — 10q2 mezuniyeti)
    _graduateSentez(k);
    try { window.yolRenderHero?.(); } catch (_) {}
    try { gkSyncGreeting(); } catch (_) {}
  });
}

/* ══════════════════════════════════════════════════════════════
   GEÇİŞ SINAMASI — "Artık o kişiyim" iddiasının kanıt kapısı
   ───────────────────────────────────────────────────────────
   İddia kullanıcınınsa kanıtı da o verir. Motor 10q4'ün sınamasıdır
   (dört soru → kanıtlı boyut sayısı → alıntı kapısı); burada yazılan
   yalnız GİRİŞ: hangi kart sınanıyor, sınav nereye yazılıyor, geçince
   ne oluyor. İkinci bir sınama motoru yazmak aynı hükmü iki yerde ayrı
   ayrı yanlış yapmanın yoludur (§1.3).
   Çağrı window üzerinden — 10A ↔ 10q4 statik kenarı açılmaz (§5.2).
══════════════════════════════════════════════════════════════ */
/** Bu yol kaç gün daha dinlenir (0 = şimdi sınanabilir). */
export function gkSinavBekleme(k) {
  try { return window.olusSinamaBeklemeSinav?.(k && k.sinav) || 0; } catch (_) { return 0; }
}

/** Kart sınanabilir mi — kapı yalnız o zaman çizilir. */
export function gkSinanabilir(k) {
  if (!k || k.state !== 'active') return false;
  if (!k.lapis || !k.golden) return false;      // v1 göçü: tek kutuplu kart sınanmaz
  return gkSinavBekleme(k) === 0;
}

/** "ARTIK O KİŞİYİM" — sınamayı aç. Sınanan şey LAPİS kutuptur: kullanıcı
 *  olmak istediği kişi olduğunu iddia ediyor. */
export function gkSinamaAc(kartId) {
  const k = _byId(kartId);
  if (!gkSinanabilir(k)) return false;
  const lapis = gkPoleAsCard(k.id, 'lapis');
  const golden = gkPoleAsCard(k.id, 'golden');
  if (!lapis) return false;
  // Sınama kartın YÜZÜNÜ de çizer (ikvCardFace): kutup sözleşmesi dört boyutu
  // taşır ama yüz için whisper/virtue de gerekir — 12c'nin beklediği alanlar.
  const kart = { ...lapis, whisper: k.lapis.whisper || '', virtue: 'odak', glyph: 'wanderer' };
  const altin = golden
    ? { card: { ...golden, whisper: k.golden.whisper || '', virtue: 'yansima', glyph: 'wanderer' },
        sahne: _poleSahne(k, 'golden'), empty: false }
    : null;
  try {
    return !!window.olusSinamaAc?.(null, {
      card: kart,
      goldPole: altin,
      // Sınav kartın KENDİ defterinde yaşar — 10q'nun kk.esik'ine yazılmaz
      // (ontolojiler ayrı: geçiş kartı katalog kartı değildir).
      defter: {
        oku: () => k.sinav || null,
        yaz: (kayit) => { k.sinav = kayit; k.updated_at = NOW(); gkSave(k); },
      },
      onGecti: (karar) => {
        // Kanıtlı bir DAVRANIŞ boyutu, kimlik defterine davranış kanıtı düşürür.
        // Eskiden bunu YÜRÜDÜN vuruşu yapardı — bir tık. Şimdi kaynağı
        // kullanıcının `kokenAlintiCoz`'dan geçmiş kendi cümlesi (§6.10).
        try {
          if (karar?.boyutlar?.davranislar?.yasandi) window.imEvent?.('davranis_kaniti');
        } catch (_) {}
        _sealTransition(k);
      },
    });
  } catch (e) { console.warn('gkSinamaAc:', e && e.message); return false; }
}

/* ══════════════════════════════════════════════════════════════
   DETAY OVERLAY — altın veya lapis kutubuna manuel ek
══════════════════════════════════════════════════════════════ */
/* Detay — salon kalıbı: iki kutup birbirine bakar (üstte iki deste + ortada
   yolun halkası); tıklanan yüz öne gelir, aktif kutbun kategori panelleri
   (ikv-panel cascade) altta düzenlenir. "BU YOLU BIRAK" iki-vuruşlu kırmızı.
   Yürünen yol düzenlenir, YÜRÜNMÜŞ yol yalnız okunur: mezun/bırakılmış kart
   salt-okunur açılır — kapı kapanmaz, kalem kalkar. */
export function gkOpenDetail(palette = 'gold', id) {
  const k = id ? _byId(id) : _getActive();
  if (!k) return;
  if (document.querySelector('.gk-detail') || document.querySelector('.gk-seal-ceremony')) return;
  if (palette !== 'gold' && palette !== 'lapis') palette = 'gold';
  // v1'den göçen kartın lapis kutbu YOKTUR (_migrateIfV1) — istenen kutup boşsa
  // var olana dön; ikisi de yoksa açılacak bir sahne kalmaz.
  if (!k[palette === 'gold' ? 'golden' : 'lapis']) palette = palette === 'gold' ? 'lapis' : 'gold';
  if (!k[palette === 'gold' ? 'golden' : 'lapis']) return;
  // Yürünmeyen yol SALT-OKUNUR açılır: geçmiş düzenlenmez (ekleme/silme/bırakma
  // kapalı). Kapı yine de açılır — `role="button"` taşıyıp hiçbir şey açmayan
  // bir yüz sahte başarıdır (§6.2). Hüküm artık MASADA öne gelen karta bağlı
  // (`_gorunen`), açılış kartına değil.
  const wAcilis = palette === 'gold' ? 'golden' : 'lapis';
  window.wtOverlayOpen?.('anin-ocagi');   // Kullanım Nabzı (00f)

  /* ══ MASA — ekranın üstündeki iki deste ═══════════════════════════
     Deste yüzeyi 10q2'nin TEK motorudur (kkDeckHTML/kkDeckBind); masa onu
     dar modda tüketir — ikinci bir deste motoru yazılmaz (§1.3). İmleçler
     MASAYA aittir: burada kaydırmak Bugün'ün önündeki kartı oynatmaz.
     10q2 çözülemezse (yüklenmemiş) ya da kart hiçbir destede durmuyorsa
     (bırakılmış yol) ekran açılış kutbunda kalır — masa bir seçicidir,
     kartın kendisi değil. */
  const KINDS = ['altin', 'lapis'];
  const _idx = { altin: 0, lapis: 0 };
  let aktifKind = 'altin';

  const _dokum = (kind) => {
    try { return (kind === 'altin' ? window.kkDesteAltin?.() : window.kkDesteLapis?.()) || []; }
    catch (_) { return []; }
  };
  const _bulRef = (kind, ref) => _dokum(kind).findIndex(c => c && c.id === ref);

  // Açılışta tıklanan kutup hangi destede duruyorsa masa oradan başlar.
  // Paletten desteyi TAHMİN etmek yanlış olurdu: mezun kartın LAPİS kutbu
  // ALTIN destededir (10q2 `_gkEntry(k,'lapis',true)`) — bu yüzden ref aranır.
  const _refAcilis = `gk_${k.id}_${wAcilis}`;
  const _refOteki  = `gk_${k.id}_${wAcilis === 'golden' ? 'lapis' : 'golden'}`;
  KINDS.forEach(kind => {
    const at = _bulRef(kind, _refAcilis);
    if (at >= 0) { _idx[kind] = at; aktifKind = kind; }
  });
  // Öteki uç öbür destede öne alınır — yol iki ucuyla birlikte durur
  KINDS.forEach(kind => {
    if (kind === aktifKind) return;
    const at = _bulRef(kind, _refOteki);
    if (at >= 0) _idx[kind] = at;
  });

  /* Görüntülenen kart — geçiş kutbu ile katalog kartı TEK sözleşmede buluşur
     (`gkPoleAsCard`'ın simetriği): katalog `hisler` der, kutup `duygular`;
     katalog düz string tutar, kutup {text,src,at}. Çeviri yalnız burada. */
  function _gkGorunum(kk, which) {
    // v1'den göçen kartın lapis kutbu YOKTUR (_migrateIfV1) ama deste onu yine
    // de lapis kutbuyla temsil eder (10q2 `_gkEntry` boş kutba düşer) — masanın
    // altında adsız bir sahne açmak yerine var olan kutba dönülür.
    if (!kk[which]) which = which === 'golden' ? 'lapis' : 'golden';
    const pole = kk[which] || {};
    const mzn  = kk.state === 'completed';
    return {
      tip: 'gk', k: kk, which, pole,
      ad: pole.baslik || '', whisper: pole.whisper || '',
      ihtiyac: kk.ihtiyac || '',
      // Mezunda lapis kutup artık bir hedef değil, olunmuş hâldir: rengi de
      // hükmü de altındır — destedeki yüz ne diyorsa detaydaki de onu der.
      renk: (which === 'lapis' && !mzn) ? 'lapis' : 'gold',
      hukum: mzn ? t('gk.now_you')
                 : (which === 'golden' ? t('gk.label_oldugun') : t('gk.label_olman')),
      yazilir: kk.state === 'active',
      maddeler: CAT_KEYS.reduce((o, key) => { o[key] = pole[key] || []; return o; }, {}),
    };
  }

  function _kartGorunum(c, kind) {
    const cev = (arr) => (Array.isArray(arr) ? arr : [])
      .filter(s => typeof s === 'string' && s.trim())
      .map(s => ({ text: s, src: 'kart' }));
    return {
      tip: 'kart', k: null, which: null, pole: null,
      ad: c.name || '', whisper: c.whisper || '',
      ihtiyac: '',                     // katalog kartının ihtiyaç sözcüğü YOKTUR (§6.10)
      renk: kind === 'lapis' ? 'lapis' : 'gold',
      hukum: kind === 'lapis' ? t('gk.label_olman') : t('gk.label_oldugun'),
      yazilir: false,                  // katalog kartı masada okunur, yazılmaz
      maddeler: {
        dusunceler:  cev(c.dusunceler),
        inanclar:    cev(c.inanclar),
        duygular:    cev(c.hisler),    // ← katalog 'hisler' der, kutup 'duygular'
        davranislar: cev(c.davranislar),
      },
    };
  }

  /** Bir destenin öne gelen kartı. İmleç DESTENİN BOYUNA göre kırpılır —
   *  deste küçülmüş olabilir (kutup mezun oldu, hedef düştü) ve yüzey de aynı
   *  kırpmayı yapar; ikisi ayrışırsa masanın altı üstündeki kartı göstermez. */
  function _onKart(kind) {
    const arr = _dokum(kind);
    if (!arr.length) return null;
    _idx[kind] = Math.min(Math.max(0, _idx[kind]), arr.length - 1);
    return arr[_idx[kind]] || null;
  }

  function _gorunen() {
    const c = _onKart(aktifKind);
    if (c && c._gk) {
      const kk = _byId(c._gk.kartId);
      if (kk) return _gkGorunum(kk, c._gk.which);
    }
    if (c) return _kartGorunum(c, aktifKind);
    return _gkGorunum(k, wAcilis);     // masa yoksa ekran açılış kutbunda kalır
  }

  const _desteHTML = (kind) => {
    try { return window.kkDeckHTML?.(kind, { idx: _idx[kind], dar: true }) || ''; }
    catch (_) { return ''; }
  };

  function _kaydir(kind, yon) {
    let total = 0;
    try { total = window.kkDeckLen?.(kind) || 0; } catch (_) {}
    if (!total) return;
    const next = Math.min(Math.max(0, _idx[kind] + (yon > 0 ? 1 : -1)), total - 1);
    if (next === _idx[kind] && aktifKind === kind) return;
    _idx[kind] = next;
    aktifKind = kind;                  // kaydırdığın deste masanın konusu olur
    try { window.fxCue?.('flip'); } catch (_) {}   // His Motoru (13e)
    render();
  }

  const overlay = document.createElement('div');
  overlay.className = 'onb-ritual sc-onb gk-onb atl-onb gk-detail';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="atl-atmo" aria-hidden="true">
      <div class="atl-ember"></div>
      <div class="atl-grain"></div>
      <div class="atl-spine"></div>
      <div class="atl-veil"></div>
    </div>
    <div class="atl-host"></div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('onb-open'));

  function render() {
    const g = _gorunen();
    const renk = g.renk;
    const readOnly = !g.yazilir;
    _atlSu(overlay, renk === 'lapis');
    const lists = CATS.map((c, ci) => {
      const arr = g.maddeler[c.key] || [];
      const items = arr.map((e, i) => `
        <li class="atl-line atl-line--${(e && e.src) || 'user'}">
          <span class="atl-line-txt">${esc(e && e.text)}</span>
          ${readOnly ? '' : `<button type="button" class="atl-line-x" data-cat="${c.key}" data-i="${i}"
                  aria-label="${t('gk.remove')}">×</button>`}
        </li>
      `).join('');
      return `
        <section class="atl-group ikv-panel${renk === 'lapis' ? ' ikv-panel--lapis' : ''}" style="--i:${ci}">
          <header class="atl-group-head">
            <span class="atl-group-sigil" aria-hidden="true">${c.sigil}</span>
            <span class="atl-group-label">${gkCatBadge(c.key)}</span>
            <span class="atl-group-count">${arr.length}</span>
          </header>
          <hr class="ikv-hairline${renk === 'lapis' ? ' ikv-hairline--lapis' : ''}" aria-hidden="true">
          <ul class="atl-line-list">${items || `<li class="atl-empty">${t('gk.empty_dash')}</li>`}</ul>
          ${readOnly ? '' : `<form class="atl-add-form atl-add-row" data-cat="${c.key}">
            <input type="text" class="atl-add-inp" placeholder="${esc(g.which === 'golden' ? gkPhGold(c.key) : gkPhLapis(c.key))}" maxlength="200" />
            <button type="submit" class="atl-add-btn" aria-label="${t('gk.add_plus')}">+</button>
          </form>`}
        </section>
      `;
    }).join('');

    const deste = kind => `<div class="atl-masa-deste atl-masa-deste--${kind}${kind === aktifKind ? ' is-active' : ''}"
             data-atl-kind="${kind}">${_desteHTML(kind)}</div>`;

    /* SINAMA KAPISI — yalnız LAPİS kutup öndeyken. "Artık o kişiyim" bir
       iddiadır ve iddia hedefe bakarak edilir: altın kutba bakarken aynı
       cümle "artık Kaçan'ım" olurdu. Yeri dört boyutun ALTI: kullanıcı önce
       o kişinin ne düşünüp ne yaptığını okur, sonra iddia eder. */
    const sinamaKapi = (g.tip === 'gk' && !readOnly && g.which === 'lapis')
      ? (gkSinanabilir(g.k)
        ? `<button type="button" class="ikv-seal-btn atl-sinama" data-act="sinama">${t('gk.sinama.kapi', 'ARTIK O KİŞİYİM')}</button>`
        // Dinlenmedeki yol sessizce kaybolmaz — kapının neden kapalı olduğu
        // söylenir (§6.2). Gün SAYISI yazılmaz: bu bir sayaç değil bir hâl.
        : `<div class="atl-masa-not atl-sinama-bekle">${t('gk.sinama.bekle', 'Henüz değil — bu yol daha yürünüyor.')}</div>`)
      : '';

    _atlHost(overlay).innerHTML = `
      <div class="onb-scene atl-scene atl-scene--detail">
        <div class="atl-detail-faces atl-masa">
          ${deste('altin')}
          <div class="atl-detail-ring">${gkRingSVG(g.tip === 'gk' ? g.k.sinav : null)}</div>
          ${deste('lapis')}
        </div>
        <div class="atl-kicker${renk === 'lapis' ? ' atl-kicker--su' : ''}">${g.tip === 'gk' ? `${t('gk.my_card')} · ${g.hukum}` : g.hukum}</div>
        <h1 class="atl-detail-name">${esc(g.ad)}</h1>
        ${g.whisper ? `<div class="atl-detail-whisper">${esc(g.whisper)}</div>` : ''}
        ${g.tip === 'gk' ? `<div class="atl-ore-note">
          <span class="atl-ore-note-label">${t('gk.need_word')}</span>
          <span class="atl-ore-note-text">${esc(g.ihtiyac)}</span>
        </div>` : ''}
        <div class="atl-groups ikv-cascade">${lists}</div>
        ${sinamaKapi}
        ${readOnly
          ? `<div class="atl-masa-not">${g.tip === 'gk'
              ? t('gk.masa.okunur_yol', 'Yürünmüş yol geri yazılmaz.')
              : t('gk.masa.okunur_kart', 'Bu kart burada okunur, yazılmaz.')}</div>`
          : `<button type="button" class="ikv-ghost-btn atl-release" data-act="release">${t('gk.release_path')}</button>`}
      </div>
      <button class="atl-close" data-act="close" aria-label="${t('gk.close')}">×</button>
    `;

    // Deste bağlaması 10q2'nin kendi yüzeyinden gelir; masa yalnız kabı ve
    // imleci verir. Her kap AYRI bağlanır — yüzey `onSelect`'e kind taşımaz,
    // masa onu kabın kendisinden okur.
    _atlHost(overlay).querySelectorAll('[data-atl-kind]').forEach(el => {
      const kind = el.dataset.atlKind;
      try {
        window.kkDeckBind?.(el, {
          onSelect: () => { if (aktifKind !== kind) { aktifKind = kind; render(); } },
          onKaydir: (kd, yon) => _kaydir(kd, yon),
        });
      } catch (_) {}
      // Boş destenin daveti başka ekrana götürür — masa üstte asılı kalmasın
      el.querySelectorAll('[data-kkb-goto]').forEach(b => b.addEventListener('click', _kapat));
    });

    _atlHost(overlay).querySelectorAll('.atl-add-form').forEach(f => {
      f.addEventListener('submit', e => {
        e.preventDefault();
        if (!g.yazilir || !g.pole) return;
        const cat = f.dataset.cat;
        const inp = f.querySelector('.atl-add-inp');
        const txt = inp?.value?.trim();
        if (!txt) return;
        if (_addEntry(g.pole, cat, txt, 'user')) {
          g.k.updated_at = NOW();
          gkSave(g.k);
          render();
        } else {
          try { showToast(t('gk.toast_already_card')); } catch (_) {}
        }
      });
    });
  }

  function _kapat() {
    window.wtOverlayClose?.('anin-ocagi');   // Kullanım Nabzı (00f)
    overlay.classList.add('onb-closing');
    setTimeout(() => overlay.remove(), 320);
  }

  overlay.addEventListener('click', e => {
    const tgt = e.target;
    if (!tgt) return;
    if (tgt.closest('[data-act="close"]')) { _kapat(); return; }
    // Düzenleme daima MASADA öne gelen karta uygulanır — deste kaydırıldıysa
    // ekranın altı başka bir kartı gösteriyordur, silme oraya düşmelidir.
    const g = _gorunen();
    if (!g.yazilir) return;   // geçmiş ve katalog kartı düzenlenmez
    // "ARTIK O KİŞİYİM" — masa kapanır, sınama onun yerine açılır. Masayı
    // ARKADA bırakmak iki sahneyi üst üste bindirirdi: sınama geçerse
    // tamamlanma töreni de aynı yığına açılır ve kapanış sırası karışır.
    if (tgt.closest('[data-act="sinama"]')) {
      const kartId = g.k.id;
      _kapat();
      setTimeout(() => { try { gkSinamaAc(kartId); } catch (_) {} }, 340);
      return;
    }
    // Yolu bırak — iki-vuruşlu onay (geri alınamaz; kırmızı = kritik, Prensip 1)
    const rel = tgt.closest('[data-act="release"]');
    if (rel) {
      if (rel.classList.contains('atl-release--armed')) {
        g.k.state = 'abandoned';
        g.k.updated_at = NOW();
        if (S._gecisKartiAktif === g.k.id) S._gecisKartiAktif = null;
        gkSave(g.k);
        _releaseSentez(g.k);   // iki toplamdan da izi çekilir
        _kapat();
        try { window.yolRenderHero?.(); } catch (_) {}
        try { gkSyncGreeting(); } catch (_) {}
        try { showToast(t('gk.toast_released')); } catch (_) {}
      } else {
        rel.classList.add('atl-release--armed');
        rel.textContent = t('gk.release_armed');
        setTimeout(() => {
          if (rel.isConnected) {
            rel.classList.remove('atl-release--armed');
            rel.textContent = t('gk.release_path');
          }
        }, 4000);
      }
      return;
    }
    const rm = tgt.closest('.atl-line-x');
    if (rm) {
      const cat = rm.dataset.cat;
      const i = +rm.dataset.i;
      const pole = g.pole;
      if (pole && Array.isArray(pole[cat]) && i >= 0 && i < pole[cat].length) {
        pole[cat].splice(i, 1);
        g.k.updated_at = NOW();
        gkSave(g.k);
        render();
        try { window.yolRenderHero?.(); } catch (_) {}
      }
    }
  });

  render();
}

/* ══════════════════════════════════════════════════════════════
   TAMAMLANMA TÖRENİ — lapis kart altına YANAR ("ARTIK O KİŞİSİN")
══════════════════════════════════════════════════════════════ */
/* Tamamlanma töreni — halka mühürlenir, lapis kart altına yanar.
   Tetikleyici sınıflar `.gk-completion`/`.gk-completion-go` KORUNUR (JS/test
   kancası — tests/10A-gecis-karti.test.js:145); görsel dil yeni atl-complete-*
   sınıflarından gelir (Ocak kalibresi: mühür damgası + altın flaş + aforizma). */
function _completionCeremony(k, onDone) {
  const reduce = typeof window !== 'undefined' &&
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const overlay = document.createElement('div');
  overlay.className = 'onb-ritual sc-onb gk-onb atl-onb gk-seal-ceremony gk-completion';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  document.body.appendChild(overlay);

  const ikvCardFace = window.ikvCardFace;
  const lapisCard = typeof ikvCardFace === 'function'
    ? ikvCardFace(
        { id: 'l_' + k.id, name: k.lapis.baslik || t('gk.fallback.target_short'), whisper: k.lapis.whisper, virtue: 'odak' },
        { palette: 'lapis', sahne: _poleSahne(k, 'lapis'), kicker: t('gk.label_olman'), sub: k.lapis.whisper || '' }
      )
    : _atlCardFallback(k.lapis, 'lapis', t('gk.label_olman'));

  // ALTINLAŞMIŞ versiyon (aynı içerik, palette: gold) — yanma sonunda görünür
  const goldenedCard = typeof ikvCardFace === 'function'
    ? ikvCardFace(
        { id: 'lg_' + k.id, name: k.lapis.baslik || t('gk.fallback.target_short'), whisper: k.lapis.whisper, virtue: 'yansima' },
        { palette: 'gold', sahne: _poleSahne(k, 'lapis'), kicker: t('gk.now_you'), sub: k.lapis.whisper || '' }
      )
    : _atlCardFallback(k.lapis, 'gold', t('gk.now_you'));

  overlay.innerHTML = `
    <div class="atl-atmo" aria-hidden="true">
      <div class="atl-ember"></div>
      <div class="atl-grain"></div>
    </div>
    <div class="onb-scene atl-scene atl-scene--complete">
      <div class="atl-kicker">${t('gk.transition_sealing')}</div>
      <div class="atl-complete-stage">
        <div class="atl-complete-card atl-complete-card--lapis">${lapisCard}</div>
        <div class="atl-complete-card atl-complete-card--gold">${goldenedCard}</div>
        <svg class="atl-complete-ring" viewBox="0 0 120 120" aria-hidden="true">
          <circle class="atl-complete-ring-track" cx="60" cy="60" r="54"/>
          <circle class="atl-complete-ring-arc" cx="60" cy="60" r="54" transform="rotate(-90 60 60)"/>
        </svg>
        <div class="atl-complete-stamp" aria-hidden="true">◆</div>
      </div>
      <div class="atl-flash atl-flash--complete" aria-hidden="true"></div>
      <div class="atl-complete-name">${esc(k.lapis.baslik || t('gk.fallback.target_short'))}</div>
      <div class="atl-complete-verdict"><em>${t('gk.now_that_person_lc')}</em></div>
      <div class="atl-complete-aphorism">${t('gk.complete_aphorism')}</div>
      <div class="atl-complete-portre">${t('gk.complete_portre', 'Niyet alınan, olunana karıştı.')}</div>
      <div class="atl-complete-fineprint">${esc(k.golden.baslik)} → ${esc(k.lapis.baslik)} · ${t('gk.moment_carried')}</div>
    </div>
  `;

  requestAnimationFrame(() => overlay.classList.add('onb-open', 'gk-completion-go'));
  try { window.fxCue && window.fxCue('holoGrand'); } catch (_) {}

  const hold = reduce ? 400 : 2400;
  setTimeout(() => {
    overlay.classList.add('onb-closing');
    setTimeout(() => {
      overlay.remove();
      try { onDone && onDone(); } catch (_) {}
      try { showToast(t('gk.toast_transition_sealed')); } catch (_) {}
    }, 360);
  }, hold);
}

/* ══════════════════════════════════════════════════════════════
   KENDİ KOLEKSİYONUM — tek liste "BENİM KARTLARIM"
   ───────────────────────────────────────────────────────────
   Drawer "KENDİ KOLEKSİYONUM" → #kk-mine-view → bu render.
   Tüm tamamlanmış Geçiş Kartım'lar (Bugün + Sohbet kaynaklı)
   tek ızgarada. Her tile lapis kutbunun altınlaşmış mührü
   (10B'den göçen "ARTIK O KİŞİ" dili) + kaynak meta + paylaşım
   durumu. Yalnız sahip görür.
══════════════════════════════════════════════════════════════ */
function _kkMineCard(k) {
  const ikvCardFace = window.ikvCardFace;
  const lapis = k?.lapis || {};
  if (typeof ikvCardFace !== 'function') return _atlCardFallback(lapis, 'gold', t('gk.now_that_person_short'));
  return ikvCardFace(
    { id: (k?.id || 'ak_mini') + '_seal',
      name: lapis.baslik || t('gk.my_card_name'),
      whisper: lapis.whisper || '', virtue: 'odak', glyph: 'wanderer' },
    { palette: 'gold', mini: true, kicker: t('gk.now_that_person_short'), sahne: _poleSahne(k, 'lapis') }
  );
}

export function loadKendiKoleksiyonumView() {
  const body = document.getElementById('kk-mine-body');
  if (!body) return;

  const cards = gkCompletedCards()
    .slice().sort((a, b) => String(b.sealed_at || b.updated_at || '')
      .localeCompare(String(a.sealed_at || a.updated_at || '')));

  if (!cards.length) {
    body.innerHTML = `
      <div class="atl-mine-empty">
        <div class="atl-mine-empty-kicker">${t('gk.my_collection')}</div>
        <div class="atl-mine-empty-title">${t('gk.mine_empty_title')}</div>
        <p class="atl-mine-empty-sub">${t('gk.mine_empty_sub')}</p>
        <div class="atl-mine-empty-actions">
          <button class="ikv-seal-btn" onclick="switchView('bugun')">
            ${t('gk.goto_today')}
          </button>
        </div>
      </div>`;
    return;
  }

  const tiles = cards.map((k, i) => {
    const src = k.source === 'sohbet' ? t('gk.src_sohbet_short') : t('gk.src_bugun_short');
    return `
    <button class="atl-mine-cell" data-act="open" data-id="${esc(k.id)}" style="--i:${Math.min(i, 24)}"
            aria-label="${esc((k.lapis||{}).baslik || t('gk.my_card_name'))} — ${t('gk.detail_word')}">
      <div class="atl-mine-card-wrap">${_kkMineCard(k)}</div>
      <div class="atl-mine-cell-foot">
        <span class="atl-mine-cell-kind">${t('gk.cell_kind').replace('{src}', src)}</span>
        ${k.shared ? `<span class="atl-mine-cell-shared" title="${t('gk.in_social')}">◉ ${t('gk.shared_word')}</span>` : ''}
      </div>
    </button>`;
  }).join('');

  body.innerHTML = `
    <div class="atl-mine-head">
      <div class="atl-mine-kicker">${t('gk.my_collection')}</div>
      <h2 class="atl-mine-title">${t('gk.mine_title')}</h2>
      <p class="atl-mine-tag">${t('gk.mine_tag')}</p>
      <div class="atl-mine-actions">
        <button class="ikv-ghost-btn" onclick="switchView('bugun')">
          ${t('gk.goto_today')}
        </button>
        <button class="ikv-ghost-btn" onclick="switchView('sosyal')">
          ${t('gk.goto_social')}
        </button>
      </div>
    </div>
    <div class="atl-mine-sec">
      <div class="atl-mine-sec-head">
        <div class="atl-mine-sec-label">${t('gk.my_cards_count').replace('{n}', cards.length)}</div>
        <div class="atl-mine-sec-sub">${t('gk.mine_sec_sub')}</div>
      </div>
      <div class="atl-mine-grid ikv-cascade">${tiles}</div>
    </div>`;

  body.onclick = (e) => {
    const cell = e.target.closest('[data-act="open"]');
    if (!cell) return;
    try { gkOpenCollection(cell.dataset.id); } catch (_) {}
  };
}

/* ══════════════════════════════════════════════════════════════
   EMRE BAĞLAMI — aktif yol varsa iki kutbu LLM'e geçir
══════════════════════════════════════════════════════════════ */
export function gkGetContext() {
  const k = _getActive();
  const pick = (pole, key) => (pole[key] || []).slice(-3).map(e => e.text).join('; ');

  if (k) {
    const lines = ['◈ GEÇİŞ KARTIM · İKİ KUTUPLU ANLIK YOL (şu anki ihtiyaç):'];
    if (k.ihtiyac) lines.push(`İhtiyaç: ${k.ihtiyac}`);
    lines.push(`ŞU AN olduğu: "${k.golden.baslik}".`);
    CAT_KEYS.forEach(key => { if (k.golden[key]?.length) lines.push(`  ${t('gk.gold_word')} · ${gkCatLabel(key)}: ${pick(k.golden, key)}`); });
    lines.push(`OLMAN GEREKEN: "${k.lapis.baslik}".`);
    CAT_KEYS.forEach(key => { if (k.lapis[key]?.length) lines.push(`  ${t('gk.lapis_word')} · ${gkCatLabel(key)}: ${pick(k.lapis, key)}`); });
    // NOT: vuruş sayısı bağlama GİRMEZ (2026-08-10 sökümü). Üç tık bir kanıt
    // değildi; kanıtsız değer LLM bağlamına hiç girmez (§6.10).
    lines.push(p('prompt.gecis_karti.walk_directive'));
    return lines.join('\n');
  }

  // Aktif yol yok — son tamamlanmış Geçiş Kartım'ların LAPİS kutbunu
  // "olmak istediği kişi" sinyali olarak ilet (eski ilhamGetContext'in yerini alır).
  const done = gkCompletedCards()
    .slice().sort((a, b) => String(b.sealed_at || '').localeCompare(String(a.sealed_at || '')))
    .slice(0, 5);
  if (!done.length) return '';
  const blendLines = done.map(k => {
    const lapis = k.lapis || {};
    const d = (lapis.davranislar || []).slice(0, 3)
      .map(e => typeof e === 'string' ? e : (e?.text || '')).filter(Boolean).join(' · ');
    return `• "${lapis.baslik || '—'}"${lapis.whisper ? ' — ' + lapis.whisper : ''}${d ? ' [' + d + ']' : ''}`;
  }).join('\n');
  return [
    'KULLANICININ ATÖLYE\'DE KAZIDIĞI BENİM KARTLARIM (olmak istediği kişiyi besler):',
    blendLines,
    p('prompt.gecis_karti.blend_directive'),
  ].join('\n');
}

/* ══════════════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════════════ */
export function gkInit() {
  gkLoad(); // KV senkron — ekran beklemeden çizilir
  setTimeout(() => {
    try { window.yolRenderHero?.(); } catch (_) {}
    try { gkSyncGreeting(); } catch (_) {}
  }, 60);
  // Sunucu omurgası (mig 025) — tablo doğruluğuyla tazele; tablo boşsa
  // KV'den tek seferlik göç. Tablo yoksa sessiz KV modu (hiçbir şey kırılmaz).
  _gkHydrateRemote().then(refreshed => {
    S._gecisKartlariHydrated = true;
    if (refreshed) {
      try { window.yolRenderHero?.(); } catch (_) {}
      try { gkSyncGreeting(); } catch (_) {}
    }
  }).catch(() => { S._gecisKartlariHydrated = true; });
}

/* TDZ-güvenli global erişim */
if (typeof window !== 'undefined') {
  window.gkOnboard               = gkOnboard;
  // 10B sohbet köprüsü bu iki adı kullanır (import etmez — TDZ/döngü güvenli)
  window.gkDesignForChat         = gkDesignForChat;
  window.gkOpenCollection        = gkOpenCollection;
  /* KİŞİLERİM köprüsünün malzemesi (10q2 tüketir) — yüzeyi orada çizilir */
  window.gkActiveCards           = gkActiveCards;
  window.gkCompletedCards        = gkCompletedCards;
  window.gkPoleFace              = gkPoleFace;
  /* Sentez köprüsü — 02c/10D absorb'u ve 10q3 Benlik Yapısı bunları okur */
  window.gkPoleAsCard            = gkPoleAsCard;
  window.gkPoleAsCardRef         = gkPoleAsCardRef;
  window.gkRefResolve            = gkRefResolve;
  window.gkSyncGreeting          = gkSyncGreeting;
  window.gkGreetingSend          = gkGreetingSend;
  window.gkOpenDetail            = gkOpenDetail;
  /* NOT: gkSinamaAc / gkSinanabilir BİLEREK expose EDİLMEZ — sınamaya tek
     giriş masanın kendi kapısıdır (aynı dosyada, doğrudan çağrı). Tüketicisi
     olmayan bir köprü ölü koddur; dışarıdan bir çağıran doğduğu gün eklenir. */
  window.gkShare                 = gkShare;
  window.gkUnshare               = gkUnshare;
  window.gkGetContext            = gkGetContext;
  window.gkCompletedCount        = gkCompletedCount;
  window.gkInit                  = gkInit;
  window.gkSave                  = gkSave;
  window.gkLoad                  = gkLoad;
  window.loadKendiKoleksiyonumView = loadKendiKoleksiyonumView;
}
