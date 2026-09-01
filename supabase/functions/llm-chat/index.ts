import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const LLMAPI_BASE = 'https://api.llmapi.ai';
const LLM_API_KEY = Deno.env.get('LLM_API_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'X-Wanderer-Sources',
};

// ═══════════════════════════════════════════════════════════════════════════
// PERSONA CACHE
// ═══════════════════════════════════════════════════════════════════════════
let _personaCache: { value: string; until: number } | null = null;
const PERSONA_TTL_MS = 600_000;

async function getPersona(serviceClient: SupabaseClient): Promise<string> {
  const now = Date.now();
  if (_personaCache && _personaCache.until > now) return _personaCache.value;

  const { data, error } = await serviceClient
    .from('admin_settings')
    .select('system_prompt')
    .eq('id', 1)
    .single();

  if (error) {
    console.error('persona yukleme hatasi:', error);
    return '';
  }
  const value = data?.system_prompt ?? '';
  _personaCache = { value, until: now + PERSONA_TTL_MS };
  return value;
}

function invalidatePersonaCache() {
  _personaCache = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// RAG — context string + ham pasajlar döner (kaynakça header için)
// ═══════════════════════════════════════════════════════════════════════════
async function runRAG(
  serviceClient: SupabaseClient,
  text: string,
): Promise<{ context: string; passages: any[] }> {
  try {
    const embRes = await fetch(`${LLMAPI_BASE}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000),
      }),
    });
    if (!embRes.ok) return { context: '', passages: [] };
    const embData = await embRes.json();
    const embedding = embData?.data?.[0]?.embedding;
    if (!embedding) return { context: '', passages: [] };

    const { data: matches, error } = await serviceClient.rpc('match_knowledge', {
      query_embedding: embedding,
      match_threshold: 0.25,
      match_count: 3,
    });
    if (error || !matches?.length) return { context: '', passages: [] };

    const context = matches.map((m: any) => `[Kitap Alintisi]: ${m.chunk_text}`).join('\n\n');
    return { context, passages: matches };
  } catch (e) {
    console.error('RAG hatasi:', e);
    return { context: '', passages: [] };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST')    return json({ error: 'Method not allowed' }, 405);
  if (!LLM_API_KEY)             return json({ error: 'Server misconfigured' }, 500);

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Missing Authorization' }, 401);

  let userId: string;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT');
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.sub) throw new Error('Missing sub claim');
    if (payload.exp && payload.exp * 1000 < Date.now()) throw new Error('Token expired');
    userId = payload.sub;
  } catch (e) {
    console.error('JWT decode hatasi:', e);
    return json({ error: 'Invalid token' }, 401);
  }

  const supabaseUrl   = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const serviceClient = createClient(supabaseUrl, serviceKey);

  const { data: userCheck } = await serviceClient
    .from('profiles').select('id').eq('id', userId).single();
  if (!userCheck) return json({ error: 'User not found' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  if (body?.action === 'invalidate_persona') {
    const { data: prof } = await serviceClient
      .from('profiles').select('is_admin').eq('id', userId).single();
    if (!prof?.is_admin) return json({ error: 'Admin only' }, 403);
    invalidatePersonaCache();
    return json({ ok: true, message: 'Persona cache invalidated' });
  }

  const { data: prof } = await serviceClient
    .from('profiles').select('is_premium, message_count').eq('id', userId).single();
  const { data: settingsRow } = await serviceClient
    .from('admin_settings').select('free_message_limit').eq('id', 1).single();

  const freeLimit = settingsRow?.free_message_limit ?? 5;
  const isPremium = prof?.is_premium === true;
  const msgCount  = prof?.message_count ?? 0;

  if (!isPremium && msgCount >= freeLimit + 2) {
    return json({ error: 'Free tier limit exceeded' }, 429);
  }

  const {
    model, messages, context_prompt, max_tokens, temperature,
    stream, response_format, skip_persona, enable_rag, rag_query,
  } = body ?? {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: 'messages required' }, 400);
  }

  const safeMessages = messages.filter((m: any) => m && m.role !== 'system');

  // RAG
  let ragContext  = '';
  let ragPassages: any[] = [];
  if (enable_rag && typeof rag_query === 'string' && rag_query.trim().length >= 20) {
    const words = rag_query.trim().split(/\s+/).filter(Boolean).length;
    if (words >= 4) {
      const result = await runRAG(serviceClient, rag_query);
      ragContext  = result.context;
      ragPassages = result.passages;
    }
  }

  const ragBlock = ragContext
    ? '\n\n--- BILGI TABANI (Kitaplardan) ---\n' +
      'ONEMLI: Bu bilgiyi direkt alinti olarak soyleme. Sanki bu bilgiyi coktan biliyormussun gibi dogal kullan.\n' +
      ragContext
    : '';

  const persona   = skip_persona ? '' : await getPersona(serviceClient);
  const clientCtx = typeof context_prompt === 'string' ? context_prompt : '';

  const finalMessages: any[] = [];
  if (persona)    finalMessages.push({ role: 'system', content: persona });
  const dynamicCtx = [clientCtx, ragBlock].filter(Boolean).join('\n\n');
  if (dynamicCtx) finalMessages.push({ role: 'system', content: dynamicCtx });
  finalMessages.push(...safeMessages);

  // ── VISION: son kullanıcı mesajındaki görsel markdown'ları multimodal'a çevir ──
  const IMG_MD = /!\[[^\]]*\]\((https:\/\/[^\s)]+\/storage\/v1\/object\/public\/chat-images\/[^\s)]+)\)/g;
  let hasImages = false;
  const lastUserIdx = finalMessages.map((m: any) => m.role).lastIndexOf('user');
  if (lastUserIdx !== -1 && typeof finalMessages[lastUserIdx].content === 'string') {
    const raw = finalMessages[lastUserIdx].content as string;
    const urls = [...raw.matchAll(IMG_MD)].map((m) => m[1]).slice(0, 3);
    if (urls.length) {
      hasImages = true;
      const text = raw.replace(IMG_MD, '').replace(/\n{3,}/g, '\n\n').trim();
      finalMessages[lastUserIdx] = {
        role: 'user',
        content: [
          { type: 'text', text: text || 'Eklediğim görsele bak.' },
          ...urls.map((url: string) => ({ type: 'image_url', image_url: { url } })),
        ],
      };
    }
  }

  const ALLOWED_MODELS = new Set([
    'deepseek-v4-flash',
  ]);
  const VISION_MODEL = 'deepseek-v4-flash';
  const safeModel     = ALLOWED_MODELS.has(model) ? model : 'deepseek-v4-flash';
  const safeMaxTokens = Math.min(Math.max(parseInt(max_tokens) || 400, 1), 4000);
  const safeTemp      = Math.min(Math.max(parseFloat(temperature) || 0.8, 0), 2);

  // Kaynakça header — RAG pasajlarından; RAG yoksa boş dizi encode edilir
  const sourcesHeader = encodeURIComponent(JSON.stringify(
    ragPassages.slice(0, 3).map((p: any) => ({
      book:    p.book    ?? 'Mesele Sensin',
      section: p.section ?? '',
      quote:   (p.quote ?? p.chunk_text ?? '').slice(0, 300),
    }))
  ));

  const upstreamBody: any = {
    model: hasImages ? VISION_MODEL : safeModel,
    messages: finalMessages,
    max_tokens: safeMaxTokens,
    temperature: safeTemp,
  };
  if (stream) upstreamBody.stream = true;
  if (response_format) upstreamBody.response_format = response_format;

  const upstream = await fetch(`${LLMAPI_BASE}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify(upstreamBody),
  });

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '');
    return json({ error: `Upstream (${upstream.status}): ${errText.slice(0, 200)}` }, upstream.status);
  }

  if (stream) {
    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Wanderer-Sources': sourcesHeader,
      },
    });
  }

  const data = await upstream.json();

  if (data?.usage) {
    console.log('[LLM_USAGE]', JSON.stringify({
      model: safeModel,
      prompt_tokens: data.usage.prompt_tokens,
      completion_tokens: data.usage.completion_tokens,
      total_tokens: data.usage.total_tokens,
      prompt_cache_hit_tokens: data.usage.prompt_cache_hit_tokens ?? null,
      prompt_cache_miss_tokens: data.usage.prompt_cache_miss_tokens ?? null,
      cached_tokens: data.usage.cached_tokens ?? null,
    }));
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Wanderer-Sources': sourcesHeader,
    },
  });
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}