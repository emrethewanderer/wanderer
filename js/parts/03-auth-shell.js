import { S } from '../state.js';
import { sb, SUPABASE_URL, ADMIN_EMAIL, AI_MODES, IS_ADMIN_PAGE } from '../config.js';
import { STORAGE_KEYS, SafeStorage, ErrorBoundary, showToast, storageInit, createHookRegistry, localISODate } from './00a-infrastructure.js';
import { bnMark, bnSar, bnHazir } from './00h-boot-nabzi.js';
import { kbSerbest } from './00i-kanit-bekleyen.js';
import { t } from './15-i18n.js';
import { p } from './16-i18n-prompts.js';
import { updateModeBadge, nowTR, loadResistanceLog, loadSilenceTopicLog, markCommitmentsChecked, cleanHistoryText } from './00-config-tracking.js';
import { generatePreSessionContext, loadNarrativeMemory, loadSessionPatterns } from './01-prompts-modes.js';
import { startOnboardingSequence, scheduleEndOfDayJudgment, resetSilencePressure } from './02-features-onboarding.js';
import { loadAllChatHistory, loadMoodHistory, updateSessionHero } from './04-llm-hero-history.js';
import { loadSomaticHistory, loadPartsHistory, syncClosureStatusFromDB } from './05-closure-parts.js';
import { loadSummarizedSessionIds, loadSummaries, appendMsg, startStreamingMsg, resetSessionRing, showTyping, removeTyping, chatKuyrukInit } from './06-summary-chat.js';
import { loadSettings, loadKnowledge, loadDashboard, loadNotebook, adminShowHome } from './07-settings-knowledge.js';
import { syncAnalyticsFromSupabase, showMicroOnboarding, loadUserProfile, loadRoadmap, buildOnboardingContext } from './09-reports-tracks.js';
import { w2RenderGreetingCard, w2Nav, w2CloseDrawer, w2CloseProfile, w2OpenProfile, w2RefreshProfilePanel, loadBugunView, loadMuhrumView, wsTab, updateChatIdentityBanner, w2ResetContextualCards } from './10-features-w2.js';
// 10h (Sefer/Engeller) buradan import EDİLMİYOR: eski `library`/`challenge`
// switchView dalları ölüydü (o ekranlar DOM'da yok). `loadLibrary` ve AI
// challenge zinciri 2026-08-17'de tümüyle söküldü; Sefer'in yüzeyi artık
// Derin Çalışma'nın `#dc-sefer` bölümü (13A, window köprüsüyle).
// Modül main.js'ten yükleniyor, ENGELLER/HASIM_BOSSES tüketicileri sağlam.
// 10c-w2-manifesto.js SÖKÜLDÜ (2026-08-17): tek tüketicisi bu import'tu ve
// `#manifesto-*` alanları DOM'da doğmuyordu. Karıştırma: 10v-w2-manifesto-reader
// BAŞKA bir modüldür (Manifesto Okuma Ritüeli) ve canlıdır.
import { showDailyThought } from './10d-w2-quickask.js';
import { scheduleProactiveCheckin } from './10b-w2-gamification.js';
import { loadFeatureVideos } from './10o-w2-feature-gate.js';
import { w2LoadSummariesCache, w2ScheduleMidnightSummary, w2RenderInfiniteChat } from './11-w2-chat-cal.js';
import { w3MaybeRunMigration, w3GetDaySessionId, w2CheckAndSummarizeYesterday } from './12-w3-journey.js';
import { personalizationLoad } from './09a-personalization-engine.js';
import { HK_VERSION } from './13p-hukuk.js';
// 08-trends-payment.js ve 13-extras.js dairesel bağımlılık oluşturduğundan window üzerinden erişilir

/* ═══════════════════════════════════════════════════════
   KOD KAPISI · adres hem anahtar hem adres
   ───────────────────────────────────────────────────────
   FELSEFE / VİZYON (Emre):
     Eşik kimlik ödünç almaz ve hatırlanacak bir şey istemez. Google'ın
     kimliği Google'ın, Apple'ınki Apple'ın; şifre ise unutulur ve "şifremi
     unuttum" her seferinde bir kayıp kapısı açar. Kullanıcı yalnız adresini
     bırakır, kod gelir, içeri girer.
     Kapının asıl kazancı ikinci bir yerdedir. Wanderer'ın kullanıcıya
     uygulamanın DIŞINDAN da yazabilmesi için zaten bir adrese ihtiyacı
     vardı; adresi kayıt formunda ayrı bir alan olarak sormak DOĞRULANMAMIŞ
     bir adres toplamaktı — yanlış yazan bülteni hiç almaz, kimse de fark
     etmezdi. Burada adres kimliğin KENDİSİDİR: içeri giren herkesin adresi,
     girdiği anda doğrulanmış olur. Tek adres, tek gerçek.
   MEKANİK / TEK GİRİŞ:
     signInWithOtp({email}) → kod postası → verifyOtp({email, token}) → oturum.
     GİRİŞ İLE KAYIT AYRILMAZ: Supabase var olan adresi tanır, olmayanı
     yaratır. "Yeni misin?" sorusunu kullanıcı değil uygulama cevaplar —
     profilinde adı yoksa tanışma paneli açılır.
     Kestirme (Google/Apple): doOAuth(provider) → signInWithOAuth, dönüşü
     web'de 14-boot'un getSession'ı, native'de authHandleOAuthUrl devralır —
     ikisi de aynı DOĞRULANMIŞ adres üstünden yukarıdaki tanışma kapısına düşer.
   Kalıcılık: yok — adres oturumun kendisinde (auth.users.email) yaşar;
     `_adres` yalnız kod paneli açıkken bellekte durur.
   ELLE (SETUP-KOD-KAPISI-VE-POSTA.md): Supabase'in "Magic Link" şablonu
     {{ .Token }} içermelidir — varsayılan şablon BAĞ gönderir, kod değil.
     Ayrıca yerleşik e-posta servisi üretim için değildir (saatte birkaç
     posta); özel SMTP bağlanmadan kapı hız sınırına toslar.
     OAuth (SETUP-SOSYAL-KAPILAR.md): Google/Apple, Supabase Dashboard'da
     sağlayıcı olarak açılmadan ve Apple Developer'da Services ID + Return
     URL kurulmadan doOAuth hata döner — kod bugün geri gelir, kapı ELLE'ye
     kalır.
   Konvansiyon: i18n t(); window.auth* expose (main.js); stiller
     css/parts/auth.css
   ═══════════════════════════════════════════════════════ */

/* Yeniden gönderim eşiği. Sağlayıcı zaten kendi hız sınırını uygular; bu
   sayaç kullanıcıyı o duvara TOSLAMADAN önce durdurur — hata mesajı yemek
   yerine ne kadar bekleyeceğini görür. */
const KOD_BEKLEME_SN = 60;
const KOD_HANE       = 6;

/* Kod panelinde doğrulanacak adres. verifyOtp, kodu İSTEYEN adresle birlikte
   ister — kullanıcı arada alanı değiştirse bile doğrulama, kodun gerçekten
   gönderildiği adrese karşı yapılmalıdır. */
let _adres      = null;
let _kodSayacId = null;

/* Ham girdiyi tek biçime indirger. Küçük harfe çevirmek şart: adres kimliğin
   kendisi olduğu için "Emre@x.com" ile "emre@x.com" aynı hesap olmalıdır —
   aksi hâlde aynı kişi iki hesaba ve iki ayrı geçmişe bölünür.
   TEK YER: ikinci bir normalizasyon kopyası çıkarsa kod bir adrese gider,
   doğrulama başkasına yapılır ve kullanıcı doğru kodu yazdığı hâlde
   "geçersiz kod" görür. */
export function _authAdresNormal(ham) {
  const s = String(ham || '').trim().toLowerCase();
  if (!s || s.length > 254) return null;
  // Kasten dar değil: adresin gerçekliğini kod postası kanıtlar, regex değil.
  // Buradaki kapı yalnız boş/bozuk gönderimi eler.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return null;
  return s;
}

/* ─── Yazım-hatası kapısı (K9) ───
   Sekmenin en ucuz panzehiri, postayı hiç göndermemektir. Ama bu kapı
   ENGELLEMEZ, SORAR: liste asla tam değildir ve gerçek bir adresi reddetmek,
   sekmiş bir adresten pahalıdır. Bir kez sorar; kullanıcı ikinci kez
   basarsa yazdığı adrese gönderilir. */
const ADRES_TYPO = {
  'gmial.com': 'gmail.com',   'gmai.com': 'gmail.com',    'gmaill.com': 'gmail.com',
  'gnail.com': 'gmail.com',   'gmail.co': 'gmail.com',    'gmil.com': 'gmail.com',
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmal.com': 'hotmail.com',
  'hotnail.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'yahooo.com': 'yahoo.com',  'yaho.com': 'yahoo.com',    'yahoo.co': 'yahoo.com',
  'outlok.com': 'outlook.com','outloo.com': 'outlook.com','outlook.co': 'outlook.com',
  'iclod.com': 'icloud.com',  'icloud.co': 'icloud.com',
  'windowslive.com': 'hotmail.com',
};

export function _authAdresSupheli(adres) {
  const s = String(adres || '');
  const at = s.lastIndexOf('@');
  if (at < 1) return null;
  const alan = s.slice(at + 1);
  let dogru = ADRES_TYPO[alan] || null;
  // '.con' klavyede 'm'in komşusudur ve alan adı listesine bağlı değildir —
  // hangi alan adında olursa olsun yakalanır.
  if (!dogru && alan.endsWith('.con')) dogru = alan.slice(0, -4) + '.com';
  if (!dogru || dogru === alan) return null;
  return s.slice(0, at + 1) + dogru;
}

/* Aynı adres için bir kez sorulur; ikinci basış onaydır. */
let _sorulanAdres = null;

function _kodSayacDur(sifirla = true) {
  if (_kodSayacId) { clearInterval(_kodSayacId); _kodSayacId = null; }
  if (!sifirla) return;
  const btn = document.getElementById('auth-kod-tekrar');
  if (btn) { btn.disabled = false; btn.textContent = t('auth.kod.tekrar', 'Yeniden gönder'); }
}

function _kodSayacBaslat() {
  _kodSayacDur();
  let kalan = KOD_BEKLEME_SN;
  const btn = document.getElementById('auth-kod-tekrar');
  const yaz = () => {
    if (!btn) return;
    if (kalan > 0) {
      btn.disabled = true;
      btn.textContent = t('auth.kod.tekrar_sn', 'Yeniden gönder — {sn} sn').replace('{sn}', String(kalan));
    } else {
      btn.disabled = false;
      btn.textContent = t('auth.kod.tekrar', 'Yeniden gönder');
    }
  };
  yaz();
  _kodSayacId = setInterval(() => {
    kalan -= 1;
    yaz();
    if (kalan <= 0) _kodSayacDur(false);
  }, 1000);
}

function _authErr(mesaj, altin = false) {
  const el = document.getElementById('auth-error');
  if (!el) return;
  el.style.color = altin ? 'var(--gold)' : '';
  el.textContent = mesaj || '';
}

/* Adres panelini öne al. Eşik açılışta zaten bu paneli gösterir; bu fonksiyon
   panelden panele dönüşler için durur (tanışma iptali, kod panelinden çıkış). */
export function authAdresAc() {
  _authEntryDone();
  const adres = document.getElementById('auth-adres');
  if (adres) adres.style.display = 'block';
  _authErr('');
  // Odak yalnız fare/klavye cihazında — mobilde panel açılır açılmaz
  // klavyenin fırlaması eşiği bozar (aynı kapı: llmFocusComposer).
  try {
    if (window.matchMedia?.('(pointer: fine)').matches) document.getElementById('auth-adres-input')?.focus();
  } catch (_) {}
}

async function _kodGonder(btnId, bekleyenMetin, sonMetin) {
  const ham   = document.getElementById('auth-adres-input')?.value || '';
  const adres = _authAdresNormal(ham);
  if (!adres) { _authErr(t('auth.adres.error.invalid', 'Adresi bir kontrol et — buraya posta gitmez gibi.')); return null; }

  // Şüphe varsa BİR KEZ sor, gönderme. İkinci basış onaydır.
  const oneri = _authAdresSupheli(adres);
  if (oneri && _sorulanAdres !== adres) {
    _sorulanAdres = adres;
    _authErr(
      t('auth.adres.supheli', 'Şunu mu demek istedin: {oneri} — adresin doğruysa gönder düğmesine yeniden bas.')
        .replace('{oneri}', oneri),
      true,
    );
    return null;
  }

  const btn = document.getElementById(btnId);
  if (btn) { btn.disabled = true; btn.textContent = bekleyenMetin; }
  _authErr('');
  try {
    const { error } = await sb.auth.signInWithOtp({ email: adres });
    if (btn) { btn.disabled = false; btn.textContent = sonMetin; }
    if (error) { _authErr(trAuthErr(error.message)); return null; }
    return adres;
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = sonMetin; }
    _authErr(t('error.network'));
    return null;
  }
}

export async function authKodIste() {
  const adres = await _kodGonder('auth-adres-btn', '...', t('auth.adres.btn', 'Kodu gönder'));
  if (!adres) return;
  _adres = adres;

  const adresP = document.getElementById('auth-adres');
  const kodP   = document.getElementById('auth-kod');
  if (adresP) adresP.style.display = 'none';
  if (kodP)   kodP.style.display   = 'block';
  const hedef = document.getElementById('auth-kod-hedef');
  if (hedef) hedef.textContent = adres;
  _authKodTemizle();
  _kodSayacBaslat();
  try {
    if (window.matchMedia?.('(pointer: fine)').matches) _authKodHaneler()[0]?.focus();
  } catch (_) {}
}

export async function authKodTekrar() {
  if (_kodSayacId) return;               // sayaç dolmadan ikinci posta yok
  const adres = await _kodGonder('auth-kod-tekrar', '...', t('auth.kod.tekrar', 'Yeniden gönder'));
  if (!adres) return;
  _adres = adres;
  _authKodTemizle();
  _kodSayacBaslat();
  _authErr(t('auth.kod.tekrar_gitti', 'Yeni kod yolda.'), true);
}

export function authAdresDegistir() {
  _kodSayacDur();
  _adres = null;
  _sorulanAdres = null;
  const adresP = document.getElementById('auth-adres');
  const kodP   = document.getElementById('auth-kod');
  if (kodP)   kodP.style.display   = 'none';
  if (adresP) adresP.style.display = 'block';
  _authKodTemizle();
  _authErr('');
  try {
    if (window.matchMedia?.('(pointer: fine)').matches) document.getElementById('auth-adres-input')?.focus();
  } catch (_) {}
}

/* ─── Kod haneleri ───
   Altı ayrı kutu tek bir alandan daha fazla iş yapar: kullanıcı kaçıncı
   hanede olduğunu görür, yanlış haneyi tek tuşla düzeltir. Bedeli üç küçük
   davranıştır — otomatik ilerleme, geri silme ve yapıştırma — üçü de burada.
   Okuma TEK YERDEN (_authKodOku) yapılır: kutuların sayısı değişse bile
   doğrulama tarafı dokunulmaz kalır. */
function _authKodHaneler() {
  return Array.from(document.querySelectorAll('#auth-kod-haneler .auth-kod-hane'));
}

function _authKodOku() {
  return _authKodHaneler().map(el => (el.value || '').replace(/\D/g, '')).join('');
}

function _authKodTemizle() {
  _authKodHaneler().forEach(el => { el.value = ''; });
}

export function authKodHane(el) {
  if (!el) return;
  el.value = (el.value || '').replace(/\D/g, '').slice(-1);
  const haneler = _authKodHaneler();
  const i = haneler.indexOf(el);
  if (el.value && i > -1 && i < haneler.length - 1) haneler[i + 1].focus();
  // Son hane dolduğunda kullanıcıya ayrıca "onayla" dedirtmeyiz: kod tamamsa
  // kapı kendiliğinden çalınır. Altı hane zaten bir niyet beyanıdır.
  if (_authKodOku().length === KOD_HANE) authKodDogrula();
}

export function authKodTus(ev, el) {
  if (!ev || !el) return;
  if (ev.key === 'Enter') { ev.preventDefault(); authKodDogrula(); return; }
  // Boş kutuda geri silme: imleci bir öncekine taşı ve ONU sil — yoksa
  // kullanıcı silmek için her hanede iki kez basmak zorunda kalır.
  if (ev.key === 'Backspace' && !el.value) {
    const haneler = _authKodHaneler();
    const i = haneler.indexOf(el);
    if (i > 0) { ev.preventDefault(); haneler[i - 1].value = ''; haneler[i - 1].focus(); }
  }
}

export function authKodYapistir(ev) {
  try {
    const metin = (ev?.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, KOD_HANE);
    if (!metin) return;
    ev.preventDefault();
    const haneler = _authKodHaneler();
    haneler.forEach((el, i) => { el.value = metin[i] || ''; });
    (haneler[Math.min(metin.length, haneler.length - 1)] || haneler[0])?.focus();
    if (metin.length === KOD_HANE) authKodDogrula();
  } catch (_) {}
}

let _kodDogrulaniyor = false;

export async function authKodDogrula() {
  // Son hane dolduğunda otomatik tetikleniyor; kullanıcı ayrıca butona
  // basarsa aynı kod iki kez takas edilmeye çalışılır ve İKİNCİSİ "geçersiz
  // kod" der (tek kullanımlık). Kapı bu yüzden tek girişlidir.
  if (_kodDogrulaniyor) return;
  const kod = _authKodOku();
  if (kod.length !== KOD_HANE) {
    _authErr(t('auth.kod.error.eksik', 'Kodun altı hanesini de yaz.'));
    return;
  }
  if (!_adres) { _authErr(t('auth.kod.error.adres_yok', 'Önce adresini yaz.')); return; }

  _kodDogrulaniyor = true;
  const btn = document.getElementById('auth-kod-btn');
  if (btn) { btn.disabled = true; btn.textContent = '...'; }
  _authErr('');
  try {
    const { data, error } = await sb.auth.verifyOtp({ email: _adres, token: kod, type: 'email' });
    if (error) {
      _kodDogrulaniyor = false;
      if (btn) { btn.disabled = false; btn.textContent = t('auth.kod.btn', 'Eşiği geç'); }
      _authErr(trAuthErr(error.message));
      _authKodTemizle();
      try { _authKodHaneler()[0]?.focus(); } catch (_) {}
      return;
    }
    _kodSayacDur();
    _sorulanAdres = null;
    // Buradan sonrası kapının değil UYGULAMANIN işidir. Ayrı try: initApp
    // içinde patlayan bir şey "ağ hatası" diye raporlanırsa kullanıcı doğru
    // kodu yazdığı hâlde ağını suçlar ve aynı kodu tekrar dener — oysa kod
    // tek kullanımlıktır, ikinci deneme de "geçersiz" der. Yanlış teşhis
    // burada kilitlenmeye dönüşür.
    try {
      await initApp(data.user);
    } catch (e) {
      _kodDogrulaniyor = false;
      if (btn) { btn.disabled = false; btn.textContent = t('auth.kod.btn', 'Eşiği geç'); }
      _authErr(t('auth.kod.error.acilamadi', 'Kod doğru — ama uygulama açılamadı. Sayfayı yenile.'));
      console.warn('authKodDogrula/initApp:', e && e.message);
    }
  } catch (e) {
    _kodDogrulaniyor = false;
    if (btn) { btn.disabled = false; btn.textContent = t('auth.kod.btn', 'Eşiği geç'); }
    _authErr(t('error.network'));
  }
}

/* ─── EŞİK KAPILARI — OAuth (Google · Apple) ───
   Kod kapısı zemin, bu ikisi kestirme: adres yine kimliğin kendisidir —
   Supabase, OAuth'tan gelen DOĞRULANMIŞ e-postayı aynı adresi taşıyan
   mevcut hesaba kendi bağlar, "tek adres tek gerçek" burada da korunur
   (Apple'ın gizli adres relay'i istisnadır, bkz. sosyal-kapilar planı K3).

   İKİ KABUK, İKİ DÖNÜŞ YOLU:
   • WEB — tarayıcı sağlayıcıya gider, geri sayfanın kendisine döner;
     supabase-js oturumu URL'den okur ve 14-boot'un getSession'ı initApp'i
     çağırır. Burada ELLE initApp YOK.
   • NATIVE (Capacitor) — webview'in kendi adresi yoktur; dönüş özel URL
     şemasıyla (NATIVE_OAUTH_REDIRECT) uygulamaya düşer. Sağlayıcı sayfası
     SİSTEM tarayıcısında açılır (Google gömülü webview'de OAuth'u reddeder:
     "disallowed_useragent"), dönüşteki kodu authHandleOAuthUrl oturuma
     çevirir ve initApp'i KENDİSİ çağırır — çünkü boot'un getSession'ı
     çoktan geçmiştir. */

/* Şema = uygulama kimliği (capacitor.config.json appId). Değiştirilirse
   iOS Info.plist CFBundleURLSchemes + Android manifest intent-filter +
   Supabase Redirect URLs üçü birden döner (SETUP-SOSYAL-KAPILAR.md, ELLE). */
export const NATIVE_OAUTH_REDIRECT = 'com.emretransformation.wanderer://auth-callback';

function _isNativeShell() {
  try { return !!window.Capacitor?.isNativePlatform?.(); } catch (_) { return false; }
}

/* Plugin erişimi 00d deseniyle: ESM import YOK, runtime window.Capacitor —
   plugin kurulu değilse undefined döner ve çağıran sessizce alternatife düşer. */
function _capPlugin(name) {
  try { return window.Capacitor?.Plugins?.[name] || null; } catch (_) { return null; }
}

/* Sağlayıcı sayfasını uygulamanın DIŞINDA aç. Tercih sırası:
   Browser plugin (SFSafariViewController / Chrome Custom Tabs — Google'ın
   kabul ettiği tek gömülü olmayan yol) → window.open → son çare adres. */
async function _openExternal(url) {
  const Browser = _capPlugin('Browser');
  if (Browser?.open) { await Browser.open({ url }); return; }
  try {
    if (window.open(url, '_system') || window.open(url, '_blank')) return;
  } catch (_) {}
  window.location.href = url;
}

export async function doOAuth(provider) {
  _authErr('');
  try {
    const native = _isNativeShell();
    // Dönüş adresi: web'de sorgu/hash artıksız sayfanın kendisi, native'de
    // özel şema. Sağlayıcı konsolunda da bu adres kayıtlı olmalıdır.
    const redirectTo = native
      ? NATIVE_OAUTH_REDIRECT
      : window.location.origin + window.location.pathname;
    const { data, error } = await sb.auth.signInWithOAuth({
      provider,
      options: native ? { redirectTo, skipBrowserRedirect: true } : { redirectTo },
    });
    if (error) { _authErr(trAuthErr(error.message)); return; }
    // Web'de tarayıcı zaten sağlayıcıya gidiyor — buraya dönülmez.
    if (native && data?.url) await _openExternal(data.url);
  } catch (e) {
    _authErr(t('error.network'));
  }
}

/* ─── NATIVE DÖNÜŞ — deep-link'i oturuma çevir ───
   Sağlayıcı bizi özel şemayla geri çağırır. İki biçim gelebilir:
   PKCE akışında ?code=… (varsayılan), örtük akışta #access_token=…
   Kod dışarı çıkmaz: doğrulayıcı (code verifier) signInWithOAuth
   çağrısında bu webview'in deposuna yazıldı, takas burada yapılır. */
let _handledOAuthUrl = null;

export async function authHandleOAuthUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  // Soğuk açılışta aynı adres hem getLaunchUrl'den hem appUrlOpen'dan
  // gelebilir; kod tek kullanımlıktır, ikinci takas "invalid grant" der.
  if (rawUrl === _handledOAuthUrl) return false;
  let u;
  try { u = new URL(rawUrl); } catch (_) { return false; }
  const q    = u.searchParams;
  const hash = new URLSearchParams((u.hash || '').replace(/^#/, ''));

  const code    = q.get('code');
  const access  = hash.get('access_token');
  const refresh = hash.get('refresh_token');
  const errDesc = q.get('error_description') || hash.get('error_description')
               || q.get('error') || hash.get('error');

  // Bize ait olmayan bir deep-link (paylaşım, bildirim…) — dokunmadan geç.
  if (!code && !access && !errDesc) return false;
  _handledOAuthUrl = rawUrl;

  // Sağlayıcı sayfası işini bitirdi; in-app tarayıcı açıksa kapansın.
  try { await _capPlugin('Browser')?.close?.(); } catch (_) {}

  if (errDesc) {
    _authErr(trAuthErr(errDesc));
    return false;
  }

  try {
    const { error } = code
      ? await sb.auth.exchangeCodeForSession(code)
      : await sb.auth.setSession({ access_token: access, refresh_token: refresh });
    if (error) { _authErr(trAuthErr(error.message)); return false; }

    // Boot'un getSession'ı çoktan geçti — kapıyı buradan açıyoruz. Taze
    // kullanıcı alınamazsa tanışma kapısı yanlış karar verebileceği için
    // sessizce düşmek yerine hata gösterip eşikte kalırız.
    const { data } = await sb.auth.getUser();
    if (!data?.user) { _authErr(t('error.network')); return false; }
    await initApp(data.user);
    return true;
  } catch (e) {
    _authErr(t('error.network'));
    return false;
  }
}

let _deepLinkWired = false;

/* Dinleyici auth'tan ÖNCE kurulur (14-boot, getSession'dan önce): kullanıcı
   içeri bu kapıdan girecek. Web'de ve App plugin'i yokken tamamen no-op. */
export function authNativeDeepLinkInit() {
  if (_deepLinkWired || !_isNativeShell()) return;
  const App = _capPlugin('App');
  if (!App?.addListener) return;
  _deepLinkWired = true;
  try {
    App.addListener('appUrlOpen', (evt) => { authHandleOAuthUrl(evt?.url); });
    // Uygulama KAPALIYKEN dönülürse olay dinleyiciden önce doğmuş olabilir;
    // açılış adresi de sorulur (mükerrer çağrı _handledOAuthUrl'de elenir).
    App.getLaunchUrl?.().then(r => { if (r?.url) authHandleOAuthUrl(r.url); }).catch(() => {});
  } catch (e) {
    _deepLinkWired = false;
    console.warn('authNativeDeepLinkInit:', e && e.message);
  }
}

function _syncBirthYearMax() {
  try {
    const y = String(new Date().getFullYear());
    document.querySelectorAll('#auth-age-input')
      .forEach(el => { el.max = y; });
  } catch (_) {}
}

/* Açılış töreni tek seferliktir. Kapılar perdenin ardından süzülür
   (auth.css .auth-entering, ~2.3s); ama kullanıcı bir kez kapıya dokunduysa
   tören bitmiştir — panelden geri dönerken kapılar ANINDA gelmeli, yoksa
   her geri dönüşte iki saniyelik bekleme yeniden oynar. Dört yerden çağrılır:
   e-posta kapısı, kapılara dönüş, yaş kapısı ve içeri giriş (initApp). */
function _authEntryDone() {
  try { document.getElementById('auth-screen')?.classList.remove('auth-entering'); } catch (_) {}
  try { window.removeEventListener('resize', _authVeilCenter); } catch (_) {}
}

/* Perdenin doğum yeri: ekranın TAM ORTASI (splash'te portre oradadır).
   Eşikte perde kapılara yer açtığı için yukarıda durur — aradaki farkı
   ölçüp CSS'e veriyoruz, tören perdeyi merkezden yerine süzsün
   (auth.css authVeilSettle). vh ile tahmin edilmez: uzun ekranda kapı
   bloğu büyümediği için perde gereğinden fazla düşerdi. */
function _authVeilCenter() {
  try {
    const screen = document.getElementById('auth-screen');
    if (!screen || !screen.classList.contains('auth-entering')) return;
    const hero = screen.querySelector('.auth-hero');
    if (!hero) return;
    // offsetTop okunur, getBoundingClientRect DEĞİL: tören sürerken perdenin
    // üstünde zaten bir translateY vardır ve rect onu içine katıp ölçümü
    // kendi kaymasıyla kirletirdi. offsetTop düzen değeridir, transform'suz.
    const drop = Math.round(window.innerHeight / 2 - (hero.offsetTop + hero.offsetHeight / 2));
    // Küçük ekranda perde zaten merkezin altındadır — yukarı itilmez.
    screen.style.setProperty('--auth-veil-drop', (drop > 8 ? drop : 0) + 'px');
  } catch (_) {}
}

/* Saf görsel iş, auth'tan önce çalışır (§ çift boot ayrımı): perde ekranda
   olduğu anda ölçülür. Ölçüm idempotenttir ve üç kez tazelenir — yazı
   tipleri geç yüklenirse satır yüksekliği değişir (fonts.ready), ekran
   dönerse ya da mobil adres çubuğu daralırsa merkez kayar (resize). Bayat
   ölçüm perdeyi merkezin dışında doğurur; dinleyici tören biter bitmez
   kalkar (_authEntryDone). */
(function _authVeilBoot() {
  if (typeof document === 'undefined') return;
  const run = () => {
    requestAnimationFrame(_authVeilCenter);
    try { document.fonts?.ready?.then(() => _authVeilCenter()); } catch (_) {}
    try { window.addEventListener('resize', _authVeilCenter); } catch (_) {}
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();

/* Eşiğe dönüş — bir kapı SEÇİM ekranına değil, ADRES paneline dönülür.
   Seçim ekranı 2026-08-27'de söküldü: seçtiren bir ekran kullanıcıyı boş yere
   bir adım uzatıyordu. Ad ("eşiğe dön") bu yüzden hedefi değil işlevi anlatır.
   2026-08-28'de Google ve Apple kestirmeleri geri geldi ve adres panelinin
   İÇİNDE duruyor — yani bu fonksiyon onları da geri getirir, ayrı bir kod
   gerekmez. Tanışma iptali ve 13-yaş kapısı buraya düşer. */
export function authEsigeDon() {
  const adresP    = document.getElementById('auth-adres');
  const kodP      = document.getElementById('auth-kod');
  const tanismaEl = document.getElementById('auth-tanisma');
  _authEntryDone();
  _kodSayacDur();
  _adres = null;
  // Şüphe onayı da eşikte kalır: eşiğe dönüp aynı yazım hatasıyla geri gelen
  // kullanıcıya yeniden sorulmalı — onay bir tura aittir, oturuma değil.
  _sorulanAdres = null;
  if (kodP)      kodP.style.display      = 'none';
  if (tanismaEl) tanismaEl.style.display = 'none';
  if (adresP)    adresP.style.display    = 'block';
  const errEl = document.getElementById('auth-error');
  if (errEl) { errEl.style.color = ''; errEl.textContent = ''; }
}

/* ═══════════════════════════════════════════════════════
   TANIŞMA · kimlik değil adres sorulur — kapı zaten açıldı
   ───────────────────────────────────────────────────────
   FELSEFE (Emre):
     Kapı "kim olduğunu ispatla" der, tanışma "sana nasıl sesleneyim" der —
     Wanderer'ın tezi gereği ikincisi daha önemlidir: Mesele Sensin.
   MEKANİK: _needsAgeGate'in YERİNE geçer (ikiz motor yok, işlev genişledi).
     Koşul artık iki alanlıdır: profilde username yok VEYA beyan edilmiş yaş
     yok. Eskiden yalnız OAuth kullanıcısını durduran kapı şimdi HERKESİ
     durdurur — çünkü username auth.users'ta değil profiles'ta yaşar ve hiç
     bir giriş yolu onu kendiliğinden getirmez.
   Kalıcılık: profiles.username · profiles.email · user_metadata.full_name/
     birth_year/is_minor · profiles.bulten_izin_surum (K4 rızanın kökeni).
   ═══════════════════════════════════════════════════════ */
let _tanismaUser = null;

export function _tanismaGerekli(user, prof) {
  if (!user) return false;
  return !prof?.username || !user?.user_metadata?.birth_year;
}

// export: test seamı — panelin GERÇEKTEN nasıl açıldığını (initApp'in
// çağırdığı yol) taklit etmeden authTanismaGonder'ı sınamanın yolu yok,
// çünkü gönderim _tanismaUser'a (bu fonksiyonun yazdığı modül state'i) bağlıdır.
export function _showTanisma(user) {
  _tanismaUser = user;
  // Kapıdan gelen kullanıcı perdeyi zaten gördü — tanışma töreni beklemeden
  // açılır (yaş kapısıyla aynı mekanik).
  _authEntryDone();
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-screen').style.display  = 'none';
  const adresP    = document.getElementById('auth-adres');
  const kodP      = document.getElementById('auth-kod');
  const tanismaEl = document.getElementById('auth-tanisma');
  if (adresP) adresP.style.display = 'none';
  if (kodP)   kodP.style.display   = 'none';
  if (tanismaEl) tanismaEl.style.display = 'block';
  _syncBirthYearMax();
  _adSonKontrol = { ad: null, uygun: null };
  try {
    if (window.matchMedia?.('(pointer: fine)').matches) document.getElementById('auth-tanisma-ad')?.focus();
  } catch (_) {}
}

/* Tanışmadan beyan vermeden çıkış. Kapı tek yönlü olamaz: kod kapısından
   geçerken zaten açılan oturum burada kapatılır — aksi hâlde sayfayı
   yenileyen kullanıcı initApp'in kapısına yeniden düşer ve eşikte kilitlenir. */
export async function authTanismaIptal() {
  _tanismaUser = null;
  clearTimeout(_adMusaitTimer);
  try { await sb.auth.signOut(); } catch (_) {}
  authEsigeDon();
}

/* ─── Kullanıcı adı müsaitliği — canlı, ama yalnız erken uyarı ───
   Gerçek kapı sunucudaki UNIQUE indekstir (047, lower(username)); bu RPC
   yazarken geri bildirim verir, ENGELLEMEZ. Ağ hatasında sessizce düşer —
   kullanıcıyı bir ağ titremesi yüzünden adını yazmaktan alıkoymayız. */
let _adSonKontrol = { ad: null, uygun: null };
let _adMusaitTimer = null;

export async function _authAdMusait(ad) {
  const durum = document.getElementById('auth-tanisma-ad-durum');
  try {
    const { data, error } = await sb.rpc('username_musait', { p_ad: ad });
    if (error) return;
    _adSonKontrol = { ad, uygun: data === true };
    if (!durum) return;
    if (_adSonKontrol.uygun) {
      durum.style.color = 'var(--gold)';
      durum.textContent = t('auth.tanisma.ad_uygun', 'Bu ad uygun.');
    } else {
      durum.style.color = '';
      durum.textContent = t('auth.tanisma.ad_alinmis', 'Bu ad alınmış.');
    }
  } catch (_) {}
}

/* Yazım olayı — 400ms debounce. Her tuşta RPC çağırmak sunucuyu gereksiz
   yorar; kullanıcı yazmayı bitirdiğinde tek çağrı yeter. */
export function authTanismaAdInput(el) {
  const ad = (el?.value || '').trim();
  clearTimeout(_adMusaitTimer);
  _adSonKontrol = { ad: null, uygun: null };
  const durum = document.getElementById('auth-tanisma-ad-durum');
  if (durum) { durum.textContent = ''; durum.style.color = ''; }
  if (ad.length < 2) return;
  _adMusaitTimer = setTimeout(() => { _authAdMusait(ad); }, 400);
}

export async function authTanismaGonder() {
  const errEl = document.getElementById('auth-error');
  if (errEl) { errEl.style.color = ''; errEl.textContent = ''; }
  const ad  = (document.getElementById('auth-tanisma-ad')?.value || '').trim();
  const raw = document.getElementById('auth-age-input')?.value.trim() || '';
  const birthYear = parseInt(raw, 10);
  const age = new Date().getFullYear() - birthYear;

  if (ad.length < 2) {
    if (errEl) errEl.textContent = t('auth.tanisma.ad_gerekli', 'Sana nasıl sesleneyim?');
    return;
  }
  if (!Number.isFinite(birthYear) || birthYear < 1900 || age < 0 || age > 120) {
    if (errEl) errEl.textContent = t('auth.error.bad_year', 'Geçerli bir doğum yılı gir.');
    return;
  }
  if (age < 13) {
    // Kapı kapanır: açılan oturum da kapanır, hesap içeri alınmaz.
    try { await sb.auth.signOut(); } catch (_) {}
    _tanismaUser = null;
    authEsigeDon();
    if (errEl) errEl.textContent = t('auth.error.underage', 'Wanderer 13 yaşından küçükler için uygun değil. Seni büyürken görmek dileğiyle — kapı sana açık olacak.');
    return;
  }
  // Son bilinen canlı kontrol bu ad için "alınmış" diyorsa yeniden denemeden
  // önce durdur — sunucu zaten reddedecek (23505), ama kullanıcıyı bildiği
  // hâlde bir ağ turuna zorlamanın anlamı yok.
  if (_adSonKontrol.ad === ad && _adSonKontrol.uygun === false) {
    if (errEl) errEl.textContent = t('auth.tanisma.ad_alinmis', 'Bu ad alınmış.');
    return;
  }

  const isMinor = age < 18;
  const btn = document.getElementById('auth-tanisma-btn');
  if (btn) { btn.disabled = true; btn.textContent = '...'; }
  try {
    // K2: full_name YAZILDIĞI GİBİ username'in aynısı — beş mevcut tüketici
    // (00-config-tracking, 10-features-w2, 02c-portre, 10D, 13d-mektup) tek
    // satır değişmeden dil-duyarlı selamı böyle alır.
    const { error: metaErr } = await sb.auth.updateUser({
      data: { full_name: ad, birth_year: birthYear, is_minor: isMinor },
    });
    if (metaErr) {
      if (btn) { btn.disabled = false; btn.textContent = t('auth.age.btn', 'Eşiği geç'); }
      if (errEl) errEl.textContent = trAuthErr(metaErr.message);
      return;
    }
    // K3: e-posta profiles'a yazılır, auth.users'a DEĞİL — updateUser({email})
    // Supabase'in doğrulama akışını tetikler ve ikinci bir kimlik kapısı
    // açardı. Adres zaten oturumun kendisi (kod kapısı onu doğruladı).
    const { error: profErr } = await sb.from('profiles')
      .update({ username: ad, email: _tanismaUser?.email || null, bulten_izin_surum: HK_VERSION })
      .eq('id', _tanismaUser.id);
    if (profErr) {
      if (btn) { btn.disabled = false; btn.textContent = t('auth.age.btn', 'Eşiği geç'); }
      // 23505 = UNIQUE ihlali (lower(username)) — canlı kontrol kaçırmış
      // olabilir (ırk koşulu), sunucu son sözü söyler. Sahte başarı yok:
      // panel KAPANMAZ, gerçek hata gösterilir (Anayasa §6.2).
      if (errEl) {
        errEl.textContent = profErr.code === '23505'
          ? t('auth.tanisma.ad_alinmis', 'Bu ad alınmış.')
          : trAuthErr(profErr.message);
      }
      return;
    }
    // Taze metadata ile devam et — initApp'in kapısı artık açılır. getUser
    // boş dönerse elimizdeki kullanıcıya beyanı ELLE işleriz: ham nesneyle
    // dönersek _tanismaGerekli yine "ad yok" der ve kapı kullanıcıyı içeri
    // almadan aynı forma geri gönderir (kilitlenme).
    const { data } = await sb.auth.getUser();
    const user = data?.user || (_tanismaUser && {
      ..._tanismaUser,
      user_metadata: { ...(_tanismaUser.user_metadata || {}), full_name: ad, birth_year: birthYear, is_minor: isMinor },
    });
    _tanismaUser = null;
    const tanismaEl = document.getElementById('auth-tanisma');
    if (tanismaEl) tanismaEl.style.display = 'none';
    if (btn) { btn.disabled = false; btn.textContent = t('auth.age.btn', 'Eşiği geç'); }
    await initApp(user);
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = t('auth.age.btn', 'Eşiği geç'); }
    if (errEl) errEl.textContent = t('error.network');
  }
}

/* ── Premium/Max kapısı: requirePremium & requirePremiumPlus SÖKÜLDÜ ──
   (2026-08-17) İkisi de yazıldıkları günden beri 0 çağıranlıydı ve window'a
   hiç asılmamıştı — `types/*.d.ts` onları `window.*` diye beyan ederken
   gerçekte erişilemezlerdi. Rolleri zaten devralınmıştı: Premium kapısı
   `showPremiumFeatureSpotlight` (aşağıda), Max kapısı Derin Çalışma'nın
   `dcGuardWork`'ü (13A) ve sunucu teyitli `_isPrem` (13m). Ya-hep-ya-hiç
   davranışları (sessizce `switchView('sub')`) önizleme+tat modeline de
   aykırıydı. Yeni kapı yazarken bu ikisi diriltilmez; spotlight kaydı açılır. */

/* ── Premium Özellik Tanımları ── */
const PREMIUM_FEATURES = {
  profile: {
    eyebrow: 'Kişisel Profil',
    title: 'Emre Beni Tanıyor',
    desc: 'Konuşmalarından çıkardığım profil — temel inançların, tekrarlayan kalıpların, kör noktaların. Ne kadar çok konuşursak, o kadar derinleşir. Seanslar arası hafıza.',
    icon: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`
  },
  'quick-ask': {
    eyebrow: 'Anlık Sorgu',
    title: 'Emre\'ye Sor',
    desc: 'Sohbet geçmişi olmadan, doğrudan sormak istediğin şeyi sor. Anlık yüzleşme — tek soru, tek cevap.',
    icon: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l2 2"/></svg>`
  },
  library: {
    eyebrow: 'Kişisel Kitaplık',
    title: 'Emre\'nin Kitaplığı',
    desc: 'Konuşmalarına göre kişiselleştirilmiş kitap, yazı ve içerik önerileri. Genel tavsiye değil — sana özel.',
    icon: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M4 6h2v14H4V6zm4 0h2v14H8V6zm5-2l8 2-4 13-8-2 4-13z"/></svg>`
  },
  notebook: {
    eyebrow: 'Notlar',
    title: 'Not Defteri',
    desc: 'Anlık düşüncelerini, farkındalıklarını ve sesli notlarını kaydet. Seanslar arası hafıza — önemli olan kaybolmaz.',
    icon: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>`
  },
  yolculuk: {
    eyebrow: 'Yolculuk Haritası',
    title: 'Ayna → Tasarım → Geçiş',
    desc: 'Hangi aşamadasın — Ayna mı, Tasarım mı, Geçiş mi? Her aşama ne gerektiriyor, nerede takıldın, sıradaki adım ne — görsel olarak.',
    icon: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M3 17l6-6 4 4 8-11"/><path d="M14 5h7v7"/></svg>`
  },
  'hayattaki-sen': {
    eyebrow: 'Kimlik Profili',
    title: 'Hayattaki Sen',
    desc: 'Bu hafta ve bu ay fiilen nasıl bir kişi olduğunu gösterir: düşüncelerin, inançların, hislerin ve davranışlarınla. Olmak istediğin kişiyle aradaki farkı söyler ve geçiş için yeni bir kart önerir.',
    icon: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21"/></svg>`
  },
  roadmap: {
    eyebrow: 'Kişisel Yol Haritası',
    title: 'Yol Haritası',
    desc: 'Olmak istediğin kişiye giden spesifik adımlar. Genel tavsiye değil — konuşmalarından çıkan sana özel adımlar.',
    icon: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z"/></svg>`
  },
  challenge: {
    eyebrow: '21 Günlük Program',
    title: 'Challenge',
    desc: '21 günlük kişi değişim meydan okuması. Her gün bir adım, her adım bir seçim. O kişinin alışkanlıklarını sistematik olarak inşa et.',
    icon: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M7 4v2H3v6c0 2.5 2 4.5 4.5 4.5h.5v2H6v2h12v-2h-2v-2h.5c2.5 0 4.5-2 4.5-4.5V6h-4V4H7z"/></svg>`
  },
  manifesto: {
    eyebrow: 'Kişisel Beyanname',
    title: 'Manifestom',
    desc: 'Kim olduğunu, neye inandığını, nereye gittiğini yaz. Olmak istediğin kişinin beyannamesi — her gün okunacak kadar güçlü.',
    icon: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>`
  },
  oruntu: {
    eyebrow: 'Örüntü Motoru',
    title: 'Örüntü Aynası',
    desc: 'Haftalık konuşmalarından tekrarlayan örüntüleri damıtır: kendi sözlerinle kanıt, kitabın çerçevesiyle teşhis, uygulamadaki gerçek bir ritüele giden yol.',
    icon: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><ellipse cx="12" cy="12" rx="9" ry="6"/><circle cx="12" cy="12" r="2.4"/></svg>`
  },
  // Derin Çalışma (13A) — Max katmanı. `tier:'max'` rozeti ve CTA'yı Max
  // diline çevirir (aşağıda showPremiumFeatureSpotlight); kayıt OLMADAN
  // kilit sessiz bir paywall'a düşerdi.
  'derin-calisma': {
    tier: 'max',
    eyebrow: 'Derin Çalışma',
    title: 'Tezgâh',
    desc: 'Kitabın kavramları burada okunmaz, çalışılır: Standart · Hak Etmek · Normal · Layık ve Öz Sevgi · Saygı · Değer · Güven · Bolluk. Her kavramın kendi Çalışma Kağıdı var — sor, hayal et, olumlamayı kendi sesinden dinle, o kişinin davranışını güne taşı.',
    icon: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M3 17h18"/><path d="M6 17v-6M18 17v-6"/><circle cx="12" cy="9" r="4"/><path d="M12 5v8"/></svg>`
  },
  // Ayna Anı (09h) — ücretsiz teaser'ın "Aynaya Bak" düğmesi buraya iner.
  // Kayıt yoksa showPremiumFeatureSpotlight sessizce switchView('sub')'a düşer:
  // kullanıcı ne teklif edildiğini hiç görmeden paywall'a çarpar.
  ayna: {
    eyebrow: 'Ayna Protokolü',
    title: 'Ayna Anı',
    desc: 'Emre senin hakkında bir şey fark ettiğinde onu iddia olarak değil, soru olarak getirir: kanıtıyla birlikte. "Bu benim" dersen portrene mühürlenir, "bu ben değilim" dersen aynayı yeniden tutar.',
    icon: `<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 4v16"/><path d="M7.5 9.5Q12 6.6 16.5 9.5M7.5 14.5Q12 17.4 16.5 14.5"/></svg>`
  }
};

/* ── Premium Özellik Spotlight Modal'ı Göster ── */
export function showPremiumFeatureSpotlight(featureKey) {
  const feature = PREMIUM_FEATURES[featureKey];
  if (!feature) { switchView('sub'); return; }

  const overlay = document.getElementById('premium-spotlight-overlay');
  if (!overlay) { switchView('sub'); return; }

  // İçeriği doldur — eyebrow/title/desc dile-duyarlı (const TR fallback)
  document.getElementById('pso-icon').innerHTML   = feature.icon;
  // data-i18n de yazılır: kart içeriği JS'ten geldiği için statik markup'ta
  // anahtar yok; dil değişiminde re-apply bu üçünü atlar ve modal karışık
  // dilde kalırdı (rozet/CTA çevrilir, başlık/açıklama eski dilde donar).
  for (const [id, alan] of [['pso-eyebrow', 'eyebrow'], ['pso-title', 'title'], ['pso-desc', 'desc']]) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.setAttribute('data-i18n', 'premium.' + featureKey + '.' + alan);
    el.textContent = t('premium.' + featureKey + '.' + alan, feature[alan]);
  }

  // Max katmanı Pro'dan ayrı konuşur. data-i18n anahtarını da değiştiriyoruz:
  // yalnız textContent yazsaydık dil değişiminde i18n re-apply eski Pro
  // metnini geri yazardı (bilinen clobber tuzağı).
  const isMax  = feature.tier === 'max';
  const badge  = overlay.querySelector('.pso-premium-badge');
  const cta    = overlay.querySelector('.pso-cta');
  if (badge) {
    badge.setAttribute('data-i18n', isMax ? 'premium.badge_max' : 'premium.badge');
    badge.textContent = isMax
      ? t('premium.badge_max', '✦ Max Özelliği')
      : t('premium.badge', '✦ Premium Özelliği');
  }
  if (cta) {
    cta.setAttribute('data-i18n', isMax ? 'premium.cta_max' : 'premium.cta');
    cta.textContent = isMax
      ? t('premium.cta_max', "Max'e Geç →")
      : t('premium.cta', "Premium'a Geç →");
  }

  overlay.classList.add('open');
}

export function closePremiumSpotlight() {
  document.getElementById('premium-spotlight-overlay')?.classList.remove('open');
}

/* ── Drawer Premium Kilitleme — Auth sonrası çağrılır ── */
export function initDrawerPremiumGates() {
  // Tüm premium-gerekli drawer öğelerini kilitle/aç
  const items = document.querySelectorAll('.w2-drawer-item[data-premium-key]');
  items.forEach(btn => {
    if (!S.isPremium) {
      btn.classList.add('w2-drawer-item--locked');
    } else {
      btn.classList.remove('w2-drawer-item--locked');
    }
  });

  // Ücretsiz tier banner — premium değilse göster
  const banner = document.getElementById('w2-drawer-free-banner');
  if (banner) {
    if (!S.isPremium) banner.classList.add('visible');
    else              banner.classList.remove('visible');
  }
}

export async function doLogout() {
  // Diğer açık sekmelere logout sinyali gönder
  try {
    const _ch = new BroadcastChannel('etw-auth');
    _ch.postMessage({ type: 'logout' });
    _ch.close();
  } catch (_) {}

  // Tüm interval ve timer'ları temizle
  if (S._pollingInterval) clearInterval(S._pollingInterval);
  if (S._gcSilenceTimer) clearTimeout(S._gcSilenceTimer);
  // Avatar cache'ini temizle
  if (S.currentUser) {
    SafeStorage.remove(STORAGE_KEYS.AVATAR(S.currentUser.id));
  }
  try { await sb.auth.signOut(); } catch (_) {}
  window.location.reload();
}

/* ── AÇILIŞ PERDESİ — üç kademeli karşılama (cihaz-yerel, hesap ayrımı uid ile) ──
   Kat 0: aynı tarayıcı oturumu içinde tekrar boot → perde YOK.
   Kat 1: bugün bu cihazdaki ilk giriş (localISODate) → tam 4 sn.
   Kat 2: bugün aynı cihazdan tekrar giriş → kısa 2 sn nefes (.brief).
   Anahtarlar SafeStorage'a DEĞİL ham storage'a yazılır — bu CİHAZIN deneyimidir;
   aynı gün başka bir cihazdan giren kullanıcı orada da tam karşılamayı hak eder. */
export function _splashPlan(uid) {
  // Oturum bayrağı da HESABA bağlıdır: hesap değişimi signOut→reload ile olur
  // ama sessionStorage reload'ı aşar — uid'siz anahtarla yeni hesap kendi
  // karşılamasını hiç görmezdi ("hesap ayrımı uid ile" sözü kat 1/2'de
  // tutulup kat 0'da tutulmuyordu).
  const sessKey = `etw_splash_session_${uid}`;
  let sessionSeen = false;
  try { sessionSeen = !!sessionStorage.getItem(sessKey); } catch (_) {}
  try { sessionStorage.setItem(sessKey, '1'); } catch (_) {}
  if (sessionSeen) return { ms: 0, brief: false };

  const dayKey = `etw_splash_day_${uid}`;
  let today = '', lastDay = '';
  try { today = localISODate(); } catch (_) {}
  try { lastDay = localStorage.getItem(dayKey) || ''; } catch (_) {}
  try { localStorage.setItem(dayKey, today); } catch (_) {}

  return (lastDay === today) ? { ms: 2000, brief: true } : { ms: 4000, brief: false };
}

// Kapanış üç yoldan tetiklenebilir (timer · dokunuş · tuş) — guard olmadan
// `.closing` iki kez eklenip cascade iki kez oynar.
let _splashTimer = null;
let _splashClosed = false;
let _splashSkipHandler = null;
// Eşiğin nabzı (İç Çalışma 06 · K2/K3): gösterim anı + kat burada taşınır —
// olay NİYETİN doğduğu yerde değil kapanışta yazılır, motor bu ana dek
// çoktan açık olur. 'kat1' = tam perde (4000ms, günün ilk girişi), 'kat2' =
// kısa nefes (2000ms, brief — aynı gün tekrar giriş); adlandırma testteki
// "Kat 1/Kat 2" terminolojisiyle birebir (tests/03-auth-shell.test.js).
let _splashShownAt = 0;
let _splashKat = null;
/** Test seamı (_splashPlan/_closeSplash'ın aynısı): initApp'in ağ/DOM
 *  zincirini kurmadan perdeyi "gösterildi" durumuna sokar — modül state'i
 *  dışarıdan başka türlü set edilemez. Üretim akışında ÇAĞRILMAZ. */
export function _markSplashShown(kat) {
  _splashShownAt = Date.now();
  _splashKat = kat;
}
export function _closeSplash(splashEl, atlandi = false) {
  if (_splashClosed) return;
  _splashClosed = true;
  bnMark('perde-in');
  clearTimeout(_splashTimer);
  if (_splashSkipHandler) {
    document.removeEventListener('keydown', _splashSkipHandler);
    splashEl?.removeEventListener('pointerdown', _splashSkipHandler);
    _splashSkipHandler = null;
  }
  // Damgayı teslim eden basar (§6.10): süre GERÇEKTEN izlenen süredir
  // (_splashShownAt farkı), planlanan ms değeri uydurulmaz. _splashShownAt
  // yalnız perde gerçekten gösterildiyse kurulur (kat 0'da hiç) — guard tek
  // başına "olmayan perde ölçülmez" kuralını korur.
  if (_splashShownAt) {
    try {
      window.wtLogEsik?.('perde', {
        dal: _splashKat,
        sureMs: Date.now() - _splashShownAt,
        atlandi: atlandi ? 1 : 0,
      });
    } catch (_) {}
  }
  if (!splashEl) return;
  splashEl.classList.add('closing');
  // Perde inerken ana ekranı (Wanderer LLM) kademeli süzdür — cascade splash
  // ardında boşa akmasın diye boot boyunca .casc bekletilmişti (10y).
  try { window.llmHomeCascade?.(); } catch (_) {}
  setTimeout(() => {
    splashEl.classList.remove('show', 'closing', 'brief');
    try { window.llmFocusComposer?.(); } catch (_) {}
  }, 720);
}

/* ═══ INIT ═══ */
export async function initApp(user) {
  // Tanışma kapısı: profilde ad yoksa bu ilk geliştir. Karar `profiles`
  // satırına bakmayı gerektirir — bu yüzden sorgu burada öne alınır ve
  // aşağıdaki durum hidrasyonu SONUCU İKİNCİ KEZ SORMAZ, aynı yanıtı
  // yeniden kullanır (admin sayfası kapıyı atladığı için orada ayrı sorar).
  // ── PARALELLİK SÖZLEŞMESİ (kapı: tests/boot-nabzi.test.js) ──
  // Profil sorgusu ÖNCE tanımlanır, storage hemen ardından: ikisi birlikte
  // koşar. Bu tesadüf değil ölçülmüş bir karardır — [[boot-nabzi]]: darboğaz
  // bundle değil SIRALI AĞ TURLARIYDI, zincir 1331→905 ms. Tanışma kapısı
  // profili beklemek zorunda ama storage'ı beklemek zorunda değil, o yüzden
  // sıra değil YALNIZ BEKLEME NOKTASI eklenir.
  // Reddi burada yutulur, yoksa await'e varana dek "unhandled rejection".
  const profilSoz = bnSar('profil-sorgu', () =>
    sb.from('profiles').select('*').eq('id', user.id).maybeSingle()
  ).catch(() => ({ data: null }));
  const storageSoz = bnSar('storage', () => storageInit(sb, user.id));

  // Tanışma kapısı: profilde ad yoksa bu ilk geliştir (K1 — "yeni misin?"
  // sorusunu kullanıcı değil uygulama cevaplar). Admin sayfası kapıyı atlar.
  if (!IS_ADMIN_PAGE) {
    const { data: _profTan } = await profilSoz;
    if (_tanismaGerekli(user, _profTan)) {
      // Kapı kapanıyor ama storage yolda: yarım bırakılırsa tanışma bitince
      // gelen İKİNCİ initApp turu ikinci bir storageInit başlatır ve ikisi
      // SafeStorage'ın kuyruk flush kilidinde yarışır
      // ([[safestorage-kuyruk-flush-kilidi]] — eşzamanlı flush kuyruğu iki
      // kez tüketiyordu). Bitmesini bekleyip öyle dönüyoruz.
      try { await storageSoz; } catch (_) {}
      _showTanisma(user);
      return;
    }
  }
  bnMark('auth-cozuldu');
  S.currentUser = user;
  // Reşit-olmayan modu (Emniyet Katmanı · Faz 3): kayıtta beyan edilen yaş.
  // Eski hesaplarda metadata yok → yetişkin varsayılır (yeni kayıtlar kapıdan geçer).
  S._isMinor = !!user?.user_metadata?.is_minor;
  const emailIsAdmin = user.email === ADMIN_EMAIL;

  // Sonuç storageInit'ten SONRA işlenir (avatar yazımı hidre cache'e dokunur).
  // Kapının okuduğu profil İKİNCİ KEZ SORULMAZ: profilSoz tek bir Promise'tir,
  // ikinci await aynı yanıtı verir.
  await storageSoz;

  // Eşik kapandı: açılış töreninin ölçüm dinleyicisi de burada bırakılır,
  // yoksa içeri giren kullanıcıda her pencere boyu değişiminde boşa çalışır.
  _authEntryDone();
  // Kod panelinin geri sayımı eşikte kaldı: içeri girildiğinde her saniye
  // boşa çalışan bir interval bırakmayız.
  _kodSayacDur();
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display  = 'flex';

  // Açılış ekranı — giriş yapmış kullanıcıyı karşılar (kademe: bkz _splashPlan);
  // boot yüklemeleri bu perdenin arkasında biter. Günlük ritüel/mühür
  // orkestratörleri (10s/10t) perde inene dek kendini erteler.
  if (!IS_ADMIN_PAGE) {
    const _splash = document.getElementById('wn-splash');
    if (_splash) {
      const _plan = _splashPlan(user.id);
      if (_plan.ms <= 0) {
        // Kat 0: aynı oturumda tekrar boot — perde hiç görünmez. Cascade'in
        // normal tetiği (perde kapanışı) hiç olmadığından elle çağrılır —
        // yoksa ana ekran cansız/animasyonsuz açılır. 0.04 = 10y'nin
        // CASC_NOW temposu (perdesiz gezinme: neredeyse anında). Bu çağrı
        // kademelenmeyi BAŞLATMAZ, yalnız "perde tarafı hazır" der: 10y onu
        // içerik kapısıyla birlikte tek dalgada oynatır (2026-08-19; perdesiz
        // katta ekran iki kez süzülüyordu). Composer
        // odağı BURADA tetiklenmez — switchView('chat') henüz çalışmadı;
        // aşağıda switchView bloğunun ardından _splashClosed kontrolüyle yapılır.
        _splashClosed = true;
        // Perde bu katta hiç görünmez; nabız için açılış ve iniş aynı andır.
        bnMark('perde-ac'); bnMark('perde-in');
        try { window.llmHomeCascade?.(0.04); } catch (_) {}
      } else {
        _splash.classList.toggle('brief', _plan.brief);
        _splash.classList.remove('closing');
        _splash.classList.add('show');
        bnMark('perde-ac');
        // Eşiğin nabzı: gösterim anı + kat burada mühürlenir (kapanışta
        // gerçek süre bunun farkından çıkar).
        _splashShownAt = Date.now();
        _splashKat = _plan.brief ? 'kat2' : 'kat1';
        // Yerin ilk nefesi — oturum-geri-yükleme yolunda kullanıcı hareketi
        // olmadığından autoplay kilidi kapalıdır, cue sessizce düşer (13e
        // felsefesi: asla bloklama); login-tık yolunda duyulur.
        try { window.fxCue?.('breath'); } catch (_) {}
        _splashSkipHandler = () => _closeSplash(_splash, true);
        _splash.addEventListener('pointerdown', _splashSkipHandler);
        document.addEventListener('keydown', _splashSkipHandler);
        _splashTimer = setTimeout(() => _closeSplash(_splash), _plan.ms);
      }
    }
  }

  // K8: e-posta parçası zincirden ÇIKTI — adres bir kimliktir, ad değil.
  // full_name tanışmada username'in AYNISI yazılır (K2), yani bu ikisi
  // pratikte hep eşittir; ayrı bir username okuması burada GEREKMEZ (profil
  // henüz çözülmediyse full_name zaten yeterlidir).
  const nameParts = (user.user_metadata?.full_name || t('auth.tanisma.gezgin', 'Gezgin')).split(' ');
  document.getElementById('ob-name').textContent =
    nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1);

  S.USER_IMG = `https://ui-avatars.com/api/?name=${encodeURIComponent(nameParts[0])}&background=141414&color=B8953C`;

  // Hızlı avatar — cache'den göster
  const cached = SafeStorage.getRaw(STORAGE_KEYS.AVATAR(user.id));
  if (cached) {
    S.USER_IMG = cached;
    const prev = document.getElementById('settings-avatar-preview');
    if (prev) prev.src = S.USER_IMG;
  }

  const { data: prof } = await profilSoz;
  if (prof) {
    // Tanışma bu ikisini yazdı (ya da eski bir kod-kapısı öncesi hesap zaten
    // taşıyordu) — burada yalnız OKUNUR, karar mercii tanışma paneliydi.
    S.username   = prof.username || null;
    S.bultenIzin = prof.bulten_izin === true;
    S.isAdmin        = emailIsAdmin || (prof.is_admin === true);
    // Wanderer Studio modeli: gerçek abonelik (mağaza/webhook) ayrı,
    // 30 günlük deneme ayrı izlenir — ikisi de premium kapılarını açar.
    S.isStudioSub    = prof.is_premium === true;
    S.trialEndsAt    = prof.trial_ends_at || null;
    S.storePlatform  = prof.store_platform || null;
    S.isTrial        = !S.isStudioSub && !!S.trialEndsAt && new Date(S.trialEndsAt) > new Date();
    S.isPremium      = S.isStudioSub || S.isTrial || S.isAdmin;
    S.isPremiumPlus  = (prof.is_premium_plus === true) || S.isAdmin;
    S.messageCount   = prof.message_count || 0;
    // Fiyatlandırma v2 — yolcu durum makinesi (migration 030_fiyatlandirma_v2)
    S.offerADeadline     = prof.offer_a_deadline || null;
    S.hasUsedOfferA      = prof.has_used_offer_a === true;
    S.hasUsedOfferB      = prof.has_used_offer_b === true;
    S.hasCancelledBefore = prof.has_cancelled_before === true;
    S.lapsedAt           = prof.lapsed_at || null;
    if (prof.avatar) {
      S.USER_IMG = prof.avatar;
      SafeStorage.setRaw(STORAGE_KEYS.AVATAR(user.id), prof.avatar);
      const prev = document.getElementById('settings-avatar-preview');
      if (prev) prev.src = S.USER_IMG;
    }
  } else {
    S.username   = null;
    S.bultenIzin = false;
    S.isAdmin = emailIsAdmin;
    // v2: yeni hesap FREE başlar — Kapı A (1₺) ya da Kapı B (7 gün) kendi
    // seçimiyle açılır, otomatik deneme YOK. Ayrıcalıklı alanlar (offer_a_deadline
    // dahil) migration 030'un INSERT trigger'ı tarafından tamper-proof yazılır;
    // client'ın insert'e yazdığı değerler trigger varsa zaten ezilir. Migration
    // henüz uygulanmadıysa eski (017) trigger devrede kalır — bu durumda da
    // hiçbir şey kırılmaz, yalnız bu oturumun yerel tahmini bir sonraki
    // girişte gerçek profille eşitlenir.
    try { await sb.from('profiles').insert([{ id: user.id, is_premium: false, is_premium_plus: false, message_count: 0 }]); } catch (_) {}
    S.isStudioSub = false; S.isPremiumPlus = false; S.messageCount = 0;
    S.trialEndsAt = null;
    S.isTrial = false;
    S.isPremium = false; // v2: yeni hesap FREE
    S.offerADeadline     = new Date(Date.now() + 72 * 3600000).toISOString();
    S.hasUsedOfferA      = false;
    S.hasUsedOfferB      = false;
    S.hasCancelledBefore = false;
    S.lapsedAt           = null;
  }

  // S.isAdmin belirlendikten SONRA settings yükle — admin ise ek veri çekilir
  // ErrorBoundary toast fonksiyonunu bağla
  ErrorBoundary.setToastFn(showToast);

  // İkisi PARALEL: loadKnowledge ne `S.isAdmin`'e ne `S.settings`'e bakar
  // (yalnız `knowledge_base` çeker + kendi listesini çizer), yani
  // loadSettings'i beklemesi için bir sebep yok. loadSettings'in `S.isAdmin`
  // bağımlılığı korunur — o zaten profil sonucundan SONRA çalışıyor.
  await bnSar('ayarlar-bilgi', () => Promise.all([
    ErrorBoundary.run('loadSettings', loadSettings),
    ErrorBoundary.run('loadKnowledge', loadKnowledge)
  ]));

  /* ── AYRI YÖNETİM SAYFASI (admin.html) ──
     Kullanıcı kabuğu (chat hidrasyonu, ritüel pop-up'ları, push, kart flip…)
     hiç boot edilmez; doğrudan admin görünümüne inilir. Yönetici olmayan
     hesap ana uygulamaya geri gönderilir. */
  if (IS_ADMIN_PAGE) { enterAdminStandalone(); return; }

  if (document.getElementById('menu-admin'))
    document.getElementById('menu-admin').style.display = S.isAdmin ? 'block' : 'none';

  const premIndicator = document.getElementById('premium-indicator');
  if (premIndicator) {
    if (S.isStudioSub || S.isAdmin) {
      premIndicator.style.display = 'none';
    } else {
      // Deneme süresince gün sayacı göster — dönüşüm daveti
      premIndicator.style.display = 'inline-block';
      const days = S.isTrial ? Math.max(1, Math.ceil((new Date(S.trialEndsAt).getTime() - Date.now()) / 86400000)) : 0;
      premIndicator.textContent = days > 0
        ? `✦ ${t('sub.trial_badge', 'Deneme')} · ${days} ${t('sub.days', 'gün')}`
        : '✦ Studio';
    }
  }

  // Mağaza aboneliği (RevenueCat) — yalnız native'de etkin, web'de no-op
  // (08-trends-payment dairesel bağımlılık nedeniyle window üzerinden)
  ErrorBoundary.run('initStoreBilling', () => window.initStoreBilling?.());

  // Drawer premium kilitleme — premium olmayan kullanıcılar için tüm özellikler kilitlenir
  initDrawerPremiumGates();

  /* ═══ PARALEL YÜKLEMELER — Bağımsız veri kaynakları ═══
     Promise.allSettled ile birini beklemeden diğerleri yükler.
     Herhangi birinin hatası diğerlerini engellemez.

     Sohbet geçmişi 2026-08-19'a dek bu bloğun ÖNÜNDE tek başına beklerdi
     ("kritik yükleme, UI için gerekli"). Kritikliği doğru ama sıralılığı
     gereksizdi: blok da await ediliyor, ikisi aynı noktada bitiyor ve
     bloktaki yedi yüklemenin hiçbiri `S.allSessions`'a dokunmuyor
     (denetlendi). Kendi çentiğini koruyor ki ölçüm çözünürlüğü kaybolmasın. */
  const parallelResults = await bnSar('paralel-8', () => Promise.allSettled([
    bnSar('sohbet-gecmisi', () => ErrorBoundary.run('loadChatHistory', loadAllChatHistory)),
    ErrorBoundary.run('loadMoodHistory', loadMoodHistory),
    ErrorBoundary.run('loadSessionPatterns', loadSessionPatterns),
    ErrorBoundary.run('loadSummarizedSessions', () => loadSummarizedSessionIds()),
    ErrorBoundary.run('syncAnalytics', syncAnalyticsFromSupabase),
    ErrorBoundary.run('loadNarrativeMemory', loadNarrativeMemory),
    ErrorBoundary.run('loadUserProfile', loadUserProfile),
    ErrorBoundary.run('loadFeatureVideos', loadFeatureVideos),
  ]));

  // Paralel sonuçlardan hata raporu
  const failures = parallelResults.filter(r => r.status === 'rejected');
  if (failures.length) {
    console.warn(`[initApp] ${failures.length}/${parallelResults.length} paralel görev başarısız`);
  }

  /* ═══ SENKRON YÜKLEMELER — bellek cache'den (hızlı, bloklamaz) ═══ */
  loadSomaticHistory();
  loadPartsHistory();
  loadResistanceLog();
  loadSilenceTopicLog();
  personalizationLoad();
  /* Gönderim kuyruğu (06) — cihazda bekleyen, veritabanına ulaşamamış
     sözleri taşımayı dener. UID'e bağlı olduğu için post-auth; ham
     localStorage kullandığından SafeStorage hidrasyonunu beklemez.
     (Composer taslağı burada DEĞİL — onu 13a-arac-motoru tutuyor.) */
  try { chatKuyrukInit(); } catch (_) {}
  window.porLoad?.();   // Portre — hydrate edilmiş cache'den (auth sonrası)
  bnMark('serpme-bas');
  // Geçiş Kartım (10A) — Portrenin o ana özel uydusu, ws-greet-hero
  // input'unun yeni davranışını besler. Kullanıcıya özel cache'ten okur.
  import('./10A-gecis-karti.js').then(m => { try { m.gkInit(); } catch (_) {} }).catch(() => {});
  // İlham Kartı (10B) — Atölye + Kendi Koleksiyonum (SafeStorage hydrate +
  // Supabase soft sync); 06 streaming finalize kancasını da kendi içinde bağlar.
  import('./10B-ilham-karti.js').then(m => { try { m.ilhamInit(); } catch (_) {} }).catch(() => {});
  // Kişilerin Kişileri (10C) — sosyal feed; view loader'ı window'a açar.
  // Veri çekimi tembel: yalnız switchView('sosyal') çağrıldığında olur.
  import('./10C-sosyal-feed.js').then(m => { try { m.sfInit(); } catch (_) {} }).catch(() => {});

  // Wanderer Oyunu (Ayna/Elmas) + Hayal Alemi — hydrate edilmiş cache'den yükle (auth sonrası).
  // ÖNEMLİ: boot'ta (pre-auth) yüklenirse cache boş olur → state default'a düşer ve
  // ilk kayıtta buluttaki veri ezilir. Bu yüzden burada, storageInit sonrası yüklenir.
  import('./10g-w2-wanderer-game.js').then(m => { try { m.wgInit(); } catch (_) {} }).catch(() => {});
  import('./10i-w2-hayal-alemi.js').then(m => { try { m.haInit(); } catch (_) {} }).catch(() => {});

  // OLMAK İSTEDİĞİN KİŞİ (10D) — Geçiş Alanı'nın (10j, emekli) halefi; 10j KV'sinden
  // tek seferlik göç + desired/affirmation aynasını tazeler.
  import('./10D-olmak-istedigin.js').then(m => { try { m.oikInit(); } catch (_) {} }).catch(() => {});
  // YÜZ ÇİZGİSİ (12g) — iki ana kartın çizimini kullanıcının fotoğrafından
  // ölçer. Post-auth ÇÜNKÜ S.USER_IMG profilden yeni gelmiştir; ölçüm bitince
  // açık yüzeyleri kendisi tazeler (foto/ten kanıtı yoksa sessizce düşer).
  import('./12g-yuz-cizgisi.js').then(m => { try { m.yzInit(); } catch (_) {} }).catch(() => {});
  import('./10k-w2-kendinle-konusma.js').then(m => { try { m.skInit(); } catch (_) {} }).catch(() => {});
  import('./10l-w2-degerlendirme.js').then(m => { try { m.rvInit(); } catch (_) {} }).catch(() => {});
  import('./10n-w2-dinlenme.js').then(m => { try { m.dnInit(); } catch (_) {} }).catch(() => {});
  // His Motoru (13e) — haptik + imza sesleri; pref hidrasyonu (törenlerden önce hazır)
  import('./13e-his-motoru.js').then(m => { try { m.fxInit(); } catch (_) {} }).catch(() => {});
  // Alfabe Işık (12e) — Günün Işığı ambient filigranı + Doku anahtarı hidrasyonu
  import('./12e-isik-nisanlari.js').then(m => { try { m.isikInit(); } catch (_) {} }).catch(() => {});
  // Akşam Kapanış Töreni (13h) — akşam nabzı + yarına niyet hidrasyonu
  import('./13h-aksam-toreni.js').then(m => { try { m.atInit(); } catch (_) {} }).catch(() => {});
  // Wanderer Wrapped (13j) — ayın ilk haftasında geçen ayın filmi daveti
  import('./13j-wrapped.js').then(m => { try { m.wrInit(); } catch (_) {} }).catch(() => {});
  // Widget Köprüsü (13k) — native ana ekran widget'ına veri senkronu
  import('./13k-widget-koprusu.js').then(m => { try { m.wkInit(); } catch (_) {} }).catch(() => {});
  // Cazibe Motoru (10r) — Cialdini etki ilkeleri; state hidrasyonu
  import('./10r-w2-cazibe.js').then(m => { try { m.czInit(); } catch (_) {} }).catch(() => {});
  // İmge Kapısı (13z) — Zaltman'ın kendi-seçilen imgesi; state hidrasyonu (tören FAZ 2)
  import('./13z-imge-kapisi.js').then(m => { try { m.igInit(); } catch (_) {} }).catch(() => {});
  // Söz Defteri (13u) — verilen sözün hafızası. 10s'ten ÖNCE hidrate olmalı:
  // glInit yüklediği kaydı hemen deftere işliyor, defter o an hazır olmalı.
  import('./13u-soz-defteri.js').then(m => { try { m.sdInit(); } catch (_) {} }).catch(() => {});
  // Söz Terzisi (13w) — yarının sözünü gece dokur. 13u'dan SONRA: dokuma
  // isteği söz defterinin tekrar-önleme listesini okur.
  import('./13w-soz-terzisi.js').then(m => { try { m.stInit(); } catch (_) {} }).catch(() => {});
  // Günlük Ritüel (10s) — Armağan + Söz pop-up; state hidrasyonu + elmas barı
  import('./10s-w2-gunluk-ritus.js').then(m => { try { m.glInit(); } catch (_) {} }).catch(() => {});
  // Seri Mührü (10t) — günü mühürleme töreni + kilometre kartları; state hidrasyonu
  import('./10t-w2-seri-muhru.js').then(m => { try { m.smInit(); } catch (_) {} }).catch(() => {});
  // Gün Serisi (13r) — Wanderer LLM'e özel sohbet serisi (Üç Mühür'den bağımsız)
  import('./13r-w2-gun-serisi.js').then(m => { try { m.gsInit(); } catch (_) {} }).catch(() => {});
  // Ultra Seri (10u) — 3 mühür (Seri/Hayal/Söz) split kart + Sohbet çemberi.
  // 10t'den sonra: usInit, smRenderBugunCard'ı devralır (split kart). Hayal/Söz
  // detektörlerini sessizce yakalar; çemberi mount eder + 8 sn döngüyü başlatır.
  import('./10u-w2-ultra-seri.js').then(m => { try { m.usInit(); } catch (_) {} }).catch(() => {});
  // Yol (10f) — Üç Mühür hero yüzeyi (altın ↔ lapis). usInit'ten SONRA:
  // halka durumlarını usSeriesState'ten okur; kutuplar kkInit/imInit
  // hidrasyonundan sonra usRunDaily/loadBugunView tazelemesiyle dolar.
  import('./10f-w2-yol.js').then(m => { try { m.yolInit(); } catch (_) {} }).catch(() => {});
  // Geçiş Yolu (13s) — 21 günlük yolculuk pusulası; yalnız state yükler, DOM'a dokunmaz.
  import('./13s-gecis-yolu.js').then(m => { try { m.gyInit(); } catch (_) {} }).catch(() => {});
  // Derin Çalışma (13A) — kullanıcı-verili: SafeStorage hidrasyonu sonrası.
  import('./13A-derin-calisma.js').then(m => { try { m.dcInit(); } catch (_) {} }).catch(() => {});
  // Dönüşüm Aynası (13t) — 90 günlük Geçiş Belgeseli; yalnız state yükler, DOM'a dokunmaz.
  import('./13t-donusum-aynasi.js').then(m => { try { m.gbInit(); } catch (_) {} }).catch(() => {});
  // Kişi Kartı motoru (10q) — ritüel/kişiselleştirme hidrasyonu yerleştikten sonra başlat.
  // Zincirin tamamı ready-promise'lerle bağımlılık sırasına oturur (zamana değil) —
  // her motor bir öncekinin GERÇEK bitişini bekler, sihirli setTimeout gecikmesi yok.
  const kkReady = bnSar('zincir-kk', () => import('./10q-w2-kisi-karti.js').then(m => m.kkInit())).catch(() => {});
  /* Hatırla (09j) — bağımsız kol, hiçbir motoru beklemez: yalnız SafeStorage'ın
     hidre olmasını (post-auth) bekler. ERKEN olmalı, çünkü kullanıcı sohbete
     girer girmez şerit butonları kendini pinli tanımalı ve ilk tur bağlamına
     mühürlü sözler girmeli. */
  import('./09j-hatirla.js').then(m => m.htInit()).catch(() => {});
  // Hazine Destesi (12f) — kkReady sonrası: bağımsız kol (kimlik zincirine
  // girmez, yalnız deste/koleksiyon hidrasyonundan sonra sidecar'ı doğrular)
  kkReady.then(() => bnSar('zincir-hz', () => import('./12f-hazine-paketleri.js').then(m => m.hzInit()))).catch(() => {});
  // Kimlik Motoru (13l) — kkReady sonrası: koleksiyon hidrasyonu yerleşince
  // kullanıcının hareketlerinden "Olduğu Kişi"yi çözer (taban sessiz alınır)
  const imReady = kkReady.then(() => bnSar('zincir-im', () => import('./13l-kimlik-motoru.js').then(m => m.imInit()))).catch(() => {});
  // Örüntü Motoru (09d) — imReady sonrası: hafta agregasyonu kimlik
  // olay defterini + 10s/10D/09a hidrasyonunu okur; haftalık damıtmayı tetikler
  const omReady = imReady.then(() => bnSar('zincir-om', () => import('./09d-oruntu-motoru.js').then(m => m.omInit()))).catch(() => {});
  // Epizodik Hafıza (09f) — omReady sonrası, yesterday-özet tetiğinden
  // (w2CheckAndSummarizeYesterday aşağıda ehReady'yi bekler) ÖNCE: ehIngestDay
  // o zincirin ucunda çağrılacağı için _ehInited burada true olmalı. loadNarrativeMemory
  // zaten paralel yükleme bloğunda hazır — backfill onu okur.
  const ehReady = omReady.then(() => bnSar('zincir-eh', () => import('./09f-epizodik-hafiza.js').then(m => m.ehInit()))).catch(() => {});
  // Yaşayan Portre (09e) — ehReady sonrası: P1-P6 + kimlik + örüntü +
  // gün özetini günlük tek kanonik "X çünkü Y" anlatısına damıtır
  const ypReady = ehReady.then(() => bnSar('zincir-yp', () => import('./09e-yasayan-portre.js').then(m => m.ypInit()))).catch(() => {});
  // Ayna Protokolü (09g) — ypReady sonrası: portrenin kör noktalarını
  // kimlik defteriyle çapraz kontrol edip haftalık hipotez üretir
  const apReady = ypReady.then(() => bnSar('zincir-ap', () => import('./09g-ayna-protokolu.js').then(m => m.apInit()))).catch(() => {});
  // Gerçeklik Temizliği (13y) — kanıta bağlanamayan ESKİ portre/örüntü
  // kayıtlarını kullanıcı başına BİR kez siler. Hem omReady hem apReady
  // beklenir: iki motor da hidre olmadan tarama boş state'i yargılardı.
  Promise.all([omReady, apReady])
    .then(() => import('./13y-koken.js').then(m => { try { m.kokenTemizlik(); } catch (_) {} }))
    .catch(() => {})
    // Zincirin GERÇEK ucu: `.catch`ten SONRA çağrılır ki bir halka kırılsa da
    // "hazır" anı defterde kalsın — yoksa hatalı boot hiç ölçülmemiş görünür.
    .then(() => {
      bnHazir();
      // Hidrasyon bitti: hâlâ bekleyen alan varsa değeri GERÇEKTEN boş
      // demektir (yeni kullanıcının serisi 0). Bundan sonra beklemek susmak
      // değil kaybolmaktır — 00i'nin ikinci kapısı burasıdır.
      try { kbSerbest(); } catch (_) {}
      // Ana ekranın kanıt kapısı da burada zorlanır (10y): model yüklemesi
      // ya da kişisel başlatıcı modülü hiç gelmediyse şerit sonsuza dek boş
      // kalmasın — yerleşik başlatıcılar ancak BURADA, tek dalgada belirir.
      try { window.llmHomeAc?.(); } catch (_) {}
    });
  // Tanıma Motoru · Seçici (09i) — bu fazda saf fonksiyon kütüphanesi, tutacak
  // kullanıcı verisi yok; init bugün yalnız TDZ-güvenli guard (09e/09f/09g/09h'nin
  // "main.js unutuldu" dersi tekrarlanmasın). FAZ 7'de gerçek hidrasyon kazanır.
  import('./09i-secici.js').then(m => { try { m.secInit(); } catch (_) {} }).catch(() => {});
  // Emre'nin Sesi (16d) — canlı yönlendirmeler (persona_directives): cache'i
  // anında uygula + DB'den tazele. LLM'e giden her p() metni önce buna bakar;
  // ilk sohbet dönüşünden önce yüklenmiş olsun diye burada erken çağrılır.
  import('./16d-emre-sesi.js').then(m => { try { m.esInit(); } catch (_) {} }).catch(() => {});
  // Odak Modelleri (10w) — seçili modeli SafeStorage'dan geri yükle, pili çiz,
  // promptları Supabase'den arka planda çek. Hidrasyon sonrası (cache dolu).
  import('./10w-w2-odak-modelleri.js').then(m => { try { m.fmInit(); } catch (_) {} }).catch(() => {});
  // Kişisel Başlatıcılar (10y2) — ana ekran şeridinin kişisel soruları.
  // 10w'DEN SONRA: dokuma bağlamına aktif modelin ekseni girer, model
  // henüz hidre olmadan çağrılırsa soru yanlış eksende dokunurdu.
  import('./10y2-baslaticilar.js').then(m => { try { m.bslInit(); } catch (_) {} }).catch(() => {});
  // Kota Motoru (13m) — ücretsiz katmanda kota çemberini çiz (sunucu sayaçlı;
  // migration 018 yoksa sessizce devre dışı, yerel günlük sayaç fallback'i kalır)
  import('./13m-kota.js').then(m => { try { m.ktInit(); } catch (_) {} }).catch(() => {});
  // Duygu Motoru (13D) — İklim'i SafeStorage'dan hidre eder. Post-auth ŞART
  // (§5.2 çift boot ayrımı): İklim kullanıcı-verilidir. dgNabiz kendisi
  // hidrasyon beklemez (saf fonksiyon, İklim'i opts.iklim ile alır) — bu
  // yalnız S._dgIklim'in dolmasını sağlar, sıralaması diğer 40+ paralel
  // import gibi kritik değildir.
  import('./13D-duygu-motoru.js').then(m => { try { m.dgInit(); } catch (_) {} }).catch(() => {});
  // Kullanım Nabzı (00f) — Gözlemevi telemetrisi: ekran süresi segmentleri.
  // EN SONDA: tüm view/ritüel init'leri yerleştikten sonra damar açılır;
  // hook kaydından önceki aktif view'ı kendisi yakalar.
  import('./00f-kullanim-nabzi.js').then(m => { try { m.wtInit(); } catch (_) {} }).catch(() => {});
  // Serpme SENKRON sınırı: buraya kadar 44 dinamik import yalnız BAŞLATILDI;
  // gerçek işleri mikrotask'ta akar. Sıralı zincirin ucu `bn:hazir`dır.
  bnMark('serpme-son');

  /* ═══ ARKAPLANDAKİ GÖREVLER — UI'ı bloklamaz ═══ */
  syncClosureStatusFromDB();
  loadRoadmap();
  loadSummaries();
  if (S.isAdmin) loadDashboard();
  // Postane (13C) — Bülten kadranını ısıtır. Kapı S.isAdmin'dir.
  // NOT: kazanç BYTE DEĞİL. Bu repo iife + inlineDynamicImports ile
  // derleniyor (vite.config.js:34), yani dinamik import de tek bundle'a
  // gömülür — 13C statik de yazılsa dinamik de, aynı dosyanın içindedir.
  // Kazanç AĞ TURUDUR: pstInit bir `bulten_ozet()` RPC'si atar ve o sorgu
  // admin olmayan her kullanıcıda boşa giderdi. Boot'un darboğazı bundle
  // değil sıralı ağ turlarıdır ([[boot-nabzi]]: 1331→905 ms).
  if (S.isAdmin) {
    import('./13C-postane.js').then(m => { try { m.pstInit(); } catch (_) {} }).catch(() => {});
  }
  // Bildirimler · Web Push (10x) — izin soft-prompt + abonelik senkronu +
  // engagement snapshot (motorun win-back/seri-riski kararı için). Eski yerel
  // 60sn polling (initPushNotifications) kaldırıldı; yerini gerçek push aldı.
  import('./10x-w2-bildirimler.js').then(m => { try { m.bildirimInit(); } catch (_) {} }).catch(() => {});
  showDailyThought();
  scheduleProactiveCheckin();

  // Haftalık Hayattaki Sen — Pazar günleri otomatik aç
  const today = new Date();
  if (today.getDay() === 0) {
    const weeklyKey = STORAGE_KEYS.PME_REPORT(today.toDateString());
    if (!SafeStorage.getRaw(weeklyKey)) {
      SafeStorage.setRaw(weeklyKey, '1');
      setTimeout(() => window.showHayattakiSen?.('weekly'), 2000);
    }
    // Pazar günü drawer'daki pulse dot'u etkinleştir
    document.getElementById('ws-hs-pulse')?.classList.add('active');
  }

  // Hesap Günü kontrolü (Per/Cum/Cmt/Paz — Özellik 3)
  setTimeout(() => window.showHesapGunu?.(), 3500);

  // Günlük Ritüel (10s) — günün ilk girişinde Armağan → Söz pop-up'ları.
  // Kapı/onboarding/intro akışından sonra çalışsın diye gecikmeli; içeride
  // glShouldRunToday() guard'ı çakışmayı (onboarding/kapı açık, aynı gün) engeller.
  // NOT: initApp aşağıda switchView('chat') ile açtığı için bu timer ateşlendiğinde
  // sahne çoğu zaman Wanderer LLM'dir; tören Studio'ya has olduğundan 10s orada
  // sessizce çıkar. Bugün'e geçiş anını 10y'nin switchView kancası yakalar —
  // çağrı yine de burada durur, çünkü kullanıcı doğrudan Bugün'e açılan bir
  // oturumda tören ilk saniyede başlamalı. (Eşik Ekranı da kapanışında
  // glRunDailyRitual'ı yeniden çağırır; artık girişte açıldığı için o çağrı
  // ön yüzde sessizce düşer — idempotent, zararsız.)
  setTimeout(() => { try { window.glRunDailyRitual?.(); } catch (_) {} }, 1500);

  // Seri Mührü (10t) — günün ilk girişinde "günü mühürle" töreni (günde bir kez).
  // Wanderer Studio'ya has: yalnız Bugün ekranındayken dövülür (10t _blocked()
  // gate'i); Wanderer LLM ön-yüzünde artık belirmez.
  setTimeout(() => { try { window.smRunDaily?.(); } catch (_) {} }, 2200);

  // Ultra Seri (10u) — Hayal/Söz detektörlerini yakala + çember/kart tazele +
  // (üçü de canlıysa) Ultra uyanış. Seri Mührü töreninden sonra çalışsın.
  setTimeout(() => { try { window.usRunDaily?.(); } catch (_) {} }, 2600);

  // Giriş ekranı: Portre (+ Olmak İstediği Kişi — geri dönen kullanıcılar)
  const entrySessionCount = Object.keys(S.allSessions || {}).length;
  const entrySynth = await window.showEntryCards?.(entrySessionCount);
  if (entrySessionCount === 0 && entrySynth) {
    S._microOnboardingCtx = buildOnboardingContext(entrySynth);
  }

  // Dil modeli kabuğu (10y): boot artık doğrudan Sohbet'e iner (newSession
  // çağrılmaz) — bugünün seansını aktif sohbete hidre et ki kartın ön yüzü
  // günün kaldığı yerinden devam etsin (10y llmSyncHome de buna bakar).
  if (!S.currentSessId) S.currentSessId = w3GetDaySessionId(new Date());
  if (!(S.chatHistory || []).length) {
    let msgs = Array.isArray(S.allSessions?.[S.currentSessId])
      ? S.allSessions[S.currentSessId] : null;
    if (!msgs) {
      // session_id day_… anahtarıyla uyuşmayabilir (legacy/uuid kayıtlar) —
      // bugünün mesajlarını created_at ile bul (newSession'daki kalıp)
      const d = new Date();
      const todayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const found = Object.values(S.allSessions || {}).flat().filter(m => {
        if (!m.created_at) return false;
        const md = new Date(m.created_at);
        return `${md.getFullYear()}-${md.getMonth()}-${md.getDate()}` === todayKey;
      }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      if (found.length) msgs = found;
    }
    if (msgs) {
      // id taşınır: "yeniden üret" düşecek satırı içerikten tahmin etmesin
      S.chatHistory = msgs.map(m => ({ id: m.id ?? null, role: m.role, content: cleanHistoryText(m.content), mode: m.mode || '' }));
      // Mod yolculuğunu hydrate et (S6 fix) — reload öncesi rozet/yapışkanlık/denge
      // uyarıları _modeHistory boş olduğu için körleşiyordu; DB'deki asistan
      // mesajlarının mode alanından son 8 turu geri kur.
      const _assistantModes = S.chatHistory
        .filter(m => m.role === 'assistant')
        .map(m => (m.mode || '').replace('mode-', '') || AI_MODES.SOFT)
        .filter(mode => Object.values(AI_MODES).includes(mode));
      if (_assistantModes.length) {
        S._modeHistory = _assistantModes.slice(-8);
        S.currentAIMode = S._modeHistory[S._modeHistory.length - 1];
        S._lastFlashedMode = S.currentAIMode; // reload'da sahte flash tetiklenmesin
        updateModeBadge();
      }
    }
  }
  // Kabuğa haber ver: hidrasyon DOM'a dokunmadıysa 10y'nin mutation
  // observer'ı tetiklenmez — devam satırı/home durumu burada eşitlenir.
  try { window.llmSyncHome?.(); } catch (_) {}

  // URL query — PWA shortcut'larından gelen yönlendirmeler
  // Örn: ?action=new-session  veya  ?view=journal
  const params = new URLSearchParams(window.location.search);
  const action = params.get('action');
  const view   = params.get('view');

  // İzinli view'lar — keyfi string ile switchView'a gitmesin.
  // KURAL: buradaki her ad ya `_src.html`'de `#<ad>-view` olarak doğar, ya da
  // switchView'ın başındaki emeklilik köprüsünde canlı bir ada çevrilir
  // (arketip→oik, gecis→oik, meclis→hasimlar). Aksi hâlde liste kullanıcıyı
  // BOŞ EKRANA düşürür: switchView önce tüm view'ların `active` sınıfını
  // siler, sonra hedefi bulamayıp return eder — geriye hiçbir ekran kalmaz.
  // Kapı: tests/03-allowed-views.test.js (liste bir daha gerçeğin önünde
  // kaymasın diye _src.html'e karşı doğrulanır).
  const ALLOWED_VIEWS = new Set([
    'chat','notebook','settings','sub','bugun','muhrum','portre','isik',
    'hasimlar','meclis','oik','arketip','arketipler','kisilerim','kk-mine',
    'hazine','sosyal','dinlenme',
    // Derin Çalışma alanı ve oradan açılan dört oda (13A · K1: portal değil)
    'derincalisma','ayna','konusma','degerlendirme','hayalseans'
  ]);

  if (action === 'new-session') {
    // Query'yi temizle ki refresh'te tekrar tetiklenmesin
    history.replaceState(null, '', window.location.pathname);
    newSession();
  } else if (view && ALLOWED_VIEWS.has(view)) {
    history.replaceState(null, '', window.location.pathname);
    switchView(view);
  } else {
    // Dil modeli kabuğu (10y): kartın ÖN YÜZÜ Sohbet — girişte ilk görülen ekran
    switchView('chat');
  }

  // Kat 0 (perde yok, bkz _splashPlan): _closeSplash hiç çağrılmadığı için
  // composer odağı orada tetiklenmez — switchView tamamlandıktan SONRA burada.
  if (_splashClosed) { try { window.llmFocusComposer?.(); } catch (_) {} }

  // Bugünün Eşiği (02d) — uygulamaya HER girişte bir kez, dil modelinin ön
  // yüzünde. Tetik artık Studio flip'i DEĞİL girişin kendisi (Emre'nin kararı,
  // 2026-08-26): eşikten geçmek bir odaya girmek değil, uygulamaya girmektir.
  // Sayfayı kapatmadan Sohbet ↔ Studio gezinen kullanıcıya tekrar açılmaz —
  // kapı esikShowOnce'ın sayfa ömrü bayrağıdır. Çağrı beklemez (fire-and-
  // forget): perdeyi ve kutupların hidrasyonunu 02d kendi içinde bekler.
  import('./02d-esik-ekrani.js')
    .then(m => { try { m.esikShowOnce(); } catch (_) {} })
    .catch(() => {});

  // ═══ Wanderer v2 — ARAYÜZ BOOTSTRAP ═══
  try {
    // 1) Admin bölümü + Premium badge drawer'da göster/gizle
    const w2AdminSection = document.getElementById('w2-admin-section');
    if (w2AdminSection) w2AdminSection.style.display = S.isAdmin ? '' : 'none';
    const premiumBadge = document.getElementById('ws-drawer-premium-badge');
    if (premiumBadge) premiumBadge.style.display = S.isPremium ? '' : 'none';

    // 2) Özet cache yükle (takvim için)
    await w2LoadSummariesCache();

    // 3) Avatar'ı üst bar ve panele yansıt
    w2RefreshProfilePanel();

    // 4) Session ID'yi hazır tut (chat'e geçildiğinde lazım olur)
    if (!S.currentSessId) S.currentSessId = w3GetDaySessionId(new Date());

    // 5) Dün için otomatik özet kontrolü (arka planda) — ehReady'yi bekler:
    // ehIngestDay bu zincirin ucunda çağrılır, ehInit'in _ehLoad'u önce bitmiş olmalı.
    ehReady.then(() => w2CheckAndSummarizeYesterday()).catch(() => {});

    // 6) Gece yarısı timer'ı kur
    w2ScheduleMidnightSummary();

    // 7-8) Klavye + swipe + cross-tab listener'ları — SADECE BİR KEZ kurulur
    // (logout → login döngüsünde listener birikmesin)
    if (!window._w2ListenersInstalled) {
      window._w2ListenersInstalled = true;

      // Cross-tab auth senkronizasyonu: başka sekme logout olunca bu sekmeyi de temizle
      try {
        const _authCh = new BroadcastChannel('etw-auth');
        _authCh.onmessage = (e) => {
          if (e.data?.type === 'logout') window.location.reload();
        };
      } catch (_) {} // BroadcastChannel desteklemeyen ortamlar için sessizce geç

      // Klavye Escape ile drawer/panel kapat (kısayol kartının Escape'i
      // 10y'nin kendi _installShortcuts'ında — auth'tan bağımsız yaşıyor)
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          w2CloseDrawer();
          w2CloseProfile();
          window.chDrawerClose?.();
        }
      });

      // Swipe desteği (sol → sağ drawer açma, sağ → sol profil açma)
      let _w2TouchStartX = null;
      let _w2TouchStartY = null;
      document.addEventListener('touchstart', (e) => {
        if (!e.touches[0]) return;
        _w2TouchStartX = e.touches[0].clientX;
        _w2TouchStartY = e.touches[0].clientY;
      }, { passive: true });
      document.addEventListener('touchend', (e) => {
        if (_w2TouchStartX === null) return;
        const endX = e.changedTouches[0]?.clientX || 0;
        const endY = e.changedTouches[0]?.clientY || 0;
        const dx = endX - _w2TouchStartX;
        const dy = endY - _w2TouchStartY;
        if (Math.abs(dx) > 60 && Math.abs(dy) < 50) {
          if (!document.getElementById('chat-view')?.classList.contains('active')) {
            _w2TouchStartX = null; return;
          }
          // ws-studio drawer'ı emekli (Studio tek sayfa) — kalan iki panel yeter.
          const panelOpen = document.getElementById('w2-profile-panel')?.classList.contains('open');
          const chOpen = document.getElementById('ch-drawer')?.classList.contains('open');
          if (panelOpen || chOpen) {
            _w2TouchStartX = null; return;
          }
          if (dx > 0 && _w2TouchStartX < 40) {
            // Ön yüz = dil modeli: sol kenar jesti LLM kenar çubuğunu açar
            // (ana menü arka yüzde). window.* — modül döngüsü/TDZ riskine girme.
            window.chDrawerOpen?.();
          } else if (dx < 0 && _w2TouchStartX > window.innerWidth - 40) {
            w2OpenProfile();
          }
        }
        _w2TouchStartX = null;
      }, { passive: true });
    }

    // 9) Wanderer v3: Migrasyon kontrolü — eski özetler varsa yeniden yapılandır
    setTimeout(() => { w3MaybeRunMigration().catch(()=>{}); }, 1500);
  } catch (e) {
    console.warn('Wanderer v2 bootstrap hatası:', e);
  }
}

/* ═══ AYRI YÖNETİM SAYFASI (admin.html) ═══
   Aynı bundle, ayrı sayfa: build.sh dist/index.html'den admin.html üretir.
   Buraya yalnız initApp'ten (auth sonrası) girilir — S.isAdmin belirlenmiştir. */
function enterAdminStandalone() {
  if (!S.isAdmin) {
    showToast(t('toast.no_permission'), true);
    setTimeout(() => window.location.replace('index.html'), 1200);
    return;
  }
  // Üst bar kaldırıldı. Yönetim'den çıkış sağ-alttaki kart-dönüş tuşuyla
  // (#admin-exit-card → adminExitToApp), görev→giriş dönüşü #admin-pages
  // başındaki geri çipiyle yapılır. Oturumu kapatma artık stüdyo gövdesindeki
  // ince linkte (#admin-logout-link) — yalnız ayrı yönetim sayfasında görünür.
  const logoutLink = document.getElementById('admin-logout-link');
  if (logoutLink) logoutLink.style.display = 'block';
  // switchView atlanır: kabuk hook'ları (kart flip, elmas barı) hiç çalışmasın.
  document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
  document.getElementById('admin-view')?.classList.add('active');
  adminShowHome();
}

/* ═══ NAV ═══ */
export function toggleMenu() { document.getElementById('global-menu').classList.toggle('open'); }

export function toggleCat(btn) {
  const group = btn.nextElementSibling;
  if (!group || !group.classList.contains('gm-cat-group')) return;
  const isOpen = btn.classList.toggle('open');
  if (isOpen) group.classList.add('open');
  else group.classList.remove('open');
}

/** switchView için before/after hook registry (Faz 2.1b).
 *  before hook ctx.redirectTo = '<view>' set ederse oraya yönlendirir,
 *  ctx.cancelled = true set ederse switchView'i tamamen iptal eder.
 *  13-extras.registerChatHooks() içinde 'chat → history' redirect bu pattern'le kuruldu. */
export const switchViewHooks = createHookRegistry();

export function switchView(v) {
  // Yönetim artık ayrı sayfa (admin.html) — uygulama içindeki tüm eski giriş
  // noktaları (drawer "Yönetim", global menü…) oraya yönlenir. Admin sayfasının
  // kendisinde normal akış sürer.
  if (v === 'admin' && !IS_ADMIN_PAGE) { window.location.href = 'admin.html'; return; }

  // Emeklilik köprüsü: arketip-view (12a) ve Geçiş Alanı (10j) → Olmak İstediğin Kişi (10D)
  if (v === 'arketip' || v === 'gecis') v = 'oik';
  // İç Meclis 2.0: 'meclis' okunaklı alias — DOM/route id hâlâ 'hasimlar' (Korunan Sözleşme)
  if (v === 'meclis') v = 'hasimlar';

  const ctx = { cancelled: false, redirectTo: null };
  switchViewHooks.runBefore(v, ctx);
  if (ctx.cancelled) return;
  if (ctx.redirectTo) v = ctx.redirectTo;

  document.querySelectorAll('.view').forEach(e => e.classList.remove('active'));
  const target = document.getElementById(v + '-view');
  if (!target) { console.warn('switchView: view bulunamadı:', v); return; }
  target.classList.add('active');
  document.getElementById('global-menu')?.classList.remove('open');
  // Stüdyo aktif oda — açıldığında bulunduğun oda altın çerçeveli görünür
  document.querySelectorAll('.ws-st-room').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nav === v);
  });
  // Geri Çağrı timer'ı sadece chat view'da aktif tut (13o)
  if (v !== 'chat') { try { window.gcCancel?.(); } catch (_) {} }
  if (v === 'bugun')      loadBugunView();
  if (v === 'hasimlar')   window.loadMeclisView?.();
  if (v === 'isik')       window.loadIsikView?.();      // Alfabe Işık (12e)
  if (v === 'muhrum')     loadMuhrumView();
  if (v === 'dinlenme')   window.loadDinlenmeView?.();
  if (v === 'oik')        window.loadOikView?.();       // Olmak İstediğin Kişi (10D)
  if (v === 'arketipler') window.loadKisilerView?.();   // "Kişiler" — sahipsiz kartlar (10q)
  if (v === 'kisilerim')  window.loadKisilerimView?.();
  if (v === 'hazine')     window.loadHazineView?.();     // Hazine Destesi (12f)
  if (v === 'portre')     window.loadPortreView?.();      // Portrem (02c)
  if (v === 'kk-mine')    window.loadKendiKoleksiyonumView?.();  // Kendi Koleksiyonum (10A)
  if (v === 'sosyal')     window.loadSosyalView?.();              // Kişilerin Kişileri (10C)
  if (v === 'admin')      adminShowHome();
  // 'cards' (Dönüşüm Kartları galerisi) SÖKÜLDÜ: #cards-view de
  // #cards-grid-wrap de DOM'da doğmuyor (üreten yok, yalnız 08 okuyor).
  // Route yerinde kalsaydı ?view=cards boş bir ekrana düşürürdü.
  // Aynı gerekçeyle dokuz dal daha düştü (2026-08-17): summaries · profile ·
  // roadmap · timeline · yolculuk · library · challenge · manifesto · history.
  // Hiçbirinin `#<ad>-view`'ı _src.html'de doğmuyor — hedef bulunamayınca
  // yukarıdaki guard zaten return ediyordu, yani dallar erişilemezdi.
  // Yükleyici gövdeleri yerinde: loadSummaries/loadRoadmap/loadUserProfile
  // post-auth'tan, loadYolculukHaritasi 13'ten çağrılmaya devam ediyor.
  // `loadChallenges` artık Derin Çalışma alanı açılırken çağrılıyor (13A);
  // `loadLibrary` 2026-08-17'de söküldü (DOM hedefi yoktu, 0 çağıranı vardı).
  if (v === 'notebook')  loadNotebook();
  if (v === 'sub')        window.initPricing?.();
  if (v === 'chat')         { w2RenderInfiniteChat(); w2RefreshProfilePanel(); updateSessionHero(); updateChatIdentityBanner(); }
  // "Üç Mühür → Hayal" özelliklerinin ayrı sayfaları (popup yok). SENKRON
  // çağrı (window üzerinden) — yükleme kancası switchView dönmeden bitsin ki
  // açıcılar (gaOpenReading vb.) bölümü switchView'den SONRA açabilsin.
  if (v === 'derincalisma')  window.dcLoadView?.();   // Derin Çalışma (13A)
  if (v === 'ayna')          window.loadAynaView?.();
  if (v === 'konusma')       window.loadKonusmaView?.();
  if (v === 'degerlendirme') window.loadDegerlendirmeView?.();
  if (v === 'hayalseans')    window.loadHayalSeansView?.();
  switchViewHooks.runAfter(v);

  // Elmas Halkası (10s) — sadece ws-topbar kabuk view'lerinde göster (w2-topbar/
  // chat gibi kendi sağ-üst kümesi olan immersive view'lerde gizle → çakışma yok).
  try { window.glSyncElmasBar?.(v); } catch (_) {}

  // Yarım kalan ritüel kurtarma: kullanıcı sabah Armağanı'nın "İlgili Yazı"
  // köprüsünden, ya da akşam töreninin Mühürle/Bütünle/Hesapla köprülerinden
  // ara ekrana gitmiş olabilir. Geri dönünce burada idempotent yeniden yokla.
  // Aynı kanca Studio'ya İLK girişin de kurtarma noktasıdır: günlük tören
  // Bugün ekranına has olduğu için boot timer'ı LLM sahnesinde boşa düşer.
  // Açık portal varsa hiç çağırma (glRunDailyRitual'ın iç retry zinciri her
  // çağrıda yenisini başlatır → çakışmayı önlemek için dışarıda guard).
  setTimeout(() => {
    const portalOpen = !!document.getElementById('gl-portal')
                    || !!document.getElementById('at-portal')
                    || !!document.getElementById('sm-portal');
    if (portalOpen) return;
    try { window.glRunDailyRitual?.(false); } catch (_) {}
    try { window.atRun?.(false); } catch (_) {}
  }, 600);

  // Defensive: hiçbir view active değilse (üçüncü taraf kod silmiş olabilir) → fallback.
  // Bu, "arketipten çıkınca siyah ekran" gibi semptomları engeller.
  setTimeout(() => {
    if (!document.querySelector('.view.active')) {
      console.warn('[switchView] No active view detected, falling back to bugun');
      const fallback = document.getElementById('bugun-view');
      if (fallback) fallback.classList.add('active');
    }
  }, 50);
}

export async function newSession() {
  // Wanderer v3: session_id artık gün bazlı. Aynı güne ait tüm mesajlar aynı id altında.
  S.currentSessId = w3GetDaySessionId(new Date());
  S.chatHistory   = [];
  S.avoidanceCount       = 0;
  S.consecutiveAvoidance = 0;
  S.currentAIMode        = AI_MODES.SOFT;
  S._modeHint            = AI_MODES.SOFT;
  S._modeExplicitRequest = null;
  S._modeHistory         = [];
  S._sessionUserMsgs     = [];
  S._emotionalSpikeFired      = false;
  S._contradictionFired       = false;
  S._crisisFiredThisSession   = false;
  S._crisisMsgLeft            = 0;
  S._crisisCardAt             = 0;
  S._lastMsgTimestamp    = null; // Sessizlik analizi sıfırla
  S._emotionalFlow       = [];  // Duygusal akış sıfırla
  // Duygu Motoru (13D) — Nabız/Yay oturum-ömürlü, yeni günde sıfırlanır.
  // İklim (S._dgIklim) KALICIDIR — burada dokunulmaz, kullanıcının parmak
  // izi gün değişse de taşınır.
  S._dgNabiz              = null;
  S._dgYay                = null;
  /* Karşılama geçmişi de oturum-ömürlüdür (denetim 2026-08-29): taşınırsa
     dünün son üç kararı bugünün tekrar cezası penceresine girer ve günün
     İLK mesajı "aynı eksen üç turdur veriliyor" diye tanıklığa düşürülür —
     yani yeni gün, dünün gölgesiyle karşılanır. */
  S._dgSonKarsilama       = [];
  /* KADRAN 1-2'nin OTURUM SINIRI (inceleme turu, 2026-08-30). FAZ 17 kapının
     ilk iki kadranını besleyen iki alan daha doğurdu ama bu listeye
     eklenmemişlerdi. Sonuç ölçülebilirdi: `_dgOncekiNabiz` taşındığı için
     yeni günün İLK mesajında tanık sayısı 2'ye çıkıyor ve K10'un "2 bağımsız
     tanık, **aynı gün**" şartıyla korunan `toren` yüzeyi (Günün Sözü / Akşam
     Töreni) dünün ölçümünü ikinci tanık sayarak konuşabiliyordu — yukarıdaki
     `_dgSonKarsilama` gerekçesinin birebir aynısı: yeni gün, dünün
     gölgesiyle karşılanmaz. `_dgNabizZaman` de onunla gider; kalırsa kadran
     2 dünün damgasını bugünün penceresinde tartar. */
  S._dgOncekiNabiz        = null;
  S._dgNabizZaman         = null;
  /* Öğrenme defterinin mührü de oturum-ömürlüdür (FAZ 10): dünün son
     karşılaması bugünün ilk mesajıyla puanlanırsa, arada geçen bir gece
     "yanıt işe yaradı mı" ölçüsüne karışır. Defterin KENDİSİ (İklim)
     kalıcıdır — sıfırlanan yalnız bekleyen mühürdür. */
  S._prevDgKarsilama      = null;
  // Tanıma Motoru (FAZ 1) — oturum izi yeni güne taşınmaz; taşınırsa dünün
  // ekranı/kartı bugünün "en çok açılanı" gibi sayılır (09d hasadı yanılır).
  S._oturumIzi           = { ekranlar: [], kartlar: [], skipler: [], torenler: [] };
  w2ResetContextualCards();
  updateModeBadge();
  document.getElementById('chat-input').value = '';
  document.getElementById('chat-input').style.height = 'auto';
  resetSessionRing();
  S.summaryInProgress   = false;
  S.summarizedSessionId = null;

  const totalSessions = Object.keys(S.allSessions).length;

  // Chat ekranına geç
  switchView('chat');
  w2CloseDrawer();
  document.getElementById('global-menu').classList.remove('open');

  // Wanderer v2: Tüm geçmişi render et (gün ayırıcıları + bugünün mesajları)
  w2RenderInfiniteChat();

  // Bugün için hiç user mesajı yoksa — opener / selam kartı zaten w2RenderInfiniteChat içinde
  // İlk seans mi?
  if (totalSessions === 0) {
    // Portre initApp'te gösterildi; onaylanmadıysa burada tekrar dene
    if (!S._portre?.confirmed) {
      const obAnswers = await showMicroOnboarding();
      S._microOnboardingCtx = buildOnboardingContext(obAnswers);
    }
    startOnboardingSequence();
  } else {
    // Bugün için hiç emre opener gelmediyse hoş geldin mesajı üret
    const todayKey = (() => {
      const d = new Date();
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })();
    const todayMsgs = Object.values(S.allSessions || {}).flat()
      .filter(m => {
        if (!m.created_at) return false;
        const d = new Date(m.created_at);
        return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === todayKey;
      });
    const todayHasUserMsg = todayMsgs.some(m => m.role === 'user');
    const todayHasEmreMsg = todayMsgs.some(m => m.role === 'assistant');

    if (!todayHasUserMsg && !todayHasEmreMsg) {
      // Tamamen boş bir gün — opener üret
      try {
        const oldCacheKey = STORAGE_KEYS.PRE_CTX(S.currentUser.id, nowTR().toDateString());
        SafeStorage.remove(oldCacheKey);
      } catch (_) {}
      showTyping();
      generatePreSessionContext().then(preCtx => {
        if (S.chatHistory.length > 0) { removeTyping(); return; }
        const opener = preCtx || S.settings.welcome_message || t('chat.welcome_default', 'Bugün ne konuşmak istersin?');
        removeTyping();
        const streamMsg = startStreamingMsg('');
        let i = 0;
        const typeInterval = setInterval(() => {
          if (i >= opener.length) {
            clearInterval(typeInterval);
            streamMsg.finalize(opener);
            S.chatHistory.push({ role: 'assistant', content: opener });
            return;
          }
          streamMsg.appendChunk(opener[i]);
          i++;
        }, 35);
      }).catch(() => {
        removeTyping();
        const opener = S.settings.welcome_message || t('chat.welcome_default', 'Bugün ne konuşmak istersin?');
        appendMsg('emre', opener);
        S.chatHistory.push({ role: 'assistant', content: opener });
      });
    } else {
      // Bugün zaten mesajlaşma var — mevcutları S.chatHistory'ye aktar
      S.chatHistory = todayMsgs
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map(m => ({ id: m.id ?? null, role: m.role, content: cleanHistoryText(m.content), mode: m.mode || '' }));
    }
  }

  resetSilencePressure();
  scheduleEndOfDayJudgment();
  markCommitmentsChecked();
}

/* ═══ AVATAR ═══ */
export function previewAvatar(input) {
  if (!input.files?.[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX = 150; let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h *= MAX/w; w = MAX; } }
      else { if (h > MAX) { w *= MAX/h; h = MAX; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      S.tempAvatarData = canvas.toDataURL('image/jpeg', 0.8);
      document.getElementById('settings-avatar-preview').src = S.tempAvatarData;
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(input.files[0]);
}

export async function saveUserSettings() {
  if (!S.tempAvatarData && !document.getElementById('u-avatar-file').files?.[0]) {
    showToast(t('toast.photo_select'), true); return;
  }
  const btn = document.getElementById('save-avatar-btn');
  btn.disabled = true; btn.textContent = t('auth.sending');

  let savedUrl = null;

  // 1. Supabase Storage dene (bucket varsa)
  try {
    const fileInput = document.getElementById('u-avatar-file');
    if (fileInput.files?.[0]) {
      const file = fileInput.files[0];
      const ext  = file.name.split('.').pop();
      const path = `avatars/${S.currentUser.id}.${ext}`;
      const { data: upData, error: upErr } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
      if (!upErr && upData) {
        const { data: urlData } = sb.storage.from('avatars').getPublicUrl(path);
        if (urlData?.publicUrl) savedUrl = urlData.publicUrl;
      }
    }
  } catch (_) { /* Storage bucket yok, base64'e düş */ }

  // 2. Storage başarısızsa base64 kaydet (profiles tablosunda TEXT kolonu varsayılır)
  const finalAvatar = savedUrl || S.tempAvatarData;

  try {
    const { error: dbErr } = await sb.from('profiles')
      .update({ avatar: finalAvatar })
      .eq('id', S.currentUser.id);

    if (dbErr) throw dbErr;

    // Belleği ve UI'ı anında güncelle
    S.USER_IMG = finalAvatar;
    S.tempAvatarData = null;
    // Settings ekranındaki önizlemeyi güncelle
    const prev = document.getElementById('settings-avatar-preview');
    if (prev) prev.src = S.USER_IMG;
    SafeStorage.setRaw(STORAGE_KEYS.AVATAR(S.currentUser.id), finalAvatar);
    // Yüz Çizgisi (12g): kartların çizimi bu fotoğraftan ölçülür — foto
    // değiştiyse eski iz bayattır, bırakılır ve yenisi ölçülür.
    try { window.yzUnut?.(); window.yzInit?.(); } catch (_) {}
    showToast(savedUrl ? t('toast.photo_saved_server') : t('toast.photo_saved'));
  } catch (e) {
    console.error('Avatar DB hatası:', e);
    showToast(t('toast.save_error') + (e.message || ''), true);
  }

  btn.disabled = false; btn.textContent = t('ui.save');
}

/* ═══ API KEY ═══ */
export async function saveApiKey(btn) {
  if (!S.isAdmin) { showToast(t('toast.no_permission'), true); return; }
  const newKey = document.getElementById('u-api-key').value.trim();
  if (!newKey) return;
  if (!btn) btn = event?.target;
  btn.disabled = true; btn.textContent = t('auth.sending');
  try {
    const { error } = await sb.from('admin_settings').update({ gemini_api_key: newKey }).eq('id', 1);
    if (error) { showToast(t('toast.error') + error.message, true); }
    else { S.LLM_API_KEY = newKey; showToast(t('toast.api_key_updated')); document.getElementById('u-api-key').value = ''; }
  } catch { showToast(t('toast.critical_error'), true); }
  btn.disabled = false; btn.textContent = t('ui.update', 'Güncelle');
}

/* ═══ LLM API (Edge Function Proxy) ═══ */
// API anahtarı artık client'ta YOK. Supabase Edge Function üzerinden çağrılır.
// llm-chat function: JWT doğrular → LLMApi'ye forward eder → yanıtı döner.
const CHAT_MODEL = 'deepseek-v4-flash';

function trAuthErr(msg) {
  const errors = {
    // Şifre/kayıt eşlemeleri SÖKÜLDÜ (2026-08-27): kod kapısında ne şifre
    // ne ayrı bir kayıt çağrısı var — 'Invalid login credentials',
    // 'User already registered', 'Password should be at least 6 characters'
    // ve 'Email not confirmed' bu uygulamada artık HİÇ dönmez. Kalanı
    // kalması gerektiği için kaldı: bozuk adres signInWithOtp'ta hâlâ mümkün.
    'Unable to validate email address: invalid format': t('auth.error.invalid_email'),
    'signup_disabled': t('auth.error.signup_disabled'),
    'Email rate limit exceeded': t('auth.error.rate_limit'),
    // ── Kod kapısı ──
    // Sahte başarı yasak (§6.2): kapı çalışmıyorsa kullanıcıya "kod
    // gönderildi" DEMEYİZ, gerçeği söyleriz. Hız sınırı özellikle önemli —
    // Supabase'in yerleşik e-posta servisi saatte birkaç postayla sınırlıdır
    // ve özel SMTP bağlanmadan kapı tam da burada toslar (ELLE · SETUP).
    'Signups not allowed for otp': t('auth.error.signup_disabled'),
    'Token has expired or is invalid': t('auth.kod.error.gecersiz'),
    'Invalid token': t('auth.kod.error.gecersiz'),
    'otp_expired': t('auth.kod.error.gecersiz'),
    'over_email_send_rate_limit': t('auth.adres.error.cok_deneme'),
    'email rate limit exceeded': t('auth.adres.error.cok_deneme'),
    'For security purposes, you can only request this after': t('auth.adres.error.cok_deneme'),
  };
  for (const [en, localized] of Object.entries(errors)) {
    if (msg.toLowerCase().includes(en.toLowerCase())) return localized;
  }
  return msg;
}

