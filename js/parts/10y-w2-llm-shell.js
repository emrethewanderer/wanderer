/* ═══════════════════════════════════════════════════════════════════
   10y — DİL MODELİ KABUĞU · Ana Kart (ön yüz ↔ arka yüz) + Ana Ekran
   ───────────────────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Wanderer artık bir dil modeli. Uygulama tek bir KARTTIR:
       • ÖN YÜZ  — Sohbet. Kullanıcının girişte gördüğü ilk ekran;
         claude.ai düzeni (merkezî selam + composer + model pili +
         sohbet başlatıcıları) Wanderer'ın obsidyen/altın dokusuyla.
       • ARKA YÜZ — Uygulamanın geri kalan her şeyi (Bugün,
         İç Meclis, Kişilerim, Mührüm, Not Defteri, Ayarlar…).
     Ön yüzdeki tuş kartı TERSİNE ÇEVİRİR; arka yüzden ✦ tuşu öne döndürür.

   MİMARİ:
     • Flip motoru: switchViewHooks.before kancası — chat ↔ diğer view
       sınırı aşılırken geçiş iptal edilir, iki aşamalı Y-ekseni dönüş
       animasyonu oynar, tam 90°'de gerçek switchView çalışır. DOM hiç
       taşınmaz; durağan hâlde transform yok (position:fixed bozulmaz).
     • Ana ekran (home) durumu: bugünün seansında user/assistant mesajı
       yoksa #chat-view 'llm-home' sınıfını alır → CSS composer'ı
       merkeze taşır, selam + başlatıcıları gösterir. İlk mesajla
       birlikte composer alta kilitlenir (claude.ai davranışı).
     • Selam + başlatıcılar 10w'deki aktif Wanderer modelinden gelir
       (Model Stüdyosu'ndan yönetilir).

   Konvansiyon: hardcoded TR string. Stiller: css/parts/llm-shell.css.
═══════════════════════════════════════════════════════════════════ */

import { S } from '../state.js';
import { AnimUtils, escapeHTML as _esc } from './00a-infrastructure.js';
import { switchView, switchViewHooks } from './03-auth-shell.js';
import { fmGreetingText, fmInputPlaceholder, fmStarters, fmGetActive } from './10w-w2-odak-modelleri.js';
import { t } from './15-i18n.js';

const FRONT_VIEW = 'chat';
// Settings + Not Defteri Drawer'dan (ön yüz) erişiliyor → ön yüz ailesi.
// (Aksi halde switchView Studio'ya flip ederdi.)
const FRONT_VIEWS = new Set([FRONT_VIEW, 'settings', 'notebook']);

let _flipBusy   = false;  // animasyon sürerken yeni flip başlatma
let _flipArmed  = false;  // boot'taki ilk switchView animasyonsuz geçsin
let _bypassHook = false;  // flip'in kendi iç switchView çağrısı kancayı atlasın

const _isFront = (v) => FRONT_VIEWS.has(v);

function _currentView() {
  return document.querySelector('.view.active')?.id?.replace(/-view$/, '') || '';
}

/* ── FLIP MOTORU ── */

function _rawSwitch(v) {
  _bypassHook = true;
  try { switchView(v); } finally { _bypassHook = false; }
}

/* ── GİRİŞ KADEMELENMESİ (cascade) ──
   Bir ekrana geçildiğinde unsurları Drawer odaları gibi kademeli süzer (CSS: .casc
   + --casc-base; studio.css/llm-shell.css). .casc remove→reflow→add ile animasyonu
   BAŞTAN oynatır. --casc-base, üstteki perde — flip başlığı (#ws-flip-title,
   "Wanderer"/"Wanderer Studio") ya da boot perdesi (wn-splash) — kalkana dek
   cascade'i bekletir; CSS'teki backwards (both) fill o süre unsurları gizli tutar →
   ne perde ardında boşa akar ne de flash olur. Base'i bağlam belirler. */
const CASC_FLIP   = 0.4;   // flip: after-hook 340ms'de → motion ~740ms; perde başlığı
                           //   (yarı saydam) ~805ms'de dağılmaya, zemin ~828ms'de
                           //   solmaya başlar → cascade fade'le ÖRTÜŞÜR (boşluk yok,
                           //   metinle yarışmaz). 0.8'de fade boyunca gizli kalıp
                           //   boşluk bırakıyordu.
const CASC_SPLASH  = 0.45; // wn-splash kapanırken (720ms fade) süzülsün
const CASC_CURTAIN = 0.2;  // Eşik/onboarding (.onb-ritual ~0.45s opacity fade) çıkarken:
                           //   opak ilk yarıda gizli, fade'de yüksel → örtüşür, boşluk yok
const CASC_NOW     = 0.04; // perdesiz gezinme: neredeyse anında

function _wsCascade(viewEl, base) {
  if (!viewEl || AnimUtils.prefersReducedMotion()) return;
  viewEl.style.setProperty('--casc-base', (base == null ? CASC_NOW : base) + 's');
  viewEl.classList.remove('casc');
  void viewEl.offsetWidth;            // reflow → animasyonu sıfırla
  viewEl.classList.add('casc');
}

/* Bugün ekranı kademelenmesini DIŞARIDAN yeniden oynatır — Bugün aktifken
   switchView geçmeyen yollar için (after-hook ateşlemez → cascade tekrar
   oynamaz). Tam ekran Drawer emekli (Studio tek sayfa); window sözleşmesi
   olarak korunur, tam ekran overlay'ler kapanışta çağırabilir.
   base verilmezse CASC_CURTAIN: perde solarken (0.4s yarısı) alt akar. */
export function wsCascadeBugun(base) {
  const view = document.getElementById('bugun-view');
  if (!view || !view.classList.contains('active')) return;
  _wsCascade(view, base == null ? CASC_CURTAIN : base);
}

/* Boot perdesi kapanırken ana ekranı kademele — initApp wn-splash kapanışında
   ve Eşik Ekranı (02d) / onboarding (02c) close()'unda tetikler. Tam-ekran ritüel
   perdesi (.sc-onb) HÂLÂ AÇIKSA (kapanmıyorsa) ertele: o perde "Bugünün Eşiği"
   ana ekranı kaplar; cascade ardında boşa akmasın diye perdenin kendi close()'u
   yeniden tetikler (close .onb-closing eklediğinden bu kontrol orada geçer). */
export function llmHomeCascade(base) {
  if (document.querySelector('.sc-onb:not(.onb-closing)')) return;
  // Base verilmezse perdeden çıkar: kapanan tam-ekran ritüel perdesi (.onb-closing)
  // varsa onun fade'iyle örtüşecek erken tempo; yoksa (splash) splash temposu.
  if (base == null) {
    base = document.querySelector('.sc-onb.onb-closing') ? CASC_CURTAIN : CASC_SPLASH;
  }
  // BOOT: bu çağrı "perde indi" (ya da hiç olmadı) demektir. Kademelenme ancak
  // içerik de hazırsa oynar — 2026-08-19 kaydında perde 1.0 sn'de indi, kuruluş
  // 3.0 sn'ye sürdü; cascade BOŞ bir ekranı süzüyor, içerik sonra sıçrayarak
  // giriyordu. Tek tetik iki koşula bağlanır: `_bootCascDene`.
  if (!_bootCascOynadi) { _bootPerdeIndi = true; _bootCascDene(base); return; }
  const view = document.getElementById('chat-view');
  if (!view || !view.classList.contains('llm-home')) return;
  _wsCascade(view, base);
}

/* ── AÇILIŞ KADEMELENMESİ: BİR KEZ ──
   İki koşul birlikte: perde indi VE içerik kapısı açıldı. Eskiden kademelenme
   perde kapanışında oynar, `llmSyncHome`'daki ara tetikler ise "perde açık mı"
   guard'ıyla bastırılırdı — perdesiz katta (reload, `_splashPlan` kat 0) o guard
   hiç tutmadığından ekran iki kez süzülüyordu. Perde bir çözüm değil örtüydü;
   kural artık iki kat için de tek. */
let _bootPerdeIndi = false;
let _bootCascOynadi = false;

function _bootCascDene(base) {
  if (_bootCascOynadi) return;
  if (!_bootPerdeIndi || !_kapiAcik()) return;
  // Bayrak view'dan BAĞIMSIZ set edilir: kullanıcı ana ekrana hiç uğramadan
  // (örn. ?view=bugun) açtıysa da açılış tamamlanmış sayılır, yoksa sonraki
  // gezinmelerin cascade'i sonsuza dek kilitli kalırdı.
  _bootCascOynadi = true;
  const view = document.getElementById('chat-view');
  if (view && view.classList.contains('llm-home')) _wsCascade(view, base);
}

/* Tam ekran yüz başlığı — kart dönerken "Wanderer Studio" (arka yüz, altın)
   ya da "Wanderer" (ön yüz, lapis) ekranı kaplar. CSS tek keyframes döngüsüyle
   belirme+kaybolmayı oynar (1.15s); burada yalnızca .show takılıp sökülür. */
let _titleTimer = null;
function _showFlipTitle(toBack) {
  const el = document.getElementById('ws-flip-title');
  if (!el) return;
  el.querySelector('.wft-word').textContent = toBack ? 'Wanderer Studio' : 'Wanderer';
  el.querySelector('.wft-sub').textContent  = toBack ? 'Hayatını oluşturduğun alan!' : 'LLM';
  el.classList.toggle('studio', toBack);
  el.classList.remove('show');
  void el.offsetWidth; // animasyonu baştan başlat
  el.classList.add('show');
  clearTimeout(_titleTimer);
  _titleTimer = setTimeout(() => el.classList.remove('show'), 1200);
}

// İki aşamalı kart dönüşü: 0→90° (içerik kaybolur) · görünmezken view
// değişir · -90→0° (yeni yüz belirir). Yön: öne dönüş ile arkaya dönüş
// ayna simetrisinde — kart hep aynı eksende çevriliyor hissi.
function _flip(v) {
  const app = document.getElementById('app-screen');
  const toBack = !_isFront(v);
  if (!app || _flipBusy || AnimUtils.prefersReducedMotion()) { _rawSwitch(v); return; }

  _flipBusy = true;
  _showFlipTitle(toBack);
  document.body.classList.add('flip-active');
  app.classList.add(toBack ? 'flip-out-back' : 'flip-out-front');

  setTimeout(() => {
    _rawSwitch(v);
    try { if (window.fxCue) window.fxCue('flip'); else navigator.vibrate?.(10); } catch (_) {}
    app.classList.remove('flip-out-back', 'flip-out-front');
    app.classList.add(toBack ? 'flip-in-back' : 'flip-in-front');
    setTimeout(() => {
      app.classList.remove('flip-in-back', 'flip-in-front');
      document.body.classList.remove('flip-active');
      _flipBusy = false;
    }, 480);
  }, 340);
}

/* Dışa açık tetikleyici — topbar tuşu (ön yüz) ve ✦ FAB (arka yüz).
   Normal switchView çağrıları da kanca üzerinden otomatik flip alır. */
export function wsFlipTo(v) {
  if (_flipBusy) return;
  switchView(v); // sınır aşılıyorsa before-kancası flip'e çevirir
}

/* ── ANA EKRAN (home) DURUMU ── */

function _userName() {
  const n = document.getElementById('ob-name')?.textContent?.trim();
  if (n) return n;
  return (S.currentUser?.user_metadata?.name || '').trim() || 'Gezgin';
}

/**
 * Adın KANITLI hâli: çözülemiyorsa `null` döner — 'Gezgin' bir kanıt değil,
 * kanıt yokluğunun kılığıdır (§6.10). `llmRenderHome` hidrasyondan ÖNCE de
 * çağrılıyor (03 `llmHomeCascade`); kanıtsız yazım orada "Merhaba, Gezgin."
 * yazıp sonra gerçek ada sıçrıyordu — 00i'nin gözcüsü o yazımı "kanıt geldi"
 * sanıp alanı erkenden açtığı için sıçrama görünür kalıyordu.
 */
function _userNameKanitli() {
  const n = document.getElementById('ob-name')?.textContent?.trim();
  if (n) return n;
  return (S.currentUser?.user_metadata?.name || '').trim() || null;
}

// Bugünün sohbeti boş mu? (fmswitch system satırları sayılmaz)
function _todayIsEmpty() {
  return !(Array.isArray(S.chatHistory) &&
    S.chatHistory.some(m => m.role === 'user' || m.role === 'assistant'));
}

/* İlk giriş ana ekranı: gün dolu olsa bile oturumun ilk açılışında llm-home
   gösterilir ("Bugünkü mesajlaşmaya devam et" satırıyla) — dil modeli hissi
   korunur. Kullanıcı devam satırına dokununca ya da mesaj gönderince akışa
   düşer; gün sıfırlanırsa (boş sohbet) ana ekran kendiliğinden döner. */
let _homeDismissed = false;

function _shouldHome() {
  if (_todayIsEmpty()) return true;
  return !_homeDismissed;
}

function _dismissHome() {
  if (_homeDismissed) return;
  _homeDismissed = true;
  llmSyncHome();
}

/* Ana ekrandan in — akışı GÖSTER. Yalnız "bugüne devam" değil, geçmiş bir
   seans açıldığında da gerekir: 06 `openSummarySession` mesajları DOM'a yazar
   ama `llm-home` sınıfı akışı gizlediği için ekranda karşılama kalıyordu —
   kullanıcı drawer'dan bir gün açıyor, hiçbir şey olmuyor sanıyordu
   (2026-08-19'da canlıda ölçüldü: 7 mesaj DOM'da, alan yüksekliği 0). */
export function llmLeaveHome() {
  _dismissHome();
}

/* Devam satırı → ana ekrandan bugünün konuşma akışına in */
export function llmContinueToday() {
  _dismissHome();
  // chat-area az önce display:none'dan çıktı — reflow'u zorla ki
  // scrollHeight doğru hesaplansın, sonra hemen kaydır. Senkron yol:
  // rAF arka plan sekmesinde çalışmaz; smooth scroll ise görünürlük
  // geçişinde iptal olup 0'da kalıyor → instant şart.
  const area = document.getElementById('messages-area');
  if (area) {
    void area.offsetHeight;
    area.scrollTo({ top: area.scrollHeight, behavior: 'instant' });
  }
}

/* Atmosfer çizgisi (breath pill) yalnızca konuşma akışında görünür;
   Ritüel Kartı açıkken çizgi nefes almaz (icOpen/icClose ile uyumlu). */
function _syncPill(home) {
  const pill = document.getElementById('breath-pill');
  if (!pill) return;
  const cardOpen = !!document.getElementById('ic-overlay')?.classList.contains('open');
  pill.classList.toggle('visible', !home && !cardOpen);
}

/* Şeridin içeriği: kişisel sorular (10y2, varsa) önce, model başlatıcıları
   (10w) kalan yuvaları doldurur — en fazla dört çip (CSS kademeli girişi
   nth-child(4)'e kadar tanımlı).

   Kişisel sorular şeridi ele geçirmez: modelin kimliği (Öz/Bağ/Eser) hep
   ekranda kalsın diye son yuva(lar) modelindir. Dokuma yoksa şerit
   bugünkü hâliyle çizilir — hiçbir kullanıcı boş ekran görmez.

   Tek kaynak: llmStarterSend indeksi de buradan çözer, iki liste tutulmaz. */
const SERIT_MAX = 4;
function _seritCipleri() {
  const out = [];
  let kisisel = [];
  try { kisisel = window.bslOku?.() || []; } catch (_) {}
  kisisel.forEach(k => { if (k && k.metin) out.push({ metin: k.metin, id: k.id }); });

  const model = fmStarters() || [];
  for (let i = 0; i < model.length && out.length < SERIT_MAX; i++) {
    if (model[i]) out.push({ metin: model[i], id: null });
  }
  return out.slice(0, SERIT_MAX);
}

/* ── ANA EKRANIN KANIT KAPISI ──
   Şerit, model satırı ve composer placeholder'ı kullanıcıya AİT sözlerdir;
   yerleşik i18n başlatıcıları ne beyandır ne ölçüm (§6.10). Kaynaklar
   konuşmadan çizilirlerse ekran önce varsayılanla dolup sonra değişir —
   2026-08-19 kaydında açılış dört dalgada kuruluyordu: boş → yerleşik şerit →
   selam+model → kişisel şerit. Kapı iki kaynağa bakar; SİGORTASI zincirin
   ucundadır (`llmHomeAc`, 03'te `kbSerbest` yanında): ağ ölse de ekran
   sonsuza dek boş kalmaz — sessizlik ≠ kayboluş. */
let _kapiZorlandi = false;
function _kapiAcik() {
  if (_kapiZorlandi) return true;
  // `bslOku` 10y2 modülü yüklenince doğar; `_fmYuklendi` 10w'nin ağ turu
  // karara varınca (başarı da hata da).
  return !!S._fmYuklendi && typeof window.bslOku === 'function';
}

/** Zincirin ucundan çağrılır: kapıyı zorla açar ve ekranı bir kez çizer. */
export function llmHomeAc() {
  if (_kapiZorlandi) return;
  _kapiZorlandi = true;
  llmRenderHome();
}

/* Aynı metni yeniden yazmak masum DEĞİL: `.casc` chat-view'dan hiç
   kaldırılmıyor, bu yüzden DOM'a her dokunuş giriş animasyonunu baştan
   oynatır (çipler yeniden doğar) ve 00i'nin gözcüsü boşuna tetiklenir.
   Yazım yalnız değişiklikte. */
function _yaz(el, metin) {
  if (!el || el.textContent === metin) return;
  el.textContent = metin;
}

/* Selam + başlatıcı çiplerini aktif modele göre (yeniden) çiz.
   10w model yüklemesi/geçişi sonrasında window.llmRenderHome?.() ile çağrılır. */
export function llmRenderHome() {
  // Kanıt yoksa SUSULUR: alan `data-kb` ile bekler (00i), ad/model hidre
  // olunca bu fonksiyon yeniden çağrılır ve söz o zaman belirir.
  const _ad = _userNameKanitli();
  const greetEl = document.getElementById('llm-greeting');
  if (greetEl && _ad) _yaz(greetEl, fmGreetingText(_ad));

  const acik = _kapiAcik();

  const subEl = document.getElementById('llm-greeting-sub');
  if (subEl && acik) {
    const m = fmGetActive();
    // Yarım model (tagline'ı gelmemiş) de kanıtsızdır — "Wanderer Öz · "
    // diye yarım bir cümle yazmaktansa beklemek dürüsttür.
    if (m && m.name && m.tagline) _yaz(subEl, `${m.name} · ${m.tagline}`);
  }

  // Model Stüdyosu'nun yazdığı özel cümle — selamın YERİNE değil, composer'ın
  // placeholder'ına akar ("Wanderer'a yaz…" yerine).
  const inputEl = document.getElementById('chat-input');
  if (inputEl && acik) {
    const _ph = fmInputPlaceholder(_userName());
    if (inputEl.placeholder !== _ph) {
      inputEl.placeholder = _ph;
      // Placeholder scrollHeight'e yansımaz (tarayıcı davranışı) — uzun model
      // cümleleri tek satıra sıkışıp kırpılmasın diye kutuyu placeholder'a göre
      // ölç: value'yu anlık doldurup yüksekliği oku, sonra boşalt. Kullanıcı
      // zaten yazmışsa (inputEl.value dolu) dokunma — autoResize onu yönetir.
      if (!inputEl.value) {
        inputEl.value = inputEl.placeholder;
        inputEl.style.height = 'auto';
        inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px';
        inputEl.value = '';
      }
    }
  }

  const host = document.getElementById('llm-starters');
  if (host && acik) {
    const _cipler = _seritCipleri();
    // İmza DOM'da taşınır (modül değişkeninde değil): host silinip yeniden
    // yaratılırsa imza da onunla gider, bayat imzayla boş şerit kalmaz.
    const _imza = _cipler.map(c => (c.id || '') + '\u0001' + c.metin).join('\u0002');
    if (host.dataset.llmImza !== _imza) {
      host.dataset.llmImza = _imza;
      host.innerHTML = _cipler.map((c, i) =>
        `<button class="llm-starter" onclick="llmStarterSend(${i})"${c.id ? ` data-bsl-id="${_esc(c.id)}"` : ''}>
          <span class="llm-starter-glyph" aria-hidden="true">✦</span>
          <span class="llm-starter-text">${_esc(c.metin)}</span>
          <svg class="llm-starter-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>
        </button>`
      ).join('');
      // Kişisel çiplere basılı-tut gerekçesini bağla (10y2; model çiplerinde
      // data-bsl-id yok, dokunulmazlar). İdempotent.
      try { window.bslCipleriBagla?.(host); } catch (_) {}
    }
  }

  // Gün doluysa selamın altında (model satırının dilinde) devam satırı belirsin
  document.getElementById('llm-continue')
    ?.classList.toggle('show', !_todayIsEmpty());

  // İçerik yerine oturdu — perde de indiyse açılış kademelenmesi burada, TEK
  // kez oynar. Perde henüz yukarıdaysa tetik onun kapanışından gelir.
  if (acik) _bootCascDene(CASC_NOW);
}

/* Başlatıcı çipi → composer'a yaz ve gönder. İndeks ŞERİDİN indeksidir
   (kişisel + model birleşik), fmStarters()'ın değil: iki liste ayrı
   sayılsaydı üçüncü çipe dokunan dördüncüyü gönderirdi. */
export function llmStarterSend(i) {
  const cip = _seritCipleri()[i];
  if (!cip || !cip.metin) return;
  llmSendStarter(cip.metin);
}

/* Serbest metinle starter gönderimi — Kitaplık çipinin (10g) portal kapanış
 *  callback'i buraya gelir; `llmStarterSend`'in indeks-bağımsız kardeşi. */
export function llmSendStarter(text) {
  if (!text) return;
  const inp = document.getElementById('chat-input');
  if (!inp) return;
  _homeDismissed = true;                 // gönderimle birlikte akışa geç
  inp.value = text;
  try { window.autoResize?.(inp); } catch (_) {}
  try { window.sendMessage?.(); } catch (_) {}
}

/* Home ↔ sohbet düzeni arasında geçiş — chat-view'e sınıf yaz.
   base verilirse (flip/gezinme: after-hook) ya da home YENİ açıldıysa (oturum-içi
   yeniden beliriş) giriş kademelenmesini oynat. Boot'ta perde (wn-splash) hâlâ
   yukarıdaysa erken oynatma — kapanışta llmHomeCascade tetikler. */
export function llmSyncHome(base) {
  const view = document.getElementById('chat-view');
  if (!view) return;
  const home = _shouldHome();
  const was = view.classList.contains('llm-home');
  if (home !== was) view.classList.toggle('llm-home', home);

  if (home) {
    // Açılış kademelenmesi oynamadan hiçbir ara tetik ekranı süzmez — boot'un
    // tek dalgası `_bootCascDene`'nindir (bkz. yukarıdaki blok).
    if (_bootCascOynadi && (base !== undefined || !was)) _wsCascade(view, base);
  }
  // Devam satırı / selam, home'dayken gün doldukça da güncellenmeli
  // (örn. geçmiş hidrasyonu home açıkken biter) — sınıf değişmese de çiz.
  if (home) llmRenderHome();
  _syncPill(home);
}

/* Wanderer ekranı (ön yüz) DUYURU KANALLARI — Bugün'ün
   checkAdminAnnouncement (Emre'nin duyurusu) + checkLibraryUpdate (Kitaplık
   alt-sayfası) işleri ön yüzde de koşsun. Çoğu ücretsiz kullanıcı yalnız
   Sohbet'te kalır; arka yüze (Bugün) hiç geçmeyebilir → bu kanalları orada
   kaçırırdı. Yalnız TEMİZ ana ekranda (llm-home) tetiklenir; akan sohbeti
   bölmez. Damgalar Bugün ile ortak — bir yüzde kapatmak ikisini de kapatır.
   10g dinamik import: döngüsel bağımlılığı önler. */
function _checkWandererAnnounce() {
  if (!S.currentUser?.id) return;          // post-auth değilse atla (anon damga olmasın)
  if (!_shouldHome()) return;              // yalnız temiz ana ekranda
  const auth = document.getElementById('auth-screen');
  if (auth && getComputedStyle(auth).display !== 'none') return;
  import('./10g-w2-wanderer-game.js').then(m => {
    try { m.checkAdminAnnouncement?.(); m.checkLibraryUpdate?.(); } catch (_) {}
  }).catch(() => {});
}

/* ── LLM REFLEKSLERİ — composer odağı + kısayollar ──
   Claude/ChatGPT/Gemini'nin giriş hissi: perde kalkınca imleç yazı
   kutusunda, ⌘/Ctrl+K yeni sohbet açar, ⌘/Ctrl+/ kısayol kartını gösterir. */

/* Perde kapanınca (03-auth-shell _closeSplash) composer'a odaklan. Yalnız
   masaüstünde (`pointer: fine` = fiziksel klavye ipucu; mobilde odaklanma
   klavyeyi zıplatır), yalnız temiz ana ekranda (akan sohbeti/yazılan metni
   BÖLME) ve açık bir overlay yokken (Armağan/Söz aynı anda açılabilir —
   odak çalmasın). */
export function llmFocusComposer() {
  try {
    if (!window.matchMedia?.('(pointer: fine)')?.matches) return;
    if (!_shouldHome()) return;
    if (document.querySelector('.overlay.open, .onb-ritual, #gl-portal')) return;
    document.getElementById('chat-input')?.focus({ preventScroll: true });
  } catch (_) {}
}

const _KBD_MOD = /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '') ? '⌘' : 'Ctrl';
let _kbdOverlayEl = null;
let _kbdPrevFocus = null;

/* Kısayollar post-auth reflekstir — eşik (giriş ekranı / yaş kapısı) üstteyken
   ya da açılış perdesi inmemişken çalışmazlar. Kapı olmasaydı ⌘K, auth
   perdesinin ARKASINDA newSession'ı koşturur: onboarding ritüeli (.sc-onb)
   DOM'a sızar — kullanıcı ne görür ne kapatabilir — ve içeri girdiğinde
   10s/10t/13h/10g o sınıfı görüp günlük ritüelleri erteler. Üstelik
   preventDefault tarayıcının kendi ⌘K'sını da yutar. */
function _shortcutsReady() {
  if (!S.currentUser?.id) return false;
  const auth = document.getElementById('auth-screen');
  if (auth && getComputedStyle(auth).display !== 'none') return false;
  if (document.getElementById('wn-splash')?.classList.contains('show')) return false;
  return true;
}

function _kbdEnsureStyles() {
  if (document.getElementById('kbd-styles')) return;
  const css = `
  .kbd-overlay{position:fixed;inset:0;z-index:var(--z-kbd);display:none;align-items:center;justify-content:center;
    background:rgba(10,8,6,.72);backdrop-filter:blur(6px);padding:24px;}
  .kbd-overlay.show{display:flex;}
  .kbd-overlay:focus{outline:none;}
  .kbd-card{width:100%;max-width:300px;}
  .kbd-card .doc-eyebrow{margin-bottom:10px;text-align:center;}
  .kbd-keys{text-align:right;white-space:nowrap;}
  .kbd-keys kbd{display:inline-block;min-width:20px;padding:2px 6px;margin-left:3px;
    border:1px solid var(--border-active);border-radius:5px;background:var(--gold-quiet-dim);
    color:var(--text);font-family:var(--sans);font-size:11px;text-align:center;}
  `;
  const style = document.createElement('style');
  style.id = 'kbd-styles';
  style.textContent = css;
  document.head.appendChild(style);
}

function _kbdBuildOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'kbd-overlay';
  overlay.id = 'kbd-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', t('kbd.title', 'Kısayollar'));
  overlay.tabIndex = -1;   // programatik odak alabilsin (Tab sırasına girmez)
  overlay.innerHTML = `
    <div class="kbd-card doc-rise">
      <div class="doc-eyebrow">${t('kbd.title', 'Kısayollar')}</div>
      <div class="doc-tablebox"><table><tbody>
        <tr><td>${t('kbd.new_chat', 'Yeni sohbet')}</td><td class="kbd-keys"><kbd>${_KBD_MOD}</kbd><kbd>K</kbd></td></tr>
        <tr><td>${t('kbd.this_card', 'Bu kart')}</td><td class="kbd-keys"><kbd>${_KBD_MOD}</kbd><kbd>/</kbd></td></tr>
      </tbody></table></div>
    </div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) _kbdHide(); });
  document.body.appendChild(overlay);
  return overlay;
}

// aria-modal bir SÖZ'dür: odak da kartın içine girmeli, yoksa ekran okuyucu
// arkadaki sayfada gezinmeye devam eder. Kapanışta odak geldiği yere döner.
function _kbdHide() {
  if (!_kbdOverlayEl?.classList.contains('show')) return;
  _kbdOverlayEl.classList.remove('show');
  try { _kbdPrevFocus?.focus?.({ preventScroll: true }); } catch (_) {}
  _kbdPrevFocus = null;
}

function _kbdToggle() {
  _kbdEnsureStyles();
  if (!_kbdOverlayEl) _kbdOverlayEl = _kbdBuildOverlay();
  if (_kbdOverlayEl.classList.contains('show')) { _kbdHide(); return; }
  _kbdPrevFocus = document.activeElement;
  _kbdOverlayEl.classList.add('show');
  try { _kbdOverlayEl.focus({ preventScroll: true }); } catch (_) {}
}

// Global — input/textarea içindeyken de geçerli (LLM'lerdeki alışılmış
// davranış). preventDefault ŞART: ⌘K tarayıcı adres/arama kutusunu açar.
// Escape kapıdan MUAF: kart açıksa her koşulda kapanabilmeli (oturum bir
// şekilde düşerse kart DOM'da kilitli kalmasın); 03-auth-shell'in Escape
// dinleyicisi yalnız post-auth kurulduğu ve başka yüzeyleri kapattığı için
// kartın kapanışı kendi listener'ında yaşar.
function _installShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { _kbdHide(); return; }
    if (!(e.metaKey || e.ctrlKey)) return;
    const key = e.key.toLowerCase();
    if (key !== 'k' && key !== '/') return;   // kapı SONRA: ⌘C/⌘V'de boşuna stil hesaplanmasın
    if (!_shortcutsReady()) return;
    if (key === 'k') { e.preventDefault(); window.newSession?.(); }
    else { e.preventDefault(); _kbdToggle(); }
  });
}

/* ── KURULUM ── */

/* ✦ mini kart FAB görünürlüğü — arka yüzdeyken (ve auth ekranı kapalıyken).
   switchView hook'una ek olarak boot'ta da çağrılır: oturum restore yolunda
   hiç switchView çalışmazsa FAB'sız kalınmasın. */
function llmSyncFab() {
  const fab = document.getElementById('flip-fab');
  if (!fab) return;
  const auth = document.getElementById('auth-screen');
  const authVisible = !!auth && getComputedStyle(auth).display !== 'none';
  fab.classList.toggle('show', !authVisible && !_isFront(_currentView()));
}

function _installHooks() {
  // Flip: chat ↔ arka yüz sınırı aşılırken animasyonlu geçiş
  switchViewHooks.before((v, ctx) => {
    if (_bypassHook || !_flipArmed) return;
    if (_flipBusy) { ctx.cancelled = true; return; } // dönüş bitmeden yeni geçiş yok
    const cur = _currentView();
    if (!cur || cur === v) return;
    if (_isFront(cur) === _isFront(v)) return;       // aynı yüz içinde — flip yok
    ctx.cancelled = true;
    _flip(v);
  });

  switchViewHooks.after((v) => {
    _flipArmed = true;
    // Arka yüzde ✦ mini kart görünür — dokununca ön yüze döner
    llmSyncFab();
    // Giriş kademelenmesi: flip ise perde sonrasını bekle (CASC_FLIP),
    // perdesiz aynı-yüz gezinmesinde anında (CASC_NOW).
    const base = _flipBusy ? CASC_FLIP : CASC_NOW;
    if (_isFront(v)) { llmSyncHome(base); _checkWandererAnnounce(); }
    else if (v === 'bugun') _wsCascade(document.getElementById('bugun-view'), base);
  });

  // Auth ekranı kapanınca (giriş / oturum restore) FAB'ı mevcut view'e eşle
  const auth = document.getElementById('auth-screen');
  if (auth) {
    new MutationObserver(llmSyncFab)
      .observe(auth, { attributes: true, attributeFilter: ['style', 'class'] });
  }
  llmSyncFab();
}

function _installHomeObserver() {
  const area = document.getElementById('messages-area');
  if (!area) { setTimeout(_installHomeObserver, 300); return; }
  // Mesaj akışı değiştikçe (gönderim, opener, geçmiş render) durumu eşle
  new MutationObserver(() => llmSyncHome()).observe(area, { childList: true });
  llmSyncHome();
}

/* Composer'dan gönderim = ana ekrandan çıkış. Capture fazında dinlenir;
   sendMessage input değerini sonradan okuduğu için sıralama güvenli. */
function _installDismissTriggers() {
  document.getElementById('send-btn')
    ?.addEventListener('click', () => _dismissHome(), true);
  document.getElementById('chat-input')
    ?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) _dismissHome();
    }, true);
}

/* Dil değişiminde composer'ı YENİDEN çiz — applyTranslations (15-i18n) artık
   #chat-input'un placeholder'ını data-i18n-ph üzerinden genel "Wanderer'a yaz…"
   değerine çeker; Model Stüdyosu'nun özel cümlesi onun ARDINDAN geri yazılmalı.
   İki olay da dinlenir: setLanguage anında `i18nchange`, sidecar sözlük geç
   geldiğinde `i18ndictloaded` — ikisi de applyTranslations koşturur. */
if (typeof window !== 'undefined') {
  const _reRenderHome = () => { try { llmRenderHome(); } catch (_) {} };
  window.addEventListener('i18nchange', _reRenderHome);
  window.addEventListener('i18ndictloaded', _reRenderHome);
}

(function llmShellBoot() {
  function attach() {
    if (typeof document === 'undefined') return;
    if (!document.getElementById('app-screen')) { setTimeout(attach, 200); return; }
    _installHooks();
    _installHomeObserver();
    _installDismissTriggers();
    _installShortcuts();
    llmRenderHome();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
