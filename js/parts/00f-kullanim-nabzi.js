/* ═══════════════════════════════════════════════════════════════════
   KULLANIM NABZI (00f) — Gözlemevi'nin görünmez damarı

   FELSEFE: "Önce gör, sonra dönüştür." Kitabın kullanıcıya öğrettiği
   ilkeyi ürün kendine uygular: Emre hangi ekranın yaşadığını, hangi
   törenin ihmal edildiğini SEZGİYLE değil KADRANDAN okur.

   Her ekran girişi bir segment açar, çıkışı kapatır; segmentler
   sessizce usage_events'e (mig 033) akar. Admin tarafı: 13q Gözlemevi.

   GİZLİLİK SÖZLEŞMESİ: içerik ASLA loglanmaz — yalnız ekran adı,
   süre ve sayı. Mesaj metni, kart içeriği, isim: yasak.

   İki katman:
   • view    — switchView ekranları (switchViewHooks.after'dan otomatik)
   • overlay — tören portalları (10t/10f/13h…): wtOverlayOpen/Close ile.
     Overlay süresi view'ın İÇİNDEDİR; toplamlarda üst üste toplanmaz.

   Dayanıklılık: tampon + hidden'da flush (birincil ağ yolu) + 20 sn'de
   localStorage checkpoint'i + sonraki boot'ta yetim segment kurtarma.
   Checkpoint BİLEREK düz localStorage'ta: SafeStorage her yazışı
   Supabase KV'ye taşır — 20 sn'lik nabız için fazla pahalı.
═══════════════════════════════════════════════════════════════════ */
import { S } from '../state.js';
import { sb, IS_ADMIN_PAGE } from '../config.js';
import { switchViewHooks } from './03-auth-shell.js';
import { getUserMsgCount } from './00-config-tracking.js';

const WT_MIN_MS   = 1500;             // altı geçiş gürültüsü — atılır
const WT_MAX_MS   = 30 * 60 * 1000;   // tek segment tavanı (açık unutulan sekme)
const WT_CKPT_MS  = 20000;            // checkpoint nabzı
const WT_FLUSH_MS = 60000;            // periyodik gönderim
const WT_BUF_CAP  = 300;              // ağ yokken tampon tavanı (en eskiler düşer)
const OI_CAP      = 200;              // S._oturumIzi dizileri — bellekte, uzun oturumda sınırsız büyümesin

const _ckptKey = uid => `etw_wt_ckpt_${uid}`;

let _inited     = false;
let _sessionId  = null;   // sayfa-yüklemesi başına kimlik (oturum sayımı)
let _seg        = null;   // aktif view segmenti  { screen, kind, prev, t0 }
let _ov         = null;   // aktif overlay alt-segmenti (view'ın içinde)
let _buf        = [];     // kapanmış, gönderim bekleyen satırlar
let _lastScreen = null;   // hidden→visible dönüşünde yeniden açmak için
let _lastOv     = null;   // hidden anında açık olan tören — dönüşte yeniden açılır
let _chatBase   = 0;      // chat segmenti açılırkenki kullanıcı mesaj sayısı
let _flushBusy  = false;

/* ── Tanıma Motoru (FAZ 1) — oturum izi yardımcıları ──
   İçerik taşımaz (kimlik+süre+sonuç); sunucu satırına HİÇ girmez (K4),
   yalnız S._oturumIzi'ye — hasadı 09d omSessionHarvest yapar. */
function _oiPush(arrName, item) {
  try {
    const arr = S._oturumIzi?.[arrName];
    if (!arr) return;
    arr.push(item);
    if (arr.length > OI_CAP) arr.splice(0, arr.length - OI_CAP);
  } catch (_) {}
}

/* ── segment yaşam döngüsü ── */

function _closeSeg(seg) {
  if (!seg) return;
  const uid = S.currentUser?.id;
  if (!uid) return;                       // oturum düştüyse sessizce bırak
  const dur = Date.now() - seg.t0;
  if (dur < WT_MIN_MS) {
    // Bir şeye 1.5 sn'den az bakıp kapatmak da bir sinyaldir — eskiden
    // sessizce atılıyordu (I1 kör noktası). Sunucuya gitmez, yalnız oturum izine.
    _oiPush('skipler', { ekran: seg.screen, tur: seg.kind, ts: Date.now() });
    return;
  }
  const row = {
    user_id:     uid,
    session_id:  _sessionId,
    screen:      seg.screen,
    kind:        seg.kind,
    prev_screen: seg.prev || null,
    entered_at:  new Date(seg.t0).toISOString(),
    duration_ms: Math.min(dur, WT_MAX_MS),
  };
  // Sohbet derinliği: "12 dk ama 0 mesaj" ile "12 dk, 9 mesaj" ayrımı —
  // öneri motoru için altın değerinde. Yalnız SAYI; içerik yok.
  if (seg.kind === 'view' && seg.screen === 'chat') {
    let msgs = 0;
    try { msgs = Math.max(0, getUserMsgCount() - _chatBase); } catch (_) {}
    row.meta = { msgs };
  }
  _buf.push(row);
  if (_buf.length > WT_BUF_CAP) _buf.splice(0, _buf.length - WT_BUF_CAP);
}

function _closeOverlay() {
  if (_ov) { _closeSeg(_ov); _ov = null; }
}

function _openView(screen) {
  if (!screen) return;
  if (document.hidden) { _lastScreen = screen; return; }  // arka planda süre sayılmaz; dönüşte açılır
  if (_seg && _seg.screen === screen) return;  // aynı ekrana tekrar → segment sürsün
  _closeOverlay();                              // view değişti → açık tören otomatik kapanır
  const prev = _seg ? _seg.screen : null;
  _closeSeg(_seg);
  _seg = { screen, kind: 'view', prev, t0: Date.now() };
  _lastScreen = screen;
  // İ7 — "bu oturumda neye bakıldı" izi (FAZ 5 tüketir, burada yalnız biriktirilir).
  _oiPush('ekranlar', { ekran: screen, ts: Date.now() });
  if (screen === 'chat') {
    try { _chatBase = getUserMsgCount(); } catch (_) { _chatBase = 0; }
  }
}

/* ── tören portalları (10t/10f/13h/… FAZ 2 enstrümantasyonu) ── */

export function wtOverlayOpen(name) {
  if (!_inited || !name) return;
  if (_ov && _ov.screen === String(name)) return;  // aynı tören zaten açık (adım-adım
  // yeniden mount, örn. 10s Armağan→Söz) → segment sürsün, bölünmesin
  _closeOverlay();
  _ov = { screen: String(name), kind: 'overlay', prev: _seg?.screen || null, t0: Date.now() };
}

/** Törenin SONUCU (Tanıma Motoru FAZ 1) — segmentin ömründen bağımsız.
 *  Ayrı durmasının nedeni ölçü bütünlüğü: bir törenin "ne kadar sürdüğü" ile
 *  "nasıl bittiği" farklı sorulardır ve bazı törenlerde farklı anlarda
 *  cevaplanır (10q4: sahne kapanır, mühür jesti sonra biter). İkisini tek
 *  çağrıya bağlamak, sonucu beklemek için segmenti açık tutmayı gerektirirdi —
 *  o da Gözlemevi'ndeki süre metriğinin tanımını sessizce değiştirirdi (K4).
 *
 *  KAPALI KÜME — tanım burada, tek yerde (çağrı yerlerinde yeniden yorumlanmaz;
 *  FAZ 3 seçicisi bu tanımı okur):
 *    'muhur' → törenin DAVET ETTİĞİ eylem yapıldı. Her törende kendi eylemi:
 *              olus-davet'te mührün basılması, kart-detay'da "Artık o kişiyim"
 *              CTA'sı, gunluk-ritus'ta sözün verilmesi ya da hesabın onayı.
 *              Ölçüt tek: kullanıcı sahneden çıkmadı, sahnenin istediğini yaptı.
 *    'kapat' → çıkıldı, vazgeçildi, ertelendi. Yargı yok — erteleme de bir cevaptır.
 *  Sonucu BİLİNMEYEN tören hiç yazmaz (undefined) — uydurulmuş sonuç, uydurulmuş
 *  veridir (§6.10). Sunucu satırına GİRMEZ — yalnız S._oturumIzi.torenler'e. */
export function wtTorenSonuc(ad, sonuc) {
  if (!ad || (sonuc !== 'muhur' && sonuc !== 'kapat')) return;
  _oiPush('torenler', { ad: String(ad), sonuc, ts: Date.now() });
}

/** `sonuc` (Tanıma Motoru FAZ 1) — isteğe bağlı ikinci argüman; tek argümanlı
 *  ~20 mevcut çağrı geri uyumlu çalışmaya devam eder. Sonucun kapanışla aynı
 *  anda bilindiği törenlerin kısayolu; ayrıştığı yerde wtTorenSonuc kullanılır. */
export function wtOverlayClose(name, sonuc) {
  if (!_ov) return;
  if (name && _ov.screen !== String(name)) return;  // başka törenin kapanışı bizi kapatmasın
  if (sonuc !== undefined) wtTorenSonuc(_ov.screen, sonuc);
  _closeSeg(_ov);
  _ov = null;
}

/* ── Mod Nabzı (FAZ 4, .claude/plans/mod-sistemi.md) ──
   Segment değil, an-be-an bir olay: her LLM turunda bir kez, mod netleştikten
   sonra (06-summary-chat _runLLMTurn) çağrılır. Var olan usage_events şemasına
   yeni bir `kind:'mode'` satırı olarak biner — yeni migration/kolon gerekmez.
   screen=gerçekleşen mod, prev_screen=regex ipucu (SQL'de hint↔LLM uyum oranı
   `screen = prev_screen` ile hesaplanır); meta={tag_missing, ctx_mode, msg_no}.
   duration_ms=0 (segment değil) — CHECK(duration_ms>=0) bunu kabul eder. */
export function wtLogMode(mode, hint, tagMissing, ctxMode) {
  if (!_inited || !mode) return;
  const uid = S.currentUser?.id;
  if (!uid) return;
  let msgNo = 0;
  try { msgNo = getUserMsgCount(); } catch (_) {}
  _buf.push({
    user_id:     uid,
    session_id:  _sessionId,
    screen:      mode,
    kind:        'mode',
    prev_screen: hint || null,
    entered_at:  new Date().toISOString(),
    duration_ms: 0,
    meta:        { tag_missing: !!tagMissing, ctx_mode: ctxMode || null, msg_no: msgNo },
  });
  if (_buf.length > WT_BUF_CAP) _buf.splice(0, _buf.length - WT_BUF_CAP);
}

/* ── Gecikme Nabzı (İç Çalışma 01 · boşluk B) ──
   İlk görünür harfin kaç ms'de geldiği. NEDEN ölçülüyor: bugünkü primary
   model reasoning sınıfı ve düşünürken ekranda yalnız üç nokta var; "hız mı
   derinlik mi" kararı bir gözleme değil DAĞILIMA dayanmalı. İlk çalışmadaki
   "~25 sn" rakamı tek bir günün izlenimiydi ve bugün doğrulanamıyor —
   ölçmeden model değiştirmek tahmindir.
   Çağrı yeri 04-llm-hero-history'nin streaming karesidir: fallback zincirinde
   hangi modelin yanıtladığını yalnız o kare bilir (callLLM kendini yeni
   modelle çağırır). Yanlış model adına yazılan süre ölçüm değil uydurmadır.
   kind:'latency' mevcut usage_events şemasına migration'sız biner
   (wtLogMode ile aynı desen); screen=model, duration_ms=TTFT. */
export function wtLogLatency(model, ttftMs, { mode, ctxMode, fm } = {}) {
  if (!_inited || !model) return;
  const ms = Number(ttftMs);
  if (!Number.isFinite(ms) || ms < 0) return;   // CHECK(duration_ms>=0)
  const uid = S.currentUser?.id;
  if (!uid) return;
  _buf.push({
    user_id:     uid,
    session_id:  _sessionId,
    screen:      String(model),
    kind:        'latency',
    prev_screen: null,
    entered_at:  new Date().toISOString(),
    duration_ms: Math.round(ms),
    meta:        {
      mode: mode || null,
      ctx_mode: ctxMode || null,
      /* Hangi Wanderer ekseninde konuşuldu (İç Çalışma 08 rev.2 · K2).
         Ayrı bir olay yazmak yerine buraya biniyor: tur zaten burada
         sayılıyor ve seçimden güçlü bir kanıt — seçim niyettir, tur
         yaşanmış hâlidir. `_FM_ID` dosyanın ilerisinde tanımlıdır; modül
         seviyesindeki const çağrı anında çözülmüştür (TDZ yok). */
      fm: _FM_ID.has(fm) ? fm : null,
    },
  });
  if (_buf.length > WT_BUF_CAP) _buf.splice(0, _buf.length - WT_BUF_CAP);
}

/* ── Emniyet Nabzı (Emniyet Katmanı · Faz 5) ──
   Anonim güvenlik olayları: crisis_signal / crisis_card / crisis_grace.
   İçerik ASLA taşınmaz — yalnız olay adı. Savunulabilirlik kanıtı: "sistem
   şu tarihte şu kadar kez yönlendirme yaptı" (Raine davası dersi —
   GUVENLIK-VE-SORUMLULUK-CALISMASI.md). kind:'safety' mevcut şemaya
   migration'sız biner (wtLogMode ile aynı desen). */
export function wtLogSafety(event) {
  if (!_inited || !event) return;
  const uid = S.currentUser?.id;
  if (!uid) return;
  _buf.push({
    user_id:     uid,
    session_id:  _sessionId,
    screen:      String(event),
    kind:        'safety',
    prev_screen: null,
    entered_at:  new Date().toISOString(),
    duration_ms: 0,
    meta:        {},
  });
  if (_buf.length > WT_BUF_CAP) _buf.splice(0, _buf.length - WT_BUF_CAP);
}

/* ── Hafıza Nabzı (İç Çalışma 02 · boşluk A) ──
   Epizodik Hafıza'nın (09f) canlı olup olmadığını bugün yalnız bir
   `console.warn` söylüyor — yani hiç kimse. Şema (`user_memories`) ve
   `llm-embed` deploy'u ELLE iş olduğu için motor prod'da sessizce hep yerel
   fallback'te çalışıyor olabilir: kod kusursuz görünür, anlamsal hafıza hiç
   yaşamaz. Görünmeyen altyapı yok hükmündedir.
   screen=tur (recall|prefetch|ingest), prev_screen=yol (uzak|yerel|bos|hata) —
   uzak-yol yüzdesi SQL'de bu iki alandan çıkar (wtLogMode'un hint↔mod uyumu
   emsali). duration_ms=geçen süre, meta={sayi}. İçerik ASLA taşınmaz: ne sorgu
   ne anı metni; yalnız hangi yoldan kaç kayıt geldiği.
   kind:'memory' mevcut usage_events şemasına migration'sız biner. */
export function wtLogMemory(tur, { yol, ms, sayi } = {}) {
  if (!_inited || !tur) return;
  const uid = S.currentUser?.id;
  if (!uid) return;
  const sure = Number(ms);
  const adet = Number(sayi);
  _buf.push({
    user_id:     uid,
    session_id:  _sessionId,
    screen:      String(tur),
    kind:        'memory',
    prev_screen: yol ? String(yol) : null,
    entered_at:  new Date().toISOString(),
    duration_ms: Number.isFinite(sure) && sure > 0 ? Math.round(sure) : 0,
    meta:        { sayi: Number.isFinite(adet) && adet > 0 ? Math.round(adet) : 0 },
  });
  if (_buf.length > WT_BUF_CAP) _buf.splice(0, _buf.length - WT_BUF_CAP);
}

/* ── Bağlam Nabzı (İç Çalışma 02 · boşluklar D+H) ──
   On dört kanal her turda tek bir system prompt için yarışıyor. Kanal başına
   tavan var (`_CONTEXT_BUDGETS`, 01:169) ama TOPLAM görünmüyor: hangi kanal hiç
   tüketilmedi, hangisi her turda kırpıldı — ölçülmüyordu. En büyük kanal
   (`personalization`) üstelik standard modda tavansız ve içine bu ay dört yeni
   alt-üretici girdi. Tavan tartışmasından önce ölçü gerekir.
   GİZLİLİK SÖZLEŞMESİ — buraya yalnız SAYI girer: kanal adı 01'in sabit etiket
   kümesinden gelir, anahtar deseni tutmayan ya da değeri sayı olmayan her giriş
   sessizce düşer. Kullanıcı metninin kazara meta'ya sızması böylece şemayla
   değil KODLA imkânsız olur (usage_events.meta: "metin içerik YASAK").
   screen=ctx modu, prev_screen=yanıt modu, meta={kanallar, toplam}. */
const _CTX_KANAL_RE = /^[a-z][a-z0-9_]{0,31}$/;

export function wtLogCtx(kanallar, { mode, ctxMode, toplam } = {}) {
  if (!_inited || !kanallar) return;
  const uid = S.currentUser?.id;
  if (!uid) return;
  const temiz = {};
  for (const [k, v] of Object.entries(kanallar)) {
    const n = Number(v);
    if (!_CTX_KANAL_RE.test(k) || !Number.isFinite(n) || n <= 0) continue;
    temiz[k] = Math.round(n);
  }
  if (!Object.keys(temiz).length) return;   // ölçülecek bir şey yoksa satır da yok
  const top = Number(toplam);
  _buf.push({
    user_id:     uid,
    session_id:  _sessionId,
    screen:      String(ctxMode || 'standard'),
    kind:        'ctx',
    prev_screen: mode ? String(mode) : null,
    entered_at:  new Date().toISOString(),
    duration_ms: 0,
    meta:        {
      kanallar: temiz,
      toplam:   Number.isFinite(top) && top > 0
        ? Math.round(top)
        : Object.values(temiz).reduce((a, b) => a + b, 0),
    },
  });
  if (_buf.length > WT_BUF_CAP) _buf.splice(0, _buf.length - WT_BUF_CAP);
}

/* ── Koleksiyon Nabzı (İç Çalışma 04 rev.2 · boşluk Y1) ──
   Kart evreninin iki kolu da bugüne kadar sayılmadı: kimlik kolu (10q) kart
   dağıtıyor, bilgelik kolu (12f) Elmas harcatıyor. Ekonomiyle kimliğin kıyası
   ancak ikisi AYNI kind altındayken tek sorguda çıkar — bu yüzden iki kanal
   değil bir kanal, ayrımı `olay` yapar.
   GİZLİLİK SÖZLEŞMESİ — buraya kart METNİ girmez: yalnız katalog anahtarı
   (id), kapalı kümeden gelen etiketler ve sayı. Desene uymayan her değer
   sessizce null'a düşer (wtLogCtx'in kuralının ikizi) — portrenin meta'ya
   kazara sızması şemayla değil KODLA imkânsız olsun diye.
   DAMGAYI TESLİM EDEN BASAR (§6.10): kazanım kkMatchCard'ın eşiğinde değil
   kkOpenPack töreni açıldığında, hazine hzDrawPack çekilişinde değil
   hzApplyDraw koleksiyona işledikten sonra yazılır. Açılmamış bir tören
   "gösterildi" sayılmaz.
   screen=olay, prev_screen=kart id'si, meta={nadirlik, kategori, n, elmas}. */
const _KART_OLAY = new Set(['kazanim', 'ilk-kart', 'paket', 'dupe-iade', 'set-tamam']);
const _KART_ETIKET_RE = /^[a-z][a-z0-9_-]{0,47}$/;

export function wtLogKart(olay, { kartId, nadirlik, kategori, n, elmas } = {}) {
  if (!_inited || !_KART_OLAY.has(olay)) return;
  const uid = S.currentUser?.id;
  if (!uid) return;
  const et = (v) => (typeof v === 'string' && _KART_ETIKET_RE.test(v) ? v : null);
  const say = Number(n);
  const elm = Number(elmas);
  _buf.push({
    user_id:     uid,
    session_id:  _sessionId,
    screen:      olay,
    kind:        'kart',
    prev_screen: et(kartId),
    entered_at:  new Date().toISOString(),
    duration_ms: 0,
    meta:        {
      nadirlik: et(nadirlik),
      kategori: et(kategori),
      // n: paket başına kart sayısı / koleksiyon büyüklüğü — olaya göre okunur
      n:     Number.isFinite(say) && say > 0 ? Math.round(say) : 0,
      // elmas: harcama negatif, iade/bonus pozitif — ekonominin iki yönü
      elmas: Number.isFinite(elm) ? Math.round(elm) : 0,
    },
  });
  if (_buf.length > WT_BUF_CAP) _buf.splice(0, _buf.length - WT_BUF_CAP);
}

/* ── Ritüellerin Nabzı (İç Çalışma 05 rev.3 · boşluk A) ──
   Ritüel mimarisi ürünün dönüşüm motorudur ve bugüne kadar motorun devri
   ölçülmedi: dört direk (10i/10k/10l/10m) ile üç yeni yüzey (10n/13A/10h)
   hiç yazmıyordu, 10s ve 10t yalnız törenin SÜRESİNİ yazıyordu. "Kaç gezgin
   başladı, kaçı sonuna kaldı, nerede bıraktı" sorusu cevapsızdı.
   İKİ TÜKETİCİ, TEK ANLAM KÜMESİ: wtTorenSonuc aynı sonucu YEREL oturum
   izine yazar (Tanıma Motoru'nun seçicisi onu okur) — bu fonksiyon sunucu
   kolunu açar. Sözlük tek yerde durur: muhur↔tamam, kapat↔birakti.
   GİZLİLİK SÖZLEŞMESİ — kullanıcının cümlesi buraya GİRMEZ: yalnız kapalı
   kümeden ritüel adı, olay ve sayı. Küme dışı her değer sessizce düşer
   (wtLogKart'ın kuralının ikizi) — metnin meta'ya kazara sızması şemayla
   değil KODLA imkânsız olsun diye.
   DAMGAYI TESLİM EDEN BASAR (§6.10): 'tamam' state kaydeden xxSave()'de
   değil, ritüelin kendi mühür/bitiş anında yazılır — yarım kalan seans
   tamamlanmış sayılmaz.
   screen=ritüel adı, prev_screen=olay, duration_ms=ritüelin süresi,
   meta={adim, n}. */
const _RITUS = new Set(['gunluk-ritus', 'hayal', 'kendinle-konusma',
  'degerlendirme', 'engel-atlasi', 'dinlenme', 'derin-calisma', 'sefer',
  'seri-muhru', 'oik-okuma']);
const _RITUS_OLAY = new Set(['basladi', 'tamam', 'birakti']);

export function wtLogRitus(ritus, olay, { adim, sureMs, n } = {}) {
  if (!_inited || !_RITUS.has(ritus) || !_RITUS_OLAY.has(olay)) return;
  const uid = S.currentUser?.id;
  if (!uid) return;
  const say = (v) => {
    const x = Number(v);
    return Number.isFinite(x) && x > 0 ? Math.round(x) : 0;
  };
  _buf.push({
    user_id:     uid,
    session_id:  _sessionId,
    screen:      ritus,
    kind:        'ritus',
    prev_screen: olay,
    entered_at:  new Date().toISOString(),
    // süre yalnız ölçüldüğünde yazılır; ölçülmemiş süre 0'dır, uydurulmaz
    duration_ms: Math.min(say(sureMs), WT_MAX_MS),
    meta: {
      // adim: çok adımlı ritüelde nereye kadar gelindi (terk noktası)
      adim: say(adim),
      // n: ritüele göre okunur — tutulan söz sayısı, yazılan anı sayısı…
      n: say(n),
    },
  });
  if (_buf.length > WT_BUF_CAP) _buf.splice(0, _buf.length - WT_BUF_CAP);
}

/* ── Eşiğin Nabzı (İç Çalışma 06 rev.2 · boşluk A) ──
   Onboarding uygulamanın en pahalı dakikasıdır ve bugüne kadar hiç izi
   yoktu: perde kaç saniye izlendi, hangi kategoride kalem düştü, kaç kişi
   "Bu Kart Benim" dedi — kimse bilmiyordu. Bu kanal eşiğe bir nabız takar;
   eşiğin SIRASINA, RİTMİNE ya da KELİMELERİNE dokunmaz (K1/K3).
   GİZLİLİK SÖZLEŞMESİ — kullanıcının yazdığı cümle buraya GİRMEZ: yalnız
   kapalı kümeden olay/ikincil-eksen adı ve sayı. Kategori adı serbest
   metin değil kapalı kümedir (wtLogKart'ın `et()` kuralının ikizi) — metnin
   meta'ya kazara sızması şemayla değil KODLA imkânsız olsun diye (K4).
   DAMGAYI TESLİM EDEN BASAR (§6.10): perde `_closeSplash`'ta yazılır
   (gösterilme kararında değil — K3), doğuş "Bu Kart Benim" mühründe,
   kategori "Devam" tıklandığında (kutuya yazıldığında değil).
   screen=olay, prev_screen=`dal` (ikincil eksen: kategori adı · sentez
   sonucu · perde katı · eşik durumu — kapalı küme, küme dışı null),
   meta={adim,n,atlandi}. `dal` ile `atlandi` AYRI iki alandır: biri kapalı
   küme adı, öteki 0/1 sayı. Tek parametreye iki anlam yüklemek (string ise
   şu, sayı ise bu) çağıranı da okuru da yanıltır — perde katı `dal:'kat1'`
   ile taşınır, aynı bilgi meta'da ikinci kez durmaz. */
const _ESIK_OLAY = new Set(['perde', 'dil-kapisi', 'basladi', 'kategori',
  'sentez', 'dogus', 'atladi', 'esik-ekrani']);
const _ESIK_PREV = new Set([
  'dusunceler', 'inanclar', 'duygular', 'davranislar',  // kategori adı
  'ok', 'fallback',                                     // sentez sonucu
  'kat1', 'kat2',                                       // perde katı
  'acildi', 'kapandi',                                  // eşik durumu
]);

export function wtLogEsik(olay, { dal, adim, sureMs, n, atlandi } = {}) {
  if (!_inited || !_ESIK_OLAY.has(olay)) return;
  const uid = S.currentUser?.id;
  if (!uid) return;
  const say = (v) => {
    const x = Number(v);
    return Number.isFinite(x) && x > 0 ? Math.round(x) : 0;
  };
  // prev_screen kapalı kümeden geçer; küme dışı her değer sessizce null'a
  // düşer (wtLogKart'ın `et()` kuralının ikizi) — kullanıcının yazdığı bir
  // cümle buraya kazara verilse bile satıra giremez.
  const prevScreen = (typeof dal === 'string' && _ESIK_PREV.has(dal)) ? dal : null;
  _buf.push({
    user_id:     uid,
    session_id:  _sessionId,
    screen:      olay,
    kind:        'esik',
    prev_screen: prevScreen,
    entered_at:  new Date().toISOString(),
    // süre yalnız ölçüldüğünde yazılır; ölçülmemiş süre 0'dır, uydurulmaz
    duration_ms: Math.min(say(sureMs), WT_MAX_MS),
    meta: {
      // adim: çok adımlı akışta nereye kadar gelindi (terk noktası)
      adim: say(adim),
      // n: olaya göre okunur — kategori madde sayısı gibi
      n: say(n),
      // atlandi: perde dokunuşla/tuşla erken kapandıysa 1 (törenin bedeli);
      // süresi dolduysa 0. Perde dışı olaylarda daima 0.
      atlandi: say(atlandi),
    },
  });
  if (_buf.length > WT_BUF_CAP) _buf.splice(0, _buf.length - WT_BUF_CAP);
}

/* ── Duygu Nabzı (13D FAZ 12 · sohbet ayağının kapanışı) ──
   Duygu Motoru bugüne dek yalnız BİR sohbette karar üretiyordu; Emre'nin
   "önce gör" ilkesi burada da geçerli: hangi eksenin ne sıklıkla verildiği,
   İklim'in göreliliğinin gerçekten devrede olup olmadığı (K4), modelin
   kendi okumasının uygulamanın kararından ne sıklıkla ayrıştığı (K5 —
   "defter bu ayrışmayı sayar") ve K6'nın takas mekaniğinin ne sıklıkla
   devreye girdiği bugüne dek SEZGİYLE biliniyordu, KADRANDAN değil.
   GİZLİLİK SÖZLEŞMESİ — 13D K7'nin "duygu söylenmez, davranılır" töresi
   burada da geçerlidir: kullanıcının cümlesi, `kanit`, `gerekce` metni
   buraya ASLA girmez — yalnız beş toplulaştırılabilir alan (eksen, kural,
   kuvvet kaynağı, ayrışma, takas).
   'tutma' (kriz) burada SAYILMAZ: crisis_signal zaten wtLogSafety'de tek
   kaynaktan sayılıyor (13-extras _fireCrisis); ikinci bir kanaldan aynı
   olayı saymak Gözlemevi'nde iki farklı "kaç kriz" rakamı doğurur (K9 —
   duygu motoru kriz üstünde değil altında durur, kendi sayacını da açmaz).
   Kural numarası (dgKarsilama'nın K2 tablosunda hangi satırın tuttuğu)
   bu fazda dışa AÇILMADI — 13D'nin karar mantığına dokunulmadı (bkz.
   rapor Duraklar); alan hep null kalır, ileride dgKarsilama dönüşü
   genişlerse doldurulur.
   screen=eksen (DG_KARSILAMALAR'ın tutma hariç altısı — kapalı küme),
   prev_screen=kuvvet kaynağı (goreli/mutlak, K4), kind:'duygu' mevcut
   usage_events şemasına migration'sız biner (wtLogMode ile aynı desen).

   YANILMA DEFTERİ (K13, FAZ 15) — `yuzey` + `duzeltildi` bu fazda eklendi.
   Aynı kanal artık İKİ olay sınıfı taşır: "konuştu" (duzeltildi:false,
   her turda 06'nın teslim noktasından) ve "düzeltildi" ("beni yanlış
   okudun" jesti, duzeltildi:true, dgSeffaflikAc'ın 'sustur' dalından).
   Bu satırın kendisi bir GATE DEĞİLDİR — yalnız Gözlemevi'nin admin
   kadranını besler; kullanıcı başına gerçek kapanma kararı `S._dgIklim.
   yuzeyDefter` üzerinden `dgKapi`nin kendisinde verilir (13D §8/§10),
   burada TEKRAR hesaplanmaz. `yuzey` kapalı kümedir (`dgKapi`'nin
   DG_KAPI_YUZEYLER'iyle AYNI SEKİZ değer — `davet` FAZ 19'da doğdu; iki
   listenin birlikte değişmesi `tests/13D-iki-defter-kapisi.test.js`'e
   bağlıdır) — bu dosya 13D'yi static import
   ETMEZ (00f admin/kullanıcı ortak yolunda, yeni bir bağımlılık açmaz),
   küme `_DG_EKSEN`'in kendi ikizidir (aynı gerekçe: kapalı küme dışı her
   değer sessizce null'a düşer). */
const _DG_EKSEN = new Set(['taniklik', 'yatistirma', 'sahiplenme', 'berraklik', 'diriltme', 'kutlama']);
const _DG_KUVVET_KAYNAK = new Set(['goreli', 'mutlak']);
/* `davet` FAZ 19'da eklendi (13o sessizlik daveti kendi yüzey kimliğini
   kazandı, DG_KAPI_ESIK ile birebir). Küme dışı değer sessizce null'a
   düşer — yani bu satır unutulsaydı davetin telemetrisi yüzeysiz yazılır,
   Gözlemevi onu hiçbir sütunda göremezdi. */
const _DG_YUZEY = new Set(['sohbet', 'atmosfer', 'esik', 'toren', 'davet', 'secici', 'push', 'kart']);

export function wtLogDuygu(eksen, { kural, kuvvetKaynagi, ayristi, takas, yuzey, duzeltildi } = {}) {
  if (!_inited || !_DG_EKSEN.has(eksen)) return;
  const uid = S.currentUser?.id;
  if (!uid) return;
  const k = Number(kural);
  _buf.push({
    user_id:     uid,
    session_id:  _sessionId,
    screen:      eksen,
    kind:        'duygu',
    prev_screen: _DG_KUVVET_KAYNAK.has(kuvvetKaynagi) ? kuvvetKaynagi : null,
    entered_at:  new Date().toISOString(),
    duration_ms: 0,
    meta: {
      kural:   Number.isFinite(k) ? k : null,
      // ayristi: modelin kendi okuması (FAZ 9) uygulamanın kararından
      // farklı mı — model bu turda DG: etiketi basmadıysa BİLİNMEZ, null
      // (uydurulmuş bir "ayrışmadı" iddiası değil, §6.10).
      ayristi: typeof ayristi === 'boolean' ? ayristi : null,
      // takas: dgKarsilama.ikincil doluysa (susturma/negatif/tekrar/
      // kriz-kapalı, K6) ham karar bir sıra tanıklığa düştü.
      takas:   !!takas,
      // yuzey: kapalı kümeden geçer; küme dışı her değer null'a düşer
      // (wtLogKart'ın `et()` kuralının ikizi). Çağıranlar: sohbet (06),
      // atmosfer (13-extras), esik (02d), toren (13h + 10s), davet (13o +
      // 10q'nun düzeltme dalı). `secici`/`push`/`kart` bilerek sessiz —
      // seçicinin hatası GÖRÜNMEZ olduğu için düzeltme jesti yoktur (FAZ 18
      // denetimi), push FAZ 19'da susmaya karar verildi, `kart` yüzeyinin
      // henüz tüketicisi yok. Bir yüzey konuşmaya başlarsa İKİ defteri de
      // doldurmak zorundadır: `dgYanilmaKonustu` KULLANICININ kendi
      // İklim'ini (kapının beşinci kadranı, gerçek kapanma kararı), bu
      // satır ise Gözlemevi'nin gördüğü toplamı doldurur. FAZ 16-19 beş
      // teslim noktasında yalnız İklim defterini basmıştı; sonuç, admin
      // kadranında `davet` satırının `0 · 1✕` görünmesiydi — sıfır
      // konuşmanın üstünde duran bir düzeltme, yani kendi kendisiyle
      // çelişen bir ölçüm (§6.10). Kapı: tests/13D-iki-defter-kapisi.test.js.
      yuzey:   _DG_YUZEY.has(yuzey) ? yuzey : null,
      // duzeltildi: bu satır bir "konuştu" mu (false) bir "düzeltildi" mi
      // (true) — Gözlemevi ikisini aynı yüzeyde AYRI sayar.
      duzeltildi: !!duzeltildi,
    },
  });
  if (_buf.length > WT_BUF_CAP) _buf.splice(0, _buf.length - WT_BUF_CAP);
}

/* ── Kimlik Üçgeninin Nabzı (İç Çalışma 07 rev.2 · boşluk D) ──
   Üçgenin üç köşesi vardı, ölçüsü yoktu: kaç gezgin olmak istediği kişiyi
   TASARLADI, davranışla çözülen kimlik ne sıklıkla el değiştirdi, kazanımla
   gelen devir ile davranışla gelen kayma birbirine göre nerede duruyor.
   Bunlar ürünün çekirdek dönüşüm döngüsüdür — ölçülmeyen kuzey yıldızı
   yoktur.
   RİTÜEL AYAĞI BURADA SAYILMAZ: Geçiş Okuması kind='ritus' kanalındadır
   (screen='oik-okuma'). Aynı olayı iki kanaldan saymak Gözlemevi'nde iki
   farklı rakam doğurur — wtLogDuygu'nun 'tutma'yı saymama gerekçesiyle
   birebir aynı kural.
   GİZLİLİK SÖZLEŞMESİ: kart adı, kart başlığı, olumlama metni, madde metni
   buraya ASLA girmez — yalnız kapalı kümeden olay/kaynak ve iki sayı. Küme
   dışı her değer sessizce null'a düşer; metnin meta'ya kazara sızması
   şemayla değil KODLA imkânsız olsun diye.
   DAMGAYI TESLİM EDEN BASAR (§6.10): 'oik-dogus' kartın state'i 'active'
   olduğunda yazılır, tasarım töreni AÇILDIĞINDA değil; 'kayma'/'devir'
   imSetPersona'nın kimliği GERÇEKTEN devrettiği dalda yazılır (aynı karta
   ikinci kez set edildiğinde fonksiyon erken döner, satır yazılmaz).
   screen=olay, prev_screen=kaynak, meta={gun,n}. */
const _KM_OLAY   = new Set(['oik-dogus', 'oik-serbest', 'kayma', 'devir']);
const _KM_KAYNAK = new Set(['ilk', 'yeniden', 'earn', 'resolve']);

export function wtLogKimlik(olay, { kaynak, gun, n } = {}) {
  if (!_inited || !_KM_OLAY.has(olay)) return;
  const uid = S.currentUser?.id;
  if (!uid) return;
  const say = (v) => {
    const x = Number(v);
    return Number.isFinite(x) && x > 0 ? Math.round(x) : 0;
  };
  _buf.push({
    user_id:     uid,
    session_id:  _sessionId,
    screen:      olay,
    kind:        'kimlik',
    prev_screen: (typeof kaynak === 'string' && _KM_KAYNAK.has(kaynak)) ? kaynak : null,
    entered_at:  new Date().toISOString(),
    duration_ms: 0,
    meta: {
      // gun: kimliğin kaç GÜN tutulduktan sonra el değiştirdiği. Histerezis
      // (18 saat / 8 puan) gerçek hayatta ne kadar tutuyor — parametreye
      // dokunmadan ÖNCE bu sayı okunur; raporun bilinçli sınırı budur.
      gun: say(gun),
      // n: olaya göre okunur — 'oik-dogus'ta kartın madde sayısı,
      // 'kayma'/'devir'de koleksiyon büyüklüğü.
      n:   say(n),
    },
  });
  if (_buf.length > WT_BUF_CAP) _buf.splice(0, _buf.length - WT_BUF_CAP);
}

/* ── Üç Sesin Nabzı (İç Çalışma 08 rev.2 · boşluk A) ──
   Ürün üç ses olduğunu söylüyor — Öz (bireysel), Bağ (ilişki), Eser (iş) —
   ve bu bir özellik değil kimlik iddiasıdır. On bir kanallı kadranın
   hiçbirinde bu üç ad geçmiyordu: iddianın kanıtı yoktu.

   SEÇİM İLE KİLİT NEDEN AYRI: 10w:111 Free katmanını Öz'e kilitler
   (fmGetActiveId, `S.isPremium || resolved === 'oz'`). İkisini tek olayda
   toplamak kadranda "herkes Öz'ü seviyor" diye okunur — oysa ölçülen şey
   mahkûmiyettir. 'sec' niyettir, 'kilit' karşılanmamış taleptir,
   'dus' sessiz kayıptır (Pro bitince kayıtlı eksen Öz'e döner ve kullanıcıya
   hiçbir şey söylenmez).

   'dus' NEDEN fmInit'te: fmGetActiveId her render'da çağrılır (pil, popover,
   prompt inşası) — oraya takılan bir olay oturum başına yüzlerce satır yazardı.
   Karar hidrasyon anında bir kez verilir.

   GİZLİLİK SÖZLEŞMESİ (wtLogKimlik ile birebir aynı kural): buraya yalnız üç
   sabit eksen kimliği girer. Model adı, tagline, system_prompt, kullanıcının
   yazdığı hiçbir şey giremez — küme dışı değer satırı hiç doğurmaz.

   screen=olay, prev_screen=olayın ÖZNESİ olan eksen, meta={oteki, prem}.
   `oteki` olayın öbür ucudur ve olaya göre okunur: 'sec'te geçilen eski
   eksen, 'kilit'te o an aktif olan eksen, 'dus'ta düşülen eksen (oz). */
const _FM_OLAY = new Set(['sec', 'kilit', 'dus']);
const _FM_ID   = new Set(['oz', 'bag', 'eser']);

export function wtLogModel(olay, { model, oteki, prem } = {}) {
  if (!_inited || !_FM_OLAY.has(olay)) return;
  if (!_FM_ID.has(model)) return;           // kapalı küme dışında satır YOK
  const uid = S.currentUser?.id;
  if (!uid) return;
  _buf.push({
    user_id:     uid,
    session_id:  _sessionId,
    screen:      olay,
    kind:        'model',
    prev_screen: model,
    entered_at:  new Date().toISOString(),
    duration_ms: 0,
    meta: {
      oteki: _FM_ID.has(oteki) ? oteki : null,
      // Katman bilgisi: aynı olayın Free ve Pro'daki anlamı farklıdır.
      // 'kilit' zaten Free'ye özgüdür; 'sec' ve 'dus' bu alanla okunur.
      prem:  prem === true ? 1 : 0,
    },
  });
  if (_buf.length > WT_BUF_CAP) _buf.splice(0, _buf.length - WT_BUF_CAP);
}

/* ── Kota Nabzı (İç Çalışma 16 rev.2 · boşluk C) ──
   Paywall hunisi bugüne dek kördü: `13m`'in tek çağrısı `crisis_grace`
   idi (Emniyet Nabzı'na biner) — duvara kaç kişi çarptı, sheet'i kaçı
   gördü, kaçı bonus'la geçti, kaçı iptal etti hiç sayılmıyordu. Bu kanal
   yalnız gözlemler; kota sayacının KENDİSİNE dokunmaz (Riskler §4 —
   olay yazımı bonus/hak mekaniğinin bir parçası DEĞİLDİR).
   GİZLİLİK SÖZLEŞMESİ (wtLogModel ile birebir aynı kural): buraya yalnız
   kapalı kümeden sabit kimlikler girer — fiyat, ürün adı, ödeme sağlayıcı,
   sepet içeriği ASLA girmez; küme dışı değer satırı hiç doğurmaz.
   screen=olay, prev_screen=dal (paywall varyantı/sebep — kapalı küme),
   meta={tier}. */
const _KOTA_OLAY = new Set(['duvar', 'sheet', 'gate', 'iptal', 'bonus']);
const _KOTA_DAL  = new Set(['a', 'b', 'bonus', 'crisis']);
const _KOTA_TIER = new Set(['free', 'pro', 'max']);

export function wtLogKota(olay, { dal, tier } = {}) {
  if (!_inited || !_KOTA_OLAY.has(olay)) return;
  const uid = S.currentUser?.id;
  if (!uid) return;
  _buf.push({
    user_id:     uid,
    session_id:  _sessionId,
    screen:      olay,
    kind:        'kota',
    prev_screen: _KOTA_DAL.has(dal) ? dal : null,
    entered_at:  new Date().toISOString(),
    duration_ms: 0,
    meta: {
      tier: _KOTA_TIER.has(tier) ? tier : null,
    },
  });
  if (_buf.length > WT_BUF_CAP) _buf.splice(0, _buf.length - WT_BUF_CAP);
}

/* ── Araç Nabzı (İç Çalışma 09 rev.2 · boşluk D) ──
   `13a`/`13b`'de sıfır `wt*` çağrısı vardı — Araç Motoru'nun önerdiği
   her şeyin kabul mü ret mi gördüğü, hangi aracın hangisinden daha çok
   reddedildiği bilinmiyordu. `_ARAC_DEFS` (13a) registry'si zaten var;
   bu kanal onun üstüne yeni bir motor kurmaz, yalnız üç olayı sayar.
   GİZLİLİK SÖZLEŞMESİ: araç adı kapalı kümeden gelir — chip'in ürettiği
   SÖZÜN/NOTUN metni buraya asla girmez, yalnız aracın kendi kimliği.
   screen=olay, prev_screen=arac (kapalı küme), meta boş — üçüncü bir
   eksen yok, kabul oranı screen×prev_screen'den SQL'de çıkar (K3). */
const _ARAC_OLAY = new Set(['oner', 'onayla', 'reddet']);
const _ARAC_ARAC = new Set(['soz', 'not', 'gecis', 'imge']);

export function wtLogArac(olay, { arac } = {}) {
  if (!_inited || !_ARAC_OLAY.has(olay)) return;
  const uid = S.currentUser?.id;
  if (!uid) return;
  _buf.push({
    user_id:     uid,
    session_id:  _sessionId,
    screen:      olay,
    kind:        'arac',
    prev_screen: _ARAC_ARAC.has(arac) ? arac : null,
    entered_at:  new Date().toISOString(),
    duration_ms: 0,
    meta: {},
  });
  if (_buf.length > WT_BUF_CAP) _buf.splice(0, _buf.length - WT_BUF_CAP);
}

/* ── Bölge Nabzı (İç Çalışma 18 rev.2 · boşluk A) ──
   `10-features-w2`'de bölge görünürlüğünün hiçbir izi yoktu — ayracın
   altına kaç kişi indi, galeri/İç Dünya/yolculuk/ocak hiç görüldü mü,
   sezgiyle biliniyordu, kadrandan değil. Tek parametre kasıtlı: bu bir
   OLAY değil bir GÖRÜNÜRLÜK'tür — "bölge X görüldü", ikinci bir eksen
   taşımaz. `gun` bilinçli olarak YOKTUR: Bugün'ün kendi `view` segmenti
   zaten paydadır, ayrı bir 'gun' olayı aynı şeyi ikinci kez sayıp oranı
   bozar (K1 — oda 18'in sorusu "ayraç altına kaç kişi indi", "Bugün'e
   kaç kişi girdi" değil).
   GİZLİLİK SÖZLEŞMESİ: bölge adı sabit kapalı kümedir, sayfa içeriği
   (galerideki görsel, İç Dünya notu) buraya asla girmez.
   screen=bolge, prev_screen=null, meta boş — çağıran taraf (10-features-w2)
   bölge başına oturumda BİR kez çağırır (Riskler §2), tekrarı bu fonksiyon
   değil çağıranın `_gorulen` seti önler. */
const _BOLGE_ID = new Set(['ayrac', 'galeri', 'icdunya', 'yolculuk', 'ocak']);

export function wtLogBolge(bolge) {
  if (!_inited || !_BOLGE_ID.has(bolge)) return;
  const uid = S.currentUser?.id;
  if (!uid) return;
  _buf.push({
    user_id:     uid,
    session_id:  _sessionId,
    screen:      bolge,
    kind:        'bolge',
    prev_screen: null,
    entered_at:  new Date().toISOString(),
    duration_ms: 0,
    meta: {},
  });
  if (_buf.length > WT_BUF_CAP) _buf.splice(0, _buf.length - WT_BUF_CAP);
}

/* ── Paylaşım Nabzı (İç Çalışma 12 rev.2 · boşluk C) ──
   `13g`/`10C`'de sıfır `wt*` çağrısı vardı — paylaşım hunisi (story mi
   yazı mı, panoya kopyalama mı, indirme mi) ve neyin paylaşıldığı
   (kart/rapor/film) sezgiyle biliniyordu, kadrandan değil.
   GİZLİLİK SÖZLEŞMESİ: yalnız paylaşımın SINIFI girer — paylaşılan kartın
   metni, kullanıcının yazdığı altyazı, hedef platform ASLA girmez.
   Paylaşım GERÇEKTEN tetiklendiğinde çağrılır — Share sheet'in açılması
   ya da kullanıcının vazgeçmesi olay değildir (çağıran tarafın kararı).
   screen=olay, prev_screen=null, meta={tur} (paylaşılan şeyin sınıfı). */
const _PAY_OLAY = new Set(['story', 'yazi', 'kopyala', 'indir']);
const _PAY_TUR  = new Set(['kart', 'rapor', 'film']);

export function wtLogPaylasim(olay, { tur } = {}) {
  if (!_inited || !_PAY_OLAY.has(olay)) return;
  const uid = S.currentUser?.id;
  if (!uid) return;
  _buf.push({
    user_id:     uid,
    session_id:  _sessionId,
    screen:      olay,
    kind:        'paylasim',
    prev_screen: null,
    entered_at:  new Date().toISOString(),
    duration_ms: 0,
    meta: {
      tur: _PAY_TUR.has(tur) ? tur : null,
    },
  });
  if (_buf.length > WT_BUF_CAP) _buf.splice(0, _buf.length - WT_BUF_CAP);
}

/* ── gönderim + dayanıklılık ── */

async function _flush() {
  if (_flushBusy || !_buf.length) return;
  _flushBusy = true;
  const rows = _buf.splice(0);
  try {
    const { error } = await sb.from('usage_events').insert(rows);
    if (error) throw error;
    _writeCkpt();                       // kuyruk boşaldı → checkpoint'ten de düşsün
  } catch (_) {
    _buf.unshift(...rows);              // ağ/tablo yoksa geri koy (mig 033 ELLE — yoksa sessiz birikir, tavan korur)
    if (_buf.length > WT_BUF_CAP) _buf.splice(0, _buf.length - WT_BUF_CAP);
  } finally {
    _flushBusy = false;
  }
}

/* Ham localStorage bilinçli: bu bir kaza-kurtarma tamponu (crash recovery
   scratch), her segment kapanışında sık sık yazılır. SafeStorage.set() her
   çağrıda Supabase yazma kuyruğuna girer — bu sıklıkta cihaz-yerel telemetri
   tamponunu SafeStorage'a taşımak gereksiz bulut trafiği yaratır. */
function _writeCkpt() {
  const uid = S.currentUser?.id;
  if (!uid) return;
  try {
    const open = [_seg, _ov].filter(Boolean);
    localStorage.setItem(_ckptKey(uid), JSON.stringify({
      ts: Date.now(), sid: _sessionId, buf: _buf, open,
    }));
  } catch (_) { /* dolu/kapalı storage — nabız veriden değerli değil */ }
}

/** Önceki oturum crash/kill ile bittiyse: checkpoint'teki kuyruk + yarım
 *  segmentler (son nabız anına kadar sayılır — muhafazakâr) flush edilir. */
function _recoverOrphan() {
  const uid = S.currentUser?.id;
  if (!uid) return;
  try {
    const raw = localStorage.getItem(_ckptKey(uid));
    if (!raw) return;
    localStorage.removeItem(_ckptKey(uid));
    const ck = JSON.parse(raw);
    if (!ck || ck.sid === _sessionId) return;
    const rows = (Array.isArray(ck.buf) ? ck.buf : []).filter(r => r && r.user_id === uid);
    (Array.isArray(ck.open) ? ck.open : []).forEach(s => {
      if (!s || !s.screen || !s.t0) return;
      const dur = Math.max(0, (ck.ts || s.t0) - s.t0);
      if (dur < WT_MIN_MS) return;
      rows.push({
        user_id: uid, session_id: ck.sid || null,
        screen: s.screen, kind: s.kind || 'view', prev_screen: s.prev || null,
        entered_at: new Date(s.t0).toISOString(),
        duration_ms: Math.min(dur, WT_MAX_MS),
      });
    });
    if (rows.length) { _buf.push(...rows); _flush(); }
  } catch (_) {}
}

/* ── init — 03-auth-shell post-auth bloğundan (SIRALI, en sonda) ── */

export function wtInit() {
  if (_inited || IS_ADMIN_PAGE) return;   // admin sayfası ölçülmez (kemer+askı; blok orada zaten koşmaz)
  if (!S.currentUser?.id) return;
  _inited = true;
  _sessionId = 'wt_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  _recoverOrphan();

  // K1 — ölçüm noktası: registry'nin global after listesi; monkey-patch yok.
  switchViewHooks.after(v => { try { _openView(v); } catch (_) {} });

  // Hook kaydından ÖNCE açılmış aktif view'ı yakala (boot → llm-home / bugun)
  try {
    const active = document.querySelector('.view.active');
    if (active?.id) _openView(active.id.replace(/-view$/, ''));
  } catch (_) {}

  // hidden = birincil ağ yolu (sayfa hâlâ canlıyken insert genelde yetişir);
  // pagehide = yalnız checkpoint (çift gönderim riski sıfır — kalan kuyruğu
  // bir sonraki açılışta yetim kurtarma gönderir).
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      _lastOv = _ov ? _ov.screen : null;   // dönüşte yeniden açmak için (portal DOM'da durur)
      _closeOverlay();
      _closeSeg(_seg); _seg = null;
      _flush();
      _writeCkpt();
    } else if (_lastScreen) {
      _openView(_lastScreen);
      if (_lastOv) { wtOverlayOpen(_lastOv); _lastOv = null; }
    }
  });
  window.addEventListener('pagehide', () => {
    _closeOverlay();
    _closeSeg(_seg); _seg = null;
    _writeCkpt();
  });

  setInterval(_writeCkpt, WT_CKPT_MS);
  setInterval(_flush, WT_FLUSH_MS);
}

// Tören portalları + Mod Nabzı window üzerinden 1 satırla enstrümante edilir
// (window.wtOverlayOpen?.('seri-muhru') / window.wtLogMode?.(...) — TDZ-güvenli, modül import'suz).
Object.assign(window, { wtOverlayOpen, wtOverlayClose, wtTorenSonuc, wtLogMode, wtLogSafety, wtLogLatency, wtLogMemory, wtLogCtx, wtLogKart, wtLogRitus, wtLogEsik, wtLogDuygu, wtLogKimlik, wtLogModel, wtLogKota, wtLogArac, wtLogBolge, wtLogPaylasim });
