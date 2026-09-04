/* ═══════════════════════════════════════════════════
   13a — ARAÇ MOTORU: Wanderer'ın Elleri
   LLM yanıt-sonu protokol blokları — function calling'in
   Wanderer karşılığı, sunucu değişikliği gerektirmez (mode-tag
   kalıbının uzantısı):
     [ARAC:soz] / [ARAC:not]{json} / [ARAC:gecis] → onay chip'i,
       onaylanınca uygulama aksiyonu (ASLA sessiz yürütme yok)
     [KAGIT]{"kavram":...} → Çalışma Kağıdı artifact'i (13b çizer)
     [TAKIP]a|b[/TAKIP] → takip sorusu pilleri
   Bloklar görüntü metninden, history'den ve DB'den sıyrılır (06).
   Ek: composer taslak kalıcılığı (localStorage — cihaz-yerel) ve
   kitap kaynakçası chip'leri (S._lastBookSources, 04 doldurur).

   2026-09-04 — REGISTRY GENİŞLEDİ (İç Çalışma 09 · K5): kayıtlar artık
   { marker, parse, label?, cta?, run? } taşır. [KART] (10B) ve [NISAN]
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
import { ARAC_ETIKETLERI, etiketCoz, etiketRegex } from './13a1-arac-etiketleri.js';

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
const _ARAC_DEFS = {
  soz: {
    marker: 'ARAC',
    label: () => t('arac.soz', 'Bugün somut bir söz vermeye hazır görünüyorsun.'),
    cta:   () => t('arac.soz_cta', 'SÖZ VER'),
    run:   () => { window.glGiveSozNow?.(); return true; }
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
    run:   () => { window.oikOpenReading?.(); return true; }
  },
  imge: {
    marker: 'ARAC',
    label: () => t('arac.imge', 'İmgeni seç.'),
    cta:   () => t('arac.imge_cta', 'SEÇ'),
    run:   () => { window.igOpenKapi?.(); return true; }
  },
  // [KART] ve [NISAN] kayıtları SAF YAPRAKTA (13a1) — tüketicileri
  // (10B, 12e) onu doğrudan import eder ve döngü doğmaz; ikizi burada
  // yazılmaz, yaprak yayılır (§1.3).
  ...ARAC_ETIKETLERI,
};

/* Etiket çözücü — tüketici artık kendi regex'ini yazmaz, registry'den ister.
   Eşleşme yoksa ya da parse geçersiz kılarsa null; varsa parse alanları +
   ham etiket (`tag`) + etiketi çıkarılmış metin (`clean`). */
/* 13a bu ikisini artık DIŞA AÇMIYOR ve `window`'a da koymuyor.
   Sebebi faz denetiminde bulundu: tüketiciler (10B, 12e) yaprağı
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
    const ok = await def.run(args);
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
/* Etiket çözücüleri de window'dan — 10B ve 12e bu dosyayı STATİK import
   ETMEZ (13a→06/13-extras→03-auth-shell→10B/12e döngüsü kapanır); köprü
   burada, tıpkı 13a'nın kendi run() fonksiyonlarının window.glGiveSozNow?.()
   ile başka modülleri çağırması gibi (K5). */
