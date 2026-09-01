// Supabase Edge Function: llm-embed
// Deploy: supabase functions deploy llm-embed
//
// ⚠️ REVİZYON NOTU (Tanıyan Ayna FAZ 2, mig 034 ile birlikte): bu fonksiyon
// daha önce YALNIZ ADMİN'e açıktı (07-settings-knowledge.js bilgi tabanı
// yüklemesi için). Bu dosya onu her authenticated kullanıcıya AÇAR — Epizodik
// Hafıza (09f) kullanıcı başına anlamsal geri-getirme için embedding istiyor.
// Deploy etmeden önce mevcut prod fonksiyonla FARKLARI karşılaştır: burada
// admin-only kapı, kullanıcı bazlı günlük kotaya (EMBED_DAILY_LIMIT) çevrildi.
// Admin akışı (07:626 getEmbedding) DEĞİŞMEDEN çalışmaya devam eder — sadece
// artık admin olmayanlar da (kotalı) çağırabiliyor.
//
// Sözleşme (07-settings-knowledge.js getEmbedding ile birebir):
//   İstek:  POST {input: string}
//   Yanıt:  {data: [{embedding: number[]}]}  (OpenAI-uyumlu biçim)
//
// Env:
//   LLM_API_KEY     — LLMAPI anahtarı (mevcut sağlayıcı, api.llmapi.ai)
//   EMBED_API_URL    (vars. https://api.llmapi.ai/v1/embeddings)
//   EMBED_MODEL      (vars. text-embedding-3-small — 1536 boyut, mig 034 VECTOR(1536) ile eşleşmeli)
//   ALLOWED_ORIGIN   (vars. *)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EMBED_API_URL = Deno.env.get('EMBED_API_URL') || 'https://api.llmapi.ai/v1/embeddings';
const EMBED_API_KEY = Deno.env.get('LLM_API_KEY') || '';
const EMBED_MODEL = Deno.env.get('EMBED_MODEL') || 'text-embedding-3-small';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';

// Kullanıcı başına günlük tavan — dakikada değil günde, çünkü çağıran taraf
// (09f ehRecall) zaten yalnız "geçmişe atıf" sinyali olan mesajlarda embed
// ister (bkz. _shouldRecall). Admin bilgi-tabanı yüklemesi bu tavana girmez.
const EMBED_DAILY_LIMIT = 60;

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Yedek fren (instance-local, hayal-gorsel kalıbı) — yalnız kalıcı RPC'ye
// ulaşılamadığında. Kanonik gün RPC'de (Europe/Istanbul, mig 036).
const _quota = new Map<string, { day: string; n: number }>();
function _quotaOkLocal(uid: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const q = _quota.get(uid);
  if (!q || q.day !== day) { _quota.set(uid, { day, n: 1 }); return true; }
  if (q.n >= EMBED_DAILY_LIMIT) return false;
  q.n++;
  return true;
}

// Günlük tavan — kalıcı sayaç (mig 036 fn_quota_consume; service_role).
// RPC hata verirse yedek frene düşer — hafıza akışı hiç bloklanmaz.
async function quotaOk(admin: ReturnType<typeof createClient>, uid: string): Promise<boolean> {
  try {
    const { data, error } = await admin.rpc('fn_quota_consume', {
      p_uid: uid, p_fn: 'llm-embed', p_limit: EMBED_DAILY_LIMIT,
    });
    if (error) throw error;
    if (data && typeof data.allowed === 'boolean') return data.allowed;
    throw new Error('beklenmedik RPC yanıtı');
  } catch (e) {
    console.warn('fn_quota_consume erişilemedi, yedek fren devrede:', (e as Error)?.message);
    return _quotaOkLocal(uid);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!EMBED_API_KEY) return json({ error: 'Embedding API anahtarı (LLM_API_KEY) tanımlı değil' }, 500);

  // ── Kullanıcı doğrulama (delete-user/hayal-gorsel kalıbı) ──
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'Unauthorized' }, 401);
  const client = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error: userErr } = await client.auth.getUser(jwt);
  if (userErr || !user) return json({ error: 'Invalid token' }, 401);

  // Admin bilgi-tabanı yüklemesi kotasız geçer (07 mevcut davranışı korunur);
  // sıradan kullanıcı (09f) günlük tavana tabidir.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: profile } = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  const isAdmin = !!profile?.is_admin;
  if (!isAdmin && !(await quotaOk(admin, user.id))) {
    return json({ error: 'quota', message: 'Bugünlük hafıza kotan doldu.' }, 429);
  }

  let body: { input?: string } = {};
  try { body = await req.json(); } catch (_) { /* boş gövde */ }
  const input = (body.input || '').trim();
  if (!input) return json({ error: 'input boş olamaz' }, 400);

  try {
    const res = await fetch(EMBED_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EMBED_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: EMBED_MODEL, input: input.slice(0, 8000) }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error('embed_api:', res.status, t.slice(0, 400));
      return json({ error: 'embed_api', status: res.status }, 502);
    }
    const data = await res.json();
    if (!data?.data?.[0]?.embedding) {
      console.error('embed_api: embedding yok', JSON.stringify(data).slice(0, 400));
      return json({ error: 'no_embedding' }, 502);
    }
    return json(data);
  } catch (e) {
    console.error('llm-embed:', (e as Error)?.message);
    return json({ error: 'internal' }, 500);
  }
});
