import { createClient } from '@supabase/supabase-js';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Chart.js ana bundle'da DEĞİL: register listesiyle birlikte js/ext/chart.js
// sidecar'ına taşındı (bundle diyeti). Tüketiciler ensureExt('chart') ile alır.
marked.setOptions({ breaks: true });

export { marked, DOMPurify };

// Proje-içi statik asset (public/emre-portre.png) — önceki harici hotlink (hizliresim.com)
// 2026-07-24'te 404 verdi; tek nokta arızasını önlemek için yerelleştirildi.
export const EMRE_IMG = 'emre-portre.png';
export const SUPABASE_URL = 'https://utfphfifkgfrrsifrzjc.supabase.co';
export const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0ZnBoZmlma2dmcnJzaWZyempjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDYzMzUsImV4cCI6MjA5MDk4MjMzNX0.lnySmOfaKJq1zRfNG1SQkrDVt4TGiVgbHyFaPXWzGqs';
export const EDGE_FN_BASE = `${SUPABASE_URL}/functions/v1`;
export const ADMIN_EMAIL = 'admin@emrekocluk.com';

// Yönetim paneli ayrı sayfada yaşar (admin.html — build.sh index.html'den üretir,
// aynı bundle). Boot bu bayrağa göre app kabuğunu hiç açmadan doğrudan admin
// görünümüne iner. Dev sunucusunda admin.html bulunmadığından ?admin=1 de geçerli.
export const IS_ADMIN_PAGE = (typeof window !== 'undefined') && (
  /(?:^|\/)admin\.html$/.test(window.location.pathname) ||
  new URLSearchParams(window.location.search).get('admin') === '1'
);

// Web Push VAPID public key (uncompressed P-256 point, base64url).
// Eşi olan PRIVATE key Supabase Edge Function secret'ında (VAPID_PRIVATE_KEY) tutulur —
// asla client'a/repo'ya konmaz. Çift yenilenirse buradaki public da güncellenmeli.
export const VAPID_PUBLIC = 'BJyHCC7vULiSbzbiibRTJ1uGFotZpwt2w5sCNrdZDEI1WiZm30GAKrMHhFSwX-Z-AJhA7iePuFPfO3h-tTJXTGA';
export const SUMMARY_MODEL = 'deepseek-v4-flash';
export const CHAT_MODEL    = 'deepseek-v4-flash';

// LLM fallback zinciri: primary fail → secondary → tertiary
export const LLM_FALLBACK_CHAIN = Object.freeze([
  'deepseek-v4-flash',            // primary
  'google/gemini-2.0-flash-001',  // secondary (hata sonrası)
  'meta-llama/Llama-3.3-70B-Instruct-Turbo', // tertiary
]);

// Prompt sistem versiyonu — log ve analytics için
// 4.0.0 (FAZ 3, .claude/plans/mod-sistemi.md): prompt.mode.guide tek dev belgeden
// Omurga+Kartuş mimarisine ayrıldı (identity.core + mode.protocol + mode.card.<mode>×6).
export const PROMPT_VERSION = '4.0.0';

// Dinamik token limitleri — moda göre
export const TOKEN_LIMITS = Object.freeze({
  casual:      280,
  standard:    400,
  deep_emotion:500,
  crisis:      600,
  depth:       700,
  pattern:     500,
});

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

export const AI_MODES = {
  SOFT: 'soft',
  DIRECT: 'direct',
  REFLECTIVE: 'reflective',
  CELEBRATE: 'celebrate',
  PATTERN: 'pattern',
  DEPTH: 'depth',
};

// Mod başına sıcaklık — davranışsal modun tonuna göre (hint henüz kesin karar değil,
// LLM'in kendi [MOD:] kararı gelene kadarki en iyi tahmin; bkz. 06-summary-chat _runLLMTurn).
export const MODE_TEMPS = Object.freeze({
  [AI_MODES.SOFT]:       0.85,
  [AI_MODES.DIRECT]:     0.65,
  [AI_MODES.REFLECTIVE]: 0.80,
  [AI_MODES.CELEBRATE]:  0.90,
  [AI_MODES.PATTERN]:    0.75,
  [AI_MODES.DEPTH]:      0.80,
});

/* Duygu Motoru (13D, FAZ 7 — K8 "ritim" kanalı, .claude/plans/duygu-motoru.md).
   Üç tablo TEK yerde durur ki FAZ 8 kalibreyi buradan yapsın (plan Riskler
   maddesi: "sayıları adlandırılmış sabitlere koy"). K9 PAZARLIKSIZ: `tutma`
   (kriz) hiçbirinde YOK — kriz anında sıcaklık, uzunluk ve akış hızı yalnız
   mod/bağlam bütçesinden gelir, karşılamadan asla etkilenmez; 06'daki
   `eksen !== 'tutma'` bekçisi bunu ayrıca (tabloda unutulsa bile) korur.
   Sayılar bu fazda MUHAFAZAKÂR SABİTTİR — K2 tablosunun "Ne verir"
   sütunundan türetildi (icat edilmedi), ama kesin dozu (kaç ms, kaç derece)
   FAZ 8'in ürüne bakarak yapacağı kalibredir; burada yalnız kanal AÇILIYOR. */

// Karşılama başına sıcaklık — Stüdyo ayarının ALTINDA, mod tahmininin
// ÜSTÜNDE devreye girer (06 _runLLMTurn). Sakin eksenler düşük, coşkulu
// eksenler yüksek; MODE_TEMPS'in 0.65-0.90 aralığına sadık kalındı, yalnız
// yatıştırma biraz altına indi çünkü taşmayı indirmek MODE_TEMPS'in en
// düşüğünden (DIRECT 0.65) daha sıkı bir kontrol ister.
export const DG_TEMPS = Object.freeze({
  yatistirma: 0.60,
  berraklik:  0.65,
  taniklik:   0.70,
  sahiplenme: 0.75,
  diriltme:   0.80,
  kutlama:    0.90,
});

// Karşılama başına yanıt uzunluk TAVANI (token) — TOKEN_LIMITS'in (bağlam
// bütçesi) hesapladığı değerin ÜSTÜNE binen bir Math.min çatısı: onu asla
// YÜKSELTMEZ, yalnız gerektiğinde alçaltır. Üç eksenin dozu K2'nin kendi
// metninden: yatıştırma "kısa" · berraklık "orta" · tanıklık "kısa-orta"
// (plan FAZ 7 metninin AÇIKÇA yönünü verdiği üç eksen). kutlama K2'nin
// "anı büyütme"sini kırpmasın diye en geniş bağlam bütçesine (depth=700)
// eşit tutuldu — pratikte hiçbir modda kırpmaz, yalnız tabloyu tamamlar.
//
// FAZ 8 KALİBRESİ — sayılar YÜKSELTİLDİ (220/200 → 300). Gerekçe: token
// tavanı bir ÜSLUP kolu değil, KAÇAK önleyicidir; kesişi serttir ve
// yanlışının bedeli ekranda görünür — cümle ortasında biten bir yanıt.
// Kısalığı taşıyan şey kartuşun kendisidir ("Kısa cümleler kur", FAZ 6),
// tavan yalnız kaçağı tutar. İlk sayılar uygulamanın kendi en dar
// bütçesinin (TOKEN_LIMITS.casual = 280) bile ALTINA iniyordu; üstelik en
// sık eşleşme `deep_emotion` bağlamı (500) ile `yatistirma` eksenidir —
// yani taşan birinin yanıtı tam da en hassas anda yarıda kesilebilirdi.
// Yeni taban 300: casual'ın üstünde, sıralama korunuyor, tavan hâlâ
// standard'ı (400) ve deep_emotion'ı (500) gerçekten kısıyor.
export const DG_TOKEN = Object.freeze({
  yatistirma: 300,
  diriltme:   300,
  taniklik:   380,
  sahiplenme: 400,
  berraklik:  480,
  kutlama:    700,
});

// Karşılama başına akış (streaming render) hızı — yalnız plandan AÇIKÇA
// yönü verilen iki uçta dolduruldu ("yatıştırmada yavaş ve düzenli,
// kutlamada çabuk"); ötekiler 06'nın varsayılan RENDER_MIN_INTERVAL'ında
// (60ms) kalır, tahminle doldurulmadı. ms büyüdükçe metin daha seyrek/iri
// parçalarla belirir (yavaş + düzenli); küçüldükçe neredeyse anında akar.
export const DG_RENDER_MS = Object.freeze({
  yatistirma: 140,
  kutlama:    35,
});

window.Capacitor = window.Capacitor || { isNativePlatform: () => false, getPlatform: () => 'web' };
