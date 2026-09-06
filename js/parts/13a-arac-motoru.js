/* ═══════════════════════════════════════════════════
   13a — ARAÇ MOTORU: Wanderer'ın Elleri
   LLM yanıt-sonu protokol blokları — function calling'in
   Wanderer karşılığı, sunucu değişikliği gerektirmez (mode-tag
   kalıbının uzantısı):
     [ARAC:soz] / [ARAC:not]{json} / [ARAC:gecis] / [ARAC:imge] /
     [ARAC:gordun] / [ARAC:sabir] / [ARAC:ayna] → onay chip'i,
       onaylanınca uygulama aksiyonu (ASLA sessiz yürütme yok)
     [KAGIT]{"kavram":...} → Çalışma Kağıdı artifact'i (13b çizer)
     [TAKIP]a|b[/TAKIP] → takip sorusu pilleri
   Bloklar görüntü metninden, history'den ve DB'den sıyrılır (06).
   Ek: composer taslak kalıcılığı (localStorage — cihaz-yerel) ve
   kitap kaynakçası chip'leri (S._lastBookSources, 04 doldurur).

   2026-09-05 — HAZIRLIK KAPISI (İç Çalışma 09 · FAZ 10): kayıtlar
   isteğe bağlı bir `hazir()` taşır ve odası boş olan araç için chip HİÇ
   çizilmez. Sebebi tek cümle: chip bir VAATTİR — tutulamayan vaat kart
   olur, kaldıraç olmaz (§1.1). Aynı turda üç yeni araç girdi ve anlam
   ekseni LLM'in elinde tamamlandı: gordun (lapis/hayal) · sabir (yol) ·
   ayna (altın/olduğun); soz zaten bronzdu.

   2026-09-04 — REGISTRY GENİŞLEDİ (İç Çalışma 09 · K5): kayıtlar artık
   { marker, parse, label?, cta?, run?, hazir? } taşır. [KART] (10B) ve [NISAN]
   (12e) buraya TÜKETİCİ olarak bağlandı — onlar chip üretmez, yalnız
   kendi etiketlerini (`marker`/`re`) ve o etiketten ne çıktığını
   (`parse`) burada tutar; NE YAPACAKLARI (gizleme, köprü) kendi
   modüllerinde kalır. Üç sözleşme FARKLIDIR — tek `run` semantiğine
   zorlanmaz — etiket kayıtları saf yaprakta (13a1) ve tüketiciler onu
   doğrudan import eder.
═══════════════════════════════════════════════════ */
import { S } from '../state.js';
import { escapeHTML, showToast, debounce } from './00a-infrastructure.js';
import { t } from './15-i18n.js';
import { p } from './16-i18n-prompts.js';
import { saveNoteDirect } from './07-settings-knowledge.js';
import { sendMessageHooks } from './06-summary-chat.js';
import { icOpen } from './13-extras.js';
import { ARAC_ETIKETLERI } from './13a1-arac-etiketleri.js';

/* ─── 1. PROMPT REHBERİ — 06 systemPrompt'a ekler ───
   Yalnız `marker:'ARAC'` ailesinin (chip üreten dört araç) rehberini taşır —
   registry'ye giren [KART]/[NISAN] burada DERLENMEZ, çünkü bugün de burada
   değiller: [KART] talimatı ELLE persona'ya eklenir (SETUP-GECIS-KARTIM.md
   §4), [NISAN] talimatı kendi p('prompt.mode.nisan') anahtarından gelir
   (12e.isikGetContext). Registry'ye tüketici olarak girmeleri bu ikisinin
   rehber kaynağını DEĞİŞTİRMEZ (K5) — yeni bir rehber cümlesi icat etmek
   yerine ikisi de kendi yerinde kalır. */
export function aracPromptGuide() {
  const g = p('prompt.arac.guide');
  return g && !g.includes('prompt.') ? '\n\n' + g : '';
}

/* ─── 2. BLOK AYIKLAMA — yanıttan protokol bloklarını sıyır ─── */
function _parseJson(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}

/* Etiket adları TÜRKÇE YAZIMA TOLERANSLI eşleşir. Gerekçe: model Türkçe bir
   yanıtın içinde protokol etiketini kendi diline "düzeltiyor" — [TAKIP] yerine
   [TAKİP], [ARAC:] yerine [ARAÇ:], [KAGIT] yerine [KAĞIT] yazıyor ("TAKIP"
   Türkçede zaten yanlış yazım, model doğrusunu yazmakta ısrar ediyor). Düz
   indexOf bunları kaçırınca aracExtract null dönüyor ve blok ham metin olarak
   ekrana, geçmişe ve DB'ye sızıyordu. Yalnız etiket ADI toleranslıdır —
   yakalanan içerik (soru metinleri, JSON) hiçbir normalizasyondan geçmez. */
const RE_TAG   = /\[(?:ARA[CÇ]:|KA[GĞ][IİÎıiî]T\]|TAK[IİÎıiî]P\])/i;
const RE_ARAC  = /\[ARA[CÇ]:(\w+)\]\s*(\{[^}]*\})?/i;
const RE_KAGIT = /\[KA[GĞ][IİÎıiî]T\]\s*(\{[^}]*\})/i;
const RE_TAKIP = /\[TAK[IİÎıiî]P\]([\s\S]*?)(?:\[\/TAK[IİÎıiî]P\]|$)/i;

export function aracExtract(text) {
  if (!text) return null;
  // Bloklar tanım gereği yanıtın SONUNDA — ilk işaretçiden itibaren her şey
  // "protokol bölgesi" sayılır. Böylece max_tokens'ta yarıda kesilen blok
  // veya bozuk JSON ekranda çıplak metin olarak kalmaz.
  const hit = text.match(RE_TAG);
  if (!hit) return null;
  const idx = hit.index;

  const zone = text.slice(idx);
  const proto = { tools: [], kagit: null, takip: [] };

  const km = zone.match(RE_KAGIT);
  if (km) {
    const args = _parseJson(km[1]);
    if (args?.kavram) proto.kagit = args;
  }
  const am = zone.match(RE_ARAC);
  if (am) proto.tools.push({ tool: am[1].toLowerCase(), args: _parseJson(am[2]) });

  const tm = zone.match(RE_TAKIP);
  if (tm) {
    proto.takip = tm[1].split('|').map(s => s.trim()).filter(Boolean).slice(0, 2);
  }

  return { text: text.slice(0, idx).trim(), ...proto };
}

/* ─── 3. REGISTRY — etiket → çözüm, dört araç için ayrıca chip yürütücüsü ───
   [ARAC:x] dört üyesi `marker:'ARAC'` ailesidir; ortak `[ARAC:(\w+)]{json}`
   biçimini RE_ARAC zaten çözüyor (bölüm 2) — burada yalnız chip'in ne
   söyleyeceği (label/cta) ve onaylanınca ne olacağı (run) tanımlı.
   [KART] ve [NISAN] kendi `re`/`parse`'ını taşır; onlar için `label`/`cta`/
   `run` YOKTUR — registry'ye girmeleri onları chip'e çevirmez (K5). */
/* Ritüel köprüsü — window'daki açıcıyı çağırır, yüklü DEĞİLSE `false` döner.
   Eski kalıp açıcıyı `?.()` ile çağırıp koşulsuz `true` dönüyordu ve bu
   sahte bir başarıydı (§6.2): ritüel yüklü olmadığında chip kapanıyor,
   hiçbir şey açılmıyor, kullanıcı "oldu" sanıyordu. Oysa sözleşme zaten
   dürüst hâli bekliyor — aracRunTool `false`'u `arac.fail` toast'ına çevirir.

   BİRLEŞME NOTU (2026-09-06): bu kırığı İKİ paralel oturum bağımsız buldu ve
   aynı gerekçeyle düzeltti — biri `_ac`, öteki `_acRitual` adıyla. Merge'de
   ikizi yaşatmak §1.3 ihlali olurdu; `_acRitual` kaldı çünkü main'de zaten
   birleşmişti ve argüman geçirebiliyor. İki oturumun aynı kırığı aynı
   gerekçeyle bulması, bulgunun kendisinin sağlamlığının kanıtıdır.

   Neden window köprüsü, statik import değil: bu registry'nin KURULU kalıbı
   odur (glGiveSozNow · oikOpenReading · igOpenKapi üçü de öyle) ve chip'in
   sözleşmesi zaten koşulludur — "ritüel varsa aç". */
function _acRitual(fnName, ...args) {
  const fn = window[fnName];
  if (typeof fn !== 'function') return false;
  fn(...args);
  return true;
}

/* HAZIRLIK KAPISI — `hazir()` taşıyan bir aracın odası boşsa chip HİÇ
   çizilmez. Gerekçe §1.1'in ölçüsüdür: chip bir vaattir ve tutulamayan vaat
   kart olur, kaldıraç olmaz. Emsal repoda zaten var — 10A'nın
   `gkSinanabilir`'i: "kapı yalnız o zaman çizilir". `hazir` yoksa araç daima
   hazırdır (dört eski araç ve main'den gelen ikisi böyledir); throw ederse
   HAZIR DEĞİLDİR — doğrulayamadığımız bir odayı açmayı vaat etmeyiz
   (§5.2 sessiz düşüş). `_acRitual` köprünün VARLIĞINI yoklar, `hazir()` ise
   odanın DOLULUĞUNU: ikisi ayrı sorudur ve ikisi de gerekir. */
function _hazirMi(def) {
  if (typeof def?.hazir !== 'function') return true;
  try { return !!def.hazir(); } catch (_) { return false; }
}

const _ARAC_DEFS = {
  soz: {
    marker: 'ARAC',
    label: () => t('arac.soz', 'Bugün somut bir söz vermeye hazır görünüyorsun.'),
    cta:   () => t('arac.soz_cta', 'SÖZ VER'),
    run:   () => _acRitual('glGiveSozNow')
  },
  not: {
    marker: 'ARAC',
    label: (args) => t('arac.not', 'Bu içgörü Not Defteri\'ne yazılsın mı?') +
                     (args?.metin ? `\n“${args.metin.slice(0, 120)}”` : ''),
    cta:   () => t('arac.not_cta', 'KAYDET'),
    run:   async (args) => { if (!args?.metin) return false; return await saveNoteDirect(args.metin); }
  },
  gecis: {
    marker: 'ARAC',
    label: () => t('arac.gecis', 'Geçiş Alanı okuması bu ana iyi gelir.'),
    cta:   () => t('arac.gecis_cta', 'AÇ'),
    run:   () => _acRitual('oikOpenReading')
  },
  imge: {
    marker: 'ARAC',
    label: () => t('arac.imge', 'İmgeni seç.'),
    cta:   () => t('arac.imge_cta', 'SEÇ'),
    run:   () => _acRitual('igOpenKapi')
  },

  /* ── FAZ 10 · YENİ ARAÇLAR — İKİ PARALEL OTURUMUN BİRLEŞMESİ (2026-09-06) ──
     Bu faz iki dalda bağımsız uygulandı ve ikisi de main'e geldi. Seçtikleri
     ritüeller farklıydı çünkü ÖLÇÜLERİ farklıydı ve ikisi de geçerli:
       · "hangi AN boşta" → sürdürme · inanç · tekrar eden engel (PR #13)
       · "anlam ekseni nerede eksik" → altın=şimdi · lapis=hayal · bronz=söz;
         `soz` zaten bronzdu, lapis ve altın LLM'in elinde değildi (PR #12)
     Birleşmede araçlar toplandı, ölçüler değil — iki ölçü de yorumda kalır
     ki bir sonraki araç hangi soruyu sorması gerektiğini bilsin.

     PREMIUM KAPILI RİTÜELLER DIŞARIDA (PR #13'ün kuralı, birleşmede korundu):
     ücretsiz kullanıcıya önerilen bir chip paywall'a çıkarsa o bir kaldıraç
     değil HUNİ olur (§1.1). */
  /* [ARAC:yol] (13s Geçiş Yolu) BİLEREK YOK ve gerekçesi bir keşif hatasının
     düzeltilmesidir. Faz onu önce ekledi; çapraz denetim `13s:27-29`'daki
     sözleşmeyi gösterdi: "Studio-only (Wanderer Studio kararı, 2026-07-19) —
     Wanderer (LLM) ücretsiz yüzünde yolculuk başlatılmaz." Yani mesele
     abonelik değil YÜZEY: yolculuk Studio odasından başlar, sohbetten değil.
     Chip tam bu kısıtı deliyordu ve `gyStart` (13s:97) kendi başına bir yüzey
     kontrolü taşımıyor — kısıt yalnız ÇAĞIRANIN disiplinidir. Kısıt Emre'nin
     kararıdır; tersine çevirmek de onun kararıdır, bu fazın değil. */
  /* [ARAC:ayna] (09h Ayna Anı) DA BİLEREK YOK — ve bu, birleşmenin tek
     GERİ ALINAN kararıdır. PR #12 onu ekledi ve `hazir()`'ini bilerek
     `S.isPremium`'a bağlamadı; gerekçesi "chip'in cümlesi ücretsiz kullanıcı
     için de DOĞRUDUR, teaser bunu dürüstçe söyler" idi. Gerekçe dürüsttü ama
     ÖLÇÜSÜ yanlıştı: §1.1'in ölçüsü dürüstlük değil, kart mı kaldıraç mı
     olduğudur. `09h:17-18` kendi başlığında yazar — "Studio-gate (S.isPremium)
     + ücretsiz teaser". Sohbette önerilen bir chip'in ücretsiz kullanıcıyı
     bir teaser'a bırakması, o chip'i bir huniye çevirir. PR #13'ün aynı fazda
     bağımsızca vardığı kural burada geçerlidir ve benimkinin yerine geçer. */
  inanc: {
    marker: 'ARAC',
    label: () => t('arac.inanc', 'Bunu söyleten bir inanç var. Onunla yalnız kalmak iyi gelir.'),
    cta:   () => t('arac.inanc_cta', 'KENDİNLE KONUŞ'),
    /* İKİ adım da köprü ister ve İKİSİ de önceden sınanır. Sırası kasıtlı:
       `skOpen` çalışıp `skSelectSet` eksik kalsaydı kullanıcı set MENÜSÜNDE
       kalırdı — chip "İnanç Kazma"yı vaat edip başka bir yere bırakırdı ve
       `run` yine `true` derdi. Yarım açılan bir ritüel de sahte başarıdır. */
    run:   () => {
      if (typeof window.skSelectSet !== 'function') return false;
      if (!_acRitual('skOpen')) return false;
      window.skSelectSet('inanc');
      return true;
    }
  },
  engel: {
    marker: 'ARAC',
    label: () => t('arac.engel', 'Aynı yerde takılıyorsan, o yerin bir adı var.'),
    cta:   () => t('arac.engel_cta', 'ATLASI AÇ'),
    run:   () => _acRitual('engOpen')
  },
  gordun: {
    marker: 'ARAC',
    // LAPİS — Üç Mühür'ün HAYAL mührü (10E). Kısıtı yok: `10E` ne Studio-gate
    // ne premium taşır (yukarıdaki `yol`/`ayna` gerekçelerinin tersine).
    // İki hâlde davet edilmez: pencerenin ardında OİK kartı yoksa tören içi
    // boştur, bugün zaten bakıldıysa HAYAL mührü çoktan düşmüştür — ikinci
    // davet bir tören değil bir menü olurdu.
    hazir: () => {
      // Köprü yoksa HAZIR DEĞİLİZ. `(window.gorDayWindow?.() || {}).source
      // !== 'empty'` yazmak burada sinsi bir kırıktı: 10E yüklü değilken
      // `undefined !== 'empty'` DOĞRU döner ve çalışamayacak bir chip
      // çizilirdi — kapının tam olarak engellemek için var olduğu şey.
      if (typeof window.gorDayWindow !== 'function') return false;
      if (window.usGetTodayVision?.()) return false;
      return window.gorDayWindow().source !== 'empty';
    },
    label: () => t('arac.gordun', 'Bugün henüz o gözlerden bakmadın. Pencere açık.'),
    cta:   () => t('arac.gordun_cta', 'BAK'),
    run:   () => _acRitual('gorOpen')
  },
  sabir: {
    marker: 'ARAC',
    // `hazir` YOK ve bu bilinçli: sabır kartı türetilmiş bir veri değil bir
    // duraktır (10f — boyun eğmiş Satürn). Hiçbir ölçüye bağlı olmadığı için
    // her an açılabilir; ön koşul yazmak onu ölçüye bağlamak olurdu.
    label: () => t('arac.sabir', '«Ne kadar» ölçülür, «ne zaman» bilinmez. Burada bir durak var.'),
    cta:   () => t('arac.sabir_cta', 'DUR'),
    run:   () => _acRitual('yolOpenSabir')
  },
  // [KART] ve [NISAN] kayıtları SAF YAPRAKTA (13a1) — tüketicileri
  // (10B, 12e) onu doğrudan import eder ve döngü doğmaz; ikizi burada
  // yazılmaz, yaprak yayılır (§1.3).
  ...ARAC_ETIKETLERI,
};

/* 13a `etiketCoz`/`etiketRegex`'i import bile ETMEZ; dışa da açmaz,
   `window`'a da koymaz. Sebebi faz denetiminde bulundu: tüketiciler (10B, 12e) yaprağı
   (`13a1-arac-etiketleri.js`) doğrudan import ediyor, yani buradaki
   köprü hiçbir şeyi beslemiyordu — ölü kod (§3.5/3). Durması daha da
   kötüydü: `window` yolunun hâlâ desteklendiğini ima eder ve bir sonraki
   tüketiciyi, etiket sıyırmayı çalışma zamanına bağlayan o kırılgan
   yola davet ederdi. Registry'nin kendisi `_ARAC_DEFS`'te duruyor. */


export async function aracRunTool(btn) {
  const chip = btn?.closest('.arac-chip');
  if (!chip) return;
  // Araç verisi chip'in üstünde — birden çok bekleyen chip birbirine karışmaz
  const tool = chip.dataset.tool;
  const args = chip.dataset.args ? _parseJson(chip.dataset.args) : null;
  chip.remove();
  const def = _ARAC_DEFS[tool];
  // `run` yalnız ARAC ailesinde var — kayıt genişledi (K5), ama registry'de
  // duran her isim chip yürütücüsü değil (kart/nisan'ın run'ı yok); model
  // yanlışlıkla [ARAC:kart] gibi bir şey üretirse burada sessizce düşer.
  if (!def?.run) return;
  // Araç Nabzı: kullanıcı chip'i onayladı (09·D) — aracın çalışıp çalışmadığından bağımsız, karar burada.
  try { window.wtLogArac?.('onayla', { arac: tool }); } catch (_) {}
  try {
    /* Chip bayatlayabilir: kullanıcı bu yanıttan sonra başka bir sekmede
       bugünün bakışını yapmış olabilir. Onay yine de sayıldı (yukarıdaki
       nabız) — karar kullanıcınındır; açılmayan şey yalnız boş odadır. */
    const ok = _hazirMi(def) ? await def.run(args) : false;
    if (ok === false) showToast(t('arac.fail', 'Bu araç şu an çalıştırılamadı.'), true);
  } catch (e) {
    console.warn('aracRunTool:', e);
    showToast(t('arac.fail', 'Bu araç şu an çalıştırılamadı.'), true);
  }
}

export function aracDismiss(btn) {
  const chip = btn?.closest('.arac-chip');
  // Tanıma Motoru (FAZ 2, İ2) — vazgeçiş DOM'dan silinip kaybolmasın: hangi
  // araç türü geçildiği 09d'nin negatif defterine düşer (chip silinmeden ÖNCE
  // okunmalı, dataset chip'le birlikte gider).
  try { window.omKaydetAracGec?.(chip?.dataset?.tool); } catch (_) {}
  // Araç Nabzı: kullanıcı chip'i geçti (09·D).
  try { window.wtLogArac?.('reddet', { arac: chip?.dataset?.tool }); } catch (_) {}
  chip?.remove();
}

/* ─── 4. RENDER — yanıt finalize edildikten sonra (06 çağırır) ─── */
function _renderToolChip(container, entry) {
  const def = _ARAC_DEFS[entry.tool];
  // Aynı gerekçe: yalnız chip yürütücüleri (label/cta/run üçlüsü) çizilir.
  if (!def?.run) return;
  // Hazırlık kapısı: odası boş olan kapı çizilmez. Nabız da burada susar —
  // çizilmeyen bir chip önerilmiş SAYILMAZ, yoksa Araç Nabzı'nın öneri
  // sayısı hiç görülmemiş chip'lerle şişer (09·D'nin ölçüsü bozulurdu).
  if (!_hazirMi(def)) return;
  // Araç Nabzı: chip GERÇEKTEN çizildiğinde sayılır (09·D) — tanımsız araç hiç sayılmaz.
  try { window.wtLogArac?.('oner', { arac: entry.tool }); } catch (_) {}
  const chip = document.createElement('div');
  chip.className = 'arac-chip';
  chip.dataset.tool = entry.tool;
  if (entry.args) { try { chip.dataset.args = JSON.stringify(entry.args); } catch (_) {} }
  chip.innerHTML = `
    <span class="arac-chip-glyph" aria-hidden="true">◆</span>
    <span class="arac-chip-text">${escapeHTML(def.label(entry.args)).replace(/\n/g, '<br>')}</span>
    <span class="arac-chip-btns">
      <button class="arac-yes" onclick="aracRunTool(this)">${escapeHTML(def.cta())}</button>
      <button class="arac-no" onclick="aracDismiss(this)" aria-label="Geç">${escapeHTML(t('arac.skip', 'GEÇ'))}</button>
    </span>`;
  container.appendChild(chip);
}

function _renderTakip(container, questions) {
  if (!questions.length) return;
  const row = document.createElement('div');
  row.className = 'takip-row';
  row.innerHTML = questions.map(q =>
    `<button class="takip-pill" onclick="takipAsk(this)" data-q="${escapeHTML(q)}">${escapeHTML(q)}</button>`
  ).join('');
  container.appendChild(row);
}

export function takipAsk(btn) {
  const q = btn?.dataset?.q;
  if (!q) return;
  btn.closest('.takip-row')?.remove();

  // Konuşma görünümünde composer gizli (yalnız llm-home'da) — orada giriş
  // yüzeyi Ritüel Kartı'dır: kartı aç, soruyu oraya yaz.
  const inChatView = document.getElementById('chat-view')?.classList.contains('active');
  const icTa = document.getElementById('ic-textarea');
  if (inChatView && icTa) {
    icOpen();
    icTa.value = q;
    icTa.dispatchEvent(new Event('input'));
    setTimeout(() => icTa.focus(), 120);
    return;
  }

  const inp = document.getElementById('chat-input');
  if (!inp) return;
  inp.value = q;
  inp.dispatchEvent(new Event('input'));
  // Kullanıcı düzenleyebilsin diye otomatik göndermiyoruz — odakla yetin
  inp.focus();
  inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* Kitap kaynakçası — 04 callLLM'in header'dan doldurduğu S._lastBookSources */
function _renderSources(container) {
  const sources = S._lastBookSources;
  S._lastBookSources = null; // tek kullanımlık — sonraki mesaja taşmasın
  if (!Array.isArray(sources) || !sources.length) return;
  const row = document.createElement('div');
  row.className = 'kaynak-row';
  row.innerHTML = sources.slice(0, 3).map((s, i) => {
    const label = [s.book, s.section].filter(Boolean).join(' · ');
    if (!label) return '';
    const quote = (s.quote || '').slice(0, 400);
    return `<div class="kaynak-item">
      <button class="kaynak-chip" onclick="this.nextElementSibling?.classList.toggle('open')">𝍪 ${escapeHTML(label)}</button>
      ${quote ? `<div class="kaynak-quote">“${escapeHTML(quote)}”</div>` : ''}
    </div>`;
  }).join('');
  if (row.innerHTML.trim()) container.appendChild(row);
}

export function aracAfterReply(msgEl, proto) {
  if (!msgEl || !msgEl.parentNode) return;
  // Önceki tura ait takip soruları bayatladı — temizle (araç chip'leri kalır,
  // kullanıcı hâlâ eyleme geçebilir; veri chip'in kendi üstünde).
  document.querySelectorAll('#messages-area .takip-row').forEach(el => el.remove());
  const container = document.createElement('div');
  container.className = 'arac-after';
  if (proto) {
    proto.tools.forEach(tl => _renderToolChip(container, tl));
    if (proto.kagit?.kavram) window.ckRenderCard?.(container, proto.kagit.kavram);
    _renderTakip(container, proto.takip || []);
  }
  _renderSources(container);
  if (!container.childNodes.length) return;
  msgEl.insertAdjacentElement('afterend', container);
  const area = document.getElementById('messages-area');
  if (area) {
    const nearBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 200;
    if (nearBottom) area.scrollTop = area.scrollHeight;
  }
}

/* ─── 5. TASLAK KALICILIĞI — yarım kalan mesaj kaybolmasın ───
   localStorage (cihaz-yerel, hesap verisi değil) — pre-auth da çalışır. */
const _DRAFT_KEYS = { 'chat-input': 'etw_draft_chat', 'ic-textarea': 'etw_draft_ic' };

function _draftSave(id, val) {
  try {
    if (val && val.trim()) localStorage.setItem(_DRAFT_KEYS[id], val);
    else localStorage.removeItem(_DRAFT_KEYS[id]);
  } catch (_) {}
}

function _draftBoot() {
  Object.entries(_DRAFT_KEYS).forEach(([id, key]) => {
    const inp = document.getElementById(id);
    if (!inp) return;
    try {
      const saved = localStorage.getItem(key);
      if (saved && !inp.value) {
        inp.value = saved;
        inp.dispatchEvent(new Event('input'));
      }
    } catch (_) {}
    inp.addEventListener('input', debounce(() => _draftSave(id, inp.value), 400));
  });
}

/* Gönderim sonrası input boşalır — taslağı da düşür (input event programatik
   temizlikte tetiklenmez, kısa gecikmeli kontrol yeterli). */
function _draftAfterSendCheck() {
  setTimeout(() => {
    Object.entries(_DRAFT_KEYS).forEach(([id]) => {
      const inp = document.getElementById(id);
      if (inp && !inp.value.trim()) _draftSave(id, '');
    });
  }, 1200);
}

function _aracBoot() {
  _draftBoot();
}
// Boot'ta register edilir (14-boot.js) — modül load time TDZ riskini önler.
export function registerAracHooks() {
  sendMessageHooks.before(_draftAfterSendCheck);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _aracBoot);
} else {
  _aracBoot();
}

/* Inline onclick + 06 köprüsü — minify'a dayanıklı */
window.aracPromptGuide = aracPromptGuide;
window.aracExtract     = aracExtract;
window.aracAfterReply  = aracAfterReply;
window.aracRunTool     = aracRunTool;
window.aracDismiss     = aracDismiss;
window.takipAsk        = takipAsk;
/* Etiket çözücüleri BU LİSTEDE YOK ve olmamalı: 10B/12e onları saf
   yapraktan (13a1) statik alır. Buraya bir köprü eklemek, sıyırmayı yeniden
   çalışma zamanına bağlar — kapı: tests/etiket-siyirma-kapisi.test.js. */
