// Supabase Edge Function: soz-terzisi
// Deploy: supabase functions deploy soz-terzisi
//
// SÖZ TERZİSİ — Günün Sözü'nü (10s) kullanıcının KENDİ verisinden dokur.
// Gece/boşta çağrılır, YARININ üç sözünü yazar; sabah töreni hiçbir zaman
// ağ beklemez (13w istemcisi dokumayı önceden saklar, yoksa bankaya düşer).
//
// NEDEN AYRI FONKSİYON: kullanıcının sohbet kotasına (llm-chat) DOKUNMAZ.
// "Kullanmadım ama hakkım gitti" şikâyeti doğmasın diye kendi günlük tavanı
// vardır (Emre kararı, 2026-07-31).
//
// GİZLİLİK: ham sohbet metni GÖNDERİLMEZ. Yalnız türetilmiş sinyaller
// (eksen, mertebe, kanıt etiketi) ve sözün içine girecek kısa ad/olay gider.
//
// Env:
//   LLM_API_URL           (vars. https://api.llmapi.ai/v1/chat/completions)
//   LLM_API_KEY           (zorunlu)
//   LLM_MODEL             (vars. deepseek-v4-flash)
//   ALLOWED_ORIGIN        (vars. *)
//   TERZI_DAILY_LIMIT     (vars. 1) — kişi başı gün
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
const TERZI_DAILY_LIMIT = Number(Deno.env.get('TERZI_DAILY_LIMIT') || 1);

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
  if (q.n >= TERZI_DAILY_LIMIT) return false;
  q.n++;
  return true;
}

const ALANLAR = ['bireysel', 'iliski', 'is'];
const SOZ_MAX = 64;
const SOZ_MIN = 8;

/* ── KALİTE KAPISI ──
   Söz HARFİYEN yazılarak mühürlenir: uzun, çok cümleli ya da soru biçiminde
   bir söz töreni eziyete çevirir. Sunucu tarafı ilk elek; istemci (13w) son
   eleği yine uygular — model her iki tarafta da güvenilmez sayılır. */
function _temiz(s: unknown): string {
  return String(s ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^["'“”«»\s]+|["'“”«»\s]+$/g, '')
    .trim();
}

function _gecerliSoz(metin: string, dil: string): boolean {
  if (metin.length < SOZ_MIN || metin.length > SOZ_MAX) return false;
  if (/[?!]/.test(metin)) return false;                       // soru/ünlem söz değildir
  if ((metin.match(/[.]/g) || []).length > 1) return false;    // tek cümle
  if (/\{|\}|\[|\]/.test(metin)) return false;                // sızmış şablon
  // Birinci tekil GELECEK zaman: söz bir taahhüttür, öğüt değil.
  return dil === 'en'
    ? /\bi (will|['’]ll)\b/i.test(metin)
    : /(acağım|eceğim|acagim|ecegim)\b/i.test(metin);
}

function _sistemPromptu(dil: string): string {
  if (dil === 'en') {
    return [
      'You write ONE daily micro-promise per life area for a personal-growth app.',
      'The user will type the promise WORD FOR WORD to seal it, so it must be short and easy to type.',
      'Rules for every promise:',
      '- One sentence, at most 64 characters, no question or exclamation marks.',
      '- First person future ("Today I will ...").',
      '- One concrete action that can be done today, not a feeling or an intention to "try".',
      '- Warm and plain. No metrics, no counters, no percentages, no coaching cliches.',
      '- If a person name or an event word is given, weave it in naturally.',
      '- Never repeat a promise listed as recent.',
      'Answer ONLY with JSON: {"sozler":[{"alan":"bireysel","metin":"..."}]}',
    ].join('\n');
  }
  return [
    'Bir kişisel gelişim uygulaması için her yaşam alanına BİR günlük mikro-söz yazıyorsun.',
    'Kullanıcı sözü mühürlemek için HARFİYEN yazacak; bu yüzden kısa ve yazması kolay olmalı.',
    'Her söz için kurallar:',
    '- Tek cümle, en fazla 64 karakter, soru ya da ünlem işareti yok.',
    '- Birinci tekil gelecek zaman ("Bugün ... yapacağım").',
    '- Bugün yapılabilecek TEK somut eylem; duygu ya da "denemeye çalışacağım" değil.',
    '- Sıcak ve sade dil. Sayaç, yüzde, ölçüm, koçluk klişesi YOK.',
    '- Kişi adı ya da olay verildiyse cümleye doğal biçimde yedir.',
    '- Türkçe ek uyumuna dikkat et (Ayşe\'ye, Mehmet\'e, Oğuz\'a).',
    '- "Yakın günlerde verilen" olarak listelenen sözleri TEKRARLAMA.',
    'YALNIZCA şu JSON ile cevap ver: {"sozler":[{"alan":"bireysel","metin":"..."}]}',
  ].join('\n');
}

function _kullaniciPromptu(alanlar: any[], sonSozler: string[], dil: string): string {
  const satirlar = alanlar.map((a) => {
    const p: string[] = [`alan: ${a.alan}`, `ihtiyaç ekseni: ${a.eksen}`];
    if (a.mertebe === 'dokunus') p.push(dil === 'en' ? 'weight: the smallest possible step' : 'ağırlık: yapılabilecek EN KÜÇÜK adım');
    else if (a.mertebe === 'esik') p.push(dil === 'en' ? 'weight: a step that asks a little more' : 'ağırlık: biraz daha talepkâr bir adım');
    if (a.kisi) p.push(`${dil === 'en' ? 'person' : 'kişi'}: ${a.kisi}`);
    if (a.olay) p.push(`${dil === 'en' ? 'event' : 'olay'}: ${a.olay}`);
    return '- ' + p.join(' · ');
  });
  const tekrar = sonSozler.length
    ? `\n${dil === 'en' ? 'Recently given (do not repeat)' : 'Yakın günlerde verilenler (tekrarlama)'}:\n` +
      sonSozler.map((s) => `- ${s}`).join('\n')
    : '';
  return `${dil === 'en' ? 'Areas' : 'Alanlar'}:\n${satirlar.join('\n')}${tekrar}`;
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
      p_uid: uid, p_fn: 'soz-terzisi', p_limit: TERZI_DAILY_LIMIT,
    });
    if (error) {
      if (!_quotaOkLocal(uid)) return json({ error: 'quota_exceeded' }, 429);
    } else if (data && data.allowed === false) {
      return json({ error: 'quota_exceeded' }, 429);
    }
  } catch (_) {
    if (!_quotaOkLocal(uid)) return json({ error: 'quota_exceeded' }, 429);
  }

  // 3) Girdi — yalnız türetilmiş sinyaller; ham sohbet metni KABUL EDİLMEZ
  let body: any = {};
  try { body = await req.json(); } catch (_) { return json({ error: 'bad_request' }, 400); }
  const dil = body?.dil === 'en' ? 'en' : 'tr';
  const alanlar = Array.isArray(body?.alanlar) ? body.alanlar.filter((a: any) => a && ALANLAR.includes(a.alan)).slice(0, 3) : [];
  if (!alanlar.length) return json({ error: 'bad_request' }, 400);
  const sonSozler = Array.isArray(body?.sonSozler)
    ? body.sonSozler.map((s: any) => _temiz(s)).filter(Boolean).slice(0, 10)
    : [];

  // 4) Dokuma
  let raw = '';
  /* Ses canlıdan gelir; satır yoksa fonksiyonun kendi metnine düşer (pServer). */
  const sistemPromptu = await pServer(admin, 'prompt.srv.soz_terzisi.system', dil, _sistemPromptu(dil));

  try {
    const resp = await fetch(LLM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LLM_API_KEY}` },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0.8,
        max_tokens: 500,
        messages: [
          { role: 'system', content: sistemPromptu },
          { role: 'user', content: _kullaniciPromptu(alanlar, sonSozler, dil) },
        ],
      }),
    });
    if (!resp.ok) return json({ error: 'llm_failed', status: resp.status }, 502);
    const data = await resp.json();
    raw = data?.choices?.[0]?.message?.content || '';
  } catch (_) {
    return json({ error: 'llm_unreachable' }, 502);
  }

  // 5) Ayrıştır + kalite kapısı. Model kuralı çiğnerse o alan sessizce DÜŞER;
  //    istemci eksik alanı bankadan tamamlar — kullanıcı hiçbir zaman boş görmez.
  let parsed: any = null;
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(m ? m[0] : raw);
  } catch (_) {
    return json({ error: 'parse_failed' }, 502);
  }

  const out: Record<string, string> = {};
  const list = Array.isArray(parsed?.sozler) ? parsed.sozler : [];
  for (const item of list) {
    const alan = String(item?.alan || '');
    if (!ALANLAR.includes(alan) || out[alan]) continue;
    const metin = _temiz(item?.metin);
    if (_gecerliSoz(metin, dil)) out[alan] = metin;
  }

  return json({ ok: true, sozler: out, model: LLM_MODEL });
});
