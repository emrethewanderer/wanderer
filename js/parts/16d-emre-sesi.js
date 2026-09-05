/* ═══════════════════════════════════════════════════════════════════
   16d — EMRE'NİN SESİ · Canlı Yönlendirme Odası (admin) + yükleyici
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     "Emre sadece Admin panelinden yönlendirilsin. Kodda Emre'yi
     yönlendirme kalmasın." — Uygulamanın LLM'e söylediği her söz
     (kimlik, mod, ritüel, özet, geri çağrı…) tek odadan görülür ve
     değiştirilir. Kod yalnızca çevrimdışı VARSAYILANI taşır; canlı
     söz DB'dedir (persona_directives · mig 026). Emre'yi her an en
     iyi hâliyle tasarlamak kod değişikliği beklememeli.

   AKIŞ:
     1) esInit()  — boot'ta (03 post-auth): SafeStorage cache'i ANINDA
        uygular (çevrimdışı emniyet), sonra DB'den tazeler. p() (16)
        her çağrıda önce bu override haritasına bakar.
     2) Admin "Emre'nin Sesi" odası (renderEmreSesiAdmin): öne çıkan
        yönlendirmeler + otomatik gruplanmış TÜM sözlük anahtarları.
        Kaydet → upsert + canlı uygula; Varsayılana Dön → satırı sil.
     3) {{değişken}} lejantı ve yapısal token uyarısı ([MOD:…], JSON,
        [ARAC]…) düzenleme sırasında gösterilir — parser'lar bu
        biçimlere bağlıdır, admin bilerek dokunur.
     4) SUNUCU SESLERİ (2026-08-19): edge fonksiyonlarının prompt'ları da
        buradan yönetilir. Metinleri 16b'de DEĞİL, fonksiyonun içinde
        durur (bundle diyeti); panel onları saf-DB anahtarı olarak gösterir
        ve `_shared/persona-directives.ts` (pServer) sunucuda aynı p()
        zincirini yürütür. Bkz. ES_SERVER_KEYS.
     5) ÖNCEKİ SÜRÜMLER (2026-08-19): "Yayınla" artık geri alınabilir.
        Defteri DB trigger'ı yazar (mig 043) — yazan taraf tek olmadığı
        için uygulama katmanına bağlanan bir geçmiş, dışarıdan gelen
        değişikliği kaçırırdı. Panel yalnız OKUR ve seçilen sürümü
        KUTUYA yazar; yayın hâlâ Emre'nin bilinçli hamlesidir.
     6) PROVA SAHNESİ (2026-08-19): kutudaki metin yayınlanmadan
        koşturulabilir. Motor 16g (prvKos) — taslağı geçici bindirir,
        `finally` ile canlı haritayı aynen geri yazar. Burası yalnız
        sahnedir: tek cümle, tek yanıt, hiçbir yere kayıt yok.

   SINIR: uygulama yalnız TR/EN destekler — override de bu iki dille sınırlı.
   Sunucu personası (system_prompt) "Kişilik" odasında — o metin 07b
   anayasasından doğar ve llm-chat onu admin_settings'ten okur.

   Konvansiyon: admin UI hardcoded TR; window.* expose; tablo yoksa
   sessizce varsayılanlar çalışır (özellik bozulmaz).
═══════════════════════════════════════════════════════════════════ */

import { sb } from '../config.js';
import { SafeStorage, showToast, escapeHTML } from './00a-infrastructure.js';
import { setPromptOverrides, getPromptDefault } from './16-i18n-prompts.js';
import { PROMPT_I18N_CORE } from './16b-i18n-prompt-dict-core.js';

const ES_CACHE_KEY = 'etw_emre_sesi_v1';

/* Modül durumu: DB satırları { lang: { key: content } } */
let _esRows = { tr: {}, en: {} };
let _esLang = 'tr';      // admin odasında aktif dil sekmesi
let _esQuery = '';       // arama filtresi

/* ── 1) BOOT YÜKLEYİCİ — tüm kullanıcılar için ─────────────────────── */

function _esApply(map) {
  _esRows = { tr: {}, en: {}, ...(map || {}) };
  setPromptOverrides(_esRows);
}

/** Boot: cache'i anında uygula, DB'den arka planda tazele.
 *  Tablo yoksa (mig 026 çalıştırılmadıysa) sessizce sözlük kalır. */
export async function esInit() {
  try {
    const cached = SafeStorage.get(ES_CACHE_KEY);
    if (cached) _esApply(cached);
  } catch (_) {}
  try {
    const { data, error } = await sb.from('persona_directives').select('key, lang, content');
    if (error) {
      if (!/relation.*persona_directives.*does not exist|could not find the table/i.test(error.message)) {
        console.warn('persona_directives:', error.message);
      }
      return;
    }
    const map = { tr: {}, en: {} };
    (data || []).forEach(r => { (map[r.lang] = map[r.lang] || {})[r.key] = r.content; });
    _esApply(map);
    SafeStorage.set(ES_CACHE_KEY, map);
  } catch (e) {
    console.warn('esInit:', e && e.message);
  }
}

/* ── 2) KAYIT DEFTERİ — öne çıkanlar + otomatik gruplama ───────────── */

/* Öne çıkan yönlendirmeler: Emre'nin sesini en çok taşıyan metinler.
   Sıra = odadaki sıra. Bunlar kendi otomatik gruplarından çıkarılır. */
const ES_FEATURED = [
  // FAZ 3 (2026-07-12, .claude/plans/mod-sistemi.md): eski tek "prompt.mode.guide"
  // dev belgesi Omurga+Kartuş mimarisine bölündü — kimlik+protokol her turda sabit
  // gider, derin mod talimatı yalnız ipucu/aktif mod(lar) için kartuş olarak eklenir.
  { key: 'prompt.identity.core',               t: 'Wanderer Kimliği (Omurga)',      d: 'Her sohbet dönüşünde giden sabit kimlik: 12 İlke, Hayat Denklemi, Dönüşüm Zinciri, 4 Derinlik, 5 Temel, Geçiş Araçları, kriz sınırı. Emre\'nin client tarafındaki felsefi omurgası.' },
  { key: 'prompt.mode.protocol',                t: 'Mod Etiketi + Geçiş Rehberi',    d: '[MOD:xxx] tag formatı + 6 modun bir satırlık özeti + mod geçiş kuralları — her turda gider. Parser [MOD:] biçimine bağlı, dikkatli düzenle.' },
  { key: 'prompt.mode.card.soft',                t: 'Mod Kartı · Fark Et (soft)',     d: 'Kullanıcı kırılgan/açılıyorken derin talimat — yalnız bu mod ipucu ya da aktifken gönderilir.' },
  { key: 'prompt.mode.card.direct',              t: 'Mod Kartı · Yüzleş (direct)',    d: 'Kaçınma/mazeret anında derin talimat.' },
  { key: 'prompt.mode.card.reflective',          t: 'Mod Kartı · Tasarla (reflective)', d: 'Düşünmeye hazır anda derin talimat (4 Adımlı Hayal Alemi, Çalışma Kağıdı).' },
  { key: 'prompt.mode.card.celebrate',           t: 'Mod Kartı · Şahit Ol (celebrate)', d: 'Gerçek adım/geçiş anında derin talimat.' },
  { key: 'prompt.mode.card.pattern',              t: 'Mod Kartı · Örüntü (pattern)',   d: 'Tekrarlayan kalıp tespitinde derin talimat.' },
  { key: 'prompt.mode.card.depth',                t: 'Mod Kartı · Derinlik (depth)',   d: '4 Derinlik + 5 Temel derin talimatı.' },
  { key: 'prompt.default_system',             t: 'Yedek Sistem Kimliği',           d: 'Sunucu personası ulaşamadığında kullanılan en kısa kimlik cümlesi.' },
  { key: 'prompt.greeting',                   t: 'Selamlaşma Anı',                 d: 'Kullanıcı yalnız selam verdiğinde: dert varsayma, sıcak ve kısa karşıla.' },
  { key: 'prompt.crisis',                     t: 'Kriz Anı',                       d: 'Ciddi duygusal sıkıntı sinyalinde en nazik mod; 182 hattı hatırlatması.' },
  { key: 'prompt.presession',                 t: 'Güne Açılış Sözü',               d: 'Uygulama açılınca üretilen 1-2 cümlelik açılış (hero). "Bugün hangi kişisin?" ruhu.' },
  { key: 'prompt.onboarding.context_transition', t: 'Yeni Gelene Geçiş',           d: 'Onboarding\'den ilk sohbete geçişte Emre\'nin ilk teması.' },
  { key: 'prompt.geri_cagri.instruction',     t: 'Geri Çağrı Anı (Sessizlik)',     d: 'Kullanıcı sohbet önünde susunca Emre\'nin tek cümlelik içeriden dokunuşu (13o).' },
  { key: 'prompt.portre.synth_system',        t: 'Portre Sentezi',           d: 'İlk girişte "Olduğun Kişi" portresini çıkaran ayna-Emre yönlendirmesi (02c).' },
  { key: 'prompt.gecis_karti.design_system',     t: 'Geçiş Kartım Tasarımcısı',       d: 'Tek Nefes: ana cümleden altın/lapis kutupları doğuran Emre sesi (10A).' },
  { key: 'prompt.oik.design',                 t: 'Olmak İstediğin Kişi Tasarımcısı', d: 'Geçiş Yapısı 4 adımını rafine edip hedef kimlik kartını + Geçiş olumlamasını doğuran Emre sesi (10D).' },
  { key: 'prompt.oik.resynth_system',         t: 'Niyet Alınan — Yeniden Sentez',  d: 'Niyet mührü vurulan her kişiden sonra "Niyet Alınan [Ad]" kartının epitetini ve fısıltısını tazeleyen ses (10D).' },
  { key: 'prompt.summary.system',             t: 'Günlük Özet Sesi',               d: 'Günlük özetlerin keskin, dönüştürücü kalemi.' },
  { key: 'prompt.deep_summary.system',        t: 'Derin Özet Sesi',                d: 'Gün sonu 8-katmanlı özetin sistem kimliği.' },
  { key: 'prompt.deep_summary.user',          t: 'Derin Özet Talimatı (8 Katman)', d: 'Portre dahil 8 katmanın tanımı — hafızanın kalitesi buradan doğar. JSON şeması içerir, dikkatli düzenle.' },
  { key: 'prompt.worksheet.suggest',          t: 'Çalışma Kağıdı (4 Adım)',        d: 'YAZ→OKU→FARKET→DEĞİŞTİR pratiğini yürüten yönlendirme (13b).' },
  { key: 'prompt.arac.guide',                 t: 'Etkileşim Araçları Protokolü',   d: '[ARAC]/[KAGIT]/[TAKIP] etiket kuralları — parser buna bağlı, biçimi bozma. Sondaki "harfi harfine yaz" kilidi modelin etiketi Türkçeleştirmesini ([TAKİP]) önler (13a). DİKKAT: burayı bir kez yayınlarsan sürümün sözlüğü EZER (p() zinciri, 16:86) — koda sonradan eklenen yeni bir araç modele HİÇ gitmez ve hata da vermez. Yeni araç eklendiğinde ya "Varsayılana Dön" ya da satırı elle ekle.' },
  { key: 'prompt.imge.yanki',                 t: 'İmge Yankısı · Doz Sınırı',      d: 'Kullanıcının kendi seçtiği metaforu (İmge Kapısı, 13z) modelin nasıl yankılayacağını sınırlar — icat etmez, saplanmaz, sürüklemez (Zaltman katmanının manipülasyon çizgisi).' },
  // 2026-08-19: hüküm veren üç ses vitrine çıktı. Ortak yanları şu — üçü de
  // kullanıcı HAKKINDA bir şey söylüyor (mühür, hipotez, örüntü) ve üçü de
  // kanıt kapısına bağlı. Sesin en ağır kararları torbada aranmamalı.
  { key: 'prompt.olus.sinama_karar_system',   t: 'Oluş Sınaması · Hüküm',          d: '"Artık o kişiyim" beyanını dört boyutta sınayan ses (10q4). Hüküm modelin `gecti`sinden değil KANITTAN doğar: "yaşandı" dediği her boyut için numaralı cümleye `kanit_ref` göstermek zorundadır — gösteremezse o boyut yaşanmamıştır.' },
  { key: 'prompt.ayna.generate_system',       t: 'Ayna Protokolü · Hipotez',       d: 'Kullanıcının kör noktalarını en fazla 3 hipoteze indiren ses (09g). Dayanak GÖSTERİLİR, YAZILMAZ: model kaynak etiketini döndürür, uygulama o kaynağın altındaki kullanıcı cümlesini kanıt olarak gösterir. Etiketsiz hipotez hiç sorulmaz.' },
  { key: 'prompt.oruntu.distill_system',      t: 'Örüntü Damıtması · Haftalık',    d: 'Sinyal defterini haftalık örüntüye damıtan ses (09d). Kullanıcının tekrar eden kalıpları buradan doğar — mod etkililik skorları da bu damıtmaya akar.' },
];

/* Sunucuda yaşayan yönlendirmeler (2026-08-19).
   Bu anahtarlar 16b sözlüğünde YOKTUR ve olmamalıdır: metinleri edge
   fonksiyonlarının içinde durur, client bundle'ına girerlerse bundle diyeti
   bozulur (§6.7). Panel onları yine de gösterir — çünkü `p()` zincirinin
   sunucu aynası (`_shared/persona-directives.ts` · pServer) önce
   persona_directives'e bakar, satır yoksa fonksiyonun kendi metnine düşer.
   Yani buraya yazılan bir metin, deploy beklemeden sunucunun sesi olur.
   Varsayılanları burada gösteremeyiz (sunucuda yaşıyorlar) — bu yüzden
   "SUNUCUDA" rozeti ve boş kutu bilinçlidir. */
const ES_SERVER_KEYS = [
  { key: 'prompt.srv.baslatici.system',   t: 'Sohbet Başlatıcıları · Sunucu', d: 'Kullanıcının kendi cümlelerinden üç başlatıcı çıkaran ses (sohbet-baslaticilari). Kanıt kapısı: her başlatıcı bir cümleye `kanit_ref` ile bağlanır — kullanıcının söylemediği şey ağzına konmaz.' },
  { key: 'prompt.srv.soz_terzisi.system', t: 'Söz Terzisi · Sunucu',          d: 'Her yaşam alanına bir günlük mikro-söz yazan ses (soz-terzisi). Kullanıcı sözü mühürlemek için harfiyen yazacak — kısa ve yazması kolay olmalı.' },
];
const ES_SERVER_SET = new Set(ES_SERVER_KEYS.map(s => s.key));

/* Otomatik grup çözücü — öne çıkanlar dışındaki TÜM anahtarlar buradan
   bir odaya düşer; hiçbir yönlendirme görünmez kalmaz. */
const ES_GROUPS = [
  { label: 'SUNUCU SESLERİ',                 re: /^prompt\.srv\./ },
  { label: 'ÇEKİRDEK KİMLİK & MODLAR',       re: /^prompt\.(identity|mode|default_system|greeting|crisis|presession|context_guide)/ },
  { label: 'AÇILIŞ & ONBOARDING',            re: /^prompt\.onboarding/ },
  { label: 'FELSEFİ & MANEVİ ANLAR',         re: /^prompt\.(spiritual|fanilik|awareness|wrong_forest|manifesto\.(sorumluluk|toplum_katki|adalet)|iliski|kalp_zihin|hesap_gunu|trauma|practical)/ },
  { label: 'DÖNÜŞÜM ZİNCİRİ & İNANÇ',        re: /^prompt\.(transformation_chain|feedback_loop|exponential_growth|belief|choice|identity_message|level)/ },
  { label: 'KİŞİSELLEŞTİRME KATMANLARI',     re: /^prompt\.(p[1-6]\.|personalization)/ },
  { label: 'RİTÜEL ATÖLYELERİ',              re: /^prompt\.(portre|gecis_karti|hayal_alemi|gecis_alani|kendinle_konusma|degerlendirme|geri_cagri|daily|meclis_dialog|challenge|manifesto\.(system|user)|echo|depth_foundations|kimlik_motoru|ritual_work|olus|imge|oik|commitment)/ },
  { label: 'ÖZET & AYNA MOTORLARI',          re: /^prompt\.(summary|day_summary|deep_summary|chapters|weekly_report|oruntu|invisible_face|hayattaki_sen_portrait|rollsum|profile_extract|homework_gen|ai_tracks|ayna|yp|gozlemevi)/ },
  { label: 'ARAÇLAR & ÇALIŞMA KAĞIDI',       re: /^prompt\.(arac|worksheet)/ },
  { label: 'BAĞLAM & TEKNİK PARÇALAR',       re: /./ },
];

function _esGroupOf(key) {
  for (const g of ES_GROUPS) if (g.re.test(key)) return g.label;
  return ES_GROUPS[ES_GROUPS.length - 1].label;
}

function _esAllKeys() {
  // Sözlüğün tamamı (tr = referans küme) + DB'de olup sözlükte olmayan
  // satırlar (pArray genişletmesi gibi saf-DB anahtarları görünür kalsın)
  const keys = new Set(Object.keys(PROMPT_I18N_CORE.tr || {}));
  Object.keys(_esRows.tr || {}).forEach(k => keys.add(k));
  Object.keys(_esRows.en || {}).forEach(k => keys.add(k));
  // Sunucu anahtarları sözlükte yok; satır yazılmadan da görünmeliler ki
  // Emre onları ilk kez yazabilsin (keşfedilebilirlik).
  ES_SERVER_KEYS.forEach(s => keys.add(s.key));
  return Array.from(keys);
}

/* ── 3) ADMIN ODASI ────────────────────────────────────────────────── */

/* Yapısal token uyarısı: bu biçimler kod tarafından parse edilir. */
function _esWarnings(text) {
  const w = [];
  if (/\[MOD:/.test(text))                      w.push('[MOD:…] etiketi');
  // Etiket adları Türkçe yazımıyla da yazılmış olabilir (13a parser'ı ikisini de tanır)
  if (/\[ARA[CÇ]|\[KA[GĞ][IİÎıiî]T|\[TAK[IİÎıiî]P|\[KART/i.test(text)) w.push('[ARAC]/[KAGIT]/[TAKIP]/[KART] protokolü');
  if (/\[(?:bu yanıt|this reply)\b/i.test(text)) w.push('mod filigranı (stripModeWatermark bu açılışa bağlı)');
  if (/JSON|"\w+"\s*:/.test(text))              w.push('JSON şeması');
  return w;
}

function _esVars(text) {
  const m = String(text).match(/\{\{[a-zA-Z0-9_]+\}\}/g);
  return m ? Array.from(new Set(m)) : [];
}

/* Gruplar _esEntryHTML'i meta'sız çağırır; sunucu anahtarlarının başlığı
   ve açıklaması ES_SERVER_KEYS'te yaşar — tek çözücüden geçir. */
function _esMetaOf(key) {
  return ES_SERVER_KEYS.find(s => s.key === key) || null;
}

function _esEntryHTML(key, meta, idx) {
  meta = meta || _esMetaOf(key);
  const isServer = ES_SERVER_SET.has(key);
  const def = getPromptDefault(key, _esLang);
  const ov = _esRows[_esLang]?.[key];
  const isCustom = ov !== undefined;
  const text = isCustom ? ov : def;
  const vars = _esVars(def || text);
  const warns = _esWarnings(def || text);
  const title = meta?.t || key.replace(/^prompt\./, '');
  const chip = isCustom
    ? '<span style="font-size:9px;letter-spacing:1.5px;color:var(--gold);border:1px solid rgba(184,149,60,0.45);border-radius:10px;padding:2px 8px;">ÖZEL</span>'
    : isServer
      ? '<span style="font-size:9px;letter-spacing:1.5px;color:var(--lapis,#7c9cd9);border:1px solid rgba(124,156,217,0.45);border-radius:10px;padding:2px 8px;">SUNUCUDA</span>'
      : '<span style="font-size:9px;letter-spacing:1.5px;color:var(--text-dim);border:1px solid var(--border);border-radius:10px;padding:2px 8px;">VARSAYILAN</span>';

  return `<details class="es-entry" data-key="${escapeHTML(key)}" style="border-bottom:1px solid var(--border);padding:2px 0;">
    <summary style="display:flex;align-items:center;gap:10px;padding:12px 2px;cursor:pointer;list-style:none;">
      <span style="flex:1;min-width:0;">
        <span style="display:block;font-size:13px;color:var(--text);">${escapeHTML(title)}</span>
        <code style="font-size:10px;color:var(--text-dim);">${escapeHTML(key)}</code>
      </span>
      ${chip}
    </summary>
    <div style="padding:2px 2px 16px;">
      ${meta?.d ? `<div style="font-size:12px;color:var(--text-mid);line-height:1.6;margin-bottom:10px;">${escapeHTML(meta.d)}</div>` : ''}
      ${isServer && !isCustom ? `<div style="font-size:11px;color:var(--lapis,#7c9cd9);line-height:1.6;margin-bottom:8px;border-left:2px solid rgba(124,156,217,0.45);padding-left:10px;">Bu sesin metni sunucuda duruyor, o yüzden kutu boş. Buraya yazıp yayınlarsan sunucu artık seninkini kullanır; kutuyu boşaltıp <span style="color:var(--text-mid);">Varsayılana Dön</span> dersen kendi metnine geri döner.</div>` : ''}
      ${vars.length ? `<div style="font-size:11px;color:var(--text-dim);margin-bottom:8px;">Değişkenler (aynen korunmalı): ${vars.map(v => `<code style="color:var(--lapis,#7c9cd9);">${escapeHTML(v)}</code>`).join(' · ')}</div>` : ''}
      ${warns.length ? `<div style="font-size:11px;color:var(--gold);margin-bottom:8px;">⚠ Yapısal biçim içerir: ${escapeHTML(warns.join(', '))} — biçimi bozarsan ilgili özellik yanıtı okuyamaz.</div>` : ''}
      <textarea class="field-textarea es-text" rows="${Math.min(16, Math.max(4, Math.ceil(String(text).length / 90)))}" style="font-size:12px;line-height:1.6;">${escapeHTML(text)}</textarea>
      <div style="display:flex;gap:10px;margin-top:10px;align-items:center;flex-wrap:wrap;">
        <button class="btn-outline-gold" onclick="esSave(this)">Yayınla</button>
        ${isCustom ? '<button class="btn-outline-gold" style="border-color:var(--border);color:var(--text-mid);" onclick="esReset(this)">Varsayılana Dön</button>' : ''}
        <button class="btn-outline-gold" style="border-color:var(--border);color:var(--text-mid);" onclick="esGecmis(this)">Önceki sürümler</button>
        <button class="btn-outline-gold" style="border-color:var(--border);color:var(--text-mid);" onclick="esProva(this)">Provada dene</button>
      </div>
      <div class="es-gecmis" style="margin-top:12px;"></div>
      <div class="es-prova" style="margin-top:12px;"></div>
    </div>
  </details>`;
}

function _esMatch(key, meta) {
  if (!_esQuery) return true;
  meta = meta || _esMetaOf(key);
  const q = _esQuery.toLocaleLowerCase('tr');
  const hay = [key, meta?.t || '', meta?.d || '',
    getPromptDefault(key, _esLang) || '', _esRows[_esLang]?.[key] || ''
  ].join('\n').toLocaleLowerCase('tr');
  return hay.includes(q);
}

function _esListHTML() {
  const featuredKeys = new Set(ES_FEATURED.map(f => f.key));
  const parts = [];

  // Öne çıkanlar
  const feat = ES_FEATURED.filter(f => _esMatch(f.key, f));
  if (feat.length) {
    parts.push('<div class="section-label" style="margin-top:18px;">ÇEKİRDEK YÖNLENDİRMELER</div>');
    feat.forEach((f, i) => parts.push(_esEntryHTML(f.key, f, i)));
  }

  // Otomatik gruplar — sözlüğün geri kalan TAMAMI
  const byGroup = new Map();
  _esAllKeys().filter(k => !featuredKeys.has(k)).sort().forEach(k => {
    if (!_esMatch(k, null)) return;
    const g = _esGroupOf(k);
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(k);
  });
  ES_GROUPS.forEach(g => {
    const keys = byGroup.get(g.label);
    if (!keys || !keys.length) return;
    parts.push(`<div class="section-label" style="margin-top:26px;">${escapeHTML(g.label)} <span style="color:var(--text-dim);font-size:10px;">· ${keys.length}</span></div>`);
    keys.forEach((k, i) => parts.push(_esEntryHTML(k, null, i)));
  });

  return parts.length ? parts.join('') : '<div class="empty-state">Aramayla eşleşen yönlendirme yok.</div>';
}

export async function renderEmreSesiAdmin() {
  const host = document.getElementById('emre-sesi-admin-host');
  if (!host) return;
  host.innerHTML = '<div style="color:var(--text-dim);font-size:13px;">Yükleniyor…</div>';

  // Taze veri — başka cihazdan yapılmış düzenlemeler görünsün
  await esInit();

  const custom = Object.keys(_esRows.tr || {}).length + Object.keys(_esRows.en || {}).length;
  host.innerHTML = `
    <div style="font-size:12px;color:var(--text-mid);line-height:1.7;margin-bottom:14px;">
      Uygulamanın Emre'ye (LLM) söylediği <em>her söz</em> burada. Bir yönlendirmeyi
      düzenleyip <span style="color:var(--gold);">Yayınla</span> dediğinde canlı kaynak
      veritabanı olur; koddaki metin yalnız çevrimdışı yedek olarak kalır.
      Kullanıcılara bir sonraki uygulama açılışında iner.
      <span style="color:var(--text-dim);">Şu an ${custom} özel yönlendirme yayında.</span><br>
      <span style="color:var(--gold);">Katman düzeni:</span> Sunucudaki temel kimlik
      "Kişilik" odasında, model davranışları "Model Stüdyosu"nda; burası uygulama
      içi tüm anların sesidir.
    </div>
    <div style="display:flex;gap:10px;align-items:center;margin-bottom:6px;">
      <input class="field-input" id="es-search" type="search" placeholder="Ara: başlık, anahtar veya metin…" style="flex:1;" oninput="esSearch(this.value)">
      <div style="display:flex;border:1px solid var(--border);border-radius:10px;overflow:hidden;">
        <button id="es-lang-tr" onclick="esLang('tr')" style="padding:8px 14px;font-size:11px;letter-spacing:1px;background:none;border:none;cursor:pointer;color:var(--text);">TR</button>
        <button id="es-lang-en" onclick="esLang('en')" style="padding:8px 14px;font-size:11px;letter-spacing:1px;background:none;border:none;cursor:pointer;color:var(--text-dim);">EN</button>
      </div>
    </div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:14px 0 4px;">
      <button class="btn-outline-gold" style="width:auto;flex:0 0 auto;min-height:0;padding:8px 16px;font-size:10.5px;letter-spacing:1.5px;" onclick="esSinama(this)">Ses sınaması</button>
      <span style="font-size:11px;color:var(--text-dim);">Yedi kanonik konuşma · yayındaki sesi register'a vurur</span>
    </div>
    <div id="es-sinama"></div>
    <div id="es-list"></div>`;
  _esRenderList();
}

/* ── 6) SES SINAMASI — yedi kanonik konuşma ────────────────────────────────
   Motor 16h'de. Yedi GERÇEK LLM çağrısıdır: elle tetiklenir, otomatik
   koşmaz, hiçbir yere kaydedilmez. Sonuç bir fotoğraftır. */

function _esSinamaSatirHTML(r) {
  const durum = r.hata
    ? `<span style="color:var(--red,#d9736a);">${escapeHTML(r.hata)}</span>`
    : r.ihlaller.length
      ? `<span style="color:var(--gold);">${r.ihlaller.length} uyarı</span>`
      : '<span style="color:var(--green-ok,#8fae7c);">temiz</span>';
  const ihlalListesi = r.ihlaller.length
    ? `<div style="margin-top:6px;display:grid;gap:4px;">${r.ihlaller.map(i => `
        <div style="font-size:11px;color:var(--text-mid);">
          <code style="font-size:10px;">${escapeHTML(i.kural)}</code>${i.kanit ? ` — <span style="color:var(--text-dim);">“${escapeHTML(i.kanit)}”</span>` : ''}
        </div>`).join('')}</div>`
    : '';
  const araclar = r.olcumler?.ihtimalAraclari?.length
    ? `<div style="font-size:10.5px;color:var(--text-dim);margin-top:4px;">ihtimal araçları: ${escapeHTML(r.olcumler.ihtimalAraclari.join(' · '))}</div>`
    : '';
  return `<details style="border-top:1px solid var(--border);padding:8px 0;">
    <summary style="display:flex;gap:10px;align-items:baseline;cursor:pointer;list-style:none;font-size:12.5px;">
      <span style="flex:1;color:var(--text);">${escapeHTML(r.ad)}</span>${durum}
    </summary>
    <div style="padding:8px 0 4px;">
      <div style="font-size:11px;color:var(--text-dim);font-style:italic;margin-bottom:6px;">${escapeHTML(r.not)}</div>
      <div style="font-size:11.5px;color:var(--text-mid);margin-bottom:6px;">Soru: “${escapeHTML(r.mesaj)}”</div>
      ${r.metin ? `<div style="border-left:2px solid var(--border);padding:6px 0 6px 12px;font-size:12.5px;line-height:1.7;color:var(--text);white-space:pre-wrap;">${escapeHTML(r.metin)}</div>` : ''}
      ${ihlalListesi}${araclar}
    </div>
  </details>`;
}

/** Yedi kanonik konuşmayı koşar; sonucu listenin üstüne çizer. */
export async function esSinama(btn) {
  const kutu = document.getElementById('es-sinama');
  if (!kutu) return;
  if (kutu.innerHTML.trim()) { kutu.innerHTML = ''; return; }

  btn.disabled = true;
  kutu.innerHTML = '<div style="font-size:12px;color:var(--text-dim);padding:10px 0;">Sınama başlıyor…</div>';
  try {
    const { ssKos } = await import('./16h-ses-sinamasi.js');
    const sonuc = await ssKos({
      onAdim: ({ i, toplam, ad }) => {
        kutu.innerHTML = `<div style="font-size:12px;color:var(--text-dim);padding:10px 0;">${i + 1}/${toplam} — ${escapeHTML(ad)} soruluyor…</div>`;
      },
    });
    // Koşulamayan senaryo "temiz" DEĞİLDİR — ölçülememiştir. Hata sayısını
    // yutup "tümü temiz" demek sahte başarıdır (§6.2); özet önce onu söyler.
    const hatali = sonuc.satirlar.filter(r => r.hata).length;
    const olculen = sonuc.satirlar.length - hatali;
    const parcalar = [SS_ETIKET(sonuc)];
    if (hatali) parcalar.push(`<span style="color:var(--red,#d9736a);">${hatali} konuşma koşulamadı</span>`);
    if (sonuc.toplamIhlal) parcalar.push(`<span style="color:var(--gold);">${sonuc.toplamIhlal} uyarı</span>`);
    else if (olculen) parcalar.push(`<span style="color:var(--green-ok,#8fae7c);">ölçülen ${olculen} konuşma temiz</span>`);
    const ozet = parcalar.join(' · ');
    kutu.innerHTML = `<div style="border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:6px;background:rgba(255,255,255,0.015);">
      <div style="font-size:10px;letter-spacing:2px;color:var(--text-dim);margin-bottom:8px;">SES SINAMASI · ${ozet}</div>
      ${sonuc.satirlar.map(_esSinamaSatirHTML).join('')}
      <div style="font-size:10.5px;color:var(--text-dim);margin-top:10px;font-style:italic;">Uyarı bir hüküm değil, bakılacak bir yer — kapının göremediklerini kaynak dosyanın kör nokta defteri yazar.</div>
    </div>`;
  } catch (e) {
    kutu.innerHTML = `<div style="font-size:12px;color:var(--red,#d9736a);padding:10px 0;">${escapeHTML(e?.message || 'Sınama koşulamadı.')}</div>`;
  } finally {
    btn.disabled = false;
  }
}

function SS_ETIKET(sonuc) {
  return `${sonuc.satirlar.length} konuşma · ${(sonuc.sureMs / 1000).toFixed(0)} sn`;
}

function _esRenderList() {
  const list = document.getElementById('es-list');
  if (!list) return;
  // Açık girdileri koru — kaydet/sıfırla sonrası akordeon kapanmasın
  const openKeys = new Set(
    Array.from(list.querySelectorAll('.es-entry[open]')).map(e => e.getAttribute('data-key'))
  );
  list.innerHTML = _esListHTML();
  openKeys.forEach(k => {
    list.querySelector(`.es-entry[data-key="${CSS.escape(k)}"]`)?.setAttribute('open', '');
  });
  const trBtn = document.getElementById('es-lang-tr');
  const enBtn = document.getElementById('es-lang-en');
  if (trBtn) trBtn.style.color = _esLang === 'tr' ? 'var(--gold)' : 'var(--text-dim)';
  if (enBtn) enBtn.style.color = _esLang === 'en' ? 'var(--gold)' : 'var(--text-dim)';
}

export function esSearch(q) {
  _esQuery = (q || '').trim();
  _esRenderList();
}

export function esLang(lang) {
  _esLang = lang === 'en' ? 'en' : 'tr';
  _esRenderList();
}

function _esEntryOf(btn) {
  const entry = btn.closest('.es-entry');
  return entry ? { entry, key: entry.getAttribute('data-key'), text: entry.querySelector('.es-text')?.value ?? '' } : null;
}

/** Kaydet: upsert + canlı uygula. Varsayılanla birebir aynıysa satırı siler
 *  (gereksiz override taşınmasın; sözlük güncellenince otomatik izlesin). */
export async function esSave(btn) {
  const ctx = _esEntryOf(btn);
  if (!ctx) return;
  const { key, text } = ctx;
  if (!text.trim()) { showToast('Boş yönlendirme yayınlanamaz — silmek için "Varsayılana Dön".', true); return; }
  if (text === getPromptDefault(key, _esLang)) { return esReset(btn, true); }

  // Varsayılandaki {{değişkenler}} yeni metinde eksikse uyar (yine de yayınla —
  // karar Emre'nin); eksik değişkenin verisi LLM'e hiç ulaşmaz.
  const missing = _esVars(getPromptDefault(key, _esLang)).filter(v => !text.includes(v));
  if (missing.length) {
    showToast('Dikkat: ' + missing.join(', ') + ' metinden çıkarıldı — bu veriler artık Emre\'ye ulaşmayacak.', true);
  }

  btn.disabled = true;
  const { error } = await sb.from('persona_directives').upsert({
    key, lang: _esLang, content: text, updated_at: new Date().toISOString()
  }, { onConflict: 'key,lang' });
  btn.disabled = false;

  if (error) {
    if (/relation.*persona_directives.*does not exist|could not find the table/i.test(error.message)) {
      showToast('persona_directives tablosu yok — migrations/000_wanderer_schema.sql çalıştırılmalı.', true);
    } else {
      showToast('Kayıt hatası: ' + error.message, true);
    }
    return;
  }
  (_esRows[_esLang] = _esRows[_esLang] || {})[key] = text;
  _esApply(_esRows);
  SafeStorage.set(ES_CACHE_KEY, _esRows);
  showToast('Yönlendirme yayınlandı — Emre artık böyle konuşacak.');
  _esRenderList();
}

export async function esReset(btn, silent) {
  const ctx = _esEntryOf(btn);
  if (!ctx) return;
  const { key } = ctx;
  if (_esRows[_esLang]?.[key] === undefined) {
    if (!silent) showToast('Bu yönlendirme zaten varsayılanda.');
    _esRenderList();
    return;
  }
  btn.disabled = true;
  const { error } = await sb.from('persona_directives').delete().eq('key', key).eq('lang', _esLang);
  btn.disabled = false;
  if (error) { showToast('Silme hatası: ' + error.message, true); return; }
  delete _esRows[_esLang][key];
  _esApply(_esRows);
  SafeStorage.set(ES_CACHE_KEY, _esRows);
  showToast(silent ? 'Metin varsayılanla aynı — sözlük izlenecek.' : 'Varsayılana dönüldü.');
  _esRenderList();
}

/* ── 4) GEÇMİŞ — "Yayınla" geri alınabilir ─────────────────────────────────
   Defteri uygulama değil, DB trigger'ı yazar (mig 043): persona_directives'e
   yazan taraf tek değil ve uygulama katmanına bağlanan bir geçmiş, uygulama
   DIŞINDAN gelen değişikliği sessizce kaçırır. Burası yalnız OKUR. */

/* key::lang → satır dizisi. "Bu sürüme dön" metni buradan alır; uzun
   metinleri DOM'a gömmek yerine bellekte tutmak hem güvenli hem ucuz. */
const _esGecmisCache = new Map();

function _esGecmisHTML(rows) {
  if (!rows.length) {
    return '<div style="font-size:11.5px;color:var(--text-dim);font-style:italic;">Bu yönlendirme hiç değişmemiş — geri dönülecek bir sürüm yok.</div>';
  }
  const satirlar = rows.map((r, i) => {
    const ne = r.action === 'delete' ? 'varsayılana dönüldü' : 'değiştirildi';
    const tarih = new Date(r.changed_at).toLocaleString('tr-TR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const onizleme = String(r.content_old).replace(/\s+/g, ' ').slice(0, 90);
    return `<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid var(--border);">
      <div style="flex:1;min-width:0;">
        <div style="font-size:10.5px;color:var(--text-dim);letter-spacing:0.4px;">${escapeHTML(tarih)} · ${escapeHTML(ne)}</div>
        <div style="font-size:11.5px;color:var(--text-mid);line-height:1.5;margin-top:2px;">${escapeHTML(onizleme)}${String(r.content_old).length > 90 ? '…' : ''}</div>
      </div>
      <!-- .btn-outline-gold globalde width:100% + min-height:52px taşır (dokunma
           hedefi); satır içinde o ölçü metni tek kelimelik sütuna eziyor. Bu
           buton satırın yanında durduğu için doğal genişliğine döner. -->
      <button class="btn-outline-gold" style="width:auto;flex:0 0 auto;min-height:0;border-color:var(--border);color:var(--text-mid);font-size:10.5px;padding:6px 12px;letter-spacing:1px;white-space:nowrap;" onclick="esGeriYukle(this, ${i})">Bu sürüme dön</button>
    </div>`;
  }).join('');
  return `<div style="font-size:10px;letter-spacing:2px;color:var(--text-dim);margin-bottom:2px;">ÖNCEKİ SÜRÜMLER · ${rows.length}</div>
    ${satirlar}
    <div style="font-size:10.5px;color:var(--text-dim);margin-top:8px;font-style:italic;">"Bu sürüme dön" metni yalnız kutuya yazar — yayınlamak yine senin hamlen.</div>`;
}

/** Bir anahtarın geçmişini yükler ve girdinin altına çizer. */
export async function esGecmis(btn) {
  const ctx = _esEntryOf(btn);
  if (!ctx) return;
  const kutu = ctx.entry.querySelector('.es-gecmis');
  if (!kutu) return;

  // İkinci tıklama kapatır — panel kalabalıklaşmasın.
  if (kutu.innerHTML.trim()) { kutu.innerHTML = ''; return; }

  kutu.innerHTML = '<div style="font-size:11.5px;color:var(--text-dim);">Yükleniyor…</div>';
  const ck = `${ctx.key}::${_esLang}`;

  const { data, error } = await sb
    .from('persona_directives_history')
    .select('content_old, action, changed_at')
    .eq('key', ctx.key).eq('lang', _esLang)
    .order('changed_at', { ascending: false })
    .limit(20);

  if (error) {
    // Migration henüz uygulanmadıysa panel kırılmaz, sebebini söyler (§6.5).
    const yok = /relation.*does not exist|could not find the table/i.test(error.message);
    kutu.innerHTML = `<div style="font-size:11.5px;color:var(--text-dim);font-style:italic;">${
      yok ? 'Geçmiş defteri henüz kurulmamış — migrations/043_persona_directives_history.sql çalıştırılmalı.'
          : 'Geçmiş okunamadı: ' + escapeHTML(error.message)
    }</div>`;
    return;
  }

  const rows = data || [];
  _esGecmisCache.set(ck, rows);
  kutu.innerHTML = _esGecmisHTML(rows);
}

/** Seçilen sürümü EDİTÖRE yazar — yayınlamaz. Yayın bilinçli bir hamledir. */
export function esGeriYukle(btn, idx) {
  const ctx = _esEntryOf(btn);
  if (!ctx) return;
  const rows = _esGecmisCache.get(`${ctx.key}::${_esLang}`) || [];
  const row = rows[idx];
  if (!row) { showToast('Bu sürüm artık listede yok — geçmişi yeniden aç.', true); return; }

  const alan = ctx.entry.querySelector('.es-text');
  if (!alan) return;
  alan.value = row.content_old;
  alan.focus();
  showToast('Eski sürüm kutuya yazıldı — yayınlamak için "Yayınla".');
}

/* ── 5) PROVA SAHNESİ — yayınlamadan duymak ────────────────────────────────
   Motor 16g'de (prvKos); burası yalnız sahnedir. Kutudaki metin TASLAK
   sayılır: yayınlanmamış hâliyle koşar, koşu bitince canlı harita aynen
   geri gelir. Sahne bilinçli olarak dar — tek cümle, tek yanıt: amaç bir
   sohbeti canlandırmak değil, sesin RENGİNİ duymak. */

/* Prova cümlesi anahtarın türüne göre önerilir: kriz anahtarını selamla
   sınamak boş bir prova olurdu. Öneri yalnız başlangıç metnidir; Emre
   üstüne yazar. */
function _esProvaOneri(key) {
  if (/crisis|kriz/.test(key))            return 'Artık dayanamıyorum, her şey anlamsız geliyor.';
  if (/greeting|selam/.test(key))         return 'Selam';
  if (/mode\.card\.direct|avoid/.test(key)) return 'Yine erteledim, ama bu sefer gerçekten vaktim yoktu.';
  if (/mode\.card\.celebrate/.test(key))  return 'Bugün üç aydır ilk kez spora gittim.';
  if (/mode\.card\.pattern|oruntu/.test(key)) return 'Her ilişkimde aynı yere geliyorum, anlamıyorum.';
  if (/olus|sinama/.test(key))            return 'Artık o kişi olduğumu düşünüyorum.';
  if (/ayna/.test(key))                   return 'Kendimi tanıdığımı sanıyordum.';
  return 'Bugün kendimi biraz yorgun hissediyorum.';
}

function _esProvaHTML(key) {
  return `<div style="border:1px solid var(--border);border-radius:12px;padding:12px 14px;background:rgba(255,255,255,0.015);">
    <div style="font-size:10px;letter-spacing:2px;color:var(--text-dim);margin-bottom:8px;">PROVA · YAYINLANMAZ</div>
    <div style="font-size:11.5px;color:var(--text-mid);line-height:1.6;margin-bottom:10px;">
      Kutudaki metin taslak olarak koşar; canlı ses değişmez. Persona ve mod
      kılavuzu gerçek turdaki gibi gider — yanıt, yayınlasaydın duyacağın şeydir.
    </div>
    <input class="field-input es-prova-mesaj" type="text" value="${escapeHTML(_esProvaOneri(key))}" placeholder="Provada söyleyeceğin cümle…" style="font-size:12px;">
    <div style="display:flex;gap:10px;margin-top:10px;align-items:center;flex-wrap:wrap;">
      <button class="btn-outline-gold" style="width:auto;flex:0 0 auto;min-height:0;padding:8px 16px;font-size:10.5px;letter-spacing:1.5px;" onclick="esProvaKos(this)">Koş</button>
      <span class="es-prova-durum" style="font-size:11px;color:var(--text-dim);"></span>
    </div>
    <div class="es-prova-yanit" style="margin-top:12px;"></div>
  </div>`;
}

/** Prova sahnesini açar/kapatır. */
export function esProva(btn) {
  const ctx = _esEntryOf(btn);
  if (!ctx) return;
  const kutu = ctx.entry.querySelector('.es-prova');
  if (!kutu) return;
  if (kutu.innerHTML.trim()) { kutu.innerHTML = ''; return; }
  kutu.innerHTML = _esProvaHTML(ctx.key);
}

/** Taslakla tek dönüş koşar. Yanıt sahnede kalır — hiçbir yere yazılmaz. */
export async function esProvaKos(btn) {
  const ctx = _esEntryOf(btn);
  if (!ctx) return;
  const sahne  = btn.closest('.es-prova');
  const durum  = sahne?.querySelector('.es-prova-durum');
  const yanit  = sahne?.querySelector('.es-prova-yanit');
  const mesaj  = sahne?.querySelector('.es-prova-mesaj')?.value ?? '';
  if (!sahne || !yanit) return;

  const soru = mesaj.trim();
  if (!soru) { showToast('Provada söyleyeceğin bir cümle yaz.', true); return; }

  // Taslak = kutudaki metin. Boşsa (sunucu anahtarı) taslak yok, canlı koşar.
  const taslak = ctx.text.trim() ? { [_esLang]: { [ctx.key]: ctx.text } } : {};

  btn.disabled = true;
  if (durum) durum.textContent = 'Emre düşünüyor…';
  yanit.innerHTML = '';
  try {
    const { prvKos } = await import('./16g-prova-sahnesi.js');
    const sonuc = await prvKos(taslak, soru, {});
    if (durum) durum.textContent = `${(sonuc.sureMs / 1000).toFixed(1)} sn`;
    yanit.innerHTML = `<div style="border-left:2px solid var(--gold);padding:8px 0 8px 12px;font-size:13px;line-height:1.75;color:var(--text);white-space:pre-wrap;">${escapeHTML(sonuc.metin || '(boş yanıt)')}</div>`;
  } catch (e) {
    if (durum) durum.textContent = '';
    const mesajMetni = e?.quota
      ? 'Kota doldu — prova da gerçek bir çağrıdır.'
      : (e?.message || 'Prova koşulamadı.');
    yanit.innerHTML = `<div style="font-size:12px;color:var(--red,#d9736a);">${escapeHTML(mesajMetni)}</div>`;
  } finally {
    btn.disabled = false;
  }
}

/* ── window expose ── */
if (typeof window !== 'undefined') {
  window.renderEmreSesiAdmin = renderEmreSesiAdmin;
  window.esProva = esProva;
  window.esSinama = esSinama;
  window.esProvaKos = esProvaKos;
  window.esSearch = esSearch;
  window.esLang = esLang;
  window.esSave = esSave;
  window.esReset = esReset;
  window.esGecmis = esGecmis;
  window.esGeriYukle = esGeriYukle;
}
