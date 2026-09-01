// Supabase Edge Function: sohbet-baslaticilari
// Deploy: supabase functions deploy sohbet-baslaticilari
//
// KİŞİSEL BAŞLATICILAR — ana ekranın soru şeridini kullanıcının KENDİ
// cümlelerinden dokur. Günde bir kez çağrılır; sonuç istemcide (10y2)
// bir gün saklanır. Dokuma yoksa şerit model başlatıcılarına düşer —
// kullanıcı hiçbir zaman boş ekran görmez.
//
// NEDEN AYRI FONKSİYON: kullanıcının sohbet kotasına (llm-chat) DOKUNMAZ.
// "Kullanmadım ama hakkım gitti" şikâyeti doğmasın diye kendi günlük
// tavanı vardır (soz-terzisi ile aynı gerekçe, Emre kararı 2026-07-31).
//
// GİZLİLİK — soz-terzisi'nden AYRILAN NOKTA: Terzi yalnız türetilmiş
// sinyaller alır, ham metin almaz. Burada kullanıcının GERÇEK CÜMLELERİ
// numaralı blok hâlinde gelir ve bu bilinçlidir: kanıt mimarisi (§6.10)
// modelin kanıtı UYDURMASINI değil GÖSTERMESİNİ ister — gösterebilmesi
// için görmesi gerekir. Cümleler istemcide kırpılır (kokenSozBlok maxLen)
// ve burada saklanmaz; yalnız istek boyunca yaşar.
//
// KANIT SÖZLEŞMESİ: model soruyu yazar, kanıtı YAZMAZ. Her soru bir
// `kanit_ref` ("S3") taşır; istemci o referansı kendi haritasıyla gerçek
// cümleye çevirir (kokenAlintiCoz) ve metni KAYNAKTAN keser. Çözülemeyen
// soru istemcide düşer — burada da ref'siz soru geçmez (ilk elek).
//
// Env:
//   LLM_API_URL              (vars. https://api.llmapi.ai/v1/chat/completions)
//   LLM_API_KEY              (zorunlu)
//   LLM_MODEL                (vars. deepseek-v4-flash)
//   ALLOWED_ORIGIN           (vars. *)
//   BASLATICI_DAILY_LIMIT    (vars. 2) — kişi başı gün
//
// Kota: mig 000 §fn_quota_consume RPC'si (yalnız service_role). RPC'ye
// ulaşılamazsa instance-local yedek fren devreye girer — koruma hiç kalkmaz.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { pServer } from '../_shared/persona-directives.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LLM_API_URL = Deno.env.get('LLM_API_URL') || 'https://api.llmapi.ai/v1/chat/completions';
const LLM_API_KEY = Deno.env.get('LLM_API_KEY') || '';
const LLM_MODEL = Deno.env.get('LLM_MODEL') || 'deepseek-v4-flash';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';
const DAILY_LIMIT = Number(Deno.env.get('BASLATICI_DAILY_LIMIT') || 2);

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/* ── Yedek fren (instance-local) — yalnız kalıcı RPC'ye ulaşılamadığında ── */
const _quota = new Map<string, { day: string; n: number }>();
function _quotaOkLocal(uid: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const q = _quota.get(uid);
  if (!q || q.day !== day) { _quota.set(uid, { day, n: 1 }); return true; }
  if (q.n >= DAILY_LIMIT) return false;
  q.n++;
  return true;
}

/* Kalite kapısı sınırları — istemcideki `bslGecerli` ile İKİZ. Model iki
   tarafta da güvenilmez sayılır: sunucu elese bile istemci son kapıdır. */
const SORU_MIN = 20;
const SORU_MAX = 110;
const MAX_ADET = 3;
const SOZ_BLOK_MAX_CHAR = 6000;

function _temiz(s: unknown): string {
  return String(s ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^["'“”«»\s]+|["'“”«»\s]+$/g, '')
    .trim();
}

/** Başlatıcı geçerli mi? Soru ya da davet olabilir, ama DAİMA kullanıcının
 *  ağzındandır — uygulama ona "sen" diye seslenmez. */
function _gecerliSoru(metin: string, dil: string): boolean {
  if (metin.length < SORU_MIN || metin.length > SORU_MAX) return false;
  if (/[{}[\]]/.test(metin)) return false;
  if (/^["'“”«»•\-–—]/.test(metin)) return false;
  // Sıra sayısının noktası cümle sonu değildir ("3. kez ..."), maskelenir.
  const sonlar = metin.replace(/\d+\./g, '§').match(/[.?!]/g) || [];
  if (sonlar.length > 1) return false;
  if (sonlar.length === 1 && !/[.?!]$/.test(metin)) return false;
  return dil === 'en'
    ? !/\b(you|your|yours|yourself)\b/i.test(metin)
    : !/\b(sen|senin|sana|seni|sende|senden|kendine|kendini)\b/i.test(metin);
}

/* SORULARIN DİLİ (FAZ 5) — üç kural bu promptun omurgasıdır:

   1. Başlatıcı bir YORUM DEĞİLDİR. Uygulama kullanıcı hakkında bir yargı
      bildirmiyor; kullanıcının ZATEN SÖYLEDİĞİ şeyi sohbete açma davetini
      yazıyor. Bu yüzden ihtimalsel dil (`-ebilir`) burada aranmaz —
      register anayasasının (scripts/i18n-style/tr.md §1.1) "kullanıcının
      beyanı KESİN kalır" maddesi geçerlidir.

   2. Bunun bedeli sert bir yasaktır: model kullanıcının SÖYLEMEDİĞİ bir
      şeyi onun ağzına koyamaz. Kanıt kapısı bunu yarıya kadar kapatır
      (ref bir cümleye bağlanmalı), gerisini bu kural kapatır — çıkarım
      yapma, cümlede OLANI aç.

   3. Çip ana ekranda, omuz üstünden okunabilecek bir yerde durur:
      kişi adı, yer adı, teşhis etiketi geçmez. */
const _ORNEK_TR = [
  'İlişkimde hep aynı döngüyü yaşıyorum — bendeki kök sebep ne?',
  'Muhtaç olmadan sevmek benim için ne demek?',
  'Biten ilişkimin dersini birlikte çıkaralım.',
];
const _ORNEK_EN = [
  'What do I need to face in myself today?',
  'What is the gap between who I am and who I want to be?',
  'Which thought pattern most makes me run away?',
];

function _sistemPromptu(dil: string): string {
  if (dil === 'en') {
    return [
      'You write conversation starters for a personal-growth app.',
      'You are given NUMBERED sentences the user actually wrote. Each starter must grow out of ONE of them.',
      '',
      'Rules for every starter:',
      '- Written in the USER\'S OWN VOICE, first person. It is what the user would say to open a conversation.',
      '- NEVER address the user as "you". The app does not interview the user; the user speaks.',
      '- One sentence. 20-110 characters, ideally 40-80.',
      '- Either a question or an invitation ("... let us work it out together.").',
      '- NEVER put words in the user\'s mouth. Open up what IS in the sentence; do not diagnose, conclude,',
      '  or add a claim the user did not make. If the sentence says they felt tired, do not turn it into burnout.',
      '- Do not quote the sentence back. Turn what is in it into something the user wants to open up.',
      '- No names of people or places, no diagnostic labels. This chip sits on a screen others may glance at.',
      '- No coaching cliches, no metrics, no percentages, no counters.',
      '- Each starter must come from a DIFFERENT sentence, and the three must not share the same shape',
      '  (not all questions, not all invitations).',
      '',
      'Examples of the right LENGTH and TONE (do not copy them, they are not about this user):',
      ..._ORNEK_EN.map((s) => `  ${s}`),
      '',
      'For every starter you MUST return which sentence it came from:',
      '  kanit_ref  — the label of that sentence, e.g. "S3"',
      '  kanit_kirpma — a short literal fragment copied from that sentence',
      'If you cannot ground a starter in a given sentence, leave it out. Fewer is better than invented.',
      'Answer ONLY with JSON: {"sorular":[{"soru":"...","kanit_ref":"S3","kanit_kirpma":"..."}]}',
    ].join('\n');
  }
  return [
    'Bir kişisel gelişim uygulaması için sohbet başlatıcıları yazıyorsun.',
    'Sana kullanıcının GERÇEKTEN yazdığı NUMARALI cümleler veriliyor. Her başlatıcı bunlardan BİRİNDEN doğmalı.',
    '',
    'Her başlatıcı için kurallar:',
    '- KULLANICININ KENDİ AĞZINDAN, birinci tekil. Sohbeti açmak için kullanıcının söyleyeceği cümledir.',
    '- Kullanıcıya ASLA "sen" diye seslenme. Uygulama kullanıcıya anket sormaz; konuşan kullanıcıdır.',
    '- Tek cümle. 20-110 karakter, ideali 40-80.',
    '- Ya soru olur ya davet ("... birlikte çıkaralım.").',
    '- Kullanıcının AĞZINA LAF KOYMA. Cümlede OLANI aç; teşhis koyma, sonuç çıkarma, onun söylemediği',
    '  bir iddiayı ekleme. Cümlesinde "yorgunum" diyorsa bunu tükenmişliğe çevirme.',
    '- Cümleyi geri alıntılama. İçindekini, kullanıcının açmak isteyeceği bir şeye çevir.',
    '- Kişi adı, yer adı, teşhis etiketi GEÇMEZ. Bu çip başkasının da göz atabileceği bir ekranda durur.',
    '- Koçluk klişesi, sayaç, yüzde, ölçüm YOK.',
    '- Her başlatıcı FARKLI bir cümleden gelmeli ve üçü aynı kalıpta olmamalı',
    '  (hepsi soru ya da hepsi davet değil).',
    '',
    'Doğru UZUNLUK ve TON örnekleri (kopyalama — bunlar bu kullanıcıya ait değil):',
    ..._ORNEK_TR.map((s) => `  ${s}`),
    '',
    'Her başlatıcı için hangi cümleden geldiğini MUTLAKA döndür:',
    '  kanit_ref  — o cümlenin etiketi, örn. "S3"',
    '  kanit_kirpma — o cümleden birebir kopyalanmış kısa bir parça',
    'Bir başlatıcıyı verilen cümlelerden birine bağlayamıyorsan onu YAZMA. Az olması uydurma olmasından iyidir.',
    'YALNIZCA şu JSON ile cevap ver: {"sorular":[{"soru":"...","kanit_ref":"S3","kanit_kirpma":"..."}]}',
  ].join('\n');
}

function _kullaniciPromptu(sozBlok: string, baglam: any, adet: number, dil: string): string {
  const en = dil === 'en';
  const satirlar: string[] = [];

  satirlar.push(en ? `The user's own sentences:` : `Kullanıcının kendi cümleleri:`);
  satirlar.push(sozBlok);

  const yon: string[] = [];
  if (baglam?.modelAd) {
    yon.push(en
      ? `Active lens: ${baglam.modelAd}${baglam.eksen ? ` (${baglam.eksen})` : ''}`
      : `Etkin eksen: ${baglam.modelAd}${baglam.eksen ? ` (${baglam.eksen})` : ''}`);
  }
  if (baglam?.ihtiyac) {
    yon.push(en ? `Weakest foundation: ${baglam.ihtiyac}` : `En zayıf temel: ${baglam.ihtiyac}`);
  }
  if (baglam?.kaynak === 'portre') {
    yon.push(en
      ? 'These sentences come from the user\'s self-portrait card, written at onboarding.'
      : 'Bu cümleler kullanıcının ilk girişte yazdığı Benlik Kartı\'ndan geliyor.');
  }
  if (baglam?.oruntuler) {
    yon.push((en ? 'Patterns the app has observed (context only, NOT evidence):\n' : 'Uygulamanın gözlediği örüntüler (yalnız bağlam, KANIT DEĞİL):\n') + baglam.oruntuler);
  }
  if (yon.length) {
    satirlar.push('');
    satirlar.push(en ? 'Context:' : 'Bağlam:');
    satirlar.push(yon.map((y) => `- ${y}`).join('\n'));
  }

  satirlar.push('');
  satirlar.push(en ? `Write at most ${adet} starters.` : `En fazla ${adet} başlatıcı yaz.`);
  return satirlar.join('\n');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!LLM_API_KEY) return json({ error: 'server_misconfigured' }, 500);

  // 1) Kimlik — JWT zorunlu
  const auth = req.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const uid = userData?.user?.id;
  if (userErr || !uid) return json({ error: 'unauthorized' }, 401);

  // 2) Kota — kalıcı sayaç; RPC yoksa instance-local yedek fren
  try {
    const { data, error } = await admin.rpc('fn_quota_consume', {
      p_uid: uid, p_fn: 'sohbet-baslaticilari', p_limit: DAILY_LIMIT,
    });
    if (error) {
      if (!_quotaOkLocal(uid)) return json({ error: 'quota_exceeded' }, 429);
    } else if (data && data.allowed === false) {
      return json({ error: 'quota_exceeded' }, 429);
    }
  } catch (_) {
    if (!_quotaOkLocal(uid)) return json({ error: 'quota_exceeded' }, 429);
  }

  // 3) Girdi
  let body: any = {};
  try { body = await req.json(); } catch (_) { return json({ error: 'bad_request' }, 400); }
  const dil = body?.dil === 'en' ? 'en' : 'tr';
  const sozBlok = String(body?.sozBlok || '').slice(0, SOZ_BLOK_MAX_CHAR).trim();
  // Kanıt havuzu boşsa dokuma yapılmaz: kanıtsız soru üretmek, tam da bu
  // mimarinin engellemek için var olduğu şeydir (§6.10).
  if (!sozBlok || sozBlok === '-') return json({ error: 'no_evidence' }, 400);
  const baglam = (body?.baglam && typeof body.baglam === 'object') ? body.baglam : {};
  const adet = Math.max(1, Math.min(MAX_ADET, Number(body?.adet) || MAX_ADET));

  // 4) Dokuma
  /* Ses canlıdan gelir; satır yoksa fonksiyonun kendi metnine düşer (pServer). */
  const sistemPromptu = await pServer(admin, 'prompt.srv.baslatici.system', dil, _sistemPromptu(dil));

  let raw = '';
  try {
    const resp = await fetch(LLM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM_API_KEY}` },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0.75,
        max_tokens: 700,
        messages: [
          { role: 'system', content: sistemPromptu },
          { role: 'user', content: _kullaniciPromptu(sozBlok, baglam, adet, dil) },
        ],
      }),
    });
    if (!resp.ok) return json({ error: 'llm_failed', status: resp.status }, 502);
    const data = await resp.json();
    raw = data?.choices?.[0]?.message?.content || '';
  } catch (_) {
    return json({ error: 'llm_unreachable' }, 502);
  }

  // 5) Ayrıştır + kalite kapısı + ref eleği. Kural çiğneyen soru sessizce
  //    DÜŞER; istemci eksik yuvayı model başlatıcısıyla tamamlar.
  let parsed: any = null;
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(m ? m[0] : raw);
  } catch (_) {
    return json({ error: 'parse_failed' }, 502);
  }

  const out: Array<{ soru: string; kanit_ref: string; kanit_kirpma: string }> = [];
  const gorulen = new Set<string>();
  const list = Array.isArray(parsed?.sorular) ? parsed.sorular : [];
  for (const item of list) {
    if (out.length >= adet) break;
    const soru = _temiz(item?.soru);
    if (!_gecerliSoru(soru, dil)) continue;
    if (gorulen.has(soru.toLocaleLowerCase(dil === 'tr' ? 'tr-TR' : 'en-US'))) continue;
    // İLK ELEK: ref'i olmayan soru geçmez. Asıl kapı istemcidedir
    // (kokenAlintiCoz gerçek cümleyi kaynaktan keser) — burada yalnız
    // sözleşmeye uymayan yanıt erkenden düşürülür.
    const ref = String(item?.kanit_ref || '').trim();
    if (!/\d/.test(ref)) continue;
    gorulen.add(soru.toLocaleLowerCase(dil === 'tr' ? 'tr-TR' : 'en-US'));
    out.push({ soru, kanit_ref: ref, kanit_kirpma: _temiz(item?.kanit_kirpma) });
  }

  return json({ ok: true, sorular: out, model: LLM_MODEL });
});
