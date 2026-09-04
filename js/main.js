/**
 * WANDERER — Vite ES Module Entry Point
 *
 * Tüm modüller buradan import edilir. Vite bu dosyayı bundle eder.
 * HTML onclick handler'ları tüm modüller yüklendikten sonra window'a atanır.
 *
 * Yükleme sırası (bağımlılık grafiğine göre):
 *   infra → state/config → i18n → tracking → features → extras → boot
 */

// ── Boot Nabzı (00h) — EN BAŞTA: bağımlılığı olmadığı için ilk çalışan modül
// olur ve `bn:exec-bas` çentiğini zincirin gerçek başında atar (00h §4).
import { bnMark } from './parts/00h-boot-nabzi.js';
// ── Kanıt Bekleyen Alanlar (00i) — kanıtı gelmemiş alan konuşmaz. Saf yaprak,
// kendiliğinden boot eder; zincirin ucunda 03 `kbSerbest()` ile kalanı bırakır.
import './parts/00i-kanit-bekleyen.js';

// ── Foundation (sıfır bağımlılık) ────────────────────────────────────────────
import './parts/00a-infrastructure.js';
import './parts/00b-indexeddb.js';
import { safeHTML, setHTML, setText, safeMarkdownHTML } from './parts/00c-html-safe.js';
import './parts/00d-native-shell.js'; // Native cila: klavye lift + status bar (web'de no-op)
import './parts/00e-native-push.js';  // Native push köprüsü (APNs/FCM token); web'de no-op
import './parts/00g-topbar-yildizlari.js'; // Maybach tavanı: her .ws-topbar'a yıldız katmanı (saf görsel, kendiliğinden boot)
import { exportUserData, deleteUserAccount } from './parts/gdpr.js';

// ── Shared State & Config (npm paketleri + sabitler) ─────────────────────────
import { S }  from './state.js';
import { sb } from './config.js';

// ── i18n — State ve infra'ya bağımlı ─────────────────────────────────────────
import './parts/15-i18n.js';
import './parts/16-i18n-prompts.js';

// ── Core App Modules ──────────────────────────────────────────────────────────
import './parts/00-config-tracking.js';
import './parts/01-prompts-modes.js';
import './parts/02-features-onboarding.js';
import './parts/03-auth-shell.js';
import './parts/04-llm-hero-history.js';
import './parts/05-closure-parts.js';
import './parts/06-summary-chat.js';
import './parts/07-settings-knowledge.js';
import './parts/08-trends-payment.js';
import './parts/09-reports-tracks.js';
import './parts/09a-personalization-engine.js';
import './parts/09b-depth-foundations.js';
import './parts/09c-memory-panel.js'; // Emre'nin Hafızası paneli — boot'ta window.memPanel* açar
import './parts/09d-oruntu-motoru.js'; // Örüntü Motoru — boot'ta window.om* açar
import './parts/09e-yasayan-portre.js'; // Yaşayan Portre — boot'ta window.yp* açar
import './parts/09f-epizodik-hafiza.js'; // Epizodik Hafıza — boot'ta window.eh* açar
import './parts/09g-ayna-protokolu.js'; // Ayna Protokolü — boot'ta window.ap* açar
import './parts/09h-ayna-ani.js'; // Ayna Anı töreni — boot'ta window.ay* açar
import './parts/09i-secici.js'; // Tanıma Motoru · Seçici — boot'ta window.sec* açar
import './parts/09j-hatirla.js'; // Hatırla — boot'ta window.ht* açar (mühürlü sözler)
import './parts/10z-w2-ses.js'; // Ses katmanı (dikte + sesli okuma) — boot'ta window.ses* açar
import './parts/13a-arac-motoru.js'; // Araç motoru (Wanderer'ın elleri) — window.arac* + takipAsk açar
import './parts/13b-calisma-kagidi.js'; // Çalışma Kağıdı artifact'i — window.ck* açar
import './parts/13c-gorsel-ekleme.js'; // Görsel ekleme (vision client) — window.gorsel* açar
import './parts/13d-mektup.js'; // Gezgine Mektup — window.mektup* + saveMektup açar
import './parts/13D-duygu-motoru.js'; // Duygu Motoru (büyük D — 13d-mektup ile KARIŞTIRMA) — Nabız çekirdeği; window.dg* açar; 00/09a doğrudan da import eder
import './parts/13e-his-motoru.js'; // His Motoru (haptik + imza sesleri) — window.fx* açar
import './parts/13f-zaman-dokusu.js'; // Zaman Dokusu (saate duyarlı ambient) — window.twSync açar
import './parts/13g-paylasim.js'; // Paylaşım Motoru (story kartı + Share) — window.shrShareStory açar
import './parts/13h-aksam-toreni.js'; // Akşam Kapanış Töreni — window.at* açar
import './parts/13i-meclis-toplantisi.js'; // Haftalık Meclis Toplantısı — window.mt* açar
import './parts/13j-wrapped.js'; // Wanderer Wrapped (Ayın Filmi) — window.wr* açar
import './parts/13k-widget-koprusu.js'; // Widget Köprüsü (native ana ekran) — window.wk* açar
import './parts/13l-kimlik-motoru.js'; // Kimlik Motoru (Olduğun Kişi çözücüsü) — window.im* açar
import './parts/13m-kota.js'; // Kota Motoru (5 saatlik pencere + haftalık tavan) — window.kt* açar
import './parts/13n-indirme-baglantilari.js'; // Uygulama indirme bağlantıları (admin + paylaşım) — window.saveAppDownloadLinks açar
import './parts/13o-geri-cagri.js'; // Geri Çağrı Motoru (in-session sessizlik → kişisel davet) — window.gc* açar
import './parts/13p-hukuk.js'; // Hukuki Çerçeve (Koşullar/Gizlilik/Fikri Mülkiyet) — window.hk* + mountHukukUI açar
import './parts/10-features-w2.js';
import './parts/10A-gecis-karti.js'; // GEÇİŞ KARTIM (iç ad gecis-karti) — TEK Atölye (Bugün + Sohbet kapıları), paylaşım, koleksiyon — window.ak* + loadKendiKoleksiyonumView açar
import './parts/10B-ilham-karti.js'; // SOHBET KÖPRÜSÜ (eski İlham Kartı; 2026-06-21 10A omurgasına gömüldü) — yalnız ilhamRumuz + Emre chip → gkOnboard(seed,{source:'sohbet'})
import './parts/10F-on-suzgec.js'; // ÖN SÜZGEÇ — yayın öncesi tek bakış (kimlik + kriz); window.szDenetle, 10C/10A çağırır
import './parts/10C-sosyal-feed.js'; // KİŞİLERİN KİŞİLERİ — sosyal feed (beğeni/yorum/koleksiyona) — window.sf* + loadSosyalView açar
import './parts/10D-olmak-istedigin.js'; // OLMAK İSTEDİĞİN KİŞİ — kendi tasarladığın hedef kimlik + Geçiş Protokolü ritüeli (Geçiş Alanı 10j halefi) — window.oik* açar
import './parts/10p-w2-meclis.js';
import './parts/12e-isik-nisanlari.js'; // ALFABE IŞIK — fısıltı→nişan dönüşüm töreni (Şeytanla Savaş) — window.isik* + loadIsikView açar
import './parts/10g-w2-wanderer-game.js';
import './parts/10r-w2-cazibe.js'; // Cazibe Motoru (Cialdini) — boot'ta window.cz* açar
import './parts/13u-soz-defteri.js'; // Söz Defteri — verilen sözün hafızası; 10s'ten ÖNCE (window.sd* hazır olsun)
import './parts/13v-ihtiyac-motoru.js'; // İhtiyaç Motoru — Söz/Armağan'ın eksenini seçer; window.ih* açar
import './parts/13w-soz-terzisi.js'; // Söz Terzisi — yarının sözünü gece dokur; window.st* açar
import './parts/13x-mesafe-motoru.js'; // Mesafe Motoru (Aradaki Yol: niyet ağırlığı + Ana Mesafe) — window.ms* açar; 10q'dan ÖNCE
import './parts/13y-koken.js'; // Köken Motoru (kanıtsız değer YOKTUR: beyan/olcum/yorum/yok) — window.koken* açar; tüketiciler ayrıca doğrudan import eder
import './parts/13z-imge-kapisi.js'; // İmge Kapısı (Zaltman — kullanıcının kendi metaforu) — window.ig* açar; hidrasyon post-auth (03 igInit)
import './parts/10s-w2-gunluk-ritus.js'; // Günlük Ritüel (Armağan+Söz pop-up) — boot'ta window.gl* açar
import './parts/10t-w2-seri-muhru.js'; // Seri Mührü (günü mühürleme töreni + kilometre kartları) — window.sm* açar
import './parts/10u-w2-ultra-seri.js'; // Ultra Seri (3 mühür: Seri/Hayal/Söz + split kart + çember) — window.us* açar
import './parts/10f-w2-yol.js'; // Yol (İki Kart Arasındaki Yol: Üç Mühür hero + Yol ekranı) — window.yol* açar
import './parts/13s-gecis-yolu.js'; // Geçiş Yolu (21 günlük yolculuk pusulası — mevcut organlara yönlendirir) — window.gy* açar
import './parts/13t-donusum-aynasi.js'; // Dönüşüm Aynası (90 günlük Geçiş Belgeseli — mevcut veriden derler) — window.gb* açar
import './parts/13A-derin-calisma.js'; // Derin Çalışma — tezgâh alanı (Max katmanı); init 03 post-auth'ta — window.dc* açar
import './parts/13B-karsilasma.js'; // Karşılaşma — iki ana kartın tam ekran odası (üç sayfa + dikey deste akışı) — window.kar* açar
import './parts/10E-w2-gordun.js'; // Gördün (Pencereden Bakış — Üç Mühür'ün HAYAL vuruşu) — window.gorOpen açar
import './parts/10v-w2-manifesto-reader.js'; // Manifesto Okuma Ritüeli (Hayal + 12 Mühür) — window.mr* açar
import './parts/10i-w2-hayal-alemi.js';
import './parts/11-w2-chat-cal.js';
import './parts/12-w3-journey.js';
import './parts/12a-archetypes.js';
import './parts/12d-kart-uretim.js'; // Kart Üretim Motoru (sahne bestecisi) — window.kum* açar
import './parts/12f-hazine-paketleri.js'; // Hazine Destesi (paket motoru — bilgelik kartları) — boot'ta hazineReady() ister, window.hz* FAZ2'de açar
import './parts/00f-kullanim-nabzi.js'; // Kullanım Nabzı (Gözlemevi telemetrisi) — window.wtOverlay* açar

// ── Extras (monkey-patching — orijinallerden sonra gelmeli) ───────────────────
import './parts/13-extras.js';

// ── Boot (son! — IIFE uygulamayı başlatır) ────────────────────────────────────
import './parts/14-boot.js';

// ═════════════════════════════════════════════════════════════════════════════
// Named imports — HTML onclick handler'ları için window atamaları
// 13-extras.js'in wrap ettiği fonksiyonlar orijinallerin önüne geçer.
// ═════════════════════════════════════════════════════════════════════════════

// 13-extras.js — sadece özgün davranışlar (registerChatHooks 14-boot'ta hook'ları register eder).
// Tüm wrap'ler söküm edildi (Faz 2.1+2.1b). updateModeBadge hook'larla genişler.
import {
  updateModeBadge,
  chatOpenerDismiss,
  vesperTap,
  icClose,
  icOverlayClick,
  icSend,
  icHandleKey,
  icHandleInput,
  icMaybeRitualReopen,
  msgResistanceDotHTML,
  msgResistanceDotClick,
  handleCrisisIfNeeded,
  getCrisisContext,
  showCrisisCard,
  getSafetyGuards,
  detectCrisis,
  showHayattakiSen,
  showHesapGunu,
} from './parts/13-extras.js';
// Faz 2.1+2.1b: wrap edilen tüm fonksiyonlar artık orijinal modüllerden gelir.
import { switchView } from './parts/03-auth-shell.js';
import { sendMessage, appendMsg, startStreamingMsg } from './parts/06-summary-chat.js';
import { w2RenderInfiniteChat } from './parts/11-w2-chat-cal.js';
import { showMicroOnboarding } from './parts/09-reports-tracks.js';

// 03-auth-shell.js
import {
  initApp,
  authEsigeDon,
  // Kod kapısı (adres hem anahtar hem adres)
  authAdresAc,
  authKodIste,
  authKodDogrula,
  authKodTekrar,
  authAdresDegistir,
  authKodHane,
  authKodTus,
  authKodYapistir,
  // Kestirme kapılar (Google/Apple) — aynı adrese, aynı tanışma kapısına düşer
  doOAuth,
  authHandleOAuthUrl,
  // Tanışma (kapının ardından — kimlik değil adres/ad sorulur)
  authTanismaGonder,
  authTanismaIptal,
  authTanismaAdInput,
  doLogout,
  newSession,
  toggleMenu,
  previewAvatar,
  saveUserSettings,
  saveApiKey,
  showPremiumFeatureSpotlight,
  closePremiumSpotlight,
} from './parts/03-auth-shell.js';

// 06-summary-chat.js
import {
  dismissSummary,
  proceedToMood,
  requestChatExit,
  quoteSelection,
  showModeInfo,
  submitFeedback,
} from './parts/06-summary-chat.js';

// 08-trends-payment.js
import {
  handleKey,
  autoResize,
  closePayment,
  startPayment,
  startOfferA,
  startOfferB,
  openGateOverlay,
  closeGateOverlay,
  initPricing,
  initStoreBilling,
  restorePurchases,
  manageSubscription,
  closeCancelIntent,
  confirmCancelIntent,
  downgradeToProFromMax,
  switchToYearly,
  pricingState,
  offerADeadlineMs,
  kapiAralikDaysLeft,
  openShareCard,
  downloadShareCard,
  nativeShareCard,
  shareTransformationCard,
  userFriendlyError,
  toastError,
} from './parts/08-trends-payment.js';

// 07-settings-knowledge.js
import {
  savePersona,
  saveSettings,
  meToggle,
  renderMerhabaEmre,
  saveKnowledge,
  updateKnowledge,
  deleteKnowledge,
  toggleKb,
  switchAdmin,
  adminShowHome,
  adminNavBack,
  adminExitToApp,
  addManualNote,
  saveNoteEdit,
  deleteNote,
  exportNotes,
  filterNotes,
  openNoteDetail,
  saveToNotebookMsg,
  switchNoteTab,
  shareMessage,
  sendPush,
  acctBultenToggle,
} from './parts/07-settings-knowledge.js';

// 09-reports-tracks.js
import {
  saveTogetherKey,
  markHomework,
  startTrack,
  generateHomework,
} from './parts/09-reports-tracks.js';

// 10-features-w2.js — views + drawer/profile (library/challenges 10h'a taşındı)
import {
  w2OpenDrawer,
  w2CloseDrawer,
  w2Nav,
  w2CloseProfile,
  wsTab,
  loadBugunView,
  loadMuhrumView,
  updateChatIdentityBanner,
  wsSyncStudio,
} from './parts/10-features-w2.js';
import {
  startSeferForBoss,
  loadChallenges,            // Sefer durumu — 13A #dc-sefer okur
  completeChallengeDay,
  seferBugunMuhurlendi,
  seferGorevleri,
  getSeferPrompt,
} from './parts/10h-w2-library-challenges.js';
import {
  downloadGradCert,
  shareGradCert,
  shareReferral,
} from './parts/10b-w2-gamification.js';
// İç Meclis · Suretler (10p)
import {
  loadMeclisView,
  openSuretCard,
  meclisCloseDetail,
  openAdlandirma,
  meclisCancelAdlandirma,
  saveSuretAd,
  dismissSuret,
  meclisYuzlesme,
  meclisStartSefer,
  meclisSealSeferDay,
  meclisOpenDialog,
  meclisDialogSend,
  meclisCloseDialog,
  meclisButunles,
  meclisCloseButunlesCeremony,
  meclisSealToOik,
  meclisDownloadMuhur,
  meclisOpenKanit,
  meclisSaveKanit,
  meclisOpenDerinlik,
  meclisRemeasure,
  meclisOpenElleSezis,
  meclisSaveElleSezis,
} from './parts/10p-w2-meclis.js';
// Alfabe Işık (12e)
import {
  loadIsikView,
  renderIsikSalonu,
  isikOpenNisan,
  isikSeal,
  isikCancelCeremony,
  isikSetAmbient,
  isikGetContext,
  isikMatchNisan,
  isikIsWritten,
  isikLastWritten,
} from './parts/12e-isik-nisanlari.js';
import {
  renderAynaCard,
  aynaSaveKanit,
  aynaEdit,
  aynaOpenKanit,
  announceAck,
  renderLibraryBannerAdmin,
  saveLibraryBanner,
  wgInit,
  loadAynaView,
  libOpenReader,
} from './parts/10g-w2-wanderer-game.js';
import {
  haInit,
  hayalAcSeans,
  hayalKapatSeans,
  hayalSecKavram,
  hayalGecAdim3,
  hayalMuhurleSahne,
  hayalAcHarita,
  hayalKapatHarita,
  hayalAcKart,
  hayalKapatKart,
  loadHayalSeansView,
} from './parts/10i-w2-hayal-alemi.js';
// 10j Geçiş Alanı → 10D Olmak İstediğin Kişi'ye emekli edildi (window.oik*).
import {
  skOpen,
  skClose,
  skSelectSet,
  skFinish,
  skToggleRecord,
  skPlayRecording,
  skBridgeToGecis,
  loadKonusmaView,
} from './parts/10k-w2-kendinle-konusma.js';
import {
  rvOpen,
  rvClose,
  rvSelectPeriod,
  rvFinish,
  loadDegerlendirmeView,
} from './parts/10l-w2-degerlendirme.js';
import {
  engOpen,
  engClose,
  engToggle,
  engStartSefer,
  engToGecisCard,
  engJumpToSuret,
} from './parts/10m-w2-engeller.js';
import {
  loadDinlenmeView,
  dnAdd,
  dnDelete,
  dnSetImpact,
  getDinlenmeStats,
  dnPickPhoto,
  dnPhotoSelected,
  dnRemovePendingPhoto,
  dnOpenEntry,
  dnCloseLightbox,
  dnOpenPhotoZoom,
  dnClosePhotoZoom,
} from './parts/10n-w2-dinlenme.js';

// 12a arketip-view (loadArketipView) → Olmak İstediğin Kişi (10D) ekranına emekli edildi.
// 12a modülü DURUYOR: getArchetypeById/getAllArchetypeData/getSuggestedArchetype/
// wsArchFigure/wsArchFigureBody/EMRE_ONERI hâlâ canlı (12b/12c/10q/09b/13l vb.).

// 10q-w2-kisi-karti.js — Kişi Kartı motoru + "Kişilerim" kart koleksiyonu
import {
  loadKisilerimView,
  loadKisilerView,
  kkOpenDetail,
  kkOpenPack,
  kkTick,
  getKisilerimStats,
  kkHedefMuhurle,
  kkHedefSok,
  kkGetHedefler,
  kkIsHedef,
  // Oluş Mührü (K2) — kazanımın TEK kapısı + öneri rafı okuma yüzeyleri
  kkMuhurle,
  kkEsikDurum,
  kkEsikListe,
  kkOneriRafi,
  kkEsikNisanHTML,
} from './parts/10q-w2-kisi-karti.js';

// 10q2-kisilerim-bugun.js — Bugün'ün iki destesi (Kişilerim'in Bugün penceresi).
// Kendi window bloğunu kurar; buradaki import onu grafiğe sokar.
import { kkDesteAltin, kkDesteLapis } from './parts/10q2-kisilerim-bugun.js';

// 10q4-olus-muhru.js — Oluş Mührü davet töreni ("kart dağıtılmaz, beyan edilir").
// Kendi window bloğunu kurar; 10q onu window.olusDavetSun üzerinden çağırır.
import './parts/10q4-olus-muhru.js';

// 10q3-benlik-yapisi.js — Kişilerim'in "YAPI" merceği (INWO güç yapısı → besleme
// ağacı). Kendi window bloğunu kurar; 10q onu window.byRender üzerinden çağırır.
import './parts/10q3-benlik-yapisi.js';

// 12f-hazine-paketleri.js — Hazine Destesi (bilgelik kartları, paket motoru)
import {
  loadHazineView,
  hzOpenCardDetail,
  hzBuyPack,
} from './parts/12f-hazine-paketleri.js';

// 02c-portre.js — Portre (Kendi Kartını Oluştur) onboarding + görünüm
import {
  runPortreOnboarding,
  buildPortreContext,
  porLoad,
  porSave,
  porGetContext,
  porSessionEnrich,
  porRemoveEntry,
  porAddFromView,
  porCardName,
  porAbsorbCard,
  porReleaseCard,
  porResynth,
  porToggleEvrim,
  porBackfillAccept,
  porBackfillDismiss,
  loadPortreView,
  showEntryCards,
} from './parts/02c-portre.js';

// 02d-esik-ekrani.js — Eşik Ekranı: girişte iki kart (şimdi ↔ hedef)
import { esikShow, esikShowOnce } from './parts/02d-esik-ekrani.js';

// 10o-w2-feature-gate.js — kapı animasyonu + ilk giriş tanıtım videosu
import { featureEnter, fgateReset, saveFeatureVideos } from './parts/10o-w2-feature-gate.js';

// 10w-w2-odak-modelleri.js — Wanderer Modelleri (Öz/Bağ/Eser) + Model Stüdyosu
import { fmOpenPicker, fmClosePicker, fmSelectModel, saveFocusModels, fmRenderControls, fmGetActive, fmGetActiveId } from './parts/10w-w2-odak-modelleri.js';

// 10y-w2-llm-shell.js — Dil modeli kabuğu: ana kart flip + claude-tarzı ana ekran
import { wsFlipTo, llmStarterSend, llmSendStarter, llmRenderHome, llmHomeAc, llmSyncHome, llmContinueToday, llmLeaveHome, llmHomeCascade, wsCascadeBugun, llmFocusComposer } from './parts/10y-w2-llm-shell.js';

// 10x-w2-bildirimler.js — Gerçek Web Push (uygulama kapalıyken geri çağırma)
import {
  bildirimToggle,
  bildirimTest,
  bildirimEnable,
  bildirimBroadcast,
  bildirimRenderSettings,
} from './parts/10x-w2-bildirimler.js';

// 05-closure-parts.js
import {
  openDailyClosure,
  closeDailyClosure,
  closureRecordTransition,
  goToClosureStep,
  closureSelectMood,
  closureSelectRegion,
  closureSelectSensation,
  closureSelectIntensity,
  updateClosureSaveBtn,
  saveDailyClosure,
  closureSealAndClose,
  loadSomaticHistory,
} from './parts/05-closure-parts.js';

// 02-features-onboarding.js

// 04-llm-hero-history.js
import {
  w2ScrollTop,
  recomputeStreakUI,
} from './parts/04-llm-hero-history.js';

// 11-w2-chat-cal.js
import {
  w2GenerateDaySummary,
  w2LoadSummariesCache,
  w2ScheduleMidnightSummary,
  chDrawerOpen,
  chDrawerClose,
  chDrawerBackToList,
  chDrawerOpenDay,
  chDrawerViewFull,
  chDrawerProfile,
  chDrawerSearchInput,
  chSearchToggle,
  chDrawerOpenChat,
  chDrawerDeleteDay,
  renderDaySummaryHTML,
} from './parts/11-w2-chat-cal.js';

import {
  w3GetChapters,               // Dönüşüm Hattı — DOM'suz okuyucu (13A #dc-hat tüketir)
  w3GetChaptersCached,
  toRoman,                     // bölüm numarası — 13A ikinci çevirici yazmasın
  w3MaybeRunMigration,
  w2CheckAndSummarizeYesterday, // v3 override — replaces 11-w2-chat-cal.js version
} from './parts/12-w3-journey.js';

// 00-config-tracking.js
import {
  updateAIMode,
  triggerModeFlash,
  setAmbientAura,
  getModeHintLabel,
  buildModeSelectionGuide,
  getUserMsgCount,
  getAllMessages,
} from './parts/00-config-tracking.js';

// 15-i18n.js
import {
  openLangPicker,
  closeLangPicker,
  setLanguage,
  requestLangChange,
  closeLangConfirm,
  openLangGate,
  langBeyanVar,
  t,
} from './parts/15-i18n.js';

// ═════════════════════════════════════════════════════════════════════════════
// window global atamaları — HTML onclick="xxx()" çağrıları için zorunlu
// ═════════════════════════════════════════════════════════════════════════════
Object.assign(window, {
  // Auth & Navigation
  authEsigeDon,
  doLogout, newSession,
  authAdresAc, authKodIste, authKodDogrula, authKodTekrar, authAdresDegistir,
  authKodHane, authKodTus, authKodYapistir,
  doOAuth, authHandleOAuthUrl,
  authTanismaGonder, authTanismaIptal, authTanismaAdInput,
  switchView, initApp,
  toggleMenu,
  previewAvatar, saveUserSettings, saveApiKey,
  showPremiumFeatureSpotlight, closePremiumSpotlight,

  // Chat & Messaging
  sendMessage, appendMsg, startStreamingMsg,
  handleKey, autoResize,
  requestChatExit,
  dismissSummary, proceedToMood,
  quoteSelection, showModeInfo, submitFeedback,

  // Closure / EOD
  openDailyClosure, closeDailyClosure, closureRecordTransition,
  goToClosureStep, closureSelectMood, closureSelectRegion,
  closureSelectSensation, closureSelectIntensity,
  updateClosureSaveBtn, saveDailyClosure, closureSealAndClose,
  loadSomaticHistory,

  // Summary & Session
  w2ScrollTop,

  // Settings & Knowledge
  savePersona, saveSettings, meToggle, renderMerhabaEmre,
  saveKnowledge, updateKnowledge, deleteKnowledge, toggleKb,
  switchAdmin, adminShowHome, adminNavBack, adminExitToApp, shareMessage,
  saveFeatureVideos,
  // Hesap köprüsü (047 — FAZ 10)
  acctBultenToggle,
  // Bildirimler · Web Push (10x)
  bildirimToggle, bildirimTest, bildirimEnable, bildirimBroadcast, bildirimRenderSettings,
  fmOpenPicker, fmClosePicker, fmSelectModel, saveFocusModels, fmRenderControls, fmGetActive, fmGetActiveId,
  // Dil modeli kabuğu (10y) — ana kart flip + ana ekran
  wsFlipTo, llmStarterSend, llmSendStarter, llmRenderHome, llmHomeAc, llmSyncHome, llmContinueToday, llmLeaveHome, llmHomeCascade, wsCascadeBugun, llmFocusComposer,
  addManualNote, saveNoteEdit, deleteNote, exportNotes,
  filterNotes, openNoteDetail, saveToNotebookMsg, switchNoteTab, sendPush,

  // Payment & Trends
  startPayment, startOfferA, startOfferB, closePayment,
  openGateOverlay, closeGateOverlay,
  initPricing, initStoreBilling, restorePurchases, manageSubscription,
  closeCancelIntent, confirmCancelIntent,
  downgradeToProFromMax, switchToYearly,
  pricingState, offerADeadlineMs, kapiAralikDaysLeft,
  openShareCard, downloadShareCard, nativeShareCard,
  shareTransformationCard,
  userFriendlyError, toastError,

  // Reports & Roadmap
  saveTogetherKey, showMicroOnboarding,
  markHomework, startTrack, generateHomework,

  // W2 Features
  w2OpenDrawer, w2CloseDrawer, w2Nav,
  // Sefer (10h): 13A'nın `#dc-sefer` bölümü bunları window üzerinden okur —
  // 13A 10h'yi import ETMEZ (alan kabuğu ağır modüllere bağlanmasın).
  startSeferForBoss, loadChallenges, completeChallengeDay,
  seferBugunMuhurlendi, seferGorevleri, getSeferPrompt,
  downloadGradCert, shareGradCert, shareReferral,
  // Merkezî seri (ritüeller besler)
  recomputeStreakUI,
  // AÇICI SÖZLEŞMESİ (13s Geçiş Yolu): aynaOpenKanit / skOpen / rvOpen ve
  // kardeşleri (oikOpenReading, hayalAcSeans, yolOpen) window'da DURMAK
  // ZORUNDA — 13s:104 _openOrgan perdenin organını adıyla window'dan arar,
  // bulamazsa 21 günlük yol sessizce boşa düşer (uyarı bile vermez).
  // Wanderer Oyunu (10g)
  renderAynaCard, aynaSaveKanit, aynaEdit, aynaOpenKanit,
  announceAck, renderLibraryBannerAdmin, saveLibraryBanner, loadAynaView,
  libOpenReader,
  // Hayal Alemi (10i)
  hayalAcSeans, hayalKapatSeans, hayalSecKavram, hayalGecAdim3, hayalMuhurleSahne,
  hayalAcHarita, hayalKapatHarita, hayalAcKart, hayalKapatKart, loadHayalSeansView,
  // Geçiş Alanı (10j) → Olmak İstediğin Kişi (10D) — window.oik* (10D kendi expose eder)
  // Kendinle Konuşmak (10k)
  skOpen, skClose, skSelectSet, skFinish, skToggleRecord, skPlayRecording, skBridgeToGecis, loadKonusmaView,
  // Dönem Değerlendirmeleri (10l)
  rvOpen, rvClose, rvSelectPeriod, rvFinish, loadDegerlendirmeView,
  // Engel Atlası & Öz-Tanı (10m)
  engOpen, engClose, engToggle, engStartSefer, engToGecisCard, engJumpToSuret,
  // Dinlenme · Başarı Günlüğü (10n)
  loadDinlenmeView, dnAdd, dnDelete, dnSetImpact, getDinlenmeStats,
  dnPickPhoto, dnPhotoSelected, dnRemovePendingPhoto,
  dnOpenEntry, dnCloseLightbox, dnOpenPhotoZoom, dnClosePhotoZoom,
  w2CloseProfile,
  wsTab, loadBugunView, wsSyncStudio,
  // İç Meclis · Suretler (10p)
  loadMeclisView, openSuretCard, meclisCloseDetail, openAdlandirma, meclisCancelAdlandirma, saveSuretAd, dismissSuret,
  meclisYuzlesme, meclisStartSefer, meclisSealSeferDay,
  meclisOpenDialog, meclisDialogSend, meclisCloseDialog, meclisButunles, meclisCloseButunlesCeremony, meclisSealToOik,
  meclisDownloadMuhur, meclisOpenKanit, meclisSaveKanit, meclisOpenDerinlik, meclisRemeasure,
  meclisOpenElleSezis, meclisSaveElleSezis,
  // Alfabe Işık (12e)
  loadIsikView, renderIsikSalonu, isikOpenNisan, isikSeal, isikCancelCeremony,
  isikSetAmbient, isikGetContext, isikMatchNisan, isikIsWritten, isikLastWritten,
  loadMuhrumView,
  // Kişilerim — kart koleksiyonu (10q)
  loadKisilerimView, loadKisilerView, kkOpenDetail, kkOpenPack, kkTick, getKisilerimStats,
  // Hedef mührü — "Böyle bir kişi olmak istiyorum" (10q ↔ 10D lapis köprüsü)
  kkHedefMuhurle, kkHedefSok, kkGetHedefler, kkIsHedef,
  // Oluş Mührü — kazanımın TEK kapısı + eşik havuzu okuma yüzeyleri (10q)
  kkMuhurle, kkEsikDurum, kkEsikListe, kkOneriRafi, kkEsikNisanHTML,
  // Kişilerim — deste kaynağı (10q2); Bugün'deki yüzey artık hero yığınıdır
  kkDesteAltin, kkDesteLapis,
  // Hazine Destesi — bilgelik kart paketleri (12f)
  loadHazineView, hzOpenCardDetail, hzBuyPack,
  // Portre (02c) + Eşik Ekranı (02d)
  runPortreOnboarding, buildPortreContext, porLoad, porSave, porGetContext, porSessionEnrich, porRemoveEntry, porAddFromView, porCardName, porAbsorbCard, porReleaseCard, porResynth, porToggleEvrim, porBackfillAccept, porBackfillDismiss, loadPortreView, showEntryCards,
  esikShow, esikShowOnce,
  updateChatIdentityBanner,

  // W2 Gün Özetleri & Sohbet
  w2CheckAndSummarizeYesterday, w2GenerateDaySummary,
  w2LoadSummariesCache, w2ScheduleMidnightSummary,
  w2RenderInfiniteChat,

  // Sohbetler — LLM kenar çubuğu
  chDrawerOpen, chDrawerClose, chDrawerBackToList, chDrawerOpenDay, chDrawerViewFull,
  chDrawerProfile,
  chDrawerSearchInput, chSearchToggle, chDrawerOpenChat, chDrawerDeleteDay,
  renderDaySummaryHTML,

  // W3 Journey — Dönüşüm Hattı okuyucusu (çizen taraf 13A)
  w3GetChapters, w3GetChaptersCached, toRoman,

  // Extras & UI
  chatOpenerDismiss,
  showHayattakiSen,
  showHesapGunu,
  vesperTap, icClose, icOverlayClick, icSend, icHandleKey, icHandleInput, icMaybeRitualReopen,
  msgResistanceDotHTML, msgResistanceDotClick,
  updateAIMode, updateModeBadge, triggerModeFlash,
  setAmbientAura,
  getModeHintLabel, buildModeSelectionGuide,
  getUserMsgCount, getAllMessages,
  handleCrisisIfNeeded, getCrisisContext, showCrisisCard, getSafetyGuards,

  // Misc
  openLangPicker, closeLangPicker, setLanguage, requestLangChange, closeLangConfirm,
  openLangGate, langBeyanVar,

  // HTML safety helpers (used by parts/*.js via window)
  safeHTML, setHTML, setText, safeMarkdownHTML,

  // GDPR (Faz 4.2) — settings ekranındaki butonlar window'dan çağırır
  exportUserData, deleteUserAccount,

  // Dev tools (only in development)
  ...(import.meta.env?.DEV ? { _S: S, _sb: sb, _t: t } : {}),
});

// isPremium / isPremiumPlus — HTML onclick handler'ları bare "isPremium" kullanıyor.
// S.isPremium modül kapsamında; window getter ile erişim sağlıyoruz.
Object.defineProperty(window, 'isPremium',     { get() { return S.isPremium; },     configurable: true });
Object.defineProperty(window, 'isPremiumPlus', { get() { return S.isPremiumPlus; }, configurable: true });

// ═════════════════════════════════════════════════════════════════════════════
// FEATURE GATE — her özellik girişini kapı animasyonuyla (+ ilk girişte tanıtım
// videosuyla) sarmala. HTML onclick'leri değişmeden kalır; window opener'ı
// featureEnter ile değiştiriyoruz. Gerçek opener kapı/video bittikten sonra çağrılır.
// ═════════════════════════════════════════════════════════════════════════════
// NOT: gaOpenReading / skOpen / rvOpen / hayalAcSeans artık kapı (fgate) ile
// sarmalanMIYOR — bunlar "Üç Mühür → Hayal" başlıklarından kendi AYRI
// SAYFALARINA switchView ile gidiyor (popup yok); kapı/tanıtım-videosu akışı
// sayfa navigasyonuna uymuyordu ve ilk-girişte boş tanıtımda takılıyordu.
const FEATURE_GATE_MAP = {
  engOpen:         'engeller',
  openDailyClosure: 'gunu-kapat',
};
for (const [fnName, featureId] of Object.entries(FEATURE_GATE_MAP)) {
  const orig = window[fnName];
  if (typeof orig !== 'function') continue;
  window[fnName] = (...args) => featureEnter(featureId, () => orig(...args));
}
window.fgateReset = fgateReset; // dev/test: window.fgateReset('kendinle-konusma')

// Bundle'ın senkron exec'i burada biter — 120 modülün IIFE maliyeti
// `bn:exec-bas → bn:exec-son` aralığıdır (00h · Boot Nabzı).
bnMark('exec-son');
