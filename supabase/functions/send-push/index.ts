// Supabase Edge Function: send-push
// Deploy: supabase functions deploy send-push
//
// "Her An Geri Çekme" motoru — uygulama KAPALIYKEN bile kullanıcıyı geri çağıran
// gerçek Web Push gönderici. Üç mod:
//   • engine    : pg_cron tetikler (x-cron-secret). Öncelik merdiveni + sessiz saat
//                 + freq-cap ile due kullanıcıları bulur, KİŞİSEL LLM metni üretir,
//                 web-push gönderir, notification_log'a yazar.
//   • test      : kullanıcı kendi JWT'siyle çağırır → kendi cihazlarına örnek push.
//   • broadcast : admin JWT → tüm push-enabled kullanıcılara elle bildirim.
//
// SECRET'lar (Supabase → Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:…), CRON_SECRET
//   (opsiyonel kişiselleştirme) LLM_API_KEY, LLM_API_URL, LLM_MODEL
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY otomatik mevcuttur.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@emrekocluk.com';
const CRON_SECRET   = Deno.env.get('CRON_SECRET') || '';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';
const ADMIN_EMAIL   = Deno.env.get('ADMIN_EMAIL') || 'admin@emrekocluk.com';

// LLM (kişisel metin) — OpenAI-uyumlu /chat/completions. Sağlayıcı LLM_API_URL ile seçilir (LLMAPI vb.).
const LLM_API_URL = Deno.env.get('LLM_API_URL') || 'https://openrouter.ai/api/v1/chat/completions';
// Anahtar: mevcut LLM_API_KEY secret'ı önce; OPENROUTER_API_KEY geriye dönük uyum.
const LLM_API_KEY = Deno.env.get('LLM_API_KEY') || Deno.env.get('OPENROUTER_API_KEY') || '';
const LLM_MODEL   = Deno.env.get('LLM_MODEL') || 'deepseek-v4-flash';

const EMRE_IMG = 'https://i.hizliresim.com/dc6faqr.png';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
/* SÜRÜM DAMGASI (İç Çalışma 11 · boşluk A) — bu motor dört ayrı sprintte
   zenginleşti (recent_thread ithafı, haftalık örüntü, portre meselesi, "Günün
   Nuru" şablonu, mig 037 dil kilidi) ve her biri "ELLE: send-push deploy"
   notuyla kapandı. Kod ile prod arasındaki mesafe REPODAN GÖRÜNMEZ: deploy
   yapılmadıysa kullanıcılar aylardır ilk-nesil kopya alıyor olabilir ve bunu
   kimse fark etmez. Bu sabit o mesafeyi tek çağrıda ölçülebilir kılar.

   DİKKAT — damga ancak deploy edildiğinde doğrudur. Redeploy edilmemiş bir
   fonksiyonda bu satır ESKİ değeri döndürür; yani damganın kendisi de
   deploy'a bağımlıdır ve "yeni sürüm görünmüyorsa deploy edilmemiştir"
   tam olarak aradığımız sinyaldir (§6.2 — doğrulanmamış hiçbir şey
   "çalışıyor" diye raporlanmaz). Yeni bir sprint bu dosyaya dokunduğunda
   tarihi ELLE ilerletir. */
const VERSION = '2026-09-04';

/* Damga json() içinde: motorun HER yanıtı — engine/test/broadcast ve hata
   dalları dahil — sürümü taşır. Tek yere koymak, yeni bir dönüş yolu
   eklendiğinde damganın unutulmasını imkânsız kılar. */
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(
    (obj && typeof obj === 'object' && !Array.isArray(obj)) ? { ...obj, version: VERSION } : obj
  ), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

/* ───────────────────────── Yerel saat / tarih yardımcıları ───────────────────────── */
function localParts(tz: string): { dateStr: string; hour: number } {
  const now = new Date();
  let dateStr = '', hour = 0;
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz || 'Europe/Istanbul', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    });
    const p: Record<string, string> = {};
    for (const part of fmt.formatToParts(now)) p[part.type] = part.value;
    dateStr = `${p.year}-${p.month}-${p.day}`;
    hour = parseInt(p.hour, 10);
    if (hour === 24) hour = 0;
  } catch (_) {
    dateStr = now.toISOString().slice(0, 10);
    hour = now.getUTCHours();
  }
  return { dateStr, hour };
}
function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(fromISO + 'T00:00:00Z');
  const b = Date.parse(toISO + 'T00:00:00Z');
  if (isNaN(a) || isNaN(b)) return 999;
  return Math.round((b - a) / 86400000);
}
function inQuietHours(hour: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? (hour >= start && hour < end) : (hour >= start || hour < end);
}

/* ───────────────────────── Öncelik merdiveni (felsefe-hizalı) ───────────────────────── */
const MILESTONES = [7, 15, 30, 60, 120, 180, 240, 365];

/* METNİ YAZILMIŞ TETİKLER — merdivenin seçebileceği tetikler bu kümeyle sınırlı.
   Bir tetik burada YOKSA MERDİVENDE SEÇİLMEZ, ve sebebi FAZ 11 denetiminde
   ölçüldü: `sosyal` merdivenin EN ÜSTÜNDE duruyor. Metni olmadığı için
   `generateCopy` null dönüyor ve döngü `continue` ediyordu — yani kartına bir
   beğeni düşen kullanıcı, o beğeni 24 saatlik pencerede kaldığı sürece
   winback · streak_risk · soz · milestone · morning bildirimlerinin HEPSİNİ
   kaybediyordu. **Teslim edilemeyen bir basamak yalnız kendini değil,
   ALTINDAKİ HER ŞEYİ düşürür.** (FAZ 10'un chip kuralının merdivendeki hâli:
   odası boş olan kapı çizilmez.)
   FAZ 12 `sosyal`'in metnini yazdığında bu kümeye 'sosyal' ekler ve basamak
   kendiliğinden açılır. Kapı: tests/tik-atifi.test.js — merdivenin koşulsuz
   seçebildiği her tetiğin fallbackCopy'de bir `case`i olmak zorunda. */
const METNI_HAZIR = new Set(['winback', 'streak_risk', 'soz', 'milestone', 'morning']);
// sosyalVar: bu kullanıcının paylaştığı bir karta BAŞKASI tarafından bırakılmış,
// henüz görülmemiş bir beğeni/yorum var mı (bkz. loadSosyalAdaylar). İç Çalışma
// 12 · Sosyal & Paylaşım'ın kararı: bu merdivende winback'ten ÖNCE gelir — biri
// sana dokunduysa bu haber, "bir süredir yoktun" çağrısından daha güçlü bir sebep.
function pickTrigger(row: any, dateStr: string, hour: number, sosyalVar: boolean): string | null {
  const streak = row.streak || 0;
  const daysInactive = row.last_active_date ? daysBetween(row.last_active_date, dateStr) : 999;

  // 1) Sosyal dokunuş — kartına biri dokundu (Kalan Yol Haritası FAZ 11).
  //    METNI_HAZIR kapısı: metni yazılana dek (FAZ 12) bu basamak ATLANIR —
  //    yoksa altındaki beş tetiği de susturur (bkz. METNI_HAZIR).
  if (sosyalVar && METNI_HAZIR.has('sosyal')) return 'sosyal';
  // 2) Geri-çağırma — en güçlü kaldıraç (gün aralıkları eskale eder)
  if ([2, 4, 7, 14, 21, 30].includes(daysInactive) && hour >= 10 && hour <= 20) return 'winback';
  // 3) Seri-riski — akşam, serisi var ama bugün hiç gelmemiş
  if (streak >= 1 && daysInactive >= 1 && hour >= 19 && hour <= 22) return 'streak_risk';
  // 4) Verilen söz — akşam hesabı hatırlatması
  if (row.pending_soz_text && hour >= 19 && hour <= 22) return 'soz';
  // 5) Kilometre kutlaması — bugün aktif + eşik
  if (MILESTONES.includes(streak) && daysInactive === 0 && hour >= 10 && hour <= 21) return 'milestone';
  // 6) Sabah kimlik dürtüsü — yakın zamanda aktif
  if (daysInactive <= 1 && hour >= 8 && hour <= 11) return 'morning';
  return null;
}

/* ───────────────────────── Sosyal adaylar (İç Çalışma 12 · FAZ 11) ─────────────────────────
   "Yeni" ölçüsü kanıtlıdır (§6.10): son 24 saatte, kartın SAHİBİ olmayan biri
   tarafından bırakılmış bir beğeni/yorum satırı gerçekten var mı. Pencerenin
   24 saat olması freq-cap'in kendi 24 saatlik aynı-tip kısıtıyla aynı ritimde —
   daha eski bir etkileşim bir sonraki koşuda sessizce düşer (uydurulmuş bir
   "her zaman geçerli" pencere açmak yerine, motorun zaten koştuğu ritme bağlı
   kalınır; SETUP-PUSH.md: pg_cron 30 dakikada bir). */
async function loadSosyalAdaylar(): Promise<Map<string, string>> {
  const adaylar = new Map<string, string>();
  const sinceISO = new Date(Date.now() - 24 * 3600e3).toISOString();
  try {
    const [{ data: begeniler }, { data: yorumlar }] = await Promise.all([
      admin.from('paylasim_begenileri').select('user_id, card_id, created_at').gte('created_at', sinceISO),
      admin.from('paylasim_yorumlari').select('user_id, card_id, created_at').gte('created_at', sinceISO),
    ]);
    const etkilesimler = [...(begeniler || []), ...(yorumlar || [])];
    if (!etkilesimler.length) return adaylar;
    const cardIds = [...new Set(etkilesimler.map((e: any) => e.card_id))];
    const { data: kartlar } = await admin.from('paylasilan_kartlar').select('id, owner_user_id').in('id', cardIds);
    const sahibi = new Map((kartlar || []).map((k: any) => [k.id, k.owner_user_id]));
    for (const e of etkilesimler) {
      const owner = sahibi.get(e.card_id);
      if (!owner || owner === e.user_id) continue; // kendi kartına kendi etkileşimi sayılmaz
      const onceki = adaylar.get(owner);
      if (!onceki || e.created_at > onceki) adaylar.set(owner, e.created_at);
    }
  } catch (e) {
    console.warn('[send-push] sosyal aday sorgusu:', (e as Error)?.message);
  }
  return adaylar;
}

/* ───────────────────────── Freq-cap (günde max 1-2) ───────────────────────── */
async function passesFreqCap(uid: string, trigger: string): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 3600e3).toISOString();
  const { data: logs } = await admin
    .from('notification_log').select('type, sent_at').eq('user_id', uid).gte('sent_at', since);
  // test/broadcast motor bütçesini yemez — yoksa "bildirim testi" yapan
  // kullanıcı 24 saat motor bildirimlerinden mahrum kalır.
  const l = (logs || []).filter(x => x.type !== 'test' && x.type !== 'broadcast');
  if (l.length >= 2) return false;                                   // günlük tavan
  if (l.some(x => Date.now() - Date.parse(x.sent_at) < 4 * 3600e3)) return false; // min 4s aralık
  if (l.some(x => x.type === trigger)) return false;                 // aynı tip 24s'te bir
  return true;
}

/* ───────────────────────── Bağlam + kişisel LLM metni ─────────────────────────
   "İlgili konu" sözleşmesi: son ~10 günde geçen son 8 mesaj, bugün öncelikli.
   Mesajlar kronolojik olarak (eski → yeni) sıralanır; LLM bunu "son konuştuklarınız"
   olarak okur. Tek bir generic winback yerine somut bir ithafla geri çağırma.
*/
async function loadContext(uid: string) {
  const ctx: any = {};
  try {
    // Ad senkronu (§4.3): tablo mig 039'da `portre` adını aldı. Migration ELLE
    // iştir — koşmadıysa 42P01 gelir, eski ada düşülür. Hiçbir akış kırılmaz.
    let { data, error } = await admin.from('portre').select('baslik, portrait').eq('user_id', uid).maybeSingle();
    if (error?.code === '42P01') {
      ({ data } = await admin.from('benlik_karti').select('baslik, portrait').eq('user_id', uid).maybeSingle());
    }
    if (data) { ctx.baslik = data.baslik || ''; ctx.portrait = data.portrait || ''; }
  } catch (_) {}
  try {
    const { data } = await admin.from('user_profile').select('core_issue, goal').eq('user_id', uid).maybeSingle();
    if (data) { ctx.core_issue = data.core_issue || ''; ctx.goal = data.goal || ''; }
  } catch (_) {}
  // Son konuştukları — kullanıcının dönmek isteyeceği iz
  try {
    const sinceISO = new Date(Date.now() - 10 * 86400e3).toISOString();
    const { data: msgs } = await admin
      .from('chat_history')
      .select('role,content,created_at')
      .eq('user_id', uid)
      .gte('created_at', sinceISO)
      .order('created_at', { ascending: false })
      .limit(8);
    if (msgs && msgs.length) {
      const lines = msgs
        .filter(m => m && m.content)
        .reverse() // kronolojik
        .map(m => {
          const role = m.role === 'user' ? 'Kullanıcı' : 'Sen';
          const txt = String(m.content).replace(/\s+/g, ' ').slice(0, 220);
          return `${role}: ${txt}`;
        });
      if (lines.length) ctx.recent_thread = lines.join('\n');
    }
  } catch (_) {}
  // Örüntü Motoru (09d) — en taze haftalık damıtma özeti (varsa). loadSessionPatterns
  // (client, 01-prompts-modes.js) ile AYNI sözleşme: 'pme_weekly_' önekli en yeni satır.
  try {
    const { data } = await admin
      .from('user_patterns')
      .select('pattern_note, created_at')
      .eq('user_id', uid)
      .like('session_id', 'pme_weekly_%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.pattern_note) ctx.weekly_pattern = data.pattern_note;
  } catch (_) {}
  // Yaşayan Portre (09e) — SafeStorage KV üzerinden user_analytics'e otomatik
  // senkron olur (data_type='etw_yp_dosya_<uid>'); değer JSON-string olarak
  // saklanır (00a-infrastructure.js _persistToSupabase kalıbı), burada parse edilir.
  try {
    const { data } = await admin
      .from('user_analytics')
      .select('data_json')
      .eq('user_id', uid)
      .eq('data_type', `etw_yp_dosya_${uid}`)
      .maybeSingle();
    if (data?.data_json) {
      const yp = typeof data.data_json === 'string' ? JSON.parse(data.data_json) : data.data_json;
      if (yp?.cekirdek?.mesele) ctx.yp_mesele = yp.cekirdek.mesele;
    }
  } catch (_) {}
  return ctx;
}

// Push dil kilidi (mig 037) — client'taki LANG_INSTRUCTION_NAMES (15-i18n.js
// getLangInstruction) ile AYNI sözleşme; sohbet hangi dilde akıyorsa push da
// o dilde gelsin. row.lang yoksa/'tr' ise talimat eklenmez (varsayılan TR).
const LANG_NAMES: Record<string, string> = {
  en: 'English', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian',
  nl: 'Dutch', pt: 'Brazilian Portuguese', ja: 'Japanese', ko: 'Korean',
  ru: 'Russian', zh: 'Traditional Chinese', ar: 'Arabic',
};
function langInstruction(lang?: string): string {
  if (!lang || lang === 'tr') return '';
  const name = LANG_NAMES[lang] || lang;
  return ` Write entirely in ${name} — title and body both, no Turkish.`;
}

const TRIGGER_INTENT: Record<string, string> = {
  winback:     'Kullanıcı günlerdir uygulamaya gelmedi. Onu yargılamadan, "Olduğun Kişi"ye giden yola tek bir adımla nazikçe geri çağır.',
  streak_risk: 'Kullanıcının üst üste gelme serisi var ama bugün henüz gelmedi; akşam oluyor. Seriyi kaybetmemesi için sıcak, kışkırtıcı olmayan bir dürtü ver.',
  soz:         'Kullanıcı bugün bir söz (mikro-taahhüt) verdi ama akşam hesabını yapmadı. "Tuttun mu?" diye nazikçe sor.',
  milestone:   'Kullanıcı bir kilometre taşına ulaştı. Kısa, gururlandıran, kimlik-pekiştiren bir kutlama yap.',
  // Zihniyet Devrimi'ne Çağrı, deneme #152: "Bu gece uyumadan önce, bugün
  // iyi ki yapmışım diyebileceğim ne yapabilirim?" — sabah dokunuşu bu
  // soruyu O GÜNE ve kullanıcıya özel TEK cümleye damıtır, şablon değil.
  morning:     'Sabah. Kitaptaki soruyu (#152) o kullanıcıya özel, somut, TEK bir cümleye damıt: "Bu gece uyumadan önce, bugün iyi ki yapmışım diyebileceğin ne olabilir?" Generic "bugün kim olmak istiyorsun" değil — bağlamdaki (temel mesele/hedef/son konu) somut bir örnek öner.',
};

function fallbackCopy(trigger: string, row: any, ctx: any): { title: string; body: string } | null {
  const name = ctx.baslik ? ctx.baslik : 'Emre the Wanderer';
  const streak = row.streak || 0;
  switch (trigger) {
    case 'winback':
      return { title: 'Yolun seni bekliyor', body: ctx.baslik
        ? `"${ctx.baslik}" olmaya giden yol burada. Bugün tek bir adım yeter.`
        : 'Bir süredir yoktun. Bugün tek bir adımla geri dön — mesele sensin.' };
    case 'streak_risk':
      return { title: 'Serin bugün mührünü bekliyor', body:
        `${streak} günlük zincirini bugün dövmeyi unutma. Eski sen bırakırdı — sen tutuyorsun.` };
    case 'soz':
      return { title: 'Akşam hesabı', body: row.pending_soz_text
        ? `"${String(row.pending_soz_text).slice(0, 80)}" demiştin. Tuttun mu?`
        : 'Bugün verdiğin sözün hesabını gör. Tuttun mu?' };
    case 'milestone':
      return { title: `${streak} gün`, body: 'Eski sen bunu yapmazdı — demek ki değişen sensin. Devam.' };
    case 'morning':
      return { title: name, body: 'Bu gece uyumadan önce, "iyi ki yapmışım" diyeceğin ne olabilir?' };
    default:
      // Merdivenin tanıdığı ama metni henüz yazılmamış bir tetik (bugün: 'sosyal' —
      // microcopy'si Kalan Yol Haritası FAZ 12'nin işi). "morning" metnini basmak
      // yanlış bağlamda doğru cümleyi göstermek olurdu (§6.2) — içerik yoksa hiç
      // gönderilmez, uydurulmuş bir varsayılan yazılmaz (§6.10).
      return null;
  }
}

async function generateCopy(trigger: string, row: any, ctx: any): Promise<{ title: string; body: string } | null> {
  const intent = TRIGGER_INTENT[trigger];
  if (!intent) return fallbackCopy(trigger, row, ctx); // tanımsız niyet → LLM'e generic bir bağlam verilmez
  if (!LLM_API_KEY) return fallbackCopy(trigger, row, ctx);
  try {
    const persona = [
      'Sen Emre the Wanderer\'sın — bir dönüşüm koçu. Teselli etmezsin, görünür kılarsın.',
      'Çekirdek tez: "Mesele Sensin" — olduğun kişiyi değiştirirsen hayatın değişir.',
      'Şimdi kullanıcıyı uygulamaya geri çağıran TEK bir push bildirimi yazıyorsun.',
    ].join(' ');
    const who = [
      ctx.baslik ? `Kullanıcının "Olduğun Kişi" başlığı: ${ctx.baslik}.` : '',
      ctx.portrait ? `Portresi: ${ctx.portrait}.` : '',
      ctx.goal ? `Hedefi: ${ctx.goal}.` : '',
      ctx.core_issue ? `Temel meselesi: ${ctx.core_issue}.` : '',
      row.pending_soz_text ? `Bugün verdiği söz: "${row.pending_soz_text}".` : '',
      row.streak ? `Güncel serisi: ${row.streak} gün.` : '',
      ctx.recent_thread ? `Son konuştuklarınız (kronolojik, en yenisi en altta):\n${ctx.recent_thread}` : '',
      ctx.weekly_pattern ? `Bu haftanın örüntü aynası (Örüntü Motoru): ${ctx.weekly_pattern}` : '',
      ctx.yp_mesele ? `Yaşayan Portre — çekirdek okuman: ${ctx.yp_mesele}` : '',
    ].filter(Boolean).join('\n');
    const instruction =
      `${intent}\n\nKURALLAR: Türkçe yaz. Emre'nin sesiyle, kısa ve ağırlıklı. ` +
      `Eğer "Son konuştuklarınız" varsa metni o konuya somut bir ithafla bağla — generic "bir süredir yoktun" yerine, ` +
      `o konuyu okuyan ve onu doğru anda hatırlatan bir cümle kur. Asla yalvarma, asla suçlama. ` +
      `Yalnızca JSON döndür: {"title": "...", "body": "..."}. ` +
      `title en fazla 40 karakter, body en fazla 120 karakter. Emoji kullanma.` +
      langInstruction(row.lang);

    const res = await fetch(LLM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM_API_KEY}` },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: `${persona}\n\n${who}` },
          { role: 'user', content: instruction },
        ],
        max_tokens: 160,
        temperature: 0.85,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) throw new Error('llm ' + res.status);
    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(raw);
    let title = String(parsed.title || '').trim().slice(0, 60);
    let body  = String(parsed.body  || '').trim().slice(0, 160);
    if (!body) throw new Error('empty body');
    if (!title) title = 'Emre the Wanderer';
    return { title, body };
  } catch (e) {
    console.warn('[send-push] LLM copy failed, fallback:', (e as Error)?.message);
    return fallbackCopy(trigger, row, ctx);
  }
}

/* ───────────────────────── FCM HTTP v1 (native: iOS/Android) ─────────────────────────
   Native cihaz token'ları (push_subscriptions.platform IS NOT NULL) FCM ile gönderilir;
   FCM iOS'a APNs üzerinden köprüler. Kimlik: FCM_SERVICE_ACCOUNT (Firebase servis hesabı
   JSON'u, secret). Yoksa native gönderim sessizce atlanır (web push etkilenmez). */
const FCM_SERVICE_ACCOUNT = Deno.env.get('FCM_SERVICE_ACCOUNT') || '';

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, '')
                 .replace(/-----END PRIVATE KEY-----/, '')
                 .replace(/\s+/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}
function b64url(data: Uint8Array | string): string {
  const s = typeof data === 'string'
    ? btoa(data)
    : btoa(String.fromCharCode(...data));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

let _fcm: { token: string; exp: number } | null = null;
let _fcmProject = '';
async function getFcmAccessToken(): Promise<string | null> {
  if (!FCM_SERVICE_ACCOUNT) return null;
  if (_fcm && _fcm.exp > Date.now() + 60_000) return _fcm.token;
  try {
    const sa = JSON.parse(FCM_SERVICE_ACCOUNT);
    _fcmProject = sa.project_id || '';
    const now = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claim = b64url(JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now, exp: now + 3600,
    }));
    const unsigned = `${header}.${claim}`;
    const key = await crypto.subtle.importKey(
      'pkcs8', pemToArrayBuffer(sa.private_key),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
    );
    const sig = new Uint8Array(await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)));
    const jwt = `${unsigned}.${b64url(sig)}`;
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });
    if (!res.ok) { console.warn('[send-push] FCM token fail', res.status); return null; }
    const j = await res.json();
    _fcm = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
    return _fcm.token;
  } catch (e) {
    console.warn('[send-push] FCM token error:', (e as Error)?.message);
    return null;
  }
}

/** Tek native token'a FCM gönder. dönüş: { ok, dead } (dead → token öldü, temizle). */
async function sendFCM(accessToken: string, token: string, payload: any): Promise<{ ok: boolean; dead: boolean }> {
  const msg = {
    message: {
      token,
      notification: { title: payload.title, body: payload.body },
      // nid: tık atıfı (FAZ 5). Web sw.js üzerinden alıyordu; native'de bu alan
      // olmadan tık HİÇ sayılmıyordu ve kart web-only bir oran basardı.
      // FCM data alanları STRING olmak zorunda — nid yoksa anahtar hiç girmez.
      data: {
        url: String(payload.url || ''),
        type: String(payload.type || 'generic'),
        ...(payload.nid != null ? { nid: String(payload.nid) } : {}),
      },
      android: { priority: 'high', notification: { tag: payload.tag || payload.type } },
      apns: { payload: { aps: { sound: 'default', 'thread-id': payload.tag || payload.type } } },
    },
  };
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${_fcmProject}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(msg),
  });
  if (res.ok) return { ok: true, dead: false };
  const errTxt = await res.text().catch(() => '');
  const dead = res.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/i.test(errTxt);
  console.warn('[send-push] FCM send fail', res.status, errTxt.slice(0, 200));
  return { ok: false, dead };
}

/* ───────────────────────── gönderim (web push + native FCM) ───────────────────────── */
async function sendToUser(uid: string, payload: any): Promise<number> {
  const { data: subs } = await admin.from('push_subscriptions').select('*').eq('user_id', uid);
  if (!subs?.length) return 0;
  let sent = 0;
  let fcmToken: string | null | undefined; // undefined: henüz alınmadı, null: yok
  for (const s of subs) {
    // ── Native (APNs/FCM) ──
    if ((s.platform === 'ios' || s.platform === 'android') && s.native_token) {
      if (fcmToken === undefined) fcmToken = await getFcmAccessToken();
      if (!fcmToken || !_fcmProject) continue; // FCM yapılandırılmamış → atla
      const r = await sendFCM(fcmToken, s.native_token, payload);
      if (r.ok) sent++;
      else if (r.dead) await admin.from('push_subscriptions').delete().eq('id', s.id);
      continue;
    }
    // ── Web Push (VAPID) ──
    if (!s.p256dh || !s.auth) continue; // eksik anahtar → geçersiz satır
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (err: any) {
      const code = err?.statusCode;
      if (code === 404 || code === 410) {
        // Abonelik ölmüş → temizle
        await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
      } else {
        console.warn('[send-push] send error', code, err?.body || err?.message);
      }
    }
  }
  return sent;
}

// nid: notification_log satır kimliği (İç Çalışma 11 · boşluk B, FAZ 5).
// Opsiyoneldir — test/broadcast çağrıları geçirmez, JSON.stringify undefined
// alanı sessizce düşürür. K2: tık atıfı YALNIZ bu kimlik taşındığında yazılır.
function payloadFor(trigger: string, title: string, body: string, nid?: number | null) {
  return { title, body, type: trigger, tag: trigger, url: './index.html', icon: EMRE_IMG, nid };
}

/* ───────────────────────── ENGINE (cron) ───────────────────────── */
async function runEngine(): Promise<Response> {
  const { data: rows } = await admin
    .from('user_engagement').select('*').eq('push_enabled', true).limit(2000);
  // Sosyal adaylar TEK sorguda, döngü dışında hesaplanır — her satır için ayrı
  // sorgu atmak 2000 kullanıcıda gereksiz yük olurdu (bkz. loadSosyalAdaylar).
  const sosyalAdaylar = await loadSosyalAdaylar();
  let evaluated = 0, delivered = 0;
  for (const row of (rows || [])) {
    evaluated++;
    try {
      const { dateStr, hour } = localParts(row.tz || 'Europe/Istanbul');
      if (inQuietHours(hour, row.quiet_start ?? 23, row.quiet_end ?? 8)) continue;
      const trigger = pickTrigger(row, dateStr, hour, sosyalAdaylar.has(row.user_id));
      if (!trigger) continue;
      if (!(await passesFreqCap(row.user_id, trigger))) continue;

      const ctx = await loadContext(row.user_id);
      const copy = await generateCopy(trigger, row, ctx);
      if (!copy) continue; // bkz. fallbackCopy default — kapsamı olmayan tetik hiçbir şey göndermez
      const { title, body } = copy;
      // SIRA TERSİNE ÇEVRİLDİ (FAZ 5, İç Çalışma 11 · boşluk B): nid payload'a
      // GÖNDERİMDEN ÖNCE gerekir, yani satır önce açılır. Teslim edilmezse
      // (sent === 0) satır SİLİNİR — notification_log'un "gönderildi" sözleşmesi
      // (yalnız teslim edilen loglanır) sırayı çevirirken sessizce bozulmasın.
      const { data: logRow, error: logErr } = await admin
        .from('notification_log')
        .insert({ user_id: row.user_id, type: trigger, title, body })
        .select('id')
        .single();
      if (logErr) console.warn('[send-push] notification_log insert failed, nid yok:', logErr.message);
      const nid = logRow?.id ?? null;
      const sent = await sendToUser(row.user_id, payloadFor(trigger, title, body, nid));
      if (sent > 0) {
        delivered++;
      } else if (logRow) {
        await admin.from('notification_log').delete().eq('id', logRow.id);
      }
    } catch (e) {
      console.warn('[send-push] engine row error:', (e as Error)?.message);
    }
  }
  return json({ ok: true, evaluated, delivered });
}

/* ───────────────────────── HTTP entry ───────────────────────── */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: any = {};
  try { body = await req.json(); } catch (_) { body = {}; }
  const mode = body.mode || 'engine';

  // ── ENGINE: cron secret ile ──
  if (mode === 'engine') {
    if (!CRON_SECRET || req.headers.get('x-cron-secret') !== CRON_SECRET) {
      return json({ error: 'Unauthorized' }, 401);
    }
    return await runEngine();
  }

  // ── TEST / BROADCAST: kullanıcı JWT doğrulaması ──
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'Unauthorized' }, 401);
  const { data: { user }, error: uErr } = await admin.auth.getUser(jwt);
  if (uErr || !user) return json({ error: 'Invalid token' }, 401);

  if (mode === 'test') {
    const ctx = await loadContext(user.id);
    const sample = fallbackCopy('morning', { streak: 0 }, ctx);
    const sent = await sendToUser(user.id, payloadFor('test',
      'Test · Emre the Wanderer',
      'Bildirimler çalışıyor. Seni doğru anda — serin, sözün, o günkü adımın için — geri çağıracağım.'));
    if (sent > 0) {
      await admin.from('notification_log').insert({ user_id: user.id, type: 'test', title: 'test', body: sample.body });
    }
    return json({ ok: true, sent });
  }

  if (mode === 'broadcast') {
    if ((user.email || '').toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return json({ error: 'Forbidden' }, 403);
    }
    const title = String(body.title || 'Emre the Wanderer').slice(0, 80);
    const text  = String(body.body || '').slice(0, 200);
    if (!text) return json({ error: 'body required' }, 400);
    const { data: rows } = await admin
      .from('user_engagement').select('user_id').eq('push_enabled', true).limit(5000);
    // Sıralı gönderim binlerce kullanıcıda edge timeout'una çarpar —
    // 20'lik partiler halinde paralel gönder.
    let delivered = 0;
    const all = rows || [];
    for (let i = 0; i < all.length; i += 20) {
      const batch = all.slice(i, i + 20);
      const results = await Promise.allSettled(batch.map(async (r) => {
        const sent = await sendToUser(r.user_id, payloadFor('broadcast', title, text));
        if (sent > 0) {
          await admin.from('notification_log').insert({ user_id: r.user_id, type: 'broadcast', title, body: text });
          return true;
        }
        return false;
      }));
      delivered += results.filter(x => x.status === 'fulfilled' && x.value).length;
    }
    return json({ ok: true, delivered });
  }

  return json({ error: 'unknown mode' }, 400);
});
