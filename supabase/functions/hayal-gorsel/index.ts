// Supabase Edge Function: hayal-gorsel
// Deploy: supabase functions deploy hayal-gorsel
//
// Hayal Âlemi (10i) sahnesini ÜRETKEN GÖRSELE çevirir: kullanıcının kendi
// sözleriyle betimlediği sahne → OpenRouter görüntü modeli (vars. Gemini
// flash-image) → base64 data URL döner. Görseli Storage'a YAZMAZ — client
// küçültüp 'chat-images' bucket'ına yükler (13c kalıbı, SETUP-LLM-CHAT.md).
//
// Env (Studio gating client-side; maliyet koruması burada):
//   IMAGE_API_KEY       (anahtar; uca göre OPENROUTER_API_KEY ya da LLM_API_KEY otomatik seçilir)
//   IMAGE_API_URL       (vars. LLMAPI images; OpenRouter chat ucu da desteklenir — biçim uca göre)
//   IMAGE_MODEL         (vars. google/gemini-3-pro-image)
//   ALLOWED_ORIGIN      (vars. *)
//   HAYAL_DAILY_LIMIT   (vars. 2)
//
// Maliyet koruması: kullanıcı başına günlük tavan, kalıcı sayaçta
// (mig 036 fn_quota_consume RPC'si — yalnız service_role çağırabilir).
// RPC'ye ulaşılamazsa instance-local yedek fren devreye girer: koruma
// hiç kalkmaz, ama kalıcı denetim ancak mig 036 + redeploy ile başlar.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// Görsel API ucu — istek/yanıt biçimi UCA GÖRE seçilir:
//   .../images/generations → OpenAI biçimi (LLMAPI): {prompt} → data[].b64_json
//   .../chat/completions    → OpenRouter biçimi (Gemini görsel): {modalities} → message.images[]
// Model şu an yalnız OpenRouter'da; LLMAPI'ye gelince IMAGE_API_URL secret'ını SİL → LLMAPI default'una düşer (yeniden deploy yok).
const IMAGE_API_URL = Deno.env.get('IMAGE_API_URL') || 'https://api.llmapi.ai/v1/images/generations';
const _imgImagesEndpoint = /\/images\/generations/.test(IMAGE_API_URL);
// Anahtar uca göre: OpenRouter ucu → OPENROUTER_API_KEY, LLMAPI ucu → LLM_API_KEY. IMAGE_API_KEY hepsini ezer.
const IMAGE_API_KEY =
  Deno.env.get('IMAGE_API_KEY') ||
  (/openrouter\.ai/.test(IMAGE_API_URL) ? Deno.env.get('OPENROUTER_API_KEY') : Deno.env.get('LLM_API_KEY')) ||
  Deno.env.get('OPENROUTER_API_KEY') || Deno.env.get('LLM_API_KEY') || '';
const IMAGE_MODEL = Deno.env.get('IMAGE_MODEL') || 'google/gemini-3-pro-image';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';
const HAYAL_DAILY_LIMIT = Number(Deno.env.get('HAYAL_DAILY_LIMIT') || 2);

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Yedek fren (instance-local) — yalnız kalıcı RPC'ye ulaşılamadığında.
// UTC gün anahtarı yedek için yeterli; kanonik gün RPC'de (Europe/Istanbul).
const _quota = new Map<string, { day: string; n: number }>();
function _quotaOkLocal(uid: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const q = _quota.get(uid);
  if (!q || q.day !== day) { _quota.set(uid, { day, n: 1 }); return true; }
  if (q.n >= HAYAL_DAILY_LIMIT) return false;
  q.n++;
  return true;
}

// Günlük tavan — kalıcı sayaç (mig 036 fn_quota_consume; service_role).
// RPC hata verirse yedek frene düşer — üretim hiç bloklanmaz, koruma kalmaz değil.
async function quotaOk(admin: ReturnType<typeof createClient>, uid: string): Promise<boolean> {
  try {
    const { data, error } = await admin.rpc('fn_quota_consume', {
      p_uid: uid, p_fn: 'hayal-gorsel', p_limit: HAYAL_DAILY_LIMIT,
    });
    if (error) throw error;
    if (data && typeof data.allowed === 'boolean') return data.allowed;
    throw new Error('beklenmedik RPC yanıtı');
  } catch (e) {
    console.warn('fn_quota_consume erişilemedi, yedek fren devrede:', (e as Error)?.message);
    return _quotaOkLocal(uid);
  }
}

// Sahne betimini görüntü istemine çevir — marka estetiği sabit:
// obsidyen zemin, altın ışık, lapis vurgu; rüya gibi, yazısız.
function buildPrompt(sceneText: string, concept: string): string {
  const scene = String(sceneText || '').slice(0, 900);
  return [
    'A dreamlike symbolic painting, cinematic and painterly.',
    'Deep obsidian-black background, warm golden amber light as the only strong light source,',
    'subtle lapis lazuli (deep ultramarine blue) accents, fine paper-grain texture.',
    'Mystical, hopeful, intimate atmosphere; a single human figure seen from behind or in silhouette when people appear.',
    concept ? `Theme: ${concept}.` : '',
    `The scene, described by the dreamer in their own words (Turkish): "${scene}".`,
    'Interpret the feeling of the scene, not literally every word.',
    'NO text, NO letters, NO words, NO watermark, NO captions. Vertical 3:4 composition.',
  ].filter(Boolean).join(' ');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!IMAGE_API_KEY) return json({ error: 'Görsel API anahtarı (LLM_API_KEY) tanımlı değil' }, 500);

  // ── Kullanıcı doğrulama (delete-user kalıbı) ──
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'Unauthorized' }, 401);
  const client = createClient(SUPABASE_URL, SERVICE_ROLE, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error: userErr } = await client.auth.getUser(jwt);
  if (userErr || !user) return json({ error: 'Invalid token' }, 401);

  // Kota RPC'si service_role ister — `client` kullanıcı JWT'si taşıdığından
  // authenticated rolüne düşer, RPC'ye erişemez; temiz admin istemcisi şart.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  if (!(await quotaOk(admin, user.id))) return json({ error: 'quota', message: 'Bugünlük hayal resmi hakkın doldu. Yarın yeni bir sahne.' }, 429);

  let body: { scene_text?: string; concept?: string } = {};
  try { body = await req.json(); } catch (_) { /* boş gövde */ }
  const sceneText = (body.scene_text || '').trim();
  if (sceneText.length < 12) return json({ error: 'scene_text çok kısa' }, 400);

  // ── Görsel üretimi — istek biçimi uca göre (OpenAI images / OpenRouter chat) ──
  try {
    const prompt = buildPrompt(sceneText, body.concept || '');
    const reqBody = _imgImagesEndpoint
      ? { model: IMAGE_MODEL, prompt, n: 1, size: '1024x1024', response_format: 'b64_json' }
      : { model: IMAGE_MODEL, modalities: ['image', 'text'], messages: [{ role: 'user', content: prompt }] };
    const res = await fetch(IMAGE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${IMAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error('image_api:', res.status, t.slice(0, 400));
      return json({ error: 'image_api', status: res.status }, 502);
    }
    const data = await res.json();
    // Yanıtı her iki biçimden de oku: OpenAI data[].b64_json/url  •  OpenRouter message.images[].image_url.url
    let dataUrl: string | null = null;
    const d = data?.data?.[0];
    if (d?.b64_json) dataUrl = `data:image/png;base64,${d.b64_json}`;
    else if (d?.url) dataUrl = d.url;
    if (!dataUrl) {
      const msg = data?.choices?.[0]?.message;
      dataUrl = msg?.images?.[0]?.image_url?.url || null;
      if (!dataUrl && Array.isArray(msg?.content)) {
        const img = msg.content.find((c: { type?: string }) => c?.type === 'image_url');
        dataUrl = img?.image_url?.url || null;
      }
    }
    if (!dataUrl) {
      console.error('image_api: görüntü dönmedi', JSON.stringify(data).slice(0, 400));
      return json({ error: 'no_image' }, 502);
    }
    return json({ image: dataUrl });
  } catch (e) {
    console.error('hayal-gorsel:', (e as Error)?.message);
    return json({ error: 'internal' }, 500);
  }
});
